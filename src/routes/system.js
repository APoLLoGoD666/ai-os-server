'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const _bus = require('../../lib/event-bus');
const _agentQueue = require('../../lib/agent-queue');
const _cogOrch = require('../../lib/cognitive-orchestrator');
const _sessionReg = require('../../lib/session-state-registry');
const _pcm = require('../../lib/persistent-cognition-manager');
const _eae = require('../../lib/executive-arbitration-engine');
const _spe = require('../../lib/strategic-planning-engine');

// Recent events from the internal event bus (last 100)
router.get('/api/system/events', requireAppAccess, (req, res) => {
    const n = Math.min(parseInt(req.query.n) || 100, 200);
    const type = req.query.type || null;
    let events = _bus.recent(n);
    if (type) events = events.filter(e => e.type === type);
    res.json({ ok: true, events, total: _bus.recent(200).length });
});

// Agent queue status
router.get('/api/system/queue', requireAppAccess, (req, res) => {
    res.json({ ok: true, queue: _agentQueue.status() });
});

// Registered tool registry
router.get('/api/system/tools', requireAppAccess, (req, res) => {
    const toolExecutor = require('../../lib/tool-executor');
    res.json({ ok: true, tools: toolExecutor.list() });
});

// Stage 3 — cognitive orchestrator state + counters
router.get('/api/system/cognition', requireAppAccess, (req, res) => {
    res.json({ ok: true, counters: _cogOrch.counters(), intents: _cogOrch.INTENT, modes: _cogOrch.MODE });
});

// Stage 3.1 — canonical system-wide session state
router.get('/api/system/state', requireAppAccess, (req, res) => {
    res.json({ ok: true, ..._sessionReg.getSystemWideSnapshot() });
});

// Stage 3.1 — canonical state for a specific session
router.get('/api/system/state/:sessionId', requireAppAccess, (req, res) => {
    const snap = _sessionReg.getDerivedCognitiveSnapshot(req.params.sessionId);
    res.json({ ok: true, snapshot: snap });
});

// Stage 3.3 — persistent cognition thread stats
router.get('/api/system/cognition/threads', requireAppAccess, (req, res) => {
    const sessionId = req.query.session || null;
    res.json({ ok: true, ..._pcm.stats(sessionId) });
});

// Stage 3.4 — executive arbitration global stats
router.get('/api/system/arbitration', requireAppAccess, (req, res) => {
    res.json({ ok: true, ..._eae.stats() });
});

// Stage 3.4 — executive snapshot for a specific session
router.get('/api/system/arbitration/:sessionId', requireAppAccess, (req, res) => {
    res.json({ ok: true, snapshot: _eae.generateExecutiveSnapshot(req.params.sessionId) });
});

// Stage 3.5 — strategic planning engine global stats
router.get('/api/system/strategy', requireAppAccess, (req, res) => {
    res.json({ ok: true, ..._spe.stats() });
});

// Stage 3.5 — strategic context for a specific session
router.get('/api/system/strategy/:sessionId', requireAppAccess, (req, res) => {
    res.json({ ok: true, ..._spe.stats(req.params.sessionId) });
});

module.exports = router;
