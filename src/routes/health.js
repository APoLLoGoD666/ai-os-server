'use strict';
const router = require('express').Router();
const { kernelChain } = require('../../lib/kernel');
const { requireAppAccess } = require('../../lib/middleware');
const { GIT_SHA, getMastraStatus, _errBuffer } = require('../../lib/server-state');
const _gateway = require('../../lib/memory/gateway');
const _agentQueue = require('../../lib/agent-queue');
const sbAdmin = require('../../lib/clients').getSupabaseClient();

router.get('/health', async (req, res) => {
    // Retry DB check once (500 ms gap) before declaring down — guards transient glitches
    // at deploy time so a brief Supabase hiccup doesn't block a valid Render deploy.
    let dbOk = false;
    for (let attempt = 0; attempt < 2 && !dbOk; attempt++) {
        try {
            if (process.env.LOCAL_MODE === 'true') {
                const { error } = await sbAdmin.from('notifications').select('id').limit(1);
                dbOk = !error;
            } else {
                try {
                    const pgPool = require('../../lib/pg_database');
                    await pgPool.query('SELECT 1');
                    dbOk = true;
                } catch {
                    const { error } = await sbAdmin.from('notifications').select('id').limit(1);
                    dbOk = !error;
                }
            }
        } catch (e) { console.warn('[Health] db check error:', e.message); }
        if (!dbOk && attempt === 0) await new Promise(r => setTimeout(r, 500));
    }
    const mem     = process.memoryUsage();
    const heapMb  = Math.round(mem.heapUsed  / 1024 / 1024);
    const rssM    = Math.round(mem.rss        / 1024 / 1024);
    const ttsOk   = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
    const aiOk    = !!process.env.ANTHROPIC_API_KEY;
    const allOk   = dbOk && ttsOk && aiOk;
    const status  = allOk ? 'ok' : (dbOk ? 'degraded' : 'down');
    // 503 when DB is persistently down: Render stops routing traffic and monitoring fires.
    // Degraded (DB up, TTS/AI env vars missing) stays 200 — core pipeline still works.
    if (!dbOk) {
        setImmediate(async () => {
            try {
                const { alertCritical } = require('../../services/slack/slack-alerts');
                await alertCritical('Database Unavailable', 'Health check: DB unreachable after retry', 'HealthCheck');
            } catch {}
        });
    }
    res.status(dbOk ? 200 : 503).json({
        status,
        version:        GIT_SHA,
        uptime:         process.uptime(),
        timestamp:      Date.now(),
        db:             dbOk,
        tts:            ttsOk,
        ai:             aiOk,
        memory:         { heapMb, rssMb: rssM, warning: heapMb > 150, heapLimit: 220 },
        mastra:         getMastraStatus(),
        ws:             global._apexWsCount || 0,
        sentry:         !!process.env.SENTRY_DSN,
        correlationIds: true,
        recentErrors:   _errBuffer.slice(-3)
    });
});

router.get('/health/deep', requireAppAccess, async (req, res) => {
    const components = {};
    await Promise.allSettled([
        (async () => {
            try { await sbAdmin.from('apex_notifications').select('id').limit(1); components.supabase = { ok: true }; }
            catch (e) { components.supabase = { ok: false, error: e.message }; }
        })(),
        (async () => {
            try { await _gateway.getContext({ tokenBudget: 100, requestingEntity: 'health_check' }); components.gateway = { ok: true }; }
            catch (e) { components.gateway = { ok: false, error: e.message }; }
        })(),
        (async () => {
            try {
                const civ = require('../../lib/intelligence/civilization-runtime');
                components.civilization = { ok: true, isRunning: civ.isRunning(), cycleCount: civ.getCycleCount() };
            } catch (e) { components.civilization = { ok: false, error: e.message }; }
        })(),
    ]);
    const ok = Object.values(components).every(c => c.ok);
    return res.status(ok ? 200 : 503).json({ ok, components, checkedAt: new Date().toISOString() });
});

// GET /api/system/health/detailed — unified observability snapshot
router.get('/api/system/health/detailed', ...kernelChain, async (req, res) => {
    const t0 = Date.now();
    const result = {
        timestamp:  Date.now(),
        uptime:     process.uptime(),
        memory:     null,
        db:         { ok: false, latencyMs: null },
        supabase:   { ok: false },
        voice:      null,
        agentQueue: null,
        agents:     null,
        obsidian:   { ok: false },
        latency:    null,
    };

    // Memory
    const mem = process.memoryUsage();
    result.memory = {
        heapMb:  Math.round(mem.heapUsed  / 1024 / 1024),
        rssMb:   Math.round(mem.rss       / 1024 / 1024),
        warning: Math.round(mem.heapUsed  / 1024 / 1024) > 150,
        heapLimit: 220,
    };

    // DB (pg pool)
    await (async () => {
        const t = Date.now();
        try {
            const pgPool = require('../../lib/pg_database');
            await pgPool.query('SELECT 1');
            result.db = { ok: true, latencyMs: Date.now() - t };
        } catch (e) {
            result.db = { ok: false, error: e.message };
        }
    })();

    // Supabase
    await (async () => {
        try {
            const { error } = await sbAdmin.from('notifications').select('id').limit(1);
            result.supabase = { ok: !error, error: error?.message };
        } catch (e) { result.supabase = { ok: false, error: e.message }; }
    })();

    // Voice state — intel loaded at top level (L1: moved from inline require)
    try {
        const intel = require('../../routes/intelligence');
        const vs = intel.voiceState;
        result.voice = { active: vs.active, sessionId: vs.sessionId, ttsPlaying: vs.ttsPlaying, listeners: vs.listeners.size };
    } catch { result.voice = { active: false }; }

    // Agent queue
    try { result.agentQueue = _agentQueue.status(); } catch {}

    // Agent library
    try { result.agents = require('../../agent-system/agent-library').status(); } catch {}

    // Obsidian vault reachability
    try {
        const vaultPath = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
        const fs = require('fs');
        result.obsidian = { ok: fs.existsSync(vaultPath), path: vaultPath };
    } catch {}

    // Latency tracker stats
    try {
        const trackerStats = require('../../lib/latency-tracker').stats();
        const ov = trackerStats.overall;
        result.latency = {
            total_sessions:   trackerStats.total_sessions,
            active:           trackerStats.active_voice_sessions,
            ack_p50:          ov?.ack_latency?.p50         ?? null,
            ack_p95:          ov?.ack_latency?.p95         ?? null,
            meaningful_p50:   ov?.meaningful_latency?.p50  ?? null,
            meaningful_p95:   ov?.meaningful_latency?.p95  ?? null,
            completion_p50:   ov?.completion_latency?.p50  ?? null,
            completion_p95:   ov?.completion_latency?.p95  ?? null,
            abandonment_rate: trackerStats.abandonment_rate,
        };
    } catch {}

    const allOk = result.db.ok && result.supabase.ok;
    res.status(allOk ? 200 : 503).json({ ok: allOk, probe_ms: Date.now() - t0, ...result });
});

module.exports = router;
