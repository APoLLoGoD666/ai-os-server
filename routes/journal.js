'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');
const runtime = require('../lib/models/runtime');

const sb = getSupabaseClient;

router.get('/journal/entries', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await sb().from('apex_journal_entries').select('*').gte('created_at', since).order('created_at', { ascending: false });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entries: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/journal/entries', _auth, async (req, res) => {
    try {
        const { content, tags } = req.body || {};
        let sentiment_score = null;
        try {
            const { result } = await runtime.execute({ tier: 'fast', caller: 'journal-sentiment', maxTokens: 50, messages: [{ role: 'user', content: 'Rate sentiment of: ' + content + ' — reply with just a number from -1.0 to 1.0' }] });
            sentiment_score = parseFloat(result.content[0].text.trim());
        } catch (_) {}
        const { data, error } = await sb().from('apex_journal_entries').insert({ entry_text: content, tags, sentiment_score }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/journal/habits', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_habits').select('*').eq('active', true).order('habit_name');
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, habits: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/journal/habits', _auth, async (req, res) => {
    try {
        const { name, description, frequency, target_streak } = req.body || {};
        const { data, error } = await sb().from('apex_habits').insert({ habit_name: name, description, frequency, target_streak, active: true }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, habit: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/journal/habits/:id/log', _auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { completed, notes } = req.body || {};
        const { data, error } = await sb().from('apex_habit_logs').insert({ habit_id: id, completed, notes }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/journal/habits/:id/streak', _auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await sb().from('apex_habit_logs').select('log_date, completed').eq('habit_id', id).eq('completed', true).order('log_date', { ascending: false }).limit(365);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        const dates = (data || []).map(r => String(r.log_date).split('T')[0]).filter(Boolean);
        const unique = [...new Set(dates)].sort().reverse();
        let streak = 0;
        const cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        for (const d of unique) {
            const expected = cursor.toISOString().split('T')[0];
            if (d === expected) { streak++; cursor.setDate(cursor.getDate() - 1); }
            else break;
        }
        res.json({ ok: true, streak });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/journal/gratitude', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const { data, error } = await sb().from('apex_gratitude_log').select('*').gte('created_at', since).order('created_at', { ascending: false });
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entries: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/journal/gratitude', _auth, async (req, res) => {
    try {
        const { wins, grateful } = req.body || {};
        const { data, error } = await sb().from('apex_gratitude_log').insert({ wins, grateful }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entry: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
