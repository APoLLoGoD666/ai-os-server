'use strict';

// Agent reputation system: reads apex_agent_stages from Supabase, computes
// per-stage success rates, latency, and failure patterns. Also tracks domain
// agent runs in-process (no extra schema needed).

const { createClient } = require('@supabase/supabase-js');

const _sb = process.env.SUPABASE_URL
    ? createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    )
    : null;

// In-memory stage stats cache — 5-min TTL keeps Supabase reads cheap
let _stageCache  = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

// In-process domain agent run log (circular buffer, no extra DB schema)
const _domainLog = [];
const _DOMAIN_LOG_MAX = 500;

// ── Stage stats loader ────────────────────────────────────────────────────────
async function _loadStageStats() {
    if (!_sb) return {};
    try {
        const { data, error } = await _sb
            .from('apex_agent_stages')
            .select('stage, success, duration_ms, attempt, error')
            .order('created_at', { ascending: false })
            .limit(300);

        if (error || !data || !data.length) return {};

        const stats = {};
        for (const row of data) {
            const s = row.stage;
            if (!stats[s]) stats[s] = { total: 0, successes: 0, failures: 0, durations: [], retries: 0, recentErrors: [] };
            stats[s].total++;
            if (row.success) stats[s].successes++;
            else {
                stats[s].failures++;
                if (row.error && stats[s].recentErrors.length < 5) stats[s].recentErrors.push(row.error.slice(0, 200));
            }
            if (row.duration_ms) stats[s].durations.push(row.duration_ms);
            if ((row.attempt || 1) > 1) stats[s].retries++;
        }

        for (const s of Object.values(stats)) {
            s.successRate  = s.total > 0 ? +(s.successes / s.total).toFixed(3) : null;
            s.failureRate  = s.total > 0 ? +(s.failures  / s.total).toFixed(3) : null;
            s.retryRate    = s.total > 0 ? +(s.retries   / s.total).toFixed(3) : null;
            if (s.durations.length) {
                const sorted = s.durations.slice().sort((a, b) => a - b);
                s.avgLatencyMs = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
                s.p95LatencyMs = Math.round(sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1]);
                s.medianMs     = Math.round(sorted[Math.floor(sorted.length / 2)]);
            }
            delete s.durations;
        }
        return stats;
    } catch (e) {
        console.warn('[Reputation] stage stats load failed (non-fatal):', e.message);
        return {};
    }
}

async function _getStats() {
    if (_stageCache && Date.now() < _cacheExpiry) return _stageCache;
    _stageCache  = await _loadStageStats();
    _cacheExpiry = Date.now() + CACHE_TTL_MS;
    return _stageCache;
}

// ── Public API ────────────────────────────────────────────────────────────────

// Get reputation for one pipeline stage
async function getStageReputation(stage) {
    const stats = await _getStats();
    return stats[stage] || {
        total: 0, successes: 0, failures: 0,
        successRate: null, failureRate: null, retryRate: null,
        avgLatencyMs: null, p95LatencyMs: null, medianMs: null,
        recentErrors: [],
    };
}

// Get all stage stats at once
async function getAllStageStats() {
    return _getStats();
}

// Returns the pipeline stage with the highest failure rate (min 5 samples)
async function getWeakestStage() {
    const stats = await _getStats();
    let weakest = null;
    let worstRate = -1;
    for (const [stage, s] of Object.entries(stats)) {
        if (s.total >= 5 && s.failureRate > worstRate) {
            worstRate = s.failureRate;
            weakest = { stage, ...s };
        }
    }
    return weakest;
}

// Should we pre-escalate the DEVELOPER model based on historical failure rate?
// Returns true only when we have enough samples and failure rate exceeds threshold.
async function shouldPreEscalate(stage, threshold = 0.6, minSamples = 15) {
    const rep = await getStageReputation(stage);
    return rep.total >= minSamples && rep.failureRate > threshold;
}

// Score breakdown: gives a 0–10 score for each stage
async function getStageScores() {
    const stats = await _getStats();
    const scores = {};
    for (const [stage, s] of Object.entries(stats)) {
        if (s.successRate === null) { scores[stage] = null; continue; }
        // Base: successRate × 10, penalty for high latency (>60s = -1)
        let score = s.successRate * 10;
        if (s.avgLatencyMs && s.avgLatencyMs > 60000) score -= 0.5;
        if (s.avgLatencyMs && s.avgLatencyMs > 120000) score -= 0.5;
        scores[stage] = +Math.max(0, score).toFixed(2);
    }
    return scores;
}

// Domain agent run tracking (in-process circular buffer)
function recordDomainAgentRun(agentId, success, durationMs) {
    _domainLog.push({ agentId, success, durationMs: durationMs || 0, ts: Date.now() });
    if (_domainLog.length > _DOMAIN_LOG_MAX) _domainLog.shift();
}

function getDomainAgentStats(agentId) {
    const runs = agentId ? _domainLog.filter(r => r.agentId === agentId) : _domainLog;
    if (!runs.length) return { total: 0, successRate: null, avgLatencyMs: null };
    const successes = runs.filter(r => r.success).length;
    const durations = runs.map(r => r.durationMs).filter(Boolean);
    return {
        total:        runs.length,
        successRate:  +(successes / runs.length).toFixed(3),
        avgLatencyMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    };
}

// Full performance summary: pipeline stages + domain agents
async function getPerformanceSummary() {
    const stageStats  = await _getStats();
    const stageScores = await getStageScores();
    const domainStats = {};
    for (const id of ['system', 'file', 'uni', 'finance', 'business']) {
        domainStats[id] = getDomainAgentStats(id);
    }
    return {
        pipeline:    stageStats,
        scores:      stageScores,
        domain:      domainStats,
        sampleCount: _domainLog.length,
        cacheExpiry: new Date(_cacheExpiry).toISOString(),
        generatedAt: new Date().toISOString(),
    };
}

// Failure pattern analysis: returns stages with >20% failure rate
async function getFailurePatterns() {
    const stats = await _getStats();
    const patterns = [];
    for (const [stage, s] of Object.entries(stats)) {
        if (s.failureRate && s.failureRate > 0.2 && s.total >= 3) {
            patterns.push({
                stage,
                failureRate: s.failureRate,
                total:       s.total,
                failures:    s.failures,
                recentErrors: s.recentErrors || [],
            });
        }
    }
    return patterns.sort((a, b) => b.failureRate - a.failureRate);
}

// Invalidate cache — call after a pipeline run completes to get fresh data
function invalidateCache() {
    _stageCache  = null;
    _cacheExpiry = 0;
}

module.exports = {
    getStageReputation,
    getAllStageStats,
    getWeakestStage,
    shouldPreEscalate,
    getStageScores,
    recordDomainAgentRun,
    getDomainAgentStats,
    getPerformanceSummary,
    getFailurePatterns,
    invalidateCache,
};
