'use strict';

// Governance Event Schema Registry V1 — Canonical Event Contract Layer
// Defines schemas for all governance events. Validates and fingerprints every event.
// Deterministic: same input → same fingerprint always. Never throws.

const crypto = require('crypto');

const REGISTRY_VERSION = '1.0.0';

// ── Canonical schemas ─────────────────────────────────────────────────────────
// ordered_fields: the stable ordered subset used for fingerprinting.
// field_types: validated only when field is non-null (null is always allowed).

const _SCHEMAS = Object.freeze({
    EXECUTION_START: Object.freeze({
        schema_version:  '1.0.0',
        required_fields: Object.freeze(['execution_id', 'task_type']),
        field_types:     Object.freeze({ execution_id: 'string', task_type: 'string', metadata: 'object' }),
        ordered_fields:  Object.freeze(['execution_id', 'task_type']),
    }),
    EXECUTION_END: Object.freeze({
        schema_version:  '1.0.0',
        required_fields: Object.freeze(['execution_id', 'status']),
        field_types:     Object.freeze({ execution_id: 'string', status: 'string', metadata: 'object' }),
        ordered_fields:  Object.freeze(['execution_id', 'status']),
    }),
    EXECUTION_ERROR: Object.freeze({
        schema_version:  '1.0.0',
        required_fields: Object.freeze(['execution_id', 'error_message']),
        field_types:     Object.freeze({ execution_id: 'string', error_message: 'string', metadata: 'object' }),
        ordered_fields:  Object.freeze(['execution_id', 'error_message']),
    }),
    REALITY_LOOP_RESULT: Object.freeze({
        schema_version:  '1.0.0',
        required_fields: Object.freeze(['execution_id']),
        field_types:     Object.freeze({ execution_id: 'string', drift_score: 'number', classification: 'string', loop_consensus: 'boolean', anomaly_flags: 'array' }),
        ordered_fields:  Object.freeze(['execution_id', 'drift_score', 'classification']),
    }),
    CERTIFICATION_RESULT: Object.freeze({
        schema_version:  '1.0.0',
        required_fields: Object.freeze(['execution_id', 'status']),
        field_types:     Object.freeze({ execution_id: 'string', status: 'string', compatibility: 'string', confidence: 'number' }),
        ordered_fields:  Object.freeze(['execution_id', 'status', 'compatibility', 'confidence']),
    }),
    COVENANT_RESULT: Object.freeze({
        schema_version:  '1.0.0',
        required_fields: Object.freeze(['execution_id', 'status']),
        field_types:     Object.freeze({ execution_id: 'string', status: 'string', deployability: 'string', confidence: 'number' }),
        ordered_fields:  Object.freeze(['execution_id', 'status', 'deployability', 'confidence']),
    }),
    COHERENCE_RESULT: Object.freeze({
        schema_version:  '1.0.0',
        required_fields: Object.freeze(['execution_id', 'score']),
        field_types:     Object.freeze({ execution_id: 'string', score: 'number', coherence_status: 'string', break_detected: 'boolean' }),
        ordered_fields:  Object.freeze(['execution_id', 'score', 'coherence_status', 'break_detected']),
    }),
    EXECUTION_TRACE: Object.freeze({
        schema_version:  '1.0.0',
        required_fields: Object.freeze(['execution_id', 'status']),
        field_types:     Object.freeze({ execution_id: 'string', status: 'string', anomaly_count: 'number', governance_score: 'number', risk_classification: 'string' }),
        ordered_fields:  Object.freeze(['execution_id', 'status', 'governance_score', 'risk_classification']),
    }),
    TRACE_FINALISED: Object.freeze({
        schema_version:  '1.0.0',
        required_fields: Object.freeze(['execution_id', 'trace_hash']),
        field_types:     Object.freeze({ execution_id: 'string', trace_hash: 'string', event_count: 'number' }),
        ordered_fields:  Object.freeze(['execution_id', 'trace_hash', 'event_count']),
    }),
});

// ── get_schema ────────────────────────────────────────────────────────────────

function get_schema(event_type) {
    if (!event_type) return null;
    return _SCHEMAS[event_type] ?? null;
}

// ── validate_event ────────────────────────────────────────────────────────────

function validate_event(event) {
    try {
        if (!event?.event_type || event?.payload == null) {
            return Object.freeze({ valid: false, status: 'SCHEMA_INVALID', errors: Object.freeze(['missing_event_type_or_payload']), schema_version: null });
        }

        const schema = _SCHEMAS[event.event_type];
        if (!schema) {
            return Object.freeze({ valid: false, status: 'SCHEMA_MISMATCH', errors: Object.freeze([`unknown_event_type:${event.event_type}`]), schema_version: null });
        }

        const payload = event.payload;
        const errors  = [];

        // Required field presence
        for (const field of schema.required_fields) {
            if (payload[field] == null) errors.push(`missing_required:${field}`);
        }

        // Type checks — only for non-null values
        for (const [field, expectedType] of Object.entries(schema.field_types)) {
            const val = payload[field];
            if (val != null) {
                const actualType = Array.isArray(val) ? 'array' : typeof val;
                if (actualType !== expectedType) {
                    errors.push(`type_mismatch:${field}:expected_${expectedType}:got_${actualType}`);
                }
            }
        }

        if (errors.length > 0) {
            return Object.freeze({ valid: false, status: 'SCHEMA_MISMATCH', errors: Object.freeze(errors), schema_version: schema.schema_version });
        }

        return Object.freeze({ valid: true, status: 'VALID', errors: Object.freeze([]), schema_version: schema.schema_version });

    } catch (_) {
        return Object.freeze({ valid: false, status: 'SCHEMA_INVALID', errors: Object.freeze(['validation_exception']), schema_version: null });
    }
}

// ── compute_event_fingerprint ─────────────────────────────────────────────────
// Deterministic: sha256 over ordered_fields values only. Same fields → same hash.

function compute_event_fingerprint(event) {
    try {
        const schema = _SCHEMAS[event?.event_type];
        if (!schema || !event?.payload) return null;

        const raw = event.event_type + ':' +
            schema.ordered_fields
                .map(f => `${f}=${JSON.stringify(event.payload[f] ?? null)}`)
                .join('|');

        return 'efp-' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 24);

    } catch (_) {
        return null;
    }
}

module.exports = { validate_event, get_schema, compute_event_fingerprint, REGISTRY_VERSION };
