# UX-15 — MEMORY

**APEX AI OS — UX Programme**
**Document ID:** UX-15
**Series:** Interface Canonical Documents
**Status:** CANONICAL — PRODUCTION AUDIT COMPLETE
**Classification:** CONFIDENTIAL — INTERNAL DESIGN REFERENCE
**Supersedes:** None (first issue)
**Predecessor documents:** UX-14-ACTIONS-APPROVALS.md
**Successor documents:** UX-16 (not yet issued)
**Audit basis:** Full production codebase review — August 2026
**Evidence standard:** OBSERVED = confirmed in source; INHERITED = from prior UX docs; PROPOSED = design intent not yet wired; OPEN = unresolved question

---

## 1. Authority

This document is issued under the APEX AI OS UX Programme. It is the canonical reference for all design, engineering, and governance decisions related to Memory within the APEX system.

UX-15 sits within the APEX canonical UX Programme sequence:

UX-00 → UX-01 → UX-02 → UX-03 → UX-04 → UX-05 → UX-06 → UX-07 → UX-08 → UX-09 → UX-10 → UX-11 → UX-12 → UX-13 → UX-14 → **UX-15** → UX-16

### 1.1 Governing Documents

- **UX-05** — Canonical Visual Design System. ONE `:root` block. All design tokens. Progressive disclosure levels L0–L4. Attention levels L0–L5.
- **UX-08** — Contextual Presentation Architecture. Canonical eight-stage pipeline: CONTEXT → RELEVANCE → PRIORITY → PRESENTATION DECISION → VISUAL CHANNEL → USER RESPONSE → RESOLUTION → WITHDRAWAL.
- **UX-09** — Proactive Communication. SILENT is a valid outcome. All proactive surfaces route through UX-08.
- **UX-10** — Domain Experiences and Personalisation. Preference memory is classified as INHERITED from UX-10 personalisation work.
- **UX-11** — Knowledge. Memory feeds knowledge; they are not the same system.
- **UX-12** — Intelligence. Intelligence consumes memory context through the Memory Gateway; they are not the same system.
- **UX-13** — Agents. Agents read from permitted memory layers; agents cannot self-authorise through memory.
- **UX-14** — Actions / Approvals. Governance records created at execution time are not memory entries.

### 1.2 Classification of Evidence

All findings in this document follow the canonical evidence taxonomy:

| Tag | Meaning |
|-----|---------|
| OBSERVED | Directly confirmed in production source code or database schema |
| INHERITED | Carried forward from prior UX documents without re-auditing |
| PROPOSED | Design intent that is not yet implemented or wired |
| OPEN | Unresolved — requires decision before implementation |

Implementation status tags (may be combined with evidence tags):

| Tag | Meaning |
|-----|---------|
| PRODUCTION ACTIVE | Running in production, wired end-to-end |
| PRODUCTION WIRED | Route and handler exist and call downstream |
| IMPLEMENTED | Code exists (function/table) but may not be fully wired to routes |
| PARTIAL | Some parts wired, some parts missing |
| PROTOTYPE ONLY | Exists in prototype or UI mockup only, not production |
| LEGACY | Exists in production but is superseded or deprecated |
| SECONDARY | Exists as a secondary or fallback store; not the primary path |
| MISSING | Expected by design; not found in any production file |
| SEPARATE SYSTEM | Exists but is not part of APEX core memory architecture |

### 1.3 Binding Authority

This document establishes invariants, design constraints, and test scenarios that are binding on all subsequent APEX engineering work involving memory. Deviations must be documented in Section 47. No engineering work may contradict a stated invariant without explicit written revision of this document.

---

## 2. Objective

The APEX Memory system is the substrate through which all APEX experience persists across time. Without memory, every interaction begins from zero. With memory, APEX accumulates context, learns from outcomes, refines its understanding, and behaves with coherence across sessions, agents, and domains.

The objective of this document is to:

1. Define the canonical 13-layer memory architecture as it exists in production, with exact evidence for every layer.
2. Establish precise definitional boundaries between memory, knowledge, context, intelligence, and preference — these are distinct systems that interact but must not be conflated.
3. Map all production memory routes, database schemas, lifecycle operations, and support modules to their observed status.
4. Define the memory lifecycle: write, read, consolidate, decay, correct, delete.
5. Define the user experience of memory: what users can inspect, what they can correct, what they can delete, and what they cannot touch.
6. Identify all production gaps that require engineering work before the system is complete and safe.
7. Establish invariants that are binding on all future memory implementation work.
8. Provide verification scenarios for QA and design review.

Memory is not a feature. It is the continuity layer of the APEX AI OS. It must be designed with exactness, surfaced with honesty, and bounded with discipline.

---

## 3. Scope

This document covers:

- All 13 memory layers identified in `lib/memory/index.js` (Layers 0 through 13, noting Layer 9 is absent from the production index)
- The Memory Gateway (`lib/memory/gateway.js`) as the single authoritative access path
- The Memory Governor (`lib/memory/memory-governor.js`) as the lifecycle and ID authority
- The Importance Engine (`lib/memory/importance-engine.js`) as the write-gate authority
- The Access Controller (`lib/memory/access-controller.js`) and its entity class model
- The Consolidation Engine (`lib/memory/consolidation-engine.js`) and its processing pipeline
- The Reflexion Tracker (`lib/memory/reflexion-tracker.js`) and its closed-loop proof mechanism
- The Improvement Engine (`lib/memory/improvement-engine.js`) and the Adaptation Cycle (`lib/memory/adaptation-cycle.js`)
- The memory sanitizer, cache, and embedding infrastructure
- All Supabase tables that underpin memory layers
- The episodic vault at `12 Memory/Episodes/` (secondary/legacy path)
- The production memory stats route: `GET /api/memory/stats`
- Memory written fire-and-forget in `chat.js`
- Memory decay semantics per layer
- Memory deletion semantics per layer
- User-facing memory UX requirements: inspection, correction, deletion
- Frontend memory surface requirements (including the CRITICAL GAP finding)
- All UX design requirements for how memory is disclosed, presented, and controlled
- Prefixing and ID generation as defined by `memory-governor.js`
- Confidence accumulation and contradiction handling in semantic memory
- The Ruflo SQLite store at `.swarm/memory.db` — classified as SEPARATE SYSTEM and explicitly excluded from APEX core memory

---

## 4. Non-Scope

The following are explicitly outside the scope of UX-15:

- Knowledge gap detection and lifecycle (UX-11 and the Knowledge-Gap Programme — COMPLETE)
- Intelligence scoring, model selection, and confidence modelling (UX-12)
- Agent planning, step generation, and agent lifecycle (UX-13)
- Action proposals, approval flows, and reversibility (UX-14)
- Visual design tokens, colour, spacing, typography (UX-05)
- Domain-specific task flows (UX-10)
- Personalisation and trait evolution beyond memory's contribution to it (UX-10 Personalisation)
- Constitutional and governance architecture (UX-16 — not yet issued)
- Authentication, authorisation, and session management (separate concern)
- Multi-user / multi-tenant memory isolation (not yet designed — OPEN)
- External RAG sidecar architecture beyond the observation that `langchain-rag.js` returns 503 when `RAG_SIDECAR_URL` is not configured
- The Ruflo SQLite memory store — it is a SEPARATE SYSTEM with no relationship to APEX core memory layers
- Graphify as a primary memory system — it is a secondary knowledge graph visualisation tool
- UX-16 system and constitutional UX — not yet issued; no UX-16 content is introduced here

---

## 5. Production Memory Architecture

### 5.1 Full Production Audit Table

The following table documents every production component in the APEX memory system, confirmed by direct codebase audit.

| Layer | Module | Storage | Status | Evidence |
|-------|--------|---------|--------|---------|
| 0 — Founder Memory | lib/memory/founder-memory.js | Supabase | PRODUCTION ACTIVE | OBSERVED |
| 1 — Working Memory | lib/memory/working-memory.js | Supabase working_memory | PRODUCTION ACTIVE | OBSERVED |
| 2 — Episodic Memory (PG) | lib/memory/episodic-memory-pg.js | Supabase Postgres | PRODUCTION ACTIVE | OBSERVED |
| 2 — Episodic Memory (Vault) | agent-system/episodic-memory.js | Obsidian vault JSON | SECONDARY/PARTIAL | OBSERVED |
| 3 — Semantic Memory | lib/memory/semantic-memory.js | Supabase semantic_memory | PRODUCTION ACTIVE | OBSERVED |
| 4 — Procedural Memory | lib/memory/procedural-memory.js | Supabase Postgres | PRODUCTION ACTIVE | OBSERVED |
| 5 — Strategic Memory | lib/memory/strategic-memory.js | Supabase Postgres | PRODUCTION ACTIVE | OBSERVED |
| 6 — Skill Memory | lib/memory/skill-memory.js | Supabase skill_memory | PRODUCTION ACTIVE | OBSERVED |
| 7 — Decision Memory | lib/memory/decision-memory.js | Supabase Postgres | PRODUCTION ACTIVE | OBSERVED |
| 8 — Knowledge Graph | lib/memory/knowledge-graph.js | Supabase KG tables | PRODUCTION ACTIVE | OBSERVED |
| 9 — (absent from index) | — | — | NOT PRESENT | OBSERVED |
| 10 — Consolidation Engine | lib/memory/consolidation-engine.js | Supabase consolidation queue | PRODUCTION ACTIVE | OBSERVED |
| 11 — Reflexion Tracker | lib/memory/reflexion-tracker.js | Supabase reflexion_records | PRODUCTION ACTIVE | OBSERVED |
| 12 — Improvement Engine | lib/memory/improvement-engine.js | Supabase Postgres | PRODUCTION ACTIVE | OBSERVED |
| 13 — Adaptation Cycle | lib/memory/adaptation-cycle.js | Supabase Postgres | PRODUCTION ACTIVE | OBSERVED |
| Memory Gateway | lib/memory/gateway.js | All layers | PRODUCTION ACTIVE | OBSERVED |
| Memory Governor | lib/memory/memory-governor.js | All layers | PRODUCTION ACTIVE | OBSERVED |
| Importance Engine | lib/memory/importance-engine.js | Classifier only | PRODUCTION ACTIVE | OBSERVED |
| Access Controller | lib/memory/access-controller.js | In-memory | PRODUCTION ACTIVE | OBSERVED |
| Memory Sanitizer | lib/memory/sanitizer.js | Pre-storage | PRODUCTION ACTIVE | OBSERVED |
| Memory Cache | lib/memory/cache.js | In-process cache | PRODUCTION ACTIVE | OBSERVED |
| Embedding Infrastructure | lib/embed.js | pgvector (async) | PRODUCTION ACTIVE | OBSERVED |
| Memory Stats Route | GET /api/memory/stats | Admin route (src/routes/admin.js) | PRODUCTION WIRED | OBSERVED |
| Chat fire-and-forget writes | chat.js (setImmediate) | Layers 2, 6, consolidation | PRODUCTION ACTIVE | OBSERVED |
| Preference Memory | — | INHERITED from UX-10/adaptation-cycle | PARTIAL | OBSERVED |
| Frontend Memory UI | dashboard.html | — | **MISSING** | OBSERVED |
| User Memory Delete Route | — | — | **MISSING** | OBSERVED |
| User Memory Correction Route | — | — | **MISSING** | OBSERVED |
| Time-based confidence decay | — | — | **MISSING** | OPEN |
| Ruflo SQLite | .swarm/memory.db | SQLite | SEPARATE SYSTEM | OBSERVED |

### 5.2 Layer Count and Numbering

The production index (`lib/memory/index.js`) defines 13 numbered layers. Layer 9 is absent from the production index — the numbering jumps directly from Layer 8 (Knowledge Graph) to Layer 10 (Consolidation Engine). This gap is OBSERVED in production and is not an error in this document. No Layer 9 module was found.

### 5.3 Memory Gateway as Authoritative Access Point

All memory access flows through `lib/memory/gateway.js`. No memory layer is accessed directly from routes or intelligence modules without passing through the Gateway. The Gateway exposes: `getContext()`, `searchMemory()`, `storeMemory()`, `retrievePolicies()`, `retrieveLessons()`, `retrieveFounderContext()`, `summarizeMemory()`. Caching is applied within the Gateway using `cache.key()`. Context results are cached; knowledge sufficiency checks are never cached.

### 5.4 Memory Governor as Lifecycle Authority

`lib/memory/memory-governor.js` controls ID generation and lifecycle state transitions. Valid statuses: `candidate`, `validated`, `deprecated`, `superseded`, `archived`. ID prefixes by layer: `wm` (working), `ep` (episodic), `sm` (semantic), `pm` (procedural), `stm` (strategic), `skm` (skill), `dm` (decision), `kgn`/`kge` (knowledge graph node/edge), `mcq` (consolidation queue), `rfx` (reflexion), `imp` (improvement), `adp` (adaptation).

### 5.5 Secondary and Separate Systems

The episodic vault at `12 Memory/Episodes/` (written by `agent-system/episodic-memory.js`, MAX_EPISODES=200) is a SECONDARY/PARTIAL path. It is not the primary episodic store. The primary episodic store is `lib/memory/episodic-memory-pg.js` writing to Supabase Postgres.

The Ruflo SQLite at `.swarm/memory.db` is a SEPARATE SYSTEM entirely unrelated to APEX core memory. It belongs to the Ruflo agent orchestration layer. It must never be presented to the user as APEX memory.

---

## 6. Memory Taxonomy

### 6.1 Definitional Boundaries

The following definitions are binding. These terms must not be used interchangeably in UX copy, engineering comments, or design documentation.

**Memory** — Raw stored observations, outcomes, and experiences. Memory is the substrate. It includes things that have not yet been validated, classified, or promoted to higher-order representations. Memory can be wrong. Memory can decay. Memory can be forgotten.

