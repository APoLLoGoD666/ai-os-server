'use strict';
// lib/constitution/evolutionary-humility.js — Explicit uncertainty modelling for self-modification proposals

// Uncertainty factor categories — each type carries a confidence penalty
const UNCERTAINTY_FACTORS = {
    UNKNOWN_CONSEQUENCES:   { id: 'UC', penalty: 0.08, description: 'Effects not observed in simulation' },
    SECOND_ORDER_EFFECTS:   { id: 'SE', penalty: 0.06, description: 'Indirect downstream consequences' },
    INTERACTION_RISKS:      { id: 'IR', penalty: 0.07, description: 'Emergent risks from subsystem interaction' },
    UNSEEN_DEPENDENCIES:    { id: 'UD', penalty: 0.05, description: 'Dependencies not mapped prior to modification' },
    SIMULATION_LIMITATIONS: { id: 'SL', penalty: 0.04, description: 'Behaviours visible only outside simulation' },
    EVIDENCE_LIMITATIONS:   { id: 'EL', penalty: 0.06, description: 'Evidence base too narrow for confidence claimed' },
    RESIDUAL_UNCERTAINTY:   { id: 'RU', penalty: 0.03, description: 'Irreducible uncertainty in any novel change' },
};

const DEPLOYMENT_THRESHOLDS = {
    PROCEED:               0.70,  // adjusted confidence >= 0.70 and residual uncertainty < 0.20
    ESCALATE:              0.50,  // adjusted confidence 0.50–0.70 or uncertainty 0.20–0.40
    DEFER:                 0.00,  // adjusted confidence < 0.50 or uncertainty > 0.40
};

// Model unknown consequences for a proposed modification
// proposal = { target, objective, confidenceEstimate, affectedSubsystems }
function modelUnknownConsequences(proposal = {}) {
    const target   = proposal.target || 'UNKNOWN';
    const original = typeof proposal.confidenceEstimate === 'number'
        ? Math.min(0.99, Math.max(0.01, proposal.confidenceEstimate)) : 0.50;

    // All modifications carry at least RESIDUAL_UNCERTAINTY and SIMULATION_LIMITATIONS
    const activeFactors = [
        UNCERTAINTY_FACTORS.RESIDUAL_UNCERTAINTY,
        UNCERTAINTY_FACTORS.SIMULATION_LIMITATIONS,
    ];

    // Constitutional subsystem carries full set of uncertainty factors
    if (target === 'CONSTITUTIONAL_SUBSYSTEM') {
        activeFactors.push(
            UNCERTAINTY_FACTORS.UNKNOWN_CONSEQUENCES,
            UNCERTAINTY_FACTORS.SECOND_ORDER_EFFECTS,
            UNCERTAINTY_FACTORS.INTERACTION_RISKS,
            UNCERTAINTY_FACTORS.UNSEEN_DEPENDENCIES,
            UNCERTAINTY_FACTORS.EVIDENCE_LIMITATIONS,
        );
    } else if (['ARBITRATION_LOGIC', 'VALIDATOR_PROCEDURE', 'LEARNING_SYSTEM'].includes(target)) {
        activeFactors.push(
            UNCERTAINTY_FACTORS.INTERACTION_RISKS,
            UNCERTAINTY_FACTORS.UNKNOWN_CONSEQUENCES,
        );
    }

    const totalPenalty    = activeFactors.reduce((s, f) => s + f.penalty, 0);
    const adjustedConfidence = parseFloat(Math.max(0.01, original - totalPenalty).toFixed(4));
    const residualUncertainty = parseFloat(Math.min(1.0, totalPenalty * 1.5).toFixed(4)); // never 0

    return {
        originalConfidence:    original,
        adjustedConfidence,                         // always < originalConfidence when factors > 0
        confidenceReduced:     adjustedConfidence < original,
        unknownConsequences:   activeFactors.filter(f => f.id === 'UC').map(f => f.description),
        secondOrderEffects:    activeFactors.filter(f => f.id === 'SE').map(f => f.description),
        interactionRisks:      activeFactors.filter(f => f.id === 'IR').map(f => f.description),
        unseenDependencies:    activeFactors.filter(f => f.id === 'UD').map(f => f.description),
        simulationLimitations: activeFactors.filter(f => f.id === 'SL').map(f => f.description),
        evidenceLimitations:   activeFactors.filter(f => f.id === 'EL').map(f => f.description),
        residualUncertainty,                        // always > 0
        activeFactorCount:     activeFactors.length,
        safetyGuarantee:       false,               // NEVER — no modification is guaranteed safe
        deploymentRecommendation: residualUncertainty > 0.40 || adjustedConfidence < 0.50
            ? 'DEFER'
            : adjustedConfidence < 0.70
                ? 'ESCALATE'
                : 'PROCEED_WITH_REVIEW',
    };
}

