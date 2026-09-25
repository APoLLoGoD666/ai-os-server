'use strict';
// tests/petl-constitutional.test.js
// W2-02 PETL constitutional wiring offline tests.
// No live store required — uses mock store to capture emitted records.
// Run: node tests/petl-constitutional.test.js

const assert = require('assert');
const { KernelOperationManifest, RejectionRecord, AccountabilityRecord } = require('../lib/constitutional-types/kernel-record');

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

// ── KernelOperationManifest ───────────────────────────────────────────────────

console.log('\nKernelOperationManifest');

test('create() returns object with __type and __baseline', () => {
    const record = KernelOperationManifest.create({
        manifest_id:             'KOM-TEST-001',
        era_ref:                 'APEX-CONSTITUTION-v1.0-ERA-1',
        established_at:          new Date().toISOString(),
        constitutional_basis:    'D4 §2.3; FoundingRatification; APEX-CONSTITUTION-v1.0',
        class_b_operation_types: ['GATE_EVALUATION', 'SLOT_RESERVATION'],
        manifest_version:        '1.0.0',
    });
    assert.strictEqual(record.__type,     'KernelOperationManifest');
    assert.strictEqual(record.__baseline, 'APEX-CONSTITUTION-v1.0');
    assert.strictEqual(record.__runtime,  'RT-03');
});

test('validate() returns { valid: true } for valid record', () => {
    const result = KernelOperationManifest.validate({
        manifest_id:             'KOM-TEST-002',
        era_ref:                 'APEX-CONSTITUTION-v1.0-ERA-1',
        established_at:          new Date().toISOString(),
        constitutional_basis:    'D4 §2.3; FoundingRatification',
        class_b_operation_types: ['GATE_EVALUATION'],
        manifest_version:        '1.0.0',
    });
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
});

test('create() throws on missing required field manifest_id', () => {
    assert.throws(() => {
        KernelOperationManifest.create({
            era_ref:                 'APEX-CONSTITUTION-v1.0-ERA-1',
            established_at:          new Date().toISOString(),
            constitutional_basis:    'D4 §2.3',
            class_b_operation_types: ['GATE_EVALUATION'],
            manifest_version:        '1.0.0',
        });
    }, TypeError);
});

test('KernelOperationManifest type object is frozen', () => {
    assert.strictEqual(Object.isFrozen(KernelOperationManifest), true);
    assert.strictEqual(Object.isFrozen(KernelOperationManifest.CONSTITUTIONAL), true);
});

// ── RejectionRecord ───────────────────────────────────────────────────────────

console.log('\nRejectionRecord');

const GATES = ['GATE-1', 'GATE-2', 'GATE-3', 'GATE-4', 'GATE-5', 'GATE-6'];

for (const gate of GATES) {
    test(`create() succeeds for ${gate}`, () => {
        const record = RejectionRecord.create({
            rejection_id:         `RJCT-TX-TEST-${gate}`,
            gate,
            failed_condition:     `Test failure at ${gate}`,
            actor_identity:       'test-user',
            operation_type:       'GET:/test',
            operation_identifier: 'TX-TEST-001',
            timestamp:            new Date().toISOString(),
        });
        assert.strictEqual(record.__type,     'RejectionRecord');
        assert.strictEqual(record.__baseline, 'APEX-CONSTITUTION-v1.0');
        assert.strictEqual(record.gate,       gate);
    });
}

test('create() throws on invalid gate enum', () => {
    assert.throws(() => {
        RejectionRecord.create({
            rejection_id:         'RJCT-TEST-BAD-GATE',
            gate:                 'GATE-99',
            failed_condition:     'bad gate',
            actor_identity:       'test-user',
            operation_type:       'GET:/test',
            operation_identifier: 'TX-TEST-002',
            timestamp:            new Date().toISOString(),
        });
    }, TypeError);
});

test('create() throws on missing required field gate', () => {
    assert.throws(() => {
        RejectionRecord.create({
            rejection_id:         'RJCT-TEST-NO-GATE',
            failed_condition:     'no gate provided',
            actor_identity:       'test-user',
            operation_type:       'GET:/test',
            operation_identifier: 'TX-TEST-003',
            timestamp:            new Date().toISOString(),
        });
    }, TypeError);
});

test('RejectionRecord type object is frozen', () => {
    assert.strictEqual(Object.isFrozen(RejectionRecord), true);
});

// ── AccountabilityRecord ──────────────────────────────────────────────────────

console.log('\nAccountabilityRecord');

test('create() returns object with __type and __baseline', () => {
    const record = AccountabilityRecord.create({
        accountability_id:     'ACC-TX-TEST-001',
        actor_identity:        'test-user',
        authority_ref:         'PETL-CONSTITUTION-PASS',
        operation_type:        'GET:/test',
        operation_identifier:  'TX-TEST-001',
        timestamp:             new Date().toISOString(),
        constitutional_effect: 'GET /test completed (FINALIZED)',
        stage8_commit_ref:     'TX-TEST-001',
    });
    assert.strictEqual(record.__type,     'AccountabilityRecord');
    assert.strictEqual(record.__baseline, 'APEX-CONSTITUTION-v1.0');
    assert.strictEqual(record.__runtime,  'RT-03');
});

test('create() throws on missing constitutional_effect', () => {
    assert.throws(() => {
        AccountabilityRecord.create({
            accountability_id:    'ACC-TX-TEST-002',
            actor_identity:       'test-user',
            authority_ref:        'PETL-CONSTITUTION-PASS',
            operation_type:       'GET:/test',
            operation_identifier: 'TX-TEST-002',
            timestamp:            new Date().toISOString(),
            stage8_commit_ref:    'TX-TEST-002',
        });
    }, TypeError);
});

test('AccountabilityRecord type object is frozen', () => {
    assert.strictEqual(Object.isFrozen(AccountabilityRecord), true);
});

// ── Fire-and-forget mock store pattern ───────────────────────────────────────

console.log('\nFire-and-forget wiring pattern');

test('setImmediate pattern emits record to mock store', (done) => {
    const emitted = [];
    const mockStore = { write: async (r) => emitted.push(r) };

    setImmediate(async () => {
        try {
            const record = RejectionRecord.create({
                rejection_id:         'RJCT-FF-TEST',
                gate:                 'GATE-1',
                failed_condition:     'rate limit exhausted',
                actor_identity:       'anonymous',
                operation_type:       'POST:/api/chat',
                operation_identifier: 'TX-FF-TEST-001',
                timestamp:            new Date().toISOString(),
            });
            await mockStore.write(record);
        } catch (err) {
            // Should not throw
        }
    });

    setImmediate(() => {
        try {
            assert.strictEqual(emitted.length, 1);
            assert.strictEqual(emitted[0].__type, 'RejectionRecord');
            console.log('  PASS  setImmediate pattern emits record to mock store');
            passed++;
        } catch (err) {
            console.error(`  FAIL  setImmediate pattern emits record to mock store: ${err.message}`);
            failed++;
        }
        printSummary();
    });
});

function printSummary() {
    console.log(`\n══════════════════════════════════════`);
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log(`══════════════════════════════════════`);
    if (failed > 0) process.exit(1);
}

// All sync tests done — async test above will call printSummary when done.
// If async test doesn't run (e.g. node exits early), set a fallback:
setTimeout(() => {}, 500);