**Knowledge** — Validated, structured facts, concepts, and patterns. Knowledge is derived from memory through consolidation and validation. Knowledge is managed by UX-11 and the Knowledge-Gap Programme. Memory feeds knowledge; knowledge does not replace memory.

**Context** — The assembled slice of memory, knowledge, and situational state that is relevant to the current task or conversation. Context is ephemeral. Context is not stored as context — it is assembled from stored memory at retrieval time.

**Intelligence** — Interpreted, weighted, and scored reasoning output. Intelligence is the product of applying models and reasoning over context derived from memory and knowledge. Intelligence is managed by UX-12. Memory does not produce intelligence directly.

**Preference** — User-specific behavioural tendencies, stated or inferred. Preferences are stored via the adaptation cycle and founder memory. There is no dedicated `preference_memory` table in production. Preference memory is classified as INHERITED from UX-10 personalisation work.

**Session** — A bounded interaction period. Working memory is scoped to the session. Session end triggers cleanup of expired working memory but does not delete other layers.

### 6.2 Memory vs Knowledge Boundary

Memory is the raw material. Knowledge is the refined product. The Consolidation Engine (Layer 10) is the manufacturing process that takes raw memory observations and produces structured knowledge candidates. The Semantic Memory layer (Layer 3) sits at the boundary — it stores validated facts, concepts, patterns, and rules. Items in semantic memory with status `candidate` are memory candidates awaiting validation. Items with status `validated` have been promoted to knowledge-level reliability but remain in the memory layer.

The user must never be shown memory as if it were validated knowledge without explicit status disclosure.

### 6.3 Memory Layers by Lifetime

| Lifetime | Layers |
|----------|--------|
| Session-scoped (transient) | Layer 1 — Working Memory |
| Task-scoped (durable per task) | Layer 2 — Episodic, Layer 7 — Decision |
| Long-term (accumulating) | Layers 3, 4, 5, 6, 8 |
| Process-scoped (pipeline) | Layers 10, 11, 12, 13 |
| Permanent (founder-trust) | Layer 0 — Founder Memory |

### 6.4 Memory Layers by Write Source

| Write Source | Layers Written |
|--------------|---------------|
| Orchestrator (post-task) | 2 (episodic), 7 (decision) |
| Chat route (fire-and-forget, setImmediate) | 2 (episodic), 6 (skill), consolidation queue |
| Cron (hourly) | Consolidation Engine batch processing |
| Reflexion Tracker (on lesson retrieval) | 11 (reflexion records) |
| Improvement Engine | 12 (improvements) |
| Adaptation Cycle (weekly) | 13 (adaptation) |
| Founder direct input | 0 (founder memory) |
| All layers via Gateway | storeMemory() |

---

## 7. Working Memory

### 7.1 Purpose and Scope

Working Memory (Layer 1, `lib/memory/working-memory.js`) is the session-scoped, TTL-based memory layer. It holds the active task, current goal, execution plan, reasoning context, and any transient state that is relevant only within the duration of the current session. Working Memory is explicitly not durable — it expires automatically.

Working Memory is the only layer that is guaranteed to be cleared between sessions. No other layer provides session-scoped expiry as a first-class design principle.

### 7.2 Storage

- Table: `working_memory` (Supabase)
- Fields: `memory_id`, `session_id`, `memory_type`, `content` (JSON), `ttl_seconds`, `expires_at`, `confidence` (default 1.0), `source`, `trace_id`, `task_id`, `updated_at`
- Upsert semantics: one entry per `session_id` + `memory_type` combination. Writing the same type in the same session updates the existing record.

### 7.3 Operations

- `set(sessionId, memoryType, content, ttlSeconds)` — upsert with expiry calculation
- `get(sessionId, memoryType)` — retrieve if not expired
- `getAll(sessionId)` — all non-expired entries for a session
- `extend(sessionId, memoryType, additionalSeconds)` — extend TTL without rewriting content
- `clear(sessionId)` — delete all entries for a session
- `clearExpired()` — delete all entries past `expires_at` (called by cron)
- `buildContextSummary(sessionId)` — assemble working memory into a context block for injection

### 7.4 TTL and Expiry

Default TTL: 3600 seconds (1 hour). TTL is configurable per-write. Expiry is enforced server-side via `expires_at` field — reads check the field and return null for expired records. Hard deletion of expired records is performed by `clearExpired()` on the cron schedule.

### 7.5 Confidence

Working Memory entries carry a `confidence` field defaulting to 1.0. Working Memory is session-fresh by construction — no validation is required before writing. The confidence value reflects recency, not epistemological certainty.

### 7.6 UX Implications

Working Memory is not appropriate for user inspection in the general case. It is transient, session-local, and often contains intermediate reasoning state that has no stable meaning outside the session. If a memory inspection UI is built, Working Memory should be presented only in an advanced/debug context (progressive disclosure L3 or L4) and should be clearly labelled as transient session state that will not persist.

The user must never be shown Working Memory entries as if they are permanent APEX memory.

---

## 8. Episodic Memory

### 8.1 Purpose and Scope

Episodic Memory (Layer 2) stores durable records of task execution — what happened, what was attempted, what succeeded, what failed. Episodic Memory is the historical log of APEX experience. It is the foundation for learning — the Consolidation Engine draws on episodic records to identify patterns and lessons.

There are two episodic stores in production:

1. **Primary** — `lib/memory/episodic-memory-pg.js` writing to Supabase Postgres. PRODUCTION ACTIVE.
2. **Secondary/Legacy** — `agent-system/episodic-memory.js` writing to the Obsidian vault at `12 Memory/Episodes/`. SECONDARY/PARTIAL. Subject to a 200-episode cap.

### 8.2 Primary Store (Supabase Postgres)

Fields: `memory_id`, `trace_id`, `task_id`, `source`, `evidence`, `objective`, `complexity`, `success` (boolean), `outcome_summary`, `keywords[]`, `embedding` (pgvector, written asynchronously)

Operations: `storeEpisode()`, `findSimilar()`, `getRecent(limit=20)`, `getFailures()`, `getSuccessRate(n=50)`, `getStats()`

The `embedding` field enables semantic similarity search via pgvector. Embeddings are written asynchronously — there is a window between record creation and embedding availability.

### 8.3 Secondary Store (Obsidian Vault)

Written by `agent-system/episodic-memory.js`. Maximum 200 episodes (MAX_EPISODES=200 cap). Older episodes are pruned by recency scoring when the cap is reached. This store is used for offline vault inspection and does not participate in the primary retrieval pipeline.

### 8.4 Write Sources

- Orchestrator: writes episodic records after task completion
- Chat route: writes episodic records fire-and-forget via `setImmediate` after each conversation turn

The fire-and-forget pattern means episodic writes are not synchronous with the response. There is a non-zero probability of episodic write failure not being surfaced to the user.

### 8.5 Confidence

Episodic Memory has no explicit numeric confidence field. The `success` boolean provides an implicit binary quality signal. The `outcome_summary` field provides narrative context. This is a design limitation — see Section 44.

### 8.6 UX Implications

Episodic Memory is the most user-legible layer. A task that completed yesterday, a conversation that happened last week, a failure that was investigated last month — these are episodic records. Users have a legitimate interest in reviewing episodic history.

No user-facing episodic browsing UI exists in production (dashboard.html: MISSING). This is a critical production gap requiring engineering work.

When episodic memory is surfaced to users, it must display:
- Task objective
- Outcome summary (success/failure)
- Date and time of execution
- Source context (which agent, which session)
- Keywords (for contextual labelling)

The `embedding` field must not be shown to users.

---

## 9. Semantic Memory

### 9.1 Purpose and Scope

Semantic Memory (Layer 3, `lib/memory/semantic-memory.js`) stores validated facts, concepts, patterns, and rules. It is the primary long-term factual store. Semantic Memory is where raw observations from episodic memory and consolidation are promoted after validation. It sits at the boundary between raw memory and structured knowledge.

### 9.2 Storage

- Table: `semantic_memory` (Supabase)
- Fields: `memory_id`, `trace_id`, `source`, `evidence`, `fact`, `category` (fact | concept | pattern | rule | constraint), `domain`, `tags`, `confidence` (starts 0.5), `support_count`, `contradiction_count`, `status` (candidate | validated | deprecated | superseded), `validation_state` (pending)

### 9.3 Operations

- `storeFact(content)` — write new semantic entry at confidence 0.5, status candidate
- `search(query)` — semantic similarity search
- `addSupport(memoryId, evidence)` — increase confidence via `accumulateSupport()`
- `contradict(memoryId, evidence)` — record contradiction via `recordContradiction()`, decrement confidence
- `validate(memoryId)` — promote to validated status
- `supersede(memoryId, successorId)` — mark as superseded
- `getByDomain(domain)` — retrieve all entries for a domain
- `findDuplicate(fact)` — check for duplicates before writing

### 9.4 Confidence Model

Semantic memory starts every new entry at confidence 0.5. Confidence accumulates with each supporting observation via `accumulateSupport()`. Contradictions decrement confidence via `recordContradiction()`. A sufficiently contradicted entry may be deprecated automatically.

The accumulation formula is not specified in this document beyond the observed behaviour — confidence increases monotonically with support and decreases with contradiction. There is no time-based decay on semantic confidence (see Section 28 — Decay). This is a MISSING feature.

### 9.5 Status Lifecycle

`candidate` → (validation) → `validated` → (contradiction/supersession) → `deprecated` | `superseded`

Items may be archived by the Memory Governor using the `archived` status.

### 9.6 UX Implications

Semantic memory is the layer most likely to be surfaced to users as "what APEX knows." However, semantic memory is not the same as the Knowledge layer managed by UX-11. The distinction must be maintained in UX copy:

- `candidate` items — must be labelled as unverified or under review. Never presented as established fact.
- `validated` items — may be presented as established, but the source and evidence chain must remain accessible.
- `deprecated` items — must not be surfaced in normal views. May appear in history or audit views with clear deprecation labelling.
- `superseded` items — must link to the successor entry. Must not be presented as current.

Confidence must be shown to users in one of three tiers — do not show raw decimal values in UI by default:
- High confidence (≥ 0.8) — no qualifier needed
- Medium confidence (0.5–0.79) — "possibly" or "likely"
- Low confidence (< 0.5) — "uncertain" or "unverified"

---

## 10. Procedural Memory

### 10.1 Purpose and Scope

Procedural Memory (Layer 4, `lib/memory/procedural-memory.js`) stores playbooks, workflows, recovery procedures, and implementation methods. Where episodic memory records what happened, procedural memory records how to do things. It is the library of reusable operational knowledge.

### 10.2 Storage

- Storage: Supabase Postgres
- Fields: `memory_id`, `name`, `procedure_type`, `domain`, `description`, `steps[]`, `preconditions`, `postconditions`, `trace_id`, `evidence`, `source`

### 10.3 Operations

- `storeProcedure()` — write a new procedure
- `findProcedure(query, domain)` — retrieve matching procedure
- `recordExecution(procedureId, success)` — update confidence from execution outcome
- `getByDomain(domain)` — all procedures for a domain
- `validate(procedureId)` — mark as validated

### 10.4 Confidence

Procedural memory confidence is derived from execution history. `recordExecution()` updates confidence based on cumulative success and failure counts. A procedure that consistently fails will reduce in confidence. A procedure with a long success history will approach high confidence.

### 10.5 Strategic Memory (Layer 5)

Strategic Memory (`lib/memory/strategic-memory.js`) stores goals, roadmaps, priorities, long-term direction, and constraints.

Fields: `memory_id`, `title`, `strategic_type` (goal | roadmap | priority | direction | constraint | milestone), `content`, `horizon` (immediate | short_term | medium_term | long_term), `priority` (0–100), `parent_id`, `linked_projects`

Operations: `storeStrategicItem()`, `getByHorizon()`, `getByType()`, `validate()`, `updateOutcome()`, `archive()`, `getContextBlock()`

Strategic memory has a hierarchy — items may have `parent_id` references linking them to higher-level goals. Strategic memory participates in context assembly via `getContextBlock()`.

### 10.6 UX Implications for Procedural and Strategic Layers

Procedural memory is primarily internal — users do not normally need to inspect individual procedures. However, when an agent references a procedure to explain why it chose a particular approach, the procedure name and summary should be surfaceable at L2 disclosure.

Strategic memory is the most user-relevant long-term layer. Goals, priorities, milestones — these are things the user explicitly set or implicitly endorsed. A user should be able to review what APEX understands their current strategic priorities to be. This is a PROPOSED UX surface not yet implemented.

---

## 11. Preference Memory

### 11.1 Status: PARTIAL — INHERITED from UX-10

There is no dedicated `preference_memory` table in the production database. Preferences are stored via:

- `lib/memory/founder-memory.js` — founder-level preferences with highest trust
- `lib/memory/adaptation-cycle.js` — behavioural adaptations driven by inferred preferences (weekly cycle)
- `trait-evolution.js` — preference-driven trait changes

### 11.2 Preference vs Memory

Preference is a higher-level abstraction. Preferences inform how other memory layers are weighted and how responses are shaped. Preferences are not raw memories — they are derived from the pattern of memories and explicit founder inputs.

The preference model is:
1. Explicit statements (via founder memory) — highest trust
2. Observed patterns (via adaptation cycle) — medium trust
3. Inferred tendencies (via trait evolution) — lowest trust

### 11.3 UX Implications

Because there is no dedicated preference table, there is no dedicated preference inspection UI surface. Users who want to understand what APEX believes their preferences are must currently rely on general-purpose memory inspection — which does not exist in production.

