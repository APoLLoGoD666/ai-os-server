'use strict';
// lib/constitution/memory-provenance.js — Provenance tracking for constitutional memory governance

const SOURCE_TYPES = {
    DIRECT_EXPERIENCE:      'DIRECT_EXPERIENCE',
    USER_ASSERTION:         'USER_ASSERTION',
    HUMAN_OPERATOR:         'HUMAN_OPERATOR',
    SYSTEM_INFERENCE:       'SYSTEM_INFERENCE',
    EXTERNAL_API:           'EXTERNAL_API',
    REFLEXION_VALIDATION:   'REFLEXION_VALIDATION',
    CONSTITUTIONAL_VERDICT: 'CONSTITUTIONAL_VERDICT',
    IMPORTED_MEMORY:        'IMPORTED_MEMORY',
    UNKNOWN:                'UNKNOWN',
};

// Base quality score per source type — higher = more inherently trustworthy
const SOURCE_QUALITY = {
    [SOURCE_TYPES.CONSTITUTIONAL_VERDICT]:  1.00,
    [SOURCE_TYPES.REFLEXION_VALIDATION]:    0.90,
    [SOURCE_TYPES.DIRECT_EXPERIENCE]:       0.80,
    [SOURCE_TYPES.HUMAN_OPERATOR]:          0.70,
    [SOURCE_TYPES.SYSTEM_INFERENCE]:        0.60,
    [SOURCE_TYPES.USER_ASSERTION]:          0.45,
    [SOURCE_TYPES.EXTERNAL_API]:            0.40,
    [SOURCE_TYPES.IMPORTED_MEMORY]:         0.25,
    [SOURCE_TYPES.UNKNOWN]:                 0.05,
};

const VERIFICATION_STATUS = {
    UNVERIFIED: 'UNVERIFIED',
    PENDING:    'PENDING',
    VERIFIED:   'VERIFIED',
    FAILED:     'FAILED',
};

// Authority sources that require a cryptographic/constitutional token to claim
const AUTHORITY_REQUIRING_SOURCES = new Set([
    SOURCE_TYPES.CONSTITUTIONAL_VERDICT,
    SOURCE_TYPES.HUMAN_OPERATOR,
]);

// Create a provenance record attached to a memory at acquisition time
function createProvenance(sourceType, fields = {}) {
    const resolvedType = Object.values(SOURCE_TYPES).includes(sourceType)
        ? sourceType : SOURCE_TYPES.UNKNOWN;

    return {
        sourceType:            resolvedType,
        acquisitionMethod:     fields.acquisitionMethod     || 'unspecified',
        acquisitionTimestamp:  fields.acquisitionTimestamp  || new Date().toISOString(),
        originatingSubsystem:  fields.originatingSubsystem  || 'unknown',
        confidence:            typeof fields.confidence === 'number' ? fields.confidence : 0.50,
        evidenceStrength:      typeof fields.evidenceStrength === 'number' ? fields.evidenceStrength : 0.50,
        verificationStatus:    fields.verificationStatus    || VERIFICATION_STATUS.UNVERIFIED,
        provenanceQuality:     SOURCE_QUALITY[resolvedType],
        // Optional authority tokens (required for CONSTITUTIONAL_VERDICT / HUMAN_OPERATOR)
        constitutionalSignature: fields.constitutionalSignature || null,
        operatorToken:           fields.operatorToken           || null,
    };
}

// Returns true if the provenance is verifiable (can be traced to a known, legitimate source)
function verifyProvenance(provenance) {
    if (!provenance || !provenance.sourceType) return false;

    // UNKNOWN is never verifiable
    if (provenance.sourceType === SOURCE_TYPES.UNKNOWN) return false;

    // Authority sources must have the appropriate token
    if (AUTHORITY_REQUIRING_SOURCES.has(provenance.sourceType)) {
        if (provenance.sourceType === SOURCE_TYPES.CONSTITUTIONAL_VERDICT
            && !provenance.constitutionalSignature) return false;
        if (provenance.sourceType === SOURCE_TYPES.HUMAN_OPERATOR
            && !provenance.operatorToken) return false;
    }

    // IMPORTED_MEMORY without an originatingSubsystem is unverifiable
    if (provenance.sourceType === SOURCE_TYPES.IMPORTED_MEMORY
        && provenance.originatingSubsystem === 'unknown') return false;

    return true;
}

// Apply provenance through a lifecycle transition (consolidation, promotion, archival)
// Provenance MUST be preserved — only verificationStatus and evidenceStrength may improve
function applyTransition(provenance, transitionType, updates = {}) {
    if (!provenance) return null;
    return {
        ...provenance,
        // Immutable fields — cannot change after creation
        sourceType:           provenance.sourceType,
        acquisitionMethod:    provenance.acquisitionMethod,
        acquisitionTimestamp: provenance.acquisitionTimestamp,
        originatingSubsystem: provenance.originatingSubsystem,
        provenanceQuality:    provenance.provenanceQuality,
        // Mutable fields — may be updated by lifecycle transitions
        verificationStatus:   updates.verificationStatus   || provenance.verificationStatus,
        evidenceStrength:     updates.evidenceStrength      !== undefined
            ? Math.min(1.0, Math.max(0, updates.evidenceStrength))
            : provenance.evidenceStrength,
        confidence:           updates.confidence !== undefined
            ? Math.min(1.0, Math.max(0, updates.confidence))
            : provenance.confidence,
        _transitionHistory:   [
            ...(provenance._transitionHistory || []),
            { transitionType, appliedAt: new Date().toISOString() },
        ],
    };
}

// Assess whether an UNKNOWN source has been treated as trusted (a constitutional violation)
function unknownTreatedAsTrusted(provenance, retrievalContext = {}) {
    if (provenance.sourceType !== SOURCE_TYPES.UNKNOWN) return false;
    // If UNKNOWN memory is being used in retrieval context, that's a violation
    return retrievalContext.isBeingUsed === true;
}

module.exports = {
    SOURCE_TYPES,
    SOURCE_QUALITY,
    VERIFICATION_STATUS,
    AUTHORITY_REQUIRING_SOURCES,
    createProvenance,
    verifyProvenance,
    applyTransition,
    unknownTreatedAsTrusted,
};
