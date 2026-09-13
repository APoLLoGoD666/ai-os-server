'use strict';
// tests/rt04-bootstrap.test.js
// T4-04: ConstitutionalAuditRecord + AuditScope + ConstitutionalComplianceAttestation Bootstrap (RT-04)
// Tests: 30 (T4-04-A through T4-04-AD)
//
// Authority: A0-v1.1.1 §3.5 (RT-04); R4-v1.0-canonical.md RS-07 RS-10;
//            D6 AIR-5 (audit independence); D8 INV-3 (Audit Requirement);
//            RT04-INV-1 through RT04-INV-5; RT04-INV-06; RT04-PROH-01; RT04-PROH-08;
//            WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md §8 (T4-04 definition)

const assert = require('assert');
const fs     = require('fs');

// ── Modules under test ────────────────────────────────────────────────────────
const rt04 = require('../lib/civilization/rt04-bootstrap');

// ── RT-04 constitutional types ────────────────────────────────────────────────
const {
    ConstitutionalAuditRecord,
    ConstitutionalComplianceAttestation,
    ConstitutionalViolationRecord,
    AuditScope,
    PreservationAuditRecord,
} = require('../lib/constitutional-types/audit-record');

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

console.log('\n=== T4-04: RT-04 Bootstrap — Audit Runtime (AuditScope + CAR + CCA) ===\n');

// ── MODULE LOADING AND EXPORTS ────────────────────────────────────────────────

test('T4-04-A', 'rt04-bootstrap module loads without error', () => {
    assert.ok(rt04, 'module required');
});

test('T4-04-B', 'formBootstrapAudit exported as async function', () => {
    assert.strictEqual(typeof rt04.formBootstrapAudit, 'function');
});

test('T4-04-C', 'ID generators and constants exported', () => {
    assert.strictEqual(typeof rt04._generateAuditScopeId,        'function',  '_generateAuditScopeId');
    assert.strictEqual(typeof rt04._generateCarId,                'function',  '_generateCarId');
    assert.strictEqual(typeof rt04._generateCcaId,                'function',  '_generateCcaId');
    assert.strictEqual(typeof rt04.BOOTSTRAP_AUDIT_TARGET,        'string',    'BOOTSTRAP_AUDIT_TARGET');
    assert.strictEqual(typeof rt04.BOOTSTRAP_AUDITOR_SIGNATURE,   'string',    'BOOTSTRAP_AUDITOR_SIGNATURE');
    assert.ok(Array.isArray(rt04.BOOTSTRAP_AUDIT_CRITERIA),                    'BOOTSTRAP_AUDIT_CRITERIA is array');
    assert.ok(rt04._emitted instanceof Set,                                     '_emitted is Set');
});

test('T4-04-D', 'module exports are frozen (immutable)', () => {
    assert.ok(Object.isFrozen(rt04));
});

// ── ID GENERATION FORMULAS ────────────────────────────────────────────────────

test('T4-04-E', '_generateAuditScopeId produces ASCOPE-RT04-BOOTSTRAP-v1- prefix with timestamp', () => {
    const ts = '2026-08-20T00:00:00.000Z';
    const id = rt04._generateAuditScopeId(ts);
    assert.ok(id.startsWith('ASCOPE-RT04-BOOTSTRAP-v1-'), `got: ${id}`);
    assert.ok(id.includes(ts), 'timestamp embedded');
});

test('T4-04-F', '_generateCarId produces CAR-RT04-BOOTSTRAP-v1- prefix with timestamp', () => {
    const ts = '2026-08-20T00:00:00.000Z';
    const id = rt04._generateCarId(ts);
    assert.ok(id.startsWith('CAR-RT04-BOOTSTRAP-v1-'), `got: ${id}`);
    assert.ok(id.includes(ts), 'timestamp embedded');
});

test('T4-04-G', '_generateCcaId produces CCA-RT04-BOOTSTRAP-v1- prefix with timestamp', () => {
    const ts = '2026-08-20T00:00:00.000Z';
    const id = rt04._generateCcaId(ts);
    assert.ok(id.startsWith('CCA-RT04-BOOTSTRAP-v1-'), `got: ${id}`);
    assert.ok(id.includes(ts), 'timestamp embedded');
});

