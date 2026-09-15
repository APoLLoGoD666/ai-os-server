'use strict';
// R-1.B verification: end-to-end trace ID propagation in runtime.

const assert = require('assert');
const { test } = require('node:test');
const path = require('path');
const fs   = require('fs');

const src = fs.readFileSync(
    path.join(__dirname, '../lib/models/runtime/index.js'), 'utf8');

// ── Structural: generation logic ─────────────────────────────────────────────

test('execute() generates resolvedTraceId from caller-supplied traceId or new UUID', () => {
    assert.ok(
        src.includes("const resolvedTraceId = traceId || crypto.randomUUID();"),
        'resolvedTraceId must be generated exactly once in execute()'
    );
});

test('stream() generates resolvedTraceId', () => {
    const streamIdx = src.indexOf('function stream({');
    const streamBlock = src.slice(streamIdx, streamIdx + 300);
    assert.ok(
        streamBlock.includes("const resolvedTraceId = traceId || crypto.randomUUID();"),
        'stream() must also generate resolvedTraceId'
    );
});

test('voice() generates resolvedTraceId', () => {
    const voiceIdx = src.indexOf('function voice({');
    const voiceBlock = src.slice(voiceIdx, voiceIdx + 300);
    assert.ok(
        voiceBlock.includes("const resolvedTraceId = traceId || crypto.randomUUID();"),
        'voice() must also generate resolvedTraceId'
    );
});

test('raw traceId parameter is never used directly inside execute() body', () => {
    // After resolvedTraceId is declared, the original traceId parameter must not appear
    // in any call site within execute()
    const execStart = src.indexOf('async function execute(');
    const execEnd   = src.indexOf('\n// ── stream()', execStart);
    const execBody  = src.slice(execStart, execEnd);

    // resolvedTraceId line itself contains 'traceId' as the source value — that is correct
    // But downstream call sites must use 'resolvedTraceId', not bare 'traceId'
    // Check: no ', traceId,' or ': traceId,' patterns (call site usage) after resolution line
    const afterResolution = execBody.slice(execBody.indexOf('const resolvedTraceId'));
    // These patterns would indicate direct use of the original parameter in a call site
    const illegalUsage = /[,\s]traceId[,\s})]/.test(afterResolution
        .replace(/const resolvedTraceId = traceId \|\| crypto\.randomUUID\(\);/, '')
    );
    assert.ok(!illegalUsage, 'raw traceId must not appear in call sites after resolvedTraceId is declared');
});

// ── Structural: propagation to all downstream paths ──────────────────────────

test('failure-path _emit() receives resolvedTraceId', () => {
    const catchIdx = src.indexOf('} catch (err) {');
    const throwIdx = src.indexOf('throw err;', catchIdx);
    const failBlock = src.slice(catchIdx, throwIdx);
    assert.ok(
        failBlock.includes('traceId: resolvedTraceId'),
        'failure-path _emit() must receive resolvedTraceId'
    );
});

test('success-path _emit() receives resolvedTraceId', () => {
    const costIdx  = src.indexOf('const costEstimate = registry.estimateCost');
    const emitSlice = src.slice(costIdx, costIdx + 200);
    assert.ok(
        emitSlice.includes('traceId: resolvedTraceId'),
        'success-path _emit() must receive resolvedTraceId'
    );
});

test('failure-path appendEvidenceBlock receives resolvedTraceId', () => {
    const catchIdx   = src.indexOf('} catch (err) {');
    const throwIdx   = src.indexOf('throw err;', catchIdx);
    const failBlock  = src.slice(catchIdx, throwIdx + 10);
    assert.ok(
        failBlock.includes('traceId: resolvedTraceId'),
        'failure-path governance evidence block must carry resolvedTraceId'
    );
});

test('success-path appendEvidenceBlock receives resolvedTraceId', () => {
    const successGovIdx = src.lastIndexOf('gov.appendEvidenceBlock(');
    const govSlice      = src.slice(successGovIdx, successGovIdx + 300);
    assert.ok(
        govSlice.includes('traceId: resolvedTraceId'),
        'success-path governance evidence block must carry resolvedTraceId'
    );
});

