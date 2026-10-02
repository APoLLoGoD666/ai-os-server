'use strict';
// lib/authority/authority-registry.js
// T3-08: Bootstrap Authority Grant Registry.
//
// Authority: APEX-CONSTITUTION-v1.0 → RT-02 (Authority Model);
//            D6 §4.2 (OBSERVATION authority type); D-2 §X (explicit authority);
//            IDR-W2-11-001 Resolution Step 5.
//
// CONSTITUTIONAL BOUNDARY:
// Creates bootstrap authority grant records — NOT constitutional DelegationRecord
// instances (R2-v1.0 RS-07 RT02-OWN-01). Full DelegationRecord instantiation
// requires RT-01 ActorProfile (delegating_actor, recipient_actor), RT-03 Gate
// admission (creation_provenance), FoundingRatification chain (authorization_chain_ref
// per D3 GI-5), and formal autonomy_band from D4 §4.3(f). None are implemented.
// T3-09+ scope.
//
// Bootstrap grants are constitutionally honest:
//   - authority_type = OBSERVATION (D6 §4.2) — correct type for claimReality()
//   - granted_by = 'APEX-CONSTITUTION-v1.0' — the actual constitutional source
//   - limitations explicitly enumerate what is absent (D8 INV-4)
//
// Storage: runtime-local (in-memory). Re-registration on each server start.

const _registry = new Map(); // authority_id → frozen authority grant record

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_SUBJECT_TYPES   = Object.freeze(['SYSTEM', 'HUMAN', 'AGENT']);
const VALID_AUTHORITY_TYPES = Object.freeze(['OBSERVATION', 'INTERPRETATION', 'DECISION', 'PROJECTION', 'AUDIT']);
const VALID_STATUSES        = Object.freeze(['ACTIVE', 'REVOKED']);

// ── Validation ─────────────────────────────────────────────────────────────────

// Validates an authority grant record. Returns { valid: boolean, errors: string[] }. No throw.
function validateAuthorityGrant(grant) {
    if (grant === null || typeof grant !== 'object' || Array.isArray(grant)) {
        return { valid: false, errors: ['authority grant must be a non-null, non-array object'] };
    }

    const errors = [];

    if (typeof grant.authority_id !== 'string' || grant.authority_id.trim() === '') {
        errors.push('authority_id: required non-empty string');
    }
    if (typeof grant.subject_ref !== 'string' || grant.subject_ref.trim() === '') {
        errors.push('subject_ref: required non-empty string');
    }
    if (!VALID_SUBJECT_TYPES.includes(grant.subject_type)) {
        errors.push(`subject_type: required, must be one of ${VALID_SUBJECT_TYPES.join('|')}`);
    }
    if (!VALID_AUTHORITY_TYPES.includes(grant.authority_type)) {
        errors.push(`authority_type: required, must be one of ${VALID_AUTHORITY_TYPES.join('|')}`);
    }
    if (typeof grant.grant_scope !== 'string' || grant.grant_scope.trim() === '') {
        errors.push('grant_scope: required non-empty string');
    }
    if (typeof grant.granted_by !== 'string' || grant.granted_by.trim() === '') {
        errors.push('granted_by: required non-empty string');
    }
    if (typeof grant.grant_timestamp !== 'string' || Number.isNaN(Date.parse(grant.grant_timestamp))) {
        errors.push('grant_timestamp: required valid ISO timestamp');
    }
    if (grant.expiry_timestamp !== null &&
        (typeof grant.expiry_timestamp !== 'string' || Number.isNaN(Date.parse(grant.expiry_timestamp)))) {
        errors.push('expiry_timestamp: must be null or valid ISO timestamp');
    }
    if (!VALID_STATUSES.includes(grant.status)) {
        errors.push(`status: required, must be one of ${VALID_STATUSES.join('|')}`);
    }
    if (!Array.isArray(grant.limitations)) {
        errors.push('limitations: required array');
    }

    // Temporal validity: ACTIVE grant with past expiry_timestamp is expired
    if (grant.status === 'ACTIVE' && grant.expiry_timestamp !== null) {
        if (Date.parse(grant.expiry_timestamp) < Date.now()) {
            errors.push('grant is expired: expiry_timestamp is in the past');
        }
    }

    return { valid: errors.length === 0, errors };
}

// ── Registration ───────────────────────────────────────────────────────────────

