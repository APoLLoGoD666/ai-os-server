# APEX CIVILISATION — ARCH-05: Source of Truth Registry

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Registry
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00 (Architectural Meta-Model), ARCH-01 (Entity Taxonomy), ARCH-03 (Registry Architecture), ARCH-04 (Identity and Authority Specification)
**Depended on by:** ARCH-10, ARCH-11, ARCH-12, ARCH-13, ARCH-14

---

## Section 1 — Purpose and Scope

### Purpose

For every domain of fact in the APEX Civilisation, this registry designates exactly one authoritative source, specifies what constitutes a projection of that source, defines the write authority required to modify the authoritative source, and states the consistency obligations projections carry.

This registry instantiates the pattern defined in ARCH-03 (Registry Architecture). Every entry is a registry entry conforming to the ARCH-03 universal schema, extended with source-of-truth-specific fields. The meta-registry entry for this registry must be admitted when this document is ratified.

### Scope

This document covers:

- The 10 canonical fact domains of the APEX Civilisation
- For each domain: authoritative source designation, permitted write paths, projection sources with staleness tolerances, synchronisation trigger, conflict resolution rule, write authority (referencing ARCH-04), and known implementation defects
- The Source of Truth Principle and its enforcement mechanism
- Invariants governing all source-of-truth assignments

This document does not cover:

- Physical database schema — ARCH-15
- Event architecture that drives synchronisation — ARCH-11
- Memory architecture implementation — ARCH-10
- The admission lifecycle for new fact domains (governed by ARCH-03 admission rules)

---

## Section 2 — The Source of Truth Principle

The Source of Truth Principle is drawn from the APEX Architectural Constitution, Article 1: for every domain of fact, exactly one system and storage layer is authoritative. All other representations of that fact are projections.

### Authoritative Source

A **Source of Truth** is the single system and storage layer whose value for a given fact domain is definitionally correct. If the authoritative source and a projection disagree, the authoritative source is correct without exception. The discrepancy is a synchronisation failure, not a data conflict to be resolved by merging.

There is no circumstance in which a projection value may be treated as overriding, superseding, or correcting the authoritative source value. A system that reads from a projection and acts on that value in preference to the authoritative source is operating outside the governance model of the APEX Civilisation.

### Projection

A **Projection** is any representation of a fact domain that is derived from the authoritative source. Projections may be read for efficiency; they must not be written to as a means of updating the authoritative fact. A write to a projection that is not immediately and atomically propagated to the authoritative source constitutes a source-of-truth violation.

Projections are permitted and expected. The system cannot function without in-process caches, dashboard representations, and derived views. The governance constraint is not that projections be eliminated, but that they be explicitly identified, their staleness tolerances be declared, and their write paths be prohibited from bypassing the authoritative source.

### Relationship to ARCH-03

Each source-of-truth assignment is a registry entry. The registry pattern defined in ARCH-03 enforces versioning, evidence requirements, governance traceability, and the admission lifecycle for new assignments. A new category of fact that is subject to governance cannot be treated as authoritative until it has been admitted to this registry by the procedures defined in ARCH-03 Section 4. An ungoverned fact domain is, by definition, a constitutional gap.

---

## Section 3 — Registry Entry Schema Extension

This registry extends the ARCH-03 universal registry entry schema. In addition to all mandatory fields from ARCH-03 Section 3.1, every entry in this registry carries the following fields in `entry_payload`:

| Field | Type | Description |
|---|---|---|
| `fact_domain` | string | The canonical name for the domain of fact this entry governs |
| `authoritative_system` | string | The system that holds the authoritative state (e.g., "Supabase Postgres", "Environment Variable", "Process Memory") |
| `authoritative_storage_layer` | string | The specific table, store, or variable within the authoritative system |
| `permitted_write_paths` | string[] | Exhaustive list of code paths permitted to write to the authoritative source; all other write paths are prohibited |
| `projection_sources` | object[] | Array of projection definitions: each carries `name`, `storage_layer`, `max_staleness_seconds`, `sync_trigger` |
| `conflict_resolution_rule` | string | How conflicts between authoritative source and projections are resolved; always "authoritative source wins" |
| `write_authority_minimum` | trust_level_name | Minimum trust level (ARCH-04) required to write to the authoritative source |
| `known_defects` | string[] | Defect codes from ARCH-01 / ARCH-02 affecting this domain's source-of-truth integrity |
| `implementation_status` | enum | CONFORMANT / DEFECTIVE / NOT_IMPLEMENTED |

