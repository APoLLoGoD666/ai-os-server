'use strict';
// lib/founder/context-provider.js
// THE most important module in Founder OS.
// Every subsystem (memory, decisions, planning, execution) calls getContext()
// to receive a FounderContextPackage — the root intelligence layer.
//
// This is what makes every APEX decision founder-grounded.

const cache       = require('../memory/cache');
const profile     = require('./profile');
const antiGoal    = require('./anti-goal-monitor');
const privacyGuard = require('./privacy-guard');
const logger      = require('../logger');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes per task description

// getContext — main entry point for all subsystems.
// taskDescription: what the calling subsystem is about to do
// options.entityId: who is requesting context (for access control)
// Returns FounderContextPackage
async function getContext(taskDescription = '', { entityId = 'system', skipAntiGoalCheck = false } = {}) {
  const cacheKey = `founder:ctx:${_hash(taskDescription)}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const p = await profile.load();

  // Derive relevant values based on task description keywords
  const relevantValues    = _matchValues(taskDescription, p.core_values, p.strategic_values);
  const applicablePrinciples = _matchPrinciples(taskDescription, p.principles);
  const relevantGoals     = _matchGoals(taskDescription, p);

  // Anti-goal check on the task description
  let antiGoalsToWatch = (p.anti_goals || []).map(ag => ag.text || '').filter(Boolean);
  if (!skipAntiGoalCheck && taskDescription) {
    const check = await antiGoal.check(taskDescription, { triggerSource: entityId });
    if (!check.clean) {
      antiGoalsToWatch = check.triggered.map(t => `${t.anti_goal} [TRIGGERED — ${t.severity}]`);
    }
  }

  // Failure pattern warning
  const failureWarnings = p.failure_pattern?.early_warning_keywords || [];
  const lower           = taskDescription.toLowerCase();
  const failureRisk     = failureWarnings.some(kw => lower.includes(kw.toLowerCase()));

  // Graph context — enriches pkg with relationship-aware founder intelligence
  let graphCtx = null;
  try {
    graphCtx = await require('./graph').getFounderGraphContext(taskDescription);
  } catch {}

  // Empire context — external world model
  let empireCtx = null;
  try {
    empireCtx = await require('../empire/graph').getEmpireContext();
  } catch {}

  const pkg = {
    assembled_at:     new Date().toISOString(),
    task_description: taskDescription.slice(0, 200),

    // Core guidance
    alignment_guidance:    _buildAlignmentGuidance(relevantValues, p),
    relevant_values:       relevantValues,
    relevant_goals:        relevantGoals,
    applicable_principles: applicablePrinciples,
    anti_goals_to_watch:   antiGoalsToWatch,

    // Decision framework
    decision_weights: p.identity?.decision_model?.weights || { logic: 5, intuition: 4, data: 3, advisors: 2, experience: 1 },
    risk_guidance: {
      tolerance:    p.identity?.risk_profile?.financial_tolerance || 0.40,
      approach:     p.identity?.risk_profile?.approach || 'Calculated risk with maximum aggression when conviction is high.',
      apply_when:   'High conviction situations only. Default to calculated, not reckless.',
    },

    // State prompts
    peak_state_prompt:       _buildPeakStatePrompt(p),
    failure_pattern_warning: failureRisk ? p.failure_pattern?.intervention || null : null,

    // Knowledge Graph context
    graph_context:  graphCtx,
    empire_context: empireCtx,

    // Privacy
    protected_context: { has_protected_people: true, redacted: true },

    // Meta
    primary_driver: p.identity?.primary_driver?.text || 'Potential',
    core_mission:   p.identity?.core_mission?.text   || '',
    ultimate_goal:  p.identity?.ultimate_goal?.text  || 'Reach true potential.',
  };

  const guarded = await privacyGuard.guardContextPackage(pkg);
  cache.set(cacheKey, guarded, CACHE_TTL);
  return guarded;
}

// getAlignmentGuidanceForPrompt — returns a concise string suitable for injection
// into any model system prompt
async function getAlignmentGuidanceForPrompt(taskDescription = '') {
  const ctx = await getContext(taskDescription);
  const lines = [
    `Mission: ${ctx.core_mission}`,
    `Primary Driver: ${ctx.primary_driver}`,
    ctx.relevant_values.length   ? `Relevant values: ${ctx.relevant_values.join(', ')}`   : null,
    ctx.applicable_principles.length ? `Active principles: ${ctx.applicable_principles.join(' | ')}` : null,
    ctx.failure_pattern_warning   ? `WARNING: ${ctx.failure_pattern_warning}`              : null,
    ctx.anti_goals_to_watch.some(a => a.includes('TRIGGERED'))
      ? `BLOCKED anti-goals: ${ctx.anti_goals_to_watch.filter(a => a.includes('TRIGGERED')).join(', ')}`
      : null,
  ].filter(Boolean);
  return lines.join('\n');
}

// getDecisionWeights — returns the logic>intuition>data>advisors>experience weights
async function getDecisionWeights() {
  const p = await profile.load();
  return p.identity?.decision_model?.weights || { logic: 5, intuition: 4, data: 3, advisors: 2, experience: 1 };
}

// getRiskProfile
async function getRiskProfile() {
  const p = await profile.load();
  return p.identity?.risk_profile || { financial_tolerance: 0.40, approach: 'calculated_aggressor' };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _matchValues(text, coreValues, strategicValues) {
  const lower = text.toLowerCase();
  const matched = [];

  for (const [, val] of Object.entries(coreValues || {})) {
    if ((val.keywords || []).some(kw => lower.includes(kw.toLowerCase()))) {
      matched.push(val.text || '');
    }
  }
  for (const [, val] of Object.entries(strategicValues || {})) {
    if ((val.keywords || []).some(kw => lower.includes(kw.toLowerCase()))) {
      matched.push(val.text || '');
    }
  }
  return [...new Set(matched)].filter(Boolean);
}

function _matchPrinciples(text, principles) {
  if (!Array.isArray(principles)) return [];
  const lower = text.toLowerCase();
  // Always include all principles as guidance
  return principles.map(p => p.text || '').filter(Boolean);
}

function _matchGoals(text, p) {
  const lower = text.toLowerCase();
  const goals = [];

  // Match health goals
  if (lower.includes('health') || lower.includes('body') || lower.includes('strength')) {
    if (p.health_goals?.body_composition) goals.push(`Body: ${p.health_goals.body_composition.description || '90-95kg @ ~10% body fat'}`);
  }
  if (lower.includes('wealth') || lower.includes('money') || lower.includes('financial') || lower.includes('revenue')) {
    const wgoal = p.wealth_philosophy?.freedom_model;
    if (wgoal) goals.push(`Wealth: ${wgoal}`);
  }
  if (lower.includes('legacy') || lower.includes('impact') || lower.includes('inspire')) {
    if (p.legacy?.goal) goals.push(`Legacy: ${p.legacy.goal}`);
  }
  return goals.slice(0, 3);
}

function _buildAlignmentGuidance(values, p) {
  if (!values.length) {
    return `Evaluate against core mission: ${p.identity?.core_mission?.text || 'reach true potential'}`;
  }
  return `This touches: ${values.join(', ')}. Ensure it builds toward ${p.identity?.ultimate_goal?.text || 'true potential'}.`;
}

function _buildPeakStatePrompt(p) {
  const states = p.peak_state?.states || ['Deep focus', 'Building', 'Executing', 'High momentum'];
  return `Target peak state: ${states.slice(0, 4).join(' → ')}. Avoid anything that breaks momentum.`;
}

function _hash(str) {
  let h = 0;
  for (let i = 0; i < Math.min(str.length, 100); i++) h = ((h << 5) - h) + str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

module.exports = { getContext, getAlignmentGuidanceForPrompt, getDecisionWeights, getRiskProfile };
