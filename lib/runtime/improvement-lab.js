'use strict';
// lib/runtime/improvement-lab.js
// Improvement lab — descriptive analysis of improvement candidates from evidence.
//
// PURE OBSERVABILITY. NOT execution. NOT runtime. NOT authority.
//
// No imports. Pure functions on caller-supplied pre-computed data.
//
// Rules:
//   A. No imports of any kind.
//   B. No writes. No caches. No persistence. No hidden state.
//   C. No mutation of inputs. No shared references.
//   D. Deterministic: same input → same output.
//   E. All outputs deep-frozen.
//   F. No execution calls. No runtime integration.
//
// Exports ONLY:
//   analyze(input)     → frozen improvementSnapshot
//   createContext()    → frozen lab context descriptor

const LAB_VERSION = '1.0.0';

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

// ── Deterministic hash ────────────────────────────────────────────────────────

function _djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h = h >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

function _canon(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(_canon).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + _canon(value[k])).join(',') + '}';
}

// ── Candidate area detection ──────────────────────────────────────────────────

function _detectCandidates(input) {
    const { benchmark, registry, lineage } = input || {};
    const candidates = [];

    // 1. decision_variance: high score spread → inconsistent decisions
    if (benchmark && typeof benchmark.variance === 'number' && benchmark.variance > 0.02) {
        candidates.push(_deepFreeze({
            id:      'decision_variance',
            title:   'High Decision Score Variance',
            impact:  parseFloat(Math.min(1, benchmark.variance * 10).toFixed(6)),
            signal:  parseFloat(benchmark.variance.toFixed(6)),
            threshold: 0.02,
        }));
    }

    // 2. regret_management: high regret → better policies existed
    if (benchmark && typeof benchmark.regretIndex === 'number' && benchmark.regretIndex > 0.3) {
        candidates.push(_deepFreeze({
            id:      'regret_management',
            title:   'Elevated Regret Index',
            impact:  parseFloat(Math.min(1, benchmark.regretIndex).toFixed(6)),
            signal:  parseFloat(benchmark.regretIndex.toFixed(6)),
            threshold: 0.3,
        }));
    }

    // 3. calibration_gap: low calibration → score doesn't match actual success
    if (benchmark && typeof benchmark.confidenceCalibration === 'number' && benchmark.confidenceCalibration < 0.8) {
        candidates.push(_deepFreeze({
            id:      'calibration_gap',
            title:   'Confidence Calibration Gap',
            impact:  parseFloat(Math.min(1, 1 - benchmark.confidenceCalibration).toFixed(6)),
            signal:  parseFloat(benchmark.confidenceCalibration.toFixed(6)),
            threshold: 0.8,
        }));
    }

    // 4. rollback_risk: high rollback rate → execution instability
    const rollbackRate = registry && registry.benchmarkSummary && typeof registry.benchmarkSummary.rollbackRate === 'number'
        ? registry.benchmarkSummary.rollbackRate : null;
    if (rollbackRate !== null && rollbackRate > 0.1) {
        candidates.push(_deepFreeze({
            id:      'rollback_risk',
            title:   'High Rollback Rate',
            impact:  parseFloat(Math.min(1, rollbackRate).toFixed(6)),
            signal:  parseFloat(rollbackRate.toFixed(6)),
            threshold: 0.1,
        }));
    }

    // 5. consistency_decline: negative trend in success rate over time
    const trendDelta = registry && registry.consistencyTrend && typeof registry.consistencyTrend.delta === 'number'
        ? registry.consistencyTrend.delta : null;
    if (trendDelta !== null && trendDelta < 0) {
        candidates.push(_deepFreeze({
            id:      'consistency_decline',
            title:   'Declining Consistency Trend',
            impact:  parseFloat(Math.min(1, Math.abs(trendDelta)).toFixed(6)),
            signal:  parseFloat(trendDelta.toFixed(6)),
            threshold: 0,
        }));
    }

    // 6. coverage_gap: low evaluation coverage → insufficient data quality
    const coverageRate = registry && registry.evaluationCoverage && typeof registry.evaluationCoverage.coverageRate === 'number'
        ? registry.evaluationCoverage.coverageRate : null;
    if (coverageRate !== null && coverageRate < 0.9) {
        candidates.push(_deepFreeze({
            id:      'coverage_gap',
            title:   'Low Evaluation Coverage',
            impact:  parseFloat(Math.min(1, 1 - coverageRate).toFixed(6)),
            signal:  parseFloat(coverageRate.toFixed(6)),
            threshold: 0.9,
        }));
    }

    return candidates;
}

// ── Recommendation generation ─────────────────────────────────────────────────

const RATIONALE_MAP = Object.freeze({
    decision_variance:   'Inconsistent decision scores suggest policy thresholds need tightening. High variance reduces outcome predictability.',
    regret_management:   'High regret index indicates failed outcomes had elevated confidence scores. Recalibrate acceptance threshold.',
    calibration_gap:     'Decision scores are not aligned with actual success rates. Recalibration of scoring weights is warranted.',
    rollback_risk:       'Elevated rollback rate signals execution instability. Review compensation triggers and threshold margins.',
    consistency_decline: 'Success rate is trending downward over time. Investigate recent policy or environment changes.',
    coverage_gap:        'Insufficient evaluation coverage limits learning signal quality. Improve data completeness before drawing conclusions.',
});

