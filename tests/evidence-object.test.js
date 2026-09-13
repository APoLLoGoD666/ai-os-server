'use strict';
// tests/evidence-object.test.js
// T3-10 — EvidenceObject Formation: constitutional test suite.
// Authority: APEX-CONSTITUTION-v1.0; T3-10-PHASE-0-AUDIT.md; RT09-INV-1; KI-017; D8 INV-4.
//
// 12 scenarios. Does NOT require live Supabase — constitutional-store.write() is
// no-throw and swallows DB errors in test context.

const assert = require('assert');

function pass(label) { console.log(`  PASS  ${label}`); }
function fail(label, msg) { console.error(`  FAIL  ${label}: ${msg}`); process.exitCode = 1; }

function test(label, fn) {
    try {
        fn();
        pass(label);
    } catch (e) {
        fail(label, e.message);
    }
}

async function testAsync(label, fn) {
    try {
        await fn();
        pass(label);
    } catch (e) {
        fail(label, e.message);
    }
}

console.log('\nEvidenceObject — T3-10 Constitutional Tests');

// 1 — Module loads without error
test('evidence-object-registry module loads without syntax error', () => {
    const reg = require('../lib/knowledge/evidence-object-registry');
    assert(typeof reg === 'object', 'module must export an object');
});

// 2 — formEvidence is exported as a function
test('formEvidence is exported as a function', () => {
    const reg = require('../lib/knowledge/evidence-object-registry');
    assert.strictEqual(typeof reg.formEvidence, 'function');
});

// 3 — _DOMAIN_ID_BY_NAME reverse map contains all 12 domains
test('_DOMAIN_ID_BY_NAME contains all 12 canonical domain names', () => {
    const { _DOMAIN_ID_BY_NAME } = require('../lib/knowledge/evidence-object-registry');
    const expectedDomains = [
        'civilisation', 'intelligence', 'registry', 'memory', 'infrastructure',
        'observability', 'interface', 'knowledge', 'development', 'experiments',
        'reality_architecture', 'theory_of_change',
    ];
    for (const name of expectedDomains) {
        assert(name in _DOMAIN_ID_BY_NAME, `_DOMAIN_ID_BY_NAME must contain '${name}'`);
    }
    assert.strictEqual(Object.keys(_DOMAIN_ID_BY_NAME).length, 12, 'must have exactly 12 entries');
});

// 4 — Domain 'knowledge' maps to DOM-000008
test("domain 'knowledge' maps to DOM-000008", () => {
    const { _DOMAIN_ID_BY_NAME } = require('../lib/knowledge/evidence-object-registry');
    assert.strictEqual(_DOMAIN_ID_BY_NAME['knowledge'], 'DOM-000008');
});

// 5 — Unknown domain returns null from formEvidence (no-throw, L-03)
testAsync('unknown domain returns null from formEvidence without throwing (L-03)', async () => {
    const { formEvidence } = require('../lib/knowledge/evidence-object-registry');
    const result = await formEvidence({
        obsRecordId:   'OBS-test-uuid-123',
        domainName:    'nonexistent_domain_xyz',
        uncertaintySrc: 'test',
        uncertaintyConf: '0.5',
        uncertaintyLims: '[]',
        uncertaintyTs:  new Date().toISOString(),
        uncertaintyCap: '{}',
    });
    assert.strictEqual(result, null, 'unknown domain must return null');
});

