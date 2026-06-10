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

// Compute and persist a snapshot
async function snapshot() {
  const health = await compute();

  const { data, error } = await _sb()
    .from('civilization_health_snapshots')
    .insert({
      score:          health.score,
      classification: health.classification,
      dimensions:     health.dimensions,
      alerts:         health.alerts,
    })
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
      sb.from('apex_episodes').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
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
      const total     = tasks.length;
      const successRate = total > 0 ? completed / total : 0;
      score = Math.round(successRate * 100);
      if (successRate < 0.7) alerts.push({ dimension: 'execution', severity: 'warning', message: `Success rate ${Math.round(successRate * 100)}% below 70%` });
      return { score, details: { total_24h: total, completed, failed, success_rate: successRate }, alerts };
    }
    // No data — neutral score
    return { score: 60, details: { note: 'no task data in 24h' }, alerts };
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
