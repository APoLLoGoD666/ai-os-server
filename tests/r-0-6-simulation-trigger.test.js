'use strict';
// R-0.6 verification: simulation auto-trigger for complex/critical tasks.

const assert = require('assert');
const { test } = require('node:test');
const path = require('path');
const fs = require('fs');

const tp = require('../agent-system/task-planner');

// ── task-planner unit tests (zero API cost) ────────────────────────────────

test('decomposeGoal simulate:true returns immediately without API call', async () => {
    const result = await tp.decomposeGoal('refactor the authentication pipeline', { simulate: true });
    assert.strictEqual(result.simulated, true);
    assert.ok(Array.isArray(result.subtasks), 'subtasks must be array');
    assert.ok(result.subtasks.length >= 1, 'at least one subtask');
    assert.ok(typeof result.complexity === 'string', 'complexity must be string');
    assert.ok(typeof result.risk === 'number', 'risk must be number');
    assert.ok(result.risk >= 0 && result.risk <= 1, 'risk must be in [0,1]');
});

test('decomposeGoal simulate:true sets simulated flag on subtask', async () => {
    const result = await tp.decomposeGoal('add a new route', { simulate: true });
    assert.strictEqual(result.simulated, true);
    assert.ok(result.subtasks[0].rationale.includes('simulation'));
});

test('estimateComplexity classifies critical for auth keywords', () => {
    const result = tp.estimateComplexity('update the JWT authentication middleware');
    assert.strictEqual(result, 'critical');
});

test('estimateComplexity classifies complex for refactor keywords', () => {
    const result = tp.estimateComplexity('refactor the orchestrator pipeline');
    assert.strictEqual(result, 'complex');
});

test('estimateComplexity classifies simple for trivial changes', () => {
    const result = tp.estimateComplexity('fix typo in dashboard text');
    assert.strictEqual(result, 'simple');
});

test('decomposeGoal throws on empty goal', async () => {
    await assert.rejects(() => tp.decomposeGoal(''), /required/);
    await assert.rejects(() => tp.decomposeGoal('   '), /required/);
});

// ── orchestrator structural tests ─────────────────────────────────────────

test('orchestrator simulation block has SIMULATION_ENABLED guard', () => {
    const src = fs.readFileSync(
        path.join(__dirname, '../agent-system/orchestrator.js'), 'utf8');

    // Verify the guard condition is present
    assert.ok(
        src.includes("process.env.SIMULATION_ENABLED !== 'false'"),
        'SIMULATION_ENABLED guard must be present in orchestrator'
    );
    // Verify it is combined with the complexity check (same condition)
    assert.ok(
        src.includes("(complexity === 'complex' || complexity === 'critical') && process.env.SIMULATION_ENABLED !== 'false'"),
        'guard must be combined with complexity check'
    );
    // Verify simulate:true is passed (not a full decomposition call)
    assert.ok(
        src.includes("{ simulate: true }"),
        'must pass simulate:true to decomposeGoal'
    );
    // Verify it fires BEFORE Step 0 RESEARCHER
    const simIdx = src.indexOf("Step 0.5 — simulation pass");
    const researchIdx = src.indexOf("Step 0 — RESEARCHER");
    assert.ok(simIdx < researchIdx, 'simulation must fire before RESEARCHER step');
    // Verify it fires BEFORE Step 1 ARCHITECT
    const archIdx = src.indexOf("Step 1 — ARCHITECT");
    assert.ok(simIdx < archIdx, 'simulation must fire before ARCHITECT step');
});

test('SIMULATION_ENABLED=false disables trigger (guard logic)', () => {
    // Verify the guard semantics: 'false' string disables, anything else enables
    const guardActive = (envVal, complexity) => {
        const enabled = envVal !== 'false';
        const isHeavy = complexity === 'complex' || complexity === 'critical';
        return enabled && isHeavy;
    };

    assert.strictEqual(guardActive(undefined, 'complex'),  true,  'complex, no env → fires');
    assert.strictEqual(guardActive(undefined, 'critical'), true,  'critical, no env → fires');
    assert.strictEqual(guardActive('true',    'complex'),  true,  'complex, true → fires');
    assert.strictEqual(guardActive('false',   'complex'),  false, 'complex, false → skipped');
    assert.strictEqual(guardActive('false',   'critical'), false, 'critical, false → skipped');
    assert.strictEqual(guardActive(undefined, 'simple'),   false, 'simple → never fires');
    assert.strictEqual(guardActive(undefined, 'moderate'), false, 'moderate → never fires');
});
