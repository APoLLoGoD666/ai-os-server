'use strict';
/**
 * lib/startup/index.js
 * Runs all post-listen startup tasks in the correct order.
 * Each task is non-fatal (wrapped in setImmediate or try/catch).
 *
 * Usage: require('./lib/startup').run(server, { sbAdmin, PORT, agentQueue, ... })
 */

const { _agentQueue } = require('../agent-queue');

async function run(server, { sbAdmin, PORT, ensureSetup, agentQueue, checkPendingMasterTasks, autoApproveStandardPermissions, initEmailAgent, initRoutineAgent, runReflectionCheck, runDueSchedules, agentLib, getInitMastra, setInitMastra, setMastraStatus, getMastraAgents, setMastraAgents, handleCommand, embedText, _bus }) {
    ensureSetup();

    // 1. Record deployment event
    setImmediate(async () => {
        try {
            const _deployId = process.env.RENDER_DEPLOY_ID || null;
            await sbAdmin.from('deployment_events').insert({
                deploy_id:     _deployId,
                commit_sha:    process.env.RENDER_GIT_COMMIT || null,
                build_version: process.env.npm_package_version || null,
                status:        'started',
                metadata:      { node: process.version, port: PORT, pid: process.pid },
            });
        } catch { /* non-fatal */ }
    });

    // 2. Validate required tables exist
    setImmediate(async () => {
        const required = ['memory', 'documents', 'agent_tasks', 'apex_agent_runs', 'apex_agent_stages', 'notifications', 'apex_lessons', 'cron_logs'];
        const missing = [];
        for (const table of required) {
            const { error } = await sbAdmin.from(table).select('*').limit(0);
            if (error?.code === 'PGRST205' || (error?.message || '').includes('does not exist')) missing.push(table);
        }
        if (missing.length > 0) {
            console.error('[Startup] MISSING TABLES:', missing.join(', '), '— run migrations/001_missing_tables.sql in Supabase SQL Editor');
        } else {
            console.log('[Startup] Schema OK — all required tables present');
        }
    });

    // 3. Reset adaptation_cycles stuck in 'running'
    setImmediate(async () => {
        try {
            const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            await sbAdmin.from('adaptation_cycles')
                .update({ status: 'failed', completed_at: new Date().toISOString() })
                .eq('status', 'running')
                .lt('started_at', cutoff);
            console.log('[Startup] Adaptation cycle cleanup complete');
        } catch (e) {
            console.warn('[Startup] Adaptation cycle cleanup failed (non-fatal):', e.message);
        }
    });

    // 4. Recover agent tasks left in_progress or pending
    setImmediate(async () => {
        try {
            const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
            const { _startAutoPipeline } = require('../auto-pipeline');
            const { data: stuck } = await sbAdmin.from('apex_tasks')
                .select('id, title')
                .in('status', ['in_progress', 'pending'])
                .gt('created_at', cutoff);
            if (stuck?.length) {
                console.log(`[Startup] Recovering ${stuck.length} task(s) from previous deploy`);
                for (const task of stuck) {
                    agentQueue.enqueue(task.id, () => _startAutoPipeline(task.id), { label: task.title || task.id });
                }
            }
        } catch (e) {
            console.warn('[Startup] Task recovery failed (non-fatal):', e.message);
        }
    });

    // 5. Model telemetry subscriber
    require('../models/runtime/subscriber').activate();

    // 6. Integrity crons
    require('../integrity-crons').start();

    // 7. Event consumer
    require('../event-consumer').start();

    // 8. Post-deployment governance probe (60s after startup)
    setTimeout(() => {
        require('../governance-probe').runProbe()
            .then(r => console.log(`[GovProbe] startup probe complete: ${r.score}/100 — ${r.probe_passed ? 'PASSED' : 'FAILED'}`))
            .catch(e => console.error('[GovProbe] startup probe error:', e.message));
    }, 60000);

    // 9. Mastra agents — deferred 5 min
    function _loadMastra() {
        try {
            const mem = process.memoryUsage();
            const heapPct = mem.heapUsed / mem.heapTotal;
            if (heapPct > 0.75) {
                console.warn(`[Mastra] load skipped — heap at ${(heapPct * 100).toFixed(0)}% (>75% threshold). Retry in 10 min.`);
                setTimeout(_loadMastra, 600000);
                return;
            }
            const _m = require('../../agent-system/mastra_agents');
            setInitMastra(_m.initMastra);
            setMastraStatus(_m.getMastraStatus);
            let mastraAgents = getInitMastra()(handleCommand);
            setMastraAgents(mastraAgents);
            global._mastraAgents = mastraAgents;
            console.log('[Mastra] agents initialised (deferred).');
        } catch (err) { console.error('[Mastra] INIT ERROR (deferred):', err); setTimeout(_loadMastra, 600000); }
    }
    setTimeout(_loadMastra, 300000); // 5 minutes

    // 10. Agent library — load from Supabase on startup
    setImmediate(async () => {
        try {
            const loaded = await agentLib.loadFromSupabase(sbAdmin);
            if (loaded === 0) {
                console.log('[AgentLib] No cached agents found — triggering full GitHub sync in background');
                setTimeout(() => agentLib.syncFromGitHub(sbAdmin, { obsidian: true }).catch(e => console.warn('[AgentLib] startup sync error:', e.message)), 8000);
            }
        } catch (e) { console.warn('[AgentLib] startup load error:', e.message); }
    });

    console.log('[Email] Backfill skipped — using Supabase client');

    // 11. Startup integration verification (8s delay)
    setTimeout(async () => {
        const _checkResult = [];
        try {
            const hooks = require('../../agent-system/agent-pipeline-hooks');
            const ok = ['onPipelineStart', 'onPipelineComplete', 'onPipelineFailed'].every(m => typeof hooks[m] === 'function');
            console.log(ok ? '[Boot] ✓ pipeline-hooks wired' : '[Boot] ✗ pipeline-hooks MISSING methods');
            _checkResult.push({ name: 'pipeline-hooks', ok });
        } catch (e) { console.warn('[Boot] ✗ pipeline-hooks LOAD FAILED:', e.message); _checkResult.push({ name: 'pipeline-hooks', ok: false }); }
        try {
            const reg = require('../../agent-system/agent-registry');
            const s = reg.getRegistrySummary();
            console.log(`[Boot] ✓ agent-registry: ${s.pipelineAgents} pipeline, ${s.domainAgents} domain agents`);
            _checkResult.push({ name: 'agent-registry', ok: true });
        } catch (e) { console.warn('[Boot] ✗ agent-registry FAILED:', e.message); _checkResult.push({ name: 'agent-registry', ok: false }); }
        try {
            const fs = require('fs');
            const vPath = process.env.OBSIDIAN_VAULT_PATH;
            if (!vPath) {
                console.log('[Boot] ○ vault skipped (OBSIDIAN_VAULT_PATH not set — vault features disabled)');
                _checkResult.push({ name: 'vault', ok: true });
            } else {
                const ok = fs.existsSync(vPath);
                console.log(ok ? `[Boot] ✓ vault found at ${vPath}` : `[Boot] ✗ vault NOT found at ${vPath}`);
                _checkResult.push({ name: 'vault', ok });
            }
        } catch (e) { console.warn('[Boot] ✗ vault check FAILED:', e.message); _checkResult.push({ name: 'vault', ok: false }); }
        try {
            const vec = await embedText('startup probe');
            const ok = Array.isArray(vec) && vec.length > 0;
            console.log(ok ? `[Boot] ✓ embed OK (${vec.length} dims)` : '[Boot] ✗ embed returned null — check VOYAGE_API_KEY or GOOGLE_API_KEY');
            _checkResult.push({ name: 'embed', ok });
        } catch (e) { console.warn('[Boot] ✗ embed probe FAILED:', e.message); _checkResult.push({ name: 'embed', ok: false }); }
        try {
            const orch = require('../../agent-system/orchestrator');
            const s = orch.getOrchestratorStatus();
            const ok = !s.circuitBreaker.open;
            console.log(ok ? '[Boot] ✓ orchestrator circuit-breaker closed' : `[Boot] ✗ circuit-breaker OPEN (${s.circuitBreaker.failures} failures)`);
            _checkResult.push({ name: 'orchestrator', ok });
        } catch (e) { console.warn('[Boot] ✗ orchestrator status FAILED:', e.message); _checkResult.push({ name: 'orchestrator', ok: false }); }
        try {
            const episodic = require('../../agent-system/episodic-memory');
            const count = episodic.episodeCount();
            console.log(`[Boot] ✓ episodic-memory: ${count} stored episodes`);
            _checkResult.push({ name: 'episodic', ok: true });
        } catch (e) { console.warn('[Boot] ✗ episodic-memory FAILED:', e.message); _checkResult.push({ name: 'episodic', ok: false }); }
        const passed = _checkResult.filter(r => r.ok).length;
        console.log(`[Boot] Integration verification: ${passed}/${_checkResult.length} checks passed`);
    }, 8000);

    // 12. Notion + Slack integration layer
    setImmediate(() => {
        try {
            require('../../services/init').init(require('express')(), sbAdmin);
        } catch (e) { console.warn('[Services] init failed (non-fatal):', e.message); }
    });

    // 13. Constitutional watchdog
    try {
        const _watchdog = require('../constitution/watchdog');
        _watchdog.start();
        setInterval(() => _watchdog.tick().catch(() => {}), 30 * 60 * 1000);
        console.log('[Watchdog] Constitutional watchdog started (30-min tick)');
    } catch (e) { console.warn('[Watchdog] start failed (non-fatal):', e.message); }

    // 14. apex_agent_stages migration via Management API
    setImmediate(async () => {
        const _token = process.env.SUPABASE_ACCESS_TOKEN;
        if (!_token) { console.warn('[Migration] apex_agent_stages skipped: SUPABASE_ACCESS_TOKEN not set'); return; }
        const _https = require('https');
        async function _runSQL(sql) {
            return new Promise((resolve, reject) => {
                const body = JSON.stringify({ query: sql });
                const opts = { hostname:'api.supabase.com', path:'/v1/projects/devmtexqjstappalqbeg/database/query', method:'POST', headers:{ Authorization:'Bearer '+_token, 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body) } };
                const r = _https.request(opts, res2 => { let d=''; res2.on('data',c=>d+=c); res2.on('end',()=>{ try{ const p=JSON.parse(d); if(res2.statusCode>=400) reject(new Error(JSON.stringify(p))); else resolve(p); }catch(e){reject(new Error(d));} }); }); r.on('error',reject); r.write(body); r.end();
            });
        }
        try {
            await _runSQL(`CREATE TABLE IF NOT EXISTS apex_agent_stages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), task_id TEXT NOT NULL, stage TEXT NOT NULL, success BOOLEAN DEFAULT FALSE, error TEXT, duration_ms INTEGER, attempt INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW())`);
            await _runSQL(`CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created_at ON apex_agent_stages (created_at DESC)`);
            await _runSQL(`CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_stage ON apex_agent_stages (stage)`);
            console.log('[Migration] apex_agent_stages ready');
        } catch (e) {
            console.warn('[Migration] apex_agent_stages setup (non-fatal):', e.message);
        }
    });

    // 15. PGVector match_documents function
    setImmediate(async () => {
        try {
            const pgPool = require('../pg_database');
            await pgPool.query(`
                CREATE EXTENSION IF NOT EXISTS vector;
                ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding vector(768);
                CREATE OR REPLACE FUNCTION match_documents(
                    query_embedding vector(768), match_count int DEFAULT 5
                ) RETURNS TABLE(
                    filename text, classification text, summary text,
                    content text, created_at timestamptz, similarity float
                ) LANGUAGE plpgsql AS $$
                BEGIN
                    RETURN QUERY
                    SELECT d.filename, d.classification, d.summary, d.content, d.created_at,
                           1 - (d.embedding <=> query_embedding) AS similarity
                    FROM documents d
                    WHERE d.embedding IS NOT NULL
                    ORDER BY d.embedding <=> query_embedding
                    LIMIT match_count;
                END;
                $$;
            `);
            console.log('[PGVector] match_documents function ready');
        } catch (e) {
            console.warn('[PGVector] setup skipped:', e.message);
        }
    });

    // 16. vault_embeddings table
    setImmediate(async () => {
        try {
            const pgPool = require('../pg_database');
            await pgPool.query(`
                CREATE TABLE IF NOT EXISTS vault_embeddings (
                    id BIGSERIAL PRIMARY KEY,
                    source TEXT NOT NULL,
                    chunk_hash TEXT NOT NULL,
                    chunk_text TEXT NOT NULL,
                    embedding vector(768),
                    mtime BIGINT,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    CONSTRAINT vault_embeddings_uniq UNIQUE (source, chunk_hash)
                );
                CREATE INDEX IF NOT EXISTS vault_emb_vec_idx
                    ON vault_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
            `);
            await pgPool.query(`DROP FUNCTION IF EXISTS match_vault_embeddings(vector, int);`);
            await pgPool.query(`
                CREATE OR REPLACE FUNCTION match_vault_embeddings(
                    query_embedding vector(768), match_count int DEFAULT 5
                ) RETURNS TABLE(source text, chunk_text text, mtime bigint, similarity float)
                LANGUAGE SQL STABLE AS $$
                    SELECT source, chunk_text, mtime,
                           1 - (embedding <=> query_embedding) AS similarity
                    FROM vault_embeddings
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> query_embedding
                    LIMIT match_count;
                $$;
            `);
            console.log('[PGVector] vault_embeddings table + RPC ready');
        } catch (e) {
            console.warn('[PGVector] vault_embeddings setup skipped:', e.message);
        }
    });

    // 17. apex_agent_stages table (pg pool path)
    setImmediate(async () => {
        try {
            const pgPool = require('../pg_database');
            await pgPool.query(`
                CREATE TABLE IF NOT EXISTS apex_agent_stages (
                    id BIGSERIAL PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    stage TEXT NOT NULL,
                    success BOOLEAN NOT NULL DEFAULT FALSE,
                    error TEXT,
                    duration_ms INTEGER,
                    attempt INTEGER DEFAULT 1,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS apex_agent_stages_task_id_idx ON apex_agent_stages(task_id);
                CREATE INDEX IF NOT EXISTS apex_agent_stages_stage_idx ON apex_agent_stages(stage, success);
                CREATE INDEX IF NOT EXISTS apex_agent_stages_created_at_idx ON apex_agent_stages(created_at);
            `);
            console.log('[Schema] apex_agent_stages table ready');
        } catch (e) {
            console.warn('[Schema] apex_agent_stages setup skipped:', e.message);
        }
    });

    // 18. apex_agent_runs schema migration
    setImmediate(async () => {
        try {
            const pgPool = require('../pg_database');
            await pgPool.query(`
                ALTER TABLE apex_agent_runs ADD COLUMN IF NOT EXISTS model TEXT;
                ALTER TABLE apex_agent_runs ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
                ALTER TABLE apex_agent_runs ADD COLUMN IF NOT EXISTS token_usage JSONB;
            `);
            console.log('[Migration] apex_agent_runs: duration_ms + token_usage + model columns confirmed');
        } catch (e) {
            console.warn('[Migration] apex_agent_runs schema check skipped:', e.message);
        }
    });

    console.log(`🚀 Server running on port ${PORT}`);

    require('../cron-scheduler').start();

    // 19. Auto-approve safe permissions (15s delay)
    setTimeout(() => autoApproveStandardPermissions(), 15000);

    // 20. Pipeline health monitor
    let _lastPipelineActivity = Date.now();
    setInterval(() => {
        const staleMins = (Date.now() - _lastPipelineActivity) / 60000;
        if (staleMins > 30) {
            console.warn(`[Pipeline] WARNING — no activity for ${staleMins.toFixed(0)} minutes`);
            checkPendingMasterTasks();
        }
    }, 600000);

    setInterval(checkPendingMasterTasks, 60000);
    checkPendingMasterTasks();

    // 21. Schedule fallback — run due agent schedules every 5 min
    setInterval(() => require('../cron-logger').wrapCron('schedule_fallback', () => runDueSchedules()).catch(e => console.warn('[ScheduleFallback] error:', e.message)), 5 * 60 * 1000);

    // 22. Phase 2 agents
    initEmailAgent().catch(err => console.error("EMAIL AGENT INIT ERROR:", err.message));
    initRoutineAgent().catch(err => console.error("ROUTINE AGENT INIT ERROR:", err.message));
    setInterval(() => require('../cron-logger').wrapCron('reflection_check', () => runReflectionCheck()).catch(err => console.error("REFLECTION ERROR:", err.message)), 30 * 60 * 1000);

    // 23. Mastra stub init (real load deferred 5 min via _loadMastra above)
    {
        let mastraAgents = getInitMastra()(handleCommand);
        setMastraAgents(mastraAgents);
        global._mastraAgents = mastraAgents;
    }

    // 24. Ruflo daemon (10 min delay)
    setTimeout(() => {
        try {
            const { spawn: rfSpawnDaemon } = require('child_process');
            rfSpawnDaemon(process.execPath, [
                'node_modules/ruflo/bin/ruflo.js', 'daemon', 'start'
            ], { detached: true, stdio: 'ignore' }).unref();
            console.log('[Ruflo] daemon started (deferred 10 min)');
        } catch (err) {
            console.warn('[Ruflo] daemon start failed (non-fatal):', err.message);
        }
    }, 600000);
}

module.exports = { run };
