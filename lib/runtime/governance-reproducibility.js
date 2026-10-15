'use strict';
// lib/runtime/governance-reproducibility.js
// Governance reproducibility — proves that governance artifacts can be
// regenerated from source declarations and produce identical outputs.
//
// This is evidence only. Not enforcement. Not execution. Not authority.
//
// Reads ONLY:
//   governance-compiler.js    (compileGovernance)
//   governance-attestation.js (createGovernanceAttestation)
//
// Exports ONLY:
//   createReproducibilityProof() → frozen proof object
//
// No cache. No state. No writes. No timestamps. No runtime access.

const crypto = require('crypto');
const { compileGovernance }          = require('./governance-compiler');
const { createGovernanceAttestation } = require('./governance-attestation');

// sourceCount: the three fundamental declaration files read by the compiler
// (governance-contract, governance-manifest, recorder-policy)
const SOURCE_COUNT   = 3;
const PROOF_VERSION  = '1.0.0';

// ── Canonical serialization ───────────────────────────────────────────────────
// Same algorithm as compiler and attestation — intentional duplication for
// independent, self-contained hash computation.

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

// ── Public API ────────────────────────────────────────────────────────────────

function createReproducibilityProof() {
    // A. Compile governance
    const compiled = compileGovernance();

    // B. Generate attestation
    const attestation = createGovernanceAttestation();

    // C. Normalize / derive hashes

    // contractHash: taken directly from compiled output
    const contractHash = compiled.contractHash;

    // attestationHash: canonical hash of the full attestation object
    const attestationHash = _sha256(_canon(attestation));

    // structuralHash: hash of the governance structure independent of metadata
    const structuralHash = _sha256(_canon({
        tiers:              compiled.tiers,
        invariants:         compiled.invariants,
        allowedCrossings:   compiled.allowedCrossings,
        forbiddenCrossings: compiled.forbiddenCrossings,
    }));

    // D. Determine reproducibility
    // F. Verify compiled.contractHash === attestation.compiledContractHash
    const reproducible = (
        compiled.contractHash === attestation.compiledContractHash &&
        attestation.match                              === true     &&
        attestation.integrityChecks.structuralParity  === true     &&
        attestation.coverage.coverageRatio            === 1
    );

    // E. Compute proofHash — hash of all proof fields excluding proofHash itself
    const proofBody = {
        reproducible,
        proofVersion:      PROOF_VERSION,
        contractHash,
        attestationHash,
        structuralHash,
        sourceCount:       SOURCE_COUNT,
        generatedAt:       null,
        runtimeIntegrated: false,
        authorityLevel:    'NONE',
        deterministic:     true,
        descriptiveOnly:   true,
    };

    const proofHash = _sha256(_canon(proofBody));

    // G. Emit frozen proof
    return _deepFreeze({
        ...proofBody,
        proofHash,
    });
}

module.exports = { createReproducibilityProof };
