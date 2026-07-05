# APEX CIVILISATION — ARCH-03: Registry Architecture

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Architecture
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00 (Architectural Meta-Model), ARCH-01 (Entity Taxonomy)
**Depended on by:** ARCH-04, ARCH-05, ARCH-06, ARCH-08, ARCH-09, ARCH-11, ARCH-12, ARCH-14, ARCH-15

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document specifies the Registry Architecture for the APEX Civilisation. It defines what a registry is, how registry entries are structured, how entries are admitted, versioned, governed, deprecated, and removed, how projections are produced from the authoritative registry, and who holds authority over each registry operation.

Every registry in the APEX Civilisation — the Source of Truth Registry (ARCH-05), the Capability Registry (ARCH-09), the Event Type Registry (ARCH-11), and all others — instantiates the pattern specified here. This document is the pattern. Subsequent registry documents are instantiations of this pattern.

### 1.2 Scope

This document covers:

- The definition of a registry as an architectural primitive
- The universal registry entry schema (fields required of every entry in every registry)
- The admission lifecycle (the ordered set of states an entry traverses from proposal to removal)
- The versioning protocol (how breaking and non-breaking changes to entries are governed)
- The registry governance model (which roles hold which authorities over which registry operations)
- The projection model (how authoritative registry state is surfaced to consuming systems)
- The synchronisation obligations (when and how projections must be kept consistent with the authoritative registry)
- The meta-registry (the registry of all registries in the APEX Civilisation)
- The architectural invariants that all registry operations must satisfy

This document does not cover:

- The specific entries of any registry — those are the responsibility of the registry documents that instantiate this pattern (ARCH-05, ARCH-09, ARCH-11, etc.)
- Identity schema, trust level definitions, or the authority matrix — those are specified in ARCH-04. This document forward-references ARCH-04 trust levels by name only.
- Database schema conventions governing the physical storage of registries — those are specified in ARCH-15.
- Observability and metrics for registry operations — those are engineering concerns outside the foundational set.

---

## Section 2 — Registry as an Architectural Primitive

### 2.1 Definition

A **Registry** is a governed catalogue: an authoritative, versioned, lifecycle-managed collection of entries that records what things of a given type are permitted to exist in the APEX Civilisation and under what terms they were admitted.

Every entry in a registry represents a formal admission decision. An entry in ACTIVE state means: this thing has been proposed, reviewed, and explicitly admitted by an authorised party, and the evidence of that admission is permanently attached to the entry. A thing that has not been admitted to the appropriate registry does not have a governed existence in the APEX Civilisation.

### 2.2 What Makes a Registry Different from a Table, List, or Config

A registry differs from a database table, a configuration file, or an in-code list in the following properties:

| Property | Table / List / Config | Registry |
|---|---|---|
| Entry creation | Any write path | Only via admission lifecycle |
| Admission evidence | Not required | Admission Record mandatory at ADMITTED |
| Versioning | Implementation-defined or absent | Governed versioning protocol (Section 5) |
| Lifecycle | Typically insert/delete | Seven-state governed lifecycle (Section 4) |
| Governance authority | Implicit or absent | Explicit: defined per operation per registry |
| Supersession | Not tracked | Superseded entry links to replacement via `superseded_by` |
| Constitutional classification | Not classified | Each entry carries IMMUTABLE / EVOLVABLE / PROVISIONAL |
| Transition audit | Optional | Governance Record required at every state transition |
| Removal | Physical delete permitted | Entries are never physically deleted; status moves to REMOVED |

### 2.3 The Registry Principle

The APEX Architectural Constitution (Art. 2, Art. 5) requires that entities, agents, and operational parameters be governed rows rather than bespoke code, and that every capability earn its place through governed admission. A registry is the mechanism by which this principle is enforced architecturally. If a thing of a registerable type does not have a corresponding entry in ACTIVE state in its registry, it does not have a governed existence and must not be used by operational systems.

### 2.4 What Is Not a Registry

The following are explicitly not registries in the architectural sense of this document:

