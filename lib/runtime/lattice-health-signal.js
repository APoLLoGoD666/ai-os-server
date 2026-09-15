'use strict';
// lib/runtime/lattice-health-signal.js
// Passive rolling health signal — OBSERVABILITY ONLY.
//
// Aggregates finalized PETL transaction outcomes into four rolling metrics
// over the last WINDOW_SIZE transactions. No decision logic, no weight
// mutations, no gating. Pure read surface for operational insight.
//
// Metrics computed over rolling window:
//
//   fmStabilityScore          = 1 - avg(decisionError)
//     Proxy: FM is the dominant lattice weight (0.5). Overall decisionError
//     captures how far the composite prediction missed reality; FM stability
//     is the primary driver of that error. Range [0,1]; 1 = perfect.
//
//   dtStabilityScore          = 1 - avg(driftDelta)
//     Proxy: driftDelta = |FM - DT|. High DT divergence from FM degrades the
//     composite. Range [0,1]; 1 = DT fully aligned with FM.
//
//   systemDriftIndex          = avg(driftDelta)
//     Complement of dtStabilityScore. Range [0,1]; 0 = no drift.
//
//   constitutionalPressureIndex = fraction of txs where verdict ≠ ALLOW
//     Tracks how often the hard gate is restricting/blocking requests.
//     Range [0,1]; 0 = all ALLOW, 1 = nothing passes.
//
// Access: getHealthSnapshot() returns a frozen snapshot of current metrics.
// No method on this module mutates FM, DT, or decision-lattice state.

const WINDOW_SIZE = 1000;

// Each entry: { driftDelta: number, decisionError: number, constitutionVerdict: string, success: bool }
const _window = [];

// record(tx) — synchronous; called from finalize() after every transaction.
// Transactions without latticeDecision (direct begin() calls) are silently skipped:
// they carry no FM/DT data and would corrupt rolling averages.
function record(tx) {
    if (!tx || !tx.latticeDecision) return;

    const lattice = tx.latticeDecision;
    const fm      = lattice.founderAlignmentScore;
    const dt      = lattice.digitalTwinPrediction;
    const score   = lattice.finalDecisionScore;
    const verdict = lattice.constitutionVerdict;

    if (fm == null || dt == null || score == null) return;

    const success = _isSuccess(tx);

    _window.push({
        driftDelta:            Math.abs(fm - dt),
        decisionError:         Math.abs(score - (success ? 1.0 : 0.0)),
        constitutionVerdict:   verdict,
        success,
    });

    if (_window.length > WINDOW_SIZE) _window.shift();
}

function _isSuccess(tx) {
    const sc = tx.result?.statusCode ?? null;
    const cf = tx.invariantReport?.criticalFailed ?? 0;
    const httpOk = sc !== null ? (sc >= 200 && sc < 400) : true;
    return httpOk && cf === 0;
}

// getHealthSnapshot() → frozen snapshot of current rolling metrics
function getHealthSnapshot() {
    const n = _window.length;

    if (!n) {
        return Object.freeze({
            windowSize:                  WINDOW_SIZE,
            sampleSize:                  0,
            fmStabilityScore:            null,
            dtStabilityScore:            null,
            systemDriftIndex:            null,
            constitutionalPressureIndex: null,
            computedAt:                  new Date().toISOString(),
        });
    }

    let sumDecisionError = 0;
    let sumDriftDelta    = 0;
    let pressureCount    = 0;

    for (const e of _window) {
        sumDecisionError += e.decisionError;
        sumDriftDelta    += e.driftDelta;
        if (e.constitutionVerdict !== 'ALLOW') pressureCount++;
    }

    const avgDE = sumDecisionError / n;
    const avgDD = sumDriftDelta    / n;

    return Object.freeze({
        windowSize:                  WINDOW_SIZE,
        sampleSize:                  n,
        fmStabilityScore:            Number((1 - avgDE).toFixed(4)),
        dtStabilityScore:            Number((1 - avgDD).toFixed(4)),
        systemDriftIndex:            Number(avgDD.toFixed(4)),
        constitutionalPressureIndex: Number((pressureCount / n).toFixed(4)),
        computedAt:                  new Date().toISOString(),
    });
}

function reset() { _window.length = 0; }
const _reset = reset;  // test alias

module.exports = { record, getHealthSnapshot, reset, _reset, WINDOW_SIZE };
