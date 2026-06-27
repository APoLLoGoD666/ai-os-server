'use strict';
// lib/runtime/adaptation-simulator.js
// Adaptation simulator — hypothetical future trajectories from learning evidence.
//
// PURE OBSERVABILITY. NOT execution. NOT scheduling. NOT authority.
//
// No imports. Pure functions on caller-supplied pre-computed data.
// (Allowed: ./learning-ledger — not needed; data arrives as parameters.)
//
// Rules:
//   A. No imports of any kind.
//   B. No writes. No caches. No persistence. No hidden state.
//   C. No mutation of inputs. No shared references.
//   D. Deterministic: same input → same output.
//   E. All outputs deep-frozen.
//   F. generatedAt = null always.
//   G. authorityLevel: 'NONE' always.
//   H. Simulations are descriptive projections only — never executed.
//
// Exports ONLY:
//   simulate(input)      → frozen simulationSnapshot
//   createContext()      → frozen simulator context descriptor

const SIMULATOR_VERSION = '1.0.0';

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

// ── Scenario construction ─────────────────────────────────────────────────────

function _buildScenarios(strategy, resourcePlan, ledger) {
    if (!strategy || !Array.isArray(strategy.initiatives) || strategy.initiatives.length === 0) {
        return [];
    }

    const reproScore = (ledger && typeof ledger.reproducibilityScore === 'number')
        ? ledger.reproducibilityScore : 0.5;
    const velocity   = (ledger && typeof ledger.learningVelocity === 'number' && ledger.learningVelocity !== null)
        ? ledger.learningVelocity : 0.5;

    const allocations = (resourcePlan && Array.isArray(resourcePlan.allocations))
        ? resourcePlan.allocations : [];
    const totalAlloc  = allocations.reduce((s, a) => s + (a.allocationWeight || 0), 0);

    return strategy.initiatives.map((init, i) => {
        const alloc          = allocations.find(a => a.initiative === init.id);
        const allocationWeight = alloc ? alloc.allocationWeight : 0;

        // predictedGain: expected gain adjusted by reproducibility and learning velocity
        const baseGain    = typeof init.expectedGain === 'number' ? init.expectedGain : 0;
        const adjusted    = baseGain * (0.5 + reproScore * 0.5);
        const velocityAdd = adjusted * velocity * 0.2;
        const predictedGain = parseFloat(Math.min(1, Math.max(0, adjusted + velocityAdd)).toFixed(6));

        // confidence: initiative confidence scaled by reproducibility
        const baseConf  = typeof init.confidence === 'number' ? init.confidence : 0.5;
        const confidence  = parseFloat(Math.min(1, Math.max(0, baseConf * Math.max(0.1, reproScore))).toFixed(6));
        const uncertainty = parseFloat(Math.max(0, Math.min(1, 1 - confidence)).toFixed(6));

        // compoundEffect: share of strategy's compound impact weighted by allocation
        const compoundBase = typeof strategy.compoundImpact === 'number' ? strategy.compoundImpact : 0;
        const share        = totalAlloc > 0 ? allocationWeight / totalAlloc
            : 1 / strategy.initiatives.length;
        const compoundEffect = parseFloat(Math.min(1, Math.max(0, compoundBase * share)).toFixed(6));

        return _deepFreeze({
            id:            `scenario_${i + 1}`,
            strategy:      init.id,
            resourcePlan:  parseFloat(allocationWeight.toFixed(6)),
            predictedGain,
            confidence,
            uncertainty,
            compoundEffect,
            reproducible:  true,
        });
    });
}

// ── Winner selection ──────────────────────────────────────────────────────────

function _pickWinner(scenarios) {
    if (scenarios.length === 0) return null;
    let best = scenarios[0];
    for (let i = 1; i < scenarios.length; i++) {
        if (scenarios[i].predictedGain > best.predictedGain) best = scenarios[i];
    }
    return best.strategy;
}

// ── Aggregate metrics ─────────────────────────────────────────────────────────

function _adaptationConfidence(scenarios) {
    if (scenarios.length === 0) return null;
    const avg = scenarios.reduce((s, sc) => s + sc.confidence, 0) / scenarios.length;
    return parseFloat(avg.toFixed(6));
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        simulatorVersion:  SIMULATOR_VERSION,
        simulatorFields:   Object.freeze([
            'version', 'simulationHash', 'scenarios', 'winner',
            'expectedImprovement', 'adaptationConfidence', 'deterministic',
            'generatedAt', 'runtimeIntegrated', 'executionInfluence',
            'authorityLevel', 'descriptiveOnly',
        ]),
        fieldCount:        12,
        authorityLevel:    'NONE',
        deterministic:     true,
        descriptiveOnly:   true,
        runtimeIntegrated: false,
        executionInfluence: false,
        createdAt:         null,
    });
}

function simulate(input) {
    const safeInput = (input !== null && typeof input === 'object') ? input : {};
    const { ledger, strategy, resourcePlan } = safeInput;

    const scenarios          = _buildScenarios(strategy, resourcePlan, ledger);
    const winner             = _pickWinner(scenarios);
    const winnerScenario     = winner ? scenarios.find(s => s.strategy === winner) : null;
    const expectedImprovement = winnerScenario ? winnerScenario.predictedGain : null;
    const adaptationConfidence = _adaptationConfidence(scenarios);

    const simulationHash = _djb2(_canon({
        version:   SIMULATOR_VERSION,
        scenarios: scenarios.map(s => ({ id: s.id, gain: s.predictedGain, confidence: s.confidence })),
        winner,
    }));

    return _deepFreeze({
        version:              SIMULATOR_VERSION,
        simulationHash,
        scenarios:            _deepFreeze(scenarios),
        winner,
        expectedImprovement,
        adaptationConfidence,
        deterministic:        true,
        generatedAt:          null,
        runtimeIntegrated:    false,
        executionInfluence:   false,
        authorityLevel:       'NONE',
        descriptiveOnly:      true,
    });
}

module.exports = { simulate, createContext };
