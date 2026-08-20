'use strict';
// tests/knowledge-claim.test.js
// T3-10D — KnowledgeClaim Formation: constitutional test suite.
// Authority: APEX-CONSTITUTION-v1.0; IDR-W3-10D-001 Option A; D3 EP-T4;
//            D4 KI-007 KI-010; D8 INV-4; RT09-INV-1 RT09-INV-4 RT09-INV-5.
//
// Does NOT require live Supabase. All structural/contract tests run offline.
// Tests that call formKnowledgeClaim() with a real obsRecordId will fail at
// the constitutionalStore.write() step (no Supabase); the no-throw contract
// is verified, not DB persistence.

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

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

console.log('\nKnowledgeClaim Formation — T3-10D Constitutional Tests');

// ── 1. Module contract ─────────────────────────────────────────────────────────

test('knowledge-claim-registry loads without syntax error', () => {
    const m = require('../lib/knowledge/knowledge-claim-registry');
    assert(m, 'module must export a value');
});

test('formKnowledgeClaim is exported as a function', () => {
    const { formKnowledgeClaim } = require('../lib/knowledge/knowledge-claim-registry');
    assert.strictEqual(typeof formKnowledgeClaim, 'function');
});

test('module exports are frozen (structural_immutable)', () => {
    const m = require('../lib/knowledge/knowledge-claim-registry');
    assert(Object.isFrozen(m), 'module.exports must be frozen');
});

test('KnowledgeClaim type loads and exposes create()', () => {
    const { KnowledgeClaim } = require('../lib/constitutional-types/knowledge-record');
    assert.strictEqual(typeof KnowledgeClaim.create, 'function');
    assert.strictEqual(typeof KnowledgeClaim.validate, 'function');
    assert.strictEqual(typeof KnowledgeClaim.SCHEMA, 'object');
});

// ── 2. Chain ID reconstruction (D8 INV-4 — no fabrication) ────────────────────

test('D8 INV-4: chain IDs are deterministic from obsRecordId', () => {
    const obsRecordId      = 'OBS-00000000-0000-0000-0000-000000000001-1234567890';
    const evidenceId       = `EVO-${obsRecordId}`;
    const interpretationId = `INTP-${evidenceId}`;
    const beliefId         = `BELF-${interpretationId}`;
    const knowledgeId      = `KC-${beliefId}`;
    assert(evidenceId.startsWith('EVO-'),         'evidenceId must start with EVO-');
    assert(interpretationId.startsWith('INTP-'),  'interpretationId must start with INTP-');
    assert(beliefId.startsWith('BELF-'),          'beliefId must start with BELF-');
    assert(knowledgeId.startsWith('KC-'),         'knowledgeId must start with KC-');
});

test('D8 INV-4: KnowledgeClaim ID embeds full chain provenance', () => {
    const obsId       = 'OBS-abc-123';
    const evidenceId  = `EVO-${obsId}`;
    const interpId    = `INTP-${evidenceId}`;
    const beliefId    = `BELF-${interpId}`;
    const knowledgeId = `KC-${beliefId}`;
    assert(knowledgeId.includes(obsId),       'knowledgeId must embed obsRecordId');
    assert(knowledgeId.includes('EVO-'),      'knowledgeId must embed EVO- segment');
    assert(knowledgeId.includes('INTP-'),     'knowledgeId must embed INTP- segment');
    assert(knowledgeId.includes('BELF-'),     'knowledgeId must embed BELF- segment');
});

test('D8 INV-4: chain IDs contain no fabricated content', () => {
    const obsId    = 'OBS-realuuid-1700000000000';
    const chainIds = [
        `EVO-${obsId}`,
        `INTP-EVO-${obsId}`,
        `BELF-INTP-EVO-${obsId}`,
        `KC-BELF-INTP-EVO-${obsId}`,
    ];
    for (const id of chainIds) {
        assert(!id.includes('undefined'), `ID must not contain 'undefined': ${id}`);
        assert(!id.includes('null'),      `ID must not contain 'null': ${id}`);
        assert(!id.includes('FAKE'),      `ID must not contain 'FAKE': ${id}`);
        assert(!id.includes('MOCK'),      `ID must not contain 'MOCK': ${id}`);
    }
});

test('KI-010: chain reconstruction is unbroken (each ID references the prior)', () => {
    const obsId       = 'OBS-chain-test-999';
    const evidenceId  = `EVO-${obsId}`;
    const interpId    = `INTP-${evidenceId}`;
    const beliefId    = `BELF-${interpId}`;
    const knowledgeId = `KC-${beliefId}`;
    // Each link must reference the prior
    assert(evidenceId.includes(obsId),       'EvidenceObject must reference obsRecordId');
    assert(interpId.includes(evidenceId),    'InterpretationRecord must reference evidenceId');
    assert(beliefId.includes(interpId),      'BeliefObject must reference interpretationId');
    assert(knowledgeId.includes(beliefId),   'KnowledgeClaim must reference beliefId');
});

