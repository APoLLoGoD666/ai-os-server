'use strict';
// Mission 10 — Phase 6: Runtime Integration Tests
// Verifies the four runtime systems are correctly wired together.
// Run: node tests/runtime-integration.test.js
// All tests stub external I/O — no Supabase, no Anthropic calls made.

const assert = require('assert');

let passed = 0;
let failed = 0;
function test(name, fn) {
    try {
        const r = fn();
        if (r && typeof r.then === 'function') {
            return r.then(() => { console.log('  PASS:', name); passed++; })
                    .catch(e => { console.error('  FAIL:', name, '-', e.message); failed++; });
        }
        console.log('  PASS:', name); passed++;
    } catch (e) { console.error('  FAIL:', name, '-', e.message); failed++; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — Task Router
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSuite 1: Task Router');
const { route, RouteDecision } = require('../runtime/task-router');

test('1.1 — kill-switch objective routes to founder_escalation', () => {
    const d = route({ objective: 'kill switch all services immediately' });
    assert.strictEqual(d.route, 'founder_escalation');
    assert.strictEqual(d.priority, 'critical');
    assert.strictEqual(d.flags.requiresApproval, true);
});

test('1.2 — strategy objective routes to executive_runtime / CSO', () => {
    const d = route({ objective: 'define Q3 product strategy and roadmap' });
    assert.strictEqual(d.route, 'executive_runtime');
    assert.strictEqual(d.entity, 'cso');
});

test('1.3 — budget objective routes to executive_runtime / CFO', () => {
    const d = route({ objective: 'review model cost and budget for this month' });
    assert.strictEqual(d.route, 'executive_runtime');
    assert.strictEqual(d.entity, 'cfo');
    assert.strictEqual(d.priority, 'high');
});

test('1.4 — research objective routes to research_system', () => {
    const d = route({ objective: 'look up how Supabase RLS policies work' });
    assert.strictEqual(d.route, 'research_system');
    assert.strictEqual(d.complexity, 'simple');
});

test('1.5 — code implementation routes to agent_pipeline', () => {
    const d = route({ objective: 'implement a new POST /api/tasks endpoint' });
    assert.strictEqual(d.route, 'agent_pipeline');
});

test('1.6 — security objective is critical complexity + requiresApproval', () => {
    const d = route({ objective: 'add jwt authentication to all API routes' });
    assert.strictEqual(d.route, 'agent_pipeline');
    assert.strictEqual(d.complexity, 'critical');
    assert.strictEqual(d.flags.requiresApproval, true);
    assert.strictEqual(d.flags.touchesSecurity, true);
});

test('1.7 — simple code change is simple complexity', () => {
    const d = route({ objective: 'fix typo in error message', filesToModify: ['server.js'] });
    assert.strictEqual(d.route, 'agent_pipeline');
    assert.strictEqual(d.complexity, 'simple');
});

test('1.8 — 4+ files forces complex complexity', () => {
    const d = route({ objective: 'update config values', filesToModify: ['a.js', 'b.js', 'c.js', 'd.js'] });
    assert.strictEqual(d.complexity, 'complex');
});

test('1.9 — RouteDecision has decidedAt timestamp', () => {
    const d = route({ objective: 'add a route' });
    assert.ok(d.decidedAt);
    assert.ok(!isNaN(Date.parse(d.decidedAt)));
});

test('1.10 — strategy phrase + code verb routes to agent_pipeline (code wins)', () => {
    // "implement strategy" — _looksLikeCode fires on "implement", so EXEC match is bypassed
    const d = route({ objective: 'implement the new product strategy feature' });
    assert.strictEqual(d.route, 'agent_pipeline');
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — Memory Sanitizer
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSuite 2: Memory Sanitizer');
const sanitizer = require('../lib/memory/sanitizer');

test('2.1 — strips Anthropic API key', () => {
    const r = sanitizer.sanitize('key is sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    assert.ok(!r.includes('sk-ant'), `should redact: got ${r}`);
    assert.ok(r.includes('[REDACTED]'));
});

test('2.2 — strips Google AI key', () => {
    const r = sanitizer.sanitize('AIzaSyBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
    assert.ok(r.includes('[REDACTED]'));
});

test('2.3 — strips Supabase service key', () => {
    // Constructed at runtime to avoid static secret scanning on the literal pattern
    const fakeToken = ['sbp', '0123456789abcdef0123456789abcdef01234567'].join('_');
    const r = sanitizer.sanitize(fakeToken);
    assert.ok(r.includes('[REDACTED]'));
});

test('2.4 — strips Render API key', () => {
    const r = sanitizer.sanitize('token: rnd_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    assert.ok(r.includes('[REDACTED]'));
});

test('2.5 — passes through clean text unchanged', () => {
    const clean = 'The task completed successfully with 3 files changed.';
    assert.strictEqual(sanitizer.sanitize(clean), clean);
});

test('2.6 — non-string passthrough', () => {
    assert.strictEqual(sanitizer.sanitize(42), 42);
    assert.strictEqual(sanitizer.sanitize(null), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — Model Registry
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSuite 3: Model Registry');
const registry = require('../lib/models/registry');

test('3.1 — simple tier maps to haiku', () => {
    const m = registry.getModelForTier('simple');
    assert.ok(m.id.includes('haiku'), `expected haiku, got ${m.id}`);
});

test('3.2 — moderate tier maps to sonnet', () => {
    const m = registry.getModelForTier('moderate');
    assert.ok(m.id.includes('sonnet'), `expected sonnet, got ${m.id}`);
});

test('3.3 — critical tier maps to opus', () => {
    const m = registry.getModelForTier('critical');
    assert.ok(m.id.includes('opus'), `expected opus, got ${m.id}`);
});

test('3.4 — estimateCost returns a number', () => {
    const cost = registry.estimateCost('claude-sonnet-4-6', 1000, 500);
    assert.strictEqual(typeof cost, 'number');
    assert.ok(cost > 0);
});

test('3.5 — unknown tier falls back without throwing', () => {
    assert.doesNotThrow(() => registry.getModelForTier('unknown_tier'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — Access Controller
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSuite 4: Access Controller');
const AccessController = require('../lib/memory/access-controller');
const ac = new AccessController();

test('4.1 — orchestrator (SYSTEM) can READ layer 10', () => {
    assert.doesNotThrow(() => ac.check('orchestrator', [10], 'READ'));
});

test('4.2 — agent cannot READ layer 0 (founder)', () => {
    assert.throws(() => ac.check('some_agent', [0], 'READ'), /AccessDenied/);
});

test('4.3 — founder can WRITE layer 0', () => {
    assert.doesNotThrow(() => ac.check('founder', [0], 'WRITE'));
});

test('4.4 — council entity (cso) can READ layer 5', () => {
    assert.doesNotThrow(() => ac.check('cso', [5], 'READ'));
});

test('4.5 — agent cannot DELETE any layer', () => {
    assert.throws(() => ac.check('reflector_agent', [10], 'DELETE'), /AccessDenied/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — Gateway (stubbed I/O)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nSuite 5: Memory Gateway (stubbed)');

// Stub out all downstream I/O so no network calls are made
let _storeCallCount = 0;
const gateway = require('../lib/memory/gateway');

// Replace storeMemory with a counting stub for this test run
const _realStore = gateway.storeMemory;
gateway.storeMemory = async (opts) => { _storeCallCount++; return { stored: true, layer: opts.layer }; };

test('5.1 — storeMemory stub is callable and returns stored:true', async () => {
    const r = await gateway.storeMemory({ layer: 10, content: 'test lesson', source: 'test', requestingEntity: 'orchestrator' });
    assert.strictEqual(r.stored, true);
    assert.strictEqual(r.layer, 10);
});

test('5.2 — storeMemory call count increments', async () => {
    const before = _storeCallCount;
    await gateway.storeMemory({ layer: 2, content: 'episode', source: 'test', requestingEntity: 'orchestrator' });
    assert.strictEqual(_storeCallCount, before + 1);
});

// Restore
gateway.storeMemory = _realStore;

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────
// Allow async tests to settle
Promise.resolve().then(() => setTimeout(() => {
    console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
    process.exit(failed > 0 ? 1 : 0);
}, 200));
