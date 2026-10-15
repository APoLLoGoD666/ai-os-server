'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/identity-record.js
// Task: W1-02 — RT-01 Identity Type Definitions (Reference Implementation)
// Runtime: RT-01 — Identity and Actor Registration Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-25
// Authority: R1-v1.1-canonical.md RS-07; I1-IMPLEMENTATION-SEQUENCING.md §W1-02
//            A0-v1.1.1 §3.1; D8 §4.1; D-2 §IX; D2 URO; D1 §Domain II
//
// ─── REFERENCE IMPLEMENTATION NOTICE ────────────────────────────────────────
// This file is the CANONICAL PATTERN for all Wave 1 constitutional type files.
// W1-03 through W1-15 MUST follow this structure exactly:
//   CONSTITUTIONAL block (frozen) — ownership and constitutional properties
//   SCHEMA block (frozen)         — field descriptors with constitutional_source
//   validate(data)                — returns {valid: boolean, errors: string[]}
//   create(data)                  — returns validated plain object with type stamps
//   module.exports                — named types + TYPES map + RUNTIME_ID/WAVE/BASELINE
// See W1-02-CONSTITUTIONAL-TYPE-REFERENCE-IMPLEMENTATION-RECORD.md for full standard.
// ─────────────────────────────────────────────────────────────────────────────
//
// CANONICAL TYPE STANDARD DISTINCTION:
//
// CONSTITUTIONALLY REQUIRED (derives from D-series/A-series/R-series authority):
//   - Type names per D8 §4.1 and R1-v1.1 RS-07 ownership assignments
//   - runtime_id per A0 §3.1 and R1-v1.1 RS-01
//   - Authority citation chain per R0 ADR-1–ADR-4
//   - Status enums per R1-v1.1 RS-10 lifecycle state definitions
//   - deletion_policy PROHIBITED per D8 PROH-4 (all RT-01 types)
//   - structural_immutable per D-2 §IX and D1 §Domain II StructuralAnchor
//   - Field constitutional_source per D8 TI-1 (Translation Completeness)
//
// ENGINEERING CONVENTION (required by constitutional effect, not named in constitution):
//   - CONSTITUTIONAL / SCHEMA block names
//   - validate() / create() function names and signatures
//   - __type / __runtime / __baseline / __version stamp fields
//   - Object.freeze application to type descriptors
//   - ALL_CAPS_UNDERSCORE enum format (translates constitutional prose state names)
//   - _validate / _create private utility functions
// ─────────────────────────────────────────────────────────────────────────────


// ─── W1-02A · Shared Private Utilities (DEF-001) ─────────────────────────────
// Moved to _utils.js by W1-02A remediation. Implementation unchanged.
const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT01-OWN-01: ActorProfile
// Constitutional basis: R1-v1.1 RS-07 RT01-OWN-01; D8 §4.1 Canonical Object
// Type 1; D0 §Domain II (Actor); D1 §Domain II (Entity); D4 §4.1 lifecycle
// ─────────────────────────────────────────────────────────────────────────────

