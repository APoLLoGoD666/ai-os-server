'use strict';

// routes/reality-architecture.js — Unified Reality Architecture API
// Sub-prefix: /reality-architecture/* — auto-loaded under /api by _loadAgentRoutes

const router = require('express').Router();
const auth   = require('../lib/app-auth');

router.use(auth);

// ── Understanding ─────────────────────────────────────────────────────────────
router.get('/reality-architecture/understanding/:entityId', async (req, res) => {
    try {
        const und = require('../lib/understanding');
        const result = await und.scoreUnderstanding(req.params.entityId, req.query.domain || req.params.entityId);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/reality-architecture/understanding/:entityId/gaps', async (req, res) => {
    try {
        const und = require('../lib/understanding');
        const result = await und.detectGaps(req.params.entityId, req.query.domain || req.params.entityId);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Beliefs ───────────────────────────────────────────────────────────────────
router.get('/reality-architecture/beliefs/:holderId', async (req, res) => {
    try {
        const beliefs = require('../lib/beliefs');
        const data = await beliefs.getBeliefs(req.params.holderId, { domain: req.query.domain, status: req.query.status });
        res.json({ ok: true, beliefs: data, count: data.length });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/reality-architecture/beliefs', async (req, res) => {
    try {
        const beliefs = require('../lib/beliefs');
        const id = await beliefs.formBelief(req.body);
        res.json({ ok: true, beliefId: id });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/reality-architecture/beliefs/:holderId/gap', async (req, res) => {
    try {
        const beliefs = require('../lib/beliefs');
        const result = await beliefs.computeBeliefRealityGap(req.params.holderId);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Epistemic Capital ─────────────────────────────────────────────────────────
router.get('/reality-architecture/epistemic-capital/:holderId', async (req, res) => {
    try {
        const ec = require('../lib/epistemic-capital');
        const result = await ec.computeCompositeEC(req.params.holderId, req.query.domain);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Intent ────────────────────────────────────────────────────────────────────
router.post('/reality-architecture/intent', async (req, res) => {
    try {
        const intent = require('../lib/intent');
        const id = await intent.recordIntent(req.body);
        res.json({ ok: true, intentId: id });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.put('/reality-architecture/intent/:id/close', async (req, res) => {
    try {
        const intent = require('../lib/intent');
        await intent.closeAttribution({ intentId: req.params.id, ...req.body });
        res.json({ ok: true });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/reality-architecture/intent/:actorId/rate', async (req, res) => {
    try {
        const intent = require('../lib/intent');
        const result = await intent.intentAttributionRate(req.params.actorId);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Attention ─────────────────────────────────────────────────────────────────
router.get('/reality-architecture/attention/top', async (req, res) => {
    try {
        const mgr = require('../lib/attention/attention-manager');
        const items = await mgr.getTopAttentionItems(parseInt(req.query.limit) || 10);
        res.json({ ok: true, items });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/reality-architecture/attention/:entityId', async (req, res) => {
    try {
        const mgr = require('../lib/attention/attention-manager');
        const profile = await mgr.getAttentionProfile(req.params.entityId, req.query.domain);
        res.json({ ok: true, profile });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Counterfactual ────────────────────────────────────────────────────────────
router.post('/reality-architecture/counterfactual/worlds', async (req, res) => {
    try {
        const cf = require('../lib/counterfactual');
        const id = await cf.createWorld(req.body);
        res.json({ ok: true, worldId: id });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/reality-architecture/counterfactual/worlds/:id/analyze', async (req, res) => {
    try {
        const cf = require('../lib/counterfactual');
        const result = await cf.analyzeWorld(req.params.id, req.body.context);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Observer Health ───────────────────────────────────────────────────────────
router.get('/reality-architecture/observers', async (req, res) => {
    try {
        const obs = require('../lib/observer-health');
        const sensors = await obs.listSensors(req.query.domain);
        res.json({ ok: true, sensors, count: sensors.length });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/reality-architecture/observers/:sensorId/calibrate', async (req, res) => {
    try {
        const obs = require('../lib/observer-health');
        const result = await obs.recordCalibration({ sensorId: req.params.sensorId, ...req.body });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// ── Meta-Model ────────────────────────────────────────────────────────────────
router.get('/reality-architecture/meta-model', async (req, res) => {
    try {
        const mm = require('../lib/meta-model');
        const state = await mm.getMetaModelState();
        res.json({ ok: true, ...state });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/reality-architecture/meta-model/assess', async (req, res) => {
    try {
        const mm = require('../lib/meta-model');
        await mm.assessLayer(req.body);
        res.json({ ok: true });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// ── Mental Models ─────────────────────────────────────────────────────────────
router.get('/reality-architecture/mental-models/:agentId', async (req, res) => {
    try {
        const models = require('../lib/mental-models');
        const data = await models.getModel(req.params.agentId, req.query.domain);
        res.json({ ok: true, models: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/reality-architecture/mental-models/compare', async (req, res) => {
    try {
        const models = require('../lib/mental-models');
        const { agentIdA, agentIdB, domain } = req.body;
        const result = await models.detectConflicts(agentIdA, agentIdB, domain);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
