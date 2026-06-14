'use strict';

// Governance Event Unified Model V1 — Canonical Cross-Layer Event Normalizer
// Normalizes raw events from bus, store, broker, or adapter into UnifiedGovernanceEvent.
// Null-fills missing fields. Deterministic. Read-only. Never throws.

// ── normalize ─────────────────────────────────────────────────────────────────

function normalize(raw_event) {
    if (!raw_event || typeof raw_event !== 'object') {
        return Object.freeze({ status: 'UNIFIED_EVENT_INCOMPLETE', reason: 'invalid_input' });
    }

    const event_type = raw_event.event_type ?? null;
    if (!event_type) {
        return Object.freeze({ status: 'UNIFIED_EVENT_INCOMPLETE', reason: 'missing_event_type' });
    }

    try {
        const payload    = raw_event.payload ?? {};
        const execution_id = payload.execution_id ?? null;

        // Resolve node_id from multiple possible locations
        const node_id =
            raw_event.node_id                   ??
            raw_event.broker_meta?.node_id      ??
            payload._meta?.node_id              ??
            null;

        // Correlation tags: merge bus tags + synthesize from known fields
        const raw_tags        = Array.isArray(raw_event.correlation_tags) ? raw_event.correlation_tags : [];
        const synthetic_tags  = [];
        if (execution_id) synthetic_tags.push(`exec:${execution_id}`);
        if (node_id)      synthetic_tags.push(`node:${node_id}`);
        const schema_status   = raw_event.schema_status ?? null;
        if (schema_status && schema_status !== 'VALID' && schema_status !== 'UNKNOWN') {
            synthetic_tags.push(`schema:${schema_status}`);
        }
        const correlation_tags = Object.freeze([...new Set([...raw_tags, ...synthetic_tags])]);

        return Object.freeze({
            status:           'UNIFIED_EVENT_COMPLETE',
            event_type,
            execution_id,
            payload:          Object.freeze({ ...payload }),
            emitted_at:       raw_event.emitted_at       ?? null,
            seq:              raw_event.seq               ?? null,
            node_id,
            schema_status,
            schema_version:   raw_event.schema_version   ?? null,
            fingerprint:      raw_event.fingerprint      ?? null,
            broker_status:    raw_event.broker_status    ?? null,
            event_lineage_id: raw_event.event_lineage_id ?? null,
            correlation_tags,
            broker_meta:      raw_event.broker_meta      ? Object.freeze({ ...raw_event.broker_meta }) : null,
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
// A unified event is complete when all structural fields are non-null.

function is_complete(unified) {
    if (!unified || unified.status !== 'UNIFIED_EVENT_COMPLETE') return false;
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

module.exports = { normalize, normalize_batch, is_complete };
