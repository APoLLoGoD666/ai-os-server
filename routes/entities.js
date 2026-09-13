'use strict';
// routes/entities.js — entity registry and relationship graph API
// Internal sub-prefix: /entities (per flat-mount convention)

const router = require('express').Router();
const _auth  = require('../lib/app-auth');
const { getSupabaseClient } = require('../lib/clients');
const { resolveEntity }     = require('../lib/entities/resolver');

function _sb() { return getSupabaseClient(); }

// GET /api/entities — list entities, optionally filtered by kind
router.get('/entities', _auth, async (req, res) => {
    try {
        const { kind, q, limit = 50 } = req.query;
        let query = _sb()
            .from('entities')
            .select('entity_id, kind, name, aliases, attrs, created_at')
            .is('merged_into', null)
            .order('created_at', { ascending: false })
            .limit(Math.min(parseInt(limit), 200));
        if (kind) query = query.eq('kind', kind);
        if (q)    query = query.ilike('name', `%${q}%`);
        const { data, error } = await query;
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, entities: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/entities/:id — single entity with its relationships
router.get('/entities/:id', _auth, async (req, res) => {
    try {
        const { data: entity, error } = await _sb()
            .from('entities')
            .select('*')
            .eq('entity_id', req.params.id)
            .single();
        if (error) return res.status(error.code === 'PGRST116' ? 404 : 500).json({ ok: false, error: error.message });

        const { data: rels } = await _sb()
            .from('relationships')
            .select('edge_id, entity_a, entity_b, rel_type, strength, last_contact')
            .or(`entity_a.eq.${req.params.id},entity_b.eq.${req.params.id}`)
            .order('strength', { ascending: false })
            .limit(50);

        res.json({ ok: true, entity, relationships: rels || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/entities/resolve — resolve name/email to canonical entity_id
router.post('/entities/resolve', _auth, async (req, res) => {
    try {
        const { kind, identifier, attrs } = req.body || {};
        if (!kind || !identifier) return res.status(400).json({ ok: false, error: 'kind and identifier required' });
        const result = await resolveEntity(kind, identifier, attrs || {});
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/entities/:id/interactions — recent interactions for an entity's edges
router.get('/entities/:id/interactions', _auth, async (req, res) => {
    try {
        const id = req.params.id;
        const { data: rels } = await _sb()
            .from('relationships')
            .select('edge_id')
            .or(`entity_a.eq.${id},entity_b.eq.${id}`);

        if (!rels?.length) return res.json({ ok: true, interactions: [] });
        const edgeIds = rels.map(r => r.edge_id);

        const { data, error } = await _sb()
            .from('interactions')
            .select('*')
            .in('edge_id', edgeIds)
            .order('occurred_at', { ascending: false })
            .limit(100);

        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, interactions: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/entities/merge-queue — pending deduplication reviews
router.get('/entities/merge-queue', _auth, async (req, res) => {
    try {
        const { data, error } = await _sb()
            .from('entity_merge_queue')
            .select(`
                merge_id, confidence, evidence, created_at,
                a:candidate_a(entity_id, kind, name),
                b:candidate_b(entity_id, kind, name)
            `)
            .eq('status', 'pending')
            .order('confidence', { ascending: false })
            .limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, queue: data || [] });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/entities/merge-queue/:id/resolve — accept or reject a merge
router.post('/entities/merge-queue/:id/resolve', _auth, async (req, res) => {
    try {
        const { action } = req.body || {}; // 'merge' | 'reject'
        if (!['merge', 'reject'].includes(action)) return res.status(400).json({ ok: false, error: 'action must be merge or reject' });

        const { data: item, error: fetchErr } = await _sb()
            .from('entity_merge_queue')
            .select('*')
            .eq('merge_id', req.params.id)
            .single();
        if (fetchErr) return res.status(404).json({ ok: false, error: 'merge item not found' });

        if (action === 'merge') {
            // Point candidate_b → candidate_a (soft merge)
            await _sb().from('entities').update({ merged_into: item.candidate_a }).eq('entity_id', item.candidate_b);
        }
        const newStatus = action === 'merge' ? 'merged' : 'rejected';
        await _sb().from('entity_merge_queue')
            .update({ resolved_at: new Date().toISOString(), status: newStatus })
            .eq('merge_id', req.params.id);

        res.json({ ok: true, action });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