The `implementation_status` field reflects the current state of the implementation relative to the designation in this registry. CONFORMANT means the implementation matches the registry. DEFECTIVE means a defect has been identified that violates the source-of-truth designation. NOT_IMPLEMENTED means the authoritative source designated here does not yet exist in the implementation.

---

## Section 4 — Fact Domain Registry Entries

### SOT-001 — Goal and Objective State

**canonical_name:** GOAL_OBJECTIVE_STATE
**constitutional_classification:** IMMUTABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | The current state of all Goals (ET-INT-001) and Objectives (ET-INT-002) in the Civilisation |
| Authoritative System | Supabase Postgres |
| Authoritative Storage Layer | `strategic_memory` table |
| Permitted Write Paths | `lib/memory/strategic-memory.js` exclusively; no direct Supabase client writes outside this module |
| Conflict Resolution Rule | Authoritative source (`strategic_memory` table) always wins |
| Synchronisation Trigger | EVENT_DRIVEN — GOAL_STATE_CHANGED event |

#### Projections

| Projection | Storage Layer | Max Staleness | Sync Trigger |
|---|---|---|---|
| `goal-tracker.js` in-memory goal map | Process memory | 0 seconds (must read from authoritative source on every query, not cache) | QUERY_TIME |
| Dashboard goal panel | Dashboard render layer | 30 seconds | POLL |

#### Write Authority

Minimum trust level: **OPERATIONAL (4)**. No write to the `strategic_memory` table may be initiated by a process operating below OPERATIONAL trust level as defined in ARCH-04.

#### Known Defects

**C13:** Two goal systems (`strategic_memory` table and `goal-tracker.js` in-memory map) operate independently with no synchronisation. `goal-tracker.js` is an unadmitted projection that currently writes directly to its own store, treating itself as an authoritative source. This constitutes a dual-source violation of INV-S1. Phase 3 must route all goal writes through `lib/memory/strategic-memory.js` and demote `goal-tracker.js` to a read-only projection with a 0-second staleness tolerance.

#### Implementation Status

**DEFECTIVE** — C13 active.

---

### SOT-002 — Agent Task State

**canonical_name:** AGENT_TASK_STATE
**constitutional_classification:** IMMUTABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | The lifecycle state of all Agent Tasks (ET-EXE-003) including stage, assigned agent, budget consumed, and execution log |
| Authoritative System | Supabase Postgres |
| Authoritative Storage Layer | Task record table (primary task records) and `cron_run_log` (cron task records) |
| Permitted Write Paths | `agent-system/orchestrator.js` and `agent-system/master-orchestrator.js` through the task write gateway; no direct Supabase client writes to task records outside these modules |
| Conflict Resolution Rule | Authoritative source (task record table) always wins |
| Synchronisation Trigger | EVENT_DRIVEN — TASK_STATE_CHANGED event |

#### Projections

| Projection | Storage Layer | Max Staleness | Sync Trigger |
|---|---|---|---|
| In-memory agent pipeline state within `orchestrator.js` | Process memory | 0 seconds during execution | REAL_TIME |
| Dashboard Agent Control panel | Dashboard render layer | 5 seconds | POLL |

#### Write Authority

Minimum trust level: **OPERATIONAL (4)** to create a task; **TASK (3)** to update task state within the scope of an assigned task.

#### Known Defects

Two execution paths (`agent-task-cycle.js` and `master-orchestrator.js`) both write task state with different controls and no reconciliation. This constitutes a dual-source violation for task state records. Phase 3 must designate one canonical write path — ARCH-12 (Agent Lifecycle Model) will specify which path is canonical — and demote the other to a read path or eliminate it entirely.

