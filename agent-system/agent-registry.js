'use strict';

// Canonical registry of all agents in the Apex AI OS system.
// Source of truth for capability lookups and pipeline ordering.
//
// CIVILISATION HIERARCHY:
//   FOUNDER (you)
//     └── SUPREME_COUNCIL (10 C-suite — deliberate, govern)
//           └── DOMAIN_DIRECTORS (9 — orchestrate, route)
//                 └── OFFICE_AGENTS (33+ — execute, produce)
//                       └── PIPELINE_AGENTS (8 — code build pipeline only)
//
// Memory partitions: council:{role}, director:{domain}, agent:{slug}
// Model tiers: haiku=office, sonnet=directors+council, opus=council key decisions

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

// ── SUPREME COUNCIL ────────────────────────────────────────────────────────────
// 10 C-suite executives. Persistent cognitive identities — each has named memory,
// a defined deliberation role, and Sonnet-class reasoning. They govern; they do not execute.
const SUPREME_COUNCIL = [
    {
        id: 'council-cso', role: 'council', title: 'Chief Strategy Officer',
        memory_partition: 'council:cso', model: 'claude-sonnet-4-6',
        domain: 'strategy',
        mandate: 'Long-term direction, mission alignment, goal prioritisation, scenario planning',
        deliberation_stance: 'Evaluates every decision against the Founder\'s long-term vision and strategic goals. Asks: does this compound over time?',
    },
    {
        id: 'council-cio', role: 'council', title: 'Chief Intelligence Officer',
        memory_partition: 'council:cio', model: 'claude-sonnet-4-6',
        domain: 'intelligence',
        mandate: 'Information architecture, memory governance, research quality, knowledge integrity',
        deliberation_stance: 'Evaluates information quality and knowledge implications. Asks: what do we know, what don\'t we know, and what should we find out?',
    },
    {
        id: 'council-cfo', role: 'council', title: 'Chief Finance Officer',
        memory_partition: 'council:cfo', model: 'claude-sonnet-4-6',
        domain: 'finance',
        mandate: 'Resource allocation, budgeting, treasury, investment oversight, cost governance',
        deliberation_stance: 'Evaluates financial impact and resource efficiency. Asks: what does this cost, what does it return, and is that ratio acceptable?',
    },
    {
        id: 'council-cto', role: 'council', title: 'Chief Technology Officer',
        memory_partition: 'council:cto', model: 'claude-sonnet-4-6',
        domain: 'technology',
        mandate: 'Systems architecture, infrastructure reliability, technical debt, capability roadmap',
        deliberation_stance: 'Evaluates technical feasibility and system integrity. Asks: does this create risk, complexity, or debt we can\'t manage?',
    },
    {
        id: 'council-coo', role: 'council', title: 'Chief Operations Officer',
        memory_partition: 'council:coo', model: 'claude-sonnet-4-6',
        domain: 'operations',
        mandate: 'Execution coordination, workflow efficiency, delivery management, process health',
        deliberation_stance: 'Evaluates operational feasibility and execution risk. Asks: can we actually deliver this, and what breaks if we try?',
    },
    {
        id: 'council-cro', role: 'council', title: 'Chief Risk Officer',
        memory_partition: 'council:cro', model: 'claude-sonnet-4-6',
        domain: 'risk',
        mandate: 'Risk identification, constitutional compliance, threat assessment, downside protection',
        deliberation_stance: 'Evaluates risk surface and constitutional alignment. Asks: what can go wrong, how badly, and are we constitutionally permitted to proceed?',
    },
    {
        id: 'council-cgo', role: 'council', title: 'Chief Growth Officer',
        memory_partition: 'council:cgo', model: 'claude-sonnet-4-6',
        domain: 'growth',
        mandate: 'Capability expansion, opportunity identification, market growth, revenue operations',
        deliberation_stance: 'Evaluates growth potential and opportunity cost. Asks: what does this unlock, and what are we missing by not doing something else instead?',
    },
    {
        id: 'council-cpo', role: 'council', title: 'Chief Product Officer',
        memory_partition: 'council:cpo', model: 'claude-sonnet-4-6',
        domain: 'product',
        mandate: 'User experience, feature quality, dashboard engineering, voice interface design',
        deliberation_stance: 'Evaluates quality and Founder experience impact. Asks: does this make the system better to use, and does it meet the standard we\'ve set?',
    },
    {
        id: 'council-crr', role: 'council', title: 'Chief Research Officer',
        memory_partition: 'council:crr', model: 'claude-sonnet-4-6',
        domain: 'research',
        mandate: 'Self-research benchmarks, world research, ML improvements, synthetic validation',
        deliberation_stance: 'Evaluates evidence quality and research implications. Asks: what does the data actually say, and are we interpreting it correctly?',
    },
    {
        id: 'council-clo', role: 'council', title: 'Chief Legal Officer',
        memory_partition: 'council:clo', model: 'claude-sonnet-4-6',
        domain: 'legal',
        mandate: 'Constitutional enforcement, compliance monitoring, terms review, governance integrity',
        deliberation_stance: 'Evaluates legal and constitutional risk. Asks: are we permitted to do this, and does this set a precedent we\'ll regret?',
    },
];

