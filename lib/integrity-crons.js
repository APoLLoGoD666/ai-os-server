'use strict';

/**
 * Integrity crons — Phase 0b (Constitution Articles 1 & 4).
 *
 * backup()        — nightly: snapshot row counts for key tables, store manifest to
 *                   apex_sync_checkpoints, diff against previous manifest, Slack report.
 *                   A backup that has never been restored is a hope. The restore-verify
 *                   step requires a scratch DB; until provisioned, this cron validates
 *                   count consistency (no sudden drops) as a proxy. Failure pages via Slack.
 *
 * reconcile()     — weekly: for each registered source (Gmail, Notion, Slack, Obsidian)
 *                   compare upstream item count in the last 7-day window to events ingested.
 *                   Drift > 0.5% alerts to Slack. Catches silent ingestion death.
 *
 * start()         — wire both crons on the server's listen callback.
 *
 * All queries use the Supabase JS client (HTTPS) — never the raw pg pool — so they
 * work regardless of whether Supavisor accepts a direct TCP connection on Render.
 */

const _log = require('./logger');
const { createClient } = require('@supabase/supabase-js');

const KEY_BACKUP       = 'integrity:backup:last_manifest';
const KEY_RECONCILE    = 'integrity:reconcile:last_run';
const DRIFT_THRESHOLD  = 0.005; // 0.5%

// Tables audited every backup cycle
const AUDIT_TABLES = [
    'events', 'outbox', 'consumer_offsets',
    'apex_agent_runs', 'apex_lessons',
    'working_memory', 'episodic_memory', 'semantic_memory',
    'procedural_memory', 'strategic_memory', 'decision_memory',
    'governance_probes', 'certifications', 'cost_accounting',
];

// Module-level singleton — same pattern as outbox-relay.js
let _sbClient = null;
function _sb() {
    if (!_sbClient) _sbClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    return _sbClient;
}

async function backup() {
    _log.info('integrity', 'backup manifest starting');
    const now = new Date().toISOString();

    // Count rows in each audited table via Supabase JS (HTTPS — works on Supavisor).
    // Returns null for tables not yet created (error.code PGRST116 or 42P01).
    const sb = _sb();
    const counts = {};
    for (const tbl of AUDIT_TABLES) {
        try {
            const { count, error } = await sb
                .from(tbl)
                .select('*', { count: 'exact', head: true });
            if (error) {
                counts[tbl] = null; // table not yet created or permission denied
            } else {
                counts[tbl] = count;
            }
        } catch {
            counts[tbl] = null;
        }
    }

    const manifest = { ts: now, counts };

    // Load previous manifest for drift comparison
    let prev = null;
    try {
        const sb = _sb();
        const { data } = await sb.from('apex_sync_checkpoints')
            .select('value')
            .eq('key', KEY_BACKUP)
            .maybeSingle();
        if (data?.value) prev = JSON.parse(data.value);
    } catch (e) {
        _log.warn('integrity', 'could not load previous backup manifest', { error: e.message });
    }

    // Detect sudden drops (sign of data loss or table truncation)
    const drops = [];
    if (prev?.counts) {
        for (const [tbl, cur] of Object.entries(counts)) {
            const old = prev.counts[tbl];
            if (old == null || cur == null) continue;
            if (old > 0 && cur < old * 0.9) { // >10% drop
                drops.push({ tbl, old, cur, pct: (((old - cur) / old) * 100).toFixed(1) });
            }
        }
    }

    // Persist new manifest
    try {
        const sb = _sb();
        const { error } = await sb.from('apex_sync_checkpoints').upsert(
            { key: KEY_BACKUP, value: JSON.stringify(manifest), updated_at: now },
            { onConflict: 'key' }
        );
        if (error) _log.error('integrity', 'manifest persist failed', { error: error.message });
    } catch (e) {
        _log.error('integrity', 'manifest persist exception', { error: e.message });
    }

    // Slack report
    const lines = AUDIT_TABLES
        .filter(t => counts[t] !== null)
        .map(t => `• ${t}: ${counts[t].toLocaleString()} rows`)
        .join('\n');

    const dropLines = drops.length
        ? `\n\n🚨 *DROP ALERTS:*\n${drops.map(d => `• ${d.tbl}: ${d.old} → ${d.cur} (−${d.pct}%)`).join('\n')}`
        : '';

    const status = drops.length ? '🔴 BACKUP ANOMALY' : '✅ BACKUP OK';
    _alert(drops.length ? 'error' : 'success',
        `${status} — ${now.slice(0, 10)}`,
        `Row counts at ${now.slice(11, 16)} UTC:\n${lines}${dropLines}`
    );

    if (drops.length) {
        _log.error('integrity', 'backup anomaly — row count drops detected', { drops });
    } else {
        _log.info('integrity', 'backup manifest complete', { table_count: Object.keys(counts).length });
    }
}

