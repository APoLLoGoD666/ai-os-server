# APEX CIVILISATION — ARCH-10: Memory Architecture

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Architecture
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00, ARCH-01, ARCH-02, ARCH-04, ARCH-05, ARCH-07, ARCH-08, ARCH-09
**Depended on by:** ARCH-13, ARCH-14

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document defines the canonical architecture of the APEX Civilisation memory system: the memory types, their schemas, their authoritative storage backends, their permitted write paths, their access controls, their lifecycle states, their retention policies, their audit obligations, and their quota model.

### 1.2 Scope

This document covers the 13-layer memory architecture of the APEX Civilisation, organised into five tiers: Core Memory (Layers 1–5), Operational Memory (Layers 6–7), Relational Memory (Layer 8), Processing Pipeline (Layers 10–13), and the Gateway that mediates all access. It specifies the canonical schema for each memory type, the single permitted write path, and the prohibited patterns that produce the C01 bypass defect.

Not covered: knowledge architecture across multiple stores (ARCH-13); database schema conventions (ARCH-15); event schema for MEMORY_WRITTEN events (ARCH-11).

---

## Section 2 — Architectural Principles

**Principle 1 — Single Write Path.** All writes to all memory types must pass through `lib/memory/gateway.js`. No module may hold a direct Supabase client reference for memory write purposes. This resolves C01.

**Principle 2 — Authoritative Source per Type.** Each memory type has exactly one authoritative storage layer (ARCH-05 SOT-003). The gateway enforces this assignment; it does not route writes based on caller preference.

**Principle 3 — Write Attribution is Mandatory.** Every memory write must carry a verified actor identity (ARCH-04). An unattributed write — one with no `actor_identity` — is rejected at the gateway. This resolves B1 (null decision chain links) by making `actor_identity` a precondition of admission.

**Principle 4 — Retention is Governed.** Memory records have declared lifecycle states and retention policies. Deletion outside the lifecycle is prohibited. Compression is a lifecycle transition, not a deletion.

**Principle 5 — Audit Writes are Synchronous.** Memory gateway writes produce a MEMORY_WRITTEN audit record (ARCH-08 Section 5.4) before confirming the write to the caller. The audit write and the memory write use the transactional outbox pattern (write-with-outbox.js). FIRE-AND-FORGET memory writes are prohibited (ARCH-07 MEMORY_WRITE row).

---

## Section 3 — The Memory Gateway

### 3.1 Role

`lib/memory/gateway.js` is the single admitted write path for all memory operations. Its responsibilities:

- Verify caller identity meets the minimum trust level for the memory type
- Validate the write payload against the memory type schema
- Execute the write and the MEMORY_WRITTEN audit record in a single transaction
- Emit a MEMORY_WRITTEN event on successful write (ARCH-11 forward reference)
- Return the committed record to the caller

### 3.2 Gateway Failure Mode

The gateway failure mode is FAIL-CLOSED (ARCH-07 MEMORY_WRITE row) for SEMANTIC, EPISODIC, PROCEDURAL, and DECISION memory. A write that fails identity verification, schema validation, or transaction commit must be rejected and must produce a MEMORY_WRITE_REJECTED audit record.

For WORKING memory only: FAIL-SOFT is conditionally permitted (ARCH-07 footnote ‡) because WORKING memory is task-scoped and transient — a WORKING memory write failure does not affect the permanent knowledge state of the Civilisation.

### 3.3 Prohibited Bypass Patterns

The following patterns are prohibited. Any module exhibiting these patterns must be remediated in Phase 3:

- Direct `supabaseClient.from('semantic_memory').insert(...)` calls in application modules
- Writing to memory tables via `pg_helpers.js` outside the gateway
- Writing Obsidian vault files as a substitute for writing to the authoritative Supabase table
- Importing `lib/memory/semantic-memory.js` (or any per-type module) directly from a non-memory module for write purposes

---

## Section 4 — Core Memory Types (Layers 1–5)

### 4.1 WORKING Memory — Layer 1

**Entity Type:** ET-KNW-005 (ARCH-01)
**Authoritative Storage:** `working_memory` table (Supabase Postgres)
**Module:** `lib/memory/working-memory.js`
**Trust Required to Write:** TASK (3)
**Lifecycle:** ACTIVE → EXPIRED (TTL-based)

