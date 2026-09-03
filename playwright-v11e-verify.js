// playwright-v11e-verify.js
// V-11-E COMMAND Conversation Interface — Playwright verification suite
// Packages E-1, E-2, E-3, E-4, E-5, E-6, E-7, E-9, E-11
'use strict';
const { chromium } = require('playwright');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const BASE_URL    = 'http://localhost:3000';
const JWT_SECRET  = process.env.JWT_SECRET;
const APP_KEY     = process.env.APP_ACCESS_KEY || '';
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';

if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }

const MASTER_JWT = jwt.sign({ sub: MASTER_UUID, role: 'master', email: null, jti: 'v11e-master' }, JWT_SECRET, { expiresIn: '2h' });
const USER_UUID  = '00000000-0000-4000-8000-000000000002';
const USER_JWT   = jwt.sign({ sub: USER_UUID, role: 'user', email: 'test@test.com', jti: 'v11e-user' }, JWT_SECRET, { expiresIn: '2h' });

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

async function routePage(page) {
    await page.route('**/api/**', route => {
        const url = route.request().url();
        if (url.includes('/api/me')) return route.continue();
        // Mock /chat to return a canned response quickly
        if (url.endsWith('/chat') || url.includes('/api/voice-chat')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    reply: "Done. I've noted your request. Additional context will follow when the streaming layer lands. This paragraph is intentionally long so the L1 disclosure control appears in the archetype card.",
                    stream_plan: { enabled: false, chunks: [] }
                })
            });
        }
        route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true }) });
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
    await page.waitForTimeout(600);
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

    // ── E-1 CHAT THREAD VISIBILITY ──────────────────────────────────────
    console.log('\n[E-1] Chat thread visibility');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command');
        const chatLogVisible = await page.evaluate(() => {
            const el = document.getElementById('chatLog');
            if (!el) return { present:false };
            const styleAttr = el.getAttribute('style') || '';
            const cs = window.getComputedStyle(el);
            return {
                present: true,
                inlineDisplayNone: /display\s*:\s*none/i.test(styleAttr),
                computedDisplay: cs.display,
                role: el.getAttribute('role'),
                ariaLive: el.getAttribute('aria-live'),
            };
        });
        record('E-1-a', '#chatLog element exists', chatLogVisible.present);
        record('E-1-b', '#chatLog has no inline display:none', chatLogVisible.present && !chatLogVisible.inlineDisplayNone);
        record('E-1-c', '#chatLog computed display is not "none"', chatLogVisible.present && chatLogVisible.computedDisplay !== 'none', chatLogVisible.computedDisplay);
        record('E-1-d', '#chatLog has role="log"', chatLogVisible.role === 'log');
        record('E-1-e', '#chatLog has aria-live="polite"', chatLogVisible.ariaLive === 'polite');
        await ctx.close();
    }

    // ── E-2 SINGLE-COLUMN LAYOUT + REMOVALS ────────────────────────────
    console.log('\n[E-2] Single-column layout + widget/feed/Gemini Live removal');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command');
        const layout = await page.evaluate(() => {
            const cmd = document.getElementById('page-command');
            if (!cmd) return { present:false };
            return {
                present: true,
                cwidCount: cmd.querySelectorAll('.cwid, [class*="cwid-"]').length,
                cmdSidebar: !!cmd.querySelector('#cmdSidebar'),
                cmdWidgetLayer: !!cmd.querySelector('#cmdWidgetLayer'),
                cmdSplit: !!cmd.querySelector('.cmd-split'),
                cmdFeedCol: !!cmd.querySelector('.cmd-feed-col'),
                apexLivePill: !!cmd.querySelector('#apexLivePill'),
                apexLiveTranscript: !!cmd.querySelector('#apexLiveTranscript'),
                cmdStrip: !!cmd.querySelector('#cmdStrip'),
                cmdThread: !!cmd.querySelector('#cmdThread'),
                chatLog: !!cmd.querySelector('#chatLog'),
            };
        });
        record('E-2-a', 'No .cwid elements in #page-command', layout.present && layout.cwidCount === 0, 'count=' + layout.cwidCount);
        record('E-2-b', 'No #cmdSidebar in #page-command', layout.present && !layout.cmdSidebar);
        record('E-2-c', 'No #cmdWidgetLayer in #page-command', layout.present && !layout.cmdWidgetLayer);
        record('E-2-d', 'No .cmd-split in #page-command', layout.present && !layout.cmdSplit);
        record('E-2-e', 'No .cmd-feed-col in #page-command', layout.present && !layout.cmdFeedCol);
        record('E-2-f', 'No #apexLivePill in #page-command', layout.present && !layout.apexLivePill);
        record('E-2-g', 'No #apexLiveTranscript in #page-command', layout.present && !layout.apexLiveTranscript);
        record('E-2-h', 'No #cmdStrip in #page-command (E-4)', layout.present && !layout.cmdStrip);
        record('E-2-i', '#cmdThread present', layout.present && layout.cmdThread);
        record('E-2-j', '#chatLog present in #page-command', layout.present && layout.chatLog);

        // Activity feed relocated to SYSTEM
        const activityInSystem = await page.evaluate(() => {
            const sys = document.getElementById('page-system');
            const activitySection = document.getElementById('system-activity');
            const feedBody = document.getElementById('apexFeedBody');
            return {
                sysPresent: !!sys,
                activitySection: !!activitySection,
                sysContainsActivity: !!(sys && activitySection && sys.contains(activitySection)),
                sysContainsFeed: !!(sys && feedBody && sys.contains(feedBody)),
            };
        });
        record('E-2-k', 'Activity section exists inside #page-system', activityInSystem.sysContainsActivity);
        record('E-2-l', '#apexFeedBody lives inside #page-system', activityInSystem.sysContainsFeed);
        await ctx.close();
    }

    // ── E-3 CHARTER → GOVERNANCE ────────────────────────────────────────
    console.log('\n[E-3] Constitution Charter moved to SYSTEM Governance');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command');
        const charter = await page.evaluate(() => {
            const cmd = document.getElementById('page-command');
            const gov = document.getElementById('page-governance');
            const chart = document.getElementById('apex-constitution-charter');
            return {
                inCommand: !!(cmd && cmd.textContent.match(/APEX OPERATING CHARTER/i)),
                charterEl: !!chart,
                inGovernance: !!(gov && chart && gov.contains(chart)),
            };
        });
        record('E-3-a', 'Charter absent from #page-command', !charter.inCommand);
        record('E-3-b', 'Charter element present in DOM', charter.charterEl);
        record('E-3-c', 'Charter lives inside #page-governance', charter.inGovernance);
        await ctx.close();
    }

    // ── E-4 STRIP REMOVAL ───────────────────────────────────────────────
    console.log('\n[E-4] Strip removal from COMMAND');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command');
        const strip = await page.evaluate(() => {
            const cmd = document.getElementById('page-command');
            return {
                cmdStrip: !!(cmd && cmd.querySelector('#cmdStrip')),
                cmdStat0: !!(cmd && cmd.querySelector('#cmdStat0')),
            };
        });
        record('E-4-a', '#cmdStrip absent from COMMAND', !strip.cmdStrip);
        record('E-4-b', '#cmdStat0 absent from COMMAND', !strip.cmdStat0);
        await ctx.close();
    }

    // ── E-5 PLASMAORB AMBIENT + VOICE TRIGGER ───────────────────────────
    console.log('\n[E-5] PlasmaOrb ambient + voice consolidation');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command');
        const orb = await page.evaluate(() => {
            const canvas = document.getElementById('plasmaOrb');
            if (!canvas) return { present:false };
            const cs = window.getComputedStyle(canvas);
            return {
                present: true,
                dataFn: canvas.getAttribute('data-fn'),
                pointerEvents: cs.pointerEvents,
                opacity: cs.opacity,
                waveformCount: document.querySelectorAll('#waveform').length,
                micBtnCount: document.querySelectorAll('#micBtn').length,
                subLabel: !!document.getElementById('plasmaOrbSubLabel'),
            };
        });
        record('E-5-a', '#plasmaOrb has no data-fn="startVoice"', orb.dataFn !== 'startVoice', 'data-fn=' + orb.dataFn);
        record('E-5-b', '#plasmaOrb pointer-events: none', orb.pointerEvents === 'none', 'pe=' + orb.pointerEvents);
        record('E-5-c', '#plasmaOrb opacity ≈ 0.15', Math.abs(parseFloat(orb.opacity) - 0.15) < 0.02, 'op=' + orb.opacity);
        record('E-5-d', 'Exactly one #waveform element in DOM', orb.waveformCount === 1, 'count=' + orb.waveformCount);
        record('E-5-e', 'Exactly one #micBtn element in DOM', orb.micBtnCount === 1, 'count=' + orb.micBtnCount);
        record('E-5-f', '#plasmaOrbSubLabel removed', !orb.subLabel);
        await ctx.close();
    }
    {
        // Mobile viewport: orb must not be visible
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command', 375, 700);
        const orbMobile = await page.evaluate(() => {
            const canvas = document.getElementById('plasmaOrb');
            if (!canvas) return { present:false };
            const cs = window.getComputedStyle(canvas);
            return { display: cs.display };
        });
        record('E-5-g', '#plasmaOrb display:none on mobile viewport', orbMobile.display === 'none', 'display=' + orbMobile.display);
        await ctx.close();
    }

    // ── E-6 LOCALSTORAGE CHAT HISTORY ──────────────────────────────────
    console.log('\n[E-6] localStorage chat history (per-identity)');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command');
        // Simulate a message pair being persisted
        const setResult = await page.evaluate((uuid) => {
            const key = 'apex_chat_history_' + uuid;
            const list = [
                { role: 'user',      content: 'hello there',   timestamp: new Date().toISOString() },
                { role: 'assistant', content: 'Hi. How can I help?', timestamp: new Date().toISOString() },
            ];
            localStorage.setItem(key, JSON.stringify(list));
            return { key, stored: localStorage.getItem(key) };
        }, MASTER_UUID);
        record('E-6-a', 'History key uses per-identity namespacing', setResult.key === 'apex_chat_history_' + MASTER_UUID);

        // Navigate away then back — history should hydrate
        await page.evaluate(() => window.switchPage('overview'));
        await page.waitForTimeout(300);
        await page.evaluate(() => window.switchPage('command'));
        await page.waitForTimeout(700);
        const restored = await page.evaluate(() => {
            const log = document.getElementById('chatLog');
            if (!log) return { count:0 };
            return {
                count: log.children.length,
                text: log.textContent,
            };
        });
        record('E-6-b', 'History hydrates when returning to COMMAND', restored.count >= 2, 'children=' + restored.count);
        record('E-6-c', 'Hydrated content includes user message', /hello there/.test(restored.text));
        record('E-6-d', 'Hydrated content includes assistant reply', /How can I help/i.test(restored.text));

        // FIFO 100 cap: seed 120 entries, save one more, expect 100
        await page.evaluate((uuid) => {
            const key = 'apex_chat_history_' + uuid;
            const list = [];
            for (let i = 0; i < 120; i++) list.push({ role:'user', content:'m'+i, timestamp:new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(list));
        }, MASTER_UUID);
        await page.evaluate(() => {
            if (typeof window._v11eSaveHistoryEntry === 'function') window._v11eSaveHistoryEntry('user', 'newest');
        });
        const capped = await page.evaluate((uuid) => {
            const raw = localStorage.getItem('apex_chat_history_' + uuid);
            const arr = JSON.parse(raw || '[]');
            return { length: arr.length, last: arr[arr.length - 1] && arr[arr.length - 1].content };
        }, MASTER_UUID);
        record('E-6-e', 'History FIFO caps at 100 entries', capped.length === 100, 'len=' + capped.length);
        record('E-6-f', 'Newest entry is preserved after cap', capped.last === 'newest');

        // Cross-identity isolation
        const isolationOK = await page.evaluate((otherUuid) => {
            const otherKey = 'apex_chat_history_' + otherUuid;
            return localStorage.getItem(otherKey) === null;
        }, USER_UUID);
        record('E-6-g', 'No other-user history leaked into localStorage', isolationOK);

        await ctx.close();
    }

    // ── E-7 INPUT ZONE SCOPING ──────────────────────────────────────────
    console.log('\n[E-7] Input zone scoped to COMMAND + accessibility');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '');
        // On boot the default is TODAY, so input zone should be hidden
        const onTODAY = await page.evaluate(() => {
            const zone = document.querySelector('.input-zone');
            if (!zone) return { present:false };
            return {
                present:true,
                display: window.getComputedStyle(zone).display,
                bodyHasCmdActive: document.body.classList.contains('apex-cmd-active'),
            };
        });
        record('E-7-a', 'Input zone HIDDEN on TODAY (default landing)', onTODAY.display === 'none', 'display=' + onTODAY.display);
        record('E-7-b', 'body lacks apex-cmd-active on TODAY', !onTODAY.bodyHasCmdActive);

        // Switch to COMMAND
        await page.evaluate(() => window.switchPage('command'));
        await page.waitForTimeout(400);
        const onCOMMAND = await page.evaluate(() => {
            const zone = document.querySelector('.input-zone');
            const input = document.getElementById('chatInput');
            const mic = document.getElementById('micBtn');
            const auto = document.getElementById('autoListenBtn');
            return {
                display: window.getComputedStyle(zone).display,
                bodyHasCmdActive: document.body.classList.contains('apex-cmd-active'),
                placeholder: input && input.getAttribute('placeholder'),
                inputAria: input && input.getAttribute('aria-label'),
                micAria: mic && mic.getAttribute('aria-label'),
                micHasSvg: !!(mic && mic.querySelector('svg')),
                autoLabel: auto && auto.textContent.trim(),
                autoPressed: auto && auto.getAttribute('aria-pressed'),
            };
        });
        record('E-7-c', 'Input zone VISIBLE on COMMAND', onCOMMAND.display !== 'none', 'display=' + onCOMMAND.display);
        record('E-7-d', 'body has apex-cmd-active on COMMAND', onCOMMAND.bodyHasCmdActive);
        record('E-7-e', 'Placeholder mentions voice', /speak|voice|mic/i.test(onCOMMAND.placeholder || ''), onCOMMAND.placeholder);
        record('E-7-f', '#chatInput has aria-label', !!onCOMMAND.inputAria);
        record('E-7-g', '#micBtn has aria-label', !!onCOMMAND.micAria);
        record('E-7-h', '#micBtn contains SVG icon (no emoji)', onCOMMAND.micHasSvg);
        record('E-7-i', 'Auto-listen chip is labeled "Auto-listen"', /Auto-listen/i.test(onCOMMAND.autoLabel || ''), onCOMMAND.autoLabel);
        record('E-7-j', 'Auto-listen chip has aria-pressed', !!onCOMMAND.autoPressed);
        await ctx.close();
    }

    // ── E-9 RESPONSE ARCHETYPES + THINKING + TOAST ──────────────────────
    console.log('\n[E-9] Response cards + approval + thinking + toast');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command');

        // Render an assistant card directly via renderChatMessage
        const cardShape = await page.evaluate(() => {
            const log = document.getElementById('chatLog');
            log.innerHTML = '';
            window.renderChatMessage('ai', "I've saved your note. The following paragraph adds enough length that the L1 detail control is present in the archetype card so users can drill in.");
            const card = log.querySelector('.apex-card');
            if (!card) return { present:false };
            const l0 = card.querySelector('.apex-card-l0');
            const summary = card.querySelector('.apex-card-summary');
            const conf = card.querySelector('.apex-card-confidence');
            const expand = card.querySelector('.apex-card-expand');
            const l1 = card.querySelector('.apex-card-l1');
            return {
                present:true,
                archetype: card.getAttribute('data-archetype'),
                hasL0: !!l0,
                hasSummary: !!summary,
                summaryText: summary && summary.textContent,
                hasConfidence: !!conf,
                hasExpand: !!expand,
                l1Hidden: l1 && l1.hidden,
                expandAria: expand && expand.getAttribute('aria-expanded'),
            };
        });
        record('E-9-a', 'Assistant reply renders as .apex-card', cardShape.present);
        record('E-9-b', 'Card has archetype attribute', !!cardShape.archetype);
        record('E-9-c', 'Card L0 summary visible', cardShape.hasL0 && cardShape.hasSummary);
        record('E-9-d', 'Card has confidence dot', cardShape.hasConfidence);
        record('E-9-e', 'Card has expand button', cardShape.hasExpand);
        record('E-9-f', 'L1 initially hidden', cardShape.l1Hidden === true);
        record('E-9-g', 'Expand button starts aria-expanded=false', cardShape.expandAria === 'false');

        // Click expand → L1 reveals
        const afterExpand = await page.evaluate(() => {
            document.querySelector('.apex-card .apex-card-expand').click();
            const card = document.querySelector('.apex-card');
            const l1 = card.querySelector('.apex-card-l1');
            const btn = card.querySelector('.apex-card-expand');
            return {
                l1Hidden: l1 && l1.hidden,
                aria: btn && btn.getAttribute('aria-expanded'),
            };
        });
        record('E-9-h', 'L1 reveals on expand click', afterExpand.l1Hidden === false);
        record('E-9-i', 'aria-expanded=true after click', afterExpand.aria === 'true');

        // Thinking indicator shown then removed
        const thinking = await page.evaluate(async () => {
            window._v11eShowThinking();
            const inserted = !!document.getElementById('apex-thinking-indicator');
            window._v11eHideThinking();
            const removed = !document.getElementById('apex-thinking-indicator');
            return { inserted, removed };
        });
        record('E-9-j', 'Thinking indicator inserts', thinking.inserted);
        record('E-9-k', 'Thinking indicator removes', thinking.removed);

        // Toast on clearChat
        const toast = await page.evaluate(async () => {
            window.clearChat();
            const el = document.querySelector('.apex-toast');
            return { present: !!el, text: el && el.textContent };
        });
        record('E-9-l', 'clearChat shows toast', toast.present, toast.text);

        // Approval card renders inside cmdThread and is visible
        const approval = await page.evaluate(() => {
            const log = document.getElementById('chatLog');
            log.innerHTML = '';
            window.renderCentreApprovalCard('[APPROVAL REQUIRED] Delete note "shopping list"');
            const card = document.getElementById('centreApproval');
            if (!card) return { present:false };
            const cs = window.getComputedStyle(card);
            return {
                present:true,
                display: cs.display,
                inThread: document.getElementById('cmdThread').contains(card),
            };
        });
        record('E-9-m', 'Approval card is present', approval.present);
        record('E-9-n', 'Approval card display != none', approval.present && approval.display !== 'none');
        record('E-9-o', 'Approval card sits inside #cmdThread', approval.inThread);

        // Master agent panel visible for Master
        const panelMaster = await page.evaluate(() => {
            const p = document.getElementById('v11-cmd-agent-panel');
            if (!p) return { present:false };
            return { present:true, display: p.style.display };
        });
        record('E-9-p', 'Agent panel exists and visible for Master', panelMaster.present && panelMaster.display !== 'none');
        await ctx.close();
    }
    {
        // User: agent panel hidden
        const { page, ctx } = await loadDash(browser, USER_JWT, '#command');
        const panelUser = await page.evaluate(() => {
            const p = document.getElementById('v11-cmd-agent-panel');
            if (!p) return { present:false };
            return { present:true, display: p.style.display };
        });
        record('E-9-q', 'Agent panel hidden for User', panelUser.present && panelUser.display === 'none', 'display=' + panelUser.display);
        await ctx.close();
    }

    // ── E-11 ACCESSIBILITY + KEYBOARD ──────────────────────────────────
    console.log('\n[E-11] Cleanup + accessibility hardening');
    {
        const { page, ctx } = await loadDash(browser, MASTER_JWT, '#command');
        const aria = await page.evaluate(() => {
            const thread = document.getElementById('cmdThread');
            const log = document.getElementById('chatLog');
            return {
                threadPresent: !!thread,
                logRole: log && log.getAttribute('role'),
                logLive: log && log.getAttribute('aria-live'),
            };
        });
        record('E-11-a', '#cmdThread present', aria.threadPresent);
        record('E-11-b', '#chatLog has role="log"', aria.logRole === 'log');
        record('E-11-c', '#chatLog has aria-live="polite"', aria.logLive === 'polite');

        // V key triggers mic click (verify handler bound)
        const vBound = await page.evaluate(async () => {
            let clicked = false;
            const mic = document.getElementById('micBtn');
            if (!mic) return false;
            mic.addEventListener('click', () => clicked = true);
            document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'V', bubbles: true }));
            await new Promise(r => setTimeout(r, 60));
            return clicked;
        });
        record('E-11-d', 'V key triggers #micBtn click', vBound);

        // Escape collapses expanded L1
        const escCollapses = await page.evaluate(() => {
            const log = document.getElementById('chatLog');
            log.innerHTML = '';
            window.renderChatMessage('ai', "I've done a thing. Extra sentence for L1.");
            const btn = log.querySelector('.apex-card-expand');
            btn.click(); // expand
            const l1BeforeEsc = log.querySelector('.apex-card-l1').hidden;
            document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            const l1AfterEsc = log.querySelector('.apex-card-l1').hidden;
            return { before: l1BeforeEsc, after: l1AfterEsc };
        });
        record('E-11-e', 'Escape collapses expanded L1', escCollapses.before === false && escCollapses.after === true);
        await ctx.close();
    }

    // ── SMOKE: no console errors and existing D2 hash nav still works ──
    console.log('\n[REG] Smoke — no console errors + hash nav intact');
    {
        const { page, ctx, consoleErrors } = await loadDash(browser, MASTER_JWT, '#command');
        const nav = await page.evaluate(() => {
            const active = document.querySelector('.page.active');
            return { activeId: active && active.id };
        });
        record('REG-a', '#command hash selects COMMAND on boot', nav.activeId === 'page-command', 'active=' + nav.activeId);
        record('REG-b', 'No console errors during load+init', consoleErrors.length === 0, 'errors=' + consoleErrors.length + (consoleErrors[0] ? ' first="' + consoleErrors[0].slice(0,120) + '"' : ''));
        await ctx.close();
    }

    await browser.close();

    console.log('\n══ V-11-E RESULTS ══');
    console.log(`PASS: ${pass}   FAIL: ${fail}   TOTAL: ${pass + fail}`);
    require('fs').writeFileSync('playwright-v11e-results.json', JSON.stringify({ pass, fail, results: RESULTS }, null, 2));
    process.exit(fail === 0 ? 0 : 1);
}

runTests().catch(err => { console.error(err); process.exit(2); });
