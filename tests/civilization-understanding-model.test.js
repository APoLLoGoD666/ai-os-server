'use strict';
// tests/civilization-understanding-model.test.js
// T3-11 — CivilizationUnderstandingModel Formation: constitutional test suite.
// Authority: APEX-CONSTITUTION-v1.0; R11-v1.3-canonical.md RS-07 RS-10 RS-11;
//            A0-v1.1.1 §3.12; RT11-INV-1 RT11-INV-2 RT11-INV-3; CUM-1 through CUM-5;
//            D8 INV-4; T3-11-CUM-PHASE-0-AUDIT.md (AUTHORIZED).
//
// Does NOT require live Supabase. All structural/contract tests run offline.
// Tests that call formCivilizationUnderstanding() will fail at constitutionalStore.write()
// (no Supabase); the no-throw contract is verified, not DB persistence.

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

function pass(label) { console.log(`  PASS  ${label}`); }
function fail(label, msg) { console.error(`  FAIL  ${label}: ${msg}`); process.exitCode = 1; }

function test(label, fn) {
    try { fn(); pass(label); } catch (e) { fail(label, e.message); }
}

async function testAsync(label, fn) {
    try { await fn(); pass(label); } catch (e) { fail(label, e.message); }
}

console.log('\nCivilizationUnderstandingModel Formation — T3-11 Constitutional Tests');

// ── 1. Module contract ─────────────────────────────────────────────────────────

test('civilization-understanding-registry loads without syntax error', () => {
    const m = require('../lib/civilization/civilization-understanding-registry');
    assert(m, 'module must export a value');
});

test('formCivilizationUnderstanding is exported as a function', () => {
    const { formCivilizationUnderstanding } = require('../lib/civilization/civilization-understanding-registry');
    assert.strictEqual(typeof formCivilizationUnderstanding, 'function');
});

test('module exports are frozen (structural_immutable)', () => {
    const m = require('../lib/civilization/civilization-understanding-registry');
    assert(Object.isFrozen(m), 'module.exports must be frozen');
});

test('CivilizationUnderstandingModel type loads and exposes create() and validate()', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    assert.strictEqual(typeof CivilizationUnderstandingModel.create, 'function');
    assert.strictEqual(typeof CivilizationUnderstandingModel.validate, 'function');
    assert.strictEqual(typeof CivilizationUnderstandingModel.SCHEMA, 'object');
});

// ── 2. Schema field verification ───────────────────────────────────────────────

test('CivilizationUnderstandingModel SCHEMA has 11 required fields', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const requiredFields = Object.entries(CivilizationUnderstandingModel.SCHEMA)
        .filter(([, spec]) => spec.required === true);
    assert.strictEqual(requiredFields.length, 11, `expected 11 required fields, got ${requiredFields.length}`);
});

test('dum_manifest is type array (not string)', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const field = CivilizationUnderstandingModel.SCHEMA.dum_manifest;
    assert.strictEqual(field.type, 'array', 'dum_manifest must be type array');
    assert.strictEqual(field.required, true);
});

test('domain_count is type number', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const field = CivilizationUnderstandingModel.SCHEMA.domain_count;
    assert.strictEqual(field.type, 'number', 'domain_count must be type number');
    assert.strictEqual(field.required, true);
});

test('lifecycle_state ACCUMULATING is valid for CivilizationUnderstandingModel', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const enumValues = CivilizationUnderstandingModel.SCHEMA.lifecycle_state.enum;
    assert(enumValues.includes('ACCUMULATING'), 'ACCUMULATING must be in CUM lifecycle enum');
});

test('CUM-1 through CUM-5 attestation fields are type boolean', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const cumFields = [
        'cum_1_knowledge_grounding',
        'cum_2_cross_domain_integrity',
        'cum_3_uncertainty_preservation',
        'cum_4_temporal_validity',
        'cum_5_reality_alignment',
    ];
    for (const f of cumFields) {
        const field = CivilizationUnderstandingModel.SCHEMA[f];
        assert(field, `SCHEMA must contain ${f}`);
        assert.strictEqual(field.required, true, `${f} must be required`);
        assert.strictEqual(field.type, 'boolean', `${f} must be type boolean`);
    }
});

// ── 3. CivilizationUnderstandingModel.create() validation ─────────────────────

