'use strict';

// Canonical registry of all agents in the Apex AI OS system.
// Source of truth for capability lookups and pipeline ordering.

const PIPELINE_AGENTS = [
    {
        id: 'RESEARCHER', role: 'pipeline', optional: true, order: 0,
        capabilities: ['web_search', 'firecrawl', 'browser_automation', 'research', 'context_enrichment'],
        model: 'dynamic', description: 'Optional pre-ARCHITECT web research via Firecrawl or browser-agent'
    },
    {
        id: 'ARCHITECT', role: 'pipeline', optional: false, order: 1,
        capabilities: ['planning', 'code_analysis', 'spec_design', 'test_case_generation', 'route_mapping'],
        model: 'dynamic', description: 'JSON plan generation: files, steps, testCases, confidence'
    },
    {
        id: 'DEVELOPER', role: 'pipeline', optional: false, order: 2,
        capabilities: ['code_generation', 'file_writing', 'route_creation', 'js_node', 'express'],
        model: 'dynamic', description: 'Writes or updates files into git worktree isolation'
    },
    {
        id: 'REVIEWER', role: 'pipeline', optional: false, order: 3,
        capabilities: ['code_review', 'security_audit', 'owasp_check', 'stride_audit', 'ui_audit', 'decision_check'],
        model: 'dynamic', description: 'OWASP Top 10 + STRIDE security review + prior-decision conflict check'
    },
    {
        id: 'VALIDATOR', role: 'pipeline', optional: false, order: 4,
        capabilities: ['spec_validation', 'test_case_verification', 'behavior_check'],
        model: 'dynamic', description: 'Verifies implementation satisfies ARCHITECT test cases'
    },
    {
        id: 'TESTER', role: 'pipeline', optional: false, order: 5,
        capabilities: ['syntax_validation', 'node_check', 'static_analysis'],
        model: 'none', description: 'node --check syntax validation — no API call'
    },
    {
        id: 'COMMITTER', role: 'pipeline', optional: false, order: 6,
        capabilities: ['git_commit', 'git_merge', 'git_push', 'render_deploy', 'worktree_cleanup'],
        model: 'none', description: 'Commits worktree → merges to main → pushes → triggers Render deploy'
    },
    {
        id: 'REFLECTOR', role: 'pipeline', optional: false, order: 7, async: true,
        capabilities: ['lesson_extraction', 'self_reflection', 'vault_write', 'north_star_proposal'],
        model: 'haiku', description: 'Post-run reflexion: lesson to Obsidian, NorthStar proposals on repeated failures'
    },
];

const DOMAIN_AGENTS = [
    {
        id: 'system', role: 'domain', category: 'infrastructure',
        capabilities: ['infrastructure_monitoring', 'pipeline_diagnostics', 'cost_analysis', 'performance_reporting', 'agent_metrics'],
        model: 'haiku', description: 'Render health, pipeline analysis, cost trends, circuit breaker status'
    },
    {
        id: 'file', role: 'domain', category: 'operations',
        capabilities: ['vault_management', 'document_search', 'knowledge_base', 'file_operations', 'link_maintenance'],
        model: 'haiku', description: 'Obsidian vault CRUD, orphan detection, wikilink maintenance'
    },
    {
        id: 'uni', role: 'domain', category: 'education',
        capabilities: ['academic_tracking', 'flashcards', 'study_sessions', 'textbook_queries', 'spaced_repetition'],
        model: 'haiku', description: 'Modules, assignments, SM-2 flashcards, CS249R textbook, Pomodoro'
    },
    {
        id: 'finance', role: 'domain', category: 'finance',
        capabilities: ['transaction_tracking', 'budget_management', 'invoice_creation', 'financial_analysis', 'spend_categorization'],
        model: 'haiku', description: 'GBP income/expense tracking, budgets, invoices, API credit monitoring'
    },
    {
        id: 'business', role: 'domain', category: 'business',
        capabilities: ['crm', 'client_pipeline', 'project_management', 'proposal_drafting', 'approval_handling'],
        model: 'haiku', description: 'CRM pipeline, proposals, task queue, agent approval gateway'
    },
];

// Fast lookup maps
const _byId = new Map();
const _byCapability = new Map();

for (const agent of [...PIPELINE_AGENTS, ...DOMAIN_AGENTS]) {
    _byId.set(agent.id, agent);
    for (const cap of (agent.capabilities || [])) {
        if (!_byCapability.has(cap)) _byCapability.set(cap, []);
        _byCapability.get(cap).push(agent.id);
    }
}

function getAllAgents() {
    return {
        pipeline: PIPELINE_AGENTS,
        domain:   DOMAIN_AGENTS,
        total:    PIPELINE_AGENTS.length + DOMAIN_AGENTS.length,
    };
}

function getAgent(id) {
    return _byId.get(id) || null;
}

function getAgentCapabilities(id) {
    return (_byId.get(id) || {}).capabilities || [];
}

function findAgentsByCapability(capability) {
    return _byCapability.get(capability) || [];
}

function getPipelineOrder() {
    return PIPELINE_AGENTS.slice().sort((a, b) => a.order - b.order).map(a => a.id);
}

function getDomainAgentIds() {
    return DOMAIN_AGENTS.map(a => a.id);
}

function getCapabilityMap() {
    const map = {};
    for (const [cap, agents] of _byCapability.entries()) map[cap] = agents;
    return map;
}

function getRegistrySummary() {
    return {
        pipelineAgents: PIPELINE_AGENTS.length,
        domainAgents:   DOMAIN_AGENTS.length,
        capabilities:   _byCapability.size,
        generatedAt:    new Date().toISOString(),
    };
}

module.exports = {
    getAllAgents,
    getAgent,
    getAgentCapabilities,
    findAgentsByCapability,
    getPipelineOrder,
    getDomainAgentIds,
    getCapabilityMap,
    getRegistrySummary,
    PIPELINE_AGENTS,
    DOMAIN_AGENTS,
};
