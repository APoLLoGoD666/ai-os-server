'use strict';
// tests/ea-runtime-unit.test.js
// R10-P1: Canonical Execution Authority (lib/models/runtime/index.js) unit tests.
// Verifies module shape, registry integration, and structural correctness.
// No Anthropic API calls — provider pool is not exercised.
// Run: node tests/ea-runtime-unit.test.js

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

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

// ── Module shape ──────────────────────────────────────────────────────────────

const runtime = require('../lib/models/runtime');

test('execute is exported', () => {
    assert.strictEqual(typeof runtime.execute, 'function', 'runtime.execute must be a function');
});

test('stream is exported', () => {
    assert.strictEqual(typeof runtime.stream, 'function', 'runtime.stream must be a function');
});

test('voice is exported', () => {
    assert.strictEqual(typeof runtime.voice, 'function', 'runtime.voice must be a function');
});

// ── Registry integration ──────────────────────────────────────────────────────

const { TIER_ROUTING, getModel, getModelForTier } = require('../lib/models/registry');

test('TIER_ROUTING balanced → claude-sonnet-4-6', () => {
    assert.strictEqual(TIER_ROUTING.balanced, 'claude-sonnet-4-6');
});

test('TIER_ROUTING fast → claude-haiku-4-5-20251001', () => {
    assert.strictEqual(TIER_ROUTING.fast, 'claude-haiku-4-5-20251001');
});

test('TIER_ROUTING powerful → claude-opus-4-7', () => {
    assert.strictEqual(TIER_ROUTING.powerful, 'claude-opus-4-7');
});

test('getModelForTier(balanced) returns anthropic provider', () => {
    const spec = getModelForTier('balanced');
    assert.strictEqual(spec.provider, 'anthropic');
    assert.strictEqual(spec.id, 'claude-sonnet-4-6');
});

test('getModelForTier(fast) returns correct model id', () => {
    const spec = getModelForTier('fast');
    assert.strictEqual(spec.id, 'claude-haiku-4-5-20251001');
});

test('getModel throws on unknown model id', () => {
    assert.throws(
        () => getModel('not-a-real-model'),
        /Unknown model/,
        'getModel must throw on unknown model'
    );
});

test('getModel throws on stub model (openai)', () => {
    assert.throws(
        () => getModel('gpt-4o'),
        /not yet implemented/,
        'stub models must throw on getModel'
    );
});

// ── Source structural verification ────────────────────────────────────────────

const src = fs.readFileSync(path.join(__dirname, '../lib/models/runtime/index.js'), 'utf8');

test('circuit-breaker map _breakers is defined', () => {
    assert.ok(src.includes('_breakers'), 'circuit breaker Map must exist in source');
});

test('90-second timeout is configured in _callWithRetry', () => {
    assert.ok(src.includes('90_000') || src.includes('90000'), '90s timeout must be present');
});

test('maxRetries default is 3 in _callWithRetry signature', () => {
    assert.ok(
        src.includes('maxRetries = 3') || src.includes('maxRetries=3'),
        'default maxRetries must be 3'
    );
});

test('execute() generates resolvedTraceId via crypto.randomUUID()', () => {
    assert.ok(
        src.includes('resolvedTraceId = traceId || crypto.randomUUID()'),
        'resolvedTraceId must be generated in execute()'
    );
});

test('governance appendEvidenceBlock is wired in execute() success path', () => {
    assert.ok(
        src.includes("gov.appendEvidenceBlock("),
        'governance evidence must be recorded on success'
    );
});

test('governance chain is llm_invocations', () => {
    assert.ok(
        src.includes("'llm_invocations'"),
        "evidence chain id must be 'llm_invocations'"
    );
});

test('feedbackEngine.process is called after successful model call', () => {
    assert.ok(
        src.includes('feedbackEngine.process('),
        'feedback engine must be invoked in execute() success path'
    );
});

test('_emit telemetry called in execute()', () => {
    assert.ok(src.includes('_emit('), '_emit telemetry must be called');
});

test('execute() requires two accepted contracts (tier-based and legacy client-based)', () => {
    assert.ok(src.includes('tier && !client'), 'tier-only contract must be handled');
    assert.ok(src.includes('client'), 'legacy client contract must be handled');
});

process.on('exit', () => {
    console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
});
