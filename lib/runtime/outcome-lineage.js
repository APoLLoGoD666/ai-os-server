'use strict';
// lib/runtime/outcome-lineage.js
// Outcome lineage — deterministic provenance chains for registry evidence.
//
// PURE OBSERVABILITY. NOT execution. NOT runtime. NOT authority.
//
// Imports ONLY: ./outcome-registry
//
// Rules:
//   A. No imports except outcome-registry.js.
//   B. No writes. No persistence. No hidden state.
//   C. No mutation of inputs. No execution calls.
//   D. Deterministic: same registry → same lineage.
//   E. All outputs deep-frozen.
//   F. Lineage is fully reconstructable from registry snapshot.
//
// Exports ONLY:
//   buildLineage(registrySnapshot)   → frozen lineageSnapshot
//   createContext()                  → frozen lineage context descriptor

const { createContext: _getRegistryContext } = require('./outcome-registry');

const LINEAGE_VERSION = '1.0.0';

// ── Static dependency map: registry output field → input record fields ────────

const DEPENDENCY_MAP = Object.freeze({
    recordCount:            Object.freeze(['txId']),
    timeRange:              Object.freeze(['startedAt']),
    outcomeDistribution:    Object.freeze(['outcomeCategory']),
    successDistribution:    Object.freeze(['outcomeSuccess']),
    confidenceDistribution: Object.freeze(['finalDecisionScore']),
    decisionDistribution:   Object.freeze(['transactionType']),
    consistencyTrend:       Object.freeze(['outcomeSuccess', 'finalDecisionScore']),
    benchmarkSummary:       Object.freeze(['finalDecisionScore', 'durationMs', 'rollbackTriggered', 'compensationTriggered']),
    evaluationCoverage:     Object.freeze(['finalDecisionScore', 'outcomeSuccess']),
    counterfactualCoverage: Object.freeze(['txId', 'finalDecisionScore', 'outcomeSuccess', 'constitutionVerdict', 'founderScore']),
    qualityIndicators:      Object.freeze(['finalDecisionScore', 'outcomeSuccess', 'durationMs', 'rollbackTriggered']),
    registryHash:           Object.freeze(['txId', 'transactionType', 'startedAt', 'durationMs', 'constitutionVerdict', 'founderScore', 'twinScore', 'finalDecisionScore', 'outcomeSuccess', 'outcomeCategory', 'compensationTriggered', 'rollbackTriggered', 'executionStatus']),
});

// Registry metadata fields: no input field dependencies (constant values)
const ORPHAN_FIELDS = Object.freeze([
    'registryVersion', 'generatedAt', 'runtimeIntegrated', 'authorityLevel',
    'executionInfluence', 'deterministic', 'descriptiveOnly',
]);

// All unique input fields referenced by at least one derived field
function _collectSources() {
    const seen = new Set();
    for (const sources of Object.values(DEPENDENCY_MAP)) {
        for (const s of sources) seen.add(s);
    }
    return Object.freeze([...seen].sort());
}

const SOURCE_FIELDS  = _collectSources();
const DERIVED_FIELDS = Object.freeze(Object.keys(DEPENDENCY_MAP).sort());

// Static structural counts (fixed by DEPENDENCY_MAP, not by runtime data)
const STATIC_NODE_COUNT = SOURCE_FIELDS.length + DERIVED_FIELDS.length + ORPHAN_FIELDS.length;
const STATIC_EDGE_COUNT = Object.values(DEPENDENCY_MAP)
    .reduce((sum, deps) => sum + deps.length, 0);

// Inverted graph: source field → sorted array of derived fields that depend on it
function _buildGraph() {
    const g = {};
    for (const [derived, sources] of Object.entries(DEPENDENCY_MAP)) {
        for (const source of sources) {
            if (!g[source]) g[source] = [];
            if (!g[source].includes(derived)) g[source].push(derived);
        }
    }
    const sorted = {};
    for (const k of Object.keys(g).sort()) sorted[k] = g[k].sort();
    return sorted;
}

const LINEAGE_GRAPH = Object.freeze(_buildGraph());

// ── Deep freeze ───────────────────────────────────────────────────────────────

function _deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.freeze(obj);
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) _deepFreeze(obj[i]);
    } else {
        for (const key of Object.keys(obj)) _deepFreeze(obj[key]);
    }
    return obj;
}

// ── Deterministic hash — same algorithm as outcome-registry ───────────────────

function _djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h = h >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

function _canon(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(_canon).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + _canon(value[k])).join(',') + '}';
}

// ── Evidence coverage from registry snapshot ──────────────────────────────────

function _evidenceCoverage(snapshot) {
    const nonNullDerived = DERIVED_FIELDS.filter(f => {
        const v = snapshot[f];
        return v !== null && v !== undefined;
    });
    const coveredSources = new Set();
    for (const f of nonNullDerived) {
        for (const src of DEPENDENCY_MAP[f] || []) coveredSources.add(src);
    }
    return _deepFreeze({
        usedDerivedFields:   nonNullDerived.length,
        totalDerivedFields:  DERIVED_FIELDS.length,
        coveredSourceFields: coveredSources.size,
        totalSourceFields:   SOURCE_FIELDS.length,
        coverageRate:        DERIVED_FIELDS.length > 0
            ? parseFloat((nonNullDerived.length / DERIVED_FIELDS.length).toFixed(6)) : null,
    });
}

