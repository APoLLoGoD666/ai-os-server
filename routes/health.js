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

module.exports = router;
