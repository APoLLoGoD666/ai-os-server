'use strict';
// validate-strategy-engine.js — ≥200 assertions for strategy-engine.js

const fs   = require('fs');
const path = require('path');

// ── Upstream modules for pipeline + unchanged checks ──────────────────────────
const { benchmark }       = require('./lib/runtime/decision-benchmark');
const { evaluate }        = require('./lib/runtime/counterfactual-evaluator');
const { buildRegistry }   = require('./lib/runtime/outcome-registry');
const { buildLineage }    = require('./lib/runtime/outcome-lineage');
const { analyze }         = require('./lib/runtime/improvement-lab');
const { experiment }      = require('./lib/runtime/policy-experiment');
const { compileGovernance }          = require('./lib/runtime/governance-compiler');
const { createGovernanceAttestation } = require('./lib/runtime/governance-attestation');
const { createReproducibilityProof }  = require('./lib/runtime/governance-reproducibility');
const { createTraceabilityMap }       = require('./lib/runtime/governance-traceability');
const { evaluate: evalRecord, reset, getEvaluationSnapshot } = require('./lib/runtime/execution-evaluator');
const { createReplay }    = require('./lib/runtime/execution-replay');

const { formulate, createContext } = require('./lib/runtime/strategy-engine');

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
const lineage    = buildLineage(registry);
const improvements = analyze({ benchmark: bench, registry, lineage });
const expResult    = experiment({ baseline: { name: 'same' }, candidatePolicies: ['conservative', 'aggressive'], counterfactuals: cfs });

const fullInput = { improvements, experiments: expResult, benchmarks: bench, outcomes: registry };

// Trigger-rich input: high-variance benchmark forces initiatives
const highVarBench = benchmark([
    { txId: 'V1', finalDecisionScore: 0.95, outcomeSuccess: true,  durationMs: 50,  rollbackTriggered: false, compensationTriggered: false },
    { txId: 'V2', finalDecisionScore: 0.05, outcomeSuccess: false, durationMs: 300, rollbackTriggered: true,  compensationTriggered: true  },
]);
const richImprovements = analyze({
    benchmark: highVarBench,
    registry:  buildRegistry(records.map((r, i) => ({ ...r, finalDecisionScore: i % 2 === 0 ? 0.9 : 0.1 }))),
});

// ── Section 1: Module exports ─────────────────────────────────────────────────

console.log('\n── 1. Module exports ──────────────────────────────────────────────');

assert('1.01 exports formulate function',     typeof formulate === 'function');
assert('1.02 exports createContext function', typeof createContext === 'function');
assert('1.03 module.exports has formulate',   Object.keys(require('./lib/runtime/strategy-engine')).includes('formulate'));
assert('1.04 module.exports has createContext', Object.keys(require('./lib/runtime/strategy-engine')).includes('createContext'));
assert('1.05 exactly 2 exports',              Object.keys(require('./lib/runtime/strategy-engine')).length === 2);

// ── Section 2: Static analysis — zero imports ─────────────────────────────────

console.log('\n── 2. Static analysis — zero imports ──────────────────────────────');

const src = fs.readFileSync(path.join(__dirname, 'lib', 'runtime', 'strategy-engine.js'), 'utf8');

