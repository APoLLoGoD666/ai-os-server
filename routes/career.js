'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

// Job applications
router.get('/career/applications', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_job_applications').select('*').order('applied_date', { ascending: false }).limit(100);
        if (req.query.status) q = q.eq('status', req.query.status);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, applications: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/career/applications', _auth, async (req, res) => {
    try {
        const { company, role, status, applied_date, salary_range, url, notes } = req.body || {};
        if (!company || !role) return res.status(400).json({ ok: false, error: 'company and role required' });
        const { data, error } = await sb().from('apex_job_applications').insert({
            company, role, status: status || 'applied',
            applied_date: applied_date || new Date().toISOString().split('T')[0],
            salary_range: salary_range || null, url: url || null, notes: notes || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, application: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/career/applications/:id', _auth, async (req, res) => {
    try {
        const allowed = ['company', 'role', 'status', 'applied_date', 'salary_range', 'url', 'notes'];
        const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
        const { data, error } = await sb().from('apex_job_applications').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, application: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Interviews
router.get('/career/interviews', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_interviews').select('*').order('interview_date', { ascending: true }).limit(100);
        if (req.query.application_id) q = q.eq('application_id', req.query.application_id);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, interviews: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/career/interviews', _auth, async (req, res) => {
    try {
        const { application_id, interview_date, type, notes, outcome } = req.body || {};
        if (!application_id) return res.status(400).json({ ok: false, error: 'application_id required' });
        const { data, error } = await sb().from('apex_interviews').insert({
            application_id, interview_date: interview_date || null,
            type: type || 'other', notes: notes || null, outcome: outcome || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, interview: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Skills
router.get('/career/skills', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_skills').select('*').order('category', { ascending: true }).limit(200);
        if (req.query.category) q = q.eq('category', req.query.category);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, skills: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/career/skills', _auth, async (req, res) => {
    try {
        const { name, category, level, target_level, notes } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        const { data, error } = await sb().from('apex_skills').insert({
            name, category: category || null, level: level || 'intermediate',
            target_level: target_level || null, notes: notes || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, skill: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
