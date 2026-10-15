'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const _fc = require('../../agent-system/firecrawl-bridge');

router.post('/api/research/scrape', requireAppAccess, async (req, res) => {
    try {
        const { url, options } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _fc.scrape(url, options || {});
        res.json({ ok: result.success, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/research/search', requireAppAccess, async (req, res) => {
    try {
        const { query, limit } = req.body;
        if (!query) return res.status(400).json({ ok: false, error: 'query required' });
        const result = await _fc.researchTopic(query, limit || 5);
        res.json({ ok: result.success, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/research/crawl', requireAppAccess, async (req, res) => {
    try {
        const { url, options } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const job = await _fc.crawlAsync(url, options || {});
        res.json({ ok: true, jobId: job.id, status: job.status });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.get('/api/research/crawl/:jobId', requireAppAccess, async (req, res) => {
    try {
        const status = await _fc.crawlStatus(req.params.jobId);
        res.json({ ok: true, ...status });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/research/map', requireAppAccess, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _fc.map(url);
        res.json({ ok: result.success, urls: result.links || [], count: (result.links || []).length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/research/agent', requireAppAccess, async (req, res) => {
    try {
        const { prompt, options } = req.body;
        if (!prompt) return res.status(400).json({ ok: false, error: 'prompt required' });
        const result = await _fc.agentTask(prompt, options || {});
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/research/extract', requireAppAccess, async (req, res) => {
    try {
        const { urls, prompt, schema } = req.body;
        if (!urls || !prompt) return res.status(400).json({ ok: false, error: 'urls and prompt required' });
        const result = await _fc.extract(urls, prompt, schema || null);
        res.json({ ok: result.success, data: result.data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/research/batch', requireAppAccess, async (req, res) => {
    try {
        const { urls, screenshot } = req.body;
        if (!Array.isArray(urls) || !urls.length) return res.status(400).json({ ok: false, error: 'urls array required' });
        const formats = ['markdown'];
        if (screenshot) formats.push('screenshot');
        const result = await _fc.batchScrape(urls, { formats });
        res.json({ ok: result.success, results: result.results });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/research/interact', requireAppAccess, async (req, res) => {
    try {
        const { url, actions } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _fc.interact(url, actions || []);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/research/screenshot', requireAppAccess, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _fc.screenshotUrl(url);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/research/scrape-retry', requireAppAccess, async (req, res) => {
    try {
        const { url, options, maxRetries } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _fc.scrapeWithRetry(url, options || {}, maxRetries || 3);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
