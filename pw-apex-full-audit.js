/**
 * APEX FULL INTERFACE AUDIT — pw-apex-full-audit.js
 * Run: node --require dotenv/config pw-apex-full-audit.js
 */

const { chromium } = require('playwright');
const jwt          = require('jsonwebtoken');
const fs           = require('fs');
const path         = require('path');

const PROD_URL    = 'https://ai-os-server-jx20.onrender.com';
const DOMAIN      = 'ai-os-server-jx20.onrender.com';
const JWT_SECRET  = process.env.JWT_SECRET;
const APP_KEY     = process.env.APP_ACCESS_KEY || '';
const MASTER_UUID = process.env.APEX_HUMAN_ID || '00000000-0000-4000-8000-000000000001';
const OUT_DIR     = path.join(__dirname, 'apex-audit-2026');

if (!JWT_SECRET) { console.error('JWT_SECRET not set'); process.exit(1); }
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const TOKEN = jwt.sign(
    { sub: MASTER_UUID, role: 'master', email: null, jti: 'full-audit-oct26' },
    JWT_SECRET, { expiresIn: '4h' }
);
const COOKIES = [
    { name: 'apex_session', value: '1',   domain: DOMAIN, path: '/', httpOnly: false },
    { name: 'apex_token',   value: TOKEN, domain: DOMAIN, path: '/', httpOnly: true  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const I = { PASS:'✓', FAIL:'✗', INFO:'·', WARN:'⚠' };
function log(lvl, section, msg) { console.log(`  ${I[lvl]||lvl}  [${section}] ${msg}`); }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
async function ss(page, name) {
    try { await page.screenshot({ path: path.join(OUT_DIR, name+'.png'), fullPage: false }); } catch(_){}
}
async function ssF(page, name) {
    try { await page.screenshot({ path: path.join(OUT_DIR, name+'.png'), fullPage: true }); } catch(_){}
}
async function wait(page, ms=1200) { await page.waitForTimeout(ms); }
async function txt(loc) { try { return await loc.textContent(); } catch(_){ return ''; } }

async function vis(loc) { try { return await loc.isVisible(); } catch(_){ return false; } }
async function cnt(loc) { try { return await loc.count(); } catch(_){ return 0; } }
async function attr(loc, a) { try { return await loc.getAttribute(a); } catch(_){ return ''; } }
async function ev(loc, fn) { try { return await loc.evaluate(fn); } catch(_){ return null; } }
async function clickSafe(loc) {
    try { await loc.click({ timeout: 5000 }); return true; }
    catch(_) {
        try { await loc.click({ force: true, timeout: 3000 }); return true; } catch(_2){ return false; }
    }
}
async function probeAPI(page, endpoint) {
    return page.evaluate(async ([url, tok, key]) => {
        try {
            const r = await fetch(url, { headers: { Authorization: 'Bearer '+tok, 'x-app-key': key } });
            const body = await r.json().catch(() => ({}));
            return { status: r.status, ok: r.ok, keys: Object.keys(body).slice(0,6) };
        } catch(e) { return { status: 0, ok: false, error: e.message }; }
    }, [PROD_URL + endpoint, TOKEN, APP_KEY]);
}

// ── Main audit ────────────────────────────────────────────────────────────────
async function audit(browser, vpLabel, vp) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  ${vpLabel}  (${vp.width}×${vp.height})`);
    console.log('═'.repeat(70));

    const ctx = await browser.newContext({ viewport: vp, extraHTTPHeaders: { 'x-app-key': APP_KEY } });
    await ctx.addInitScript(k => { localStorage.setItem('apex_app_key', k); }, APP_KEY);
    await ctx.addCookies(COOKIES);

    const page = await ctx.newPage();
    const jsErrors = [], netFails = [];
    page.on('pageerror', e => jsErrors.push(e.message.slice(0,200)));
    page.on('requestfailed', r => {
        const u = r.url();
        if (!u.includes('favicon') && !u.includes('chunk')) netFails.push(r.failure().errorText + ' ' + u.slice(0,80));
    });

    // ── 1. LOAD ──────────────────────────────────────────────────────────────
    console.log('\n── 1. LOAD & AUTH ──────────────────────────────────────────');
    const t0 = Date.now();
    try {
        await page.goto(PROD_URL + '/#overview', { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch(e) { log('FAIL','load','Timeout loading page: '+e.message.slice(0,80)); await ctx.close(); return {}; }
    const loadMs = Date.now() - t0;
    log('INFO', 'load', `DOM ready in ${loadMs}ms`);
    log(loadMs < 5000 ? 'PASS' : 'WARN', 'perf', `Load time <5s: ${loadMs < 5000}`);

    await page.waitForFunction(() => !document.body.classList.contains('apex-role-unknown'), { timeout: 10000 }).catch(()=>{});
    await wait(page, 2500);

    if (await vis(page.locator('#apexKeyOverlay'))) {
        log('FAIL','auth','Key overlay shown — auth failed'); await ctx.close(); return {};
    }
    log('PASS','auth','Authenticated');
    await ss(page, `${slug(vpLabel)}-00-load`);

    // ── 2. COMMAND CENTRE — CIVILISATION VIEW ────────────────────────────────
    console.log('\n── 2. OVERVIEW — CIVILISATION VIEW ─────────────────────────');
    await page.waitForSelector('.cmd-header', { timeout: 15000 }).catch(()=>{});
    await wait(page, 2000);
    await ss(page, `${slug(vpLabel)}-01-cmd-centre`);

    const toggleEl      = page.locator('#civ-view-toggle');
    const orgBtnActive  = page.locator('#civ-vbtn-org.active');
    const pipeHidden    = page.locator('#kg-pipeline');

    log(await vis(toggleEl)     ? 'PASS':'FAIL', 'toggle', `View toggle present`);
    log(await vis(orgBtnActive) ? 'PASS':'WARN', 'toggle', `CIVILISATION active by default`);

    const pipeVis = await ev(pipeHidden, el => {
        const s = el.style, cs = getComputedStyle(el);
        return s.visibility !== 'hidden' && cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    log(!pipeVis ? 'PASS':'WARN', 'toggle', `Pipeline non-interactive when hidden: ${!pipeVis}`);

    // ── 2a. Stats ─────────────────────────────────────────────────────────────
    console.log('\n── 2a. STATS ROW ───────────────────────────────────────────');
    log(await vis(page.locator('.cmd-stats')) ? 'PASS':'FAIL', 'stats', 'Stats row present');
    const nStats = await cnt(page.locator('.cmd-stat'));
    log(nStats >= 4 ? 'PASS':'WARN', 'stats', `Stat cells: ${nStats}/4`);

    const agentN  = await txt(page.locator('.cmd-stats .cmd-stat:first-child .cmd-stat-n'));
    const activeN = await txt(page.locator('#cmd-n-active'));
    const pendN   = await txt(page.locator('#cmd-n-pending'));
    const apprN   = await txt(page.locator('#cmd-n-approvals'));
    log('INFO','stats',`AGENTS=${agentN}  ACTIVE=${activeN}  PENDING=${pendN}  APPROVALS=${apprN}`);

    const apprNum = parseInt(apprN) || 0;
    if (apprNum > 20) log('WARN','data', `⚠ ${apprNum} tasks in awaiting_approval state — stale backlog, needs clearing`);

    // ── 2b. Dispatch ──────────────────────────────────────────────────────────
    console.log('\n── 2b. DISPATCH ────────────────────────────────────────────');
    log(await vis(page.locator('.cmd-dispatch'))        ? 'PASS':'FAIL', 'dispatch', 'Dispatch block visible');
    log(await vis(page.locator('#cmd-dispatch-input')) ? 'PASS':'FAIL', 'dispatch', 'Input present');
    log(await vis(page.locator('#cmd-dispatch-btn'))   ? 'PASS':'FAIL', 'dispatch', 'Button present');

    // Interaction test
    const inp = page.locator('#cmd-dispatch-input');
    if (await vis(inp)) {
        await inp.fill('analyse my finances and create a budget plan for this month');
        await wait(page, 300);
        await ss(page, `${slug(vpLabel)}-02-dispatch-typed`);
        await page.evaluate(() => window._civDispatch && window._civDispatch());
        await wait(page, 800);

        // Wait for result (max 35s)
        await page.waitForFunction(() => {
            const r = document.getElementById('cmd-dispatch-result');
            return r && r.className.includes('visible') && r.textContent.trim().length > 10
                && !r.textContent.includes('Routing through');
        }, { timeout: 35000 }).catch(()=>{});
        await wait(page, 400);
        await ss(page, `${slug(vpLabel)}-03-dispatch-result`);

        const resultVis  = await vis(page.locator('#cmd-dispatch-result.visible'));
        const routeVis   = await vis(page.locator('.cmd-dispatch-route'));
        const resultText = await txt(page.locator('#cmd-dispatch-result'));
        log(resultVis  ? 'PASS':'FAIL', 'dispatch', `Result appeared: ${resultVis}`);
        log(routeVis   ? 'PASS':'WARN', 'dispatch', `Route breadcrumb shown: ${routeVis}`);
        if (resultText) log('INFO','dispatch', `Result: "${resultText.replace(/\n/g,' ').slice(0,120)}"`);
    }

    // ── 2c. Supreme Council ───────────────────────────────────────────────────
    console.log('\n── 2c. SUPREME COUNCIL ─────────────────────────────────────');
    log(await vis(page.locator('.cmd-council-grid')) ? 'PASS':'FAIL', 'council', 'Council grid present');
    const nTiles = await cnt(page.locator('.cmd-council-tile'));
    log(nTiles >= 10 ? 'PASS':'WARN', 'council', `Tiles: ${nTiles}/10`);

    let tilesComplete = 0;
    const tiles = await page.locator('.cmd-council-tile').all().catch(()=>[]);
    for (const t of tiles) {
        const role = await txt(t.locator('.cmd-council-role'));
        const name = await txt(t.locator('.cmd-council-name'));
        const dot  = await vis(t.locator('.cmd-council-dot'));
        if (role && name && dot) tilesComplete++;
    }
    log(tilesComplete === nTiles && nTiles > 0 ? 'PASS':'WARN', 'council', `Complete (role+title+status): ${tilesComplete}/${nTiles}`);

    // Sample tile data
    if (tiles.length > 0) {
        const sample = tiles[0];
        const rid = await txt(sample.locator('.cmd-council-role'));
        const nam = await txt(sample.locator('.cmd-council-name'));
        const col = await ev(sample, el => getComputedStyle(el).getPropertyValue('--tile-color').trim());
        log('INFO','council', `Sample tile: role="${rid}" name="${nam}" color="${col}"`);
    }
    await ssF(page, `${slug(vpLabel)}-04-council`);

    // ── 2d. Domain Directors ──────────────────────────────────────────────────
    console.log('\n── 2d. DOMAIN DIRECTORS ────────────────────────────────────');
    await page.evaluate(() => window.scrollBy(0, 500));
    await wait(page, 200);
    log(await vis(page.locator('.cmd-director-grid')) ? 'PASS':'FAIL', 'directors', 'Director grid present');
    const nDirs = await cnt(page.locator('.cmd-director-card'));
    log(nDirs >= 9 ? 'PASS':'WARN', 'directors', `Cards: ${nDirs}/9`);

    let dirsComplete = 0;
    const dirCards = await page.locator('.cmd-director-card').all().catch(()=>[]);
    for (const d of dirCards) {
        const dom = await txt(d.locator('.cmd-director-domain'));
        const nam = await txt(d.locator('.cmd-director-name'));
        const met = await txt(d.locator('.cmd-director-meta'));
        if (dom && nam) dirsComplete++;
        // Flag large task backlogs
        const taskMatch = met.match(/(\d+)\s+tasks?/);
        if (taskMatch && parseInt(taskMatch[1]) > 50) {
            log('WARN','data', `${dom} director has ${taskMatch[1]} tasks — large backlog`);
        }
    }
    log(dirsComplete === nDirs && nDirs > 0 ? 'PASS':'WARN', 'directors', `Complete: ${dirsComplete}/${nDirs}`);
    await ssF(page, `${slug(vpLabel)}-05-directors`);

    // ── 2e. Office Agents ─────────────────────────────────────────────────────
    console.log('\n── 2e. OFFICE AGENTS ───────────────────────────────────────');
    await page.evaluate(() => window.scrollBy(0, 500));
    await wait(page, 200);
    log(await vis(page.locator('.cmd-agents-grid')) ? 'PASS':'FAIL', 'agents', 'Agent grid present');
    const nChips    = await cnt(page.locator('.cmd-agent-chip'));
    const nActive   = await cnt(page.locator('.cmd-agent-chip.is-active'));
    log(nChips >= 30 ? 'PASS':'WARN', 'agents', `Chips: ${nChips}/33`);
    log('INFO','agents', `Active chips: ${nActive}`);
    await ssF(page, `${slug(vpLabel)}-06-agents`);

    // ── 2f. Panels ────────────────────────────────────────────────────────────
    await page.evaluate(() => window.scrollTo(0,0));
    await wait(page, 500);
    console.log('\n── 2f. PANELS ──────────────────────────────────────────────');
    const leftTitle = await txt(page.locator('#kg-left-title'));
    log(leftTitle === 'APPROVALS' ? 'PASS':'WARN', 'left-panel', `Title: "${leftTitle}" (want APPROVALS)`);
    const nApprItems  = await cnt(page.locator('.cmd-approval-item'));
    const noClearVis  = await vis(page.locator('.cmd-no-approvals'));
    log('INFO','left-panel', `Approval items: ${nApprItems}  All-clear shown: ${noClearVis}`);
    if (nApprItems > 20) log('WARN','data', `Left panel showing ${nApprItems} approval items — stale tasks in DB`);
    await ss(page, `${slug(vpLabel)}-07-left-panel`);

    const rightTitle = await txt(page.locator('#kg-right-title'));
    log('INFO','right-panel', `Right panel title: "${rightTitle}"`);
    const rightHasContent = await ev(page.locator('#kg-right-body'), el => el.innerHTML.trim().length > 50);
    log(rightHasContent ? 'PASS':'WARN', 'right-panel', `Right panel has content: ${rightHasContent}`);
    await ss(page, `${slug(vpLabel)}-08-right-panel`);

    // Full page
    await ssF(page, `${slug(vpLabel)}-09-cmd-full`);

    // ── 3. PROCESS MAP VIEW ───────────────────────────────────────────────────
    console.log('\n── 3. PROCESS MAP ──────────────────────────────────────────');
    await clickSafe(page.locator('#civ-vbtn-pipeline'));
    await wait(page, 1500);

    const pipeNowVis = await ev(page.locator('#kg-pipeline'), el => {
        const s = el.style, cs = getComputedStyle(el);
        return s.visibility !== 'hidden' && cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    log(pipeNowVis ? 'PASS':'FAIL', 'pipeline', 'Pipeline visible after switching to Process Map');

    const orgNowHid = await ev(page.locator('#civ-org-chart'), el => {
        return el.style.visibility === 'hidden' || getComputedStyle(el).display === 'none';
    });
    log(orgNowHid ? 'PASS':'FAIL', 'pipeline', 'Org chart hidden after switch');

    const nNodes    = await cnt(page.locator('.kg-node'));
    log(nNodes > 0 ? 'PASS':'WARN', 'pipeline', `Pipeline nodes: ${nNodes}`);

    const inputNode   = await cnt(page.locator('#kg-node-input')) > 0;
    const councilNode = await cnt(page.locator('#kg-node-council')) > 0;
    const gateNode    = await cnt(page.locator('#kg-node-gate, #kg-node-actions')) > 0;
    const domainNode  = await cnt(page.locator('#kg-node-domain')) > 0;
    const officeNode  = await cnt(page.locator('#kg-node-office')) > 0;
    log('INFO','pipeline', `Tier nodes — INPUT:${inputNode} COUNCIL:${councilNode} GATE:${gateNode} DOMAIN:${domainNode} OFFICE:${officeNode}`);

    await ss(page, `${slug(vpLabel)}-10-process-map`);

    // Click a node — test drill-down
    if (inputNode) {
        await clickSafe(page.locator('#kg-node-input'));
        await wait(page, 1000);
        const lbContent = await ev(page.locator('#kg-left-body'), el => el.innerHTML.trim().length);
        log(lbContent > 100 ? 'PASS':'WARN', 'pipeline', `Left panel populated on node click: ${lbContent > 100}`);
        await ss(page, `${slug(vpLabel)}-11-node-click`);
    }

    // Switch back to org
    await clickSafe(page.locator('#civ-vbtn-org'));
    await wait(page, 600);

    // ── 4. NAVIGATION ────────────────────────────────────────────────────────
    console.log('\n── 4. NAVIGATION ───────────────────────────────────────────');
    const NAV = [
        { btn:'#nav-overview',  page:'#page-overview',  label:'OVERVIEW'  },
        { btn:'#nav-command',   page:'#page-command',   label:'COMMAND'   },
        { btn:'#nav-domains',   page:'#page-domains',   label:'DOMAINS'   },
        { btn:'#nav-system',    page:'#page-system',    label:'SYSTEM'    },
        { btn:'#nav-settings',  page:'#page-settings',  label:'SETTINGS'  },
    ];
    // Also try alternate IDs for actions
    const actionBtns = ['#nav-actions','[onclick*="actions"]','[data-page="actions"]'];

    for (const n of NAV) {
        const btn = page.locator(n.btn);
        if (!(await cnt(btn))) { log('WARN','nav',`${n.label}: button ${n.btn} not found`); continue; }
        await clickSafe(btn);
        await wait(page, 1200);
        const pg = await vis(page.locator(n.page));
        const pgContent = await ev(page.locator(n.page), el => el ? el.innerHTML.trim().length : 0) || 0;
        log(pg ? 'PASS':'WARN', 'nav', `${n.label}: visible=${pg}  content=${pgContent}chars`);
        await ssF(page, `${slug(vpLabel)}-12-nav-${slug(n.label)}`);
    }

    // Actions page search
    let actionsFound = false;
    for (const sel of actionBtns) {
        const b = page.locator(sel).first();
        if (await cnt(b)) {
            await clickSafe(b); await wait(page, 1200);
            const pgVis = await vis(page.locator('#page-actions'));
            log(pgVis ? 'PASS':'WARN', 'nav', `ACTIONS via ${sel}: visible=${pgVis}`);
            await ssF(page, `${slug(vpLabel)}-12-nav-actions`);
            actionsFound = true; break;
        }
    }
    if (!actionsFound) log('WARN','nav','ACTIONS: no nav button found (may be sub-page)');

    // ── 5. DOMAINS PAGE — drill into each domain ──────────────────────────────
    console.log('\n── 5. DOMAINS PAGE ─────────────────────────────────────────');
    await clickSafe(page.locator('#nav-domains'));
    await wait(page, 1500);
    await ssF(page, `${slug(vpLabel)}-13-domains`);

    const domainCards = await cnt(page.locator('[onclick*="switchPage"], .domain-card, [class*="domain"]'));
    log(domainCards > 0 ? 'PASS':'WARN', 'domains', `Domain cards/links: ${domainCards}`);

    // ── 6. COMMAND PAGE — Chat ────────────────────────────────────────────────
    console.log('\n── 6. COMMAND PAGE & CHAT ──────────────────────────────────');
    await clickSafe(page.locator('#nav-command'));
    await wait(page, 1500);
    await ssF(page, `${slug(vpLabel)}-14-command`);

    const chatInput = page.locator('#chatInput');
    const chatInputVis = await vis(chatInput);
    log(chatInputVis ? 'PASS':'WARN', 'chat', `Chat input visible: ${chatInputVis}`);

    if (chatInputVis) {
        await chatInput.fill('Hello APEX, what is my current financial status?');
        await wait(page, 300);
        const chatSendBtn = page.locator('#chatSend, button[aria-label*="end"], button[type="submit"]').first();
        const sendVis = await vis(chatSendBtn);
        log(sendVis ? 'PASS':'WARN', 'chat', `Send button visible: ${sendVis}`);
        if (sendVis) {
            await clickSafe(chatSendBtn);
            await wait(page, 1000);
        }
        await ss(page, `${slug(vpLabel)}-15-chat`);
    }

    const chatMessages = page.locator('#chatLog, #chatMessages, #chat-messages, .chat-messages, .message-list');
    const msgVis = await vis(chatMessages.first());
    log(msgVis ? 'PASS':'WARN', 'chat', `Message area visible: ${msgVis}`);

    // ── 7. API HEALTH ─────────────────────────────────────────────────────────
    console.log('\n── 7. API HEALTH ───────────────────────────────────────────');
    const APIS = [
        ['/health',                                      'Health check'     ],
        ['/api/agents/activity?limit=5',                 'Agent activity'   ],
        ['/api/tasks?limit=5&scope=all',                 'Tasks'            ],
        ['/api/civilization/hierarchy',                  'Civ hierarchy'    ],
        ['/api/civilization/council/history?limit=5',    'Council history'  ],
        ['/api/notifications',                           'Notifications'    ],
        ['/documents?limit=5',                           'Documents'        ],
    ];
    for (const [ep, label] of APIS) {
        const r = await probeAPI(page, ep).catch(() => ({ status:0, ok:false }));
        log(r.ok ? 'PASS':'FAIL', 'api', `${label}: HTTP ${r.status}${r.keys?' ['+r.keys.join(',')+']':''}`);
    }

    // ── 8. LAYOUT & A11Y ─────────────────────────────────────────────────────
    console.log('\n── 8. LAYOUT & ACCESSIBILITY ───────────────────────────────');
    await clickSafe(page.locator('#nav-overview'));
    await wait(page, 1500);

    const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    log(!hScroll ? 'PASS':'WARN', 'layout', `No horizontal overflow: ${!hScroll}`);

    const vmeta = await attr(page.locator('meta[name="viewport"]'), 'content');
    log(vmeta ? 'PASS':'WARN', 'a11y', `Viewport meta: "${vmeta}"`);

    // Touch target size on dispatch button
    const btnBox = await ev(page.locator('#cmd-dispatch-btn'), el => {
        const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    log(btnBox && btnBox.h >= 36 ? 'PASS':'WARN', 'a11y', `Dispatch btn size: ${btnBox?.w}×${btnBox?.h}px (min 36h)`);

    const dispatchAria = await attr(page.locator('#cmd-dispatch-btn'), 'aria-label');
    log(dispatchAria ? 'PASS':'WARN', 'a11y', `Dispatch btn aria-label: "${dispatchAria}"`);

    const orgPressed = await attr(page.locator('#civ-vbtn-org'), 'aria-pressed');
    log(orgPressed === 'true' ? 'PASS':'WARN', 'a11y', `CIVILISATION btn aria-pressed="${orgPressed}"`);

    // Focus visible on input
    await page.locator('#cmd-dispatch-input').focus().catch(()=>{});
    await wait(page, 150);
    const focusedBorder = await ev(page.locator('#cmd-dispatch-input'), el => getComputedStyle(el).borderColor);
    log('INFO','a11y', `Dispatch input focused border: ${focusedBorder}`);

    // ── 9. MOBILE-SPECIFIC ────────────────────────────────────────────────────
    if (vp.width <= 768) {
        console.log('\n── 9. MOBILE ───────────────────────────────────────────────');
        const mobilePanelBtns = await vis(page.locator('#kg-mobile-panel-btns'));
        log(mobilePanelBtns ? 'PASS':'WARN', 'mobile', `Mobile panel toggle buttons present: ${mobilePanelBtns}`);

        const councilScrolls = await ev(page.locator('.cmd-council-grid'),
            el => el ? el.scrollWidth > el.clientWidth : false);
        log('INFO','mobile', `Council grid scrollable: ${councilScrolls}`);

        await ss(page, `${slug(vpLabel)}-16-mobile`);
    }

    // ── 10. FINAL FULL SCREENSHOT ─────────────────────────────────────────────
    await clickSafe(page.locator('#nav-overview'));
    await wait(page, 1000);
    await ssF(page, `${slug(vpLabel)}-99-final-full`);

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n── SUMMARY ─────────────────────────────────────────────────');
    log(jsErrors.length === 0 ? 'PASS':'WARN', 'errors', `JS errors: ${jsErrors.length}`);
    jsErrors.forEach(e => log('WARN','js-err', e.slice(0,120)));
    log(netFails.length === 0 ? 'PASS':'WARN', 'errors', `Network failures: ${netFails.length}`);
    netFails.slice(0,5).forEach(e => log('WARN','net-fail', e));

    await ctx.close();
    return { vpLabel, loadMs, jsErrors, netFails };
}

// ── Entry ─────────────────────────────────────────────────────────────────────
(async () => {
    console.log('\n' + '█'.repeat(70));
    console.log('  APEX INTERFACE FULL AUDIT');
    console.log('  ' + new Date().toISOString());
    console.log('  ' + PROD_URL);
    console.log('█'.repeat(70));

    const browser = await chromium.launch({ headless: true });

    const VPS = [
        { label: 'desktop-1440', w: 1440, h: 900  },
        { label: 'tablet-768',   w: 768,  h: 1024 },
        { label: 'mobile-390',   w: 390,  h: 844  },
    ];

    const results = [];
    for (const vp of VPS) {
        const r = await audit(browser, vp.label, { width: vp.w, height: vp.h });
        results.push(r);
    }

    await browser.close();

    fs.writeFileSync(
        path.join(OUT_DIR, 'audit-report.json'),
        JSON.stringify({ ts: new Date().toISOString(), results }, null, 2)
    );

    const totalJs  = results.reduce((s, r) => s + (r.jsErrors?.length  || 0), 0);
    const totalNet = results.reduce((s, r) => s + (r.netFails?.length || 0), 0);

    console.log('\n' + '═'.repeat(70));
    console.log('  AUDIT COMPLETE');
    console.log(`  Viewports tested: ${results.length}`);
    console.log(`  JS errors total:  ${totalJs}`);
    console.log(`  Network fails:    ${totalNet}`);
    console.log('  Screenshots:      ' + OUT_DIR);
    console.log('═'.repeat(70) + '\n');
})();
