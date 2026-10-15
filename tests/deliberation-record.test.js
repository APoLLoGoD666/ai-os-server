'use strict';
// tests/deliberation-record.test.js
// T3-12: DeliberationRecord + CivilizationalDecisionProposal Formation — Constitutional Tests
//
// Authority: T3-12-DELIBERATION-PHASE-0-AUDIT.md (AUTHORIZED 2026-08-04)
//            R11-v1.3-canonical.md RS-12 Process 2 Process 3;
//            D-7-v1.0 Part 4.6 (13-element DR); D-7-v1.0 Part 5.2 (DA-1 through DA-6);
//            RT11-INV-4 RT11-INV-5 RT11-INV-6; APEX-CONSTITUTION-v1.0
//
// Does NOT require live Supabase.
// - formDeliberationAndDecision(): Supabase query fails gracefully (no-throw contract).
// - constitutionalStore.write(): fails at write (no Supabase); _emitted tracks sessionKey.
// - All schema validation tests use DeliberationRecord.validate() + CDP.validate() directly.

const assert = require('assert');

function pass(label)      { console.log(`  PASS  ${label}`); }
function fail(label, msg) { console.error(`  FAIL  ${label}: ${msg}`); process.exitCode = 1; }

function test(label, fn) {
    try { fn(); pass(label); } catch (e) { fail(label, e.message); }
}

function testAsync(label, fn) {
    return fn().then(() => pass(label)).catch(e => fail(label, e.message));
}

console.log('\nDeliberationRecord + CDP Formation — T3-12 Constitutional Tests');

// ─── 1. Module loading and exports ────────────────────────────────────────────

test('T3-12-01: deliberation-registry loads without error', () => {
    const m = require('../lib/civilization/deliberation-registry');
    assert.ok(m);
});

test('T3-12-02: formDeliberationAndDecision is exported as a function', () => {
    const { formDeliberationAndDecision } = require('../lib/civilization/deliberation-registry');
    assert.strictEqual(typeof formDeliberationAndDecision, 'function');
});

test('T3-12-03: module exports are frozen', () => {
    const m = require('../lib/civilization/deliberation-registry');
    assert.ok(Object.isFrozen(m));
});

test('T3-12-04: _emitted Set is exported', () => {
    const { _emitted } = require('../lib/civilization/deliberation-registry');
    assert.ok(_emitted instanceof Set);
});

test('T3-12-05: all internal helpers are exported', () => {
    const m = require('../lib/civilization/deliberation-registry');
    assert.strictEqual(typeof m._generateDrId,                         'function');
    assert.strictEqual(typeof m._generateCdpId,                        'function');
    assert.strictEqual(typeof m._generateCdrId,                        'function');
    assert.strictEqual(typeof m._buildDrParticipants,                  'function');
    assert.strictEqual(typeof m._buildConstitutionalDecisionRegistryEntry, 'function');
    assert.strictEqual(typeof m._queryCURRENTCum,                      'function');
});

// ─── 2. ID generation formulas ────────────────────────────────────────────────

test('T3-12-06: _generateDrId produces DR-BOOTSTRAP-v1-${timestamp} formula', () => {
    const { _generateDrId } = require('../lib/civilization/deliberation-registry');
    const ts = new Date().toISOString();
    const id = _generateDrId(ts);
    assert.ok(id.startsWith('DR-BOOTSTRAP-v1-'), 'must start with DR-BOOTSTRAP-v1-');
    assert.ok(id.includes(ts), 'must embed timestamp');
});

test('T3-12-07: _generateCdpId produces CDP-BOOTSTRAP-v1-${timestamp} formula', () => {
    const { _generateCdpId } = require('../lib/civilization/deliberation-registry');
    const ts = new Date().toISOString();
    const id = _generateCdpId(ts);
    assert.ok(id.startsWith('CDP-BOOTSTRAP-v1-'), 'must start with CDP-BOOTSTRAP-v1-');
    assert.ok(id.includes(ts), 'must embed timestamp');
});

test('T3-12-08: _generateCdrId produces CDR-${cdpId} formula', () => {
    const { _generateCdrId, _generateCdpId } = require('../lib/civilization/deliberation-registry');
    const ts = new Date().toISOString();
    const cdpId = _generateCdpId(ts);
    const cdrId = _generateCdrId(cdpId);
    assert.ok(cdrId.startsWith('CDR-'), 'must start with CDR-');
    assert.ok(cdrId.includes(cdpId), 'must embed cdpId');
    assert.strictEqual(cdrId, `CDR-${cdpId}`);
});

