'use strict';
// lib/runtime/counterfactual-evaluator.js
// Counterfactual evaluation — descriptive alternative policy comparison.
//
// PURE OBSERVABILITY. NOT execution. NOT runtime. NOT authority.
//
// No imports. Pure functions on caller-supplied records.
//
// Rules:
//   A. No imports of any kind.
//   B. No writes. No storage. No mutation of inputs.
//   C. No execution calls. No runtime influence.
//   D. Counterfactuals exist only inside returned object — never persisted.
//   E. All outputs deep-frozen.
//   F. Deterministic: same input → same output.
//
// Policies evaluated:
//   same            — baseline: as-is scores
//   conservative    — threshold 0.70, score penalised ×0.7
//   aggressive      — threshold 0.30, score boosted ×1.3
//   constitutionOnly — verdict-derived score only
//   founderOnly     — founderScore only
//   baselineRandom  — deterministic hash of txId (50/50 proxy)
//
// Exports ONLY:
//   evaluate(record)     → frozen counterfactual report
//   createContext()      → frozen evaluator context descriptor

const COUNTERFACTUAL_VERSION = '1.0.0';

const POLICIES = Object.freeze([
    'same', 'conservative', 'aggressive', 'constitutionOnly', 'founderOnly', 'baselineRandom',
]);

const POLICY_THRESHOLDS = Object.freeze({
    same:             0.5,
    conservative:     0.7,
    aggressive:       0.3,
    constitutionOnly: 0.5,
    founderOnly:      0.5,
    baselineRandom:   0.5,
});

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

// ── Deterministic hash [0,1] — no crypto dependency ──────────────────────────
// djb2 variant: gives stable distribution across arbitrary strings.

function _djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
        h = h >>> 0;
    }
    return h / 0xFFFFFFFF;
}

// ── Policy score computation (purely descriptive) ─────────────────────────────

function _policyScore(record, policy) {
    const fds = typeof record.finalDecisionScore === 'number' && !isNaN(record.finalDecisionScore)
        ? record.finalDecisionScore : 0.5;
    const fns = typeof record.founderScore === 'number' && !isNaN(record.founderScore)
        ? record.founderScore : 0.5;
    const verdict = record.constitutionVerdict;

    switch (policy) {
        case 'same':
            return parseFloat(fds.toFixed(6));
        case 'conservative':
            return parseFloat(Math.max(0, fds * 0.7).toFixed(6));
        case 'aggressive':
            return parseFloat(Math.min(1, fds * 1.3).toFixed(6));
        case 'constitutionOnly':
            return verdict === 'pass' || verdict === 'approved' ? 0.9
                 : verdict === null  || verdict === undefined   ? 0.5
                 : 0.1;
        case 'founderOnly':
            return parseFloat(fns.toFixed(6));
        case 'baselineRandom': {
            const seed = typeof record.txId === 'string' ? record.txId : 'null-tx';
            return parseFloat(_djb2(seed).toFixed(6));
        }
        default:
            return 0.5;
    }
}

function _evalPolicy(record, policy) {
    const score           = _policyScore(record, policy);
    const threshold       = POLICY_THRESHOLDS[policy] ?? 0.5;
    const wouldAccept     = score >= threshold;
    const outcomeEstimate = wouldAccept ? score : 0;
    const actualBinary    = typeof record.outcomeSuccess === 'boolean'
        ? (record.outcomeSuccess ? 1 : 0) : null;
    const regret = actualBinary !== null
        ? parseFloat(Math.abs(actualBinary - outcomeEstimate).toFixed(6)) : null;
    return _deepFreeze({ policyScore: score, wouldAccept, outcomeEstimate, regret });
}

// ── Null result skeleton ───────────────────────────────────────────────────────

function _nullPolicyResult() {
    return _deepFreeze({ policyScore: null, wouldAccept: null, outcomeEstimate: null, regret: null });
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        counterfactualVersion: COUNTERFACTUAL_VERSION,
        policies:              POLICIES.slice(),
        policyCount:           POLICIES.length,
        authorityLevel:        'NONE',
        deterministic:         true,
        descriptiveOnly:       true,
        runtimeIntegrated:     false,
        createdAt:             null,
    });
}

function evaluate(record) {
    if (!record || typeof record !== 'object') {
        const nullAlts = Object.fromEntries(POLICIES.map(p => [p, _nullPolicyResult()]));
        return _deepFreeze({
            txId:               null,
            actualOutcome:      _deepFreeze({ score: null, accepted: null, success: null }),
            alternativeOutcomes: _deepFreeze(nullAlts),
            regretAnalysis:     _deepFreeze({ maxRegret: null, minRegret: null, avgRegret: null, worstPolicy: null, bestPolicy: null }),
            winner:             null,
            confidence:         null,
            deterministic:      true,
        });
    }

    const txId    = record.txId     ?? null;
    const success = typeof record.outcomeSuccess    === 'boolean' ? record.outcomeSuccess    : null;
    const fds     = typeof record.finalDecisionScore === 'number' && !isNaN(record.finalDecisionScore)
        ? parseFloat(record.finalDecisionScore.toFixed(6)) : null;
    const accepted = typeof record.rollbackTriggered === 'boolean'
        ? !record.rollbackTriggered
        : (success !== null ? success : null);

    const alternatives = {};
    for (const p of POLICIES) alternatives[p] = _evalPolicy(record, p);

    // regretAnalysis over policies that have a regret value
    const regretPairs = POLICIES
        .map(p => ({ policy: p, regret: alternatives[p].regret }))
        .filter(x => x.regret !== null);

    let maxRegret = null, minRegret = null, avgRegret = null, worstPolicy = null, bestPolicy = null;
    if (regretPairs.length > 0) {
        const vals  = regretPairs.map(x => x.regret);
        maxRegret   = parseFloat(Math.max(...vals).toFixed(6));
        minRegret   = parseFloat(Math.min(...vals).toFixed(6));
        avgRegret   = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(6));
        worstPolicy = regretPairs.reduce((a, b) => a.regret > b.regret ? a : b).policy;
        bestPolicy  = regretPairs.reduce((a, b) => a.regret < b.regret ? a : b).policy;
    }

    // confidence: 1 - (variance of regrets / 0.25), clamped [0,1].
    // High = regrets are tightly clustered (winner is clear); Low = policies are ambiguous.
    let confidence = null;
    if (regretPairs.length >= 2) {
        const vals = regretPairs.map(x => x.regret);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const vari = vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length;
        confidence = parseFloat(Math.max(0, Math.min(1, 1 - vari / 0.25)).toFixed(6));
    }

    return _deepFreeze({
        txId,
        actualOutcome: _deepFreeze({ score: fds, accepted, success }),
        alternativeOutcomes: _deepFreeze(alternatives),
        regretAnalysis: _deepFreeze({ maxRegret, minRegret, avgRegret, worstPolicy, bestPolicy }),
        winner:     bestPolicy,
        confidence,
        deterministic: true,
    });
}

module.exports = { evaluate, createContext };
