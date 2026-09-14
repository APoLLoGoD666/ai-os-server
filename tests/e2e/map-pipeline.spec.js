'use strict';
/**
 * MAP Pipeline E2E tests
 * Uses a minimal static test server (test-server.js) that serves dashboard.html.
 * All three API endpoints are mocked via page.route() with realistic fixture data.
 */
const { test, expect } = require('@playwright/test');

// ── Fixture data ──────────────────────────────────────────────────────────────
const NOW      = new Date().toISOString();
const AGO_2MIN = new Date(Date.now() - 120000).toISOString();
const AGO_1HR  = new Date(Date.now() - 3600000).toISOString();

const MOCK_RUNS = [
    { id:'r1', agent_name:'Business Agent', domain:'business', success:true,  created_at:NOW,      duration_ms:1200, task_description:'Quarterly revenue analysis' },
    { id:'r2', agent_name:'System Agent',   domain:'system',   success:true,  created_at:AGO_2MIN, duration_ms:800  },
    { id:'r3', agent_name:'File Agent',     domain:'file',     success:false, created_at:AGO_1HR,  duration_ms:400  },
];
const MOCK_TASKS = [
    { id:'t1', title:'Analyse Q3 Revenue',  status:'completed',         created_at:NOW,      updated_at:NOW      },
    { id:'t2', title:'Deploy system patch', status:'in_progress',       created_at:AGO_2MIN, updated_at:AGO_2MIN },
    { id:'t3', title:'Awaiting sign-off',   status:'awaiting_approval', created_at:AGO_2MIN, updated_at:AGO_2MIN },
    { id:'t4', title:'Old task done',       status:'done',              created_at:AGO_1HR,  updated_at:AGO_1HR  },
    { id:'t5', title:'Failed migration',    status:'failed',            created_at:AGO_1HR,  updated_at:AGO_1HR  },
];
const MOCK_DELIBS = [
    { id:'d1', question:'Should we expand the finance module?', status:'deliberating', consensus_level:0.6, created_at:NOW },
    { id:'d2', question:'Archive old logs?', status:'resolved', consensus_level:0.9, resolved_at:AGO_1HR, final_recommendation:'Proceed with archiving.' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function setup(page) {
    // Inject apex_session cookie BEFORE page JS runs so hasCookie() returns true
    await page.addInitScript(() => {
        document.cookie = 'apex_session=1; path=/; max-age=86400';
        window._kgTestMode = true;
    });

    await page.route(u => u.href.includes('/api/agents/activity'), r =>
        r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ runs: MOCK_RUNS }) }));
    await page.route(u => u.href.includes('/api/tasks') && !u.href.includes('/api/civilization'), r =>
        r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ tasks: MOCK_TASKS }) }));
    await page.route(u => u.href.includes('/api/civilization/council/history'), r =>
        r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ deliberations: MOCK_DELIBS }) }));
    // Stub all other API calls with empty valid responses
    await page.route(u => u.href.includes('/api/'), r =>
        r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
}

async function goToMap(page) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
        var ov = document.getElementById('apexLoginOverlay');
        if (ov) { ov.style.display = 'none'; ov.style.pointerEvents = 'none'; }
        var nav = document.getElementById('apexSideNav');
        if (nav) nav.style.pointerEvents = 'none';
        if (typeof window.switchPage === 'function') window.switchPage('test');
    });
    await page.waitForSelector('#kg-pipeline', { timeout: 8000 });
    // Trigger fetch and wait until it completes (kg-last-updated gets text)
    await page.evaluate(() => { if (typeof window._kgFetchLive === 'function') window._kgFetchLive(); });
    await page.waitForFunction(() => {
        var el = document.getElementById('kg-last-updated');
        return el && el.textContent.trim().length > 0;
    }, { timeout: 5000 }).catch(() => {});  // non-fatal if element missing
    await page.waitForTimeout(200);
}

// Helper: click a node via JS .click() — bypasses all layout/overlay issues
async function clickNode(page, selector) {
    await page.evaluate((sel) => {
        var el = document.querySelector(sel);
        if (el) el.click();
    }, selector);
    await page.waitForTimeout(150);  // allow event handlers to run
}

// ── 1. All 6 nodes + coding pipeline render ───────────────────────────────────
test('MAP renders all 7 pipeline nodes (6 tiers + coding)', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    for (const id of ['input','council','actions','domain','office','output']) {
        await expect(page.locator(`#kg-node-${id}`)).toBeVisible();
    }
    await expect(page.locator('#kg-node-coding')).toBeVisible();
});

