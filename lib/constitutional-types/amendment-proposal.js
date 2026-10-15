'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/amendment-proposal.js
// Task: W1-15 — RT-16 Amendment Runtime Type Definitions
// Runtime: RT-16 — Amendment Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-27
// Authority: A0-v1.1.1 §3.17; R16-v1.0-canonical.md RS-01 RS-07 RS-08 RS-09
//            RS-10 RS-11 RS-20 RS-21;
//            D7-v1.0-canonical.md Part 12 (§12.1–§12.6) Constitutional Amendment
//            Architecture; D7 §12.3 AP-1–AP-6; D7 §12.4 Stage 1–6; D7 §12.5 Classes;
//            D7 §12.1 Constitutional Continuity Principle;
//            D-2-v1.2 Forbidden Assumption;
//            D8-v1.0 INV-1 INV-2 INV-5 PROH-1 PROH-4 PROH-5 PROH-7 PROH-8 TI-1–TI-5;
//            RT16-INV-1 through RT16-INV-6
//
// ─── SECTION NUMBER NOTE ─────────────────────────────────────────────────────
// D-1 (Type C — Implementation Interpretation):
//   RT-16 constitutional seat is A0 §3.17 (R16-v1.0 RS-01).
//   Index.js stub comment cites "§3.16" for RT-16 — off by one.
//   Same artifact as W1-04 W1-07 W1-08 W1-09 W1-10 W1-11 W1-12 W1-14.
//   CONSTITUTIONAL blocks use §3.17 (R-series governs over planning comment).
//
// ─── OWNERSHIP BOUNDARY ──────────────────────────────────────────────────────
// RT-16 OWNS (implemented here):
//   AmendmentProposal, AmendmentRegistry, RatifiedAmendmentRecord,
//   AmendmentRejectionRecord
//
// RT-16 DOES NOT OWN:
//   DeliberationRecord — RT-11 (A0 §3.12; W1-09)
//   PreservationAuditRecord — RT-04 (A0 §3.4; W1-13 audit-record.js)
//   CivilizationalDecisionProposal — RT-11 (A0 §3.12; W1-09)
//   KernelOperationManifest — RT-03 (A0 §3.3; W1-13 kernel-record.js)
//
// RT-16 DOES NOT DO:
//   Self-initiate amendments without RT-11 proposal (A1 §14.3 FORBIDDEN)
//   Open deliberation on Class IV proposals (RT16-INV-6; D7 §12.1 FORBIDDEN)
//   Ratify without RT-11 DeliberationRecord (RT16-INV-1)
//   Ratify without RT-04 PreservationAuditRecord PASS (RT16-INV-2)
//   Ratify without founding-level human authorization (RT16-INV-3)
//   Waive any AP requirement (RT16-INV-4; D8 PROH-9)
//   Bypass RT-03 for constitutional text modifications (PAIR 61; D4 §2.1 KMP)
//   Override RT-04 HALT determination (RS-18)
//   Participate in standard Constitutional Loop phases (A1 §15.2 — ABSENT from all 10)
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT16 — AmendmentProposal (AP)
// Constitutional basis: A0-v1.1.1 §3.17 Owned Objects #1;
// R16-v1.0-canonical.md RS-07; D7-v1.0 §12.3 (AP-1 through AP-6);
// D7 §12.5 (Amendment Classes I–IV); D7 §12.4 Stage 1;
// RT16-INV-4 (all six AP requirements must be satisfied before deliberation);
// RT16-INV-5 (never silently dropped); RT16-INV-6 (Class IV — immediate rejection);
// D8-v1.0 INV-2 PROH-5 PROH-7 TI-1 TI-5
//
// The constitutional object representing a proposed change to the constitutional
// architecture. RT-16 receives AmendmentProposals exclusively from RT-11 (PAIR 59).
// The AmendmentProposal contains all six AP requirements (D7 §12.3) and carries
// a lifecycle_state that transitions through RS-11's state machine.
//
// LIFECYCLE-STATEFUL — the AmendmentProposal transitions through:
//   DORMANT → PROPOSAL_RECEIVED → AP_VERIFICATION → DELIBERATION →
//   PRESERVATION_AUDIT → AWAITING_AUTHORIZATION → RATIFIED / REJECTED
//   Or from PROPOSAL_RECEIVED → CLASS_IV_REJECTED (immediate, no deliberation)
//
// NOT STRUCTURALLY IMMUTABLE — lifecycle state transitions are constitutionally
// mandated by RS-11. However, provenance records are PERMANENT (D8 PROH-5):
// AmendmentProposals may not be deleted once created.
// ─────────────────────────────────────────────────────────────────────────────

