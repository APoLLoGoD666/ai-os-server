'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

router.get('/finance/invoices', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_invoices')
            .select('id,title,amount,status,due_date,client_name,created_at')
            .order('created_at', { ascending: false }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, invoices: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/finance/expenses', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_transactions')
            .select('id,description,amount,category,date,source')
            .eq('type', 'expense').order('date', { ascending: false }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, expenses: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/finance/subscriptions', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_subscriptions')
            .select('id,name,amount,billing_cycle,category,active,next_billing_date')
            .order('name', { ascending: true }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, subscriptions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/finance/investments', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_investments')
            .select('id,name,type,amount,current_value,platform,notes')
            .order('name', { ascending: true }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, investments: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/finance/balance', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_transactions').select('amount,type');
        if (error) return res.status(500).json({ ok: false, error: error.message });
        let income = 0, expenses = 0;
        for (const t of data || []) {
            if (t.type === 'income') income += Number(t.amount);
            else expenses += Number(t.amount);
        }
        res.json({ ok: true, balance: income - expenses, income, expenses });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/finance/cashflow', _auth, async (req, res) => {
    try {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 6);
        const { data, error } = await sb().from('apex_transactions')
            .select('amount,type,date')
            .gte('date', cutoff.toISOString().split('T')[0]);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        const months = {};
        for (const t of data || []) {
            const m = t.date.slice(0, 7);
            if (!months[m]) months[m] = { income: 0, expenses: 0 };
            if (t.type === 'income') months[m].income += Number(t.amount);
            else months[m].expenses += Number(t.amount);
        }
        const cashflow = Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, v]) => ({ month, income: v.income, expenses: v.expenses, net: v.income - v.expenses }));
        res.json({ ok: true, cashflow });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/finance/profit-loss', _auth, async (req, res) => {
    try {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 6);
        const { data, error } = await sb().from('apex_transactions')
            .select('amount,type,category,date')
            .gte('date', cutoff.toISOString().split('T')[0]);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        const months = {};
        for (const t of data || []) {
            const m = t.date.slice(0, 7);
            if (!months[m]) months[m] = { income: 0, expenses: 0, categories: {} };
            const amt = Number(t.amount);
            if (t.type === 'income') months[m].income += amt;
            else {
                months[m].expenses += amt;
                months[m].categories[t.category] = (months[m].categories[t.category] || 0) + amt;
            }
        }
        const pnl = Object.entries(months)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, v]) => ({ month, income: v.income, expenses: v.expenses, profit: v.income - v.expenses, categories: v.categories }));
        res.json({ ok: true, pnl });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/finance/invoices', _auth, async (req, res) => {
    try {
        const { title, amount, client_name, due_date, status, notes } = req.body || {};
        if (!title) return res.status(400).json({ ok: false, error: 'title required' });
        if (amount == null) return res.status(400).json({ ok: false, error: 'amount required' });
        const { data, error } = await sb().from('apex_invoices')
            .insert({ title, amount: Number(amount), client_name: client_name || null, due_date: due_date || null, status: status || 'draft', notes: notes || null })
            .select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, invoice: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/finance/invoices/:id', _auth, async (req, res) => {
    try {
        const allowed = ['status', 'amount', 'due_date', 'client_name', 'notes'];
        const patch = {};
        for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        if (!Object.keys(patch).length) return res.status(400).json({ ok: false, error: 'no fields to update' });
        if (patch.amount) patch.amount = Number(patch.amount);
        const { data, error } = await sb().from('apex_invoices').update(patch).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, invoice: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/finance/subscriptions', _auth, async (req, res) => {
    try {
        const { name, amount, billing_cycle, category, active, next_billing_date } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        const { data, error } = await sb().from('apex_subscriptions')
            .insert({ name, amount: amount != null ? Number(amount) : null, billing_cycle: billing_cycle || 'monthly', category: category || null, active: active !== false, next_billing_date: next_billing_date || null })
            .select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, subscription: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/finance/subscriptions/:id', _auth, async (req, res) => {
    try {
        const allowed = ['name', 'amount', 'active', 'next_billing_date', 'category', 'billing_cycle'];
        const patch = {};
        for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        if (!Object.keys(patch).length) return res.status(400).json({ ok: false, error: 'no fields to update' });
        if (patch.amount) patch.amount = Number(patch.amount);
        if (patch.active !== undefined) patch.active = !!patch.active;
        const { data, error } = await sb().from('apex_subscriptions').update(patch).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, subscription: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/finance/investments', _auth, async (req, res) => {
    try {
        const { name, type, amount, current_value, platform, notes } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        const { data, error } = await sb().from('apex_investments')
            .insert({ name, type: type || null, amount: amount != null ? Number(amount) : null, current_value: current_value != null ? Number(current_value) : null, platform: platform || null, notes: notes || null })
            .select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, investment: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/finance/investments/:id', _auth, async (req, res) => {
    try {
        const allowed = ['name', 'type', 'amount', 'current_value', 'platform', 'notes'];
        const patch = {};
        for (const k of allowed) if (req.body?.[k] !== undefined) patch[k] = req.body[k];
        if (!Object.keys(patch).length) return res.status(400).json({ ok: false, error: 'no fields to update' });
        if (patch.amount) patch.amount = Number(patch.amount);
        if (patch.current_value) patch.current_value = Number(patch.current_value);
        const { data, error } = await sb().from('apex_investments').update(patch).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, investment: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
