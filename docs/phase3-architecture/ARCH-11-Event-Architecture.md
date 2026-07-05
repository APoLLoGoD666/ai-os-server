# APEX CIVILISATION — ARCH-11: Event Architecture

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Architecture
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00, ARCH-01, ARCH-03, ARCH-04, ARCH-05, ARCH-07, ARCH-08, ARCH-09
**Depended on by:** ARCH-14

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document defines the canonical event system of the APEX Civilisation: the event envelope schema, the event type registry, routing rules, idempotency contracts, ordering guarantees, persistence obligations, and consumer obligations. It resolves GAP-EVT by specifying the persistent event log that replaces the current 200-entry in-memory rolling buffer.

### 1.2 Scope

This document covers: the canonical event envelope; the 16 confirmed event types plus registered system event types introduced by prior ARCH documents; persistence obligations (which events must be durably stored); consumer obligations (acknowledgement, idempotency, failure handling); and the event type registry as an instantiation of ARCH-03.

Not covered: the dashboard WebSocket push mechanism (observability, not governed events); Gemini Live audio streaming (transport layer, not Civilisation events); Sentry error events (observability).

---

## Section 2 — Architectural Principles

**Principle 1 — Events Not Polling.** Governed systems within the APEX Civilisation must react to events emitted by the Event Bus, not poll for state changes. Polling is a tolerated transitional pattern; event-driven is the architectural target.

**Principle 2 — Durable Persistence for Governed Events.** Governed events (those that trigger state changes, audit records, or governance actions) must be written to the event log table before being dispatched to consumers. A governed event that is not persisted is constitutionally equivalent to a FAIL-SILENT failure (ARCH-07).

**Principle 3 — Idempotent Consumers.** Every consumer of governed events must be idempotent: processing the same event twice must produce the same outcome as processing it once. The idempotency key in the event envelope is the mechanism; consumer implementations must enforce it.

**Principle 4 — At-Least-Once Delivery.** The event system guarantees at-least-once delivery for governed events. Consumers must be idempotent because duplicate delivery is possible. Exactly-once delivery is not guaranteed and must not be assumed.

**Principle 5 — Failure Mode is FAIL-CLOSED for Governed Events.** If a governed event cannot be persisted, the operation that triggered it must be rejected (ARCH-07 EVENT_EMISSION row, FAIL-CLOSED for governed events). The event persistence is a precondition of the operation, not a side-effect.

---

## Section 3 — Canonical Event Envelope

Every event emitted in the APEX Civilisation must conform to the following schema.

### 3.1 Mandatory Fields

| Field | Type | Description |
|---|---|---|
| `event_id` | UUID v4 | System-assigned unique identifier; stable across redelivery |
| `event_type` | string | Canonical event type name from the Event Type Registry |
| `entity_type` | string | ARCH-01 entity type identifier of the primary entity this event concerns |
| `entity_id` | UUID v4 or null | Identifier of the specific entity instance; null for system-level events |
| `emitted_by` | JSONB | ARCH-04 identity snapshot of the emitting process or identity |
| `content_hash` | string (SHA-256) | SHA-256 of the canonical serialisation of `payload` |
| `idempotency_key` | string | Deterministic key for consumer deduplication; format: `{event_type}:{entity_id}:{sequence}` |
| `emitted_at` | timestamptz | Timestamp of emission |
| `correlation_id` | UUID v4 or null | Links related events across an operation chain; null for standalone events |
| `schema_version` | string (MAJOR.MINOR) | Version of this event type's payload schema |
| `persistence_class` | enum | GOVERNED / OBSERVABILITY |
| `payload` | JSONB | Event-type-specific content; validated against event type schema |

### 3.2 Persistence Class

**GOVERNED** — This event triggers state changes, audit records, or governance actions. It must be written to the event log table before dispatch. Loss of this event is a constitutional gap.

**OBSERVABILITY** — This event provides operational visibility (dashboard refresh signals, telemetry heartbeats). It need not be persisted. Loss of this event is an observability gap, not an audit gap. FIRE-AND-FORGET is permitted for OBSERVABILITY events (ARCH-07 EVENT_EMISSION row, footnote ¶).

---

## Section 4 — Event Type Registry

The Event Type Registry is an instance of the ARCH-03 registry pattern. Its meta-registry entry is admitted upon ratification of this document. New event types must be admitted via the ARCH-03 admission lifecycle with EXECUTIVE (5) authority minimum.

### 4.1 Core Civilisation Events (from ET-COM-001, ARCH-01)

16 event types were confirmed in the Phase 2 audit. They are registered here as the founding entries.

