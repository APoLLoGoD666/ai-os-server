'use strict';
const router = require('express').Router();
const multer = require('multer');
const multerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const { requireAppAccess } = require('../../lib/middleware');
const _rag = require('../../agent-system/rag-bridge');
const _mkd = require('../../agent-system/markitdown-bridge');
const path = require('path');

// Guard: return 503 immediately if sidecar isn't configured
function requireRagSidecar(req, res, next) {
    if (!process.env.RAG_SIDECAR_URL) {
        return res.status(503).json({ ok: false, error: 'RAG sidecar not configured', hint: 'Set RAG_SIDECAR_URL env var and deploy sidecar service' });
    }
    next();
}

router.get('/api/rag/health', requireAppAccess, requireRagSidecar, async (req, res) => {
    const status = await _rag.health();
    res.json(status);
});

router.post('/api/rag/ingest', requireAppAccess, requireRagSidecar, multerUpload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ ok: false, error: 'file required' });
        const result = await _rag.ingest(req.file.buffer, req.file.originalname);
        // Also convert to markdown and store in Obsidian knowledge base
        try {
            const mdResult = await _mkd.convertBuffer(req.file.buffer, req.file.originalname);
            if (mdResult.success && mdResult.markdown) {
                const { obsidianWrite } = require('../../agent-system/obsidian-client');
                const safeName = path.basename(req.file.originalname || 'file').replace(/[<>:"|?*\x00-\x1f]/g, '_');
                const noteName = `09 Knowledge/References/${safeName.replace(/\.[^.]+$/, '')}.md`;
                await obsidianWrite(noteName, `# ${safeName}\n\n${mdResult.markdown}`);
            }
        } catch {}
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/rag/query', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { query, mode, topK } = req.body;
        if (!query) return res.status(400).json({ ok: false, error: 'query required' });
        const result = await _rag.query(query, mode || 'hybrid', topK || 5);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/rag/query/multimodal', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ ok: false, error: 'query required' });
        const result = await _rag.queryMultimodal(query);
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

router.post('/api/rag/insert', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { items } = req.body;
        if (!Array.isArray(items) || !items.length) return res.status(400).json({ ok: false, error: 'items array required' });
        const result = await _rag.insertContent(items);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/rag/ingest/url', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ ok: false, error: 'url required' });
        const result = await _rag.ingestUrl(url);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/rag/ingest/folder', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const { path: folderPath } = req.body;
        if (!folderPath) return res.status(400).json({ ok: false, error: 'path required' });
        const result = await _rag.ingestFolder(folderPath);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/rag/reset', requireAppAccess, requireRagSidecar, async (req, res) => {
    try {
        const result = await _rag.reset();
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
