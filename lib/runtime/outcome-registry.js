'use strict';
// lib/runtime/outcome-registry.js
// Outcome registry — immutable descriptive datasets from finalized outcomes.
//
// PURE OBSERVABILITY. NOT execution. NOT runtime. NOT authority.
//
// No imports. Pure functions on caller-supplied records.
//
// Rules:
//   A. No imports of any kind.
//   B. No writes. No caches. No persistence. No hidden state.
//   C. No mutation of inputs. No shared references.
//   D. Deterministic: same input → same output.
//   E. Registry exists only inside returned object.
//   F. All outputs deep-frozen.
//
// Exports ONLY:
//   buildRegistry(outcomes)   → frozen registrySnapshot
//   createContext()           → frozen registry context descriptor

const REGISTRY_VERSION = '1.0.0';

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

// ── Deterministic hash — no crypto dependency ─────────────────────────────────

function _djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h = h >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

// ── Canonical serialization ───────────────────────────────────────────────────

function _canon(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(_canon).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + _canon(value[k])).join(',') + '}';
}

// ── Pure numeric helpers ──────────────────────────────────────────────────────

function _nums(records, field) {
    return records.map(r => r[field]).filter(v => typeof v === 'number' && !isNaN(v));
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

function _quantile(sorted, p) {
    if (sorted.length === 0) return null;
    const idx = p * (sorted.length - 1);
    const lo  = Math.floor(idx);
    const hi  = Math.ceil(idx);
    if (lo === hi) return parseFloat(sorted[lo].toFixed(6));
    return parseFloat((sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)).toFixed(6));
}

// ── Metric helpers ────────────────────────────────────────────────────────────

function _timeRange(rs) {
    const dates = rs.map(r => r.startedAt).filter(v => typeof v === 'string' && v.length > 0);
    if (dates.length === 0) return _deepFreeze({ earliest: null, latest: null });
    const sorted = dates.slice().sort();
    return _deepFreeze({ earliest: sorted[0], latest: sorted[sorted.length - 1] });
}

function _outcomeDistribution(rs) {
    const counts = {};
    for (const r of rs) {
        const cat = typeof r.outcomeCategory === 'string' ? r.outcomeCategory : 'unknown';
        counts[cat] = (counts[cat] || 0) + 1;
    }
    return _deepFreeze(Object.keys(counts).length > 0 ? counts : {});
}

function _successDistribution(rs) {
    let succeeded = 0, failed = 0, unknown = 0;
    for (const r of rs) {
        if (r.outcomeSuccess === true) succeeded++;
        else if (r.outcomeSuccess === false) failed++;
        else unknown++;
    }
    const rated = succeeded + failed;
    return _deepFreeze({
        succeeded,
        failed,
        unknown,
        successRate: rated > 0 ? parseFloat((succeeded / rated).toFixed(6)) : null,
    });
}

function _confidenceDistribution(rs) {
    const sorted = _nums(rs, 'finalDecisionScore').slice().sort((a, b) => a - b);
    if (sorted.length === 0) {
        return _deepFreeze({ count: 0, min: null, p25: null, median: null, p75: null, max: null, mean: null, stddev: null });
    }
    return _deepFreeze({
        count:  sorted.length,
        min:    parseFloat(sorted[0].toFixed(6)),
        p25:    _quantile(sorted, 0.25),
        median: _quantile(sorted, 0.5),
        p75:    _quantile(sorted, 0.75),
        max:    parseFloat(sorted[sorted.length - 1].toFixed(6)),
        mean:   _mean(sorted),
        stddev: _stddev(sorted),
    });
}

function _decisionDistribution(rs) {
    const counts = {};
    for (const r of rs) {
        const type = typeof r.transactionType === 'string' ? r.transactionType : 'unknown';
        counts[type] = (counts[type] || 0) + 1;
    }
    return _deepFreeze(Object.keys(counts).length > 0 ? counts : {});
}

function _halfStats(half) {
    const withSuccess = half.filter(r => typeof r.outcomeSuccess === 'boolean');
    const successRate = withSuccess.length > 0
        ? parseFloat((withSuccess.filter(r => r.outcomeSuccess === true).length / withSuccess.length).toFixed(6))
        : null;
    return _deepFreeze({ successRate, avgScore: _mean(_nums(half, 'finalDecisionScore')) });
}

// consistencyTrend: first-half vs last-half comparison (requires ≥ 2 records).
function _consistencyTrend(rs) {
    if (rs.length < 2) return _deepFreeze({ early: null, late: null, delta: null, improving: null });
    const half  = Math.floor(rs.length / 2);
    const early = _halfStats(rs.slice(0, half));
    const late  = _halfStats(rs.slice(rs.length - half));
    const delta = early.successRate !== null && late.successRate !== null
        ? parseFloat((late.successRate - early.successRate).toFixed(6)) : null;
    return _deepFreeze({ early, late, delta, improving: delta !== null ? delta > 0 : null });
}

