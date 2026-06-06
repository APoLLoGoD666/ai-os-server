'use strict';
require('dotenv').config({ path: '.env' });
const mem = require('./agent-system/episodic-memory');
const ref = require('./agent-system/reflection-engine');
const ae  = require('./agent-system/adaptation-engine');
const am  = require('./agent-system/autonomy-metrics');
const gt  = require('./agent-system/goal-tracker');
const pqr = require('./agent-system/planning-quality-registry');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const results = {};

  // ══════════════════════════════════════════════════════════════════
  // METRIC 1: executionSuccess dimension
  // Source: getSuccessRate(50) from episodic-memory → in-memory cache
  // Transformation: raw fraction
  // Consumer: computeAutonomyScore() → dims.executionSuccess × 0.30
  // ══════════════════════════════════════════════════════════════════
  const sr50  = mem.getSuccessRate(50);
  const allEp = mem.getFailureEpisodes(50);  // Actually failure-only; use episodeCount
  const epCnt = mem.episodeCount();
  // Manually verify: load all episodes, compute success rate
  const fails = mem.getFailureEpisodes(200);
  // getSuccessRate reads cache (up to 50 most recent). We know 21/35 = 0.6
  results.executionSuccess = {
    getSuccessRateResult: sr50,
    expectedFormula: '21 successes / 35 total episodes = 0.600',
    match: Math.abs(sr50 - 0.600) < 0.001,
    weightInScore: 0.30,
    contributionToRaw: +(sr50 * 0.30).toFixed(4),
  };

  // ══════════════════════════════════════════════════════════════════
  // METRIC 2: lowRetryRate dimension
  // Source: retryRate(50) → Supabase apex_agent_runs (50 most recent)
  // Transformation: failures/total, then Math.max(0, 1 - retryR * 2)
  // Consumer: computeAutonomyScore() → dims.lowRetryRate × 0.15
  // ══════════════════════════════════════════════════════════════════
  const retryR = await am.retryRate(50);
  const { data: supabaseRuns } = await sb
    .from('apex_agent_runs')
    .select('success')
    .order('created_at', { ascending: false })
    .limit(50);
  const sbFailures = (supabaseRuns || []).filter(r => !r.success).length;
  const sbTotal    = (supabaseRuns || []).length;
  const sbRetryR   = sbTotal ? +(sbFailures / sbTotal).toFixed(3) : null;
  const lowRetryRaw = retryR !== null ? Math.max(0, 1 - retryR * 2) : 0.5;

  results.lowRetryRate = {
    retryRateResult: retryR,
    supabaseRaw: { failures: sbFailures, total: sbTotal, rate: sbRetryR },
    match: Math.abs(retryR - sbRetryR) < 0.005,
    transformedDim: +lowRetryRaw.toFixed(3),
    formula: '1 - retryR × 2 = ' + (1 - retryR * 2).toFixed(3),
    weightInScore: 0.15,
    contributionToRaw: +(lowRetryRaw * 0.15).toFixed(4),
  };

  // ══════════════════════════════════════════════════════════════════
  // METRIC 3: recovery dimension
  // Source: getFailureEpisodes(30) → Supabase ILIKE for matching success runs
  // Transformation: matching successes / sample size
  // Consumer: computeAutonomyScore() → dims.recovery × 0.20
  // ══════════════════════════════════════════════════════════════════
  const recoveryR = await am.recoveryRate(30);
  // Manual trace: 14 failures, check top-3 objectives for Supabase matches
  const top3Failures = mem.getFailureEpisodes(3);
  const top3Checks = await Promise.all(top3Failures.map(async ep => {
    const kw = (ep.objective || '').slice(0, 40);
    const { data } = await sb
      .from('apex_agent_runs')
      .select('task_id, objective')
      .ilike('objective', `%${kw}%`)
      .eq('success', true)
      .gt('created_at', ep.timestamp)
      .limit(1);
    return { episodeId: ep.id, kw, matched: !!(data?.length), matchedRun: data?.[0]?.task_id || null };
  }));

  results.recovery = {
    recoveryRateResult: recoveryR,
    expectedRange: '0.05 – 0.15 (1 matching success / 14 failures)',
    top3FailureChecks: top3Checks,
    weightInScore: 0.20,
    contributionToRaw: +(recoveryR * 0.20).toFixed(4),
  };

  // ══════════════════════════════════════════════════════════════════
  // METRIC 4: goalCompletion dimension
  // Source: goal-tracker.getStats() → reads disk, counts completed goals
  // Transformation: completed / total
  // Consumer: computeAutonomyScore() → dims.goalCompletion × 0.20
  // ══════════════════════════════════════════════════════════════════
  const gStats = gt.getStats();
  const manualCompRate = gStats.total > 0 ? +(gStats.completed / gStats.total).toFixed(3) : 0;

  results.goalCompletion = {
    getStatsResult: gStats,
    completionRateFromStats: gStats.completionRate,
    manualVerification: manualCompRate,
    match: Math.abs(gStats.completionRate - manualCompRate) < 0.001,
    expectedValue: '9 completed / 15 total = 0.600',
    weightInScore: 0.20,
    contributionToRaw: +(gStats.completionRate * 0.20).toFixed(4),
  };

  // ══════════════════════════════════════════════════════════════════
  // METRIC 5: confidence dimension
  // Formula: sr*0.5 + epVol*0.2 + goalScore*0.3
  //   sr     = getSuccessRate(20) = last 20 episodes success rate
  //   epVol  = min(1, episodeCount/50)
  //   goalScore = completionRate
  // ══════════════════════════════════════════════════════════════════
  const sr20   = mem.getSuccessRate(20);
  const epVol  = Math.min(1.0, epCnt / 50);
  const conf   = am.executionConfidence();
  const manualConf = +(sr20 * 0.5 + epVol * 0.2 + gStats.completionRate * 0.3).toFixed(3);

  results.confidence = {
    getSuccessRate20: sr20,
    episodeCount: epCnt,
    epVol: +epVol.toFixed(3),
    goalCompRate: gStats.completionRate,
    executionConfidenceResult: conf,
    manualFormula: `${sr20}*0.5 + ${epVol.toFixed(3)}*0.2 + ${gStats.completionRate}*0.3 = ${manualConf}`,
    match: Math.abs(conf - manualConf) < 0.001,
    weightInScore: 0.10,
    contributionToRaw: +(conf * 0.10).toFixed(4),
  };

  // ══════════════════════════════════════════════════════════════════
  // METRIC 6: episodeRichness dimension
  // Formula: min(1, episodeCount / 100)
  // ══════════════════════════════════════════════════════════════════
  const epRich = Math.min(1.0, epCnt / 100);
  results.episodeRichness = {
    episodeCount: epCnt,
    formula: `min(1, ${epCnt}/100) = ${epRich}`,
    expectedValue: 0.35,
    match: Math.abs(epRich - 0.35) < 0.001,
    weightInScore: 0.05,
    contributionToRaw: +(epRich * 0.05).toFixed(4),
  };

  // ══════════════════════════════════════════════════════════════════
  // METRIC 7: Final composite score — manual trace vs computeAutonomyScore()
  // ══════════════════════════════════════════════════════════════════
  const scoreResult = await am.computeAutonomyScore();
  const dims = scoreResult.dimensions;

  const manualRaw =
    dims.executionSuccess * 0.30 +
    dims.lowRetryRate     * 0.15 +
    dims.recovery         * 0.20 +
    dims.goalCompletion   * 0.20 +
    dims.confidence       * 0.10 +
    dims.episodeRichness  * 0.05;
  const manualScore = +(manualRaw * 10).toFixed(2);

  results.compositeScore = {
    computeAutonomyScoreResult: scoreResult.score,
    dimensions: dims,
    manualRaw: +manualRaw.toFixed(4),
    manualScore,
    match: Math.abs(scoreResult.score - manualScore) < 0.01,
    formula: `(${dims.executionSuccess}×0.30 + ${dims.lowRetryRate}×0.15 + ${dims.recovery}×0.20 + ${dims.goalCompletion}×0.20 + ${dims.confidence}×0.10 + ${dims.episodeRichness}×0.05) × 10`,
  };

  // ══════════════════════════════════════════════════════════════════
  // METRIC 8: Adaptation confidence derivation — trace through formula
  // ══════════════════════════════════════════════════════════════════
  const activeAdapts = ae.getActiveAdaptations();
  const adaptTraces = activeAdapts.map(a => {
    const ev = a.evidence || {};
    const sampleSize  = ev.sampleSize  || 0;
    const signalRate  = ev.failureRate !== undefined ? ev.failureRate : 0.5;
    const vol    = Math.min(1.0, sampleSize / 24);
    const signal = Math.min(1.0, Math.abs((signalRate || 0.5) - 0.5) * 2.5);
    const manualConf = +(vol * 0.4 + signal * 0.6).toFixed(3);
    return {
      action: a.action,
      storedConfidence: a.confidence,
      evidenceSampleSize: sampleSize,
      evidenceFailureRate: signalRate,
      vol: +vol.toFixed(3), signal: +signal.toFixed(3),
      manualConf,
      match: Math.abs(a.confidence - manualConf) < 0.01,
    };
  });
  results.adaptationConfidence = adaptTraces;

  // ══════════════════════════════════════════════════════════════════
  // METRIC 9: System evaluation score — read latest eval
  // ══════════════════════════════════════════════════════════════════
  const se = require('./agent-system/self-evaluator');
  const latestEval = se.getLatestEvaluation();
  if (latestEval) {
    const dimWeights = { planningQuality: 0.25, executionQuality: 0.30, recoveryEffectiveness: 0.20, lessonUsefulness: 0.15, adaptationEffectiveness: 0.10 };
    const dims2 = latestEval.dimensions;
    const manualEvalScore = +Object.entries(dimWeights).reduce((s, [k, w]) => s + (dims2[k] || 0) * w, 0).toFixed(4);
    // Self-evaluator returns raw weighted sum × 10
    results.systemEvalScore = {
      latestEvalId: latestEval.id,
      storedScore: latestEval.overallScore,
      dimensions: dims2,
      manualFormula: Object.entries(dimWeights).map(([k,w]) => `${dims2[k]}×${w}`).join(' + '),
      manualRaw: manualEvalScore,
      manualScore: +(manualEvalScore * 10).toFixed(2),
      match: Math.abs(latestEval.overallScore - manualEvalScore * 10) < 0.1,
    };
  } else {
    results.systemEvalScore = { error: 'no evaluation found' };
  }

  // ══════════════════════════════════════════════════════════════════
  // METRIC 10: PQR planning insight confidence derivation
  // ══════════════════════════════════════════════════════════════════
  const insightsResult = pqr.generatePlanningInsights();
  const insights = insightsResult.insights || [];
  results.pqrInsights = {
    insufficient: insightsResult.insufficient || false,
    sampleSize: insightsResult.sampleSize,
    count: insights.length,
    insights: insights.map(i => ({
      insight: i.insight,
      confidence: i.confidence,
      support: i.support,
    })),
  };

  // ══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════
  const metricChecks = [
    { metric: 'executionSuccess', match: results.executionSuccess.match },
    { metric: 'lowRetryRate',     match: results.lowRetryRate.match },
    { metric: 'goalCompletion',   match: results.goalCompletion.match },
    { metric: 'confidence',       match: results.confidence.match },
    { metric: 'episodeRichness',  match: results.episodeRichness.match },
    { metric: 'compositeScore',   match: results.compositeScore.match },
    { metric: 'systemEvalScore',  match: results.systemEvalScore?.match ?? null },
    ...adaptTraces.map(t => ({ metric: `adaptConf/${t.action}`, match: t.match })),
  ];

  results.summary = {
    metricsChecked: metricChecks.length,
    allMatch: metricChecks.filter(m => m.match !== null).every(m => m.match),
    checks: metricChecks,
    autonomyScore: scoreResult.score,
    systemEvalScore: latestEval?.overallScore || null,
  };

  console.log(JSON.stringify(results, null, 2));
}

run().catch(e => console.error('ERR:', e.message));
