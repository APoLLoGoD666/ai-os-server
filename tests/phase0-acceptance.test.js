'use strict';
/**
 * Phase 0 acceptance tests — Constitution Article 4.
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 * Run: node tests/phase0-acceptance.test.js
 *
 * All DB reads/writes use the Supabase JS client (HTTPS) so the test runs
 * on Render regardless of pg pool connectivity.
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
 *   writeWithOutbox throws on stateQuery failure and does not insert (no orphan row).
 */

require('dotenv').config();
const assert             = require('assert');
const crypto             = require('crypto');
const { createClient }   = require('@supabase/supabase-js');
const { writeWithOutbox }  = require('../lib/write-with-outbox');
const { relay }            = require('../lib/outbox-relay');
const { canonicalJson }    = require('../lib/canonical-json');

const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function sbRows(table, filters) {
    let q = sb.from(table).select('*');
    for (const [k, v] of Object.entries(filters)) {
        if (v === null) q = q.is(k, null);
        else            q = q.eq(k, v);
    }
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data || [];
}

async function cleanUp(iKey) {
    if (!iKey) return;
    // Delete consumer_offsets first (FK → events)
    const { data: evts } = await sb.from('events').select('event_id').eq('idempotency_key', iKey);
    for (const e of evts || []) {
        await sb.from('consumer_offsets').delete().eq('event_id', e.event_id);
    }
    await sb.from('events').delete().eq('idempotency_key', iKey);
    await sb.from('outbox').delete().eq('idempotency_key', iKey);
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
        const rows = await sbRows('outbox', { idempotency_key: iKey1 });
        assert.strictEqual(rows.length, 1, 'expected exactly 1 outbox row');
    });

    await test('1.2 — re-running identical writeWithOutbox is a no-op (UNIQUE on outbox)', async () => {
        const iKey2 = await writeWithOutbox(null, {
            source: 'test', type: 'test.replay_safety',
            natural_key: 'replay-test-001',
            payload: { n: 1 },
        });
        assert.strictEqual(iKey2, iKey1, 'idempotency_key must be stable');
        const rows = await sbRows('outbox', { idempotency_key: iKey1 });
        assert.strictEqual(rows.length, 1, 'still exactly 1 outbox row after re-run');
    });

    await test('1.3 — relay moves outbox row to events exactly once', async () => {
        await relay();
        const evtRows = await sbRows('events', { idempotency_key: iKey1 });
        const obxRows = (await sbRows('outbox', { idempotency_key: iKey1 }))
            .filter(r => r.relayed_at !== null);
        assert.strictEqual(evtRows.length, 1, 'exactly 1 event row after relay');
        assert.strictEqual(obxRows.length, 1, 'outbox row marked relayed');
    });

    await test('1.4 — content_hash matches sha256(payload)', async () => {
        const rows = await sbRows('events', { idempotency_key: iKey1 });
        assert.strictEqual(rows.length, 1);
        const computed = crypto.createHash('sha256')
            .update(canonicalJson(rows[0].payload))
            .digest('hex');
        assert.strictEqual(computed, rows[0].content_hash,
            'content_hash = sha256(canonicalJson(payload))');
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
        const obx = (await sbRows('outbox', { idempotency_key: iKey2 }))
            .filter(r => r.relayed_at === null);
        assert.strictEqual(obx.length, 1, 'outbox row pending');
        const evt = await sbRows('events', { idempotency_key: iKey2 });
        assert.strictEqual(evt.length, 0, 'no events row before relay');
    });

    await test('2.2 — relay run 1 (simulated restart): event appears', async () => {
        await relay();
        const rows = await sbRows('events', { idempotency_key: iKey2 });
        assert.strictEqual(rows.length, 1, 'event row exists after first relay run');
    });

    await test('2.3 — relay run 2 (second restart): still exactly one event row', async () => {
        await relay();
        const rows = await sbRows('events', { idempotency_key: iKey2 });
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
        const hash = crypto.createHash('sha256').update('{}').digest('hex');
        // Insert first row
        const { error: firstErr } = await sb.from('events').insert({
            idempotency_key: iKey,
            source: 'test', type: 'test.silent_failure',
            payload: {}, content_hash: hash,
            occurred_at: new Date().toISOString(),
        });
        if (firstErr) throw new Error('first insert failed: ' + firstErr.message);

        // Attempt duplicate — must return error, never swallow
        const { error } = await sb.from('events').insert({
            idempotency_key: iKey,
            source: 'test', type: 'test.silent_failure',
            payload: {}, content_hash: hash,
            occurred_at: new Date().toISOString(),
        });
        assert.ok(error !== null && error !== undefined,
            'Supabase JS client must return error object on constraint violation');
        assert.ok(
            error.message.includes('duplicate') ||
            error.message.includes('unique') ||
            error.code === '23505',
            `expected uniqueness error, got: ${error.message}`
        );
    });

    await test('3.2 — writeWithOutbox throws + does not insert outbox row when stateQuery fails', async () => {
        let threw = false;
        const testPayload = { n: 3, ts: Date.now() };
        try {
            await writeWithOutbox(
                async () => {
                    // Deliberate stateQuery failure — does not need a pg client
                    throw new Error('deliberate stateQuery failure for rollback test');
                },
                { source: 'test', type: 'test.pg_error', payload: testPayload }
            );
        } catch {
            threw = true;
        }
        assert.ok(threw, 'writeWithOutbox must throw when stateQuery fails');
        // Verify no orphan outbox row was inserted
        const naturalKey = `test|test.pg_error|${canonicalJson(testPayload)}`;
        const iKey = crypto.createHash('sha256').update(naturalKey).digest('hex');
        const rows = await sbRows('outbox', { idempotency_key: iKey });
        assert.strictEqual(rows.length, 0, 'no outbox row on failed stateQuery');
    });

    if (cleanupKey3) {
        await sb.from('events').delete().eq('idempotency_key', cleanupKey3);
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
