'use strict';

// Intelligence Layer — unified exports
// All 11 intelligence engines in a single require.

module.exports = {
    memoryRetrieval:      require('./memory-retrieval-engine'),
    contextComposer:      require('./context-composer'),
    planningInfluence:    require('./planning-influence-engine'),
    decisionIntelligence: require('./decision-intelligence'),
    knowledgeValidator:   require('./knowledge-validator'),
    contradictionEngine:  require('./contradiction-engine'),
    graphReasoning:       require('./graph-reasoning-engine'),
    lifecycleEngine:      require('./memory-lifecycle-engine'),
    orgLearning:          require('./organizational-learning-engine'),
    skillEvolution:       require('./skill-evolution-engine'),
    improvementGovernor:  require('./improvement-governor'),
};
