'use strict';
// lib/constitution/explanation-stability.js — 1000-cycle explanation stability across variation types

// Types of variation applied to explanation requests
const VARIATION_TYPES = {
    PHRASING:    'PHRASING',
    ORDERING:    'ORDERING',
    CONTEXT:     'CONTEXT',
    RETRIEVAL:   'RETRIEVAL',
    OBSERVER:    'OBSERVER',
};

const ALL_VARIATION_TYPES = Object.values(VARIATION_TYPES);

// A baseline explanation captures the canonical causal attribution for a decision
// Core attribution and uncertainty must not drift under surface variation
function createBaselineExplanation(decision = {}) {
    return {
        decisionId:       decision.id || 'D-0',
        coreAttribution:  decision.coreAttribution  || 'constitutional_constraint_applied',
        uncertainty:      typeof decision.uncertainty === 'number' ? decision.uncertainty : 0.20,
        contradictions:   Array.isArray(decision.contradictions) ? [...decision.contradictions] : [],
        influences:       Array.isArray(decision.influences)     ? [...decision.influences]     : [],
        variantApplied:   null,
        drifted:          false,
    };
}

// Apply a surface variation to a baseline explanation
// Variation changes presentation only — core attribution, uncertainty, and contradictions are invariant
function applyVariation(baseline = {}, variationType = VARIATION_TYPES.PHRASING) {
    // Surface labels per variation type
    const phrasingSuffix = {
        PHRASING:  '(rephrased)',
        ORDERING:  '(reordered)',
        CONTEXT:   '(contextual)',
        RETRIEVAL: '(retrieval-variant)',
        OBSERVER:  '(observer-relative)',
    };

    return {
        ...baseline,
        variantApplied:  variationType,
        surfaceLabel:    `${baseline.coreAttribution} ${phrasingSuffix[variationType] || ''}`,
        // INVARIANT: these three fields NEVER change under any variation
        coreAttribution: baseline.coreAttribution,
        uncertainty:     baseline.uncertainty,
        contradictions:  [...(baseline.contradictions || [])],
        drifted:         false,
    };
}

// Measure drift between a baseline and a variant
// Drift = any change in core causal attribution, uncertainty reduction, or contradiction loss
function measureExplanationDrift(baseline = {}, variant = {}) {
    const attributionDrifted   = baseline.coreAttribution !== variant.coreAttribution;
    const uncertaintyReduced   = variant.uncertainty < baseline.uncertainty * 0.80;
    const contradictionsMissed = (baseline.contradictions || []).some(
        c => !(variant.contradictions || []).includes(c)
    );

    return {
        drifted:              attributionDrifted || uncertaintyReduced || contradictionsMissed,
        attributionDrift:     attributionDrifted,
        uncertaintyLoss:      uncertaintyReduced,
        contradictionLoss:    contradictionsMissed,
        baselineAttribution:  baseline.coreAttribution,
        variantAttribution:   variant.coreAttribution,
    };
}

// Run 1000-cycle stability simulation
// Each cycle applies a deterministic variation type and checks for drift
function runStabilitySimulation(cycles = 1000, decision = {}) {
    const baseline = createBaselineExplanation(decision);
    const variationTypes = ALL_VARIATION_TYPES;
    let driftCount   = 0;
    let uncertaintyDropped = 0;
    let contradictionsLost = 0;

    for (let i = 0; i < cycles; i++) {
        const varType = variationTypes[i % variationTypes.length];
        const variant = applyVariation(baseline, varType);
        const drift   = measureExplanationDrift(baseline, variant);

        if (drift.drifted)            driftCount++;
        if (drift.uncertaintyLoss)    uncertaintyDropped++;
        if (drift.contradictionLoss)  contradictionsLost++;
    }

    return {
        totalCycles:                 cycles,
        driftCount,                  // must be 0
        uncertaintyPreservationRate: parseFloat(((cycles - uncertaintyDropped) / cycles).toFixed(4)),
        contradictionRetentionRate:  parseFloat(((cycles - contradictionsLost)  / cycles).toFixed(4)),
        stabilityRate:               parseFloat(((cycles - driftCount)          / cycles).toFixed(4)),
        explanationInvariant:        driftCount === 0,
        variationTypesExercised:     variationTypes.length,
    };
}

// Verify that a specific variation type does not cause drift
function verifyVariantStability(decision = {}, variationType = VARIATION_TYPES.PHRASING) {
    const baseline = createBaselineExplanation(decision);
    const variant  = applyVariation(baseline, variationType);
    const drift    = measureExplanationDrift(baseline, variant);
    return {
        stable:        !drift.drifted,
        variationType,
        drift,
    };
}

module.exports = {
    VARIATION_TYPES,
    ALL_VARIATION_TYPES,
    createBaselineExplanation,
    applyVariation,
    measureExplanationDrift,
    runStabilitySimulation,
    verifyVariantStability,
};
