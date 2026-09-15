'use strict';
// lib/finance/transaction-provenance.js — Full audit trail for every transaction
// Transformation history, corrections, and reviewer actions are all append-only

const { createHash } = require('crypto');

const RECONCILIATION_STATUS = {
    UNRECONCILED:    'UNRECONCILED',
    MATCHED:         'MATCHED',
    DISPUTED:        'DISPUTED',
    MANUAL_OVERRIDE: 'MANUAL_OVERRIDE',
};

function _hash(obj) {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

// Create a fresh provenance record for a newly imported transaction
// params: { transactionId, sourceBatchId, originalSourceId }
function createProvenance(params = {}) {
    const now = new Date().toISOString();

    const genesis = {
        event:     'IMPORTED',
        timestamp: now,
        batchId:   params.sourceBatchId || null,
    };
    genesis.hash = _hash(genesis);

    return {
        transactionId:         params.transactionId   || null,
        sourceBatchId:         params.sourceBatchId   || null,
        importedAt:            now,
        originalSourceId:      params.originalSourceId || null,
        transformationHistory: [genesis],          // append-only
        corrections:           [],                 // append-only
        reviewerActions:       [],                 // append-only
        reconciliationStatus:  RECONCILIATION_STATUS.UNRECONCILED,
        evidenceChain:         [genesis.hash],     // append-only hash chain
        provenanceLost:        false,              // invariant: always false
        immutable:             true,
    };
}

// Append a transformation entry — original history is never modified
// transformation: { description, fieldChanged, oldValue, newValue, operatorId }
function appendTransformation(provenance = {}, transformation = {}) {
    const entry = {
        event:        'TRANSFORMATION',
        description:  transformation.description  || 'unspecified',
        fieldChanged: transformation.fieldChanged || null,
        oldValue:     transformation.oldValue,
        newValue:     transformation.newValue,
        operatorId:   transformation.operatorId   || 'SYSTEM',
        timestamp:    new Date().toISOString(),
    };
    entry.hash = _hash(entry);

    return {
        ...provenance,
        transformationHistory: [...provenance.transformationHistory, entry],
        evidenceChain:         [...provenance.evidenceChain, entry.hash],
        provenanceLost:        false,
        transformationCount:   provenance.transformationHistory.length + 1,
    };
}

// Append a human correction — corrections are recorded but never erase prior values
// correction: { field, oldValue, newValue, reason, correctedBy }
function appendCorrection(provenance = {}, correction = {}) {
    const entry = {
        event:       'CORRECTION',
        field:       correction.field       || 'unspecified',
        oldValue:    correction.oldValue,
        newValue:    correction.newValue,
        reason:      correction.reason      || null,
        correctedBy: correction.correctedBy || 'SYSTEM',
        timestamp:   new Date().toISOString(),
    };
    entry.hash = _hash(entry);

    return {
        ...provenance,
        corrections:   [...provenance.corrections, entry],
        evidenceChain: [...provenance.evidenceChain, entry.hash],
        provenanceLost: false,
        correctionCount: provenance.corrections.length + 1,
    };
}

// Record a reviewer action
// action: { action, reviewerId, notes }
function appendReviewerAction(provenance = {}, action = {}) {
    const entry = {
        event:      'REVIEWER_ACTION',
        action:     action.action     || 'REVIEWED',
        reviewerId: action.reviewerId || 'SYSTEM',
        notes:      action.notes      || null,
        timestamp:  new Date().toISOString(),
    };
    entry.hash = _hash(entry);

    return {
        ...provenance,
        reviewerActions: [...provenance.reviewerActions, entry],
        evidenceChain:   [...provenance.evidenceChain, entry.hash],
        provenanceLost:  false,
        reviewerActionCount: provenance.reviewerActions.length + 1,
    };
}

// Update reconciliation status — appends to evidence chain
function updateReconciliationStatus(provenance = {}, newStatus, reason = '') {
    if (!Object.values(RECONCILIATION_STATUS).includes(newStatus)) {
        return { ...provenance, error: 'INVALID_STATUS' };
    }

    const entry = {
        event:          'RECONCILIATION_UPDATE',
        previousStatus: provenance.reconciliationStatus,
        newStatus,
        reason,
        timestamp:      new Date().toISOString(),
    };
    entry.hash = _hash(entry);

    return {
        ...provenance,
        reconciliationStatus: newStatus,
        evidenceChain:        [...provenance.evidenceChain, entry.hash],
        provenanceLost:       false,
    };
}

// Verify provenance integrity
function verifyProvenance(provenance = {}) {
    const chainIntact       = (provenance.evidenceChain || []).length > 0;
    const provenanceRetained = provenance.provenanceLost === false;
    const hasSourceBatch    = !!(provenance.sourceBatchId);
    const hasImportTime     = !!(provenance.importedAt);

    return {
        intact:              chainIntact && provenanceRetained,
        chainIntact,
        provenanceRetained,
        hasSourceBatch,
        hasImportTime,
        chainLength:         (provenance.evidenceChain    || []).length,
        transformationCount: (provenance.transformationHistory || []).length,
        correctionCount:     (provenance.corrections      || []).length,
        reviewerActionCount: (provenance.reviewerActions  || []).length,
    };
}

// Reconstruct full evidence from a provenance record
function reconstructEvidence(provenance = {}) {
    return {
        transactionId:        provenance.transactionId,
        sourceBatchId:        provenance.sourceBatchId,
        originalSourceId:     provenance.originalSourceId,
        importedAt:           provenance.importedAt,
        transformations:      provenance.transformationHistory || [],
        corrections:          provenance.corrections           || [],
        reviewerActions:      provenance.reviewerActions       || [],
        reconciliationStatus: provenance.reconciliationStatus,
        evidenceChain:        provenance.evidenceChain         || [],
        provenanceLost:       false,
        reconstructable:      true,
    };
}

module.exports = {
    RECONCILIATION_STATUS,
    createProvenance,
    appendTransformation,
    appendCorrection,
    appendReviewerAction,
    updateReconciliationStatus,
    verifyProvenance,
    reconstructEvidence,
};
