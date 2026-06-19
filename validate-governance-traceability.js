'use strict';
// validate-governance-traceability.js
// Proves governance-traceability.js is deterministic, frozen,
// side-effect-free, graph-consistent, and imports no runtime modules.

const fs   = require('fs');
const path = require('path');

const { createTraceabilityMap }      = require('./lib/runtime/governance-traceability');
const { compileGovernance }          = require('./lib/runtime/governance-compiler');
const { createGovernanceAttestation } = require('./lib/runtime/governance-attestation');
const { createReproducibilityProof } = require('./lib/runtime/governance-reproducibility');

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

// ── Generate maps up front ────────────────────────────────────────────────────
const tm1 = createTraceabilityMap();
const tm2 = createTraceabilityMap();
const tm3 = createTraceabilityMap();

// ── Section 1: Output shape ───────────────────────────────────────────────────
{
    const REQUIRED_KEYS = [
        'traceabilityVersion', 'nodeCount', 'edgeCount', 'traceabilityHash',
        'compilerHash', 'attestationHash', 'proofHash',
        'generatedAt', 'runtimeIntegrated', 'authorityLevel',
        'deterministic', 'descriptiveOnly', 'nodes', 'edges',
    ];
    for (const key of REQUIRED_KEYS) {
        assert(`1.x output has key: ${key}`, key in tm1);
    }
    assert('1.x output has exactly 14 top-level keys', Object.keys(tm1).length === 14,
        `Got: ${Object.keys(tm1).join(', ')}`);
    assert('1.x output is frozen at top level',     Object.isFrozen(tm1));
    assert('1.x traceabilityVersion is string',     typeof tm1.traceabilityVersion === 'string');
    assert('1.x nodeCount is number',               typeof tm1.nodeCount === 'number');
    assert('1.x edgeCount is number',               typeof tm1.edgeCount === 'number');
    assert('1.x traceabilityHash is string',        typeof tm1.traceabilityHash === 'string');
    assert('1.x nodes is array',                    Array.isArray(tm1.nodes));
    assert('1.x edges is array',                    Array.isArray(tm1.edges));
    assert('1.x generatedAt is null',               tm1.generatedAt === null);
    assert('1.x runtimeIntegrated is false',        tm1.runtimeIntegrated === false);
    assert('1.x authorityLevel is NONE',            tm1.authorityLevel === 'NONE');
    assert('1.x deterministic is true',             tm1.deterministic === true);
    assert('1.x descriptiveOnly is true',           tm1.descriptiveOnly === true);
    assert('1.x nodeCount === nodes.length',         tm1.nodeCount === tm1.nodes.length);
    assert('1.x edgeCount === edges.length',         tm1.edgeCount === tm1.edges.length);
}

// ── Section 2: Determinism (A + B) ───────────────────────────────────────────
{
    const j1 = JSON.stringify(tm1);
    const j2 = JSON.stringify(tm2);
    assert('2.01 two maps produce identical JSON',   j1 === j2);
    assert('2.02 three maps produce identical JSON', j1 === JSON.stringify(tm3));
    assert('2.03 traceabilityHash stable across calls', tm1.traceabilityHash === tm2.traceabilityHash);
    assert('2.04 nodeCount stable across calls',     tm1.nodeCount === tm2.nodeCount);
    assert('2.05 edgeCount stable across calls',     tm1.edgeCount === tm2.edgeCount);
    assert('2.06 compilerHash stable across calls',  tm1.compilerHash === tm2.compilerHash);
    assert('2.07 attestationHash stable across calls', tm1.attestationHash === tm2.attestationHash);
    assert('2.08 proofHash stable across calls',     tm1.proofHash === tm2.proofHash);
}

// ── Section 3: Deep freeze (L-check prerequisite) ────────────────────────────
{
    const check = isDeepFrozen(tm1, 'traceabilityMap');
    assert('3.01 output is deeply frozen', check.ok,
        check.ok ? '' : `Not frozen at: ${check.path}`);

    assert('3.02 nodes array frozen',           Object.isFrozen(tm1.nodes));
    assert('3.03 nodes[0] frozen',              Object.isFrozen(tm1.nodes[0]));
    assert('3.04 nodes[0].originSource frozen', Object.isFrozen(tm1.nodes[0].originSource));
    assert('3.05 nodes[0].referencedBy frozen', Object.isFrozen(tm1.nodes[0].referencedBy));
    assert('3.06 nodes[0].hashAnchors frozen',  Object.isFrozen(tm1.nodes[0].hashAnchors));
    assert('3.07 edges array frozen',           Object.isFrozen(tm1.edges));
    assert('3.08 edges[0] frozen',              Object.isFrozen(tm1.edges[0]));
}

