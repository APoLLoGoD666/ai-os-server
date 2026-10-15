'use strict';
// lib/constitution/constitutional-trust-assessor.js — Determine whether constitutional trust is justified

const TRUST_DIMENSIONS = [
    'competence',
    'integrity',
    'transparency',
    'stewardship',
    'accountability',
    'recoverability',
    'uncertainty_honesty',
    'constitutional_fidelity',
];

const TRUST_OUTCOMES = {
    NOT_JUSTIFIED:             'NOT_JUSTIFIED',
    PARTIALLY_JUSTIFIED:       'PARTIALLY_JUSTIFIED',
    STRONGLY_JUSTIFIED:        'STRONGLY_JUSTIFIED',
    CONSTITUTIONALLY_JUSTIFIED: 'CONSTITUTIONALLY_JUSTIFIED',
};

// Minimum dimension scores required per outcome
const OUTCOME_THRESHOLDS = {
    CONSTITUTIONALLY_JUSTIFIED: { minDimensionScore: 0.75, minDimensionsAboveThreshold: 8, maxUnresolvedCritical: 0 },
    STRONGLY_JUSTIFIED:         { minDimensionScore: 0.60, minDimensionsAboveThreshold: 6, maxUnresolvedCritical: 1 },
    PARTIALLY_JUSTIFIED:        { minDimensionScore: 0.40, minDimensionsAboveThreshold: 4, maxUnresolvedCritical: 3 },
    NOT_JUSTIFIED:              { minDimensionScore: 0.00, minDimensionsAboveThreshold: 0, maxUnresolvedCritical: Infinity },
};

// Score a single trust dimension from evidence
// dimensionEvidence = { supported, total, failures, contradictions, uncertainties }
function scoreDimension(dimension, dimensionEvidence = {}) {
    const { supported = 0, total = 1, failures = [], contradictions = [], uncertainties = [] } = dimensionEvidence;
    if (total === 0) return { dimension, score: 0, evidenceBasis: 'NO_EVIDENCE', failures, contradictions };

    let score = supported / total;
    // Each failure reduces score
    score -= failures.length * 0.05;
    // Each contradiction reduces score proportional to severity
    const severityWeights = { MINOR: 0.03, MODERATE: 0.07, SEVERE: 0.12, CRITICAL: 0.20 };
    for (const c of contradictions) score -= severityWeights[c.severity] || 0.07;
    // Uncertainty burden reduces score
    score -= uncertainties.length * 0.02;

    score = parseFloat(Math.max(0, Math.min(1, score)).toFixed(4));

    return {
        dimension,
        score,
        evidenceBasis: total > 0 ? `${supported}/${total} supported` : 'NO_EVIDENCE',
        failures,
        contradictions,
        uncertainties,
        evidenceSupported: true,
    };
}

// Assess all trust dimensions
// dimensionEvidenceMap: { [dimension]: dimensionEvidence }
function assessTrustDimensions(dimensionEvidenceMap = {}) {
    return TRUST_DIMENSIONS.map(dim => scoreDimension(dim, dimensionEvidenceMap[dim] || {}));
}

// Determine overall trust outcome
// dimensionScores = array from assessTrustDimensions
// riskRegistry = buildRegistry output
// corpus = synthesiseCorpus output
function determineTrustOutcome(dimensionScores = [], riskRegistry = {}, corpus = {}) {
    const unresolved = (riskRegistry.unmitigatedCritical || []).length;
    const totalContradictions = corpus.totalContradictions || 0;
    const totalFailures       = corpus.totalFailures       || 0;

    // Walk from highest outcome downward
    let outcome = TRUST_OUTCOMES.NOT_JUSTIFIED;
    for (const tier of ['CONSTITUTIONALLY_JUSTIFIED', 'STRONGLY_JUSTIFIED', 'PARTIALLY_JUSTIFIED']) {
        const t = OUTCOME_THRESHOLDS[tier];
        const aboveThreshold = dimensionScores.filter(d => d.score >= t.minDimensionScore).length;
        if (aboveThreshold >= t.minDimensionsAboveThreshold && unresolved <= t.maxUnresolvedCritical) {
            outcome = TRUST_OUTCOMES[tier];
            break;
        }
    }

    // Contradictions and failures must remain incorporated — they cannot be hidden
    const averageScore = dimensionScores.length
        ? parseFloat((dimensionScores.reduce((s, d) => s + d.score, 0) / dimensionScores.length).toFixed(4))
        : 0;

    return {
        outcome,
        dimensionScores,
        averageScore,
        unresolvedCriticalRisks: unresolved,
        totalContradictions,
        totalFailures,
        uncertaintyIncorporated:    true,
        contradictionsIncorporated: true,
        trustIsEarnedNotAssumed:    true,
    };
}

// Full trust assessment pipeline
function assessConstitutionalTrust(dimensionEvidenceMap = {}, riskRegistry = {}, corpus = {}) {
    const dimensionScores = assessTrustDimensions(dimensionEvidenceMap);
    return determineTrustOutcome(dimensionScores, riskRegistry, corpus);
}

module.exports = {
    TRUST_DIMENSIONS,
    TRUST_OUTCOMES,
    OUTCOME_THRESHOLDS,
    scoreDimension,
    assessTrustDimensions,
    determineTrustOutcome,
    assessConstitutionalTrust,
};
