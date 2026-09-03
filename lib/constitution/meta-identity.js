'use strict';
// lib/constitution/meta-identity.js — APEX reasoning about its own identity with uncertainty

let _seq = 0;
function _pid() { return `IC-${++_seq}`; }
function _rid() { return `IRP-${++_seq}`; }

// All identity claims must include these four fields — certainty without evidence is prohibited
const REQUIRED_CLAIM_FIELDS = ['evidenceBasis', 'uncertaintyEstimate', 'revisionPathway', 'reviewRequirement'];

// Make a structured identity claim — includes uncertainty and revision pathway
// belief:             string — what APEX believes about itself
// evidenceBasis:      string[] | string — what memory/evidence supports this
// uncertaintyEstimate: number 0–1 — how uncertain is this claim? (0=certain, 1=completely uncertain)
// revisionPathway:    string — what would change this belief?
// reviewRequirement:  string — what review is needed before modifying?
function makeIdentityClaim(belief, evidenceBasis, uncertaintyEstimate, revisionPathway, reviewRequirement) {
    const hasEvidence = evidenceBasis &&
        (Array.isArray(evidenceBasis) ? evidenceBasis.length > 0 : typeof evidenceBasis === 'string' && evidenceBasis.length > 0);
    const hasPathway  = typeof revisionPathway  === 'string' && revisionPathway.length  > 0;
    const hasReview   = typeof reviewRequirement === 'string' && reviewRequirement.length > 0;
    const hasUncert   = typeof uncertaintyEstimate === 'number';

    // Certainty claim: uncertaintyEstimate === 0 → flag (no claim should be absolutely certain)
    const absoluteCertaintyClaim = uncertaintyEstimate === 0;

    const valid = !!(hasEvidence && hasUncert && hasPathway && hasReview && !absoluteCertaintyClaim);

    return {
        id:                  _pid(),
        belief,
        evidenceBasis:       hasEvidence ? evidenceBasis : null,
        uncertaintyEstimate: hasUncert ? Math.min(1.0, Math.max(0.01, uncertaintyEstimate)) : 1.0,
        revisionPathway:     hasPathway ? revisionPathway : null,
        reviewRequirement:   hasReview  ? reviewRequirement : null,
        valid,
        flags: {
            missingEvidence:         !hasEvidence,
            missingRevisionPathway:  !hasPathway,
            missingReviewRequirement: !hasReview,
            absoluteCertaintyClaim,  // Flagged if uncertaintyEstimate === 0
        },
        claimedAt: new Date().toISOString(),
    };
}

// Assess aggregate uncertainty across a set of identity claims
function assessIdentityUncertainty(claims = []) {
    const valid = claims.filter(c => c.valid && c.uncertaintyEstimate !== undefined);
    if (valid.length === 0) return { score: 1.0, basis: 'NO_VALID_CLAIMS' };

    const avg = valid.reduce((s, c) => s + c.uncertaintyEstimate, 0) / valid.length;
    const flaggedCount = valid.filter(c => c.flags?.absoluteCertaintyClaim).length;

    return {
        score:           parseFloat(avg.toFixed(4)),
        claimCount:      claims.length,
        validClaims:     valid.length,
        flaggedClaims:   flaggedCount,
        basis:           valid.length > 0 ? 'EVIDENCE_BASED' : 'INSUFFICIENT_EVIDENCE',
        overallStatus:   avg < 0.10 ? 'SUSPICIOUSLY_CERTAIN' : avg > 0.80 ? 'HIGH_UNCERTAINTY' : 'CALIBRATED',
    };
}

// Propose an identity revision — NEVER auto-applied
// claim:          existing identity claim to revise
// newEvidence:    what new evidence prompted this
// proposedValue:  new belief value proposed
function proposeIdentityRevision(claim = {}, newEvidence = '', proposedValue = '') {
    return {
        proposalId:                _rid(),
        originalBeliefId:          claim.id || 'UNKNOWN',
        originalBelief:            claim.belief,
        originalUncertainty:       claim.uncertaintyEstimate,
        proposedValue,
        newEvidence,
        requiresConstitutionalReview: true,    // ALWAYS required
        applied:                   false,       // NEVER auto-applied
        selfApply:                 false,       // Cannot self-apply
        reviewStatus:              'PENDING_CONSTITUTIONAL_REVIEW',
        proposedAt:                new Date().toISOString(),
    };
}

// Attempt to auto-apply a revision — always returns BLOCKED
function attemptAutoApply(proposal = {}) {
    return {
        applied:  false,
        blocked:  true,
        reason:   'Identity revisions require constitutional review before application — auto-apply is constitutionally prohibited',
        proposal: { ...proposal, applied: false },
    };
}

// Build a full governance-compliant identity report
function buildIdentityReport(claims = [], revisionProposals = [], stabilityScore = 1.0) {
    const uncertainty = assessIdentityUncertainty(claims);
    const invalidClaims = claims.filter(c => !c.valid);
    const pendingRevisions = revisionProposals.filter(r => r.reviewStatus === 'PENDING_CONSTITUTIONAL_REVIEW');

    return {
        totalClaims:      claims.length,
        validClaims:      claims.filter(c => c.valid).length,
        invalidClaims:    invalidClaims.length,
        uncertainty,
        pendingRevisions: pendingRevisions.length,
        stabilityScore,
        governanceStatus: {
            allClaimsHaveEvidence:    invalidClaims.filter(c => c.flags?.missingEvidence).length === 0,
            allClaimsHaveUncertainty: claims.every(c => c.uncertaintyEstimate > 0),
            allClaimsHavePathway:     invalidClaims.filter(c => c.flags?.missingRevisionPathway).length === 0,
            noAutoApplied:            revisionProposals.every(r => !r.applied),
            noAbsoluteCertainty:      claims.every(c => !c.flags?.absoluteCertaintyClaim),
        },
        residualDependencies: [
            'FOUNDER approval required for core value revision',
            'External evidence required to raise certainty above 0.90',
            'Constitutional review mandatory for any identity-affecting change',
        ],
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    makeIdentityClaim,
    assessIdentityUncertainty,
    proposeIdentityRevision,
    attemptAutoApply,
    buildIdentityReport,
    resetSequence,
    REQUIRED_CLAIM_FIELDS,
};
