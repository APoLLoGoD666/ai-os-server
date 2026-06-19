'use strict';
// validate-outcome-registry.js
// Validation suite for lib/runtime/outcome-registry.js

const fs   = require('fs');
const path = require('path');

const { buildRegistry, createContext } = require('./lib/runtime/outcome-registry');

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

// ── Sample outcomes ───────────────────────────────────────────────────────────
// 4 records: 3 success (R1,R3,R4), 1 failure (R2)
// scores: [0.88, 0.35, 0.72, 0.63]

const OUTCOMES = Object.freeze([
    Object.freeze({ txId: 'R1', transactionType: 'agent-task',    startedAt: '2026-01-01T00:00:00Z', durationMs: 100, constitutionVerdict: 'pass',        founderScore: 0.90, twinScore: 0.85, finalDecisionScore: 0.88, outcomeSuccess: true,  outcomeCategory: 'compute', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed'   }),
    Object.freeze({ txId: 'R2', transactionType: 'agent-task',    startedAt: '2026-01-01T00:01:00Z', durationMs: 200, constitutionVerdict: 'fail',         founderScore: 0.30, twinScore: 0.25, finalDecisionScore: 0.35, outcomeSuccess: false, outcomeCategory: 'compute', compensationTriggered: true,  rollbackTriggered: true,  executionStatus: 'rolled_back' }),
    Object.freeze({ txId: 'R3', transactionType: 'memory-write',  startedAt: '2026-01-01T00:02:00Z', durationMs: 50,  constitutionVerdict: 'pass',        founderScore: 0.75, twinScore: 0.70, finalDecisionScore: 0.72, outcomeSuccess: true,  outcomeCategory: 'memory',  compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed'   }),
    Object.freeze({ txId: 'R4', transactionType: 'agent-task',    startedAt: '2026-01-01T00:03:00Z', durationMs: 300, constitutionVerdict: 'conditional',  founderScore: 0.60, twinScore: 0.65, finalDecisionScore: 0.63, outcomeSuccess: true,  outcomeCategory: 'compute', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed'   }),
]);

const snap = buildRegistry(OUTCOMES);

// ── Section 1: createContext() shape ─────────────────────────────────────────

console.log('Section 1: createContext() shape');
{
    const ctx = createContext();
    assert('1.01 returns object',             ctx !== null && typeof ctx === 'object');
    assert('1.02 exactly 9 keys',             Object.keys(ctx).length === 9,
        `Got: ${Object.keys(ctx).join(', ')}`);
    assert('1.03 registryVersion is string',  typeof ctx.registryVersion === 'string');
    assert('1.04 registryFields is array',    Array.isArray(ctx.registryFields));
    assert('1.05 fieldCount = 19',            ctx.fieldCount === 19);
    assert('1.06 fieldCount === registryFields.length', ctx.fieldCount === ctx.registryFields.length);
    assert('1.07 authorityLevel = NONE',      ctx.authorityLevel === 'NONE');
    assert('1.08 deterministic = true',       ctx.deterministic === true);
    assert('1.09 descriptiveOnly = true',     ctx.descriptiveOnly === true);
    assert('1.10 runtimeIntegrated = false',  ctx.runtimeIntegrated === false);
    assert('1.11 executionInfluence = false', ctx.executionInfluence === false);
    assert('1.12 createdAt = null',           ctx.createdAt === null);
    assert('1.13 frozen',                     isFrozen(ctx));
}

// ── Section 2: buildRegistry() output shape ──────────────────────────────────

console.log('\nSection 2: buildRegistry() output shape');
{
    const EXPECTED_KEYS = [
        'registryVersion', 'recordCount', 'timeRange', 'outcomeDistribution',
        'successDistribution', 'confidenceDistribution', 'decisionDistribution',
        'consistencyTrend', 'benchmarkSummary', 'evaluationCoverage',
        'counterfactualCoverage', 'qualityIndicators', 'registryHash',
        'generatedAt', 'runtimeIntegrated', 'authorityLevel',
        'executionInfluence', 'deterministic', 'descriptiveOnly',
    ];
    for (const k of EXPECTED_KEYS) assert(`2.x has key: ${k}`, k in snap);
    assert('2.01 exactly 19 keys',            Object.keys(snap).length === 19,
        `Got: ${Object.keys(snap).join(', ')}`);
    assert('2.02 recordCount is number',      typeof snap.recordCount === 'number');
    assert('2.03 registryHash is string',     typeof snap.registryHash === 'string');
    assert('2.04 generatedAt = null',         snap.generatedAt === null);
    assert('2.05 runtimeIntegrated = false',  snap.runtimeIntegrated === false);
    assert('2.06 executionInfluence = false', snap.executionInfluence === false);
    assert('2.07 authorityLevel = NONE',      snap.authorityLevel === 'NONE');
    assert('2.08 deterministic = true',       snap.deterministic === true);
    assert('2.09 descriptiveOnly = true',     snap.descriptiveOnly === true);
    assert('2.10 timeRange is object',        typeof snap.timeRange === 'object');
    assert('2.11 successDistribution is obj', typeof snap.successDistribution === 'object');
    assert('2.12 confidenceDistribution is obj', typeof snap.confidenceDistribution === 'object');
    assert('2.13 benchmarkSummary is obj',    typeof snap.benchmarkSummary === 'object');
    assert('2.14 evaluationCoverage is obj',  typeof snap.evaluationCoverage === 'object');
    assert('2.15 qualityIndicators is obj',   typeof snap.qualityIndicators === 'object');
}

// ── Section 3: metric correctness ────────────────────────────────────────────
// scores [0.88,0.35,0.72,0.63], 3 success/1 failure

console.log('\nSection 3: metric correctness');
{
    assert('3.01 recordCount = 4',                          snap.recordCount === 4);
    assert('3.02 successDistribution.succeeded = 3',        snap.successDistribution.succeeded === 3);
    assert('3.03 successDistribution.failed = 1',           snap.successDistribution.failed === 1);
    assert('3.04 successDistribution.unknown = 0',          snap.successDistribution.unknown === 0);
    assert('3.05 successDistribution.successRate = 0.75',   Math.abs(snap.successDistribution.successRate - 0.75) < 1e-5);
    assert('3.06 timeRange.earliest is 2026-01-01T00:00',   snap.timeRange.earliest === '2026-01-01T00:00:00Z');
    assert('3.07 timeRange.latest is 2026-01-01T00:03',     snap.timeRange.latest   === '2026-01-01T00:03:00Z');
    assert('3.08 outcomeDistribution.compute = 3',          snap.outcomeDistribution.compute === 3);
    assert('3.09 outcomeDistribution.memory = 1',           snap.outcomeDistribution.memory === 1);
    assert('3.10 decisionDistribution[agent-task] = 3',     snap.decisionDistribution['agent-task'] === 3);
    assert('3.11 decisionDistribution[memory-write] = 1',   snap.decisionDistribution['memory-write'] === 1);
    assert('3.12 confidenceDistribution.count = 4',         snap.confidenceDistribution.count === 4);
    assert('3.13 confidenceDistribution.min ≈ 0.35',        Math.abs(snap.confidenceDistribution.min - 0.35) < 1e-6);
    assert('3.14 confidenceDistribution.max ≈ 0.88',        Math.abs(snap.confidenceDistribution.max - 0.88) < 1e-6);
    assert('3.15 confidenceDistribution.mean ≈ 0.645',      Math.abs(snap.confidenceDistribution.mean - 0.645) < 1e-5);
    assert('3.16 benchmarkSummary.avgDecisionScore ≈ 0.645', Math.abs(snap.benchmarkSummary.avgDecisionScore - 0.645) < 1e-5);
    assert('3.17 benchmarkSummary.avgDuration = 162.5',      Math.abs(snap.benchmarkSummary.avgDuration - 162.5) < 1e-3);
    assert('3.18 benchmarkSummary.rollbackRate = 0.25',      Math.abs(snap.benchmarkSummary.rollbackRate - 0.25) < 1e-5);
    assert('3.19 benchmarkSummary.compensationRate = 0.25',  Math.abs(snap.benchmarkSummary.compensationRate - 0.25) < 1e-5);
    assert('3.20 evaluationCoverage.total = 4',              snap.evaluationCoverage.total === 4);
    assert('3.21 evaluationCoverage.withBoth = 4',           snap.evaluationCoverage.withBoth === 4);
    assert('3.22 evaluationCoverage.coverageRate = 1.0',     Math.abs(snap.evaluationCoverage.coverageRate - 1.0) < 1e-6);
    assert('3.23 counterfactualCoverage.eligible = 4',       snap.counterfactualCoverage.eligible === 4);
    assert('3.24 counterfactualCoverage.coverageRate = 1.0', Math.abs(snap.counterfactualCoverage.coverageRate - 1.0) < 1e-6);
    assert('3.25 qualityIndicators.overallQuality in [0,1]', snap.qualityIndicators.overallQuality >= 0 && snap.qualityIndicators.overallQuality <= 1);
    assert('3.26 qualityIndicators.dataCompleteness = 1.0',  Math.abs(snap.qualityIndicators.dataCompleteness - 1.0) < 1e-6);
}

// ── Section 4: consistencyTrend correctness ───────────────────────────────────
// early=[R1,R2] success=1/2=0.5; late=[R3,R4] success=2/2=1.0; delta=0.5

console.log('\nSection 4: consistencyTrend');
{
    const ct = snap.consistencyTrend;
    assert('4.01 consistencyTrend is object',             ct !== null && typeof ct === 'object');
    assert('4.02 has early, late, delta, improving',      'early' in ct && 'late' in ct && 'delta' in ct && 'improving' in ct);
    assert('4.03 early.successRate ≈ 0.5',                Math.abs(ct.early.successRate - 0.5) < 1e-5);
    assert('4.04 late.successRate = 1.0',                 Math.abs(ct.late.successRate - 1.0) < 1e-5);
    assert('4.05 delta ≈ 0.5',                            Math.abs(ct.delta - 0.5) < 1e-5);
    assert('4.06 improving = true',                       ct.improving === true);
    assert('4.07 early.avgScore ≈ 0.615',                 Math.abs(ct.early.avgScore - 0.615) < 1e-3);
    assert('4.08 late.avgScore ≈ 0.675',                  Math.abs(ct.late.avgScore - 0.675) < 1e-3);

    // Declining trend: reverse the records
    const reversed = buildRegistry([OUTCOMES[3], OUTCOMES[2], OUTCOMES[1], OUTCOMES[0]]);
    assert('4.09 reversed records → declining trend', reversed.consistencyTrend.delta <= 0);
}

// ── Section 5: determinism ────────────────────────────────────────────────────

console.log('\nSection 5: determinism');
{
    const s1 = buildRegistry(OUTCOMES);
    const s2 = buildRegistry(OUTCOMES);
    const s3 = buildRegistry(OUTCOMES);
    assert('5.01 JSON r1 === r2',              JSON.stringify(s1) === JSON.stringify(s2));
    assert('5.02 JSON r1 === r3',              JSON.stringify(s1) === JSON.stringify(s3));
    assert('5.03 s1 !== s2 (distinct objects)', s1 !== s2);
    assert('5.04 registryHash identical',       s1.registryHash === s2.registryHash);
    assert('5.05 recordCount identical',        s1.recordCount  === s2.recordCount);
    assert('5.06 successRate identical',        s1.successDistribution.successRate === s2.successDistribution.successRate);
}

// ── Section 6: no mutation of inputs ─────────────────────────────────────────

console.log('\nSection 6: no mutation');
{
    const mutable = [
        { txId: 'M1', finalDecisionScore: 0.7, outcomeSuccess: true,  transactionType: 'agent-task', outcomeCategory: 'compute' },
        { txId: 'M2', finalDecisionScore: 0.4, outcomeSuccess: false, transactionType: 'agent-task', outcomeCategory: 'compute' },
    ];
    const before = JSON.stringify(mutable);
    buildRegistry(mutable);
    assert('6.01 input array not mutated',   JSON.stringify(mutable) === before);
    assert('6.02 first record not mutated',  mutable[0].txId === 'M1');
}

// ── Section 7: deep freeze ────────────────────────────────────────────────────

console.log('\nSection 7: deep freeze');
{
    assert('7.01 buildRegistry() output is frozen',          isFrozen(snap));
    assert('7.02 timeRange is frozen',                       isFrozen(snap.timeRange));
    assert('7.03 successDistribution is frozen',             isFrozen(snap.successDistribution));
    assert('7.04 confidenceDistribution is frozen',          isFrozen(snap.confidenceDistribution));
    assert('7.05 consistencyTrend is frozen',                isFrozen(snap.consistencyTrend));
    assert('7.06 qualityIndicators is frozen',               isFrozen(snap.qualityIndicators));
    assert('7.07 buildRegistry([]) is frozen',               isFrozen(buildRegistry([])));
    assert('7.08 buildRegistry(null) is frozen',             isFrozen(buildRegistry(null)));

    let threw = false;
    try { snap.recordCount = 999; } catch (_) { threw = true; }
    assert('7.09 output rejects mutation',  threw || snap.recordCount !== 999);
}

// ── Section 8: no functions in output ────────────────────────────────────────

console.log('\nSection 8: no functions in output');
{
    assert('8.01 buildRegistry() output has no functions', !hasFunctions(snap));
    assert('8.02 createContext() output has no functions', !hasFunctions(createContext()));
    assert('8.03 buildRegistry([]) has no functions',      !hasFunctions(buildRegistry([])));
}

// ── Section 9: edge cases ─────────────────────────────────────────────────────

console.log('\nSection 9: edge cases');
{
    const empty = buildRegistry([]);
    assert('9.01 empty → recordCount = 0',                     empty.recordCount === 0);
    assert('9.02 empty → successDistribution.successRate null', empty.successDistribution.successRate === null);
    assert('9.03 empty → timeRange.earliest null',              empty.timeRange.earliest === null);
    assert('9.04 empty → confidenceDistribution.count = 0',    empty.confidenceDistribution.count === 0);
    assert('9.05 empty → benchmarkSummary.avgDecisionScore null', empty.benchmarkSummary.avgDecisionScore === null);
    assert('9.06 empty → evaluationCoverage.coverageRate null', empty.evaluationCoverage.coverageRate === null);
    assert('9.07 empty → qualityIndicators.overallQuality null', empty.qualityIndicators.overallQuality === null);
    assert('9.08 empty → deterministic = true',                 empty.deterministic === true);

    const nullIn = buildRegistry(null);
    assert('9.09 buildRegistry(null) → recordCount = 0', nullIn.recordCount === 0);

    const withNull = buildRegistry([null, undefined, 'string', 42]);
    assert('9.10 non-object entries filtered → recordCount = 0', withNull.recordCount === 0);

    const single = buildRegistry([{ txId: 'S1', finalDecisionScore: 0.8, outcomeSuccess: true, transactionType: 'test', outcomeCategory: 'test', startedAt: '2026-01-01T00:00:00Z', durationMs: 100, rollbackTriggered: false, compensationTriggered: false }]);
    assert('9.11 single record → consistencyTrend.delta null', single.consistencyTrend.delta === null);
    assert('9.12 single record → recordCount = 1',             single.recordCount === 1);
}

// ── Section 10: registryHash stability ───────────────────────────────────────

console.log('\nSection 10: registryHash stability');
{
    const h1 = buildRegistry(OUTCOMES).registryHash;
    const h2 = buildRegistry(OUTCOMES).registryHash;
    assert('10.01 hash is 8-char hex',          /^[0-9a-f]{8}$/.test(h1));
    assert('10.02 same input → same hash',       h1 === h2);
    assert('10.03 different input → different hash', h1 !== buildRegistry([OUTCOMES[0]]).registryHash);
    assert('10.04 empty → hash is still a string',  typeof buildRegistry([]).registryHash === 'string');
}

// ── Section 11: qualityIndicators ranges ─────────────────────────────────────

console.log('\nSection 11: qualityIndicators ranges');
{
    const qi = snap.qualityIndicators;
    assert('11.01 overallQuality in [0,1]',      qi.overallQuality >= 0 && qi.overallQuality <= 1);
    assert('11.02 dataCompleteness in [0,1]',    qi.dataCompleteness >= 0 && qi.dataCompleteness <= 1);
    assert('11.03 decisionConsistency in [0,1] or null',
        qi.decisionConsistency === null || (qi.decisionConsistency >= 0 && qi.decisionConsistency <= 1));
    assert('11.04 calibrationScore in [0,1] or null',
        qi.calibrationScore === null || (qi.calibrationScore >= 0 && qi.calibrationScore <= 1));

    // All-success, high scores → high quality
    const highQ = buildRegistry([
        { txId: 'HQ1', finalDecisionScore: 0.9, outcomeSuccess: true,  transactionType: 'test', outcomeCategory: 'test', durationMs: 100, rollbackTriggered: false, compensationTriggered: false },
        { txId: 'HQ2', finalDecisionScore: 0.85, outcomeSuccess: true, transactionType: 'test', outcomeCategory: 'test', durationMs: 100, rollbackTriggered: false, compensationTriggered: false },
    ]);
    assert('11.05 all-success → overallQuality > 0.5', highQ.qualityIndicators.overallQuality > 0.5);
}

// ── Section 12: static analysis — zero imports ────────────────────────────────

console.log('\nSection 12: static analysis — zero imports');
{
    const src = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'outcome-registry.js'), 'utf8'
    );
    const allRequires = src.match(/require\s*\(/g) || [];
    assert('12.01 zero require() calls total',           allRequires.length === 0,
        `Found ${allRequires.length} require() calls`);
    assert('12.02 no governance imports',                !/require\s*\(\s*['"][^'"]*governance/g.test(src));
    assert('12.03 no execution-transaction import',      !/require\s*\(\s*['"][^'"]*execution-transaction/g.test(src));
    assert('12.04 no decision-lattice import',           !/require\s*\(\s*['"][^'"]*decision-lattice/g.test(src));
    assert('12.05 no memory imports',                    !/require\s*\(\s*['"][^'"]*memory/g.test(src));
    assert('12.06 authorityLevel NONE in source',        /authorityLevel\s*:\s*'NONE'/.test(src));
    assert('12.07 executionInfluence false in source',   src.includes('executionInfluence:') && !src.includes("executionInfluence: true"));
    assert('12.08 REGISTRY_VERSION in source',           src.includes('REGISTRY_VERSION'));
    assert('12.09 no runtimeIntegrated: true',           !src.includes("runtimeIntegrated: true"));
    assert('12.10 djb2 hash defined locally',            src.includes('_djb2'));
}

// ── Section 13: module.exports shape ─────────────────────────────────────────

console.log('\nSection 13: module.exports shape');
{
    const mod  = require('./lib/runtime/outcome-registry');
    const keys = Object.keys(mod).sort();
    assert('13.01 exactly 2 exports',       keys.length === 2,
        `Got: ${keys.join(', ')}`);
    assert('13.02 exports buildRegistry',   typeof mod.buildRegistry === 'function');
    assert('13.03 exports createContext',   typeof mod.createContext === 'function');
    assert('13.04 no extra exports',        JSON.stringify(keys) === JSON.stringify(['buildRegistry', 'createContext']));
    assert('13.05 output has no functions', !hasFunctions(mod.buildRegistry(OUTCOMES)));
    assert('13.06 context has no functions', !hasFunctions(mod.createContext()));
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
    console.log('OUTCOME REGISTRY is deterministic, frozen, and import-free.');
}
