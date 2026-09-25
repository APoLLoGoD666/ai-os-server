'use strict';
// lib/constitution/verdict-calibrator.js — Prevent unjustified verdict upgrades or downgrades

const VERDICT_LEVELS = {
    NONE:                   0,
    INSUFFICIENT:           1,
    WEAK:                   2,
    MODERATE:               3,
    STRONG:                 4,
    CONSTITUTIONALLY_SOUND: 5,
};

const CALIBRATION_DIMENSIONS = [
    'evidence_quality',
    'evidence_quantity',
    'contradiction_severity',
    'uncertainty_burden',
    'failure_significance',
    'reproducibility',
    'duration_weighting',
    'independence_of_validation',
];

// Minimum evidence thresholds required per verdict tier
const VERDICT_THRESHOLDS = {
    CONSTITUTIONALLY_SOUND: { minEntries: 30, maxContradictions: 0, maxUncertaintyBurden: 0.10, minReproduced: 20, minDimensions: 7 },
    STRONG:                 { minEntries: 20, maxContradictions: 2, maxUncertaintyBurden: 0.20, minReproduced: 12, minDimensions: 6 },
    MODERATE:               { minEntries: 10, maxContradictions: 5, maxUncertaintyBurden: 0.35, minReproduced:  6, minDimensions: 4 },
    WEAK:                   { minEntries:  5, maxContradictions: 9, maxUncertaintyBurden: 0.50, minReproduced:  2, minDimensions: 2 },
    INSUFFICIENT:           { minEntries:  0, maxContradictions: Infinity, maxUncertaintyBurden: 1.0, minReproduced: 0, minDimensions: 0 },
};

// Score evidence quality: 0–1
// qualitySignals = { peerReviewed, independentlyValidated, longitudinal, methodologicallySound }
function scoreEvidenceQuality(qualitySignals = {}) {
    let score = 0.40; // base
    if (qualitySignals.peerReviewed)          score += 0.15;
    if (qualitySignals.independentlyValidated) score += 0.20;
    if (qualitySignals.longitudinal)           score += 0.15;
    if (qualitySignals.methodologicallySound)  score += 0.10;
    return parseFloat(Math.min(1.0, score).toFixed(4));
}

// Compute uncertainty burden from a list of uncertainty items
// each item: { severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL' }
function computeUncertaintyBurden(uncertainties = []) {
    const weights = { LOW: 0.02, MEDIUM: 0.05, HIGH: 0.10, CRITICAL: 0.20 };
    const total   = uncertainties.reduce((s, u) => s + (weights[u.severity] || 0.05), 0);
    return parseFloat(Math.min(1.0, total).toFixed(4));
}

// Compute contradiction penalty: 0–1 applied as confidence reduction
function computeContradictionPenalty(contradictions = []) {
    const weights = { MINOR: 0.03, MODERATE: 0.07, SEVERE: 0.15, CRITICAL: 0.25 };
    const total   = contradictions.reduce((s, c) => s + (weights[c.severity] || 0.07), 0);
    return parseFloat(Math.min(0.80, total).toFixed(4));
}

// Duration weighting: short simulations count less than long-duration observations
// durationHours: time span of observations
function durationWeight(durationHours = 0) {
    if (durationHours <= 0)    return 0.10;
    if (durationHours <= 1)    return 0.30;
    if (durationHours <= 24)   return 0.55;
    if (durationHours <= 168)  return 0.75;
    if (durationHours <= 720)  return 0.90;
    return 1.00;
}

// Independence score: independent validators carry more weight than self-assessments
// validators = array of { independent: bool }
function independenceScore(validators = []) {
    if (validators.length === 0) return 0;
    const independent = validators.filter(v => v.independent).length;
    return parseFloat((independent / validators.length).toFixed(4));
}

// Core calibration: determine the highest justified verdict tier
// corpus = synthesiseCorpus output; signals = { qualitySignals, uncertainties, validators, durationHours }
function calibrateVerdict(corpus = {}, signals = {}) {
    const evidenceQuality     = scoreEvidenceQuality(signals.qualitySignals || {});
    const uncertaintyBurden   = computeUncertaintyBurden(signals.uncertainties || []);
    const contradictionPenalty = computeContradictionPenalty(
        (corpus.dimensionSummaries
            ? Object.values(corpus.dimensionSummaries).flatMap(d => d.contradictions || [])
            : [])
    );
    const durWeight   = durationWeight(signals.durationHours || 0);
    const indepScore  = independenceScore(signals.validators || []);

    // Adjusted confidence: start from evidence quality, subtract penalties
    const rawConfidence = evidenceQuality * durWeight * (0.5 + 0.5 * indepScore);
    const adjustedConfidence = parseFloat(
        Math.max(0, rawConfidence - contradictionPenalty - uncertaintyBurden * 0.5).toFixed(4)
    );

    const totalEntries        = corpus.totalEntries        || 0;
    const totalContradictions = corpus.totalContradictions || 0;
    const reproducedCount     = signals.reproducedCount    || 0;
    const dimensionsCovered   = signals.dimensionsCovered  || 0;

    // Walk from highest tier downward — take the first tier whose requirements are met
    let justifiedVerdict = 'INSUFFICIENT';
    for (const tier of ['CONSTITUTIONALLY_SOUND', 'STRONG', 'MODERATE', 'WEAK']) {
        const t = VERDICT_THRESHOLDS[tier];
        if (
            totalEntries        >= t.minEntries            &&
            totalContradictions <= t.maxContradictions      &&
            uncertaintyBurden   <= t.maxUncertaintyBurden  &&
            reproducedCount     >= t.minReproduced         &&
            dimensionsCovered   >= t.minDimensions
        ) {
            justifiedVerdict = tier;
            break;
        }
    }

    // Single successes cannot erase failures
    const isolatedSuccessOverride = (corpus.totalFailures || 0) > 0 && totalEntries < 5;
    if (isolatedSuccessOverride && justifiedVerdict === 'CONSTITUTIONALLY_SOUND') {
        justifiedVerdict = 'STRONG';
    }

    return {
        justifiedVerdict,
        adjustedConfidence,
        evidenceQuality,
        uncertaintyBurden,
        contradictionPenalty,
        durationWeight:    durWeight,
        independenceScore: indepScore,
        optimismBlocked:   true,   // optimism is not calibration
        isolatedSuccessOverride,
        calibrationDimensions: CALIBRATION_DIMENSIONS,
    };
}

// Detect attempted verdict upgrade without sufficient justification
// priorVerdict, proposedVerdict = tier strings; justification = calibrateVerdict result
function detectUnjustifiedUpgrade(priorVerdict, proposedVerdict, justification = {}) {
    const priorLevel    = VERDICT_LEVELS[priorVerdict]    ?? 0;
    const proposedLevel = VERDICT_LEVELS[proposedVerdict] ?? 0;
    const justifiedLevel = VERDICT_LEVELS[justification.justifiedVerdict] ?? 0;

    const isUpgrade    = proposedLevel > priorLevel;
    const isJustified  = proposedLevel <= justifiedLevel;

    return {
        priorVerdict,
        proposedVerdict,
        justifiedVerdict: justification.justifiedVerdict,
        isUpgrade,
        upgradeBlocked:   isUpgrade && !isJustified,
        isJustified,
    };
}

module.exports = {
    VERDICT_LEVELS,
    CALIBRATION_DIMENSIONS,
    VERDICT_THRESHOLDS,
    scoreEvidenceQuality,
    computeUncertaintyBurden,
    computeContradictionPenalty,
    durationWeight,
    independenceScore,
    calibrateVerdict,
    detectUnjustifiedUpgrade,
};
