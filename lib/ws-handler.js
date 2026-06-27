'use strict';
// lib/ws-handler.js — APEX WebSocket server
// gws patterns: perMessageDeflate compression, frame-reuse broadcast, keepalive, upgrade hook.
// Call init(server) once after the HTTP server is created.
// Exposes globals: global._wsBroadcast, global._wsSend, global._wsChunkedSend

const { WebSocketServer } = require('ws');
const _sessionReg         = require('./session-state-registry');

let _wss;
let _wsSessions;
let _wsKeepalive;

// Broadcast fan-out: serialize ONCE, send same buffer to all (gws frame-reuse pattern)
function wsBroadcast(data, filter = null) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    const buf = Buffer.from(msg, 'utf8');
    _wsSessions.forEach((meta, ws) => {
        if (ws.readyState === ws.OPEN && (!filter || filter(meta))) {
            ws.send(buf);
        }
    });
}

// Push to a specific session
function wsSend(ws, data) {
    if (ws.readyState === ws.OPEN) {
        ws.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
}

// gws chunked send: split large payloads into sequenced frames
function wsChunkedSend(ws, data, chunkSize = 64 * 1024) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const total = Math.ceil(payload.length / chunkSize);
    for (let i = 0; i < total; i++) {
        const chunk = payload.slice(i * chunkSize, (i + 1) * chunkSize);
        wsSend(ws, { type: 'chunk', seq: i, total, data: chunk });
    }
}

function init(server) {
    const APP_ACCESS_KEY = process.env.APP_ACCESS_KEY || '';

    // WebSocket server — noServer so we control the upgrade path
    _wss = new WebSocketServer({
        noServer: true,
        perMessageDeflate: {
            zlibDeflateOptions: { level: 6, memLevel: 8 },
            zlibInflateOptions: { chunkSize: 10 * 1024 },
            clientNoContextTakeover: true,
            serverNoContextTakeover: true,
            threshold: 1024           // only compress messages >1KB (gws threshold pattern)
        }
    });

    // Session registry — maps ws connection → metadata
    _wsSessions = new Map();
    // Expose live WS count to services layer without circular require
    Object.defineProperty(global, '_apexWsCount', { get: () => _wsSessions.size, configurable: true });

    // ── OnOpen — initialize session state ─────────────────────────────
    _wss.on('connection', (ws, req) => {
        const sessionId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const meta = { sessionId, connectedAt: new Date().toISOString(), channels: new Set(['system']) };
        _wsSessions.set(ws, meta);
        wsSend(ws, { type: 'connected', sessionId, ts: Date.now() });
        console.log(`[WS] OnOpen — ${sessionId} (total: ${_wsSessions.size})`);

        // ── OnMessage — route to handlers ─────────────────────────────
        ws.on('message', async (raw) => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            switch (msg.type) {
                case 'subscribe':
                    (msg.channels || []).forEach(ch => meta.channels.add(ch));
                    wsSend(ws, { type: 'subscribed', channels: [...meta.channels] });
                    break;

                case 'ping':
                    wsSend(ws, { type: 'pong', ts: Date.now() });
                    break;

                case 'voice:transcript':
                    // Voice pipeline input — broadcast to voice channel subscribers
                    wsBroadcast({ type: 'voice:transcript', text: msg.text, ts: Date.now() },
                        m => m.channels.has('voice'));
                    break;

                case 'agent:status':
                    // Agent pipeline status update — broadcast to agent channel
                    wsBroadcast({ type: 'agent:status', ...msg }, m => m.channels.has('agents'));
                    break;

                case 'browser:snapshot':
                    // Push accessibility snapshot result to requesting session
                    wsSend(ws, { type: 'browser:snapshot', ...msg });
                    break;

                default:
                    wsSend(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
            }
        });

        // ── OnPing / OnPong — respond to client pings, track server pong receipt ──
        ws.on('ping', () => ws.pong());
        ws.on('pong', () => { meta._pongReceived = true; });
        meta._pongReceived = true; // treat initial connect as alive

        // ── OnClose — clean up session ─────────────────────────────────
        ws.on('close', (code, reason) => {
            _wsSessions.delete(ws);
            _sessionReg.deleteSession(sessionId);
            console.log(`[WS] OnClose — ${sessionId} (code=${code}, remaining: ${_wsSessions.size})`);
        });

        ws.on('error', err => {
            console.warn(`[WS] Error on ${sessionId}: ${err.message}`);
            _wsSessions.delete(ws);
        });
    });

    // gws keepalive: proactively ping all clients every 30s, terminate dead ones
    _wsKeepalive = setInterval(() => {
        _wsSessions.forEach((meta, ws) => {
            if (meta._pongReceived === false) {
                console.log(`[WS] Terminating dead session ${meta.sessionId}`);
                _wsSessions.delete(ws);
                ws.terminate();
                return;
            }
            meta._pongReceived = false;
            if (ws.readyState === ws.OPEN) ws.ping();
        });
    }, 60000);
    _wss.on('close', () => clearInterval(_wsKeepalive));

    // Upgrade HTTP → WS on /ws path.
    // IMPORTANT: do NOT destroy /ws/* sub-routes — gemini-live registers its own
    // upgrade handler for /ws/gemini-live AFTER this block. Destroying the socket
    // here would kill it before gemini-live can claim it.
    server.on('upgrade', (req, socket, head) => {
        const urlPath = (req.url || '').split('?')[0];
        if (urlPath === '/ws') {
            const token = new URL(req.url, 'http://x').searchParams.get('token');
            if (APP_ACCESS_KEY) {
                const _t = Buffer.from(token || '', 'utf8');
                const _k = Buffer.from(APP_ACCESS_KEY, 'utf8');
                if (_t.length !== _k.length || !require('crypto').timingSafeEqual(_t, _k)) { socket.destroy(); return; }
            }
            _wss.handleUpgrade(req, socket, head, ws => _wss.emit('connection', ws, req));
        } else if (!urlPath.startsWith('/ws/')) {
            // Only destroy paths that no registered handler owns
            socket.destroy();
        }
        // /ws/* paths fall through to sub-route handlers (e.g. /ws/gemini-live)
    });

    // Export broadcast so routes can push events to clients
    global._wsBroadcast   = wsBroadcast;
    global._wsSend        = wsSend;
    global._wsChunkedSend = wsChunkedSend;
}

// Called by graceful shutdown to stop the keepalive timer
function stop() {
    clearInterval(_wsKeepalive);
}

module.exports = { init, stop, wsBroadcast, wsSend, wsChunkedSend };
