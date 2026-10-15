'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/observed-consequence-record.js
// Task: W1-11 — RT-14 Reflection Runtime Type Definitions
// Runtime: RT-14 — Reflection Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-27
// Authority: A0-v1.1.1 §3.15; R14-v1.0-canonical.md RS-01 RS-07 RS-20;
//            D5-v1.0-canonical.md Part 8 (Reality Feedback Loop);
//            D5 PI-7 PI-12; D5 §8.4 (BFP-1–4);
//            D7-v1.0-canonical.md Part 8 (TOC-3 TOC-4 TOC-5);
//            D8-v1.0 INV-2 INV-6 CLI-2 PROH-5 TI-1–5;
//            RT14-INV-1 through RT14-INV-6
//
// ─── FILE NAME DISCREPANCY NOTE ──────────────────────────────────────────────
// D-2 (Type A — Planning Document File Name Choice):
//   Wave plan W1-11 specifies `consequence-observation-record.js` for RT-14.
//   ConsequenceObservationRecord is RT-08 owned (A0 §3.9; W1-06 observation-record.js).
//   RT-14 primary owned type is ObservedConsequenceRecord (A0 §3.15 Owned Objects).
//   This file is named `observed-consequence-record.js` to reflect RT-14 ownership
//   and avoid conceptual confusion with RT-08's ConsequenceObservationRecord.
//   No constitutional prohibition; naming choice only. Wave plan governs scope;
//   file name implements that scope faithfully.
//
// ─── SECTION NUMBER NOTE ─────────────────────────────────────────────────────
// D-1 (Type C — Implementation Interpretation):
//   RT-14 constitutional seat is A0 §3.15 (R14-v1.0 RS-01).
//   Index.js stub comment cites "§3.13–3.14" for RT-13/RT-14 — off by one.
//   Same artifact as W1-04 W1-07–W1-11. CONSTITUTIONAL blocks use §3.15.
//
// ─── NAMING CONFLICT NOTE (RT-14 CANONICAL NAME) ─────────────────────────────
// D-3 (Type C — Per R14-v1.0 RS-12 Conflict C-1):
//   A1 §3.0 names RT-14 "Reality Feedback Runtime." A0 §3.15 canonical name
//   is "Reflection Runtime." A0 governs. CONSTITUTIONAL blocks use "Reflection Runtime."
//
// ─── OWNERSHIP BOUNDARY ──────────────────────────────────────────────────────
// RT-14 OWNS (implemented here):
//   ObservedConsequenceRecord, CausalModelDivergenceRecord,
//   OpenActionRegisterTerminalStatusRecord, ReflectionTriggerRecord
//
// RT-14 DOES NOT OWN:
//   ConsequenceObservationRecord — RT-08 (A0 §3.9; W1-06)
//   EffectExpectationRecord — RT-13 (A0 §3.14; W1-11 effect-expectation-record.js)
//   OpenActionRegisterEntry — RT-12 (A0 §3.13; W1-10)
//   ActionProjection — RT-13 (A0 §3.14; W1-11 effect-expectation-record.js)
//
// RT-14 DOES NOT DO:
//   Revise reality records when consequences diverge (D5 PI-7 — RT-14 revises understanding)
//   Assign terminal status before ObservedConsequenceRecord is formed (RT14-INV-4)
//   Access RT-13 during action execution (PAIR 48 FORBIDDEN)
//   Receive initiation from RT-11 (PAIR 42 FORBIDDEN — RT-11 → RT-14 is FORBIDDEN)
//   Write directly to RT-05 without RT-03 mediation (D8 FR-2)
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT14 — ObservedConsequenceRecord (OCR)
// Constitutional basis: A0-v1.1.1 §3.15 R3 Owned Objects;
// R14-v1.0-canonical.md RS-07 RS-09; RT14-INV-1; RT14-INV-3;
// D5-v1.0-canonical.md Part 8 (Reality Feedback Loop);
// D5 PI-7 (Reality Overrides Representation);
// D8-v1.0 INV-2 (Provenance Preservation); D8 INV-6 (Feedback Requirement);
// D8 CLI-2 (No Constitutional Loop Short-Circuit);
// D8 TI-2 (mandatory attributes: AP-ID, COR-ID, EER-ID, divergence, timestamp, RT-14, provenance chain)
//
// Primary output of RT-14's core comparison function (A0 §3.15 R3). Formed by comparing:
//   - ConsequenceObservationRecord (RT-08 owned — what reality produced)
//   - EffectExpectationRecord (RT-13 owned — what was expected)
//
// RT14-INV-1: every ActionProjection that crosses the Projection Boundary receives
// one ObservedConsequenceRecord — the Constitutional Loop is always closed.
//
// RT14-INV-3: reality divergences trigger understanding revision (via CausalModelDivergenceRecord
// and ReflectionTriggerRecord) — they NEVER trigger reality record revision (D5 PI-7).
//
// Structurally immutable — the observed consequence is a permanent constitutional record.
// ─────────────────────────────────────────────────────────────────────────────

const ObservedConsequenceRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ObservedConsequenceRecord',
    runtime_id:       'RT-14',
    runtime_name:     'Reflection Runtime',
    authority:        'A0-v1.1.1 §3.15 R3 Owned Objects; R14-v1.0-canonical.md RS-07 RS-09; RT14-INV-1 RT14-INV-3; D5-v1.0 Part 8 PI-7; D8-v1.0 INV-2 INV-6 CLI-2 PROH-5 TI-2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-11',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT14-INV-1', 'RT14-INV-3'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — permanent constitutional record. RT-14 OWNS this object (A0 §3.15 Owned Objects). RT14-INV-1: every ActionProjection that crosses the Projection Boundary receives one ObservedConsequenceRecord — the Constitutional Loop (D8 CLI-2) is always closed. RT14-INV-3 (D5 PI-7): if divergence_detected is true, understanding must be revised (via CausalModelDivergenceRecord and ReflectionTriggerRecord) — the reality record is NEVER revised. This is the fundamental epistemic rule of the constitutional architecture: reality is the truth; representations are revised to align with reality. D8 INV-6 (Feedback Requirement): this record satisfies the feedback obligation for the referenced ActionProjection. D8 TI-2: mandatory attributes are action_projection_ref, consequence_observation_ref, effect_expectation_ref, divergence_detected, comparison_timestamp (provenance and temporal position). D8 TI-3: relationships to ConsequenceObservationRecord (RT-08) and EffectExpectationRecord (RT-13) must be preserved — RT-14 may not sever these provenance links. D8 PROH-5: may not be deleted. RT-14 holds AIR-1 (Observation Authority) for the Consequence domain (A1 §5.1); producing this record exercises that authority.',
  }),

  SCHEMA: Object.freeze({

    ocr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.15 Owned Objects; R14-v1.0-canonical.md RS-07; D8-v1.0 TI-1 (Identity Invariance — unique immutable ID required)',
      description: 'Unique constitutional identifier for this ObservedConsequenceRecord. Anchors the consequence assessment chain: Action Projection → EER → COR → OCR → CausalModelDivergenceRecord (if divergence) → OpenActionRegisterTerminalStatusRecord → ReflectionTriggerRecord (D8 TI-3 Relationship Invariance).',
    }),

    action_projection_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R14-v1.0-canonical.md RS-07 TI-2; A0-v1.1.1 §3.15 Produced Objects; D8-v1.0 INV-2 (Provenance Preservation); D8 TI-2',
      description: 'Reference to ActionProjection.action_projection_ref (RT-13 owned) that produced the effects this record observes. D8 TI-2: mandatory attribute. D8 INV-2: provenance chain from ActionProjection through this OCR must be preserved. Anchors RT14-INV-1: this record confirms the Constitutional Loop is closed for this specific ActionProjection.',
    }),

    effect_expectation_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R14-v1.0-canonical.md RS-07 RS-08 TI-2; A0-v1.1.1 §3.15 Consumed Objects; D8-v1.0 TI-2 TI-3; A0 §3.15 R2',
      description: 'Reference to EffectExpectationRecord.eer_id (RT-13 owned) that was compared against the consequence observation. D8 TI-2: mandatory attribute. D8 TI-3: relationship to RT-13\'s EER must be preserved — RT-14 does not own the EER but must maintain this reference for provenance. A1 §9.2 Provenance Graph anchor.',
    }),

    consequence_observation_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R14-v1.0-canonical.md RS-07 RS-08 TI-2; A0-v1.1.1 §3.15 Consumed Objects; D8-v1.0 TI-2 TI-3; PAIR 49',
      description: 'Reference to ConsequenceObservationRecord (RT-08 owned) that was compared. D8 TI-2: mandatory attribute. D8 TI-3: relationship to RT-08\'s ConsequenceObservationRecord must be preserved — RT-14 consumes but does not own the COR. This reference is the constitutional link between RT-08\'s observation and RT-14\'s assessed consequence.',
    }),

    divergence_detected: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'RT14-INV-2 "every divergence between expected and observed consequences produces a CausalModelDivergenceRecord"; RT14-INV-3 "Reality divergences trigger understanding revision — they never trigger reality record revision"; D8-v1.0 TI-2; R14-v1.0-canonical.md RS-11 T3',
      description: 'Whether a divergence was detected between the EffectExpectationRecord and ConsequenceObservationRecord. RT14-INV-2: if true, a CausalModelDivergenceRecord MUST be produced (unconditional). RT14-INV-3 (D5 PI-7): if true, understanding is revised — the reality record is NEVER revised. RT14-INV-5: ReflectionTriggerRecord is mandatory and unconditional regardless of this value. D8 TI-2: mandatory attribute.',
    }),

    comparison_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R14-v1.0-canonical.md TI-2 TI-5; D8-v1.0 INV-5 (Temporal Awareness); D8 TI-5 (Temporal Invariance); D8 CLI-4',
      description: 'ISO 8601 timestamp when RT-14 performed the EER vs COR comparison. D8 TI-2: mandatory temporal attribute. D8 TI-5 (Temporal Invariance): must follow the ActionProjection Stage 4 crossing timestamp (CLI-4 compliance). D8 PROH-6: may not be backdated. D8 TI-5: must retain sufficient precision for temporal ordering validation.',
    }),

    deletion_prohibited: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D8-v1.0 PROH-5 "no accountability record may be deleted"; R14-v1.0-canonical.md RS-21; A0-v1.1.1 §3.15 Owned Objects',
      description: 'D8 PROH-5 enforcement flag. Must always be true. An ObservedConsequenceRecord with deletion_prohibited = false is constitutionally malformed. RT-14 enforces append-only treatment of all owned objects through RT-07 persistence (D8 INV-2).',
    }),

  }),

  validate(data) {
    return _validate('ObservedConsequenceRecord', ObservedConsequenceRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ObservedConsequenceRecord', ObservedConsequenceRecord.SCHEMA, ObservedConsequenceRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT14 — CausalModelDivergenceRecord (CMDR)
// Constitutional basis: A0-v1.1.1 §3.15 R4 Owned Objects;
// R14-v1.0-canonical.md RS-07 RS-09; RT14-INV-2; RT14-INV-3;
// D7-v1.0-canonical.md Part 8 TOC-3 (Outcome Comparison — RT-14 owns this operation);
// D7 TOC-4 TOC-5 (Causal Model Update / Strategic Model Revision — RT-11 owns, RT-14 triggers);
// D5 PI-7 (Reality Overrides Representation — divergence triggers understanding revision);
// D8-v1.0 PROH-5 PROH-6; D8 TI-2 TI-3
//
// Produced by RT-14 whenever divergence_detected = true on an ObservedConsequenceRecord
// (RT14-INV-2: unconditional). Records the divergence and triggers Causal Model revision
// in RT-11 via TOC-4/TOC-5 (RT-14 initiates; RT-11 executes — A1 PAIR 42).
//
// RT14-INV-3: this record constitutionally confirms that understanding is being revised
// to align with reality — NOT that reality is being revised to match expectation.
// D5 PI-7: reality is the truth; representations are revised.
//
// Structurally immutable — the divergence observation is a permanent constitutional record.
// ─────────────────────────────────────────────────────────────────────────────

const CausalModelDivergenceRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CausalModelDivergenceRecord',
    runtime_id:       'RT-14',
    runtime_name:     'Reflection Runtime',
    authority:        'A0-v1.1.1 §3.15 R4 Owned Objects; R14-v1.0-canonical.md RS-07 RS-09; RT14-INV-2 RT14-INV-3; D7-v1.0 Part 8 TOC-3 TOC-4 TOC-5; D5 PI-7; D8-v1.0 PROH-5 PROH-6 TI-2 TI-3',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-11',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT14-INV-2', 'RT14-INV-3'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — divergence record is permanent. RT-14 OWNS this object (A0 §3.15 Owned Objects). RT14-INV-2: produced UNCONDITIONALLY whenever divergence_detected = true on an ObservedConsequenceRecord — no exception, no threshold. RT14-INV-3 (D5 PI-7): this record triggers understanding revision — it constitutionally forbids reality record revision. RT-14 executes TOC-3 (Outcome Comparison) — this record is the TOC-3 product. TOC-4 (Causal Model Update) and TOC-5 (Strategic Model Revision) are RT-11 operations triggered by RT-14 via PAIR 42 (CausalModelDivergenceRecord + CUMRevisionTrigger to RT-11). RT-14 may not execute TOC-4 or TOC-5 directly. D8 PROH-6 (No Assumption-to-Fact Conversion): divergence_description documents the actual observed reality — not a revised expectation. D8 PROH-5: may not be deleted. D8 TI-2: mandatory attributes are action_projection_ref (AP-ID), observed_consequence_ref (OCR-ID), divergence_magnitude, affected_domain, registration_timestamp. D8 TI-3: relationship to ObservedConsequenceRecord must be preserved.',
  }),

  SCHEMA: Object.freeze({

    cmdr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.15 Owned Objects; R14-v1.0-canonical.md RS-07; D8-v1.0 TI-1',
      description: 'Unique constitutional identifier for this CausalModelDivergenceRecord.',
    }),

    action_projection_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R14-v1.0-canonical.md TI-2; D8-v1.0 TI-2 (mandatory: AP-ID); D8 INV-2 (Provenance Preservation)',
      description: 'Reference to ActionProjection.action_projection_id that produced the effects whose consequence diverged from expectation. D8 TI-2: mandatory attribute. Anchors the provenance chain: ActionProjection → OCR → CausalModelDivergenceRecord.',
    }),

    observed_consequence_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT14-INV-2; R14-v1.0-canonical.md RS-07 RS-11 T3 TI-2 TI-3; D8-v1.0 TI-2 TI-3 INV-2',
      description: 'Reference to ObservedConsequenceRecord.ocr_id that detected the divergence (divergence_detected = true). D8 TI-2: mandatory attribute. D8 TI-3: relationship to ObservedConsequenceRecord must be preserved. RT14-INV-2: this record is produced only when the referenced OCR has divergence_detected = true.',
    }),

    divergence_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D7-v1.0 Part 8 TOC-3 (Outcome Comparison — RT-14 executes); D5 PI-7; D8-v1.0 PROH-6; R14-v1.0-canonical.md RS-05 R4',
      description: 'Constitutional description of the divergence between EffectExpectationRecord (what was expected) and ConsequenceObservationRecord (what reality produced). D8 PROH-6: this documents actual observed reality — not a revised expectation. D5 PI-7: reality is the truth; this description records the discrepancy that triggers understanding revision, not reality revision.',
    }),

    divergence_magnitude: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R14-v1.0-canonical.md TI-2 "divergence magnitude" (mandatory attribute); D7-v1.0 Part 8 TOC-4 TOC-5 (magnitude informs whether TOC-4/TOC-5 triggered); A0-v1.1.1 §3.15 R9',
      description: 'Magnitude classification of the divergence. D8 TI-2: mandatory attribute. Used by RT-11 to determine whether TOC-4 (Causal Model Update) or TOC-5 (Strategic Model Revision) is triggered (A0 §3.15 R9). Constitutional sources do not prescribe specific enum values for magnitude — implementation characterizes severity as a descriptive string (MINOR/MODERATE/SIGNIFICANT/CRITICAL or domain-specific magnitude notation). The key constitutional constraint is that all significant divergences triggering TOC-4/TOC-5 are accurately identified.',
    }),

    affected_domain: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R14-v1.0-canonical.md TI-2 "affected domain identification" (mandatory attribute); D7-v1.0 Part 8 TOC-3; A0-v1.1.1 §3.15 R7 (trigger domain understanding model updates in RT-15)',
      description: 'Constitutional domain in which the divergence occurred. D8 TI-2: mandatory attribute. Used by RT-14 to trigger DomainUpdateTrigger to the appropriate RT-15 instance (A0 §3.15 R7; PAIR 42 RT-11 trigger). For cross-domain divergences, records the primary affected domain; cross-domain impact is captured in divergence_description.',
    }),

    registration_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R14-v1.0-canonical.md TI-2 "temporal position" (mandatory attribute); D8-v1.0 TI-5 (Temporal Invariance); D8 INV-5; D8 CLI-4',
      description: 'ISO 8601 timestamp when this CausalModelDivergenceRecord was registered. D8 TI-2: mandatory temporal attribute. D8 TI-5: must follow ObservedConsequenceRecord.comparison_timestamp — divergence records are produced from OCR comparison results. D8 PROH-6: may not be backdated.',
    }),

  }),

  validate(data) {
    return _validate('CausalModelDivergenceRecord', CausalModelDivergenceRecord.SCHEMA, data);
  },

  create(data) {
    return _create('CausalModelDivergenceRecord', CausalModelDivergenceRecord.SCHEMA, CausalModelDivergenceRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT14 — OpenActionRegisterTerminalStatusRecord (OAR-TSR)
// Constitutional basis: A0-v1.1.1 §3.15 R8 Owned Objects;
// R14-v1.0-canonical.md RS-07 RS-09; RT14-INV-4; RT14-INV-6;
// RT12-INV-5 (OAR entries closed only by RT-14 — never by RT-12 unilaterally);
// D5-v1.0-canonical.md PI-12 (Feedback Completion: four canonical terminal states);
// D8-v1.0 CLI-3 (Feedback Completeness); D8 INV-6 (Feedback Requirement);
// D8 TI-2 (mandatory attributes: OAR entry ID, terminal state, OCR-ID, timestamp, RT-14);
// D8 TI-5 (Temporal Invariance: OAR-TSR timestamp must follow OCR timestamp — RT14-INV-4)
//
// The constitutional mechanism by which RT-12's OpenActionRegisterEntry is closed.
// RT-14 PRODUCES this record; RT-12 RECEIVES and applies it to the OAR entry.
// RT-12 does NOT self-assign terminal states (RT12-INV-5 / RT14-INV-4 boundary).
//
// RT14-INV-4: OAR entries are closed ONLY AFTER ObservedConsequenceRecord formation.
// RT14-INV-6: RT-14 must not permit any OAR entry to remain permanently open.
// Four canonical terminal states (D5 PI-12): COMPLETE, PARTIAL, FAILED, LOST.
//
// Structurally immutable — terminal status assignment is a permanent constitutional record.
// ─────────────────────────────────────────────────────────────────────────────

const OpenActionRegisterTerminalStatusRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'OpenActionRegisterTerminalStatusRecord',
    runtime_id:       'RT-14',
    runtime_name:     'Reflection Runtime',
    authority:        'A0-v1.1.1 §3.15 R8 Owned Objects; R14-v1.0-canonical.md RS-07 RS-09; RT14-INV-4 RT14-INV-6; RT12-INV-5; D5-v1.0 PI-12; D8-v1.0 CLI-3 INV-6 PROH-5 TI-2 TI-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-11',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT14-INV-4', 'RT14-INV-6'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — terminal status assignment is permanent. RT-14 OWNS this object (A0 §3.15 Owned Objects). RT-14 PRODUCES and DELIVERS to RT-12; RT-12 receives and applies it — RT-12 does NOT self-assign (RT12-INV-5). RT14-INV-4: terminal status is assigned ONLY AFTER ObservedConsequenceRecord formation — never before. The observed_consequence_ref is required to enforce this. RT14-INV-6: RT-14 must ensure every OpenActionRegisterEntry (RT-12 owned) reaches a terminal state — no permanent open entries. D5 PI-12 (Feedback Completion) terminal states: COMPLETE (full consequence observed; expected effects realized), PARTIAL (consequence partially observed or partially realized), FAILED (consequence observed; expected effects NOT realized), LOST (Effect Observation Window expired without Observed Consequence — triggers BFP-1 through BFP-4). D8 CLI-3 (Feedback Completeness): delivery of this record satisfies one CLI-3 obligation. D8 TI-2: mandatory attributes are oar_entry_ref (OAR entry ID), terminal_state (COMPLETE/PARTIAL/FAILED/LOST), observed_consequence_ref (OCR-ID), assignment_timestamp. D8 PROH-5: may not be deleted.',
  }),

  SCHEMA: Object.freeze({

    oar_tsr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.15 Owned Objects; R14-v1.0-canonical.md RS-07; D8-v1.0 TI-1',
      description: 'Unique constitutional identifier for this OpenActionRegisterTerminalStatusRecord.',
    }),

    oar_entry_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT14-INV-4 RT14-INV-6; RT12-INV-5; A0-v1.1.1 §3.15 R8; R14-v1.0-canonical.md RS-07 RS-09; D8-v1.0 TI-2 TI-3 (Relationship Invariance)',
      description: 'Reference to OpenActionRegisterEntry.oar_entry_id (RT-12 owned; A0 §3.13) being closed. D8 TI-2: mandatory attribute. D8 TI-3: relationship to RT-12\'s OAR entry must be preserved. RT12-INV-5: this record is the EXCLUSIVE mechanism by which RT-12\'s OAR entry transitions to a terminal state — RT-12 may not self-assign. RT14-INV-6: monitoring of this entry was RT-14\'s obligation; this record satisfies it.',
    }),

    terminal_state: Object.freeze({
      required: true, type: 'string',
      enum: ['COMPLETE', 'PARTIAL', 'FAILED', 'LOST'],
      constitutional_source: 'D5-v1.0 PI-12 (Feedback Completion — four canonical terminal states); RT14-INV-6; A0-v1.1.1 §3.15 R8; RT12-INV-5; D8-v1.0 TI-2',
      description: 'D5 PI-12 canonical terminal state. D8 TI-2: mandatory attribute. COMPLETE: Observed Consequence formed; expected effects fully realized; Constitutional Loop closed. PARTIAL: consequence partially observed or partially realized — feedback partially complete. FAILED: Observed Consequence formed; expected effects not realized — understanding must be revised (RT14-INV-5; RT14-INV-3). LOST: Effect Observation Window expired without Observed Consequence — Broken Feedback Protocol (D5 §8.4 BFP-1 through BFP-4) applies; RT-14 must trigger escalation. No other terminal states are constitutionally valid (D5 PI-12).',
    }),

    observed_consequence_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT14-INV-4 "Open Action Register entries are closed only after Observed Consequence formation — not before"; A0-v1.1.1 §3.15 R8; R14-v1.0-canonical.md RS-07 RS-11 T5; D8-v1.0 TI-2 TI-5',
      description: 'Reference to ObservedConsequenceRecord.ocr_id that grounds this terminal status assignment. D8 TI-2: mandatory attribute. RT14-INV-4: this field enforces the constitutional sequencing rule — terminal status can only be assigned after an Observed Consequence exists. D8 TI-5 (Temporal Invariance): assignment_timestamp must follow the referenced OCR\'s comparison_timestamp.',
    }),

    assignment_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R14-v1.0-canonical.md TI-2 TI-5; D8-v1.0 TI-2 TI-5 (Temporal Invariance); D8 INV-5; D8 CLI-3',
      description: 'ISO 8601 timestamp when RT-14 assigned the terminal state to this OAR entry. D8 TI-2: mandatory temporal attribute. D8 TI-5 (Temporal Invariance): must follow the ObservedConsequenceRecord.comparison_timestamp (RT14-INV-4 temporal enforcement). D8 CLI-3: this timestamp marks the Constitutional Loop closure for this ActionProjection cycle.',
    }),

    issuing_runtime_attestation: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'RT12-INV-5 "RT-14 terminal status assignment — never by RT-12 unilaterally"; R14-v1.0-canonical.md RS-07; D8-v1.0 TI-2 "issuing runtime (RT-14)"',
      description: 'Constitutional attestation that this terminal status was assigned by RT-14 (the constitutionally authorized issuing runtime), not by RT-12 self-assignment. Must always be true. D8 TI-2: mandatory attribute (issuing runtime must be identified). RT12-INV-5: RT-12 may not unilaterally assign terminal states — this field enforces RT-14 exclusivity at the schema level.',
    }),

  }),

  validate(data) {
    return _validate('OpenActionRegisterTerminalStatusRecord', OpenActionRegisterTerminalStatusRecord.SCHEMA, data);
  },

  create(data) {
    return _create('OpenActionRegisterTerminalStatusRecord', OpenActionRegisterTerminalStatusRecord.SCHEMA, OpenActionRegisterTerminalStatusRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT14 — ReflectionTriggerRecord (RTR)
// Constitutional basis: A0-v1.1.1 §3.15 Owned Objects;
// R14-v1.0-canonical.md RS-07 RS-09; RT14-INV-5;
// A0-v1.1.1 §3.15 R5 R6 R7 R9 (RT-09 RT-11 RT-15 triggers);
// D8-v1.0 INV-6 (Feedback Requirement — feedback to understanding is mandatory);
// D8 CLI-3 (Feedback Completeness); D8 TI-1–TI-5
//
// Constitutional record of RT-14 triggering Understanding updates in RT-09, RT-11,
// and RT-15 (A0 §3.15 Responsibilities 5, 6, 7, 9).
//
// RT14-INV-5: RT-14 triggers RT-09 Knowledge State updates and RT-11 CUM revision
// for EVERY ObservedConsequenceRecord — feedback to understanding is MANDATORY and
// UNCONDITIONAL. This applies regardless of whether divergence was detected.
//
// Structurally immutable — trigger record is a permanent constitutional record of
// the feedback obligations satisfied for each ObservedConsequenceRecord.
// ─────────────────────────────────────────────────────────────────────────────

const ReflectionTriggerRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ReflectionTriggerRecord',
    runtime_id:       'RT-14',
    runtime_name:     'Reflection Runtime',
    authority:        'A0-v1.1.1 §3.15 Owned Objects R5 R6 R7 R9; R14-v1.0-canonical.md RS-07 RS-09; RT14-INV-5; D8-v1.0 INV-6 CLI-3 PROH-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-11',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT14-INV-5'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — trigger record is permanent. RT-14 OWNS this object (A0 §3.15 Owned Objects). RT14-INV-5: RT-09 (Knowledge State) and RT-11 (CUM revision) triggers are MANDATORY and UNCONDITIONAL for every ObservedConsequenceRecord — no exception based on whether divergence was detected. Feedback to understanding is never optional. RT-15 trigger (rt15_triggered) is domain-applicable — triggered when domain-level consequence integration is required (A0 §3.15 R7). Delivery paths per constitutional PAIRs: RT-14 → RT-09 via PAIR 50 (COND path); RT-14 → RT-11 via PAIR 42 (standard path for non-escalation; direct only for CUM Degradation Protocol with >4 domains degraded). D8 INV-6 (Feedback Requirement): producing this record is part of satisfying the feedback obligation for the referenced ActionProjection. D8 CLI-3 (Feedback Completeness): this record confirms RT-14 has issued all required Understanding update triggers. D8 PROH-5: may not be deleted. FORBIDDEN: RT-11 → RT-14 (PAIR 42); RT-13 → RT-14 directly (PAIR 48). RT-14 triggers RT-11; RT-11 does not command RT-14.',
  }),

  SCHEMA: Object.freeze({

    rtr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.15 Owned Objects; R14-v1.0-canonical.md RS-07; D8-v1.0 TI-1',
      description: 'Unique constitutional identifier for this ReflectionTriggerRecord.',
    }),

    observed_consequence_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT14-INV-5 "RT-14 triggers RT-09 Knowledge State updates and RT-11 CUM revision for every Observed Consequence"; A0-v1.1.1 §3.15 R5 R6 R7; D8-v1.0 INV-2 INV-6',
      description: 'Reference to ObservedConsequenceRecord.ocr_id that grounds these Understanding update triggers. RT14-INV-5: this ReflectionTriggerRecord is produced for EVERY OCR — mandatory and unconditional. Establishes the provenance link: OCR → ReflectionTriggerRecord → Understanding updates.',
    }),

    rt09_triggered: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'RT14-INV-5; A0-v1.1.1 §3.15 R5 "Trigger Knowledge State updates in RT-09"; PAIR 50; D8-v1.0 INV-6',
      description: 'Constitutional attestation that RT-09 (Knowledge State) update trigger was issued. Must always be true (RT14-INV-5: mandatory and unconditional). A false value constitutes RT14-INV-5 violation — RT-09 trigger is never optional. Trigger routes via PAIR 50 (COND path for non-external-consequence knowledge; or Class B notification).',
    }),

    rt11_triggered: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'RT14-INV-5; A0-v1.1.1 §3.15 R6 "Trigger CUM revision in RT-11"; PAIR 42; D8-v1.0 INV-6',
      description: 'Constitutional attestation that RT-11 (CUM revision) trigger was issued. Must always be true (RT14-INV-5: mandatory and unconditional). A false value constitutes RT14-INV-5 violation. Trigger routes via PAIR 42 (RT-14 → RT-11 standard path: CUMRevisionTrigger). For significant divergence (CausalModelDivergenceRecord present), CausalModelDivergenceRecord is also delivered to RT-11 (TOC-4/TOC-5 initiation). FORBIDDEN: RT-11 → RT-14 initiation (PAIR 42 explicitly forbids reverse direction).',
    }),

    trigger_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D8-v1.0 INV-5 (Temporal Awareness); D8 TI-5 (Temporal Invariance); D8 CLI-4; R14-v1.0-canonical.md TI-5',
      description: 'ISO 8601 timestamp when the Understanding update triggers were issued. D8 TI-5: must follow ObservedConsequenceRecord.comparison_timestamp — triggers are issued after consequence assessment is complete. D8 PROH-6: may not be backdated.',
    }),

    // Optional — present when domain-level trigger was issued
    rt15_triggered: Object.freeze({
      required: false, type: 'boolean',
      constitutional_source: 'A0-v1.1.1 §3.15 R7 "Trigger domain Understanding Model updates in RT-15"; PAIR — domain update delivery; D8-v1.0 INV-6',
      description: 'Whether RT-15 (Domain Runtime) domain Understanding Model update trigger was issued. Present when domain-level consequence integration is required for the relevant domain. Absent when no domain-level update was necessary. When true: DomainUpdateTrigger was delivered to the applicable RT-15 instance (A0 §3.15 R7).',
    }),

    causal_model_divergence_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'RT14-INV-2; A0-v1.1.1 §3.15 R4 R9; D7-v1.0 Part 8 TOC-4 TOC-5; PAIR 42',
      description: 'Reference to CausalModelDivergenceRecord.cmdr_id when divergence was detected. Present when ObservedConsequenceRecord.divergence_detected = true and a CausalModelDivergenceRecord was produced (RT14-INV-2). When present: RT-11 was also sent the CausalModelDivergenceRecord for TOC-4/TOC-5 processing (A0 §3.15 R9). Absent when no divergence was detected.',
    }),

  }),

  validate(data) {
    return _validate('ReflectionTriggerRecord', ReflectionTriggerRecord.SCHEMA, data);
  },

  create(data) {
    return _create('ReflectionTriggerRecord', ReflectionTriggerRecord.SCHEMA, ReflectionTriggerRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  ObservedConsequenceRecord,
  CausalModelDivergenceRecord,
  OpenActionRegisterTerminalStatusRecord,
  ReflectionTriggerRecord,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-14',
  WAVE:        'W1-11',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
