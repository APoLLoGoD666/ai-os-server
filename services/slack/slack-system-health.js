'use strict';

const { postToChannel, postDeduped, sectionBlock, fieldsBlock, contextBlock } = require('./slack-client');
const { alertCritical, alertError, alertWarning } = require('./slack-alerts');
const { postSystemHealthSummary } = require('./slack-briefings');

// Full health check — call this from the 6-hour cron
async function runHealthCheck(serverMetrics = {}) {
  const {
    memoryMb,
    responseTimeMs,
    supabaseLatencyMs,
    activeWebSockets,
    apiErrors24h = 0,
    geminiStatus,
    renderLastDeploy,
  } = serverMetrics;

  const issues = [];

  if (memoryMb > 460) issues.push({ severity: 'critical', msg: `Memory critical: ${memoryMb}MB (limit 460MB)` });
  else if (memoryMb > 400) issues.push({ severity: 'error', msg: `Memory high: ${memoryMb}MB` });

  if (supabaseLatencyMs > 1000) issues.push({ severity: 'error', msg: `Supabase latency: ${supabaseLatencyMs}ms` });
  else if (supabaseLatencyMs > 300) issues.push({ severity: 'warning', msg: `Supabase latency elevated: ${supabaseLatencyMs}ms` });

  if (responseTimeMs > 2000) issues.push({ severity: 'error', msg: `Server response slow: ${responseTimeMs}ms` });

  if (activeWebSockets > 100) issues.push({ severity: 'critical', msg: `WebSocket overload: ${activeWebSockets} connections` });
  else if (activeWebSockets > 50) issues.push({ severity: 'warning', msg: `WebSocket count high: ${activeWebSockets}` });

  // Report any issues
  for (const issue of issues) {
    if (issue.severity === 'critical') await alertCritical('System Health', issue.msg, 'APEX Server');
    else if (issue.severity === 'error') await alertError('System Health', issue.msg, 'APEX Server');
    else await alertWarning('System Health', issue.msg);
  }

  // Summary post (regardless)
  const status = issues.some(i => i.severity === 'critical') ? 'critical' : issues.some(i => i.severity === 'error') ? 'degraded' : issues.length > 0 ? 'degraded' : 'healthy';
  return postSystemHealthSummary({ serverStatus: status, supabaseLatencyMs, memoryMb, activeWs: activeWebSockets, renderDeploy: renderLastDeploy, apiErrors24h });
}

// Quick ping result
async function postPingResult(endpoint, statusCode, latencyMs) {
  const ok = statusCode >= 200 && statusCode < 400;
  if (!ok) {
    return alertError(`Endpoint down: ${endpoint}`, `HTTP ${statusCode} · ${latencyMs}ms`, 'Health Monitor');
  }
  if (latencyMs > 5000) {
    return alertWarning(`Endpoint slow: ${endpoint}`, `HTTP ${statusCode} · ${latencyMs}ms`);
  }
}

// Voice system check result
async function notifyVoiceStatus(isHealthy, details = '') {
  if (!isHealthy) {
    return alertError('Voice Pipeline', details || 'Gemini Live connection failed', 'Voice System');
  }
}

// Render deploy status
async function notifyDeployStatus(status, commitHash, duration) {
  const emoji = status === 'live' ? '✅' : status === 'failed' ? '❌' : '🔄';
  const key = `deploy:${commitHash}`;
  return postDeduped(key, 'system', `${emoji} Deploy ${status}: \`${(commitHash || '').slice(0, 8)}\` in ${duration || '?'}s`);
}

module.exports = { runHealthCheck, postPingResult, notifyVoiceStatus, notifyDeployStatus };