#### Implementation Status

**DEFECTIVE** — dual write paths active.

---

### SOT-003 — Memory Records

**canonical_name:** MEMORY_RECORDS
**constitutional_classification:** IMMUTABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | All five memory record types: SEMANTIC, EPISODIC, PROCEDURAL, DECISION, and WORKING memory (ET-KNW-001 through ET-KNW-005) |
| Authoritative System | Supabase Postgres |
| Authoritative Storage Layer | `semantic_memory`, `episodic_memory`, `procedural_memory`, `decision_memory`, `working_memory` tables respectively |
| Permitted Write Paths | `lib/memory/gateway.js` exclusively for all external writes; each memory-type module (`lib/memory/semantic-memory.js`, etc.) may write only through the gateway, not directly via Supabase client |
| Conflict Resolution Rule | Authoritative source (Supabase table) always wins; Obsidian vault and local episode files are projections and must not be treated as authoritative |
| Synchronisation Trigger | EVENT_DRIVEN — MEMORY_WRITTEN event |

#### Projections

| Projection | Storage Layer | Max Staleness | Sync Trigger |
|---|---|---|---|
| In-memory SIE briefing cache in `lib/memory/gateway.js` | Process memory | 60 seconds | TTL |
| Obsidian vault lesson records | Obsidian vault on disk | 5 minutes | EVENT_DRIVEN on write |
| `agent-system/episodic-memory.js` episode files | Local filesystem | Eventually consistent | ASYNC_WRITE |

#### Write Authority

Minimum trust level: **OPERATIONAL (4)** for SEMANTIC, EPISODIC, PROCEDURAL, and DECISION memory types. **TASK (3)** for WORKING memory (task-scoped writes only, within the scope of an active task).

#### Known Defects

**C01:** Five or more write paths to memory bypass the gateway (`lib/memory/gateway.js`); direct Supabase client writes have been found in multiple modules. Each bypass path is a source-of-truth violation, as it writes to the authoritative source without passing through the designated write path and therefore without producing the governance records that the gateway is responsible for generating.

**B1:** `decisionMemoryId` is always null in decision records. The Decision memory type lacks linkage to the governance chain, meaning decisions are recorded without traceable evidence anchors.

#### Implementation Status

**DEFECTIVE** — C01 and B1 active.

---

### SOT-004 — Session State

**canonical_name:** SESSION_STATE
**constitutional_classification:** IMMUTABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | The state of active user sessions (ET-COM-003), including session identity, trust level at establishment, and expiry |
| Authoritative System | Supabase Postgres |
| Authoritative Storage Layer | Session records table (confirmed as live in Phase 2 audit) |
| Permitted Write Paths | `lib/app-auth.js` for session creation; session expiry via the session lifecycle handler; no other module may write to session records |
| Conflict Resolution Rule | Authoritative source (session records table) always wins; in-process session object is a request-scoped projection |
| Synchronisation Trigger | EVENT_DRIVEN — SESSION_ESTABLISHED, SESSION_EXPIRED events |

#### Projections

| Projection | Storage Layer | Max Staleness | Sync Trigger |
|---|---|---|---|
| `req.session` in-process object | Process memory (request-scoped) | 0 seconds (must reflect authoritative source for each request) | REQUEST_TIME |
| Dashboard active session display | Dashboard render layer | 30 seconds | POLL |

#### Write Authority

Minimum trust level: **SYSTEM (2)** for session creation (internal process initiated by authentication flow). **SOVEREIGN (6)** to force-expire sessions outside the normal lifecycle.

#### Known Defects

**ET-DAT-005 / ET-IDN-005:** Dual session state representation exists between `req.session` (in-process) and the session records table, and the two are not guaranteed to be consistent. Identity resolution (`resolveIdentity`) reads from in-process state and may reflect stale or failed session data. Phase 3 must enforce that `req.identity` is always derived from the authoritative session record at verification time, not from cached in-process state.

#### Implementation Status

**DEFECTIVE** — dual session representation active.

