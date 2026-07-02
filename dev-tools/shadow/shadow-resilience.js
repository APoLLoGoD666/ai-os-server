'use strict';
require('dotenv').config({ path: '.env' });
const fs   = require('fs');
const path = require('path');
const mem  = require('./agent-system/episodic-memory');
const ref  = require('./agent-system/reflection-engine');
const ae   = require('./agent-system/adaptation-engine');
const am   = require('./agent-system/autonomy-metrics');
const pqr  = require('./agent-system/planning-quality-registry');

const VAULT        = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
const EPISODES_DIR = path.join(VAULT, '12 Memory', 'Episodes');
const GOALS_DIR    = path.join(VAULT, 'System', 'Goals');
const ADAPT_REG    = path.join(VAULT, 'System', 'Adaptations', 'adaptation-registry.json');
const LESSONS_PATH = path.join(VAULT, '01 Executive', 'Lessons.md');

// ── Helpers ───────────────────────────────────────────────────────────────────

function countFiles(dir, prefix, ext) {
  try { return fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith(ext)).length; }
  catch { return -1; }
}

function loadRegistry() {
  try { return JSON.parse(fs.readFileSync(ADAPT_REG, 'utf8')); }
  catch { return null; }
}

function registryChecksum(reg) {
  if (!reg) return null;
  return {
    version: reg.version,
    totalActive: reg.totalActive,
    adaptationIds: (reg.adaptations || []).map(a => a.id).sort().join('|'),
    confidences: (reg.adaptations || []).map(a => a.confidence).join('|'),
  };
}

async function oneFullCycle() {
  const t0 = Date.now();
  const fails  = mem.getFailureEpisodes(20);
  const analysis = ref.analyzeFailures(fails);
  const raw    = fs.readFileSync(LESSONS_PATH, 'utf8');
  ref.getRankedLessons('developer stage failure', raw, 5);
  const adapt  = await ae.runCycle();
  const score  = await am.computeAutonomyScore();
  pqr.getSummary();
  return {
    ms: Date.now() - t0,
    failCount: fails.length,
    topStage: analysis.topStage?.stage,
    adaptActive: adapt?.totalActive,
    score: score.score,
  };
}