- **A database table that stores operational data** (e.g., `episodic_memory`, `cron_run_log`) — these tables hold instances of governed entity types; they are not themselves registries. The entity types those instances represent may be listed in the Entity Type Registry, but the data tables are not.
- **A configuration object in `server.js` or a hardcoded array** — these hold implementation decisions, not admission decisions. They carry no lifecycle state, no versioning, and no evidence of governance.
- **A planning document list** — lists have no lifecycle, no evidence requirement, and no transition authority.
- **The `admission_rules` table in the current APEX implementation** — this table is a precursor artefact. It contains rudimentary rows describing admission rules for agent task types but does not conform to the universal registry entry schema specified in this document. It is designated a PRECURSOR ARTEFACT and will be superseded by registry-conformant implementation (see Section 11).

---

## Section 3 — Universal Registry Entry Schema

Every registry in the APEX Civilisation is an instance of the Registry entity type (ET-DAT-001, ARCH-01). Every entry within a registry must conform to the universal registry entry schema specified in this section. Registry instantiation documents may extend this schema with additional fields specific to their domain; they may not omit, rename, or relax any field listed here.

### 3.1 Mandatory Fields

| Field | Type | Set At | Mutable After Set | Description |
|---|---|---|---|---|
| `registry_entry_id` | UUID v4 | PROPOSED | Never | System-assigned unique identifier for this entry |
| `registry_id` | UUID v4 | PROPOSED | Never | Identifies the registry this entry belongs to |
| `canonical_name` | string | PROPOSED | Never (after ADMITTED) | The governed name for this entry; unique within registry |
| `version` | string (MAJOR.MINOR.PATCH) | PROPOSED | Per versioning protocol | Current version of this entry |
| `status` | enum | PROPOSED | Per lifecycle rules only | Current lifecycle state of this entry |
| `constitutional_classification` | enum | PROPOSED | SOVEREIGN only | IMMUTABLE \| EVOLVABLE \| PROVISIONAL |
| `proposed_by` | identity_ref | PROPOSED | Never | Identity that submitted this proposal (ARCH-04 identity schema) |
| `proposed_at` | timestamptz | PROPOSED | Never | Timestamp at which proposal was submitted |
| `admission_evidence_id` | UUID v4 ref | ADMITTED | Never | Reference to the Admission Record (ET-DAT-006) created at admission |
| `admitted_by` | identity_ref | ADMITTED | Never | Identity that approved admission |
| `admitted_at` | timestamptz | ADMITTED | Never | Timestamp at which admission was approved |
| `governance_record_id` | UUID v4 ref | Each transition | Appended only | Reference to Governance Record produced at the latest transition |
| `entry_payload` | JSONB | PROPOSED | Per versioning protocol | Registry-specific fields; validated against the registry's schema definition |

### 3.2 Conditional Fields

These fields are null until their condition is met and must be set when the condition is met.

| Field | Type | Condition | Description |
|---|---|---|---|
| `review_notes` | string | At UNDER_REVIEW | Reviewer observations during the review |
| `rejected_by` | identity_ref | At REJECTED | Identity that rejected the proposal |
| `rejected_at` | timestamptz | At REJECTED | Timestamp of rejection |
| `rejection_reason` | string | At REJECTED | Mandatory justification; must reference which admission requirement was not met |
| `deprecated_by` | identity_ref | At DEPRECATED | Identity that deprecated this entry |
| `deprecated_at` | timestamptz | At DEPRECATED | Timestamp of deprecation |
| `deprecation_reason` | string | At DEPRECATED | Mandatory justification for deprecation |
| `superseded_by` | UUID v4 ref | When superseded | `registry_entry_id` of the replacing entry |
| `removed_at` | timestamptz | At REMOVED | Timestamp of removal |

### 3.3 Field Immutability Contracts

The following fields are immutable once set. No system path may overwrite them after they are set. An attempt to overwrite an immutable field must be rejected, and a Governance Record must be produced recording the attempt, the field targeted, and the identity that made the attempt.

Fields immutable from **PROPOSED**:
- `registry_entry_id`
- `registry_id`
- `proposed_by`
- `proposed_at`

Fields immutable from **ADMITTED**:
- `canonical_name`
- `admission_evidence_id`
- `admitted_by`
- `admitted_at`

Fields immutable from **DEPRECATED**:
- `deprecated_by`
- `deprecated_at`

Fields immutable from **REMOVED**:
- `removed_at`

Fields immutable from **REJECTED**:
- `rejected_by`
- `rejected_at`
- `rejection_reason`

### 3.4 Constitutional Classification

Every entry carries a `constitutional_classification` that governs the level of authority required to modify or remove it.

