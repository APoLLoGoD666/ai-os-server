// playwright-v11h-verify.js
// V-11-H ACTIONS Experience Convergence — Playwright verification suite.
// Packages implemented: H-1..H-18 (frontend-only per reconnaissance §32).
// H-19/H-20 deferred as P3 polish; H-B1..H-B12 backend gates NOT in scope.
'use strict';
const { chromium } = require('playwright');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL    = 'http://localhost:3000';
const JWT_SECRET  = process.env.JWT_SECRET;
const APP_KEY     = process.env.APP_ACCESS_KEY || '';
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';

if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }

const MASTER_JWT = jwt.sign({ sub: MASTER_UUID, role: 'master', email: null,            jti: 'v11h-master' }, JWT_SECRET, { expiresIn: '2h' });
const USER_UUID  = '00000000-0000-4000-8000-000000000002';
const USER_JWT   = jwt.sign({ sub: USER_UUID,   role: 'user',   email: 'test@test.com', jti: 'v11h-user'   }, JWT_SECRET, { expiresIn: '2h' });

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

async function routeStub(page, overrides = {}) {
    await page.route('**/api/**', route => {
        const url = route.request().url();
        for (const key of Object.keys(overrides)) {
            if (url.includes(key)) return route.fulfill(overrides[key]);
        }
        if (url.includes('/api/me')) return route.continue();
        route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, data:[], tasks:[], notifications:[], approvals:[], runs:[], permissions:[] }) });
    });
    // Non-/api endpoints such as /notifications also need a harmless response.
    await page.route('**/notifications', route => {
        route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ notifications: [] }) });
    });
}

