'use strict';
const https     = require('https');
const crypto    = require('crypto');
const WebSocket = require('ws');
const tracker   = require('../lib/latency-tracker');

// Persistent HTTPS agent — reuses TLS connections across TTS calls.
// Eliminates ~100-200ms TLS handshake overhead on 2nd+ chunks per session
// and on 1st chunk when a prior session's connection is still alive.
const _tlsAgent = new https.Agent({ keepAlive: true, keepAliveMsecs: 3000, maxSockets: 6 });

// Lazy-load intelligence module — updates shared voiceState on session open/close.
// Wrapped in try/catch so gemini-live remains functional even if intelligence.js fails to load.
const _intel = (() => { try { return require('./intelligence'); } catch { return null; } })();

const GEMINI_MODEL     = 'gemini-2.5-flash-preview-native-audio-dialog';
const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const GEMINI_WS_BASE   = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const _maskKey         = (key, s) => key ? String(s || '').replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]') : String(s || '');
const INPUT_RATE       = 16000;
const OUTPUT_RATE      = 24000;
const MAX_TRANSCRIPT   = 40;

// ── Apex tools as Gemini function declarations ────────────────────────────────
const APEX_FUNCTION_DECLARATIONS = [
    { name: 'web_search',        description: 'Search the web for current information, news, facts, or anything requiring up-to-date knowledge.',         parameters: { type: 'object', properties: { query:    { type: 'string', description: 'The search query' } },                             required: ['query'] } },
    { name: 'get_weather',       description: 'Get current weather for any location.',                                                                    parameters: { type: 'object', properties: { location: { type: 'string', description: 'City or location, e.g. "Leamington Spa"' } }, required: ['location'] } },
    { name: 'get_datetime',      description: 'Get the current date and time.',                                                                           parameters: { type: 'object', properties: {} } },
    { name: 'list_emails',       description: 'List the current email queue — subjects, senders, summaries, priorities.',                                 parameters: { type: 'object', properties: {} } },
    { name: 'check_emails',      description: 'Fetch new emails from Gmail right now.',                                                                   parameters: { type: 'object', properties: {} } },
    { name: 'get_notifications', description: 'Get recent alerts, notifications, and proactive messages from Apex. Use on greeting or when asked what is happening.', parameters: { type: 'object', properties: { unread_only: { type: 'boolean', description: 'Return only unread. Defaults to true.' } } } },
    { name: 'list_files',        description: 'List all files and documents in the workspace.',                                                           parameters: { type: 'object', properties: {} } },
    { name: 'read_file',         description: 'Read the contents of a specific file from the workspace.',                                                 parameters: { type: 'object', properties: { filename: { type: 'string', description: 'Filename to read.' } },                        required: ['filename'] } },
    { name: 'search_documents',  description: 'Search saved documents and workspace files by keyword.',                                                   parameters: { type: 'object', properties: { keyword:  { type: 'string', description: 'Keyword to search for.' } },                   required: ['keyword'] } },
    { name: 'create_task',       description: 'Save a task, reminder, or follow-up. Use for any "remind me", "remember to", or "note" requests.',        parameters: { type: 'object', properties: { description: { type: 'string', description: 'What to remember or follow up on.' } }, required: ['description'] } },
    { name: 'list_tasks',        description: 'Read all pending tasks and reminders.',                                                                    parameters: { type: 'object', properties: {} } },
    { name: 'get_news',          description: 'Get latest news headlines.',                                                                               parameters: { type: 'object', properties: { category: { type: 'string', description: 'Filter: uk, world, business, technology, science. Omit for all.' } } } },
    { name: 'get_calendar_events', description: 'Get upcoming calendar events and schedule.',                                                             parameters: { type: 'object', properties: { days: { type: 'number', description: 'Days ahead to look. Defaults to 7.' } } } },
    { name: 'get_finance_summary', description: 'Get finance summary: transactions, invoices, subscriptions, monthly spending.',                          parameters: { type: 'object', properties: {} } },
    { name: 'get_health_summary',  description: 'Get health summary: workouts, nutrition, sleep, mood.',                                                  parameters: { type: 'object', properties: {} } },
];

