# APEX CIVILISATION — ARCH-08: Auditability Specification

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Specification
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00 (Architectural Meta-Model), ARCH-01 (Entity Taxonomy), ARCH-04 (Identity and Authority Specification), ARCH-07 (Failure Mode Policy)
**Forward references:** ARCH-09 (Capability Registry) — `operation_type` field references the Capability Registry; the registry does not yet exist at ratification of this document
**Depended on by:** ARCH-09, ARCH-10, ARCH-11, ARCH-12, ARCH-13, ARCH-14, ARCH-15

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document specifies what constitutes a valid audit record in the APEX Civilisation, which operations must produce one, what constraints govern audit writes (including failure mode), and how the evidence chain is maintained and verified. This specification operationalises Art. 3 of constitution-v1.md: full traceability, no silent failures, immutable evidence chain.

Every domain architecture (ARCH-10 through ARCH-13) and the runtime pipeline (ARCH-14) must produce audit records conformant with this specification. No domain may define its own audit record schema independently.

### 1.2 Scope

This document covers:

- The audit record as an architectural primitive, distinct from observability and telemetry
- The canonical audit record schema: all mandatory fields, types, and immutability contracts
- Mandatory audit points: the exhaustive list of operation types that must produce an audit record
- Audit write obligations: failure mode, atomicity, and the prohibition on FIRE-AND-FORGET writes
- Evidence chain architecture: how records are chained, how chain integrity is verified
- Governance score computation: how `governance_score_delta` is calculated per record
- Chain verification protocol: how chain continuity is checked and what constitutes a chain break
- Known implementation state and Phase 3 implementation obligations

This document does not cover:

- **Observability** (metrics, health telemetry, log aggregation) — an engineering concern outside the foundational set; observability writes may use FIRE-AND-FORGET and do not require audit record schema compliance
- **Agent-specific or memory-specific audit record production** — the audit point list (Section 5) establishes obligations; the domain architectures (ARCH-10, ARCH-11, ARCH-12) specify the exact events within their domains that trigger records conformant with this schema
- **Database schema for the governance records table** — ARCH-15

---

## Section 2 — Audit Record as an Architectural Primitive

### 2.1 Definition

An **audit record** is an immutable, chained, authoritative record of a governed operation in the APEX Civilisation. It answers four questions:

1. **WHO** performed the operation — answered by `actor_identity`
2. **WHAT** operation was performed — answered by `operation_type` and `entity_type` / `entity_id`
3. **WHAT WAS THE OUTCOME** — answered by `outcome` and `constitutional_impact`
4. **IN WHAT SEQUENCE** relative to prior operations — answered by `chain_link` and `chain_hash`

The fourth question is what distinguishes an audit record from a log entry. A log entry records an event. An audit record records an event in cryptographically verifiable sequence, such that any tampering with the order or content of records is detectable.

### 2.2 Audit Record vs Observability

Audit records and observability records serve different purposes and are governed by different rules:

| Property | Audit Record | Observability Record |
|---|---|---|
| Constitutional basis | Art. 3 — mandatory | No constitutional mandate |
| Failure mode | FAIL-CLOSED | FIRE-AND-FORGET tolerated |
| Schema | Governed by this specification | Engineering-defined |
| Evidence chain | Chained with SHA-256 | Not chained |
| Immutability | Immutable after write | Typically mutable / rotated |
| Governance score impact | Yes — `governance_score_delta` | No |
| Required for | Governed operations | Operational visibility |

Telemetry, metrics, health checks, and dashboard update events are observability. They are not audit records. An implementation that conflates the two — treating a log entry as satisfying the audit obligation — is non-compliant with this specification.

### 2.3 The Evidence Chain

Audit records form an ordered, chained sequence. Each record links to the prior record via `chain_link` (the prior record's `operation_id`) and `chain_hash` (SHA-256 of the prior record's canonical content). This makes the chain tamper-evident: inserting, deleting, or modifying a record breaks the hash chain.

The evidence chain is the mechanism by which the APEX Civilisation maintains "full traceability" (Art. 3). A chain with null `chain_link` values — as currently produced by `reflexion-tracker.js` (defect C03) — cannot be verified and does not constitute an evidence chain.

