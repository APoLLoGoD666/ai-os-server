'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { getSupabaseClient } = require('../../lib/clients');
const _toolRegistry = require('../../lib/tool-registry');

function _sb() { return getSupabaseClient(); }

async function _log(slug, action, params, result, error, duration_ms, triggered_by, human_id) {
    try {
        await _sb().from('tool_action_logs').insert({
            slug, action,
            params: params || {},
            result: error ? null : result,
            error: error || null,
            duration_ms,
            triggered_by,
            human_id: human_id || null,
        });
    } catch (_) {}
}

// POST /api/tool-actions/execute
router.post('/api/tool-actions/execute', requireAppAccess, async (req, res) => {
    try {
        const { tool, params } = req.body || {};
        if (!tool || typeof tool !== 'string') {
            return res.status(400).json({ ok: false, error: 'INVALID_INPUT', message: 'tool name required' });
        }

        const t0 = Date.now();
        let result = null;
        let execErr = null;

        try {
            result = await _toolRegistry.execute(tool, params || {});
        } catch (err) {
            execErr = err.message;
        }

        const duration_ms = Date.now() - t0;
        const parts = tool.split('_');
        const slug = parts[0];
        const action = parts.slice(1).join('_');

        await _log(slug, action, params, result, execErr, duration_ms, 'api', req.identity?.humanId);

        if (execErr) return res.status(400).json({ ok: false, error: 'TOOL_ERROR', message: execErr });
        return res.status(200).json({ ok: true, result, duration_ms });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: err.message });
    }
});

// GET /api/tool-actions/logs
router.get('/api/tool-actions/logs', requireAppAccess, async (req, res) => {
    try {
        const slug = req.query.slug;
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);

        let query = _sb()
            .from('tool_action_logs')
            .select('id,slug,action,params,result,error,duration_ms,triggered_by,human_id,created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (slug) query = query.eq('slug', slug);

        const { data, error } = await query;
        if (error) return res.status(500).json({ ok: false, error: 'DB_ERROR', message: error.message });
        return res.status(200).json({ ok: true, logs: data || [] });
    } catch (err) {
        return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: err.message });
    }
});

module.exports = router;
