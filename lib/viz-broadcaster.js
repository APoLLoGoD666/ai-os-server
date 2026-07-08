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
        if (E.AGENT_COMPLETED) {
            bus.on(E.AGENT_COMPLETED, function(ev) {
                emit({ type: 'agent', status: ev.ok ? 'completed' : 'failed', ok: !!ev.ok, label: ev.label || ev.task_id || '', activeCount: ev.activeCount || 0 });
            });
        }
        if (E.TASK_QUEUED) {
            bus.on(E.TASK_QUEUED, function(ev) {
                emit({ type: 'agent', status: 'queued', ok: true, label: ev.label || ev.task_id || '' });
            });
        }
    } catch (_) {}
}

module.exports = { emit, handleUpgrade, tapEventBus };
