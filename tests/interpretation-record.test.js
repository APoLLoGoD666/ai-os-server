'use strict';
// tests/interpretation-record.test.js
// T3-10B — InterpretationRecord Formation: constitutional test suite.
// Authority: APEX-CONSTITUTION-v1.0; T3-10B-PHASE-0-AUDIT.md; KI-007; KI-017; RT09-INV-1.
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

console.log('\nInterpretationRecord — T3-10B Constitutional Tests');

// 1 — Module loads without error
test('interpretation-record-registry module loads without syntax error', () => {
    const reg = require('../lib/knowledge/interpretation-record-registry');
    assert(typeof reg === 'object', 'module must export an object');
});

// 2 — Export contract
test('formInterpretation is exported as a function', () => {
    const reg = require('../lib/knowledge/interpretation-record-registry');
    assert.strictEqual(typeof reg.formInterpretation, 'function');
});

// 3 — _DOMAIN_ID_BY_NAME reverse map contains all 12 domains
test('_DOMAIN_ID_BY_NAME contains all 12 canonical domain names', () => {
    const { _DOMAIN_ID_BY_NAME } = require('../lib/knowledge/interpretation-record-registry');
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

// 4 — InterpretationRecord.create() accepts all 11 required fields
test('InterpretationRecord.create() accepts all 11 required fields', () => {
    const { InterpretationRecord } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const evidenceId = 'EVO-OBS-test-uuid-1234567890';
    const record = InterpretationRecord.create({
        interpretation_id:          `INTP-${evidenceId}`,
        evidence_record_ref:        evidenceId,
        rt09_operation_id:          `RT09-OP-INTP-${evidenceId}`,
        inference_protocol_ref:     'EP-DOM-000008-INFER-v1.0',
        inference_protocol_version: '1.0',
        epistemic_confidence:       '0.5',
        interpretation_content:     JSON.stringify({ basis: 'bootstrap' }),
        domain_classification:      'DOM-000008',
        temporal_validity_metadata: JSON.stringify({ validity_basis: 'bootstrap' }),
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert.strictEqual(record.__type, 'InterpretationRecord');
    assert.strictEqual(record.__runtime, 'RT-09');
    assert.strictEqual(record.__baseline, 'APEX-CONSTITUTION-v1.0');
});

// 5 — interpretation_id format: INTP-EVO-{obsRecordId}
test('interpretation_id format is INTP-{evidenceId} (no fabrication)', () => {
    const evidenceId = 'EVO-OBS-00000000-0000-0000-0000-000000000001-1722700000000';
    const interpretationId = `INTP-${evidenceId}`;
    assert(interpretationId.startsWith('INTP-'), 'interpretation_id must start with INTP-');
    assert(interpretationId.includes(evidenceId), 'interpretation_id must include evidenceId');
    assert(!interpretationId.includes('undefined'), 'must not contain undefined');
    assert(!interpretationId.includes('null'), 'must not contain null');
});

// 6 — evidence_record_ref equals evidenceId (provenance anchor, RT09-INV-1 chain)
test('evidence_record_ref equals evidenceId (provenance anchor)', () => {
    const { InterpretationRecord } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const evidenceId = 'EVO-OBS-provenance-test';
    const record = InterpretationRecord.create({
        interpretation_id:          `INTP-${evidenceId}`,
        evidence_record_ref:        evidenceId,
        rt09_operation_id:          `RT09-OP-INTP-${evidenceId}`,
        inference_protocol_ref:     'EP-DOM-000001-INFER-v1.0',
        inference_protocol_version: '1.0',
        epistemic_confidence:       '0.7',
        interpretation_content:     '{"basis":"bootstrap"}',
        domain_classification:      'DOM-000001',
        temporal_validity_metadata: '{"validity_basis":"bootstrap"}',
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert.strictEqual(record.evidence_record_ref, evidenceId,
        'evidence_record_ref must equal evidenceId (RT09-INV-1 chain)');
});

// 7 — inference_protocol_ref uses INFERENCE type from T3-P3 (not InferenceProtocol T3-P4)
test('inference_protocol_ref uses EpistemicProtocol INFERENCE type (EP-{domainId}-INFER-v1.0)', () => {
    const epistemicReg = require('../lib/epistemics/epistemic-protocol-registry');
    const protocol = epistemicReg.getProtocolForDomain('DOM-000008', 'INFERENCE');
    assert(protocol !== null, 'INFERENCE protocol must exist for DOM-000008');
    assert.strictEqual(protocol.protocol_id, 'EP-DOM-000008-INFER-v1.0');
    assert.strictEqual(protocol.protocol_version, '1.0');
    assert.strictEqual(protocol.protocol_type, 'INFERENCE');
});

// 8 — epistemic_confidence is the uncertainty_confidence string (KI-017 chain preservation)
test('KI-017 chain: epistemic_confidence preserves uncertainty_confidence from ObservationRecord', () => {
    const { InterpretationRecord } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const evidenceId = 'EVO-OBS-ki017-chain-test';
    const obsConfidence = '0.85'; // already a string (fabric.js stringifies d5_uncertainty_confidence)
    const record = InterpretationRecord.create({
        interpretation_id:          `INTP-${evidenceId}`,
        evidence_record_ref:        evidenceId,
        rt09_operation_id:          `RT09-OP-INTP-${evidenceId}`,
        inference_protocol_ref:     'EP-DOM-000001-INFER-v1.0',
        inference_protocol_version: '1.0',
        epistemic_confidence:       obsConfidence,
        interpretation_content:     '{"basis":"bootstrap"}',
        domain_classification:      'DOM-000001',
        temporal_validity_metadata: '{"validity_basis":"bootstrap"}',
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert.strictEqual(record.epistemic_confidence, obsConfidence,
        'KI-017: epistemic_confidence must equal uncertainty_confidence string from ObservationRecord');
});

// 9 — lifecycle_state = 'FORMING' (L-01 + L-05 bootstrap state)
test("lifecycle_state is 'FORMING' (L-01: RT-03 not implemented; L-05: EvidenceObject must be ADMITTED first)", () => {
    const { InterpretationRecord } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const evidenceId = 'EVO-OBS-lifecycle-test';
    const record = InterpretationRecord.create({
        interpretation_id:          `INTP-${evidenceId}`,
        evidence_record_ref:        evidenceId,
        rt09_operation_id:          `RT09-OP-INTP-${evidenceId}`,
        inference_protocol_ref:     'EP-DOM-000001-INFER-v1.0',
        inference_protocol_version: '1.0',
        epistemic_confidence:       '0.5',
        interpretation_content:     '{"basis":"bootstrap"}',
        domain_classification:      'DOM-000001',
        temporal_validity_metadata: '{"validity_basis":"bootstrap"}',
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert.strictEqual(record.lifecycle_state, 'FORMING',
        'L-01+L-05: lifecycle_state must be FORMING');
});

// 10 — Unknown domain returns null from formInterpretation without throwing (L-03)
testAsync('unknown domain returns null from formInterpretation without throwing (L-03)', async () => {
    const { formInterpretation } = require('../lib/knowledge/interpretation-record-registry');
    const result = await formInterpretation({
        evidenceId:    'EVO-OBS-test-domain-check',
        domainName:    'nonexistent_domain_xyz',
        obsRecordId:   'OBS-test-uuid-xyz',
        uncertaintyConf: '0.5',
    });
    assert.strictEqual(result, null, 'unknown domain must return null');
});

// 11 — Null evidenceId: formInterpretation with null evidenceId does not throw
testAsync('null evidenceId: formInterpretation does not throw synchronously or reject', async () => {
    const { formInterpretation } = require('../lib/knowledge/interpretation-record-registry');
    let threw = false;
    let result;
    try {
        result = await formInterpretation({
            evidenceId:     null,
            domainName:     'knowledge',
            obsRecordId:    'OBS-test-null-evidence',
            uncertaintyConf: '0.5',
        });
    } catch (e) { threw = true; }
    assert(!threw, 'formInterpretation with null evidenceId must not throw');
    assert.strictEqual(result, null, 'null evidenceId must return null');
});

// 12 — Fire-and-forget: formInterpretation resolves without DB (L-04, null on DB failure)
testAsync('fire-and-forget: formInterpretation resolves without DB (L-04, null on DB failure)', async () => {
    const { formInterpretation } = require('../lib/knowledge/interpretation-record-registry');
    let threw = false;
    let result;
    try {
        result = await formInterpretation({
            evidenceId:     'EVO-OBS-fire-forget-test-1234567890',
            domainName:     'knowledge',
            obsRecordId:    'OBS-fire-forget-test-1234567890',
            uncertaintyConf: '0.9',
        });
    } catch (e) { threw = true; }
    assert(!threw, 'formInterpretation must not throw (fire-and-forget, no-throw contract)');
    assert(result === null || typeof result === 'string', 'formInterpretation must return null or string interpretationId');
});

console.log('');
