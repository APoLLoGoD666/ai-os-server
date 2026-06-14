'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const _auth  = require('../lib/app-auth');

const MODEL         = 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE = 'Charon';
const SAMPLE_RATE   = 24000;
const CACHE_TTL_MS  = 5 * 60 * 1000;
const CACHE_MAX     = 30;

const _cache = new Map();
function cacheGet(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
    return entry.wav;
}
function cacheSet(key, wav) {
    if (_cache.size >= CACHE_MAX) _cache.delete(_cache.keys().next().value);
    _cache.set(key, { wav, ts: Date.now() });
}

function cleanForTTS(text) {
    return text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/^---+$/gm, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function pcmToWav(pcm) {
    const buf = Buffer.alloc(44 + pcm.length);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + pcm.length, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(SAMPLE_RATE, 24);
    buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(pcm.length, 40);
    pcm.copy(buf, 44);
    return buf;
}

// POST /api/tts/gemini
// Body: { text: string }
// Returns: audio/wav (Gemini 2.5 Flash TTS, 24kHz PCM)
router.post('/tts/gemini', _auth, async (req, res) => {
    const t0 = Date.now();
    try {
        const text = cleanForTTS(req.body?.text || '');
        if (!text) return res.status(400).json({ error: 'No text provided' });
        if (text.length > 4000) return res.status(400).json({ error: 'Text exceeds 4000 char limit' });

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[TTS/Gemini] GOOGLE_API_KEY not set');
            return res.status(503).json({ error: 'GOOGLE_API_KEY not configured' });
        }

        const cacheKey = crypto.createHash('sha1').update(text).digest('hex');
        const cached = cacheGet(cacheKey);
        if (cached) {
            res.set('Content-Type', 'audio/wav');
            res.set('Content-Length', String(cached.length));
            res.set('Cache-Control', 'no-store');
            res.set('X-Apex-Cache', 'hit');
            res.set('X-Apex-Latency-Ms', String(Date.now() - t0));
            return res.send(cached);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
        const payload = {
            contents: [{ parts: [{ text }] }],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE } } }
            }
        };

        let gRes;
        try {
            gRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(payload) });
        } catch (netErr) {
            console.error('[TTS/Gemini] network error:', netErr.message);
            return res.status(502).json({ error: 'Network error reaching Gemini API' });
        }

        if (!gRes.ok) {
            const errText = await gRes.text().catch(() => '');
            console.error('[TTS/Gemini] error:', gRes.status, errText.slice(0, 300));
            return res.status(gRes.status === 429 ? 429 : 502).json({ error: 'Gemini API returned ' + gRes.status });
        }

        let json;
        try { json = await gRes.json(); } catch (e) {
            return res.status(502).json({ error: 'Invalid JSON from Gemini API' });
        }

        const inlineData = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!inlineData?.data) {
            console.error('[TTS/Gemini] no audio in response:', JSON.stringify(json).slice(0, 300));
            return res.status(502).json({ error: 'No audio data in Gemini response' });
        }

        const pcm = Buffer.from(inlineData.data, 'base64');
        const wav = pcmToWav(pcm);
        const latency = Date.now() - t0;

        cacheSet(cacheKey, wav);

        res.set('Content-Type', 'audio/wav');
        res.set('Content-Length', String(wav.length));
        res.set('Cache-Control', 'no-store');
        res.set('X-Apex-Latency-Ms', String(latency));
        res.send(wav);

        console.log(`[TTS/Gemini] ${latency}ms · ${wav.length}B · "${text.slice(0, 50)}"`);
    } catch (err) {
        console.error('[TTS/Gemini] unhandled:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/tts/gemini/voices', _auth, (_req, res) => {
    res.json({ voices: ['Orus'], default: DEFAULT_VOICE, model: MODEL });
});

module.exports = router;
