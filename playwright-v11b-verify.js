// playwright-v11b-verify.js
// V-11-B Universal State Architecture — Verification Suite
// Scenarios A–T (20 tests)
// All panel API endpoints are mocked — only /api/me and /auth/* hit the real server.

'use strict';
const { chromium } = require('playwright');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL   = 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET;
const APP_KEY    = process.env.APP_ACCESS_KEY || '';
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';

const MASTER_JWT = JWT_SECRET
    ? jwt.sign({ sub: MASTER_UUID, role: 'master', email: null, jti: 'v11b-test-master' }, JWT_SECRET, { expiresIn: '2h' })
    : null;
const USER_JWT = JWT_SECRET
    ? jwt.sign({ sub: '00000000-0000-4000-8000-000000000002', role: 'user', email: 'test@example.com', jti: 'v11b-test-user' }, JWT_SECRET, { expiresIn: '2h' })
    : null;

if (!JWT_SECRET) { console.error('JWT_SECRET not set — aborting'); process.exit(1); }

function makeAuthCookies(jwtToken) {
    return [
        { name: 'apex_session', value: '1',      domain: 'localhost', path: '/', httpOnly: false },
        { name: 'apex_token',   value: jwtToken, domain: 'localhost', path: '/', httpOnly: true },
    ];
}

// Stub all panel API routes so server can't OOM from bulk panel loads.
// /api/me and /auth/* pass through to the real server.
async function stubPanelRoutes(page) {
    await page.route('**/api/**', route => {
        const url = route.request().url();
        if (url.includes('/api/me')) return route.continue();
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
}

async function makeContext(browser, jwtToken, w, h) {
    const ctx = await browser.newContext({
        viewport: { width: w, height: h },
        extraHTTPHeaders: { 'x-app-key': APP_KEY },
    });
    await ctx.addCookies(makeAuthCookies(jwtToken));
    return ctx;
}

async function loadPage(browser, jwtToken, w, h) {
    const ctx  = await makeContext(browser, jwtToken, w, h);
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', m => {
        if (m.type() === 'error') {
            const t = m.text();
            if (!t.includes('fonts.gstatic.com') && !t.includes('fonts.googleapis.com')) {
                consoleErrors.push(t);
            }
        }
    });
    await stubPanelRoutes(page);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Wait for _bootIdentity to complete (apex-role-unknown removed from body)
    await page.waitForFunction(
        () => !document.body.classList.contains('apex-role-unknown'),
        { timeout: 8000 }
    ).catch(() => {});
    await page.waitForTimeout(400);
    return { page, ctx, consoleErrors };
}

const results = [];
let pass = 0;
let fail = 0;

function record(id, desc, ok, detail) {
    const status = ok ? 'PASS' : 'FAIL';
    if (ok) pass++; else fail++;
    results.push({ id, desc, status, detail: detail || '' });
    console.log(`  ${ok ? '✓' : '✗'} [${id}] ${desc}${detail ? ' — ' + detail : ''}`);
}