const ActorProfile = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ActorProfile',
    runtime_id:       'RT-01',
    runtime_name:     'Identity and Actor Registration Runtime',
    authority:        'R1-v1.1 RS-07 RT01-OWN-01; D8 §4.1 Canonical Object Type 1; D0 §Domain II; A0-v1.1.1 §3.1',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-02',
    version:          '1.0.0',
    d8_canonical_type: 1,
    // CONSTITUTIONALLY REQUIRED: D8 PROH-4 absolute prohibition on deletion
    deletion_policy:      'PROHIBITED',
    // ActorProfile itself is mutable (semantic layer changes, status transitions).
    // Immutability applies to the StructuralIdentityRecord component (RT01-OWN-03).
    structural_immutable: false,
    // Invariants governing this type per R1-v1.1 RS-12
    invariants: ['RT01-INV-1', 'RT01-INV-3'],
    // CONSTITUTIONALLY REQUIRED note: D8 INV-3 (Authority Separation)
    constitutional_note: 'May not directly hold authority assignments. Authority bindings are held in RT-02 DelegationRecords that REFERENCE this ActorProfile. Cross-runtime mutation prohibited (A1 CC-1).',
  }),

  SCHEMA: Object.freeze({

    // ── Required fields (I1-SEQUENCING.md §W1-02) ────────────────────────────

    actor_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R1-v1.1 RS-07 RT01-OWN-01; D8 §4.1 Canonical Object Type 1',
      description: 'Unique constitutional identifier for this actor',
    }),

    actor_type: Object.freeze({
      required: true, type: 'string',
      // CONSTITUTIONALLY REQUIRED: D0 §Domain II establishes Actor and Agent as
      // distinct constitutional categories. HUMAN maps to Actor; AGENT maps to Agent.
      enum: ['HUMAN', 'AGENT'],
      constitutional_source: 'D0 §Domain II (Actor category, Agent category)',
      description: 'Constitutional actor category per D0 Domain II ontology',
    }),

    display_name: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R1-v1.1 RS-10.1; D1 §Domain II Entity',
      description: 'Human-readable constitutional actor designation',
    }),

    registered_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R1-v1.1 RS-10.1; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp of constitutional registration',
    }),

    // CONSTITUTIONALLY REQUIRED: status enum from R1-v1.1 RS-10.1 lifecycle states.
    // The four states derive from D4 §4.1 (10-Stage Kernel Lifecycle) and D-2 §IX.
    status: Object.freeze({
      required: true, type: 'string',
      enum: ['CANDIDATE', 'ACTIVE', 'SUSPENDED', 'TERMINATED'],
      constitutional_source: 'R1-v1.1 RS-10.1 Lifecycle States; D4 §4.1; D-2 §IX',
      description: 'Constitutional identity state. CANDIDATE: registration submitted, not yet admitted by RT-03. ACTIVE: constitutionally present, may initiate Class A operations. SUSPENDED: constitutionally present but cannot initiate new Class A operations (Suspension Notice applied). TERMINATED: constitutional existence ended — absolute terminal state, no recovery except RT-16 amendment.',
    }),

    // ── Optional D2 constitutional layer fields — Wave 2 required ────────────

    structural_identity_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'D2 Layer 1 (Identity Layer); R1-v1.1 RS-10.1; D1 §Domain II StructuralAnchor',
      description: '[Wave 2 required] Reference to StructuralIdentityRecord.record_id. Required for D2 Layer 1 compliance.',
    }),

    provenance_chain_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'D2 Layer 3 (Provenance Layer); A1 §9.2 PA-1; D8 INV-2',
      description: '[Wave 2 required] Provenance chain identifier. Format: RT01-AP-{structural_hash}:{era}:{operation_id} per A1 §9.2 PA-1.',
    }),

    constitutional_era: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'D2 Layer 1; D0 §Domain II CivilizationalEra; D1 §Domain II StructuralAnchor',
      description: '[Wave 2 required] Civilizational era designation at time of instantiation. Immutable after establishment.',
    }),

  }),

  validate(data) {
    return _validate('ActorProfile', ActorProfile.SCHEMA, data);
  },

  create(data) {
    return _create('ActorProfile', ActorProfile.SCHEMA, ActorProfile.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT01-OWN-02: ExternalReference
// Constitutional basis: R1-v1.1 RS-07 RT01-OWN-02; D8 §4.1 Canonical Object
// Type 2; D0 §Domain II (ExternalActor); D1 §Domain II ExternalActor
// ─────────────────────────────────────────────────────────────────────────────

const ExternalReference = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ExternalReference',
    runtime_id:       'RT-01',
    runtime_name:     'Identity and Actor Registration Runtime',
    authority:        'R1-v1.1 RS-07 RT01-OWN-02; D8 §4.1 Canonical Object Type 2; D0 §Domain II ExternalActor; D5 Part 3',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-02',
    version:          '1.0.0',
    d8_canonical_type: 2,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: [],
    // CONSTITUTIONALLY REQUIRED: categorical distinction from ActorProfile
    constitutional_note: 'Categorically distinct from ActorProfile (R1-v1.1 RS-10.2). Does NOT grant constitutional actor standing. Cannot hold authority records of any kind. Created only via RT-08 OPL Stage 3 external identity claim admitted by RT-03 (A1 PAIR 10).',
  }),

  SCHEMA: Object.freeze({

    source_system: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D0 §Domain II ExternalActor',
      description: 'Identifier of the external system that is the source of this reference',
    }),

    source_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D0 §Domain II ExternalActor',
      description: 'Identifier of this external entity within source_system',
    }),

    resolved_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this external reference was constitutionally resolved',
    }),

    // CONSTITUTIONALLY REQUIRED: lifecycle states from R1-v1.1 RS-10.2.
    // Optional in Wave 1 (type definition only); Wave 2 ExternalReference creation
    // must supply status.
    status: Object.freeze({
      required: false, type: 'string',
      enum: ['REGISTERED', 'ACTIVE', 'SUPERSEDED', 'CLOSED'],
      constitutional_source: 'R1-v1.1 RS-10.2 Lifecycle States',
      description: '[Wave 2 required] Constitutional reference status. REGISTERED: processing in progress. ACTIVE: current, usable for attribution. SUPERSEDED: replaced by more accurate reference (prior preserved for provenance). CLOSED: external entity ceased or inaccessible (preserved for historical integrity).',
    }),

    reference_id: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R1-v1.1 RS-07 RT01-OWN-02; D8 §4.1',
      description: '[Wave 2 required] Constitutional identifier for this ExternalReference record',
    }),

    registration_operation_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'D2 Layer 3 (Provenance Layer); A1 PAIR 10; R1-v1.1 RS-12 RT01-PROC-02',
      description: '[Wave 2 required] RT-03 operation ID that admitted this ExternalReference. Required for D2 Layer 3 provenance compliance.',
    }),

  }),

  validate(data) {
    return _validate('ExternalReference', ExternalReference.SCHEMA, data);
  },

  create(data) {
    return _create('ExternalReference', ExternalReference.SCHEMA, ExternalReference.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT01-OWN-03: StructuralIdentityRecord
// Constitutional basis: R1-v1.1 RS-07 RT01-OWN-03; D1 §Domain II
// StructuralAnchor; D-2 §IX (Three-Layer Identity Model — structural layer)
// ─────────────────────────────────────────────────────────────────────────────

const StructuralIdentityRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'StructuralIdentityRecord',
    runtime_id:       'RT-01',
    runtime_name:     'Identity and Actor Registration Runtime',
    authority:        'R1-v1.1 RS-07 RT01-OWN-03; R1-v1.1 RS-10.3; D1 §Domain II StructuralAnchor; D-2 §IX; D8 §4.1',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-02',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: immutability is mandated by D-2 §IX and
    // D1 §Domain II StructuralAnchor (PersistenceInvariant). R1-v1.1 RS-10.3:
    // "Any purported modification is constitutionally void."
    structural_immutable: true,
    invariants: ['RT01-INV-3'],
    constitutional_note: 'CONSTITUTIONALLY IMMUTABLE (D-2 §IX; D1 §Domain II StructuralAnchor; R1-v1.1 RS-10.3). Once established, any modification is void and constitutes a constitutional violation recorded by RT01-PROC-05 and reported to RT-04. RT-04 must be able to verify structure_hash at every point in time across all history.',
  }),

  SCHEMA: Object.freeze({

    record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-10.3',
      description: 'Unique constitutional identifier for this structural identity record',
    }),

    actor_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-07 RT01-OWN-03',
      description: 'Actor this structural record belongs to (references ActorProfile.actor_id)',
    }),

    // CONSTITUTIONALLY REQUIRED: structure_hash is the immutable constitutional
    // fingerprint per R1-v1.1 RS-07 RT01-OWN-03 and RS-10.3.
    structure_hash: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R1-v1.1 RS-07 RT01-OWN-03 "structural identity hash serving as the constitutional fingerprint"; R1-v1.1 RS-10.3',
      description: 'Immutable constitutional fingerprint of this actor. RT-04 verifies this value is unchanged at every point in history. Modification of this field is a constitutional violation.',
    }),

    created_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp of structural identity establishment. Immutable.',
    }),

    // D1 §Domain II StructuralAnchor required properties (Wave 2 required)
    constitutional_era: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R1-v1.1 RS-10.3; D2 Layer 1; D1 §Domain II StructuralAnchor CivilizationalEra [1..1, immutable]',
      description: '[Wave 2 required] Civilizational era of instantiation. Immutable. D2 Layer 1 OriginalContext.CivilizationalEra.',
    }),

    founding_authority_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R1-v1.1 RS-10.3 "founding authority that authorized creation"; D2 Layer 3 (Provenance Layer)',
      description: '[Wave 2 required] Reference to the authority that authorized creation of this structural identity.',
    }),

  }),

  validate(data) {
    return _validate('StructuralIdentityRecord', StructuralIdentityRecord.SCHEMA, data);
  },

  create(data) {
    return _create('StructuralIdentityRecord', StructuralIdentityRecord.SCHEMA, StructuralIdentityRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT01-OWN-04: SemanticIdentityRecord
// Constitutional basis: R1-v1.1 RS-07 RT01-OWN-04; D1 §Domain II
// SemanticProfile; D-2 §IX (Three-Layer Identity Model — semantic layer)
// ─────────────────────────────────────────────────────────────────────────────

const SemanticIdentityRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'SemanticIdentityRecord',
    runtime_id:       'RT-01',
    runtime_name:     'Identity and Actor Registration Runtime',
    authority:        'R1-v1.1 RS-07 RT01-OWN-04; R1-v1.1 RS-10.4; D1 §Domain II SemanticProfile; D-2 §IX; D8 §4.1',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-02',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'MUTABLE with mandatory history preservation. Every mutation creates a new SemanticIdentityRecord version; the superseded version must be preserved in Historical ActorProfile Archive (RT01-STATE-03). Mutation authority: Class A operation via RT-03 with appropriate actor authorization at Gate 3. No version is ever deleted.',
  }),

  SCHEMA: Object.freeze({

    record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-10.4',
      description: 'Unique identifier for this semantic identity record version',
    }),

    actor_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-07 RT01-OWN-04',
      description: 'Actor this semantic record belongs to (references ActorProfile.actor_id)',
    }),

    semantic_descriptor: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D1 §Domain II SemanticProfile; D-2 §IX',
      description: 'Constitutional semantic characterization of this actor: role, constitutional standing, descriptions',
    }),

    domain_refs: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'I1-SEQUENCING §W1-02; D6 §2 (Twelve Domain Architecture)',
      description: 'Array of domain identifiers this actor is constitutionally affiliated with',
    }),

    // History tracking — D2 Layer 2 (Semantic Layer) and Layer 3 (Provenance Layer)
    version: Object.freeze({
      required: false, type: 'number',
      constitutional_source: 'R1-v1.1 RS-10.4; D2 Layer 2 (Semantic Layer) — version tracking',
      description: '[Wave 2 required] Monotonically increasing version number for this semantic record.',
    }),

    supersedes_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R1-v1.1 RS-10.4; D2 Layer 3 (Provenance Layer)',
      description: '[Wave 2] record_id of the SemanticIdentityRecord this version supersedes. Null for initial version.',
    }),

  }),

  validate(data) {
    return _validate('SemanticIdentityRecord', SemanticIdentityRecord.SCHEMA, data);
  },

  create(data) {
    return _create('SemanticIdentityRecord', SemanticIdentityRecord.SCHEMA, SemanticIdentityRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT01-OWN-05: ReferentialIdentityRecord
// Constitutional basis: R1-v1.1 RS-07 RT01-OWN-05; D1 §Domain II
// ReferentialLink; D-2 §IX (Three-Layer Identity Model — referential layer)
// ─────────────────────────────────────────────────────────────────────────────

const ReferentialIdentityRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ReferentialIdentityRecord',
    runtime_id:       'RT-01',
    runtime_name:     'Identity and Actor Registration Runtime',
    authority:        'R1-v1.1 RS-07 RT01-OWN-05; R1-v1.1 RS-10.5; D1 §Domain II ReferentialLink; D-2 §IX; D8 §4.1',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-02',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: [],
    // CONSTITUTIONALLY REQUIRED: fragility classification per D-2 §IX and
    // D1 §Domain II ReferentialLink. RT-01 must actively monitor referential
    // stability (RT01-PROC-06). Degradation does NOT invalidate actor identity.
    constitutional_note: 'FRAGILE classification (D-2 §IX; D1 §Domain II ReferentialLink; R1-v1.1 RS-10.5). RT-01 must monitor referential stability and record fragility events. CRITICAL: degradation of referential link does NOT invalidate actor constitutional identity — StructuralAnchor remains the authoritative identity anchor regardless of referential degradation.',
  }),

  SCHEMA: Object.freeze({

    record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-10.5',
      description: 'Unique constitutional identifier for this referential identity record',
    }),

    actor_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-07 RT01-OWN-05',
      description: 'Actor this referential record belongs to (references ActorProfile.actor_id)',
    }),

    attestation_source: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D1 §Domain II ReferentialLink',
      description: 'External system or authority that provides the attestation',
    }),

    attestation_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D1 §Domain II ReferentialLink',
      description: 'Identifier of this actor within the attestation_source system',
    }),

    // CONSTITUTIONALLY REQUIRED: fragility status monitoring per D-2 §IX
    // Optional in Wave 1; RT01-PROC-06 in Wave 2 populates and maintains this.
    fragility_status: Object.freeze({
      required: false, type: 'string',
      enum: ['STABLE', 'DEGRADED', 'UNAVAILABLE'],
      constitutional_source: 'R1-v1.1 RS-10.5; R1-v1.1 RS-12 RT01-PROC-06; D-2 §IX; D1 §Domain II ReferentialLink (fragility)',
      description: '[Wave 2 required] Current fragility status of this referential link. DEGRADED or UNAVAILABLE does not invalidate actor identity.',
    }),

  }),

  validate(data) {
    return _validate('ReferentialIdentityRecord', ReferentialIdentityRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ReferentialIdentityRecord', ReferentialIdentityRecord.SCHEMA, ReferentialIdentityRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT01-OWN-06: IdentityConflictRecord
// Constitutional basis: R1-v1.1 RS-07 RT01-OWN-06; R1-v1.1 RS-10.6;
// D3 RF-A9 (Rejection with Grounds); A1 §2.3 CC-1; A0 §3.2 Responsibility 5
// ─────────────────────────────────────────────────────────────────────────────

const IdentityConflictRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'IdentityConflictRecord',
    runtime_id:       'RT-01',
    runtime_name:     'Identity and Actor Registration Runtime',
    authority:        'R1-v1.1 RS-07 RT01-OWN-06; R1-v1.1 RS-10.6; D3 RF-A9; A1 §2.3 CC-1; D8 §4.1',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-02',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: permanent across ALL states per R1-v1.1 RS-10.6
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'PERMANENT in all states (R1-v1.1 RS-10.6). Resolution does NOT authorize deletion. Produced IMMEDIATELY upon detection (RT01-OBL-06). Simultaneously reported to RT-03 (Gate 1 may reject the conflicted operation) and RT-04 (audit). Production failure violates D3 RF-A9.',
  }),

  SCHEMA: Object.freeze({

    conflict_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-07 RT01-OWN-06',
      description: 'Unique constitutional identifier for this identity conflict record',
    }),

    actor_a_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-10.6',
      description: 'First actor reference in the identity conflict',
    }),

    actor_b_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-10.6',
      description: 'Second actor reference in the identity conflict',
    }),

    // CONSTITUTIONALLY REQUIRED: conflict type from RT01-PROC-05 enumeration
    // (R1-v1.1 RS-12). Values translated to ALL_CAPS from prose descriptions.
    conflict_type: Object.freeze({
      required: true, type: 'string',
      enum: ['DUPLICATE_STRUCTURAL', 'IRRECONCILABLE_EXTERNAL', 'STATE_MISMATCH', 'ARCHIVE_REGISTRY_DIVERGENCE'],
      constitutional_source: 'R1-v1.1 RS-12 RT01-PROC-05 Conflict Types',
      description: 'Constitutional conflict category. DUPLICATE_STRUCTURAL: two registrations with same structural hash. IRRECONCILABLE_EXTERNAL: two ExternalReferences for same entity with contradictory properties. STATE_MISMATCH: actor state contradicts expected state (e.g. suspended actor presented as Active). ARCHIVE_REGISTRY_DIVERGENCE: conflicting identity state between live registry and Historical Archive.',
    }),

    detected_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this conflict was detected by RT01-PROC-05',
    }),

    // CONSTITUTIONALLY REQUIRED: status enum from R1-v1.1 RS-10.6
    status: Object.freeze({
      required: true, type: 'string',
      enum: ['DETECTED', 'REPORTED', 'UNDER_REVIEW', 'RESOLVED'],
      constitutional_source: 'R1-v1.1 RS-10.6 States: {Detected, Reported-to-RT03-RT04, Under-RT04-Review, Resolved}',
      description: 'Current constitutional state of this conflict record. RESOLVED does not authorize deletion.',
    }),

    resolution_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R1-v1.1 RS-10.6',
      description: '[Wave 2] Reference to resolution record when status is RESOLVED',
    }),

  }),

  validate(data) {
    return _validate('IdentityConflictRecord', IdentityConflictRecord.SCHEMA, data);
  },

  create(data) {
    return _create('IdentityConflictRecord', IdentityConflictRecord.SCHEMA, IdentityConflictRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT01-OWN-07: IdentityEndRecord
// Constitutional basis: R1-v1.1 RS-07 RT01-OWN-07; D-2 §IX (Entity-End as
// First-Class Constitutional State); D8 PROH-4; D8 INV-2
// ─────────────────────────────────────────────────────────────────────────────

const IdentityEndRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'IdentityEndRecord',
    runtime_id:       'RT-01',
    runtime_name:     'Identity and Actor Registration Runtime',
    authority:        'R1-v1.1 RS-07 RT01-OWN-07; R1-v1.1 RS-10.7; D-2 §IX; D8 PROH-4; D8 INV-2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-02',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: D-2 §IX Entity-End as First-Class Constitutional State
    // and D8 PROH-4. Once created, immutable and permanent.
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: [],
    constitutional_note: 'FIRST-CLASS CONSTITUTIONAL ASSERTION (D-2 §IX). This is a positive fact about the constitutional state of the civilization — not an absence, not a deletion. CONSTITUTIONALLY PERMANENT AND IMMUTABLE. Delivered on creation to RT-04 (audit, RT01-OUT-10) and RT-07 (historical archive, RT01-OUT-10 via PAIR 09). Cannot be modified or deleted under any condition.',
  }),

  SCHEMA: Object.freeze({

    end_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-07 RT01-OWN-07',
      description: 'Unique constitutional identifier for this identity end record',
    }),

    actor_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-10.7',
      description: 'Actor whose constitutional existence has ended. References ActorProfile.actor_id.',
    }),

    reason: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; R1-v1.1 RS-10.7; D-2 §IX "constitutional basis"',
      description: 'Constitutional basis for termination',
    }),

    ended_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D2 Layer 6 (Temporal Layer); R1-v1.1 RS-10.7',
      description: 'ISO 8601 timestamp of constitutional termination',
    }),

    authorized_by: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-02; D4 §4.1 (authorized Class A operation Stages 8+9); R1-v1.1 RS-12 RT01-PROC-04',
      description: 'Constitutional identifier of the actor or RT-03 operation that authorized the termination',
    }),

    // CONSTITUTIONALLY REQUIRED minimum content per R1-v1.1 RS-07 RT01-OWN-07
    structural_identity_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R1-v1.1 RS-07 RT01-OWN-07 "Actor\'s structural identity hash"; R1-v1.1 RS-10.7',
      description: '[Wave 2 required] Actor\'s structural identity hash at time of termination. Constitutional fingerprint of the terminated actor.',
    }),

    authorizing_operation_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R1-v1.1 RS-12 RT01-PROC-04; D4 §4.1 Stages 8+9',
      description: '[Wave 2 required] RT-03 operation ID (Stages 8+9 atomic commit) that admitted the termination Class A operation.',
    }),

    final_semantic_version_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R1-v1.1 RS-07 RT01-OWN-07 "final SemanticIdentityRecord version"; D2 Layer 2 (Semantic Layer)',
      description: '[Wave 2] record_id of the final SemanticIdentityRecord at time of termination.',
    }),

  }),

  validate(data) {
    return _validate('IdentityEndRecord', IdentityEndRecord.SCHEMA, data);
  },

  create(data) {
    return _create('IdentityEndRecord', IdentityEndRecord.SCHEMA, IdentityEndRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  ActorProfile,
  ExternalReference,
  StructuralIdentityRecord,
  SemanticIdentityRecord,
  ReferentialIdentityRecord,
  IdentityConflictRecord,
  IdentityEndRecord,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-01',
  WAVE:        'W1-02',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
