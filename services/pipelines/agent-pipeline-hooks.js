'use strict';

// Hooks that wrap the existing orchestrator.js pipeline
// Import in server.js: const pipelineHooks = require('./services/pipelines/agent-pipeline-hooks');
// Then call around each orchestrator invocation

const { agents: slackAgents, alerts: slackAlerts } = require('../slack');
const { sync: notionSync } = require('../notion');

// Call when master task starts
async function onPipelineStart(task) {
  const { taskId, description, model } = task;
  await slackAgents.notifyPipelineStart({ taskId, description, agentCount: 8, model }).catch(e => console.warn('[hook] pipeline start slack:', e.message));
}

// Call when master task completes
async function onPipelineComplete(result) {
  const { taskId, description, totalCost, duration, commitHash } = result;

  await slackAgents.notifyPipelineComplete({ taskId, description, totalCost, duration, commitHash }).catch(e => console.warn('[hook] pipeline complete slack:', e.message));

  await notionSync.logAgentRun({
    name: (description || '').slice(0, 100),
    agent: 'agent-pipeline',
    taskDescription: description,
    domain: 'Engineering',
    modelUsed: 'mixed',
    costUsd: totalCost,
    durationMs: duration,
    status: 'Completed',
    supabaseRunId: taskId,
  }).catch(e => console.warn('[hook] pipeline notion:', e.message));
}

// Call when master task fails
async function onPipelineFailed(error, task) {
  const { taskId, description } = task || {};
  await slackAlerts.alertError('Agent Pipeline Failed', `${error.message || error}\nTask: ${(description || '').slice(0, 100)}`, 'Orchestrator').catch(() => {});

  await notionSync.logAgentRun({
    name: (description || 'Failed task').slice(0, 100),
    agent: 'agent-pipeline',
    taskDescription: description,
    domain: 'Engineering',
    status: 'Failed',
    errorMessage: error.message || String(error),
    supabaseRunId: taskId,
  }).catch(() => {});
}

// Call when individual agent step runs
async function onAgentStepStart(step) {
  const { runId, agentName, taskDescription, domain, model } = step;
  return slackAgents.notifyRunStart({ runId, agent: agentName, taskDescription, domain, model }).catch(() => {});
}

async function onAgentStepComplete(step) {
  const { runId, agentName, costUsd, durationMs, tokenCount } = step;
  return slackAgents.notifyRunComplete({ runId, agent: agentName, costUsd, durationMs, tokenCount, status: 'completed' }).catch(() => {});
}

async function onAgentStepFailed(step, error) {
  const { runId, agentName, taskDescription } = step;
  return slackAgents.notifyRunFailed({ runId, agent: agentName, error: error.message, taskDescription }).catch(() => {});
}

module.exports = { onPipelineStart, onPipelineComplete, onPipelineFailed, onAgentStepStart, onAgentStepComplete, onAgentStepFailed };
