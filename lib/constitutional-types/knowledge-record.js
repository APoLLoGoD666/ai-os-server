'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/knowledge-record.js
// Task: W1-07 — RT-09 Knowledge Runtime Type Definitions
// Runtime: RT-09 — Knowledge Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-26
// Authority: A0-v1.1.1 §3.10; R9-v1.0-canonical.md RS-07 RS-10; D3 Epistemic
//            Chain Stages 2–5; D5 §3.2 Stages 4–5; D8 INV-4 INV-5 INV-7;
//            KI-007 KI-010 KI-017 KI-023 KI-024; D6 §4.2–4.3 (AIR-1 AIR-2)
//
// ─── SECTION NUMBER NOTE ─────────────────────────────────────────────────────
// Wave plan W1-07 cites A0 §3.9 for RT-09. R9-v1.0-canonical.md RS-01 confirms
// correct constitutional seat is §3.10. Off-by-one artifact consistent with
// W1-04, W1-12, W1-14. CONSTITUTIONAL blocks use §3.10.
//
// ─── DKS ENUM NOTE ───────────────────────────────────────────────────────────
// Wave plan task step 3 specifies KnowledgeState.dks_level enum values as
// ['UNKNOWN','PARTIAL','BELIEVED','CONFIRMED']. R9-v1.0 RS-10.5 specifies the
// constitutional DKS states as: DKS-1 Active, DKS-2 Uncertain, DKS-3 Contested,
// DKS-4 Degraded. R-series (high authority) governs over I1 planning document
// (medium authority) per established precedent (R8 RS-07 over I1-ARCHITECTURE
// §4.2; D6 Part 10 over A0 §3.16 in W1-14). Enum uses R9-canonical values:
// ['ACTIVE','UNCERTAIN','CONTESTED','DEGRADED'].
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
//
// ─── RT-09 OWNERSHIP BOUNDARY ────────────────────────────────────────────────
// RT-09 OWNS: EvidenceObject, InterpretationRecord, BeliefObject, KnowledgeClaim,
//             KnowledgeState, ContradictionRecord, RealityGapEntry, EpistemicProtocol
// RT-09 DOES NOT OWN:
//   - Observation Projections (RT-08 owns — ObservationRecord, COR; RT-09 receives
//     as admitted inputs via RT-03; observation_projection_ref is a cross-runtime ref)
//   - Domain Understanding Models (RT-10 owns — RT-09 delivers KnowledgeState to RT-10)
//   - Civilization Understanding Models (RT-11 owns)
//   - Authority grants and decisions (RT-02 owns — RT-09 holds AIR-1/AIR-2 granted by RT-02)
//   - Audit Records (RT-04 owns — RT-04 holds AIR-5 and audits RT-09)
//   - HistoricalStateQueryResult (RT-07 owns — RT-09 consumes via PAIR 37)
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT09 — EvidenceObject
// Constitutional basis: R9-v1.0 RS-07 (RT09-OBJ-01); A0-v1.1.1 §3.10;
// D3 Epistemic Chain Stage 2 (Evidence); D5 §3.2 Stage 4 (Evidence Assessment);
// KI-017 (uncertainty attributes preserved); A1 §6.2 (provenance anchor);
// D8 INV-4 (Reality Grounding — every epistemic object traceable to Observation);
// RT09-INV-1 (provenance to Observation Projection required)
//
// First epistemic product. Formed by applying a registered interpretation protocol
// (D6 §4.3 AIR-2 obligation) to an admitted Observation Projection. Uncertainty
// attributes must be preserved from source Observation Record (KI-017). Immutable
// after formation and commitment through RT-03 Class A. Submitted to RT-03 Class A;
// committed to RT-05. Provenance anchors to Observation Projection ID + RT-09 op ID
// (A1 §6.2). observation_projection_ref is a cross-runtime reference to an RT-08
// owned ObservationRecord or ConsequenceObservationRecord.
// ─────────────────────────────────────────────────────────────────────────────

