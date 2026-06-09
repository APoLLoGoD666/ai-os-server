'use strict';

// Pipeline event hooks — fires on every orchestrator run.
// Wired to Slack for real-time visibility. Wired to governance.js for Level 9 audit trail.

const _slack = (() => {
    try { return require('../services/slack/slack-agents'); } catch { return null; }
})();

const _gov = (() => {
    try { return require('../lib/governance'); } catch { return null; }
})();

const { createClient } = require('@supabase/supabase-js');
let _sbClient = null;
function _sb() {
    if (!_sbClient) _sbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return _sbClient;
}

// Per-run governance context — keyed by taskId
const _govCtx = new Map();

async function _recordEvent(eventType, taskId, payload) {
    try {
        await _sb().from('execution_events').insert({
            event_type: eventType,
            task_id:    taskId,
            payload,
        });
    } catch { /* non-fatal */ }
}

module.exports = {
    async onPipelineStart(pipeline) {
        // Existing execution_events write
        _recordEvent('pipeline.start', pipeline.taskId, {
            description: pipeline.description,
            request_id:  pipeline.requestId || null,
            trace_id:    pipeline.traceId   || null,
        });

        // Level 9 governance (Domains 1,2,3,16,37)
        if (_gov && pipeline.traceId) {
            try {
                const ctx = await _gov.onPipelineStart(
                    pipeline.taskId, pipeline.traceId,
                    pipeline.description, pipeline.model,
                );
                _govCtx.set(pipeline.taskId, { ...ctx, traceId: pipeline.traceId });
            } catch (e) { console.error('[gov] onPipelineStart:', e.message); }
        }

        if (!_slack) return;
        await _slack.notifyPipelineStart(pipeline).catch(() => {});
    },

    async onPipelineComplete(pipeline) {
        // Existing execution_events write
        _recordEvent('pipeline.complete', pipeline.taskId, {
            commit_sha:  pipeline.commitHash,
            duration_ms: pipeline.duration,
            cost_usd:    pipeline.cost,
            trace_id:    pipeline.traceId || null,
        });

        // Level 9 governance (Domains 1-23, 26, 31, 33, 36, 38, 40)
        if (_gov && pipeline.traceId) {
            try {
                const ctx = _govCtx.get(pipeline.taskId) || {};
                await _gov.onPipelineComplete(pipeline.taskId, pipeline.traceId, {
                    graphId:    ctx.graphId    || null,
                    spanId:     ctx.spanId     || null,
                    conditionsMet: ctx.conditionsMet || [],
                    commitSha:  pipeline.commitHash,
                    costUsd:    pipeline.cost,
                    durationMs: pipeline.duration,
                    complexity: pipeline.complexity,
                    agentLogs:  pipeline.agentLogs || [],
                    spec:       pipeline.spec || null,
                    attempts:   pipeline.attempts || 1,
                    agentTokens: pipeline.agentTokens || {},
                });
                _govCtx.delete(pipeline.taskId);
            } catch (e) { console.error('[gov] onPipelineComplete:', e.message); }
        }

        if (!_slack) return;
        await _slack.notifyPipelineComplete({
            taskId:      pipeline.taskId,
            description: pipeline.description,
            totalCost:   pipeline.cost,
            duration:    pipeline.duration,
            commitHash:  pipeline.commitHash,
        }).catch(() => {});
    },

    async onPipelineFailed(err, ctx) {
        // Existing execution_events write
        _recordEvent('pipeline.failed', ctx.taskId, {
            error:       err?.message || String(err),
            description: ctx.description,
            trace_id:    ctx.traceId  || null,
        });

        // Level 9 governance (Domains 2, 3, 7, 11, 16, 17, 20, 21, 22, 23, 26, 33, 36, 40)
        if (_gov && ctx.traceId) {
            try {
                const govCtx = _govCtx.get(ctx.taskId) || {};
                await _gov.onPipelineFailed(ctx.taskId, ctx.traceId, {
                    graphId:      govCtx.graphId  || null,
                    spanId:       govCtx.spanId   || null,
                    conditionsMet: govCtx.conditionsMet || [],
                    error:        err?.message || String(err),
                    spec:         ctx.spec     || null,
                    agentLogs:    ctx.agentLogs || [],
                    costUsd:      ctx.cost      || '0',
                    durationMs:   ctx.duration  || 0,
                    agentTokens:  ctx.agentTokens || {},
                });
                _govCtx.delete(ctx.taskId);
            } catch (e) { console.error('[gov] onPipelineFailed:', e.message); }
        }

        if (!_slack) return;
        await _slack.notifyRunFailed({
            runId:           ctx.taskId,
            agent:           'Pipeline',
            error:           err?.message || String(err),
            taskDescription: ctx.description,
        }).catch(() => {});
    },
};
