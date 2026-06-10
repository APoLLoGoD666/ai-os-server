'use strict';

/**
 * Transactional outbox helper — Constitution Articles 3 & 4.
 *
 * Pairs a producer's state change with an outbox row.
 *
 * Two execution paths:
 *   1. pg pool path  — when stateQuery is provided and pg pool is reachable.
 *      Uses a real BEGIN/COMMIT so the state change and outbox insert are atomic.
 *   2. Supabase JS path — for null stateQuery, or when pg pool is unavailable
 *      (e.g. IPv6-only direct URL unreachable from Render).
 *      The outbox insert goes through PostgREST (HTTPS). If a non-null stateQuery
 *      is provided but the pool is unreachable, the stateQuery is called with a
 *      null client; any pg-client usage inside it will throw, which writeWithOutbox
 *      catches and re-throws without touching the outbox — preserving the
 *      no-orphan-row guarantee.
 *
 * @param {Function|null} stateQuery  async (pgClientOrNull) => void
 * @param {Object}        event       { source, type, payload, entity_refs?, occurred_at?, natural_key? }
 * @returns {Promise<string>}         idempotency_key (sha256 hex)
 */

const crypto            = require('crypto');
const { canonicalJson } = require('./canonical-json');
const { createClient }  = require('@supabase/supabase-js');

let _sbClient = null;
function _sb() {
    if (!_sbClient) _sbClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    return _sbClient;
}

async function writeWithOutbox(stateQuery, event) {
    const occurred_at     = event.occurred_at || new Date().toISOString();
    const naturalKey      = `${event.source}|${event.type}|${canonicalJson(event.natural_key ?? event.payload)}`;
    const idempotency_key = crypto.createHash('sha256').update(naturalKey).digest('hex');
    const content_hash    = crypto.createHash('sha256').update(canonicalJson(event.payload)).digest('hex');
    const entity_refs     = event.entity_refs || [];

    const outboxRow = {
        idempotency_key,
        source:   event.source,
        type:     event.type,
        entity_refs,
        payload:  event.payload,
        content_hash,
        occurred_at,
    };

    if (stateQuery) {
        // Try the pg pool transaction path first
        let client = null;
        try {
            const pool = require('../pg_database');
            client = await pool.connect();
        } catch (_) {
            // Pool unavailable — fall through to the null-client path below
        }

        if (client) {
            try {
                await client.query('BEGIN');
                await stateQuery(client);
                await client.query(
                    `INSERT INTO outbox
                       (idempotency_key, source, type, entity_refs, payload, content_hash, occurred_at)
                     VALUES ($1, $2, $3, $4::uuid[], $5::jsonb, $6, $7)
                     ON CONFLICT (idempotency_key) DO NOTHING`,
                    [idempotency_key, event.source, event.type, entity_refs,
                     JSON.stringify(event.payload), content_hash, occurred_at]
                );
                await client.query('COMMIT');
                return idempotency_key;
            } catch (err) {
                await client.query('ROLLBACK').catch(() => {});
                throw err;
            } finally {
                client.release();
            }
        } else {
            // pg pool unreachable — call stateQuery with null so any pg-client
            // usage inside it throws; we propagate that throw without touching outbox.
            await stateQuery(null);
            // stateQuery succeeded without pg — insert outbox row via Supabase JS
        }
    }

    // Supabase JS path (null stateQuery, or stateQuery that doesn't need pg)
    const { error } = await _sb().from('outbox').insert(outboxRow);
    if (error) {
        const isDup = error.code === '23505' ||
            error.message?.includes('duplicate') ||
            error.message?.includes('unique');
        if (!isDup) throw new Error(error.message);
    }
    return idempotency_key;
}

module.exports = { writeWithOutbox };
