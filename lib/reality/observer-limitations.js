'use strict';
// lib/reality/observer-limitations.js
// T3-07: Observer Limitation Record Bootstrap.
//
// Authority: APEX-CONSTITUTION-v1.0 → RT08-INV-3 (concurrent ObserverLimitationRecord);
//            D5 PI-10 (observer limitations acknowledged); D4 KI-017;
//            IDR-W2-11-001 Resolution Step 4.
//
// CONSTITUTIONAL BOUNDARY:
// Creates bootstrap ObserverLimitationRecord-compatible records, NOT constitutional
// ObserverLimitationRecord type instances (which require RT-02 authority and full
// ObservationChannelRecord infrastructure per RT08-INV-3).
//
// Records are formed concurrently with each ObservationRecord emission (RT08-INV-3).
// formation_timestamp is generated at call time (D5 §3.2 atomic capture principle).
// Records are in-memory only — no constitutional-store persistence until T3-08.

let _seq = 0;

// ── Limitation record creation ────────────────────────────────────────────────

// Creates a bootstrap observer limitation record concurrent with an ObservationRecord.
//
// Parameters:
//   observer_id            {string}  — observer_id from registry
//   observation_record_ref {string}  — ObservationRecord record_id this accompanies
//   capability_snapshot    {object}  — observer capability_profile snapshot at observation time
//
// Returns a frozen limitation record with a unique limitation_id.
function createObserverLimitationRecord({ observer_id, observation_record_ref, capability_snapshot = {} } = {}) {
    if (typeof observer_id !== 'string' || observer_id.trim() === '') {
        throw new Error('createObserverLimitationRecord: observer_id required non-empty string');
    }
    if (typeof observation_record_ref !== 'string' || observation_record_ref.trim() === '') {
        throw new Error('createObserverLimitationRecord: observation_record_ref required non-empty string');
    }
    if (capability_snapshot === null || typeof capability_snapshot !== 'object' || Array.isArray(capability_snapshot)) {
        throw new Error('createObserverLimitationRecord: capability_snapshot must be a non-null, non-array object');
    }

    const limitation_id = `OLR-${observer_id}-${Date.now()}-${++_seq}`;
    const formation_timestamp = new Date().toISOString();

    return Object.freeze({
        limitation_id,
        observer_id,
        observation_record_ref,
        calibration_state:       'BOOTSTRAP',
        instrument_limitations:  Object.freeze([
            'bootstrap observer infrastructure — no external calibration performed',
            'single-system observation — no cross-system verification',
            'authority chain absent — RT-02 pending (T3-08)',
        ]),
        confidence_ceiling:          0.85,
        pi_10_compliance_attestation: true,   // D5 PI-10 limitations acknowledged
        formation_timestamp,
        capability_snapshot:     Object.freeze({ ...capability_snapshot }),
    });
}

// ── Validation ────────────────────────────────────────────────────────────────

// Validates a limitation record. Returns { valid: boolean, errors: string[] }. No throw.
function validateLimitationRecord(record) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
        return { valid: false, errors: ['limitation record must be a non-null, non-array object'] };
    }

    const errors = [];

    if (typeof record.limitation_id !== 'string' || record.limitation_id.trim() === '') {
        errors.push('limitation_id: required non-empty string');
    }
    if (typeof record.observer_id !== 'string' || record.observer_id.trim() === '') {
        errors.push('observer_id: required non-empty string');
    }
    if (typeof record.observation_record_ref !== 'string' || record.observation_record_ref.trim() === '') {
        errors.push('observation_record_ref: required non-empty string');
    }
    if (!Array.isArray(record.instrument_limitations)) {
        errors.push('instrument_limitations: required array');
    }
    if (typeof record.confidence_ceiling !== 'number' || record.confidence_ceiling < 0 || record.confidence_ceiling > 1) {
        errors.push('confidence_ceiling: required number in [0, 1]');
    }
    if (record.pi_10_compliance_attestation !== true) {
        errors.push('pi_10_compliance_attestation: must be true — D5 PI-10 compliance required');
    }
    if (typeof record.formation_timestamp !== 'string' || Number.isNaN(Date.parse(record.formation_timestamp))) {
        errors.push('formation_timestamp: required valid ISO timestamp');
    }

    return { valid: errors.length === 0, errors };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({ createObserverLimitationRecord, validateLimitationRecord });