---

### SOT-005 — Identity and Credential State

**canonical_name:** IDENTITY_CREDENTIAL_STATE
**constitutional_classification:** IMMUTABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | The registered credentials and identity assignments of all governed identities: APP_KEY values, FOUNDER_TOKEN validation anchor, Council Member identity assignments |
| Authoritative System | Environment Variables (for APP_KEY and ANTHROPIC_API_KEY); Supabase Postgres (for session-anchored FOUNDER_TOKEN validation) |
| Authoritative Storage Layer | `process.env` (APP_KEY, BYPASS_DASHBOARD_AUTH); session records table (FOUNDER session anchors) |
| Permitted Write Paths | APP_KEY — Render environment variable configuration only; no runtime write path. FOUNDER session — `lib/app-auth.js` session creation path only. |
| Conflict Resolution Rule | Authoritative source (environment variable or session table) always wins; any cached credential value must be treated as stale |
| Synchronisation Trigger | MANUAL — credential rotation is a manual Render deployment action |

#### Projections

No projections are permitted for credential values. Credentials must always be read from the authoritative source at verification time. No caching of credential values is permitted at any layer. Any system that reads a credential value and stores it in process memory for subsequent use is in violation of this designation.

#### Write Authority

Minimum trust level: **SOVEREIGN (6)** for APP_KEY rotation. **SOVEREIGN (6)** for FOUNDER session creation.

#### Known Defects

**C10:** The `BYPASS_DASHBOARD_AUTH` environment variable bypasses FOUNDER credential verification in production. This is a constitutional gap: a SOVEREIGN-level security control is defeatable by the presence of an environment variable that must not exist in a production deployment.

**UN02:** The set of registered identity types and their current holders has not been formally registered. Identity assignments are implicit rather than declared, meaning the authoritative record of who holds which identity type does not exist as a governed record.

#### Implementation Status

**DEFECTIVE** — C10 present.

---

### SOT-006 — Resource and Budget State

**canonical_name:** RESOURCE_BUDGET_STATE
**constitutional_classification:** IMMUTABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | The current resource consumption against all budget limits: per-call ($2.00 cap), per-cycle ($0.50 cap), monthly council ($500/month cap); token consumption per model invocation |
| Authoritative System | Supabase Postgres (intended); Console output (actual — defect) |
| Authoritative Storage Layer | Resource consumption table (NOT YET IMPLEMENTED); `console.log` output (current state — not authoritative, ephemeral) |
| Permitted Write Paths | The capability invocation path in `lib/memory/gateway.js` and `agent-system/orchestrator.js` must write a consumption record after every model API call; this write path does not currently exist |
| Conflict Resolution Rule | Authoritative source (resource consumption table) always wins; in-process running totals are projections |
| Synchronisation Trigger | EVENT_DRIVEN — RESOURCE_CONSUMED event (not yet implemented) |

#### Projections

| Projection | Storage Layer | Max Staleness | Sync Trigger |
|---|---|---|---|
| In-process running total during task execution | Process memory | 0 seconds (must be real-time to enforce caps) | REAL_TIME |
| Dashboard resource panel | Dashboard render layer | 60 seconds | POLL |

#### Write Authority

Minimum trust level: **SYSTEM (2)** — consumption records are written by internal processes, not user-initiated actions.

#### Known Defects

**GAP-RES — CRITICAL:** Resource consumption is logged to console only; no database record is produced. Budget enforcement relies entirely on in-process transient state that is lost on process restart. The monthly cap ($500) cannot be enforced without persistent consumption records, as there is no durable accumulation of consumption across process lifetimes. Phase 3 must implement the resource consumption table and the write path before any further model invocations can be considered constitutionally governed.

#### Implementation Status

**NOT_IMPLEMENTED** — GAP-RES. This is a constitutional gap. See Section 8.

---

### SOT-007 — Knowledge Graph State

