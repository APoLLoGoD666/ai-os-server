'use strict';
require('dotenv').config({ path: '.env' });
const mac = require('./agent-system/multi-agent-coordinator');
const dyn = require('./agent-system/dynamic-agent-selector');
const am  = require('./agent-system/autonomy-metrics');

async function timeIt(label, fn) {
  const t = Date.now();
  const r = await fn();
  const ms = Date.now() - t;
  return { label, ms, result: r };
}

async function run() {
  const results = {};

  // 1. assignWork in simulate mode — 5 different goals
  const goals = [
    '[SHADOW] Implement rate limiting middleware with Redis sliding window',
    '[SHADOW] Set up Supabase RLS policies for multi-tenant data isolation',
    '[SHADOW] Build auth token refresh flow with rotation and revocation',
    '[SHADOW] Create monitoring dashboard for agent pipeline metrics',
    '[SHADOW] Deploy webhook receiver with signature validation and retry queue',
  ];

  const simResults = [];
  for (const goal of goals) {
    const r = await timeIt('assignWork(simulate)', () => mac.assignWork(goal, { simulate: true, maxSubtasks: 3 }));
    simResults.push({
      goal: goal.slice(0, 50),
      ms: r.ms,
      simulated: r.result?.simulated,
      wouldRun: r.result?.wouldRun,
      estimatedCost: r.result?.estimatedCost,
      specCount: r.result?.specs?.length,
    });
  }
  results.simulatedWorkloads = simResults;
  results.simulateAvgMs = +(simResults.map(r=>r.ms).reduce((a,b)=>a+b,0)/simResults.length).toFixed(1);

  // 2. selectAgentConfig — measure dynamic routing for different specs
  const specs = [
    { objective: '[SHADOW] Implement two-factor authentication via TOTP', _planComplexity: 'moderate', _planRisk: 0.7 },
    { objective: '[SHADOW] Build real-time dashboard widget for active user count', _planComplexity: 'moderate', _planRisk: 0.4 },
    { objective: '[SHADOW] Migrate sessions from Redis to Postgres', _planComplexity: 'complex', _planRisk: 0.9 },
    { objective: '[SHADOW] Deploy health check endpoint', _planComplexity: 'simple', _planRisk: 0.1 },
    { objective: '[SHADOW] Refactor agent orchestrator for parallel execution', _planComplexity: 'critical', _planRisk: 0.85 },
  ];

  const configResults = [];
  for (const spec of specs) {
    const r = await timeIt('selectAgentConfig', () => dyn.selectAgentConfig(spec, {
      baseComplexity: spec._planComplexity, riskScore: spec._planRisk
    }));
    configResults.push({
      obj: spec.objective.slice(30, 60),
      ms: r.ms,
      tier: r.result?.tier,
      category: r.result?.category,
      escalated: r.result?.escalated,
      rationale: r.result?.rationale?.slice(0, 60),
    });
  }
  results.agentConfigs = configResults;
  results.agentConfigAvgMs = +(configResults.map(r=>r.ms).reduce((a,b)=>a+b,0)/configResults.length).toFixed(1);

  // 3. getCategoryStats — shadow corpus category analysis
  const categories = ['auth', 'database', 'api', 'ops', 'frontend', 'agent', 'general'];
  const catStats = [];
  for (const cat of categories) {
    const r = await timeIt('getCategoryStats(' + cat + ')', () => dyn.getCategoryStats(cat, 50));
    catStats.push({ category: cat, ms: r.ms, sampleSize: r.result?.sampleSize, successRate: r.result?.successRate });
  }
  results.categoryStats = catStats;
  results.categoryStatsAvgMs = +(catStats.map(r=>r.ms).reduce((a,b)=>a+b,0)/catStats.length).toFixed(1);

  // 4. getReputationStats
  const repR = await timeIt('getReputationStats', () => mac.getReputationStats(50));
  results.reputationStats = { ms: repR.ms, tiers: repR.result ? Object.keys(repR.result) : null, data: repR.result };

  // 5. Post-workload autonomy score
  const scoreR = await timeIt('computeAutonomyScore', () => am.computeAutonomyScore());
  results.postWorkloadScore = scoreR.result.score;
  results.postWorkloadDims = scoreR.result.dimensions;
  results.postWorkloadScoreMs = scoreR.ms;

  console.log(JSON.stringify(results, null, 2));
}
run().catch(e => console.error('ERR:', e.message));