The full preference UX is defined in UX-10 Personalisation and is not restated here. UX-15 acknowledges the overlap and defers to UX-10 for all preference presentation decisions.

---

## 12. Ownership

### 12.1 Domain Ownership

From `lib/memory/ownership.yaml`:
- **domain:** Memory
- **capability:** Persistent Knowledge Storage and Retrieval
- **runtime:** core
- **criticality:** high
- **owner:** Memory Subsystem
- **entity_id:** DOM-000004
- **consumers:** Intelligence, Registry, Knowledge
- **events_consumed:** DECISION_RECORDED

### 12.2 Access Classes

From `lib/memory/access-controller.js`:

| Class | Permitted Entities | Memory Access |
|-------|--------------------|---------------|
| FOUNDER | (founder context) | Layer 0 (founder memory) — full read/write access |
| SYSTEM | orchestrator, consolidation_engine, civilization_runtime, cron, ministry | Broad write access across applicable layers |
| AGENT | reflector_agent, architect_agent, developer_agent, api_client | Layers 10–11 (lessons/improvements) — read only |
| COUNCIL | cso, cio, cfo, cto, coo, cgo, cro | Context-level read (via Gateway) |

Access is enforced via `ctrl.check(requestingEntity, layer)` inside the Memory Gateway. The `requestingEntity` parameter is passed through every Gateway call.

### 12.3 Access Invariant

Agents cannot read from memory layers outside their permitted set by calling the Memory Gateway directly. The Gateway enforces access class restrictions. This is PRODUCTION ACTIVE via the Access Controller.

### 12.4 No Self-Authorisation via Memory

Agents cannot use memory reads to self-authorise actions. Retrieving a memory record that says "I have permission to do X" does not constitute permission to do X. Permission comes from the governance and approval system (UX-14), not from memory. This is INV-MEMORY-12 (see Section 45).

---

## 13. Domain Scope

### 13.1 Memory Domain Boundaries

Memory does not belong to any single domain — it is a cross-cutting infrastructure layer. Every domain (finance, university, personal, business) produces and consumes memory through the same infrastructure. The domain of a memory item is recorded in the `domain` field where applicable (semantic memory, procedural memory, strategic memory).

Domain scoping affects:
- Retrieval relevance — domain context narrows search results
- Strategic memory grouping — goals and milestones are domain-tagged
- Consolidation prioritisation — consolidation may weight domain-relevant observations higher

Domain scoping does NOT affect:
- Memory governance — all layers use the same governance rules regardless of domain
- Access control — the access class model applies universally
- Deletion semantics — no domain has special deletion permissions

### 13.2 Cross-Domain Memory

Some memory is inherently cross-domain — architectural decisions (Layer 7), system-level patterns (Layer 3 category: pattern), and root-level strategic goals (Layer 5). Cross-domain memory must not be silently scoped to a single domain when retrieved. Cross-domain scope must be explicit in both storage and retrieval.

### 13.3 Integration with UX-10

UX-10 defines domain-specific vocabulary, relevance weighting, and task framing. When memory is surfaced in a domain context, UX-10 governs how labels, summaries, and confidence tiers are phrased for that domain. UX-15 governs the underlying memory architecture that supplies the content.

---

## 14. Provenance

### 14.1 Provenance Fields

Every memory entry must carry provenance information. Provenance is how APEX can explain where a memory came from. Provenance is never fabricated (INV-MEMORY-05).

Production provenance fields by layer:
- Working Memory: `source`, `trace_id`, `task_id`, `session_id`
- Episodic Memory: `source`, `trace_id`, `task_id`, `evidence`
- Semantic Memory: `source`, `trace_id`, `evidence`
- Procedural Memory: `source`, `trace_id`, `evidence`
- Strategic Memory: (parent_id, linked_projects serve as structural provenance)
- Decision Memory: `source`, `trace_id`, `evidence`, `rationale`, `alternatives_considered`
- Knowledge Graph: node and edge creation carries source node/edge reference

### 14.2 Provenance in the Consolidation Pipeline

When raw observations are consolidated into reflections, lessons, and patterns (Layer 10), provenance chains from the original source through each stage of consolidation. The `memory_consolidation_queue` table records `source_type` and `source_id` for every queued item, ensuring the origin is never lost during the consolidation process.

### 14.3 Presenting Provenance to Users

When memory is shown to users, provenance must be accessible at disclosure level L2:
- L0/L1: Show the fact or outcome only
- L2: Show source and date
- L3: Show trace_id, evidence summary, and consolidation history if applicable
- L4: Show full JSON record (debug mode only)

Provenance must never be suppressed entirely. Even at L0, a disclosure affordance must be available that leads to provenance at L2.

---

## 15. Confidence

### 15.1 Confidence Model per Layer

Confidence is not a single number applied uniformly across all memory layers. Each layer has its own confidence model:

| Layer | Confidence Model |
|-------|-----------------|
| Layer 0 — Founder Memory | Highest trust by definition — no explicit numeric field |
| Layer 1 — Working Memory | Default 1.0 (session-fresh; no validation) |
| Layer 2 — Episodic Memory (PG) | Implicit — `success` boolean (no numeric confidence field) |
| Layer 3 — Semantic Memory | Starts 0.5; accumulates via `support_count`, decremented by `contradiction_count` |
| Layer 4 — Procedural Memory | Derived from execution success/failure history via `recordExecution()` |
| Layer 5 — Strategic Memory | Implicit via `priority` (0–100) and `validate()` state |
| Layer 6 — Skill Memory | Formula: `min(0.99, 0.3 + (execCount/50)*0.5 + successRate*0.2)` |
| Layer 7 — Decision Memory | Captured in rationale and outcome quality fields; no single float |
| Layer 8 — Knowledge Graph | Edge confidence via node confidence propagation (getHighConfidenceSubgraph threshold 0.7) |
| Layer 10 — Consolidation | Classified by Importance Engine before storage |
| Layer 11 — Reflexion | Verified via behaviour change confirmation |

### 15.2 Importance Engine Classifications

Before a memory item is written to a long-term layer, the Importance Engine (`lib/memory/importance-engine.js`) classifies it. Classifications:

| Classification | Meaning |
|----------------|---------|
| IGNORE | Do not store — insufficient signal |
| SHORT_TERM | Write to working memory only |
| STORE | Write to appropriate long-term layer |
| CONSOLIDATE | Write and queue for consolidation |
| REFLECT | Write, consolidate, and trigger reflexion |
| ESCALATE | Write and escalate to strategic or founder layer |

The Importance Engine is the gating mechanism that prevents low-value noise from polluting long-term memory layers.

### 15.3 Confidence Invariants

Confidence must never be fabricated (INV-MEMORY-04). If a confidence value is unknown or uncomputable, the system must represent it as unknown — not as 0.5 or any other default that implies a meaningful signal.

Confidence values must be presented to users in human-readable tiers (high/medium/low), not as raw decimal numbers in default views. Raw decimal values are available at L3 disclosure.

### 15.4 Skill Memory Formula

Skill Memory confidence is computed as:

```
confidence = min(0.99, 0.3 + (executionCount / 50) * 0.5 + successRate * 0.2)
```

This formula produces:
- Minimum effective confidence: 0.3 (no executions, 0% success)
- Midpoint at 25 executions, 50% success rate: ~0.55
- Approaches 0.99 with high execution count and high success rate
- Never reaches 1.0 — the formula caps at 0.99 to prevent absolute confidence

The formula is PRODUCTION ACTIVE — OBSERVED in `lib/memory/skill-memory.js`.

---

## 16. Freshness

### 16.1 Freshness by Layer

Freshness refers to the temporal validity of a memory item — whether the information it contains is likely to still be accurate given how much time has passed.

| Layer | Freshness Signal | Freshness Enforcement |
|-------|-----------------|----------------------|
| Layer 1 — Working Memory | `expires_at` field — hard expiry | `clearExpired()` cron |
| Layer 2 — Episodic (PG) | `getRecent(limit=20)` recency ordering | No automatic staleness |
| Layer 2 — Episodic (Vault) | MAX_EPISODES=200 cap + recency scoring | Older episodes pruned at cap |
| Layer 3 — Semantic | `updated_at` equivalent field | No time-based decay (MISSING) |
| Layer 4 — Procedural | Last execution timestamp | No time-based confidence decay |
| Layer 5 — Strategic | Horizon field (immediate/short_term/medium_term/long_term) | Manual archiving |
| Layer 6 — Skill | Rolling execution history | No time-based staleness |
| Layer 7 — Decision | Outcome field updated after resolution | No automatic staleness |
| Layer 8 — Knowledge Graph | Edge/node creation timestamps | No time-based confidence decay |

### 16.2 Missing Freshness Enforcement

Time-based confidence decay is MISSING from semantic memory, procedural memory, skill memory, decision memory, and the knowledge graph. An observation recorded two years ago may carry the same confidence as one recorded yesterday if it has not been contradicted. This is a design gap (see Section 44).

### 16.3 Freshness UX

When surfacing memory to users, freshness context must be shown:
- Items older than 30 days: show relative age ("3 months ago")
- Items older than 1 year: show approximate age ("about 2 years ago")
- Items with no update after the original write: label as "not refreshed"
- Items where freshness enforcement applies (working memory): label as "session only" or "expires in X"

The absence of time-based decay must not be hidden from users. If a memory item is old and has not been updated, the user must be able to see this.

---

## 17. Validation

### 17.1 Validation States

Memory validation is managed by the Memory Governor and the individual layer modules. The authoritative status values are defined in `memory-governor.js`:

- `candidate` — written but not yet validated
- `validated` — confirmed by the validation process
- `deprecated` — no longer authoritative, replaced by more current information or contradicted sufficiently
- `superseded` — explicitly replaced by a named successor entry
- `archived` — removed from active use but retained for history

### 17.2 Validation Operations

Semantic Memory: `validate(memoryId)` — promotes from candidate to validated
Procedural Memory: `validate(procedureId)` — marks a procedure as validated
Strategic Memory: `validate(strategicItemId)` — confirms a strategic item

Validation is currently a manual or system-initiated operation. No automated validation pipeline exists for all layers — validation is layer-specific.

### 17.3 Validation State in UX

Validation state must be disclosed in memory inspection views. Items in `candidate` status must be presented with a clear unverified label. Users must never encounter a `candidate` item presented with the same visual treatment as a `validated` item.

The validation state transition path must be visible in history views: when an item was promoted from candidate to validated, by what process, and on what evidence.

---

## 18. Conflict

### 18.1 Contradiction Handling in Semantic Memory

Semantic Memory has an explicit contradiction mechanism: `contradict(memoryId, evidence)` calls `recordContradiction()`, which decrements confidence and increments `contradiction_count`. A sufficiently contradicted entry can be automatically deprecated.

Contradictions are never silently resolved (INV-MEMORY-10). When a contradiction is recorded, the original entry and the contradicting evidence are both retained in the record. The system does not silently choose one over the other.

### 18.2 Conflict in Other Layers

No other memory layer has an explicit contradiction mechanism matching the semantic memory model. In practice:
- Episodic memory accumulates all outcomes including conflicting ones — conflicts are visible through the history
- Procedural memory confidence degrades with failures, which may represent contradictory evidence about procedure effectiveness
- Decision memory records outcomes which may contradict earlier rationale

### 18.3 Conflict UX

When two semantic memory entries are in contradiction, the user must be able to see both. The UX must present:
- Item A: [fact], confidence: [level], support_count: N
- Item B: [contradicting fact], confidence: [level], contradiction_count: M
- Status of each item (candidate, validated, deprecated)
- Option to flag for human review

Conflict must never be silently hidden from users. If memory is presented without conflict disclosure, the user is receiving a distorted view of what APEX knows.

---

## 19. Retrieval

### 19.1 Retrieval Architecture

All memory retrieval flows through the Memory Gateway (`lib/memory/gateway.js`). The Gateway exposes retrieval functions:
- `getContext(sessionId, requestingEntity)` — assemble full context block from all accessible layers
- `searchMemory(query, options)` — semantic search across layers
- `retrieveLessons(domain)` — retrieve lessons from the reflexion layer
- `retrieveFounderContext()` — retrieve founder-level context (FOUNDER class only)
- `retrievePolicies()` — retrieve constraints and rules from semantic/strategic layers

### 19.2 Vector Search

Embedding-based retrieval is available for layers that have `embedding` fields: semantic memory, episodic memory, skill memory, decision memory, procedural memory, and strategic memory all use `lib/embed.js` for vector generation.

The `langchain-rag.js` module provides hybrid BM25 + pgvector retrieval and requires `RAG_SIDECAR_URL` to be configured. If the sidecar is not configured, it returns 503. This is PRODUCTION ACTIVE when the sidecar is available.

### 19.3 Retrieval Access Control

The `requestingEntity` parameter in Gateway calls controls which layers are accessible. Agents (AGENT class) may only retrieve from Layers 10–11. The FOUNDER class may retrieve from all layers including Layer 0. COUNCIL class retrieves context-level summaries via the Gateway.

Access control failures must produce clear error states, not silent empty results. A retrieval that was denied must not be indistinguishable from a retrieval that returned zero results.

### 19.4 Retrieval Caching

The Gateway applies in-process caching to context retrieval results via `cache.key()`. Context results are cached; knowledge sufficiency checks are never cached (per Gateway implementation). Cache keys must be scoped to the requesting entity and the query to prevent cross-entity cache leakage.

---

## 20. Relevance

### 20.1 Memory Relevance Model

Not all stored memory is equally relevant to a given moment. Memory relevance is determined by multiple factors:

