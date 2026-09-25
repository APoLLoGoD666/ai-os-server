'use strict';
// lib/intelligence/executive-performance-engine.js
// Tracks per-executive recommendation accuracy, decision outcome, and confidence calibration.
// All metrics are derived from real recorded outcomes — no synthetic scoring.

const { getSupabaseClient } = require('../clients');
const logger = require('../logger');

const ENTITY_IDS = ['ceo', 'cso', 'cto', 'cfo', 'coo', 'cio', 'cgo'];

// Calibration thresholds: mean(confidence - actual) compared to 0
const OVERCONFIDENT_THRESHOLD  =  0.10;  // confidence consistently too high
const UNDERCONFIDENT_THRESHOLD = -0.10;  // confidence consistently too low

function _sb() { return getSupabaseClient(); }

// ─── Record Recommendation ─────────────────────────────────────────────────────
// Called when an executive makes a recommendation or casts a vote.
// decisionType: 'approved' | 'rejected' | 'executed' | 'pending'

async function recordRecommendation({
  entityId, recommendation, decisionId = null, confidenceAtTime = null,
  decisionType = 'pending', category = 'strategic', contextSummary = null,
}) {
  if (!ENTITY_IDS.includes(entityId)) throw new Error(`Unknown entity: ${entityId}`);

  const { data, error } = await _sb()
    .from('executive_performance')
    .insert({
      entity_id:          entityId,
      recommendation:     String(recommendation).slice(0, 500),
      decision_id:        decisionId,
      confidence_at_time: confidenceAtTime,
      decision_type:      decisionType,
      category:           category,
      context_summary:    contextSummary ? String(contextSummary).slice(0, 300) : null,
    })
    .select()
    .single();

  if (error) {
    logger.warn('exec-performance', 'record failed', { entityId, error: error.message });
    return null;
  }
  return data;
}

// ─── Record Outcome ────────────────────────────────────────────────────────────
// Called when an outcome can be measured against a prior recommendation.
// outcomeMatched: true if the recommendation was correct / the decision worked.
// valueCreated: float — positive for value created, negative sign for losses.

async function recordOutcome({
  performanceId, outcome, outcomeMatched, impactScore = null,
  valueCreated = null, notes = '',
}) {
  if (typeof outcomeMatched !== 'boolean') throw new Error('outcomeMatched must be boolean');

  // Compute per-row calibration error from stored confidence
  let calibrationError = null;
  const { data: existing } = await _sb()
    .from('executive_performance').select('confidence_at_time').eq('id', performanceId).single();
  if (existing?.confidence_at_time != null) {
    const actual = outcomeMatched ? 1.0 : 0.0;
    calibrationError = parseFloat(existing.confidence_at_time) - actual;
  }

  const { data, error } = await _sb()
    .from('executive_performance')
    .update({
      outcome:             String(outcome).slice(0, 500),
      outcome_matched:     outcomeMatched,
      outcome_recorded_at: new Date().toISOString(),
      impact_score:        impactScore,
      value_created:       valueCreated,
      calibration_error:   calibrationError,
      notes:               String(notes).slice(0, 500),
    })
    .eq('id', performanceId)
    .select()
    .single();

  if (error) throw new Error(`recordOutcome: ${error.message}`);

  // Async refresh cached stats for this entity
  setImmediate(async () => {
    try { await _refreshEntityStats(data.entity_id); } catch {}
  });

  return data;
}

// ─── computeStats ─────────────────────────────────────────────────────────────
// Returns real computed stats for one or all executives.
// Only rows with outcome_matched recorded count toward accuracy and calibration.

