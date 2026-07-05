# APEX CIVILISATION — ARCH-13: Knowledge Architecture

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Architecture
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00, ARCH-01, ARCH-05, ARCH-10
**Depended on by:** ARCH-14

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document defines the knowledge architecture of the APEX Civilisation: the division of responsibility between the three knowledge stores (Supabase structured memory, GraphNexus relational graph, Obsidian vault), the read strategy, the write authority, the role of the RAG sidecar, and the reconciliation protocol when sources diverge.

It resolves the structural ambiguity in the current codebase where knowledge is written to multiple stores with no defined authority order, no conflict resolution, and no specification of which store is canonical for which fact class.

### 1.2 Scope

Covered: the three knowledge stores and their designated domains; read priority order; write authority per domain; the RAG sidecar role and constraints; cross-store reconciliation; knowledge retrieval pipeline; GraphNexus and Obsidian projection obligations; the knowledge graph update protocol; access control summary.

Not covered: the memory type schemas (ARCH-10 Sections 4–6); the event system that signals knowledge updates (ARCH-11 EVT-023, EVT-011); the physical database schema for Supabase tables (ARCH-15).

---

## Section 2 — The Three Knowledge Stores

The APEX Civilisation uses three knowledge stores, each with a distinct domain of authority.

### 2.1 Supabase Structured Memory (Primary Authoritative Store)

**Role:** The authoritative, queryable store for all operational knowledge: episodic memory, semantic facts, procedural knowledge, strategic decisions, skill metrics, and the reflexion record.

**Technology:** Supabase Postgres (SOT-001 through SOT-007, SOT-009, SOT-010; ARCH-05).

**Authority class:** Read/Write — the single source of truth for structured knowledge. All governed writes must arrive here first via the Memory Gateway (ARCH-10 Section 3).

**Characteristics:**
- Schema-enforced; all records have validated structure
- Auditable; all writes produce Memory Write audit records (ARCH-08)
- Queryable by embedding similarity, semantic tag, entity relation, and timestamp
- Subject to retention policies (ARCH-10 Section 7)

**What it stores:**
- All memory types defined in ARCH-10 (WORKING, EPISODIC, SEMANTIC, PROCEDURAL, STRATEGIC, SKILL, DECISION)
- The task record (SOT-002; tasks table)
- The reflexion record (SOT-003; reflexion_records table)
- The governance record (SOT-005; governance_records table)
- The event log (SOT-008; events table)
- Resource consumption records (SOT-006; resource_consumption table)

### 2.2 GraphNexus / GitNexus (Relational Graph Projection)

**Role:** A read-optimised relational graph projection of the entities and relationships that exist in Supabase. GraphNexus provides graph traversal queries that are expensive in relational SQL: "what concepts are related to X?", "what is the chain of reasoning leading to decision Y?", "which skills are co-activated with task type Z?".

**Technology:** Graph store (currently GitNexus-backed; the specific graph engine is a deployment detail, not an architectural constant).

**Authority class:** Read-only projection. GraphNexus does not hold authoritative knowledge. It is a derived view of Supabase state.

**Write constraint:** The APEX system must not treat GraphNexus as the primary write target for any knowledge domain. Writes to GraphNexus are synchronisation events — they happen after the authoritative write to Supabase succeeds. A write that reaches GraphNexus but not Supabase is a source-of-truth violation.

**What it stores:**
- Entity nodes: goals, tasks, concepts, skills, agents
- Relationship edges: `RELATES_TO`, `DEPENDS_ON`, `TAUGHT_BY`, `CO_ACTIVATED_WITH`, `LEADS_TO`
- The APEX Knowledge Graph (ARCH-10 Section 6.3) projected as a traversable graph

**Synchronisation obligation:** When a KNOWLEDGE_GRAPH_UPDATED event (EVT-023) is emitted, the GraphNexus projection must be updated within 30 seconds. Stale projection tolerance: 60 seconds.