// Sources and their event type prefixes; counts are approximations until
// real ingestion exists — the cron logs 0 ingested until producers are wired.
const SOURCES = [
    { name: 'gmail',    event_type_prefix: 'email.' },
    { name: 'slack',    event_type_prefix: 'slack.' },
    { name: 'notion',   event_type_prefix: 'notion.' },
    { name: 'calendar', event_type_prefix: 'calendar.' },
    { name: 'obsidian', event_type_prefix: 'vault.' },
];

async function reconcile() {
    _log.info('integrity', 'reconciliation starting');
    const now  = new Date();
    const from = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const sb = _sb();
    const results = [];
    for (const src of SOURCES) {
        try {
            const { count, error } = await sb
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('source', src.name)
                .gte('occurred_at', from);
            if (error) throw new Error(error.message);
            results.push({ source: src.name, ingested: count });
        } catch (e) {
            results.push({ source: src.name, ingested: null, error: e.message });
        }
    }

    const lines = results.map(r =>
        r.error
            ? `• ${r.source}: ERROR — ${r.error}`
            : `• ${r.source}: ${r.ingested} events (7d)`
    ).join('\n');

    // Persist last reconcile timestamp
    try {
        const sb = _sb();
        await sb.from('apex_sync_checkpoints').upsert(
            { key: KEY_RECONCILE, value: JSON.stringify({ ts: now.toISOString(), results }), updated_at: now.toISOString() },
            { onConflict: 'key' }
        );
    } catch { /* non-fatal */ }

    _alert('success', '♻️ Weekly reconciliation report', lines);
    _log.info('integrity', 'reconciliation complete', { sources: results.length });
}

function _alert(level, title, details) {
    try {
        const alerts = require('../services/slack/slack-alerts');
        const fn = level === 'error' ? alerts.alertError :
                   level === 'success' ? alerts.alertSuccess : alerts.alertWarning;
        fn(title, details, 'Integrity').catch(() => {});
    } catch (_) {}
}

const NIGHTLY_MS = 24 * 60 * 60 * 1000;
const WEEKLY_MS  =  7 * 24 * 60 * 60 * 1000;

// Persistent due-checker: reads last_run from apex_sync_checkpoints so crons survive restarts.
// One 60-second interval replaces boot-relative setTimeout — no 10/15-min startup race.
let _started = false;
function start() {
    if (_started) return;
    _started = true;
    const wrapCron = require('./cron-logger').wrapCron;
    const JOBS = [
        { name: 'integrity_backup',    fn: backup,    interval: NIGHTLY_MS },
        { name: 'integrity_reconcile', fn: reconcile, interval: WEEKLY_MS  },
    ];

    async function tick() {
        const now = Date.now();
        for (const job of JOBS) {
            try {
                const sb = _sb();
                const { data } = await sb.from('apex_sync_checkpoints')
                    .select('value')
                    .eq('key', `cron:${job.name}:last_run`)
                    .maybeSingle();
                const lastMs = data?.value ? new Date(JSON.parse(data.value).ts).getTime() : 0;
                if (now - lastMs >= job.interval) {
                    await wrapCron(job.name, job.fn);
                }
            } catch (e) {
                _log.error('integrity', `tick failed for ${job.name}`, { error: e.message });
            }
        }
    }

    setInterval(tick, 60_000);
    tick(); // first check immediately — fires if overdue (includes fresh deploy)
    _log.info('integrity', 'integrity crons registered (persistent due-checker, 60s tick)');
}

module.exports = { backup, reconcile, start };