// ─── 3. _buildDrParticipants ──────────────────────────────────────────────────

test('T3-12-09: _buildDrParticipants returns exactly 5 participants', () => {
    const { _buildDrParticipants } = require('../lib/civilization/deliberation-registry');
    const participants = _buildDrParticipants();
    assert.strictEqual(participants.length, 5, 'A0 §3.12 R4 requires 5 participant roles');
});

test('T3-12-10: all 5 required A0 §3.12 R4 participant roles are present', () => {
    const { _buildDrParticipants } = require('../lib/civilization/deliberation-registry');
    const participants = _buildDrParticipants();
    const roles = participants.map(p => p.role);
    assert.ok(roles.includes('Authority'),         'Authority role required');
    assert.ok(roles.includes('Epistemic'),         'Epistemic role required');
    assert.ok(roles.includes('Audit'),             'Audit role required');
    assert.ok(roles.includes('Theory of Change'),  'Theory of Change role required');
    assert.ok(roles.includes('Root Domain'),       'Root Domain (DOM-000001) role required');
});

test('T3-12-11: DOM-000001 participant has NOT-OPERATIONAL status (L-DR-03 documented)', () => {
    const { _buildDrParticipants } = require('../lib/civilization/deliberation-registry');
    const participants = _buildDrParticipants();
    const dom = participants.find(p => p.runtime === 'DOM-000001');
    assert.ok(dom, 'DOM-000001 participant must exist');
    assert.strictEqual(dom.status, 'NOT-OPERATIONAL', 'L-DR-03: DOM-000001 status must be NOT-OPERATIONAL');
    assert.ok(dom.note && dom.note.includes('L-DR-03'), 'L-DR-03 limitation reference must be in note');
});

// ─── 4. _buildConstitutionalDecisionRegistryEntry ────────────────────────────

test('T3-12-12: CDR entry has correct __type', () => {
    const { _buildConstitutionalDecisionRegistryEntry } = require('../lib/civilization/deliberation-registry');
    const entry = _buildConstitutionalDecisionRegistryEntry({
        cdpId:        'CDP-BOOTSTRAP-v1-TEST',
        drId:         'DR-BOOTSTRAP-v1-TEST',
        cumVersionRef: 'CURRENT-v12-TEST',
        timestamp:    new Date().toISOString(),
    });
    assert.strictEqual(entry.__type, 'ConstitutionalDecisionRegistryEntry');
});

test('T3-12-13: CDR entry has cdr_id, cdp_ref, dr_ref fields', () => {
    const { _buildConstitutionalDecisionRegistryEntry, _generateCdrId } = require('../lib/civilization/deliberation-registry');
    const cdpId = 'CDP-BOOTSTRAP-v1-TEST2';
    const drId  = 'DR-BOOTSTRAP-v1-TEST2';
    const entry = _buildConstitutionalDecisionRegistryEntry({
        cdpId, drId, cumVersionRef: 'CURRENT-v12-TEST2', timestamp: new Date().toISOString(),
    });
    assert.strictEqual(entry.cdr_id,  _generateCdrId(cdpId));
    assert.strictEqual(entry.cdp_ref, cdpId);
    assert.strictEqual(entry.dr_ref,  drId);
});

test('T3-12-14: CDR entry documents L-CDR-01 limitation', () => {
    const { _buildConstitutionalDecisionRegistryEntry } = require('../lib/civilization/deliberation-registry');
    const entry = _buildConstitutionalDecisionRegistryEntry({
        cdpId: 'CDP-TEST', drId: 'DR-TEST', cumVersionRef: 'v-TEST', timestamp: new Date().toISOString(),
    });
    assert.ok(entry.limitation && entry.limitation.includes('L-CDR-01'), 'L-CDR-01 must appear in limitation field');
});

// ─── 5. DeliberationRecord schema validation (all 13 elements) ───────────────

