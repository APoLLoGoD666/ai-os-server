'use strict';

const router = require('express').Router();
const auth   = require('../lib/app-auth');
const fabric = require('../lib/reality/fabric');

router.use(auth);

// GET /api/reality/claims?entityId=&domain=&stage=&limit=
router.get('/reality/claims', async (req, res) => {
    try {
        const { entityId, domain, stage, limit } = req.query;
        if (!entityId && !domain) return res.status(400).json({ ok: false, error: 'entityId or domain required' });
        let claims;
        if (entityId) {
            claims = await fabric.getClaimsForEntity(entityId, { domain, stage, limit: parseInt(limit) || 50 });
        } else {
            claims = await fabric.getClaimsByDomain(domain, stage, parseInt(limit) || 50);
        }
        res.json({ ok: true, claims, count: claims.length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/reality/claims
router.post('/reality/claims', async (req, res) => {
    try {
        const { entityId, domain, content, source, claimType, confidence, evidence, projectedBy } = req.body;
        const claimId = await fabric.claimReality({ entityId, domain, content, source, claimType, confidence, evidence, projectedBy });
        res.json({ ok: true, claimId });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
});

// PUT /api/reality/claims/:id/advance
router.put('/reality/claims/:id/advance', async (req, res) => {
    try {
        const { toStage, trigger, actor, evidence } = req.body;
        const result = await fabric.advanceClaim({ claimId: req.params.id, toStage, trigger, actor, evidence });
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
});

// GET /api/reality/health — system-wide reality health
router.get('/reality/health', async (req, res) => {
    try {
        const results = await fabric.getSystemRealityHealth();
        const composites = results.filter(r => !r.error).map(r => r.composite);
        const avg = composites.length ? Math.round(composites.reduce((s, v) => s + v, 0) / composites.length) : 0;
        res.json({ ok: true, system_composite: avg, domains: results });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/reality/health/:entityId
router.get('/reality/health/:entityId', async (req, res) => {
    try {
        const { entityId } = req.params;
        const { refresh } = req.query;
        if (refresh === '1') {
            const result = await fabric.scoreRealityHealth(entityId);
            return res.json({ ok: true, ...result });
        }
        const scores = await fabric.getRealityHealth(entityId);
        const composite = scores.length ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length) : null;
        res.json({ ok: true, entityId, composite, scores });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/reality/project — trigger a full projection cycle
router.post('/reality/project', async (req, res) => {
    try {
        const projectors = [
            require('../lib/reality/projections/civilisation'),
            require('../lib/reality/projections/intelligence'),
            require('../lib/reality/projections/memory'),
            require('../lib/reality/projections/knowledge'),
            require('../lib/reality/projections/governance'),
        ];
        const results = await Promise.allSettled(projectors.map(p => p.project()));
        const summary = results.map((r, i) => ({
            projector: ['civilisation', 'intelligence', 'memory', 'knowledge', 'governance'][i],
            status:    r.status,
            result:    r.status === 'fulfilled' ? r.value : { error: r.reason?.message },
        }));
        const totalCreated = summary.filter(s => s.status === 'fulfilled').reduce((a, s) => a + (s.result.created || 0), 0);
        res.json({ ok: true, total_created: totalCreated, projectors: summary });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