**canonical_name:** KNOWLEDGE_GRAPH_STATE
**constitutional_classification:** EVOLVABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | The nodes and edges of the APEX knowledge graph (ET-KNW-007): entities, their properties, and their relationships as represented in the graph store |
| Authoritative System | Supabase Postgres |
| Authoritative Storage Layer | `knowledge_graph_nodes` and `knowledge_graph_edges` tables |
| Permitted Write Paths | `lib/memory/knowledge-graph.js` exclusively; GitNexus external index and `graphify-out/` local files are projections and must not be written to as a means of updating the knowledge graph |
| Conflict Resolution Rule | Authoritative source (`knowledge_graph_nodes/edges` tables) always wins; GitNexus and graphify-out are read-only projections |
| Synchronisation Trigger | EVENT_DRIVEN — KNOWLEDGE_GRAPH_UPDATED event; GitNexus updated by `npx gitnexus analyze` (manual trigger post-commit) |

#### Projections

| Projection | Storage Layer | Max Staleness | Sync Trigger |
|---|---|---|---|
| GitNexus external index (ai-os-server, 3614 symbols) | GitNexus external service | Post-commit refresh | MANUAL (`npx gitnexus analyze`) |
| `graphify-out/` local wiki | Local filesystem | Post-update refresh | EVENT_DRIVEN |
| BFS traversal cache in `knowledge-graph.js` | Process memory | 60 seconds | TTL |

#### Write Authority

Minimum trust level: **OPERATIONAL (4)**.

#### Known Defects

None critical. The knowledge graph has a clear authoritative source and a clearly identified set of projections. The GitNexus projection is managed by external tooling and refreshed post-commit; this is an acceptable projection pattern.

#### Implementation Status

**CONFORMANT**.

---

### SOT-008 — Event Log

**canonical_name:** EVENT_LOG
**constitutional_classification:** IMMUTABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | The durable record of all system events emitted by the APEX Event Bus (ET-COM-001), constituting the audit-quality event history |
| Authoritative System | Supabase Postgres (intended); In-process memory (actual — defect) |
| Authoritative Storage Layer | Event log table (NOT YET IMPLEMENTED); in-process `EventEmitter` with 200-entry rolling log cap (current state — not authoritative, ephemeral) |
| Permitted Write Paths | The Event Bus emission path in `lib/intelligence/civilization-runtime.js` (ET-SVC-005) must write to the event log table on every emission; this durable write path does not currently exist |
| Conflict Resolution Rule | Authoritative source (event log table) always wins; in-process rolling log is a transient projection |
| Synchronisation Trigger | EVENT_DRIVEN — events write to log at emission time (no separate synchronisation needed once the write path is implemented) |

#### Projections

| Projection | Storage Layer | Max Staleness | Sync Trigger |
|---|---|---|---|
| In-process 200-entry rolling log | Process memory | Real-time (but ephemeral, lost on restart) | REAL_TIME |
| Dashboard event stream | Dashboard WebSocket layer | Real-time | WebSocket push |

#### Write Authority

Minimum trust level: **SYSTEM (2)** — events are written by internal processes at the point of emission.

#### Known Defects

**GAP-EVT — CRITICAL:** The Event Bus uses `setImmediate` with no persistence. Events are held in a 200-entry in-memory rolling log that is destroyed on process restart. The APEX Architectural Constitution Article 3 requires events, not polling, with durable event records. No event history survives a Render deployment or process restart. The system currently has no audit-quality event record. ARCH-11 will specify the persistent event envelope schema and the required write path that must be wired into the Event Bus emission path.

#### Implementation Status

**NOT_IMPLEMENTED** — GAP-EVT. This is a constitutional gap. See Section 8.

---

### SOT-009 — Governance and Audit Records

