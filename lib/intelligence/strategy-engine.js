'use strict';
// lib/intelligence/strategy-engine.js
// Generates 90-day, 1-year, 3-year, 10-year plans.
// Each plan linked to: opportunities, resources, executive input, civilization health.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

const HORIZONS = {
  '90_day':  { label: '90-Day Sprint Plan', months: 3,   depth: 'tactical' },
  '1_year':  { label: '1-Year Roadmap',     months: 12,  depth: 'strategic' },
  '3_year':  { label: '3-Year Vision',      months: 36,  depth: 'visionary' },
  '10_year': { label: '10-Year Civilization', months: 120, depth: 'civilizational' },
};

async function _generatePlan(horizon) {
  const cfg = HORIZONS[horizon];
  if (!cfg) throw new Error(`Unknown horizon: ${horizon}`);

  const modelSelector = require('../models/selector');
  const gateway       = require('../memory/gateway');
  const model         = modelSelector.select('balanced');

  // Gather inputs in parallel
  const [ctxResult, opportunitiesResult, healthResult, goalDepsResult] = await Promise.allSettled([
    gateway.getContext({
      taskId:          `strategy-${horizon}-${Date.now()}`,
      description:     `${cfg.depth} planning for APEX`,
      category:        'strategy',
      complexity:      'complex',
      modelFormat:     'claude',
      tokenBudget:     6000,
      requestingEntity: 'strategy_engine',
    }),
    _getOpportunities(horizon),
    _getHealth(),
    require('../founder/graph').getGoalDependencies('goal_empire'),
  ]);

  const ctx          = ctxResult.status === 'fulfilled'         ? ctxResult.value           : {};
  const opportunities = opportunitiesResult.status === 'fulfilled' ? opportunitiesResult.value : [];
  const health       = healthResult.status === 'fulfilled'       ? healthResult.value        : null;
  const goalDeps     = goalDepsResult.status === 'fulfilled'     ? goalDepsResult.value      : null;

  // Get executive input
  const executiveInput = await _getExecutiveInput(horizon, opportunities, health);

  const founderCtx  = ctx.founder_context   || {};
  // WS6/Phase 23: abstract before sending to external API — no raw PII leaves system
  const { abstractForExternalPrompt: _absForExt } = require('../founder/privacy-guard');
  const _absFounderCtx = _absForExt(founderCtx) || {};
  const projectCtx  = ctx.project_context   || {};
  const lessons     = (ctx.lessons || []).slice(0, 5).map(l => `- ${typeof l.content === 'string' ? l.content.slice(0, 200) : ''}`).join('\n');
  const oppsText    = opportunities.slice(0, 5).map(o => `- ${o.title}: ${(o.description || '').slice(0, 150)}`).join('\n');

  const horizonInstructions = {
    '90_day':  'Focus on: specific features to ship, integrations to complete, pipeline improvements, measurable outcomes in 90 days.',
    '1_year':  'Focus on: capability milestones, revenue/sustainability targets, architectural decisions, key integrations, team/agent expansion.',
    '3_year':  'Focus on: market position, product evolution, capability moats, organizational structure, financial sustainability.',
    '10_year': 'Focus on: civilization-scale vision, AI autonomy progression, legacy and impact, systemic capabilities, founder freedom.',
  };

  const graphCtx = founderCtx.graph_context || {};
  const founderGuidance = [
    founderCtx.core_mission      ? `Mission: ${founderCtx.core_mission}`       : null,
    founderCtx.primary_driver    ? `Driver: ${founderCtx.primary_driver}`      : null,
    founderCtx.ultimate_goal     ? `Ultimate goal: ${founderCtx.ultimate_goal}` : null,
    founderCtx.alignment_guidance ? founderCtx.alignment_guidance               : null,
    graphCtx.top_values?.length  ? `Values: ${graphCtx.top_values.join(', ')}` : founderCtx.relevant_values?.length ? `Values: ${founderCtx.relevant_values.join(', ')}` : null,
    graphCtx.principles?.slice(0, 3).join(' | ') || (founderCtx.applicable_principles || []).slice(0, 3).join(' | ') || null,
    founderCtx.failure_pattern_warning ? `WATCH: ${founderCtx.failure_pattern_warning}` : null,
    founderCtx.anti_goals_to_watch?.some(a => a.includes('TRIGGERED'))
      ? `BLOCKED: ${founderCtx.anti_goals_to_watch.filter(a => a.includes('TRIGGERED')).join(', ')}` : null,
  ].filter(Boolean).join('\n');

  const goalDepsText = goalDeps
    ? goalDeps.path_to_completion.slice(0, 8).map(d => `  ${d.depth}. [${d.type}] ${d.label} (via ${d.relationship})`).join('\n')
    : '';

  const prompt = `You are generating the ${cfg.label} for APEX AI OS — Alex's personal AI civilization.

Founder alignment:
${founderGuidance || _absFounderCtx.alignment_guidance || '(no founder alignment available)'}
${graphCtx.graph_summary ? `\nGraph context: ${graphCtx.graph_summary}` : ''}
${goalDepsText ? `\nEmpire goal dependency path:\n${goalDepsText}` : ''}

Current project state: ${JSON.stringify(projectCtx).slice(0, 300)}
${lessons ? `Key lessons:\n${lessons}\n` : ''}
Current health score: ${health?.score ?? 'unknown'} (${health?.classification ?? 'unknown'})

Top opportunities:
${oppsText || '(none detected yet)'}

Executive input summary:
${JSON.stringify(executiveInput).slice(0, 500)}

Generate the ${cfg.label} (${cfg.depth} level, ${cfg.months} month horizon).
${horizonInstructions[horizon]}

Return JSON:
{
  "title": string,
  "objectives": [{ "id": string, "description": string, "priority": "critical"|"high"|"medium", "success_metric": string }],
  "milestones": [{ "month": number, "title": string, "deliverables": string[] }],
  "resources": { "estimated_cost_monthly_usd": number, "api_budget_usd": number, "time_hours_per_week": number, "key_dependencies": string[] },
  "linked_opportunities": string[],
  "risks": [{ "risk": string, "mitigation": string }],
  "executive_priorities": { "cso": string, "cto": string, "cfo": string }
}`;

  let planData = null;
  try {
    const maxTokens = { '90_day': 2500, '1_year': 3500, '3_year': 4000, '10_year': 5500 }[horizon] || 3000;
    const result = await model.complete(prompt, { task: { description: prompt } }, { maxTokens });
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) planData = JSON.parse(match[0]);
  } catch (e) {
    logger.warn('strategy-engine', 'model parse failed', { horizon, error: e.message });
  }

  if (!planData) {
    planData = {
      title: cfg.label,
      objectives: [{ id: 'obj-1', description: 'Plan generation requires more system data', priority: 'medium', success_metric: 'retry after more data' }],
      milestones: [],
      resources: { estimated_cost_monthly_usd: 30, api_budget_usd: 30, time_hours_per_week: 10, key_dependencies: [] },
      linked_opportunities: [],
      risks: [],
      executive_priorities: {},
    };
  }

  const row = {
    horizon,
    title:            String(planData.title || cfg.label).slice(0, 200),
    objectives:       planData.objectives       || [],
    milestones:       planData.milestones       || [],
    resources:        planData.resources        || {},
    linked_opportunities: (planData.linked_opportunities || opportunities.slice(0, 5).map(o => o.id)).filter(Boolean),
    executive_input:  executiveInput,
    health_score_at_creation: health?.score || null,
  };

  const { data, error } = await _sb().from('strategy_plans').insert(row).select().single();
  if (error) logger.warn('strategy-engine', 'persist failed', { horizon, error: error.message });
  logger.debug('strategy-engine', 'plan generated', { horizon });
  return data || row;
}

