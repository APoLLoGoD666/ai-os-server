'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

// Contracts
router.get('/legal/contracts', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_contracts')
            .select('*').order('created_at', { ascending: false }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, contracts: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/legal/contracts', _auth, async (req, res) => {
    try {
        const { title, counterparty, type, start_date, end_date, status, file_url, notes } = req.body || {};
        if (!title) return res.status(400).json({ ok: false, error: 'title required' });
        const { data, error } = await sb().from('apex_contracts').insert({
            title, counterparty: counterparty || null, type: type || 'other',
            start_date: start_date || null, end_date: end_date || null,
            status: status || 'active', file_url: file_url || null, notes: notes || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, contract: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/legal/contracts/:id', _auth, async (req, res) => {
    try {
        const allowed = ['title', 'counterparty', 'type', 'start_date', 'end_date', 'status', 'file_url', 'notes'];
        const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
        const { data, error } = await sb().from('apex_contracts').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, contract: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Deadlines
router.get('/legal/deadlines', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_legal_deadlines').select('*').order('due_date', { ascending: true }).limit(100);
        if (req.query.contract_id) q = q.eq('contract_id', req.query.contract_id);
        if (req.query.pending === 'true') q = q.eq('completed', false);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, deadlines: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/legal/deadlines', _auth, async (req, res) => {
    try {
        const { contract_id, description, due_date } = req.body || {};
        if (!description || !due_date) return res.status(400).json({ ok: false, error: 'description and due_date required' });
        const { data, error } = await sb().from('apex_legal_deadlines').insert({
            contract_id: contract_id || null, description, due_date
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, deadline: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/legal/deadlines/:id/complete', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_legal_deadlines')
            .update({ completed: true }).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, deadline: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
