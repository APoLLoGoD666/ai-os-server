'use strict';
require('dotenv').config();
const fs = require('fs');

let pass=0, fail=0;

// Cron scheduler checks (static analysis)
const cronCode = fs.readFileSync('./lib/cron-scheduler.js','utf8');
const checks = {
  'crons default ON':         cronCode.includes("?? 'true'") && cronCode.includes("!== 'false'"),
  'consolidation scheduled':  /consolidat/i.test(cronCode),
  'adaptation scheduled':     /adaptation/i.test(cronCode),
  'knowledge-validator scheduled': /knowledge.valid/i.test(cronCode),
};
for (const [k,v] of Object.entries(checks)) {
  console.log(`${v?'[PASS]':'[FAIL]'} CRON: ${k}`);
  v?pass++:fail++;
}

// Skill memory
(async()=>{
  try {
    const sm = require('../../lib/memory/skill-memory');
    const r = await sm.recordExecution('proof-skill','synthetic_run',true,{source:'proof'});
    console.log(`${r!==null?'[PASS]':'[FAIL]'} SKILL recordExecution — ${JSON.stringify(r)?.slice(0,60)}`);
    r!==null?pass++:fail++;
  } catch(e) { console.log(`[FAIL] SKILL recordExecution — ${e.message}`); fail++; }

  try {
    const pm = require('../../lib/memory/procedural-memory');
    const procs = await pm.findProcedure('proof',null,5);
    console.log(`${Array.isArray(procs)?'[PASS]':'[FAIL]'} PROCEDURAL findProcedure — count=${procs?.length}`);
    Array.isArray(procs)?pass++:fail++;
  } catch(e) { console.log(`[FAIL] PROCEDURAL findProcedure — ${e.message}`); fail++; }

  console.log(`\nCron+Skill: ${pass} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
