'use strict';

// Layer 2: Episodic Memory — Postgres Layer
// Durable relational storage for all task executions, outcomes, and incidents.
// The vault JSON files (episodic-memory.js) remain for offline/Obsidian access.
// This module is the authoritative, queryable, embeddable Postgres layer.

const { getSupabaseClient }            = require('../clients');
const { embedText }                    = require('../embed');
const { generateMemoryId, contentHash } = require('./memory-governor');

function _sb() { return getSupabaseClient(); }

// Extract keywords from objective text.
function _keywords(text) {
    const stop = new Set(['the','and','for','with','this','that','from','into','have','been','will','using','when','then','after','before']);
    return (text || '').toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !stop.has(w))
        .slice(0, 20);
}

// Store an episode durably in Postgres. Embedding queued async.
// episode: { objective, complexity, success, outcomesSummary, costUsd, durationMs,
//            failedStage, failureReason, modelsUsed, lessonsderived, traceId, taskId }
// governance: { source, evidence }
async function storeEpisode(episode, governance = {}) {
    const memoryId = generateMemoryId('episodic');
    const keywords = _keywords(episode.objective);
    const payload  = {
        memory_id:       memoryId,
        trace_id:        episode.traceId  || governance.traceId  || null,
        task_id:         episode.taskId   || governance.taskId   || null,
        source:          governance.source || episode.source || 'orchestrator',
        evidence:        governance.evidence || null,
        objective:       episode.objective,
        complexity:      episode.complexity   || null,
        success:         Boolean(episode.success),
        outcome_summary: episode.outcomeSummary || null,
        cost_usd:        episode.costUsd       || null,
        duration_ms:     episode.durationMs    || null,
        failed_stage:    episode.failedStage   || null,
        failure_reason:  episode.failureReason || null,
        models_used:     episode.modelsUsed    || null,
        keywords,
        lessons_derived: episode.lessonsDerived || null,
        status:          'validated',
        validation_state:'auto_validated',
    };

    try {
        const { error } = await _sb().from('episodic_memory').insert(payload);
        if (error) throw error;
    } catch (e) {
        // FK violation (23503): task_id not in apex_agent_runs — retry with null
        if (e.code === '23503' && payload.task_id) {
            try {
                const { error: e2 } = await _sb().from('episodic_memory').insert({ ...payload, task_id: null });
                if (e2) throw e2;
            } catch (e3) {
                console.error(`[episodic-memory-pg] storeEpisode failed: ${e3.message}`);
                return null;
            }
        } else {
            console.error(`[episodic-memory-pg] storeEpisode failed: ${e.message}`);
            return null;
        }
    }

    // Embed async — non-blocking
    setImmediate(async () => {
        try {
            const embedInput = `${episode.objective} ${(keywords).join(' ')} ${episode.success ? 'success' : 'failure'}`;
            const embedding  = await embedText(embedInput);
            if (embedding) {
                const { error: embErr } = await _sb().from('episodic_memory')
                    .update({ embedding })
                    .eq('memory_id', memoryId);
                if (embErr) console.warn(`[episodic-memory-pg] embed update failed: ${embErr.message}`);
            }
        } catch (e) {
            console.warn(`[episodic-memory-pg] embed failed: ${e.message}`);
        }
    });

    return memoryId;
}

// Keyword-based similarity search (always available, no embedding needed).
function _keywordScore(objective, keywords) {
    const qwords = _keywords(objective);
    if (!qwords.length || !keywords || !keywords.length) return 0;
    const hits = qwords.filter(w => keywords.includes(w)).length;
    return hits / Math.max(qwords.length, keywords.length);
}

// Find similar episodes. Uses semantic search when embeddings available, falls back to keyword.
async function findSimilar(objective, options = {}) {
    const { limit = 5, successOnly = false, minScore = 0.05 } = options;
    const results = [];

    // Try semantic search first
    try {
        const embedding = await embedText(objective);
        if (embedding) {
            const { data, error } = await _sb().rpc('search_episodic_memory', {
                query_embedding:      embedding,
                similarity_threshold: 0.4,
                max_results:          limit * 2,
                success_only:         successOnly,
            });
            if (!error && data && data.length > 0) {
                return data.slice(0, limit).map(r => ({ ...r, _method: 'semantic' }));
            }
        }
    } catch (e) {
        console.warn(`[episodic-memory-pg] semantic search failed: ${e.message}`);
    }

    // Keyword fallback
    try {
        let q = _sb().from('episodic_memory')
            .select('memory_id, objective, success, confidence, keywords, created_at')
            .eq('status', 'validated')
            .order('created_at', { ascending: false })
            .limit(200);
        if (successOnly) q = q.eq('success', true);
        const { data, error } = await q;
        if (error) throw error;
        for (const row of (data || [])) {
            const score = _keywordScore(objective, row.keywords);
            if (score >= minScore) results.push({ ...row, similarity: score, _method: 'keyword' });
        }
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, limit);
    } catch (e) {
        console.error(`[episodic-memory-pg] findSimilar keyword fallback failed: ${e.message}`);
        return [];
    }
}

// Most recent N episodes.
async function getRecent(limit = 20) {
    try {
        const { data, error } = await _sb().from('episodic_memory')
            .select('memory_id, objective, success, cost_usd, duration_ms, created_at, failed_stage')
            .eq('status', 'validated')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[episodic-memory-pg] getRecent failed: ${e.message}`);
        return [];
    }
}

// Recent failure episodes.
async function getFailures(limit = 30) {
    try {
        const { data, error } = await _sb().from('episodic_memory')
            .select('memory_id, objective, failed_stage, failure_reason, cost_usd, created_at')
            .eq('status', 'validated')
            .eq('success', false)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error(`[episodic-memory-pg] getFailures failed: ${e.message}`);
        return [];
    }
}

// Success rate over last N pipeline runs.
// Reads apex_agent_runs (1 row per task, UPSERT semantics, correct success values)
// instead of episodic_memory which is contaminated by chat/voice gateway writes.
async function getSuccessRate(n = 50) {
    try {
        const { data, error } = await _sb().from('apex_agent_runs')
            .select('success')
            .order('created_at', { ascending: false })
            .limit(n);
        if (error) throw error;
        if (!data || data.length === 0) return null;
        return data.filter(r => r.success).length / data.length;
    } catch (e) {
        console.error(`[episodic-memory-pg] getSuccessRate failed: ${e.message}`);
        return null;
    }
}

// Aggregate pipeline stats for reporting.
// Reads apex_agent_runs — same reason as getSuccessRate.
async function getStats() {
    try {
        const { data, error } = await _sb().from('apex_agent_runs')
            .select('success, cost_usd, duration_ms, complexity')
            .order('created_at', { ascending: false })
            .limit(500);
        if (error) throw error;
        const episodes = data || [];
        const successes = episodes.filter(e => e.success);
        const failures  = episodes.filter(e => !e.success);
        const totalCost = episodes.reduce((s, e) => s + (e.cost_usd || 0), 0);
        return {
            total:        episodes.length,
            successCount: successes.length,
            failureCount: failures.length,
            successRate:  episodes.length > 0 ? successes.length / episodes.length : null,
            avgCostUsd:   episodes.length > 0 ? totalCost / episodes.length : 0,
            topFailStage: null,
        };
    } catch (e) {
        console.error(`[episodic-memory-pg] getStats failed: ${e.message}`);
        return null;
    }
}

module.exports = { storeEpisode, findSimilar, getRecent, getFailures, getSuccessRate, getStats };