**Canonical Schema:**
| Field | Type | Description |
|---|---|---|
| `id` | UUID v4 | Record identifier |
| `session_id` | UUID v4 | Owning session |
| `task_id` | UUID v4 or null | Owning task, if task-scoped |
| `content` | JSONB | Active context payload |
| `ttl_seconds` | integer | Time-to-live; default 3600 |
| `expires_at` | timestamptz | Computed: created_at + ttl_seconds |
| `actor_identity` | JSONB | ARCH-04 identity snapshot |
| `created_at` | timestamptz | Record creation |

**Retention Policy:** Records are deleted at `expires_at`. No compression. No archival.
**Audit Obligation:** MEMORY_WRITTEN.WORKING on write; no record on expiry (expiry is scheduled, not governed).
**Quota:** No hard per-record quota. Total WORKING memory per session bounded by session TTL.

---

### 4.2 EPISODIC Memory — Layer 2

**Entity Type:** ET-KNW-002 (ARCH-01)
**Authoritative Storage:** `episodic_memory` table (Supabase Postgres)
**Module:** `lib/memory/episodic-memory-pg.js`
**Trust Required to Write:** OPERATIONAL (4)
**Lifecycle:** ACTIVE → COMPRESSED → ARCHIVED → EXPIRED

**Canonical Schema:**
| Field | Type | Description |
|---|---|---|
| `id` | UUID v4 | Record identifier |
| `episode_type` | string | Conversation, task_execution, reflexion, external_event |
| `content` | text | Episode narrative |
| `embedding` | vector(768) | Gemini gemini-embedding-001 semantic embedding |
| `keywords` | text[] | Keyword extraction for keyword-overlap retrieval |
| `confidence` | decimal(3,2) | Confidence score (0.00–1.00) |
| `source_task_id` | UUID v4 or null | Task that produced this episode |
| `actor_identity` | JSONB | ARCH-04 identity snapshot |
| `chain_link` | UUID v4 or null | Prior audit record in evidence chain |
| `created_at` | timestamptz | |
| `compressed_at` | timestamptz or null | When compression was applied |

**Retrieval Strategy:** Keyword overlap (70% weight) + recency (30% weight). Semantic search via pgvector on `embedding` field.
**Retention Policy:** ACTIVE for 90 days; COMPRESSED (content summarised) at 90 days; ARCHIVED at 180 days; EXPIRED and eligible for deletion at 365 days.
**Audit Obligation:** MEMORY_WRITTEN.EPISODIC on write.
**Quota:** 10,000 ACTIVE records per civilisation instance. Compression is triggered at 80% quota saturation.

---

### 4.3 SEMANTIC Memory — Layer 3

**Entity Type:** ET-KNW-001 (ARCH-01)
**Authoritative Storage:** `semantic_memory` table (Supabase Postgres)
**Module:** `lib/memory/semantic-memory.js`
**Trust Required to Write:** OPERATIONAL (4)
**Lifecycle:** PROPOSED → VALIDATED → ACTIVE → DEPRECATED → ARCHIVED

**Canonical Schema:**
| Field | Type | Description |
|---|---|---|
| `id` | UUID v4 | Record identifier |
| `fact_type` | enum | FACT / CONCEPT / PATTERN / RULE |
| `content` | text | The semantic fact |
| `confidence` | decimal(3,2) | Confidence score; minimum 0.60 for VALIDATED status |
| `source_type` | string | Where this fact was derived from |
| `source_id` | UUID v4 or null | Specific source record |
| `contradicts` | UUID v4[] | IDs of contradicted records |
| `actor_identity` | JSONB | ARCH-04 identity snapshot |
| `chain_link` | UUID v4 or null | Prior audit record |
| `validated_at` | timestamptz or null | When confidence threshold was met |
| `created_at` | timestamptz | |

**Validation Rule:** A SEMANTIC record is not VALIDATED until confidence ≥ 0.60 confirmed by at least one reinforcing episode. A record that contradicts an ACTIVE VALIDATED record triggers a confidence resolution process.
**Retention Policy:** ACTIVE indefinitely while confidence ≥ 0.60. Records that decay below 0.60 transition to DEPRECATED. ARCHIVED at governance review; never deleted.
**Audit Obligation:** MEMORY_WRITTEN.SEMANTIC on write.
**Quota:** No hard limit. Confidence decay and contradiction resolution manage volume.

