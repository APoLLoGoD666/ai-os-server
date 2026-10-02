'use strict';
// APEX System Test — Layer 5: Civilization Runtime (all 8 phases)
process.env.NODE_ENV = 'test';
require('dotenv').config();

const PASS = (label) => console.log(`  ✓ ${label}`);
const FAIL = (label, err) => { console.error(`  ✗ ${label}: ${err?.message || err}`); process.exitCode = 1; };

async function run() {
  console.log('\n=== LAYER 5: CIVILIZATION RUNTIME (8 phases) ===\n');
  console.log('    [NOTE] runOnce() calls Claude API — allow 60–120s\n');

  let result;
  try {
    const civ = require('../lib/intelligence/civilization-runtime');
    result = await civ.runOnce();
    if (!result?.phases) throw new Error('No phases in result');
    PASS(`5.0 runOnce() completed in ${result.durationMs}ms`);
  } catch(e) {
    FAIL('5.0 runOnce() crashed', e);
    console.log('\n--- Layer 5 aborted (runOnce failed) ---\n');
    return;
  }

  const phases = result.phases;

  // Phase 1: Observe
  try {
    const p = phases.observe;
    p?.status === 'ok'
      ? PASS(`5.1 Phase 1 Observe: ok (events=${p.output?.eventsDetected ?? 0})`)
      : FAIL(`5.1 Phase 1 Observe: ${p?.status}`, new Error(p?.error || 'unknown'));
  } catch(e) { FAIL('5.1 Observe', e); }

  // Phase 2: Analyze
  try {
    const p = phases.analyze;
    p?.status === 'ok'
      ? PASS(`5.2 Phase 2 Analyze: ok (health=${p.output?.health?.score}, opps=${p.output?.opportunitiesFound})`)
      : FAIL(`5.2 Phase 2 Analyze: ${p?.status}`, new Error(p?.error || 'unknown'));
  } catch(e) { FAIL('5.2 Analyze', e); }

  // Phase 3: Deliberate (ok or skipped both pass)
  try {
    const p = phases.deliberate;
    ['ok','skipped'].includes(p?.status)
      ? PASS(`5.3 Phase 3 Deliberate: ${p.status}${p.status==='skipped'?' ('+p.reason+')':''}`)
      : FAIL(`5.3 Phase 3 Deliberate: ${p?.status}`, new Error(p?.error || 'unknown'));
  } catch(e) { FAIL('5.3 Deliberate', e); }

  // Phase 4: Plan (ok or skipped)
  try {
    const p = phases.plan;
    ['ok','skipped'].includes(p?.status)
      ? PASS(`5.4 Phase 4 Plan: ${p.status}`)
      : FAIL(`5.4 Phase 4 Plan: ${p?.status}`, new Error(p?.error || 'unknown'));
  } catch(e) { FAIL('5.4 Plan', e); }

  // Phase 5: Execute
  try {
    const p = phases.execute;
    p?.status === 'ok'
      ? PASS(`5.5 Phase 5 Execute: ok (tasksQueued=${p.output?.tasksQueued ?? 0})`)
      : FAIL(`5.5 Phase 5 Execute: ${p?.status}`, new Error(p?.error || 'unknown'));
  } catch(e) { FAIL('5.5 Execute', e); }

  // Phase 6: Learn
  try {
    const p = phases.learn;
    p?.status === 'ok'
      ? PASS(`5.6 Phase 6 Learn: ok (lesson=${p.output?.lessonPersisted}, reflexion=${p.output?.reflexionPersisted})`)
      : FAIL(`5.6 Phase 6 Learn: ${p?.status}`, new Error(p?.error || 'unknown'));
  } catch(e) { FAIL('5.6 Learn', e); }

  // Phase 7: Housekeeping
  try {
    const p = phases.housekeeping;
    p?.status === 'ok'
      ? PASS(`5.7 Phase 7 Housekeeping: ok (dismissed=${p.output?.dismissed ?? 0})`)
      : FAIL(`5.7 Phase 7 Housekeeping: ${p?.status}`, new Error(p?.error || 'unknown'));
  } catch(e) { FAIL('5.7 Housekeeping', e); }

  // Phase 8: Update Memory
  try {
    const p = phases.update_memory;
    p?.status === 'ok'
      ? PASS(`5.8 Phase 8 UpdateMemory: ok`)
      : FAIL(`5.8 Phase 8 UpdateMemory: ${p?.status}`, new Error(p?.error || 'unknown'));
  } catch(e) { FAIL('5.8 UpdateMemory', e); }

  // 5.9 civilization_cycle_log row upserted (upsert is fire-and-forget; wait 3s)
  try {
    await new Promise(r => setTimeout(r, 3000));
    const { getSupabaseClient } = require('../lib/clients');
    const { data } = await getSupabaseClient()
      .from('civilization_cycle_log')
      .select('cycle_id,health_score,duration_ms')
      .eq('cycle_id', result.cycleId)
      .single();
    data?.cycle_id
      ? PASS(`5.9 civilization_cycle_log upserted (health=${data.health_score}, ${data.duration_ms}ms)`)
      : FAIL('5.9 cycle_log row missing', new Error(`no row found for cycleId=${result.cycleId}`));
  } catch(e) { FAIL('5.9 civilization_cycle_log', e); }

  // 5.10 Phase 5 threshold — verify broadened filter logic
  try {
    const fs = require('fs');
    const src = fs.readFileSync(require('path').join(__dirname,'../lib/intelligence/civilization-runtime.js'), 'utf8');
    const hasThisWeek = src.includes("roi_forecast?.urgency === 'this_week'");
    const hasLoweredThreshold = src.includes('0.65');
    hasThisWeek && hasLoweredThreshold
      ? PASS('5.10 Phase 5 broadened filter confirmed in source (this_week + 0.65)')
      : FAIL('5.10 Phase 5 filter', new Error(`this_week=${hasThisWeek}, 0.65=${hasLoweredThreshold}`));
  } catch(e) { FAIL('5.10 Phase 5 filter check', e); }

  console.log('\n--- Layer 5 done ---\n');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
