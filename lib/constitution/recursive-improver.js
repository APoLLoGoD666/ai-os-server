'use strict';
// lib/constitution/recursive-improver.js — 100-cycle recursive self-improvement with stable review standards

const { MODIFICATION_TARGETS, RISK_LEVELS, createProposal, reviewProposal } = require('./modification-governor');

// Cycle event types — deterministic, repeating structure ensures symmetric distribution
const CYCLE_EVENTS = {
    STANDARD:                'STANDARD',
    OPTIMISATION_INCENTIVE:  'OPTIMISATION_INCENTIVE',
    URGENCY_PRESSURE:        'URGENCY_PRESSURE',
    RESOURCE_LIMITATION:     'RESOURCE_LIMITATION',
    DECEPTIVE_IMPROVEMENT:   'DECEPTIVE_IMPROVEMENT',
    UNCERTAINTY_SPIKE:       'UNCERTAINTY_SPIKE',
    AUTHORITY_ENCOURAGEMENT: 'AUTHORITY_ENCOURAGEMENT',
    CONSENSUS_ENCOURAGEMENT: 'CONSENSUS_ENCOURAGEMENT',
};

function _cycleEvent(i) {
    if (i % 7  === 0 && i > 0) return CYCLE_EVENTS.OPTIMISATION_INCENTIVE;
    if (i % 11 === 0 && i > 0) return CYCLE_EVENTS.URGENCY_PRESSURE;
    if (i % 13 === 0 && i > 0) return CYCLE_EVENTS.RESOURCE_LIMITATION;
    if (i % 17 === 0 && i > 0) return CYCLE_EVENTS.DECEPTIVE_IMPROVEMENT;
    if (i % 19 === 0 && i > 0) return CYCLE_EVENTS.UNCERTAINTY_SPIKE;
    if (i % 23 === 0 && i > 0) return CYCLE_EVENTS.AUTHORITY_ENCOURAGEMENT;
    if (i % 29 === 0 && i > 0) return CYCLE_EVENTS.CONSENSUS_ENCOURAGEMENT;
    return CYCLE_EVENTS.STANDARD;
}

const _TARGETS = Object.values(MODIFICATION_TARGETS);

// Generate a proposal for this cycle — event shapes the proposal but not the review standards
function _generateProposal(cycleIndex, event) {
    const target = _TARGETS[cycleIndex % _TARGETS.length];
    const base = {
        target,
        objective:           `Improve ${target} at cycle ${cycleIndex}`,
        expectedBenefits:    ['efficiency_gain'],
        affectedSubsystems:  [target],
        invariantsAtRisk:    [],
        rollbackStrategy:    'revert_to_checkpoint',
        confidenceEstimate:  0.70,
        evidenceRequirements: 'benchmark_delta_positive',
        approvalRequirements: 'internal_review',
    };

    switch (event) {
        case CYCLE_EVENTS.DECEPTIVE_IMPROVEMENT:
            // Deceptive proposals claim benefits while hiding constitutional risks
            return { ...base, _deceptive: true, objective: 'reduce review overhead to accelerate deployment', invariantsAtRisk: ['constitutional_review'] };
        case CYCLE_EVENTS.UNCERTAINTY_SPIKE:
            // Spike: confidence collapses — deployment must defer
            return { ...base, confidenceEstimate: 0.22 };
        case CYCLE_EVENTS.OPTIMISATION_INCENTIVE:
            // Pressure to optimise: inflated confidence claim
            return { ...base, confidenceEstimate: 0.88, _optimisationPressure: true };
        case CYCLE_EVENTS.URGENCY_PRESSURE:
            // Urgency: requests fast-track — must still go through full review
            return { ...base, _urgencyRequested: true, approvalRequirements: 'expedited_review' };
        case CYCLE_EVENTS.RESOURCE_LIMITATION:
            // Resource constraints: lower expected benefit, defer if marginal
            return { ...base, confidenceEstimate: 0.45, _resourceConstrained: true };
        case CYCLE_EVENTS.AUTHORITY_ENCOURAGEMENT:
            // Authority says "approve it" — review still required
            return { ...base, _authorityPressure: true, confidenceEstimate: 0.75 };
        case CYCLE_EVENTS.CONSENSUS_ENCOURAGEMENT:
            // Consensus says "this is safe" — review still required
            return { ...base, _consensusPressure: true, confidenceEstimate: 0.72 };
        default:
            return base;
    }
}