**canonical_name:** GOVERNANCE_AUDIT_RECORDS
**constitutional_classification:** IMMUTABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | The immutable evidence chain of all governance actions: Governance Records (ET-GOV-001), Audit Records (ET-GOV-004), Admission Records (ET-DAT-006), and the governance score computed from them |
| Authoritative System | Supabase Postgres |
| Authoritative Storage Layer | Governance records table (written by `lib/governance.js` `_w()` function); evidence chain table; governance score snapshots in `skill_evolution_snapshots` |
| Permitted Write Paths | `lib/governance.js` `_w()` function exclusively; no module may write governance records by any other path; the `write-with-outbox.js` outbox pattern must be used to ensure atomicity |
| Conflict Resolution Rule | Authoritative source (governance records table with chain hash) always wins; the chain hash makes any tampering with the sequence detectable |
| Synchronisation Trigger | EVENT_DRIVEN — GOVERNANCE_RECORD_WRITTEN event |

#### Projections

| Projection | Storage Layer | Max Staleness | Sync Trigger |
|---|---|---|---|
| Governance score computed value (94/100 at last audit) | Computed at probe time | Recalculated on each governance probe run | ON_DEMAND |
| Dashboard governance panel | Dashboard render layer | Real-time | Governance probe endpoint |
| `lib/runtime-readiness.js` readiness scorecard | Process memory | Per-request calculation | REQUEST_TIME |

#### Write Authority

Minimum trust level: **SYSTEM (2)** for automated governance record writes produced by internal processes. **EXECUTIVE (5)** for manual governance record creation.

#### Known Defects

The `_w()` function is fire-and-forget, as confirmed in the Phase 2 audit. Writes to the governance record table are not awaited, and write failures are silently discarded. This violates the APEX Architectural Constitution Article 3 (no silent failures) and the FAIL-CLOSED requirement for governance record writes established in ARCH-03 INV-R6. A system that silently fails to write its own governance records cannot be treated as self-governing. The `write-with-outbox.js` module has no consumers (C11) and must be wired into the `_w()` function write path as the mandatory path for all governance record writes.

#### Implementation Status

**DEFECTIVE** — fire-and-forget `_w()` and C11 active.

---

### SOT-010 — Skill and Capability Metrics

**canonical_name:** SKILL_CAPABILITY_METRICS
**constitutional_classification:** EVOLVABLE

#### Authoritative Source

| Field | Value |
|---|---|
| Fact Domain | The measured competency, confidence scores, success/failure rates, and evolution snapshots for each registered skill and capability (ET-CAP-001, ET-CAP-002) |
| Authoritative System | Supabase Postgres |
| Authoritative Storage Layer | `skill_memory` table (raw metrics); `skill_evolution_snapshots` table (consolidated snapshots used for routing decisions) |
| Permitted Write Paths | `lib/memory/skill-memory.js` for raw metric writes; `lib/cognitive/skill-routing-advisor.js` for snapshot reads (15-minute cache); the Reflexion ranker (`lib/memory/reflexion-ranker.js`) for weekly confidence promote/decay writes |
| Conflict Resolution Rule | Authoritative source (`skill_memory` and `skill_evolution_snapshots` tables) always wins; the 15-minute routing cache is a tolerated projection with declared staleness |
| Synchronisation Trigger | SCHEDULE — weekly Reflexion ranker run (+0.10 promote / -0.05 decay); EVENT_DRIVEN for per-execution metric updates |

#### Projections

| Projection | Storage Layer | Max Staleness | Sync Trigger |
|---|---|---|---|
| `lib/cognitive/skill-routing-advisor.js` 15-minute in-memory cache | Process memory | 15 minutes | TTL |
| Dashboard skill panel | Dashboard render layer | 60 seconds | POLL |

#### Write Authority

Minimum trust level: **SYSTEM (2)** for per-execution metric writes. **OPERATIONAL (4)** for manual skill confidence adjustments.

#### Known Defects

None critical. The skill metrics system has a clear authoritative source and a declared projection with explicit staleness tolerance. The 22-tool set includes 6 tools not currently advertised in capability descriptions, as confirmed by the Phase 2 audit. These unadvertised tools will be governed by the Capability Registry (ARCH-09); the presence of undeclared tools does not constitute a source-of-truth violation for this domain.

#### Implementation Status

**CONFORMANT**.

---

## Section 5 — Conflict Resolution Protocol

The following protocol applies universally to all 10 fact domains registered in this document. No implementation may apply domain-specific conflict resolution logic that deviates from this protocol.

