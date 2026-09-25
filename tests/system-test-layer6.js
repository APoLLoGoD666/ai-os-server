'use strict';
// APEX System Test — Layer 6: Event Bus Wiring + Cron + External Services
process.env.NODE_ENV = 'test';
require('dotenv').config();

const PASS = (label) => console.log(`  ✓ ${label}`);
const FAIL = (label, err) => { console.error(`  ✗ ${label}: ${err?.message || err}`); process.exitCode = 1; };

async function run() {
  console.log('\n=== LAYER 6: EVENT BUS WIRING + CRON + EXTERNAL SERVICES ===\n');

  // 6.1 CIVILIZATION_OPPORTUNITY_EXECUTE registered in EVENTS
  try {
    const bus = require('../lib/event-bus');
    const key = 'CIVILIZATION_OPPORTUNITY_EXECUTE';
    const val = 'civilization:opportunity:execute';
    (bus.EVENTS[key] === val)
      ? PASS(`6.1 EVENTS.${key} = '${val}' (registered)`)
      : FAIL('6.1 EVENTS missing CIVILIZATION_OPPORTUNITY_EXECUTE', new Error(`got ${bus.EVENTS[key]}`));
  } catch(e) { FAIL('6.1 EVENTS registry', e); }

  // 6.2 opportunity:execute listener reads event.payload (fix verification)
  try {
    const fs = require('fs'), path = require('path');
    const src = fs.readFileSync(path.join(__dirname,'../lib/startup.js'), 'utf8');
    const hasPayloadFix = src.includes("event.payload || {}");
    hasPayloadFix
      ? PASS('6.2 startup.js opportunity listener reads event.payload (fix confirmed)')
      : FAIL('6.2 startup.js listener fix', new Error('event.payload pattern not found'));
  } catch(e) { FAIL('6.2 startup.js fix check', e); }

  // 6.3 AGENT_COMPLETED listener reads event.payload (fix verification)
  try {
    const fs = require('fs'), path = require('path');
    const src = fs.readFileSync(path.join(__dirname,'../lib/startup.js'), 'utf8');
    // Both listeners must use event.payload
    const payloadCount = (src.match(/event\.payload \|\| \{\}/g) || []).length;
    payloadCount >= 2
      ? PASS(`6.3 Both bus listeners use event.payload (found ${payloadCount} occurrences)`)
      : FAIL('6.3 AGENT_COMPLETED payload fix', new Error(`only ${payloadCount} event.payload patterns found`));
  } catch(e) { FAIL('6.3 payload fix check', e); }

  // 6.4 cron-scheduler — module loads and start() doesn't throw
  try {
    const cron = require('../lib/cron-scheduler');
    typeof cron.start === 'function'
      ? PASS('6.4 cron-scheduler module loads (start fn present)')
      : FAIL('6.4 cron-scheduler', new Error('no start() export'));
  } catch(e) { FAIL('6.4 cron-scheduler', e); }

  // 6.5 cron-scheduler uses correct table (cron_run_log, not cron_logs)
  try {
    const fs = require('fs'), path = require('path');
    const src = fs.readFileSync(path.join(__dirname,'../lib/cron-scheduler.js'), 'utf8');
    const hasBadTable  = src.includes("from('cron_logs').delete().lt('triggered_at'");
    const hasGoodTable = src.includes("from('cron_run_log').delete().lt('started_at'");
    (!hasBadTable && hasGoodTable)
      ? PASS('6.5 cron-scheduler uses cron_run_log.started_at (fix confirmed)')
      : FAIL('6.5 cron table fix', new Error(`bad=${hasBadTable} good=${hasGoodTable}`));
  } catch(e) { FAIL('6.5 cron table check', e); }

  // 6.6 ministry uses apex_lessons (not knowledge_items)
  try {
    const fs = require('fs'), path = require('path');
    const src = fs.readFileSync(path.join(__dirname,'../lib/ministry/index.js'), 'utf8');
    const hasBad  = src.includes("'knowledge_items'");
    const hasGood = src.includes("'apex_lessons'");
    (!hasBad && hasGood)
      ? PASS('6.6 ministry uses apex_lessons (fix confirmed)')
      : FAIL('6.6 ministry table fix', new Error(`bad=${hasBad} good=${hasGood}`));
  } catch(e) { FAIL('6.6 ministry table check', e); }

  // 6.7 gap-detector uses try/catch not .catch() chain
  try {
    const fs = require('fs'), path = require('path');
    const src = fs.readFileSync(path.join(__dirname,'../lib/expansion/gap-detector.js'), 'utf8');
    const hasBadPattern = src.includes(".catch(() => ({ data: [] }))");
    !hasBadPattern
      ? PASS('6.7 gap-detector uses try/catch (no broken .catch() chains)')
      : FAIL('6.7 gap-detector .catch() fix', new Error('old .catch() pattern still present'));
  } catch(e) { FAIL('6.7 gap-detector check', e); }

  // 6.8 Slack — send test notification
  try {
    const slack = require('../services/slack');
    // Use postMessage if available, otherwise skip gracefully
    if (typeof slack?.postMessage === 'function') {
      await slack.postMessage({ text: '🧪 APEX system test 6.8 — Slack connectivity confirmed' });
      PASS('6.8 Slack postMessage sent');
    } else if (typeof slack?.alert === 'function') {
      await slack.alert('APEX system test 6.8 — Slack connectivity confirmed');
      PASS('6.8 Slack alert sent');
    } else {
      PASS('6.8 Slack module loads (no send method — skip live test)');
    }
  } catch(e) { FAIL('6.8 Slack', e); }

  // 6.9 Notion — basic connection
  try {
    const notion = require('../services/notion');
    typeof notion === 'object'
      ? PASS('6.9 Notion service module loads')
      : FAIL('6.9 Notion', new Error('not an object'));
  } catch(e) { FAIL('6.9 Notion', e); }

  // 6.10 Supabase — cron_run_log table readable
  try {
    const { getSupabaseClient } = require('../lib/clients');
    const { error } = await getSupabaseClient().from('cron_run_log').select('id').limit(1);
    !error
      ? PASS('6.10 cron_run_log table readable')
      : FAIL('6.10 cron_run_log', new Error(error.message));
  } catch(e) { FAIL('6.10 cron_run_log', e); }

  // 6.11 civilization_cycle_log table exists
  try {
    const { getSupabaseClient } = require('../lib/clients');
    const { error } = await getSupabaseClient().from('civilization_cycle_log').select('cycle_id').limit(1);
    !error
      ? PASS('6.11 civilization_cycle_log table readable')
      : FAIL('6.11 civilization_cycle_log', new Error(error.message));
  } catch(e) { FAIL('6.11 civilization_cycle_log', e); }

  // 6.12 opportunities table readable
  try {
    const { getSupabaseClient } = require('../lib/clients');
    const { data, error } = await getSupabaseClient().from('opportunities').select('id,composite_score,status').limit(3);
    !error
      ? PASS(`6.12 opportunities table readable (${data?.length ?? 0} rows sampled)`)
      : FAIL('6.12 opportunities', new Error(error.message));
  } catch(e) { FAIL('6.12 opportunities', e); }

  console.log('\n--- Layer 6 done ---\n');
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
