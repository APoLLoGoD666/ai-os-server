'use strict';

// UX-08 §10: 60s evaluation cycle, or triggered by event bus event.
// UX-08 §20.1: ContextEngine runs server-side.

const CYCLE_MS = 60_000;

let _ctx = { activePage: null, voiceState: 'IDLE', taskIds: [], timestamp: Date.now() };
let _timer = null;
const _handlers = [];

function getContext() {
    return Object.assign({}, _ctx);
}

function update(patch) {
    _ctx = Object.assign({}, _ctx, patch, { timestamp: Date.now() });
    _notify();
}

function onContext(fn) {
    _handlers.push(fn);
}

function _notify() {
    const snap = getContext();
    for (const fn of _handlers) { try { fn(snap); } catch (_) {} }
}

function start() {
    if (_timer) return;
    _ctx.timestamp = Date.now();
    _timer = setInterval(function() {
        _ctx.timestamp = Date.now();
        _notify();
    }, CYCLE_MS);
}

function stop() {
    if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { getContext, update, onContext, start, stop };
