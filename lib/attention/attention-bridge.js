'use strict';

// UX-08 §9: Score → level mapping. §16: Voice suppression. §20.2: Bridge module.

const bus         = require('../event-bus');
const engine      = require('./attention-engine');
const ctx         = require('../context/context-engine');
const relevance   = require('../context/relevance-filter');
const queue       = require('../presentation/presentation-queue');
const { voiceState } = require('../voice/state');

// UX-08 §9 BINDING thresholds
const LEVEL_MAP = [
    [0.80, 'L5'],
    [0.65, 'L4'],
    [0.50, 'L3'],
    [0.35, 'L2'],
    [0.20, 'L1'],
    [0.00, 'L0'],
];

function _scoreToLevel(s) {
    for (const [threshold, level] of LEVEL_MAP) {
        if (s >= threshold) return level;
    }
    return 'L0';
}

function _voiceMode() {
    if (voiceState.active && !voiceState.ttsPlaying) return 'LISTENING';
    if (voiceState.ttsPlaying) return 'SPEAKING';
    return 'IDLE';
}

// UX-08 §16: SPEAKING suppresses L2/L3/L4; L5 fires through. LISTENING suppresses all.
function _suppressed(mode, level) {
    if (mode === 'LISTENING') return true;
    if (mode === 'SPEAKING' && (level === 'L2' || level === 'L3' || level === 'L4')) return true;
    return false;
}

const _deferred = [];

function present(rawItem) {
    if (!rawItem || !rawItem.id) return;
    const result = engine.score(rawItem, engine.DEFAULT_WEIGHTS);
    const level  = _scoreToLevel(result.score);
    if (level === 'L0') return; // L0 SILENT: log only

    const context = ctx.getContext();
    const item = Object.assign({}, rawItem, { score: result.score, level: level });
    if (!relevance.isRelevant(item, context)) return;

    const mode = _voiceMode();
    if (_suppressed(mode, level)) {
        _deferred.push(item);
        return;
    }
    queue.enqueue(item);
}

function _flushDeferred() {
    while (_deferred.length) {
        const item = _deferred.shift();
        const mode = _voiceMode();
        if (!_suppressed(mode, item.level)) {
            queue.enqueue(item);
        }
    }
}

let _initialized = false;

function init() {
    if (_initialized) return;
    _initialized = true;

    // Flush deferred items when voice session ends
    bus.on(bus.E.SESSION_COMPLETED, _flushDeferred);
    bus.on(bus.E.USER_INTERRUPTED,  _flushDeferred);

    // Surface presentationItem from agent completions
    bus.on(bus.E.AGENT_COMPLETED, function(event) {
        const pi = (event.payload || {}).presentationItem;
        if (pi) present(pi);
    });
}

module.exports = { init, present, _scoreToLevel };