### 2.3 Obsidian Vault (Narrative Knowledge Projection)

**Role:** The long-form narrative projection of the Civilisation's knowledge. Obsidian holds human-readable documents, reflexion lessons, architectural documents, strategy notes, and procedural guides. It is the "institutional memory" readable by the Founder without database access.

**Technology:** Markdown files in `C:\Users\arwwo\Desktop\APEX\APEX AI OS\` (managed by Obsidian desktop application).

**Authority class:** Read-only projection for operational purposes. Obsidian is not consulted during agent task execution as an authoritative source. It is a projection of lessons and decisions already persisted in Supabase.

**Write constraint:** The APEX system writes to Obsidian as a post-task reflexion step (ARCH-12 CAP-STEP-REFLECT). These writes are FAIL-SOFT — a failed Obsidian write does not fail the task. The authoritative reflexion record is in Supabase (reflexion_records table, SOT-003); the Obsidian entry is a narrative duplicate for human consumption.

**What it stores:**
- Reflexion lessons (from REFLECTOR step; narrative form)
- Architectural documents (this series)
- Strategy notes from STRATEGIC memory layer
- Project documentation
- Claude Memory files (user preferences, project state)

**Read constraint:** During agent execution, the RESEARCHER step (CAP-STEP-001) may read Obsidian vault files as context. This is a FAIL-SOFT read — if the vault is unavailable, execution continues without vault context. The vault is never the authoritative source for a fact query during execution.

---

## Section 3 — Knowledge Domain Authority Map

| Knowledge Domain | Authoritative Store | GraphNexus? | Obsidian? |
|---|---|---|---|
| Task state and history | Supabase (tasks, SOT-002) | Node projection | No |
| Reflexion lessons | Supabase (reflexion_records, SOT-003) | No | Narrative duplicate (FAIL-SOFT) |
| Goals and objectives | Supabase (strategic_memory, SOT-001) | Node projection | Strategy notes |
| Semantic facts (concepts, entities) | Supabase (semantic_memory) | Node + edge projection | No |
| Procedural knowledge (how-tos) | Supabase (procedural_memory) | No | Human-readable guides |
| Skill metrics | Supabase (skill_metrics, SOT-010) | Edge projection (co-activation) | No |
| Architectural decisions | Supabase (decision_records) | No | Ratified ARCH documents |
| Governance records | Supabase (governance_records, SOT-005) | No | No |
| Resource consumption | Supabase (resource_consumption, SOT-006) | No | No |
| Event log | Supabase (events, SOT-008) | No | No |
| Knowledge Graph topology | Supabase (knowledge_graph_edges) | Primary traversal surface | No |

---

## Section 4 — Read Strategy

### 4.1 Retrieval Priority Order

When the agent pipeline requires knowledge retrieval, the order is:

1. **Supabase (authoritative)** — always queried first; provides structured, schema-validated facts
2. **GraphNexus (relational)** — queried for graph traversal when Supabase query returns insufficient relational context
3. **Obsidian (narrative)** — consulted by RESEARCHER step only, and only for long-form narrative context not available in structured form

If Supabase is unavailable: the agent step transitions to FAILED with reason `KNOWLEDGE_STORE_UNAVAILABLE`. GraphNexus and Obsidian are not fallbacks for Supabase — they are supplemental.

### 4.2 Embedding Similarity Retrieval

Semantic retrieval uses the `content_embedding` vector column in Supabase memory tables. The retrieval pipeline:

1. Embed the query using the designated embedding model (CAP-MODEL-004, ARCH-09)
2. Execute `ORDER BY content_embedding <-> $query_embedding LIMIT k` on the target memory table(s)
3. Filter by `entity_type`, `semantic_tags`, and access control predicates
4. Return top-k results ranked by cosine similarity

Minimum similarity threshold: 0.70 (configurable per query context). Results below threshold are discarded.

### 4.3 Conflict Resolution

When a fact appears in multiple stores with different values:

**Rule:** The Supabase record is authoritative. GraphNexus or Obsidian values that diverge from Supabase are stale projections. The system must not average, merge, or compromise between stores — it must use the Supabase value and mark the projections as stale for reconciliation.

**Conflict detection:** The `content_hash` field on memory records enables conflict detection. If a GraphNexus node's `content_hash` does not match the corresponding Supabase record, the node is stale and must be refreshed.

**Conflict resolution protocol:**
1. Detect divergence via content_hash comparison
2. Emit KNOWLEDGE_GRAPH_UPDATED (EVT-023) with `reason: STALE_PROJECTION`
3. GraphNexus consumer updates the stale node within 60 seconds
4. Obsidian projection is not auto-reconciled (human-readable, updated only on next reflexion write)

### 4.4 RAG Sidecar Role

The RAG (Retrieval-Augmented Generation) sidecar provides enriched context for agent prompt construction. Its role:

- **Read-only:** The RAG sidecar queries Supabase and GraphNexus; it never writes to either store
- **Context assembly:** It assembles retrieved facts into structured context blocks for model prompt injection
- **Scope:** It operates within the context window of the active task; retrieved facts are ephemeral unless explicitly written to memory via the Memory Gateway
- **Constraint:** The RAG sidecar must not cache facts in a local store that becomes a fourth source of truth. Retrieved context is use-once and discarded after the model invocation it was assembled for

**RAG sidecar failure mode:** FAIL-SOFT — if the sidecar fails to retrieve context, the model invocation proceeds with the base prompt (reduced context quality) rather than failing. The absence of RAG context must be noted in the step_log.

---

## Section 5 — Write Authority

### 5.1 Write Path Constraint

All knowledge writes must traverse the Memory Gateway (`lib/memory/gateway.js`, ARCH-10 Section 3). Direct writes to Supabase that bypass the gateway are prohibited (ARCH-10 INV-M1, ARCH-06 TB-005).

The Memory Gateway enforces:
- Identity verification (ARCH-04)
- Scope check (ARCH-06 TB-005: does the caller's task_id match the memory entity_owner?)
- Constitutional Gate (ARCH-06 TB-004)
- Audit record production (ARCH-08)
- Event emission (ARCH-11 EVT-005 MEMORY_WRITTEN)

### 5.2 GraphNexus Write Protocol

GraphNexus is updated exclusively via the Knowledge Graph update protocol:

1. Authoritative write to Supabase succeeds (via Memory Gateway)
2. `content_hash` of the written record is recorded
3. EVT-023 (KNOWLEDGE_GRAPH_UPDATED) is emitted with `affected_node_id` and `content_hash`
4. GraphNexus consumer receives EVT-023, updates the corresponding node and edges
5. Consumer acknowledges EVT-023; `consumer_ack_count` incremented

GraphNexus must not be written directly by any agent step, orchestrator, or API handler.

### 5.3 Obsidian Write Protocol

Obsidian is written exclusively by the REFLECTOR step (CAP-STEP-REFLECT) at task completion:

1. The authoritative reflexion record is written to Supabase (reflexion_records table) first
2. If Supabase write succeeds, a formatted markdown lesson is written to the Obsidian vault at `APEX AI OS/System/Reflexion/{year}/{task_id}.md`
3. If the Obsidian write fails: the failure is logged in the step_log; the task status remains COMPLETED; EVT-011 (REFLEXION_RECORDED) references only the Supabase record

Obsidian must not be written by any step other than REFLECTOR. Architectural documents are written by the Founder directly, not by the agent pipeline.

---

## Section 6 — Knowledge Retrieval Pipeline

The knowledge retrieval pipeline is the sequence of operations the agent pipeline uses to assemble context before model invocation.

### 6.1 Pipeline Phases

**Phase 1 — Working Memory Query**
Query the active task's working_context (ARCH-10 Section 4.1). If the required fact is present in working context and within the declared freshness bound, use it directly (no database query).

**Phase 2 — Episodic Memory Recall**
Query episodic_memory for recent task episodes with similar task_type or entity_refs. Retrieve top-3 by recency × relevance score. These provide prior-outcome context ("last time we did a FEATURE task on this module, the REVIEWER found X").

**Phase 3 — Semantic and Procedural Recall**
Query semantic_memory for concept and entity facts relevant to the task description. Query procedural_memory for how-to records tagged with the task_type. Combined embedding similarity retrieval across both tables.

**Phase 4 — Strategic Context**
Query strategic_memory for active goals and objectives (status: ACTIVE or IN_PROGRESS). This ensures the agent pipeline is aware of current strategic constraints without re-querying goal-tracker.js.

**Phase 5 — Knowledge Graph Traversal (optional)**
If Phase 3 retrieval is sparse (fewer than 3 results above threshold), query GraphNexus for related concepts via graph traversal (depth ≤ 2 hops) from the primary entity_refs. This expands the context with related knowledge not directly matched by embedding.

**Phase 6 — Context Assembly**
The RAG sidecar assembles the retrieved facts into a structured context block. Token budget: configurable per task_type; default 2,000 tokens for context, reserving the balance of the model's context window for the pipeline prompt and output.

### 6.2 Context Block Format

```json
{
  "context_type": "RETRIEVAL_CONTEXT",
  "retrieved_at": "<timestamptz>",
  "working_memory": { "<key>": "<value>" },
  "episodic_recall": [
    { "episode_id": "<uuid>", "summary": "<string>", "outcome": "<string>" }
  ],
  "semantic_facts": [
    { "memory_id": "<uuid>", "content": "<string>", "similarity": 0.85 }
  ],
  "procedural_guides": [
    { "memory_id": "<uuid>", "content": "<string>" }
  ],
  "strategic_context": {
    "active_goals": ["<goal_id>"],
    "active_objectives": ["<objective_id>"]
  },
  "graph_expansion": [
    { "node_id": "<uuid>", "relationship": "<string>", "content": "<string>" }
  ]
}
```

---

## Section 7 — Knowledge Graph Update Protocol

The Knowledge Graph (ARCH-10 Section 6.3) is the semantic relationship map of the Civilisation's entities. It is maintained in Supabase (knowledge_graph_nodes and knowledge_graph_edges tables) and projected into GraphNexus.

### 7.1 Node and Edge Types

**Node types:**
- CONCEPT — abstract ideas, architectural patterns, domain terms
- ENTITY — concrete instances (tasks, goals, agents, people)
- SKILL — capability nodes from skill_metrics (SOT-010)
- DECISION — decision records from decision_records table

**Edge types:**
- `RELATES_TO` — general semantic relationship (bidirectional)
- `DEPENDS_ON` — dependency relationship (directional)
- `TAUGHT_BY` — a skill was learned from a specific episode or lesson
- `CO_ACTIVATED_WITH` — two skills or concepts frequently appear together
- `LEADS_TO` — a decision or action led to an outcome
- `CONTRADICTS` — two concepts are in documented tension (triggers reflexion)
- `SUPERSEDES` — a new record replaces an older one (versioning relationship)

### 7.2 Update Triggers

The Knowledge Graph is updated when:
- A new reflexion record is written (EVT-011) — extract concept nodes and `TAUGHT_BY` edges from the lesson
- A new semantic memory record is created (EVT-005 with entity_type in ET-KNW-001..005) — add or update the concept node
- A skill metric is updated (EVT in SOT-010 write path) — update co-activation edges
- A strategic decision is committed (ARCH-10 Section 5.3) — add DECISION node and `LEADS_TO` edges

### 7.3 Knowledge Graph Write Authority

The Knowledge Graph tables may be written by:
- The REFLECTOR step (via Memory Gateway) — adds lesson-derived nodes and edges
- The Memory Gateway (ARCH-10) — on any memory write that warrants graph update
- The Adaptation Layer (ARCH-10 Section 6.6) — updates co-activation and skill edges based on performance patterns

No other component may write to knowledge_graph_nodes or knowledge_graph_edges directly.

---

## Section 8 — Access Control

| Store | Read | Write | Notes |
|---|---|---|---|
| Supabase structured memory | TASK(3) and above | OPERATIONAL(4) via Memory Gateway | RLS enforces row-level access (ARCH-15) |
| GraphNexus | TASK(3) and above | System only (via EVT-023 consumer) | Read-only for agent pipeline |
| Obsidian vault | Any (file system read) | REFLECTOR step only | Not governed by identity system directly |
| RAG sidecar | TASK(3) and above | None (read-only sidecar) | Ephemeral context assembly only |

Memory Gateway access control is specified in ARCH-10 Section 3.4. The identity check (ARCH-04) determines the effective trust level of the caller before any knowledge store operation proceeds.

---

## Section 9 — Known Implementation State

| Gap | Description | Resolution |
|---|---|---|
| GraphNexus write path undefined | No code in lib/ specifies how GraphNexus is updated after Supabase writes | Section 5.2: EVT-023 consumer pattern; Phase 3 obligation |
| RAG sidecar implementation | `lib/intelligence/rag-sidecar.js` (if present) does not implement the retrieval pipeline phases defined here | Section 6: Phase 3 implementation obligation |
| Knowledge graph tables | knowledge_graph_nodes and knowledge_graph_edges tables may not exist in Supabase schema | ARCH-15: physical schema; Phase 3 migration obligation |
| Obsidian write bypasses Memory Gateway | REFLECTOR step currently writes Obsidian directly using fs | Permitted — Obsidian is not a governed memory store; Section 5.3 protocol applies |
| Context block token budget not enforced | No code enforces the 2,000-token retrieval context cap | Section 6.2: Phase 3 implementation obligation |

---

## Section 10 — Knowledge Architecture Invariants

**INV-K1 — Supabase Is the Authoritative Knowledge Store.** For any knowledge domain listed in Section 3, Supabase is the authoritative source. GraphNexus and Obsidian are projections. A query that consults GraphNexus or Obsidian without first querying Supabase violates this invariant.

**INV-K2 — GraphNexus Receives No Direct Writes.** GraphNexus is updated exclusively via EVT-023 consumers triggered by authoritative Supabase writes. Any direct write to GraphNexus that did not originate from a committed Supabase write is a source-of-truth violation.

**INV-K3 — RAG Sidecar Is Read-Only.** The RAG sidecar must not write to any knowledge store. It assembles context for model consumption; it does not store retrieved facts or create new records. A RAG sidecar that writes to any store is a scope violation.

**INV-K4 — Obsidian Writes Are FAIL-SOFT.** A failed Obsidian write must not fail the task or produce a FAILED terminal state. The authoritative record is in Supabase; Obsidian is a narrative convenience. Loss of an Obsidian write is a projection gap, not an audit gap.

**INV-K5 — Knowledge Graph Writes Go Through Memory Gateway.** All writes to knowledge_graph_nodes and knowledge_graph_edges must traverse the Memory Gateway and produce MEMORY_WRITTEN audit records (EVT-005). Direct table writes outside the gateway are prohibited.

---

## Section 11 — Downstream Dependencies

| Document | Dependency |
|---|---|
| ARCH-14: Runtime Execution Model | Knowledge retrieval pipeline (Section 6) is the context-assembly phase of the pre-model-invocation pipeline |
| ARCH-15: Database Schema Standard | Physical schema for knowledge_graph_nodes, knowledge_graph_edges, and all memory tables |

---

## Section 12 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification | SOVEREIGN |

---

*End of ARCH-13 — Knowledge Architecture*
