'use strict';
// APEX System Test — Layer 2: Constitution / Access Control / Attention
process.env.NODE_ENV = 'test';
require('dotenv').config();

const PASS = (label) => console.log(`  ✓ ${label}`);
const FAIL = (label, err) => { console.error(`  ✗ ${label}: ${err?.message || err}`); process.exitCode = 1; };

async function run() {
  console.log('\n=== LAYER 2: CONSTITUTION / ACCESS CONTROL / ATTENTION ===\n');

  // 2.1 Watchdog tick
  try {
    const wd = require('../lib/constitution/watchdog');
    wd.start();
    await wd.tick();
    const a = wd.getLastAssessment();
    a && !a.tickFailed ? PASS('2.1 Watchdog tick completes, assessment populated') : FAIL('2.1 Watchdog', new Error(`assessment=${JSON.stringify(a)}`));
  } catch(e) { FAIL('2.1 Watchdog', e); }

  // 2.2 Constitutional gate — evaluate() callable, returns verdict field
  try {
    const gate = require('../lib/runtime/constitutional-gate');
    const r = gate.evaluate(
      { metadata: { path: '/api/status' } },
      { healthState: { components: { certification: { lastResult: true } } }, driftResult: { driftItems: [] } }
    );
    typeof r.verdict === 'string'
      ? PASS(`2.2 Gate evaluate() callable (verdict=${r.verdict}, riskScore=${r.riskScore})`)
      : FAIL('2.2 Gate evaluate', new Error('no verdict field'));
  } catch(e) { FAIL('2.2 Gate evaluate', e); }

  // 2.3 Risk monitor — cert.lastResult=true → NO certification_never_run factor
  try {
    const rm = require('../lib/constitution/risk-monitor');
    const r = rm.assessRisk({
      healthState: { components: { certification: { lastResult: true } } },
      driftResult: { driftItems: [] },
    });
    const certFactor = r.factors?.certification_never_run || 0;
    certFactor === 0
      ? PASS(`2.3 Risk monitor: lastResult=true → cert_never_run=0, score=${r.score}, level=${r.level}`)
      : FAIL('2.3 Risk monitor cert factor', new Error(`certification_never_run=${certFactor} (should be 0)`));
  } catch(e) { FAIL('2.3 Risk monitor cert', e); }

  // 2.4 Access controller — all new SYSTEM entities resolve correctly
  try {
    const AC = require('../lib/memory/access-controller');
    const ac = new AC();
    const systemEntities = ['civilization_runtime','civilization-kernel','cron','ministry','system','tool','chat-context','agent_completion'];
    for (const id of systemEntities) {
      // Layer 5 WRITE must not throw for SYSTEM class
      ac.check(id, [5], 'WRITE');
    }
    PASS(`2.4 All 8 new SYSTEM entities can WRITE layer 5`);
  } catch(e) { FAIL('2.4 Access controller SYSTEM entities', e); }

  // 2.5 Layer 5 AGENT cannot WRITE
  try {
    const AC = require('../lib/memory/access-controller');
    const ac = new AC();
    let threw = false;
    try { ac.check('developer_agent', [5], 'WRITE'); } catch { threw = true; }
    threw ? PASS('2.5 AGENT blocked from layer 5 WRITE (correct)') : FAIL('2.5 Layer 5 AGENT WRITE should be denied', new Error('no error thrown'));
  } catch(e) { FAIL('2.5 Layer 5 AGENT block', e); }

  // 2.6 Layer 11 AGENT can READ but not WRITE
  try {
    const AC = require('../lib/memory/access-controller');
    const ac = new AC();
    // READ should pass
    ac.check('developer_agent', [11], 'READ');
    // WRITE should fail
    let threw = false;
    try { ac.check('developer_agent', [11], 'WRITE'); } catch { threw = true; }
    threw ? PASS('2.6 AGENT can READ layer 11 but not WRITE') : FAIL('2.6 Layer 11 AGENT WRITE should be denied', new Error('no error thrown'));
  } catch(e) { FAIL('2.6 Layer 11 access', e); }

  // 2.7 Attention engine — MEDIUM tier with memoryRelevance=0.5 (returns object with .score)
  try {
    const attn = require('../lib/attention/attention-engine');
    const result = attn.score({
      goalPriority:       0.5,
      risk:               0.3,
      financialWeight:    0.2,
      memoryRelevance:    0.5,
      urgency:            0.3,
      cognitiveConfidence:0.4,
    });
    const numericScore = typeof result === 'number' ? result : result?.score;
    const MEDIUM_THRESHOLD = 0.35;
    numericScore >= MEDIUM_THRESHOLD
      ? PASS(`2.7 Attention score ${numericScore.toFixed(3)} ≥ MEDIUM threshold ${MEDIUM_THRESHOLD}`)
      : FAIL('2.7 Attention score below MEDIUM', new Error(`score=${numericScore}`));
  } catch(e) { FAIL('2.7 Attention engine', e); }

  // 2.8 Risk monitor — cert.lastResult=false → certification_failed factor fires
  try {
    const rm = require('../lib/constitution/risk-monitor');
    const r = rm.assessRisk({
      healthState: { components: { certification: { lastResult: false } } },
      driftResult: { driftItems: [] },
    });
    ['WARNING','ELEVATED','CRITICAL'].includes(r.level)
      ? PASS(`2.8 Risk monitor: lastResult=false → level=${r.level}, score=${r.score}`)
      : FAIL('2.8 Risk monitor degraded state', new Error(`level=${r.level}`));
  } catch(e) { FAIL('2.8 Risk monitor', e); }

  console.log('\n--- Layer 2 done ---\n');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
