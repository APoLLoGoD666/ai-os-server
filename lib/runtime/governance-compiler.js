'use strict';
// lib/runtime/governance-compiler.js
// Governance compiler — converts existing governance declarations into a
// single deterministic compiled artifact.
//
// Pure read-only transformation. No state. No cache. No writes.
// No runtime integration. No execution influence.
//
// Reads ONLY:
//   governance-contract.js   (CONTRACT)
//   governance-manifest.js   (TIER, MODULES, INVARIANTS)
//   recorder-policy.js       (POLICY)
//
// Exports ONLY:
//   compileGovernance() → frozen compiled governance object

const crypto   = require('crypto');
const CONTRACT = require('./governance-contract');
const { TIER, MODULES, INVARIANTS } = require('./governance-manifest');
const POLICY   = require('./recorder-policy');

// ── Canonical serialization ───────────────────────────────────────────────────
// Converts any value to a deterministic JSON string suitable for hashing.
//   - Object keys sorted alphabetically
//   - Sets expanded to sorted arrays
//   - Timestamp fields excluded (generatedAt, computedAt, compiledAt)
//   - No undefined — omitted from objects automatically by Object.keys

const _TS_FIELDS = new Set(['generatedAt', 'computedAt', 'compiledAt']);

function _canon(value) {
    if (value === null)                    return 'null';
    if (value === undefined)               return 'null';
    if (typeof value !== 'object')         return JSON.stringify(value);
    if (value instanceof Set) {
        return '[' + [...value].sort().map(_canon).join(',') + ']';
    }
    if (Array.isArray(value)) {
        return '[' + value.map(_canon).join(',') + ']';
    }
    // Plain object — sort keys, skip timestamp fields
    const keys = Object.keys(value).filter(k => !_TS_FIELDS.has(k)).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + _canon(value[k])).join(',') + '}';
}

function _computeHash(contract, manifest, policy) {
    const canonical = _canon(contract) + '|' + _canon(manifest) + '|' + _canon(policy);
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

// ── Deep freeze ───────────────────────────────────────────────────────────────
// Applied to compiled output only. Input objects are already frozen.

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

// ── Section builders (each returns a NEW plain object/array — no source refs) ─

function _compileTiers(contract) {
    return contract.tiers.map(t => ({
        id:            t.id,
        authorityRank: t.authorityRank,
        role:          t.role,
    }));
}

function _compileInvariants(contract, manifestInvariants) {
    return contract.invariants.map(inv => {
        const entry = {
            id:            inv.id,
            description:   inv.description,
            enforcedBy:    inv.enforcedBy,
            affectedTiers: inv.affectedTiers.slice(),
            severity:      inv.severity,
        };
        // Expand with manifest rule details when available
        const mEntry = manifestInvariants[inv.id];
        if (mEntry && Array.isArray(mEntry.rules)) {
            entry.rules = mEntry.rules.map(r => ({
                name:           r.name,
                importer_tiers: [...r.importer_tiers],
                forbidden_tier: r.forbidden_tier,
                rationale:      r.rationale,
            }));
        }
        return entry;
    });
}

function _buildAuthorityOrder(contract) {
    return contract.tiers
        .slice()
        .sort((a, b) => a.authorityRank - b.authorityRank)
        .map((t, i) => ({
            position: i + 1,
            tier:     t.id,
            rank:     t.authorityRank,
        }));
}

function _buildValidationPipeline(contract) {
    return contract.validationOrder.map(entry => ({
        step:      entry.step,
        validator: entry.validator,
        checks:    entry.checks,
    }));
}

function _buildRecorderRules(contract, policy) {
    return {
        allowedExports:       contract.allowedExports.slice(),
        forbiddenExports:     contract.forbiddenExports.slice(),
        forbiddenImportTiers: [...policy.FORBIDDEN_IMPORT_TIERS].sort(),
        allowedImportTiers:   [...policy.ALLOWED_IMPORT_TIERS].sort(),
    };
}

function _copyAllowedCrossings(contract) {
    return contract.allowedCrossings.map(c => ({
        from:          c.from,
        fromTier:      c.fromTier,
        to:            c.to,
        toTier:        c.toTier,
        justification: c.justification,
    }));
}

function _copyForbiddenCrossings(contract) {
    return contract.forbiddenCrossings.map(c => ({
        importerTier:  c.importerTier,
        forbiddenTier: c.forbiddenTier,
        invariant:     c.invariant,
    }));
}

// ── Public API ────────────────────────────────────────────────────────────────

function compileGovernance() {
    const manifest = { TIER, MODULES, INVARIANTS };
    const hash     = _computeHash(CONTRACT, manifest, POLICY);

    const compiled = {
        version:            CONTRACT.version,
        contractHash:       hash,
        tiers:              _compileTiers(CONTRACT),
        invariants:         _compileInvariants(CONTRACT, INVARIANTS),
        allowedCrossings:   _copyAllowedCrossings(CONTRACT),
        forbiddenCrossings: _copyForbiddenCrossings(CONTRACT),
        authorityOrder:     _buildAuthorityOrder(CONTRACT),
        validationPipeline: _buildValidationPipeline(CONTRACT),
        recorderRules:      _buildRecorderRules(CONTRACT, POLICY),
        compilerMetadata: {
            compiledAt:         null,
            runtimeIntegrated:  false,
            authorityLevel:     'NONE',
            executionInfluence: false,
            deterministic:      true,
        },
    };

    return _deepFreeze(compiled);
}

module.exports = { compileGovernance };