async function computeStats(entityId = null) {
  let q = _sb()
    .from('executive_performance')
    .select('entity_id, outcome_matched, confidence_at_time, impact_score, value_created, calibration_error');

  if (entityId) q = q.eq('entity_id', entityId);

  const { data, error } = await q;
  if (error) {
    logger.warn('exec-performance', 'computeStats error', { error: error.message });
    return entityId ? _emptyStats(entityId) : {};
  }

  const rows = data || [];
  if (!rows.length) return entityId ? _emptyStats(entityId) : {};

  const byEntity = {};
  for (const row of rows) {
    const id = row.entity_id;
    if (!byEntity[id]) {
      byEntity[id] = { total: 0, withOutcome: 0, matched: 0,
                       confidenceSum: 0, confidenceCount: 0,
                       impactSum: 0, impactCount: 0,
                       valueSum: 0, valueCount: 0,
                       calibrationErrors: [], brierSum: 0 };
    }
    const s = byEntity[id];
    s.total++;

    if (row.confidence_at_time != null) {
      s.confidenceSum += parseFloat(row.confidence_at_time);
      s.confidenceCount++;
    }
    if (row.outcome_matched !== null && row.outcome_matched !== undefined) {
      s.withOutcome++;
      if (row.outcome_matched) s.matched++;
    }
    if (row.impact_score != null) {
      s.impactSum += parseFloat(row.impact_score);
      s.impactCount++;
    }
    if (row.value_created != null) {
      s.valueSum += parseFloat(row.value_created);
      s.valueCount++;
    }
    if (row.calibration_error != null) {
      const ce = parseFloat(row.calibration_error);
      s.calibrationErrors.push(ce);
      s.brierSum += ce * ce;
    }
  }

  const result = {};
  for (const [id, s] of Object.entries(byEntity)) {
    const accuracy       = s.withOutcome > 0 ? s.matched / s.withOutcome : null;
    const avgConfidence  = s.confidenceCount > 0 ? s.confidenceSum / s.confidenceCount : null;
    const avgImpact      = s.impactCount > 0 ? s.impactSum / s.impactCount : null;
    const totalValue     = s.valueCount > 0 ? s.valueSum : 0;
    const meanCalibError = s.calibrationErrors.length > 0
      ? s.calibrationErrors.reduce((a, b) => a + b, 0) / s.calibrationErrors.length : null;
    const brierScore     = s.calibrationErrors.length > 0 ? s.brierSum / s.calibrationErrors.length : null;

    result[id] = {
      entityId:             id,
      totalRecommendations: s.total,
      withOutcome:          s.withOutcome,
      accuracy:             accuracy !== null ? Math.round(accuracy * 1000) / 10 : null,  // as percentage
      avgConfidence:        avgConfidence !== null ? Math.round(avgConfidence * 100) / 100 : null,
      avgImpactScore:       avgImpact !== null ? Math.round(avgImpact * 10) / 10 : null,
      totalValueCreated:    Math.round(totalValue * 100) / 100,
      meanCalibrationError: meanCalibError !== null ? Math.round(meanCalibError * 1000) / 1000 : null,
      brierScore:           brierScore !== null ? Math.round(brierScore * 1000) / 1000 : null,
      calibrationLabel:     _calibrationLabel(meanCalibError),
    };
  }

  return entityId ? (result[entityId] || _emptyStats(entityId)) : result;
}

// ─── computeAllStats ──────────────────────────────────────────────────────────
// Computes and persists stats for all known entities.

async function computeAllStats() {
  const all = await computeStats(null);

  const rows = Object.values(all).map(s => ({
    id:                     `stats_${s.entityId}`,
    entity_id:              s.entityId,
    total_recommendations:  s.totalRecommendations,
    with_outcome:           s.withOutcome,
    matched:                s.withOutcome > 0 && s.accuracy != null
                              ? Math.round(s.accuracy / 100 * s.withOutcome) : 0,
    accuracy:               s.accuracy,
    avg_confidence:         s.avgConfidence,
    avg_impact_score:       s.avgImpactScore,
    total_value_created:    s.totalValueCreated,
    mean_calibration_error: s.meanCalibrationError,
    brier_score:            s.brierScore,
    calibration_label:      s.calibrationLabel,
    computed_at:            new Date().toISOString(),
  }));

  if (rows.length) {
    const { error } = await _sb().from('exec_performance_stats').upsert(rows, { onConflict: 'entity_id' });
    if (error) logger.warn('exec-performance', 'stats persist failed', { error: error.message });
  }

  return all;
}

// ─── generateStatusReport ─────────────────────────────────────────────────────
// Classifies each executive as overconfident / underconfident / calibrated / high_performer.
// Persists the report to exec_status_reports for audit trail.
// Only real outcomes are used — never synthetic.

