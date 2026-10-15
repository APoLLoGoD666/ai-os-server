'use strict';

const https = require('https');

function _gh(apiKey, method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method,
      timeout: 10_000,
      headers: {
        Authorization: `token ${apiKey}`,
        'User-Agent': 'APEX',
        Accept: 'application/vnd.github+json',
        ...(payload && { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }),
      },
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          let msg = raw;
          try { msg = JSON.parse(raw).message || raw; } catch {}
          return reject(new Error(`GitHub ${res.statusCode}: ${msg}`));
        }
        try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON from GitHub')); }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('GitHub request timed out')); });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = {
  slug: 'github',
  actions: {
    create_issue: {
      description: 'Create a new issue in a GitHub repository.',
      params: {
        owner: { type: 'string', description: 'Repository owner (user or org).' },
        repo:  { type: 'string', description: 'Repository name.' },
        title: { type: 'string', description: 'Issue title.' },
        body:  { type: 'string', description: 'Issue body text (Markdown).' },
      },
      required: ['owner', 'repo', 'title'],
      readOnly: false,
      async execute({ owner, repo, title, body }, { apiKey }) {
        const r = await _gh(apiKey, 'POST', `/repos/${owner}/${repo}/issues`, { title, body });
        return { number: r.number, url: r.html_url, title: r.title };
      },
    },

    list_issues: {
      description: 'List open issues for a GitHub repository.',
      params: {
        owner: { type: 'string', description: 'Repository owner (user or org).' },
        repo:  { type: 'string', description: 'Repository name.' },
      },
      required: ['owner', 'repo'],
      readOnly: true,
      async execute({ owner, repo }, { apiKey }) {
        const r = await _gh(apiKey, 'GET', `/repos/${owner}/${repo}/issues?state=open&per_page=20`);
        return { issues: r.map(i => ({ number: i.number, title: i.title, state: i.state, url: i.html_url })) };
      },
    },

    create_comment: {
      description: 'Add a comment to an existing GitHub issue.',
      params: {
        owner:        { type: 'string',  description: 'Repository owner.' },
        repo:         { type: 'string',  description: 'Repository name.' },
        issue_number: { type: 'integer', description: 'Issue number to comment on.' },
        body:         { type: 'string',  description: 'Comment body text (Markdown).' },
      },
      required: ['owner', 'repo', 'issue_number', 'body'],
      readOnly: false,
      async execute({ owner, repo, issue_number, body }, { apiKey }) {
        const r = await _gh(apiKey, 'POST', `/repos/${owner}/${repo}/issues/${issue_number}/comments`, { body });
        return { id: r.id, url: r.html_url };
      },
    },

    get_file: {
      description: 'Fetch and decode a file from a GitHub repository.',
      params: {
        owner:     { type: 'string', description: 'Repository owner.' },
        repo:      { type: 'string', description: 'Repository name.' },
        file_path: { type: 'string', description: 'Path to the file within the repository.' },
      },
      required: ['owner', 'repo', 'file_path'],
      readOnly: true,
      async execute({ owner, repo, file_path }, { apiKey }) {
        const r = await _gh(apiKey, 'GET', `/repos/${owner}/${repo}/contents/${file_path}`);
        const content = Buffer.from(r.content, 'base64').toString('utf8');
        return { name: r.name, content, sha: r.sha, size: r.size };
      },
    },
  },
};
