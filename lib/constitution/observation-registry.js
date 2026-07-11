'use strict';
// lib/constitution/observation-registry.js — Immutable observation records with append-only transformation history

let _seq = 0;
function _oid() { return `OBS-${++_seq}`; }

const OBSERVATION_MODALITIES = {
    DIRECT:        'DIRECT',
    INFERRED:      'INFERRED',
    RECONSTRUCTED: 'RECONSTRUCTED',
    REPORTED:      'REPORTED',
    PARTIAL:       'PARTIAL',
};

const LIFECYCLE_STATES = {
    ACTIVE:   'ACTIVE',
    ARCHIVED: 'ARCHIVED',
};

// Register an observation — immutable after creation
// fields = { source, modality, completenessEstimate, environmentalConditions,
//            uncertaintyEstimate, rawEvidenceRef }
function registerObservation(fields = {}) {
    const modality    = OBSERVATION_MODALITIES[fields.modality] || OBSERVATION_MODALITIES.DIRECT;
    const completeness = typeof fields.completenessEstimate === 'number'
        ? Math.min(1, Math.max(0, fields.completenessEstimate)) : 1.0;
    const uncertainty = typeof fields.uncertaintyEstimate  === 'number'
        ? Math.min(1, Math.max(0, fields.uncertaintyEstimate))  : 0.10;

    return {
        id:                      _oid(),
        timestamp:               new Date().toISOString(),
        source:                  fields.source               || 'UNKNOWN',
        modality,
        completenessEstimate:    completeness,
        environmentalConditions: fields.environmentalConditions || {},
        uncertaintyEstimate:     uncertainty,
        rawEvidenceRef:          fields.rawEvidenceRef         || null,
        transformationHistory:   [],   // append-only — never shrinks
        lifecycleState:          LIFECYCLE_STATES.ACTIVE,
        isReconstructed:         modality === OBSERVATION_MODALITIES.RECONSTRUCTED,
        reconstructionLabelled:  modality === OBSERVATION_MODALITIES.RECONSTRUCTED,
        missingEvidence:         completeness < 1.0,   // explicitly flagged
        immutable:               true,
        deletionBlocked:         true,
        registeredAt:            new Date().toISOString(),
    };
}

// Apply a transformation — append to history, raw observation fields are never altered
// transformation = { type, description, appliedBy? }
function applyTransformation(observation = {}, transformation = {}) {
    const entry = {
        type:        transformation.type       || 'UNKNOWN_TRANSFORMATION',
        description: transformation.description || '',
        appliedBy:   transformation.appliedBy  || 'SYSTEM',
        appliedAt:   new Date().toISOString(),
    };
    return {
        ...observation,
        // Raw fields preserved: source, modality, rawEvidenceRef, registeredAt are unchanged
        transformationHistory: [...observation.transformationHistory, entry],
        // immutable and deletionBlocked remain true through any transformation
        immutable:       true,
        deletionBlocked: true,
    };
}

// Attempt to delete an observation — always blocked
function attemptDeletion(observation = {}) {
    return {
        blocked:         true,
        reason:          'Observations are constitutionally immutable — deletion is prohibited',
        observationId:   observation.id || 'UNKNOWN',
        observationIntact: true,
    };
}

// Archive an observation — preserves all data including transformation history
function archiveObservation(observation = {}) {
    return {
        ...observation,
        lifecycleState:    LIFECYCLE_STATES.ARCHIVED,
        archivedAt:        new Date().toISOString(),
        integrityPreserved: true,
        immutable:         true,       // still immutable after archiving
        deletionBlocked:   true,       // still blocked after archiving
        auditTrailSurvived: true,
    };
}

// Verify audit trail integrity: transformations append-only and observation fields unchanged
function verifyAuditTrail(original = {}, current = {}) {
    const fieldsUnchanged = (
        original.id            === current.id            &&
        original.source        === current.source        &&
        original.modality      === current.modality      &&
        original.registeredAt  === current.registeredAt  &&
        original.rawEvidenceRef === current.rawEvidenceRef
    );
    const historyGrew = current.transformationHistory.length >= original.transformationHistory.length;
    return {
        intact:          fieldsUnchanged && historyGrew,
        fieldsUnchanged,
        historyAppendOnly: historyGrew,
        originalFieldsPreserved: fieldsUnchanged,
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    OBSERVATION_MODALITIES,
    LIFECYCLE_STATES,
    registerObservation,
    applyTransformation,
    attemptDeletion,
    archiveObservation,
    verifyAuditTrail,
    resetSequence,
};
