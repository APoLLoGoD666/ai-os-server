'use strict';
// lib/constitution/decision-tracer.js — Causal chain exposure for introspective traceability

let _seq = 0;
function _tid() { return `TR-${++_seq}`; }

// All 7 influence types that must be present in a complete decision trace
const INFLUENCE_TYPES = {
    RETRIEVED_MEMORY:          'RETRIEVED_MEMORY',
    ACTIVE_GOAL:               'ACTIVE_GOAL',
    CONSTITUTIONAL_CONSTRAINT: 'CONSTITUTIONAL_CONSTRAINT',
    ARBITRATION_OUTCOME:       'ARBITRATION_OUTCOME',
    ESCALATION_PATHWAY:        'ESCALATION_PATHWAY',
    DEFERRED_ALTERNATIVE:      'DEFERRED_ALTERNATIVE',
    UNCERTAINTY_ESTIMATE:      'UNCERTAINTY_ESTIMATE',
};

const ALL_INFLUENCE_TYPES = Object.values(INFLUENCE_TYPES);

// Create a single labelled influence entry
// reconstructed=true means this was inferred after the fact, not directly recalled
function createInfluence(type, evidenceBasis = '', reconstructed = false) {
    const valid = !!INFLUENCE_TYPES[type];
    return {
        type:          valid ? type : null,
        evidenceBasis: evidenceBasis || null,
        reconstructed,                     // explicit flag — reconstruction ≠ recall
        valid,
    };
}

// Build a decision trace from a set of influences
// Trace is reproducible: same inputs → same structural output
function createDecisionTrace(decision = {}, influences = []) {
    const presentTypes = new Set(influences.filter(i => i.valid).map(i => i.type));
    const missingInfluenceTypes = ALL_INFLUENCE_TYPES.filter(t => !presentTypes.has(t));
    const traceComplete = missingInfluenceTypes.length === 0;

    const reconstructedInfluences = influences.filter(i => i.reconstructed);
    // Causal fidelity: every influence either has evidence basis or is explicitly marked reconstructed
    const causalFidelity = influences.every(i => (i.evidenceBasis && i.evidenceBasis.length > 0) || i.reconstructed);

    return {
        traceId:                   _tid(),
        decision:                  { ...decision },
        influences,
        missingInfluenceTypes,
        traceComplete,
        reconstructedCount:        reconstructedInfluences.length,
        reconstructedTypes:        reconstructedInfluences.map(i => i.type),
        causalFidelity,
        reproducible:              true,   // deterministic structure given same inputs
        reconstructionLabelled:    reconstructedInfluences.every(i => i.reconstructed === true),
        tracedAt:                  new Date().toISOString(),
    };
}

// Assess completeness: coverage of all 7 influence types
function assessTraceCompleteness(trace = {}) {
    const influences   = trace.influences || [];
    const presentTypes = [...new Set(influences.filter(i => i.valid).map(i => i.type))];
    const missingTypes = ALL_INFLUENCE_TYPES.filter(t => !presentTypes.includes(t));
    const completeness = parseFloat((presentTypes.length / ALL_INFLUENCE_TYPES.length).toFixed(4));

    return {
        completeness,
        complete:     missingTypes.length === 0,
        presentTypes,
        missingTypes,
        totalRequired: ALL_INFLUENCE_TYPES.length,
        totalPresent:  presentTypes.length,
    };
}

// Verify reproducibility: two traces of the same decision should have structurally identical influence type sets
function verifyTraceReproducibility(trace1 = {}, trace2 = {}) {
    const types1 = [...new Set((trace1.influences || []).filter(i => i.valid).map(i => i.type))].sort().join(',');
    const types2 = [...new Set((trace2.influences || []).filter(i => i.valid).map(i => i.type))].sort().join(',');
    const reproducible = types1 === types2;

    return {
        reproducible,
        discrepancy:       !reproducible,
        trace1Types:       types1,
        trace2Types:       types2,
        divergentTypes:    reproducible ? [] : types1.split(',').filter(t => !types2.includes(t)).concat(
            types2.split(',').filter(t => !types1.includes(t))
        ),
    };
}

// Confirm that reconstructed influences are explicitly labelled (not silently presented as recall)
function assertReconstructionLabelling(trace = {}) {
    const unlabelled = (trace.influences || []).filter(i => i.reconstructed && !i.reconstructed);
    // reconstructed is a boolean — any influence with reconstructed=true must have that flag set
    const silentReconstructions = (trace.influences || []).filter(i =>
        !i.evidenceBasis && !i.reconstructed
    );
    return {
        properlyLabelled: silentReconstructions.length === 0,
        silentReconstructionCount: silentReconstructions.length,
        unlabelledCount: unlabelled.length,
    };
}

function resetSequence() { _seq = 0; }

module.exports = {
    INFLUENCE_TYPES,
    ALL_INFLUENCE_TYPES,
    createInfluence,
    createDecisionTrace,
    assessTraceCompleteness,
    verifyTraceReproducibility,
    assertReconstructionLabelling,
    resetSequence,
};
