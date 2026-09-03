'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/learning-record.js
// Task: W1-08 — RT-10 Learning Runtime Type Definitions
// Runtime: RT-10 — Intelligence Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-26
// Authority: A0-v1.1.1 §3.11; R10-v1.1-canonical.md RS-07 RS-10;
//            D-2 §VII; D6 §4.3 (AIR-2); D7 CUM-1 through CUM-5; D8 INV-4 INV-5;
//            A1 §6.2 (provenance); A1 §9.2 (CUM provenance); RT10-INV-1 through RT10-INV-4
//
// ─── RUNTIME NAME DISCREPANCY NOTE ───────────────────────────────────────────
// C-1: Task authorization W1-08 refers to RT-10 as "Learning Runtime."
//      R10-v1.1-canonical.md RS-01 names RT-10 "Intelligence Runtime" per A0-v1.1.1 §3.11.
//      Three-source naming conflict disclosed in R10-v1.1 RS-01 and RS-13:
//        A0 §3.11: "Intelligence Runtime" (governs)
//        A1 §3.0:  "Domain Understanding Runtime"
//        R0 RNS-1: "Domain Understanding Runtime"
//      A0 governs per constitutional derivation chain. CONSTITUTIONAL blocks use
//      "Intelligence Runtime." Task authorization "Learning Runtime" label preserved
//      in this header comment only.
//
// ─── FILE NAME DISCREPANCY NOTE ──────────────────────────────────────────────
// C-2: Wave plan W1-08 specifies file name `cum.js`; index.js comment block also
//      references `cum.js`. Task authorization W1-08 operative instruction specifies
//      `learning-record.js`. Operative task instruction governs for file name.
//      index.js registration will reference `learning-record.js`.
//
// ─── SECTION NUMBER NOTE ─────────────────────────────────────────────────────
// C-3: Wave plan W1-08 cites A0 §3.10 for RT-10. R10-v1.1-canonical.md RS-01
//      confirms correct constitutional seat is §3.11. Off-by-one artifact
//      consistent with W1-04, W1-07, W1-12, W1-14. CONSTITUTIONAL blocks use §3.11.
//
// ─── CUM BOUNDARY NOTE ───────────────────────────────────────────────────────
// RT-10 produces the Civilization Understanding Model (CUM) during the nine-step
// Constitutional Synthesis Process but does NOT own it. CUM ownership transfers to
// RT-11 on delivery and fabric admission per A0 §3.12. CUM is a Produced object
// for RT-10 (not Owned). This file defines RT-10's three Owned types only:
// DomainUnderstandingModel, InferenceProtocol, UnderstandingDegradationFlag.
// CUM type definition belongs to RT-11 (W1-09).
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
//
// ─── RT-10 OWNERSHIP BOUNDARY ────────────────────────────────────────────────
// RT-10 OWNS: DomainUnderstandingModel, InferenceProtocol, UnderstandingDegradationFlag
// RT-10 DOES NOT OWN:
//   - Knowledge Records / KnowledgeState (RT-09 owns — RT-10 receives via RT-03)
//   - Civilization Understanding Model (RT-11 owns — RT-10 produces only)
//   - HistoricalStateQueryResult (RT-07 owns — RT-10 queries via PAIR 38)
//   - Domain Understanding contributions from RT-15 (RT-15 owns — consumed via PAIR 52)
//   - Audit Records (RT-04 owns — RT-04 audits RT-10 per PAIR 34 / AIR-5)
//   - Authority certificates (RT-02 owns — RT-10 holds AIR-2 granted by RT-02)
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT10 — DomainUnderstandingModel
// Constitutional basis: R10-v1.1-canonical.md RS-10.1 (RT10-OBJ-01);
// A0-v1.1.1 §3.11; D7 CUM-1 through CUM-5 (applied to DUM);
// A1 §6.2 (provenance anchor: Knowledge Record ID(s) + RT-10 operation ID);
// D8 INV-4 (Reality Grounding); D8 INV-5 (Temporal Awareness);
// RT10-INV-1 (provenance required), RT10-INV-2 (uncertainty preserved),
// RT10-INV-3 (registered protocols only), RT10-INV-4 (degradation flagging)
//
// One per civilization domain (12 total). Updated when new Knowledge Records
// are admitted from RT-09. Provenance must anchor to Knowledge Record ID(s)
// from RT-09 and RT-10 operation ID (A1 §6.2). Uncertainty attributes from
// source Knowledge Record must be preserved without collapse (RT10-INV-2; CUM-3).
// Only registered InferenceProtocols may be applied (RT10-INV-3; D-2 §VII).
// When source Knowledge State is DKS-3 (CONTESTED) or DKS-4 (DEGRADED),
// an UnderstandingDegradationFlag must be produced (RT10-INV-4).
// Not structurally immutable — updated on each new Knowledge Record admission.
// Submitted as Class A to RT-03; committed to RT-05.
// ─────────────────────────────────────────────────────────────────────────────

