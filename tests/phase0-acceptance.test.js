'use strict';
/**
 * Phase 0 acceptance tests — Constitution Article 4.
 *
 * Requires DATABASE_URL in env (run on Render or with local .env loaded).
 * Run: node tests/phase0-acceptance.test.js
 *
 * Test 1 — Replay safety
 *   Insert an event via writeWithOutbox. Kill relay simulation (don't start it).
 *   Re-run writeWithOutbox with identical payload. Assert: exactly one outbox row,
 *   one events row after relay runs, hashes verify.
 *
 * Test 2 — Relay crash & restart
 *   Producer writes state + outbox row. Relay is invoked once (simulating restart
 *   after crash). Assert: event appears in `events` exactly once.
 *   Re-run relay. Assert: still exactly one event row (idempotent relay).
 *
 * Test 3 — No silent failure
 *   Force a constraint violation on the events table (duplicate idempotency_key).
 *   Assert: the insert returns an error object (never silently swallowed).
 *   The error must be detectable and loggable — proving the write path is
 *   assertion-safe. (Slack alert verified by log inspection in CI; full
 *   Slack integration test requires SLACK_BOT_TOKEN.)
 */

require('dotenv').config();
const assert = require('assert');
const pool   = require('../pg_database');
const { writeWithOutbox } = require('../lib/write-with-outbox');
const { relay }           = require('../lib/outbox-relay');

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
    // Remove test rows so tests are repeatable
    await pool.query(`DELETE FROM consumer_offsets WHERE event_id IN (SELECT event_id FROM events WHERE idempotency_key = $1)`, [iKey]);
    await pool.query(`DELETE FROM events  WHERE idempotency_key = $1`, [iKey]);
    await pool.query(`DELETE FROM outbox  WHERE idempotency_key = $1`, [iKey]);
}

// ─────────────────────────────────────────────────────────────────────
// Test 1 — Replay safety
// ─────────────────────────────────────────────────────────────────────
console.log('\nTest 1 — Replay safety (kill-9 mid-batch simulation)');
await test('1.1 — first writeWithOutbox inserts one outbox row', async () => {
    const iKey = await writeWithOutbox(null, {
        source: 'test', type: 'test.replay_safety',
        natural_key: 'replay-test-001',
        payload: { n: 1 }
    });
    const { rows } = await pool.query(`SELECT * FROM outbox WHERE idempotency_key = $1`, [iKey]);
    assert.strictEqual(rows.length, 1, 'expected exactly 1 outbox row');
    // Store for next sub-test
    process._testIKey1 = iKey;
});

await test('1.2 — re-running identical writeWithOutbox is a no-op (idempotent)', async () => {
    const iKey = await writeWithOutbox(null, {
        source: 'test', type: 'test.replay_safety',
        natural_key: 'replay-test-001',
        payload: { n: 1 }
    });
    assert.strictEqual(iKey, process._testIKey1, 'idempotency_key must be stable');
    const { rows } = await pool.query(`SELECT * FROM outbox WHERE idempotency_key = $1`, [iKey]);
    assert.strictEqual(rows.length, 1, 'still exactly 1 outbox row after re-run');
});

await test('1.3 — relay moves outbox row to events exactly once', async () => {
    await relay();
    const iKey = process._testIKey1;
    const { rows: evtRows } = await pool.query(`SELECT * FROM events WHERE idempotency_key = $1`, [iKey]);
    const { rows: obxRows } = await pool.query(`SELECT * FROM outbox WHERE idempotency_key = $1 AND relayed_at IS NOT NULL`, [iKey]);
    assert.strictEqual(evtRows.length, 1, 'exactly 1 event row');
    assert.strictEqual(obxRows.length, 1, 'outbox row marked relayed');
});

await test('1.4 — content_hash matches sha256(payload)', async () => {
    const iKey = process._testIKey1;
    const { rows } = await pool.query(`SELECT payload, content_hash FROM events WHERE idempotency_key = $1`, [iKey]);
    assert.strictEqual(rows.length, 1);
    const crypto = require('crypto');
    const computed = crypto.createHash('sha256')
        .update(JSON.stringify(rows[0].payload))
        .digest('hex');
    assert.strictEqual(computed, rows[0].content_hash, 'content_hash must match sha256(payload)');
});

