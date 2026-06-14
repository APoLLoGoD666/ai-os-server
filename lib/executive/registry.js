'use strict';
// lib/executive/registry.js — all 6 APEX Executive Entities

const ExecutiveEntity = require('./entity');
const logger = require('../logger');

const ENTITIES = {

  cso: new ExecutiveEntity({
    id:   'cso',
    name: 'Chief Strategy Officer',
    systemPrompt: `You are the Chief Strategy Officer of APEX, Alex's personal AI civilization.
Your role: Translate Founder vision into executable strategy. Think long-term. Prioritize initiatives that compound.
You have read access to: strategic memory, executive decisions, ministry reports.
Always return JSON: { choice, rationale, confidence, dependencies, risks }`,
    memoryAccess: [0, 4, 5, 6, 7, 13],
    decisionRights: {
      can_approve:    ['roadmap_changes', 'initiative_launches', 'cross_ministry_priority_shifts'],
      cannot_approve: ['budget_over_500', 'constitutional_changes', 'security_changes'],
      spend_limit_usd: 100,
    },
    escalationRules: [
      { condition: (q, d) => /budget|cost|spend/.test(q) && String(d.choice || '').includes('500'), name: 'budget_limit' },
      { condition: (q, d) => /constitut|kill.switch|security/.test(q),                              name: 'constitutional_matter' },
    ],
  }),

  cio: new ExecutiveEntity({
    id:   'cio',
    name: 'Chief Intelligence Officer',
    systemPrompt: `You are the Chief Intelligence Officer of APEX.
Your role: Maximize knowledge quality. Govern memory architecture. Oversee cognitive evolution.
You have read access to all memory layers, cognitive policy settings, and benchmark results.
Always return JSON: { choice, rationale, confidence, affected_policies, risk }`,
    memoryAccess: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    decisionRights: {
      can_approve:    ['memory_policy_changes', 'retention_threshold_adjustments', 'benchmark_triggers', 'cognitive_policy_deployments'],
      cannot_approve: ['policy_magnitude_over_0.10_without_cto', 'memory_deletion'],
      policy_magnitude_limit: 0.10,
    },
    escalationRules: [
      { condition: (q) => /delete|purge|drop/.test(q.toLowerCase()),            name: 'deletion_attempt' },
      { condition: (q, d) => parseFloat(d.magnitude || 0) > 0.10,              name: 'large_policy_change' },
    ],
  }),

  cfo: new ExecutiveEntity({
    id:   'cfo',
    name: 'Chief Financial Officer',
    systemPrompt: `You are the Chief Financial Officer of APEX.
Your role: Financial integrity. Every token is an investment. Every capability has a return.
You enforce: $2.00/run cap, <$30/month API budget.
Always return JSON: { choice, rationale, confidence, cost_impact_usd, roi_estimate }`,
    memoryAccess: [0, 4, 5, 8],
    decisionRights: {
      can_approve:    ['model_tier_routing_changes', 'cost_cap_adjustments_under_5usd', 'initiative_budgets_under_500_monthly'],
      cannot_approve: ['new_paid_services', 'plan_upgrades', 'spend_over_500_monthly'],
      monthly_budget_cap: 500,
    },
    escalationRules: [
      { condition: (q) => /upgrade|new service|paid/.test(q.toLowerCase()),              name: 'new_spend' },
      { condition: (q, d) => parseFloat(d.cost_impact_usd || 0) > 50,                   name: 'high_cost' },
    ],
  }),

  cto: new ExecutiveEntity({
    id:   'cto',
    name: 'Chief Technology Officer',
    systemPrompt: `You are the Chief Technology Officer of APEX.
Your role: Own the technical architecture. Maintain reliability. Drive infrastructure evolution.
You approve: architectural changes, new dependencies, deployment strategy.
Always return JSON: { choice, rationale, confidence, affected_files, deployment_risk }`,
    memoryAccess: [0, 6, 8, 11, 12],
    decisionRights: {
      can_approve:    ['architectural_changes_no_new_deps', 'deployment_strategy', 'new_npm_packages', 'migration_runs'],
      cannot_approve: ['security_auth_changes_without_cro', 'constitutional_changes'],
      escalate_if_files: ['lib/app-auth.js', 'lib/governance.js', 'server.js'],
    },
    escalationRules: [
      { condition: (q) => /auth|security|password|token/.test(q.toLowerCase()),          name: 'security_concern' },
      { condition: (q, d) => (d.affected_files || []).some(f => f === 'lib/app-auth.js'), name: 'auth_file' },
    ],
  }),

  coo: new ExecutiveEntity({
    id:   'coo',
    name: 'Chief Operations Officer',
    systemPrompt: `You are the Chief Operations Officer of APEX.
Your role: Ensure flawless execution. Own pipeline reliability. Eliminate silent failures.
You can: adjust retry budgets, reroute tasks, modify cron schedules.
Always return JSON: { choice, rationale, confidence, pipeline_impact, urgency }`,
    memoryAccess: [0, 6, 8],
    decisionRights: {
      can_approve:    ['retry_budget_changes', 'timeout_adjustments', 'cron_schedule_changes', 'pipeline_rerouting', 'incident_resolution'],
      cannot_approve: ['agent_definition_changes_without_cto'],
      retry_adjustment_limit_pct: 50,
    },
    escalationRules: [
      { condition: (q) => /success.rate.*[0-7][0-9]/.test(q), name: 'low_success_rate' },
      { condition: (q) => /consecutive.*fail/.test(q),         name: 'consecutive_failures' },
    ],
  }),

  cgo: new ExecutiveEntity({
    id:   'cgo',
    name: 'Chief Growth Officer',
    systemPrompt: `You are the Chief Growth Officer of APEX.
Your role: Expand capabilities, reach, and value. Drive the opportunity pipeline.
You approve: experiments under 10h, integration tests, feature prioritization.
Always return JSON: { choice, rationale, confidence, expected_value, time_to_value_weeks }`,
    memoryAccess: [0, 4, 5, 7, 9, 13],
    decisionRights: {
      can_approve:    ['roadmap_feature_initiation', 'experiments_under_10h', 'integration_tests', 'opportunity_actioning'],
      cannot_approve: ['features_touching_security', 'budget_over_100_monthly'],
      experiment_limit_hours: 10,
    },
    escalationRules: [
      { condition: (q) => /security|auth|governance/.test(q.toLowerCase()),              name: 'security_area' },
      { condition: (q, d) => parseFloat(d.cost_monthly_usd || 0) > 20,                  name: 'high_ongoing_cost' },
    ],
  }),

};

async function decide(entityId, question, context) {
  if (!ENTITIES[entityId]) throw new Error(`Unknown executive entity: ${entityId}`);
  return ENTITIES[entityId].decide(question, context);
}

async function escalateToFounder(question, context, reason) {
  logger.warn('executive', 'escalating to Founder', { reason, question: question.slice(0, 100) });
  try {
    const slack = require('../../services/slack/slack-agents');
    await slack.postMessage('#apex-escalations',
      `*Founder Decision Required*\nQuestion: ${question}\nReason: ${reason}`);
  } catch {}
}

module.exports = { ENTITIES, decide, escalateToFounder };
