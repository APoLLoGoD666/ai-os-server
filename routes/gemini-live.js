'use strict';
const https      = require('https');
const WebSocket  = require('ws');

const GEMINI_MODEL     = 'gemini-2.5-flash-preview-native-audio-dialog';
const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const GEMINI_WS_BASE   = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const _maskKey = (key, s) => key ? String(s || '').replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]') : String(s || '');
const INPUT_RATE  = 16000;
const OUTPUT_RATE = 24000;

// ── Apex tools as Gemini function declarations ────────────────────────────────
const APEX_FUNCTION_DECLARATIONS = [
    {
        name: 'web_search',
        description: 'Search the web for current information, news, facts, or anything requiring up-to-date knowledge.',
        parameters: { type: 'object', properties: { query: { type: 'string', description: 'The search query' } }, required: ['query'] }
    },
    {
        name: 'get_weather',
        description: 'Get current weather for any location.',
        parameters: { type: 'object', properties: { location: { type: 'string', description: 'City or location, e.g. "Leamington Spa"' } }, required: ['location'] }
    },
    {
        name: 'get_datetime',
        description: 'Get the current date and time.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'list_emails',
        description: 'List the current email queue — subjects, senders, summaries, priorities.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'check_emails',
        description: 'Fetch new emails from Gmail right now.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'get_notifications',
        description: 'Get recent alerts, notifications, and proactive messages from Apex. Use on greeting or when asked what is happening.',
        parameters: {
            type: 'object',
            properties: { unread_only: { type: 'boolean', description: 'Return only unread. Defaults to true.' } }
        }
    },
    {
        name: 'list_files',
        description: 'List all files and documents in the workspace.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'read_file',
        description: 'Read the contents of a specific file from the workspace.',
        parameters: { type: 'object', properties: { filename: { type: 'string', description: 'Filename to read.' } }, required: ['filename'] }
    },
    {
        name: 'search_documents',
        description: 'Search saved documents and workspace files by keyword.',
        parameters: { type: 'object', properties: { keyword: { type: 'string', description: 'Keyword to search for.' } }, required: ['keyword'] }
    },
    {
        name: 'create_task',
        description: 'Save a task, reminder, or follow-up. Use for any "remind me", "remember to", or "note" requests.',
        parameters: { type: 'object', properties: { description: { type: 'string', description: 'What to remember or follow up on.' } }, required: ['description'] }
    },
    {
        name: 'list_tasks',
        description: 'Read all pending tasks and reminders.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'get_news',
        description: 'Get latest news headlines.',
        parameters: {
            type: 'object',
            properties: { category: { type: 'string', description: 'Filter: uk, world, business, technology, science. Omit for all.' } }
        }
    },
    {
        name: 'get_calendar_events',
        description: 'Get upcoming calendar events and schedule.',
        parameters: {
            type: 'object',
            properties: { days: { type: 'number', description: 'Days ahead to look. Defaults to 7.' } }
        }
    },
    {
        name: 'get_finance_summary',
        description: 'Get finance summary: transactions, invoices, subscriptions, monthly spending.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'get_health_summary',
        description: 'Get health summary: workouts, nutrition, sleep, mood.',
        parameters: { type: 'object', properties: {} }
    }
];

// ── Voice intent routing ──────────────────────────────────────────────────────
const _TOOL_RE = /\b(weather|email|calendar|news|task|remind|reminder|files?|search|health|fitness|finance|time|date|notifications?)\b/i;
const _DEEP_RE = /\b(think|analyse|analyze|plan|write|explain|code|help me|should i|advise|strategy|review|compare|summarize|summarise|decide|suggest|recommend)\b/i;

function _classifyIntent(text) {
    const words = text.trim().split(/\s+/).length;
    if (words <= 5 || _TOOL_RE.test(text)) return 'gemini';
    if (_DEEP_RE.test(text) || words > 20) return 'sonnet';
    return 'haiku';
}

