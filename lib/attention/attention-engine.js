'use strict';
// lib/attention/attention-engine.js — Attention allocation for APEX runtime
// Inputs: goalPriority, risk, financialWeight, memoryRelevance, urgency, cognitiveConfidence
// Output: 0–1 allocation score per item

// Default weights for the composite score
const DEFAULT_WEIGHTS = {
    goalPriority:       0.30,
    risk:               0.25,
    financialWeight:    0.15,
    memoryRelevance:    0.15,
    urgency:            0.10,
    cognitiveConfidence: 0.05,
};

// Clamp a value to [0, 1]
function _clamp(v) { return Math.max(0, Math.min(1, typeof v === 'number' ? v : 0)); }

// score — compute a single 0–1 attention score for one item
// item: { goalPriority, risk, financialWeight, memoryRelevance, urgency, cognitiveConfidence }
// All inputs are 0–1; missing fields default to 0.5 (neutral)
function score(item = {}, weights = {}) {
    const w = Object.assign({}, DEFAULT_WEIGHTS, weights);

    const gp  = _clamp(item.goalPriority       !== undefined ? item.goalPriority       : 0.5);
    const ri  = _clamp(item.risk               !== undefined ? item.risk               : 0.5);
    const fw  = _clamp(item.financialWeight     !== undefined ? item.financialWeight     : 0.0);
    const mr  = _clamp(item.memoryRelevance     !== undefined ? item.memoryRelevance     : 0.5);
    const ur  = _clamp(item.urgency             !== undefined ? item.urgency             : 0.5);
    const cc  = _clamp(item.cognitiveConfidence !== undefined ? item.cognitiveConfidence : 0.5);

    const raw = gp * w.goalPriority       +
                ri * w.risk               +
                fw * w.financialWeight    +
                mr * w.memoryRelevance    +
                ur * w.urgency            +
                cc * w.cognitiveConfidence;

    // Normalise by total weight so missing weights don't deflate score
    const totalWeight = Object.values(w).reduce((s, v) => s + v, 0);
    const normalised  = totalWeight > 0 ? raw / totalWeight : raw;

    return {
        score:  Math.round(_clamp(normalised) * 1000) / 1000,
        inputs: { gp, ri, fw, mr, ur, cc },
        weights: w,
    };
}

// rank — score a list of items and return them sorted descending
function rank(items = [], weights = {}) {
    const scored = items.map((item, i) => {
        const result = score(item, weights);
        return { index: i, item, score: result.score, inputs: result.inputs };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
}

// allocate — given a ranked list, distribute a total budget (0–1) proportionally
// Returns each item's allocated share
function allocate(items = [], weights = {}, totalBudget = 1.0) {
    const ranked     = rank(items, weights);
    const totalScore = ranked.reduce((s, r) => s + r.score, 0);
    const budget     = _clamp(totalBudget);

    return ranked.map(r => ({
        ...r,
        allocation: totalScore > 0
            ? Math.round((r.score / totalScore) * budget * 1000) / 1000
            : 0,
    }));
}

// explain — return a human-readable breakdown of why a score landed where it did
function explain(item = {}, weights = {}) {
    const result    = score(item, weights);
    const s         = result.score;
    const { gp, ri, fw, mr, ur, cc } = result.inputs;
    const w         = result.weights;

    const contributions = [
        { factor: 'goalPriority',        value: gp,  weight: w.goalPriority,       contribution: gp  * w.goalPriority       },
        { factor: 'risk',                value: ri,  weight: w.risk,               contribution: ri  * w.risk               },
        { factor: 'financialWeight',     value: fw,  weight: w.financialWeight,    contribution: fw  * w.financialWeight    },
        { factor: 'memoryRelevance',     value: mr,  weight: w.memoryRelevance,    contribution: mr  * w.memoryRelevance    },
        { factor: 'urgency',             value: ur,  weight: w.urgency,            contribution: ur  * w.urgency            },
        { factor: 'cognitiveConfidence', value: cc,  weight: w.cognitiveConfidence, contribution: cc * w.cognitiveConfidence },
    ].sort((a, b) => b.contribution - a.contribution);

    const dominant = contributions[0]?.factor || 'unknown';

    return {
        score:         s,
        dominant,
        contributions,
        summary: `Score ${s.toFixed(3)} — driven by ${dominant} (${(contributions[0]?.contribution || 0).toFixed(3)})`,
    };
}

module.exports = {
    DEFAULT_WEIGHTS,
    score,
    rank,
    allocate,
    explain,
};
