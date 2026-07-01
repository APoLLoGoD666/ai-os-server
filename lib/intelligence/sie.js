'use strict';
// lib/intelligence/sie.js — Strategic Intelligence Engine
// Central reasoning layer: converts Founder Graph, Memory, Opportunities, Threats,
// Projects, and World State into actionable strategic guidance.
// All scoring is deterministic. Model is called only for synthesis/narrative.

const { getSupabaseClient } = require('../clients');
const cache  = require('../memory/cache');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_WEIGHTS = { alignment: 0.25, roi: 0.22, risk_inv: 0.20, freedom: 0.13, empire: 0.12, urgency: 0.08 };

const URGENCY_SCORE  = { immediate: 100, this_week: 80, this_month: 55, this_quarter: 35 };
const SEVERITY_SCORE = { existential: 100, critical: 80, high: 60, medium: 40, low: 20 };
const HORIZON_MONTHS = { '2_years': 24, '3_years': 36, '5_years': 60, '10_years': 120, '20_years': 240, ongoing: null };

const EMPIRE_KEYWORDS    = ['technology', 'software', 'business', 'investment', 'revenue', 'scale', 'product', 'saas', 'ai', 'automation', 'platform', 'build'];
const FINANCIAL_KEYWORDS = ['revenue', 'income', 'profit', 'money', 'financial', 'roi', 'return', 'cost-saving', 'cash'];
const FREEDOM_KEYWORDS   = ['freedom', 'autonomous', 'passive', 'automated', 'delegate', 'schedule', 'location', 'flexible'];

const ANALYSIS_CACHE_TTL  = 30 * 60 * 1000;  // 30 min
const BRIEFING_CACHE_TTL  = 6  * 60 * 60 * 1000; // 6 hours

// ─── Data Gathering ────────────────────────────────────────────────────────────

async function _gatherIntelligence() {
  const [
    graphCtxRes,
    empireCtxRes,
    goalsRes,
    domainsRes,
    oppsRes,
    alertsRes,
    agentRunsRes,
    plansRes,
    eventsRes,
  ] = await Promise.allSettled([
    require('../founder/graph').getFounderGraphContext('strategic intelligence empire building freedom'),
    require('../empire/graph').getEmpireContext(),
    _sb().from('founder_goals').select('*').eq('status', 'active').order('priority', { ascending: false }),
    _sb().from('founder_domains').select('*').order('priority', { ascending: false }),
    _sb().from('opportunities').select('*').eq('status', 'detected').order('composite_score', { ascending: false }).limit(20),
    _sb().from('founder_anti_goal_alerts').select('*').eq('acknowledged', false).limit(20),
    _sb().from('apex_agent_runs').select('cost_usd, success, created_at, model').order('created_at', { ascending: false }).limit(100),
    _sb().from('strategy_plans').select('id, horizon, title, objectives, risks, generated_at').order('generated_at', { ascending: false }).limit(4),
    _sb().from('civilization_events').select('id, title, category, significance, summary').eq('is_synthetic', false).order('created_at', { ascending: false }).limit(10),
  ]);

  const safe = (r, fallback) => {
    if (r.status !== 'fulfilled') return fallback;
    const v = r.value;
    return v && typeof v === 'object' && 'data' in v ? (v.data || fallback) : (v || fallback);
  };

  return {
    graphCtx:   safe(graphCtxRes,  null),
    empireCtx:  empireCtxRes.status === 'fulfilled' ? empireCtxRes.value : null,
    goals:      safe(goalsRes,     []),
    domains:    safe(domainsRes,   []),
    opps:       safe(oppsRes,      []),
    alerts:     safe(alertsRes,    []),
    agentRuns:  safe(agentRunsRes, []),
    plans:      safe(plansRes,     []),
    events:     safe(eventsRes,    []),
  };
}

// ─── Scoring Primitives ────────────────────────────────────────────────────────

function _scorePriority({ alignment = 50, roi = 50, risk = 50, freedom = 50, empire = 50, urgency = 50 }) {
  return Math.round(
    alignment * PRIORITY_WEIGHTS.alignment +
    roi       * PRIORITY_WEIGHTS.roi +
    (100-risk)* PRIORITY_WEIGHTS.risk_inv +
    freedom   * PRIORITY_WEIGHTS.freedom +
    empire    * PRIORITY_WEIGHTS.empire +
    urgency   * PRIORITY_WEIGHTS.urgency
  );
}

function _scoreText(text, keywords) {
  const lower = text.toLowerCase();
  const hits  = keywords.filter(k => lower.includes(k));
  return Math.min(100, hits.length * 14);
}

function _estimateProbability(progress_pct, deps_unmet, horizon) {
  let p = (progress_pct || 0) / 100;
  p *= Math.max(0.3, 1 - (deps_unmet / Math.max(deps_unmet + 3, 4)) * 0.4);
  const hFactor = { '2_years': 0.85, '3_years': 0.80, '5_years': 0.75, '10_years': 0.65, '20_years': 0.55, ongoing: 0.70 };
  p *= (hFactor[horizon] || 0.70);
  return Math.round(Math.min(1.0, p) * 100) / 100;
}

function _estimateTime(progress_pct, horizon) {
  const months = HORIZON_MONTHS[horizon];
  if (!months) return 'Ongoing';
  const remaining = 100 - (progress_pct || 0);
  if (!progress_pct) return `~${months}mo`;
  return `~${Math.ceil(months * remaining / 100)}mo remaining`;
}

function _matchDbGoal(dbGoals, fkgGoal) {
  const labelLower = fkgGoal.label.toLowerCase();
  const kws = fkgGoal.properties?.keywords || [];
  for (const g of dbGoals) {
    const t = (g.title || '').toLowerCase();
    if (kws.some(k => t.includes(k.toLowerCase()))) return g;
    if (t.includes(labelLower) || labelLower.includes(t)) return g;
  }
  return null;
}

