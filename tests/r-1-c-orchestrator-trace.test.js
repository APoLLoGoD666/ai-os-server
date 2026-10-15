'use strict';
// R-1.C verification: traceId + taskId propagation from pipeline ctx into all runtime.execute() calls.

const assert = require('assert');
const { test } = require('node:test');
const path = require('path');
const fs   = require('fs');

const src = fs.readFileSync(
    path.join(__dirname, '../agent-system/orchestrator.js'), 'utf8');

// ── Structural: ctx carries taskId ───────────────────────────────────────────

test('runAgentTeam ctx initialises with taskId field', () => {
    // The ctx block must store taskId so all downstream helpers can access it via ctx
    const ctxIdx   = src.indexOf('const ctx = {');
    const ctxBlock = src.slice(ctxIdx, ctxIdx + 400);
    assert.ok(ctxBlock.includes('taskId,'), 'ctx must initialise taskId from runAgentTeam parameter');
});

// ── Structural: _callClaude propagates both fields ───────────────────────────

test('_callClaude passes traceId: ctx.traceId to runtime.execute()', () => {
    const idx   = src.indexOf('async function _callClaude(');
    const block = src.slice(idx, idx + 500);
    assert.ok(block.includes('traceId:    ctx.traceId,'), '_callClaude must pass traceId: ctx.traceId');
});

test('_callClaude passes taskId: ctx.taskId || null to runtime.execute()', () => {
    const idx   = src.indexOf('async function _callClaude(');
    const block = src.slice(idx, idx + 700);
    assert.ok(block.includes('taskId:     ctx.taskId || null,'), '_callClaude must pass taskId: ctx.taskId || null');
});

// ── Structural: _callWrite propagates both fields ────────────────────────────

test('_callWrite passes traceId: ctx.traceId to runtime.execute()', () => {
    const idx   = src.indexOf('async function _callWrite(');
    const block = src.slice(idx, idx + 500);
    assert.ok(block.includes('traceId:   ctx.traceId,'), '_callWrite must pass traceId: ctx.traceId');
});

test('_callWrite passes taskId: ctx.taskId || null to runtime.execute()', () => {
    const idx   = src.indexOf('async function _callWrite(');
    const block = src.slice(idx, idx + 500);
    assert.ok(block.includes('taskId:    ctx.taskId || null,'), '_callWrite must pass taskId: ctx.taskId || null');
});

// ── Structural: inline REVIEWER propagates both fields ───────────────────────

test('inline REVIEWER runtime.execute() passes traceId: ctx.traceId', () => {
    // Third and final runtime.execute() call — in the REVIEWER per-file loop
    const idx   = src.lastIndexOf("caller:   'REVIEWER',");
    const block = src.slice(idx, idx + 500);
    assert.ok(block.includes('traceId:  ctx.traceId,'), 'REVIEWER inline call must pass traceId: ctx.traceId');
});

test('inline REVIEWER runtime.execute() passes taskId: ctx.taskId || null', () => {
    const idx   = src.lastIndexOf("caller:   'REVIEWER',");
    const block = src.slice(idx, idx + 500);
    assert.ok(block.includes('taskId:   ctx.taskId || null,'), 'REVIEWER inline call must pass taskId: ctx.taskId || null');
});

// ── Structural: all three execute() calls carry traceId ──────────────────────

test('orchestrator has exactly 3 runtime.execute() call sites', () => {
    const executeCount = (src.match(/runtime\.execute\(/g) || []).length;
    assert.strictEqual(executeCount, 3, 'orchestrator must have exactly 3 runtime.execute() call sites');
});

test('all three execute() call sites carry distinct traceId+taskId patterns', () => {
    // Each call site uses aligned column formatting — unique spacing per site
    assert.ok(src.includes('traceId:    ctx.traceId,'),  '_callClaude site (4-space alignment) must carry traceId');
    assert.ok(src.includes('traceId:   ctx.traceId,'),   '_callWrite site (3-space alignment) must carry traceId');
    assert.ok(src.includes('traceId:  ctx.traceId,'),    'REVIEWER site (2-space alignment) must carry traceId');
    assert.ok(src.includes('taskId:     ctx.taskId || null,'), '_callClaude site must carry taskId');
    assert.ok(src.includes('taskId:    ctx.taskId || null,'),  '_callWrite site must carry taskId');
    assert.ok(src.includes('taskId:   ctx.taskId || null,'),   'REVIEWER site must carry taskId');
});

// ── Structural: API signatures unchanged ─────────────────────────────────────

test('_callClaude signature is unchanged', () => {
    assert.ok(
        src.includes('async function _callClaude(model, systemPrompt, userContent, maxTokens, role, ctx)'),
        '_callClaude signature must be unchanged'
    );
});

test('_callWrite signature is unchanged', () => {
    assert.ok(
        src.includes('async function _callWrite(model, systemPrompt, userContent, role, ctx)'),
        '_callWrite signature must be unchanged'
    );
});

test('runAgentTeam signature is unchanged', () => {
    assert.ok(
        src.includes('async function runAgentTeam(spec, taskId)'),
        'runAgentTeam signature must be unchanged'
    );
});

// ── Module loading ────────────────────────────────────────────────────────────

test('orchestrator module loads without error', () => {
    assert.doesNotThrow(() => {
        delete require.cache[require.resolve('../agent-system/orchestrator')];
        require('../agent-system/orchestrator');
    });
});