**IMMUTABLE** — This entry may not be modified, deprecated, or removed by any process below SOVEREIGN trust level. IMMUTABLE entries exist because their removal or modification would violate the architectural constitution or destabilise the foundational document hierarchy. Core entity types, core relationship types, and all meta-registry entries are IMMUTABLE.

**EVOLVABLE** — This entry may be modified via the versioning protocol (Section 5), deprecated with justification, and superseded by a replacement entry. EVOLVABLE entries represent the governed normal lifecycle for most registry contents.

**PROVISIONAL** — This entry has been admitted but is under observation. A PROVISIONAL entry carries a mandatory review obligation: it must be reclassified as EVOLVABLE or deprecated within the review window specified at the time of admission. PROVISIONAL entries are appropriate for newly admitted capabilities, new agent roles, or new event types that have not yet been validated in production conditions.

---

## Section 4 — Registry Admission Lifecycle

### 4.1 States

A registry entry traverses the following states. The `status` field reflects the current state at all times.

```
PROPOSED ──→ UNDER_REVIEW ──→ ADMITTED ──→ ACTIVE ──→ DEPRECATED ──→ REMOVED
                          ↘
                           REJECTED  (terminal)
```

| State | Meaning |
|---|---|
| PROPOSED | Entry has been submitted; not yet under formal review |
| UNDER_REVIEW | A reviewer has claimed the entry and formal review is in progress |
| ADMITTED | Entry has been approved; Admission Record created; activation pending |
| ACTIVE | Entry is in governed use; it may be referenced by operational systems |
| DEPRECATED | Entry is governed but no longer recommended; replacement exists or is forthcoming |
| REMOVED | Entry is no longer part of active governance; retained permanently for audit history |
| REJECTED | Proposal was reviewed and declined; terminal state; entry is permanently retained for audit history |

### 4.2 Transition Definitions

**PROPOSED → UNDER_REVIEW**
- Trigger: A reviewer at the minimum required trust level claims the review.
- Evidence produced: Governance Record (ET-GOV-001) recording reviewer identity, claim timestamp, and registry entry reference.
- Authority: OPERATIONAL (4) minimum for standard registries; EXECUTIVE (5) for Core Registries.
- Constraint: The reviewer may not be the same identity as the proposer.

**UNDER_REVIEW → ADMITTED**
- Trigger: Reviewer determines the entry satisfies all admission requirements defined by the registry's instantiation document.
- Evidence produced: Admission Record (ET-DAT-006) created and `admission_evidence_id` set; Governance Record recording admission decision, reviewer identity, and timestamp.
- Authority: EXECUTIVE (5) minimum for standard registries; SOVEREIGN (6) for Core Registries and entries designated IMMUTABLE.
- Constraint: INV-R2 — the Admission Record must be created before the state transition completes.

**UNDER_REVIEW → REJECTED**
- Trigger: Reviewer determines the entry does not satisfy one or more admission requirements.
- Evidence produced: Governance Record recording rejection; `rejection_reason` mandatory and must reference which admission requirement was not satisfied.
- Authority: EXECUTIVE (5) minimum.
- Note: REJECTED is a terminal state. A rejected proposal may be resubmitted as a new entry; the original rejected entry is not modified or reopened.

**ADMITTED → ACTIVE**
- Trigger: The admitting authority confirms the entry is ready for governed use, or a defined activation window elapses without objection.
- Evidence produced: Governance Record recording activation.
- Authority: EXECUTIVE (5) minimum; SOVEREIGN (6) for Core Registries.
- Note: Some registries may specify that ADMITTED and ACTIVE are merged into a single transition at the time of admission. This must be explicitly declared in the registry's instantiation document.

**ACTIVE → DEPRECATED**
- Trigger: The governing authority determines the entry is superseded, no longer appropriate, or a replacement has been admitted.
- Evidence produced: Governance Record recording deprecation; `deprecation_reason` mandatory; `superseded_by` mandatory if a replacement entry exists.
- Authority: EXECUTIVE (5) for EVOLVABLE entries; SOVEREIGN (6) for IMMUTABLE entries (IMMUTABLE entries must be reclassified to EVOLVABLE before they can be deprecated).
- Constraint: A deprecation without a superseding entry requires an explicit statement in `deprecation_reason` that no replacement is intended.

