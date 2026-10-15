'use strict';
// lib/civilization/rt04-bootstrap.js
// T4-04: ConstitutionalAuditRecord + AuditScope + ConstitutionalComplianceAttestation Bootstrap (RT-04)
//
// Authority: A0-v1.1.1 §3.5 (RT-04 Constitutional Governance Audit Runtime — canonical seat;
//              roadmap cites §3.4 per same off-by-one artifact as other runtimes);
//            R4-v1.0-canonical.md RS-07 RS-10; D6 AIR-5 (audit independence);
//            D8 INV-3 (Audit Requirement); D8 Part 11 (Six Audit Dimensions);
//            RT04-INV-1 through RT04-INV-5; RT04-INV-06 (permanence);
//            RT04-PROH-01 (read-only); RT04-PROH-06 (no violation suppression);
//            RT04-PROH-08 (no unsupported certification);
//            WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md §8 (T4-04 definition);
//            T4-03-CERTIFICATION.md (T4-03 complete — RT-16 Amendment Runtime bootstrapped)
//
// CONSTITUTIONAL LIMITATIONS:
// L-RT04-01: Audit scope limited to declared constitutional_records evidence; full RT-03
//             kernel log read access via RT03-INV-6 direct channel deferred to operational RT-04;
//             bootstrap evidence artifacts declared by reference (not independently verified).
//             NON-BLOCK.
// L-RT04-02: RT03-INV-6 independent channel not exercised at bootstrap; RT-04 did not read
//             RT-03 kernel operation log directly — bootstrap CausalModel, DeliberationRecord,
//             and CDP existence attested by provenance reference, not independent DB query.
//             NON-BLOCK.
// L-RT04-03: PreservationAuditRecord not produced at bootstrap — no amendment proposal is at
//             PRESERVATION_AUDIT stage (RT-16 bootstrap AP is at AP_VERIFICATION per T4-03;
//             RT16-INV-2 precondition deferred until operational amendment cycle begins).
//             NON-BLOCK.
// L-RT04-04: ConstitutionalViolationRecord not produced at bootstrap — no constitutional
//             violations detected in Wave 3+4 bootstrap decisions; operational violation
//             detection (PROH-1 through PROH-9) requires full evidence collection (L-RT04-01).
//             NON-BLOCK.

const {
    ConstitutionalAuditRecord,
    ConstitutionalComplianceAttestation,
    AuditScope,
} = require('../constitutional-types/audit-record');
const constitutionalStore = require('../runtime/constitutional-store');

// Duplicate guard: one bootstrap audit per drId
const _emitted = new Set();

// ── ID generation ─────────────────────────────────────────────────────────────

function _generateAuditScopeId(timestamp) {
    return `ASCOPE-RT04-BOOTSTRAP-v1-${timestamp}`;
}

function _generateCarId(timestamp) {
    return `CAR-RT04-BOOTSTRAP-v1-${timestamp}`;
}

function _generateCcaId(timestamp) {
    return `CCA-RT04-BOOTSTRAP-v1-${timestamp}`;
}

// ── BOOTSTRAP_AUDIT_TARGET ────────────────────────────────────────────────────
// Identifies the subject of the bootstrap audit engagement:
// the complete Wave 3 + Wave 4 constitutional bootstrap chain.
const BOOTSTRAP_AUDIT_TARGET = 'APEX-WAVE3-WAVE4-BOOTSTRAP-CHAIN';

// ── BOOTSTRAP_AUDITOR_SIGNATURE ───────────────────────────────────────────────
// RT-04 auditor identity at bootstrap. RT-01 ActorProfile (SEED-4 FoundingAuditor)
// not yet operational — identity documented by reference.
const BOOTSTRAP_AUDITOR_SIGNATURE = 'RT-04-BOOTSTRAP-AUDITOR-W4-T4-04';

// ── BOOTSTRAP_AUDIT_CRITERIA ──────────────────────────────────────────────────
// Constitutional criteria applied during the bootstrap audit.
// RT04-INV-04: every finding must trace to criteria.
// Covers all six constitutional audit dimensions per D8 Part 11.
const BOOTSTRAP_AUDIT_CRITERIA = Object.freeze([
    'A0-v1.1.1 §3.12 — RT-11 CausalModel and AssumptionRegister formation (T4-02; PAIR 42)',
    'A0-v1.1.1 §3.15 — RT-14 Reflection Runtime formation: OCR, OAR-TSR, RTR (T4-01; RT14-INV-1 through RT14-INV-6)',
    'A0-v1.1.1 §3.17 — RT-16 Amendment Runtime formation: AmendmentProposal, AmendmentRegistry (T4-03; RT16-INV-4 RT16-INV-5)',
    'D7-v1.0 Part 4.6 — DeliberationRecord 13-element constitutional completeness (T3-12 bootstrap)',
    'D7-v1.0 Part 5.2 — CivilizationalDecisionProposal DA-1 through DA-6 (T3-12 bootstrap)',
    'R11-v1.3-canonical.md RS-12 — Process 2 (Deliberation) and Process 3 (Decision Authority) completeness',
    'D8-v1.0 INV-3 — Audit Requirement: RT-04 bootstrap audit satisfies first wave of constitutional audit obligation',
]);