async function run() {
  const results = {};

  // ══════════════════════════════════════════════════════════════════
  // TEST 1: Storage stability — episode count before 10 cycles
  // ══════════════════════════════════════════════════════════════════
  const epBefore = countFiles(EPISODES_DIR, 'ep-', '.json');
  const goalsBefore = countFiles(GOALS_DIR, 'goal-', '.json');
  const regBefore = registryChecksum(loadRegistry());

  results.storage_before = { episodes: epBefore, goals: goalsBefore, registry: regBefore };

  // ══════════════════════════════════════════════════════════════════
  // TEST 2: 10 sustained full pipeline cycles
  // ══════════════════════════════════════════════════════════════════
  const cycles = [];
  const errors = [];

  for (let i = 0; i < 10; i++) {
    try {
      const c = await oneFullCycle();
      cycles.push({ cycle: i, ...c });
    } catch (e) {
      errors.push({ cycle: i, message: e.message, stack: e.stack?.slice(0, 200) });
    }
  }

  results.cycles = cycles;
  results.cycle_errors = errors;

  // ══════════════════════════════════════════════════════════════════
  // TEST 3: Storage stability — episode count after 10 cycles
  // ══════════════════════════════════════════════════════════════════
  const epAfter = countFiles(EPISODES_DIR, 'ep-', '.json');
  const goalsAfter = countFiles(GOALS_DIR, 'goal-', '.json');
  const regAfter = registryChecksum(loadRegistry());

  results.storage_after = { episodes: epAfter, goals: goalsAfter, registry: regAfter };

  results.storage_stable = {
    episodesUnchanged: epBefore === epAfter,
    goalsUnchanged: goalsBefore === goalsAfter,
    registryVersionUnchanged: regBefore?.version === regAfter?.version,
    registryActiveUnchanged: regBefore?.totalActive === regAfter?.totalActive,
  };

  // ══════════════════════════════════════════════════════════════════
  // TEST 4: Score determinism — 3 independent score computations
  // ══════════════════════════════════════════════════════════════════
  const scores = [];
  for (let i = 0; i < 3; i++) {
    const s = await am.computeAutonomyScore();
    scores.push(s.score);
  }
  results.score_determinism = {
    scores,
    allEqual: scores.every(s => s === scores[0]),
    variance: Math.max(...scores) - Math.min(...scores),
  };

  // ══════════════════════════════════════════════════════════════════
  // TEST 5: Retrieval degradation — same query 5× in a row
  // ══════════════════════════════════════════════════════════════════
  const QUERY = 'Redis migration database timeout failure';
  const retrievalLatencies = [];
  const retrievalRelevances = [];
  for (let i = 0; i < 5; i++) {
    const t = Date.now();
    const res = mem.getSimilarExperiences(QUERY, { limit: 5 });
    retrievalLatencies.push(Date.now() - t);
    retrievalRelevances.push(res[0]?._relevance || 0);
  }
  results.retrieval_stability = {
    query: QUERY,
    latenciesMs: retrievalLatencies,
    avgLatencyMs: +(retrievalLatencies.reduce((a,b)=>a+b,0)/retrievalLatencies.length).toFixed(1),
    relevances: retrievalRelevances,
    allSameRelevance: retrievalRelevances.every(r => r === retrievalRelevances[0]),
    maxLatencyMs: Math.max(...retrievalLatencies),
  };

  // ══════════════════════════════════════════════════════════════════
  // TEST 6: Adaptation registry corruption check — 5 runCycle calls
  //         Verify registry is not corrupted by repeated cycles
  // ══════════════════════════════════════════════════════════════════
  const registrySnapshots = [];
  for (let i = 0; i < 5; i++) {
    await ae.runCycle();
    const reg = loadRegistry();
    registrySnapshots.push({
      i,
      totalActive: reg?.totalActive,
      count: reg?.adaptations?.length,
      ids: (reg?.adaptations || []).map(a => a.id).sort().join('|'),
    });
    await new Promise(r => setTimeout(r, 20));
  }

  const firstSnapshot = registrySnapshots[0];
  const registryCorrupted = registrySnapshots.some(s =>
    s.totalActive !== firstSnapshot.totalActive ||
    s.count !== firstSnapshot.count
  );
  // IDs may regenerate (adaptation-engine is idempotent but generates new IDs each cycle)
  results.registry_stability = {
    snapshots: registrySnapshots,
    activeCountStable: !registryCorrupted,
    activeCountRange: {
      min: Math.min(...registrySnapshots.map(s => s.totalActive)),
      max: Math.max(...registrySnapshots.map(s => s.totalActive)),
    },
  };

  // ══════════════════════════════════════════════════════════════════
  // TEST 7: PQR registry growth check — repeated getSummary
  // ══════════════════════════════════════════════════════════════════
  const pqrBefore = pqr.getSummary();
  // Create 3 more plans and record outcomes
  for (let i = 0; i < 3; i++) {
    const id = pqr.createPlanRecord({ objective: `[RESILIENCE] Test plan ${i}`, complexity: 'moderate', steps: 3, parallelGroups: 1 });
    pqr.recordPlanOutcome(id, { success: i % 2 === 0, stepsCompleted: 3, totalSteps: 3, retryCount: 0 });
  }
  const pqrAfter = pqr.getSummary();
  results.pqr_growth = {
    before: { totalPlans: pqrBefore.totalPlans },
    after:  { totalPlans: pqrAfter.totalPlans },
    grew: pqrAfter.totalPlans > pqrBefore.totalPlans,
    delta: pqrAfter.totalPlans - pqrBefore.totalPlans,
  };

  // ══════════════════════════════════════════════════════════════════
  // TEST 8: Performance drift — first vs last 5 cycles
  // ══════════════════════════════════════════════════════════════════
  const firstFive = cycles.slice(0, 5).map(c => c.ms);
  const lastFive  = cycles.slice(5, 10).map(c => c.ms);
  const avgFirst  = firstFive.length ? firstFive.reduce((a,b)=>a+b,0)/firstFive.length : 0;
  const avgLast   = lastFive.length  ? lastFive.reduce((a,b)=>a+b,0)/lastFive.length   : 0;

  results.performance_drift = {
    avgFirstFiveMs: +avgFirst.toFixed(1),
    avgLastFiveMs:  +avgLast.toFixed(1),
    driftMs:        +(avgLast - avgFirst).toFixed(1),
    driftPct:       avgFirst > 0 ? +((avgLast - avgFirst) / avgFirst * 100).toFixed(1) : null,
    allCycleMs: cycles.map(c => c.ms),
  };

  // ══════════════════════════════════════════════════════════════════
  // TEST 9: Error boundary — call with bad/null inputs
  // ══════════════════════════════════════════════════════════════════
  const boundaryTests = [];

  try {
    const r1 = mem.getSimilarExperiences(null);
    boundaryTests.push({ test: 'getSimilarExperiences(null)', result: Array.isArray(r1) ? 'ok:[]' : 'unexpected', threw: false });
  } catch (e) { boundaryTests.push({ test: 'getSimilarExperiences(null)', threw: true, error: e.message }); }

  try {
    const r2 = mem.getFailureEpisodes(0);
    boundaryTests.push({ test: 'getFailureEpisodes(0)', result: Array.isArray(r2) ? `ok:length=${r2.length}` : 'unexpected', threw: false });
  } catch (e) { boundaryTests.push({ test: 'getFailureEpisodes(0)', threw: true, error: e.message }); }

  try {
    const r3 = ref.analyzeFailures([]);
    boundaryTests.push({ test: 'analyzeFailures([])', result: typeof r3 === 'object' ? 'ok:object' : 'unexpected', threw: false });
  } catch (e) { boundaryTests.push({ test: 'analyzeFailures([])', threw: true, error: e.message }); }

  try {
    const r4 = ref.buildPerformanceSummary([]);
    boundaryTests.push({ test: 'buildPerformanceSummary([])', result: typeof r4 === 'object' ? 'ok:object' : 'unexpected', threw: false });
  } catch (e) { boundaryTests.push({ test: 'buildPerformanceSummary([])', threw: true, error: e.message }); }

  try {
    const r5 = ae.getActiveAdaptations();
    boundaryTests.push({ test: 'getActiveAdaptations()', result: Array.isArray(r5) ? `ok:length=${r5.length}` : 'unexpected', threw: false });
  } catch (e) { boundaryTests.push({ test: 'getActiveAdaptations()', threw: true, error: e.message }); }

  try {
    const r6 = ae.getRecommendationsFor(null, null);
    boundaryTests.push({ test: 'getRecommendationsFor(null,null)', result: Array.isArray(r6) ? 'ok:[]' : 'unexpected', threw: false });
  } catch (e) { boundaryTests.push({ test: 'getRecommendationsFor(null,null)', threw: true, error: e.message }); }

  results.boundary_tests = boundaryTests;

  // ══════════════════════════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════════════════════════
  const cycleMs = cycles.map(c => c.ms);
  const scores_extracted = cycles.map(c => c.score);

  results.summary = {
    totalCycles: cycles.length,
    cycleErrors: errors.length,
    avgCycleMs: cycleMs.length ? +(cycleMs.reduce((a,b)=>a+b,0)/cycleMs.length).toFixed(1) : null,
    minCycleMs: cycleMs.length ? Math.min(...cycleMs) : null,
    maxCycleMs: cycleMs.length ? Math.max(...cycleMs) : null,
    scoreRange: scores_extracted.length ? { min: Math.min(...scores_extracted), max: Math.max(...scores_extracted) } : null,
    scoreDrift: scores_extracted.length >= 2 ? +(scores_extracted[scores_extracted.length-1] - scores_extracted[0]).toFixed(3) : 0,
    storageStable: Object.values(results.storage_stable || {}).every(Boolean),
    registryActive: results.registry_stability?.activeCountStable,
    boundaryErrors: boundaryTests.filter(t => t.threw).length,
  };

  console.log(JSON.stringify(results, null, 2));
}

run().catch(e => console.error('ERR:', e.message));