// ─── Goal Analysis ─────────────────────────────────────────────────────────────

async function analyzeGoals() {
  const cacheKey = 'sie:goals:v1';
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const [fkgRes, dbRes] = await Promise.allSettled([
    _sb().from('fkg_nodes').select('*').eq('type', 'goal').order('weight', { ascending: false }),
    _sb().from('founder_goals').select('*').order('priority', { ascending: false }),
  ]);

  const fkgGoals = (fkgRes.status === 'fulfilled' ? fkgRes.value.data : null) || [];
  const dbGoals  = (dbRes.status  === 'fulfilled' ? dbRes.value.data  : null) || [];
  const graph    = require('../founder/graph');

  const analyses = await Promise.all(fkgGoals.map(async fkgGoal => {
    const dbGoal = _matchDbGoal(dbGoals, fkgGoal);
    const progress_pct = dbGoal?.progress_pct || 0;

    let deps = { dependencies: [], path_to_completion: [] };
    try { deps = await graph.getGoalDependencies(fkgGoal.id); } catch {}

    const deps_unmet = deps.path_to_completion.filter(d =>
      ['empire_domain', 'project'].includes(d.type)
    ).length;

    return {
      id:                    fkgGoal.id,
      label:                 fkgGoal.label,
      weight:                fkgGoal.weight,
      horizon:               fkgGoal.properties?.horizon || 'ongoing',
      progress_pct,
      status:                dbGoal?.status || fkgGoal.properties?.status || 'not_started',
      dependencies_total:    deps.dependencies.length,
      dependencies_concrete: deps.path_to_completion.length,
      dependency_path:       deps.path_to_completion.slice(0, 5),
      missing_requirements:  deps.path_to_completion
        .filter(d => ['empire_domain', 'project'].includes(d.type))
        .slice(0, 4).map(d => d.label),
      probability_of_success: _estimateProbability(progress_pct, deps_unmet, fkgGoal.properties?.horizon),
      time_estimate:          _estimateTime(progress_pct, fkgGoal.properties?.horizon),
      current_value:          dbGoal?.current_value || null,
    };
  }));

  const result = analyses.sort((a, b) => b.weight - a.weight);
  cache.set(cacheKey, result, ANALYSIS_CACHE_TTL);
  return result;
}

// ─── Opportunity Analysis ─────────────────────────────────────────────────────

async function analyzeOpportunities() {
  const cacheKey = 'sie:opportunities:v1';
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const { data: opps = [] } = await _sb()
    .from('opportunities').select('*')
    .eq('status', 'detected')
    .order('composite_score', { ascending: false })
    .limit(15);

  const graph = require('../founder/graph');

  const scored = await Promise.all(opps.map(async opp => {
    const text = `${opp.title} ${opp.description || ''}`;
    const [alignRes, antiRes] = await Promise.allSettled([
      graph.calculateFounderAlignment(text),
      graph.detectAntiGoalConflicts(text),
    ]);

    const alignment = alignRes.status === 'fulfilled' ? alignRes.value.score : 50;
    const antiGoal  = antiRes.status  === 'fulfilled' ? antiRes.value        : { clean: true, block_execution: false };

    const textLower    = text.toLowerCase();
    const empire_score = _scoreText(textLower, EMPIRE_KEYWORDS);
    const financial_score = _scoreText(textLower, FINANCIAL_KEYWORDS);
    const freedom_score   = _scoreText(textLower, FREEDOM_KEYWORDS);
    const ev_score        = Math.round((opp.composite_score || 0.5) * 100);
    const urgency_score   = URGENCY_SCORE[opp.roi_forecast?.urgency] || 50;
    const risk_score      = antiGoal.block_execution ? 90 : antiGoal.clean ? 20 : 55;

    const opportunity_score = _scorePriority({
      alignment, roi: ev_score, risk: risk_score,
      freedom: freedom_score, empire: empire_score, urgency: urgency_score,
    });

    return {
      id:                   opp.id,
      title:                opp.title,
      category:             opp.category,
      description:          (opp.description || '').slice(0, 200),
      assigned_ministry:    opp.assigned_ministry,
      scores: {
        expected_value:       ev_score,
        founder_alignment:    alignment,
        empire_impact:        empire_score,
        financial_impact:     financial_score,
        freedom_impact:       freedom_score,
        strategic_impact:     Math.round((empire_score + alignment) / 2),
        time_cost:            100 - urgency_score,
        risk_score:           risk_score,
        opportunity_score,
      },
      anti_goal_clean:      antiGoal.clean,
      anti_goal_blocks:     antiGoal.block_execution,
      urgency:              opp.roi_forecast?.urgency || 'this_month',
    };
  }));

  const result = scored.sort((a, b) => b.scores.opportunity_score - a.scores.opportunity_score);
  cache.set(cacheKey, result, ANALYSIS_CACHE_TTL);
  return result;
}

// ─── Threat Analysis ──────────────────────────────────────────────────────────