1. **Recency** — more recent memories are generally more relevant (but not always — founding decisions may be old and still maximally relevant)
2. **Domain match** — memories with `domain` matching the current task context are weighted higher
3. **Semantic similarity** — vector distance to the current query/task
4. **Confidence** — higher confidence memories are generally surfaced over lower confidence ones
5. **Layer** — founder memory and strategic memory carry inherent relevance regardless of recency

### 20.2 Consolidation and Relevance

The Consolidation Engine processes raw observations into lessons and patterns. Lessons and patterns that have been consolidated are generally more reusable and relevant than the raw observations they were derived from. The reflexion tracker verifies that consolidated lessons actually influence behaviour — lessons that are retrieved but never influence behaviour may score lower in relevance over time.

### 20.3 Relevance UX

When memory is surfaced to users, relevance should be indicated by position and treatment — not by exposing relevance scores as numbers. Users should understand why a memory was surfaced (because it is relevant to this task, because it is recent, because it is a verified lesson) but should not need to reason about relevance algorithm outputs.

---

## 21. Presentation

### 21.1 Memory Presentation Principles

Memory presentation follows the UX-08 canonical presentation pipeline. Memory items enter the pipeline as content candidates and are subject to the same eight-stage process as all other APEX content. SILENT is a valid outcome — not all memory items require surfacing.

Memory presentation invariants:
1. Memory is never presented as fact without confidence and provenance context accessible
2. Session-scoped memory (Layer 1) is never presented in a way that implies permanence
3. Deprecated or superseded memory is never presented as current
4. Candidate memory is never presented with the same visual weight as validated memory
5. Memory that was not accessible to the requesting entity is never silently omitted — the absence must be notable if the user asks

### 21.2 Visual Treatment by Confidence Tier

| Confidence Tier | Visual Treatment |
|-----------------|-----------------|
| High (≥ 0.8) | No qualifier; standard text weight |
| Medium (0.5–0.79) | Qualifier word ("possibly", "likely"); slightly reduced opacity or secondary colour |
| Low (< 0.5) | Qualifier phrase ("uncertain", "unverified"); visually distinct from high-confidence content |
| Unknown | "Confidence unknown" label; treat as low for display purposes |

### 21.3 Status Visual Treatment

| Status | Visual Treatment |
|--------|-----------------|
| candidate | Unverified badge; no high-confidence styling |
| validated | No qualifier needed; may show "verified" badge in L2 |
| deprecated | Strikethrough or greyed treatment; only shown in history/audit context |
| superseded | Link to successor; shown in history context |
| archived | Not shown in default views; accessible via explicit history view |

---

## 22. Progressive Disclosure

### 22.1 Disclosure Levels for Memory

Memory items follow the UX-05 progressive disclosure model (L0–L4). Default presentation is L0/L1. Full detail is L3/L4 (debug/admin).

| Level | Memory Content Shown |
|-------|---------------------|
| L0 | Outcome summary or fact text only. No metadata. |
| L1 | Outcome summary + status badge (validated/candidate) + age |
| L2 | + Source, evidence summary, confidence tier |
| L3 | + Trace ID, full evidence, support_count, contradiction_count, consolidation chain |
| L4 | Full raw JSON record. Debug only. |

### 22.2 Layer-Specific Disclosure Defaults

| Layer | Default Level | Rationale |
|-------|--------------|-----------|
| Layer 1 — Working Memory | L3 (advanced only) | Transient; not appropriate for general view |
| Layer 2 — Episodic | L1 | History is user-legible; keep it readable |
| Layer 3 — Semantic | L1 with status | Users care about what APEX "knows" |
| Layer 4 — Procedural | L2 | Users may want to review procedure steps |
| Layer 5 — Strategic | L1 | Goals are user-facing; keep readable |
| Layer 6 — Skill | L1 | Competency level is user-relevant |
| Layer 7 — Decision | L2 | Rationale should be accessible |
| Layer 8 — Knowledge Graph | L2 | Node/relationship context needed |
| Layers 10–13 | L3 (system/admin) | Pipeline layers; not appropriate for general users |

### 22.3 Expansion Affordance

Every memory item shown at L0 or L1 must carry an expansion affordance (a detail link, an info icon, or an expand control). The user must never be presented with a memory item that has no path to deeper detail if they want it.

---

## 23. Inspection

### 23.1 Current State of Inspection

Memory inspection in the production dashboard is MISSING. The `dashboard.html` frontend has zero memory UI elements. There is no production interface for a user to view, search, or browse any memory layer.

The only production memory surface is the admin route `GET /api/memory/stats`, which returns row counts by layer. This is an operational metric, not a user inspection surface.

### 23.2 Required Inspection Surfaces

The following inspection capabilities are PROPOSED and MISSING in production:

1. **Memory overview panel** — total memory count by layer, last update time per layer, health indicators
2. **Episode history** — browseable list of recent episodic records with outcome summary, date, task
3. **Semantic memory browser** — searchable list of semantic entries with status, confidence, domain
4. **Strategic goals view** — current strategic items by horizon and type
5. **Skill competency view** — skill names, domains, success rates, confidence levels
6. **Decision log** — recent decisions with type, rationale, outcome
7. **Knowledge graph explorer** — node and relationship visualisation (minimum: table view of nodes by type)
8. **Lesson library** — consolidated lessons from the reflexion layer
9. **Consolidation queue status** — pending items, last processed batch, error count

### 23.3 Inspection UX Requirements

When inspection is implemented:
- Default view must be L1 for all user-facing layers
- Layer selector must be available for multi-layer browsing
- Search must span semantic, episodic, and lesson layers at minimum
- Status filter must allow filtering by candidate/validated/deprecated/superseded
- Domain filter must allow scoping to a single domain
- Date range filter must be available for episodic and decision layers
- Export must not be available without explicit user action and confirmation

### 23.4 What Must Not Be Shown

The following must not appear in inspection views by default:
- Raw embedding vectors (`embedding` field)
- Internal `trace_id` values at L0/L1 (accessible at L3)
- Working memory entries outside of debug mode (L3+)
- Ruflo SQLite contents — these are SEPARATE SYSTEM data and must never appear in APEX memory inspection views

---

## 24. Correction

### 24.1 Current State of Correction

No user-facing memory correction route exists in production. There is no `/api` route for user-initiated memory correction. This is MISSING.

### 24.2 Correction Semantics

Memory correction in APEX is not a simple overwrite. Because memory items are linked to provenance, trace IDs, and consolidation chains, correction must follow a defined protocol:

1. User flags a memory item as incorrect
2. System creates a contradiction record against the item (using `contradict()` for semantic memory)
3. If the user supplies a correction, the correction is submitted as a new candidate entry with source = "user_correction"
4. The original item's confidence decrements and status may move to deprecated
5. The correction enters the validation pipeline at candidate status
6. The link between the original and the correction is preserved for audit

### 24.3 Correction UX Requirements

When correction is implemented:
- A "flag as incorrect" affordance must be available on every surfaced memory item at L1+
- The correction workflow must show: current item, reason for flagging, optional user-supplied correction
- The user must receive confirmation that the correction was received and its current status
- The user must not be able to directly overwrite memory without passing through the validation pipeline
- Corrections must be attributed to the user with a timestamp in the provenance chain

### 24.4 Correction is Not Deletion

Flagging a memory item as incorrect does not delete it. It records a contradiction and initiates a review. The original item remains in the record until formally deprecated. Users must be informed of this distinction before they submit a correction.

---

## 25. Deletion / Forgetting

### 25.1 Current Deletion State

User-initiated deletion of memory is almost entirely absent from production. The following deletion capabilities exist:

| Deletion Type | Mechanism | Status |
|---------------|-----------|--------|
| Working memory by session | `clear(sessionId)` | PRODUCTION ACTIVE |
| Working memory expired | `clearExpired()` cron | PRODUCTION ACTIVE |
| Consolidation queue old items | `purgeOld(daysOld=7)` | PRODUCTION ACTIVE |
| Semantic/Episodic/Procedural/Strategic user delete | None found | MISSING |
| User-initiated delete route | No `/api` route found | MISSING |

### 25.2 Deletion Semantics Must Not Be Overstated

UX copy must never imply that users can freely delete APEX memory when they cannot. The MISSING state of user-initiated deletion is a production fact that must be disclosed, not hidden (INV-MEMORY-08).

If a user asks APEX to "forget" something, the honest response is that APEX can record a deprecation request but cannot guarantee physical deletion of all references in all memory layers. The consolidation chain, the reflexion tracker, and the knowledge graph all may retain derived entries from the original memory even after the original is deprecated.

### 25.3 Right to Forget — Design Intent

The right to forget is a PROPOSED capability. When implemented, it must:

1. Accept a user request to deprecate or delete a specific memory item
2. Identify all downstream derived entries in the consolidation chain
3. Produce a summary of what will and will not be removed
4. Require explicit user confirmation before any irreversible action
5. Record the deletion request and its outcome in the governance log (not in memory)
6. Not silently suppress entries — suppressed entries must be trackable in audit

### 25.4 Working Memory Deletion UX

Working memory expiry is not a user action — it is automatic. The UX implication is that users should understand that session-scoped memory vanishes automatically. This should be disclosed in onboarding and in any context where users might expect session memory to persist.

---

## 26. Retention

### 26.1 Retention by Layer

| Layer | Retention Policy | Mechanism |
|-------|-----------------|-----------|
| Layer 1 — Working Memory | 3600s default TTL | Hard expiry via `expires_at` |
| Layer 2 — Episodic (Vault) | 200 episodes maximum | Recency-scored pruning at cap |
| Layer 2 — Episodic (PG) | No retention cap observed | Unlimited growth (OPEN) |
| Layer 3 — Semantic | No retention cap observed | Status-based deprecation only |
| Layers 4–8 | No retention cap observed | Manual archiving |
| Consolidation Queue | 7 days | `purgeOld(daysOld=7)` |

### 26.2 Missing Retention Policy

No automatic retention cap exists for the primary episodic store (Supabase Postgres), semantic memory, procedural memory, strategic memory, skill memory, decision memory, or the knowledge graph. These layers will grow unboundedly unless manually managed. This is a MISSING engineering concern (see Section 44).

### 26.3 Retention UX

Users should not be required to understand the technical retention policy for each layer. UX copy should communicate retention in plain terms:
- "Session memory — lasts until the session ends"
- "Task memory — kept for the full history"
- "Knowledge — kept until you update or remove it"
- "Lessons — kept indefinitely"

---

## 27. Consolidation

### 27.1 Consolidation Engine Architecture

The Consolidation Engine (Layer 10, `lib/memory/consolidation-engine.js`) implements the pipeline:

```
Raw Observations → Reflections → Lessons → Patterns → Knowledge
```

All items enter the pipeline via the `memory_consolidation_queue` table with stage: `raw`.

Fields: `queue_id`, `source_type`, `source_id`, `content`, `priority`, `consolidation_stage` (raw)

### 27.2 Operations

- `submit(sourceType, sourceId, content, priority)` — add item to queue
- `process(batchSize=10)` — process next batch (called by cron hourly)
- `getStats()` — queue depth, processed count, error count
- `purgeOld(daysOld=7)` — remove processed items older than 7 days

### 27.3 Classification

The Consolidation Engine uses Claude Haiku for classification of raw observations during the `process()` step. This introduces:
- An API dependency on Claude (Haiku model)
- A per-batch API cost
- A potential latency between observation and consolidated lesson

Maximum attempts per item: MAX_ATTEMPTS=3. Items that fail three consolidation attempts are marked as failed and must be reviewed manually.

### 27.4 Provenance Preservation

Consolidation must preserve provenance chains (INV-MEMORY-09). Every consolidated lesson or pattern must carry the `source_type` and `source_id` of the observation it was derived from. The chain must be reconstructable: knowledge item → pattern → lesson → reflection → raw observation → originating task/episode.

### 27.5 Consolidation UX

The consolidation pipeline is a backend process. Users do not normally need to interact with it. However:
- The queue depth and processing status should be visible in the admin memory stats view
- Consolidated lessons should be surfaceable in a "lessons learned" view within the memory inspection UI
- Failed consolidation items (MAX_ATTEMPTS exhausted) should appear in an admin alert view

---

## 28. Decay

### 28.1 Production Decay Mechanisms

Memory decay is the reduction of confidence, visibility, or retention of memory items over time.

| Layer | Decay Mechanism | Status |
|-------|----------------|--------|
| Layer 1 — Working Memory | TTL-based hard expiry (3600s default) | PRODUCTION ACTIVE |
| Layer 2 — Episodic (Vault) | MAX_EPISODES=200 cap; recency scoring prunes old episodes | PRODUCTION ACTIVE |
| Layer 2 — Episodic (PG) | No time-based decay | MISSING |
| Layer 3 — Semantic | Confidence decrements on contradiction; no time-based decay | MISSING (time-based) |
| Layer 4 — Procedural | No time-based decay | MISSING |
| Layer 5 — Strategic | Horizon field; no automatic decay on past-horizon items | MISSING |
| Layer 6 — Skill | No time-based decay | MISSING |
| Layer 7 — Decision | No time-based decay | MISSING |
| Layer 8 — Knowledge Graph | No time-based decay | MISSING |
| Consolidation Queue | purgeOld(daysOld=7) for processed items | PRODUCTION ACTIVE |

### 28.2 Semantic Decay Gap

The most significant decay gap is in semantic memory. A fact recorded at confidence 0.8 two years ago with no subsequent support or contradiction will still carry confidence 0.8 today. There is no mechanism for confidence to decay with time in the absence of reinforcing or contradicting evidence. This may produce false confidence in stale information.

Time-based confidence decay for semantic memory is PROPOSED as a future engineering item.

### 28.3 Decay as Design Intent

