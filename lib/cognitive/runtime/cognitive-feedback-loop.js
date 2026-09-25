'use strict';

// Cognitive Feedback Loop — Phase 9 enforcement
// Post-execution: closes the loop from pipeline outcomes → cognitive evolution.
// Reads meta-reasoning trends, triggers evolution when failure patterns detected,
// records recovery patterns, and updates adaptation engine with cognitive context.
// All operations are non-blocking (setImmediate) — never delays the pipeline response.

const { getSupabaseClient } = require('../../clients');

function _sb() { return getSupabaseClient(); }

// THRESHOLDS for evolution trigger
const EVOLUTION_TRIGGER = {
    MIN_SAMPLE:    5,    // need at least 5 recent observations
    FAIL_RATE:     0.40, // trigger if failure rate > 40% in last 3 days
    AVG_QUALITY:   0.45, // trigger if avg reasoning quality < 0.45
};

async function process(taskId, traceId, pipelineResult) {
    const { success, agentLogs, complexity, cost, attempts, objective } = pipelineResult;

    // 1. Async: check if evolution should be triggered
    setImmediate(() => _checkEvolutionTrigger(success, taskId).catch(() => {}));

    // 2. Async: record recovery pattern if task succeeded after retries
    if (success && attempts > 1) {
        setImmediate(() => _recordRecovery(taskId, traceId, objective, attempts, agentLogs).catch(() => {}));
    }

    // 3. Async: if task failed at specific stage, update adaptation engine
    if (!success) {
        const failedStage = (agentLogs || []).slice().reverse()
            .find(l => l.result?.error)?.role || null;
        setImmediate(() => _recordStageFailurePattern(failedStage, complexity).catch(() => {}));
    }

    // 4. Async: log feedback cycle to DB
    setImmediate(() => _logFeedbackCycle(taskId, traceId, success, attempts).catch(() => {}));

    return { processed: true };
}

async function _checkEvolutionTrigger(currentSuccess, taskId) {
    try {
        const cutoff = new Date(Date.now() - 3 * 86400000).toISOString();
        const { data: recentObs } = await _sb().from('meta_reasoning_observations')
            .select('task_success, reasoning_quality')
            .gte('created_at', cutoff)
            .limit(20);

        if (!recentObs || recentObs.length < EVOLUTION_TRIGGER.MIN_SAMPLE) return;

        const failCount  = recentObs.filter(r => !r.task_success).length;
        const failRate   = failCount / recentObs.length;
        const avgQuality = recentObs.reduce((s, r) => s + (r.reasoning_quality || 0), 0) / recentObs.length;

        if (failRate > EVOLUTION_TRIGGER.FAIL_RATE || avgQuality < EVOLUTION_TRIGGER.AVG_QUALITY) {
            const evo = require('../cognitive-evolution-engine');
            await evo.runEvolutionCycle();
            console.log(`[FeedbackLoop] Evolution triggered — fail_rate=${(failRate * 100).toFixed(0)}% avg_reasoning=${avgQuality.toFixed(2)} (n=${recentObs.length})`);
        }
    } catch (e) {
        console.warn('[FeedbackLoop] evolution check failed (non-fatal):', e.message);
    }
}

async function _recordRecovery(taskId, traceId, objective, attempts, agentLogs) {
    try {
        // Log recoveries to obsidian for human visibility
        const { obsidianAppend } = require('../../../agent-system/obsidian-client');
        const recoveredAt  = new Date().toISOString().split('T')[0];
        const failedStages = agentLogs
            .filter(l => l.result?.passed === false || l.result?.error)
            .map(l => l.role).join(', ') || 'unknown';
        const note = `## ${recoveredAt} — ${taskId}\n- Objective: ${(objective || '').slice(0, 80)}\n- Recovered after ${attempts} attempts\n- Initial failures: ${failedStages}`;
        await obsidianAppend('System/Cognitive-Recoveries.md', note);
    } catch {}
}

async function _recordStageFailurePattern(failedStage, complexity) {
    if (!failedStage) return;
    try {
        // Check if this stage has been failing repeatedly — if so, flag for self-optimization
        const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data } = await _sb().from('apex_agent_stages')
            .select('success')
            .eq('stage', failedStage)
            .eq('success', false)
            .gte('created_at', cutoff)
            .limit(10);

        if (data && data.length >= 5) {
            // 5+ failures of same stage in a week — submit to self-optimization
            const selfOpt = require('./self-optimization-engine');
            await selfOpt.suggest({ days: 7, focusStage: failedStage });
            console.log(`[FeedbackLoop] Stage failure pattern detected: ${failedStage} failed ${data.length}x in 7d → self-optimization triggered`);
        }
    } catch {}
}

async function _logFeedbackCycle(taskId, traceId, success, attempts) {
    try {
        // Use intelligence_reports table as a lightweight activity log (no new table needed)
        await _sb().from('intelligence_reports').insert({
            report_type:  'feedback_cycle',
            report_data:  { taskId, traceId, success, attempts, source: 'cognitive_feedback_loop' },
            generated_at: new Date().toISOString(),
        });
    } catch {}
}

module.exports = { process };
