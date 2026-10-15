'use strict';
const router = require('express').Router();
const multer = require('multer');
const multerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const { requireAppAccess } = require('../../lib/middleware');
const _mkd = require('../../agent-system/markitdown-bridge');
const path = require('path');

router.post('/api/convert/file', requireAppAccess, multerUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'file required' });
        const result = await _mkd.convertBuffer(req.file.buffer, req.file.originalname);
        res.json({ ok: result.success, markdown: result.markdown, source: req.file.originalname });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/convert/url', requireAppAccess, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _mkd.convertUrl(url);
        res.json({ ok: result.success, markdown: result.markdown, source: url });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/convert/ingest', requireAppAccess, multerUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'file required' });
        const mdResult = await _mkd.convertBuffer(req.file.buffer, req.file.originalname);
        if (!mdResult.success) throw new Error('conversion failed');
        const { obsidianWrite } = require('../../agent-system/obsidian-client');
        const safeName = path.basename(req.file.originalname || 'file').replace(/[<>:"|?*\x00-\x1f]/g, '_');
        const noteName = `09 Knowledge/References/${safeName.replace(/\.[^.]+$/, '')}.md`;
        await obsidianWrite(noteName, `# ${safeName}\n\n${mdResult.markdown}`);
        res.json({ ok: true, note: noteName, chars: mdResult.markdown.length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/convert/batch', requireAppAccess, multerUpload.array('files', 20), async (req, res) => {
    try {
        if (!req.files || !req.files.length) return res.status(400).json({ ok: false, error: 'files required' });
        const results = await _mkd.convertBatch(req.files.map(f => ({ buffer: f.buffer, name: f.originalname })));
        res.json({ ok: true, results });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/convert/local', requireAppAccess, async (req, res) => {
    try {
        const { path: filePath, baseDir } = req.body;
        if (!filePath) return res.status(400).json({ ok: false, error: 'path required' });
        const result = await _mkd.convertLocal(filePath, { baseDir });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/convert/azure', requireAppAccess, async (req, res) => {
    try {
        const { path: filePath, endpoint, key } = req.body;
        if (!filePath) return res.status(400).json({ ok: false, error: 'path required' });
        const result = await _mkd.convertWithAzureDI(filePath, endpoint, key);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/convert/azure-cu', requireAppAccess, async (req, res) => {
    try {
        const { path: filePath, endpoint, key } = req.body;
        if (!filePath) return res.status(400).json({ ok: false, error: 'path required' });
        const result = await _mkd.convertWithAzureCU(filePath, endpoint, key);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