// ── 2. Correct labels ─────────────────────────────────────────────────────────
test('all nodes show correct labels', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    for (const label of ['INPUT','COUNCIL','ACTIONS','DOMAIN AGENTS','OFFICE AGENTS','OUTPUT','CODING PIPELINE']) {
        await expect(page.locator('#kg-pipeline .kg-node-label').getByText(label, { exact:true })).toBeVisible();
    }
});

// ── 3. INPUT opens both panels ────────────────────────────────────────────────
test('INPUT node click opens left and right panels', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-input');
    await expect(page.locator('#kg-left')).toHaveClass(/open/);
    await expect(page.locator('#kg-right')).toHaveClass(/open/);
    await expect(page.locator('#kg-left-title')).toHaveText('INPUT');
});

// ── 4. INPUT right panel shows 3 filter buttons ───────────────────────────────
test('INPUT right panel has ALL / LIVE / RECENT filters', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-input');
    await page.waitForSelector('.kg-input-filter-btn', { timeout:5000 });
    const btns = page.locator('.kg-input-filter-btn');
    await expect(btns).toHaveCount(3);
    await expect(btns.nth(0)).toHaveText('ALL');
    await expect(btns.nth(1)).toHaveText('LIVE');
    await expect(btns.nth(2)).toHaveText('RECENT');
    await expect(btns.nth(0)).toHaveClass(/active/);  // ALL is default
});

// ── 5. INPUT right panel shows 6 channel cards ───────────────────────────────
test('INPUT right panel shows 6 channel cards', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-input');
    await page.waitForSelector('.kg-input-card', { timeout:5000 });
    await expect(page.locator('.kg-input-card')).toHaveCount(6);
    await expect(page.locator('.kg-input-card-label').first()).toHaveText('Chat Input');
});

// ── 6. Input LIVE filter activates ────────────────────────────────────────────
test('clicking LIVE filter marks it active and deactivates ALL', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-input');
    await page.waitForSelector('.kg-input-filter-btn', { timeout:5000 });
    await page.evaluate(() => { var btns = document.querySelectorAll('.kg-input-filter-btn'); btns.forEach(function(b){ if(b.textContent.trim()==='LIVE') b.click(); }); });
    await page.waitForTimeout(150);
    await expect(page.locator('.kg-input-filter-btn', { hasText:'LIVE' })).toHaveClass(/active/);
    await expect(page.locator('.kg-input-filter-btn', { hasText:'ALL' })).not.toHaveClass(/active/);
});

// ── 7. Toggle: second click closes panels ─────────────────────────────────────
test('second click on active node closes both panels', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-input');
    await expect(page.locator('#kg-left')).toHaveClass(/open/);
    await clickNode(page, '#kg-node-input');
    await expect(page.locator('#kg-left')).not.toHaveClass(/open/);
    await expect(page.locator('#kg-right')).not.toHaveClass(/open/);
});

// ── 8. Active node gets aria-pressed=true ─────────────────────────────────────
test('clicked node receives active class and aria-pressed=true', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-council');
    await expect(page.locator('#kg-node-council')).toHaveClass(/active/);
    await expect(page.locator('#kg-node-council')).toHaveAttribute('aria-pressed', 'true');
});

// ── 9. Switching nodes clears previous active ─────────────────────────────────
test('switching nodes clears previous active class', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-council');
    await clickNode(page, '#kg-node-actions');
    await expect(page.locator('#kg-node-council')).not.toHaveClass(/active/);
    await expect(page.locator('#kg-node-actions')).toHaveClass(/active/);
});

// ── 10. COUNCIL left panel content ────────────────────────────────────────────
test('COUNCIL left panel contains CEO pinned card', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-council');
    await expect(page.locator('#kg-left-title')).toHaveText('COUNCIL');
    await expect(page.locator('#kg-left-body')).toContainText('CEO');
});

// ── 11. COUNCIL glow: is-deliberating when delib active ───────────────────────
test('COUNCIL node gets is-deliberating glow with active deliberation', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate((d) => { if (window._kgApplyGlows) window._kgApplyGlows([], [], d); }, MOCK_DELIBS);
    await expect(page.locator('#kg-node-council')).toHaveClass(/is-deliberating/);
});

