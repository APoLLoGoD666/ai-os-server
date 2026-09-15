'use strict';

const { postToChannel, postDeduped, headerBlock, sectionBlock, fieldsBlock, dividerBlock, contextBlock, actionButton } = require('./slack-client');

// Severity colors
const COLORS = { critical: '#FF0000', error: '#FF6B00', warning: '#FFC107', info: '#00D4FF', success: '#00C853' };

async function alertCritical(title, details, system = 'APEX') {
  const key = `critical:${title}`;
  const blocks = [
    headerBlock(`🚨 CRITICAL: ${title}`),
    sectionBlock(`*System:* ${system}\n*Details:* ${details}\n*Time:* ${new Date().toISOString()}`),
    dividerBlock(),
    contextBlock('Requires immediate attention'),
  ];
  const text = `🚨 CRITICAL: ${title} | ${system}`;
  // Critical goes to both alerts and executive
  await postDeduped(key, 'alerts', text, blocks);
  await postDeduped(`exec:${key}`, 'executive', text, blocks);
}

async function alertError(title, details, system = 'APEX') {
  const key = `error:${title}`;
  const blocks = [
    headerBlock(`🔴 ERROR: ${title}`),
    sectionBlock(`*System:* ${system}\n*Details:* ${details}\n*Time:* ${new Date().toISOString()}`),
  ];
  return postDeduped(key, 'alerts', `🔴 ERROR: ${title}`, blocks);
}

async function alertWarning(title, details) {
  const key = `warning:${title}`;
  const blocks = [
    sectionBlock(`⚠️ *WARNING: ${title}*\n${details}`),
    contextBlock(new Date().toISOString()),
  ];
  return postDeduped(key, 'alerts', `⚠️ WARNING: ${title}`, blocks);
}

async function alertSuccess(title, details) {
  return postToChannel('alerts', `✅ ${title}: ${details}`);
}

async function alertHealthAnomaly(metric, value, threshold, domain = '') {
  const title = `Health anomaly${domain ? ` (${domain})` : ''}: ${metric}`;
  const key = `health:${metric}`;
  const blocks = [
    sectionBlock(`🏥 *Health Anomaly Detected*\n*Metric:* ${metric}\n*Value:* ${value}\n*Threshold:* ${threshold}`),
    contextBlock(new Date().toISOString()),
  ];
  await postDeduped(key, 'health', title, blocks);
  if (domain === 'streak') await postDeduped(`exec:${key}`, 'executive', title, blocks);
}

async function alertBudgetThreshold(category, spent, budget, pct) {
  const key = `budget:${category}:${Math.floor(pct / 10)}`;
  const blocks = [
    sectionBlock(`💰 *Budget Alert — ${category}*\n*Spent:* $${spent.toFixed(2)}\n*Budget:* $${budget.toFixed(2)}\n*Used:* ${pct.toFixed(0)}%`),
    contextBlock(new Date().toISOString()),
  ];
  return postDeduped(key, 'finance', `💰 Budget ${pct.toFixed(0)}% used: ${category}`, blocks);
}

async function alertApiQuota(api, model, percentUsed) {
  if (percentUsed < 80) return;
  const severity = percentUsed >= 95 ? 'CRITICAL' : 'WARNING';
  const key = `quota:${api}:${model}:${Math.floor(percentUsed / 5)}`;
  const blocks = [
    sectionBlock(`${percentUsed >= 95 ? '🚨' : '⚠️'} *API Quota ${severity}*\n*API:* ${api}\n*Model:* ${model}\n*Used:* ${percentUsed.toFixed(0)}%`),
  ];
  const fn = percentUsed >= 95 ? alertCritical : alertWarning;
  if (percentUsed >= 95) return fn(`API quota critical: ${api}/${model}`, `${percentUsed.toFixed(0)}% used`);
  return postDeduped(key, 'alerts', `⚠️ API quota ${percentUsed.toFixed(0)}%: ${api}/${model}`, blocks);
}

async function alertRenderDeploy(commitHash, status) {
  const emoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : '🔄';
  return postToChannel('system', `${emoji} Render deploy ${status}: \`${(commitHash || 'unknown').slice(0, 8)}\``);
}

module.exports = { alertCritical, alertError, alertWarning, alertSuccess, alertHealthAnomaly, alertBudgetThreshold, alertApiQuota, alertRenderDeploy };
