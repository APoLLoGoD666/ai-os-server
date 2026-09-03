'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

// Wishlist
router.get('/shopping/wishlist', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_wishlist').select('*').order('priority', { ascending: false }).limit(100);
        if (req.query.purchased === 'false') q = q.eq('purchased', false);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, items: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/shopping/wishlist', _auth, async (req, res) => {
    try {
        const { name, url, price_target_gbp, current_price_gbp, priority, notes } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        const { data, error } = await sb().from('apex_wishlist').insert({
            name, url: url || null,
            price_target_gbp: price_target_gbp != null ? Number(price_target_gbp) : null,
            current_price_gbp: current_price_gbp != null ? Number(current_price_gbp) : null,
            priority: priority || 'medium', purchased: false, notes: notes || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, item: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/shopping/wishlist/:id', _auth, async (req, res) => {
    try {
        const allowed = ['name', 'url', 'price_target_gbp', 'current_price_gbp', 'priority', 'purchased', 'notes'];
        const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([k]) => allowed.includes(k)));
        const { data, error } = await sb().from('apex_wishlist').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, item: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Purchases
router.get('/shopping/purchases', _auth, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
        const { data, error } = await sb().from('apex_purchases')
            .select('*').gte('purchase_date', since).order('purchase_date', { ascending: false }).limit(100);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        const total = (data || []).reduce((s, p) => s + (Number(p.amount_gbp) || 0), 0);
        res.json({ ok: true, purchases: data || [], total_gbp: total });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/shopping/purchases', _auth, async (req, res) => {
    try {
        const { name, amount_gbp, category, purchase_date, notes } = req.body || {};
        if (!name || amount_gbp == null) return res.status(400).json({ ok: false, error: 'name and amount_gbp required' });
        const { data, error } = await sb().from('apex_purchases').insert({
            name, amount_gbp: Number(amount_gbp), category: category || null,
            purchase_date: purchase_date || new Date().toISOString().split('T')[0], notes: notes || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, purchase: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
