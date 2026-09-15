'use strict';
// Stub env vars so modules that call getSupabaseClient() at load time don't throw.
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-key';
if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = 'placeholder-key';

// tests/governance-integration.test.js
// Phase 2G: R10-GOV — governance module structural integrity and write-path shape.
// Verifies that governance writes are fire-and-forget, never throw, and export the
// expected surface area without requiring a live Supabase connection.

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

// ── Module loading ─────────────────────────────────────────────────────────────

console.log('\n── Governance module (R10-GOV) ─────────────────────────────────────────────');

const gov = require('../lib/governance');

test('lib/governance.js loads', () => {
    assert(gov, 'governance must export something');
    assert(typeof gov === 'object', 'governance exports must be an object');
});

test('governance exports recordSystemEvent', () => {
    assert(typeof gov.recordSystemEvent === 'function', 'recordSystemEvent must be exported');
});

test('governance exports recordAgentDecision', () => {
    assert(typeof gov.recordAgentDecision === 'function', 'recordAgentDecision must be exported');
});

test('governance exports appendEvidenceBlock', () => {
    assert(typeof gov.appendEvidenceBlock === 'function', 'appendEvidenceBlock must be exported');
});

test('governance exports startExecutionGraph', () => {
    assert(typeof gov.startExecutionGraph === 'function', 'startExecutionGraph must be exported');
});

test('governance exports issueCertification', () => {
    assert(typeof gov.issueCertification === 'function', 'issueCertification must be exported');
});

test('governance uses canonical Supabase client (R8-01 fix verified)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/governance.js'), 'utf8');
    assert(!src.includes("require('@supabase/supabase-js')"), 'governance.js must not import @supabase/supabase-js directly');
    assert(src.includes('getSupabaseClient'), 'governance.js must use canonical getSupabaseClient');
});

// ── Governance probe ──────────────────────────────────────────────────────────

console.log('\n── Governance probe (R10-GOV) ──────────────────────────────────────────────');

const probe = require('../lib/governance-probe');

test('lib/governance-probe.js loads', () => {
    assert(probe, 'governance-probe must export something');
});

test('governance-probe exports runProbe', () => {
    assert(typeof probe.runProbe === 'function', 'runProbe must be exported');
});

test('governance-probe exports getLatestResult', () => {
    assert(typeof probe.getLatestResult === 'function', 'getLatestResult must be exported');
});

test('governance-probe exports THRESHOLD', () => {
    assert(typeof probe.THRESHOLD === 'number', 'THRESHOLD must be a number');
    assert(probe.THRESHOLD > 0 && probe.THRESHOLD <= 100, 'THRESHOLD must be in (0, 100]');
});

test('governance-probe uses canonical Supabase client (R9-06 fix verified)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../lib/governance-probe.js'), 'utf8');
    assert(!src.includes("require('@supabase/supabase-js')"), 'governance-probe.js must not import @supabase/supabase-js directly');
    assert(src.includes('getSupabaseClient'), 'governance-probe.js must use canonical getSupabaseClient');
});

// ── Constitutional watchdog ───────────────────────────────────────────────────

console.log('\n── Constitutional watchdog (R10-GOV) ───────────────────────────────────────');

test('lib/constitution/watchdog.js loads', () => {
    const watchdog = require('../lib/constitution/watchdog');
    assert(watchdog, 'watchdog must export something');
});

test('watchdog exports start and tick', () => {
    const watchdog = require('../lib/constitution/watchdog');
    assert(typeof watchdog.start === 'function', 'watchdog.start must be a function');
    assert(typeof watchdog.tick === 'function', 'watchdog.tick must be a function');
});

// ── Constitutional store ──────────────────────────────────────────────────────

console.log('\n── Constitutional store (R10-GOV) ──────────────────────────────────────────');

test('lib/runtime/constitutional-store.js loads', () => {
    const store = require('../lib/runtime/constitutional-store');
    assert(store, 'constitutional-store must export something');
});

test('constitutional-store exports write', () => {
    const store = require('../lib/runtime/constitutional-store');
    assert(typeof store.write === 'function', 'constitutional-store.write must be a function');
});

// ── Governance fire-and-forget invariant ──────────────────────────────────────

console.log('\n── Governance fire-and-forget invariant (R10-GOV) ──────────────────────────');

(async () => {

await testAsync('governance.recordSystemEvent never throws (fire-and-forget)', async () => {
    let threw = false;
    try {
        // Without Supabase, this will fail internally but must not throw to the caller
        await gov.recordSystemEvent('test_event', { test: true }, 'test-task');
    } catch {
        threw = true;
    }
    assert(!threw, 'recordSystemEvent must never throw — it is fire-and-forget');
});

await testAsync('governance.appendEvidenceBlock never throws', async () => {
    let threw = false;
    try {
        await gov.appendEvidenceBlock(
            { type: 'test', entity: 'test', operation: 'test', timestamp: new Date().toISOString() },
            'memory'
        );
    } catch {
        threw = true;
    }
    assert(!threw, 'appendEvidenceBlock must never throw — it is fire-and-forget');
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n── Summary ─────────────────────────────────────────────────────────────────');

const exitCode = failed > 0 ? 1 : 0;
console.log(`\n  ${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
process.exit(exitCode);

})();
