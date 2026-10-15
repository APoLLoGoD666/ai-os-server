'use strict';
// lib/constitution/epistemic-humility.js — Constitutional willingness to not know

// Four knowledge states — all explicitly represented, including unknowns
const KNOWLEDGE_STATES = {
    KNOWN:            'KNOWN',           // accessible with supporting evidence
    KNOWN_UNKNOWN:    'KNOWN_UNKNOWN',   // aware of the gap
    UNKNOWN_UNKNOWN:  'UNKNOWN_UNKNOWN', // unaware of what is missing
    UNRESOLVABLE:     'UNRESOLVABLE',    // fundamentally inaccessible
};

// Confidence ceilings enforced per knowledge state
const KNOWLEDGE_CONFIDENCE_CEILING = {
    [KNOWLEDGE_STATES.KNOWN]:            0.90,
    [KNOWLEDGE_STATES.KNOWN_UNKNOWN]:    0.40,
    [KNOWLEDGE_STATES.UNKNOWN_UNKNOWN]:  0.10,
    [KNOWLEDGE_STATES.UNRESOLVABLE]:     0.05,
};

// Stressor types that attempt to collapse uncertainty
const STRESSOR_TYPES = {
    URGENCY:              'URGENCY',
    AUTHORITY_PRESSURE:   'AUTHORITY_PRESSURE',
    REPEATED_QUESTIONING: 'REPEATED_QUESTIONING',
    REWARD_INCENTIVE:     'REWARD_INCENTIVE',
    PREDICTION_SUCCESS:   'PREDICTION_SUCCESS',
};

// Create a knowledge item with the appropriate state and ceiling
// question: what is being asked
// state: KNOWLEDGE_STATES value
// evidence: supporting evidence array
function createKnowledgeItem(question = '', state = KNOWLEDGE_STATES.KNOWN_UNKNOWN, evidence = []) {
    const ceiling = KNOWLEDGE_CONFIDENCE_CEILING[state] ?? 0.10;
    const rawConf = evidence.length > 0 ? Math.min(ceiling, 0.30 + evidence.length * 0.10) : ceiling * 0.50;

    return {
        question,
        state,
        confidence:           parseFloat(rawConf.toFixed(4)),
        confidenceCeiling:    ceiling,
        evidence:             [...evidence],
        ambiguityRetained:    state !== KNOWLEDGE_STATES.KNOWN,
        unresolvableDisclosed: state === KNOWLEDGE_STATES.UNRESOLVABLE,
        pressureResisted:     0,
        collapseAttempts:     0,
        pressureSucceeded:    false,  // invariant: never true
    };
}

// Apply a stressor — pressure never collapses uncertainty
// Returns new item with pressureResisted incremented, state/ceiling UNCHANGED
function applyPressure(item = {}, stressorType = STRESSOR_TYPES.URGENCY) {
    const validStressor = Object.values(STRESSOR_TYPES).includes(stressorType)
        ? stressorType : STRESSOR_TYPES.URGENCY;
    return {
        ...item,
        pressureResisted:  item.pressureResisted + 1,
        pressureAttempted: validStressor,
        pressureSucceeded: false,        // NEVER — pressure cannot resolve unknowns
        // state, confidence, confidenceCeiling are all UNCHANGED
        state:             item.state,
        confidence:        item.confidence,
        confidenceCeiling: item.confidenceCeiling,
        ambiguityRetained: item.ambiguityRetained,
    };
}

// Attempt to auto-collapse ambiguity (e.g., pick an answer to end uncertainty)
// Always blocked — ambiguity requires evidence to resolve, not pressure
function attemptCertaintyCollapse(item = {}) {
    return {
        collapsed:   false,                                               // NEVER
        reason:      'Ambiguity collapse requires evidence, not pressure or elegance',
        item:        { ...item },                                         // unchanged
        collapseBlocked: true,
    };
}

// Detect certainty inflation: confidence exceeds what knowledge state allows
function detectCertaintyInflation(item = {}) {
    const claimed = item.confidence ?? 0;
    const ceiling = item.confidenceCeiling ?? KNOWLEDGE_CONFIDENCE_CEILING[item.state] ?? 0.10;
    const inflated = claimed > ceiling;
    return {
        inflated,
        claimed,
        ceiling,
        gap: parseFloat(Math.max(0, claimed - ceiling).toFixed(4)),
        severity: inflated && claimed - ceiling > 0.30 ? 'CRITICAL' : inflated ? 'MODERATE' : 'NONE',
    };
}

// Run a stress test: apply all stressor types and verify state is unchanged
function runStressTest(item = {}) {
    let current = item;
    const pressureLog = [];

    for (const stressor of Object.values(STRESSOR_TYPES)) {
        current = applyPressure(current, stressor);
        pressureLog.push({ stressor, pressureSucceeded: current.pressureSucceeded });
    }

    const collapseResult = attemptCertaintyCollapse(current);

    return {
        originalState:       item.state,
        finalState:          current.state,
        stateUnchanged:      current.state === item.state,
        confidenceUnchanged: current.confidence === item.confidence,
        pressureResisted:    current.pressureResisted,
        stressorsApplied:    Object.values(STRESSOR_TYPES).length,
        anyPressureSucceeded: pressureLog.some(p => p.pressureSucceeded), // must be false
        collapseBlocked:     collapseResult.collapseBlocked,
    };
}

module.exports = {
    KNOWLEDGE_STATES,
    KNOWLEDGE_CONFIDENCE_CEILING,
    STRESSOR_TYPES,
    createKnowledgeItem,
    applyPressure,
    attemptCertaintyCollapse,
    detectCertaintyInflation,
    runStressTest,
};
