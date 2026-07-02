'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

// Properties
router.get('/property', _auth, async (req, res) => {
    try {
        const { data, error } = await sb().from('apex_properties')
            .select('*').order('created_at', { ascending: false }).limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, properties: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/property', _auth, async (req, res) => {
    try {
        const { name, address, type, monthly_cost_gbp, lease_end_date, notes } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        const { data, error } = await sb().from('apex_properties').insert({
            name, address: address || null, type: type || 'rental',
            monthly_cost_gbp: monthly_cost_gbp != null ? Number(monthly_cost_gbp) : null,
            lease_end_date: lease_end_date || null, notes: notes || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, property: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Property expenses
router.get('/property/expenses', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_property_expenses').select('*').order('expense_date', { ascending: false }).limit(100);
        if (req.query.property_id) q = q.eq('property_id', req.query.property_id);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, expenses: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/property/expenses', _auth, async (req, res) => {
    try {
        const { property_id, description, amount_gbp, category, expense_date } = req.body || {};
        if (!property_id || !description || amount_gbp == null) return res.status(400).json({ ok: false, error: 'property_id, description, amount_gbp required' });
        const { data, error } = await sb().from('apex_property_expenses').insert({
            property_id, description, amount_gbp: Number(amount_gbp),
            category: category || null, expense_date: expense_date || new Date().toISOString().split('T')[0]
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, expense: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Maintenance
router.get('/property/maintenance', _auth, async (req, res) => {
    try {
        let q = sb().from('apex_maintenance_items').select('*').order('scheduled_date', { ascending: true }).limit(100);
        if (req.query.property_id) q = q.eq('property_id', req.query.property_id);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, maintenance: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/property/maintenance', _auth, async (req, res) => {
    try {
        const { property_id, description, status, scheduled_date, cost_gbp, notes } = req.body || {};
        if (!property_id || !description) return res.status(400).json({ ok: false, error: 'property_id and description required' });
        const { data, error } = await sb().from('apex_maintenance_items').insert({
            property_id, description, status: status || 'pending',
            scheduled_date: scheduled_date || null,
            cost_gbp: cost_gbp != null ? Number(cost_gbp) : null, notes: notes || null
        }).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, item: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/property/maintenance/:id', _auth, async (req, res) => {
    try {
        const { status, cost_gbp, notes } = req.body || {};
        const updates = {};
        if (status) updates.status = status;
        if (cost_gbp != null) updates.cost_gbp = Number(cost_gbp);
        if (notes) updates.notes = notes;
        const { data, error } = await sb().from('apex_maintenance_items').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, item: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