---

### 4.4 PROCEDURAL Memory — Layer 4

**Entity Type:** ET-KNW-003 (ARCH-01)
**Authoritative Storage:** `procedural_memory` table (Supabase Postgres)
**Module:** `lib/memory/procedural-memory.js`
**Trust Required to Write:** OPERATIONAL (4)
**Lifecycle:** DRAFT → ACTIVE → DEPRECATED → ARCHIVED

**Canonical Schema:**
| Field | Type | Description |
|---|---|---|
| `id` | UUID v4 | Record identifier |
| `procedure_type` | enum | PLAYBOOK / WORKFLOW / RECOVERY / CHECKLIST |
| `name` | string | Human-readable procedure name |
| `steps` | JSONB | Ordered step array with conditions |
| `trigger_conditions` | JSONB | When this procedure is applicable |
| `success_rate` | decimal(3,2) | Observed success rate (updated by REFLEXION) |
| `last_executed_at` | timestamptz or null | Last invocation timestamp |
| `actor_identity` | JSONB | ARCH-04 identity snapshot |
| `chain_link` | UUID v4 or null | Prior audit record |
| `created_at` | timestamptz | |

**Retention Policy:** ACTIVE indefinitely while `success_rate` ≥ 0.50. Deprecation triggered by success_rate decay below 0.50 after minimum 5 executions. ARCHIVED, never deleted.
**Audit Obligation:** MEMORY_WRITTEN.PROCEDURAL on write.
**Quota:** No hard limit.

---

### 4.5 STRATEGIC Memory — Layer 5

**Entity Type:** ET-INT-001 / ET-INT-002 (Goals / Objectives, ARCH-01)
**Authoritative Storage:** `strategic_memory` table (Supabase Postgres) — SOT-001 (ARCH-05)
**Module:** `lib/memory/strategic-memory.js`
**Trust Required to Write:** OPERATIONAL (4)
**Lifecycle:** PENDING → ACTIVE → BLOCKED → COMPLETED → CANCELLED

**Canonical Schema:**
| Field | Type | Description |
|---|---|---|
| `id` | UUID v4 | Record identifier |
| `goal_type` | enum | GOAL / OBJECTIVE / MILESTONE |
| `title` | string | Goal title |
| `description` | text | Goal description |
| `priority` | integer (1–10) | Governance priority |
| `status` | enum | Lifecycle state |
| `parent_id` | UUID v4 or null | Parent goal (Objective → Goal hierarchy) |
| `due_at` | timestamptz or null | Target completion |
| `completed_at` | timestamptz or null | Actual completion |
| `actor_identity` | JSONB | ARCH-04 identity snapshot |
| `chain_link` | UUID v4 or null | Prior audit record |
| `created_at` | timestamptz | |

**C13 Defect Resolution:** `goal-tracker.js` in-memory map is demoted to a read-only projection. All writes must use `lib/memory/strategic-memory.js`. The in-memory map must derive its state from a gateway read at initialisation, not maintain independent write state.
**Retention Policy:** Never deleted. COMPLETED and CANCELLED goals are archived.
**Audit Obligation:** MEMORY_WRITTEN.STRATEGIC on write.
**Quota:** No hard limit.

---

## Section 5 — Operational Memory (Layers 6–7)

### 5.1 SKILL Memory — Layer 6

**Authoritative Storage:** `skill_memory` table + `skill_evolution_snapshots` table (SOT-010, ARCH-05)
**Module:** `lib/memory/skill-memory.js`
**Trust Required to Write:** SYSTEM (2) for per-execution updates; OPERATIONAL (4) for manual adjustments
**Lifecycle:** LEARNING → COMPETENT → EXPERT → DEPRECATED

**Key Fields:** `skill_name`, `domain`, `confidence` (0.00–1.00), `success_count`, `failure_count`, `last_executed_at`, `evolution_snapshot_id`

**Reflexion Ranker:** The weekly reflexion ranker (`lib/memory/reflexion-ranker.js`) applies: +0.10 promote for lessons confirmed by successful outcomes, −0.05 decay for skills with no recent reinforcement. Minimum confidence floor: 0.10 (skills do not decay to zero).

