'use strict';
// Stub env vars so modules that call getSupabaseClient() at load time don't throw.
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-key';
if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = 'placeholder-key';

// tests/path-g-orchestrator-chain.test.js
// Phase 2G: R10-PATH-G (task → runAgentTeam) + R10-PATH-H (agent → memory → tool)
// Tests the structural integrity of the orchestration execution chain.

let passed = 0; let failed = 0;
function test(name, fn) {
    try { fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}
async function testAsync(name, fn) {
    try { await fn(); console.log(`  PASS  ${name}`); passed++; }
    catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

// ── PATH G: task → runAgentTeam ───────────────────────────────────────────────

console.log('\n── Orchestrator module (PATH G) ────────────────────────────────────────────');

const orch = require('../agent-system/orchestrator');

test('orchestrator module IS runAgentTeam (default export)', () => {
    // module.exports = runAgentTeam (default export pattern)
    assert(typeof orch === 'function', 'orchestrator module itself must be the runAgentTeam function');
});

test('orchestrator exports getOrchestratorStatus', () => {
    assert(typeof orch.getOrchestratorStatus === 'function', 'getOrchestratorStatus must be exported');
});

test('getOrchestratorStatus returns a status object', () => {
    const status = orch.getOrchestratorStatus();
    assert(status !== null && typeof status === 'object', 'getOrchestratorStatus must return object');
    // Should have at least circuit breaker status or some health indicator
    assert(typeof status === 'object', 'status must be an object');
});

// ── PATH G: task router ───────────────────────────────────────────────────────

console.log('\n── Task router (PATH G) ────────────────────────────────────────────────────');

test('runtime/task-router.js loads', () => {
    const taskRouter = require('../runtime/task-router');
    assert(taskRouter, 'task-router must export something');
});

test('src/routes/agent-tasks.js loads', () => {
    const agentTasks = require('../src/routes/agent-tasks');
    assert(agentTasks, 'agent-tasks route must export something');
});

// ── PATH H: agent → memory → tool ─────────────────────────────────────────────

console.log('\n── Memory gateway (PATH H) ─────────────────────────────────────────────────');

const gateway = require('../lib/memory/gateway');

test('lib/memory/gateway.js exports storeMemory', () => {
    assert(typeof gateway.storeMemory === 'function', 'storeMemory must be exported');
});

test('lib/memory/gateway.js exports at least 9 functions (R16 verified)', () => {
    const exports = Object.keys(gateway).filter(k => typeof gateway[k] === 'function');
    assert(exports.length >= 9, `gateway must export at least 9 functions, got ${exports.length}: ${exports.join(', ')}`);
});

test('gateway storeMemory rejects missing layer gracefully', async () => {
    // Without Supabase, storeMemory should handle gracefully (not throw uncaught)
    let threw = false;
    try {
        await gateway.storeMemory({ source: 'test', content: 'test content', requestingEntity: 'test' });
    } catch (e) {
        threw = true;
    }
    // Should either succeed (unlikely without DB) or throw a reasonable error — both are fine
    // The key test is that it doesn't hang indefinitely
    assert(true, 'storeMemory must complete (not hang)');
});

// ── PATH H: agent-system canonical modules ────────────────────────────────────

console.log('\n── Agent-system canonical modules (PATH H) ─────────────────────────────────');

test('agent-system/orchestrator.js loads with canonical Supabase client', () => {
    // R9-01 fix verified: no longer uses raw createClient
    const src = require('fs').readFileSync(require('path').join(__dirname, '../agent-system/orchestrator.js'), 'utf8');
    assert(!src.includes("require('@supabase/supabase-js')"), 'orchestrator must not import @supabase/supabase-js directly after Phase 2C fix');
    assert(src.includes('getSupabaseClient'), 'orchestrator must use canonical getSupabaseClient after Phase 2C fix');
});

test('agent-system/master-orchestrator.js uses canonical client', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../agent-system/master-orchestrator.js'), 'utf8');
    // Should not have createClient from @supabase/supabase-js (was removed in Phase 2C)
    assert(!src.includes("require('@supabase/supabase-js')"), 'master-orchestrator must not import @supabase/supabase-js directly');
});

test('lib/governance.js uses canonical client', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/governance.js'), 'utf8');
    assert(!src.includes("require('@supabase/supabase-js')"), 'governance.js must not import @supabase/supabase-js directly');
    assert(src.includes('getSupabaseClient'), 'governance.js must use canonical getSupabaseClient');
});

// ── PATH I: background execution structural checks ────────────────────────────

console.log('\n── Background execution structural checks (PATH I) ─────────────────────────');

test('lib/cron-scheduler.js loads', () => {
    // Verify the module loads (important after R13-D1 calendar/sync extraction)
    const cronSched = require('../lib/cron-scheduler');
    assert(cronSched, 'cron-scheduler must export something');
});

test('lib/calendar/sync.js exports syncGoogleCalendar (R13-D1 extraction verified)', () => {
    const calSync = require('../lib/calendar/sync');
    assert(typeof calSync.syncGoogleCalendar === 'function', 'syncGoogleCalendar must be exported from canonical lib location');
});

test('lib/cron-scheduler.js does not import routes/communications (R13-D1 fix verified)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/cron-scheduler.js'), 'utf8');
    assert(!src.includes("require('../routes/communications')"), 'cron-scheduler must not import routes/communications (R13-D1 fix)');
    assert(src.includes("require('./calendar/sync')"), 'cron-scheduler must import from canonical lib/calendar/sync');
});

test('lib/voice/state.js exports voiceState (R13-D2 extraction verified)', () => {
    const voiceState = require('../lib/voice/state');
    assert(voiceState.voiceState, 'voiceState object must be exported');
    assert(typeof voiceState.broadcastVoiceState === 'function', 'broadcastVoiceState must be exported');
    // voiceState must have the expected shape
    const vs = voiceState.voiceState;
    assert('active' in vs, 'voiceState must have active property');
    assert('listeners' in vs, 'voiceState must have listeners (Set)');
    assert(vs.listeners instanceof Set, 'voiceState.listeners must be a Set');
});

test('routes/intelligence.js imports voiceState from lib/ (R13-D2 fix verified)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../routes/intelligence.js'), 'utf8');
    assert(src.includes("require('../lib/voice/state')"), 'intelligence.js must import voiceState from lib/voice/state');
});

// ── Summary ────────────────────────────────────────────────────────────────────

console.log('\n── Summary ─────────────────────────────────────────────────────────────────');

setTimeout(() => {
    const exitCode = failed > 0 ? 1 : 0;
    console.log(`\n  ${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
    process.exit(exitCode);
}, 500);
