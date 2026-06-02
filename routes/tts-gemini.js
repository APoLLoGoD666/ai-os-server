'use strict';
const router = require('express').Router();
const crypto = require('crypto');

const VOICE       = 'en-GB-Neural2-B';
const LANG        = 'en-GB';
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX    = 30;

const _cache = new Map();
function cacheGet(key) {
    const e = _cache.get(key);
    if (!e) return null;
    if (Date.now() - e.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
    return e.buf;
}
function cacheSet(key, buf) {
    if (_cache.size >= CACHE_MAX) _cache.delete(_cache.keys().next().value);
    _cache.set(key, { buf, ts: Date.now() });
}

// POST /api/tts/gemini
// Body: { text: string }
// Returns: audio/mpeg (Google Cloud TTS Neural2)
router.post('/tts/gemini', async (req, res) => {
    const t0 = Date.now();
    try {
        const text = (req.body?.text || '').trim();
        if (!text) return res.status(400).json({ error: 'No text provided' });
        if (text.length > 4000) return res.status(400).json({ error: 'Text exceeds 4000 char limit' });

        const apiKey = process.env.GOOGLE_TTS_KEY;
        if (!apiKey) {
            console.error('[TTS/CloudTTS] GOOGLE_TTS_KEY not set');
            return res.status(503).json({ error: 'GOOGLE_TTS_KEY not configured' });
        }

        const cacheKey = crypto.createHash('sha1').update(text).digest('hex');
        const cached = cacheGet(cacheKey);
        if (cached) {
            res.set('Content-Type', 'audio/mpeg');
            res.set('Content-Length', String(cached.length));
            res.set('Cache-Control', 'no-store');
            res.set('X-Apex-Cache', 'hit');
            res.set('X-Apex-Latency-Ms', String(Date.now() - t0));
            return res.send(cached);
        }

        let gRes;
        try {
            gRes = await fetch(
                `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: { text },
                        voice: { languageCode: LANG, name: VOICE },
                        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 }
                    })
                }
            );
        } catch (netErr) {
            console.error('[TTS/CloudTTS] network error:', netErr.message);
            return res.status(502).json({ error: 'Network error reaching Cloud TTS' });
        }

        if (!gRes.ok) {
            const errText = await gRes.text().catch(() => '');
            console.error('[TTS/CloudTTS] error:', gRes.status, errText.slice(0, 300));
            return res.status(gRes.status === 429 ? 429 : 502).json({ error: 'Cloud TTS returned ' + gRes.status });
        }

        const json = await gRes.json();
        if (!json.audioContent) {
            console.error('[TTS/CloudTTS] no audioContent in response');
            return res.status(502).json({ error: 'No audio in Cloud TTS response' });
        }

        const mp3 = Buffer.from(json.audioContent, 'base64');
        cacheSet(cacheKey, mp3);

        const latency = Date.now() - t0;
        res.set('Content-Type', 'audio/mpeg');
        res.set('Content-Length', String(mp3.length));
        res.set('Cache-Control', 'no-store');
        res.set('X-Apex-Latency-Ms', String(latency));
        res.send(mp3);

        console.log(`[TTS/CloudTTS] ${latency}ms · ${mp3.length}B · "${text.slice(0, 50)}"`);
    } catch (err) {
        console.error('[TTS/CloudTTS] unhandled:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/tts/gemini/voices', (_req, res) => {
    res.json({ voices: [VOICE], default: VOICE, model: 'google-cloud-tts-neural2' });
});

module.exports = router;
