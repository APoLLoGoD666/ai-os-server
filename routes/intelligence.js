"use strict";
const router   = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const requireAppAccess = require('../lib/app-auth');
const memory   = require('../agent-system/obsidian-memory');

// Singleton Supabase client
const _sbClient = (() => {
    let c;
    return () => {
        if (!c) c = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        );
        return c;
    };
})();

// ── Voice pipeline state (shared across all WebSocket sessions) ───────────────
const voiceState = {
    active:      false,
    ttsPlaying:  false,
    interrupted: false,
    sessionId:   null,
    listeners:   new Set()       // WebSocket clients listening for state changes
};

function broadcastVoiceState() {
    const payload = JSON.stringify({ type: 'voice_state', ...voiceState, listeners: undefined });
    for (const ws of voiceState.listeners) {
        try { if (ws.readyState === 1) ws.send(payload); } catch {}
    }
}

// POST /api/intelligence/interrupt — barge-in: stop TTS and clear queue
router.post('/interrupt', requireAppAccess, (req, res) => {
    voiceState.interrupted = true;
    voiceState.ttsPlaying  = false;
    broadcastVoiceState();
    setTimeout(() => { voiceState.interrupted = false; }, 3000);
    res.json({ ok: true, action: 'interrupted' });
});

// GET /api/intelligence/voice-status — current voice pipeline state
router.get('/voice-status', requireAppAccess, (req, res) => {
    res.json({ ok: true, ...voiceState, listeners: voiceState.listeners.size });
});

// POST /api/intelligence/voice-state — update state (called by voice pipeline internally)
router.post('/voice-state', requireAppAccess, (req, res) => {
    const { active, ttsPlaying, sessionId } = req.body || {};
    if (active      !== undefined) voiceState.active     = !!active;
    if (ttsPlaying  !== undefined) voiceState.ttsPlaying = !!ttsPlaying;
    if (sessionId   !== undefined) voiceState.sessionId  = sessionId;
    broadcastVoiceState();
    res.json({ ok: true });
});

// GET /api/intelligence/lessons — recent agent reflexion lessons
router.get('/lessons', requireAppAccess, (req, res) => {
    try {
        const n = Math.min(parseInt(req.query.n) || 20, 50);
        const raw = memory.getRecentLessons(n);
        const lessons = raw
            .split(/\n---\n/)
            .filter(Boolean)
            .map(s => s.trim())
            .reverse();      // newest first
        res.json({ ok: true, lessons });
    } catch (e) {
        res.json({ ok: false, error: e.message, lessons: [] });
    }
});

// GET /api/intelligence/agent-runs — recent pipeline runs from audit log
router.get('/agent-runs', requireAppAccess, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const { data, error } = await _sbClient()
            .from('apex_agent_runs')
            .select('task_id,objective,success,cost_usd,complexity,created_at')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) return res.json({ ok: false, error: error.message, runs: [] });
        res.json({ ok: true, runs: data || [] });
    } catch (e) {
        res.json({ ok: false, error: e.message, runs: [] });
    }
});

