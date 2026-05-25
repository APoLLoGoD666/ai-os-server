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
router.get('/journal/entries', _auth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const { data, error } = await sb().from('apex_journal_entries').select('id,entry_text,sentiment_score,mood_score,created_at').order('created_at', { ascending: false }).limit(limit);
        if (error) return res.json({ ok: true, entries: [] });
        res.json({ ok: true, entries: data || [] });
    } catch (e) { res.json({ ok: true, entries: [], error: e.message }); }
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

router.get('/habits', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_habits').select('*').order('habit_name', { ascending: true });
        if (error) return res.json({ ok: true, habits: [] });
        res.json({ ok: true, habits: data || [] });
    } catch (e) { res.json({ ok: true, habits: [], error: e.message }); }
});

router.post('/habits/:id/toggle', _auth, async (req, res) => {
    try {
        const { id } = req.params;
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await sb().from('apex_habit_logs').select('id,completed').eq('habit_id', id).eq('log_date', today).maybeSingle();
        let result;
        if (existing) {
            const { data } = await sb().from('apex_habit_logs').update({ completed: !existing.completed }).eq('id', existing.id).select().single();
            result = data;
        } else {
            const { data } = await sb().from('apex_habit_logs').insert({ habit_id: id, log_date: today, completed: true }).select().single();
            result = data;
        }
        res.json({ ok: true, log: result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/psychology/crisis-check', _auth, async (req, res) => {
    try {
        const ago = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data, error } = await sb().from('apex_journal_entries').select('mood_score,sentiment_score').gte('created_at', ago);
        if (error || !data || !data.length) return res.json({ ok: true, flagged: false, message: 'No recent entries' });
        const avg = data.reduce((s, e) => s + (e.mood_score || 5), 0) / data.length;
        res.json({ ok: true, flagged: avg < 3, avgMood: Math.round(avg * 10) / 10, entriesAnalysed: data.length });
    } catch (e) { res.json({ ok: true, flagged: false, error: e.message }); }
});

router.get('/spiritual/sessions', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_spiritual_sessions').select('*').order('created_at', { ascending: false }).limit(20);
        if (error) return res.json({ ok: true, sessions: [] });
        res.json({ ok: true, sessions: data || [] });
    } catch (e) { res.json({ ok: true, sessions: [], error: e.message }); }
});

router.get('/university/modules', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_university_modules').select('*').order('name', { ascending: true });
        if (error) return res.json({ ok: true, modules: [] });
        res.json({ ok: true, modules: data || [] });
    } catch (e) { res.json({ ok: true, modules: [], error: e.message }); }
});

router.get('/university/assignments', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_university_assignments').select('*').order('due_date', { ascending: true });
        if (error) return res.json({ ok: true, assignments: [] });
        res.json({ ok: true, assignments: data || [] });
    } catch (e) { res.json({ ok: true, assignments: [], error: e.message }); }
});

router.get('/university/flashcards', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_university_flashcards').select('id,front,back,module_id,next_review_at').lte('next_review_at', new Date().toISOString()).order('next_review_at', { ascending: true }).limit(50);
        if (error) return res.json({ ok: true, flashcards: [], due: 0 });
        res.json({ ok: true, flashcards: data || [], due: (data || []).length });
    } catch (e) { res.json({ ok: true, flashcards: [], due: 0, error: e.message }); }
});

router.post('/university/sessions', _auth, async (req, res) => {
    try {
        const { module_id, duration_seconds, session_type, notes } = req.body || {};
        if (!duration_seconds) return res.status(400).json({ ok: false, error: 'duration_seconds required' });
        const { data, error } = await sb().from('apex_university_sessions').insert({ module_id: module_id || null, duration_seconds, session_type: session_type || 'study', notes: notes || null }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, session: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/university/reading-list', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_reading_list').select('*').order('created_at', { ascending: false });
        if (error) return res.json({ ok: true, books: [] });
        res.json({ ok: true, books: data || [] });
    } catch (e) { res.json({ ok: true, books: [], error: e.message }); }
});

router.post('/spiritual/log', _auth, async (req, res) => {
    try {
        const { practice_type, duration_minutes, notes } = req.body || {};
        if (!practice_type) return res.status(400).json({ ok: false, error: 'practice_type required' });
        const { data, error } = await sb().from('apex_spiritual_sessions').insert({ practice_type, duration_minutes: duration_minutes || null, notes: notes || null }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, session: data });
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

module.exports = router;
