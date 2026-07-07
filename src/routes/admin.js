'use strict';
const router = require('express').Router();
const { requireAppAccess } = require('../../lib/middleware');
const { _errBuffer } = require('../../lib/server-state');
const _gateway = require('../../lib/memory/gateway');

// Deep health check — subsystem-level
router.get('/health/deep', requireAppAccess, async (req, res) => {
    const t = Date.now();
    const checks = {};
    try {
        const { getSupabaseClient } = require('../../lib/clients');
        const sb = getSupabaseClient();
        const { error } = await sb.from('apex_notifications').select('id', { head: true, count: 'exact' });
        checks.supabase = { ok: !error, latency_ms: Date.now() - t };
    } catch (e) { checks.supabase = { ok: false, error: e.message }; }
    try {
        const t2 = Date.now();
        const gwCtx = await _gateway.getContext({ description: 'health check', requestingEntity: 'api_client', tokenBudget: 100, taskId: 'health' }).catch(() => null);
        checks.gateway = { ok: !!gwCtx, latency_ms: Date.now() - t2 };
    } catch (e) { checks.gateway = { ok: false, error: e.message }; }
    try {
        const civRuntime = require('../../lib/intelligence/civilization-runtime');
        checks.civilization = { ok: true, isRunning: civRuntime.isRunning(), cycleCount: civRuntime.getCycleCount() };
    } catch (e) { checks.civilization = { ok: false, error: e.message }; }
    const allOk = Object.values(checks).every(c => c.ok);
    res.status(allOk ? 200 : 207).json({ ok: allOk, latency_ms: Date.now() - t, checks });
});

// Weekly cognitive intelligence report
router.get('/api/cognitive/report', requireAppAccess, async (req, res) => {
    try {
        const period = req.query.period || 'weekly';
        const reporter = require('../../lib/cognitive/reporting/intelligence-evolution-reporter');
        const fn = { weekly: 'generateWeeklyReport', monthly: 'generateMonthlyReport', quarterly: 'generateQuarterlyReport' }[period];
        if (!fn) return res.status(400).json({ ok: false, error: 'period must be weekly|monthly|quarterly' });
        const report = await reporter[fn]();
        return res.json({ ok: true, period, report });
    } catch (e) {
        return res.status(500).json({ ok: false, error: e.message });
    }
});

// Civilization runtime status
router.get('/api/admin/civilization-status', requireAppAccess, async (req, res) => {
    try {
        const civRuntime = require('../../lib/intelligence/civilization-runtime');
        const sb = require('../../lib/clients').getSupabaseClient();
        const { data: snap } = await sb.from('civilization_health_snapshots')
            .select('score,classification').order('created_at', { ascending: false }).limit(1).single().catch(() => ({ data: null }));
        res.json({ ok: true, isRunning: civRuntime.isRunning(), cycleCount: civRuntime.getCycleCount(), lastHealth: snap?.score ?? null, lastClassification: snap?.classification ?? null });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// civilization-status extended — includes last 5 cycle audit rows
router.get('/api/admin/civilization-status-v2', requireAppAccess, async (req, res) => {
    try {
        const civRuntime = require('../../lib/intelligence/civilization-runtime');
        const sb = require('../../lib/clients').getSupabaseClient();
        const [snapRes, cycleRes] = await Promise.allSettled([
            sb.from('civilization_health_snapshots').select('score,classification').order('created_at', { ascending: false }).limit(1).single(),
            sb.from('civilization_cycle_log').select('cycle_id,started_at,completed_at,health_score,phases,cycle_cost_usd').order('started_at', { ascending: false }).limit(5),
        ]);
        const snap   = snapRes.status   === 'fulfilled' ? snapRes.value.data   : null;
        const cycles = cycleRes.status  === 'fulfilled' ? (cycleRes.value.data || []) : [];
        res.json({ ok: true, isRunning: civRuntime.isRunning(), cycleCount: civRuntime.getCycleCount(), lastHealth: snap?.score ?? null, lastClassification: snap?.classification ?? null, recentCycles: cycles });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Improvement queue inspection
router.get('/api/admin/improvements/queue', requireAppAccess, async (req, res) => {
    try {
        const gov = require('../../lib/intelligence/improvement-governor');
        const [review, governance, autoQ, summary] = await Promise.all([
            gov.getPendingReview(),
            gov.getPendingGovernance(),
            gov.getPendingAutoQueue ? gov.getPendingAutoQueue() : Promise.resolve([]),
            gov.getSummary(),
        ]);
        res.json({ ok: true, review, governance, auto_queue: autoQ, summary });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Recent executive verdicts
router.get('/api/executive/verdicts', requireAppAccess, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
        const sb = require('../../lib/clients').getSupabaseClient();
        const { data, error } = await sb.from('executive_verdicts')
            .select('id,task_id,role,decision,rationale,confidence,created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        res.json({ ok: true, verdicts: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Cron execution history
router.get('/api/cron/history', requireAppAccess, async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days || '7', 10), 30);
        const since = new Date(Date.now() - days * 86_400_000).toISOString();
        const sb = require('../../lib/clients').getSupabaseClient();
        const { data, error } = await sb.from('cron_run_log')
            .select('id,job_name,started_at,duration_ms,status,error')
            .gte('started_at', since)
            .order('started_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        res.json({ ok: true, days, runs: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// Memory layer stats
router.get('/api/memory/stats', requireAppAccess, async (req, res) => {
    try {
        const sb = require('../../lib/clients').getSupabaseClient();
        const [pgMem, lessons, semantic, kg] = await Promise.allSettled([
            sb.from('memory').select('id', { count: 'exact', head: true }),
            sb.from('apex_lessons').select('id', { count: 'exact', head: true }),
            sb.from('semantic_memories').select('id', { count: 'exact', head: true }),
            sb.from('knowledge_nodes').select('id', { count: 'exact', head: true }),
        ]);
        res.json({
            ok: true,
            layers: {
                pg_memory:        pgMem.status      === 'fulfilled' ? (pgMem.value.count      || 0) : null,
                apex_lessons:     lessons.status    === 'fulfilled' ? (lessons.value.count    || 0) : null,
                semantic_memories: semantic.status  === 'fulfilled' ? (semantic.value.count  || 0) : null,
                knowledge_nodes:  kg.status         === 'fulfilled' ? (kg.value.count         || 0) : null,
            },
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

module.exports = router;
