// playwright-v09-baseline.js
// V-09A comprehensive cold-load measurement — 3 runs, full request waterfall

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const RUNS = 3;
const OBSERVE_MS = 12000;
// Use x-app-key header auth — avoids login rate limiter
const APP_KEY = '314c5cde318b9e738cdd3e4900ed510dae00cd89565b3ebb42154b39d75f73fa';

function median(arr) {
  const sorted = [...arr].filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmt(v) { return v !== null && v !== undefined ? v.toFixed(2) : 'N/A'; }

async function runMeasurement(runIndex) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`RUN ${runIndex + 1} of ${RUNS}`);
  console.log('='.repeat(70));

  // Fresh browser + context every run — ensures cold cache
  const browser = await chromium.launch({ headless: true });
  // Set x-app-key on all requests — bypasses session cookie auth
  const context = await browser.newContext({
    extraHTTPHeaders: { 'x-app-key': APP_KEY },
  });
  const page = await context.newPage();

  // --- Request tracking ---
  const requests = [];
  let navStart = null;

  page.on('request', req => {
    requests.push({
      t: Date.now(),
      url: req.url(),
      type: req.resourceType(),
      method: req.method(),
    });
  });

  page.on('response', res => {
    const r = [...requests].reverse().find(x => x.url === res.url() && !x.status);
    if (r) { r.status = res.status(); r.tEnd = Date.now(); }
  });

  // Inject LCP observer before navigation
  await page.addInitScript(() => {
    window._lcpValue = null;
    window._lcpEntries = [];
    try {
      new PerformanceObserver((list) => {
        list.getEntries().forEach(e => {
          window._lcpValue = e.startTime;
          window._lcpEntries.push({ startTime: e.startTime, size: e.size, element: e.element?.tagName });
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}
  });

  // Direct authenticated cold navigation (x-app-key set on context — no login needed)
  requests.length = 0;
  navStart = Date.now();

  console.log('[1] Cold authenticated navigation...');
  await page.goto(BASE_URL, { waitUntil: 'load' });

  // Collect for full observation window
  await page.waitForTimeout(OBSERVE_MS);

  const elapsed = Date.now() - navStart;
  console.log(`[3] ${elapsed}ms observation window complete`);

  // --- Performance metrics ---
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(e => e.name === 'first-contentful-paint');
    const fp = paint.find(e => e.name === 'first-paint');
    const resources = performance.getEntriesByType('resource');
    const scripts = resources.filter(r => r.initiatorType === 'script');

    const longTaskTotal = (() => {
      try {
        const entries = performance.getEntriesByType('longtask');
        return entries.reduce((sum, e) => sum + e.duration, 0);
      } catch (_) { return null; }
    })();

    return {
      ttfb: nav ? nav.responseStart : null,
      fcp: fcp ? fcp.startTime : null,
      fp: fp ? fp.startTime : null,
      domInteractive: nav ? nav.domInteractive : null,
      dcl: nav ? nav.domContentLoadedEventEnd : null,
      loadEvent: nav ? nav.loadEventEnd : null,
      lcp: window._lcpValue,
      lcpEntries: window._lcpEntries,
      transferSize: nav ? nav.transferSize : null,
      encodedBodySize: nav ? nav.encodedBodySize : null,
      decodedBodySize: nav ? nav.decodedBodySize : null,
      scripts: scripts.map(s => ({
        url: s.name.split('/').pop().split('?')[0].substring(0, 60),
        fullUrl: s.name,
        start: Math.round(s.startTime),
        duration: Math.round(s.duration),
        transferSize: s.transferSize,
      })).sort((a, b) => a.start - b.start),
      longTaskTotal,
      allResourceCount: resources.length,
    };
  });

  // --- Long tasks ---
  const longTasks = await page.evaluate(() => {
    return new Promise(resolve => {
      const tasks = [];
      try {
        const obs = new PerformanceObserver(list => {
          list.getEntries().forEach(e => tasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }));
        });
        obs.observe({ type: 'longtask', buffered: true });
        setTimeout(() => { obs.disconnect(); resolve(tasks); }, 500);
      } catch (e) { resolve([]); }
    });
  });

  // --- Classify requests by time window ---
  const w1 = requests.filter(r => r.t - navStart <= 1000);
  const w3 = requests.filter(r => r.t - navStart <= 3000);
  const w5 = requests.filter(r => r.t - navStart <= 5000);
  const w10 = requests.filter(r => r.t - navStart <= 10000);

  // Print full waterfall
  console.log('\n--- REQUEST WATERFALL ---');
  requests.forEach((r, i) => {
    const relT = r.t - navStart;
    const dur = r.tEnd ? r.tEnd - r.t : '?';
    const apiMark = r.url.includes('/api/') ? '  [API]' : '';
    console.log(`  [${String(i+1).padStart(3)}] +${String(relT).padStart(5)}ms  [${r.type.padEnd(12)}]  ${r.url.substring(0, 100)}${apiMark}`);
  });

  // Duplicate analysis
  const urlCounts = {};
  requests.forEach(r => { urlCounts[r.url] = (urlCounts[r.url] || 0) + 1; });
  const dupes = Object.entries(urlCounts).filter(([, c]) => c > 1);

  console.log('\n--- DUPLICATE REQUESTS ---');
  if (dupes.length === 0) {
    console.log('  NONE');
  } else {
    dupes.forEach(([url, c]) => console.log(`  ${c}x  ${url}`));
  }

  // Script eval times
  console.log('\n--- SCRIPT EVALUATION TIMES ---');
  perf.scripts.forEach(s => {
    console.log(`  +${String(s.start).padStart(5)}ms  dur=${String(s.duration).padStart(5)}ms  ${s.url}`);
  });

  // Long tasks
  console.log('\n--- LONG TASKS (>50ms) ---');
  if (longTasks.length === 0) {
    console.log('  NONE');
  } else {
    longTasks.forEach(t => console.log(`  +${t.start}ms  dur=${t.dur}ms`));
  }

  console.log('\n--- METRICS ---');
  console.log(`  TTFB:          ${fmt(perf.ttfb)} ms`);
  console.log(`  First Paint:   ${fmt(perf.fp)} ms`);
  console.log(`  FCP:           ${fmt(perf.fcp)} ms`);
  console.log(`  DOM Interactive: ${fmt(perf.domInteractive)} ms`);
  console.log(`  DCL:           ${fmt(perf.dcl)} ms`);
  console.log(`  LCP:           ${fmt(perf.lcp)} ms`);
  console.log(`  Load Event:    ${fmt(perf.loadEvent)} ms`);
  console.log(`  HTML transfer: ${perf.transferSize} bytes`);
  console.log(`  HTML decoded:  ${perf.decodedBodySize} bytes`);
  console.log(`  Requests 1s:   ${w1.length}`);
  console.log(`  Requests 3s:   ${w3.length}`);
  console.log(`  Requests 5s:   ${w5.length}`);
  console.log(`  Requests 10s:  ${w10.length}`);
  console.log(`  Requests total (${OBSERVE_MS/1000}s): ${requests.length}`);
  console.log(`  Duplicates:    ${dupes.length} groups`);
  console.log(`  Long tasks:    ${longTasks.length}`);
  console.log(`  LT total time: ${perf.longTaskTotal !== null ? Math.round(perf.longTaskTotal) + 'ms' : 'N/A'}`);

  await browser.close();

  return {
    ttfb: perf.ttfb,
    fp: perf.fp,
    fcp: perf.fcp,
    domInteractive: perf.domInteractive,
    dcl: perf.dcl,
    lcp: perf.lcp,
    loadEvent: perf.loadEvent,
    w1: w1.length,
    w3: w3.length,
    w5: w5.length,
    w10: w10.length,
    total: requests.length,
    dupeGroups: dupes.length,
    longTasks: longTasks.length,
    longTaskTotal: perf.longTaskTotal,
    requests: requests.map(r => ({ ...r, relT: r.t - navStart })),
    dupes,
    scripts: perf.scripts,
    longTaskList: longTasks,
    lcpEntries: perf.lcpEntries,
  };
}

