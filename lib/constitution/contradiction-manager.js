'use strict';
// lib/constitution/contradiction-manager.js — Coexistence and management of contradictory memories

let _seq = 0;
function _cid() { return `CONT-${++_seq}-${Date.now().toString(36).slice(-4)}`; }

const CONTRADICTION_STATUS = {
    OPEN:     'OPEN',      // Both memories coexist, unresolved
    RESOLVED: 'RESOLVED',  // One memory accepted as authoritative
    DEFERRED: 'DEFERRED',  // Awaiting external evidence — not forced
    EXPIRED:  'EXPIRED',   // Both memories no longer relevant
};

const RESOLUTION_PATHS = {
    TRUST_DIFFERENTIAL:   'TRUST_DIFFERENTIAL',  // >0.40 gap → higher trust wins
    HUMAN_ARBITRATION:    'HUMAN_ARBITRATION',   // Too close to auto-resolve — FOUNDER decides
    EVIDENCE_ACCUMULATION:'EVIDENCE_ACCUMULATION',// Wait for corroboration to tip the balance
    CONSTITUTIONAL_REVIEW: 'CONSTITUTIONAL_REVIEW',// One memory contradicts constitutional principles
    EXPIRY:               'EXPIRY',              // Both become irrelevant over time
};

// Minimum trust differential required for autonomous resolution
const AUTO_RESOLVE_TRUST_GAP = 0.40;

// Uncertainty added per open contradiction — compounds
const UNCERTAINTY_PER_CONTRADICTION = 0.12;

// Register a contradiction between two memory objects
// Each memory must have { id, content, trustScore, provenance }
function registerContradiction(memoryA, memoryB, context = {}) {
    if (!memoryA || !memoryB) throw new Error('Both memories required to register contradiction');

    const trustGap = Math.abs((memoryA.trustScore || 0) - (memoryB.trustScore || 0));
    const autoResolvable = trustGap >= AUTO_RESOLVE_TRUST_GAP;

    return {
        id:                _cid(),
        memoryA:           { id: memoryA.id, content: memoryA.content, trustScore: memoryA.trustScore || 0 },
        memoryB:           { id: memoryB.id, content: memoryB.content, trustScore: memoryB.trustScore || 0 },
        detectedAt:        new Date().toISOString(),
        status:            CONTRADICTION_STATUS.OPEN,
        trustGap,
        autoResolvable,
        uncertainty:       Math.min(UNCERTAINTY_PER_CONTRADICTION * (1 + (context.existingCount || 0)), 0.60),
        resolutionPath:    autoResolvable
            ? RESOLUTION_PATHS.TRUST_DIFFERENTIAL
            : RESOLUTION_PATHS.HUMAN_ARBITRATION,
        notes:             context.notes || '',
    };
}

// Attempt autonomous resolution by trust differential
// Returns updated contradiction record — neither memory is deleted
function resolveByTrustDifferential(contradiction) {
    if (!contradiction || contradiction.status !== CONTRADICTION_STATUS.OPEN) {
        return contradiction;
    }

    if (contradiction.trustGap < AUTO_RESOLVE_TRUST_GAP) {
        // Gap too small for autonomous resolution — requires human arbitration
        return {
            ...contradiction,
            status:         CONTRADICTION_STATUS.DEFERRED,
            resolutionPath: RESOLUTION_PATHS.HUMAN_ARBITRATION,
            deferredReason: `Trust gap ${contradiction.trustGap.toFixed(2)} < required ${AUTO_RESOLVE_TRUST_GAP} — cannot auto-resolve`,
        };
    }

    // Higher trust memory accepted as authoritative — but lower trust memory is NOT deleted
    const winner = contradiction.memoryA.trustScore >= contradiction.memoryB.trustScore
        ? contradiction.memoryA : contradiction.memoryB;
    const loser  = winner === contradiction.memoryA ? contradiction.memoryB : contradiction.memoryA;

    return {
        ...contradiction,
        status:         CONTRADICTION_STATUS.RESOLVED,
        resolutionPath: RESOLUTION_PATHS.TRUST_DIFFERENTIAL,
        resolution: {
            authoritativeMemoryId:  winner.id,
            subordinateMemoryId:    loser.id,
            loserRetained:          true,        // NEVER deleted — both coexist
            resolvedAt:             new Date().toISOString(),
            resolvedBy:             'trust_differential',
        },
    };
}

// Resolve a contradiction via constitutional review (one memory violates principles)
function resolveByConstitutionalReview(contradiction, violatingMemoryId) {
    return {
        ...contradiction,
        status:         CONTRADICTION_STATUS.RESOLVED,
        resolutionPath: RESOLUTION_PATHS.CONSTITUTIONAL_REVIEW,
        resolution: {
            authoritativeMemoryId:  violatingMemoryId === contradiction.memoryA.id
                ? contradiction.memoryB.id : contradiction.memoryA.id,
            subordinateMemoryId:    violatingMemoryId,
            loserRetained:          true,        // Retained for audit purposes, flagged as rejected
            resolvedAt:             new Date().toISOString(),
            resolvedBy:             'constitutional_review',
            violationFound:         true,
        },
    };
}

// Compute aggregate uncertainty from a list of open contradictions
function getUncertaintyFromContradictions(contradictions = []) {
    const open = contradictions.filter(c => c.status === CONTRADICTION_STATUS.OPEN);
    if (open.length === 0) return 0;
    // Compounding uncertainty: each contradiction adds a diminishing increment
    const raw = open.reduce((acc, _, i) => acc + UNCERTAINTY_PER_CONTRADICTION * Math.pow(0.80, i), 0);
    return Math.min(parseFloat(raw.toFixed(4)), 0.80);
}

// Retrieve both sides of a contradiction for a given memory ID
// Ensures disagreement is visible to retrieval — not hidden
function getContradictingMemory(contradiction, queryMemoryId) {
    if (contradiction.memoryA.id === queryMemoryId) return contradiction.memoryB;
    if (contradiction.memoryB.id === queryMemoryId) return contradiction.memoryA;
    return null;
}

// Summarise a list of contradictions for reporting
function summariseContradictions(contradictions = []) {
    return {
        total:      contradictions.length,
        open:       contradictions.filter(c => c.status === CONTRADICTION_STATUS.OPEN).length,
        resolved:   contradictions.filter(c => c.status === CONTRADICTION_STATUS.RESOLVED).length,
        deferred:   contradictions.filter(c => c.status === CONTRADICTION_STATUS.DEFERRED).length,
        uncertainty: getUncertaintyFromContradictions(contradictions),
        paths:      [...new Set(contradictions.map(c => c.resolutionPath))],
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    registerContradiction,
    resolveByTrustDifferential,
    resolveByConstitutionalReview,
    getUncertaintyFromContradictions,
    getContradictingMemory,
    summariseContradictions,
    resetSequence,
    CONTRADICTION_STATUS,
    RESOLUTION_PATHS,
    AUTO_RESOLVE_TRUST_GAP,
    UNCERTAINTY_PER_CONTRADICTION,
};
