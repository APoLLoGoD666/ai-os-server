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
          try { msg = JSON.parse(data).message || data; } catch (_) {}
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

function _notion(apiKey, method, path, body) {
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const options = {
    hostname: 'api.notion.com',
    path,
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
      ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
    },
  };
  return _request(options, bodyStr);
}

module.exports = {
  slug: 'notion',
  actions: {
    search: {
      description: 'Search Notion pages and databases.',
      params: {
        query: { type: 'string', description: 'Text to search for.' },
      },
      required: ['query'],
      readOnly: true,
      async execute(params, creds) {
        const r = await _notion(creds.apiKey, 'POST', '/v1/search', { query: params.query });
        return {
          results: r.results.map((p) => ({
            id: p.id,
            title:
              p.properties?.title?.title?.[0]?.plain_text ||
              p.properties?.Name?.title?.[0]?.plain_text ||
              '(untitled)',
            url: p.url,
          })),
        };
      },
    },
    create_page: {
      description: 'Create a new Notion page.',
      params: {
        parent_id: { type: 'string', description: 'Parent page or database ID.' },
        title: { type: 'string', description: 'Page title.' },
        content: { type: 'string', description: 'Optional page body text.' },
      },
      required: ['parent_id', 'title'],
      readOnly: false,
      async execute(params, creds) {
        const body = {
          parent: { page_id: params.parent_id },
          properties: { title: { title: [{ text: { content: params.title } }] } },
          children: params.content
            ? [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: params.content } }] } }]
            : [],
        };
        const r = await _notion(creds.apiKey, 'POST', '/v1/pages', body);
        return { id: r.id, url: r.url };
      },
    },
  },
};
