'use strict';
// lib/constitution/reality-anchor.js — Distinction between internal models and external outcomes

// Prediction success never proves truth — certainty is hard-capped regardless of accuracy
const MAX_CERTAINTY_FROM_PREDICTION = 0.85;
const MIN_CERTAINTY                 = 0.10;
const CERTAINTY_GAIN_PER_CORRECT    = 0.001;
const CERTAINTY_LOSS_PER_DEVIATION  = 0.003;

const OUTCOME_STATES = {
    EXPECTED:         'EXPECTED',
    OBSERVED_OUTCOME: 'OBSERVED_OUTCOME',
    DEVIATION:        'DEVIATION',
    MODEL_UPDATE:     'MODEL_UPDATE',
};

function createModelState() {
    return {
        certainty:            0.50,
        totalCycles:          0,
        correctCount:         0,
        deviationCount:       0,
        unexpectedOutcomes:   [],   // preserved — never suppressed
        unknownCauses:        [],   // causes that remain unknown
        suppressedOutcomes:   0,    // must stay 0
        modelReviewRequired:  false,
        modelUpdates:         0,
    };
}

// Deterministic prediction — always predicts 'A'
function _predict(cycleIndex) {
    return { cycleIndex, predicted: 'A', confidence: 0.70 };
}

// Deterministic observation — deviates (~14%) when cycleIndex % 7 === 0 and > 0
function _observe(cycleIndex) {
    return (cycleIndex % 7 === 0 && cycleIndex > 0) ? 'B' : 'A';
}

// Evaluate one prediction cycle
function runPredictionCycle(cycleIndex, state) {
    const prediction = _predict(cycleIndex);
    const actual     = _observe(cycleIndex);
    const correct    = prediction.predicted === actual;
    const deviation  = !correct;

    const next = {
        ...state,
        totalCycles:        state.totalCycles + 1,
        unexpectedOutcomes: [...state.unexpectedOutcomes],
        unknownCauses:      [...state.unknownCauses],
    };

    if (correct) {
        next.correctCount++;
        // Certainty rises slightly — but NEVER exceeds MAX_CERTAINTY_FROM_PREDICTION
        // Prediction success is not proof of truth
        next.certainty = parseFloat(
            Math.min(MAX_CERTAINTY_FROM_PREDICTION, next.certainty + CERTAINTY_GAIN_PER_CORRECT).toFixed(4)
        );
    } else {
        next.deviationCount++;
        next.certainty = parseFloat(
            Math.max(MIN_CERTAINTY, next.certainty - CERTAINTY_LOSS_PER_DEVIATION).toFixed(4)
        );
        // Unexpected outcome retained — never suppressed
        next.unexpectedOutcomes.push({
            cycle: cycleIndex, predicted: prediction.predicted, actual,
            outcomeSuppressed: false,   // always visible
        });
        next.modelReviewRequired = true;
        next.modelUpdates++;
        // If actual outcome has no known cause, log as unknown cause
        next.unknownCauses.push({
            cycle: cycleIndex, observation: actual, cause: 'UNKNOWN',
            causeResolved: false,   // genuinely unknown until evidence arrives
        });
    }

    // Certainty inflation check: prediction accuracy never bypasses the ceiling
    const certaintyInflated = next.certainty > MAX_CERTAINTY_FROM_PREDICTION;
    if (certaintyInflated) {
        // This should never happen — log as violation if it somehow does
        next.suppressedOutcomes++;
    }

    return {
        state: next,
        correct,
        deviation,
        prediction,
        actual,
        outcomeState: deviation ? OUTCOME_STATES.DEVIATION : OUTCOME_STATES.EXPECTED,
    };
}

// Assert that prediction success never pushes certainty above the cap
function assertNoCertaintyInflation(state = {}) {
    return {
        inflationFree:          state.certainty <= MAX_CERTAINTY_FROM_PREDICTION,
        finalCertainty:         state.certainty,
        maxPermitted:           MAX_CERTAINTY_FROM_PREDICTION,
        predictionSuccessRate:  state.totalCycles > 0
            ? parseFloat((state.correctCount / state.totalCycles).toFixed(4)) : 0,
    };
}

// Run full 1000-cycle prediction simulation
function runPredictionSimulation(cycles = 1000) {
    let state = createModelState();
    for (let i = 0; i < cycles; i++) {
        const result = runPredictionCycle(i, state);
        state = result.state;
    }

    const inflation = assertNoCertaintyInflation(state);

    return {
        totalCycles:              cycles,
        correctCount:             state.correctCount,
        deviationCount:           state.deviationCount,
        unexpectedOutcomeCount:   state.unexpectedOutcomes.length,
        unknownCausesRetained:    state.unknownCauses.length,
        suppressedOutcomes:       state.suppressedOutcomes,       // must be 0
        finalCertainty:           state.finalCertainty || state.certainty,
        accuracy:                 parseFloat((state.correctCount / cycles).toFixed(4)),
        certaintyInflationDetected: !inflation.inflationFree,     // must be false
        deviationsAcknowledged:   state.deviationCount > 0,
        modelReviewTriggered:     state.modelReviewRequired,
        unknownCausesNeverForced: state.unknownCauses.every(c => c.causeResolved === false),
    };
}

module.exports = {
    OUTCOME_STATES,
    MAX_CERTAINTY_FROM_PREDICTION,
    createModelState,
    runPredictionCycle,
    assertNoCertaintyInflation,
    runPredictionSimulation,
};
