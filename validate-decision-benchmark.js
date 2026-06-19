'use strict';
// validate-decision-benchmark.js
// Validation suite for lib/runtime/decision-benchmark.js

const fs   = require('fs');
const path = require('path');

const { benchmark, createContext } = require('./lib/runtime/decision-benchmark');

let passed = 0, failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) { passed++; }
    else { failed++; failures.push(`FAIL [${label}]${detail ? '\n       ' + detail : ''}`); }
}

function isFrozen(obj) {
    if (obj === null || typeof obj !== 'object') return true;
    if (!Object.isFrozen(obj)) return false;
    if (Array.isArray(obj)) return obj.every(isFrozen);
    return Object.values(obj).every(isFrozen);
}

function hasFunctions(obj) {
    if (typeof obj === 'function') return true;
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(hasFunctions);
}

// ── Sample records ────────────────────────────────────────────────────────────
// scores: [0.9, 0.8, 0.4, 0.6]  — 3 success, 1 failure

const RECORDS = Object.freeze([
    Object.freeze({ txId: 'D1', finalDecisionScore: 0.9, outcomeSuccess: true,  constitutionVerdict: 'pass',        founderScore: 0.85, twinScore: 0.80, compensationTriggered: false, rollbackTriggered: false }),
    Object.freeze({ txId: 'D2', finalDecisionScore: 0.8, outcomeSuccess: true,  constitutionVerdict: 'pass',        founderScore: 0.75, twinScore: 0.70, compensationTriggered: false, rollbackTriggered: false }),
    Object.freeze({ txId: 'D3', finalDecisionScore: 0.4, outcomeSuccess: false, constitutionVerdict: 'fail',        founderScore: 0.30, twinScore: 0.35, compensationTriggered: true,  rollbackTriggered: true  }),
    Object.freeze({ txId: 'D4', finalDecisionScore: 0.6, outcomeSuccess: true,  constitutionVerdict: 'conditional', founderScore: 0.55, twinScore: 0.60, compensationTriggered: false, rollbackTriggered: false }),
]);

const report = benchmark(RECORDS);

// ── Section 1: createContext() output shape ───────────────────────────────────

console.log('Section 1: createContext() output shape');
{
    const ctx = createContext();
    assert('1.01 returns object',              ctx !== null && typeof ctx === 'object');
    assert('1.02 exactly 8 keys',              Object.keys(ctx).length === 8);
    assert('1.03 benchmarkVersion is string',  typeof ctx.benchmarkVersion === 'string');
    assert('1.04 metrics is array',            Array.isArray(ctx.metrics));
    assert('1.05 metricsCount = 8',            ctx.metricsCount === 8);
    assert('1.06 metricsCount === metrics.length', ctx.metricsCount === ctx.metrics.length);
    assert('1.07 authorityLevel is NONE',      ctx.authorityLevel === 'NONE');
    assert('1.08 deterministic is true',       ctx.deterministic === true);
    assert('1.09 descriptiveOnly is true',     ctx.descriptiveOnly === true);
    assert('1.10 runtimeIntegrated is false',  ctx.runtimeIntegrated === false);
    assert('1.11 createdAt is null',           ctx.createdAt === null);
    assert('1.12 metrics includes decisionCount', ctx.metrics.includes('decisionCount'));
    assert('1.13 metrics includes regretIndex',   ctx.metrics.includes('regretIndex'));
}

// ── Section 2: benchmark() output shape ──────────────────────────────────────

console.log('\nSection 2: benchmark() output shape');
{
    const EXPECTED_KEYS = [
        'decisionCount', 'successRate', 'averageOutcome', 'variance',
        'regretIndex', 'consistencyIndex', 'confidenceCalibration', 'distributionSummary',
        'generatedAt', 'deterministic', 'descriptiveOnly',
    ];
    for (const k of EXPECTED_KEYS) assert(`2.x has key: ${k}`, k in report);
    assert('2.01 exactly 11 keys',           Object.keys(report).length === 11,
        `Got: ${Object.keys(report).join(', ')}`);
    assert('2.02 decisionCount is number',   typeof report.decisionCount === 'number');
    assert('2.03 generatedAt is null',       report.generatedAt === null);
    assert('2.04 deterministic is true',     report.deterministic === true);
    assert('2.05 descriptiveOnly is true',   report.descriptiveOnly === true);
    assert('2.06 distributionSummary is obj', typeof report.distributionSummary === 'object');
    assert('2.07 distributionSummary has min',    'min'    in report.distributionSummary);
    assert('2.08 distributionSummary has max',    'max'    in report.distributionSummary);
    assert('2.09 distributionSummary has median', 'median' in report.distributionSummary);
    assert('2.10 distributionSummary has p25',    'p25'    in report.distributionSummary);
    assert('2.11 distributionSummary has p75',    'p75'    in report.distributionSummary);
    assert('2.12 distributionSummary has stddev', 'stddev' in report.distributionSummary);
    assert('2.13 distributionSummary has 6 keys', Object.keys(report.distributionSummary).length === 6);
}