// GET /api/intelligence/cost-summary — total spend, success rate, and per-complexity breakdown
// Uses a capped recent window (last 1000 runs) to avoid full-table scans as history grows
router.get('/cost-summary', requireAppAccess, async (req, res) => {
    try {
        const { data, error } = await _sbClient()
            .from('apex_agent_runs')
            .select('success,cost_usd,complexity,created_at')
            .order('created_at', { ascending: false })
            .limit(1000);
        if (error) throw new Error(error.message);
        const total      = data.length;
        const succeeded  = data.filter(r => r.success).length;
        const totalCost  = data.reduce((s, r) => s + (r.cost_usd || 0), 0);

        // Per-complexity breakdown for learning system feedback
        const byComplexity = {};
        for (const row of data) {
            const tier = row.complexity || 'unknown';
            if (!byComplexity[tier]) byComplexity[tier] = { runs: 0, succeeded: 0, cost: 0 };
            byComplexity[tier].runs++;
            if (row.success) byComplexity[tier].succeeded++;
            byComplexity[tier].cost += row.cost_usd || 0;
        }
        for (const tier of Object.keys(byComplexity)) {
            const b = byComplexity[tier];
            b.successRate = b.runs ? Math.round(b.succeeded / b.runs * 100) : 0;
            b.avgCostUsd  = b.runs ? (b.cost / b.runs).toFixed(4) : '0.0000';
        }

        res.json({
            ok: true,
            totalRuns:    total,
            successRate:  total ? Math.round(succeeded / total * 100) : 0,
            totalCostUsd: totalCost.toFixed(4),
            byComplexity,
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/intelligence/news — structured news feed
router.get('/news', requireAppAccess, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const category = req.query.category;
        let query = _sbClient().from('apex_news_cache')
            .select('title,source,category,url,summary,published_at')
            .order('published_at', { ascending: false })
            .limit(limit);
        if (category) query = query.eq('category', category);
        const { data, error } = await query;
        if (error) return res.status(500).json({ ok: false, error: error.message, articles: [] });
        res.json({ ok: true, articles: data || [] });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message, articles: [] });
    }
});

// POST /api/intelligence/news/refresh — manually trigger news ingest
router.post('/news/refresh', requireAppAccess, async (req, res) => {
    try {
        const { ingestNews } = require('../agent-system/news-ingest');
        const count = await ingestNews();
        res.json({ ok: true, new_articles: count, message: `Ingested ${count} new articles` });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/intelligence/self-check — Phase 10 self-diagnostics
// Checks all critical subsystems and returns a health report with remediation hints
router.get('/self-check', requireAppAccess, async (req, res) => {
    const checks = {};
    const t0 = Date.now();

    // Memory
    const mem = process.memoryUsage();
    const heapPct = Math.round(mem.heapUsed / mem.heapTotal * 100);
    checks.memory = {
        ok: heapPct < 85,
        heap_pct: heapPct,
        rss_mb:   Math.round(mem.rss / 1024 / 1024),
        hint: heapPct >= 85 ? 'Heap critical — Mastra load deferred, consider restart' : null,
    };

    // Supabase
    try {
        const { data, error } = await _sbClient().from('apex_notifications').select('id').limit(1);
        checks.supabase = { ok: !error, latency_ms: Date.now() - t0, error: error?.message || null };
    } catch (e) {
        checks.supabase = { ok: false, error: e.message };
    }

    // Event bus
    const bus = require('../lib/event-bus');
    const recentEvents = bus.recent(10);
    const lastEventAge = recentEvents.length ? Date.now() - recentEvents[recentEvents.length - 1].timestamp : null;
    checks.event_bus = {
        ok: true,
        recent_events: recentEvents.length,
        last_event_age_s: lastEventAge !== null ? Math.round(lastEventAge / 1000) : null,
    };

    // Agent queue
    const agentQueue = require('../lib/agent-queue');
    const qStatus = agentQueue.status();
    checks.agent_queue = {
        ok: qStatus.queued < 40,
        ...qStatus,
        hint: qStatus.queued >= 40 ? 'Queue near capacity — check for stuck tasks' : null,
    };

    // Obsidian tunnel
    const obsidianUrl = process.env.OBSIDIAN_URL;
    if (obsidianUrl) {
        try {
            const { obsidianRead } = require('../agent-system/obsidian-client');
            const start = Date.now();
            await obsidianRead('System/Claude-Memory/MEMORY.md');
            checks.obsidian = { ok: true, latency_ms: Date.now() - start };
        } catch (e) {
            checks.obsidian = { ok: false, error: e.message, hint: 'Check OBSIDIAN_URL tunnel and Cloudflare status' };
        }
    } else {
        checks.obsidian = { ok: false, error: 'OBSIDIAN_URL not set', hint: 'Add OBSIDIAN_URL to Render env vars' };
    }

    // DB pool (pg)
    try {
        const pgPool = require('../pg_database');
        const t = Date.now();
        await pgPool.query('SELECT 1');
        checks.postgres = { ok: true, latency_ms: Date.now() - t };
    } catch (e) {
        checks.postgres = { ok: false, error: e.message };
    }

    const allOk = Object.values(checks).every(c => c.ok);
    const issues = Object.entries(checks).filter(([, c]) => !c.ok).map(([k, c]) => `${k}: ${c.error || c.hint || 'failed'}`);

    res.json({
        ok: allOk,
        status: allOk ? 'healthy' : 'degraded',
        issues,
        checks,
        latency_ms: Date.now() - t0,
        ts: new Date().toISOString(),
    });
});

module.exports = router;
module.exports.voiceState = voiceState;
module.exports.broadcastVoiceState = broadcastVoiceState;
