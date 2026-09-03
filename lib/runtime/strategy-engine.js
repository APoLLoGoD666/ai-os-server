'use strict';
// lib/runtime/strategy-engine.js
// Strategy engine — converts evidence into ranked strategic initiatives.
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
//   F. generatedAt = null always.
//   G. No randomness. No execution authority.
//
// Exports ONLY:
//   formulate(input)   → frozen strategySnapshot
//   createContext()    → frozen strategy context descriptor

const STRATEGY_VERSION = '1.0.0';

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

// ── Static classification maps ────────────────────────────────────────────────

const COMPLEXITY_MAP = Object.freeze({
    decision_variance:   'MEDIUM',
    regret_management:   'MEDIUM',
    calibration_gap:     'LOW',
    rollback_risk:       'HIGH',
    consistency_decline: 'HIGH',
    coverage_gap:        'LOW',
    policy_switch:       'MEDIUM',
});

const TIME_IMPACT_MAP = Object.freeze({
    decision_variance:   'MEDIUM',
    regret_management:   'MEDIUM',
    calibration_gap:     'SHORT',
    rollback_risk:       'LONG',
    consistency_decline: 'LONG',
    coverage_gap:        'SHORT',
    policy_switch:       'MEDIUM',
});

const RATIONALE_MAP = Object.freeze({
    decision_variance:   'Reducing score variance stabilizes decision quality and improves outcome predictability.',
    regret_management:   'Lowering regret index aligns confidence levels with actual outcome success rates.',
    calibration_gap:     'Closing the calibration gap ensures decision scores reflect true success probability.',
    rollback_risk:       'Reducing rollback rate decreases execution instability and compensation overhead.',
    consistency_decline: 'Reversing the consistency decline is critical to long-term outcome reliability.',
    coverage_gap:        'Improving evaluation coverage provides a complete signal for future optimization.',
    policy_switch:       'Switching to a higher-performing policy directly improves expected outcomes.',
});

const EVIDENCE_MAP = Object.freeze({
    decision_variance:   Object.freeze(['benchmark.variance', 'benchmark.distributionSummary']),
    regret_management:   Object.freeze(['benchmark.regretIndex', 'benchmark.averageOutcome']),
    calibration_gap:     Object.freeze(['benchmark.confidenceCalibration', 'outcomes.successDistribution']),
    rollback_risk:       Object.freeze(['outcomes.benchmarkSummary.rollbackRate', 'outcomes.qualityIndicators']),
    consistency_decline: Object.freeze(['outcomes.consistencyTrend', 'outcomes.successDistribution']),
    coverage_gap:        Object.freeze(['outcomes.evaluationCoverage', 'outcomes.counterfactualCoverage']),
    policy_switch:       Object.freeze(['experiments.delta', 'experiments.rankings', 'experiments.winner']),
});

// ── Initiative helpers ────────────────────────────────────────────────────────

function _makeInitiative(id, title, expectedGain, confidence, dependencies) {
    return {
        id,
        title,
        priority:     0,
        expectedGain: parseFloat(expectedGain.toFixed(6)),
        complexity:   COMPLEXITY_MAP[id.startsWith('policy_switch') ? 'policy_switch' : id] || 'MEDIUM',
        timeToImpact: TIME_IMPACT_MAP[id.startsWith('policy_switch') ? 'policy_switch' : id] || 'MEDIUM',
        confidence:   parseFloat((confidence || 0).toFixed(6)),
        dependencies: Object.freeze((dependencies || []).slice()),
        rationale:    RATIONALE_MAP[id.startsWith('policy_switch') ? 'policy_switch' : id] || 'Improvement opportunity identified from evidence.',
        evidenceRefs: (EVIDENCE_MAP[id.startsWith('policy_switch') ? 'policy_switch' : id] || []).slice(),
    };
}

function _buildInitiativesFromImprovements(improvements) {
    if (!improvements || !Array.isArray(improvements.recommendations)) return [];
    return improvements.recommendations
        .filter(rec => typeof rec.expectedGain === 'number' && rec.expectedGain >= 0)
        .map(rec => _makeInitiative(
            rec.id || 'unknown',
            rec.title || rec.id || 'Unknown',
            rec.expectedGain,
            rec.confidence,
            [],
        ));
}

function _buildInitiativesFromExperiments(experiments, existingIds) {
    if (!experiments || experiments.winner === null || experiments.winner === undefined) return [];
    const delta = experiments.delta;
    if (typeof delta !== 'number' || delta <= 0.05) return [];
    const id = `policy_switch_${experiments.winner}`;
    if (existingIds.includes(id)) return [];
    return [_makeInitiative(
        id,
        `Switch to ${experiments.winner} Policy`,
        delta * 0.5,
        typeof experiments.confidence === 'number' ? experiments.confidence : 0.5,
        [],
    )];
}

function _assignPriorities(initiatives) {
    return initiatives
        .slice()
        .sort((a, b) => b.expectedGain - a.expectedGain)
        .map((init, i) => _deepFreeze(Object.assign({}, init, { priority: i + 1 })));
}

// ── Constraint application ────────────────────────────────────────────────────

const COMPLEXITY_LEVEL = Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 3 });

