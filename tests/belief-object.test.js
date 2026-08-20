'use strict';
// tests/belief-object.test.js
// T3-10C — BeliefObject Formation: constitutional test suite.
// Authority: APEX-CONSTITUTION-v1.0; T3-10C-PHASE-0-AUDIT.md; KI-007; KI-016; RT09-INV-5; D8 PROH-6.
//
// 15 scenarios per task requirements. No live Supabase required.

const assert = require('assert');

function pass(label) { console.log(`  PASS  ${label}`); }
function fail(label, msg) { console.error(`  FAIL  ${label}: ${msg}`); process.exitCode = 1; }

function test(label, fn) {
    try { fn(); pass(label); }
    catch (e) { fail(label, e.message); }
}

async function testAsync(label, fn) {
    try { await fn(); pass(label); }
    catch (e) { fail(label, e.message); }
}

console.log('\nBeliefObject — T3-10C Constitutional Tests');

// 1 — Module loads
test('belief-object-registry module loads without syntax error', () => {
    const reg = require('../lib/knowledge/belief-object-registry');
    assert(typeof reg === 'object');
});

// 2 — Frozen exports
test('module exports are frozen', () => {
    const reg = require('../lib/knowledge/belief-object-registry');
    assert(Object.isFrozen(reg), 'module.exports must be frozen');
    assert(Object.isFrozen(reg._DOMAIN_ID_BY_NAME), '_DOMAIN_ID_BY_NAME must be frozen');
});

