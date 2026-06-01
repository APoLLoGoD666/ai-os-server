'use strict';
const router = require('express').Router();

const MODEL         = 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE = 'Fenrir';
const SAMPLE_RATE   = 24000;

const VOICES = new Set([
    'Achernar','Achird','Algenib','Algieba','Alnilam','Aoede','Autonoe',
    'Callirrhoe','Charon','Despina','Enceladus','Erinome','Fenrir','Gacrux',
    'Iapetus','Kore','Laomedeia','Leda','Orus','Pulcherrima','Puck',
    'Rasalgethi','Sadachbia','Sadaltager','Schedar','Sulafat','Umbriel',
    'Vindemiatrix','Zephyr','Zubenelgenubi',
]);

// Prepend a 44-byte WAV/RIFF header to raw PCM data (24kHz, 16-bit, mono)
function pcmToWav(pcm) {
    const buf = Buffer.alloc(44 + pcm.length);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + pcm.length, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);                       // PCM chunk size
    buf.writeUInt16LE(1, 20);                        // PCM format
    buf.writeUInt16LE(1, 22);                        // mono
    buf.writeUInt32LE(SAMPLE_RATE, 24);
    buf.writeUInt32LE(SAMPLE_RATE * 2, 28);          // byte rate (16-bit mono)
    buf.writeUInt16LE(2, 32);                        // block align
    buf.writeUInt16LE(16, 34);                       // bits per sample
    buf.write('data', 36);
    buf.writeUInt32LE(pcm.length, 40);
    pcm.copy(buf, 44);
    return buf;
}

// POST /api/tts/gemini
// Body: { text: string, voice?: string }
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

        const voiceName = VOICES.has(req.body?.voice) ? req.body.voice : DEFAULT_VOICE;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text }] }],
            generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName }
                    }
                }
            }
        };

        let gRes;
        try {
            gRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (netErr) {
            console.error('[APEX-UI] Gemini TTS network error:', netErr.message);
            return res.status(502).json({ error: 'Network error reaching Gemini API', detail: netErr.message });
        }

        if (!gRes.ok) {
            const errText = await gRes.text().catch(() => '');
            console.error('[APEX-UI] Gemini TTS API error:', gRes.status, errText.slice(0, 300));
            return res.status(502).json({ error: 'Gemini API returned ' + gRes.status, detail: errText.slice(0, 300) });
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

        res.set('Content-Type', 'audio/wav');
        res.set('Content-Length', String(wav.length));
        res.set('Cache-Control', 'no-store');
        res.set('X-Apex-Latency-Ms', String(latency));
        res.send(wav);

        console.log(`[TTS/Gemini] ${latency}ms · ${wav.length}B · voice:${voiceName} · "${text.slice(0, 50)}"`);
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