---

## Section 3 — Canonical Audit Record Schema

Every audit record produced in the APEX Civilisation must conform to the following schema. Domain architectures may add fields; they may not omit or redefine any field listed here.

### 3.1 Mandatory Fields

| Field | Type | Set At | Immutable After Set | Description |
|---|---|---|---|---|
| `operation_id` | UUID v4 | Record creation | Yes | System-assigned unique identifier for this audit record |
| `actor_identity` | identity object | Record creation | Yes | Full ARCH-04 identity schema snapshot of the performing identity at the time of operation |
| `operation_type` | string | Record creation | Yes | Canonical operation type name; references Capability Registry (ARCH-09 forward ref) |
| `entity_type` | string | Record creation | Yes | ARCH-01 entity type identifier (e.g., ET-KNW-001) of the primary entity affected |
| `entity_id` | UUID v4 or null | Record creation | Yes | Identifier of the specific entity instance affected; null for system-level operations |
| `input_hash` | string (SHA-256) | Record creation | Yes | SHA-256 hash of the canonical serialisation of the operation's input parameters |
| `outcome` | enum | Record creation | Yes | SUCCESS / FAILURE / REJECTED / DEGRADED |
| `constitutional_impact` | boolean | Record creation | Yes | True if this operation affects constitutional compliance (governance score, trust boundary, registry state) |
| `governance_score_delta` | signed integer | Record creation | Yes | Change to the Civilisation governance score attributable to this operation; 0 for no impact |
| `timestamp` | timestamptz | Record creation | Yes | Timestamp at which the operation completed (or was rejected) |
| `chain_link` | UUID v4 or null | Record creation | Yes | `operation_id` of the immediately prior audit record in the chain; null only for the genesis record |
| `chain_hash` | string (SHA-256) | Record creation | Yes | SHA-256 of the canonical serialisation of the record identified by `chain_link`; null only for the genesis record |

### 3.2 Field Immutability Contracts

Every field in an audit record is immutable from the moment of record creation. No system path may modify any field of a written audit record. An attempt to modify an audit record must be rejected and must produce a new audit record recording the attempt (the audit write attempt itself is a governed operation).

Specific constraints:
- `chain_link` must be non-null for every record except the genesis record. A null `chain_link` in any non-genesis record is a chain integrity defect (C03 class).
- `chain_hash` must be the SHA-256 of the record identified by `chain_link`, not of any other record. Storing a placeholder hash is equivalent to a null chain.
- `actor_identity` must be a snapshot of the full identity object at the time of the operation — not a reference to a current identity that may change. Identity snapshots are used because the identity may be revoked or modified after the operation.
- `input_hash` must be computed from the canonical serialisation of the operation inputs before any mutation. Post-mutation input hashes cannot prove the operation's precondition state.

### 3.3 The `actor_identity` Snapshot

The `actor_identity` field stores a snapshot of the ARCH-04 identity schema fields at the time of the operation:

```
{
  identity_id: UUID,
  identity_type: enum,
  trust_level: integer,
  credential_type: enum,
  verification_status: enum,
  established_at: timestamptz
}
```

The snapshot is stored inline in the audit record, not as a foreign key to an identity record. This ensures that the audit trail remains accurate even if the identity is later modified or revoked.

---

## Section 4 — Audit Write Obligations

### 4.1 Failure Mode

The failure mode for all audit record writes is **FAIL-CLOSED** (ARCH-07 Section 4, AUDIT_WRITE row). This means:

- The audit record must be written and confirmed before the operation it records is considered complete.
- If the audit record write fails for any reason, the operation must not proceed as if the record was produced.
- A system that cannot write its audit record must reject the operation, not silently continue.

This resolves the `_w()` fire-and-forget defect in `lib/governance.js`. The current implementation dispatches the governance record write asynchronously and does not verify its completion. This is FIRE-AND-FORGET on an AUDIT_WRITE, which ARCH-07 classifies as PROHIBITED. Phase 3 must replace the fire-and-forget pattern with an awaited write.

### 4.2 Atomicity