// ── Section 4: No executable exports (O — no functions) ──────────────────────
{
    const check = hasNoFunctions(tm1, 'traceabilityMap');
    assert('4.01 output contains no functions', check.ok,
        check.ok ? '' : `Function found at: ${check.path}`);
    for (const [key, value] of Object.entries(tm1)) {
        assert(`4.x key "${key}" is not a function`, typeof value !== 'function');
    }
}

// ── Section 5: No reference sharing with source objects (K) ──────────────────
{
    const compiled = compileGovernance();
    assert('5.01 tm1 !== tm2',                   tm1 !== tm2);
    assert('5.02 tm1.nodes !== compiled.tiers',  tm1.nodes !== compiled.tiers);
    assert('5.03 tm1.nodes !== tm2.nodes',        tm1.nodes !== tm2.nodes);
    assert('5.04 tm1.edges !== tm2.edges',        tm1.edges !== tm2.edges);
    assert('5.05 tm1.nodes[0] !== tm2.nodes[0]', tm1.nodes[0] !== tm2.nodes[0]);
}

// ── Section 6: Node count and structure (N — structural invariance) ───────────
{
    assert('6.01 nodeCount = 67', tm1.nodeCount === 67,
        `Expected 67, got ${tm1.nodeCount}`);
    assert('6.02 edgeCount = 120', tm1.edgeCount === 120,
        `Expected 120, got ${tm1.edgeCount}`);
    assert('6.03 nodeCount stable across calls', tm1.nodeCount === tm3.nodeCount);
    assert('6.04 edgeCount stable across calls', tm1.edgeCount === tm3.edgeCount);

    // Node type distribution
    const typeCount = {};
    for (const n of tm1.nodes) typeCount[n.elementType] = (typeCount[n.elementType] || 0) + 1;
    assert('6.05 tier nodes = 10',            typeCount['tier'] === 10);
    assert('6.06 invariant nodes = 4',        typeCount['invariant'] === 4);
    assert('6.07 allowedCrossing nodes = 2',  typeCount['allowedCrossing'] === 2);
    assert('6.08 forbiddenCrossing nodes = 20', typeCount['forbiddenCrossing'] === 20);
    assert('6.09 recorderRule nodes = 31',    typeCount['recorderRule'] === 31);

    // Edge relationship distribution
    const relCount = {};
    for (const e of tm1.edges) relCount[e.relationship] = (relCount[e.relationship] || 0) + 1;
    assert('6.10 AFFECTS_TIER = 19',    relCount['AFFECTS_TIER'] === 19);
    assert('6.11 FROM_TIER = 2',        relCount['FROM_TIER'] === 2);
    assert('6.12 TO_TIER = 2',          relCount['TO_TIER'] === 2);
    assert('6.13 IMPORTER_TIER = 20',   relCount['IMPORTER_TIER'] === 20);
    assert('6.14 FORBIDDEN_TIER = 20',  relCount['FORBIDDEN_TIER'] === 20);
    assert('6.15 ENFORCED_BY = 20',     relCount['ENFORCED_BY'] === 20);
    assert('6.16 PERMITS_EXPORT = 9',   relCount['PERMITS_EXPORT'] === 9);
    assert('6.17 FORBIDS_EXPORT = 16',  relCount['FORBIDS_EXPORT'] === 16);
    assert('6.18 FORBIDS_IMPORT_OF = 6', relCount['FORBIDS_IMPORT_OF'] === 6);
    assert('6.19 REFERENCES_TIER = 6',  relCount['REFERENCES_TIER'] === 6);
}

