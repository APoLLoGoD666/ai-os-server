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

// GET /api/intelligence/cost-summary — total spend and success rate
// Uses a capped recent window (last 1000 runs) to avoid full-table scans as history grows
router.get('/cost-summary', requireAppAccess, async (req, res) => {
    try {
        const { data, error } = await _sbClient()
            .from('apex_agent_runs')
            .select('success,cost_usd')
            .order('created_at', { ascending: false })
            .limit(1000);
        if (error) throw new Error(error.message);
        const total      = data.length;
        const succeeded  = data.filter(r => r.success).length;
        const totalCost  = data.reduce((s, r) => s + (r.cost_usd || 0), 0);
        res.json({
            ok: true,
            totalRuns:   total,
            successRate: total ? Math.round(succeeded / total * 100) : 0,
            totalCostUsd: totalCost.toFixed(4)
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

module.exports = router;
module.exports.voiceState = voiceState;