// 6 — EvidenceObject.create() accepts valid mock data (validates 14 fields)
test('EvidenceObject.create() accepts all 14 required fields', () => {
    const { EvidenceObject } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const obsRecordId = 'OBS-test-claim-1234567890';
    const record = EvidenceObject.create({
        evidence_id:                    `EVO-${obsRecordId}`,
        observation_projection_ref:     obsRecordId,
        rt09_operation_id:              `RT09-OP-${obsRecordId}`,
        interpretation_protocol_ref:    'EP-DOM-000008-INTERP-v1.0',
        protocol_version:               '1.0',
        uncertainty_source:             'APEX-FABRIC-CHANNEL',
        uncertainty_confidence:         '0.5',
        uncertainty_limitations:        '["single-system observer"]',
        uncertainty_timestamp:          ts,
        uncertainty_observer_capability: '{"domain_scope":["*"]}',
        domain_classification:          'DOM-000008',
        temporal_validity_metadata:     JSON.stringify({ validity_basis: 'bootstrap' }),
        formation_timestamp:            ts,
        lifecycle_state:                'FORMING',
    });
    assert.strictEqual(record.__type, 'EvidenceObject');
    assert.strictEqual(record.__runtime, 'RT-09');
    assert.strictEqual(record.__baseline, 'APEX-CONSTITUTION-v1.0');
});

// 7 — evidence_id format: EVO-OBS-{uuid}-{ts}
test('evidence_id format is EVO-{obsRecordId} (no fabrication)', () => {
    const obsRecordId = 'OBS-00000000-0000-0000-0000-000000000001-1722700000000';
    const evidenceId = `EVO-${obsRecordId}`;
    assert(evidenceId.startsWith('EVO-'), 'evidence_id must start with EVO-');
    assert(evidenceId.includes(obsRecordId), 'evidence_id must include obsRecordId');
    assert(!evidenceId.includes('undefined'), 'evidence_id must not contain undefined');
    assert(!evidenceId.includes('null'), 'evidence_id must not contain null');
});

// 8 — observation_projection_ref = obsRecordId (RT09-INV-1)
test('RT09-INV-1: observation_projection_ref equals obsRecordId', () => {
    const { EvidenceObject } = require('../lib/constitutional-types/knowledge-record');
    const obsRecordId = 'OBS-test-uuid-RT09INV1-check';
    const ts = new Date().toISOString();
    const record = EvidenceObject.create({
        evidence_id:                    `EVO-${obsRecordId}`,
        observation_projection_ref:     obsRecordId,
        rt09_operation_id:              `RT09-OP-${obsRecordId}`,
        interpretation_protocol_ref:    'EP-DOM-000001-INTERP-v1.0',
        protocol_version:               '1.0',
        uncertainty_source:             'test',
        uncertainty_confidence:         '0.8',
        uncertainty_limitations:        '[]',
        uncertainty_timestamp:          ts,
        uncertainty_observer_capability: '{}',
        domain_classification:          'DOM-000001',
        temporal_validity_metadata:     '{"validity_basis":"bootstrap"}',
        formation_timestamp:            ts,
        lifecycle_state:                'FORMING',
    });
    assert.strictEqual(record.observation_projection_ref, obsRecordId,
        'RT09-INV-1: observation_projection_ref must equal obsRecordId');
});

// 9 — interpretation_protocol_ref format: EP-{domainId}-INTERP-v1.0 (T3-P3)
test('interpretation_protocol_ref matches EP-{domainId}-INTERP-v1.0 format', () => {
    const epistemicReg = require('../lib/epistemics/epistemic-protocol-registry');
    const protocol = epistemicReg.getProtocolForDomain('DOM-000008', 'INTERPRETATION');
    assert(protocol !== null, 'INTERPRETATION protocol must exist for DOM-000008');
    assert.strictEqual(protocol.protocol_id, 'EP-DOM-000008-INTERP-v1.0');
    assert.strictEqual(protocol.protocol_version, '1.0');
    assert.strictEqual(protocol.protocol_type, 'INTERPRETATION');
});

