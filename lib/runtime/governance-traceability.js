'use strict';
// lib/runtime/governance-traceability.js
// Governance traceability — deterministic provenance map between all governance
// elements and their origin sources, processed by the governance pipeline.
//
// Purely evidential. Not enforcement. Not execution. Not authority.
//
// Reads ONLY:
//   governance-contract.js       (CONTRACT)
//   governance-manifest.js       (TIER, MODULES, INVARIANTS)
//   recorder-policy.js           (POLICY)
//   governance-compiler.js       (compileGovernance)
//   governance-attestation.js    (createGovernanceAttestation)
//   governance-reproducibility.js (createReproducibilityProof)
//
// Exports ONLY:
//   createTraceabilityMap() → frozen traceability map

const crypto  = require('crypto');
const CONTRACT = require('./governance-contract');
const { TIER, MODULES, INVARIANTS } = require('./governance-manifest');
const POLICY  = require('./recorder-policy');
const { compileGovernance }          = require('./governance-compiler');
const { createGovernanceAttestation } = require('./governance-attestation');
const { createReproducibilityProof } = require('./governance-reproducibility');

const TRACEABILITY_VERSION = '1.0.0';

// Valid originSource values
const VALID_SOURCES = new Set(['manifest', 'contract', 'recorder-policy']);

// ── Canonical serialization ───────────────────────────────────────────────────

const _TS_FIELDS = new Set(['generatedAt', 'computedAt', 'compiledAt']);

function _canon(value) {
    if (value === null)            return 'null';
    if (value === undefined)       return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (value instanceof Set) {
        return '[' + [...value].sort().map(_canon).join(',') + ']';
    }
    if (Array.isArray(value)) {
        return '[' + value.map(_canon).join(',') + ']';
    }
    const keys = Object.keys(value).filter(k => !_TS_FIELDS.has(k)).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + _canon(value[k])).join(',') + '}';
}

