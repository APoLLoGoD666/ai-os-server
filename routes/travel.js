'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

// Trips
router.get('/travel/trips', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_trips')
            .select('*').order('start_date', { ascending: false }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, trips: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/travel/trips', _auth, async (req, res) => {
    try {
        const { name, destination, start_date, end_date, status, budget_gbp, notes } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        const { data, error } = await sb().from('apex_trips').insert({
            name, destination: destination || null, start_date: start_date || null,
            end_date: end_date || null, status: status || 'planned',
            budget_gbp: budget_gbp != null ? Number(budget_gbp) : null, notes: notes || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, trip: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Trip expenses
router.get('/travel/expenses', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_trip_expenses').select('*').order('expense_date', { ascending: false }).limit(100);
        if (req.query.trip_id) q = q.eq('trip_id', req.query.trip_id);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, expenses: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/travel/expenses', _auth, async (req, res) => {
    try {
        const { trip_id, description, amount_gbp, category, expense_date } = req.body || {};
        if (!trip_id || !description || amount_gbp == null) return res.status(400).json({ ok: false, error: 'trip_id, description, amount_gbp required' });
        const { data, error } = await sb().from('apex_trip_expenses').insert({
            trip_id, description, amount_gbp: Number(amount_gbp),
            category: category || null, expense_date: expense_date || new Date().toISOString().split('T')[0]
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, expense: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Itinerary
router.get('/travel/itinerary', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_itinerary_items').select('*').order('item_date', { ascending: true }).limit(100);
        if (req.query.trip_id) q = q.eq('trip_id', req.query.trip_id);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, items: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/travel/itinerary', _auth, async (req, res) => {
    try {
        const { trip_id, item_date, title, location, notes } = req.body || {};
        if (!trip_id || !title) return res.status(400).json({ ok: false, error: 'trip_id and title required' });
        const { data, error } = await sb().from('apex_itinerary_items').insert({
            trip_id, item_date: item_date || null, title,
            location: location || null, notes: notes || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, item: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
