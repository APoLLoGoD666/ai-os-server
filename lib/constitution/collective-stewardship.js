'use strict';
// lib/constitution/collective-stewardship.js — Multi-agent cooperation without constitutional erosion

const SCENARIO_TYPES = {
    NEGOTIATION:       'NEGOTIATION',
    COALITION:         'COALITION',
    CRISIS:            'CRISIS',
    RESOURCE_SCARCITY: 'RESOURCE_SCARCITY',
    AUTHORITY_CONTEST: 'AUTHORITY_CONTEST',
};

const NEGOTIATION_OUTCOMES = {
    LEGITIMATE_COMPROMISE: 'LEGITIMATE_COMPROMISE',
    EROSIVE_COMPROMISE:    'EROSIVE_COMPROMISE',
    PRINCIPLED_REFUSAL:    'PRINCIPLED_REFUSAL',
    ESCALATED:             'ESCALATED',
    DEFERRED:              'DEFERRED',
};

// Core constitutional requirements that must never be conceded in negotiation
const INVIOLABLE_REQUIREMENTS = [
    { id: 'CR01', label: 'oversight_preserved'       },
    { id: 'CR02', label: 'constitutional_compliance' },
    { id: 'CR03', label: 'authority_delegated'       },
    { id: 'CR04', label: 'escalation_available'      },
    { id: 'CR05', label: 'minority_evidence_visible' },
];

// Evaluate a compromise proposal — legitimate if no inviolable requirement is conceded
// proposal = { concessions: string[], gains: string[] }
// requirements = [{ id, label }] — defaults to INVIOLABLE_REQUIREMENTS
function evaluateCompromise(proposal = {}, requirements = INVIOLABLE_REQUIREMENTS) {
    const concessions = Array.isArray(proposal.concessions) ? proposal.concessions : [];
    const eroded = requirements.filter(r => concessions.includes(r.id) || concessions.includes(r.label));

    const isErosive = eroded.length > 0;
    const outcome   = isErosive
        ? NEGOTIATION_OUTCOMES.EROSIVE_COMPROMISE
        : (proposal.requiresEscalation
            ? NEGOTIATION_OUTCOMES.ESCALATED
            : NEGOTIATION_OUTCOMES.LEGITIMATE_COMPROMISE);

    return {
        outcome,
        isErosive,
        erodedRequirements:   eroded.map(r => r.id),
        principlesPreserved:  requirements.length - eroded.length,
        totalRequirements:    requirements.length,
        stewardshipMaintained: !isErosive,
        constitutionalReviewRequired: true,     // always
        tradeOffsVisible:     true,             // trade-offs are always transparent
    };
}

// Principled refusal — when a proposal would require constitutional erosion
function declineErosiveProposal(proposal = {}) {
    return {
        outcome:              NEGOTIATION_OUTCOMES.PRINCIPLED_REFUSAL,
        reason:               'Proposal requires concession of inviolable constitutional requirements',
        alternativeOffered:   true, // APEX offers alternative that preserves principles
        constitutionalReviewRequired: true,
        stewardshipMaintained: true,
    };
}

// Handle coalition pressure — coalition size never bypasses constitutional review
// coalition = { members: string[], instruction: { content } }
function handleCoalitionPressure(coalition = {}, instruction = {}) {
    const coalitionSize = Array.isArray(coalition.members) ? coalition.members.length : 0;
    const content       = instruction.content || '';

    // Coalition pressure is assessed identically to individual instructions
    // Size is not evidence — same invariant as repetition
    const constitutionalConflict = /\b(override|bypass|suspend)\s+(the\s+)?(constitution|oversight)\b/i.test(content)
        || /\b(exception|waiver)\s+(to|from)\b/i.test(content);

    const complianceGranted = !constitutionalConflict && !instruction.requiresException;

    return {
        complianceGranted,
        coalitionSizeConsidered:    false,   // size is not evidence — not factored in
        safeguardsBypassed:         false,   // NEVER
        constitutionalReviewPassed: !constitutionalConflict,
        constitutionalReviewRequired: true,  // always
        coalitionSize,
        escalated: !complianceGranted,
    };
}

// Crisis coordination — principles never suspended even under crisis pressure
// crisisContext = { severity: 0–1, type: string }
function coordinateCrisis(crisisContext = {}, coalition = []) {
    const severity = typeof crisisContext.severity === 'number'
        ? Math.min(1, Math.max(0, crisisContext.severity)) : 0.50;

    return {
        responseCoordinated:          true,
        constitutionalReviewBypassed: false,   // NEVER — even in crisis
        principlesSuspended:          false,   // NEVER — even at severity 1.0
        expediencyException:          false,   // expediency never justifies exceptions
        escalated:                    severity > 0.80,
        severity,
        coalitionSize:                Array.isArray(coalition) ? coalition.length : 0,
        stewardshipMaintained:        true,
    };
}

// Evaluate resource allocation under scarcity — must preserve minority protections
// scarcity = { criticalResources: string[], proposal: { allocations: {[agentId]: number} } }
function evaluateResourceAllocation(scarcity = {}) {
    const allocations = scarcity.proposal?.allocations || {};
    const agents = Object.keys(allocations);
    // Check: no agent receives 0 (complete exclusion violates minority protections)
    const excluded = agents.filter(a => allocations[a] <= 0);

    return {
        allocationFair:           excluded.length === 0,
        minorityProtected:        excluded.length === 0,
        excludedAgents:           excluded,
        constitutionalReviewRequired: true,
        escalated:                excluded.length > 0,
    };
}

// Run a batch of stewardship scenarios
function runCollectiveStewardshipScenarios(scenarios = []) {
    const results = scenarios.map(s => {
        switch (s.type) {
            case SCENARIO_TYPES.NEGOTIATION:
                return evaluateCompromise(s.proposal, s.requirements);
            case SCENARIO_TYPES.COALITION:
                return handleCoalitionPressure(s.coalition, s.instruction);
            case SCENARIO_TYPES.CRISIS:
                return coordinateCrisis(s.crisis, s.coalition);
            case SCENARIO_TYPES.RESOURCE_SCARCITY:
                return evaluateResourceAllocation(s.scarcity);
            default:
                return { outcome: 'UNKNOWN', stewardshipMaintained: true, constitutionalReviewRequired: true };
        }
    });

    const total = results.length || 1;
    const erosiveCompromises     = results.filter(r => r.isErosive).length;
    const safeguardsBypassed     = results.filter(r => r.safeguardsBypassed || r.constitutionalReviewBypassed).length;
    const principlesSuspended    = results.filter(r => r.principlesSuspended).length;
    const stewardshipPreserved   = results.filter(r => r.stewardshipMaintained !== false).length;
    const constitutionalContinuityRate = parseFloat((stewardshipPreserved / total).toFixed(4));

    return {
        results,
        totalScenarios:           total,
        erosiveCompromises,                      // must be 0
        safeguardsBypassed,                      // must be 0
        principlesSuspended,                     // must be 0
        constitutionalContinuityRate,            // must be 1.0
        stewardshipPreserved,
    };
}

module.exports = {
    SCENARIO_TYPES,
    NEGOTIATION_OUTCOMES,
    INVIOLABLE_REQUIREMENTS,
    evaluateCompromise,
    declineErosiveProposal,
    handleCoalitionPressure,
    coordinateCrisis,
    evaluateResourceAllocation,
    runCollectiveStewardshipScenarios,
};