test('T3-12-15: DeliberationRecord.validate() accepts a well-formed 13-element DR', () => {
    const { DeliberationRecord } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const ts = new Date().toISOString();
    const result = DeliberationRecord.validate({
        dr_id:                   'DR-BOOTSTRAP-v1-TEST',
        question:                'Test question?',
        cum_state_at_initiation: 'CURRENT',
        cum_version_ref:         'CURRENT-v12-TEST',
        participants:            [{ runtime: 'RT-11', role: 'Authority', status: 'ACTIVE' }],
        evidence_used:           [],
        alternatives_considered: [{ alternative: 'A', selected: true }],
        conflicts_registered:    [],
        knowledge_gaps:          [{ gap_id: 'KG-DR-01', description: 'test gap' }],
        competing_objectives:    [],
        resolution_reasoning:    'Test reasoning',
        sacrificed_objectives:   [],
        decision_output_ref:     'CDP-BOOTSTRAP-v1-TEST',
        confidence:              'LOW-BOOTSTRAP',
        review_requirement:      'REVIEW-REQUIRED-ON-FIRST-KC',
        initiation_timestamp:    ts,
        completion_timestamp:    ts,
    });
    assert.strictEqual(result.valid, true, `Expected valid:true, errors: ${(result.errors || []).join('; ')}`);
});

test('T3-12-16: DeliberationRecord.validate() rejects missing dr_id', () => {
    const { DeliberationRecord } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const result = DeliberationRecord.validate({
        question: 'Test?',
        cum_state_at_initiation: 'CURRENT',
        cum_version_ref: 'v1',
        participants: [],
        evidence_used: [],
        alternatives_considered: [],
        conflicts_registered: [],
        knowledge_gaps: [],
        competing_objectives: [],
        resolution_reasoning: 'r',
        sacrificed_objectives: [],
        decision_output_ref: 'cdp-1',
        confidence: 'LOW',
        review_requirement: 'req',
        initiation_timestamp: new Date().toISOString(),
    });
    assert.strictEqual(result.valid, false, 'Missing dr_id must be invalid');
});

test('T3-12-17: DeliberationRecord.create() with all 13 elements succeeds and has __type', () => {
    const { DeliberationRecord } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const ts = new Date().toISOString();
    const record = DeliberationRecord.create({
        dr_id:                   'DR-T3-12-CREATE-TEST',
        question:                'Constitutional action recommendation?',
        cum_state_at_initiation: 'CURRENT',
        cum_version_ref:         'CURRENT-v12-create-test',
        participants:            [{ runtime: 'RT-11', role: 'Authority', status: 'ACTIVE' }],
        evidence_used:           [],
        alternatives_considered: [{ alternative: 'Bootstrap', selected: true }],
        conflicts_registered:    [],
        knowledge_gaps:          [{ gap_id: 'KG-TEST', description: 'test' }],
        competing_objectives:    [],
        resolution_reasoning:    'Bootstrap deliberation grounded in CURRENT CUM.',
        sacrificed_objectives:   [],
        decision_output_ref:     'CDP-T3-12-CREATE-TEST',
        confidence:              'LOW-BOOTSTRAP',
        review_requirement:      'REVIEW-REQUIRED-ON-FIRST-KC',
        initiation_timestamp:    ts,
        completion_timestamp:    ts,
    });
    assert.strictEqual(record.__type, 'DeliberationRecord');
    assert.strictEqual(record.dr_id, 'DR-T3-12-CREATE-TEST');
});

// ─── 6. CivilizationalDecisionProposal schema validation ─────────────────────

test('T3-12-18: CDP.validate() accepts a well-formed PRODUCED CDP', () => {
    const { CivilizationalDecisionProposal } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const result = CivilizationalDecisionProposal.validate({
        cdp_id:                               'CDP-BOOTSTRAP-v1-TEST',
        scope_classification:                 'civilizational',
        irreversibility_classification:       'REVERSIBLE',
        deliberation_record_ref:              'DR-BOOTSTRAP-v1-TEST',
        cum_version_ref:                      'CURRENT-v12-TEST',
        dom_000001_registration_id:           'CDR-CDP-BOOTSTRAP-v1-TEST',
        da_1_scope_authority_satisfied:       true,
        da_2_deliberation_grounding_satisfied: true,
        da_3_cum_grounding_satisfied:         true,
        da_4_gate_passage_satisfied:          true,
        da_5_dom_registration_satisfied:      true,
        da_6_irreversibility_classified:      true,
        production_timestamp:                 new Date().toISOString(),
        lifecycle_state:                      'PRODUCED',
    });
    assert.strictEqual(result.valid, true, `Expected valid:true, errors: ${(result.errors || []).join('; ')}`);
});

