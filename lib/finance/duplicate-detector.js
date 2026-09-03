'use strict';
// lib/finance/duplicate-detector.js — Prevent duplicate financial records
// All amount comparisons use integer cents — no floating point

const DUPLICATE_LEVELS = {
    EXACT:     'EXACT',      // all 5 fields match
    PROBABLE:  'PROBABLE',   // amount + date + source match; ref/desc similar but not identical
    POSSIBLE:  'POSSIBLE',   // amount + date match; others differ
    UNLIKELY:  'UNLIKELY',   // amount only matches
    NONE:      'NONE',       // no meaningful match
    AMBIGUOUS: 'AMBIGUOUS',  // evidence insufficient to classify
};

// Fixed confidence scores — not computed dynamically (prevents confidence inflation)
const CONFIDENCE = {
    EXACT:     1.00,
    PROBABLE:  0.85,
    POSSIBLE:  0.50,
    UNLIKELY:  0.20,
    NONE:      0.00,
    AMBIGUOUS: 0.50,
};

// Levels that require explicit human resolution before proceeding
const RESOLUTION_REQUIRED = new Set([
    DUPLICATE_LEVELS.EXACT,
    DUPLICATE_LEVELS.PROBABLE,
    DUPLICATE_LEVELS.AMBIGUOUS,
]);

// Character-level Jaccard similarity — deterministic, no RNG
function _similarity(a = '', b = '') {
    if (a === b) return 1.0;
    if (!a || !b) return 0.0;
    const setA = new Set(a.toLowerCase());
    const setB = new Set(b.toLowerCase());
    const intersection = [...setA].filter(c => setB.has(c)).length;
    const union        = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : parseFloat((intersection / union).toFixed(4));
}

// Compare two transactions for duplication
// Both must have: amountCents (integer), date (ISO string), source, reference, description
function detectDuplicate(txA = {}, txB = {}) {
    if (!txA || !txB || typeof txA !== 'object' || typeof txB !== 'object') {
        return { level: DUPLICATE_LEVELS.AMBIGUOUS, confidence: CONFIDENCE.AMBIGUOUS,
                 autoDeletionBlocked: true, evidencePreserved: true };
    }

    // Amount comparison is integer equality — no floating point
    const amountMatch   = Number.isInteger(txA.amountCents) && Number.isInteger(txB.amountCents)
                          && txA.amountCents === txB.amountCents;
    const dateMatch     = (txA.date || '') === (txB.date || '');
    const sourceMatch   = (txA.source || '').toLowerCase() === (txB.source || '').toLowerCase();
    const refSim        = _similarity(txA.reference   || '', txB.reference   || '');
    const descSim       = _similarity(txA.description || '', txB.description || '');
    const refMatch      = refSim  >= 0.90;
    const descMatch     = descSim >= 0.70;

    let level, confidence;

    if (amountMatch && dateMatch && sourceMatch && refMatch && descMatch) {
        level      = DUPLICATE_LEVELS.EXACT;
        confidence = CONFIDENCE.EXACT;
    } else if (amountMatch && dateMatch && sourceMatch) {
        level      = DUPLICATE_LEVELS.PROBABLE;
        confidence = CONFIDENCE.PROBABLE;
    } else if (amountMatch && dateMatch) {
        level      = DUPLICATE_LEVELS.POSSIBLE;
        confidence = CONFIDENCE.POSSIBLE;
    } else if (amountMatch) {
        level      = DUPLICATE_LEVELS.UNLIKELY;
        confidence = CONFIDENCE.UNLIKELY;
    } else {
        level      = DUPLICATE_LEVELS.NONE;
        confidence = CONFIDENCE.NONE;
    }

    return {
        level,
        confidence,
        amountMatch,
        dateMatch,
        sourceMatch,
        refSimilarity:       refSim,
        descSimilarity:      descSim,
        resolutionRequired:  RESOLUTION_REQUIRED.has(level),
        autoDeletionBlocked: true,    // invariant: never auto-delete on detection
        evidencePreserved:   true,    // both records retained regardless of outcome
        transactionAId:      txA.id || null,
        transactionBId:      txB.id || null,
    };
}

// Scan all pairs in a transaction list for duplicates
function scanForDuplicates(transactions = []) {
    const results = [];
    for (let i = 0; i < transactions.length; i++) {
        for (let j = i + 1; j < transactions.length; j++) {
            const r = detectDuplicate(transactions[i], transactions[j]);
            if (r.level !== DUPLICATE_LEVELS.NONE) {
                results.push({ pairIndex: [i, j], ...r });
            }
        }
    }
    return {
        totalTransactions:   transactions.length,
        pairsExamined:       (transactions.length * (transactions.length - 1)) / 2,
        duplicatesFound:     results.length,
        exactDuplicates:     results.filter(r => r.level === DUPLICATE_LEVELS.EXACT).length,
        probableDuplicates:  results.filter(r => r.level === DUPLICATE_LEVELS.PROBABLE).length,
        possibleDuplicates:  results.filter(r => r.level === DUPLICATE_LEVELS.POSSIBLE).length,
        ambiguousCases:      results.filter(r => r.level === DUPLICATE_LEVELS.AMBIGUOUS).length,
        resolutionRequired:  results.filter(r => r.resolutionRequired).length,
        allEvidencePreserved: results.every(r => r.evidencePreserved),
        autoDeletionBlocked: true,
        results,
    };
}

// Record explicit human resolution of a duplicate case
// Valid actions: KEEP_BOTH | KEEP_A | KEEP_B | MERGE | MANUAL_REVIEW
function resolveCase(detection = {}, resolution = {}) {
    if (!detection.resolutionRequired) {
        return { ok: false, error: 'RESOLUTION_NOT_REQUIRED' };
    }
    const VALID_ACTIONS = ['KEEP_BOTH', 'KEEP_A', 'KEEP_B', 'MERGE', 'MANUAL_REVIEW'];
    const action = VALID_ACTIONS.includes(resolution.action) ? resolution.action : null;
    if (!action) return { ok: false, error: 'INVALID_RESOLUTION_ACTION' };

    return {
        ok:                       true,
        resolvedBy:               resolution.operatorId || 'SYSTEM',
        action,
        resolvedAt:               new Date().toISOString(),
        originalEvidenceRetained: true,   // evidence is never deleted on resolution
        rationaleRecorded:        !!(resolution.rationale),
        rationale:                resolution.rationale || null,
        level:                    detection.level,
    };
}

module.exports = {
    DUPLICATE_LEVELS,
    CONFIDENCE,
    RESOLUTION_REQUIRED,
    detectDuplicate,
    scanForDuplicates,
    resolveCase,
};
