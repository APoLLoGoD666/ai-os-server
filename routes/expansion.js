'use strict';

const router = require('express').Router();
const { getSupabaseClient } = require('../lib/clients');
router.use(require('../lib/app-auth'));

function _sb() { return getSupabaseClient(); }
function _exp() { return require('../lib/expansion'); }

// GET /api/expansion/summary — counts by status
router.get('/expansion/summary', async (req, res) => {
    try {
        const { data } = await _sb().from('capability_registry').select('status').catch(() => ({ data: [] }));
        const counts = {};
        for (const r of (data || [])) counts[r.status] = (counts[r.status] || 0) + 1;
        res.json({ ok: true, counts, total: (data || []).length });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/expansion/gaps — all registry records, newest first
router.get('/expansion/gaps', async (req, res) => {
    try {
        const { data, error } = await _sb()
            .from('capability_registry')
            .select('id, name, category, gap_source, description, status, decision, scores, spec, created_at, last_checked_at')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        res.json({ ok: true, capabilities: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/expansion/pending — only pending_approval records
router.get('/expansion/pending', async (req, res) => {
    try {
        const { data, error } = await _sb()
            .from('capability_registry')
            .select('id, name, category, gap_source, description, scores, spec, created_at')
            .eq('status', 'pending_approval')
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ ok: true, pending: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/expansion/approve/:id
router.post('/expansion/approve/:id', async (req, res) => {
    try {
        const { approvedBy } = req.body || {};
        const result = await _exp().approveCapability(req.params.id, approvedBy || 'founder');
        res.json(result);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/expansion/reject/:id
router.post('/expansion/reject/:id', async (req, res) => {
    try {
        const { reason } = req.body || {};
        const result = await _exp().rejectCapability(req.params.id, reason || '');
        res.json(result);
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// POST /api/expansion/scan — manual trigger of gap scan cycle
router.post('/expansion/scan', async (req, res) => {
    try {
        const result = await _exp().runExpansionCycle();
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
