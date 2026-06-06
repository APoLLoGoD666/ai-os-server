'use strict';
require('dotenv').config({ path: '.env' });
const mem  = require('./agent-system/episodic-memory');
const gt   = require('./agent-system/goal-tracker');
const ref  = require('./agent-system/reflection-engine');
const am   = require('./agent-system/autonomy-metrics');
const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const LESSONS_PATH = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS/01 Executive/Lessons.md';

const results = { retrieval: [] };

async function timeIt(label, fn) {
  const t = Date.now();
  const r = await fn();
  const ms = Date.now() - t;
  return { label, ms, result: r };
}

async function run() {
  // RETRIEVAL CYCLE 1 — 8 retrieval queries

  // 1. Episode count
  const r1 = await timeIt('episodeCount', () => mem.episodeCount());
  results.retrieval.push({ ...r1, result: r1.result });

  // 2. getFailureEpisodes
  const r2 = await timeIt('getFailureEpisodes(20)', () => mem.getFailureEpisodes(20));
  results.retrieval.push({ ...r2, result: r2.result.length });

  // 3. getSimilarExperiences — auth topic
  const r3 = await timeIt('getSimilarExp(auth)', () => mem.getSimilarExperiences('authentication rbac role access control', { limit:5 }));
  results.retrieval.push({ ...r3, result: r3.result.map(e => ({ id:e.id, rel:e._relevance })) });

  // 4. getSimilarExperiences — infra/ops
  const r4 = await timeIt('getSimilarExp(ops)', () => mem.getSimilarExperiences('backup cron deploy health monitor', { limit:5 }));
  results.retrieval.push({ ...r4, result: r4.result.map(e => ({ id:e.id, rel:e._relevance })) });

  // 5. getSimilarExperiences — database/schema
  const r5 = await timeIt('getSimilarExp(db)', () => mem.getSimilarExperiences('postgres database migration schema index', { limit:5 }));
  results.retrieval.push({ ...r5, result: r5.result.map(e => ({ id:e.id, rel:e._relevance })) });

  // 6. Goal stats
  const r6 = await timeIt('goalStats', () => gt.getStats());
  results.retrieval.push({ ...r6, result: r6.result });

  // 7. Lesson ranking — auth
  const rawLessons = fs.readFileSync(LESSONS_PATH, 'utf8');
  const r7 = await timeIt('getRankedLessons(auth)', () => ref.getRankedLessons('authentication security rbac token', rawLessons, 5));
  const sections7 = r7.result.split(/\n---\n/).filter(Boolean);
  results.retrieval.push({ ...r7, result: { sections: sections7.length, top: sections7[0]?.slice(0,80) } });

  // 8. Supabase apex_agent_runs — recent shadow runs
  const r8 = await timeIt('sbAgentRuns(shadow)', async () => {
    const { data, error } = await sb.from('apex_agent_runs').select('task_id, success, cost_usd, complexity').ilike('task_id', 'shadow-run-%').limit(20);
    return { count: data?.length, error: error?.message || null };
  });
  results.retrieval.push({ ...r8, result: r8.result });

  // RETRIEVAL CYCLE 2 — 5 more queries to measure repeat latency
  const cycle2 = [];
  for (let i = 0; i < 5; i++) {
    const rc = await timeIt('repFails-c2-' + i, () => mem.getFailureEpisodes(20));
    cycle2.push(rc.ms);
  }
  results.cycle2RepeatMs = cycle2;
  results.cycle2AvgMs = +(cycle2.reduce((a,b)=>a+b,0)/cycle2.length).toFixed(1);

  // RETRIEVAL CYCLE 3 — success rate convergence check
  const srResults = [];
  for (const n of [5, 10, 20, 35]) {
    const r = await timeIt('getSuccessRate(' + n + ')', () => mem.getSuccessRate(n));
    srResults.push({ n, sr: r.result, ms: r.ms });
  }
  results.successRateByN = srResults;

  console.log(JSON.stringify(results, null, 2));
}
run().catch(e => console.error('ERR:', e.message));