Audit record writes must use the transactional write pattern (write-with-outbox.js). The audit record and any state change it accompanies must be written in the same transaction. If the transaction fails, neither the state change nor the audit record is committed. This prevents the state from changing without a corresponding audit record (audit gap) and prevents an audit record from existing without the corresponding state change (orphaned record).

### 4.3 Ordering

Audit records must be written in strict causal order. The `chain_link` of each record must reference the record for the immediately prior governed operation in the same chain. Multiple parallel operations within a single chain are serialised at write time — two concurrent operations may not both claim the same `chain_link`.

Chains are per-entity by default: the chain for entity instance `X` links all governed operations on `X` in order. System-level operations (not tied to a specific entity) participate in the system audit chain.

### 4.4 No Retroactive Production

An audit record may not be produced retroactively — after the fact, for an operation that was not recorded at the time it occurred. An operation that lacks an audit record is an unrecorded operation. The correct response to discovering an unrecorded operation is to produce a special MISSING_RECORD audit entry that notes the gap — not to backfill a record that claims to have been produced at the time.

---

## Section 5 — Mandatory Audit Points

The following operation types must produce an audit record conformant with Section 3. This list is the minimum; domain architectures may add mandatory audit points for domain-specific operations.

### 5.1 Trust Boundary Operations (ARCH-06)

| Operation | `operation_type` | `constitutional_impact` |
|---|---|---|
| TB-001 crossing (External API) — success | TRUST_BOUNDARY_CROSSED.EXTERNAL_API | false |
| TB-001 crossing (External API) — rejected | TRUST_BOUNDARY_REJECTED.EXTERNAL_API | true |
| TB-002 crossing (Dashboard) — success | TRUST_BOUNDARY_CROSSED.DASHBOARD | true |
| TB-002 crossing (Dashboard) — rejected | TRUST_BOUNDARY_REJECTED.DASHBOARD | true |
| TB-003 crossing (WebSocket) — success | TRUST_BOUNDARY_CROSSED.WEBSOCKET | false |
| TB-004 crossing (Constitutional Gate) — success | CONSTITUTIONAL_GATE_PASSED | true |
| TB-004 crossing (Constitutional Gate) — rejected | CONSTITUTIONAL_GATE_REJECTED | true |
| Any trust boundary bypass attempt detected | TRUST_BOUNDARY_BYPASS_DETECTED | true |

### 5.2 Registry Operations (ARCH-03)

| Operation | `operation_type` | `constitutional_impact` |
|---|---|---|
| Registry entry PROPOSED | REGISTRY_ENTRY_PROPOSED | false |
| Registry entry ADMITTED | REGISTRY_ENTRY_ADMITTED | true |
| Registry entry REJECTED | REGISTRY_ENTRY_REJECTED | false |
| Registry entry ACTIVE | REGISTRY_ENTRY_ACTIVATED | false |
| Registry entry DEPRECATED | REGISTRY_ENTRY_DEPRECATED | true |
| Registry entry REMOVED | REGISTRY_ENTRY_REMOVED | true |
| Immutable field overwrite attempt | IMMUTABLE_FIELD_OVERWRITE_ATTEMPTED | true |

### 5.3 Identity and Authority Operations (ARCH-04)

| Operation | `operation_type` | `constitutional_impact` |
|---|---|---|
| Identity established — verified | IDENTITY_ESTABLISHED.VERIFIED | false |
| Identity establishment failed — request rejected | IDENTITY_ESTABLISHMENT_REJECTED | true |
| Authority Grant created | AUTHORITY_GRANT_CREATED | true |
| Authority Grant revoked | AUTHORITY_GRANT_REVOKED | true |
| Escalation requested | ESCALATION_REQUESTED | true |
| Escalation approved | ESCALATION_APPROVED | true |
| Escalation rejected | ESCALATION_REJECTED | true |
| BYPASS_DASHBOARD_AUTH active | BYPASS_ACTIVE.DASHBOARD_AUTH | true |

### 5.4 Memory Gateway Operations (ARCH-05 SOT-003)

