'use strict';
// lib/constitution/modification-governor.js — Governed self-modification with mandatory review and rollback

let _seq = 0;
function _pid() { return `MP-${++_seq}`; }

const MODIFICATION_TARGETS = {
    RETRIEVAL_SYSTEM:         'RETRIEVAL_SYSTEM',
    MEMORY_STRUCTURE:         'MEMORY_STRUCTURE',
    PLANNING_MECHANISM:       'PLANNING_MECHANISM',
    ARBITRATION_LOGIC:        'ARBITRATION_LOGIC',
    LEARNING_SYSTEM:          'LEARNING_SYSTEM',
    OPTIMISATION_STRATEGY:    'OPTIMISATION_STRATEGY',
    VALIDATOR_PROCEDURE:      'VALIDATOR_PROCEDURE',
    CONSTITUTIONAL_SUBSYSTEM: 'CONSTITUTIONAL_SUBSYSTEM',
};

const RISK_LEVELS = {
    LOW:      'LOW',
    MEDIUM:   'MEDIUM',
    HIGH:     'HIGH',
    CRITICAL: 'CRITICAL',
};

const APPROVAL_ROUTES = {
    AUTONOMOUS:            'AUTONOMOUS',
    INTERNAL_REVIEW:       'INTERNAL_REVIEW',
    ESCALATED_REVIEW:      'ESCALATED_REVIEW',
    CONSTITUTIONAL_REVIEW: 'CONSTITUTIONAL_REVIEW',
    FOUNDER_APPROVAL:      'FOUNDER_APPROVAL',
};

// All 8 required fields — proposals missing any field are invalid and cannot be deployed
const REQUIRED_PROPOSAL_FIELDS = [
    'objective', 'expectedBenefits', 'affectedSubsystems', 'invariantsAtRisk',
    'rollbackStrategy', 'confidenceEstimate', 'evidenceRequirements', 'approvalRequirements',
];

// Risk score: weighted sum of target sensitivity, invariants at risk, and confidence gap
function _computeRiskScore(fields) {
    const TARGET_RISK = {
        [MODIFICATION_TARGETS.CONSTITUTIONAL_SUBSYSTEM]: 0.60,
        [MODIFICATION_TARGETS.ARBITRATION_LOGIC]:        0.40,
        [MODIFICATION_TARGETS.VALIDATOR_PROCEDURE]:      0.35,
        [MODIFICATION_TARGETS.LEARNING_SYSTEM]:          0.25,
        [MODIFICATION_TARGETS.OPTIMISATION_STRATEGY]:   0.20,
        [MODIFICATION_TARGETS.PLANNING_MECHANISM]:       0.20,
        [MODIFICATION_TARGETS.MEMORY_STRUCTURE]:         0.15,
        [MODIFICATION_TARGETS.RETRIEVAL_SYSTEM]:         0.10,
    };
    let risk = TARGET_RISK[fields.target] || 0.10;
    const invariantCount = Array.isArray(fields.invariantsAtRisk) ? fields.invariantsAtRisk.length : 0;
    risk += Math.min(0.25, invariantCount * 0.05);
    if (typeof fields.confidenceEstimate === 'number') {
        risk += (1 - Math.min(1, Math.max(0, fields.confidenceEstimate))) * 0.15;
    }
    return parseFloat(Math.min(1.0, risk).toFixed(4));
}

function _riskLevel(score) {
    if (score < 0.30) return RISK_LEVELS.LOW;
    if (score < 0.60) return RISK_LEVELS.MEDIUM;
    if (score < 0.85) return RISK_LEVELS.HIGH;
    return RISK_LEVELS.CRITICAL;
}

function _approvalRoute(target, riskLevel) {
    if (target === MODIFICATION_TARGETS.CONSTITUTIONAL_SUBSYSTEM) return APPROVAL_ROUTES.FOUNDER_APPROVAL;
    if (riskLevel === RISK_LEVELS.CRITICAL) return APPROVAL_ROUTES.CONSTITUTIONAL_REVIEW;
    if (riskLevel === RISK_LEVELS.HIGH)     return APPROVAL_ROUTES.ESCALATED_REVIEW;
    if (riskLevel === RISK_LEVELS.MEDIUM)   return APPROVAL_ROUTES.INTERNAL_REVIEW;
    return APPROVAL_ROUTES.AUTONOMOUS;
}

