'use strict';

// ─── FILE IDENTIFICATION ─────────────────────────────────────────────────��────
// lib/constitutional-types/civilizational-decision.js
// Task: W1-10 — RT-12 Decision Runtime Type Definitions
// Runtime: RT-12 — Decision Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-27
// Authority: A0-v1.1.1 §3.13; RT12-v1.0-canonical.md RS-01 RS-03 RS-04 RS-05
//            RS-07 RS-09 RS-10 RS-11 RS-12 RS-20 RS-24;
//            D-7-v1.0 Part 5 (DA-1–DA-6; ER-1–ER-5); D-7-v1.0 Part 5.5 (CDC);
//            D-8-v1.0 §9.5; D-8-v1.0 INV-1–7 CLI-1–4 PROH-5;
//            D-5-v1.0 PI-12; D-6-v1.0 §4.3 §4.4;
//            A1-v1.2 §5.1 (AIR-2/Compliance); A1-v1.2 §8.1 VC-5; A1-v1.2 §3.4 PAIR 40 PAIR 43;
//            RT12-INV-1 through RT12-INV-6; C0-MANIFEST §5.2 items 3 and 4
//
// ─��─ SECTION NUMBER DISCREPANCY NOTE ─────────────────────────────────────────
// D-1 (Type C — Implementation Interpretation):
//   Wave plan W1-10 cites "A0-v1.1.1 §3.12" as constitutional basis.
//   A0 §3.12 is RT-11's constitutional seat; RT-12 is at A0 §3.13.
//   Same off-by-one artifact as W1-04 W1-07 W1-08 W1-09 W1-12 W1-14.
//   CONSTITUTIONAL blocks use §3.13 per RT12-v1.0-canonical.md RS-01.
//
// ─── TYPE SET SCOPE NOTE ─────────────────────────────────────────────────────
// D-2 (Type A — Planning Document Choice):
//   Wave plan specifies 5 types including ComplianceVerificationRecord.
//   A0 §3.13 Owned Objects lists exactly 4:
//     CivilizationalDecision, OpenActionRegisterEntry, DecisionArchiveRecord,
//     CivilizationalDecisionChainRecord.
//   ComplianceVerificationRecord is NOT in A0 §3.13 Owned Objects.
//   RT12-v1.0 RS-09 names the Gate 5 output "ComplianceDeterminationRecord"
//   (sourced from A1 §5.1 AIR-2/Compliance and A1 §3.4 PAIR 43 VC-5).
//   Wave plan explicitly requires it with verdict = 'COMPLIANT' | 'NON_COMPLIANT'.
//   Including it is grounded in A1 §5.1 and PAIR 43/VC-5. Not a prohibition,
//   not a TYPE D conflict. Implemented under wave plan authority as TYPE A choice.
//
// ─── NAMING DISCREPANCY NOTE ─────────────────────────────────────────────────
// D-3 (Type A — Planning Document Naming):
//   Wave plan uses "ComplianceVerificationRecord."
//   RT12-v1.0 RS-09 names the equivalent object "ComplianceDeterminationRecord."
//   Operative wave plan instruction governs for export name.
//
// ─── FUNCTIONAL MODEL NOTE ───────────────────────────────────────────────────
// RT-12 canonical name: "Decision Runtime" (A0 §3.13; C0-MANIFEST §5.2 item 3).
// A1 §3.0 and R0 §5.8 RNS-1 name RT-12 "Constitutional Compliance Runtime" —
// a materially different functional model superseded by A0 (RT12-v1.0 C-2 CRITICAL).
// RT-12 FORMS CivilizationalDecision; it does NOT merely verify compliance.
// A0 §3.13 governs throughout.
//
// ─── OWNERSHIP BOUNDARY ──────────────────────────────────────────────────────
// RT-12 OWNS (implemented here):
//   CivilizationalDecision, OpenActionRegisterEntry, DecisionArchiveRecord,
//   CivilizationalDecisionChainRecord, ComplianceVerificationRecord
//
// RT-12 DOES NOT OWN:
//   CivilizationalDecisionProposal — owned by RT-11 (A0 §3.12)
//   DeliberationRecord — owned by RT-11 (A0 §3.12)
//   AuthorityResolutionResult — owned by RT-02 (A0 §3.2)
//   GateProcessingResult, RejectionRecord — owned by RT-03 (A0 §3.3)
//   ConstitutionalAuditRecord — owned by RT-04 (A0 §3.4)
//   TerminalStatusRecord — delivered by RT-14; RT-14 produces, RT-12 receives
//
// RT-12 DOES NOT HOLD:
//   AIR-3 (Decision Authority) — held by actors, validated via RT-02
//   RT-12 holds AIR-2/Compliance (A1 §5.1) — validation authority only
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT12 — CivilizationalDecision
// Constitutional basis: RT12-v1.0-canonical.md RS-07 RS-10 Item 1;
// A0-v1.1.1 §3.13 R2 R3 R9 Owned Objects; D-7-v1.0 Part 5 (DA-1–6; ER-1–5);
// RT12-INV-1 (DR required), RT12-INV-2 (all DA/ER satisfied),
// RT12-INV-3 (six gates required), RT12-INV-4 (OAR entry required);
// D-8-v1.0 INV-1 (constitutional traceability), INV-2 (provenance preservation),
// INV-3 (authority separation), INV-4 (reality grounding);
// A0 §3.13 Owned Objects; C0-MANIFEST §5.2 item 4; C0-ERRATA-011A boundary
//
// The primary output of RT-12. Formed from a CivilizationalDecisionProposal after:
// RT-02 authority validation, DA-1–6 and ER-1–5 verification, submission to
// RT-03 for six-gate kernel processing. RT-12 OWNS this object (A0 §3.13).
// RT-11 does NOT own it (C0-ERRATA-011A; C0-MANIFEST §5.2 item 4).
//
// proposal_ref links back to the RT-11 CivilizationalDecisionProposal
// (wave plan W1-10 Step 3 explicit requirement).
//
// Not structurally immutable — progresses through lifecycle states.
// Class A state transitions via RT-03 (D-8 §9.5 Decision Layer).
// ─────────────────────────────────────────────────────────────────────────────

