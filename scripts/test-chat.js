require('dotenv').config();
const https = require('https');

const APP_KEY = process.env.APP_ACCESS_KEY;
const BASE_URL = 'https://ai-os-server-jx20.onrender.com';
const CONV_ID = 'synthetic-test-' + Date.now();

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-app-key': APP_KEY,
        'x-conversation-id': CONV_ID,
        ...headers,
      },
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, raw: body }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('CONV_ID:', CONV_ID);
  const messages = [
    { label: 'Short (hey)', msg: 'hey' },
    { label: 'Medium (consolidation)', msg: 'explain how the APEX memory consolidation pipeline works end to end' },
    { label: 'Substantive (lesson)', msg: 'what are the key architectural patterns you follow when building reliable distributed systems?' },
  ];

  for (const { label, msg } of messages) {
    console.log(`\n=== ${label} ===`);
    try {
      const res = await post('/chat', { message: msg });
      const d = res.data;
      const pass = d && d.ok === true && d.reply && d.reply.length > 0 && d.response_mode;
      console.log(`${pass ? 'PASS' : 'FAIL'} status=${res.status} ok=${d?.ok} response_mode=${d?.response_mode} reply_len=${d?.reply?.length ?? 0} error=${d?.error || 'none'}`);
      if (!pass) console.log('  raw:', JSON.stringify(d).slice(0, 300));
    } catch (e) {
      console.log('FAIL error:', e.message);
    }
  }
}
main().catch(e => { console.error(e.message); process.exit(1); });
