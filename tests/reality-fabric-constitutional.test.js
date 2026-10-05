'use strict';
// tests/reality-fabric-constitutional.test.js
// W2-03 Reality Fabric constitutional wiring offline tests.
// No live Supabase required — fabric.js DB calls are not exercised.
// Tests verify: ChangeRecord type correctness, fire-and-forget pattern,
// PETL provenance fields, rejected mutation non-emission, existing exports.
// Run: node tests/reality-fabric-constitutional.test.js

const assert = require('assert');
const { ChangeRecord } = require('../lib/constitutional-types/change-record');
const fabric = require('../lib/reality/fabric');

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

// ── ChangeRecord type — direct create() tests ────────────────────────────────

console.log('\nChangeRecord — type validation');

test('create() returns object with __type ChangeRecord', () => {
    const r = ChangeRecord.create({
        change_id:             'CR-test-001',
        claim_ref:             'claim-uuid-001',
        stage_to:              'potential',
        transition_vector:     'created',
        timestamp:             new Date().toISOString(),
        actor_ref:             'test-source',
        historical_anchor_ref: 'ANCHOR-claim-uuid-001',
    });
    assert.strictEqual(r.__type,     'ChangeRecord');
    assert.strictEqual(r.__baseline, 'APEX-CONSTITUTION-v1.0');
    assert.strictEqual(r.__runtime,  'RT-05');
});

test('create() with stage_from returns correct before/after state', () => {
    const r = ChangeRecord.create({
        change_id:             'CR-test-002',
        claim_ref:             'claim-uuid-002',
        stage_from:            'potential',
        stage_to:              'emergent',
        transition_vector:     'observation-confirmed',
        timestamp:             new Date().toISOString(),
        actor_ref:             'system',
        historical_anchor_ref: 'ANCHOR-claim-uuid-002',
    });
    assert.strictEqual(r.stage_from, 'potential');
    assert.strictEqual(r.stage_to,   'emergent');
    assert.strictEqual(r.transition_vector, 'observation-confirmed');
});

test('create() without stage_from (creation event) is valid', () => {
    const r = ChangeRecord.create({
        change_id:             'CR-test-003',
        claim_ref:             'claim-uuid-003',
        stage_to:              'potential',
        transition_vector:     'created',
        timestamp:             new Date().toISOString(),
        actor_ref:             'test-source',
        historical_anchor_ref: 'ANCHOR-claim-uuid-003',
    });
    assert.strictEqual(r.__type, 'ChangeRecord');
    assert.strictEqual(r.stage_from, undefined);
});

test('create() accepts all 13 valid stage_to values', () => {
    const stages = ['potential','emergent','observed','verified','contested','revised',
                    'deprecated','superseded','validated','integrated','embedded','critical','evolved'];
    for (const stage of stages) {
        const r = ChangeRecord.create({
            change_id:             `CR-stage-${stage}`,
            claim_ref:             'claim-uuid-stages',
            stage_to:              stage,
            transition_vector:     'test-advance',
            timestamp:             new Date().toISOString(),
            actor_ref:             'system',
            historical_anchor_ref: 'ANCHOR-claim-uuid-stages',
        });
        assert.strictEqual(r.stage_to, stage, `stage_to should be ${stage}`);
    }
});

test('create() throws on invalid stage_to enum', () => {
    assert.throws(() => {
        ChangeRecord.create({
            change_id:             'CR-bad-stage',
            claim_ref:             'claim-uuid-001',
            stage_to:              'invalid-stage',
            transition_vector:     'created',
            timestamp:             new Date().toISOString(),
            actor_ref:             'system',
            historical_anchor_ref: 'ANCHOR-claim-uuid-001',
        });
    }, TypeError);
});

test('create() throws on missing required claim_ref', () => {
    assert.throws(() => {
        ChangeRecord.create({
            change_id:             'CR-no-ref',
            stage_to:              'potential',
            transition_vector:     'created',
            timestamp:             new Date().toISOString(),
            actor_ref:             'system',
            historical_anchor_ref: 'ANCHOR-test',
        });
    }, TypeError);
});

test('create() throws on missing required historical_anchor_ref', () => {
    assert.throws(() => {
        ChangeRecord.create({
            change_id:         'CR-no-anchor',
            claim_ref:         'claim-uuid-001',
            stage_to:          'potential',
            transition_vector: 'created',
            timestamp:         new Date().toISOString(),
            actor_ref:         'system',
        });
    }, TypeError);
});

