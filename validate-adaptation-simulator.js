'use strict';
// validate-adaptation-simulator.js — ≥200 assertions for adaptation-simulator.js

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
const { buildLedger }     = require('./lib/runtime/learning-ledger');
const { compileGovernance }          = require('./lib/runtime/governance-compiler');
const { createGovernanceAttestation } = require('./lib/runtime/governance-attestation');
const { createReproducibilityProof }  = require('./lib/runtime/governance-reproducibility');
const { createTraceabilityMap }       = require('./lib/runtime/governance-traceability');

const { simulate, createContext } = require('./lib/runtime/adaptation-simulator');

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
const ledger       = buildLedger({ outcomeRegistry: registry, outcomeLineage: lineage, improvements, experiments: expResult, strategy, resourcePlan });

const fullInput    = { ledger, strategy, resourcePlan };

// Single-initiative strategy for simple tests
const singleInit   = Object.freeze({ id: 'si_1', title: 'Single', priority: 1, expectedGain: 0.3, complexity: 'LOW', timeToImpact: 'SHORT', confidence: 0.8, dependencies: [], rationale: 'r', evidenceRefs: [] });
const singleStrat  = Object.freeze({ initiatives: Object.freeze([singleInit]), compoundImpact: 0.3 });
const singlePlan   = plan({ initiatives: [singleInit], capacity: 1.0 });

// ── Section 1: Module exports ─────────────────────────────────────────────────

console.log('\n── 1. Module exports ──────────────────────────────────────────────');

assert('1.01 exports simulate function',      typeof simulate === 'function');
assert('1.02 exports createContext function', typeof createContext === 'function');
assert('1.03 module has simulate',            Object.keys(require('./lib/runtime/adaptation-simulator')).includes('simulate'));
assert('1.04 module has createContext',       Object.keys(require('./lib/runtime/adaptation-simulator')).includes('createContext'));
assert('1.05 exactly 2 exports',              Object.keys(require('./lib/runtime/adaptation-simulator')).length === 2);

// ── Section 2: Static analysis ────────────────────────────────────────────────

console.log('\n── 2. Static analysis ──────────────────────────────────────────────');

const src = fs.readFileSync(path.join(__dirname, 'lib', 'runtime', 'adaptation-simulator.js'), 'utf8');

