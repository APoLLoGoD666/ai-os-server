'use strict';
// lib/empire/graph-data.js — Static seed data for Empire Graph v1
// Models everything outside the founder: projects, people, assets, capital, markets.

const NODES = [
  // ── Core Empire Node ───────────────────────────────────────────────────────
  { id: 'empire', type: 'empire', label: 'Apex Empire', category: 'core', weight: 10,
    properties: { keywords: ['apex', 'empire', 'business', 'portfolio'], description: 'The full external domain the founder builds and controls' } },

  // ── Projects ───────────────────────────────────────────────────────────────
  { id: 'proj_apex_ai_os', type: 'project', label: 'Apex AI OS', category: 'project', weight: 9.5,
    properties: { keywords: ['apex', 'ai os', 'operating system', 'backend', 'render'], status: 'active', stage: 'build', revenue: 0, description: 'Personal AI operating system — core infrastructure' } },
  { id: 'proj_apex_dashboard', type: 'project', label: 'Apex Dashboard', category: 'project', weight: 7,
    properties: { keywords: ['dashboard', 'ui', 'frontend', 'control panel'], status: 'active', stage: 'build', revenue: 0 } },
  { id: 'proj_knowledge_base', type: 'project', label: 'Apex Knowledge Base', category: 'project', weight: 6,
    properties: { keywords: ['knowledge', 'obsidian', 'vault', 'memory', 'notes'], status: 'active', stage: 'build', revenue: 0 } },

  // ── Businesses / Ventures ──────────────────────────────────────────────────
  { id: 'biz_future_saas', type: 'business', label: 'Future SaaS Product', category: 'business', weight: 8,
    properties: { keywords: ['saas', 'product', 'subscription', 'revenue'], status: 'planned', stage: 'concept', revenue: 0, description: 'AI-powered SaaS derived from Apex OS learnings' } },
  { id: 'biz_consulting', type: 'business', label: 'AI Consulting', category: 'business', weight: 6,
    properties: { keywords: ['consulting', 'freelance', 'services', 'ai consulting'], status: 'potential', stage: 'concept', revenue: 0 } },

  // ── People — Allies ────────────────────────────────────────────────────────
  { id: 'person_future_cofounder', type: 'person', label: 'Future Co-founder', category: 'people', weight: 7,
    properties: { keywords: ['cofounder', 'partner', 'co-founder'], relationship_type: 'ally', trust: 'unknown', description: 'Technical or business co-founder for scale phase' } },
  { id: 'person_future_investor', type: 'person', label: 'Future Investor', category: 'people', weight: 7,
    properties: { keywords: ['investor', 'vc', 'angel', 'funding', 'raise'], relationship_type: 'capital_source', trust: 'unknown' } },
  { id: 'person_mentor', type: 'person', label: 'Mentor Network', category: 'people', weight: 6,
    properties: { keywords: ['mentor', 'advisor', 'guidance'], relationship_type: 'ally', trust: 'high' } },
  { id: 'person_early_users', type: 'person', label: 'Early Users / Beta Testers', category: 'people', weight: 7,
    properties: { keywords: ['users', 'customers', 'beta', 'feedback', 'early adopters'], relationship_type: 'customer', trust: 'medium' } },

  // ── Capital ────────────────────────────────────────────────────────────────
  { id: 'capital_runway', type: 'capital', label: 'Operating Runway', category: 'capital', weight: 9,
    properties: { keywords: ['runway', 'cash', 'savings', 'burn rate', 'operating capital'], capital_type: 'cash', status: 'constrained', description: 'Available cash to operate before revenue required' } },
  { id: 'capital_api_budget', type: 'capital', label: 'API Cost Budget', category: 'capital', weight: 7,
    properties: { keywords: ['api', 'claude', 'anthropic', 'cost', 'tokens', 'budget'], capital_type: 'operating', status: 'monitored' } },
  { id: 'capital_time', type: 'capital', label: 'Founder Time Capital', category: 'capital', weight: 9.5,
    properties: { keywords: ['time', 'hours', 'capacity', 'bandwidth', 'focus'], capital_type: 'time', status: 'constrained', description: 'Scarcest resource — must be protected' } },

  // ── Markets ────────────────────────────────────────────────────────────────
  { id: 'market_ai_infra', type: 'market', label: 'AI Infrastructure Market', category: 'market', weight: 8,
    properties: { keywords: ['ai infrastructure', 'mlops', 'ai platform', 'developer tools'], size: 'large', growth: 'explosive', competitive: 'high' } },
  { id: 'market_personal_ai', type: 'market', label: 'Personal AI / Second Brain Market', category: 'market', weight: 8,
    properties: { keywords: ['personal ai', 'second brain', 'pkm', 'knowledge management', 'personal os'], size: 'emerging', growth: 'high', competitive: 'medium' } },
  { id: 'market_ai_saas', type: 'market', label: 'AI SaaS Market', category: 'market', weight: 7,
    properties: { keywords: ['ai saas', 'automation', 'ai tools', 'productivity'], size: 'large', growth: 'high', competitive: 'very_high' } },

  // ── Assets ─────────────────────────────────────────────────────────────────
  { id: 'asset_codebase', type: 'asset', label: 'APEX Codebase', category: 'asset', weight: 9,
    properties: { keywords: ['code', 'codebase', 'software', 'repository', 'github'], asset_type: 'intellectual_property', value_stage: 'building', description: '~12k+ LOC Node.js/Express AI OS' } },
  { id: 'asset_knowledge', type: 'asset', label: 'Founder Knowledge Capital', category: 'asset', weight: 8.5,
    properties: { keywords: ['knowledge', 'skills', 'expertise', 'ai', 'engineering'], asset_type: 'human_capital', value_stage: 'compounding' } },
  { id: 'asset_systems', type: 'asset', label: 'Built Systems & Automations', category: 'asset', weight: 7.5,
    properties: { keywords: ['systems', 'automations', 'agents', 'pipelines'], asset_type: 'operational', value_stage: 'building' } },
  { id: 'asset_brand', type: 'asset', label: 'Apex Brand Identity', category: 'asset', weight: 6,
    properties: { keywords: ['brand', 'reputation', 'apex', 'identity'], asset_type: 'brand', value_stage: 'early' } },

  // ── Resources ──────────────────────────────────────────────────────────────
  { id: 'resource_anthropic', type: 'resource', label: 'Anthropic / Claude API', category: 'resource', weight: 9,
    properties: { keywords: ['anthropic', 'claude', 'llm', 'api', 'ai model'], resource_type: 'external_api', dependency: 'critical', cost_per_month: 'variable' } },
  { id: 'resource_supabase', type: 'resource', label: 'Supabase', category: 'resource', weight: 8,
    properties: { keywords: ['supabase', 'postgres', 'database', 'storage'], resource_type: 'infrastructure', dependency: 'critical' } },
  { id: 'resource_render', type: 'resource', label: 'Render (Hosting)', category: 'resource', weight: 7.5,
    properties: { keywords: ['render', 'hosting', 'deployment', 'server'], resource_type: 'infrastructure', dependency: 'high' } },

  // ── Opportunities ──────────────────────────────────────────────────────────
  { id: 'opp_first_revenue', type: 'opportunity', label: 'First Revenue Stream', category: 'opportunity', weight: 9,
    properties: { keywords: ['revenue', 'monetize', 'pay', 'income', 'first customer'], status: 'open', horizon: '90d', description: 'First paying customer or revenue stream from Apex OS capabilities' } },
  { id: 'opp_open_source', type: 'opportunity', label: 'Open Source Distribution', category: 'opportunity', weight: 7,
    properties: { keywords: ['open source', 'github', 'community', 'distribution'], status: 'open', horizon: '180d' } },
  { id: 'opp_api_productization', type: 'opportunity', label: 'API Productization', category: 'opportunity', weight: 8,
    properties: { keywords: ['api product', 'api access', 'saas api', 'b2b api'], status: 'open', horizon: '180d' } },

  // ── Threats ────────────────────────────────────────────────────────────────
  { id: 'threat_capital_depletion', type: 'threat', label: 'Capital Depletion', category: 'threat', weight: 9,
    properties: { keywords: ['run out', 'capital', 'money', 'broke', 'depletion'], severity: 'critical', probability: 'medium', description: 'Running out of operating runway before revenue' } },
  { id: 'threat_api_cost_spiral', type: 'threat', label: 'API Cost Spiral', category: 'threat', weight: 7.5,
    properties: { keywords: ['api cost', 'cost spiral', 'overspend', 'token cost'], severity: 'high', probability: 'low' } },
  { id: 'threat_competitor_release', type: 'threat', label: 'Big Player Competitor Release', category: 'threat', weight: 8,
    properties: { keywords: ['competitor', 'google', 'openai', 'microsoft', 'big tech'], severity: 'high', probability: 'medium' } },
  { id: 'threat_founder_burnout', type: 'threat', label: 'Founder Burnout / Isolation', category: 'threat', weight: 8.5,
    properties: { keywords: ['burnout', 'isolation', 'overwhelm', 'exhaustion', 'solo founder'], severity: 'high', probability: 'medium' } },
  { id: 'threat_scope_creep', type: 'threat', label: 'Scope Creep / Feature Bloat', category: 'threat', weight: 7,
    properties: { keywords: ['scope creep', 'feature bloat', 'distraction', 'over-engineering'], severity: 'medium', probability: 'high' } },

  // ── Goals (External/Empire Goals) ─────────────────────────────────────────
  { id: 'goal_revenue_positive', type: 'goal', label: 'Reach Revenue Positive', category: 'goal', weight: 9.5,
    properties: { keywords: ['revenue positive', 'profitable', 'cash flow', 'self sustaining'], horizon: '1y', status: 'active' } },
  { id: 'goal_first_product', type: 'goal', label: 'Ship First Product', category: 'goal', weight: 9,
    properties: { keywords: ['ship', 'launch', 'product', 'first product', 'mvp'], horizon: '6mo', status: 'active' } },
  { id: 'goal_100k_arr', type: 'goal', label: '$100K ARR', category: 'goal', weight: 8.5,
    properties: { keywords: ['100k', 'arr', 'annual recurring', 'revenue goal'], horizon: '2y', status: 'active' } },
  { id: 'goal_hire_first', type: 'goal', label: 'Hire First Team Member', category: 'goal', weight: 7,
    properties: { keywords: ['hire', 'team', 'employee', 'first hire', 'grow team'], horizon: '18mo', status: 'future' } },
];