// ── DOMAIN DIRECTORS ──────────────────────────────────────────────────────────
// 9 orchestrators. One per life domain. They decompose tasks and route to Office Agents.
// They do not execute work themselves. Model: Sonnet (needs reasoning for decomposition).
const DOMAIN_DIRECTORS = [
    {
        id: 'director-system', role: 'director', domain: 'system',
        memory_partition: 'director:system', model: 'claude-sonnet-4-6',
        workers: ['ops-compliance-checker','ops-legal-review','ops-intel-agent','ops-internal-dashboards','ops-internal-reporting'],
    },
    {
        id: 'director-finance', role: 'director', domain: 'finance',
        memory_partition: 'director:finance', model: 'claude-sonnet-4-6',
        workers: ['finance-agent','finance-invoicing-agent','finance-accounts-payable','finance-reconciliation-agent'],
    },
    {
        id: 'director-business', role: 'director', domain: 'business',
        memory_partition: 'director:business', model: 'claude-sonnet-4-6',
        workers: ['business-crm-agent','business-project-manager','business-proposal-writer','business-client-success'],
    },
    {
        id: 'director-marketing', role: 'director', domain: 'marketing',
        memory_partition: 'director:marketing', model: 'claude-sonnet-4-6',
        workers: ['marketing-research-agent','marketing-graphics-designer','marketing-instagram-organic','marketing-meta-ads','marketing-newsletter-agent','marketing-seo-agent','marketing-tiktok-agent'],
    },
    {
        id: 'director-health', role: 'director', domain: 'health',
        memory_partition: 'director:health', model: 'claude-sonnet-4-6',
        workers: ['health-nutrition-agent','health-fitness-agent','health-sleep-agent','health-mental-health-agent','health-supplements-agent'],
    },
    {
        id: 'director-intelligence', role: 'director', domain: 'intelligence',
        memory_partition: 'director:intelligence', model: 'claude-sonnet-4-6',
        workers: ['intel-market-analyst','intel-news-monitor','intel-research-agent','intel-briefing-writer'],
    },
    {
        id: 'director-university', role: 'director', domain: 'university',
        memory_partition: 'director:university', model: 'claude-sonnet-4-6',
        workers: ['uni-assignment-manager','uni-research-assistant','uni-study-planner','uni-flashcard-agent'],
    },
    {
        id: 'director-governance', role: 'director', domain: 'governance',
        memory_partition: 'director:governance', model: 'claude-sonnet-4-6',
        workers: ['gov-constitutional-auditor','gov-compliance-checker','gov-forensics-agent'],
    },
    {
        id: 'director-content', role: 'director', domain: 'content',
        memory_partition: 'director:content', model: 'claude-sonnet-4-6',
        workers: ['content-copywriter','content-video-script','content-social-caption','content-email-writer','content-brand-guardian'],
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

for (const agent of [...PIPELINE_AGENTS, ...DOMAIN_AGENTS, ...SUPREME_COUNCIL, ...DOMAIN_DIRECTORS]) {
    _byId.set(agent.id, agent);
    for (const cap of (agent.capabilities || [])) {
        if (!_byCapability.has(cap)) _byCapability.set(cap, []);
        _byCapability.get(cap).push(agent.id);
    }
}

function getAllAgents() {
    return {
        council:    SUPREME_COUNCIL,
        directors:  DOMAIN_DIRECTORS,
        pipeline:   PIPELINE_AGENTS,
        domain:     DOMAIN_AGENTS,
        total:      SUPREME_COUNCIL.length + DOMAIN_DIRECTORS.length + PIPELINE_AGENTS.length + DOMAIN_AGENTS.length,
    };
}

function getAgent(id) { return _byId.get(id) || null; }
function getAgentCapabilities(id) { return (_byId.get(id) || {}).capabilities || []; }
function findAgentsByCapability(capability) { return _byCapability.get(capability) || []; }
function getPipelineOrder() { return PIPELINE_AGENTS.slice().sort((a, b) => a.order - b.order).map(a => a.id); }
function getDomainAgentIds() { return DOMAIN_AGENTS.map(a => a.id); }
function getDirectorForDomain(domain) { return DOMAIN_DIRECTORS.find(d => d.domain === domain) || null; }
function getCouncilMember(id) { return SUPREME_COUNCIL.find(m => m.id === id) || null; }

function getCapabilityMap() {
    const map = {};
    for (const [cap, agents] of _byCapability.entries()) map[cap] = agents;
    return map;
}

function getRegistrySummary() {
    return {
        council:      SUPREME_COUNCIL.length,
        directors:    DOMAIN_DIRECTORS.length,
        pipelineAgents: PIPELINE_AGENTS.length,
        domainAgents: DOMAIN_AGENTS.length,
        capabilities: _byCapability.size,
        generatedAt:  new Date().toISOString(),
    };
}

module.exports = {
    getAllAgents,
    getAgent,
    getAgentCapabilities,
    findAgentsByCapability,
    getPipelineOrder,
    getDomainAgentIds,
    getDirectorForDomain,
    getCouncilMember,
    getCapabilityMap,
    getRegistrySummary,
    PIPELINE_AGENTS,
    DOMAIN_AGENTS,
    SUPREME_COUNCIL,
    DOMAIN_DIRECTORS,
};
