'use strict';
// routes/intel-zero.js — APEX ZERO intelligence products API
// Sub-prefix: /intel-zero/ — no collision with /intelligence/*

const router           = require('express').Router();
const requireAppAccess = require('../lib/app-auth');
const zeroEngine       = require('../lib/intelligence/zero-engine');
const { getSupabaseClient } = require('../lib/clients');

// ── GET /api/intel-zero/operations ────────────────────────────────────────────
// Active coordinated operations — patterns fired across 3+ sources in 6h
router.get('/intel-zero/operations', requireAppAccess, async function(req, res) {
    try {
        var ops = await zeroEngine.getActiveOperations();
        res.json({ ok: true, operations: ops, generated_at: new Date().toISOString() });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/intel-zero/patterns ─────────────────────────────────────────────
// Pattern fire summary — last 24h
router.get('/intel-zero/patterns', requireAppAccess, async function(req, res) {
    try {
        var patterns = await zeroEngine.getPatternSummary();
        res.json({ ok: true, patterns, generated_at: new Date().toISOString() });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/intel-zero/contested ────────────────────────────────────────────
// Contested territory — high divergence + low truth articles
router.get('/intel-zero/contested', requireAppAccess, async function(req, res) {
    try {
        var articles = await zeroEngine.getContestedTerritory();
        res.json({ ok: true, articles, generated_at: new Date().toISOString() });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/intel-zero/reality-model ────────────────────────────────────────
// Reality model — ground truth facts + coverage
router.get('/intel-zero/reality-model', requireAppAccess, async function(req, res) {
    try {
        var model = await zeroEngine.getRealityModel();
        res.json({ ok: true, ...model, generated_at: new Date().toISOString() });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/intel-zero/articles ─────────────────────────────────────────────
// Recent scored articles from temporal memory
router.get('/intel-zero/articles', requireAppAccess, async function(req, res) {
    try {
        var sb = getSupabaseClient();
        if (!sb) return res.status(503).json({ ok: false, error: 'Database unavailable' });
        var hours = parseInt(req.query.hours || '24', 10);
        var limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
        var since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
        var { data, error } = await sb.from('intel_articles')
            .select('*')
            .gte('scored_at', since)
            .order('relevance_score', { ascending: false })
            .limit(limit);
        if (error) return res.status(400).json({ ok: false, error: error.message });
        res.json({ ok: true, articles: data || [], count: (data || []).length });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── GET /api/intel-zero/ground-truth ─────────────────────────────────────────
router.get('/intel-zero/ground-truth', requireAppAccess, async function(req, res) {
    try {
        var sb = getSupabaseClient();
        if (!sb) return res.status(503).json({ ok: false, error: 'Database unavailable' });
        var { data, error } = await sb.from('intel_ground_truth').select('*').order('tier').order('confidence', { ascending: false });
        if (error) return res.status(400).json({ ok: false, error: error.message });
        res.json({ ok: true, facts: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── PATCH /api/intel-zero/ground-truth/:id ───────────────────────────────────
router.patch('/intel-zero/ground-truth/:id', requireAppAccess, async function(req, res) {
    var { id } = req.params;
    var updates = {};
    if (req.body.enabled    !== undefined) updates.enabled    = req.body.enabled;
    if (req.body.confidence !== undefined) updates.confidence = req.body.confidence;
    if (req.body.claim      !== undefined) updates.claim      = req.body.claim;
    updates.updated_at = new Date().toISOString();
    try {
        var sb = getSupabaseClient();
        if (!sb) return res.status(503).json({ ok: false, error: 'Database unavailable' });
        var { error } = await sb.from('intel_ground_truth').update(updates).eq('id', id);
        if (error) return res.status(400).json({ ok: false, error: error.message });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