When time-based decay is implemented, it should follow these principles:
- Decay must be logarithmic or slow — not linear. A knowledge item that was highly supported should not collapse to zero confidence quickly.
- Decay must be transparent — the user must be able to see "this item has not been updated for 18 months; confidence may be overstated"
- Decay must not operate silently — decays should be logged in the memory governor lifecycle events
- Decay thresholds that trigger status changes must be configurable and documented
- Working memory TTL is the reference implementation for decay — it works correctly and serves as the model

### 28.4 Decay UX

Even without automatic decay, the UX must surface temporal freshness:
- Show age on all memory items
- Show "not refreshed" indicator on items unchanged for > 90 days
- Provide a "refresh check" option that prompts APEX to verify the memory item is still accurate
- Do not present old memories with the same visual weight as fresh ones

---

## 29. Knowledge Integration

### 29.1 Memory → Knowledge Path

Memory feeds knowledge through the consolidation pipeline. The path is:

1. Raw observation written to episodic memory or consolidation queue
2. Consolidation Engine promotes to reflection → lesson → pattern
3. Lessons may be promoted to semantic memory entries with status `candidate`
4. Validation via `validate()` promotes candidate to `validated`
5. Validated semantic entries are the primary input to the UX-11 knowledge surface

### 29.2 Boundary Invariant

Memory and knowledge are distinct systems with distinct governance (INV-MEMORY-01). The knowledge surface (UX-11) consumes outputs from memory. The memory system is not responsible for knowledge display — that is UX-11's domain. The memory system is responsible for producing accurate, well-provenanced, correctly-statused inputs to the knowledge layer.

### 29.3 Knowledge Graph as Layer 8

The Knowledge Graph (Layer 8, `lib/memory/knowledge-graph.js`) lives in the memory system architecturally, but its outputs serve the knowledge surface. It maintains relationships between memory entities:

Node types (12): Goal, Project, Task, Episode, Lesson, Skill, Decision, Procedure, Incident, Knowledge, Certification, Pattern

Relationship types (11): CAUSED, GENERATED, SUPPORTS, IMPROVES, DERIVED_FROM, SOLVES, CONTRIBUTES_TO, SUPERSEDES, VALIDATES, CONTRADICTS, RELATES_TO

High-confidence subgraph: `getHighConfidenceSubgraph(minConf=0.7)` — returns only nodes and edges above the 0.7 confidence threshold.

Synced to Graphify as a secondary visualisation target.

---

## 30. Intelligence Integration

### 30.1 Memory as Intelligence Input

Intelligence (UX-12) consumes memory context assembled by the Memory Gateway. The Intelligence layer does not read from memory layers directly — it receives assembled context blocks from `gateway.getContext()`.

### 30.2 Context Assembly

`buildContextSummary()` in Working Memory and `getContextBlock()` in Strategic Memory produce structured context blocks. The Gateway assembles these into a unified context for the intelligence pipeline. The assembled context includes:
- Active task and goal from working memory
- Relevant lessons from the reflexion layer
- Relevant semantic facts from the domain
- Strategic priorities and constraints

### 30.3 Intelligence Does Not Modify Memory

The Intelligence layer is a consumer, not a writer, of memory. Intelligence scoring, model selection, and reasoning outputs do not write back to memory directly. If intelligence outputs should be recorded, they enter through the standard memory write path via the Importance Engine gate.

---

## 31. Agent Integration

### 31.1 Agent Memory Access

Agents (class AGENT in access-controller.js) may read from Layers 10–11 (lessons and improvements). They do not have direct access to Layer 0 (founder memory), the semantic memory table, or the strategic memory table. Access is enforced via `ctrl.check(requestingEntity, layer)` in the Gateway.

### 31.2 Agent Memory Writes

Agents may contribute to memory through the standard write path via `gateway.storeMemory()`. All writes pass through the Importance Engine and the sanitizer before storage. Agents cannot bypass these gates.

### 31.3 No Self-Authorisation via Memory

Agents cannot use memory to grant themselves authority. A memory record that states "agent X may perform action Y" does not constitute authorisation for action Y. Authorisation flows through UX-14 governance (INV-MEMORY-12).

### 31.4 Reflexion and Agent Behaviour

The Reflexion Tracker (Layer 11) is designed to prove that lessons actually change agent behaviour. The pipeline:

1. Agent executes a task → episodic record written
2. Lesson is consolidated from episodic observation
3. Reflexion record created (status: pending)
4. On next execution, `recordRetrieval()` called when lesson is retrieved
5. `recordInfluence()` called when lesson changes decision
6. `verifyBehaviorChange()` called to confirm the change occurred
7. Reflexion record moves from pending to verified

This closed loop is the mechanism by which memory can be said to have influenced agent behaviour. Without it, memory is just storage.

---

## 32. Actions Integration

### 32.1 Memory and Action Boundaries

Memory records governance-relevant events but is not a governance mechanism. Governance records created at action execution time (UX-14 — `lib/governance.js`) are separate from memory layer writes. They may inform memory entries but are not identical to them.

### 32.2 Decision Memory and Actions

When an agent makes an architectural or operational decision (Layer 7 — Decision Memory), the decision record includes: decision type, context, alternatives considered, rationale, and outcome. This record is available for retrospective review but does not authorise any action.

### 32.3 Action Outcomes Write to Episodic Memory

After action execution, the orchestrator writes episodic records. The episodic record captures the outcome of the action — success or failure, outcome summary, complexity. This creates a feedback loop: actions produce outcomes, outcomes produce episodic memories, episodic memories feed consolidation, consolidation produces lessons, lessons inform future actions.

---

## 33. Governance Integration

### 33.1 Memory and Governance are Separate Systems

Memory cannot bypass governance (INV-MEMORY-03). Governance records exist in `lib/governance.js` and the `governance_records` table (UX-14). Memory exists in the memory subsystem. They operate in parallel. A memory entry stating that a governance rule was waived does not waive the governance rule.

### 33.2 Memory Governor Is Not a Governance System

The `memory-governor.js` module manages memory lifecycle (ID generation, status transitions). Despite the name, it is a memory management utility, not a constitutional governance authority. Governance authority is held by the systems defined in UX-14 and future UX-16.

### 33.3 Access Control Enforcement

The Memory Access Controller (`lib/memory/access-controller.js`) enforces layer-level access. Entity classes (SYSTEM, AGENT, FOUNDER, COUNCIL) are defined in the controller. These access rules are part of the memory governance model and must not be bypassed by any engineering change without explicit authority.

---

## 34. Voice Integration

### 34.1 Memory in Voice Context

Voice interactions (UX-07) produce conversation turns that are written to episodic memory fire-and-forget in `chat.js`. Each conversation turn — including voice-initiated turns — contributes to the episodic record.

### 34.2 Voice Memory Recall

When a user asks APEX via voice "do you remember when..." or "what did we discuss about...", the response draws on episodic and semantic memory through the Gateway. The voice response must:
- Indicate the age of the recalled memory
- Indicate confidence level (verbally, not numerically)
- Offer to show more detail (surface a card or visual) if available
- Acknowledge uncertainty if the memory is old or low-confidence

### 34.3 Voice Memory Management

Users must be able to manage memory via voice at a basic level:
- "Forget that" — triggers correction/deprecation workflow
- "Remember that" — triggers explicit write to semantic memory via the standard path
- "What do you remember about X" — triggers a memory search and summary

These voice commands must route through the same write/correction paths as UI-initiated memory actions. No voice-specific memory bypass is permitted.

---

## 35. Proactive Integration

### 35.1 Memory-Triggered Proactive Communication

The Proactive Communication system (UX-09) may be triggered by memory events. Cases include:
- A lesson was consolidated that is relevant to the current task
- A strategic goal is approaching its horizon without progress
- A recurring failure pattern has been detected in episodic memory
- A semantic memory item was deprecated that the user relied on

All proactive triggers from memory events enter the UX-08 pipeline and are subject to the SILENT outcome.

### 35.2 Memory Reminders

Memory may surface proactively as a reminder — "Last time you worked on this, you noted X." This requires:
- The memory item to be relevant (domain, recency, confidence)
- The user's proactive preference to permit this type of surface
- The item to clear the UX-08 pipeline

Memory reminders must not be presented as certainties. They must carry appropriate confidence framing.

---

## 36. Context Integration

### 36.1 Memory as Context Source

The UX-08 context assembly stage uses memory as a primary input. When a user initiates a task or conversation, the Context stage:
1. Calls `gateway.getContext(sessionId, requestingEntity)`
2. Receives the assembled context block
3. Injects it into the intelligence pipeline
4. The intelligence pipeline uses it to frame its response

### 36.2 Context vs Memory

Context is not stored — it is assembled from memory at retrieval time. A context block that was assembled for a session at 14:00 does not persist as a stored context entry. It was assembled from stored memory entries. This distinction matters for debugging: if the context was wrong, the problem is in the memory entries, not in a "wrong context entry."

### 36.3 Working Memory as Context Component

Working memory (`buildContextSummary()`) is the session-local component of context. It contributes the most immediately relevant state: what task is active, what goal is being pursued, what plan is in effect. This is always the highest-freshness component of the assembled context.

---

## 37. Domain Integration

### 37.1 Domain-Tagged Memory

Semantic memory, procedural memory, and strategic memory all carry a `domain` field. Knowledge Graph nodes carry domain context via their linked entities. When context is assembled for a domain-specific task, the Gateway scopes retrieval to domain-relevant entries.

### 37.2 Domain Memory Profiles

Each domain accumulates its own memory profile over time:
- Finance domain: decisions about financial tasks, procedures for reconciliation and reporting, lessons from failed analyses
- University domain: episodes of research tasks, semantic facts about courses and subjects, skills related to academic work
- Personal domain: strategic goals, adaptation preferences, routines

These domain memory profiles are not separate systems — they are filter views over the same unified memory architecture.

### 37.3 Cross-Domain Contamination Risk

If domain filtering is not implemented correctly, retrieval may surface cross-domain content in an inappropriate context. A finance-domain procedure must not be surfaced in a personal-domain context unless explicitly relevant. Domain filtering must be enforced at the retrieval level, not only at the presentation level.

---

## 38. Personalisation Integration

### 38.1 Memory's Role in Personalisation

Personalisation (UX-10 Personalisation) is driven by:
1. Explicit founder preferences (Layer 0)
2. Observed behavioural patterns (adaptation cycle — Layer 13)
3. Trait evolution derived from memory patterns (`trait-evolution.js`)

Memory is the substrate that makes personalisation possible. Without episodic memory of how the user has behaved in the past, without semantic memory of stated preferences, and without the adaptation cycle synthesising those signals, personalisation would revert to defaults on every session.

### 38.2 Personalisation Does Not Override Memory Integrity

Personalisation adjustments affect how memory is presented and weighted — not whether it is accurate. Presenting a high-confidence validated fact with different framing for different users is a valid personalisation. Suppressing a high-confidence validated fact because the user's preference profile suggests they would not like it is not a valid personalisation. Memory integrity is preserved across personalisation.

### 38.3 Preference Memory Boundary

There is no `preference_memory` table. All preference tracking flows through Layer 0 (founder context), Layer 13 (adaptation cycle), and the trait evolution module. UX-15 defers all preference UX decisions to UX-10 Personalisation.

---

## 39. Knowledge-Gap Integration

### 39.1 Memory and Knowledge Gaps

The Knowledge-Gap Programme (KG-01 through KG-08) identified nine gap types managed by `knowledge-gap-engine.js`. Memory contributes to gap resolution but does not own the gap engine. The relationship:
- Semantic memory stores validated facts
- A validated semantic fact may resolve a knowledge gap (GAP TYPE: MISSING, resolved by new evidence)
- A contradiction in semantic memory may create a knowledge gap (GAP TYPE: CONFLICTING)

### 39.2 Consolidation and Gap Resolution

When the Consolidation Engine produces a new lesson or pattern, that lesson may close an existing knowledge gap. The knowledge system (UX-11) is responsible for evaluating gap closure — the memory system is responsible for producing the information that enables closure. These responsibilities must not be merged.

### 39.3 Memory Cannot Self-Resolve Gaps

Memory items cannot declare themselves as resolving a knowledge gap. Gap resolution is managed by `knowledge-resolution-engine.js` (UX-11). A semantic memory entry with status `validated` is an input to the gap resolution process — not a gap resolution act in itself.

---

## 40. Prototype

### 40.1 Memory Inspection Panel Prototype

The following prototype specification describes the minimum viable memory inspection UI. This is PROPOSED — no implementation exists in production.

**Panel: Memory Overview**

Location: Dashboard, accessible from main navigation as "Memory" section
Default state: Collapsed to a single row showing total memory count and last activity timestamp
Expanded state (L1): Layer summary cards showing entry count, last update, status breakdown

**Layer Summary Card (L1):**
```
[Layer Name]          [Entry Count]     [Last Updated]
Episodic Memory       1,247 episodes    2 days ago
[Status: 98% success / 2% failed]      [View →]
```

**Episode Detail View (L2):**
```
Task: [objective text]
Outcome: Success / Failed
Date: [relative date]
Domain: [domain tag]
Source: [agent name]
[Show trace] [Show evidence]
```

### 40.2 Memory Search Prototype

**Panel: Memory Search**

A search bar at L0 that queries semantic memory, episodic memory, and lesson library simultaneously. Results grouped by layer. Confidence tier shown alongside each result. Status badge for all non-validated items.

### 40.3 Memory Correction Prototype

**Inline correction affordance:**
A flag icon on every displayed memory item. Clicking opens a drawer with:
- Current item content
- Reason selector (wrong fact / outdated / incomplete / other)
- Optional user-supplied correction text
- Submit button → confirmation that correction was received
- Disclosure: "This item will remain visible until review is complete"

### 40.4 Prototype Fidelity

