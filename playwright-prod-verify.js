// playwright-prod-verify.js
// Production browser verification for V-09 deployment

const { chromium } = require('playwright');

const PROD_URL = 'https://apex-ai-os-cos.uk';
const EMAIL = 'arwwork1@gmail.com';
const PASSWORD = 'Apex2026abc';

const VIEWPORTS = [375, 390, 480, 640, 768, 900, 1024, 1280, 1440, 1660];

const PAGES = [
  'command', 'overview', 'chat', 'tasks', 'emails', 'notifications',
  'finance', 'health', 'communications', 'university', 'intelligence',
  'master', 'system', 'memory', 'journal', 'reality', 'business',
  'occult', 'spiritual', 'timeline'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const errors = [];
  const networkFails = [];
  let wsConnected = false;

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));

  page.on('response', res => {
    const url = res.url();
    if (url.includes(PROD_URL) && res.status() >= 500) {
      networkFails.push({ url, status: res.status() });
    }
  });

  page.on('websocket', ws => {
    wsConnected = true;
    ws.on('socketerror', e => errors.push('WS ERROR: ' + e));
  });

  // --- Step 1: Navigate unauthenticated
  console.log('[1] Navigating unauthenticated...');
  const unauthResp = await page.goto(PROD_URL, { waitUntil: 'load' });
  console.log('    Unauthenticated status:', unauthResp.status());

  // --- Step 2: Login
  console.log('[2] Logging in...');
  const loginResult = await page.evaluate(async ({ email, password }) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return { status: res.status, body: await res.text() };
  }, { email: EMAIL, password: PASSWORD });
  console.log('    Login result:', loginResult.status, loginResult.body.substring(0, 60));

  if (loginResult.status !== 200) {
    console.error('    FATAL: Login failed');
    await browser.close();
    process.exit(1);
  }

  // --- Step 3: Reload authenticated + measure
  console.log('[3] Authenticated reload...');
  const requests = [];
  const navStart = Date.now();
  page.on('request', req => requests.push({ t: Date.now(), url: req.url(), type: req.resourceType() }));

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(5000);

  const perfData = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(e => e.name === 'first-contentful-paint');
    return {
      ttfb: nav ? nav.responseStart : null,
      fcp: fcp ? fcp.startTime : null,
      dcl: nav ? nav.domContentLoadedEventEnd : null,
      loadEvent: nav ? nav.loadEventEnd : null,
      htmlSize: nav ? nav.decodedBodySize : null,
    };
  });

  const bootReqs = requests.filter(r => r.t - navStart <= 10000);
  const urlCounts = {};
  bootReqs.forEach(r => { urlCounts[r.url] = (urlCounts[r.url] || 0) + 1; });
  const dupes = Object.entries(urlCounts).filter(([, c]) => c > 1);

  console.log('\n--- PRODUCTION PERFORMANCE ---');
  console.log('TTFB:', perfData.ttfb ? perfData.ttfb.toFixed(0) + 'ms' : 'N/A');
  console.log('FCP:', perfData.fcp ? perfData.fcp.toFixed(0) + 'ms' : 'N/A');
  console.log('DCL:', perfData.dcl ? perfData.dcl.toFixed(0) + 'ms' : 'N/A');
  console.log('Load Event:', perfData.loadEvent ? perfData.loadEvent.toFixed(0) + 'ms' : 'N/A');
  console.log('HTML size:', perfData.htmlSize ? Math.round(perfData.htmlSize / 1024) + ' KB' : 'N/A');
  console.log('Boot requests (10s):', bootReqs.length);
  console.log('Duplicates:', dupes.length, 'groups');
  if (dupes.length) dupes.forEach(([u, c]) => console.log('  ', c + 'x', u.replace(PROD_URL, '')));

  // --- Step 4: Check title/header
  console.log('\n--- PAGE CHECKS ---');
  const title = await page.title();
  console.log('Title:', title);

  const hasNav = await page.$eval('body', el => !!el.querySelector('[class*="nav"], .bottom-nav, nav'));
  console.log('Navigation present:', hasNav);

  const hasChatInput = await page.$eval('body', el => !!el.querySelector('#chatInput, [id*="chat"]'));
  console.log('Chat input present:', hasChatInput);

  // --- Step 5: Navigation smoke test — all 20 pages
  console.log('\n--- NAVIGATION SMOKE TEST ---');
  for (const pageName of PAGES) {
    try {
      await page.evaluate(p => { if (typeof window.switchPage === 'function') window.switchPage(p); }, pageName);
      await page.waitForTimeout(500);
      const hasError = await page.evaluate(() => {
        return document.body.innerHTML.includes('ReferenceError') ||
               document.body.innerHTML.includes('TypeError') ||
               document.body.innerHTML.includes('Cannot read');
      });
      console.log(`  ${hasError ? 'FAIL' : 'OK  '} ${pageName}`);
    } catch (e) {
      console.log(`  ERR  ${pageName}: ${e.message.substring(0, 60)}`);
    }
  }

  // --- Step 6: WebSocket check
  console.log('\n--- WEBSOCKET ---');
  const wsState = await page.evaluate(() => {
    if (typeof window._ws !== 'undefined' && window._ws) return window._ws.readyState;
    // Check for any global WS
    const keys = Object.keys(window).filter(k => window[k] instanceof WebSocket);
    if (keys.length) return window[keys[0]].readyState;
    return 'not found';
  });
  console.log('WS readyState (0=CONNECTING,1=OPEN,2=CLOSING,3=CLOSED):', wsState);
  console.log('WS connected event fired:', wsConnected);

  // --- Step 7: Responsive viewport checks
  console.log('\n--- RESPONSIVE CHECKS ---');
  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(200);
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`  ${overflow ? 'OVERFLOW' : 'OK     '} ${width}px`);
  }

  // --- Step 8: Restore viewport and check console errors
  await page.setViewportSize({ width: 1280, height: 800 });

  console.log('\n--- CONSOLE ERRORS ---');
  if (errors.length === 0) {
    console.log('  NONE');
  } else {
    errors.slice(0, 20).forEach(e => console.log(' ', e.substring(0, 120)));
  }

  console.log('\n--- 5XX FAILURES ---');
  if (networkFails.length === 0) {
    console.log('  NONE');
  } else {
    networkFails.forEach(f => console.log(' ', f.status, f.url));
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  console.log('Login:', loginResult.status === 200 ? 'OK' : 'FAIL');
  console.log('Console errors:', errors.length);
  console.log('5xx failures:', networkFails.length);
  console.log('WS fired:', wsConnected);
  console.log('DCL (ms):', perfData.dcl ? perfData.dcl.toFixed(0) : 'N/A');
  console.log('Boot requests:', bootReqs.length);
  console.log('Duplicate groups:', dupes.length);

  process.exit(errors.filter(e => !e.includes('favicon') && !e.includes('third-party')).length > 5 ? 1 : 0);
})();
