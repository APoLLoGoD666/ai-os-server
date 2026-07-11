'use strict';

// Pipeline event hooks — fires on every orchestrator run.
// Wired to Slack for real-time visibility. Wired to governance.js for Level 9 audit trail.

const _slack = (() => {
    try { return require('../services/slack/slack-agents'); } catch (e) { console.warn('[Hooks] slack unavailable:', e.message); return null; }
})();

const _gov = (() => {
    try { return require('../lib/governance'); } catch (e) { console.warn('[Hooks] governance unavailable:', e.message); return null; }
})();

const _outbox = (() => {
    try { return require('../lib/write-with-outbox'); } catch (e) { console.warn('[Hooks] outbox unavailable:', e.message); return null; }
})();

// Emit a canonical event to the event spine. Fire-and-forget — never throws.
function _spine(type, source, payload) {
    if (!_outbox) return;
    setImmediate(async () => {
        try {
            await _outbox.writeWithOutbox(null, {
                source,
                type,
                payload,
                occurred_at: new Date().toISOString(),
            });
        } catch {}
    });
}

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

        _spine('pipeline.started', 'orchestrator', {
            task_id:     pipeline.taskId,
            description: (pipeline.description || '').slice(0, 255),
            trace_id:    pipeline.traceId || null,
            model:       pipeline.model   || null,
        });

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

        _spine('pipeline.completed', 'orchestrator', {
            task_id:     pipeline.taskId,
            trace_id:    pipeline.traceId  || null,
            commit_sha:  pipeline.commitHash || null,
            cost_usd:    pipeline.cost      || 0,
            duration_ms: pipeline.duration  || 0,
            complexity:  pipeline.complexity || null,
        });

        if (_slack) {
            await _slack.notifyPipelineComplete({
                taskId:      pipeline.taskId,
                description: pipeline.description,
                totalCost:   pipeline.cost,
                duration:    pipeline.duration,
                commitHash:  pipeline.commitHash,
            }).catch(() => {});
        }
        // Mirror completed run to Notion agentRuns database
        if (process.env.NOTION_API_KEY) {
            setImmediate(async () => {
                try {
                    const { createPage, DB } = require('../services/notion/notion-client');
                    await createPage(DB.agentRuns, {},
                        `Task: ${(pipeline.description || '').slice(0, 200)}\nStatus: complete\nCost: $${pipeline.cost || 0}\nCommit: ${pipeline.commitHash || 'none'}\nDuration: ${pipeline.duration || 0}ms\nTask ID: ${pipeline.taskId}`
                    );
                } catch {}
            });
        }
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

        _spine('pipeline.failed', 'orchestrator', {
            task_id:     ctx.taskId,
            trace_id:    ctx.traceId || null,
            error:       (err?.message || String(err)).slice(0, 500),
            description: (ctx.description || '').slice(0, 255),
        });

        if (!_slack) return;
        await _slack.notifyRunFailed({
            runId:           ctx.taskId,
            agent:           'Pipeline',
            error:           err?.message || String(err),
            taskDescription: ctx.description,
        }).catch(() => {});
    },
};