async function generateStatusReport() {
  const all    = await computeAllStats();
  const stats  = Object.values(all);

  if (!stats.length) {
    return {
      generated_at: new Date().toISOString(),
      message:      'No performance data recorded yet. Record recommendations and outcomes to begin tracking.',
      executives:   [],
    };
  }

  const withData  = stats.filter(s => s.withOutcome > 0);
  const noData    = stats.filter(s => s.withOutcome === 0);

  const overconfident  = withData.filter(s => s.calibrationLabel === 'overconfident');
  const underconfident = withData.filter(s => s.calibrationLabel === 'underconfident');
  const calibrated     = withData.filter(s => s.calibrationLabel === 'calibrated');

  const byAccuracy = [...withData].sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
  const byValue    = [...withData].sort((a, b) => (b.totalValueCreated || 0) - (a.totalValueCreated || 0));
  const byImpact   = [...withData].sort((a, b) => (b.avgImpactScore || 0) - (a.avgImpactScore || 0));

  const report = {
    generated_at: new Date().toISOString(),
    coverage: {
      total_executives:  ENTITY_IDS.length,
      with_outcome_data: withData.length,
      awaiting_outcomes: noData.length,
    },
    rankings: {
      highest_accuracy:      byAccuracy[0] ? { entityId: byAccuracy[0].entityId, accuracy_pct: byAccuracy[0].accuracy } : null,
      highest_value_created: byValue[0]    ? { entityId: byValue[0].entityId, value_usd: byValue[0].totalValueCreated }  : null,
      highest_impact_score:  byImpact[0]   ? { entityId: byImpact[0].entityId, score: byImpact[0].avgImpactScore }       : null,
    },
    calibration: {
      overconfident:      overconfident.map(s => ({ entityId: s.entityId, mean_error: s.meanCalibrationError, accuracy_pct: s.accuracy })),
      underconfident:     underconfident.map(s => ({ entityId: s.entityId, mean_error: s.meanCalibrationError, accuracy_pct: s.accuracy })),
      calibrated:         calibrated.map(s => ({ entityId: s.entityId, brier_score: s.brierScore })),
      no_outcomes_yet:    noData.map(s => s.entityId),
    },
    executives: stats.map(s => ({
      entityId:               s.entityId,
      total_recommendations:  s.totalRecommendations,
      with_outcome:           s.withOutcome,
      accuracy_pct:           s.accuracy,
      avg_confidence:         s.avgConfidence,
      total_value_created:    s.totalValueCreated,
      avg_impact_score:       s.avgImpactScore,
      calibration_label:      s.calibrationLabel,
      mean_calibration_error: s.meanCalibrationError,
      brier_score:            s.brierScore,
      status:                 _execStatus(s),
    })),
    insights: _generateInsights(withData, overconfident, underconfident, byAccuracy, byValue),
  };

  setImmediate(async () => {
    try {
      await _sb().from('exec_status_reports').insert({ id: `report_${Date.now()}`, report });
    } catch {}
  });

  return report;
}

// ─── getRecentRecommendations ──────────────────────────────────────────────────