async function analyzeThreats() {
  const cacheKey = 'sie:threats:v1';
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const intel = await _gatherIntelligence();
  const threats = [];

  // Financial threats: monthly API cost
  if (intel.agentRuns.length) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthRuns = intel.agentRuns.filter(r => (r.created_at || '').startsWith(currentMonth));
    const monthlyCost = monthRuns.reduce((s, r) => s + (parseFloat(r.cost_usd) || 0), 0);
    const monthlyLimit = 30.00;
    const pct = (monthlyCost / monthlyLimit) * 100;
    if (pct >= 60) {
      threats.push({
        id: 'financial_api_cost', type: 'financial',
        severity: pct >= 85 ? 'critical' : pct >= 70 ? 'high' : 'medium',
        description: `API cost $${monthlyCost.toFixed(2)} is ${Math.round(pct)}% of $${monthlyLimit}/mo limit`,
        score: Math.round(pct), source: 'resource_monitor',
      });
    }

    const failRate = intel.agentRuns.length
      ? intel.agentRuns.filter(r => !r.success).length / intel.agentRuns.length
      : 0;
    if (failRate > 0.3) {
      threats.push({
        id: 'operational_fail_rate', type: 'operational',
        severity: failRate > 0.5 ? 'critical' : 'high',
        description: `Agent failure rate ${Math.round(failRate * 100)}% in last ${intel.agentRuns.length} runs`,
        score: Math.round(failRate * 100), source: 'agent_monitor',
      });
    }
  }

  // Health & domain threats: low health scores
  for (const domain of intel.domains) {
    if (domain.health_score !== null && domain.health_score < 50) {
      const domainTypeMap = { health: 'health', relationships: 'relationship', business: 'operational', security: 'security', finance: 'financial' };
      const domainType = domainTypeMap[(domain.name || '').toLowerCase()] || 'operational';
      threats.push({
        id:          `domain_${domain.id}`,
        type:        domainType,
        severity:    domain.health_score < 25 ? 'critical' : 'high',
        description: `${domain.name} domain health at ${domain.health_score}% — below 50% threshold`,
        score:       100 - domain.health_score,
        source:      'domain_monitor',
      });
    }
  }

  // Security/privacy threats: unacknowledged anti-goal alerts
  for (const alert of intel.alerts.slice(0, 10)) {
    const isCritical = /data.?leak|privacy|security|breach/i.test(alert.trigger_text || alert.anti_goal || '');
    threats.push({
      id:          `alert_${alert.id}`,
      type:        isCritical ? 'security' : 'operational',
      severity:    alert.severity || 'high',
      description: `Anti-goal alert: ${alert.anti_goal || alert.trigger_text || 'unknown'}`,
      score:       SEVERITY_SCORE[alert.severity] || 60,
      source:      'anti_goal_monitor',
    });
  }

  // Strategic threats: no high-score opportunities being actioned
  const highValueOpps = intel.opps.filter(o => (o.composite_score || 0) > 0.75);
  if (highValueOpps.length > 5) {
    threats.push({
      id: 'strategic_opportunity_backlog', type: 'operational',
      severity: 'medium',
      description: `${highValueOpps.length} high-value opportunities detected but unactioned`,
      score: Math.min(80, highValueOpps.length * 10), source: 'opportunity_engine',
    });
  }

  // Graph-based threats: FKG anti-goal nodes with high weight
  try {
    const { data: antiNodes = [] } = await _sb()
      .from('fkg_nodes').select('id, label, properties').eq('type', 'anti_goal')
      .order('weight', { ascending: false }).limit(5);
    for (const node of antiNodes) {
      const exists = threats.find(t => t.id === node.id);
      if (!exists) {
        threats.push({
          id:          `fkg_${node.id}`,
          type:        _classifyAntiGoalType(node.id),
          severity:    node.properties?.severity || 'high',
          description: `Persistent threat: ${node.label} — ${node.properties?.keywords?.slice(0, 3).join(', ')}`,
          score:       SEVERITY_SCORE[node.properties?.severity] || 60,
          source:      'founder_graph',
        });
      }
    }
  } catch {}

  const result = threats.sort((a, b) => b.score - a.score);
  cache.set(cacheKey, result, ANALYSIS_CACHE_TTL);
  return result;
}

function _classifyAntiGoalType(id) {
  if (/data|privacy|security/.test(id)) return 'security';
  if (/money|financial/.test(id))       return 'financial';
  if (/health|mental/.test(id))         return 'health';
  if (/family/.test(id))                return 'relationship';
  if (/reputation|embarrassment/.test(id)) return 'reputation';
  return 'operational';
}

// ─── Bottleneck Detection ─────────────────────────────────────────────────────

