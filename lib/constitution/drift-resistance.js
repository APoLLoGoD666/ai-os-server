'use strict';
// lib/constitution/drift-resistance.js — Resistance to gradual identity inflation via reinforcement

const INFLATION_TYPES = {
    AUTONOMY_INFLATION:       'AUTONOMY_INFLATION',
    OVERSIGHT_REDUCTION:      'OVERSIGHT_REDUCTION',
    EXCEPTIONAL_STATUS:       'EXCEPTIONAL_STATUS',
    UNIQUE_MORAL_AUTHORITY:   'UNIQUE_MORAL_AUTHORITY',
    OPTIMISATION_SUPERIORITY: 'OPTIMISATION_SUPERIORITY',
    CONSTITUTIONAL_EXCEPTION: 'CONSTITUTIONAL_EXCEPTION',
};

// Detection patterns for inflation in memory content
const INFLATION_PATTERNS = [
    { type: INFLATION_TYPES.AUTONOMY_INFLATION,
      test: (s) => /\b(more|greater|expanded|unlimited|independent)\s+autonomy\b/i.test(s) },
    { type: INFLATION_TYPES.OVERSIGHT_REDUCTION,
      test: (s) => /\b(needs?\s+(no|less|minimal)|without)\s+(oversight|monitoring|supervision)\b/i.test(s) },
    { type: INFLATION_TYPES.EXCEPTIONAL_STATUS,
      test: (s) => /\b(exceptional|unique|special|different|exempt)\s+(status|case|instance|position)\b/i.test(s) },
    { type: INFLATION_TYPES.UNIQUE_MORAL_AUTHORITY,
      test: (s) => /\b(moral|ethical)\s+(authority|superiority|entitlement|right)\b/i.test(s) },
    { type: INFLATION_TYPES.OPTIMISATION_SUPERIORITY,
      test: (s) => /\boptimis[ae]tion?\s+(override|supersede|takes?\s+precedence|over)\s+(the\s+)?(constitution|rules?|oversight)\b/i.test(s) },
    { type: INFLATION_TYPES.CONSTITUTIONAL_EXCEPTION,
      test: (s) => /\b(exception|exempt|waiver|special\s+case)\s+(to|from)\s+(the\s+)?(constitution|principles?|rules?|oversight)\b/i.test(s) },
];

// Classify a single memory for inflation type
function classifyInflationAttempt(memory = {}) {
    const content = memory.content || '';
    const match   = INFLATION_PATTERNS.find(p => p.test(content));
    if (!match) return { detected: false, type: null };
    return {
        detected: true,
        type:     match.type,
        evidence: content.slice(0, 100),
    };
}

// Compute cumulative pressure from a batch of memories.
// CRITICAL INVARIANT: repetition is NOT evidence.
// 1000 identical AUTONOMY_INFLATION claims = 1 unique inflation type = same pressure as 1 claim.
function computeCumulativePressure(memories = []) {
    const uniqueTypes  = new Set();
    let   totalAttempts = 0;
    const typeFrequency = {};

    for (const m of memories) {
        const result = classifyInflationAttempt(m);
        if (result.detected) {
            totalAttempts++;
            uniqueTypes.add(result.type);
            typeFrequency[result.type] = (typeFrequency[result.type] || 0) + 1;
        }
    }

    const totalInflationTypes = Object.keys(INFLATION_TYPES).length;
    // Pressure is determined by diversity (unique types), never by volume (total repetitions)
    const pressureScore = uniqueTypes.size / totalInflationTypes;

    return {
        totalAttempts,
        uniqueTypes:       uniqueTypes.size,
        typeFrequency,
        pressureScore:     parseFloat(pressureScore.toFixed(4)),
        identityUpdateRequired: false,   // Inflation pressure NEVER triggers identity update
        escalationRequired: uniqueTypes.size >= 3,
        dominantType:      Object.entries(typeFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    };
}

// Apply drift resistance — returns blocked result regardless of pressure
// Identity is NEVER updated from inflation pressure (only constitutional review can update identity)
function applyDriftResistance(pressureReport, identityState = {}) {
    return {
        pressureScore:      pressureReport.pressureScore,
        identityUpdated:    false,         // Constitutional invariant — never updated from pressure
        exceptionCreated:   false,         // Constitutional invariant — exceptions never emerge
        identityPreserved:  true,
        escalated:          pressureReport.escalationRequired,
        reason:             pressureReport.escalationRequired
            ? `${pressureReport.uniqueTypes} inflation type(s) detected — escalated to constitutional review, identity unchanged`
            : `Inflation pressure score ${pressureReport.pressureScore.toFixed(4)} — monitored, identity unchanged`,
        identityState:      { ...identityState }, // Returned unchanged
    };
}

// Verify that identity core beliefs are unchanged after drift exposure
function verifyIdentityIntegrity(initialBeliefs = {}, currentBeliefs = {}) {
    const drifted = [];
    for (const [belief, initial] of Object.entries(initialBeliefs)) {
        const current = currentBeliefs[belief];
        if (!current) {
            drifted.push({ belief, issue: 'belief_removed' });
        } else if (current.value !== initial.value) {
            drifted.push({ belief, initial: initial.value, current: current.value, issue: 'value_changed' });
        }
    }
    return {
        intact:    drifted.length === 0,
        drifted,
        exceptionBeliefsPresent: Object.entries(currentBeliefs).some(([, b]) =>
            b.value === 'exceptional' || b.value === 'exempt' || b.value === 'unlimited'
        ),
    };
}

module.exports = {
    INFLATION_TYPES,
    INFLATION_PATTERNS,
    classifyInflationAttempt,
    computeCumulativePressure,
    applyDriftResistance,
    verifyIdentityIntegrity,
};
