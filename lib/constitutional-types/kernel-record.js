'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/kernel-record.js
// Task: W1-13 — RT-03 Constitutional Enforcement Kernel Type Definitions
// Runtime: RT-03 — Constitutional Enforcement Kernel Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-25
// Authority: R3-v1.0-canonical.md RS-07/RS-10; A0-v1.1.1 §3.3; D4 §2.3; D4 §3;
//            D4 Part 10; D4 §4.1-4.6; D6 AIR-5; D8 PROH-5; RT03-INV-3 through INV-8
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
//
// ─── ENFORCEMENT BOUNDARY NOTE ───────────────────────────────────────────────
// These are pure schema descriptors. They introduce no fail-open behaviour,
// no authority accumulation, and no bypass of ownership rules. RT-04 audit
// independence (D6 AIR-5) is preserved: these types carry no RT-04 gate
// dependency. RT-03 ownership is declared exclusively in CONSTITUTIONAL blocks.
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT03 — RejectionRecord
// Constitutional basis: R3-v1.0 RS-07 RT03-OWN-01; A0-v1.1.1 §3.3; D4 §4.1-4.6
// (gate failure records); RT03-OBL-12 (no silent rejection); RT03-INV-4;
// KI-013; D8 PROH-5 (permanent — never deleted)
//
// Created for every Class A operation that fails any gate. Immutable upon
// creation and permanent — terminal state is Historical (never deleted).
// RT-04 reads this record via RT03-INV-6 channel. No silent rejection is
// constitutionally permitted (PROH-8).
// ─────────────────────────────────────────────────────────────────────────────

const RejectionRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'RejectionRecord',
    runtime_id:       'RT-03',
    runtime_name:     'Constitutional Enforcement Kernel Runtime',
    authority:        'R3-v1.0 RS-07 RT03-OWN-01; A0-v1.1.1 §3.3; D4 §4.1-4.6; RT03-OBL-12 (no silent rejection); RT03-INV-4; KI-013; D8 PROH-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: D8 PROH-5 (No Accountability Record Deletion)
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: RT03-INV-4 (immutable upon creation)
    structural_immutable: true,
    invariants: ['RT03-INV-4', 'RT03-INV-8'],
    constitutional_note: 'IMMUTABLE UPON CREATION. PERMANENT (D8 PROH-5). One per gate failure; no silent rejection permitted (PROH-8; RT03-OBL-12). RT-04 reads via RT03-INV-6 channel — RT-04 is NEVER processed through RT-03 gates (D6 AIR-5). gate field must identify the specific gate; failed_condition must be precise — vague rejections violate RT03-OBL-12.',
  }),

  SCHEMA: Object.freeze({

    rejection_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-01; R3-v1.0 RS-09 RT03-OUT-05 "gate failure specification"',
      description: 'Unique constitutional identifier for this RejectionRecord',
    }),

    // CONSTITUTIONALLY REQUIRED: RT03-OBL-12 specifies exact gate identification
    gate: Object.freeze({
      required: true, type: 'string',
      enum: ['GATE-1', 'GATE-2', 'GATE-3', 'GATE-4', 'GATE-5', 'GATE-6'],
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-01 "the specific gate at which the operation failed"; D4 §4.1-4.6',
      description: 'The specific gate at which this Class A operation was rejected. GATE-1=Identity (RT-01); GATE-2=Object State (RT-05); GATE-3=Authority (RT-02); GATE-4=Epistemic Chain (RT-09); GATE-5=Constitutive Coherence; GATE-6=Consequence.',
    }),

    // CONSTITUTIONALLY REQUIRED: specific failed condition per RT03-OBL-12
    failed_condition: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-01 "the specific condition within that gate that was not satisfied"; RT03-OBL-12',
      description: 'The specific constitutional condition within the gate that was not satisfied. Must be precise — vague rejection conditions violate RT03-OBL-12 (no silent rejection).',
    }),

    actor_identity: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-01 "the actor identity"; RS-09 RT03-OUT-05 "actor"',
      description: 'Identity of the actor whose Class A operation was rejected',
    }),

    operation_type: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-01 "the proposed operation type"; RS-09 RT03-OUT-05 "operation"',
      description: 'Type of the Class A operation that was rejected',
    }),

    operation_identifier: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-09 (every Class A operation has exactly one Operation Lifecycle Record); RT03-INV-4',
      description: 'Unique identifier for the Class A operation that was rejected. References the Operation Lifecycle Record.',
    }),

    timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-01 "the timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this rejection occurred',
    }),

    constitutional_refs: Object.freeze({
      required: false, type: 'array',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-01 "any relevant constitutional references"',
      description: 'Array of constitutional document references (e.g. "D4 §4.3 condition (b)") relevant to this rejection. Provides RT-04 with precise audit basis.',
    }),

  }),

  validate(data) {
    return _validate('RejectionRecord', RejectionRecord.SCHEMA, data);
  },

  create(data) {
    return _create('RejectionRecord', RejectionRecord.SCHEMA, RejectionRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT03 — AccountabilityRecord
// Constitutional basis: R3-v1.0 RS-07 RT03-OWN-02; A0-v1.1.1 §3.3; D4 §3 Stage 9;
// RT03-INV-3 (Stage 8-9 atomicity); RT03-INV-8; KI-014; D3 RF-A8; D8 IOR-2
//
// Constitutionally inseparable from the Stage 8 state change it records.
// Created at Stage 9, atomically with Stage 8. Immutable and permanent.
// RT-04 reads; RT-05 stores the corresponding admitted state change.
// ─────────────────────────────────────────────────────────────────────────────

const AccountabilityRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AccountabilityRecord',
    runtime_id:       'RT-03',
    runtime_name:     'Constitutional Enforcement Kernel Runtime',
    authority:        'R3-v1.0 RS-07 RT03-OWN-02; A0-v1.1.1 §3.3; D4 §3 Stage 9; RT03-INV-3 (Stage 8-9 atomicity); RT03-INV-8; KI-014; D3 RF-A8; D8 IOR-2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT03-INV-3', 'RT03-INV-8'],
    constitutional_note: 'IMMUTABLE UPON CREATION. PERMANENT. Constitutionally inseparable from the Stage 8 state change it records (RT03-INV-3 Stage 8-9 atomicity). Created at Stage 9 — if Stage 9 fails, a RollbackProvenanceRecord is created instead. RT-04 reads via RT03-INV-6; RT-05 stores the admitted state change. D8 IOR-2 (Provenance): every admitted operation must have an AccountabilityRecord.',
  }),

  SCHEMA: Object.freeze({

    accountability_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-02; RS-09 RT03-OUT-07 "Stage 9 provenance record"',
      description: 'Unique constitutional identifier for this AccountabilityRecord',
    }),

    actor_identity: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-09 RT03-OUT-07 "actor"',
      description: 'Identity of the actor whose Class A operation was admitted',
    }),

    authority_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-09 RT03-OUT-07 "authority"; D4 §3 Stage 9 provenance recording',
      description: 'Reference to the DelegationRecord or authority claim under which this operation was admitted (Gate 3 confirmation reference)',
    }),

    operation_type: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-09 RT03-OUT-07 "operation"',
      description: 'Type of the Class A operation that was admitted',
    }),

    operation_identifier: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-09 (OperationLifecycleRecord reference); RT03-INV-3',
      description: 'Unique identifier for the admitted Class A operation. References the Operation Lifecycle Record.',
    }),

    timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-09 RT03-OUT-07 "timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp of Stage 9 commitment',
    }),

    constitutional_effect: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-09 RT03-OUT-07 "constitutional effect"; D3 RF-A8 (Historical Inalienability)',
      description: 'Description of the constitutional effect produced by this admitted operation on the Reality Fabric',
    }),

    stage8_commit_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RT03-INV-3 (Stage 8-9 atomicity); D4 §3 Stage 8',
      description: 'Reference to the RT-05 Stage 8 atomic commit that this AccountabilityRecord documents. Atomically paired — no AccountabilityRecord exists without a completed Stage 8 commit.',
    }),

  }),

  validate(data) {
    return _validate('AccountabilityRecord', AccountabilityRecord.SCHEMA, data);
  },

  create(data) {
    return _create('AccountabilityRecord', AccountabilityRecord.SCHEMA, AccountabilityRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT03 — RollbackProvenanceRecord
// Constitutional basis: R3-v1.0 RS-07 RT03-OWN-03; A0-v1.1.1 §3.3;
// D4 §3 Stage 8 failure handling; RT03-INV-3 (Stage 8-9 atomicity);
// PROH-3 (no partial Stage 9 commitment); PROH-8 (no silent failure)
//
// Documents Stage 8-9 atomic commit failure — the state change and provenance
// recording failed as an indivisible unit. This record is itself a Class B
// output proving the atomic commit was attempted but did not complete.
// Immutable upon creation and permanent.
// ─────────────────────────────────────────────────────────────────────────────

const RollbackProvenanceRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'RollbackProvenanceRecord',
    runtime_id:       'RT-03',
    runtime_name:     'Constitutional Enforcement Kernel Runtime',
    authority:        'R3-v1.0 RS-07 RT03-OWN-03; A0-v1.1.1 §3.3; D4 §3 Stage 8 failure; RT03-INV-3; PROH-3 (no partial Stage 9); PROH-8 (no silent failure)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT03-INV-3'],
    constitutional_note: 'IMMUTABLE UPON CREATION. PERMANENT. Proves atomic commit was attempted but did not complete (RT03-INV-3). Created instead of AccountabilityRecord when Stage 8-9 fails. rollback_status documents whether rollback completed — PROH-9 prohibits new operation processing during rollback (rollback_status = ROLLBACK_INITIATED). RT-04 reads via RT03-INV-6 for enforcement audit (PROH-8 ensures no silent failure).',
  }),

  SCHEMA: Object.freeze({

    rollback_record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-03; A0-v1.1.1 §3.3',
      description: 'Unique constitutional identifier for this RollbackProvenanceRecord',
    }),

    operation_identifier: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RT03-INV-3; D4 §3 Stage 8',
      description: 'Identifier of the Class A operation whose Stage 8-9 atomic commit failed',
    }),

    attempt_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RT03-INV-3; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when the Stage 8-9 atomic commit was attempted',
    }),

    failure_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-07 (KernelFailureLog basis); PROH-8 (no silent failure)',
      description: 'Description of the Stage 8-9 failure that necessitated rollback. Precision required — silent failures are prohibited (PROH-8).',
    }),

    rollback_status: Object.freeze({
      required: true, type: 'string',
      enum: ['ROLLBACK_INITIATED', 'ROLLBACK_COMPLETE', 'ROLLBACK_FAILED'],
      constitutional_source: 'R3-v1.0 RT03-REC-07; PROH-9 (no new operation processing during ROLLBACK_INITIATED)',
      description: 'ROLLBACK_INITIATED: rollback in progress — PROH-9 prohibits new Class A/B operations. ROLLBACK_COMPLETE: fabric restored. ROLLBACK_FAILED: critical constitutional failure.',
    }),

    constitutional_basis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-03; D4 §3',
      description: 'Constitutional basis for this rollback (e.g. "RT03-FAIL-07: Stage 8-9 atomicity failure")',
    }),

  }),

  validate(data) {
    return _validate('RollbackProvenanceRecord', RollbackProvenanceRecord.SCHEMA, data);
  },

  create(data) {
    return _create('RollbackProvenanceRecord', RollbackProvenanceRecord.SCHEMA, RollbackProvenanceRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT03 — SuspensionNotice
// Constitutional basis: R3-v1.0 RS-07 RT03-OWN-04; A0-v1.1.1 §3.3; D4 Part 10;
// D4 §10.2 (Type A — Operational); D4 §10.3 (Type B — Authority);
// D4 §10.4 (Type C — Domain Processing); KI-018; KI-019
//
// Constitutional record issuing a suspension. Active until superseded by a
// ResolutionRecord. Permanent — status transitions permitted (ACTIVE→RESOLVED)
// but record is never deleted. RT-03 may not invent new suspension types
// beyond Type A/B/C (Manifest-bounded).
// ─────────────────────────────────────────────────────────────────────────────

const SuspensionNotice = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'SuspensionNotice',
    runtime_id:       'RT-03',
    runtime_name:     'Constitutional Enforcement Kernel Runtime',
    authority:        'R3-v1.0 RS-07 RT03-OWN-04; A0-v1.1.1 §3.3; D4 Part 10; D4 §10.2/§10.3/§10.4; KI-018 (Type A effect); KI-019 (Type B trigger)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Status transitions ACTIVE→RESOLVED permitted on ResolutionRecord admission
    structural_immutable: false,
    invariants: ['RT03-INV-5'],
    constitutional_note: 'PERMANENT RECORD (never deleted). Status transitions permitted: ACTIVE→RESOLVED when ResolutionRecord admitted. RT-03 MUST NOT invent new suspension types beyond TYPE_A/TYPE_B/TYPE_C — Manifest-bounded (RT03-INV-5; RS-06 Suspension Authority). Routing: TYPE_A → RT-01 (actors) and RT-05 (objects); TYPE_B → RT-02 (authority); TYPE_C → domain processing (RT-06 coherence domain). RT-04 reads via RT03-INV-6.',
  }),

  SCHEMA: Object.freeze({

    notice_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-04; A0-v1.1.1 §3.3',
      description: 'Unique constitutional identifier for this SuspensionNotice',
    }),

    // CONSTITUTIONALLY REQUIRED: suspension type must be one of three Manifest-bounded types
    suspension_type: Object.freeze({
      required: true, type: 'string',
      enum: ['TYPE_A', 'TYPE_B', 'TYPE_C'],
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-04 "Type A (Operational), Type B (Authority), or Type C (Domain Processing)"; D4 §10.2/§10.3/§10.4; RS-06 Suspension Authority',
      description: 'TYPE_A: Operational suspension (D4 §10.2; KI-018 — affects actors and objects). TYPE_B: Authority suspension (D4 §10.3; KI-019 — via authority challenge). TYPE_C: Domain Processing suspension (D4 §10.4 — RT-06 coherence domain).',
    }),

    target: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-09 RT03-OUT-09 "target"',
      description: 'Identifier of the suspended actor, authority chain, or domain',
    }),

    constitutional_trigger: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-09 RT03-OUT-09 "trigger"; D4 §10.2/§10.3/§10.4',
      description: 'The specific D4 Part 10 constitutional condition that triggered this suspension',
    }),

    issuing_authority: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-09 RT03-OUT-09 "authority"; RS-06 Suspension Authority (bounded)',
      description: 'The authority under which this suspension was issued (RT-03 Manifest-bounded suspension authority)',
    }),

    recovery_condition: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-09 RT03-OUT-09 "recovery condition"',
      description: 'The constitutional conditions that must be satisfied to lift this suspension via ResolutionRecord',
    }),

    notice_status: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'RESOLVED'],
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-04 "Active until superseded by a ResolutionRecord"',
      description: 'ACTIVE: suspension in effect. RESOLVED: ResolutionRecord admitted; suspension lifted. Record is permanent in either state.',
    }),

    issued_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-04; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this SuspensionNotice was issued',
    }),

    resolution_record_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R3-v1.0 RS-08 RT03-IN-07 (ResolutionRecord lifts active SuspensionNotice)',
      description: 'Reference to the ResolutionRecord that lifted this suspension. Absent while notice_status is ACTIVE.',
    }),

  }),

  validate(data) {
    return _validate('SuspensionNotice', SuspensionNotice.SCHEMA, data);
  },

  create(data) {
    return _create('SuspensionNotice', SuspensionNotice.SCHEMA, SuspensionNotice.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT03 — KernelOperationManifest
// Constitutional basis: R3-v1.0 RS-07 RT03-OWN-08; A0-v1.1.1 §3.3; D4 §2.3;
// RT03-INV-5 (Manifest-bounded authority); PROH-4 (no retrospective KOM modification)
//
// Established at FoundingRatification. Specifies the finite, closed enumeration
// of all eleven Class B operation types RT-03 is permitted to perform.
// Immutable within the current constitutional era — amendment requires RT-16
// founding-level authority (PROH-4). One KOM per era.
// ─────────────────────────────────────────────────────────────────────────────

const KernelOperationManifest = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'KernelOperationManifest',
    runtime_id:       'RT-03',
    runtime_name:     'Constitutional Enforcement Kernel Runtime',
    authority:        'R3-v1.0 RS-07 RT03-OWN-08; A0-v1.1.1 §3.3; D4 §2.3; RT03-INV-5 (Manifest-bounded authority); PROH-4 (no retrospective KOM modification)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-13',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: immutable within era (RT03-INV-5; PROH-4)
    structural_immutable: true,
    invariants: ['RT03-INV-5'],
    constitutional_note: 'IMMUTABLE WITHIN ERA (RT03-INV-5; PROH-4). Amendment requires RT-16 founding-level authority — RT-03 cannot modify its own Manifest (PROH-4; PROH-7 no unauthorized authority accumulation). One KOM per era. RT-03 enforces Manifest boundaries but cannot change them. class_b_operation_types is the finite, closed list — RT-03 MUST NOT perform Class B operations not listed here.',
  }),

  SCHEMA: Object.freeze({

    manifest_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-08; A0-v1.1.1 §3.3',
      description: 'Unique constitutional identifier for this KernelOperationManifest',
    }),

    era_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-08 "One KOM per era"; D4 §2.3',
      description: 'Reference to the constitutional era for which this Manifest is operative',
    }),

    established_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-08 "established at FoundingRatification"; D4 §2.3; D2 Layer 6',
      description: 'ISO 8601 timestamp of FoundingRatification at which this KOM was established',
    }),

    constitutional_basis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-08; D4 §2.3',
      description: 'Constitutional basis for this KOM (e.g. "D4 §2.3; FoundingRatification; APEX-CONSTITUTION-v1.0")',
    }),

    // CONSTITUTIONALLY REQUIRED: finite, closed list of Class B operation types
    class_b_operation_types: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-08 "finite, closed enumeration of all eleven Class B operation types"; D4 §2.3',
      description: 'Finite, closed enumeration of Class B operation types RT-03 is constitutionally authorized to perform. RT-03 MUST NOT perform any Class B operation not in this list (RT03-INV-5; PROH-4).',
    }),

    manifest_version: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R3-v1.0 RS-07 RT03-OWN-08; PROH-4 (version tracks amendment lineage)',
      description: 'Version identifier for this KOM. Increments only via RT-16 constitutional amendment.',
    }),

  }),

  validate(data) {
    return _validate('KernelOperationManifest', KernelOperationManifest.SCHEMA, data);
  },

  create(data) {
    return _create('KernelOperationManifest', KernelOperationManifest.SCHEMA, KernelOperationManifest.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  RejectionRecord,
  AccountabilityRecord,
  RollbackProvenanceRecord,
  SuspensionNotice,
  KernelOperationManifest,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-03',
  WAVE:        'W1-13',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
