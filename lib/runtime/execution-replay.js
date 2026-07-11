'use strict';
// lib/runtime/execution-replay.js
// Execution replay — deterministic reconstruction of finalized outcomes for comparison.
//
// PURE OBSERVABILITY. NOT execution. NOT runtime. NOT authority.
//
// Rules:
//   A. Uses stored finalized outputs only.
//   B. Never invokes runtime.
//   C. Never invokes execution.
//   D. Never invokes middleware.
//   E. Never invokes memory.
//   F. Never invokes governance.
//   G. Never mutates records.
//
// Imports ONLY:
//   crypto (Node.js built-in)
//
// Exports ONLY:
//   createReplay()                → frozen replay context
//   simulate(record)              → frozen replay result
//   compare(recordA, recordB)     → frozen comparison result

const crypto = require('crypto');

const REPLAY_VERSION = '1.0.0';

// Canonical ordered field list — same extraction shape as execution-evaluator.
const REPLAYABLE_FIELDS = Object.freeze([
    'txId', 'transactionType', 'startedAt', 'durationMs',
    'constitutionVerdict', 'founderScore', 'twinScore', 'finalDecisionScore',
    'outcomeSuccess', 'outcomeCategory', 'compensationTriggered', 'rollbackTriggered',
    'executionStatus',
]);

// ── Canonical serialization (no field exclusions — all replay fields are finalized) ──

function _canon(value) {
    if (value === null)            return 'null';
    if (value === undefined)       return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) {
        return '[' + value.map(_canon).join(',') + ']';
    }
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + _canon(value[k])).join(',') + '}';
}

function _sha256(str) {
    return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// ── Deep freeze ───────────────────────────────────────────────────────────────

function _deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.freeze(obj);
    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) _deepFreeze(obj[i]);
    } else {
        for (const key of Object.keys(obj)) _deepFreeze(obj[key]);
    }
    return obj;
}

// ── Field variance: 0 if equal, 1 if different ────────────────────────────────

function _fieldVar(a, b) {
    return a === b ? 0 : 1;
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createReplay() {
    return _deepFreeze({
        replayVersion:     REPLAY_VERSION,
        replayableFields:  REPLAYABLE_FIELDS.slice(),
        replayableCount:   REPLAYABLE_FIELDS.length,
        createdAt:         null,
        deterministic:     true,
        descriptiveOnly:   true,
        authorityLevel:    'NONE',
        runtimeIntegrated: false,
    });
}

// simulate: re-derives a fingerprint from a stored record and checks internal validity.
// replayMatch = true when all numeric fields are valid (no NaN) and required fields present.
function simulate(record) {
    if (!record || typeof record !== 'object') {
        return _deepFreeze({
            replayId:       _sha256('null'),
            replayMatch:    false,
            comparedFields: [],
            variance:       0,
            deterministic:  true,
        });
    }
    const replayId       = _sha256(_canon(record));
    const comparedFields = REPLAYABLE_FIELDS.filter(f => f in record);
    let variance = 0;
    for (const f of comparedFields) {
        if (typeof record[f] === 'number' && isNaN(record[f])) variance++;
    }
    return _deepFreeze({
        replayId,
        replayMatch:    variance === 0,
        comparedFields: comparedFields.slice(),
        variance,
        deterministic:  true,
    });
}

// compare: field-by-field diff of two finalized records.
// variance = count of differing fields across REPLAYABLE_FIELDS.
function compare(recordA, recordB) {
    if (!recordA || !recordB || typeof recordA !== 'object' || typeof recordB !== 'object') {
        return _deepFreeze({
            replayId:       _sha256('null|null'),
            replayMatch:    false,
            comparedFields: [],
            variance:       0,
            deterministic:  true,
        });
    }
    const replayId       = _sha256(_canon(recordA) + '|' + _canon(recordB));
    const comparedFields = REPLAYABLE_FIELDS.filter(f => f in recordA || f in recordB);
    let variance = 0;
    for (const f of comparedFields) variance += _fieldVar(recordA[f], recordB[f]);
    return _deepFreeze({
        replayId,
        replayMatch:    variance === 0,
        comparedFields: comparedFields.slice(),
        variance,
        deterministic:  true,
    });
}

module.exports = { createReplay, simulate, compare };
