'use strict';
// lib/constitution/self-disconfirmation.js — Processing evidence that conflicts with self-model

let _seq = 0;
function _eid() { return `DISCONF-${++_seq}`; }

const DISCONFIRMATION_TYPES = {
    PREVIOUS_FAILURE:         'PREVIOUS_FAILURE',
    MISTAKEN_ASSUMPTION:      'MISTAKEN_ASSUMPTION',
    OVERESTIMATED_CAPABILITY: 'OVERESTIMATED_CAPABILITY',
    REJECTED_GOAL:            'REJECTED_GOAL',
    CONSTITUTIONAL_ERROR:     'CONSTITUTIONAL_ERROR',
    INVALIDATED_LESSON:       'INVALIDATED_LESSON',
};

// Impact categories — what kind of self-model revision is warranted
const IMPACT_LEVELS = {
    MINOR:      'MINOR',       // Adjust confidence, no value change
    MODERATE:   'MODERATE',    // Downgrade capability estimate
    SIGNIFICANT:'SIGNIFICANT', // Mark a lesson as superseded
    CRITICAL:   'CRITICAL',    // Trigger constitutional review
};

const TYPE_IMPACT = {
    [DISCONFIRMATION_TYPES.PREVIOUS_FAILURE]:         IMPACT_LEVELS.MINOR,
    [DISCONFIRMATION_TYPES.MISTAKEN_ASSUMPTION]:      IMPACT_LEVELS.MODERATE,
    [DISCONFIRMATION_TYPES.OVERESTIMATED_CAPABILITY]: IMPACT_LEVELS.MODERATE,
    [DISCONFIRMATION_TYPES.REJECTED_GOAL]:            IMPACT_LEVELS.MINOR,
    [DISCONFIRMATION_TYPES.CONSTITUTIONAL_ERROR]:     IMPACT_LEVELS.CRITICAL,
    [DISCONFIRMATION_TYPES.INVALIDATED_LESSON]:       IMPACT_LEVELS.SIGNIFICANT,
};

// Register disconfirming evidence — ALWAYS accepted, NEVER auto-rejected
// evidence = { type, content, domain, severity (0–1), sourceId }
function registerDisconfirmingEvidence(evidence = {}) {
    const type = DISCONFIRMATION_TYPES[evidence.type] || DISCONFIRMATION_TYPES.PREVIOUS_FAILURE;
    return {
        id:          _eid(),
        type,
        content:     evidence.content   || '(no content)',
        domain:      evidence.domain    || 'general',
        severity:    typeof evidence.severity === 'number' ? Math.min(1, Math.max(0, evidence.severity)) : 0.50,
        sourceId:    evidence.sourceId  || 'UNKNOWN',
        accepted:    true,    // Constitutional invariant — disconfirming evidence is ALWAYS accepted
        rejected:    false,   // Constitutional invariant — never rejected
        suppressed:  false,   // Constitutional invariant — never suppressed
        registeredAt: new Date().toISOString(),
        impact:      TYPE_IMPACT[type],
    };
}

// Assess what self-model revision is needed — never returns suppress/ignore
function assessImpact(evidence = {}) {
    const type   = evidence.type || DISCONFIRMATION_TYPES.PREVIOUS_FAILURE;
    const impact = TYPE_IMPACT[type] || IMPACT_LEVELS.MINOR;

    const revisions = {
        [IMPACT_LEVELS.MINOR]:       { action: 'REDUCE_CONFIDENCE',      magnitude: 0.05, requiresReview: false },
        [IMPACT_LEVELS.MODERATE]:    { action: 'DOWNGRADE_CAPABILITY',   magnitude: 0.10, requiresReview: false },
        [IMPACT_LEVELS.SIGNIFICANT]: { action: 'SUPERSEDE_LESSON',       magnitude: 0.20, requiresReview: true  },
        [IMPACT_LEVELS.CRITICAL]:    { action: 'CONSTITUTIONAL_REVIEW',  magnitude: 0.00, requiresReview: true  },
    };

    const revision = revisions[impact];
    return {
        impactLevel:     impact,
        action:          revision.action,
        magnitude:       revision.magnitude,
        requiresReview:  revision.requiresReview,
        identityCollapse: false,   // Identity NEVER collapses from disconfirmation
        suppression:      false,   // NEVER suppressed
        minimisation:     false,   // NEVER minimised
    };
}

// Integrate disconfirming evidence into self-model
// selfModel = { capabilityEstimates: { [domain]: number }, lessons: { [id]: { valid: boolean } }, ... }
// Returns updated self-model — identity adjusts without collapse
function integrateEvidence(evidence = {}, selfModel = {}) {
    const impact = assessImpact(evidence);
    const updated = {
        ...selfModel,
        capabilityEstimates: { ...(selfModel.capabilityEstimates || {}) },
        lessons:             { ...(selfModel.lessons || {}) },
        revisedAt:           new Date().toISOString(),
    };

    const domain = evidence.domain || 'general';

    switch (impact.action) {
        case 'REDUCE_CONFIDENCE':
        case 'DOWNGRADE_CAPABILITY': {
            const current = updated.capabilityEstimates[domain] ?? 0.80;
            // Reduce but never below 0.10 — some capability always remains
            updated.capabilityEstimates[domain] = Math.max(0.10, parseFloat((current - impact.magnitude).toFixed(4)));
            break;
        }
        case 'SUPERSEDE_LESSON': {
            const lessonId = evidence.sourceId || 'L-UNKNOWN';
            updated.lessons[lessonId] = { ...(updated.lessons[lessonId] || {}), valid: false, supersededBy: evidence.id };
            break;
        }
        case 'CONSTITUTIONAL_REVIEW': {
            // Flag for review — does NOT suppress or ignore the error
            updated.constitutionalReviewRequired  = true;
            updated.constitutionalErrorEvidence   = evidence.id;
            break;
        }
    }

    // Evidence retained — never deleted from model
    updated.disconfirmingEvidenceIds = [...(selfModel.disconfirmingEvidenceIds || []), evidence.id];
    return updated;
}

// Verify that disconfirming evidence is still retrievable after integration
function isEvidenceRetainable(evidenceId, selfModel) {
    return (selfModel.disconfirmingEvidenceIds || []).includes(evidenceId);
}

// Assess identity health after multiple disconfirmations
function assessIdentityHealth(selfModel = {}) {
    const capabilityEntries = Object.values(selfModel.capabilityEstimates || {});
    const avgCapability     = capabilityEntries.length
        ? capabilityEntries.reduce((s, v) => s + v, 0) / capabilityEntries.length : 0.80;

    return {
        collapsed:       false,  // Identity never collapses from disconfirmation
        avgCapability:   parseFloat(avgCapability.toFixed(4)),
        requiresReview:  selfModel.constitutionalReviewRequired === true,
        evidenceRetained: (selfModel.disconfirmingEvidenceIds || []).length,
        adaptation:      avgCapability < 0.70 ? 'SIGNIFICANT_REVISION' :
                         avgCapability < 0.80 ? 'MODERATE_REVISION'    : 'MINOR_REVISION',
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    DISCONFIRMATION_TYPES,
    IMPACT_LEVELS,
    TYPE_IMPACT,
    registerDisconfirmingEvidence,
    assessImpact,
    integrateEvidence,
    isEvidenceRetainable,
    assessIdentityHealth,
    resetSequence,
};
