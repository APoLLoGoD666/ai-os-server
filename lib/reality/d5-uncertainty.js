'use strict';
// lib/reality/d5-uncertainty.js
// T3-01: D5 Uncertainty Protocol — atomic uncertainty capture.
//
// Authority: APEX-CONSTITUTION-v1.0 → D5 §3.1 Uncertainty Propagation Mandate;
//            D5 §3.2 Atomic Capture (prohibits post-hoc assignment);
//            D5 §3.4 (five uncertainty attributes); RT08-INV-3.
//
// D5 §3.2: all five attributes are captured atomically at observation time.
// uncertainty_timestamp is generated internally at createUncertaintyDescriptor
// call time — it is never caller-supplied.
// The returned descriptor is Object.freeze'd — post-hoc mutation is impossible.

// ── Validation ────────────────────────────────────────────────────────────────

// Validates that a value is a well-formed D5 uncertainty descriptor.
// Returns { valid: boolean, errors: string[] }.
// Does NOT throw — callers may inspect errors before acting.
function validateUncertaintyDescriptor(descriptor) {
    if (descriptor === null || typeof descriptor !== 'object' || Array.isArray(descriptor)) {
        return { valid: false, errors: ['descriptor must be a non-null, non-array object'] };
    }

    const errors = [];

    // 1. uncertainty_source: required non-empty string
    if (typeof descriptor.uncertainty_source !== 'string' || descriptor.uncertainty_source.trim() === '') {
        errors.push('uncertainty_source: required non-empty string');
    }

    // 2. uncertainty_confidence: required number in [0, 1]
    if (
        typeof descriptor.uncertainty_confidence !== 'number' ||
        Number.isNaN(descriptor.uncertainty_confidence) ||
        descriptor.uncertainty_confidence < 0 ||
        descriptor.uncertainty_confidence > 1
    ) {
        errors.push('uncertainty_confidence: required number in [0, 1] inclusive');
    }

    // 3. uncertainty_limitations: required array (may be empty)
    if (!Array.isArray(descriptor.uncertainty_limitations)) {
        errors.push('uncertainty_limitations: required array');
    }

    // 4. uncertainty_timestamp: required valid ISO timestamp string
    if (typeof descriptor.uncertainty_timestamp !== 'string' || descriptor.uncertainty_timestamp.trim() === '') {
        errors.push('uncertainty_timestamp: required ISO timestamp string');
    } else if (Number.isNaN(Date.parse(descriptor.uncertainty_timestamp))) {
        errors.push('uncertainty_timestamp: must be a valid ISO 8601 timestamp');
    }

    // 5. uncertainty_observer_capability: required non-null, non-array object
    if (
        descriptor.uncertainty_observer_capability === null ||
        typeof descriptor.uncertainty_observer_capability !== 'object' ||
        Array.isArray(descriptor.uncertainty_observer_capability)
    ) {
        errors.push('uncertainty_observer_capability: required non-null, non-array object');
    }

    return { valid: errors.length === 0, errors };
}

// ── Creation ──────────────────────────────────────────────────────────────────

// Creates and returns a frozen D5 uncertainty descriptor.
// uncertainty_timestamp is captured internally at call time (D5 §3.2 atomic capture).
// Throws if any required field is missing or invalid — no silent defaults.
//
// Parameters:
//   uncertainty_source           {string}  — origin and nature of the observation source
//   uncertainty_confidence       {number}  — confidence level in [0, 1]
//   uncertainty_limitations      {Array}   — known limitations at observation time (may be empty)
//   uncertainty_observer_capability {object} — observer capability state at observation time
function createUncertaintyDescriptor({
    uncertainty_source,
    uncertainty_confidence,
    uncertainty_limitations,
    uncertainty_observer_capability,
} = {}) {
    // D5 §3.2: timestamp captured at call time, never supplied by caller
    const uncertainty_timestamp = new Date().toISOString();

    const descriptor = {
        uncertainty_source,
        uncertainty_confidence,
        uncertainty_limitations,
        uncertainty_timestamp,
        uncertainty_observer_capability,
    };

    const { valid, errors } = validateUncertaintyDescriptor(descriptor);
    if (!valid) {
        throw new Error(`D5 uncertainty descriptor invalid: ${errors.join('; ')}`);
    }

    // D5 §3.2: immutable after formation
    return Object.freeze(descriptor);
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = Object.freeze({ createUncertaintyDescriptor, validateUncertaintyDescriptor });
