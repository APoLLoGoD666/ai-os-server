'use strict';

/**
 * Transactional outbox helper — Constitution Articles 3 & 4.
 *
 * Pairs a producer's state change with an outbox row in one real pg transaction.
 * The outbox-relay moves the row into `events` asynchronously with retry.
 *
 * Usage:
 *   const { writeWithOutbox } = require('./write-with-outbox');
 *   await writeWithOutbox(
 *     async (client) => {
 *       await client.query('INSERT INTO my_table ...', [...]);
 *     },
 *     { source: 'gmail', type: 'message.received', payload: { ... } }
 *   );
 *
 * When stateQuery is null, only the outbox row is written (pure event emission).
 *
 * @param {Function|null} stateQuery  async (pgClient) => void
 * @param {Object}        event       { source, type, payload, entity_refs?, occurred_at?, natural_key? }
 * @returns {Promise<string>}         idempotency_key (sha256 hex)
 */

const pool  = require('../pg_database');
const crypto = require('crypto');

async function writeWithOutbox(stateQuery, event) {
    const occurred_at      = event.occurred_at || new Date().toISOString();
    // natural_key lets callers control the idempotency key; defaults to payload contents
    const naturalKey       = `${event.source}|${event.type}|${JSON.stringify(event.natural_key ?? event.payload)}`;
    const idempotency_key  = crypto.createHash('sha256').update(naturalKey).digest('hex');
    const content_hash     = crypto.createHash('sha256').update(JSON.stringify(event.payload)).digest('hex');
    const entity_refs      = event.entity_refs || [];

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (stateQuery) await stateQuery(client);

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
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { writeWithOutbox };
