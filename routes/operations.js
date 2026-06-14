"use strict";
const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const _auth = require('../lib/app-auth');
const counter = require('../lib/counter');

const _sbClient = (() => { let c; return () => { if (!c) c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY); return c; }; })();
function sb() { return _sbClient(); }

const _pkg = require('../package.json');

// GET /api/healthz — Kubernetes/Render liveness probe, no auth, synchronous, minimal payload
router.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true });
});

/**
 * GET /api/version
 * Returns the running application version and Node.js runtime version.
 * No authentication required. Useful for deployment verification and
 * confirming which build is active in a given environment.
 *
 * Response: { version: string, node: string }
 *   - version: npm package version (falls back to "1.0.0" if env var unavailable)
 *   - node: Node.js runtime version string (e.g. "v20.11.0")
 */
router.get('/version', (req, res) => {
    res.status(200).json({
        version: process.env.npm_package_version || '1.0.0',
        node: process.version
    });
});

// GET /api/status — public system diagnostics endpoint
router.get('/status', (req, res) => {
    try {
        res.json({
            name: _pkg.name,
            version: _pkg.version,
            uptime: process.uptime()
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/ping — lightweight health-check endpoint for monitoring
router.get('/ping', (req, res) => {
    try {
        res.json({ ok: true, timestamp: new Date().toISOString(), comment: 'Apex AI OS server active' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/ready — deployment readiness verification endpoint
router.get('/ready', (req, res) => {
    try {
        res.json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/metrics — request counter diagnostics
router.get('/metrics', (req, res) => {
    try {
        res.json({
            totalRequests: counter.get(),
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/memory-stats — authenticated heap usage diagnostics
router.get('/memory-stats', _auth, (req, res) => {
    try {
        const mem = process.memoryUsage();
        res.status(200).json({
            heapUsed: mem.heapUsed,
            heapTotal: mem.heapTotal,
            external: mem.external
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/info — authenticated system diagnostics endpoint
router.get('/info', _auth, (req, res) => {
    try {
        res.json({
            node_version: process.version,
            platform: process.platform,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/uptime — process uptime in seconds as plain JSON number
router.get('/uptime', (req, res) => {
    try {
        res.json(process.uptime());
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/build-info — public operational diagnostics: Node.js version, platform, architecture
router.get('/build-info', (req, res) => {
    res.json({
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
    });
});

// GET /api/operations/clients
router.get('/operations/clients', _auth, async (req, res) => {
    try {
        const { data, error } = await sb()
            .from('apex_clients')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, clients: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/operations/clients
router.post('/operations/clients', _auth, async (req, res) => {
    try {
        const { name, stage, value, contact_email, follow_up_date } = req.body || {};
        if (!name || !name.trim()) return res.status(400).json({ ok: false, error: 'name required' });
        if (contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email))
            return res.status(400).json({ ok: false, error: 'contact_email is not a valid email address' });
        if (value !== undefined && value !== null && isNaN(Number(value)))
            return res.status(400).json({ ok: false, error: 'value must be a number' });
        if (follow_up_date && !/^\d{4}-\d{2}-\d{2}$/.test(follow_up_date))
            return res.status(400).json({ ok: false, error: 'follow_up_date must be YYYY-MM-DD' });
        const { data, error } = await sb()
            .from('apex_clients')
            .insert({ name: name.trim(), stage: stage || 'qualifying', value: value != null ? Number(value) : null, contact_email: contact_email || null, follow_up_date: follow_up_date || null })
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
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, projects: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
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
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, documents: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
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
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, proposals: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;