'use strict';
// lib/runtime/decision-benchmark.js
// Decision benchmarking — descriptive quality metrics over finalized outcomes.
//
// PURE OBSERVABILITY. NOT execution. NOT runtime. NOT authority.
//
// No imports. Pure functions on caller-supplied records.
//
// Rules:
//   A. No imports of any kind.
//   B. No writes. No storage. No mutation of inputs.
//   C. No execution calls. No runtime influence.
//   D. Deterministic: same input → same output.
//   E. All outputs deep-frozen.
//
// Exports ONLY:
//   benchmark(records)   → frozen benchmark report
//   createContext()      → frozen benchmark context descriptor

const BENCHMARK_VERSION = '1.0.0';

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

// ── Pure numeric helpers ──────────────────────────────────────────────────────

function _nums(records, field) {
    return records
        .map(r => r[field])
        .filter(v => typeof v === 'number' && !isNaN(v));
}

function _mean(nums) {
    if (nums.length === 0) return null;
    return parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(6));
}

function _variance(nums) {
    if (nums.length < 2) return null;
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    const v = nums.reduce((sum, x) => sum + (x - m) ** 2, 0) / nums.length;
    return parseFloat(v.toFixed(6));
}

function _stddev(nums) {
    const v = _variance(nums);
    return v === null ? null : parseFloat(Math.sqrt(v).toFixed(6));
}

function _rate(arr, predicate) {
    if (arr.length === 0) return null;
    return parseFloat((arr.filter(predicate).length / arr.length).toFixed(6));
}

function _quantile(sorted, p) {
    if (sorted.length === 0) return null;
    const idx = p * (sorted.length - 1);
    const lo  = Math.floor(idx);
    const hi  = Math.ceil(idx);
    if (lo === hi) return parseFloat(sorted[lo].toFixed(6));
    return parseFloat((sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)).toFixed(6));
}

// ── Metric helpers ────────────────────────────────────────────────────────────

// regretIndex: mean finalDecisionScore for failed outcomes.
// High regret = system was confident about bad decisions.
// null when no failures with scores exist.
function _regretIndex(rs) {
    const failed = rs.filter(r =>
        r.outcomeSuccess === false &&
        typeof r.finalDecisionScore === 'number' && !isNaN(r.finalDecisionScore)
    );
    if (failed.length === 0) return null;
    return _mean(failed.map(r => r.finalDecisionScore));
}

// consistencyIndex: 1 - (stddev / 0.5) clamped [0,1].
// 1 = perfectly consistent decision scores, 0 = maximum variance.
function _consistencyIndex(rs) {
    const scores = _nums(rs, 'finalDecisionScore');
    if (scores.length < 2) return null;
    const sd = _stddev(scores);
    if (sd === null) return null;
    return parseFloat(Math.max(0, Math.min(1, 1 - sd / 0.5)).toFixed(6));
}

// confidenceCalibration: 1 - |avgScore - successRate|, clamped [0,1].
// 1 = confidence scores accurately predict outcome rates.
function _confidenceCalibration(rs) {
    const withBoth = rs.filter(r =>
        typeof r.finalDecisionScore === 'number' && !isNaN(r.finalDecisionScore) &&
        typeof r.outcomeSuccess === 'boolean'
    );
    if (withBoth.length === 0) return null;
    const avgScore = _mean(withBoth.map(r => r.finalDecisionScore));
    const succRate = _rate(withBoth, r => r.outcomeSuccess === true);
    if (avgScore === null || succRate === null) return null;
    return parseFloat(Math.max(0, Math.min(1, 1 - Math.abs(avgScore - succRate))).toFixed(6));
}

// distributionSummary: quantile shape of finalDecisionScore values.
function _distributionSummary(rs) {
    const sorted = _nums(rs, 'finalDecisionScore').slice().sort((a, b) => a - b);
    if (sorted.length === 0) {
        return _deepFreeze({ min: null, max: null, median: null, p25: null, p75: null, stddev: null });
    }
    return _deepFreeze({
        min:    parseFloat(sorted[0].toFixed(6)),
        max:    parseFloat(sorted[sorted.length - 1].toFixed(6)),
        median: _quantile(sorted, 0.5),
        p25:    _quantile(sorted, 0.25),
        p75:    _quantile(sorted, 0.75),
        stddev: _stddev(sorted),
    });
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        benchmarkVersion:  BENCHMARK_VERSION,
        metrics: Object.freeze([
            'decisionCount', 'successRate', 'averageOutcome', 'variance',
            'regretIndex', 'consistencyIndex', 'confidenceCalibration', 'distributionSummary',
        ]),
        metricsCount:      8,
        authorityLevel:    'NONE',
        deterministic:     true,
        descriptiveOnly:   true,
        runtimeIntegrated: false,
        createdAt:         null,
    });
}

function benchmark(records) {
    if (!Array.isArray(records)) records = [];
    const rs          = records.filter(r => r !== null && typeof r === 'object');
    const withSuccess = rs.filter(r => typeof r.outcomeSuccess === 'boolean');
    const scores      = _nums(rs, 'finalDecisionScore');
    return _deepFreeze({
        decisionCount:         rs.length,
        successRate:           _rate(withSuccess, r => r.outcomeSuccess === true),
        averageOutcome:        _mean(scores),
        variance:              _variance(scores),
        regretIndex:           _regretIndex(rs),
        consistencyIndex:      _consistencyIndex(rs),
        confidenceCalibration: _confidenceCalibration(rs),
        distributionSummary:   _distributionSummary(rs),
        generatedAt:           null,
        deterministic:         true,
        descriptiveOnly:       true,
    });
}

module.exports = { benchmark, createContext };
