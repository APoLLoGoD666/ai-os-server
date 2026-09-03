'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/authority-certificate.js
// Task: W1-03 — RT-02 Authority Type Definitions
// Runtime: RT-02 — Authority Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-25
// Authority: R2-v1.0-canonical.md RS-07; I1-IMPLEMENTATION-SEQUENCING.md §W1-03
//            A0-v1.1.1 §3.2; D6 §4.2–4.7; D-2 §VIII; D3 GCR-2; D3 GI-5
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT02-OWN-01: DelegationRecord
// Constitutional basis: R2-v1.0 RS-07 RT02-OWN-01; D-2 §X; D3 GCR-2;
// D4 §4.3; D8 IOR-3; A0-v1.1.1 §3.2
// ─────────────────────────────────────────────────────────────────────────────

const DelegationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DelegationRecord',
    runtime_id:       'RT-02',
    runtime_name:     'Authority Runtime',
    authority:        'R2-v1.0 RS-07 RT02-OWN-01; D-2 §X (explicit authority); D3 GCR-2 (authority chain completeness); D4 §4.3 (Gate 3 conditions); D8 IOR-3; A0-v1.1.1 §3.2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-03',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Immutable after creation per RT02-OBL-01; state transitions record constitutional events
    structural_immutable: true,
    invariants: ['RT02-INV-1', 'RT02-INV-2', 'RT02-INV-4', 'RT02-INV-6'],
    constitutional_note: 'APPEND-ONLY REGISTRY (RT02-OBL-01). No DelegationRecord may be modified after creation. No DelegationRecord may be deleted. State transitions: Draft → Active → Superseded | Revoked. Terminal states are permanent. Every active record must have a complete chain traceable to the current era FoundingRatification (D3 GI-5; RT02-INV-6). Authority not recorded in a DelegationRecord does not exist constitutionally (D-2 §X P-GOV-4).',
  }),

  SCHEMA: Object.freeze({

    delegation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "DelegationRecord identifier"',
      description: 'Unique constitutional identifier for this DelegationRecord',
    }),

    delegating_actor: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "delegating actor identity (ActorProfile reference from RT-01)"',
      description: 'ActorProfile.actor_id of the actor granting authority. Accountability cannot be discharged by delegation (D-2 §X P-GOV-3).',
    }),

    recipient_actor: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "recipient actor identity (ActorProfile reference from RT-01)"',
      description: 'ActorProfile.actor_id of the actor receiving authority',
    }),

    // CONSTITUTIONALLY REQUIRED: five authority types per D6 Part 4.
    // Types are constitutionally distinct and non-interchangeable (RT02-OBL-08).
    authority_type: Object.freeze({
      required: true, type: 'string',
      enum: ['OBSERVATION', 'INTERPRETATION', 'DECISION', 'PROJECTION', 'AUDIT'],
      constitutional_source: 'D6 Part 4 §4.2–4.7 (five authority types); R2-v1.0 RS-07 RT02-OWN-01 "authority type"; RT02-OBL-08 (types must remain constitutionally distinct)',
      description: 'The constitutionally enumerated authority type being granted. Non-interchangeable in all RT-02 records (D6 AIR-1).',
    }),

    domain_scope: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "domain scope (specific domain or domains authorized)"; D6 §2 (Twelve Domain Architecture); D4 §4.3(d)',
      description: 'Constitutional domain(s) within which this authority grant is valid. Scope must be proportional to the operation scope (D-2 §X P-GOV-2).',
    }),

    operation_scope: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "operation scope (specific operation types authorized)"; D4 §4.3(d)',
      description: 'Specific operation types authorized. An actor authorized for local decisions does not automatically hold authority for global decisions (P-GOV-2).',
    }),

    valid_from: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "temporal scope (valid-from)"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp: beginning of temporal validity window',
    }),

    autonomy_band: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "autonomy band"; D4 §4.3(f)',
      description: 'Autonomy band constraint on this authority grant per D4 §4.3(f)',
    }),

    authorization_chain_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "authorization chain reference (parent DelegationRecord or FoundingRatification)"; D3 GCR-2; D3 GI-5',
      description: 'Reference to parent DelegationRecord.delegation_id or FoundingRatification. Chain must be complete and traceable to single authority root (D3 GI-5; RT02-INV-6).',
    }),

    // CONSTITUTIONALLY REQUIRED: state enum per RT02-OWN-01 state transitions.
    state: Object.freeze({
      required: true, type: 'string',
      enum: ['DRAFT', 'ACTIVE', 'SUPERSEDED', 'REVOKED'],
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "DelegationRecord state (Draft, Active, Superseded, Revoked)"',
      description: 'Current constitutional state. Terminal states (SUPERSEDED, REVOKED) are permanent; records are retained indefinitely (RT02-OBL-01; D8 PROH-4).',
    }),

    creation_provenance: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "creation provenance"; D2 Layer 3 (Provenance Layer); D3 GCR-2',
      description: 'Provenance record of creation: RT-03 operation ID or founding authority reference',
    }),

    // Optional fields — required at Wave 2 for full D4 §4.3 compliance
    valid_until: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01 "temporal scope (valid-until, or indefinite-until-revoked)"; D2 Layer 6',
      description: '[Wave 2] ISO 8601 timestamp of temporal bound. Null means indefinite-until-revoked.',
    }),

    revocation_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-01; RT02-OBL-05',
      description: '[Conditional] Reference to AuthorityRevocationRecord when state is REVOKED',
    }),

  }),

  validate(data) {
    return _validate('DelegationRecord', DelegationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('DelegationRecord', DelegationRecord.SCHEMA, DelegationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT02-OWN-02: AuthorityClaim
// Constitutional basis: R2-v1.0 RS-07 RT02-OWN-02; D4 §4.3(a);
// D6 Part 4; A0-v1.1.1 §3.2
// ─────────────────────────────────────────────────────────────────────────────

const AuthorityClaim = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AuthorityClaim',
    runtime_id:       'RT-02',
    runtime_name:     'Authority Runtime',
    authority:        'R2-v1.0 RS-07 RT02-OWN-02; D4 §4.3(a) (AuthorityClaim existence condition); D6 Part 4 (five authority types, domain-specific scope); A0-v1.1.1 §3.2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-03',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT02-INV-2', 'RT02-INV-3', 'RT02-INV-10'],
    constitutional_note: 'DERIVED RECORD — synthesized from the DelegationRecord registry (RT02-OBL-02). Valid if and only if backed by at least one Active, unrevoked DelegationRecord. Orphaned claims (no backing Active DelegationRecord) violate RT02-INV-2 and must be immediately placed in REVOKED state (RT02-INV-10). Provides O(1) conceptual lookup for Gate 3 authority validation (RT02-STATE-04).',
  }),

  SCHEMA: Object.freeze({

    claim_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-02 "AuthorityClaim identifier"',
      description: 'Unique constitutional identifier for this AuthorityClaim',
    }),

    actor_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-02 "actor identity (ActorProfile reference)"; D4 §4.3(a)',
      description: 'ActorProfile.actor_id of the actor holding this authority claim (references RT-01)',
    }),

    // CONSTITUTIONALLY REQUIRED: AIR-5 prohibition documented in enum description.
    authority_type: Object.freeze({
      required: true, type: 'string',
      enum: ['OBSERVATION', 'INTERPRETATION', 'DECISION', 'PROJECTION', 'AUDIT'],
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-02 "authority type"; D6 Part 4; RT02-INV-3 (AUDIT must not coexist with other types in same domain)',
      description: 'Authority type held by this actor. AUDIT authority cannot coexist with any other authority type for the same domain — this constitutes an AIR-5 violation and constitutional emergency (D6 AIR-5; RT02-INV-3).',
    }),

    domain_scope: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-02 "domain scope"; D6 §2 (Twelve Domain Architecture)',
      description: 'Constitutional domain within which this authority claim is valid',
    }),

    backing_delegation_refs: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-02 "backing DelegationRecord reference(s)"; RT02-INV-2 (no unrecorded authority); RT02-INV-10 (no orphaned claims)',
      description: 'Array of DelegationRecord.delegation_id values backing this claim. Must contain at least one Active reference (RT02-INV-10).',
    }),

    // CONSTITUTIONALLY REQUIRED: state enum per RT02-OWN-02 lifecycle.
    state: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'SUSPENDED', 'UNDER_AUTHORITY_REVIEW', 'REVOKED', 'EXPIRED'],
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-02 "AuthorityClaim state (Active, Suspended, UnderAuthorityReview, Revoked, Expired)"',
      description: 'Current state. Terminal: REVOKED, EXPIRED. SUSPENDED on RT-01 actor suspension notification (RT02-OBL-10). UNDER_AUTHORITY_REVIEW on chain break detection (RT02-OBL-11). Revoked authority is immediately invalid with no grace period (RT02-INV-5).',
    }),

    effective_from: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-02 "effective-from"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this claim became constitutionally effective',
    }),

    effective_until: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-02 "effective-until (if time-bounded)"',
      description: '[Conditional] ISO 8601 timestamp of temporal bound. Null means indefinite (until revocation or termination).',
    }),

    revocation_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-02 "revocation reference (if revoked)"',
      description: '[Conditional] Reference to AuthorityRevocationRecord when state is REVOKED',
    }),

  }),

  validate(data) {
    return _validate('AuthorityClaim', AuthorityClaim.SCHEMA, data);
  },

  create(data) {
    return _create('AuthorityClaim', AuthorityClaim.SCHEMA, AuthorityClaim.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT02-OWN-03: AuthorityRevocationRecord
// Constitutional basis: R2-v1.0 RS-07 RT02-OWN-03; A0-v1.1.1 §3.2;
// D4 §4.3 (revocation propagation); D8 IOR-3; RT02-OBL-05
// ─────────────────────────────────────────────────────────────────────────────

const AuthorityRevocationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AuthorityRevocationRecord',
    runtime_id:       'RT-02',
    runtime_name:     'Authority Runtime',
    authority:        'R2-v1.0 RS-07 RT02-OWN-03; A0-v1.1.1 §3.2 (Responsibility 7); D4 §4.3 (revocation propagation); D8 IOR-3 (authority history preservation); RT02-OBL-05',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-03',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: immutable upon creation per RS-07 RT02-OWN-03
    structural_immutable: true,
    invariants: ['RT02-INV-5'],
    constitutional_note: 'IMMUTABLE UPON CREATION (R2-v1.0 RS-07 RT02-OWN-03). No state transitions. Revocation has no grace period — revoked authority is immediately invalid (RT02-INV-5). Retained permanently in RT02-STATE-02 (authority history archive). The sole post-creation mutation permitted is updating rt04_notification_status when audit notification is confirmed.',
  }),

  SCHEMA: Object.freeze({

    revocation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-03 "AuthorityRevocationRecord identifier"',
      description: 'Unique constitutional identifier for this revocation record',
    }),

    revoked_object_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-03 "revoked object reference (DelegationRecord or AuthorityClaim)"',
      description: 'DelegationRecord.delegation_id or AuthorityClaim.claim_id that was revoked',
    }),

    revoked_object_type: Object.freeze({
      required: true, type: 'string',
      enum: ['DELEGATION_RECORD', 'AUTHORITY_CLAIM'],
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-03 (revoked object may be DelegationRecord or AuthorityClaim)',
      description: 'Constitutional type of the revoked object',
    }),

    revoking_actor: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-03 "revoking actor identity"',
      description: 'ActorProfile.actor_id of the actor who authorized this revocation',
    }),

    constitutional_basis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-03 "constitutional basis for revocation"; RT02-OBL-05',
      description: 'Constitutional authority and reason for this revocation. Explicit basis required — D-2 §X P-GOV-4 prohibits implicit authority (silence means no authority).',
    }),

    revocation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-03 "revocation timestamp"; D2 Layer 6 (Temporal Layer); RT02-INV-5',
      description: 'ISO 8601 timestamp when revocation took effect. Immediate — no grace period (RT02-INV-5).',
    }),

    downstream_invalidations: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-03 "downstream invalidations list (all AuthorityClaims placed in Revoked state by this action)"; RT02-OBL-05',
      description: 'Array of AuthorityClaim.claim_id values placed in REVOKED state by this revocation. Required for complete audit trail (D8 IOR-3).',
    }),

    // CONSTITUTIONALLY REQUIRED: audit notification tracking per RT02-OBL-05
    rt04_notification_status: Object.freeze({
      required: true, type: 'string',
      enum: ['PENDING', 'NOTIFIED', 'ACKNOWLEDGED'],
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-03 "RT-04 notification status"; RT02-OBL-05',
      description: 'Status of RT-04 audit notification. The only field permitted to change post-creation (all others immutable per RS-07).',
    }),

  }),

  validate(data) {
    return _validate('AuthorityRevocationRecord', AuthorityRevocationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('AuthorityRevocationRecord', AuthorityRevocationRecord.SCHEMA, AuthorityRevocationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT02-OWN-04: AuthorityConflictRecord
// Constitutional basis: R2-v1.0 RS-07 RT02-OWN-04; D6 AIR-1 through AIR-5;
// RT02-INV-3; A0-v1.1.1 §3.2; RT02-OBL-09
// ─────────────────────────────────────────────────────────────────────────────

const AuthorityConflictRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AuthorityConflictRecord',
    runtime_id:       'RT-02',
    runtime_name:     'Authority Runtime',
    authority:        'R2-v1.0 RS-07 RT02-OWN-04; D6 AIR-1 through AIR-5 (authority incompatibility rules); RT02-INV-3 (Audit Authority Independence); RT02-OBL-09; A0-v1.1.1 §3.2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-03',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT02-INV-3'],
    constitutional_note: 'Produced IMMEDIATELY upon AIR violation detection (RT02-OBL-09). AIR-5 violation — actor holding AUDIT and any other authority type in same domain — is a constitutional emergency (RT02-INV-3). Conflicts do not prevent Gate 3 determinations; RT-02 must flag the claim under authority review. Resolution requires constitutional process (may involve RT-04) — RT-02 must not unilaterally revoke to resolve.',
  }),

  SCHEMA: Object.freeze({

    conflict_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-04 "AuthorityConflictRecord identifier"',
      description: 'Unique constitutional identifier for this authority conflict record',
    }),

    conflicting_claim_refs: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-04 "conflicting AuthorityClaim references"',
      description: 'Array of AuthorityClaim.claim_id values that are in constitutional conflict',
    }),

    // CONSTITUTIONALLY REQUIRED: conflict type derived from RS-07 RT02-OWN-04 enumeration
    conflict_type: Object.freeze({
      required: true, type: 'string',
      enum: ['AIR_VIOLATION', 'CHAIN_CONFLICT', 'SCOPE_OVERLAP'],
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-04 "conflict type (AIR violation type, or chain conflict, or scope overlap)"; D6 AIR-1 through AIR-5',
      description: 'AIR_VIOLATION: one of D6 AIR-1 through AIR-5 violated (AIR-5/RT02-INV-3 is constitutional emergency). CHAIN_CONFLICT: incompatible authorization chains. SCOPE_OVERLAP: authority scope boundary violated (RT02-INV-4).',
    }),

    air_rule: Object.freeze({
      required: false, type: 'string',
      enum: ['AIR-1', 'AIR-2', 'AIR-3', 'AIR-4', 'AIR-5'],
      constitutional_source: 'D6 AIR-1 through AIR-5; RT02-OWN-04 "AIR violation type"',
      description: '[Conditional — required when conflict_type is AIR_VIOLATION] Specific D6 AIR rule violated. AIR-5 constitutes a constitutional emergency (RT02-INV-3 breach).',
    }),

    detection_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-04 "detection timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this conflict was detected by RT-02 continuous monitoring',
    }),

    // CONSTITUTIONALLY REQUIRED: resolution status per RT02-OWN-04 state transitions
    resolution_status: Object.freeze({
      required: true, type: 'string',
      enum: ['UNRESOLVED', 'RESOLVED', 'ESCALATED_TO_RT04'],
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-04 "resolution status (Unresolved, Resolved, EscalatedToRT04)"',
      description: 'Current resolution state. Terminal state: RESOLVED. ESCALATED_TO_RT04 when constitutional process requires founding authority involvement.',
    }),

    rt04_notification_record: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-04 "RT-04 notification record"; RT02-OBL-09',
      description: 'Reference to RT-04 audit notification for this conflict. RT-04 must be notified of all detected conflicts regardless of severity.',
    }),

    resolution_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-04 "resolution reference (if resolved)"',
      description: '[Conditional — required when resolution_status is RESOLVED] Reference to resolution record',
    }),

  }),

  validate(data) {
    return _validate('AuthorityConflictRecord', AuthorityConflictRecord.SCHEMA, data);
  },

  create(data) {
    return _create('AuthorityConflictRecord', AuthorityConflictRecord.SCHEMA, AuthorityConflictRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT02-OWN-05: AuthorityScope
// Constitutional basis: R2-v1.0 RS-07 RT02-OWN-05; D-2 §X (proportional
// authorization); D4 §4.3(d) and (f); D6 Part 4; A0-v1.1.1 §3.2
// ─────────────────────────────────────────────────────────────────────────────

const AuthorityScope = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AuthorityScope',
    runtime_id:       'RT-02',
    runtime_name:     'Authority Runtime',
    authority:        'R2-v1.0 RS-07 RT02-OWN-05; D-2 §X P-GOV-2 (proportional authorization); D4 §4.3(d) (scope condition); D4 §4.3(f) (autonomy band); D6 Part 4 (domain-specific scope); A0-v1.1.1 §3.2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-03',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: immutable once created per RS-07 RT02-OWN-05.
    // Scope modifications require a new AuthorityScope + superseded DelegationRecord.
    structural_immutable: true,
    invariants: ['RT02-INV-4'],
    constitutional_note: 'IMMUTABLE ONCE CREATED (R2-v1.0 RS-07 RT02-OWN-05). Scope modification requires creating a new AuthorityScope and superseding the associated DelegationRecord; the prior record is permanently retained (D8 PROH-4). Created as part of every DelegationRecord (RT02-PROC-01 step 6). Consumed by RT02-STATE-09 for Gate 3 scope validation (RT02-INV-4: authority may not exceed scope in DelegationRecord chain).',
  }),

  SCHEMA: Object.freeze({

    scope_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-05 "AuthorityScope identifier"',
      description: 'Unique constitutional identifier for this AuthorityScope record',
    }),

    domain_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-05 "domain reference"; D6 §2 (Twelve Domain Architecture)',
      description: 'Reference to the constitutional domain to which this scope applies',
    }),

    permitted_operation_types: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-05 "permitted operation types"; D4 §4.3(d)',
      description: 'Array of specific operation types authorized within this scope. Scope must be proportional to operation scope (D-2 §X P-GOV-2).',
    }),

    temporal_validity_window: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-05 "temporal validity window"; D2 Layer 6 (Temporal Layer); D4 §4.3(d)',
      description: 'Temporal validity specification: ISO 8601 interval string or "INDEFINITE_UNTIL_REVOKED"',
    }),

    autonomy_band: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-05 "autonomy band"; D4 §4.3(f)',
      description: 'Autonomy band constraint governing the scope of independent decision-making within this authority grant',
    }),

    associated_delegation_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-05 "associated DelegationRecord"; RT02-PROC-01 step 6; RT02-STATE-09',
      description: 'DelegationRecord.delegation_id this scope record belongs to. Every Active DelegationRecord has exactly one AuthorityScope entry (RT02-STATE-09).',
    }),

    scope_constraint_notes: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R2-v1.0 RS-07 RT02-OWN-05 "scope constraint notes"',
      description: '[Optional] Additional constitutional notes on scope constraints specific to this authority grant',
    }),

  }),

  validate(data) {
    return _validate('AuthorityScope', AuthorityScope.SCHEMA, data);
  },

  create(data) {
    return _create('AuthorityScope', AuthorityScope.SCHEMA, AuthorityScope.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  DelegationRecord,
  AuthorityClaim,
  AuthorityRevocationRecord,
  AuthorityConflictRecord,
  AuthorityScope,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-02',
  WAVE:        'W1-03',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
