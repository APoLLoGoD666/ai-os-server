'use strict';
// lib/runtime/learning-ledger.js
// Learning ledger — immutable learning records from historical evidence.
//
// PURE OBSERVABILITY. NOT execution. NOT runtime. NOT authority.
//
// No imports. Pure functions on caller-supplied pre-computed data.
// (Allowed: outcome-registry, outcome-lineage, improvement-lab, policy-experiment,
//  strategy-engine, resource-planner — not needed; data arrives as parameters.)
//
// Rules:
//   A. No imports of any kind.
//   B. No writes. No caches. No persistence. No hidden state.
//   C. No mutation of inputs. No shared references.
//   D. Deterministic: same input → same output.
//   E. All outputs deep-frozen.
//   F. generatedAt = null always.
//   G. authorityLevel: 'NONE' always.
//
// Exports ONLY:
//   buildLedger(input)   → frozen ledgerSnapshot
//   createContext()      → frozen ledger context descriptor

const LEDGER_VERSION = '1.0.0';

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

// ── Observed metric per improvement area ──────────────────────────────────────

function _observedMetric(areaId, registry) {
    if (!registry) return null;
    const qi = registry.qualityIndicators;
    const bt = registry.benchmarkSummary;
    const ec = registry.evaluationCoverage;
    const ct = registry.consistencyTrend;

    switch (areaId) {
        case 'calibration_gap':
            return (qi && typeof qi.calibrationScore === 'number') ? qi.calibrationScore : null;
        case 'consistency_decline':
            return (ct && typeof ct.delta === 'number')
                ? parseFloat(Math.max(0, Math.min(1, 0.5 + ct.delta)).toFixed(6)) : null;
        case 'rollback_risk':
            return (bt && typeof bt.rollbackRate === 'number')
                ? parseFloat((1 - bt.rollbackRate).toFixed(6)) : null;
        case 'coverage_gap':
            return (ec && typeof ec.coverageRate === 'number') ? ec.coverageRate : null;
        case 'decision_variance':
            return (qi && typeof qi.decisionConsistency === 'number') ? qi.decisionConsistency : null;
        case 'regret_management':
            return (qi && typeof qi.overallQuality === 'number') ? qi.overallQuality : null;
        default:
            return (qi && typeof qi.overallQuality === 'number') ? qi.overallQuality : null;
    }
}

// ── Hypotheses ────────────────────────────────────────────────────────────────

function _buildHypotheses(improvements, registry, experiments) {
    if (!improvements || !Array.isArray(improvements.recommendations)) return [];

    const expConf = (experiments && typeof experiments.confidence === 'number')
        ? experiments.confidence : null;

    return improvements.recommendations.map((rec, i) => {
        const areaId  = rec.id || 'unknown';
        const baseline = typeof rec.expectedGain === 'number' ? rec.expectedGain : null;
        const observed = _observedMetric(areaId, registry);
        const delta    = (baseline !== null && observed !== null)
            ? parseFloat((observed - baseline).toFixed(6)) : null;
        const recConf  = typeof rec.confidence === 'number' ? rec.confidence : 0;
        const confidenceShift = parseFloat(((expConf !== null ? expConf : recConf) - recConf).toFixed(6));

        return _deepFreeze({
            id:             `h_${i + 1}`,
            hypothesis:     `Addressing ${rec.title || areaId} will improve decision quality`,
            evidenceRefs:   (Array.isArray(rec.evidenceRefs) ? rec.evidenceRefs : []).slice(),
            baseline,
            observed,
            delta,
            confidenceShift,
            reproducible:   true,
        });
    });
}

// ── Interventions ─────────────────────────────────────────────────────────────