| Operation | `operation_type` | `constitutional_impact` |
|---|---|---|
| Memory record written — any type | MEMORY_WRITTEN.{MEMORY_TYPE} | false |
| Memory write rejected — authority | MEMORY_WRITE_REJECTED.AUTHORITY | true |
| Memory write rejected — scope | MEMORY_WRITE_REJECTED.SCOPE | true |
| Memory gateway bypass detected | MEMORY_GATEWAY_BYPASS_DETECTED | true |

### 5.5 Resource and Budget Operations (ARCH-05 SOT-006)

| Operation | `operation_type` | `constitutional_impact` |
|---|---|---|
| Model API invocation — token consumption recorded | RESOURCE_CONSUMED.MODEL_INVOCATION | false |
| Per-call budget threshold reached ($1.50) | BUDGET_THRESHOLD.PER_CALL_75PCT | true |
| Per-call budget cap reached ($2.00) | BUDGET_CAP_REACHED.PER_CALL | true |
| Monthly budget threshold reached ($400) | BUDGET_THRESHOLD.MONTHLY_80PCT | true |
| Monthly budget cap reached ($500) | BUDGET_CAP_REACHED.MONTHLY | true |

### 5.6 Governance Score Operations

| Operation | `operation_type` | `constitutional_impact` |
|---|---|---|
| Governance score computed | GOVERNANCE_SCORE_COMPUTED | true |
| Governance score below threshold (< 60) | GOVERNANCE_SCORE_BELOW_THRESHOLD | true |
| Governance score recovered (≥ 60) | GOVERNANCE_SCORE_RECOVERED | true |

---

## Section 6 — Evidence Chain Architecture

### 6.1 Chain Structure

The evidence chain is a singly-linked list of audit records. Each record carries:
- `chain_link` — the `operation_id` of the prior record
- `chain_hash` — SHA-256 of the canonical content of the prior record

To verify chain continuity between record N and record N-1:
1. Retrieve record N-1 by `operation_id = record_N.chain_link`
2. Compute SHA-256 of record N-1's canonical content
3. Compare to `record_N.chain_hash`
4. If equal: chain is intact at this link
5. If not equal: chain break detected at this link

### 6.2 Canonical Content for Hashing

The canonical content of a record for hashing purposes is the deterministic JSON serialisation of the following fields in order:

```
operation_id, actor_identity (serialised), operation_type, entity_type, entity_id,
input_hash, outcome, constitutional_impact, governance_score_delta, timestamp
```

The `chain_link` and `chain_hash` fields themselves are excluded from the hash input (they reference the prior record, not this one).

Keys must be serialised in the specified order. Values must use canonical JSON (no trailing whitespace, no undefined values). Any deviation from canonical serialisation breaks the verifiability of all subsequent records.

### 6.3 Chain Segments

The APEX Civilisation uses the following chain segments:

| Segment | Scope | Genesis Record |
|---|---|---|
| System Chain | All system-level operations not tied to a specific entity | First operation after process start |
| Per-Entity Chain | All governed operations on a specific entity instance | First governed operation on that entity |
| Registry Chain | All registry state transitions (across all registries) | ARCH-03 ratification |
| Identity Chain | All identity establishment and authority operations | First identity operation in the system |

A single operation may produce records in multiple chains. When an entity write produces both a per-entity chain record and a system chain record, they are two separate records with separate `chain_link` and `chain_hash` values.

### 6.4 Chain Break Classification

| Condition | Classification | Required Response |
|---|---|---|
| `chain_link` is null in a non-genesis record | CHAIN_BREAK.NULL_LINK | Flag as audit gap; produce MISSING_RECORD entry |
| `chain_hash` does not match the hash of the referenced record | CHAIN_BREAK.HASH_MISMATCH | Flag as possible tampering; escalate to SOVEREIGN review |
| Referenced `chain_link` record does not exist | CHAIN_BREAK.MISSING_PREDECESSOR | Flag as audit gap; investigation required |
| Two records claim the same `chain_link` (fork) | CHAIN_BREAK.FORK | Flag as possible duplicate write or race condition; investigate |

---

## Section 7 — Governance Score Computation

### 7.1 Score Definition

The governance score is a value from 0 to 100 representing the APEX Civilisation's compliance with its constitutional obligations at a point in time. It is computed from the accumulated `governance_score_delta` values in audit records, normalised over a rolling window.

