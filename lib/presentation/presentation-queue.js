'use strict';

// UX-08 §13: Cognitive load budget + §20.3: Dispatch via WebSocket.
// UX-08 §19.6: No direct DB writes from presentation layer.

const viz = require('../viz-broadcaster');

// Max concurrent items per level (UX-08 §13)
const BUDGET = { L2: 3, L3: 1, L4: 1, L5: 1 };

// Active presentation items: id → item
const _queue = new Map();

function _levelCount(level) {
    let n = 0;
    for (const item of _queue.values()) { if (item.level === level) n++; }
    return n;
}

function _withinBudget(level) {
    if (!BUDGET[level]) return true; // L0/L1: no cap
    return _levelCount(level) < BUDGET[level];
}

function enqueue(item) {
    if (!item || !item.id || !item.level) return false;
    if (_queue.has(item.id)) return false; // already active
    if (!_withinBudget(item.level)) return false;
    _queue.set(item.id, item);
    viz.emit({ type: 'presentation:inject', action: 'show', item: item });
    return true;
}

function dismiss(id) {
    if (!_queue.has(id)) return false;
    _queue.delete(id);
    viz.emit({ type: 'presentation:inject', action: 'dismiss', id: id });
    return true;
}

function getQueue() {
    return Array.from(_queue.values());
}

function size() {
    return _queue.size;
}

module.exports = { enqueue, dismiss, getQueue, size };
