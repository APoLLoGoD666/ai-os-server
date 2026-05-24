"use strict";
const { chromium } = require('playwright');
const Anthropic = require('@anthropic-ai/sdk');
const memory = require('./obsidian-memory');
const fs = require('fs');
const path = require('path');

const MODEL = 'claude-sonnet-4-6';
const DEFAULT_TIMEOUT = 30000;
const SESSION_DIR = '/tmp/browser-sessions';

// Module-level Anthropic client — NOT new per call
const _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Session helpers ───────────────────────────────────────────────
function _ensureSessionDir() {
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
}

function _loadSession(key) {
    _ensureSessionDir();
    const file = path.join(SESSION_DIR, `${key}.json`);
    if (fs.existsSync(file)) {
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (_) {
            return null;
        }
    }
    return null;
}

function _saveSession(key, state) {
    _ensureSessionDir();
    const file = path.join(SESSION_DIR, `${key}.json`);
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
}

async function createBrowserWithSession(sessionKey) {
    const browser = await chromium.launch({
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
    const existingState = sessionKey ? _loadSession(sessionKey) : null;
    const contextOptions = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    if (existingState) {
        contextOptions.storageState = existingState;
    }
    const context = await browser.newContext(contextOptions);
    return { browser, context, sessionKey };
}

async function saveSessionState({ browser, context, sessionKey }) {
    if (!sessionKey) return;
    try {
        const state = await context.storageState();
        _saveSession(sessionKey, state);
    } catch (e) {
        console.warn('[Browser] Could not save session state:', e.message);
    }
}

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

// ── Extract structured data ───────────────────────────────────────
async function extractStructuredData(page) {
    const url = page.url();
    const data = await page.evaluate(() => {
        // Tables
        const tables = [];
        document.querySelectorAll('table').forEach(table => {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim());
            const rows = Array.from(table.querySelectorAll('tr')).map(tr =>
                Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
            ).filter(r => r.length > 0);
            if (headers.length > 0 || rows.length > 0) {
                tables.push({ headers, rows });
            }
        });

        // Prices
        const priceRegex = /[$£€¥]\s?[\d,]+\.?\d*/g;
        const bodyText = document.body ? document.body.innerText : '';
        const prices = bodyText.match(priceRegex) || [];

        // Key-value pairs from dt/th/[class*=label]
        const kvPairs = {};
        document.querySelectorAll('dt').forEach(dt => {
            const dd = dt.nextElementSibling;
            if (dd && dd.tagName === 'DD') {
                kvPairs[dt.innerText.trim()] = dd.innerText.trim();
            }
        });
        document.querySelectorAll('tr').forEach(tr => {
            const th = tr.querySelector('th');
            const td = tr.querySelector('td');
            if (th && td) {
                kvPairs[th.innerText.trim()] = td.innerText.trim();
            }
        });
        document.querySelectorAll('[class*="label"]').forEach(label => {
            const next = label.nextElementSibling;
            if (next) {
                kvPairs[label.innerText.trim()] = next.innerText.trim();
            }
        });

        return { tables, prices, kvPairs };
    });

    return { ...data, url };
}

// ── Intercept network requests ────────────────────────────────────
function interceptNetwork(page) {
    const captured = [];
    const ANALYTICS_PATTERNS = ['google-analytics', 'analytics', 'doubleclick', 'facebook.com/tr', 'hotjar', 'segment.io'];
    page.on('request', (request) => {
        const type = request.resourceType();
        if (type !== 'fetch' && type !== 'xhr') return;
        const reqUrl = request.url();
        if (ANALYTICS_PATTERNS.some(p => reqUrl.includes(p))) return;
        const allHeaders = request.headers();
        const filteredHeaders = {};
        for (const key of ['content-type', 'authorization', 'accept', 'x-api-key']) {
            if (allHeaders[key]) filteredHeaders[key] = allHeaders[key];
        }
        let postData = null;
        try {
            const raw = request.postData();
            if (raw) postData = raw.slice(0, 500);
        } catch (_) {}
        captured.push({
            method: request.method(),
            url: reqUrl,
            headers: filteredHeaders,
            postData
        });
    });
    return captured;
}

// ── Research cache check ──────────────────────────────────────────
async function checkResearchCache(objective) {
    const keywords = objective
        .split(/\s+/)
        .map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .filter(w => w.length > 3);

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        try {
            const content = await memory.read(`Research/${dateStr}.md`);
            if (!content) continue;
            const contentLower = content.toLowerCase();
            const matchCount = keywords.filter(kw => contentLower.includes(kw)).length;
            if (matchCount >= 3) {
                return { cached: true, date: dateStr, content };
            }
        } catch (_) {
            // File doesn't exist for this date
        }
    }
    return { cached: false };
}

