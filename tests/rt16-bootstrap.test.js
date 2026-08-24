'use strict';
// tests/rt16-bootstrap.test.js
// T4-03: AmendmentProposal + AmendmentRegistry Bootstrap (RT-16)
// Tests: 26 (T4-03-A through T4-03-Z)
//
// Authority: A0-v1.1.1 §3.17; R16-v1.0-canonical.md RS-07 RS-10 RS-11;
//            D7-v1.0 Part 12 (§12.1–§12.6); RT16-INV-1 through RT16-INV-6;
//            WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md §8 (T4-03 definition)

const assert = require('assert');
const fs     = require('fs');

// ── Modules under test ────────────────────────────────────────────────────────
const rt16 = require('../lib/civilization/rt16-bootstrap');

// ── RT-16 constitutional types ────────────────────────────────────────────────
const {
    AmendmentProposal,
    AmendmentRegistry,
    RatifiedAmendmentRecord,
    AmendmentRejectionRecord,
} = require('../lib/constitutional-types/amendment-proposal');

let passed = 0;
let failed = 0;

function test(id, desc, fn) {
    try {
        fn();
        console.log(`  PASS  ${id}: ${desc}`);
        passed++;
    } catch (e) {
        console.log(`  FAIL  ${id}: ${desc} — ${e.message}`);
        failed++;
    }
}

console.log('\n=== T4-03: RT-16 Bootstrap — AmendmentProposal + AmendmentRegistry ===\n');

// ── MODULE LOADING AND EXPORTS ────────────────────────────────────────────────

test('T4-03-A', 'rt16-bootstrap module loads without error', () => {
    assert.ok(rt16, 'module required');
});

test('T4-03-B', 'formAmendmentBootstrap exported as async function', () => {
    assert.strictEqual(typeof rt16.formAmendmentBootstrap, 'function');
});

test('T4-03-C', 'ID generators, BOOTSTRAP_AP_CLASS, and _emitted exported', () => {
    assert.strictEqual(typeof rt16._generateApId,    'function', '_generateApId');
    assert.strictEqual(typeof rt16._generateAmregId, 'function', '_generateAmregId');
    assert.strictEqual(rt16.BOOTSTRAP_AP_CLASS,      'CLASS_I',  'BOOTSTRAP_AP_CLASS=CLASS_I');
    assert.ok(rt16._emitted instanceof Set,                      '_emitted is Set');
});

test('T4-03-D', 'module exports are frozen (immutable)', () => {
    assert.ok(Object.isFrozen(rt16));
});

// ── ID GENERATION FORMULAS ────────────────────────────────────────────────────

test('T4-03-E', '_generateApId produces AP-RT16-BOOTSTRAP-v1- prefix with timestamp', () => {
    const ts = '2026-08-20T00:00:00.000Z';
    const id = rt16._generateApId(ts);
    assert.ok(id.startsWith('AP-RT16-BOOTSTRAP-v1-'), `got: ${id}`);
    assert.ok(id.includes(ts), 'timestamp embedded');
});

test('T4-03-F', '_generateAmregId produces AMREG- prefix derived from apId', () => {
    const ts   = '2026-08-20T00:00:00.000Z';
    const apId = rt16._generateApId(ts);
    const id   = rt16._generateAmregId(apId);
    assert.ok(id.startsWith('AMREG-'), `got: ${id}`);
    assert.ok(id.includes(apId),       'apId embedded in amregId');
});

// ── AMENDMENT PROPOSAL SCHEMA VALIDATION ─────────────────────────────────────