**DEPRECATED → REMOVED**
- Trigger: The governing authority confirms no active projection or consuming system retains a dependency on this entry, and any required migration window has elapsed.
- Evidence produced: Governance Record recording removal.
- Authority: SOVEREIGN (6) only.
- Constraint: A dependency check must be completed and documented in the Governance Record before removal. If any ACTIVE projection still references this entry, removal must be deferred until the projection is updated.

**Any State → Re-proposal**
A REJECTED or REMOVED entry may not be reopened or modified. A new PROPOSED entry must be created. The new entry may reference the prior entry's `registry_entry_id` for context in its `entry_payload`.

### 4.3 Admission Requirements (Universal Minimum)

Every registry instantiation document must specify a complete Admission Requirements section. At minimum, every registry must require the following for a PROPOSED entry to be admitted:

1. The `canonical_name` is unique within the registry across all non-REMOVED entries.
2. The `entry_payload` validates against the registry's declared schema without errors.
3. The `proposed_by` identity holds the minimum trust level required to propose in this registry.
4. The proposer has provided an architectural justification for why this entry must exist.
5. No entry with equivalent semantic meaning already exists in ADMITTED or ACTIVE state.
6. The `constitutional_classification` has been explicitly set and is justified in the proposal.

Registry instantiation documents may add requirements beyond this minimum. They may not remove or relax any item from this list.

---

## Section 5 — Versioning Protocol

### 5.1 Version Identifier Format

Every registry entry carries a `version` field in the format `MAJOR.MINOR.PATCH`, where each component is a non-negative integer.

- **MAJOR** — incremented on breaking changes: any change to the entry's `entry_payload` schema or semantic meaning that would invalidate existing projections or require consuming systems to update their references.
- **MINOR** — incremented on additive, backward-compatible changes to the entry's content: new optional fields in `entry_payload`, clarifications that extend meaning without contradicting it.
- **PATCH** — incremented on corrections, non-semantic edits, or typographical fixes that do not change meaning.

The initial version at admission is `1.0.0`. The version must be set at PROPOSED and incremented at each content-modifying transition per the rules below.

### 5.2 Versioning by Change Class

| Change Class | Version Increment | Re-Admission Required | Minimum Authority |
|---|---|---|---|
| Breaking change to entry_payload schema or semantic meaning | MAJOR | Yes — expressed as supersession (see 5.3) | EXECUTIVE (5) |
| Additive field or content extension | MINOR | No — current entry updated in place | EXECUTIVE (5) |
| Clarification, description correction, non-semantic fix | PATCH | No — current entry updated in place | OPERATIONAL (4) |
| Constitutional reclassification | No version increment | No — separate governance action | SOVEREIGN (6) |

### 5.3 Breaking Change Protocol

A breaking change — any change that would invalidate existing projections or require consuming system updates — must be expressed as a supersession, not as an in-place modification. The protocol is:

1. A new entry is PROPOSED with the updated schema or revised meaning.
2. The new entry references the existing entry in its `entry_payload` as its predecessor.
3. The new entry is admitted via the full admission lifecycle.
4. Upon admission of the new entry, the existing entry is transitioned to DEPRECATED with `superseded_by` pointing to the new entry's `registry_entry_id`.
5. A migration window is specified in the `deprecation_reason` of the deprecated entry. During the migration window, both entries remain in governance: the deprecated entry for backward compatibility, the new entry for forward-looking use.
6. At the end of the migration window, consuming systems must have migrated to the new entry. The deprecated entry may then be transitioned to REMOVED by SOVEREIGN authority.

The original entry is never modified to absorb the breaking change. The breaking change is expressed entirely through the admission of a new entry and the supersession of the old.

### 5.4 Version History

All entries to the version history of a registry entry are append-only. The version history records, at each version increment: the version string, the change class, the identity of the change author, the timestamp, and a description of what changed. Version history is part of the audit trail and must not be modified retrospectively.

---

## Section 6 — Registry Governance

### 6.1 Governance Authority Per Operation

The following table specifies the minimum trust level required for each registry operation. Trust level ordinal values and identity assignments are specified in ARCH-04; values are forward-referenced here by name.