function _sha256(str) {
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

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

// ── Node builder ─────────────────────────────────────────────────────────────

function _buildNodes(compiled, anchors) {
    const nodes = [];
    const manifestTierIds      = new Set(Object.values(TIER));
    const manifestInvariantIds = new Set(Object.keys(INVARIANTS));

    // Always sort originSource and referencedBy for deterministic canonicalization
    const refBy = ['attestation', 'compiler', 'reproducibility'];  // sorted

    function mkOrigin(...sources) {
        return [...new Set(sources)].sort();
    }

    // 1. Tier nodes (10)
    for (const tier of compiled.tiers) {
        nodes.push({
            elementId:     `tier:${tier.id}`,
            elementType:   'tier',
            originSource:  manifestTierIds.has(tier.id)
                ? mkOrigin('contract', 'manifest')
                : mkOrigin('contract'),
            referencedBy:  refBy,
            hashAnchors:   { ...anchors },
        });
    }

    // 2. Invariant nodes (4)
    for (const inv of compiled.invariants) {
        const inManifest = manifestInvariantIds.has(inv.id);
        const inPolicy   = inv.id === 'RECORDER_PURITY_INVARIANT';
        nodes.push({
            elementId:    `invariant:${inv.id}`,
            elementType:  'invariant',
            originSource: inManifest ? mkOrigin('contract', 'manifest')
                        : inPolicy   ? mkOrigin('contract', 'recorder-policy')
                        :              mkOrigin('contract'),
            referencedBy: refBy,
            hashAnchors:  { ...anchors },
        });
    }

    // 3. Allowed crossing nodes (2)
    for (const ac of compiled.allowedCrossings) {
        nodes.push({
            elementId:    `allowedCrossing:${ac.from}→${ac.to}`,
            elementType:  'allowedCrossing',
            originSource: mkOrigin('contract'),
            referencedBy: refBy,
            hashAnchors:  { ...anchors },
        });
    }

    // 4. Forbidden crossing nodes (20)
    for (const fc of compiled.forbiddenCrossings) {
        const inManifest = manifestInvariantIds.has(fc.invariant);
        const inPolicy   = fc.invariant === 'RECORDER_PURITY_INVARIANT';
        nodes.push({
            elementId:    `forbiddenCrossing:${fc.importerTier}→${fc.forbiddenTier}:${fc.invariant}`,
            elementType:  'forbiddenCrossing',
            originSource: inManifest ? mkOrigin('contract', 'manifest')
                        : inPolicy   ? mkOrigin('contract', 'recorder-policy')
                        :              mkOrigin('contract'),
            referencedBy: refBy,
            hashAnchors:  { ...anchors },
        });
    }

    // 5. Recorder allowed export nodes (9)
    for (const name of compiled.recorderRules.allowedExports) {
        nodes.push({
            elementId:    `recorderRule:allowed:${name}`,
            elementType:  'recorderRule',
            originSource: mkOrigin('contract', 'recorder-policy'),
            referencedBy: refBy,
            hashAnchors:  { ...anchors },
        });
    }

    // 6. Recorder forbidden export nodes (16)
    for (const name of compiled.recorderRules.forbiddenExports) {
        nodes.push({
            elementId:    `recorderRule:forbidden:${name}`,
            elementType:  'recorderRule',
            originSource: mkOrigin('contract', 'recorder-policy'),
            referencedBy: refBy,
            hashAnchors:  { ...anchors },
        });
    }

    // 7. Recorder forbidden import tier nodes (6)
    for (const tierName of compiled.recorderRules.forbiddenImportTiers) {
        nodes.push({
            elementId:    `recorderRule:forbiddenTier:${tierName}`,
            elementType:  'recorderRule',
            originSource: mkOrigin('contract', 'recorder-policy'),
            referencedBy: refBy,
            hashAnchors:  { ...anchors },
        });
    }

    // Sort nodes by elementId for deterministic canonical ordering
    nodes.sort((a, b) => (a.elementId < b.elementId ? -1 : a.elementId > b.elementId ? 1 : 0));
    return nodes;
}

// ── Edge builder ──────────────────────────────────────────────────────────────

function _buildEdges(compiled, nodeIds) {
    const edges = [];

    function add(from, to, relationship) {
        if (nodeIds.has(from) && nodeIds.has(to)) {
            edges.push({ from, to, relationship });
        }
    }

    // 1. Invariant → tier (AFFECTS_TIER) [19 edges]
    for (const inv of compiled.invariants) {
        for (const tierName of inv.affectedTiers) {
            add(`invariant:${inv.id}`, `tier:${tierName}`, 'AFFECTS_TIER');
        }
    }

    // 2. AllowedCrossing → tier (FROM_TIER, TO_TIER) [4 edges]
    for (const ac of compiled.allowedCrossings) {
        const id = `allowedCrossing:${ac.from}→${ac.to}`;
        add(id, `tier:${ac.fromTier}`, 'FROM_TIER');
        add(id, `tier:${ac.toTier}`,   'TO_TIER');
    }

    // 3. ForbiddenCrossing → tier (IMPORTER_TIER, FORBIDDEN_TIER) [40 edges]
    // 4. ForbiddenCrossing → invariant (ENFORCED_BY) [20 edges]
    for (const fc of compiled.forbiddenCrossings) {
        const id = `forbiddenCrossing:${fc.importerTier}→${fc.forbiddenTier}:${fc.invariant}`;
        add(id, `tier:${fc.importerTier}`,       'IMPORTER_TIER');
        add(id, `tier:${fc.forbiddenTier}`,      'FORBIDDEN_TIER');
        add(id, `invariant:${fc.invariant}`,     'ENFORCED_BY');
    }

    // 5. RECORDER_PURITY_INVARIANT → allowed exports (PERMITS_EXPORT) [9 edges]
    const rpiId = 'invariant:RECORDER_PURITY_INVARIANT';
    for (const name of compiled.recorderRules.allowedExports) {
        add(rpiId, `recorderRule:allowed:${name}`, 'PERMITS_EXPORT');
    }

    // 6. RECORDER_PURITY_INVARIANT → forbidden exports (FORBIDS_EXPORT) [16 edges]
    for (const name of compiled.recorderRules.forbiddenExports) {
        add(rpiId, `recorderRule:forbidden:${name}`, 'FORBIDS_EXPORT');
    }

    // 7. RECORDER_PURITY_INVARIANT → forbidden import tiers (FORBIDS_IMPORT_OF) [6 edges]
    for (const tierName of compiled.recorderRules.forbiddenImportTiers) {
        add(rpiId, `recorderRule:forbiddenTier:${tierName}`, 'FORBIDS_IMPORT_OF');
    }

    // 8. RecorderForbiddenImportTier → tier (REFERENCES_TIER) [6 edges]
    for (const tierName of compiled.recorderRules.forbiddenImportTiers) {
        add(`recorderRule:forbiddenTier:${tierName}`, `tier:${tierName}`, 'REFERENCES_TIER');
    }

    // Sort edges for deterministic canonical ordering
    edges.sort((a, b) => {
        const ka = `${a.from}|${a.to}|${a.relationship}`;
        const kb = `${b.from}|${b.to}|${b.relationship}`;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
    return edges;
}

// ── Public API ────────────────────────────────────────────────────────────────

function createTraceabilityMap() {
    // A. Compile governance
    const compiled = compileGovernance();

    // B. Load attestation
    const attestation = createGovernanceAttestation();

    // C. Load reproducibility proof
    const proof = createReproducibilityProof();

    // Hash anchors — shared by all nodes
    const compilerHash    = compiled.contractHash;
    const attestationHash = attestation.compiledContractHash;
    const proofHash       = proof.proofHash;
    const anchors = { attestationHash, compilerHash, proofHash };

    // D / E. Build nodes with provenance
    const nodes   = _buildNodes(compiled, anchors);
    const nodeIds = new Set(nodes.map(n => n.elementId));

    // F. Build edges (provenance relationships)
    const edges = _buildEdges(compiled, nodeIds);

    // G. Compute traceabilityHash
    const traceabilityHash = _sha256(_canon({ nodes, edges, compilerHash, attestationHash, proofHash }));

    // H. Emit frozen map
    return _deepFreeze({
        traceabilityVersion: TRACEABILITY_VERSION,
        nodeCount:           nodes.length,
        edgeCount:           edges.length,
        traceabilityHash,
        compilerHash,
        attestationHash,
        proofHash,
        generatedAt:         null,
        runtimeIntegrated:   false,
        authorityLevel:      'NONE',
        deterministic:       true,
        descriptiveOnly:     true,
        nodes,
        edges,
    });
}

module.exports = { createTraceabilityMap };
