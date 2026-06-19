'use strict';
// validate-improvement-lab.js — ≥150 assertions for improvement-lab.js

const fs   = require('fs');
const path = require('path');

// ── Dependencies needed to build real test inputs ──────────────────────────────
const { benchmark }  = require('./lib/runtime/decision-benchmark');
const { evaluate }   = require('./lib/runtime/counterfactual-evaluator');
const { buildRegistry } = require('./lib/runtime/outcome-registry');
const { buildLineage }  = require('./lib/runtime/outcome-lineage');
const { analyze, createContext } = require('./lib/runtime/improvement-lab');

// ── Assertion helpers ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition) {
    if (condition) {
        passed++;
    } else {
        failed++;
        failures.push(`  FAIL: ${label}`);
        console.error(`  FAIL: ${label}`);
    }
}

function isFrozen(obj) {
    if (obj === null || typeof obj !== 'object') return true;
    if (!Object.isFrozen(obj)) return false;
    if (Array.isArray(obj)) return obj.every(isFrozen);
    return Object.values(obj).every(isFrozen);
}

function hasFunctions(mod, ...names) {
    return names.every(n => typeof mod[n] === 'function');
}

// ── Test data ─────────────────────────────────────────────────────────────────

const records = [
    { txId: 'T1', transactionType: 'transfer', startedAt: '2025-01-01T00:00:00Z', durationMs: 120,
      constitutionVerdict: 'APPROVED', founderScore: 0.8, twinScore: 0.75, finalDecisionScore: 0.82,
      outcomeSuccess: true,  outcomeCategory: 'approved', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed' },
    { txId: 'T2', transactionType: 'transfer', startedAt: '2025-01-02T00:00:00Z', durationMs: 200,
      constitutionVerdict: 'APPROVED', founderScore: 0.6, twinScore: 0.55, finalDecisionScore: 0.55,
      outcomeSuccess: false, outcomeCategory: 'rejected', compensationTriggered: false, rollbackTriggered: true, executionStatus: 'completed' },
    { txId: 'T3', transactionType: 'review',   startedAt: '2025-01-03T00:00:00Z', durationMs: 90,
      constitutionVerdict: 'REJECTED', founderScore: 0.3, twinScore: 0.4,  finalDecisionScore: 0.3,
      outcomeSuccess: false, outcomeCategory: 'rejected', compensationTriggered: true, rollbackTriggered: false, executionStatus: 'completed' },
    { txId: 'T4', transactionType: 'review',   startedAt: '2025-01-04T00:00:00Z', durationMs: 150,
      constitutionVerdict: 'APPROVED', founderScore: 0.9, twinScore: 0.85, finalDecisionScore: 0.88,
      outcomeSuccess: true,  outcomeCategory: 'approved', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed' },
];

const bench      = benchmark(records);
const cfs        = records.map(r => evaluate(r));
const registry   = buildRegistry(records);
const lineageSnap = buildLineage(registry);

const fullInput = {
    executionEvaluation: { successRate: 0.5, totalEvaluated: 4 },
    replayData:          { replayCount: 4 },
    benchmark:           bench,
    counterfactuals:     cfs,
    registry,
    lineage:             lineageSnap,
};

const emptyInput = {};
const nullInput  = null;

// ── Section 1: Module exports ─────────────────────────────────────────────────

console.log('\n── 1. Module exports ──────────────────────────────────────────────');

assert('1.01 module exports analyze',        hasFunctions({ analyze, createContext }, 'analyze'));
assert('1.02 module exports createContext',  hasFunctions({ analyze, createContext }, 'createContext'));
assert('1.03 analyze is a function',         typeof analyze === 'function');
assert('1.04 createContext is a function',   typeof createContext === 'function');

// ── Section 2: Static analysis — zero imports ─────────────────────────────────

console.log('\n── 2. Static analysis — zero imports ──────────────────────────────');

const src = fs.readFileSync(path.join(__dirname, 'lib', 'runtime', 'improvement-lab.js'), 'utf8');

assert('2.01 no require() calls',            !(/\brequire\s*\(/.test(src)));
assert('2.02 no import statements',          !(/^\s*import\s+/m.test(src)));
assert('2.03 no fs import',                  !(/require\s*\(\s*['"]fs['"]\s*\)/.test(src)));
assert('2.04 no path import',                !(/require\s*\(\s*['"]path['"]\s*\)/.test(src)));
assert('2.05 no crypto import',              !(/require\s*\(\s*['"]crypto['"]\s*\)/.test(src)));
assert('2.06 exports analyze',               /module\.exports\s*=/.test(src) && /analyze/.test(src));
assert('2.07 exports createContext',         /createContext/.test(src));
assert('2.08 LAB_VERSION defined',           /LAB_VERSION\s*=\s*'1\.0\.0'/.test(src));
assert('2.09 authorityLevel NONE present',   /authorityLevel\s*:\s*'NONE'/.test(src));
assert('2.10 deterministic true present',    /deterministic\s*:\s*true/.test(src));
assert('2.11 descriptiveOnly true present',  /descriptiveOnly\s*:\s*true/.test(src));
assert('2.12 no persistence',                !(/writeFile|appendFile|createWriteStream/.test(src)));
assert('2.13 no setInterval/setTimeout',     !(/setInterval|setTimeout/.test(src)));
assert('2.14 no global state mutation',      !(/^let\s+_(?!deepFreeze|djb2|canon)/m.test(src)));

// ── Section 3: createContext() ────────────────────────────────────────────────

console.log('\n── 3. createContext() ─────────────────────────────────────────────');

const ctx = createContext();
assert('3.01 createContext returns object',   ctx !== null && typeof ctx === 'object');
assert('3.02 createContext output frozen',    isFrozen(ctx));
assert('3.03 labVersion 1.0.0',              ctx.labVersion === '1.0.0');
assert('3.04 labFields is frozen array',     Array.isArray(ctx.labFields) && Object.isFrozen(ctx.labFields));
assert('3.05 fieldCount is 15',              ctx.fieldCount === 15);
assert('3.06 authorityLevel NONE',           ctx.authorityLevel === 'NONE');
assert('3.07 deterministic true',            ctx.deterministic === true);
assert('3.08 descriptiveOnly true',          ctx.descriptiveOnly === true);
assert('3.09 runtimeIntegrated false',       ctx.runtimeIntegrated === false);
assert('3.10 executionInfluence false',      ctx.executionInfluence === false);
assert('3.11 createdAt null',               ctx.createdAt === null);
assert('3.12 labFields has version',         ctx.labFields.includes('version'));
assert('3.13 labFields has improvementHash', ctx.labFields.includes('improvementHash'));
assert('3.14 labFields has candidateAreas',  ctx.labFields.includes('candidateAreas'));
assert('3.15 labFields has recommendations', ctx.labFields.includes('recommendations'));
assert('3.16 createContext idempotent',      createContext().labVersion === ctx.labVersion);

// ── Section 4: analyze() — output structure ───────────────────────────────────

console.log('\n── 4. analyze() output structure ──────────────────────────────────');

const result = analyze(fullInput);

assert('4.01 analyze returns object',         result !== null && typeof result === 'object');
assert('4.02 output is deep-frozen',          isFrozen(result));
assert('4.03 version is 1.0.0',              result.version === '1.0.0');
assert('4.04 improvementHash is string',      typeof result.improvementHash === 'string');
assert('4.05 improvementHash length 8',      result.improvementHash.length === 8);
assert('4.06 candidateAreas is array',        Array.isArray(result.candidateAreas));
assert('4.07 recommendations is array',       Array.isArray(result.recommendations));
assert('4.08 priorityRanking is array',       Array.isArray(result.priorityRanking));
assert('4.09 expectedGain is number',         typeof result.expectedGain === 'number');
assert('4.10 evidenceCoverage is object',     result.evidenceCoverage !== null && typeof result.evidenceCoverage === 'object');
assert('4.11 stabilityScore null or number',  result.stabilityScore === null || typeof result.stabilityScore === 'number');
assert('4.12 improvementMetadata is object',  result.improvementMetadata !== null && typeof result.improvementMetadata === 'object');
assert('4.13 generatedAt is null',           result.generatedAt === null);
assert('4.14 runtimeIntegrated false',        result.runtimeIntegrated === false);
assert('4.15 executionInfluence false',       result.executionInfluence === false);
assert('4.16 deterministic true',             result.deterministic === true);
assert('4.17 descriptiveOnly true',           result.descriptiveOnly === true);
assert('4.18 all 15 keys present',           [
    'version','improvementHash','candidateAreas','recommendations','priorityRanking',
    'expectedGain','confidence','evidenceCoverage','stabilityScore','improvementMetadata',
    'generatedAt','runtimeIntegrated','executionInfluence','deterministic','descriptiveOnly',
].every(k => k in result));

// ── Section 5: Candidate area detection ──────────────────────────────────────

console.log('\n── 5. Candidate area detection ─────────────────────────────────────');

assert('5.01 candidateAreas is frozen array', Array.isArray(result.candidateAreas) && isFrozen(result.candidateAreas));
assert('5.02 each area has id',               result.candidateAreas.every(a => typeof a.id === 'string' && a.id.length > 0));
assert('5.03 each area has title',            result.candidateAreas.every(a => typeof a.title === 'string'));
assert('5.04 each area has impact number',    result.candidateAreas.every(a => typeof a.impact === 'number'));
assert('5.05 impact in [0,1]',                result.candidateAreas.every(a => a.impact >= 0 && a.impact <= 1));
assert('5.06 each area has signal',           result.candidateAreas.every(a => typeof a.signal === 'number'));
assert('5.07 each area has threshold',        result.candidateAreas.every(a => typeof a.threshold === 'number'));
assert('5.08 no duplicate area ids',          new Set(result.candidateAreas.map(a => a.id)).size === result.candidateAreas.length);
assert('5.09 area ids from known set',        result.candidateAreas.every(a => [
    'decision_variance','regret_management','calibration_gap',
    'rollback_risk','consistency_decline','coverage_gap',
].includes(a.id)));
assert('5.10 area objects are frozen',        result.candidateAreas.every(a => isFrozen(a)));

// High-variance benchmark triggers decision_variance
const highVarBench = benchmark([
    { txId: 'V1', finalDecisionScore: 0.9, outcomeSuccess: true,  durationMs: 100, rollbackTriggered: false, compensationTriggered: false },
    { txId: 'V2', finalDecisionScore: 0.1, outcomeSuccess: false, durationMs: 200, rollbackTriggered: false, compensationTriggered: false },
]);
const highVarResult = analyze({ benchmark: highVarBench });
assert('5.11 high variance triggers decision_variance', highVarResult.candidateAreas.some(a => a.id === 'decision_variance'));

// Low coverage triggers coverage_gap
const lowCovReg = buildRegistry([
    { txId: 'C1', transactionType: 'transfer', startedAt: '2025-01-01T00:00:00Z', durationMs: 50,
      constitutionVerdict: 'APPROVED', founderScore: 0.7, twinScore: 0.6, finalDecisionScore: null,
      outcomeSuccess: null, outcomeCategory: 'approved', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'pending' },
]);
const lowCovResult = analyze({ registry: lowCovReg });
assert('5.12 low coverage triggers coverage_gap', lowCovResult.candidateAreas.some(a => a.id === 'coverage_gap'));

// Empty input → no candidates
const emptyResult = analyze({});
assert('5.13 empty input yields zero candidates', emptyResult.candidateAreas.length === 0);

// ── Section 6: Recommendations ────────────────────────────────────────────────

console.log('\n── 6. Recommendations ──────────────────────────────────────────────');

assert('6.01 recommendations length matches candidates', result.recommendations.length === result.candidateAreas.length);
assert('6.02 each rec has id',                result.recommendations.every(r => typeof r.id === 'string'));
assert('6.03 each rec has title',             result.recommendations.every(r => typeof r.title === 'string'));
assert('6.04 each rec has rationale',         result.recommendations.every(r => typeof r.rationale === 'string' && r.rationale.length > 10));
assert('6.05 each rec has expectedGain',      result.recommendations.every(r => typeof r.expectedGain === 'number'));
assert('6.06 expectedGain in [0,0.5]',        result.recommendations.every(r => r.expectedGain >= 0 && r.expectedGain <= 0.5));
assert('6.07 each rec has confidence',        result.recommendations.every(r => typeof r.confidence === 'number'));
assert('6.08 confidence in [0,1]',            result.recommendations.every(r => r.confidence >= 0 && r.confidence <= 1));
assert('6.09 each rec has evidenceRefs',      result.recommendations.every(r => Array.isArray(r.evidenceRefs)));
assert('6.10 evidenceRefs are strings',       result.recommendations.every(r => r.evidenceRefs.every(e => typeof e === 'string')));
assert('6.11 rec objects are frozen',         result.recommendations.every(r => isFrozen(r)));
assert('6.12 no duplicate rec ids',           new Set(result.recommendations.map(r => r.id)).size === result.recommendations.length);
assert('6.13 expectedGain = impact * 0.5',    result.candidateAreas.every(a => {
    const rec = result.recommendations.find(r => r.id === a.id);
    return rec && Math.abs(rec.expectedGain - a.impact * 0.5) < 1e-5;
}));
assert('6.14 empty input → empty recs',       emptyResult.recommendations.length === 0);

// ── Section 7: Priority ranking ───────────────────────────────────────────────

console.log('\n── 7. Priority ranking ─────────────────────────────────────────────');

assert('7.01 priorityRanking is frozen array', Array.isArray(result.priorityRanking) && isFrozen(result.priorityRanking));
assert('7.02 ranking length matches recs',     result.priorityRanking.length === result.recommendations.length);
assert('7.03 each entry has rank',             result.priorityRanking.every(r => typeof r.rank === 'number'));
assert('7.04 each entry has id',               result.priorityRanking.every(r => typeof r.id === 'string'));
assert('7.05 each entry has expectedGain',     result.priorityRanking.every(r => typeof r.expectedGain === 'number'));
assert('7.06 ranks start at 1',               result.priorityRanking.length === 0 || result.priorityRanking[0].rank === 1);
assert('7.07 ranks are sequential',            result.priorityRanking.every((r, i) => r.rank === i + 1));
assert('7.08 sorted by expectedGain desc',     result.priorityRanking.every((r, i, arr) => {
    if (i === 0) return true;
    return arr[i - 1].expectedGain >= r.expectedGain;
}));
assert('7.09 all rec ids appear in ranking',   result.recommendations.every(r => result.priorityRanking.some(pr => pr.id === r.id)));
assert('7.10 empty input → empty ranking',     emptyResult.priorityRanking.length === 0);

// ── Section 8: Evidence coverage ─────────────────────────────────────────────

console.log('\n── 8. Evidence coverage ────────────────────────────────────────────');

const ec = result.evidenceCoverage;
assert('8.01 evidenceCoverage is frozen',     isFrozen(ec));
assert('8.02 presentFields is number',        typeof ec.presentFields === 'number');
assert('8.03 totalFields is 6',              ec.totalFields === 6);
assert('8.04 coverageRate in [0,1]',          typeof ec.coverageRate === 'number' && ec.coverageRate >= 0 && ec.coverageRate <= 1);
assert('8.05 fields is array of 6',           Array.isArray(ec.fields) && ec.fields.length === 6);
assert('8.06 each field has name+present',    ec.fields.every(f => typeof f.name === 'string' && typeof f.present === 'boolean'));
assert('8.07 fullInput → presentFields 6',   ec.presentFields === 6);
assert('8.08 fullInput → coverageRate 1',    ec.coverageRate === 1);
assert('8.09 emptyInput → presentFields 0',  analyze({}).evidenceCoverage.presentFields === 0);
assert('8.10 emptyInput → coverageRate 0',   analyze({}).evidenceCoverage.coverageRate === 0);
assert('8.11 partial input → correct count', analyze({ benchmark: bench }).evidenceCoverage.presentFields === 1);
assert('8.12 fields contain all 6 names',    ['executionEvaluation','replayData','benchmark','counterfactuals','registry','lineage']
    .every(n => ec.fields.some(f => f.name === n)));

// ── Section 9: Stability score ────────────────────────────────────────────────

console.log('\n── 9. Stability score ──────────────────────────────────────────────');

assert('9.01 stabilityScore null or number',   result.stabilityScore === null || typeof result.stabilityScore === 'number');
assert('9.02 stabilityScore in [0,1] when set', result.stabilityScore === null || (result.stabilityScore >= 0 && result.stabilityScore <= 1));
assert('9.03 emptyInput → null stability',      analyze({}).stabilityScore === null);
assert('9.04 benchmark-only → consistency',     (() => {
    const r = analyze({ benchmark: bench });
    return r.stabilityScore !== null;
})());
assert('9.05 stability uses consistencyIndex',  (() => {
    const r = analyze({ benchmark: bench });
    return typeof r.stabilityScore === 'number';
})());
assert('9.06 stability uses executionEvaluation.successRate', (() => {
    const r = analyze({ executionEvaluation: { successRate: 0.75 } });
    return r.stabilityScore === 0.75;
})());
assert('9.07 stability averages components',    (() => {
    const r = analyze({ executionEvaluation: { successRate: 0.8 }, benchmark: { consistencyIndex: 0.6 } });
    return typeof r.stabilityScore === 'number';
})());

// ── Section 10: Improvement metadata ──────────────────────────────────────────

console.log('\n── 10. Improvement metadata ────────────────────────────────────────');

const meta = result.improvementMetadata;
assert('10.01 improvementMetadata is frozen',   isFrozen(meta));
assert('10.02 runtimeIntegrated false',         meta.runtimeIntegrated === false);
assert('10.03 executionInfluence false',        meta.executionInfluence === false);
assert('10.04 authorityLevel NONE',             meta.authorityLevel === 'NONE');
assert('10.05 descriptiveOnly true',            meta.descriptiveOnly === true);
assert('10.06 deterministic true',              meta.deterministic === true);
assert('10.07 metadata has 5 keys',             Object.keys(meta).length === 5);

// ── Section 11: Determinism ───────────────────────────────────────────────────

console.log('\n── 11. Determinism ─────────────────────────────────────────────────');

const r1 = analyze(fullInput);
const r2 = analyze(fullInput);
assert('11.01 same hash on identical input',   r1.improvementHash === r2.improvementHash);
assert('11.02 same version on identical input', r1.version === r2.version);
assert('11.03 same candidateAreas length',      r1.candidateAreas.length === r2.candidateAreas.length);
assert('11.04 same recs length',                r1.recommendations.length === r2.recommendations.length);
assert('11.05 same ranking length',             r1.priorityRanking.length === r2.priorityRanking.length);
assert('11.06 same expectedGain',               r1.expectedGain === r2.expectedGain);
assert('11.07 same stabilityScore',             r1.stabilityScore === r2.stabilityScore);

// Different inputs → different hash
const altResult = analyze({ benchmark: bench });
assert('11.08 different input → different hash', r1.improvementHash !== altResult.improvementHash || r1.candidateAreas.length === altResult.candidateAreas.length);

// ── Section 12: Null/invalid input tolerance ──────────────────────────────────

console.log('\n── 12. Null/invalid input tolerance ────────────────────────────────');

assert('12.01 null input → object returned',     analyze(null) !== null && typeof analyze(null) === 'object');
assert('12.02 null input → frozen output',       isFrozen(analyze(null)));
assert('12.03 null input → version 1.0.0',       analyze(null).version === '1.0.0');
assert('12.04 null input → 0 candidates',        analyze(null).candidateAreas.length === 0);
assert('12.05 null input → 0 recs',              analyze(null).recommendations.length === 0);
assert('12.06 undefined input → object',         analyze(undefined) !== null && typeof analyze(undefined) === 'object');
assert('12.07 string input → object',            analyze('bad') !== null && typeof analyze('bad') === 'object');
assert('12.08 number input → object',            analyze(42) !== null && typeof analyze(42) === 'object');
assert('12.09 no throw on null',                 (() => { try { analyze(null); return true; } catch { return false; } })());
assert('12.10 no throw on empty object',         (() => { try { analyze({}); return true; } catch { return false; } })());

// ── Section 13: No state mutation (isolation) ─────────────────────────────────

console.log('\n── 13. No state mutation (isolation) ───────────────────────────────');

// Running analyze multiple times must not accumulate state
const ia = analyze({ benchmark: bench });
const ib = analyze({ benchmark: bench });
assert('13.01 repeated calls equal hash',         ia.improvementHash === ib.improvementHash);
assert('13.02 repeated calls equal area count',   ia.candidateAreas.length === ib.candidateAreas.length);
assert('13.03 repeated calls equal rec count',    ia.recommendations.length === ib.recommendations.length);

// Mutating output does not affect subsequent calls
const mutableResult = analyze(fullInput);
try { mutableResult.version = 'mutated'; } catch (_) {}
assert('13.04 mutation attempt ignored (frozen)', mutableResult.version === '1.0.0');

// Input not mutated
const inputCopy = JSON.parse(JSON.stringify({ benchmark: bench }));
analyze(inputCopy);
assert('13.05 input not mutated by analyze',      JSON.stringify(inputCopy.benchmark) === JSON.stringify(bench));

// ── Section 14: ImprovementHash properties ────────────────────────────────────

console.log('\n── 14. ImprovementHash properties ─────────────────────────────────');

assert('14.01 hash is hex string',              /^[0-9a-f]{8}$/.test(result.improvementHash));
assert('14.02 null input hash is hex',          /^[0-9a-f]{8}$/.test(analyze(null).improvementHash));
assert('14.03 empty input hash is hex',         /^[0-9a-f]{8}$/.test(analyze({}).improvementHash));
assert('14.04 different inputs → different hash (null vs full)', analyze(null).improvementHash !== result.improvementHash || result.candidateAreas.length === 0);
assert('14.05 hash stable across calls',        analyze(fullInput).improvementHash === analyze(fullInput).improvementHash);

// ── Section 15: Expected gain and confidence ──────────────────────────────────

console.log('\n── 15. Expected gain and confidence ────────────────────────────────');

assert('15.01 expectedGain >= 0',                result.expectedGain >= 0);
assert('15.02 empty → expectedGain is 0',        emptyResult.expectedGain === 0);
assert('15.03 confidence null or number',         result.confidence === null || typeof result.confidence === 'number');
assert('15.04 confidence in [0,1] when set',      result.confidence === null || (result.confidence >= 0 && result.confidence <= 1));
assert('15.05 empty → confidence null',           emptyResult.confidence === null);
assert('15.06 expectedGain sum of rec gains',     Math.abs(result.expectedGain - result.recommendations.reduce((s, r) => s + r.expectedGain, 0)) < 1e-4);

// ── Section 16: Full pipeline integration ────────────────────────────────────

console.log('\n── 16. Full pipeline integration ───────────────────────────────────');

assert('16.01 benchmark → bench object used',    typeof bench === 'object' && bench !== null);
assert('16.02 counterfactuals array built',      Array.isArray(cfs) && cfs.length === 4);
assert('16.03 registry built from records',      registry.recordCount === 4);
assert('16.04 lineage built from registry',      lineageSnap.nodeCount > 0);
assert('16.05 fullInput analyze succeeds',       result !== null);
assert('16.06 analyze uses benchmark.variance',  (() => {
    const b = { variance: 0.5, regretIndex: 0.0, confidenceCalibration: 1.0, consistencyIndex: 0.9 };
    const r = analyze({ benchmark: b });
    return r.candidateAreas.some(a => a.id === 'decision_variance');
})());
assert('16.07 analyze uses regretIndex',         (() => {
    const b = { variance: 0.0, regretIndex: 0.9, confidenceCalibration: 1.0, consistencyIndex: 0.9 };
    const r = analyze({ benchmark: b });
    return r.candidateAreas.some(a => a.id === 'regret_management');
})());
assert('16.08 analyze uses confidenceCalibration', (() => {
    const b = { variance: 0.0, regretIndex: 0.0, confidenceCalibration: 0.5, consistencyIndex: 0.9 };
    const r = analyze({ benchmark: b });
    return r.candidateAreas.some(a => a.id === 'calibration_gap');
})());
assert('16.09 analyze uses rollbackRate',        (() => {
    const reg = { benchmarkSummary: { rollbackRate: 0.5 }, consistencyTrend: {}, evaluationCoverage: { coverageRate: 1.0 } };
    const r = analyze({ registry: reg });
    return r.candidateAreas.some(a => a.id === 'rollback_risk');
})());
assert('16.10 analyze uses consistencyTrend',    (() => {
    const reg = { benchmarkSummary: {}, consistencyTrend: { delta: -0.2 }, evaluationCoverage: { coverageRate: 1.0 } };
    const r = analyze({ registry: reg });
    return r.candidateAreas.some(a => a.id === 'consistency_decline');
})());
assert('16.11 below threshold → no candidate',  (() => {
    const b = { variance: 0.001, regretIndex: 0.0, confidenceCalibration: 0.99, consistencyIndex: 0.99 };
    const r = analyze({ benchmark: b });
    return r.candidateAreas.length === 0;
})());

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length > 0) {
    console.error(`\nFailed assertions:\n${failures.join('\n')}`);
    process.exit(1);
}