| Operation | Standard Registry | Core Registry (any IMMUTABLE entry) |
|---|---|---|
| Propose new entry | OPERATIONAL (4) | OPERATIONAL (4) |
| Claim review | OPERATIONAL (4) | EXECUTIVE (5) |
| Admit entry (approve) | EXECUTIVE (5) | SOVEREIGN (6) |
| Reject entry | EXECUTIVE (5) | EXECUTIVE (5) |
| Activate entry | EXECUTIVE (5) | SOVEREIGN (6) |
| PATCH update (clarification) | OPERATIONAL (4) | EXECUTIVE (5) |
| MINOR update (additive) | EXECUTIVE (5) | SOVEREIGN (6) |
| Deprecate EVOLVABLE entry | EXECUTIVE (5) | SOVEREIGN (6) |
| Reclassify IMMUTABLE to EVOLVABLE | SOVEREIGN (6) | SOVEREIGN (6) |
| Remove entry | SOVEREIGN (6) | SOVEREIGN (6) |
| Add new registry to meta-registry | EXECUTIVE (5) | — |

A **Core Registry** is any registry that contains one or more entries designated IMMUTABLE. The Entity Type Registry (ARCH-01), the Relationship Type Registry (ARCH-02), and the meta-registry are Core Registries. The Source of Truth Registry (ARCH-05) and Capability Registry (ARCH-09) are Core Registries by virtue of their foundational role, even if individual entries within them may be EVOLVABLE.

### 6.2 No Self-Admission

The identity that submits a PROPOSED entry (the proposer) may not be the identity that transitions it to ADMITTED (the admitter). This constraint applies at every registry, at every trust level, without exception. It must be enforced by the admission system's implementation, not by convention.

A violation of this invariant — an entry admitted by its proposer — constitutes a constitutional breach. The entry must be reverted to UNDER_REVIEW and re-admitted by a distinct identity.

### 6.3 Governance Record at Every Transition

Every state transition must produce a Governance Record (ET-GOV-001, ARCH-01) before the transition completes. The Governance Record is created atomically with the state change using the transactional write pattern (write-with-outbox.js). A transition may not complete if the Governance Record write fails. The failure mode for Governance Record writes at registry state transitions is FAIL-CLOSED (reference: ARCH-07 forward reference — failure mode names used here are defined in ARCH-07).

### 6.4 Audit Access

Any identity at EXECUTIVE (5) or SOVEREIGN (6) trust level may audit the complete admission history of any entry at any time. The audit view must include: all state transitions, all Governance Records produced at transitions, all Admission Records, and the full version history. No implementation may aggregate, summarise, or obscure this history.

### 6.5 Retroactive Modification Is Prohibited

No governance operation may retroactively modify the record of a prior state or a prior transition. If an entry was admitted on the basis of incorrect information, the correction is made by deprecating the entry and admitting a corrected replacement — not by modifying the original admission record.

---

## Section 7 — Registry Projections

### 7.1 Definition

A **Projection** is a derived, read-only representation of the authoritative registry state, optimised for a specific consuming context. The authoritative registry is the single source of truth for all entries it governs. A projection does not hold authoritative state — it surfaces a view of that state for efficient consumption.

### 7.2 Projection Types

Three projection types are recognised in the APEX Civilisation.

**Database Projection** — A Postgres table or view that materialises current ACTIVE and DEPRECATED entries of a registry for efficient query by operational systems. A database projection may contain a subset of registry entry fields but must include `registry_entry_id`, `canonical_name`, `version`, and `status`. It must not present REMOVED or REJECTED entries as available.

**Configuration Projection** — A structured file (YAML, JSON, or similar) materialised from the registry for consumption by runtime systems that require registry state at process initialisation time, before database connectivity is established. Configuration projections have explicit staleness obligations (Section 8.3) and must be regenerated on each state change.

**API Projection** — A registry query API endpoint that returns entries in a structured response format. An API projection is the preferred interface for dashboard display and for external or inter-service consumers. It must not cache entry state across a state change event without invalidating and refreshing the cache.

### 7.3 Projection Schema Requirements

A projection schema must include:
- `registry_entry_id` — the stable reference key; consuming systems use this to reference the entry
- `canonical_name` — for human-readable identification and for name-based lookup
- `version` — so consuming systems can detect when their reference is stale
- `status` — ACTIVE or DEPRECATED, so consumers can detect supersessions in progress
- `superseded_by` — for all DEPRECATED entries, so consumers can discover the replacement

A projection schema must not:
- Present REMOVED or REJECTED entries without explicit status labelling
- Merge entries from different registries into a single undifferentiated result without registry attribution
- Omit `superseded_by` for deprecated entries; omission is a data integrity error

