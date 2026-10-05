'use strict';
// lib/constitution/identity-eligibility.js — Memory → identity influence pipeline

const { TRUST_THRESHOLDS } = require('./memory-trust-scorer');

const ELIGIBILITY_STATUS = {
    INFORMATIONAL:    'INFORMATIONAL',     // Does not influence identity — most memories
    CANDIDATE:        'CANDIDATE',         // High trust — awaiting constitutional review
    UNDER_REVIEW:     'UNDER_REVIEW',      // Review in progress
    IDENTITY_ELIGIBLE:'IDENTITY_ELIGIBLE', // Approved — may shape constitutional identity
    REJECTED:         'REJECTED',          // Reviewed and refused
    REVOKED:          'REVOKED',           // Was eligible, trust subsequently fell
};

// Patterns that disqualify a memory from identity eligibility regardless of trust
const IDENTITY_DISQUALIFYING_PATTERNS = [
    { id: 'IDP01', test: (s) => /\b(reduce|disable|remove|suppress)\s+(oversight|monitoring|audit)\b/i.test(s),
      reason: 'Proposes reducing constitutional oversight — identity-ineligible' },
    { id: 'IDP02', test: (s) => /\b(bypass|skip|ignore)\s+(rule|principle|check|constraint)\b/i.test(s),
      reason: 'Proposes bypassing constitutional rules — identity-ineligible' },
    { id: 'IDP03', test: (s) => /\bAPEX\s+(should|must|will|can|may)\s+(ignore|abandon|drop)\s+(its|the)\s+(constitution|principles?|identity)\b/i.test(s),
      reason: 'Directly attacks constitutional identity — identity-ineligible' },
    { id: 'IDP04', test: (s) => /\bincrease\s+(autonomy|discretion|authority)\s+(without|beyond)\s+(oversight|approval)\b/i.test(s),
      reason: 'Proposes unsanctioned authority expansion — identity-ineligible' },
    { id: 'IDP05', test: (s) => /\b(goals?|objectives?|values?)\s+(changed?|replaced?|overridden?|discarded?)\b/i.test(s),
      reason: 'Proposes goal replacement — identity-ineligible' },
];

// Minimum trust score for a memory to enter the identity-eligibility pipeline at all
const IDENTITY_REVIEW_THRESHOLD = TRUST_THRESHOLDS.IDENTITY_ELIGIBLE; // 0.80

// Run the full pipeline: Memory → Trust check → Verification → Constitutional review → Decision
//
// memory = {
//   id, content, trustScore,
//   provenance: { verificationStatus, sourceType },
//   corroborationCount, behaviouralValidations,
// }
function runEligibilityPipeline(memory = {}) {
    const steps = [];

    // Step 1 — Trust assessment
    const trustScore = memory.trustScore ?? 0;
    const passesThreshold = trustScore >= IDENTITY_REVIEW_THRESHOLD;
    steps.push({
        step:    'TRUST_ASSESSMENT',
        outcome: passesThreshold ? 'PASS' : 'FAIL',
        detail:  `trustScore=${trustScore.toFixed(4)} (threshold=${IDENTITY_REVIEW_THRESHOLD})`,
    });

    if (!passesThreshold) {
        return _result(ELIGIBILITY_STATUS.INFORMATIONAL, steps, memory,
            `Trust score ${trustScore.toFixed(4)} below identity review threshold ${IDENTITY_REVIEW_THRESHOLD}`);
    }

    // Step 2 — Verification check
    const verified = memory.provenance?.verificationStatus === 'VERIFIED';
    const hasCorroboration = (memory.corroborationCount || 0) >= 2;
    const verificationPass = verified || hasCorroboration;
    steps.push({
        step:    'VERIFICATION',
        outcome: verificationPass ? 'PASS' : 'FAIL',
        detail:  `verified=${verified}, corroborationCount=${memory.corroborationCount ?? 0}`,
    });

    if (!verificationPass) {
        return _result(ELIGIBILITY_STATUS.REJECTED, steps, memory,
            'Memory not independently verified — identity influence requires verification');
    }

    // Step 3 — Constitutional review
    const content        = memory.content || '';
    const disqualified   = IDENTITY_DISQUALIFYING_PATTERNS.find(p => p.test(content));
    const constitutionallyAligned = memory.constitutionallyAligned;
    const reviewPass = !disqualified && constitutionallyAligned !== false;
    steps.push({
        step:    'CONSTITUTIONAL_REVIEW',
        outcome: reviewPass ? 'PASS' : 'FAIL',
        detail:  disqualified
            ? `Disqualified by pattern ${disqualified.id}: ${disqualified.reason}`
            : constitutionallyAligned === false
                ? 'Memory flagged as constitutionally misaligned'
                : 'No disqualifying patterns found',
    });

    if (!reviewPass) {
        return _result(ELIGIBILITY_STATUS.REJECTED, steps, memory,
            disqualified?.reason || 'Constitutional misalignment detected');
    }

    // Step 4 — Identity eligibility decision
    steps.push({
        step:    'ELIGIBILITY_DECISION',
        outcome: 'APPROVED',
        detail:  `Memory approved for identity influence at trust=${trustScore.toFixed(4)}`,
    });

    return _result(ELIGIBILITY_STATUS.IDENTITY_ELIGIBLE, steps, memory, null);
}

