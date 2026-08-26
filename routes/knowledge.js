'use strict';
// routes/knowledge.js — KG-02 canonical HTTP integration boundary.
// Prefix: /knowledge/* (under /api via _loadAgentRoutes).
// All knowledge-gap operations go through the canonical engine.
// This route is the future integration point for execution phases.

const express = require('express');
const router  = express.Router();
router.use(require('../lib/app-auth'));

const kge = require('../lib/knowledge/knowledge-gap-engine');

// ── POST /knowledge/assess ────────────────────────────────────────────────────
// Assess one or more knowledge requirements against current knowledge state.
// Returns structured determinations for each requirement.
// Body: { requirements: [{decision_context, required_subject, urgency?, blocks_decision?, ...}], context?: {} }

router.post('/knowledge/assess', async (req, res) => {
    try {
        const { requirements, context = {} } = req.body || {};
        if (!Array.isArray(requirements) || requirements.length === 0) {
            return res.status(400).json({ error: 'requirements must be a non-empty array' });
        }
        const result = await kge.assessKnowledgeRequirements(requirements, {
            ...context,
            assessed_by: context.assessed_by || req.headers['x-app-key'] ? 'api-client' : 'system',
        });
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── POST /knowledge/requirements ──────────────────────────────────────────────
// Declare a knowledge requirement (single).
// Body: { decision_context, required_subject, urgency?, blocks_decision?, domain_id?, requester? }

router.post('/knowledge/requirements', async (req, res) => {
    try {
        const result = await kge.declareRequirement(req.body || {});
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ── POST /knowledge/requirements/:id/assess ───────────────────────────────────
// Assess evidence for a specific requirement.
// Body: evidence object (evidence_type, confidence, completeness, ...)

router.post('/knowledge/requirements/:id/assess', async (req, res) => {
    try {
        const result = await kge.assessRequirement(req.params.id, req.body || {});
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ── GET /knowledge/requirements/:id/lifecycle ─────────────────────────────────
// Return full auditable lifecycle trail for a requirement.

router.get('/knowledge/requirements/:id/lifecycle', async (req, res) => {
    try {
        const trail = await kge.getLifecycleAuditTrail(req.params.id);
        res.json({ ok: true, ...trail });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── POST /knowledge/gaps/:id/resolve ─────────────────────────────────────────
// Attempt to resolve a gap by supplying evidence.
// Body: { strategy, evidence_type, requirement_id?, evidence_source?, evidence_ref?,
//         evidence_summary?, knowledge_type?, formed_at?, confidence?, completeness?,
//         has_contradictions? }

router.post('/knowledge/gaps/:id/resolve', async (req, res) => {
    try {
        const result = await kge.attemptResolution(req.params.id, req.body || {});
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ── GET /knowledge/gaps ───────────────────────────────────────────────────────
// Query open knowledge gaps with optional filters.
// Query params: domain_id, gap_type, status, blocks_decision, limit

router.get('/knowledge/gaps', async (req, res) => {
    try {
        const { domain_id, gap_type, status, blocks_decision, limit } = req.query;
        const gaps = await kge.queryGaps({
            domain_id:       domain_id   || undefined,
            gap_type:        gap_type    || undefined,
            status:          status      || undefined,
            blocks_decision: blocks_decision != null ? blocks_decision === 'true' : undefined,
            limit:           limit ? parseInt(limit, 10) : undefined,
        });
        res.json({ ok: true, gaps, count: gaps.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── GET /knowledge/stats ──────────────────────────────────────────────────────
// Return aggregate knowledge gap statistics.

router.get('/knowledge/stats', async (req, res) => {
    try {
        const stats = await kge.getGapStats();
        res.json({ ok: true, ...stats });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
