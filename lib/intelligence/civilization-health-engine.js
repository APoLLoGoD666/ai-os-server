'use strict';
// lib/intelligence/civilization-health-engine.js
// Computes the Civilization Health Score (0-100) across 7 dimensions.
// Persists daily snapshots to civilization_health_snapshots.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb() { return getSupabaseClient(); }

// Dimension weights (must sum to 1.0)
const DIMENSIONS = {
  memory:         { weight: 0.18, label: 'Memory Health' },
  execution:      { weight: 0.20, label: 'Execution Health' },
  financial:      { weight: 0.15, label: 'Financial Health' },
  infrastructure: { weight: 0.15, label: 'Infrastructure Health' },
  learning:       { weight: 0.12, label: 'Learning Health' },
  opportunity:    { weight: 0.10, label: 'Opportunity Health' },
  strategic:      { weight: 0.10, label: 'Strategic Health' },
};

function _classify(score) {
  if (score >= 85) return 'thriving';
  if (score >= 70) return 'healthy';
  if (score >= 50) return 'stable';
  if (score >= 35) return 'degraded';
  return 'critical';
}

// Compute all 7 dimension scores. Returns { dimensions, score, classification, alerts }
async function compute() {
  const [memory, execution, financial, infrastructure, learning, opportunity, strategic] =
    await Promise.allSettled([
      _scoreMemory(),
      _scoreExecution(),
      _scoreFinancial(),
      _scoreInfrastructure(),
      _scoreLearning(),
      _scoreOpportunity(),
      _scoreStrategic(),
    ]);

  const safe = (r, fallback) => r.status === 'fulfilled' ? r.value : { score: fallback, details: {}, alerts: [] };

  const dimensionResults = {
    memory:         safe(memory,         50),
    execution:      safe(execution,      50),
    financial:      safe(financial,      60),
    infrastructure: safe(infrastructure, 50),
    learning:       safe(learning,       40),
    opportunity:    safe(opportunity,    40),
    strategic:      safe(strategic,      40),
  };

  let weightedSum = 0;
  const dimensionScores = {};
  const allAlerts = [];

  for (const [key, result] of Object.entries(dimensionResults)) {
    const score = Math.max(0, Math.min(100, result.score));
    dimensionScores[key] = { score, label: DIMENSIONS[key].label, details: result.details || {} };
    weightedSum += score * DIMENSIONS[key].weight;
    if (result.alerts?.length) allAlerts.push(...result.alerts);
  }

  const totalScore = Math.round(weightedSum);
  const classification = _classify(totalScore);

  return {
    score:          totalScore,
    classification,
    dimensions:     dimensionScores,
    alerts:         allAlerts,
  };
}

// Compute aggregator-style dimension scores from raw metrics (mirrors telemetry/aggregator.js)
// Included here so civilization_health_snapshots schema_version:2 rows are self-contained.
async function _computeAggregatorDimensions() {
  try {
    const sb = _sb();
    const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

    const [runsData, costsData, govData, lessonsData, twinData] = await Promise.allSettled([
      sb.from('apex_agent_runs').select('success, duration_ms, retry_count, task_category').gte('created_at', daysAgo(7)),
      sb.from('cost_accounting').select('amount_usd').gte('created_at', daysAgo(7)),
      sb.from('governance_probes').select('score, passed').order('created_at', { ascending: false }).limit(1),
      sb.from('apex_lessons').select('id', { count: 'exact', head: true }).gte('created_at', daysAgo(7)),
      sb.from('twin_accuracy_records').select('forecast_accuracy').gte('created_at', daysAgo(30)).limit(20),
    ]);

    const runs   = (runsData.status  === 'fulfilled' ? runsData.value.data   : null) || [];
    const costs  = (costsData.status === 'fulfilled' ? costsData.value.data  : null) || [];
    const gov    = (govData.status   === 'fulfilled' ? govData.value.data?.[0] : null) || null;
    const lessonCount = (lessonsData.status === 'fulfilled' ? (lessonsData.value.count || 0) : 0);
    const twins  = (twinData.status  === 'fulfilled' ? twinData.value.data   : null) || [];

    // execution_quality
    const successRate = runs.length ? runs.filter(r => r.success).length / runs.length : null;
    const avgDuration = runs.filter(r => r.success && r.duration_ms).reduce((s, r) => s + r.duration_ms, 0) / Math.max(runs.filter(r => r.success).length, 1) || null;
    const retryRate   = runs.length ? runs.reduce((s, r) => s + (r.retry_count || 0), 0) / runs.length : null;
    const execution_quality = successRate === null ? 50 : Math.round(
      (successRate * 40) +
      (Math.max(0, 1 - (avgDuration || 0) / 300_000) * 30) +
      (Math.max(0, 1 - (retryRate || 0) / 3) * 30)
    );

    // financial_health
    const totalCost = costs.reduce((s, r) => s + parseFloat(r.amount_usd || 0), 0);
    const runCount  = runs.length || 1;
    const costPerRun = costs.length ? totalCost / runCount : null;
    const financial_health = costPerRun === null ? 60 : Math.round(Math.max(0, 100 - (costPerRun / 0.50) * 30));

    // intelligence_growth
    const predAccuracy = twins.length ? twins.reduce((s, r) => s + parseFloat(r.forecast_accuracy || 0), 0) / twins.length : null;
    const lessonScore   = Math.min(100, lessonCount * 15);
    const predScore     = predAccuracy !== null ? predAccuracy * 100 : 30;
    const intelligence_growth = Math.round((lessonScore * 0.4) + (predScore * 0.6));

    // governance
    const governance = gov?.score ?? 0;

    // operational_reliability
    const catMap = {};
    for (const r of runs) {
      const cat = r.task_category || 'unknown';
      if (!catMap[cat]) catMap[cat] = { total: 0, failed: 0 };
      catMap[cat].total++;
      if (r.success === false) catMap[cat].failed++;
    }
    const cats = Object.values(catMap);
    const operational_reliability = cats.length
      ? Math.round(Math.max(0, 100 - (cats.reduce((s, c) => s + c.failed / c.total, 0) / cats.length) * 200))
      : 70;

    return { execution_quality, financial_health, intelligence_growth, governance, operational_reliability };
  } catch (e) {
    logger.warn('civilization-health', 'aggregator dimensions failed (non-fatal)', { error: e.message });
    return null;
  }
}

