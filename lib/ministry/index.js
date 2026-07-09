'use strict';
// lib/ministry/index.js — 5 Ministry autonomous cron functions

const log = require('../logger');
function _sb() { return require('../clients').getSupabaseClient(); }

async function _checkpoint(key, value) {
  try {
    await _sb().from('apex_sync_checkpoints').upsert(
      { key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch {}
}

// ── Ministry of Intelligence — knowledge validation & opportunity pulse ───────
async function runIntelligenceMinistry() {
  const ts = new Date().toISOString();
  let opportunityCount = 0, knowledgeItems = 0;

  try {
    const { count } = await _sb()
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'identified');
    opportunityCount = count || 0;
  } catch {}

  try {
    const opp = require('../intelligence/opportunity-engine');
    await opp.runCycle();
  } catch (e) {
    log.warn('ministry-intelligence', 'opportunity cycle error (non-fatal)', { error: e.message });
  }

  try {
    const { count } = await _sb()
      .from('knowledge_items')
      .select('*', { count: 'exact', head: true });
    knowledgeItems = count || 0;
  } catch {}

  await _checkpoint('ministry:intelligence:last_run', { ts, opportunityCount, knowledgeItems, status: 'ok' });
  log.info('ministry-intelligence', 'cycle complete', { opportunityCount, knowledgeItems });
}

// ── Ministry of Operations — task queue health & throughput snapshot ──────────
async function runOperationsMinistry() {
  const ts = new Date().toISOString();
  const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  let pending = 0, completed = 0, cronFailures = 0;

  try {
    const { count } = await _sb()
      .from('agent_tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'queued']);
    pending = count || 0;
  } catch {}

  try {
    const { count } = await _sb()
      .from('agent_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', cutoff);
    completed = count || 0;
  } catch {}

  try {
    const { count } = await _sb()
      .from('cron_run_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'error')
      .gte('started_at', cutoff);
    cronFailures = count || 0;
  } catch {}

  const health = cronFailures === 0 ? 'healthy' : cronFailures < 3 ? 'degraded' : 'critical';
  await _checkpoint('ministry:operations:last_run', { ts, pending, completed, cronFailures, health, status: 'ok' });
  log.info('ministry-operations', 'cycle complete', { pending, completed, cronFailures, health });
}

// ── Ministry of Capital — resource consumption & budget health ────────────────
async function runCapitalMinistry() {
  const ts = new Date().toISOString();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let totalTokens = 0, totalCost = 0, snapshotCount = 0, healthScore = null;

  try {
    const { data } = await _sb()
      .from('resource_consumption')
      .select('tokens_used, cost_usd')
      .gte('created_at', since);
    if (data) {
      totalTokens = data.reduce((s, r) => s + (r.tokens_used || 0), 0);
      totalCost   = data.reduce((s, r) => s + (r.cost_usd   || 0), 0);
      snapshotCount = data.length;
    }
  } catch {}

  try {
    const { data } = await _sb()
      .from('civilization_health_snapshots')
      .select('overall_score')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    healthScore = data?.overall_score ?? null;
  } catch {}

  await _checkpoint('ministry:capital:last_run', {
    ts, totalTokens, totalCost: parseFloat(totalCost.toFixed(4)),
    snapshotCount, civilizationHealth: healthScore, status: 'ok',
  });
  log.info('ministry-capital', 'cycle complete', { totalTokens, totalCost, healthScore });
}

// ── Ministry of Governance — probe, readiness & compliance ───────────────────
async function runGovernanceMinistry() {
  const ts = new Date().toISOString();
  let probeScore = null, probeStatus = null, readinessScore = null;

  try {
    const probe = require('../governance-probe');
    const result = await probe.run();
    probeScore  = result.score;
    probeStatus = result.status;
  } catch (e) {
    log.warn('ministry-governance', 'probe error (non-fatal)', { error: e.message });
  }

  try {
    const readiness = require('../runtime-readiness');
    const result    = await readiness.compute();
    readinessScore  = result.score ?? result.overall ?? null;
  } catch {}

  await _checkpoint('ministry:governance:last_run', { ts, probeScore, probeStatus, readinessScore, status: 'ok' });
  log.info('ministry-governance', 'cycle complete', { probeScore, probeStatus, readinessScore });
}

// ── Ministry of Infrastructure — platform health & connectivity ───────────────
async function runInfrastructureMinistry() {
  const ts = new Date().toISOString();
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  let dbOk = false, recentCronFailures = 0, checkpointCount = 0;

  try {
    const { count } = await _sb()
      .from('apex_sync_checkpoints')
      .select('*', { count: 'exact', head: true });
    dbOk = true;
    checkpointCount = count || 0;
  } catch {}

  try {
    const { count } = await _sb()
      .from('cron_run_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'error')
      .gte('started_at', since);
    recentCronFailures = count || 0;
  } catch {}

  const health = !dbOk ? 'critical' : recentCronFailures > 3 ? 'degraded' : 'healthy';
  await _checkpoint('ministry:infrastructure:last_run', { ts, dbOk, recentCronFailures, checkpointCount, health, status: 'ok' });
  log.info('ministry-infrastructure', 'cycle complete', { dbOk, recentCronFailures, health });
}

module.exports = {
  runIntelligenceMinistry,
  runOperationsMinistry,
  runCapitalMinistry,
  runGovernanceMinistry,
  runInfrastructureMinistry,
};
