"use strict";
const { chromium } = require('playwright');
const runtime = require('../lib/models/runtime');
const memory = require('./obsidian-memory');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_TIMEOUT = 30000;
const SESSION_DIR = require('path').join(os.tmpdir(), 'browser-sessions');

// Domain allowlist — if set, browser functions block URLs not on this list.
// Populate via BROWSER_ALLOWED_DOMAINS env var (comma-separated) or runtime call.
const _allowedDomains = process.env.BROWSER_ALLOWED_DOMAINS
    ? new Set(process.env.BROWSER_ALLOWED_DOMAINS.split(',').map(d => d.trim().toLowerCase()).filter(Boolean))
    : null;

// RFC-1918 / loopback / link-local / IPv4-mapped IPv6 — always blocked regardless of allowlist
const _PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|::1$|::ffff:|fd[0-9a-f]{2}:|fe80:)/i;

function _checkDomain(url) {
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }
    if (parsed.protocol === 'file:') throw new Error('file:// URLs are blocked');
    if (!parsed.protocol.startsWith('http')) throw new Error(`Protocol blocked: ${parsed.protocol}`);
    const host = parsed.hostname.toLowerCase();
    if (_PRIVATE_HOST.test(host)) throw new Error(`SSRF blocked — private/loopback host: ${host}`);
    if (_allowedDomains && _allowedDomains.size > 0) {
        const bare = host.replace(/^www\./, '');
        if (!_allowedDomains.has(bare)) throw new Error(`Domain not in allowlist: ${host}`);
    }
}

// SSRF-safe page.goto wrapper — validates every navigation URL before hitting the network
async function _safeGoto(page, url, options) {
    _checkDomain(url);
    return page.goto(url, options);
}

