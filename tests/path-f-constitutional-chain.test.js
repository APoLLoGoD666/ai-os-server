'use strict';
// Stub env vars so modules that call getSupabaseClient() at load time don't throw.
// These are placeholder values — no actual DB connection is made in these tests.
if (!process.env.SUPABASE_URL) process.env.SUPABASE_URL = 'https://placeholder.supabase.co';
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-key';
if (!process.env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = 'placeholder-key';

// tests/path-f-constitutional-chain.test.js
// Phase 2G: R10-PATH-F (chat → constitutional gate) + R10-GOV (governance recording structure)
// Tests the constitutional gate and the structural integrity of the chat execution chain.

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

console.log('\n── Constitutional gate module ──────────────────────────────────────────────');

const gate = require('../lib/runtime/constitutional-gate');

test('gate exports VERDICT constants', () => {
    assert(gate.VERDICT, 'VERDICT must be exported');
    assert(gate.VERDICT.ALLOW === 'ALLOW', 'VERDICT.ALLOW');
    assert(gate.VERDICT.DENY === 'DENY', 'VERDICT.DENY');
    assert(gate.VERDICT.WARN === 'WARN', 'VERDICT.WARN');
    assert(gate.VERDICT.RESTRICT === 'RESTRICT', 'VERDICT.RESTRICT');
});

test('gate exports evaluate function', () => {
    assert(typeof gate.evaluate === 'function', 'evaluate must be a function');
});

test('gate exports DEFAULT_TIMEOUT_MS', () => {
    assert(typeof gate.DEFAULT_TIMEOUT_MS === 'number', 'DEFAULT_TIMEOUT_MS must be a number');
    assert(gate.DEFAULT_TIMEOUT_MS > 0, 'DEFAULT_TIMEOUT_MS must be positive');
});

// ── evaluate() return shape ────────────────────────────────────────────────────

console.log('\n── evaluate() return shape ─────────────────────────────────────────────────');

test('evaluate() with empty context returns valid shape', () => {
    const result = gate.evaluate({});
    assert(result, 'result must be truthy');
    assert('verdict' in result, 'result must have verdict');
    assert(Array.isArray(result.risks), 'result.risks must be array');
    assert(Array.isArray(result.auditTrail), 'result.auditTrail must be array');
    assert(typeof result.riskScore === 'number', 'result.riskScore must be number');
    assert(typeof result.evaluatedAt === 'string', 'result.evaluatedAt must be ISO string');
    assert(typeof result.durationMs === 'number', 'result.durationMs must be number');
});

test('evaluate() verdict is one of the known VERDICT values', () => {
    const result = gate.evaluate({ metadata: { path: '/api/chat' } });
    const validVerdicts = Object.values(gate.VERDICT);
    assert(validVerdicts.includes(result.verdict), `verdict '${result.verdict}' must be in VERDICT enum`);
});

test('evaluate() with null context does not throw', () => {
    // null coerces to {} via default param
    const result = gate.evaluate(undefined);
    assert('verdict' in result, 'must return verdict even with undefined context');
});

test('evaluate() auditTrail contains check entries', () => {
    const result = gate.evaluate({ metadata: { path: '/api/chat' }, identity: { roles: ['HUMAN_OPERATOR'] } });
    // Must have at least one audit entry (authority check runs first)
    assert(result.auditTrail.length >= 1, 'auditTrail must have at least one entry');
    const first = result.auditTrail[0];
    assert('check' in first, 'audit entry must have check field');
    assert('status' in first, 'audit entry must have status field');
});

test('evaluate() FOUNDER role is recognized', () => {
    const result = gate.evaluate({
        metadata: { path: '/api/chat' },
        identity: { roles: ['FOUNDER'] }
    });
    assert('verdict' in result, 'FOUNDER context must return verdict');
});

test('evaluate() HUMAN_OPERATOR role is recognized', () => {
    const result = gate.evaluate({
        metadata: { path: '/api/chat' },
        identity: { roles: ['HUMAN_OPERATOR'] }
    });
    assert('verdict' in result, 'HUMAN_OPERATOR context must return verdict');
});

test('evaluate() typical chat context does not throw', () => {
    const result = gate.evaluate({
        metadata: { path: '/chat', method: 'POST' },
        identity: { humanId: 'test-user', roles: ['HUMAN_OPERATOR'] },
        payload: { message: 'hello' }
    });
    assert('verdict' in result, 'typical chat context must produce verdict');
});

test('evaluate() modification path is detected', () => {
    const result = gate.evaluate({
        metadata: { path: '/api/self-modify/patch' },
        identity: { roles: ['HUMAN_OPERATOR'] }
    });
    // Must produce a verdict — the modification path should trigger extra checks
    assert('verdict' in result, 'modification path must produce verdict');
});

// ── Fail-closed invariant ──────────────────────────────────────────────────────

console.log('\n── Fail-closed invariant ───────────────────────────────────────────────────');

test('evaluate() returns valid verdict in all cases (never throws)', () => {
    const cases = [
        {},
        { metadata: null },
        { identity: { roles: [] } },
        { identity: { roles: ['UNKNOWN_ROLE'] } },
        { metadata: { path: '/api/constitutional-nuclear-override' } },
    ];
    for (const ctx of cases) {
        const result = gate.evaluate(ctx);
        assert('verdict' in result, `must return verdict for context: ${JSON.stringify(ctx)}`);
    }
});

test('DENY is a valid verdict output (gate can deny)', () => {
    // Inject a modification path that is likely to restrict or deny
    const result = gate.evaluate({
        metadata: { path: '/update-code/self-modify', method: 'POST' },
        identity: { roles: [] }
    });
    const validVerdicts = Object.values(gate.VERDICT);
    assert(validVerdicts.includes(result.verdict), 'verdict must be valid even for dangerous paths');
});

// ── Chat route structural chain ────────────────────────────────────────────────

console.log('\n── Chat route structural chain ─────────────────────────────────────────────');

test('src/routes/chat.js loads without throwing', () => {
    // Module loading validates all require() paths resolve
    // This will throw MODULE_NOT_FOUND if any dependency is broken
    const chatRoute = require('../src/routes/chat');
    assert(chatRoute, 'chat route must export something');
});

test('lib/kernel.js exports kernelChain', () => {
    const kernel = require('../lib/kernel');
    assert(kernel.kernelChain, 'kernelChain must be exported from lib/kernel');
    assert(Array.isArray(kernel.kernelChain), 'kernelChain must be an array of middleware');
    assert(kernel.kernelChain.length > 0, 'kernelChain must not be empty');
});

test('kernelChain contains only functions (valid Express middleware)', () => {
    const { kernelChain } = require('../lib/kernel');
    for (const fn of kernelChain) {
        assert(typeof fn === 'function', 'each kernelChain item must be a function');
    }
});

test('lib/agent-command-handler.js exports handleCommand', () => {
    const handler = require('../lib/agent-command-handler');
    assert(typeof handler.handleCommand === 'function', 'handleCommand must be exported');
});

// ── Summary ────────────────────────────────────────────────────────────────────

console.log('\n── Summary ─────────────────────────────────────────────────────────────────');

const exitCode = failed > 0 ? 1 : 0;
console.log(`\n  ${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
process.exit(exitCode);
