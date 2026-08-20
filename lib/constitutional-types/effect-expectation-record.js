'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/effect-expectation-record.js
// Task: W1-11 — RT-13 Action Runtime Type Definitions
// Runtime: RT-13 — Action Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-27
// Authority: A0-v1.1.1 §3.14; R13-v1.0-canonical.md RS-01 RS-07 RS-20;
//            D5-v1.0-canonical.md Part 4 §4.2 (APL); D5 PI-2 PI-6 PI-8 PI-11;
//            D5 §4.3 (Projection Responsibility Principle);
//            D8-v1.0 INV-1 INV-2 INV-5; D8 PROH-3 PROH-4 PROH-5 PROH-7;
//            RT13-INV-1 through RT13-INV-7
//
// ─── SECTION NUMBER DISCREPANCY NOTE ─────────────────────────────────────────
// D-1 (Type C — Implementation Interpretation):
//   Index.js stub comment cites "A0-v1.1.1 §3.13–3.14" for RT-13/RT-14.
//   RT-13's constitutional seat is A0 §3.14 (R13-v1.0 RS-01).
//   RT-14's constitutional seat is A0 §3.15 (R14-v1.0 RS-01).
//   Same off-by-one artifact as W1-04 W1-07 W1-08 W1-09 W1-10 W1-12 W1-14.
//   CONSTITUTIONAL blocks use §3.14 per R13-v1.0 RS-01.
//
// ─── FILE NAME DISCREPANCY NOTE ──────────────────────────────────────────────
// D-2 (Type A — Planning Document File Name Choice):
//   Wave plan W1-11 specifies `consequence-observation-record.js` for RT-14.
//   ConsequenceObservationRecord is RT-08 owned (A0 §3.9; W1-06 observation-record.js).
//   RT-14's primary owned type is ObservedConsequenceRecord (A0 §3.15 Owned Objects).
//   Wave plan file name would create conceptual confusion with RT-08's type space.
//   RT-14 implemented in `observed-consequence-record.js` to reflect RT-14 ownership.
//   No constitutional prohibition; naming choice only.
//
// ─── NAMING CONFLICT NOTE (RT-13 CANONICAL NAME) ─────────────────────────────
// D-3 (Type C — Per R13-v1.0 RS-12 Conflict C-1):
//   A1 §3.0 and R0 §5.8 RNS-1 name RT-13 "Action Projection Runtime."
//   A0 §3.14 canonical name is "Action Runtime." A0 governs.
//   CONSTITUTIONAL blocks use "Action Runtime" throughout.
//
// ─── OWNERSHIP BOUNDARY ──────────────────────────────────────────────────────
// RT-13 OWNS (implemented here):
//   ActionProjection, EffectExpectationRecord, IrreversibilityClassificationRecord,
//   ProjectionResponsibilityRecord, ProjectionBoundaryCrossingRecord
//
// RT-13 DOES NOT OWN:
//   CivilizationalDecision — RT-12 (A0 §3.13; input to RT-13)
//   ObservedConsequenceRecord — RT-14 (A0 §3.15)
//   CausalModelDivergenceRecord — RT-14 (A0 §3.15)
//   ConsequenceObservationRecord — RT-08 (A0 §3.9)
//   OpenActionRegisterEntry — RT-12 (A0 §3.13)
//
// RT-13 DOES NOT DO:
//   Form CivilizationalDecisions (RT-12 exclusive — A0 §3.13)
//   Deliberate (RT-11 exclusive — A0 §3.12)
//   Observe consequences (RT-14/RT-08 — A0 §3.15/§3.9)
//   Assign terminal status to OAR entries (RT-14 exclusive — RT12-INV-5)
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT13 — ActionProjection
// Constitutional basis: A0-v1.1.1 §3.14 R2 R3 R7 R8 R11 Owned Objects;
// R13-v1.0-canonical.md RS-07 RS-10 RS-11 RS-20;
// D5-v1.0-canonical.md §4.2 (seven-stage APL — D5 is primary source, A0 governs count);
// RT13-INV-1 (no crossing without irreversibility classification);
// RT13-INV-2 (no crossing without EffectExpectationRecord);
// RT13-INV-3 (no crossing without Projection Authority and six-gate Kernel processing);
// RT13-INV-6 (internal AP object ≠ external action effect — D5 PI-2);
// D8-v1.0 INV-1 (constitutional traceability), INV-2 (provenance), INV-5 (temporal);
// D8 PROH-3 (no RT-03 bypass), PROH-8 (no hidden authority pathways)
//
// The internal constitutional representation of an authorized action. RT-13 forms
// one ActionProjection per authorized CivilizationalDecision requiring external reality
// projection (A0 §3.14 R2). The AP progresses through all seven APL stages defined in
// D5 §4.2. Stage 4 (EXTERNAL_ACTION_PROJECTION) may only be crossed when RT13-INV-1,
// RT13-INV-2, RT13-INV-3 are all satisfied (D8 CLI-2: no short-circuit).
//
// CRITICAL: D5 PI-2 and RT13-INV-6: the ActionProjection is NEVER the external effect.
// The AP is a URO object within the Reality Fabric; the external effect is in external
// reality. These must never be conflated in any implementation.
//
// Not structurally immutable — progresses through seven APL lifecycle stages.
// ─────────────────────────────────────────────────────────────────────────────

