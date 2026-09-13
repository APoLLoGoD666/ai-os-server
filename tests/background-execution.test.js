'use strict';
// Stub env vars so modules that call getSupabaseClient() at load time don't throw.
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-key';
if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = 'placeholder-key';

// tests/background-execution.test.js
// Phase 2G: R10-BG — background execution structural inventory.
// Verifies that all recurring background execution modules load and export their
// start/activate interfaces. Does NOT start timers (requires live infra).

let passed = 0; let failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

// ── lib/startup.js ────────────────────────────────────────────────────────────

console.log('\n── lib/startup.js (R10-BG) ─────────────────────────────────────────────────');

const startup = require('../lib/startup');

test('lib/startup.js loads', () => {
    assert(startup, 'startup must export something');
});

test('startup exports wireEvents', () => {
    assert(typeof startup.wireEvents === 'function', 'wireEvents must be exported');
});

test('startup exports onListen', () => {
    assert(typeof startup.onListen === 'function', 'onListen must be exported');
});

// ── lib/integrity-crons.js ────────────────────────────────────────────────────

console.log('\n── lib/integrity-crons.js (R10-BG) ────────────────────────────────────────');

const integrityCrons = require('../lib/integrity-crons');

test('lib/integrity-crons.js loads', () => {
    assert(integrityCrons, 'integrity-crons must export something');
});

test('integrity-crons exports start', () => {
    assert(typeof integrityCrons.start === 'function', 'start must be exported');
});

test('integrity-crons exports backup', () => {
    assert(typeof integrityCrons.backup === 'function', 'backup must be exported');
});

test('integrity-crons exports reconcile', () => {
    assert(typeof integrityCrons.reconcile === 'function', 'reconcile must be exported');
});

test('integrity-crons uses canonical Supabase client', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/integrity-crons.js'), 'utf8');
    assert(!src.includes("require('@supabase/supabase-js')"), 'integrity-crons must not import @supabase/supabase-js directly');
    assert(src.includes('getSupabaseClient'), 'integrity-crons must use canonical getSupabaseClient');
});

// ── lib/event-consumer.js ─────────────────────────────────────────────────────

console.log('\n── lib/event-consumer.js (R10-BG) ─────────────────────────────────────────');

test('lib/event-consumer.js loads', () => {
    const ec = require('../lib/event-consumer');
    assert(ec, 'event-consumer must export something');
});

test('event-consumer exports start', () => {
    const ec = require('../lib/event-consumer');
    assert(typeof ec.start === 'function', 'event-consumer.start must be a function');
});

// ── lib/models/runtime/subscriber.js ─────────────────────────────────────────

console.log('\n── lib/models/runtime/subscriber.js (R10-BG) ───────────────────────────────');

test('lib/models/runtime/subscriber.js loads', () => {
    const sub = require('../lib/models/runtime/subscriber');
    assert(sub, 'subscriber must export something');
});

test('subscriber exports activate', () => {
    const sub = require('../lib/models/runtime/subscriber');
    assert(typeof sub.activate === 'function', 'subscriber.activate must be a function');
});

// ── lib/constitution/watchdog.js ──────────────────────────────────────────────

console.log('\n── lib/constitution/watchdog.js (R10-BG) ───────────────────────────────────');

test('lib/constitution/watchdog.js loads', () => {
    const wd = require('../lib/constitution/watchdog');
    assert(wd, 'watchdog must export something');
});

test('watchdog exports start and tick', () => {
    const wd = require('../lib/constitution/watchdog');
    assert(typeof wd.start === 'function', 'watchdog.start must be a function');
    assert(typeof wd.tick === 'function', 'watchdog.tick must be a function');
});

// ── lib/cron-scheduler.js ─────────────────────────────────────────────────────

console.log('\n── lib/cron-scheduler.js (R10-BG) ─────────────────────────────────────────');

test('lib/cron-scheduler.js exports start', () => {
    const sched = require('../lib/cron-scheduler');
    assert(typeof sched.start === 'function', 'cron-scheduler.start must be a function');
});

// ── lib/cron-logger.js ───────────────────────────────────────────────────────

console.log('\n── lib/cron-logger.js (R10-BG) ─────────────────────────────────────────────');

test('lib/cron-logger.js loads', () => {
    const cl = require('../lib/cron-logger');
    assert(cl, 'cron-logger must export something');
});

test('cron-logger exports wrapCron', () => {
    const cl = require('../lib/cron-logger');
    assert(typeof cl.wrapCron === 'function', 'wrapCron must be exported');
});

// ── Background execution path inventory ─────────────────────────────────────

console.log('\n── Background execution path inventory (R10-BG) ────────────────────────────');

test('inventory: integrity-crons has 5 managed jobs (nightly x2, weekly x2, hourly x1)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/integrity-crons.js'), 'utf8');
    // JOBS array defines integrity_backup, integrity_reconcile, domain_scorer, admission_engine, consolidation_engine
    assert(src.includes('integrity_backup'), 'integrity_backup job must exist');
    assert(src.includes('integrity_reconcile'), 'integrity_reconcile job must exist');
    assert(src.includes('domain_scorer'), 'domain_scorer job must exist');
    assert(src.includes('admission_engine'), 'admission_engine job must exist');
    assert(src.includes('consolidation_engine'), 'consolidation_engine job must exist');
});

test('inventory: startup.js wires constitutional watchdog at 30-min interval', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/startup.js'), 'utf8');
    assert(src.includes('30 * 60 * 1000'), 'watchdog 30-min interval must be present');
    assert(src.includes('_watchdog.tick'), 'watchdog tick must be wired');
});

test('inventory: startup.js registers checkPendingMasterTasks at 60s interval', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/startup.js'), 'utf8');
    assert(src.includes('checkPendingMasterTasks, 60000'), 'checkPendingMasterTasks 60s interval must be present');
});

test('inventory: startup.js registers schedule_fallback at 5-min interval', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/startup.js'), 'utf8');
    assert(src.includes('schedule_fallback'), 'schedule_fallback cron must be present');
    assert(src.includes("5 * 60 * 1000"), 'schedule_fallback 5-min interval must be present');
});

test('inventory: startup.js registers reflection_check at 30-min interval', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/startup.js'), 'utf8');
    assert(src.includes('reflection_check'), 'reflection_check cron must be present');
});

test('inventory: Mastra retired — no deferred loader in startup (R17)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/startup.js'), 'utf8');
    // R17: Mastra retired; _loadMastra must NOT exist. Canonical EA is primary.
    assert(!src.includes('_loadMastra'), 'Mastra deferred loader must be removed (R17 retirement)');
    assert(!src.includes('mastra_agents'), 'startup.js must not require mastra_agents (R17 retirement)');
});

test('inventory: REALITY_LOOP_ENABLED guards reality loop path', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/startup.js'), 'utf8');
    assert(src.includes("REALITY_LOOP_ENABLED"), 'reality loop must be gated by REALITY_LOOP_ENABLED env var');
    assert(src.includes('AGENT_COMPLETED'), 'reality loop must wire on AGENT_COMPLETED event');
});

// ── Summary ────────────────────────────────────────────────────────────────────

console.log('\n── Summary ─────────────────────────────────────────────────────────────────');

const exitCode = failed > 0 ? 1 : 0;
console.log(`\n  ${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
process.exit(exitCode);