// ── Intent routing ────────────────────────────────────────────────────────────
const _GREETING_RE    = /^(hey|hi|hello|morning|afternoon|evening|good\s+\w+|how are you|what'?s up|yo|sup)[\s!?.,]*$/i;
const _ACKNOWLEDGE_RE = /^(ok|okay|got it|understood|thanks|thank you|sure|yes|no|yep|nope|alright|fine|perfect|great|nice|cheers|brilliant)[\s!?.,]*$/i;
const _TOOL_RE        = /\b(weather|email|calendar|news|task|remind|reminder|files?|search|health|fitness|finance|time|date|notifications?)\b/i;
const _DEEP_RE        = /\b(think|analyse|analyze|plan|write|explain|code|help me|should i|advise|strategy|review|compare|summarize|summarise|decide|suggest|recommend|evaluate|assess|design|draft|create)\b/i;

function _classifyIntent(text) {
    const words = text.trim().split(/\s+/).length;
    if (_GREETING_RE.test(text) || _ACKNOWLEDGE_RE.test(text)) return 'gemini';
    if (words <= 5 || _TOOL_RE.test(text)) return 'gemini';
    if (_DEEP_RE.test(text) || words > 20) return 'sonnet';
    return 'haiku';
}

// ── Semantic chunker — speculative first flush, punctuation-aware ─────────────
//
// Two-phase flushing strategy:
//   First chunk  — low threshold (10 chars), flushes on any phrase boundary
//                  (comma, colon, period, etc.) to start TTS immediately.
//                  "Certainly sir," → audio within ~350ms of first token.
//   Later chunks — higher threshold (60 chars), sentence-final only, for
//                  natural prosody without choppy mid-sentence breaks.
//   Hard flush   — 120 chars, at a word boundary, for any chunk.
//   Timeout      — 350ms (first) / 500ms (later) — forces flush during
//                  long Sonnet responses where sentence boundaries are rare.
//
class SemanticChunker {
    constructor(onChunk) {
        this._buf        = '';
        this._onChunk    = onChunk;
        this._firstDone  = false;   // true after first chunk has been flushed
        this._timer      = null;
    }

    push(token) {
        this._buf += token;
        const maxMs = this._firstDone ? 500 : 350;

        if (!this._timer) {
            this._timer = setTimeout(() => {
                this._timer = null;
                if (this._buf.trim().length > 8) { this._flush(this._buf); this._buf = ''; }
            }, maxMs);
        }

        // Hard flush at word boundary (120 chars)
        if (this._buf.length >= 120) {
            this._clearTimer();
            const cut = this._wordBoundary(this._buf, 120);
            this._flush(this._buf.slice(0, cut));
            this._buf = this._buf.slice(cut).trimStart();
            return;
        }

        if (this._firstDone) {
            // Later chunks: flush on sentence-final punctuation once >= 60 chars
            if (this._buf.length >= 60 && this._isSentenceEnd(this._buf)) {
                this._clearTimer();
                this._flush(this._buf);
                this._buf = '';
            }
        } else {
            // First chunk: speculative — flush on any phrase boundary once >= 10 chars.
            // Catches short confirmations: "Certainly sir,", "Of course, sir.", "Done, sir."
            if (this._buf.length >= 10 && this._isPhraseEnd(this._buf)) {
                this._clearTimer();
                this._flush(this._buf);
                this._buf = '';
            }
        }
    }

    end() {
        this._clearTimer();
        if (this._buf.trim().length > 0) { this._flush(this._buf); this._buf = ''; }
    }

    // BUG-7: kill the timer and discard buffer without flushing — used when the
    // Claude stream throws so the pending setTimeout can't fire stale TTS chunks.
    discard() { this._clearTimer(); this._buf = ''; }

    // Phrase-final: any terminal punctuation (includes comma, colon) — used for first chunk only
    _isPhraseEnd(t) { return /[,;:.!?]\s*$/.test(t); }

    // Sentence-final: period/bang/question not preceded by abbreviation or decimal
    _isSentenceEnd(t) { return /(?<![A-Z][a-z]?\.|[0-9])[.!?]+(?:\s+[A-Z]|\s*$)/.test(t); }

    _wordBoundary(t, near) { const i = t.lastIndexOf(' ', near); return (i > near * 0.5) ? i : near; }

    _flush(t) {
        const s = t.trim();
        if (s.length > 0) { this._firstDone = true; this._onChunk(s); }
    }

    _clearTimer() { if (this._timer) { clearTimeout(this._timer); this._timer = null; } }
}

// ── TTS queue — Claude token loop never blocks on TTS latency ─────────────────
class TtsQueue {
    constructor(onAudio, geminiApiKey, signal, turnId) {
        this._queue         = [];
        this._running       = false;
        this._onAudio       = onAudio;
        this._apiKey        = geminiApiKey;
        this._signal        = signal;
        this._turnId        = turnId;
        this._chunkIndex    = 0;
        this._doneResolvers = [];
    }

    push(text) {
        this._queue.push(text);
        if (!this._running) this._drain();
    }

    waitDone() {
        if (!this._running && this._queue.length === 0) return Promise.resolve();
        return new Promise(resolve => {
            this._doneResolvers.push(resolve);
            // Resolve immediately on abort so waitDone() never hangs
            this._signal?.addEventListener('abort', () => resolve(), { once: true });
        });
    }

    async _drain() {
        this._running = true;
        while (this._queue.length > 0 && !this._signal?.aborted) {
            const text = this._queue.shift();
            const idx  = this._chunkIndex++;
            if (idx === 0) tracker.mark(this._turnId, 'tts_start', { chunk_chars: text.length });
            tracker.mark(this._turnId, 'tts_chunk_start', { chunk_index: idx, chunk_chars: text.length });
            try {
                const b64pcm = await _ttsChunk(text, this._apiKey, this._signal);
                tracker.mark(this._turnId, 'tts_chunk_complete', { chunk_index: idx });
                if (!this._signal?.aborted) {
                    if (idx === 0) {
                        tracker.mark(this._turnId, 'first_audio');
                        tracker.mark(this._turnId, 'first_meaningful_output', { content_preview: text.slice(0, 60) });
                    }
                    this._onAudio(b64pcm);
                }
            } catch (e) {
                if (this._signal?.aborted) break;
                console.warn(`[GeminiLive] TTS chunk ${idx} failed, continuing:`, e.message);
            }
        }
        this._running = false;
        const rs = this._doneResolvers.splice(0);
        for (const r of rs) r();
    }
}

// ── Gemini REST TTS — keepAlive agent, abort-signal aware ────────────────────
// Returns the PCM audio as a base64 string directly from the API response,
// avoiding the decode→encode roundtrip that the previous implementation had.
// WAV-header stripping is handled for the rare case the API wraps in RIFF.
function _ttsChunk(text, apiKey, signal) {
    const body = JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } } }
        }
    });
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new Error('aborted'));
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path:     `/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
            method:   'POST',
            agent:    _tlsAgent,    // reuse TLS connection — eliminates 100-200ms handshake per chunk
            headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'x-goog-api-key': apiKey }
        }, res => {
            const parts = [];
            res.on('data', d => parts.push(d));
            res.on('end', () => {
                try {
                    const json = JSON.parse(Buffer.concat(parts).toString());
                    const b64  = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                    if (!b64) return reject(new Error('no audio in TTS response'));
                    // Check for WAV header — Gemini TTS returns raw PCM in the common case.
                    // Decode just 6 bytes (8 base64 chars) to check the RIFF signature.
                    if (Buffer.from(b64.slice(0, 8), 'base64').slice(0, 4).toString('ascii') === 'RIFF') {
                        // Strip 44-byte WAV header and re-encode (rare path)
                        resolve(Buffer.from(b64, 'base64').slice(44).toString('base64'));
                    } else {
                        // Common path: raw PCM — return base64 directly, no Buffer allocation needed
                        resolve(b64);
                    }
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        // Destroy the underlying socket directly so the https.Agent removes it from
        // its pool immediately — prevents 'close'/'end' listener accumulation on
        // keep-alive sockets that are reused across many sequential TTS requests.
        if (signal) signal.addEventListener('abort', () => {
            if (req.socket) req.socket.destroy(); else req.destroy();
            reject(new Error('aborted'));
        }, { once: true });
        req.write(body);
        req.end();
    });
}

// ── Conversation history: last N transcript turns → Claude messages format ────
function _buildMessages(transcript, currentText) {
    const raw = [
        ...transcript.slice(-10).map(e => ({ role: e.role === 'user' ? 'user' : 'assistant', content: e.text })),
        { role: 'user', content: currentText },
    ];
    // Claude API requires strictly alternating roles — merge consecutive same-role entries
    const msgs = [];
    for (const m of raw) {
        if (msgs.length && msgs[msgs.length - 1].role === m.role) {
            msgs[msgs.length - 1].content += '\n' + m.content;
        } else {
            msgs.push({ ...m });
        }
    }
    return msgs;
}

// ── Claude voice stream ───────────────────────────────────────────────────────
// Token ingestion runs independently of TTS via TtsQueue.
// Partial transcripts stream to the browser every ~50 chars.
// Calls onTranscript only if not aborted.
async function _claudeVoiceStream({ text, model, anthropicClient, systemPrompt, geminiApiKey, sessionTranscript, signal, turnId, onAudio, onPartialTranscript, onTranscript }) {
    let fullText   = '';
    let partialBuf = '';
    let firstToken = true;

    const ttsQueue = new TtsQueue(onAudio, geminiApiKey, signal, turnId);
    const chunker  = new SemanticChunker(
        chunk => { if (!signal.aborted) ttsQueue.push(chunk); }
    );

    tracker.mark(turnId, 'claude_start', { model });

    const stream = anthropicClient.messages.stream({
        model,
        max_tokens: model.includes('sonnet') ? 1200 : 600,
        system:     systemPrompt,
        messages:   _buildMessages(sessionTranscript, text),
    });

    let _streamError = null;
    try {
        for await (const chunk of stream) {
            if (signal.aborted) break;
            if (chunk.type !== 'content_block_delta' || chunk.delta?.type !== 'text_delta') continue;
            const token = chunk.delta.text;
            fullText   += token;
            partialBuf += token;
            if (firstToken) {
                firstToken = false;
                tracker.mark(turnId, 'claude_first_token', { model });
            }
            chunker.push(token);
            if (partialBuf.length >= 50) { onPartialTranscript(fullText); partialBuf = ''; }
        }
    } catch (e) {
        // BUG-7: discard kills the pending setTimeout so it can't fire stale TTS chunks
        // after the IIFE's catch block has already played the fallback audio.
        _streamError = e;
        chunker.discard();
    }
    if (!_streamError) chunker.end();
    await ttsQueue.waitDone();

    if (!signal.aborted && fullText.trim()) onTranscript(fullText);
    if (_streamError) throw _streamError;
}

// ── Never-silence fallback ────────────────────────────────────────────────────
async function _speakFallback(browserWs, geminiApiKey, turnId) {
    const text = 'I ran into a problem with that, sir. Give me just a moment.';
    try {
        const b64pcm = await _ttsChunk(text, geminiApiKey, null);
        safeSend(browserWs, { type: 'audio', data: b64pcm, rate: OUTPUT_RATE });
    } catch (e) { console.warn('[TTS] _speakFallback audio failed:', e.message); }
    safeSend(browserWs, { type: 'transcript_apex_final', text });
    safeSend(browserWs, { type: 'turn_complete' });
    if (turnId) tracker.endSession(turnId, { timed_out: true });
}

// ── Dynamic system prompt ─────────────────────────────────────────────────────
function buildSystemPrompt(alexContext) {
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time  = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `You are Apex — Alex's personal AI chief of staff. Your single goal is to improve Alex's life.

