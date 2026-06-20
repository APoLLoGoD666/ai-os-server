'use strict';

// services/init.js — called from server.listen callback
// Validates service availability, logs startup status, wires event-bus hooks for Slack/Notion

const { createClient } = require('@supabase/supabase-js');

let _initialized = false;

// Lazy Supabase client for event persistence — created once on first use
let _sbEvents = null;
function _getEventsSb() {
    if (!_sbEvents && process.env.SUPABASE_URL) {
        _sbEvents = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
    }
    return _sbEvents;
}

function init(app, sbAdmin) {
    if (_initialized) return;
    _initialized = true;

    const hasNotion = !!process.env.NOTION_API_KEY;
    const hasSlack  = !!process.env.SLACK_BOT_TOKEN;

    // Run life-domain table migration on every startup — idempotent
    setImmediate(() => {
        try {
            require('../lib/db-migrate').runLifeDomainMigration().catch(e => console.warn('[Services] db-migrate error:', e.message));
        } catch (e) { console.warn('[Services] db-migrate load error:', e.message); }
    });

    console.log(`[Services] Notion: ${hasNotion ? '✅' : '⚠️  NOTION_API_KEY not set'}`);
    console.log(`[Services] Slack:  ${hasSlack  ? '✅' : '⚠️  SLACK_BOT_TOKEN not set'}`);

    if (!hasNotion && !hasSlack) {
        console.log('[Services] No integration tokens — Notion+Slack disabled. Add NOTION_API_KEY and SLACK_BOT_TOKEN to Render env vars.');
        return;
    }

    // Wire event-bus hooks for existing pipeline events
    try {
        const bus = require('../lib/event-bus');

        // Agent run events → Slack + Notion
        // Note: event-bus wraps payload as { type, session_id, timestamp, payload }
        if (hasSlack) {
            const slackAgents = require('./slack/slack-agents');
            bus.on('AGENT_STARTED', async (event) => {
                const p = event.payload || {};
                slackAgents.notifyRunStart({ runId: p.task_id, agent: p.label || p.task_id, taskDescription: p.label, domain: null, model: null })
                    .catch(e => console.warn('[Services/bus] slack agent start:', e.message));
            });
            bus.on('AGENT_COMPLETED', async (event) => {
                const p = event.payload || {};
                slackAgents.notifyRunComplete({ runId: p.task_id, agent: p.label || p.task_id, costUsd: 0, durationMs: p.elapsed_ms, tokenCount: 0, status: p.ok ? 'completed' : 'failed' })
                    .catch(e => console.warn('[Services/bus] slack agent complete:', e.message));
            });
        }

        if (hasNotion) {
            const notionSync = require('./notion/notion-sync');
            bus.on('AGENT_COMPLETED', async (event) => {
                const p = event.payload || {};
                notionSync.logAgentRun({ name: (p.label || p.task_id || '').slice(0, 100), agent: p.label || p.task_id, domain: null, modelUsed: null, costUsd: 0, durationMs: p.elapsed_ms, tokenCount: 0, status: p.ok ? 'Completed' : 'Failed', supabaseRunId: p.task_id })
                    .catch(e => console.warn('[Services/bus] notion agent run:', e.message));
            });
        }

        // Event bus persistence — AGENT_COMPLETED → apex_agent_runs
        // Only inserts if no row exists (orchestrator writes its own full audit entries)
        bus.on('AGENT_COMPLETED', async (event) => {
            const p = event.payload || {};
            if (!p.task_id) return;
            const sb = _getEventsSb();
            if (!sb) return;
            const { error } = await sb.from('apex_agent_runs').insert({
                task_id:       p.task_id,
                objective:     (p.label || p.task_id || '').slice(0, 255),
                success:       !!p.ok,
                cost_usd:      0,
                complexity:    'moderate',
                agent_summary: JSON.stringify({ queue_task: true, elapsed_ms: p.elapsed_ms, error: p.error || null }),
                created_at:    new Date().toISOString(),
            });
            // Article 4: assert on every write — silent failure is corruption
            if (error) {
                const isDup = error.message.includes('duplicate') || error.message.includes('unique');
                if (!isDup) {
                    console.warn('[Services/bus] agent run persist failed:', error.message);
                    try {
                        const { alertError } = require('./slack/slack-alerts');
                        alertError('Event write failure', `apex_agent_runs insert: ${error.message}`, 'EventBus').catch(() => {});
                    } catch (_) {}
                }
            }
        });
    } catch (e) {
        console.warn('[Services] event-bus wiring failed (non-fatal):', e.message);
    }

    // Supabase → Notion sync every 6 hours (deferred 5 min after startup)
    if (hasNotion) {
        try {
            const { runFullSync, ensureCheckpointTable } = require('./sync/supabase-notion-sync');
            ensureCheckpointTable().catch(e => console.warn('[Services] checkpoint table init failed:', e.message));
            const _runSync = async () => {
                try {
                    const result = await runFullSync();
                    console.log('[Services] Supabase→Notion sync:', JSON.stringify(result));
                } catch (e) { console.warn('[Services] sync failed:', e.message); }
            };
            setTimeout(_runSync, 300000);
            setInterval(_runSync, 6 * 60 * 60 * 1000);
            console.log('[Services] Supabase→Notion sync every 6 hours');
        } catch (e) {
            console.warn('[Services] sync setup failed (non-fatal):', e.message);
        }
    }

    // System health check — post to Slack every 6 hours
    if (hasSlack) {
        try {
            const { runHealthCheck } = require('./slack/slack-system-health');
            const _postHealth = async () => {
                try {
                    const mem = process.memoryUsage();
                    let dbLatency = null;
                    try { const pgPool = require('../lib/pg_database'); const t = Date.now(); await pgPool.query('SELECT 1'); dbLatency = Date.now() - t; } catch {}
                    await runHealthCheck({
                        memoryMb: Math.round(mem.rss / 1024 / 1024),
                        supabaseLatencyMs: dbLatency,
                        activeWebSockets: global._apexWsCount || 0,
                        apiErrors24h: 0,
                    });
                } catch (e) { console.warn('[Services] health post failed:', e.message); }
            };
            // Defer first health post 5 minutes after startup
            setTimeout(_postHealth, 300000);
            setInterval(_postHealth, 6 * 60 * 60 * 1000);
            console.log('[Services] Slack health checks every 6 hours');
        } catch (e) {
            console.warn('[Services] health check setup failed:', e.message);
        }
    }

    // Phase 0b: start outbox relay (5-second tick, outbox → events)
    try {
        require('../lib/outbox-relay').start();
        console.log('[Services] Outbox relay started');
    } catch (e) {
        console.warn('[Services] outbox relay start failed (non-fatal):', e.message);
    }

    // Phase 0b: start integrity crons (backup 24h, reconciliation 7d)
    try {
        require('../lib/integrity-crons').start();
        console.log('[Services] Integrity crons registered');
    } catch (e) {
        console.warn('[Services] integrity crons failed (non-fatal):', e.message);
    }

    console.log('[Services] Integration layer initialized');
}

module.exports = { init };
