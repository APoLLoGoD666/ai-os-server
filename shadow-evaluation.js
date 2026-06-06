'use strict';
require('dotenv').config({ path: '.env' });
const se  = require('./agent-system/self-evaluator');
const pqr = require('./agent-system/planning-quality-registry');

async function timeIt(label, fn) {
  const t = Date.now();
  const r = await fn();
  const ms = Date.now() - t;
  return { label, ms, result: r };
}

async function run() {
  const results = {};

  // 1. generateSystemEvaluation — run once, measure
  const r1 = await timeIt('generateSystemEvaluation', () => se.generateSystemEvaluation());
  results.evalGenMs = r1.ms;
  results.evalScore = r1.result?.overallScore;
  results.evalDims = r1.result?.dimensions;
  results.evalWeaknesses = r1.result?.weaknesses;
  results.evalRecommendations = r1.result?.recommendations?.length;
  results.evalId = r1.result?.id;

  // 2. getLatestEvaluation — should now return the just-generated eval
  const r2 = await timeIt('getLatestEvaluation', () => se.getLatestEvaluation());
  results.latestEvalMs = r2.ms;
  results.latestEvalId = r2.result?.id;
  results.latestEvalScore = r2.result?.overallScore;
  results.latestMatchesGenerated = r2.result?.id === r1.result?.id;

  // 3. PQR shadow workload — create 5 plan records and record outcomes
  const planIds = [];
  const planTimings = [];

  const planTemplates = [
    { goal:'[SHADOW] Implement rate limiting', type:'normal', steps:6, files:3, complexity:'moderate', category:'api' },
    { goal:'[SHADOW] Migrate sessions Postgres', type:'split', steps:18, files:7, complexity:'critical', category:'database' },
    { goal:'[SHADOW] Build auth RBAC system', type:'normal', steps:9, files:4, complexity:'complex', category:'auth' },
    { goal:'[SHADOW] Add backup cron pipeline', type:'normal', steps:5, files:2, complexity:'moderate', category:'ops' },
    { goal:'[SHADOW] Deploy real-time widget', type:'normal', steps:7, files:4, complexity:'moderate', category:'frontend' },
  ];

  for (const tmpl of planTemplates) {
    const t = Date.now();
    const rec = pqr.createPlanRecord({
      goal: tmpl.goal, type: tmpl.type, steps: Array(tmpl.steps).fill({}),
      files: Array(tmpl.files).fill('f'), complexity: tmpl.complexity, category: tmpl.category,
    });
    planIds.push(rec?.planId);
    planTimings.push(Date.now() - t);
  }
  results.createPlanRecordTimings = planTimings;
  results.createPlanRecordAvgMs = +(planTimings.reduce((a,b)=>a+b,0)/planTimings.length).toFixed(1);

  // Record outcomes (mix of success/failure)
  const outcomes = [
    { outcome:'success', sr:1.0, cost:0.023 },
    { outcome:'failed',  sr:0.0, cost:0.091, patterns:['DEVELOPER timeout'] },
    { outcome:'success', sr:1.0, cost:0.055 },
    { outcome:'success', sr:1.0, cost:0.019 },
    { outcome:'failed',  sr:0.0, cost:0.042, patterns:['WebSocket memory spike'] },
  ];
  const outTimings = [];
  for (let i = 0; i < planIds.length; i++) {
    const t = Date.now();
    pqr.recordPlanOutcome({ planId: planIds[i], ...outcomes[i] });
    outTimings.push(Date.now() - t);
  }
  results.recordOutcomeTimings = outTimings;
  results.recordOutcomeAvgMs = +(outTimings.reduce((a,b)=>a+b,0)/outTimings.length).toFixed(1);

  // Post-workload PQR state
  const summary = pqr.getSummary();
  results.pqrSummaryAfter = summary;

  // generatePlanningInsights after shadow plans
  const t4 = Date.now();
  const insights = pqr.generatePlanningInsights();
  results.planInsightsMs = Date.now() - t4;
  results.planInsightsCount = insights?.insightCount;
  results.planInsights = insights?.insights?.map(i => ({ type:i.type, action:i.action, confidence:i.confidence }));

  console.log(JSON.stringify(results, null, 2));
}
run().catch(e => console.error('ERR:', e.message));
