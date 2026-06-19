'use strict';
// validate-outcome-lineage.js
// Validation suite for lib/runtime/outcome-lineage.js

const fs   = require('fs');
const path = require('path');

const { buildLineage, createContext } = require('./lib/runtime/outcome-lineage');
const { buildRegistry }               = require('./lib/runtime/outcome-registry');
const { recordOutcome, evaluate: evalState, reset, getEvaluationSnapshot } =
    require('./lib/runtime/execution-evaluator');

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

// ── Static expected counts (derived from DEPENDENCY_MAP in outcome-lineage.js) ──
// 13 source fields, 12 derived fields, 7 orphan fields, 36 edges

const EXPECTED_NODE_COUNT = 32; // 13 + 12 + 7
const EXPECTED_EDGE_COUNT = 36;
const EXPECTED_SOURCE_COUNT  = 13;
const EXPECTED_DERIVED_COUNT = 12;
const EXPECTED_ORPHAN_COUNT  = 7;
const EXPECTED_POLICIES = ['same', 'conservative', 'aggressive', 'constitutionOnly', 'founderOnly', 'baselineRandom'];

// ── Sample registry ───────────────────────────────────────────────────────────

const OUTCOMES = Object.freeze([
    Object.freeze({ txId: 'L1', transactionType: 'agent-task',   startedAt: '2026-01-01T00:00:00Z', durationMs: 150, constitutionVerdict: 'pass',        founderScore: 0.85, twinScore: 0.80, finalDecisionScore: 0.82, outcomeSuccess: true,  outcomeCategory: 'compute', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed'   }),
    Object.freeze({ txId: 'L2', transactionType: 'memory-write', startedAt: '2026-01-01T00:01:00Z', durationMs: 80,  constitutionVerdict: 'fail',         founderScore: 0.35, twinScore: 0.30, finalDecisionScore: 0.40, outcomeSuccess: false, outcomeCategory: 'memory',  compensationTriggered: true,  rollbackTriggered: true,  executionStatus: 'rolled_back' }),
    Object.freeze({ txId: 'L3', transactionType: 'agent-task',   startedAt: '2026-01-01T00:02:00Z', durationMs: 120, constitutionVerdict: 'pass',         founderScore: 0.78, twinScore: 0.75, finalDecisionScore: 0.76, outcomeSuccess: true,  outcomeCategory: 'compute', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed'   }),
    Object.freeze({ txId: 'L4', transactionType: 'agent-task',   startedAt: '2026-01-01T00:03:00Z', durationMs: 200, constitutionVerdict: 'conditional',  founderScore: 0.65, twinScore: 0.70, finalDecisionScore: 0.68, outcomeSuccess: true,  outcomeCategory: 'compute', compensationTriggered: false, rollbackTriggered: false, executionStatus: 'completed'   }),
]);

const registry = buildRegistry(OUTCOMES);
const lineage  = buildLineage(registry);

// ── Section 1: createContext() shape ─────────────────────────────────────────

console.log('Section 1: createContext() shape');
{
    const ctx = createContext();
    assert('1.01 returns object',              ctx !== null && typeof ctx === 'object');
    assert('1.02 lineageVersion is string',    typeof ctx.lineageVersion === 'string');
    assert('1.03 lineageFields is array',      Array.isArray(ctx.lineageFields));
    assert('1.04 fieldCount = 18',             ctx.fieldCount === 18);
    assert('1.05 nodeCount = 32',              ctx.nodeCount === EXPECTED_NODE_COUNT);
    assert('1.06 edgeCount = 36',              ctx.edgeCount === EXPECTED_EDGE_COUNT);
    assert('1.07 authorityLevel = NONE',       ctx.authorityLevel === 'NONE');
    assert('1.08 deterministic = true',        ctx.deterministic === true);
    assert('1.09 descriptiveOnly = true',      ctx.descriptiveOnly === true);
    assert('1.10 runtimeIntegrated = false',   ctx.runtimeIntegrated === false);
    assert('1.11 executionInfluence = false',  ctx.executionInfluence === false);
    assert('1.12 createdAt = null',            ctx.createdAt === null);
    assert('1.13 frozen',                      isFrozen(ctx));
}

// ── Section 2: buildLineage() output shape ────────────────────────────────────

console.log('\nSection 2: buildLineage() output shape');
{
    const EXPECTED_KEYS = [
        'lineageVersion', 'nodeCount', 'edgeCount', 'sourceNodes', 'derivedNodes',
        'lineageGraph', 'dependencyMap', 'evidenceCoverage', 'orphanDetection',
        'reproducibilityScore', 'integrityChecks', 'lineageHash',
        'generatedAt', 'runtimeIntegrated', 'authorityLevel',
        'executionInfluence', 'deterministic', 'descriptiveOnly',
    ];
    for (const k of EXPECTED_KEYS) assert(`2.x has key: ${k}`, k in lineage);
    assert('2.01 exactly 18 keys',             Object.keys(lineage).length === 18,
        `Got: ${Object.keys(lineage).join(', ')}`);
    assert('2.02 lineageVersion is string',    typeof lineage.lineageVersion === 'string');
    assert('2.03 nodeCount is number',         typeof lineage.nodeCount === 'number');
    assert('2.04 edgeCount is number',         typeof lineage.edgeCount === 'number');
    assert('2.05 sourceNodes is array',        Array.isArray(lineage.sourceNodes));
    assert('2.06 derivedNodes is array',       Array.isArray(lineage.derivedNodes));
    assert('2.07 lineageGraph is object',      typeof lineage.lineageGraph === 'object');
    assert('2.08 dependencyMap is object',     typeof lineage.dependencyMap === 'object');
    assert('2.09 evidenceCoverage is object',  typeof lineage.evidenceCoverage === 'object');
    assert('2.10 orphanDetection is object',   typeof lineage.orphanDetection === 'object');
    assert('2.11 reproducibilityScore is num', typeof lineage.reproducibilityScore === 'number');
    assert('2.12 integrityChecks is object',   typeof lineage.integrityChecks === 'object');
    assert('2.13 lineageHash is string',       typeof lineage.lineageHash === 'string');
    assert('2.14 generatedAt = null',          lineage.generatedAt === null);
    assert('2.15 deterministic = true',        lineage.deterministic === true);
    assert('2.16 descriptiveOnly = true',      lineage.descriptiveOnly === true);
    assert('2.17 runtimeIntegrated = false',   lineage.runtimeIntegrated === false);
    assert('2.18 executionInfluence = false',  lineage.executionInfluence === false);
}

// ── Section 3: nodeCount invariant ───────────────────────────────────────────

console.log('\nSection 3: nodeCount invariant');
{
    assert('3.01 nodeCount = 32',                     lineage.nodeCount === EXPECTED_NODE_COUNT);
    assert('3.02 sourceNodes.length = 13',            lineage.sourceNodes.length === EXPECTED_SOURCE_COUNT);
    assert('3.03 derivedNodes.length = 12',           lineage.derivedNodes.length === EXPECTED_DERIVED_COUNT);
    assert('3.04 orphanDetection.orphanCount = 7',    lineage.orphanDetection.orphanCount === EXPECTED_ORPHAN_COUNT);
    assert('3.05 src+derived+orphan = nodeCount',
        lineage.sourceNodes.length + lineage.derivedNodes.length + lineage.orphanDetection.orphanCount === lineage.nodeCount);
}

// ── Section 4: edgeCount invariant ───────────────────────────────────────────

console.log('\nSection 4: edgeCount invariant');
{
    assert('4.01 edgeCount = 36', lineage.edgeCount === EXPECTED_EDGE_COUNT);

    // Count edges in lineageGraph
    const graphEdges = Object.values(lineage.lineageGraph).reduce((sum, arr) => sum + arr.length, 0);
    assert('4.02 lineageGraph total edges = 36', graphEdges === EXPECTED_EDGE_COUNT,
        `Got: ${graphEdges}`);

    // Count edges in dependencyMap
    const depEdges = Object.values(lineage.dependencyMap).reduce((sum, arr) => sum + arr.length, 0);
    assert('4.03 dependencyMap total edges = 36', depEdges === EXPECTED_EDGE_COUNT,
        `Got: ${depEdges}`);

    assert('4.04 edgeCount invariant across input', lineage.edgeCount === buildLineage(buildRegistry([])).edgeCount);
}

// ── Section 5: sourceNodes structure ─────────────────────────────────────────

console.log('\nSection 5: sourceNodes structure');
{
    for (const node of lineage.sourceNodes) {
        assert(`5.x ${node.id}: has id`,        typeof node.id === 'string' && node.id.startsWith('src:'));
        assert(`5.x ${node.id}: has label`,     typeof node.label === 'string');
        assert(`5.x ${node.id}: type=source`,   node.type === 'source');
        assert(`5.x ${node.id}: has fieldName`, typeof node.fieldName === 'string');
    }
    const ids = lineage.sourceNodes.map(n => n.id);
    const uniqueIds = new Set(ids);
    assert('5.01 no duplicate source node IDs', ids.length === uniqueIds.size);
    assert('5.02 source includes txId',         ids.includes('src:txId'));
    assert('5.03 source includes outcomeSuccess', ids.includes('src:outcomeSuccess'));
    assert('5.04 source includes finalDecisionScore', ids.includes('src:finalDecisionScore'));
}

// ── Section 6: derivedNodes structure ────────────────────────────────────────

console.log('\nSection 6: derivedNodes structure');
{
    for (const node of lineage.derivedNodes) {
        assert(`6.x ${node.id}: has id`,           typeof node.id === 'string' && node.id.startsWith('derived:'));
        assert(`6.x ${node.id}: has label`,        typeof node.label === 'string');
        assert(`6.x ${node.id}: type=derived`,     node.type === 'derived');
        assert(`6.x ${node.id}: has dependsOn`,    Array.isArray(node.dependsOn));
        assert(`6.x ${node.id}: dependsOn not empty`, node.dependsOn.length > 0);
        assert(`6.x ${node.id}: valuePresent is boolean`, typeof node.valuePresent === 'boolean');
    }
    const labels = lineage.derivedNodes.map(n => n.label);
    assert('6.01 registryHash is derived node', labels.includes('registryHash'));
    assert('6.02 successDistribution is derived', labels.includes('successDistribution'));
    assert('6.03 no duplicate derived node IDs', new Set(lineage.derivedNodes.map(n => n.id)).size === lineage.derivedNodes.length);
}

// ── Section 7: orphanDetection ────────────────────────────────────────────────

console.log('\nSection 7: orphanDetection');
{
    const od = lineage.orphanDetection;
    assert('7.01 orphanDetection is object',         od !== null && typeof od === 'object');
    assert('7.02 orphanCount = 7',                   od.orphanCount === EXPECTED_ORPHAN_COUNT);
    assert('7.03 orphans is array',                  Array.isArray(od.orphans));
    assert('7.04 orphans.length = orphanCount',      od.orphans.length === od.orphanCount);
    assert('7.05 description is string',             typeof od.description === 'string');
    assert('7.06 generatedAt in orphans',            od.orphans.includes('generatedAt'));
    assert('7.07 authorityLevel in orphans',         od.orphans.includes('authorityLevel'));
    assert('7.08 deterministic in orphans',          od.orphans.includes('deterministic'));
}

// ── Section 8: integrityChecks ────────────────────────────────────────────────

console.log('\nSection 8: integrityChecks');
{
    const ic = lineage.integrityChecks;
    assert('8.01 integrityChecks is object',        ic !== null && typeof ic === 'object');
    assert('8.02 nodeCountMatches = true',           ic.nodeCountMatches === true);
    assert('8.03 edgeCountMatches = true',           ic.edgeCountMatches === true);
    assert('8.04 allDerivedHaveSources = true',      ic.allDerivedHaveSources === true);
    assert('8.05 noCycles = true',                   ic.noCycles === true);
    assert('8.06 registryHashPresent = true',        ic.registryHashPresent === true);

    // Empty registry: registryHashPresent should still be true (empty has a hash)
    const emptyLineage = buildLineage(buildRegistry([]));
    assert('8.07 empty registry → integrityChecks.nodeCountMatches = true', emptyLineage.integrityChecks.nodeCountMatches === true);

    // Null snapshot: registryHashPresent = false
    const nullLineage = buildLineage(null);
    assert('8.08 null snapshot → registryHashPresent = false', nullLineage.integrityChecks.registryHashPresent === false);
}

// ── Section 9: reproducibilityScore ──────────────────────────────────────────

console.log('\nSection 9: reproducibilityScore');
{
    assert('9.01 reproducibilityScore in [0,1]',    lineage.reproducibilityScore >= 0 && lineage.reproducibilityScore <= 1);
    assert('9.02 null snapshot → score = 0',        buildLineage(null).reproducibilityScore === 0);
    assert('9.03 empty records → score = 0',        buildLineage(buildRegistry([])).reproducibilityScore === 0);
    assert('9.04 populated registry → score > 0',   lineage.reproducibilityScore > 0);
    // Full coverage registry (all 4 records complete) → score should be high
    assert('9.05 full-coverage → score >= 0.7',     lineage.reproducibilityScore >= 0.7);
}

// ── Section 10: evidenceCoverage ──────────────────────────────────────────────

console.log('\nSection 10: evidenceCoverage');
{
    const ec = lineage.evidenceCoverage;
    assert('10.01 evidenceCoverage is object',            ec !== null && typeof ec === 'object');
    assert('10.02 usedDerivedFields is number',           typeof ec.usedDerivedFields === 'number');
    assert('10.03 totalDerivedFields = 12',               ec.totalDerivedFields === EXPECTED_DERIVED_COUNT);
    assert('10.04 coveredSourceFields <= 13',             ec.coveredSourceFields <= EXPECTED_SOURCE_COUNT);
    assert('10.05 totalSourceFields = 13',                ec.totalSourceFields === EXPECTED_SOURCE_COUNT);
    assert('10.06 coverageRate in [0,1] or null',
        ec.coverageRate === null || (ec.coverageRate >= 0 && ec.coverageRate <= 1));
    assert('10.07 populated registry → coverageRate = 1.0', Math.abs(ec.coverageRate - 1.0) < 1e-6);
}

// ── Section 11: lineageHash stability ────────────────────────────────────────

console.log('\nSection 11: lineageHash stability');
{
    const h1 = buildLineage(registry).lineageHash;
    const h2 = buildLineage(registry).lineageHash;
    assert('11.01 hash is 8-char hex',          /^[0-9a-f]{8}$/.test(h1));
    assert('11.02 same registry → same hash',    h1 === h2);

    const reg2 = buildRegistry([OUTCOMES[0]]);
    const h3 = buildLineage(reg2).lineageHash;
    assert('11.03 different registry → different hash', h1 !== h3);

    assert('11.04 null → still a string',        typeof buildLineage(null).lineageHash === 'string');
}

// ── Section 12: determinism ───────────────────────────────────────────────────

console.log('\nSection 12: determinism');
{
    const l1 = buildLineage(registry);
    const l2 = buildLineage(registry);
    assert('12.01 JSON identical repeated calls',  JSON.stringify(l1) === JSON.stringify(l2));
    assert('12.02 l1 !== l2 (distinct objects)',   l1 !== l2);
    assert('12.03 nodeCount identical',            l1.nodeCount === l2.nodeCount);
    assert('12.04 edgeCount identical',            l1.edgeCount === l2.edgeCount);
    assert('12.05 lineageHash identical',          l1.lineageHash === l2.lineageHash);
}

// ── Section 13: no mutation ───────────────────────────────────────────────────

console.log('\nSection 13: no mutation');
{
    const regCopy = buildRegistry(OUTCOMES);
    const before = JSON.stringify(regCopy);
    buildLineage(regCopy);
    assert('13.01 input registry not mutated', JSON.stringify(regCopy) === before);
    assert('13.02 registryHash unchanged',     regCopy.registryHash === registry.registryHash);
}

// ── Section 14: deep freeze ───────────────────────────────────────────────────

console.log('\nSection 14: deep freeze');
{
    assert('14.01 buildLineage() output is frozen',      isFrozen(lineage));
    assert('14.02 sourceNodes is frozen',                isFrozen(lineage.sourceNodes));
    assert('14.03 derivedNodes is frozen',               isFrozen(lineage.derivedNodes));
    assert('14.04 lineageGraph is frozen',               isFrozen(lineage.lineageGraph));
    assert('14.05 dependencyMap is frozen',              isFrozen(lineage.dependencyMap));
    assert('14.06 integrityChecks is frozen',            isFrozen(lineage.integrityChecks));
    assert('14.07 createContext() is frozen',            isFrozen(createContext()));
    assert('14.08 buildLineage(null) is frozen',         isFrozen(buildLineage(null)));

    let threw = false;
    try { lineage.nodeCount = 999; } catch (_) { threw = true; }
    assert('14.09 output rejects mutation', threw || lineage.nodeCount !== 999);
}

// ── Section 15: no functions in output ───────────────────────────────────────

console.log('\nSection 15: no functions in output');
{
    assert('15.01 buildLineage() has no functions',  !hasFunctions(lineage));
    assert('15.02 createContext() has no functions', !hasFunctions(createContext()));
    assert('15.03 buildLineage(null) has no functions', !hasFunctions(buildLineage(null)));
}

// ── Section 16: isolation from execution-evaluator ───────────────────────────

console.log('\nSection 16: isolation from execution-evaluator');
{
    reset();
    recordOutcome({ txId: 'ISO-1', outcomeSuccess: true,  rollbackTriggered: false, compensationTriggered: false, founderScore: 0.9, twinScore: 0.85, finalDecisionScore: 0.88, durationMs: 100 });
    recordOutcome({ txId: 'ISO-2', outcomeSuccess: false, rollbackTriggered: true,  compensationTriggered: true,  founderScore: 0.3, twinScore: 0.25, finalDecisionScore: 0.35, durationMs: 200 });

    const stateBefore = JSON.stringify(evalState());
    const snapBefore  = JSON.stringify(getEvaluationSnapshot());

    buildRegistry(OUTCOMES);
    buildLineage(registry);
    buildLineage(null);

    const stateAfter = JSON.stringify(evalState());
    const snapAfter  = JSON.stringify(getEvaluationSnapshot());

    assert('16.01 execution-evaluator state unchanged after buildRegistry()',  stateBefore === stateAfter);
    assert('16.02 execution-evaluator snapshot unchanged after buildLineage()', snapBefore === snapAfter);
    reset();
}

// ── Section 17: static analysis — imports ────────────────────────────────────

console.log('\nSection 17: static analysis — imports');
{
    const src = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'outcome-lineage.js'), 'utf8'
    );
    const allRequires = (src.match(/require\s*\(/g) || []).length;
    const relRequires = src.match(/require\s*\(\s*['"]([./][^'"]+)['"]\s*\)/g) || [];
    assert('17.01 exactly 1 require() call total',       allRequires === 1,
        `Found ${allRequires} require() calls`);
    assert('17.02 imports outcome-registry only',        relRequires.length === 1 && relRequires[0].includes('outcome-registry'));
    assert('17.03 no governance imports',                !/require\s*\(\s*['"][^'"]*governance/g.test(src));
    assert('17.04 no execution-transaction import',      !/require\s*\(\s*['"][^'"]*execution-transaction/g.test(src));
    assert('17.05 no execution-evaluator import',        !/require\s*\(\s*['"][^'"]*execution-evaluator/g.test(src));
    assert('17.06 no decision-lattice import',           !/require\s*\(\s*['"][^'"]*decision-lattice/g.test(src));
    assert('17.07 no memory imports',                    !/require\s*\(\s*['"][^'"]*memory/g.test(src));
    assert('17.08 no feedback imports',                  !/require\s*\(\s*['"][^'"]*feedback/g.test(src));
    assert('17.09 no decision-benchmark import',         !/require\s*\(\s*['"][^'"]*decision-benchmark/g.test(src));
    assert('17.10 no counterfactual-evaluator import',   !/require\s*\(\s*['"][^'"]*counterfactual/g.test(src));
    assert('17.11 authorityLevel NONE in source',        /authorityLevel\s*:\s*'NONE'/.test(src));
    assert('17.12 executionInfluence false in source',   src.includes('executionInfluence:') && !src.includes("executionInfluence: true"));
    assert('17.13 DEPENDENCY_MAP in source',             src.includes('DEPENDENCY_MAP'));
    assert('17.14 LINEAGE_VERSION in source',            src.includes('LINEAGE_VERSION'));
}

// ── Section 18: module.exports shape ─────────────────────────────────────────

console.log('\nSection 18: module.exports shape');
{
    const mod  = require('./lib/runtime/outcome-lineage');
    const keys = Object.keys(mod).sort();
    assert('18.01 exactly 2 exports',         keys.length === 2,
        `Got: ${keys.join(', ')}`);
    assert('18.02 exports buildLineage',      typeof mod.buildLineage === 'function');
    assert('18.03 exports createContext',     typeof mod.createContext === 'function');
    assert('18.04 no extra exports',          JSON.stringify(keys) === JSON.stringify(['buildLineage', 'createContext']));
    assert('18.05 output has no functions',   !hasFunctions(mod.buildLineage(registry)));
    assert('18.06 context has no functions',  !hasFunctions(mod.createContext()));
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
    console.log('OUTCOME LINEAGE is deterministic, isolated, frozen, and correctly imports only outcome-registry.');
}
