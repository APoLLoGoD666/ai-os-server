'use strict';
const WebSocket = require('ws');

// Gemini 2.5 natural audio dialog model — generates speech natively, no TTS voices
const GEMINI_MODEL    = 'gemini-2.5-flash-preview-native-audio-dialog';
const GEMINI_WS_BASE  = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const INPUT_RATE      = 16000;  // browser sends 16 kHz PCM int16 mono
const OUTPUT_RATE     = 24000;  // Gemini returns 24 kHz PCM int16 mono

const SYSTEM_PROMPT = `You are Apex, a personal AI assistant. Always address the user as 'sir'. \
Respond concisely in 1–2 sentences maximum. Natural spoken English only — no markdown, no bullet \
points, no lists, no technical strings. Be direct, warm, and confident.`;

/**
 * Attach Gemini Live WebSocket proxy to the http.Server instance.
 * Browser connects to ws(s)://<host>/ws/gemini-live?app_key=<KEY>
 */
function attach(server, { appKey } = {}) {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    const wss = new WebSocket.Server({ noServer: true });

    // Intercept HTTP upgrade requests for our path
    server.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname !== '/ws/gemini-live') return;

        // Auth — match APP_ACCESS_KEY (skip if not set)
        if (appKey) {
            const qKey = url.searchParams.get('app_key');
            const hKey = req.headers['x-app-key'];
            if (qKey !== appKey && hKey !== appKey) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    });

    wss.on('connection', (browserWs) => {
        const resolvedKey = apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!resolvedKey) {
            safeSend(browserWs, { type: 'error', message: 'GOOGLE_API_KEY / GEMINI_API_KEY not configured on server' });
            browserWs.close(1011, 'no api key');
            return;
        }

        const geminiUrl = `${GEMINI_WS_BASE}?key=${resolvedKey}`;
        const geminiWs  = new WebSocket(geminiUrl);
        let ready = false;

        geminiWs.once('open', () => {
            // Send setup as the very first message
            geminiWs.send(JSON.stringify({
                setup: {
                    model: `models/${GEMINI_MODEL}`,
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                    },
                    systemInstruction: {
                        parts: [{ text: SYSTEM_PROMPT }]
                    }
                }
            }));
        });

        // ── Gemini → browser ─────────────────────────────────────────────
        geminiWs.on('message', raw => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            // Setup handshake complete
            if ('setupComplete' in msg) {
                ready = true;
                safeSend(browserWs, { type: 'ready' });
                console.log('[GeminiLive] session ready');
                return;
            }

            const sc = msg.serverContent;
            if (!sc) return;

            // Audio chunks
            const parts = sc.modelTurn?.parts || [];
            for (const p of parts) {
                if (p.inlineData?.data && p.inlineData.mimeType?.startsWith('audio/pcm')) {
                    safeSend(browserWs, { type: 'audio', data: p.inlineData.data, rate: OUTPUT_RATE });
                }
            }

            // Transcripts (inputTranscription = what user said, outputTranscription = what model said)
            if (sc.inputTranscription?.text)  safeSend(browserWs, { type: 'transcript_user',  text: sc.inputTranscription.text });
            if (sc.outputTranscription?.text) safeSend(browserWs, { type: 'transcript_apex',  text: sc.outputTranscription.text });

            if (sc.turnComplete) safeSend(browserWs, { type: 'turn_complete' });
        });

        // ── browser → Gemini ─────────────────────────────────────────────
        browserWs.on('message', raw => {
            if (!ready) return;
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            if (msg.type === 'audio' && msg.data) {
                if (geminiWs.readyState !== WebSocket.OPEN) return;
                geminiWs.send(JSON.stringify({
                    realtimeInput: {
                        mediaChunks: [{
                            mimeType: `audio/pcm;rate=${INPUT_RATE}`,
                            data: msg.data
                        }]
                    }
                }));
            }

            // Explicit end-of-turn signal (push-to-talk mode)
            if (msg.type === 'end_of_turn') {
                if (geminiWs.readyState !== WebSocket.OPEN) return;
                geminiWs.send(JSON.stringify({ clientContent: { turnComplete: true } }));
            }
        });

        // ── cleanup ───────────────────────────────────────────────────────
        const closeGemini = () => {
            if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING)
                geminiWs.close();
        };

        browserWs.on('close', closeGemini);
        browserWs.on('error', e => { console.error('[GeminiLive] browser ws error:', e.message); closeGemini(); });

        geminiWs.on('close', (code, reason) => {
            console.log(`[GeminiLive] Gemini closed ${code} ${reason}`);
            if (browserWs.readyState === WebSocket.OPEN) browserWs.close();
        });
        geminiWs.on('error', e => {
            console.error('[GeminiLive] Gemini ws error:', e.message);
            safeSend(browserWs, { type: 'error', message: e.message });
        });
    });

    console.log('[GeminiLive] WebSocket proxy ready at /ws/gemini-live');
}

function safeSend(ws, obj) {
    if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify(obj)); } catch {}
    }
}

module.exports = { attach };
