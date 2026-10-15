'use strict';
// R-1.A verification: non-blocking governance evidence recording in runtime.execute().

const assert = require('assert');
const { test } = require('node:test');
const path = require('path');
const fs   = require('fs');

const src = fs.readFileSync(
    path.join(__dirname, '../lib/models/runtime/index.js'), 'utf8');

// ── Structural: governance evidence block wiring ──────────────────────────────

test('success path calls appendEvidenceBlock with llm_invocations chain', () => {
    assert.ok(
        src.includes("gov.appendEvidenceBlock("),
        'appendEvidenceBlock must be called'
    );
    assert.ok(
        src.includes("'llm_invocations'"),
        "chain id must be 'llm_invocations'"
    );
});

test('success path evidence payload contains required audit fields', () => {
    assert.ok(src.includes('requestId, traceId: resolvedTraceId, taskId: taskId || null, caller,'),
        'evidence must carry requestId, resolvedTraceId, taskId, caller');
    assert.ok(src.includes('model: resolvedModel, tier: resolvedTier,'),
        'evidence must carry model and tier');
    assert.ok(src.includes('latency, inputTokens, outputTokens, costEstimate,'),
        'evidence must carry latency, tokens, cost');
    assert.ok(src.includes("success: true, ts: new Date().toISOString(),"),
        'success path must set success:true with timestamp');
});

test('failure path calls appendEvidenceBlock via setImmediate before throw', () => {
    // Verify failure path has setImmediate + appendEvidenceBlock
    const catchIdx   = src.indexOf('} catch (err) {');
    const throwIdx   = src.indexOf('throw err;', catchIdx);
    const setImmIdx  = src.indexOf('setImmediate(() => {', catchIdx);
    const govCallIdx = src.indexOf("gov.appendEvidenceBlock(", catchIdx);

    assert.ok(setImmIdx > catchIdx && setImmIdx < throwIdx,
        'setImmediate must appear between catch and throw');
    assert.ok(govCallIdx > catchIdx && govCallIdx < throwIdx + 500,
        'appendEvidenceBlock must be called in failure path');
});

test('failure path evidence payload marks success:false with failureType', () => {
    assert.ok(
        src.includes('success: false, failureType,'),
        'failure path evidence must set success:false and include failureType'
    );
});

test('governance require path resolves correctly from runtime location', () => {
    // lib/models/runtime/index.js → ../../governance → lib/governance.js
    assert.ok(
        src.includes("require('../../governance')"),
        "require path must be '../../governance'"
    );
    const govPath = path.join(__dirname, '../lib/governance.js');
    assert.ok(fs.existsSync(govPath), 'lib/governance.js must exist at resolved path');
    const govSrc = fs.readFileSync(govPath, 'utf8');
    assert.ok(govSrc.includes('async function appendEvidenceBlock'), 'appendEvidenceBlock must be exported from governance');
});

test('governance write is wrapped in try/catch — never throws to caller', () => {
    // Both success and failure governance writes must be inside try {} catch (_) {}
    // Search forward from the last appendEvidenceBlock call — catch comes AFTER the call
    const successGovIdx = src.lastIndexOf("gov.appendEvidenceBlock(");
    const tryCatchAfter = src.indexOf('} catch (_) {}', successGovIdx);
    assert.ok(tryCatchAfter !== -1 && tryCatchAfter > successGovIdx,
        'governance block must be followed by } catch (_) {}');
});

test('appendEvidenceBlock call ends with .catch(() => {}) — never throws on rejection', () => {
    // Each call is a multi-line expression; use 500 chars to safely span the closing
    const idx = src.indexOf("gov.appendEvidenceBlock(");
    assert.ok(idx !== -1, 'appendEvidenceBlock must be called');
    const slice = src.slice(idx, idx + 500);
    assert.ok(slice.includes(".catch(() => {})"), 'must chain .catch to swallow rejection');
});

test('no duplicate cost_accounting write — outputCapture handles that path', () => {
    // R-1.A must NOT call governance.recordCostEntry — outputCapture already writes cost_accounting
    const govUsage = src.slice(src.indexOf('// Non-blocking output capture'));
    assert.ok(
        !govUsage.includes('gov.recordCostEntry'),
        'runtime must not duplicate cost_accounting write (outputCapture already does this)'
    );
});

test('runtime.execute API signature unchanged', () => {
    assert.ok(
        src.includes('async function execute({ client, caller, model, system, messages, maxTokens = 2048, temperature, tier, purpose, traceId, taskId, tools })'),
        'execute() signature must be unchanged'
    );
});

test('module exports unchanged', () => {
    assert.ok(src.includes('module.exports = { execute, stream, voice };'),
        'module exports must be unchanged');
});

// ── Behavioral: non-blocking guarantee via setImmediate ─────────────────────

test('governance evidence is inside setImmediate — never blocks execute()', () => {
    // Bound the setImmediate block by the 'return {' statement that immediately follows it
    const setImmStart = src.indexOf('// Non-blocking output capture and feedback');
    const returnIdx   = src.indexOf('    return {', setImmStart);
    assert.ok(setImmStart !== -1 && returnIdx !== -1, 'comment and return statement must exist');
    const setImmBlock = src.slice(setImmStart, returnIdx);
    assert.ok(
        setImmBlock.includes("gov.appendEvidenceBlock("),
        'governance call must be inside the non-blocking setImmediate block'
    );
});

// ── Module loading ───────────────────────────────────────────────────────────

test('runtime module loads without error', () => {
    assert.doesNotThrow(() => {
        // Clear cache to force fresh load
        delete require.cache[require.resolve('../lib/models/runtime')];
        require('../lib/models/runtime');
    });
});

test('governance module loads without error', () => {
    assert.doesNotThrow(() => {
        delete require.cache[require.resolve('../lib/governance')];
        require('../lib/governance');
    });
});