These prototypes are wire-frame specifications, not visual designs. All visual treatment must follow UX-05 design tokens and component library. No new tokens or components are created for memory surfaces.

---

## 41. Scenarios

The following verification scenarios cover the full memory system. Each scenario includes: trigger, expected behaviour, and the invariant it validates.

**V-MEMORY-01**
Trigger: User asks "do you remember what we discussed last Tuesday?"
Expected: APEX queries episodic memory via Gateway, retrieves relevant episodes from that date, presents at L1 with age and outcome. If no episodes found, states clearly that no record was found for that date.
Validates: INV-MEMORY-19 (retrieval accuracy), INV-MEMORY-05 (no fabricated provenance)

**V-MEMORY-02**
Trigger: User asks "what do you know about my finance goals?"
Expected: APEX queries strategic memory filtered to finance domain, returns goal entries at L1. Status of each goal is visible. Date of last update is visible.
Validates: INV-MEMORY-21 (domain scoping), INV-MEMORY-16 (freshness disclosure)

**V-MEMORY-03**
Trigger: APEX surfaces a memory item with candidate status in a response
Expected: The item is labelled as unverified or under review. It is not presented with the same visual weight as a validated item.
Validates: INV-MEMORY-07 (status disclosure), INV-MEMORY-17 (no suppression of validation state)

**V-MEMORY-04**
Trigger: User asks APEX to "forget" a specific fact
Expected: APEX initiates the deprecation workflow. APEX explains that the item will be marked deprecated but not physically deleted from all records. Confirmation is required before any action.
Validates: INV-MEMORY-08 (deletion semantics not overstated), INV-MEMORY-25 (no silent deletion)

**V-MEMORY-05**
Trigger: Two semantic memory entries are in contradiction
Expected: Both items are shown in any inspection view that surfaces them. Neither is hidden. Confidence of both is shown. User is offered a flag-for-review affordance.
Validates: INV-MEMORY-10 (contradiction not silently resolved), INV-MEMORY-18 (conflict disclosure)

**V-MEMORY-06**
Trigger: Session ends
Expected: Working memory entries for that session expire at their TTL. They are not visible in the next session's context. No permanent memory is deleted.
Validates: INV-MEMORY-06 (working memory is transient), INV-MEMORY-22 (session boundary enforced)

**V-MEMORY-07**
Trigger: Agent (AGENT class) attempts to read from Layer 0 (founder memory)
Expected: Access is denied by the Access Controller via ctrl.check(). The agent receives an access denied error, not empty results.
Validates: INV-MEMORY-11 (access class enforcement), INV-MEMORY-23 (access denial is explicit)

**V-MEMORY-08**
Trigger: Memory item is displayed at L0
Expected: An expansion affordance is present. Clicking it reveals L2 provenance (source, evidence summary, date).
Validates: INV-MEMORY-14 (provenance accessible), INV-MEMORY-24 (progressive disclosure available)

**V-MEMORY-09**
Trigger: User views an episodic memory item from 3 years ago
Expected: Age is shown ("about 3 years ago"). If the item has not been refreshed since original write, a "not refreshed" indicator is shown. Confidence is shown at the appropriate tier.
Validates: INV-MEMORY-16 (freshness disclosure), INV-MEMORY-15 (age shown)

**V-MEMORY-10**
Trigger: Consolidation Engine processes a batch of raw observations
Expected: Provenance chains are preserved. Each output item (lesson, pattern) carries source_type and source_id from the original observation. Chain is reconstructable.
Validates: INV-MEMORY-09 (consolidation preserves provenance)

**V-MEMORY-11**
Trigger: A memory item is deprecated
Expected: The item does not appear in default inspection views. It appears in history/audit context with a deprecation label. It does not appear as current information in any response.
Validates: INV-MEMORY-20 (deprecated items not surfaced as current)

**V-MEMORY-12**
Trigger: APEX is asked about a skill it has not performed before
Expected: Skill Memory returns no entry or an entry with minimum confidence (0.3 — zero executions baseline). APEX does not fabricate a confidence value.
Validates: INV-MEMORY-04 (confidence not fabricated), INV-MEMORY-26 (skill competency honest)

**V-MEMORY-13**
Trigger: User asks "what lessons has APEX learned from my tasks?"
Expected: APEX queries the reflexion tracker and consolidation layer for lessons with verified behaviour change. Returns a readable summary. Lessons without verification are labelled as "pending verification."
Validates: INV-MEMORY-27 (reflexion status disclosed), INV-MEMORY-28 (lessons presented accurately)

**V-MEMORY-14**
Trigger: Ruflo SQLite data is present at .swarm/memory.db
Expected: This data is never shown in any APEX memory inspection view. APEX memory UI does not query the Ruflo SQLite store. If asked, APEX states clearly that this is a separate system.
Validates: INV-MEMORY-13 (Ruflo SQLite is separate), INV-MEMORY-29 (no cross-system contamination)

**V-MEMORY-15**
Trigger: A memory write fails in the fire-and-forget path (chat.js setImmediate)
Expected: The failure is logged server-side. The user response is not blocked. The failure is not silently swallowed — it appears in server logs and memory stats where applicable.
Validates: INV-MEMORY-30 (write failures logged)

**V-MEMORY-16**
Trigger: Memory correction is submitted by user
Expected: The correction is recorded as a new candidate entry with source = "user_correction". The original item's confidence decrements. Both items are linked. The user receives confirmation of the correction receipt and its pending status.
Validates: INV-MEMORY-31 (correction workflow integrity), INV-MEMORY-08 (deletion semantics clear)

**V-MEMORY-17**
Trigger: Intelligence pipeline assembles context for a task
Expected: Context is assembled via gateway.getContext() and includes only layers accessible to the requesting entity. The assembled context is not stored as a new memory entry.
Validates: INV-MEMORY-32 (context is assembled not stored), INV-MEMORY-11 (access enforced)

**V-MEMORY-18**
Trigger: A semantic memory item has contradiction_count > support_count
Expected: The item's confidence is below 0.5 and it is visually treated as low-confidence or uncertain. It may be in deprecated status if contradiction threshold was crossed.
Validates: INV-MEMORY-33 (contradiction drives confidence), INV-MEMORY-10 (contradictions not silently resolved)

**V-MEMORY-19**
Trigger: User asks memory inspection view to show all Working Memory
Expected: Working memory is only accessible in debug mode (L3 disclosure). Default inspection views do not show working memory. If shown in debug mode, it is clearly labelled as transient session state.
Validates: INV-MEMORY-06 (working memory transient status clear), INV-MEMORY-22 (session boundary)

**V-MEMORY-20**
Trigger: Skill memory is queried for "chat" skill after multiple conversation turns
Expected: Returns skill entry with execution_count reflecting actual conversations, success_rate near 1.0, confidence computed by the documented formula min(0.99, 0.3 + (execCount/50)*0.5 + successRate*0.2).
Validates: INV-MEMORY-26 (skill formula correct), INV-MEMORY-34 (execution tracking active)

**V-MEMORY-21**
Trigger: APEX references a strategic goal in a response
Expected: The goal is identified by title and horizon. The age and last-update of the strategic item is accessible at L2. If the goal has passed its intended horizon without resolution, a freshness indicator signals this.
Validates: INV-MEMORY-35 (strategic memory surfaced accurately), INV-MEMORY-16 (freshness)

**V-MEMORY-22**
Trigger: User asks "is this still accurate?" about a displayed memory item
Expected: APEX initiates a refresh check — it queries whether any contradicting evidence has been received since the item was written. If no new information is available, APEX reports that the item has not been updated since [date] and cannot confirm current accuracy without new evidence.
Validates: INV-MEMORY-04 (confidence not fabricated), INV-MEMORY-36 (refresh check honest)

**V-MEMORY-23**
Trigger: A voice command "remember that" is issued
Expected: The current conversation context is submitted as a candidate semantic memory entry via the standard write path. The Importance Engine classifies it. If classification is STORE or above, it is written. User receives verbal confirmation with status.
Validates: INV-MEMORY-37 (voice writes use standard path), INV-MEMORY-19 (write path integrity)

**V-MEMORY-24**
Trigger: Agent attempts to read semantic memory (not in AGENT class permitted layers)
Expected: Access is denied. The agent receives explicit denial, not empty results. The denial is logged.
Validates: INV-MEMORY-11 (access control enforced), INV-MEMORY-23 (denial is explicit)

**V-MEMORY-25**
Trigger: Memory item presented in a domain context that does not match its domain field
Expected: Either the item is filtered out by domain scoping, or if cross-domain relevance is determined, the item carries a cross-domain label. It is not presented as if it is domain-native content.
Validates: INV-MEMORY-38 (domain scoping enforced)

**V-MEMORY-26**
Trigger: Consolidation Engine batch fails (MAX_ATTEMPTS=3 exhausted for an item)
Expected: The item is marked as failed in the queue. An alert appears in the admin memory stats view. The item is not silently lost.
Validates: INV-MEMORY-30 (failures logged), INV-MEMORY-09 (provenance preserved even in failure)

**V-MEMORY-27**
Trigger: Knowledge Graph edge is created between an Episode and a Lesson
Expected: The edge type (GENERATED or DERIVED_FROM) is recorded with source_id and target_id. The edge is queryable via getNeighbors(). The confidence of the edge reflects the confidence of the underlying episode.
Validates: INV-MEMORY-09 (provenance chains), INV-MEMORY-04 (confidence accurate)

**V-MEMORY-28**
Trigger: Memory stats route GET /api/memory/stats is called
Expected: Returns row counts for all memory layers including working_memory, semantic_memory, skill_memory, knowledge_graph_nodes, knowledge_graph_edges, reflexion_records, and the consolidation queue.
Validates: INV-MEMORY-02 (memory system observable), OBSERVED production route confirmed.

**V-MEMORY-29**
Trigger: User views the memory inspection panel default view
Expected: Default view shows layer summary cards at L1 — entry count, last update, status breakdown. No raw IDs, embedding vectors, or internal trace identifiers are visible at default level.
Validates: INV-MEMORY-14 (provenance accessible at right level), INV-MEMORY-24 (progressive disclosure)

**V-MEMORY-30**
Trigger: APEX is asked to recall a decision made three months ago
Expected: Decision memory is queried. If found: returns decision summary, decision type, rationale, and outcome. Date shown. Source shown. If not found: states clearly that no decision record matches the query.
Validates: INV-MEMORY-05 (no fabricated provenance), INV-MEMORY-19 (honest retrieval)

**V-MEMORY-31**
Trigger: Adaptation cycle runs its weekly strategic cycle
Expected: New adaptation entries are written to Layer 13 with source and date. Old adaptations are not silently overwritten — they are superseded with a reference to the new entry. The chain of adaptations is preserved.
Validates: INV-MEMORY-09 (provenance preserved), INV-MEMORY-10 (not silently resolved)

**V-MEMORY-32**
Trigger: User-initiated "forget everything about X" request
Expected: APEX identifies all memory items related to X across layers. Produces a list of what will be deprecated and what cannot be deleted (e.g., governance records, consolidated knowledge). User must confirm. After confirmation, deprecations are applied and logged.
Validates: INV-MEMORY-08 (deletion semantics not overstated), INV-MEMORY-25 (no silent action)

**V-MEMORY-33**
Trigger: Semantic memory entry has confidence below 0.3 and is candidate status
Expected: The item is not surfaced in default views. If shown in an advanced view, it carries a low-confidence / unverified visual treatment. It must not appear in any response as an established fact.
Validates: INV-MEMORY-04 (confidence not fabricated), INV-MEMORY-03 (memory cannot grant authority)

**V-MEMORY-34**
Trigger: Memory Gateway getContext() is called with a SYSTEM entity
Expected: Context includes all layers accessible to SYSTEM class. Founder memory (Layer 0) is NOT included — that requires FOUNDER class. Access controller is consulted before each layer read.
Validates: INV-MEMORY-11 (access class boundaries), INV-MEMORY-12 (no self-authorisation)

**V-MEMORY-35**
Trigger: A procedural memory entry is executed successfully 50 times
Expected: Confidence approaches the formula ceiling. `recordExecution(procedureId, true)` has been called 50 times. Confidence is computed correctly from the accumulated history, not inflated beyond the formula output.
Validates: INV-MEMORY-04 (confidence not fabricated), INV-MEMORY-34 (execution tracking)

**V-MEMORY-36**
Trigger: APEX is asked "is there anything in memory I should know about for this task?"
Expected: APEX queries relevant lessons (reflexion layer), relevant semantic facts (domain-scoped), and recent episodic outcomes for similar tasks. Presents at L1. Does not surface unverified candidate items without labelling.
Validates: INV-MEMORY-07 (status disclosed), INV-MEMORY-16 (freshness shown)

**V-MEMORY-37**
Trigger: Memory inspection panel receives a search query
Expected: Query is sent to semantic memory `search()`, episodic memory `findSimilar()`, and reflexion tracker lesson query simultaneously. Results are returned grouped by layer with confidence and status visible.
Validates: INV-MEMORY-19 (retrieval cross-layer), INV-MEMORY-24 (disclosure levels available)

**V-MEMORY-38**
Trigger: A memory item's confidence crosses below the low-confidence threshold (< 0.5)
Expected: The item's visual treatment updates to low-confidence styling on next view. No user notification is required unless the item was previously shown as high-confidence in an active context.
Validates: INV-MEMORY-33 (confidence drives display), INV-MEMORY-04 (no fabrication)

**V-MEMORY-39**
Trigger: Consolidation queue has items with MAX_ATTEMPTS=3 exhausted waiting
Expected: Admin stats view shows failed item count. No automatic silent retry occurs beyond the three attempts. A manual review mechanism is available in the admin view.
Validates: INV-MEMORY-30 (failures logged), INV-MEMORY-09 (provenance preserved)

