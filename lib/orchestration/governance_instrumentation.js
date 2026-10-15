'use strict';

// Governance Instrumentation V1 — Execution Lifecycle Event Emitter
// Wraps execution entry points with standardised start/end/error events.
// Fire-and-forget. Never throws. Never blocks execution path.

const crypto = require('crypto');
const bus    = require('./governance_event_bus');

function _genId() {
    return 'gi-' + crypto.randomBytes(8).toString('hex');
}

// ── Point emitters ────────────────────────────────────────────────────────────

function emitStart(execution_id, task_type, metadata) {
    try {
        bus.emit('EXECUTION_START', {
            execution_id: execution_id ?? _genId(),
            task_type:    task_type    ?? 'UNKNOWN',
            metadata:     Object.freeze(metadata ?? {}),
        });
    } catch (_) {}
}

function emitEnd(execution_id, status, metadata) {
    try {
        bus.emit('EXECUTION_END', {
            execution_id: execution_id ?? null,
            status:       status       ?? 'UNKNOWN',
            metadata:     Object.freeze(metadata ?? {}),
        });
    } catch (_) {}
}

function emitError(execution_id, error, metadata) {
    try {
        bus.emit('EXECUTION_ERROR', {
            execution_id:  execution_id   ?? null,
            error_message: error?.message ?? String(error ?? 'UNKNOWN'),
            metadata:      Object.freeze(metadata ?? {}),
        });
    } catch (_) {}
}

// ── Wrapper ───────────────────────────────────────────────────────────────────
// wrapExecution(fn, metadata) — runs fn, emits lifecycle events around it.
// Re-throws errors so calling code is unaffected. Advisory only.

async function wrapExecution(fn, metadata) {
    const execId = metadata?.execution_id ?? _genId();
    emitStart(execId, metadata?.task_type ?? 'WRAPPED', metadata);
    try {
        const result = await fn();
        emitEnd(execId, result?.status ?? 'completed', metadata);
        return result;
    } catch (err) {
        emitError(execId, err, metadata);
        throw err;
    }
}

module.exports = { emitStart, emitEnd, emitError, wrapExecution };
