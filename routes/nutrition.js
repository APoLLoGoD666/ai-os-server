'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

router.get('/nutrition/log', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_nutrition_log').select('*').gte('log_date', since).order('log_date', { ascending: false }).limit(500);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, log: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/nutrition/log', _auth, async (req, res) => {
    try {
        const { food_name, calories, protein_g, carbs_g, fat_g, notes } = req.body || {};
        const { data, error } = await sb().from('apex_nutrition_log').insert({ food_name, calories, protein_g, carbs_g, fat_g, notes }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/nutrition/water', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 1;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await sb().from('apex_water_log').select('*').gte('logged_at', since).order('logged_at', { ascending: false });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, log: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/nutrition/water', _auth, async (req, res) => {
    try {
        const amount_ml = parseInt((req.body || {}).amount_ml) || 250;
        const { data, error } = await sb().from('apex_water_log').insert({ amount_ml }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/nutrition/supplements', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_supplements').select('*').eq('active', true).order('name');
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, supplements: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/nutrition/supplements', _auth, async (req, res) => {
    try {
        const { name, dose, frequency, reminder_time } = req.body || {};
        const { data, error } = await sb().from('apex_supplements').insert({ name, dose, frequency, reminder_time, active: true }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, supplement: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/nutrition/fasting/current', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_fasting_log').select('*').is('ended_at', null).order('started_at', { ascending: false }).limit(1).single();
        if (error && error.code !== 'PGRST116') return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, fast: data || null });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/nutrition/fasting/start', _auth, async (req, res) => {
    try {
        const target_hours = parseInt((req.body || {}).target_hours) || 16;
        const { data, error } = await sb().from('apex_fasting_log').insert({ target_hours, started_at: new Date().toISOString() }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, fast: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/nutrition/fasting/end', _auth, async (req, res) => {
    try {
        const { data: current, error: findErr } = await sb().from('apex_fasting_log').select('id').is('ended_at', null).order('started_at', { ascending: false }).limit(1).single();
        if (findErr) return res.status(500).json({ ok: false, error: findErr.message });
        if (!current) return res.status(404).json({ ok: false, error: 'No active fast' });
        const { data, error } = await sb().from('apex_fasting_log').update({ ended_at: new Date().toISOString() }).eq('id', current.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, fast: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/nutrition/body-metrics', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_body_measurements').select('*').order('created_at', { ascending: false }).limit(10);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, metrics: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/nutrition/body-metrics', _auth, async (req, res) => {
    try {
        const { weight_kg, body_fat_pct, waist_cm, chest_cm, notes } = req.body || {};
        const { data, error } = await sb().from('apex_body_measurements').insert({ weight_kg, body_fat_pct, waist_cm, chest_cm, notes }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/nutrition/blood-pressure', _auth, async (req, res) => {
    try {
        const { systolic, diastolic, pulse, notes } = req.body || {};
        const { data, error } = await sb().from('apex_blood_pressure').insert({ systolic, diastolic, pulse, notes }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/nutrition/blood-pressure', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await sb().from('apex_blood_pressure').select('*').gte('measured_at', since).order('measured_at', { ascending: false });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, history: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
