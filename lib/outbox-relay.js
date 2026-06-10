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

            // Insert into events — ON CONFLICT DO NOTHING handles duplicate relay runs
            const { error: insertErr } = await _sb().from('events').insert({
                idempotency_key: row.idempotency_key,
                source:          row.source,
                type:            row.type,
                entity_refs:     row.entity_refs,
                payload:         row.payload,
                content_hash:    row.content_hash,
                occurred_at:     row.occurred_at,
            });

            if (insertErr) {
                const isDup = insertErr.code === '23505' ||
                    insertErr.message?.includes('duplicate') ||
                    insertErr.message?.includes('unique');
                if (!isDup) {
                    _log.error('outbox-relay', 'row failed', {
                        outbox_id: row.outbox_id, error: insertErr.message
                    });
                    _alert('Outbox relay row failure',
                        `outbox_id ${row.outbox_id}: ${insertErr.message}`);
                    continue;
                }
                // Duplicate → event already exists; still mark outbox as relayed
            }

            const { error: updateErr } = await _sb().from('outbox')
                .update({ relayed_at: new Date().toISOString() })
                .eq('outbox_id', row.outbox_id);

            if (updateErr) {
                _log.warn('outbox-relay', 'relayed_at update failed', {
                    outbox_id: row.outbox_id, error: updateErr.message
                });
            }
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
