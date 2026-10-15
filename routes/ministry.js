'use strict';
// routes/ministry.js — Ministry reports API (auto-loaded by _loadAgentRoutes)
// Sub-prefix: /ministry/* — no collision under flat-mount

const express = require('express');
const router  = express.Router();
const { requireAppAccess, isMasterRequest } = require('../lib/app-auth');

function _sb() { return require('../lib/clients').getSupabaseClient(); }

// GET /api/ministry/reports — list reports, optional ?week=YYYY-MM-DD&ministry=X
router.get('/ministry/reports', requireAppAccess, async (req, res) => {
    try {
        const sb = _sb();
        let q = sb.from('ministry_reports').select('id, ministry, week_start, status, headline, generated_at').order('week_start', { ascending: false }).order('ministry');

        if (req.query.week)     q = q.eq('week_start', req.query.week);
        if (req.query.ministry) q = q.eq('ministry', req.query.ministry);
        q = q.limit(parseInt(req.query.limit, 10) || 50);

        const { data, error } = await q;
        if (error) throw error;
        res.json({ ok: true, reports: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/ministry/reports/:id — get full report with content
router.get('/ministry/reports/:id', requireAppAccess, async (req, res) => {
    try {
        const { data, error } = await _sb()
            .from('ministry_reports')
            .select('*')
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ ok: false, error: 'Report not found' });
        res.json({ ok: true, report: data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/ministry/briefing/latest — get latest Founder briefing from council_sessions
router.get('/ministry/briefing/latest', requireAppAccess, async (req, res) => {
    try {
        const { data, error } = await _sb()
            .from('council_sessions')
            .select('id, session_type, agenda, recommendation, consensus_level, created_at, context')
            .eq('session_type', 'ministry_briefing')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        res.json({ ok: true, briefing: data || null });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/ministry/briefing — list all briefings
router.get('/ministry/briefing', requireAppAccess, async (req, res) => {
    try {
        const { data, error } = await _sb()
            .from('council_sessions')
            .select('id, agenda, consensus_level, created_at, context')
            .eq('session_type', 'ministry_briefing')
            .order('created_at', { ascending: false })
            .limit(parseInt(req.query.limit, 10) || 10);
        if (error) throw error;
        res.json({ ok: true, briefings: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/ministry/run — trigger weekly cycle manually (master only)
router.post('/ministry/run', requireAppAccess, async (req, res) => {
    if (!isMasterRequest(req)) return res.status(403).json({ ok: false, error: 'Master access required' });

    const ministry = req.body?.ministry; // optional: run a single ministry
    res.json({ ok: true, status: 'started', ministry: ministry || 'all' });

    setImmediate(async () => {
        try {
            if (ministry) {
                const { generateReport } = require('../lib/ministry/weekly-reports');
                await generateReport(ministry);
            } else {
                const { runWeeklyCycle } = require('../lib/ministry');
                await runWeeklyCycle();
            }
        } catch (e) {
            require('../lib/logger').warn('ministry-route', 'Manual run failed', { error: e.message });
        }
    });
});

module.exports = router;
