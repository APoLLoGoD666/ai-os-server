// playwright-v11d2-verify.js
// V-11-D2 TODAY DEFAULT + ENTRY-STATE COHERENCE — Playwright verification suite
// Tests: A–O (entry, hash, reload, role, pages, duplicate-call, regression)
// /api/me passes through; briefing routes mocked.
'use strict';
const { chromium } = require('playwright');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL   = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;
const APP_KEY    = process.env.APP_ACCESS_KEY || '';
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';

if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }

const MASTER_JWT = jwt.sign({ sub: MASTER_UUID, role: 'master', email: null, jti: 'v11d2-master' }, JWT_SECRET, { expiresIn: '2h' });
const USER_JWT   = jwt.sign({ sub: '00000000-0000-4000-8000-000000000002', role: 'user', email: 'test@test.com', jti: 'v11d2-user' }, JWT_SECRET, { expiresIn: '2h' });

const INBOX_POPULATED = {
    ok: true,
    inbox: {
        follow_ups:  [{ id:1, note:'Review contract', due_date:'2026-09-05' }],
        meetings:    [{ id:1, title:'Standup', start_time:'09:00:00' }],
        assignments: [{ id:1, module:'CS401', title:'Algorithm analysis', due_date:'2026-09-10' }],
        emails:      [{ id:1, sender:'client@co.com', subject:'Invoice', priority:'urgent' }],
    }
};
const BRIEF_POPULATED = {
    ok: true,
    generatedAt: new Date().toISOString(),
    briefing: {
        calendar:    { events: [{ title:'Morning review', start_time:'08:00:00', location:'Office' }] },
        emails:      { unread: [{ subject:'Offer', sender:'x@y.com' }] },
        finance:     { weekNet: 340, weekIncome: 800, weekExpenses: 460, overdueInvoices: [] },
        health:      { nutrition:[], sleep:{ hours:7.5, quality_score:8 }, workouts:[] },
        journal:     { latest: null },
        assignments: [{ title:'Stats coursework', due_date:'2026-09-10', completed:false }],
    }
};

const ALL_20_PAGES = ['overview','command','operation','system','finance','communication',
    'business','health','university','occult','research','civilisation','reality','activity',
    'agents','approvals','knowledge','intelligence','memory','governance'];

const MASTER_ONLY_PAGES = ['governance','reality','civilisation'];

function makeAuthCookies(token) {
    return [
        { name:'apex_session', value:'1',   domain:'localhost', path:'/', httpOnly:false },
        { name:'apex_token',   value:token, domain:'localhost', path:'/', httpOnly:true  },
    ];
}

async function makeContext(browser, token, w, h, storageState) {
    const opts = { viewport:{ width:w||1280, height:h||800 }, extraHTTPHeaders:{ 'x-app-key':APP_KEY } };
    if (storageState) opts.storageState = storageState;
    const ctx = await browser.newContext(opts);
    await ctx.addCookies(makeAuthCookies(token));
    return ctx;
}

async function routePage(page) {
    await page.route('**/api/**', route => {
        const url = route.request().url();
        if (url.includes('/api/me')) return route.continue();
        if (url.includes('/api/briefing/priority-inbox'))
            return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(INBOX_POPULATED) });
        if (url.includes('/api/briefing/today'))
            return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(BRIEF_POPULATED) });
        route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true }) });
    });
}

// Load dashboard with optional URL hash (e.g. '#command')
async function loadDash(browser, token, hash, w, h, storageState) {
    const ctx  = await makeContext(browser, token, w, h, storageState);
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('pageerror', e => consoleErrors.push(e.message));
    page.on('console',   m => { if (m.type()==='error' && !m.text().includes('fonts.g')) consoleErrors.push(m.text()); });
    await routePage(page);
    const url = BASE_URL + (hash || '');
    await page.goto(url, { waitUntil:'domcontentloaded', timeout:20000 });
    await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
    await page.waitForTimeout(500);
    return { page, ctx, consoleErrors };
}

// Load with briefing call counting
async function loadDashWithCallCount(browser, token) {
    const ctx  = await makeContext(browser, token);
    const page = await ctx.newPage();
    const calls = { inbox: 0, today: 0 };
    await page.route('**/api/**', route => {
        const url = route.request().url();
        if (url.includes('/api/me')) return route.continue();
        if (url.includes('/api/briefing/priority-inbox')) {
            calls.inbox++;
            return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(INBOX_POPULATED) });
        }
        if (url.includes('/api/briefing/today')) {
            calls.today++;
            return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(BRIEF_POPULATED) });
        }
        route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true }) });
    });
    await page.goto(BASE_URL, { waitUntil:'domcontentloaded', timeout:20000 });
    await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
    await page.waitForTimeout(800);
    return { page, ctx, calls };
}

