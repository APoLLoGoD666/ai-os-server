'use strict';
const { chromium } = require('./node_modules/playwright');
const jwt = require('./node_modules/jsonwebtoken');
const fs  = require('fs');

const PROD_URL   = 'https://ai-os-server-jx20.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET;
const APP_KEY    = process.env.APP_ACCESS_KEY || '';
const UUID       = process.env.APEX_HUMAN_ID  || '00000000-0000-4000-8000-000000000001';
const DOMAIN     = 'ai-os-server-jx20.onrender.com';
const OUT        = 'C:/Users/arwwo/Desktop/page-checks';

if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }
const TOKEN = jwt.sign({ sub: UUID, role: 'master', email: null, jti: 'pages-chk1' }, JWT_SECRET, { expiresIn: '1h' });

const PAGES = [
    'overview','command','system','finance','communication','business',
    'health','knowledge','intelligence','actions','agents',
    'memory','governance','reality','settings'
];

// Minimum acceptable height for a content panel (px)
const MIN_PANEL_H = 80;

(async () => {
    if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        extraHTTPHeaders: { 'x-app-key': APP_KEY }
    });
    await ctx.addInitScript((k) => { localStorage.setItem('apex_app_key', k); }, APP_KEY);
    await ctx.addCookies([
        { name: 'apex_session', value: '1',   domain: DOMAIN, path: '/', httpOnly: false },
        { name: 'apex_token',   value: TOKEN, domain: DOMAIN, path: '/', httpOnly: true  }
    ]);

    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGE ERROR:', e.message.slice(0, 100)));

    await page.goto(PROD_URL + '/#overview', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const results = [];

    for (const pg of PAGES) {
        console.log(`\n── ${pg.toUpperCase()} ──`);

        await page.evaluate((name) => window.switchPage(name), pg);
        await page.waitForTimeout(900);

        // Is the page active?
        const active = await page.$eval('#page-' + pg, el => el.classList.contains('active')).catch(() => false);

        // Collect all ds-panel heights on this page
        const panels = await page.$$eval('#page-' + pg + ' .ds-panel', els =>
            els.map(el => {
                const r = el.getBoundingClientRect();
                return { id: el.id || '(no id)', h: Math.round(r.height), w: Math.round(r.width) };
            })
        ).catch(() => []);

        // Collect content containers (grids, lists)
        const containers = await page.$$eval(
            '#page-' + pg + ' [id$="Grid"], #page-' + pg + ' [id$="List"], #page-' + pg + ' [id$="Cards"]',
            els => els.map(el => {
                const r = el.getBoundingClientRect();
                return { id: el.id, h: Math.round(r.height) };
            })
        ).catch(() => []);

        const smallPanels     = panels.filter(p => p.h < MIN_PANEL_H);
        const smallContainers = containers.filter(c => c.h < 40);

        console.log(`active: ${active ? '✓' : '✗'} | panels: ${panels.length} | small: ${smallPanels.length}`);
        if (smallPanels.length)     console.log('  small panels:', smallPanels.map(p => `${p.id}(${p.h}px)`).join(', '));
        if (smallContainers.length) console.log('  empty containers:', smallContainers.map(c => `${c.id}(${c.h}px)`).join(', '));

        await page.screenshot({ path: `${OUT}/${pg}.png`, fullPage: false });
        console.log(`  [screenshot] ${OUT}/${pg}.png`);

        results.push({ pg, active, panels: panels.length, smallPanels, smallContainers });
    }

    // Summary
    console.log('\n════ SUMMARY ════');
    results.forEach(r => {
        const ok = r.active && r.smallPanels.length === 0;
        console.log(`${ok ? '✓' : '✗'} ${r.pg.padEnd(16)} active:${r.active?'Y':'N'} panels:${r.panels} small:${r.smallPanels.length}`);
    });

    await browser.close();
    console.log('\n── DONE ── Screenshots saved to', OUT);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