async function _getOpportunities(horizon) {
  const oppEngine = require('./opportunity-engine');
  return oppEngine.getTopOpportunities(10).catch(() => []);
}

async function _getHealth() {
  const healthEngine = require('./civilization-health-engine');
  return healthEngine.getLatest().catch(() => null);
}

async function _getExecutiveInput(horizon, opportunities, health) {
  const { consultExecutive } = require('../cognitive/runtime');
  const question = `What should APEX prioritize in the ${HORIZONS[horizon].label}? Health score: ${health?.score ?? 'unknown'}. Top opportunity: ${opportunities[0]?.title || 'none detected'}.`;

  const [csoResult, ctoResult, cfoResult] = await Promise.allSettled([
    consultExecutive('cso', question, { horizon, health }),
    consultExecutive('cto', question, { horizon, health }),
    consultExecutive('cfo', question, { horizon, health }),
  ]);

  return {
    cso: csoResult.status === 'fulfilled' ? (csoResult.value.choice || csoResult.value.decision || '') : '',
    cto: ctoResult.status === 'fulfilled' ? (ctoResult.value.choice || ctoResult.value.decision || '') : '',
    cfo: cfoResult.status === 'fulfilled' ? (cfoResult.value.choice || cfoResult.value.decision || '') : '',
  };
}

async function generate90Day()  { return _generatePlan('90_day'); }
async function generate1Year()  { return _generatePlan('1_year'); }
async function generate3Year()  { return _generatePlan('3_year'); }
async function generate10Year() { return _generatePlan('10_year'); }

async function generateAll() {
  const results = await Promise.allSettled([
    generate90Day(),
    generate1Year(),
    generate3Year(),
    generate10Year(),
  ]);
  return results.map((r, i) => r.status === 'fulfilled' ? r.value : { horizon: Object.keys(HORIZONS)[i], error: r.reason?.message });
}

async function getLatestPlans() {
  const horizons = Object.keys(HORIZONS);
  const results = await Promise.allSettled(
    horizons.map(h =>
      _sb().from('strategy_plans').select('*').eq('horizon', h).order('created_at', { ascending: false }).limit(1).single()
    )
  );
  return results
    .map((r, i) => r.status === 'fulfilled' && !r.value.error ? r.value.data : null)
    .filter(Boolean);
}

module.exports = { generate90Day, generate1Year, generate3Year, generate10Year, generateAll, getLatestPlans };