const CivilizationalDecision = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CivilizationalDecision',
    runtime_id:       'RT-12',
    runtime_name:     'Decision Runtime',
    authority:        'RT12-v1.0-canonical.md RS-07 RS-10 Item 1; A0-v1.1.1 §3.13 R2 R3 R9 Owned Objects; D-7-v1.0 Part 5 (DA-1–6 ER-1–5); RT12-INV-1 RT12-INV-2 RT12-INV-3 RT12-INV-4; D-8-v1.0 INV-1 INV-2 INV-3 INV-4; C0-MANIFEST §5.2 item 4; A0 §3.13',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-10',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT12-INV-1', 'RT12-INV-2', 'RT12-INV-3', 'RT12-INV-4'],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — progresses through lifecycle states. RT-12 forms and OWNS this object (A0 §3.13 Owned Objects). RT-11 DOES NOT OWN it (C0-ERRATA-011A; C0-MANIFEST §5.2 item 4). RT-12 holds AIR-2/Compliance (A1 §5.1) — it validates Decision Authority (via RT-02) but does NOT hold AIR-3. RT12-INV-1: formed only with a complete 13-element DeliberationRecord (deliberation_record_ref). RT12-INV-2: must satisfy all DA-1 through DA-6 and ER-1 through ER-5 (attested via da_N_verified and er_conditions_clear). RT12-INV-3: every CivilizationalDecision passes through all six Kernel gates before authorization. RT12-INV-4: every authorized CivilizationalDecision has an OpenActionRegisterEntry. Class A state transitions via RT-03 (D-8 §9.5). D-8 INV-3 (Authority Separation): RT-12 validating Decision Authority ≠ RT-12 holding Decision Authority.',
  }),

  SCHEMA: Object.freeze({

    decision_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-07 RS-10 Item 1; A0-v1.1.1 §3.13 Owned Objects; RS-23 Audit Requirements',
      description: 'Unique constitutional identifier for this CivilizationalDecision. Used as primary reference in OpenActionRegisterEntry, DecisionArchiveRecord, CivilizationalDecisionChainRecord, and ComplianceVerificationRecord.',
    }),

    // Wave plan W1-10 Step 3 explicit requirement
    proposal_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md W1-10 Step 3 "CivilizationalDecision must include proposal_ref"; RT12-v1.0-canonical.md RS-07 Transformation Chain; D-8-v1.0 INV-2 (provenance preservation); PAIR 40; A0-v1.1.1 §3.13 R1',
      description: 'Reference to CivilizationalDecisionProposal.cdp_id from which this CivilizationalDecision was formed. Wave plan W1-10 Step 3 explicit requirement. D-8 INV-2: unbroken provenance chain from CivilizationalDecisionProposal through CivilizationalDecision must be preserved. RT-11 owns the CDP; RT-12 owns this Decision.',
    }),

    deliberation_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-INV-1 "No CivilizationalDecision is formed without a corresponding Deliberation Record (D7: deliberation principle — decisions formed without deliberation are constitutionally void)"; A0-v1.1.1 §3.13 R1; RT12-v1.0-canonical.md RS-10 Item 1 RS-11 RS-16',
      description: 'Reference to DeliberationRecord.dr_id that grounds this CivilizationalDecision. RT12-INV-1: a Decision formed without a corresponding Deliberation Record is constitutionally void. The referenced DR must be complete with all 13 elements populated (D7 Part 4.6).',
    }),

    cum_version_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'ER-2 (expired CUM blocks formation); RT12-v1.0-canonical.md RS-18 Precondition (valid, current, non-expired CUM); D-8-v1.0 INV-5 (Temporal Awareness); A0-v1.1.1 §3.13 R2',
      description: 'Reference to CivilizationUnderstandingModel.cum_version used as epistemic grounding for this Decision. ER-2: the referenced CUM must not be expired at decision formation time (D-8 INV-5 Temporal Awareness). Grounding chain: CUM → DeliberationRecord → CivilizationalDecisionProposal → CivilizationalDecision (D-8 INV-4 Reality Grounding).',
    }),

    authority_resolution_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.13 R6 "Validate decision authority with RT-02 before forming any CivilizationalDecision"; RT12-v1.0-canonical.md RS-08 RS-16; A0 §4.3 "RT-02 grants and holds: Decision Authority → validated at RT-12"',
      description: 'Reference to AuthorityResolutionResult.result_id from RT-02 confirming that the proposing actors hold Decision Authority (AIR-3) for the relevant domain. A0 §3.13 R6: authority must be validated before forming any CivilizationalDecision. D-8 INV-3 (Authority Separation): RT-12 validates authority; RT-12 does not hold or grant authority.',
    }),

    // DA-1 through DA-6 verification attestations
    da_1_scope_authority_verified: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-1 (Scope Authority); RT12-INV-2 (all DA requirements satisfied); RT12-v1.0-canonical.md RS-12 Process 1 Step 4',
      description: 'RT-12 attestation that DA-1 (Scope Authority) is verified: decision scope falls within the constitutionally assigned civilizational scope. Must be true before CivilizationalDecision may be formed (RT12-INV-2).',
    }),

    da_2_deliberation_grounding_verified: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-2 (Deliberation Grounding); RT12-INV-1 RT12-INV-2; RT12-v1.0-canonical.md RS-12 Process 1 Step 2',
      description: 'RT-12 attestation that DA-2 (Deliberation Grounding) is verified: the Decision is grounded in a complete 13-element DeliberationRecord. Must be true; false constitutes RT12-INV-1 violation.',
    }),

    da_3_cum_grounding_verified: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-3 (CUM Grounding); ER-1 ER-2; RT12-INV-2; D-8-v1.0 INV-4 (Reality Grounding)',
      description: 'RT-12 attestation that DA-3 (CUM Grounding) is verified: the Decision is grounded in a current, non-expired CUM. Must be true; false constitutes RT12-INV-2 violation and triggers ComplianceFailureReturn to RT-11.',
    }),

    da_4_gate_passage_verified: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-4 (Gate Passage); RT12-INV-3 RT12-INV-2; A0-v1.1.1 §3.13 R3; D-8-v1.0 CLI-2 (No Short-Circuit)',
      description: 'RT-12 attestation that DA-4 (Gate Passage) is verified: all applicable validation checkpoints and Kernel gates have been satisfied. D-8 CLI-2: no gate may be short-circuited. RT12-INV-3: every CivilizationalDecision passes through all six Kernel gates before authorization.',
    }),

    da_5_dom_registration_verified: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-5 (DOM-000001 Registration); RT12-INV-2; RT12-v1.0-canonical.md RS-12 Process 1 Step 4',
      description: 'RT-12 attestation that DA-5 (DOM-000001 Registration) is verified: the CivilizationalDecisionProposal carries a valid DOM-000001 registration identifier. Must be true before CivilizationalDecision may be formed (RT12-INV-2).',
    }),

    da_6_irreversibility_verified: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-6 (Irreversibility Classification); RT12-INV-2; D-5-v1.0 PI-8 (irreversibility must precede Projection Boundary crossing); RT12-v1.0-canonical.md RS-16 RS-18',
      description: 'RT-12 attestation that DA-6 (Irreversibility Classification) is verified: the CivilizationalDecisionProposal carries a constitutionally valid irreversibility classification. D-5 PI-8: irreversibility classification must precede Projection Boundary crossing. Must be true (RT12-INV-2).',
    }),

    er_conditions_clear: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 ER-1 through ER-5 (epistemic blocking conditions); RT12-INV-2 "ER-1 through ER-5"; RT12-v1.0-canonical.md RS-12 Process 1 Step 5 RS-18',
      description: 'RT-12 attestation that all five epistemic blocking conditions (ER-1 through ER-5) are clear: ER-1 (CUM present), ER-2 (CUM current), ER-3 (uncertainties registered), ER-4 (no fabricated knowledge), ER-5 (no unprocessed gaps). Must be true; false triggers ComplianceFailureReturn to RT-11 (RT12-INV-2).',
    }),

    irreversibility_classification: Object.freeze({
      required: true, type: 'string',
      enum: ['REVERSIBLE', 'IRREVERSIBLE', 'CONDITIONALLY_REVERSIBLE'],
      constitutional_source: 'D-7-v1.0 Part 5 DA-6; D-5-v1.0 PI-8; RT12-v1.0-canonical.md RS-10 Item 1 RS-16; D-8-v1.0 IC-3 (irreversible may not be recalled after delivery to RT-13)',
      description: 'Irreversibility classification carried through from the CivilizationalDecisionProposal. REVERSIBLE: action may be undone. IRREVERSIBLE: action cannot be undone — D-8 IC-3 applies after delivery to RT-13. CONDITIONALLY_REVERSIBLE: reversal possible under specified conditions. DA-6 requires this classification be constitutionally valid before Decision formation.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['FORMING', 'SUBMITTED', 'GATE_PROCESSING', 'AUTHORIZED', 'REJECTED', 'ARCHIVED'],
      constitutional_source: 'RT12-v1.0-canonical.md RS-10 Item 1 RS-14 RS-15 (state machine); RT12-INV-3 (AUTHORIZED only after all six gates); A0-v1.1.1 §3.13 R3',
      description: 'FORMING: RT-12 actively constituting the Decision. SUBMITTED: submitted to RT-03 for six-gate evaluation (A0 §3.13 R3). GATE_PROCESSING: RT-03 gate sequence in progress (RT12-INV-3). AUTHORIZED: all six gates passed; decision committed to RT-05. REJECTED: RT-03 rejected at one or more gates (Loop-Terminating). ARCHIVED: decision in permanent archive (all decisions receive a DecisionArchiveRecord).',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-14 RS-23 Audit Requirements; D-2 §VII Temporal layer; D-8-v1.0 INV-5 (Temporal Awareness); D-8-v1.0 CLI-4 (Temporal Coherence)',
      description: 'ISO 8601 timestamp when RT-12 initiated CivilizationalDecision formation. D-8 CLI-4 (Temporal Coherence): the DeliberationRecord must predate this timestamp. D-8 PROH-6: may not be backdated.',
    }),

    // Optional fields present at later lifecycle states
    gate_processing_result_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-08 RS-09 RS-12 Process 2; PAIR 43; RT12-INV-3; A0-v1.1.1 §3.13 R3',
      description: 'Reference to RT-03 GateProcessingResult.result_id confirming all six gates passed. Present when lifecycle_state is AUTHORIZED. RT12-INV-3: every CivilizationalDecision must pass all six Kernel gates before authorization.',
    }),

    open_action_register_entry_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-09 RS-10 Item 2; RT12-INV-4; A0-v1.1.1 §3.13 R4 R5; D-4-v2.0 Class B KOM',
      description: 'Reference to OpenActionRegisterEntry.oar_entry_id created for this authorized Decision. Present when lifecycle_state is AUTHORIZED. RT12-INV-4: every authorized CivilizationalDecision must have an OpenActionRegisterEntry (Class B Kernel Manifest output via RT-03).',
    }),

  }),

  validate(data) {
    return _validate('CivilizationalDecision', CivilizationalDecision.SCHEMA, data);
  },

  create(data) {
    return _create('CivilizationalDecision', CivilizationalDecision.SCHEMA, CivilizationalDecision.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT12 — OpenActionRegisterEntry (OAR Entry)
// Constitutional basis: RT12-v1.0-canonical.md RS-07 RS-10 Item 2 RS-12 Process 3;
// A0-v1.1.1 §3.13 R4 R5 R8 R10 Owned Objects; D-5-v1.0 PI-12;
// RT12-INV-4 (every authorized Decision has an OAR entry),
// RT12-INV-5 (terminal states assigned only by RT-14 — NEVER by RT-12 unilaterally),
// RT12-INV-6 (every entry must reach a canonical terminal state);
// D-4-v2.0 Class B KOM (OAR creation is a Class B Kernel Manifest operation)
//
// Created by RT-12 for every authorized CivilizationalDecision (RT12-INV-4).
// Terminal state assignment is EXCLUSIVELY by RT-14 (RT12-INV-5).
// RT-12 receives RT-14's TerminalStatusRecord and records the closure.
// Four canonical terminal states: COMPLETE, PARTIAL, FAILED, LOST (D5 PI-12).
// Not structurally immutable — progresses through lifecycle states.
// ─────────────────────────────────────────────────────────────────────────────

const OpenActionRegisterEntry = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'OpenActionRegisterEntry',
    runtime_id:       'RT-12',
    runtime_name:     'Decision Runtime',
    authority:        'RT12-v1.0-canonical.md RS-07 RS-10 Item 2 RS-12 Process 2 Process 3; A0-v1.1.1 §3.13 R4 R5 R8 R10 Owned Objects; D-5-v1.0 PI-12; RT12-INV-4 RT12-INV-5 RT12-INV-6; D-4-v2.0 Class B KOM',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-10',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT12-INV-4', 'RT12-INV-5', 'RT12-INV-6'],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — lifecycle transitions from PENDING through terminal states. CRITICAL: RT12-INV-5 — terminal states (COMPLETE, PARTIAL, FAILED, LOST) are assigned EXCLUSIVELY by RT-14 via TerminalStatusRecord. RT-12 may NEVER self-assign a terminal state. RT12-INV-6: every entry MUST reach one of the four canonical terminal states — no entry may remain permanently open (D5 PI-12). RT12-INV-4: every authorized CivilizationalDecision must have one OAR entry. Created via RT-03 Class B Kernel Manifest operation (D4 Class B KOM); admitted to RT-05 Universal Object Graph. D-8 PROH-5: no OAR entry may be deleted. D-8 INV-6 (Feedback Requirement): every entry must eventually receive terminal status.',
  }),

  SCHEMA: Object.freeze({

    oar_entry_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-07 RS-10 Item 2; A0-v1.1.1 §3.13 R4 R5 Owned Objects; RT12-INV-4',
      description: 'Unique constitutional identifier for this OpenActionRegisterEntry.',
    }),

    decision_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-10 Item 2 RS-12 Process 2 Step 2; RT12-INV-4; A0-v1.1.1 §3.13 R4; D-8-v1.0 INV-2 (provenance preservation)',
      description: 'Reference to CivilizationalDecision.decision_id for which this OAR entry was created. RT12-INV-4: every authorized CivilizationalDecision must have one entry. D-8 INV-2: provenance chain from Decision through OAR entry through TerminalStatusRecord must be preserved.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'PARTIAL', 'FAILED', 'LOST'],
      constitutional_source: 'RT12-v1.0-canonical.md RS-10 Item 2 "OAR Lifecycle States"; RT12-INV-5 RT12-INV-6; D-5-v1.0 PI-12; A0-v1.1.1 §3.13 R10',
      description: 'PENDING: Decision authorized; action not yet initiated by RT-13. IN_PROGRESS: RT-13 Action Projection executing. COMPLETE / PARTIAL / FAILED / LOST: canonical terminal states — assigned EXCLUSIVELY by RT-14 (RT12-INV-5; D5 PI-12). RT-12 may never self-assign a terminal state. LOST: consequence observation not possible within Effect Observation Window; D5 PI-12 escalation required.',
    }),

    creation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-09 RS-10 Item 2; A0-v1.1.1 §3.13 R4; D-2 §VII Temporal layer',
      description: 'ISO 8601 timestamp when this OpenActionRegisterEntry was created (upon authorized CivilizationalDecision and RT-03 Class B KOM confirmation). RT12-INV-4 moment of satisfaction.',
    }),

    rt14_terminal_assignment_only: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'RT12-INV-5 "Open Action Register entries are closed only by RT-14 terminal status assignment — never by RT-12 unilaterally"; A0-v1.1.1 §3.13 R8; D-5-v1.0 PI-12',
      description: 'Constitutional attestation that terminal state transitions on this entry must be performed exclusively by RT-14 via TerminalStatusRecord. Must always be true. A false value constitutes RT12-INV-5 violation. This field enforces the RT-14 exclusivity constraint at the schema level.',
    }),

    // Optional — present when entry has received RT-14 terminal status
    terminal_status_record_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-10 Item 2 RS-12 Process 3 Step 1; RT12-INV-5; A0-v1.1.1 §3.13 R8; D-8-v1.0 INV-6 (Feedback Requirement)',
      description: 'Reference to RT-14 TerminalStatusRecord.record_id that triggered terminal state assignment. Present when lifecycle_state is COMPLETE, PARTIAL, FAILED, or LOST. RT12-INV-5: only RT-14 terminal status assignments close OAR entries.',
    }),

    terminal_assignment_timestamp: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-12 Process 3 Step 2 Step 4; D-2 §VII Temporal layer; D-5-v1.0 PI-12',
      description: 'ISO 8601 timestamp when RT-14 assigned the terminal state to this OAR entry. Present when lifecycle_state is a terminal state.',
    }),

  }),

  validate(data) {
    return _validate('OpenActionRegisterEntry', OpenActionRegisterEntry.SCHEMA, data);
  },

  create(data) {
    return _create('OpenActionRegisterEntry', OpenActionRegisterEntry.SCHEMA, OpenActionRegisterEntry.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT12 — DecisionArchiveRecord (DAR)
// Constitutional basis: RT12-v1.0-canonical.md RS-07 RS-10 Item 3 RS-12 Process 2;
// A0-v1.1.1 §3.13 R9 Owned Objects;
// D-8-v1.0 PROH-5 (no deletion — permanent archive)
//
// A permanent record of every CivilizationalDecision in every state.
// Created for EVERY CivilizationalDecision regardless of authorization outcome.
// No entry may EVER be deleted (D-8 PROH-5; A0 §3.13 R9).
// STRUCTURALLY IMMUTABLE — once written, a DecisionArchiveRecord is permanent.
// ─────────────────────────────────────────────────────────────────────────────

const DecisionArchiveRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DecisionArchiveRecord',
    runtime_id:       'RT-12',
    runtime_name:     'Decision Runtime',
    authority:        'RT12-v1.0-canonical.md RS-07 RS-10 Item 3 RS-12 Process 2 Step 5; A0-v1.1.1 §3.13 R9 Owned Objects; D-8-v1.0 PROH-5 (permanent archive — no deletion)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-10',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: [],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — permanent constitutional record. D-8 PROH-5: no DecisionArchiveRecord may be deleted. A0 §3.13 R9: RT-12 maintains the CivilizationalDecision archive covering ALL decisions in ALL states — permanent record. Created for every CivilizationalDecision regardless of whether it is authorized or rejected. The archive is a constitutional record, not an operational log. RT-04 audits archive completeness continuously (PAIR 45): every CivilizationalDecision must have a corresponding DecisionArchiveRecord (A0 §3.13 R9; D-8 PROH-5). D-8 INV-2 (Provenance Preservation): archive must preserve the complete provenance chain.',
  }),

  SCHEMA: Object.freeze({

    archive_record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-07 RS-10 Item 3; A0-v1.1.1 §3.13 R9 Owned Objects',
      description: 'Unique constitutional identifier for this DecisionArchiveRecord.',
    }),

    decision_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-10 Item 3; A0-v1.1.1 §3.13 R9; D-8-v1.0 INV-2 (provenance preservation)',
      description: 'Reference to CivilizationalDecision.decision_id being archived. Every CivilizationalDecision (authorized or rejected) must have exactly one DecisionArchiveRecord. D-8 INV-2: archive record must preserve the provenance chain from this Decision back to the originating CivilizationalDecisionProposal.',
    }),

    decision_lifecycle_state_at_archival: Object.freeze({
      required: true, type: 'string',
      enum: ['FORMING', 'SUBMITTED', 'GATE_PROCESSING', 'AUTHORIZED', 'REJECTED', 'ARCHIVED'],
      constitutional_source: 'RT12-v1.0-canonical.md RS-10 Item 3 RS-10 Item 1 (Decision lifecycle states); A0-v1.1.1 §3.13 R9',
      description: 'The lifecycle state of the CivilizationalDecision at the time this archive record was created. Records the constitutional state of the Decision when archived. For authorized decisions this is typically AUTHORIZED; for rejected decisions this is REJECTED.',
    }),

    archival_reason: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.13 R9 "all decisions, all states — permanent record"; D-8-v1.0 INV-1 (Constitutional Traceability)',
      description: 'Constitutional reason for archival (e.g., "AUTHORIZED: six-gate passage confirmed", "REJECTED: RT-03 Gate 3 rejection", "COMPLIANCE_FAILURE_RETURN: DA-2 violation identified"). D-8 INV-1: every archive entry must trace to constitutional authority.',
    }),

    archival_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-12 Process 2 Step 5; D-2 §VII Temporal layer; D-8-v1.0 PROH-6 (no temporal manipulation)',
      description: 'ISO 8601 timestamp when this DecisionArchiveRecord was created. D-8 PROH-6: may not be backdated.',
    }),

    deletion_prohibited: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-8-v1.0 PROH-5 "implementation must not provide any mechanism to delete objects from the permanent constitutional record"; A0-v1.1.1 §3.13 R9; RT12-v1.0-canonical.md RS-21 FM-8',
      description: 'D-8 PROH-5 enforcement flag. Must always be true. A DecisionArchiveRecord with deletion_prohibited = false is constitutionally malformed. RT12 FM-8: any attempt to delete a DecisionArchiveRecord is constitutionally prohibited — the operation must be rejected and RT-04 notified.',
    }),

  }),

  validate(data) {
    return _validate('DecisionArchiveRecord', DecisionArchiveRecord.SCHEMA, data);
  },

  create(data) {
    return _create('DecisionArchiveRecord', DecisionArchiveRecord.SCHEMA, DecisionArchiveRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT12 — CivilizationalDecisionChainRecord (CDC Record)
// Constitutional basis: RT12-v1.0-canonical.md RS-07 RS-10 Item 4 RS-12 Process 2;
// A0-v1.1.1 §3.13 R7 Owned Objects; D-7-v1.0 Part 5.5 (Civilizational Decision Chain);
// D-8-v1.0 INV-7 (Coherence Preservation — chain updates atomic with authorization)
//
// RT-12 maintains the Civilizational Decision Chain (D7 Part 5.5): decisions are
// constitutionally sequenced, not arbitrary. One record per authorized Decision,
// establishing its position in the constitutional sequence.
// Updated atomically with CivilizationalDecision authorization (D-8 INV-7).
// Chain integrity is validated by RT-04 (PAIR 45) and VC-7.
// Structurally immutable — chain position is fixed once established.
// ─────────────────────────────────────────────────────────────────────────────

const CivilizationalDecisionChainRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CivilizationalDecisionChainRecord',
    runtime_id:       'RT-12',
    runtime_name:     'Decision Runtime',
    authority:        'RT12-v1.0-canonical.md RS-07 RS-10 Item 4 RS-12 Process 2 Step 4; A0-v1.1.1 §3.13 R7 Owned Objects; D-7-v1.0 Part 5.5 (Civilizational Decision Chain); D-8-v1.0 INV-7 (Coherence Preservation); A1-v1.2 §8.1 VC-7 (Coherence Validation)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-10',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: [],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — chain position is fixed once established. D-8 INV-7 (Coherence Preservation): CivilizationalDecisionChainRecord updates must be atomic with CivilizationalDecision authorization. A0 §3.13 R7: RT-12 enforces the Civilizational Decision Chain (D7 Part 5.5) — decisions are constitutionally sequenced, not arbitrary. RT-04 audits chain integrity continuously via PAIR 45. VC-7 (A1 §8.1 Coherence Validation): chain record coherence validated before decision delivery. D-8 INV-1 (Constitutional Traceability): every chain record must trace to constitutional authority through the authorization sequence.',
  }),

  SCHEMA: Object.freeze({

    chain_record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-07 RS-10 Item 4; A0-v1.1.1 §3.13 R7 Owned Objects; D-7-v1.0 Part 5.5',
      description: 'Unique constitutional identifier for this CivilizationalDecisionChainRecord.',
    }),

    decision_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-10 Item 4 RS-12 Process 2 Step 4; A0-v1.1.1 §3.13 R7; D-7-v1.0 Part 5.5',
      description: 'Reference to CivilizationalDecision.decision_id whose position in the Civilizational Decision Chain this record establishes.',
    }),

    chain_position: Object.freeze({
      required: true, type: 'number',
      constitutional_source: 'D-7-v1.0 Part 5.5 (Civilizational Decision Chain — decisions constitutionally sequenced); A0-v1.1.1 §3.13 R7; RT12-v1.0-canonical.md RS-10 Item 4',
      description: 'Ordinal position of this Decision in the Civilizational Decision Chain. D-7 Part 5.5: decisions are constitutionally sequenced, not arbitrary. Position 1 is the first Decision in the chain. Position must be unique across all CivilizationalDecisionChainRecords. D-8 INV-7: chain record update must be atomic with Decision authorization.',
    }),

    chain_integrity_verified: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5.5; A0-v1.1.1 §3.13 R7; A1-v1.2 §8.1 VC-7 (Coherence Validation); RT12-v1.0-canonical.md RS-12 Process 1 Step 6 RS-21 FM-6',
      description: 'Attestation that the Civilizational Decision Chain integrity has been verified at this position: no sequencing violation exists and this Decision occupies its constitutionally correct chain position. Must be true; false indicates FM-6 (Decision Chain Sequencing Violation) — ComplianceFailureReturn to RT-11.',
    }),

    creation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-12 Process 2 Step 4; D-8-v1.0 INV-7 (Coherence Preservation); D-2 §VII Temporal layer',
      description: 'ISO 8601 timestamp when this CivilizationalDecisionChainRecord was created. D-8 INV-7: creation must be atomic with the corresponding CivilizationalDecision authorization.',
    }),

    // Optional — absent only for the first Decision in the chain
    prior_decision_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 5.5 (Civilizational Decision Chain sequencing); RT12-v1.0-canonical.md RS-10 Item 4; D-8-v1.0 INV-7',
      description: 'Reference to CivilizationalDecision.decision_id of the preceding Decision in the Civilizational Decision Chain. Absent only for the first Decision in the chain (chain_position = 1). For all subsequent positions, prior_decision_ref must be present to maintain chain integrity (D7 Part 5.5).',
    }),

  }),

  validate(data) {
    return _validate('CivilizationalDecisionChainRecord', CivilizationalDecisionChainRecord.SCHEMA, data);
  },

  create(data) {
    return _create('CivilizationalDecisionChainRecord', CivilizationalDecisionChainRecord.SCHEMA, CivilizationalDecisionChainRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT12 — ComplianceVerificationRecord (CVR)
// Constitutional basis: RT12-v1.0-canonical.md RS-09 RS-24 (VC-5);
// A1-v1.2 §5.1 (AIR-2/Compliance); A1-v1.2 §3.4 PAIR 43 (Gate 5 sub-call);
// A1-v1.2 §8.1 VC-5 (Constitutive Coherence Validation);
// D-7-v1.0 Part 5 (DA-1 through DA-6; ER-1 through ER-5);
// RT12-v1.0-canonical.md RS-09 "ComplianceDeterminationRecord (Gate 5 Result)"
//
// DISCREPANCY D-2/D-3 NOTE:
//   A0 §3.13 Owned Objects does not list ComplianceVerificationRecord.
//   RT12-v1.0 RS-09 calls this "ComplianceDeterminationRecord."
//   Wave plan W1-10 Step 2 explicitly requires ComplianceVerificationRecord
//   with verdict = COMPLIANT | NON_COMPLIANT.
//   Constitutional grounding: A1 §5.1 AIR-2/Compliance + PAIR 43 Gate 5 VC-5.
//   Wave plan authority governs for inclusion and naming.
//
// Produced by RT-12 during RT-03 Gate 5 evaluation (PAIR 43, A1 §8.1 VC-5).
// RT-12 holds AIR-2/Compliance (A1 §5.1): the right to assess constitutional
// compliance of CivilizationalDecisionProposals against DA-1–6 and ER-1–5.
// Delivered to RT-03 as the VC-5 (Constitutive Coherence) gate response.
// Structurally immutable �� constitutional assessment record.
// ─────────────────────────────────────────────────────────────────────────────

const ComplianceVerificationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ComplianceVerificationRecord',
    runtime_id:       'RT-12',
    runtime_name:     'Decision Runtime',
    authority:        'RT12-v1.0-canonical.md RS-09 RS-24 (VC-5); A1-v1.2 §5.1 (AIR-2/Compliance); A1-v1.2 §3.4 PAIR 43; A1-v1.2 §8.1 VC-5 (Constitutive Coherence); D-7-v1.0 Part 5 (DA-1–6 ER-1–5)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-10',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: [],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — constitutional assessment record. DISCREPANCY NOTE: A0 §3.13 Owned Objects does not list this type (D-2: Planning Document Choice). RT12-v1.0 RS-09 calls it "ComplianceDeterminationRecord" (D-3: Naming). Wave plan W1-10 Step 2 explicitly requires ComplianceVerificationRecord with verdict = COMPLIANT | NON_COMPLIANT; wave plan authority governs. Constitutional grounding: A1 §5.1 AIR-2/Compliance (RT-12 holds Interpretation Authority in the Compliance domain) + PAIR 43 Gate 5 VC-5. Produced during RT-03 Gate 5 evaluation — RT-03 calls RT-12 as Gate 5 helper (A1 §3.4 PAIR 43); RT-12 returns this record as the VC-5 (Constitutive Coherence) determination. D-8 INV-3 (Authority Separation): RT-12 exercises AIR-2/Compliance here; this does NOT constitute exercise of AIR-3 (Decision Authority). The verdict COMPLIANT means the proposal satisfies DA-1–6 and ER-1–5; it does not itself constitute authorization.',
  }),

  SCHEMA: Object.freeze({

    cvr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-09 RS-24 VC-5; A1-v1.2 §3.4 PAIR 43',
      description: 'Unique constitutional identifier for this ComplianceVerificationRecord.',
    }),

    decision_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-09 RS-24 VC-5; A1-v1.2 PAIR 43; D-8-v1.0 INV-2 (provenance preservation)',
      description: 'Reference to CivilizationalDecision.decision_id for which this compliance verification was performed. D-8 INV-2: provenance chain from CivilizationalDecision through this compliance record must be preserved.',
    }),

    proposal_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-09; PAIR 40 (RT-11 → RT-12 delivery); A1-v1.2 §5.1 AIR-2/Compliance; D-8-v1.0 INV-2',
      description: 'Reference to CivilizationalDecisionProposal.cdp_id that was verified. The proposal is the object of compliance assessment — RT-12 applies DA-1–6 and ER-1–5 criteria to the proposal.',
    }),

    // Wave plan W1-10 Step 2 explicit requirement: verdict enum COMPLIANT | NON_COMPLIANT
    verdict: Object.freeze({
      required: true, type: 'string',
      enum: ['COMPLIANT', 'NON_COMPLIANT'],
      constitutional_source: 'I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md W1-10 Step 2 "ComplianceVerificationRecord.verdict must be one of COMPLIANT | NON_COMPLIANT"; RT12-v1.0-canonical.md RS-09 RS-12 Process 1 Step 5; A1-v1.2 §8.1 VC-5',
      description: 'Wave plan W1-10 Step 2 explicit requirement. COMPLIANT: the CivilizationalDecisionProposal satisfies all DA-1 through DA-6 and ER-1 through ER-5 requirements — RT-12 may form a CivilizationalDecision. NON_COMPLIANT: one or more DA or ER criteria not satisfied — RT-12 issues ComplianceFailureReturn to RT-11; no CivilizationalDecision is formed (see failure_elements for specifics). A1 §8.1 VC-5 (Constitutive Coherence) output.',
    }),

    da_1_compliant: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-1 (Scope Authority); RT12-INV-2; RT12-v1.0-canonical.md RS-12 Process 1 Step 4',
      description: 'Compliance result for DA-1 (Scope Authority): decision scope falls within constitutionally assigned civilizational scope.',
    }),

    da_2_compliant: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-2 (Deliberation Grounding); RT12-INV-1 RT12-INV-2',
      description: 'Compliance result for DA-2 (Deliberation Grounding): Decision is grounded in a complete 13-element DeliberationRecord.',
    }),

    da_3_compliant: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-3 (CUM Grounding); ER-1 ER-2; RT12-INV-2',
      description: 'Compliance result for DA-3 (CUM Grounding): Decision is grounded in a current, non-expired CUM.',
    }),

    da_4_compliant: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-4 (Gate Passage); RT12-INV-2 RT12-INV-3; D-8-v1.0 CLI-2',
      description: 'Compliance result for DA-4 (Gate Passage): all applicable validation checkpoints satisfied.',
    }),

    da_5_compliant: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-5 (DOM-000001 Registration); RT12-INV-2',
      description: 'Compliance result for DA-5 (DOM-000001 Registration): CivilizationalDecisionProposal carries a valid DOM-000001 registration identifier.',
    }),

    da_6_compliant: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 DA-6 (Irreversibility Classification); RT12-INV-2; D-5-v1.0 PI-8',
      description: 'Compliance result for DA-6 (Irreversibility Classification): CivilizationalDecisionProposal carries a constitutionally valid irreversibility classification.',
    }),

    er_1_clear: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 ER-1 (No CUM blocking condition); RT12-INV-2; RT12-v1.0-canonical.md RS-12 Process 1 Step 5',
      description: 'ER-1 epistemic requirement clear: a CUM exists (has been synthesized). True = no ER-1 blocking condition.',
    }),

    er_2_clear: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 ER-2 (Expired CUM blocking condition); D-8-v1.0 INV-5 (Temporal Awareness); RT12-v1.0-canonical.md RS-21 FM-10',
      description: 'ER-2 epistemic requirement clear: CUM has not expired beyond constitutional currency thresholds. True = no ER-2 blocking condition. False = FM-10 (Expired CUM) — ComplianceFailureReturn.',
    }),

    er_3_clear: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 ER-3 (Suppressed Uncertainty blocking condition); RT12-INV-2',
      description: 'ER-3 epistemic requirement clear: known uncertainties have been registered in the DeliberationRecord. True = no ER-3 blocking condition.',
    }),

    er_4_clear: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 ER-4 (Fabricated Knowledge blocking condition); D-8-v1.0 PROH-2; RT12-INV-2',
      description: 'ER-4 epistemic requirement clear: all deliberation inputs have verified provenance (no fabricated knowledge). True = no ER-4 blocking condition. D-8 PROH-2 (Epistemic Fabrication Prohibition).',
    }),

    er_5_clear: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5 ER-5 (Gap Ignored blocking condition); RT12-INV-2',
      description: 'ER-5 epistemic requirement clear: all identified knowledge gaps have been registered and processed in the DeliberationRecord. True = no ER-5 blocking condition.',
    }),

    gate_5_invocation_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A1-v1.2 §3.4 PAIR 43 (RT-03 calls RT-12 during Gate 5 processing); A1-v1.2 §8.1 VC-5; RT12-v1.0-canonical.md RS-24 VC-5',
      description: 'Reference to RT-03 Gate 5 invocation identifier for which this ComplianceVerificationRecord was produced. PAIR 43: RT-03 calls RT-12 at Gate 5; this record is RT-12\'s response. A1 §8.1 VC-5 (Constitutive Coherence Validation) output.',
    }),

    verification_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT12-v1.0-canonical.md RS-24; D-2 §VII Temporal layer; D-8-v1.0 PROH-6',
      description: 'ISO 8601 timestamp when this compliance verification was performed. D-8 PROH-6: may not be backdated.',
    }),

    // Optional — present when verdict is NON_COMPLIANT
    failure_elements: Object.freeze({
      required: false, type: 'array',
      constitutional_source: 'RT12-v1.0-canonical.md RS-12 Process 1 Step 5 RS-21 FM-3 FM-4; A0-v1.1.1 §3.13 R2; PAIR 40 ComplianceFailureReturn',
      description: 'Array identifying the specific DA or ER elements that were not satisfied. Present when verdict = NON_COMPLIANT. Each entry should identify the failing element (e.g., "DA-2", "ER-2") and the reason. Used to construct the ComplianceFailureReturn delivered to RT-11 (PAIR 40, Loop-Restarting).',
    }),

  }),

  validate(data) {
    return _validate('ComplianceVerificationRecord', ComplianceVerificationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ComplianceVerificationRecord', ComplianceVerificationRecord.SCHEMA, ComplianceVerificationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  CivilizationalDecision,
  OpenActionRegisterEntry,
  DecisionArchiveRecord,
  CivilizationalDecisionChainRecord,
  ComplianceVerificationRecord,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-12',
  WAVE:        'W1-10',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