| Event Type ID | Canonical Name | Persistence Class | Triggered By | entity_type |
|---|---|---|---|---|
| EVT-001 | TASK_CREATED | GOVERNED | Task creation via orchestrator | ET-EXE-003 |
| EVT-002 | TASK_STATE_CHANGED | GOVERNED | Any task lifecycle transition | ET-EXE-003 |
| EVT-003 | TASK_COMPLETED | GOVERNED | Task reaches COMPLETED state | ET-EXE-003 |
| EVT-004 | TASK_FAILED | GOVERNED | Task reaches FAILED state | ET-EXE-003 |
| EVT-005 | MEMORY_WRITTEN | GOVERNED | Any memory gateway write | ET-KNW-001 through ET-KNW-005 |
| EVT-006 | GOAL_STATE_CHANGED | GOVERNED | Goal or Objective lifecycle transition | ET-INT-001 |
| EVT-007 | GOVERNANCE_SCORE_COMPUTED | GOVERNED | Governance probe execution | ET-GOV-001 |
| EVT-008 | CIVILISATION_CYCLE_STARTED | GOVERNED | 8-phase civilisation loop start | ET-SVC-001 |
| EVT-009 | CIVILISATION_CYCLE_COMPLETED | GOVERNED | 8-phase civilisation loop completion | ET-SVC-001 |
| EVT-010 | AGENT_INVOKED | GOVERNED | Council Member invocation | ET-GOV-002 |
| EVT-011 | REFLEXION_RECORDED | GOVERNED | Reflexion tracker write | ET-KNW-003 |
| EVT-012 | IMPROVEMENT_PROPOSED | GOVERNED | Improvement engine observation → candidate | ET-SVC-001 |
| EVT-013 | IMPROVEMENT_DEPLOYED | GOVERNED | Improvement engine deployment completion | ET-SVC-001 |
| EVT-014 | NOTIFICATION_SENT | OBSERVABILITY | Slack notification dispatch | ET-COM-002 |
| EVT-015 | SESSION_ESTABLISHED | GOVERNED | Session creation | ET-COM-003 |
| EVT-016 | SESSION_EXPIRED | GOVERNED | Session TTL expiry | ET-COM-003 |

### 4.2 System Events Introduced by ARCH Documents

These event types are required by prior ARCH documents and are admitted simultaneously with ratification of this document.

| Event Type ID | Canonical Name | Persistence Class | Introduced By |
|---|---|---|---|
| EVT-017 | REGISTRY_ENTRY_STATE_CHANGED | GOVERNED | ARCH-03 Section 8.1 |
| EVT-018 | TRUST_BOUNDARY_CROSSED | GOVERNED | ARCH-06 TB-001 through TB-008 |
| EVT-019 | TRUST_BOUNDARY_REJECTED | GOVERNED | ARCH-06 TB-001 through TB-008 |
| EVT-020 | RESOURCE_CONSUMED | GOVERNED | ARCH-05 SOT-006; ARCH-09 CAP-MODEL-001 through 004 |
| EVT-021 | BUDGET_CAP_REACHED | GOVERNED | ARCH-09 resource profile enforcement |
| EVT-022 | CHAIN_BREAK_DETECTED | GOVERNED | ARCH-08 Section 6.4 |
| EVT-023 | KNOWLEDGE_GRAPH_UPDATED | GOVERNED | ARCH-10 Section 6.1 |
| EVT-024 | SKILL_METRICS_UPDATED | OBSERVABILITY | ARCH-10 Section 5.1 |

---

## Section 5 — Event Persistence Architecture

### 5.1 Event Log Table

The authoritative event log is a Supabase Postgres table (SOT-008, ARCH-05). Schema:

| Field | Type | Description |
|---|---|---|
| `event_id` | UUID v4 | Primary key; matches envelope `event_id` |
| `event_type` | string | Canonical event type |
| `entity_type` | string | Entity type identifier |
| `entity_id` | UUID v4 or null | Entity instance |
| `emitted_by` | JSONB | Identity snapshot |
| `content_hash` | string | SHA-256 of payload |
| `idempotency_key` | string | Unique index; prevents duplicate persistence |
| `emitted_at` | timestamptz | |
| `correlation_id` | UUID v4 or null | |
| `schema_version` | string | |
| `persistence_class` | enum | |
| `payload` | JSONB | |
| `dispatched_at` | timestamptz or null | When the event was dispatched to consumers; null until dispatched |
| `consumer_ack_count` | integer | Number of consumers that have acknowledged |

**Unique constraint on `idempotency_key`:** Prevents duplicate records for the same logical event.

### 5.2 Persistence Write Protocol

For GOVERNED events:

1. Generate `event_id` (UUID v4) and `idempotency_key`
2. Write to event log table within the same transaction as the triggering operation (write-with-outbox.js)
3. On successful commit: dispatch to in-process Event Bus subscribers
4. On commit failure: the triggering operation is rolled back; the event is not dispatched

For OBSERVABILITY events:

1. Emit directly to the in-process Event Bus (setImmediate)
2. No persistence write required
3. Failure mode: FIRE-AND-FORGET tolerated

### 5.3 GAP-EVT Resolution

The current implementation (200-entry in-memory rolling log, setImmediate dispatch, no persistence) resolves to the following Phase 3 implementation obligations:

