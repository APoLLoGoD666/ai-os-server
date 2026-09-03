const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // --- 1. Navigate and authenticate ---
  await page.goto('http://localhost:3000', { waitUntil: 'load' });

  await page.evaluate(async () => {
    await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'arwwork1@gmail.com', password: 'Apex2026abc' })
    });
  });

  // Collect requests starting from reload
  const requests = [];
  page.on('request', req => {
    requests.push({ url: req.url(), time: Date.now() });
  });

  const reloadStart = Date.now();
  await page.reload({ waitUntil: 'load' });

  // --- 2. FCP and DCL ---
  const navEntry = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');
    return {
      domContentLoadedEventEnd: nav ? nav.domContentLoadedEventEnd : null,
      fcp: fcp ? fcp.startTime : null
    };
  });

  console.log('=== AFTER BASELINE RESULTS ===');
  console.log('');
  console.log('--- 1. FCP and DCL ---');
  console.log('FCP (ms):', navEntry.fcp !== null ? navEntry.fcp.toFixed(2) : 'N/A');
  console.log('DCL (ms):', navEntry.domContentLoadedEventEnd !== null ? navEntry.domContentLoadedEventEnd.toFixed(2) : 'N/A');

  // --- 3. Boot request count and duplicate analysis (first 9 seconds) ---
  await new Promise(r => setTimeout(r, 9000));

  const cutoff = reloadStart + 9000;
  const bootRequests = requests.filter(r => r.time <= cutoff);

  const urlCounts = {};
  for (const r of bootRequests) {
    urlCounts[r.url] = (urlCounts[r.url] || 0) + 1;
  }

  const duplicates = Object.entries(urlCounts).filter(([, count]) => count > 1);

  console.log('');
  console.log('--- 2. Boot Request Count and Duplicates ---');
  console.log('Total boot requests (first 9s):', bootRequests.length);
  console.log('');
  console.log('All request URLs:');
  for (const [url, count] of Object.entries(urlCounts)) {
    console.log(`  [${count}x] ${url}`);
  }
  console.log('');
  if (duplicates.length === 0) {
    console.log('Duplicate URLs: NONE');
  } else {
    console.log('Duplicate URLs:');
    for (const [url, count] of duplicates) {
      console.log(`  ${count}x - ${url}`);
    }
  }

  // --- 4. Overview page API calls ---
  const overviewRequests = [];
  const overviewListener = req => {
    const url = req.url();
    if (url.includes('/api/') || url.includes('localhost:3000')) {
      overviewRequests.push(url);
    }
  };
  page.on('request', overviewListener);

  await page.evaluate(() => {
    if (typeof window.switchPage === 'function') {
      window.switchPage('overview');
    } else {
      console.warn('window.switchPage not found');
    }
  });

  await new Promise(r => setTimeout(r, 3000));
  page.off('request', overviewListener);

  console.log('');
  console.log('--- 3. Overview Page API Calls (3s after switchPage) ---');
  console.log('New API calls fired:', overviewRequests.length);
  for (const url of overviewRequests) {
    console.log(' ', url);
  }

  // --- 5. Reality gate check ---
  const realityVisited = await page.evaluate(() => {
    if (typeof window._domainVisited !== 'undefined') {
      return window._domainVisited['reality'];
    }
    return 'NOT_DEFINED';
  });

  console.log('');
  console.log('--- 4. Reality Gate (_domainVisited["reality"] at boot) ---');
  console.log('_domainVisited["reality"]:', realityVisited);
  if (realityVisited === false) {
    console.log('Reality gate: WORKING (false at boot)');
  } else if (realityVisited === 'NOT_DEFINED') {
    console.log('Reality gate: _domainVisited not defined on window');
  } else {
    console.log('Reality gate: NOT working (expected false, got', realityVisited, ')');
  }

  await browser.close();
})();
