'use strict';

// Governance Event Bus V1 — Synchronous FIFO Event Dispatcher
// Single-process, in-memory, append-only event log.
// Never throws. No async. No network. No DB writes.

const crypto = require('crypto');

const _subscribers = new Map();  // event_type → handler[]
const _log         = [];         // append-only
const _finalised   = new Map();  // execution_id → trace_hash (idempotent finalisation)

// ── Emit ──────────────────────────────────────────────────────────────────────

function emit(event_type, payload) {
    if (!event_type) return;

    const entry = Object.freeze({
        event_type,
        payload:    Object.freeze(payload ?? {}),
        emitted_at: new Date().toISOString(),
        seq:        _log.length,
    });

    _log.push(entry);

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
