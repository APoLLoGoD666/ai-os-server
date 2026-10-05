'use strict';
const express = require('express');
const router  = express.Router();
const _auth   = require('../lib/app-auth');
const conn    = require('../lib/connections');
const { testConnection } = require('../lib/connection-testers');

const SLUG_RE = /^[a-z0-9-]+$/;
function _validSlug(s) { return typeof s === 'string' && s.length >= 1 && s.length <= 60 && SLUG_RE.test(s); }

// GET /api/connections — list all
router.get('/connections', _auth, async (req, res) => {
    try {
        const list = await conn.listConnections();
        res.json({ ok: true, connections: list });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/connections/summary
router.get('/connections/summary', _auth, async (req, res) => {
    try {
        const list = await conn.listConnections();
        const connected = list.filter(c => c.status === 'connected').length;
        res.json({ ok: true, connected, total: list.length });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// GET /api/connections/:slug — single status
router.get('/connections/:slug', _auth, async (req, res) => {
    const { slug } = req.params;
    if (!_validSlug(slug)) return res.status(400).json({ ok: false, error: 'Invalid slug' });
    try {
        const c = await conn.getConnectionBySlug(slug);
        res.json({ ok: true, connection: c || { slug, status: 'disconnected' } });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/connections/:slug/api-key  { key, displayName?, authType? }
router.post('/connections/:slug/api-key', _auth, async (req, res) => {
    const { slug } = req.params;
    if (!_validSlug(slug)) return res.status(400).json({ ok: false, error: 'Invalid slug' });
    const { key, displayName, authType = 'api_key' } = req.body || {};
    if (!key || typeof key !== 'string' || key.trim().length < 4)
        return res.status(400).json({ ok: false, error: 'key must be at least 4 characters' });
    const cleanKey = key.trim();
    try {
        await conn.upsertConnection(slug, displayName || slug, authType);
        await conn.saveCredential(slug, 'api_key', cleanKey);
        await conn.setConnectionStatus(slug, 'connected');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/connections/:slug/connection-string  { value, displayName? }
router.post('/connections/:slug/connection-string', _auth, async (req, res) => {
    const { slug } = req.params;
    if (!_validSlug(slug)) return res.status(400).json({ ok: false, error: 'Invalid slug' });
    const { value, displayName } = req.body || {};
    if (!value || typeof value !== 'string' || value.trim().length < 4)
        return res.status(400).json({ ok: false, error: 'value must be at least 4 characters' });
    try {
        await conn.upsertConnection(slug, displayName || slug, 'connection_string');
        await conn.saveCredential(slug, 'connection_string', value.trim());
        await conn.setConnectionStatus(slug, 'connected');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// POST /api/connections/:slug/test — live connectivity check
router.post('/connections/:slug/test', _auth, async (req, res) => {
    const { slug } = req.params;
    if (!_validSlug(slug)) return res.status(400).json({ ok: false, error: 'Invalid slug' });
    try {
        const apiKey = await conn.getCredential(slug, 'api_key')
                    || await conn.getCredential(slug, 'connection_string');
        if (!apiKey) return res.status(400).json({ ok: false, error: 'No credentials stored' });
        const result = await testConnection(slug, apiKey);
        // Update last_tested_at and status based on result
        const { getSupabaseClient } = require('../lib/clients');
        await getSupabaseClient().from('tool_connections').update({
            last_tested_at: new Date().toISOString(),
            status:         result.ok ? 'connected' : 'error',
            last_error:     result.ok ? null : (result.error || `HTTP ${result.status}`),
        }).eq('slug', slug);
        res.json({ ok: result.ok, latencyMs: result.latencyMs, detail: result.detail, error: result.error });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// DELETE /api/connections/:slug — disconnect
router.delete('/connections/:slug', _auth, async (req, res) => {
    const { slug } = req.params;
    if (!_validSlug(slug)) return res.status(400).json({ ok: false, error: 'Invalid slug' });
    try {
        await conn.deleteCredentials(slug);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