async function getRecentRecommendations(entityId, limit = 20) {
  const { data, error } = await _sb()
    .from('executive_performance')
    .select('*')
    .eq('entity_id', entityId)
    .order('recommendation_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// ─── getPendingOutcomes ────────────────────────────────────────────────────────

async function getPendingOutcomes(entityId = null) {
  let q = _sb()
    .from('executive_performance')
    .select('id, entity_id, recommendation, decision_type, category, confidence_at_time, recommendation_at, context_summary')
    .is('outcome_matched', null)
    .order('recommendation_at', { ascending: true });
  if (entityId) q = q.eq('entity_id', entityId);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

// ─── getDecisionCoverage ───────────────────────────────────────────────────────

async function getDecisionCoverage() {
  const [decisionsResult, performanceResult] = await Promise.allSettled([
    _sb().from('executive_decisions').select('entity_id', { count: 'exact' }).then(r => r.count),
    _sb().from('executive_performance').select('entity_id, outcome_matched').then(r => r.data || []),
  ]);

  const totalDecisions  = decisionsResult.status === 'fulfilled' ? decisionsResult.value || 0 : 0;
  const performanceRows = performanceResult.status === 'fulfilled' ? performanceResult.value : [];
  const withOutcome     = performanceRows.filter(r => r.outcome_matched !== null).length;

  return {
    totalDecisionsLogged: totalDecisions,
    trackedInPerformance: performanceRows.length,
    outcomesRecorded:     withOutcome,
    coveragePct:          performanceRows.length > 0
      ? Math.round(withOutcome / performanceRows.length * 100) : null,
  };
}

// ─── getLeaderboard ────────────────────────────────────────────────────────────

async function getLeaderboard() {
  const { data, error } = await _sb()
    .from('exec_performance_stats')
    .select('*')
    .order('accuracy', { ascending: false, nullsFirst: false });

  if (error || !data?.length) {
    const all = await computeStats(null);
    return Object.values(all).sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
  }
  return data;
}

// ─── getRecentReports ─────────────────────────────────────────────────────────

async function getRecentReports(limit = 5) {
  const { data, error } = await _sb()
    .from('exec_status_reports')
    .select('id, generated_at, report')
    .order('generated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function _calibrationLabel(meanError) {
  if (meanError === null || meanError === undefined) return 'insufficient_data';
  if (meanError >  OVERCONFIDENT_THRESHOLD)  return 'overconfident';
  if (meanError <  UNDERCONFIDENT_THRESHOLD) return 'underconfident';
  return 'calibrated';
}

function _execStatus(s) {
  if (s.withOutcome === 0) return 'no_outcomes_yet';
  if (s.accuracy >= 70 && s.calibrationLabel === 'calibrated')      return 'high_performer';
  if (s.accuracy >= 70 && s.calibrationLabel === 'overconfident')   return 'accurate_but_overconfident';
  if (s.accuracy !== null && s.accuracy < 50) return 'underperforming';
  if (s.calibrationLabel === 'overconfident')  return 'overconfident';
  if (s.calibrationLabel === 'underconfident') return 'underconfident';
  return 'average';
}

function _generateInsights(withData, overconfident, underconfident, byAccuracy, byValue) {
  const insights = [];
  if (!withData.length) {
    insights.push('No outcomes recorded yet — wire recommendations to outcomes to enable performance tracking.');
    return insights;
  }
  if (overconfident.length) {
    insights.push(`Overconfident: ${overconfident.map(s => s.entityId.toUpperCase()).join(', ')} — confidence consistently exceeds actual accuracy. Reduce their vote weight in close calls.`);
  }
  if (underconfident.length) {
    insights.push(`Underconfident: ${underconfident.map(s => s.entityId.toUpperCase()).join(', ')} — actual accuracy exceeds stated confidence. Increase their vote weight.`);
  }
  if (byAccuracy[0]?.accuracy >= 70) {
    insights.push(`Highest accuracy: ${byAccuracy[0].entityId.toUpperCase()} at ${byAccuracy[0].accuracy}% — weight their recommendations more heavily in close votes.`);
  }
  if (byValue[0]?.totalValueCreated > 0) {
    insights.push(`Highest value created: ${byValue[0].entityId.toUpperCase()} — $${byValue[0].totalValueCreated.toLocaleString()} total.`);
  }
  const lowAcc = withData.filter(s => s.accuracy !== null && s.accuracy < 50);
  if (lowAcc.length) {
    insights.push(`Below 50% accuracy: ${lowAcc.map(s => s.entityId.toUpperCase()).join(', ')} — review their decision mandate.`);
  }
  return insights;
}

function _emptyStats(entityId) {
  return {
    entityId, totalRecommendations: 0, withOutcome: 0, accuracy: null,
    avgConfidence: null, avgImpactScore: null, totalValueCreated: 0,
    meanCalibrationError: null, brierScore: null, calibrationLabel: 'insufficient_data',
  };
}

async function _refreshEntityStats(entityId) {
  if (!entityId) return;
  const s = await computeStats(entityId);
  await _sb().from('exec_performance_stats').upsert({
    id:                     `stats_${entityId}`,
    entity_id:              entityId,
    total_recommendations:  s.totalRecommendations,
    with_outcome:           s.withOutcome,
    matched:                s.withOutcome > 0 && s.accuracy != null
                              ? Math.round(s.accuracy / 100 * s.withOutcome) : 0,
    accuracy:               s.accuracy,
    avg_confidence:         s.avgConfidence,
    avg_impact_score:       s.avgImpactScore,
    total_value_created:    s.totalValueCreated,
    mean_calibration_error: s.meanCalibrationError,
    brier_score:            s.brierScore,
    calibration_label:      s.calibrationLabel,
    computed_at:            new Date().toISOString(),
  }, { onConflict: 'entity_id' });
}

module.exports = {
  recordRecommendation,
  recordOutcome,
  computeStats,
  computeAllStats,
  generateStatusReport,
  getRecentRecommendations,
  getPendingOutcomes,
  getDecisionCoverage,
  getLeaderboard,
  getRecentReports,
  ENTITY_IDS,
};