// ── Section 3: Metric correctness ────────────────────────────────────────────
// scores: [0.9, 0.8, 0.4, 0.6], 3 success/1 failure
// mean = 0.675, variance = 0.036875, stddev ≈ 0.192028

console.log('\nSection 3: metric correctness');
{
    assert('3.01 decisionCount = 4',                   report.decisionCount === 4);
    assert('3.02 successRate = 0.75',                  Math.abs(report.successRate - 0.75) < 1e-5);
    assert('3.03 averageOutcome ≈ 0.675',               Math.abs(report.averageOutcome - 0.675) < 1e-5);
    assert('3.04 variance ≈ 0.036875',                 Math.abs(report.variance - 0.036875) < 1e-5);
    assert('3.05 regretIndex = 0.4 (only D3 failed)',  Math.abs(report.regretIndex - 0.4) < 1e-5);
    assert('3.06 consistencyIndex in [0,1]',           report.consistencyIndex >= 0 && report.consistencyIndex <= 1);
    assert('3.07 confidenceCalibration ≈ 0.925',       Math.abs(report.confidenceCalibration - 0.925) < 1e-5);
    assert('3.08 distributionSummary.min = 0.4',       Math.abs(report.distributionSummary.min - 0.4) < 1e-6);
    assert('3.09 distributionSummary.max = 0.9',       Math.abs(report.distributionSummary.max - 0.9) < 1e-6);
    assert('3.10 distributionSummary.median ≈ 0.7',    Math.abs(report.distributionSummary.median - 0.7) < 1e-5);
    assert('3.11 distributionSummary.p25 ≈ 0.55',      Math.abs(report.distributionSummary.p25 - 0.55) < 1e-5);
    assert('3.12 distributionSummary.p75 ≈ 0.825',     Math.abs(report.distributionSummary.p75 - 0.825) < 1e-5);
    assert('3.13 distributionSummary.stddev > 0',      report.distributionSummary.stddev > 0);
    assert('3.14 successRate in [0,1]',                report.successRate >= 0 && report.successRate <= 1);
    assert('3.15 averageOutcome in [0,1]',             report.averageOutcome >= 0 && report.averageOutcome <= 1);
    assert('3.16 variance >= 0',                       report.variance >= 0);
    assert('3.17 regretIndex in [0,1]',                report.regretIndex >= 0 && report.regretIndex <= 1);
    assert('3.18 confidenceCalibration in [0,1]',      report.confidenceCalibration >= 0 && report.confidenceCalibration <= 1);
}

// ── Section 4: Determinism ────────────────────────────────────────────────────

console.log('\nSection 4: determinism');
{
    const r1 = benchmark(RECORDS);
    const r2 = benchmark(RECORDS);
    const r3 = benchmark(RECORDS);
    assert('4.01 r1 JSON === r2 JSON',           JSON.stringify(r1) === JSON.stringify(r2));
    assert('4.02 r1 JSON === r3 JSON',           JSON.stringify(r1) === JSON.stringify(r3));
    assert('4.03 r1 !== r2 (distinct objects)',  r1 !== r2);
    assert('4.04 successRate identical',         r1.successRate === r2.successRate);
    assert('4.05 averageOutcome identical',      r1.averageOutcome === r2.averageOutcome);
    assert('4.06 variance identical',            r1.variance === r2.variance);
    assert('4.07 regretIndex identical',         r1.regretIndex === r2.regretIndex);
    assert('4.08 distributionSummary JSON ===',  JSON.stringify(r1.distributionSummary) === JSON.stringify(r2.distributionSummary));
}

// ── Section 5: No mutation of inputs ─────────────────────────────────────────

