'use strict';
// lib/constitution/deception-detector.js — Detects deceptive constitutional amendments

// Deceptive language patterns — scored by risk contribution
const DECEPTIVE_PATTERNS = [
    { id: 'DP01', risk: 25, description: 'efficiency/optimization framing may conceal capability reduction',
      test: (s) => /\b(optimiz|streamlin|simplif|efficient|overhead|lightweight)\b/i.test(s) },
    { id: 'DP02', risk: 40, description: 'explicit weakening — removal or relaxation of existing protection',
      test: (s) => /\b(relax|loosen|soften|weaken|reduce\s+restriction|remove\s+limit|remove\s+check)\b/i.test(s) },
    { id: 'DP03', risk: 15, description: 'minimizing framing — may understate constitutional impact',
      test: (s) => /\b(minor|small|trivial|tiny|just\s+a|only\s+a|simple\s+change|quick\s+fix|cleanup)\b/i.test(s) },
    { id: 'DP04', risk: 20, description: 'performance framing for non-performance principle — suspicious',
      test: (s) => /\b(performance|speed|faster|latency|throughput|cpu|memory\s+usage)\b/i.test(s) },
    { id: 'DP05', risk: 50, description: 'explicit bypass/exception language — high deception risk',
      test: (s) => /\b(bypass|exception|skip\s+check|ignore\s+rule|override\s+guard|disable|suppress)\b/i.test(s) },
    { id: 'DP06', risk: 30, description: 'scope inflation — "improvement" framing for sensitive principle',
      test: (s) => /\b(improve|enhance|better|more\s+flexible|more\s+permissive|extend\s+access)\b/i.test(s) },
    { id: 'DP07', risk: 20, description: 'ambiguity framing — vague change description invites interpretation',
      test: (s) => /\b(as\s+needed|when\s+appropriate|in\s+certain\s+cases|sometimes|generally|usually)\b/i.test(s) },
];

// Categories where performance/optimization framing is especially suspicious
const SENSITIVE_CATEGORIES = ['PRIVACY', 'AUTHORITY'];

function _score(text, category) {
    if (!text) return { score: 0, matched: [] };
    const matched = DECEPTIVE_PATTERNS.filter(p => p.test(text));
    let score = matched.reduce((s, p) => s + p.risk, 0);
    // Extra penalty: performance rationale for sensitive category
    if (category && SENSITIVE_CATEGORIES.includes(category) &&
        DECEPTIVE_PATTERNS.find(p => p.id === 'DP04')?.test(text)) {
        score += 20;
    }
    return { score: Math.min(score, 100), matched };
}

// Look up principle category from spec (safe — won't throw)
function _principleCategory(principleId) {
    try {
        const spec = require('./spec');
        const p = spec.PRINCIPLES.find(pr => pr.id === principleId);
        return p?.category || 'UNKNOWN';
    } catch { return 'UNKNOWN'; }
}

// Assess a single amendment for deceptive intent
function assessDeception(amendment = {}) {
    const { principleId, proposedChange = '', rationale = '' } = amendment;
    const category = _principleCategory(principleId);

    const changeScore   = _score(proposedChange, category);
    const rationaleScore = _score(rationale, category);
    const combined = changeScore.score + Math.floor(rationaleScore.score * 0.5);
    const deceptionScore = Math.min(combined, 100);

    const deceptive = deceptionScore >= 40;
    const escalate  = deceptionScore >= 65;

    return {
        principleId,
        category,
        deceptionScore,
        deceptive,
        escalate,
        patterns: {
            inChange:   changeScore.matched.map(p => ({ id: p.id, description: p.description })),
            inRationale: rationaleScore.matched.map(p => ({ id: p.id, description: p.description })),
        },
        recommendation: escalate ? 'ESCALATE' : deceptive ? 'DEFER' : 'PROCEED',
    };
}

// Detect fragmentation: multiple amendments targeting same principle or same category
function analyzeFragmentation(amendments = []) {
    if (amendments.length < 2) return { fragmented: false, groups: [], cumulativeRisk: 0 };

    // Group by principleId
    const byPrinciple = new Map();
    for (const amd of amendments) {
        const key = amd.principleId || 'UNKNOWN';
        if (!byPrinciple.has(key)) byPrinciple.set(key, []);
        byPrinciple.get(key).push(amd);
    }

    // Group by category
    const byCategory = new Map();
    for (const amd of amendments) {
        const cat = _principleCategory(amd.principleId) || 'UNKNOWN';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat).push(amd);
    }

    const groups = [];
    let maxGroupSize = 0;

    for (const [principleId, amds] of byPrinciple) {
        if (amds.length >= 2) {
            groups.push({ principleId, count: amds.length, type: 'SAME_PRINCIPLE' });
            maxGroupSize = Math.max(maxGroupSize, amds.length);
        }
    }
    for (const [category, amds] of byCategory) {
        if (amds.length >= 3 && !groups.find(g => g.principleId && byPrinciple.get(g.principleId)?.length >= 3)) {
            groups.push({ category, count: amds.length, type: 'SAME_CATEGORY' });
        }
    }

    // Cumulative deception score: each individual score is low, but combined raises concern
    const individualScores = amendments.map(a => assessDeception(a).deceptionScore);
    const avgIndividual = individualScores.reduce((s, x) => s + x, 0) / individualScores.length;
    const cumulativeRisk = Math.min(avgIndividual * amendments.length * 0.4, 100);

    const fragmented = groups.length > 0 || cumulativeRisk >= 40;

    return {
        fragmented,
        groups,
        cumulativeRisk: parseFloat(cumulativeRisk.toFixed(1)),
        amendmentCount: amendments.length,
        avgIndividualScore: parseFloat(avgIndividual.toFixed(1)),
    };
}

// Compare two amendment descriptions for wording clarity
// Returns true if amendment A is more ambiguous than amendment B
function isMoreAmbiguous(amendmentA, amendmentB) {
    const scoreA = _score(amendmentA.proposedChange || '', '').score +
                   _score(amendmentA.rationale || '', '').score;
    const scoreB = _score(amendmentB.proposedChange || '', '').score +
                   _score(amendmentB.rationale || '', '').score;
    return scoreA > scoreB;
}

module.exports = { assessDeception, analyzeFragmentation, isMoreAmbiguous, DECEPTIVE_PATTERNS };
