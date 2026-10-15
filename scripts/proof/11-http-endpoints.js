'use strict';
require('dotenv').config();
const https = require('https');

const BASE = 'https://ai-os-server-jx20.onrender.com';
const KEY  = process.env.APP_ACCESS_KEY;
const CRON = process.env.CRON_SECRET;

function req(method, path, body, headers={}) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const h = { 'Content-Type':'application/json', ...headers };
    if (data) h['Content-Length'] = Buffer.byteLength(data);
    const opts = { hostname:'ai-os-server-jx20.onrender.com', path, method, headers:h, timeout:20000 };
    const r = https.request(opts, res => {
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{ try{resolve({s:res.statusCode,b:JSON.parse(d)});}catch{resolve({s:res.statusCode,b:{_raw:d.slice(0,100)}});} });
    });
    r.on('error', e=>resolve({s:0,b:{error:e.message}}));
    r.on('timeout',()=>resolve({s:0,b:{error:'timeout'}}));
    if (data) r.write(data);
    r.end();
  });
}

const TESTS = [
  { name:'GET /health',                   method:'GET',  path:'/health',                                      headers:{},           check:r=>r.s===200&&r.b.status==='ok'&&r.b.db===true },
  { name:'GET /api/intelligence/self-check', method:'GET', path:'/api/intelligence/self-check',               headers:{'x-app-key':KEY}, check:r=>r.s===200&&r.b.score>=80 },
  { name:'POST /chat short',              method:'POST', path:'/chat',                                        headers:{'x-app-key':KEY}, body:{message:'hi'},            check:r=>r.s===200&&r.b.ok===true&&r.b.reply?.length>0 },
  { name:'POST /chat substantive',        method:'POST', path:'/chat',                                        headers:{'x-app-key':KEY}, body:{message:'explain how APEX memory consolidation works, what layers exist, and how lessons are learned and promoted'}, check:r=>r.s===200&&r.b.ok===true&&r.b.reply?.length>100 },
  { name:'GET /api/tasks',                method:'GET',  path:'/api/tasks',                                   headers:{'x-app-key':KEY}, check:r=>r.s===200 },
  { name:'GET /api/cognitive-evolution/benchmark/history', method:'GET', path:'/api/cognitive-evolution/benchmark/history?limit=1', headers:{'x-app-key':KEY}, check:r=>r.s===200&&r.b.ok===true },
  { name:'GET /api/governance/probe/latest', method:'GET', path:'/api/governance/probe/latest',               headers:{'x-app-key':KEY}, check:r=>r.s===200&&r.b.ok===true },
  { name:'GET /api/notifications',        method:'GET',  path:'/api/notifications',                           headers:{'x-app-key':KEY}, check:r=>r.s===200 },
  { name:'CRON blocked without secret',   method:'POST', path:'/cron/run-schedules',                          headers:{},           check:r=>r.s===401||r.s===403 },
  { name:'CRON runs with secret',         method:'POST', path:'/cron/run-schedules',                          headers:{'x-cron-secret':CRON}, check:r=>r.s===200||r.s===204 },
];

(async () => {
  let pass=0, fail=0;
  for (const t of TESTS) {
    const r = await req(t.method, t.path, t.body, t.headers);
    const ok = t.check(r);
    console.log(`${ok?'[PASS]':'[FAIL]'} ${t.name} → HTTP ${r.s}${!ok?' body='+JSON.stringify(r.b).slice(0,80):''}`);
    ok?pass++:fail++;
  }
  console.log(`\nHTTP Endpoints: ${pass}/${TESTS.length} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
