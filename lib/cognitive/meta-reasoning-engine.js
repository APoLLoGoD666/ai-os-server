'use strict';

// Meta-Reasoning Engine — Phase 12
// Evaluates cognition itself. Tracks reasoning quality, planning quality,
// decision quality, prediction quality, execution quality, adaptation quality.
// Finds: which strategies work best, which approaches fail most,
//        which modes create incidents. Stores findings in strategic/decision memory.

const { getSupabaseClient } = require('../clients');
const { generateMemoryId }  = require('../memory/memory-governor');

function _sb() { return getSupabaseClient(); }

// Record a meta-reasoning observation for a completed task.
async function record(taskId, traceId, pipelineResult, cognitivePolicy, executionStrategy) {
    const success      = pipelineResult?.success ?? false;
    const cost         = pipelineResult?.cost_usd ?? 0;
    const durationMs   = pipelineResult?.duration_ms ?? 0;
    const failedStage  = pipelineResult?.failed_stage ?? null;
    const agentLogs    = pipelineResult?.agent_logs ?? [];

    const reasoningQuality  = _scoreReasoningQuality(agentLogs, success, failedStage);
    const planningQuality   = _scorePlanningQuality(agentLogs, success, failedStage);
    const decisionQuality   = _scoreDecisionQuality(agentLogs, success);
    const predictionAccuracy = _scorePredictionAccuracy(pipelineResult, cognitivePolicy);
    const executionQuality  = _scoreExecutionQuality(success, failedStage, agentLogs, executionStrategy);
    const adaptationQuality = 0.5; // Filled in by adaptation cycle

    const obsId = generateMemoryId('meta').replace('mem-', 'mro-');

    try {
        await _sb().from('meta_reasoning_observations').insert({
            observation_id:    obsId,
            task_id:           taskId,
            trace_id:          traceId || null,
            reasoning_mode:    cognitivePolicy?.reasoning_mode || 'ANALYTICAL',
            reasoning_quality: parseFloat(reasoningQuality.toFixed(3)),
            planning_quality:  parseFloat(planningQuality.toFixed(3)),
            decision_quality:  parseFloat(decisionQuality.toFixed(3)),
            prediction_accuracy: parseFloat(predictionAccuracy.toFixed(3)),
            execution_quality: parseFloat(executionQuality.toFixed(3)),
            adaptation_quality: adaptationQuality,
            task_success:      success,
            cost_usd:          parseFloat(cost.toFixed(5)),
            duration_ms:       durationMs,
            failure_stage:     failedStage,
            observations:      { agentCount: agentLogs.length, retries: pipelineResult?.retries || 0 },
        });
    } catch (e) {
        console.warn('[meta-reasoning] record failed (non-fatal):', e.message);
    }

    return { obsId, reasoningQuality, planningQuality, decisionQuality, executionQuality };
}

function _scoreReasoningQuality(agentLogs, success, failedStage) {
    // Reasoning quality: did the ARCHITECT produce a complete valid design?
    const archLog = agentLogs.find(l => l.role === 'ARCHITECT');
    if (!archLog) return success ? 0.5 : 0.3;

    let score = 0.5;
    const result = archLog.result || {};
    if (result.summary && result.summary.length > 50)      score += 0.15;
    if ((result.testCases || []).length >= 2)               score += 0.10;
    if ((result.warnings || []).length === 0)               score += 0.10;
    if (result.confidence && result.confidence >= 0.7)      score += 0.10;
    if (!success && failedStage === 'ARCHITECT')            score -= 0.20;
    if (success)                                            score += 0.05;
    return Math.max(0, Math.min(1.0, score));
}

function _scorePlanningQuality(agentLogs, success, failedStage) {
    const devLog = agentLogs.find(l => l.role === 'DEVELOPER');
    if (!devLog) return 0.4;

    let score = 0.5;
    const applied = (devLog.result?.applied || []);
    if (applied.length > 0 && applied.every(r => r.status !== 'error')) score += 0.20;
    if (applied.some(r => r.status === 'error'))                        score -= 0.20;
    if (!success && failedStage === 'DEVELOPER')                        score -= 0.15;
    if (success)                                                        score += 0.10;
    return Math.max(0, Math.min(1.0, score));
}

