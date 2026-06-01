'use strict';
const router = require('express').Router();
const crypto = require('crypto');

// Google Cloud Text-to-Speech — production-stable Neural2 voice
// Enable at: console.cloud.google.com → APIs & Services → Cloud Text-to-Speech API
const TTS_URL       = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const VOICE_NAME    = 'en-GB-Neural2-B';   // British male, closest to Orus character
const LANGUAGE_CODE = 'en-GB';
const SAMPLE_RATE   = 24000;
const CACHE_TTL_MS  = 5 * 60 * 1000;
const CACHE_MAX     = 30;

// In-memory WAV cache — avoids re-calling Cloud TTS for repeated phrases
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

// Prepend 44-byte WAV/RIFF header to raw LINEAR16 PCM (24kHz, 16-bit, mono)
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

async function callCloudTTS(apiKey, text) {
    const res = await fetch(`${TTS_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text },
            voice: { languageCode: LANGUAGE_CODE, name: VOICE_NAME },
            audioConfig: {
                audioEncoding: 'LINEAR16',
                sampleRateHertz: SAMPLE_RATE,
                speakingRate: 1.05,
                pitch: -1.0
            }
        })
    });
    return res;
}

// POST /api/tts/gemini  (endpoint name preserved — no frontend changes needed)
// Body: { text: string }
// Returns: audio/wav
router.post('/tts/gemini', async (req, res) => {
    const t0 = Date.now();
    try {
        const text = (req.body?.text || '').trim();
        if (!text) return res.status(400).json({ error: 'No text provided' });
        if (text.length > 5000) return res.status(400).json({ error: 'Text too long' });

        const apiKey = process.env.GOOGLE_CLOUD_TTS_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error('[TTS/Cloud] No API key — set GOOGLE_CLOUD_TTS_KEY or GOOGLE_API_KEY');
            return res.status(503).json({ error: 'TTS API key not configured' });
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

        let gRes;
        try {
            gRes = await callCloudTTS(apiKey, text);
            // Single retry on transient errors
            if ((gRes.status === 429 || gRes.status === 503) && !res.headersSent) {
                console.warn(`[TTS/Cloud] ${gRes.status} — retrying in 1.5s`);
                await new Promise(r => setTimeout(r, 1500));
                gRes = await callCloudTTS(apiKey, text);
            }
        } catch (netErr) {
            console.error('[TTS/Cloud] Network error:', netErr.message);
            return res.status(502).json({ error: 'Network error reaching Cloud TTS', detail: netErr.message });
        }

        if (!gRes.ok) {
            const errText = await gRes.text().catch(() => '');
            console.error('[TTS/Cloud] API error:', gRes.status, errText.slice(0, 300));
            const status = gRes.status === 429 ? 429 : 502;
            return res.status(status).json({ error: 'Cloud TTS returned ' + gRes.status, detail: errText.slice(0, 300) });
        }

        let json;
        try { json = await gRes.json(); }
        catch (e) { return res.status(502).json({ error: 'Invalid JSON from Cloud TTS' }); }

        if (!json?.audioContent) {
            console.error('[TTS/Cloud] No audioContent in response');
            return res.status(502).json({ error: 'No audio in Cloud TTS response' });
        }

        const pcm = Buffer.from(json.audioContent, 'base64');
        const wav = pcmToWav(pcm);
        const latency = Date.now() - t0;

        cacheSet(cacheKey, wav);

        res.set('Content-Type', 'audio/wav');
        res.set('Content-Length', String(wav.length));
        res.set('Cache-Control', 'no-store');
        res.set('X-Apex-Latency-Ms', String(latency));
        res.send(wav);

        console.log(`[TTS/Cloud] ${latency}ms · ${wav.length}B · "${text.slice(0, 50)}"`);
    } catch (err) {
        console.error('[TTS/Cloud] Unhandled exception:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/tts/gemini/voices
router.get('/tts/gemini/voices', (_req, res) => {
    res.json({ provider: 'google-cloud-tts', voice: VOICE_NAME, language: LANGUAGE_CODE });
});

module.exports = router;