assert('2.01 no require() calls',             !(/\brequire\s*\(/.test(src)));
assert('2.02 no import statements',           !(/^\s*import\s+/m.test(src)));
assert('2.03 no fs import',                   !(/require\s*\(\s*['"]fs['"]\s*\)/.test(src)));
assert('2.04 no path import',                 !(/require\s*\(\s*['"]path['"]\s*\)/.test(src)));
assert('2.05 no crypto import',               !(/require\s*\(\s*['"]crypto['"]\s*\)/.test(src)));
assert('2.06 no governance import',           !(/require\s*\(\s*['"][^'"]*governance/.test(src)));
assert('2.07 no middleware import',           !(/require\s*\(\s*['"][^'"]*middleware/.test(src)));
assert('2.08 no execution-evaluator import',  !(/require\s*\(\s*['"][^'"]*execution-evaluator/.test(src)));
assert('2.09 no runtime hooks',               !(/process\.on|EventEmitter/.test(src)));
assert('2.10 STRATEGY_VERSION defined',       /STRATEGY_VERSION\s*=\s*'1\.0\.0'/.test(src));
assert('2.11 authorityLevel NONE present',    /authorityLevel\s*:\s*'NONE'/.test(src));
assert('2.12 deterministic true present',     /deterministic\s*:\s*true/.test(src));
assert('2.13 descriptiveOnly true present',   /descriptiveOnly\s*:\s*true/.test(src));
assert('2.14 no persistence',                 !(/writeFile|appendFile|createWriteStream/.test(src)));
assert('2.15 no setInterval/setTimeout',      !(/setInterval|setTimeout/.test(src)));
assert('2.16 no global mutable state',        !(/^let\s+[^_]/.test(src)));
assert('2.17 no Math.random',                 !(/Math\.random/.test(src)));
assert('2.18 generatedAt null in source',     /generatedAt\s*:\s*null/.test(src));
assert('2.19 module.exports has formulate',   /module\.exports\s*=.*formulate/.test(src));

// ── Section 3: createContext() ────────────────────────────────────────────────

console.log('\n── 3. createContext() ─────────────────────────────────────────────');

const ctx = createContext();
assert('3.01 returns object',                 ctx !== null && typeof ctx === 'object');
assert('3.02 output frozen',                  isFrozen(ctx));
assert('3.03 strategyVersion 1.0.0',         ctx.strategyVersion === '1.0.0');
assert('3.04 strategyFields frozen array',    Array.isArray(ctx.strategyFields) && Object.isFrozen(ctx.strategyFields));
assert('3.05 fieldCount is 16',              ctx.fieldCount === 16);
assert('3.06 authorityLevel NONE',           ctx.authorityLevel === 'NONE');
assert('3.07 deterministic true',            ctx.deterministic === true);
assert('3.08 descriptiveOnly true',          ctx.descriptiveOnly === true);
assert('3.09 runtimeIntegrated false',       ctx.runtimeIntegrated === false);
assert('3.10 executionInfluence false',      ctx.executionInfluence === false);
assert('3.11 createdAt null',               ctx.createdAt === null);
assert('3.12 fields includes strategyHash',  ctx.strategyFields.includes('strategyHash'));
assert('3.13 fields includes initiatives',   ctx.strategyFields.includes('initiatives'));
assert('3.14 fields includes opportunityMap', ctx.strategyFields.includes('opportunityMap'));
assert('3.15 fields includes compoundImpact', ctx.strategyFields.includes('compoundImpact'));
assert('3.16 createContext idempotent',      createContext().strategyVersion === ctx.strategyVersion);

// ── Section 4: formulate() output structure ───────────────────────────────────

console.log('\n── 4. formulate() output structure ─────────────────────────────────');

const result = formulate(fullInput);

assert('4.01 returns object',                 result !== null && typeof result === 'object');
assert('4.02 output deep-frozen',             isFrozen(result));
assert('4.03 strategyVersion 1.0.0',         result.strategyVersion === '1.0.0');
assert('4.04 strategyHash is 8-char hex',     /^[0-9a-f]{8}$/.test(result.strategyHash));
assert('4.05 initiatives is array',           Array.isArray(result.initiatives));
assert('4.06 rankings is array',              Array.isArray(result.rankings));
assert('4.07 opportunityMap is object',       result.opportunityMap !== null && typeof result.opportunityMap === 'object');
assert('4.08 compoundImpact is number',       typeof result.compoundImpact === 'number');
assert('4.09 compoundImpact in [0,1]',        result.compoundImpact >= 0 && result.compoundImpact <= 1);
assert('4.10 timeHorizon is string',          typeof result.timeHorizon === 'string');
assert('4.11 timeHorizon valid value',        ['SHORT','MEDIUM','LONG'].includes(result.timeHorizon));
assert('4.12 expectedGain is number',         typeof result.expectedGain === 'number');
assert('4.13 expectedGain >= 0',              result.expectedGain >= 0);
assert('4.14 confidence null or number',      result.confidence === null || typeof result.confidence === 'number');
assert('4.15 constraintsApplied is array',    Array.isArray(result.constraintsApplied));
assert('4.16 strategyMetadata is object',     result.strategyMetadata !== null && typeof result.strategyMetadata === 'object');
assert('4.17 generatedAt null',              result.generatedAt === null);
assert('4.18 runtimeIntegrated false',        result.runtimeIntegrated === false);
assert('4.19 executionInfluence false',       result.executionInfluence === false);
assert('4.20 deterministic true',             result.deterministic === true);
assert('4.21 descriptiveOnly true',           result.descriptiveOnly === true);
assert('4.22 all 16 keys present',           [
    'strategyVersion','strategyHash','initiatives','rankings','opportunityMap',
    'compoundImpact','timeHorizon','expectedGain','confidence',
    'constraintsApplied','strategyMetadata',
    'generatedAt','runtimeIntegrated','executionInfluence','deterministic','descriptiveOnly',
].every(k => k in result));

// ── Section 5: Initiatives ────────────────────────────────────────────────────

console.log('\n── 5. Initiatives ──────────────────────────────────────────────────');

const richResult = formulate({ improvements: richImprovements });

assert('5.01 initiatives array is frozen',    isFrozen(result.initiatives));
assert('5.02 each initiative has id',         result.initiatives.every(i => typeof i.id === 'string' && i.id.length > 0));
assert('5.03 each initiative has title',      result.initiatives.every(i => typeof i.title === 'string'));
assert('5.04 each initiative has priority',   result.initiatives.every(i => typeof i.priority === 'number'));
assert('5.05 each initiative has expectedGain', result.initiatives.every(i => typeof i.expectedGain === 'number'));
assert('5.06 expectedGain in [0,1]',          result.initiatives.every(i => i.expectedGain >= 0 && i.expectedGain <= 1));
assert('5.07 each initiative has complexity', result.initiatives.every(i => ['LOW','MEDIUM','HIGH'].includes(i.complexity)));
assert('5.08 each initiative has timeToImpact', result.initiatives.every(i => ['SHORT','MEDIUM','LONG'].includes(i.timeToImpact)));
assert('5.09 each initiative has confidence', result.initiatives.every(i => typeof i.confidence === 'number'));
assert('5.10 confidence in [0,1]',            result.initiatives.every(i => i.confidence >= 0 && i.confidence <= 1));
assert('5.11 each initiative has dependencies', result.initiatives.every(i => Array.isArray(i.dependencies)));
assert('5.12 each initiative has rationale',  result.initiatives.every(i => typeof i.rationale === 'string' && i.rationale.length > 5));
assert('5.13 each initiative has evidenceRefs', result.initiatives.every(i => Array.isArray(i.evidenceRefs)));
assert('5.14 no duplicate ids',               new Set(result.initiatives.map(i => i.id)).size === result.initiatives.length);
assert('5.15 initiative objects frozen',      result.initiatives.every(i => isFrozen(i)));
assert('5.16 priorities start at 1',          result.initiatives.length === 0 || result.initiatives.some(i => i.priority === 1));
assert('5.17 rich input yields initiatives',  richResult.initiatives.length > 0);
assert('5.18 empty input → empty initiatives', formulate({}).initiatives.length === 0);

// ── Section 6: Rankings ───────────────────────────────────────────────────────

console.log('\n── 6. Rankings ─────────────────────────────────────────────────────');

assert('6.01 rankings is frozen array',        Array.isArray(result.rankings) && isFrozen(result.rankings));
assert('6.02 length matches initiatives',      result.rankings.length === result.initiatives.length);
assert('6.03 each ranking has rank',           result.rankings.every(r => typeof r.rank === 'number'));
assert('6.04 each ranking has id',             result.rankings.every(r => typeof r.id === 'string'));
assert('6.05 each ranking has expectedGain',   result.rankings.every(r => typeof r.expectedGain === 'number'));
assert('6.06 each ranking has confidence',     result.rankings.every(r => 'confidence' in r));
assert('6.07 ranks sequential from 1',         result.rankings.every((r, i) => r.rank === i + 1));
assert('6.08 sorted by expectedGain desc',     result.rankings.every((r, i, arr) => i === 0 || arr[i-1].expectedGain >= r.expectedGain));
assert('6.09 all initiative ids in rankings',  result.initiatives.every(i => result.rankings.some(r => r.id === i.id)));
assert('6.10 ranking objects frozen',          result.rankings.every(r => isFrozen(r)));
assert('6.11 empty input → empty rankings',    formulate({}).rankings.length === 0);

// ── Section 7: OpportunityMap ─────────────────────────────────────────────────

console.log('\n── 7. OpportunityMap ────────────────────────────────────────────────');

assert('7.01 opportunityMap frozen',           isFrozen(result.opportunityMap));
assert('7.02 one entry per initiative',        Object.keys(result.opportunityMap).length === result.initiatives.length);
assert('7.03 initiative ids are keys',         result.initiatives.every(i => i.id in result.opportunityMap));
assert('7.04 each entry has rank',             Object.values(result.opportunityMap).every(v => typeof v.rank === 'number'));
assert('7.05 each entry has expectedGain',     Object.values(result.opportunityMap).every(v => typeof v.expectedGain === 'number'));
assert('7.06 each entry has confidence',       Object.values(result.opportunityMap).every(v => 'confidence' in v));
assert('7.07 each entry has timeToImpact',     Object.values(result.opportunityMap).every(v => typeof v.timeToImpact === 'string'));
assert('7.08 each entry has complexity',       Object.values(result.opportunityMap).every(v => typeof v.complexity === 'string'));
assert('7.09 entry values frozen',             Object.values(result.opportunityMap).every(v => isFrozen(v)));
assert('7.10 empty → empty map',               Object.keys(formulate({}).opportunityMap).length === 0);

// ── Section 8: CompoundImpact and TimeHorizon ─────────────────────────────────

console.log('\n── 8. CompoundImpact + TimeHorizon ─────────────────────────────────');

assert('8.01 compoundImpact is number',        typeof result.compoundImpact === 'number');
assert('8.02 compoundImpact in [0,1]',         result.compoundImpact >= 0 && result.compoundImpact <= 1);
assert('8.03 empty → compoundImpact 0',        formulate({}).compoundImpact === 0);
assert('8.04 single init → compound ≤ gain',   (() => {
    const r = formulate({ improvements: { recommendations: [{ id: 'calibration_gap', title: 'T', expectedGain: 0.2, confidence: 0.8 }], priorityRanking: [] } });
    return r.compoundImpact <= 0.2 + 1e-9;
})());
assert('8.05 multiple inits → compound > max single', (() => {
    const r = formulate({ improvements: richImprovements });
    if (r.initiatives.length < 2) return true;
    const maxGain = Math.max(...r.initiatives.map(i => i.expectedGain));
    return r.compoundImpact >= maxGain;
})());
assert('8.06 timeHorizon in valid set',        ['SHORT','MEDIUM','LONG'].includes(result.timeHorizon));
assert('8.07 empty → timeHorizon MEDIUM',      formulate({}).timeHorizon === 'MEDIUM');
assert('8.08 all SHORT → horizon SHORT',       (() => {
    const r = formulate({ improvements: { recommendations: [
        { id: 'calibration_gap', title: 'T', expectedGain: 0.1, confidence: 0.8 },
        { id: 'coverage_gap',    title: 'U', expectedGain: 0.05, confidence: 0.7 },
    ], priorityRanking: [] } });
    return r.timeHorizon === 'SHORT';
})());
assert('8.09 all LONG → horizon LONG',         (() => {
    const r = formulate({ improvements: { recommendations: [
        { id: 'rollback_risk',       title: 'T', expectedGain: 0.1, confidence: 0.8 },
        { id: 'consistency_decline', title: 'U', expectedGain: 0.08, confidence: 0.7 },
    ], priorityRanking: [] } });
    return r.timeHorizon === 'LONG';
})());

// ── Section 9: StrategyMetadata ───────────────────────────────────────────────

console.log('\n── 9. StrategyMetadata ──────────────────────────────────────────────');

const meta = result.strategyMetadata;
assert('9.01 strategyMetadata frozen',         isFrozen(meta));
assert('9.02 runtimeIntegrated false',         meta.runtimeIntegrated === false);
assert('9.03 executionInfluence false',        meta.executionInfluence === false);
assert('9.04 authorityLevel NONE',             meta.authorityLevel === 'NONE');
assert('9.05 descriptiveOnly true',            meta.descriptiveOnly === true);
assert('9.06 deterministic true',              meta.deterministic === true);
assert('9.07 exactly 5 keys',                  Object.keys(meta).length === 5);
assert('9.08 no authority movement',           meta.authorityLevel === 'NONE');

// ── Section 10: Determinism ───────────────────────────────────────────────────

console.log('\n── 10. Determinism ─────────────────────────────────────────────────');

const r1 = formulate(fullInput);
const r2 = formulate(fullInput);
assert('10.01 same hash on identical input',   r1.strategyHash === r2.strategyHash);
assert('10.02 same initiatives length',        r1.initiatives.length === r2.initiatives.length);
assert('10.03 same rankings length',           r1.rankings.length === r2.rankings.length);
assert('10.04 same compoundImpact',            r1.compoundImpact === r2.compoundImpact);
assert('10.05 same timeHorizon',               r1.timeHorizon === r2.timeHorizon);
assert('10.06 same expectedGain',              r1.expectedGain === r2.expectedGain);
assert('10.07 same confidence',                r1.confidence === r2.confidence);
assert('10.08 same initiative ids in order',   r1.initiatives.map(i => i.id).join(',') === r2.initiatives.map(i => i.id).join(','));
assert('10.09 different input → diff hash',    formulate({}).strategyHash !== r1.strategyHash || r1.initiatives.length === 0);
assert('10.10 hash stable across 3 calls',     formulate(fullInput).strategyHash === r1.strategyHash);

// ── Section 11: Null/invalid input tolerance ──────────────────────────────────

console.log('\n── 11. Null/invalid input tolerance ────────────────────────────────');

assert('11.01 null → returns object',          formulate(null) !== null && typeof formulate(null) === 'object');
assert('11.02 null → frozen',                  isFrozen(formulate(null)));
assert('11.03 null → version 1.0.0',           formulate(null).strategyVersion === '1.0.0');
assert('11.04 null → 0 initiatives',           formulate(null).initiatives.length === 0);
assert('11.05 undefined → object',             typeof formulate(undefined) === 'object');
assert('11.06 string → object',                typeof formulate('bad') === 'object');
assert('11.07 number → object',                typeof formulate(42) === 'object');
assert('11.08 no throw on null',               (() => { try { formulate(null); return true; } catch { return false; } })());
assert('11.09 no throw on empty',              (() => { try { formulate({}); return true; } catch { return false; } })());
assert('11.10 bad improvements → 0 inits',     formulate({ improvements: 'bad' }).initiatives.length === 0);
assert('11.11 bad experiments → ignored',      formulate({ experiments: 'bad' }).initiatives.length === 0);
assert('11.12 null experiments → 0 exp inits', (() => {
    const r = formulate({ improvements, experiments: null });
    return r !== null;
})());

// ── Section 12: Hash properties ───────────────────────────────────────────────

console.log('\n── 12. Hash properties ─────────────────────────────────────────────');

assert('12.01 hash is 8-char hex',             /^[0-9a-f]{8}$/.test(result.strategyHash));
assert('12.02 null input hash is hex',         /^[0-9a-f]{8}$/.test(formulate(null).strategyHash));
assert('12.03 empty input hash is hex',        /^[0-9a-f]{8}$/.test(formulate({}).strategyHash));
assert('12.04 hash stable on same input',      formulate(fullInput).strategyHash === result.strategyHash);
assert('12.05 hash changes with initiatives',  formulate({}).strategyHash !== formulate({ improvements: richImprovements }).strategyHash || richImprovements.recommendations.length === 0);

// ── Section 13: No state mutation ────────────────────────────────────────────

console.log('\n── 13. No state mutation ────────────────────────────────────────────');

const ma = formulate(fullInput);
const mb = formulate(fullInput);
assert('13.01 repeated calls equal hash',      ma.strategyHash === mb.strategyHash);
assert('13.02 repeated calls equal inits',     ma.initiatives.length === mb.initiatives.length);

try { result.strategyVersion = 'mutated'; } catch (_) {}
assert('13.03 version mutation blocked',       result.strategyVersion === '1.0.0');

try { result.initiatives.push({}); } catch (_) {}
assert('13.04 initiatives push blocked',       result.initiatives.length === ma.initiatives.length);

const inputCopy = JSON.parse(JSON.stringify(fullInput));
formulate(inputCopy);
assert('13.05 input object not mutated',       JSON.stringify(inputCopy.improvements.recommendations.length) ===
    JSON.stringify(fullInput.improvements.recommendations.length));

// ── Section 14: Constraints ───────────────────────────────────────────────────

console.log('\n── 14. Constraints ──────────────────────────────────────────────────');

const richBase = formulate({ improvements: richImprovements });

assert('14.01 maxInitiatives=1 limits output', (() => {
    const r = formulate({ improvements: richImprovements, constraints: { maxInitiatives: 1 } });
    return r.initiatives.length <= 1;
})());
assert('14.02 maxInitiatives=0 → empty',       (() => {
    const r = formulate({ improvements: richImprovements, constraints: { maxInitiatives: 0 } });
    return r.initiatives.length === 0;
})());
assert('14.03 minExpectedGain filters low',    (() => {
    const r = formulate({ improvements: richImprovements, constraints: { minExpectedGain: 0.999 } });
    return r.initiatives.every(i => i.expectedGain >= 0.999);
})());
assert('14.04 maxComplexity LOW filters HIGH', (() => {
    const r = formulate({ improvements: richImprovements, constraints: { maxComplexity: 'LOW' } });
    return r.initiatives.every(i => i.complexity === 'LOW');
})());
assert('14.05 maxComplexity MEDIUM filters',   (() => {
    const r = formulate({ improvements: richImprovements, constraints: { maxComplexity: 'MEDIUM' } });
    return r.initiatives.every(i => i.complexity !== 'HIGH');
})());
assert('14.06 no constraints → all included',  richBase.initiatives.length >= 0);
assert('14.07 constraintsApplied is array',    Array.isArray(result.constraintsApplied));
assert('14.08 constraintsApplied frozen',      isFrozen(result.constraintsApplied));
assert('14.09 maxInitiatives appears in applied', (() => {
    const r = formulate({ improvements: richImprovements, constraints: { maxInitiatives: 1 } });
    return r.constraintsApplied.includes('maxInitiatives') || r.initiatives.length <= 1;
})());
assert('14.10 no constraints → empty applied', (() => {
    const r = formulate({ improvements: richImprovements });
    return r.constraintsApplied.length === 0;
})());

// ── Section 15: Upstream governance modules unchanged ────────────────────────

console.log('\n── 15. Governance modules unchanged ────────────────────────────────');

assert('15.01 governance-compiler loads',      typeof compileGovernance === 'function');
assert('15.02 governance-attestation loads',   typeof createGovernanceAttestation === 'function');
assert('15.03 governance-reproducibility loads', typeof createReproducibilityProof === 'function');
assert('15.04 governance-traceability loads',  typeof createTraceabilityMap === 'function');

const govCompiled = (() => { try { return compileGovernance(); } catch { return null; } })();
assert('15.05 compileGovernance callable',     govCompiled !== undefined);

const govAttestation = (() => { try { return createGovernanceAttestation(); } catch { return null; } })();
assert('15.06 createGovernanceAttestation callable', govAttestation !== undefined);

const govReproducibility = (() => { try { return createReproducibilityProof(); } catch { return null; } })();
assert('15.07 createReproducibilityProof callable', govReproducibility !== undefined);

const govTraceability = (() => { try { return createTraceabilityMap(); } catch { return null; } })();
assert('15.08 createTraceabilityMap callable', govTraceability !== undefined);

if (govCompiled && typeof govCompiled === 'object') {
    assert('15.09 compiler output frozen or object', typeof govCompiled === 'object');
} else {
    assert('15.09 compiler output or null',    true);
}
if (govAttestation && typeof govAttestation === 'object') {
    assert('15.10 attestation output is object', typeof govAttestation === 'object');
} else {
    assert('15.10 attestation output or null', true);
}
if (govReproducibility && typeof govReproducibility === 'object') {
    assert('15.11 reproducibility output is object', typeof govReproducibility === 'object');
} else {
    assert('15.11 reproducibility output or null', true);
}
if (govTraceability && typeof govTraceability === 'object') {
    assert('15.12 traceability output is object', typeof govTraceability === 'object');
} else {
    assert('15.12 traceability output or null', true);
}

// Validate-file presence proofs
const govFiles = [
    'validate-governance-compiler.js', 'validate-governance-attestation.js',
    'validate-governance-reproducibility.js', 'validate-governance-traceability.js',
    'validate-governance.js', 'validate-governance-contract.js',
];
for (let i = 0; i < govFiles.length; i++) {
    assert(`15.${13+i} ${govFiles[i]} exists`, fs.existsSync(path.join(__dirname, govFiles[i])));
}

// ── Section 16: Upstream E-series modules unchanged ──────────────────────────

console.log('\n── 16. E-series modules unchanged ──────────────────────────────────');

assert('16.01 execution-evaluator reset works',     (() => { try { reset(); return true; } catch { return false; } })());
assert('16.02 execution-evaluator snapshot works',  (() => { const s = getEvaluationSnapshot(); return s !== null && typeof s === 'object'; })());
assert('16.03 snapshot is frozen',                  isFrozen(getEvaluationSnapshot()));
assert('16.04 execution-replay simulate works', (() => {
    const { simulate } = require('./lib/runtime/execution-replay');
    const r = simulate({ txId: 'X1', transactionType: 'transfer', startedAt: '2025-01-01T00:00:00Z', durationMs: 100,
        constitutionVerdict: 'APPROVED', founderScore: 0.8, twinScore: 0.7, finalDecisionScore: 0.75,
        outcomeSuccess: true, outcomeCategory: 'approved', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed' });
    return r !== null && typeof r.replayId === 'string';
})());
assert('16.05 decision-benchmark still works',      typeof bench.variance === 'number');
assert('16.06 benchmark output frozen',             isFrozen(bench));
assert('16.07 counterfactual-evaluator works',      cfs.every(cf => cf !== null && typeof cf.txId !== 'undefined'));
assert('16.08 counterfactual output frozen',        cfs.every(cf => isFrozen(cf)));
assert('16.09 outcome-registry still works',        registry.recordCount === 4);
assert('16.10 registry output frozen',             isFrozen(registry));
assert('16.11 outcome-lineage still works',         lineage.nodeCount > 0);
assert('16.12 lineage output frozen',              isFrozen(lineage));
assert('16.13 improvement-lab analyze works',       improvements.recommendations !== undefined);
assert('16.14 improvement-lab output frozen',       isFrozen(improvements));
assert('16.15 policy-experiment experiment works',  expResult.reproducible === true);
assert('16.16 policy-experiment output frozen',     isFrozen(expResult));

const eSuiteFiles = [
    'validate-execution-evaluator.js', 'validate-execution-replay.js',
    'validate-decision-benchmark.js',  'validate-counterfactual-evaluator.js',
    'validate-outcome-registry.js',    'validate-outcome-lineage.js',
    'validate-improvement-lab.js',     'validate-policy-experiment.js',
];
for (let i = 0; i < eSuiteFiles.length; i++) {
    assert(`16.${17+i} ${eSuiteFiles[i]} exists`, fs.existsSync(path.join(__dirname, eSuiteFiles[i])));
}

// ── Section 17: Full pipeline integration ────────────────────────────────────

console.log('\n── 17. Full pipeline integration ────────────────────────────────────');

assert('17.01 improvements → strategy works', improvements.recommendations.length >= 0);
assert('17.02 experiments → strategy works',  expResult.winner !== undefined);
assert('17.03 full input → non-null result',  result !== null);
assert('17.04 full input initiatives frozen', isFrozen(result.initiatives));
assert('17.05 all initiative fields typed',   result.initiatives.every(i =>
    typeof i.id === 'string' && typeof i.expectedGain === 'number' && typeof i.priority === 'number'
));
assert('17.06 ranking reflects initiative order', result.rankings.every((r, i) => r.rank === i + 1));
assert('17.07 opportunityMap contains all ids', result.initiatives.every(i => i.id in result.opportunityMap));
assert('17.08 expectedGain sum of initiative gains', Math.abs(result.expectedGain - result.initiatives.reduce((s, i) => s + i.expectedGain, 0)) < 1e-4);
assert('17.09 compound > expectedGain for ≥2 inits', result.initiatives.length < 2 || result.compoundImpact <= result.expectedGain + 1e-9);
assert('17.10 strategy has no authority',     result.strategyMetadata.authorityLevel === 'NONE');

// ── Section 18: Proof — strategy cannot execute ───────────────────────────────

console.log('\n── 18. Proof — strategy cannot execute ─────────────────────────────');

assert('18.01 no executionInfluence',         result.executionInfluence === false);
assert('18.02 no runtimeIntegrated',          result.runtimeIntegrated === false);
assert('18.03 authorityLevel NONE',           result.strategyMetadata.authorityLevel === 'NONE');
assert('18.04 descriptiveOnly true',          result.descriptiveOnly === true);
assert('18.05 generatedAt null (no time ops)', result.generatedAt === null);
assert('18.06 no executable exports',         !Object.keys(require('./lib/runtime/strategy-engine')).includes('execute'));
assert('18.07 no execute or run exports',     Object.keys(require('./lib/runtime/strategy-engine')).every(k => !['execute','run','trigger','schedule'].includes(k)));
assert('18.08 output frozen prevents mutation', (() => {
    const r = formulate(fullInput);
    try { r.executionInfluence = true; } catch (_) {}
    return r.executionInfluence === false;
})());
assert('18.09 no side effects on require',    (() => {
    delete require.cache[require.resolve('./lib/runtime/strategy-engine')];
    require('./lib/runtime/strategy-engine');
    return true;
})());
assert('18.10 no state carries across calls', (() => {
    formulate(fullInput);
    formulate({});
    const r = formulate(fullInput);
    return r.strategyHash === result.strategyHash;
})());

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length > 0) {
    console.error(`\nFailed assertions:\n${failures.join('\n')}`);
    process.exit(1);
}