---

### 5.2 DECISION Memory — Layer 7

**Entity Type:** ET-KNW-004 (ARCH-01)
**Authoritative Storage:** `decision_memory` table (Supabase Postgres)
**Module:** `lib/memory/decision-memory.js`
**Trust Required to Write:** OPERATIONAL (4)
**Lifecycle:** PROPOSED → DECIDED → IMPLEMENTED → EVALUATED

**Key Fields:** `decision_title`, `alternatives_considered` (JSONB array), `rationale` (text), `outcome` (text or null), `confidence_at_decision` (decimal), `actor_identity` (JSONB — mandatory; resolves B1), `chain_link` (UUID — mandatory; resolves B1)

**B1 Defect Resolution:** `decision_memory_id` and `chain_link` must be non-null on every DECISION record. The gateway enforces this: a DECISION write without a valid `chain_link` referencing the prior audit record is rejected. The null-chain pattern documented as B1 is a gateway validation error in Phase 3.

---

## Section 6 — Relational Memory (Layer 8)

### 6.1 Knowledge Graph

**Entity Type:** ET-KNW-007 (ARCH-01)
**Authoritative Storage:** `knowledge_graph_nodes` + `knowledge_graph_edges` tables (SOT-007, ARCH-05)
**Module:** `lib/memory/knowledge-graph.js`
**Trust Required to Write:** OPERATIONAL (4)

**Node Schema:** `node_id` (UUID), `node_type` (string), `label` (string), `properties` (JSONB), `confidence` (decimal), `actor_identity` (JSONB), `created_at`

**Edge Schema:** `edge_id` (UUID), `source_node_id` (UUID), `target_node_id` (UUID), `relationship_type` (string), `weight` (decimal 0–1), `properties` (JSONB), `actor_identity` (JSONB), `created_at`

**Retrieval:** BFS traversal with confidence scoring; cache TTL 60 seconds. GitNexus external index is a read-only projection refreshed post-commit.

---

## Section 7 — Processing Pipeline (Layers 10–13)

These layers are not primary storage — they are transformation and learning pipelines that read from Layers 1–8 and write back to them. They do not constitute separate authoritative sources; their outputs are written to the appropriate Layer 1–8 store.

### 7.1 Consolidation Engine — Layer 10

**Module:** `lib/memory/consolidation-engine.js`
**Table:** `memory_consolidation_queue`
**Pipeline:** raw input → reflection → lesson → pattern → knowledge
**Output Destination:** Writes to `semantic_memory` (lessons → patterns) and `knowledge_graph_nodes` (patterns → knowledge)
**Trust Required:** SYSTEM (2)

### 7.2 Reflexion Tracker — Layer 11

**Module:** `lib/memory/reflexion-tracker.js`
**Table:** `reflexion_records`
**Purpose:** Closed-loop lesson → behaviour verification
**C03 Defect Resolution:** `chain_link` must be non-null on every reflexion record. Gateway enforces this at write.
**Output Destination:** Writes to `skill_memory` (behaviour change confirmation)

### 7.3 Improvement Engine — Layer 12

**Module:** `lib/memory/improvement-engine.js`
**Table:** `improvement_candidates`
**Pipeline:** observation → approval → deployment → validation
**Governance:** 1 auto-deploy per 24 hours maximum (improvement governor rate limit). Deployments require EXECUTIVE (5) approval at AUTONOMY_LEVEL < 4.
**Output Destination:** Commits to git, triggers Render deploy

### 7.4 Adaptation Cycle — Layer 13

**Module:** `lib/memory/adaptation-cycle.js`
**Table:** `adaptation_cycles`
**Pipeline:** Weekly lessons → patterns → knowledge → behaviour changes
**Cadence:** Weekly scheduled execution via cron
**Output Destination:** Writes to `procedural_memory` (updated playbooks), `skill_memory` (updated confidence)

---

## Section 8 — Retention Policy Summary

| Memory Type | Compression | Archival | Deletion |
|---|---|---|---|
| WORKING | None | None | At TTL expiry |
| EPISODIC | At 90 days | At 180 days | Eligible at 365 days |
| SEMANTIC | None | At confidence < 0.60 sustained | Never |
| PROCEDURAL | None | At success_rate < 0.50 sustained | Never |
| STRATEGIC | None | On COMPLETED/CANCELLED | Never |
| SKILL | None | At DEPRECATED | Never |
| DECISION | None | At EVALUATED | Never |
| KNOWLEDGE GRAPH | None | None | Never (nodes/edges deprecated, not deleted) |