const EVIDENCE_MAP = Object.freeze({
    decision_variance:   Object.freeze(['benchmark.variance', 'benchmark.distributionSummary']),
    regret_management:   Object.freeze(['benchmark.regretIndex', 'benchmark.averageOutcome']),
    calibration_gap:     Object.freeze(['benchmark.confidenceCalibration', 'registry.successDistribution']),
    rollback_risk:       Object.freeze(['registry.benchmarkSummary.rollbackRate', 'registry.qualityIndicators']),
    consistency_decline: Object.freeze(['registry.consistencyTrend', 'registry.successDistribution']),
    coverage_gap:        Object.freeze(['registry.evaluationCoverage', 'lineage.evidenceCoverage']),
});

function _buildRecommendations(candidates) {
    return candidates.map(area => _deepFreeze({
        id:           area.id,
        title:        area.title,
        rationale:    RATIONALE_MAP[area.id] || 'Improvement opportunity detected.',
        expectedGain: parseFloat((area.impact * 0.5).toFixed(6)),
        confidence:   parseFloat(Math.min(1, area.impact).toFixed(6)),
        evidenceRefs: (EVIDENCE_MAP[area.id] || []).slice(),
    }));
}

// ── Priority ranking ──────────────────────────────────────────────────────────

function _buildPriorityRanking(recommendations) {
    return recommendations
        .slice()
        .sort((a, b) => b.expectedGain - a.expectedGain)
        .map((r, i) => _deepFreeze({ rank: i + 1, id: r.id, expectedGain: r.expectedGain }));
}

// ── Evidence coverage ─────────────────────────────────────────────────────────

function _evidenceCoverage(input) {
    const fields = ['executionEvaluation', 'replayData', 'benchmark', 'counterfactuals', 'registry', 'lineage'];
    const present = fields.filter(f => input && input[f] !== null && input[f] !== undefined);
    return _deepFreeze({
        presentFields: present.length,
        totalFields:   fields.length,
        coverageRate:  parseFloat((present.length / fields.length).toFixed(6)),
        fields:        fields.map(f => _deepFreeze({ name: f, present: present.includes(f) })),
    });
}

// ── Stability score ───────────────────────────────────────────────────────────

function _stabilityScore(input) {
    const { benchmark, executionEvaluation, registry } = input || {};
    const parts = [];
    if (benchmark && typeof benchmark.consistencyIndex === 'number') parts.push(benchmark.consistencyIndex);
    if (executionEvaluation && typeof executionEvaluation.successRate === 'number') parts.push(executionEvaluation.successRate);
    if (registry && registry.qualityIndicators && typeof registry.qualityIndicators.overallQuality === 'number') {
        parts.push(registry.qualityIndicators.overallQuality);
    }
    if (parts.length === 0) return null;
    return parseFloat((parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(6));
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        labVersion:        LAB_VERSION,
        labFields:         Object.freeze([
            'version', 'improvementHash', 'candidateAreas', 'recommendations',
            'priorityRanking', 'expectedGain', 'confidence', 'evidenceCoverage',
            'stabilityScore', 'improvementMetadata', 'generatedAt',
            'runtimeIntegrated', 'executionInfluence', 'deterministic', 'descriptiveOnly',
        ]),
        fieldCount:        15,
        authorityLevel:    'NONE',
        deterministic:     true,
        descriptiveOnly:   true,
        runtimeIntegrated: false,
        executionInfluence: false,
        createdAt:         null,
    });
}

function analyze(input) {
    const safeInput = (input !== null && typeof input === 'object') ? input : {};

    const candidateAreas  = _detectCandidates(safeInput);
    const recommendations = _buildRecommendations(candidateAreas);
    const priorityRanking = _buildPriorityRanking(recommendations);

    const totalGain = recommendations.length > 0
        ? parseFloat(recommendations.reduce((s, r) => s + r.expectedGain, 0).toFixed(6)) : 0;
    const avgConfidence = recommendations.length > 0
        ? parseFloat((recommendations.reduce((s, r) => s + r.confidence, 0) / recommendations.length).toFixed(6)) : null;

    const improvementMetadata = _deepFreeze({
        runtimeIntegrated:  false,
        executionInfluence: false,
        authorityLevel:     'NONE',
        descriptiveOnly:    true,
        deterministic:      true,
    });

    const hashInput = { areas: candidateAreas.map(a => a.id), recs: recommendations.map(r => r.id), priorityRanking };
    const improvementHash = _djb2(_canon(hashInput));

    return _deepFreeze({
        version:             LAB_VERSION,
        improvementHash,
        candidateAreas:      _deepFreeze(candidateAreas),
        recommendations:     _deepFreeze(recommendations),
        priorityRanking:     _deepFreeze(priorityRanking),
        expectedGain:        totalGain,
        confidence:          avgConfidence,
        evidenceCoverage:    _evidenceCoverage(safeInput),
        stabilityScore:      _stabilityScore(safeInput),
        improvementMetadata,
        generatedAt:         null,
        runtimeIntegrated:   false,
        executionInfluence:  false,
        deterministic:       true,
        descriptiveOnly:     true,
    });
}

module.exports = { analyze, createContext };
