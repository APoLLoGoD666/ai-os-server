// playwright-v11d1-verify.js
// V-11-D1 Today + Navigation Semantics — Playwright verification suite
// Tests: A–P (label, content, states, regression, role, overflow, routes)
// Briefing routes are mocked per-scenario; /api/me passes through.
'use strict';
const { chromium } = require('playwright');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL    = 'http://localhost:3000';
const JWT_SECRET  = process.env.JWT_SECRET;
const APP_KEY     = process.env.APP_ACCESS_KEY || '';
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';

if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }

const MASTER_JWT = jwt.sign({ sub: MASTER_UUID, role: 'master', email: null, jti: 'v11d1-master' }, JWT_SECRET, { expiresIn: '2h' });
const USER_JWT   = jwt.sign({ sub: '00000000-0000-4000-8000-000000000002', role: 'user', email: 'test@test.com', jti: 'v11d1-user' }, JWT_SECRET, { expiresIn: '2h' });

const INBOX_POPULATED = {
    ok: true,
    inbox: {
        follow_ups:  [{ id:1, note:'Review contract draft', due_date:'2026-08-30' }],
        meetings:    [{ id:1, title:'Team standup', start_time:'09:00:00' }],
        assignments: [{ id:1, module:'CS401', title:'Algorithm analysis', due_date:'2026-09-05' }],
        emails:      [{ id:1, sender:'client@co.com', subject:'Invoice overdue', priority:'urgent' },
                      { id:2, sender:'uni@ac.uk',    subject:'Module guide',    priority:'normal' }],
    }
};
const INBOX_EMPTY = { ok: true, inbox: { follow_ups:[], meetings:[], assignments:[], emails:[] } };

const BRIEF_POPULATED = {
    ok: true,
    generatedAt: new Date().toISOString(),
    briefing: {
        calendar:    { events: [{ title:'Morning review', start_time:'08:00:00', location:'Office' },
                                { title:'Client call',    start_time:'14:00:00', location:null }] },
        emails:      { unread: [{ subject:'Offer', sender:'x@y.com' }, { subject:'Alert', sender:'a@b.com' }] },
        finance:     { weekNet: 340.50, weekIncome: 800, weekExpenses: 459.50, overdueInvoices: [{ title:'INV-001' }] },
        health:      { nutrition:[], sleep:{ hours:7.5, quality_score:8 }, workouts:[] },
        journal:     { latest: null },
        assignments: [{ title:'Statistics coursework', due_date:'2026-09-10', completed:false }],
    }
};
const BRIEF_EMPTY = {
    ok: true,
    generatedAt: new Date().toISOString(),
    briefing: {
        calendar:    { events: [] },
        emails:      { unread: [] },
        finance:     { weekNet: 0, weekIncome: 0, weekExpenses: 0, overdueInvoices: [] },
        health:      { nutrition:[], sleep:null, workouts:[] },
        journal:     { latest: null },
        assignments: [],
    }
};
const API_ERROR_RESP = { ok: false, error: 'DATABASE_UNAVAILABLE', message: 'DB error', requestId: 'test-err' };

function makeAuthCookies(token) {
    return [
        { name:'apex_session', value:'1',    domain:'localhost', path:'/', httpOnly:false },
        { name:'apex_token',   value:token,  domain:'localhost', path:'/', httpOnly:true  },
    ];
}

async function makeContext(browser, token, w = 1280, h = 800) {
    const ctx = await browser.newContext({ viewport:{width:w,height:h}, extraHTTPHeaders:{'x-app-key':APP_KEY} });
    await ctx.addCookies(makeAuthCookies(token));
    return ctx;
}

// Set up routes: /api/me passes through, briefing mocked per options, rest stubbed
async function routePage(page, opts) {
    opts = opts || {};
    const inboxBody  = opts.inboxError  ? API_ERROR_RESP : (opts.inboxEmpty  ? INBOX_EMPTY  : INBOX_POPULATED);
    const briefBody  = opts.briefError  ? API_ERROR_RESP : (opts.briefEmpty  ? BRIEF_EMPTY  : BRIEF_POPULATED);
    const inboxStatus = opts.inboxError  ? 500 : 200;
    const briefStatus = opts.briefError  ? 500 : 200;

    await page.route('**/api/**', route => {
        const url = route.request().url();
        if (url.includes('/api/me')) return route.continue();
        if (url.includes('/api/briefing/priority-inbox')) {
            return route.fulfill({ status:inboxStatus, contentType:'application/json', body:JSON.stringify(inboxBody) });
        }
        if (url.includes('/api/briefing/today')) {
            return route.fulfill({ status:briefStatus, contentType:'application/json', body:JSON.stringify(briefBody) });
        }
        route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true }) });
    });
}

