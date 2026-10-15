'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/observation-record.js
// Task: W1-06 — RT-08 Observation Runtime Type Definitions
// Runtime: RT-08 — Observation Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-26
// Authority: R8-v1.1-canonical.md RS-07 RS-10; A0-v1.1.1 §3.9;
//            D5 PI-1–PI-12 (Projection Invariants); D5 §3.2 (immutability);
//            D5 §3.4 (five uncertainty attributes); D3 RF-A6 (Observation Primacy);
//            D3 §5.6 (Observer Register requirements); D6 §4.2 (channel calibration);
//            D8 INV-6 (Feedback Requirement); D4 KI-017; D4 KI-023;
//            IDR-003 Resolution: ConsequenceObservationRecord owned by RT-08
//
// ─── IDR-003 RESOLUTION NOTE ─────────────────────────────────────────────────
// IDR-003 RESOLVED 2026-07-26 — Option A: ConsequenceObservationRecord is owned
// by RT-08. RT-14 consumes this object but does not own it (R8 RS-07; R14 RS-07;
// A0-v1.1.1 §3.9 owned objects; A0-v1.1.1 §3.15 consumed objects).
// See: docs/constitutional-architecture/decisions/IDR-003.md
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
//
// ─── RT-08 OWNERSHIP BOUNDARY ────────────────────────────────────────────────
// RT-08 OWNS: ObservationRecord, ObserverRegister, ObservationChannelRecord,
//             ConsequenceObservationRecord, ObserverLimitationRecord
// RT-08 DOES NOT OWN:
//   - Memory preservation (RT-07 function — RT-08 delivers to RT-07 via pipeline)
//   - Consequence assessment and comparison (RT-14 function — RT-08 delivers COR to RT-14)
//   - Coherence judgement (RT-06 function — RT-06 evaluates RT-08 outputs post-admission)
//   - Governance decisions and attestations (RT-04 function — RT-04 audits RT-08)
//   - Enforcement actions and gate decisions (RT-03 function — RT-03 gates all RT-08 submissions)
//   - Epistemic products: EvidenceObject, InterpretationRecord, BeliefObject (RT-09 function)
// ──────────────────────────────────────────────────────────────────────────��──

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT08 — ObservationRecord
// Constitutional basis: R8-v1.1 RS-07/RS-10; A0-v1.1.1 §3.9;
// D5 §3.2 (immutable after formation); D5 §3.4 (five uncertainty attributes);
// D3 RF-A6 (Observation Primacy — sole entry point for external reality);
// D3 GCR-1 (epistemic chain root); RT08-INV-1 through INV-6
//
// Root epistemic object. Formed at OPL Stage 3 completion. Immutable after
// formation (D5 §3.2 — any modification is RT08-FAIL-05). Carries all five
// D5 §3.4 uncertainty attributes, PI-11 domain attribution, and PI-2 marker.
// Submitted to RT-03 as Class A; routed to RT-09 after gate admission.
// ─────────────────────────────────────────────────────────────────────────────

const ObservationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ObservationRecord',
    runtime_id:       'RT-08',
    runtime_name:     'Observation Runtime',
    authority:        'R8-v1.1 RS-07 RS-10; A0-v1.1.1 §3.9; D5 §3.2 (immutable); D5 §3.4 (five uncertainty attributes); D3 RF-A6 (Observation Primacy); D3 GCR-1 (epistemic chain root); RT08-INV-1 through INV-6',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-06',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: D8 PROH-5; RT08 types are permanent epistemic records
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: D5 §3.2 — immutable after OPL Stage 3 formation
    structural_immutable: true,
    invariants: ['RT08-INV-1', 'RT08-INV-2', 'RT08-INV-3', 'RT08-INV-4', 'RT08-INV-6'],
    constitutional_note: 'IMMUTABLE AFTER FORMATION (D5 §3.2). Epistemic chain root — no external reality information enters the fabric except through a valid ObservationRecord (RT08-INV-1; D3 RF-A6). All five D5 §3.4 uncertainty attributes required. PI-11 domain_attribution non-optional (RT08-INV-6). PI-2 internal_external_marker enforces that record is NOT the external referent. Submitted to RT-03 as Class A; routed to RT-09 after admission. Concurrent ObserverLimitationRecord required (RT08-INV-3).',
  }),

  SCHEMA: Object.freeze({

    record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 §ObservationRecord "Identifier"; A0-v1.1.1 §3.9',
      description: 'Unique constitutional identifier for this ObservationRecord',
    }),

    observer_identity_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "Observer identity (RT-01 ActorProfile reference)"; RT08-INV-2',
      description: 'RT-01 ActorProfile identifier of the observer. Required for every ObservationRecord (RT08-INV-2). RT-08 does not own ActorProfile — RT-01 owns.',
    }),

    observation_channel_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "observation channel (ObservationChannelRecord reference)"; RT08-INV-5',
      description: 'ObservationChannelRecord.channel_id for the channel through which this observation was received. Channel must be registered in ObserverRegister before activation (RT08-INV-5).',
    }),

    external_referent_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "external referent description (ExternalRealitySegment identifier)"; D5 PI-2',
      description: 'ExternalRealitySegment identifier of the observed external referent. The referent exists independently of this record (D5 PI-2; RT08-INV-4).',
    }),

    external_state_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "external referent description (ExternalState description)"; D5 PI-2',
      description: 'Description of the ExternalState observed at this ExternalRealitySegment. Not the record — the referent (D5 PI-2).',
    }),

    // CONSTITUTIONALLY REQUIRED: all five D5 §3.4 uncertainty attributes (RT08-INV-3)
    d5_uncertainty_source: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "D5 §3.4 five uncertainty attributes — Source"; D5 §3.4; RT08-INV-3',
      description: 'D5 §3.4 uncertainty attribute 1 of 5: Source — identifies the origin and nature of the observation source',
    }),

    d5_uncertainty_confidence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "D5 §3.4 five uncertainty attributes — Confidence"; D5 §3.4; RT08-INV-3',
      description: 'D5 §3.4 uncertainty attribute 2 of 5: Confidence — confidence level of this observation',
    }),

    d5_uncertainty_limitations: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "D5 §3.4 five uncertainty attributes — Limitations"; D5 §3.4; RT08-INV-3; D5 PI-10',
      description: 'D5 §3.4 uncertainty attribute 3 of 5: Limitations — known limitations of the observer and instrument at time of observation',
    }),

    d5_uncertainty_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "D5 §3.4 five uncertainty attributes — Timestamp"; D5 §3.4; D3 RF-A4 (Temporal Integrity)',
      description: 'D5 §3.4 uncertainty attribute 4 of 5: Timestamp — the temporal position of the observation (ISO 8601)',
    }),

    d5_uncertainty_observer_capability: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "D5 §3.4 five uncertainty attributes — Observer Capability"; D5 §3.4; RT08-INV-3',
      description: 'D5 §3.4 uncertainty attribute 5 of 5: Observer Capability — current capability state of the observer at time of observation',
    }),

    // CONSTITUTIONALLY REQUIRED: PI-11 domain attribution (RT08-INV-6)
    domain_attribution: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "domain attribution (PI-11)"; D5 PI-11 (Civilizational Scope); RT08-INV-6',
      description: 'Domain identifier of the domain to which the observed ExternalRealitySegment is attributed. Non-optional ��� no ObservationRecord may lack domain attribution (RT08-INV-6; D5 PI-11).',
    }),

    // CONSTITUTIONALLY REQUIRED: PI-2 internal/external distinction marker (RT08-INV-4)
    internal_external_marker: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R8-v1.1 RS-10 "internal/external distinction marker (PI-2)"; D5 PI-2; RT08-INV-4',
      description: 'PI-2 marker: true = this record is constitutionally distinct from the external referent it describes. Must always be true — record is NOT the external state. RT08-INV-4 forbids conflation of record and referent.',
    }),

    authority_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "provenance (RT-02 authorization reference)"; D6 §4.2; RT08-INV-5',
      description: 'RT-02 AuthorityResolutionResult reference authorizing this observation. RT-08 does not own AuthorityResolutionResult — RT-02 owns.',
    }),

    contact_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "temporal position (contact timestamp)"; D3 RF-A4; D4 KI-023',
      description: 'ISO 8601 timestamp when the external signal was first received at the observation channel (OPL Stage 1 acknowledgment)',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "temporal position (formation timestamp)"; D3 RF-A4; D4 KI-023 (ObservationFormationWindow close)',
      description: 'ISO 8601 timestamp when this ObservationRecord was formed and the ObservationFormationWindow closed (OPL Stage 3 completion)',
    }),

    observer_limitation_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "ObserverLimitationRecord reference"; RT08-INV-3; D5 PI-10',
      description: 'ObserverLimitationRecord.limitation_id for the limitation record formed concurrently with this ObservationRecord. Concurrent formation is constitutionally required (RT08-INV-3; RS-10 §ObserverLimitationRecord "Created").',
    }),

  }),

  validate(data) {
    return _validate('ObservationRecord', ObservationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ObservationRecord', ObservationRecord.SCHEMA, ObservationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT08 — ObserverRegister
// Constitutional basis: R8-v1.1 RS-07/RS-10; A0-v1.1.1 §3.9;
// D3 §5.6 (Observer Register requirements R1–R5); RT08-INV-5
//
// Constitutional registry of all authorized observers. One per RT-08 instance.
// Updated (not immutable) on registration, calibration, authority renewal,
// status change, or lapse. Each update is a Class A operation submitted to
// RT-03. Historical states preserved in RT-07 durable store.
// ─────────────────────────────────────────────────────────────────────────────

const ObserverRegister = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ObserverRegister',
    runtime_id:       'RT-08',
    runtime_name:     'Observation Runtime',
    authority:        'R8-v1.1 RS-07 RS-10; A0-v1.1.1 §3.9; D3 §5.6 (Observer Register requirements R1–R5); RT08-INV-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-06',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Registry content updated on registration, calibration, authority, and status events
    structural_immutable: false,
    invariants: ['RT08-INV-5'],
    constitutional_note: 'NEVER DELETED. Updated on observer registration, calibration record update, authority renewal, status change, or registration lapse �� each update is a Class A operation submitted to RT-03. Historical ObserverRegister states are preserved by RT-07. observer_ref must be a resolvable RT-01 ActorProfile identifier. authority_chain_ref must trace to FoundingRatification (D3 §5.6 R5). registration_status constrains to ACTIVE/SUSPENDED/LAPSED.',
  }),

  SCHEMA: Object.freeze({

    register_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 §ObserverRegister "Identifier"; A0-v1.1.1 §3.9',
      description: 'Unique constitutional identifier for this ObserverRegister entry',
    }),

    observer_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "ActorProfile identifier (RT-01 reference)"; D3 §5.6 R5; RT08-INV-2',
      description: 'RT-01 ActorProfile identifier of the registered observer. RT-08 does not own ActorProfile — RT-01 owns.',
    }),

    observation_scope: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R8-v1.1 RS-10 "ObservationScope (set of ExternalRealitySegments and ExternalState types authorized)"; D3 §5.6 R1',
      description: 'Array of ExternalRealitySegment identifiers and ExternalState type strings this observer is constitutionally authorized to observe',
    }),

    calibration_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "CalibrationRecord (CompetenceDemonstration reference, calibration history, current calibration state)"; D3 §5.6 R4',
      description: 'Reference to the CalibrationRecord for this observer (CompetenceDemonstration ref, calibration history, current calibration state per D3 §5.6 R4)',
    }),

    health_assessment: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "HealthAssessment (current operational status per D3 §5.6 R4)"',
      description: 'Current operational health status of this observer per D3 §5.6 R4',
    }),

    authority_chain_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "AuthorityChain (traceable to FoundingRatification per D3 §5.6 R5)"',
      description: 'Authority chain reference traceable to FoundingRatification per D3 §5.6 R5. RT-08 does not own the base authority chain — RT-02 owns.',
    }),

    // CONSTITUTIONALLY REQUIRED: registration_status enum (D3 §5.6)
    registration_status: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'SUSPENDED', 'LAPSED'],
      constitutional_source: 'R8-v1.1 RS-10 "RegistrationStatus (Active, Suspended, Lapsed)"; D3 §5.6',
      description: 'ACTIVE: observer is constitutionally authorized and operational. SUSPENDED: observer suspended per RT-03 Type A or Type B suspension protocol. LAPSED: authority renewal has lapsed.',
    }),

    last_verification_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "last verification timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp of the most recent registration verification for this observer',
    }),

  }),

  validate(data) {
    return _validate('ObserverRegister', ObserverRegister.SCHEMA, data);
  },

  create(data) {
    return _create('ObserverRegister', ObserverRegister.SCHEMA, ObserverRegister.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT08 — ObservationChannelRecord
// Constitutional basis: R8-v1.1 RS-07/RS-10; A0-v1.1.1 §3.9;
// D6 §4.2 (registered instruments with known calibration states); RT08-INV-5
//
// Constitutional channel registry entry. Created on channel registration.
// Updated on authority renewal. The channel_activation_status must be ACTIVE
// before any observation may be received through this channel (RT08-INV-5).
// ─────────────────────────────────────────────────────────────────────────────

const ObservationChannelRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ObservationChannelRecord',
    runtime_id:       'RT-08',
    runtime_name:     'Observation Runtime',
    authority:        'R8-v1.1 RS-07 RS-10; A0-v1.1.1 §3.9; D6 §4.2 (registered instruments with known calibration states); RT08-INV-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-06',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Updated on authority renewal; activation status transitions
    structural_immutable: false,
    invariants: ['RT08-INV-5'],
    constitutional_note: 'NEVER DELETED. Every observation channel must be registered in the ObserverRegister before activation (RT08-INV-5). channel_activation_status constrains to ACTIVE/INACTIVE/LAPSED. authority_resolution_ref must reference a valid RT-02 AuthorityResolutionResult. last_authority_renewal_timestamp updated on renewal events. D6 §4.2 requires registered instruments with known calibration states.',
  }),

  SCHEMA: Object.freeze({

    channel_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 §ObservationChannelRecord "Channel identifier"; A0-v1.1.1 §3.9',
      description: 'Unique constitutional identifier for this ObservationChannelRecord',
    }),

    observer_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "observer reference (ObserverRegister entry)"; RT08-INV-5',
      description: 'ObserverRegister.register_id for the observer using this channel. Channel must be registered before activation (RT08-INV-5).',
    }),

    external_reality_segment_scope: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "ExternalRealitySegment scope"; D6 §4.2',
      description: 'ExternalRealitySegment scope this channel is authorized to observe per D6 §4.2',
    }),

    observation_method: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "observation method"; D6 §4.2',
      description: 'Observation method used by this channel',
    }),

    instrument_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "instrument reference"; D6 §4.2 (registered instruments)',
      description: 'Reference to the registered instrument used by this channel per D6 §4.2',
    }),

    calibration_state_at_registration: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "calibration state at registration"; D6 §4.2 (known calibration states)',
      description: 'Calibration state of the instrument at the time this channel was registered per D6 §4.2',
    }),

    authority_resolution_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "AuthorityResolutionResult reference (RT-02 authorization)"; D6 §4.2',
      description: 'RT-02 AuthorityResolutionResult reference authorizing this channel. RT-08 does not own AuthorityResolutionResult — RT-02 owns.',
    }),

    // CONSTITUTIONALLY REQUIRED: channel activation status enum
    channel_activation_status: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'LAPSED'],
      constitutional_source: 'R8-v1.1 RS-10 "channel activation status"; RT08-INV-5',
      description: 'ACTIVE: channel is constitutionally authorized and may receive observations. INACTIVE: channel is registered but not currently active. LAPSED: authority renewal has lapsed — no observations may be received.',
    }),

    registration_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "registration timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this observation channel was constitutionally registered',
    }),

    last_authority_renewal_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "last authority renewal timestamp"; D2 Layer 6',
      description: 'ISO 8601 timestamp of the most recent RT-02 authority renewal for this channel',
    }),

  }),

  validate(data) {
    return _validate('ObservationChannelRecord', ObservationChannelRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ObservationChannelRecord', ObservationChannelRecord.SCHEMA, ObservationChannelRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT08 — ConsequenceObservationRecord
// Constitutional basis: R8-v1.1 RS-07/RS-10; A0-v1.1.1 §3.9;
// IDR-003 RESOLVED (Option A): RT-08 owns this type;
// A0 §4.4 Step 27; A1 PAIR 49; D8 INV-6 (Feedback Requirement)
//
// Epistemic chain root object — consequence observation context.
// Formed at OPL Stage 3 completion when RT-14 sends a ConsequenceObservationTrigger.
// Contains all ObservationRecord content (same five D5 §3.4 uncertainty attributes,
// PI-11 domain attribution, PI-2 marker, authority_ref, timestamps, limitation_ref)
// PLUS consequence context linkage (action_ref, expectation_ref, observed_outcome,
// divergence_flag). Immutable after formation. Submitted to RT-03 as Class A;
// routed to RT-14 after gate admission.
//
// RT-14 CONSUMES but does NOT own this record (R14-v1.0 RS-07; IDR-003 Option A).
// ─────────────────────────────────────────────────────────────────────────────

const ConsequenceObservationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ConsequenceObservationRecord',
    runtime_id:       'RT-08',
    runtime_name:     'Observation Runtime',
    authority:        'R8-v1.1 RS-07 RS-10; A0-v1.1.1 §3.9; IDR-003 RESOLVED Option A (RT-08 owns; RT-14 consumes); A0 §4.4 Step 27; A1 PAIR 49; D8 INV-6 (Feedback Requirement); D5 §3.2 (immutable)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-06',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: D5 §3.2 — immutable after OPL Stage 3 formation
    structural_immutable: true,
    invariants: ['RT08-INV-1', 'RT08-INV-2', 'RT08-INV-3', 'RT08-INV-4', 'RT08-INV-6'],
    constitutional_note: 'IMMUTABLE AFTER FORMATION (D5 §3.2). Owned exclusively by RT-08 (IDR-003 RESOLVED; R8 RS-07). RT-14 CONSUMES but does NOT own (R14-v1.0 RS-07; A0-v1.1.1 §3.15 Consumed Objects). Contains all ObservationRecord content plus consequence context linkage. Triggered by RT-14 ConsequenceObservationTrigger (A1 PAIR 49). Submitted to RT-03 as Class A; routed to RT-14 via pipeline after admission. D8 INV-6 (Feedback Requirement): every action projection that crosses the Projection Boundary must produce a ConsequenceObservationRecord closing the feedback loop.',
  }),

  SCHEMA: Object.freeze({

    // ── All ObservationRecord fields (RS-10: "All ObservationRecord content") ──

    record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 §ConsequenceObservationRecord "All ObservationRecord content — Identifier"; A0-v1.1.1 §3.9',
      description: 'Unique constitutional identifier for this ConsequenceObservationRecord',
    }),

    observer_identity_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — Observer identity (RT-01 ActorProfile reference)"; RT08-INV-2',
      description: 'RT-01 ActorProfile identifier of the observer. RT-08 does not own ActorProfile — RT-01 owns.',
    }),

    observation_channel_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — observation channel (ObservationChannelRecord reference)"; RT08-INV-5',
      description: 'ObservationChannelRecord.channel_id for the consequence observation channel',
    }),

    external_referent_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — ExternalRealitySegment identifier"; D5 PI-2',
      description: 'ExternalRealitySegment identifier of the consequence observation referent (D5 PI-2)',
    }),

    external_state_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — ExternalState description"; D5 PI-2',
      description: 'ExternalState description of the consequence observation referent',
    }),

    d5_uncertainty_source: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — D5 §3.4 uncertainty Source"; D5 §3.4; RT08-INV-3',
      description: 'D5 §3.4 uncertainty attribute 1 of 5: Source — observation source for this consequence observation',
    }),

    d5_uncertainty_confidence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — D5 §3.4 uncertainty Confidence"; D5 §3.4; RT08-INV-3',
      description: 'D5 §3.4 uncertainty attribute 2 of 5: Confidence — confidence level of this consequence observation',
    }),

    d5_uncertainty_limitations: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — D5 §3.4 uncertainty Limitations"; D5 §3.4; RT08-INV-3; D5 PI-10',
      description: 'D5 §3.4 uncertainty attribute 3 of 5: Limitations — known limitations at time of consequence observation',
    }),

    d5_uncertainty_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — D5 §3.4 uncertainty Timestamp"; D5 §3.4; D3 RF-A4',
      description: 'D5 §3.4 uncertainty attribute 4 of 5: Timestamp — temporal position of this consequence observation (ISO 8601)',
    }),

    d5_uncertainty_observer_capability: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — D5 §3.4 uncertainty Observer Capability"; D5 §3.4; RT08-INV-3',
      description: 'D5 §3.4 uncertainty attribute 5 of 5: Observer Capability — capability state at time of consequence observation',
    }),

    domain_attribution: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — domain attribution (PI-11)"; D5 PI-11; RT08-INV-6',
      description: 'Domain identifier of the domain for the consequence ExternalRealitySegment (D5 PI-11; RT08-INV-6)',
    }),

    internal_external_marker: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — internal/external distinction marker (PI-2)"; D5 PI-2; RT08-INV-4',
      description: 'PI-2 marker: true = this record is constitutionally distinct from the external referent it describes (RT08-INV-4)',
    }),

    authority_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — RT-02 authorization reference"',
      description: 'RT-02 AuthorityResolutionResult reference authorizing this consequence observation',
    }),

    contact_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — contact timestamp"; D3 RF-A4; D4 KI-023',
      description: 'ISO 8601 timestamp when the consequence observation trigger was received (OPL Stage 1)',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — formation timestamp"; D3 RF-A4; D4 KI-023',
      description: 'ISO 8601 timestamp when this ConsequenceObservationRecord was formed at OPL Stage 3 completion',
    }),

    observer_limitation_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "All ObservationRecord content — ObserverLimitationRecord reference"; RT08-INV-3; D5 PI-10',
      description: 'ObserverLimitationRecord.limitation_id for the limitation record formed concurrently with this ConsequenceObservationRecord (RT08-INV-3)',
    }),

    // ── Consequence context fields (RS-10: "plus: consequence observation context") ──

    action_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 §ConsequenceObservationRecord "triggering action reference — RT-13 ActionProjection"; A0 §4.4 Step 27; A1 PAIR 49',
      description: 'RT-13 ActionProjection identifier whose consequence is being observed. RT-08 does not own ActionProjection — RT-13 owns.',
    }),

    expectation_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 §ConsequenceObservationRecord "expected consequence reference — RT-14 effect expectation"; A0 §4.4 Step 27',
      description: 'EffectExpectationRecord identifier (RT-13 owned; RT-14 provided in trigger) associated with this consequence observation',
    }),

    observed_outcome: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 §ConsequenceObservationRecord "actual External State observed"; D8 INV-6',
      description: 'Description of the actual External State observed in the consequence context',
    }),

    // CONSTITUTIONALLY REQUIRED: divergence flag (D8 INV-6 feedback closure)
    divergence_flag: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R8-v1.1 RS-10 §ConsequenceObservationRecord "comparison linkage"; D8 INV-6; D5 PI-7 (Reality Overrides Representation)',
      description: 'true: observed outcome diverges from the EffectExpectationRecord (expectation_ref). false: observed outcome matches expectation. RT-14 uses this as the initial comparison signal.',
    }),

  }),

  validate(data) {
    return _validate('ConsequenceObservationRecord', ConsequenceObservationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ConsequenceObservationRecord', ConsequenceObservationRecord.SCHEMA, ConsequenceObservationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT08 — ObserverLimitationRecord
// Constitutional basis: R8-v1.1 RS-07/RS-10; A0-v1.1.1 §3.9;
// D5 PI-10 (observer limitations acknowledged); D4 KI-017; RT08-INV-3
//
// Supplementary epistemic record formed concurrently with every ObservationRecord
// and every ConsequenceObservationRecord (RT08-INV-3). Immutable after formation.
// Records calibration state, instrument limitations, degradation factors, and
// confidence ceiling at time of observation. RT-04 has unrestricted AIR-5 access.
// ─────────────────────────────────────────────────────────────────────────────

const ObserverLimitationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ObserverLimitationRecord',
    runtime_id:       'RT-08',
    runtime_name:     'Observation Runtime',
    authority:        'R8-v1.1 RS-07 RS-10; A0-v1.1.1 §3.9; D5 PI-10 (observer limitations acknowledged); D4 KI-017; RT08-INV-3',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-06',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Formed concurrently with ObservationRecord — immutable after
    structural_immutable: true,
    invariants: ['RT08-INV-3'],
    constitutional_note: 'IMMUTABLE AFTER FORMATION. Formed concurrently with every ObservationRecord and every ConsequenceObservationRecord (RT08-INV-3). observation_record_ref references either an ObservationRecord or ConsequenceObservationRecord. pi_10_compliance_attestation must be true — D5 PI-10 compliance is non-optional. degradation_factors is optional (present only when active degradation exists). RT-04 holds unrestricted AIR-5 read access to all ObserverLimitationRecords (A1 PAIR 22).',
  }),

  SCHEMA: Object.freeze({

    limitation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 §ObserverLimitationRecord "Identifier"; A0-v1.1.1 §3.9',
      description: 'Unique constitutional identifier for this ObserverLimitationRecord',
    }),

    observation_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "ObservationRecord reference"; RT08-INV-3',
      description: 'ObservationRecord.record_id or ConsequenceObservationRecord.record_id this limitation record accompanies. Formed concurrently — the paired observation record is constitutionally inseparable (RT08-INV-3).',
    }),

    calibration_state_at_observation: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "observer calibration state at time of observation"; D4 KI-017',
      description: 'Calibration state of the observer at the exact time of observation per D4 KI-017',
    }),

    instrument_limitations: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "known instrument limitations (scope, method, calibration accuracy)"; D5 PI-10',
      description: 'Known instrument limitations covering scope, observation method, and calibration accuracy at time of observation',
    }),

    // Optional: only present when active degradation factors exist
    degradation_factors: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "any degradation factors active at time of observation (degraded calibration, reduced scope, environmental constraints)"; D5 PI-10',
      description: 'Degradation factors active at time of observation (degraded calibration, reduced scope, environmental constraints). Absent when no degradation is active.',
    }),

    confidence_ceiling: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R8-v1.1 RS-10 "Confidence ceiling imposed by limitations"; D5 PI-10; D5 §3.4',
      description: 'Confidence ceiling for the paired observation imposed by the identified limitations',
    }),

    // CONSTITUTIONALLY REQUIRED: D5 PI-10 compliance attestation
    pi_10_compliance_attestation: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R8-v1.1 RS-10 "attestation of PI-10 compliance"; D5 PI-10; RT08-INV-3',
      description: 'Must be true — attests that D5 PI-10 (observer limitations acknowledged in every ObservationRecord) is satisfied. RT08-INV-3 requires explicit limitation acknowledgment.',
    }),

  }),

  validate(data) {
    return _validate('ObserverLimitationRecord', ObserverLimitationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ObserverLimitationRecord', ObserverLimitationRecord.SCHEMA, ObserverLimitationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  ObservationRecord,
  ObserverRegister,
  ObservationChannelRecord,
  ConsequenceObservationRecord,
  ObserverLimitationRecord,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-08',
  WAVE:        'W1-06',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
