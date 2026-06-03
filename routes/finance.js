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

module.exports = router;