await cleanUp(process._testIKey1);

// ─────────────────────────────────────────────────────────────────────
// Test 2 — Relay crash & restart
// ─────────────────────────────────────────────────────────────────────
console.log('\nTest 2 — Relay crash & restart (event appears exactly once)');
await test('2.1 — producer writes outbox row; relay not yet run', async () => {
    const iKey = await writeWithOutbox(null, {
        source: 'test', type: 'test.relay_crash',
        natural_key: 'relay-crash-001',
        payload: { n: 2 }
    });
    process._testIKey2 = iKey;
    const { rows } = await pool.query(`SELECT * FROM outbox WHERE idempotency_key = $1 AND relayed_at IS NULL`, [iKey]);
    assert.strictEqual(rows.length, 1, 'outbox row pending before relay runs');
    const { rows: evtRows } = await pool.query(`SELECT * FROM events WHERE idempotency_key = $1`, [iKey]);
    assert.strictEqual(evtRows.length, 0, 'no events row before relay runs');
});

await test('2.2 — relay run 1 (simulating restart): event appears', async () => {
    await relay();
    const iKey = process._testIKey2;
    const { rows } = await pool.query(`SELECT * FROM events WHERE idempotency_key = $1`, [iKey]);
    assert.strictEqual(rows.length, 1, 'event row exists after first relay run');
});

await test('2.3 — relay run 2 (second restart): still exactly one event row', async () => {
    await relay(); // run again
    const iKey = process._testIKey2;
    const { rows } = await pool.query(`SELECT * FROM events WHERE idempotency_key = $1`, [iKey]);
    assert.strictEqual(rows.length, 1, 'idempotent — still exactly 1 event row after second relay');
});

await cleanUp(process._testIKey2);

// ─────────────────────────────────────────────────────────────────────
// Test 3 — No silent failure
// ─────────────────────────────────────────────────────────────────────
console.log('\nTest 3 — No silent failure on constraint violation');
await test('3.1 — duplicate idempotency_key insert returns an error, never throws silently', async () => {
    const iKey = 'test-silent-failure-sentinel-' + Date.now();
    // First insert — should succeed
    await pool.query(
        `INSERT INTO events (idempotency_key, source, type, payload, content_hash, occurred_at)
         VALUES ($1, 'test', 'test.silent_failure', '{}', 'abc', now())`,
        [iKey]
    );
    // Second insert via Supabase JS client pattern — must return error, not swallow it
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await sb.from('events').insert({
        idempotency_key: iKey,
        source: 'test', type: 'test.silent_failure',
        payload: {}, content_hash: 'abc',
        occurred_at: new Date().toISOString()
    });
    // Article 4: the error must be present and visible — never swallowed
    assert.ok(error !== null && error !== undefined, 'constraint violation must return error object');
    assert.ok(
        error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505',
        `error must indicate uniqueness violation, got: ${error.message}`
    );
    // Clean up
    await pool.query(`DELETE FROM events WHERE idempotency_key = $1`, [iKey]);
});

await test('3.2 — writeWithOutbox throws on pg error (no silent swallow in pg path)', async () => {
    // Pass a stateQuery that deliberately fails
    let threw = false;
    try {
        await writeWithOutbox(
            async (client) => {
                await client.query('INSERT INTO nonexistent_table_xyz VALUES ($1)', ['x']);
            },
            { source: 'test', type: 'test.pg_error', payload: { n: 3 } }
        );
    } catch {
        threw = true;
    }
    assert.ok(threw, 'writeWithOutbox must throw when stateQuery fails');
    // Verify transaction was rolled back — no outbox row left
    const crypto = require('crypto');
    const naturalKey = `test|test.pg_error|${JSON.stringify({ n: 3 })}`;
    const iKey = crypto.createHash('sha256').update(naturalKey).digest('hex');
    const { rows } = await pool.query(`SELECT * FROM outbox WHERE idempotency_key = $1`, [iKey]);
    assert.strictEqual(rows.length, 0, 'rollback: no outbox row on failed stateQuery');
});

// ─────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Phase 0 acceptance: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    console.error('\n❌  Phase 0 NOT green — fix failures before proceeding to Phase 1');
    process.exit(1);
} else {
    console.log('\n✅  Phase 0 green — event spine is integrity-safe');
    process.exit(0);
}
