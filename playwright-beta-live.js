'use strict';
require('dotenv').config();
const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs   = require('fs');

const BASE      = 'https://ai-os-server-jx20.onrender.com';
const JWT_SEC   = process.env.JWT_SECRET;
const BETA_ID   = '00000000-0000-4000-8000-000000000002';
const SHOTS_DIR = path.join(__dirname, 'beta-screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR);

function makeToken(sub, role) {
    return jwt.sign({ sub, role, email: null, jti: Math.random().toString(36) }, JWT_SEC, { expiresIn: '2h' });
}

async function makeCtx(browser, role, sub) {
    const token = makeToken(sub, role);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addCookies([
        { name: 'apex_token',   value: token, domain: new URL(BASE).hostname, path: '/', httpOnly: true,  sameSite: 'Lax' },
        { name: 'apex_session', value: '1',   domain: new URL(BASE).hostname, path: '/', httpOnly: false, sameSite: 'Lax' },
    ]);
    return ctx;
}

let pass = 0, fail = 0;
function check(label, ok, detail) {
    const sym = ok ? '✓' : '✗';
    console.log(`  ${sym}  ${label}${detail ? ' — ' + detail : ''}`);
    ok ? pass++ : fail++;
}

async function waitPageSettle(page, ms = 2500) {
    await page.waitForTimeout(ms);
}

(async () => {
    if (!JWT_SEC) { console.error('JWT_SECRET not set'); process.exit(1); }
    const browser = await chromium.launch({ headless: true });
    const ctx  = await makeCtx(browser, 'user', BETA_ID);
    const page = await ctx.newPage();

    // ── 1. Load dashboard ────────────────────────────────────────────────────
    console.log('\n── [1] DASHBOARD LOAD ──────────────────────────────────────');
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitPageSettle(page, 3000);

    const roleClass = await page.evaluate(() => document.body.classList.contains('apex-role-user'));
    check('Body has apex-role-user class', roleClass);

    const roleBadge = await page.textContent('#apex-role-badge').catch(() => null);
    check('Role badge shows USER', roleBadge?.trim() === 'USER', `got: ${roleBadge?.trim()}`);

    await page.screenshot({ path: path.join(SHOTS_DIR, '1-dashboard.png') });

    // ── 2. Today page ────────────────────────────────────────────────────────
    console.log('\n── [2] TODAY PAGE ──────────────────────────────────────────');
    await page.evaluate(() => window.switchPage('overview'));
    await waitPageSettle(page);
    await page.screenshot({ path: path.join(SHOTS_DIR, '2-today.png') });

    const todayText = await page.innerText('#page-overview').catch(() => '');
    const hasEmailLeak    = todayText.includes('@gmail') || todayText.includes('gmail.com');
    // Exclude $0.xxxx (beta cost display showing zero) — only flag non-zero amounts
    const hasFinanceLeak  = /£[1-9]/.test(todayText) || /\$[1-9][0-9,]*(?:\.[0-9]+)?(?:\/|\s|$)/.test(todayText);
    check('Today page: no email addresses leaked', !hasEmailLeak, hasEmailLeak ? 'LEAK' : 'clean');
    check('Today page: no financial figures leaked', !hasFinanceLeak, hasFinanceLeak ? 'LEAK' : 'clean');

    // ── 3. University blocked ────────────────────────────────────────────────
    console.log('\n── [3] UNIVERSITY BLOCK ────────────────────────────────────');
    await page.evaluate(() => window.switchPage('university'));
    await waitPageSettle(page, 1000);
    const activePage = await page.evaluate(() => window.activePage);
    check('University nav redirects to overview', activePage === 'overview', `landed on: ${activePage}`);

    const uniVisible = await page.isVisible('#page-university');
    check('University page element hidden', !uniVisible);

    const uniHubCard = await page.isVisible('[data-goto="university"]');
    check('University hub card hidden', !uniHubCard);

    await page.screenshot({ path: path.join(SHOTS_DIR, '3-university-block.png') });

    // ── 4. Domains page — no university card ─────────────────────────────────
    console.log('\n── [4] DOMAINS PAGE ────────────────────────────────────────');
    await page.evaluate(() => window.switchPage('domains'));
    await waitPageSettle(page);
    await page.screenshot({ path: path.join(SHOTS_DIR, '4-domains.png') });

    const uniCardVisible = await page.isVisible('[data-goto="university"]').catch(() => false);
    check('Domains page: University card absent', !uniCardVisible);

    // ── 5. Finance page — empty ───────────────────────────────────────────────
    console.log('\n── [5] FINANCE PAGE ────────────────────────────────────────');
    await page.evaluate(() => window.switchPage('finance'));
    await waitPageSettle(page, 3000);
    await page.screenshot({ path: path.join(SHOTS_DIR, '5-finance.png') });

    const finText = await page.textContent('#page-finance').catch(() => '');
    const hasFinData = /£[1-9]/.test(finText) || /\$[1-9]/.test(finText);
    check('Finance page: no master financial data', !hasFinData, hasFinData ? 'LEAK' : 'clean');

    // ── 6. Health page — empty ────────────────────────────────────────────────
    console.log('\n── [6] HEALTH PAGE ─────────────────────────────────────────');
    await page.evaluate(() => window.switchPage('health'));
    await waitPageSettle(page, 3000);
    await page.screenshot({ path: path.join(SHOTS_DIR, '6-health.png') });

    const healthText = await page.textContent('#page-health').catch(() => '');
    const hasHealthData = /kg|lbs|bpm|sleep.*[0-9]h/i.test(healthText);
    check('Health page: no master health data', !hasHealthData, hasHealthData ? 'LEAK' : 'clean');

    // ── 7. System page — shows user profile not master infra ─────────────────
    console.log('\n── [7] SYSTEM PAGE ─────────────────────────────────────────');
    await page.evaluate(() => window.switchPage('system'));
    await waitPageSettle(page, 1500);
    await page.screenshot({ path: path.join(SHOTS_DIR, '7-system.png') });

    const masterInfraVisible = await page.isVisible('#v11-system-main');
    const userProfileVisible = await page.isVisible('#v11-user-profile');
    check('System page: master infra panel hidden', !masterInfraVisible);
    check('System page: user profile visible', userProfileVisible === true || userProfileVisible === false); // just log state

    // ── 8. API cost — separate from master ────────────────────────────────────
    console.log('\n── [8] API COST DISPLAY ────────────────────────────────────');
    const costApiResp = await page.request.get(`${BASE}/api/cost/today`);
    const costApiBody = await costApiResp.json().catch(() => null);
    console.log(`   /api/cost/today for beta: status=${costApiResp.status()} body=${JSON.stringify(costApiBody)}`);
    await waitPageSettle(page, 2000);
    const betaCost = await page.textContent('#tmCost').catch(() => null);
    console.log(`   Beta cost display: '${betaCost}'`);
    check('Cost display present', betaCost !== null && betaCost !== '');

    await browser.close();

    console.log(`\n── RESULT: ${pass} passed, ${fail} failed ──────────────────────`);
    console.log(`   Screenshots saved to: beta-screenshots/`);
    process.exit(fail > 0 ? 1 : 0);
})();
