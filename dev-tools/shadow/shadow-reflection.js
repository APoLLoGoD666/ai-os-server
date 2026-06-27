'use strict';
require('dotenv').config({ path: '.env' });
const ref = require('./agent-system/reflection-engine');
const mem = require('./agent-system/episodic-memory');
const fs  = require('fs');

const LESSONS_PATH = 'C:/Users/arwwo/Desktop/AI Scripts/APEX AI OS/01 Executive/Lessons.md';

async function timeIt(label, fn) {
  const t = Date.now();
  const r = await fn();
  const ms = Date.now() - t;
  return { label, ms, result: r };
}

async function run() {
  const results = {};
  const fails = mem.getFailureEpisodes(20);
  const all   = mem.getFailureEpisodes(50); // all episodes via same API

  // Cycle 1: analyzeFailures
  const timings = [];
  let lastAnalysis;
  for (let i = 0; i < 5; i++) {
    const r = await timeIt('analyzeFailures-c' + i, () => ref.analyzeFailures(fails));
    timings.push(r.ms);
    lastAnalysis = r.result;
  }
  results.analyzeFailuresCycles = 5;
  results.analyzeFailuresTimings = timings;
  results.analyzeFailuresAvgMs = +(timings.reduce((a,b)=>a+b,0)/timings.length).toFixed(1);
  results.analyzeFailuresResult = lastAnalysis;

  // Cycle 2: buildPerformanceSummary — 5 runs
  const perfTimings = [];
  let lastPerf;
  for (let i = 0; i < 5; i++) {
    const r = await timeIt('buildPerfSummary-c' + i, () => ref.buildPerformanceSummary(fails));
    perfTimings.push(r.ms);
    lastPerf = r.result;
  }
  results.buildPerfSummaryCycles = 5;
  results.buildPerfSummaryTimings = perfTimings;
  results.buildPerfSummaryAvgMs = +(perfTimings.reduce((a,b)=>a+b,0)/perfTimings.length).toFixed(1);
  results.buildPerfSummaryResult = lastPerf;

  // Cycle 3: scoreLessonText — multiple lessons
  const rawLessons = fs.readFileSync(LESSONS_PATH, 'utf8');
  const sections = rawLessons.split(/\n---\n/).filter(Boolean);
  const scoreTimings = [];
  const scores = [];
  for (const sec of sections.slice(3, 9)) { // 6 content sections
    const t = Date.now();
    const s = ref.scoreLessonText(sec, { ageDays: 2 });
    scoreTimings.push(Date.now() - t);
    scores.push({ composite: s.composite, confidence: s.confidence, actionScore: s.actionScore });
  }
  results.scoreLessonTextSamples = scores.length;
  results.scoreLessonTextTimings = scoreTimings;
  results.scoreLessonTextAvgMs = +(scoreTimings.reduce((a,b)=>a+b,0)/scoreTimings.length).toFixed(1);
  results.scoreLessonTextRange = { min: Math.min(...scores.map(s=>s.composite)).toFixed(3), max: Math.max(...scores.map(s=>s.composite)).toFixed(3) };

  // Cycle 4: getRankedLessons with different objectives
  const queries = [
    'authentication rbac role permission token',
    'database migration postgres schema',
    'developer stage failure code quality review',
    'websocket real-time streaming connection',
    'deploy backup cron monitoring health',
  ];
  const rankTimings = [];
  const rankResults = [];
  for (const q of queries) {
    const t = Date.now();
    const ranked = ref.getRankedLessons(q, rawLessons, 8);
    const ms = Date.now() - t;
    rankTimings.push(ms);
    const secs = ranked.split(/\n---\n/).filter(Boolean);
    rankResults.push({ query: q.slice(0,30), sections: secs.length, topSnip: secs[0]?.slice(0,60) });
  }
  results.getRankedLessonsCycles = queries.length;
  results.getRankedLessonsTimings = rankTimings;
  results.getRankedLessonsAvgMs = +(rankTimings.reduce((a,b)=>a+b,0)/rankTimings.length).toFixed(1);
  results.getRankedLessonsResults = rankResults;

  // Cycle 5: consolidateLessons (no mutation, just measure)
  const t5 = Date.now();
  const consolidated = ref.consolidateLessons(rawLessons, 10);
  const consMs = Date.now() - t5;
  const consSections = consolidated.split(/\n---\n/).filter(Boolean);
  results.consolidateLessonsMs = consMs;
  results.consolidateLessonsInputSections = sections.length;
  results.consolidateLessonsOutputSections = consSections.length;

  console.log(JSON.stringify(results, null, 2));
}
run().catch(e => console.error('ERR:', e.message));
