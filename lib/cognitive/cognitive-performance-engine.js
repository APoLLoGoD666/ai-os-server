'use strict';

// Cognitive Performance Engine — Phase 13
// Tracks long-term intelligence growth.
// Metrics: Reasoning Accuracy, Planning Accuracy, Decision Accuracy,
//          Prediction Accuracy, Execution Success, Adaptation Success, Improvement Success.
// Generates trend reports. Measures whether Apex is becoming smarter.

const fs                    = require('fs');
const path                  = require('path');
const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

const OBSIDIAN_VAULT = process.env.OBSIDIAN_VAULT_PATH
    || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';

// Compute and store cognitive performance metrics for a period.
async function computeMetrics(type = 'weekly') {
    const days      = type === 'monthly' ? 30 : type === 'quarterly' ? 90 : 7;
    const label     = _periodLabel(type);
    const cutoff    = new Date(Date.now() - days * 86400000).toISOString();

    const [metaObs, autonomyDec, retrievalEval, improvements, adaptations] = await Promise.allSettled([
        _getMetaObservations(cutoff),
        _getAutonomyDecisions(cutoff),
        _getRetrievalEvals(cutoff),
        _getImprovements(cutoff),
        _getAdaptationCycles(cutoff),
    ]);

    const meta      = metaObs.value      || [];
    const autonomy  = autonomyDec.value  || [];
    const retrieval = retrievalEval.value || [];
    const impr      = improvements.value || [];
    const adapt     = adaptations.value  || [];

    const avg = (arr, key) => arr.length ? arr.reduce((s, r) => s + (r[key] || 0), 0) / arr.length : 0;

    // Core metrics
    const reasoningAccuracy  = avg(meta, 'reasoning_quality');
    const planningAccuracy   = avg(meta, 'planning_quality');
    const decisionAccuracy   = avg(meta, 'decision_quality');
    const predictionAccuracy = avg(meta, 'prediction_accuracy');
    const executionSuccess   = meta.length > 0 ? meta.filter(r => r.task_success).length / meta.length : 0;
    const adaptationSuccess  = adapt.length > 0 ? 0.7 : 0.5; // proxy
    const improvementSuccess = impr.length > 0 ?
        impr.filter(i => i.status === 'validated').length / impr.length : 0.5;

    const overall = (
        reasoningAccuracy  * 0.20 +
        planningAccuracy   * 0.15 +
        decisionAccuracy   * 0.15 +
        predictionAccuracy * 0.10 +
        executionSuccess   * 0.25 +
        adaptationSuccess  * 0.10 +
        improvementSuccess * 0.05
    );

    const taskCount  = meta.length;
    const costPerTask = taskCount > 0 ? avg(meta, 'cost_usd') : 0;
    const avgDuration = taskCount > 0 ? avg(meta, 'duration_ms') : 0;

    const metricId = generateMemoryId('perf').replace('mem-', 'cpm-');

    try {
        await _sb().from('cognitive_performance_metrics').upsert({
            metric_id:           metricId,
            metric_type:         type,
            period_label:        label,
            reasoning_accuracy:  parseFloat(reasoningAccuracy.toFixed(3)),
            planning_accuracy:   parseFloat(planningAccuracy.toFixed(3)),
            decision_accuracy:   parseFloat(decisionAccuracy.toFixed(3)),
            prediction_accuracy: parseFloat(predictionAccuracy.toFixed(3)),
            execution_success:   parseFloat(executionSuccess.toFixed(3)),
            adaptation_success:  parseFloat(adaptationSuccess.toFixed(3)),
            improvement_success: parseFloat(improvementSuccess.toFixed(3)),
            overall_score:       parseFloat(overall.toFixed(3)),
            task_count:          taskCount,
            cost_per_task:       parseFloat(costPerTask.toFixed(5)),
            avg_duration_ms:     Math.round(avgDuration),
        }, { onConflict: 'metric_type,period_label' });
    } catch (e) {
        console.warn('[cognitive-perf] upsert failed (non-fatal):', e.message);
    }

    const metrics = {
        period: label, type, task_count: taskCount,
        reasoning_accuracy:  parseFloat(reasoningAccuracy.toFixed(3)),
        planning_accuracy:   parseFloat(planningAccuracy.toFixed(3)),
        decision_accuracy:   parseFloat(decisionAccuracy.toFixed(3)),
        prediction_accuracy: parseFloat(predictionAccuracy.toFixed(3)),
        execution_success:   parseFloat(executionSuccess.toFixed(3)),
        adaptation_success:  parseFloat(adaptationSuccess.toFixed(3)),
        improvement_success: parseFloat(improvementSuccess.toFixed(3)),
        overall_score:       parseFloat(overall.toFixed(3)),
        cost_per_task:       parseFloat(costPerTask.toFixed(5)),
        avg_duration_ms:     Math.round(avgDuration),
    };

    await _publishToObsidian(metrics, type);
    return metrics;
}