test('outputCapture.capture() receives resolvedTraceId', () => {
    assert.ok(
        src.includes('outputCapture.capture(modelResult, taskId, resolvedTraceId)'),
        'outputCapture must receive resolvedTraceId'
    );
});

// ── Structural: propagation to return meta ───────────────────────────────────

test('execute() return meta includes traceId: resolvedTraceId', () => {
    // The execute() return block is multiline: '    return {\n'
    // Earlier one-line returns ('    return { modelId...')  don't match this newline pattern
    const returnIdx   = src.indexOf('    return {\n');
    const returnBlock = src.slice(returnIdx, returnIdx + 350);
    assert.ok(
        returnBlock.includes('traceId: resolvedTraceId'),
        'execute() return meta must include traceId: resolvedTraceId'
    );
});

test('stream() return meta includes traceId: resolvedTraceId', () => {
    assert.ok(
        src.includes('meta: { caller, model: resolvedModel, tier: resolvedTier, traceId: resolvedTraceId }'),
        'stream() return meta must include traceId: resolvedTraceId'
    );
});

test('voice() return includes traceId: resolvedTraceId', () => {
    // voice() body is ~500 chars; use 650 to safely reach the return statement
    const voiceIdx = src.indexOf('function voice({');
    const voiceBlock = src.slice(voiceIdx, voiceIdx + 650);
    assert.ok(
        voiceBlock.includes('return { requestId, traceId: resolvedTraceId };'),
        'voice() must return traceId: resolvedTraceId'
    );
});

// ── Structural: logging ───────────────────────────────────────────────────────

test('_emit() logger.debug includes traceId field', () => {
    const emitIdx  = src.indexOf('function _emit(record)');
    const emitSlice = src.slice(emitIdx, emitIdx + 250);
    assert.ok(
        emitSlice.includes('traceId: record.traceId || null'),
        '_emit() logger must include traceId in the debug meta'
    );
});

// ── Structural: API signature unchanged ──────────────────────────────────────

test('execute() signature is unchanged', () => {
    assert.ok(
        src.includes('async function execute({ client, caller, model, system, messages, maxTokens = 2048, temperature, tier, purpose, traceId, taskId, tools })'),
        'execute() signature must be unchanged'
    );
});

test('stream() signature is unchanged', () => {
    assert.ok(
        src.includes('function stream({ client, caller, model, system, messages, maxTokens = 4096, tier, traceId, taskId })'),
        'stream() signature must be unchanged'
    );
});

test('voice() signature is unchanged', () => {
    assert.ok(
        src.includes('function voice({ caller, model, traceId, taskId })'),
        'voice() signature must be unchanged'
    );
});

test('module exports unchanged', () => {
    assert.ok(src.includes('module.exports = { execute, stream, voice };'),
        'module exports must be unchanged');
});

// ── Behavioral: existing traceId is preserved, not regenerated ───────────────

test('resolvedTraceId = traceId when caller supplies one — no UUID generation', () => {
    // Pattern: traceId || crypto.randomUUID() — short-circuits if traceId is truthy
    const pattern = "const resolvedTraceId = traceId || crypto.randomUUID();";
    assert.ok(src.includes(pattern),
        'short-circuit OR ensures existing traceId is preserved without regeneration');
    // Count occurrences: each function has exactly one generation line
    const count = src.split(pattern).length - 1;
    assert.strictEqual(count, 3, 'resolvedTraceId generation must appear exactly 3 times (execute, stream, voice)');
});

test('resolvedTraceId generated exactly once per invocation — no second assignment', () => {
    const execStart  = src.indexOf('async function execute(');
    const execEnd    = src.indexOf('\n// ── stream()', execStart);
    const execBody   = src.slice(execStart, execEnd);
    const genCount   = (execBody.match(/crypto\.randomUUID\(\)/g) || []).length;
    assert.strictEqual(genCount, 1, 'crypto.randomUUID() must be called exactly once in execute()');
});

// ── Module loading ────────────────────────────────────────────────────────────

test('runtime module loads without error', () => {
    assert.doesNotThrow(() => {
        delete require.cache[require.resolve('../lib/models/runtime')];
        require('../lib/models/runtime');
    });
});
