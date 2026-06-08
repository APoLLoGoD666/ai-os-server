'use strict';

// Pipeline event hooks — fires on every orchestrator run.
// Wired to Slack for real-time visibility. Loaded lazily so missing services don't crash.

const _slack = (() => {
    try { return require('../services/slack/slack-agents'); } catch { return null; }
})();

const { createClient } = require('@supabase/supabase-js');
function _sb() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function _recordEvent(eventType, taskId, payload) {
    try {
        await _sb().from('execution_events').insert({
            event_type: eventType,
            task_id:    taskId,
            payload,
        });
    } catch { /* non-fatal — observability must never crash the pipeline */ }
}

module.exports = {
    async onPipelineStart(pipeline) {
        _recordEvent('pipeline.start', pipeline.taskId, {
            description: pipeline.description,
            request_id:  pipeline.requestId || null,
        });
        if (!_slack) return;
        await _slack.notifyPipelineStart(pipeline).catch(() => {});
    },

    async onPipelineComplete(pipeline) {
        _recordEvent('pipeline.complete', pipeline.taskId, {
            commit_sha:  pipeline.commitHash,
            duration_ms: pipeline.duration,
            cost_usd:    pipeline.cost,
        });
        if (!_slack) return;
        await _slack.notifyPipelineComplete({
            taskId:     pipeline.taskId,
            description: pipeline.description,
            totalCost:  pipeline.cost,
            duration:   pipeline.duration,
            commitHash: pipeline.commitHash,
        }).catch(() => {});
    },

    async onPipelineFailed(err, ctx) {
        _recordEvent('pipeline.failed', ctx.taskId, {
            error:       err?.message || String(err),
            description: ctx.description,
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