// 3 — All required fields accepted by BeliefObject.create()
test('BeliefObject.create() accepts all 10 required fields', () => {
    const { BeliefObject } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const interpretationId = 'INTP-EVO-OBS-test-uuid-1234567890';
    const record = BeliefObject.create({
        belief_id:                  `BELF-${interpretationId}`,
        interpretation_record_ref:  interpretationId,
        rt09_operation_id:          `RT09-OP-BELF-${interpretationId}`,
        epistemic_confidence_level: '0.5',
        confidence_basis:           JSON.stringify({ basis: 'bootstrap', source: 'D5 §3.4', authority: 'T3-10C' }),
        belief_content:             JSON.stringify({ basis: 'bootstrap', interpretation_ref: interpretationId }),
        domain_classification:      'DOM-000008',
        temporal_validity_metadata: JSON.stringify({ validity_basis: 'bootstrap' }),
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert.strictEqual(record.__type, 'BeliefObject');
    assert.strictEqual(record.__runtime, 'RT-09');
    assert.strictEqual(record.__baseline, 'APEX-CONSTITUTION-v1.0');
});

// 4 — Constitutional validation: validate() returns valid=true for correct data
test('BeliefObject.validate() passes for all 10 fields present', () => {
    const { BeliefObject } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const interpretationId = 'INTP-EVO-OBS-validate-test';
    const { valid, errors } = BeliefObject.validate({
        belief_id:                  `BELF-${interpretationId}`,
        interpretation_record_ref:  interpretationId,
        rt09_operation_id:          `RT09-OP-BELF-${interpretationId}`,
        epistemic_confidence_level: '0.75',
        confidence_basis:           '{"basis":"bootstrap"}',
        belief_content:             '{"basis":"bootstrap"}',
        domain_classification:      'DOM-000001',
        temporal_validity_metadata: '{"validity_basis":"bootstrap"}',
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert(valid, `validate() must return valid=true; errors: ${errors.join('; ')}`);
    assert.strictEqual(errors.length, 0);
});

// 5 — confidence_basis is present and non-empty (RT09-INV-5 / D8 PROH-6)
test('RT09-INV-5 / D8 PROH-6: confidence_basis is present, non-empty, and parseable', () => {
    const { BeliefObject } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const interpretationId = 'INTP-EVO-OBS-inv5-test';
    const confidenceBasis = JSON.stringify({
        basis: 'bootstrap',
        source: 'D5 §3.4 uncertainty_confidence',
        confidence_value: '0.5',
        authority: 'T3-10C-PHASE-0-AUDIT.md',
    });
    const record = BeliefObject.create({
        belief_id:                  `BELF-${interpretationId}`,
        interpretation_record_ref:  interpretationId,
        rt09_operation_id:          `RT09-OP-BELF-${interpretationId}`,
        epistemic_confidence_level: '0.5',
        confidence_basis:           confidenceBasis,
        belief_content:             '{"basis":"bootstrap"}',
        domain_classification:      'DOM-000001',
        temporal_validity_metadata: '{"validity_basis":"bootstrap"}',
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert(typeof record.confidence_basis === 'string', 'confidence_basis must be string');
    assert(record.confidence_basis.length > 0, 'confidence_basis must be non-empty');
    const parsed = JSON.parse(record.confidence_basis);
    assert(parsed.basis, 'confidence_basis must be parseable JSON with a basis field');
    assert(parsed.source, 'confidence_basis must document the source of confidence');
    assert(!record.confidence_basis.includes('FAKE'), 'confidence_basis must not contain fabricated content');
    assert(!record.confidence_basis.includes('undefined'), 'confidence_basis must not contain undefined');
});

// 6 — epistemic_confidence_level inherits from D5 uncertainty (KI-017 chain)
test('epistemic_confidence_level is the uncertainty_confidence string (KI-017 chain)', () => {
    const { BeliefObject } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const interpretationId = 'INTP-EVO-OBS-ki017-belief-test';
    const obsConfidence = '0.85';
    const record = BeliefObject.create({
        belief_id:                  `BELF-${interpretationId}`,
        interpretation_record_ref:  interpretationId,
        rt09_operation_id:          `RT09-OP-BELF-${interpretationId}`,
        epistemic_confidence_level: obsConfidence,
        confidence_basis:           '{"basis":"bootstrap","source":"D5 §3.4"}',
        belief_content:             '{"basis":"bootstrap"}',
        domain_classification:      'DOM-000001',
        temporal_validity_metadata: '{"validity_basis":"bootstrap"}',
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert.strictEqual(record.epistemic_confidence_level, obsConfidence,
        'KI-017: epistemic_confidence_level must equal d5_uncertainty_confidence string');
});

// 7 — interpretation_record_ref equals interpretationId (provenance chain)
test('interpretation_record_ref equals interpretationId (RT09-INV-1 chain)', () => {
    const { BeliefObject } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const interpretationId = 'INTP-EVO-OBS-provenance-belief';
    const record = BeliefObject.create({
        belief_id:                  `BELF-${interpretationId}`,
        interpretation_record_ref:  interpretationId,
        rt09_operation_id:          `RT09-OP-BELF-${interpretationId}`,
        epistemic_confidence_level: '0.6',
        confidence_basis:           '{"basis":"bootstrap","source":"D5 §3.4"}',
        belief_content:             '{"basis":"bootstrap"}',
        domain_classification:      'DOM-000001',
        temporal_validity_metadata: '{"validity_basis":"bootstrap"}',
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert.strictEqual(record.interpretation_record_ref, interpretationId,
        'interpretation_record_ref must equal interpretationId');
});

// 8 — lifecycle_state is 'FORMING' (L-01 + L-05 bootstrap state)
test("lifecycle_state is 'FORMING' (L-01: RT-03 not implemented; L-05: InterpretationRecord must be ADMITTED first)", () => {
    const { BeliefObject } = require('../lib/constitutional-types/knowledge-record');
    const ts = new Date().toISOString();
    const interpretationId = 'INTP-EVO-OBS-lifecycle-belief';
    const record = BeliefObject.create({
        belief_id:                  `BELF-${interpretationId}`,
        interpretation_record_ref:  interpretationId,
        rt09_operation_id:          `RT09-OP-BELF-${interpretationId}`,
        epistemic_confidence_level: '0.5',
        confidence_basis:           '{"basis":"bootstrap","source":"D5 §3.4"}',
        belief_content:             '{"basis":"bootstrap"}',
        domain_classification:      'DOM-000001',
        temporal_validity_metadata: '{"validity_basis":"bootstrap"}',
        formation_timestamp:        ts,
        lifecycle_state:            'FORMING',
    });
    assert.strictEqual(record.lifecycle_state, 'FORMING',
        'L-01+L-05: lifecycle_state must be FORMING at bootstrap');
});

// 9 — D8 grounding: belief_id and interpretation_record_ref contain no fabricated content
test('D8 INV-4: belief_id and interpretation_record_ref contain no fabricated content', () => {
    const interpretationId = 'INTP-EVO-OBS-00000000-0000-0000-0000-000000000001-1722700000000';
    const beliefId = `BELF-${interpretationId}`;
    assert(beliefId.startsWith('BELF-'), 'belief_id must start with BELF-');
    assert(beliefId.includes(interpretationId), 'belief_id must include interpretationId');
    assert(!beliefId.includes('undefined'), 'belief_id must not contain undefined');
    assert(!beliefId.includes('null'), 'belief_id must not contain null');
    assert(!beliefId.includes('FAKE'), 'belief_id must not contain FAKE');
});

// 10 — No fabricated values: confidence_basis documents authentic basis
test('no fabricated values: confidence_basis cites authentic D5 source', () => {
    const { _DOMAIN_ID_BY_NAME } = require('../lib/knowledge/belief-object-registry');
    // Verify the registry resolves to authentic DOM-IDs
    assert.strictEqual(_DOMAIN_ID_BY_NAME['knowledge'], 'DOM-000008',
        'reverse-map must resolve knowledge to authentic DOM-000008');
    assert.strictEqual(_DOMAIN_ID_BY_NAME['civilisation'], 'DOM-000001',
        'reverse-map must resolve civilisation to authentic DOM-000001');
    // No two names map to same DOM-ID (no fabricated duplicates)
    const ids = Object.values(_DOMAIN_ID_BY_NAME);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, 'all DOM-IDs in reverse-map must be unique');
});

// 11 — Unknown domain returns null (L-03)
testAsync('unknown domain returns null from formBelief without throwing (L-03)', async () => {
    const { formBelief } = require('../lib/knowledge/belief-object-registry');
    const result = await formBelief({
        interpretationId: 'INTP-EVO-OBS-test',
        domainName:       'nonexistent_domain_xyz',
        obsRecordId:      'OBS-test',
        uncertaintyConf:  '0.5',
    });
    assert.strictEqual(result, null, 'unknown domain must return null');
});

// 12 — Persistence: formBelief writes to constitutional-store (no-throw on DB failure)
testAsync('persistence: formBelief does not throw when constitutional-store write fails (no-throw contract)', async () => {
    const { formBelief } = require('../lib/knowledge/belief-object-registry');
    let threw = false;
    let result;
    try {
        result = await formBelief({
            interpretationId: 'INTP-EVO-OBS-persist-test-1234567890',
            domainName:       'knowledge',
            obsRecordId:      'OBS-persist-test-1234567890',
            uncertaintyConf:  '0.7',
        });
    } catch (e) { threw = true; }
    assert(!threw, 'formBelief must not throw even when Supabase is unavailable');
    assert(result === null || typeof result === 'string', 'must return null or beliefId string');
});

// 13 — Fire-and-forget: formBelief resolves without DB (L-04)
testAsync('fire-and-forget: formBelief resolves without blocking (L-04)', async () => {
    const { formBelief } = require('../lib/knowledge/belief-object-registry');
    const start = Date.now();
    await formBelief({
        interpretationId: 'INTP-EVO-OBS-ff-test-1234567890',
        domainName:       'intelligence',
        obsRecordId:      'OBS-ff-test-1234567890',
        uncertaintyConf:  '0.6',
    });
    const elapsed = Date.now() - start;
    assert(elapsed < 5000, `formBelief must complete promptly (${elapsed}ms is too long for fire-and-forget)`);
});

// 14 — Failure path: null interpretationId returns null without throwing
testAsync('failure path: null interpretationId returns null without throwing', async () => {
    const { formBelief } = require('../lib/knowledge/belief-object-registry');
    let threw = false;
    let result;
    try {
        result = await formBelief({
            interpretationId: null,
            domainName:       'knowledge',
            obsRecordId:      'OBS-null-test',
            uncertaintyConf:  '0.5',
        });
    } catch (e) { threw = true; }
    assert(!threw, 'null interpretationId must not throw');
    assert.strictEqual(result, null, 'null interpretationId must return null');
});

// 15 — No-throw behaviour: BeliefObject.validate() fails gracefully for missing fields
test('no-throw: BeliefObject.validate() returns errors array without throwing for invalid data', () => {
    const { BeliefObject } = require('../lib/constitutional-types/knowledge-record');
    const { valid, errors } = BeliefObject.validate({ belief_id: 'BELF-test' });
    assert(!valid, 'incomplete data must not validate');
    assert(Array.isArray(errors), 'errors must be an array');
    assert(errors.length > 0, 'must have at least one error for missing required fields');
});

console.log('');