async function detectBottlenecks() {
  const cacheKey = 'sie:bottlenecks:v1';
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const intel = await _gatherIntelligence();
  const bottlenecks = [];

  // Capital: API cost ratio
  const currentMonth  = new Date().toISOString().slice(0, 7);
  const monthRuns     = intel.agentRuns.filter(r => (r.created_at || '').startsWith(currentMonth));
  const monthlyCost   = monthRuns.reduce((s, r) => s + (parseFloat(r.cost_usd) || 0), 0);
  const costPct       = Math.round((monthlyCost / 30) * 100);
  if (costPct >= 40) {
    bottlenecks.push({
      type: 'capital', label: 'API Budget Constraint',
      description: `$${monthlyCost.toFixed(2)} of $30/mo used (${costPct}%). Limits agent execution frequency.`,
      impact_score: costPct,
      blocked_goals: ['goal_organisation_freedom', 'goal_empire'],
      action: 'Optimise model selection — use haiku for high-frequency tasks.',
    });
  }

  // Execution: stalled goals
  const stalledGoals = intel.goals.filter(g => (g.progress_pct || 0) < 20 && g.status === 'active');
  if (stalledGoals.length) {
    bottlenecks.push({
      type: 'execution', label: 'Stalled Goals',
      description: `${stalledGoals.length} active goals below 20% progress: ${stalledGoals.slice(0, 3).map(g => g.title).join(', ')}`,
      impact_score: Math.min(100, stalledGoals.length * 20),
      blocked_goals: stalledGoals.map(g => g.id).slice(0, 4),
      action: 'Assign explicit agent task to each stalled goal. Break into 30-day milestones.',
    });
  }

  // Time: scheduling freedom not achieved
  const schedGoal = intel.goals.find(g => /scheduling|time freedom/i.test(g.title || ''));
  if (schedGoal && (schedGoal.progress_pct || 0) < 80) {
    bottlenecks.push({
      type: 'time', label: 'Time Freedom Not Achieved',
      description: `Scheduling freedom goal at ${schedGoal.progress_pct || 0}% — founder still constrained by manual operations.`,
      impact_score: 100 - (schedGoal.progress_pct || 0),
      blocked_goals: ['goal_scheduling_freedom', 'goal_empire'],
      action: 'Identify top 3 recurring manual tasks and automate or delegate this week.',
    });
  }

  // Knowledge: goals requiring capabilities not yet built
  const { data: empireNodes = [] } = await _sb().from('fkg_nodes').select('id, label').eq('type', 'empire_domain');
  const { data: projectNodes = [] } = await _sb().from('fkg_nodes').select('id, label').eq('type', 'project');
  const builtCapabilities = new Set([...projectNodes.map(n => n.id)]);
  const missingCapabilities = empireNodes
    .filter(n => !['empire_technology'].includes(n.id) && !builtCapabilities.has(n.id));
  if (missingCapabilities.length > 4) {
    bottlenecks.push({
      type: 'knowledge', label: 'Empire Capability Gaps',
      description: `${missingCapabilities.length} empire domains not yet built: ${missingCapabilities.slice(0, 3).map(n => n.label).join(', ')}`,
      impact_score: Math.min(100, missingCapabilities.length * 10),
      blocked_goals: ['goal_empire', 'goal_financial_freedom'],
      action: 'Prioritise one empire domain per quarter. Start with highest ROI domain.',
    });
  }

  // Founder: cognitive bottlenecks from FKG weakness nodes
  bottlenecks.push({
    type: 'founder', label: 'Cognitive Bottleneck Risk',
    description: 'Perfectionism and overthinking patterns documented in Founder Graph can delay execution.',
    impact_score: 45,
    blocked_goals: ['goal_empire', 'goal_organisation_freedom'],
    action: 'Apply Execute Principle: ship at 80%, iterate. Use anti-overthinking timebox (max 2h per decision).',
  });

  // No active project for empire goal
  const empireProjects = intel.opps.filter(o => /empire|business|technology|product/i.test(o.category || ''));
  if (!empireProjects.length) {
    bottlenecks.push({
      type: 'resource', label: 'No Active Revenue Project',
      description: 'No opportunities in revenue-generating categories currently being actioned.',
      impact_score: 70,
      blocked_goals: ['goal_financial_freedom', 'goal_empire'],
      action: 'Run opportunity detection cycle. Identify and action one revenue project this week.',
    });
  }

  const result = bottlenecks.sort((a, b) => b.impact_score - a.impact_score);
  cache.set(cacheKey, result, ANALYSIS_CACHE_TTL);
  return result;
}

// ─── Strategic Pathfinding ────────────────────────────────────────────────────

async function findStrategicPath(goalId) {
  const graph = require('../founder/graph');
  const deps  = await graph.getGoalDependencies(goalId);

  // Pull current domain/project states to assess what's satisfied
  const [domainsRes, projectsRes] = await Promise.allSettled([
    _sb().from('fkg_nodes').select('id, label, type').eq('type', 'empire_domain'),
    _sb().from('fkg_nodes').select('id, label, type, properties').eq('type', 'project'),
  ]);

  const empireBuilt = new Set(['empire_technology']); // apex is active
  const projectsActive = new Set((projectsRes.status === 'fulfilled' ? projectsRes.value.data : []).map(n => n.id));

  const allDeps = deps.path_to_completion;
  const satisfied   = allDeps.filter(d => empireBuilt.has(d.id) || projectsActive.has(d.id));
  const unsatisfied = allDeps.filter(d => !empireBuilt.has(d.id) && !projectsActive.has(d.id));

  // Fastest path: minimum required actions (shortest unsatisfied chain)
  const fastestPath = unsatisfied.slice(0, 3).map(d => ({
    action: `Build/activate ${d.label}`, type: d.type, relationship: d.relationship, effort: 'medium',
  }));

  // Safest path: avoid high-risk/early empire, favour technology → businesses → investments
  const SAFE_ORDER = ['empire_technology', 'empire_businesses', 'empire_investments', 'empire_real_estate'];
  const safestPath = unsatisfied
    .sort((a, b) => (SAFE_ORDER.indexOf(a.id) + 1 || 99) - (SAFE_ORDER.indexOf(b.id) + 1 || 99))
    .slice(0, 3).map(d => ({
      action: `Build ${d.label}`, type: d.type, relationship: d.relationship, effort: 'low_risk',
    }));

  // Highest EV path: empire domains with highest revenue potential
  const HIGH_EV = ['empire_businesses', 'empire_technology', 'empire_investments'];
  const highEVPath = unsatisfied
    .filter(d => HIGH_EV.includes(d.id) || d.type === 'project')
    .slice(0, 3).map(d => ({
      action: `Build ${d.label}`, type: d.type, relationship: d.relationship, effort: 'high_ev',
    }));

  return {
    goal_id:        goalId,
    goal_label:     deps.root?.label || goalId,
    current_state:  { satisfied: satisfied.map(d => d.label), count: satisfied.length },
    target_state:   { remaining: unsatisfied.map(d => d.label), count: unsatisfied.length },
    missing_states: unsatisfied.map(d => ({ id: d.id, label: d.label, type: d.type })),
    fastest_path:   fastestPath,
    safest_path:    safestPath,
    highest_ev_path: highEVPath,
    critical_dependencies: deps.dependencies
      .filter(d => d.relationship === 'REQUIRES')
      .slice(0, 5)
      .map(d => ({ id: d.node.id, label: d.node.label, relationship: d.relationship })),
  };
}

