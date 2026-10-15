'use strict';
// lib/runtime/decision-lattice.js
// Unified decision lattice unifying three existing Apex primitives.
//
// AUTHORITY PRECEDENCE (non-negotiable):
//   1. CONSTITUTION  — absolute hard stop; DENY/BLOCK terminates evaluation immediately
//   2. FOUNDER MODEL — long-horizon alignment score (0-100 → normalised 0-1)
//   3. DIGITAL TWIN  — behavioural coherence signal (1 - riskEstimate)
//
// Composite formula (when constitution allows):
//   finalDecisionScore = 0.5 * FM_normalised + 0.3 * DT_coherence + 0.2 * (1 - constitution_risk)
//
// Verdict thresholds:
//   ALLOW    >= 0.70
//   WARN     >= 0.50
//   RESTRICT >= 0.30
//   DENY     <  0.30
//
// Drift detection: 100-decision sliding window tracks FM-vs-Constitution and
// DT-vs-Constitution divergence. Flag fires when either rate exceeds 30%.
//
// Responsibilities (single, no cross-role):
//   CONSTITUTION: safety, permissions, risk boundaries, execution legality
//   FOUNDER MODEL: long-horizon alignment, trajectory correctness, drift from intended evolution
//   DIGITAL TWIN: user/system state estimation, next-action prediction, behavioural consistency
//
// External dependency injection via _inject() for testing (avoids Supabase/LLM in unit tests).

const _founderLib = require('../founder/alignment-engine');
const _dtLib      = require('../cognitive/runtime/digital-twin-gate');

// Weights must sum to 1.0
const W_FM   = 0.5;
const W_DT   = 0.3;
const W_RISK = 0.2;

// Verdict thresholds
const T_ALLOW    = 0.70;
const T_WARN     = 0.50;
const T_RESTRICT = 0.30;

// Drift tracking
const DRIFT_WINDOW_SIZE    = 100;
const DIVERGENCE_THRESHOLD = 0.30;
const _driftLog = [];   // { fmContradicts: bool, dtContradicts: bool }

// Injectable functions (overridable in tests via _inject)
let _founderFn = (text, opts) => _founderLib.score(text, opts);
let _dtFn      = (spec, p, s)  => _dtLib.evaluate(spec, p, s);

function _inject(overrides = {}) {
    if (overrides.founderScore !== undefined) _founderFn = overrides.founderScore;
    if (overrides.dtEvaluate   !== undefined) _dtFn      = overrides.dtEvaluate;
}

function _timeout(ms) {
    return new Promise((_, rej) => setTimeout(() => rej(new Error('lattice_timeout')), Math.max(10, ms)));
}

// Build a short text description of the request for FM keyword scoring.
function _describeRequest(req) {
    const method = (req.method || 'GET').toUpperCase();
    const path   = req.path || req.url || '/';
    const parts  = [`${method} ${path}`];
    if (req.body && typeof req.body === 'object') {
        const keys = Object.keys(req.body).slice(0, 5);
        if (keys.length) parts.push(`fields:${keys.join(',')}`);
    }
    return parts.join(' ');
}

