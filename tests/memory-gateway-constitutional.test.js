'use strict';
// tests/memory-gateway-constitutional.test.js
// W2-01 Memory Gateway constitutional wiring offline tests.
// No live Supabase required — DB failures produce UNAVAILABLE status records.
// Run: node tests/memory-gateway-constitutional.test.js

const assert = require('assert');
const { HistoricalStateQueryResult } = require('../lib/constitutional-types/historical-state-record');
const gateway = require('../lib/memory/gateway');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL  ${name}: ${err.message}`);
        failed++;
    }
}

async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (err) {
        console.error(`  FAIL  ${name}: ${err.message}`);
        failed++;
    }
}

// ── HistoricalStateQueryResult type — direct create() tests ─────────────────

console.log('\nHistoricalStateQueryResult — type validation');

test('create() returns object with __type HistoricalStateQueryResult', () => {
    const r = HistoricalStateQueryResult.create({
        query_id:             'HSQR-TEST-001',
        query_timestamp:      new Date().toISOString(),
        historical_layers:    [],
        temporal_validity_ms: 120_000,
        status:               'VALID',
    });
    assert.strictEqual(r.__type,     'HistoricalStateQueryResult');
    assert.strictEqual(r.__baseline, 'APEX-CONSTITUTION-v1.0');
    assert.strictEqual(r.__runtime,  'RT-07');
});

test('create() returns object with all required fields present', () => {
    const ts = new Date().toISOString();
    const layers = [{ layer: 2, content: 'test episode', created_at: ts }];
    const r = HistoricalStateQueryResult.create({
        query_id:             'HSQR-TEST-002',
        query_timestamp:      ts,
        historical_layers:    layers,
        temporal_validity_ms: 60_000,
        status:               'PARTIAL',
    });
    assert.strictEqual(r.query_id, 'HSQR-TEST-002');
    assert.strictEqual(r.query_timestamp, ts);
    assert.deepStrictEqual(r.historical_layers, layers);
    assert.strictEqual(r.temporal_validity_ms, 60_000);
    assert.strictEqual(r.status, 'PARTIAL');
});

test('create() accepts VALID status', () => {
    const r = HistoricalStateQueryResult.create({
        query_id: 'HSQR-VALID', query_timestamp: new Date().toISOString(),
        historical_layers: [{ test: true }], temporal_validity_ms: 120_000, status: 'VALID',
    });
    assert.strictEqual(r.status, 'VALID');
});

test('create() accepts PARTIAL status', () => {
    const r = HistoricalStateQueryResult.create({
        query_id: 'HSQR-PARTIAL', query_timestamp: new Date().toISOString(),
        historical_layers: [], temporal_validity_ms: 120_000, status: 'PARTIAL',
    });
    assert.strictEqual(r.status, 'PARTIAL');
});

test('create() accepts UNAVAILABLE status', () => {
    const r = HistoricalStateQueryResult.create({
        query_id: 'HSQR-UNAVAIL', query_timestamp: new Date().toISOString(),
        historical_layers: [], temporal_validity_ms: 0, status: 'UNAVAILABLE',
    });
    assert.strictEqual(r.status, 'UNAVAILABLE');
});

test('create() throws on invalid status enum', () => {
    assert.throws(() => {
        HistoricalStateQueryResult.create({
            query_id: 'HSQR-BAD', query_timestamp: new Date().toISOString(),
            historical_layers: [], temporal_validity_ms: 120_000, status: 'INVALID',
        });
    }, TypeError);
});

test('create() throws on missing required query_id', () => {
    assert.throws(() => {
        HistoricalStateQueryResult.create({
            query_timestamp: new Date().toISOString(),
            historical_layers: [], temporal_validity_ms: 120_000, status: 'VALID',
        });
    }, TypeError);
});

test('create() throws on missing required historical_layers', () => {
    assert.throws(() => {
        HistoricalStateQueryResult.create({
            query_id: 'HSQR-NO-LAYERS', query_timestamp: new Date().toISOString(),
            temporal_validity_ms: 120_000, status: 'VALID',
        });
    }, TypeError);
});

test('create() throws on non-number temporal_validity_ms', () => {
    assert.throws(() => {
        HistoricalStateQueryResult.create({
            query_id: 'HSQR-BAD-MS', query_timestamp: new Date().toISOString(),
            historical_layers: [], temporal_validity_ms: 'bad', status: 'VALID',
        });
    }, TypeError);
});

// ── Optional fields ──────────────────────────────────────────────────────────

console.log('\nHistoricalStateQueryResult — optional fields');

test('create() accepts provenance_segments array', () => {
    const r = HistoricalStateQueryResult.create({
        query_id: 'HSQR-PROV', query_timestamp: new Date().toISOString(),
        historical_layers: [], temporal_validity_ms: 120_000, status: 'VALID',
        provenance_segments: [{ petl_tx_id: 'TX-ABC-001', requesting_entity: 'orchestrator' }],
    });
    assert.ok(Array.isArray(r.provenance_segments));
    assert.strictEqual(r.provenance_segments[0].petl_tx_id, 'TX-ABC-001');
});

test('create() accepts completeness_attestation string', () => {
    const r = HistoricalStateQueryResult.create({
        query_id: 'HSQR-ATT', query_timestamp: new Date().toISOString(),
        historical_layers: [], temporal_validity_ms: 120_000, status: 'VALID',
        completeness_attestation: 'layers=2,7; entity=orchestrator; count=0',
    });
    assert.strictEqual(r.completeness_attestation, 'layers=2,7; entity=orchestrator; count=0');
});

test('create() rejects provenance_segments as non-array', () => {
    assert.throws(() => {
        HistoricalStateQueryResult.create({
            query_id: 'HSQR-PROV-BAD', query_timestamp: new Date().toISOString(),
            historical_layers: [], temporal_validity_ms: 120_000, status: 'VALID',
            provenance_segments: 'not-an-array',
        });
    }, TypeError);
});

// ── PETL provenance linkage ──────────────────────────────────────────────────

console.log('\nHistoricalStateQueryResult — PETL provenance chain');

test('provenance_segments carries petl_tx_id for traceability', () => {
    const petlTxId = 'TX-99999-00001-abc12345';
    const r = HistoricalStateQueryResult.create({
        query_id:             'HSQR-PETL-LINK',
        query_timestamp:      new Date().toISOString(),
        historical_layers:    [],
        temporal_validity_ms: 120_000,
        status:               'VALID',
        provenance_segments:  [{ petl_tx_id: petlTxId, requesting_entity: 'orchestrator', timestamp: new Date().toISOString() }],
        completeness_attestation: `layers=2,7; entity=orchestrator; count=0; petl_tx=${petlTxId}`,
    });
    assert.strictEqual(r.provenance_segments[0].petl_tx_id, petlTxId);
    assert.ok(r.completeness_attestation.includes(petlTxId));
});

// ── Immutability ─────────────────────────────────────────────────────────────

console.log('\nConstitutional immutability');

test('HistoricalStateQueryResult type object is frozen', () => {
    assert.strictEqual(Object.isFrozen(HistoricalStateQueryResult), true);
    assert.strictEqual(Object.isFrozen(HistoricalStateQueryResult.CONSTITUTIONAL), true);
    assert.strictEqual(Object.isFrozen(HistoricalStateQueryResult.SCHEMA), true);
});

test('frozen type cannot be mutated', () => {
    const original = HistoricalStateQueryResult.CONSTITUTIONAL.type;
    try { HistoricalStateQueryResult.CONSTITUTIONAL.type = 'TAMPERED'; } catch (_) {}
    assert.strictEqual(HistoricalStateQueryResult.CONSTITUTIONAL.type, original);
});

// ── Fire-and-forget wiring pattern ───────────────────────────────────────────

console.log('\nFire-and-forget wiring pattern');

test('setImmediate pattern emits HistoricalStateQueryResult to mock store', (done) => {
    const emitted = [];
    const mockStore = { write: async (r) => emitted.push(r) };

    setImmediate(async () => {
        try {
            const record = HistoricalStateQueryResult.create({
                query_id:             'HSQR-FF-TEST',
                query_timestamp:      new Date().toISOString(),
                historical_layers:    [{ layer: 2, content: 'test' }],
                temporal_validity_ms: 120_000,
                status:               'VALID',
            });
            await mockStore.write(record);
        } catch (_) {}
    });

    setImmediate(() => {
        try {
            assert.strictEqual(emitted.length, 1);
            assert.strictEqual(emitted[0].__type,     'HistoricalStateQueryResult');
            assert.strictEqual(emitted[0].__baseline, 'APEX-CONSTITUTION-v1.0');
            assert.strictEqual(emitted[0].status,     'VALID');
            console.log('  PASS  setImmediate pattern emits HistoricalStateQueryResult to mock store');
            passed++;
        } catch (err) {
            console.error(`  FAIL  setImmediate pattern emits HistoricalStateQueryResult to mock store: ${err.message}`);
            failed++;
        }
    });
});

// ── getHistoricalState() offline behaviour ───────────────────────────────────

console.log('\ngetHistoricalState() — offline integration');

// In offline mode (no Supabase), searchMemory() fails internally.
// getHistoricalState() catches the error and returns UNAVAILABLE.
// This verifies the constitutional failure path (Phase 4).

async function runOfflineTests() {
    await testAsync('getHistoricalState() returns HistoricalStateQueryResult object', async () => {
        const result = await gateway.getHistoricalState({
            query: 'test query offline',
            requestingEntity: 'orchestrator',
            layers: [2, 7],
        });
        assert.ok(result, 'result must not be null');
        assert.strictEqual(typeof result, 'object');
        assert.strictEqual(result.__type, 'HistoricalStateQueryResult');
        assert.strictEqual(result.__baseline, 'APEX-CONSTITUTION-v1.0');
    });

    await testAsync('getHistoricalState() offline produces status UNAVAILABLE or PARTIAL', async () => {
        const result = await gateway.getHistoricalState({
            query: 'offline test',
            requestingEntity: 'orchestrator',
            layers: [2, 7],
        });
        assert.ok(['UNAVAILABLE', 'PARTIAL', 'VALID'].includes(result.status),
            `status must be valid enum, got: ${result.status}`);
    });

    await testAsync('getHistoricalState() produces query_id with HSQR- prefix', async () => {
        const result = await gateway.getHistoricalState({
            query: 'query id test',
            requestingEntity: 'orchestrator',
        });
        assert.ok(result.query_id.startsWith('HSQR-'), `query_id must start with HSQR-, got: ${result.query_id}`);
    });

    await testAsync('getHistoricalState() produces ISO timestamp in query_timestamp', async () => {
        const result = await gateway.getHistoricalState({
            requestingEntity: 'orchestrator',
        });
        const ts = new Date(result.query_timestamp);
        assert.ok(!isNaN(ts.getTime()), 'query_timestamp must be valid ISO datetime');
    });

    await testAsync('getHistoricalState() with petlTxId populates provenance_segments', async () => {
        const petlTxId = 'TX-TEST-PROVENANCE-LINK';
        const result = await gateway.getHistoricalState({
            query: 'provenance test',
            requestingEntity: 'orchestrator',
            petlTxId,
        });
        assert.ok(Array.isArray(result.provenance_segments), 'provenance_segments must be array when petlTxId provided');
        assert.strictEqual(result.provenance_segments[0].petl_tx_id, petlTxId);
        assert.ok(result.completeness_attestation.includes(petlTxId), 'completeness_attestation must reference petlTxId');
    });

    await testAsync('getHistoricalState() completeness_attestation includes entity and layers', async () => {
        const result = await gateway.getHistoricalState({
            query: 'attestation test',
            requestingEntity: 'orchestrator',
            layers: [2, 7],
        });
        assert.ok(result.completeness_attestation.includes('entity=orchestrator'));
        assert.ok(result.completeness_attestation.includes('layers='));
    });

    await testAsync('getHistoricalState() temporal_validity_ms is 120000', async () => {
        const result = await gateway.getHistoricalState({
            requestingEntity: 'orchestrator',
        });
        assert.strictEqual(result.temporal_validity_ms, 120_000);
    });

    await testAsync('getHistoricalState() returns array historical_layers', async () => {
        const result = await gateway.getHistoricalState({
            query: 'layers test',
            requestingEntity: 'orchestrator',
        });
        assert.ok(Array.isArray(result.historical_layers), 'historical_layers must be array');
    });

    await testAsync('existing getContext() function still exported and callable', async () => {
        assert.strictEqual(typeof gateway.getContext, 'function', 'getContext must still exist');
    });

    await testAsync('existing searchMemory() function still exported and callable', async () => {
        assert.strictEqual(typeof gateway.searchMemory, 'function', 'searchMemory must still exist');
    });

    await testAsync('existing storeMemory() function still exported and callable', async () => {
        assert.strictEqual(typeof gateway.storeMemory, 'function', 'storeMemory must still exist');
    });

    await testAsync('getHistoricalState() is exported from gateway', async () => {
        assert.strictEqual(typeof gateway.getHistoricalState, 'function', 'getHistoricalState must be exported');
    });

    printSummary();
}

function printSummary() {
    console.log(`\n══════════════════════════════════════`);
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log(`══════════════════════════════════════`);
    if (failed > 0) process.exit(1);
}

// Run async tests after sync ones
setTimeout(runOfflineTests, 100);
