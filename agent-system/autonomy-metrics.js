'use strict';
// autonomy-metrics.js — Completion rate, retry rate, recovery rate, execution confidence.
// Composite autonomy score (0–10) across 6 weighted dimensions.
// Read-only: no writes to DB, no file mutations.

const { getFailureEpisodes, episodeCount } = require('./episodic-memory');
const _epMem = require('../lib/memory/episodic-memory-pg');
const { analyzeFailures, buildPerformanceSummary }         = require('./reflection-engine');
const { getStats: goalStats }                              = require('./goal-tracker');
const { createClient }                                     = require('@supabase/supabase-js');

let _sb = null;
function _getSb() {
    if (_sb) return _sb;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return _sb;
}

// ── Individual metrics ────────────────────────────────────────────────────────

// Fraction of tracked goals that reached COMPLETED status
function completionRate() {
    try {
        const stats = goalStats();
        return stats.total > 0 ? stats.completionRate : null;
    } catch { return null; }
}

// Fraction of recent pipeline runs that had at least one failure before success
// Approximated as (1 - episodic success rate) since we don't persist retry_count
async function retryRate(sampleSize = 100) {
    const sb = _getSb();
    if (sb) {
        try {
            const { data, error } = await sb
                .from('apex_agent_runs')
                .select('success')
                .order('created_at', { ascending: false })
                .limit(sampleSize);
            if (!error && data?.length) {
                const failures = data.filter(r => !r.success).length;
                return +(failures / data.length).toFixed(3);
            }
        } catch {}
    }
    // Fallback: Postgres episodic memory (orchestrator runs only)
    const sr = await _epMem.getSuccessRate(sampleSize).catch(() => null);
    return sr !== null ? +(1 - sr).toFixed(3) : null;
}

// Of tasks that failed, what fraction eventually had a matching success?
async function recoveryRate(sampleSize = 40) {
    const failures = getFailureEpisodes(sampleSize);
    if (!failures.length) {
        const count = episodeCount ? episodeCount() : 0;
        return count > 0 ? 1.0 : null;
    }

    const sb = _getSb();
    if (!sb) return null;

    try {
        const checks = await Promise.all(
            failures.slice(0, 20).map(async ep => {
                const kw = (ep.objective || '').slice(0, 40);
                if (!kw.trim()) return false;
                const { data } = await sb
                    .from('apex_agent_runs')
                    .select('task_id')
                    .ilike('objective', `%${kw}%`)
                    .eq('success', true)
                    .gt('created_at', ep.timestamp)
                    .limit(1);
                return !!(data?.length);
            })
        );
        const sample = failures.slice(0, 20).length;
        return +(checks.filter(Boolean).length / sample).toFixed(3);
    } catch { return null; }
}

// Avg consensus_level from recent council deliberations — high consensus = high executive quality
async function executiveCouncilScore() {
    const sb = _getSb();
    if (!sb) return null;
    try {
        const { data, error } = await sb
            .from('executive_deliberations')
            .select('consensus_level')
            .in('status', ['resolved', 'escalated'])
            .order('created_at', { ascending: false })
            .limit(20);
        if (error || !data?.length) return null;
        return +(data.reduce((s, r) => s + (r.consensus_level ?? 0.5), 0) / data.length).toFixed(3);
    } catch { return null; }
}

// Composite confidence: success rate (40%) + episode volume (15%) + goal completion (25%) + council quality (20%)
async function executionConfidence() {
    const sr          = (await _epMem.getSuccessRate(20).catch(() => null)) ?? 0.5;
    const epVol       = Math.min(1.0, episodeCount() / 50);
    const gStats      = (() => { try { return goalStats(); } catch { return null; } })();
    const goalScore   = gStats?.completionRate ?? 0.5;
    const councilScr  = (await executiveCouncilScore()) ?? 0.5;
    return +(sr * 0.40 + epVol * 0.15 + goalScore * 0.25 + councilScr * 0.20).toFixed(3);
}

// ── Composite autonomy score ──────────────────────────────────────────────────
// 6 dimensions → weighted sum → scaled to 0–10

async function computeAutonomyScore() {
    const [retryR, recoveryR] = await Promise.all([
        retryRate(50).catch(() => null),
        recoveryRate(30).catch(() => null),
    ]);

    const sr        = await _epMem.getSuccessRate(50).catch(() => null);
    const gStats    = (() => { try { return goalStats(); } catch { return null; } })();
    const compRate  = gStats?.completionRate ?? null;
    const conf      = await executionConfidence();
    const epRich    = Math.min(1.0, episodeCount() / 100);

    const dims = {
        executionSuccess: sr   ?? 0.5,
        lowRetryRate:     retryR !== null ? Math.max(0, 1 - retryR * 2) : 0.5,
        recovery:         recoveryR ?? 0.5,
        goalCompletion:   compRate  ?? 0.5,
        confidence:       conf,
        episodeRichness:  epRich,
    };

    const weights = {
        executionSuccess: 0.30,
        lowRetryRate:     0.15,
        recovery:         0.20,
        goalCompletion:   0.20,
        confidence:       0.10,
        episodeRichness:  0.05,
    };

    const raw   = Object.entries(weights).reduce((sum, [k, w]) => sum + (dims[k] ?? 0.5) * w, 0);
    const score = +(raw * 10).toFixed(2);

    return {
        score,
        dimensions:  Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, +v.toFixed(3)])),
        weights,
        metadata: {
            sampleEpisodes: episodeCount(),
            totalGoals:     gStats?.total ?? 0,
            computedAt:     new Date().toISOString(),
        },
    };
}

// ── Full metrics report ───────────────────────────────────────────────────────

async function getFullMetrics() {
    const [autonomy, retryR, recoveryR] = await Promise.all([
        computeAutonomyScore(),
        retryRate(100).catch(() => null),
        recoveryRate(30).catch(() => null),
    ]);

    const failures     = getFailureEpisodes(20);
    const gStats       = (() => { try { return goalStats(); } catch { return null; } })();
    const failAnalysis = analyzeFailures(failures);

    return {
        autonomyScore:       autonomy.score,
        dimensions:          autonomy.dimensions,
        completionRate:      completionRate(),
        retryRate:           retryR,
        recoveryRate:        recoveryR,
        executionConfidence: await executionConfidence(),
        goalStats:           gStats,
        failureAnalysis:     failAnalysis,
        episodeCount:        episodeCount(),
        computedAt:          new Date().toISOString(),
    };
}

module.exports = {
    completionRate,
    retryRate,
    recoveryRate,
    executionConfidence,
    computeAutonomyScore,
    getFullMetrics,
};