function _applyConstraints(initiatives, constraints) {
    if (!constraints || typeof constraints !== 'object') return initiatives.slice();
    let filtered = initiatives.slice();
    if (typeof constraints.maxInitiatives === 'number' && constraints.maxInitiatives >= 0) {
        filtered = filtered.slice(0, Math.max(0, Math.floor(constraints.maxInitiatives)));
    }
    if (typeof constraints.minExpectedGain === 'number') {
        filtered = filtered.filter(i => i.expectedGain >= constraints.minExpectedGain);
    }
    if (typeof constraints.maxComplexity === 'string') {
        const maxLevel = COMPLEXITY_LEVEL[constraints.maxComplexity] || 3;
        filtered = filtered.filter(i => (COMPLEXITY_LEVEL[i.complexity] || 2) <= maxLevel);
    }
    return filtered;
}

function _constraintsApplied(constraints, before, after) {
    const applied = [];
    if (!constraints || typeof constraints !== 'object') return Object.freeze(applied);
    if (typeof constraints.maxInitiatives === 'number' && before.length !== after.length) {
        applied.push('maxInitiatives');
    }
    if (typeof constraints.minExpectedGain === 'number') applied.push('minExpectedGain');
    if (typeof constraints.maxComplexity === 'string') applied.push('maxComplexity');
    return Object.freeze([...new Set(applied)]);
}

// ── Ranking and map ───────────────────────────────────────────────────────────

function _buildRankings(initiatives) {
    return initiatives.map((init, i) => _deepFreeze({
        rank:         i + 1,
        id:           init.id,
        expectedGain: init.expectedGain,
        confidence:   init.confidence,
    }));
}

function _buildOpportunityMap(initiatives) {
    const map = {};
    for (let i = 0; i < initiatives.length; i++) {
        const init = initiatives[i];
        map[init.id] = _deepFreeze({
            rank:         i + 1,
            expectedGain: init.expectedGain,
            confidence:   init.confidence,
            timeToImpact: init.timeToImpact,
            complexity:   init.complexity,
        });
    }
    return _deepFreeze(map);
}

// ── Aggregate metrics ─────────────────────────────────────────────────────────

function _compoundImpact(initiatives) {
    if (initiatives.length === 0) return 0;
    const product = initiatives.reduce((acc, i) => acc * (1 - i.expectedGain), 1);
    return parseFloat(Math.max(0, Math.min(1, 1 - product)).toFixed(6));
}

const TIME_SCORE = Object.freeze({ SHORT: 1, MEDIUM: 2, LONG: 3 });

function _timeHorizon(initiatives) {
    if (initiatives.length === 0) return 'MEDIUM';
    const avg = initiatives.reduce((s, i) => s + (TIME_SCORE[i.timeToImpact] || 2), 0) / initiatives.length;
    if (avg < 1.5) return 'SHORT';
    if (avg < 2.5) return 'MEDIUM';
    return 'LONG';
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        strategyVersion:   STRATEGY_VERSION,
        strategyFields:    Object.freeze([
            'strategyVersion', 'strategyHash', 'initiatives', 'rankings', 'opportunityMap',
            'compoundImpact', 'timeHorizon', 'expectedGain', 'confidence',
            'constraintsApplied', 'strategyMetadata',
            'generatedAt', 'runtimeIntegrated', 'executionInfluence', 'deterministic', 'descriptiveOnly',
        ]),
        fieldCount:        16,
        authorityLevel:    'NONE',
        deterministic:     true,
        descriptiveOnly:   true,
        runtimeIntegrated: false,
        executionInfluence: false,
        createdAt:         null,
    });
}

function formulate(input) {
    const safeInput = (input !== null && typeof input === 'object') ? input : {};
    const { improvements, experiments, constraints } = safeInput;

    const impInitiatives = _buildInitiativesFromImprovements(improvements);
    const existingIds    = impInitiatives.map(i => i.id);
    const expInitiatives = _buildInitiativesFromExperiments(experiments, existingIds);

    const combined    = _assignPriorities([...impInitiatives, ...expInitiatives]);
    const constrained = _applyConstraints(combined, constraints).map((init, i) =>
        _deepFreeze(Object.assign({}, init, { priority: i + 1 })));

    const rankings          = _buildRankings(constrained);
    const opportunityMap    = _buildOpportunityMap(constrained);
    const compoundImpact    = _compoundImpact(constrained);
    const timeHorizon       = _timeHorizon(constrained);
    const expectedGain      = parseFloat(constrained.reduce((s, i) => s + i.expectedGain, 0).toFixed(6));
    const constraintsApplied = _constraintsApplied(constraints, combined, constrained);

    const confs    = constrained.map(i => i.confidence).filter(c => typeof c === 'number');
    const confidence = confs.length > 0
        ? parseFloat((confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(6)) : null;

    const strategyMetadata = _deepFreeze({
        runtimeIntegrated:  false,
        executionInfluence: false,
        authorityLevel:     'NONE',
        descriptiveOnly:    true,
        deterministic:      true,
    });

    const strategyHash = _djb2(_canon({
        initiatives: rankings.map(r => r.id),
        rankings:    rankings.map(r => r.rank),
    }));

    return _deepFreeze({
        strategyVersion:     STRATEGY_VERSION,
        strategyHash,
        initiatives:         _deepFreeze(constrained),
        rankings:            _deepFreeze(rankings),
        opportunityMap,
        compoundImpact,
        timeHorizon,
        expectedGain,
        confidence,
        constraintsApplied,
        strategyMetadata,
        generatedAt:         null,
        runtimeIntegrated:   false,
        executionInfluence:  false,
        deterministic:       true,
        descriptiveOnly:     true,
    });
}

module.exports = { formulate, createContext };