// ── CONSTITUTIONAL AUDIT RECORD SCHEMA VALIDATION ────────────────────────────

test('T4-04-H', 'ConstitutionalAuditRecord.validate() accepts valid bootstrap entry (PASS)', () => {
    const ts = new Date().toISOString();
    const result = ConstitutionalAuditRecord.validate({
        audit_record_id:            rt04._generateCarId(ts),
        audit_target_id:            rt04.BOOTSTRAP_AUDIT_TARGET,
        audit_criteria:             ['A0-v1.1.1 §3.5 — RT-04 obligation 1 (audit all runtimes)'],
        evidence_artifacts:         [{ ref: 'DR-BOOTSTRAP-T3-12', type: 'DeliberationRecord' }],
        compliance_determination:   'PASS',
        auditor_signature:          rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
        audit_start_timestamp:      ts,
        audit_completion_timestamp: ts,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-04-I', 'ConstitutionalAuditRecord.validate() REJECTS missing audit_criteria (RT04-INV-04)', () => {
    const ts = new Date().toISOString();
    const result = ConstitutionalAuditRecord.validate({
        audit_record_id:            rt04._generateCarId(ts),
        audit_target_id:            rt04.BOOTSTRAP_AUDIT_TARGET,
        // audit_criteria: omitted — RT04-INV-04: evidence must trace to criteria
        evidence_artifacts:         [{ ref: 'DR-BOOTSTRAP-T3-12', type: 'DeliberationRecord' }],
        compliance_determination:   'PASS',
        auditor_signature:          rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
        audit_start_timestamp:      ts,
        audit_completion_timestamp: ts,
    });
    assert.ok(!result.valid, 'missing audit_criteria must be invalid (RT04-INV-04)');
    assert.ok(result.errors.some(e => e.includes('audit_criteria')));
});

test('T4-04-J', 'ConstitutionalAuditRecord.validate() REJECTS missing evidence_artifacts', () => {
    const ts = new Date().toISOString();
    const result = ConstitutionalAuditRecord.validate({
        audit_record_id:            rt04._generateCarId(ts),
        audit_target_id:            rt04.BOOTSTRAP_AUDIT_TARGET,
        audit_criteria:             ['A0-v1.1.1 §3.5 — RT-04 audit obligation'],
        // evidence_artifacts: omitted
        compliance_determination:   'PASS',
        auditor_signature:          rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
        audit_start_timestamp:      ts,
        audit_completion_timestamp: ts,
    });
    assert.ok(!result.valid, 'missing evidence_artifacts must be invalid');
    assert.ok(result.errors.some(e => e.includes('evidence_artifacts')));
});

test('T4-04-K', 'ConstitutionalAuditRecord.validate() REJECTS invalid compliance_determination', () => {
    const ts = new Date().toISOString();
    const result = ConstitutionalAuditRecord.validate({
        audit_record_id:            rt04._generateCarId(ts),
        audit_target_id:            rt04.BOOTSTRAP_AUDIT_TARGET,
        audit_criteria:             ['A0-v1.1.1 §3.5 — RT-04 audit obligation'],
        evidence_artifacts:         [{ ref: 'DR-BOOTSTRAP-T3-12', type: 'DeliberationRecord' }],
        compliance_determination:   'CONDITIONAL-PASS',  // not in enum: PASS/FAIL/DEFICIENCY only
        auditor_signature:          rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
        audit_start_timestamp:      ts,
        audit_completion_timestamp: ts,
    });
    assert.ok(!result.valid, 'CONDITIONAL-PASS not in compliance_determination enum');
});

test('T4-04-L', 'ConstitutionalAuditRecord.CONSTITUTIONAL.structural_immutable is true (permanent once finalized)', () => {
    assert.strictEqual(ConstitutionalAuditRecord.CONSTITUTIONAL.structural_immutable, true,
        'ConstitutionalAuditRecord is immutable after finalization — RT04-INV-06');
});

// ── CONSTITUTIONAL COMPLIANCE ATTESTATION SCHEMA VALIDATION ──────────────────

test('T4-04-M', 'ConstitutionalComplianceAttestation.validate() accepts valid bootstrap entry (CONDITIONAL-PASS)', () => {
    const ts = new Date().toISOString();
    const result = ConstitutionalComplianceAttestation.validate({
        attestation_id:             rt04._generateCcaId(ts),
        target_identifier:          rt04.BOOTSTRAP_AUDIT_TARGET,
        certification_period_start: ts,
        certification_period_end:   ts,
        attestation_determination:  'CONDITIONAL-PASS',
        open_deficiency_refs:       ['L-RT04-01', 'L-RT04-02'],
        evidence_basis:             'Bootstrap ConstitutionalAuditRecord — 6 declared evidence artifacts; L-RT04-01 limitation',
        issuing_auditor_signature:  rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
        attest_timestamp:           ts,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-04-N', 'ConstitutionalComplianceAttestation.validate() REJECTS missing evidence_basis (RT04-INV-04)', () => {
    const ts = new Date().toISOString();
    const result = ConstitutionalComplianceAttestation.validate({
        attestation_id:             rt04._generateCcaId(ts),
        target_identifier:          rt04.BOOTSTRAP_AUDIT_TARGET,
        certification_period_start: ts,
        certification_period_end:   ts,
        attestation_determination:  'CONDITIONAL-PASS',
        // evidence_basis: omitted — RT04-INV-04: determination must trace to evidence
        issuing_auditor_signature:  rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
        attest_timestamp:           ts,
    });
    assert.ok(!result.valid, 'missing evidence_basis must be invalid (RT04-INV-04; RT04-PROH-08)');
    assert.ok(result.errors.some(e => e.includes('evidence_basis')));
});

test('T4-04-O', 'ConstitutionalComplianceAttestation.validate() REJECTS invalid attestation_determination', () => {
    const ts = new Date().toISOString();
    const result = ConstitutionalComplianceAttestation.validate({
        attestation_id:             rt04._generateCcaId(ts),
        target_identifier:          rt04.BOOTSTRAP_AUDIT_TARGET,
        certification_period_start: ts,
        certification_period_end:   ts,
        attestation_determination:  'PASS_WITH_NOTES',  // not in enum: PASS/CONDITIONAL-PASS/FAIL
        evidence_basis:             'Test evidence',
        issuing_auditor_signature:  rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
        attest_timestamp:           ts,
    });
    assert.ok(!result.valid, 'PASS_WITH_NOTES not in attestation_determination enum');
});

test('T4-04-P', 'ConstitutionalComplianceAttestation.CONSTITUTIONAL.structural_immutable is false (updated as deficiencies resolve)', () => {
    assert.strictEqual(ConstitutionalComplianceAttestation.CONSTITUTIONAL.structural_immutable, false,
        'ConstitutionalComplianceAttestation is updated when open_deficiency_refs are resolved');
});

// ── AUDIT SCOPE SCHEMA VALIDATION ────────────────────────────────────────────

test('T4-04-Q', 'AuditScope.validate() accepts valid bootstrap entry', () => {
    const ts = new Date().toISOString();
    const result = AuditScope.validate({
        scope_id:             rt04._generateAuditScopeId(ts),
        target_runtime_id:    rt04.BOOTSTRAP_AUDIT_TARGET,
        scope_description:    'Wave 3+4 bootstrap chain audit (T4-04)',
        constitutional_basis: 'A0-v1.1.1 §3.5 RT-04 Obligation 1; D8 INV-3',
        audit_criteria:       ['A0-v1.1.1 §3.5 — RT-04 audit obligation'],
        coverage_obligations: ['D8 INV-3 Audit Requirement — first RT-04 audit record produced'],
        scope_established_at: ts,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-04-R', 'AuditScope.validate() REJECTS missing constitutional_basis', () => {
    const ts = new Date().toISOString();
    const result = AuditScope.validate({
        scope_id:             rt04._generateAuditScopeId(ts),
        target_runtime_id:    rt04.BOOTSTRAP_AUDIT_TARGET,
        scope_description:    'Test scope',
        // constitutional_basis: omitted
        audit_criteria:       ['A0-v1.1.1 §3.5'],
        coverage_obligations: ['D8 INV-3'],
        scope_established_at: ts,
    });
    assert.ok(!result.valid, 'missing constitutional_basis must be invalid');
    assert.ok(result.errors.some(e => e.includes('constitutional_basis')));
});

test('T4-04-S', 'AuditScope.validate() REJECTS missing coverage_obligations (RT04-INV-07)', () => {
    const ts = new Date().toISOString();
    const result = AuditScope.validate({
        scope_id:             rt04._generateAuditScopeId(ts),
        target_runtime_id:    rt04.BOOTSTRAP_AUDIT_TARGET,
        scope_description:    'Test scope',
        constitutional_basis: 'A0-v1.1.1 §3.5',
        audit_criteria:       ['A0-v1.1.1 §3.5'],
        // coverage_obligations: omitted — RT04-INV-07: scope must cover all obligations
        scope_established_at: ts,
    });
    assert.ok(!result.valid, 'missing coverage_obligations must be invalid (RT04-INV-07)');
});

test('T4-04-T', 'AuditScope.CONSTITUTIONAL.structural_immutable is false (extended when new runtimes constituted)', () => {
    assert.strictEqual(AuditScope.CONSTITUTIONAL.structural_immutable, false,
        'AuditScope is extended when new runtimes are constituted (RT-16 amendment pathway)');
});

// ── PRESERVATION AUDIT RECORD SCHEMA VALIDATION ───────────────────────────────

test('T4-04-U', 'PreservationAuditRecord.validate() accepts valid entry with PRESERVATION_CONFIRMED verdict', () => {
    const ts   = new Date().toISOString();
    const apId = `AP-RT16-BOOTSTRAP-v1-${ts}`;
    const result = PreservationAuditRecord.validate({
        preservation_audit_id:  `PAR-${apId}`,
        amendment_ref:          apId,
        preserved_elements:     ['D-2 terminal commitments', 'A0-v1.1.1 §3.17 RT-16 authority boundary'],
        verified_at:            ts,
        verdict:                'PRESERVATION_CONFIRMED',
        preservation_criteria:  ['D7 §12.1 Constitutional Continuity Principle', 'D-2 Forbidden Assumption'],
        auditor_ref:            rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
    });
    assert.ok(result.valid, `invalid: ${JSON.stringify(result.errors)}`);
});

test('T4-04-V', 'PreservationAuditRecord.validate() REJECTS missing amendment_ref', () => {
    const ts = new Date().toISOString();
    const result = PreservationAuditRecord.validate({
        preservation_audit_id: `PAR-BOOTSTRAP-${ts}`,
        // amendment_ref: omitted — PreservationAuditRecord is always amendment-specific
        preserved_elements:    ['D-2 terminal commitments'],
        verified_at:           ts,
        verdict:               'PRESERVATION_CONFIRMED',
        preservation_criteria: ['D7 §12.1 Constitutional Continuity Principle'],
        auditor_ref:           rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
    });
    assert.ok(!result.valid, 'missing amendment_ref must be invalid (PAR is amendment-specific)');
    assert.ok(result.errors.some(e => e.includes('amendment_ref')));
});

test('T4-04-W', 'PreservationAuditRecord.validate() REJECTS invalid verdict enum', () => {
    const ts   = new Date().toISOString();
    const apId = `AP-RT16-BOOTSTRAP-v1-${ts}`;
    const result = PreservationAuditRecord.validate({
        preservation_audit_id: `PAR-${apId}`,
        amendment_ref:         apId,
        preserved_elements:    ['D-2 terminal commitments'],
        verified_at:           ts,
        verdict:               'PASS',  // not in enum: PRESERVATION_CONFIRMED/FAILED/PARTIAL
        preservation_criteria: ['D7 §12.1'],
        auditor_ref:           rt04.BOOTSTRAP_AUDITOR_SIGNATURE,
    });
    assert.ok(!result.valid, 'PASS not in verdict enum (must be PRESERVATION_CONFIRMED/FAILED/PARTIAL)');
});

test('T4-04-X', 'PreservationAuditRecord.CONSTITUTIONAL.structural_immutable is true (immutable once issued to RT-16)', () => {
    assert.strictEqual(PreservationAuditRecord.CONSTITUTIONAL.structural_immutable, true,
        'PreservationAuditRecord is immutable once issued — mandatory RT-16 precondition (RT16-INV-2)');
});

// ── CONSTITUTIONAL LIMITATIONS DOCUMENTATION ──────────────────────────────────

test('T4-04-Y', 'L-RT04-01 through L-RT04-04 documented in rt04-bootstrap.js source', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt04-bootstrap'), 'utf8');
    assert.ok(src.includes('L-RT04-01'), 'L-RT04-01 documented');
    assert.ok(src.includes('L-RT04-02'), 'L-RT04-02 documented');
    assert.ok(src.includes('L-RT04-03'), 'L-RT04-03 documented');
    assert.ok(src.includes('L-RT04-04'), 'L-RT04-04 documented');
    assert.ok(src.includes("compliance_determination:   'PASS'"),
        'PASS compliance_determination (no violations at bootstrap)');
    assert.ok(src.includes("attestation_determination:   'CONDITIONAL-PASS'"),
        'CONDITIONAL-PASS attestation (bootstrap-level evidence; L-RT04-01)');
});

test('T4-04-Z', 'BOOTSTRAP_AUDIT_CRITERIA has at least 7 entries covering Wave 3+4 bootstrap decisions', () => {
    assert.ok(rt04.BOOTSTRAP_AUDIT_CRITERIA.length >= 7,
        `BOOTSTRAP_AUDIT_CRITERIA must have at least 7 entries; got ${rt04.BOOTSTRAP_AUDIT_CRITERIA.length}`);
    // Verify key criteria are present
    const criteria = rt04.BOOTSTRAP_AUDIT_CRITERIA;
    assert.ok(criteria.some(c => c.includes('RT-11') || c.includes('CausalModel')),
        'RT-11 CausalModel criterion required');
    assert.ok(criteria.some(c => c.includes('RT-14') || c.includes('Reflection')),
        'RT-14 Reflection criterion required');
    assert.ok(criteria.some(c => c.includes('RT-16') || c.includes('Amendment')),
        'RT-16 Amendment criterion required');
    assert.ok(criteria.some(c => c.includes('DeliberationRecord') || c.includes('D7')),
        'DeliberationRecord/D7 criterion required');
    assert.ok(criteria.some(c => c.includes('D8') || c.includes('INV-3')),
        'D8 INV-3 Audit Requirement criterion required');
});

// ── INVARIANT ENFORCEMENT ─────────────────────────────────────────────────────

test('T4-04-AA', 'RT04-INV-1 compliance: rt04-bootstrap.js does not require or call any RT-03 facility', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt04-bootstrap'), 'utf8');
    // RT04-INV-1: RT-04 is never processed through RT-03 for its own audit operations (AIR-5)
    const hasRt03 = /require.*rt03|require.*rt-03|constitutional-gate|execution-transaction/.test(src);
    assert.ok(!hasRt03,
        'RT04-INV-1: rt04-bootstrap must NOT require any RT-03 facility (AIR-5 independence)');
});

test('T4-04-AB', 'RT04-INV-3/RT04-PROH-01: source contains no mutation calls on audited objects', () => {
    const src = fs.readFileSync(require.resolve('../lib/civilization/rt04-bootstrap'), 'utf8');
    // RT04-PROH-01: read-only evidence collection — RT-04 never modifies audited objects
    // RT04-INV-3: RT-04 never modifies any constitutional object owned by another runtime
    // Check that no .update() calls exist on anything other than RT-04's own records
    const hasUpdate = /\.update\s*\(/.test(src);
    const hasDelete = /\.delete\s*\(/.test(src);
    assert.ok(!hasUpdate, 'RT04-PROH-01: no .update() calls — audit is read-only');
    assert.ok(!hasDelete, 'RT04-PROH-01: no .delete() calls — audit is read-only');
});

test('T4-04-AC', 'RT04-INV-06: all 5 RT-04 type deletion_policy values are PROHIBITED', () => {
    // RT04-INV-06: audit records NEVER DELETED
    assert.strictEqual(ConstitutionalAuditRecord.CONSTITUTIONAL.deletion_policy,          'PROHIBITED', 'CAR deletion PROHIBITED');
    assert.strictEqual(ConstitutionalComplianceAttestation.CONSTITUTIONAL.deletion_policy, 'PROHIBITED', 'CCA deletion PROHIBITED');
    assert.strictEqual(ConstitutionalViolationRecord.CONSTITUTIONAL.deletion_policy,       'PROHIBITED', 'CVR deletion PROHIBITED');
    assert.strictEqual(AuditScope.CONSTITUTIONAL.deletion_policy,                          'PROHIBITED', 'AuditScope deletion PROHIBITED');
    assert.strictEqual(PreservationAuditRecord.CONSTITUTIONAL.deletion_policy,             'PROHIBITED', 'PAR deletion PROHIBITED');
});

// ── RELATIONSHIP TESTS ────────────────────────────────────────────────────────

test('T4-04-AD', 'RT-14, RT-11, RT-16 compatibility: BOOTSTRAP_AUDIT_CRITERIA references all three (T4-01, T4-02, T4-03)', () => {
    const criteria = rt04.BOOTSTRAP_AUDIT_CRITERIA;
    // RT-14 compatibility (T4-01)
    assert.ok(criteria.some(c => c.includes('T4-01') || c.includes('RT-14') || c.includes('RT14-INV')),
        'RT-14 (T4-01) must appear in BOOTSTRAP_AUDIT_CRITERIA');
    // RT-11 compatibility (T4-02)
    assert.ok(criteria.some(c => c.includes('T4-02') || c.includes('RT-11') || c.includes('CausalModel')),
        'RT-11 (T4-02) must appear in BOOTSTRAP_AUDIT_CRITERIA');
    // RT-16 compatibility (T4-03)
    assert.ok(criteria.some(c => c.includes('T4-03') || c.includes('RT-16') || c.includes('Amendment')),
        'RT-16 (T4-03) must appear in BOOTSTRAP_AUDIT_CRITERIA');
});

// ── ASYNC BEHAVIOR ────────────────────────────────────────────────────────────

// Note: T4-04-AD through ... was the last test above.
// The async no-throw test is the 30th test.

// Actually, let me re-count: A-Z = 26, AA-AD = 4, total = 30. Let me add the async test as AE (31st).
// Wait — the spec says A through AD = 30 tests. I'll use AD as the RT-16 compatibility test
// and add AE as the async no-throw test, making 31 total. Let me keep it at 30 by
// merging the async test into the last slot. Actually the spec says:
// "AD. RT-16 compatibility where applicable" — and then no more. The async test goes here separately.
// I'll add it as test 30 using a fresh test ID style.

test('T4-04-AE', 'formBootstrapAudit() does not throw with minimal valid input (async no-throw contract)', (done) => {
    (async () => {
        const ts   = new Date().toISOString();
        const drId = `DR-T4-04-AE-${ts}`;
        let threw  = false;
        let result;
        try {
            result = await rt04.formBootstrapAudit({
                drId,
                cdpId:         `CDP-T4-04-AE-${ts}`,
                cumVersionRef: 'CURRENT-v12-T4-04-AE-TEST',
            });
        } catch (_) {
            threw = true;
        }
        assert.ok(!threw, 'formBootstrapAudit() must not throw');
        assert.ok(result === null || (result && typeof result.carId === 'string'),
            'result must be null or object with carId');
    })().then(done).catch(done);
});

// ── SUMMARY ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`T4-04: ${passed + failed} tests — ${passed} PASS, ${failed} FAIL`);

if (failed > 0) {
    process.exit(1);
}