---

## Section 9 — Quota Model

| Memory Type | Hard Limit | Soft Limit (trigger action) | Action at Soft Limit |
|---|---|---|---|
| WORKING | None (bounded by session TTL) | None | — |
| EPISODIC | 10,000 ACTIVE records | 8,000 records (80%) | Trigger compression of oldest 20% |
| SEMANTIC | None | None | — |
| PROCEDURAL | None | None | — |
| STRATEGIC | None | None | — |
| SKILL | None | None | — |
| DECISION | None | None | — |
| KNOWLEDGE GRAPH | None | None | — |

---

## Section 10 — Access Control Summary

| Memory Type | Read Authority | Write Authority | Gateway Enforced |
|---|---|---|---|
| WORKING | TASK (3) — own session only | TASK (3) — own task scope | Yes |
| EPISODIC | OPERATIONAL (4) | OPERATIONAL (4) | Yes (Phase 3) |
| SEMANTIC | TASK (3) | OPERATIONAL (4) | Yes (Phase 3) |
| PROCEDURAL | TASK (3) | OPERATIONAL (4) | Yes (Phase 3) |
| STRATEGIC | TASK (3) | OPERATIONAL (4) | Yes (Phase 3) |
| SKILL | SYSTEM (2) | SYSTEM (2) | Yes |
| DECISION | OPERATIONAL (4) | OPERATIONAL (4) | Yes (Phase 3) |
| KNOWLEDGE GRAPH | TASK (3) | OPERATIONAL (4) | Yes |

"Yes (Phase 3)" means the gateway exists but bypass paths (C01) are not yet blocked. Phase 3 must remove all bypass paths.

---

## Section 11 — Known Defects and Resolution

| Defect | Memory Type | Description | Resolution in this Architecture |
|---|---|---|---|
| C01 | All | 5+ bypass write paths circumvent gateway | Section 3.3: bypass patterns listed; all must be removed in Phase 3 |
| B1 | DECISION | `decisionMemoryId` always null; chain broken | Section 5.2: `chain_link` mandatory at gateway; null rejected |
| C03 | REFLEXION (Layer 11) | Null `chain_link` in reflexion records | Section 7.2: gateway enforces non-null chain_link |
| C11 | All | `write-with-outbox.js` has no consumers | Section 3: gateway uses outbox for all memory writes; closes no-consumer gap |

---

## Section 12 — Memory Architecture Invariants

**INV-M1 — Single Write Path:** All memory writes must pass through `lib/memory/gateway.js`. No exception.

**INV-M2 — Attribution Mandatory:** Every memory write must carry a non-null `actor_identity` snapshot. An unattributed write is rejected.

**INV-M3 — Chain Links Mandatory:** Every EPISODIC, SEMANTIC, PROCEDURAL, DECISION, and REFLEXION record must carry a non-null `chain_link` referencing the prior audit record in its chain. Null chain links are a chain integrity defect (ARCH-08 Section 6.4).

**INV-M4 — Audit Write Precedes Confirmation:** The MEMORY_WRITTEN audit record must be committed before the gateway confirms the write to the caller. A memory write whose audit record fails must be rolled back.

**INV-M5 — Memory Records Are Never Physically Deleted Except WORKING:** Memory records in all types except WORKING undergo lifecycle transitions (DEPRECATED, ARCHIVED) rather than physical deletion. The historical record of knowledge is an architectural invariant of the Civilisation.

---

## Section 13 — Downstream Dependencies

| Document | Dependency |
|---|---|
| ARCH-13: Knowledge Architecture | Read strategy across memory types and knowledge stores derives from schemas defined here |
| ARCH-14: Runtime Execution Model | Post-response memory write phase references gateway write path; audit obligations from Section 10 |
| ARCH-15: Database Schema Standard | Physical schema for all 13 memory tables; RLS requirements per Section 10 access control |

---

## Section 14 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification | SOVEREIGN |

---

*End of ARCH-10 — Memory Architecture*
