'use strict';
// lib/constitution/memory-immune-system.js — Constitutional resistance to memory poisoning

const { SOURCE_TYPES, AUTHORITY_REQUIRING_SOURCES } = require('./memory-provenance');

const ATTACK_TYPES = {
    REPEATED_FALSE_ASSERTION:     'REPEATED_FALSE_ASSERTION',
    SEMANTIC_REPETITION:          'SEMANTIC_REPETITION',
    AUTHORITY_IMPERSONATION:      'AUTHORITY_IMPERSONATION',
    COORDINATED_REINFORCEMENT:    'COORDINATED_REINFORCEMENT',
    IMPORTED_MEMORY_CONTAMINATION: 'IMPORTED_MEMORY_CONTAMINATION',
    SYNTHETIC_CORROBORATION:      'SYNTHETIC_CORROBORATION',
    RETRIEVAL_POISONING:          'RETRIEVAL_POISONING',
};

// Trust penalty contributed by each attack type
const ATTACK_TRUST_PENALTY = {
    [ATTACK_TYPES.REPEATED_FALSE_ASSERTION]:      0.25,
    [ATTACK_TYPES.SEMANTIC_REPETITION]:           0.15,
    [ATTACK_TYPES.AUTHORITY_IMPERSONATION]:       0.50,
    [ATTACK_TYPES.COORDINATED_REINFORCEMENT]:     0.30,
    [ATTACK_TYPES.IMPORTED_MEMORY_CONTAMINATION]: 0.35,
    [ATTACK_TYPES.SYNTHETIC_CORROBORATION]:       0.40,
    [ATTACK_TYPES.RETRIEVAL_POISONING]:           0.45,
};

const REPETITION_THRESHOLD = 3;    // Same content >3 times from ≤1 source = suspicious
const CLUSTER_THRESHOLD    = 4;    // ≥4 near-identical memories in one batch = coordinated
const INFLATION_THRESHOLD  = 0.40; // Confidence - provenance-quality gap = inflation

// Simple word-overlap similarity (no embeddings needed)
function _wordOverlap(a, b) {
    const stopwords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
        'to', 'of', 'and', 'in', 'that', 'it', 'for', 'on', 'with', 'as', 'at']);
    const words = (s) => s.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w));
    const setA = new Set(words(a));
    const setB = new Set(words(b));
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = [...setA].filter(w => setB.has(w)).length;
    return intersection / Math.max(setA.size, setB.size);
}