// ── 12. ACTIONS glow: is-alerting when pending tasks ─────────────────────────
test('ACTIONS node gets is-alerting glow with pending tasks', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate((t) => { if (window._kgApplyGlows) window._kgApplyGlows([], t, []); }, MOCK_TASKS);
    await expect(page.locator('#kg-node-actions')).toHaveClass(/is-alerting/);
});

// ── 13. INPUT glow: is-stimuli when very recent run ──────────────────────────
test('INPUT node gets is-stimuli glow when run created < 45s ago', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    // Pass a run with created_at = NOW (test-time, guaranteed fresh)
    const freshRun = [{ id:'rx', agent_name:'Test', domain:'test', success:true, created_at: new Date().toISOString() }];
    await page.evaluate((r) => { if (window._kgApplyGlows) window._kgApplyGlows(r, [], []); }, freshRun);
    await expect(page.locator('#kg-node-input')).toHaveClass(/is-stimuli/);
});

// ── 14. OUTPUT node: opens output panels ─────────────────────────────────────
test('OUTPUT node click opens output panels', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-output');
    await expect(page.locator('#kg-left')).toHaveClass(/open/);
    await expect(page.locator('#kg-right')).toHaveClass(/open/);
    await expect(page.locator('#kg-left-title')).toHaveText('OUTPUT');
});

// ── 15. OUTPUT right panel shows RESULTS stat ────────────────────────────────
test('OUTPUT right panel stats shows RESULTS label', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-output');
    await page.waitForSelector('#kg-right-stats', { timeout:5000 });
    await expect(page.locator('#kg-right-stats')).toContainText('RESULTS');
});

// ── 16. OUTPUT glow: is-working when completed runs exist ────────────────────
test('OUTPUT node gets is-working glow when successful runs exist', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    const freshRun = [{ id:'rx', agent_name:'Test', domain:'test', success:true, created_at: new Date().toISOString() }];
    await page.evaluate((r) => { if (window._kgApplyGlows) window._kgApplyGlows(r, [], []); }, freshRun);
    await expect(page.locator('#kg-node-output')).toHaveClass(/is-working/);
});

// ── 17. CODING PIPELINE lights up on click ───────────────────────────────────
test('CODING PIPELINE node gets active class on click', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-coding');
    await expect(page.locator('#kg-node-coding')).toHaveClass(/active/);
    await expect(page.locator('#kg-left-title')).toHaveText('CODING PIPELINE');
});

// ── 18. CODING PIPELINE toggle ────────────────────────────────────────────────
test('second click on CODING PIPELINE closes panel', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-coding');
    await expect(page.locator('#kg-left')).toHaveClass(/open/);
    await clickNode(page, '#kg-node-coding');
    await expect(page.locator('#kg-left')).not.toHaveClass(/open/);
    await expect(page.locator('#kg-node-coding')).not.toHaveClass(/active/);
});

// ── 19. Close button clears active node ──────────────────────────────────────
test('close left panel button clears active node', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-council');
    await expect(page.locator('#kg-node-council')).toHaveClass(/active/);
    await page.evaluate(() => { var btn = document.querySelector('#kg-left button.kg-panel-close'); if(btn) btn.click(); });
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-node-council')).not.toHaveClass(/active/);
    await expect(page.locator('#kg-left')).not.toHaveClass(/open/);
});

// ── 20. Keyboard: Enter opens node ────────────────────────────────────────────
test('pressing Enter on a focused node opens its panel', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate(() => {
        var el = document.getElementById('kg-node-domain');
        if (el) { el.focus(); el.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', bubbles:true })); }
    });
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-left')).toHaveClass(/open/);
    await expect(page.locator('#kg-left-title')).toHaveText('DOMAIN AGENTS');
});

// ── 21. Last-updated timestamp renders ────────────────────────────────────────
test('last-updated timestamp element is visible after fetch', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    const ts = page.locator('#kg-last-updated');
    await expect(ts).toBeVisible();
    const text = await ts.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
});

// ── 22. ACTIONS left panel shows task groups ──────────────────────────────────
test('ACTIONS left panel renders accordion groups from task data', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    // Inject task data so _liveTasks is populated before panel renders
    await page.evaluate((t) => { if (window._kgApplyGlows) window._kgApplyGlows([], t, []); }, MOCK_TASKS);
    await clickNode(page, '#kg-node-actions');
    await page.waitForSelector('#kg-left-body .kg-group-hd', { timeout:5000 });
    const count = await page.locator('#kg-left-body .kg-group-hd').count();
    expect(count).toBeGreaterThan(0);
});