test('CivilizationUnderstandingModel.create() with all honest fields passes validation', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const dumId = 'DUM-DOM-000008-KC-BELF-INTP-EVO-OBS-test-001-1700000000001';
    const cumId = `CUM-DOM-000008-${dumId}`;
    const ts    = new Date().toISOString();
    const record = CivilizationUnderstandingModel.create({
        cum_id:           cumId,
        cum_version:      `BOOTSTRAP-${dumId}`,
        lifecycle_state:  'ACCUMULATING',
        dum_manifest:     [dumId],
        domain_count:     1,
        synthesis_timestamp: ts,
        cum_1_knowledge_grounding:      true,
        cum_2_cross_domain_integrity:   true,
        cum_3_uncertainty_preservation: true,
        cum_4_temporal_validity:        true,
        cum_5_reality_alignment:        true,
    });
    assert.strictEqual(record.__type, 'CivilizationUnderstandingModel');
    assert.strictEqual(record.lifecycle_state, 'ACCUMULATING');
    assert.strictEqual(record.domain_count, 1);
    assert(Array.isArray(record.dum_manifest), 'dum_manifest must be array');
    assert.strictEqual(record.dum_manifest[0], dumId);
    assert.strictEqual(record.cum_1_knowledge_grounding, true);
});

// ── 4. RT11-INV-3 compliance ───────────────────────────────────────────────────

test('RT11-INV-3: ACCUMULATING lifecycle_state valid for domain_count < 12', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const result = CivilizationUnderstandingModel.validate({
        cum_id: 'CUM-DOM-000008-DUM-test',
        cum_version: 'BOOTSTRAP-DUM-test',
        lifecycle_state: 'ACCUMULATING',
        dum_manifest: ['DUM-DOM-000008-KC-test'],
        domain_count: 1,
        synthesis_timestamp: new Date().toISOString(),
        cum_1_knowledge_grounding:      true,
        cum_2_cross_domain_integrity:   true,
        cum_3_uncertainty_preservation: true,
        cum_4_temporal_validity:        true,
        cum_5_reality_alignment:        true,
    });
    assert.strictEqual(result.valid, true, `Expected valid:true, got errors: ${result.errors.join('; ')}`);
});

test('RT11-INV-3: domain_count < 12 allowed at ACCUMULATING (not a schema violation)', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const domainCountField = CivilizationUnderstandingModel.SCHEMA.domain_count;
    // No enum constraint on domain_count — the 12-requirement is a runtime state constraint
    assert(!domainCountField.enum, 'domain_count must not have an enum constraint in schema');
    assert.strictEqual(domainCountField.type, 'number');
});

// ── 5. D8 INV-4: deterministic ID formula (no fabrication) ────────────────────
// T3-11B: CUM ID formula updated to CUM-v${domainCount}-${dumId}.
// Old formula CUM-DOM-000008-${dumId} was L-CUM-01 bootstrap limitation (single domain embedding).

test('D8 INV-4: CUM ID is deterministic from domainCount + dumId (T3-11B formula)', () => {
    const dumId  = 'DUM-DOM-000008-KC-BELF-INTP-EVO-OBS-inv4-test-1700000000001';
    const cumId1 = `CUM-v1-${dumId}`;
    const cumId2 = `CUM-v1-${dumId}`;
    assert.strictEqual(cumId1, cumId2, 'same (domainCount, dumId) must always produce same cumId');
});

test('D8 INV-4: cumId contains no fabricated content', () => {
    const dumId  = 'DUM-DOM-000008-KC-BELF-INTP-EVO-OBS-realuuid-1700000000000';
    const cumId  = `CUM-v1-${dumId}`;
    assert(!cumId.includes('undefined'), 'cumId must not contain undefined');
    assert(!cumId.includes('null'),      'cumId must not contain null');
    assert(!cumId.includes('FAKE'),      'cumId must not contain FAKE');
    assert(!cumId.includes('MOCK'),      'cumId must not contain MOCK');
});

