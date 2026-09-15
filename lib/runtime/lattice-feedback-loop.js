'use strict';
// lib/runtime/lattice-feedback-loop.js
// Append-only feedback ingestion — feeds finalized PETL transaction outcomes
// back into observable drift metrics for FM + DT calibration.
//
// Called synchronously from finalize() — no latency impact on request path.
// In-memory store; no database requirement. Capped at MAX_RECORDS.
//
// Computed per record:
//   driftDelta    = |founderAlignmentScore - digitalTwinPrediction|
//                   Measures internal disagreement between FM and DT.
//   decisionError = |finalDecisionScore - actualStability|
//                   Measures how well the composite prediction matched reality.
//
// These values feed the SYSTEM_COHERENCE invariant and provide the raw signal
// for future weight recalibration of W_FM / W_DT / W_RISK in decision-lattice.js.

const MAX_RECORDS = 10_000;

const _records = [];
let   _seq     = 0;

// record(tx) — synchronous; call at end of finalize().
// Returns the feedback record id, or null if tx is absent.
function record(tx) {
    if (!tx || !tx.txId) return null;

    const lattice  = tx.latticeDecision;
    const outcome  = _extractOutcome(tx);
    const id       = `FB-${Date.now()}-${String(++_seq).padStart(5, '0')}`;

    let fb;
    if (!lattice) {
        // Transaction did not pass through beginWithLattice (e.g., direct begin() in tests).
        // Record a minimal stub for full traceability.
        fb = Object.freeze({
            id,
            txId:                  tx.txId,
            driftDelta:            null,
            decisionError:         null,
            constitutionVerdict:   null,
            founderAlignmentScore: null,
            digitalTwinPrediction: null,
            finalDecisionScore:    null,
            outcome,
            noLattice:             true,
            timestamp:             new Date().toISOString(),
        });
    } else {
        const fm        = lattice.founderAlignmentScore;
        const dt        = lattice.digitalTwinPrediction;
        const predicted = lattice.finalDecisionScore;

        // driftDelta: how far FM and DT disagree with each other.
        // Range 0–1. Zero means perfect internal alignment.
        const driftDelta = (fm !== null && fm !== undefined && dt !== null && dt !== undefined)
            ? Number(Math.abs(fm - dt).toFixed(4))
            : null;

        // decisionError: distance between predicted stability and actual outcome.
        // actualStability is 1.0 (success) or 0.0 (failure).
        // Range 0–1. Zero means the lattice perfectly predicted the outcome.
        const actualStability = outcome.success ? 1.0 : 0.0;
        const decisionError   = (predicted !== null && predicted !== undefined)
            ? Number(Math.abs(predicted - actualStability).toFixed(4))
            : null;

        fb = Object.freeze({
            id,
            txId:                  tx.txId,
            driftDelta,
            decisionError,
            constitutionVerdict:   lattice.constitutionVerdict,
            founderAlignmentScore: fm,
            digitalTwinPrediction: dt,
            finalDecisionScore:    predicted,
            outcome,
            timestamp:             new Date().toISOString(),
        });
    }

    _records.push(fb);
    if (_records.length > MAX_RECORDS) _records.shift();

    return id;
}

// _extractOutcome — derive success/failure from finalized tx
function _extractOutcome(tx) {
    const statusCode     = tx.result?.statusCode ?? null;
    const criticalFailed = tx.invariantReport?.criticalFailed ?? 0;
    const compensations  = tx.compensations?.length ?? 0;

    const httpSuccess = statusCode !== null
        ? (statusCode >= 200 && statusCode < 400)
        : true;   // no status recorded → assume success (e.g., non-HTTP context)

    const success = httpSuccess && criticalFailed === 0;

    return { success, statusCode, criticalFailed, compensations };
}

// ── Query API ──────────────────────────────────────────────────────────────────

// getAll() → snapshot of all records (already frozen)
function getAll() { return _records.slice(); }

// getLast(n) → last n records
function getLast(n = 100) { return _records.slice(-n); }

// getStats() → aggregate drift and calibration metrics
function getStats() {
    const total = _records.length;
    if (!total) return { total: 0, withLattice: 0 };

    const withLattice = _records.filter(r => r.driftDelta !== null);
    const n = withLattice.length;
    if (!n) return { total, withLattice: 0 };

    const avgDriftDelta    = withLattice.reduce((s, r) => s + r.driftDelta, 0) / n;
    const avgDecisionError = withLattice.reduce((s, r) => s + r.decisionError, 0) / n;
    const highDriftCount   = withLattice.filter(r => r.driftDelta > 0.30).length;
    const failureCount     = withLattice.filter(r => !r.outcome.success).length;

    return {
        total,
        withLattice:        n,
        avgDriftDelta:      Number(avgDriftDelta.toFixed(4)),
        avgDecisionError:   Number(avgDecisionError.toFixed(4)),
        highDriftCount,
        failureCount,
        successRate:        Number(((n - failureCount) / n).toFixed(4)),
    };
}

function _reset() {
    _records.length = 0;
    _seq = 0;
}

module.exports = { record, getAll, getLast, getStats, _reset };
