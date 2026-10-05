// playwright-v08-baseline.js
// 3-run Playwright Chromium baseline measurement of APEX dashboard

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'arwwork1@gmail.com';
const PASSWORD = 'Apex2026abc';
const RUNS = 3;

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function runMeasurement(runIndex) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RUN ${runIndex + 1} of ${RUNS}`);
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Intercept all requests BEFORE navigation
  const requests = [];
  const navStartTime = Date.now();

  page.on('request', (req) => {
    requests.push({
      timestamp: Date.now() - navStartTime,
      url: req.url(),
      resourceType: req.resourceType(),
      method: req.method(),
    });
  });

  page.on('response', (res) => {
    const match = requests.find(r => r.url === res.url() && r.transferSize === undefined);
    if (match) {
      match.status = res.status();
      // transferSize not directly available on response in Playwright but we note headers
      const contentLength = res.headers()['content-length'];
      if (contentLength) match.transferSize = parseInt(contentLength, 10);
    }
  });

  // Step 1: Navigate to base URL
  console.log('\n[Step 1] Navigating to', BASE_URL);
  await page.goto(BASE_URL, { waitUntil: 'load' });

  // Step 2: Authenticate via in-page fetch
  console.log('[Step 2] Authenticating via fetch /auth/login');
  const loginResult = await page.evaluate(async ({ email, password }) => {
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const text = await res.text();
      return { status: res.status, body: text.substring(0, 200) };
    } catch (e) {
      return { error: e.message };
    }
  }, { email: EMAIL, password: PASSWORD });
  console.log('[Step 2] Login response:', JSON.stringify(loginResult));

  // Reset request tracking for post-auth page load
  const postAuthRequests = [];
  const reloadStart = Date.now();

  page.on('request', (req) => {
    postAuthRequests.push({
      timestamp: Date.now() - reloadStart,
      url: req.url(),
      resourceType: req.resourceType(),
      method: req.method(),
    });
  });

  // Step 3: Reload after auth
  console.log('[Step 3] Reloading page after auth');
  await page.reload({ waitUntil: 'load' });

  // Wait a moment for any deferred resources
  await page.waitForTimeout(1000);

  // Collect timing from performance API
  const perfData = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(e => e.name === 'first-contentful-paint');
    const fp = paint.find(e => e.name === 'first-paint');

    const mem = performance.memory || {};

    const scripts = performance.getEntriesByType('resource').filter(r => r.initiatorType === 'script');
    const allResources = performance.getEntriesByType('resource');

    const totalTransfer = allResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

    return {
      nav: nav ? {
        startTime: nav.startTime,
        responseStart: nav.responseStart,
        domInteractive: nav.domInteractive,
        domContentLoadedEventEnd: nav.domContentLoadedEventEnd,
        loadEventEnd: nav.loadEventEnd,
        transferSize: nav.transferSize,
        encodedBodySize: nav.encodedBodySize,
        decodedBodySize: nav.decodedBodySize,
      } : null,
      fcp: fcp ? fcp.startTime : null,
      fp: fp ? fp.startTime : null,
      memory: {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
      },
      scripts: scripts.map(s => ({
        name: s.name,
        duration: Math.round(s.duration * 100) / 100,
        transferSize: s.transferSize,
        encodedBodySize: s.encodedBodySize,
        startTime: Math.round(s.startTime * 100) / 100,
      })),
      totalTransferBytes: totalTransfer,
      allResourceCount: allResources.length,
    };
  });

  // Try PerformanceObserver for long tasks (already fired by now, so get buffered)
  const longTasks = await page.evaluate(() => {
    return new Promise((resolve) => {
      const tasks = [];
      try {
        const obs = new PerformanceObserver((list) => {
          list.getEntries().forEach(e => tasks.push({ startTime: e.startTime, duration: e.duration }));
        });
        obs.observe({ type: 'longtask', buffered: true });
        setTimeout(() => {
          obs.disconnect();
          resolve(tasks);
        }, 500);
      } catch (e) {
        resolve([{ error: e.message }]);
      }
    });
  });

  // Section F: switch to overview page and count new API calls
  console.log('[Step F] Switching to overview page and counting API calls');
  const preOverviewRequestCount = postAuthRequests.length;
  const overviewApiCalls = [];

  page.on('request', (req) => {
    overviewApiCalls.push({
      timestamp: Date.now() - reloadStart,
      url: req.url(),
      resourceType: req.resourceType(),
    });
  });

  const switchResult = await page.evaluate(async () => {
    try {
      if (typeof window.switchPage === 'function') {
        window.switchPage('overview');
        return 'called';
      } else {
        return 'switchPage not found';
      }
    } catch (e) {
      return 'error: ' + e.message;
    }
  });
  console.log('[Step F] switchPage result:', switchResult);

  await page.waitForTimeout(3000);

  // Compute derived metrics
  const nav = perfData.nav;
  const ttfb = nav ? nav.responseStart - nav.startTime : null;
  const fcp = perfData.fcp;
  const dcl = nav ? nav.domContentLoadedEventEnd : null;
  const domInteractive = nav ? nav.domInteractive : null;
  const loadEvent = nav ? nav.loadEventEnd : null;
  const parseEvalTime = (dcl !== null && ttfb !== null) ? dcl - ttfb : null;

  // Combine all requests (within ~10s window from reload)
  const tenSecRequests = postAuthRequests.filter(r => r.timestamp <= 10000);

  // Print results
  console.log('\n--- CORE TIMING (ms) ---');
  console.log(`TTFB:           ${ttfb !== null ? ttfb.toFixed(2) : 'N/A'}`);
  console.log(`FCP:            ${fcp !== null ? fcp.toFixed(2) : 'N/A'}`);
  console.log(`DOM Interactive:${domInteractive !== null ? domInteractive.toFixed(2) : 'N/A'}`);
  console.log(`DCL:            ${dcl !== null ? dcl.toFixed(2) : 'N/A'}`);
  console.log(`Load Event End: ${loadEvent !== null ? loadEvent.toFixed(2) : 'N/A'}`);
  console.log(`Parse+Eval est: ${parseEvalTime !== null ? parseEvalTime.toFixed(2) : 'N/A'} (DCL - TTFB)`);

  console.log('\n--- JS HEAP MEMORY ---');
  console.log(`Used JS Heap:   ${perfData.memory.usedJSHeapSize ? (perfData.memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
  console.log(`Total JS Heap:  ${perfData.memory.totalJSHeapSize ? (perfData.memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
  console.log(`JS Heap Limit:  ${perfData.memory.jsHeapSizeLimit ? (perfData.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);

  console.log('\n--- NETWORK TRANSFER ---');
  console.log(`Nav transferSize: ${nav ? nav.transferSize + ' bytes' : 'N/A'}`);
  console.log(`Total resource transfer: ${(perfData.totalTransferBytes / 1024).toFixed(2)} KB across ${perfData.allResourceCount} resources`);

  console.log('\n--- LONG TASKS ---');
  if (longTasks.length === 0) {
    console.log('No long tasks observed');
  } else {
    longTasks.forEach((t, i) => {
      if (t.error) {
        console.log(`  PerformanceObserver error: ${t.error}`);
      } else {
        console.log(`  LongTask ${i + 1}: startTime=${t.startTime.toFixed(2)}ms duration=${t.duration.toFixed(2)}ms`);
      }
    });
  }

  console.log('\n--- SCRIPT RESOURCE TIMINGS ---');
  if (perfData.scripts.length === 0) {
    console.log('No script resources found');
  } else {
    perfData.scripts.forEach((s, i) => {
      const shortName = s.name.replace(BASE_URL, '').substring(0, 80);
      console.log(`  [${i + 1}] ${shortName}`);
      console.log(`       duration=${s.duration}ms  transferSize=${s.transferSize || 0}B  startTime=${s.startTime}ms`);
    });
  }

  console.log(`\n--- ALL NETWORK REQUESTS (10s window, ${tenSecRequests.length} total) ---`);
  tenSecRequests.forEach((r, i) => {
    const shortUrl = r.url.length > 100 ? r.url.substring(0, 100) + '...' : r.url;
    console.log(`  [${String(i + 1).padStart(3)}] +${String(r.timestamp).padStart(6)}ms  [${r.resourceType.padEnd(12)}]  ${shortUrl}`);
  });

  console.log(`\n--- OVERVIEW SWITCH API CALLS (3s window) ---`);
  console.log(`switchPage('overview') result: ${switchResult}`);
  const apiOnlyCalls = overviewApiCalls.filter(r => r.resourceType === 'fetch' || r.resourceType === 'xhr');
  console.log(`Total new requests: ${overviewApiCalls.length}`);
  console.log(`API calls (fetch/xhr): ${apiOnlyCalls.length}`);
  apiOnlyCalls.forEach((r, i) => {
    console.log(`  [${i + 1}] +${r.timestamp}ms  ${r.url}`);
  });

  await browser.close();

  return {
    runIndex: runIndex + 1,
    ttfb,
    fcp,
    dcl,
    domInteractive,
    loadEvent,
    parseEvalTime,
    memory: perfData.memory,
    totalRequests10s: tenSecRequests.length,
    overviewApiCallCount: apiOnlyCalls.length,
    longTaskCount: longTasks.filter(t => !t.error).length,
  };
}

async function main() {
  console.log('APEX Dashboard Playwright Baseline Measurement');
  console.log('Version: v08');
  console.log('Date:', new Date().toISOString());
  console.log('Target:', BASE_URL);
  console.log('Runs:', RUNS);

  const results = [];

  for (let i = 0; i < RUNS; i++) {
    const result = await runMeasurement(i);
    results.push(result);
    if (i < RUNS - 1) {
      console.log('\n[Waiting 2s between runs...]');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY — ALL RUNS');
  console.log('='.repeat(60));

  const headers = ['Metric', 'Run 1', 'Run 2', 'Run 3', 'Median'];
  const rows = [
    ['TTFB (ms)',          ...results.map(r => r.ttfb !== null ? r.ttfb.toFixed(2) : 'N/A'),         results.map(r=>r.ttfb).some(v=>v!==null) ? median(results.map(r=>r.ttfb).filter(v=>v!==null)).toFixed(2) : 'N/A'],
    ['FCP (ms)',           ...results.map(r => r.fcp !== null ? r.fcp.toFixed(2) : 'N/A'),            results.map(r=>r.fcp).some(v=>v!==null)  ? median(results.map(r=>r.fcp).filter(v=>v!==null)).toFixed(2)  : 'N/A'],
    ['DOM Interactive',    ...results.map(r => r.domInteractive !== null ? r.domInteractive.toFixed(2) : 'N/A'), results.map(r=>r.domInteractive).some(v=>v!==null) ? median(results.map(r=>r.domInteractive).filter(v=>v!==null)).toFixed(2) : 'N/A'],
    ['DCL (ms)',           ...results.map(r => r.dcl !== null ? r.dcl.toFixed(2) : 'N/A'),            results.map(r=>r.dcl).some(v=>v!==null)  ? median(results.map(r=>r.dcl).filter(v=>v!==null)).toFixed(2)  : 'N/A'],
    ['Load Event (ms)',    ...results.map(r => r.loadEvent !== null ? r.loadEvent.toFixed(2) : 'N/A'), results.map(r=>r.loadEvent).some(v=>v!==null) ? median(results.map(r=>r.loadEvent).filter(v=>v!==null)).toFixed(2) : 'N/A'],
    ['Parse+Eval (ms)',    ...results.map(r => r.parseEvalTime !== null ? r.parseEvalTime.toFixed(2) : 'N/A'), 'N/A'],
    ['Total Requests 10s', ...results.map(r => String(r.totalRequests10s)),                            median(results.map(r=>r.totalRequests10s)).toFixed(0)],
    ['Overview API calls', ...results.map(r => String(r.overviewApiCallCount)),                        median(results.map(r=>r.overviewApiCallCount)).toFixed(0)],
    ['Long Tasks',         ...results.map(r => String(r.longTaskCount)),                               median(results.map(r=>r.longTaskCount)).toFixed(0)],
    ['JS Heap Used (MB)',  ...results.map(r => r.memory.usedJSHeapSize ? (r.memory.usedJSHeapSize/1024/1024).toFixed(2) : 'N/A'), 'N/A'],
    ['JS Heap Total (MB)', ...results.map(r => r.memory.totalJSHeapSize ? (r.memory.totalJSHeapSize/1024/1024).toFixed(2) : 'N/A'), 'N/A'],
  ];

  const colWidths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => (r[i] || '').length)));
  const fmt = (row) => row.map((cell, i) => (cell || '').padEnd(colWidths[i])).join('  |  ');

  console.log('\n' + fmt(headers));
  console.log(colWidths.map(w => '-'.repeat(w)).join('--+--'));
  rows.forEach(row => console.log(fmt(row)));

  console.log('\n[DONE]');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