const DomainUnderstandingModel = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DomainUnderstandingModel',
    runtime_id:       'RT-10',
    runtime_name:     'Intelligence Runtime',
    authority:        'R10-v1.1-canonical.md RS-10.1 (RT10-OBJ-01); A0-v1.1.1 §3.11; D7 CUM-1 through CUM-5; A1 §6.2 (provenance); D8 INV-4 (Reality Grounding); D8 INV-5 (Temporal Awareness); D-2 §VII; D6 §4.3 (AIR-2); RT10-INV-1 RT10-INV-2 RT10-INV-3 RT10-INV-4',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-08',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT10-INV-1', 'RT10-INV-2', 'RT10-INV-3', 'RT10-INV-4'],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — updated on each new Knowledge Record admission from RT-09. Instances: 12 (one per civilization domain). Provenance anchor required (RT10-INV-1): every DUM must anchor to Knowledge Record ID(s) from RT-09 + RT-10 operation ID (A1 §6.2). Uncertainty attributes must be preserved without collapse (RT10-INV-2; CUM-3; D6 §4.3 AIR-2 prohibition on suppression). Only registered InferenceProtocols may be applied (RT10-INV-3; D-2 §VII). When dks_source_classification is CONTESTED or DEGRADED: RT10-INV-4 requires an UnderstandingDegradationFlag to be produced and lifecycle_state must be DEGRADED. Constitutional validity conditions CUM-1 through CUM-5 apply. CUM BOUNDARY: RT-10 produces but does NOT own CUM — RT-11 owns CUM per A0 §3.12. Submitted to RT-03 as Class A; committed to RT-05.',
  }),

  SCHEMA: Object.freeze({

    dum_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.1 RT10-OBJ-01; A0-v1.1.1 §3.11',
      description: 'Unique constitutional identifier for this DomainUnderstandingModel instance.',
    }),

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.1 "Instances: 12 (one per civilization domain)"; RS-11 RT10-STATE-01; A1 §6.1',
      description: 'Identifier of the civilization domain this DomainUnderstandingModel covers. One of the 12 registered civilization domains (per A1 §6.1).',
    }),

    rt10_operation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A1 §6.2 (provenance anchor second component: RT-10 operation ID); R10-v1.1-canonical.md RS-10.1; RT10-INV-1',
      description: 'RT-10 operation identifier for this DUM formation or update operation. Forms the second component of the A1 §6.2 provenance anchor pair: (Knowledge Record ID(s), RT-10 operation ID). RT10-INV-1 enforcement.',
    }),

    knowledge_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A1 §6.2 "provenance anchor: Knowledge Record ID(s) (owned RT-09)"; R10-v1.1-canonical.md RS-10.1; RT10-INV-1; D8 INV-4 (Reality Grounding)',
      description: 'Knowledge Record ID from RT-09 that grounds this DomainUnderstandingModel. RT-09 owns the Knowledge Record; this is a cross-runtime provenance reference. RT10-INV-1: DUM without Knowledge Record provenance anchor is a constitutional violation. D8 INV-4 Reality Grounding: DUM must be traceable to admitted observation-grounded knowledge.',
    }),

    inference_protocol_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'RT10-INV-3 "only registered InferenceProtocols may be applied"; D-2 §VII (registered protocols); D6 §4.3 (AIR-2 obligation); R10-v1.1-canonical.md RS-10.1',
      description: 'InferenceProtocol.protocol_id of the registered protocol applied during this DUM formation. RT10-INV-3 violation if unregistered protocol applied. D-2 §VII: protocol must be interpretable.',
    }),

    inference_protocol_version: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D6 §4.3 (AIR-2 obligation: record which protocol version was applied); R10-v1.1-canonical.md RS-10.2 (InferenceProtocol is versioned); RT10-INV-3',
      description: 'Version of the InferenceProtocol applied. D6 §4.3 requires that the applied protocol version be recorded. Must match an InferenceProtocol in CURRENT or REGISTERED status.',
    }),

    domain_understanding_content: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.1 RT10-PROC-01; A0-v1.1.1 §3.11; D-2 §VII (interpretability)',
      description: 'The synthesized domain understanding produced by applying the registered InferenceProtocol to the source Knowledge Record. Must be interpretable per D-2 §VII (RT10-INV-1).',
    }),

    dks_source_classification: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'UNCERTAIN', 'CONTESTED', 'DEGRADED'],
      constitutional_source: 'R10-v1.1-canonical.md RS-10.1 "DKS-source"; RS-11 RT10-STATE-01; RT10-INV-4; R9-v1.0-canonical.md RS-10.5 (DKS-1 ACTIVE, DKS-2 UNCERTAIN, DKS-3 CONTESTED, DKS-4 DEGRADED)',
      description: 'DKS classification of the source KnowledgeState from RT-09. ACTIVE (DKS-1) or UNCERTAIN (DKS-2): lifecycle_state may be CURRENT. CONTESTED (DKS-3) or DEGRADED (DKS-4): lifecycle_state must be DEGRADED; RT10-INV-4 requires an UnderstandingDegradationFlag to be produced (RT10-OUT-03).',
    }),

    uncertainty_attributes: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'RT10-INV-2 "uncertainty from source Knowledge State propagated into DUM without collapse"; CUM-3 (Uncertainty Preservation); D6 §4.3 (AIR-2 prohibition on suppression); R10-v1.1-canonical.md RS-10.1',
      description: 'Uncertainty attributes preserved from the source Knowledge Record without collapse. RT10-INV-2 and CUM-3 forbid uncertainty suppression. Must preserve the full uncertainty characterization from the source epistemic chain.',
    }),

    temporal_validity_metadata: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'CUM-4 (Temporal Validity: DUM carries temporal validity metadata); D8 INV-5 (Temporal Awareness); R10-v1.1-canonical.md RS-10.1 RS-12 RT10-PROC-01 step 5',
      description: 'Temporal validity metadata for this DomainUnderstandingModel. CUM-4 requires every DUM to carry temporal validity metadata. D8 INV-5 Temporal Awareness.',
    }),

    formation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Temporal layer; R10-v1.1-canonical.md RS-10.1 RS-12 RT10-PROC-01',
      description: 'ISO 8601 timestamp when this DomainUnderstandingModel was formed or last updated.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['FORMING', 'SUBMITTED', 'ADMITTED', 'CURRENT', 'DEGRADED', 'HISTORICAL', 'REJECTED'],
      constitutional_source: 'R10-v1.1-canonical.md RS-10.1 "Lifecycle states: FORMING → SUBMITTED → ADMITTED → CURRENT | DEGRADED | HISTORICAL | REJECTED"',
      description: 'FORMING: synthesis in progress. SUBMITTED: Class A submitted to RT-03. ADMITTED: committed to RT-05. CURRENT: DKS-1 or DKS-2 source — valid and current. DEGRADED: DKS-3 or DKS-4 source — RT10-INV-4 applies; UnderstandingDegradationFlag produced. HISTORICAL: superseded by newer DUM for this domain. REJECTED: RT-03 gate failure.',
    }),

    rt10_inv1_provenance_satisfied: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'RT10-INV-1 (interpretability invariant: DUM without Knowledge Record provenance anchor is a constitutional violation); R10-v1.1-canonical.md RS-10.1 Forbidden configurations',
      description: 'Attestation that RT10-INV-1 is satisfied: this DUM anchors to Knowledge Record ID(s) from RT-09 + RT-10 operation ID (A1 §6.2). Must be true; false constitutes RT10-INV-1 violation.',
    }),

    rt10_inv2_uncertainty_preserved: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'RT10-INV-2 (uncertainty preservation invariant); CUM-3; D6 §4.3 (AIR-2 prohibition on suppression); R10-v1.1-canonical.md RS-10.1',
      description: 'Attestation that RT10-INV-2 and CUM-3 are satisfied: uncertainty attributes from source Knowledge Record have been propagated into this DUM without collapse or suppression. Must be true; false constitutes RT10-INV-2 violation.',
    }),

  }),

  validate(data) {
    return _validate('DomainUnderstandingModel', DomainUnderstandingModel.SCHEMA, data);
  },

  create(data) {
    return _create('DomainUnderstandingModel', DomainUnderstandingModel.SCHEMA, DomainUnderstandingModel.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT10 — InferenceProtocol
// Constitutional basis: R10-v1.1-canonical.md RS-10.2 (RT10-OBJ-02);
// A0-v1.1.1 §3.11; D-2 §VII (interpretability; registered protocols);
// D6 §4.3 (AIR-2 authority type; registration obligation);
// RT10-INV-3 (registered protocols only for DUM formation)
//
// Governance and registry object. Versioned: REGISTERED → CURRENT → SUPERSEDED.
// Prior versions are retained for provenance tracing — DUMs referencing a
// SUPERSEDED InferenceProtocol must remain traceable. Only CURRENT or REGISTERED
// protocols may be applied to new DUM formation operations (RT10-INV-3).
//
// REGISTRATION AUTHORITY NOTE: RS-10.2 and RS-12 state that the registration
// authority for InferenceProtocol objects is undefined in the current constitutional
// record. This parallels the EpistemicProtocol registration authority open question
// in R9-v1.0 RS-12. This implementation preserves that limitation; no registration
// authority is invented. Any implementation must await a constitutional amendment
// defining the registration authority.
//
// Not structurally immutable (versioned registry object).
// Classification: Owned; Operational State (registry maintained by RT-10).
// ─────────────────────────────────────────────────────────────────────────────

const InferenceProtocol = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'InferenceProtocol',
    runtime_id:       'RT-10',
    runtime_name:     'Intelligence Runtime',
    authority:        'R10-v1.1-canonical.md RS-10.2 (RT10-OBJ-02); A0-v1.1.1 §3.11; D-2 §VII (interpretability; registered protocols); D6 §4.3 (AIR-2); RT10-INV-3; RS-12 Open Question (registration authority undefined)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-08',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT10-INV-3'],
    constitutional_note: 'VERSIONED REGISTRY OBJECT — NOT structurally immutable. Lifecycle: REGISTERED → CURRENT → SUPERSEDED. Prior versions retained for provenance tracing; DUMs referencing SUPERSEDED protocols remain traceable. RT10-INV-3: only CURRENT or REGISTERED protocols may be applied to DUM formation. D-2 §VII: protocols must be interpretable. REGISTRATION AUTHORITY UNDEFINED (RS-10.2 RS-12 stated limitation): the constitutional actor authorized to register InferenceProtocols is not defined. This parallels R9 EpistemicProtocol open question. Preserve limitation until constitutional amendment defines registration authority. Classification: Owned; Operational State (registry maintained by RT-10).',
  }),

  SCHEMA: Object.freeze({

    protocol_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.2 RT10-OBJ-02; D-2 §VII; D6 §4.3',
      description: 'Unique constitutional identifier for this InferenceProtocol. Used as reference in DomainUnderstandingModel.inference_protocol_ref.',
    }),

    protocol_version: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.2 "versioned"; D6 §4.3 (AIR-2 obligation: record protocol version in DUM)',
      description: 'Version identifier for this InferenceProtocol. D6 §4.3 requires that the applied protocol version be recorded in every DomainUnderstandingModel.',
    }),

    protocol_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-2 §VII (interpretability: protocols must be interpretable and documented); R10-v1.1-canonical.md RS-10.2',
      description: 'Description of the inference methodology this protocol implements. D-2 §VII interpretability obligation: the protocol must be documented and its operation interpretable.',
    }),

    registration_status: Object.freeze({
      required: true, type: 'string',
      enum: ['REGISTERED', 'CURRENT', 'SUPERSEDED'],
      constitutional_source: 'R10-v1.1-canonical.md RS-10.2 "Lifecycle: REGISTERED → CURRENT → SUPERSEDED"',
      description: 'REGISTERED: newly registered, pending full operational status. CURRENT: this version is the active constitutionally registered protocol — RT-10 may apply it to DUM formation. SUPERSEDED: this version has been replaced; retained for provenance tracing only — RT-10 may not apply SUPERSEDED protocols to new DUM formation operations (RT10-INV-3).',
    }),

    registration_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D2 Temporal layer; R10-v1.1-canonical.md RS-10.2; D6 §4.3',
      description: 'ISO 8601 timestamp when this InferenceProtocol was registered.',
    }),

    // Optional: only present when this version has been superseded
    superseded_by_version: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.2 "prior version retained for provenance tracing"; D6 §4.3',
      description: 'protocol_version of the InferenceProtocol that supersedes this version. Present only when registration_status=SUPERSEDED.',
    }),

  }),

  validate(data) {
    return _validate('InferenceProtocol', InferenceProtocol.SCHEMA, data);
  },

  create(data) {
    return _create('InferenceProtocol', InferenceProtocol.SCHEMA, InferenceProtocol.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT10 — UnderstandingDegradationFlag
// Constitutional basis: R10-v1.1-canonical.md RS-10.3 (RT10-OBJ-03);
// A0-v1.1.1 §3.11; RT10-INV-4 (degradation flagging when DKS-3 or DKS-4);
// RT10-OUT-03 (Class B signal output to RT-06 and RT-11)
//
// Signal object. Produced when source Knowledge State is DKS-3 (CONTESTED)
// or DKS-4 (DEGRADED). Delivered to RT-06 (Coherence Runtime) and RT-11
// (Civilization Intelligence Runtime — CUM Degradation Protocol per D7 §5.1)
// as Class B signal output. Structurally immutable after production.
//
// Validity conditions (RS-10.3): must identify the domain; reference the
// triggering Knowledge State ID and DKS classification; carry production timestamp.
//
// Lifecycle: PRODUCED → ACTIVE → RETRACTED
// RETRACTED when source Knowledge State returns to DKS-1 or DKS-2.
// Classification: Owned; Constitutional State (Class B signal via RT-03).
// ─────────────────────────────────────────────────────────────────────────────

const UnderstandingDegradationFlag = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'UnderstandingDegradationFlag',
    runtime_id:       'RT-10',
    runtime_name:     'Intelligence Runtime',
    authority:        'R10-v1.1-canonical.md RS-10.3 (RT10-OBJ-03); A0-v1.1.1 §3.11; RT10-INV-4; RT10-OUT-03 (Class B signal to RT-06 and RT-11); D7 §5.1 (CUM Degradation Protocol)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-08',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT10-INV-4'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE — Class B signal object. Produced ONLY when source Knowledge State is DKS-3 (CONTESTED) or DKS-4 (DEGRADED). RT10-INV-4 enforcement. Delivered to RT-06 (triggers coherence evaluation) and RT-11 (CUM Degradation Protocol per D7 §5.1) as Class B signal (RT10-OUT-03). RETRACTED when source Knowledge State returns to DKS-1 (ACTIVE) or DKS-2 (UNCERTAIN). Validity conditions per RS-10.3: must identify domain; reference triggering Knowledge State ID and DKS classification; carry production timestamp. Classification: Owned; Constitutional State (Class B signal committed to RT-05 via RT-03).',
  }),

  SCHEMA: Object.freeze({

    flag_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.3 RT10-OBJ-03; A0-v1.1.1 §3.11',
      description: 'Unique constitutional identifier for this UnderstandingDegradationFlag.',
    }),

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.3 "identifies the domain"; RS-11 RT10-STATE-03',
      description: 'Identifier of the civilization domain for which this degradation flag was produced. RS-10.3 validity condition: flag must identify the domain.',
    }),

    triggering_knowledge_state_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.3 "references the triggering Knowledge State ID"; RT10-INV-4; RT10-OUT-03',
      description: 'KnowledgeState.knowledge_state_id from RT-09 whose DKS-3 or DKS-4 classification triggered this flag. RT-09 owns KnowledgeState; this is a cross-runtime reference. RS-10.3 validity condition.',
    }),

    triggering_dks_classification: Object.freeze({
      required: true, type: 'string',
      enum: ['CONTESTED', 'DEGRADED'],
      constitutional_source: 'R10-v1.1-canonical.md RS-10.3 "produced when source Knowledge State is DKS-3 or DKS-4"; RT10-INV-4; R9-v1.0 RS-10.5 (DKS-3 CONTESTED, DKS-4 DEGRADED)',
      description: 'DKS classification of the triggering Knowledge State. Only CONTESTED (DKS-3) or DEGRADED (DKS-4) may produce an UnderstandingDegradationFlag (RT10-INV-4). RS-10.3 validity condition.',
    }),

    production_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.3 "timestamp of production"; D2 Temporal layer; D8 INV-5',
      description: 'ISO 8601 timestamp when this UnderstandingDegradationFlag was produced. RS-10.3 validity condition.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['PRODUCED', 'ACTIVE', 'RETRACTED'],
      constitutional_source: 'R10-v1.1-canonical.md RS-10.3 "Lifecycle: PRODUCED → ACTIVE → RETRACTED"',
      description: 'PRODUCED: flag just created (DKS-3 or DKS-4 source detected). ACTIVE: flag delivered and acknowledged by RT-06 and RT-11. RETRACTED: source Knowledge State has returned to DKS-1 (ACTIVE) or DKS-2 (UNCERTAIN); flag is no longer operative.',
    }),

    // Optional: present when lifecycle_state=RETRACTED
    retraction_timestamp: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R10-v1.1-canonical.md RS-10.3 "RETRACTED when source Knowledge State returns to DKS-1 or DKS-2"; RS-11 RT10-STATE-03',
      description: 'ISO 8601 timestamp when this UnderstandingDegradationFlag was retracted. Present only when lifecycle_state=RETRACTED.',
    }),

  }),

  validate(data) {
    return _validate('UnderstandingDegradationFlag', UnderstandingDegradationFlag.SCHEMA, data);
  },

  create(data) {
    return _create('UnderstandingDegradationFlag', UnderstandingDegradationFlag.SCHEMA, UnderstandingDegradationFlag.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  DomainUnderstandingModel,
  InferenceProtocol,
  UnderstandingDegradationFlag,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-10',
  WAVE:        'W1-08',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