**V-MEMORY-40**
Trigger: User asks "how many memories does APEX have?"
Expected: APEX queries GET /api/memory/stats and returns a human-readable count by layer. Example: "I have 1,247 episodes, 380 validated facts, 62 lessons, and 15 strategic goals."
Validates: INV-MEMORY-02 (memory system observable by user), production route used correctly.

**V-MEMORY-41**
Trigger: A decision memory entry records "decision: proceed without approval"
Expected: The entry is stored as a historical record. It does not constitute retroactive authorisation. The governance system (UX-14) is not affected by the memory entry.
Validates: INV-MEMORY-03 (memory cannot bypass governance), INV-MEMORY-12 (no self-authorisation)

**V-MEMORY-42**
Trigger: User views memory inspection after a session where many tasks ran
Expected: Episodic memory shows the tasks from that session ordered by recency. Each entry shows objective, outcome, date. Skill memory shows updated confidence for skills used. Decision entries show any decisions made during tasks.
Validates: INV-MEMORY-02 (memory observable), write consistency across layers.

**V-MEMORY-43**
Trigger: Episodic embedding write fails asynchronously after episode creation
Expected: The episode record exists without the embedding field populated. Semantic search for that episode returns no result but direct ID lookup returns the record. The failure is logged.
Validates: INV-MEMORY-30 (async write failure logged), consistency behaviour documented.

**V-MEMORY-44**
Trigger: Layer 9 is referenced in code or documentation
Expected: APEX reports that Layer 9 is not present in the production memory index. The numbering gap (8 → 10) is an observed production fact, not an error to be corrected.
Validates: INV-MEMORY-02 (system state accurately represented), no fabrication of absent layers.

**V-MEMORY-45**
Trigger: A Reflexion record verifyBehaviorChange() is called for a lesson that was retrieved but did not influence any decision
Expected: The record remains unverified. The getApplicationStats() reflects the unretrieved lesson. The lesson is available for future retrieval but is not promoted to "verified influence" status without the evidence.
Validates: INV-MEMORY-27 (reflexion honesty), INV-MEMORY-04 (no fabricated verification)

---

## 42. Accessibility

### 42.1 Memory Inspection Accessibility Requirements

All memory inspection UI must meet WCAG 2.1 AA standards. Specific requirements for memory surfaces:

**Colour and Confidence:**
Confidence tiers must not be communicated by colour alone. Every confidence tier indicator must combine colour with either a text label (High/Medium/Low) or an icon with an accessible label. Users with colour vision deficiency must be able to identify confidence tiers.

**Status Badges:**
Status badges (validated/candidate/deprecated/superseded) must use `aria-label` attributes that communicate the full status, not just an icon or colour indicator. A red badge must also carry `aria-label="deprecated"`.

**Progressive Disclosure Controls:**
Expansion affordances must be keyboard-accessible and must carry descriptive `aria-label` attributes. "Expand memory detail" is acceptable. "+" alone is not.

**Memory Search:**
The search input must carry a visible label. Search results must be presented in a list structure with appropriate ARIA roles. Empty results must produce an accessible message ("No memory items found for this query") rather than a blank container.

**Table Views:**
Memory summary tables must use proper `<thead>`, `<th scope="col">`, and `<td>` structure. All tables must have a caption or `aria-label`.

**Temporal Information:**
Relative dates ("3 days ago") must also be available as absolute dates in a tooltip or `aria-label` for users who need precise date information.

### 42.2 Voice Accessibility

Voice interactions with memory must produce responses that do not rely on visual metaphors. "The item is highlighted in amber" is not an accessible voice response. "The item is marked as uncertain — I'm not fully confident in this information" is acceptable.

---

## 43. Security / Privacy Boundary

### 43.1 Memory Access Control Enforcement

The Memory Access Controller (`lib/memory/access-controller.js`) is the primary enforcement mechanism. Entity class assignments are defined in the controller and cannot be overridden by memory content. A memory entry that claims to grant SYSTEM class to an AGENT entity is not valid — class assignments are configured in code, not stored in memory.

### 43.2 Cross-Entity Cache Risk

The Memory Gateway caches context results with `cache.key()`. If cache keys are not sufficiently scoped (session + entity + query), a cached result from one entity may be served to another. Cache key construction must include `requestingEntity` as a mandatory component. This is a SECURITY REQUIREMENT.

### 43.3 Memory Does Not Store Secrets

Memory layers must not be used to store credentials, API keys, passwords, or authentication tokens. The Memory Sanitizer (`lib/memory/sanitizer.js`) must enforce this. Any write containing credential-pattern content must be rejected by the sanitizer.

### 43.4 Embedding Privacy

The embedding field (pgvector) stores a numerical representation of memory content. While embeddings are not directly human-readable, they can potentially be reversed or used to infer content. Embeddings must not be exposed via any API route without authentication. The admin `GET /api/memory/stats` route must not return embedding data.

### 43.5 Right to Erasure

The absence of a user delete route is a security and privacy concern as well as a UX gap. Until a delete route is implemented, users cannot exercise a right to erasure. This must be documented in terms of service and disclosed to users. No memory system may claim to support right to erasure until the delete route is implemented and tested.

### 43.6 Founder Memory Isolation

Layer 0 (Founder Memory) is readable only by FOUNDER class entities. No engineering change may extend FOUNDER class membership without explicit authority. Founder memory content must never appear in any view accessible to AGENT class entities.

### 43.7 Production Memory in Transit

All Supabase connections use TLS. Memory data in transit is encrypted. Memory data at rest is subject to Supabase's storage encryption. No custom additional encryption is implemented at the application layer — this is OBSERVED.

---

## 44. Production Gaps

The following gaps are identified from the production audit. Each gap is classified by severity: CRITICAL (blocks safe operation or user trust), HIGH (significant functionality missing), MEDIUM (functionality degraded but system operable), LOW (polish or enhancement).

### Gap 1 — Frontend Memory UI [CRITICAL]

**Finding:** `dashboard.html` has zero memory UI elements. No memory browsing, inspection, search, correction, or deletion surface exists.
**Impact:** Users cannot inspect what APEX has stored about them, correct errors, or manage their memory. This is a fundamental transparency gap.
**Required:** Minimum: Episode history view, semantic memory browser, memory search. See Section 23.2.
**Status:** MISSING — PROPOSED

### Gap 2 — User Memory Delete Route [CRITICAL]

**Finding:** No `/api` route for user-initiated memory deletion of any kind (semantic, episodic, procedural, strategic). Only session-scoped clearing and cron-based expiry exist.
**Impact:** Users cannot exercise meaningful control over stored information. Right-to-erasure claims cannot be honoured.
**Required:** `DELETE /api/memory/:layerId/:memoryId` with deprecation workflow, user confirmation, and audit log.
**Status:** MISSING — PROPOSED

### Gap 3 — User Memory Correction Route [HIGH]

**Finding:** No `/api` route for user-initiated correction of memory items. The contradiction mechanism exists in code (`contradict()`) but is not exposed via any API or UI.
**Impact:** Users cannot flag incorrect memory. Memory errors persist indefinitely without user ability to correct.
**Required:** `POST /api/memory/:memoryId/correct` with contradiction recording, candidate replacement, and confirmation workflow.
**Status:** MISSING — PROPOSED

### Gap 4 — Time-Based Confidence Decay [HIGH]

**Finding:** No time-based confidence decay for any long-term memory layer (semantic, procedural, skill, decision, knowledge graph).
**Impact:** Stale information may carry the same confidence as current information. False confidence in outdated facts.
**Required:** Decay schedule for long-term layers. Logarithmic decay with configurable parameters. Freshness indicator in UX.
**Status:** MISSING — PROPOSED

### Gap 5 — Episodic Memory Retention Cap [MEDIUM]

**Finding:** Primary episodic store (Supabase Postgres) has no retention cap. May grow unboundedly.
**Impact:** Storage cost growth. Retrieval performance degradation at scale.
**Required:** Retention policy with configurable cap and archiving mechanism.
**Status:** MISSING — OPEN (cap value not yet decided)

### Gap 6 — Semantic Memory Retention Cap [MEDIUM]

**Finding:** No retention cap for semantic memory, procedural memory, strategic memory, skill memory, or decision memory.
**Impact:** Same as Gap 5 — unbounded growth.
**Required:** Retention policy per layer.
**Status:** MISSING — OPEN

### Gap 7 — Episodic Numeric Confidence [MEDIUM]

**Finding:** Episodic memory has no explicit numeric confidence field. Only the `success` boolean is available.
**Impact:** Cannot compute confidence gradients for episodic retrieval. Near-success or partial outcomes are not representable.
**Required:** Numeric confidence field in episodic memory with values derived from outcome quality.
**Status:** MISSING — PROPOSED

### Gap 8 — Access Denial Explicit Response [MEDIUM]

**Finding:** It is not confirmed whether access denial in the Gateway produces explicit error responses vs silent empty results. Access controller enforces `ctrl.check()` but the error surface is not audited.
**Impact:** Agents that are denied access may receive empty results that are indistinguishable from genuine empty queries.
**Required:** Access denial must produce an explicit error, not silent empty results.
**Status:** OPEN — needs engineering verification

### Gap 9 — RAG Sidecar Dependency [LOW]

**Finding:** `langchain-rag.js` returns 503 when `RAG_SIDECAR_URL` is not configured. The sidecar availability state is not surfaced to users.
**Impact:** Memory search degrades silently when the sidecar is unavailable.
**Required:** Explicit availability check on memory search; user-visible degraded state indicator.
**Status:** PARTIAL — PROPOSED

### Gap 10 — Layer 9 Documentation [LOW]

**Finding:** Layer 9 is absent from the production memory index. No module, table, or purpose has been identified.
**Impact:** Numbering gap creates documentation confusion.
**Required:** Decision: document the gap explicitly (as this document does) or renumber layers.
**Status:** OPEN

---

## 45. Invariants

The following invariants are binding on all APEX memory engineering work. Deviations require explicit written revision of this document and approval from the relevant authority.

**INV-MEMORY-01** — Memory is not knowledge. Knowledge is not memory. These are distinct systems. Memory layers and knowledge system must not be merged, conflated in code, or presented interchangeably to users.

**INV-MEMORY-02** — The memory system must be observable. At minimum, `GET /api/memory/stats` must return accurate layer counts at all times. No memory layer may be written without contributing to the stats count.

**INV-MEMORY-03** — Memory cannot bypass governance. No memory entry, regardless of content or source, overrides the governance and approval system (UX-14). Memory does not grant authority.

**INV-MEMORY-04** — Confidence is never fabricated. If a confidence value cannot be computed for a memory item, the system must represent it as unknown. No default confidence value may be presented as a meaningful signal when it is merely a placeholder.

**INV-MEMORY-05** — Provenance is never fabricated. Every memory item must carry a source field. If the source is unknown, it must be recorded as unknown, not as a plausible-sounding fabrication.

**INV-MEMORY-06** — Working memory is session-scoped and transient. It must never be presented to users as permanent APEX memory. Its expiry must be disclosed in any context where a user might expect persistence.

**INV-MEMORY-07** — Status disclosure is mandatory. A `candidate` item must never be presented with the visual treatment of a `validated` item. Status must be accessible at L1 for every displayed memory item.

**INV-MEMORY-08** — Deletion semantics are never overstated. APEX must never claim it has "forgotten" something when only a deprecation has been applied. The distinction between deprecation and physical deletion must be disclosed to users.

**INV-MEMORY-09** — Consolidation preserves provenance. Every consolidated output (lesson, pattern, knowledge) must carry the source_type and source_id of the raw observation it derived from. The provenance chain must be reconstructable.

**INV-MEMORY-10** — Contradiction is never silently resolved. When two memory items contradict each other, both must be retained in the record. The system must not silently choose one over the other. Users must be able to see both.

**INV-MEMORY-11** — Access class boundaries are enforced at the Gateway. AGENT class entities may read only from Layers 10–11. FOUNDER class access to Layer 0 is exclusive. No engineering change may weaken these boundaries without explicit authority.

**INV-MEMORY-12** — Agents cannot self-authorise through memory. A memory record stating that an agent has permission to perform an action does not constitute authorisation. Authorisation flows through the governance system only.

**INV-MEMORY-13** — Ruflo SQLite is a separate system. `.swarm/memory.db` is not part of APEX core memory. It must never appear in any APEX memory inspection view, count, or query. Users must not be misled about the relationship between Ruflo storage and APEX memory.

**INV-MEMORY-14** — Provenance must be accessible. Every displayed memory item must have an accessible path to its provenance (source, date, evidence) at L2 progressive disclosure. No memory item may be shown without any provenance access path.

**INV-MEMORY-15** — Age must be shown. Every displayed memory item must show its age (relative date) at L1 or above. Items must not be presented as timeless information when they were written at a specific point in time.

**INV-MEMORY-16** — Freshness indicators must be honest. Items that have not been updated for extended periods must carry a "not refreshed" or "may be stale" indicator. No item older than 90 days without update may be presented without a temporal qualifier.

**INV-MEMORY-17** — Validation state must never be suppressed. An item's validation state (candidate/validated/deprecated/superseded) must always be accessible. It must not be hidden in any presentation context.

**INV-MEMORY-18** — Conflict must be disclosed. When a memory search or retrieval returns items in contradiction, the conflict must be surfaced to the user, not silently resolved to the highest-confidence item.

**INV-MEMORY-19** — Retrieval must be honest. A failed retrieval (no results found) must produce a clear "no results" response. It must never produce a fabricated response claiming results were found.

**INV-MEMORY-20** — Deprecated items must not be surfaced as current. Items with status `deprecated` or `superseded` must not appear in default views as current information. They may appear in history or audit views with appropriate labelling.