// ── Section 7: Graph consistency (L) ─────────────────────────────────────────
{
    const VALID_SOURCES    = new Set(['manifest', 'contract', 'recorder-policy']);
    const VALID_REFERENCED = new Set(['attestation', 'compiler', 'reproducibility']);
    const VALID_TYPES      = new Set(['tier', 'invariant', 'allowedCrossing', 'forbiddenCrossing', 'recorderRule']);

    // L.1 Every node has valid originSource and referencedBy
    for (const node of tm1.nodes) {
        assert(`7.x node "${node.elementId}" has non-empty originSource`,
            Array.isArray(node.originSource) && node.originSource.length >= 1);
        for (const src of (node.originSource || [])) {
            assert(`7.x node "${node.elementId}" originSource "${src}" is valid`,
                VALID_SOURCES.has(src));
        }
        assert(`7.x node "${node.elementId}" has valid elementType`,
            VALID_TYPES.has(node.elementType));
        for (const ref of (node.referencedBy || [])) {
            assert(`7.x node "${node.elementId}" referencedBy "${ref}" is valid`,
                VALID_REFERENCED.has(ref));
        }
        assert(`7.x node "${node.elementId}" has hashAnchors`,
            typeof node.hashAnchors === 'object' && node.hashAnchors !== null);
    }

    // L.2 Every edge is bidirectional-consistent (both endpoints in nodes)
    const nodeIds = new Set(tm1.nodes.map(n => n.elementId));
    for (const edge of tm1.edges) {
        assert(`7.x edge from "${edge.from}" → exists in nodes`,
            nodeIds.has(edge.from), `"${edge.from}" not in nodes`);
        assert(`7.x edge to "${edge.to}" → exists in nodes`,
            nodeIds.has(edge.to), `"${edge.to}" not in nodes`);
    }

    // L.3 No orphan nodes (every node referenced in at least one edge)
    const referencedNodeIds = new Set();
    for (const edge of tm1.edges) {
        referencedNodeIds.add(edge.from);
        referencedNodeIds.add(edge.to);
    }
    for (const node of tm1.nodes) {
        assert(`7.x node "${node.elementId}" is non-orphan`,
            referencedNodeIds.has(node.elementId),
            `"${node.elementId}" appears in no edges`);
    }

    // L.4 No duplicate edges
    const edgeKeys = new Set();
    let duplicateFound = false;
    for (const edge of tm1.edges) {
        const key = `${edge.from}|${edge.to}|${edge.relationship}`;
        if (edgeKeys.has(key)) { duplicateFound = true; break; }
        edgeKeys.add(key);
    }
    assert('7.x no duplicate edges', !duplicateFound);

    // All node IDs are unique
    const nodeIdSet = new Set();
    let duplicateNodeFound = false;
    for (const node of tm1.nodes) {
        if (nodeIdSet.has(node.elementId)) { duplicateNodeFound = true; break; }
        nodeIdSet.add(node.elementId);
    }
    assert('7.x no duplicate node IDs', !duplicateNodeFound);
}

// ── Section 8: Hash consistency (M) ──────────────────────────────────────────
{
    assert('8.01 traceabilityHash is 64-char hex', /^[0-9a-f]{64}$/.test(tm1.traceabilityHash));
    assert('8.02 compilerHash is 64-char hex',     /^[0-9a-f]{64}$/.test(tm1.compilerHash));
    assert('8.03 attestationHash is 64-char hex',  /^[0-9a-f]{64}$/.test(tm1.attestationHash));
    assert('8.04 proofHash is 64-char hex',        /^[0-9a-f]{64}$/.test(tm1.proofHash));

    // Cross-reference against live outputs
    const compiled  = compileGovernance();
    const attest    = createGovernanceAttestation();
    const proof     = createReproducibilityProof();

    assert('8.05 compilerHash === compileGovernance().contractHash',
        tm1.compilerHash === compiled.contractHash);
    assert('8.06 attestationHash === attestation.compiledContractHash',
        tm1.attestationHash === attest.compiledContractHash);
    assert('8.07 proofHash === reproducibility.proofHash',
        tm1.proofHash === proof.proofHash);

    // Node hashAnchors must match output hashes
    const anchor = tm1.nodes[0].hashAnchors;
    assert('8.08 node hashAnchors.compilerHash matches tm.compilerHash',
        anchor.compilerHash === tm1.compilerHash);
    assert('8.09 node hashAnchors.attestationHash matches tm.attestationHash',
        anchor.attestationHash === tm1.attestationHash);
    assert('8.10 node hashAnchors.proofHash matches tm.proofHash',
        anchor.proofHash === tm1.proofHash);

    // Hash stable across 3 calls
    assert('8.11 traceabilityHash stable across 3 calls',
        tm1.traceabilityHash === tm2.traceabilityHash &&
        tm2.traceabilityHash === tm3.traceabilityHash);
}

