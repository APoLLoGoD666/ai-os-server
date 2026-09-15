'use strict';

const { postToChannel, postMessage, CHANNELS, headerBlock, sectionBlock, fieldsBlock, dividerBlock, contextBlock } = require('./slack-client');

// Track active run threads: runId → { ts, channel }
const _runThreads = new Map();

async function notifyRunStart(run) {
  const { runId, agent, taskDescription, domain, model } = run;
  const blocks = [
    sectionBlock(`🤖 *${agent}* started\n*Task:* ${(taskDescription || 'No description').slice(0, 200)}\n*Domain:* ${domain || 'System'} · *Model:* ${model || 'auto'}`),
    contextBlock(`Run ID: ${runId} · ${new Date().toLocaleTimeString()}`),
  ];
  const result = await postToChannel('agents', `🤖 ${agent} started`, blocks);
  if (result.ok && result.ts) {
    _runThreads.set(runId, { ts: result.ts, channel: CHANNELS.agents });
  }
  return result;
}

async function notifyRunComplete(run) {
  const { runId, agent, costUsd, durationMs, tokenCount, status = 'completed' } = run;
  const emoji = status === 'completed' ? '✅' : '❌';
  const thread = _runThreads.get(runId);

  const text = `${emoji} *${agent}* ${status}\n*Cost:* $${(costUsd || 0).toFixed(4)} · *Duration:* ${_fmtMs(durationMs)} · *Tokens:* ${tokenCount || '?'}`;
  const blocks = [sectionBlock(text), contextBlock(new Date().toLocaleTimeString())];

  if (thread) {
    const result = await postMessage(thread.channel, text, blocks, thread.ts);
    _runThreads.delete(runId);
    return result;
  }
  return postToChannel('agents', text, blocks);
}

async function notifyRunFailed(run) {
  const { runId, agent, error, taskDescription } = run;
  const thread = _runThreads.get(runId);
  const blocks = [
    sectionBlock(`❌ *${agent}* FAILED\n*Error:* ${(error || 'Unknown error').slice(0, 500)}`),
    contextBlock(`Task: ${(taskDescription || '').slice(0, 100)}`),
  ];
  const text = `❌ ${agent} failed: ${(error || '').slice(0, 100)}`;

  if (thread) {
    const result = await postMessage(thread.channel, text, blocks, thread.ts);
    _runThreads.delete(runId);
    return result;
  }
  // Also alert to #apex-alerts
  await postToChannel('alerts', text, blocks);
  return postToChannel('agents', text, blocks);
}

async function notifyPipelineStart(pipeline) {
  const { taskId, description, agentCount = 8, model } = pipeline;
  const blocks = [
    headerBlock('⚙️ Agent Pipeline Started'),
    fieldsBlock([
      `*Task:* ${(description || '').slice(0, 100)}`,
      `*Agents:* ${agentCount}`,
      `*Model:* ${model || 'auto-routed'}`,
      `*Task ID:* ${taskId}`,
    ]),
  ];
  return postToChannel('agents', `⚙️ Pipeline started: ${(description || '').slice(0, 80)}`, blocks);
}

async function notifyPipelineComplete(pipeline) {
  const { taskId, description, totalCost, duration, commitHash } = pipeline;
  const blocks = [
    headerBlock('✅ Pipeline Complete'),
    fieldsBlock([
      `*Task:* ${(description || '').slice(0, 100)}`,
      `*Total Cost:* $${(totalCost || 0).toFixed(4)}`,
      `*Duration:* ${_fmtMs(duration)}`,
      `*Commit:* \`${(commitHash || 'none').slice(0, 8)}\``,
    ]),
    contextBlock(`Deployed to Render → ${process.env.RENDER_EXTERNAL_URL || 'https://ai-os-server-jx20.onrender.com'}`),
  ];
  return postToChannel('agents', `✅ Pipeline complete: ${(description || '').slice(0, 80)}`, blocks);
}

function _fmtMs(ms) {
  if (!ms) return '?';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

module.exports = { notifyRunStart, notifyRunComplete, notifyRunFailed, notifyPipelineStart, notifyPipelineComplete };
