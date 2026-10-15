"use strict";
// Firecrawl bridge — complete API surface for web scraping, search, crawl, interact, and autonomous agent.
// Endpoints: /scrape /search /crawl /map /batch-scrape /interact /agent /extract
const APEX_FC_KEY = () => process.env.FIRECRAWL_API_KEY;

let _app = null;
function _getApp() {
    if (!APEX_FC_KEY()) throw new Error('FIRECRAWL_API_KEY not set');
    if (!_app) {
        const mod = require('@mendable/firecrawl-js');
        const Cls = mod.default || mod;
        _app = new Cls({ apiKey: APEX_FC_KEY() });
    }
    return _app;
}

// ── Core endpoints ───────────────────────────────────────────────────────────

// Single URL → clean markdown + metadata + screenshots
async function scrape(url, opts = {}) {
    const r = await _getApp().scrapeUrl(url, { formats: ['markdown'], ...opts });
    return { success: r.success, markdown: r.markdown || '', metadata: r.metadata || {}, url };
}

// Web search → results with full page content already extracted
async function search(query, opts = {}) {
    const r = await _getApp().search(query, {
        limit: 5,
        scrapeOptions: { formats: ['markdown'] },
        ...opts
    });
    return { success: r.success, results: r.data || [] };
}

// Start an async site crawl — returns a job id you can poll
async function crawlAsync(url, opts = {}) {
    return _getApp().asyncCrawlUrl(url, {
        limit: 20,
        scrapeOptions: { formats: ['markdown'] },
        ...opts
    });
}

// Poll a crawl job to completion
async function crawlStatus(jobId) {
    return _getApp().checkCrawlStatus(jobId);
}

// Enumerate all URLs in a domain without scraping content
async function map(url, opts = {}) {
    return _getApp().mapUrl(url, opts);
}

// ── Batch scrape — multiple URLs concurrently ──────────────────────────────
// Returns { success, results: [{url, markdown, metadata}] }
async function batchScrape(urls, opts = {}) {
    const r = await _getApp().batchScrapeUrls(urls, {
        formats: ['markdown'],
        ...opts
    });
    return { success: r.success, results: r.data || [] };
}

// ── Interact — browser actions before extraction ───────────────────────────
// actions: [{ type: 'click'|'fill'|'scroll'|'wait', selector?, text?, direction?, ms? }]
async function interact(url, actions = [], opts = {}) {
    const r = await _getApp().scrapeUrl(url, {
        formats: ['markdown'],
        actions,
        ...opts
    });
    return { success: r.success, markdown: r.markdown || '', metadata: r.metadata || {}, url };
}

// ── Structured extract — LLM-schema based extraction ──────────────────────
// schema: Zod or JSON schema describing the shape of data to extract
async function extract(urls, prompt, schema = null, opts = {}) {
    const extractOpts = { prompt, ...opts };
    if (schema) extractOpts.schema = schema;
    const r = await _getApp().extract(Array.isArray(urls) ? urls : [urls], extractOpts);
    return { success: r.success, data: r.data };
}

// ── Autonomous agent — no URL needed, goal-directed browsing ──────────────
// Firecrawl agent navigates the web autonomously to fulfil the prompt
async function agentTask(prompt, opts = {}) {
    const r = await _getApp().agent(prompt, opts);
    return { success: r.success, data: r.data, steps: r.steps || [] };
}

// ── High-level helpers ───────────────────────────────────────────────────────

// Research a topic — search + summarise top N pages
async function researchTopic(query, limit = 3) {
    const { success, results } = await search(query, { limit });
    if (!success || !results.length) return { success: false, summary: '', sources: [] };
    const summary = results
        .slice(0, limit)
        .map(r => `### ${r.metadata?.title || r.url}\n${(r.markdown || '').slice(0, 800)}`)
        .join('\n\n');
    return {
        success: true,
        summary: summary.slice(0, 3000),
        sources: results.slice(0, limit).map(r => r.url)
    };
}

// Scrape one URL, return a trimmed summary
async function researchUrl(url) {
    const { success, markdown, metadata } = await scrape(url);
    if (!success) return { success: false, summary: '', url };
    return { success: true, summary: markdown.slice(0, 3000), title: metadata.title || '', url };
}

// Research multiple URLs in one batch call
async function researchBatch(urls) {
    const { success, results } = await batchScrape(urls);
    if (!success) return { success: false, items: [] };
    return {
        success: true,
        items: results.map(r => ({
            url: r.metadata?.sourceURL || r.url || '',
            title: r.metadata?.title || '',
            summary: (r.markdown || '').slice(0, 800)
        }))
    };
}

// Retry scrape with exponential backoff — Firecrawl API can transiently fail on JS-heavy pages
async function scrapeWithRetry(url, opts = {}, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try { return await scrape(url, opts); }
        catch (e) {
            lastError = e;
            if (attempt < maxRetries) {
                const delay = 800 * Math.pow(2, attempt - 1); // 800ms, 1600ms, 3200ms
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastError || new Error('scrapeWithRetry: all attempts failed');
}

// Screenshot a URL — returns base64 PNG via Firecrawl screenshot format
async function screenshotUrl(url, opts = {}) {
    const r = await _getApp().scrapeUrl(url, { formats: ['screenshot'], ...opts });
    return {
        success: r.success,
        screenshot: r.screenshot || null, // base64 PNG string from Firecrawl
        metadata: r.metadata || {},
        url
    };
}

// True iff FIRECRAWL_API_KEY is set
function isAvailable() { return !!APEX_FC_KEY(); }

module.exports = {
    scrape, search, crawlAsync, crawlStatus, map,
    batchScrape, interact, extract, agentTask,
    researchTopic, researchUrl, researchBatch,
    scrapeWithRetry, screenshotUrl, isAvailable
};