const RESULTS = [];
let pass = 0, fail = 0;
function record(id, desc, ok, detail) {
    const status = ok ? 'PASS' : 'FAIL';
    if (ok) pass++; else fail++;
    RESULTS.push({ id, desc, status, detail: detail||'' });
    console.log(`  ${ok?'✓':'✗'} [${id}] ${desc}${detail?' — '+detail:''}`);
}

async function runTests() {
    const browser = await chromium.launch({ headless:true });

    // ── A: DEFAULT ENTRY ───────────────────────────────────────────────────
    console.log('\n[A] Default entry — TODAY on clean load (no hash, no localStorage)');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
        const overviewActive = await page.evaluate(() => {
            const p = document.getElementById('page-overview');
            return p && p.classList.contains('active');
        });
        const commandActive = await page.evaluate(() => {
            const p = document.getElementById('page-command');
            return p && p.classList.contains('active');
        });
        const hash = await page.evaluate(() => location.hash);
        record('A-1', 'page-overview has .active on default load',         overviewActive === true,  String(overviewActive));
        record('A-2', 'page-command does NOT have .active on default load', commandActive === false, String(commandActive));
        record('A-3', 'URL hash is #overview on default load',             hash === '#overview',     hash);
        await ctx.close();
    }

    // ── B: VALID HASH ROUTING ─────────────────────────────────────────────
    console.log('\n[B] Valid hash routing — direct hash loads correct page');
    {
        const cases = [
            { hash:'#command',      id:'page-command' },
            { hash:'#intelligence', id:'page-intelligence' },
            { hash:'#finance',      id:'page-finance' },
            { hash:'#governance',   id:'page-governance' },
        ];
        for (const c of cases) {
            const { page, ctx } = await loadDash(browser, MASTER_JWT, c.hash);
            const active = await page.evaluate(pid => {
                const p = document.getElementById(pid);
                return p && p.classList.contains('active');
            }, c.id);
            record('B-'+c.hash.slice(1).slice(0,3).toUpperCase(), `${c.hash} loads ${c.id} as active`, active === true, String(active));
            await ctx.close();
        }
    }

    // ── C: INVALID HASH FALLBACK ──────────────────────────────────────────
    console.log('\n[C] Invalid hash — falls back to TODAY');
    {
        for (const badHash of ['#nonexistent', '#__proto__', '#']) {
            const { page, ctx } = await loadDash(browser, MASTER_JWT, badHash);
            const overviewActive = await page.evaluate(() => {
                const p = document.getElementById('page-overview');
                return p && p.classList.contains('active');
            });
            record('C-'+badHash.slice(1,4)||'EMP', `hash "${badHash}" falls back to TODAY`, overviewActive === true, String(overviewActive));
            await ctx.close();
        }
    }

    // ── D: NAVIGATION HASH SYNC ───────────────────────────────────────────
    console.log('\n[D] Navigation hash sync — switchPage updates URL hash');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
        await page.evaluate(() => window.switchPage('command'));
        const h1 = await page.evaluate(() => location.hash);
        await page.evaluate(() => window.switchPage('intelligence'));
        const h2 = await page.evaluate(() => location.hash);
        await page.evaluate(() => window.switchPage('overview'));
        const h3 = await page.evaluate(() => location.hash);
        record('D-1', 'switchPage("command") sets #command hash',      h1 === '#command',      h1);
        record('D-2', 'switchPage("intelligence") sets #intelligence hash', h2 === '#intelligence', h2);
        record('D-3', 'switchPage("overview") sets #overview hash',    h3 === '#overview',     h3);
        await ctx.close();
    }

    // ── E: REPLACESTATE NOT PUSHSTATE ─────────────────────────────────────
    console.log('\n[E] replaceState semantics — history.length does not accumulate');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
        const lenBefore = await page.evaluate(() => history.length);
        await page.evaluate(() => {
            window.switchPage('command');
            window.switchPage('finance');
            window.switchPage('intelligence');
            window.switchPage('overview');
        });
        const lenAfter = await page.evaluate(() => history.length);
        record('E-1', 'history.length unchanged after 4 navigations (replaceState)', lenBefore === lenAfter, `before=${lenBefore} after=${lenAfter}`);
        await ctx.close();
    }

    // ── F: RELOAD COHERENCE ───────────────────────────────────────────────
    console.log('\n[F] Reload coherence — page persists across reload');
    {
        // Navigate to command, reload, verify still on command
        {
            const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
            await page.evaluate(() => window.switchPage('command'));
            await page.waitForTimeout(200);
            await page.reload({ waitUntil:'domcontentloaded', timeout:20000 });
            await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
            await page.waitForTimeout(500);
            const active = await page.evaluate(() => {
                const p = document.getElementById('page-command');
                return p && p.classList.contains('active');
            });
            const hash = await page.evaluate(() => location.hash);
            record('F-1', 'reload after navigating to command lands on command', active === true, `active=${active} hash=${hash}`);
            await ctx.close();
        }
        // Navigate to intelligence, reload, verify still on intelligence
        {
            const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
            await page.evaluate(() => window.switchPage('intelligence'));
            await page.waitForTimeout(200);
            await page.reload({ waitUntil:'domcontentloaded', timeout:20000 });
            await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
            await page.waitForTimeout(500);
            const active = await page.evaluate(() => {
                const p = document.getElementById('page-intelligence');
                return p && p.classList.contains('active');
            });
            record('F-2', 'reload after navigating to intelligence lands on intelligence', active === true, String(active));
            await ctx.close();
        }
    }

    // ── G: LOCALSTORAGE FALLBACK ──────────────────────────────────────────
    console.log('\n[G] localStorage apex_default_page fallback');
    {
        // Valid localStorage value — no hash
        {
            const storageState = {
                origins: [{ origin: BASE_URL, localStorage: [{ name:'apex_default_page', value:'finance' }] }]
            };
            const { page, ctx } = await loadDash(browser, MASTER_JWT, '', 1280, 800, storageState);
            const active = await page.evaluate(() => {
                const p = document.getElementById('page-finance');
                return p && p.classList.contains('active');
            });
            record('G-1', 'apex_default_page=finance → lands on finance (no hash)', active === true, String(active));
            await ctx.close();
        }
        // Hash takes precedence over localStorage
        {
            const storageState = {
                origins: [{ origin: BASE_URL, localStorage: [{ name:'apex_default_page', value:'finance' }] }]
            };
            const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command', 1280, 800, storageState);
            const active = await page.evaluate(() => {
                const p = document.getElementById('page-command');
                return p && p.classList.contains('active');
            });
            record('G-2', 'hash #command takes precedence over apex_default_page=finance', active === true, String(active));
            await ctx.close();
        }
        // Invalid localStorage value → TODAY fallback
        {
            const storageState = {
                origins: [{ origin: BASE_URL, localStorage: [{ name:'apex_default_page', value:'notapage' }] }]
            };
            const { page, ctx } = await loadDash(browser, MASTER_JWT, '', 1280, 800, storageState);
            const active = await page.evaluate(() => {
                const p = document.getElementById('page-overview');
                return p && p.classList.contains('active');
            });
            record('G-3', 'invalid apex_default_page → falls back to TODAY', active === true, String(active));
            await ctx.close();
        }
    }

    // ── H: MASTER ROLE ENTRY ──────────────────────────────────────────────
    console.log('\n[H] Master role — lands on TODAY');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
        const active = await page.evaluate(() => {
            const p = document.getElementById('page-overview');
            return p && p.classList.contains('active');
        });
        const hash = await page.evaluate(() => location.hash);
        record('H-1', 'Master: page-overview active on load', active === true, String(active));
        record('H-2', 'Master: URL hash is #overview on load', hash === '#overview', hash);
        await ctx.close();
    }

    // ── I: USER ROLE ENTRY ────────────────────────────────────────────────
    console.log('\n[I] User role — lands on TODAY');
    {
        const { page, ctx } = await loadDash(browser, USER_JWT, '');
        const active = await page.evaluate(() => {
            const p = document.getElementById('page-overview');
            return p && p.classList.contains('active');
        });
        const hash = await page.evaluate(() => location.hash);
        record('I-1', 'User: page-overview active on load', active === true, String(active));
        record('I-2', 'User: URL hash is #overview on load', hash === '#overview', hash);
        await ctx.close();
    }

    // ── J: ALL 20 PAGES REACHABLE ─────────────────────────────────────────
    console.log('\n[J] All 20 pages reachable via switchPage');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
        const results = await page.evaluate(pages => {
            return pages.map(name => {
                window.switchPage(name);
                const el = document.getElementById('page-' + name);
                return { name, found: !!el, active: el ? el.classList.contains('active') : false };
            });
        }, ALL_20_PAGES);
        const allOk = results.every(r => r.found && r.active);
        const failed = results.filter(r => !r.found || !r.active).map(r => r.name);
        record('J-1', 'All 20 pages reachable and become active', allOk, failed.length ? 'Failed: '+failed.join(',') : '20/20');
        await ctx.close();
    }

    // ── K: MASTER-ONLY PAGES HIDDEN FROM USER ─────────────────────────────
    console.log('\n[K] Master-only pages hidden from User role');
    {
        const { page, ctx } = await loadDash(browser, USER_JWT, '');
        for (const pg of MASTER_ONLY_PAGES) {
            const navVisible = await page.evaluate(name => {
                const btn = document.getElementById('nav-' + name);
                if (!btn) return false;
                const style = window.getComputedStyle(btn);
                return style.display !== 'none' && style.visibility !== 'hidden';
            }, pg);
            record('K-'+pg.slice(0,3).toUpperCase(), `nav-${pg} hidden from User`, navVisible === false, String(navVisible));
        }
        await ctx.close();
    }

    // ── L: NO DUPLICATE BRIEFING CALLS ───────────────────────────────────
    console.log('\n[L] No duplicate briefing API calls on boot');
    {
        const { page, ctx, calls } = await loadDashWithCallCount(browser, MASTER_JWT);
        record('L-1', '/api/briefing/priority-inbox called exactly once on boot', calls.inbox === 1, `called ${calls.inbox}x`);
        record('L-2', '/api/briefing/today called exactly once on boot',          calls.today === 1, `called ${calls.today}x`);
        await ctx.close();
    }

    // ── M: NO JS CONSOLE ERRORS ───────────────────────────────────────────
    console.log('\n[M] No JS console errors on boot');
    {
        const { ctx, consoleErrors } = await loadDash(browser, MASTER_JWT, '');
        record('M-1', 'No JS errors on load', consoleErrors.length === 0, consoleErrors.join(' | ') || 'clean');
        await ctx.close();
    }

    // ── N: D1 REGRESSION — TODAY SURFACE INTACT ───────────────────────────
    console.log('\n[N] D1 regression — TODAY surface renders correctly');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
        await page.waitForTimeout(500);
        const surfaceExists  = await page.locator('#today-surface').count() > 0;
        const needsExists    = await page.locator('#today-needs-panel').count() > 0;
        const noticedExists  = await page.locator('#today-noticed-panel').count() > 0;
        const activeExists   = await page.locator('#today-active-panel').count() > 0;
        const greetingExists = await page.locator('#ovr-greeting').count() > 0;
        record('N-1', '#today-surface exists in DOM',       surfaceExists,  String(surfaceExists));
        record('N-2', '#today-needs-panel exists',          needsExists,    String(needsExists));
        record('N-3', '#today-noticed-panel exists',        noticedExists,  String(noticedExists));
        record('N-4', '#today-active-panel exists',         activeExists,   String(activeExists));
        record('N-5', '#ovr-greeting exists',               greetingExists, String(greetingExists));
        await ctx.close();
    }

    // ── O: D1 REGRESSION — PANELS REACH READY STATE ───────────────────────
    console.log('\n[O] D1 regression — TODAY panels reach ready state with data');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
        await page.waitForTimeout(1500);
        const needsState   = await page.evaluate(() => { const el = document.getElementById('today-needs-panel'); return el ? el.getAttribute('data-apex-state') : null; });
        const noticedState = await page.evaluate(() => { const el = document.getElementById('today-noticed-panel'); return el ? el.getAttribute('data-apex-state') : null; });
        record('O-1', 'Needs You panel reaches ready state',  needsState === 'ready',   needsState);
        record('O-2', 'Noticed panel reaches ready state',    noticedState === 'ready', noticedState);
        await ctx.close();
    }

    await browser.close();

    // ── SUMMARY ───────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════════════════');
    console.log(`V-11-D2 RESULTS: ${pass} PASS / ${fail} FAIL / ${pass+fail} TOTAL`);
    console.log('════════════════════════════════════════════════════════');
    if (fail > 0) {
        console.log('\nFAILED:');
        RESULTS.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ✗ [${r.id}] ${r.desc} — ${r.detail}`));
    }
    console.log('');
    process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test runner error:', e); process.exit(1); });