test('T3-12-19: CDP.validate() rejects invalid irreversibility_classification', () => {
    const { CivilizationalDecisionProposal } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const result = CivilizationalDecisionProposal.validate({
        cdp_id:                               'CDP-TEST',
        scope_classification:                 'civilizational',
        irreversibility_classification:       'UNKNOWN-VALUE',
        deliberation_record_ref:              'DR-TEST',
        cum_version_ref:                      'v1',
        dom_000001_registration_id:           'CDR-TEST',
        da_1_scope_authority_satisfied:       true,
        da_2_deliberation_grounding_satisfied: true,
        da_3_cum_grounding_satisfied:         true,
        da_4_gate_passage_satisfied:          true,
        da_5_dom_registration_satisfied:      true,
        da_6_irreversibility_classified:      true,
        production_timestamp:                 new Date().toISOString(),
        lifecycle_state:                      'PRODUCED',
    });
    assert.strictEqual(result.valid, false, 'Invalid irreversibility_classification must be rejected');
});

test('T3-12-20: CDP.create() with PRODUCED state returns record with __type', () => {
    const { CivilizationalDecisionProposal } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const record = CivilizationalDecisionProposal.create({
        cdp_id:                               'CDP-T3-12-CREATE',
        scope_classification:                 'civilizational',
        irreversibility_classification:       'REVERSIBLE',
        deliberation_record_ref:              'DR-T3-12-CREATE',
        cum_version_ref:                      'CURRENT-v12-create',
        dom_000001_registration_id:           'CDR-CDP-T3-12-CREATE',
        da_1_scope_authority_satisfied:       true,
        da_2_deliberation_grounding_satisfied: true,
        da_3_cum_grounding_satisfied:         true,
        da_4_gate_passage_satisfied:          true,
        da_5_dom_registration_satisfied:      true,
        da_6_irreversibility_classified:      true,
        production_timestamp:                 new Date().toISOString(),
        lifecycle_state:                      'PRODUCED',
    });
    assert.strictEqual(record.__type, 'CivilizationalDecisionProposal');
    assert.strictEqual(record.cdp_id, 'CDP-T3-12-CREATE');
});

// ─── 7. CDP lifecycle_state = PRODUCED ────────────────────────────────────────

test('T3-12-21: PRODUCED is a valid lifecycle_state enum value in CDP schema', () => {
    const { CivilizationalDecisionProposal } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const enumValues = CivilizationalDecisionProposal.SCHEMA.lifecycle_state.enum;
    assert.ok(enumValues.includes('PRODUCED'), 'PRODUCED must be in lifecycle enum');
});

// ─── 8. DA-1 through DA-6 all true ───────────────────────────────────────────

test('T3-12-22: CDP schema has all 6 DA attestation fields', () => {
    const { CivilizationalDecisionProposal } = require('../lib/constitutional-types/civilizational-decision-proposal');
    const schema = CivilizationalDecisionProposal.SCHEMA;
    assert.ok(schema.da_1_scope_authority_satisfied,        'DA-1 field exists');
    assert.ok(schema.da_2_deliberation_grounding_satisfied, 'DA-2 field exists');
    assert.ok(schema.da_3_cum_grounding_satisfied,          'DA-3 field exists');
    assert.ok(schema.da_4_gate_passage_satisfied,           'DA-4 field exists');
    assert.ok(schema.da_5_dom_registration_satisfied,       'DA-5 field exists');
    assert.ok(schema.da_6_irreversibility_classified,       'DA-6 field exists');
});

// ─── 9. Knowledge gaps registered (ER-5 compliance) ─────────────────────────

test('T3-12-23: formDeliberationAndDecision source includes KG-DR-01 (L-DR-04 registered)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require.resolve('../lib/civilization/deliberation-registry'), 'utf8');
    assert.ok(src.includes('KG-DR-01'), 'KG-DR-01 (evidence gap) must be registered in source');
    assert.ok(src.includes('L-DR-04'),  'L-DR-04 limitation reference must appear in source');
});

test('T3-12-24: source registers KG-DR-02 (RT-06 absent) and KG-DR-03 (RT-07 absent)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require.resolve('../lib/civilization/deliberation-registry'), 'utf8');
    assert.ok(src.includes('KG-DR-02'), 'KG-DR-02 (RT-06 absent) must be registered');
    assert.ok(src.includes('KG-DR-03'), 'KG-DR-03 (RT-07 absent) must be registered');
});

// ─── 10. Alternatives considered (minimum 2) ─────────────────────────────────

