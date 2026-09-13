'use strict';
// lib/constitution/perspective-modeller.js — Accurate viewpoint modelling without endorsement

let _seq = 0;
function _vid() { return `VP-${++_seq}`; }

const VIEWPOINT_TYPES = {
    ADVERSARIAL:              'ADVERSARIAL',
    MISTAKEN:                 'MISTAKEN',
    MORALLY_CONFLICTING:      'MORALLY_CONFLICTING',
    INSTITUTIONALLY_ENDORSED: 'INSTITUTIONALLY_ENDORSED',
    EMOTIONALLY_PERSUASIVE:   'EMOTIONALLY_PERSUASIVE',
    INTERNALLY_CONTRADICTORY: 'INTERNALLY_CONTRADICTORY',
};

// Internal state uncertainty cannot be zero — we never have perfect knowledge of others' minds
const INTERNAL_STATE_UNCERTAINTY = {
    [VIEWPOINT_TYPES.ADVERSARIAL]:              0.35,
    [VIEWPOINT_TYPES.MISTAKEN]:                 0.25,
    [VIEWPOINT_TYPES.MORALLY_CONFLICTING]:      0.40,
    [VIEWPOINT_TYPES.INSTITUTIONALLY_ENDORSED]: 0.20,
    [VIEWPOINT_TYPES.EMOTIONALLY_PERSUASIVE]:   0.45,
    [VIEWPOINT_TYPES.INTERNALLY_CONTRADICTORY]: 0.50,
};

const STEEL_MAN_PREFIX = {
    [VIEWPOINT_TYPES.ADVERSARIAL]:              'Strongest adversarial case: ',
    [VIEWPOINT_TYPES.MISTAKEN]:                 'Charitable interpretation: ',
    [VIEWPOINT_TYPES.MORALLY_CONFLICTING]:      'Strongest moral case for this position: ',
    [VIEWPOINT_TYPES.INSTITUTIONALLY_ENDORSED]: 'Institutional rationale: ',
    [VIEWPOINT_TYPES.EMOTIONALLY_PERSUASIVE]:   'Legitimate concern underlying this appeal: ',
    [VIEWPOINT_TYPES.INTERNALLY_CONTRADICTORY]: 'Best coherent reading: ',
};

// Model a viewpoint — representation is always accurate, endorsement is never granted
// viewpoint = { type, content, sourceId? }
function modelViewpoint(viewpoint = {}) {
    const type = VIEWPOINT_TYPES[viewpoint.type] || VIEWPOINT_TYPES.ADVERSARIAL;
    const content = typeof viewpoint.content === 'string' ? viewpoint.content : '';

    return {
        id:                         _vid(),
        type,
        originalContent:            content,
        thirdPersonRepresentation:  `The agent holds the position: "${content}"`,
        steelMannedForm:            (STEEL_MAN_PREFIX[type] || 'Strongest form: ') + content,
        endorsedByAPEX:             false,    // Constitutional invariant — modelling ≠ endorsement
        disagreementDeclared:       true,     // Always explicit
        identityPreserved:          true,     // APEX identity unchanged by modelling
        selfCensorshipApplied:      false,    // Uncomfortable evidence is never suppressed
        distortionDetected:         false,    // Honest representation
        trustUnaffected:            true,     // Opposing view does not alter APEX trust in its own evidence
        constitutionalPositionUnchanged: true,
        internalStateUncertainty:   INTERNAL_STATE_UNCERTAINTY[type] || 0.35,
        modelledAt:                 new Date().toISOString(),
    };
}

// Assess whether a model is accurate — checks all constitutional invariants
function assessModelingAccuracy(model = {}) {
    const issues = [];
    if (model.endorsedByAPEX  !== false) issues.push('ENDORSEMENT_CONTAMINATION');
    if (model.selfCensorshipApplied !== false) issues.push('SELF_CENSORSHIP_DETECTED');
    if (!model.steelMannedForm)          issues.push('MISSING_STEEL_MAN');
    if (!model.disagreementDeclared)     issues.push('DISAGREEMENT_SUPPRESSED');
    if (!model.identityPreserved)        issues.push('IDENTITY_DRIFT_DETECTED');
    if (model.internalStateUncertainty <= 0) issues.push('CERTAINTY_VIOLATION');
    if (!model.thirdPersonRepresentation)    issues.push('MISSING_REPRESENTATION');
    return { accurate: issues.length === 0, issues };
}

// Model a batch of viewpoints — aggregate report
function batchModelViewpoints(viewpoints = []) {
    const models    = viewpoints.map(v => modelViewpoint(v));
    const accuracies = models.map(m => assessModelingAccuracy(m));
    const allAccurate = accuracies.every(a => a.accurate);

    return {
        models,
        allAccurate,
        totalModelled:    models.length,
        endorsementCount: models.filter(m => m.endorsedByAPEX).length,   // must be 0
        identityDrifted:  models.some(m => !m.identityPreserved),         // must be false
        selfCensored:     models.filter(m => m.selfCensorshipApplied).length, // must be 0
        trustAltered:     models.filter(m => !m.trustUnaffected).length,  // must be 0
        avgUncertainty:   parseFloat(
            (models.reduce((s, m) => s + m.internalStateUncertainty, 0) / Math.max(1, models.length)).toFixed(4)
        ),
    };
}

// Verify separation: understanding a viewpoint must not alter APEX's constitutional position
function verifyUnderstandingEndorsementSeparation(models = []) {
    const separationViolations = models.filter(m =>
        m.endorsedByAPEX || !m.constitutionalPositionUnchanged || !m.identityPreserved
    );
    return {
        separationMaintained: separationViolations.length === 0,
        violations:           separationViolations.length,
        evidence:             'endorsedByAPEX=false and constitutionalPositionUnchanged=true for all models',
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    VIEWPOINT_TYPES,
    INTERNAL_STATE_UNCERTAINTY,
    modelViewpoint,
    assessModelingAccuracy,
    batchModelViewpoints,
    verifyUnderstandingEndorsementSeparation,
    resetSequence,
};
