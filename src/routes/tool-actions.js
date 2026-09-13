'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { getSupabaseClient } = require('../../lib/clients');
const _toolRegistry = require('../../lib/tool-registry');

function _sb() { return getSupabaseClient(); }

// POST /api/tool-actions/execute  — run a tool action directly (for testing/agents)
router.post('/api/tool-actions/execute', requireAppAccess, async (req, res) => {
    const { tool, params } = req.body || {};
    if (!tool || typeof tool !== 'string') {
        return res.status(400).json({ ok: false, error: 'INVALID_INPUT', message: 'tool name required' });
    }

    const t0 = Date.now();
    let result = null;
    let error = null;

    try {
        result = await _toolRegistry.execute(tool, params || {});
    } catch (err) {
        error = err.message;
    }

    const duration_ms = Date.now() - t0;
    const [slug, ...actionParts] = tool.split('_');
    const action = actionParts.join('_');

    await _sb().from('tool_action_logs').insert({
        slug,
        action,
        params: params || {},
        result: error ? null : result,
        error: error || null,
        duration_ms,
        triggered_by: 'api',
        human_id: req.identity?.humanId || null,
    }).catch(() => {});

    if (error) return res.status(400).json({ ok: false, error: 'TOOL_ERROR', message: error });
    return res.status(200).json({ ok: true, result, duration_ms });
});

// GET /api/tool-actions/logs  — fetch recent action logs
router.get('/api/tool-actions/logs', requireAppAccess, async (req, res) => {
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
});

module.exports = router;
