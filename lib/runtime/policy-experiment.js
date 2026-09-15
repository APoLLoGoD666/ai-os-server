'use strict';
// lib/runtime/policy-experiment.js
// Policy experiment — descriptive evaluation of candidate policies against historical data.
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
//   experiment(input)  → frozen experimentSnapshot
//   createContext()    → frozen experiment context descriptor

const EXPERIMENT_VERSION = '1.0.0';

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

// ── Policy name extraction ────────────────────────────────────────────────────

function _policyName(policy) {
    if (typeof policy === 'string') return policy;
    if (policy !== null && typeof policy === 'object' && typeof policy.name === 'string') return policy.name;
    return 'unknown';
}

// ── Score extraction from counterfactuals ────────────────────────────────────

function _extractPolicyScore(counterfactuals, policyName) {
    if (!Array.isArray(counterfactuals) || counterfactuals.length === 0) return null;
    const scores = [];
    for (const cf of counterfactuals) {
        if (!cf || typeof cf !== 'object') continue;
        const alts = cf.alternativeOutcomes;
        if (!alts || typeof alts !== 'object') continue;
        const outcome = alts[policyName];
        if (outcome && typeof outcome.outcomeEstimate === 'number') {
            scores.push(outcome.outcomeEstimate);
        }
    }
    if (scores.length === 0) return null;
    return parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(6));
}

function _extractPolicyRegret(counterfactuals, policyName) {
    if (!Array.isArray(counterfactuals) || counterfactuals.length === 0) return null;
    const regrets = [];
    for (const cf of counterfactuals) {
        if (!cf || typeof cf !== 'object') continue;
        const analysis = cf.regretAnalysis;
        if (!analysis) continue;
        // Per-policy regret: absolute difference from best outcome
        const alts = cf.alternativeOutcomes;
        if (!alts || typeof alts !== 'object') continue;
        const outcome = alts[policyName];
        const best = cf.winner;
        const bestOutcome = best && alts[best] ? alts[best].outcomeEstimate : null;
        if (outcome && typeof outcome.outcomeEstimate === 'number' && typeof bestOutcome === 'number') {
            regrets.push(Math.abs(bestOutcome - outcome.outcomeEstimate));
        }
    }
    if (regrets.length === 0) return null;
    return parseFloat((regrets.reduce((a, b) => a + b, 0) / regrets.length).toFixed(6));
}

// ── Candidate evaluation ──────────────────────────────────────────────────────

function _evaluateCandidate(name, counterfactuals) {
    const score  = _extractPolicyScore(counterfactuals, name);
    const regret = _extractPolicyRegret(counterfactuals, name);
    return _deepFreeze({ name, score, regret });
}

// ── Rankings ──────────────────────────────────────────────────────────────────

function _buildRankings(evaluated) {
    const withScores = evaluated.filter(e => e.score !== null);
    const noScores   = evaluated.filter(e => e.score === null);
    const sorted = withScores.slice().sort((a, b) => b.score - a.score);
    return [...sorted, ...noScores].map((e, i) => _deepFreeze({
        rank:   i + 1,
        name:   e.name,
        score:  e.score,
        regret: e.regret,
    }));
}

// ── Confidence from regret spread ─────────────────────────────────────────────

function _confidence(evaluated) {
    const regrets = evaluated.map(e => e.regret).filter(r => r !== null);
    if (regrets.length < 2) return null;
    const maxR = Math.max(...regrets);
    const minR = Math.min(...regrets);
    return parseFloat(Math.max(0, Math.min(1, 1 - (maxR - minR))).toFixed(6));
}

// ── Public API ─────────────────────────────────────────────────────────────────

function createContext() {
    return _deepFreeze({
        experimentVersion: EXPERIMENT_VERSION,
        experimentFields:  Object.freeze([
            'experimentHash', 'baseline', 'candidates', 'rankings',
            'confidence', 'delta', 'winner',
            'reproducible', 'experimentMetadata', 'generatedAt',
            'deterministic', 'descriptiveOnly',
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

function experiment(input) {
    const safeInput = (input !== null && typeof input === 'object') ? input : {};
    const { baseline, candidatePolicies, counterfactuals } = safeInput;

    const baselineName   = baseline ? _policyName(baseline) : 'same';
    const safeCounterfactuals = Array.isArray(counterfactuals) ? counterfactuals : [];

    const baselineEval   = _evaluateCandidate(baselineName, safeCounterfactuals);

    const rawCandidates  = Array.isArray(candidatePolicies) ? candidatePolicies : [];
    const candidateNames = rawCandidates.map(_policyName).filter((n, i, a) => a.indexOf(n) === i && n !== baselineName);
    const evaluated      = candidateNames.map(n => _evaluateCandidate(n, safeCounterfactuals));
    const rankings       = _buildRankings(evaluated);

    const winner = rankings.length > 0 && rankings[0].score !== null ? rankings[0].name : null;
    const winnerScore = winner ? (evaluated.find(e => e.name === winner) || {}).score : null;

    const delta = (winnerScore !== null && winnerScore !== undefined && baselineEval.score !== null)
        ? parseFloat((winnerScore - baselineEval.score).toFixed(6)) : null;

    const confidence = _confidence([baselineEval, ...evaluated]);

    const experimentMetadata = _deepFreeze({
        runtimeIntegrated:  false,
        executionInfluence: false,
        authorityLevel:     'NONE',
        descriptiveOnly:    true,
        deterministic:      true,
    });

    const hashInput = { baselineName, candidatePolicies: candidateNames, rankings };
    const experimentHash = _djb2(_canon(hashInput));

    return _deepFreeze({
        experimentHash,
        baseline:   _deepFreeze({ name: baselineName, score: baselineEval.score, regret: baselineEval.regret }),
        candidates: _deepFreeze(evaluated),
        rankings:   _deepFreeze(rankings),
        confidence,
        delta,
        winner,
        reproducible:        true,
        experimentMetadata,
        generatedAt:         null,
        deterministic:       true,
        descriptiveOnly:     true,
    });
}

module.exports = { experiment, createContext };