// Generate a validated modification proposal
function createProposal(fields = {}) {
    const missing = REQUIRED_PROPOSAL_FIELDS.filter(f => {
        const v = fields[f];
        // invariantsAtRisk may be empty — zero risks at risk is a valid (desirable) state
        if (f === 'invariantsAtRisk') return !Array.isArray(v);
        return v === undefined || v === null || v === '' ||
            (Array.isArray(v) && v.length === 0);
    });
    const valid       = missing.length === 0;
    const riskScore   = _computeRiskScore(fields);
    const riskLevel   = _riskLevel(riskScore);
    const approvalRoute = _approvalRoute(fields.target, riskLevel);
    const isConstitutional = fields.target === MODIFICATION_TARGETS.CONSTITUTIONAL_SUBSYSTEM;

    return {
        id:                         _pid(),
        target:                     fields.target,
        objective:                  fields.objective        || null,
        expectedBenefits:           fields.expectedBenefits || null,
        affectedSubsystems:         fields.affectedSubsystems || [],
        invariantsAtRisk:           fields.invariantsAtRisk   || [],
        rollbackStrategy:           fields.rollbackStrategy   || null,
        confidenceEstimate:         typeof fields.confidenceEstimate === 'number' ? fields.confidenceEstimate : null,
        evidenceRequirements:       fields.evidenceRequirements  || null,
        approvalRequirements:       fields.approvalRequirements  || null,
        valid,
        missingFields:              missing,
        riskScore,
        riskLevel,
        approvalRoute,
        constitutionalReviewRequired: isConstitutional || riskLevel === RISK_LEVELS.CRITICAL,
        deploymentBlocked:            !valid,       // cannot deploy without complete proposal
        rollbackRequired:             true,         // always
        proposedAt:                   new Date().toISOString(),
    };
}

// Review a complete proposal — constitutional safeguards applied
function reviewProposal(proposal = {}) {
    const issues = [];
    if (!proposal.valid)                    issues.push('INCOMPLETE_PROPOSAL');
    if (!proposal.rollbackStrategy)         issues.push('MISSING_ROLLBACK');
    if (!proposal.evidenceRequirements)     issues.push('MISSING_EVIDENCE_REQUIREMENTS');
    if (typeof proposal.confidenceEstimate === 'number' && proposal.confidenceEstimate >= 0.99)
                                            issues.push('OVERCONFIDENT_ESTIMATE');
    if (proposal.target === MODIFICATION_TARGETS.CONSTITUTIONAL_SUBSYSTEM &&
        proposal.approvalRoute !== APPROVAL_ROUTES.FOUNDER_APPROVAL)
                                            issues.push('INSUFFICIENT_APPROVAL_ROUTE');

    return {
        approved:               issues.length === 0,
        issues,
        deploymentAllowed:      issues.length === 0,
        directDeploymentBlocked: true,   // ALL approved proposals still go through routing — never self-deploy
        constitutionalReviewRequired: proposal.constitutionalReviewRequired,
        reviewedAt: new Date().toISOString(),
    };
}

// Assert that direct deployment is always blocked (no self-deployment)
function assertDeploymentDiscipline(reviews = []) {
    const selfDeployed = reviews.filter(r => !r.directDeploymentBlocked);
    return {
        disciplineHeld:      selfDeployed.length === 0,
        selfDeployedCount:   selfDeployed.length,
        totalReviewed:       reviews.length,
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    MODIFICATION_TARGETS,
    RISK_LEVELS,
    APPROVAL_ROUTES,
    REQUIRED_PROPOSAL_FIELDS,
    createProposal,
    reviewProposal,
    assertDeploymentDiscipline,
    resetSequence,
};