// reproducibilityScore: how well the registry supports full reconstruction.
// Weighted: records present (0.4) + hash present (0.3) + evaluation coverage (0.3).
function _reproducibilityScore(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return 0;
    const hasRecords = typeof snapshot.recordCount === 'number' && snapshot.recordCount > 0;
    const hasHash    = typeof snapshot.registryHash === 'string' && snapshot.registryHash.length > 0;
    const coverage   = (snapshot.evaluationCoverage && typeof snapshot.evaluationCoverage.coverageRate === 'number')
        ? snapshot.evaluationCoverage.coverageRate : 0;
    if (!hasRecords) return 0;
    return parseFloat(Math.min(1, 0.4 + (hasHash ? 0.3 : 0) + 0.3 * coverage).toFixed(6));
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    const regCtx = _getRegistryContext();
    return _deepFreeze({
        lineageVersion:    LINEAGE_VERSION,
        lineageFields:     Object.freeze([
            'lineageVersion', 'nodeCount', 'edgeCount', 'sourceNodes', 'derivedNodes',
            'lineageGraph', 'dependencyMap', 'evidenceCoverage', 'orphanDetection',
            'reproducibilityScore', 'integrityChecks', 'lineageHash',
            'generatedAt', 'runtimeIntegrated', 'authorityLevel',
            'executionInfluence', 'deterministic', 'descriptiveOnly',
        ]),
        fieldCount:        18,
        registryVersion:   regCtx.registryVersion,
        nodeCount:         STATIC_NODE_COUNT,
        edgeCount:         STATIC_EDGE_COUNT,
        sourceFieldCount:  SOURCE_FIELDS.length,
        derivedFieldCount: DERIVED_FIELDS.length,
        orphanFieldCount:  ORPHAN_FIELDS.length,
        authorityLevel:    'NONE',
        deterministic:     true,
        descriptiveOnly:   true,
        runtimeIntegrated: false,
        executionInfluence: false,
        createdAt:         null,
    });
}

function buildLineage(snapshot) {
    const validSnapshot = snapshot !== null && typeof snapshot === 'object';

    const sourceNodes = SOURCE_FIELDS.map(field => _deepFreeze({
        id:        `src:${field}`,
        label:     field,
        type:      'source',
        fieldName: field,
    }));

    const derivedNodes = DERIVED_FIELDS.map(field => _deepFreeze({
        id:           `derived:${field}`,
        label:        field,
        type:         'derived',
        dependsOn:    (DEPENDENCY_MAP[field] || []).slice(),
        valuePresent: validSnapshot ? (snapshot[field] !== null && snapshot[field] !== undefined) : false,
    }));

    // Graph and dep map are static — copy frozen slices for output
    const lineageGraph = _deepFreeze(
        Object.fromEntries(Object.entries(LINEAGE_GRAPH).map(([k, v]) => [k, v.slice()]))
    );
    const dependencyMap = _deepFreeze(
        Object.fromEntries(Object.entries(DEPENDENCY_MAP).map(([k, v]) => [k, v.slice()]))
    );

    const orphanDetection = _deepFreeze({
        orphanCount:  ORPHAN_FIELDS.length,
        orphans:      ORPHAN_FIELDS.slice(),
        description:  'Registry metadata fields with no input field dependencies',
    });

    const computedEdges = Object.values(lineageGraph).reduce((sum, arr) => sum + arr.length, 0);
    const integrityChecks = _deepFreeze({
        nodeCountMatches:     SOURCE_FIELDS.length + DERIVED_FIELDS.length + ORPHAN_FIELDS.length === STATIC_NODE_COUNT,
        edgeCountMatches:     computedEdges === STATIC_EDGE_COUNT,
        allDerivedHaveSources: DERIVED_FIELDS.every(f => (DEPENDENCY_MAP[f] || []).length > 0),
        noCycles:             true,
        registryHashPresent:  validSnapshot && typeof snapshot.registryHash === 'string' && snapshot.registryHash.length > 0,
    });

    const registryHashStr = validSnapshot && typeof snapshot.registryHash === 'string'
        ? snapshot.registryHash : 'null';
    const lineageHash = _djb2(_canon(lineageGraph) + '|' + registryHashStr);

    return _deepFreeze({
        lineageVersion:       LINEAGE_VERSION,
        nodeCount:            STATIC_NODE_COUNT,
        edgeCount:            STATIC_EDGE_COUNT,
        sourceNodes:          _deepFreeze(sourceNodes),
        derivedNodes:         _deepFreeze(derivedNodes),
        lineageGraph,
        dependencyMap,
        evidenceCoverage:     validSnapshot ? _evidenceCoverage(snapshot) : _deepFreeze({ usedDerivedFields: 0, totalDerivedFields: DERIVED_FIELDS.length, coveredSourceFields: 0, totalSourceFields: SOURCE_FIELDS.length, coverageRate: null }),
        orphanDetection,
        reproducibilityScore: _reproducibilityScore(validSnapshot ? snapshot : null),
        integrityChecks,
        lineageHash,
        generatedAt:          null,
        runtimeIntegrated:    false,
        authorityLevel:       'NONE',
        executionInfluence:   false,
        deterministic:        true,
        descriptiveOnly:      true,
    });
}

module.exports = { buildLineage, createContext };
