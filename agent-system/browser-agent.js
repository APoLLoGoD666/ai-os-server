"use strict";
const { chromium } = require('playwright');
const Anthropic = require('@anthropic-ai/sdk');
const memory = require('./obsidian-memory');

const MODEL = 'claude-sonnet-4-6';
const DEFAULT_TIMEOUT = 30000;

// ── Core browser session ──────────────────────────────────────────
async function createBrowser() {
    return await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    });
}

// ── Extract page content cleanly ─────────────────────────────────
async function extractPageContent(page) {
    return await page.evaluate(() => {
        // Remove scripts, styles, nav, footer
        const remove = document.querySelectorAll(
            'script,style,nav,footer,header,aside,[aria-hidden="true"]'
        );
        remove.forEach(el => el.remove());
        return {
            title: document.title,
            url: window.location.href,
            text: document.body?.innerText?.slice(0, 8000) || '',
            links: Array.from(document.querySelectorAll('a[href]'))
                .slice(0, 20)
                .map(a => ({ text: a.innerText.trim(), href: a.href }))
        };
    });
}

// ── Analyse content with Claude ───────────────────────────────────
async function analyseContent(content, objective) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: `You are a data extraction agent. Given webpage content and an objective,
extract exactly the information requested. Be precise and concise.
Output JSON only: { "found": boolean, "data": any, "summary": string, "nextAction": string|null }
nextAction: if more pages need visiting to complete the objective, return the URL. Otherwise null.`,
        messages: [{
            role: 'user',
            content: `OBJECTIVE: ${objective}\n\nPAGE TITLE: ${content.title}\nURL: ${content.url}\n\nCONTENT:\n${content.text}\n\nLINKS:\n${content.links.map(l => l.text + ': ' + l.href).join('\n')}`
        }]
    });
    const text = res.content.map(i => i.text || '').join('').trim();
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1) return { found: false, data: null, summary: text, nextAction: null };
    return JSON.parse(text.slice(first, last + 1));
}

// ── Main research function ────────────────────────────────────────
async function research(objective, startUrl, options = {}) {
    const {
        maxPages = 3,
        credentials = null,
        waitForSelector = null,
        screenshot = false
    } = options;

    let browser;
    const results = [];
    const visited = new Set();

    try {
        browser = await createBrowser();
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        const page = await context.newPage();
        page.setDefaultTimeout(DEFAULT_TIMEOUT);

        let currentUrl = startUrl;

        for (let i = 0; i < maxPages; i++) {
            if (visited.has(currentUrl)) break;
            visited.add(currentUrl);

            console.log(`[Browser] Visiting: ${currentUrl}`);
            await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });

            // Handle login if credentials provided
            if (credentials && i === 0) {
                try {
                    if (credentials.usernameSelector) {
                        await page.fill(credentials.usernameSelector, credentials.username);
                        await page.fill(credentials.passwordSelector, credentials.password);
                        await page.click(credentials.submitSelector);
                        await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
                    }
                } catch (e) {
                    console.warn('[Browser] Login step failed:', e.message);
                }
            }

            if (waitForSelector) {
                try {
                    await page.waitForSelector(waitForSelector, { timeout: DEFAULT_TIMEOUT });
                } catch (_) {}
            }

            const content = await extractPageContent(page);
            const analysis = await analyseContent(content, objective);
            results.push({ url: currentUrl, ...analysis });

            if (screenshot) {
                const screenshotPath = `/tmp/browser-${Date.now()}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: false });
                console.log(`[Browser] Screenshot: ${screenshotPath}`);
            }

            if (!analysis.nextAction || analysis.found) break;
            currentUrl = analysis.nextAction;
        }

        // Synthesise all results
        const allData = results.filter(r => r.found).map(r => r.data);
        const summary = results.map(r => r.summary).join(' ');

        // Write to Obsidian
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        memory.append(`Research/${date}.md`,
            `## ${time} — ${objective}\n\n${summary}\n\nSources: ${[...visited].join(', ')}`
        );

        return {
            success: true,
            objective,
            summary,
            data: allData.length === 1 ? allData[0] : allData,
            pagesVisited: visited.size,
            sources: [...visited]
        };

    } catch (err) {
        console.error('[Browser] research error:', err.message);
        return { success: false, objective, error: err.message, summary: 'Research failed: ' + err.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Form fill function ────────────────────────────────────────────
async function fillForm(url, fields, submitSelector, options = {}) {
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        page.setDefaultTimeout(DEFAULT_TIMEOUT);

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        for (const [selector, value] of Object.entries(fields)) {
            try {
                await page.fill(selector, String(value));
            } catch (e) {
                console.warn(`[Browser] Could not fill ${selector}:`, e.message);
            }
        }

        if (submitSelector) {
            await page.click(submitSelector);
            await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT }).catch(() => {});
        }

        const content = await extractPageContent(page);
        return { success: true, resultPage: content.title, resultText: content.text.slice(0, 500) };

    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Click action function ─────────────────────────────────────────
async function clickAndExtract(url, clickSelector, options = {}) {
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        page.setDefaultTimeout(DEFAULT_TIMEOUT);

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.click(clickSelector);
        await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT }).catch(() => {});

        const content = await extractPageContent(page);
        return { success: true, content };

    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

module.exports = { research, fillForm, clickAndExtract, createBrowser, extractPageContent };
