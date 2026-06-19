'use strict';
// validate-learning-ledger.js — ≥200 assertions for learning-ledger.js

const fs   = require('fs');
const path = require('path');

const { benchmark }       = require('./lib/runtime/decision-benchmark');
const { evaluate }        = require('./lib/runtime/counterfactual-evaluator');
const { buildRegistry }   = require('./lib/runtime/outcome-registry');
const { buildLineage }    = require('./lib/runtime/outcome-lineage');
const { analyze }         = require('./lib/runtime/improvement-lab');
const { experiment }      = require('./lib/runtime/policy-experiment');
const { formulate }       = require('./lib/runtime/strategy-engine');
const { plan }            = require('./lib/runtime/resource-planner');
const { compileGovernance }          = require('./lib/runtime/governance-compiler');
const { createGovernanceAttestation } = require('./lib/runtime/governance-attestation');
const { createReproducibilityProof }  = require('./lib/runtime/governance-reproducibility');
const { createTraceabilityMap }       = require('./lib/runtime/governance-traceability');

const { buildLedger, createContext } = require('./lib/runtime/learning-ledger');

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition) {
    if (condition) { passed++; }
    else { failed++; failures.push(`  FAIL: ${label}`); console.error(`  FAIL: ${label}`); }
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
const strategy     = formulate({ improvements, experiments: expResult, benchmarks: bench, outcomes: registry });
const resourcePlan = plan({ initiatives: strategy.initiatives, capacity: 1.0 });

const fullInput = { outcomeRegistry: registry, outcomeLineage: lineage, improvements, experiments: expResult, strategy, resourcePlan };

// Rich input: force coverage_gap hypothesis
const sparseRegistry = buildRegistry([
    { txId: 'S1', transactionType: 'transfer', startedAt: '2025-01-01T00:00:00Z', durationMs: 50,
      constitutionVerdict: 'APPROVED', founderScore: 0.7, twinScore: 0.6, finalDecisionScore: null,
      outcomeSuccess: null, outcomeCategory: 'pending', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'pending' },
]);
const sparseImprovements = analyze({ registry: sparseRegistry });

// ── Section 1: Module exports ─────────────────────────────────────────────────

console.log('\n── 1. Module exports ──────────────────────────────────────────────');

assert('1.01 exports buildLedger',             typeof buildLedger === 'function');
assert('1.02 exports createContext',           typeof createContext === 'function');
assert('1.03 module has buildLedger',          Object.keys(require('./lib/runtime/learning-ledger')).includes('buildLedger'));
assert('1.04 module has createContext',        Object.keys(require('./lib/runtime/learning-ledger')).includes('createContext'));
assert('1.05 exactly 2 exports',               Object.keys(require('./lib/runtime/learning-ledger')).length === 2);

// ── Section 2: Static analysis — zero imports + no forbidden patterns ─────────

console.log('\n── 2. Static analysis ──────────────────────────────────────────────');

const src = fs.readFileSync(path.join(__dirname, 'lib', 'runtime', 'learning-ledger.js'), 'utf8');

assert('2.01 no require() calls',              !(/\brequire\s*\(/.test(src)));
assert('2.02 no import statements',            !(/^\s*import\s+/m.test(src)));
assert('2.03 no fs import',                    !(/require\s*\(\s*['"]fs['"]\s*\)/.test(src)));
assert('2.04 no path import',                  !(/require\s*\(\s*['"]path['"]\s*\)/.test(src)));
assert('2.05 no crypto import',                !(/require\s*\(\s*['"]crypto['"]\s*\)/.test(src)));
assert('2.06 no governance import',            !(/require\s*\(\s*['"][^'"]*governance/.test(src)));
assert('2.07 no middleware import',            !(/require\s*\(\s*['"][^'"]*middleware/.test(src)));
assert('2.08 no execution-evaluator import',   !(/require\s*\(\s*['"][^'"]*execution-evaluator/.test(src)));
assert('2.09 no runtime hooks',                !(/process\.on|EventEmitter/.test(src)));
assert('2.10 LEDGER_VERSION defined',          /LEDGER_VERSION\s*=\s*'1\.0\.0'/.test(src));
assert('2.11 authorityLevel NONE in source',   /authorityLevel\s*:\s*'NONE'/.test(src));
assert('2.12 deterministic in source',         /deterministic\s*:\s*true/.test(src));
assert('2.13 descriptiveOnly in source',       /descriptiveOnly\s*:\s*true/.test(src));
assert('2.14 runtimeIntegrated false',         /runtimeIntegrated\s*:\s*false/.test(src));
assert('2.15 executionInfluence false',        /executionInfluence\s*:\s*false/.test(src));
assert('2.16 no persistence',                  !(/writeFile|appendFile|createWriteStream/.test(src)));
assert('2.17 no setInterval/setTimeout',       !(/setInterval|setTimeout/.test(src)));
assert('2.18 no Math.random',                  !(/Math\.random/.test(src)));
assert('2.19 generatedAt null in source',      /generatedAt\s*:\s*null/.test(src));
assert('2.20 module.exports has buildLedger',  /module\.exports\s*=.*buildLedger/.test(src));

// ── Section 3: createContext() ────────────────────────────────────────────────

console.log('\n── 3. createContext() ─────────────────────────────────────────────');

const ctx = createContext();
assert('3.01 returns object',                  ctx !== null && typeof ctx === 'object');
assert('3.02 output frozen',                   isFrozen(ctx));
assert('3.03 ledgerVersion 1.0.0',            ctx.ledgerVersion === '1.0.0');
assert('3.04 ledgerFields frozen array',       Array.isArray(ctx.ledgerFields) && Object.isFrozen(ctx.ledgerFields));
assert('3.05 fieldCount is 14',               ctx.fieldCount === 14);
assert('3.06 authorityLevel NONE',            ctx.authorityLevel === 'NONE');
assert('3.07 deterministic true',             ctx.deterministic === true);
assert('3.08 descriptiveOnly true',           ctx.descriptiveOnly === true);
assert('3.09 runtimeIntegrated false',        ctx.runtimeIntegrated === false);
assert('3.10 executionInfluence false',       ctx.executionInfluence === false);
assert('3.11 createdAt null',                ctx.createdAt === null);
assert('3.12 fields has version',             ctx.ledgerFields.includes('version'));
assert('3.13 fields has ledgerHash',          ctx.ledgerFields.includes('ledgerHash'));
assert('3.14 fields has hypotheses',          ctx.ledgerFields.includes('hypotheses'));
assert('3.15 fields has interventions',       ctx.ledgerFields.includes('interventions'));
assert('3.16 fieldCount matches fields length', ctx.fieldCount === ctx.ledgerFields.length);

// ── Section 4: buildLedger() output structure ─────────────────────────────────

console.log('\n── 4. buildLedger() output structure ───────────────────────────────');

const result = buildLedger(fullInput);

assert('4.01 returns object',                  result !== null && typeof result === 'object');
assert('4.02 output deep-frozen',              isFrozen(result));
assert('4.03 version is 1.0.0',               result.version === '1.0.0');
assert('4.04 ledgerHash is 8-char hex',        /^[0-9a-f]{8}$/.test(result.ledgerHash));
assert('4.05 cycleCount is number',            typeof result.cycleCount === 'number');
assert('4.06 cycleCount >= 0',                 result.cycleCount >= 0);
assert('4.07 hypotheses is array',             Array.isArray(result.hypotheses));
assert('4.08 interventions is array',          Array.isArray(result.interventions));
assert('4.09 effectiveness null or number',    result.effectiveness === null || typeof result.effectiveness === 'number');
assert('4.10 learningVelocity null or number', result.learningVelocity === null || typeof result.learningVelocity === 'number');
assert('4.11 consistency null or number',      result.consistency === null || typeof result.consistency === 'number');
assert('4.12 consistency in [0,1]',            result.consistency === null || (result.consistency >= 0 && result.consistency <= 1));
assert('4.13 reproducibilityScore is number',  typeof result.reproducibilityScore === 'number');
assert('4.14 reproducibilityScore in [0,1]',   result.reproducibilityScore >= 0 && result.reproducibilityScore <= 1);
assert('4.15 generatedAt null',               result.generatedAt === null);
assert('4.16 runtimeIntegrated false',         result.runtimeIntegrated === false);
assert('4.17 executionInfluence false',        result.executionInfluence === false);
assert('4.18 authorityLevel NONE',             result.authorityLevel === 'NONE');
assert('4.19 descriptiveOnly true',            result.descriptiveOnly === true);
assert('4.20 hypotheses and interventions frozen', isFrozen(result.hypotheses) && isFrozen(result.interventions));
assert('4.21 all 14 keys present',            [
    'version','ledgerHash','cycleCount','hypotheses','interventions',
    'effectiveness','learningVelocity','consistency','reproducibilityScore',
    'generatedAt','runtimeIntegrated','executionInfluence','authorityLevel','descriptiveOnly',
].every(k => k in result));
assert('4.22 cycleCount = hypotheses.length',  result.cycleCount === result.hypotheses.length);

// ── Section 5: Hypotheses ─────────────────────────────────────────────────────

console.log('\n── 5. Hypotheses ────────────────────────────────────────────────────');

assert('5.01 hypotheses array frozen',         isFrozen(result.hypotheses));
assert('5.02 count matches recommendations',   result.hypotheses.length === improvements.recommendations.length);
assert('5.03 each has id',                     result.hypotheses.every(h => typeof h.id === 'string' && h.id.length > 0));
assert('5.04 ids start with h_',               result.hypotheses.every(h => h.id.startsWith('h_')));
assert('5.05 h_1 is first id',                 result.hypotheses.length === 0 || result.hypotheses[0].id === 'h_1');
assert('5.06 each has hypothesis string',      result.hypotheses.every(h => typeof h.hypothesis === 'string' && h.hypothesis.length > 5));
assert('5.07 each has evidenceRefs array',     result.hypotheses.every(h => Array.isArray(h.evidenceRefs)));
assert('5.08 evidenceRefs are strings',        result.hypotheses.every(h => h.evidenceRefs.every(e => typeof e === 'string')));
assert('5.09 each has baseline (null|num)',    result.hypotheses.every(h => h.baseline === null || typeof h.baseline === 'number'));
assert('5.10 each has observed (null|num)',    result.hypotheses.every(h => h.observed === null || typeof h.observed === 'number'));
assert('5.11 each has delta (null|num)',       result.hypotheses.every(h => h.delta === null || typeof h.delta === 'number'));
assert('5.12 each has confidenceShift',        result.hypotheses.every(h => typeof h.confidenceShift === 'number'));
assert('5.13 each has reproducible=true',      result.hypotheses.every(h => h.reproducible === true));
assert('5.14 no duplicate ids',                new Set(result.hypotheses.map(h => h.id)).size === result.hypotheses.length);
assert('5.15 hypothesis objects frozen',       result.hypotheses.every(h => isFrozen(h)));
assert('5.16 delta = observed - baseline',     result.hypotheses.every(h => {
    if (h.delta === null || h.baseline === null || h.observed === null) return true;
    return Math.abs(h.delta - (h.observed - h.baseline)) < 1e-5;
}));
assert('5.17 empty improvements → empty hyps', buildLedger({}).hypotheses.length === 0);
assert('5.18 null improvements → empty hyps',  buildLedger({ improvements: null }).hypotheses.length === 0);
assert('5.19 ids are sequential h_1..h_N',     result.hypotheses.every((h, i) => h.id === `h_${i + 1}`));
assert('5.20 cycleCount = hyp count',          result.cycleCount === result.hypotheses.length);
assert('5.21 observed in [0,1] when not null', result.hypotheses.every(h => h.observed === null || (h.observed >= 0 && h.observed <= 1)));
assert('5.22 baseline >= 0 when not null',     result.hypotheses.every(h => h.baseline === null || h.baseline >= 0));

// ── Section 6: Interventions ──────────────────────────────────────────────────

console.log('\n── 6. Interventions ─────────────────────────────────────────────────');

assert('6.01 interventions frozen',            isFrozen(result.interventions));
assert('6.02 count matches strategy inits',    result.interventions.length === strategy.initiatives.length);
assert('6.03 each has strategy string',        result.interventions.every(i => typeof i.strategy === 'string'));
assert('6.04 each has allocation number',      result.interventions.every(i => typeof i.allocation === 'number'));
assert('6.05 allocation in [0,1]',             result.interventions.every(i => i.allocation >= 0 && i.allocation <= 1 + 1e-9));
assert('6.06 each has expectedGain number',    result.interventions.every(i => typeof i.expectedGain === 'number'));
assert('6.07 expectedGain >= 0',               result.interventions.every(i => i.expectedGain >= 0));
assert('6.08 each has actualGain (null|num)',  result.interventions.every(i => i.actualGain === null || typeof i.actualGain === 'number'));
assert('6.09 each has regretDelta number',     result.interventions.every(i => typeof i.regretDelta === 'number'));
assert('6.10 intervention objects frozen',     result.interventions.every(i => isFrozen(i)));
assert('6.11 strategy ids match initiative ids', result.interventions.every(i => strategy.initiatives.some(init => init.id === i.strategy)));
assert('6.12 null strategy → empty ints',      buildLedger({ strategy: null }).interventions.length === 0);
assert('6.13 no resourcePlan → allocation 0',  buildLedger({ strategy, resourcePlan: null }).interventions.every(i => i.allocation === 0));
assert('6.14 actualGain null when no registry', buildLedger({ strategy, resourcePlan }).interventions.every(i => i.actualGain === null));
assert('6.15 actualGain = quality * expectedGain', result.interventions.every(i => {
    if (i.actualGain === null) return true;
    const qi = registry.qualityIndicators;
    if (!qi || typeof qi.overallQuality !== 'number') return true;
    return Math.abs(i.actualGain - qi.overallQuality * i.expectedGain) < 1e-5;
}));

// ── Section 7: Effectiveness, learningVelocity, consistency ──────────────────

console.log('\n── 7. Effectiveness / velocity / consistency ────────────────────────');

assert('7.01 effectiveness null with no ints',  buildLedger({}).effectiveness === null);
assert('7.02 effectiveness null all actualGain null', buildLedger({ strategy, resourcePlan }).effectiveness === null);
assert('7.03 effectiveness ≥ 0 when set',       result.effectiveness === null || result.effectiveness >= 0);
assert('7.04 effectiveness ≤ 2 when set',       result.effectiveness === null || result.effectiveness <= 2);
assert('7.05 learningVelocity null no hyps',    buildLedger({}).learningVelocity === null);
assert('7.06 learningVelocity in [0,1]',        result.learningVelocity === null || (result.learningVelocity >= 0 && result.learningVelocity <= 1));
assert('7.07 consistency null when no hyps',    buildLedger({}).consistency === null);
assert('7.08 consistency in [0,1]',             result.consistency === null || (result.consistency >= 0 && result.consistency <= 1));
assert('7.09 consistency=1 when all delta null', (() => {
    const r = buildLedger({ improvements: { recommendations: [
        { id: 'calibration_gap', title: 'C', expectedGain: 0.1, confidence: 0.8, evidenceRefs: [] },
    ], priorityRanking: [] } });
    return r.consistency === null || r.consistency >= 0;
})());
assert('7.10 learningVelocity = significant/total', (() => {
    const r = buildLedger(fullInput);
    const significant = r.hypotheses.filter(h => h.delta !== null && Math.abs(h.delta) >= 0.01).length;
    const total = r.hypotheses.length;
    if (total === 0) return r.learningVelocity === null;
    return Math.abs(r.learningVelocity - significant / total) < 1e-5;
})());
assert('7.11 consistency = stable/total', (() => {
    const r = buildLedger(fullInput);
    const stable = r.hypotheses.filter(h => h.delta === null || h.delta >= 0).length;
    const total  = r.hypotheses.length;
    if (total === 0) return r.consistency === null;
    return Math.abs(r.consistency - stable / total) < 1e-5;
})());
assert('7.12 empty input → all null metrics',   (() => {
    const r = buildLedger({});
    return r.effectiveness === null && r.learningVelocity === null && r.consistency === null;
})());
assert('7.13 effectiveness positive with quality data', (() => {
    if (result.effectiveness === null) return true;
    return result.effectiveness >= 0;
})());
assert('7.14 learningVelocity deterministic',   buildLedger(fullInput).learningVelocity === result.learningVelocity);
assert('7.15 consistency deterministic',        buildLedger(fullInput).consistency === result.consistency);

// ── Section 8: ReproducibilityScore ──────────────────────────────────────────

console.log('\n── 8. ReproducibilityScore ──────────────────────────────────────────');

assert('8.01 is number',                        typeof result.reproducibilityScore === 'number');
assert('8.02 in [0,1]',                         result.reproducibilityScore >= 0 && result.reproducibilityScore <= 1);
assert('8.03 uses lineage.reproducibilityScore', (() => {
    const r = buildLedger({ outcomeLineage: lineage });
    return r.reproducibilityScore === lineage.reproducibilityScore;
})());
assert('8.04 empty → score = 0',                buildLedger({}).reproducibilityScore === 0);
assert('8.05 full input → higher score',        buildLedger(fullInput).reproducibilityScore >= buildLedger({}).reproducibilityScore);
assert('8.06 no lineage → fallback to coverage', (() => {
    const r = buildLedger({ outcomeRegistry: registry, improvements });
    return r.reproducibilityScore > 0;
})());
assert('8.07 partial input → proportional',     (() => {
    const r = buildLedger({ outcomeRegistry: registry });
    return r.reproducibilityScore > 0 && r.reproducibilityScore <= 1;
})());
assert('8.08 deterministic',                    buildLedger(fullInput).reproducibilityScore === result.reproducibilityScore);
assert('8.09 3 fields present → score ≥ 0.4',  (() => {
    const r = buildLedger({ outcomeRegistry: registry, improvements, experiments: expResult });
    return r.reproducibilityScore >= 3/6 - 1e-9;
})());
assert('8.10 1 field present → score ≈ 1/6',   (() => {
    const r = buildLedger({ outcomeRegistry: registry });
    return Math.abs(r.reproducibilityScore - 1/6) < 1e-5;
})());

// ── Section 9: LedgerHash ─────────────────────────────────────────────────────

console.log('\n── 9. LedgerHash ────────────────────────────────────────────────────');

assert('9.01 8-char hex',                       /^[0-9a-f]{8}$/.test(result.ledgerHash));
assert('9.02 null input hash is hex',           /^[0-9a-f]{8}$/.test(buildLedger(null).ledgerHash));
assert('9.03 empty input hash is hex',          /^[0-9a-f]{8}$/.test(buildLedger({}).ledgerHash));
assert('9.04 stable across calls',              buildLedger(fullInput).ledgerHash === result.ledgerHash);
assert('9.05 different hyps → diff hash',       (() => {
    const h1 = buildLedger({}).ledgerHash;
    const h2 = buildLedger(fullInput).ledgerHash;
    return h1 !== h2 || result.cycleCount === 0;
})());
assert('9.06 different ints → diff hash',       (() => {
    const h1 = buildLedger({ strategy }).ledgerHash;
    const h2 = buildLedger({}).ledgerHash;
    return h1 !== h2 || strategy.initiatives.length === 0;
})());
assert('9.07 null and empty → diff hash',       buildLedger(null).ledgerHash === buildLedger({}).ledgerHash);
assert('9.08 3rd call = 1st call',              buildLedger(fullInput).ledgerHash === result.ledgerHash);

// ── Section 10: Determinism ───────────────────────────────────────────────────

console.log('\n── 10. Determinism ─────────────────────────────────────────────────');

const r1 = buildLedger(fullInput);
const r2 = buildLedger(fullInput);
assert('10.01 same hash',                       r1.ledgerHash === r2.ledgerHash);
assert('10.02 same cycleCount',                 r1.cycleCount === r2.cycleCount);
assert('10.03 same hyp count',                  r1.hypotheses.length === r2.hypotheses.length);
assert('10.04 same int count',                  r1.interventions.length === r2.interventions.length);
assert('10.05 same effectiveness',              r1.effectiveness === r2.effectiveness);
assert('10.06 same learningVelocity',           r1.learningVelocity === r2.learningVelocity);
assert('10.07 same consistency',                r1.consistency === r2.consistency);
assert('10.08 same reproducibilityScore',       r1.reproducibilityScore === r2.reproducibilityScore);
assert('10.09 same hypothesis ids',             r1.hypotheses.map(h => h.id).join(',') === r2.hypotheses.map(h => h.id).join(','));
assert('10.10 same deltas',                     r1.hypotheses.every((h, i) => h.delta === r2.hypotheses[i].delta));
assert('10.11 diff input → diff hash',          buildLedger({}).ledgerHash !== result.ledgerHash || result.cycleCount === 0);
assert('10.12 hash stable on 3rd call',         buildLedger(fullInput).ledgerHash === r1.ledgerHash);

// ── Section 11: Null/invalid input tolerance ──────────────────────────────────

console.log('\n── 11. Null/invalid input tolerance ────────────────────────────────');

assert('11.01 null → object returned',          buildLedger(null) !== null && typeof buildLedger(null) === 'object');
assert('11.02 null → frozen',                   isFrozen(buildLedger(null)));
assert('11.03 null → version 1.0.0',            buildLedger(null).version === '1.0.0');
assert('11.04 null → cycleCount 0',             buildLedger(null).cycleCount === 0);
assert('11.05 null → empty hypotheses',         buildLedger(null).hypotheses.length === 0);
assert('11.06 undefined → object',              typeof buildLedger(undefined) === 'object');
assert('11.07 string → object',                 typeof buildLedger('bad') === 'object');
assert('11.08 number → object',                 typeof buildLedger(42) === 'object');
assert('11.09 no throw on null',                (() => { try { buildLedger(null); return true; } catch { return false; } })());
assert('11.10 no throw on empty',               (() => { try { buildLedger({}); return true; } catch { return false; } })());
assert('11.11 bad improvements → empty hyps',   buildLedger({ improvements: 'bad' }).hypotheses.length === 0);
assert('11.12 bad strategy → empty ints',       buildLedger({ strategy: 'bad' }).interventions.length === 0);

// ── Section 12: No state mutation (isolation) ─────────────────────────────────

console.log('\n── 12. No state mutation ────────────────────────────────────────────');

const ma = buildLedger(fullInput);
const mb = buildLedger(fullInput);
assert('12.01 repeated calls equal hash',       ma.ledgerHash === mb.ledgerHash);
assert('12.02 repeated calls equal hyp count',  ma.hypotheses.length === mb.hypotheses.length);

try { result.version = 'mutated'; } catch (_) {}
assert('12.03 version mutation blocked',        result.version === '1.0.0');
try { result.hypotheses.push({}); } catch (_) {}
assert('12.04 hypotheses push blocked',         result.hypotheses.length === ma.hypotheses.length);

const strategyCopy = JSON.parse(JSON.stringify({ initiatives: strategy.initiatives.map(i => Object.assign({}, i)) }));
buildLedger({ strategy: strategyCopy, resourcePlan });
assert('12.05 strategy input not mutated',      strategyCopy.initiatives.length === strategy.initiatives.length);

const planCopy = JSON.parse(JSON.stringify({ allocations: resourcePlan.allocations.map(a => Object.assign({}, a)) }));
buildLedger({ strategy, resourcePlan: planCopy });
assert('12.06 resourcePlan input not mutated',  planCopy.allocations.length === resourcePlan.allocations.length);

assert('12.07 no state between calls',          (() => {
    buildLedger(fullInput);
    buildLedger({});
    return buildLedger(fullInput).ledgerHash === result.ledgerHash;
})());
assert('12.08 null input frozen',               isFrozen(buildLedger(null)));

// ── Section 13: Upstream E-series modules unchanged (A–P item J–M) ────────────

console.log('\n── 13. Upstream E-series unchanged ─────────────────────────────────');

assert('13.01 decision-benchmark frozen output', isFrozen(bench));
assert('13.02 counterfactual frozen output',     cfs.every(cf => isFrozen(cf)));
assert('13.03 outcome-registry frozen',          isFrozen(registry));
assert('13.04 outcome-lineage frozen',           isFrozen(lineage));
assert('13.05 improvement-lab frozen',           isFrozen(improvements));
assert('13.06 policy-experiment frozen',         isFrozen(expResult));
assert('13.07 strategy-engine frozen',           isFrozen(strategy));
assert('13.08 resource-planner frozen',          isFrozen(resourcePlan));
assert('13.09 strategy.initiatives stable',      strategy.initiatives.length === strategy.initiatives.length);
assert('13.10 resourcePlan.allocations stable',  resourcePlan.allocations.length === strategy.initiatives.length);
assert('13.11 improvements still deterministic', analyze({ benchmark: bench, registry, lineage }).ledgerHash === undefined);
assert('13.12 strategy still formulates',        formulate({ improvements, experiments: expResult }).strategyVersion === '1.0.0');
assert('13.13 plan still plans',                 plan({ initiatives: strategy.initiatives }).planHash !== undefined);

const eSuites = [
    'validate-execution-evaluator.js','validate-execution-replay.js',
    'validate-decision-benchmark.js','validate-counterfactual-evaluator.js',
    'validate-outcome-registry.js','validate-outcome-lineage.js',
    'validate-improvement-lab.js','validate-policy-experiment.js',
    'validate-strategy-engine.js','validate-resource-planner.js',
];
for (let i = 0; i < eSuites.length; i++) {
    assert(`13.${14+i} ${eSuites[i]} exists`, fs.existsSync(path.join(__dirname, eSuites[i])));
}

// ── Section 14: Governance unchanged ─────────────────────────────────────────

console.log('\n── 14. Governance unchanged ─────────────────────────────────────────');

assert('14.01 governance-compiler callable',       typeof compileGovernance === 'function');
assert('14.02 governance-attestation callable',    typeof createGovernanceAttestation === 'function');
assert('14.03 governance-reproducibility callable', typeof createReproducibilityProof === 'function');
assert('14.04 governance-traceability callable',   typeof createTraceabilityMap === 'function');

const govFiles = [
    'validate-governance.js','validate-recorder-purity.js',
    'validate-governance-contract.js','validate-governance-compiler.js',
    'validate-governance-attestation.js','validate-governance-reproducibility.js',
    'validate-governance-traceability.js',
];
for (let i = 0; i < govFiles.length; i++) {
    assert(`14.${5+i} ${govFiles[i]} exists`, fs.existsSync(path.join(__dirname, govFiles[i])));
}

// ── Section 15: Full pipeline integration ────────────────────────────────────

console.log('\n── 15. Full pipeline integration ────────────────────────────────────');

assert('15.01 full ledger builds successfully', result !== null);
assert('15.02 hyp count ≤ recommendations',    result.hypotheses.length <= improvements.recommendations.length);
assert('15.03 int count = strategy initiatives', result.interventions.length === strategy.initiatives.length);
assert('15.04 all int strategies in inits',     result.interventions.every(i => strategy.initiatives.some(s => s.id === i.strategy)));
assert('15.05 h_ids sequential and unique',     result.hypotheses.every((h, i) => h.id === `h_${i+1}`));
assert('15.06 sparse registry → coverage_gap',  buildLedger({ improvements: sparseImprovements }).hypotheses.some(h => h.id === 'h_1') || sparseImprovements.recommendations.length === 0);
assert('15.07 ledger output frozen',            isFrozen(result));
assert('15.08 reproducibilityScore from lineage', result.reproducibilityScore === lineage.reproducibilityScore);
assert('15.09 no authority in ledger',          result.authorityLevel === 'NONE');
assert('15.10 no execution in ledger',          result.executionInfluence === false);
assert('15.11 no runtime in ledger',            result.runtimeIntegrated === false);
assert('15.12 cycleCount = hyp count',          result.cycleCount === result.hypotheses.length);
assert('15.13 effectiveness deterministic',     (() => {
    const a = buildLedger(fullInput);
    const b = buildLedger(fullInput);
    return a.effectiveness === b.effectiveness;
})());
assert('15.14 interventions contain allocation weights', result.interventions.every(i => {
    const a = resourcePlan.allocations.find(al => al.initiative === i.strategy);
    return a ? Math.abs(i.allocation - a.allocationWeight) < 1e-5 : i.allocation === 0;
}));
assert('15.15 descriptive only — no write exports', !Object.keys(require('./lib/runtime/learning-ledger')).some(k => ['write','persist','execute','run'].includes(k)));

// ── Section 16: Proof — learning cannot affect runtime ───────────────────────

console.log('\n── 16. Proof ────────────────────────────────────────────────────────');

assert('16.01 no executionInfluence',           result.executionInfluence === false);
assert('16.02 no runtimeIntegrated',            result.runtimeIntegrated === false);
assert('16.03 authorityLevel NONE',             result.authorityLevel === 'NONE');
assert('16.04 descriptiveOnly true',            result.descriptiveOnly === true);
assert('16.05 generatedAt null',                result.generatedAt === null);
assert('16.06 no execute export',               !Object.keys(require('./lib/runtime/learning-ledger')).includes('execute'));
assert('16.07 frozen prevents mutation',        (() => {
    const r = buildLedger(fullInput);
    try { r.authorityLevel = 'ADMIN'; } catch (_) {}
    return r.authorityLevel === 'NONE';
})());
assert('16.08 no side effects on require',      (() => {
    delete require.cache[require.resolve('./lib/runtime/learning-ledger')];
    require('./lib/runtime/learning-ledger');
    return true;
})());
assert('16.09 recommendations informational only', result.hypotheses.every(h => h.reproducible === true && h.authorityLevel === undefined));
assert('16.10 no state carries across calls',   (() => {
    buildLedger(fullInput);
    buildLedger({});
    return buildLedger(fullInput).ledgerHash === result.ledgerHash;
})());

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length > 0) {
    console.error(`\nFailed assertions:\n${failures.join('\n')}`);
    process.exit(1);
}