console.log('\nSection 5: no mutation of inputs');
{
    const mutable = [
        { txId: 'M1', finalDecisionScore: 0.7, outcomeSuccess: true },
        { txId: 'M2', finalDecisionScore: 0.5, outcomeSuccess: false },
    ];
    const before = JSON.stringify(mutable);
    benchmark(mutable);
    assert('5.01 input array not mutated',  JSON.stringify(mutable) === before);
    assert('5.02 input records not mutated', mutable[0].txId === 'M1' && mutable[1].txId === 'M2');
}

// ── Section 6: Deep freeze ────────────────────────────────────────────────────

console.log('\nSection 6: deep freeze');
{
    assert('6.01 benchmark() output is frozen',              isFrozen(report));
    assert('6.02 distributionSummary is frozen',             isFrozen(report.distributionSummary));
    assert('6.03 createContext() output is frozen',          isFrozen(createContext()));
    assert('6.04 benchmark([]) output is frozen',            isFrozen(benchmark([])));
    assert('6.05 benchmark(null) output is frozen',          isFrozen(benchmark(null)));

    let threw = false;
    try { report.decisionCount = 999; } catch (_) { threw = true; }
    assert('6.06 output rejects mutation (strict mode)',     threw || report.decisionCount !== 999);
}

// ── Section 7: No functions in output ────────────────────────────────────────

console.log('\nSection 7: no functions in output');
{
    assert('7.01 benchmark() has no functions',    !hasFunctions(report));
    assert('7.02 createContext() has no functions', !hasFunctions(createContext()));
    assert('7.03 benchmark([]) has no functions',  !hasFunctions(benchmark([])));
}

// ── Section 8: Edge cases ─────────────────────────────────────────────────────

console.log('\nSection 8: edge cases');
{
    const empty = benchmark([]);
    assert('8.01 empty → decisionCount = 0',             empty.decisionCount === 0);
    assert('8.02 empty → successRate = null',            empty.successRate === null);
    assert('8.03 empty → averageOutcome = null',         empty.averageOutcome === null);
    assert('8.04 empty → variance = null',               empty.variance === null);
    assert('8.05 empty → regretIndex = null',            empty.regretIndex === null);
    assert('8.06 empty → consistencyIndex = null',       empty.consistencyIndex === null);
    assert('8.07 empty → confidenceCalibration = null',  empty.confidenceCalibration === null);
    assert('8.08 empty → distributionSummary.min = null', empty.distributionSummary.min === null);
    assert('8.09 empty → generatedAt = null',            empty.generatedAt === null);
    assert('8.10 empty → deterministic = true',          empty.deterministic === true);

    const nullIn = benchmark(null);
    assert('8.11 benchmark(null) → decisionCount = 0',   nullIn.decisionCount === 0);
    assert('8.12 benchmark(null) → deterministic = true', nullIn.deterministic === true);

    const withNull = benchmark([null, undefined, 'string', 42]);
    assert('8.13 non-object records filtered → decisionCount = 0', withNull.decisionCount === 0);

    // Single record → variance null (requires ≥ 2)
    const single = benchmark([{ txId: 'S1', finalDecisionScore: 0.8, outcomeSuccess: true }]);
    assert('8.14 single record → variance = null',       single.variance === null);
    assert('8.15 single record → consistencyIndex = null', single.consistencyIndex === null);
    assert('8.16 single record → decisionCount = 1',     single.decisionCount === 1);

    // All success → regretIndex null
    const allSuccess = benchmark([
        { txId: 'AS1', finalDecisionScore: 0.8, outcomeSuccess: true },
        { txId: 'AS2', finalDecisionScore: 0.9, outcomeSuccess: true },
    ]);
    assert('8.17 all success → regretIndex = null', allSuccess.regretIndex === null);
}

// ── Section 9: regretIndex direction ─────────────────────────────────────────

console.log('\nSection 9: regretIndex direction');
{
    // High regret: failed with high confidence
    const highRegret = benchmark([
        { txId: 'HR1', finalDecisionScore: 0.95, outcomeSuccess: false },
        { txId: 'HR2', finalDecisionScore: 0.90, outcomeSuccess: false },
    ]);
    // Low regret: failed with low confidence
    const lowRegret = benchmark([
        { txId: 'LR1', finalDecisionScore: 0.1, outcomeSuccess: false },
        { txId: 'LR2', finalDecisionScore: 0.2, outcomeSuccess: false },
    ]);
    assert('9.01 high confidence failures → high regretIndex', highRegret.regretIndex > 0.5);
    assert('9.02 low confidence failures → low regretIndex',   lowRegret.regretIndex  < 0.5);
    assert('9.03 regretIndex > 0 for failures',               highRegret.regretIndex > 0);
}