const ActionProjection = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ActionProjection',
    runtime_id:       'RT-13',
    runtime_name:     'Action Runtime',
    authority:        'A0-v1.1.1 §3.14 R2 R3 R7 R8 R11 Owned Objects; R13-v1.0-canonical.md RS-07 RS-10 RS-11; D5-v1.0-canonical.md §4.2 (seven-stage APL); RT13-INV-1 RT13-INV-2 RT13-INV-3 RT13-INV-6; D8-v1.0 INV-1 INV-2 INV-5 PROH-3 PROH-8',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-11',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT13-INV-1', 'RT13-INV-2', 'RT13-INV-3', 'RT13-INV-6'],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — progresses through seven APL lifecycle stages (D5 §4.2). RT-13 forms and OWNS this object (A0 §3.14 Owned Objects). CRITICAL: D5 PI-2 and RT13-INV-6: this internal object must NEVER be conflated with the external action effect — the AP exists within the Reality Fabric; the effect exists in external reality. Stage 4 (EXTERNAL_ACTION_PROJECTION) may only be crossed when: RT13-INV-1 (IrreversibilityClassificationRecord formed), RT13-INV-2 (EffectExpectationRecord registered), RT13-INV-3 (Projection Authority validated + six RT-03 gates passed) are all satisfied. D8 PROH-3: no RT-03 bypass is constitutionally permissible. RT13-INV-7: cross-domain projections require cross-domain authorization from RT-03 (D5 PI-11). RT13-INV-6: the AP object and the external effect are categorically distinct — implementation must never merge them. D8 INV-5 (Temporal Awareness): formation_timestamp and stage timestamps are constitutional records. D8 INV-1: every AP must trace to an authorized CivilizationalDecision (decision_ref), which traces to a DeliberationRecord, which traces to ObservationRecords.',
  }),

  SCHEMA: Object.freeze({

    action_projection_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 Owned Objects; R13-v1.0-canonical.md RS-07; D8-v1.0 TI-1 (Identity Invariance — unique immutable ID required)',
      description: 'Unique constitutional identifier for this ActionProjection. Anchors all downstream RT-13, RT-14, and RT-08 objects (TI-1). Must be preserved without alteration across all constitutional object representations (D8 TI-1).',
    }),

    decision_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 R1 "Receive authorized CivilizationalDecisions from RT-12"; R13-v1.0-canonical.md RS-08; D8-v1.0 INV-1 (Constitutional Traceability); D8 INV-2 (Provenance Preservation)',
      description: 'Reference to CivilizationalDecision.decision_id (RT-12 owned; A0 §3.13) that authorized this ActionProjection. D8 INV-1: every AP must trace to an authorized CivilizationalDecision. D8 INV-4 (Reality Grounding): the referenced Decision must trace to an Understanding Model grounded in ObservationRecords. RT-13 may not form an ActionProjection without a valid Decision reference (A0 §3.14 R1).',
    }),

    lifecycle_stage: Object.freeze({
      required: true, type: 'string',
      enum: ['DECISION_RECEIPT', 'AUTHORITY_VALIDATION', 'CIVILIZATIONAL_ACTION', 'EXTERNAL_ACTION_PROJECTION', 'EXTERNAL_EFFECT', 'OBSERVED_CONSEQUENCE_TRIGGER', 'REALITY_FABRIC_UPDATE_TRIGGER', 'GATE_REJECTED'],
      constitutional_source: 'D5-v1.0-canonical.md §4.2 (seven APL stages); A0-v1.1.1 §3.14 R3; R13-v1.0-canonical.md RS-11; D8-v1.0 CLI-2 (No Short-Circuit); RT13-INV-1 RT13-INV-2 RT13-INV-3',
      description: 'Current stage in the seven-stage Action Projection Lifecycle (D5 §4.2; A0 §3.14 R3). DECISION_RECEIPT: authorized CivilizationalDecision received from RT-12. AUTHORITY_VALIDATION: ActionProjection formed; Projection Authority validation with RT-02 in progress. CIVILIZATIONAL_ACTION: authority validated; irreversibility classification and EER registration required before advancing. EXTERNAL_ACTION_PROJECTION: all Stage 4 prerequisites met (RT13-INV-1, RT13-INV-2, RT13-INV-3); Projection Boundary crossing in progress. EXTERNAL_EFFECT: Projection Boundary crossed; external effect emitted. OBSERVED_CONSEQUENCE_TRIGGER: RT-08 notified (RT13-INV-5); EER delivered to RT-14 via RT-05. REALITY_FABRIC_UPDATE_TRIGGER: ProjectionResponsibilityRecord assigned (RT13-INV-4); ProjectionBoundaryCrossingRecord delivered to RT-07. GATE_REJECTED: RT-03 rejected at one or more gates; Stage 4 constitutionally blocked.',
    }),

    domain: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 R2 R14; R13-v1.0-canonical.md RS-05 R12; D5 PI-11; RT13-INV-7',
      description: 'Primary target domain for this ActionProjection. RT13-INV-7 (D5 PI-11): cross-domain projections require cross-domain authorization from RT-03 before Stage 4. If is_cross_domain = true, cross_domain_authorization_ref must be present.',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R13-v1.0-canonical.md RS-11 RS-30; D8-v1.0 INV-5 (Temporal Awareness); D8 CLI-4 (Temporal Coherence); D8 PROH-6',
      description: 'ISO 8601 timestamp when RT-13 formed this ActionProjection. D8 CLI-4 (Temporal Coherence): formation_timestamp must follow the CivilizationalDecision formation_timestamp. D8 PROH-6: may not be backdated. Anchors the temporal provenance chain.',
    }),

    is_cross_domain: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D5-v1.0 PI-11 (Civilizational Scope); RT13-INV-7; A0-v1.1.1 §3.14 R14',
      description: 'Indicates whether this ActionProjection targets multiple constitutional domains. RT13-INV-7 (D5 PI-11): if true, cross-domain authorization records from RT-03 must be obtained before Stage 4 crossing. A false value confirms the projection is single-domain and RT13-INV-7 scope check is satisfied.',
    }),

    // Optional fields — present at advancing lifecycle stages
    irreversibility_classification_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT13-INV-1; D5 PI-8; A0-v1.1.1 §3.14 R4; R13-v1.0-canonical.md RS-07',
      description: 'Reference to IrreversibilityClassificationRecord.icr_id formed for this ActionProjection. Present from CIVILIZATIONAL_ACTION stage onward. RT13-INV-1: Stage 4 (EXTERNAL_ACTION_PROJECTION) may not be entered without this reference. D5 PI-8: irreversibility classification is constitutional and cannot be deferred.',
    }),

    effect_expectation_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT13-INV-2; A0-v1.1.1 §3.14 R5; R13-v1.0-canonical.md RS-07',
      description: 'Reference to EffectExpectationRecord.eer_id registered for this ActionProjection. Present from CIVILIZATIONAL_ACTION stage onward. RT13-INV-2: Stage 4 may not be entered without this reference. The EER is delivered to RT-14 via RT-05 after Stage 4 crossing (A0 §3.14 Runtime Outputs).',
    }),

    authority_resolution_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT13-INV-3; A0-v1.1.1 §3.14 R6; D8 PROH-3 (No Authority Bypass); R13-v1.0-canonical.md RS-27',
      description: 'Reference to RT-02 AuthorityResolutionResult.result_id confirming Projection Authority (AIR-4). Present from AUTHORITY_VALIDATION stage onward. RT13-INV-3: Stage 4 requires Projection Authority validation. D8 PROH-3: no Projection Boundary crossing without RT-02 authority validation.',
    }),

    gate_processing_result_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT13-INV-3; A0-v1.1.1 §3.14 R7; D4 §2.1 (KMP); R13-v1.0-canonical.md RS-27',
      description: 'Reference to RT-03 GateProcessingResult.result_id confirming all six constitutional gates passed. Present when lifecycle_stage is EXTERNAL_ACTION_PROJECTION or later. RT13-INV-3: no Projection Boundary crossing without full six-gate Kernel processing. D8 CLI-2: gates may not be short-circuited.',
    }),

    projection_boundary_crossing_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 Produced Objects; R13-v1.0-canonical.md RS-07 RS-09; D8-v1.0 INV-2',
      description: 'Reference to ProjectionBoundaryCrossingRecord.pbcr_id created at Stage 4. Present when lifecycle_stage is EXTERNAL_EFFECT or later. Establishes provenance of the Projection Boundary crossing for D8 INV-2 (Provenance Preservation).',
    }),

    cross_domain_authorization_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT13-INV-7; D5 PI-11; A0-v1.1.1 §3.14 R14; R13-v1.0-canonical.md RS-05 R14',
      description: 'Reference to RT-03 cross-domain authorization records. Required when is_cross_domain = true before Stage 4 crossing (RT13-INV-7; D5 PI-11). Absent when is_cross_domain = false. RT-13 may not cross the Projection Boundary into multiple domains without cross-domain authorization from RT-03.',
    }),

  }),

  validate(data) {
    return _validate('ActionProjection', ActionProjection.SCHEMA, data);
  },

  create(data) {
    return _create('ActionProjection', ActionProjection.SCHEMA, ActionProjection.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT13 — EffectExpectationRecord (EER)
// Constitutional basis: A0-v1.1.1 §3.14 R5 Owned Objects;
// R13-v1.0-canonical.md RS-07 RS-09; RT13-INV-2;
// D8-v1.0 INV-2 (Provenance Preservation); D8-v1.0 INV-5 (Temporal Awareness);
// D8-v1.0 INV-6 (Feedback Requirement — EER anchors the observation window);
// D8 TI-2 (Attribute Invariance — mandatory attributes listed)
//
// Formed and registered by RT-13 before every Projection Boundary crossing (RT13-INV-2).
// Records what effects were expected from the ActionProjection — delivered to RT-14
// via RT-05 after Stage 4 crossing for consequence comparison (A0 §3.14 Runtime Outputs;
// A1 PAIR 48 forbids direct RT-13 → RT-14 communication; routing is via RT-03 → RT-05).
//
// RT-14 consumes this object for ObservedConsequenceRecord formation; RT-14 does NOT own it.
// Structurally immutable — expectations cannot be revised after Stage 4 crossing (D5 PI-7).
// D8 PROH-6 (No Assumption-to-Fact Conversion): EER must never be treated as equivalent
// to an ObservedConsequenceRecord (what was expected ≠ what actually happened).
// ─────────────────────────────────────────────────────────────────────────────

const EffectExpectationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'EffectExpectationRecord',
    runtime_id:       'RT-13',
    runtime_name:     'Action Runtime',
    authority:        'A0-v1.1.1 §3.14 R5 Owned Objects; R13-v1.0-canonical.md RS-07 RS-09; RT13-INV-2; D8-v1.0 INV-2 INV-5 INV-6 PROH-6 TI-2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-11',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT13-INV-2'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — expectations cannot be revised after Stage 4 crossing (D5 PI-7: reality is the truth, not the plan). RT-13 OWNS this object (A0 §3.14 Owned Objects). RT13-INV-2: every Action Projection must have an EffectExpectationRecord registered BEFORE Stage 4 (Projection Boundary crossing). Stage 4 is constitutionally blocked without it. Delivered to RT-14 via RT-03 → RT-05 (NOT directly — A1 PAIR 48 forbids direct RT-13 → RT-14). D8 PROH-6 (No Assumption-to-Fact Conversion): this record represents expected effects ONLY — it must never be treated as equivalent to an ObservedConsequenceRecord (what actually happened). RT-14 uses this record for comparison; RT-14 does NOT own it. D8 INV-6 (Feedback Requirement): the effect_observation_window anchors the constitutional obligation for RT-14 to form an Observed Consequence within that window. D8 INV-5: formation_timestamp must precede Stage 4 crossing timestamp.',
  }),

  SCHEMA: Object.freeze({

    eer_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 Owned Objects; R13-v1.0-canonical.md RS-07; D8-v1.0 TI-1 (Identity Invariance)',
      description: 'Unique constitutional identifier for this EffectExpectationRecord. Anchors the consequence comparison chain (D8 TI-3 Relationship Invariance): RT-14\'s ObservedConsequenceRecord must maintain its relationship to this EER.',
    }),

    action_projection_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R13-v1.0-canonical.md RS-09 RS-07; A0-v1.1.1 §3.14 R5; D8-v1.0 INV-2 (Provenance Preservation); D8 TI-2 TI-3',
      description: 'Reference to ActionProjection.action_projection_id for which these effect expectations are registered. D8 INV-2: provenance chain from ActionProjection through EER through ObservedConsequenceRecord must be preserved. RT13-INV-2: this EER must be registered before the referenced ActionProjection crosses Stage 4.',
    }),

    expected_effects_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 R5; R13-v1.0-canonical.md RS-07; D8-v1.0 TI-2 (Attribute Invariance — expected effects must be stated)',
      description: 'Constitutional description of the effects expected from the ActionProjection in external reality. This is the "expectation" that RT-14 compares against the ConsequenceObservationRecord (RT-08 formed). D5 PI-7: if external reality diverges from this description, reality is the truth — this description is never revised post-crossing.',
    }),

    effect_observation_window: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D8-v1.0 INV-6 (Feedback Requirement: every Action Projection must produce an Observed Consequence within its Effect Observation Window); R13-v1.0-canonical.md RS-05 R12; D5 PI-12 (Feedback Completion); RT14-INV-1',
      description: 'The constitutional window within which RT-14 must form an ObservedConsequenceRecord for this ActionProjection. D8 INV-6: RT-14 must monitor this window; expiration without Observed Consequence formation triggers the Broken Feedback Protocol (D5 §8.4 BFP-1 through BFP-4) and the LOST terminal state. RT14-INV-6 monitoring anchors to this window.',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT13-INV-2; D8-v1.0 INV-5 (Temporal Awareness); D8 TI-5 (Temporal Invariance); D8 CLI-4 (Temporal Coherence)',
      description: 'ISO 8601 timestamp when this EffectExpectationRecord was registered. D8 INV-5: this timestamp must precede the ActionProjection Stage 4 crossing timestamp (RT13-INV-2 temporal enforcement). D8 PROH-6: may not be backdated.',
    }),

  }),

  validate(data) {
    return _validate('EffectExpectationRecord', EffectExpectationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('EffectExpectationRecord', EffectExpectationRecord.SCHEMA, EffectExpectationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT13 — IrreversibilityClassificationRecord (ICR)
// Constitutional basis: A0-v1.1.1 §3.14 R4 Owned Objects;
// R13-v1.0-canonical.md RS-07; RT13-INV-1; D5-v1.0-canonical.md PI-8;
// D8-v1.0 INV-2 INV-5 PROH-4 PROH-5
//
// The constitutional classification of each ActionProjection's reversibility.
// Must be formed BEFORE Stage 4 (RT13-INV-1; D5 PI-8): "Every CivilizationalAction
// must carry a reversibility classification before Stage 4."
// Classification is constitutional and cannot be deferred.
//
// Irreversible actions require elevated authorization thresholds (D4 authority rules).
// Once formed, structurally immutable — the classification is a constitutional record
// of the decision made before crossing, not a revision point.
// ─────────────────────────────────────────────────────────────────────────────

const IrreversibilityClassificationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'IrreversibilityClassificationRecord',
    runtime_id:       'RT-13',
    runtime_name:     'Action Runtime',
    authority:        'A0-v1.1.1 §3.14 R4 Owned Objects; R13-v1.0-canonical.md RS-07; RT13-INV-1; D5-v1.0 PI-8; D8-v1.0 INV-2 INV-5 PROH-4 PROH-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-11',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT13-INV-1'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — classification is a constitutional record made before crossing; may not be revised post-Stage 4. RT-13 OWNS this object (A0 §3.14 Owned Objects). RT13-INV-1 (D5 PI-8): this record MUST be formed before every Projection Boundary crossing. Stage 4 is constitutionally blocked without it. Classification is constitutional — not performative, not advisory, not deferrable (D5 PI-8). IRREVERSIBLE actions: D8 IC-3 applies — after Projection Boundary crossing, irreversible actions cannot be recalled. Elevated authorization thresholds required for IRREVERSIBLE per D4 authority rules. D8 PROH-4 (No Provenance Suppression): this record may not be suppressed or truncated. D8 PROH-5: may not be deleted — permanent constitutional record. D8 INV-5 (Temporal Awareness): classification_timestamp must precede Stage 4 crossing timestamp.',
  }),

  SCHEMA: Object.freeze({

    icr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 Owned Objects; R13-v1.0-canonical.md RS-07; D8-v1.0 TI-1',
      description: 'Unique constitutional identifier for this IrreversibilityClassificationRecord.',
    }),

    action_projection_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT13-INV-1; A0-v1.1.1 §3.14 R4; R13-v1.0-canonical.md RS-07; D8-v1.0 INV-2',
      description: 'Reference to ActionProjection.action_projection_id being classified. RT13-INV-1: Stage 4 of the referenced ActionProjection may not proceed without this classification record. D8 INV-2: provenance chain from ActionProjection through this ICR must be preserved.',
    }),

    reversibility_classification: Object.freeze({
      required: true, type: 'string',
      enum: ['REVERSIBLE', 'IRREVERSIBLE', 'CONDITIONALLY_REVERSIBLE'],
      constitutional_source: 'D5-v1.0 PI-8 "Every CivilizationalAction must carry a reversibility classification before Stage 4"; RT13-INV-1; A0-v1.1.1 §3.14 R4; D8 IC-3 (IRREVERSIBLE — after delivery, cannot be recalled)',
      description: 'Constitutional classification of reversibility. REVERSIBLE: action effects may be undone. IRREVERSIBLE: action effects cannot be undone after Projection Boundary crossing — D8 IC-3 applies; elevated authorization thresholds required per D4. CONDITIONALLY_REVERSIBLE: reversal possible under constitutionally specified conditions. This classification is the basis for authority threshold determination and post-crossing consequence handling.',
    }),

    classification_basis: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D5-v1.0 PI-8; R13-v1.0-canonical.md RS-05 R4; D8-v1.0 INV-1 (Constitutional Traceability); D8 PROH-7 (No Unassigned Execution)',
      description: 'Constitutional basis for the reversibility classification. States the reasons (epistemic, authority, or domain grounds) for classifying the ActionProjection as REVERSIBLE, IRREVERSIBLE, or CONDITIONALLY_REVERSIBLE. D8 INV-1: classification must trace to constitutional authority, not operational convenience.',
    }),

    classification_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT13-INV-1; D8-v1.0 INV-5 (Temporal Awareness); D8 TI-5 (Temporal Invariance)',
      description: 'ISO 8601 timestamp when this classification was made. D8 INV-5: must precede the ActionProjection Stage 4 crossing timestamp (RT13-INV-1 temporal enforcement). D8 PROH-6: may not be backdated.',
    }),

  }),

  validate(data) {
    return _validate('IrreversibilityClassificationRecord', IrreversibilityClassificationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('IrreversibilityClassificationRecord', IrreversibilityClassificationRecord.SCHEMA, IrreversibilityClassificationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT13 — ProjectionResponsibilityRecord (PRR)
// Constitutional basis: A0-v1.1.1 §3.14 R10 Owned Objects;
// R13-v1.0-canonical.md RS-07; RT13-INV-4;
// D5-v1.0-canonical.md §4.3 (Projection Responsibility Principle:
//   "Any action projected into external reality creates accountability obligations
//    for all resulting effects");
// D8-v1.0 PROH-7 (No Unassigned Execution); D8 INV-2 (Provenance Preservation)
//
// Formed and assigned AFTER every Projection Boundary crossing (A0 §3.14 R10; RT13-INV-4).
// Assigns constitutional accountability for ALL resulting effects — both intended and
// unintended — under the Projection Responsibility Principle (D5 §4.3).
//
// The scope of accountability is not limited to intended effects. It covers all resulting
// effects from the crossing, regardless of whether they were anticipated in the EER.
// Structurally immutable — responsibility assignment is permanent constitutional record.
// ─────────────────────────────────────────────────────────────────────────────

const ProjectionResponsibilityRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ProjectionResponsibilityRecord',
    runtime_id:       'RT-13',
    runtime_name:     'Action Runtime',
    authority:        'A0-v1.1.1 §3.14 R10 Owned Objects; R13-v1.0-canonical.md RS-07; RT13-INV-4; D5-v1.0 §4.3 (Projection Responsibility Principle); D8-v1.0 PROH-7 INV-2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-11',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT13-INV-4'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — responsibility assignment is permanent. RT-13 OWNS this object (A0 §3.14 Owned Objects). RT13-INV-4: every ActionProjection MUST have a ProjectionResponsibilityRecord. Formed AFTER Stage 4 Projection Boundary crossing (A0 §3.14 R10) — accountability is assigned for the crossing that occurred, not a hypothetical one. D5 §4.3 (Projection Responsibility Principle): scope_of_accountability covers ALL resulting effects — both intended effects (per EER) and unintended effects. Scope is not limited to what was expected. D8 PROH-7 (No Unassigned Execution): every ActionProjection must be attributable to an ActorProfile, a domain, and an authority record — this record satisfies PROH-7. D8 PROH-5: may not be deleted — permanent constitutional accountability record. D8 INV-2: provenance from ActionProjection through this PRR must be preserved.',
  }),

  SCHEMA: Object.freeze({

    prr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 Owned Objects; R13-v1.0-canonical.md RS-07; D8-v1.0 TI-1',
      description: 'Unique constitutional identifier for this ProjectionResponsibilityRecord.',
    }),

    action_projection_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT13-INV-4; A0-v1.1.1 §3.14 R10; R13-v1.0-canonical.md RS-07; D8-v1.0 INV-2',
      description: 'Reference to ActionProjection.action_projection_id for which responsibility is assigned. RT13-INV-4: every ActionProjection must have exactly one ProjectionResponsibilityRecord. D8 INV-2: provenance chain must be preserved.',
    }),

    responsible_actor_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D5-v1.0 §4.3 (Projection Responsibility Principle — accountability obligations attributable to actor); D8-v1.0 PROH-7 (No Unassigned Execution); A0-v1.1.1 §3.14 R10',
      description: 'Reference to ActorProfile.actor_id (RT-01 owned) of the actor constitutionally responsible for this ActionProjection\'s effects. D8 PROH-7: every ActionProjection must be attributable to an actor. D5 §4.3: the attributed actor is accountable for all resulting effects — intended and unintended.',
    }),

    domain: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D5-v1.0 §4.3; R13-v1.0-canonical.md RS-05 R10; A0-v1.1.1 §3.14 R10',
      description: 'Constitutional domain within which accountability is assigned for this ActionProjection. For cross-domain projections (is_cross_domain = true on ActionProjection), all affected domains must be reflected in scope_of_accountability.',
    }),

    scope_of_accountability: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D5-v1.0 §4.3 "Any action projected into external reality creates accountability obligations for all resulting effects"; RT13-INV-4; D8-v1.0 PROH-7; A0-v1.1.1 §3.14 R10',
      description: 'Constitutional description of accountability scope. D5 §4.3: scope covers ALL resulting effects — not only effects anticipated in the EffectExpectationRecord. Includes unintended consequences. This is the constitutional record establishing that the responsible actor is accountable for the full set of effects the ActionProjection may produce in external reality.',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 R10 (assigned after every Projection Boundary crossing); D8-v1.0 INV-5 (Temporal Awareness); D8 CLI-4',
      description: 'ISO 8601 timestamp when accountability was assigned. D8 INV-5: must follow the Projection Boundary crossing timestamp (ProjectionBoundaryCrossingRecord.crossing_timestamp) — responsibility is assigned for a crossing that has occurred.',
    }),

    projection_boundary_crossing_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 R10; R13-v1.0-canonical.md RS-07 RS-09; D8-v1.0 INV-2',
      description: 'Reference to ProjectionBoundaryCrossingRecord.pbcr_id for the crossing that this responsibility record covers. D8 INV-2: provenance chain must link ProjectionResponsibilityRecord to the specific Projection Boundary crossing it governs.',
    }),

  }),

  validate(data) {
    return _validate('ProjectionResponsibilityRecord', ProjectionResponsibilityRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ProjectionResponsibilityRecord', ProjectionResponsibilityRecord.SCHEMA, ProjectionResponsibilityRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT13 — ProjectionBoundaryCrossingRecord (PBCR)
// Constitutional basis: A0-v1.1.1 §3.14 Produced Objects Owned Objects;
// R13-v1.0-canonical.md RS-07 RS-09; D5-v1.0-canonical.md §4.2 Stage 4;
// D8-v1.0 INV-2 (Provenance Preservation); D8 INV-5 (Temporal Awareness);
// D8 PROH-4 PROH-5 (permanent — no deletion, no provenance suppression);
// Delivered to RT-07 for durable persistence (A0 §3.14 Runtime Outputs)
//
// The constitutional record of each crossing of the Projection Boundary into external
// reality. Formed at Stage 4 of every Action Projection Lifecycle (A0 §3.14 Produced).
// Delivered to RT-07 for permanent persistence.
//
// This is the constitutional record that marks the moment RT-13 exercises its unique
// constitutional role: the sole actor that crosses from the governed Reality Fabric
// into external reality (A0 §3.14 Constitutional Purpose; RS-03).
//
// Structurally immutable — the crossing happened; the record is permanent.
// ─────────────────────────────────────────────────────────────────────────────

const ProjectionBoundaryCrossingRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ProjectionBoundaryCrossingRecord',
    runtime_id:       'RT-13',
    runtime_name:     'Action Runtime',
    authority:        'A0-v1.1.1 §3.14 Produced Objects Owned Objects; R13-v1.0-canonical.md RS-07 RS-09; D5-v1.0 §4.2 Stage 4; D8-v1.0 INV-2 INV-5 PROH-4 PROH-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-11',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: [],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — the crossing occurred; the record is permanent. RT-13 OWNS this object (A0 §3.14 Owned Objects). Formed at Stage 4 of every Action Projection Lifecycle (D5 §4.2 Stage 4). The crossing_timestamp is the constitutional moment at which RT-13 exercises its unique role: sole actor crossing from the governed Reality Fabric into external reality (A0 §3.14 Constitutional Purpose). Delivered to RT-07 for durable persistence (A0 §3.14 Runtime Outputs). D8 PROH-4 (No Provenance Suppression): provenance must not be truncated. D8 PROH-5: may not be deleted — permanent constitutional record of every Projection Boundary crossing. D8 INV-5: crossing_timestamp is a constitutional temporal record anchoring all subsequent consequence observation windows. D8 INV-2: this record is the provenance anchor for the consequence observation chain (RT-08 → RT-14). is_irreversible flags D8 IC-3 applicability — IRREVERSIBLE crossings cannot be recalled after delivery to external reality.',
  }),

  SCHEMA: Object.freeze({

    pbcr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 Produced Objects; R13-v1.0-canonical.md RS-07; D8-v1.0 TI-1',
      description: 'Unique constitutional identifier for this ProjectionBoundaryCrossingRecord.',
    }),

    action_projection_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 Produced Objects; R13-v1.0-canonical.md RS-07 RS-09; D8-v1.0 INV-2',
      description: 'Reference to ActionProjection.action_projection_id that produced this crossing. D8 INV-2: provenance chain from ActionProjection through this PBCR must be preserved. Anchors the consequence observation chain: PBCR → RT-08 ConsequenceObservationRecord → RT-14 ObservedConsequenceRecord.',
    }),

    crossing_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D5-v1.0 §4.2 Stage 4; D8-v1.0 INV-5 (Temporal Awareness); D8 CLI-4 (Temporal Coherence); D8 TI-5 (Temporal Invariance)',
      description: 'ISO 8601 timestamp when RT-13 crossed the Projection Boundary into external reality. This is the constitutional temporal anchor for: the EffectExpectationRecord obligation window (RT13-INV-2 temporal enforcement), the ProjectionResponsibilityRecord (must follow this timestamp), and RT-14\'s ObservedConsequenceRecord formation (RT14-INV-1: every crossing receives an Observed Consequence). D8 PROH-6: may not be backdated.',
    }),

    domain: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.14 R8; D5 §4.2 Stage 4; R13-v1.0-canonical.md RS-05 R8',
      description: 'Constitutional domain into which the Projection Boundary crossing occurred. For cross-domain crossings, this records the primary domain. Cross-domain crossings require prior RT-03 cross-domain authorization (RT13-INV-7; D5 PI-11).',
    }),

    is_irreversible: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D8-v1.0 IC-3 (IRREVERSIBLE crossings cannot be recalled after delivery); RT13-INV-1; D5 PI-8; R13-v1.0-canonical.md RS-07',
      description: 'Whether this Projection Boundary crossing is constitutionally classified as IRREVERSIBLE (matches IrreversibilityClassificationRecord.reversibility_classification == IRREVERSIBLE). D8 IC-3: if true, this crossing cannot be recalled after delivery to external reality. This flag enforces the constitutional permanence constraint at the record level.',
    }),

    deletion_prohibited: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D8-v1.0 PROH-5 "no accountability record may be deleted — permanent constitutional record"; A0-v1.1.1 §3.14 Produced Objects; R13-v1.0-canonical.md RS-21',
      description: 'D8 PROH-5 enforcement flag. Must always be true. A ProjectionBoundaryCrossingRecord with deletion_prohibited = false is constitutionally malformed. Every Projection Boundary crossing is a permanent constitutional record.',
    }),

  }),

  validate(data) {
    return _validate('ProjectionBoundaryCrossingRecord', ProjectionBoundaryCrossingRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ProjectionBoundaryCrossingRecord', ProjectionBoundaryCrossingRecord.SCHEMA, ProjectionBoundaryCrossingRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  ActionProjection,
  EffectExpectationRecord,
  IrreversibilityClassificationRecord,
  ProjectionResponsibilityRecord,
  ProjectionBoundaryCrossingRecord,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-13',
  WAVE:        'W1-11',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
