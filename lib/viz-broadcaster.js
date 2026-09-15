'use strict';

// lib/viz-broadcaster.js — real-time visualization event broadcaster
// Ring buffer of last 300 events; WebSocket subscribers receive history on connect
// then live pushes on each emit(). Used by APEX MIND overview visualization.

const { WebSocketServer } = require('ws');

const RING_SIZE = 300;
const _ring = [];
const _subs = new Set();
let _wss = null;

function _ensureWss() {
    if (_wss) return _wss;
    _wss = new WebSocketServer({ noServer: true });
    _wss.on('connection', function(ws) {
        _subs.add(ws);
        try { ws.send(JSON.stringify({ type: 'history', events: _ring.slice() })); } catch (_) {}
        ws.on('close', function() { _subs.delete(ws); });
        ws.on('error', function() { _subs.delete(ws); });
    });
    return _wss;
}

function handleUpgrade(req, socket, head) {
    _ensureWss().handleUpgrade(req, socket, head, function(ws) {
        _ensureWss().emit('connection', ws, req);
    });
}

function emit(event) {
    if (!event || !event.type) return;
    const payload = Object.assign({}, event, { ts: event.ts || new Date().toISOString() });
    _ring.push(payload);
    if (_ring.length > RING_SIZE) _ring.shift();
    const msg = JSON.stringify(payload);
    _subs.forEach(function(ws) {
        try { if (ws.readyState === ws.OPEN) ws.send(msg); } catch (_) {}
    });
}

function tapEventBus(bus) {
    if (!bus) return;
    try {
        const E = bus.E || {};
        if (E.AGENT_STARTED) {
            bus.on(E.AGENT_STARTED, function(event) {
                const ev = event.payload || {};
                emit({ type: 'agent', status: 'started', ok: true, label: ev.label || ev.task_id || '', correlation_id: event.correlation_id || null });
            });
        }
        if (E.AGENT_COMPLETED) {
            bus.on(E.AGENT_COMPLETED, function(event) {
                const ev = event.payload || {};
                emit({ type: 'agent', status: ev.ok ? 'completed' : 'failed', ok: !!ev.ok, label: ev.label || ev.task_id || '', activeCount: ev.activeCount || 0, correlation_id: event.correlation_id || null });
            });
        }
        if (E.VOICE_STARTED) {
            bus.on(E.VOICE_STARTED, function(event) {
                const ev = event.payload || {};
                emit({ type: 'voice', status: 'started', session_id: ev.session_id || '', correlation_id: event.correlation_id || null });
            });
        }
        if (E.REFLEX_RESPONSE_SENT) {
            bus.on(E.REFLEX_RESPONSE_SENT, function(event) {
                const ev = event.payload || {};
                emit({ type: 'voice', status: 'reflex', data: ev.response || '', correlation_id: event.correlation_id || null });
            });
        }
        if (E.USER_INTERRUPTED) {
            bus.on(E.USER_INTERRUPTED, function(event) {
                emit({ type: 'voice', status: 'interrupted', correlation_id: event.correlation_id || null });
            });
        }
        if (E.SESSION_COMPLETED) {
            bus.on(E.SESSION_COMPLETED, function(event) {
                const ev = event.payload || {};
                emit({ type: 'voice', status: 'completed', session_id: ev.session_id || '', correlation_id: event.correlation_id || null });
            });
        }
        if (E.TOOL_DISPATCHED) {
            bus.on(E.TOOL_DISPATCHED, function(event) {
                const ev = event.payload || {};
                emit({ type: 'tool', status: 'dispatched', data: ev.tool || ev.name || '', correlation_id: event.correlation_id || null });
            });
        }
        if (E.TOOL_COMPLETED) {
            bus.on(E.TOOL_COMPLETED, function(event) {
                const ev = event.payload || {};
                emit({ type: 'tool', status: ev.ok !== false ? 'completed' : 'failed', data: ev.tool || ev.name || '', correlation_id: event.correlation_id || null });
            });
        }
        if (E.CLAUDE_STARTED) {
            bus.on(E.CLAUDE_STARTED, function(event) {
                const ev = event.payload || {};
                emit({ type: 'system', status: 'claude_started', data: ev.model || '', correlation_id: event.correlation_id || null });
            });
        }
        if (E.BACKGROUND_TASK_QUEUED) {
            bus.on(E.BACKGROUND_TASK_QUEUED, function(event) {
                const ev = event.payload || {};
                emit({ type: 'system', status: 'queued', data: ev.label || ev.task_id || '', correlation_id: event.correlation_id || null });
            });
        }
        if (E.MODEL_INVOKED) {
            bus.on(E.MODEL_INVOKED, function(event) {
                const ev = event.payload || {};
                emit({ type: 'system', status: 'model_invoked', data: ev.model || '', correlation_id: event.correlation_id || null });
            });
        }
    } catch (_) {}
}

module.exports = { emit, handleUpgrade, tapEventBus };
