'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

// People
router.get('/relationships/people', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_people')
            .select('*').order('name', { ascending: true }).limit(200);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, people: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/relationships/people', _auth, async (req, res) => {
    try {
        const { name, email, phone, birthday, relationship_type, company, notes } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        const { data, error } = await sb().from('apex_people').insert({
            name, email: email || null, phone: phone || null,
            birthday: birthday || null, relationship_type: relationship_type || 'other',
            company: company || null, notes: notes || null,
            last_contact_date: new Date().toISOString().split('T')[0]
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, person: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Interactions
router.get('/relationships/interactions', _auth, async (req, res) => {
    try {
        const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        let q = sb().from('apex_interactions').select('*').gte('interaction_date', since).order('interaction_date', { ascending: false }).limit(100);
        if (req.query.person_id) q = q.eq('person_id', req.query.person_id);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, interactions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/relationships/interactions', _auth, async (req, res) => {
    try {
        const { person_id, type, notes, sentiment_score, interaction_date } = req.body || {};
        if (!person_id) return res.status(400).json({ ok: false, error: 'person_id required' });
        const { data, error } = await sb().from('apex_interactions').insert({
            person_id, type: type || 'other', notes: notes || null,
            sentiment_score: sentiment_score != null ? Number(sentiment_score) : null,
            interaction_date: interaction_date || new Date().toISOString().split('T')[0]
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        // Update last_contact_date on person
        await sb().from('apex_people').update({ last_contact_date: interaction_date || new Date().toISOString().split('T')[0] }).eq('id', person_id);
        res.json({ ok: true, interaction: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Follow-ups
router.get('/relationships/follow-ups', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_follow_ups')
            .select('*').eq('completed', false).order('due_date', { ascending: true }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, follow_ups: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/relationships/follow-ups', _auth, async (req, res) => {
    try {
        const { person_id, note, due_date } = req.body || {};
        if (!person_id || !note) return res.status(400).json({ ok: false, error: 'person_id and note required' });
        const { data, error } = await sb().from('apex_follow_ups').insert({
            person_id, note, due_date: due_date || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, follow_up: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/relationships/follow-ups/:id/complete', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_follow_ups')
            .update({ completed: true }).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, follow_up: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
