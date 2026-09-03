'use strict';
// lib/runtime/execution-evaluator.js
// Execution evaluation — passive observational layer over finalized transaction outcomes.
//
// PURE OBSERVABILITY. NOT enforcement. NOT execution. NOT authority.
//
// No imports. No writes. Memory only.
//
// Exports ONLY:
//   recordOutcome(tx)           → void  (append-only rolling window)
//   evaluate()                  → frozen evaluation snapshot
//   evaluateAgainst(snapshot)   → frozen delta comparison
//   reset()                     → void  (clears rolling window)
//   getEvaluationSnapshot()     → frozen snapshot of stored records

const MAX_RECORDS       = 10000;
const EVALUATOR_VERSION = '1.0.0';

// ── Rolling window (append-only, frozen records) ──────────────────────────────

const _records = [];

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

// ── Record extraction ─────────────────────────────────────────────────────────

function _extractRecord(tx) {
    if (!tx || typeof tx !== 'object') return null;
    return _deepFreeze({
        txId:                  tx.txId              ?? tx.id          ?? null,
        transactionType:       tx.transactionType   ?? tx.type        ?? null,
        startedAt:             tx.startedAt                           ?? null,
        durationMs:            typeof tx.durationMs          === 'number'  ? tx.durationMs          : null,
        constitutionVerdict:   tx.constitutionVerdict                      ?? null,
        founderScore:          typeof tx.founderScore         === 'number'  ? tx.founderScore         : null,
        twinScore:             typeof tx.twinScore            === 'number'  ? tx.twinScore            : null,
        finalDecisionScore:    typeof tx.finalDecisionScore   === 'number'  ? tx.finalDecisionScore   : null,
        outcomeSuccess:        typeof tx.outcomeSuccess       === 'boolean' ? tx.outcomeSuccess       : null,
        outcomeCategory:       tx.outcomeCategory                          ?? null,
        compensationTriggered: typeof tx.compensationTriggered === 'boolean' ? tx.compensationTriggered : false,
        rollbackTriggered:     typeof tx.rollbackTriggered     === 'boolean' ? tx.rollbackTriggered     : false,
        executionStatus:       tx.executionStatus                          ?? null,
    });
}

// ── Metric helpers ────────────────────────────────────────────────────────────

function _rate(records, predicate) {
    if (records.length === 0) return null;
    return parseFloat((records.filter(predicate).length / records.length).toFixed(6));
}

function _avg(vals) {
    const nums = vals.filter(v => typeof v === 'number' && !isNaN(v));
    if (nums.length === 0) return null;
    return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4));
}

// decisionAgreement: 1 - (mean stddev of [founderScore, twinScore, finalDecisionScore]).
// Normalized by max possible stddev for [0,1] scores (≈ 0.4714). Result in [0, 1].
function _decisionAgreement(records) {
    const rs = records.filter(r =>
        typeof r.founderScore      === 'number' &&
        typeof r.twinScore         === 'number' &&
        typeof r.finalDecisionScore === 'number'
    );
    if (rs.length === 0) return null;
    let totalStddev = 0;
    for (const r of rs) {
        const mean = (r.founderScore + r.twinScore + r.finalDecisionScore) / 3;
        const v    = ((r.founderScore - mean) ** 2 + (r.twinScore - mean) ** 2 + (r.finalDecisionScore - mean) ** 2) / 3;
        totalStddev += Math.sqrt(v);
    }
    const agreement = Math.max(0, Math.min(1, 1 - (totalStddev / rs.length) / 0.4714));
    return parseFloat(agreement.toFixed(6));
}

// constitutionOverrideRate: fraction of records with a non-null verdict that is not 'pass'/'approved'.
function _constitutionOverrideRate(records) {
    const withVerdict = records.filter(r => r.constitutionVerdict !== null);
    if (withVerdict.length === 0) return null;
    const overrides = withVerdict.filter(r =>
        r.constitutionVerdict !== 'pass' && r.constitutionVerdict !== 'approved'
    );
    return parseFloat((overrides.length / withVerdict.length).toFixed(6));
}

