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
router.post('/intelligence/interrupt', requireAppAccess, (req, res) => {
    voiceState.interrupted = true;
    voiceState.ttsPlaying  = false;
    broadcastVoiceState();
    setTimeout(() => { voiceState.interrupted = false; }, 3000);
    res.json({ ok: true, action: 'interrupted' });
});

// GET /api/intelligence/voice-status — current voice pipeline state
router.get('/intelligence/voice-status', requireAppAccess, (req, res) => {
    res.json({ ok: true, ...voiceState, listeners: voiceState.listeners.size });
});

// POST /api/intelligence/voice-state — update state (called by voice pipeline internally)
router.post('/intelligence/voice-state', requireAppAccess, (req, res) => {
    const { active, ttsPlaying, sessionId } = req.body || {};
    if (active      !== undefined) voiceState.active     = !!active;
    if (ttsPlaying  !== undefined) voiceState.ttsPlaying = !!ttsPlaying;
    if (sessionId   !== undefined) voiceState.sessionId  = sessionId;
    broadcastVoiceState();
    res.json({ ok: true });
});

// GET /api/intelligence/lessons — recent agent reflexion lessons
router.get('/intelligence/lessons', requireAppAccess, (req, res) => {
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
router.get('/intelligence/agent-runs', requireAppAccess, async (req, res) => {
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
router.get('/intelligence/cost-summary', requireAppAccess, async (req, res) => {
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
router.get('/intelligence/news', requireAppAccess, async (req, res) => {
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
router.post('/intelligence/news/refresh', requireAppAccess, async (req, res) => {
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
router.get('/intelligence/self-check', requireAppAccess, async (req, res) => {
    const checks = {};
    const t0 = Date.now();

    // Memory — use RSS vs container limit (512 MB on Render Starter).
    // heapUsed/heapTotal is misleading: V8 starts with a small heapTotal and expands
    // it dynamically, producing 90%+ readings even on a healthy server.
    const mem    = process.memoryUsage();
    const rssMb  = Math.round(mem.rss / 1024 / 1024);
    const CONTAINER_MB = parseInt(process.env.CONTAINER_MEMORY_MB || '512', 10);
    const rssPct = Math.round(rssMb / CONTAINER_MB * 100);
    checks.memory = {
        ok:           rssPct < 85,
        rss_mb:       rssMb,
        rss_pct:      rssPct,
        heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
        container_mb: CONTAINER_MB,
        hint: rssPct >= 85 ? `RSS ${rssMb} MB exceeds 85% of ${CONTAINER_MB} MB container — consider restart` : null,
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

    // DB pool (pg) — uses DATABASE_URL; degrades gracefully if not configured
    const _dbUrl = process.env.DATABASE_URL || '';
    const _dbPlaceholder = !_dbUrl || _dbUrl.includes('YOUR-PASSWORD') || _dbUrl.includes('%5BYOUR-PASSWORD%5D');
    if (_dbPlaceholder) {
        checks.postgres = { ok: false, error: 'DATABASE_URL not configured', hint: 'Add real DATABASE_URL to Render env vars (get from Supabase dashboard > Settings > Database)' };
    } else {
        try {
            const pgPool = require('../lib/pg_database');
            const t = Date.now();
            await pgPool.query('SELECT 1');
            checks.postgres = { ok: true, latency_ms: Date.now() - t };
        } catch (e) {
            checks.postgres = { ok: false, error: e.message || 'connection failed', hint: 'Add real DATABASE_URL to Render env vars (Supabase dashboard > Settings > Database)' };
        }
    }

    // RAG system — vault chunk count + vector index size
    try {
        const { retrieveContext } = require('../agent-system/langchain-rag');
        const ragSb = _sbClient();
        const [ragPing, vecCount] = await Promise.allSettled([
            retrieveContext('health check ping', 1),
            ragSb ? ragSb.from('vault_embeddings').select('id', { count: 'exact', head: true }) : Promise.resolve(null),
        ]);
        checks.rag = {
            ok: true,
            vault_reachable: ragPing.status === 'fulfilled',
            vector_chunks: vecCount.value?.count ?? null,
            hint: vecCount.value?.count === 0 ? 'vault_embeddings empty — run local index to populate' : null,
        };
    } catch (e) {
        checks.rag = { ok: false, error: e.message };
    }

    // Notion API
    if (process.env.NOTION_API_KEY) {
        try {
            const t = Date.now();
            const resp = await fetch('https://api.notion.com/v1/users/me', {
                headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2022-06-28' },
                signal: AbortSignal.timeout(5000),
            });
            checks.notion = { ok: resp.ok, latency_ms: Date.now() - t, status: resp.status };
        } catch (e) {
            checks.notion = { ok: false, error: e.message };
        }
    } else {
        checks.notion = { ok: false, error: 'NOTION_API_KEY not set' };
    }

    // Slack (check bot token validity via auth.test)
    if (process.env.SLACK_BOT_TOKEN) {
        try {
            const t = Date.now();
            const resp = await fetch('https://slack.com/api/auth.test', {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000),
            });
            const body = await resp.json();
            checks.slack = { ok: !!body.ok, latency_ms: Date.now() - t, team: body.team || null, error: body.error || null };
        } catch (e) {
            checks.slack = { ok: false, error: e.message };
        }
    } else {
        checks.slack = { ok: false, error: 'SLACK_BOT_TOKEN not set' };
    }

    // Sentry (verify DSN is set — SDK initialised at startup)
    checks.sentry = {
        ok: !!process.env.SENTRY_DSN,
        dsn_set: !!process.env.SENTRY_DSN,
        hint: !process.env.SENTRY_DSN ? 'Set SENTRY_DSN env var' : null,
    };

    const allOk = Object.values(checks).every(c => c.ok);
    const issues = Object.entries(checks).filter(([, c]) => !c.ok).map(([k, c]) => `${k}: ${c.error || c.hint || 'failed'}`);

    // Health score: percentage of subsystems passing
    const total  = Object.keys(checks).length;
    const passed = Object.values(checks).filter(c => c.ok).length;
    const score  = Math.round((passed / total) * 100);

    res.json({
        ok: allOk,
        status: allOk ? 'healthy' : 'degraded',
        score: `${score}%`,
        issues,
        checks,
        latency_ms: Date.now() - t0,
        ts: new Date().toISOString(),
    });
});

// GET /api/intelligence/agent-performance — per-role breakdown from apex_agent_stages
router.get('/intelligence/agent-performance', requireAppAccess, async (req, res) => {
    try {
        const days  = Math.min(parseInt(req.query.days) || 30, 90);
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const sb    = _sbClient();

        const [stagesRes, runsRes] = await Promise.all([
            sb.from('apex_agent_stages')
              .select('stage,success,error,duration_ms,created_at')
              .gte('created_at', since)
              .limit(5000),
            sb.from('apex_agent_runs')
              .select('success,cost_usd,complexity,duration_ms,created_at')
              .gte('created_at', since)
              .limit(1000),
        ]);

        // Tolerate missing tables (schema migration requires pg direct connection)
        const stagesData = stagesRes.error ? [] : (stagesRes.data || []);
        const runsData   = runsRes.error   ? [] : (runsRes.data   || []);
        const warnings   = [];
        if (stagesRes.error) warnings.push(`apex_agent_stages: ${stagesRes.error.message}`);
        if (runsRes.error)   warnings.push(`apex_agent_runs: ${runsRes.error.message}`);

        // Per-role stats from stages
        const byRole = {};
        for (const s of stagesData) {
            const r = byRole[s.stage] || (byRole[s.stage] = { runs: 0, succeeded: 0, failed: 0, totalDurationMs: 0, errors: {} });
            r.runs++;
            if (s.success) r.succeeded++; else r.failed++;
            if (s.duration_ms) r.totalDurationMs += s.duration_ms;
            if (!s.success && s.error) {
                const key = s.error.slice(0, 80);
                r.errors[key] = (r.errors[key] || 0) + 1;
            }
        }
        for (const r of Object.values(byRole)) {
            r.successRate  = r.runs ? Math.round(r.succeeded / r.runs * 100) : 0;
            r.avgDurationMs = r.runs ? Math.round(r.totalDurationMs / r.runs) : 0;
            r.topErrors    = Object.entries(r.errors).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e, n]) => ({ error: e, count: n }));
            delete r.errors; delete r.totalDurationMs;
        }

        // Pipeline-level stats from runs
        const runs = runsData;
        const pipeline = {
            total:       runs.length,
            succeeded:   runs.filter(r => r.success).length,
            successRate: runs.length ? Math.round(runs.filter(r => r.success).length / runs.length * 100) : 0,
            totalCostUsd: runs.reduce((s, r) => s + (r.cost_usd || 0), 0).toFixed(4),
            avgDurationMs: runs.length ? Math.round(runs.reduce((s, r) => s + (r.duration_ms || 0), 0) / runs.length) : 0,
            byComplexity: {},
        };
        for (const r of runs) {
            const t = r.complexity || 'unknown';
            if (!pipeline.byComplexity[t]) pipeline.byComplexity[t] = { runs: 0, succeeded: 0 };
            pipeline.byComplexity[t].runs++;
            if (r.success) pipeline.byComplexity[t].succeeded++;
        }
        for (const t of Object.keys(pipeline.byComplexity)) {
            const b = pipeline.byComplexity[t];
            b.successRate = b.runs ? Math.round(b.succeeded / b.runs * 100) : 0;
        }

        res.json({ ok: true, days, pipeline, byRole, ...(warnings.length ? { warnings } : {}) });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/intelligence/performance — latency stats and external dependency timings
router.get('/intelligence/performance', requireAppAccess, async (req, res) => {
    try {
        const tracker = require('../lib/latency-tracker');
        const stats   = tracker.stats();
        const ov      = stats.overall || {};

        // Measure live external dependency latencies
        const t0 = Date.now();
        const [sbPing, notionPing, slackPing] = await Promise.allSettled([
            _sbClient().from('apex_notifications').select('id').limit(1),
            process.env.NOTION_API_KEY
                ? fetch('https://api.notion.com/v1/users/me', {
                    headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2022-06-28' },
                    signal: AbortSignal.timeout(5000),
                })
                : Promise.reject(new Error('not configured')),
            process.env.SLACK_BOT_TOKEN
                ? fetch('https://slack.com/api/auth.test', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(5000),
                })
                : Promise.reject(new Error('not configured')),
        ]);

        res.json({
            ok: true,
            ts: new Date().toISOString(),
            voice: {
                total_sessions:   stats.total_sessions,
                active:           stats.active_voice_sessions,
                ack_p50_ms:       ov.ack_latency?.p50      ?? null,
                ack_p95_ms:       ov.ack_latency?.p95      ?? null,
                meaningful_p50_ms: ov.meaningful_latency?.p50 ?? null,
                meaningful_p95_ms: ov.meaningful_latency?.p95 ?? null,
                completion_p50_ms: ov.completion_latency?.p50 ?? null,
                completion_p95_ms: ov.completion_latency?.p95 ?? null,
                abandonment_rate: stats.abandonment_rate ?? null,
            },
            dependencies: {
                supabase_ms: sbPing.status === 'fulfilled' ? Date.now() - t0 : null,
                notion_ms:   notionPing.status === 'fulfilled' ? notionPing.value.status !== undefined ? (Date.now() - t0 - (slackPing.status !== 'pending' ? 0 : 0)) : null : null,
                slack_ms:    slackPing.status === 'fulfilled' ? (slackPing.value.ok !== undefined ? Date.now() - t0 : null) : null,
            },
            memory: {
                rss_mb:  Math.round(process.memoryUsage().rss / 1024 / 1024),
                heap_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                uptime_s: Math.round(process.uptime()),
            },
        });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// GET /api/intelligence/system-status — unified diagnostics across all subsystems
router.get('/intelligence/system-status', requireAppAccess, async (req, res) => {
    const t0 = Date.now();
    const result = {};

    // ── Knowledge / RAG ───────────────────────────────────────────────────────
    try {
        const rag = require('../agent-system/langchain-rag');
        result.retrieval = rag.getStats();
        result.knowledge = {
            ok:            result.retrieval.chunksInMemory > 0,
            chunksInMemory: result.retrieval.chunksInMemory,
            lastIndexedAt:  result.retrieval.lastIndexedAt,
            vectorEnabled:  result.retrieval.vectorEnabled,
            embedErrors:    result.retrieval.embedErrors,
        };
    } catch (e) {
        result.knowledge = { ok: false, error: e.message };
        result.retrieval = { error: e.message };
    }

    // ── Agent registry ────────────────────────────────────────────────────────
    try {
        const registry = require('../agent-system/agent-registry');
        result.agents = registry.getRegistrySummary();
        result.agents.ok = true;
    } catch (e) {
        result.agents = { ok: false, error: e.message };
    }

    // ── Reputation / performance ──────────────────────────────────────────────
    try {
        const reputation = require('../agent-system/agent-reputation');
        const perf = await reputation.getPerformanceSummary();
        result.reputation = {
            ok:       true,
            pipeline: Object.keys(perf.pipeline).length > 0 ? perf.pipeline : null,
            scores:   perf.scores,
        };
    } catch (e) {
        result.reputation = { ok: false, error: e.message };
    }

    // ── Memory / Obsidian ─────────────────────────────────────────────────────
    try {
        const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
        const obsidianUrl = process.env.OBSIDIAN_URL;
        const fs = require('fs');
        const vaultFound = !!vaultPath && fs.existsSync(vaultPath);
        result.memory = {
            ok:          vaultFound || !!obsidianUrl,
            vaultPath:   vaultPath ? '[set]' : null,
            vaultFound,
            tunnelMode:  !!obsidianUrl && !vaultFound,
        };
    } catch (e) {
        result.memory = { ok: false, error: e.message };
    }

    // ── Orchestration (circuit breaker) ──────────────────────────────────────
    try {
        const orch = require('../agent-system/orchestrator');
        result.orchestration = { ok: true, ...orch.getOrchestratorStatus() };
    } catch (e) {
        result.orchestration = { ok: false, error: e.message };
    }

    // ── Pipeline hooks ────────────────────────────────────────────────────────
    try {
        const hooks = require('../agent-system/agent-pipeline-hooks');
        result.hooks = {
            ok:        typeof hooks.onPipelineStart === 'function',
            methods:   ['onPipelineStart', 'onPipelineComplete', 'onPipelineFailed']
                       .filter(m => typeof hooks[m] === 'function'),
        };
    } catch (e) {
        result.hooks = { ok: false, error: e.message };
    }

    // ── Episodic memory ───────────────────────────────────────────────────────
    try {
        const epMem    = require('../lib/memory/episodic-memory-pg');
        const epStats  = await epMem.getStats().catch(() => null);
        result.episodic = {
            ok:           true,
            episodeCount: epStats?.total ?? null,
            successRate:  epStats?.successRate ?? await epMem.getSuccessRate(50).catch(() => null),
        };
    } catch (e) {
        result.episodic = { ok: false, error: e.message };
    }

    const allOk = Object.values(result).every(v => v && v.ok !== false);
    res.json({
        ok:        allOk,
        status:    allOk ? 'integrated' : 'degraded',
        latency_ms: Date.now() - t0,
        ts:        new Date().toISOString(),
        knowledge:     result.knowledge,
        agents:        result.agents,
        memory:        result.memory,
        reputation:    result.reputation,
        retrieval:     result.retrieval,
        orchestration: result.orchestration,
        hooks:         result.hooks,
        episodic:      result.episodic,
    });
});

module.exports = router;
module.exports.voiceState = voiceState;
module.exports.broadcastVoiceState = broadcastVoiceState;
