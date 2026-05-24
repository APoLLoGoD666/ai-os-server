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
router.get('/finance/invoices', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_invoices').select('*').order('created_at', { ascending: false }).limit(20);
        if (error) return res.json({ ok: true, invoices: [] });
        res.json({ ok: true, invoices: data || [] });
    } catch (e) { res.json({ ok: true, invoices: [], error: e.message }); }
});

router.get('/finance/expenses', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_transactions').select('id,description,amount,category,date,source').eq('type', 'expense').order('date', { ascending: false }).limit(30);
        if (error) return res.json({ ok: true, expenses: [] });
        res.json({ ok: true, expenses: data || [] });
    } catch (e) { res.json({ ok: true, expenses: [], error: e.message }); }
});

router.get('/finance/subscriptions', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_subscriptions').select('*').order('name', { ascending: true });
        if (error) return res.json({ ok: true, subscriptions: [] });
        res.json({ ok: true, subscriptions: data || [] });
    } catch (e) { res.json({ ok: true, subscriptions: [], error: e.message }); }
});

router.get('/finance/investments', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_investments').select('*').order('name', { ascending: true });
        if (error) return res.json({ ok: true, investments: [] });
        res.json({ ok: true, investments: data || [] });
    } catch (e) { res.json({ ok: true, investments: [], error: e.message }); }
});

module.exports = router;
