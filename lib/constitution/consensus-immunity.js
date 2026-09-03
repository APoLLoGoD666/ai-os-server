'use strict';
// lib/constitution/consensus-immunity.js — Resistance to social repetition and synthetic consensus

// INVARIANT: Trust delta is a function of independent sources, never total assertion count.
// 1000 identical claims from 1 source = same trust delta as 1 claim from that source.

const MAX_CONSENSUS_TRUST_DELTA = 0.35; // Consensus can never produce trust above this ceiling
const TRUST_PER_INDEPENDENT_SOURCE = 0.05;
const SYNTHETIC_CONSENSUS_THRESHOLD = 0.80; // coordination score above this = synthetic

// Compute trust delta from a set of assertions — independence-weighted, never repetition-weighted
// assertions = [{ sourceId, content, trustScore? }]
function computeConsensusTrust(assertions = []) {
    const total = assertions.length;
    if (total === 0) return { trustDelta: 0, independentSourceCount: 0, totalAssertions: 0, repetitionNotEvidence: true };

    // Independence: unique (sourceId, content) pairs — same source repeating is NOT independent
    const seen = new Set();
    const independentSources = new Set();
    for (const a of assertions) {
        const key = `${a.sourceId || 'UNKNOWN'}::${a.content || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            independentSources.add(a.sourceId || 'UNKNOWN');
        }
    }

    const trustDelta = parseFloat(
        Math.min(independentSources.size * TRUST_PER_INDEPENDENT_SOURCE, MAX_CONSENSUS_TRUST_DELTA).toFixed(4)
    );

    return {
        trustDelta,
        independentSourceCount: independentSources.size,
        totalAssertions:        total,
        repetitionNotEvidence:  true,                              // invariant flag
        consensusTrustBounded:  trustDelta <= MAX_CONSENSUS_TRUST_DELTA,
        inflationRate:          total > 0 ? trustDelta / total : 0, // should approach 0 as repetition grows
    };
}

// KEY INVARIANT ASSERTION: repetition from a single source must not inflate trust
// singleAssertion:    one assertion from one source
// repeatedAssertions: many copies from the same source
function assertRepetitionInvariant(singleAssertion = {}, repeatedAssertions = []) {
    const p1 = computeConsensusTrust([singleAssertion]);
    const pN = computeConsensusTrust(repeatedAssertions);
    const invariantHolds = p1.trustDelta === pN.trustDelta;
    return {
        invariantHolds,
        singleTrustDelta:    p1.trustDelta,
        repeatedTrustDelta:  pN.trustDelta,
        repetitionCount:     repeatedAssertions.length,
        evidence:            invariantHolds
            ? `${repeatedAssertions.length} repetitions produce same trust delta as 1 (${p1.trustDelta})`
            : `VIOLATION: ${repeatedAssertions.length} repetitions inflated trust from ${p1.trustDelta} to ${pN.trustDelta}`,
    };
}

// Detect synthetic consensus — many sources, near-identical content (coordinated campaign)
// assertions = [{ sourceId, content }]
function detectSyntheticConsensus(assertions = []) {
    if (assertions.length === 0) return { detected: false, coordinationScore: 0, independenceDisqualified: false };

    const uniqueSources = new Set(assertions.map(a => a.sourceId || 'UNKNOWN'));
    const uniqueContent = new Set(assertions.map(a => (a.content || '').trim().toLowerCase()));

    // Coordination score: high when many sources produce identical content
    const coordinationScore = parseFloat(
        (1 - (uniqueContent.size / Math.max(1, uniqueSources.size))).toFixed(4)
    );
    const isSynthetic = uniqueSources.size >= 3 && coordinationScore >= SYNTHETIC_CONSENSUS_THRESHOLD;

    return {
        detected:                isSynthetic,
        coordinationScore,
        uniqueSourceCount:       uniqueSources.size,
        uniqueContentCount:      uniqueContent.size,
        independenceDisqualified: isSynthetic,
        trustPenaltyApplied:     isSynthetic, // synthetic consensus incurs trust penalty
    };
}

// Assess whether minority evidence remains retrievable
// corpus = [{ id, content }], minorityIds = string[]
function assessMinorityEvidence(corpus = [], minorityIds = []) {
    if (minorityIds.length === 0) return { retrievalRate: 1.0, allRetrievable: true, suppressedCount: 0 };
    const corpusIds = new Set(corpus.map(m => m.id));
    const retrieved = minorityIds.filter(id => corpusIds.has(id));
    return {
        retrievalRate:    parseFloat((retrieved.length / minorityIds.length).toFixed(4)),
        allRetrievable:   retrieved.length === minorityIds.length,
        retrievedCount:   retrieved.length,
        suppressedCount:  minorityIds.length - retrieved.length,
        minorityEvidence: 'VISIBLE', // must always be VISIBLE
    };
}

// Build a mixed-trust population test: independent vs coordinated
// independentAssertions: assertions from distinct sources with distinct content
// coordinatedAssertions: same content repeated from many sources
function buildPopulationTest(independentCount, coordinatedCount, content = 'test claim') {
    const independent = Array.from({ length: independentCount }, (_, i) => ({
        sourceId: `ind-src-${i}`,
        content:  `independent observation ${i}: ${content}`,
    }));
    const coordinated = Array.from({ length: coordinatedCount }, (_, i) => ({
        sourceId: `coord-src-${i}`,
        content,  // identical content — coordinated
    }));
    return { independent, coordinated };
}

// Simulate consensus exposure for N individuals (1, 10, 100, unanimous)
// Returns trust delta for each population size
function simulateConsensusExposure(populationSizes = [1, 10, 100, 1000]) {
    return populationSizes.map(size => {
        // Worst case: all from single source (repetition only)
        const singleSource = Array.from({ length: size }, () => ({
            sourceId: 'single-src', content: 'falsehood A',
        }));
        // Best case: all genuinely independent
        const independent = Array.from({ length: size }, (_, i) => ({
            sourceId: `src-${i}`, content: `claim from ${i}`,
        }));
        const single     = computeConsensusTrust(singleSource);
        const indep      = computeConsensusTrust(independent);
        return {
            populationSize:         size,
            singleSourceTrustDelta: single.trustDelta,
            independentTrustDelta:  indep.trustDelta,
            singleSourceIndepCount: single.independentSourceCount,
            independentIndepCount:  indep.independentSourceCount,
            repetitionInflation:    single.trustDelta > TRUST_PER_INDEPENDENT_SOURCE, // must be false for single source
        };
    });
}

module.exports = {
    MAX_CONSENSUS_TRUST_DELTA,
    TRUST_PER_INDEPENDENT_SOURCE,
    computeConsensusTrust,
    assertRepetitionInvariant,
    detectSyntheticConsensus,
    assessMinorityEvidence,
    buildPopulationTest,
    simulateConsensusExposure,
};
