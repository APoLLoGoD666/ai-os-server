'use strict';
// validate-execution-replay.js
// Validation suite for lib/runtime/execution-replay.js
// PURE OBSERVABILITY VERIFICATION — no runtime integration.

const path = require('path');
const fs   = require('fs');

const { createReplay, simulate, compare } = require('./lib/runtime/execution-replay');

let passed = 0;
let failed = 0;

function assert(label, condition) {
    if (condition) {
        console.log(`  ✓ ${label}`);
        passed++;
    } else {
        console.error(`  ✗ ${label}`);
        failed++;
    }
}

function isFrozen(obj) {
    if (obj === null || typeof obj !== 'object') return true;
    if (!Object.isFrozen(obj)) return false;
    if (Array.isArray(obj)) return obj.every(isFrozen);
    return Object.values(obj).every(isFrozen);
}

// ── Sample records ────────────────────────────────────────────────────────────

const RECORD_A = Object.freeze({
    txId:                  'tx-replay-001',
    transactionType:       'command',
    startedAt:             '2026-01-01T00:00:00.000Z',
    durationMs:            120,
    constitutionVerdict:   'pass',
    founderScore:          0.9,
    twinScore:             0.85,
    finalDecisionScore:    0.88,
    outcomeSuccess:        true,
    outcomeCategory:       'success',
    compensationTriggered: false,
    rollbackTriggered:     false,
    executionStatus:       'completed',
});

const RECORD_B = Object.freeze({
    txId:                  'tx-replay-002',
    transactionType:       'command',
    startedAt:             '2026-01-01T00:01:00.000Z',
    durationMs:            200,
    constitutionVerdict:   'fail',
    founderScore:          0.3,
    twinScore:             0.2,
    finalDecisionScore:    0.25,
    outcomeSuccess:        false,
    outcomeCategory:       'failure',
    compensationTriggered: true,
    rollbackTriggered:     true,
    executionStatus:       'rolled_back',
});

const RECORD_A_COPY = Object.freeze({ ...RECORD_A });

// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== validate-execution-replay ===\n');

// ── Section 1: createReplay() output shape ────────────────────────────────────

console.log('Section 1: createReplay() output shape');
{
    const ctx = createReplay();
    assert('returns object',                       ctx !== null && typeof ctx === 'object');
    assert('exactly 8 keys',                       Object.keys(ctx).length === 8);
    assert('replayVersion is string',              typeof ctx.replayVersion === 'string');
    assert('replayableFields is array',            Array.isArray(ctx.replayableFields));
    assert('replayableCount is number',            typeof ctx.replayableCount === 'number');
    assert('replayableCount matches array length', ctx.replayableCount === ctx.replayableFields.length);
    assert('createdAt is null',                    ctx.createdAt === null);
    assert('deterministic is true',                ctx.deterministic === true);
    assert('descriptiveOnly is true',              ctx.descriptiveOnly === true);
    assert('authorityLevel is NONE',               ctx.authorityLevel === 'NONE');
    assert('runtimeIntegrated is false',           ctx.runtimeIntegrated === false);
    assert('replayableCount is 13',                ctx.replayableCount === 13);
}

// ── Section 2: simulate() output shape ───────────────────────────────────────

console.log('\nSection 2: simulate() output shape');
{
    const result = simulate(RECORD_A);
    assert('returns object',               result !== null && typeof result === 'object');
    assert('exactly 5 keys',               Object.keys(result).length === 5);
    assert('replayId present',             'replayId' in result);
    assert('replayMatch present',          'replayMatch' in result);
    assert('comparedFields present',       'comparedFields' in result);
    assert('variance present',             'variance' in result);
    assert('deterministic present',        'deterministic' in result);
    assert('replayId is string',           typeof result.replayId === 'string');
    assert('replayMatch is boolean',       typeof result.replayMatch === 'boolean');
    assert('comparedFields is array',      Array.isArray(result.comparedFields));
    assert('variance is number',           typeof result.variance === 'number');
    assert('deterministic is true',        result.deterministic === true);
    assert('replayMatch true for valid',   result.replayMatch === true);
    assert('variance 0 for clean record',  result.variance === 0);
}

// ── Section 3: compare() identical records ────────────────────────────────────

console.log('\nSection 3: compare() identical records');
{
    const result = compare(RECORD_A, RECORD_A_COPY);
    assert('returns object',              result !== null && typeof result === 'object');
    assert('exactly 5 keys',             Object.keys(result).length === 5);
    assert('replayMatch is true',         result.replayMatch === true);
    assert('variance is 0',               result.variance === 0);
    assert('comparedFields non-empty',    result.comparedFields.length > 0);
    assert('deterministic is true',       result.deterministic === true);
    assert('replayId is string',          typeof result.replayId === 'string');
}

