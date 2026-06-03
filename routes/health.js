'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;
router.get('/health/workouts', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 91;
        const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_workouts').select('workout_date,type,duration_minutes,notes').gte('workout_date', since).order('workout_date', { ascending: true }).limit(200);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, workouts: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/health/workouts', _auth, async (req, res) => {
    try {
        const { type, duration_minutes, notes, workout_date } = req.body || {};
        if (!type) return res.status(400).json({ ok: false, error: 'type required' });
        if (duration_minutes !== undefined && duration_minutes !== null && isNaN(Number(duration_minutes)))
            return res.status(400).json({ ok: false, error: 'duration_minutes must be a number' });
        const { data, error } = await sb().from('apex_workouts').insert({
            type,
            duration_minutes: duration_minutes != null ? Number(duration_minutes) : null,
            notes: notes || null,
            workout_date: workout_date || new Date().toISOString().split('T')[0]
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, workout: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/health/nutrition', _auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_nutrition_log').select('*').eq('log_date', today).order('created_at', { ascending: true });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        const meals = data || [];
        const totals = meals.reduce((a, m) => ({
            calories: a.calories + (m.calories || 0),
            protein: a.protein + (m.protein_g || 0),
            carbs: a.carbs + (m.carbs_g || 0),
            fat: a.fat + (m.fat_g || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
        res.json({ ok: true, meals, totals });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/health/nutrition', _auth, async (req, res) => {
    try {
        const { food_name, calories, protein_g, carbs_g, fat_g, log_date } = req.body || {};
        if (!food_name) return res.status(400).json({ ok: false, error: 'food_name required' });
        for (const [k, v] of Object.entries({ calories, protein_g, carbs_g, fat_g })) {
            if (v !== undefined && v !== null && isNaN(Number(v)))
                return res.status(400).json({ ok: false, error: `${k} must be a number` });
        }
        const { data, error } = await sb().from('apex_nutrition_log').insert({
            food_name,
            calories: calories != null ? Number(calories) : null,
            protein_g: protein_g != null ? Number(protein_g) : null,
            carbs_g: carbs_g != null ? Number(carbs_g) : null,
            fat_g: fat_g != null ? Number(fat_g) : null,
            log_date: log_date || new Date().toISOString().split('T')[0]
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, meal: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/health/sleep', _auth, async (req, res) => {
    try {
        const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_sleep_log').select('date,hours,quality_score,notes').gte('date', since).order('date', { ascending: true });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, sleep: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/health/sleep', _auth, async (req, res) => {
    try {
        const { hours, quality_score, notes, date } = req.body || {};
        if (hours == null || hours === '') return res.status(400).json({ ok: false, error: 'hours required' });
        const hoursNum = Number(hours);
        if (isNaN(hoursNum)) return res.status(400).json({ ok: false, error: 'hours must be a number' });
        const logDate = date || new Date().toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_sleep_log').upsert({
            date: logDate,
            hours: hoursNum,
            quality_score: quality_score || null,
            notes: notes || null
        }, { onConflict: 'date' }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, sleep: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/mood', _auth, async (req, res) => {
    try {
        const since = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_mood_log').select('date,score').gte('date', since).order('date', { ascending: true });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, moods: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/mood', _auth, async (req, res) => {
    try {
        const { score, date } = req.body || {};
        if (score == null || score === '') return res.status(400).json({ ok: false, error: 'score required' });
        const scoreNum = Number(score);
        if (isNaN(scoreNum)) return res.status(400).json({ ok: false, error: 'score must be a number' });
        const { data, error } = await sb().from('apex_mood_log').upsert({ date: date || new Date().toISOString().split('T')[0], score: scoreNum }, { onConflict: 'date' }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, mood: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/health/metrics', _auth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 14, 50);
        const { data, error } = await sb().from('apex_body_measurements').select('*').order('measured_at', { ascending: false }).limit(limit);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, metrics: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/health/supplements', _auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_supplements').select('id,name,taken,log_date').eq('log_date', today);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, supplements: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/health/supplements', _auth, async (req, res) => {
    try {
        const { supplement_id, taken } = req.body || {};
        if (!supplement_id) return res.status(400).json({ ok: false, error: 'supplement_id required' });
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_supplements').upsert({ id: supplement_id, log_date: today, taken: !!taken }, { onConflict: 'id,log_date' }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, supplement: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