const AmendmentProposal = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AmendmentProposal',
    runtime_id:       'RT-16',
    runtime_name:     'Amendment Runtime',
    authority:        'A0-v1.1.1 §3.17 Owned Objects #1; R16-v1.0-canonical.md RS-07; D7-v1.0 §12.3 AP-1–AP-6; D7 §12.5 Classes I–IV; D7 §12.4 Stage 1; RT16-INV-4 RT16-INV-5 RT16-INV-6; D8-v1.0 INV-2 PROH-5 PROH-7 TI-1 TI-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-15',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT16-INV-4', 'RT16-INV-5', 'RT16-INV-6'],
    constitutional_note: 'LIFECYCLE-STATEFUL — AmendmentProposal transitions through the RS-11 state machine (PROPOSAL_RECEIVED → AP_VERIFICATION → DELIBERATION → PRESERVATION_AUDIT → AWAITING_AUTHORIZATION → RATIFIED/REJECTED; or PROPOSAL_RECEIVED → CLASS_IV_REJECTED immediately). NOT structurally immutable — lifecycle_state transitions are constitutionally mandated. However, D8 PROH-5 and RS-21 PROH-5 prohibit deletion: AmendmentProposals are permanent constitutional records. RT-16 OWNS this object (A0 §3.17 Owned Objects). RT-16 receives from RT-11 (PAIR 59) — RT-11 is the ONLY constitutional initiator (A1 §14.3; RT-16 self-initiation FORBIDDEN). All six AP requirements (AP-1 through AP-6, D7 §12.3) must be present and verified before deliberation entry (RT16-INV-4). Class IV proposals (D7 §12.5) — any change affecting D-2 terminal commitments — are immediately rejected without deliberation (RT16-INV-6; D7 §12.1 Constitutional Continuity Principle). RT16-INV-5: proposals are never silently dropped; every proposal terminates in RATIFIED, REJECTED, or CLASS_IV_REJECTED with an explicit record. D8 PROH-7 (No Unassigned Execution): proposer_identity_ref is mandatory — no anonymous amendment proposals.',
  }),

  SCHEMA: Object.freeze({

    amendment_proposal_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.17 Owned Objects; R16-v1.0-canonical.md RS-07; D8-v1.0 TI-1 (Identity Invariance — unique immutable ID required)',
      description: 'Unique constitutional identifier for this AmendmentProposal. Anchors the amendment provenance chain: AmendmentProposal → RatifiedAmendmentRecord or AmendmentRejectionRecord (D8 TI-3 Relationship Invariance). Referenced in AmendmentRegistry entries and all produced records (RatifiedAmendmentRecord.amendment_proposal_ref, AmendmentRejectionRecord.amendment_proposal_ref).',
    }),

    proposal_class: Object.freeze({
      required: true, type: 'string',
      enum: ['CLASS_I', 'CLASS_II', 'CLASS_III', 'CLASS_IV'],
      constitutional_source: 'D7-v1.0-canonical.md §12.5 (Amendment Classes I–IV); R16-v1.0-canonical.md RS-10 RS-11 RS-12.1; RT16-INV-6; A0-v1.1.1 §3.17 Responsibility 2',
      description: 'Amendment class per D7 §12.5. RT-16 classifies every proposal before further processing. CLASS_I: Operational — modifications to specific requirements not altering foundational principles. CLASS_II: Structural — modifications to document fundamental architecture. CLASS_III: Foundational — modifications to D1, D0, or D-1. CLASS_IV: Terminal Modification — any change that would affect D-2 terminal commitments; constitutionally inadmissible under D7 §12.1 Constitutional Continuity Principle; RT16-INV-6 mandates immediate rejection without deliberation. Classification is performed in A1 §12.8 Step 3 and is final for Class IV. D8 PROH-1 (No New Constitutional Categories): RT-16 may not create additional amendment classes.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['DORMANT', 'PROPOSAL_RECEIVED', 'AP_VERIFICATION', 'DELIBERATION', 'PRESERVATION_AUDIT', 'AWAITING_AUTHORIZATION', 'RATIFIED', 'REJECTED', 'CLASS_IV_REJECTED'],
      constitutional_source: 'R16-v1.0-canonical.md RS-10 RS-11; RT16-INV-5; A0-v1.1.1 §3.17 Note on Lifecycle; D7 §12.4 Stage 1–6; A1 §12.8 Steps 2–15',
      description: 'Current lifecycle state of this AmendmentProposal per the RS-11 constitutional state machine. DORMANT: registry maintenance only, no active process. PROPOSAL_RECEIVED: received from RT-11 (PAIR 59); classification in progress. AP_VERIFICATION: classified non-Class IV; verifying AP-1 through AP-6 (RT16-INV-4). DELIBERATION: AP verification passed; proposal in RT-11 deliberation (D7 §12.4 Stage 2). PRESERVATION_AUDIT: deliberation complete; RT-04 Preservation Audit in progress (PAIR 60 BLOCKING; D7 §12.4 Stage 3). AWAITING_AUTHORIZATION: Preservation Audit PASS; awaiting founding-level human authorization (D7 §12.4 Stage 4; RT16-INV-3). RATIFIED: all three ratification invariants satisfied; RatifiedAmendmentRecord produced (RT16-INV-1/2/3). REJECTED: rejected at AP verification, HALT, or authorization failure. CLASS_IV_REJECTED: immediately rejected upon Class IV classification (RT16-INV-6; D7 §12.1). RT16-INV-5: state must never be silently abandoned — every terminal state (RATIFIED, REJECTED, CLASS_IV_REJECTED) produces an explicit constitutional record.',
    }),

    ap1_identification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D7-v1.0-canonical.md §12.3 AP-1; R16-v1.0-canonical.md RS-12.2; RT16-INV-4; A0-v1.1.1 §3.17 Responsibility 3',
      description: 'AP-1 — Identification (D7 §12.3). What document(s) are being amended, what specific provisions, and what version. All three elements — document identity, provision specificity, version reference — are required for AP-1 compliance. RT16-INV-4: this field must be present and substantive before deliberation entry. RT-16 verifies AP-1 during AP_VERIFICATION state (A1 §12.8 Step 3). D8 PROH-7 (No Unassigned Execution): proposals must be traceable to specific constitutional text.',
    }),

    ap2_justification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D7-v1.0-canonical.md §12.3 AP-2; R16-v1.0-canonical.md RS-12.2; RT16-INV-4; D8-v1.0 PROH-6',
      description: 'AP-2 — Justification (D7 §12.3). Why the amendment is constitutionally necessary: what inadequacy, discovered gap, or changed circumstance requires constitutional change; why it cannot be addressed within existing constitutional authority. D8 PROH-6 (No Assumption-to-Fact Conversion): the justification must document actual constitutional inadequacy, not assumed need. RT16-INV-4: this field must be present and substantive before deliberation entry.',
    }),

    ap3_preservation_assessment: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D7-v1.0-canonical.md §12.3 AP-3; R16-v1.0-canonical.md RS-12.2; RT16-INV-4; D7 §12.1 Constitutional Continuity Principle; D-2-v1.2 Forbidden Assumption',
      description: 'AP-3 — Preservation Assessment (D7 §12.3). For each D-2 terminal commitment, an explicit assessment of whether the proposed amendment affects it. Any amendment declared to affect a terminal commitment is constitutionally inadmissible unless the effect is a strengthening. D7 §12.1 (Constitutional Continuity Principle): amendments that affect D-2 terminal commitments constitute Class IV Terminal Modification — constitutionally inadmissible. RT16-INV-6: if AP-3 reveals a terminal commitment effect, proposal must be classified Class IV and immediately rejected. D-2 Forbidden Assumption: civilization cannot govern its own evolution without human oversight — this commitment is terminal and preserved.',
    }),

    ap4_precedence_analysis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D7-v1.0-canonical.md §12.3 AP-4; R16-v1.0-canonical.md RS-12.2; RT16-INV-4; D8-v1.0 INV-1 (Constitutional Traceability)',
      description: 'AP-4 — Precedence Analysis (D7 §12.3). How the proposed amendment relates to all other documents in the constitutional stack. D8 INV-1 (Constitutional Traceability): every constitutional action must be traceable; an amendment that ignores constitutional precedence violates traceability. RT16-INV-4: this field must be present and substantive before deliberation entry. The analysis must address the full constitutional stack (D-series, A-series, R-series) for completeness.',
    }),

    ap5_implementation_pathway: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D7-v1.0-canonical.md §12.3 AP-5; R16-v1.0-canonical.md RS-12.2 RS-12.6; RT16-INV-4; D7 §12.4 Stage 6 (Transition)',
      description: 'AP-5 — Implementation Pathway (D7 §12.3). How existing operations relying on amended provisions will transition to amended requirements. RT-16 verifies that this pathway is included before deliberation entry (RS-12.6). Upon ratification, RT-16 publishes the Implementation Pathway as part of the RatifiedAmendmentRecord (RS-12.6). D7 §12.4 Stage 6 (Transition): ongoing transition monitoring per AP-5 distributes to affected runtimes and RT-04 audit function. RT16-INV-4: this field must be present and substantive before deliberation entry.',
    }),

    ap6_reversibility_assessment: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D7-v1.0-canonical.md §12.3 AP-6; R16-v1.0-canonical.md RS-12.2; RT16-INV-4; D8-v1.0 INV-1',
      description: 'AP-6 — Reversibility Assessment (D7 §12.3). Whether the proposed amendment is reversible and, if not, an explicit acknowledgment of its irreversibility and the basis for the heightened confidence required. D8 INV-1 (Constitutional Traceability): irreversible amendments carry higher constitutional weight and require explicit confidence documentation. RT16-INV-4: this field must be present and substantive before deliberation entry. For Class III (Foundational) and Class II (Structural) amendments, irreversibility is especially significant — the assessment must be explicit.',
    }),

    proposer_identity_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D7-v1.0-canonical.md §12.2 (Amendment Authority — founding operators; domain Decision Authority holders); R16-v1.0-canonical.md RS-05 R1; D8-v1.0 PROH-7 (No Unassigned Execution); A0-v1.1.1 §3.17 Responsibility 1',
      description: 'Reference to RT-01 ActorProfile (A0 §3.1; W1-02) of the constitutional actor proposing this amendment. D7 §12.2 authorizes: any actor with Domain Decision Authority in an affected domain, or any founding operator, may propose. D8 PROH-7 (No Unassigned Execution): all RT-16 amendment operations must be attributable — proposals must identify the proposer. Note: RT-16 initiates the amendment process upon receipt from RT-11 (PAIR 59) — the proposer_identity_ref is the original proposing constitutional actor, validated by RT-03 Gate 1 (RT-01 identity) and Gate 3 (RT-02 authority) during Class A submission.',
    }),

    proposal_receipt_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R16-v1.0-canonical.md RS-11 (DORMANT→PROPOSAL_RECEIVED trigger); D8-v1.0 INV-5 (Temporal Awareness); D8 TI-5 (Temporal Invariance); D8 CLI-4; A1 §12.8 Step 2',
      description: 'ISO 8601 timestamp when RT-16 received this AmendmentProposal from RT-11 (PAIR 59; A1 §12.8 Step 2). This is the constitutional activation trigger timestamp. D8 TI-5 (Temporal Invariance): all downstream timestamps (state transitions, records produced) must follow this timestamp. D8 INV-5 (Temporal Awareness): RT-16 amendment process maintains temporal ordering of all state transitions. D8 PROH-6: may not be backdated.',
    }),

  }),

  validate(data) {
    return _validate('AmendmentProposal', AmendmentProposal.SCHEMA, data);
  },

  create(data) {
    return _create('AmendmentProposal', AmendmentProposal.SCHEMA, AmendmentProposal.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT16 — AmendmentRegistry (AR)
// Constitutional basis: A0-v1.1.1 §3.17 Owned Objects #2;
// R16-v1.0-canonical.md RS-07 RS-10; RT16-INV-5;
// D7-v1.0 §12.4 Stage 1–6 (six-stage review process);
// D8-v1.0 INV-2 PROH-4 PROH-5 TI-1 TI-5;
// A0-v1.1.1 §3.17 Responsibility 8
//
// The constitutional record of all Amendment Proposals in all states.
// The AmendmentRegistry maintains the complete history and current status
// of every AmendmentProposal ever received by RT-16.
//
// RT16-INV-5: Amendment Proposals are never silently dropped — the
// AmendmentRegistry is the constitutional instrument of this invariant.
//
// Each AmendmentRegistry entry tracks one AmendmentProposal through the
// RS-11 state machine. The registry as a whole is the collection of all
// such entries. This type definition specifies the schema for one registry
// tracking entry per proposal.
//
// LIFECYCLE-STATEFUL — the registry entry's tracked_proposal_state field
// is updated as the AmendmentProposal progresses through RS-11 states.
// The registry entry itself is NOT deleted — it persists through all states
// including terminal states (D8 PROH-5; RS-21 PROH-4 PROH-5).
// ─────────────────────────────────────────────────────────────────────────────

const AmendmentRegistry = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AmendmentRegistry',
    runtime_id:       'RT-16',
    runtime_name:     'Amendment Runtime',
    authority:        'A0-v1.1.1 §3.17 Owned Objects #2 Responsibility 8; R16-v1.0-canonical.md RS-07 RS-10; RT16-INV-5; D7-v1.0 §12.4 Stages 1–6; D8-v1.0 INV-2 PROH-4 PROH-5 TI-1 TI-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-15',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT16-INV-5'],
    constitutional_note: 'LIFECYCLE-STATEFUL — the tracked_proposal_state field is updated as the referenced AmendmentProposal progresses through RS-11 constitutional state transitions. NOT structurally immutable — state transitions are constitutionally mandated. NEVER DELETED — D8 PROH-5 and RS-21 PROH-4 PROH-5 prohibit deletion; AmendmentRegistry entries are permanent constitutional records of all proposals in all states. RT-16 OWNS this object (A0 §3.17 Owned Objects). A0 §3.17 Responsibility 8: RT-16 maintains the Amendment Registry for ALL Amendment Proposals in ALL states (proposed, under deliberation, preservation audited, ratified, rejected, Class IV-rejected). RT16-INV-5: proposals are NEVER silently dropped — this registry entry is the constitutional instrument ensuring every AmendmentProposal is tracked to a terminal state. The registry is the sole mechanism ensuring RT16-INV-5 compliance across concurrent and sequential amendment processes. D8 PROH-4 (No Provenance Suppression): registry entries may not be truncated, hidden, or deleted. D8 INV-2 (Provenance Preservation): the registry preserves the complete provenance chain of each amendment process.',
  }),

  SCHEMA: Object.freeze({

    registry_entry_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.17 Owned Objects; R16-v1.0-canonical.md RS-07 RS-10; D8-v1.0 TI-1 (Identity Invariance)',
      description: 'Unique constitutional identifier for this AmendmentRegistry tracking entry. One registry entry exists per AmendmentProposal. Anchors the registry\'s provenance function: registry_entry_id → amendment_proposal_ref (D8 TI-3 Relationship Invariance). D8 TI-1: must be unique and immutable across all registry entries.',
    }),

    amendment_proposal_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.17 Responsibility 8; R16-v1.0-canonical.md RS-07 RS-10; RT16-INV-5; D8-v1.0 TI-3 (Relationship Invariance)',
      description: 'Reference to AmendmentProposal.amendment_proposal_id being tracked in this registry entry. D8 TI-3: relationship to the AmendmentProposal must be preserved throughout all state transitions. RT16-INV-5: this reference is the constitutional anchor ensuring the proposal is never silently dropped — the registry entry tracks it from receipt through terminal state. One AmendmentRegistry entry corresponds to exactly one AmendmentProposal.',
    }),

    tracked_proposal_state: Object.freeze({
      required: true, type: 'string',
      enum: ['DORMANT', 'PROPOSAL_RECEIVED', 'AP_VERIFICATION', 'DELIBERATION', 'PRESERVATION_AUDIT', 'AWAITING_AUTHORIZATION', 'RATIFIED', 'REJECTED', 'CLASS_IV_REJECTED'],
      constitutional_source: 'R16-v1.0-canonical.md RS-10 RS-11; RT16-INV-5; A0-v1.1.1 §3.17 Responsibility 8; D7 §12.4 Stage 1–6; A1 §12.8',
      description: 'Current state of the tracked AmendmentProposal in the RS-11 state machine. Updated by RT-16 upon each constitutional state transition. RS-11 governs the permitted transitions: DORMANT→PROPOSAL_RECEIVED→AP_VERIFICATION→DELIBERATION→PRESERVATION_AUDIT→AWAITING_AUTHORIZATION→RATIFIED or REJECTED; PROPOSAL_RECEIVED→CLASS_IV_REJECTED (immediate). RT16-INV-5: this field documents the proposal\'s current position — RT-16 may not abandon tracking without reaching a terminal state (RATIFIED, REJECTED, or CLASS_IV_REJECTED). A0 §3.17 Responsibility 8: registry must cover all states including Class IV-rejected.',
    }),

    state_last_updated: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D8-v1.0 INV-5 (Temporal Awareness); D8 TI-5 (Temporal Invariance); R16-v1.0-canonical.md RS-11 (state transition triggers); D8 CLI-4',
      description: 'ISO 8601 timestamp of the most recent state transition for the tracked AmendmentProposal. Updated each time tracked_proposal_state changes per RS-11. D8 TI-5 (Temporal Invariance): state_last_updated must always be later than or equal to the referenced AmendmentProposal.proposal_receipt_timestamp — no state update can precede proposal receipt. D8 INV-5: temporal ordering of all registry state transitions is constitutionally required. D8 PROH-6: may not be backdated.',
    }),

    rt16_inv5_no_silent_drop_attested: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'RT16-INV-5 "Amendment Proposals are never silently dropped — they are either ratified, rejected with a RejectionRecord, or remain in active process"; R16-v1.0-canonical.md RS-07 RS-21 PROH-5; D8-v1.0 PROH-5',
      description: 'Constitutional attestation by RT-16 that this AmendmentProposal will not be silently dropped. Must always be true. A false value constitutes RT16-INV-5 violation. This field enforces the constitutional obligation at the schema level: every AmendmentRegistry entry must carry this attestation, confirming RT-16\'s commitment to track the proposal to a terminal state (RATIFIED, REJECTED, or CLASS_IV_REJECTED) with an explicit constitutional record. D8 PROH-5 (No Accountability Record Deletion): this attestation may not be removed.',
    }),

  }),

  validate(data) {
    return _validate('AmendmentRegistry', AmendmentRegistry.SCHEMA, data);
  },

  create(data) {
    return _create('AmendmentRegistry', AmendmentRegistry.SCHEMA, AmendmentRegistry.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT16 — RatifiedAmendmentRecord (RAR)
// Constitutional basis: A0-v1.1.1 §3.17 Owned Objects #3 Produced Objects;
// R16-v1.0-canonical.md RS-07 RS-09 RS-17 RS-19;
// RT16-INV-1 (DeliberationRecord mandatory);
// RT16-INV-2 (PreservationAuditRecord mandatory);
// RT16-INV-3 (founding-level authorization mandatory);
// D7-v1.0 §12.4 Stage 5 (Publication);
// D8-v1.0 INV-2 PROH-5 PROH-8 TI-1 TI-3 TI-5;
// A1 §12.8 Steps 11–12 (ratification recording)
//
// Produced when an AmendmentProposal successfully completes all required stages:
//   1. RT16-INV-1: DeliberationRecord from RT-11 received
//   2. RT16-INV-2: PreservationAuditRecord from RT-04 received (PASS)
//   3. RT16-INV-3: Founding-level human authorization obtained and validated
//
// All three invariants must be satisfied simultaneously. No partial ratification.
//
// STRUCTURALLY IMMUTABLE — the ratification event is a permanent constitutional
// record. Once produced, it is never modified or deleted (D8 PROH-5).
// ─────────────────────────────────────────────────────────────────────────────

const RatifiedAmendmentRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'RatifiedAmendmentRecord',
    runtime_id:       'RT-16',
    runtime_name:     'Amendment Runtime',
    authority:        'A0-v1.1.1 §3.17 Owned Objects #3 Produced Objects; R16-v1.0-canonical.md RS-07 RS-09 RS-17 RS-19; RT16-INV-1 RT16-INV-2 RT16-INV-3; D7-v1.0 §12.4 Stage 5; D8-v1.0 INV-2 PROH-5 PROH-8 TI-1 TI-3 TI-5; A1 §12.8 Steps 11–12',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-15',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT16-INV-1', 'RT16-INV-2', 'RT16-INV-3'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — ratification record is a permanent constitutional record. RT-16 OWNS and PRODUCES this object (A0 §3.17 Owned Objects and Produced Objects). This record is produced ONLY when all three ratification invariants are simultaneously satisfied: RT16-INV-1 (DeliberationRecord from RT-11 received), RT16-INV-2 (PreservationAuditRecord from RT-04 received with PASS result), RT16-INV-3 (founding-level authorization from human governance actors with D-2-level authority obtained and validated). No partial ratification; no exception; no waiver. Committed to RT-05 through RT-03 (PAIR 61; A1 §12.8 Step 11) and persisted through RT-07. RT-04 records the complete amendment audit trail independently (A1 §12.8 Step 13). D7 §12.4 Stage 5 (Publication): the amended document is published as a new canonical version with notation of changes, the Deliberation Record reference, and the authorization record reference. D8 PROH-8 (No Hidden Authority Pathways): every path to ratification must trace through the D7 §12.4 six-stage process — all three references (deliberation, audit, authorization) must be populated and non-null. D8 PROH-5: may not be deleted.',
  }),

  SCHEMA: Object.freeze({

    ratified_amendment_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.17 Owned Objects; R16-v1.0-canonical.md RS-07 RS-09; D8-v1.0 TI-1 (Identity Invariance)',
      description: 'Unique constitutional identifier for this RatifiedAmendmentRecord. Anchors the complete amendment provenance chain: AmendmentProposal → RatifiedAmendmentRecord (D8 TI-3 Relationship Invariance). Referenced by the AmendmentRegistry entry (tracked_proposal_state: RATIFIED) and by all constitutional actors and runtimes that incorporate the ratified amendment into their operations (A1 §12.8 Step 15 propagation).',
    }),

    amendment_proposal_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.17 Produced Objects; R16-v1.0-canonical.md RS-07 RS-09; D8-v1.0 INV-2 (Provenance Preservation); D8 TI-3 (Relationship Invariance)',
      description: 'Reference to AmendmentProposal.amendment_proposal_id that was ratified through this process. D8 INV-2: provenance chain from AmendmentProposal through RatifiedAmendmentRecord must be preserved — RT-16 may not sever this link. D8 TI-3: relationship to the AmendmentProposal must be maintained permanently. This is the root of the constitutional provenance chain for the ratified amendment.',
    }),

    deliberation_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT16-INV-1 "No amendment is ratified without a Deliberation Record from RT-11"; R16-v1.0-canonical.md RS-07 RS-08 RS-28; D7-v1.0 §12.4 Stage 2 (Deliberation); D8-v1.0 INV-2 INV-3',
      description: 'Reference to the DeliberationRecord (RT-11 owned; A0 §3.12) produced during D7 §12.4 Stage 2 deliberation. RT16-INV-1: this field is a mandatory ratification precondition — a null or absent value constitutes RT16-INV-1 violation and the record is constitutionally malformed. D8 INV-3 (Authority Separation): RT-11 leads deliberation; RT-16 receives the output — this reference documents that the deliberation was conducted by the constitutionally authorized runtime. D7 §12.4 Stage 5: the Deliberation Record reference is published as part of the ratification record. The DeliberationRecord must include participation by domain representatives for all affected domains, DOM-000001 authority, Audit Authority, Theory of Change assessment, and the original ratifying authority (D7 §12.4 Stage 2).',
    }),

    preservation_audit_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT16-INV-2 "No amendment is ratified without a Preservation Audit from RT-04"; R16-v1.0-canonical.md RS-07 RS-08 RS-28 RS-12.5; PAIR 60 (BLOCKING); D7-v1.0 §12.4 Stage 3; D8-v1.0 INV-1 INV-2',
      description: 'Reference to the PreservationAuditRecord (RT-04 owned; A0 §3.4; W1-13 audit-record.js) with PASS result. RT16-INV-2: this field is a mandatory ratification precondition — a null or absent value constitutes RT16-INV-2 violation. PAIR 60 (BLOCKING): RT-16 may not proceed to authorization without this record. The PASS result confirms RT-04\'s independent assessment that the amendment does not violate any provision of a higher-authority document. A HALT result would have terminated the amendment process — the PASS result documented here is the constitutional authorization for proceeding. D8 INV-1 (Constitutional Traceability): every ratified amendment must be traceable to an independent Preservation Audit.',
    }),

    founding_authorization_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT16-INV-3 "No amendment is ratified without founding-level authorization from human governance actors"; D7-v1.0 §12.2 (Amendment Authority); D7 §12.4 Stage 4 (Approval); R16-v1.0-canonical.md RS-28; D-2-v1.2 Forbidden Assumption; A1 §12.8 Steps 8–10; D8-v1.0 INV-3',
      description: 'Reference to the founding-level authorization record from human governance actors with D-2-level authority. RT16-INV-3: this field is a mandatory ratification precondition — a null or absent value constitutes RT16-INV-3 violation. D7 §12.2: authorization must be explicit and registered — implicit approval is not constitutionally valid. The authorization is submitted through RT-08 → RT-03 as a Class A operation (A1 §12.8 Step 9) and passes all six RT-03 gates (Step 10). D8 INV-3 (Authority Separation): founding-level authorization by human governance actors is the constitutional authority record — RT-16 cannot self-authorize ratification. D-2 Forbidden Assumption: civilization cannot govern its own evolution without human oversight — this reference is the operational implementation of that principle.',
    }),

    ratified_constitutional_text: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D7-v1.0-canonical.md §12.4 Stage 5 (Publication); R16-v1.0-canonical.md RS-09 RS-19; A0-v1.1.1 §3.17 Responsibility 7; A1 §12.8 Step 11',
      description: 'The ratified constitutional text or reference to the amended document as published per D7 §12.4 Stage 5. Contains the canonical changes to the constitutional stack (D-series or A-series document) as committed to RT-05 through RT-03 (A1 §12.8 Step 11). The amended document is published as a new canonical version with explicit notation of what changed. D7 §12.4 Stage 5: must include the changes made, the constitutional basis for each change (AP-1 Identification), and the new canonical version designation. This field may contain the amended text directly or a canonical reference to the updated document path in RT-05.',
    }),

    ratification_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D8-v1.0 INV-5 (Temporal Awareness); D8 TI-5 (Temporal Invariance); R16-v1.0-canonical.md RS-11 (AWAITING_AUTHORIZATION→RATIFIED transition); A1 §12.8 Step 12',
      description: 'ISO 8601 timestamp when RT-16 recorded ratification (A1 §12.8 Step 12). This is the constitutional timestamp of amendment completion. D8 TI-5 (Temporal Invariance): must follow the PreservationAuditRecord timestamp (RT16-INV-2 precondition) and the founding authorization submission timestamp (RT16-INV-3 precondition). D8 INV-5: temporal ordering of ratification within the full amendment process must be preserved. D8 PROH-6: may not be backdated. This timestamp governs all downstream temporal requirements: RT-04 audit trail recording (A1 §12.8 Step 13), RT-11 outcome notification (Step 14), RT-03 Stage 10 propagation (Step 15).',
    }),

    deletion_prohibited: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D8-v1.0 PROH-5 "no accountability record may be deleted"; R16-v1.0-canonical.md RS-21 PROH-5; A0-v1.1.1 §3.17 Owned Objects',
      description: 'D8 PROH-5 enforcement flag. Must always be true. A RatifiedAmendmentRecord with deletion_prohibited = false is constitutionally malformed. This record is a permanent constitutional artifact — it documents the complete constitutional amendment event, serves as the provenance anchor for the modified constitutional stack, and satisfies RT-16\'s accountability obligations under D8 PROH-7. RT-16 enforces append-only treatment through RT-07 persistence (D8 INV-2).',
    }),

  }),

  validate(data) {
    return _validate('RatifiedAmendmentRecord', RatifiedAmendmentRecord.SCHEMA, data);
  },

  create(data) {
    return _create('RatifiedAmendmentRecord', RatifiedAmendmentRecord.SCHEMA, RatifiedAmendmentRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT16 — AmendmentRejectionRecord (ARR)
// Constitutional basis: A0-v1.1.1 §3.17 Owned Objects #4 Produced Objects;
// R16-v1.0-canonical.md RS-07 RS-09 RS-17 RS-19;
// RT16-INV-5 (never silently dropped — every rejection produces this record);
// RT16-INV-6 (Class IV immediate rejection — cites D7 §12.1 CCP);
// D7-v1.0 §12.1 Constitutional Continuity Principle;
// D7-v1.0 §12.3 AP-1–AP-6 (AP verification failure grounds);
// D7-v1.0 §12.4 Stage 3 (HALT grounds) and Stage 4 (authorization failure grounds);
// D8-v1.0 INV-2 PROH-5 TI-1 TI-3 TI-5;
// A0-v1.1.1 §3.17 Responsibility 10 Responsibility 11
//
// Produced when an AmendmentProposal is rejected for any reason:
//   - AP-1 through AP-6 non-compliance (REJECTED at AP_VERIFICATION)
//   - RT-04 Preservation Audit HALT (REJECTED at PRESERVATION_AUDIT)
//   - Founding-level authorization failure (REJECTED at AWAITING_AUTHORIZATION)
//   - Class IV immediate rejection (CLASS_IV_REJECTED at PROPOSAL_RECEIVED)
//
// RT16-INV-5: no proposal is silently dropped — every rejected proposal receives
// an AmendmentRejectionRecord with explicit rejection basis and stage.
//
// RT16-INV-6: Class IV rejection records must cite D7 §12.1 Constitutional
// Continuity Principle as the constitutional ground for inadmissibility.
//
// STRUCTURALLY IMMUTABLE — the rejection event is a permanent constitutional
// record. Once produced, it is never modified or deleted (D8 PROH-5).
// ─────────────────────────────────────────────────────────────────────────────

const AmendmentRejectionRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AmendmentRejectionRecord',
    runtime_id:       'RT-16',
    runtime_name:     'Amendment Runtime',
    authority:        'A0-v1.1.1 §3.17 Owned Objects #4 Produced Objects Responsibility 10 11; R16-v1.0-canonical.md RS-07 RS-09 RS-17 RS-19; RT16-INV-5 RT16-INV-6; D7-v1.0 §12.1 §12.3 §12.4; D8-v1.0 INV-2 PROH-5 TI-1 TI-3 TI-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-15',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT16-INV-5', 'RT16-INV-6'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — rejection record is a permanent constitutional record. RT-16 OWNS and PRODUCES this object (A0 §3.17 Owned Objects and Produced Objects). RT16-INV-5: no Amendment Proposal may be silently dropped — every rejected proposal receives an AmendmentRejectionRecord. Committed to RT-05 through RT-03 (PAIR 61) and persisted through RT-07. Rejection grounds: (1) AP verification failure — any of AP-1 through AP-6 not satisfied (A0 §3.17 Responsibility 10; RT16-INV-4; D7 §12.3); (2) RT-04 Preservation Audit HALT (RT16-INV-2; D7 §12.4 Stage 3; PAIR 60); (3) Founding-level authorization failure (RT16-INV-3; D7 §12.2; D7 §12.4 Stage 4); (4) Class IV immediate rejection (RT16-INV-6; D7 §12.1; A0 §3.17 Responsibility 11). RT16-INV-6: for Class IV rejections, class_iv_immediate must be true and rejection_basis must cite D7 §12.1 Constitutional Continuity Principle. D8 PROH-5: may not be deleted. D8 INV-2 (Provenance Preservation): rejection record preserves the constitutional ground for rejection — RT-16 may not suppress, truncate, or obscure rejection grounds.',
  }),

  SCHEMA: Object.freeze({

    rejection_record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.17 Owned Objects; R16-v1.0-canonical.md RS-07 RS-09; D8-v1.0 TI-1 (Identity Invariance)',
      description: 'Unique constitutional identifier for this AmendmentRejectionRecord. Anchors the rejection provenance chain: AmendmentProposal → AmendmentRejectionRecord (D8 TI-3 Relationship Invariance). Referenced by the AmendmentRegistry entry (tracked_proposal_state: REJECTED or CLASS_IV_REJECTED) to satisfy RT16-INV-5.',
    }),

    amendment_proposal_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.17 Produced Objects; R16-v1.0-canonical.md RS-07 RS-09; RT16-INV-5; D8-v1.0 INV-2 (Provenance Preservation); D8 TI-3 (Relationship Invariance)',
      description: 'Reference to AmendmentProposal.amendment_proposal_id that was rejected. D8 INV-2: provenance chain from AmendmentProposal through AmendmentRejectionRecord must be preserved. D8 TI-3: relationship to the rejected AmendmentProposal must be maintained permanently. RT16-INV-5: this reference is the constitutional mechanism by which the proposal is confirmed as non-silently-dropped — the rejection record is the explicit constitutional record of non-ratification.',
    }),

    rejection_basis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.17 Responsibility 10 Responsibility 11; R16-v1.0-canonical.md RS-07 RS-19; RT16-INV-5 RT16-INV-6; D7-v1.0 §12.1 §12.3 §12.4; D8-v1.0 PROH-4 PROH-5 INV-2',
      description: 'Constitutional grounds for rejection with explicit citation of the constitutional authority. For AP verification failure: cite the specific AP requirement(s) (AP-1 through AP-6, D7 §12.3) that failed and the constitutional basis. For Preservation Audit HALT: cite RT-04 PreservationAuditRecord reference and the constitutional provisions the amendment would have violated. For authorization failure: cite D7 §12.2 and the authorization deficiency. For Class IV immediate rejection: MUST cite D7 §12.1 Constitutional Continuity Principle as the constitutional ground for inadmissibility (RT16-INV-6 mandate). D8 PROH-4 (No Provenance Suppression): rejection_basis may not be truncated, obscured, or vague — the full constitutional ground must be documented. D8 INV-2: the provenance of the rejection decision is preserved through this field.',
    }),

    rejection_stage: Object.freeze({
      required: true, type: 'string',
      enum: ['AP_VERIFICATION', 'PRESERVATION_AUDIT', 'AWAITING_AUTHORIZATION', 'CLASS_IV_IMMEDIATE'],
      constitutional_source: 'R16-v1.0-canonical.md RS-11 RS-17 RS-19; RT16-INV-5; D7-v1.0 §12.4 Stages 1–4; A0-v1.1.1 §3.17 Responsibility 10 11',
      description: 'The constitutional stage at which rejection occurred per RS-11 state machine and D7 §12.4. AP_VERIFICATION: proposal failed AP-1 through AP-6 compliance during Stage 1 / Step 3 (RT16-INV-4; D7 §12.3; A0 §3.17 Responsibility 10). PRESERVATION_AUDIT: RT-04 returned HALT during Stage 3 (RT16-INV-2; D7 §12.4 Stage 3; PAIR 60). AWAITING_AUTHORIZATION: founding-level authorization refused or failed RT-03 gate processing during Stage 4 (RT16-INV-3; D7 §12.4 Stage 4). CLASS_IV_IMMEDIATE: Class IV classification triggered immediate rejection at Step 3 without entering any other stage (RT16-INV-6; D7 §12.1; A0 §3.17 Responsibility 11). No other rejection stages are constitutionally valid.',
    }),

    class_iv_immediate: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'RT16-INV-6 "Class IV amendments (Terminal Modification) are constitutionally inadmissible — RT-16 must classify as Class IV and route to immediate constitutional rejection — no deliberation process is opened"; D7-v1.0 §12.1 Constitutional Continuity Principle; R16-v1.0-canonical.md RS-12.4; A0-v1.1.1 §3.17 Responsibility 11',
      description: 'Whether this rejection is a Class IV immediate rejection per RT16-INV-6 and D7 §12.1. When true: the proposal was classified as Class IV (Terminal Modification — any change that would affect D-2 terminal commitments); no AP verification, no deliberation, no Preservation Audit, and no authorization process was opened or initiated. The Class IV classification is itself the constitutional ground for immediate rejection — deliberation on a Class IV proposal would itself constitute a constitutional violation. When false: rejection occurred through one of the standard rejection paths (AP_VERIFICATION, PRESERVATION_AUDIT, or AWAITING_AUTHORIZATION). RT16-INV-6: if class_iv_immediate is true, rejection_stage must be CLASS_IV_IMMEDIATE and rejection_basis must cite D7 §12.1.',
    }),

    rejection_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D8-v1.0 INV-5 (Temporal Awareness); D8 TI-5 (Temporal Invariance); R16-v1.0-canonical.md RS-11 RS-17; RT16-INV-5; A1 §12.8 Steps 7 10',
      description: 'ISO 8601 timestamp when RT-16 produced this AmendmentRejectionRecord. D8 TI-5 (Temporal Invariance): must follow the referenced AmendmentProposal.proposal_receipt_timestamp. For CLASS_IV_IMMEDIATE rejections, this timestamp immediately follows classification (A1 §12.8 Step 3) — no delay is constitutionally permissible. For HALT rejections, this timestamp follows the PreservationAuditRecord timestamp (A1 §12.8 Step 7). D8 INV-5: temporal ordering within the amendment process must be preserved. D8 PROH-6: may not be backdated. RT16-INV-5: rejection must be documented immediately upon rejection decision — no deferral.',
    }),

    deletion_prohibited: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D8-v1.0 PROH-5 "no accountability record may be deleted"; R16-v1.0-canonical.md RS-21 PROH-5; RT16-INV-5; A0-v1.1.1 §3.17 Owned Objects',
      description: 'D8 PROH-5 enforcement flag. Must always be true. An AmendmentRejectionRecord with deletion_prohibited = false is constitutionally malformed. RT16-INV-5: rejected proposals must receive an AmendmentRejectionRecord rather than silent disposal — and that record must be permanent. This field enforces the permanent accountability record requirement at the schema level. RT-16 enforces append-only treatment through RT-07 persistence (D8 INV-2). Deletion would constitute D8 PROH-5 violation and RT16-INV-5 violation simultaneously.',
    }),

  }),

  validate(data) {
    return _validate('AmendmentRejectionRecord', AmendmentRejectionRecord.SCHEMA, data);
  },

  create(data) {
    return _create('AmendmentRejectionRecord', AmendmentRejectionRecord.SCHEMA, AmendmentRejectionRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  AmendmentProposal,
  AmendmentRegistry,
  RatifiedAmendmentRecord,
  AmendmentRejectionRecord,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-16',
  WAVE:        'W1-15',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
