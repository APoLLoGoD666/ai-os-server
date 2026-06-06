'use strict';

// Pipeline event hooks — fires on every orchestrator run.
// Wired to Slack for real-time visibility. Loaded lazily so missing services don't crash.

const _slack = (() => {
    try { return require('../services/slack/slack-agents'); } catch { return null; }
})();

module.exports = {
    async onPipelineStart(pipeline) {
        if (!_slack) return;
        await _slack.notifyPipelineStart(pipeline).catch(() => {});
    },

    async onPipelineComplete(pipeline) {
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
        if (!_slack) return;
        await _slack.notifyRunFailed({
            runId:           ctx.taskId,
            agent:           'Pipeline',
            error:           err?.message || String(err),
            taskDescription: ctx.description,
        }).catch(() => {});
    },
};