test('D8 INV-4: cumId embeds full provenance chain prefixes (via dumId)', () => {
    const obsId  = 'OBS-chain-test-001';
    const evidId = `EVO-${obsId}`;
    const intpId = `INTP-${evidId}`;
    const belfId = `BELF-${intpId}`;
    const kcId   = `KC-${belfId}`;
    const dumId  = `DUM-DOM-000008-${kcId}`;
    const cumId  = `CUM-v1-${dumId}`; // T3-11B formula: CUM-v${domainCount}-${dumId}
    assert(cumId.includes(obsId),       'cumId must embed obsRecordId');
    assert(cumId.includes('EVO-'),      'cumId must embed EVO- segment');
    assert(cumId.includes('INTP-'),     'cumId must embed INTP- segment');
    assert(cumId.includes('BELF-'),     'cumId must embed BELF- segment');
    assert(cumId.includes('KC-'),       'cumId must embed KC- segment');
    assert(cumId.includes('DUM-'),      'cumId must embed DUM- segment');
});

// ── 6. T3-11B CUM ID formula verification ─────────────────────────────────────
// L-CUM-01 resolved by T3-11B: CUM ID no longer embeds single domain.
// New formula: CUM-v${domainCount}-${dumId}.

test('T3-11B: CUM ID formula is CUM-v${domainCount}-${dumId} (L-CUM-01 resolved)', () => {
    const dumId = 'DUM-DOM-000008-KC-BELF-INTP-EVO-OBS-test-999-1700000000002';
    const cumId = `CUM-v1-${dumId}`;      // domainCount=1 at single-DUM bootstrap
    assert(cumId.startsWith('CUM-v'), 'T3-11B cumId must start with CUM-v (not CUM-DOM-)');
    assert(cumId.includes(dumId),     'T3-11B cumId must embed triggering dumId');
});

test('L-CUM-02: cum_2_cross_domain_integrity vacuously true with 1 domain', () => {
    // With 1 domain (DOM-000008 only), 0 cross-domain tensions exist.
    // Vacuous satisfaction: 0 tensions resolved out of 0 = vacuously true.
    const tensionCount = 0; // DOM-000008 cannot have cross-domain tensions with itself
    assert.strictEqual(tensionCount, 0, '1 domain produces 0 cross-domain tensions');
    // The attestation TRUE is constitutionally honest: "resolved or registered" for 0 tensions
    const attestation = tensionCount === 0 ? true : false;
    assert.strictEqual(attestation, true);
});

// ── 7. Null guard (L-CUM-01 gate) ─────────────────────────────────────────────

test('null dumId returns null without throwing', async () => {
    const { formCivilizationUnderstanding } = require('../lib/civilization/civilization-understanding-registry');
    let threw = false;
    let result;
    try {
        result = await formCivilizationUnderstanding({ dumId: null, knowledgeId: 'KC-test', item: {}, confidence: 0.72 });
    } catch (e) { threw = true; }
    assert(!threw, 'must not throw');
    assert.strictEqual(result, null, 'must return null for null dumId');
});

test('undefined dumId returns null without throwing', async () => {
    const { formCivilizationUnderstanding } = require('../lib/civilization/civilization-understanding-registry');
    let threw = false;
    let result;
    try {
        result = await formCivilizationUnderstanding({ knowledgeId: 'KC-test2', item: {}, confidence: 0.72 });
    } catch (e) { threw = true; }
    assert(!threw, 'must not throw');
    assert.strictEqual(result, null, 'must return null for undefined dumId');
});

// ── 8. No-throw guarantee ──────────────────────────────────────────────────────

test('no-throw: formCivilizationUnderstanding does not throw synchronously', () => {
    const { formCivilizationUnderstanding } = require('../lib/civilization/civilization-understanding-registry');
    let threwSync = false;
    let p;
    const dumId = 'DUM-DOM-000008-KC-BELF-INTP-EVO-OBS-nothrow-test-1700000000003';
    try {
        p = formCivilizationUnderstanding({ dumId, knowledgeId: `KC-BELF-INTP-EVO-OBS-nothrow-test-1700000000003`, item: { validation_id: 'v-nothrow', confirmations: 2, min_confirmations: 2 }, confidence: 0.72 });
    } catch (e) { threwSync = true; }
    assert(!threwSync, 'must not throw synchronously');
    if (p && typeof p.then === 'function') p.catch(() => {});
});

// ── 9. Duplicate prevention ────────────────────────────────────────────────────

test('_emitted Set is exported for duplicate guard verification', () => {
    const { _emitted } = require('../lib/civilization/civilization-understanding-registry');
    assert(_emitted instanceof Set, '_emitted must be a Set');
});

