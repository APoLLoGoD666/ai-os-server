'use strict';

// Memory Architecture — unified export for all 13 memory layers + engines.
// Import as: const memory = require('./lib/memory');
// Or selectively: const { workingMemory, skillMemory } = require('./lib/memory');

module.exports = {
    // Layer 1: Working Memory (TTL-based, session-scoped)
    workingMemory:      require('./working-memory'),

    // Layer 2: Episodic Memory (Postgres — durable task execution history)
    episodicMemory:     require('./episodic-memory-pg'),

    // Layer 3: Semantic Memory (validated facts, concepts, patterns, rules)
    semanticMemory:     require('./semantic-memory'),

    // Layer 4: Procedural Memory (playbooks, workflows, recovery procedures)
    proceduralMemory:   require('./procedural-memory'),

    // Layer 5: Strategic Memory (goals, roadmaps, priorities, direction)
    strategicMemory:    require('./strategic-memory'),

    // Layer 6: Skill Memory (competency metrics, confidence, success/failure rates)
    skillMemory:        require('./skill-memory'),

    // Layer 7: Decision Memory (decisions, alternatives, rationale, outcomes)
    decisionMemory:     require('./decision-memory'),

    // Layer 8: Knowledge Graph (nodes, edges, traversal, confidence scoring)
    knowledgeGraph:     require('./knowledge-graph'),

    // Layer 10: Memory Consolidation Engine (raw → reflections → lessons → patterns → knowledge)
    consolidationEngine: require('./consolidation-engine'),

    // Layer 11: Reflexion Tracker (closed-loop lesson→behavior verification)
    reflexionTracker:   require('./reflexion-tracker'),

    // Layer 12: Improvement Engine (closed-loop observation→deployment→validation)
    improvementEngine:  require('./improvement-engine'),

    // Layer 13: Adaptation Cycle (weekly: lessons→patterns→knowledge→behavior changes)
    adaptationCycle:    require('./adaptation-cycle'),

    // Governance utilities
    governor:           require('./memory-governor'),
};
