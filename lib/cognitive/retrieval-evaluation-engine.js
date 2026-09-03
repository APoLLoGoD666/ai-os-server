'use strict';

// Retrieval Evaluation Engine — Phase 10
// Measures whether retrieved memory actually helped.
// Tracks: precision, recall, usefulness, influence score, outcome impact, confidence accuracy.
// Feeds results back to retrieval policy optimization.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

// Record a retrieval evaluation after a task completes.
// Called from _auditLog with outcome info.
async function evaluate(taskId, traceId, contextPack, taskSuccess, retrievalPolicyId = null) {
    if (!contextPack) return null;

    const sources = _auditSources(contextPack);
    const precision = _estimatePrecision(contextPack, taskSuccess);
    const recall    = _estimateRecall(contextPack);
    const influence = _estimateInfluence(contextPack, taskSuccess);
    const outcome   = taskSuccess ? 1.0 : 0.0;
    const usefulness = (precision * 0.4 + influence * 0.4 + recall * 0.2);

    const evalId = generateMemoryId('retrieval-eval').replace('mem-', 're-');

    try {
        await _sb().from('retrieval_evaluations').insert({
            eval_id:             evalId,
            task_id:             taskId,
            trace_id:            traceId || null,
            retrieval_policy_id: retrievalPolicyId,
            precision_score:     parseFloat(precision.toFixed(3)),
            recall_score:        parseFloat(recall.toFixed(3)),
            usefulness_score:    parseFloat(usefulness.toFixed(3)),
            influence_score:     parseFloat(influence.toFixed(3)),
            outcome_impact:      outcome,
            sources_used:        sources.used,
            sources_helpful:     sources.helpful,
            task_success:        taskSuccess,
            evaluation_method:   'outcome_proxy',
        });
    } catch (e) {
        console.warn('[retrieval-eval] insert failed (non-fatal):', e.message);
    }

    return { evalId, precision, recall, usefulness, influence, outcome };
}

function _auditSources(contextPack) {
    const used    = {};
    const helpful = {};

    const sourceKeys = ['episodes', 'lessons', 'decisions', 'procedures', 'knowledge', 'skills', 'incidents', 'graph'];
    for (const key of sourceKeys) {
        const items = contextPack[key];
        if (Array.isArray(items) && items.length > 0) {
            used[key]    = items.length;
            helpful[key] = items.filter(i => (i.confidence || i.score || 0) >= 0.6).length;
        }
    }

    return { used, helpful };
}

function _estimatePrecision(contextPack, taskSuccess) {
    // Precision proxy: what fraction of retrieved items were high-confidence?
    const all   = _getAllItems(contextPack);
    if (!all.length) return taskSuccess ? 0.5 : 0.3;
    const highConf = all.filter(i => (i.confidence || i.score || 0) >= 0.6).length;
    const base = highConf / all.length;
    // Adjust by outcome: success suggests retrieval was relevant
    return Math.min(1.0, parseFloat((base * (taskSuccess ? 1.1 : 0.9)).toFixed(3)));
}

function _estimateRecall(contextPack) {
    // Recall proxy: breadth of sources used
    const sourceKeys = ['episodes', 'lessons', 'decisions', 'procedures', 'knowledge', 'skills', 'incidents', 'graph'];
    const populated  = sourceKeys.filter(k => Array.isArray(contextPack[k]) && contextPack[k].length > 0).length;
    return parseFloat((populated / sourceKeys.length).toFixed(3));
}

function _estimateInfluence(contextPack, taskSuccess) {
    // Influence proxy: were there incidents or strong procedures that could have changed behavior?
    let score = 0.4; // baseline
    if ((contextPack.incidents || []).filter(i => i.status === 'open').length > 0) score += 0.2;
    if ((contextPack.procedures || []).filter(p => p.confidence >= 0.8).length > 0) score += 0.2;
    if ((contextPack.decisions || []).filter(d => d.outcome_quality === 'excellent').length > 0) score += 0.1;
    if (taskSuccess) score += 0.1;
    return Math.min(1.0, parseFloat(score.toFixed(3)));
}

function _getAllItems(contextPack) {
    const all = [];
    for (const key of ['episodes', 'lessons', 'decisions', 'procedures', 'knowledge', 'skills']) {
        if (Array.isArray(contextPack[key])) all.push(...contextPack[key]);
    }
    return all;
}

// Aggregate retrieval quality stats — used by cognitive performance engine.
async function getQualityStats(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('retrieval_evaluations')
            .select('precision_score, recall_score, usefulness_score, influence_score, task_success, created_at')
            .gte('created_at', cutoff);
        if (!data || !data.length) return { count: 0 };

        const avg = (arr, key) => arr.reduce((s, r) => s + (r[key] || 0), 0) / arr.length;
        return {
            count:            data.length,
            avg_precision:    parseFloat(avg(data, 'precision_score').toFixed(3)),
            avg_recall:       parseFloat(avg(data, 'recall_score').toFixed(3)),
            avg_usefulness:   parseFloat(avg(data, 'usefulness_score').toFixed(3)),
            avg_influence:    parseFloat(avg(data, 'influence_score').toFixed(3)),
            success_rate:     parseFloat((data.filter(r => r.task_success).length / data.length).toFixed(3)),
        };
    } catch (_) { return { count: 0 }; }
}

// Feed back into retrieval policy — identify which source types have highest influence.
async function getSourceEffectiveness(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('retrieval_evaluations')
            .select('sources_helpful, task_success')
            .gte('created_at', cutoff)
            .limit(100);

        const sourceTotals = {};
        const sourceSuccess = {};
        for (const row of (data || [])) {
            const helpful = row.sources_helpful || {};
            for (const [source, count] of Object.entries(helpful)) {
                sourceTotals[source]  = (sourceTotals[source]  || 0) + count;
                sourceSuccess[source] = (sourceSuccess[source] || 0) + (row.task_success ? count : 0);
            }
        }
        return Object.entries(sourceTotals).map(([source, total]) => ({
            source,
            helpful_count:   total,
            success_weighted: parseFloat(((sourceSuccess[source] || 0) / total).toFixed(3)),
        })).sort((a, b) => b.success_weighted - a.success_weighted);
    } catch (_) { return []; }
}

module.exports = { evaluate, getQualityStats, getSourceEffectiveness };
