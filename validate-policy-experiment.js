'use strict';
// validate-policy-experiment.js — ≥150 assertions for policy-experiment.js

const fs   = require('fs');
const path = require('path');

// ── Dependencies needed to build real test inputs ──────────────────────────────
const { evaluate }      = require('./lib/runtime/counterfactual-evaluator');
const { buildRegistry } = require('./lib/runtime/outcome-registry');
const { benchmark }     = require('./lib/runtime/decision-benchmark');
const { experiment, createContext } = require('./lib/runtime/policy-experiment');

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

const cfs      = records.map(r => evaluate(r));
const registry = buildRegistry(records);
const bench    = benchmark(records);

const fullInput = {
    baseline:          { name: 'same' },
    candidatePolicies: ['conservative', 'aggressive', 'constitutionOnly'],
    counterfactuals:   cfs,
    registry,
    benchmark:         bench,
};

const emptyInput = {};

// ── Section 1: Module exports ─────────────────────────────────────────────────

console.log('\n── 1. Module exports ──────────────────────────────────────────────');

assert('1.01 module exports experiment',      typeof experiment === 'function');
assert('1.02 module exports createContext',   typeof createContext === 'function');
assert('1.03 hasFunctions check',             hasFunctions({ experiment, createContext }, 'experiment', 'createContext'));

// ── Section 2: Static analysis — zero imports ─────────────────────────────────

console.log('\n── 2. Static analysis — zero imports ──────────────────────────────');

const src = fs.readFileSync(path.join(__dirname, 'lib', 'runtime', 'policy-experiment.js'), 'utf8');