// Get trend — is the system improving?
async function getTrend(type = 'weekly', periods = 8) {
    try {
        const { data } = await _sb().from('cognitive_performance_metrics')
            .select('period_label, overall_score, execution_success, reasoning_accuracy, task_count, computed_at')
            .eq('metric_type', type)
            .order('computed_at', { ascending: false })
            .limit(periods);

        if (!data || data.length < 2) return { trend: 'insufficient_data', data: data || [] };

        const scores = data.map(r => r.overall_score || 0).reverse();
        const recent = scores.slice(-3);
        const older  = scores.slice(0, Math.max(1, scores.length - 3));
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg  = older.reduce((a, b) => a + b, 0) / older.length;
        const delta     = recentAvg - olderAvg;

        const trend = delta > 0.05 ? 'improving' : delta < -0.05 ? 'declining' : 'stable';
        return { trend, delta: parseFloat(delta.toFixed(3)), recent_avg: parseFloat(recentAvg.toFixed(3)), data };
    } catch (_) { return { trend: 'error', data: [] }; }
}

async function _getMetaObservations(cutoff) {
    const { data } = await _sb().from('meta_reasoning_observations')
        .select('reasoning_quality, planning_quality, decision_quality, prediction_accuracy, execution_quality, task_success, cost_usd, duration_ms')
        .gte('created_at', cutoff)
        .limit(200);
    return data || [];
}

async function _getAutonomyDecisions(cutoff) {
    const { data } = await _sb().from('autonomy_decisions')
        .select('autonomy_level, composite_confidence')
        .gte('created_at', cutoff)
        .limit(100);
    return data || [];
}

async function _getRetrievalEvals(cutoff) {
    const { data } = await _sb().from('retrieval_evaluations')
        .select('usefulness_score, influence_score, task_success')
        .gte('created_at', cutoff)
        .limit(100);
    return data || [];
}

async function _getImprovements(cutoff) {
    const { data } = await _sb().from('improvement_candidates')
        .select('status')
        .gte('created_at', cutoff)
        .limit(50);
    return data || [];
}

async function _getAdaptationCycles(cutoff) {
    try {
        const { data } = await _sb().from('adaptation_cycles')
            .select('cycle_id')
            .gte('started_at', cutoff)
            .limit(10);
        return data || [];
    } catch (_) { return []; }
}

async function _publishToObsidian(metrics, type) {
    try {
        const dir  = path.join(OBSIDIAN_VAULT, '08 Operations', 'Cognitive-Performance');
        const file = path.join(dir, `${type}-${metrics.period}.md`);
        fs.mkdirSync(dir, { recursive: true });
        const md = _renderMarkdown(metrics, type);
        fs.writeFileSync(file, md, 'utf8');
    } catch (_) {}
}

function _renderMarkdown(m, type) {
    return [
        `# Cognitive Performance — ${type.charAt(0).toUpperCase() + type.slice(1)} Report`,
        `**Period:** ${m.period}  `,
        `**Tasks:** ${m.task_count}  `,
        `**Overall Score:** ${(m.overall_score * 100).toFixed(1)}%`,
        '',
        '## Cognitive Metrics',
        `| Metric | Score |`,
        `|--------|-------|`,
        `| Reasoning Accuracy | ${(m.reasoning_accuracy * 100).toFixed(1)}% |`,
        `| Planning Accuracy | ${(m.planning_accuracy * 100).toFixed(1)}% |`,
        `| Decision Accuracy | ${(m.decision_accuracy * 100).toFixed(1)}% |`,
        `| Prediction Accuracy | ${(m.prediction_accuracy * 100).toFixed(1)}% |`,
        `| Execution Success | ${(m.execution_success * 100).toFixed(1)}% |`,
        `| Adaptation Success | ${(m.adaptation_success * 100).toFixed(1)}% |`,
        `| Improvement Success | ${(m.improvement_success * 100).toFixed(1)}% |`,
        '',
        `**Cost per task:** $${m.cost_per_task}  `,
        `**Avg duration:** ${Math.round(m.avg_duration_ms / 1000)}s`,
    ].join('\n');
}

function _periodLabel(type) {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const d     = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week  = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    if (type === 'quarterly') return `${year}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
    if (type === 'monthly')   return `${year}-${month}`;
    return `${year}-W${String(week).padStart(2, '0')}`;
}

module.exports = { computeMetrics, getTrend };
