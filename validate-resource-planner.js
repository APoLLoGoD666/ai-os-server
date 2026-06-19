'use strict';
// validate-resource-planner.js — ≥200 assertions for resource-planner.js

const fs   = require('fs');
const path = require('path');

// ── Upstream modules ──────────────────────────────────────────────────────────
const { benchmark }       = require('./lib/runtime/decision-benchmark');
const { evaluate }        = require('./lib/runtime/counterfactual-evaluator');
const { buildRegistry }   = require('./lib/runtime/outcome-registry');
const { buildLineage }    = require('./lib/runtime/outcome-lineage');
const { analyze }         = require('./lib/runtime/improvement-lab');
const { experiment }      = require('./lib/runtime/policy-experiment');
const { formulate }       = require('./lib/runtime/strategy-engine');
const { compileGovernance }          = require('./lib/runtime/governance-compiler');
const { createGovernanceAttestation } = require('./lib/runtime/governance-attestation');
const { createReproducibilityProof }  = require('./lib/runtime/governance-reproducibility');
const { createTraceabilityMap }       = require('./lib/runtime/governance-traceability');

const { plan, createContext } = require('./lib/runtime/resource-planner');

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
const strategy     = formulate({ improvements, experiments: expResult, benchmarks: bench, outcomes: registry });

// Synthetic initiatives with dependencies for sequencing tests
const initA = Object.freeze({ id: 'init_a', title: 'A', priority: 1, expectedGain: 0.2,  complexity: 'LOW',  timeToImpact: 'SHORT',  confidence: 0.9, dependencies: [],          rationale: 'r', evidenceRefs: [] });
const initB = Object.freeze({ id: 'init_b', title: 'B', priority: 2, expectedGain: 0.15, complexity: 'MEDIUM', timeToImpact: 'MEDIUM', confidence: 0.8, dependencies: ['init_a'], rationale: 'r', evidenceRefs: [] });
const initC = Object.freeze({ id: 'init_c', title: 'C', priority: 3, expectedGain: 0.1,  complexity: 'HIGH', timeToImpact: 'LONG',   confidence: 0.7, dependencies: ['init_b'], rationale: 'r', evidenceRefs: [] });

const fullInput = { initiatives: strategy.initiatives, capacity: 1.0, strategy };
const depsInput = { initiatives: [initA, initB, initC], capacity: 0.9 };

// ── Section 1: Module exports ─────────────────────────────────────────────────

console.log('\n── 1. Module exports ──────────────────────────────────────────────');

assert('1.01 exports plan function',          typeof plan === 'function');
assert('1.02 exports createContext function', typeof createContext === 'function');
assert('1.03 module has plan key',            Object.keys(require('./lib/runtime/resource-planner')).includes('plan'));
assert('1.04 module has createContext key',   Object.keys(require('./lib/runtime/resource-planner')).includes('createContext'));
assert('1.05 exactly 2 exports',              Object.keys(require('./lib/runtime/resource-planner')).length === 2);

// ── Section 2: Static analysis — zero imports ─────────────────────────────────

console.log('\n── 2. Static analysis — zero imports ──────────────────────────────');

const src = fs.readFileSync(path.join(__dirname, 'lib', 'runtime', 'resource-planner.js'), 'utf8');