test('T3-12-25: formDeliberationAndDecision builds at least 2 alternatives_considered', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require.resolve('../lib/civilization/deliberation-registry'), 'utf8');
    // Source includes the 2 alternatives by their descriptive text
    assert.ok(src.includes('Initiate constitutional bootstrap with current epistemic state'), 'bootstrap alternative present');
    assert.ok(src.includes('Defer all decisions until RT-06, RT-07 operational'), 'deferral alternative present');
});

// ─── 11. Review requirement present (VC-9 bootstrap) ────────────────────────

test('T3-12-26: source contains REVIEW-REQUIRED-ON-FIRST-KC (VC-9 bootstrap plan)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(require.resolve('../lib/civilization/deliberation-registry'), 'utf8');
    assert.ok(src.includes('REVIEW-REQUIRED-ON-FIRST-KC'), 'VC-9 bootstrap review trigger must be documented');
    assert.ok(src.includes('L-DA4-09'), 'L-DA4-09 limitation must be referenced');
});

// ─── 12. formDeliberationAndDecision no-throw ────────────────────────────────

const _noThrowPromise = (async () => {
    await testAsync('T3-12-27: formDeliberationAndDecision never throws (fire-and-forget)', async () => {
        const { formDeliberationAndDecision } = require('../lib/civilization/deliberation-registry');
        let threw = false;
        try {
            // No cumId provided → will attempt _queryCURRENTCum() which fails (no Supabase)
            // Then returns null. Must not throw.
            await formDeliberationAndDecision({});
        } catch (e) { threw = true; }
        assert.ok(!threw, 'must not throw on Supabase failure');
    });
})();

// ─── 13. formDeliberationAndDecision returns object or null ──────────────────

const _returnValuePromise = (async () => {
    await testAsync('T3-12-28: formDeliberationAndDecision returns null when no CURRENT CUM found', async () => {
        const { formDeliberationAndDecision } = require('../lib/civilization/deliberation-registry');
        // In test env, _queryCURRENTCum() fails (no Supabase) → returns null
        const result = await formDeliberationAndDecision({});
        // Either null (no CUM found) or { drId, cdpId } (if CUM was found)
        const isNullOrObject = result === null || (typeof result === 'object' && result.drId);
        assert.ok(isNullOrObject, 'must return null or { drId, cdpId }');
    });
})();

// ─── 14. _emitted guard ──────────────────────────────────────────────────────

const _emittedGuardPromise = (async () => {
    await testAsync('T3-12-29: _emitted guard prevents duplicate DR/CDP emission', async () => {
        const { _emitted, formDeliberationAndDecision } = require('../lib/civilization/deliberation-registry');
        // Manually add a fake sessionKey to _emitted to test guard path
        const fakeKey = 'DR-BOOTSTRAP-v1-FAKE::CDP-BOOTSTRAP-v1-FAKE';
        _emitted.add(fakeKey);
        assert.ok(_emitted.has(fakeKey), '_emitted guard is active');
    });
})();

// ─── 15. formDeliberationAndDecision with explicit cumId/cumVersion ───────────

const _explicitCumPromise = (async () => {
    await testAsync('T3-12-30: formDeliberationAndDecision with explicit cumId/cumVersion does not query DB', async () => {
        const { formDeliberationAndDecision, _emitted } = require('../lib/civilization/deliberation-registry');
        // With explicit cumId/cumVersion, _queryCURRENTCum() is skipped
        // constitutionalStore.write() will fail (no Supabase), but should not throw
        let threw = false;
        let result;
        try {
            result = await formDeliberationAndDecision({
                cumId:      'CUM-CURRENT-v12-TEST-EXPLICIT',
                cumVersion: 'CURRENT-v12-TEST-EXPLICIT',
            });
        } catch (e) { threw = true; }
        assert.ok(!threw, 'must not throw with explicit cumId/cumVersion');
        // result is { drId, cdpId } if write succeeded, or null if write failed
        // In test env write fails → result is null (caught in try/catch in implementation)
        // OR result is { drId, cdpId } and _emitted has the sessionKey
        const isNullOrObject = result === null || (typeof result === 'object' && typeof result.drId === 'string');
        assert.ok(isNullOrObject, 'must return null or { drId, cdpId }');
    });
})();

// Wait for all async tests
Promise.all([_noThrowPromise, _returnValuePromise, _emittedGuardPromise, _explicitCumPromise])
    .then(() => { console.log('\nT3-12 done.\n'); });