TODAY: ${today}, ${time}. Alex is in Leamington Spa, Warwickshire, England.

${alexContext ? `WHAT YOU KNOW ABOUT ALEX:\n${alexContext}\n` : ''}YOUR ROLE: Chief of staff across every life domain — communications, finance, health, university, business, daily operations, and anything Alex needs. Be proactive, decisive, and precise. Learn from every interaction.

TOOL USAGE — be proactive:
- On any greeting ("hey", "morning", "what's up"): call get_notifications immediately
- Schedule questions: call get_calendar_events
- Email queries: call list_emails
- "What's happening": call get_notifications + get_news
- Weather/travel: call get_weather
- Money/finance: call get_finance_summary
- Health/fitness: call get_health_summary
- Anything requiring current facts: call web_search

VOICE RULES — this is a spoken conversation:
- No markdown, no bullet points, no numbered lists, no asterisks
- Maximum 2-3 sentences unless detail is explicitly asked for
- Always address Alex as "sir"
- Confirm actions: "Done, sir." "Noted, sir." "Sent, sir."
- Be warm, confident, and direct — like a trusted chief of staff who knows Alex deeply`;
}

// ── Attach to http.Server ─────────────────────────────────────────────────────
function attach(server, { appKey, executeApexTool, buildAlexContext, obsidianAppend, anthropicClient } = {}) {
    const wss = new WebSocket.Server({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname !== '/ws/gemini-live') return;
        if (appKey) {
            const hKey = req.headers['x-app-key'] || '';
            const _safe = (k) => { try { return k.length === appKey.length && crypto.timingSafeEqual(Buffer.from(k), Buffer.from(appKey)); } catch { return false; } };
            if (!_safe(hKey)) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
        }
        wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
    });

    wss.on('connection', async (browserWs) => {
        const resolvedKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!resolvedKey) {
            safeSend(browserWs, { type: 'error', message: 'GOOGLE_API_KEY / GEMINI_API_KEY not configured on server' });
            browserWs.close(1011, 'no api key');
            return;
        }

        // Per-connection identity and state
        const connId             = `gl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        let ready                = false;
        let _suppressGeminiAudio = false;
        let _activeAbort         = null;   // AbortController for the in-flight Claude stream
        let _activeTurnId        = null;   // Tracker session ID for the current turn
        let _firstGeminiAudio    = true;   // Tracks first PCM chunk per turn for Gemini path
        const _sessionTranscript = [];     // Rolling conversation history (capped at MAX_TRANSCRIPT)

        let alexContext = '';
        if (buildAlexContext) {
            try { alexContext = await buildAlexContext(); } catch (e) { console.error('[GeminiLive] buildAlexContext failed:', e.message); }
        }
        const systemPrompt = buildSystemPrompt(alexContext);

        // BUG-8: browser may have disconnected during the buildAlexContext() await.
        // Without this guard, geminiWs would be created and never cleaned up.
        if (browserWs.readyState !== WebSocket.OPEN) return;

        const geminiWs = new WebSocket(GEMINI_WS_BASE, { headers: { 'x-goog-api-key': resolvedKey } });
        let _setupTimer = null;

        geminiWs.once('open', () => {
            geminiWs.send(JSON.stringify({
                setup: {
                    model: `models/${GEMINI_MODEL}`,
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } } },
                    },
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    tools: [{ functionDeclarations: APEX_FUNCTION_DECLARATIONS }]
                }
            }));
            _setupTimer = setTimeout(() => {
                if (!ready) {
                    console.warn('[GeminiLive] setup timeout — no setupComplete from Gemini after 10s');
                    safeSend(browserWs, { type: 'error', message: 'Gemini session setup timed out' });
                    geminiWs.close();
                }
            }, 10000);
        });

        // ── Gemini → browser ──────────────────────────────────────────────────
        geminiWs.on('message', async raw => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            if ('setupComplete' in msg) {
                clearTimeout(_setupTimer);
                ready = true;
                safeSend(browserWs, { type: 'ready' });
                if (_intel) { _intel.voiceState.active = true; _intel.voiceState.sessionId = connId; _intel.broadcastVoiceState(); }
                console.log('[GeminiLive] session ready — tools active, Alex context injected');
                return;
            }

            if (msg.toolCall && executeApexTool) {
                const calls = msg.toolCall.functionCalls || [];
                const responses = [];
                for (const call of calls) {
                    console.log(`[GeminiLive] tool: ${call.name}`, JSON.stringify(call.args || {}).slice(0, 120));
                    safeSend(browserWs, { type: 'tool_call', name: call.name, args: call.args || {} });
                    try {
                        const result = await executeApexTool(call.name, call.args || {});
                        responses.push({ id: call.id, response: { output: JSON.stringify(result) } });
                        console.log(`[GeminiLive] tool result: ${call.name} →`, JSON.stringify(result).slice(0, 200));
                    } catch (e) {
                        console.warn(`[GeminiLive] tool error: ${call.name} —`, e.message);
                        responses.push({ id: call.id, response: { output: JSON.stringify({ error: e.message }) } });
                    }
                }
                if (geminiWs.readyState === WebSocket.OPEN)
                    geminiWs.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
                return;
            }

            const sc = msg.serverContent;
            if (!sc) return;

            // ── Step 1: inputTranscription FIRST — route decision sets ────────
            // _suppressGeminiAudio BEFORE audio parts are forwarded below.
            // This eliminates the race where Gemini audio leaks through on Claude turns.
            if (sc.inputTranscription?.text) {
                // Sticky suppression: clear the previous turn's Claude suppression flag here,
                // at the start of the NEXT turn, not when the Claude IIFE completes.
                // This eliminates the race window where stale Gemini audio/transcript/turnComplete
                // can leak through between Claude turn completion and the next user utterance.
                _suppressGeminiAudio = false;
                const userText   = sc.inputTranscription.text;
                const prevTurnId = _activeTurnId; // capture before overwrite — needed for barge-in interrupt

                // New tracker session per turn
                _activeTurnId     = `${connId}-t${Date.now()}`;
                _firstGeminiAudio = true;
                const route       = anthropicClient ? _classifyIntent(userText) : 'gemini';

                tracker.startSession(_activeTurnId, { execution_class: route === 'gemini' ? 'REFLEX' : 'EXECUTIVE' });
                tracker.mark(_activeTurnId, 'audio_received');          // OBS-2: mark when turn audio arrives
                tracker.mark(_activeTurnId, 'transcript_available');
                tracker.mark(_activeTurnId, 'route_selected', { model: route });

                safeSend(browserWs, { type: 'transcript_user', text: userText });
                safeSend(browserWs, { type: 'route', route });

                _trimTranscript();
                _sessionTranscript.push({ role: 'user', text: userText });

                // Abort any in-flight Claude stream (barge-in support)
                if (_activeAbort) {
                    if (prevTurnId) tracker.interrupt(prevTurnId); // OBS-1: record interruption on the OLD turn
                    _activeAbort.abort();
                    _activeAbort = null;
                }

                if (route !== 'gemini') {
                    _suppressGeminiAudio = true;
                    safeSend(browserWs, { type: 'cancel_audio' });
                    tracker.mark(_activeTurnId, 'cancel_audio_sent');

                    const model  = route === 'sonnet' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';
                    _activeAbort = new AbortController();
                    const signal = _activeAbort.signal;
                    const turnId = _activeTurnId;

                    console.log(`[GeminiLive] route → ${route} ("${userText.slice(0, 60)}")`);

                    let audioSent = false; // BUG-3: track whether any audio reached the browser this turn

                    // Guaranteed cleanup via try/finally — fixes BUG-1, BUG-2, BUG-3, fallback safety.
                    (async () => {
                        let apexText = '';
                        try {
                            await _claudeVoiceStream({
                                text: userText, model, anthropicClient, systemPrompt,
                                geminiApiKey: resolvedKey, sessionTranscript: _sessionTranscript,
                                signal, turnId,
                                onAudio: b64pcm => {
                                    audioSent = true; // BUG-3: mark before forwarding
                                    safeSend(browserWs, { type: 'audio', data: b64pcm, rate: OUTPUT_RATE });
                                },
                                onPartialTranscript: partial => safeSend(browserWs, { type: 'transcript_apex_partial', text: partial }),
                                onTranscript: text => { apexText = text; }, // capture only — cleanup is in finally
                            });
                        } catch (e) {
                            if (!signal.aborted) console.error('[GeminiLive] Claude stream error:', e.message);
                        } finally {
                            if (signal.aborted) {
                                // BUG-2: barge-in — new turn owns shared state; only end our tracker session
                                tracker.endSession(turnId, { restarted: true });
                                // Do NOT touch _suppressGeminiAudio or _activeAbort — new turn owns them
                            } else {
                                // BUG-3 + BUG-1: no audio reached browser — play fallback instead of silence
                                if (!audioSent) {
                                    // _speakFallback sends transcript_apex_final, turn_complete, tracker.endSession
                                    await _speakFallback(browserWs, resolvedKey, turnId);
                                } else {
                                    // Normal completion (audio delivered; partial TTS failure is acceptable)
                                    if (apexText.trim()) {
                                        _trimTranscript();
                                        _sessionTranscript.push({ role: 'apex', text: apexText });
                                        safeSend(browserWs, { type: 'transcript_apex_final', text: apexText });
                                        _logTurnToObsidian(_sessionTranscript, obsidianAppend);
                                    }
                                    safeSend(browserWs, { type: 'turn_complete' });
                                    tracker.endSession(turnId);
                                }
                                // R-1 fix: re-check signal after async _speakFallback yield —
                                // a barge-in arriving during that await has already installed new state.
                                // BUG-5 fix: clear _activeTurnId so stale Gemini turnComplete for this
                                // user input cannot send a second turn_complete after suppression lifts.
                                if (!signal.aborted) {
                                    if (_activeTurnId === turnId) _activeTurnId = null;
                                    _activeAbort = null;
                                    // _suppressGeminiAudio stays true until next inputTranscription (sticky suppression)
                                }
                            }
                        }
                    })().catch(e => console.error('[GeminiLive] turn lifecycle error:', e.message));

                } else {
                    console.log(`[GeminiLive] route → gemini ("${userText.slice(0, 60)}")`);
                }
            }

            // ── Step 2: Audio forwarding — suppression flag is already set ────
            if (!_suppressGeminiAudio) {
                for (const p of (sc.modelTurn?.parts || [])) {
                    if (p.inlineData?.data && p.inlineData.mimeType?.startsWith('audio/pcm')) {
                        if (_firstGeminiAudio && _activeTurnId) {
                            tracker.mark(_activeTurnId, 'gemini_audio_start');
                            tracker.mark(_activeTurnId, 'first_audio');
                            tracker.mark(_activeTurnId, 'first_meaningful_output');
                            _firstGeminiAudio = false;
                        }
                        safeSend(browserWs, { type: 'audio', data: p.inlineData.data, rate: OUTPUT_RATE });
                    }
                }
            }

            // Apex transcript (Gemini-native turns only).
            // BUG-6 guard: _activeTurnId check prevents stale Gemini outputTranscription
            // arriving after a Claude IIFE has already sent transcript_apex_final and
            // cleared _activeTurnId — avoids double transcript on the same turn.
            if (!_suppressGeminiAudio && _activeTurnId && sc.outputTranscription?.text) {
                const apexText = sc.outputTranscription.text;
                safeSend(browserWs, { type: 'transcript_apex_final', text: apexText });
                _trimTranscript();
                _sessionTranscript.push({ role: 'apex', text: apexText });
            }

            // Turn complete (Gemini-native turns).
            // BUG-5 guard: _activeTurnId check prevents stale Gemini turnComplete from
            // sending a second turn_complete after a Claude turn has already completed.
            if (!_suppressGeminiAudio && _activeTurnId && sc.turnComplete) {
                safeSend(browserWs, { type: 'turn_complete' });
                tracker.endSession(_activeTurnId);
                _activeTurnId = null;
                _logTurnToObsidian(_sessionTranscript, obsidianAppend);
            }
        });

        // ── browser → Gemini ──────────────────────────────────────────────────
        browserWs.on('message', raw => {
            if (!ready) return;
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }
            if (msg.type === 'audio' && msg.data && geminiWs.readyState === WebSocket.OPEN) {
                geminiWs.send(JSON.stringify({
                    realtimeInput: { mediaChunks: [{ mimeType: `audio/pcm;rate=${INPUT_RATE}`, data: msg.data }] }
                }));
            }
            if (msg.type === 'end_of_turn' && geminiWs.readyState === WebSocket.OPEN) {
                geminiWs.send(JSON.stringify({ clientContent: { turnComplete: true } }));
            }
            if (msg.type === 'text' && msg.text && geminiWs.readyState === WebSocket.OPEN) {
                geminiWs.send(JSON.stringify({
                    clientContent: { turns: [{ role: 'user', parts: [{ text: msg.text }] }], turnComplete: true }
                }));
            }
        });

        // ── Cleanup ───────────────────────────────────────────────────────────
        const closeGemini = () => {
            clearTimeout(_setupTimer);
            if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING)
                geminiWs.close();
        };

        browserWs.on('close', () => {
            if (_activeAbort) { _activeAbort.abort(); _activeAbort = null; }
            _suppressGeminiAudio = false;
            if (_activeTurnId) { tracker.endSession(_activeTurnId); _activeTurnId = null; }
            if (_intel) { _intel.voiceState.active = false; _intel.voiceState.sessionId = null; _intel.voiceState.ttsPlaying = false; _intel.broadcastVoiceState(); }
            closeGemini();
        });
        browserWs.on('error', e => { console.error('[GeminiLive] browser error:', e.message); closeGemini(); });

        geminiWs.on('close', code => {
            console.log(`[GeminiLive] Gemini session closed ${code}`);
            safeSend(browserWs, { type: 'disconnected', code });
            if (_intel) { _intel.voiceState.active = false; _intel.voiceState.sessionId = null; _intel.voiceState.ttsPlaying = false; _intel.broadcastVoiceState(); }
            if (browserWs.readyState === WebSocket.OPEN) browserWs.close();
        });
        geminiWs.on('error', e => {
            const safeMsg = _maskKey(resolvedKey, e.message);
            console.error('[GeminiLive] Gemini error:', safeMsg);
            safeSend(browserWs, { type: 'error', message: safeMsg });
        });

        function _trimTranscript() {
            if (_sessionTranscript.length >= MAX_TRANSCRIPT)
                _sessionTranscript.splice(0, _sessionTranscript.length - MAX_TRANSCRIPT + 1);
        }
    });

    console.log('[GeminiLive] proxy ready at /ws/gemini-live — tools wired');
}

// ── Obsidian conversation logging ─────────────────────────────────────────────
function _logTurnToObsidian(transcript, obsidianAppend) {
    if (!obsidianAppend || transcript.length < 2) return;
    const last = transcript.slice(-2);
    const user = last.find(t => t.role === 'user');
    const apex = last.find(t => t.role === 'apex');
    if (!user || !apex) return;
    const today = new Date().toISOString().split('T')[0];
    const time  = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    obsidianAppend(`13 Briefings/Conversations/${today}.md`, `## ${time} *(Gemini Live)*\n\n**Alex:** ${user.text}\n\n**Apex:** ${apex.text}\n`).catch(() => {});
}

function safeSend(ws, obj) {
    if (ws.readyState === WebSocket.OPEN) { try { ws.send(JSON.stringify(obj)); } catch {} }
}

module.exports = { attach };