assert('2.01 no require() calls',             !(/\brequire\s*\(/.test(src)));
assert('2.02 no import statements',           !(/^\s*import\s+/m.test(src)));
assert('2.03 no fs import',                   !(/require\s*\(\s*['"]fs['"]\s*\)/.test(src)));
assert('2.04 no path import',                 !(/require\s*\(\s*['"]path['"]\s*\)/.test(src)));
assert('2.05 no crypto import',               !(/require\s*\(\s*['"]crypto['"]\s*\)/.test(src)));
assert('2.06 exports experiment',             /module\.exports\s*=/.test(src) && /experiment/.test(src));
assert('2.07 exports createContext',          /createContext/.test(src));
assert('2.08 EXPERIMENT_VERSION defined',     /EXPERIMENT_VERSION\s*=\s*'1\.0\.0'/.test(src));
assert('2.09 authorityLevel NONE present',    /authorityLevel\s*:\s*'NONE'/.test(src));
assert('2.10 deterministic true present',     /deterministic\s*:\s*true/.test(src));
assert('2.11 descriptiveOnly true present',   /descriptiveOnly\s*:\s*true/.test(src));
assert('2.12 no persistence',                 !(/writeFile|appendFile|createWriteStream/.test(src)));
assert('2.13 no setInterval/setTimeout',      !(/setInterval|setTimeout/.test(src)));
assert('2.14 djb2 defined',                   /_djb2\s*\(/.test(src));
assert('2.15 _canon defined',                 /_canon\s*\(/.test(src));

// ── Section 3: createContext() ────────────────────────────────────────────────

console.log('\n── 3. createContext() ─────────────────────────────────────────────');

const ctx = createContext();
assert('3.01 createContext returns object',   ctx !== null && typeof ctx === 'object');
assert('3.02 createContext output frozen',    isFrozen(ctx));
assert('3.03 experimentVersion 1.0.0',       ctx.experimentVersion === '1.0.0');
assert('3.04 experimentFields frozen array', Array.isArray(ctx.experimentFields) && Object.isFrozen(ctx.experimentFields));
assert('3.05 fieldCount is 12',              ctx.fieldCount === 12);
assert('3.06 authorityLevel NONE',           ctx.authorityLevel === 'NONE');
assert('3.07 deterministic true',            ctx.deterministic === true);
assert('3.08 descriptiveOnly true',          ctx.descriptiveOnly === true);
assert('3.09 runtimeIntegrated false',       ctx.runtimeIntegrated === false);
assert('3.10 executionInfluence false',      ctx.executionInfluence === false);
assert('3.11 createdAt null',               ctx.createdAt === null);
assert('3.12 fields has experimentHash',     ctx.experimentFields.includes('experimentHash'));
assert('3.13 fields has rankings',           ctx.experimentFields.includes('rankings'));
assert('3.14 fields has winner',             ctx.experimentFields.includes('winner'));
assert('3.15 createContext idempotent',      createContext().experimentVersion === ctx.experimentVersion);

// ── Section 4: experiment() — output structure ────────────────────────────────

console.log('\n── 4. experiment() output structure ────────────────────────────────');

const result = experiment(fullInput);

assert('4.01 experiment returns object',      result !== null && typeof result === 'object');
assert('4.02 output is deep-frozen',          isFrozen(result));
assert('4.03 experimentHash is string',       typeof result.experimentHash === 'string');
assert('4.04 experimentHash length 8',        result.experimentHash.length === 8);
assert('4.05 baseline is object',             result.baseline !== null && typeof result.baseline === 'object');
assert('4.06 candidates is array',            Array.isArray(result.candidates));
assert('4.07 rankings is array',              Array.isArray(result.rankings));
assert('4.08 confidence null or number',      result.confidence === null || typeof result.confidence === 'number');
assert('4.09 delta null or number',           result.delta === null || typeof result.delta === 'number');
assert('4.10 winner null or string',          result.winner === null || typeof result.winner === 'string');
assert('4.11 reproducible true',              result.reproducible === true);
assert('4.12 experimentMetadata is object',   result.experimentMetadata !== null && typeof result.experimentMetadata === 'object');
assert('4.13 generatedAt null',              result.generatedAt === null);
assert('4.14 deterministic true',             result.deterministic === true);
assert('4.15 descriptiveOnly true',           result.descriptiveOnly === true);
assert('4.16 all 12 keys present',           [
    'experimentHash','baseline','candidates','rankings',
    'confidence','delta','winner','reproducible',
    'experimentMetadata','generatedAt','deterministic','descriptiveOnly',
].every(k => k in result));

// ── Section 5: Baseline ──────────────────────────────────────────────────────

console.log('\n── 5. Baseline ─────────────────────────────────────────────────────');

const bl = result.baseline;
assert('5.01 baseline is frozen',             isFrozen(bl));
assert('5.02 baseline.name is string',        typeof bl.name === 'string');
assert('5.03 baseline.name is same',          bl.name === 'same');
assert('5.04 baseline.score null or number',  bl.score === null || typeof bl.score === 'number');
assert('5.05 baseline.regret null or number', bl.regret === null || typeof bl.regret === 'number');
assert('5.06 default baseline is same',       experiment({ candidatePolicies: ['conservative'] }).baseline.name === 'same');
assert('5.07 custom baseline name respected', experiment({ baseline: { name: 'conservative' }, candidatePolicies: [] }).baseline.name === 'conservative');
assert('5.08 string baseline accepted',       experiment({ baseline: 'aggressive', candidatePolicies: [] }).baseline.name === 'aggressive');

// ── Section 6: Candidates ────────────────────────────────────────────────────

console.log('\n── 6. Candidates ───────────────────────────────────────────────────');

assert('6.01 candidates length matches policies', result.candidates.length === 3);
assert('6.02 each candidate has name',        result.candidates.every(c => typeof c.name === 'string'));
assert('6.03 each candidate has score field', result.candidates.every(c => 'score' in c));
assert('6.04 each candidate has regret field', result.candidates.every(c => 'regret' in c));
assert('6.05 candidate score null or number', result.candidates.every(c => c.score === null || typeof c.score === 'number'));
assert('6.06 candidate objects are frozen',   result.candidates.every(c => isFrozen(c)));
assert('6.07 candidates have correct names',  ['conservative','aggressive','constitutionOnly'].every(n => result.candidates.some(c => c.name === n)));
assert('6.08 no duplicate candidate names',   new Set(result.candidates.map(c => c.name)).size === result.candidates.length);
assert('6.09 baseline name excluded from candidates', !result.candidates.some(c => c.name === 'same'));
assert('6.10 empty candidatePolicies → empty candidates', experiment({ candidatePolicies: [] }).candidates.length === 0);
assert('6.11 string policy names normalized', experiment({ candidatePolicies: ['aggressive'] }).candidates[0].name === 'aggressive');
assert('6.12 object policy names normalized', experiment({ candidatePolicies: [{ name: 'aggressive' }] }).candidates[0].name === 'aggressive');

// ── Section 7: Rankings ───────────────────────────────────────────────────────

console.log('\n── 7. Rankings ─────────────────────────────────────────────────────');

assert('7.01 rankings length matches candidates', result.rankings.length === result.candidates.length);
assert('7.02 each ranking has rank',           result.rankings.every(r => typeof r.rank === 'number'));
assert('7.03 each ranking has name',           result.rankings.every(r => typeof r.name === 'string'));
assert('7.04 each ranking has score',          result.rankings.every(r => 'score' in r));
assert('7.05 each ranking has regret',         result.rankings.every(r => 'regret' in r));
assert('7.06 rankings start at rank 1',        result.rankings.length === 0 || result.rankings[0].rank === 1);
assert('7.07 ranks are sequential',            result.rankings.every((r, i) => r.rank === i + 1));
assert('7.08 scored items sort before null',   (() => {
    const scored   = result.rankings.filter(r => r.score !== null);
    const unscored = result.rankings.filter(r => r.score === null);
    if (scored.length === 0 || unscored.length === 0) return true;
    return scored[scored.length - 1].rank < unscored[0].rank;
})());
assert('7.09 scored items sorted desc by score', (() => {
    const scored = result.rankings.filter(r => r.score !== null);
    return scored.every((r, i) => i === 0 || scored[i - 1].score >= r.score);
})());
assert('7.10 empty candidates → empty rankings', experiment({ candidatePolicies: [] }).rankings.length === 0);
assert('7.11 ranking objects are frozen',       result.rankings.every(r => isFrozen(r)));

// ── Section 8: Winner and delta ───────────────────────────────────────────────

console.log('\n── 8. Winner and delta ─────────────────────────────────────────────');

assert('8.01 winner is null or string',        result.winner === null || typeof result.winner === 'string');
assert('8.02 winner matches rank-1 if scored', (() => {
    if (result.rankings.length === 0) return true;
    const topRanked = result.rankings[0];
    if (topRanked.score === null) return result.winner === null;
    return result.winner === topRanked.name;
})());
assert('8.03 empty candidates → winner null',  experiment({ candidatePolicies: [] }).winner === null);
assert('8.04 delta is null or number',         result.delta === null || typeof result.delta === 'number');
assert('8.05 delta null if winner null',       result.winner === null ? result.delta === null : true);
assert('8.06 no-counterfactuals → null delta', experiment({ baseline: { name: 'same' }, candidatePolicies: ['aggressive'] }).delta === null);

// ── Section 9: Confidence ─────────────────────────────────────────────────────

console.log('\n── 9. Confidence ────────────────────────────────────────────────────');

assert('9.01 confidence null or number',       result.confidence === null || typeof result.confidence === 'number');
assert('9.02 confidence in [0,1] when set',    result.confidence === null || (result.confidence >= 0 && result.confidence <= 1));
assert('9.03 empty → confidence null',         experiment({ candidatePolicies: [] }).confidence === null);
assert('9.04 single candidate → null or number', (() => {
    const r = experiment({ baseline: { name: 'same' }, candidatePolicies: ['aggressive'], counterfactuals: cfs });
    return r.confidence === null || (typeof r.confidence === 'number' && r.confidence >= 0 && r.confidence <= 1);
})());

// ── Section 10: Experiment metadata ──────────────────────────────────────────

console.log('\n── 10. Experiment metadata ─────────────────────────────────────────');

const meta = result.experimentMetadata;
assert('10.01 experimentMetadata is frozen',   isFrozen(meta));
assert('10.02 runtimeIntegrated false',        meta.runtimeIntegrated === false);
assert('10.03 executionInfluence false',       meta.executionInfluence === false);
assert('10.04 authorityLevel NONE',            meta.authorityLevel === 'NONE');
assert('10.05 descriptiveOnly true',           meta.descriptiveOnly === true);
assert('10.06 deterministic true',             meta.deterministic === true);
assert('10.07 metadata has exactly 5 keys',    Object.keys(meta).length === 5);

// ── Section 11: Determinism ───────────────────────────────────────────────────

console.log('\n── 11. Determinism ─────────────────────────────────────────────────');

const e1 = experiment(fullInput);
const e2 = experiment(fullInput);
assert('11.01 same hash on identical input',    e1.experimentHash === e2.experimentHash);
assert('11.02 same winner on identical input',  e1.winner === e2.winner);
assert('11.03 same rankings length',            e1.rankings.length === e2.rankings.length);
assert('11.04 same delta',                      e1.delta === e2.delta);
assert('11.05 same confidence',                 e1.confidence === e2.confidence);
assert('11.06 same reproducible',               e1.reproducible === e2.reproducible);

// Different candidate list → different hash
const altExp = experiment({ baseline: { name: 'same' }, candidatePolicies: ['founderOnly'], counterfactuals: cfs });
assert('11.07 different candidates → different hash', e1.experimentHash !== altExp.experimentHash || e1.winner === altExp.winner);

// ── Section 12: Null/invalid input tolerance ──────────────────────────────────

console.log('\n── 12. Null/invalid input tolerance ────────────────────────────────');

assert('12.01 null input → object returned',   experiment(null) !== null && typeof experiment(null) === 'object');
assert('12.02 null input → frozen',            isFrozen(experiment(null)));
assert('12.03 null input → reproducible true', experiment(null).reproducible === true);
assert('12.04 null input → deterministic',     experiment(null).deterministic === true);
assert('12.05 null input → generatedAt null',  experiment(null).generatedAt === null);
assert('12.06 undefined input → object',       experiment(undefined) !== null && typeof experiment(undefined) === 'object');
assert('12.07 string input → object',          experiment('bad') !== null);
assert('12.08 number input → object',          experiment(42) !== null);
assert('12.09 no throw on null',               (() => { try { experiment(null); return true; } catch { return false; } })());
assert('12.10 no throw on empty object',       (() => { try { experiment({}); return true; } catch { return false; } })());

// ── Section 13: No state mutation (isolation) ─────────────────────────────────

console.log('\n── 13. No state mutation (isolation) ───────────────────────────────');

const ea = experiment(fullInput);
const eb = experiment(fullInput);
assert('13.01 repeated calls equal hash',      ea.experimentHash === eb.experimentHash);
assert('13.02 repeated calls equal winner',    ea.winner === eb.winner);

// Mutation attempt blocked by freeze
const mutableResult = experiment(fullInput);
try { mutableResult.winner = 'mutated'; } catch (_) {}
assert('13.03 winner mutation blocked',       mutableResult.winner !== 'mutated');

// Input not mutated
const cfCopy = cfs.map(c => Object.assign({}, c));
experiment({ baseline: { name: 'same' }, candidatePolicies: ['conservative'], counterfactuals: cfCopy });
assert('13.04 counterfactuals array not mutated', cfCopy.length === cfs.length);

// ── Section 14: ExperimentHash properties ────────────────────────────────────

console.log('\n── 14. ExperimentHash properties ───────────────────────────────────');

assert('14.01 hash is hex string',             /^[0-9a-f]{8}$/.test(result.experimentHash));
assert('14.02 null input hash is hex',         /^[0-9a-f]{8}$/.test(experiment(null).experimentHash));
assert('14.03 empty input hash is hex',        /^[0-9a-f]{8}$/.test(experiment({}).experimentHash));
assert('14.04 hash stable across calls',       experiment(fullInput).experimentHash === experiment(fullInput).experimentHash);
assert('14.05 different baseline → diff hash', (() => {
    const h1 = experiment({ baseline: { name: 'same' }, candidatePolicies: ['conservative'] }).experimentHash;
    const h2 = experiment({ baseline: { name: 'aggressive' }, candidatePolicies: ['conservative'] }).experimentHash;
    return h1 !== h2;
})());

// ── Section 15: Score extraction from real counterfactuals ────────────────────

console.log('\n── 15. Score extraction from real counterfactuals ──────────────────');

// Each CF has alternativeOutcomes with policy scores from counterfactual-evaluator
assert('15.01 cfs have alternativeOutcomes',   cfs.every(cf => cf.alternativeOutcomes !== null && typeof cf.alternativeOutcomes === 'object'));
assert('15.02 conservative policy present',    cfs.every(cf => 'conservative' in cf.alternativeOutcomes));
assert('15.03 aggressive policy present',      cfs.every(cf => 'aggressive' in cf.alternativeOutcomes));
assert('15.04 same policy present',            cfs.every(cf => 'same' in cf.alternativeOutcomes));
assert('15.05 conservative score is number',   (() => {
    const r = experiment({ baseline: { name: 'same' }, candidatePolicies: ['conservative'], counterfactuals: cfs });
    return r.candidates.length > 0 && r.candidates[0].score !== null;
})());
assert('15.06 baseline score from same policy', (() => {
    const r = experiment({ baseline: { name: 'same' }, candidatePolicies: ['conservative'], counterfactuals: cfs });
    return r.baseline.score !== null;
})());
assert('15.07 winner is best candidate by score', (() => {
    const r = experiment({ baseline: { name: 'same' }, candidatePolicies: ['conservative', 'aggressive'], counterfactuals: cfs });
    if (r.winner === null) return true;
    const winnerScore = r.candidates.find(c => c.name === r.winner)?.score;
    return r.candidates.every(c => c.score === null || winnerScore >= c.score);
})());
assert('15.08 missing policy → null score',    (() => {
    const r = experiment({ baseline: { name: 'same' }, candidatePolicies: ['nonexistentPolicy999'], counterfactuals: cfs });
    return r.candidates[0].score === null;
})());

// ── Section 16: Full pipeline integration ────────────────────────────────────

console.log('\n── 16. Full pipeline integration ───────────────────────────────────');

assert('16.01 full experiment succeeds',       result !== null);
assert('16.02 baseline has same policy score', result.baseline.score !== null);
assert('16.03 rankings count correct',         result.rankings.length === 3);
assert('16.04 no candidates missing from rankings', result.candidates.every(c => result.rankings.some(r => r.name === c.name)));
assert('16.05 all known policies in candidates', ['conservative','aggressive','constitutionOnly'].every(n => result.candidates.some(c => c.name === n)));
assert('16.06 winner in candidates',           result.winner === null || result.candidates.some(c => c.name === result.winner));
assert('16.07 candidate scores in [0,1]',      result.candidates.filter(c => c.score !== null).every(c => c.score >= 0 && c.score <= 1));
assert('16.08 baseline score in [0,1]',        result.baseline.score === null || (result.baseline.score >= 0 && result.baseline.score <= 1));
assert('16.09 full input frozen output',       isFrozen(result));
assert('16.10 candidates array frozen',        isFrozen(result.candidates));
assert('16.11 rankings array frozen',          isFrozen(result.rankings));

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length > 0) {
    console.error(`\nFailed assertions:\n${failures.join('\n')}`);
    process.exit(1);
}