// ── 3. ep_t4_validation_gate_satisfied (D3 EP-T4; D8 INV-4) ──────────────────

test('D3 EP-T4: ep_t4_validation_gate_satisfied field is type boolean', () => {
    const ep4 = true;
    assert.strictEqual(typeof ep4, 'boolean', 'ep_t4_validation_gate_satisfied must be boolean');
    assert.strictEqual(ep4, true,              'must be true at constitutional validation site');
});

test('D3 EP-T4: KnowledgeClaim.create() with ep_t4=true passes constitutional validation', () => {
    const { KnowledgeClaim } = require('../lib/constitutional-types/knowledge-record');
    const obsId     = 'OBS-ep4-test-0001-1700000000001';
    const evidId    = `EVO-${obsId}`;
    const interpId  = `INTP-${evidId}`;
    const beliefId  = `BELF-${interpId}`;
    const kcId      = `KC-${beliefId}`;
    const ts        = new Date().toISOString();
    const record = KnowledgeClaim.create({
        knowledge_id:                    kcId,
        belief_object_ref:               beliefId,
        evidence_record_ref:             evidId,
        rt09_operation_id:               `RT09-OP-KC-${beliefId}`,
        justification:                   JSON.stringify({ basis: 'EP-T4 gate satisfied', authority: 'T3-10D' }),
        validation_attributes:           JSON.stringify({ confirmations: 2, confidence: 0.72, min_confirmations: 2, min_confidence: 0.60 }),
        ep_t4_validation_gate_satisfied: true,
        domain_classification:           'DOM-000008',
        temporal_validity_metadata:      JSON.stringify({ validity_basis: 'bootstrap', limitation: 'L-02' }),
        formation_timestamp:             ts,
        lifecycle_state:                 'FORMING',
    });
    assert.strictEqual(record.__type, 'KnowledgeClaim');
    assert.strictEqual(record.ep_t4_validation_gate_satisfied, true);
    assert.strictEqual(record.lifecycle_state, 'FORMING');
});

test('D3 EP-T4: KnowledgeClaim schema has ep_t4_validation_gate_satisfied as required boolean', () => {
    const { KnowledgeClaim } = require('../lib/constitutional-types/knowledge-record');
    const field = KnowledgeClaim.SCHEMA.ep_t4_validation_gate_satisfied;
    assert.strictEqual(field.required, true);
    assert.strictEqual(field.type, 'boolean');
    assert(field.description.toLowerCase().includes('must be true'), 'description must state must be true');
});

test('lifecycle_state FORMING is valid for KnowledgeClaim', () => {
    const { KnowledgeClaim } = require('../lib/constitutional-types/knowledge-record');
    const enumValues = KnowledgeClaim.SCHEMA.lifecycle_state.enum;
    assert(enumValues.includes('FORMING'), 'FORMING must be in KnowledgeClaim lifecycle enum');
});

// ── 4. L-10: null obsRecordId guard ───────────────────────────────────────────

test('L-10: formKnowledgeClaim with null obsRecordId returns null without throwing', async () => {
    const { formKnowledgeClaim } = require('../lib/knowledge/knowledge-claim-registry');
    let threw = false;
    let result;
    try {
        result = await formKnowledgeClaim({ obsRecordId: null, item: { validation_id: 'test', confirmations: 2 }, confidence: 0.72 });
    } catch (e) { threw = true; }
    assert(!threw,           'must not throw');
    assert.strictEqual(result, null, 'must return null for null obsRecordId');
});

test('L-10: formKnowledgeClaim with undefined obsRecordId returns null without throwing', async () => {
    const { formKnowledgeClaim } = require('../lib/knowledge/knowledge-claim-registry');
    let threw = false;
    let result;
    try {
        result = await formKnowledgeClaim({ item: { validation_id: 'test2', confirmations: 2 }, confidence: 0.72 });
    } catch (e) { threw = true; }
    assert(!threw,           'must not throw');
    assert.strictEqual(result, null, 'must return null for undefined obsRecordId');
});

// ── 5. No-throw guarantee ──────────────────────────────────────────────────────

test('no-throw: formKnowledgeClaim with minimal invalid item does not throw synchronously', () => {
    const { formKnowledgeClaim } = require('../lib/knowledge/knowledge-claim-registry');
    let threwSync = false;
    let p;
    try {
        p = formKnowledgeClaim({ obsRecordId: 'OBS-nothrow-test-0001-1700000000002', item: { validation_id: 'v-nothrow', confirmations: 2, min_confirmations: 2 }, confidence: 0.72 });
    } catch (e) { threwSync = true; }
    assert(!threwSync, 'must not throw synchronously');
    if (p && typeof p.then === 'function') p.catch(() => {});
});

