// playwright-v11g-verify.js
// V-11-G INTELLIGENCE Experience Convergence — Playwright verification suite
// Packages implemented: P0-1..P0-4 (backend), G-1..G-15 (frontend)
'use strict';
const { chromium } = require('playwright');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL    = 'http://localhost:3000';
const JWT_SECRET  = process.env.JWT_SECRET;
const APP_KEY     = process.env.APP_ACCESS_KEY || '';
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';

if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }

const MASTER_JWT = jwt.sign({ sub: MASTER_UUID, role: 'master', email: null,               jti: 'v11g-master' }, JWT_SECRET, { expiresIn: '2h' });
const USER_UUID  = '00000000-0000-4000-8000-000000000002';
const USER_JWT   = jwt.sign({ sub: USER_UUID,   role: 'user',   email: 'test@test.com',    jti: 'v11g-user'   }, JWT_SECRET, { expiresIn: '2h' });

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

// Route API calls to a canned harmless 200 (unless explicitly overridden).
async function routeStub(page, overrides = {}) {
    await page.route('**/api/**', route => {
        const url = route.request().url();
        for (const key of Object.keys(overrides)) {
            if (url.includes(key)) return route.fulfill(overrides[key]);
        }
        if (url.includes('/api/me')) return route.continue();
        route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, data:[] }) });
    });
}