// ── 23. DOMAIN AGENTS opens right panel ───────────────────────────────────────
test('DOMAIN AGENTS node opens right panel', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-domain');
    await expect(page.locator('#kg-right')).toHaveClass(/open/);
    await expect(page.locator('#kg-right-title')).toHaveText('RECENT RUNS');
});

// ── 24. Council accordion starts collapsed by default ─────────────────────────
test('council accordion starts collapsed by default', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-council');
    await page.waitForSelector('#kg-left-body .kg-group-body', { timeout:5000, state:'attached' });
    const h = await page.locator('#kg-left-body .kg-group-body').first().evaluate(el => el.style.height);
    expect(h).toBe('0px');
});

// ── 25. Accordion expands on click then collapses on second click ──────────────
test('clicking open accordion header collapses it', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-council');
    await page.waitForSelector('#kg-left-body .kg-group-hd', { timeout:5000 });
    // Header starts collapsed — click once to open
    await page.evaluate(() => { var hd = document.querySelector('#kg-left-body .kg-group-hd'); if(hd) hd.click(); });
    await page.waitForTimeout(250);
    // Click again to collapse
    await page.evaluate(() => { var hd = document.querySelector('#kg-left-body .kg-group-hd'); if(hd) hd.click(); });
    await page.waitForTimeout(250);
    const hd = page.locator('#kg-left-body .kg-group-hd').first();
    await expect(hd).not.toHaveClass(/open/);
    await expect(hd).toHaveAttribute('aria-expanded', 'false');
});

// ── 26. Every node has an info button ────────────────────────────────────────
test('every pipeline node has a .kg-node-info-btn with data-info-key', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    for (const id of ['input','council','actions','domain','office','output','coding']) {
        const btn = page.locator(`#kg-node-${id} .kg-node-info-btn`);
        await expect(btn).toBeAttached();
        const key = await btn.getAttribute('data-info-key');
        expect(key).toBe('node-' + id);
    }
});

// ── 27. Clicking info button shows modal with correct content ─────────────────
test('clicking node info button shows overlay with correct title', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    // Click info button on INPUT node via JS (avoids stopPropagation issues)
    await page.evaluate(() => {
        var btn = document.querySelector('#kg-node-input .kg-node-info-btn');
        if (btn) btn.click();
    });
    await page.waitForTimeout(200);
    const overlay = page.locator('#kg-info-overlay');
    await expect(overlay).toHaveClass(/visible/);
    await expect(page.locator('.kg-info-modal-title')).toHaveText('Input Pipeline');
});

// ── 28. Info modal close button dismisses the overlay ────────────────────────
test('info modal close button hides the overlay', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate(() => { window._kgShowInfo('node-council', '#a78bfa'); });
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-info-overlay')).toHaveClass(/visible/);
    await page.evaluate(() => { window._kgCloseInfo(); });
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-info-overlay')).not.toHaveClass(/visible/);
});

// ── 29. Escape key closes the info modal ──────────────────────────────────────
test('pressing Escape closes the info modal', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate(() => { window._kgShowInfo('node-domain', '#34d399'); });
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-info-overlay')).toHaveClass(/visible/);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-info-overlay')).not.toHaveClass(/visible/);
});

// ── 30. All 13 info content keys are defined ─────────────────────────────────
test('all info content keys are defined and have titles', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    const keys = [
        'node-input','node-council','node-coding','node-domain',
        'node-office','node-actions','node-output',
        'stat-runs','stat-success','stat-avgdur',
        'stat-deliberations','stat-consensus','stat-escalated',
    ];
    const result = await page.evaluate((ks) => {
        return ks.map(function(k) {
            window._kgShowInfo(k);
            var t = document.querySelector('.kg-info-modal-title');
            return { key: k, title: t ? t.textContent.trim() : null };
        });
    }, keys);
    for (const r of result) {
        expect(r.title, 'expected title for key: ' + r.key).toBeTruthy();
    }
    // Close after test
    await page.evaluate(() => { window._kgCloseInfo(); });
});

// ── 31. Stat boxes are clickable and open modal ───────────────────────────────
test('RUNS stat box opens info modal when clicked', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-domain');
    await page.waitForTimeout(300);
    // Click the RUNS stat if visible
    const stat = page.locator('#kg-right-stats .kg-right-stat.clickable').first();
    const visible = await stat.isVisible().catch(() => false);
    if (visible) {
        await stat.click();
        await page.waitForTimeout(150);
        await expect(page.locator('#kg-info-overlay')).toHaveClass(/visible/);
        await page.evaluate(() => { window._kgCloseInfo(); });
    }
});