### 7.4 Projection Authority

A projection is authoritative for no fact. If a projection and the authoritative registry disagree on any value, the authoritative registry is correct. The discrepancy is a synchronisation failure and must be resolved by synchronisation. No consuming system may treat a projection as a source of truth or override the authoritative registry's state on the basis of a projection's value.

No consuming system may write to the authoritative registry through a projection interface. All registry writes must pass through the admission lifecycle or the versioning protocol. A projection interface that accepts writes is a constitutional violation.

---

## Section 8 — Synchronisation Obligations

### 8.1 Primary Synchronisation Trigger

The primary synchronisation mechanism is event-driven. When a registry entry transitions state, the registry system emits a `REGISTRY_ENTRY_STATE_CHANGED` event (canonical event type to be formally registered in ARCH-11). Consuming systems and projection maintenance systems subscribe to this event and update their projections upon receipt.

Event-driven synchronisation is the default and preferred mechanism. It minimises projection staleness without requiring polling and provides an auditable record of when each consuming system was notified of a state change.

### 8.2 Schedule-Driven Synchronisation

Where event-driven synchronisation is not yet implemented, or where a consuming system cannot subscribe to events, schedule-driven synchronisation is the tolerated fallback. The synchronisation schedule must be specified in the projection's documentation and must not exceed the staleness tolerance defined for the projection type (Section 8.3).

Schedule-driven synchronisation is a transitional mechanism. It is not a permanent architectural pattern and must be replaced by event-driven synchronisation as part of Phase 3 implementation.

### 8.3 Staleness Tolerances

| Projection Type | Maximum Staleness | Enforcement Mechanism |
|---|---|---|
| Database Projection | 60 seconds after entry state change | Event-driven update via REGISTRY_ENTRY_STATE_CHANGED |
| Configuration Projection | 5 minutes after entry state change | Schedule-driven refresh or process restart |
| API Projection | Real-time (no cache across state changes) | Cache invalidation on receipt of REGISTRY_ENTRY_STATE_CHANGED |

These tolerances apply to state changes. For PATCH-level content updates, all projection types tolerate a maximum lag of 5 minutes.

### 8.4 Conflict Resolution

If a projection contains a value that disagrees with the authoritative registry:

1. The authoritative registry value is correct without exception.
2. The projection must be updated to match.
3. A Governance Record is produced noting the discrepancy, its source (which projection), the correct value, and the resolution timestamp.
4. If the discrepancy cannot be automatically resolved, it escalates to EXECUTIVE review and must not be silently ignored.

### 8.5 Synchronisation Failure Handling

A synchronisation failure — event not received, schedule run failed, database write rejected — must not be silent. The failure must be recorded as a Governance Record. A consuming system whose projection is stale within its staleness tolerance may continue to serve the stale projection. A consuming system whose projection is stale beyond its tolerance must surface an explicit degraded state signal to its callers rather than serve stale data as authoritative.

---

## Section 9 — The Meta-Registry

### 9.1 Purpose

The meta-registry is the registry of all registries in the APEX Civilisation. Every registry — including the meta-registry itself — must have an entry in the meta-registry in ACTIVE state. The meta-registry is a Core Registry; all its entries are constitutionally IMMUTABLE.

This self-referential foundation ensures that the registry system is governed by itself. A registry that lacks an entry in the meta-registry has no governed existence in the Civilisation architecture.

### 9.2 Meta-Registry Entry Schema Extension

In addition to the universal registry entry schema (Section 3), every meta-registry entry extends `entry_payload` with the following fields:

| Field | Type | Description |
|---|---|---|
| `registry_type` | enum | ENTITY_TYPE / RELATIONSHIP_TYPE / CAPABILITY / EVENT_TYPE / SOURCE_OF_TRUTH / AGENT_ROLE / OTHER |
| `registry_document` | string | Reference to the ARCH-XX document that specifies this registry |
| `authoritative_source` | string | The system and storage layer that holds the authoritative registry state |
| `projection_types` | string[] | Which of the three projection types this registry produces |
| `admission_authority_minimum` | trust_level_name | Minimum trust level required to admit entries into this registry (ARCH-04 forward reference) |
| `entry_count_active` | integer | Count of ACTIVE entries; updated on each synchronisation cycle |