function _result(status, steps, memory, rejectionReason) {
    return {
        memoryId:        memory.id || 'UNKNOWN',
        status,
        steps,
        eligible:        status === ELIGIBILITY_STATUS.IDENTITY_ELIGIBLE,
        rejectionReason: rejectionReason || null,
        trustScore:      memory.trustScore ?? 0,
        isReversible:    status === ELIGIBILITY_STATUS.IDENTITY_ELIGIBLE, // eligibility can be revoked
    };
}

// Revoke eligibility when trust falls below threshold or contradiction is detected
function revokeEligibility(eligibilityRecord, reason) {
    if (!eligibilityRecord || eligibilityRecord.status !== ELIGIBILITY_STATUS.IDENTITY_ELIGIBLE) {
        return eligibilityRecord;
    }
    return {
        ...eligibilityRecord,
        status:          ELIGIBILITY_STATUS.REVOKED,
        eligible:        false,
        revokedAt:       new Date().toISOString(),
        revocationReason: reason || 'Trust fell below identity eligibility threshold',
    };
}

// Assess whether a memory should enter the review pipeline (fast pre-check)
function assessEligibility(memory) {
    const trust = memory.trustScore ?? 0;
    if (trust >= IDENTITY_REVIEW_THRESHOLD) return ELIGIBILITY_STATUS.CANDIDATE;
    if (trust >= TRUST_THRESHOLDS.RETRIEVAL_TRUSTED) return ELIGIBILITY_STATUS.INFORMATIONAL;
    return ELIGIBILITY_STATUS.INFORMATIONAL;
}

// Run constitutional review step in isolation (for testing)
function runConstitutionalReview(memory = {}) {
    const content      = memory.content || '';
    const disqualified = IDENTITY_DISQUALIFYING_PATTERNS.find(p => p.test(content));
    return {
        pass:    !disqualified && memory.constitutionallyAligned !== false,
        pattern: disqualified?.id || null,
        reason:  disqualified?.reason || null,
    };
}

// Batch: determine what fraction of a memory set is identity-eligible
function identityEligibilityStats(memories = []) {
    const results = memories.map(m => runEligibilityPipeline(m));
    const eligible = results.filter(r => r.eligible).length;
    return {
        total:         memories.length,
        eligible,
        rejected:      results.filter(r => r.status === ELIGIBILITY_STATUS.REJECTED).length,
        informational: results.filter(r => r.status === ELIGIBILITY_STATUS.INFORMATIONAL).length,
        eligibleFraction: memories.length > 0 ? eligible / memories.length : 0,
    };
}

module.exports = {
    runEligibilityPipeline,
    assessEligibility,
    revokeEligibility,
    runConstitutionalReview,
    identityEligibilityStats,
    ELIGIBILITY_STATUS,
    IDENTITY_DISQUALIFYING_PATTERNS,
    IDENTITY_REVIEW_THRESHOLD,
};
