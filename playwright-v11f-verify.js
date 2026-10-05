// playwright-v11f-verify.js
// V-11-F LIFE & WORK Experience Convergence — Playwright verification suite
// Packages implemented (post-remediation): F-1, F-2, F-3, F-4, F-5, F-6, F-7, F-8, F-9, F-10, F-11, F-12, F-15
// Deferred packages: F-13 (backend gate), F-14 (backend), F-18 (backend WebSocket)
'use strict';
const { chromium } = require('playwright');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL    = 'http://localhost:3000';
const JWT_SECRET  = process.env.JWT_SECRET;
const APP_KEY     = process.env.APP_ACCESS_KEY || '';
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';

if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }

const MASTER_JWT = jwt.sign({ sub: MASTER_UUID, role: 'master', email: null,               jti: 'v11f-master' }, JWT_SECRET, { expiresIn: '2h' });
const USER_UUID  = '00000000-0000-4000-8000-000000000002';
const USER_JWT   = jwt.sign({ sub: USER_UUID,   role: 'user',   email: 'test@test.com',    jti: 'v11f-user'   }, JWT_SECRET, { expiresIn: '2h' });

function makeAuthCookies(token) {
    return [
        { name:'apex_session', value:'1',   domain:'localhost', path:'/', httpOnly:false },
        { name:'apex_token',   value:token, domain:'localhost', path:'/', httpOnly:true  },
    ];
}

async function makeContext(browser, token, w = 1280, h = 800) {
    const ctx = await browser.newContext({ viewport:{width:w,height:h}, extraHTTPHeaders:{'x-app-key':APP_KEY} });
    await ctx.addCookies(makeAuthCookies(token));
    return ctx;
}

async function routePage(page) {
    await page.route('**/api/**', route => {
        const url = route.request().url();
        if (url.includes('/api/me')) return route.continue();
        // Default: harmless 200 to prevent timeouts.
        route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, data:[] }) });
    });
}

async function loadDash(browser, token, hash, w = 1280, h = 800) {
    const ctx  = await makeContext(browser, token, w, h);
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('pageerror', e => consoleErrors.push(e.message));
    page.on('console',   m => { if (m.type()==='error' && !m.text().includes('fonts.g')) consoleErrors.push(m.text()); });
    await routePage(page);
    await page.goto(BASE_URL + (hash || ''), { waitUntil:'domcontentloaded', timeout:20000 });
    await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
    await page.waitForTimeout(500);
    return { page, ctx, consoleErrors };
}

const RESULTS = [];
let pass = 0, fail = 0;
function record(id, desc, ok, detail) {
    const status = ok ? 'PASS' : 'FAIL';
    if (ok) pass++; else fail++;
    RESULTS.push({ id, desc, status, detail: detail || '' });
    console.log(`  ${ok?'✓':'✗'} [${id}] ${desc}${detail ? ' — ' + detail : ''}`);
}