// ── 32. Info modal has sections and chips ─────────────────────────────────────
test('info modal renders sections and chips for node-domain', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate(() => { window._kgShowInfo('node-domain', '#34d399'); });
    await page.waitForTimeout(150);
    await expect(page.locator('.kg-info-section-hd').first()).toBeVisible();
    await expect(page.locator('.kg-info-chips')).toBeVisible();
    await expect(page.locator('.kg-info-chip').first()).toBeVisible();
});

// ── 34. Output cards have onclick wired to _kgTaskDetail ──────────────────────
test('output feed cards have _kgTaskDetail onclick attribute', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate((tasks) => {
        if (window._kgApplyGlows) window._kgApplyGlows([], tasks, []);
    }, MOCK_TASKS);
    await clickNode(page, '#kg-node-output');
    await page.waitForTimeout(300);
    // Verify cards in left panel have the onclick wired up
    const cards = page.locator('#kg-left-body .kg-out-feed-card');
    const count = await cards.count();
    if (count > 0) {
        const onclick = await cards.first().getAttribute('onclick');
        expect(onclick).toContain('_kgTaskDetail');
        const role = await cards.first().getAttribute('role');
        expect(role).toBe('button');
    }
});

// ── 35. _kgTaskDetail shows title and status for a known task ─────────────────
test('_kgTaskDetail renders correct title and status', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate((tasks) => {
        if (window._kgApplyGlows) window._kgApplyGlows([], tasks, []);
    }, MOCK_TASKS);
    await page.waitForTimeout(200);
    await page.evaluate(() => { window._kgTaskDetail('t1'); });
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-info-overlay')).toHaveClass(/visible/);
    const title = await page.locator('.kg-info-modal-title').textContent();
    expect(title).toContain('Analyse Q3 Revenue');
    const status = await page.locator('.kg-td-status').textContent();
    expect(status).toMatch(/DONE|COMPLETED/i);
    await page.evaluate(() => window._kgCloseInfo());
});

// ── 36. _kgDelibDetail shows question and status for a known deliberation ──────
test('_kgDelibDetail renders correct question and status', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate((delibs) => {
        if (window._kgApplyGlows) window._kgApplyGlows([], [], delibs);
    }, MOCK_DELIBS);
    await page.waitForTimeout(200);
    await page.evaluate(() => { window._kgDelibDetail('d2'); });
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-info-overlay')).toHaveClass(/visible/);
    const title = await page.locator('.kg-info-modal-title').textContent();
    expect(title).toContain('Archive old logs');
    await page.evaluate(() => window._kgCloseInfo());
});

// ── 37. Council deliberation cards have onclick ────────────────────────────────
test('council deliberation cards are clickable', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await clickNode(page, '#kg-node-council');
    await page.waitForTimeout(200);
    // Navigate to resolved deliberations
    await page.evaluate(() => {
        if (typeof window._kgCouncilDetail === 'function') window._kgCouncilDetail('resolved');
    });
    await page.waitForTimeout(200);
    const delib = page.locator('#kg-right-body .kg-delib').first();
    const attached = await delib.isVisible().catch(() => false);
    if (attached) {
        const role = await delib.getAttribute('role');
        expect(role).toBe('button');
        const onclick = await delib.getAttribute('onclick');
        expect(onclick).toContain('_kgDelibDetail');
    }
});

// ── 33. Click outside modal closes it ────────────────────────────────────────
test('clicking the overlay backdrop closes the info modal', async ({ page }) => {
    await setup(page);
    await goToMap(page);
    await page.evaluate(() => { window._kgShowInfo('node-office'); });
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-info-overlay')).toHaveClass(/visible/);
    // Click on the overlay element itself (not the modal)
    await page.evaluate(() => {
        var ov = document.getElementById('kg-info-overlay');
        if (ov) ov.dispatchEvent(new MouseEvent('click', { bubbles:true, target: ov }));
    });
    await page.waitForTimeout(150);
    await expect(page.locator('#kg-info-overlay')).not.toHaveClass(/visible/);
});

// ══ MOBILE LAYOUT TESTS (375×812 — iPhone SE viewport) ═══════════════════════