function _buildInterventions(strategy, resourcePlan, registry, experiments) {
    if (!strategy || !Array.isArray(strategy.initiatives)) return [];

    const overallQuality = (registry && registry.qualityIndicators &&
        typeof registry.qualityIndicators.overallQuality === 'number')
        ? registry.qualityIndicators.overallQuality : null;

    const regretDeltaBase = (experiments && typeof experiments.delta === 'number')
        ? parseFloat(experiments.delta.toFixed(6)) : 0;

    return strategy.initiatives.map(init => {
        const alloc = (resourcePlan && Array.isArray(resourcePlan.allocations))
            ? resourcePlan.allocations.find(a => a.initiative === init.id) : null;
        const allocation   = alloc ? parseFloat(alloc.allocationWeight.toFixed(6)) : 0;
        const expectedGain = typeof init.expectedGain === 'number'
            ? parseFloat(init.expectedGain.toFixed(6)) : 0;
        const actualGain   = overallQuality !== null
            ? parseFloat((overallQuality * expectedGain).toFixed(6)) : null;

        return _deepFreeze({
            strategy:     init.id,
            allocation,
            expectedGain,
            actualGain,
            regretDelta:  regretDeltaBase,
        });
    });
}

// ── Aggregate metrics ─────────────────────────────────────────────────────────

function _effectiveness(interventions) {
    const valid = interventions.filter(i => i.actualGain !== null && i.expectedGain > 0);
    if (valid.length === 0) return null;
    const avg = valid.reduce((s, i) => s + i.actualGain / i.expectedGain, 0) / valid.length;
    return parseFloat(Math.min(2, Math.max(0, avg)).toFixed(6));
}

function _learningVelocity(hypotheses) {
    if (hypotheses.length === 0) return null;
    const significant = hypotheses.filter(h => h.delta !== null && Math.abs(h.delta) >= 0.01);
    return parseFloat((significant.length / hypotheses.length).toFixed(6));
}

function _consistency(hypotheses) {
    if (hypotheses.length === 0) return null;
    const stable = hypotheses.filter(h => h.delta === null || h.delta >= 0);
    return parseFloat((stable.length / hypotheses.length).toFixed(6));
}

function _reproducibilityScore(safeInput) {
    const { outcomeLineage } = safeInput;
    if (outcomeLineage && typeof outcomeLineage.reproducibilityScore === 'number') {
        return outcomeLineage.reproducibilityScore;
    }
    const fields = ['outcomeRegistry', 'outcomeLineage', 'improvements', 'experiments', 'strategy', 'resourcePlan'];
    const present = fields.filter(f => safeInput[f] != null).length;
    return parseFloat((present / fields.length).toFixed(6));
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        ledgerVersion:     LEDGER_VERSION,
        ledgerFields:      Object.freeze([
            'version', 'ledgerHash', 'cycleCount', 'hypotheses', 'interventions',
            'effectiveness', 'learningVelocity', 'consistency', 'reproducibilityScore',
            'generatedAt', 'runtimeIntegrated', 'executionInfluence',
            'authorityLevel', 'descriptiveOnly',
        ]),
        fieldCount:        14,
        authorityLevel:    'NONE',
        deterministic:     true,
        descriptiveOnly:   true,
        runtimeIntegrated: false,
        executionInfluence: false,
        createdAt:         null,
    });
}

function buildLedger(input) {
    const safeInput = (input !== null && typeof input === 'object') ? input : {};
    const { outcomeRegistry, outcomeLineage, improvements, experiments, strategy, resourcePlan } = safeInput;

    const hypotheses       = _buildHypotheses(improvements, outcomeRegistry, experiments);
    const interventions    = _buildInterventions(strategy, resourcePlan, outcomeRegistry, experiments);
    const cycleCount       = hypotheses.length;
    const effectiveness    = _effectiveness(interventions);
    const learningVelocity = _learningVelocity(hypotheses);
    const consistency      = _consistency(hypotheses);
    const reproScore       = _reproducibilityScore(safeInput);

    const ledgerHash = _djb2(_canon({
        version:       LEDGER_VERSION,
        cycleCount,
        hypotheses:    hypotheses.map(h => h.id),
        interventions: interventions.map(i => i.strategy),
    }));

    return _deepFreeze({
        version:              LEDGER_VERSION,
        ledgerHash,
        cycleCount,
        hypotheses:           _deepFreeze(hypotheses),
        interventions:        _deepFreeze(interventions),
        effectiveness,
        learningVelocity,
        consistency,
        reproducibilityScore: reproScore,
        generatedAt:          null,
        runtimeIntegrated:    false,
        executionInfluence:   false,
        authorityLevel:       'NONE',
        descriptiveOnly:      true,
    });
}

module.exports = { buildLedger, createContext };