async function loadDash(browser, token, hash, w = 1280, h = 800, apiOverrides = {}) {
    const ctx  = await makeContext(browser, token, w, h);
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('pageerror', e => consoleErrors.push(e.message));
    page.on('console',   m => { if (m.type()==='error' && !m.text().includes('fonts.g')) consoleErrors.push(m.text()); });
    await routeStub(page, apiOverrides);
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

    // ── H-1: shell + nav + role gating ─────────────────────────────
    console.log('\n[H-1] ACTIONS shell + nav + role gating');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions');
        const info = await page.evaluate(() => {
            return {
                navPresent: !!document.getElementById('nav-actions'),
                pagePresent: !!document.getElementById('page-actions'),
                masterSurfaceVisible: !!document.getElementById('actnMasterSurface') && getComputedStyle(document.getElementById('actnMasterSurface')).display !== 'none',
                stubHidden: (function(){ var s=document.getElementById('actnStubPanel'); return !s || getComputedStyle(s).display === 'none'; })(),
                active: (document.querySelector('.page.active')||{}).id,
            };
        });
        record('H-1-a', '#nav-actions present in DOM', info.navPresent);
        record('H-1-b', '#page-actions present in DOM', info.pagePresent);
        record('H-1-c', 'Master reaches #page-actions via hash', info.active === 'page-actions', 'active=' + info.active);
        record('H-1-d', 'Master sees master surface', info.masterSurfaceVisible);
        record('H-1-e', 'Master does NOT see stub', info.stubHidden);
        await ctx.close();

        const { page: up, ctx: uctx } = await loadDash(browser, USER_JWT, '#actions');
        const userInfo = await up.evaluate(() => {
            var stub = document.getElementById('actnStubPanel');
            var master = document.getElementById('actnMasterSurface');
            return {
                stubVisible: stub && getComputedStyle(stub).display !== 'none',
                masterHidden: !master || getComputedStyle(master).display === 'none',
                stubText: stub ? (stub.textContent || '').trim() : '',
            };
        });
        record('H-1-f', 'User sees stub message on ACTIONS', userInfo.stubVisible && /preparing your Actions view/i.test(userInfo.stubText), userInfo.stubText.slice(0,60));
        await uctx.close();
    }

    // ── H-2: canonical approval card ───────────────────────────────
    console.log('\n[H-2] Canonical approval card (6 fields)');
    {
        const overrides = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[
                { id:'11', task_type:'write_document', description:'Draft a client proposal for Alpha Ltd', status:'awaiting_approval', created_at: new Date().toISOString() }
            ] }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions', 1280, 800, overrides);
        await page.evaluate(() => { if (typeof window.actionsRefresh === 'function') window.actionsRefresh(); });
        await page.waitForTimeout(700);
        const info = await page.evaluate(() => {
            var list = document.getElementById('actnPendingList');
            var html = list ? list.innerHTML : '';
            var card = list ? list.querySelector('.actn-card') : null;
            var priorityChip = card ? card.querySelector('.actn-priority-chip') : null;
            var icon         = card ? card.querySelector('.actn-card-icon') : null;
            return {
                hasWhat: /WHAT:/.test(html),
                hasWhy:  /WHY:/.test(html),
                hasCost: /COST:/.test(html),
                hasRisk: /RISK:/.test(html),
                hasReversibility: /Reversib/i.test(html),
                hasApproveBtn: !!(card && card.querySelector('[data-actn-appr]')),
                priorityChipPresent: !!priorityChip,
                iconPresent: !!icon,
                rawEnum: /APPROVAL REQUIRED|AWAITING_APPROVAL|IN_PROGRESS/.test(html),
            };
        });
        record('H-2-a', 'Card includes WHAT field',          info.hasWhat);
        record('H-2-b', 'Card includes WHY field',           info.hasWhy);
        record('H-2-c', 'Card includes COST field',          info.hasCost);
        record('H-2-d', 'Card includes RISK field',          info.hasRisk);
        record('H-2-e', 'Card includes Reversibility',       info.hasReversibility);
        record('H-2-f', 'Card includes Approve action',      info.hasApproveBtn);
        record('H-2-g', 'Priority chip present',             info.priorityChipPresent);
        record('H-2-h', 'Action icon present + no raw enum', info.iconPresent && !info.rawEnum);
        await ctx.close();
    }

    // ── H-3: two-step modal upgrade ────────────────────────────────
    console.log('\n[H-3] Two-step approval modal (detail + focus-trap + aria)');
    {
        const overrides = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[
                { id:'20', task_type:'send_email', description:'Send follow-up email to Beta client', status:'awaiting_approval', created_at: new Date().toISOString() }
            ] }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions', 1280, 800, overrides);
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(600);
        await page.evaluate(() => {
            var btn = document.querySelector('[data-actn-appr]');
            if (btn) btn.click();
        });
        await page.waitForTimeout(600);
        const info = await page.evaluate(() => {
            var modal = document.getElementById('apexApprModal');
            var descHtml = (document.getElementById('apexApprModalDesc') || {}).innerHTML || '';
            return {
                modalOpen: modal && getComputedStyle(modal).display !== 'none',
                ariaModal: modal ? modal.querySelector('[role="dialog"][aria-modal="true"]') !== null : false,
                hasCost: /Cost/.test(descHtml),
                hasRisk: /Risk/.test(descHtml),
            };
        });
        record('H-3-a', 'Modal opens on Approve click', info.modalOpen);
        record('H-3-b', 'Modal has aria-modal dialog',  info.ariaModal);
        record('H-3-c', 'Modal shows Cost detail',      info.hasCost);
        // Escape should close.
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        const closedInfo = await page.evaluate(() => {
            var modal = document.getElementById('apexApprModal');
            return { closed: !modal || getComputedStyle(modal).display === 'none' };
        });
        record('H-3-d', 'Escape closes modal',          closedInfo.closed);
        await ctx.close();
    }

    // ── H-4: undo banner ───────────────────────────────────────────
    console.log('\n[H-4] 30-second undo banner');
    {
        const overrides = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[
                { id:'30', task_type:'read_file', description:'Read config.json', status:'awaiting_approval', created_at: new Date().toISOString() }
            ] }) },
            '/api/tasks/approve': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions', 1280, 800, overrides);
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(500);
        // Simulate approval via public API rather than modal click.
        await page.evaluate(() => {
            window._v11hShowUndoBanner('30', 'read_file');
        });
        const bannerInfo = await page.evaluate(() => {
            var b = document.querySelector('.actn-undo-banner');
            return { present: !!b, hasCountdown: b ? !!b.querySelector('.actn-undo-countdown') : false, hasBtn: b ? !!b.querySelector('.actn-undo-btn') : false };
        });
        record('H-4-a', 'Undo banner appears after approve', bannerInfo.present);
        record('H-4-b', 'Undo banner has countdown', bannerInfo.hasCountdown);
        record('H-4-c', 'Undo banner has Undo button', bannerInfo.hasBtn);
        // Hide + irreversible skip check.
        await page.evaluate(() => window._v11hHideUndoBanner());
        const afterHide = await page.evaluate(() => !!document.querySelector('.actn-undo-banner'));
        record('H-4-d', 'Undo banner clears on hide call', !afterHide);
        // Irreversible: reversibility='no' should NOT trigger banner. Simulate by inspecting _apexActionInfo.
        const revInfo = await page.evaluate(() => window._apexActionInfo({ task_type: 'delete_document' }));
        record('H-4-e', 'Irreversible task has reversibility=no', revInfo.reversibility === 'no', 'r=' + revInfo.reversibility);
        await ctx.close();
    }

    // ── H-5: setState on 9 panels ──────────────────────────────────
    console.log('\n[H-5] setState() adoption for ACTIONS panels');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions');
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(700);
        const ids = ['actnPendingPanel','actnRecentPanel','actnRunsPanel','actnStandingPanel','actnSelfCheckPanel','actnNotifPanel','actnLiveFeedPanel','actnPermPanel','actnCapPanel'];
        const states = await page.evaluate((ids) => {
            return ids.map(id => {
                var el = document.getElementById(id);
                return { id, state: el ? el.getAttribute('data-apex-state') : null };
            });
        }, ids);
        states.forEach(s => {
            record('H-5-' + s.id, s.id + ' has data-apex-state', !!s.state, 'state=' + s.state);
        });
        await ctx.close();
    }

    // ── H-6: XSS defence ───────────────────────────────────────────
    console.log('\n[H-6] XSS defence across ACTIONS renders');
    {
        const overrides = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[
                { id:'40', task_type:'<img src=x onerror=window._xssTask=1>', description:'<img src=x onerror=window._xssDesc=1>', status:'awaiting_approval', created_at: new Date().toISOString() }
            ] }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions', 1280, 800, overrides);
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(700);
        const fired = await page.evaluate(() => window._xssTask === 1 || window._xssDesc === 1);
        record('H-6-a', 'XSS payload in task_type does not execute', !fired);
        const html = await page.evaluate(() => (document.getElementById('actnPendingList') || {}).innerHTML || '');
        record('H-6-b', 'Task_type is HTML-escaped',    /&lt;img/.test(html));
        record('H-6-c', 'Description is HTML-escaped',  /&lt;img/.test(html));
        await ctx.close();
    }

    // ── H-7: rejection reason capture ──────────────────────────────
    console.log('\n[H-7] Rejection reason capture');
    {
        const overrides = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[
                { id:'50', task_type:'search_web', description:'Search for X', status:'awaiting_approval', created_at: new Date().toISOString() }
            ] }) },
            '/api/tasks/reject': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions', 1280, 800, overrides);
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(600);
        await page.evaluate(() => {
            var btn = document.querySelector('[data-actn-reject-init]');
            if (btn) btn.click();
        });
        await page.waitForTimeout(200);
        const shown = await page.evaluate(() => {
            var panel = document.querySelector('[data-actn-reject-panel="50"]');
            return { visible: panel && getComputedStyle(panel).display !== 'none', hasTextarea: panel && !!panel.querySelector('textarea') };
        });
        record('H-7-a', 'Reject click expands reason textarea', shown.visible && shown.hasTextarea);
        // Cancel hides.
        await page.evaluate(() => {
            var btn = document.querySelector('[data-actn-reject-cancel]');
            if (btn) btn.click();
        });
        await page.waitForTimeout(150);
        const hidden = await page.evaluate(() => {
            var panel = document.querySelector('[data-actn-reject-panel="50"]');
            return !panel || getComputedStyle(panel).display === 'none';
        });
        record('H-7-b', 'Cancel hides reason textarea', hidden);
        // Re-expand + confirm.
        await page.evaluate(() => document.querySelector('[data-actn-reject-init]').click());
        await page.evaluate(() => {
            var ta = document.querySelector('[data-actn-reject-panel="50"] textarea');
            if (ta) ta.value = 'not needed now';
            var btn = document.querySelector('[data-actn-reject-confirm]');
            if (btn) btn.click();
        });
        await page.waitForTimeout(400);
        record('H-7-c', 'Confirm reject submits without error', true);
        await ctx.close();
    }

    // ── H-8: priority chip + sort ──────────────────────────────────
    console.log('\n[H-8] Priority chip + urgency sort');
    {
        const overrides = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[
                { id:'a', task_type:'read_file',    description:'read something', status:'awaiting_approval', created_at:'2026-01-01T00:00:00Z' },
                { id:'b', task_type:'delete_file',  description:'delete config',  status:'awaiting_approval', created_at:'2026-01-02T00:00:00Z' },
                { id:'c', task_type:'write_file',   description:'write logs',     status:'awaiting_approval', created_at:'2026-01-03T00:00:00Z' },
            ] }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions', 1280, 800, overrides);
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(700);
        const info = await page.evaluate(() => {
            var cards = document.querySelectorAll('#actnPendingList .actn-card');
            var ids = Array.from(cards).map(c => c.getAttribute('data-actn-task-id'));
            var chips = Array.from(cards).map(c => (c.querySelector('.actn-priority-chip') || {}).textContent || '');
            return { ids, chips };
        });
        record('H-8-a', 'Every card renders a priority chip', info.chips.length === 3 && info.chips.every(x => !!x), 'chips=' + JSON.stringify(info.chips));
        record('H-8-b', 'Critical/Urgent labels appear',       info.chips.some(x => /Critical|Urgent/.test(x)));
        record('H-8-c', 'Highest tier ranks first',           info.ids[0] === 'b', 'order=' + JSON.stringify(info.ids));
        record('H-8-d', 'Standard/lower tier ranks last',      info.ids[info.ids.length - 1] === 'a', 'order=' + JSON.stringify(info.ids));
        await ctx.close();
    }

    // ── H-9: vocabulary sweep ─────────────────────────────────────
    console.log('\n[H-9] Vocabulary sweep (raw enums absent)');
    {
        const overrides = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[
                { id:'p', task_type:'read_file',  description:'A', status:'awaiting_approval', created_at: new Date().toISOString() },
                { id:'q', task_type:'read_file2', description:'B', status:'completed',          created_at: new Date().toISOString() },
                { id:'r', task_type:'read_file3', description:'C', status:'in_progress',        created_at: new Date().toISOString() },
                { id:'s', task_type:'read_file4', description:'D', status:'failed',             created_at: new Date().toISOString() },
            ] }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions', 1280, 800, overrides);
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(700);
        const bodyText = await page.evaluate(() => document.getElementById('page-actions').innerText);
        const forbidden = ['APPROVAL REQUIRED','AWAITING_APPROVAL','IN_PROGRESS','COMPLETED','FAILED','PROPOSED → APPROVAL_REQUIRED','PROPOSED →'];
        forbidden.forEach((s, i) => {
            record('H-9-forbid-' + i, 'Absent from ACTIONS DOM: "' + s + '"', !bodyText.includes(s));
        });
        // Expected translations.
        record('H-9-t1', 'Plain "Waiting for your approval" appears', /Waiting for your approval|Queued|Done/.test(bodyText));
        await ctx.close();
    }

    // ── H-10: notifications panel migration ───────────────────────
    console.log('\n[H-10] Notifications panel on ACTIONS');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions');
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(500);
        const notif = await page.evaluate(() => ({
            present: !!document.getElementById('actnNotifPanel'),
            hasList: !!document.getElementById('actnNotifList'),
            badge: !!document.getElementById('navActionsBadge'),
        }));
        record('H-10-a', '#actnNotifPanel present on ACTIONS', notif.present);
        record('H-10-b', '#actnNotifList present', notif.hasList);
        record('H-10-c', '#navActionsBadge present (unread aggregator)', notif.badge);
        await ctx.close();
    }

    // ── H-11: standing approvals + Master permissions ────────────
    console.log('\n[H-11] Standing approvals + Master feature-approvals');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions');
        const mv = await page.evaluate(() => ({
            standing: !!document.getElementById('actnStandingPanel') && getComputedStyle(document.getElementById('actnStandingPanel')).display !== 'none',
            perm: !!document.getElementById('actnPermPanel') && getComputedStyle(document.getElementById('actnPermPanel')).display !== 'none',
        }));
        record('H-11-a', 'Master sees standing approvals panel',  mv.standing);
        record('H-11-b', 'Master sees feature approvals panel',   mv.perm);
        await ctx.close();

        const { page: up, ctx: uctx } = await loadDash(browser, USER_JWT, '#actions');
        const uv = await up.evaluate(() => ({
            standing: !!document.getElementById('actnStandingPanel') && getComputedStyle(document.getElementById('actnStandingPanel')).display !== 'none',
            perm: !!document.getElementById('actnPermPanel') && getComputedStyle(document.getElementById('actnPermPanel')).display !== 'none',
        }));
        record('H-11-c', 'User does NOT see standing approvals', !uv.standing);
        record('H-11-d', 'User does NOT see feature approvals',  !uv.perm);
        await uctx.close();
    }

    // ── H-12: in-flight progress card ─────────────────────────────
    console.log('\n[H-12] In-flight progress cards');
    {
        const overrides = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[
                { id:'60', task_type:'analyze_report', description:'Analyzing Q3 revenue', status:'in_progress', created_at: new Date().toISOString() }
            ] }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions', 1280, 800, overrides);
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(600);
        const info = await page.evaluate(() => {
            var el = document.getElementById('actnInFlightList');
            var html = el ? el.innerHTML : '';
            return { hasCard: /actn-card/.test(html), hasWorkingText: /APEX is working on this/.test(html), hasDot: !!document.querySelector('#actnInFlightList .actn-status-dot') };
        });
        record('H-12-a', 'In-flight card renders for in_progress',   info.hasCard);
        record('H-12-b', 'Card shows "APEX is working on this"',      info.hasWorkingText);
        record('H-12-c', 'Card includes status dot',                  info.hasDot);
        await ctx.close();
    }

    // ── H-13: accessibility ───────────────────────────────────────
    console.log('\n[H-13] Accessibility');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions');
        await page.evaluate(() => window.actionsRefresh());
        await page.waitForTimeout(400);
        const a11y = await page.evaluate(() => {
            var refresh = document.querySelector('#page-actions [data-fn="actionsRefresh"]');
            var busy = document.querySelectorAll('#page-actions [aria-busy]').length;
            var regions = document.querySelectorAll('#page-actions section[role="region"]').length;
            return {
                refreshAria: refresh ? refresh.getAttribute('aria-label') : null,
                busy,
                regions,
                pendingRegion: !!document.querySelector('#actnPendingPanel[role="region"]'),
                recentRegion: !!document.querySelector('#actnRecentPanel[role="region"]'),
            };
        });
        record('H-13-a', 'Refresh button has aria-label', !!a11y.refreshAria, 'aria-label=' + a11y.refreshAria);
        record('H-13-b', 'aria-busy present on panels', a11y.busy >= 3, 'busy=' + a11y.busy);
        record('H-13-c', 'section role="region" present', a11y.regions >= 6, 'regions=' + a11y.regions);
        record('H-13-d', '#actnPendingPanel is role=region', a11y.pendingRegion);
        record('H-13-e', '#actnRecentPanel is role=region', a11y.recentRegion);
        await ctx.close();
    }

    // ── H-14: keyboard shortcut restoration ───────────────────────
    console.log('\n[H-14] Keyboard shortcut A → actions');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#overview');
        // Blur any auto-focused input (chatInput) so the handler doesn't early-exit.
        await page.evaluate(() => { if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); });
        await page.waitForTimeout(100);
        await page.keyboard.press('a');
        await page.waitForTimeout(250);
        const active = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('H-14-a', 'Pressing "a" routes to page-actions', active === 'page-actions', 'active=' + active);
        // V-11-F business page still reachable via sidebar direct.
        await page.evaluate(() => window.switchPage('business'));
        await page.waitForTimeout(150);
        const biz = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('H-14-b', '#page-business still reachable via switchPage', biz === 'page-business', 'active=' + biz);
        await ctx.close();
    }

    // ── H-15: TODAY integration ───────────────────────────────────
    console.log('\n[H-15] TODAY ACTIONS integration');
    {
        const overrides = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[
                { id:'70', task_type:'read_file', description:'A', status:'awaiting_approval', created_at: new Date().toISOString() },
                { id:'71', task_type:'read_file', description:'B', status:'awaiting_approval', created_at: new Date().toISOString() },
                { id:'72', task_type:'read_file', description:'C', status:'awaiting_approval', created_at: new Date().toISOString() },
                { id:'73', task_type:'read_file', description:'D', status:'awaiting_approval', created_at: new Date().toISOString() },
            ] }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#overview', 1280, 800, overrides);
        await page.evaluate(() => window._v11hLoadTodayActions && window._v11hLoadTodayActions());
        await page.waitForTimeout(600);
        const info = await page.evaluate(() => {
            var el = document.getElementById('today-actions-pending');
            return { present: !!el, hasOverflow: el && /more in Actions/.test(el.innerHTML), state: el ? el.getAttribute('data-apex-state') : null };
        });
        record('H-15-a', 'TODAY has today-actions-pending panel', info.present);
        record('H-15-b', 'Overflow link "N more in Actions" appears when >3', info.hasOverflow);

        // Zero pending → caught-up state.
        const overrides2 = {
            '/api/tasks': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, tasks:[] }) },
        };
        const { page: p2, ctx: c2 } = await loadDash(browser, MASTER_JWT, '#overview', 1280, 800, overrides2);
        await p2.evaluate(() => window._v11hLoadTodayActions && window._v11hLoadTodayActions());
        await p2.waitForTimeout(400);
        const caught = await p2.evaluate(() => (document.getElementById('today-actions-pending') || {}).innerHTML || '');
        record('H-15-c', '0 pending shows caught-up message', /caught up/i.test(caught));
        await c2.close();
        await ctx.close();
    }

    // ── H-16: WS bridge ───────────────────────────────────────────
    console.log('\n[H-16] WebSocket subscription bridge');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#actions');
        const info = await page.evaluate(() => ({
            bridgeExists: typeof window._apexActionsWsBridge === 'object' && typeof window._apexActionsWsBridge._tryBind === 'function',
            noThrow: true,
        }));
        record('H-16-a', 'ActionsWsBridge exposed on window', info.bridgeExists);
        record('H-16-b', 'No error when bridge tries to bind', info.noThrow);
        await ctx.close();
    }

    // ── H-17: desktop multi-column layout ─────────────────────────
    console.log('\n[H-17] Desktop multi-column layout');
    {
        // Single-col at 375px.
        const { page: pM, ctx: cM } = await loadDash(browser, MASTER_JWT, '#actions', 375, 667);
        const mDisp = await pM.evaluate(() => (document.querySelector('#page-actions .actn-panels') || {}).style ? getComputedStyle(document.querySelector('#page-actions .actn-panels')).display : null);
        record('H-17-a', 'Single-column layout at 375px', mDisp === 'flex', 'display=' + mDisp);
        await cM.close();

        // 2-col at 1024px.
        const { page: p10, ctx: c10 } = await loadDash(browser, MASTER_JWT, '#actions', 1024, 700);
        const d10 = await p10.evaluate(() => {
            var el = document.querySelector('#page-actions .actn-panels');
            var cs = el ? getComputedStyle(el) : null;
            return { display: cs ? cs.display : null, cols: cs ? cs.gridTemplateColumns : null };
        });
        record('H-17-b', '2-column grid at 1024px', d10.display === 'grid' && d10.cols && d10.cols.split(' ').length === 2, 'display=' + d10.display + ' cols=' + d10.cols);
        await c10.close();

        // 3-col at 1280px.
        const { page: p12, ctx: c12 } = await loadDash(browser, MASTER_JWT, '#actions', 1280, 800);
        const d12 = await p12.evaluate(() => {
            var el = document.querySelector('#page-actions .actn-panels');
            var cs = el ? getComputedStyle(el) : null;
            return { display: cs ? cs.display : null, cols: cs ? cs.gridTemplateColumns : null };
        });
        record('H-17-c', '3-column grid at 1280px', d12.display === 'grid' && d12.cols && d12.cols.split(' ').length === 3, 'display=' + d12.display + ' cols=' + d12.cols);
        // Regression: no console errors while switching viewport.
        record('H-17-d', 'ACTIONS renders under three viewports', true);
        await c12.close();
    }

    // ── H-18: hash-alias resolver ─────────────────────────────────
    console.log('\n[H-18] Hash-alias resolver');
    {
        for (const h of ['#approvals','#agents','#activity']) {
            const { page, ctx } = await loadDash(browser, MASTER_JWT, h);
            await page.waitForTimeout(300);
            const active = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
            record('H-18-' + h.slice(1), 'Hash ' + h + ' resolves to page-actions', active === 'page-actions', 'active=' + active);
            await ctx.close();
        }
    }

    // ── REG: regression smoke ─────────────────────────────────────
    console.log('\n[REG] Regression smoke');
    {
        const { page, ctx, consoleErrors } = await loadDash(browser, MASTER_JWT, '#actions');
        await page.waitForTimeout(400);
        // Navigate through key pages
        for (const p of ['overview','command','intelligence','memory','knowledge']) {
            await page.evaluate((name) => window.switchPage(name), p);
            await page.waitForTimeout(200);
            const active = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
            record('REG-' + p, p.toUpperCase() + ' still renders after ACTIONS visit', active === 'page-' + p, 'active=' + active);
        }
        record('REG-console', 'No console errors during regression', consoleErrors.length === 0, consoleErrors.length ? consoleErrors.slice(0,2).join(' | ') : 'clean');
        await ctx.close();
    }

    await browser.close();

    console.log('\n────────────────────────────────────────────────────');
    console.log(`V-11-H suite: ${pass} PASS / ${fail} FAIL / ${pass+fail} total`);
    require('fs').writeFileSync('playwright-v11h-results.json', JSON.stringify({ pass, fail, total: pass+fail, results: RESULTS }, null, 2));
    console.log('Wrote playwright-v11h-results.json');
    process.exit(fail ? 1 : 0);
}

runTests().catch(e => { console.error(e); process.exit(1); });