// executionStability: 1 - coefficient_of_variation(durationMs), clamped to [0, 1].
function _executionStability(records) {
    const ds = records.map(r => r.durationMs).filter(v => typeof v === 'number' && v >= 0);
    if (ds.length < 2) return null;
    const mean = ds.reduce((a, b) => a + b, 0) / ds.length;
    if (mean === 0) return 1;
    const variance = ds.reduce((sum, d) => sum + (d - mean) ** 2, 0) / ds.length;
    return parseFloat(Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / mean)).toFixed(6));
}

// driftIndicator: successRate(newest 20%) - successRate(oldest 20%). Null if < 10 records.
function _driftIndicator(records) {
    if (records.length < 10) return null;
    const w     = Math.max(1, Math.floor(records.length * 0.2));
    const early = records.slice(0, w).filter(r => r.outcomeSuccess !== null);
    const late  = records.slice(records.length - w).filter(r => r.outcomeSuccess !== null);
    const r0    = _rate(early, r => r.outcomeSuccess === true);
    const r1    = _rate(late,  r => r.outcomeSuccess === true);
    if (r0 === null || r1 === null) return null;
    return parseFloat((r1 - r0).toFixed(6));
}

// ── Public API ─────────────────────────────────────────────────────────────────

function recordOutcome(tx) {
    const record = _extractRecord(tx);
    if (!record) return;
    if (_records.length >= MAX_RECORDS) _records.shift();
    _records.push(record);
}

function evaluate() {
    const rs          = _records.slice();
    const withSuccess = rs.filter(r => r.outcomeSuccess !== null);
    return _deepFreeze({
        sampleSize:               rs.length,
        successRate:              _rate(withSuccess, r => r.outcomeSuccess === true),
        rollbackRate:             _rate(rs, r => r.rollbackTriggered === true),
        compensationRate:         _rate(rs, r => r.compensationTriggered === true),
        avgDuration:              _avg(rs.map(r => r.durationMs)),
        decisionAgreement:        _decisionAgreement(rs),
        constitutionOverrideRate: _constitutionOverrideRate(rs),
        executionStability:       _executionStability(rs),
        driftIndicator:           _driftIndicator(rs),
        generatedAt:              null,
        deterministic:            true,
        descriptiveOnly:          true,
    });
}

function evaluateAgainst(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
        return _deepFreeze({
            improved:           null,
            regressionDetected: null,
            deltaSuccess:       null,
            deltaRollback:      null,
            deltaLatency:       null,
            deltaAgreement:     null,
            deterministic:      true,
        });
    }
    const cur = evaluate();
    const ds  = cur.successRate       !== null && snapshot.successRate       !== null
        ? parseFloat((cur.successRate       - snapshot.successRate).toFixed(6))       : null;
    const dr  = cur.rollbackRate      !== null && snapshot.rollbackRate      !== null
        ? parseFloat((cur.rollbackRate      - snapshot.rollbackRate).toFixed(6))      : null;
    const dl  = cur.avgDuration       !== null && snapshot.avgDuration       !== null
        ? parseFloat((cur.avgDuration       - snapshot.avgDuration).toFixed(4))       : null;
    const da  = cur.decisionAgreement !== null && snapshot.decisionAgreement !== null
        ? parseFloat((cur.decisionAgreement - snapshot.decisionAgreement).toFixed(6)) : null;
    return _deepFreeze({
        improved:           ds !== null && dr !== null ? (ds > 0 && dr <= 0)                             : null,
        regressionDetected: ds !== null               ? (ds < 0 || (dr !== null && dr > 0))              : null,
        deltaSuccess:       ds,
        deltaRollback:      dr,
        deltaLatency:       dl,
        deltaAgreement:     da,
        deterministic:      true,
    });
}

function reset() {
    _records.length = 0;
}

function getEvaluationSnapshot() {
    return _deepFreeze({
        version:       EVALUATOR_VERSION,
        recordCount:   _records.length,
        records:       _records.map(r => Object.freeze({ ...r })),
        snapshotAt:    null,
        deterministic: true,
    });
}

module.exports = { recordOutcome, evaluate, evaluateAgainst, reset, getEvaluationSnapshot };
