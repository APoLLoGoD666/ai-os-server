'use strict';
require('dotenv').config({ path: '.env' });
const mem = require('./agent-system/episodic-memory');
const ref = require('./agent-system/reflection-engine');
const ae  = require('./agent-system/adaptation-engine');
const am  = require('./agent-system/autonomy-metrics');
const pqr = require('./agent-system/planning-quality-registry');
const dyn = require('./agent-system/dynamic-agent-selector');
const fs  = require('fs');

const LESSONS_PATH = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS/01 Executive/Lessons.md';

// Run 3 complete pipeline cycles and measure end-to-end throughput
async function run() {
  const cycles = [];

  for (let c = 0; c < 3; c++) {
    const start = Date.now();
    const step = {};

    // Step 1: Retrieve failures
    let t = Date.now();
    const fails = mem.getFailureEpisodes(20);
    step.retrieveMs = Date.now() - t;

    // Step 2: Reflect
    t = Date.now();
    const analysis = ref.analyzeFailures(fails);
    const perf = ref.buildPerformanceSummary(fails);
    step.reflectMs = Date.now() - t;

    // Step 3: Rank lessons
    t = Date.now();
    const rawLessons = fs.readFileSync(LESSONS_PATH, 'utf8');
    ref.getRankedLessons('developer stage failure', rawLessons, 5);
    step.lessonRankMs = Date.now() - t;

    // Step 4: Adaptation cycle
    t = Date.now();
    const adaptResult = await ae.runCycle();
    step.adaptMs = Date.now() - t;

    // Step 5: Compute autonomy score
    t = Date.now();
    const scoreResult = await am.computeAutonomyScore();
    step.scoreMs = Date.now() - t;

    // Step 6: Dynamic routing
    t = Date.now();
    await dyn.selectAgentConfig({ objective: '[SHADOW] database migration schema', _planComplexity: 'moderate' }, {});
    step.routingMs = Date.now() - t;

    // Step 7: PQR summary
    t = Date.now();
    pqr.getSummary();
    step.pqrMs = Date.now() - t;

    const total = Date.now() - start;
    cycles.push({
      cycle: c,
      steps: step,
      totalMs: total,
      failCount: fails.length,
      topStage: analysis.topStage?.stage,
      adaptActive: adaptResult?.totalActive,
      score: scoreResult.score,
    });
  }

  // Summary stats
  const totals = cycles.map(c => c.totalMs);
  const scores = cycles.map(c => c.score);
  const stepNames = Object.keys(cycles[0].steps);
  const stepAvg = {};
  for (const s of stepNames) {
    stepAvg[s] = +(cycles.map(c => c.steps[s]).reduce((a,b)=>a+b,0)/cycles.length).toFixed(1);
  }

  console.log(JSON.stringify({
    cycles,
    summary: {
      cycles: cycles.length,
      minTotalMs: Math.min(...totals),
      maxTotalMs: Math.max(...totals),
      avgTotalMs: +(totals.reduce((a,b)=>a+b,0)/totals.length).toFixed(1),
      scoreRange: { min: Math.min(...scores), max: Math.max(...scores) },
      stepAvgMs: stepAvg,
    }
  }, null, 2));
}
run().catch(e => console.error('ERR:', e.message));
