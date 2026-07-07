'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { getWorkspaceStorageDebug } = require('../../lib/storage');
const { loadMemory } = require('../../lib/chat-context');
const sbAdmin = require('../../lib/clients').getSupabaseClient();

const MODEL = 'claude-opus-4-7';

router.get('/test', requireAppAccess, (req, res) => {
    res.status(200).json({
        ok: true,
        message: "Server works",
        model: MODEL,
        apiKeyLoaded: !!process.env.ANTHROPIC_API_KEY
    });
});

router.get('/test-db', requireAppAccess, async (req, res) => {
    try {
        const { data, error } = await sbAdmin.from('agent_tasks').select('id').limit(1);
        if (error) throw new Error(error.message);
        res.json({ ok: true, time: new Date().toISOString(), supabase: 'connected' });
    } catch (err) {
        console.error("DB TEST ERROR:", err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.get('/version', requireAppAccess, (req, res) => {
    res.status(200).json({
        ok: true,
        version: "postgres-documents-v1",
        autonomyLevel: process.env.AUTONOMY_LEVEL || "not set"
    });
});

router.get('/debug-storage', requireAppAccess, async (req, res) => {
    try {
        const debug = await getWorkspaceStorageDebug();
        res.status(debug.ok ? 200 : 500).json(debug);
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.get('/memory', requireAppAccess, async (req, res) => {
    const memory = await loadMemory();
    res.status(200).json({ ok: true, count: memory.length, memory });
});

module.exports = router;
