'use strict';
// lib/runtime/compensation-log.js
// Immutable append-only log of compensation markers per transaction.
// A compensation marker is traceable evidence of why a transaction failed or what
// side-effects occurred that need to be acknowledged — not a rollback mechanism.
// Append-only: markers are never modified or deleted within a process lifetime.

const TYPES = Object.freeze({
    PREFLIGHT_FAILED:     'PREFLIGHT_FAILED',
    STAGE_FAILED:         'STAGE_FAILED',
    CONCURRENCY_DENIED:   'CONCURRENCY_DENIED',
    CONSTITUTION_BLOCKED: 'CONSTITUTION_BLOCKED',
    INVARIANT_VIOLATION:  'INVARIANT_VIOLATION',
    EXECUTION_ERROR:      'EXECUTION_ERROR',
    SLOT_EXPIRED:         'SLOT_EXPIRED',
    MEMORY_VERIFY_FAILED: 'MEMORY_VERIFY_FAILED',
    ABORT_REQUESTED:      'ABORT_REQUESTED',
});

const _VALID_TYPES = new Set(Object.values(TYPES));

// Map<txId, CompensationEvent[]> — append-only per txId
const _log = new Map();
let _seq   = 0;

function _nextId() {
    _seq++;
    return `COMP-${String(_seq).padStart(6, '0')}`;
}

// Record a compensation marker. Returns the generated marker id.
function record(txId, type, stage, reason, context = {}) {
    if (!txId)                      throw new Error('txId required');
    if (!type)                      throw new Error('type required');
    if (!stage)                     throw new Error('stage required');
    if (!_VALID_TYPES.has(type))    throw new Error(`Unknown compensation type: ${type}`);

    const event = Object.freeze({
        id:         _nextId(),
        txId:       String(txId),
        type,
        stage:      String(stage),
        reason:     String(reason || ''),
        context:    Object.freeze({ ...context }),
        seq:        _seq,
        recordedAt: new Date().toISOString(),
    });

    if (!_log.has(txId)) _log.set(txId, []);
    _log.get(txId).push(event);

    return event.id;
}

// Returns a frozen copy of all compensation events for txId.
function getByTx(txId) {
    return Object.freeze([...(_log.get(txId) || [])]);
}

function hasCompensations(txId) {
    return (_log.get(txId) || []).length > 0;
}

function count(txId) {
    return (_log.get(txId) || []).length;
}

// Summary stats across all transactions — for observability.
function stats() {
    const byType = {};
    let total = 0;
    for (const events of _log.values()) {
        for (const e of events) {
            byType[e.type] = (byType[e.type] || 0) + 1;
            total++;
        }
    }
    return { total, byType, txCount: _log.size };
}

function _reset() {
    _log.clear();
    _seq = 0;
}

module.exports = { TYPES, record, getByTx, hasCompensations, count, stats, _reset };