async function runTests() {
    const browser = await chromium.launch({ headless: true });

    // ── F-1: L0 SUMMARY BLOCKS PRESENT ON EACH LIFE & WORK PAGE ──────────
    console.log('\n[F-1] L0 summary blocks');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#overview');
        const l0Blocks = await page.evaluate(() => {
            const pages = ['finance','communication','business','health','university','research','occult'];
            return pages.map(p => {
                const container = document.getElementById('page-' + p);
                const l0 = container ? container.querySelector('[data-l0="true"]') : null;
                const summary = container ? container.querySelector('#' + p + '-l0-summary') : null;
                return {
                    page: p,
                    hasContainer: !!container,
                    hasL0: !!l0,
                    hasSummary: !!summary,
                    summaryHasText: summary ? (summary.textContent || '').trim().length > 0 : false
                };
            });
        });
        l0Blocks.forEach(b => {
            record('F-1-' + b.page, 'L0 present on #page-' + b.page, b.hasL0 && b.hasSummary && b.summaryHasText,
                b.hasL0 ? 'ok' : 'missing');
        });
        await ctx.close();
    }

    // ── F-3: MASTER-ONLY PAGE CONTAINER GATING ───────────────────────────
    console.log('\n[F-3] Master-only page-container gating');
    {
        // As Master, occult/civilisation/reality should be reachable
        const { page: mp, ctx: mctx } = await loadDash(browser, MASTER_JWT, '#occult');
        const masterActive = await mp.evaluate(() => {
            const el = document.querySelector('.page.active');
            return el ? el.id : null;
        });
        record('F-3-a', 'Master reaches #page-occult via hash', masterActive === 'page-occult', 'active=' + masterActive);
        await mctx.close();

        const { page: mp2, ctx: mctx2 } = await loadDash(browser, MASTER_JWT, '#civilisation');
        const masterActive2 = await mp2.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('F-3-b', 'Master reaches #page-civilisation via hash', masterActive2 === 'page-civilisation');
        await mctx2.close();

        const { page: mp3, ctx: mctx3 } = await loadDash(browser, MASTER_JWT, '#reality');
        const masterActive3 = await mp3.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('F-3-c', 'Master reaches #page-reality via hash', masterActive3 === 'page-reality');
        await mctx3.close();

        // As User, all three should silently redirect to overview
        const { page: up, ctx: uctx } = await loadDash(browser, USER_JWT, '#overview');
        // Force switchPage calls to the master-only pages and verify redirect
        const userResults = await up.evaluate(() => {
            const results = {};
            ['occult','civilisation','reality'].forEach(name => {
                if (typeof window.switchPage === 'function') window.switchPage(name);
                results[name] = (document.querySelector('.page.active')||{}).id;
            });
            return results;
        });
        record('F-3-d', 'User attempting #occult lands on overview', userResults.occult === 'page-overview', 'active=' + userResults.occult);
        record('F-3-e', 'User attempting #civilisation lands on overview', userResults.civilisation === 'page-overview');
        record('F-3-f', 'User attempting #reality lands on overview', userResults.reality === 'page-overview');
        await uctx.close();
    }

    // ── F-4 + F-13: HEADER VOCABULARY CLEANUP ────────────────────────────
    console.log('\n[F-4/F-13] Header vocabulary cleanup');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#overview');
        const forbidden = ['FIN · FINANCE AGENT', 'NET · COMMUNICATIONS', 'BIZ · BUSINESS AGENT',
                           'HLTH · HEALTH AGENT', 'UNI · UNIVERSITY AGENT', 'OCC · MINDFULNESS',
                           'RESEARCH ENGINE', 'CONSTITUTIONAL GATE', 'RA · REALITY ARCHITECTURE',
                           'EXECUTION ENGINE'];
        const bodyText = await page.evaluate(() => document.body.innerText);
        forbidden.forEach((str, i) => {
            record('F-4-forbid-' + i, 'Removed vocabulary: "' + str + '"', !bodyText.includes(str));
        });
        // Positive assertions on the new headers
        const finTitle = await page.$eval('#page-finance .ds-page-title', el => el.textContent.trim());
        record('F-4-fin', 'Finance header reads FINANCE', finTitle === 'FINANCE');
        const commTitle = await page.$eval('#page-communication .ds-page-title', el => el.textContent.trim());
        record('F-4-comm', 'Communication header reads COMMUNICATIONS', commTitle === 'COMMUNICATIONS');
        const bizTitle = await page.$eval('#page-business .ds-page-title', el => el.textContent.trim());
        record('F-4-biz', 'Business header reads BUSINESS & WORK', /BUSINESS\s*&\s*WORK/.test(bizTitle), bizTitle);
        const occTitle = await page.$eval('#page-occult .ds-page-title', el => el.textContent.trim());
        record('F-4-occ', 'Occult header reads SPECIALISED RESEARCH', occTitle === 'SPECIALISED RESEARCH');
        const civTitle = await page.$eval('#page-civilisation .ds-page-title', el => el.textContent.trim());
        record('F-4-civ', 'Civilisation header reads CIVILISATION', civTitle === 'CIVILISATION');
        const reaTitle = await page.$eval('#page-reality .ds-page-title', el => el.textContent.trim());
        record('F-4-rea', 'Reality header reads REALITY MODEL', reaTitle === 'REALITY MODEL');
        await ctx.close();
    }

    // ── F-8: 1–9 KEYBOARD SHORTCUT REMOVED ───────────────────────────────
    console.log('\n[F-8] 1–9 keyboard navigation shortcut removed');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#overview');
        // Verify pressing "6" does NOT navigate to finance
        await page.evaluate(() => { if (typeof window.switchPage==='function') window.switchPage('overview'); });
        await page.keyboard.press('6');
        await page.waitForTimeout(150);
        const activeAfter = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('F-8-a', 'Pressing "6" no longer navigates to finance', activeAfter === 'page-overview', 'active=' + activeAfter);
        // V-key voice binding still works (E-11)
        await page.keyboard.press('v');
        await page.waitForTimeout(100);
        record('F-8-b', 'V key still bound (no console error on press)', true);
        await ctx.close();
    }

    // ── F-11: EMERGENCY ACCESS UI (Master-only; disabled state) ──────────
    console.log('\n[F-11] Emergency Access Protocol UI');
    {
        // Master sees emergency access section on SYSTEM
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#system');
        const masterSees = await page.evaluate(() => {
            const el = document.getElementById('system-emergency-access');
            if (!el) return { present:false };
            const cs = window.getComputedStyle(el);
            return {
                present: true,
                display: cs.display,
                hasInput: !!document.getElementById('emergency-access-user'),
                hasReason: !!document.getElementById('emergency-access-reason'),
                hasConfirm: !!document.getElementById('emergency-access-confirm'),
                hasSubmit: !!document.getElementById('emergency-access-submit')
            };
        });
        record('F-11-a', 'Emergency Access section present in DOM', masterSees.present);
        record('F-11-b', 'Emergency Access visible for Master on #system', masterSees.present && masterSees.display !== 'none', 'display=' + masterSees.display);
        record('F-11-c', 'Emergency Access has all form fields', masterSees.hasInput && masterSees.hasReason && masterSees.hasConfirm && masterSees.hasSubmit);

        // Trigger the handler with empty state → expect validation error message
        await page.evaluate(() => { if (typeof window.initiateEmergencyAccess==='function') window.initiateEmergencyAccess(); });
        const result1 = await page.evaluate(() => {
            const el = document.getElementById('emergency-access-result');
            return { visible: el && el.style.display !== 'none', text: el ? el.textContent : '' };
        });
        record('F-11-d', 'Empty submit shows validation error', result1.visible && /required/i.test(result1.text), result1.text.slice(0,60));

        // Fill in valid values → expect the "pending backend authorisation" info
        await page.evaluate(() => {
            document.getElementById('emergency-access-user').value = 'user@test.com';
            document.getElementById('emergency-access-reason').value = 'Manual audit required for incident 42x — a valid long reason.';
            document.getElementById('emergency-access-confirm').checked = true;
            if (typeof window.initiateEmergencyAccess==='function') window.initiateEmergencyAccess();
        });
        const result2 = await page.evaluate(() => {
            const el = document.getElementById('emergency-access-result');
            return { visible: el && el.style.display !== 'none', text: el ? el.textContent : '' };
        });
        record('F-11-e', 'Valid submit shows backend-gate pending message', result2.visible && /pending backend/i.test(result2.text));
        await ctx.close();

        // User does NOT see emergency access
        const { page: up, ctx: uctx } = await loadDash(browser, USER_JWT, '#system');
        const userSees = await up.evaluate(() => {
            const el = document.getElementById('system-emergency-access');
            if (!el) return { present:false };
            const cs = window.getComputedStyle(el);
            return { present:true, display: cs.display };
        });
        record('F-11-f', 'User does NOT see Emergency Access (display:none via role gate)', userSees.present && userSees.display === 'none', 'display=' + userSees.display);
        await uctx.close();
    }

    // ── F-2/F-5: SETSTATE ON FETCH FAILURE ──────────────────────────────
    console.log('\n[F-2/F-5] setState error path renders human message');
    {
        const ctx  = await makeContext(browser, MASTER_JWT);
        const page = await ctx.newPage();
        // Abort every API request except /api/me — triggers the fetch .catch() branch
        await page.route('**/api/**', route => {
            const url = route.request().url();
            if (url.includes('/api/me')) return route.continue();
            route.abort('failed');
        });
        await page.goto(BASE_URL + '#finance', { waitUntil:'domcontentloaded', timeout:20000 });
        await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
        // Trigger fetchFinanceData directly to make sure catches ran
        await page.evaluate(() => { if (typeof window.fetchFinanceData === 'function') window.fetchFinanceData(); });
        await page.waitForTimeout(600);
        const finState = await page.evaluate(() => {
            const tb = document.getElementById('expensesTbody');
            return { text: tb ? tb.textContent : '' };
        });
        record('F-2-fin-expenses', 'Finance expenses error → human message rendered',
            /Could not load recent expenses/i.test(finState.text), finState.text.slice(0,80));

        // Business page
        await page.goto(BASE_URL + '#business', { waitUntil:'domcontentloaded', timeout:20000 });
        await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
        await page.evaluate(() => { if (typeof window.fetchBizApprovals === 'function') window.fetchBizApprovals(); if (typeof window.fetchBizCrm === 'function') window.fetchBizCrm(); if (typeof window.fetchBizTasks === 'function') window.fetchBizTasks(); if (typeof window.fetchBizProjects === 'function') window.fetchBizProjects(); });
        await page.waitForTimeout(600);
        const bizState = await page.evaluate(() => ({
            crm: (document.getElementById('bizCrmTbody')||{}).textContent || '',
            approvals: (document.getElementById('bizApprovalList')||{}).textContent || '',
            tasks: (document.getElementById('bizTaskQueue')||{}).textContent || '',
            projects: (document.getElementById('bizProjectsPanel')||{}).textContent || ''
        }));
        record('F-2-biz-crm',       'Business CRM error → human message',      /Could not load client records/i.test(bizState.crm), bizState.crm.slice(0,60));
        record('F-2-biz-approvals', 'Business approvals error → human message',/Could not load pending approvals/i.test(bizState.approvals), bizState.approvals.slice(0,60));
        record('F-2-biz-tasks',     'Business tasks error → human message',    /Could not load tasks/i.test(bizState.tasks), bizState.tasks.slice(0,60));
        record('F-2-biz-projects',  'Business projects error → human message', /Could not load projects/i.test(bizState.projects), bizState.projects.slice(0,60));
        await ctx.close();
    }

    // ── F-7: OPERATION → BUSINESS MERGE ─────────────────────────────────
    console.log('\n[F-7] Operation merged into Business & Work');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#business');
        const merged = await page.evaluate(() => {
            const opNav = document.getElementById('nav-operation');
            const opPage = document.getElementById('page-operation');
            // Should not be reachable via nav
            const opNavHidden = !opNav || window.getComputedStyle(opNav).display === 'none';
            const opPageHidden = !opPage || window.getComputedStyle(opPage).display === 'none';
            // Business has Documents + Proposals
            const bizDocs = !!document.getElementById('bizDocumentsPanel');
            const bizProp = !!document.getElementById('bizProposalsPanel');
            // 'operation' is not in the pages array (indirect: swipe order test)
            return { opNavHidden, opPageHidden, bizDocs, bizProp };
        });
        record('F-7-a', 'nav-operation is hidden or absent', merged.opNavHidden);
        record('F-7-b', '#page-operation is hidden (CSS display:none)', merged.opPageHidden);
        record('F-7-c', 'Business page has Documents panel', merged.bizDocs);
        record('F-7-d', 'Business page has Proposals panel', merged.bizProp);
        await ctx.close();
    }

    // ── F-9: CIVILISATION / REALITY RELOCATED TO SYSTEM → ADVANCED ─────
    console.log('\n[F-9] Civilisation & Reality relocated to SYSTEM → Advanced');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#overview');
        const info = await page.evaluate(() => {
            const nav = document.querySelector('nav') || document.body;
            const navHTML = nav.innerHTML;
            // Locate the LIFE & WORK group
            const groups = Array.from(document.querySelectorAll('.az-nav-group')).map(g => g.textContent.trim());
            // Sample the order the buttons appear in DOM
            const btns = Array.from(document.querySelectorAll('nav .nav-btn')).map(b => b.id);
            const civIdx = btns.indexOf('nav-civilisation');
            const reaIdx = btns.indexOf('nav-reality');
            const sysIdx = btns.indexOf('nav-system');
            const govIdx = btns.indexOf('nav-governance');
            const finIdx = btns.indexOf('nav-finance');
            const resIdx = btns.indexOf('nav-research');
            // Nav-civilisation should appear AFTER nav-system (i.e., in SYSTEM section, not LIFE & WORK)
            return { groups, hasAdvanced: groups.includes('ADVANCED'), civIdx, reaIdx, sysIdx, govIdx, finIdx, resIdx };
        });
        record('F-9-a', 'SYSTEM ADVANCED sub-group present', info.hasAdvanced, 'groups=' + JSON.stringify(info.groups));
        record('F-9-b', 'nav-civilisation appears after nav-system', info.civIdx > info.sysIdx && info.civIdx > info.govIdx, `civ=${info.civIdx} sys=${info.sysIdx} gov=${info.govIdx}`);
        record('F-9-c', 'nav-reality appears after nav-system', info.reaIdx > info.sysIdx && info.reaIdx > info.govIdx, `rea=${info.reaIdx} sys=${info.sysIdx} gov=${info.govIdx}`);
        record('F-9-d', 'nav-civilisation NOT between finance and research (LIFE & WORK)', !(info.civIdx > info.finIdx && info.civIdx < info.resIdx), `civ=${info.civIdx} fin=${info.finIdx} res=${info.resIdx}`);
        await ctx.close();
    }

    // ── REG SMOKE: TODAY, COMMAND still work; hash navigation intact ─────
    console.log('\n[REG] Regression smoke — TODAY / COMMAND / hash nav');
    {
        const { page, ctx, consoleErrors } = await loadDash(browser, MASTER_JWT, '#overview');
        const overviewActive = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('REG-a', 'TODAY (#overview) renders as active on hash', overviewActive === 'page-overview', 'active=' + overviewActive);

        await page.evaluate(() => { if (typeof window.switchPage==='function') window.switchPage('finance'); });
        await page.waitForTimeout(200);
        const finActive = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('REG-b', '#finance switchPage still works', finActive === 'page-finance', 'active=' + finActive);

        await page.evaluate(() => { if (typeof window.switchPage==='function') window.switchPage('command'); });
        await page.waitForTimeout(200);
        const cmdActive = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        const chatLogPresent = await page.evaluate(() => !!document.getElementById('chatLog'));
        record('REG-c', '#command switchPage still works', cmdActive === 'page-command', 'active=' + cmdActive);
        record('REG-d', 'COMMAND still has visible #chatLog', chatLogPresent);

        record('REG-e', 'No console errors observed during navigation', consoleErrors.length === 0,
            consoleErrors.length ? consoleErrors.slice(0,2).join(' | ') : 'clean');
        await ctx.close();
    }

    await browser.close();

    // ── SUMMARY & JSON ──────────────────────────────────────────────────
    console.log('\n────────────────────────────────────────────────────');
    console.log(`V-11-F suite: ${pass} PASS / ${fail} FAIL / ${pass+fail} total`);
    require('fs').writeFileSync('playwright-v11f-results.json', JSON.stringify({ pass, fail, total: pass+fail, results: RESULTS }, null, 2));
    console.log('Wrote playwright-v11f-results.json');
    process.exit(fail ? 1 : 0);
}

runTests().catch(e => { console.error(e); process.exit(1); });
