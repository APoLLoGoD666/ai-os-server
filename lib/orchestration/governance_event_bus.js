'use strict';

// Governance Event Bus V1 — Synchronous FIFO Event Dispatcher
// Single-process, in-memory, append-only event log.
// Never throws. No async. No network. No DB writes.

const crypto         = require('crypto');
const schemaRegistry = require('./governance_event_schema_registry');

const _subscribers = new Map();  // event_type → handler[]
const _log         = [];         // append-only
const _finalised   = new Map();  // execution_id → trace_hash (idempotent finalisation)

// ── Emit ──────────────────────────────────────────────────────────────────────
// Pipeline: validate → fingerprint → append → store → dispatch
// Invalid events: still appended, marked schema_status=INVALID, never blocked.

function emit(event_type, payload) {
    if (!event_type) return;

    // Schema validation + fingerprint (never throws, never blocks)
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

    const entry = Object.freeze({
        event_type,
        payload:        Object.freeze(payload ?? {}),
        emitted_at:     new Date().toISOString(),
        seq:            _log.length,
        schema_status:  schemaStatus,
        schema_version: schemaVersion,
        fingerprint,
    });

    _log.push(entry);

    // Mirror every event to persistent store — never blocks, never throws
    try { require('./governance_event_store').append_event(entry); } catch (_) {}

    const handlers = _subscribers.get(event_type) ?? [];
    for (const fn of handlers) {
        try { fn(entry); } catch (_) {}
    }
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
