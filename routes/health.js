'use strict';
const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const _auth = require('../lib/app-auth');

function sb() {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );
}
router.get('/health/workouts', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 91;
        const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_workouts').select('workout_date,type,duration_minutes,notes').gte('workout_date', since).order('workout_date', { ascending: true });
        if (error) return res.json({ ok: true, workouts: [] });
        res.json({ ok: true, workouts: data || [] });
    } catch (e) { res.json({ ok: true, workouts: [], error: e.message }); }
});

router.get('/health/nutrition', _auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_nutrition_log').select('*').eq('log_date', today).order('created_at', { ascending: true });
        if (error) return res.json({ ok: true, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
        const meals = data || [];
        const totals = meals.reduce((a, m) => ({
            calories: a.calories + (m.calories || 0),
            protein: a.protein + (m.protein_g || 0),
            carbs: a.carbs + (m.carbs_g || 0),
            fat: a.fat + (m.fat_g || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        res.json({ ok: true, meals, totals });
    } catch (e) { res.json({ ok: true, meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, error: e.message }); }
});

router.get('/health/sleep', _auth, async (req, res) => {
    try {
        const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_sleep_log').select('date,hours,quality_score,notes').gte('date', since).order('date', { ascending: true });
        if (error) return res.json({ ok: true, sleep: [] });
        res.json({ ok: true, sleep: data || [] });
    } catch (e) { res.json({ ok: true, sleep: [], error: e.message }); }
});

router.get('/mood', _auth, async (req, res) => {
    try {
        const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_mood_log').select('date,score').gte('date', since).order('date', { ascending: true });
        if (error) return res.json({ ok: true, moods: [] });
        res.json({ ok: true, moods: data || [] });
    } catch (e) { res.json({ ok: true, moods: [], error: e.message }); }
});

router.post('/mood', _auth, async (req, res) => {
    try {
        const { score, date } = req.body || {};
        if (!score) return res.status(400).json({ ok: false, error: 'score required' });
        const { data, error } = await sb().from('apex_mood_log').upsert({ date: date || new Date().toISOString().split('T')[0], score: Number(score) }, { onConflict: 'date' }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, mood: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/health/metrics', _auth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 14, 50);
        const { data, error } = await sb().from('apex_body_measurements').select('*').order('measured_at', { ascending: false }).limit(limit);
        if (error) return res.json({ ok: true, metrics: [] });
        res.json({ ok: true, metrics: data || [] });
    } catch (e) { res.json({ ok: true, metrics: [], error: e.message }); }
});

router.get('/health/supplements', _auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_supplements').select('id,name,taken,log_date').eq('log_date', today);
        if (error) return res.json({ ok: true, supplements: [] });
        res.json({ ok: true, supplements: data || [] });
    } catch (e) { res.json({ ok: true, supplements: [], error: e.message }); }
});

router.post('/health/supplements', _auth, async (req, res) => {
    try {
        const { supplement_id, taken } = req.body || {};
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_supplements').upsert({ id: supplement_id, log_date: today, taken: !!taken }, { onConflict: 'id,log_date' }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, supplement: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