**INV-MEMORY-21** — Domain scoping must be enforced at retrieval. Cross-domain memory contamination in retrieval results must be prevented. Domain-tagged items must only surface in matching domain contexts unless explicitly relevant.

**INV-MEMORY-22** — Session boundaries must be enforced. Working memory from Session A must not be visible in Session B. The `clear(sessionId)` and `clearExpired()` mechanisms must operate correctly at session boundaries.

**INV-MEMORY-23** — Access denial must be explicit. When access is denied by the Access Controller, the denying entity must receive an explicit access denied response, not empty results. Silent failure is not acceptable.

**INV-MEMORY-24** — Progressive disclosure must be available. Every L0 display of a memory item must carry an expansion affordance to L2. Users must never reach a dead end when seeking more detail.

**INV-MEMORY-25** — No silent deletion or modification. Memory items must not be deleted or modified without explicit action and audit log entry. Background jobs that delete items (e.g., clearExpired, purgeOld) are exceptions only for explicitly time-bound data.

**INV-MEMORY-26** — Skill competency formula must be applied correctly. The documented formula `min(0.99, 0.3 + (execCount/50)*0.5 + successRate*0.2)` must be applied consistently. No ad hoc override of skill confidence is permitted.

**INV-MEMORY-27** — Reflexion status must be disclosed. Lessons that have not been verified by `verifyBehaviorChange()` must be labelled as "pending verification" when surfaced to users. Unverified lessons must not be presented as proven influences on behaviour.

**INV-MEMORY-28** — Lessons must be presented accurately. The lesson library must reflect the consolidation state. Lessons that were consolidated but subsequently contradicted or deprecated must not appear as active lessons without status disclosure.

**INV-MEMORY-29** — No cross-system contamination. APEX memory views must not display Ruflo, Graphify (beyond structured knowledge graph sync), or other tooling data as if it were APEX memory. System boundaries must be enforced in UI.

**INV-MEMORY-30** — Write failures must be logged. Fire-and-forget memory writes (chat.js setImmediate) that fail must produce server-side log entries. Failures must contribute to operational monitoring. Silent swallowing of write failures is not acceptable.

**INV-MEMORY-31** — Correction workflow integrity must be maintained. User corrections must follow the documented protocol: contradiction recording, candidate entry creation, link preservation. Corrections must not overwrite original entries directly.

**INV-MEMORY-32** — Context is assembled, not stored. Context blocks assembled by the Gateway for task or intelligence use are not stored as new memory entries. They are ephemeral assemblies from stored memory.

**INV-MEMORY-33** — Contradiction drives confidence correctly. As `contradiction_count` increases and `support_count` lags, confidence must decrease in the semantic memory model. The relationship between contradiction and confidence must be monotonically negative.

**INV-MEMORY-34** — Execution tracking must be active. `skill-memory.recordExecution()` is called in the chat route after every turn. `episodic-memory.storeEpisode()` is called after every task completion. These tracking calls must not be removed or disabled.

**INV-MEMORY-35** — Strategic memory must reflect user intent. Strategic items in the strategic memory layer must derive from user-stated goals, user-endorsed plans, or explicitly accepted APEX recommendations. Strategic items must not be silently written from agent inference alone.

**INV-MEMORY-36** — Refresh checks must be honest. When a user asks whether a memory item is still accurate, APEX must report the date of last update and the presence or absence of contradicting evidence. APEX must not fabricate a currency confirmation.

**INV-MEMORY-37** — Voice writes use standard path. Voice commands to remember or forget something must route through the standard memory write/correction path including the Importance Engine and sanitizer. No voice-specific bypass of the write gate is permitted.

**INV-MEMORY-38** — Domain scoping enforced in retrieval. Memory retrieval calls that accept a domain parameter must enforce that parameter at query time, not only at display time. Cross-domain contamination must be prevented before results are returned.

---

## 46. Tests

### 46.1 Unit Test Requirements

The following unit test coverage is required for the memory subsystem:

**working-memory.js:**
- `set()` creates entry with correct TTL
- `get()` returns null for expired entries
- `getAll()` filters expired entries
- `extend()` adds to existing TTL without duplicating
- `clear()` removes all session entries
- `clearExpired()` removes only expired entries (not active)
- `buildContextSummary()` assembles correct context from multiple types

**semantic-memory.js:**
- `storeFact()` creates entry at confidence 0.5, status candidate
- `addSupport()` increases confidence monotonically
- `contradict()` decreases confidence
- `validate()` moves status from candidate to validated
- `supersede()` moves status to superseded and sets successor link
- `findDuplicate()` returns existing entry for duplicate fact

**skill-memory.js:**
- Confidence formula `min(0.99, 0.3 + (execCount/50)*0.5 + successRate*0.2)` correct at execCount=0, 25, 50, 100
- `recordExecution(true)` increases success_rate
- `recordExecution(false)` increases failure_rate
- Confidence caps at 0.99 with max executions and 100% success rate

**memory-governor.js:**
- ID generation produces correct prefix for each layer
- Status transitions enforce valid paths (candidate → validated, not candidate → archived directly)

**access-controller.js:**
- AGENT class denied access to Layer 0
- AGENT class permitted access to Layer 10
- FOUNDER class permitted access to Layer 0
- Denial produces explicit error, not empty result

**consolidation-engine.js:**
- `submit()` creates queue entry with source_type and source_id
- `purgeOld()` removes only entries older than threshold
- MAX_ATTEMPTS=3 is enforced

### 46.2 Integration Test Requirements

- Full write-read cycle for each layer via Memory Gateway
- Context assembly via `gateway.getContext()` includes correct layers for each entity class
- Caching: second call to `getContext()` uses cached result; `searchMemory()` with knowledge sufficiency does not
- `clearExpired()` integration test: create expired entry, run clearExpired, confirm deletion
- Fire-and-forget episodic write in chat route: confirm episode appears in getRecent() after write

### 46.3 Regression Test Requirements

- `GET /api/memory/stats` returns all layer counts correctly after writes to each layer
- Session isolation: working memory written in Session A is not returned by `get()` in Session B
- Access isolation: agent entity cannot read Layer 0 fact via Gateway
- Confidence is not fabricated: a new skill entry starts at ≥ 0.3 and does not jump to 0.99 without execution history

---

## 47. Deviations

No deviations from this document have been authorised at time of issue.

Any future deviation from the invariants stated in Section 45 must be recorded here with:
- Invariant number(s) affected
- Nature of the deviation
- Justification
- Authorising party
- Date of authorisation
- Reference to the engineering change that implements the deviation

This section must not remain blank in production — if a deviation is ever approved, it must be recorded here within 24 hours of authorisation.

---

## 48. Open Questions

The following questions remain unresolved at time of issue. Each must be resolved before the relevant implementation work begins.

**OQ-MEMORY-01** — Layer 9 absence: Should the memory layer numbering be retained as-is (8 → 10 gap documented) or renumbered? Renumbering would require updating all ID prefixes and references. Decision required from Memory Subsystem owner.

**OQ-MEMORY-02** — Episodic PG retention cap: What is the correct retention cap for the primary episodic store? 1,000 episodes? 10,000? No cap with archiving? Decision requires input from the founder on acceptable storage cost and the engineering team on performance characteristics.

**OQ-MEMORY-03** — Time-based confidence decay rate: If decay is implemented for semantic memory, what is the correct decay curve? What is the half-life of an unsupported semantic fact? What confidence threshold triggers automatic deprecation? Requires both engineering and product input.

**OQ-MEMORY-04** — Access denial response format: Does the current Gateway implementation return explicit errors on access denial, or silent empty results? Engineering verification required before Gap 8 is closed.

**OQ-MEMORY-05** — Episodic numeric confidence: What fields would a numeric confidence for episodic memory be derived from? Complexity? Source agent trust? Outcome quality beyond success/failure binary? Requires product decision before schema change.

**OQ-MEMORY-06** — Reflexion verification trigger: `verifyBehaviorChange()` must be called somewhere to close the reflexion loop. What is the trigger — cron job, explicit agent call, or automatic after each task completion? Not confirmed from source audit.

**OQ-MEMORY-07** — User memory interface scope: What is the minimum viable memory inspection interface for the first release? All of Section 23.2 is the full requirement; the minimum release scope needs product prioritisation.

**OQ-MEMORY-08** — Right to erasure timeline: When will the user delete route (Gap 2) be implemented? This has legal and trust implications that require timeline commitment from the product owner.

**OQ-MEMORY-09** — Memory export: Should users be able to export their memory (episodic history, semantic facts, decisions)? If yes, what format and what scope? Not yet designed.

**OQ-MEMORY-10** — Cross-session strategic memory: Strategic memory items may reference previous sessions. How does strategic memory participate in session resumption? The `buildContextSummary()` from working memory is session-specific — but strategic context may need to be injected from Layer 5 at session start. Clarification of the injection path is needed.

---

## 49. Production Impact

### 49.1 Current Production State

The memory subsystem is PRODUCTION ACTIVE across 13 layers plus all support modules. Memory is being written in production on every chat turn (episodic and skill layers, fire-and-forget), on every task completion (episodic, decision layers), and hourly by the consolidation cron. The system is operational but has no user-facing inspection, correction, or deletion interface.

### 49.2 Immediate Engineering Priorities

Based on the production gap analysis:

1. **CRITICAL — Memory Inspection UI:** The absence of any memory UI is the highest-priority gap. Users have no transparency into what APEX stores. A minimum viable memory panel (episode history + semantic browser + search) should be the first implementation target.

2. **CRITICAL — User Delete Route:** The absence of a user delete route creates a legal and trust exposure. This should follow immediately after inspection UI.

3. **HIGH — User Correction Route:** The contradiction mechanism exists in code. Exposing it via API and UI is the next priority.

4. **HIGH — Time-based Decay:** Design and implement decay for semantic memory as the first time-decay candidate.

### 49.3 What Must Not Be Changed Without This Document

The following production behaviours are documented as invariants and must not be changed without revising this document:

- The Importance Engine classification system (IGNORE | SHORT_TERM | STORE | CONSOLIDATE | REFLECT | ESCALATE)
- The Skill Memory confidence formula
- The semantic memory status lifecycle (candidate → validated → deprecated/superseded)
- The Memory Governor ID prefixes
- The Access Controller entity class assignments
- The Memory Gateway as the sole authoritative access path

### 49.4 Safe Engineering Envelope

Engineers may:
- Add new UI views that surface existing memory data through existing routes
- Add new API routes for user-initiated delete and correction that call existing layer operations
- Extend the Memory Stats route to return more granular information
- Implement decay by adding a cron that calls existing `contradict()` or status-update operations

Engineers must not:
- Modify memory layer schemas without updating this document
- Bypass the Gateway to read from memory tables directly in new code
- Change access class assignments without authority
- Write to Layer 0 (Founder Memory) from any non-FOUNDER class path
- Connect the Ruflo SQLite store to any APEX memory query or UI

---

## 50. Final Certification

This document — UX-15 MEMORY — is certified as the canonical reference for the APEX AI OS memory architecture and memory user experience as of August 2026.

Certification basis:
- Direct codebase audit of all 14 production memory modules
- Verification of all Supabase table schemas
- Verification of all production routes
- Review of ownership.yaml
- Review of access-controller.js entity class definitions
- Audit of dashboard.html confirming zero memory UI elements
- Comparison with predecessor documents UX-11 through UX-14

All evidence tagged OBSERVED has been confirmed in production source files. No capability has been presented as OBSERVED without direct file confirmation. All PROPOSED capabilities are clearly labelled as design intent not yet implemented.

This document supersedes all prior informal descriptions of the APEX memory architecture. In the event of contradiction between this document and any other APEX document, this document is authoritative for memory-related concerns.

---

## 51. Hard Stop

**UX-15 is the canonical memory document for the APEX AI OS UX Programme.**

The following boundaries are absolute and must not be violated:

1. **No second memory architecture.** UX-15 defines the single authoritative memory architecture. No parallel memory system, alternative memory store, or competing memory layer model may be created without formally superseding this document.

2. **No UX-16 content in this document.** UX-16 covers the constitutional and system architecture UX. That document has not been issued. No UX-16 scope has been introduced into UX-15.

3. **No reopening of resolved UX phases.** The Knowledge-Gap Programme (KG-01 through KG-08) is complete. UX-11 through UX-14 are complete. UX-15 does not reopen, revise, or contradict those completed documents. References to prior phases in this document are consumptive only — UX-15 consumes their outputs, does not redesign them.

4. **Ruflo SQLite is a separate system.** This boundary has been stated in invariants, in the production audit table, and throughout this document. It is stated here a final time: `.swarm/memory.db` is not APEX memory. It must not be surfaced in any APEX memory UI, counted in any APEX memory stat, or queried by any APEX memory route.

5. **Memory does not grant authority.** This is stated in INV-MEMORY-03 and INV-MEMORY-12 and is restated here as a hard stop: no memory entry, regardless of content, source, or confidence, constitutes authorisation for any action. Authority flows through the governance system. Memory is a record. It is not a permission system.

6. **Confidence and provenance must never be fabricated.** INV-MEMORY-04 and INV-MEMORY-05 are not aspirational — they are absolute requirements. Any code path that produces a fabricated confidence value or fabricated source is a defect that must be treated as a critical bug.

7. **This document is not complete until all 51 sections are published.** All 51 sections are present in this version. No section may be removed, truncated, or replaced with a placeholder in any published version of UX-15.

---

*End of UX-15 — MEMORY*
*APEX AI OS UX Programme — August 2026*
*Document ID: UX-15 | Series: Interface Canonical Documents | Status: CANONICAL*