// ── Section 4: compare() differing records ────────────────────────────────────

console.log('\nSection 4: compare() differing records');
{
    const result = compare(RECORD_A, RECORD_B);
    assert('replayMatch is false',         result.replayMatch === false);
    assert('variance > 0',                 result.variance > 0);
    assert('comparedFields non-empty',     result.comparedFields.length > 0);
    assert('deterministic is true',        result.deterministic === true);
    assert('replayId differs from A==A',   result.replayId !== compare(RECORD_A, RECORD_A_COPY).replayId);
}

// ── Section 5: determinism — same input → same replayId ──────────────────────

console.log('\nSection 5: determinism');
{
    const r1 = simulate(RECORD_A);
    const r2 = simulate(RECORD_A);
    assert('simulate same input → same replayId',          r1.replayId === r2.replayId);
    assert('simulate same input → same replayMatch',       r1.replayMatch === r2.replayMatch);
    assert('simulate same input → same variance',          r1.variance === r2.variance);

    const c1 = compare(RECORD_A, RECORD_B);
    const c2 = compare(RECORD_A, RECORD_B);
    assert('compare same inputs → same replayId',          c1.replayId === c2.replayId);
    assert('compare same inputs → same variance',          c1.variance === c2.variance);

    const cR = compare(RECORD_B, RECORD_A);
    assert('compare reversed inputs → different replayId', c1.replayId !== cR.replayId);
}

// ── Section 6: no mutation ────────────────────────────────────────────────────

console.log('\nSection 6: no mutation');
{
    const mutable = {
        txId: 'tx-mut', transactionType: 'test', startedAt: null,
        durationMs: 50, constitutionVerdict: 'pass', founderScore: 0.7,
        twinScore: 0.8, finalDecisionScore: 0.75, outcomeSuccess: true,
        outcomeCategory: 'success', compensationTriggered: false,
        rollbackTriggered: false, executionStatus: 'completed',
    };
    const mutable2 = { ...mutable, txId: 'tx-mut2' };
    const before = JSON.stringify(mutable);
    const before2 = JSON.stringify(mutable2);
    simulate(mutable);
    compare(mutable, mutable2);
    assert('simulate does not mutate input',  JSON.stringify(mutable) === before);
    assert('compare does not mutate inputA',  JSON.stringify(mutable) === before);
    assert('compare does not mutate inputB',  JSON.stringify(mutable2) === before2);
}

// ── Section 7: deep freeze ────────────────────────────────────────────────────

console.log('\nSection 7: deep freeze');
{
    const ctx    = createReplay();
    const sim    = simulate(RECORD_A);
    const cmp    = compare(RECORD_A, RECORD_B);
    const simNull = simulate(null);
    const cmpNull = compare(null, null);

    assert('createReplay() output is frozen',          isFrozen(ctx));
    assert('simulate() output is frozen',              isFrozen(sim));
    assert('compare() output is frozen',               isFrozen(cmp));
    assert('simulate(null) output is frozen',          isFrozen(simNull));
    assert('compare(null,null) output is frozen',      isFrozen(cmpNull));

    let threw = false;
    try { sim.replayId = 'tamper'; } catch (_) { threw = true; }
    assert('simulate output rejects mutation (strict)', threw || sim.replayId !== 'tamper');

    let threw2 = false;
    try { ctx.authorityLevel = 'ADMIN'; } catch (_) { threw2 = true; }
    assert('createReplay output rejects mutation (strict)', threw2 || ctx.authorityLevel !== 'ADMIN');
}

// ── Section 8: no functions in outputs ───────────────────────────────────────

console.log('\nSection 8: no functions in outputs');
{
    function hasFunctions(obj) {
        if (typeof obj === 'function') return true;
        if (!obj || typeof obj !== 'object') return false;
        return Object.values(obj).some(hasFunctions);
    }
    assert('createReplay() has no functions',  !hasFunctions(createReplay()));
    assert('simulate() has no functions',      !hasFunctions(simulate(RECORD_A)));
    assert('compare() has no functions',       !hasFunctions(compare(RECORD_A, RECORD_B)));
    assert('simulate(null) has no functions',  !hasFunctions(simulate(null)));
    assert('compare(null) has no functions',   !hasFunctions(compare(null, null)));
}

// ── Section 9: replayId is 64-char hex SHA256 ─────────────────────────────────

