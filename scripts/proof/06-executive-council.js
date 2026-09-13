'use strict';
require('dotenv').config();
const { getTriggeredRoles } = require('../../lib/executive/trigger-evaluator');
const registry = require('../../lib/executive/registry');

const TESTS = [
  { label:'CTO staged deploy',  ctx:{ deploymentPolicy:'staged', complexity:'standard', taskDescription:'' }, must:['cto'] },
  { label:'COO retry>2',        ctx:{ attempt:3, complexity:'standard', taskDescription:'' }, must:['coo'] },
  { label:'CFO cost>1.50',      ctx:{ costUsd:2.0, complexity:'standard', taskDescription:'' }, must:['cfo'] },
  { label:'CSO strategy',       ctx:{ complexity:'standard', taskDescription:'define a new strategic roadmap and vision and direction for APEX priorities' }, must:['cso'] },
  { label:'CIO memory policy',  ctx:{ complexity:'standard', taskDescription:'update cognitive policy and memory retention learning rate knowledge decay benchmark' }, must:['cio'] },
  { label:'CGO growth',         ctx:{ complexity:'standard', taskDescription:'experiment with new capability to expand and grow opportunity' }, must:['cgo'] },
  { label:'CRO critical risk',  ctx:{ complexity:'critical', taskDescription:'security breach incident outage threat vulnerability' }, must:['cro'] },
  { label:'CHO health',         ctx:{ complexity:'standard', taskDescription:'cognitive load wellbeing health recovery burnout fatigue management' }, must:['cho'] },
  { label:'CLO compliance',     ctx:{ complexity:'standard', taskDescription:'gdpr legal compliance audit contract regulation privacy' }, must:['clo'] },
];

(async () => {
  let pass=0, fail=0;

  for (const t of TESTS) {
    const roles = await getTriggeredRoles(t.ctx);
    const ok = t.must.every(r => roles.includes(r));
    console.log(`${ok?'[PASS]':'[FAIL]'} TRIGGER ${t.label} — expect⊆[${t.must}] got=[${roles}]`);
    ok?pass++:fail++;
  }

  // Registry check
  const all9 = ['cto','coo','cfo','cso','cio','cgo','cro','cho','clo'];
  const regOk = all9.every(r => registry.ENTITIES?.[r]);
  console.log(`${regOk?'[PASS]':'[FAIL]'} REGISTRY all 9 executives defined`);
  regOk?pass++:fail++;

  console.log(`\nExecutive Council: ${pass}/${TESTS.length+1} pass, ${fail} fail`);
  process.exit(fail>0?1:0);
})();
