'use strict';
// tests/observation-record-integration.test.js
// T3-07 ObservationRecord Integration — constitutional tests.
// Run: node tests/observation-record-integration.test.js
// No live Supabase required.

const { createUncertaintyDescriptor, validateUncertaintyDescriptor } = require('../lib/reality/d5-uncertainty');
const observerRegistry  = require('../lib/reality/observer-registry');
const channelRegistry   = require('../lib/reality/observation-channel-registry');
const { createObserverLimitationRecord, validateLimitationRecord } = require('../lib/reality/observer-limitations');
const authorityRegistry = require('../lib/authority/authority-registry');
const constitutionalStore = require('../lib/runtime/constitutional-store');
const fabric = require('../lib/reality/fabric');

let _obsSeq = 0;

// ── Minimal test harness ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

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

async function testAsync(name, fn) {
    try {
        await fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (e) {
        console.error(`  FAIL  ${name}\n        ${e.message}`);
        failed++;
    }
}

function assertEqual(a, b, msg) {
    if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function assertThrows(fn, msgFragment) {
    let threw = false;
    try { fn(); } catch (e) {
        threw = true;
        if (msgFragment && !e.message.toLowerCase().includes(msgFragment.toLowerCase())) {
            throw new Error(`Expected error containing "${msgFragment}", got: ${e.message}`);
        }
    }
    if (!threw) throw new Error('Expected function to throw but it did not');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const APEX_OBSERVER_ID  = 'APEX-SYSTEM-OBSERVER';
const APEX_CHANNEL_ID   = 'APEX-FABRIC-CHANNEL';
const APEX_AUTHORITY_ID = 'AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP';

function apexCapabilityProfile() {
    return {
        domain_scope:       ['*'],
        observation_types:  ['CLAIM', 'STATE', 'TRANSITION'],
        calibration_basis:  'APEX-CONSTITUTION-v1.0',
        known_limitations:  ['single-system observer', 'no external verification'],
    };
}

function _ensureTestAuthorityBootstrap() {
    if (!authorityRegistry.getAuthorityGrant(APEX_AUTHORITY_ID)) {
        authorityRegistry.registerAuthorityGrant({
            authority_id:   APEX_AUTHORITY_ID,
            subject_ref:    APEX_OBSERVER_ID,
            subject_type:   'SYSTEM',
            authority_type: 'OBSERVATION',
            grant_scope:    'REALITY_CLAIMS_OBSERVATION — lib/reality/fabric.js:claimReality()',
            granted_by:     'APEX-CONSTITUTION-v1.0',
            expiry_timestamp: null,
            limitations: [
                'bootstrap authority — no FoundingRatification chain (D3 GI-5; T3-09+ scope)',
            ],
        });
    }
}

function buildObsRecord(overrides = {}) {
    _ensureTestAuthorityBootstrap();
    const obsRecordId = `OBS-TEST-${Date.now()}-${++_obsSeq}`;
    const d5 = createUncertaintyDescriptor({
        uncertainty_source:             'test-source',
        uncertainty_confidence:         0.75,
        uncertainty_limitations:        ['single-system observer'],
        uncertainty_observer_capability: apexCapabilityProfile(),
    });
    const limitation = createObserverLimitationRecord({
        observer_id:           APEX_OBSERVER_ID,
        observation_record_ref: obsRecordId,
        capability_snapshot:   apexCapabilityProfile(),
    });
    return Object.assign({
        __type:               'ObservationRecord',
        __runtime:            'RT-08',
        __baseline:           'APEX-CONSTITUTION-v1.0',
        __version:            '1.0.0',
        __wave:               'W3-T3-07',
        __structural_immutable: true,
        record_id:                     obsRecordId,
        observer_identity_ref:         APEX_OBSERVER_ID,
        observation_channel_ref:       APEX_CHANNEL_ID,
        external_referent_id:          'entity-test-001',
        external_state_description:    'Test state description',
        d5_uncertainty_source:         d5.uncertainty_source,
        d5_uncertainty_confidence:     String(d5.uncertainty_confidence),
        d5_uncertainty_limitations:    JSON.stringify(d5.uncertainty_limitations),
        d5_uncertainty_timestamp:      d5.uncertainty_timestamp,
        d5_uncertainty_observer_capability: JSON.stringify(d5.uncertainty_observer_capability),
        domain_attribution:            'test-domain',
        internal_external_marker:      true,
        authority_ref:                 APEX_AUTHORITY_ID,
        contact_timestamp:             d5.uncertainty_timestamp,
        formation_timestamp:           d5.uncertainty_timestamp,
        observer_limitation_ref:       limitation.limitation_id,
    }, overrides);
}

// ── Test 1: ObservationRecord fields are correctly assembled ──────────────────

console.log('\n  T3-07 ObservationRecord Integration Tests\n');

test('ObservationRecord: __type stamp is ObservationRecord', () => {
    const rec = buildObsRecord();
    assertEqual(rec.__type, 'ObservationRecord');
});

test('ObservationRecord: __runtime stamp is RT-08', () => {
    const rec = buildObsRecord();
    assertEqual(rec.__runtime, 'RT-08');
});

test('ObservationRecord: __baseline stamp is APEX-CONSTITUTION-v1.0', () => {
    const rec = buildObsRecord();
    assertEqual(rec.__baseline, 'APEX-CONSTITUTION-v1.0');
});

// ── Test 2: record_id generated ───────────────────────────────────────────────

test('record_id is a non-empty string starting with OBS-', () => {
    const rec = buildObsRecord();
    if (typeof rec.record_id !== 'string') throw new Error('record_id not a string');
    if (!rec.record_id.startsWith('OBS-')) throw new Error(`record_id does not start with OBS-: ${rec.record_id}`);
});

test('record_id is unique across two calls', () => {
    const a = buildObsRecord();
    const b = buildObsRecord();
    if (a.record_id === b.record_id) throw new Error('record_id not unique across calls');
});

// ── Test 3: observer_identity_ref resolves ────────────────────────────────────

test('observer_identity_ref resolves to registered observer', () => {
    // Ensure APEX-SYSTEM-OBSERVER is registered (fabric.js bootstrap)
    if (!observerRegistry.getObserver(APEX_OBSERVER_ID)) {
        observerRegistry.registerObserver({
            observer_id:        APEX_OBSERVER_ID,
            observer_type:      'SYSTEM',
            observer_name:      'APEX Constitutional Self-Observer',
            capability_profile: apexCapabilityProfile(),
            limitation_ref:     null,
        });
    }
    const rec = buildObsRecord();
    const observer = observerRegistry.getObserver(rec.observer_identity_ref);
    if (!observer) throw new Error(`observer_identity_ref '${rec.observer_identity_ref}' does not resolve in registry`);
    assertEqual(observer.observer_id, APEX_OBSERVER_ID);
});

// ── Test 4: observation_channel_ref resolves ──────────────────────────────────

test('observation_channel_ref resolves to registered channel', () => {
    if (!observerRegistry.getObserver(APEX_OBSERVER_ID)) {
        observerRegistry.registerObserver({
            observer_id:        APEX_OBSERVER_ID,
            observer_type:      'SYSTEM',
            observer_name:      'APEX Constitutional Self-Observer',
            capability_profile: apexCapabilityProfile(),
            limitation_ref:     null,
        });
    }
    if (!channelRegistry.getChannel(APEX_CHANNEL_ID)) {
        channelRegistry.registerChannel({
            channel_id:        APEX_CHANNEL_ID,
            channel_name:      'APEX Reality Fabric Internal Channel',
            channel_type:      'INTERNAL',
            observer_ref:      APEX_OBSERVER_ID,
            observation_scope: 'REALITY_CLAIMS',
            observation_method: 'CLAIM_FORMATION',
        });
    }
    const rec = buildObsRecord();
    const channel = channelRegistry.getChannel(rec.observation_channel_ref);
    if (!channel) throw new Error(`observation_channel_ref '${rec.observation_channel_ref}' does not resolve in registry`);
    assertEqual(channel.channel_id, APEX_CHANNEL_ID);
});

// ── Test 5: D5 descriptor validates ──────────────────────────────────────────

test('D5 descriptor created from claim context validates', () => {
    const d5 = createUncertaintyDescriptor({
        uncertainty_source:             'test-actor',
        uncertainty_confidence:         0.8,
        uncertainty_limitations:        ['bootstrap', 'single-system'],
        uncertainty_observer_capability: apexCapabilityProfile(),
    });
    const result = validateUncertaintyDescriptor(d5);
    if (!result.valid) throw new Error(`D5 descriptor invalid: ${result.errors.join('; ')}`);
});

test('D5 timestamp in ObservationRecord is valid ISO', () => {
    const rec = buildObsRecord();
    if (Number.isNaN(Date.parse(rec.d5_uncertainty_timestamp))) {
        throw new Error('d5_uncertainty_timestamp is not a valid ISO timestamp');
    }
});

test('D5 confidence is stringified in ObservationRecord', () => {
    const rec = buildObsRecord();
    if (typeof rec.d5_uncertainty_confidence !== 'string') {
        throw new Error('d5_uncertainty_confidence should be string in ObservationRecord');
    }
    const parsed = parseFloat(rec.d5_uncertainty_confidence);
    if (isNaN(parsed) || parsed < 0 || parsed > 1) {
        throw new Error(`d5_uncertainty_confidence parses to invalid value: ${rec.d5_uncertainty_confidence}`);
    }
});

test('D5 limitations are JSON-stringified array in ObservationRecord', () => {
    const rec = buildObsRecord();
    if (typeof rec.d5_uncertainty_limitations !== 'string') {
        throw new Error('d5_uncertainty_limitations should be JSON string in ObservationRecord');
    }
    const parsed = JSON.parse(rec.d5_uncertainty_limitations);
    if (!Array.isArray(parsed)) throw new Error('d5_uncertainty_limitations does not parse to array');
});

test('D5 observer capability is JSON-stringified object in ObservationRecord', () => {
    const rec = buildObsRecord();
    if (typeof rec.d5_uncertainty_observer_capability !== 'string') {
        throw new Error('d5_uncertainty_observer_capability should be JSON string in ObservationRecord');
    }
    const parsed = JSON.parse(rec.d5_uncertainty_observer_capability);
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        throw new Error('d5_uncertainty_observer_capability does not parse to object');
    }
});

// ── Test 6: constitutional-store.write() receives record ──────────────────────

testAsync('constitutional-store.write() accepts ObservationRecord without throwing', async () => {
    const rec = buildObsRecord();
    // write() is no-throw — any Supabase error is caught internally
    // In test environment without SUPABASE_URL, write() will catch and log the error
    // but must NOT throw to the caller.
    await constitutionalStore.write(rec);
    // If we reach here without throwing, the no-throw contract is satisfied.
});

test('ObservationRecord has constitutional type stamps required by constitutional-store', () => {
    const rec = buildObsRecord();
    // constitutional-store.write() uses record.__type, record.__baseline, record.__runtime
    if (!rec.__type)     throw new Error('__type missing');
    if (!rec.__runtime)  throw new Error('__runtime missing');
    if (!rec.__baseline) throw new Error('__baseline missing');
    assertEqual(rec.__type,    'ObservationRecord');
    assertEqual(rec.__runtime, 'RT-08');
});

// ── Test 7: No exceptions on persistence failure ──────────────────────────────

testAsync('No exception propagates from constitutional-store.write() on Supabase failure', async () => {
    // write() is fire-and-forget and no-throw — Supabase errors are caught internally
    const rec = buildObsRecord();
    let threw = false;
    try {
        await constitutionalStore.write(rec);
    } catch (e) {
        threw = true;
    }
    if (threw) throw new Error('constitutional-store.write() threw — no-throw contract violated');
});

// ── Test 8: Frozen exports remain frozen ──────────────────────────────────────

test('d5-uncertainty module exports are frozen', () => {
    const d5mod = require('../lib/reality/d5-uncertainty');
    if (!Object.isFrozen(d5mod)) throw new Error('d5-uncertainty exports not frozen');
});

test('observer-registry module exports are frozen', () => {
    if (!Object.isFrozen(observerRegistry)) throw new Error('observer-registry exports not frozen');
});

test('observation-channel-registry module exports are frozen', () => {
    if (!Object.isFrozen(channelRegistry)) throw new Error('observation-channel-registry exports not frozen');
});

test('observer-limitations module exports are frozen', () => {
    const olmod = require('../lib/reality/observer-limitations');
    if (!Object.isFrozen(olmod)) throw new Error('observer-limitations exports not frozen');
});

test('constitutional-store module exports are frozen', () => {
    if (!Object.isFrozen(constitutionalStore)) throw new Error('constitutional-store exports not frozen');
});

// ── Test 9: Existing Reality Fabric exports unchanged ─────────────────────────

test('fabric.js exports claimReality function', () => {
    if (typeof fabric.claimReality !== 'function') throw new Error('claimReality not exported from fabric.js');
});

test('fabric.js exports advanceClaim function', () => {
    if (typeof fabric.advanceClaim !== 'function') throw new Error('advanceClaim not exported');
});

test('fabric.js STAGES array has 13 entries (unchanged)', () => {
    if (!Array.isArray(fabric.STAGES)) throw new Error('STAGES not exported');
    if (fabric.STAGES.length !== 13) throw new Error(`STAGES has ${fabric.STAGES.length} entries, expected 13`);
});

test('fabric.js HEALTH_DIMS array has 9 entries (unchanged)', () => {
    if (!Array.isArray(fabric.HEALTH_DIMS)) throw new Error('HEALTH_DIMS not exported');
    if (fabric.HEALTH_DIMS.length !== 9) throw new Error(`HEALTH_DIMS has ${fabric.HEALTH_DIMS.length} entries, expected 9`);
});

// ── Observer limitation record tests ─────────────────────────────────────────

test('createObserverLimitationRecord produces valid limitation record', () => {
    const rec = createObserverLimitationRecord({
        observer_id:           APEX_OBSERVER_ID,
        observation_record_ref: 'OBS-TEST-001',
        capability_snapshot:   apexCapabilityProfile(),
    });
    const result = validateLimitationRecord(rec);
    if (!result.valid) throw new Error(`Limitation record invalid: ${result.errors.join('; ')}`);
});

test('limitation_id starts with OLR-', () => {
    const rec = createObserverLimitationRecord({
        observer_id:           APEX_OBSERVER_ID,
        observation_record_ref: 'OBS-TEST-002',
    });
    if (!rec.limitation_id.startsWith('OLR-')) throw new Error(`limitation_id does not start with OLR-: ${rec.limitation_id}`);
});

test('limitation record is frozen', () => {
    const rec = createObserverLimitationRecord({
        observer_id:           APEX_OBSERVER_ID,
        observation_record_ref: 'OBS-TEST-003',
    });
    if (!Object.isFrozen(rec)) throw new Error('Limitation record is not frozen');
});

test('pi_10_compliance_attestation is true (D5 PI-10)', () => {
    const rec = createObserverLimitationRecord({
        observer_id:           APEX_OBSERVER_ID,
        observation_record_ref: 'OBS-TEST-004',
    });
    if (rec.pi_10_compliance_attestation !== true) throw new Error('pi_10_compliance_attestation must be true');
});

test('observer_limitation_ref in ObservationRecord matches limitation_id', () => {
    const obsId = `OBS-LINK-TEST-${Date.now()}`;
    const limitation = createObserverLimitationRecord({
        observer_id:           APEX_OBSERVER_ID,
        observation_record_ref: obsId,
    });
    const rec = buildObsRecord({
        record_id:              obsId,
        observer_limitation_ref: limitation.limitation_id,
    });
    assertEqual(rec.observer_limitation_ref, limitation.limitation_id);
});

// ── Channel registry tests ────────────────────────────────────────────────────

test('channel-registry: registerChannel creates frozen record', () => {
    const ch = channelRegistry.registerChannel({
        channel_id:        `TEST-CH-${Date.now()}`,
        channel_name:      'Test Channel',
        channel_type:      'INTERNAL',
        observer_ref:      APEX_OBSERVER_ID,
        observation_scope: 'TEST',
        observation_method: 'TEST_METHOD',
    });
    if (!Object.isFrozen(ch)) throw new Error('Channel record not frozen');
});

test('channel-registry: getChannel returns null for unknown id', () => {
    const result = channelRegistry.getChannel('CHANNEL-THAT-DOES-NOT-EXIST-XYZ');
    if (result !== null) throw new Error(`Expected null, got ${JSON.stringify(result)}`);
});

test('channel-registry: validateChannel rejects null', () => {
    const result = channelRegistry.validateChannel(null);
    if (result.valid) throw new Error('Expected valid=false for null');
});

test('channel-registry: duplicate channel_id rejected', () => {
    const id = `DEDUP-CH-${Date.now()}`;
    channelRegistry.registerChannel({
        channel_id:        id,
        channel_name:      'Dedup Test',
        channel_type:      'INTERNAL',
        observer_ref:      APEX_OBSERVER_ID,
        observation_scope: 'TEST',
        observation_method: 'TEST',
    });
    assertThrows(
        () => channelRegistry.registerChannel({
            channel_id:        id,
            channel_name:      'Dedup Test 2',
            channel_type:      'INTERNAL',
            observer_ref:      APEX_OBSERVER_ID,
            observation_scope: 'TEST',
            observation_method: 'TEST',
        }),
        'already registered'
    );
});

// ── D8 invariants ─────────────────────────────────────────────────────────────

test('internal_external_marker is always true (D5 PI-2)', () => {
    const rec = buildObsRecord();
    if (rec.internal_external_marker !== true) throw new Error('internal_external_marker must be true — record ≠ referent');
});

test('authority_ref is present and a non-empty string (T3-08)', () => {
    const rec = buildObsRecord();
    if (typeof rec.authority_ref !== 'string' || rec.authority_ref.trim() === '') {
        throw new Error('authority_ref must be a non-empty string after T3-08');
    }
});

test('authority_ref resolves to registered ACTIVE authority grant', () => {
    const rec = buildObsRecord();
    const grant = authorityRegistry.getAuthorityGrant(rec.authority_ref);
    if (!grant) throw new Error(`authority_ref '${rec.authority_ref}' does not resolve in authority registry`);
    if (grant.status !== 'ACTIVE') throw new Error(`Expected ACTIVE grant, got ${grant.status}`);
    if (grant.subject_ref !== APEX_OBSERVER_ID) throw new Error(`grant.subject_ref mismatch: ${grant.subject_ref}`);
});

test('authority-registry module exports are frozen', () => {
    if (!Object.isFrozen(authorityRegistry)) throw new Error('authority-registry exports not frozen');
});

test('ObservationRecord without authority_ref fails schema validation', () => {
    const { ObservationRecord } = require('../lib/constitutional-types/observation-record');
    const rec = buildObsRecord();
    const withoutAuth = Object.assign({}, rec);
    delete withoutAuth.authority_ref;
    const result = ObservationRecord.validate(withoutAuth);
    if (result.valid) throw new Error('Expected validation failure — authority_ref required');
    if (!result.errors.some(e => e.includes('authority_ref'))) {
        throw new Error('Expected authority_ref error, got: ' + result.errors.join('; '));
    }
});

test('formation_timestamp is valid ISO', () => {
    const rec = buildObsRecord();
    if (Number.isNaN(Date.parse(rec.formation_timestamp))) {
        throw new Error('formation_timestamp is not valid ISO');
    }
});

// ── Summary ───────────────────────────────────────────────────────────────────

// Drain pending setImmediates before summary
setImmediate(() => {
    console.log(`\n  Results: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
});
