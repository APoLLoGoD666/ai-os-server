'use strict';
// lib/intelligence/reality-loop.js
// Grounded operational loop — all measurements from real database rows.
// No model-generated health scores. No synthetic readiness metrics.
// Observe → Decide → Execute → Measure → Learn → Update → Repeat

const logger = require('../logger');

const DEFAULT_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

let _timer    = null;
let _running  = false;
let _cycleCount = 0;
let _lastCycleResult = null;

async function start(intervalMs = DEFAULT_INTERVAL_MS) {
  if (process.env.REALITY_LOOP_ENABLED !== 'true') {
    logger.info('reality-loop', 'parked — set REALITY_LOOP_ENABLED=true to enable');
    return;
  }
  if (_running) return;
  _running = true;
  logger.debug('reality-loop', 'start', { intervalMs });
  _tick().catch(e => logger.warn('reality-loop', 'first tick error', { error: e.message }));
  _timer = setInterval(() => {
    _tick().catch(e => logger.warn('reality-loop', 'tick error', { error: e.message }));
  }, intervalMs);
}

function stop() {
  if (_timer) { clearInterval(_timer); _timer = null; }
  _running = false;
  logger.debug('reality-loop', 'stopped', { cycles: _cycleCount });
}

function status() {
  return { running: _running, cycleCount: _cycleCount, lastCycle: _lastCycleResult };
}

async function runOnce() {
  return _tick();
}

// ─── One cycle ────────────────────────────────────────────────────────────────

async function _tick() {
  const cycleId    = `RL-${Date.now()}`;
  const cycleStart = Date.now();
  const result     = { cycleId, phases: {}, errors: [] };

  // PHASE 1: OBSERVE REALITY
  // Read actual state from database — no model generation
  result.phases.observe = await _phase('observe', async () => {
    const resource = require('./resource-authority-engine');
    const sb       = require('../clients').getSupabaseClient();

    const [costs, taskCount, lessonCount, oppCount] = await Promise.allSettled([
      resource.getMonthlyCosts(),
      sb.from('agent_tasks').select('status').limit(100).then(r => {
        const rows = r.data || [];
        return { total: rows.length, pending: rows.filter(x => x.status === 'pending' || x.status === 'waiting_approval').length };
      }),
      sb.from('apex_lessons').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).then(r => r.count || 0),
      sb.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'detected').then(r => r.count || 0),
    ]);

    return {
      api_cost_month_usd:  costs.status === 'fulfilled' ? parseFloat(costs.value.totalCostUsd.toFixed(4)) : null,
      api_budget_remaining: costs.status === 'fulfilled' ? parseFloat(costs.value.remaining_usd.toFixed(4)) : null,
      tasks:               taskCount.status === 'fulfilled' ? taskCount.value : null,
      lessons_7d:          lessonCount.status === 'fulfilled' ? lessonCount.value : null,
      open_opportunities:  oppCount.status === 'fulfilled' ? oppCount.value : null,
    };
  });

  const observed = result.phases.observe?.output || {};

  // PHASE 2: GENERATE DECISION
  // Only generates if resource budget allows; decision is evidence-grounded
  result.phases.decide = await _phase('decide', async () => {
    const resource = require('./resource-authority-engine');

    // Block if budget is exhausted
    const check = await resource.validate({ estimatedCostUsd: 0.05 });
    if (!check.allowed) {
      return { blocked: true, reason: check.reason, decision: null };
    }

    // Decision: what needs attention based on observed reality
    const issues = [];
    if (observed.api_budget_remaining !== null && observed.api_budget_remaining < 5) {
      issues.push('api_budget_low');
    }
    if ((observed.tasks?.pending || 0) > 10) {
      issues.push('task_queue_backlog');
    }
    if (observed.open_opportunities > 20) {
      issues.push('opportunity_backlog');
    }

    return { blocked: false, issues, decision: issues.length ? `Address: ${issues.join(', ')}` : 'nominal' };
  });

  // PHASE 3: EXECUTE
  // Only runs if decision is not blocked and there are issues to address
  result.phases.execute = await _phase('execute', async () => {
    const decision = result.phases.decide?.output;
    if (decision?.blocked || decision?.decision === 'nominal') {
      return { actioned: false, reason: decision?.blocked ? decision.reason : 'no issues to address' };
    }

    const issues   = decision?.issues || [];
    const actioned = [];

    for (const issue of issues) {
      if (issue === 'opportunity_backlog') {
        // Emit event for opportunity review — no autonomous spend
        const eb = require('../event-bus');
        eb.emit('reality-loop:opportunity-backlog', { cycleId, count: observed.open_opportunities });
        actioned.push(issue);
      }
      // Other issues are logged for human review, not auto-actioned
    }

    return { actioned, total: issues.length };
  });

  // PHASE 4: MEASURE OUTCOME
  // Query actual results — counts and costs from real tables
  result.phases.measure = await _phase('measure', async () => {
    const resource  = require('./resource-authority-engine');
    const valueEng  = require('./value-creation-engine');

    const [netValue, resourceSummary] = await Promise.allSettled([
      valueEng.computeNetValue({ since: new Date(Date.now() - 30 * 86400000).toISOString() }),
      resource.getResourceSummary(),
    ]);

    return {
      net_value:       netValue.status       === 'fulfilled' ? netValue.value       : null,
      resources:       resourceSummary.status === 'fulfilled' ? resourceSummary.value : null,
    };
  });

  // PHASE 5: LEARN
  // Persist cycle result as a lesson — facts only, no synthetic scores
  result.phases.learn = await _phase('learn', async () => {
    const measured  = result.phases.measure?.output;
    const observed_ = result.phases.observe?.output;

    const facts = {
      cycleId,
      api_cost_month_usd:    observed_?.api_cost_month_usd,
      budget_remaining_usd:  observed_?.api_budget_remaining,
      open_opportunities:    observed_?.open_opportunities,
      issues_found:          result.phases.decide?.output?.issues || [],
      net_value_usd:         measured?.net_value?.net_value_usd,
    };

    const gateway = require('../memory/gateway');
    await gateway.storeMemory({
      layer:            10,
      content:          JSON.stringify(facts),
      tags:             ['reality_loop', 'cycle_facts'],
      source:           'reality_loop',
      taskId:           cycleId,
      importance:       5,
      requestingEntity: 'reality_loop',
    }).catch(() => {});

    return { persisted: true, facts };
  });

  // PHASE 6: UPDATE MODELS
  // Sync resource ledger from agent runs, measure pending decisions
  result.phases.update = await _phase('update', async () => {
    const resource = require('./resource-authority-engine');
    const outcomes = require('./decision-outcome-engine');

    const [sync, pending] = await Promise.allSettled([
      resource.syncFromAgentRuns(),
      outcomes.getPending(5),
    ]);

    return {
      ledger_synced:      sync.status === 'fulfilled' ? sync.value : null,
      pending_outcomes:   pending.status === 'fulfilled' ? pending.value.length : null,
    };
  });

  _cycleCount++;
  result.completedAt  = new Date().toISOString();
  result.durationMs   = Date.now() - cycleStart;
  _lastCycleResult    = result;
  logger.debug('reality-loop', 'cycle complete', { cycleId, durationMs: result.durationMs });
  return result;
}

async function _phase(name, fn) {
  const start = Date.now();
  try {
    const output = await fn();
    return { status: 'ok', output, durationMs: Date.now() - start };
  } catch (e) {
    logger.warn('reality-loop', `phase ${name} error`, { error: e.message });
    return { status: 'error', error: e.message, durationMs: Date.now() - start };
  }
}

module.exports = { start, stop, status, runOnce };
