'use strict';
// lib/runtime/concurrency-slot-manager.js
// In-memory concurrency slot manager with TTL-based expiry.
// Slot key = method:path:userId — prevents double-submission of identical operations.
// Slots expire automatically after SLOT_TTL_MS to recover from abandoned transactions.
// All operations are synchronous; Map is single-threaded in Node.js.

const SLOT_TTL_MS    = 30_000;  // 30s — long enough for any request, short enough to recover
const MAX_ACTIVE     = 200;     // hard cap on concurrent slots

// Map<slotKey, { txId, slotKey, reservedAt, expiresAt }>
const _slots = new Map();

// Build a canonical slot key from request fields.
function deriveKey(method, path, userId) {
    const m = (method  || 'UNKNOWN').toUpperCase();
    const p = (path    || '/').replace(/\?.*$/, ''); // strip query string
    const u = (userId  || 'anon');
    return `${m}:${p}:${u}`;
}

// Remove expired slots. Called before every mutating operation.
function _prune() {
    const now = Date.now();
    for (const [key, slot] of _slots) {
        if (slot.expiresAt <= now) _slots.delete(key);
    }
}

// Reserve a slot for txId at slotKey.
// Returns { ok: true } or { ok: false, reason, existingTxId? }
function reserve(slotKey, txId) {
    if (!slotKey) return { ok: false, reason: 'INVALID_SLOT_KEY' };
    if (!txId)    return { ok: false, reason: 'INVALID_TX_ID' };

    _prune();

    if (_slots.size >= MAX_ACTIVE) {
        return { ok: false, reason: 'SLOT_CAPACITY_EXCEEDED' };
    }

    const existing = _slots.get(slotKey);
    if (existing && existing.expiresAt > Date.now()) {
        return { ok: false, reason: 'SLOT_OCCUPIED', existingTxId: existing.txId };
    }

    _slots.set(slotKey, {
        txId,
        slotKey,
        reservedAt: Date.now(),
        expiresAt:  Date.now() + SLOT_TTL_MS,
    });

    return { ok: true, slotKey };
}

// Release all slots held by txId. Returns { ok, released }.
function release(txId) {
    if (!txId) return { ok: false, released: 0 };
    let released = 0;
    for (const [key, slot] of _slots) {
        if (slot.txId === txId) {
            _slots.delete(key);
            released++;
        }
    }
    return { ok: true, released };
}

// Check whether a slot key is currently unoccupied (or expired).
function isFree(slotKey) {
    _prune();
    const s = _slots.get(slotKey);
    return !s || s.expiresAt <= Date.now();
}

// Return the txId currently holding this slot, or null.
function owner(slotKey) {
    _prune();
    const s = _slots.get(slotKey);
    return (s && s.expiresAt > Date.now()) ? s.txId : null;
}

function getStats() {
    _prune();
    return {
        activeSlots: _slots.size,
        maxSlots:    MAX_ACTIVE,
        slotTtlMs:   SLOT_TTL_MS,
    };
}

function _reset() {
    _slots.clear();
}

module.exports = {
    SLOT_TTL_MS,
    MAX_ACTIVE,
    deriveKey,
    reserve,
    release,
    isFree,
    owner,
    getStats,
    _reset,
};