// evaluate(req, constData) → LatticeResult
// constData: the .data object from the CONSTITUTION preflight stage
//   { verdict, riskScore, risks[], auditTrail[], failedOpen, durationMs }
// When constitution DENY/BLOCK: FM and DT are never called (immediate short-circuit).
async function evaluate(req = {}, constData = {}) {
    const t0 = Date.now();
    const constVerdict   = constData.verdict   || 'ALLOW';
    const constRiskScore = Math.min(1, (constData.riskScore || 0) / 100);

    // ── 1. CONSTITUTION: absolute authority — hard stop ───────────────────────
    if (constVerdict === 'DENY' || constVerdict === 'BLOCK') {
        _recordDrift({ fmContradicts: false, dtContradicts: false });
        return {
            finalDecision:         'DENY',
            constitutionVerdict:   constVerdict,
            founderAlignmentScore: null,
            digitalTwinPrediction: null,
            finalDecisionScore:    0,
            reason:   `Constitution ${constVerdict}: ${(constData.risks || []).join(', ') || 'access denied'}`,
            breakdown: {
                constitution: { verdict: constVerdict, riskScore: constRiskScore, risks: constData.risks || [] },
                founderModel: null,
                digitalTwin:  null,
            },
            driftFlag:  _checkDrift(),
            durationMs: Date.now() - t0,
        };
    }

    // ── 2. FOUNDER MODEL: long-horizon alignment, trajectory correctness ───────
    // Keyword-based scoring against founder profile — fast (no LLM), DB-backed.
    // Timeout: 280ms. On timeout or error → neutral 0.5 (fail-open for lattice).
    const fmBudgetMs     = 280;
    let fmNormScore      = 0.5;
    let fmRecommendation = 'neutral_default';
    let fmDetail         = null;
    try {
        fmDetail = await Promise.race([
            _founderFn(_describeRequest(req), { subjectType: 'petl_request' }),
            _timeout(fmBudgetMs),
        ]);
        fmNormScore      = (fmDetail.score || 50) / 100;
        fmRecommendation = fmDetail.recommendation || 'proceed_with_caution';
    } catch (_) { /* timeout or DB error → neutral 0.5 */ }

    // ── 3. DIGITAL TWIN: state estimation, behavioural coherence prediction ────
    // Calls cognitive/runtime/digital-twin-gate; coherence = 1 - riskEstimate.
    // Tight timeout (≤180ms total) — DT is LLM-backed and will often return neutral.
    // This is intentional: DT contribution improves as caching matures.
    const elapsed     = Date.now() - t0;
    const dtBudgetMs  = Math.max(30, 180 - elapsed);
    let dtCoherence   = 0.5;
    let dtDetail      = null;
    try {
        const spec = { objective: _describeRequest(req), _complexity: 'low' };
        dtDetail = await Promise.race([
            _dtFn(spec, {}, {}),
            _timeout(dtBudgetMs),
        ]);
        dtCoherence = dtDetail.simulated
            ? Math.max(0, Math.min(1, 1 - (dtDetail.riskEstimate || 0.3)))
            : 0.5;
    } catch (_) { /* timeout or unavailable → neutral 0.5 */ }

    // ── 4. Composite decision score ───────────────────────────────────────────
    const finalDecisionScore = W_FM * fmNormScore + W_DT * dtCoherence + W_RISK * (1 - constRiskScore);

    let finalDecision;
    if      (finalDecisionScore >= T_ALLOW)    finalDecision = 'ALLOW';
    else if (finalDecisionScore >= T_WARN)     finalDecision = 'WARN';
    else if (finalDecisionScore >= T_RESTRICT) finalDecision = 'RESTRICT';
    else                                       finalDecision = 'DENY';

    // ── 5. Drift tracking ──────────────────────────────────────────────────────
    // FM contradicts constitution if FM rejects but constitution allowed.
    // DT contradicts constitution if DT blocks but constitution allowed.
    const fmContradicts = fmRecommendation === 'reject' && constVerdict === 'ALLOW';
    const dtContradicts = dtDetail?.proceed === false   && constVerdict === 'ALLOW';
    _recordDrift({ fmContradicts, dtContradicts });

    return {
        finalDecision,
        constitutionVerdict:   constVerdict,
        founderAlignmentScore: fmNormScore,
        digitalTwinPrediction: dtCoherence,
        finalDecisionScore:    Number(finalDecisionScore.toFixed(4)),
        reason:   finalDecision === 'ALLOW' ? undefined
                : `Score ${finalDecisionScore.toFixed(3)}; FM:${fmRecommendation} DT:${dtCoherence.toFixed(2)}`,
        breakdown: {
            constitution: { verdict: constVerdict, riskScore: constRiskScore, risks: constData.risks || [] },
            founderModel: fmDetail
                ? { score: fmDetail.score, recommendation: fmRecommendation, antiGoals: fmDetail.triggered_anti_goals || [] }
                : { score: null, recommendation: fmRecommendation, antiGoals: [], note: 'timeout_or_unavailable' },
            digitalTwin: dtDetail
                ? { coherence: dtCoherence, riskEstimate: dtDetail.riskEstimate, recommendation: dtDetail.recommendation, simulated: dtDetail.simulated }
                : { coherence: 0.5, simulated: false, note: 'timeout_or_unavailable' },
        },
        driftFlag:  _checkDrift(),
        durationMs: Date.now() - t0,
    };
}

// ── Drift tracking internals ──────────────────────────────────────────────────

function _recordDrift(entry) {
    _driftLog.push(entry);
    if (_driftLog.length > DRIFT_WINDOW_SIZE) _driftLog.shift();
}

function _checkDrift() {
    const window = _driftLog.slice(-DRIFT_WINDOW_SIZE);
    if (window.length < 10) return false;
    const fmRate = window.filter(e => e.fmContradicts).length / window.length;
    const dtRate = window.filter(e => e.dtContradicts).length / window.length;
    return fmRate > DIVERGENCE_THRESHOLD || dtRate > DIVERGENCE_THRESHOLD;
}

// getDriftStats() — diagnostic endpoint for the SYSTEM_COHERENCE invariant
function getDriftStats() {
    const window = _driftLog.slice(-DRIFT_WINDOW_SIZE);
    if (!window.length) return { sampleSize: 0, fmDivergenceRate: 0, dtDivergenceRate: 0, flagActive: false };
    const fmRate = window.filter(e => e.fmContradicts).length / window.length;
    const dtRate = window.filter(e => e.dtContradicts).length / window.length;
    return {
        sampleSize:       window.length,
        fmDivergenceRate: fmRate,
        dtDivergenceRate: dtRate,
        flagActive:       fmRate > DIVERGENCE_THRESHOLD || dtRate > DIVERGENCE_THRESHOLD,
    };
}

function _reset() {
    _driftLog.length = 0;
    _founderFn = (text, opts) => _founderLib.score(text, opts);
    _dtFn      = (spec, p, s)  => _dtLib.evaluate(spec, p, s);
}

module.exports = {
    evaluate,
    getDriftStats,
    _inject,
    _reset,
    // Constants exported for tests and documentation
    W_FM, W_DT, W_RISK,
    T_ALLOW, T_WARN, T_RESTRICT,
    DIVERGENCE_THRESHOLD,
    DRIFT_WINDOW_SIZE,
};