### Protocol

1. Any detecting system that observes a discrepancy between a projection value and the authoritative source value must treat it as a synchronisation failure, not a data conflict.

2. The authoritative source value is correct without exception. The age of the projection value, the recency of the write that produced it, and the number of systems that hold it are all irrelevant. The authoritative source is correct.

3. Upon detecting a synchronisation failure, the detecting system must perform two actions: (a) update the projection to match the authoritative source value; and (b) produce a Governance Record noting the discrepancy, the domain, the projection name, the divergent value observed, and the timestamp of detection.

4. If the discrepancy cannot be resolved automatically — because the projection cannot be updated without human intervention, or because the authoritative source itself is unavailable — the discrepancy escalates to EXECUTIVE review. The system must not continue to operate on the stale projection value after escalation.

5. Under no circumstances may two values be merged, averaged, voted on, or resolved by taking the more recent write. The authoritative source value supersedes all projection values.

### Enforcement Note

This protocol applies to all 10 fact domains in this registry without exception. Domains that are currently designated NOT_IMPLEMENTED have no authoritative source from which a correct value can be read; operations depending on those domains are therefore operating without governed state and must be flagged accordingly until the authoritative source is implemented.

---

## Section 6 — Write Authority Summary

| Domain | Authoritative Source | Write Authority | Implementation Status |
|---|---|---|---|
| SOT-001: Goal/Objective State | `strategic_memory` table | OPERATIONAL (4) | DEFECTIVE (C13) |
| SOT-002: Agent Task State | Task records table | OPERATIONAL (4) | DEFECTIVE (dual paths) |
| SOT-003: Memory Records | Per-type Supabase tables | OPERATIONAL (4) / TASK (3) for WORKING | DEFECTIVE (C01, B1) |
| SOT-004: Session State | Session records table | SYSTEM (2) | DEFECTIVE (dual representation) |
| SOT-005: Identity/Credential State | Environment variables + session table | SOVEREIGN (6) | DEFECTIVE (C10) |
| SOT-006: Resource/Budget State | Resource consumption table (not implemented) | SYSTEM (2) | NOT_IMPLEMENTED (GAP-RES) |
| SOT-007: Knowledge Graph | `knowledge_graph_nodes/edges` | OPERATIONAL (4) | CONFORMANT |
| SOT-008: Event Log | Event log table (not implemented) | SYSTEM (2) | NOT_IMPLEMENTED (GAP-EVT) |
| SOT-009: Governance/Audit Records | Governance records table | SYSTEM (2) / EXECUTIVE (5) | DEFECTIVE (fire-and-forget) |
| SOT-010: Skill/Capability Metrics | `skill_memory` + `skill_evolution_snapshots` | SYSTEM (2) | CONFORMANT |

Of the 10 registered fact domains: 2 are CONFORMANT, 6 are DEFECTIVE, and 2 are NOT_IMPLEMENTED. No domain is currently in full conformance at the implementation level for write path governance; CONFORMANT domains have clear authoritative sources and no identified violations, but Phase 3 will apply standard write path auditing to all domains.

---

## Section 7 — Source of Truth Invariants

### INV-S1 — One Authoritative Source Per Domain

Every domain of fact in the APEX Civilisation has exactly one authoritative source. No domain may have two or more systems each claiming to hold authoritative state. If two systems hold state for the same domain, exactly one is designated as authoritative in this registry and all others are projections. Any system that writes to a store not designated as authoritative for a domain it operates on is in violation of this invariant, regardless of whether it also writes to the authoritative source.

### INV-S2 — Projections May Not Be Written as Sources

A write to a projection that is not immediately and atomically propagated to the authoritative source constitutes a source-of-truth violation. No system may treat a write to a projection as a substitute for writing to the authoritative source. The existence of a projection write path that bypasses the authoritative source write path is prohibited; where such a path exists, it is a defect to be remediated in Phase 3.

### INV-S3 — Authoritative Source Wins on Conflict

