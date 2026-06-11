'use strict';

/**
 * Transactional outbox helper — Constitution Articles 3 & 4.
 *
 * Two execution paths:
 *
 *   stateOp non-null  → calls write_outbox_with_state(p_state_sql, ...) via supabase.rpc.
 *     The Postgres function executes the state-change SQL and the outbox INSERT in one
 *     server-side transaction. If either fails the whole thing rolls back.
 *     Constitution Article 4: throws loudly on any failure — no silent degradation.
 *
 *   stateOp null  → pure event emission; outbox INSERT via Supabase JS (HTTPS).
 *     No atomicity required because there is no state change to pair with.
 *
 * stateOp shape:  { sql: string }
 *   sql — the SQL to execute as the state change, with values embedded.
 *         The string is passed as-is to PL/pgSQL EXECUTE; callers must use
 *         format() or pg_catalog.quote_literal() to escape values safely.
 *
 * @param {{ sql: string }|null} stateOp
 * @param {{ source, type, payload, entity_refs?, occurred_at?, natural_key? }} event
 * @returns {Promise<string>}  idempotency_key (sha256 hex)
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

async function writeWithOutbox(stateOp, event) {
    const occurred_at     = event.occurred_at || new Date().toISOString();
    const naturalKey      = `${event.source}|${event.type}|${canonicalJson(event.natural_key ?? event.payload)}`;
    const idempotency_key = crypto.createHash('sha256').update(naturalKey).digest('hex');
    const content_hash    = crypto.createHash('sha256').update(canonicalJson(event.payload)).digest('hex');
    const entity_refs     = event.entity_refs || [];

    if (stateOp) {
        // Atomic server-side transaction via write_outbox_with_state Postgres function.
        // entity_refs passed as text[] so the ::uuid[] cast happens INSIDE the transaction —
        // a cast failure rolls back the state change too.
        const { error } = await _sb().rpc('write_outbox_with_state', {
            p_state_sql:       stateOp.sql,
            p_idempotency_key: idempotency_key,
            p_source:          event.source,
            p_type:            event.type,
            p_entity_refs:     entity_refs.map(String),
            p_payload:         event.payload,
            p_content_hash:    content_hash,
            p_occurred_at:     occurred_at,
        });
        if (error) throw new Error(error.message);
        return idempotency_key;
    }

    // Null stateOp: pure event emission — Supabase JS path (HTTPS, no pg pool needed).
    const { error } = await _sb().from('outbox').insert({
        idempotency_key,
        source:       event.source,
        type:         event.type,
        entity_refs,
        payload:      event.payload,
        content_hash,
        occurred_at,
    });
    if (error) {
        const isDup = error.code === '23505' ||
            error.message?.includes('duplicate') ||
            error.message?.includes('unique');
        if (!isDup) throw new Error(error.message);
    }
    return idempotency_key;
}

module.exports = { writeWithOutbox };