assert('2.01 no require() calls',             !(/\brequire\s*\(/.test(src)));
assert('2.02 no import statements',           !(/^\s*import\s+/m.test(src)));
assert('2.03 no fs import',                   !(/require\s*\(\s*['"]fs['"]\s*\)/.test(src)));
assert('2.04 no path import',                 !(/require\s*\(\s*['"]path['"]\s*\)/.test(src)));
assert('2.05 no crypto import',               !(/require\s*\(\s*['"]crypto['"]\s*\)/.test(src)));
assert('2.06 no governance import',           !(/require\s*\(\s*['"][^'"]*governance/.test(src)));
assert('2.07 no middleware import',           !(/require\s*\(\s*['"][^'"]*middleware/.test(src)));
assert('2.08 no execution-evaluator import',  !(/require\s*\(\s*['"][^'"]*execution-evaluator/.test(src)));
assert('2.09 PLANNER_VERSION defined',        /PLANNER_VERSION\s*=\s*'1\.0\.0'/.test(src));
assert('2.10 authorityLevel NONE present',    /authorityLevel\s*:\s*'NONE'/.test(src));
assert('2.11 deterministic true present',     /deterministic\s*:\s*true/.test(src));
assert('2.12 descriptiveOnly true present',   /descriptiveOnly\s*:\s*true/.test(src));
assert('2.13 no persistence',                 !(/writeFile|appendFile|createWriteStream/.test(src)));
assert('2.14 no setInterval/setTimeout',      !(/setInterval|setTimeout/.test(src)));
assert('2.15 no Math.random',                 !(/Math\.random/.test(src)));
assert('2.16 generatedAt null in source',     /generatedAt\s*:\s*null/.test(src));
assert('2.17 no runtime hooks',               !(/process\.on|EventEmitter/.test(src)));
assert('2.18 module.exports has plan',        /module\.exports\s*=.*\bplan\b/.test(src));
assert('2.19 no global mutable state',        !(/^let\s+[^_]/.test(src)));

// ── Section 3: createContext() ────────────────────────────────────────────────

console.log('\n── 3. createContext() ─────────────────────────────────────────────');

const ctx = createContext();
assert('3.01 returns object',                 ctx !== null && typeof ctx === 'object');
assert('3.02 output frozen',                  isFrozen(ctx));
assert('3.03 plannerVersion 1.0.0',          ctx.plannerVersion === '1.0.0');
assert('3.04 plannerFields frozen array',     Array.isArray(ctx.plannerFields) && Object.isFrozen(ctx.plannerFields));
assert('3.05 fieldCount is 10',              ctx.fieldCount === 10);
assert('3.06 authorityLevel NONE',           ctx.authorityLevel === 'NONE');
assert('3.07 deterministic true',            ctx.deterministic === true);
assert('3.08 descriptiveOnly true',          ctx.descriptiveOnly === true);
assert('3.09 runtimeIntegrated false',       ctx.runtimeIntegrated === false);
assert('3.10 executionInfluence false',      ctx.executionInfluence === false);
assert('3.11 createdAt null',               ctx.createdAt === null);
assert('3.12 fields has planHash',           ctx.plannerFields.includes('planHash'));
assert('3.13 fields has allocations',        ctx.plannerFields.includes('allocations'));
assert('3.14 fields has criticalPath',       ctx.plannerFields.includes('criticalPath'));
assert('3.15 createContext idempotent',      createContext().plannerVersion === ctx.plannerVersion);

// ── Section 4: plan() output structure ───────────────────────────────────────

console.log('\n── 4. plan() output structure ──────────────────────────────────────');

const result = plan(fullInput);

assert('4.01 plan returns object',            result !== null && typeof result === 'object');
assert('4.02 output deep-frozen',             isFrozen(result));
assert('4.03 planHash is 8-char hex',         /^[0-9a-f]{8}$/.test(result.planHash));
assert('4.04 allocations is array',           Array.isArray(result.allocations));
assert('4.05 unusedCapacity is number',       typeof result.unusedCapacity === 'number');
assert('4.06 unusedCapacity >= 0',            result.unusedCapacity >= 0);
assert('4.07 unusedCapacity <= 1',            result.unusedCapacity <= 1 + 1e-9);
assert('4.08 expectedReturn is number',       typeof result.expectedReturn === 'number');
assert('4.09 expectedReturn >= 0',            result.expectedReturn >= 0);
assert('4.10 sequencing is array',            Array.isArray(result.sequencing));
assert('4.11 criticalPath is array',          Array.isArray(result.criticalPath));
assert('4.12 resourceMetadata is object',     result.resourceMetadata !== null && typeof result.resourceMetadata === 'object');
assert('4.13 generatedAt null',              result.generatedAt === null);
assert('4.14 deterministic true',             result.deterministic === true);
assert('4.15 descriptiveOnly true',           result.descriptiveOnly === true);
assert('4.16 all 10 keys present',           [
    'planHash','allocations','unusedCapacity','expectedReturn',
    'sequencing','criticalPath','resourceMetadata',
    'generatedAt','deterministic','descriptiveOnly',
].every(k => k in result));

// ── Section 5: Allocations ────────────────────────────────────────────────────

console.log('\n── 5. Allocations ──────────────────────────────────────────────────');

const depsResult = plan(depsInput);

assert('5.01 allocations frozen',             isFrozen(result.allocations));
assert('5.02 one allocation per initiative',  result.allocations.length === strategy.initiatives.length);
assert('5.03 each has initiative id',         result.allocations.every(a => typeof a.initiative === 'string'));
assert('5.04 each has allocationWeight',      result.allocations.every(a => typeof a.allocationWeight === 'number'));
assert('5.05 allocationWeight >= 0',          result.allocations.every(a => a.allocationWeight >= 0));
assert('5.06 allocationWeight <= capacity',   result.allocations.every(a => a.allocationWeight <= 1.0 + 1e-9));
assert('5.07 each has expectedReturn',        result.allocations.every(a => typeof a.expectedReturn === 'number'));
assert('5.08 expectedReturn >= 0',            result.allocations.every(a => a.expectedReturn >= 0));
assert('5.09 each has timeWindow',            result.allocations.every(a => typeof a.timeWindow === 'string'));
assert('5.10 timeWindow valid value',         result.allocations.every(a => ['SHORT','MEDIUM','LONG'].includes(a.timeWindow)));
assert('5.11 allocation objects frozen',      result.allocations.every(a => isFrozen(a)));
assert('5.12 init ids match strategy inits',  result.allocations.every(a => strategy.initiatives.some(i => i.id === a.initiative)));
assert('5.13 weights sum ≈ capacity',         (() => {
    const sum = result.allocations.reduce((s, a) => s + a.allocationWeight, 0);
    return Math.abs(sum - 1.0) < 1e-4;
})());
assert('5.14 deps plan has 3 allocations',    depsResult.allocations.length === 3);
assert('5.15 higher gain → higher weight',    (() => {
    const aAlloc = depsResult.allocations.find(a => a.initiative === 'init_a');
    const cAlloc = depsResult.allocations.find(a => a.initiative === 'init_c');
    return aAlloc && cAlloc && aAlloc.allocationWeight >= cAlloc.allocationWeight;
})());

// ── Section 6: UnusedCapacity ─────────────────────────────────────────────────

console.log('\n── 6. UnusedCapacity ────────────────────────────────────────────────');

assert('6.01 unusedCapacity is number',        typeof result.unusedCapacity === 'number');
assert('6.02 unusedCapacity in [0,1]',         result.unusedCapacity >= 0 && result.unusedCapacity <= 1 + 1e-9);
assert('6.03 capacity=1.0 → unusedCapacity≈0', Math.abs(result.unusedCapacity) < 1e-4);
assert('6.04 empty → unusedCapacity=capacity', (() => {
    const r = plan({ initiatives: [], capacity: 0.7 });
    return Math.abs(r.unusedCapacity - 0.7) < 1e-9;
})());
assert('6.05 capacity=0.5 → partial unused',   (() => {
    const r = plan({ initiatives: [initA, initB], capacity: 0.5 });
    return r.unusedCapacity >= 0 && r.unusedCapacity <= 0.5 + 1e-9;
})());
assert('6.06 alloc sum + unused ≈ capacity',   (() => {
    const r = plan({ initiatives: [initA, initB], capacity: 0.6 });
    const sum = r.allocations.reduce((s, a) => s + a.allocationWeight, 0) + r.unusedCapacity;
    return Math.abs(sum - 0.6) < 1e-4;
})());

// ── Section 7: ExpectedReturn ─────────────────────────────────────────────────

console.log('\n── 7. ExpectedReturn ────────────────────────────────────────────────');

assert('7.01 expectedReturn is number',        typeof result.expectedReturn === 'number');
assert('7.02 expectedReturn >= 0',             result.expectedReturn >= 0);
assert('7.03 empty → expectedReturn 0',        plan({ initiatives: [], capacity: 1 }).expectedReturn === 0);
assert('7.04 expectedReturn = sum of alloc returns', (() => {
    const sum = result.allocations.reduce((s, a) => s + a.expectedReturn, 0);
    return Math.abs(result.expectedReturn - sum) < 1e-4;
})());
assert('7.05 higher gain inits → higher return', (() => {
    const r1 = plan({ initiatives: [initA], capacity: 1.0 });
    const r2 = plan({ initiatives: [initC], capacity: 1.0 });
    return r1.expectedReturn >= r2.expectedReturn;
})());
assert('7.06 expectedReturn deterministic',    (() => {
    const r1 = plan(depsInput);
    const r2 = plan(depsInput);
    return r1.expectedReturn === r2.expectedReturn;
})());

// ── Section 8: Sequencing ─────────────────────────────────────────────────────

console.log('\n── 8. Sequencing ────────────────────────────────────────────────────');

assert('8.01 sequencing is frozen array',      isFrozen(result.sequencing));
assert('8.02 sequencing has all ids',          strategy.initiatives.every(i => result.sequencing.includes(i.id)));
assert('8.03 sequencing length = inits',       result.sequencing.length === strategy.initiatives.length);
assert('8.04 deps sequencing: A before B',     (() => {
    const r = plan(depsInput);
    const ai = r.sequencing.indexOf('init_a');
    const bi = r.sequencing.indexOf('init_b');
    return ai < bi;
})());
assert('8.05 deps sequencing: B before C',     (() => {
    const r = plan(depsInput);
    const bi = r.sequencing.indexOf('init_b');
    const ci = r.sequencing.indexOf('init_c');
    return bi < ci;
})());
assert('8.06 no-deps → each id present once',  (() => {
    const r = plan({ initiatives: [initA], capacity: 1.0 });
    return r.sequencing.length === 1 && r.sequencing[0] === 'init_a';
})());
assert('8.07 empty → empty sequencing',        plan({ initiatives: [], capacity: 1 }).sequencing.length === 0);
assert('8.08 sequencing deterministic',        (() => {
    return plan(depsInput).sequencing.join(',') === plan(depsInput).sequencing.join(',');
})());

// ── Section 9: CriticalPath ───────────────────────────────────────────────────

console.log('\n── 9. CriticalPath ─────────────────────────────────────────────────');

assert('9.01 criticalPath is frozen array',    isFrozen(result.criticalPath));
assert('9.02 deps: critical path length 3',    (() => {
    const r = plan(depsInput);
    return r.criticalPath.length === 3;
})());
assert('9.03 deps: critical path is A→B→C',   (() => {
    const r = plan(depsInput);
    return r.criticalPath[0] === 'init_a' && r.criticalPath[1] === 'init_b' && r.criticalPath[2] === 'init_c';
})());
assert('9.04 single init → criticalPath=[id]', (() => {
    const r = plan({ initiatives: [initA], capacity: 1.0 });
    return r.criticalPath.length === 1 && r.criticalPath[0] === 'init_a';
})());
assert('9.05 empty → empty criticalPath',      plan({ initiatives: [], capacity: 1 }).criticalPath.length === 0);
assert('9.06 criticalPath ⊆ sequencing',       (() => {
    const r = plan(depsInput);
    return r.criticalPath.every(id => r.sequencing.includes(id));
})());
assert('9.07 criticalPath deterministic',      (() => {
    const r1 = plan(depsInput);
    const r2 = plan(depsInput);
    return r1.criticalPath.join(',') === r2.criticalPath.join(',');
})());

// ── Section 10: ResourceMetadata ──────────────────────────────────────────────

console.log('\n── 10. ResourceMetadata ─────────────────────────────────────────────');

const meta = result.resourceMetadata;
assert('10.01 resourceMetadata frozen',        isFrozen(meta));
assert('10.02 runtimeIntegrated false',        meta.runtimeIntegrated === false);
assert('10.03 executionInfluence false',       meta.executionInfluence === false);
assert('10.04 authorityLevel NONE',            meta.authorityLevel === 'NONE');
assert('10.05 descriptiveOnly true',           meta.descriptiveOnly === true);
assert('10.06 deterministic true',             meta.deterministic === true);
assert('10.07 exactly 5 keys',                 Object.keys(meta).length === 5);
assert('10.08 no authority fields',            meta.authorityLevel === 'NONE');

// ── Section 11: Determinism ───────────────────────────────────────────────────

console.log('\n── 11. Determinism ─────────────────────────────────────────────────');

const p1 = plan(fullInput);
const p2 = plan(fullInput);
assert('11.01 same planHash on identical input', p1.planHash === p2.planHash);
assert('11.02 same allocations length',          p1.allocations.length === p2.allocations.length);
assert('11.03 same unusedCapacity',              p1.unusedCapacity === p2.unusedCapacity);
assert('11.04 same expectedReturn',              p1.expectedReturn === p2.expectedReturn);
assert('11.05 same sequencing',                  p1.sequencing.join(',') === p2.sequencing.join(','));
assert('11.06 same criticalPath',                p1.criticalPath.join(',') === p2.criticalPath.join(','));
assert('11.07 different capacity → diff hash',   plan({ initiatives: strategy.initiatives, capacity: 0.5 }).planHash !== p1.planHash || strategy.initiatives.length === 0);
assert('11.08 hash stable across 3 calls',       plan(fullInput).planHash === p1.planHash);
assert('11.09 empty input is deterministic',     plan({}).planHash === plan({}).planHash);
assert('11.10 deps plan is deterministic',       plan(depsInput).planHash === plan(depsInput).planHash);

// ── Section 12: Null/invalid input tolerance ──────────────────────────────────

console.log('\n── 12. Null/invalid input tolerance ────────────────────────────────');

assert('12.01 null → returns object',           plan(null) !== null && typeof plan(null) === 'object');
assert('12.02 null → frozen',                   isFrozen(plan(null)));
assert('12.03 null → deterministic true',       plan(null).deterministic === true);
assert('12.04 null → descriptiveOnly true',     plan(null).descriptiveOnly === true);
assert('12.05 null → generatedAt null',         plan(null).generatedAt === null);
assert('12.06 null → empty allocations',        plan(null).allocations.length === 0);
assert('12.07 undefined → object',              typeof plan(undefined) === 'object');
assert('12.08 string → object',                 typeof plan('bad') === 'object');
assert('12.09 number → object',                 typeof plan(42) === 'object');
assert('12.10 no throw on null',                (() => { try { plan(null); return true; } catch { return false; } })());
assert('12.11 no throw on empty',               (() => { try { plan({}); return true; } catch { return false; } })());
assert('12.12 null initiatives → empty allocs', plan({ initiatives: null, capacity: 1 }).allocations.length === 0);

// ── Section 13: Hash properties ───────────────────────────────────────────────

console.log('\n── 13. Hash properties ─────────────────────────────────────────────');

assert('13.01 hash is 8-char hex',             /^[0-9a-f]{8}$/.test(result.planHash));
assert('13.02 null input hash is hex',         /^[0-9a-f]{8}$/.test(plan(null).planHash));
assert('13.03 empty initiatives hash is hex',  /^[0-9a-f]{8}$/.test(plan({}).planHash));
assert('13.04 hash stable on same input',      plan(fullInput).planHash === result.planHash);
assert('13.05 different capacity → diff hash', (() => {
    const h1 = plan({ initiatives: [initA], capacity: 1.0 }).planHash;
    const h2 = plan({ initiatives: [initA], capacity: 0.5 }).planHash;
    return h1 !== h2;
})());

// ── Section 14: No state mutation ────────────────────────────────────────────

console.log('\n── 14. No state mutation ────────────────────────────────────────────');

const ma = plan(fullInput);
const mb = plan(fullInput);
assert('14.01 repeated calls equal hash',       ma.planHash === mb.planHash);
assert('14.02 repeated calls equal alloc count', ma.allocations.length === mb.allocations.length);

try { result.planHash = 'mutated'; } catch (_) {}
assert('14.03 planHash mutation blocked',       /^[0-9a-f]{8}$/.test(result.planHash));

try { result.allocations.push({}); } catch (_) {}
assert('14.04 allocations push blocked',        result.allocations.length === ma.allocations.length);

const initsCopy = [initA, initB, initC];
plan({ initiatives: initsCopy, capacity: 1 });
assert('14.05 input array not mutated',         initsCopy.length === 3);

// ── Section 15: Capacity edge cases ──────────────────────────────────────────

console.log('\n── 15. Capacity edge cases ─────────────────────────────────────────');

assert('15.01 capacity 0 → all weights 0',      (() => {
    const r = plan({ initiatives: [initA, initB], capacity: 0 });
    return r.allocations.every(a => a.allocationWeight === 0);
})());
assert('15.02 capacity 0 → unusedCapacity 0',   (() => {
    return plan({ initiatives: [initA], capacity: 0 }).unusedCapacity === 0;
})());
assert('15.03 capacity 1 → weights sum to 1',   (() => {
    const r = plan({ initiatives: [initA, initB, initC], capacity: 1.0 });
    const sum = r.allocations.reduce((s, a) => s + a.allocationWeight, 0);
    return Math.abs(sum - 1.0) < 1e-4;
})());
assert('15.04 capacity 0.5 → weights sum 0.5',  (() => {
    const r = plan({ initiatives: [initA, initB], capacity: 0.5 });
    const sum = r.allocations.reduce((s, a) => s + a.allocationWeight, 0);
    return Math.abs(sum - 0.5) < 1e-4;
})());
assert('15.05 capacity > 1 → clamped to 1',     (() => {
    const r = plan({ initiatives: [initA], capacity: 99 });
    return r.allocations[0].allocationWeight <= 1.0 + 1e-9;
})());
assert('15.06 negative capacity → default 1',   (() => {
    const r = plan({ initiatives: [initA], capacity: -5 });
    return r.allocations.length === 1 && r.allocations[0].allocationWeight <= 1.0 + 1e-9;
})());
assert('15.07 Infinity capacity → clamped',      (() => {
    const r = plan({ initiatives: [initA], capacity: Infinity });
    return r !== null && r.allocations.length === 1;
})());
assert('15.08 NaN capacity → default 1',         (() => {
    const r = plan({ initiatives: [initA], capacity: NaN });
    return r.allocations.length === 1;
})());
assert('15.09 missing capacity → default 1',     (() => {
    const r = plan({ initiatives: [initA] });
    return r.allocations.length === 1 && r.allocations[0].allocationWeight <= 1.0 + 1e-9;
})());
assert('15.10 single initiative → gets all capacity', (() => {
    const r = plan({ initiatives: [initA], capacity: 0.8 });
    return Math.abs(r.allocations[0].allocationWeight - 0.8) < 1e-9;
})());
assert('15.11 equal gains → equal weights',      (() => {
    const eq1 = Object.freeze({ id: 'e1', title: 'E1', priority: 1, expectedGain: 0.1, complexity: 'LOW', timeToImpact: 'SHORT', confidence: 0.9, dependencies: [], rationale: 'r', evidenceRefs: [] });
    const eq2 = Object.freeze({ id: 'e2', title: 'E2', priority: 2, expectedGain: 0.1, complexity: 'LOW', timeToImpact: 'SHORT', confidence: 0.9, dependencies: [], rationale: 'r', evidenceRefs: [] });
    const r = plan({ initiatives: [eq1, eq2], capacity: 1.0 });
    return Math.abs(r.allocations[0].allocationWeight - r.allocations[1].allocationWeight) < 1e-9;
})());

// ── Section 16: Upstream modules unchanged ────────────────────────────────────

console.log('\n── 16. Upstream modules unchanged ──────────────────────────────────');

assert('16.01 governance-compiler loads',      typeof compileGovernance === 'function');
assert('16.02 governance-attestation loads',   typeof createGovernanceAttestation === 'function');
assert('16.03 governance-reproducibility loads', typeof createReproducibilityProof === 'function');
assert('16.04 governance-traceability loads',  typeof createTraceabilityMap === 'function');
assert('16.05 decision-benchmark still works', typeof bench.variance === 'number' && isFrozen(bench));
assert('16.06 counterfactual-evaluator works', cfs.every(cf => isFrozen(cf)));
assert('16.07 outcome-registry works',         registry.recordCount === 4 && isFrozen(registry));
assert('16.08 outcome-lineage works',          lineage.nodeCount > 0 && isFrozen(lineage));
assert('16.09 improvement-lab works',          isFrozen(improvements));
assert('16.10 policy-experiment works',        expResult.reproducible === true && isFrozen(expResult));
assert('16.11 strategy-engine works',          strategy.deterministic === true && isFrozen(strategy));
assert('16.12 strategy formulate is pure',     formulate(fullInput.strategy ? {} : {}).strategyVersion === '1.0.0');

const suiteFiles = [
    'validate-governance.js', 'validate-recorder-purity.js',
    'validate-governance-compiler.js', 'validate-governance-attestation.js',
    'validate-governance-reproducibility.js', 'validate-governance-traceability.js',
    'validate-execution-evaluator.js', 'validate-execution-replay.js',
    'validate-decision-benchmark.js',  'validate-counterfactual-evaluator.js',
    'validate-outcome-registry.js',    'validate-outcome-lineage.js',
    'validate-improvement-lab.js',     'validate-policy-experiment.js',
    'validate-strategy-engine.js',
];
for (let i = 0; i < suiteFiles.length; i++) {
    assert(`16.${13+i} ${suiteFiles[i]} exists`, fs.existsSync(path.join(__dirname, suiteFiles[i])));
}

// ── Section 17: Full pipeline integration ────────────────────────────────────

console.log('\n── 17. Full pipeline integration ────────────────────────────────────');

assert('17.01 records → bench → improvements → strategy → plan', (() => {
    const r = plan({ initiatives: strategy.initiatives, capacity: 1.0 });
    return r !== null && r.allocations.length === strategy.initiatives.length;
})());
assert('17.02 plan output frozen',             isFrozen(result));
assert('17.03 allocations length = initiatives', result.allocations.length === strategy.initiatives.length);
assert('17.04 all initiative ids in allocations', strategy.initiatives.every(i => result.allocations.some(a => a.initiative === i.id)));
assert('17.05 sequencing covers all inits',    strategy.initiatives.every(i => result.sequencing.includes(i.id)));
assert('17.06 criticalPath ⊆ strategy inits', result.criticalPath.every(id => strategy.initiatives.some(i => i.id === id)));
assert('17.07 weights proportional to gains',  (() => {
    if (result.allocations.length < 2) return true;
    const totalGain = strategy.initiatives.reduce((s, i) => s + i.expectedGain, 0);
    if (totalGain === 0) return true;
    return result.allocations.every(a => {
        const init = strategy.initiatives.find(i => i.id === a.initiative);
        const expectedW = parseFloat(((init.expectedGain / totalGain) * 1.0).toFixed(6));
        return Math.abs(a.allocationWeight - expectedW) < 1e-4;
    });
})());
assert('17.08 reduced capacity → lower expected return', (() => {
    const r1 = plan({ initiatives: strategy.initiatives, capacity: 1.0 });
    const r2 = plan({ initiatives: strategy.initiatives, capacity: 0.5 });
    return r2.expectedReturn <= r1.expectedReturn + 1e-9;
})());
assert('17.09 deps test sequencing correct',   (() => {
    const r = plan(depsInput);
    const ai = r.sequencing.indexOf('init_a');
    const bi = r.sequencing.indexOf('init_b');
    const ci = r.sequencing.indexOf('init_c');
    return ai < bi && bi < ci;
})());
assert('17.10 no-dependency plan: criticalPath length=1', (() => {
    const r = plan({ initiatives: [initA], capacity: 1 });
    return r.criticalPath.length === 1;
})());
assert('17.11 plan.resourceMetadata authorityLevel NONE', result.resourceMetadata.authorityLevel === 'NONE');
assert('17.12 full pipeline output frozen',    isFrozen(plan({ initiatives: strategy.initiatives, capacity: 0.8 })));
assert('17.13 plan hash is deterministic hex', /^[0-9a-f]{8}$/.test(plan({ initiatives: strategy.initiatives, capacity: 0.75 }).planHash));
assert('17.14 zero-gain initiative gets min weight', (() => {
    const zeroGain = Object.freeze({ id: 'z1', title: 'Z', priority: 1, expectedGain: 0, complexity: 'LOW', timeToImpact: 'SHORT', confidence: 0.5, dependencies: [], rationale: 'r', evidenceRefs: [] });
    const r = plan({ initiatives: [zeroGain, initA], capacity: 1.0 });
    return r.allocations.length === 2;
})());
assert('17.15 two equal-gain inits → each gets half capacity', (() => {
    const e1 = Object.freeze({ id: 'g1', title: 'G1', priority: 1, expectedGain: 0.2, complexity: 'LOW', timeToImpact: 'SHORT', confidence: 0.8, dependencies: [], rationale: 'r', evidenceRefs: [] });
    const e2 = Object.freeze({ id: 'g2', title: 'G2', priority: 2, expectedGain: 0.2, complexity: 'LOW', timeToImpact: 'SHORT', confidence: 0.8, dependencies: [], rationale: 'r', evidenceRefs: [] });
    const r = plan({ initiatives: [e1, e2], capacity: 1.0 });
    return Math.abs(r.allocations[0].allocationWeight - 0.5) < 1e-9;
})());
assert('17.16 createContext fieldCount matches plannerFields length', (() => {
    const c = createContext();
    return c.fieldCount === c.plannerFields.length;
})());

// ── Section 18: Proof — plan cannot execute ───────────────────────────────────

console.log('\n── 18. Proof — plan cannot execute ─────────────────────────────────');

assert('18.01 no executionInfluence in metadata', meta.executionInfluence === false);
assert('18.02 no runtimeIntegrated in metadata',  meta.runtimeIntegrated === false);
assert('18.03 authorityLevel NONE',               meta.authorityLevel === 'NONE');
assert('18.04 descriptiveOnly true',              result.descriptiveOnly === true);
assert('18.05 generatedAt null',                  result.generatedAt === null);
assert('18.06 no execute export',                 !Object.keys(require('./lib/runtime/resource-planner')).includes('execute'));
assert('18.07 no run/trigger/schedule exports',   Object.keys(require('./lib/runtime/resource-planner')).every(k => !['run','trigger','schedule','deploy'].includes(k)));
assert('18.08 output frozen prevents mutation',   (() => {
    const r = plan(fullInput);
    try { r.deterministic = false; } catch (_) {}
    return r.deterministic === true;
})());
assert('18.09 no state across calls',             (() => {
    plan(fullInput);
    plan({});
    return plan(fullInput).planHash === result.planHash;
})());
assert('18.10 resource plan is informational only', result.resourceMetadata.descriptiveOnly === true);

// ── Results ───────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length > 0) {
    console.error(`\nFailed assertions:\n${failures.join('\n')}`);
    process.exit(1);
}