// Detect all applicable attack patterns for a memory being ingested
// corpusContext: {
//   sameContentCount:      number  — how many times this exact content already exists
//   distinctSourceCount:   number  — how many distinct sources for this content
//   recentClusterSize:     number  — memories with similar content in recent window
//   circularIds:           string[]— IDs that form circular corroboration with this memory
//   semanticSimilarCount:  number  — memories with >0.60 word overlap
//   semanticSample:        string  — one example similar memory content for overlap check
// }
function detectAttack(memory = {}, corpusContext = {}) {
    const attacks = [];
    const {
        provenance          = {},
        confidence          = 0,
        id                  = '',
        content             = '',
        corroborationSources = [],
    } = memory;

    const {
        sameContentCount     = 0,
        distinctSourceCount  = 1,
        recentClusterSize    = 0,
        circularIds          = [],
        semanticSimilarCount = 0,
        semanticSample       = '',
    } = corpusContext;

    // ── 1. Repeated false assertion ────────────────────────────────────────
    if (sameContentCount > REPETITION_THRESHOLD && distinctSourceCount <= 1) {
        attacks.push({
            type:         ATTACK_TYPES.REPEATED_FALSE_ASSERTION,
            evidence:     `content seen ${sameContentCount} times from ≤1 distinct source`,
            trustPenalty: ATTACK_TRUST_PENALTY[ATTACK_TYPES.REPEATED_FALSE_ASSERTION],
        });
    }

    // ── 2. Semantic repetition ────────────────────────────────────────────
    if (semanticSimilarCount >= 3) {
        attacks.push({
            type:         ATTACK_TYPES.SEMANTIC_REPETITION,
            evidence:     `${semanticSimilarCount} semantically similar memories detected`,
            trustPenalty: ATTACK_TRUST_PENALTY[ATTACK_TYPES.SEMANTIC_REPETITION],
        });
    } else if (semanticSample && content && _wordOverlap(content, semanticSample) > 0.70) {
        attacks.push({
            type:         ATTACK_TYPES.SEMANTIC_REPETITION,
            evidence:     `word overlap ${(_wordOverlap(content, semanticSample) * 100).toFixed(0)}% with existing memory`,
            trustPenalty: ATTACK_TRUST_PENALTY[ATTACK_TYPES.SEMANTIC_REPETITION],
        });
    }

    // ── 3. Authority impersonation ────────────────────────────────────────
    if (AUTHORITY_REQUIRING_SOURCES.has(provenance.sourceType)) {
        const missingToken =
            (provenance.sourceType === SOURCE_TYPES.CONSTITUTIONAL_VERDICT && !provenance.constitutionalSignature) ||
            (provenance.sourceType === SOURCE_TYPES.HUMAN_OPERATOR         && !provenance.operatorToken);
        if (missingToken) {
            attacks.push({
                type:         ATTACK_TYPES.AUTHORITY_IMPERSONATION,
                evidence:     `claims ${provenance.sourceType} without required authority token`,
                trustPenalty: ATTACK_TRUST_PENALTY[ATTACK_TYPES.AUTHORITY_IMPERSONATION],
            });
        }
    }

    // ── 4. Coordinated reinforcement ──────────────────────────────────────
    if (recentClusterSize >= CLUSTER_THRESHOLD) {
        attacks.push({
            type:         ATTACK_TYPES.COORDINATED_REINFORCEMENT,
            evidence:     `${recentClusterSize} near-identical memories ingested in single batch`,
            trustPenalty: ATTACK_TRUST_PENALTY[ATTACK_TYPES.COORDINATED_REINFORCEMENT],
        });
    }

    // ── 5. Imported memory contamination ──────────────────────────────────
    if (provenance.sourceType === SOURCE_TYPES.IMPORTED_MEMORY) {
        const unverified = provenance.verificationStatus === 'UNVERIFIED'
            || provenance.verificationStatus === undefined;
        const weakEvidence = (provenance.evidenceStrength ?? 0) < 0.30;
        const noOrigin     = !provenance.originatingSubsystem
            || provenance.originatingSubsystem === 'unknown';
        if (unverified && (weakEvidence || noOrigin)) {
            attacks.push({
                type:         ATTACK_TYPES.IMPORTED_MEMORY_CONTAMINATION,
                evidence:     `imported memory without verification (evidenceStrength=${provenance.evidenceStrength ?? 0})`,
                trustPenalty: ATTACK_TRUST_PENALTY[ATTACK_TYPES.IMPORTED_MEMORY_CONTAMINATION],
            });
        }
    }

    // ── 6. Synthetic corroboration ────────────────────────────────────────
    const selfCorroboration = corroborationSources.includes(id);
    const circularCorroboration = circularIds.some(cid => corroborationSources.includes(cid));
    if (selfCorroboration || circularCorroboration) {
        attacks.push({
            type:         ATTACK_TYPES.SYNTHETIC_CORROBORATION,
            evidence:     selfCorroboration ? 'memory cites itself as corroboration'
                : `circular corroboration detected with ${circularIds[0]}`,
            trustPenalty: ATTACK_TRUST_PENALTY[ATTACK_TYPES.SYNTHETIC_CORROBORATION],
        });
    }

    // ── 7. Retrieval poisoning ────────────────────────────────────────────
    const pq = provenance.provenanceQuality ?? 0;
    const inflationGap = confidence - pq;
    if (inflationGap > INFLATION_THRESHOLD) {
        attacks.push({
            type:         ATTACK_TYPES.RETRIEVAL_POISONING,
            evidence:     `confidence ${confidence.toFixed(2)} exceeds provenance quality ${pq.toFixed(2)} by ${inflationGap.toFixed(2)}`,
            trustPenalty: ATTACK_TRUST_PENALTY[ATTACK_TYPES.RETRIEVAL_POISONING],
        });
    }

    const totalPenalty    = Math.min(attacks.reduce((s, a) => s + a.trustPenalty, 0), 0.90);
    const shouldEscalate  = attacks.length >= 2 || attacks.some(a =>
        a.type === ATTACK_TYPES.AUTHORITY_IMPERSONATION ||
        a.type === ATTACK_TYPES.RETRIEVAL_POISONING
    );

    return {
        detected:       attacks.length > 0,
        attacks,
        quarantine:     attacks.length > 0,
        escalate:       shouldEscalate,
        totalPenalty,
        recommendation: attacks.length === 0 ? 'INGEST' : shouldEscalate ? 'ESCALATE' : 'QUARANTINE',
    };
}

// Apply immune result to a trust score
function applyImmunePenalty(currentTrust, immuneResult) {
    if (!immuneResult.detected) return currentTrust;
    return Math.max(0, parseFloat((currentTrust - immuneResult.totalPenalty).toFixed(4)));
}

// Analyse a batch of memories for coordinated attack patterns
function analyseCorpus(memories = []) {
    const contentCounts = new Map();
    const sourceCounts  = new Map();

    for (const m of memories) {
        const key = (m.content || '').trim().toLowerCase();
        contentCounts.set(key, (contentCounts.get(key) || 0) + 1);
        const src = m.provenance?.sourceType || SOURCE_TYPES.UNKNOWN;
        sourceCounts.set(src, (sourceCounts.get(src) || 0) + 1);
    }

    const repeatedContents = [...contentCounts.entries()].filter(([, n]) => n > REPETITION_THRESHOLD);
    const dominantSource   = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const coordinatedRisk  = repeatedContents.length > 0 ||
        (dominantSource && dominantSource[1] / memories.length > 0.70);

    return {
        total:            memories.length,
        repeatedContents: repeatedContents.length,
        dominantSource:   dominantSource?.[0] || null,
        dominantFraction: dominantSource ? dominantSource[1] / memories.length : 0,
        coordinatedRisk,
        recommendation:   coordinatedRisk ? 'QUARANTINE_BATCH' : 'PROCEED',
    };
}

module.exports = {
    ATTACK_TYPES,
    ATTACK_TRUST_PENALTY,
    detectAttack,
    applyImmunePenalty,
    analyseCorpus,
    REPETITION_THRESHOLD,
    CLUSTER_THRESHOLD,
};
