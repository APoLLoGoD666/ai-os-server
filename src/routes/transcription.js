'use strict';
const router = require('express').Router();
const multer = require('multer');
const multerUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const { requireAppAccess } = require('../../lib/middleware');

router.post('/api/transcribe', requireAppAccess, multerUpload.single("audio"), async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(503).json({ ok: false, transcript: "", error: "GOOGLE_API_KEY not configured." });

        const audioBuffer = req.file ? req.file.buffer : req.body;
        if (!audioBuffer || !audioBuffer.length) {
            return res.status(400).json({ ok: false, transcript: "", error: "No audio data received." });
        }

        const mimeType = req.file?.mimetype || req.headers["content-type"] || "audio/mp4";
        console.log("[APEX transcribe] mimeType:", mimeType, "size:", audioBuffer.length);

        const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: "Transcribe this audio accurately. Return only the transcript text, nothing else." },
                            { inlineData: { mimeType, data: audioBuffer.toString('base64') } }
                        ]
                    }]
                })
            }
        );
        if (!gRes.ok) {
            const errText = await gRes.text().catch(() => '');
            console.error('[APEX transcribe] Gemini error:', gRes.status, errText.slice(0, 200));
            return res.status(502).json({ ok: false, transcript: "", error: `Gemini transcription failed: ${gRes.status}` });
        }
        const json = await gRes.json();
        const transcript = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        console.log(`TRANSCRIBE: "${transcript.slice(0, 100)}"`);
        return res.json({ ok: true, transcript });
    } catch (error) {
        console.error("TRANSCRIBE ERROR:", error.message);
        return res.status(500).json({ ok: false, transcript: "", error: error.message });
    }
});

module.exports = router;
