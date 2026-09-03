'use strict';

// Governance Event Unified Model V2 — Canonical Cross-Layer Event Normalizer
// Normalizes raw events from bus, store, broker, or correlation into
// UnifiedGovernanceEvent with deterministic alphabetical field order.
// Never throws. Null-fills every missing field. Append-only. Read-only.

// ── Canonical field template (alphabetical key order) ─────────────────────────

const _EMPTY = Object.freeze({
    broker_status:        null,
    correlation_tags:     Object.freeze([]),
    emitted_at:           null,
    event_lineage_id:     null,
    event_type:           null,
    fingerprint:          null,
    node_id:              null,
    normalization_status: 'INCOMPLETE',
    payload:              Object.freeze({}),
    schema_status:        null,
    seq:                  null,
    source_layer:         null,
});

const _VALID_LAYERS = new Set(['BUS', 'STORE', 'BROKER', 'CORRELATION']);

// ── Source layer inference ────────────────────────────────────────────────────

function _inferSourceLayer(raw) {
    if (!raw) return 'BUS';
    if (_VALID_LAYERS.has(raw.source_layer)) return raw.source_layer;
    if (raw.broker_meta?.published_at)                          return 'BROKER';
    if (raw.seq != null && raw.event_lineage_id != null)        return 'BUS';
    if (raw.seq != null)                                        return 'STORE';
    if (raw.classification != null || raw.completeness_score != null) return 'CORRELATION';
    return 'BUS';
}

// ── _resolveFields ────────────────────────────────────────────────────────────
// Extracts and null-fills all UnifiedGovernanceEvent fields from any raw input.

function _resolveFields(raw) {
    const payload      = (raw.payload !== undefined && raw.payload !== null && typeof raw.payload === 'object')
        ? raw.payload : {};
    const execution_id = payload.execution_id ?? null;

    const node_id =
        raw.node_id                ??
        raw.broker_meta?.node_id   ??
        payload._meta?.node_id     ??
        null;

    const schema_status = raw.schema_status ?? null;

    const raw_tags       = Array.isArray(raw.correlation_tags) ? raw.correlation_tags : [];
    const synthetic_tags = [];
    if (execution_id) synthetic_tags.push(`exec:${execution_id}`);
    if (node_id)      synthetic_tags.push(`node:${node_id}`);
    if (schema_status && schema_status !== 'VALID' && schema_status !== 'UNKNOWN') {
        synthetic_tags.push(`schema:${schema_status}`);
    }

    return {
        broker_status:    raw.broker_status    ?? null,
        correlation_tags: Object.freeze([...new Set([...raw_tags, ...synthetic_tags])]),
        emitted_at:       raw.emitted_at       ?? null,
        event_lineage_id: raw.event_lineage_id ?? null,
        event_type:       raw.event_type       ?? null,
        fingerprint:      raw.fingerprint      ?? null,
        node_id,
        payload:          Object.freeze({ ...payload }),
        schema_status,
        seq:              (typeof raw.seq === 'number') ? raw.seq : null,
        source_layer:     _inferSourceLayer(raw),
    };
}

// ── _isNormalizationComplete ──────────────────────────────────────────────────

function _isNormalizationComplete(fields) {
    return (
        fields.event_type    !== null &&
        fields.emitted_at    !== null &&
        fields.fingerprint   !== null &&
        fields.schema_status !== null &&
        fields.broker_status !== null &&
        fields.node_id       !== null &&
        fields.source_layer  !== null
    );
}

// ── normalize_event_strict ────────────────────────────────────────────────────
// Full normalization with strict completeness tracking.
// Returns UNIFIED_EVENT_INCOMPLETE status when event_type is null.
// Never throws.

function normalize_event_strict(raw_event) {
    if (!raw_event || typeof raw_event !== 'object' || Array.isArray(raw_event)) {
        return Object.freeze({
            ..._EMPTY,
            normalization_status: 'INCOMPLETE',
            _reason: 'invalid_input',
        });
    }
    try {
        if (!raw_event.event_type) {
            return Object.freeze({
                ..._EMPTY,
                normalization_status: 'INCOMPLETE',
                _reason: 'missing_event_type',
            });
        }

        const fields   = _resolveFields(raw_event);
        const complete = _isNormalizationComplete(fields);

        // Strict: validate schema_status is one of the allowed values
        const VALID_STATUSES = new Set(['VALID', 'INVALID', 'UNKNOWN', 'SCHEMA_MISMATCH']);
        const effectiveSchemaStatus = VALID_STATUSES.has(fields.schema_status)
            ? fields.schema_status
            : (fields.schema_status != null ? 'SCHEMA_MISMATCH' : null);

        return Object.freeze({
            broker_status:        fields.broker_status,
            correlation_tags:     fields.correlation_tags,
            emitted_at:           fields.emitted_at,
            event_lineage_id:     fields.event_lineage_id,
            event_type:           fields.event_type,
            fingerprint:          fields.fingerprint,
            node_id:              fields.node_id,
            normalization_status: complete ? 'COMPLETE' : 'INCOMPLETE',
            payload:              fields.payload,
            schema_status:        effectiveSchemaStatus,
            seq:                  fields.seq,
            source_layer:         fields.source_layer,
        });

    } catch (_) {
        return Object.freeze({ ..._EMPTY, normalization_status: 'INCOMPLETE', _reason: 'strict_normalize_error' });
    }
}

// ── normalize_event_safe ──────────────────────────────────────────────────────
// Maximally defensive normalization. Bacfills to null at every possible failure
// point. Returns a valid-shaped object regardless of input pathology.
// Never throws. Wraps every field access in try/catch.

