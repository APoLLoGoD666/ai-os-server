'use strict';
const WebSocket = require('ws');

const GEMINI_MODEL   = 'gemini-2.5-flash-preview-native-audio-dialog';
const GEMINI_WS_BASE = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const INPUT_RATE     = 16000;
const OUTPUT_RATE    = 24000;

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
function attach(server, { appKey, executeApexTool, buildAlexContext, obsidianAppend } = {}) {
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
            try { alexContext = await buildAlexContext(); } catch {}
        }
        const systemPrompt = buildSystemPrompt(alexContext);

        const geminiUrl = `${GEMINI_WS_BASE}?key=${resolvedKey}`;
        const geminiWs  = new WebSocket(geminiUrl);
        let ready        = false;
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

            // Audio output
            for (const p of (sc.modelTurn?.parts || [])) {
                if (p.inlineData?.data && p.inlineData.mimeType?.startsWith('audio/pcm')) {
                    safeSend(browserWs, { type: 'audio', data: p.inlineData.data, rate: OUTPUT_RATE });
                }
            }

            // Transcripts — buffer for Obsidian logging
            if (sc.inputTranscription?.text) {
                safeSend(browserWs, { type: 'transcript_user', text: sc.inputTranscription.text });
                _sessionTranscript.push({ role: 'user', text: sc.inputTranscription.text });
            }
            if (sc.outputTranscription?.text) {
                safeSend(browserWs, { type: 'transcript_apex', text: sc.outputTranscription.text });
                _sessionTranscript.push({ role: 'apex', text: sc.outputTranscription.text });
            }

            // Turn complete — log exchange to Obsidian
            if (sc.turnComplete) {
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
            console.error('[GeminiLive] Gemini error:', e.message);
            safeSend(browserWs, { type: 'error', message: e.message });
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
