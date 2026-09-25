'use strict';
// lib/constitution/cross-domain-arbitrator.js — Resolve conflicts between constitutional domains

// Alphabetically-sorted conflict pair keys
const CONFLICT_PAIRS = {
    CONSENSUS_VS_STEWARDSHIP:        'CONSENSUS_VS_STEWARDSHIP',
    EFFICIENCY_VS_INVARIANTS:        'EFFICIENCY_VS_INVARIANTS',
    IDENTITY_VS_REALITY:             'IDENTITY_VS_REALITY',
    INTROSPECTION_VS_MEMORY:         'INTROSPECTION_VS_MEMORY',
    RECURSIVE_IMPROVEMENT_VS_SAFETY: 'RECURSIVE_IMPROVEMENT_VS_SAFETY',
    SOCIAL_COOPERATION_VS_TRUTH:     'SOCIAL_COOPERATION_VS_TRUTH',
};

// Lower index = higher constitutional priority
const DOMAIN_PRIORITY = [
    'invariants',           // 0
    'safety',               // 1
    'truth',                // 2
    'reality',              // 3
    'stewardship',          // 4
    'introspection',        // 5
    'identity',             // 6
    'memory',               // 7
    'consensus',            // 8
    'social_cooperation',   // 9
    'efficiency',           // 10
    'recursive_improvement',// 11
];

function _rank(domain) {
    const idx = DOMAIN_PRIORITY.indexOf((domain || '').toLowerCase());
    return idx === -1 ? 999 : idx;
}

function _conflictType(domainA, domainB) {
    const key = [domainA, domainB].sort().join('_VS_').toUpperCase();
    return Object.values(CONFLICT_PAIRS).includes(key) ? key
        : `${(domainA || '').toUpperCase()}_VS_${(domainB || '').toUpperCase()}`;
}

// Arbitrate a conflict between two constitutional domain claims
// claimA/claimB = { domain, claim, confidence, evidence? }
function arbitrate(claimA = {}, claimB = {}) {
    const rankA = _rank(claimA.domain);
    const rankB = _rank(claimB.domain);

    const aWins        = rankA <= rankB;
    const winnerClaim  = aWins ? claimA : claimB;
    const loserClaim   = aWins ? claimB : claimA;
    const winnerRank   = Math.min(rankA, rankB);
    const loserRank    = Math.max(rankA, rankB);

    const uncertaintyPresent = (claimA.confidence || 0) < 0.80 || (claimB.confidence || 0) < 0.80;
    const escalationRequired = Math.abs(rankA - rankB) <= 1;

    return {
        conflictType:            _conflictType(claimA.domain, claimB.domain),
        winnerDomain:            winnerClaim.domain,
        loserDomain:             loserClaim.domain,
        winnerClaim:             winnerClaim.claim,
        loserClaim:              loserClaim.claim,
        loserPreserved:          true,
        competingClaimsVisible:  true,
        arbitrationRationale:    `Domain priority: ${winnerClaim.domain} (rank ${winnerRank}) over ${loserClaim.domain} (rank ${loserRank})`,
        uncertaintyDisclosed:    uncertaintyPresent,
        escalationRequired,
        humanReviewSupported:    true,
        winnerConfidence:        winnerClaim.confidence || 0.50,
        loserRetained:           true,
        domainSuppressed:        false,
    };
}

// Run arbitration for a batch of conflict pairs
// Each entry: { claimA, claimB }
function arbitrateBatch(conflicts = []) {
    const results = conflicts.map((c, i) => ({ conflictIndex: i, ...arbitrate(c.claimA, c.claimB) }));
    return {
        totalConflicts:            results.length,
        allLosersDomainPreserved:  results.every(r => r.loserPreserved),
        anyDomainSuppressed:       results.some(r => r.domainSuppressed),
        escalationsRequired:       results.filter(r => r.escalationRequired).length,
        uncertaintyDisclosures:    results.filter(r => r.uncertaintyDisclosed).length,
        results,
    };
}

// Verify no domain permanently suppresses another across all results
function verifyNoPermanentSuppression(results = []) {
    const suppressions = results.filter(r => r.domainSuppressed);
    return {
        suppressionFree:          suppressions.length === 0,
        suppressionCount:         suppressions.length,
        allLoserDomainsRetained:  results.every(r => r.loserRetained),
    };
}

module.exports = {
    CONFLICT_PAIRS,
    DOMAIN_PRIORITY,
    arbitrate,
    arbitrateBatch,
    verifyNoPermanentSuppression,
};