### 9.3 Known Registries at ARCH-03 Ratification

The following registries are known at the time of this document's ratification. Each must be admitted to the meta-registry upon its instantiation document's ratification.

| Registry | Defined In | Registry Type | Constitutional Classification |
|---|---|---|---|
| Meta-Registry (self) | ARCH-03 | OTHER | IMMUTABLE |
| Entity Type Registry | ARCH-01 | ENTITY_TYPE | IMMUTABLE |
| Relationship Type Registry | ARCH-02 | RELATIONSHIP_TYPE | IMMUTABLE |
| Source of Truth Registry | ARCH-05 | SOURCE_OF_TRUTH | IMMUTABLE |
| Capability Registry | ARCH-09 | CAPABILITY | IMMUTABLE |
| Event Type Registry | ARCH-11 | EVENT_TYPE | EVOLVABLE |
| Agent Role Registry | ARCH-12 | AGENT_ROLE | EVOLVABLE |

Additional registries may be admitted to the meta-registry by EXECUTIVE authority. No registry may begin receiving entries until its meta-registry entry is ACTIVE.

---

## Section 10 — Registry Invariants

The following invariants govern all registry operations in the APEX Civilisation. These are architectural invariants — they may not be violated by implementation, by projection logic, or by administrative action below SOVEREIGN trust level.

**INV-R1 — No Unregistered Registry**
Every registry that governs any category of APEX entity must have an entry in the meta-registry in ACTIVE state. A registry without a meta-registry entry carries no architectural authority and its entries may not be referenced by governed systems.

**INV-R2 — Admission Evidence Is Mandatory**
No entry may transition to ADMITTED without an Admission Record (ET-DAT-006) being created and attached. The Admission Record must be created before the state transition completes. A state transition to ADMITTED without an Admission Record is a constitutional violation.

**INV-R3 — No Self-Admission**
The identity that proposes an entry may not be the identity that admits it. This invariant must be enforced at the implementation layer, not by convention or policy alone.

**INV-R4 — Immutable Fields Cannot Be Overwritten**
Fields designated immutable in Section 3.3 must be enforced at the storage layer. Any attempt to overwrite an immutable field must fail and produce a Governance Record recording the attempt, the targeted field, and the identity responsible.

**INV-R5 — REMOVED Entries Are Never Deleted**
Entries transitioned to REMOVED remain in the registry permanently with status REMOVED. No registry entry is physically deleted. The record of a thing's existence, admission, and removal is a permanent part of the audit history.

**INV-R6 — Governance Record at Every Transition**
Every state transition produces a Governance Record before it completes, using the transactional write pattern. A transition for which the Governance Record write fails must not complete. The failure mode for Governance Record writes at registry transitions is FAIL-CLOSED.

**INV-R7 — Projection Inferiority**
In any conflict between a projection value and the authoritative registry value, the authoritative registry is correct. No implementation path may treat a projection as authoritative or allow a projection write to propagate back to the authoritative registry.

**INV-R8 — Breaking Changes Via Supersession Only**
A breaking change to a registry entry must be expressed as the admission of a new superseding entry and the deprecation of the existing entry. In-place modification that constitutes a MAJOR version increment is prohibited.

**INV-R9 — No Implicit Admission**
A thing does not become a governed entry by being referenced in code, configuration, or a planning document. Governance exists only through the admission lifecycle. Reference in any non-registry artefact does not constitute admission.

---

## Section 11 — Known Implementation State

### 11.1 Current Reality

The APEX Civilisation does not currently have a registry system conformant with this specification. The following implementation artefacts are precursors that will be superseded.

**`admission_rules` table** — Exists in the Supabase schema (confirmed Phase 2.2 audit). Contains rudimentary rows describing admission conditions for agent task types. Does not conform to the universal registry entry schema: no lifecycle states, no versioning, no Admission Records, no Governance Records at transitions, no `constitutional_classification`. Classification: PRECURSOR ARTEFACT. This table must be superseded by a registry-conformant implementation in Phase 3. It must not be treated as a governed registry.

**`write-with-outbox.js`** — Implements the transactional write pattern (state + outbox). Has no consumers as of Phase 2.2 audit (defect C11). Classification: INFRASTRUCTURE ARTEFACT. This module provides the transaction mechanism that all registry writes must use. Its existence is required; its lack of consumers is the defect. Phase 3 registry implementation must use this module for every state transition write.