test('T4-03-G', 'AmendmentProposal.validate() accepts valid bootstrap entry (CLASS_I, AP_VERIFICATION)', () => {
    const ts = new Date().toISOString();
    const result = AmendmentProposal.validate({
        amendment_proposal_id:        rt16._generateApId(ts),
        proposal_class:               'CLASS_I',
        lifecycle_state:              'AP_VERIFICATION',
        ap1_identification:           'Bootstrap AP-1: APEX-CONSTITUTION-v1.0 §3.17',
        ap2_justification:            'Bootstrap AP-2: Wave 4 pathway initialization',
        ap3_preservation_assessment:  'Bootstrap AP-3: No D-2 terminal commitment affected',
        ap4_precedence_analysis:      'Bootstrap AP-4: Consistent with A0 §3.17 and D7 Part 12',
        ap5_implementation_pathway:   'Bootstrap AP-5: Full ratification deferred (L-RT16-01 L-RT16-02)',
        ap6_reversibility_assessment: 'Bootstrap AP-6: Reversible — no constitutional text modified',
        proposer_identity_ref:        'APEX-CONSTITUTION-v1.0-FOUNDING-AUTHORITY-BOOTSTRAP',
        proposal_receipt_timestamp:   ts,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-03-H', 'AmendmentProposal.validate() REJECTS missing ap1_identification (RT16-INV-4)', () => {
    const ts = new Date().toISOString();
    const result = AmendmentProposal.validate({
        amendment_proposal_id:        rt16._generateApId(ts),
        proposal_class:               'CLASS_I',
        lifecycle_state:              'AP_VERIFICATION',
        // ap1_identification: omitted — RT16-INV-4: all six AP requirements required
        ap2_justification:            'Test AP-2',
        ap3_preservation_assessment:  'Test AP-3',
        ap4_precedence_analysis:      'Test AP-4',
        ap5_implementation_pathway:   'Test AP-5',
        ap6_reversibility_assessment: 'Test AP-6',
        proposer_identity_ref:        'APEX-BOOTSTRAP',
        proposal_receipt_timestamp:   ts,
    });
    assert.ok(!result.valid, 'missing ap1_identification must be invalid (RT16-INV-4)');
    assert.ok(result.errors.some(e => e.includes('ap1_identification')));
});

test('T4-03-I', 'AmendmentProposal.validate() REJECTS invalid proposal_class (D7 §12.5 guard)', () => {
    const ts = new Date().toISOString();
    const result = AmendmentProposal.validate({
        amendment_proposal_id:        rt16._generateApId(ts),
        proposal_class:               'CLASS_V',  // not in enum: I/II/III/IV only
        lifecycle_state:              'AP_VERIFICATION',
        ap1_identification:           'Test',
        ap2_justification:            'Test',
        ap3_preservation_assessment:  'Test',
        ap4_precedence_analysis:      'Test',
        ap5_implementation_pathway:   'Test',
        ap6_reversibility_assessment: 'Test',
        proposer_identity_ref:        'APEX-BOOTSTRAP',
        proposal_receipt_timestamp:   ts,
    });
    assert.ok(!result.valid, 'CLASS_V not in enum; must be invalid (D7 §12.5: I/II/III/IV only)');
});

test('T4-03-J', 'AmendmentProposal.CONSTITUTIONAL.structural_immutable is false (lifecycle-stateful)', () => {
    assert.strictEqual(AmendmentProposal.CONSTITUTIONAL.structural_immutable, false,
        'AmendmentProposal must be lifecycle-stateful — RS-11 state machine governs transitions');
});

// ── AMENDMENT REGISTRY SCHEMA VALIDATION ─────────────────────────────────────

test('T4-03-K', 'AmendmentRegistry.validate() accepts valid bootstrap entry', () => {
    const ts   = new Date().toISOString();
    const apId = rt16._generateApId(ts);
    const result = AmendmentRegistry.validate({
        registry_entry_id:                 rt16._generateAmregId(apId),
        amendment_proposal_ref:            apId,
        tracked_proposal_state:            'AP_VERIFICATION',
        state_last_updated:                ts,
        rt16_inv5_no_silent_drop_attested: true,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-03-L', 'AmendmentRegistry.validate() REJECTS missing rt16_inv5_no_silent_drop_attested (RT16-INV-5)', () => {
    const ts   = new Date().toISOString();
    const apId = rt16._generateApId(ts);
    const result = AmendmentRegistry.validate({
        registry_entry_id:      rt16._generateAmregId(apId),
        amendment_proposal_ref: apId,
        tracked_proposal_state: 'AP_VERIFICATION',
        state_last_updated:     ts,
        // rt16_inv5_no_silent_drop_attested: omitted — RT16-INV-5
    });
    assert.ok(!result.valid, 'missing rt16_inv5_no_silent_drop_attested must be invalid (RT16-INV-5)');
});

test('T4-03-M', 'AmendmentRegistry tracked_proposal_state enum matches AmendmentProposal lifecycle_state enum', () => {
    const apEnum  = AmendmentProposal.SCHEMA.lifecycle_state.enum;
    const regEnum = AmendmentRegistry.SCHEMA.tracked_proposal_state.enum;
    assert.deepStrictEqual(
        [...apEnum].sort(),
        [...regEnum].sort(),
        'both enums must be identical — registry tracks AP state machine (RS-11)'
    );
});

test('T4-03-N', 'AmendmentRegistry.CONSTITUTIONAL.structural_immutable is false (state-updated as AP progresses)', () => {
    assert.strictEqual(AmendmentRegistry.CONSTITUTIONAL.structural_immutable, false,
        'AmendmentRegistry is updated on each AP state transition (RS-11)');
});

// ── RATIFIED AMENDMENT RECORD SCHEMA VALIDATION ───────────────────────────────

test('T4-03-O', 'RatifiedAmendmentRecord.validate() REJECTS missing deliberation_record_ref (RT16-INV-1)', () => {
    const ts   = new Date().toISOString();
    const apId = rt16._generateApId(ts);
    const result = RatifiedAmendmentRecord.validate({
        ratified_amendment_id:      `RAR-${apId}`,
        amendment_proposal_ref:     apId,
        // deliberation_record_ref: omitted — RT16-INV-1: no ratification without RT-11 DeliberationRecord
        preservation_audit_ref:     `PAR-BOOTSTRAP-${ts}`,
        founding_authorization_ref: `AUTH-BOOTSTRAP-${ts}`,
        ratified_constitutional_text: 'APEX-CONSTITUTION-v1.0 §3.17 — bootstrap placeholder text',
        ratification_timestamp:     ts,
        deletion_prohibited:        true,
    });
    assert.ok(!result.valid, 'missing deliberation_record_ref must be invalid (RT16-INV-1)');
});

test('T4-03-P', 'RatifiedAmendmentRecord.validate() REJECTS missing preservation_audit_ref (RT16-INV-2)', () => {
    const ts   = new Date().toISOString();
    const apId = rt16._generateApId(ts);
    const result = RatifiedAmendmentRecord.validate({
        ratified_amendment_id:      `RAR-${apId}`,
        amendment_proposal_ref:     apId,
        deliberation_record_ref:    `DR-BOOTSTRAP-${ts}`,
        // preservation_audit_ref: omitted — RT16-INV-2: no ratification without RT-04 Preservation Audit PASS
        founding_authorization_ref: `AUTH-BOOTSTRAP-${ts}`,
        ratified_constitutional_text: 'APEX-CONSTITUTION-v1.0 §3.17 — bootstrap placeholder text',
        ratification_timestamp:     ts,
        deletion_prohibited:        true,
    });
    assert.ok(!result.valid, 'missing preservation_audit_ref must be invalid (RT16-INV-2)');
});

test('T4-03-Q', 'RatifiedAmendmentRecord.validate() REJECTS missing founding_authorization_ref (RT16-INV-3)', () => {
    const ts   = new Date().toISOString();
    const apId = rt16._generateApId(ts);
    const result = RatifiedAmendmentRecord.validate({
        ratified_amendment_id:   `RAR-${apId}`,
        amendment_proposal_ref:  apId,
        deliberation_record_ref: `DR-BOOTSTRAP-${ts}`,
        preservation_audit_ref:  `PAR-BOOTSTRAP-${ts}`,
        // founding_authorization_ref: omitted — RT16-INV-3: founding-level human authorization required
        ratified_constitutional_text: 'APEX-CONSTITUTION-v1.0 §3.17 — bootstrap placeholder text',
        ratification_timestamp:  ts,
        deletion_prohibited:     true,
    });
    assert.ok(!result.valid, 'missing founding_authorization_ref must be invalid (RT16-INV-3)');
});

test('T4-03-R', 'RatifiedAmendmentRecord.CONSTITUTIONAL.structural_immutable is true (permanent record)', () => {
    assert.strictEqual(RatifiedAmendmentRecord.CONSTITUTIONAL.structural_immutable, true,
        'RatifiedAmendmentRecord is permanent — D8 PROH-5; no modifications permitted once produced');
});

// ── AMENDMENT REJECTION RECORD SCHEMA VALIDATION ──────────────────────────────

test('T4-03-S', 'AmendmentRejectionRecord.validate() REJECTS missing rejection_basis (RT16-INV-5)', () => {
    const ts   = new Date().toISOString();
    const apId = rt16._generateApId(ts);
    const result = AmendmentRejectionRecord.validate({
        rejection_record_id:    `ARR-${apId}`,
        amendment_proposal_ref: apId,
        // rejection_basis: omitted — RT16-INV-5: rejection grounds must be explicit (D8 PROH-4)
        rejection_stage:        'AP_VERIFICATION',
        class_iv_immediate:     false,
        rejection_timestamp:    ts,
        deletion_prohibited:    true,
    });
    assert.ok(!result.valid, 'missing rejection_basis must be invalid (RT16-INV-5; D8 PROH-4)');
});

test('T4-03-T', 'AmendmentRejectionRecord rejection_stage enum has exactly 4 values', () => {
    const schema = AmendmentRejectionRecord.SCHEMA.rejection_stage;
    assert.strictEqual(schema.enum.length, 4, 'exactly 4 rejection stages');
    assert.ok(schema.enum.includes('AP_VERIFICATION'),        'AP_VERIFICATION required');
    assert.ok(schema.enum.includes('PRESERVATION_AUDIT'),     'PRESERVATION_AUDIT required');
    assert.ok(schema.enum.includes('AWAITING_AUTHORIZATION'), 'AWAITING_AUTHORIZATION required');
    assert.ok(schema.enum.includes('CLASS_IV_IMMEDIATE'),     'CLASS_IV_IMMEDIATE required (RT16-INV-6)');
});

test('T4-03-U', 'AmendmentRejectionRecord.CONSTITUTIONAL.structural_immutable is true (permanent record)', () => {
    assert.strictEqual(AmendmentRejectionRecord.CONSTITUTIONAL.structural_immutable, true,
        'AmendmentRejectionRecord is permanent — D8 PROH-5; RT16-INV-5 provenance');
});

// ── CONSTITUTIONAL LIMITATIONS DOCUMENTATION ──────────────────────────────────

test('T4-03-V', 'L-RT16-01 and L-RT16-02 documented in rt16-bootstrap.js source', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt16-bootstrap'), 'utf8');
    assert.ok(src.includes('L-RT16-01'), 'L-RT16-01 documented');
    assert.ok(src.includes('L-RT16-02'), 'L-RT16-02 documented');
    assert.ok(src.includes("'AP_VERIFICATION'"),
        'lifecycle_state=AP_VERIFICATION enforced at bootstrap (L-RT16-01)');
    assert.ok(src.includes("'CLASS_I'"),
        'proposal_class=CLASS_I enforced at bootstrap (RT16-INV-6 safe; D7 §12.5)');
});

test('T4-03-W', 'bootstrap source does not produce lifecycle_state=RATIFIED (L-RT16-01)', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt16-bootstrap'), 'utf8');
    // RATIFIED must not appear as a lifecycle_state value in the bootstrap source
    // (L-RT16-01: no actual constitution change at bootstrap)
    const hasRatified = /lifecycle_state:\s+'RATIFIED'/.test(src);
    assert.ok(!hasRatified,
        'RATIFIED lifecycle_state must not be produced at bootstrap — L-RT16-01');
});

test('T4-03-X', 'bootstrap AmendmentProposal uses CLASS_I not CLASS_IV (RT16-INV-6)', () => {
    assert.strictEqual(rt16.BOOTSTRAP_AP_CLASS, 'CLASS_I',
        'bootstrap must be CLASS_I — RT16-INV-6 (Class IV triggers immediate rejection); D7 §12.5');
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt16-bootstrap'), 'utf8');
    const hasClassIV = /proposal_class:\s+'CLASS_IV'/.test(src);
    assert.ok(!hasClassIV,
        'CLASS_IV must not appear as proposal_class in bootstrap — RT16-INV-6 mandates immediate rejection');
});

test('T4-03-Y', 'rt16_inv5_no_silent_drop_attested=true enforced in bootstrap AmendmentRegistry', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt16-bootstrap'), 'utf8');
    assert.ok(src.includes('rt16_inv5_no_silent_drop_attested: true'),
        'RT16-INV-5 attestation must be true in bootstrap AmendmentRegistry — proposals never silently dropped');
});

// ── ASYNC BEHAVIOR ────────────────────────────────────────────────────────────

test('T4-03-Z', 'formAmendmentBootstrap() does not throw with minimal valid input', (done) => {
    (async () => {
        const ts   = new Date().toISOString();
        const drId = `DR-T4-03-Z-${ts}`;
        let threw  = false;
        let result;
        try {
            result = await rt16.formAmendmentBootstrap({
                drId,
                cmId: `CM-RT11-BOOTSTRAP-v1-${ts}`,
            });
        } catch (_) {
            threw = true;
        }
        assert.ok(!threw, 'formAmendmentBootstrap() must not throw');
        // constitutional-store.write() is fire-and-forget; result may be { apId, amregId } or null
        assert.ok(result === null || (result && typeof result.apId === 'string'),
            'result must be null or object with apId');
    })().then(done).catch(done);
});

// ── SUMMARY ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`T4-03: ${passed + failed} tests — ${passed} PASS, ${failed} FAIL`);

if (failed > 0) {
    process.exit(1);
}