// Compute and persist a snapshot
async function snapshot() {
  const health = await compute();
  const aggDims = await _computeAggregatorDimensions();

  const insertPayload = {
    score:          health.score,
    classification: health.classification,
    dimensions:     health.dimensions,
    alerts:         health.alerts,
    schema_version: 2,
  };

  if (aggDims) {
    insertPayload.execution_quality      = aggDims.execution_quality;
    insertPayload.financial_health       = aggDims.financial_health;
    insertPayload.intelligence_growth    = aggDims.intelligence_growth;
    insertPayload.governance             = aggDims.governance;
    insertPayload.operational_reliability = aggDims.operational_reliability;
  }

  const { data, error } = await _sb()
    .from('civilization_health_snapshots')
    .insert(insertPayload)
    .select()
    .single();

  if (error) logger.warn('civilization-health', 'snapshot persist failed', { error: error.message });
  logger.debug('civilization-health', 'snapshot', { score: health.score, classification: health.classification });
  return data || health;
}

// Get the most recent snapshot
async function getLatest() {
  const { data, error } = await _sb()
    .from('civilization_health_snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

// Get snapshots over last N days for trend analysis
async function getTrend(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await _sb()
    .from('civilization_health_snapshots')
    .select('score, classification, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true });
  if (error) return [];
  return data || [];
}

// ─── Dimension scorers ─────────────────────────────────────────────────────────

async function _scoreMemory() {
  const sb = _sb();
  const alerts = [];
  let score = 50;

  try {
    // Recent episodes written (last 24h)
    const since24h = new Date(Date.now() - 86_400_000).toISOString();
    const [episodes, lessons] = await Promise.allSettled([
      sb.from('episodic_memory').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
      sb.from('apex_lessons').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
    ]);
    const episodeCount = episodes.status === 'fulfilled' ? (episodes.value.count || 0) : 0;
    const lessonCount  = lessons.status  === 'fulfilled' ? (lessons.value.count  || 0) : 0;

    // Score: episodes > 10 = 90, 5-10 = 70, 1-5 = 50, 0 = 25
    const episodeScore = episodeCount > 10 ? 90 : episodeCount > 5 ? 70 : episodeCount > 0 ? 50 : 25;
    // Score: lessons > 3 = 90, 1-3 = 70, 0 = 40
    const lessonScore = lessonCount > 3 ? 90 : lessonCount > 0 ? 70 : 40;

    score = Math.round((episodeScore * 0.6) + (lessonScore * 0.4));
    if (episodeCount === 0) alerts.push({ dimension: 'memory', severity: 'warning', message: 'No episodes written in last 24h' });

    return { score, details: { episodes_24h: episodeCount, lessons_24h: lessonCount }, alerts };
  } catch (e) {
    return { score: 40, details: {}, alerts: [{ dimension: 'memory', severity: 'error', message: e.message }] };
  }
}

async function _scoreExecution() {
  const sb = _sb();
  const alerts = [];
  let score = 50;

  try {
    // Recent pipeline runs via audit_log or agent_tasks
    const since24h = new Date(Date.now() - 86_400_000).toISOString();
    const { data: tasks, error } = await sb
      .from('agent_tasks')
      .select('status, created_at')
      .gte('created_at', since24h)
      .limit(50);

    if (!error && tasks?.length) {
      const completed = tasks.filter(t => t.status === 'completed').length;
      const failed    = tasks.filter(t => t.status === 'failed').length;
      // Only count actually-executed tasks — rejected/pending/waiting_approval are policy decisions, not execution failures
      const executed  = completed + failed;
      const successRate = executed > 0 ? completed / executed : null;
      if (successRate !== null) {
        score = Math.round(successRate * 100);
        if (successRate < 0.7) alerts.push({ dimension: 'execution', severity: 'warning', message: `Success rate ${Math.round(successRate * 100)}% below 70%` });
        return { score, details: { total_24h: tasks.length, executed, completed, failed, success_rate: successRate }, alerts };
      }
    }
    // No executed tasks (or only pending/rejected) — neutral score
    return { score: 60, details: { note: 'no executed tasks in 24h' }, alerts };
  } catch (e) {
    return { score: 50, details: {}, alerts: [] };
  }
}

async function _scoreFinancial() {
  const sb = _sb();
  try {
    // Sum costs from recent executive_decisions as proxy (or from audit logs)
    const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { data } = await sb
      .from('executive_decisions')
      .select('confidence, created_at')
      .gte('created_at', since7d);

    // Financial health: decisions are being logged = system is operating
    const decisionCount = data?.length || 0;
    const score = decisionCount > 5 ? 80 : decisionCount > 0 ? 65 : 50;
    return { score, details: { decisions_7d: decisionCount }, alerts: [] };
  } catch {
    return { score: 55, details: {}, alerts: [] };
  }
}

async function _scoreInfrastructure() {
  // Proxy: server uptime assumption + DB connectivity
  try {
    const sb = _sb();
    const { error } = await sb.from('civilization_health_snapshots').select('id').limit(1);
    const dbOk = !error;
    const score = dbOk ? 85 : 20;
    const alerts = dbOk ? [] : [{ dimension: 'infrastructure', severity: 'critical', message: 'Database connectivity failed' }];
    return { score, details: { database: dbOk ? 'connected' : 'error' }, alerts };
  } catch (e) {
    return { score: 20, details: {}, alerts: [{ dimension: 'infrastructure', severity: 'critical', message: e.message }] };
  }
}

async function _scoreLearning() {
  const sb = _sb();
  try {
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data } = await sb
      .from('apex_lessons')
      .select('importance, created_at')
      .gte('created_at', since30d)
      .order('importance', { ascending: false })
      .limit(50);

    const count = data?.length || 0;
    const highImportance = (data || []).filter(l => (l.importance || 0) >= 7).length;
    const score = count > 20 ? 85 : count > 10 ? 70 : count > 3 ? 55 : count > 0 ? 40 : 20;
    return { score, details: { lessons_30d: count, high_importance: highImportance }, alerts: [] };
  } catch {
    return { score: 30, details: {}, alerts: [] };
  }
}

async function _scoreOpportunity() {
  const sb = _sb();
  try {
    const { data } = await sb
      .from('opportunities')
      .select('composite_score, status')
      .eq('status', 'detected')
      .order('composite_score', { ascending: false })
      .limit(20);

    const count = data?.length || 0;
    const highValue = (data || []).filter(o => (o.composite_score || 0) >= 0.7).length;
    const score = highValue > 3 ? 85 : highValue > 1 ? 70 : count > 0 ? 55 : 30;
    return { score, details: { open_opportunities: count, high_value: highValue }, alerts: [] };
  } catch {
    return { score: 30, details: {}, alerts: [] };
  }
}

async function _scoreStrategic() {
  const sb = _sb();
  try {
    const { data: plans } = await sb
      .from('strategy_plans')
      .select('horizon, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const horizons = new Set((plans || []).map(p => p.horizon));
    const hasAllHorizons = ['90_day', '1_year', '3_year', '10_year'].every(h => horizons.has(h));
    const score = hasAllHorizons ? 90 : horizons.size >= 2 ? 65 : horizons.size >= 1 ? 45 : 20;

    const { data: delibs } = await sb
      .from('executive_deliberations')
      .select('consensus_level')
      .eq('status', 'resolved')
      .order('created_at', { ascending: false })
      .limit(5);

    const avgConsensus = (delibs || []).reduce((s, d) => s + (d.consensus_level || 0), 0) / Math.max((delibs || []).length, 1);
    const finalScore = Math.round((score * 0.7) + (Math.round(avgConsensus * 100) * 0.3));

    return { score: Math.max(0, Math.min(100, finalScore)), details: { plan_horizons: [...horizons], avg_consensus: avgConsensus }, alerts: [] };
  } catch {
    return { score: 25, details: {}, alerts: [] };
  }
}

module.exports = { compute, snapshot, getLatest, getTrend };