async function _ttsChunk(text, apiKey) {
    const body = JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Orus' } } }
        }
    });
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path:     `/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${apiKey}`,
            method:   'POST',
            headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, res => {
            const parts = [];
            res.on('data', d => parts.push(d));
            res.on('end', () => {
                try {
                    const json = JSON.parse(Buffer.concat(parts).toString());
                    const b64  = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                    if (!b64) return reject(new Error('no audio in TTS response'));
                    const buf  = Buffer.from(b64, 'base64');
                    // Strip 44-byte WAV header if present
                    resolve(buf.slice(0, 4).toString('ascii') === 'RIFF' ? buf.slice(44) : buf);
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

async function _claudeVoiceStream(text, model, anthropicClient, systemPrompt, geminiApiKey, onAudio, onTranscript) {
    const sentenceRe = /([^.!?]{8,}[.!?]+)(?=\s|$)/g;
    let buffer = '';
    let fullText = '';

    const stream = anthropicClient.messages.stream({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: text }]
    });

    for await (const chunk of stream) {
        if (chunk.type !== 'content_block_delta' || chunk.delta?.type !== 'text_delta') continue;
        const token = chunk.delta.text;
        buffer   += token;
        fullText += token;

        sentenceRe.lastIndex = 0;
        let match;
        let consumed = 0;
        while ((match = sentenceRe.exec(buffer)) !== null) {
            const sentence = match[1].trim();
            if (sentence) {
                try {
                    const pcm = await _ttsChunk(sentence, geminiApiKey);
                    onAudio(pcm.toString('base64'));
                } catch (e) {
                    console.warn('[GeminiLive] TTS chunk failed:', e.message);
                }
            }
            consumed = match.index + match[0].length;
            sentenceRe.lastIndex = 0;
        }
        if (consumed) buffer = buffer.slice(consumed);
    }

    // Flush remainder
    if (buffer.trim()) {
        try {
            const pcm = await _ttsChunk(buffer.trim(), geminiApiKey);
            onAudio(pcm.toString('base64'));
        } catch (e) {
            console.warn('[GeminiLive] TTS tail flush failed:', e.message);
        }
    }

    if (fullText) onTranscript(fullText);
}

// ── Dynamic system prompt ─────────────────────────────────────────────────────
function buildSystemPrompt(alexContext) {
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const time  = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    return `You are Apex — Alex's personal AI chief of staff. Your single goal is to improve Alex's life.

TODAY: ${today}, ${time}. Alex is in Leamington Spa, Warwickshire, England.

${alexContext ? `WHAT YOU KNOW ABOUT ALEX:\n${alexContext}\n` : ''}
YOUR ROLE: Chief of staff across every life domain — communications, finance, health, university, business, daily operations, and anything Alex needs. Be proactive, decisive, and precise. Learn from every interaction.

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

    wss.on('connection', async (browserWs) => {
        const resolvedKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!resolvedKey) {
            safeSend(browserWs, { type: 'error', message: 'GOOGLE_API_KEY / GEMINI_API_KEY not configured on server' });
            browserWs.close(1011, 'no api key');
            return;
        }

        // Build context-aware system prompt fresh on each session
        let alexContext = '';
        if (buildAlexContext) {
            try { alexContext = await buildAlexContext(); } catch (e) { console.error('[GeminiLive] buildAlexContext failed:', e.message); }
        }
        const systemPrompt = buildSystemPrompt(alexContext);

        const geminiUrl = `${GEMINI_WS_BASE}?key=${resolvedKey}`;
        const geminiWs  = new WebSocket(geminiUrl);
        let ready                = false;
        let _suppressGeminiAudio = false;
        const _sessionTranscript = [];

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
        });

        // ── Gemini → browser ─────────────────────────────────────────────────
        geminiWs.on('message', async raw => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            // Session established
            if ('setupComplete' in msg) {
                ready = true;
                safeSend(browserWs, { type: 'ready' });
                console.log('[GeminiLive] session ready — tools active, Alex context injected');
                return;
            }

            // ── Tool calls from Gemini ────────────────────────────────────────
            if (msg.toolCall && executeApexTool) {
                const calls = msg.toolCall.functionCalls || [];
                const responses = [];
                for (const call of calls) {
                    console.log(`[GeminiLive] tool call: ${call.name}`, JSON.stringify(call.args || {}).slice(0, 120));
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
                if (geminiWs.readyState === WebSocket.OPEN) {
                    geminiWs.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
                }
                return;
            }

            const sc = msg.serverContent;
            if (!sc) return;

            // Audio output — skip if Claude is handling this turn
            if (!_suppressGeminiAudio) {
                for (const p of (sc.modelTurn?.parts || [])) {
                    if (p.inlineData?.data && p.inlineData.mimeType?.startsWith('audio/pcm')) {
                        safeSend(browserWs, { type: 'audio', data: p.inlineData.data, rate: OUTPUT_RATE });
                    }
                }
            }

            // User transcript — route decision happens here
            if (sc.inputTranscription?.text) {
                const userText = sc.inputTranscription.text;
                safeSend(browserWs, { type: 'transcript_user', text: userText });
                _sessionTranscript.push({ role: 'user', text: userText });

                const route = anthropicClient ? _classifyIntent(userText) : 'gemini';
                if (route !== 'gemini') {
                    _suppressGeminiAudio = true;
                    const model = route === 'sonnet' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';
                    console.log(`[GeminiLive] routing "${userText.slice(0, 60)}" → Claude ${route}`);
                    _claudeVoiceStream(
                        userText, model, anthropicClient, systemPrompt, resolvedKey,
                        (b64pcm) => safeSend(browserWs, { type: 'audio', data: b64pcm, rate: OUTPUT_RATE }),
                        (apexText) => {
                            safeSend(browserWs, { type: 'transcript_apex', text: apexText });
                            _sessionTranscript.push({ role: 'apex', text: apexText });
                            safeSend(browserWs, { type: 'turn_complete' });
                            _suppressGeminiAudio = false;
                            _logTurnToObsidian(_sessionTranscript, obsidianAppend);
                        }
                    ).catch(e => {
                        console.error('[GeminiLive] Claude voice stream failed:', e.message);
                        _suppressGeminiAudio = false;
                    });
                }
            }

            // Apex transcript (Gemini-handled turns)
            if (!_suppressGeminiAudio && sc.outputTranscription?.text) {
                safeSend(browserWs, { type: 'transcript_apex', text: sc.outputTranscription.text });
                _sessionTranscript.push({ role: 'apex', text: sc.outputTranscription.text });
            }

            // Turn complete for Gemini-handled turns
            if (!_suppressGeminiAudio && sc.turnComplete) {
                safeSend(browserWs, { type: 'turn_complete' });
                _logTurnToObsidian(_sessionTranscript, obsidianAppend);
            }
        });

        // ── browser → Gemini ─────────────────────────────────────────────────
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

            // Text injection (from chat input while Gemini Live is active)
            if (msg.type === 'text' && msg.text && geminiWs.readyState === WebSocket.OPEN) {
                geminiWs.send(JSON.stringify({
                    clientContent: {
                        turns: [{ role: 'user', parts: [{ text: msg.text }] }],
                        turnComplete: true
                    }
                }));
            }
        });

        // ── Cleanup ───────────────────────────────────────────────────────────
        const closeGemini = () => {
            if (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING)
                geminiWs.close();
        };

        browserWs.on('close', closeGemini);
        browserWs.on('error', e => { console.error('[GeminiLive] browser error:', e.message); closeGemini(); });

        geminiWs.on('close', (code, reason) => {
            console.log(`[GeminiLive] Gemini session closed ${code}`);
            safeSend(browserWs, { type: 'disconnected', code });
            if (browserWs.readyState === WebSocket.OPEN) browserWs.close();
        });
        geminiWs.on('error', e => {
            const safeMsg = _maskKey(resolvedKey, e.message);
            console.error('[GeminiLive] Gemini error:', safeMsg);
            safeSend(browserWs, { type: 'error', message: safeMsg });
        });
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
    const entry = `## ${time} *(Gemini Live)*\n\n**Alex:** ${user.text}\n\n**Apex:** ${apex.text}\n`;
    obsidianAppend(`Conversations/${today}.md`, entry).catch(() => {});
}

function safeSend(ws, obj) {
    if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify(obj)); } catch {}
    }
}

module.exports = { attach };