// ── Analyse content with Claude ───────────────────────────────────
async function analyseContent(content, objective) {
    const res = await _client.messages.create({
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
        screenshot: takeScreenshot = false,
        sessionKey = null,
        skipCache = false
    } = options;

    // Cache check
    if (!skipCache) {
        const cached = await checkResearchCache(objective);
        if (cached.cached) {
            console.log(`[Browser] Cache hit for objective on ${cached.date}`);
            return {
                success: true,
                objective,
                summary: cached.content,
                data: null,
                pagesVisited: 0,
                sources: [],
                fromCache: true
            };
        }
    }

    let browser;
    let context;
    const results = [];
    const visited = new Set();

    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        context = session.context;

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
                        await saveSessionState({ browser, context, sessionKey });
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

            if (takeScreenshot) {
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

// ── Parallel research ─────────────────────────────────────────────
async function researchParallel(objective, urls, options = {}) {
    let browser;
    let context;
    try {
        const session = await createBrowserWithSession(options.sessionKey || null);
        browser = session.browser;
        context = session.context;

        const limited = urls.slice(0, 6);

        const results = await Promise.all(limited.map(async (url) => {
            let page;
            try {
                page = await context.newPage();
                page.setDefaultTimeout(DEFAULT_TIMEOUT);
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });
                const content = await extractPageContent(page);
                const analysis = await analyseContent(content, objective);
                return { url, ...analysis };
            } catch (e) {
                return { url, found: false, summary: e.message, data: null };
            } finally {
                if (page) await page.close().catch(() => {});
            }
        }));

        const found = results.filter(r => r.found);
        const summary = results.map(r => `[${r.url}] ${r.summary}`).join('\n\n');

        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        memory.append(`Research/${date}.md`,
            `## ${time} — [Parallel] ${objective}\n\n${summary}\n\nSources: ${urls.join(', ')}`
        );

        return { success: true, objective, results, found: found.length, summary };

    } catch (err) {
        return { success: false, objective, error: err.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Research entity ───────────────────────────────────────────────
async function researchEntity(name, type = 'company', options = {}) {
    const query = type === 'person'
        ? `${name} professional background`
        : `${name} company information`;

    const startUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const result = await research(query, startUrl, { ...options, skipCache: true });

    const normalizedName = name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    const date = new Date().toISOString().split('T')[0];
    const content = `---\ntype: ${type}\ndate: ${date}\n---\n\n## Summary\n\n${result.summary}\n\n## Sources\n\n${(result.sources || []).join('\n')}`;

    try {
        await memory.write(`Entities/${normalizedName}.md`, content);
    } catch (e) {
        console.warn('[Browser] Could not write entity file:', e.message);
    }

    return result;
}

// ── Form fill function ────────────────────────────────────────────
async function fillForm(url, fields, submitSelector, options = {}) {
    const { sessionKey = null } = options;
    let browser;
    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        const context = session.context;
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

// ── Batch form fill ───────────────────────────────────────────────
async function batchFillForm(submissions, options = {}) {
    const { delayMs = 2000, sessionKey = null } = options;
    let browser;
    let context;
    const results = [];

    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        context = session.context;

        for (const sub of submissions) {
            const { url, fields, submitSelector } = sub;
            let pageTitle = '';
            let success = false;
            let error = null;
            let page;
            try {
                page = await context.newPage();
                page.setDefaultTimeout(DEFAULT_TIMEOUT);
                await page.goto(url, { waitUntil: 'domcontentloaded' });

                for (const [selector, value] of Object.entries(fields || {})) {
                    try {
                        await page.fill(selector, String(value));
                    } catch (e) {
                        console.warn(`[Browser] batchFillForm: Could not fill ${selector}:`, e.message);
                    }
                }

                if (submitSelector) {
                    await page.click(submitSelector);
                    await page.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT }).catch(() => {});
                }

                pageTitle = await page.title();
                success = true;
            } catch (e) {
                error = e.message;
            } finally {
                if (page) await page.close().catch(() => {});
            }

            results.push({ url, success, pageTitle, error });

            if (delayMs > 0) {
                await new Promise(r => setTimeout(r, delayMs));
            }
        }

        const succeeded = results.filter(r => r.success).length;
        return { success: true, results, total: submissions.length, succeeded };

    } catch (err) {
        return { success: false, error: err.message, results, total: submissions.length, succeeded: 0 };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Click action function ─────────────────────────────────────────
async function clickAndExtract(url, clickSelector, options = {}) {
    const { sessionKey = null } = options;
    let browser;
    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        const context = session.context;
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

// ── Download file ─────────────────────────────────────────────────
async function downloadFile(url, options = {}) {
    const {
        sessionKey = null,
        credentials = null,
        destDir = '/tmp/browser-downloads'
    } = options;

    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    let browser;
    let context;
    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        context = session.context;

        // Login if credentials provided
        if (credentials) {
            const loginPage = await context.newPage();
            loginPage.setDefaultTimeout(DEFAULT_TIMEOUT);
            try {
                await loginPage.goto(credentials.loginUrl, { waitUntil: 'domcontentloaded' });
                await loginPage.fill(credentials.usernameSelector, credentials.username);
                await loginPage.fill(credentials.passwordSelector, credentials.password);
                await loginPage.click(credentials.submitSelector);
                await loginPage.waitForLoadState('networkidle', { timeout: DEFAULT_TIMEOUT });
                await saveSessionState({ browser, context, sessionKey });
            } catch (e) {
                console.warn('[Browser] downloadFile login failed:', e.message);
            } finally {
                await loginPage.close().catch(() => {});
            }
        }

        const page = await context.newPage();
        page.setDefaultTimeout(DEFAULT_TIMEOUT);

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.goto(url)
        ]);

        const filename = download.suggestedFilename();
        const savePath = path.join(destDir, filename);
        await download.saveAs(savePath);
        await page.close().catch(() => {});

        return { success: true, path: savePath, filename };

    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Generate PDF ──────────────────────────────────────────────────
async function generatePDF(url, options = {}) {
    const { outputPath, sessionKey = null, waitForSelector = null } = options;
    let browser;
    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        const context = session.context;
        const page = await context.newPage();
        page.setDefaultTimeout(DEFAULT_TIMEOUT);

        await page.goto(url, { waitUntil: 'networkidle' });

        if (waitForSelector) {
            try {
                await page.waitForSelector(waitForSelector, { timeout: DEFAULT_TIMEOUT });
            } catch (_) {}
        }

        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
        });

        return { success: true, path: outputPath };

    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Audit accessibility ───────────────────────────────────────────
async function auditAccessibility(url, options = {}) {
    const { sessionKey = null } = options;
    let browser;
    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        const context = session.context;
        const page = await context.newPage();
        page.setDefaultTimeout(DEFAULT_TIMEOUT);

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Take accessibility snapshot
        const snapshot = await page.accessibility.snapshot();

        // Check for violations
        const violations = await page.evaluate(() => {
            const issues = [];

            // Buttons/links smaller than 44x44
            document.querySelectorAll('button, a').forEach(el => {
                const rect = el.getBoundingClientRect();
                if ((rect.width > 0 || rect.height > 0) && (rect.width < 44 || rect.height < 44)) {
                    issues.push({
                        type: 'small-target',
                        element: el.tagName.toLowerCase(),
                        text: (el.innerText || '').trim().slice(0, 50),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    });
                }
            });

            // Images without alt
            document.querySelectorAll('img').forEach(img => {
                if (!img.hasAttribute('alt')) {
                    issues.push({
                        type: 'missing-alt',
                        element: 'img',
                        src: (img.src || '').slice(0, 100)
                    });
                }
            });

            // Inputs without labels
            document.querySelectorAll('input, textarea, select').forEach(input => {
                const id = input.id;
                const hasLabel = id && document.querySelector(`label[for="${id}"]`);
                const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
                if (!hasLabel && !hasAriaLabel) {
                    issues.push({
                        type: 'missing-label',
                        element: input.tagName.toLowerCase(),
                        inputType: input.type || ''
                    });
                }
            });

            return issues;
        });

        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const logEntry = `## ${time} — Accessibility Audit: ${url}\n\nViolations: ${violations.length}\n\n${violations.map(v => `- [${v.type}] ${JSON.stringify(v)}`).join('\n')}`;

        try {
            memory.append('System/AccessibilityLog.md', logEntry);
        } catch (e) {
            console.warn('[Browser] Could not append accessibility log:', e.message);
        }

        return { success: true, url, violations, violationCount: violations.length };

    } catch (err) {
        return { success: false, url, error: err.message, violations: [], violationCount: 0 };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Monitor page ──────────────────────────────────────────────────
async function monitorPage(url, selector, options = {}) {
    const { sessionKey = null, screenshot: takeScreenshot = false } = options;
    let browser;
    let screenshotPath = null;
    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        const context = session.context;
        const page = await context.newPage();
        page.setDefaultTimeout(DEFAULT_TIMEOUT);

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        let value = null;
        try {
            value = await page.textContent(selector);
        } catch (_) {
            try {
                value = await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    return el ? el.innerText : null;
                }, selector);
            } catch (_2) {}
        }

        if (takeScreenshot) {
            screenshotPath = `/tmp/monitor-${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath });
        }

        return {
            success: true,
            url,
            selector,
            value,
            checkedAt: new Date().toISOString(),
            screenshotPath
        };

    } catch (err) {
        return { success: false, url, selector, error: err.message, checkedAt: new Date().toISOString() };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Discover API ──────────────────────────────────────────────────
async function discoverAPI(url, options = {}) {
    const { sessionKey = null, waitMs = 5000, interactions = [] } = options;
    let browser;
    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        const context = session.context;
        const page = await context.newPage();
        page.setDefaultTimeout(DEFAULT_TIMEOUT);

        const captured = interceptNetwork(page);

        await page.goto(url, { waitUntil: 'domcontentloaded' });

        for (const action of interactions) {
            try {
                if (action.fill) {
                    await page.fill(action.fill.selector, action.fill.value);
                }
                if (action.click) {
                    await page.click(action.click);
                }
                if (action.wait) {
                    await new Promise(r => setTimeout(r, action.wait));
                }
            } catch (e) {
                console.warn('[Browser] discoverAPI interaction error:', e.message);
            }
        }

        await new Promise(r => setTimeout(r, waitMs));

        return { success: true, url, requests: captured };

    } catch (err) {
        return { success: false, url, error: err.message, requests: [] };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Screenshot ────────────────────────────────────────────────────
async function screenshot(url, outputPath, options = {}) {
    const { sessionKey = null, fullPage = true, waitForSelector = null } = options;
    let browser;
    try {
        const session = await createBrowserWithSession(sessionKey);
        browser = session.browser;
        const context = session.context;
        const page = await context.newPage();
        page.setDefaultTimeout(DEFAULT_TIMEOUT);

        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle' });

        if (waitForSelector) {
            try {
                await page.waitForSelector(waitForSelector, { timeout: DEFAULT_TIMEOUT });
            } catch (_) {}
        }

        await page.screenshot({ path: outputPath, fullPage });

        return { success: true, path: outputPath };

    } catch (err) {
        return { success: false, error: err.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

module.exports = {
    research, researchParallel, researchEntity,
    fillForm, batchFillForm, clickAndExtract,
    downloadFile, generatePDF, auditAccessibility,
    monitorPage, discoverAPI, screenshot,
    extractStructuredData, extractPageContent,
    createBrowser, createBrowserWithSession, checkResearchCache
};
