'use strict';
// lib/runtime/governance-attestation.js
// Governance attestation — proves that compiled governance accurately represents
// declared governance.
//
// Attestation is evidence. Not execution. Not enforcement. Not runtime.
// Not validation authority.
//
// Reads ONLY:
//   governance-compiler.js   (compileGovernance)
//   governance-contract.js   (CONTRACT)
//   governance-manifest.js   (TIER, MODULES, INVARIANTS)
//   recorder-policy.js       (POLICY)
//
// Exports ONLY:
//   createGovernanceAttestation() → frozen attestation object
//
// No cache. No state. No writes. No runtime access.

const crypto                         = require('crypto');
const { compileGovernance }          = require('./governance-compiler');
const CONTRACT                        = require('./governance-contract');
const { TIER, MODULES, INVARIANTS }  = require('./governance-manifest');
const POLICY                          = require('./recorder-policy');

// ── Canonical serialization (independent of compiler — intentional duplication) ─
// Must produce identical output to the compiler for identical inputs so that
// sourceHash === compiledContractHash when both are derived from the same sources.

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

function _computeSourceHash(contract, manifest, policy) {
    const canonical = _canon(contract) + '|' + _canon(manifest) + '|' + _canon(policy);
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
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

// ── Coverage computation ──────────────────────────────────────────────────────
// Measures how completely the compiled output represents the declared sources.
// No inference. No repair. Counts only what is verifiably present.

function _computeCoverage(compiled, contract, policy) {
    // Tiers
    const compiledTierIds = new Set(compiled.tiers.map(t => t.id));
    const tiersCovered    = contract.tiers.filter(t => compiledTierIds.has(t.id)).length;

    // Invariants
    const compiledInvIds     = new Set(compiled.invariants.map(i => i.id));
    const invariantsCovered  = contract.invariants.filter(i => compiledInvIds.has(i.id)).length;

    // Crossings
    const compiledAllowedSet = new Set(compiled.allowedCrossings.map(c => `${c.from}|${c.to}`));
    const allowedCovered     = contract.allowedCrossings
        .filter(c => compiledAllowedSet.has(`${c.from}|${c.to}`)).length;

    const compiledForbiddenSet = new Set(
        compiled.forbiddenCrossings.map(c => `${c.importerTier}|${c.forbiddenTier}|${c.invariant}`)
    );
    const forbiddenCovered = contract.forbiddenCrossings
        .filter(c => compiledForbiddenSet.has(`${c.importerTier}|${c.forbiddenTier}|${c.invariant}`)).length;
    const crossingsCovered = allowedCovered + forbiddenCovered;

    // Recorder rules
    const compiledAllowedExports  = new Set(compiled.recorderRules.allowedExports);
    const compiledForbiddenExports = new Set(compiled.recorderRules.forbiddenExports);
    const compiledForbiddenTiers   = new Set(compiled.recorderRules.forbiddenImportTiers);

    const allowedExportsCovered   = [...policy.ALLOWED_EXPORT_NAMES]
        .filter(n => compiledAllowedExports.has(n)).length;
    const forbiddenExportsCovered = [...policy.FORBIDDEN_EXPORT_NAMES]
        .filter(n => compiledForbiddenExports.has(n)).length;
    const forbiddenTiersCovered   = [...policy.FORBIDDEN_IMPORT_TIERS]
        .filter(t => compiledForbiddenTiers.has(t)).length;
    const recorderRulesCovered    = allowedExportsCovered + forbiddenExportsCovered + forbiddenTiersCovered;

    // Coverage ratio
    const totalDeclarations = (
        contract.tiers.length +
        contract.invariants.length +
        contract.allowedCrossings.length +
        contract.forbiddenCrossings.length +
        policy.ALLOWED_EXPORT_NAMES.size +
        policy.FORBIDDEN_EXPORT_NAMES.size +
        policy.FORBIDDEN_IMPORT_TIERS.size
    );
    const coveredDeclarations = tiersCovered + invariantsCovered + crossingsCovered + recorderRulesCovered;
    const coverageRatio = totalDeclarations > 0
        ? Math.round((coveredDeclarations / totalDeclarations) * 10000) / 10000
        : 0;

    return { tiersCovered, invariantsCovered, crossingsCovered, recorderRulesCovered, coverageRatio };
}

// ── Integrity checks ──────────────────────────────────────────────────────────
// Structural comparison between declared (contract) and compiled output.

function _checkIntegrity(compiled, contract, policy, sourceHash, compiledHash) {
    // missingDefinitions — declared in contract but absent from compiled output
    const missingDefinitions = [];

    const compiledTierIds = new Set(compiled.tiers.map(t => t.id));
    for (const t of contract.tiers) {
        if (!compiledTierIds.has(t.id))
            missingDefinitions.push({ type: 'tier', id: t.id });
    }

    const compiledInvIds = new Set(compiled.invariants.map(i => i.id));
    for (const inv of contract.invariants) {
        if (!compiledInvIds.has(inv.id))
            missingDefinitions.push({ type: 'invariant', id: inv.id });
    }

    const compiledAllowedKeys = new Set(compiled.allowedCrossings.map(c => `${c.from}|${c.to}`));
    for (const ac of contract.allowedCrossings) {
        if (!compiledAllowedKeys.has(`${ac.from}|${ac.to}`))
            missingDefinitions.push({ type: 'allowedCrossing', id: `${ac.from}→${ac.to}` });
    }

    const compiledForbiddenKeys = new Set(
        compiled.forbiddenCrossings.map(c => `${c.importerTier}|${c.forbiddenTier}|${c.invariant}`)
    );
    for (const fc of contract.forbiddenCrossings) {
        if (!compiledForbiddenKeys.has(`${fc.importerTier}|${fc.forbiddenTier}|${fc.invariant}`))
            missingDefinitions.push({ type: 'forbiddenCrossing', id: `${fc.importerTier}→${fc.forbiddenTier}` });
    }

    // duplicateDefinitions — duplicate IDs in compiled output
    const duplicateDefinitions = [];

    const tierCounts = {};
    for (const t of compiled.tiers) tierCounts[t.id] = (tierCounts[t.id] || 0) + 1;
    for (const [id, count] of Object.entries(tierCounts)) {
        if (count > 1) duplicateDefinitions.push({ type: 'tier', id });
    }

    const invCounts = {};
    for (const i of compiled.invariants) invCounts[i.id] = (invCounts[i.id] || 0) + 1;
    for (const [id, count] of Object.entries(invCounts)) {
        if (count > 1) duplicateDefinitions.push({ type: 'invariant', id });
    }

    // orphanRules — forbiddenCrossings referencing invariants absent from invariants list
    const invariantIdSet = new Set(compiled.invariants.map(i => i.id));
    const orphanRules = compiled.forbiddenCrossings
        .filter(fc => !invariantIdSet.has(fc.invariant))
        .map(fc => `${fc.importerTier}→${fc.forbiddenTier} (invariant: ${fc.invariant})`);

    // tierMismatch — crossings referencing tiers absent from tiers list
    const tierIdSet = new Set(compiled.tiers.map(t => t.id));
    const tierMismatchSet = new Set();
    for (const ac of compiled.allowedCrossings) {
        if (!tierIdSet.has(ac.fromTier)) tierMismatchSet.add(`allowedCrossing ${ac.from}: unknown fromTier=${ac.fromTier}`);
        if (!tierIdSet.has(ac.toTier))   tierMismatchSet.add(`allowedCrossing ${ac.to}: unknown toTier=${ac.toTier}`);
    }
    for (const fc of compiled.forbiddenCrossings) {
        if (!tierIdSet.has(fc.importerTier)) tierMismatchSet.add(`forbiddenCrossing: unknown importerTier=${fc.importerTier}`);
        if (!tierIdSet.has(fc.forbiddenTier)) tierMismatchSet.add(`forbiddenCrossing: unknown forbiddenTier=${fc.forbiddenTier}`);
    }
    const tierMismatch = [...tierMismatchSet].sort();

    const hashConsistency  = sourceHash === compiledHash;
    const structuralParity = (
        missingDefinitions.length === 0 &&
        duplicateDefinitions.length === 0 &&
        orphanRules.length === 0 &&
        tierMismatch.length === 0 &&
        hashConsistency
    );

    return {
        missingDefinitions,
        duplicateDefinitions,
        orphanRules,
        tierMismatch,
        hashConsistency,
        structuralParity,
    };
}

// ── Public API ────────────────────────────────────────────────────────────────

function createGovernanceAttestation() {
    const compiled    = compileGovernance();
    const manifest    = { TIER, MODULES, INVARIANTS };
    const sourceHash  = _computeSourceHash(CONTRACT, manifest, POLICY);

    const coverage       = _computeCoverage(compiled, CONTRACT, POLICY);
    const integrityChecks = _checkIntegrity(
        compiled, CONTRACT, POLICY,
        sourceHash, compiled.contractHash
    );

    const match = (
        sourceHash === compiled.contractHash &&
        integrityChecks.missingDefinitions.length === 0 &&
        integrityChecks.duplicateDefinitions.length === 0 &&
        integrityChecks.orphanRules.length === 0 &&
        integrityChecks.tierMismatch.length === 0
    );

    const attestation = {
        attestationVersion: '1.0.0',
        compiledContractHash: compiled.contractHash,
        sourceHash,
        match,
        coverage,
        integrityChecks,
        attestationMetadata: {
            generatedAt:        null,
            runtimeIntegrated:  false,
            authorityLevel:     'NONE',
            executionInfluence: false,
            deterministic:      true,
            descriptiveOnly:    true,
        },
    };

    return _deepFreeze(attestation);
}

module.exports = { createGovernanceAttestation };