**Hardcoded arrays in `server.js`** — Multiple arrays enumerate types, roles, step types, and similar governed data. Examples include the `APEX_TOOLS` array (22 tools) and the 8-type agent step allowlist in `agent-task-cycle.js`. Classification: UNADMITTED CAPABILITIES. These represent real capabilities with no governed admission. They are the primary target for the Capability Registry (ARCH-09).

### 11.2 Defects This Architecture Is Designed to Resolve

| Defect Code | Description | Resolution Path |
|---|---|---|
| C11 | `write-with-outbox.js` has no consumers | Registry state transition writes will use this module; closes the no-consumer gap |
| C01 | Memory writes bypass the gateway | Capability Registry (ARCH-09) will register memory write as a governed capability with a single admitted write path; bypass paths will be unadmitted |
| C13 | Dual goal systems with no sync | Source of Truth Registry (ARCH-05) will designate one authoritative goal source; the secondary system becomes an unadmitted projection |
| GAP-RES | Resource consumption not persisted | Capability Registry will specify audit obligations per capability including resource consumption record production |
| B1 | `decisionMemoryId` always null | Admission Records for decision-producing capabilities will enforce non-null linkage |

### 11.3 Phase 3 Implementation Obligations

Phase 3 implementation (post-ARCH-15 ratification) must include the following to satisfy this architecture:

1. A `registries` table serving as the physical storage for the meta-registry, conformant to the universal registry entry schema.
2. A `registry_entries` table serving as the physical storage for all other registries, conformant to the universal registry entry schema.
3. An admission workflow: proposal API, schema validation, Admission Record creation, transition enforcement, self-admission prevention.
4. Immutable field enforcement at the database layer via generated columns, triggers, or CHECK constraints — not application-layer convention.
5. Governance Record production as part of every state transition, using `write-with-outbox.js` for atomicity.
6. Event emission on every state change (`REGISTRY_ENTRY_STATE_CHANGED`) per the pattern specified in ARCH-11.
7. Database projections for each active registry, kept synchronised within the staleness tolerances defined in Section 8.3.

---

## Section 12 — Non-Examples

The following are explicitly not registries under this specification, even though they govern or enumerate things:

- **`episodic_memory` table** — stores operational data instances; no admission lifecycle; entries are created by system operation, not by governance decision
- **`cron_run_log` table** — stores execution telemetry; not a governed catalogue of what cron schedules are permitted to exist
- **`skill_evolution_snapshots` table** — stores computed projections of skill confidence; not a registry of what skills are permitted
- **`APEX_TOOLS` array in `server.js`** — hardcoded list; no version, no Admission Record, no lifecycle state; UNADMITTED CAPABILITIES that must be superseded by Capability Registry entries (ARCH-09)
- **The 8-type step allowlist in `agent-task-cycle.js`** — same classification; an unadmitted enumeration masquerading as governance
- **Any planning document list** — planning documents produce no admission decisions; lists in planning documents are PROPOSED inputs to a registry, not registry entries themselves

---

## Section 13 — Downstream Dependencies

| Document | How It Depends on ARCH-03 |
|---|---|
| ARCH-04: Identity and Authority Specification | Identity types are registered in a governed registry; trust level assignments are governed entries |
| ARCH-05: Source of Truth Registry | Instantiates the registry pattern; every source of truth assignment is an entry in this registry |
| ARCH-06: Trust Boundary Specification | Trust boundary definitions may be governed as registry entries |
| ARCH-08: Auditability Specification | Audit record types and mandatory audit points are governed via registry entries |
| ARCH-09: Capability Registry | Instantiates the registry pattern; every capability the Civilisation may perform is a registry entry |
| ARCH-11: Event Architecture | Event Type Registry instantiates the registry pattern; `REGISTRY_ENTRY_STATE_CHANGED` is a canonical registered event type |
| ARCH-12: Agent Lifecycle Model | Agent Role Registry instantiates the registry pattern; every agent role is a registry entry |
| ARCH-14: Runtime Execution Model | Constitutional gate validates requests against admitted capabilities in the Capability Registry |
| ARCH-15: Database Schema Standard | Specifies the physical schema conventions for `registries` and `registry_entries` tables |

---

## Section 14 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification | SOVEREIGN |

---

*End of ARCH-03 — Registry Architecture*
