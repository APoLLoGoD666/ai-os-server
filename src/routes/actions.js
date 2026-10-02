'use strict';
// V-11-H-B2: GET /api/actions/summary — badge metrics for the ACTIONS surface.
// One roundtrip returns { pending_approvals, in_progress, completed_today,
// failed_today, notifications_unread, needs_attention_count }. Owner-scoped
// per V-11-H-B1: Users see only their own; Master sees own by default and
// system-wide via ?scope=all. 15-second in-process TTL cache keyed by
// (humanId, scope). See docs/ux/V-11-H-B-IMPLEMENTATION-READINESS.md §14.
const express = require('express');
const router = express.Router();
const { requireAppAccess } = require('../../lib/middleware');
const { getSupabaseClient } = require('../../lib/clients');

const _summaryCache = new Map();
const TTL_MS = 15000;

router.get('/api/actions/summary', requireAppAccess, async (req, res) => {
    try {
        const identity = req.identity || {};
        const scope    = req.query.scope || 'me';

        if (scope === 'all' && identity.role !== 'master') {
            return res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'scope=all requires master role' });
        }

        const humanId  = identity.humanId;
        const isMaster = identity.role === 'master';
        const cacheKey = `${humanId}:${scope}`;

        const cached = _summaryCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return res.json({ ok: true, ...cached.payload, cached: true });
        }

        const sb = getSupabaseClient();
        const midnight = new Date();
        midnight.setUTCHours(0, 0, 0, 0);
        const midnightISO = midnight.toISOString();

        // Owner filter: for Master+scope=all, no filter (system-wide counts).
        // For every other case (Master scope=me OR any Non-Master), filter by humanId.
        const applyOwner = (query) => {
            if (isMaster && scope === 'all') return query;
            return query.eq('human_id', humanId);
        };

        const [pendingRes, inProgressRes, completedRes, failedRes, notifRes] = await Promise.all([
            applyOwner(sb.from('apex_tasks').select('id', { count: 'exact', head: true })
                .in('status', ['pending', 'awaiting_approval', 'approval_required', 'pending_approval'])),
            applyOwner(sb.from('apex_tasks').select('id', { count: 'exact', head: true })
                .eq('status', 'in_progress')),
            applyOwner(sb.from('apex_tasks').select('id', { count: 'exact', head: true })
                .eq('status', 'completed').gte('updated_at', midnightISO)),
            applyOwner(sb.from('apex_tasks').select('id', { count: 'exact', head: true })
                .eq('status', 'failed').gte('updated_at', midnightISO)),
            applyOwner(sb.from('apex_notifications').select('id', { count: 'exact', head: true })
                .eq('read', false).neq('type', 'permission')),
        ]);

        const pending_approvals    = pendingRes.count    || 0;
        const in_progress          = inProgressRes.count || 0;
        const completed_today      = completedRes.count  || 0;
        const failed_today         = failedRes.count     || 0;
        const notifications_unread = notifRes.count      || 0;
        const needs_attention_count = pending_approvals + notifications_unread;

        const summary = {
            pending_approvals,
            in_progress,
            completed_today,
            failed_today,
            notifications_unread,
            needs_attention_count,
        };
        const payload = { summary, scope, generated_at: new Date().toISOString(), cache_ttl_ms: TTL_MS };
        _summaryCache.set(cacheKey, { expiresAt: Date.now() + TTL_MS, payload });

        res.json({ ok: true, ...payload });
    } catch (err) {
        console.error('[actions/summary]', err.message);
        res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: 'Failed to compute action summary' });
    }
});

module.exports = router;
