'use strict';
require('dotenv').config({ path: '.env' });
const ae  = require('./agent-system/adaptation-engine');
const mem = require('./agent-system/episodic-memory');
const ref = require('./agent-system/reflection-engine');

async function timeIt(label, fn) {
  const t = Date.now();
  const r = await fn();
  const ms = Date.now() - t;
  return { label, ms, result: r };
}

async function run() {
  const results = {};

  // Pre-run state
  results.preCycleAdaptations = ae.getActiveAdaptations().length;

  // Run 3 adaptation cycles and measure
  const cycleResults = [];
  for (let i = 0; i < 3; i++) {
    const r = await timeIt('runCycle-' + i, () => ae.runCycle());
    cycleResults.push({
      cycle: i,
      ms: r.ms,
      totalActive: r.result?.totalActive,
      newThisCycle: r.result?.newThisCycle,
      byType: r.result?.byType,
      avgConfidence: r.result?.avgConfidence,
    });
    // Small delay to ensure registry write completes
    await new Promise(res => setTimeout(res, 50));
  }
  results.cycleResults = cycleResults;

  // Post-run state
  const active = ae.getActiveAdaptations();
  results.postCycleAdaptations = active.length;
  results.activeAdaptationSummary = active.map(a => ({
    id: a.id, type: a.type, action: a.action, confidence: a.confidence,
    expiresAt: a.expiresAt, appliedCount: a.appliedCount,
  }));

  // Test getRecommendationsFor across stages
  const stages = ['DEVELOPER', 'REVIEWER', 'VALIDATOR', 'COMMITTER', 'ARCHITECT'];
  const recResults = [];
  for (const stage of stages) {
    const t = Date.now();
    const recs = ae.getRecommendationsFor(stage, { category: 'api' });
    const ms = Date.now() - t;
    recResults.push({ stage, count: recs.length, ms, topAction: recs[0]?.action || null });
  }
  results.recommendationsByStage = recResults;

  // Test formatRecsAsContext
  const recs = ae.getRecommendationsFor('DEVELOPER', {});
  const t2 = Date.now();
  const ctx = ae.formatRecsAsContext(recs);
  const ctxMs = Date.now() - t2;
  results.formatRecsAsContextMs = ctxMs;
  results.formatRecsAsContextLength = ctx.length;
  results.formatRecsAsContextSnip = ctx.slice(0, 100);

  // Test getSnapshot
  const t3 = Date.now();
  const snap = ae.getSnapshot();
  const snapMs = Date.now() - t3;
  results.getSnapshotMs = snapMs;
  results.snapshotKeys = Object.keys(snap || {});

  // Test recordApplication on the active adaptation
  if (active.length > 0) {
    const t4 = Date.now();
    ae.recordApplication(active[0].id, true); // success application
    const recMs = Date.now() - t4;
    results.recordApplicationMs = recMs;

    // Check appliedCount incremented
    const after = ae.getActiveAdaptations();
    results.appliedCountAfter = after[0]?.appliedCount;
    results.successCountAfter = after[0]?.successCount;
  }

  console.log(JSON.stringify(results, null, 2));
}
run().catch(e => console.error('ERR:', e.message));
