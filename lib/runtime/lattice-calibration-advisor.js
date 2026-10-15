'use strict';
// lib/runtime/lattice-calibration-advisor.js
// Shadow calibration advisor — ZERO AUTHORITY, ZERO SIDE EFFECTS.
//
// Reads a health snapshot and produces a frozen advisory object describing
// what a human operator should investigate. Proposes only. Executes nothing.
//
// getCalibrationAdvice(snapshot?) is a pure function:
//   - accepts an optional pre-built snapshot (for testing / deterministic calls)
//   - if omitted, reads healthSignal.getHealthSnapshot() at call time
//   - identical input → identical output (fully deterministic)
//   - returns Object.frozen — caller cannot mutate runtime state through the result
//   - no writes to FM, DT, lattice, PETL, invariants, or any other module
//
// RECOMMENDATION LEVELS:
//   NONE        — all metrics within normal operating bounds
//   WATCH       — minor signal; no immediate action required
//   REVIEW      — one significant threshold breached; human review recommended
//   INVESTIGATE — systemic divergence or multiple signals; active investigation warranted
//
// Severity weights that drive level selection:
//   fm < 0.70                 → +1   (FM scoring degraded)
//   dt < 0.65                 → +1   (DT predictions diverging)
//   driftIndex > 0.30         → +2   (FM and DT fundamentally disagree)
//   pressureIndex > 0.10      → +2   (Constitution blocking >10% of traffic)
//   total 0 → NONE | 1 → WATCH | 2 → REVIEW | 3+ → INVESTIGATE

const healthSignal = require('./lattice-health-signal');

// Thresholds — read-only, named for documentation clarity
const THRESHOLD = Object.freeze({
    FM_MIN:       0.70,
    DT_MIN:       0.65,
    DRIFT_MAX:    0.30,
    PRESSURE_MAX: 0.10,
});

// getCalibrationAdvice(snapshot?) → frozen AdvisorSnapshot
// snapshot: optional pre-built health snapshot (from healthSignal.getHealthSnapshot()).
//           When provided, the function is fully deterministic.
//           When omitted, reads the live rolling window at call time.
function getCalibrationAdvice(snapshot) {
    const snap = snapshot !== undefined ? snapshot : healthSignal.getHealthSnapshot();

    // No data yet — cannot produce meaningful advice
    if (!snap || snap.sampleSize === 0) {
        return _freeze({
            generatedAt:          new Date().toISOString(),
            recommendationLevel:  'NONE',
            fmObservation:        'Insufficient data — no transactions in rolling window.',
            dtObservation:        'Insufficient data — no transactions in rolling window.',
            rationale:            'Rolling window is empty. Record more transactions before interpreting metrics.',
            proposedActions:      [],
            confidence:           0,
        });
    }

    const fm       = snap.fmStabilityScore;
    const dt       = snap.dtStabilityScore;
    const drift    = snap.systemDriftIndex;
    const pressure = snap.constitutionalPressureIndex;

    // ── Evaluate rules ────────────────────────────────────────────────────────
    const proposals = [];
    let severity    = 0;

    if (fm < THRESHOLD.FM_MIN) {
        proposals.push('Review Founder Model scoring inputs');
        severity += 1;
    }

    if (dt < THRESHOLD.DT_MIN) {
        proposals.push('Review Digital Twin prediction assumptions');
        severity += 1;
    }

    if (drift > THRESHOLD.DRIFT_MAX) {
        proposals.push('Investigate FM/DT divergence');
        severity += 2;
    }

    if (pressure > THRESHOLD.PRESSURE_MAX) {
        proposals.push('Review Constitution threshold tuning');
        severity += 2;
    }

    return _freeze({
        generatedAt:         new Date().toISOString(),
        recommendationLevel: _level(severity),
        fmObservation:       _fmObservation(fm),
        dtObservation:       _dtObservation(dt, drift),
        rationale:           _rationale(snap, proposals),
        proposedActions:     Object.freeze(proposals.slice()),
        confidence:          _confidence(snap.sampleSize),
    });
}

// ── Internal helpers (pure, no side effects) ──────────────────────────────────

function _level(severity) {
    if (severity === 0) return 'NONE';
    if (severity === 1) return 'WATCH';
    if (severity === 2) return 'REVIEW';
    return 'INVESTIGATE';
}

function _fmObservation(fm) {
    const s = fm !== null ? fm.toFixed(4) : 'n/a';
    if (fm === null)  return `FM stability not yet measured.`;
    if (fm >= 0.90)   return `FM scoring strongly aligned with outcomes (fmStabilityScore: ${s}).`;
    if (fm >= THRESHOLD.FM_MIN) return `FM scoring within acceptable bounds (fmStabilityScore: ${s}).`;
    if (fm >= 0.50)   return `FM scoring showing degradation — review Founder Model inputs (fmStabilityScore: ${s}).`;
    return                     `FM scoring significantly misaligned with outcomes (fmStabilityScore: ${s}). Investigate Founder Profile keywords and anti-goal definitions.`;
}

function _dtObservation(dt, drift) {
    const ds = dt    !== null ? dt.toFixed(4)    : 'n/a';
    const dr = drift !== null ? drift.toFixed(4) : 'n/a';
    if (dt === null)  return `DT stability not yet measured.`;
    if (dt >= 0.90)   return `DT predictions closely aligned with FM (dtStabilityScore: ${ds}, driftIndex: ${dr}).`;
    if (dt >= THRESHOLD.DT_MIN) return `DT predictions within acceptable variance (dtStabilityScore: ${ds}, driftIndex: ${dr}).`;
    return                      `DT predictions diverging from FM — review Digital Twin assumptions (dtStabilityScore: ${ds}, driftIndex: ${dr}).`;
}

function _rationale(snap, proposals) {
    if (!proposals.length) {
        return `All metrics within normal bounds over ${snap.sampleSize} transactions. No action required.`;
    }
    const lines = [
        `${proposals.length} signal(s) detected over ${snap.sampleSize} transactions:`,
    ];
    const fm  = snap.fmStabilityScore;
    const dt  = snap.dtStabilityScore;
    const dr  = snap.systemDriftIndex;
    const pr  = snap.constitutionalPressureIndex;

    if (fm   < THRESHOLD.FM_MIN)       lines.push(`  FM stability ${fm.toFixed(4)} is below threshold ${THRESHOLD.FM_MIN} — composite predictions may be systematically optimistic.`);
    if (dt   < THRESHOLD.DT_MIN)       lines.push(`  DT stability ${dt.toFixed(4)} is below threshold ${THRESHOLD.DT_MIN} — Digital Twin is diverging from FM on behavioural predictions.`);
    if (dr   > THRESHOLD.DRIFT_MAX)    lines.push(`  System drift index ${dr.toFixed(4)} exceeds ${THRESHOLD.DRIFT_MAX} — FM and DT disagree on more than 30% of assessments.`);
    if (pr   > THRESHOLD.PRESSURE_MAX) lines.push(`  Constitutional pressure ${pr.toFixed(4)} exceeds ${THRESHOLD.PRESSURE_MAX} — Constitution is non-ALLOW on more than 10% of requests.`);

    return lines.join('\n');
}

function _confidence(sampleSize) {
    if (sampleSize  <  50) return 0.30;
    if (sampleSize  < 200) return 0.60;
    if (sampleSize  < 500) return 0.80;
    return 0.95;
}

function _freeze(obj) {
    return Object.freeze(obj);
}

module.exports = { getCalibrationAdvice, THRESHOLD };