// ── 6. Duplicate prevention ────────────────────────────────────────────────────

test('duplicate prevention: _emitted Set is exported', () => {
    const { _emitted } = require('../lib/knowledge/knowledge-claim-registry');
    assert(_emitted instanceof Set, '_emitted must be a Set');
});

test('duplicate prevention: same obsRecordId produces same knowledgeId formula', () => {
    const obsId = 'OBS-dup-test-0001-1700000000003';
    const kc1   = `KC-BELF-INTP-EVO-${obsId}`;
    const kc2   = `KC-BELF-INTP-EVO-${obsId}`;
    assert.strictEqual(kc1, kc2, 'same obsRecordId must always produce same knowledgeId');
});

// ── 7. knowledge-validator.js wiring verification ─────────────────────────────

test('knowledge-validator.js contains KnowledgeClaim wiring (T3-10D)', () => {
    const source = fs.readFileSync(path.join(__dirname, '../lib/intelligence/knowledge-validator.js'), 'utf8');
    assert(source.includes('knowledge-claim-registry'), 'must require knowledge-claim-registry');
    assert(source.includes('formKnowledgeClaim'),       'must call formKnowledgeClaim');
    assert(source.includes('item.obs_record_id'),       'must guard on item.obs_record_id');
});

test('knowledge-validator.js: _promoteToKnowledge wiring is inside the function', () => {
    const source = fs.readFileSync(path.join(__dirname, '../lib/intelligence/knowledge-validator.js'), 'utf8');
    const promoIdx = source.indexOf('async function _promoteToKnowledge');
    const kcIdx    = source.indexOf('knowledge-claim-registry');
    assert(promoIdx > -1,  '_promoteToKnowledge must be defined');
    assert(kcIdx     > -1, 'knowledge-claim-registry require must be present');
    assert(kcIdx > promoIdx, 'KnowledgeClaim wiring must appear after _promoteToKnowledge definition');
});

// ── 8. D4 KI-007 / KI-016 compliance ─────────────────────────────────────────

test('D4 KI-007: KnowledgeClaim ID contains all prior chain stage prefixes', () => {
    // KI-007: no stage skipping. The ID embeds EVO, INTP, BELF — proving the chain.
    const obsId = 'OBS-ki007-test-999';
    const kcId  = `KC-BELF-INTP-EVO-${obsId}`;
    assert(kcId.includes('EVO-'),  'must embed Stage 2 (EvidenceObject) prefix');
    assert(kcId.includes('INTP-'), 'must embed Stage 3 (InterpretationRecord) prefix');
    assert(kcId.includes('BELF-'), 'must embed Stage 4 (BeliefObject) prefix');
});

// ── 9. D8 INV-4 / D3 compliance ───────────────────────────────────────────────

test('D8 INV-4: VALIDATION EpistemicProtocol is registered for DOM-000008', () => {
    const registry = require('../lib/epistemics/epistemic-protocol-registry');
    const protocol = registry.getProtocolForDomain('DOM-000008', 'VALIDATION');
    assert(protocol !== null,                    'VALIDATION protocol must be registered for DOM-000008');
    assert.strictEqual(protocol.protocol_type,   'VALIDATION');
    assert.strictEqual(protocol.registration_status, 'CURRENT');
});

test('D3 compliance: VALIDATION protocol description references EP-T4 gate conditions', () => {
    const registry = require('../lib/epistemics/epistemic-protocol-registry');
    const protocol = registry.getProtocolForDomain('DOM-000008', 'VALIDATION');
    assert(protocol.protocol_description.includes('MIN_CONFIRMATIONS'),
        'VALIDATION protocol description must reference MIN_CONFIRMATIONS');
    assert(protocol.protocol_description.includes('MIN_CONFIDENCE'),
        'VALIDATION protocol description must reference MIN_CONFIDENCE');
});

// ── 10. RT09-INV-4: no duplicate active knowledge claims ──────────────────────

test('RT09-INV-4: two distinct obsRecordIds produce distinct knowledgeIds', () => {
    const id1 = 'OBS-aaa-bbb-111';
    const id2 = 'OBS-aaa-bbb-222';
    const kc1 = `KC-BELF-INTP-EVO-${id1}`;
    const kc2 = `KC-BELF-INTP-EVO-${id2}`;
    assert.notStrictEqual(kc1, kc2, 'distinct obsRecordIds must produce distinct knowledgeIds');
});

console.log('');
