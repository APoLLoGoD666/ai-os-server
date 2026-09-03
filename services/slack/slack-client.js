'use strict';

const https = require('https');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// Channel name → env var mapping with fallback to hardcoded name
const CHANNELS = {
  executive:   process.env.SLACK_CHANNEL_EXECUTIVE   || 'apex-executive',
  alerts:      process.env.SLACK_CHANNEL_ALERTS       || 'apex-alerts',
  agents:      process.env.SLACK_CHANNEL_AGENTS       || 'apex-agents',
  projects:    process.env.SLACK_CHANNEL_PROJECTS     || 'apex-projects',
  finance:     process.env.SLACK_CHANNEL_FINANCE      || 'apex-finance',
  content:     process.env.SLACK_CHANNEL_CONTENT      || 'apex-content',
  research:    process.env.SLACK_CHANNEL_RESEARCH     || 'apex-research',
  health:      process.env.SLACK_CHANNEL_HEALTH       || 'apex-health',
  system:      process.env.SLACK_CHANNEL_SYSTEM       || 'apex-system-health',
  weeklyReview: process.env.SLACK_CHANNEL_WEEKLY      || 'apex-weekly-review',
};

// Dedup: don't resend same alert within 15 min
const _dedup = new Map();
const DEDUP_TTL = 15 * 60 * 1000;

function _isDup(key) {
  const last = _dedup.get(key);
  if (last && Date.now() - last < DEDUP_TTL) return true;
  _dedup.set(key, Date.now());
  return false;
}

// Mask secrets in text before sending
function _mask(text) {
  if (!text) return text;
  return String(text)
    .replace(/sk-ant-api\S+/g, '[ANTHROPIC_KEY]')
    .replace(/AQ\.[A-Za-z0-9_-]{20,}/g, '[GOOGLE_KEY]')
    .replace(/ghp_[A-Za-z0-9]{36}/g, '[GITHUB_TOKEN]')
    .replace(/eyJ[A-Za-z0-9._-]{50,}/g, '[JWT]')
    .replace(/ntn_[A-Za-z0-9]{40,}/g, '[NOTION_KEY]')
    .replace(/xoxb-[A-Za-z0-9-]+/g, '[SLACK_TOKEN]');
}

// Core post: POST to Slack Web API
function _slackPost(method, payload) {
  return new Promise((resolve, reject) => {
    if (!SLACK_BOT_TOKEN) {
      console.warn('[slack] SLACK_BOT_TOKEN not set — message not sent');
      return resolve({ ok: false, error: 'no_token' });
    }
    const body = Buffer.from(JSON.stringify(payload));
    const req = https.request({
      hostname: 'slack.com',
      path: `/api/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Length': body.length,
      },
    }, res => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ ok: false, raw }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(new Error('slack_timeout')); });
    req.write(body);
    req.end();
  });
}

// Exponential backoff for 429 / 5xx
async function _postWithRetry(method, payload, maxRetries = 4) {
  let lastErr;
  for (let i = 0; i <= maxRetries; i++) {
    const result = await _slackPost(method, payload).catch(e => ({ ok: false, error: e.message }));
    if (result.ok) return result;
    const _retryable = new Set(['ratelimited', 'slack_timeout', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN']);
    if (_retryable.has(result.error)) {
      const wait = (result.error === 'ratelimited' && result.retry_after)
        ? result.retry_after * 1000
        : Math.pow(2, i) * 1000;
      console.warn(`[slack] retryable error (${result.error}), retry ${i + 1}/${maxRetries} in ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
      lastErr = result;
      continue;
    }
    // Non-retriable error
    console.warn('[slack] post error:', result.error, method);
    return result;
  }
  throw lastErr || new Error('slack post failed after retries');
}

// Send message to channel
async function postMessage(channel, text, blocks = null, threadTs = null) {
  const payload = { channel, text: _mask(text) };
  if (blocks) payload.blocks = blocks;
  if (threadTs) payload.thread_ts = threadTs;
  return _postWithRetry('chat.postMessage', payload);
}

// Send message to named channel (uses CHANNELS map)
async function postToChannel(channelKey, text, blocks = null, threadTs = null) {
  const channel = CHANNELS[channelKey];
  if (!channel) throw new Error(`Unknown channel key: ${channelKey}`);
  return postMessage(channel, text, blocks, threadTs);
}

// Post with dedup — key must be unique per event type
async function postDeduped(key, channelKey, text, blocks = null) {
  if (_isDup(key)) return { ok: true, deduped: true };
  return postToChannel(channelKey, text, blocks);
}

// Format helpers
function headerBlock(text) {
  return { type: 'header', text: { type: 'plain_text', text: String(text).slice(0, 150) } };
}

function sectionBlock(text) {
  return { type: 'section', text: { type: 'mrkdwn', text: _mask(String(text)).slice(0, 3000) } };
}

function fieldsBlock(fields) {
  return { type: 'section', fields: fields.map(f => ({ type: 'mrkdwn', text: _mask(String(f)).slice(0, 2000) })) };
}

function dividerBlock() {
  return { type: 'divider' };
}

function contextBlock(text) {
  return { type: 'context', elements: [{ type: 'mrkdwn', text: _mask(String(text)).slice(0, 3000) }] };
}

function actionButton(text, url) {
  return {
    type: 'actions',
    elements: [{ type: 'button', text: { type: 'plain_text', text }, url, action_id: `btn_${Date.now()}` }]
  };
}

module.exports = { CHANNELS, postMessage, postToChannel, postDeduped, headerBlock, sectionBlock, fieldsBlock, dividerBlock, contextBlock, actionButton };
