'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/audit-record.js
// Task: W1-13 — RT-04 Constitutional Governance Audit Type Definitions
// Runtime: RT-04 — Constitutional Governance Audit Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-25
// Authority: R4-v1.0-canonical.md RS-07/RS-10; A0-v1.1.1 §3.4; D6 AIR-5;
//            D6 Part 4 (Audit Authority type); RT04-INV-01 through INV-07;
//            RT04-PROH-01 through PROH-09; RT03-INV-6 (audit independence channel)
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
//
// ─── AUDIT INDEPENDENCE NOTE (D6 AIR-5) ──────────────────────────────────────
// RT-04 is NEVER processed through RT-03 gates. These types carry no RT-03
// gate dependency anywhere in their schemas. RT-04 accesses RT-03 records via
// the RT03-INV-6 direct channel — this is constitutionally mandated audit
// independence (D6 AIR-5; PROH-6 no self-audit for RT-03).
//
// RT-04 write authority is EXCLUSIVELY limited to its own five owned objects
// defined here. RT-04 never modifies constitutional objects owned by other
// runtimes — all RT-04 evidence collection is strictly read-only (RT04-PROH-01).
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT04 — ConstitutionalAuditRecord
// Constitutional basis: R4-v1.0 RS-07 RT04-OWN-01 (AuditRecord); A0-v1.1.1 §3.4;
// A0 §3.4 RT04-OBL-02 (AuditRecord Formation obligation); D6 AIR-5;
// RT04-INV-06 (non-deletable); RT04-PROH-01 (read-only evidence collection)
//
// Complete record of a single RT-04 audit operation. Contains audit target,
// criteria applied, evidence collected, compliance determination, and auditor
// signature. Immutable after finalization. Permanent — RT04-INV-06.
// Routed to RT-07 for persistence and human governance actors.
// ─────────────────────────────────────────────────────────────────────────────

const ConstitutionalAuditRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ConstitutionalAuditRecord',
    runtime_id:       'RT-04',
    runtime_name:     'Constitutional Governance Audit Runtime',
    authority:        'R4-v1.0 RS-07 RT04-OWN-01; A0-v1.1.1 §3.4; A0 §3.4 RT04-OBL-02; D6 AIR-5 (audit independence); RT04-INV-06 (non-deletable); RT04-PROH-01 (read-only evidence)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: RT04-INV-06 (Audit Record Permanence)
    deletion_policy:      'PROHIBITED',
    // Immutable after finalization
    structural_immutable: true,
    invariants: ['RT04-INV-06'],
    constitutional_note: 'NEVER DELETED (RT04-INV-06). Immutable after finalization. RT-04 evidence collection is strictly READ-ONLY — ConstitutionalAuditRecord never reflects modification of audited objects (RT04-PROH-01). No RT-03 gate processing — RT-04 operates via RT03-INV-6 channel (D6 AIR-5). Routed to RT-07 for persistence (highest provenance protection per A0 §3.4 Lifecycle Responsibilities) and to human governance actors.',
  }),

  SCHEMA: Object.freeze({

    audit_record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-01; A0-v1.1.1 §3.4',
      description: 'Unique constitutional identifier for this ConstitutionalAuditRecord',
    }),

    audit_target_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-01 "audit target identifier"; RT04-OBL-02 "audit target"',
      description: 'Identifier of the runtime, domain, or constitutional object that was audited',
    }),

    audit_criteria: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-01 "audit criteria applied (with constitutional citations)"; RT04-INV-04 (evidence must trace to criteria)',
      description: 'Array of constitutional criteria applied during this audit, each with constitutional document citations (e.g. "D4 §4.1 — gate failure recording obligation")',
    }),

    evidence_artifacts: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-01 "evidence artifacts collected (with provenance references)"; RT04-INV-04',
      description: 'Array of evidence artifact references gathered during this audit. Each reference must include provenance tracing per RT04-INV-04. Evidence collection is strictly read-only (RT04-PROH-01).',
    }),

    // CONSTITUTIONALLY REQUIRED: compliance determination per RT04-OBL-02
    compliance_determination: Object.freeze({
      required: true, type: 'string',
      enum: ['PASS', 'FAIL', 'DEFICIENCY'],
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-01 "compliance determination (PASS/FAIL/DEFICIENCY)"; RT04-PROH-08 (unsupported certification prohibited)',
      description: 'PASS: audited target fully compliant. FAIL: constitutional non-compliance detected. DEFICIENCY: specific constitutional deficiency identified (requires deficiency_ids).',
    }),

    deficiency_ids: Object.freeze({
      required: false, type: 'array',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-01 "deficiency identifiers if applicable"',
      description: 'Array of DeficiencyFinding identifiers when compliance_determination = DEFICIENCY. Each ID references an entry in the RT-04 DeficiencyRegister.',
    }),

    auditor_signature: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-01 "auditor signature"',
      description: 'RT-04 auditor signature authenticating this ConstitutionalAuditRecord',
    }),

    audit_start_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-01 "timestamp chain"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this audit operation was initiated',
    }),

    audit_completion_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-01 "timestamp chain"; RT04-OBL-02 (completion trigger)',
      description: 'ISO 8601 timestamp when this audit operation was completed and record finalized',
    }),

  }),

  validate(data) {
    return _validate('ConstitutionalAuditRecord', ConstitutionalAuditRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ConstitutionalAuditRecord', ConstitutionalAuditRecord.SCHEMA, ConstitutionalAuditRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT04 — ConstitutionalComplianceAttestation
// Constitutional basis: R4-v1.0 RS-07 RT04-OWN-05 (CertificationOutput); A0-v1.1.1 §3.4;
// RT04-OBL-07 (certification obligation); RT04-INV-04 (evidence-backed only);
// RT04-PROH-08 (no unsupported certification)
//
// Formal constitutional compliance attestation for a specific audit target
// over one certification period. Issued only when collected evidence supports
// the conclusion (RT04-PROH-08). Updated as open deficiencies are resolved.
// ─────────────────────────────────────────────────────────────────────────────

const ConstitutionalComplianceAttestation = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ConstitutionalComplianceAttestation',
    runtime_id:       'RT-04',
    runtime_name:     'Constitutional Governance Audit Runtime',
    authority:        'R4-v1.0 RS-07 RT04-OWN-05; A0-v1.1.1 §3.4; RT04-OBL-07 (certification); RT04-INV-04 (evidence-backed); RT04-PROH-08 (no unsupported certification)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Updated as deficiency findings are resolved within the certification period
    structural_immutable: false,
    invariants: ['RT04-INV-06'],
    constitutional_note: 'NEVER DELETED (RT04-INV-06). Updated as open_deficiency_refs are resolved within the certification period. Issued ONLY when evidence supports the determination — RT04-PROH-08 prohibits unsupported certification. attestation_determination = FAIL must list specific deficiency references. No RT-03 gate processing (D6 AIR-5). Routed to human governance actors.',
  }),

  SCHEMA: Object.freeze({

    attestation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-05; A0-v1.1.1 §3.4',
      description: 'Unique constitutional identifier for this ConstitutionalComplianceAttestation',
    }),

    target_identifier: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-05 "target identifier"',
      description: 'Identifier of the runtime or constitutional domain this attestation covers',
    }),

    certification_period_start: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-05 "certification period"',
      description: 'ISO 8601 timestamp marking the start of this certification period',
    }),

    certification_period_end: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-05 "certification period"',
      description: 'ISO 8601 timestamp marking the end of this certification period',
    }),

    // CONSTITUTIONALLY REQUIRED: attestation must be evidentially grounded
    attestation_determination: Object.freeze({
      required: true, type: 'string',
      enum: ['PASS', 'CONDITIONAL-PASS', 'FAIL'],
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-05 "certification determination (PASS/CONDITIONAL-PASS/FAIL)"; RT04-PROH-08',
      description: 'PASS: fully compliant. CONDITIONAL-PASS: compliant with open minor deficiencies. FAIL: constitutional non-compliance — open_deficiency_refs required.',
    }),

    open_deficiency_refs: Object.freeze({
      required: false, type: 'array',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-05 "open deficiency references"',
      description: 'Array of open DeficiencyFinding identifiers. FAIL determination must have at least one. Updated as deficiencies are resolved.',
    }),

    evidence_basis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-05 "evidence basis"; RT04-INV-04',
      description: 'Summary of the evidence basis for this attestation. Must demonstrate RT04-INV-04 compliance — every determination traces to evidence.',
    }),

    issuing_auditor_signature: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-05 "issuing auditor signature"',
      description: 'RT-04 auditor signature authenticating this attestation',
    }),

    attest_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-05; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this ConstitutionalComplianceAttestation was issued',
    }),

  }),

  validate(data) {
    return _validate('ConstitutionalComplianceAttestation', ConstitutionalComplianceAttestation.SCHEMA, data);
  },

  create(data) {
    return _create('ConstitutionalComplianceAttestation', ConstitutionalComplianceAttestation.SCHEMA, ConstitutionalComplianceAttestation.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT04 — ConstitutionalViolationRecord
// Constitutional basis: R4-v1.0 RS-07 RT04-OWN-08 (ConstitutionalDeviationReport);
// A0-v1.1.1 §3.4; RT04-PROH-06 (no violation suppression);
// D8 §5.5 (Governance Enforcement); R3-v1.0 RS-34 PROH-1 through PROH-9
//
// Formal record of a constitutional violation. violation_code constrained to
// PROH-1 through PROH-9 per I1-SEQUENCING §W1-13 and R3-v1.0 RS-34.
// Routed to human governance actors ONLY — not to other runtimes.
// RT04-PROH-06: no violation suppression under any operational condition.
// ─────────────────────────────────────────────────────────────────────────────

const ConstitutionalViolationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ConstitutionalViolationRecord',
    runtime_id:       'RT-04',
    runtime_name:     'Constitutional Governance Audit Runtime',
    authority:        'R4-v1.0 RS-07 RT04-OWN-08; A0-v1.1.1 §3.4; RT04-PROH-06 (no violation suppression); D8 §5.5; R3-v1.0 RS-34 PROH-1 through PROH-9',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Can be updated (escalation progression, evidence additions)
    structural_immutable: false,
    invariants: ['RT04-INV-06'],
    constitutional_note: 'NEVER DELETED (RT04-INV-06). violation_code is constrained to PROH-1 through PROH-9 (R3-v1.0 RS-34 implementation prohibitions; I1-SEQUENCING §W1-13). RT04-PROH-06: violations MUST NOT be suppressed for any operational reason. Routed to HUMAN GOVERNANCE ACTORS ONLY — not to any runtime (A0 §3.4 "Report findings to human governance actors — not to other runtimes").',
  }),

  SCHEMA: Object.freeze({

    violation_record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-08; A0-v1.1.1 §3.4',
      description: 'Unique constitutional identifier for this ConstitutionalViolationRecord',
    }),

    // CONSTITUTIONALLY REQUIRED: constrained to PROH-1 through PROH-9 per I1-SEQUENCING §W1-13
    violation_code: Object.freeze({
      required: true, type: 'string',
      enum: ['PROH-1', 'PROH-2', 'PROH-3', 'PROH-4', 'PROH-5', 'PROH-6', 'PROH-7', 'PROH-8', 'PROH-9'],
      constitutional_source: 'R3-v1.0 RS-34 PROH-1 through PROH-9 (implementation prohibitions); I1-SEQUENCING §W1-13 (violation_code constrained to PROH-N)',
      description: 'PROH-1: probabilistic gate evaluation. PROH-2: cross-operation gate caching. PROH-3: partial Stage 9 commit. PROH-4: retrospective KOM modification. PROH-5: gate bypass. PROH-6: RT-03 self-audit. PROH-7: unauthorized authority accumulation. PROH-8: silent failure. PROH-9: operation processing during rollback.',
    }),

    violation_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-08 "deviation description"; RT04-PROH-06 (no suppression)',
      description: 'Precise description of the constitutional violation. Must be specific and unambiguous — RT04-PROH-06 prohibits suppression.',
    }),

    affected_constitutional_provisions: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-08 "affected constitutional provisions"',
      description: 'Array of constitutional document provisions affected by this violation (e.g. "D4 §4.1", "R3-v1.0 PROH-8")',
    }),

    evidence_chain: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-08 "evidence chain"; RT04-INV-04 (evidence-backed)',
      description: 'Array of evidence artifact references establishing this violation. Each entry references an evidence artifact in the RT-04 Evidence Repository.',
    }),

    severity: Object.freeze({
      required: true, type: 'string',
      enum: ['MODERATE', 'HIGH', 'CRITICAL'],
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-08 "severity (MODERATE/HIGH/CRITICAL)"',
      description: 'MODERATE: process deficiency not yet systemic. HIGH: significant constitutional non-compliance. CRITICAL: acute systemic violation requiring immediate escalation.',
    }),

    recommended_constitutional_response: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-08 "recommended constitutional response"',
      description: 'RT-04\'s constitutional recommendation for remediation. Directed to human governance actors only — RT-04 does not direct other runtimes.',
    }),

    detection_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07 RT04-OWN-08; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this constitutional violation was detected',
    }),

  }),

  validate(data) {
    return _validate('ConstitutionalViolationRecord', ConstitutionalViolationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ConstitutionalViolationRecord', ConstitutionalViolationRecord.SCHEMA, ConstitutionalViolationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT04 — AuditScope
// Constitutional basis: R4-v1.0 RS-07; A0-v1.1.1 §3.4; D6 Part 4 AIR-5;
// RT04-INV-07 (constitutionally complete coverage); RT04-FAIL-09 (coverage gap)
//
// Defines the scope of an RT-04 audit engagement — which runtimes, domains,
// and constitutional objects are within scope, and what constitutional criteria
// govern the audit. AuditScope is derived from the AuditManifest and the
// constitutional document stack. Coverage falling below AuditManifest
// constitutes RT04-FAIL-09.
// ─────────────────────────────────────────────────────────────────────────────

const AuditScope = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AuditScope',
    runtime_id:       'RT-04',
    runtime_name:     'Constitutional Governance Audit Runtime',
    authority:        'R4-v1.0 RS-07; A0-v1.1.1 §3.4; D6 Part 4 AIR-5; RT04-INV-07 (complete coverage); RT04-FAIL-09 (coverage gap)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Extended when new runtimes are constituted or constitutional provisions added
    structural_immutable: false,
    invariants: ['RT04-INV-06', 'RT04-INV-07'],
    constitutional_note: 'NEVER DELETED (RT04-INV-06). RT04-INV-07: AuditScope must cover all constitutionally required audit targets per AuditManifest. Coverage falling below AuditManifest is RT04-FAIL-09 (coverage gap). Extended when new runtimes are constituted (RT-16 amendment) or new constitutional provisions added. Derived from A0 §3.4 RT-04 audit obligations.',
  }),

  SCHEMA: Object.freeze({

    scope_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07; A0-v1.1.1 §3.4',
      description: 'Unique constitutional identifier for this AuditScope',
    }),

    target_runtime_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-10 RT04-MAN-05 (AuditManifest); RT04-INV-07',
      description: 'Identifier of the runtime or constitutional domain in scope for this audit engagement',
    }),

    scope_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07; A0-v1.1.1 §3.4',
      description: 'Description of the audit scope boundaries for this engagement',
    }),

    constitutional_basis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07; A0 §3.4; D6 AIR-5',
      description: 'Constitutional basis for this audit scope (e.g. "A0 §3.4 RT-04 obligation 3 — audit all RT-03 enforcement operations")',
    }),

    audit_criteria: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R4-v1.0 RS-10 RT04-MAN-07 (Constitutional Requirements Corpus); RT04-INV-04',
      description: 'Array of constitutional audit criteria in scope for this engagement, each referencing the governing constitutional document and section',
    }),

    coverage_obligations: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R4-v1.0 RS-10 RT04-MAN-05 (AuditManifest obligations); RT04-INV-07; RT04-FAIL-09',
      description: 'Array of AuditManifest obligations this scope must satisfy. Coverage falling below these obligations is RT04-FAIL-09.',
    }),

    scope_established_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this AuditScope was established',
    }),

  }),

  validate(data) {
    return _validate('AuditScope', AuditScope.SCHEMA, data);
  },

  create(data) {
    return _create('AuditScope', AuditScope.SCHEMA, AuditScope.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT04 — PreservationAuditRecord
// Constitutional basis: R4-v1.0 RS-07; A0-v1.1.1 §3.4; A0 §3.4 Obligation 17
// ("Provide Preservation Audit service to RT-16"); A0 §3.16 (RT-16 consumed
// PreservationAuditRecord as mandatory precondition for Class I amendments);
// A0 §3.4 Lifecycle Responsibilities (persists through RT-07 with highest
// provenance protection)
//
// Preservation Audit result issued to RT-16 on amendment initiation.
// MANDATORY PRECONDITION for RT-16 Class I amendments.
// verdict field documents whether constitutional preservation is confirmed.
// Persisted through RT-07 with highest provenance protection per A0 §3.4.
// ─────────────────────────────────────────────────────────────────────────────

const PreservationAuditRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'PreservationAuditRecord',
    runtime_id:       'RT-04',
    runtime_name:     'Constitutional Governance Audit Runtime',
    authority:        'R4-v1.0 RS-07; A0-v1.1.1 §3.4 Obligation 17 (Preservation Audit for RT-16); A0 §3.16 (mandatory precondition for Class I amendments); RT04-INV-06 (non-deletable); A0 §3.4 Lifecycle (RT-07 highest protection)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: immutable once issued to RT-16
    structural_immutable: true,
    invariants: ['RT04-INV-06'],
    constitutional_note: 'IMMUTABLE ONCE ISSUED (mandatory RT-16 precondition). NEVER DELETED (RT04-INV-06). Persisted through RT-07 with HIGHEST provenance protection (A0 §3.4 Lifecycle Responsibilities). RT-16 CANNOT proceed with a Class I amendment without a PreservationAuditRecord with verdict = PRESERVATION_CONFIRMED. Routed RT-04 → RT-16; also persisted RT-04 → RT-07.',
  }),

  SCHEMA: Object.freeze({

    preservation_audit_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07; A0-v1.1.1 §3.4 Obligation 17',
      description: 'Unique constitutional identifier for this PreservationAuditRecord',
    }),

    // CONSTITUTIONALLY REQUIRED: wave plan explicit field — RT-16 amendment reference
    amendment_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-13 "amendment_ref required"; A0-v1.1.1 §3.16 (RT-16 Class I amendments); A0 §3.4 Obligation 17',
      description: 'Reference to the RT-16 AmendmentProposal this preservation audit was conducted for. Required — PreservationAuditRecord is always amendment-specific.',
    }),

    // CONSTITUTIONALLY REQUIRED: wave plan explicit field — constitutional elements verified
    preserved_elements: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'I1-SEQUENCING §W1-13 "preserved_elements required"; A0-v1.1.1 §3.16; A0 §3.4 Obligation 17',
      description: 'Array of constitutional elements verified as preserved by this audit (e.g. constitutional provisions, invariants, runtime configurations that the amendment must not destroy).',
    }),

    // CONSTITUTIONALLY REQUIRED: wave plan explicit field — verification timestamp
    verified_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-13 "verified_at required"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when preservation verification was completed',
    }),

    // CONSTITUTIONALLY REQUIRED: wave plan explicit field — preservation verdict
    verdict: Object.freeze({
      required: true, type: 'string',
      enum: ['PRESERVATION_CONFIRMED', 'PRESERVATION_FAILED', 'PRESERVATION_PARTIAL'],
      constitutional_source: 'I1-SEQUENCING §W1-13 "verdict required"; A0-v1.1.1 §3.16 (RT-16 Class I amendment precondition)',
      description: 'PRESERVATION_CONFIRMED: all preserved_elements verified intact — RT-16 may proceed with amendment. PRESERVATION_FAILED: constitutional elements cannot be preserved — amendment must not proceed. PRESERVATION_PARTIAL: partial preservation only — RT-16 must consider which elements cannot be preserved.',
    }),

    preservation_criteria: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R4-v1.0 RS-07; A0 §3.4 Obligation 17; RT04-INV-04 (evidence-backed)',
      description: 'Array of constitutional provisions and invariants checked during this preservation audit',
    }),

    auditor_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R4-v1.0 RS-07; A0-v1.1.1 §3.4 (FoundingAuditor ActorProfile SEED-4)',
      description: 'Reference to the RT-04 auditor ActorProfile (SEED-4) issuing this PreservationAuditRecord',
    }),

  }),

  validate(data) {
    return _validate('PreservationAuditRecord', PreservationAuditRecord.SCHEMA, data);
  },

  create(data) {
    return _create('PreservationAuditRecord', PreservationAuditRecord.SCHEMA, PreservationAuditRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  ConstitutionalAuditRecord,
  ConstitutionalComplianceAttestation,
  ConstitutionalViolationRecord,
  AuditScope,
  PreservationAuditRecord,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-04',
  WAVE:        'W1-13',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
