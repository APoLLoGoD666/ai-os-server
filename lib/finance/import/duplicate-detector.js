'use strict';
// lib/finance/import/duplicate-detector.js — Detects likely duplicates; never removes records

const DUPLICATE_CLASS = {
    NONE:      'NONE',
    POSSIBLE:  'POSSIBLE',
    LIKELY:    'LIKELY',
    CONFIRMED: 'CONFIRMED',
};

// Normalise description for comparison — lowercase, collapse spaces, strip punctuation
function _normalise(str) {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Levenshtein similarity 0–1
function _similarity(a, b) {
    const s1 = _normalise(a);
    const s2 = _normalise(b);
    if (!s1 && !s2) return 1;
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;

    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = s1[i - 1] === s2[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return 1 - dp[m][n] / Math.max(m, n);
}

// Amount match — same absolute value, tolerance for floating-point rounding
function _amountsMatch(a, b) {
    if (a === null || b === null || a === undefined || b === undefined) return false;
    return Math.abs(Math.abs(a) - Math.abs(b)) < 0.005;
}

// Date proximity in days
function _daysDiff(d1, d2) {
    if (!d1 || !d2) return Infinity;
    const t1 = new Date(d1).getTime();
    const t2 = new Date(d2).getTime();
    if (isNaN(t1) || isNaN(t2)) return Infinity;
    return Math.abs((t1 - t2) / 86_400_000);
}

// Reference identity check
function _refsMatch(a, b) {
    if (!a || !b) return false;
    const ra = String(a).trim().toLowerCase();
    const rb = String(b).trim().toLowerCase();
    return ra.length > 0 && ra === rb;
}

function _classifyScore(score) {
    if (score >= 1.0)  return DUPLICATE_CLASS.CONFIRMED;
    if (score >= 0.75) return DUPLICATE_CLASS.LIKELY;
    if (score >= 0.45) return DUPLICATE_CLASS.POSSIBLE;
    return DUPLICATE_CLASS.NONE;
}

// Compare two canonical events; return duplicate assessment
function comparePair(eventA, eventB) {
    const signals = {};

    // Reference match (strongest signal)
    const refA = eventA.sourceReference || eventA.metadata?.reference;
    const refB = eventB.sourceReference || eventB.metadata?.reference;
    signals.referenceMatch = _refsMatch(refA, refB);

    // Amount match
    signals.amountMatch = _amountsMatch(eventA.amount, eventB.amount);

    // Same currency (or both unknown)
    signals.currencyMatch = (eventA.currency || null) === (eventB.currency || null);

    // Date proximity
    const dayDiff = _daysDiff(eventA.eventDate, eventB.eventDate);
    signals.dateDiff = dayDiff;
    signals.sameDay    = dayDiff === 0;
    signals.within3Day = dayDiff <= 3;

    // Description similarity
    const descSim = _similarity(eventA.description, eventB.description);
    signals.descriptionSimilarity = parseFloat(descSim.toFixed(3));
    signals.descriptionClose = descSim >= 0.8;

    // Score assembly
    let score = 0;

    if (signals.referenceMatch)       score += 0.6;   // highest weight — explicit ID
    if (signals.amountMatch)          score += 0.25;
    if (signals.sameDay)              score += 0.15;
    else if (signals.within3Day)      score += 0.07;
    if (signals.descriptionClose)     score += 0.15;
    if (signals.currencyMatch && (eventA.currency !== null)) score += 0.05;

    // Penalties
    if (!signals.amountMatch)         score -= 0.1;
    if (dayDiff > 7)                  score -= 0.15;

    score = Math.max(0, Math.min(1, score));

    const classification = _classifyScore(score);

    return {
        importIdA:      eventA.importId,
        importIdB:      eventB.importId,
        score:          parseFloat(score.toFixed(3)),
        classification,
        signals,
        evidenceRetained: true,   // detection never removes records
    };
}

// Detect duplicates within a set of events — O(n²) scan
function detectInBatch(events) {
    const pairs    = [];
    let suspected  = 0;

    for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
            const result = comparePair(events[i], events[j]);
            if (result.classification !== DUPLICATE_CLASS.NONE) {
                pairs.push(result);
                suspected++;
            }
        }
    }

    const byClass = {
        [DUPLICATE_CLASS.POSSIBLE]:  pairs.filter(p => p.classification === DUPLICATE_CLASS.POSSIBLE).length,
        [DUPLICATE_CLASS.LIKELY]:    pairs.filter(p => p.classification === DUPLICATE_CLASS.LIKELY).length,
        [DUPLICATE_CLASS.CONFIRMED]: pairs.filter(p => p.classification === DUPLICATE_CLASS.CONFIRMED).length,
    };

    return {
        totalEvents:    events.length,
        suspectedCount: suspected,
        pairs,
        byClass,
        evidenceRetained: true,
        deletionBlocked:  true,
    };
}

// Compare incoming events against a reference corpus (cross-batch)
function detectAgainstCorpus(incomingEvents, corpusEvents) {
    const pairs = [];

    for (const incoming of incomingEvents) {
        for (const corpus of corpusEvents) {
            const result = comparePair(incoming, corpus);
            if (result.classification !== DUPLICATE_CLASS.NONE) {
                pairs.push({ ...result, crossBatch: true });
            }
        }
    }

    return {
        incomingCount:  incomingEvents.length,
        corpusCount:    corpusEvents.length,
        suspectedCount: pairs.length,
        pairs,
        evidenceRetained: true,
    };
}

module.exports = {
    DUPLICATE_CLASS,
    comparePair,
    detectInBatch,
    detectAgainstCorpus,
    _similarity,
    _amountsMatch,
};