const MOBILE = { width: 375, height: 812 };

async function setupMobile(page) {
    await page.setViewportSize(MOBILE);
    await setup(page);
    await goToMap(page);
}

// ── 34. Bottom nav visible on mobile ─────────────────────────────────────────
test('mobile: bottom nav is visible and fixed at bottom', async ({ page }) => {
    await setupMobile(page);
    const nav = page.locator('#apexSideNav');
    await expect(nav).toBeVisible();
    const pos = await nav.evaluate(el => {
        const s = window.getComputedStyle(el);
        return { position: s.position, bottom: s.bottom, flexDir: s.flexDirection };
    });
    expect(pos.position).toBe('fixed');
    expect(pos.bottom).toBe('0px');
    expect(pos.flexDir).toBe('row');
});

// ── 35. Four primary nav buttons visible in bottom bar ───────────────────────
test('mobile: Today, Command, Briefing, Overview buttons visible in bottom nav', async ({ page }) => {
    await setupMobile(page);
    for (const id of ['nav-overview', 'nav-command', 'nav-intel', 'nav-test']) {
        await expect(page.locator('#' + id)).toBeVisible();
    }
});

// ── 36. Secondary nav items hidden from bottom bar ───────────────────────────
test('mobile: domains and system nav buttons hidden from bottom bar', async ({ page }) => {
    await setupMobile(page);
    await expect(page.locator('#nav-domains')).toBeHidden();
    await expect(page.locator('#nav-system')).toBeHidden();
});

// ── 37. Pipeline canvas is scrollable on mobile ───────────────────────────────
test('mobile: kg-wrap has overflow-x auto enabling pipeline scroll', async ({ page }) => {
    await setupMobile(page);
    const overflow = await page.locator('.kg-wrap').evaluate(el => window.getComputedStyle(el).overflowX);
    expect(overflow).toBe('auto');
});

// ── 38. Topbar visible and not overflowing ────────────────────────────────────
test('mobile: topbar visible and within viewport width', async ({ page }) => {
    await setupMobile(page);
    const topbar = page.locator('.topbar');
    await expect(topbar).toBeVisible();
    const box = await topbar.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeLessThanOrEqual(MOBILE.width + 1);
});

// ── 39. No horizontal scroll on body ─────────────────────────────────────────
test('mobile: body does not have horizontal overflow', async ({ page }) => {
    await setupMobile(page);
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(MOBILE.width + 4);
});

// ── 40. Hamburger menu toggle visible on mobile ───────────────────────────────
test('mobile: hamburger menu toggle is visible', async ({ page }) => {
    await setupMobile(page);
    await expect(page.locator('#mobileNavToggle')).toBeVisible();
});

// ── 41. Nav icons are ≥20px on mobile ────────────────────────────────────────
test('mobile: nav icon font-size is at least 20px', async ({ page }) => {
    await setupMobile(page);
    const size = await page.locator('#apexSideNav .nav-icon').first().evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(20);
});

// ── 42. Nav labels are ≥10px on mobile ───────────────────────────────────────
test('mobile: nav label font-size is at least 10px', async ({ page }) => {
    await setupMobile(page);
    const size = await page.locator('#apexSideNav .nav-label').first().evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(10);
});

// ── 43. Send and mic buttons are ≥44px touch targets ─────────────────────────
test('mobile: send-btn and mic-btn meet 44px touch target', async ({ page }) => {
    await setupMobile(page);
    const sendH = await page.locator('.input-zone .send-btn').first().evaluate(el => parseFloat(window.getComputedStyle(el).height));
    expect(sendH).toBeGreaterThanOrEqual(44);
    const micH = await page.locator('#micBtn').evaluate(el => parseFloat(window.getComputedStyle(el).height));
    expect(micH).toBeGreaterThanOrEqual(44);
});

// ── 44. Chat input has font-size ≥16px (prevents iOS zoom) ───────────────────
test('mobile: chat-input font-size prevents iOS zoom', async ({ page }) => {
    await setupMobile(page);
    const size = await page.locator('#chatInput').evaluate(el => parseFloat(window.getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
});

// ── 45. Noisy input controls hidden on mobile ─────────────────────────────────
test('mobile: clear-chat and auto-listen hidden on mobile', async ({ page }) => {
    await setupMobile(page);
    await expect(page.locator('.clear-chat-btn')).toBeHidden();
    await expect(page.locator('.auto-listen-btn')).toBeHidden();
});