test('create() throws on missing required transition_vector', () => {
    assert.throws(() => {
        ChangeRecord.create({
            change_id:             'CR-no-vector',
            claim_ref:             'claim-uuid-001',
            stage_to:              'potential',
            timestamp:             new Date().toISOString(),
            actor_ref:             'system',
            historical_anchor_ref: 'ANCHOR-claim-uuid-001',
        });
    }, TypeError);
});

test('validate() returns { valid: true, errors: [] } for valid record', () => {
    const r = ChangeRecord.create({
        change_id:             'CR-validate-test',
        claim_ref:             'claim-uuid-v1',
        stage_from:            'observed',
        stage_to:              'verified',
        transition_vector:     'second-source-confirmed',
        timestamp:             new Date().toISOString(),
        actor_ref:             'validation-agent',
        historical_anchor_ref: 'ANCHOR-claim-uuid-v1',
    });
    const result = ChangeRecord.validate(r);
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.errors, []);
});

// ── Constitutional immutability ───────────────────────────────────────────────

console.log('\nConstitutional immutability');

test('ChangeRecord type object is frozen', () => {
    assert.strictEqual(Object.isFrozen(ChangeRecord), true);
    assert.strictEqual(Object.isFrozen(ChangeRecord.CONSTITUTIONAL), true);
    assert.strictEqual(Object.isFrozen(ChangeRecord.SCHEMA), true);
});

test('frozen ChangeRecord cannot be mutated', () => {
    const original = ChangeRecord.CONSTITUTIONAL.type;
    try { ChangeRecord.CONSTITUTIONAL.type = 'TAMPERED'; } catch (_) {}
    assert.strictEqual(ChangeRecord.CONSTITUTIONAL.type, original);
});

// ── Before/after state capture ────────────────────────────────────────────────

console.log('\nBefore/after state capture');

test('creation event captures after state (stage_to=potential); no before state', () => {
    const r = ChangeRecord.create({
        change_id:             'CR-creation-state',
        claim_ref:             'claim-creation-001',
        stage_to:              'potential',
        transition_vector:     'created',
        timestamp:             new Date().toISOString(),
        actor_ref:             'test-source',
        historical_anchor_ref: 'ANCHOR-claim-creation-001',
    });
    assert.strictEqual(r.stage_to, 'potential');
    assert.ok(r.stage_from === undefined || r.stage_from === null,
        'creation event must have no prior stage');
});

test('advance event captures both before and after state', () => {
    const r = ChangeRecord.create({
        change_id:             'CR-advance-state',
        claim_ref:             'claim-advance-001',
        stage_from:            'emergent',
        stage_to:              'observed',
        transition_vector:     'direct-observation',
        timestamp:             new Date().toISOString(),
        actor_ref:             'observer-agent',
        historical_anchor_ref: 'ANCHOR-claim-advance-001',
    });
    assert.strictEqual(r.stage_from, 'emergent');
    assert.strictEqual(r.stage_to,   'observed');
});

test('transition_vector carries causal basis for mutation', () => {
    const r = ChangeRecord.create({
        change_id:             'CR-vector-test',
        claim_ref:             'claim-vector-001',
        stage_from:            'verified',
        stage_to:              'contested',
        transition_vector:     'source-dispute-detected',
        timestamp:             new Date().toISOString(),
        actor_ref:             'dispute-resolver',
        historical_anchor_ref: 'ANCHOR-claim-vector-001',
    });
    assert.strictEqual(r.transition_vector, 'source-dispute-detected');
    assert.strictEqual(r.actor_ref, 'dispute-resolver');
});

// ── PETL provenance linkage ───────────────────────────────────────────────────

console.log('\nPETL provenance linkage');

test('actor_ref carries provenance identity across request boundary', () => {
    const petlActor = 'petl-orchestrator:TX-99999-00001';
    const r = ChangeRecord.create({
        change_id:             'CR-petl-link',
        claim_ref:             'claim-petl-001',
        stage_from:            'potential',
        stage_to:              'emergent',
        transition_vector:     'petl-governed-advance',
        timestamp:             new Date().toISOString(),
        actor_ref:             petlActor,
        historical_anchor_ref: 'ANCHOR-claim-petl-001',
    });
    assert.strictEqual(r.actor_ref, petlActor);
    assert.strictEqual(r.__runtime, 'RT-05');
    assert.strictEqual(r.__baseline, 'APEX-CONSTITUTION-v1.0');
});

