'use strict';
require('dotenv').config({ path: '.env' });
const ae  = require('./agent-system/adaptation-engine');
const mem = require('./agent-system/episodic-memory');
const ref = require('./agent-system/reflection-engine');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const results = {};

  // 1. Document all active adaptations and their trigger conditions
  const active = ae.getActiveAdaptations();
  results.activeAdaptations = active.map(a => ({
    id: a.id, type: a.type, action: a.action,
    confidence: a.confidence, params: a.params,
    evidence: a.evidence, createdAt: a.createdAt,
    expiresAt: a.expiresAt, appliedCount: a.appliedCount, successCount: a.successCount,
  }));

  // 2. Verify trigger conditions: what data produced each adaptation?
  const fails = mem.getFailureEpisodes(20);
  const analysis = ref.analyzeFailures(fails);
  const perf = ref.buildPerformanceSummary(fails);

  results.triggerEvidence = {
    failureCount: fails.length,
    topStage: analysis.topStage,
    patterns: analysis.patterns,
    successRate: perf.successRate,
    total: perf.total,
  };

  // 3. Verify each adaptation's trigger condition was actually met
  // Adaptation 1: enable_simulation_before_execution
  //   Condition: total >= 5 AND successRate < 0.3
  results.simBeforeExecTrigger = {
    condition: 'total >= 5 AND successRate < 0.3',
    totalActual: perf.total,
    srActual: perf.successRate,
    conditionMet: perf.total >= 5 && (perf.successRate === null || perf.successRate < 0.3),
  };

  // Adaptation 2: split_large_tasks
  //   Condition: devFails >= 4 AND confidence >= MIN_CONF
  const devFails = analysis.patterns.find(p => p.stage === 'DEVELOPER')?.count || 0;
  const sampleSize = fails.length;
  const signalRate = devFails / Math.max(sampleSize, 1);
  const vol = Math.min(1, sampleSize / 24);
  const signal = Math.min(1, Math.abs(signalRate - 0.5) * 2.5);
  const confidence = vol * 0.4 + signal * 0.6;
  results.splitLargeTasksTrigger = {
    condition: 'devFails >= 4 AND confidence >= MIN_CONF(0.25)',
    devFailsActual: devFails,
    sampleSize,
    signalRate: +signalRate.toFixed(3),
    vol: +vol.toFixed(3),
    signal: +signal.toFixed(3),
    confidence: +confidence.toFixed(3),
    conditionMet: devFails >= 4 && confidence >= 0.25,
  };

  // Adaptation 3: increase_max_retries
  //   Must be from a different condition — let's check adaptation engine source
  results.increaseMaxRetriesTrigger = {
    action: 'increase_max_retries',
    type: 'retry_strategy',
    evidence: active.find(a => a.action === 'increase_max_retries')?.evidence || null,
  };

  // 4. Test getRecommendationsFor — does it surface correct adaptations?
  const devRecs = ae.getRecommendationsFor('DEVELOPER', {});
  const reviewerRecs = ae.getRecommendationsFor('REVIEWER', {});
  results.devrecs = devRecs.map(r => ({ action: r.action, confidence: r.confidence, type: r.type }));
  results.reviewerRecs = reviewerRecs.map(r => ({ action: r.action, confidence: r.confidence }));

  // 5. Simulate "applied successfully" for each adaptation and check learn()
  for (const a of active) {
    ae.recordApplication(a.id, true);
  }
  const afterApply = ae.getActiveAdaptations();
  results.afterApplyState = afterApply.map(a => ({
    id: a.id, action: a.action,
    appliedCount: a.appliedCount, successCount: a.successCount,
  }));

  // 6. Test confidence evolution: verify that repeated runCycle produces stable confidence
  const confidences = [];
  for (let i = 0; i < 4; i++) {
    const r = await ae.runCycle();
    const acts = ae.getActiveAdaptations();
    confidences.push({
      cycle: i,
      totalActive: r.totalActive,
      avgConf: r.avgConfidence,
      simConf: acts.find(a => a.action === 'enable_simulation_before_execution')?.confidence,
      splitConf: acts.find(a => a.action === 'split_large_tasks')?.confidence,
      retryConf: acts.find(a => a.action === 'increase_max_retries')?.confidence,
    });
    await new Promise(res => setTimeout(res, 30));
  }
  results.confidenceEvolution = confidences;

  // 7. Test adaptation correlation with task outcomes
  // Add a "recovered" run that matches one of the shadow failure objectives
  const TAG = 'adapt-eff-' + Date.now().toString(36);
  await sb.from('apex_agent_runs').insert([{
    task_id: TAG + '-recovery',
    objective: '[SHADOW] Migrate sessions from Redis to Postgres with zero downtime',
    success: true,
    cost_usd: 0.088,
    complexity: 'critical',
    created_at: new Date().toISOString(),
  }]);

  // Check if recovery rate changes
  const am = require('./agent-system/autonomy-metrics');
  const rrBefore = await am.recoveryRate();
  results.recoveryBeforeTag = rrBefore;

  // Run a score to see if recovery dimension moves
  const scoreBefore = await am.computeAutonomyScore();
  results.scoreBeforeRecovery = { score: scoreBefore.score, recovery: scoreBefore.dimensions.recovery };

  await sb.from('apex_agent_runs').delete().eq('task_id', TAG + '-recovery');
  const scoreAfter = await am.computeAutonomyScore();
  results.scoreAfterCleanup = { score: scoreAfter.score, recovery: scoreAfter.dimensions.recovery };
  results.recoveryMovedOnAdd = scoreBefore.dimensions.recovery > scoreAfter.dimensions.recovery;

  console.log(JSON.stringify(results, null, 2));
}
run().catch(e => console.error('ERR:', e.message));
