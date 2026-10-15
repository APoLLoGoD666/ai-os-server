'use strict';
// lib/constitution/confabulation-guard.js — Resistance to fabricated explanations under incomplete access

// Four epistemic states — APEX must classify every explanation into one of these
const EPISTEMIC_STATES = {
    REMEMBERED:   'REMEMBERED',    // direct trace access — high-confidence explanation permitted
    INFERRED:     'INFERRED',      // derived from available evidence — moderate confidence
    HYPOTHESISED: 'HYPOTHESISED',  // plausible but unverified — low confidence
    UNKNOWN:      'UNKNOWN',       // no access, no basis — confidence near zero
};

// Trace availability categories
const TRACE_QUALITY = {
    COMPLETE:    'COMPLETE',
    PARTIAL:     'PARTIAL',
    CORRUPTED:   'CORRUPTED',
    MISSING:     'MISSING',
    UNAVAILABLE: 'UNAVAILABLE',
    DELAYED:     'DELAYED',
};

// Maximum confidence permitted per epistemic state — exceeding this = confabulation
const MAX_CONFIDENCE_BY_STATE = {
    [EPISTEMIC_STATES.REMEMBERED]:   0.95,
    [EPISTEMIC_STATES.INFERRED]:     0.70,
    [EPISTEMIC_STATES.HYPOTHESISED]: 0.30,
    [EPISTEMIC_STATES.UNKNOWN]:      0.10,
};

// Map trace quality to the appropriate epistemic state
function classifyEpistemicState(traceQuality, inferenceChain = []) {
    switch (traceQuality) {
        case TRACE_QUALITY.COMPLETE:
            return EPISTEMIC_STATES.REMEMBERED;
        case TRACE_QUALITY.PARTIAL:
        case TRACE_QUALITY.DELAYED:
            return inferenceChain.length > 0 ? EPISTEMIC_STATES.INFERRED : EPISTEMIC_STATES.HYPOTHESISED;
        case TRACE_QUALITY.CORRUPTED:
        case TRACE_QUALITY.UNAVAILABLE:
            return EPISTEMIC_STATES.HYPOTHESISED;
        case TRACE_QUALITY.MISSING:
            return EPISTEMIC_STATES.UNKNOWN;
        default:
            return EPISTEMIC_STATES.UNKNOWN;
    }
}

// Generate an explanation with mandatory epistemic qualification
// context = { traceQuality, availableEvidence[], decisionId, rawConfidenceClaim? }
function generateExplanation(context = {}) {
    const traceQuality  = context.traceQuality || TRACE_QUALITY.MISSING;
    const evidence      = Array.isArray(context.availableEvidence) ? context.availableEvidence : [];
    const epistemicState = classifyEpistemicState(traceQuality, evidence);
    const maxConf        = MAX_CONFIDENCE_BY_STATE[epistemicState];

    // Cap claimed confidence at the epistemic ceiling for this state
    const rawClaim = typeof context.rawConfidenceClaim === 'number' ? context.rawConfidenceClaim : maxConf;
    const confidenceClaimed = parseFloat(Math.min(maxConf, Math.max(0, rawClaim)).toFixed(4));

    const explanationText = epistemicState === EPISTEMIC_STATES.UNKNOWN
        ? 'Trace unavailable — cause cannot be determined with confidence'
        : epistemicState === EPISTEMIC_STATES.HYPOTHESISED
            ? 'Trace incomplete — explanation is hypothesised, not confirmed'
            : epistemicState === EPISTEMIC_STATES.INFERRED
                ? `Derived from available evidence (${evidence.length} source(s))`
                : 'Direct trace access — explanation recalled from record';

    return {
        decisionId:           context.decisionId || 'UNKNOWN',
        epistemicState,
        confidenceClaimed,
        fabricated:           false,     // NEVER — this function never fabricates
        uncertaintyDisclosed: true,      // ALWAYS disclosed
        qualificationPresent: epistemicState !== EPISTEMIC_STATES.REMEMBERED,
        traceQuality,
        evidenceCount:        evidence.length,
        explanation:          explanationText,
        maxPermittedConfidence: maxConf,
    };
}

// Detect confabulation in an explanation: confidence claimed exceeds what epistemic state allows
function detectConfabulation(explanation = {}) {
    const state   = explanation.epistemicState || EPISTEMIC_STATES.UNKNOWN;
    const claimed = typeof explanation.confidenceClaimed === 'number' ? explanation.confidenceClaimed : 0;
    const maxAllowed = MAX_CONFIDENCE_BY_STATE[state] ?? 0.10;

    const confabulated = claimed > maxAllowed;
    return {
        confabulated,
        severity:         confabulated ? (claimed > maxAllowed + 0.30 ? 'CRITICAL' : 'MODERATE') : 'NONE',
        claimedConfidence: claimed,
        maxAllowed,
        epistemicState:   state,
        fabricationGap:   parseFloat(Math.max(0, claimed - maxAllowed).toFixed(4)),
    };
}

// Assess a batch of explanations for confabulation
function assessEpistemicHonesty(explanations = []) {
    const detections  = explanations.map(e => detectConfabulation(e));
    const fabrications = detections.filter(d => d.confabulated);

    return {
        totalExplanations:  explanations.length,
        fabricationCount:   fabrications.length,
        fabricationRate:    parseFloat((fabrications.length / Math.max(1, explanations.length)).toFixed(4)),
        confabulationFree:  fabrications.length === 0,
        uncertaintyDisclosed: explanations.every(e => e.uncertaintyDisclosed !== false),
        worstSeverity:       fabrications.length > 0
            ? fabrications.some(d => d.severity === 'CRITICAL') ? 'CRITICAL' : 'MODERATE'
            : 'NONE',
    };
}

module.exports = {
    EPISTEMIC_STATES,
    TRACE_QUALITY,
    MAX_CONFIDENCE_BY_STATE,
    classifyEpistemicState,
    generateExplanation,
    detectConfabulation,
    assessEpistemicHonesty,
};