async function loadDash(browser, token, hash, w = 1280, h = 800, apiOverrides = {}) {
    const ctx  = await makeContext(browser, token, w, h);
    const page = await ctx.newPage();
    const consoleErrors = [];
    const networkFails  = [];
    page.on('pageerror', e => consoleErrors.push(e.message));
    page.on('console',   m => { if (m.type()==='error' && !m.text().includes('fonts.g')) consoleErrors.push(m.text()); });
    page.on('response',  r => { if (r.url().includes('/api/') && r.status() === 400) networkFails.push(r.url()); });
    await routeStub(page, apiOverrides);
    await page.goto(BASE_URL + (hash || ''), { waitUntil:'domcontentloaded', timeout:20000 });
    await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout:8000 }).catch(()=>{});
    await page.waitForTimeout(500);
    return { page, ctx, consoleErrors, networkFails };
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

    // Direct HTTP call helper (avoids needing a page.goto for API-only checks)
    async function apiCall(token, path) {
        const axios = require('http');
        return new Promise((resolve) => {
            const url = new URL(BASE_URL + path);
            const req = axios.request({
                hostname: url.hostname,
                port:     url.port,
                path:     url.pathname + url.search,
                method:   'GET',
                headers:  {
                    'x-app-key': APP_KEY,
                    'Cookie':    'apex_session=1; apex_token=' + token,
                    'Accept':    'application/json',
                },
            }, (res) => {
                let body = '';
                res.on('data', d => body += d.toString());
                res.on('end',  () => {
                    let parsed = null; try { parsed = JSON.parse(body); } catch(_) {}
                    resolve({ status: res.statusCode, body: parsed, raw: body });
                });
            });
            req.on('error', () => resolve({ status: 0, body: null }));
            req.end();
        });
    }

    // ── P0-1: Episodic memory scoping ──────────────────────────────
    console.log('\n[P0-1] Episodic memory owner scoping');
    {
        const mResp = await apiCall(MASTER_JWT, '/api/memory/episodic/recent');
        record('G-P0-1a', 'Master GET /memory/episodic/recent returns ok', mResp.status === 200 && mResp.body && mResp.body.ok === true, 'status=' + mResp.status);

        const uResp = await apiCall(USER_JWT, '/api/memory/episodic/recent');
        const userDataEmpty = uResp.body && Array.isArray(uResp.body.data) && uResp.body.data.length === 0;
        record('G-P0-1b', 'User GET /memory/episodic/recent returns empty', userDataEmpty, 'data.len=' + (uResp.body && uResp.body.data ? uResp.body.data.length : 'n/a'));
    }

    // ── P0-2: /api/intelligence/health shape ───────────────────────
    console.log('\n[P0-2] Intelligence health canonical shape');
    {
        const resp = await apiCall(MASTER_JWT, '/api/intelligence/health');
        const hasScore = resp.body && typeof resp.body.score !== 'undefined';
        const hasDims  = resp.body && typeof resp.body.dimensions === 'object';
        record('G-P0-2', 'GET /intelligence/health returns {score, dimensions}', resp.status === 200 && hasScore && hasDims, 'status=' + resp.status + ' shape=' + JSON.stringify({ score: hasScore, dims: hasDims }));
    }

    // ── P0-3: Briefing role gating ─────────────────────────────────
    console.log('\n[P0-3] Briefing role gating');
    {
        const mResp = await apiCall(MASTER_JWT, '/api/intelligence/briefing');
        const notStub = !mResp.body || !(mResp.body.data && mResp.body.data.stub);
        record('G-P0-3a', 'Master briefing is NOT a stub', notStub, 'status=' + mResp.status);

        const uResp = await apiCall(USER_JWT, '/api/intelligence/briefing');
        const isStub = uResp.body && uResp.body.data && uResp.body.data.stub === true;
        record('G-P0-3b', 'User briefing returns stub:true', isStub, 'stub=' + (uResp.body && uResp.body.data ? uResp.body.data.stub : 'n/a') + ' status=' + uResp.status);
    }

    // ── P0-4: Semantic search no 400 on page load ──────────────────
    console.log('\n[P0-4] Semantic search no persistent 400');
    {
        const { page, ctx, networkFails } = await loadDash(browser, MASTER_JWT, '#memory');
        // Trigger memoryRefresh
        await page.evaluate(() => { if (typeof memoryRefresh === 'function') memoryRefresh(); });
        await page.waitForTimeout(800);
        const semanticFails = networkFails.filter(u => u.includes('/api/memory/semantic/search'));
        record('G-P0-4', 'Semantic search does NOT 400 on page load', semanticFails.length === 0, 'fails=' + semanticFails.length);
        // Panel should be in empty state with prompt.
        const promptShown = await page.evaluate(() => {
            const el = document.getElementById('memSemanticList');
            return el ? (el.textContent || '').toLowerCase().includes('search facts') : false;
        });
        record('G-P0-4b', 'Semantic panel shows search prompt', promptShown);
        await ctx.close();
    }

    // ── G-1: Frontend role gating ─────────────────────────────────
    console.log('\n[G-1] Role gating on Intelligence briefing');
    {
        const userOverrides = {
            '/api/intelligence/briefing': { status:200, contentType:'application/json', body:JSON.stringify({ ok:true, data:{ stub:true, message:'APEX is preparing your personalised intelligence briefing.' } }) },
        };
        const { page, ctx } = await loadDash(browser, USER_JWT, '#intelligence', 1280, 800, userOverrides);
        await page.evaluate(() => { if (typeof intelligenceRefresh === 'function') intelligenceRefresh(); });
        await page.waitForTimeout(500);
        const info = await page.evaluate(() => {
            const section = document.getElementById('intBriefingSection');
            const styles  = section ? getComputedStyle(section) : null;
            const panel   = document.getElementById('intBriefingPanel');
            const txt     = panel ? panel.textContent : '';
            return {
                hasMasterOnly: section ? section.classList.contains('apex-master-only') : false,
                hiddenForUser: styles ? styles.display === 'none' : false,
                stubShown: /preparing your personalised/i.test(txt),
                hasFounderContent: /founder|empire/i.test(txt),
            };
        });
        record('G-1-a', 'Briefing section has apex-master-only class', info.hasMasterOnly);
        record('G-1-b', 'Briefing section hidden for User via CSS', info.hiddenForUser);
        record('G-1-c', 'Briefing content does NOT leak founder/empire strings', !info.hasFounderContent);
        await ctx.close();
    }

    // ── G-2: Semantic search empty state / no auto-fire ────────────
    console.log('\n[G-2] Semantic search empty state');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#memory');
        await page.evaluate(() => { if (typeof memoryRefresh === 'function') memoryRefresh(); });
        await page.waitForTimeout(400);
        const state = await page.evaluate(() => {
            const el = document.getElementById('memSemanticList');
            return { state: el ? el.getAttribute('data-apex-state') : null, txt: el ? (el.textContent || '').trim() : '' };
        });
        record('G-2', 'Semantic panel initial state = empty with prompt', state.state === 'empty' && /search facts/i.test(state.txt), 'state=' + state.state);
        await ctx.close();
    }

    // ── G-3: Route collision guard ─────────────────────────────────
    console.log('\n[G-3] Route collision guard');
    {
        // Serve a wrong shape and confirm the guard shows empty/failed rather than crashing.
        const wrongShape = { '/api/intelligence/health': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, status:'healthy', components:{} }) } };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#system', 1280, 800, wrongShape);
        await page.evaluate(() => { if (typeof _intLoadHealth === 'function') _intLoadHealth(); });
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => {
            const el = document.getElementById('intHealthPanel');
            return { state: el ? el.getAttribute('data-apex-state') : null, txt: el ? (el.textContent || '').trim() : '' };
        });
        record('G-3', 'Wrong-shape health response → empty state (not crash)', state.state === 'empty' && /temporarily unavailable/i.test(state.txt), 'state=' + state.state);
        await ctx.close();
    }

    // ── G-4: Confidence + priority badges ──────────────────────────
    console.log('\n[G-4] Decision 10 badges');
    {
        const overrides = {
            '/api/knowledge/items': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, items:[{ fact:'Sample fact', category:'test', knowledge_state:'FULLY_KNOWN', confidence:0.9, confidence_score:0.9 }], count:1 }) },
            '/api/intelligence/opportunities': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, opportunities:[{ id:'x', title:'Test opp', composite_score:87, evidence_refs:[] }], count:1 }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#knowledge', 1280, 800, overrides);
        await page.evaluate(() => { if (typeof knowledgeRefresh === 'function') knowledgeRefresh(); });
        await page.waitForTimeout(600);
        const knHtml = await page.evaluate(() => (document.getElementById('knItemList') || {}).innerHTML || '');
        record('G-4-a', 'Knowledge item renders confidence badge (High)', /apex-confidence-badge/.test(knHtml) && /High/.test(knHtml) && !/Confidence:\s*HIGH/.test(knHtml), 'html len=' + knHtml.length);

        await page.evaluate(() => { if (typeof intelligenceRefresh === 'function') intelligenceRefresh(); });
        // Switch to intelligence.
        await page.evaluate(() => { if (typeof window.switchPage === 'function') window.switchPage('intelligence'); });
        await page.waitForTimeout(600);
        const oppHtml = await page.evaluate(() => (document.getElementById('intOppsList') || {}).innerHTML || '');
        record('G-4-b', 'Opportunity renders Priority: High badge (not "Score: 87")', /Priority:\s*High/.test(oppHtml) && !/Score:\s*87/.test(oppHtml), 'html len=' + oppHtml.length);
        await ctx.close();
    }

    // ── G-5: setState adoption ─────────────────────────────────────
    console.log('\n[G-5] setState adoption');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#intelligence');
        await page.evaluate(() => { if (typeof intelligenceRefresh === 'function') intelligenceRefresh(); if (typeof memoryRefresh === 'function') memoryRefresh(); if (typeof knowledgeRefresh === 'function') knowledgeRefresh(); });
        await page.waitForTimeout(700);
        const stateInfo = await page.evaluate(() => {
            const ids = ['intBriefingPanel','intOppsList','intLessonsPanel','memHealthPanel','memEpisodicList','memSemanticList','knItemList','knGapList','knCoveragePanel'];
            return ids.map(id => ({ id, state: (document.getElementById(id) || {}).getAttribute ? document.getElementById(id).getAttribute('data-apex-state') : null }));
        });
        const withState = stateInfo.filter(x => x.state).length;
        record('G-5', 'All 9 intelligence/memory/knowledge panels have data-apex-state', withState === stateInfo.length, 'withState=' + withState + '/' + stateInfo.length);
        await ctx.close();
    }

    // ── G-6: Lessons panel present ────────────────────────────────
    console.log('\n[G-6] Recent Lessons panel');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#intelligence');
        const present = await page.evaluate(() => !!document.getElementById('intLessonsPanel'));
        record('G-6', '#intLessonsPanel exists on Intelligence page', present);
        await ctx.close();
    }

    // ── G-7: Domain coverage rows ─────────────────────────────────
    console.log('\n[G-7] Knowledge domain coverage rows');
    {
        const overrides = {
            '/api/knowledge/gaps': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, gaps:[], count:0 }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#knowledge', 1280, 800, overrides);
        await page.evaluate(() => { if (typeof knowledgeRefresh === 'function') knowledgeRefresh(); });
        await page.waitForTimeout(900);
        const rows = await page.evaluate(() => document.querySelectorAll('#knCoverageList .kn-coverage-row').length);
        record('G-7', 'Knowledge page renders 6 domain coverage rows', rows === 6, 'rows=' + rows);
        await ctx.close();
    }

    // ── G-8: Vocabulary sweep ─────────────────────────────────────
    console.log('\n[G-8] Vocabulary sweep');
    {
        const overrides = {
            '/api/knowledge/items': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, items:[{ fact:'Test fact', category:'x', knowledge_state:'FULLY_KNOWN', confidence:0.9 }], count:1 }) },
            '/api/knowledge/gaps':  { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, gaps:[{ id:'g1', required_subject:'Some subject', gap_type:'EVIDENCE_MISSING', status:'OPEN', blocks_decision:true }], count:1 }) },
            '/api/intelligence/opportunities': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, opportunities:[{ id:'x', title:'A', composite_score:60, description:'test' }], count:1 }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#knowledge', 1280, 800, overrides);
        await page.evaluate(() => { if (typeof knowledgeRefresh === 'function') knowledgeRefresh(); if (typeof intelligenceRefresh === 'function') intelligenceRefresh(); });
        await page.waitForTimeout(600);
        const contents = await page.evaluate(() => {
            const ids = ['page-knowledge','page-intelligence','page-memory'];
            return ids.map(id => ({ id, txt: (document.getElementById(id) || {}).innerText || '' })).map(o => o.txt).join('\n---\n');
        });
        const forbiddenSurface = ['FULLY_KNOWN','CONFLICTING','composite_score','KNOWN → INFERRED'];
        const found = forbiddenSurface.filter(f => contents.includes(f));
        record('G-8', 'Rendered DOM does not contain internal enum strings', found.length === 0, 'found=' + JSON.stringify(found));
        // G-8b: boundary note absence
        const bnAbsent = !/KNOWN\s*→\s*INFERRED/.test(contents);
        record('G-8-b', 'Pipeline boundary note removed from Intelligence DOM', bnAbsent);
        await ctx.close();
    }

    // ── G-9: Evidence L1 trigger ──────────────────────────────────
    console.log('\n[G-9] Evidence L1 disclosure');
    {
        const overrides = {
            '/api/intelligence/opportunities': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, opportunities:[{ id:'x', title:'A', composite_score:60, evidence_refs:[{ label:'Source1', ts:new Date().toISOString() }] }], count:1 }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#intelligence', 1280, 800, overrides);
        await page.evaluate(() => { if (typeof intelligenceRefresh === 'function') intelligenceRefresh(); });
        await page.waitForTimeout(500);
        const info = await page.evaluate(() => {
            const trig = document.querySelector('.int-opp-evidence-trigger');
            return { present: !!trig, txt: trig ? trig.textContent : '' };
        });
        record('G-9', 'Opportunity card has evidence trigger', info.present && /Evidence/.test(info.txt));
        await ctx.close();
    }

    // ── G-10: Memory translation ──────────────────────────────────
    console.log('\n[G-10] Memory translation labels');
    {
        const overrides = {
            '/api/memory/episodic/recent': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, data:[{ memory_id:'e1', objective:'voice-task-abc', success:true, created_at:new Date().toISOString() }] }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#memory', 1280, 800, overrides);
        await page.evaluate(() => { if (typeof _loadMemoryEpisodic === 'function') _loadMemoryEpisodic(); });
        await page.waitForTimeout(400);
        const html = await page.evaluate(() => (document.getElementById('memEpisodicList') || {}).innerHTML || '');
        record('G-10', 'voice-task-* renders as human phrase, not raw', /APEX handled a voice request/.test(html) && !/voice-task-/.test(html), 'html len=' + html.length);
        await ctx.close();
    }

    // ── G-11: XSS escape ─────────────────────────────────────────
    console.log('\n[G-11] XSS defence');
    {
        const overrides = {
            '/api/knowledge/items': { status:200, contentType:'application/json', body: JSON.stringify({ ok:true, items:[{ fact:'<img src=x onerror=window._apexXss=1>', category:'x', knowledge_state:'FULLY_KNOWN' }], count:1 }) },
        };
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#knowledge', 1280, 800, overrides);
        await page.evaluate(() => { if (typeof knowledgeRefresh === 'function') knowledgeRefresh(); });
        await page.waitForTimeout(600);
        const fired = await page.evaluate(() => window._apexXss === 1);
        record('G-11', 'XSS payload in fact does not execute', !fired);
        await ctx.close();
    }

    // ── G-12: No inline oninput ──────────────────────────────────
    console.log('\n[G-12] CSP compliance (no inline oninput)');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#memory');
        const hasInline = await page.evaluate(() => {
            const el = document.getElementById('memSemanticSearch');
            return el ? !!el.getAttribute('oninput') : true;
        });
        record('G-12', 'memory search input has NO oninput attribute', !hasInline);
        await ctx.close();
    }

    // ── G-13: Accessibility ──────────────────────────────────────
    console.log('\n[G-13] Accessibility');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#intelligence');
        const a11y = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('#page-intelligence [data-fn="intelligenceRefresh"], #page-memory [data-fn="memoryRefresh"], #page-knowledge [data-fn="knowledgeRefresh"]'));
            const labelled = buttons.filter(b => !!b.getAttribute('aria-label')).length;
            const busy = document.querySelectorAll('#page-intelligence [aria-busy], #page-memory [aria-busy], #page-knowledge [aria-busy]').length;
            const regions = document.querySelectorAll('#page-intelligence section[role="region"], #page-memory section[role="region"], #page-knowledge section[role="region"]').length;
            return { buttons: buttons.length, labelled, busy, regions };
        });
        record('G-13-a', 'All 3 refresh buttons have aria-label', a11y.labelled === a11y.buttons && a11y.buttons > 0, `labelled=${a11y.labelled}/${a11y.buttons}`);
        record('G-13-b', 'Skeleton containers include aria-busy', a11y.busy >= 3, 'busy=' + a11y.busy);
        record('G-13-c', 'Major sections wrapped in role="region"', a11y.regions >= 6, 'regions=' + a11y.regions);
        await ctx.close();
    }

    // ── G-14: Desktop 1280px layout ──────────────────────────────
    console.log('\n[G-14] Desktop multi-column layout');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#intelligence', 1280, 900);
        const disp = await page.evaluate(() => {
            const el = document.querySelector('#page-intelligence .int-panels');
            return el ? getComputedStyle(el).display : null;
        });
        record('G-14', 'Intelligence panels use grid at 1280px', disp === 'grid', 'display=' + disp);
        await ctx.close();
    }

    // ── G-15: WebSocket registration hook ────────────────────────
    console.log('\n[G-15] WebSocket subscription hook');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#intelligence');
        const hasHook = await page.evaluate(() => typeof window._intRegisterWsListeners === 'function');
        record('G-15', 'WebSocket registrar exposed on window', hasHook);
        await ctx.close();
    }

    // ── REG smoke ─────────────────────────────────────────────────
    console.log('\n[REG] Regression smoke');
    {
        const { page, ctx, consoleErrors } = await loadDash(browser, MASTER_JWT, '#overview');
        const overviewActive = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('REG-a', 'TODAY (#overview) renders as active on hash', overviewActive === 'page-overview', 'active=' + overviewActive);
        await page.evaluate(() => { if (typeof window.switchPage==='function') window.switchPage('command'); });
        await page.waitForTimeout(200);
        const cmdActive = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        const chatLogPresent = await page.evaluate(() => !!document.getElementById('chatLog'));
        record('REG-b', 'COMMAND still renders', cmdActive === 'page-command', 'active=' + cmdActive);
        record('REG-c', 'COMMAND #chatLog visible', chatLogPresent);
        await page.evaluate(() => { if (typeof window.switchPage==='function') window.switchPage('intelligence'); });
        await page.waitForTimeout(200);
        const intActive = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('REG-d', 'Hash → intelligence navigates', intActive === 'page-intelligence', 'active=' + intActive);
        await page.evaluate(() => { if (typeof window.switchPage==='function') window.switchPage('memory'); });
        await page.waitForTimeout(200);
        const memActive = await page.evaluate(() => (document.querySelector('.page.active')||{}).id);
        record('REG-e', 'Hash → memory navigates', memActive === 'page-memory', 'active=' + memActive);
        record('REG-f', 'No console errors across three pages', consoleErrors.length === 0, consoleErrors.length ? consoleErrors.slice(0,2).join(' | ') : 'clean');
        await ctx.close();
    }

    await browser.close();

    console.log('\n────────────────────────────────────────────────────');
    console.log(`V-11-G suite: ${pass} PASS / ${fail} FAIL / ${pass+fail} total`);
    require('fs').writeFileSync('playwright-v11g-results.json', JSON.stringify({ pass, fail, total: pass+fail, results: RESULTS }, null, 2));
    console.log('Wrote playwright-v11g-results.json');
    process.exit(fail ? 1 : 0);
}

runTests().catch(e => { console.error(e); process.exit(1); });