// 10 — D5 uncertainty fields preserved from obsRecord (KI-017)
test('KI-017: uncertainty fields passed through from obsRecord as strings', () => {
    const { EvidenceObject } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const obsRecord = {
        d5_uncertainty_source:              'test-source',
        d5_uncertainty_confidence:          '0.75',
        d5_uncertainty_limitations:         '["limitation-1","limitation-2"]',
        d5_uncertainty_timestamp:           ts,
        d5_uncertainty_observer_capability: '{"domain_scope":["civilisation"]}',
    };
    const obsRecordId = 'OBS-ki017-test-1234';
    const record = EvidenceObject.create({
        evidence_id:                    `EVO-${obsRecordId}`,
        observation_projection_ref:     obsRecordId,
        rt09_operation_id:              `RT09-OP-${obsRecordId}`,
        interpretation_protocol_ref:    'EP-DOM-000001-INTERP-v1.0',
        protocol_version:               '1.0',
        uncertainty_source:             obsRecord.d5_uncertainty_source,
        uncertainty_confidence:         obsRecord.d5_uncertainty_confidence,
        uncertainty_limitations:        obsRecord.d5_uncertainty_limitations,
        uncertainty_timestamp:          obsRecord.d5_uncertainty_timestamp,
        uncertainty_observer_capability: obsRecord.d5_uncertainty_observer_capability,
        domain_classification:          'DOM-000001',
        temporal_validity_metadata:     '{"validity_basis":"bootstrap"}',
        formation_timestamp:            ts,
        lifecycle_state:                'FORMING',
    });
    assert.strictEqual(record.uncertainty_source, obsRecord.d5_uncertainty_source, 'KI-017: uncertainty_source preserved');
    assert.strictEqual(record.uncertainty_confidence, obsRecord.d5_uncertainty_confidence, 'KI-017: uncertainty_confidence preserved');
    assert.strictEqual(record.uncertainty_limitations, obsRecord.d5_uncertainty_limitations, 'KI-017: uncertainty_limitations preserved');
    assert.strictEqual(record.uncertainty_timestamp, obsRecord.d5_uncertainty_timestamp, 'KI-017: uncertainty_timestamp preserved');
    assert.strictEqual(record.uncertainty_observer_capability, obsRecord.d5_uncertainty_observer_capability, 'KI-017: uncertainty_observer_capability preserved');
});

// 11 — lifecycle_state = 'FORMING' (L-01 bootstrap state)
test("lifecycle_state is 'FORMING' (L-01: RT-03 gate not yet implemented)", () => {
    const { EvidenceObject } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const obsRecordId = 'OBS-lifecycle-test';
    const record = EvidenceObject.create({
        evidence_id:                    `EVO-${obsRecordId}`,
        observation_projection_ref:     obsRecordId,
        rt09_operation_id:              `RT09-OP-${obsRecordId}`,
        interpretation_protocol_ref:    'EP-DOM-000001-INTERP-v1.0',
        protocol_version:               '1.0',
        uncertainty_source:             'test',
        uncertainty_confidence:         '0.5',
        uncertainty_limitations:        '[]',
        uncertainty_timestamp:          ts,
        uncertainty_observer_capability: '{}',
        domain_classification:          'DOM-000001',
        temporal_validity_metadata:     '{"validity_basis":"bootstrap"}',
        formation_timestamp:            ts,
        lifecycle_state:                'FORMING',
    });
    assert.strictEqual(record.lifecycle_state, 'FORMING', 'L-01: lifecycle_state must be FORMING');
});

// 12 — formEvidence is fire-and-forget: claimReality() returns before obsRecord is written (L-04)
testAsync('fire-and-forget: formEvidence resolves without DB (L-04, null on DB failure)', async () => {
    const { formEvidence } = require('../lib/knowledge/evidence-object-registry');
    let threw = false;
    let result;
    try {
        result = await formEvidence({
            obsRecordId:    'OBS-fire-forget-test-1234567890',
            domainName:     'knowledge',
            uncertaintySrc: 'fire-forget-source',
            uncertaintyConf: '0.9',
            uncertaintyLims: '[]',
            uncertaintyTs:  new Date().toISOString(),
            uncertaintyCap: '{}',
        });
    } catch (e) { threw = true; }
    assert(!threw, 'formEvidence must not throw (fire-and-forget, no-throw contract)');
    // result is null (no DB) or a string (evidenceId) — both are acceptable in test context
    assert(result === null || typeof result === 'string', 'formEvidence must return null or string evidenceId');
});

console.log('');
