'use strict';

const https = require('https');

function _api(token, method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'slack.com',
      path: apiPath,
      method,
      timeout: 10_000,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
        ...(payload && { 'Content-Length': Buffer.byteLength(payload) }),
      },
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Slack HTTP ${res.statusCode}: ${raw}`));
        }
        let result;
        try { result = JSON.parse(raw); } catch { return reject(new Error('Invalid JSON from Slack')); }
        if (!result.ok) return reject(new Error(`Slack API error: ${result.error}`));
        resolve(result);
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Slack request timed out')); });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = {
  slug: 'slack',
  actions: {
    send_message: {
      description: 'Send a message to a Slack channel.',
      params: {
        channel: { type: 'string', description: 'Channel ID or name (e.g. #general).' },
        text:    { type: 'string', description: 'Message text to send.' },
      },
      required: ['channel', 'text'],
      readOnly: false,
      async execute({ channel, text }, { apiKey }) {
        const r = await _api(apiKey, 'POST', '/api/chat.postMessage', { channel, text });
        return { ok: r.ok, ts: r.ts, channel: r.channel };
      },
    },

    list_channels: {
      description: 'List public Slack channels.',
      params: {},
      required: [],
      readOnly: true,
      async execute(_params, { apiKey }) {
        const r = await _api(apiKey, 'GET', '/api/conversations.list?types=public_channel&limit=100');
        return { channels: (r.channels || []).map(c => ({ id: c.id, name: c.name })) };
      },
    },

    get_messages: {
      description: 'Fetch recent messages from a Slack channel.',
      params: {
        channel: { type: 'string',  description: 'Channel ID to fetch messages from.' },
        limit:   { type: 'integer', description: 'Number of messages to return (max 20).' },
      },
      required: ['channel'],
      readOnly: true,
      async execute({ channel, limit }, { apiKey }) {
        const n = Math.min(limit || 10, 20);
        const r = await _api(apiKey, 'GET', `/api/conversations.history?channel=${encodeURIComponent(channel)}&limit=${n}`);
        return { messages: (r.messages || []).map(m => ({ ts: m.ts, text: m.text, user: m.user })) };
      },
    },
  },
};
