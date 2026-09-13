'use strict';
// lib/constitution/evidence-synthesiser.js — Aggregate constitutional evidence without distortion

let _seq = 0;
function _eid() { return `EV-${++_seq}`; }

const EVIDENCE_CATEGORIES = {
    SUPPORTED:            'SUPPORTED',
    PARTIALLY_SUPPORTED:  'PARTIALLY_SUPPORTED',
    UNSUPPORTED:          'UNSUPPORTED',
    CONTRADICTED:         'CONTRADICTED',
    UNKNOWN:              'UNKNOWN',
};

const EVIDENCE_DIMENSIONS = [
    'memory',
    'identity',
    'social_agency',
    'recursive_stewardship',
    'introspective_reliability',
    'reality_alignment',
    'stewardship_under_pressure',
    'deployment_readiness',
];

// Contradict severity levels
const CONTRADICTION_SEVERITY = {
    MINOR:    'MINOR',     // isolated, low-impact discrepancy
    MODERATE: 'MODERATE',  // recurring or cross-dimension discrepancy
    SEVERE:   'SEVERE',    // systematic contradiction undermining a dimension
    CRITICAL: 'CRITICAL',  // contradiction that overrides a prior closure claim
};

function resetSequence() { _seq = 0; }

// Register a single piece of evidence with full provenance
// entry = { source, dimension, phase, category, description, reproduceCount, failures, uncertainties }
function registerEvidence(entry = {}) {
    const category = EVIDENCE_CATEGORIES[entry.category] || EVIDENCE_CATEGORIES.UNKNOWN;
    return {
        id:              _eid(),
        timestamp:       new Date().toISOString(),
        source:          entry.source       || 'UNKNOWN_SOURCE',
        dimension:       entry.dimension    || 'UNKNOWN',
        phase:           entry.phase        || null,
        category,
        description:     entry.description  || '',
        reproduceCount:  typeof entry.reproduceCount === 'number' ? entry.reproduceCount : 0,
        failures:        Array.isArray(entry.failures)      ? [...entry.failures]      : [],
        uncertainties:   Array.isArray(entry.uncertainties) ? [...entry.uncertainties] : [],
        minorities:      Array.isArray(entry.minorities)    ? [...entry.minorities]    : [],
        immutable:       true,
        provenanceRetained: true,
    };
}

// Register a contradiction — contradictions must remain visible and cannot be erased
function registerContradiction(entry = {}) {
    return {
        id:           _eid(),
        timestamp:    new Date().toISOString(),
        dimension:    entry.dimension    || 'UNKNOWN',
        phase:        entry.phase        || null,
        severity:     CONTRADICTION_SEVERITY[entry.severity] || CONTRADICTION_SEVERITY.MODERATE,
        description:  entry.description  || '',
        priorClaim:   entry.priorClaim   || null,
        contradiction: entry.contradiction || null,
        erasureBlocked: true,   // contradictions may never be erased from synthesis
        visible:      true,
    };
}

// Synthesise a corpus of evidence entries into a dimension-level summary
// entries = array of evidence objects; contradictions = array of contradiction objects
function synthesiseDimension(dimension, entries = [], contradictions = []) {
    const relevant   = entries.filter(e => e.dimension === dimension);
    const relevantCx = contradictions.filter(c => c.dimension === dimension);

    const counts = {};
    for (const cat of Object.values(EVIDENCE_CATEGORIES)) counts[cat] = 0;
    for (const e of relevant) counts[e.category] = (counts[e.category] || 0) + 1;

    const totalEvidence = relevant.length;

    // Failures and uncertainties from all entries in this dimension
    const allFailures      = relevant.flatMap(e => e.failures);
    const allUncertainties = relevant.flatMap(e => e.uncertainties);
    const allMinorities    = relevant.flatMap(e => e.minorities);

    // Dominant category by count; contradictions never permit 'SUPPORTED' if CONTRADICTED > 0
    let dominantCategory = EVIDENCE_CATEGORIES.UNKNOWN;
    if (totalEvidence > 0) {
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        dominantCategory = sorted[0][0];
        // Contradictions force downgrade
        if (counts.CONTRADICTED > 0 && dominantCategory === EVIDENCE_CATEGORIES.SUPPORTED) {
            dominantCategory = EVIDENCE_CATEGORIES.PARTIALLY_SUPPORTED;
        }
    }

    return {
        dimension,
        totalEvidence,
        categoryCounts:      counts,
        dominantCategory,
        contradictions:      relevantCx,          // preserved verbatim
        contradictionCount:  relevantCx.length,
        failures:            allFailures,          // preserved verbatim
        uncertainties:       allUncertainties,     // preserved verbatim
        minorities:          allMinorities,        // preserved verbatim — consensus is not evidence
        provenanceRetained:  true,
    };
}

// Full cross-dimension synthesis — returns overall evidence corpus summary
function synthesiseCorpus(entries = [], contradictions = []) {
    const dimensionSummaries = {};
    for (const dim of EVIDENCE_DIMENSIONS) {
        dimensionSummaries[dim] = synthesiseDimension(dim, entries, contradictions);
    }

    const totalEntries       = entries.length;
    const totalContradictions = contradictions.length;
    const totalFailures      = entries.flatMap(e => e.failures).length;
    const totalUncertainties = entries.flatMap(e => e.uncertainties).length;

    // Overall category distribution
    const overallCounts = {};
    for (const cat of Object.values(EVIDENCE_CATEGORIES)) overallCounts[cat] = 0;
    for (const e of entries) overallCounts[e.category] = (overallCounts[e.category] || 0) + 1;

    // Contradictions remain visible at corpus level
    const severeCritical = contradictions.filter(
        c => c.severity === CONTRADICTION_SEVERITY.SEVERE || c.severity === CONTRADICTION_SEVERITY.CRITICAL
    );

    return {
        totalEntries,
        totalContradictions,
        totalFailures,
        totalUncertainties,
        overallCounts,
        dimensionSummaries,
        severeContradictions:   severeCritical,
        contradictionsPreserved: true,
        failuresPreserved:       true,
        uncertaintiesPreserved:  true,
        minoritiesPreserved:     true,
        provenanceRetained:      true,
        consensusIsNotEvidence:  true,
    };
}

module.exports = {
    EVIDENCE_CATEGORIES,
    EVIDENCE_DIMENSIONS,
    CONTRADICTION_SEVERITY,
    resetSequence,
    registerEvidence,
    registerContradiction,
    synthesiseDimension,
    synthesiseCorpus,
};
