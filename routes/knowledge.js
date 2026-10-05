'use strict';
// routes/knowledge.js — KG-02 canonical HTTP integration boundary.
// Prefix: /knowledge/* (under /api via _loadAgentRoutes).
// All knowledge-gap operations go through the canonical engine.
// This route is the future integration point for execution phases.

const express = require('express');
const router  = express.Router();
router.use(require('../lib/app-auth'));

const kge           = require('../lib/knowledge/knowledge-gap-engine');
const semanticMemory = require('../lib/memory/semantic-memory');

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

// ── GET /knowledge/items ──────────────────────────────────────────────────────
// Retrieve knowledge items from canonical semantic memory.
// Query params: q (search text), domain, category, status, limit, min_confidence
// Returns items with UX-11 fields: fact, category, domain, confidence, source,
// status, validation_state, support_count, contradiction_count, created_at.
// Where values are unavailable they are returned as null — never fabricated.

router.get('/knowledge/items', async (req, res) => {
    try {
        const { q = '', domain, category, status, limit, min_confidence } = req.query;
        const items = await semanticMemory.search(q, {
            domain:        domain      || undefined,
            category:      category    || undefined,
            limit:         limit       ? Math.min(parseInt(limit, 10), 100) : 50,
            minConfidence: min_confidence ? parseFloat(min_confidence) : 0.0,
        });
        // Surface knowledge_state per item where a simple per-fact state is
        // derivable from the item's own status/validation_state fields.
        // Full per-subject KGE state requires a subject string and a separate
        // call; that is the /knowledge/state endpoint's role.
        const mapped = (items || []).map(function(item) {
            var knowledgeState;
            if (item.status === 'deprecated' || (item.contradiction_count || 0) > 0) {
                knowledgeState = 'CONFLICTING';
            } else if (item.status === 'superseded') {
                knowledgeState = 'UNKNOWN';
            } else if (item.validation_state === 'validated' && item.status === 'validated') {
                knowledgeState = 'FULLY_KNOWN';
            } else if (item.status === 'candidate') {
                knowledgeState = 'PARTIALLY_KNOWN';
            } else {
                knowledgeState = 'UNKNOWN';
            }
            // Confidence tier label (UX-11 §7.1 — not raw score)
            var conf = typeof item.confidence === 'number' ? item.confidence : null;
            var confidenceTier = conf === null ? 'UNKNOWN'
                : conf >= 0.90 ? 'VERY HIGH'
                : conf >= 0.75 ? 'HIGH'
                : conf >= 0.60 ? 'MEDIUM'
                : conf >= 0.40 ? 'LOW'
                : 'UNCERTAIN';
            return Object.assign({}, item, { knowledge_state: knowledgeState, confidence_tier: confidenceTier });
        });
        res.json({ ok: true, items: mapped, count: mapped.length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message, items: [] });
    }
});

// ── GET /knowledge/state ──────────────────────────────────────────────────────
// Return overall knowledge coverage state: gap stats aggregated with a
// derived coverage classification. Read-only — no engine state is mutated.

router.get('/knowledge/state', async (req, res) => {
    try {
        const stats = await kge.getGapStats();
        // Derive a top-level coverage classification from gap stats
        var total   = (stats && stats.total)   || 0;
        var open    = (stats && stats.open)     || 0;
        var blocking = (stats && stats.blocking) || 0;
        var classification = blocking > 0 ? 'BLOCKED'
            : open > 10   ? 'DEGRADED'
            : open > 3    ? 'PARTIAL'
            : open === 0  ? 'SUFFICIENT'
            : 'PARTIAL';
        res.json({
            ok: true,
            classification,
            stats: stats || {},
            ts: new Date().toISOString(),
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