(async () => {
  const results = [];
  for (let i = 0; i < RUNS; i++) {
    results.push(await runMeasurement(i));
  }

  console.log('\n');
  console.log('='.repeat(70));
  console.log('SUMMARY — ALL RUNS');
  console.log('='.repeat(70));

  const metrics = [
    ['TTFB (ms)', 'ttfb'],
    ['FCP (ms)', 'fcp'],
    ['LCP (ms)', 'lcp'],
    ['DOM Interactive', 'domInteractive'],
    ['DCL (ms)', 'dcl'],
    ['Load Event (ms)', 'loadEvent'],
    ['Requests 1s', 'w1'],
    ['Requests 3s', 'w3'],
    ['Requests 5s', 'w5'],
    ['Requests 10s', 'w10'],
    ['Requests total', 'total'],
    ['Dupe groups', 'dupeGroups'],
    ['Long tasks', 'longTasks'],
    ['LT total (ms)', 'longTaskTotal'],
  ];

  const header = 'Metric              |  Run 1    |  Run 2    |  Run 3    |  Median  ';
  const divider = '-'.repeat(header.length);
  console.log(header);
  console.log(divider);

  for (const [label, key] of metrics) {
    const vals = results.map(r => r[key]);
    const med = median(vals);
    const row = [
      label.padEnd(20),
      ...vals.map(v => (v !== null && v !== undefined ? v.toFixed(2) : 'N/A').padStart(9)),
      (med !== null ? med.toFixed(2) : 'N/A').padStart(9),
    ].join('  |  ');
    console.log(row);
  }

  // Consolidated duplicate report across runs
  console.log('\n--- DUPLICATES (Run 1) ---');
  results[0].dupes.forEach(([url, c]) => console.log(`  ${c}x  ${url}`));

  // Consolidated request list from run 1 for classification
  console.log('\n--- FULL WATERFALL RUN 1 (for classification) ---');
  results[0].requests.forEach((r, i) => {
    const apiMark = r.url.includes('/api/') ? '  [API]' : '';
    console.log(`  [${String(i+1).padStart(3)}] +${String(r.relT).padStart(5)}ms  [${r.type.padEnd(12)}]  ${r.url}${apiMark}`);
  });

  console.log('\n[DONE]');
})();