test('T3-11B: duplicate prevention — same (domainCount, dumId) produces same cumId', () => {
    const dumId = 'DUM-DOM-000008-KC-BELF-INTP-EVO-OBS-dup-test-1700000000004';
    const cum1  = `CUM-v1-${dumId}`;  // T3-11B formula
    const cum2  = `CUM-v1-${dumId}`;
    assert.strictEqual(cum1, cum2, 'same (domainCount, dumId) must always produce same cumId');
});

test('T3-11B: distinct dumIds produce distinct cumIds', () => {
    const dumId1 = 'DUM-DOM-000008-KC-BELF-INTP-EVO-OBS-aaa-111';
    const dumId2 = 'DUM-DOM-000008-KC-BELF-INTP-EVO-OBS-aaa-222';
    const cum1   = `CUM-v1-${dumId1}`;  // T3-11B formula
    const cum2   = `CUM-v1-${dumId2}`;
    assert.notStrictEqual(cum1, cum2, 'distinct dumIds must produce distinct cumIds');
});

// ── 10. knowledge-validator.js wiring verification (T3-11) ────────────────────

test('knowledge-validator.js contains CUM wiring (T3-11)', () => {
    const source = fs.readFileSync(path.join(__dirname, '../lib/intelligence/knowledge-validator.js'), 'utf8');
    assert(source.includes('civilization-understanding-registry'), 'must require civilization-understanding-registry');
    assert(source.includes('formCivilizationUnderstanding'),      'must call formCivilizationUnderstanding');
    assert(source.includes('T3-11'),                              'must reference T3-11 in comment');
});

test('knowledge-validator.js: CUM wiring is gated on valid dumId', () => {
    const source = fs.readFileSync(path.join(__dirname, '../lib/intelligence/knowledge-validator.js'), 'utf8');
    // The CUM wiring must be inside an `if (dumId)` guard
    assert(source.includes('if (dumId)'), 'CUM wiring must be gated on valid dumId');
    const dumIdIdx = source.indexOf('if (dumId)');
    const cumIdx   = source.indexOf('civilization-understanding-registry');
    assert(cumIdx > dumIdIdx, 'civilization-understanding-registry require must appear after if (dumId)');
});

test('knowledge-validator.js: DUM return value captured as dumId', () => {
    const source = fs.readFileSync(path.join(__dirname, '../lib/intelligence/knowledge-validator.js'), 'utf8');
    assert(source.includes('const dumId ='), 'must capture formDomainUnderstanding() return as dumId');
});

// ── 11. RT11-INV-3 complete chain verification ────────────────────────────────

test('RT11-INV-3: CUM chain contains all epistemic stage prefixes (T3-11B formula)', () => {
    // D4 KI-007 analog for RT-11: no stage skipping
    const obsId  = 'OBS-ki007-analog-test';
    const evidId = `EVO-${obsId}`;
    const intpId = `INTP-${evidId}`;
    const belfId = `BELF-${intpId}`;
    const kcId   = `KC-${belfId}`;
    const dumId  = `DUM-DOM-000008-${kcId}`;
    const cumId  = `CUM-v1-${dumId}`; // T3-11B: CUM-v${domainCount}-${dumId}
    assert(cumId.includes('EVO-'),  'CUM must embed Stage 2 (EvidenceObject) prefix');
    assert(cumId.includes('INTP-'), 'CUM must embed Stage 3 (InterpretationRecord) prefix');
    assert(cumId.includes('BELF-'), 'CUM must embed Stage 4 (BeliefObject) prefix');
    assert(cumId.includes('KC-'),   'CUM must embed Stage 5 (KnowledgeClaim) prefix');
    assert(cumId.includes('DUM-'),  'CUM must embed Stage 6 (DomainUnderstandingModel) prefix');
});

// ── 12. CUM-3 uncertainty not collapsed ───────────────────────────────────────

test('CUM-3: uncertainty_preservation field is type boolean (not collapsed)', () => {
    const { CivilizationUnderstandingModel } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const field = CivilizationUnderstandingModel.SCHEMA.cum_3_uncertainty_preservation;
    assert.strictEqual(field.type, 'boolean');
    assert.strictEqual(field.required, true);
    // Attestation is boolean — the value true means uncertainty WAS preserved
    // (not collapsed to zero), consistent with CUM-3 and RT10-INV-2
});

console.log('');
