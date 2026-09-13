'use strict';
const https = require('https');

function _request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let msg = data;
          try { msg = JSON.parse(data).error?.message || data; } catch (_) {}
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

function _airtable(token, method, path, body) {
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const options = {
    hostname: 'api.airtable.com',
    path,
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    },
  };
  return _request(options, bodyStr);
}

module.exports = {
  slug: 'airtable',
  actions: {
    list_records: {
      description: 'List records from an Airtable table.',
      params: {
        table: { type: 'string', description: 'Table name.' },
        max_records: { type: 'integer', description: 'Max records to return (default 20).' },
      },
      required: ['table'],
      readOnly: true,
      async execute(params, creds) {
        const [token, baseId] = (creds.apiKey || '').split('|');
        const path = `/v0/${baseId}/${encodeURIComponent(params.table)}?maxRecords=${params.max_records || 20}`;
        const r = await _airtable(token, 'GET', path);
        return { records: r.records.map((rec) => ({ id: rec.id, fields: rec.fields })) };
      },
    },
    create_record: {
      description: 'Create a new record in an Airtable table.',
      params: {
        table: { type: 'string', description: 'Table name.' },
        fields: { type: 'object', description: 'Record fields as key-value pairs.' },
      },
      required: ['table', 'fields'],
      readOnly: false,
      async execute(params, creds) {
        const [token, baseId] = (creds.apiKey || '').split('|');
        const path = `/v0/${baseId}/${encodeURIComponent(params.table)}`;
        const r = await _airtable(token, 'POST', path, { fields: params.fields });
        return { id: r.id, fields: r.fields };
      },
    },
  },
};
