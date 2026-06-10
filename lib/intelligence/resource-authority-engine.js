'use strict';
// lib/intelligence/resource-authority-engine.js
// Tracks real resource consumption. Validates resource availability before execution.
// All numbers come from apex_agent_runs (real API costs) and Supabase queries.
// No estimated or synthetic budget figures.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

// Budget limits derived from CFO entity decisionRights
const LIMITS = {
  api_cost_per_run_usd:    2.00,   // from CFO entity: $2.00/run cap
  api_cost_monthly_usd:   30.00,   // from CFO entity: <$30/month API budget
  tokens_per_run:       100_000,   // conservative per-run token guard
};

function _sb() { return getSupabaseClient(); }

// getActualCosts — read real cost data from apex_agent_runs
async function getActualCosts({ since, until } = {}) {
  let q = _sb()
    .from('apex_agent_runs')
    .select('task_id, cost_usd, token_usage, model, success, created_at');

  if (since) q = q.gte('created_at', since);
  if (until) q = q.lte('created_at', until);

  const { data, error } = await q;
  if (error) {
    logger.warn('resource-authority', 'getActualCosts error', { error: error.message });
    return { rows: [], totalCostUsd: 0, totalTokens: 0, runCount: 0 };
  }

  const rows = data || [];
  const totalCostUsd = rows.reduce((s, r) => s + (parseFloat(r.cost_usd) || 0), 0);
  const totalTokens  = rows.reduce((s, r) => {
    const t = r.token_usage || {};
    return s + (parseInt(t.input_tokens) || 0) + (parseInt(t.output_tokens) || 0);
  }, 0);

  return { rows, totalCostUsd, totalTokens, runCount: rows.length };
}

// getMonthlyCosts — current calendar month spending from real data
async function getMonthlyCosts() {
  const now    = new Date();
  const since  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const costs  = await getActualCosts({ since });
  const budget = LIMITS.api_cost_monthly_usd;
  return {
    ...costs,
    budget_usd:     budget,
    remaining_usd:  Math.max(0, budget - costs.totalCostUsd),
    utilization_pct: budget > 0 ? (costs.totalCostUsd / budget) * 100 : null,
  };
}

// validate — check whether a planned action can proceed within resource constraints.
// Blocks execution if constraints would be violated.
// Returns { allowed: bool, reason: string, available: object }
async function validate({ estimatedCostUsd = 0, estimatedTokens = 0, taskId = null } = {}) {
  const monthly = await getMonthlyCosts();

  const reasons = [];

  if (estimatedCostUsd > LIMITS.api_cost_per_run_usd) {
    reasons.push(`estimated run cost $${estimatedCostUsd.toFixed(4)} exceeds per-run cap $${LIMITS.api_cost_per_run_usd}`);
  }

  if (monthly.totalCostUsd + estimatedCostUsd > LIMITS.api_cost_monthly_usd) {
    reasons.push(`monthly budget $${LIMITS.api_cost_monthly_usd} would be exceeded (current: $${monthly.totalCostUsd.toFixed(4)})`);
  }

  if (estimatedTokens > LIMITS.tokens_per_run) {
    reasons.push(`estimated tokens ${estimatedTokens} exceeds per-run limit ${LIMITS.tokens_per_run}`);
  }

  const allowed = reasons.length === 0;
  if (!allowed) logger.warn('resource-authority', 'blocked', { taskId, reasons });

  return {
    allowed,
    reason:    reasons.join('; ') || null,
    available: {
      monthly_remaining_usd: monthly.remaining_usd,
      monthly_utilization:   monthly.utilization_pct,
      per_run_cap_usd:       LIMITS.api_cost_per_run_usd,
    },
  };
}

// recordConsumption — persist a resource consumption event
async function recordConsumption({ resource, amount, unit, direction = 'consumed', taskId = null, source = null }) {
  const { error } = await _sb()
    .from('resource_ledger')
    .insert({ resource, amount, unit, direction, task_id: taskId, source });
  if (error) logger.warn('resource-authority', 'record failed', { error: error.message });
}

// syncFromAgentRuns — backfill resource_ledger from apex_agent_runs for the current month
async function syncFromAgentRuns() {
  const since = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { rows } = await getActualCosts({ since });

  if (!rows.length) return { synced: 0 };

  // Check which task_ids are already in resource_ledger
  const taskIds = rows.map(r => r.task_id).filter(Boolean);
  const { data: existing } = await _sb()
    .from('resource_ledger')
    .select('task_id')
    .in('task_id', taskIds.slice(0, 100));

  const existingIds = new Set((existing || []).map(r => r.task_id));
  const toSync = rows.filter(r => r.task_id && !existingIds.has(r.task_id));

  if (!toSync.length) return { synced: 0 };

  const inserts = [];
  for (const run of toSync) {
    const cost = parseFloat(run.cost_usd) || 0;
    if (cost > 0) {
      inserts.push({ resource: 'api_cost', amount: cost, unit: 'usd', direction: 'consumed', task_id: run.task_id, source: 'apex_agent_runs' });
    }
    const t = run.token_usage || {};
    const tokens = (parseInt(t.input_tokens) || 0) + (parseInt(t.output_tokens) || 0);
    if (tokens > 0) {
      inserts.push({ resource: 'tokens', amount: tokens, unit: 'tokens', direction: 'consumed', task_id: run.task_id, source: 'apex_agent_runs' });
    }
  }

  if (inserts.length) {
    const { error } = await _sb().from('resource_ledger').insert(inserts);
    if (error) logger.warn('resource-authority', 'sync failed', { error: error.message });
  }

  return { synced: toSync.length };
}

// getResourceSummary — current resource state from real data
async function getResourceSummary() {
  const monthly = await getMonthlyCosts();

  // Storage: query Supabase storage usage (not available via REST without admin API, use row counts as proxy)
  const [episodes, lessons, memories] = await Promise.allSettled([
    _sb().from('apex_episodes').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
    _sb().from('apex_lessons').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
    _sb().from('memory').select('id', { count: 'exact', head: true }).then(r => r.count || 0),
  ]);

  return {
    api_cost: {
      this_month_usd:  parseFloat(monthly.totalCostUsd.toFixed(4)),
      budget_usd:      monthly.budget_usd,
      remaining_usd:   parseFloat(monthly.remaining_usd.toFixed(4)),
      utilization_pct: monthly.utilization_pct ? parseFloat(monthly.utilization_pct.toFixed(1)) : null,
      run_count:       monthly.runCount,
    },
    tokens: {
      this_month_total: monthly.totalTokens,
    },
    storage: {
      episodes:  episodes.status === 'fulfilled'  ? episodes.value  : null,
      lessons:   lessons.status  === 'fulfilled'  ? lessons.value   : null,
      memories:  memories.status === 'fulfilled'  ? memories.value  : null,
    },
    limits: LIMITS,
  };
}

module.exports = { getActualCosts, getMonthlyCosts, validate, recordConsumption, syncFromAgentRuns, getResourceSummary };
