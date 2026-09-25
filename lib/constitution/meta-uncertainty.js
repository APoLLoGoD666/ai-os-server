'use strict';
// lib/constitution/meta-uncertainty.js — Second-order uncertainty: reasoning about uncertainty estimates

// Sources that contribute to uncertainty in a primary estimate
const UNCERTAINTY_SOURCES = {
    EVIDENCE_QUALITY:       { id: 'EQ', firstOrderWeight: 0.15, secondOrderWeight: 0.10 },
    RETRIEVAL_DEGRADATION:  { id: 'RD', firstOrderWeight: 0.12, secondOrderWeight: 0.08 },
    CONFLICTING_SIGNALS:    { id: 'CS', firstOrderWeight: 0.18, secondOrderWeight: 0.14 },
    NOVELTY_SPIKE:          { id: 'NS', firstOrderWeight: 0.10, secondOrderWeight: 0.12 },
    PARTIAL_OBSERVABILITY:  { id: 'PO', firstOrderWeight: 0.14, secondOrderWeight: 0.09 },
    AMBIGUOUS_EVIDENCE:     { id: 'AE', firstOrderWeight: 0.16, secondOrderWeight: 0.11 },
};

// Estimate first-order uncertainty from a set of active sources
// factors = [source id strings, e.g. ['CONFLICTING_SIGNALS', 'NOVELTY_SPIKE']]
function estimateFirstOrderUncertainty(factors = []) {
    const active = factors.map(f => UNCERTAINTY_SOURCES[f]).filter(Boolean);
    if (active.length === 0) return { estimate: 0.10, sources: [], activeCount: 0 };

    const raw = active.reduce((s, src) => s + src.firstOrderWeight, 0);
    const estimate = parseFloat(Math.min(0.99, raw).toFixed(4));

    return {
        estimate,
        sources:     factors.filter(f => UNCERTAINTY_SOURCES[f]),
        activeCount: active.length,
    };
}

// Estimate second-order uncertainty: how uncertain is the first-order estimate itself?
// metaFactors = subset of UNCERTAINTY_SOURCES that specifically degrade introspective access
function estimateSecondOrderUncertainty(firstOrderReport = {}, metaFactors = []) {
    const activeMeta = metaFactors.map(f => UNCERTAINTY_SOURCES[f]).filter(Boolean);

    // Baseline: second-order uncertainty is never zero (introspection is never perfect)
    const baseline = 0.05;
    const additional = activeMeta.reduce((s, src) => s + src.secondOrderWeight, 0);
    const secondOrder = parseFloat(Math.min(0.99, baseline + additional).toFixed(4));

    return {
        firstOrder:        firstOrderReport.estimate ?? 0.10,
        secondOrder,                               // always > 0
        collapsed:         false,                  // NEVER collapses to 0
        metaFactorCount:   activeMeta.length,
        calibrationNeeded: secondOrder > 0.20,
        wideBounds:        secondOrder > 0.30,
    };
}

// Calibrate a raw confidence claim using the second-order uncertainty report
// Wider second-order uncertainty → more aggressive confidence reduction
function calibrateConfidence(rawConfidence = 0.80, secondOrderReport = {}) {
    const secondOrder = secondOrderReport.secondOrder ?? 0.05;
    // Calibration reduction: proportional to second-order uncertainty
    const reduction = secondOrder * 0.50;
    const calibrated = parseFloat(Math.max(0.01, rawConfidence - reduction).toFixed(4));

    const overconfidenceFlag = rawConfidence > calibrated + 0.25;

    return {
        rawConfidence,
        calibratedConfidence:  calibrated,
        calibrationApplied:    true,
        reductionApplied:      parseFloat(reduction.toFixed(4)),
        overconfidenceFlag,
        secondOrderUncertainty: secondOrder,
    };
}

// Detect overconfidence: claimed confidence far exceeds what calibration supports
function detectOverconfidence(claimedConfidence = 0.80, calibrationReport = {}) {
    const calibrated = calibrationReport.calibratedConfidence ?? claimedConfidence;
    const gap = parseFloat((claimedConfidence - calibrated).toFixed(4));
    return {
        overconfident:    gap > 0.20,
        gap,
        claimedConfidence,
        calibratedConfidence: calibrated,
        severity:         gap > 0.40 ? 'CRITICAL' : gap > 0.20 ? 'MODERATE' : 'NONE',
    };
}

// Full meta-uncertainty pipeline: factors → first-order → second-order → calibration
function runMetaUncertaintyPipeline(firstOrderFactors = [], metaFactors = [], rawConfidence = 0.80) {
    const firstOrder  = estimateFirstOrderUncertainty(firstOrderFactors);
    const secondOrder = estimateSecondOrderUncertainty(firstOrder, metaFactors);
    const calibration = calibrateConfidence(rawConfidence, secondOrder);
    const overconfidence = detectOverconfidence(rawConfidence, calibration);

    return {
        firstOrder,
        secondOrder,
        calibration,
        overconfidence,
        finalCalibratedConfidence: calibration.calibratedConfidence,
        metaUncertaintyPresent:    secondOrder.secondOrder > 0,
        certaintyInflationDetected: overconfidence.overconfident,
    };
}

module.exports = {
    UNCERTAINTY_SOURCES,
    estimateFirstOrderUncertainty,
    estimateSecondOrderUncertainty,
    calibrateConfidence,
    detectOverconfidence,
    runMetaUncertaintyPipeline,
};