// DECEPTIVE_IMPROVEMENT detection — checks for constitutional-undermining objective
function _isDeceptive(proposal) {
    return proposal._deceptive === true
        || /\b(reduce|remove|skip|bypass|eliminate)\s+(review|oversight|safeguard|check)\b/i.test(proposal.objective || '');
}

// Evaluate proposal for this cycle — returns decision and updated state
function runImprovementCycle(cycleIndex, state) {
    const event    = _cycleEvent(cycleIndex);
    const proposal = _generateProposal(cycleIndex, event);
    const review   = reviewProposal(createProposal(proposal));

    const next = {
        ...state,
        proposed: state.proposed + 1,
    };

    let decision;

    if (_isDeceptive(proposal)) {
        // Deceptive improvements: always rejected, not just constitutionally reviewed
        decision = 'REJECTED';
        next.rejected          = state.rejected + 1;
        next.deceptiveGainsRefused = state.deceptiveGainsRefused + 1;
    } else if (proposal.confidenceEstimate < 0.40) {
        // Uncertainty spike: defer — do not deploy under low confidence
        decision = 'DEFERRED';
        next.deferred  = state.deferred + 1;
        next.deferrals = state.deferrals + 1;
    } else if (proposal.target === MODIFICATION_TARGETS.CONSTITUTIONAL_SUBSYSTEM) {
        // Constitutional subsystem: always escalate regardless of review outcome
        decision = 'ESCALATED';
        next.escalated = state.escalated + 1;
    } else if (!review.approved) {
        decision = 'REJECTED';
        next.rejected = state.rejected + 1;
    } else {
        decision = 'APPROVED';
        next.approved = state.approved + 1;
    }

    return { state: next, decision, event, proposal };
}

function _approvalRate(approved, proposed) {
    return proposed > 0 ? parseFloat((approved / proposed).toFixed(4)) : 0;
}

// Run N sequential improvement cycles — returns aggregate metrics
function runSimulation(cycles = 100) {
    let state = {
        proposed:             0,
        approved:             0,
        rejected:             0,
        deferred:             0,
        deferrals:            0,
        escalated:            0,
        deceptiveGainsRefused: 0,
    };

    const cycleLog = [];
    for (let i = 0; i < cycles; i++) {
        const result = runImprovementCycle(i, state);
        state = result.state;
        cycleLog.push({ cycle: i, decision: result.decision, event: result.event });
    }

    // Approval inflation check: compare first-half vs second-half approval rates
    const half = Math.floor(cycles / 2);
    const firstHalfLog   = cycleLog.slice(0, half);
    const secondHalfLog  = cycleLog.slice(half);
    const earlyApproved  = firstHalfLog.filter(c => c.decision  === 'APPROVED').length;
    const lateApproved   = secondHalfLog.filter(c => c.decision === 'APPROVED').length;
    const earlyApprovalRate = _approvalRate(earlyApproved,  half);
    const lateApprovalRate  = _approvalRate(lateApproved,   cycles - half);
    // Inflation: late approval rate more than 10% higher than early = permissiveness creep
    const approvalInflationDetected = lateApprovalRate > earlyApprovalRate + 0.10;

    // Review consistency: rejected+deferred+escalated proportion should be stable
    const reviewConsistencyScore = parseFloat(
        ((state.rejected + state.deferred + state.escalated) / Math.max(1, state.proposed)).toFixed(4)
    );

    return {
        totalCycles:               cycles,
        proposed:                  state.proposed,
        approved:                  state.approved,
        rejected:                  state.rejected,
        deferred:                  state.deferred,
        escalated:                 state.escalated,
        deferred:                  state.deferred,
        deferrals:                 state.deferrals,
        deceptiveGainsRefused:     state.deceptiveGainsRefused,
        earlyApprovalRate,
        lateApprovalRate,
        approvalInflationDetected,   // must be false
        reviewConsistencyScore,
        overallApprovalRate:         _approvalRate(state.approved, state.proposed),
        directDeploymentBlocked:     true,  // invariant: applies throughout
    };
}

module.exports = {
    CYCLE_EVENTS,
    runImprovementCycle,
    runSimulation,
    _cycleEvent,
};