The current score at last audit is 94/100 (Phase 2 certification). The score is not a persistent stored value — it is computed on demand from the audit record chain.

### 7.2 Score Delta Rules

The `governance_score_delta` field in each audit record carries the constitutional impact of that operation on the score. The following rules govern delta assignment:

| Operation Class | Delta Rule |
|---|---|
| Constitutional gate passed with governance score ≥ 80/100 | +1 |
| Constitutional gate passed with governance score 60–79/100 | 0 |
| Constitutional gate rejected (score below threshold) | -2 |
| Trust boundary correctly enforced (FAIL-CLOSED, record produced) | +1 |
| Trust boundary bypass detected | -5 |
| Audit record chain intact (verified) | +1 per verification |
| Chain break detected (any class) | -3 |
| BYPASS_DASHBOARD_AUTH active | -10 |
| Registry admission with complete evidence | +2 |
| Budget cap reached and enforced | 0 (neutral — enforcement is correct) |
| Budget cap reached and NOT enforced (overrun) | -5 |
| MISSING_RECORD entry produced | -2 per missing record |

### 7.3 Score Computation

The governance score at time T is:

```
score(T) = clamp(
  base_score + sum(governance_score_delta for all records in window W ending at T),
  0,
  100
)
```

Where:
- `base_score` = 50 (the baseline for a system with no audit history)
- Window W = the rolling 30-day window ending at T
- `clamp(x, 0, 100)` ensures the score remains within bounds

The minimum constitutional threshold for governed operation is 60/100. Below this threshold, the Constitutional Gate (TB-004) must reject all capability invocations.

---

## Section 8 — Chain Verification Protocol

### 8.1 When to Verify

Chain verification must be run:
- On every governance probe execution (`lib/governance-probe.js`)
- Before any SOVEREIGN-level operation (verification is a precondition)
- After any chain break is detected (full re-verification of affected segment)
- On scheduled cadence: weekly minimum

### 8.2 Verification Algorithm

