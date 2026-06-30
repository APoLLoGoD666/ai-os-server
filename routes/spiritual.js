'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

router.get('/spiritual/log', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await sb().from('apex_spiritual_sessions').select('*').gte('created_at', since).order('created_at', { ascending: false });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, log: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/spiritual/log', _auth, async (req, res) => {
    try {
        const { type, duration_min, notes } = req.body || {};
        const { data, error } = await sb().from('apex_spiritual_sessions').insert({ type, duration_min, notes }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/spiritual/summary', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await sb().from('apex_spiritual_sessions').select('type, duration_min').gte('created_at', since);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        const byType = {};
        let total_minutes = 0;
        for (const r of (data || [])) {
            const mins = Number(r.duration_min) || 0;
            byType[r.type] = (byType[r.type] || 0) + 1;
            total_minutes += mins;
        }
        res.json({ ok: true, by_type: byType, total_minutes });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/spiritual/streak', _auth, async (req, res) => {
    try {
        const type = req.query.type || 'meditation';
        const { data, error } = await sb().from('apex_spiritual_sessions').select('created_at').eq('type', type).order('created_at', { ascending: false }).limit(365);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        const dates = (data || []).map(r => new Date(r.created_at).toISOString().split('T')[0]);
        const unique = [...new Set(dates)].sort().reverse();
        let streak = 0;
        const cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        for (const d of unique) {
            const expected = cursor.toISOString().split('T')[0];
            if (d === expected) { streak++; cursor.setDate(cursor.getDate() - 1); }
            else break;
        }
        res.json({ ok: true, type, streak });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
