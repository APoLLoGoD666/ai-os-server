'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const sbAdmin = require('../../lib/clients').getSupabaseClient();

router.post('/api/browser/aria-snapshot', requireAppAccess, async (req, res) => {
    try {
        const { url, waitFor } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const browserAgent = require('../../agent-system/browser-agent');
        const result = await browserAgent.ariaSnapshot(url, { waitFor });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/har', requireAppAccess, async (req, res) => {
    try {
        const { url, actions } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.recordHar(url, { actions });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/press', requireAppAccess, async (req, res) => {
    try {
        const { url, key, selector } = req.body;
        if (!url || !key) return res.status(400).json({ ok: false, error: 'url and key required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.pressKey(url, key, { selector });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/fill', requireAppAccess, async (req, res) => {
    try {
        const { url, selector, text, delay, pressEnter } = req.body;
        if (!url || !selector || text === undefined) return res.status(400).json({ ok: false, error: 'url, selector, text required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.fillSlow(url, selector, text, { delay, pressEnter });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/select', requireAppAccess, async (req, res) => {
    try {
        const { url, selector, value, byLabel } = req.body;
        if (!url || !selector || !value) return res.status(400).json({ ok: false, error: 'url, selector, value required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.selectOption(url, selector, value, { byLabel });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/drag', requireAppAccess, async (req, res) => {
    try {
        const { url, source, target } = req.body;
        if (!url || !source || !target) return res.status(400).json({ ok: false, error: 'url, source, target required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.dragDrop(url, source, target);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/eval', requireAppAccess, async (req, res) => {
    try {
        const { url, script, allowDangerous } = req.body;
        if (!url || !script) return res.status(400).json({ ok: false, error: 'url and script required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.evalInPage(url, script, { allowDangerous });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/console', requireAppAccess, async (req, res) => {
    try {
        const { url, filter } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.consoleMonitor(url, { filter });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/web-vitals', requireAppAccess, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.webVitals(url);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/annotated', requireAppAccess, async (req, res) => {
    try {
        const { url, waitFor } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.annotatedSnapshot(url, { waitFor });
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/mock', requireAppAccess, async (req, res) => {
    try {
        const { url, patterns, handlers } = req.body;
        if (!url || !patterns) return res.status(400).json({ ok: false, error: 'url and patterns required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.mockRoute(url, patterns, handlers || [{}]);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/cookies', requireAppAccess, async (req, res) => {
    try {
        const { url, action, cookies } = req.body;
        if (!url || !action) return res.status(400).json({ ok: false, error: 'url and action required' });
        const ba = require('../../agent-system/browser-agent');
        const result = await ba.manageCookies(url, action, cookies || []);
        res.json({ ok: result.success, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/trace', requireAppAccess, async (req, res) => {
    try {
        const { url, actions, timeout } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const _ba = require('../../agent-system/browser-agent');
        const result = await _ba.recordTrace(url, { actions, timeout });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/video', requireAppAccess, async (req, res) => {
    try {
        const { url, actions, base64, timeout, size } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const _ba = require('../../agent-system/browser-agent');
        const result = await _ba.recordVideo(url, { actions, base64, timeout, size });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

const browserAgent = require('../../agent-system/browser-agent');

router.post('/api/browser/research', requireAppAccess, async (req, res) => {
    const { objective, url, maxPages } = req.body || {};
    if (!objective || !url) return res.status(400).json({
        ok: false, error: 'objective and url required'
    });
    res.json({ ok: true, status: 'running', message: 'Research started' });
    setImmediate(async () => {
        try {
            const result = await browserAgent.research(objective, url, { maxPages: maxPages || 3 });
            await sbAdmin.from('apex_notifications').insert({
                id: `browser-${Date.now()}`,
                message: `Research complete: ${result.summary.slice(0, 200)}`,
                type: 'success',
                read: false
            });
        } catch (e) {
            console.error('[Browser] research route error:', e.message);
        }
    });
});

router.post('/api/browser/fill-form', requireAppAccess, async (req, res) => {
    const { url, fields, submitSelector } = req.body || {};
    if (!url || !fields) return res.status(400).json({
        ok: false, error: 'url and fields required'
    });
    const result = await browserAgent.fillForm(url, fields, submitSelector);
    res.json({ ok: true, ...result });
});

router.post('/api/browser/click', requireAppAccess, async (req, res) => {
    const { url, selector } = req.body || {};
    if (!url || !selector) return res.status(400).json({
        ok: false, error: 'url and selector required'
    });
    const result = await browserAgent.clickAndExtract(url, selector);
    res.json({ ok: true, ...result });
});

router.post('/api/browser/research-parallel', requireAppAccess, async (req, res) => {
    const { objective, urls, sessionKey } = req.body || {};
    if (!objective || !Array.isArray(urls) || !urls.length)
        return res.status(400).json({ ok: false, error: 'objective and urls[] required' });
    res.json({ ok: true, status: 'running', message: 'Parallel research started' });
    setImmediate(async () => {
        try {
            const result = await browserAgent.researchParallel(objective, urls, { sessionKey });
            await sbAdmin.from('apex_notifications').insert({
                id: `browser-par-${Date.now()}`, type: 'success', read: false,
                message: `Parallel research complete: ${result.summary?.slice(0, 200) || 'done'}`
            });
        } catch (e) { console.error('[Browser] parallel research error:', e.message); }
    });
});

router.post('/api/browser/entity', requireAppAccess, async (req, res) => {
    const { name, type } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    res.json({ ok: true, status: 'running', message: `Researching ${type || 'company'}: ${name}` });
    setImmediate(async () => {
        try {
            const result = await browserAgent.researchEntity(name, type || 'company');
            await sbAdmin.from('apex_notifications').insert({
                id: `browser-entity-${Date.now()}`, type: 'success', read: false,
                message: `Entity research complete for "${name}": ${result.summary?.slice(0, 150) || 'done'}`
            });
        } catch (e) { console.error('[Browser] entity research error:', e.message); }
    });
});

router.post('/api/browser/pdf', requireAppAccess, async (req, res) => {
    const { url, waitForSelector, sessionKey } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    try {
        const outputPath = `/tmp/apex-pdf-${Date.now()}.pdf`;
        const result = await browserAgent.generatePDF(url, { outputPath, waitForSelector, sessionKey });
        if (!result.success) return res.status(500).json({ ok: false, error: result.error });
        const fileBuffer = require('fs').readFileSync(result.path);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="apex-report-${Date.now()}.pdf"` });
        res.send(fileBuffer);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/accessibility', requireAppAccess, async (req, res) => {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    try {
        const result = await browserAgent.auditAccessibility(url);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/monitor', requireAppAccess, async (req, res) => {
    const { url, selector, sessionKey, screenshot } = req.body || {};
    if (!url || !selector) return res.status(400).json({ ok: false, error: 'url and selector required' });
    try {
        const result = await browserAgent.monitorPage(url, selector, { sessionKey, screenshot });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/discover-api', requireAppAccess, async (req, res) => {
    const { url, waitMs, interactions, sessionKey } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    try {
        const result = await browserAgent.discoverAPI(url, { waitMs, interactions, sessionKey });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/browser/batch-form', requireAppAccess, async (req, res) => {
    const { submissions, delayMs, sessionKey } = req.body || {};
    if (!Array.isArray(submissions) || !submissions.length)
        return res.status(400).json({ ok: false, error: 'submissions[] required' });
    res.json({ ok: true, status: 'running', message: `Batch form: ${submissions.length} submissions queued` });
    setImmediate(async () => {
        try {
            const result = await browserAgent.batchFillForm(submissions, { delayMs, sessionKey });
            await sbAdmin.from('apex_notifications').insert({
                id: `browser-batch-${Date.now()}`, type: 'success', read: false,
                message: `Batch form complete: ${result.succeeded}/${result.total} succeeded`
            });
        } catch (e) { console.error('[Browser] batch-form error:', e.message); }
    });
});

router.post('/api/browser/screenshot', requireAppAccess, async (req, res) => {
    const { url, fullPage, waitForSelector, sessionKey } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    try {
        const outputPath = `/tmp/apex-screenshot-${Date.now()}.png`;
        const result = await browserAgent.screenshot(url, outputPath, { fullPage, waitForSelector, sessionKey });
        if (!result.success) return res.status(500).json({ ok: false, error: result.error });
        const fileBuffer = require('fs').readFileSync(result.path);
        res.set({ 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="apex-screenshot-${Date.now()}.png"` });
        res.send(fileBuffer);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
