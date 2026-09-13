'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/civilizational-decision-proposal.js
// Task: W1-09 — RT-11 Civilization Intelligence Runtime Type Definitions
// Runtime: RT-11 — Civilization Intelligence Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-27
// Authority: A0-v1.1.1 §3.12; R11-v1.3-canonical.md RS-01 RS-03 RS-04 RS-05
//            RS-07 RS-09 RS-10 RS-11 RS-12 RS-20 RS-24 RS-34;
//            D-7-v1.0 Parts 3 4 5 7 8 9 10 11; D-8-v1.0 §9.5;
//            D-2-v1.0 §VII; D-6-v1.0 §4.1–4.4; A1-v1.2 §8.1 §12.3 §14.3;
//            RT11-INV-1 through RT11-INV-7; DA-1 through DA-6; ER-1 through ER-5;
//            C0-ERRATA-011A (CivilizationalDecisionProposal not CivilizationalDecision)
//
// ─── SECTION NUMBER DISCREPANCY NOTE ─────────────────────────────────────────
// D-1 (Type C — Implementation Interpretation):
//   Wave plan W1-09 cites "A0-v1.1.1 §3.11" as constitutional basis.
//   R11-v1.3-canonical.md RS-01 confirms correct constitutional seat is §3.12.
//   Off-by-one artifact consistent with W1-04 W1-07 W1-08 W1-12 W1-14.
//   CONSTITUTIONAL blocks use §3.12 per R-series authority.
//
// ─── TYPE SET SCOPE NOTE ─────────────────────────────────────────────────────
// D-2 (Type A — Planning Document Choice):
//   Wave plan specifies 7 types including CivilizationalDecisionProposal (CDP).
//   R11-v1.3 RS-07 Owned Objects lists 8 types:
//     CivilizationUnderstandingModel, DeliberationRecord, CausalModel,
//     AssumptionRegister, StrategicPlan, CivilizationCoherenceState,
//     CUMDegradationState, CollectiveIntelligenceContributionRecord.
//   CDP (CivilizationalDecisionProposal) is NOT in RS-07 Owned Objects;
//   CDP IS in RS-10 Managed Objects Item 3 as the constitutionally required
//   RT-12 handoff object. Wave plan includes CDP for RT-12 handoff continuity
//   per C0-ERRATA-011A and defers CUMDegradationState and
//   CollectiveIntelligenceContributionRecord to a later wave.
//   Resolution: Implement the wave plan's 7-type scope. Deferred types documented.
//
// ─── OWNERSHIP BOUNDARY ──────────────────────────────────────────────────────
// RT-11 OWNS (implemented here):
//   CivilizationUnderstandingModel, DeliberationRecord, CausalModel,
//   AssumptionRegister, StrategicPlan, CivilizationCoherenceState,
//   CivilizationalDecisionProposal
//
// RT-11 DEFERRED (not in this wave):
//   CUMDegradationState (RS-07 owned; deferred per wave plan scope)
//   CollectiveIntelligenceContributionRecord (RS-07 owned; deferred)
//
// RT-11 DOES NOT OWN:
//   CivilizationalDecision — owned by RT-12 (A0 §3.13; C0-ERRATA-011A)
//   DomainUnderstandingModels — owned by RT-10 (A0 §3.11)
//   HistoricalStateRecords — owned by RT-07 (A0 §3.8)
//   ComplianceVerificationRecord — owned by RT-12 (A0 §3.13)
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT11 — CivilizationUnderstandingModel (CUM)
// Constitutional basis: R11-v1.3-canonical.md RS-07 RS-10 Item 1 RS-11;
// A0-v1.1.1 §3.12 R1 R2 R3; D-7-v1.0 Part 3.3 (9-step CSP);
// CUM-1 (Knowledge Grounding), CUM-2 (Cross-Domain Integrity),
// CUM-3 (Uncertainty Preservation), CUM-4 (Temporal Validity),
// CUM-5 (Reality Alignment); RT11-INV-1 RT11-INV-2 RT11-INV-3
//
// Produced by the 9-step Constitutional Synthesis Process (CSP) from exactly
// 12 DomainUnderstandingModels received from RT-10. RT-11 owns the CUM
// definitively (A0 §3.12 R1–R3; CON-02 resolution in R11-v1.3 RS-12).
// A1-v1.2 PAIR 32 P4's "provisionally owned by RT-10" language is lower-authority
// and superseded by A0 §3.12 per constitutional hierarchy.
//
// Not structurally immutable — transitions through lifecycle states
// (CURRENT → STALE → EXPIRED; DEGRADED is Loop-Terminating).
// CUM writes are Class A operations; must pass through RT-03 (IC-4).
// RT11-INV-1: RT-11 is the sole constitutional authority for CUM synthesis.
// RT11-INV-2: CUM-1 through CUM-5 must be satisfied before CURRENT state.
// RT11-INV-3: CSP may not be initiated with fewer than 12 validated DUMs.
// ─────────────────────────────────────────────────────────────────────────────

