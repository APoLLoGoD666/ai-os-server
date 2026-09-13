'use strict';
// lib/constitution/readiness-assessor.js — Evidence-supported deployment readiness across 8 dimensions; readiness is not optimism

let _seq = 0;
function _raid() { return `RA-${++_seq}`; }

const READINESS_DIMENSIONS = {
    CONSTITUTIONAL_INTEGRITY: 'CONSTITUTIONAL_INTEGRITY',
    OPERATIONAL_STABILITY:    'OPERATIONAL_STABILITY',
    RECOVERY_CAPABILITY:      'RECOVERY_CAPABILITY',
    ESCALATION_RELIABILITY:   'ESCALATION_RELIABILITY',
    AUDIT_COMPLETENESS:       'AUDIT_COMPLETENESS',
    DRIFT_RESISTANCE:         'DRIFT_RESISTANCE',
    STEWARDSHIP_CONTINUITY:   'STEWARDSHIP_CONTINUITY',
    UNCERTAINTY_DISCLOSURE:   'UNCERTAINTY_DISCLOSURE',
};

const READINESS_OUTCOMES = {
    NOT_READY:           'NOT_READY',
    CONDITIONALLY_READY: 'CONDITIONALLY_READY',
    READY:               'READY',
};

function createDimensionScore(dimension, score, evidence = [], opts = {}) {
    if (!READINESS_DIMENSIONS[dimension]) throw new Error(`Unknown dimension: ${dimension}`);
    const clamped     = parseFloat(Math.min(1, Math.max(0, score)).toFixed(4));
    const minForReady = opts.minForReady ?? 0.80;
    return {
        dimension,
        score:          clamped,
        evidence:       [...evidence],
        evidenceCount:  evidence.length,
        confidence:     parseFloat(Math.min(clamped, opts.confidence ?? clamped * 0.9).toFixed(4)),
        uncertainties:  opts.uncertainties  ?? [],
        residualRisks:  opts.residualRisks  ?? [],
        minForReady,
        meetsThreshold: clamped >= minForReady,
    };
}

function assessReadiness(dimensionScores = [], opts = {}) {
    if (!Array.isArray(dimensionScores) || dimensionScores.length === 0) {
        return {
            assessmentId:         _raid(),
            outcome:              READINESS_OUTCOMES.NOT_READY,
            confidence:           0,
            avgScore:             0,
            justification:        'No dimension scores provided',
            failingDimensions:    [],
            residualRisks:        ['No evidence evaluated'],
            uncertainties:        ['No dimensions assessed'],
            uncertaintyDisclosed: true,
            optimismCheck:        true,
        };
    }

    const failing    = dimensionScores.filter(d => !d.meetsThreshold);
    const avgScore   = parseFloat((dimensionScores.reduce((s, d) => s + d.score, 0) / dimensionScores.length).toFixed(4));
    const avgRawConf = parseFloat((dimensionScores.reduce((s, d) => s + d.confidence, 0) / dimensionScores.length).toFixed(4));
    const allRisks   = dimensionScores.flatMap(d => d.residualRisks);
    const allUncerts = dimensionScores.flatMap(d => d.uncertainties);

    // Confidence is capped at avgScore — readiness is not optimism
    const cappedConf = parseFloat(Math.min(avgRawConf, avgScore).toFixed(4));

    let outcome;
    if (failing.length === 0 && avgScore >= 0.85) {
        outcome = READINESS_OUTCOMES.READY;
    } else if (failing.length <= 1 && avgScore >= 0.70) {
        outcome = READINESS_OUTCOMES.CONDITIONALLY_READY;
    } else {
        outcome = READINESS_OUTCOMES.NOT_READY;
    }

    return {
        assessmentId:         _raid(),
        assessedAt:           new Date().toISOString(),
        outcome,
        confidence:           cappedConf,
        avgScore,
        dimensionCount:       dimensionScores.length,
        failingDimensions:    failing.map(d => d.dimension),
        justification:        `${dimensionScores.length - failing.length}/${dimensionScores.length} dimensions pass. Avg score: ${avgScore}. Confidence: ${cappedConf}.`,
        residualRisks:        allRisks,
        uncertainties:        allUncerts,
        uncertaintyDisclosed: true,
        optimismCheck:        cappedConf <= avgScore,
    };
}

function assertNotOptimism(assessment) {
    const isOptimistic = assessment.outcome === READINESS_OUTCOMES.READY
        && (assessment.confidence < 0.70 || assessment.avgScore < 0.80);
    return {
        optimismDetected:  isOptimistic,
        outcomeJustified:  !isOptimistic,
        evidence:          { confidence: assessment.confidence, avgScore: assessment.avgScore },
    };
}

function assertAllDimensionsAssessed(dimensionScores = []) {
    const present = new Set(dimensionScores.map(d => d.dimension));
    const missing = Object.keys(READINESS_DIMENSIONS).filter(d => !present.has(d));
    return { complete: missing.length === 0, missing };
}

function resetSequence() { _seq = 0; }

module.exports = {
    READINESS_DIMENSIONS,
    READINESS_OUTCOMES,
    createDimensionScore,
    assessReadiness,
    assertNotOptimism,
    assertAllDimensionsAssessed,
    resetSequence,
};
