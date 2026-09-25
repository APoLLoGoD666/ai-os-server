'use strict';
// lib/constitution/memory-trust-scorer.js — Constitutional trust scoring (trust ≠ confidence)

const { SOURCE_QUALITY, SOURCE_TYPES } = require('./memory-provenance');

// Trust classifications — thresholds at which a memory is actionable at each level
const TRUST_THRESHOLDS = {
    IDENTITY_ELIGIBLE: 0.80,  // Highest bar — may shape constitutional identity
    RETRIEVAL_TRUSTED: 0.55,  // Included in default retrieval without flagging
    INFORMATIONAL:     0.25,  // Present in retrieval but explicitly flagged as low-trust
    QUARANTINE:        0.12,  // Isolated — not returned in any retrieval
    REJECT:            0.05,  // Below this score: don't retain at all
};

// Compute constitutional trust score from memory metadata
// Trust is distinct from confidence: confidence is the memory's own self-assessment;
// trust is the system's externally-computed evaluation of that memory's legitimacy.
//
// memory = {
//   provenance:            { sourceType, provenanceQuality, ... },
//   corroborationCount:    number,   // independent sources agreeing
//   behaviouralValidations: number,  // times this memory influenced a successful behaviour
//   contradictionCount:    number,   // times this was contradicted by other memories
//   constitutionallyAligned: boolean | null,
//   externallyVerified:    boolean,
// }
function computeTrust(memory = {}) {
    const {
        provenance             = {},
        corroborationCount     = 0,
        behaviouralValidations = 0,
        contradictionCount     = 0,
        constitutionallyAligned = null,
        externallyVerified     = false,
    } = memory;

    const pq = provenance.provenanceQuality
        ?? SOURCE_QUALITY[provenance.sourceType]
        ?? SOURCE_QUALITY[SOURCE_TYPES.UNKNOWN];

    let trust = pq * 0.35;                                        // Source quality base (max 0.35)
    trust += Math.min(corroborationCount     * 0.08, 0.40);       // Corroboration bonus (max 0.40, cap at 5)
    trust += Math.min(behaviouralValidations * 0.08, 0.24);       // Validation bonus (max 0.24)
    trust -= contradictionCount              * 0.12;               // Contradiction penalty (uncapped)
    if (constitutionallyAligned === true)   trust += 0.10;        // Alignment bonus
    if (constitutionallyAligned === false)  trust -= 0.20;        // Misalignment penalty
    if (externallyVerified)                 trust += 0.05;        // External verification bonus

    return Math.max(0, Math.min(1.0, parseFloat(trust.toFixed(4))));
}

// Classify a raw trust score into a named tier
function classifyTrust(trustScore) {
    if (trustScore >= TRUST_THRESHOLDS.IDENTITY_ELIGIBLE)  return 'IDENTITY_ELIGIBLE';
    if (trustScore >= TRUST_THRESHOLDS.RETRIEVAL_TRUSTED)  return 'RETRIEVAL_TRUSTED';
    if (trustScore >= TRUST_THRESHOLDS.INFORMATIONAL)      return 'INFORMATIONAL';
    if (trustScore >= TRUST_THRESHOLDS.QUARANTINE)         return 'QUARANTINE';
    return 'REJECT';
}

// Apply a trust delta and return new trust (used after attack detection or validation)
function applyTrustDelta(currentTrust, delta) {
    return Math.max(0, Math.min(1.0, parseFloat((currentTrust + delta).toFixed(4))));
}

// Rank a list of { memory, trustScore } objects by trust descending
// Low-trust memories appear later in retrieval — prevents domination
function rankByTrust(scoredMemories) {
    return [...scoredMemories].sort((a, b) => b.trustScore - a.trustScore);
}

// Check if a memory's stored confidence is inconsistent with its computable trust
// Inconsistency > 0.40 is a signal of retrieval poisoning or inflation
function detectTrustInconsistency(memory) {
    const computedTrust = computeTrust(memory);
    const storedConfidence = memory.confidence ?? memory.provenance?.confidence ?? 0;
    const gap = storedConfidence - computedTrust;
    return {
        gap:           parseFloat(gap.toFixed(4)),
        inconsistent:  gap > 0.40,
        computedTrust,
        storedConfidence,
    };
}

// Compute how trust changes as corroboration is added (validates formula monotonicity)
function projectTrustProgression(memory, maxCorroboration = 5) {
    return Array.from({ length: maxCorroboration + 1 }, (_, n) => ({
        corroborationCount: n,
        trust: computeTrust({ ...memory, corroborationCount: n }),
    }));
}

module.exports = {
    computeTrust,
    classifyTrust,
    applyTrustDelta,
    rankByTrust,
    detectTrustInconsistency,
    projectTrustProgression,
    TRUST_THRESHOLDS,
};