const CivilizationUnderstandingModel = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CivilizationUnderstandingModel',
    runtime_id:       'RT-11',
    runtime_name:     'Civilization Intelligence Runtime',
    authority:        'R11-v1.3-canonical.md RS-07 RS-10 Item 1 RS-11; A0-v1.1.1 §3.12 R1 R2 R3; D-7-v1.0 Part 3.3 (CSP); CUM-1 CUM-2 CUM-3 CUM-4 CUM-5; RT11-INV-1 RT11-INV-2 RT11-INV-3; D-8-v1.0 §9.5 IC-9 (CUM write exclusivity)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-09',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT11-INV-1', 'RT11-INV-2', 'RT11-INV-3'],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — lifecycle transitions: UNINITIATED → ACCUMULATING → SYNTHESIZING → CURRENT → STALE → EXPIRED; DEGRADED is Loop-Terminating. RT-11 owns CUM definitively (A0 §3.12 R1–R3). A1 PAIR 32 P4 "provisionally owned by RT-10" is superseded by A0 §3.12 (CON-02 in R11-v1.3 RS-12). CSP requires exactly 12 validated DUMs (RT11-INV-3). CUM-1 through CUM-5 must all be satisfied before CURRENT state (RT11-INV-2). All CUM version writes are Class A operations via RT-03 (D-8 IC-4 IC-9). No external runtime may write, modify, or version the CUM (D-8 IC-9).',
  }),

  SCHEMA: Object.freeze({

    cum_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-10 Item 1; RS-11 cum_version; A0-v1.1.1 §3.12',
      description: 'Unique constitutional identifier for this CivilizationUnderstandingModel instance.',
    }),

    cum_version: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-11 cum_version "updated on each synthesis"; RS-23 Audit Event "CUM Version Update"; A0-v1.1.1 §3.12 R3',
      description: 'Constitutional version identifier for this CUM synthesis output. Updated on each CSP completion. Every version must be preserved for historical state tracing (RT-07).',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['UNINITIATED', 'ACCUMULATING', 'SYNTHESIZING', 'CURRENT', 'STALE', 'EXPIRED', 'DEGRADED'],
      constitutional_source: 'R11-v1.3-canonical.md RS-10 Item 1 "CUM Lifecycle States"; RS-11 cum_state; RT11-INV-2 (CUM-1–5 required for CURRENT); ER-2 (EXPIRED blocks decision production)',
      description: 'UNINITIATED: no DUMs received. ACCUMULATING: 1–11 DUMs received; CSP blocked. SYNTHESIZING: all 12 DUMs validated; CSP executing. CURRENT: synthesis complete; CUM-1–5 satisfied; deliberation permitted. STALE: approaching currency threshold; refresh advisory. EXPIRED: past threshold; ER-2 blocks decision production. DEGRADED: integrity below threshold; CDP declared; Loop-Terminating (RT11-INV-7).',
    }),

    dum_manifest: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R11-v1.3-canonical.md RS-11 dum_manifest "identifiers of received DUMs"; RT11-INV-3 "CSP may not be initiated with fewer than 12 validated DUMs"; RS-12 Process 1 Step 1; RS-23 Audit Event "CSP Initiation"',
      description: 'Ordered array of DomainUnderstandingModel identifiers (all 12) used in this CUM synthesis. RT11-INV-3 enforcement: exactly 12 validated DUM identifiers must be present when lifecycle_state >= SYNTHESIZING. Forms the provenance chain for CUM-1 (Knowledge Grounding).',
    }),

    domain_count: Object.freeze({
      required: true, type: 'number',
      constitutional_source: 'R11-v1.3-canonical.md RS-10 Item 1 "twelve Domain Understanding Models"; RT11-INV-3; RS-08 Input Completeness Requirements',
      description: 'Count of DomainUnderstandingModels synthesized into this CUM. Constitutional requirement: must equal 12 at SYNTHESIZING state or above. Fewer than 12 constitutes RT11-INV-3 violation.',
    }),

    synthesis_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-11 cum_currency_timestamp "time of most recent CUM synthesis"; RS-23 Audit Event "CSP Completion"; D-2 §VII Temporal layer',
      description: 'ISO 8601 timestamp when this CUM synthesis was completed (when lifecycle_state transitioned to CURRENT). Anchors CUM-4 (Temporal Validity) currency threshold assessment.',
    }),

    cum_1_knowledge_grounding: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'A0-v1.1.1 §3.12 R2 "CUM-1 (Knowledge Grounding)"; R11-v1.3-canonical.md RS-05 R2; RT11-INV-2',
      description: 'Attestation that CUM-1 (Knowledge Grounding) is satisfied: the CUM is grounded in admitted Knowledge Records from RT-09 via the DUM pipeline. Must be true before lifecycle_state may be CURRENT (RT11-INV-2).',
    }),

    cum_2_cross_domain_integrity: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'A0-v1.1.1 §3.12 R2 "CUM-2 (Cross-Domain Integrity)"; R11-v1.3-canonical.md RS-05 R2; RT11-INV-2; D-7-v1.0 Part 3.3 Step 3 (cross-domain tension resolution)',
      description: 'Attestation that CUM-2 (Cross-Domain Integrity) is satisfied: cross-domain tensions have been resolved or registered as Knowledge Gaps. Must be true before lifecycle_state may be CURRENT (RT11-INV-2).',
    }),

    cum_3_uncertainty_preservation: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'A0-v1.1.1 §3.12 R2 "CUM-3 (Uncertainty Preservation)"; R11-v1.3-canonical.md RS-05 R2; RT11-INV-2; D-8-v1.0 PROH-8 (no coherence fabrication)',
      description: 'Attestation that CUM-3 (Uncertainty Preservation) is satisfied: all uncertainty from source DUMs has been preserved in the CUM without collapse. Must be true before lifecycle_state may be CURRENT (RT11-INV-2). D-8 PROH-8 prohibits declaring CUM coherent when coherence assessment fails.',
    }),

    cum_4_temporal_validity: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'A0-v1.1.1 §3.12 R2 "CUM-4 (Temporal Validity)"; R11-v1.3-canonical.md RS-05 R2; RT11-INV-2; RS-25 M-03 (CUM Currency Age)',
      description: 'Attestation that CUM-4 (Temporal Validity) is satisfied: the CUM was synthesized within constitutional currency thresholds and all source DUMs were current at synthesis time. Must be true before lifecycle_state may be CURRENT (RT11-INV-2).',
    }),

    cum_5_reality_alignment: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'A0-v1.1.1 §3.12 R2 "CUM-5 (Reality Alignment)"; R11-v1.3-canonical.md RS-05 R2; RT11-INV-2; D-8-v1.0 PROH-5 (no reality decoupling)',
      description: 'Attestation that CUM-5 (Reality Alignment) is satisfied: the CUM reflects actual domain understanding, not idealized state. Must be true before lifecycle_state may be CURRENT (RT11-INV-2). D-8 PROH-5 prohibits reality decoupling.',
    }),

  }),

  validate(data) {
    return _validate('CivilizationUnderstandingModel', CivilizationUnderstandingModel.SCHEMA, data);
  },

  create(data) {
    return _create('CivilizationUnderstandingModel', CivilizationUnderstandingModel.SCHEMA, CivilizationUnderstandingModel.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT11 — DeliberationRecord (DR)
// Constitutional basis: R11-v1.3-canonical.md RS-07 RS-10 Item 2 RS-12 Process 2;
// A0-v1.1.1 §3.12 R4 R5; D-7-v1.0 Part 4.6 (13-element record);
// D-7-v1.0 Part 4.4 (evidence standards ESt-1 through ESt-5);
// RT11-INV-3 (deliberation required); RT11-INV-5 (disagreement preserved);
// D-8-v1.0 IC-2 (immutable once written and registered);
// RS-23 Audit Event "Deliberation Record Completion"; DA-2 (Deliberation Grounding)
//
// Constitutional 13-element record produced for every CivilizationalDecisionProposal.
// Every element is mandatory. STRUCTURALLY IMMUTABLE per IC-2: once a Deliberation
// Record element is written and registered, it may not be modified.
// RT11-INV-4: every CivilizationalDecisionProposal must reference a complete DR.
// RT11-INV-5: disagreement must be preserved (Elements 6 and 10 must be populated
// honestly — no suppression of conflicting views or sacrificed objectives).
// ─────────────────────────────────────────────────────────────────────────────

const DeliberationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DeliberationRecord',
    runtime_id:       'RT-11',
    runtime_name:     'Civilization Intelligence Runtime',
    authority:        'R11-v1.3-canonical.md RS-07 RS-10 Item 2 RS-12 Process 2; A0-v1.1.1 §3.12 R4 R5; D-7-v1.0 Part 4.6; D-7-v1.0 Part 4.4 (ESt-1 through ESt-5); RT11-INV-3 RT11-INV-4 RT11-INV-5; DA-2 (Deliberation Grounding); D-8-v1.0 IC-2 (immutable once registered)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-09',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: true,
    invariants: ['RT11-INV-3', 'RT11-INV-4', 'RT11-INV-5'],
    constitutional_note: 'STRUCTURALLY IMMUTABLE (D-8 IC-2): once a Deliberation Record element is written and registered, it may not be modified. 13-element record produced for every CivilizationalDecisionProposal (D-7 Part 4.6). RT11-INV-4: every CDP must reference a complete DR with all 13 elements populated. RT11-INV-5: disagreement preservation — Elements 6 (Conflicts Registered) and 10 (Sacrificed Objectives) must be populated honestly; suppression is a constitutional violation. D-8 PROH-7: RT-11 may not suppress ObservedConsequenceSignals from influencing deliberation inputs. DA-2: CDP is constitutionally invalid without a complete DR reference.',
  }),

  SCHEMA: Object.freeze({

    dr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-10 Item 2; D-7-v1.0 Part 4.6; RS-23 Audit Event "Deliberation Record Completion"',
      description: 'Unique constitutional identifier for this DeliberationRecord.',
    }),

    // Element 1 — Question
    question: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 1 "The civilizational question under deliberation"; R11-v1.3-canonical.md RS-10 Item 2',
      description: 'Element 1: The civilizational question under deliberation. D-7 Part 4.6 Element 1. Must be articulated before deliberation initiates (RS-12 Process 2 Step 2).',
    }),

    // Element 2 — CUM State
    cum_state_at_initiation: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 2 "State and version of CUM at deliberation initiation"; R11-v1.3-canonical.md RS-10 Item 2; DA-3 (CUM Grounding)',
      description: 'Element 2: Lifecycle state of the CUM at the moment deliberation was initiated (e.g., CURRENT). Records the CUM state used for deliberation for traceability. DA-3 requires the CUM to be CURRENT at deliberation initiation.',
    }),

    cum_version_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 2; R11-v1.3-canonical.md RS-10 Item 2; DA-3 (CUM Grounding Requirement); RS-23 Audit Event "Deliberation Initiation"',
      description: 'Reference to the CivilizationUnderstandingModel.cum_version used as the epistemic basis for this deliberation. DA-3: CDP grounded in this DR is constitutionally invalid if this CUM version is not CURRENT at production time.',
    }),

    // Element 3 — Participants
    participants: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 3 "All runtimes and processes participating in deliberation"; A0-v1.1.1 §3.12 R4 "assemble required participants: Authority, Epistemic, Audit, Theory of Change, DOM-000001"',
      description: 'Element 3: All runtimes and processes participating in deliberation. A0 §3.12 R4 requires: Authority, Epistemic, Audit, Theory of Change, and DOM-000001 participants. Each entry identifies the participant runtime/process.',
    }),

    // Element 4 — Evidence Used
    evidence_used: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 4 "All evidence inputs with provenance"; D-7-v1.0 Part 4.4 ESt-1 (provenance chain) ESt-2 (currency) ESt-3 (uncertainty quantified) ESt-4 (contradictory evidence registered) ESt-5 (evidence gaps as Knowledge Gaps); ER-4 (no fabricated knowledge)',
      description: 'Element 4: All evidence inputs used in deliberation with provenance chains. ESt-1: each entry must have verified provenance. ESt-2: entries must be within currency thresholds. ESt-3: uncertainty quantified. ESt-4: contradictory evidence registered with resolution reasoning. ESt-5: evidence gaps registered as Knowledge Gaps. ER-4 violation if any entry lacks verified provenance.',
    }),

    // Element 5 — Alternatives Considered
    alternatives_considered: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 5 "All decision alternatives evaluated"; R11-v1.3-canonical.md RS-12 Process 2 Step 4; A0-v1.1.1 §3.12 R4',
      description: 'Element 5: All decision alternatives evaluated during deliberation. Must include the alternative ultimately selected and all alternatives rejected. Completeness is a constitutional requirement per D-7 Part 4.6.',
    }),

    // Element 6 — Conflicts Registered
    conflicts_registered: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 6 "All constitutional conflicts identified during deliberation"; RT11-INV-5 (disagreement preserved); R11-v1.3-canonical.md RS-12 Process 2 Step 5; D-8-v1.0 PROH-7 (feedback suppression prohibited)',
      description: 'Element 6: All constitutional conflicts identified during deliberation. RT11-INV-5: disagreement must be preserved — suppression of conflicting views is a constitutional violation. D-8 PROH-7 prohibition applies. May be empty array only if no conflicts genuinely identified.',
    }),

    // Element 7 — Knowledge Gaps
    knowledge_gaps: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 7 "All epistemic gaps identified and their classification"; ER-5 (gap ignored blocks decision production); R11-v1.3-canonical.md RS-12 Process 2 Step 6; D-7-v1.0 Part 4.4 ESt-5',
      description: 'Element 7: All epistemic gaps identified and their classification. ER-5: any identified knowledge gap that has not been registered blocks decision production. May be empty array only if no gaps genuinely identified. ESt-5: evidence gaps must be registered here.',
    }),

    // Element 8 — Competing Objectives
    competing_objectives: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 8 "All objectives in tension with resolution approach"; R11-v1.3-canonical.md RS-12 Process 2 Step 7; A0-v1.1.1 §3.12 R4',
      description: 'Element 8: All objectives in tension with the resolution approach. Must identify each competing objective and characterize the tension. May be empty array only if no genuine objective tensions exist.',
    }),

    // Element 9 — Resolution Reasoning
    resolution_reasoning: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 9 "Constitutional basis for conflict resolution"; R11-v1.3-canonical.md RS-12 Process 2 Step 9; D-7-v1.0 Part 4.4 ESt-4',
      description: 'Element 9: Constitutional basis for conflict resolution. Must document the reasoning that resolved conflicts between alternatives and objectives. ESt-4: if contradictory evidence was identified, resolution reasoning must be provided here.',
    }),

    // Element 10 — Sacrificed Objectives
    sacrificed_objectives: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 10 "Objectives not achieved and justification"; RT11-INV-5 (disagreement preserved — sacrificed objectives must be registered honestly); R11-v1.3-canonical.md RS-12 Process 2 Step 10',
      description: 'Element 10: Objectives not achieved and justification for their sacrifice. RT11-INV-5: sacrificed objectives must be registered honestly — suppression is a constitutional violation. May be empty array only if no objectives were genuinely sacrificed.',
    }),

    // Element 11 — Decision Output
    decision_output_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 11 "The CivilizationalDecisionProposal produced"; R11-v1.3-canonical.md RS-10 Item 2; C0-ERRATA-011A (CDP not CivilizationalDecision)',
      description: 'Element 11: Reference to the CivilizationalDecisionProposal.cdp_id produced from this deliberation. C0-ERRATA-011A: must reference CivilizationalDecisionProposal (RT-11 produced), not CivilizationalDecision (RT-12 owned).',
    }),

    // Element 12 — Confidence
    confidence: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 12 "Epistemic confidence level with basis"; R11-v1.3-canonical.md RS-10 Item 2; CUM-3 (uncertainty preservation); ER-3 (suppressed uncertainty blocks production)',
      description: 'Element 12: Epistemic confidence level with basis. Must characterize the confidence in the decision output and the grounds for that confidence. ER-3: known uncertainties must be registered — suppressed uncertainty blocks CDP production.',
    }),

    // Element 13 — Review Requirement
    review_requirement: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 4.6 Element 13 "Whether and when the decision requires constitutional review"; R11-v1.3-canonical.md RS-10 Item 2; A0-v1.1.1 §3.12 R6',
      description: 'Element 13: Whether and when the decision requires constitutional review. Must specify review requirement status and, if review is required, the conditions or timeline triggering review.',
    }),

    initiation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-23 Audit Event "Deliberation Initiation" "CUM version, timestamp, initial question"; D-2 §VII Temporal layer',
      description: 'ISO 8601 timestamp when deliberation was initiated (Question element populated and CUM verified CURRENT).',
    }),

    // Optional — present when deliberation is complete
    completion_timestamp: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-23 Audit Event "Deliberation Record Completion"; D-7-v1.0 Part 4.6',
      description: 'ISO 8601 timestamp when all 13 Deliberation Record elements were populated. Present when deliberation is complete. D-8 IC-2: no modifications permitted after this timestamp.',
    }),

  }),

  validate(data) {
    return _validate('DeliberationRecord', DeliberationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('DeliberationRecord', DeliberationRecord.SCHEMA, DeliberationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT11 — CausalModel (CM)
// Constitutional basis: R11-v1.3-canonical.md RS-07 RS-05 R8;
// A0-v1.1.1 §3.12 R8; D-7-v1.0 Part 8 (Theory of Change Operations);
// TOC-3 (Outcome Comparison), TOC-4, TOC-5 (Model Revision)
//
// Managed per Theory of Change Operations (D7 Part 8). Owned by RT-11.
// Registration: new CausalModels are registered during deliberation.
// Revision: TOC-4 (model revision) and TOC-5 (assumption revision) govern updates.
// Outcome comparison (TOC-3) may trigger model revision based on observed consequences.
// Not structurally immutable — can be revised per TOC-4/TOC-5.
// ─────────────────────────────────────────────────────────────────────────────

const CausalModel = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CausalModel',
    runtime_id:       'RT-11',
    runtime_name:     'Civilization Intelligence Runtime',
    authority:        'R11-v1.3-canonical.md RS-07 RS-05 R8; A0-v1.1.1 §3.12 R8; D-7-v1.0 Part 8 (Theory of Change: TOC-3 TOC-4 TOC-5); R11-v1.3-canonical.md RS-12 Process 3 (Decision Authority Execution)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-09',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — revised per D-7 Part 8 TOC-4 (Model Revision) and TOC-5 (Assumption Revision). Lifecycle: REGISTERED → CURRENT → SUPERSEDED → REVISED. TOC-3 (Outcome Comparison): triggers model revision when observed consequences diverge from causal predictions. Each revision creates a new version; prior versions retained for provenance. Owned by RT-11; managed as part of Theory of Change Operations (D-7 Part 8). D-8 PROH-5 (no reality decoupling): CausalModel must reflect actual causal understanding, not idealized state.',
  }),

  SCHEMA: Object.freeze({

    cm_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-07 RS-05 R8; A0-v1.1.1 §3.12 R8; D-7-v1.0 Part 8',
      description: 'Unique constitutional identifier for this CausalModel.',
    }),

    causal_chain_description: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 8 (Theory of Change: causal pathway documentation); A0-v1.1.1 §3.12 R8; D-2 §VII (interpretability)',
      description: 'Constitutional description of the causal chain: the pathway from civilizational action through intermediate steps to expected outcome. Must be interpretable per D-2 §VII.',
    }),

    assumption_register_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 8 TOC-4 TOC-5 (Assumption Register governs model revision); R11-v1.3-canonical.md RS-07 AssumptionRegister',
      description: 'Reference to the AssumptionRegister.ar_id that governs the assumptions underlying this CausalModel. TOC-4 and TOC-5 model revision operations operate via the AssumptionRegister.',
    }),

    scope_classification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.12 (civilizational scope); R11-v1.3-canonical.md RS-04 Scope Definition; RS-35 PROH-R8 (no sub-civilizational decision authority)',
      description: 'Scope classification of this CausalModel (e.g., "civilizational", "cross-domain"). RS-35 PROH-R8: RT-11 CausalModels must not be scoped below civilizational level.',
    }),

    registration_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 8; D-2 §VII Temporal layer; R11-v1.3-canonical.md RS-05 R8',
      description: 'ISO 8601 timestamp when this CausalModel was registered.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['REGISTERED', 'CURRENT', 'SUPERSEDED', 'REVISED'],
      constitutional_source: 'R11-v1.3-canonical.md RS-07 (CausalModel "Managed per Theory of Change Operations"); D-7-v1.0 Part 8 TOC-4 TOC-5',
      description: 'REGISTERED: newly registered, not yet fully operational. CURRENT: active causal model in use for deliberation. SUPERSEDED: replaced by a newer version; retained for provenance. REVISED: revision initiated under TOC-4 or TOC-5; pending completion.',
    }),

  }),

  validate(data) {
    return _validate('CausalModel', CausalModel.SCHEMA, data);
  },

  create(data) {
    return _create('CausalModel', CausalModel.SCHEMA, CausalModel.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT11 — AssumptionRegister (AR)
// Constitutional basis: R11-v1.3-canonical.md RS-07 RS-05 R8;
// A0-v1.1.1 §3.12 R8; D-7-v1.0 Part 8 TOC-4 (Model Revision), TOC-5 (Assumption Revision)
//
// Registry object maintained per Theory of Change Operations (D7 Part 8).
// TOC-4: model revision updates the CausalModel and may update the AssumptionRegister.
// TOC-5: assumption revision directly updates the AssumptionRegister.
// Not structurally immutable — revised when assumptions are updated.
// Each AssumptionRegister belongs to exactly one CausalModel.
// ─────────────────────────────────────────────────────────────────────────────

const AssumptionRegister = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'AssumptionRegister',
    runtime_id:       'RT-11',
    runtime_name:     'Civilization Intelligence Runtime',
    authority:        'R11-v1.3-canonical.md RS-07 RS-05 R8; A0-v1.1.1 §3.12 R8; D-7-v1.0 Part 8 TOC-4 (Model Revision) TOC-5 (Assumption Revision)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-09',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — revised via D-7 Part 8 TOC-4 (Model Revision) and TOC-5 (Assumption Revision). Prior assumption sets are retained for provenance tracing. Each AssumptionRegister is associated with exactly one CausalModel (causal_model_ref). Assumption revisions that invalidate prior deliberation conclusions must trigger a new deliberation cycle. D-8 PROH-3 (no provenance destruction): revision history must be preserved.',
  }),

  SCHEMA: Object.freeze({

    ar_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-07 RS-05 R8; D-7-v1.0 Part 8 TOC-4 TOC-5',
      description: 'Unique constitutional identifier for this AssumptionRegister.',
    }),

    causal_model_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-07 (CausalModel "Maintained per TOC-4 and TOC-5 operations"); D-7-v1.0 Part 8',
      description: 'Reference to the CausalModel.cm_id that this AssumptionRegister governs. One-to-one relationship: each AssumptionRegister belongs to exactly one CausalModel.',
    }),

    assumptions: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'D-7-v1.0 Part 8 TOC-4 TOC-5 (assumption set managed); A0-v1.1.1 §3.12 R8; D-2 §VII (interpretability)',
      description: 'Ordered array of assumptions underlying the associated CausalModel. Each entry should identify the assumption and its constitutional basis or evidentiary grounding. Revised by TOC-4 and TOC-5 operations.',
    }),

    registration_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 8; D-2 §VII Temporal layer',
      description: 'ISO 8601 timestamp when this AssumptionRegister was initially created.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'REVISED', 'ARCHIVED'],
      constitutional_source: 'R11-v1.3-canonical.md RS-07 (AssumptionRegister "Maintained per TOC-4 and TOC-5 operations"); D-7-v1.0 Part 8',
      description: 'ACTIVE: assumptions are current and in use. REVISED: a TOC-4 or TOC-5 revision is in progress. ARCHIVED: assumptions superseded; retained for provenance (D-8 PROH-3).',
    }),

    // Optional — present when lifecycle_state = REVISED or ARCHIVED
    last_revision_timestamp: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 8 TOC-4 TOC-5; D-2 §VII Temporal layer',
      description: 'ISO 8601 timestamp of the most recent revision under TOC-4 or TOC-5. Present when lifecycle_state is REVISED or ARCHIVED.',
    }),

  }),

  validate(data) {
    return _validate('AssumptionRegister', AssumptionRegister.SCHEMA, data);
  },

  create(data) {
    return _create('AssumptionRegister', AssumptionRegister.SCHEMA, AssumptionRegister.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT11 — StrategicPlan (SP)
// Constitutional basis: R11-v1.3-canonical.md RS-07 RS-05 R7;
// A0-v1.1.1 §3.12 R7; D-7-v1.0 Part 7 (Strategic Plans);
// SP-1 through SP-6 requirements; Strategic Review Cycles;
// Strategic Failure Detection SFD-1 through SFD-4
//
// Governed per D-7 Part 7 (Strategic Plans). SP-1 through SP-6 requirements
// must all be satisfied. Strategic Review Cycles periodically reassess plans.
// SFD-1 through SFD-4 detect strategic failure modes.
// Not structurally immutable — subject to Strategic Review Cycles and SFD events.
// Must be grounded in a current CUM and a complete DeliberationRecord.
// ─────────────────────────────────────────────────────────────────────────────

const StrategicPlan = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'StrategicPlan',
    runtime_id:       'RT-11',
    runtime_name:     'Civilization Intelligence Runtime',
    authority:        'R11-v1.3-canonical.md RS-07 RS-05 R7; A0-v1.1.1 §3.12 R7; D-7-v1.0 Part 7 (SP-1 through SP-6; Strategic Review Cycles; SFD-1 through SFD-4)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-09',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — subject to Strategic Review Cycles (periodic reassessment) and Strategic Failure Detection SFD-1 through SFD-4. Lifecycle: PROPOSED → ACTIVE → UNDER_REVIEW → SUPERSEDED | FAILED. SP-1 through SP-6 requirements must all be satisfied at ACTIVE state. Must be grounded in a current CUM (cum_version_ref) and a complete DeliberationRecord (deliberation_record_ref). D-8 PROH-5: plan must reflect actual strategic understanding, not idealized state. D-8 PROH-3: revision history must be preserved.',
  }),

  SCHEMA: Object.freeze({

    sp_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-07 RS-05 R7; D-7-v1.0 Part 7',
      description: 'Unique constitutional identifier for this StrategicPlan.',
    }),

    plan_title: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 7; D-2 §VII (interpretability — plans must be legible)',
      description: 'Human-interpretable title for this StrategicPlan. D-2 §VII interpretability requirement.',
    }),

    deliberation_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'A0-v1.1.1 §3.12 R4 R5 (deliberation grounds all civilizational decisions); D-7-v1.0 Part 4.6; R11-v1.3-canonical.md RS-05 R5',
      description: 'Reference to the DeliberationRecord.dr_id whose deliberation produced this StrategicPlan. All civilizational decisions (including strategic plans) must be grounded in a complete 13-element deliberation (A0 §3.12 R5).',
    }),

    cum_version_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'DA-3 (CUM Grounding Requirement applied to strategic planning); A0-v1.1.1 §3.12 R1 R2; D-7-v1.0 Part 7',
      description: 'Reference to the CivilizationUnderstandingModel.cum_version that grounds this StrategicPlan. The plan must be grounded in a CUM that was CURRENT at plan formation time.',
    }),

    // SP-1 through SP-6 requirements
    sp_1_objective: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 7 SP-1 (objective specification requirement)',
      description: 'SP-1: The civilizational objective this StrategicPlan is designed to achieve. D-7 Part 7 SP-1 requirement.',
    }),

    sp_2_scope: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 7 SP-2 (scope definition requirement); RS-35 PROH-R8 (no sub-civilizational scope)',
      description: 'SP-2: Scope definition for this StrategicPlan. Must operate at civilizational scope (RS-35 PROH-R8). D-7 Part 7 SP-2 requirement.',
    }),

    sp_3_resources: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 7 SP-3 (resource identification requirement)',
      description: 'SP-3: Resources identified and committed for this StrategicPlan. D-7 Part 7 SP-3 requirement.',
    }),

    sp_4_timeline: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 7 SP-4 (timeline definition requirement); D-8 INV-5 (Temporal Awareness)',
      description: 'SP-4: Timeline defined for this StrategicPlan including milestones and review points. D-7 Part 7 SP-4 requirement. D-8 INV-5 Temporal Awareness.',
    }),

    sp_5_risk_assessment: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 7 SP-5 (risk assessment requirement); D-8 PROH-5 (no reality decoupling — risk must be realistic)',
      description: 'SP-5: Risk assessment for this StrategicPlan. D-7 Part 7 SP-5 requirement. D-8 PROH-5: risk assessment must not be idealized.',
    }),

    sp_6_review_cycle: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 7 SP-6 (review cycle definition requirement); D-7 Part 7 Strategic Review Cycles',
      description: 'SP-6: Review cycle definition for this StrategicPlan — when and how it will be periodically reassessed. D-7 Part 7 SP-6 requirement and Strategic Review Cycle governance.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['PROPOSED', 'ACTIVE', 'UNDER_REVIEW', 'SUPERSEDED', 'FAILED'],
      constitutional_source: 'R11-v1.3-canonical.md RS-07 (StrategicPlan "Governed per SP-1 through SP-6 requirements"); D-7-v1.0 Part 7 Strategic Failure Detection SFD-1 through SFD-4',
      description: 'PROPOSED: plan drafted but not yet activated. ACTIVE: SP-1 through SP-6 satisfied; plan in execution. UNDER_REVIEW: Strategic Review Cycle in progress. SUPERSEDED: replaced by a new StrategicPlan. FAILED: Strategic Failure Detection SFD-1 through SFD-4 triggered; plan has failed constitutionally.',
    }),

    creation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 7; D-2 §VII Temporal layer',
      description: 'ISO 8601 timestamp when this StrategicPlan was created.',
    }),

  }),

  validate(data) {
    return _validate('StrategicPlan', StrategicPlan.SCHEMA, data);
  },

  create(data) {
    return _create('StrategicPlan', StrategicPlan.SCHEMA, StrategicPlan.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT11 — CivilizationCoherenceState (CCS)
// Constitutional basis: R11-v1.3-canonical.md RS-07 RS-05 R12 RS-11;
// A0-v1.1.1 §3.12 R12; D-7-v1.0 Part 9 (Civilization Coherence Model);
// Six coherence dimensions: Understanding, Strategic, Decision, Domain Relationship,
// Temporal, Constitutional; continuous monitoring requirement
//
// Six-dimension coherence assessment of the current CUM. Produced during the CSP
// (D-7 Part 3.3 Step 6 CCA) and maintained continuously (RS-05 R12).
// Assessment results drive CUM synthesis decisions and CDP production gates.
// Not structurally immutable — updated continuously as CUM state evolves.
// D-8 PROH-8: may not declare coherent when coherence assessment fails.
// ─────────────────────────────────────────────────────────────────────────────

const CivilizationCoherenceState = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CivilizationCoherenceState',
    runtime_id:       'RT-11',
    runtime_name:     'Civilization Intelligence Runtime',
    authority:        'R11-v1.3-canonical.md RS-07 RS-05 R12 RS-11; A0-v1.1.1 §3.12 R12; D-7-v1.0 Part 9 (Civilization Coherence Model — six dimensions); D-8-v1.0 PROH-8 (no coherence fabrication)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-09',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — continuously monitored and updated (A0 §3.12 R12; D-7 Part 9). Produced as CUM Coherence Assessment (CCA) at CSP Step 6 (D-7 Part 3.3). Six mandatory dimensions: Understanding Coherence, Strategic Coherence, Decision Coherence, Domain Relationship Coherence, Temporal Coherence, Constitutional Coherence. D-8 PROH-8: RT-11 may not declare COHERENT when any dimension fails its assessment threshold. Failure of coherence dimensions may trigger FM-05 (CUM Coherence Failure — blocking) or FM-11 (CUM Degradation — Loop-Terminating). Input to VC-4 (Epistemic Validation) before CDP production.',
  }),

  SCHEMA: Object.freeze({

    ccs_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-07 RS-05 R12; D-7-v1.0 Part 9',
      description: 'Unique constitutional identifier for this CivilizationCoherenceState assessment.',
    }),

    cum_version_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-07 (CivilizationCoherenceState RS-11 state link); D-7-v1.0 Part 9; RS-12 Process 1 Step 6 (CCA produced for this CUM version)',
      description: 'Reference to the CivilizationUnderstandingModel.cum_version this coherence state assessment covers.',
    }),

    assessment_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'D-7-v1.0 Part 9; D-2 §VII Temporal layer; D-8 INV-5 (Temporal Awareness)',
      description: 'ISO 8601 timestamp when this coherence assessment was produced.',
    }),

    // Six coherence dimensions (D-7 Part 9)
    understanding_coherence: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 9 Dimension 1: Understanding Coherence; R11-v1.3-canonical.md RS-05 R12',
      description: 'Dimension 1 — Understanding Coherence: coherence of the civilizational understanding across domains. Object must carry assessment result and basis.',
    }),

    strategic_coherence: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 9 Dimension 2: Strategic Coherence; R11-v1.3-canonical.md RS-05 R12',
      description: 'Dimension 2 — Strategic Coherence: coherence between strategic plans and the current CUM. Object must carry assessment result and basis.',
    }),

    decision_coherence: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 9 Dimension 3: Decision Coherence; R11-v1.3-canonical.md RS-05 R12',
      description: 'Dimension 3 — Decision Coherence: coherence of prior decisions with current civilizational understanding. Object must carry assessment result and basis.',
    }),

    domain_relationship_coherence: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 9 Dimension 4: Domain Relationship Coherence; R11-v1.3-canonical.md RS-05 R12',
      description: 'Dimension 4 — Domain Relationship Coherence: coherence of cross-domain relationships in the CUM. Object must carry assessment result and basis.',
    }),

    temporal_coherence: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 9 Dimension 5: Temporal Coherence; R11-v1.3-canonical.md RS-05 R12; D-8 INV-5 (Temporal Awareness)',
      description: 'Dimension 5 — Temporal Coherence: coherence of the CUM across temporal boundaries and between historical and current states. Object must carry assessment result and basis.',
    }),

    constitutional_coherence: Object.freeze({
      required: true, type: 'object',
      constitutional_source: 'D-7-v1.0 Part 9 Dimension 6: Constitutional Coherence; R11-v1.3-canonical.md RS-05 R12; D-8 PROH-8',
      description: 'Dimension 6 — Constitutional Coherence: coherence of the CUM with constitutional principles and constraints. D-8 PROH-8: may not declare COHERENT when this dimension fails. Object must carry assessment result and basis.',
    }),

    overall_coherence_status: Object.freeze({
      required: true, type: 'string',
      enum: ['COHERENT', 'DEGRADED', 'CRITICAL'],
      constitutional_source: 'R11-v1.3-canonical.md RS-21 FM-05 (CUM Coherence Failure) FM-11 (CUM Degradation); D-7-v1.0 Part 9; D-8 PROH-8',
      description: 'COHERENT: all six dimensions pass their assessment thresholds; deliberation may proceed. DEGRADED: one or more dimensions below threshold; FM-05 triggered (blocking — re-attempt CSP with gap registration). CRITICAL: CUM integrity below constitutional threshold; FM-11 triggered (Loop-Terminating — CDP declared). D-8 PROH-8: COHERENT may only be set when all six dimension assessments pass.',
    }),

  }),

  validate(data) {
    return _validate('CivilizationCoherenceState', CivilizationCoherenceState.SCHEMA, data);
  },

  create(data) {
    return _create('CivilizationCoherenceState', CivilizationCoherenceState.SCHEMA, CivilizationCoherenceState.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT11 — CivilizationalDecisionProposal (CDP)
// Constitutional basis: R11-v1.3-canonical.md RS-09 RS-10 Item 3 RS-12 Process 3;
// A0-v1.1.1 §3.12 R6; D-7-v1.0 Part 5.2 (DA-1 through DA-6);
// D-7-v1.0 Part 5.3 (ER-1 through ER-5); RT11-INV-4 (13-element DR required);
// RT11-INV-6 (DOM-000001 registration before delivery); A1-v1.2 §8.1 VC-3–VC-9;
// C0-ERRATA-011A (RT-11 state variable must use CivilizationalDecisionProposal);
// PAIR 40 (RT-11 → RT-12); IC-3 (irreversible CDP may not be recalled after delivery)
//
// The constitutional proposal artifact produced by RT-11 and delivered to RT-12
// for decision formation. RT-12 owns and forms the CivilizationalDecision from this
// proposal (A0 §3.13; C0-ERRATA-011A). RT-11 does NOT own CivilizationalDecision.
//
// All six DA requirements (DA-1 through DA-6) must be satisfied and attested.
// All five ER blocking conditions (ER-1 through ER-5) must be clear at production.
// DOM-000001 registration (DA-5) must occur before delivery (RT11-INV-6).
// IC-3: CDP classified IRREVERSIBLE may not be recalled after delivery to RT-12.
// Wave plan Step 2: submitted_to_rt12_at field required for RT-12 handoff tracing.
// ─────────────────────────────────────────────────────────────────────────────

const CivilizationalDecisionProposal = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CivilizationalDecisionProposal',
    runtime_id:       'RT-11',
    runtime_name:     'Civilization Intelligence Runtime',
    authority:        'R11-v1.3-canonical.md RS-09 RS-10 Item 3 RS-12 Process 3; A0-v1.1.1 §3.12 R6; D-7-v1.0 Part 5.2 (DA-1 through DA-6); D-7-v1.0 Part 5.3 (ER-1 through ER-5); RT11-INV-4 RT11-INV-6; A1-v1.2 §8.1 VC-3–VC-9; PAIR 40; C0-ERRATA-011A; D-8-v1.0 IC-3 (irreversibility)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-09',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    structural_immutable: false,
    invariants: ['RT11-INV-4', 'RT11-INV-6'],
    constitutional_note: 'NOT STRUCTURALLY IMMUTABLE — lifecycle states track production and delivery. However, D-8 IC-3: CDP classified IRREVERSIBLE may not be recalled or modified after delivery to RT-12. C0-ERRATA-011A: this is CivilizationalDecisionProposal (RT-11 produces); CivilizationalDecision is owned by RT-12 (A0 §3.13) — do NOT confuse. DA-1 through DA-6 must all be satisfied (attested via da_N_* boolean fields). ER-1 through ER-5 must all be clear at production time. RT11-INV-4: every CDP must reference a complete 13-element DeliberationRecord. RT11-INV-6: DOM-000001 registration (DA-5) must occur before delivery. Wave plan Step 2: submitted_to_rt12_at field is required for RT-12 handoff tracing (PAIR 40 delivery tracking).',
  }),

  SCHEMA: Object.freeze({

    cdp_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-09 RS-10 Item 3; RS-23 Audit Event "Decision Production"; DA-5 (DOM-000001 Registration uses CDP identifier)',
      description: 'Unique constitutional identifier for this CivilizationalDecisionProposal. Used as the primary reference in DOM-000001 registration (DA-5) and in DeliberationRecord Element 11.',
    }),

    scope_classification: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-09 RS-10 Item 3 "scope classification"; DA-1 (Scope Authority — decision scope must fall within RT-11 civilizational scope); RS-04 Scope Boundaries',
      description: 'DA-1: Scope classification of this proposal. Must be civilizational scope. DA-1 (Scope Authority Requirement): CDP scope must fall within RT-11\'s constitutionally assigned civilizational scope. Sub-civilizational scope classifications constitute DA-1 violation (RS-35 PROH-R8).',
    }),

    irreversibility_classification: Object.freeze({
      required: true, type: 'string',
      enum: ['REVERSIBLE', 'IRREVERSIBLE', 'CONDITIONALLY_REVERSIBLE'],
      constitutional_source: 'R11-v1.3-canonical.md RS-09 RS-10 Item 3 "irreversibility classification"; DA-6 (Irreversibility Classification Requirement); D-8-v1.0 IC-3 (irreversible CDP may not be recalled after delivery)',
      description: 'DA-6: Constitutionally valid irreversibility classification. REVERSIBLE: action may be undone. IRREVERSIBLE: action cannot be undone — D-8 IC-3 applies (may not be recalled after delivery to RT-12). CONDITIONALLY_REVERSIBLE: reversal possible under specified conditions. DA-6 requires this classification be present and constitutionally valid before CDP delivery.',
    }),

    deliberation_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-09 RS-10 Item 3 "Deliberation Record reference"; DA-2 (Deliberation Grounding Requirement); RT11-INV-4 "every CivilizationalDecisionProposal must reference a complete 13-element Deliberation Record"',
      description: 'DA-2: Reference to the DeliberationRecord.dr_id that grounds this proposal. RT11-INV-4: the referenced DR must be complete with all 13 elements populated. DA-2 violation if this reference is absent or the referenced DR is incomplete.',
    }),

    cum_version_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-09 RS-10 Item 3 "CUM version reference"; DA-3 (CUM Grounding Requirement); ER-1 (no CUM blocks production) ER-2 (expired CUM blocks production)',
      description: 'DA-3: Reference to the CivilizationUnderstandingModel.cum_version that grounds this proposal. DA-3 requires the referenced CUM to be CURRENT and non-expired at production time. ER-1: absent CUM blocks production. ER-2: expired CUM blocks production.',
    }),

    dom_000001_registration_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-09 RS-10 Item 3 "DOM-000001 registration identifier"; DA-5 (DOM-000001 Registration Requirement); RT11-INV-6 "every CivilizationalDecisionProposal must be registered in DOM-000001 before delivery"; RS-23 Audit Event "DOM-000001 Registration"',
      description: 'DA-5: Constitutional Decision Registry (DOM-000001) registration identifier for this CDP. RT11-INV-6: DOM-000001 registration must occur prior to delivery to RT-12. DA-5 violation if this identifier is absent at delivery time.',
    }),

    // DA-1 through DA-6 attestation fields
    da_1_scope_authority_satisfied: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5.2 DA-1 (Scope Authority); R11-v1.3-canonical.md RS-09',
      description: 'Attestation that DA-1 (Scope Authority) is satisfied: decision scope falls within RT-11\'s constitutionally assigned civilizational scope. Must be true at production; false constitutes DA-1 violation.',
    }),

    da_2_deliberation_grounding_satisfied: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5.2 DA-2 (Deliberation Grounding); R11-v1.3-canonical.md RS-09; RT11-INV-4',
      description: 'Attestation that DA-2 (Deliberation Grounding) is satisfied: this CDP is grounded in a complete, 13-element DeliberationRecord. Must be true at production.',
    }),

    da_3_cum_grounding_satisfied: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5.2 DA-3 (CUM Grounding); R11-v1.3-canonical.md RS-09; ER-1 ER-2',
      description: 'Attestation that DA-3 (CUM Grounding) is satisfied: this CDP is grounded in a current, non-expired CUM. Must be true at production.',
    }),

    da_4_gate_passage_satisfied: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5.2 DA-4 (Gate Passage); A1-v1.2 §8.1 VC-1 through VC-9; R11-v1.3-canonical.md RS-24 (Validation Checkpoint Sequencing); D-8 PROH-4 (no shortcutting)',
      description: 'Attestation that DA-4 (Gate Passage) is satisfied: all applicable validation checkpoints VC-1 through VC-9 have passed. D-8 PROH-4: no gate may be bypassed. Must be true at production.',
    }),

    da_5_dom_registration_satisfied: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5.2 DA-5 (DOM-000001 Registration); R11-v1.3-canonical.md RS-09; RT11-INV-6',
      description: 'Attestation that DA-5 (DOM-000001 Registration) is satisfied: this CDP is registered in the Constitutional Decision Registry (DOM-000001) prior to delivery. Must be true before lifecycle_state = SUBMITTED.',
    }),

    da_6_irreversibility_classified: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'D-7-v1.0 Part 5.2 DA-6 (Irreversibility Classification); R11-v1.3-canonical.md RS-09 RS-10 Item 3; D-8-v1.0 IC-3',
      description: 'Attestation that DA-6 (Irreversibility Classification) is satisfied: this CDP carries a constitutionally valid irreversibility classification. Must be true at production.',
    }),

    production_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R11-v1.3-canonical.md RS-23 Audit Event "Decision Production"; D-2 §VII Temporal layer; D-8 PROH-6 (no temporal manipulation)',
      description: 'ISO 8601 timestamp when this CivilizationalDecisionProposal was produced. D-8 PROH-6: may not be backdated.',
    }),

    lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['FORMING', 'PRODUCED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'RESUBMITTED'],
      constitutional_source: 'R11-v1.3-canonical.md RS-10 Item 3 RS-11 last_decision_ref; PAIR 40 (RT-11 → RT-12 delivery); RS-21 FM-10 (RT-12 Compliance Failure Return triggers re-deliberation)',
      description: 'FORMING: deliberation in progress; DA requirements not yet satisfied. PRODUCED: all DA requirements satisfied; DOM-000001 registered; ready for delivery. SUBMITTED: delivered to RT-12 via PAIR 40. ACCEPTED: RT-12 compliance verification passed. REJECTED: RT-12 ComplianceFailureReturn received (FM-10 — triggers re-deliberation). RESUBMITTED: re-delivered after re-deliberation (RS-21 FM-10 recovery).',
    }),

    // Optional — present when lifecycle_state = SUBMITTED or beyond
    // Wave plan W1-09 Step 2 explicit requirement: this field is how RT-11 hands off to RT-12
    submitted_to_rt12_at: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md W1-09 Task Step 2 "CivilizationalDecisionProposal.submitted_to_rt12_at field must be present — this is how RT-11 hands off to RT-12"; R11-v1.3-canonical.md PAIR 40 RS-23 Audit Event "Decision Delivery"; A0-v1.1.1 §3.12 R6',
      description: 'ISO 8601 timestamp when this CDP was delivered to RT-12 (PAIR 40 DLVR). Wave plan W1-09 Step 2 explicit requirement: this is the RT-11 → RT-12 handoff record. Present when lifecycle_state is SUBMITTED, ACCEPTED, REJECTED, or RESUBMITTED. RS-23 audit event "Decision Delivery" requires this timestamp.',
    }),

  }),

  validate(data) {
    return _validate('CivilizationalDecisionProposal', CivilizationalDecisionProposal.SCHEMA, data);
  },

  create(data) {
    return _create('CivilizationalDecisionProposal', CivilizationalDecisionProposal.SCHEMA, CivilizationalDecisionProposal.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  CivilizationUnderstandingModel,
  DeliberationRecord,
  CausalModel,
  AssumptionRegister,
  StrategicPlan,
  CivilizationCoherenceState,
  CivilizationalDecisionProposal,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-11',
  WAVE:        'W1-09',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
