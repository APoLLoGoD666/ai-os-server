'use strict';
// lib/finance/scenario-engine.js — Assumption-explicit financial scenario branching
// Scenario IDs are counter-based — no Math.random() for determinism

let _scnSeq = 0;

function _scnId() {
    _scnSeq++;
    return 'SCN-' + String(_scnSeq).padStart(6, '0');
}

// Detect null/undefined assumptions — 0 and false are NOT missing
function _detectMissing(assumptions) {
    return Object.entries(assumptions)
        .filter(([, v]) => v === null || v === undefined)
        .map(([k]) => k);
}

// Derive a confidence score from a base and number of missing variables
function _scenarioConfidence(base, missingCount) {
    return Math.max(5, Math.trunc(base) - Math.trunc(missingCount) * 10);
}

// Create a new scenario with named assumptions and optional params
// All assumptions are recorded explicitly — missing ones are flagged, not silently defaulted
function createScenario(name, assumptions = {}, params = {}, baseConfidence = 80) {
    const missingVariables = _detectMissing(assumptions);

    return {
        scenarioId:      _scnId(),
        name:            name || 'Unnamed Scenario',
        label:           name || 'Unnamed Scenario',
        assumptions,
        params,
        missingVariables,
        hasMissingData:  missingVariables.length > 0,
        confidence:      _scenarioConfidence(baseConfidence, missingVariables.length),
        isProjection:    true,
        createdAt:       new Date().toISOString(),
    };
}

// Branch a scenario by merging changed assumptions over the base
// Changed assumptions are recorded separately so divergence is traceable
function branchScenario(base = {}, changedAssumptions = {}, branchName = '') {
    const mergedAssumptions = { ...base.assumptions, ...changedAssumptions };
    const missingVariables  = _detectMissing(mergedAssumptions);
    const baseConf          = base.confidence !== undefined ? base.confidence : 80;

    return {
        scenarioId:       _scnId(),
        name:             branchName || `${base.name || 'Scenario'} (branch)`,
        label:            branchName || `${base.name || 'Scenario'} (branch)`,
        assumptions:      mergedAssumptions,
        params:           { ...base.params },
        missingVariables,
        hasMissingData:   missingVariables.length > 0,
        confidence:       _scenarioConfidence(baseConf, missingVariables.length),
        isProjection:     true,
        parentScenarioId: base.scenarioId || null,
        changedAssumptions,
        branchedFrom:     base.scenarioId || null,
        createdAt:        new Date().toISOString(),
    };
}

// Compare scenarios using a caller-supplied metric function (higher = better)
// Null metrics sort last; all assumption values are surfaced in the diff map
function compareScenarios(scenarios = [], metricFn) {
    if (typeof metricFn !== 'function') {
        return { ok: false, error: 'METRIC_FN_REQUIRED' };
    }

    const evaluated = scenarios.map(s => {
        let metric = null;
        try { metric = metricFn(s); } catch (_) { /* leave null */ }
        return { scenario: s, metric };
    });

    const ranked = [...evaluated].sort((a, b) => {
        if (a.metric === null && b.metric === null) return 0;
        if (a.metric === null) return 1;
        if (b.metric === null) return -1;
        return b.metric - a.metric;
    });

    // Which assumptions differ across scenarios — surface all values explicitly
    const allKeys = new Set(scenarios.flatMap(s => Object.keys(s.assumptions || {})));
    const assumptionDiffs = {};
    for (const key of allKeys) {
        const values = scenarios.map(s => (s.assumptions || {})[key]);
        const unique = new Set(values.map(v => JSON.stringify(v)));
        assumptionDiffs[key] = { varies: unique.size > 1, values };
    }

    return {
        totalScenarios:        scenarios.length,
        ranked:                ranked.map((r, i) => ({
            rank:       i + 1,
            scenarioId: r.scenario.scenarioId,
            name:       r.scenario.name,
            metric:     r.metric,
        })),
        bestScenario:          ranked[0]?.scenario       || null,
        worstScenario:         ranked[ranked.length - 1]?.scenario || null,
        assumptionDiffs,
        allAssumptionsVisible: true,
    };
}

// Identify which assumptions have the most influence on a target metric
// For each varying assumption: sort scenarios by assumption value, measure metric spread
function identifySensitivity(scenarios = [], targetMetricFn) {
    if (typeof targetMetricFn !== 'function') {
        return { ok: false, error: 'METRIC_FN_REQUIRED' };
    }
    if (scenarios.length < 2) {
        return { ok: false, error: 'INSUFFICIENT_SCENARIOS' };
    }

    const allKeys = new Set(scenarios.flatMap(s => Object.keys(s.assumptions || {})));
    const sensitivities = [];

    for (const key of allKeys) {
        const pairs = scenarios
            .map(s => {
                let metric = null;
                try { metric = targetMetricFn(s); } catch (_) { /* null */ }
                return { value: (s.assumptions || {})[key], metric };
            })
            .filter(p => p.value !== undefined && p.metric !== null);

        if (pairs.length < 2) continue;

        const sorted = [...pairs].sort((a, b) => {
            if (a.value < b.value) return -1;
            if (a.value > b.value) return 1;
            return 0;
        });

        const minMetric  = sorted[0].metric;
        const maxMetric  = sorted[sorted.length - 1].metric;
        const metricRange = Math.abs(maxMetric - minMetric);

        sensitivities.push({ assumption: key, metricRange, sensitive: metricRange > 0 });
    }

    sensitivities.sort((a, b) => b.metricRange - a.metricRange);

    return {
        ok:             true,
        sensitivities,
        mostSensitive:  sensitivities[0]?.assumption || null,
        sensitiveCount: sensitivities.filter(s => s.sensitive).length,
    };
}

module.exports = {
    createScenario,
    branchScenario,
    compareScenarios,
    identifySensitivity,
};
