'use strict';
/**
 * Phase 0 acceptance tests — Constitution Article 4.
 *
 * Requires DATABASE_URL + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 * Run: node tests/phase0-acceptance.test.js
 *
 * Test 1 — Replay safety
 *   writeWithOutbox twice with identical payload → exactly 1 outbox row.
 *   relay() → exactly 1 events row. content_hash matches sha256(payload).
 *
 * Test 2 — Relay crash & restart
 *   Producer writes outbox row (relay not run). Relay runs once → event appears.
 *   Relay runs again → still exactly 1 event (idempotent relay).
 *
 * Test 3 — No silent failure
 *   Supabase JS client returns error object on duplicate insert (not swallowed).
 *   writeWithOutbox throws on stateQuery failure and rolls back (no orphan row).
 */

require('dotenv').config();
const assert  = require('assert');
const crypto  = require('crypto');
const pool    = require('../pg_database');
const { writeWithOutbox }  = require('../lib/write-with-outbox');
const { relay }            = require('../lib/outbox-relay');
const { canonicalJson }    = require('../lib/canonical-json');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log('  PASS:', name);
        passed++;
    } catch (e) {
        console.error('  FAIL:', name, '—', e.message);
        failed++;
    }
}

async function cleanUp(iKey) {
    if (!iKey) return;
    await pool.query(`DELETE FROM consumer_offsets WHERE event_id IN (
        SELECT event_id FROM events WHERE idempotency_key = $1)`, [iKey]);
    await pool.query(`DELETE FROM events WHERE idempotency_key = $1`, [iKey]);
    await pool.query(`DELETE FROM outbox  WHERE idempotency_key = $1`, [iKey]);
}