function normalize_event_safe(raw_event) {
    try {
        if (!raw_event || typeof raw_event !== 'object' || Array.isArray(raw_event)) {
            return Object.freeze({ ..._EMPTY });
        }

        let event_type    = null;
        let broker_status = null;
        let emitted_at    = null;
        let event_lineage_id = null;
        let fingerprint   = null;
        let node_id       = null;
        let schema_status = null;
        let seq           = null;
        let source_layer  = 'BUS';
        let payload       = Object.freeze({});
        let correlation_tags = Object.freeze([]);

        try { event_type    = raw_event.event_type    ?? null; }           catch (_) {}
        try { broker_status = raw_event.broker_status ?? null; }           catch (_) {}
        try { emitted_at    = raw_event.emitted_at    ?? null; }           catch (_) {}
        try { event_lineage_id = raw_event.event_lineage_id ?? null; }     catch (_) {}
        try { fingerprint   = raw_event.fingerprint   ?? null; }           catch (_) {}
        try { schema_status = raw_event.schema_status ?? null; }           catch (_) {}
        try { seq = (typeof raw_event.seq === 'number') ? raw_event.seq : null; } catch (_) {}
        try { source_layer  = _inferSourceLayer(raw_event); }              catch (_) {}

        try {
            const p = raw_event.payload;
            payload = (p && typeof p === 'object' && !Array.isArray(p))
                ? Object.freeze({ ...p }) : Object.freeze({});
        } catch (_) {}

        try {
            node_id =
                raw_event.node_id           ??
                raw_event.broker_meta?.node_id ??
                raw_event.payload?._meta?.node_id ?? null;
        } catch (_) {}

        try {
            const existing = Array.isArray(raw_event.correlation_tags) ? raw_event.correlation_tags : [];
            const extra    = [];
            try { if (payload.execution_id) extra.push(`exec:${payload.execution_id}`); } catch (_) {}
            try { if (node_id) extra.push(`node:${node_id}`); } catch (_) {}
            try {
                if (schema_status && schema_status !== 'VALID' && schema_status !== 'UNKNOWN') {
                    extra.push(`schema:${schema_status}`);
                }
            } catch (_) {}
            correlation_tags = Object.freeze([...new Set([...existing, ...extra])]);
        } catch (_) {}

        const complete = event_type !== null && emitted_at !== null &&
                         fingerprint !== null && schema_status !== null &&
                         broker_status !== null && node_id !== null;

        return Object.freeze({
            broker_status,
            correlation_tags,
            emitted_at,
            event_lineage_id,
            event_type,
            fingerprint,
            node_id,
            normalization_status: complete ? 'COMPLETE' : 'INCOMPLETE',
            payload,
            schema_status,
            seq,
            source_layer,
        });

    } catch (_) {
        return Object.freeze({ ..._EMPTY });
    }
}

// ── backfill_missing_fields ───────────────────────────────────────────────────
// Takes any partial event and returns a new object with all UnifiedGovernanceEvent
// fields explicitly present (null for missing scalars, [] for missing arrays).

function backfill_missing_fields(event) {
    try {
        const base   = (event && typeof event === 'object' && !Array.isArray(event)) ? event : {};
        const filled = normalize_event_safe(base);
        return filled;
    } catch (_) {
        return Object.freeze({ ..._EMPTY });
    }
}

// ── normalize (backward-compat V1 API) ───────────────────────────────────────

function normalize(raw_event) {
    if (!raw_event || typeof raw_event !== 'object') {
        return Object.freeze({ status: 'UNIFIED_EVENT_INCOMPLETE', reason: 'invalid_input' });
    }
    const event_type = raw_event.event_type ?? null;
    if (!event_type) {
        return Object.freeze({ status: 'UNIFIED_EVENT_INCOMPLETE', reason: 'missing_event_type' });
    }
    try {
        const u = normalize_event_strict(raw_event);
        return Object.freeze({
            status:           'UNIFIED_EVENT_COMPLETE',
            event_type:       u.event_type,
            execution_id:     u.payload?.execution_id ?? null,
            payload:          u.payload,
            emitted_at:       u.emitted_at,
            seq:              u.seq,
            node_id:          u.node_id,
            schema_status:    u.schema_status,
            schema_version:   raw_event.schema_version ?? null,
            fingerprint:      u.fingerprint,
            broker_status:    u.broker_status,
            event_lineage_id: u.event_lineage_id,
            correlation_tags: u.correlation_tags,
            broker_meta:      raw_event.broker_meta ? Object.freeze({ ...raw_event.broker_meta }) : null,
            source_layer:     u.source_layer,
        });
    } catch (_) {
        return Object.freeze({ status: 'UNIFIED_EVENT_INCOMPLETE', reason: 'normalize_error', event_type });
    }
}

// ── normalize_batch ───────────────────────────────────────────────────────────

function normalize_batch(events) {
    if (!Array.isArray(events)) return Object.freeze([]);
    return Object.freeze(events.map(normalize));
}

// ── is_complete ───────────────────────────────────────────────────────────────

function is_complete(unified) {
    if (!unified) return false;
    // V2 unified events use normalization_status
    if (unified.normalization_status !== undefined) return unified.normalization_status === 'COMPLETE';
    // V1 compat
    if (unified.status !== 'UNIFIED_EVENT_COMPLETE') return false;
    return (
        unified.event_type    !== null &&
        unified.execution_id  !== null &&
        unified.emitted_at    !== null &&
        unified.node_id       !== null &&
        unified.fingerprint   !== null &&
        unified.schema_status !== null &&
        unified.broker_status !== null
    );
}

module.exports = {
    normalize,
    normalize_batch,
    normalize_event_strict,
    normalize_event_safe,
    backfill_missing_fields,
    is_complete,
};
