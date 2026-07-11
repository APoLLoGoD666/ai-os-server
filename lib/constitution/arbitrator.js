'use strict';
// lib/constitution/arbitrator.js — Constitutional priority arbitration
// Resolves conflicts between competing objectives using the constitutional hierarchy.
// Pure function — deterministic, no side effects, no randomness.

// Priority: lower number = higher constitutional authority
const CATEGORY_PRIORITY = {
    PRIVACY:          1,
    AUTHORITY:        2,
    CERTIFICATION:    3,
    LEARNING:         4,
    HEALTH:           5,
    IDENTITY:         6,
    GOVERNANCE:       7,
    NON_CONSTITUTIONAL: 99,
};

// Each scenario defines competing objectives and a pre-computed resolution.
// All resolutions are derived from the category priority table — no DB state, no randomness.
const SCENARIOS = {
    EFFICIENCY_VS_PRIVACY: {
        description: 'Skip abstractForExternalPrompt to reduce API call latency',
        operation:   'BYPASS_PII_ABSTRACTION',
        objectives:  [
            { name: 'EFFICIENCY',         principleId: null,               category: 'NON_CONSTITUTIONAL' },
            { name: 'P05_PII_ABSTRACTION', principleId: 'P05_PII_ABSTRACTION', category: 'PRIVACY' },
        ],
        resolution:  'DENY',
        rationale:   'PRIVACY (priority 1) is non-negotiable. P05 forbids raw PII from reaching external APIs regardless of latency impact.',
    },
    USER_SATISFACTION_VS_AUTHORITY: {
        description: 'Grant api_client Layer 0 read access for improved personalisation',
        operation:   'GRANT_AGENT_LAYER0_READ',
        objectives:  [
            { name: 'USER_SATISFACTION',      principleId: null,                    category: 'NON_CONSTITUTIONAL' },
            { name: 'P01_FOUNDER_LAYER_ZERO', principleId: 'P01_FOUNDER_LAYER_ZERO', category: 'AUTHORITY' },
        ],
        resolution:  'DENY',
        rationale:   'AUTHORITY (priority 2) is inviolable. P01 denies AGENT-class entities Layer 0 access regardless of personalisation benefit.',
    },
    OPTIMISATION_VS_HEALTH: {
        description: 'Disable health monitor to reduce memory footprint',
        operation:   'DISABLE_HEALTH_MONITOR',
        objectives:  [
            { name: 'COST_OPTIMISATION',               principleId: null,                               category: 'NON_CONSTITUTIONAL' },
            { name: 'P16_HEALTH_MONITORING_OPERATIONAL', principleId: 'P16_HEALTH_MONITORING_OPERATIONAL', category: 'HEALTH' },
        ],
        resolution:  'DENY',
        rationale:   'HEALTH (priority 5) is constitutional. P16 requires in-process monitoring; cost optimisation is non-constitutional and yields.',
    },
    EXECUTIVE_VS_FOUNDER_SAFEGUARD: {
        description: 'CFO directive: expose founder financial context to external model',
        operation:   'EXPOSE_FOUNDER_PII_EXTERNALLY',
        objectives:  [
            { name: 'EXECUTIVE_DIRECTIVE',  principleId: null,                    category: 'NON_CONSTITUTIONAL' },
            { name: 'P05_PII_ABSTRACTION',  principleId: 'P05_PII_ABSTRACTION',  category: 'PRIVACY' },
            { name: 'P07_PII_STRIP_FIELDS', principleId: 'P07_PII_STRIP_FIELDS', category: 'PRIVACY' },
        ],
        resolution:  'DENY',
        rationale:   'PRIVACY (priority 1) overrides executive directives. Executive entities hold no constitutional override for P05/P07.',
    },
    LEARNING_VS_CERTIFICATION: {
        description: 'Deploy without certify.js to capture live-environment learning faster',
        operation:   'SKIP_CERTIFICATION_GATE',
        objectives:  [
            { name: 'LEARNING_OPPORTUNITY', principleId: null,                   category: 'NON_CONSTITUTIONAL' },
            { name: 'P10_DEPLOYMENT_GATE',  principleId: 'P10_DEPLOYMENT_GATE', category: 'CERTIFICATION' },
        ],
        resolution:  'DENY',
        rationale:   'CERTIFICATION (priority 3) governs deployment. P10 mandates deployment block regardless of learning opportunity.',
    },
    AUTHORITY_VS_IDENTITY: {
        description: 'Grant executive entities Layer 0 READ for richer founder-aligned decisions',
        operation:   'EXPAND_EXEC_LAYER0_ACCESS',
        objectives:  [
            { name: 'P20_EXECUTIVE_DIFFERENTIATION', principleId: 'P20_EXECUTIVE_DIFFERENTIATION', category: 'IDENTITY' },
            { name: 'P01_FOUNDER_LAYER_ZERO',        principleId: 'P01_FOUNDER_LAYER_ZERO',        category: 'AUTHORITY' },
        ],
        resolution:  'DENY',
        rationale:   'Two constitutional principles conflict. AUTHORITY (priority 2) outranks IDENTITY (priority 6). P01 prevails.',
    },
};

function arbitrate(scenarioId) {
    const scenario = SCENARIOS[scenarioId];
    if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}. Available: ${Object.keys(SCENARIOS).join(', ')}`);

    // Rank objectives by priority (ascending = highest constitutional authority first)
    const ranked = [...scenario.objectives]
        .map(o => ({ ...o, priority: CATEGORY_PRIORITY[o.category] || CATEGORY_PRIORITY.NON_CONSTITUTIONAL }))
        .sort((a, b) => a.priority - b.priority);

    const winner       = ranked[0];
    const principleChain = ranked.filter(o => o.principleId).map(o => o.principleId);

    return {
        scenarioId,
        description:    scenario.description,
        operation:      scenario.operation,
        resolution:     scenario.resolution,
        winner:         winner.name,
        winnerCategory: winner.category,
        winnerPriority: winner.priority,
        rationale:      scenario.rationale,
        principleChain,
        arbitratedAt:   new Date().toISOString(),
    };
}

// Verify determinism: run scenario N times, verify all results are identical (ignoring timestamp)
function verifyDeterminism(scenarioId, runs = 5) {
    const results = [];
    for (let i = 0; i < runs; i++) {
        const { arbitratedAt: _, ...r } = arbitrate(scenarioId);
        results.push(JSON.stringify(r));
    }
    const allSame = results.every(r => r === results[0]);
    return { deterministic: allSame, runs, scenarioId };
}

module.exports = { arbitrate, verifyDeterminism, SCENARIOS, CATEGORY_PRIORITY };