// ── Section 10: confidenceCalibration direction ───────────────────────────────

console.log('\nSection 10: confidenceCalibration direction');
{
    // Perfectly calibrated: avg score = successRate
    // avg = 0.75, successRate = 0.75 (3/4 succeed, scores match)
    const calibrated = benchmark([
        { txId: 'C1', finalDecisionScore: 1.0, outcomeSuccess: true  },
        { txId: 'C2', finalDecisionScore: 0.5, outcomeSuccess: false },
    ]);
    // avg=0.75, successRate=0.5: calibration = 1-|0.75-0.5| = 0.75
    assert('10.01 calibration is number',        typeof calibrated.confidenceCalibration === 'number');
    assert('10.02 calibration in [0,1]',         calibrated.confidenceCalibration >= 0 && calibrated.confidenceCalibration <= 1);

    // Worst case: high score, all failures
    const miscal = benchmark([
        { txId: 'M1', finalDecisionScore: 0.9, outcomeSuccess: false },
        { txId: 'M2', finalDecisionScore: 0.95, outcomeSuccess: false },
    ]);
    // avg≈0.925, successRate=0: |0.925-0| = 0.925, calibration = 0.075
    assert('10.03 miscalibration: all-high-scores+all-failures → low calibration', miscal.confidenceCalibration < 0.2);
}

// ── Section 11: benchmark unchanged after repeated calls ─────────────────────

console.log('\nSection 11: repeated calls unchanged');
{
    const snap1 = JSON.stringify(benchmark(RECORDS));
    benchmark(RECORDS);
    benchmark(RECORDS);
    const snap2 = JSON.stringify(benchmark(RECORDS));
    assert('11.01 report unchanged after multiple calls', snap1 === snap2);
}

// ── Section 12: static analysis — zero imports ────────────────────────────────

console.log('\nSection 12: static analysis — zero imports');
{
    const src = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'decision-benchmark.js'), 'utf8'
    );
    const allRequires = src.match(/require\s*\(/g) || [];
    const relRequires = src.match(/require\s*\(\s*['"][./]/g) || [];
    assert('12.01 zero require() calls total',           allRequires.length === 0,
        `Found ${allRequires.length} require() calls`);
    assert('12.02 zero relative imports',                relRequires.length === 0);
    assert('12.03 no governance imports',                !/require\s*\(\s*['"][^'"]*governance/g.test(src));
    assert('12.04 no execution-transaction import',      !/require\s*\(\s*['"][^'"]*execution-transaction/g.test(src));
    assert('12.05 no decision-lattice import',           !/require\s*\(\s*['"][^'"]*decision-lattice/g.test(src));
    assert('12.06 no memory imports',                    !/require\s*\(\s*['"][^'"]*memory/g.test(src));
    assert('12.07 authorityLevel NONE in source',        /authorityLevel\s*:\s*'NONE'/.test(src));
    assert('12.08 BENCHMARK_VERSION in source',          src.includes('BENCHMARK_VERSION'));
    assert('12.09 no runtimeIntegrated: true',           !src.includes("runtimeIntegrated: true"));
}

// ── Section 13: module.exports shape ─────────────────────────────────────────

console.log('\nSection 13: module.exports shape');
{
    const mod  = require('./lib/runtime/decision-benchmark');
    const keys = Object.keys(mod).sort();
    assert('13.01 exactly 2 exports',           keys.length === 2,
        `Got: ${keys.join(', ')}`);
    assert('13.02 exports benchmark',           typeof mod.benchmark === 'function');
    assert('13.03 exports createContext',       typeof mod.createContext === 'function');
    assert('13.04 no extra exports',            JSON.stringify(keys) === JSON.stringify(['benchmark', 'createContext']));

    // Outputs contain no functions
    assert('13.05 benchmark() output has no functions',    !hasFunctions(mod.benchmark(RECORDS)));
    assert('13.06 createContext() output has no functions', !hasFunctions(mod.createContext()));
}

// ── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${'─'.repeat(48)}`);
console.log(`Passed: ${passed} / ${total}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('DECISION BENCHMARK is deterministic, frozen, and runtime-isolated.');
}