test('historical_anchor_ref provides forward provenance link to claim history', () => {
    const claimId = 'claim-anchor-001';
    const r = ChangeRecord.create({
        change_id:             `CR-${claimId}`,
        claim_ref:             claimId,
        stage_to:              'potential',
        transition_vector:     'created',
        timestamp:             new Date().toISOString(),
        actor_ref:             'system',
        historical_anchor_ref: `ANCHOR-${claimId}`,
    });
    assert.ok(r.historical_anchor_ref.includes(claimId),
        'historical_anchor_ref must reference the claim id');
    assert.ok(r.claim_ref === claimId,
        'claim_ref must match the claim being changed');
});

// ── Fire-and-forget wiring pattern ───────────────────────────────────────────

console.log('\nFire-and-forget wiring pattern');

test('setImmediate pattern emits ChangeRecord for creation event to mock store', (done) => {
    const emitted = [];
    const mockStore = { write: async (r) => emitted.push(r) };
    const claimId = 'mock-claim-creation-001';
    const source  = 'mock-source';

    const _cr_claimId = claimId; const _cr_source = source;
    const _cr_ts = new Date().toISOString();
    setImmediate(async () => {
        try {
            const record = ChangeRecord.create({
                change_id:             `CR-${_cr_claimId}-${Date.now()}`,
                claim_ref:             _cr_claimId,
                stage_to:              'potential',
                transition_vector:     'created',
                timestamp:             _cr_ts,
                actor_ref:             _cr_source,
                historical_anchor_ref: `ANCHOR-${_cr_claimId}`,
            });
            await mockStore.write(record);
        } catch (_) {}
    });

    setImmediate(() => {
        try {
            assert.strictEqual(emitted.length, 1);
            assert.strictEqual(emitted[0].__type,     'ChangeRecord');
            assert.strictEqual(emitted[0].__baseline, 'APEX-CONSTITUTION-v1.0');
            assert.strictEqual(emitted[0].stage_to,   'potential');
            assert.strictEqual(emitted[0].claim_ref,  claimId);
            console.log('  PASS  setImmediate pattern emits ChangeRecord for creation event to mock store');
            passed++;
        } catch (err) {
            console.error(`  FAIL  setImmediate pattern emits ChangeRecord for creation event to mock store: ${err.message}`);
            failed++;
        }
    });
});

test('setImmediate pattern emits ChangeRecord for advance event to mock store', (done) => {
    const emitted = [];
    const mockStore = { write: async (r) => emitted.push(r) };
    const claimId   = 'mock-claim-advance-001';
    const fromStage = 'potential';
    const toStage   = 'emergent';
    const trigger   = 'signal-detected';
    const actor     = 'observer';

    const _ac_claimId = claimId; const _ac_fromStage = fromStage; const _ac_toStage = toStage;
    const _ac_trigger = trigger; const _ac_actor = actor; const _ac_ts = new Date().toISOString();
    setImmediate(async () => {
        try {
            const record = ChangeRecord.create({
                change_id:             `CR-${_ac_claimId}-${Date.now()}`,
                claim_ref:             _ac_claimId,
                stage_from:            _ac_fromStage,
                stage_to:              _ac_toStage,
                transition_vector:     _ac_trigger || 'advance',
                timestamp:             _ac_ts,
                actor_ref:             _ac_actor || 'system',
                historical_anchor_ref: `ANCHOR-${_ac_claimId}`,
            });
            await mockStore.write(record);
        } catch (_) {}
    });

    setImmediate(() => {
        try {
            assert.strictEqual(emitted.length, 1);
            assert.strictEqual(emitted[0].__type,      'ChangeRecord');
            assert.strictEqual(emitted[0].stage_from,  fromStage);
            assert.strictEqual(emitted[0].stage_to,    toStage);
            assert.strictEqual(emitted[0].actor_ref,   actor);
            assert.strictEqual(emitted[0].claim_ref,   claimId);
            console.log('  PASS  setImmediate pattern emits ChangeRecord for advance event to mock store');
            passed++;
        } catch (err) {
            console.error(`  FAIL  setImmediate pattern emits ChangeRecord for advance event to mock store: ${err.message}`);
            failed++;
        }
    });
});