// SOCKS5/HTTP proxy configuration — set PLAYWRIGHT_PROXY env var as "socks5://host:port"
const _proxyConfig = process.env.PLAYWRIGHT_PROXY ? { server: process.env.PLAYWRIGHT_PROXY } : undefined;


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
    const launchOpts = {
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
    };
    if (_proxyConfig) launchOpts.proxy = _proxyConfig;
    return await chromium.launch(launchOpts);
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
        if (captured.length < 100) captured.push({
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
    const { result: res } = await runtime.execute({
        tier:      'balanced',
        caller:    'browser-agent',
        maxTokens: 2000,
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
            await _safeGoto(page, currentUrl, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });

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
                await _safeGoto(page, url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });
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

        await _safeGoto(page, url, { waitUntil: 'domcontentloaded' });

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
                await _safeGoto(page, url, { waitUntil: 'domcontentloaded' });

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

        await _safeGoto(page, url, { waitUntil: 'domcontentloaded' });
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
            _safeGoto(page, url)
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

        await _safeGoto(page, url, { waitUntil: 'networkidle' });

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

        await _safeGoto(page, url, { waitUntil: 'domcontentloaded' });

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

        await _safeGoto(page, url, { waitUntil: 'domcontentloaded' });

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

        await _safeGoto(page, url, { waitUntil: 'domcontentloaded' });

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
        await _safeGoto(page, url, { waitUntil: 'networkidle' });

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

// ── HAR recording — full network traffic log (agent-browser pattern) ─────────
async function recordHar(url, options = {}) {
    const harPath = options.outputPath || path.join(os.tmpdir(), `apex-har-${Date.now()}.har`);
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext({ recordHar: { path: harPath, mode: 'full' } });
        const page = await context.newPage();
        await _safeGoto(page, url, { waitUntil: 'networkidle', timeout: options.timeout || DEFAULT_TIMEOUT });
        if (options.actions) {
            for (const act of options.actions) {
                if (act.type === 'click' && act.selector) await page.click(act.selector).catch(() => {});
                if (act.type === 'wait') await page.waitForTimeout(act.ms || 1000);
            }
        }
        await context.close();
        const har = JSON.parse(fs.readFileSync(harPath, 'utf8'));
        const entries = (har.log?.entries || []).map(e => ({
            url: e.request.url, method: e.request.method,
            status: e.response.status, mimeType: e.response.content.mimeType,
            size: e.response.content.size, time: e.time
        }));
        return { success: true, entries, harPath };
    } catch (e) {
        return { success: false, error: e.message, harPath };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Request mocking — intercept and substitute responses ─────────────────────
async function mockRoute(url, patterns, mockHandlers, action = 'scrape') {
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        const mocks = Array.isArray(patterns) ? patterns : [patterns];
        for (let i = 0; i < mocks.length; i++) {
            const handler = mockHandlers[i] || mockHandlers[0];
            await page.route(mocks[i], route => {
                if (typeof handler === 'object') {
                    route.fulfill({ status: handler.status || 200, contentType: handler.contentType || 'application/json', body: typeof handler.body === 'string' ? handler.body : JSON.stringify(handler.body) });
                } else {
                    route.continue();
                }
            });
        }
        await _safeGoto(page, url, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
        const content = await extractPageContent(page);
        return { success: true, content };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Keyboard press — key combos, shortcuts, modal dismissal ──────────────────
async function pressKey(url, key, options = {}) {
    let browser;
    try {
        const session = await createBrowserWithSession(options.sessionKey || null);
        browser = session.browser;
        const page = await session.context.newPage();
        await _safeGoto(page, url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });
        if (options.selector) await page.focus(options.selector);
        await page.keyboard.press(key);
        if (options.screenshot) await page.screenshot({ path: options.screenshot });
        const content = await extractPageContent(page);
        return { success: true, key, content };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Realistic fill — type with per-character delay (bot-detection avoidance) ──
async function fillSlow(url, selector, text, options = {}) {
    let browser;
    try {
        const session = await createBrowserWithSession(options.sessionKey || null);
        browser = session.browser;
        const page = await session.context.newPage();
        await _safeGoto(page, url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });
        await page.waitForSelector(selector, { timeout: 10000 });
        await page.type(selector, text, { delay: options.delay || 60 });
        if (options.pressEnter) await page.keyboard.press('Enter');
        const content = await extractPageContent(page);
        return { success: true, selector, content };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Select dropdown — pick option by value or label ──────────────────────────
async function selectOption(url, selector, valueOrLabel, options = {}) {
    let browser;
    try {
        const session = await createBrowserWithSession(options.sessionKey || null);
        browser = session.browser;
        const page = await session.context.newPage();
        await _safeGoto(page, url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });
        await page.waitForSelector(selector, { timeout: 10000 });
        await page.selectOption(selector, options.byLabel
            ? { label: valueOrLabel }
            : { value: valueOrLabel });
        const content = await extractPageContent(page);
        return { success: true, selector, selected: valueOrLabel, content };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Drag and drop — reorder elements ─────────────────────────────────────────
async function dragDrop(url, sourceSelector, targetSelector, options = {}) {
    let browser;
    try {
        const session = await createBrowserWithSession(options.sessionKey || null);
        browser = session.browser;
        const page = await session.context.newPage();
        await _safeGoto(page, url, { waitUntil: 'networkidle', timeout: DEFAULT_TIMEOUT });
        await page.waitForSelector(sourceSelector, { timeout: 10000 });
        await page.waitForSelector(targetSelector, { timeout: 10000 });
        await page.dragAndDrop(sourceSelector, targetSelector);
        const content = await extractPageContent(page);
        return { success: true, from: sourceSelector, to: targetSelector, content };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── JS evaluation — run script in page context with safety guards ─────────────
const _EVAL_BLOCKLIST = /localStorage\.clear|sessionStorage\.clear|document\.cookie\s*=|fetch\s*\(/i;
async function evalInPage(url, script, options = {}) {
    if (_EVAL_BLOCKLIST.test(script) && !options.allowDangerous) {
        return { success: false, error: 'Script blocked by safety policy. Pass allowDangerous:true to override.' };
    }
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        await _safeGoto(page, url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });
        const result = await page.evaluate(script);
        return { success: true, result };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Console monitor — capture JS logs and errors during page load ─────────────
async function consoleMonitor(url, options = {}) {
    const filter = options.filter || 'all'; // 'all'|'error'|'warn'|'log'
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        const logs = [];
        page.on('console', msg => {
            if (filter === 'all' || msg.type() === filter) {
                logs.push({ type: msg.type(), text: msg.text(), location: msg.location() });
            }
        });
        page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));
        await _safeGoto(page, url, { waitUntil: 'networkidle', timeout: options.timeout || DEFAULT_TIMEOUT });
        return { success: true, url, logs, errorCount: logs.filter(l => l.type === 'error' || l.type === 'pageerror').length };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Core Web Vitals — LCP, CLS, FID, TTFB capture ────────────────────────────
async function webVitals(url, options = {}) {
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        await _safeGoto(page, url, { waitUntil: 'networkidle', timeout: options.timeout || DEFAULT_TIMEOUT });
        const vitals = await page.evaluate(() => {
            return new Promise(resolve => {
                const result = { lcp: null, cls: 0, fid: null, ttfb: null };
                try {
                    const navEntry = performance.getEntriesByType('navigation')[0];
                    if (navEntry) result.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
                    new PerformanceObserver(list => {
                        const entries = list.getEntries();
                        result.lcp = Math.round(entries[entries.length - 1]?.startTime || 0);
                    }).observe({ type: 'largest-contentful-paint', buffered: true });
                    let clsVal = 0;
                    new PerformanceObserver(list => {
                        for (const e of list.getEntries()) {
                            if (!e.hadRecentInput) clsVal += e.value;
                        }
                        result.cls = Math.round(clsVal * 1000) / 1000;
                    }).observe({ type: 'layout-shift', buffered: true });
                    setTimeout(() => resolve(result), 2000);
                } catch { resolve(result); }
            });
        });
        const ratings = {
            lcp: vitals.lcp ? (vitals.lcp < 2500 ? 'good' : vitals.lcp < 4000 ? 'needs-improvement' : 'poor') : 'unknown',
            cls: vitals.cls < 0.1 ? 'good' : vitals.cls < 0.25 ? 'needs-improvement' : 'poor',
            ttfb: vitals.ttfb ? (vitals.ttfb < 800 ? 'good' : vitals.ttfb < 1800 ? 'needs-improvement' : 'poor') : 'unknown'
        };
        return { success: true, url, vitals, ratings };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Annotated snapshot — screenshot with numbered element overlays ────────────
// Implements agent-browser --annotate pattern: @e1, @e2 labels on screenshot
async function annotatedSnapshot(url, options = {}) {
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext();
        const page = await context.newPage();
        await _safeGoto(page, url, { waitUntil: 'domcontentloaded', timeout: options.timeout || DEFAULT_TIMEOUT });
        if (options.waitFor) await page.waitForSelector(options.waitFor, { timeout: 5000 }).catch(() => {});
        const snapshot = await page.accessibility.snapshot({ interestingOnly: true });
        const refs = [];
        let refIdx = 1;
        function _assignRefs(node) {
            if (!node) return;
            if (['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'searchbox'].includes(node.role)) {
                node._ref = `@e${refIdx++}`;
                refs.push({ ref: node._ref, role: node.role, name: node.name || '' });
            }
            (node.children || []).forEach(_assignRefs);
        }
        _assignRefs(snapshot);
        const screenshotBuf = await page.screenshot({ type: 'png' });
        return {
            success: true, url,
            refs,
            screenshot: screenshotBuf.toString('base64'),
            refMap: refs.reduce((m, r) => { m[r.ref] = r; return m; }, {})
        };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Cookie management — set/get/clear cookies for session control ─────────────
async function manageCookies(url, action, cookies = []) {
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext();
        if (action === 'set' && cookies.length) {
            await context.addCookies(cookies.map(c => ({ ...c, url })));
        }
        const page = await context.newPage();
        await _safeGoto(page, url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });
        const current = await context.cookies();
        return { success: true, action, cookies: current };
    } catch (e) {
        return { success: false, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Accessibility snapshot — LLM-optimised page representation ───────────────
// Returns a compact role/name/value tree (playwright-cli pattern, no extra dep).
async function ariaSnapshot(url, options = {}) {
    try { _checkDomain(url); } catch (e) { return { success: false, error: e.message, url }; }
    const browser = await createBrowser();
    try {
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
        const page = await context.newPage();
        await _safeGoto(page, url, { waitUntil: 'domcontentloaded', timeout: options.timeout || DEFAULT_TIMEOUT });
        if (options.waitFor) await page.waitForSelector(options.waitFor, { timeout: 5000 }).catch(() => {});

        // page.accessibility.snapshot() returns the ARIA tree — ideal for LLM consumption
        const snapshot = await page.accessibility.snapshot({ interestingOnly: options.interestingOnly !== false });
        const title = await page.title();
        const currentUrl = page.url();

        // Flatten tree for token efficiency
        function _flatten(node, depth = 0) {
            if (!node) return '';
            const indent = '  '.repeat(depth);
            const name = node.name ? ` "${node.name}"` : '';
            const value = node.value ? ` = ${node.value}` : '';
            const checked = node.checked !== undefined ? ` [${node.checked ? 'checked' : 'unchecked'}]` : '';
            let out = `${indent}${node.role}${name}${value}${checked}\n`;
            if (node.children) out += node.children.map(c => _flatten(c, depth + 1)).join('');
            return out;
        }
        const tree = snapshot ? _flatten(snapshot) : '(no accessible content)';
        return { success: true, title, url: currentUrl, ariaTree: tree.slice(0, 8000) };
    } catch (e) {
        return { success: false, error: e.message, url };
    } finally {
        await browser.close().catch(() => {});
    }
}

// ── CDP trace recording — captures full browser profile (perf, paint, V8) ────
// Returns path to the .zip trace file for DevTools analysis.
async function recordTrace(url, options = {}) {
    const tracePath = options.outputPath || path.join(os.tmpdir(), `apex-trace-${Date.now()}.zip`);
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext();
        await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
        const page = await context.newPage();
        await _safeGoto(page, url, { waitUntil: 'networkidle', timeout: options.timeout || DEFAULT_TIMEOUT });
        if (options.actions) {
            for (const act of options.actions) {
                if (act.type === 'click' && act.selector) await page.click(act.selector).catch(() => {});
                if (act.type === 'wait') await page.waitForTimeout(act.ms || 1000);
                if (act.type === 'fill' && act.selector) await page.fill(act.selector, act.value || '').catch(() => {});
            }
        }
        await context.tracing.stop({ path: tracePath });
        const stats = fs.statSync(tracePath);
        return { success: true, url, tracePath, sizeBytes: stats.size };
    } catch (e) {
        return { success: false, url, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

// ── Video recording — captures page interaction as WebM video ─────────────
// Records full navigation + optional actions; returns base64 webm or path.
async function recordVideo(url, options = {}) {
    const videoDir = options.outputDir || os.tmpdir();
    let browser;
    try {
        browser = await createBrowser();
        const context = await browser.newContext({
            recordVideo: {
                dir: videoDir,
                size: options.size || { width: 1280, height: 720 }
            }
        });
        const page = await context.newPage();
        await _safeGoto(page, url, { waitUntil: 'networkidle', timeout: options.timeout || DEFAULT_TIMEOUT });
        if (options.actions) {
            for (const act of options.actions) {
                if (act.type === 'click' && act.selector) await page.click(act.selector).catch(() => {});
                if (act.type === 'wait') await page.waitForTimeout(act.ms || 1500);
                if (act.type === 'fill' && act.selector) await page.fill(act.selector, act.value || '').catch(() => {});
                if (act.type === 'scroll') await page.evaluate(({ x, y }) => window.scrollBy(x, y), { x: act.x || 0, y: act.y || 500 }).catch(() => {});
            }
        }
        const videoPath = await page.video()?.path();
        await context.close();
        if (!videoPath) return { success: false, url, error: 'No video produced' };
        const stats = fs.statSync(videoPath);
        const result = { success: true, url, videoPath, sizeBytes: stats.size };
        if (options.base64 && stats.size < 10 * 1024 * 1024) {
            result.base64 = fs.readFileSync(videoPath).toString('base64');
        }
        return result;
    } catch (e) {
        return { success: false, url, error: e.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
    }
}

module.exports = {
    research, researchParallel, researchEntity,
    fillForm, batchFillForm, clickAndExtract,
    downloadFile, generatePDF, auditAccessibility,
    monitorPage, discoverAPI, screenshot,
    extractStructuredData, extractPageContent, ariaSnapshot, annotatedSnapshot,
    recordHar, mockRoute, pressKey, fillSlow, selectOption, dragDrop,
    evalInPage, consoleMonitor, webVitals, manageCookies,
    recordTrace, recordVideo,
    createBrowser, createBrowserWithSession, checkResearchCache
};
