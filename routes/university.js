'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

router.get('/university/assignments', _auth, async (req, res) => {
    try {
        const done = req.query.completed === 'true';
        const { data, error } = await sb().from('apex_university_assignments').select('*').eq('completed', done).order('due_date', { ascending: true });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, assignments: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/university/assignments', _auth, async (req, res) => {
    try {
        const { module, title, description, due_date, submission_type, weight_pct } = req.body || {};
        const { data, error } = await sb().from('apex_university_assignments').insert({ module, title, description, due_date, submission_type, weight_pct, completed: false }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, assignment: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/university/assignments/:id', _auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { completed, grade, notes } = req.body || {};
        const update = {};
        if (completed !== undefined) update.completed = completed;
        if (grade !== undefined) update.grade = grade;
        if (notes !== undefined) update.notes = notes;
        const { data, error } = await sb().from('apex_university_assignments').update(update).eq('id', id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, assignment: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/university/modules', _auth, async (req, res) => {
    try {
        const current = req.query.current !== 'false';
        let q = sb().from('apex_university_modules').select('*').order('code');
        if (current) q = q.eq('current', true);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, modules: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/university/modules', _auth, async (req, res) => {
    try {
        const { code, name, credits, year } = req.body || {};
        const { data, error } = await sb().from('apex_university_modules').insert({ code, name, credits, year, current: true }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, module: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/university/study-sessions', _auth, async (req, res) => {
    try {
        const { module_id, topic, duration_min, notes } = req.body || {};
        const { data, error } = await sb().from('apex_university_sessions').insert({ module_id, topic, duration_min, notes }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, session: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/university/study-sessions', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await sb().from('apex_university_sessions').select('*').gte('started_at', since).order('started_at', { ascending: false });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, sessions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/university/deadlines', _auth, async (req, res) => {
    try {
        const now = new Date().toISOString().split('T')[0];
        const cutoff = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_university_assignments').select('*').gte('due_date', now).lte('due_date', cutoff).eq('completed', false).order('due_date', { ascending: true });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, deadlines: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