// Registers a new authority grant. Returns the frozen grant record.
// Throws on duplicate authority_id, missing required fields, invalid values.
// grant_timestamp generated internally. status defaults to ACTIVE.
//
// Parameters:
//   authority_id     {string} — deterministic unique identifier (AG-{subject}-{scope}-{basis})
//   subject_ref      {string} — observer_id / actor_id the grant applies to
//   subject_type     {string} — SYSTEM | HUMAN | AGENT
//   authority_type   {string} — OBSERVATION | INTERPRETATION | DECISION | PROJECTION | AUDIT
//   grant_scope      {string} — operation types authorized
//   granted_by       {string} — granting authority (constitutional source)
//   expiry_timestamp {string|null} — ISO timestamp or null (indefinite-until-revoked)
//   limitations      {string[]} — explicit limitations on this grant (D8 INV-4)
function registerAuthorityGrant({
    authority_id,
    subject_ref,
    subject_type,
    authority_type,
    grant_scope,
    granted_by,
    expiry_timestamp = null,
    limitations = [],
} = {}) {
    if (typeof authority_id !== 'string' || authority_id.trim() === '') {
        throw new Error('registerAuthorityGrant: authority_id required non-empty string');
    }
    if (_registry.has(authority_id)) {
        throw new Error(`registerAuthorityGrant: authority_id '${authority_id}' is already registered`);
    }
    if (typeof subject_ref !== 'string' || subject_ref.trim() === '') {
        throw new Error('registerAuthorityGrant: subject_ref required non-empty string');
    }
    if (!VALID_SUBJECT_TYPES.includes(subject_type)) {
        throw new Error(`registerAuthorityGrant: subject_type must be one of ${VALID_SUBJECT_TYPES.join('|')}`);
    }
    if (!VALID_AUTHORITY_TYPES.includes(authority_type)) {
        throw new Error(`registerAuthorityGrant: authority_type must be one of ${VALID_AUTHORITY_TYPES.join('|')}`);
    }
    if (typeof grant_scope !== 'string' || grant_scope.trim() === '') {
        throw new Error('registerAuthorityGrant: grant_scope required non-empty string');
    }
    if (typeof granted_by !== 'string' || granted_by.trim() === '') {
        throw new Error('registerAuthorityGrant: granted_by required non-empty string');
    }
    if (!Array.isArray(limitations)) {
        throw new Error('registerAuthorityGrant: limitations must be an array');
    }

    const grant = Object.freeze({
        authority_id,
        subject_ref,
        subject_type,
        authority_type,
        grant_scope,
        granted_by,
        grant_timestamp:  new Date().toISOString(),
        expiry_timestamp: expiry_timestamp ?? null,
        status:           'ACTIVE',
        limitations:      Object.freeze([...limitations]),
    });

    const { valid, errors } = validateAuthorityGrant(grant);
    if (!valid) {
        throw new Error(`registerAuthorityGrant: ${errors.join('; ')}`);
    }

    _registry.set(authority_id, grant);
    return grant;
}

// ── Lookup ─────────────────────────────────────────────────────────────────────

function getAuthorityGrant(authority_id) {
    return _registry.get(authority_id) ?? null;
}

function listAuthorityGrants() {
    return Array.from(_registry.values());
}

// ── Revocation ─────────────────────────────────────────────────────────────────

// Revokes an authority grant. Returns the updated (REVOKED) record.
// Idempotent — revoking an already-revoked grant returns the existing revoked record.
// Throws if authority_id not found.
function revokeAuthorityGrant(authority_id) {
    if (typeof authority_id !== 'string' || authority_id.trim() === '') {
        throw new Error('revokeAuthorityGrant: authority_id required non-empty string');
    }
    const existing = _registry.get(authority_id);
    if (!existing) {
        throw new Error(`revokeAuthorityGrant: authority_id '${authority_id}' not found`);
    }
    if (existing.status === 'REVOKED') {
        return existing;
    }
    const revoked = Object.freeze({
        ...existing,
        status:               'REVOKED',
        revocation_timestamp: new Date().toISOString(),
    });
    _registry.set(authority_id, revoked);
    return revoked;
}

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = Object.freeze({
    registerAuthorityGrant,
    getAuthorityGrant,
    listAuthorityGrants,
    revokeAuthorityGrant,
    validateAuthorityGrant,
});