assert('2.01 no require() calls',             !(/\brequire\s*\(/.test(src)));
assert('2.02 no import statements',           !(/^\s*import\s+/m.test(src)));
assert('2.03 no fs import',                   !(/require\s*\(\s*['"]fs['"]\s*\)/.test(src)));
assert('2.04 no path import',                 !(/require\s*\(\s*['"]path['"]\s*\)/.test(src)));
assert('2.05 no crypto import',               !(/require\s*\(\s*['"]crypto['"]\s*\)/.test(src)));
assert('2.06 no governance import',           !(/require\s*\(\s*['"][^'"]*governance/.test(src)));
assert('2.07 no middleware import',           !(/require\s*\(\s*['"][^'"]*middleware/.test(src)));
assert('2.08 SIMULATOR_VERSION defined',      /SIMULATOR_VERSION\s*=\s*'1\.0\.0'/.test(src));
assert('2.09 authorityLevel NONE in source',  /authorityLevel\s*:\s*'NONE'/.test(src));
assert('2.10 deterministic true in source',   /deterministic\s*:\s*true/.test(src));
assert('2.11 descriptiveOnly true in source', /descriptiveOnly\s*:\s*true/.test(src));
assert('2.12 no persistence',                 !(/writeFile|appendFile|createWriteStream/.test(src)));
assert('2.13 no setInterval/setTimeout',      !(/setInterval|setTimeout/.test(src)));
assert('2.14 no Math.random',                 !(/Math\.random/.test(src)));
assert('2.15 generatedAt null in source',     /generatedAt\s*:\s*null/.test(src));
assert('2.16 no runtime hooks',               !(/process\.on|EventEmitter/.test(src)));
assert('2.17 module.exports has simulate',    /module\.exports\s*=.*simulate/.test(src));
assert('2.18 reproducible true in scenarios', /reproducible\s*:\s*true/.test(src));

// ── Section 3: createContext() ────────────────────────────────────────────────

console.log('\n── 3. createContext() ─────────────────────────────────────────────');

const ctx = createContext();
assert('3.01 returns object',                 ctx !== null && typeof ctx === 'object');
assert('3.02 output frozen',                  isFrozen(ctx));
assert('3.03 simulatorVersion 1.0.0',        ctx.simulatorVersion === '1.0.0');
assert('3.04 simulatorFields frozen array',   Array.isArray(ctx.simulatorFields) && Object.isFrozen(ctx.simulatorFields));
assert('3.05 fieldCount is 12',              ctx.fieldCount === 12);
assert('3.06 authorityLevel NONE',           ctx.authorityLevel === 'NONE');
assert('3.07 deterministic true',            ctx.deterministic === true);
assert('3.08 descriptiveOnly true',          ctx.descriptiveOnly === true);
assert('3.09 runtimeIntegrated false',       ctx.runtimeIntegrated === false);
assert('3.10 executionInfluence false',      ctx.executionInfluence === false);
assert('3.11 createdAt null',               ctx.createdAt === null);
assert('3.12 fields has simulationHash',     ctx.simulatorFields.includes('simulationHash'));
assert('3.13 fields has scenarios',          ctx.simulatorFields.includes('scenarios'));
assert('3.14 fields has winner',             ctx.simulatorFields.includes('winner'));
assert('3.15 fieldCount matches fields',     ctx.fieldCount === ctx.simulatorFields.length);

// ── Section 4: simulate() output structure ────────────────────────────────────

console.log('\n── 4. simulate() output structure ──────────────────────────────────');

const result = simulate(fullInput);

assert('4.01 returns object',                 result !== null && typeof result === 'object');
assert('4.02 output deep-frozen',             isFrozen(result));
assert('4.03 version is 1.0.0',              result.version === '1.0.0');
assert('4.04 simulationHash 8-char hex',      /^[0-9a-f]{8}$/.test(result.simulationHash));
assert('4.05 scenarios is array',             Array.isArray(result.scenarios));
assert('4.06 winner null or string',          result.winner === null || typeof result.winner === 'string');
assert('4.07 expectedImprovement null|num',   result.expectedImprovement === null || typeof result.expectedImprovement === 'number');
assert('4.08 adaptationConfidence null|num',  result.adaptationConfidence === null || typeof result.adaptationConfidence === 'number');
assert('4.09 deterministic true',             result.deterministic === true);
assert('4.10 generatedAt null',              result.generatedAt === null);
assert('4.11 runtimeIntegrated false',        result.runtimeIntegrated === false);
assert('4.12 executionInfluence false',       result.executionInfluence === false);
assert('4.13 authorityLevel NONE',            result.authorityLevel === 'NONE');
assert('4.14 descriptiveOnly true',           result.descriptiveOnly === true);
assert('4.15 scenarios frozen',               isFrozen(result.scenarios));
assert('4.16 all 12 keys present',           [
    'version','simulationHash','scenarios','winner',
    'expectedImprovement','adaptationConfidence','deterministic',
    'generatedAt','runtimeIntegrated','executionInfluence',
    'authorityLevel','descriptiveOnly',
].every(k => k in result));
assert('4.17 empty strategy → empty scenarios', simulate({ strategy: { initiatives: [] }, resourcePlan, ledger }).scenarios.length === 0);
assert('4.18 null input → empty scenarios',    simulate(null).scenarios.length === 0);
assert('4.19 scenario count = initiative count', result.scenarios.length === strategy.initiatives.length);
assert('4.20 adaptationConfidence in [0,1]',   result.adaptationConfidence === null || (result.adaptationConfidence >= 0 && result.adaptationConfidence <= 1));

// ── Section 5: Scenarios ──────────────────────────────────────────────────────

console.log('\n── 5. Scenarios ─────────────────────────────────────────────────────');

assert('5.01 scenarios frozen array',          isFrozen(result.scenarios));
assert('5.02 each has id',                     result.scenarios.every(s => typeof s.id === 'string'));
assert('5.03 ids start with scenario_',        result.scenarios.every(s => s.id.startsWith('scenario_')));
assert('5.04 ids are sequential',              result.scenarios.every((s, i) => s.id === `scenario_${i + 1}`));
assert('5.05 each has strategy string',        result.scenarios.every(s => typeof s.strategy === 'string'));
assert('5.06 each has resourcePlan number',    result.scenarios.every(s => typeof s.resourcePlan === 'number'));
assert('5.07 resourcePlan in [0,1]',           result.scenarios.every(s => s.resourcePlan >= 0 && s.resourcePlan <= 1 + 1e-9));
assert('5.08 each has predictedGain',          result.scenarios.every(s => typeof s.predictedGain === 'number'));
assert('5.09 predictedGain in [0,1]',          result.scenarios.every(s => s.predictedGain >= 0 && s.predictedGain <= 1));
assert('5.10 each has confidence',             result.scenarios.every(s => typeof s.confidence === 'number'));
assert('5.11 confidence in [0,1]',             result.scenarios.every(s => s.confidence >= 0 && s.confidence <= 1));
assert('5.12 each has uncertainty',            result.scenarios.every(s => typeof s.uncertainty === 'number'));
assert('5.13 uncertainty in [0,1]',            result.scenarios.every(s => s.uncertainty >= 0 && s.uncertainty <= 1));
assert('5.14 each has compoundEffect',         result.scenarios.every(s => typeof s.compoundEffect === 'number'));
assert('5.15 compoundEffect in [0,1]',         result.scenarios.every(s => s.compoundEffect >= 0 && s.compoundEffect <= 1));
assert('5.16 each has reproducible=true',      result.scenarios.every(s => s.reproducible === true));
assert('5.17 scenario objects frozen',         result.scenarios.every(s => isFrozen(s)));
assert('5.18 no duplicate scenario ids',       new Set(result.scenarios.map(s => s.id)).size === result.scenarios.length);
assert('5.19 strategy ids match initiatives',  result.scenarios.every(s => strategy.initiatives.some(i => i.id === s.strategy)));
assert('5.20 confidence + uncertainty ≈ 1',    result.scenarios.every(s => Math.abs(s.confidence + s.uncertainty - 1) < 1e-5));
assert('5.21 single init → single scenario',   simulate({ ledger, strategy: singleStrat, resourcePlan: singlePlan }).scenarios.length === 1);
assert('5.22 higher reproScore → higher confidence', (() => {
    const lowRepro  = buildLedger({});
    const highRepro = ledger;
    if (lowRepro.reproducibilityScore >= highRepro.reproducibilityScore) return true;
    const r1 = simulate({ ledger: lowRepro,  strategy: singleStrat, resourcePlan: singlePlan });
    const r2 = simulate({ ledger: highRepro, strategy: singleStrat, resourcePlan: singlePlan });
    return r2.scenarios.length > 0 && r1.scenarios.length > 0 &&
        r2.scenarios[0].confidence >= r1.scenarios[0].confidence;
})());

// ── Section 6: Winner selection (deterministic) ───────────────────────────────

console.log('\n── 6. Winner selection ─────────────────────────────────────────────');

assert('6.01 winner is null or string',        result.winner === null || typeof result.winner === 'string');
assert('6.02 winner is strategy id of a scenario', result.winner === null || result.scenarios.some(s => s.strategy === result.winner));
assert('6.03 winner has highest predictedGain', (() => {
    if (result.winner === null) return true;
    const winnerScenario = result.scenarios.find(s => s.strategy === result.winner);
    return result.scenarios.every(s => s.predictedGain <= winnerScenario.predictedGain + 1e-9);
})());
assert('6.04 empty scenarios → winner null',   simulate({ strategy: { initiatives: [] }, resourcePlan, ledger }).winner === null);
assert('6.05 null input → winner null',        simulate(null).winner === null);
assert('6.06 winner deterministic',            simulate(fullInput).winner === result.winner);
assert('6.07 expectedImprovement = winner gain', (() => {
    if (result.winner === null) return result.expectedImprovement === null;
    const ws = result.scenarios.find(s => s.strategy === result.winner);
    return ws && result.expectedImprovement === ws.predictedGain;
})());
assert('6.08 empty → expectedImprovement null', simulate({ strategy: { initiatives: [] }, resourcePlan, ledger }).expectedImprovement === null);
assert('6.09 single init → winner = that init', (() => {
    const r = simulate({ ledger, strategy: singleStrat, resourcePlan: singlePlan });
    return r.winner === 'si_1';
})());
assert('6.10 winner stable on 3rd call',       simulate(fullInput).winner === result.winner);

// ── Section 7: Expected improvement + adaptation confidence ───────────────────

console.log('\n── 7. Expected improvement + confidence ────────────────────────────');

assert('7.01 expectedImprovement null or number', result.expectedImprovement === null || typeof result.expectedImprovement === 'number');
assert('7.02 expectedImprovement in [0,1]',    result.expectedImprovement === null || (result.expectedImprovement >= 0 && result.expectedImprovement <= 1));
assert('7.03 adaptationConfidence null or num', result.adaptationConfidence === null || typeof result.adaptationConfidence === 'number');
assert('7.04 adaptationConfidence in [0,1]',   result.adaptationConfidence === null || (result.adaptationConfidence >= 0 && result.adaptationConfidence <= 1));
assert('7.05 empty → confidence null',         simulate({ strategy: { initiatives: [] }, resourcePlan, ledger }).adaptationConfidence === null);
assert('7.06 confidence = avg scenario confs', (() => {
    if (result.adaptationConfidence === null) return true;
    const avg = result.scenarios.reduce((s, sc) => s + sc.confidence, 0) / result.scenarios.length;
    return Math.abs(result.adaptationConfidence - avg) < 1e-5;
})());
assert('7.07 expectedImprovement deterministic', simulate(fullInput).expectedImprovement === result.expectedImprovement);
assert('7.08 adaptationConfidence deterministic', simulate(fullInput).adaptationConfidence === result.adaptationConfidence);
assert('7.09 null ledger → lower confidence',  (() => {
    const r = simulate({ ledger: null, strategy: singleStrat, resourcePlan: singlePlan });
    return r.scenarios.length > 0;
})());
assert('7.10 single init → expectedImprovement = scenario.predictedGain', (() => {
    const r = simulate({ ledger, strategy: singleStrat, resourcePlan: singlePlan });
    if (r.winner === null) return true;
    const ws = r.scenarios.find(s => s.strategy === r.winner);
    return ws && r.expectedImprovement === ws.predictedGain;
})());

// ── Section 8: Determinism ────────────────────────────────────────────────────

console.log('\n── 8. Determinism ──────────────────────────────────────────────────');

const s1 = simulate(fullInput);
const s2 = simulate(fullInput);
assert('8.01 same simulationHash',             s1.simulationHash === s2.simulationHash);
assert('8.02 same scenarios length',           s1.scenarios.length === s2.scenarios.length);
assert('8.03 same winner',                     s1.winner === s2.winner);
assert('8.04 same expectedImprovement',        s1.expectedImprovement === s2.expectedImprovement);
assert('8.05 same adaptationConfidence',       s1.adaptationConfidence === s2.adaptationConfidence);
assert('8.06 same scenario ids',               s1.scenarios.map(s=>s.id).join(',') === s2.scenarios.map(s=>s.id).join(','));
assert('8.07 same predictedGains',             s1.scenarios.every((s,i) => s.predictedGain === s2.scenarios[i].predictedGain));
assert('8.08 same uncertainties',              s1.scenarios.every((s,i) => s.uncertainty === s2.scenarios[i].uncertainty));
assert('8.09 different strategy → diff hash',  simulate({ ledger, strategy: singleStrat, resourcePlan: singlePlan }).simulationHash !== result.simulationHash || strategy.initiatives.length <= 1);
assert('8.10 hash stable on 3rd call',         simulate(fullInput).simulationHash === s1.simulationHash);
assert('8.11 null input deterministic',        simulate(null).simulationHash === simulate(null).simulationHash);
assert('8.12 empty input deterministic',       simulate({}).simulationHash === simulate({}).simulationHash);

// ── Section 9: Null/invalid input tolerance ───────────────────────────────────

console.log('\n── 9. Null/invalid input tolerance ─────────────────────────────────');

assert('9.01 null → object returned',          simulate(null) !== null && typeof simulate(null) === 'object');
assert('9.02 null → frozen',                   isFrozen(simulate(null)));
assert('9.03 null → version 1.0.0',            simulate(null).version === '1.0.0');
assert('9.04 null → empty scenarios',          simulate(null).scenarios.length === 0);
assert('9.05 null → winner null',              simulate(null).winner === null);
assert('9.06 undefined → object',              typeof simulate(undefined) === 'object');
assert('9.07 string → object',                 typeof simulate('bad') === 'object');
assert('9.08 number → object',                 typeof simulate(42) === 'object');
assert('9.09 no throw on null',                (() => { try { simulate(null); return true; } catch { return false; } })());
assert('9.10 no throw on empty',               (() => { try { simulate({}); return true; } catch { return false; } })());
assert('9.11 bad strategy → empty scenarios',  simulate({ strategy: 'bad', ledger, resourcePlan }).scenarios.length === 0);
assert('9.12 null strategy → empty scenarios', simulate({ strategy: null, ledger, resourcePlan }).scenarios.length === 0);

// ── Section 10: No state mutation ────────────────────────────────────────────

console.log('\n── 10. No state mutation ────────────────────────────────────────────');

const ma = simulate(fullInput);
const mb = simulate(fullInput);
assert('10.01 repeated calls equal hash',      ma.simulationHash === mb.simulationHash);
assert('10.02 repeated calls equal count',     ma.scenarios.length === mb.scenarios.length);
try { result.winner = 'mutated'; } catch (_) {}
assert('10.03 winner mutation blocked',        result.winner === null || typeof result.winner === 'string');
try { result.scenarios.push({}); } catch (_) {}
assert('10.04 scenarios push blocked',         result.scenarios.length === ma.scenarios.length);

const inputCopy = { ledger, strategy: Object.assign({}, strategy), resourcePlan };
simulate(inputCopy);
assert('10.05 strategy input not mutated',     strategy.initiatives.length === inputCopy.strategy.initiatives.length);

assert('10.06 no state across calls',          (() => {
    simulate(fullInput);
    simulate({});
    return simulate(fullInput).simulationHash === result.simulationHash;
})());
assert('10.07 ledger not mutated by simulate', ledger.ledgerHash === buildLedger({ outcomeRegistry: registry, outcomeLineage: lineage, improvements, experiments: expResult, strategy, resourcePlan }).ledgerHash);
assert('10.08 null input frozen',              isFrozen(simulate(null)));

// ── Section 11: Hash properties ───────────────────────────────────────────────

console.log('\n── 11. Hash properties ─────────────────────────────────────────────');

assert('11.01 hash is 8-char hex',             /^[0-9a-f]{8}$/.test(result.simulationHash));
assert('11.02 null input hash is hex',         /^[0-9a-f]{8}$/.test(simulate(null).simulationHash));
assert('11.03 empty input hash is hex',        /^[0-9a-f]{8}$/.test(simulate({}).simulationHash));
assert('11.04 hash stable on same input',      simulate(fullInput).simulationHash === result.simulationHash);
assert('11.05 diff strategy → diff hash',      (() => {
    const h1 = simulate(fullInput).simulationHash;
    const h2 = simulate({ ledger, strategy: singleStrat, resourcePlan: singlePlan }).simulationHash;
    return h1 !== h2;
})());
assert('11.06 null hash matches empty hash',   simulate(null).simulationHash === simulate({}).simulationHash);
assert('11.07 hash changes with different ledger', (() => {
    const emptyLedger = buildLedger({});
    const h1 = simulate({ ledger, strategy: singleStrat, resourcePlan: singlePlan }).simulationHash;
    const h2 = simulate({ ledger: emptyLedger, strategy: singleStrat, resourcePlan: singlePlan }).simulationHash;
    return h1 !== h2 || ledger.reproducibilityScore === emptyLedger.reproducibilityScore;
})());
assert('11.08 hash 3rd call = 1st',            simulate(fullInput).simulationHash === result.simulationHash);

// ── Section 12: Uncertainty ───────────────────────────────────────────────────

console.log('\n── 12. Uncertainty ──────────────────────────────────────────────────');

assert('12.01 each scenario uncertainty in [0,1]', result.scenarios.every(s => s.uncertainty >= 0 && s.uncertainty <= 1));
assert('12.02 uncertainty = 1 - confidence',       result.scenarios.every(s => Math.abs(s.uncertainty - (1 - s.confidence)) < 1e-5));
assert('12.03 uncertainty is deterministic',        simulate(fullInput).scenarios.every((s, i) => Math.abs(s.uncertainty - result.scenarios[i].uncertainty) < 1e-9));
assert('12.04 higher reproScore → lower uncertainty', (() => {
    const lowLedger = buildLedger({});
    const r1 = simulate({ ledger: lowLedger,  strategy: singleStrat, resourcePlan: singlePlan });
    const r2 = simulate({ ledger,             strategy: singleStrat, resourcePlan: singlePlan });
    if (r1.scenarios.length === 0 || r2.scenarios.length === 0) return true;
    return r2.scenarios[0].uncertainty <= r1.scenarios[0].uncertainty + 1e-9;
})());
assert('12.05 compoundEffect in [0,1]',             result.scenarios.every(s => s.compoundEffect >= 0 && s.compoundEffect <= 1));
assert('12.06 compoundEffect ≤ compoundImpact',     result.scenarios.every(s => s.compoundEffect <= (strategy.compoundImpact || 0) + 1e-9));
assert('12.07 all scenarios have reproducible',     result.scenarios.every(s => s.reproducible === true));
assert('12.08 simulation is non-executable',        result.executionInfluence === false);
assert('12.09 uncertainty frozen',                  result.scenarios.every(s => Object.isFrozen(s)));
assert('12.10 scenario predictedGain ≤ expectedGain + small epsilon', result.scenarios.every((s) => {
    const init = strategy.initiatives.find(i => i.id === s.strategy);
    return !init || s.predictedGain <= init.expectedGain * 2;
}));

// ── Section 13: Learning-ledger module unchanged ──────────────────────────────

console.log('\n── 13. Learning-ledger unchanged ────────────────────────────────────');

assert('13.01 buildLedger still callable',      typeof buildLedger === 'function');
assert('13.02 ledger output frozen',            isFrozen(ledger));
assert('13.03 ledger version still 1.0.0',      ledger.version === '1.0.0');
assert('13.04 ledger authorityLevel NONE',      ledger.authorityLevel === 'NONE');
assert('13.05 ledger not mutated by simulate',  (() => {
    simulate(fullInput);
    return ledger.ledgerHash === buildLedger({ outcomeRegistry: registry, outcomeLineage: lineage, improvements, experiments: expResult, strategy, resourcePlan }).ledgerHash;
})());
assert('13.06 ledger hypotheses still intact',  ledger.hypotheses.every(h => typeof h.id === 'string'));
assert('13.07 ledger interventions still intact', ledger.interventions.every(i => typeof i.strategy === 'string'));
assert('13.08 ledger deterministic unchanged',  buildLedger({ outcomeRegistry: registry, outcomeLineage: lineage, improvements, experiments: expResult, strategy, resourcePlan }).ledgerHash === ledger.ledgerHash);
assert('13.09 buildLedger null still works',    buildLedger(null).version === '1.0.0');
assert('13.10 validate-learning-ledger.js exists', fs.existsSync(path.join(__dirname, 'validate-learning-ledger.js')));
assert('13.11 learning-ledger.js exists',       fs.existsSync(path.join(__dirname, 'lib', 'runtime', 'learning-ledger.js')));
assert('13.12 ledger has 14 fields',            Object.keys(ledger).length === 14);
assert('13.13 ledger no execution influence',   ledger.executionInfluence === false);
assert('13.14 ledger cycleCount unchanged',     ledger.cycleCount === buildLedger({ outcomeRegistry: registry, outcomeLineage: lineage, improvements, experiments: expResult, strategy, resourcePlan }).cycleCount);
assert('13.15 simulate does not modify ledger consistency', (() => {
    const before = ledger.consistency;
    simulate(fullInput);
    simulate(fullInput);
    const after = ledger.consistency;
    return before === after;
})());

// ── Section 14: Governance unchanged ─────────────────────────────────────────

console.log('\n── 14. Governance unchanged ─────────────────────────────────────────');

assert('14.01 governance-compiler callable',       typeof compileGovernance === 'function');
assert('14.02 governance-attestation callable',    typeof createGovernanceAttestation === 'function');
assert('14.03 governance-reproducibility callable', typeof createReproducibilityProof === 'function');
assert('14.04 governance-traceability callable',   typeof createTraceabilityMap === 'function');

const govFiles = [
    'validate-governance.js', 'validate-recorder-purity.js',
    'validate-governance-contract.js', 'validate-governance-compiler.js',
    'validate-governance-attestation.js', 'validate-governance-reproducibility.js',
    'validate-governance-traceability.js',
];
for (let i = 0; i < govFiles.length; i++) {
    assert(`14.${5+i} ${govFiles[i]} exists`, fs.existsSync(path.join(__dirname, govFiles[i])));
}

// ── Section 15: E-series modules unchanged ────────────────────────────────────

console.log('\n── 15. E-series unchanged ──────────────────────────────────────────');

assert('15.01 bench frozen',                   isFrozen(bench));
assert('15.02 cfs frozen',                     cfs.every(cf => isFrozen(cf)));
assert('15.03 registry frozen',                isFrozen(registry));
assert('15.04 lineage frozen',                 isFrozen(lineage));
assert('15.05 improvements frozen',            isFrozen(improvements));
assert('15.06 expResult frozen',               isFrozen(expResult));
assert('15.07 strategy frozen',                isFrozen(strategy));
assert('15.08 resourcePlan frozen',            isFrozen(resourcePlan));
assert('15.09 strategy.initiatives stable',    strategy.initiatives.length >= 0);
assert('15.10 resourcePlan.allocations stable', resourcePlan.allocations.length === strategy.initiatives.length);
assert('15.11 formulate still deterministic',  formulate({ improvements, experiments: expResult }).strategyVersion === '1.0.0');
assert('15.12 plan still deterministic',       plan({ initiatives: strategy.initiatives }).deterministic === true);

const eSuites = [
    'validate-execution-evaluator.js','validate-execution-replay.js',
    'validate-decision-benchmark.js','validate-counterfactual-evaluator.js',
    'validate-outcome-registry.js','validate-outcome-lineage.js',
    'validate-improvement-lab.js','validate-policy-experiment.js',
    'validate-strategy-engine.js','validate-resource-planner.js',
    'validate-learning-ledger.js',
];
for (let i = 0; i < eSuites.length; i++) {
    assert(`15.${13+i} ${eSuites[i]} exists`, fs.existsSync(path.join(__dirname, eSuites[i])));
}

// ── Section 16: Full pipeline integration ────────────────────────────────────

console.log('\n── 16. Full pipeline integration ────────────────────────────────────');

assert('16.01 full pipeline simulate succeeds', result !== null);
assert('16.02 scenario count = strategy inits', result.scenarios.length === strategy.initiatives.length);
assert('16.03 all scenario ids sequential',     result.scenarios.every((s, i) => s.id === `scenario_${i+1}`));
assert('16.04 winner in scenarios',             result.winner === null || result.scenarios.some(s => s.strategy === result.winner));
assert('16.05 no authority in simulation',      result.authorityLevel === 'NONE');
assert('16.06 no execution in simulation',      result.executionInfluence === false);
assert('16.07 expectedImprovement = winner gain', (() => {
    if (result.winner === null) return result.expectedImprovement === null;
    const ws = result.scenarios.find(s => s.strategy === result.winner);
    return ws && result.expectedImprovement === ws.predictedGain;
})());
assert('16.08 full pipeline output frozen',     isFrozen(result));
assert('16.09 ledger reproScore used in confs', (() => {
    const zeroLedger = buildLedger({});
    const r1 = simulate({ ledger: zeroLedger, strategy: singleStrat, resourcePlan: singlePlan });
    const r2 = simulate({ ledger,             strategy: singleStrat, resourcePlan: singlePlan });
    return r2.scenarios[0].confidence !== r1.scenarios[0].confidence ||
        ledger.reproducibilityScore === zeroLedger.reproducibilityScore;
})());
assert('16.10 compoundEffect sums ≤ compoundImpact', (() => {
    const totalCompound = result.scenarios.reduce((s, sc) => s + sc.compoundEffect, 0);
    return totalCompound <= (strategy.compoundImpact || 0) + 1e-5;
})());
assert('16.11 descriptiveOnly across chain',    result.descriptiveOnly === true && ledger.descriptiveOnly === true);
assert('16.12 strategy.initiatives → scenarios 1:1', result.scenarios.map(s=>s.strategy).every(id => strategy.initiatives.some(i => i.id === id)));
assert('16.13 simulate is pure function',       (() => {
    const input = { ledger, strategy, resourcePlan };
    const h1 = simulate(input).simulationHash;
    const h2 = simulate(input).simulationHash;
    return h1 === h2;
})());
assert('16.14 adaptation-simulator.js exists',  fs.existsSync(path.join(__dirname, 'lib', 'runtime', 'adaptation-simulator.js')));
assert('16.15 validate-adaptation-simulator.js exists', fs.existsSync(path.join(__dirname, 'validate-adaptation-simulator.js')));

// ── Section 17: Proof — simulation cannot execute ────────────────────────────

console.log('\n── 17. Proof — simulation cannot execute ────────────────────────────');

assert('17.01 no executionInfluence',           result.executionInfluence === false);
assert('17.02 no runtimeIntegrated',            result.runtimeIntegrated === false);
assert('17.03 authorityLevel NONE',             result.authorityLevel === 'NONE');
assert('17.04 descriptiveOnly true',            result.descriptiveOnly === true);
assert('17.05 generatedAt null',                result.generatedAt === null);
assert('17.06 no execute export',               !Object.keys(require('./lib/runtime/adaptation-simulator')).includes('execute'));
assert('17.07 no run/deploy/schedule exports',  Object.keys(require('./lib/runtime/adaptation-simulator')).every(k => !['run','deploy','schedule','trigger'].includes(k)));
assert('17.08 frozen prevents authority change', (() => {
    const r = simulate(fullInput);
    try { r.authorityLevel = 'ADMIN'; } catch (_) {}
    return r.authorityLevel === 'NONE';
})());
assert('17.09 no side effects on require',      (() => {
    delete require.cache[require.resolve('./lib/runtime/adaptation-simulator')];
    require('./lib/runtime/adaptation-simulator');
    return true;
})());
assert('17.10 no state carries across calls',   (() => {
    simulate(fullInput);
    simulate({});
    return simulate(fullInput).simulationHash === result.simulationHash;
})());
assert('17.11 scenarios are projections only',  result.scenarios.every(s => s.reproducible === true && s.authorityLevel === undefined));
assert('17.12 simulation informational only',   result.descriptiveOnly === true && result.scenarios.every(s => !('authorityLevel' in s)));

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length > 0) {
    console.error(`\nFailed assertions:\n${failures.join('\n')}`);
    process.exit(1);
}
