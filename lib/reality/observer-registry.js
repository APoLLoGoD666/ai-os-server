'use strict';
// lib/reality/observer-registry.js
// T3-06: Observer Bootstrap Infrastructure.
//
// Authority: APEX-CONSTITUTION-v1.0 → D8 INV-2 (Observer Identity);
//            D8 INV-4 (Reality Grounding); D3 §5.6 (Observer Register);
//            IDR-W2-11-001 Resolution Steps 2–4.
//
// CONSTITUTIONAL BOUNDARY:
// This registry creates bootstrap observer identity records — NOT constitutional
// ObserverRegister type instances. Full constitutional ObserverRegister
// instantiation requires RT-02 authority_chain_ref (T3-08 scope).
//
// Observer existence does NOT imply authority.
// Authority remains RT-02 scope (T3-08).
//
// Storage: runtime-local (in-memory). Re-registration occurs on each server
// start. Persistence to constitutional-store begins at T3-08.

// ── Registry state ────────────────────────────────────────────────────────────

const _registry = new Map(); // observer_id → frozen observer record

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_TYPES   = Object.freeze(['SYSTEM', 'HUMAN', 'AGENT']);
const VALID_STATUSES = Object.freeze(['ACTIVE', 'SUSPENDED', 'INACTIVE']);

// ── Validation ────────────────────────────────────────────────────────────────

// Validates a complete observer record.
// Returns { valid: boolean, errors: string[] }. Does NOT throw.
function validateObserver(record) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
        return { valid: false, errors: ['observer record must be a non-null, non-array object'] };
    }

    const errors = [];

    // observer_id: required non-empty string
    if (typeof record.observer_id !== 'string' || record.observer_id.trim() === '') {
        errors.push('observer_id: required non-empty string');
    }

    // observer_type: required, must be SYSTEM|HUMAN|AGENT
    if (!VALID_TYPES.includes(record.observer_type)) {
        errors.push(`observer_type: required, must be one of ${VALID_TYPES.join('|')}`);
    }

    // observer_name: required non-empty string
    if (typeof record.observer_name !== 'string' || record.observer_name.trim() === '') {
        errors.push('observer_name: required non-empty string');
    }

    // capability_profile: required non-null, non-array object
    if (
        record.capability_profile === null ||
        typeof record.capability_profile !== 'object' ||
        Array.isArray(record.capability_profile)
    ) {
        errors.push('capability_profile: required non-null, non-array object');
    }

    // limitation_ref: must be string or null (not undefined, not other types)
    if (record.limitation_ref !== null && typeof record.limitation_ref !== 'string') {
        errors.push('limitation_ref: must be a string or null');
    }

    // registration_timestamp: required valid ISO timestamp string
    if (typeof record.registration_timestamp !== 'string' || record.registration_timestamp.trim() === '') {
        errors.push('registration_timestamp: required ISO timestamp string');
    } else if (Number.isNaN(Date.parse(record.registration_timestamp))) {
        errors.push('registration_timestamp: must be a valid ISO 8601 timestamp');
    }

    // status: required, must be ACTIVE|SUSPENDED|INACTIVE
    if (!VALID_STATUSES.includes(record.status)) {
        errors.push(`status: required, must be one of ${VALID_STATUSES.join('|')}`);
    }

    return { valid: errors.length === 0, errors };
}

// ── Registration ──────────────────────────────────────────────────────────────

// Registers a new observer. Returns the frozen observer record.
// Throws if: duplicate observer_id, missing required fields, invalid field values.
// registration_timestamp is generated internally.
// status defaults to 'ACTIVE'.
//
// Parameters:
//   observer_id          {string}  — deterministic unique identifier
//   observer_type        {string}  — SYSTEM | HUMAN | AGENT
//   observer_name        {string}  — human-readable name
//   capability_profile   {object}  — observer capability description
//   limitation_ref       {string|null} — baseline limitation record ref (nullable)
function registerObserver({
    observer_id,
    observer_type,
    observer_name,
    capability_profile,
    limitation_ref = null,
} = {}) {
    // Pre-validate identity fields before full record construction
    if (typeof observer_id !== 'string' || observer_id.trim() === '') {
        throw new Error('registerObserver: observer_id required non-empty string');
    }
    if (_registry.has(observer_id)) {
        throw new Error(`registerObserver: observer_id '${observer_id}' is already registered`);
    }
    if (!observer_type) {
        throw new Error('registerObserver: observer_type required');
    }
    if (!observer_name) {
        throw new Error('registerObserver: observer_name required');
    }
    if (capability_profile === null || capability_profile === undefined || typeof capability_profile !== 'object' || Array.isArray(capability_profile)) {
        throw new Error('registerObserver: capability_profile required non-null, non-array object');
    }

    const record = Object.freeze({
        observer_id,
        observer_type,
        observer_name,
        capability_profile: Object.freeze({ ...capability_profile }),
        limitation_ref:     limitation_ref !== undefined ? limitation_ref : null,
        registration_timestamp: new Date().toISOString(),
        status:             'ACTIVE',
    });

    // Full validation against the schema (catches type/enum errors missed above)
    const { valid, errors } = validateObserver(record);
    if (!valid) {
        throw new Error(`registerObserver: ${errors.join('; ')}`);
    }

    _registry.set(observer_id, record);
    return record;
}

// ── Lookup ────────────────────────────────────────────────────────────────────

// Returns the registered observer record for observer_id, or null if not found.
function getObserver(observer_id) {
    return _registry.get(observer_id) ?? null;
}

// Returns a shallow array copy of all registered observer records.
function listObservers() {
    return Array.from(_registry.values());
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({ registerObserver, getObserver, validateObserver, listObservers });
