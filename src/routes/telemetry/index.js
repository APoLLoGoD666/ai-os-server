'use strict';

const express = require('express');

module.exports = function makeTelemetryRouter({ requireAppAccess, getStatus, errBuffer, gitSha }) {
    const router = express.Router();
    const sbAdmin = require('../../../lib/clients').getSupabaseClient();

    router.get('/health', async (req, res) => {
        let dbOk = false;
        try {
            if (process.env.LOCAL_MODE === 'true') {
                const { error } = await sbAdmin.from('notifications').select('id').limit(1);
                dbOk = !error;
            } else {
                try {
                    const pgPool = require('../../../lib/pg_database');
                    await pgPool.query('SELECT 1');
                    dbOk = true;
                } catch {
                    const { error } = await sbAdmin.from('notifications').select('id').limit(1);
                    dbOk = !error;
                }
            }
        } catch (e) { console.warn('[Health] db check error:', e.message); }
        const mem    = process.memoryUsage();
        const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
        const rssM   = Math.round(mem.rss       / 1024 / 1024);
        const ttsOk  = !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
        const aiOk   = !!process.env.ANTHROPIC_API_KEY;
        const allOk  = dbOk && ttsOk && aiOk;
        const status = allOk ? 'ok' : (dbOk ? 'degraded' : 'down');
        res.status(200).json({
            status,
            version:        gitSha,
            uptime:         process.uptime(),
            timestamp:      Date.now(),
            db:             dbOk,
            tts:            ttsOk,
            ai:             aiOk,
            memory:         { heapMb, rssMb: rssM, warning: heapMb > 150, heapLimit: 220 },
            mastra:         getStatus(),
            ws:             global._apexWsCount || 0,
            sentry:         !!process.env.SENTRY_DSN,
            correlationIds: true,
            recentErrors:   errBuffer.slice(-3)
        });
    });

    router.get('/api/system/health/detailed', requireAppAccess, async (req, res) => {
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

        const mem = process.memoryUsage();
        result.memory = {
            heapMb:    Math.round(mem.heapUsed / 1024 / 1024),
            rssMb:     Math.round(mem.rss      / 1024 / 1024),
            warning:   Math.round(mem.heapUsed / 1024 / 1024) > 150,
            heapLimit: 220,
        };

        await (async () => {
            const t = Date.now();
            try {
                const pgPool = require('../../../lib/pg_database');
                await pgPool.query('SELECT 1');
                result.db = { ok: true, latencyMs: Date.now() - t };
            } catch (e) {
                result.db = { ok: false, error: e.message };
            }
        })();

        await (async () => {
            try {
                const { error } = await sbAdmin.from('notifications').select('id').limit(1);
                result.supabase = { ok: !error, error: error?.message };
            } catch (e) { result.supabase = { ok: false, error: e.message }; }
        })();

        try {
            const intel = require('../../../routes/intelligence');
            const vs = intel.voiceState;
            result.voice = { active: vs.active, sessionId: vs.sessionId, ttsPlaying: vs.ttsPlaying, listeners: vs.listeners.size };
        } catch { result.voice = { active: false }; }

        try { result.agentQueue = require('../../../lib/agent-queue').status(); } catch {}
        try { result.agents = require('../../../agent-system/agent-library').status(); } catch {}

        try {
            const vaultPath = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
            const fs = require('fs');
            result.obsidian = { ok: fs.existsSync(vaultPath), path: vaultPath };
        } catch {}

        try {
            const trackerStats = require('../../../lib/latency-tracker').stats();
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

    router.get('/api/ping', (req, res) => {
        res.json({ ok: true, ts: Date.now(), mastra: getStatus() });
    });

    router.get('/api/deploy-probe', (req, res) => res.json({ v: '8a352e0-probe', ts: Date.now() }));

    router.get('/api/intelligence/agent-runs', requireAppAccess, async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const { data } = await sbAdmin.from('apex_agent_runs')
                .select('*').order('created_at', { ascending: false }).limit(limit);
            res.json({ ok: true, runs: data || [] });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.get('/api/intelligence/cost-summary', requireAppAccess, async (req, res) => {
        try {
            const { data } = await sbAdmin.from('apex_agent_runs').select('cost_usd,model').limit(1000);
            const total = (data || []).reduce((s, r) => s + (r.cost_usd || 0), 0);
            const byModel = {};
            for (const r of (data || [])) {
                if (r.model) byModel[r.model] = ((byModel[r.model] || 0) + (r.cost_usd || 0));
            }
            res.json({ ok: true, total_cost_usd: total.toFixed(4), by_model: byModel });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.get('/api/intelligence/lessons', requireAppAccess, async (req, res) => {
        try {
            const n = parseInt(req.query.n) || 8;
            const { data } = await sbAdmin.from('apex_lessons')
                .select('*').order('created_at', { ascending: false }).limit(n);
            res.json({ ok: true, lessons: data || [] });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.get('/api/intelligence/self-check', requireAppAccess, async (req, res) => {
        const checks = {};
        const t0 = Date.now();
        const mem    = process.memoryUsage();
        const rssMb  = Math.round(mem.rss / 1024 / 1024);
        const CONTAINER_MB = parseInt(process.env.CONTAINER_MEMORY_MB || '512', 10);
        const rssPct = Math.round(rssMb / CONTAINER_MB * 100);
        checks.memory = { ok: rssPct < 85, rss_mb: rssMb, rss_pct: rssPct, heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024), container_mb: CONTAINER_MB, hint: rssPct >= 85 ? `RSS ${rssMb} MB exceeds 85% of ${CONTAINER_MB} MB container — consider restart` : null };
        try {
            const { data, error } = await sbAdmin.from('apex_notifications').select('id').limit(1);
            checks.supabase = { ok: !error, latency_ms: Date.now() - t0, error: error?.message || null };
        } catch (e) { checks.supabase = { ok: false, error: e.message }; }
        try {
            const bus = require('../../../lib/event-bus');
            const ev = bus.recent(10);
            const age = ev.length ? Date.now() - ev[ev.length - 1].timestamp : null;
            checks.event_bus = { ok: true, recent_events: ev.length, last_event_age_s: age !== null ? Math.round(age / 1000) : null };
        } catch (e) { checks.event_bus = { ok: false, error: e.message }; }
        try {
            const aq = require('../../../lib/agent-queue'); const qs = aq.status();
            checks.agent_queue = { ok: qs.queued < 40, ...qs, hint: qs.queued >= 40 ? 'Queue near capacity' : null };
        } catch (e) { checks.agent_queue = { ok: false, error: e.message }; }
        if (process.env.OBSIDIAN_URL) {
            try {
                const { obsidianRead } = require('../../../agent-system/obsidian-client');
                const s = Date.now(); await obsidianRead('System/Claude-Memory/MEMORY.md');
                checks.obsidian = { ok: true, latency_ms: Date.now() - s };
            } catch (e) { checks.obsidian = { ok: false, error: e.message, hint: 'Check OBSIDIAN_URL tunnel' }; }
        } else { checks.obsidian = { ok: false, error: 'OBSIDIAN_URL not set', hint: 'Add OBSIDIAN_URL to Render env vars' }; }
        const _scDbUrl = process.env.DATABASE_URL || '';
        if (!_scDbUrl || _scDbUrl.includes('YOUR-PASSWORD')) {
            checks.postgres = { ok: false, error: 'DATABASE_URL not configured', hint: 'Add real DATABASE_URL to Render env vars (Supabase dashboard > Settings > Database)' };
        } else {
            try {
                const pgPool = require('../../../lib/pg_database'); const pt = Date.now();
                await pgPool.query('SELECT 1'); checks.postgres = { ok: true, latency_ms: Date.now() - pt };
            } catch (e) { checks.postgres = { ok: false, error: e.message || 'connection failed', hint: 'Verify DATABASE_URL in Render env vars' }; }
        }
        try {
            const { retrieveContext } = require('../../../agent-system/langchain-rag');
            const [rp, vc] = await Promise.allSettled([
                retrieveContext('health check ping', 1),
                sbAdmin ? sbAdmin.from('vault_embeddings').select('id', { count: 'exact', head: true }) : Promise.resolve(null),
            ]);
            checks.rag = { ok: true, vault_reachable: rp.status === 'fulfilled', vector_chunks: vc.value?.count ?? null, hint: vc.value?.count === 0 ? 'vault_embeddings empty' : null };
        } catch (e) { checks.rag = { ok: false, error: e.message }; }
        if (process.env.NOTION_API_KEY) {
            try {
                const t = Date.now(); const r = await fetch('https://api.notion.com/v1/users/me', { headers: { Authorization: `Bearer ${process.env.NOTION_API_KEY}`, 'Notion-Version': '2022-06-28' }, signal: AbortSignal.timeout(5000) });
                checks.notion = { ok: r.ok, latency_ms: Date.now() - t, status: r.status };
            } catch (e) { checks.notion = { ok: false, error: e.message }; }
        } else { checks.notion = { ok: false, error: 'NOTION_API_KEY not set' }; }
        if (process.env.SLACK_BOT_TOKEN) {
            try {
                const t = Date.now(); const r = await fetch('https://slack.com/api/auth.test', { method: 'POST', headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) });
                const b = await r.json(); checks.slack = { ok: !!b.ok, latency_ms: Date.now() - t, team: b.team || null, error: b.error || null };
            } catch (e) { checks.slack = { ok: false, error: e.message }; }
        } else { checks.slack = { ok: false, error: 'SLACK_BOT_TOKEN not set' }; }
        checks.sentry = { ok: !!process.env.SENTRY_DSN, dsn_set: !!process.env.SENTRY_DSN, hint: !process.env.SENTRY_DSN ? 'Set SENTRY_DSN env var' : null };
        const allOk = Object.values(checks).every(c => c.ok);
        const total = Object.keys(checks).length;
        const passed = Object.values(checks).filter(c => c.ok).length;
        res.json({ ok: allOk, status: allOk ? 'healthy' : 'degraded', score: `${Math.round(passed / total * 100)}%`, issues: Object.entries(checks).filter(([, c]) => !c.ok).map(([k, c]) => `${k}: ${c.error || c.hint || 'failed'}`), checks, latency_ms: Date.now() - t0, ts: new Date().toISOString() });
    });

    router.get('/api/cost/today', requireAppAccess, async (req, res) => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await sbAdmin.from('apex_agent_runs')
                .select('cost_usd').gte('created_at', today);
            const total = (data || []).reduce((s, r) => s + (r.cost_usd || 0), 0);
            res.json({ ok: true, cost_usd: total.toFixed(4), date: today });
        } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    router.get('/api/latency-stats', requireAppAccess, (req, res) => {
        res.json({ ok: true, ...(require('../../../lib/latency-tracker').stats()) });
    });

    router.get('/api/latency-traces', requireAppAccess, (req, res) => {
        const t = require('../../../lib/latency-tracker');
        res.json({ ok: true, sessions: t.getSessions(50), active: t.getActive() });
    });

    router.get('/api/timeline', requireAppAccess, async (req, res) => {
        try {
            const { data } = await sbAdmin.from('apex_timeline')
                .select('*').order('completed_at', { ascending: false }).limit(20);
            res.json({ ok: true, timeline: (data || []).map(r => ({
                taskId:       r.task_id,
                objective:    r.objective,
                commitHash:   r.commit_hash,
                filesChanged: r.files_changed,
                duration:     r.duration,
                completedAt:  r.completed_at,
                agentLogs:    r.agent_logs,
                success:      r.success,
                error:        r.error
            })) });
        } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
    });

    return router;
};
