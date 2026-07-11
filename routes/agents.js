'use strict';

const express = require('express');
const router  = express.Router();
const { createClient } = require('@supabase/supabase-js');

const _sbSync = (() => { let c; return () => { if (!c) c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); return c; }; })();

function _lib()    { return require('../agent-system/agent-library'); }
function _domain() { return require('../agent-system/domain-agents'); }
const _auth = require('../lib/app-auth');

// GET /api/agents/status
router.get('/agents/status', _auth, (req, res) => {
    try { res.json({ ok: true, ..._lib().status() }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/agents/categories
router.get('/agents/categories', _auth, (req, res) => {
    try { res.json({ ok: true, categories: _lib().getCategories() }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/agents?category=engineering
router.get('/agents', _auth, (req, res) => {
    try {
        const agents = _lib().listAgents(req.query.category);
        res.json({
            ok: true,
            agents: agents.map(a => ({
                slug:        a.slug,
                name:        a.name,
                category:    a.category,
                description: a.description,
                vault_path:  a.vault_path || null
            })),
            ..._lib().status()
        });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/agents/domain — list Apex domain agents (MUST be before /:slug to avoid shadowing)
router.get('/agents/domain', _auth, (req, res) => {
    try { res.json({ ok: true, agents: _domain().listDomainAgents() }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/agents/invoke  { agentSlug, message } (MUST be before /:slug)
router.post('/agents/invoke', _auth, async (req, res) => {
    const { agentSlug, message } = req.body || {};
    if (!agentSlug || !message)
        return res.status(400).json({ ok: false, error: 'agentSlug and message required' });
    if (typeof message !== 'string' || message.length > 8000)
        return res.status(400).json({ ok: false, error: 'message must be a string ≤ 8000 chars' });
    try {
        const result = await _lib().invokeAgent(agentSlug, message);
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/agents/:slug
router.get('/agents/:slug', _auth, (req, res) => {
    try {
        const { slug } = req.params;
        if (!slug || slug.length > 100) return res.status(400).json({ ok: false, error: 'Invalid slug' });
        const agent = _lib().getAgent(slug);
        if (!agent) return res.status(404).json({ ok: false, error: 'Agent not found' });
        res.json({ ok: true, agent });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/agents/domain/invoke  { slug, message, history? }
router.post('/agents/domain/invoke', _auth, async (req, res) => {
    const { slug, message, history } = req.body || {};
    if (!slug || !message)
        return res.status(400).json({ ok: false, error: 'slug and message required' });
    if (typeof message !== 'string' || message.length > 8000)
        return res.status(400).json({ ok: false, error: 'message must be a string ≤ 8000 chars' });
    if (history !== undefined && !Array.isArray(history))
        return res.status(400).json({ ok: false, error: 'history must be an array' });
    try {
        const result = await _domain().invokeDomainAgent(slug, message, { history: history || [] });
        res.json({ ok: true, ...result });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/agents/sync  — re-fetch from GitHub in background
router.post('/agents/sync', _auth, async (req, res) => {
    res.json({ ok: true, status: 'syncing', message: 'Full sync started — 150+ agents incoming' });
    setImmediate(async () => {
        try {
            await _lib().syncFromGitHub(_sbSync(), { obsidian: true });
        } catch (e) { console.error('[AgentLib] sync error:', e.message); }
    });
});

module.exports = router;
