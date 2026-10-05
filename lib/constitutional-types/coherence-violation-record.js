'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/coherence-violation-record.js
// Task: W1-12 — RT-06 Coherence Runtime Type Definitions
// Runtime: RT-06 — Coherence Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-25
// Authority: R6-v1.1.1-canonical.md RS-07 RS-10; A0-v1.1.1 §3.7;
//            D3 Part 9; D4 Part 9 §9.2; D4 §9.4; D6 Part 9; D7 Part 9;
//            D8 §4.1; I1-SEQUENCING §W1-12
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT06 — CoherenceViolationRecord
// Constitutional basis: R6-v1.1.1 RS-07/RS-10; A0-v1.1.1 §3.7; D3 Part 9;
// D3 RF-A9 (GCR enforcement); RT06-INV-2 (violations recorded, never deleted);
// RT06-INV-5 (violation record closed on CRE closure, not deleted)
//
// Created whenever an operation violates one or more GCRs (GCR-1 through GCR-7).
// State transitions permitted (closed on associated CRE closure); record is
// never deleted. gcr_check_id is constrained to integers 1–7 (GCR-1 through
// GCR-7 per I1-SEQUENCING §W1-12 explicit constraint).
// ─────────────────────────────────────────────────────────────────────────────

const CoherenceViolationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CoherenceViolationRecord',
    runtime_id:       'RT-06',
    runtime_name:     'Coherence Runtime',
    authority:        'R6-v1.1.1 RS-07 RS-10; A0-v1.1.1 §3.7; D3 Part 9; D3 RF-A9 (GCR enforcement); RT06-INV-2; RT06-INV-5',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-12',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: RT06-INV-2 (violations recorded, never deleted)
    deletion_policy:      'PROHIBITED',
    // State transitions permitted (closed on CRE closure) — not immutable
    structural_immutable: false,
    invariants: ['RT06-INV-2', 'RT06-INV-5'],
    constitutional_note: 'NEVER DELETED (RT06-INV-2). State transitions permitted — closed on associated CRE closure (RT06-INV-5). gcr_check_id is constrained to integers 1–7 matching GCR-1 through GCR-7 (D3 RF-A9; I1-SEQUENCING §W1-12 explicit constraint). violation_type follows D3 Part 9 classification taxonomy. Associated CRE reference required once CRE is generated.',
  }),

  SCHEMA: Object.freeze({

    violation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 §CoherenceViolationRecord "Identifier"; A0-v1.1.1 §3.7',
      description: 'Unique constitutional identifier for this CoherenceViolationRecord',
    }),

    timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this coherence violation was detected',
    }),

    // CONSTITUTIONALLY REQUIRED: constrained to integers 1–7 matching GCR-1 through GCR-7
    gcr_check_id: Object.freeze({
      required: true, type: 'number',
      enum: [1, 2, 3, 4, 5, 6, 7],
      constitutional_source: 'R6-v1.1.1 RS-10 "GCR violated (specific, per RF-A9)"; D3 RF-A9; I1-SEQUENCING §W1-12 (gcr_check_id constrained to integers 1–7)',
      description: 'Integer identifier of the GCR violated: 1=GCR-1, 2=GCR-2, ..., 7=GCR-7. Constrained to integers 1–7 per I1-SEQUENCING §W1-12.',
    }),

    objects_in_violation: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R6-v1.1.1 RS-10 "object(s) in violation"',
      description: 'Array of identifiers for constitutional objects involved in this coherence violation',
    }),

    violation_type: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "violation type (D3 Part 9 classification)"',
      description: 'Violation type per D3 Part 9 classification taxonomy',
    }),

    severity: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "severity"',
      description: 'Severity assessment of this coherence violation per RT-06 assessment protocol',
    }),

    closure_status: Object.freeze({
      required: true, type: 'string',
      enum: ['OPEN', 'CLOSED'],
      constitutional_source: 'R6-v1.1.1 RS-10; RT06-INV-5 (record closed on CRE closure, not deleted)',
      description: 'OPEN: violation is active. CLOSED: associated CRE has been closed — this record is closed, not deleted (RT06-INV-5).',
    }),

    associated_cre_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "associated CRE reference"; D4 Part 9 §9.2',
      description: 'CoherenceResolutionEvent.cre_id of the CRE generated in response to this violation. Required once CRE is generated.',
    }),

  }),

  validate(data) {
    return _validate('CoherenceViolationRecord', CoherenceViolationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('CoherenceViolationRecord', CoherenceViolationRecord.SCHEMA, CoherenceViolationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT06 — CoherenceResolutionEvent (CRE)
// Constitutional basis: R6-v1.1.1 RS-07/RS-10; A0-v1.1.1 §3.7;
// D4 Part 9 §9.2 (CRE generation procedure); D4 §3 Stage 10;
// D2 Layer 5 (CoherenceStatus); DEF-003 (RT-03 Class B routing)
//
// Generated by RT-06 when an admitted operation violates a GCR or fabric
// invariant. Does NOT modify admitted objects. Routed to RT-03 as a Class B
// output → RT-05 → RT-07. Resolvability flag determines whether the conflict
// escalates to a CoherenceConflictRecord.
// ─────────────────────────────────────────────────────────────────────────────

const CoherenceResolutionEvent = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CoherenceResolutionEvent',
    runtime_id:       'RT-06',
    runtime_name:     'Coherence Runtime',
    authority:        'R6-v1.1.1 RS-07 RS-10; A0-v1.1.1 §3.7; D4 Part 9 §9.2 (CRE generation); D4 §3 Stage 10; D2 Layer 5 (CoherenceStatus); DEF-003 (RT-03 Class B routing)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-12',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Can be closed; resolution record appended on closure
    structural_immutable: false,
    invariants: ['RT06-INV-2'],
    constitutional_note: 'NEVER DELETED (RT06-INV-2). Does NOT modify admitted objects — CRE is a side-channel constitutional assertion (D4 §3 Stage 10). Routing: RT-06 → RT-03 Class B → RT-05 → RT-07 (DEF-003). resolvability_flag = false escalates to CoherenceConflictRecord. CoherenceStatus flag per D2 Layer 5 documents fabric coherence state at CRE generation time.',
  }),

  SCHEMA: Object.freeze({

    cre_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 §CoherenceResolutionEvent "Identifier"; A0-v1.1.1 §3.7',
      description: 'Unique constitutional identifier for this CoherenceResolutionEvent',
    }),

    admitted_operation_trigger: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "admitted operation trigger"; D4 §3 Stage 10',
      description: 'Reference to the admitted operation that triggered this CRE. CRE does not modify this operation — it is a constitutional side-channel assertion.',
    }),

    gcr_or_invariant_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "specific GCR/fabric invariant violated"; D3 RF-A9',
      description: 'The specific GCR or fabric invariant violated (e.g. "GCR-3", "RT05-INV-2")',
    }),

    constitutional_objects_involved: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R6-v1.1.1 RS-10 "all constitutional objects involved"',
      description: 'All constitutional object identifiers involved in this coherence event',
    }),

    resolvability_flag: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R6-v1.1.1 RS-10 "resolvability flag"; D4 §9.4',
      description: 'true: CRE is resolvable within RT-06. false: unresolvable — must escalate to CoherenceConflictRecord and route to RT-11 (D4 §9.4).',
    }),

    // CONSTITUTIONALLY REQUIRED: D2 Layer 5 CoherenceStatus flag
    coherence_status_flag: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R6-v1.1.1 RS-10 "CoherenceStatus flag (D2 Layer 5)"; D2 Layer 5',
      description: 'D2 Layer 5 CoherenceStatus at CRE generation time. true = coherent; false = incoherent. Documents fabric coherence state when the CRE was generated.',
    }),

    cre_generation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "CRE generation timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this CRE was generated by RT-06',
    }),

    mpw_begin_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "MPW begin timestamp"; D4 §3 Stage 10',
      description: 'ISO 8601 timestamp marking the start of the Minimum Processing Window (MPW) for this CRE',
    }),

    resolution_record_ref: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10; D4 Part 9 §9.2',
      description: 'Reference to the resolution record appended on CRE closure. Absent while CRE is open.',
    }),

  }),

  validate(data) {
    return _validate('CoherenceResolutionEvent', CoherenceResolutionEvent.SCHEMA, data);
  },

  create(data) {
    return _create('CoherenceResolutionEvent', CoherenceResolutionEvent.SCHEMA, CoherenceResolutionEvent.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT06 — CoherenceConflictRecord (CCR)
// Constitutional basis: R6-v1.1.1 RS-07/RS-10; A0-v1.1.1 §3.7;
// D4 §9.4 (CCR generation on unresolvable CRE or MPW breach);
// D4 Part 9 §9.2; DEF-003 (RT-03 Class B routing); RT-11 escalation
//
// Generated when a CRE is unresolvable or an MPW is breached. Escalated to
// RT-11 in addition to the standard RT-03 Class B → RT-05 → RT-07 route.
// Type C suspension flag signals potential system-wide suspension.
// ─────────────────────────────────────────────────────────────────────────────

const CoherenceConflictRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CoherenceConflictRecord',
    runtime_id:       'RT-06',
    runtime_name:     'Coherence Runtime',
    authority:        'R6-v1.1.1 RS-07 RS-10; A0-v1.1.1 §3.7; D4 §9.4 (CCR generation); D4 Part 9 §9.2; DEF-003 (RT-03 Class B routing); RT-11 escalation',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-12',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Escalation status updates permitted
    structural_immutable: false,
    invariants: ['RT06-INV-2'],
    constitutional_note: 'NEVER DELETED (RT06-INV-2). Dual routing: RT-03 Class B → RT-05 → RT-07 AND RT-11 (D4 §9.4). type_c_suspension_flag = true signals potential Type C system-wide suspension. Basis must document whether escalation is from unresolvable CRE or MPW breach. escalation_status tracks resolution through RT-11.',
  }),

  SCHEMA: Object.freeze({

    ccr_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 §CoherenceConflictRecord "Identifier"; A0-v1.1.1 §3.7',
      description: 'Unique constitutional identifier for this CoherenceConflictRecord',
    }),

    generating_cre_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "reference to generating CRE"; D4 §9.4',
      description: 'CoherenceResolutionEvent.cre_id of the CRE that generated this CCR',
    }),

    basis: Object.freeze({
      required: true, type: 'string',
      enum: ['UNRESOLVABLE_CRE', 'MPW_BREACH'],
      constitutional_source: 'R6-v1.1.1 RS-10 "basis (unresolvable or MPW breach)"; D4 §9.4',
      description: 'UNRESOLVABLE_CRE: CRE resolvability_flag = false. MPW_BREACH: Minimum Processing Window was breached before resolution.',
    }),

    affected_objects: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R6-v1.1.1 RS-10 "all affected objects"',
      description: 'All constitutional object identifiers affected by this coherence conflict',
    }),

    // CONSTITUTIONALLY REQUIRED: Type C suspension signal
    type_c_suspension_flag: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R6-v1.1.1 RS-10 "Type C suspension flag"; D4 §9.4',
      description: 'true: this CCR triggers or contributes to a Type C system-wide suspension signal. false: conflict is isolated.',
    }),

    escalation_status: Object.freeze({
      required: true, type: 'string',
      enum: ['PENDING', 'ESCALATED_TO_RT11', 'RESOLVED'],
      constitutional_source: 'R6-v1.1.1 RS-10 "escalation status"; D4 §9.4; RT-11 escalation routing',
      description: 'PENDING: CCR generated, escalation not yet transmitted. ESCALATED_TO_RT11: transmitted to RT-11 for deliberation. RESOLVED: RT-11 deliberation complete.',
    }),

    ccr_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this CCR was generated',
    }),

  }),

  validate(data) {
    return _validate('CoherenceConflictRecord', CoherenceConflictRecord.SCHEMA, data);
  },

  create(data) {
    return _create('CoherenceConflictRecord', CoherenceConflictRecord.SCHEMA, CoherenceConflictRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT06 — CUMDegradationRecord
// Constitutional basis: R6-v1.1.1 RS-07/RS-10; A0-v1.1.1 §3.7;
// D7 Part 9 (degradation dimensions); RT06-INV-3 (CUM Critical State when
// >4 domains degraded — triggers DOM-000001 escalation)
//
// Records a CUM (Civilizational Understanding Model) degradation event.
// Updated on degradation state changes. cum_critical_state_flag MUST be set
// true when degraded_domain_count > 4 (RT06-INV-3), triggering DOM-000001.
// ─────────────────────────────────────────────────────────────────────────────

const CUMDegradationRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'CUMDegradationRecord',
    runtime_id:       'RT-06',
    runtime_name:     'Coherence Runtime',
    authority:        'R6-v1.1.1 RS-07 RS-10; A0-v1.1.1 §3.7; D7 Part 9 (degradation dimensions); RT06-INV-3 (CUM Critical State threshold)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-12',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Updated on degradation state changes
    structural_immutable: false,
    invariants: ['RT06-INV-2', 'RT06-INV-3'],
    constitutional_note: 'NEVER DELETED (RT06-INV-2). cum_critical_state_flag MUST be true when degraded_domain_count > 4 (RT06-INV-3) — triggers DOM-000001 escalation protocol. degradation_type follows D7 Part 9 dimension taxonomy. Updated when degradation state changes; each update is a new record (structural_immutable = false, new record per update cycle).',
  }),

  SCHEMA: Object.freeze({

    degradation_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 §CUMDegradationRecord "Identifier"; A0-v1.1.1 §3.7',
      description: 'Unique constitutional identifier for this CUMDegradationRecord',
    }),

    timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this degradation was recorded',
    }),

    affected_domains: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R6-v1.1.1 RS-10 "affected domains (array)"',
      description: 'Array of domain identifiers currently in a degraded state',
    }),

    degradation_type: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "degradation type per D7 Part 9 dimension"',
      description: 'Degradation type per D7 Part 9 dimensional taxonomy',
    }),

    degraded_domain_count: Object.freeze({
      required: true, type: 'number',
      constitutional_source: 'R6-v1.1.1 RS-10 "current degraded domain count"; RT06-INV-3',
      description: 'Count of domains currently in a degraded state. When this exceeds 4, cum_critical_state_flag MUST be true (RT06-INV-3).',
    }),

    // CONSTITUTIONALLY REQUIRED: RT06-INV-3 threshold enforcement
    cum_critical_state_flag: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R6-v1.1.1 RS-10 "CUM Critical State flag if >4 degraded domains"; RT06-INV-3',
      description: 'MUST be true when degraded_domain_count > 4 (RT06-INV-3). Triggers DOM-000001 escalation protocol. false when ≤4 domains are degraded.',
    }),

  }),

  validate(data) {
    return _validate('CUMDegradationRecord', CUMDegradationRecord.SCHEMA, data);
  },

  create(data) {
    return _create('CUMDegradationRecord', CUMDegradationRecord.SCHEMA, CUMDegradationRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT06 — DomainCoherenceStatus
// Constitutional basis: R6-v1.1.1 RS-07/RS-10; A0-v1.1.1 §3.7;
// D6 Part 9 §9.2–§9.7 (six coherence dimensions); RT-15 routing
//
// One DomainCoherenceStatus per active domain. Continuously maintained by
// RT-06. Assesses coherence across six D6 Part 9 dimensional axes
// (§9.2 through §9.7). Routed to RT-15 for domain governance.
// ─────────────────────────────────────────────────────────────────────────────

const DomainCoherenceStatus = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'DomainCoherenceStatus',
    runtime_id:       'RT-06',
    runtime_name:     'Coherence Runtime',
    authority:        'R6-v1.1.1 RS-07 RS-10; A0-v1.1.1 §3.7; D6 Part 9 §9.2–§9.7 (six coherence dimensions); RT-15 routing',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-12',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Continuously maintained — status dimensions updated on evaluation
    structural_immutable: false,
    invariants: ['RT06-INV-2'],
    constitutional_note: 'NEVER DELETED (RT06-INV-2). One per active domain; continuously maintained by RT-06. Six coherence dimensions defined by D6 Part 9 §9.2–§9.7 — each must be assessed. coherence_health_summary synthesizes all six dimensions. Routed to RT-15 for domain governance. last_evaluation_timestamp must be updated on each evaluation cycle.',
  }),

  SCHEMA: Object.freeze({

    domain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 §DomainCoherenceStatus "Domain identifier"; D6 Part 9',
      description: 'Identifier of the domain this DomainCoherenceStatus governs',
    }),

    // CONSTITUTIONALLY REQUIRED: six dimensions per D6 Part 9 §9.2–§9.7
    d6_dim_9_2_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "status per each of six dimensions"; D6 Part 9 §9.2',
      description: 'Coherence status on D6 Part 9 §9.2 dimension for this domain',
    }),

    d6_dim_9_3_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "status per each of six dimensions"; D6 Part 9 §9.3',
      description: 'Coherence status on D6 Part 9 §9.3 dimension for this domain',
    }),

    d6_dim_9_4_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "status per each of six dimensions"; D6 Part 9 §9.4',
      description: 'Coherence status on D6 Part 9 §9.4 dimension for this domain',
    }),

    d6_dim_9_5_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "status per each of six dimensions"; D6 Part 9 §9.5',
      description: 'Coherence status on D6 Part 9 §9.5 dimension for this domain',
    }),

    d6_dim_9_6_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "status per each of six dimensions"; D6 Part 9 §9.6',
      description: 'Coherence status on D6 Part 9 §9.6 dimension for this domain',
    }),

    d6_dim_9_7_status: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "status per each of six dimensions"; D6 Part 9 §9.7',
      description: 'Coherence status on D6 Part 9 §9.7 dimension for this domain',
    }),

    last_evaluation_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "last evaluation timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp of the most recent coherence evaluation for this domain',
    }),

    coherence_health_summary: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R6-v1.1.1 RS-10 "coherence health summary"; D6 Part 9',
      description: 'Synthesized coherence health summary across all six D6 Part 9 dimensions for this domain',
    }),

  }),

  validate(data) {
    return _validate('DomainCoherenceStatus', DomainCoherenceStatus.SCHEMA, data);
  },

  create(data) {
    return _create('DomainCoherenceStatus', DomainCoherenceStatus.SCHEMA, DomainCoherenceStatus.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  CoherenceViolationRecord,
  CoherenceResolutionEvent,
  CoherenceConflictRecord,
  CUMDegradationRecord,
  DomainCoherenceStatus,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-06',
  WAVE:        'W1-12',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
