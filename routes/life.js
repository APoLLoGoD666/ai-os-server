'use strict';
const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const _auth = require('../lib/app-auth');

// Singleton Supabase client
const _sbClient = (() => {
    let c;
    return () => {
        if (!c) c = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        );
        return c;
    };
})();
function sb() { return _sbClient(); }

// ── Journal ────────────────────────────────────────────────────────────────────
router.get('/journal/entries', _auth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const { data, error } = await sb().from('apex_journal_entries').select('id,entry_text,sentiment_score,mood_score,created_at').order('created_at', { ascending: false }).limit(limit);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entries: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/journal/entries', _auth, async (req, res) => {
    try {
        const { entry_text, sentiment_score, mood_score } = req.body || {};
        if (!entry_text || !entry_text.trim()) return res.status(400).json({ ok: false, error: 'entry_text required' });
        const { data, error } = await sb().from('apex_journal_entries').insert({ entry_text: entry_text.trim(), sentiment_score: sentiment_score || null, mood_score: mood_score || null }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Habits ─────────────────────────────────────────────────────────────────────
router.get('/habits', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_habits').select('*').order('habit_name', { ascending: true }).limit(200);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, habits: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/habits/:id/toggle', _auth, async (req, res) => {
    try {
        const { id } = req.params;
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await sb().from('apex_habit_logs').select('id,completed').eq('habit_id', id).eq('log_date', today).maybeSingle();
        let result;
        if (existing) {
            const { data, error } = await sb().from('apex_habit_logs').update({ completed: !existing.completed }).eq('id', existing.id).select().single();
            if (error) return res.status(500).json({ ok: false, error: error.message });
            result = data;
        } else {
            const { data, error } = await sb().from('apex_habit_logs').insert({ habit_id: id, log_date: today, completed: true }).select().single();
            if (error) return res.status(500).json({ ok: false, error: error.message });
            result = data;
        }
        res.json({ ok: true, log: result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/habits/log', _auth, async (req, res) => {
    try {
        const { habit_id, completed, log_date } = req.body || {};
        if (!habit_id) return res.status(400).json({ ok: false, error: 'habit_id required' });
        const today = log_date || new Date().toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_habit_logs').upsert({ habit_id, log_date: today, completed: !!completed }, { onConflict: 'habit_id,log_date' }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, log: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Psychology ─────────────────────────────────────────────────────────────────
router.get('/psychology/crisis-check', _auth, async (req, res) => {
    try {
        const ago = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data, error } = await sb().from('apex_journal_entries').select('mood_score,sentiment_score').gte('created_at', ago).limit(500);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        if (!data || !data.length) return res.json({ ok: true, flagged: false, message: 'No recent entries' });
        const avg = data.reduce((s, e) => s + (e.mood_score || 5), 0) / data.length;
        res.json({ ok: true, flagged: avg < 3, avgMood: Math.round(avg * 10) / 10, entriesAnalysed: data.length });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── Spiritual ──────────────────────────────────────────────────────────────────
router.get('/spiritual/sessions', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_spiritual_sessions').select('*').order('created_at', { ascending: false }).limit(20);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, sessions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/spiritual/log', _auth, async (req, res) => {
    try {
        const { practice_type, duration_minutes, notes } = req.body || {};
        if (!practice_type) return res.status(400).json({ ok: false, error: 'practice_type required' });
        if (duration_minutes !== undefined && duration_minutes !== null && isNaN(Number(duration_minutes)))
            return res.status(400).json({ ok: false, error: 'duration_minutes must be a number' });
        const { data, error } = await sb().from('apex_spiritual_sessions').insert({ practice_type, duration_minutes: duration_minutes != null ? Number(duration_minutes) : null, notes: notes || null }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, session: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── University ─────────────────────────────────────────────────────────────────
router.get('/university/modules', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_university_modules').select('*').order('name', { ascending: true }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, modules: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/university/assignments', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_university_assignments').select('*').order('due_date', { ascending: true }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, assignments: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/university/assignments', _auth, async (req, res) => {
    try {
        const { title, module_id, due_date, weight_pct, notes } = req.body || {};
        if (!title || !title.trim()) return res.status(400).json({ ok: false, error: 'title required' });
        if (weight_pct !== undefined && weight_pct !== null && isNaN(Number(weight_pct)))
            return res.status(400).json({ ok: false, error: 'weight_pct must be a number' });
        if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date))
            return res.status(400).json({ ok: false, error: 'due_date must be YYYY-MM-DD' });
        const { data, error } = await sb().from('apex_university_assignments').insert({ title: title.trim(), module_id: module_id || null, due_date: due_date || null, weight_pct: weight_pct != null ? Number(weight_pct) : null, notes: notes || null }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, assignment: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/university/flashcards', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_university_flashcards').select('id,front,back,module_id,next_review_at').lte('next_review_at', new Date().toISOString()).order('next_review_at', { ascending: true }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, flashcards: data || [], due: (data || []).length });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/university/sessions', _auth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const { data, error } = await sb().from('apex_university_sessions').select('*').order('created_at', { ascending: false }).limit(limit);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, sessions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/university/sessions', _auth, async (req, res) => {
    try {
        const { module_id, duration_seconds, session_type, notes } = req.body || {};
        if (duration_seconds == null || duration_seconds === '') return res.status(400).json({ ok: false, error: 'duration_seconds required' });
        if (isNaN(Number(duration_seconds))) return res.status(400).json({ ok: false, error: 'duration_seconds must be a number' });
        const { data, error } = await sb().from('apex_university_sessions').insert({ module_id: module_id || null, duration_seconds: Number(duration_seconds), session_type: session_type || 'study', notes: notes || null }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, session: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/university/reading-list', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_reading_list').select('*').order('created_at', { ascending: false }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, books: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ── /life/* aliases — dashboard prefixes life-workstream paths with /life/ ────
router.get('/life/journal/entries', _auth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const { data, error } = await sb().from('apex_journal_entries').select('id,entry_text,sentiment_score,mood_score,created_at').order('created_at', { ascending: false }).limit(limit);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entries: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.post('/life/journal/entries', _auth, async (req, res) => {
    const { entry_text, sentiment_score, mood_score } = req.body || {};
    if (!entry_text?.trim()) return res.status(400).json({ ok: false, error: 'entry_text required' });
    try {
        const { data, error } = await sb().from('apex_journal_entries').insert({ entry_text: entry_text.trim(), sentiment_score: sentiment_score || null, mood_score: mood_score || null }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/life/habits', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_habits').select('*').order('habit_name', { ascending: true }).limit(200);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, habits: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/life/psychology/crisis-check', _auth, async (req, res) => {
    try {
        const ago = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data, error } = await sb().from('apex_journal_entries').select('mood_score,sentiment_score').gte('created_at', ago).limit(500);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        if (!data?.length) return res.json({ ok: true, flagged: false });
        const avg = data.reduce((s, e) => s + (e.mood_score || 5), 0) / data.length;
        res.json({ ok: true, flagged: avg < 3, avgMood: Math.round(avg * 10) / 10 });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/life/spiritual/sessions', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_spiritual_sessions').select('*').order('created_at', { ascending: false }).limit(20);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, sessions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.post('/life/spiritual/log', _auth, async (req, res) => {
    const { practice_type, duration_minutes, notes } = req.body || {};
    if (!practice_type) return res.status(400).json({ ok: false, error: 'practice_type required' });
    if (duration_minutes !== undefined && duration_minutes !== null && isNaN(Number(duration_minutes)))
        return res.status(400).json({ ok: false, error: 'duration_minutes must be a number' });
    try {
        const { data, error } = await sb().from('apex_spiritual_sessions').insert({ practice_type, duration_minutes: duration_minutes != null ? Number(duration_minutes) : null, notes: notes || null }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, session: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/life/university/modules', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_university_modules').select('*').order('name', { ascending: true }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, modules: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/life/university/assignments', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_university_assignments').select('*').order('due_date', { ascending: true }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, assignments: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/life/university/flashcards', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_university_flashcards').select('id,front,back,module_id,next_review_at').lte('next_review_at', new Date().toISOString()).order('next_review_at', { ascending: true }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, flashcards: data || [], due: (data || []).length });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.post('/life/university/flashcards/:id/review', _auth, async (req, res) => {
    try {
        const { id } = req.params;
        const ease = parseInt(req.body?.ease, 10); // 1=again 2=good 3=easy
        const daysMap = { 1: 1, 2: 3, 3: 7 };
        const days = daysMap[ease] || 3;
        const next = new Date(Date.now() + days * 86400000).toISOString();
        const { error } = await sb().from('apex_university_flashcards').update({ next_review_at: next }).eq('id', id);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, next_review_at: next });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/life/university/sessions', _auth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const { data, error } = await sb().from('apex_university_sessions').select('*').order('created_at', { ascending: false }).limit(limit);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, sessions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
router.get('/life/university/reading-list', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_reading_list').select('*').order('created_at', { ascending: false }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, books: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/university/assignments/:id/complete', _auth, async (req, res) => {
    try {
        const { completed = true } = req.body || {};
        const { data, error } = await sb().from('apex_university_assignments')
            .update({ completed: !!completed }).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, assignment: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
