'use strict';
const https = require('https');

function _request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 202 || res.statusCode === 204) {
          return resolve({ _statusCode: res.statusCode });
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let msg = data;
          try { msg = JSON.parse(data).errors?.[0]?.message || data; } catch (_) {}
          return reject(new Error(`HTTP ${res.statusCode}: ${msg}`));
        }
        try { resolve(JSON.parse(data)); } catch (_) { resolve({}); }
      });
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timed out')); });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function _sg(apiKey, method, path, body) {
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const options = {
    hostname: 'api.sendgrid.com',
    path,
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    },
  };
  return _request(options, bodyStr);
}

module.exports = {
  slug: 'sendgrid',
  actions: {
    send_email: {
      description: 'Send an email via SendGrid.',
      params: {
        to: { type: 'string', description: 'Recipient email address.' },
        from: { type: 'string', description: 'Sender email address (must be verified).' },
        subject: { type: 'string', description: 'Email subject.' },
        body: { type: 'string', description: 'Email body (plain text).' },
      },
      required: ['to', 'from', 'subject', 'body'],
      readOnly: false,
      async execute(params, creds) {
        const payload = {
          personalizations: [{ to: [{ email: params.to }] }],
          from: { email: params.from },
          subject: params.subject,
          content: [{ type: 'text/plain', value: params.body }],
        };
        await _sg(creds.apiKey, 'POST', '/v3/mail/send', payload);
        return { ok: true, to: params.to };
      },
    },
    get_stats: {
      description: 'Get SendGrid email stats for the last 7 days.',
      params: {},
      required: [],
      readOnly: true,
      async execute(params, creds) {
        const startDate = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const r = await _sg(creds.apiKey, 'GET', `/v3/stats?aggregated_by=day&limit=5&start_date=${startDate}`);
        if (Array.isArray(r) && r.length > 0) {
          const s = r[0].stats?.[0]?.metrics || {};
          return { requests: s.requests || 0, delivered: s.delivered || 0, opens: s.opens || 0 };
        }
        return { requests: 0, delivered: 0, opens: 0 };
      },
    },
  },
};
