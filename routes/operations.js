"use strict";
const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const _auth = require('../lib/app-auth');

const _sbClient = (() => { let c; return () => { if (!c) c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY); return c; }; })();
function sb() { return _sbClient(); }

// GET /api/operations/clients
router.get('/operations/clients', _auth, async (req, res) => {
    try {
        const { data, error } = await sb()
            .from('apex_clients')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) return res.json({ ok: true, clients: [] });
        res.json({ ok: true, clients: data || [] });
    } catch (e) {
        res.json({ ok: true, clients: [], error: e.message });
    }
});

// POST /api/operations/clients
router.post('/operations/clients', _auth, async (req, res) => {
    try {
        const { name, stage, value, contact_email, follow_up_date } = req.body || {};
        if (!name) return res.status(400).json({ ok: false, error: 'name required' });
        const { data, error } = await sb()
            .from('apex_clients')
            .insert({ name, stage: stage || 'qualifying', value: value || null, contact_email: contact_email || null, follow_up_date: follow_up_date || null })
            .select()
            .single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, client: data });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/operations/projects
router.get('/operations/projects', _auth, async (req, res) => {
    try {
        const { data, error } = await sb()
            .from('apex_projects')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) return res.json({ ok: true, projects: [] });
        res.json({ ok: true, projects: data || [] });
    } catch (e) {
        res.json({ ok: true, projects: [], error: e.message });
    }
});

// GET /api/operations/documents
router.get('/operations/documents', _auth, async (req, res) => {
    try {
        const { data, error } = await sb()
            .from('apex_documents')
            .select('id,name,status,doc_type,created_at,updated_at')
            .order('created_at', { ascending: false })
            .limit(30);
        if (error) return res.json({ ok: true, documents: [] });
        res.json({ ok: true, documents: data || [] });
    } catch (e) {
        res.json({ ok: true, documents: [], error: e.message });
    }
});

// GET /api/operations/proposals
router.get('/operations/proposals', _auth, async (req, res) => {
    try {
        const { data, error } = await sb()
            .from('apex_proposals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) return res.json({ ok: true, proposals: [] });
        res.json({ ok: true, proposals: data || [] });
    } catch (e) {
        res.json({ ok: true, proposals: [], error: e.message });
    }
});

module.exports = router;
