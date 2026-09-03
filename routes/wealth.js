'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

router.get('/wealth/transactions', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const type = req.query.type;
        const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
        let q = sb().from('apex_finance_entries').select('*').gte('transaction_date', since).order('transaction_date', { ascending: false });
        if (type) q = q.eq('type', type);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, transactions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/wealth/transactions', _auth, async (req, res) => {
    try {
        const { type, amount, currency, category, description, merchant, transaction_date } = req.body || {};
        const { data, error } = await sb().from('apex_finance_entries').insert({ type, amount, currency, category, description, merchant, transaction_date }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, transaction: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/wealth/summary', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_finance_entries').select('type, amount, category').gte('transaction_date', since);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        const rows = data || [];
        let income = 0, expenses = 0;
        const byCategory = {};
        for (const r of rows) {
            const amt = Number(r.amount) || 0;
            if (r.type === 'income') income += amt;
            else expenses += amt;
            if (r.category) byCategory[r.category] = (byCategory[r.category] || 0) + amt;
        }
        res.json({ ok: true, income, expenses, net: income - expenses, by_category: byCategory });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/wealth/subscriptions', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_subscriptions').select('*').eq('active', true).order('name');
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, subscriptions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/wealth/subscriptions', _auth, async (req, res) => {
    try {
        const { name, amount, currency, billing_cycle, next_billing_date, category } = req.body || {};
        const { data, error } = await sb().from('apex_subscriptions').insert({ name, amount, currency, billing_cycle, next_billing_date, category, active: true }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, subscription: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.delete('/wealth/subscriptions/:id', _auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await sb().from('apex_subscriptions').update({ active: false }).eq('id', id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, subscription: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/wealth/net-worth/latest', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_net_worth_snapshot').select('*').order('snapped_at', { ascending: false }).limit(1).single();
        if (error && error.code !== 'PGRST116') return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, snapshot: data || null });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/wealth/net-worth/snapshot', _auth, async (req, res) => {
    try {
        const { assets_gbp, liabilities_gbp, breakdown } = req.body || {};
        const { data, error } = await sb().from('apex_net_worth_snapshot').insert({ assets_gbp, liabilities_gbp, breakdown }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, snapshot: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