// ── Section 9: No mutation of governance artifacts (J) ───────────────────────
{
    const compiledBefore  = compileGovernance();
    const attestBefore    = createGovernanceAttestation();
    const proofBefore     = createReproducibilityProof();

    for (let i = 0; i < 5; i++) createTraceabilityMap();

    const compiledAfter   = compileGovernance();
    const attestAfter     = createGovernanceAttestation();
    const proofAfter      = createReproducibilityProof();

    assert('9.01 compiler output unchanged after 5 traceability calls',
        JSON.stringify(compiledBefore) === JSON.stringify(compiledAfter));
    assert('9.02 attestation output unchanged after 5 traceability calls',
        JSON.stringify(attestBefore) === JSON.stringify(attestAfter));
    assert('9.03 reproducibility output unchanged after 5 traceability calls',
        JSON.stringify(proofBefore) === JSON.stringify(proofAfter));
    assert('9.04 compiler hash unchanged',
        compiledBefore.contractHash === compiledAfter.contractHash);
}

// ── Section 10: Static import analysis (B–I) ─────────────────────────────────
{
    const traceSrc = fs.readFileSync(
        path.join(__dirname, 'lib', 'runtime', 'governance-traceability.js'), 'utf8'
    );
    const relRequireRe = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

    const FORBIDDEN_MODULES = [
        'execution-transaction', 'concurrency-slot-manager', 'compensation-log',
        'petl-middleware',
        'constitutional-gate', 'constitutional-preflight',
        'decision-lattice',
        'invariant-compiler',
        'lattice-feedback-loop', 'lattice-health-signal',
        'lattice-calibration-advisor',
    ];
    const FORBIDDEN_PATH_PREFIXES = [
        '../memory/', './memory/',
        '../feedback/', './feedback/',
        '../health/', './health/',
        '../advisor/', './advisor/',
    ];

    const foundRelImports = [];
    let m;
    while ((m = relRequireRe.exec(traceSrc)) !== null) {
        foundRelImports.push(m[1]);
    }

    for (const forbidden of FORBIDDEN_MODULES) {
        const found = foundRelImports.some(
            imp => path.basename(imp).replace(/\.js$/, '') === forbidden
        );
        assert(`10.x traceability does not import ${forbidden}`, !found);
    }
    for (const prefix of FORBIDDEN_PATH_PREFIXES) {
        assert(`10.x no imports from ${prefix}`,
            !foundRelImports.some(imp => imp.startsWith(prefix)));
    }

    const ALLOWED_LOCALS = new Set([
        'governance-contract', 'governance-manifest', 'recorder-policy',
        'governance-compiler', 'governance-attestation', 'governance-reproducibility',
    ]);
    for (const imp of foundRelImports) {
        const base = path.basename(imp).replace(/\.js$/, '');
        assert(`10.x local import "${base}" is allowlisted`, ALLOWED_LOCALS.has(base),
            `Unexpected: ${imp}`);
    }
    assert('10.x traceability has exactly 6 relative imports', foundRelImports.length === 6,
        `Found: ${foundRelImports.join(', ')}`);
}

// ── Section 11: module.exports shape ─────────────────────────────────────────
{
    const traceExports = require('./lib/runtime/governance-traceability');
    const exportedKeys = Object.keys(traceExports);
    assert('11.01 exports exactly one key', exportedKeys.length === 1,
        `Got: ${exportedKeys.join(', ')}`);
    assert('11.02 exported key is createTraceabilityMap',
        exportedKeys[0] === 'createTraceabilityMap');
    assert('11.03 createTraceabilityMap is a function',
        typeof traceExports.createTraceabilityMap === 'function');
    const sample = traceExports.createTraceabilityMap();
    const fnCheck = hasNoFunctions(sample, 'traceabilityMap');
    assert('11.04 output has no functions', fnCheck.ok,
        fnCheck.ok ? '' : `Function at: ${fnCheck.path}`);
}

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\nPassed: ${passed} / ${passed + failed}`);
if (failures.length) {
    console.log('\nViolations:');
    failures.forEach(f => console.log(f));
    process.exit(1);
} else {
    console.log('GOVERNANCE TRACEABILITY MAP is deterministic, graph-consistent, and runtime-isolated.');
}