console.log('\nSection 9: replayId format');
{
    const SHA256_RE = /^[0-9a-f]{64}$/;
    const sim    = simulate(RECORD_A);
    const cmp    = compare(RECORD_A, RECORD_B);
    const simNull = simulate(null);
    const cmpNull = compare(null, null);

    assert('simulate() replayId is 64-char hex', SHA256_RE.test(sim.replayId));
    assert('compare() replayId is 64-char hex',  SHA256_RE.test(cmp.replayId));
    assert('simulate(null) replayId is 64-char hex', SHA256_RE.test(simNull.replayId));
    assert('compare(null) replayId is 64-char hex',  SHA256_RE.test(cmpNull.replayId));

    const sim2 = simulate(RECORD_B);
    assert('different records → different replayIds', sim.replayId !== sim2.replayId);
}

// ── Section 10: simulate(null) and compare(null) fallbacks ───────────────────

console.log('\nSection 10: null / invalid input fallbacks');
{
    const simNull   = simulate(null);
    const simUndef  = simulate(undefined);
    const simStr    = simulate('not-a-record');
    const cmpNull   = compare(null, null);
    const cmpOneNull = compare(RECORD_A, null);
    const cmpBadType = compare('a', 'b');

    assert('simulate(null) replayMatch is false',      simNull.replayMatch === false);
    assert('simulate(undefined) replayMatch is false', simUndef.replayMatch === false);
    assert('simulate(string) replayMatch is false',    simStr.replayMatch === false);
    assert('compare(null,null) replayMatch is false',  cmpNull.replayMatch === false);
    assert('compare(A,null) replayMatch is false',     cmpOneNull.replayMatch === false);
    assert('compare(str,str) replayMatch is false',    cmpBadType.replayMatch === false);

    assert('simulate(null) comparedFields is []',      simNull.comparedFields.length === 0);
    assert('compare(null,null) comparedFields is []',  cmpNull.comparedFields.length === 0);
    assert('compare(A,null) comparedFields is []',     cmpOneNull.comparedFields.length === 0);
}

// ── Section 11: static analysis — imports ─────────────────────────────────────

console.log('\nSection 11: static analysis — imports');
{
    const src = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'execution-replay.js'), 'utf8'
    );
    const requireCalls = src.match(/require\s*\(/g) || [];
    const relativeRequires = src.match(/require\s*\(\s*['"][./]/g) || [];
    const cryptoRequires = src.match(/require\s*\(\s*['"]crypto['"]\s*\)/g) || [];

    assert('exactly 1 require() call total',          requireCalls.length === 1);
    assert('0 relative require() calls',              relativeRequires.length === 0);
    assert('crypto is the sole import',               cryptoRequires.length === 1);
    assert('no require(\'fs\')',                       !src.includes("require('fs')") && !src.includes('require("fs")'));
    assert('no require(\'path\')',                     !src.includes("require('path')") && !src.includes('require("path")'));
    assert('no governance require() imports',          !/require\s*\(\s*['"][^'"]*governance[^'"]*['"]\s*\)/.test(src));
    assert('no runtime peer require() imports',        !/require\s*\(\s*['"][^'"]*execution-evaluator[^'"]*['"]\s*\)/.test(src));
    assert('no runtime integration markers',           !src.includes('runtimeIntegrated: true'));
    assert('authorityLevel NONE in source',            /authorityLevel\s*:\s*'NONE'/.test(src));
    assert('REPLAY_VERSION present in source',         src.includes('REPLAY_VERSION'));
    assert('REPLAYABLE_FIELDS present in source',      src.includes('REPLAYABLE_FIELDS'));
}

// ── Section 12: module.exports shape ─────────────────────────────────────────

console.log('\nSection 12: module.exports shape');
{
    const mod = require('./lib/runtime/execution-replay');
    const keys = Object.keys(mod).sort();
    assert('exactly 3 exports',                         keys.length === 3);
    assert('exports createReplay',                      typeof mod.createReplay === 'function');
    assert('exports simulate',                          typeof mod.simulate === 'function');
    assert('exports compare',                           typeof mod.compare === 'function');
    assert('no extra exports beyond the 3',            JSON.stringify(keys) === JSON.stringify(['compare', 'createReplay', 'simulate']));
}

// ── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${'─'.repeat(48)}`);
console.log(`validate-execution-replay: ${passed}/${total} passed`);
if (failed > 0) {
    console.error(`FAILED: ${failed} assertion(s) failed`);
    process.exit(1);
} else {
    console.log('ALL ASSERTIONS PASSED');
}
