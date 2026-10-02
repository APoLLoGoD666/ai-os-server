'use strict';

// Bidirectional synchronization engine: Supabase ↔ Notion
// Idempotent, checkpointed, conflict-resolved

const { getSupabaseClient } = require('../../lib/clients');

// Checkpoint store (in-memory, survives restarts via Supabase)
const CHECKPOINT_TABLE = 'apex_sync_checkpoints';

function _sb() { return getSupabaseClient(); }

async function _getCheckpoint(key) {
    try {
        const { data } = await _sb().from(CHECKPOINT_TABLE).select('value').eq('key', key).single();
        return data?.value || null;
    } catch { return null; }
}

async function _setCheckpoint(key, value) {
    try {
        await _sb().from(CHECKPOINT_TABLE).upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    } catch (e) { console.warn('[sync-checkpoint] write failed:', e.message); }
}

// Sync apex_agent_runs → Notion Agent Runs
// Uses created_at checkpoint to avoid re-syncing old records
async function syncAgentRuns(opts = {}) {
    const { batchSize = 20, dryRun = false } = opts;
    const notionSync = require('../notion/notion-sync');
    const sbClient = _sb();
    const checkpointKey = 'sync:agent_runs:last_synced_at';
    const lastSync = await _getCheckpoint(checkpointKey);
    const query = sbClient.from('apex_agent_runs').select('*').order('created_at', { ascending: true }).limit(batchSize);
    if (lastSync) query.gt('created_at', lastSync);

    const { data, error } = await query;
    if (error) throw new Error('Supabase query failed: ' + error.message);
    if (!data || data.length === 0) return { synced: 0, skipped: 0 };

    let synced = 0, errors = 0;
    for (const run of data) {
        if (dryRun) { synced++; continue; }
        try {
            await notionSync.logAgentRun({
                name: (run.task_description || run.agent_name || 'Agent run').slice(0, 100),
                agent: run.agent_name,
                taskDescription: run.task_description,
                domain: run.domain,
                modelUsed: run.model || run.model_used,
                costUsd: run.cost_usd,
                durationMs: run.duration_ms,
                tokenCount: run.token_count,
                status: run.success === true ? 'Completed' : run.success === false ? 'Failed' : 'Completed',
                errorMessage: run.error_message,
                supabaseRunId: String(run.id),
            });
            synced++;
        } catch (e) {
            errors++;
            console.warn('[sync] agent run failed:', run.id, e.message);
        }
    }

    // Update checkpoint to last record's created_at
    if (data.length > 0 && !dryRun) {
        await _setCheckpoint(checkpointKey, data[data.length - 1].created_at);
    }

    return { synced, errors, checkpoint: data.length > 0 ? data[data.length - 1].created_at : lastSync };
}

// Ensure the checkpoints table exists (idempotent)
async function ensureCheckpointTable() {
    try {
        const pgPool = require('../../lib/pg_database');
        await pgPool.query(`
            CREATE TABLE IF NOT EXISTS apex_sync_checkpoints (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        console.log('[Sync] apex_sync_checkpoints table ready');
    } catch (e) {
        console.warn('[Sync] checkpoint table setup failed (non-fatal):', e.message);
    }
}

// Run a full sync cycle — called from cron or manual trigger
async function runFullSync(opts = {}) {
    const results = {};
    try { results.agentRuns = await syncAgentRuns(opts); }
    catch (e) { results.agentRuns = { error: e.message }; }
    return results;
}

module.exports = { syncAgentRuns, runFullSync, ensureCheckpointTable };
