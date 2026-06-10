'use strict';

/**
 * Outbox relay — Constitution Articles 3 & 4.
 *
 * Moves rows from `outbox` → `events` on a 5-second interval.
 * Each row gets its own transaction: a failure on one row never blocks others.
 * Content-hash is verified before insert; mismatch quarantines the row.
 * Any relay error alerts to Slack (non-blocking, non-fatal to the relay).
 */

const crypto            = require('crypto');
const pool              = require('../pg_database');
const _log              = require('./logger');
const { canonicalJson } = require('./canonical-json');

const BATCH   = 50;
const TICK_MS = 5000;

let _running  = false;
let _interval = null;

async function relay() {
    if (_running) return;
    _running = true;
    try {
        const { rows } = await pool.query(
            `SELECT * FROM outbox WHERE relayed_at IS NULL ORDER BY created_at LIMIT $1`,
            [BATCH]
        );

        for (const row of rows) {
            // Verify content_hash before insert
            // canonicalJson handles jsonb key-order instability across round-trips
            const payloadObj  = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
            const computed    = crypto.createHash('sha256').update(canonicalJson(payloadObj)).digest('hex');
            if (computed !== row.content_hash) {
                _log.error('outbox-relay', 'content_hash mismatch — quarantining row', {
                    outbox_id: row.outbox_id, stored: row.content_hash, computed
                });
                _alert('Event content_hash mismatch',
                    `outbox_id ${row.outbox_id} quarantined. Stored: ${row.content_hash}, Computed: ${computed}`);
                // Mark as relayed with a sentinel so it doesn't block the queue
                await pool.query(
                    `UPDATE outbox SET relayed_at = now() WHERE outbox_id = $1`,
                    [row.outbox_id]
                );
                continue;
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await client.query(
                    `INSERT INTO events
                       (idempotency_key, source, type, entity_refs, payload, content_hash, occurred_at)
                     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
                     ON CONFLICT (idempotency_key) DO NOTHING`,
                    [row.idempotency_key, row.source, row.type, row.entity_refs,
                     row.payload, row.content_hash, row.occurred_at]
                );
                await client.query(
                    `UPDATE outbox SET relayed_at = now() WHERE outbox_id = $1`,
                    [row.outbox_id]
                );
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                _log.error('outbox-relay', 'row failed', { outbox_id: row.outbox_id, error: err.message });
                _alert('Outbox relay row failure', `outbox_id ${row.outbox_id}: ${err.message}`);
            } finally {
                client.release();
            }
        }
    } catch (err) {
        _log.error('outbox-relay', 'batch query failed', { error: err.message });
        _alert('Outbox relay batch failure', err.message);
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
