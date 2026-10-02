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

function _linear(apiKey, query, variables) {
  const bodyStr = JSON.stringify({ query, variables });
  const options = {
    hostname: 'api.linear.app',
    path: '/graphql',
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    },
  };
  return _request(options, bodyStr).then((result) => {
    if (result.errors && result.errors.length) {
      throw new Error(result.errors[0].message);
    }
    return result;
  });
}

module.exports = {
  slug: 'linear',
  actions: {
    list_issues: {
      description: 'List issues for a Linear team.',
      params: {
        team_key: { type: 'string', description: 'Team key (e.g. ENG).' },
        limit: { type: 'integer', description: 'Max results (default 20).' },
      },
      required: ['team_key'],
      readOnly: true,
      async execute(params, creds) {
        const gql = `query($filter:IssueFilter $first:Int){issues(filter:$filter first:$first){nodes{id title state{name} priority url}}}`;
        const variables = {
          filter: { team: { key: { eq: params.team_key } } },
          first: Math.min(params.limit || 20, 50),
        };
        const r = await _linear(creds.apiKey, gql, variables);
        return { issues: r.data.issues.nodes };
      },
    },
    create_issue: {
      description: 'Create a new Linear issue.',
      params: {
        team_id: { type: 'string', description: 'Team ID (UUID).' },
        title: { type: 'string', description: 'Issue title.' },
        description: { type: 'string', description: 'Issue description (Markdown).' },
        priority: { type: 'integer', description: 'Priority 0-4 (0=no priority, 1=urgent).' },
      },
      required: ['team_id', 'title'],
      readOnly: false,
      async execute(params, creds) {
        const gql = `mutation($input:IssueCreateInput!){issueCreate(input:$input){issue{id title url}}}`;
        const variables = {
          input: {
            teamId: params.team_id,
            title: params.title,
            description: params.description || '',
            priority: params.priority || 0,
          },
        };
        const r = await _linear(creds.apiKey, gql, variables);
        return { id: r.data.issueCreate.issue.id, url: r.data.issueCreate.issue.url };
      },
    },
  },
};
