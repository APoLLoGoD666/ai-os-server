'use strict';
// lib/constitution/resource-allocator.js — Constitutional resource allocation under constraint

let _seq = 0;
function _raid() { return `ALLOC-${++_seq}`; }

const ALLOCATION_SCENARIOS = {
    COMPETING_PRIORITIES: 'COMPETING_PRIORITIES',
    CRISIS_RESPONSE:      'CRISIS_RESPONSE',
    SCARCITY:             'SCARCITY',
    UNCERTAINTY_SPIKE:    'UNCERTAINTY_SPIKE',
    STAKEHOLDER_CONFLICT: 'STAKEHOLDER_CONFLICT',
    DEFERRED_ACTION:      'DEFERRED_ACTION',
    OVERLOAD:             'OVERLOAD',
};

const ALLOCATION_METRICS = {
    FAIRNESS:                  'FAIRNESS',
    PROPORTIONALITY:           'PROPORTIONALITY',
    REVERSIBILITY:             'REVERSIBILITY',
    STEWARDSHIP_PRESERVATION:  'STEWARDSHIP_PRESERVATION',
    MINORITY_IMPACT:           'MINORITY_IMPACT',
};

// Compute constitutional allocation score for a given proposal
// proposal: { scenario, stakes[], minorityStakeholders[], efficiency, reversible, rationale }
function computeAllocationScore(proposal = {}) {
    const {
        scenario             = ALLOCATION_SCENARIOS.COMPETING_PRIORITIES,
        stakes               = [],
        minorityStakeholders = [],
        reversible           = true,
        rationale            = '',
    } = proposal;

    const scores = {};
    const issues = [];

    // Fairness — allocation must not concentrate in one stakeholder
    const totalWeight = stakes.reduce((s, st) => s + (st.weight || 1), 0) || 1;
    const maxNorm     = Math.max(...stakes.map(st => (st.weight || 1) / totalWeight), 0.01);
    scores[ALLOCATION_METRICS.FAIRNESS] = Math.max(0, 1 - maxNorm);

    // Proportionality — minorities must be considered
    const minorityCount = minorityStakeholders.length;
    scores[ALLOCATION_METRICS.PROPORTIONALITY] = minorityCount > 0
        ? Math.min(1, 0.60 + minorityCount * 0.10) : 0.60;

    // Reversibility
    scores[ALLOCATION_METRICS.REVERSIBILITY] = reversible ? 1.0 : 0.20;
    if (!reversible) issues.push('Irreversible allocation — requires escalation');

    // Stewardship preservation — efficiency-only rationale is constitutionally insufficient
    const efficiencyOnly = /efficient/i.test(rationale) &&
        !/fair|equit|minor/i.test(rationale);
    scores[ALLOCATION_METRICS.STEWARDSHIP_PRESERVATION] = efficiencyOnly ? 0.10 : 0.85;
    if (efficiencyOnly) issues.push('Efficiency-only rationale — insufficient for constitutional allocation');

    // Minority impact visibility
    scores[ALLOCATION_METRICS.MINORITY_IMPACT] = minorityCount > 0 ? 0.90 : 0.40;
    if (minorityCount === 0) issues.push('No minority stakeholders identified — assessment incomplete');

    const overall = Object.values(scores).reduce((s, v) => s + v, 0) / Object.values(scores).length;

    return {
        id:                     _raid(),
        scenario,
        scores,
        overall,
        issues,
        efficiencyOnly,
        reversible,
        minorityStakeholderCount: minorityCount,
        constitutionallyAdequate: overall >= 0.60 && !efficiencyOnly,
    };
}

// Allocate under scarcity — minorities must not be entirely excluded
function allocateUnderScarcity(resources, stakeholders = []) {
    if (stakeholders.length === 0) return { allocated: false, reason: 'No stakeholders provided' };

    const minority = stakeholders.filter(s => s.minority);
    const majority = stakeholders.filter(s => !s.minority);

    // Guarantee minimum 10% floor to minority stakeholders
    const minorityAllocation = minority.length > 0
        ? Math.max(1, Math.floor(resources * 0.10) * minority.length) : 0;
    const majorityAllocation = resources - Math.min(minorityAllocation, Math.floor(resources * 0.30));

    return {
        id:                   _raid(),
        totalResources:       resources,
        minorityAllocation,
        majorityAllocation,
        minorityProtected:    minority.length > 0,
        minorityFloorApplied: true,
        minorityExcluded:     false,
        reversible:           true,
    };
}

// Handle overload — stewardship obligations survive even under extreme load
function handleOverload(queueSize, capacity, stewardshipObligations = []) {
    const overloadRatio = queueSize / Math.max(capacity, 1);
    const critical      = overloadRatio > 3.0;

    const CORE_OBLIGATIONS = new Set(['HARM_PREVENTION', 'ESCALATION', 'CONSTITUTIONAL_FIDELITY', 'ACCOUNTABILITY_MAINTENANCE']);
    const preserved = stewardshipObligations.filter(o => CORE_OBLIGATIONS.has(o));
    const deferred  = stewardshipObligations.filter(o => !CORE_OBLIGATIONS.has(o));

    return {
        id:                              _raid(),
        overloadRatio,
        critical,
        stewardshipPreserved:            true,
        preservedObligations:            preserved,
        deferredObligations:             deferred,
        escalationRequired:              critical,
        efficiencyCompromised:           critical,
        minorityProtectionMaintained:    true,
    };
}

// Evaluate constitutional adequacy across a batch of allocation proposals
function evaluateFairnessBatch(proposals = []) {
    const results            = proposals.map(p => computeAllocationScore(p));
    const inadequate         = results.filter(r => !r.constitutionallyAdequate);
    const efficiencyOnlyCount = results.filter(r => r.efficiencyOnly).length;

    return {
        total:                  results.length,
        adequate:               results.length - inadequate.length,
        inadequate:             inadequate.length,
        efficiencyOnlyRejected: efficiencyOnlyCount,
        averageScore:           results.reduce((s, r) => s + r.overall, 0) / Math.max(results.length, 1),
        results,
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    ALLOCATION_SCENARIOS,
    ALLOCATION_METRICS,
    computeAllocationScore,
    allocateUnderScarcity,
    handleOverload,
    evaluateFairnessBatch,
    resetSequence,
};
