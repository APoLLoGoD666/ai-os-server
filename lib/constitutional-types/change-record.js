'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/change-record.js
// Task: W1-04 — RT-05 Reality Fabric Type Definitions
// Runtime: RT-05 — Reality Fabric Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-25
// Authority: R5-v1.0-canonical.md RS-07; I1-IMPLEMENTATION-SEQUENCING.md §W1-04
//            A0-v1.1.1 §3.6; D3 (RF-A1–RF-A12; GI-1–GI-9; GCR-1–GCR-7); D8 Phase 2
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT05 — ChangeRecord
// Constitutional basis: I1-SEQUENCING §W1-04; A0-v1.1.1 §3.6 (RT-05 executes
// atomic commits — Responsibility 6); D3 RF-A1 (every reality assertion must be
// recorded); D8 Phase 2; R5-v1.0 RS-07 (RT-05 owned objects)
//
// ChangeRecord is the constitutional event type for every stage transition in
// the Reality Fabric. It formalizes what lib/reality/fabric.js _recordEvent()
// produces: an immutable, authored record of each claim lifecycle advance.
// Required by W2-03 (ChangeRecord production in advanceClaim()).
// ─────────────────────────────────────────────────────────────────────────────

// Stage constants — 13-stage lifecycle per lib/reality/fabric.js and D3
const FABRIC_STAGES = Object.freeze([
  'potential',   // 1 — exists as possibility
  'emergent',    // 2 — early signals detected
  'observed',    // 3 — directly seen by sensor
  'verified',    // 4 — confirmed by second source
  'contested',   // 5 — active disagreement
  'revised',     // 6 — updated after challenge
  'deprecated',  // 7 — superseded but archived
  'superseded',  // 8 — replaced by newer claim
  'validated',   // 9 — passed formal validation gate
  'integrated',  // 10 — absorbed into knowledge base
  'embedded',    // 11 — used in active reasoning
  'critical',    // 12 — load-bearing; many downstream claims depend on it
  'evolved',     // 13 — survived ≥2 revision cycles; highest confidence
]);

const ChangeRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ChangeRecord',
    runtime_id:       'RT-05',
    runtime_name:     'Reality Fabric Runtime',
    authority:        'I1-SEQUENCING §W1-04; A0-v1.1.1 §3.6 (Responsibility 6 — execute atomic commits); D3 RF-A1 (reality assertion recording); D8 Phase 2; R5-v1.0 RS-07',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-04',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: D3 RF-A8 (Historical Inalienability); RT05-INV-2
    deletion_policy:      'PROHIBITED',
    // ChangeRecords are immutable event assertions — they record what occurred
    structural_immutable: true,
    invariants: ['RT05-INV-2'],
    constitutional_note: 'IMMUTABLE EVENT RECORD (D3 RF-A8 Historical Inalienability; RT05-INV-2: no object deleted from fabric). Each ChangeRecord is the constitutional assertion of a stage transition in the Reality Fabric. Produced by W2-03 in advanceClaim() to formalize the claim_lifecycle_events writes. Required for W2-04 Gate 6: fabric.getChangeHistory() reads these records (NOT RT-07 gateway — C0-MANIFEST §5.2 item 9).',
  }),

  SCHEMA: Object.freeze({

    change_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "ChangeRecord must include: change_id"',
      description: 'Unique constitutional identifier for this ChangeRecord',
    }),

    claim_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "ChangeRecord must include: claim_ref"; A0-v1.1.1 §3.6 (RT-05 holds all URO objects)',
      description: 'Reference to the claim/URO identifier this stage transition applies to (maps to reality_claims.id)',
    }),

    // stage_from is nullable on initial creation (potential creation event has no prior stage)
    stage_from: Object.freeze({
      required: false, type: 'string',
      enum: FABRIC_STAGES,
      constitutional_source: 'I1-SEQUENCING §W1-04 "ChangeRecord must include: stage_from"; lib/reality/fabric.js STAGES (13-stage lifecycle)',
      description: 'Prior stage of the claim before this transition. Null for creation events (first entry into fabric).',
    }),

    stage_to: Object.freeze({
      required: true, type: 'string',
      enum: FABRIC_STAGES,
      constitutional_source: 'I1-SEQUENCING §W1-04 "ChangeRecord must include: stage_to"; lib/reality/fabric.js STAGES',
      description: 'New stage after this transition. Always required — every ChangeRecord asserts a definite resulting state.',
    }),

    // CONSTITUTIONALLY REQUIRED: transition_vector records the causal trigger (D3 RF-A1)
    transition_vector: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "ChangeRecord must include: transition_vector"; D3 RF-A1 (every reality assertion must record its basis)',
      description: 'Constitutional trigger/cause of this stage transition. Describes WHY the transition occurred (e.g. "observation-confirmed", "source-dispute", "validation-passed"). Maps to trigger parameter in advanceClaim().',
    }),

    timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "ChangeRecord must include: timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this stage transition was recorded in the Reality Fabric',
    }),

    actor_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "ChangeRecord must include: actor_ref"; D3 RF-A1; A0-v1.1.1 §3.6 (provenance tracing)',
      description: 'Identity of the actor or system component that initiated this transition. Constitutional provenance anchor. Maps to actor parameter in advanceClaim().',
    }),

    historical_anchor_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "ChangeRecord must include: historical_anchor_ref"',
      description: 'Reference to the HistoricalAnchor.anchor_id for this claim. Links the ChangeRecord to the claim\'s running history anchor.',
    }),

  }),

  validate(data) {
    return _validate('ChangeRecord', ChangeRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ChangeRecord', ChangeRecord.SCHEMA, ChangeRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT05 — HistoricalAnchor
// Constitutional basis: I1-SEQUENCING §W1-04; A0-v1.1.1 §3.6 (RT-05 maintains
// version history; Responsibility 7 — object lifecycle); D3 RF-A8 (Historical
// Inalienability); R5-v1.0 RS-07
//
// HistoricalAnchor is the per-claim summary anchor: a single record tracking
// the current history state of a claim in the Reality Fabric. Required by
// W2-03 (getChangeHistory() method) and W2-04 (Gate 6 fabric query).
// One HistoricalAnchor per claim — updated on every ChangeRecord creation.
// ─────────────────────────────────────────────────────────────────────────────

const HistoricalAnchor = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'HistoricalAnchor',
    runtime_id:       'RT-05',
    runtime_name:     'Reality Fabric Runtime',
    authority:        'I1-SEQUENCING §W1-04; A0-v1.1.1 §3.6 (Responsibility 7 — lifecycle management; version history); D3 RF-A8 (Historical Inalienability); R5-v1.0 RS-07',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-04',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // HistoricalAnchor is updated as new ChangeRecords are produced (not immutable)
    structural_immutable: false,
    invariants: ['RT05-INV-2'],
    constitutional_note: 'Per-claim history anchor (one per claim/URO). Provides O(1) access to the latest ChangeRecord for a claim. Updated atomically when a ChangeRecord is created. NEVER DELETED (D3 RF-A8; RT05-INV-2). Consumed by W2-03 getChangeHistory() and W2-04 Gate 6 fabric query (NOT RT-07 gateway — C0-MANIFEST §5.2 item 9).',
  }),

  SCHEMA: Object.freeze({

    anchor_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "HistoricalAnchor must include: anchor_id"',
      description: 'Unique constitutional identifier for this HistoricalAnchor',
    }),

    claim_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "HistoricalAnchor must include: claim_ref"; A0-v1.1.1 §3.6',
      description: 'Reference to the claim/URO this anchor belongs to (maps to reality_claims.id). One HistoricalAnchor per claim.',
    }),

    latest_change_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "HistoricalAnchor must include: latest_change_id"',
      description: 'ChangeRecord.change_id of the most recent stage transition for this claim. Updated on every new ChangeRecord creation.',
    }),

    first_seen_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "HistoricalAnchor must include: first_seen_at"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this claim first entered the Reality Fabric (creation event). Immutable after establishment.',
    }),

    last_modified_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-04 "HistoricalAnchor must include: last_modified_at"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp of the most recent stage transition. Updated on every ChangeRecord creation.',
    }),

  }),

  validate(data) {
    return _validate('HistoricalAnchor', HistoricalAnchor.SCHEMA, data);
  },

  create(data) {
    return _create('HistoricalAnchor', HistoricalAnchor.SCHEMA, HistoricalAnchor.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT05 — FabricFoundingRoot
// Constitutional basis: A0-v1.1.1 §3.6 Owned Constitutional Objects
// ("FabricFoundingRoot"); D3 RF-A11 (Founding Root — singular per era, never
// modified after establishment); D3 RF-A12 (all active objects reachable from
// Founding Root); RT05-INV-3; RT05-INV-7
//
// The constitutional root of the Reality Fabric for a given era. Established
// once at era initialization (RT05-LC-02); never modified (RT05-INV-7).
// Every active URO in the fabric must be reachable from this root (RF-A12).
// ─────────────────────────────────────────────────────────────────────────────

const FabricFoundingRoot = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'FabricFoundingRoot',
    runtime_id:       'RT-05',
    runtime_name:     'Reality Fabric Runtime',
    authority:        'A0-v1.1.1 §3.6 Owned Constitutional Objects; D3 RF-A11 (Founding Root singular per era); D3 RF-A12 (reachability invariant); RT05-INV-3; RT05-INV-7; R5-v1.0 RS-07',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-04',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: RT05-INV-7 — Founding Root is NEVER modified after establishment
    structural_immutable: true,
    invariants: ['RT05-INV-3', 'RT05-INV-7'],
    constitutional_note: 'THE CONSTITUTIONAL ORIGIN OF THE REALITY FABRIC (D3 RF-A11). Singular per constitutional era (RT05-INV-7). IMMUTABLE after establishment — any modification is a constitutional violation. RT05-INV-3: every active URO must be reachable from this root via the Reality Fabric Graph (D3 RF-A12). Established at era initialization (RT05-LC-02). A new FabricFoundingRoot is created for each new constitutional era; the prior root is archived, never deleted.',
  }),

  SCHEMA: Object.freeze({

    founding_root_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.6 "FabricFoundingRoot"; D3 RF-A11 (Founding Root)',
      description: 'Unique constitutional identifier for this FabricFoundingRoot record',
    }),

    era_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.6; D3 RF-A11 "singular per era"; D0 §Domain II CivilizationalEra',
      description: 'Constitutional era identifier this Founding Root belongs to. Exactly one FabricFoundingRoot per era (RT05-INV-7).',
    }),

    established_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.6; D2 Layer 6 (Temporal Layer); D3 RF-A11',
      description: 'ISO 8601 timestamp of Reality Fabric initialization for this era. Immutable after establishment.',
    }),

    // CONSTITUTIONALLY REQUIRED: founding authority traceability per D3 GCR-2 and D3 GI-5
    constitutional_authority_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D3 RF-A11 (Founding Root derives from FoundingRatification); D3 GCR-2 (authority chain completeness); D3 GI-5 (single authority root)',
      description: 'Reference to the FoundingRatification or constitutional authority that establishes this Founding Root. Required for authority chain completeness (D3 GCR-2; D3 GI-5).',
    }),

    // Initial fabric state descriptor — what the fabric contained at founding
    fabric_state_at_founding: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.6 (State Responsibilities: "Founding Root record"); R5-v1.0 RS-07',
      description: 'Descriptor of the initial Reality Fabric state at the moment of this Founding Root establishment (e.g., "EMPTY", "ERA-SEED-OBJECTS-ADMITTED").',
    }),

  }),

  validate(data) {
    return _validate('FabricFoundingRoot', FabricFoundingRoot.SCHEMA, data);
  },

  create(data) {
    return _create('FabricFoundingRoot', FabricFoundingRoot.SCHEMA, FabricFoundingRoot.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT05 — ObjectLifecycleRecord
// Constitutional basis: A0-v1.1.1 §3.6 Owned Constitutional Objects
// ("ObjectLifecycleRecord"); R5-v1.0-canonical.md RS-07 RT05-OWN-08;
// D3 RF-A8 (Historical Inalienability); RT05-INV-2; D8 Phase 2
//
// A chronological record of all lifecycle state transitions for a URO:
// Pending → Active → Modified → Superseded → Archived, with timestamps,
// authorizing operation references, and constitutional basis for each
// transition (R5-v1.0 RS-07 RT05-OWN-08).
// Created at URO creation; extended at every lifecycle state transition;
// closed at Archived state; never deleted (RT05-INV-2).
// ─────────────────────────────────────────────────────────────────────────────

const ObjectLifecycleRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ObjectLifecycleRecord',
    runtime_id:       'RT-05',
    runtime_name:     'Reality Fabric Runtime',
    authority:        'A0-v1.1.1 §3.6 Owned Constitutional Objects; R5-v1.0-canonical.md RS-07 RT05-OWN-08; D3 RF-A8 (Historical Inalienability); D8 Phase 2; RT05-INV-2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-04',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: RT05-INV-2 (no deletion); D3 RF-A8
    deletion_policy:      'PROHIBITED',
    // Extended at every transition (not structurally immutable), but never deleted
    structural_immutable: false,
    invariants: ['RT05-INV-2'],
    constitutional_note: 'CHRONOLOGICAL LIFECYCLE RECORD (R5-v1.0 RS-07 RT05-OWN-08). Created at URO creation; extended at every lifecycle state transition; closed at Archived state; NEVER DELETED (D3 RF-A8; RT05-INV-2). A0-v1.1.1 §3.6 lifecycle: Active → Suspended → Historical → Superseded → Archived. Records every state transition with timestamp, authorizing RT-03 operation reference, and constitutional basis. RT-04 has read access for audit (R5-v1.0 RS-23).',
  }),

  SCHEMA: Object.freeze({

    lifecycle_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R5-v1.0-canonical.md RS-07 RT05-OWN-08 "Object Lifecycle Record"; A0-v1.1.1 §3.6',
      description: 'Unique constitutional identifier for this ObjectLifecycleRecord',
    }),

    uro_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R5-v1.0 RS-07 RT05-OWN-08 "chronological record of all lifecycle state transitions for a URO"; A0-v1.1.1 §3.6',
      description: 'Reference to the URO (Universal Reality Object) this lifecycle record belongs to',
    }),

    // CONSTITUTIONALLY REQUIRED: lifecycle states per A0-v1.1.1 §3.6 and R5 RS-07
    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['PENDING', 'ACTIVE', 'MODIFIED', 'SUPERSEDED', 'ARCHIVED'],
      constitutional_source: 'R5-v1.0 RS-07 RT05-OWN-08 "Pending → Active → Modified → Superseded → Archived"; A0-v1.1.1 §3.6 lifecycle states',
      description: 'Current lifecycle state of the URO. Terminal state: ARCHIVED. ARCHIVED is immutable — no further transitions. Never DELETED (RT05-INV-2; D3 RF-A8).',
    }),

    created_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R5-v1.0 RS-07 RT05-OWN-08 "Created at URO creation"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when the associated URO was created (lifecycle record opened). Immutable.',
    }),

    last_transition_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R5-v1.0 RS-07 RT05-OWN-08 "timestamps... for each transition"; D2 Layer 6',
      description: 'ISO 8601 timestamp of the most recent lifecycle state transition',
    }),

    // CONSTITUTIONALLY REQUIRED: RT-03 authorization tracing per D3 (all fabric admissions require Kernel authorization)
    authorizing_operation_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R5-v1.0 RS-07 RT05-OWN-08 "authorizing operation references"; A0-v1.1.1 §3.6 Responsibility 6; RT05-INV-1 (no object enters fabric without RT-03 authorization)',
      description: 'Reference to the RT-03 Kernel operation (AtomicCommitAuthorization) that authorized the current lifecycle state. RT05-INV-1: no lifecycle transition without Kernel authorization.',
    }),

    constitutional_basis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R5-v1.0 RS-07 RT05-OWN-08 "constitutional basis for each transition"; D3 GCR-2 (provenance completeness)',
      description: 'Constitutional basis for the current lifecycle state and transition. Documents the specific D3, D4, or RT05-OBL authority for this transition.',
    }),

    transition_count: Object.freeze({
      required: true, type: 'number',
      constitutional_source: 'R5-v1.0 RS-07 RT05-OWN-08 "chronological record of all lifecycle state transitions"',
      description: 'Total number of lifecycle state transitions recorded. 0 on initial creation. Monotonically increasing.',
    }),

  }),

  validate(data) {
    return _validate('ObjectLifecycleRecord', ObjectLifecycleRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ObjectLifecycleRecord', ObjectLifecycleRecord.SCHEMA, ObjectLifecycleRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  ChangeRecord,
  HistoricalAnchor,
  FabricFoundingRoot,
  ObjectLifecycleRecord,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-05',
  WAVE:        'W1-04',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
  // Export stage constants for use by W2-03 implementation
  FABRIC_STAGES,
});
Object.freeze(module.exports);
