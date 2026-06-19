'use strict';
// validate-execution-evaluator.js
// Proves execution-evaluator.js is append-only, deterministic, frozen,
// has no authority, and imports no runtime/execution/memory modules.

const fs   = require('fs');
const path = require('path');

const {
    recordOutcome, evaluate, evaluateAgainst, reset, getEvaluationSnapshot,
} = require('./lib/runtime/execution-evaluator');

let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? '\n       ' + detail : ''}`); }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isDeepFrozen(value, atPath) {
    if (value === null || typeof value !== 'object') return { ok: true };
    if (!Object.isFrozen(value)) return { ok: false, path: atPath };
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const r = isDeepFrozen(value[i], `${atPath}[${i}]`);
            if (!r.ok) return r;
        }
    } else {
        for (const key of Object.keys(value)) {
            const r = isDeepFrozen(value[key], `${atPath}.${key}`);
            if (!r.ok) return r;
        }
    }
    return { ok: true };
}

function hasNoFunctions(value, atPath) {
    if (typeof value === 'function') return { ok: false, path: atPath };
    if (value === null || typeof value !== 'object') return { ok: true };
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const r = hasNoFunctions(value[i], `${atPath}[${i}]`);
            if (!r.ok) return r;
        }
    } else {
        for (const key of Object.keys(value)) {
            const r = hasNoFunctions(value[key], `${atPath}.${key}`);
            if (!r.ok) return r;
        }
    }
    return { ok: true };
}

// ── Sample transactions ───────────────────────────────────────────────────────

const TX_SUCCESS = {
    txId: 'TX-001', transactionType: 'agent-task', startedAt: '2026-06-19T00:00:00Z',
    durationMs: 1200, constitutionVerdict: 'pass',
    founderScore: 0.85, twinScore: 0.80, finalDecisionScore: 0.83,
    outcomeSuccess: true, outcomeCategory: 'compute',
    compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed',
};
const TX_FAILURE = {
    txId: 'TX-002', transactionType: 'agent-task', startedAt: '2026-06-19T00:01:00Z',
    durationMs: 800, constitutionVerdict: 'fail',
    founderScore: 0.40, twinScore: 0.35, finalDecisionScore: 0.38,
    outcomeSuccess: false, outcomeCategory: 'compute',
    compensationTriggered: true, rollbackTriggered: true, executionStatus: 'rolled-back',
};
const TX_PARTIAL = {
    txId: 'TX-003', transactionType: 'memory-write', startedAt: '2026-06-19T00:02:00Z',
    durationMs: 300, constitutionVerdict: 'conditional',
    founderScore: 0.65, twinScore: 0.70, finalDecisionScore: 0.68,
    outcomeSuccess: true, outcomeCategory: 'memory',
    compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed',
};

// ── Populate store for most sections ─────────────────────────────────────────
reset();
recordOutcome(TX_SUCCESS);
recordOutcome(TX_FAILURE);
recordOutcome(TX_PARTIAL);

const ev1 = evaluate();
const ev2 = evaluate();
const ev3 = evaluate();

// ── Section 1: evaluate() output shape ───────────────────────────────────────
{
    const REQUIRED_KEYS = [
        'sampleSize', 'successRate', 'rollbackRate', 'compensationRate',
        'avgDuration', 'decisionAgreement', 'constitutionOverrideRate',
        'executionStability', 'driftIndicator',
        'generatedAt', 'deterministic', 'descriptiveOnly',
    ];
    for (const key of REQUIRED_KEYS) {
        assert(`1.x evaluate() has key: ${key}`, key in ev1);
    }
    assert('1.01 evaluate() has exactly 12 keys', Object.keys(ev1).length === 12,
        `Got: ${Object.keys(ev1).join(', ')}`);
    assert('1.02 sampleSize is number',      typeof ev1.sampleSize      === 'number');
    assert('1.03 generatedAt is null',        ev1.generatedAt === null);
    assert('1.04 deterministic is true',      ev1.deterministic === true);
    assert('1.05 descriptiveOnly is true',    ev1.descriptiveOnly === true);
    assert('1.06 successRate in [0,1]',
        ev1.successRate === null || (ev1.successRate >= 0 && ev1.successRate <= 1));
    assert('1.07 rollbackRate in [0,1]',
        ev1.rollbackRate === null || (ev1.rollbackRate >= 0 && ev1.rollbackRate <= 1));
    assert('1.08 compensationRate in [0,1]',
        ev1.compensationRate === null || (ev1.compensationRate >= 0 && ev1.compensationRate <= 1));
    assert('1.09 avgDuration is number or null',
        ev1.avgDuration === null || typeof ev1.avgDuration === 'number');
    assert('1.10 decisionAgreement in [0,1] or null',
        ev1.decisionAgreement === null || (ev1.decisionAgreement >= 0 && ev1.decisionAgreement <= 1));
    assert('1.11 executionStability in [0,1] or null',
        ev1.executionStability === null || (ev1.executionStability >= 0 && ev1.executionStability <= 1));
}

// ── Section 2: evaluate() correctness ────────────────────────────────────────
{
    // 3 records: 2 success (TX-001, TX-003), 1 failure (TX-002)
    assert('2.01 sampleSize = 3',         ev1.sampleSize === 3);
    assert('2.02 successRate = 2/3',      Math.abs(ev1.successRate - 2/3) < 1e-5);
    // 1 rollback out of 3
    assert('2.03 rollbackRate = 1/3',     Math.abs(ev1.rollbackRate - 1/3) < 1e-5);
    // 1 compensation out of 3
    assert('2.04 compensationRate = 1/3', Math.abs(ev1.compensationRate - 1/3) < 1e-5);
    // avgDuration = (1200+800+300)/3 = 766.6̄
    assert('2.05 avgDuration ≈ 766.6667', Math.abs(ev1.avgDuration - 766.6667) < 0.01);
    // constitutionOverrideRate: 2 out of 3 verdicts are non-pass (fail, conditional)
    assert('2.06 constitutionOverrideRate = 2/3', Math.abs(ev1.constitutionOverrideRate - 2/3) < 1e-5);
    // driftIndicator null when < 10 records
    assert('2.07 driftIndicator null for < 10 records', ev1.driftIndicator === null);
}

// ── Section 3: Determinism ────────────────────────────────────────────────────
{
    assert('3.01 ev1 === ev2 JSON', JSON.stringify(ev1) === JSON.stringify(ev2));
    assert('3.02 ev1 === ev3 JSON', JSON.stringify(ev1) === JSON.stringify(ev3));
    assert('3.03 sampleSize identical', ev1.sampleSize === ev2.sampleSize);
    assert('3.04 successRate identical', ev1.successRate === ev2.successRate);
    assert('3.05 rollbackRate identical', ev1.rollbackRate === ev2.rollbackRate);
    assert('3.06 compensationRate identical', ev1.compensationRate === ev2.compensationRate);
    assert('3.07 avgDuration identical', ev1.avgDuration === ev2.avgDuration);
    assert('3.08 decisionAgreement identical', ev1.decisionAgreement === ev2.decisionAgreement);
}

// ── Section 4: Frozen outputs ─────────────────────────────────────────────────
{
    const evalCheck = isDeepFrozen(ev1, 'evaluate()');
    assert('4.01 evaluate() output is deeply frozen', evalCheck.ok,
        evalCheck.ok ? '' : `Not frozen at: ${evalCheck.path}`);
    assert('4.02 evaluate() top level frozen', Object.isFrozen(ev1));
}

// ── Section 5: No functions in evaluate() output ──────────────────────────────
{
    const fnCheck = hasNoFunctions(ev1, 'evaluate()');
    assert('5.01 evaluate() output has no functions', fnCheck.ok,
        fnCheck.ok ? '' : `Function at: ${fnCheck.path}`);
    for (const [key, val] of Object.entries(ev1)) {
        assert(`5.x key "${key}" is not a function`, typeof val !== 'function');
    }
}

// ── Section 6: No shared references ──────────────────────────────────────────
{
    assert('6.01 ev1 !== ev2 (distinct objects)', ev1 !== ev2);
    assert('6.02 ev1 !== ev3 (distinct objects)', ev1 !== ev3);
}

// ── Section 7: recordOutcome — frozen stored records ─────────────────────────
{
    reset();
    recordOutcome(TX_SUCCESS);
    const snap = getEvaluationSnapshot();
    const stored = snap.records[0];
    assert('7.01 stored record is frozen', Object.isFrozen(stored));
    const before = stored.outcomeSuccess;
    try { stored.outcomeSuccess = !before; } catch (_) {}
    assert('7.02 stored record cannot be mutated', stored.outcomeSuccess === before);

    // recordOutcome(null) must not throw or add a record
    reset();
    recordOutcome(null);
    recordOutcome(undefined);
    recordOutcome('string');
    assert('7.03 invalid inputs ignored', evaluate().sampleSize === 0);

    // Restore 3 records for later sections
    reset();
    recordOutcome(TX_SUCCESS);
    recordOutcome(TX_FAILURE);
    recordOutcome(TX_PARTIAL);
}

// ── Section 8: Append-only ordering ──────────────────────────────────────────
{
    reset();
    const txA = { txId: 'A', outcomeSuccess: true,  rollbackTriggered: false, compensationTriggered: false };
    const txB = { txId: 'B', outcomeSuccess: false, rollbackTriggered: true,  compensationTriggered: false };
    const txC = { txId: 'C', outcomeSuccess: true,  rollbackTriggered: false, compensationTriggered: false };
    recordOutcome(txA);
    recordOutcome(txB);
    recordOutcome(txC);
    const snap = getEvaluationSnapshot();
    assert('8.01 records preserve insertion order', snap.records[0].txId === 'A');
    assert('8.02 records preserve insertion order', snap.records[1].txId === 'B');
    assert('8.03 records preserve insertion order', snap.records[2].txId === 'C');
    assert('8.04 recordCount matches sampleSize',   snap.recordCount === evaluate().sampleSize);

    // Restore
    reset();
    recordOutcome(TX_SUCCESS);
    recordOutcome(TX_FAILURE);
    recordOutcome(TX_PARTIAL);
}

// ── Section 9: Rolling window (MAX_RECORDS = 10000) ───────────────────────────
{
    reset();
    const dummy = { outcomeSuccess: true, rollbackTriggered: false, compensationTriggered: false };
    for (let i = 0; i < 10001; i++) recordOutcome({ ...dummy, txId: `ROLL-${i}` });
    const rollingEval = evaluate();
    assert('9.01 sampleSize capped at 10000 after 10001 inserts', rollingEval.sampleSize === 10000,
        `Got: ${rollingEval.sampleSize}`);
    const rollingSnap = getEvaluationSnapshot();
    assert('9.02 ROLL-0 was dropped (oldest evicted)',    !rollingSnap.records.some(r => r.txId === 'ROLL-0'));
    assert('9.03 ROLL-10000 present (newest kept)',        rollingSnap.records.some(r => r.txId === 'ROLL-10000'));
    assert('9.04 ROLL-1 still present (only ROLL-0 evicted)', rollingSnap.records.some(r => r.txId === 'ROLL-1'));
    assert('9.05 recordCount equals 10000',                rollingSnap.recordCount === 10000);

    // Restore
    reset();
    recordOutcome(TX_SUCCESS);
    recordOutcome(TX_FAILURE);
    recordOutcome(TX_PARTIAL);
}

// ── Section 10: evaluateAgainst() shape + correctness ─────────────────────────
{
    const baseline = evaluate();

    // Add a 4th success to improve successRate
    recordOutcome({
        txId: 'TX-004', transactionType: 'agent-task',
        durationMs: 900, constitutionVerdict: 'pass',
        founderScore: 0.90, twinScore: 0.88, finalDecisionScore: 0.89,
        outcomeSuccess: true, compensationTriggered: false, rollbackTriggered: false,
    });
    const cmp = evaluateAgainst(baseline);

    const REQUIRED_CMP = ['improved', 'regressionDetected', 'deltaSuccess', 'deltaRollback', 'deltaLatency', 'deltaAgreement', 'deterministic'];
    for (const key of REQUIRED_CMP) assert(`10.x evaluateAgainst() has key: ${key}`, key in cmp);
    assert('10.01 evaluateAgainst() has exactly 7 keys', Object.keys(cmp).length === 7,
        `Got: ${Object.keys(cmp).join(', ')}`);
    assert('10.02 deterministic is true', cmp.deterministic === true);
    assert('10.03 deltaSuccess is number', typeof cmp.deltaSuccess === 'number');
    assert('10.04 deltaSuccess > 0 after adding success', cmp.deltaSuccess > 0);
    assert('10.05 deltaRollback <= 0 (no new rollbacks)', cmp.deltaRollback <= 0);
    assert('10.06 improved = true when success up, rollback flat', cmp.improved === true);
    assert('10.07 regressionDetected = false', cmp.regressionDetected === false);
    assert('10.08 output is frozen', Object.isFrozen(cmp));

    // evaluateAgainst(null) returns nulls
    const cmpNull = evaluateAgainst(null);
    assert('10.09 evaluateAgainst(null) improved = null',           cmpNull.improved === null);
    assert('10.10 evaluateAgainst(null) regressionDetected = null', cmpNull.regressionDetected === null);
    assert('10.11 evaluateAgainst(null) deltaSuccess = null',       cmpNull.deltaSuccess === null);
    assert('10.12 evaluateAgainst(null) deterministic = true',      cmpNull.deterministic === true);

    // Regression scenario: clear and add only failures
    reset();
    recordOutcome({ txId: 'F1', outcomeSuccess: false, rollbackTriggered: true, compensationTriggered: true });
    recordOutcome({ txId: 'F2', outcomeSuccess: false, rollbackTriggered: true, compensationTriggered: false });
    const regCmp = evaluateAgainst(baseline);
    assert('10.13 regressionDetected = true when success down', regCmp.regressionDetected === true);
    assert('10.14 improved = false during regression', regCmp.improved === false);

    // Restore
    reset();
    recordOutcome(TX_SUCCESS);
    recordOutcome(TX_FAILURE);
    recordOutcome(TX_PARTIAL);
}

// ── Section 11: getEvaluationSnapshot() shape ────────────────────────────────
{
    const snap = getEvaluationSnapshot();
    assert('11.01 snapshot has key version',       'version'       in snap);
    assert('11.02 snapshot has key recordCount',   'recordCount'   in snap);
    assert('11.03 snapshot has key records',       'records'       in snap);
    assert('11.04 snapshot has key snapshotAt',    'snapshotAt'    in snap);
    assert('11.05 snapshot has key deterministic', 'deterministic' in snap);
    assert('11.06 snapshot has exactly 5 keys',    Object.keys(snap).length === 5,
        `Got: ${Object.keys(snap).join(', ')}`);
    assert('11.07 snapshotAt is null',             snap.snapshotAt === null);
    assert('11.08 deterministic is true',          snap.deterministic === true);
    assert('11.09 recordCount === sampleSize',     snap.recordCount === evaluate().sampleSize);
    assert('11.10 records is frozen array',        Object.isFrozen(snap.records));
    assert('11.11 snapshot is frozen',             Object.isFrozen(snap));
    const snapFreezeCheck = isDeepFrozen(snap, 'getEvaluationSnapshot()');
    assert('11.12 snapshot is deeply frozen', snapFreezeCheck.ok,
        snapFreezeCheck.ok ? '' : `Not frozen at: ${snapFreezeCheck.path}`);
}

// ── Section 12: reset() ───────────────────────────────────────────────────────
{
    reset();
    assert('12.01 sampleSize = 0 after reset', evaluate().sampleSize === 0);
    assert('12.02 successRate = null after reset', evaluate().successRate === null);
    assert('12.03 rollbackRate = null after reset', evaluate().rollbackRate === null);
    assert('12.04 recordCount = 0 after reset', getEvaluationSnapshot().recordCount === 0);
    assert('12.05 records = [] after reset', getEvaluationSnapshot().records.length === 0);
    // Restore
    recordOutcome(TX_SUCCESS);
    recordOutcome(TX_FAILURE);
    recordOutcome(TX_PARTIAL);
}

// ── Section 13: Empty store edge cases ───────────────────────────────────────
{
    reset();
    const empty = evaluate();
    assert('13.01 empty sampleSize = 0',              empty.sampleSize === 0);
    assert('13.02 empty successRate = null',           empty.successRate === null);
    assert('13.03 empty rollbackRate = null',          empty.rollbackRate === null);
    assert('13.04 empty compensationRate = null',      empty.compensationRate === null);
    assert('13.05 empty avgDuration = null',           empty.avgDuration === null);
    assert('13.06 empty decisionAgreement = null',     empty.decisionAgreement === null);
    assert('13.07 empty constitutionOverrideRate = null', empty.constitutionOverrideRate === null);
    assert('13.08 empty executionStability = null',   empty.executionStability === null);
    assert('13.09 empty driftIndicator = null',       empty.driftIndicator === null);
    assert('13.10 empty generatedAt = null',          empty.generatedAt === null);
    assert('13.11 empty deterministic = true',        empty.deterministic === true);
    assert('13.12 empty descriptiveOnly = true',      empty.descriptiveOnly === true);
    // Restore
    recordOutcome(TX_SUCCESS);
    recordOutcome(TX_FAILURE);
    recordOutcome(TX_PARTIAL);
}

// ── Section 14: driftIndicator with >= 10 records ────────────────────────────
{
    reset();
    // 10 records: first 2 fail, last 8 succeed — expect positive drift
    for (let i = 0; i < 2;  i++) recordOutcome({ txId: `D-${i}`, outcomeSuccess: false, rollbackTriggered: false, compensationTriggered: false });
    for (let i = 2; i < 10; i++) recordOutcome({ txId: `D-${i}`, outcomeSuccess: true,  rollbackTriggered: false, compensationTriggered: false });
    const driftEval = evaluate();
    assert('14.01 driftIndicator not null for 10 records', driftEval.driftIndicator !== null);
    assert('14.02 driftIndicator is number',               typeof driftEval.driftIndicator === 'number');
    assert('14.03 driftIndicator > 0 when improving',      driftEval.driftIndicator > 0);

    // All failing → drift = 0 (both windows have rate 0)
    reset();
    for (let i = 0; i < 10; i++) recordOutcome({ txId: `DF-${i}`, outcomeSuccess: false, rollbackTriggered: false, compensationTriggered: false });
    assert('14.04 driftIndicator = 0 when stable failure', evaluate().driftIndicator === 0);

    // Restore
    reset();
    recordOutcome(TX_SUCCESS);
    recordOutcome(TX_FAILURE);
    recordOutcome(TX_PARTIAL);
}

// ── Section 15: Static import analysis — no forbidden imports ─────────────────
{
    const src = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'execution-evaluator.js'), 'utf8'
    );

    // No relative imports at all
    const relRe = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    const relImports = [];
    let m;
    while ((m = relRe.exec(src)) !== null) relImports.push(m[1]);
    assert('15.01 execution-evaluator has 0 relative imports', relImports.length === 0,
        `Found: ${relImports.join(', ')}`);

    // No forbidden absolute imports
    const FORBIDDEN = [
        'execution-transaction', 'concurrency-slot-manager', 'compensation-log',
        'petl-middleware', 'constitutional-gate', 'constitutional-preflight',
        'decision-lattice', 'invariant-compiler',
        'lattice-feedback-loop', 'lattice-health-signal', 'lattice-calibration-advisor',
        'governance-manifest', 'recorder-policy', 'governance-contract',
        'governance-compiler', 'governance-attestation', 'governance-reproducibility',
        'governance-traceability',
    ];
    const absRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    const allImports = [];
    while ((m = absRe.exec(src)) !== null) allImports.push(m[1]);
    for (const forbidden of FORBIDDEN) {
        assert(`15.x does not import ${forbidden}`,
            !allImports.some(r => r.includes(forbidden)));
    }

    // Forbidden path prefixes
    const FORBIDDEN_PREFIXES = [
        '../memory/', './memory/', '../feedback/', './feedback/',
        '../health/', './health/', '../advisor/', './advisor/',
        '../runtime/', './governance/',
    ];
    for (const prefix of FORBIDDEN_PREFIXES) {
        assert(`15.x no imports from ${prefix}`, !relImports.some(r => r.startsWith(prefix)));
    }

    // MAX_RECORDS = 10000 present in source
    assert('15.02 MAX_RECORDS = 10000 in source', src.includes('MAX_RECORDS') && src.includes('10000'));
    // No require() calls at all (truly import-free)
    assert('15.03 execution-evaluator has 0 total require() calls', allImports.length === 0,
        `Found: ${allImports.join(', ')}`);
}

// ── Section 16: module.exports shape ─────────────────────────────────────────
{
    const evalExports = require('./lib/runtime/execution-evaluator');
    const keys = Object.keys(evalExports);
    assert('16.01 exports exactly 5 keys', keys.length === 5,
        `Got: ${keys.join(', ')}`);
    assert('16.02 exports recordOutcome',        keys.includes('recordOutcome'));
    assert('16.03 exports evaluate',             keys.includes('evaluate'));
    assert('16.04 exports evaluateAgainst',      keys.includes('evaluateAgainst'));
    assert('16.05 exports reset',                keys.includes('reset'));
    assert('16.06 exports getEvaluationSnapshot', keys.includes('getEvaluationSnapshot'));
    assert('16.07 recordOutcome is function',    typeof evalExports.recordOutcome        === 'function');
    assert('16.08 evaluate is function',         typeof evalExports.evaluate             === 'function');
    assert('16.09 evaluateAgainst is function',  typeof evalExports.evaluateAgainst      === 'function');
    assert('16.10 reset is function',            typeof evalExports.reset                === 'function');
    assert('16.11 getEvaluationSnapshot fn',     typeof evalExports.getEvaluationSnapshot === 'function');

    // Output of evaluate() and getEvaluationSnapshot() contain no functions
    reset();
    recordOutcome(TX_SUCCESS);
    const sample = evalExports.evaluate();
    const fnCheck = hasNoFunctions(sample, 'evaluate()');
    assert('16.12 evaluate() output has no functions', fnCheck.ok,
        fnCheck.ok ? '' : `Function at: ${fnCheck.path}`);
}

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('EXECUTION EVALUATOR is append-only, deterministic, frozen, and import-free.');
}
