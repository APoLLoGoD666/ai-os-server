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

module.exports = router;