function _scoreDecisionQuality(agentLogs, success) {
    // Decision quality: did agents make reasonable routing choices?
    const errors  = agentLogs.filter(l => l.result?.error).length;
    const retries  = agentLogs.filter(l => l.role === 'DEVELOPER' && l.attempt > 1).length;
    let score = success ? 0.75 : 0.40;
    score -= errors * 0.10;
    score -= retries * 0.05;
    return Math.max(0, Math.min(1.0, score));
}

function _scorePredictionAccuracy(pipelineResult, cognitivePolicy) {
    // Prediction accuracy: was the cognitive policy correct about what the task needed?
    if (!cognitivePolicy) return 0.5;
    const success = pipelineResult?.success;

    // If we predicted high risk and it was indeed hard → accurate
    // If we predicted FAST and it failed → inaccurate
    if (cognitivePolicy.reasoning_mode === 'FAST' && !success) return 0.3;
    if (cognitivePolicy.reasoning_mode === 'DELIBERATE' && success) return 0.85;
    if (cognitivePolicy.reasoning_mode === 'ANALYTICAL' && success) return 0.75;
    return success ? 0.65 : 0.45;
}

function _scoreExecutionQuality(success, failedStage, agentLogs, executionStrategy) {
    let score = success ? 0.80 : 0.30;
    if (failedStage === 'COMMITTER') score += success ? 0.10 : -0.10;
    if (failedStage === 'VALIDATOR') score -= 0.10;
    // Bonus if verification passed on first try
    const validatorLog = agentLogs.find(l => l.role === 'VALIDATOR');
    if (validatorLog?.result?.passed && !validatorLog?.result?.error) score += 0.05;
    return Math.max(0, Math.min(1.0, score));
}

// Analyze what works — called by weekly synthesis.
async function synthesize(days = 30) {
    try {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        const { data } = await _sb().from('meta_reasoning_observations')
            .select('*')
            .gte('created_at', cutoff)
            .limit(200);

        if (!data || !data.length) return { count: 0 };

        // Best reasoning modes
        const byMode = {};
        for (const row of data) {
            if (!byMode[row.reasoning_mode]) byMode[row.reasoning_mode] = { success: 0, total: 0, qualitySum: 0 };
            byMode[row.reasoning_mode].total++;
            if (row.task_success) byMode[row.reasoning_mode].success++;
            byMode[row.reasoning_mode].qualitySum += (row.reasoning_quality || 0);
        }

        const modeStats = Object.entries(byMode).map(([mode, s]) => ({
            mode,
            success_rate:     parseFloat((s.success / s.total).toFixed(3)),
            avg_quality:      parseFloat((s.qualitySum / s.total).toFixed(3)),
            count:            s.total,
        })).sort((a, b) => b.success_rate - a.success_rate);

        // Most common failure stage
        const stageFailures = {};
        for (const row of data.filter(r => !r.task_success)) {
            if (row.failure_stage) stageFailures[row.failure_stage] = (stageFailures[row.failure_stage] || 0) + 1;
        }

        const avg = (arr, key) => arr.reduce((s, r) => s + (r[key] || 0), 0) / arr.length;

        return {
            count:                data.length,
            success_rate:         parseFloat((data.filter(r => r.task_success).length / data.length).toFixed(3)),
            avg_reasoning_quality: parseFloat(avg(data, 'reasoning_quality').toFixed(3)),
            avg_planning_quality:  parseFloat(avg(data, 'planning_quality').toFixed(3)),
            avg_execution_quality: parseFloat(avg(data, 'execution_quality').toFixed(3)),
            avg_cost_usd:          parseFloat(avg(data, 'cost_usd').toFixed(5)),
            best_reasoning_mode:   modeStats[0]?.mode || null,
            worst_reasoning_mode:  modeStats[modeStats.length - 1]?.mode || null,
            mode_stats:            modeStats,
            stage_failure_counts:  stageFailures,
        };
    } catch (e) {
        console.error('[meta-reasoning] synthesize failed:', e.message);
        return { count: 0 };
    }
}

async function getStats(days = 30) {
    return synthesize(days);
}

module.exports = { record, synthesize, getStats };