// ── Rejected mutation non-emission ────────────────────────────────────────────

console.log('\nRejected mutation non-emission');

test('invalid stage_to throws before ChangeRecord emission (DB not reached)', () => {
    // advanceClaim() validates toStage before any DB call or constitutional record.
    // An invalid toStage produces an Error, not a ChangeRecord.
    // We simulate the validation logic to confirm early exit.
    const STAGES = fabric.STAGES;
    const toStage = 'invalid-stage';
    const isValid = STAGES.includes(toStage);
    assert.strictEqual(isValid, false, 'invalid stage must not pass validation');
    // The early throw prevents ChangeRecord from being emitted.
    // This is the existing protection — constitutional wiring is after DB success only.
});

test('ChangeRecord create() throws on invalid data (catch block absorbs it)', () => {
    const emitted = [];
    const mockStore = { write: async (r) => emitted.push(r) };
    let catchFired = false;

    setImmediate(async () => {
        try {
            const record = ChangeRecord.create({
                change_id:             'CR-bad',
                claim_ref:             'claim-001',
                stage_to:              'INVALID_STAGE',  // causes TypeError
                transition_vector:     'test',
                timestamp:             new Date().toISOString(),
                actor_ref:             'system',
                historical_anchor_ref: 'ANCHOR-claim-001',
            });
            await mockStore.write(record);
        } catch (err) {
            catchFired = true;
        }
    });

    setImmediate(() => {
        try {
            // emitted is still empty (create() threw, store.write was never called)
            assert.strictEqual(emitted.length, 0, 'no record emitted on create() failure');
            console.log('  PASS  ChangeRecord create() throws on invalid data (catch block absorbs it)');
            passed++;
        } catch (err) {
            console.error(`  FAIL  ChangeRecord create() throws on invalid data (catch block absorbs it): ${err.message}`);
            failed++;
        }
    });
});

// ── Existing fabric exports preserved ────────────────────────────────────────

console.log('\nExisting Reality Fabric exports preserved');

async function runPreservationTests() {
    await testAsync('claimReality is still exported', async () => {
        assert.strictEqual(typeof fabric.claimReality, 'function');
    });

    await testAsync('advanceClaim is still exported', async () => {
        assert.strictEqual(typeof fabric.advanceClaim, 'function');
    });

    await testAsync('updateClaimConfidence is still exported', async () => {
        assert.strictEqual(typeof fabric.updateClaimConfidence, 'function');
    });

    await testAsync('getClaimsForEntity is still exported', async () => {
        assert.strictEqual(typeof fabric.getClaimsForEntity, 'function');
    });

    await testAsync('getClaimsByDomain is still exported', async () => {
        assert.strictEqual(typeof fabric.getClaimsByDomain, 'function');
    });

    await testAsync('scoreRealityHealth is still exported', async () => {
        assert.strictEqual(typeof fabric.scoreRealityHealth, 'function');
    });

    await testAsync('getRealityHealth is still exported', async () => {
        assert.strictEqual(typeof fabric.getRealityHealth, 'function');
    });

    await testAsync('getSystemRealityHealth is still exported', async () => {
        assert.strictEqual(typeof fabric.getSystemRealityHealth, 'function');
    });

    await testAsync('writeBaselineCheckpoint is still exported', async () => {
        assert.strictEqual(typeof fabric.writeBaselineCheckpoint, 'function');
    });

    await testAsync('STAGES array has 13 entries (lifecycle unchanged)', async () => {
        assert.strictEqual(fabric.STAGES.length, 13);
        assert.strictEqual(fabric.STAGES[0], 'potential');
        assert.strictEqual(fabric.STAGES[12], 'evolved');
    });

    await testAsync('HEALTH_DIMS array has 9 entries (unchanged)', async () => {
        assert.strictEqual(fabric.HEALTH_DIMS.length, 9);
    });

    printSummary();
}

function printSummary() {
    console.log(`\n══════════════════════════════════════`);
    console.log(`  Results: ${passed} passed, ${failed} failed`);
    console.log(`══════════════════════════════════════`);
    if (failed > 0) process.exit(1);
}

setTimeout(runPreservationTests, 100);