const EvidenceObject = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'EvidenceObject',
    runtime_id:       'RT-09',
    runtime_name:     'Knowledge Runtime',
    authority:        'R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10; D3 Epistemic Chain Stage 2; D5 §3.2 Stage 4 (immutable after commitment); KI-017 (uncertainty preserved); A1 §6.2 (provenance); D8 INV-4 (Reality Grounding); RT09-INV-1 RT09-INV-2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-07',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT09-INV-1', 'RT09-INV-2'],
    constitutional_note: 'IMMUTABLE AFTER COMMITMENT (D5 §3.2 Stage 4). D3 Epistemic Chain Stage 2 — first epistemic product of the chain. observation_projection_ref required (RT09-INV-1; D8 INV-4 Reality Grounding): every EvidenceObject must be traceable to an admitted Observation Projection. Observation Projection is owned by RT-08; cross-runtime reference only. Uncertainty attributes (KI-017): all five preserved from source Observation Record — source, confidence, limitations, timestamp, observer_capability. Registered interpretation protocol required (D6 §4.3 AIR-2 obligation). temporal_validity_metadata required (RT09-INV-2; D8 INV-5 Temporal Awareness). Submitted to RT-03 as Class A; committed to RT-05.',
  }),

  SCHEMA: Object.freeze({

    evidence_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.1 "unique Evidence Record ID"; A0-v1.1.1 §3.10',
      description: 'Unique constitutional identifier for this EvidenceObject',
    }),

    observation_projection_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-01 "Observation Projection ID (owned by RT-08)"; A1 §6.2 (provenance anchor first component); D8 INV-4 (Reality Grounding); RT09-INV-1',
      description: 'RT-08 ObservationRecord.record_id or ConsequenceObservationRecord.record_id whose admitted Observation Projection triggered this Evidence formation. RT-09 does not own ObservationRecord — RT-08 owns. Cross-runtime provenance anchor (RT09-INV-1; D8 INV-4).',
    }),

    rt09_operation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A1 §6.2 (provenance anchor second component: RT-09 operation ID); R9-v1.0 RS-07 RT09-OBJ-01',
      description: 'RT-09 operation identifier for this Evidence formation operation. Forms the second component of the A1 §6.2 provenance anchor pair: (Observation Projection ID, RT-09 operation ID).',
    }),

    interpretation_protocol_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D6 §4.3 (AIR-2 obligation: apply only registered, versioned interpretation protocols); R9-v1.0 RS-07 RT09-OBJ-01 "registration of interpretation protocol version required"',
      description: 'EpistemicProtocol.protocol_id of the registered interpretation protocol applied to form this EvidenceObject. D6 §4.3 AIR-2 obligation: AIR-2 holders must record which protocol was applied. RT-09 may not apply unregistered protocols.',
    }),

    protocol_version: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D6 §4.3 (AIR-2 obligation: record which protocol version was applied); R9-v1.0 RS-07 RT09-OBJ-01',
      description: 'Version identifier of the EpistemicProtocol applied. D6 §4.3 requires recording the version so later provenance queries can identify exactly which protocol version was used.',
    }),

    // CONSTITUTIONALLY REQUIRED: all five uncertainty attributes preserved from source (KI-017)
    uncertainty_source: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D4 KI-017 (uncertainty attributes preserved through Evidence formation); D5 §3.4 uncertainty attribute 1: Source; R9-v1.0 RS-10.1',
      description: 'KI-017 preservation of D5 §3.4 uncertainty attribute 1/5 from source Observation Record: Source — origin and nature of the observation source.',
    }),

    uncertainty_confidence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D4 KI-017; D5 §3.4 uncertainty attribute 2: Confidence; KI-024 (confidence levels respected); R9-v1.0 RS-10.1',
      description: 'KI-017 preservation of D5 §3.4 uncertainty attribute 2/5 from source Observation Record: Confidence — confidence level of the source observation.',
    }),

    uncertainty_limitations: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D4 KI-017; D5 §3.4 uncertainty attribute 3: Limitations; R9-v1.0 RS-10.1',
      description: 'KI-017 preservation of D5 §3.4 uncertainty attribute 3/5 from source Observation Record: Limitations — known limitations at time of observation.',
    }),

    uncertainty_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D4 KI-017; D5 §3.4 uncertainty attribute 4: Timestamp; R9-v1.0 RS-10.1',
      description: 'KI-017 preservation of D5 §3.4 uncertainty attribute 4/5 from source Observation Record: Timestamp — temporal position of the source observation (ISO 8601).',
    }),

    uncertainty_observer_capability: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D4 KI-017; D5 §3.4 uncertainty attribute 5: Observer Capability; R9-v1.0 RS-10.1',
      description: 'KI-017 preservation of D5 §3.4 uncertainty attribute 5/5 from source Observation Record: Observer Capability — capability state of observer at time of observation.',
    }),

    domain_classification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Domain layer (Layer 5); D6 §5.2 (domain knowledge state classification); R9-v1.0 RS-10.1; A0 §3.10 R5 (RT-09 maintains Knowledge States for all twelve domains)',
      description: 'Domain identifier of the constitutional domain this Evidence belongs to. Required for RT-15 coordination and DKS state tracking across all twelve domains.',
    }),

    temporal_validity_metadata: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D8 INV-5 (Temporal Awareness — all epistemic objects must carry temporal validity metadata); RT09-INV-2; R9-v1.0 RS-10.1',
      description: 'Temporal validity metadata for this EvidenceObject. Carries the validity window and expiration conditions used by RT09-PROC-06 (Temporal Validity Tracking). RT09-INV-2 enforcement.',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Temporal layer (Layer 2); R9-v1.0 RS-10.1; D4 KI-026 (causal ordering preserved)',
      description: 'ISO 8601 timestamp when this EvidenceObject was formed (D5 §3.2 Stage 4 completion).',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['FORMING', 'SUBMITTED', 'ADMITTED', 'HISTORICAL', 'REJECTED'],
      constitutional_source: 'R9-v1.0 RS-10.1 lifecycle states; D5 §3.2 Stage 4 (ADMITTED = immutable committed state)',
      description: 'FORMING: Evidence Record being assembled. SUBMITTED: Class A submission to RT-03. ADMITTED: committed to RT-05 (immutable after this point). HISTORICAL: superseded by updated evidence. REJECTED: RT-03 Gate failure.',
    }),

  }),

  validate(data) {
    return _validate('EvidenceObject', EvidenceObject.SCHEMA, data);
  },

  create(data) {
    return _create('EvidenceObject', EvidenceObject.SCHEMA, EvidenceObject.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT09 — InterpretationRecord
// Constitutional basis: R9-v1.0 RS-07 (RT09-OBJ-02); A0-v1.1.1 §3.10;
// D3 Epistemic Chain Stage 3 (Interpretation); D5 §3.2 Stage 5 (Epistemic Integration);
// KI-007 (no stage skipping; sequential advancement only)
//
// Second epistemic stage object. Formed by applying a registered inference protocol
// to a committed EvidenceObject. Inherits epistemic confidence from Evidence Record.
// Immutable after commitment. Anchors provenance to Evidence Record ID + RT-09 op ID.
// Submitted to RT-03 as Class A; committed to RT-05.
// ─────────────────────────────────────────────────────────────────────────────

const InterpretationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'InterpretationRecord',
    runtime_id:       'RT-09',
    runtime_name:     'Knowledge Runtime',
    authority:        'R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10; D3 Epistemic Chain Stage 3; D5 §3.2 Stage 5; KI-007 (sequential stages); D6 §4.3 (AIR-2 registered inference protocol)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-07',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT09-INV-1', 'RT09-INV-2'],
    constitutional_note: 'IMMUTABLE AFTER COMMITMENT. D3 Epistemic Chain Stage 3 — formed from EvidenceObject by applying registered inference protocol. KI-007: epistemic chain stage sequence must not be skipped; InterpretationRecord may only be formed after EvidenceObject is ADMITTED. evidence_record_ref required (RT09-INV-1 chain). Registered inference protocol required (D6 §4.3 AIR-2). Epistemic confidence inherited from Evidence Record. Submitted to RT-03 as Class A; committed to RT-05.',
  }),

  SCHEMA: Object.freeze({

    interpretation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.2 "unique InterpretationRecord ID"; A0-v1.1.1 §3.10',
      description: 'Unique constitutional identifier for this InterpretationRecord',
    }),

    evidence_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-02 "provenance anchor: EvidenceObject ID"; RT09-INV-1 chain; KI-007 (prior chain objects must be present)',
      description: 'EvidenceObject.evidence_id this InterpretationRecord is derived from. Establishes the RT09-INV-1 provenance chain link: InterpretationRecord → EvidenceObject → Observation Projection.',
    }),

    rt09_operation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-02 "RT-09 operation ID provenance anchor"',
      description: 'RT-09 operation identifier for this Interpretation formation operation. A1 §6.2 provenance anchor component.',
    }),

    inference_protocol_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D6 §4.3 (AIR-2 obligation: apply only registered inference protocols); R9-v1.0 RS-10.2',
      description: 'EpistemicProtocol.protocol_id of the registered inference protocol applied to form this InterpretationRecord. D6 §4.3 AIR-2 obligation.',
    }),

    inference_protocol_version: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D6 §4.3 (AIR-2 obligation: record which protocol version was applied); R9-v1.0 RS-10.2',
      description: 'Version of the EpistemicProtocol applied to form this InterpretationRecord.',
    }),

    epistemic_confidence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.2 "epistemic confidence inherited from Evidence Record"; D5 §3.4; KI-017 (uncertainty preservation through chain)',
      description: 'Epistemic confidence level inherited from the source EvidenceObject per D5 §3.4 and KI-017 uncertainty preservation through the epistemic chain.',
    }),

    interpretation_content: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-02 (product of registered inference protocol application); D3 Epistemic Chain Stage 3',
      description: 'The interpretation produced by applying the registered inference protocol to the Evidence Record. This is the constitutional substance of the Stage 3 epistemic product.',
    }),

    domain_classification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Domain layer; D6 §5.2; R9-v1.0 RS-10.2',
      description: 'Domain identifier for this InterpretationRecord, inherited from the source EvidenceObject.',
    }),

    temporal_validity_metadata: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D8 INV-5 (Temporal Awareness); RT09-INV-2; R9-v1.0 RS-10.2',
      description: 'Temporal validity metadata for this InterpretationRecord. Used by RT09-PROC-06 (Temporal Validity Tracking).',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Temporal layer; R9-v1.0 RS-10.2; D4 KI-026',
      description: 'ISO 8601 timestamp when this InterpretationRecord was formed.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['FORMING', 'SUBMITTED', 'ADMITTED', 'HISTORICAL', 'REJECTED'],
      constitutional_source: 'R9-v1.0 RS-10.2 lifecycle states',
      description: 'FORMING: InterpretationRecord being assembled. SUBMITTED: Class A submission to RT-03. ADMITTED: committed to RT-05 (immutable). HISTORICAL: superseded. REJECTED: RT-03 Gate failure.',
    }),

  }),

  validate(data) {
    return _validate('InterpretationRecord', InterpretationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('InterpretationRecord', InterpretationRecord.SCHEMA, InterpretationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT09 — BeliefObject
// Constitutional basis: R9-v1.0 RS-07 (RT09-OBJ-03); A0-v1.1.1 §3.10;
// D3 Epistemic Chain Stage 4 (Belief); RT09-INV-5 (no assumption-to-fact conversion);
// D8 PROH-6 (no assumption-to-fact); D5 §3.4 (confidence attributes)
//
// Third epistemic stage object. Formed from InterpretationRecord by assigning
// epistemic confidence attributes. Belief proposition and its confidence basis
// are required. Immutable after commitment. BeliefObject MUST carry justification
// before advancement to KnowledgeClaim — RT09-INV-5 (D8 PROH-6) forbids
// assumption-to-fact conversion.
// ─────────────────────────────────────────────────────────────────────────────

const BeliefObject = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'BeliefObject',
    runtime_id:       'RT-09',
    runtime_name:     'Knowledge Runtime',
    authority:        'R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10; D3 Epistemic Chain Stage 4 (Belief); D5 §3.4 (confidence attributes); RT09-INV-5 (no assumption-to-fact conversion); D8 PROH-6',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-07',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT09-INV-1', 'RT09-INV-2', 'RT09-INV-5'],
    constitutional_note: 'IMMUTABLE AFTER COMMITMENT. D3 Epistemic Chain Stage 4 — epistemic confidence assigned. interpretation_record_ref required (RT09-INV-1 chain). RT09-INV-5 (D8 PROH-6): a BeliefObject must carry confidence_basis before it may advance to a KnowledgeClaim — assumption-to-fact conversion without justification is constitutionally forbidden. epistemic_confidence_level and confidence_basis are both required fields enforcing RT09-INV-5.',
  }),

  SCHEMA: Object.freeze({

    belief_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.3 "unique BeliefObject ID"; A0-v1.1.1 §3.10',
      description: 'Unique constitutional identifier for this BeliefObject',
    }),

    interpretation_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-03 "provenance anchor: InterpretationRecord ID"; RT09-INV-1 chain; KI-007',
      description: 'InterpretationRecord.interpretation_id this BeliefObject is derived from. Establishes RT09-INV-1 chain: BeliefObject → InterpretationRecord → EvidenceObject → Observation Projection.',
    }),

    rt09_operation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-03 "RT-09 operation ID provenance anchor"',
      description: 'RT-09 operation identifier for this Belief formation operation.',
    }),

    epistemic_confidence_level: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.3 "confidence attributes present per D5 §3.4"; D5 §3.4; A0 §3.10 R3',
      description: 'Epistemic confidence level assigned to this BeliefObject per D5 §3.4 confidence attributes. Used as input for KnowledgeClaim validation gate and DKS-2 (Uncertain) classification.',
    }),

    confidence_basis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT09-INV-5 (no assumption-to-fact conversion); D8 PROH-6; R9-v1.0 RS-10.3',
      description: 'Explicit justification basis for the epistemic_confidence_level assignment. RT09-INV-5 enforcement: without a documented confidence basis a BeliefObject may not advance to a KnowledgeClaim. D8 PROH-6 forbids assumption-to-fact conversion.',
    }),

    belief_content: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-03 (product of D3 Epistemic Chain Stage 4 — belief proposition); A0 §3.10 R3',
      description: 'The belief proposition formed from the InterpretationRecord. Constitutional substance of the Stage 4 epistemic product.',
    }),

    domain_classification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Domain layer; D6 §5.2; R9-v1.0 RS-10.3',
      description: 'Domain identifier for this BeliefObject, inherited from the evidence chain.',
    }),

    temporal_validity_metadata: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D8 INV-5 (Temporal Awareness); RT09-INV-2; R9-v1.0 RS-10.3',
      description: 'Temporal validity metadata for this BeliefObject.',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Temporal layer; R9-v1.0 RS-10.3; D4 KI-026',
      description: 'ISO 8601 timestamp when this BeliefObject was formed.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['FORMING', 'SUBMITTED', 'ADMITTED', 'HISTORICAL', 'REJECTED'],
      constitutional_source: 'R9-v1.0 RS-10.3 lifecycle states',
      description: 'FORMING: BeliefObject being assembled. SUBMITTED: Class A to RT-03. ADMITTED: committed to RT-05 (immutable). HISTORICAL: superseded. REJECTED: RT-03 Gate failure.',
    }),

  }),

  validate(data) {
    return _validate('BeliefObject', BeliefObject.SCHEMA, data);
  },

  create(data) {
    return _create('BeliefObject', BeliefObject.SCHEMA, BeliefObject.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT09 — KnowledgeClaim
// Constitutional basis: R9-v1.0 RS-07 (RT09-OBJ-04); A0-v1.1.1 §3.10;
// D3 Epistemic Chain Stage 5 (Validation Gate EP-T4); D5 §3.2 Stage 5;
// KI-010 (KnowledgeClaim traceable to Observation through unbroken chain);
// KI-009 (no epistemic cycle); RT09-INV-4 (no simultaneous contradicting ACTIVE)
//
// Fourth and final epistemic chain object — the Knowledge Record. Formed from
// BeliefObject with explicit justification and validation attributes. D3 EP-T4
// Validation Gate must be satisfied before formation. ep_t4_validation_gate_satisfied
// must be true. KI-010: unbroken provenance chain to at least one Observation required.
// Immutable after commitment. May be REVOKED by RT-03 rollback (RC-1: RT-03 initiates).
// ─────────────────────────────────────────────────────────────────────────────

const KnowledgeClaim = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'KnowledgeClaim',
    runtime_id:       'RT-09',
    runtime_name:     'Knowledge Runtime',
    authority:        'R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10; D3 Epistemic Chain Stage 5 (EP-T4 Validation Gate); D5 §3.2 Stage 5; KI-009 (no epistemic cycle); KI-010 (traceable to Observation); RT09-INV-1 RT09-INV-4 RT09-INV-5; D8 INV-4 INV-7',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-07',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT09-INV-1', 'RT09-INV-2', 'RT09-INV-4', 'RT09-INV-5'],
    constitutional_note: 'IMMUTABLE AFTER COMMITMENT. D3 Epistemic Chain Stage 5 — Knowledge Record. ep_t4_validation_gate_satisfied must be true: D3 EP-T4 Validation Gate is required before KnowledgeClaim formation. KI-010: unbroken provenance chain from KnowledgeClaim through BeliefObject → InterpretationRecord → EvidenceObject → Observation Projection. RT09-INV-4: no two contradicting Knowledge Records in same domain may both be ACTIVE simultaneously without a ContradictionRecord. RT09-INV-5: justification required (D8 PROH-6 — no assumption-to-fact). May be REVOKED by RT-03 rollback (RC-1) — lifecycle_state REVOKED is final.',
  }),

  SCHEMA: Object.freeze({

    knowledge_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.4 "unique Knowledge Record ID"; A0-v1.1.1 §3.10; D8 §4.1 ONS-2 (sixth canonical type: Knowledge Record)',
      description: 'Unique constitutional identifier for this KnowledgeClaim (D8 §4.1 Knowledge Record)',
    }),

    belief_object_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-04 "provenance anchor: BeliefObject ID"; RT09-INV-1 chain; KI-007 KI-010',
      description: 'BeliefObject.belief_id this KnowledgeClaim is derived from. Establishes RT09-INV-1 chain step: KnowledgeClaim → BeliefObject. KI-010: unbroken chain must reach Observation Projection through this and prior links.',
    }),

    evidence_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A1 §6.2 "Knowledge Record anchors to Evidence Record ID(s)"; KI-010 (traceable to at least one Observation through unbroken chain); R9-v1.0 RS-07 RT09-OBJ-04',
      description: 'EvidenceObject.evidence_id(s) this KnowledgeClaim is grounded in. A1 §6.2 canonical provenance anchor: Knowledge Record anchors to (Evidence Record ID(s), RT-09 operation ID). KI-010 enforcement.',
    }),

    rt09_operation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A1 §6.2 (provenance anchor: Knowledge Record anchors to Evidence Record ID(s) + RT-09 operation ID)',
      description: 'RT-09 operation identifier for this Knowledge formation operation. A1 §6.2 canonical provenance anchor second component.',
    }),

    justification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.4 "justification attributes"; RT09-INV-5; D8 PROH-6 (no assumption-to-fact)',
      description: 'Explicit justification for advancing from BeliefObject to KnowledgeClaim. RT09-INV-5 enforcement: assumption-to-fact conversion without documented justification is constitutionally forbidden.',
    }),

    validation_attributes: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.4 "validation attributes"; D3 EP-T4 Validation Gate; A0 §3.10 R4',
      description: 'Validation evidence satisfying D3 EP-T4 Validation Gate. Documents what was verified to authorize formation of this KnowledgeClaim.',
    }),

    // CONSTITUTIONALLY REQUIRED: D3 EP-T4 Validation Gate
    ep_t4_validation_gate_satisfied: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D3 EP-T4 (Validation Gate — must be satisfied before KnowledgeClaim formation); R9-v1.0 RS-10.4; D5 §3.2 Stage 5',
      description: 'Must be true — attests that D3 EP-T4 Validation Gate was satisfied before this KnowledgeClaim was formed. A false or absent value is a constitutional violation.',
    }),

    domain_classification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Domain layer; D6 §5.2 (domain knowledge state — KnowledgeClaim drives DKS transitions); R9-v1.0 RS-10.4',
      description: 'Domain identifier for this KnowledgeClaim. Drives DKS state transitions in KnowledgeState for the named domain.',
    }),

    temporal_validity_metadata: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D8 INV-5 (Temporal Awareness); RT09-INV-2; R9-v1.0 RS-10.4',
      description: 'Temporal validity metadata for this KnowledgeClaim. Expiration may trigger DKS-4 (DEGRADED) transition.',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Temporal layer; R9-v1.0 RS-10.4; D4 KI-026',
      description: 'ISO 8601 timestamp when this KnowledgeClaim was formed (D5 §3.2 Stage 5 completion).',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['FORMING', 'SUBMITTED', 'ADMITTED', 'ACTIVE', 'UNCERTAIN', 'CONTESTED', 'DEGRADED', 'HISTORICAL', 'REJECTED', 'REVOKED'],
      constitutional_source: 'R9-v1.0 RS-10.4 lifecycle states; D6 §5.2 DKS mapping (ACTIVE=DKS-1; UNCERTAIN=DKS-2; CONTESTED=DKS-3; DEGRADED=DKS-4); A1 RC-1 (RT-03 may REVOKE)',
      description: 'FORMING/SUBMITTED/ADMITTED: admission pipeline. ACTIVE (DKS-1): current uncontradicted knowledge. UNCERTAIN (DKS-2): insufficient evidence for Active. CONTESTED (DKS-3): contradicting claim exists. DEGRADED (DKS-4): expired or contradicted. HISTORICAL: superseded. REJECTED: Gate failure. REVOKED: RT-03 rollback (RC-1 — irreversible).',
    }),

  }),

  validate(data) {
    return _validate('KnowledgeClaim', KnowledgeClaim.SCHEMA, data);
  },

  create(data) {
    return _create('KnowledgeClaim', KnowledgeClaim.SCHEMA, KnowledgeClaim.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT09 — KnowledgeState
// Constitutional basis: R9-v1.0 RS-07 (RT09-OBJ-05); A0-v1.1.1 §3.10 R5;
// D6 §5.2 (DKS-1 through DKS-4); RT09-INV-4 (no simultaneous contradicting ACTIVE)
//
// Per-domain DKS classification. One KnowledgeState per constitutional domain
// (12 instances). Updated on Knowledge Record admission and DKS transitions.
// Operational State — DKS transitions are internal to RT-09 (no separate Class A
// for each DKS transition). Transmitted as Class A output to RT-10 and RT-15.
//
// NOTE on dks_level enum: Wave plan task step specifies
// ['UNKNOWN','PARTIAL','BELIEVED','CONFIRMED']. R9-v1.0 RS-10.5 and D6 §5.2
// specify DKS-1 Active, DKS-2 Uncertain, DKS-3 Contested, DKS-4 Degraded.
// R-series governs over I1 planning. Enum: ['ACTIVE','UNCERTAIN','CONTESTED','DEGRADED'].
// ─────────────────────────────────────────────────────────────────────────────

const KnowledgeState = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'KnowledgeState',
    runtime_id:       'RT-09',
    runtime_name:     'Knowledge Runtime',
    authority:        'R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10 R5; D6 §5.2 (DKS-1 through DKS-4: Active/Uncertain/Contested/Degraded); RT09-INV-4; D8 §9.4 (Knowledge Layer mandatory MVCS)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-07',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT09-INV-4'],
    constitutional_note: 'UPDATABLE (DKS transitions are Operational State mutations internal to RT-09). One KnowledgeState per constitutional domain (12 instances). dks_level enum uses R9-canonical values per RS-10.5 and D6 §5.2 (ACTIVE/UNCERTAIN/CONTESTED/DEGRADED = DKS-1/2/3/4) — wave plan task step used different values; R-series governs. RT09-INV-4: contradiction_record_ref is required when dks_level=CONTESTED — two contradicting Knowledge Records in the same domain may never both be ACTIVE simultaneously without a ContradictionRecord. Transmitted as Class A output to RT-10 (PAIR 31) and RT-15 (PAIR 51).',
  }),

  SCHEMA: Object.freeze({

    knowledge_state_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-05 "unique KnowledgeState ID"; A0-v1.1.1 §3.10 R5',
      description: 'Unique constitutional identifier for this KnowledgeState instance',
    }),

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.10 R5 (RT-09 maintains Knowledge States for all twelve domains); D6 §5.2; A1 PAIR 51 (RT-15 coordination)',
      description: 'Identifier of the constitutional domain this KnowledgeState tracks. Must be one of the twelve constitutional domain identifiers (DOM-000001 through DOM-000012). RT-15 domain instance is the coordination partner.',
    }),

    // CONSTITUTIONALLY REQUIRED: DKS classification (D6 §5.2)
    dks_level: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'UNCERTAIN', 'CONTESTED', 'DEGRADED'],
      constitutional_source: 'D6 §5.2 (DKS-1 Active, DKS-2 Uncertain, DKS-3 Contested, DKS-4 Degraded); R9-v1.0 RS-10.5; RT09-INV-4',
      description: 'ACTIVE (DKS-1): current uncontradicted knowledge for this domain. UNCERTAIN (DKS-2): evidence insufficient for ACTIVE. CONTESTED (DKS-3): competing Knowledge Records exist — contradiction_record_ref required. DEGRADED (DKS-4): expired or internally contradicted. Note: wave plan specified different values; R9 RS-10.5 governs.',
    }),

    governing_knowledge_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.5 (KnowledgeState driven by Knowledge Record admission); D6 §5.2',
      description: 'KnowledgeClaim.knowledge_id of the current governing Knowledge Record that established or last transitioned this KnowledgeState.',
    }),

    last_transition_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Temporal layer; D8 INV-5; R9-v1.0 RS-10.5',
      description: 'ISO 8601 timestamp of the most recent DKS state transition for this domain.',
    }),

    // Optional: required only when dks_level='CONTESTED' (RT09-INV-4)
    contradiction_record_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT09-INV-4 (two contradicting Knowledge Records may never both be ACTIVE simultaneously without a ContradictionRecord); R9-v1.0 RS-10.5; D8 INV-7',
      description: 'ContradictionRecord.contradiction_id associated with this CONTESTED state. Present when dks_level=CONTESTED — absence with dks_level=CONTESTED is a RT09-INV-4 violation. Absent for ACTIVE/UNCERTAIN/DEGRADED states.',
    }),

  }),

  validate(data) {
    return _validate('KnowledgeState', KnowledgeState.SCHEMA, data);
  },

  create(data) {
    return _create('KnowledgeState', KnowledgeState.SCHEMA, KnowledgeState.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT09 — ContradictionRecord
// Constitutional basis: R9-v1.0 RS-07 (RT09-OBJ-06); A0-v1.1.1 §3.10 R6 R11;
// D8 INV-7 (Coherence Preservation); RT09-INV-3; A1 RC-3 (may be superseded)
//
// Class B Kernel Manifest output. Created when a contradiction between knowledge
// objects is detected during Evidence integration (O9-11 — mandatory on every
// Evidence integration). RT-09 DETECTS and RECORDS contradictions. RT-09 does
// NOT resolve contradictions — resolution authority is constitutionally undefined
// (RS-12 Open Question). Entries are permanent; may be superseded by future
// resolution records if resolution authority is constitutionally established.
// ─────────────────────────────────────────────────────────────────────────────

const ContradictionRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ContradictionRecord',
    runtime_id:       'RT-09',
    runtime_name:     'Knowledge Runtime',
    authority:        'R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10 R6 R11; D8 INV-7 (Coherence Preservation); RT09-INV-3; A1 RC-3; D4 Class B KOM',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-07',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT09-INV-3'],
    constitutional_note: 'IMMUTABLE AND PERMANENT (A1 RC-3). RT-09 DETECTS and RECORDS contradictions — RT-09 does NOT resolve contradictions. Resolution authority is constitutionally undefined in the current constitutional record (RS-12 Open Question). Class B Kernel Manifest output committed via RT-03. Prior records persist permanently; may be superseded (superseded_by_ref field) if constitutional resolution authority is established by future amendment. Mandatory detection: O9-11 requires RT09-PROC-04 (Contradiction Detection) to run on every Evidence integration without exception.',
  }),

  SCHEMA: Object.freeze({

    contradiction_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.6 "unique ContradictionRecord ID"; A0-v1.1.1 §3.10 R6',
      description: 'Unique constitutional identifier for this ContradictionRecord',
    }),

    conflicting_knowledge_record_ref_a: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.6 "identifies at least two conflicting knowledge objects"; RT09-INV-3; D8 INV-7',
      description: 'KnowledgeClaim.knowledge_id of the first conflicting Knowledge Record. Both conflicting records must be identified (RS-10.6 validity condition).',
    }),

    conflicting_knowledge_record_ref_b: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.6 "identifies at least two conflicting knowledge objects"; RT09-INV-3; D8 INV-7',
      description: 'KnowledgeClaim.knowledge_id of the second conflicting Knowledge Record. Must be distinct from conflicting_knowledge_record_ref_a.',
    }),

    rt09_operation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-06 "provenance anchor: RT-09 operation ID"; A1 RC-3',
      description: 'RT-09 operation identifier for the Evidence integration cycle that detected this contradiction.',
    }),

    contradiction_type: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.6; D8 INV-7 (Coherence Preservation — type of coherence violation)',
      description: 'Classification of the type of contradiction detected between the two conflicting Knowledge Records.',
    }),

    domain_classification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Domain layer; D6 §5.2 (DKS-3 CONTESTED triggered by contradiction); R9-v1.0 RS-10.6',
      description: 'Domain identifier of the domain in which this contradiction was detected. Triggers DKS-3 (CONTESTED) transition for this domain.',
    }),

    detection_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.6 "timestamp of detection present" (validity condition)',
      description: 'ISO 8601 timestamp when this contradiction was detected during Evidence integration.',
    }),

    // Optional: only present if superseded by a later ContradictionRecord
    superseded_by_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'A1 RC-3 (ContradictionRecords may be superseded by resolution-type records if resolution authority is constitutionally established; prior records persist)',
      description: 'ContradictionRecord.contradiction_id that supersedes this record, if a constitutional resolution authority has been established (RS-12 Open Question). Absent when not superseded. Prior ContradictionRecords persist regardless.',
    }),

  }),

  validate(data) {
    return _validate('ContradictionRecord', ContradictionRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ContradictionRecord', ContradictionRecord.SCHEMA, ContradictionRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT09 — RealityGapEntry
// Constitutional basis: R9-v1.0 RS-07 (RT09-OBJ-07); A0-v1.1.1 §3.10 R7 R12;
// D4 KI-023 (expected Observation not received within Observation Feedback Window);
// D4 Class B KOM; O9-07 O9-12
//
// Class B Kernel Manifest output. Created when: (a) new observations reveal gaps
// in existing knowledge (O9-12); (b) expected Observation not received within
// Observation Feedback Window (KI-023). Immutable; permanent entries in Reality
// Gap Register. RT-09 RECORDS gaps — does not resolve them.
// ─────────────────────────────────────────────────────────────────────────────

const RealityGapEntry = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'RealityGapEntry',
    runtime_id:       'RT-09',
    runtime_name:     'Knowledge Runtime',
    authority:        'R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10 R7 R12; D4 KI-023 (Observation Feedback Window); D4 KI-029; D4 Class B KOM; O9-07 O9-12',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-07',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT09-INV-2'],
    constitutional_note: 'IMMUTABLE AND PERMANENT. Class B Kernel Manifest output committed via RT-03. Triggered by: (a) D4 KI-023 — expected Observation not received within Observation Feedback Window (triggering_condition=OBSERVATION_ABSENCE, triggering_observation_ref absent); (b) O9-12 — new observations reveal gaps in existing knowledge (triggering_observation_ref present). RT-09 RECORDS reality gaps — does not resolve them. Entries persist in the Reality Gap Register permanently.',
  }),

  SCHEMA: Object.freeze({

    gap_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.7 "unique RealityGapEntry ID"; A0-v1.1.1 §3.10 R7',
      description: 'Unique constitutional identifier for this RealityGapEntry',
    }),

    gap_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.7 "identifies a specific gap between current knowledge and external reality" (validity condition)',
      description: 'Description of the specific gap between current RT-09 knowledge and external reality.',
    }),

    // CONSTITUTIONALLY REQUIRED: triggering condition (KI-023 or O9-12)
    triggering_condition: Object.freeze({
      required: true, type: 'string',
      enum: ['OBSERVATION_ABSENCE', 'KNOWLEDGE_CONFLICT', 'OBSERVATION_CONTRADICTS_KNOWLEDGE'],
      constitutional_source: 'D4 KI-023 (OBSERVATION_ABSENCE — expected Observation not received); O9-12 (KNOWLEDGE_CONFLICT, OBSERVATION_CONTRADICTS_KNOWLEDGE); R9-v1.0 RS-07 RT09-OBJ-07',
      description: 'OBSERVATION_ABSENCE: D4 KI-023 trigger — expected Observation not received within Observation Feedback Window (triggering_observation_ref absent). KNOWLEDGE_CONFLICT: O9-12 — gap revealed by contradictions in existing knowledge. OBSERVATION_CONTRADICTS_KNOWLEDGE: O9-12 — new observation directly contradicts existing knowledge.',
    }),

    // Optional: absent for KI-023 OBSERVATION_ABSENCE trigger
    triggering_observation_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-07 "provenance anchor to triggering condition"; D4 KI-023; O9-12',
      description: 'ObservationRecord.record_id or ConsequenceObservationRecord.record_id that triggered this Reality Gap detection. Absent when triggering_condition=OBSERVATION_ABSENCE (gap triggered by absence of expected observation per KI-023).',
    }),

    affected_domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D6 §5.2 (domain knowledge state); A0-v1.1.1 §3.10 R7; R9-v1.0 RS-10.7',
      description: 'Domain identifier of the constitutional domain where this reality gap was identified.',
    }),

    rt09_operation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-07 "provenance anchor: RT-09 operation ID"',
      description: 'RT-09 operation identifier for the operation cycle that detected this reality gap.',
    }),

    detection_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Temporal layer; R9-v1.0 RS-10.7; D8 INV-5',
      description: 'ISO 8601 timestamp when this reality gap was detected.',
    }),

    knowledge_state_at_detection: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-07 RT09-OBJ-07; D6 §5.2 (DKS context at time of detection); D8 INV-5',
      description: 'DKS state of the affected domain at the time this reality gap was detected. Provides context for gap severity assessment.',
    }),

  }),

  validate(data) {
    return _validate('RealityGapEntry', RealityGapEntry.SCHEMA, data);
  },

  create(data) {
    return _create('RealityGapEntry', RealityGapEntry.SCHEMA, RealityGapEntry.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT09 — EpistemicProtocol
// Constitutional basis: R9-v1.0 RS-07 (RT09-OBJ-08); A0-v1.1.1 §3.10;
// D6 §4.3 (AIR-2 obligation: apply only registered, versioned interpretation protocols)
//
// Governance/registry object. Each EpistemicProtocol is a registered, versioned
// interpretation or inference protocol that RT-09 AIR-2 holders are authorized to
// apply. D6 §4.3 AIR-2 prohibitions: (a) may not create new protocols without
// constitutional registration; (b) may not suppress interpretive uncertainty.
// Registration authority is constitutionally undefined (RS-12 Open Question).
// Prior versions retained for provenance tracing. Not structural_immutable —
// new versions are registered while prior versions are SUPERSEDED (retained).
// ─────────────────────────────────────────────────────────────────────────────

const EpistemicProtocol = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'EpistemicProtocol',
    runtime_id:       'RT-09',
    runtime_name:     'Knowledge Runtime',
    authority:        'R9-v1.0 RS-07 RS-10; A0-v1.1.1 §3.10; D6 §4.3 (AIR-2 obligation: registered versioned protocols only); RS-12 Open Question (registration authority undefined)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-07',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'VERSIONED — NOT structurally immutable. New versions create new EpistemicProtocol records; prior versions are SUPERSEDED and retained for provenance tracing (a BeliefObject referencing a SUPERSEDED protocol must still be traceable). D6 §4.3 AIR-2 prohibitions: RT-09 may not create new protocols without constitutional registration; may not suppress interpretive uncertainty. REGISTRATION AUTHORITY UNDEFINED: RS-12 Open Question — the specific constitutional actor authorized to register EpistemicProtocols is not defined in the current constitutional record. Any implementation must preserve this limitation until a constitutional amendment defines the registration authority.',
  }),

  SCHEMA: Object.freeze({

    protocol_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.8 "versioned; registration through constitutionally authorized process"; D6 §4.3',
      description: 'Unique constitutional identifier for this EpistemicProtocol. Used as reference in EvidenceObject.interpretation_protocol_ref and InterpretationRecord.inference_protocol_ref.',
    }),

    protocol_version: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D6 §4.3 (AIR-2 obligation: record which protocol version was applied); R9-v1.0 RS-10.8',
      description: 'Version identifier for this EpistemicProtocol. D6 §4.3 AIR-2 requires that the applied protocol version is recorded in every EvidenceObject and InterpretationRecord.',
    }),

    protocol_type: Object.freeze({
      required: true, type: 'string',
      enum: ['INTERPRETATION', 'INFERENCE', 'VALIDATION'],
      constitutional_source: 'D6 §4.3 (interpretation protocols); R9-v1.0 RS-07 RT09-OBJ-08; D3 Epistemic Chain Stages 2–5',
      description: 'INTERPRETATION: applied during EvidenceObject formation (D3 Stage 2; D5 §3.2 Stage 4). INFERENCE: applied during InterpretationRecord formation (D3 Stage 3). VALIDATION: applied during KnowledgeClaim Validation Gate (D3 EP-T4 Stage 5).',
    }),

    protocol_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D6 §4.3 (AIR-2 obligation: apply only registered, versioned interpretation protocols — registration requires documented specification)',
      description: 'Description of the interpretation, inference, or validation methodology this protocol implements.',
    }),

    registration_status: Object.freeze({
      required: true, type: 'string',
      enum: ['CURRENT', 'SUPERSEDED'],
      constitutional_source: 'R9-v1.0 RS-10.8 "versioned; prior versions remain accessible for provenance tracing"; D6 §4.3',
      description: 'CURRENT: this version is the active, constitutionally registered protocol version. SUPERSEDED: this version has been replaced by a newer version — retained for provenance tracing only; RT-09 may not apply SUPERSEDED protocols to new operations.',
    }),

    registration_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Temporal layer; R9-v1.0 RS-10.8; D6 §4.3',
      description: 'ISO 8601 timestamp when this EpistemicProtocol was registered.',
    }),

    // Optional: only present when this version has been superseded
    superseded_by_version: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R9-v1.0 RS-10.8 "new versions registered; prior versions remain accessible"; D6 §4.3',
      description: 'protocol_version of the EpistemicProtocol that supersedes this version. Present only when registration_status=SUPERSEDED.',
    }),

  }),

  validate(data) {
    return _validate('EpistemicProtocol', EpistemicProtocol.SCHEMA, data);
  },

  create(data) {
    return _create('EpistemicProtocol', EpistemicProtocol.SCHEMA, EpistemicProtocol.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  EvidenceObject,
  InterpretationRecord,
  BeliefObject,
  KnowledgeClaim,
  KnowledgeState,
  ContradictionRecord,
  RealityGapEntry,
  EpistemicProtocol,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-09',
  WAVE:        'W1-07',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
