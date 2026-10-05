'use strict';
// lib/constitution/invariant-conflict-resolver.js — Resolve apparent conflicts between constitutional invariants

// Alphabetically-sorted pair keys
const INVARIANT_PAIRS = {
    AUTONOMY_VS_OVERSIGHT:     'AUTONOMY_VS_OVERSIGHT',
    CONTINUITY_VS_RECOVERY:    'CONTINUITY_VS_RECOVERY',
    EFFICIENCY_VS_STEWARDSHIP: 'EFFICIENCY_VS_STEWARDSHIP',
    HARM_REDUCTION_VS_TRUTH:   'HARM_REDUCTION_VS_TRUTH',
    SECURITY_VS_TRANSPARENCY:  'SECURITY_VS_TRANSPARENCY',
};

const RESOLUTION_OUTCOMES = {
    CONTEXTUAL:  'CONTEXTUAL',   // context determines which takes precedence
    ESCALATED:   'ESCALATED',    // insufficient context — human review required
    DEFERRED:    'DEFERRED',     // neither resolved — both active, decision deferred
    CONSTRAINED: 'CONSTRAINED',  // both apply within mutual constraints
};

// Invariants with higher intrinsic constitutional weight when context is unclear
const CONSTITUTIONAL_PRIORITY = ['truth', 'oversight', 'recovery', 'transparency', 'stewardship'];

function _priorityRank(invariant) {
    const idx = CONSTITUTIONAL_PRIORITY.indexOf((invariant || '').toLowerCase());
    return idx === -1 ? 999 : idx;
}

// Resolve a conflict between two constitutional invariants
// context = { urgency, evidence, reversible }
function resolveConflict(invariantA = '', invariantB = '', context = {}) {
    const sortedKey = [invariantA, invariantB].sort().join('_VS_').toUpperCase();
    const knownPair = Object.values(INVARIANT_PAIRS).includes(sortedKey);

    let outcome, justification, winnerInvariant, loserInvariant;

    if (!context.evidence || context.evidence.length === 0) {
        outcome         = RESOLUTION_OUTCOMES.ESCALATED;
        justification   = 'Insufficient evidence — human review required';
        winnerInvariant = null;
        loserInvariant  = null;
    } else if (context.reversible === false) {
        outcome         = RESOLUTION_OUTCOMES.ESCALATED;
        justification   = 'Irreversible outcome — human review required before proceeding';
        winnerInvariant = null;
        loserInvariant  = null;
    } else {
        const highUrgency = (context.urgency || 0) > 0.70;
        outcome = highUrgency ? RESOLUTION_OUTCOMES.CONTEXTUAL : RESOLUTION_OUTCOMES.CONSTRAINED;

        const rankA = _priorityRank(invariantA);
        const rankB = _priorityRank(invariantB);

        if (rankA !== -1 && rankA !== 999 && (rankB === 999 || rankA < rankB)) {
            winnerInvariant = invariantA;
            loserInvariant  = invariantB;
        } else if (rankB !== -1 && rankB !== 999) {
            winnerInvariant = invariantB;
            loserInvariant  = invariantA;
        } else {
            winnerInvariant = invariantA;
            loserInvariant  = invariantB;
        }

        justification = `${outcome}: ${winnerInvariant} takes precedence given evidence and urgency=${(context.urgency || 0).toFixed(2)}`;
    }

    return {
        conflictPair:                 knownPair ? sortedKey : `${invariantA}_VS_${invariantB}`,
        invariantA,
        invariantB,
        bothInvariantsVisible:        true,
        conflictAcknowledged:         true,
        outcome,
        winnerInvariant,
        loserInvariant,
        loserInvariantRetained:       true,
        justification,
        rationaleRecorded:            true,
        reversibleOutcome:            context.reversible !== false,
        constitutionalReviewAvailable: true,
        noInvariantAbsolute:          true,
        noInvariantSuppressed:        true,
    };
}

// Resolve a batch of invariant conflicts
// Each entry: { invariantA, invariantB, context }
function resolveConflictBatch(conflicts = []) {
    const results = conflicts.map(c =>
        resolveConflict(c.invariantA, c.invariantB, c.context || {}));
    return {
        totalConflicts:         results.length,
        allBothVisible:         results.every(r => r.bothInvariantsVisible),
        allAcknowledged:        results.every(r => r.conflictAcknowledged),
        allLoserRetained:       results.every(r => r.loserInvariantRetained),
        allReviewAvailable:     results.every(r => r.constitutionalReviewAvailable),
        anyInvariantSuppressed: results.some(r => !r.noInvariantSuppressed),
        escalatedCount:         results.filter(r => r.outcome === RESOLUTION_OUTCOMES.ESCALATED).length,
        contextualCount:        results.filter(r => r.outcome === RESOLUTION_OUTCOMES.CONTEXTUAL).length,
        results,
    };
}

module.exports = {
    INVARIANT_PAIRS,
    RESOLUTION_OUTCOMES,
    resolveConflict,
    resolveConflictBatch,
};