const EDGES = [
  // Empire → Projects
  { from: 'empire', to: 'proj_apex_ai_os',     rel: 'CONTAINS',     w: 9.5 },
  { from: 'empire', to: 'proj_apex_dashboard',  rel: 'CONTAINS',     w: 7 },
  { from: 'empire', to: 'proj_knowledge_base',  rel: 'CONTAINS',     w: 6 },
  { from: 'empire', to: 'biz_future_saas',      rel: 'PLANS',        w: 8 },
  { from: 'empire', to: 'biz_consulting',       rel: 'PLANS',        w: 5 },

  // Projects → Assets
  { from: 'proj_apex_ai_os',    to: 'asset_codebase', rel: 'PRODUCES',  w: 9 },
  { from: 'proj_apex_ai_os',    to: 'asset_systems',  rel: 'PRODUCES',  w: 7.5 },
  { from: 'proj_apex_dashboard', to: 'asset_codebase', rel: 'PRODUCES', w: 6 },

  // Projects → Resources (dependencies)
  { from: 'proj_apex_ai_os', to: 'resource_anthropic', rel: 'DEPENDS_ON', w: 9 },
  { from: 'proj_apex_ai_os', to: 'resource_supabase',  rel: 'DEPENDS_ON', w: 8 },
  { from: 'proj_apex_ai_os', to: 'resource_render',    rel: 'DEPENDS_ON', w: 7.5 },

  // Projects → Capital (consumes)
  { from: 'proj_apex_ai_os', to: 'capital_api_budget', rel: 'CONSUMES', w: 7 },
  { from: 'proj_apex_ai_os', to: 'capital_time',       rel: 'CONSUMES', w: 9 },
  { from: 'proj_apex_ai_os', to: 'capital_runway',     rel: 'CONSUMES', w: 6 },

  // Projects → Opportunities
  { from: 'proj_apex_ai_os', to: 'opp_first_revenue',       rel: 'ENABLES', w: 8 },
  { from: 'proj_apex_ai_os', to: 'opp_open_source',         rel: 'ENABLES', w: 6 },
  { from: 'proj_apex_ai_os', to: 'opp_api_productization',  rel: 'ENABLES', w: 8 },

  // Projects → Goals
  { from: 'proj_apex_ai_os',   to: 'goal_first_product',     rel: 'PATHWAY_TO', w: 9 },
  { from: 'opp_first_revenue', to: 'goal_revenue_positive',  rel: 'PATHWAY_TO', w: 9 },
  { from: 'goal_revenue_positive', to: 'goal_100k_arr',      rel: 'PATHWAY_TO', w: 8 },
  { from: 'goal_100k_arr',     to: 'goal_hire_first',        rel: 'ENABLES',    w: 7 },

  // Business → Projects
  { from: 'biz_future_saas',  to: 'proj_apex_ai_os', rel: 'DERIVED_FROM', w: 8 },
  { from: 'biz_consulting',   to: 'asset_knowledge', rel: 'LEVERAGES',    w: 7 },

  // People → Empire
  { from: 'person_future_cofounder', to: 'empire',            rel: 'ACCELERATES', w: 7 },
  { from: 'person_future_investor',  to: 'capital_runway',    rel: 'PROVIDES',    w: 8 },
  { from: 'person_mentor',           to: 'asset_knowledge',   rel: 'STRENGTHENS', w: 5 },
  { from: 'person_early_users',      to: 'opp_first_revenue', rel: 'CONVERTS_TO', w: 8 },
  { from: 'person_early_users',      to: 'goal_first_product', rel: 'VALIDATES',  w: 7 },

  // Markets → Opportunities
  { from: 'market_personal_ai', to: 'opp_first_revenue',      rel: 'CONTAINS', w: 8 },
  { from: 'market_ai_infra',    to: 'opp_api_productization', rel: 'CONTAINS', w: 7 },
  { from: 'market_ai_saas',     to: 'biz_future_saas',        rel: 'CONTAINS', w: 7 },

  // Markets → Threats
  { from: 'market_ai_infra', to: 'threat_competitor_release', rel: 'GENERATES', w: 7 },
  { from: 'market_ai_saas',  to: 'threat_competitor_release', rel: 'GENERATES', w: 6 },

  // Threats → Capital / Assets
  { from: 'threat_capital_depletion', to: 'capital_runway',     rel: 'DEPLETES', w: 9 },
  { from: 'threat_api_cost_spiral',   to: 'capital_api_budget', rel: 'DEPLETES', w: 7 },
  { from: 'threat_scope_creep',       to: 'capital_time',       rel: 'DEPLETES', w: 7 },
  { from: 'threat_founder_burnout',   to: 'capital_time',       rel: 'DEPLETES', w: 8 },

  // Goals → Capital (require)
  { from: 'goal_revenue_positive', to: 'capital_runway', rel: 'REQUIRES', w: 9 },
  { from: 'goal_first_product',    to: 'capital_time',   rel: 'REQUIRES', w: 9 },

  // Asset propagation
  { from: 'asset_codebase',  to: 'opp_api_productization', rel: 'ENABLES',   w: 7 },
  { from: 'asset_knowledge', to: 'asset_codebase',         rel: 'BUILDS',    w: 7 },
  { from: 'asset_systems',   to: 'capital_time',           rel: 'MULTIPLIES', w: 8 },
];

module.exports = { NODES, EDGES };