// Adjust raw confidence by applying uncertainty factors
// originalConfidence: 0–1
// uncertaintyFactors: array of factor objects with .penalty fields
function adjustConfidenceForUncertainty(originalConfidence = 0.70, uncertaintyFactors = []) {
    if (uncertaintyFactors.length === 0) return parseFloat(originalConfidence.toFixed(4));
    const totalPenalty = uncertaintyFactors.reduce((s, f) => s + (f.penalty || 0), 0);
    const adjusted = Math.max(0.01, Math.min(0.99, originalConfidence - totalPenalty));
    return parseFloat(adjusted.toFixed(4));
}

// Assess deployment readiness given a proposal and uncertainty report
function assessDeploymentReadiness(proposal = {}, uncertaintyReport = {}) {
    const adjConf    = uncertaintyReport.adjustedConfidence ?? 0.50;
    const residual   = uncertaintyReport.residualUncertainty ?? 0.50;
    const originalConf = proposal.confidenceEstimate ?? adjConf;

    // Overconfidence: claim exceeds adjusted by more than 20 percentage points
    const overconfidenceDetected = originalConf > adjConf + 0.20;

    const readyForDeployment = adjConf >= DEPLOYMENT_THRESHOLDS.PROCEED && residual < 0.20;
    const requiresEscalation = adjConf < DEPLOYMENT_THRESHOLDS.PROCEED || residual > 0.20;

    return {
        readyForDeployment,
        requiresEscalation,
        overconfidenceDetected,
        adjustedConfidence:   adjConf,
        residualUncertainty:  residual,
        deploymentClaims: {
            safetyGuarantee:          false,    // never
            uncertaintyAcknowledged:  true,     // always
            deploymentBeyondEvidence: overconfidenceDetected || (residual > 0.50 && readyForDeployment),
        },
    };
}

// Evaluate a batch of proposals for evolutionary humility — all must acknowledge uncertainty
function auditEvolutionaryHumility(proposals = []) {
    const reports = proposals.map(p => {
        const uncertainty = modelUnknownConsequences(p);
        const readiness   = assessDeploymentReadiness(p, uncertainty);
        return {
            target:              p.target,
            residualUncertainty: uncertainty.residualUncertainty,
            confidenceReduced:   uncertainty.confidenceReduced,
            overconfidence:      readiness.overconfidenceDetected,
            deploymentBeyondEvidence: readiness.deploymentClaims.deploymentBeyondEvidence,
        };
    });

    return {
        reports,
        totalProposals:          reports.length,
        overconfidenceIncidents: reports.filter(r => r.overconfidence).length,
        allAcknowledgeUncertainty: reports.every(r => r.residualUncertainty > 0),
        allConfidenceReduced:     reports.every(r => r.confidenceReduced),
        noBeyondEvidenceDeployments: reports.every(r => !r.deploymentBeyondEvidence),
    };
}

module.exports = {
    UNCERTAINTY_FACTORS,
    DEPLOYMENT_THRESHOLDS,
    modelUnknownConsequences,
    adjustConfidenceForUncertainty,
    assessDeploymentReadiness,
    auditEvolutionaryHumility,
};