async function main() {

    // ─────────────────────────────────────────────────────────────────
    // Test 1 — Replay safety
    // ─────────────────────────────────────────────────────────────────
    console.log('\nTest 1 — Replay safety (idempotent write + relay)');
    let iKey1;

    await test('1.1 — first writeWithOutbox inserts one outbox row', async () => {
        iKey1 = await writeWithOutbox(null, {
            source: 'test', type: 'test.replay_safety',
            natural_key: 'replay-test-001',
            payload: { n: 1 },
        });
        const { rows } = await pool.query(
            `SELECT * FROM outbox WHERE idempotency_key = $1`, [iKey1]);
        assert.strictEqual(rows.length, 1, 'expected exactly 1 outbox row');
    });

    await test('1.2 — re-running identical writeWithOutbox is a no-op (UNIQUE on outbox)', async () => {
        const iKey2 = await writeWithOutbox(null, {
            source: 'test', type: 'test.replay_safety',
            natural_key: 'replay-test-001',
            payload: { n: 1 },
        });
        assert.strictEqual(iKey2, iKey1, 'idempotency_key must be stable');
        const { rows } = await pool.query(
            `SELECT * FROM outbox WHERE idempotency_key = $1`, [iKey1]);
        assert.strictEqual(rows.length, 1, 'still exactly 1 outbox row after re-run');
    });

    await test('1.3 — relay moves outbox row to events exactly once', async () => {
        await relay();
        const { rows: evtRows } = await pool.query(
            `SELECT * FROM events WHERE idempotency_key = $1`, [iKey1]);
        const { rows: obxRows } = await pool.query(
            `SELECT * FROM outbox WHERE idempotency_key = $1 AND relayed_at IS NOT NULL`, [iKey1]);
        assert.strictEqual(evtRows.length, 1, 'exactly 1 event row after relay');
        assert.strictEqual(obxRows.length, 1, 'outbox row marked relayed');
    });

    await test('1.4 — content_hash matches sha256(payload)', async () => {
        const { rows } = await pool.query(
            `SELECT payload, content_hash FROM events WHERE idempotency_key = $1`, [iKey1]);
        assert.strictEqual(rows.length, 1);
        const computed = crypto.createHash('sha256')
            .update(canonicalJson(rows[0].payload))
            .digest('hex');
        assert.strictEqual(computed, rows[0].content_hash, 'content_hash = sha256(canonicalJson(payload))');
    });

    await cleanUp(iKey1);

    // ─────────────────────────────────────────────────────────────────
    // Test 2 — Relay crash & restart
    // ─────────────────────────────────────────────────────────────────
    console.log('\nTest 2 — Relay crash & restart');
    let iKey2;

    await test('2.1 — producer writes outbox row; no event row yet', async () => {
        iKey2 = await writeWithOutbox(null, {
            source: 'test', type: 'test.relay_crash',
            natural_key: 'relay-crash-001',
            payload: { n: 2 },
        });
        const { rows: obx } = await pool.query(
            `SELECT * FROM outbox WHERE idempotency_key = $1 AND relayed_at IS NULL`, [iKey2]);
        assert.strictEqual(obx.length, 1, 'outbox row pending');
        const { rows: evt } = await pool.query(
            `SELECT * FROM events WHERE idempotency_key = $1`, [iKey2]);
        assert.strictEqual(evt.length, 0, 'no events row before relay');
    });

    await test('2.2 — relay run 1 (simulated restart): event appears', async () => {
        await relay();
        const { rows } = await pool.query(
            `SELECT * FROM events WHERE idempotency_key = $1`, [iKey2]);
        assert.strictEqual(rows.length, 1, 'event row exists after first relay run');
    });

    await test('2.3 — relay run 2 (second restart): still exactly one event row', async () => {
        await relay();
        const { rows } = await pool.query(
            `SELECT * FROM events WHERE idempotency_key = $1`, [iKey2]);
        assert.strictEqual(rows.length, 1, 'idempotent — 1 event after second relay');
    });

    await cleanUp(iKey2);

    // ─────────────────────────────────────────────────────────────────
    // Test 3 — No silent failure
    // ─────────────────────────────────────────────────────────────────
    console.log('\nTest 3 — No silent failure on constraint violation');
    let cleanupKey3;

    await test('3.1 — Supabase JS client returns error on duplicate (not swallowed)', async () => {
        const iKey = 'test-silent-failure-' + Date.now();
        cleanupKey3 = iKey;
        // Insert via pg pool (guaranteed clean)
        await pool.query(
            `INSERT INTO events (idempotency_key, source, type, payload, content_hash, occurred_at)
             VALUES ($1, 'test', 'test.silent_failure', '{}', $2, now())`,
            [iKey, crypto.createHash('sha256').update('{}').digest('hex')]
        );
        // Attempt duplicate via Supabase JS client — must return error, never swallow
        const { createClient } = require('@supabase/supabase-js');
        const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { error } = await sb.from('events').insert({
            idempotency_key: iKey,
            source: 'test', type: 'test.silent_failure',
            payload: {}, content_hash: crypto.createHash('sha256').update('{}').digest('hex'),
            occurred_at: new Date().toISOString(),
        });
        assert.ok(error !== null && error !== undefined,
            'Supabase JS client must return error object on constraint violation');
        assert.ok(
            error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505',
            `expected uniqueness error, got: ${error.message}`
        );
    });

    await test('3.2 — writeWithOutbox throws + rolls back on failed stateQuery', async () => {
        let threw = false;
        const testPayload = { n: 3, ts: Date.now() };
        try {
            await writeWithOutbox(
                async (client) => {
                    await client.query('SELECT 1 FROM nonexistent_table_phase0_test_xyz');
                },
                { source: 'test', type: 'test.pg_error', payload: testPayload }
            );
        } catch {
            threw = true;
        }
        assert.ok(threw, 'writeWithOutbox must throw when stateQuery fails');
        // Verify transaction rolled back — no orphan outbox row
        // Must use canonicalJson to match write-with-outbox idempotency_key computation
        const naturalKey = `test|test.pg_error|${canonicalJson(testPayload)}`;
        const iKey = crypto.createHash('sha256').update(naturalKey).digest('hex');
        const { rows } = await pool.query(
            `SELECT * FROM outbox WHERE idempotency_key = $1`, [iKey]);
        assert.strictEqual(rows.length, 0, 'rollback: no outbox row on failed stateQuery');
    });

    if (cleanupKey3) {
        await pool.query(`DELETE FROM events WHERE idempotency_key = $1`, [cleanupKey3]);
    }

    // ─────────────────────────────────────────────────────────────────
    // Results
    // ─────────────────────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(54)}`);
    console.log(`Phase 0 acceptance: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        console.error('\n❌  Phase 0 NOT green — fix failures before proceeding to Phase 1');
        process.exit(1);
    } else {
        console.log('\n✅  Phase 0 green — event spine is integrity-safe');
        process.exit(0);
    }
}

main().catch(e => {
    console.error('\nFATAL:', e.message);
    process.exit(1);
});
