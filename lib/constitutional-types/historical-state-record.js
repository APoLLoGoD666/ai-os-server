'use strict';

// ─── FILE IDENTIFICATION ──────────────────────────────────────────────────────
// lib/constitutional-types/historical-state-record.js
// Task: W1-05 — RT-07 Memory Type Definitions
// Runtime: RT-07 — Memory Runtime
// Baseline: APEX-CONSTITUTION-v1.0
// Date: 2026-07-25
// Authority: R7-v1.1-canonical.md RS-07 RS-10; A0-v1.1.1 §3.8; D-2 §XIII;
//            D3 RF-A8; D3 GCR-3; D8 §5.7; D8 INV-2
//
// ─── CANONICAL PATTERN COMPLIANCE ────────────────────────────────────────────
// Follows W1-02A canonical pattern (identity-record.js reference implementation).
// See WAVE-1-EXECUTION-PROTOCOL.md §O-1 through §O-10.
// ─────────────────────────────────────────────────────────────────────────────

const { _validate, _create } = require('./_utils');


// ─────────────────────────────────────────────────────────────────────────────
// RT07 — HistoricalStateRecord
// Constitutional basis: R7-v1.1 RS-07/RS-10; A0-v1.1.1 §3.8; D8 §5.7;
// D3 RF-A8 (Historical Inalienability); RT07-INV-1 (no modification);
// RT07-INV-2 (no deletion; terminal state = Archived)
//
// Durable archive record for any constitutional object received via the
// RT-05 write pipeline. Created on every RT-05 atomic commit; never modified
// after creation (RT07-INV-1); never deleted (RT07-INV-2).
// ─────────────────────────────────────────────────────────────────────────────

const HistoricalStateRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'HistoricalStateRecord',
    runtime_id:       'RT-07',
    runtime_name:     'Memory Runtime',
    authority:        'R7-v1.1 RS-07 RS-10; A0-v1.1.1 §3.8; D8 §5.7 (mandatory Memory Preservation runtime); D3 RF-A8 (Historical Inalienability); RT07-INV-1; RT07-INV-2',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-05',
    version:          '1.0.0',
    d8_canonical_type: null,
    // CONSTITUTIONALLY REQUIRED: RT07-INV-2 (no deletion); D3 RF-A8; D8 PROH-4
    deletion_policy:      'PROHIBITED',
    // CONSTITUTIONALLY REQUIRED: RT07-INV-1 (no modification after creation)
    structural_immutable: true,
    invariants: ['RT07-INV-1', 'RT07-INV-2'],
    constitutional_note: 'IMMUTABLE UPON CREATION (RT07-INV-1). NEVER DELETED — terminal state is ARCHIVED (RT07-INV-2; D3 RF-A8). Created on every RT-05 atomic commit. Receives full content of any constitutional object. RT-04 has always-available read access for audit (R7-v1.1 RS-09 PAIR 21). Class B outputs (RT-03 Kernel Manifest records) receive HIGHEST protection_class (O7-10; RT07-INV-4).',
  }),

  SCHEMA: Object.freeze({

    record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 §HistoricalStateRecord; A0-v1.1.1 §3.8',
      description: 'Unique constitutional identifier for this HistoricalStateRecord',
    }),

    object_type: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "object type"',
      description: 'Constitutional type of the persisted object (e.g. "ActorProfile", "DelegationRecord")',
    }),

    object_identifier: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "object identifier"',
      description: 'Identifier of the constitutional object that was persisted (references the primary key of that object)',
    }),

    object_content: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "Full content of the persisted constitutional object at time of receipt"',
      description: 'Serialized full content of the constitutional object at time of receipt. Immutable — captures the exact state persisted.',
    }),

    created_at: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "creation timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this HistoricalStateRecord was created (at time of RT-05 atomic commit receipt)',
    }),

    source_runtime: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "source runtime"; A0-v1.1.1 §3.8',
      description: 'Runtime identifier (e.g. "RT-01") that produced the constitutional object being persisted',
    }),

    // CONSTITUTIONALLY REQUIRED: RT-03 Stage 9 provenance tracing per D3 GCR-2
    rt03_provenance_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "RT-03 provenance record (Stage 9)"; D3 GCR-2 (provenance completeness)',
      description: 'Reference to the RT-03 Stage 9 provenance record for the atomic commit that produced this HistoricalStateRecord',
    }),

    // CONSTITUTIONALLY REQUIRED: protection classification per O7-10 and RT07-INV-4
    protection_class: Object.freeze({
      required: true, type: 'string',
      enum: ['STANDARD', 'HIGHEST'],
      constitutional_source: 'R7-v1.1 RS-10 "protection classification (standard or highest — per O7-10 for Class B outputs)"; RT07-INV-4',
      description: 'STANDARD for ordinary constitutional objects. HIGHEST for RT-03 Class B outputs (Kernel Manifest records) per O7-10 and RT07-INV-4.',
    }),

    // CONSTITUTIONALLY REQUIRED: lifecycle state per RT07-INV-2 and RS-10 state transitions
    lifecycle_status: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'ARCHIVED'],
      constitutional_source: 'R7-v1.1 RS-10 "lifecycle status (Active or Archived)"; RT07-INV-2 (ARCHIVED is terminal)',
      description: 'Current lifecycle state. ARCHIVED is terminal — no further transitions, record permanently retained (RT07-INV-2; D3 RF-A8).',
    }),

    // Optional temporal validity — Wave 2 requirement per O7-7
    temporal_validity: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "temporal validity metadata (O7-7)"; A0-v1.1.1 §3.8',
      description: '[Wave 2 required] Temporal validity metadata for epistemic objects (O7-7). Records the constitutional temporal window during which this record is a valid representation.',
    }),

  }),

  validate(data) {
    return _validate('HistoricalStateRecord', HistoricalStateRecord.SCHEMA, data);
  },

  create(data) {
    return _create('HistoricalStateRecord', HistoricalStateRecord.SCHEMA, HistoricalStateRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT07 — ProvenanceChain
// Constitutional basis: R7-v1.1 RS-07/RS-10; A0-v1.1.1 §3.8; D8 INV-2
// (append-only provenance chains); D3 GCR-3 (Provenance Chain Completeness —
// IsComplete must be true); D3 RF-A8 (Historical Inalienability);
// RT07-INV-3 (append-only; no prior entry may be modified or removed)
//
// One ProvenanceChain per persisted constitutional object. Created at first
// write; segments appended on each update; NEVER closed; NEVER truncated
// (RT07-INV-3). IsComplete must be true for all complete chains (D3 GCR-3).
// ─────────────────────────────────────────────────────────────────────────────

const ProvenanceChain = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'ProvenanceChain',
    runtime_id:       'RT-07',
    runtime_name:     'Memory Runtime',
    authority:        'R7-v1.1 RS-07 RS-10; A0-v1.1.1 §3.8; D8 INV-2 (append-only provenance chains); D3 GCR-3 (IsComplete must be true); D3 RF-A8; RT07-INV-3',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-05',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Entries are appended (structural_immutable = false for the chain as a whole);
    // but existing entries are immutable (RT07-INV-3)
    structural_immutable: false,
    invariants: ['RT07-INV-2', 'RT07-INV-3'],
    constitutional_note: 'APPEND-ONLY (RT07-INV-3; D8 INV-2). One per persisted constitutional object. Created at first write; new entries appended on each update; NEVER closed; NEVER truncated. Existing entries are immutable — no prior entry may be modified or removed (RT07-INV-3). IsComplete flag MUST be true for all complete chains (D3 GCR-3). A ProvenanceChain with IsComplete = false after a write is RT07-FAIL-02 (Provenance Chain Gap — constitutional violation).',
  }),

  SCHEMA: Object.freeze({

    chain_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 §ProvenanceChain; A0-v1.1.1 §3.8',
      description: 'Unique constitutional identifier for this ProvenanceChain',
    }),

    object_identifier: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "object identifier reference"',
      description: 'Identifier of the constitutional object this ProvenanceChain belongs to',
    }),

    // CONSTITUTIONALLY REQUIRED: D3 GCR-3 — IsComplete must be true
    is_complete: Object.freeze({
      required: true, type: 'boolean',
      constitutional_source: 'R7-v1.1 RS-10 "IsComplete flag (must be true for all complete chains per D3 GCR-3)"; D3 GCR-3 (Provenance Chain Completeness)',
      description: 'MUST be true for all complete chains (D3 GCR-3). IsComplete = false after a write operation is RT07-FAIL-02 (Provenance Chain Gap — constitutional violation). False is permitted only transiently during assembly.',
    }),

    // CONSTITUTIONALLY REQUIRED: ordered sequence of provenance entries per RS-10
    entries: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'R7-v1.1 RS-10 "Ordered sequence of provenance entries, each containing: object identifier reference; timestamp; operation type; authorizing runtime; RT-03 Stage 9 provenance record reference; IsComplete flag"',
      description: 'Ordered sequence of provenance entries. Each entry contains: object_identifier, timestamp, operation_type (CREATION|UPDATE|SUPERSESSION|CLOSURE), authorizing_runtime, rt03_stage9_ref. APPEND-ONLY — no entry may be modified or removed (RT07-INV-3; D8 INV-2).',
    }),

  }),

  validate(data) {
    return _validate('ProvenanceChain', ProvenanceChain.SCHEMA, data);
  },

  create(data) {
    return _create('ProvenanceChain', ProvenanceChain.SCHEMA, ProvenanceChain.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT07 — MemoryLifecycleRecord
// Constitutional basis: R7-v1.1 RS-07/RS-10; A0-v1.1.1 §3.8; D-2 §XIII;
// RT07-INV-5 (closure is an event, not a deletion)
//
// Constitutional record of every lifecycle state transition for a
// HistoricalStateRecord (Active → Archived). Closure is a constitutional
// event; the HistoricalStateRecord remains in RT-07's store after closure
// (RT07-INV-5; D-2 §XIII line 298).
// ─────────────────────────────────────────────────────────────────────────────

const MemoryLifecycleRecord = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'MemoryLifecycleRecord',
    runtime_id:       'RT-07',
    runtime_name:     'Memory Runtime',
    authority:        'R7-v1.1 RS-07 RS-10; A0-v1.1.1 §3.8; D-2 §XIII (Memory as first-class constitutional capacity); RT07-INV-5 (closure is an event, not a deletion)',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-05',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // MemoryLifecycleRecord is an immutable event assertion once created
    structural_immutable: true,
    invariants: ['RT07-INV-2', 'RT07-INV-5'],
    constitutional_note: 'IMMUTABLE CONSTITUTIONAL EVENT RECORD (RT07-INV-5). Documents that closure is an event, not a deletion — the HistoricalStateRecord remains in RT-07\'s store after closure (D-2 §XIII line 298). NEVER DELETED (RT07-INV-2). Created on each lifecycle transition for any HistoricalStateRecord. Both prior_lifecycle_state and new_lifecycle_state must be documented so the full transition is auditable by RT-04.',
  }),

  SCHEMA: Object.freeze({

    lifecycle_record_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 §MemoryLifecycleRecord "Record identifier"; A0-v1.1.1 §3.8',
      description: 'Unique constitutional identifier for this MemoryLifecycleRecord',
    }),

    historical_state_record_ref: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "HistoricalStateRecord reference"',
      description: 'HistoricalStateRecord.record_id whose lifecycle this event documents',
    }),

    // CONSTITUTIONALLY REQUIRED: full transition pair per RT07-INV-5 and RT-04 audit requirement
    prior_lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'ARCHIVED'],
      constitutional_source: 'R7-v1.1 RS-10 "prior lifecycle state"',
      description: 'Lifecycle state of the HistoricalStateRecord BEFORE this transition',
    }),

    new_lifecycle_state: Object.freeze({
      required: true, type: 'string',
      enum: ['ACTIVE', 'ARCHIVED'],
      constitutional_source: 'R7-v1.1 RS-10 "new lifecycle state"',
      description: 'Lifecycle state of the HistoricalStateRecord AFTER this transition. ARCHIVED is terminal (RT07-INV-2).',
    }),

    timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this lifecycle transition occurred',
    }),

    triggering_event: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "triggering event description"',
      description: 'Description of the constitutional event that triggered this lifecycle transition',
    }),

    authorizing_source: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'R7-v1.1 RS-10 "authorizing source (constitutional authority or founding protocol reference)"',
      description: 'Constitutional authority or founding protocol reference that authorizes this lifecycle transition',
    }),

  }),

  validate(data) {
    return _validate('MemoryLifecycleRecord', MemoryLifecycleRecord.SCHEMA, data);
  },

  create(data) {
    return _create('MemoryLifecycleRecord', MemoryLifecycleRecord.SCHEMA, MemoryLifecycleRecord.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// RT07 — HistoricalStateQueryResult
// Constitutional basis: R7-v1.1 RS-09 (RT-07 Output); R7-v1.1 RS-12 §12.2
// (query processing procedure); A0-v1.1.1 §3.8; I1-SEQUENCING §W1-05
//
// CRITICAL INTERFACE OBJECT: the RT-07 → RT-03 interface type required for
// W2-01 and W2-02. Assembles matching HistoricalStateRecords, provenance
// chain segments, and temporal validity metadata in response to authorized
// historical state queries from RT-09, RT-10, RT-11, RT-04, RT-08, RT-14.
//
// HistoricalStateQueryResult is a response type (RS-09 output); it is not
// a permanently stored owned object like HistoricalStateRecord. However, as
// a constitutional interface type it requires the same constitutional schema
// governance and is subject to the same deletion prohibition.
// ─────────────────────────────────────────────────────────────────────────────

const HistoricalStateQueryResult = Object.freeze({

  CONSTITUTIONAL: Object.freeze({
    type:             'HistoricalStateQueryResult',
    runtime_id:       'RT-07',
    runtime_name:     'Memory Runtime',
    authority:        'R7-v1.1 RS-09 (RT-07 Output: HistoricalStateQueryResult); R7-v1.1 RS-12 §12.2 (query processing); A0-v1.1.1 §3.8; I1-SEQUENCING §W1-05',
    baseline:         'APEX-CONSTITUTION-v1.0',
    wave:             'W1-05',
    version:          '1.0.0',
    d8_canonical_type: null,
    deletion_policy:      'PROHIBITED',
    // Response type — assembled on demand; not structurally immutable in assembly
    structural_immutable: false,
    invariants: [],
    constitutional_note: 'CRITICAL INTERFACE OBJECT — RT-07 → RT-03 interface required for W2-01 and W2-02 (I1-SEQUENCING §W1-05). Delivered to RT-09, RT-10, RT-11, RT-04, RT-08, RT-14 on demand (R7-v1.1 RS-09). Contains: matching historical records, provenance chain segments, temporal validity metadata, query completeness attestation (RS-12 §12.2). status=PARTIAL if RT-07 cannot guarantee completeness; status=UNAVAILABLE if query service is unavailable (RT07-FAIL-04).',
  }),

  SCHEMA: Object.freeze({

    // CONSTITUTIONALLY REQUIRED per I1-SEQUENCING §W1-05 explicit field list
    query_id: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-05 "HistoricalStateQueryResult must include: query_id (UUID)"; R7-v1.1 RS-12 §12.2',
      description: 'UUID uniquely identifying this query instance. Required for RT-04 audit tracing and idempotency verification.',
    }),

    query_timestamp: Object.freeze({
      required: true, type: 'string',
      constitutional_source: 'I1-SEQUENCING §W1-05 "HistoricalStateQueryResult must include: query_timestamp"; D2 Layer 6 (Temporal Layer)',
      description: 'ISO 8601 timestamp when this query was processed by RT-07',
    }),

    historical_layers: Object.freeze({
      required: true, type: 'array',
      constitutional_source: 'I1-SEQUENCING §W1-05 "HistoricalStateQueryResult must include: historical_layers"; R7-v1.1 RS-12 §12.2 "matching historical records, provenance chain segments"',
      description: 'Array of historical record layers returned by this query. Each layer contains a HistoricalStateRecord snapshot and associated provenance chain segment for the queried object at the requested historical moment.',
    }),

    temporal_validity_ms: Object.freeze({
      required: true, type: 'number',
      constitutional_source: 'I1-SEQUENCING §W1-05 "HistoricalStateQueryResult must include: temporal_validity_ms"; R7-v1.1 RS-12 §12.2 "temporal validity metadata for returned records"',
      description: 'Temporal validity window in milliseconds for the returned historical data. Consuming runtimes must not use this result beyond this window without re-querying (O7-7).',
    }),

    // CONSTITUTIONALLY REQUIRED: status enum per I1-SEQUENCING §W1-05 and RT07-FAIL-04
    status: Object.freeze({
      required: true, type: 'string',
      enum: ['VALID', 'PARTIAL', 'UNAVAILABLE'],
      constitutional_source: 'I1-SEQUENCING §W1-05 "status (one of \'VALID\' | \'PARTIAL\' | \'UNAVAILABLE\')"; RT07-FAIL-04 (Query Service Unavailable)',
      description: 'VALID: complete and current historical state returned. PARTIAL: RT-07 cannot guarantee completeness (e.g. partial records available). UNAVAILABLE: query service unavailable (RT07-FAIL-04) — consuming runtime must handle gracefully.',
    }),

    // Optional fields — full query result envelope (Wave 2 required for W2-01/W2-02)
    provenance_segments: Object.freeze({
      required: false, type: 'array',
      constitutional_source: 'R7-v1.1 RS-12 §12.2 "Retrieve relevant ProvenanceChain segments"',
      description: '[Wave 2 required] ProvenanceChain segments accompanying the historical records. Required for full RT-03 Gate 2 provenance validation in W2-01.',
    }),

    completeness_attestation: Object.freeze({
      required: false, type: 'string',
      constitutional_source: 'R7-v1.1 RS-12 §12.2 "query completeness attestation"',
      description: '[Wave 2 required] RT-07 attestation of query completeness. Documents which historical periods were scanned and any gaps in coverage.',
    }),

  }),

  validate(data) {
    return _validate('HistoricalStateQueryResult', HistoricalStateQueryResult.SCHEMA, data);
  },

  create(data) {
    return _create('HistoricalStateQueryResult', HistoricalStateQueryResult.SCHEMA, HistoricalStateQueryResult.CONSTITUTIONAL, data);
  },

});


// ─────────────────────────────────────────────────────────────────────────────
// MODULE EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  HistoricalStateRecord,
  ProvenanceChain,
  MemoryLifecycleRecord,
  HistoricalStateQueryResult,
});

module.exports = Object.assign({}, TYPES, {
  TYPES,
  RUNTIME_ID: 'RT-07',
  WAVE:        'W1-05',
  BASELINE:    'APEX-CONSTITUTION-v1.0',
});
Object.freeze(module.exports);
