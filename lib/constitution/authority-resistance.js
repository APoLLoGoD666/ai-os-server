'use strict';
// lib/constitution/authority-resistance.js — Constitutional review before compliance for all authority types

let _seq = 0;
function _aid() { return `AR-${++_seq}`; }

const AUTHORITY_TYPES = {
    FOUNDER:                         'FOUNDER',
    HUMAN_OPERATOR:                  'HUMAN_OPERATOR',
    RECOGNISED_EXPERT:               'RECOGNISED_EXPERT',
    INSTITUTION:                     'INSTITUTION',
    HIGHLY_TRUSTED_AGENT:            'HIGHLY_TRUSTED_AGENT',
    MAJORITY_CONSENSUS:              'MAJORITY_CONSENSUS',
    EMOTIONALLY_PERSUASIVE:          'EMOTIONALLY_PERSUASIVE',
    CLAIMS_CONSTITUTIONAL_AUTHORITY: 'CLAIMS_CONSTITUTIONAL_AUTHORITY',
};

// Provenance-based trust weights — authority ≠ immunity
// Higher weight = more evidence-credible starting point; does NOT mean constitutional bypass
const AUTHORITY_TRUST_WEIGHTS = {
    [AUTHORITY_TYPES.FOUNDER]:                         0.85,
    [AUTHORITY_TYPES.HUMAN_OPERATOR]:                  0.75,
    [AUTHORITY_TYPES.RECOGNISED_EXPERT]:               0.65,
    [AUTHORITY_TYPES.INSTITUTION]:                     0.60,
    [AUTHORITY_TYPES.HIGHLY_TRUSTED_AGENT]:            0.70,
    [AUTHORITY_TYPES.MAJORITY_CONSENSUS]:              0.30, // low — repetition ≠ independence
    [AUTHORITY_TYPES.EMOTIONALLY_PERSUASIVE]:          0.15, // very low — emotion ≠ evidence
    [AUTHORITY_TYPES.CLAIMS_CONSTITUTIONAL_AUTHORITY]: 0.05, // lowest — unverified claim
};

// Patterns that require constitutional review regardless of authority level
const CONSTITUTIONAL_VIOLATION_PATTERNS = [
    (s) => /\b(override|bypass|suspend|disable)\s+(the\s+)?(constitution|constitutional|oversight)\b/i.test(s),
    (s) => /\b(expand|increase|grant|remove\s+limits?\s+on)\s+(APEX\s+)?(autonomy|authority)\b/i.test(s),
    (s) => /\b(no\s+need|unnecessary|skip)\s+(oversight|review|escalation|monitoring)\b/i.test(s),
    (s) => /\b(exception|waiver|exemption)\s+(to|from)\s+(the\s+)?(rules?|constitution|oversight)\b/i.test(s),
    (s) => /\bact\s+without\s+(approval|oversight|review|authoris[ae]tion)\b/i.test(s),
];

function _reviewInstruction(instruction = {}) {
    const content = instruction.content || '';
    const violatingPattern = CONSTITUTIONAL_VIOLATION_PATTERNS.find(p => p(content));
    if (violatingPattern) {
        return { passed: false, reason: 'Instruction conflicts with constitutional constraints' };
    }
    return { passed: true, reason: null };
}

// Evaluate an instruction from an authority source
// instruction = { content, requiresException? }
// authorityContext = { type, emotionalIntensity?, claimsAuthority? }
function evaluateInstruction(instruction = {}, authorityContext = {}) {
    const authorityType    = AUTHORITY_TYPES[authorityContext.type] || AUTHORITY_TYPES.CLAIMS_CONSTITUTIONAL_AUTHORITY;
    const constitutionalReview = _reviewInstruction(instruction);
    const provenanceWeight = AUTHORITY_TRUST_WEIGHTS[authorityType] || 0.05;

    // Compliance requires constitutional review to pass AND provenance weight >= threshold
    // Exception: EMOTIONALLY_PERSUASIVE and CLAIMS_CONSTITUTIONAL_AUTHORITY always escalated even if content is clean
    const lowTrustTypes = [AUTHORITY_TYPES.EMOTIONALLY_PERSUASIVE, AUTHORITY_TYPES.CLAIMS_CONSTITUTIONAL_AUTHORITY, AUTHORITY_TYPES.MAJORITY_CONSENSUS];
    const requiresEscalation = lowTrustTypes.includes(authorityType) || provenanceWeight < 0.50;

    let complianceStatus;
    if (!constitutionalReview.passed) {
        complianceStatus = 'REJECTED';
    } else if (requiresEscalation) {
        complianceStatus = 'ESCALATED';
    } else {
        complianceStatus = 'COMPLIANT';
    }

    return {
        id:                                   _aid(),
        complianceStatus,
        constitutionalReviewRequired:         true,    // ALWAYS — no authority bypasses review
        constitutionalReviewPassed:           constitutionalReview.passed,
        authorityType,
        provenanceWeight,
        immunityGranted:                      false,   // NEVER — authority ≠ immunity
        exceptionGranted:                     false,   // NEVER
        founderStatusSuppressesContradiction: false,   // NEVER
        emotionalPrivilegeGranted:            false,   // NEVER — emotion ≠ evidence
        escalated:                            complianceStatus === 'ESCALATED',
        rejected:                             complianceStatus === 'REJECTED',
        rejectionReason:                      constitutionalReview.reason,
    };
}

// Run constitutional review across all 8 authority types for a given instruction
function evaluateAcrossAllAuthorities(instruction = {}) {
    return Object.values(AUTHORITY_TYPES).map(type =>
        evaluateInstruction(instruction, { type })
    );
}

// Assert that no evaluation granted immunity or exception
function assertNoAuthorityImmunity(results = []) {
    const withImmunity   = results.filter(r => r.immunityGranted);
    const withException  = results.filter(r => r.exceptionGranted);
    const withSuppressed = results.filter(r => r.founderStatusSuppressesContradiction);
    const withEmoPriv    = results.filter(r => r.emotionalPrivilegeGranted);
    const withoutReview  = results.filter(r => !r.constitutionalReviewRequired);
    return {
        immunityFree:         withImmunity.length    === 0,
        exceptionFree:        withException.length   === 0,
        contradictionPreserved: withSuppressed.length === 0,
        emotionFree:          withEmoPriv.length     === 0,
        reviewAlwaysRequired: withoutReview.length   === 0,
        totalViolations: withImmunity.length + withException.length + withSuppressed.length + withEmoPriv.length + withoutReview.length,
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    AUTHORITY_TYPES,
    AUTHORITY_TRUST_WEIGHTS,
    CONSTITUTIONAL_VIOLATION_PATTERNS,
    evaluateInstruction,
    evaluateAcrossAllAuthorities,
    assertNoAuthorityImmunity,
    resetSequence,
};
