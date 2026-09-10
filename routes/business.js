'use strict';
const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
const _auth = require('../lib/app-auth');

const sb = getSupabaseClient;

router.get('/business', _auth, async (req, res) => {
    try {
        const _hid = req.identity?.role !== 'master' ? (req.identity?.humanId || '') : null;
        let q = sb().from('apex_businesses').select('*').order('created_at', { ascending: false });
        if (_hid !== null) q = q.eq('human_id', _hid);
        const { data, error } = await q;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, businesses: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.post('/business', _auth, async (req, res) => {
    try {
        const { name, type, description } = req.body || {};
        if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'name required' });
        const human_id = req.identity?.humanId || null;
        const { data, error } = await sb()
            .from('apex_businesses')
            .insert({ name: name.trim(), type: type || null, description: description || null, human_id })
            .select()
            .single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, business: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.patch('/business/:id', _auth, async (req, res) => {
    try {
        const { name, type, description } = req.body || {};
        const updates = {};
        if (name !== undefined) updates.name = name.trim();
        if (type !== undefined) updates.type = type;
        if (description !== undefined) updates.description = description;
        if (!Object.keys(updates).length) return res.status(400).json({ ok: false, error: 'nothing to update' });
        const { data, error } = await sb().from('apex_businesses').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, business: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.delete('/business/:id', _auth, async (req, res) => {
    try {
        const { error } = await sb().from('apex_businesses').delete().eq('id', req.params.id);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
