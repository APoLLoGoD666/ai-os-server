'use strict';
// lib/telemetry/aggregator.js — Civilization Health computation
// Aggregates data from 8+ tables into a single civilization score snapshot.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

function _sb()          { return getSupabaseClient(); }
function _daysAgo(n)    { return new Date(Date.now() - n * 86_400_000).toISOString(); }
function _safe(r, def)  { return r.status === 'fulfilled' ? r.value : def; }

async function computeCivilizationHealth() {
  const [
    taskRate, avgDuration, costPerRun, failuresByCategory,
    govScore, retryRate, costDistribution, lessonRate, predictionAccuracy,
  ] = await Promise.allSettled([
    _taskSuccessRate(),
    _avgDuration(),
    _costPerRun(),
    _failuresByCategory(),
    _governanceScore(),
    _retryRate(),
    _costByModel(),
    _lessonRate(),
    _predictionAccuracy(),
  ]);

  const dimensions = {
    execution_quality:      _scoreExecution(_safe(taskRate, null), _safe(avgDuration, null), _safe(retryRate, null)),
    financial_health:       _scoreFinancial(_safe(costPerRun, null), _safe(costDistribution, [])),
    intelligence_growth:    _scoreIntelligence(_safe(lessonRate, 0), _safe(predictionAccuracy, null)),
    governance:             _safe(govScore, null)?.score ?? 0,
    operational_reliability: _scoreReliability(_safe(failuresByCategory, {})),
  };

  const overall = Math.round(
    Object.values(dimensions).reduce((a, b) => a + (b || 0), 0) / Object.keys(dimensions).length
  );

  const snapshot = {
    overall_score:   overall,
    classification:  _classify(overall),
    dimensions,
    computed_at:     new Date().toISOString(),
    alerts:          _detectAlerts(dimensions, _safe(taskRate, null), _safe(govScore, null)),
  };

  // DATA-5: snapshot write disabled — civilization-health-engine.js is now the
  // single writer for civilization_health_snapshots (schema_version:2, 12 dimensions).
  // Do NOT re-enable this write; it would produce schema_version:1 rows with only 5 dimensions.

  return snapshot;
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual metric collectors
// ─────────────────────────────────────────────────────────────────────────────
async function _taskSuccessRate() {
  const { data } = await _sb().from('apex_agent_runs').select('success').gte('created_at', _daysAgo(7));
  if (!data?.length) return null;
  return data.filter(r => r.success === true).length / data.length;
}

async function _avgDuration() {
  const { data } = await _sb().from('apex_agent_runs')
    .select('duration_ms').eq('success', true).gte('created_at', _daysAgo(7));
  if (!data?.length) return null;
  return data.reduce((s, r) => s + (r.duration_ms || 0), 0) / data.length;
}

async function _costPerRun() {
  const { data }  = await _sb().from('cost_accounting').select('amount_usd').gte('created_at', _daysAgo(7));
  const { count } = await _sb().from('apex_agent_runs').select('id', { count: 'exact' }).gte('created_at', _daysAgo(7));
  if (!data?.length || !count) return null;
  return data.reduce((s, r) => s + parseFloat(r.amount_usd || 0), 0) / count;
}

async function _failuresByCategory() {
  const { data } = await _sb().from('apex_agent_runs').select('task_category, success').gte('created_at', _daysAgo(7));
  if (!data?.length) return {};
  const map = {};
  for (const r of data) {
    const cat = r.task_category || 'unknown';
    if (!map[cat]) map[cat] = { total: 0, failed: 0 };
    map[cat].total++;
    if (r.success === false) map[cat].failed++;
  }
  return map;
}

async function _governanceScore() {
  const { data } = await _sb().from('governance_probes')
    .select('score, passed').order('created_at', { ascending: false }).limit(1);
  return data?.[0] || null;
}

async function _retryRate() {
  const { data } = await _sb().from('apex_agent_runs').select('retry_count').gte('created_at', _daysAgo(7));
  if (!data?.length) return null;
  return data.reduce((s, r) => s + (r.retry_count || 0), 0) / data.length;
}

async function _costByModel() {
  const { data } = await _sb().from('cost_accounting').select('description, amount_usd').gte('created_at', _daysAgo(7));
  return data || [];
}

async function _lessonRate() {
  const { count } = await _sb().from('apex_lessons').select('id', { count: 'exact' }).gte('created_at', _daysAgo(7));
  return count || 0;
}

async function _predictionAccuracy() {
  const { data } = await _sb().from('twin_accuracy_records')
    .select('forecast_accuracy').gte('created_at', _daysAgo(30)).limit(20);
  if (!data?.length) return null;
  return data.reduce((s, r) => s + parseFloat(r.forecast_accuracy || 0), 0) / data.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring functions
// ─────────────────────────────────────────────────────────────────────────────
function _scoreExecution(successRate, avgDuration, retryRate) {
  if (successRate === null) return 50;
  const s = (successRate * 40)
          + (Math.max(0, 1 - (avgDuration || 0) / 300_000) * 30)
          + (Math.max(0, 1 - (retryRate || 0) / 3) * 30);
  return Math.round(s);
}

function _scoreFinancial(costPerRun) {
  if (costPerRun === null) return 60;
  return Math.round(Math.max(0, 100 - (costPerRun / 0.50) * 30));
}

function _scoreIntelligence(lessonRate, predictionAccuracy) {
  const lessonScore = Math.min(100, lessonRate * 15);
  const predScore   = predictionAccuracy !== null ? predictionAccuracy * 100 : 30;
  return Math.round((lessonScore * 0.4) + (predScore * 0.6));
}

function _scoreReliability(failuresByCategory) {
  const cats = Object.values(failuresByCategory || {});
  if (!cats.length) return 70;
  const avgFailRate = cats.reduce((s, c) => s + c.failed / c.total, 0) / cats.length;
  return Math.round(Math.max(0, 100 - avgFailRate * 200));
}

function _classify(score) {
  if (score >= 90) return 'digital_civilization';
  if (score >= 80) return 'autonomous_organization';
  if (score >= 70) return 'self_improving_platform';
  if (score >= 60) return 'capable_platform';
  if (score >= 50) return 'functioning_platform';
  return 'emerging_platform';
}

function _detectAlerts(dimensions, taskRate, govScore) {
  const alerts = [];
  if (taskRate !== null && taskRate < 0.80) {
    alerts.push({ metric: 'task_success_rate', value: taskRate, severity: 'HIGH' });
  }
  if (govScore && govScore.score < 80) {
    alerts.push({ metric: 'governance_score', value: govScore.score, severity: 'CRITICAL' });
  }
  if (dimensions.financial_health < 40) {
    alerts.push({ metric: 'financial_health', value: dimensions.financial_health, severity: 'HIGH' });
  }
  return alerts;
}

module.exports = { computeCivilizationHealth };