async function loadDash(browser, token, opts, w = 1280, h = 800) {
    const ctx  = await makeContext(browser, token, w, h);
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('pageerror', e => consoleErrors.push(e.message));
    page.on('console',   m => { if (m.type()==='error' && !m.text().includes('fonts.g')) consoleErrors.push(m.text()); });
    await routePage(page, opts);
    await page.goto(BASE_URL, { waitUntil:'domcontentloaded', timeout:20000 });
    await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
    await page.waitForTimeout(400);
    return { page, ctx, consoleErrors };
}

const RESULTS = [];
let pass = 0, fail = 0;
function record(id, desc, ok, detail) {
    const status = ok ? 'PASS' : 'FAIL';
    if (ok) pass++; else fail++;
    RESULTS.push({ id, desc, status, detail: detail||'' });
    console.log(`  ${ok?'✓':'✗'} [${id}] ${desc}${detail?' — '+detail:''}`);
}

// ── navigate to overview page ──────────────────────────────────────────────
async function navToOverview(page) {
    await page.evaluate(() => window.switchPage('overview'));
    await page.waitForTimeout(600);
}

// ──────────────────────────────────────────────────────────────────────────
async function runTests() {
    const browser = await chromium.launch({ headless:true });

    // ── A: NAV LABELS ──────────────────────────────────────────────────────
    console.log('\n[A] Navigation label semantics');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, {});
        const todayLabel = await page.locator('#nav-overview .nav-label').textContent().catch(()=>'');
        const intelLabel = await page.locator('#nav-intelligence .nav-label').textContent().catch(()=>'');
        record('A-1', 'nav-overview label is "Today"',        todayLabel.trim() === 'Today',        todayLabel.trim());
        record('A-2', 'nav-intelligence label is "Intelligence"', intelLabel.trim() === 'Intelligence', intelLabel.trim());
        await ctx.close();
    }

    // ── B: TOPBAR PAGEMETА ─────────────────────────────────────────────────
    console.log('\n[B] pageMeta — topbar title/sub on overview');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, {});
        await navToOverview(page);
        const title = await page.locator('#topbar-pg-title').textContent().catch(()=>'');
        const sub   = await page.locator('#topbar-pg-sub').textContent().catch(()=>'');
        record('B-1', 'topbar title is "Today"',         title.trim() === 'Today',           title.trim());
        record('B-2', 'topbar sub is "What matters now"', sub.trim() === 'What matters now', sub.trim());
        await ctx.close();
    }

    // ── C: TODAY SURFACE STRUCTURE ─────────────────────────────────────────
    console.log('\n[C] TODAY surface structure');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, {});
        await navToOverview(page);
        const hasSurface  = await page.locator('#today-surface').count() > 0;
        const hasNeeds    = await page.locator('#today-needs-panel').count() > 0;
        const hasNoticed  = await page.locator('#today-noticed-panel').count() > 0;
        const hasSchedule = await page.locator('#today-active-panel').count() > 0;
        const hasGreeting = await page.locator('#ovr-greeting').count() > 0;
        const hasLegSep   = await page.locator('.td-legacy-sep').count() > 0;
        record('C-1', '#today-surface exists',            hasSurface);
        record('C-2', '#today-needs-panel exists',        hasNeeds);
        record('C-3', '#today-noticed-panel exists',      hasNoticed);
        record('C-4', '#today-active-panel exists',       hasSchedule);
        record('C-5', '#ovr-greeting exists and set',     hasGreeting && (await page.locator('#ovr-greeting').textContent()).length > 5);
        record('C-6', 'legacy separator present',         hasLegSep);
        await ctx.close();
    }

    // ── D: TODAY POPULATED STATE ───────────────────────────────────────────
    console.log('\n[D] TODAY panels — populated state');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, {});
        await navToOverview(page);
        await page.waitForTimeout(800);

        // NEEDS YOU
        const needsState  = await page.locator('#today-needs-panel').getAttribute('data-apex-state').catch(()=>'');
        const itemCount   = await page.locator('#today-needs-panel .td-item').count();
        record('D-1', 'NEEDS YOU panel is ready',         needsState === 'ready', needsState);
        record('D-2', 'NEEDS YOU has at least 1 item',    itemCount >= 1, String(itemCount));

        // APEX NOTICED
        const noticedState = await page.locator('#today-noticed-panel').getAttribute('data-apex-state').catch(()=>'');
        const noticedRows  = await page.locator('#today-noticed-panel .td-noticed-row').count();
        record('D-3', 'APEX NOTICED is ready',            noticedState === 'ready', noticedState);
        record('D-4', 'APEX NOTICED has insight rows',    noticedRows >= 1, String(noticedRows));

        // TODAY SCHEDULE
        const schedState = await page.locator('#today-active-panel').getAttribute('data-apex-state').catch(()=>'');
        const schedRows  = await page.locator('#today-active-panel .td-noticed-row').count();
        record('D-5', 'TODAY SCHEDULE is ready',          schedState === 'ready', schedState);
        record('D-6', 'TODAY SCHEDULE has rows',          schedRows >= 1, String(schedRows));
        await ctx.close();
    }

    // ── E: MAX 3 NEEDS YOU ITEMS ───────────────────────────────────────────
    console.log('\n[E] NEEDS YOU — max 3 items enforced');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, {});
        await navToOverview(page);
        await page.waitForTimeout(800);
        const itemCount = await page.locator('#today-needs-panel .td-item').count();
        record('E-1', 'NEEDS YOU shows max 3 items',      itemCount <= 3, String(itemCount));
        await ctx.close();
    }

    // ── F: EMPTY STATE ─────────────────────────────────────────────────────
    console.log('\n[F] TODAY panels — empty state');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, { inboxEmpty:true, briefEmpty:true });
        await navToOverview(page);
        await page.waitForTimeout(800);
        const needsState   = await page.locator('#today-needs-panel').getAttribute('data-apex-state').catch(()=>'');
        const noticedState = await page.locator('#today-noticed-panel').getAttribute('data-apex-state').catch(()=>'');
        const schedState   = await page.locator('#today-active-panel').getAttribute('data-apex-state').catch(()=>'');
        const needsText    = await page.locator('#today-needs-panel').textContent().catch(()=>'');
        record('F-1', 'NEEDS YOU empty — ready state (positive message)',  needsState === 'ready', needsState);
        record('F-2', 'NEEDS YOU empty — positive message shown',         needsText.includes('Nothing needs') || needsText.includes('attention'), needsText.trim().slice(0,60));
        record('F-3', 'NOTICED empty — empty state',       noticedState === 'empty', noticedState);
        record('F-4', 'SCHEDULE empty — empty state',      schedState   === 'empty', schedState);
        await ctx.close();
    }

    // ── G: FAILED STATE ────────────────────────────────────────────────────
    console.log('\n[G] TODAY panels — failed state');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, { inboxError:true, briefError:true });
        await navToOverview(page);
        await page.waitForTimeout(800);
        const needsState   = await page.locator('#today-needs-panel').getAttribute('data-apex-state').catch(()=>'');
        const noticedState = await page.locator('#today-noticed-panel').getAttribute('data-apex-state').catch(()=>'');
        const schedState   = await page.locator('#today-active-panel').getAttribute('data-apex-state').catch(()=>'');
        record('G-1', 'NEEDS YOU failed state on API error',    needsState   === 'failed', needsState);
        record('G-2', 'NOTICED failed state on API error',      noticedState === 'failed', noticedState);
        record('G-3', 'SCHEDULE failed state on API error',     schedState   === 'failed', schedState);
        await ctx.close();
    }

    // ── H: GOVERNANCE CONTENT PRESERVED ────────────────────────────────────
    console.log('\n[H] Legacy Governance/Overview content preserved');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, {});
        await navToOverview(page);
        const hasOvrPipeline = await page.locator('#ovr-pipeline').count() > 0;
        const pipelineHidden = await page.locator('#ovr-pipeline').evaluate(el => getComputedStyle(el).display === 'none').catch(()=>false);
        record('H-1', '#ovr-pipeline element still exists in DOM', hasOvrPipeline);
        record('H-2', '#ovr-pipeline remains CSS-hidden',           pipelineHidden);
        await ctx.close();
    }

    // ── I: BRIEFING API ROUTES CALLED ──────────────────────────────────────
    console.log('\n[I] Briefing routes called on overview navigation');
    {
        const ctx  = await makeContext(browser, MASTER_JWT);
        const page = await ctx.newPage();
        const called = { inbox:false, today:false };
        await page.route('**/api/**', route => {
            const url = route.request().url();
            if (url.includes('/api/me')) return route.continue();
            if (url.includes('/api/briefing/priority-inbox')) {
                called.inbox = true;
                return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(INBOX_EMPTY) });
            }
            if (url.includes('/api/briefing/today')) {
                called.today = true;
                return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(BRIEF_EMPTY) });
            }
            route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true }) });
        });
        await page.goto(BASE_URL, { waitUntil:'domcontentloaded', timeout:20000 });
        await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
        await page.waitForTimeout(400);
        // Boot lands on command, so no briefing calls yet
        const calledBeforeNav = { inbox:called.inbox, today:called.today };
        await navToOverview(page);
        await page.waitForTimeout(1000);
        record('I-1', '/api/briefing/priority-inbox called on nav to overview', called.inbox, called.inbox?'yes':'NOT called');
        record('I-2', '/api/briefing/today called on nav to overview',          called.today, called.today?'yes':'NOT called');
        await ctx.close();
    }

    // ── J: NO DUPLICATE BRIEFING CALLS ────────────────────────────────────
    console.log('\n[J] No duplicate briefing requests');
    {
        const ctx  = await makeContext(browser, MASTER_JWT);
        const page = await ctx.newPage();
        const counts = { inbox:0, today:0 };
        await page.route('**/api/**', route => {
            const url = route.request().url();
            if (url.includes('/api/me')) return route.continue();
            if (url.includes('/api/briefing/priority-inbox')) { counts.inbox++; return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(INBOX_EMPTY) }); }
            if (url.includes('/api/briefing/today')) { counts.today++; return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(BRIEF_EMPTY) }); }
            route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true }) });
        });
        await page.goto(BASE_URL, { waitUntil:'domcontentloaded', timeout:20000 });
        await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
        await page.waitForTimeout(800);
        // D2: overview is boot default — initOverviewPage fires once on boot, no extra nav needed
        record('J-1', '/api/briefing/priority-inbox called exactly once on boot', counts.inbox === 1, String(counts.inbox));
        record('J-2', '/api/briefing/today called exactly once on boot',          counts.today === 1, String(counts.today));
        await ctx.close();
    }

    // ── K: ROLE — USER ────────────────────────────────────────────────────
    console.log('\n[K] Role: User — label visibility, no master leakage');
    {
        const { page, ctx } = await loadDash(browser, USER_JWT, {});
        await navToOverview(page);
        await page.waitForTimeout(600);
        const todayLabel = await page.locator('#nav-overview .nav-label').textContent().catch(()=>'');
        const intelLabel = await page.locator('#nav-intelligence .nav-label').textContent().catch(()=>'');
        // Master-only nav items should be hidden
        const occultVis  = await page.locator('#nav-occult').isVisible().catch(()=>false);
        const agentsVis  = await page.locator('#nav-agents').isVisible().catch(()=>false);
        const govVis     = await page.locator('#nav-governance').isVisible().catch(()=>false);
        record('K-1', 'User: nav-overview label "Today"',        todayLabel.trim() === 'Today',        todayLabel.trim());
        record('K-2', 'User: nav-intelligence label "Intelligence"', intelLabel.trim() === 'Intelligence', intelLabel.trim());
        record('K-3', 'User: nav-occult hidden (master-only)',   !occultVis);
        record('K-4', 'User: nav-agents hidden (master-only)',   !agentsVis);
        record('K-5', 'User: nav-governance hidden (master-only)', !govVis);
        // TODAY content should render (user-scoped from backend)
        const needsState = await page.locator('#today-needs-panel').getAttribute('data-apex-state').catch(()=>'');
        record('K-6', 'User: today panels render (not forbidden)', needsState !== 'forbidden', needsState);
        await ctx.close();
    }

    // ── L: ROLE — MASTER ──────────────────────────────────────────────────
    console.log('\n[L] Role: Master — master-only pages accessible');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, {});
        const occultVis   = await page.locator('#nav-occult').isVisible().catch(()=>false);
        // V-11-H H-1: nav consolidated — #nav-agents/#nav-approvals/#nav-activity replaced by #nav-actions
        const actionsVis  = await page.locator('#nav-actions').isVisible().catch(()=>false);
        record('L-1', 'Master: nav-occult visible',   occultVis);
        record('L-2', 'Master: nav-actions visible (V-11-H consolidated)', actionsVis);
        record('L-3', 'Master: nav-actions visible (V-11-H consolidated)', actionsVis);
        await ctx.close();
    }

    // ── M: ALL 20 PAGES REACHABLE ─────────────────────────────────────────
    console.log('\n[M] All 20 pages reachable via switchPage');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, {});
        const pages = ['command','overview','operation','system','finance','communication','business','health',
                       'university','occult','research','civilisation','reality','activity','agents','approvals',
                       'knowledge','intelligence','memory','governance'];
        let allReachable = true;
        for (const p of pages) {
            await page.evaluate(name => window.switchPage(name), p);
            await page.waitForTimeout(100);
            const active = await page.locator('#page-'+p).getAttribute('class').catch(()=>'');
            if (!active.includes('active')) { allReachable = false; break; }
        }
        record('M-1', 'All 20 pages reachable via switchPage', allReachable);
        await ctx.close();
    }

    // ── N: REGRESSION — COMMAND PAGE ──────────────────────────────────────
    console.log('\n[N] Regression — command page unchanged');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, {});
        const hasOrb       = await page.locator('#cmdOrbCanvas, .cmd-orb-core, .cmd-orb-ring').count() > 0;
        const cmdExists    = await page.locator('#page-command').count() > 0;
        // N-1: D2 changed boot default to TODAY; command page exists but is not the boot-active page
        record('N-1', 'Command page exists in DOM (D2: TODAY is boot default)', cmdExists);
        record('N-2', 'PlasmaOrb element present',       hasOrb);
        await ctx.close();
    }

    // ── O: RESPONSIVE — DESKTOP ───────────────────────────────────────────
    console.log('\n[O] Responsive — no horizontal overflow');
    {
        const { page:p1, ctx:ctx1 } = await loadDash(browser, MASTER_JWT, {}, 1280, 800);
        await navToOverview(p1);
        await p1.waitForTimeout(600);
        const overflow1280 = await p1.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        record('O-1', 'No overflow at 1280px', !overflow1280, overflow1280?'OVERFLOW':'ok');
        await ctx1.close();

        const { page:p2, ctx:ctx2 } = await loadDash(browser, MASTER_JWT, {}, 390, 844);
        await navToOverview(p2);
        await p2.waitForTimeout(600);
        const overflow390 = await p2.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
        record('O-2', 'No overflow at 390px (mobile)', !overflow390, overflow390?'OVERFLOW':'ok');
        await ctx2.close();
    }

    // ── P: NO JS ERRORS ───────────────────────────────────────────────────
    console.log('\n[P] No uncaught JS errors or rejections');
    {
        const { page, ctx, consoleErrors } = await loadDash(browser, MASTER_JWT, {});
        await navToOverview(page);
        await page.waitForTimeout(800);
        record('P-1', 'No JS errors on overview page', consoleErrors.length === 0,
            consoleErrors.length > 0 ? consoleErrors.slice(0,2).join('; ') : 'clean');
        await ctx.close();
    }

    await browser.close();

    // ── SUMMARY ──────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log(`V-11-D1 Playwright: ${pass} PASS / ${fail} FAIL / ${pass+fail} total`);
    console.log('─'.repeat(60));

    const fs = require('fs');
    fs.writeFileSync('playwright-v11d1-results.json', JSON.stringify({
        suite:'V-11-D1-PLAYWRIGHT', date:new Date().toISOString(),
        pass, fail, total:pass+fail, results:RESULTS
    }, null, 2));
    console.log('Results written to playwright-v11d1-results.json');

    return fail;
}

runTests().then(f => process.exit(f > 0 ? 1 : 0)).catch(e => { console.error(e); process.exit(1); });