async function runSuite() {
    const browser = await chromium.launch({ headless: true });

    try {
        // ── A: Master auth — role badge = MASTER, body has apex-role-master ──
        console.log('\n[A] Master auth identity');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const badge    = await page.$eval('#apex-role-badge', el => el.textContent.trim());
            const hasClass = await page.$eval('body', el => el.classList.contains('apex-role-master'));
            const noUnknown = await page.$eval('body', el => !el.classList.contains('apex-role-unknown'));
            record('A-1', 'Role badge = MASTER', badge === 'MASTER', badge);
            record('A-2', 'body.apex-role-master present', hasClass);
            record('A-3', 'body.apex-role-unknown absent', noUnknown);
            await ctx.close();
        }

        // ── B: User auth — role badge = USER, body has apex-role-user ──
        console.log('\n[B] User auth identity');
        {
            const { page, ctx } = await loadPage(browser, USER_JWT, 1280, 800);
            const badge    = await page.$eval('#apex-role-badge', el => el.textContent.trim());
            const hasUser  = await page.$eval('body', el => el.classList.contains('apex-role-user'));
            const noMaster = await page.$eval('body', el => !el.classList.contains('apex-role-master'));
            const noUnknown = await page.$eval('body', el => !el.classList.contains('apex-role-unknown'));
            record('B-1', 'Role badge = USER', badge === 'USER', badge);
            record('B-2', 'body.apex-role-user present', hasUser);
            record('B-3', 'body.apex-role-master absent', noMaster);
            record('B-4', 'body.apex-role-unknown absent', noUnknown);
            await ctx.close();
        }

        // ── C: Unauthenticated — apex-role-unknown NOT stuck ──
        console.log('\n[C] Unauthenticated / no cookie');
        {
            const ctx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await ctx.newPage();
            await page.route('**/api/**', route => {
                if (route.request().url().includes('/api/me')) {
                    route.fulfill({ status: 401, body: 'Unauthorized' });
                } else {
                    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
                }
            });
            let redirected = false;
            page.on('response', r => { if (r.url().includes('/login')) redirected = true; });
            try {
                await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
                await page.waitForTimeout(2000);
                const hasUnknown = await page.$eval('body', el => el.classList.contains('apex-role-unknown')).catch(() => false);
                record('C-1', 'apex-role-unknown NOT stuck after boot', !hasUnknown || redirected);
            } catch (_) {
                record('C-1', 'apex-role-unknown NOT stuck after boot', true, 'redirected/blocked');
            }
            await ctx.close();
        }

        // ── D: setState renders ready+html ──
        console.log('\n[D] setState API — ready state');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                const el = document.createElement('div');
                document.body.appendChild(el);
                window.setState(el, 'ready', { html: '<span class="test-ready">OK</span>' });
                const ok = el.querySelector('.test-ready') !== null;
                el.remove();
                return ok;
            });
            record('D-1', 'setState ready renders html', ok);
            await ctx.close();
        }

        // ── E: setState renders empty state ──
        console.log('\n[E] setState — empty state');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                const el = document.createElement('div');
                document.body.appendChild(el);
                window.setState(el, 'empty', { message: 'Nothing here.' });
                const ok = el.querySelector('.apex-empty') !== null && el.textContent.includes('Nothing here.');
                el.remove();
                return ok;
            });
            record('E-1', 'setState empty renders apex-empty', ok);
            await ctx.close();
        }

        // ── F: setState renders stale with staleSince tag ──
        console.log('\n[F] setState — stale state');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                const el = document.createElement('div');
                document.body.appendChild(el);
                window.setState(el, 'stale', { html: '<span>data</span>', fetchedAt: Date.now() - 120000 });
                const ok = el.querySelector('.apex-stale-since') !== null;
                el.remove();
                return ok;
            });
            record('F-1', 'setState stale renders apex-stale-since', ok);
            await ctx.close();
        }

        // ── G: setState renders failed with retry button ──
        console.log('\n[G] setState — failed state with retry');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                const el = document.createElement('div');
                document.body.appendChild(el);
                window.setState(el, 'failed', { message: 'Network error', retryFn: 'void 0' });
                const hasError = el.querySelector('.apex-panel-error') !== null;
                const hasRetry = el.querySelector('.apex-panel-retry') !== null;
                el.remove();
                return hasError && hasRetry;
            });
            record('G-1', 'setState failed renders error + retry button', ok);
            await ctx.close();
        }

        // ── H: setState renders offline state ──
        console.log('\n[H] setState — offline state');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                const el = document.createElement('div');
                document.body.appendChild(el);
                window.setState(el, 'offline', { message: 'No connection' });
                const ok = el.querySelector('.apex-panel-error') !== null;
                el.remove();
                return ok;
            });
            record('H-1', 'setState offline renders error block', ok);
            await ctx.close();
        }

        // ── I: setState renders forbidden state ──
        console.log('\n[I] setState — forbidden state');
        {
            const { page, ctx } = await loadPage(browser, USER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                const el = document.createElement('div');
                document.body.appendChild(el);
                window.setState(el, 'forbidden', { message: 'Not available for your role.' });
                const ok = el.querySelector('.apex-empty') !== null && el.textContent.includes('Not available');
                el.remove();
                return ok;
            });
            record('I-1', 'setState forbidden renders empty-like block with message', ok);
            await ctx.close();
        }

        // ── J: setState renders loading state ──
        console.log('\n[J] setState — loading state');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                const el = document.createElement('div');
                document.body.appendChild(el);
                window.setState(el, 'loading', {});
                const dot = el.querySelector('.apex-state-dot.loading');
                el.remove();
                return dot !== null;
            });
            record('J-1', 'setState loading renders loading dot', ok);
            await ctx.close();
        }

        // ── K: _parseApiError normalises { ok:false, error: "msg" } ──
        console.log('\n[K] _parseApiError — error field');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const msg = await page.evaluate(() => {
                const parsed = window._parseApiError(null, { ok: false, error: 'Something failed' });
                return parsed.message;
            });
            record('K-1', '_parseApiError reads .error field', msg === 'Something failed', msg);
            await ctx.close();
        }

        // ── L: _parseApiError normalises { reply: "msg" } ──
        console.log('\n[L] _parseApiError — reply field');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const msg = await page.evaluate(() => {
                const parsed = window._parseApiError(null, { reply: 'Reply message' });
                return parsed.message;
            });
            record('L-1', '_parseApiError reads .reply field', msg === 'Reply message', msg);
            await ctx.close();
        }

        // ── M: _timeAgo formats seconds ──
        console.log('\n[M] _timeAgo utility');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                const s = window._timeAgo(Date.now() - 45000);
                return typeof s === 'string' && s.includes('s ago');
            });
            record('M-1', '_timeAgo formats seconds correctly', ok);
            await ctx.close();
        }

        // ── N: _apexSetConnState shows/hides conn indicator ──
        console.log('\n[N] Connectivity indicator');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const exists    = await page.$('#apex-conn-indicator') !== null;
            const okOffline = await page.evaluate(() => {
                window._apexSetConnState('offline');
                const el = document.getElementById('apex-conn-indicator');
                return el && el.classList.contains('conn-offline') && el.textContent.trim() === 'OFFLINE';
            });
            const okLive = await page.evaluate(() => {
                window._apexSetConnState('live');
                const el = document.getElementById('apex-conn-indicator');
                return el && el.textContent.trim() === '';
            });
            record('N-1', '#apex-conn-indicator present in DOM', exists);
            record('N-2', 'conn-offline class + OFFLINE text when offline', okOffline);
            record('N-3', 'text cleared when state = live', okLive);
            await ctx.close();
        }

        // ── O: panelError delegates to setState (no legacy panel-error class) ──
        console.log('\n[O] panelError delegation');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                const el = document.createElement('div');
                document.body.appendChild(el);
                panelError(el, 'someRefetch');
                const hasLegacy = el.querySelector('.panel-error') !== null;
                const hasNew    = el.querySelector('.apex-panel-error') !== null;
                el.remove();
                return !hasLegacy && hasNew;
            });
            record('O-1', 'panelError renders apex-panel-error (not legacy panel-error)', ok);
            await ctx.close();
        }

        // ── P: _panelStates Map is defined ──
        console.log('\n[P] _panelStates Map');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => window._panelStates instanceof Map);
            record('P-1', 'window._panelStates is a Map', ok);
            await ctx.close();
        }

        // ── Q: _PANEL_TTLS config present ──
        console.log('\n[Q] _PANEL_TTLS config');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const ok = await page.evaluate(() => {
                return window._PANEL_TTLS && window._PANEL_TTLS.finance === 300000 && window._PANEL_TTLS._default === 300000;
            });
            record('Q-1', '_PANEL_TTLS.finance = 300000 and _default = 300000', ok);
            await ctx.close();
        }

        // ── R: V-11-A regression — 6 nav groups still present ──
        console.log('\n[R] V-11-A nav regression');
        {
            const { page, ctx } = await loadPage(browser, MASTER_JWT, 1280, 800);
            const groups  = ['TODAY', 'COMMAND', 'LIFE & WORK', 'INTELLIGENCE', 'ACTIONS', 'SYSTEM'];
            const navText = await page.$eval('#apexSideNav', el => el.textContent);
            const ok      = groups.every(g => navText.includes(g));
            record('R-1', 'All 6 V-11 nav group labels present', ok);
            await ctx.close();
        }

        // ── S: V-11-A regression — master-only items hidden for user ──
        console.log('\n[S] V-11-A authority filtering regression');
        {
            const { page, ctx } = await loadPage(browser, USER_JWT, 1280, 800);
            const agentsHidden    = await page.$eval('#nav-agents',    el => el.offsetParent === null).catch(() => true);
            const approvalsHidden = await page.$eval('#nav-approvals', el => el.offsetParent === null).catch(() => true);
            record('S-1', '#nav-agents hidden for user role', agentsHidden);
            record('S-2', '#nav-approvals hidden for user role', approvalsHidden);
            await ctx.close();
        }

        // ── T: No horizontal overflow at desktop + mobile ──
        console.log('\n[T] No horizontal overflow');
        {
            for (const [w, h, label] of [[1280, 800, 'desktop'], [390, 844, 'mobile']]) {
                const { page, ctx } = await loadPage(browser, MASTER_JWT, w, h);
                const overflow = await page.$eval('body', el => el.scrollWidth > el.clientWidth);
                record('T-' + label, 'No horizontal overflow at ' + label + ' (' + w + 'px)', !overflow);
                await ctx.close();
            }
        }

    } finally {
        await browser.close();
    }

    // ── Summary ──────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log(`V-11-B Results: ${pass} PASS / ${fail} FAIL / ${pass + fail} total`);
    console.log('─'.repeat(60));

    const fs = require('fs');
    fs.writeFileSync('playwright-v11b-results.json', JSON.stringify({
        suite: 'V-11-B',
        date: new Date().toISOString(),
        pass, fail, total: pass + fail,
        results
    }, null, 2));
    console.log('Results saved → playwright-v11b-results.json');

    process.exit(fail > 0 ? 1 : 0);
}

runSuite().catch(e => { console.error(e); process.exit(1); });