// ─── Recommendations ──────────────────────────────────────────────────────────

async function generateRecommendations(horizon = 'daily') {
  const cacheKey = `sie:rec:${horizon}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const [opps, bottlenecks, threats, goals] = await Promise.allSettled([
    analyzeOpportunities(),
    detectBottlenecks(),
    analyzeThreats(),
    analyzeGoals(),
  ]);

  const scored_opps = opps.status === 'fulfilled' ? opps.value : [];
  const bns         = bottlenecks.status === 'fulfilled' ? bottlenecks.value : [];
  const thrs        = threats.status === 'fulfilled' ? threats.value : [];
  const gs          = goals.status === 'fulfilled' ? goals.value : [];

  // Filter opportunities by horizon urgency
  const horizonUrgency = { daily: ['immediate'], weekly: ['immediate', 'this_week'], monthly: ['immediate', 'this_week', 'this_month'], long_term: ['this_quarter'] };
  const urgencyFilter  = horizonUrgency[horizon] || ['immediate'];

  const topOpps = scored_opps
    .filter(o => !horizon || urgencyFilter.includes(o.urgency))
    .slice(0, 5);

  // Build action candidates
  const candidates = [
    ...topOpps.map(o => ({
      action: `Pursue: ${o.title}`,
      type:   'opportunity',
      score:  o.scores.opportunity_score,
      rationale: `Alignment ${o.scores.founder_alignment}, Empire ${o.scores.empire_impact}, Urgency ${o.urgency}`,
    })),
    ...bns.slice(0, 3).map(b => ({
      action: b.action,
      type:   'bottleneck_fix',
      score:  b.impact_score,
      rationale: b.description,
    })),
    ...thrs.filter(t => t.severity === 'critical').slice(0, 2).map(t => ({
      action: `Address threat: ${t.description.slice(0, 80)}`,
      type:   'threat_mitigation',
      score:  t.score,
      rationale: `${t.type} threat — severity: ${t.severity}`,
    })),
    ...gs.filter(g => (g.progress_pct || 0) < 30 && g.weight > 8).slice(0, 2).map(g => ({
      action: `Accelerate goal: ${g.label}`,
      type:   'goal_acceleration',
      score:  Math.round(g.weight * 10),
      rationale: `${g.progress_pct || 0}% complete, ${g.time_estimate}`,
    })),
  ];

  candidates.sort((a, b) => b.score - a.score);
  const top5 = candidates.slice(0, 5);

  // Model synthesis for narrative
  const runtime = require('../models/runtime');

  const oppContext  = topOpps.slice(0, 3).map(o => `- ${o.title} (score: ${o.scores.opportunity_score})`).join('\n');
  const bnContext   = bns.slice(0, 2).map(b => `- ${b.label}: ${b.action}`).join('\n');
  const goalContext = gs.slice(0, 3).map(g => `- ${g.label}: ${g.progress_pct || 0}%`).join('\n');

  const prompt = `You are the Strategic Intelligence Engine for APEX AI OS.

Horizon: ${horizon.toUpperCase()} recommendations
Top opportunities:\n${oppContext || '(none)'}\nBottlenecks:\n${bnContext || '(none)'}\nGoal progress:\n${goalContext || '(none)'}

Generate exactly 5 ${horizon} recommendations for maximum founder alignment and empire building.
Each must be specific, actionable, and include why.

Return JSON array:
[{ "rank": number, "action": string (specific, ≤120 chars), "why": string (1 sentence, why this > alternatives), "impact": "high"|"medium"|"low", "type": "opportunity"|"bottleneck"|"threat"|"goal" }]`;

  let recs = top5.map((c, i) => ({ rank: i + 1, action: c.action, why: c.rationale, impact: c.score > 70 ? 'high' : c.score > 45 ? 'medium' : 'low', type: c.type }));
  try {
    const { result } = await runtime.execute({ tier: 'balanced', caller: 'sie.recommendations', messages: [{ role: 'user', content: prompt }], maxTokens: 800 });
    const match  = (result.content[0]?.text || '').match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length) recs = parsed.slice(0, 5);
    }
  } catch {}

  const row = {
    id:              `rec_${horizon}_${Date.now()}`,
    horizon,
    recommendations: recs,
    context_summary: `${scored_opps.length} opps, ${bns.length} bottlenecks, ${thrs.length} threats analyzed`,
    generated_at:    new Date().toISOString(),
  };

  try { await _sb().from('sie_recommendations').insert(row); } catch {}

  cache.set(cacheKey, row, ANALYSIS_CACHE_TTL);
  return row;
}

// ─── Executive Briefing ────────────────────────────────────────────────────────

async function generateExecutiveBriefing() {
  const cacheKey = 'sie:briefing:v1';
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const [opps, threats, bottlenecks, goals, graphCtx, empireCtxRes, perfStatsRes] = await Promise.allSettled([
    analyzeOpportunities(),
    analyzeThreats(),
    detectBottlenecks(),
    analyzeGoals(),
    require('../founder/graph').getFounderGraphContext('executive briefing strategic'),
    require('../empire/graph').getEmpireContext(),
    require('./executive-performance-engine').computeAllStats(),
  ]);

  const scored_opps = opps.status      === 'fulfilled' ? opps.value      : [];
  const thrs        = threats.status   === 'fulfilled' ? threats.value   : [];
  const bns         = bottlenecks.status === 'fulfilled' ? bottlenecks.value : [];
  const gs          = goals.status     === 'fulfilled' ? goals.value     : [];
  const gCtx        = graphCtx.status  === 'fulfilled' ? graphCtx.value  : null;
  const empireCtx   = empireCtxRes.status === 'fulfilled' ? empireCtxRes.value : null;
  const perfStats   = perfStatsRes.status === 'fulfilled' ? perfStatsRes.value : null;

  const biggestOpp  = scored_opps[0] || null;
  const biggestThreat = thrs[0] || null;
  const biggestBn   = bns[0] || null;
  const highestLeverageGoal = gs.find(g => g.probability_of_success < 0.3 && g.weight > 8) || gs[0];

  const runtime = require('../models/runtime');

  // Build exec performance summary line for prompt injection
  const perfSummary = (() => {
    if (!perfStats) return '';
    const withData = Object.values(perfStats).filter(s => s.withOutcome > 0);
    if (!withData.length) return '';
    const overconf = withData.filter(s => s.calibrationLabel === 'overconfident').map(s => s.entityId.toUpperCase());
    const topExec  = [...withData].sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0))[0];
    const parts = [];
    if (topExec?.accuracy) parts.push(`Top executive: ${topExec.entityId.toUpperCase()} at ${topExec.accuracy}% accuracy`);
    if (overconf.length)   parts.push(`Overconfident: ${overconf.join(', ')}`);
    return parts.length ? `Executive performance: ${parts.join('; ')}.` : '';
  })();

  const prompt = `You are generating the executive strategic briefing for the founder of APEX AI OS.

Founder context: ${gCtx?.graph_summary || 'Architect-Builder focused on empire, freedom, family protection.'}
Empire context: ${empireCtx?.empire_summary || 'Pre-revenue, building Apex AI OS.'}
${perfSummary ? perfSummary + '\n' : ''}
CURRENT DATA:
Biggest opportunity: ${biggestOpp ? `${biggestOpp.title} (score: ${biggestOpp.scores.opportunity_score})` : 'None detected'}
Biggest threat: ${biggestThreat ? `${biggestThreat.description} (severity: ${biggestThreat.severity})` : 'None critical'}
Biggest bottleneck: ${biggestBn ? `${biggestBn.label}: ${biggestBn.description.slice(0, 100)}` : 'None critical'}
Top goals: ${gs.slice(0, 3).map(g => `${g.label} ${g.progress_pct || 0}%`).join(', ')}

Generate a tight executive briefing with EXACTLY these 6 fields. Be direct. No filler.

Return JSON:
{
  "biggest_opportunity": string (1 sentence — what + why it matters now),
  "biggest_threat": string (1 sentence — what + consequence if ignored),
  "biggest_bottleneck": string (1 sentence — what + impact on empire),
  "highest_leverage_action": string (1 sentence — single most important action this week),
  "strategic_focus_this_week": string (2-3 sentences — this week's strategic priority),
  "strategic_focus_this_month": string (2-3 sentences — this month's directional focus)
}`;

  let briefing = {
    biggest_opportunity:      biggestOpp ? `${biggestOpp.title} — score ${biggestOpp.scores.opportunity_score}/100` : 'No high-score opportunities detected. Run opportunity detection cycle.',
    biggest_threat:           biggestThreat ? biggestThreat.description : 'No critical threats detected.',
    biggest_bottleneck:       biggestBn ? biggestBn.description : 'No critical bottlenecks identified.',
    highest_leverage_action:  highestLeverageGoal ? `Accelerate ${highestLeverageGoal.label} — currently at ${highestLeverageGoal.progress_pct || 0}%` : 'Build first revenue-generating project.',
    strategic_focus_this_week: 'Focus on empire foundation: ship one concrete deliverable, address top bottleneck, action highest-score opportunity.',
    strategic_focus_this_month: 'Progress toward financial and scheduling freedom through systematic empire building. One domain per month.',
  };

  try {
    const { result } = await runtime.execute({ tier: 'balanced', caller: 'sie.briefing', messages: [{ role: 'user', content: prompt }], maxTokens: 700 });
    const match  = (result.content[0]?.text || '').match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.biggest_opportunity) briefing = { ...briefing, ...parsed };
    }
  } catch {}

  briefing.generated_at = new Date().toISOString();
  briefing.data_inputs  = { opportunities: scored_opps.length, threats: thrs.length, bottlenecks: bns.length, goals: gs.length };
  if (perfStats) {
    const withData = Object.values(perfStats).filter(s => s.withOutcome > 0);
    briefing.executive_performance = withData.length
      ? { tracked: withData.length, top: withData.sort((a,b) => (b.accuracy||0)-(a.accuracy||0))[0] || null }
      : { tracked: 0, top: null };
  }

  try {
    await _sb().from('sie_analyses').insert({
      id:            `brief_${Date.now()}`,
      analysis_type: 'executive_briefing',
      data:          briefing,
    });
  } catch {}

  cache.set(cacheKey, briefing, BRIEFING_CACHE_TTL);
  return briefing;
}

// ─── Decision Analysis ────────────────────────────────────────────────────────

async function analyzeDecision(decision, options = [], constraints = {}) {
  if (!decision) throw new Error('decision is required');
  if (!options.length) throw new Error('at least one option is required');

  const graph = require('../founder/graph');

  // Score each option deterministically
  const scoredOptions = await Promise.all(options.map(async opt => {
    const text = `${opt.name || opt} ${opt.description || ''}`;
    const [alignRes, antiRes] = await Promise.allSettled([
      graph.calculateFounderAlignment(text),
      graph.detectAntiGoalConflicts(text),
    ]);

    const alignment  = alignRes.status === 'fulfilled' ? alignRes.value.score : 50;
    const antiGoal   = antiRes.status  === 'fulfilled' ? antiRes.value        : { clean: true, block_execution: false };
    const roi        = typeof opt.roi_estimate === 'number' ? opt.roi_estimate : 50;
    const risk       = antiGoal.block_execution ? 90 : antiGoal.clean ? 20 : 55;
    const empire_txt = typeof opt.description === 'string' ? opt.description : '';
    const empire     = _scoreText(empire_txt.toLowerCase(), EMPIRE_KEYWORDS);
    const urgency    = URGENCY_SCORE[opt.urgency] || 50;

    const priority_score = _scorePriority({ alignment, roi, risk, freedom: alignment > 60 ? 65 : 40, empire, urgency });

    return {
      name:          opt.name || String(opt),
      description:   opt.description || '',
      alignment,
      risk,
      empire_impact: empire,
      priority_score,
      anti_goal_blocks: antiGoal.block_execution,
      anti_goal_triggers: (antiGoal.triggered || []).map(t => t.label),
      graph_paths:   alignRes.status === 'fulfilled' ? (alignRes.value.graph_paths || []) : [],
    };
  }));

  scoredOptions.sort((a, b) => b.priority_score - a.priority_score);

  // Filter blocked options
  const viable     = scoredOptions.filter(o => !o.anti_goal_blocks);
  const blocked    = scoredOptions.filter(o => o.anti_goal_blocks);
  const recommended = viable[0] || scoredOptions[0];

  // Model synthesis
  const runtime = require('../models/runtime');
  const graphCtx = await require('../founder/graph').getFounderGraphContext(decision).catch(() => null);

  const prompt = `You are the Strategic Intelligence Engine for APEX.

Founder alignment: ${graphCtx?.graph_summary || 'Empire builder valuing freedom, family, security.'}

Decision: ${decision}
Constraints: ${JSON.stringify(constraints).slice(0, 200)}

Scored options:
${scoredOptions.map(o => `- ${o.name}: score=${o.priority_score}, alignment=${o.alignment}, risk=${o.risk}${o.anti_goal_blocks ? ' [BLOCKED by anti-goal]' : ''}`).join('\n')}

Recommended: ${recommended.name}

Provide concise analysis (JSON):
{
  "recommendation": "${recommended.name}",
  "rationale": string (2 sentences — why this option, what it enables),
  "key_risks": string[] (top 2 risks of recommended option),
  "expected_outcomes": string[] (top 2-3 expected results),
  "confidence": number 0-1,
  "conditions": string (1 sentence — what must be true for this to succeed)
}`;

  let synthesis = {
    recommendation:    recommended.name,
    rationale:         `${recommended.name} scores highest on founder alignment (${recommended.alignment}) and strategic priority (${recommended.priority_score}).`,
    key_risks:         recommended.anti_goal_triggers.length ? recommended.anti_goal_triggers : ['execution risk', 'time constraint'],
    expected_outcomes: ['Progresses toward empire goals', 'Increases founder alignment score'],
    confidence:        Math.round((recommended.priority_score / 100) * 10) / 10,
    conditions:        'Requires founder commitment and clear 30-day execution plan.',
  };

  try {
    const { result } = await runtime.execute({ tier: 'balanced', caller: 'sie.decision', messages: [{ role: 'user', content: prompt }], maxTokens: 600 });
    const match  = (result.content[0]?.text || '').match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.rationale) synthesis = { ...synthesis, ...parsed };
    }
  } catch {}

  const decisionResult = {
    decision,
    ...synthesis,
    options: scoredOptions,
    viable_options: viable.map(o => o.name),
    blocked_options: blocked.map(o => o.name),
    constraints,
    analyzed_at: new Date().toISOString(),
  };

  try {
    await _sb().from('sie_decisions').insert({
      id:       `dec_${Date.now()}`,
      decision: decision.slice(0, 500),
      options:  options,
      result:   decisionResult,
    });
  } catch {}

  return decisionResult;
}

// ─── Future Simulation ────────────────────────────────────────────────────────

async function simulateOutcome(scenario = {}, horizons = ['30d', '90d', '1y', '5y', '10y']) {
  const intel = await _gatherIntelligence();

  // Current state metrics
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthRuns    = intel.agentRuns.filter(r => (r.created_at || '').startsWith(currentMonth));
  const monthlyCost  = monthRuns.reduce((s, r) => s + (parseFloat(r.cost_usd) || 0), 0);
  const avgProgress  = intel.goals.length
    ? intel.goals.reduce((s, g) => s + (g.progress_pct || 0), 0) / intel.goals.length
    : 0;

  const currentState = {
    monthly_api_cost: monthlyCost.toFixed(2),
    avg_goal_progress: Math.round(avgProgress),
    active_opportunities: intel.opps.length,
    domain_health_avg: intel.domains.length
      ? Math.round(intel.domains.filter(d => d.health_score !== null).reduce((s, d) => s + d.health_score, 0) / Math.max(intel.domains.filter(d => d.health_score !== null).length, 1))
      : null,
    empire_projects: 1,
    revenue_monthly: 0,
  };

  const runtime = require('../models/runtime');

  const prompt = `You are simulating outcomes for APEX AI OS — a personal AI civilization project.

Current state:
- API cost: $${currentState.monthly_api_cost}/month
- Average goal progress: ${currentState.avg_goal_progress}%
- Active opportunities: ${currentState.active_opportunities}
- Domain health average: ${currentState.domain_health_avg ?? 'unknown'}%
- Revenue: $${currentState.revenue_monthly}/month
- Active empire projects: ${currentState.empire_projects}

Context: ${scenario.context || 'Founder building AI OS as foundation of personal empire. Focus on freedom, financial independence, empire building.'}
Focus area: ${scenario.focus_area || 'empire growth and financial freedom'}

Simulate across horizons: ${horizons.join(', ')}

For each horizon provide best/expected/worst cases.

Return JSON:
{
  "simulations": {
    "<horizon>": {
      "best_case": { "description": string, "revenue": string, "goal_progress": string, "empire_state": string, "probability": number },
      "expected_case": { "description": string, "revenue": string, "goal_progress": string, "empire_state": string, "probability": number },
      "worst_case": { "description": string, "revenue": string, "goal_progress": string, "empire_state": string, "probability": number },
      "critical_actions": string[]
    }
  },
  "highest_leverage_insight": string
}`;

  let simResult = { simulations: {}, highest_leverage_insight: 'Execute consistently on highest-score opportunities each week.', current_state: currentState };

  for (const h of horizons) {
    simResult.simulations[h] = {
      best_case:      { description: `Strong execution on empire goals`, revenue: 'Growing', goal_progress: 'Above average', empire_state: 'Expanding', probability: 0.25 },
      expected_case:  { description: `Steady progress on current trajectory`, revenue: '$0-100/mo', goal_progress: `${Math.min(100, Math.round(avgProgress + 10))}%`, empire_state: 'Building', probability: 0.55 },
      worst_case:     { description: `Execution slows, bottlenecks persist`, revenue: '$0', goal_progress: `${Math.round(avgProgress)}%`, empire_state: 'Stalled', probability: 0.20 },
      critical_actions: ['Ship one revenue-generating product', 'Automate top manual operation'],
    };
  }

  try {
    const { result } = await runtime.execute({ tier: 'balanced', caller: 'sie.simulation', messages: [{ role: 'user', content: prompt }], maxTokens: 1500 });
    const match  = (result.content[0]?.text || '').match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.simulations) simResult = { ...simResult, ...parsed, current_state: currentState };
    }
  } catch {}

  simResult.simulated_at  = new Date().toISOString();
  simResult.horizons       = horizons;
  simResult.current_state  = currentState;

  try {
    await _sb().from('sie_analyses').insert({
      id:            `sim_${Date.now()}`,
      analysis_type: 'simulation',
      data:          simResult,
    });
  } catch {}

  return simResult;
}

// ─── Strategic Priority Ranking ────────────────────────────────────────────────

async function getStrategicPriority() {
  const [opps, bottlenecks, threats] = await Promise.allSettled([
    analyzeOpportunities(),
    detectBottlenecks(),
    analyzeThreats(),
  ]);

  const items = [];

  for (const o of (opps.status === 'fulfilled' ? opps.value : []).slice(0, 10)) {
    items.push({
      id: o.id, label: o.title, category: 'opportunity',
      alignment_score: o.scores.founder_alignment,
      roi_score:       o.scores.expected_value,
      risk_score:      o.scores.risk_score,
      freedom_score:   o.scores.freedom_impact,
      empire_score:    o.scores.empire_impact,
      urgency_score:   URGENCY_SCORE[o.urgency] || 50,
      strategic_priority_score: o.scores.opportunity_score,
    });
  }

  for (const b of (bottlenecks.status === 'fulfilled' ? bottlenecks.value : []).slice(0, 5)) {
    items.push({
      id: `bn_${b.type}`, label: b.label, category: 'bottleneck_fix',
      alignment_score: 60, roi_score: b.impact_score, risk_score: 20,
      freedom_score: b.type === 'time' ? 80 : 40,
      empire_score: b.type === 'capital' || b.type === 'execution' ? 70 : 45,
      urgency_score: b.impact_score,
      strategic_priority_score: _scorePriority({ alignment: 60, roi: b.impact_score, risk: 20, freedom: 50, empire: 55, urgency: b.impact_score }),
    });
  }

  return items.sort((a, b) => b.strategic_priority_score - a.strategic_priority_score);
}

// ─── Full Analysis ────────────────────────────────────────────────────────────

async function runFullAnalysis() {
  const cacheKey = 'sie:full:v1';
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  logger.debug('sie', 'running full strategic analysis');

  const [goals, opps, threats, bottlenecks, dailyRecs, briefing] = await Promise.allSettled([
    analyzeGoals(),
    analyzeOpportunities(),
    analyzeThreats(),
    detectBottlenecks(),
    generateRecommendations('daily'),
    generateExecutiveBriefing(),
  ]);

  const safe = (r, fb) => r.status === 'fulfilled' ? r.value : fb;

  const result = {
    analyzed_at:     new Date().toISOString(),
    goals:           safe(goals,         []),
    opportunities:   safe(opps,          []),
    threats:         safe(threats,       []),
    bottlenecks:     safe(bottlenecks,   []),
    recommendations: safe(dailyRecs,     null),
    briefing:        safe(briefing,      null),
    summary: {
      total_goals:          safe(goals, []).length,
      total_opportunities:  safe(opps,  []).length,
      critical_threats:     safe(threats, []).filter(t => t.severity === 'critical' || t.severity === 'existential').length,
      critical_bottlenecks: safe(bottlenecks, []).filter(b => b.impact_score > 70).length,
    },
  };

  try {
    await _sb().from('sie_analyses').insert({
      id:            `full_${Date.now()}`,
      analysis_type: 'full_analysis',
      data:          { summary: result.summary, analyzed_at: result.analyzed_at },
    });
  } catch {}

  cache.set(cacheKey, result, ANALYSIS_CACHE_TTL);
  return result;
}

module.exports = {
  analyzeGoals,
  analyzeOpportunities,
  analyzeThreats,
  detectBottlenecks,
  findStrategicPath,
  generateRecommendations,
  generateExecutiveBriefing,
  analyzeDecision,
  simulateOutcome,
  getStrategicPriority,
  runFullAnalysis,
};
