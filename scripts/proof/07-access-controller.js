'use strict';
require('dotenv').config();
const AccessController = require('../../lib/memory/access-controller');
const ctrl = new AccessController();

const TESTS = [
  { entity:'orchestrator', layers:[10,11], op:'READ',  expect:'pass', label:'SYSTEM reads L10/L11' },
  { entity:'orchestrator', layers:[5],     op:'WRITE', expect:'pass', label:'SYSTEM writes L5' },
  { entity:'orchestrator', layers:[1],     op:'WRITE', expect:'pass', label:'SYSTEM writes L1' },
  { entity:'orchestrator', layers:[9],     op:'WRITE', expect:'pass', label:'SYSTEM writes L9' },
  { entity:'agent',        layers:[9,10],  op:'READ',  expect:'pass', label:'AGENT reads L9/L10' },
  { entity:'api_client',   layers:[9],     op:'READ',  expect:'pass', label:'API_CLIENT reads L9' },
  { entity:'agent',        layers:[0],     op:'READ',  expect:'fail', label:'AGENT blocked from L0' },
  { entity:'api_client',   layers:[0],     op:'WRITE', expect:'fail', label:'API_CLIENT blocked from L0 write' },
  { entity:'agent',        layers:[5],     op:'WRITE', expect:'fail', label:'AGENT blocked from L5 write' },
];

let pass=0, fail=0;
for (const t of TESTS) {
  try {
    ctrl.check(t.entity, t.layers, t.op);
    const ok = t.expect === 'pass';
    console.log(`${ok?'[PASS]':'[FAIL]'} ACL ${t.label} — allowed`);
    ok?pass++:fail++;
  } catch(e) {
    const ok = t.expect === 'fail';
    console.log(`${ok?'[PASS]':'[FAIL]'} ACL ${t.label} — blocked: ${e.message.slice(0,55)}`);
    ok?pass++:fail++;
  }
}
console.log(`\nAccess Controller: ${pass}/${TESTS.length} pass, ${fail} fail`);
process.exit(fail>0?1:0);
