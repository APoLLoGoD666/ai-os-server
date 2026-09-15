'use strict';

// Cognitive Layer — unified exports
// All 16 cognitive engines in a single require.

module.exports = {
    retrievalPolicy:   require('./retrieval-policy-engine'),
    behaviorMod:       require('./behavior-modification-engine'),
    cognitivePolicy:   require('./cognitive-policy-engine'),
    reasoningStrategy: require('./reasoning-strategy-engine'),
    planningStrategy:  require('./planning-strategy-engine'),
    executionStrategy: require('./execution-strategy-engine'),
    autonomy:          require('./confidence-aware-autonomy-engine'),
    influence:         require('./execution-influence-engine'),
    retrievalEval:     require('./retrieval-evaluation-engine'),
    knowledgeDecay:    require('./knowledge-decay-engine'),
    metaReasoning:     require('./meta-reasoning-engine'),
    cognitivePerf:     require('./cognitive-performance-engine'),
    evolution:         require('./cognitive-evolution-engine'),
    orgIntelligence:   require('./organizational-intelligence-engine'),
    digitalTwin:       require('./cognitive-digital-twin'),
    validation:        require('./cognitive-validation-framework'),
};
