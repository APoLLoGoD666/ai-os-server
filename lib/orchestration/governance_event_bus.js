'use strict';

// Governance Event Bus V3 — Schema-Validated, Broker-Aware, Normalized FIFO Dispatcher
// Pipeline: validate → fingerprint → lineage → broker_tag → normalize → append → store → dispatch → broker(async)
// Never throws. Broker failure never affects local log integrity.

const crypto         = require('crypto');
const os             = require('os');
const schemaRegistry = require('./governance_event_schema_registry');
const unifiedModel   = require('./governance_event_unified_model');

const _selfNodeId   = process.env.APEX_NODE_ID ?? os.hostname() ?? 'apex-node-0';

const _subscribers  = new Map();  // event_type → handler[]
const _log          = [];         // append-only
const _finalised    = new Map();  // execution_id → trace_hash (idempotent finalisation)
const _lineageChain = new Map();  // execution_id → last lineage hash

const _MAP_CAP = 1000;
function _capMap(m) { if (m.size > _MAP_CAP) m.delete(m.keys().next().value); }

// ── Lineage ───────────────────────────────────────────────────────────────────
// sha256(exec_id:prev_lineage:fingerprint) per execution_id chain. Prefix 'lin-'.

function _computeLineageId(execution_id, fingerprint) {
    try {
        if (!execution_id) return null;
        const prev = _lineageChain.get(execution_id) ?? 'genesis';
        const raw  = `${execution_id}:${prev}:${fingerprint ?? ''}`;
        const hash = 'lin-' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 20);
        _lineageChain.set(execution_id, hash);
        _capMap(_lineageChain);
        return hash;
    } catch (_) {
        return null;
    }
}

// ── Emit ──────────────────────────────────────────────────────────────────────
// Pipeline: validate → fingerprint → broker_status → append → store → dispatch
//           → broker.publish (async fire-and-forget, never blocks local flow)
// Invalid events: still appended, marked schema_status=INVALID, never blocked.

function emit(event_type, payload) {
    if (!event_type) return;

    // Stage 1: Schema validation + fingerprint
    let schemaStatus  = 'UNKNOWN';
    let schemaVersion = null;
    let fingerprint   = null;
    try {
        const tempEvent  = { event_type, payload: payload ?? {} };
        const validation = schemaRegistry.validate_event(tempEvent);
        schemaStatus     = validation.valid ? 'VALID' : (validation.status ?? 'INVALID');
        schemaVersion    = validation.schema_version ?? null;
        fingerprint      = schemaRegistry.compute_event_fingerprint(tempEvent);
    } catch (_) {
        schemaStatus = 'SCHEMA_CHECK_FAILED';
    }

    // Stage 2: Determine broker_status from backend type (fast, no I/O)
    let brokerStatus = 'LOCAL_ONLY';
    try {
        const broker = require('./governance_event_broker');
        brokerStatus = broker.get_backend_name() === 'LOCAL_ONLY' ? 'LOCAL_ONLY' : 'BROKERED';
    } catch (_) {
        brokerStatus = 'BROKER_FAILED';
    }

    // Stage 2b: Lineage + node_id + correlation_tags
    const execId          = (payload ?? {}).execution_id ?? null;
    const event_lineage_id = _computeLineageId(execId, fingerprint);
    const correlation_tags = [];
    if (execId)       correlation_tags.push(`exec:${execId}`);
    correlation_tags.push(`node:${_selfNodeId}`);
    if (schemaStatus !== 'VALID' && schemaStatus !== 'UNKNOWN') {
        correlation_tags.push(`schema:${schemaStatus}`);
    }

    // Stage 3a: Build pre-freeze entry for normalization pass
    const _preEntry = {
        event_type,
        payload:          payload ?? {},
        emitted_at:       new Date().toISOString(),
        seq:              _log.length,
        schema_status:    schemaStatus,
        schema_version:   schemaVersion,
        fingerprint,
        broker_status:    brokerStatus,
        node_id:          _selfNodeId,
        event_lineage_id,
        correlation_tags,
        source_layer:     'BUS',
    };

    // Stage 3b: Normalization pass — safe, never throws, never blocks
    let _normalized_event = null;
    try { _normalized_event = unifiedModel.normalize_event_safe(_preEntry); } catch (_) {}

    const entry = Object.freeze({
        event_type:       _preEntry.event_type,
        payload:          Object.freeze(_preEntry.payload),
        emitted_at:       _preEntry.emitted_at,
        seq:              _preEntry.seq,
        schema_status:    _preEntry.schema_status,
        schema_version:   _preEntry.schema_version,
        fingerprint:      _preEntry.fingerprint,
        broker_status:    _preEntry.broker_status,
        node_id:          _preEntry.node_id,
        event_lineage_id: _preEntry.event_lineage_id,
        correlation_tags: Object.freeze(_preEntry.correlation_tags),
        _normalized_event: _normalized_event ? Object.freeze(_normalized_event) : null,
    });

    // Stage 5: Append to in-memory log + persistent store
    _log.push(entry);
    try { require('./governance_event_store').append_event(entry); } catch (_) {}

    // Stage 6: Dispatch to local subscribers
    const handlers = _subscribers.get(event_type) ?? [];
    for (const fn of handlers) {
        try { fn(entry); } catch (_) {}
    }

    // Stage 7: Broker publish — async fire-and-forget, never blocks local flow
    setImmediate(() => {
        try { require('./governance_event_broker').publish(entry); } catch (_) {}
    });
}

// ── Subscribe ─────────────────────────────────────────────────────────────────

function subscribe(event_type, handler) {
    if (!event_type || typeof handler !== 'function') return;
    if (!_subscribers.has(event_type)) _subscribers.set(event_type, []);
    _subscribers.get(event_type).push(handler);
}

// ── Replay ────────────────────────────────────────────────────────────────────
// Re-fires historical entries through current subscribers. Read-only — does NOT
// append to the log a second time.

function replay(entries) {
    const list = Array.isArray(entries) ? entries : _log;
    for (const entry of list) {
        const handlers = _subscribers.get(entry.event_type) ?? [];
        for (const fn of handlers) {
            try { fn(entry); } catch (_) {}
        }
    }
}

// ── Read log ──────────────────────────────────────────────────────────────────

function get_log(event_type) {
    if (!event_type) return Object.freeze([..._log]);
    return Object.freeze(_log.filter(e => e.event_type === event_type));
}

// ── Finalize execution trace ───────────────────────────────────────────────────
// Locks event sequence for execution_id. Hashes all events associated with it.
// Emits TRACE_FINALISED. Idempotent — second call returns cached hash immediately.

function finalize_execution_trace(execution_id) {
    if (!execution_id) return null;
    if (_finalised.has(execution_id)) return _finalised.get(execution_id);

    try {
        // Collect all events referencing this execution_id in emission order
        const execEvents = _log.filter(e => e.payload?.execution_id === execution_id);

        // Deterministic hash: sha256(seq:event_type per event joined, + execution_id)
        const raw        = execEvents.map(e => `${e.seq}:${e.event_type}`).join('|') + ':' + execution_id;
        const traceHash  = 'tfh-' + crypto.createHash('sha256').update(raw).digest('hex');

        _finalised.set(execution_id, traceHash);
        _capMap(_finalised);

        emit('TRACE_FINALISED', {
            execution_id,
            trace_hash:  traceHash,
            event_count: execEvents.length,
        });

        return traceHash;
    } catch (_) {
        return null;
    }
}

module.exports = { emit, subscribe, replay, get_log, finalize_execution_trace };