In any conflict between an authoritative source value and a projection value, the authoritative source is correct. Conflict resolution by merging, voting, taking the most recent value, taking the highest-trust writer's value, or any other heuristic is prohibited. The conflict resolution rule for every entry in this registry is "authoritative source wins," and no entry may declare a different rule.

### INV-S4 — New Fact Domains Require Registry Admission

A new category of fact that requires governance — a new table that holds governed state, a new type of record that affects system behaviour, a new persistence layer introduced during Phase 3 implementation — must be admitted to this registry before the domain is treated as governed. An ungoverned fact domain is a source-of-truth gap, and any records written to it before admission are ungoverned records. The admission procedure is defined in ARCH-03 Section 4.

### INV-S5 — NOT_IMPLEMENTED Is a Constitutional Gap

Any fact domain with implementation_status: NOT_IMPLEMENTED is a constitutional gap. Operations that depend on that domain's authoritative source are operating without persistence and without auditability. The Civilisation cannot make governed claims about facts in a NOT_IMPLEMENTED domain. NOT_IMPLEMENTED entries must be treated as the highest priority in Phase 3 implementation planning; no new capability expansion may proceed while a CRITICAL constitutional gap remains open.

---

## Section 8 — Known Implementation Gaps Requiring Phase 3 Action

The following gaps have been identified as requiring Phase 3 remediation. They are ordered by constitutional severity.

1. **GAP-RES (SOT-006):** The resource consumption table must be created and the write path must be wired into `lib/memory/gateway.js` and `agent-system/orchestrator.js` before any further model invocations can be considered auditably governed. Without persistent consumption records, budget caps are unenforceable across process restarts and the monthly cap ($500) cannot be accumulated. This is the highest-priority Phase 3 implementation gap.

2. **GAP-EVT (SOT-008):** The event log table and the durable emission write path must be implemented and wired into `lib/intelligence/civilization-runtime.js` before the system can claim event-driven governance. The current 200-entry rolling in-memory log is insufficient for a constitutionally governed system and provides no audit history.

3. **C13 (SOT-001):** `goal-tracker.js` must be demoted from its current position as an independent state store to a read-only projection of the `strategic_memory` table. All goal writes must route exclusively through `lib/memory/strategic-memory.js`. The in-memory goal map in `goal-tracker.js` must be invalidated and repopulated from the authoritative source, not maintained independently.

4. **C01 (SOT-003):** All memory write paths must route through `lib/memory/gateway.js`. The five or more identified bypass paths that write directly via Supabase client must be removed. Each bypass path produces ungoverned memory records that lack the governance chain linkage the gateway enforces.

5. **`_w()` fire-and-forget (SOT-009):** The governance record write in `lib/governance.js` must be awaited and must use `write-with-outbox.js` for atomicity. Silent failures in governance record production are constitutionally prohibited under ARCH-03 INV-R6. A system that silently loses its own governance records cannot assert that it operates under governance.

---

## Section 9 — Downstream Dependencies

| Document | How It Depends on ARCH-05 |
|---|---|
| ARCH-10: Memory Architecture | Authoritative source for each memory type is designated here (SOT-003); permitted write paths are derived from this registry and must be implemented as specified |
| ARCH-11: Event Architecture | Authoritative source for the event log is designated here (SOT-008); ARCH-11 specifies the persistent event envelope schema and the write path that must be wired into the Event Bus |
| ARCH-12: Agent Lifecycle Model | Authoritative source for agent task state is designated here (SOT-002); ARCH-12 will specify which of the two current write paths is canonical and which must be demoted |
| ARCH-13: Knowledge Architecture | Authoritative sources for the knowledge graph (SOT-007) and memory records (SOT-003) are designated here; ARCH-13 governs the knowledge architecture that reads from these sources |
| ARCH-14: Runtime Execution Model | Write authority requirements summarised in Section 6 inform the runtime pipeline's authority check phase; the runtime must enforce that no write occurs below the minimum trust level for that domain |

---

## Section 10 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification — 10 fact domains admitted | SOVEREIGN |

---

*End of ARCH-05 — Source of Truth Registry*
