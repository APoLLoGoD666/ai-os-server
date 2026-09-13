require('dotenv').config();
const { getTriggeredRoles } = require('../lib/executive/trigger-evaluator');

async function main() {
  const tests = [
    { ctx: { deploymentPolicy: 'staged', complexity: 'standard', taskDescription: '' }, expect: ['cto'] },
    { ctx: { attempt: 3, complexity: 'standard', taskDescription: '' }, expect: ['coo'] },
    { ctx: { costUsd: 2.0, complexity: 'standard', taskDescription: '' }, expect: ['cfo'] },
    { ctx: { complexity: 'standard', taskDescription: 'develop a new growth strategy and roadmap for APEX' }, expect: ['cso', 'cgo'] },
    { ctx: { complexity: 'critical', taskDescription: 'security breach incident response' }, expect: ['cto', 'cro'] },
    { ctx: { complexity: 'standard', taskDescription: 'legal compliance audit for gdpr' }, expect: ['clo'] },
    { ctx: { complexity: 'standard', taskDescription: 'health recovery and cognitive load management' }, expect: ['cho'] },
  ];

  let passed = 0, failed = 0;
  for (const t of tests) {
    const result = await getTriggeredRoles(t.ctx);
    const pass = t.expect.every(e => result.includes(e));
    if (pass) passed++; else failed++;
    console.log(`${pass ? 'PASS' : 'FAIL'} expect=[${t.expect}] got=[${result}]`);
  }
  console.log(`\nTotal: ${passed} PASS, ${failed} FAIL`);
}
main().catch(e => { console.error(e.message); process.exit(1); });