function _benchmarkSummary(rs) {
    const scores    = _nums(rs, 'finalDecisionScore');
    const durations = rs.map(r => r.durationMs).filter(v => typeof v === 'number' && !isNaN(v) && v >= 0);
    const withRb    = rs.filter(r => typeof r.rollbackTriggered     === 'boolean');
    const withComp  = rs.filter(r => typeof r.compensationTriggered === 'boolean');
    return _deepFreeze({
        avgDecisionScore: _mean(scores),
        avgDuration:      durations.length > 0
            ? parseFloat((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(4)) : null,
        rollbackRate:     withRb.length   > 0
            ? parseFloat((withRb.filter(r => r.rollbackTriggered     === true).length / withRb.length).toFixed(6))   : null,
        compensationRate: withComp.length > 0
            ? parseFloat((withComp.filter(r => r.compensationTriggered === true).length / withComp.length).toFixed(6)) : null,
    });
}

function _evaluationCoverage(rs) {
    const total       = rs.length;
    const withScore   = rs.filter(r => typeof r.finalDecisionScore === 'number' && !isNaN(r.finalDecisionScore)).length;
    const withSuccess = rs.filter(r => typeof r.outcomeSuccess === 'boolean').length;
    const withBoth    = rs.filter(r =>
        typeof r.finalDecisionScore === 'number' && !isNaN(r.finalDecisionScore) &&
        typeof r.outcomeSuccess === 'boolean'
    ).length;
    return _deepFreeze({
        total,
        withDecisionScore:  withScore,
        withOutcomeSuccess: withSuccess,
        withBoth,
        coverageRate: total > 0 ? parseFloat((withBoth / total).toFixed(6)) : null,
    });
}

function _counterfactualCoverage(rs) {
    const total    = rs.length;
    const eligible = rs.filter(r =>
        r.txId !== null && r.txId !== undefined &&
        typeof r.finalDecisionScore === 'number' && !isNaN(r.finalDecisionScore) &&
        typeof r.outcomeSuccess === 'boolean'
    ).length;
    return _deepFreeze({
        eligible,
        total,
        coverageRate: total > 0 ? parseFloat((eligible / total).toFixed(6)) : null,
    });
}

function _qualityIndicators(rs) {
    if (rs.length === 0) {
        return _deepFreeze({ overallQuality: null, dataCompleteness: null, decisionConsistency: null, calibrationScore: null });
    }
    const withSuccess = rs.filter(r => typeof r.outcomeSuccess === 'boolean');
    const scores      = _nums(rs, 'finalDecisionScore');
    const withBoth    = rs.filter(r =>
        typeof r.finalDecisionScore === 'number' && !isNaN(r.finalDecisionScore) &&
        typeof r.outcomeSuccess === 'boolean'
    );
    const successRate = withSuccess.length > 0
        ? parseFloat((withSuccess.filter(r => r.outcomeSuccess === true).length / withSuccess.length).toFixed(6)) : null;
    const avgScore   = _mean(scores);
    const coverage   = parseFloat((withBoth.length / rs.length).toFixed(6));
    const calibration = avgScore !== null && successRate !== null
        ? parseFloat(Math.max(0, Math.min(1, 1 - Math.abs(avgScore - successRate))).toFixed(6)) : null;
    const sd          = _stddev(scores);
    const consistency = sd !== null
        ? parseFloat(Math.max(0, Math.min(1, 1 - sd / 0.5)).toFixed(6)) : null;
    const parts = [
        successRate !== null ? successRate : null,
        calibration, consistency, coverage,
    ].filter(v => v !== null);
    return _deepFreeze({
        overallQuality:      parts.length > 0 ? parseFloat((parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(6)) : null,
        dataCompleteness:    coverage,
        decisionConsistency: consistency,
        calibrationScore:    calibration,
    });
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        registryVersion: REGISTRY_VERSION,
        registryFields:  Object.freeze([
            'registryVersion', 'recordCount', 'timeRange', 'outcomeDistribution',
            'successDistribution', 'confidenceDistribution', 'decisionDistribution',
            'consistencyTrend', 'benchmarkSummary', 'evaluationCoverage',
            'counterfactualCoverage', 'qualityIndicators', 'registryHash',
            'generatedAt', 'runtimeIntegrated', 'authorityLevel',
            'executionInfluence', 'deterministic', 'descriptiveOnly',
        ]),
        fieldCount:        19,
        authorityLevel:    'NONE',
        deterministic:     true,
        descriptiveOnly:   true,
        runtimeIntegrated: false,
        executionInfluence: false,
        createdAt:         null,
    });
}

function buildRegistry(outcomes) {
    if (!Array.isArray(outcomes)) outcomes = [];
    const rs = outcomes.filter(r => r !== null && typeof r === 'object');
    return _deepFreeze({
        registryVersion:        REGISTRY_VERSION,
        recordCount:            rs.length,
        timeRange:              _timeRange(rs),
        outcomeDistribution:    _outcomeDistribution(rs),
        successDistribution:    _successDistribution(rs),
        confidenceDistribution: _confidenceDistribution(rs),
        decisionDistribution:   _decisionDistribution(rs),
        consistencyTrend:       _consistencyTrend(rs),
        benchmarkSummary:       _benchmarkSummary(rs),
        evaluationCoverage:     _evaluationCoverage(rs),
        counterfactualCoverage: _counterfactualCoverage(rs),
        qualityIndicators:      _qualityIndicators(rs),
        registryHash:           _djb2(_canon(rs)),
        generatedAt:            null,
        runtimeIntegrated:      false,
        authorityLevel:         'NONE',
        executionInfluence:     false,
        deterministic:          true,
        descriptiveOnly:        true,
    });
}

module.exports = { buildRegistry, createContext };
