'use strict';

/**
 * Outbox relay — Constitution Articles 3 & 4.
 *
 * Moves rows from `outbox` → `events` on a 5-second interval.
 * Uses the Supabase JS client (HTTPS) so it works regardless of whether a
 * raw pg pool connection is available.
 *
 * Idempotency is preserved by ON CONFLICT DO NOTHING on events.idempotency_key:
 * if a relay run inserts the event but fails to mark outbox.relayed_at, the
 * next run will silently skip the duplicate event insert and then mark the row.
 */

const crypto            = require('crypto');
const _log              = require('./logger');
const { canonicalJson } = require('./canonical-json');
const { createClient }  = require('@supabase/supabase-js');
const _pgPool           = require('../pg_database');

const BATCH   = 50;
const TICK_MS = 5000;

let _sbClient = null;
function _sb() {
    if (!_sbClient) _sbClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    return _sbClient;
}

let _running  = false;
let _interval = null;

async function _relayRow(row) {
    const pgClient = await _pgPool.connect();
    try {
        await pgClient.query('BEGIN');
        await pgClient.query(
            `INSERT INTO events (idempotency_key, source, type, entity_refs, payload, content_hash, occurred_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (idempotency_key) DO NOTHING`,
            [row.idempotency_key, row.source, row.type, row.entity_refs, row.payload, row.content_hash, row.occurred_at]
        );
        await pgClient.query(`UPDATE outbox SET relayed_at = NOW() WHERE outbox_id = $1`, [row.outbox_id]);
        await pgClient.query('COMMIT');
        return true;
    } catch (err) {
        await pgClient.query('ROLLBACK').catch(() => {});
        _log.error('outbox-relay', 'pg transaction failed', { outbox_id: row.outbox_id, error: err.message });
        _alert('Outbox relay row failure', `outbox_id ${row.outbox_id}: ${err.message}`);
        return false;
    } finally {
        pgClient.release();
    }
}

async function relay() {
    if (_running) return;
    _running = true;
    try {
        const { data: rows, error: fetchErr } = await _sb()
            .from('outbox')
            .select('*')
            .is('relayed_at', null)
            .order('created_at', { ascending: true })
            .limit(BATCH);

        if (fetchErr) {
            _log.error('outbox-relay', 'batch query failed', { error: fetchErr.message });
            _alert('Outbox relay batch failure', fetchErr.message);
            return;
        }

        for (const row of rows || []) {
            // Verify content_hash before insert
            const payloadObj = typeof row.payload === 'string'
                ? JSON.parse(row.payload) : row.payload;
            const computed = crypto.createHash('sha256')
                .update(canonicalJson(payloadObj)).digest('hex');

            if (computed !== row.content_hash) {
                _log.error('outbox-relay', 'content_hash mismatch — quarantining row', {
                    outbox_id: row.outbox_id, stored: row.content_hash, computed
                });
                _alert('Event content_hash mismatch',
                    `outbox_id ${row.outbox_id} quarantined.`);
                await _sb().from('outbox')
                    .update({ relayed_at: new Date().toISOString() })
                    .eq('outbox_id', row.outbox_id);
                continue;
            }

            await _relayRow(row);
        }
    } catch (err) {
        _log.error('outbox-relay', 'relay exception', { error: err.message });
        _alert('Outbox relay exception', err.message);
    } finally {
        _running = false;
    }
}

function _alert(title, details) {
    try {
        const { alertError } = require('../services/slack/slack-alerts');
        alertError(title, details, 'OutboxRelay').catch(() => {});
    } catch (_) {}
}

function start() {
    if (_interval) return;
    _interval = setInterval(() => relay().catch(e => {
        _log.warn('outbox-relay', 'interval error', { error: e.message });
    }), TICK_MS);
    _log.info('outbox-relay', `relay started (${TICK_MS}ms tick)`);
}

function stop() {
    if (_interval) { clearInterval(_interval); _interval = null; }
}

module.exports = { relay, start, stop };
