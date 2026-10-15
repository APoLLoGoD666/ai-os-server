'use strict';
const https = require('https');

function _request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 204) return resolve({ _statusCode: 204 });
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

function _todoist(apiKey, method, path, body) {
  const bodyStr = body ? JSON.stringify(body) : undefined;
  const options = {
    hostname: 'api.todoist.com',
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
  slug: 'todoist',
  actions: {
    list_tasks: {
      description: 'List active Todoist tasks.',
      params: {},
      required: [],
      readOnly: true,
      async execute(params, creds) {
        const r = await _todoist(creds.apiKey, 'GET', '/rest/v2/tasks');
        return {
          tasks: r.map((t) => ({
            id: t.id,
            content: t.content,
            priority: t.priority,
            due: t.due?.string || null,
          })).slice(0, 30),
        };
      },
    },
    create_task: {
      description: 'Create a new Todoist task.',
      params: {
        content: { type: 'string', description: 'Task content/title.' },
        due_string: { type: 'string', description: 'Natural language due date (e.g. "tomorrow", "next Monday").' },
        priority: { type: 'integer', description: 'Priority 1-4 (4=very urgent).' },
      },
      required: ['content'],
      readOnly: false,
      async execute(params, creds) {
        const body = {
          content: params.content,
          ...(params.due_string ? { due_string: params.due_string } : {}),
          priority: params.priority || 1,
        };
        const r = await _todoist(creds.apiKey, 'POST', '/rest/v2/tasks', body);
        return { id: r.id, content: r.content, url: r.url };
      },
    },
    complete_task: {
      description: 'Mark a Todoist task as complete.',
      params: {
        task_id: { type: 'string', description: 'Task ID to mark complete.' },
      },
      required: ['task_id'],
      readOnly: false,
      async execute(params, creds) {
        await _todoist(creds.apiKey, 'POST', `/rest/v2/tasks/${params.task_id}/close`);
        return { ok: true };
      },
    },
  },
};