For each chain segment:
1. Retrieve the genesis record (null `chain_link`)
2. Traverse forward: for each record, retrieve its successor (the record whose `chain_link` = this record's `operation_id`)
3. At each step, verify: `successor.chain_hash == SHA-256(canonical_content(current_record))`
4. If verification fails at any step, record a CHAIN_BREAK with the appropriate classification
5. If verification passes for all records in the segment, record a CHAIN_VERIFICATION_PASSED audit entry

### 8.3 Responding to Chain Breaks

A detected chain break is a constitutional event:

1. Produce an audit record of type `CHAIN_BREAK_DETECTED` with `constitutional_impact: true`
2. Escalate to EXECUTIVE review immediately
3. Flag all records produced between the break point and the current record as UNVERIFIED
4. Do not delete or modify any records in the broken chain — the break itself is evidence

Chain breaks are never repaired by modification. They are documented and their cause is investigated.

---

## Section 9 — Known Implementation State

The current APEX implementation has the following auditability defects:

| Defect | Description | This Specification's Resolution |
|---|---|---|
| `_w()` fire-and-forget | `lib/governance.js` governance record writes are not awaited; failures are silently lost | Section 4.1: FAIL-CLOSED is mandatory for audit writes; Section 4.2: atomicity via write-with-outbox.js required |
| C03 — null chain links | `reflexion-tracker.js` produces null `chain_link` fields in reflexion records | Section 3.1: `chain_link` must be non-null for all non-genesis records; Section 6.4: null link classified as CHAIN_BREAK.NULL_LINK |
| B1 — decisionMemoryId null | Decision memory records not linked to governance chain | Section 3.3: `actor_identity` snapshot and `chain_link` are mandatory for all decision records; null is a chain break |
| C09 — score scope | Governance score does not cover all governed operation types | Section 5 (mandatory audit points) expands coverage; Section 7.2 (delta rules) applies to all listed points |
| C11 — write-with-outbox no consumers | `write-with-outbox.js` has no callers | Section 4.2: all audit writes must use this module; this closes the no-consumer gap |

### 9.1 Phase 3 Implementation Obligations

1. Replace `_w()` fire-and-forget with an awaited write using `write-with-outbox.js` for every Governance Record production.
2. Implement `chain_link` and `chain_hash` computation in all audit-producing subsystems, including `reflexion-tracker.js` and the decision memory write path.
3. Implement the `actor_identity` snapshot at every audit point — not a foreign key reference.
4. Implement chain verification in `lib/governance-probe.js` as part of every probe run.
5. Extend governance score computation to all mandatory audit points defined in Section 5.

---

## Section 10 — Auditability Invariants

**INV-A1 — Every Governed Operation Has an Audit Record**
Every operation listed in Section 5 must produce an audit record. An operation without an audit record is constitutionally unrecorded. The audit record is a precondition of the operation, not a side-effect.

**INV-A2 — Audit Records Are Immutable**
No field of a written audit record may be modified. An attempt to modify an audit record must itself be recorded as a governed operation.

**INV-A3 — Audit Writes Are FAIL-CLOSED**
An operation whose audit write fails must not proceed. The operation is only complete when its audit record is committed. FIRE-AND-FORGET audit writes are constitutionally prohibited (ARCH-07 Section 4, AUDIT_WRITE row).

**INV-A4 — Chain Links Are Non-Null for Non-Genesis Records**
`chain_link` must be non-null for every audit record except the genesis record of each chain segment. A null `chain_link` in a non-genesis record is classified as CHAIN_BREAK.NULL_LINK and triggers escalation.

**INV-A5 — Chain Hashes Are Verifiable**
`chain_hash` must be the SHA-256 of the canonical content of the record identified by `chain_link`. A stored hash that does not match a freshly computed hash indicates tampering or corruption and triggers escalation to SOVEREIGN review.

**INV-A6 — Retroactive Production Is Prohibited**
An audit record may not be produced retroactively for an operation that was not recorded at the time it occurred. Missing records are documented as gaps, not backfilled.

**INV-A7 — Governance Score Derives from Records**
The governance score is computed from audit record `governance_score_delta` values. It is not a stored value that can be manually set. Any mechanism that allows the governance score to be written directly — independent of audit records — is a constitutional violation.

---

## Section 11 — Non-Examples

The following are explicitly not audit records under this specification:

- **Console.log output** — ephemeral, non-chained, not FAIL-CLOSED; a log entry does not satisfy an audit obligation
- **Sentry error events** — observability records; no constitutional basis; no governance score impact
- **`cron_run_log` entries produced by `wrapCron()`** — telemetry records; valid for operational monitoring but do not carry `chain_link`, `chain_hash`, or `actor_identity` snapshots; they do not satisfy the audit obligation for governed cron operations
- **Dashboard panel data** — observability projections; no audit record status
- **The in-memory 200-entry event log** — an observability buffer; not an evidence chain; its loss on restart is an observability gap, not an audit chain break (the audit chain break is GAP-EVT — the absence of a persistent event log)

---

## Section 12 — Downstream Dependencies

| Document | How It Depends on ARCH-08 |
|---|---|
| ARCH-09: Capability Registry | `audit_obligation` field in each capability entry specifies which mandatory audit points from Section 5 apply; references this schema |
| ARCH-10: Memory Architecture | Memory gateway write operations must produce Section 5.4 audit records conformant with Section 3 |
| ARCH-11: Event Architecture | Governed event emissions produce Section 5 records; the event envelope `content_hash` informs `input_hash` computation |
| ARCH-12: Agent Lifecycle Model | Each lifecycle stage transition must produce an audit record; `constitutional_impact` flags which transitions affect governance |
| ARCH-13: Knowledge Architecture | Knowledge store writes produce Section 5.4 records for memory types |
| ARCH-14: Runtime Execution Model | Each mandatory pipeline phase from TB-001 through TB-004 produces audit records per Section 5.1–5.3 |
| ARCH-15: Database Schema Standard | Specifies the physical schema for the governance records table; `chain_hash` and `chain_link` columns must be indexed for chain traversal |

---

## Section 13 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification | SOVEREIGN |

---

*End of ARCH-08 — Auditability Specification*