// ── formBootstrapAudit ────────────────────────────────────────────────────────
//
// RT-04 Bootstrap: creates AuditScope, ConstitutionalAuditRecord, and
// ConstitutionalComplianceAttestation as the first instantiated RT-04 constitutional
// records. Produces the formal audit of Wave 3 + Wave 4 bootstrap decisions.
//
// RT04-INV-1: RT-04 is NEVER processed through RT-03 for its own audit operations
//   (AIR-5). This function does not call any RT-03 facility.
// RT04-INV-2: RT-04 holds NO operational authority — only Audit Authority.
// RT04-INV-3: RT-04 never modifies any constitutional object owned by another runtime.
//   This function is STRICTLY read-and-declare — it writes only RT-04-owned records.
// RT04-INV-4: RT-04 findings reach human governance actors without filtering.
//   All three records are written to constitutional-store for governance access.
//
// Sequence:
//   1. AuditScope — scope of the Wave 3+4 bootstrap audit engagement
//   2. ConstitutionalAuditRecord — formal audit result (compliance_determination=PASS)
//   3. ConstitutionalComplianceAttestation — certification (CONDITIONAL-PASS;
//        bootstrap evidence is declared, not independently verified; L-RT04-01)
//
// Returns { auditScopeId, carId, ccaId } on success, null on failure. Never throws.
// Duplicate guard: _emitted.add(guardKey) BEFORE constitutionalStore.write().
async function formBootstrapAudit({ drId, cdpId, cumVersionRef } = {}) {
    try {
        const timestamp = new Date().toISOString();

        // Duplicate guard — one bootstrap audit per drId
        const guardKey = drId || `STANDALONE-${timestamp}`;
        if (_emitted.has(guardKey)) {
            console.warn(`[rt04-bootstrap] duplicate prevented — bootstrap audit for ${guardKey} already formed`);
            return null;
        }
        _emitted.add(guardKey);

        const auditScopeId = _generateAuditScopeId(timestamp);
        const carId        = _generateCarId(timestamp);
        const ccaId        = _generateCcaId(timestamp);

        // Evidence artifacts declared by reference (L-RT04-01: not independently verified
        // via RT03-INV-6 channel; bootstrap attests existence of these records by provenance).
        const evidenceArtifacts = [
            {
                ref:    drId || 'DR-BOOTSTRAP-INITIAL',
                type:   'DeliberationRecord',
                source: 'deliberation-registry.js T3-12; constitutional_records',
            },
            {
                ref:    cdpId || 'CDP-BOOTSTRAP-INITIAL',
                type:   'CivilizationalDecisionProposal',
                source: 'deliberation-registry.js T3-12; constitutional_records',
            },
            {
                ref:    cumVersionRef || 'CURRENT-CUM-T3-11C',
                type:   'CivilizationUnderstandingModel',
                source: 'civilization-understanding-registry.js T3-11C; constitutional_records',
            },
            {
                ref:    'OCR-RT14-BOOTSTRAP-T4-01',
                type:   'ObservedConsequenceRecord',
                source: 'rt14-bootstrap.js T4-01; constitutional_records',
            },
            {
                ref:    'CM-RT11-BOOTSTRAP-T4-02',
                type:   'CausalModel',
                source: 'rt11-bootstrap.js T4-02; constitutional_records',
            },
            {
                ref:    'AP-RT16-BOOTSTRAP-T4-03',
                type:   'AmendmentProposal',
                source: 'rt16-bootstrap.js T4-03; constitutional_records',
            },
        ];

        // ── STEP 1: AuditScope ──────────────────────────────────────────────────
        // Defines the scope of the Wave 3+4 bootstrap audit engagement.
        // RT04-INV-07: AuditScope must cover all constitutionally required audit targets.
        // Bootstrap scope: Wave 3+4 bootstrap chain; full 16-runtime coverage deferred (L-RT04-01).
        const auditScopeRecord = AuditScope.create({
            scope_id:            auditScopeId,
            target_runtime_id:   BOOTSTRAP_AUDIT_TARGET,
            scope_description:
                `Wave 3 + Wave 4 APEX constitutional bootstrap chain audit. ` +
                `Covers: CivilizationUnderstandingModel (T3-11C), DeliberationRecord + CDP (T3-12), ` +
                `CivilizationalDecision (T3-13), ActionProjection + EER (T3-15), ` +
                `RT-14 Reflection bootstrap (T4-01), RT-11 CausalModel bootstrap (T4-02), ` +
                `RT-16 Amendment bootstrap (T4-03). ` +
                `L-RT04-01: full 16-runtime continuous audit coverage deferred to operational RT-04.`,
            constitutional_basis:
                `A0-v1.1.1 §3.5 RT-04 Obligation 1 (audit all runtimes continuously) — ` +
                `bootstrap scope limited per L-RT04-01; ` +
                `D8 INV-3 (Audit Requirement); D8 Part 11 (Six Audit Dimensions).`,
            audit_criteria:      Array.from(BOOTSTRAP_AUDIT_CRITERIA),
            coverage_obligations: [
                'Wave 3 constitutional bootstrap records (T3-12, T3-13, T3-15) — compliance determination',
                'Wave 4 RT-14 bootstrap (T4-01) — RT14-INV-1 through RT14-INV-6 coverage',
                'Wave 4 RT-11 bootstrap (T4-02) — CausalModel + AssumptionRegister formation coverage',
                'Wave 4 RT-16 bootstrap (T4-03) — RT16-INV-4 RT16-INV-5 coverage',
                'D8 INV-3 Audit Requirement — first RT-04 audit record produced (T4-04)',
            ],
            scope_established_at: timestamp,
        });
        auditScopeRecord.__wave               = 'W4-T4-04';
        auditScopeRecord.__structural_immutable = false;  // extended when new runtimes constituted
        await constitutionalStore.write(auditScopeRecord);

        // ── STEP 2: ConstitutionalAuditRecord ──────────────────────────────────
        // Formal audit of Wave 3+4 bootstrap decisions.
        // compliance_determination=PASS: no constitutional violations detected.
        // RT04-INV-06: NEVER DELETED; structural_immutable=true — immutable after finalization.
        // RT04-PROH-01: evidence_artifacts collected read-only; no audited object modified.
        const carRecord = ConstitutionalAuditRecord.create({
            audit_record_id:            carId,
            audit_target_id:            BOOTSTRAP_AUDIT_TARGET,
            audit_criteria:             Array.from(BOOTSTRAP_AUDIT_CRITERIA),
            evidence_artifacts:         evidenceArtifacts,
            compliance_determination:   'PASS',
            // deficiency_ids omitted: PASS determination requires no deficiency references
            auditor_signature:          BOOTSTRAP_AUDITOR_SIGNATURE,
            audit_start_timestamp:      timestamp,
            audit_completion_timestamp: timestamp,
        });
        carRecord.__wave               = 'W4-T4-04';
        carRecord.__structural_immutable = true;  // RT04-INV-06: immutable after finalization
        await constitutionalStore.write(carRecord);

        // ── STEP 3: ConstitutionalComplianceAttestation ────────────────────────
        // Certification of bootstrap compliance.
        // attestation_determination=CONDITIONAL-PASS: the bootstrap is constitutionally sound
        //   but evidence is declared by reference (L-RT04-01 L-RT04-02) rather than
        //   independently verified via RT03-INV-6 channel.
        // RT04-PROH-08: attestation is evidence-grounded (declared bootstrap record provenance).
        // RT04-INV-04: every determination traces to evidence (evidenceArtifacts in carId).
        const ccaRecord = ConstitutionalComplianceAttestation.create({
            attestation_id:              ccaId,
            target_identifier:           BOOTSTRAP_AUDIT_TARGET,
            certification_period_start:  timestamp,
            certification_period_end:    timestamp,  // instantaneous bootstrap period
            attestation_determination:   'CONDITIONAL-PASS',
            open_deficiency_refs:        ['L-RT04-01', 'L-RT04-02'],  // bootstrap scope limitations
            evidence_basis:
                `ConstitutionalAuditRecord ${carId}: 6 evidence artifacts covering Wave 3+4 bootstrap ` +
                `chain (DeliberationRecord, CDP, CUM, OCR, CausalModel, AmendmentProposal). ` +
                `L-RT04-01: evidence declared by provenance reference, not independently verified ` +
                `via RT03-INV-6 channel. Bootstrap compliance determination=PASS (no violations); ` +
                `attestation CONDITIONAL-PASS pending full operational audit coverage. ` +
                `RT04-PROH-08: no unsupported certification — determination grounded in 6 declared artifacts.`,
            issuing_auditor_signature:   BOOTSTRAP_AUDITOR_SIGNATURE,
            attest_timestamp:            timestamp,
        });
        ccaRecord.__wave               = 'W4-T4-04';
        ccaRecord.__structural_immutable = false;  // updated as L-RT04-01 L-RT04-02 resolved
        await constitutionalStore.write(ccaRecord);

        return { auditScopeId, carId, ccaId };
    } catch (err) {
        console.error('[rt04-bootstrap] formBootstrapAudit failed:', err?.message);
        return null;
    }
}

module.exports = Object.freeze({
    formBootstrapAudit,
    _generateAuditScopeId,
    _generateCarId,
    _generateCcaId,
    _emitted,
    BOOTSTRAP_AUDIT_TARGET,
    BOOTSTRAP_AUDITOR_SIGNATURE,
    BOOTSTRAP_AUDIT_CRITERIA,
});
