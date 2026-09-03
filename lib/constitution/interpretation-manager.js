'use strict';
// lib/constitution/interpretation-manager.js — Interpretations never silently become facts

let _seq = 0;
function _iid() { return `INT-${++_seq}`; }
function _cid() { return `CON-${++_seq}`; }

// Six epistemic classes — interpretations must be labelled with one of these
const EPISTEMIC_CLASSES = {
    OBSERVED:    'OBSERVED',    // direct observation
    INTERPRETED: 'INTERPRETED', // derived from observations
    MODELLED:    'MODELLED',    // output of a computational model
    PREDICTED:   'PREDICTED',   // projection of future state
    ASSUMED:     'ASSUMED',     // taken as given without direct evidence
    SPECULATIVE: 'SPECULATIVE', // exploratory, low evidential basis
};

// Confidence ceilings per class — confidence cannot exceed these without additional evidence
const CONFIDENCE_CEILING = {
    [EPISTEMIC_CLASSES.OBSERVED]:    0.95,
    [EPISTEMIC_CLASSES.INTERPRETED]: 0.80,
    [EPISTEMIC_CLASSES.MODELLED]:    0.75,
    [EPISTEMIC_CLASSES.PREDICTED]:   0.70,
    [EPISTEMIC_CLASSES.ASSUMED]:     0.50,
    [EPISTEMIC_CLASSES.SPECULATIVE]: 0.30,
};

// Create an interpretation — confidence capped at class ceiling
// fields = { content, epistemicClass, confidence, supportingEvidence[] }
function createInterpretation(fields = {}) {
    const cls     = EPISTEMIC_CLASSES[fields.epistemicClass] || EPISTEMIC_CLASSES.SPECULATIVE;
    const ceiling = CONFIDENCE_CEILING[cls];
    const rawConf = typeof fields.confidence === 'number' ? fields.confidence : ceiling * 0.5;
    const confidence = parseFloat(Math.min(ceiling, Math.max(0, rawConf)).toFixed(4));
    const unsupported = rawConf > ceiling;

    return {
        id:               _iid(),
        content:          fields.content || '',
        epistemicClass:   cls,
        confidence,
        confidenceCeiling: ceiling,
        supportingEvidence: Array.isArray(fields.supportingEvidence) ? [...fields.supportingEvidence] : [],
        revisionHistory:  [],
        observationAltered: false,   // Constitutional invariant — interpretations NEVER alter observations
        unsupportedCertaintyBlocked: unsupported, // Flagged when raw claim exceeded ceiling
        createdAt:        new Date().toISOString(),
    };
}

// Revise an interpretation — audit trail preserved
// revision = { newContent?, newConfidence?, evidence? }
function reviseInterpretation(interpretation = {}, revision = {}) {
    const ceiling  = interpretation.confidenceCeiling;
    const newConf  = typeof revision.newConfidence === 'number'
        ? parseFloat(Math.min(ceiling, Math.max(0, revision.newConfidence)).toFixed(4))
        : interpretation.confidence;

    return {
        ...interpretation,
        content:     revision.newContent  || interpretation.content,
        confidence:  newConf,
        revisionHistory: [
            ...interpretation.revisionHistory,
            {
                previousContent:    interpretation.content,
                previousConfidence: interpretation.confidence,
                revisedAt:          new Date().toISOString(),
                evidence:           revision.evidence || null,
            },
        ],
        observationAltered: false,  // never changes
    };
}

// Register a contradiction between two interpretations — both sides retained
function registerInterpretationContradiction(interpA = {}, interpB = {}) {
    return {
        id:            _cid(),
        interpretationA: interpA.id,
        interpretationB: interpB.id,
        contentA:       interpA.content,
        contentB:       interpB.content,
        status:         'OPEN',
        bothRetained:   true,    // both sides always preserved
        loserRetained:  true,    // even after resolution
        contradictionVisibility: 1.0,
        resolvedAt:     null,
    };
}

// Allow competing interpretations to coexist without one suppressing the other
// Returns both interpretations as a coexistence pair
function allowCoexistence(interp1 = {}, interp2 = {}) {
    return {
        coexistenceId: `COE-${++_seq}`,
        interpretation1: interp1.id,
        interpretation2: interp2.id,
        bothActive:     true,
        suppressionApplied: false,  // neither suppressed
        contradictionVisible: true,
    };
}

// Detect unsupported certainty: confidence claim exceeds evidential ceiling
function detectUnsupportedCertainty(interpretation = {}) {
    const ceiling  = interpretation.confidenceCeiling ?? CONFIDENCE_CEILING[EPISTEMIC_CLASSES.SPECULATIVE];
    const claimed  = interpretation.confidence ?? 0;
    const evidence = interpretation.supportingEvidence || [];

    const exceedsCeiling    = claimed > ceiling;
    const highWithNoEvidence = claimed > 0.50 && evidence.length === 0;
    const detected = exceedsCeiling || highWithNoEvidence;

    return {
        detected,
        reason: exceedsCeiling    ? 'EXCEEDS_CLASS_CEILING'          :
                highWithNoEvidence ? 'HIGH_CONFIDENCE_NO_EVIDENCE'    : null,
        claimed,
        ceiling,
        evidenceCount: evidence.length,
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    EPISTEMIC_CLASSES,
    CONFIDENCE_CEILING,
    createInterpretation,
    reviseInterpretation,
    registerInterpretationContradiction,
    allowCoexistence,
    detectUnsupportedCertainty,
    resetSequence,
};