1. Create the `events` table in Supabase conformant with Section 5.1
2. Replace fire-and-forget emission in `lib/intelligence/civilization-runtime.js` with the transactional write protocol in Section 5.2 for all GOVERNED events
3. Retain the in-process EventEmitter for OBSERVABILITY events; it does not require persistence
4. Implement consumer acknowledgement tracking (`consumer_ack_count` field)

---

## Section 6 — Routing Rules

### 6.1 Event Bus

The APEX Event Bus is the internal publish-subscribe mechanism. It is implemented in `lib/intelligence/civilization-runtime.js` (ET-SVC-005, ARCH-01). After the Phase 3 persistence write protocol is implemented, the Event Bus retains its role for in-process dispatch after the persistence write succeeds.

### 6.2 Routing by Entity Type

Events are routed by `event_type` and optionally filtered by `entity_type` and `entity_id`. Consumers register subscriptions with a selector:

```
{ event_type: string, entity_type?: string, entity_id?: UUID }
```

A subscription without `entity_type` receives all events of the specified type. A subscription with `entity_id` receives events for that specific entity instance only.

### 6.3 Cross-System Routing

Events may be routed to the dashboard via WebSocket push. This is an OBSERVABILITY projection of the event log — the WebSocket push is not the authoritative delivery; it is a projection of already-persisted state. A failed WebSocket push does not require event redelivery.

---

## Section 7 — Consumer Obligations

### 7.1 Idempotency

Every consumer of GOVERNED events must implement idempotency using the `idempotency_key` field. The consumer must:

1. Check whether it has previously processed the event at `idempotency_key`
2. If previously processed: return the cached outcome without re-executing
3. If not previously processed: execute, record the outcome keyed by `idempotency_key`, return outcome

The idempotency check and the outcome record must be in the same transaction as the consumer's state change.

### 7.2 Acknowledgement

Consumers of GOVERNED events must acknowledge receipt by incrementing `consumer_ack_count` on the event log record. Acknowledgement must occur after the consumer has successfully processed the event (or recorded an idempotency hit). An unacknowledged GOVERNED event after a configurable timeout is eligible for redelivery.

### 7.3 Failure Handling

A consumer that fails to process a GOVERNED event must:

1. Not acknowledge the event (leave `consumer_ack_count` unchanged for this consumer)
2. Emit a GOVERNED event of type `CONSUMER_FAILURE` with the `correlation_id` of the failed event
3. The Event Bus will redeliver the event after the redelivery timeout

Consumer failure mode: FAIL-SOFT is permitted for non-critical consumers (the failure is recorded and the event is redelivered). FAIL-CLOSED is required for consumers whose failure would leave the Civilisation in an inconsistent state (e.g., a consumer that must update the governance score on GOVERNANCE_SCORE_COMPUTED).

---

## Section 8 — Ordering Guarantees

The APEX event system provides **causal ordering within a correlation chain** but does not guarantee global total ordering across independent chains.

- Events with the same `correlation_id` are delivered in `emitted_at` order within that correlation chain.
- Events with different `correlation_id` values (or null) may be delivered in any order relative to each other.
- Consumers that require total ordering must implement their own sequencing using `emitted_at` timestamps.

---

## Section 9 — Event Architecture Invariants

**INV-E1 — Governed Events Are Persisted Before Dispatch.** No GOVERNED event may be dispatched to consumers before its event log record is committed. Dispatch of an unpersisted GOVERNED event is a constitutional violation.

**INV-E2 — Idempotency Keys Are Deterministic.** The `idempotency_key` for a given logical event must be deterministic: the same logical event occurring twice must produce the same `idempotency_key`. Non-deterministic keys defeat idempotency.

**INV-E3 — New Event Types Require Registry Admission.** An event type not listed in Section 4 must not be emitted as a GOVERNED event. New event types must be admitted to the Event Type Registry (ARCH-03 admission lifecycle) before use.

**INV-E4 — OBSERVABILITY Events Must Not Carry Governed State.** An OBSERVABILITY event must not be the only record of a governed operation. If an operation requires a GOVERNED event, it must emit a GOVERNED event even if it also emits an OBSERVABILITY event.

---

## Section 10 — Known Implementation State

| Gap | Current State | Resolution |
|---|---|---|
| GAP-EVT | 200-entry in-memory log; no persistence; lost on restart | Section 5.3 Phase 3 obligations |
| setImmediate dispatch | Fire-and-forget, no acknowledgement | Section 5.2: GOVERNED events use transactional write before dispatch |
| No consumer idempotency | Consumers do not implement idempotency_key checks | Section 7.1: obligation stated; implementation per consuming module |
| Event Type Registry | Not yet instantiated as a governed registry | Section 4: registry is ratified with this document; 24 types admitted |

---

## Section 11 — Downstream Dependencies

| Document | Dependency |
|---|---|
| ARCH-14: Runtime Execution Model | Post-response event emission phase references Section 5.2 protocol |
| ARCH-15: Database Schema Standard | Physical schema for `events` table; unique index on `idempotency_key` |

---

## Section 12 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification — 24 event types admitted | SOVEREIGN |

---

*End of ARCH-11 — Event Architecture*
