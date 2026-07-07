'use strict';
const router = require('express').Router();
const path = require('path');
const multer = require('multer');
const multerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const { requireAppAccess } = require('../../lib/middleware');
const { listWorkspaceFiles, createWorkspaceFile, embedAndStoreDocument } = require('../../lib/workspace');
const { pgSaveDocument } = require('../../lib/pg_helpers');
const runtime = require('../../lib/models/runtime');

router.get('/files', requireAppAccess, async (req, res) => {
    try {
        const files = await listWorkspaceFiles();
        res.status(200).json({ ok: true, count: files.length, files });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/api/upload-file', requireAppAccess, async (req, res) => {
    try {
        const { filename, data, mimeType } = req.body || {};
        if (!filename || !data) return res.status(400).json({ ok: false, reply: "filename and data required." });

        const cleanName = path.basename(filename.trim());
        const buffer = Buffer.from(data, "base64");
        const textContent = buffer.toString("utf-8").slice(0, 8000);

        await createWorkspaceFile(cleanName, textContent);

        const { result: summaryResp } = await runtime.execute({
            tier: 'fast', caller: 'upload-file',
            maxTokens: 150,
            messages: [{ role: "user", content: `Summarise this file in 2-3 sentences:\n\nFilename: ${cleanName}\n\n${textContent.slice(0, 3000)}` }]
        });
        const summary = (summaryResp.content[0]?.text || "").trim();

        await pgSaveDocument(cleanName, textContent, "personal", summary);
        setImmediate(() => embedAndStoreDocument(cleanName, textContent));

        return res.json({ ok: true, reply: `File "${cleanName}" uploaded and summarised.`, summary });
    } catch (error) {
        console.error("UPLOAD FILE ERROR:", error);
        return res.status(500).json({ ok: false, reply: error.message || "Upload failed." });
    }
});

module.exports = router;
