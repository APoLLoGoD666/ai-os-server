'use strict';
const router = require('express').Router();
const crypto = require('crypto');

const MODEL         = 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE = 'Orus';
const SAMPLE_RATE   = 24000;
const CACHE_TTL_MS  = 5 * 60 * 1000;  // 5 min
const CACHE_MAX     = 30;

const VOICES = new Set([
    'Achernar','Achird','Algenib','Algieba','Alnilam','Aoede','Autonoe',
    'Callirrhoe','Charon','Despina','Enceladus','Erinome','Fenrir','Gacrux',
    'Iapetus','Kore','Laomedeia','Leda','Orus','Pulcherrima','Puck',
    'Rasalgethi','Sadachbia','Sadaltager','Schedar','Sulafat','Umbriel',
    'Vindemiatrix','Zephyr','Zubenelgenubi',
]);

// In-memory WAV cache keyed by SHA-1 of text — avoids re-calling Gemini for repeated phrases
const _cache = new Map();
function cacheGet(key) {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
    return entry.wav;
}
function cacheSet(key, wav) {
    if (_cache.size >= CACHE_MAX) {
        // evict oldest
        _cache.delete(_cache.keys().next().value);
    }
    _cache.set(key, { wav, ts: Date.now() });
}

// Prepend a 44-byte WAV/RIFF header to raw PCM data (24kHz, 16-bit, mono)
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

async function callGeminiTTS(url, payload) {
    const gRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    return gRes;
}

// POST /api/tts/gemini
// Body: { text: string }
// Returns: audio/wav buffer (PCM 24kHz 16-bit mono with WAV header)
router.post('/tts/gemini', async (req, res) => {
    const t0 = Date.now();
    try {
        const text = (req.body?.text || '').trim();
        if (!text) return res.status(400).json({ error: 'No text provided' });
        if (text.length > 4000) return res.status(400).json({ error: 'Text exceeds 4000 char limit' });

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[APEX-UI] Gemini TTS: GOOGLE_API_KEY / GEMINI_API_KEY not set');
            return res.status(503).json({ error: 'Gemini API key not configured — set GOOGLE_API_KEY or GEMINI_API_KEY' });
        }

        // Return cached WAV if available
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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text }] }],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE } } }
            }
        };

        let gRes;
        try {
            gRes = await callGeminiTTS(url, payload);
            // Single retry after 1.5s on 429 (rate limit) or 503 (transient)
            if ((gRes.status === 429 || gRes.status === 503) && !res.headersSent) {
                console.warn(`[TTS/Gemini] ${gRes.status} — retrying in 1.5s`);
                await new Promise(r => setTimeout(r, 1500));
                gRes = await callGeminiTTS(url, payload);
            }
        } catch (netErr) {
            console.error('[APEX-UI] Gemini TTS network error:', netErr.message);
            return res.status(502).json({ error: 'Network error reaching Gemini API', detail: netErr.message });
        }

        if (!gRes.ok) {
            const errText = await gRes.text().catch(() => '');
            console.error('[APEX-UI] Gemini TTS API error:', gRes.status, errText.slice(0, 300));

            // On 429 rate limit — try ElevenLabs as fallback before giving up
            if (gRes.status === 429 && process.env.ELEVENLABS_API_KEY) {
                try {
                    console.log('[TTS/Gemini] 429 — falling back to ElevenLabs');
                    const elRes = await fetch(
                        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream',
                        {
                            method: 'POST',
                            headers: {
                                'xi-api-key': process.env.ELEVENLABS_API_KEY,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                text: text.slice(0, 500),
                                model_id: 'eleven_turbo_v2',
                                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                            })
                        }
                    );
                    if (elRes.ok) {
                        const mp3 = Buffer.from(await elRes.arrayBuffer());
                        res.set('Content-Type', 'audio/mpeg');
                        res.set('Content-Length', String(mp3.length));
                        res.set('Cache-Control', 'no-store');
                        res.set('X-Apex-TTS-Fallback', 'elevenlabs');
                        return res.send(mp3);
                    }
                } catch (elErr) {
                    console.error('[TTS/ElevenLabs] fallback error:', elErr.message);
                }
            }

            const status = gRes.status === 429 ? 429 : 502;
            return res.status(status).json({ error: 'Gemini API returned ' + gRes.status, detail: errText.slice(0, 300) });
        }

        let json;
        try {
            json = await gRes.json();
        } catch (parseErr) {
            console.error('[APEX-UI] Gemini TTS JSON parse error:', parseErr.message);
            return res.status(502).json({ error: 'Invalid JSON from Gemini API' });
        }

        const inlineData = json?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!inlineData?.data) {
            console.error('[APEX-UI] Gemini TTS: no audio in response —', JSON.stringify(json).slice(0, 300));
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
        console.error('[APEX-UI] Gemini TTS unhandled exception:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/tts/gemini/voices — list available voices
router.get('/tts/gemini/voices', (_req, res) => {
    res.json({ voices: [...VOICES].sort(), default: DEFAULT_VOICE, model: MODEL });
});

module.exports = router;
