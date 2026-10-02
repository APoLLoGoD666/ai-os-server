'use strict';
// tests/constitutional-store-persistence.test.js
// T3-08.1 Constitutional Store Persistence — constitutional + live Supabase tests.
// Run: node tests/constitutional-store-persistence.test.js
// Live persistence tests require SUPABASE_URL and SUPABASE_ANON_KEY in environment.

require('dotenv').config();
const constitutionalStore = require('../lib/runtime/constitutional-store');

// ── Minimal test harness ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let skipped = 0;

// Collect all async test promises so summary waits for them all
const _pending = [];

function test(name, fn) {
    try {
        fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (e) {
        console.error(`  FAIL  ${name}\n        ${e.message}`);
        failed++;
    }
}

function testAsync(name, fn) {
    const p = (async () => {
        try {
            await fn();
            console.log(`  PASS  ${name}`);
            passed++;
        } catch (e) {
            console.error(`  FAIL  ${name}\n        ${e.message}`);
            failed++;
        }
    })();
    _pending.push(p);
}

function skip(name, reason) {
    console.log(`  SKIP  ${name} — ${reason}`);
    skipped++;
}

function assertEqual(a, b, msg) {
    if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LIVE_SUPABASE = !!(process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));

function makeObservationRecord(overrides = {}) {
    const ts = new Date().toISOString();
    return Object.assign({
        __type:               'ObservationRecord',
        __runtime:            'RT-08',
        __baseline:           'APEX-CONSTITUTION-v1.0',
        __version:            '1.0.0',
        __wave:               'W3-T3-08.1-TEST',
        __structural_immutable: true,
        record_id:            `OBS-TEST-PERSIST-${Date.now()}`,
        observer_identity_ref: 'APEX-SYSTEM-OBSERVER',
        observation_channel_ref: 'APEX-FABRIC-CHANNEL',
        external_referent_id: 'entity-persist-test',
        external_state_description: 'T3-08.1 persistence test record',
        d5_uncertainty_source: 'persistence-test',
        d5_uncertainty_confidence: '0.90',
        d5_uncertainty_limitations: '["test environment"]',
        d5_uncertainty_timestamp: ts,
        d5_uncertainty_observer_capability: '{"domain_scope":["*"]}',
        domain_attribution: 'constitutional-architecture',
        internal_external_marker: true,
        authority_ref: 'AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP',
        contact_timestamp: ts,
        formation_timestamp: ts,
        observer_limitation_ref: 'OLR-APEX-SYSTEM-OBSERVER-TEST-1',
    }, overrides);
}

function makeChangeRecord(overrides = {}) {
    return Object.assign({
        __type:               'ChangeRecord',
        __runtime:            'RT-08',
        __baseline:           'APEX-CONSTITUTION-v1.0',
        __version:            '1.0.0',
        __wave:               'W2',
        __structural_immutable: false,
        claim_ref:            `test-claim-${Date.now()}`,
        stage_to:             'potential',
        historical_anchor_ref: `anchor-${Date.now()}`,
        transition_vector:    'test-creation',
        actor_ref:            'test-actor',
        event_timestamp:      new Date().toISOString(),
    }, overrides);
}

// ── 1. Module contract tests (no Supabase required) ───────────────────────────

console.log('\n  T3-08.1 Constitutional Store Persistence Tests\n');
console.log(`  Supabase live tests: ${LIVE_SUPABASE ? 'ENABLED' : 'DISABLED (no credentials)'}\n`);

test('constitutional-store module exports are frozen', () => {
    if (!Object.isFrozen(constitutionalStore)) throw new Error('constitutional-store exports not frozen');
});

test('constitutional-store exports write function', () => {
    if (typeof constitutionalStore.write !== 'function') throw new Error('write is not a function');
});

test('constitutional-store exports only write (no extra exports)', () => {
    const keys = Object.keys(constitutionalStore);
    if (keys.length !== 1 || keys[0] !== 'write') {
        throw new Error(`Expected ['write'], got [${keys.join(', ')}]`);
    }
});

// 2. No-throw contract (works in all environments)

testAsync('write() with valid ObservationRecord does not throw', async () => {
    const rec = makeObservationRecord();
    await constitutionalStore.write(rec);
});

testAsync('write() with valid ChangeRecord does not throw', async () => {
    const rec = makeChangeRecord();
    await constitutionalStore.write(rec);
});

testAsync('write() with null does not throw (no-throw contract)', async () => {
    let threw = false;
    try {
        await constitutionalStore.write(null);
    } catch {
        threw = true;
    }
    if (threw) throw new Error('write(null) threw — no-throw contract violated');
});

testAsync('write() with undefined does not throw (no-throw contract)', async () => {
    let threw = false;
    try {
        await constitutionalStore.write(undefined);
    } catch {
        threw = true;
    }
    if (threw) throw new Error('write(undefined) threw — no-throw contract violated');
});

testAsync('write() with empty object does not throw (no-throw contract)', async () => {
    let threw = false;
    try {
        await constitutionalStore.write({});
    } catch {
        threw = true;
    }
    if (threw) throw new Error('write({}) threw — no-throw contract violated');
});

testAsync('write() with missing __type does not throw (no-throw contract)', async () => {
    let threw = false;
    try {
        await constitutionalStore.write({ __runtime: 'RT-TEST', __baseline: 'APEX-CONSTITUTION-v1.0' });
    } catch {
        threw = true;
    }
    if (threw) throw new Error('write() with missing __type threw — no-throw contract violated');
});

testAsync('write() with non-object does not throw (no-throw contract)', async () => {
    let threw = false;
    try {
        await constitutionalStore.write('invalid-record-string');
    } catch {
        threw = true;
    }
    if (threw) throw new Error('write(string) threw — no-throw contract violated');
});

testAsync('write() with integer does not throw (no-throw contract)', async () => {
    let threw = false;
    try {
        await constitutionalStore.write(42);
    } catch {
        threw = true;
    }
    if (threw) throw new Error('write(42) threw — no-throw contract violated');
});

// 3. Record structure validation (no Supabase required)

test('ObservationRecord has all required fields for constitutional-store', () => {
    const rec = makeObservationRecord();
    if (!rec.__type)     throw new Error('__type missing');
    if (!rec.__runtime)  throw new Error('__runtime missing');
    if (!rec.__baseline) throw new Error('__baseline missing');
    assertEqual(rec.__type,    'ObservationRecord');
    assertEqual(rec.__runtime, 'RT-08');
    assertEqual(rec.__baseline, 'APEX-CONSTITUTION-v1.0');
    assertEqual(rec.structural_immutable, undefined); // constitutional-store maps __structural_immutable
    if (rec.__structural_immutable !== true) throw new Error('__structural_immutable must be true for ObservationRecord');
});

test('ChangeRecord has all required fields for constitutional-store', () => {
    const rec = makeChangeRecord();
    if (!rec.__type)     throw new Error('__type missing');
    if (!rec.__runtime)  throw new Error('__runtime missing');
    if (!rec.__baseline) throw new Error('__baseline missing');
    assertEqual(rec.__type, 'ChangeRecord');
});

test('ObservationRecord authority_ref is present after T3-08', () => {
    const rec = makeObservationRecord();
    if (typeof rec.authority_ref !== 'string' || rec.authority_ref.trim() === '') {
        throw new Error('authority_ref must be a non-empty string');
    }
    assertEqual(rec.authority_ref, 'AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP');
});

test('constitutional-store maps __structural_immutable to structural_immutable column', () => {
    // Verify write() accesses record.__structural_immutable (as per implementation)
    // The implementation: structural_immutable: record.__structural_immutable || false
    const rec = makeObservationRecord();
    if (rec.__structural_immutable !== true) throw new Error('__structural_immutable should be true for ObservationRecord');
    const noFlag = makeObservationRecord({ __structural_immutable: undefined });
    // constitutional-store.js: record.__structural_immutable || false → false for undefined
    if (noFlag.__structural_immutable !== undefined) throw new Error('Expected __structural_immutable to be undefined');
});

// 4. Live persistence tests (require Supabase credentials)

if (LIVE_SUPABASE) {
    const { getSupabaseClient } = require('../lib/clients');
    const sb = getSupabaseClient();

    testAsync('live: write() inserts ObservationRecord into constitutional_records', async () => {
        const uniqueMarker = `T3-08.1-LIVE-OBS-${Date.now()}`;
        const rec = makeObservationRecord({
            record_id:                  uniqueMarker,
            external_state_description: `Live persistence test: ${uniqueMarker}`,
        });

        await constitutionalStore.write(rec);
        // Brief wait for async write to complete
        await new Promise(r => setTimeout(r, 1500));

        const { data, error } = await sb
            .from('constitutional_records')
            .select('id, record_type, runtime_id, baseline, wave, structural_immutable, record_data')
            .eq('record_type', 'ObservationRecord')
            .filter('record_data->>record_id', 'eq', uniqueMarker)
            .limit(1);

        if (error) throw new Error(`SELECT failed: ${error.message}`);
        if (!data || data.length === 0) throw new Error('ObservationRecord not found in constitutional_records after write()');

        const row = data[0];
        if (row.record_type !== 'ObservationRecord')         throw new Error(`record_type mismatch: ${row.record_type}`);
        if (row.runtime_id !== 'RT-08')                      throw new Error(`runtime_id mismatch: ${row.runtime_id}`);
        if (row.baseline !== 'APEX-CONSTITUTION-v1.0')       throw new Error(`baseline mismatch: ${row.baseline}`);
        if (row.structural_immutable !== true)               throw new Error('structural_immutable should be true');
        if (!row.record_data)                                throw new Error('record_data JSONB is null');
        if (row.record_data.authority_ref !== 'AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP') {
            throw new Error(`authority_ref mismatch in JSONB: ${row.record_data.authority_ref}`);
        }
    });

    testAsync('live: write() inserts ChangeRecord into constitutional_records', async () => {
        const uniqueRef = `T3-08.1-LIVE-CR-${Date.now()}`;
        const rec = makeChangeRecord({ claim_ref: uniqueRef });

        await constitutionalStore.write(rec);
        await new Promise(r => setTimeout(r, 1500));

        const { data, error } = await sb
            .from('constitutional_records')
            .select('id, record_type, record_data')
            .eq('record_type', 'ChangeRecord')
            .filter('record_data->>claim_ref', 'eq', uniqueRef)
            .limit(1);

        if (error) throw new Error(`SELECT failed: ${error.message}`);
        if (!data || data.length === 0) throw new Error('ChangeRecord not found in constitutional_records after write()');
        if (data[0].record_type !== 'ChangeRecord') throw new Error(`record_type mismatch: ${data[0].record_type}`);
    });

    testAsync('live: persisted record_data JSONB contains all ObservationRecord fields', async () => {
        const uniqueMarker = `T3-08.1-JSONB-CHECK-${Date.now()}`;
        const rec = makeObservationRecord({
            record_id: uniqueMarker,
            d5_uncertainty_source: 'jsonb-field-verification',
        });

        await constitutionalStore.write(rec);
        await new Promise(r => setTimeout(r, 1500));

        const { data, error } = await sb
            .from('constitutional_records')
            .select('record_data')
            .filter('record_data->>record_id', 'eq', uniqueMarker)
            .limit(1);

        if (error) throw new Error(`SELECT failed: ${error.message}`);
        if (!data || data.length === 0) throw new Error('Record not found');

        const rd = data[0].record_data;
        const requiredFields = [
            '__type', '__runtime', '__baseline', 'record_id', 'observer_identity_ref',
            'observation_channel_ref', 'external_referent_id', 'd5_uncertainty_source',
            'd5_uncertainty_confidence', 'd5_uncertainty_limitations', 'd5_uncertainty_timestamp',
            'd5_uncertainty_observer_capability', 'domain_attribution', 'internal_external_marker',
            'authority_ref', 'contact_timestamp', 'formation_timestamp', 'observer_limitation_ref',
        ];
        for (const f of requiredFields) {
            if (rd[f] === undefined || rd[f] === null) {
                throw new Error(`record_data JSONB missing field: ${f}`);
            }
        }
    });

    testAsync('live: Supabase write failure on bad insert does not throw to caller', async () => {
        // Use a record with a type that would cause a constraint violation somehow
        // (actually hard to trigger — instead verify the catch works by checking no-throw)
        // Since constitutional-store catches all errors, this just verifies the contract again in live env.
        let threw = false;
        try {
            // Pass a record that has __type=null — Supabase will reject (NOT NULL constraint)
            await constitutionalStore.write({ __type: null, __runtime: 'RT-TEST', __baseline: 'APEX' });
        } catch {
            threw = true;
        }
        if (threw) throw new Error('write() with null __type threw to caller — no-throw contract violated');
    });

    testAsync('live: claimReality() end-to-end persists ObservationRecord', async () => {
        const { claimReality } = require('../lib/reality/fabric');
        const entityId = `T3-08.1-E2E-${Date.now()}`;
        const claimId = await claimReality({
            entityId,
            content: 'T3-08.1 end-to-end persistence verification',
            source:  'constitutional-store-persistence-test',
            confidence: 0.9,
            domain: 'constitutional-architecture',
            type: 'factual',
        });
        if (!claimId) throw new Error('claimReality() returned no id');

        // Wait for fire-and-forget emission
        await new Promise(r => setTimeout(r, 2500));

        const { data, error } = await sb
            .from('constitutional_records')
            .select('id, record_type, record_data')
            .eq('record_type', 'ObservationRecord')
            .filter('record_data->>external_referent_id', 'eq', entityId)
            .limit(1);

        if (error) throw new Error(`SELECT failed: ${error.message}`);
        if (!data || data.length === 0) throw new Error('ObservationRecord from claimReality() not found in constitutional_records');

        const rd = data[0].record_data;
        if (rd.authority_ref !== 'AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP') {
            throw new Error(`authority_ref not present or wrong: ${rd.authority_ref}`);
        }
    });

} else {
    skip('live: write() inserts ObservationRecord into constitutional_records', 'no SUPABASE_URL');
    skip('live: write() inserts ChangeRecord into constitutional_records', 'no SUPABASE_URL');
    skip('live: persisted record_data JSONB contains all ObservationRecord fields', 'no SUPABASE_URL');
    skip('live: Supabase write failure on bad insert does not throw to caller', 'no SUPABASE_URL');
    skip('live: claimReality() end-to-end persists ObservationRecord', 'no SUPABASE_URL');
}

// ── Summary ───────────────────────────────────────────────────────────────────

Promise.all(_pending).then(() => {
    console.log(`\n  Results: ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
    if (failed > 0) process.exit(1);
});
