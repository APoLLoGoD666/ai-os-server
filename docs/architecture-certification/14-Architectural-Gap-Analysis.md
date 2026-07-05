# 14 — Architectural Gap Analysis

**Date:** 2026-07-02  
**Phase:** 2.3 Part 2 — Pre-Phase-3 Blueprint Assessment  
**Role:** Independent Chief Architecture Auditor  
**Mode:** Analysis only. No documents produced here. No code changed.

---

## 1. Executive Summary

APEX Civilisation possesses two constitutions that together cover **operational governance** comprehensively. The Founder sovereignty model, safety systems, kill-switch procedures, authority limits, auditability requirements, and amendment process are all defined and ratified.

What the constitutions do not cover — and what no existing document covers — is **architectural governance**: the canonical definitions of what things *are*, how they relate, where facts live, how identity flows, what trust means, and how failure is handled by design. The certification audit (Phase 2.3) confirmed this directly: 20 of 25 architectural invariants have gaps, 10 of 14 critical failure modes are permissive, 16 structural contradictions exist, and source-of-truth fragmentation affects 8 of 10 fact domains. These are not bugs. They are the natural consequence of building without an architectural ground truth.

Phase 3 cannot begin without that ground truth. The purpose of this analysis is to define exactly what documents must be authored to constitute it.

**Finding:** 12 foundational architectural documents are required before Phase 3. None exist. All 12 must be produced before any canonical system design is specified.

---

## 2. Operational Governance Already Covered

The following are **covered** by the existing constitutions and must be treated as immutable constraints in all subsequent documents.

### From `constitution-v1.md` (Operational Constitution)

| Article | Governance Covered |
|---------|-------------------|
| Art. 1 — Founder Sovereignty | Absolute authority hierarchy; escalation right; non-delegation of kill switch |
| Art. 2 — Safety Systems | 4-level kill switch (soft halt / hard halt / emergency shutdown / constitutional lockdown); fail-closed default; circuit breaker; $2 per-call financial limit |
| Art. 3 — Evidence & Auditability | Immutable evidence chain; no silent failures; full traceability; governance score ≥ 60/100 required |
| Art. 4 — Self-Modification Limits | Rate limits on self-modification; reversibility requirement; prohibition on concealing capabilities |
| Art. 5 — Data & Privacy | Data handling obligations |
| Art. 6 — Authority Limits | Council budget cap < $500/month; Ministry cross-domain actions require Council approval; Agents limited to assigned stage only |
| Art. 7 — Constitutional Enforcement | Constitution Monitor on every pipeline; 5-step violation response; Slack alert + PushNotification to Founder within 5 minutes |
| Art. 8 — Amendment Process | Founder-only ratification; CRO + CLO review required |

### From `Scripts/CONSTITUTION.md` (Architectural Principles)

| Article | Governance Covered |
|---------|-------------------|
| Art. 1 — One Source of Truth | Each fact has exactly one authoritative source; all others are projections |
| Art. 2 — Everything Earns Its Place | admission_rules table governs module admission; weekly audit; 30-day decommission |
| Art. 3 — Events Not Polling | Canonical event envelope required; idempotency key; content hash; entity references |
| Art. 4 — Idempotent By Default | DB-level idempotency key; real transaction for state+outbox pair; errors asserted not swallowed |
| Art. 5 — Generic Engines, Specific Configs | Entities, agents, and scores are config rows, not bespoke code |
| Art. 6 — Human Override Absolute | Hold/staged/auto at every layer; uncertainty escalates upward |

### What is Derivable from the Constitutions

The constitutions establish the *principles* and *rules*. They do not establish:

- What entities the system recognises
- How identity is represented and flows
- What trust levels exist and what evidence is required to cross them
- Where any given fact is the authoritative source
- What the canonical memory types are and their schemas
- How events are structured, routed, and consumed
- What failure modes are permissible at each layer
- What constitutes a complete audit record for each subsystem
- How agents are structured, lifecycle-governed, and terminated
- What database tables must exist and what invariants they enforce

These are the gaps.

---

## 3. Architectural Governance Currently Missing

The certification audit produced the following structural findings that cannot be resolved by applying the existing constitutions — they require new foundational documents.

### 3.1 Entity Identity Gap

There is no canonical definition of what an entity is. `lib/kernel.js` attaches `req.identity` and `req.ownership`, but both are defined ad hoc. `ENTITIES` in `lib/executive/executive-council.js` is a runtime array, not a governed registry. Two goal systems exist with no shared identity concept. Agents, tasks, entities, ministries, and the Founder are all referenced across the system but have no common identity schema.

**Risk:** Any design in Phase 3 that references "an entity" will be interpreted differently by every subsystem that implements it.

### 3.2 Source-of-Truth Fragmentation

The architectural constitution requires one source of truth per fact. The certification found:

| Domain | Authoritative Source | Problem |
|--------|---------------------|---------|
| Goals | 2 systems (goal-graph + goal-tracker) | No sync, no designated authority |
| Memory | 5+ write paths | Partial sync only |
| Health State | 4 representations | None synchronized |
| Knowledge | 3 stores (Supabase, GraphNexus, Obsidian) | None synchronized |
| Strategic Objectives | 2 (in-memory, goal-graph) | None synchronized |

No document exists that assigns canonical authority to each fact domain. The principle is stated; the assignments are not.

### 3.3 Trust Boundary Specification Gap

Eight trust boundaries were identified and classified. None are fully specified as formal contracts. What is the required evidence to cross each boundary? What happens when evidence is missing? These are policy questions the constitutions do not resolve. The current implementation answers them inconsistently — boundary 3 (kernelChain) has 4 gates, of which Gate 4 is structurally open and Gate 3 is fail-open on error.

### 3.4 Failure Mode Policy Gap

The constitutions establish fail-closed as the default (Art. 2 of constitution-v1.md). The implementation has 10 permissive failure modes vs 4 restrictive. There is no document that specifies, for each subsystem, whether fail-open or fail-closed is the *intended* design. Without this, Phase 3 cannot determine which failure modes are bugs vs deliberate choices.

### 3.5 Memory Architecture Gap

Five distinct memory layers exist: semantic, episodic, procedural, decision, working. Three storage backends: Supabase, filesystem JSON, Obsidian vault. Multiple write paths bypass the gateway. No document specifies: what each memory type stores, what its schema is, which backend is authoritative, what access controls apply, and what its lifecycle is. The memory-governor names imply quota enforcement that does not exist.

### 3.6 Observability and Auditability Gap

Art. 3 of constitution-v1.md requires immutable evidence chain, no silent failures, and full traceability. The certification confirmed:
- governance.js `_w()` fails silently (all writes fire-and-forget)
- reflexion-tracker produces null decision links (audit links permanently broken)
- post-response hooks are fire-and-forget (audit records best-effort)
- event-consumer swallows Slack notification failures

No document specifies *what a valid audit record is*, *which operations must produce one*, and *what constitutes a silent failure*. Without this specification, every implementation makes its own judgment.

### 3.7 Agent Lifecycle Gap

The agent system has at minimum: planning, approval, execution, completion, and failure states. AUTONOMY_LEVEL governs approval skipping. The 8-type step allowlist governs execution. But no document defines: what stages exist, what transitions are permitted, what data must be produced at each stage, and what happens when an agent is terminated mid-execution. The execution-verifier is advisory only; it is not a lifecycle gate.

### 3.8 Database Schema Gap

No document specifies the canonical tables, their schemas, their constraints, or the invariants they enforce. The certification found: no confirmed transactions, multiple clients bypassing the gateway, RLS status unknown. Phase 3 cannot specify new tables without knowing what the authoritative schema design rules are.

### 3.9 Runtime Execution Model Gap

The request pipeline is defined in code (civilization-kernel 7 phases, kernelChain 4 gates) but not in any specification document. Phase 3 changes to the pipeline have no reference model to validate against. The pipeline was reverse-engineered in Phase 2.2 from file reads — it was never specified first.

### 3.10 Knowledge Architecture Gap

Three knowledge stores (Supabase structured memory, GraphNexus, Obsidian vault) serve overlapping purposes with no defined division of responsibility. No document specifies which store is authoritative for which type of knowledge, how they are kept consistent, and what the read strategy is when they conflict.

---

## 4. Required Foundational Documents

The following 12 documents must be produced before Phase 3 begins. They are listed in dependency order.

---

### DOC-01 — Canonical Entity Taxonomy

**Purpose:** Define every entity type that exists in the APEX system — their essential attributes, relationships, and constraints. Establishes the shared vocabulary for all subsequent documents.

**Scope:** Agent, Entity (Council, Ministry, Executive), Task, Event, Memory record, Decision record, Conversation, Session, Founder, Goal, Objective, Lesson, Document, Tool, Model, Budget allocation, Audit record, Governance record.

**Why it is needed:** Every other document references these concepts. Without canonical definitions, Phase 3 documents will define them independently and inconsistently, recreating the fragmentation the certification uncovered. The current codebase has at least 3 different implicit definitions of "agent" alone.

**Dependencies:** Both constitutions (immutable input). No other foundational documents required first.

**Expected size:** 600–900 lines. One canonical definition block per entity type, with attributes, constraints, and relationships.

**Immutable or evolvable:** Immutable for core entity types (Agent, Task, Memory, Event, Decision, Audit, Founder). Evolvable appendix for domain-specific entities (Ministry types, specific memory subtypes).

---

### DOC-02 — Identity and Ownership Standard

**Purpose:** Define the canonical representation of identity in the APEX system — what identity fields exist, how they are established, how they flow through a request, what anonymous identity means, how ownership is attached to entities, and what "verified identity" vs "attached identity" means.

**Scope:** Identity schema (who is making this request), ownership schema (which entity owns this resource), trust levels associated with identity types (Founder / system / agent / anonymous), JWT claims structure, session identity propagation, identity loss conditions.

**Why it is needed:** `req.identity` and `req.ownership` are set ad hoc. The certification found that resolveIdentity fails soft — anonymous identity is indistinguishable from verified identity downstream. No route handler can currently tell with certainty who made the request. Phase 3 cannot specify access control without a formal identity model.

**Dependencies:** DOC-01 (Entity Taxonomy — identity belongs to entities).

**Expected size:** 300–500 lines.

**Immutable or evolvable:** Immutable core (identity schema, Founder identity invariants). Evolvable for trust level expansions as new agent types are introduced.

---

### DOC-03 — Source of Truth Registry

**Purpose:** For every domain of fact, designate exactly one authoritative source. Define what "projection" means and what consistency obligations projections carry. Enforce the architectural constitution's Art. 1 principle with specific assignments.

**Scope:** All 10 fact domains from the certification (Goals, Memory, Agent Tasks, Configuration, Identity, Health State, Knowledge, Session State, Strategic Objectives, Agent Reputation) plus any new domains identified in DOC-01.

**Why it is needed:** The architectural constitution states the principle; this document makes the assignments. Without assignments, every system component can legitimately claim it is the source of truth. The certification found 5+ write paths to memory with no designated authority — this is the document that designates one.

**Dependencies:** DOC-01 (what things exist), DOC-02 (identity as a fact domain).

**Expected size:** 400–600 lines. One section per fact domain: authoritative source, projection rules, consistency obligations, update frequency.

**Immutable or evolvable:** Immutable for core assignments. Evolvable as new fact domains are introduced.

---

### DOC-04 — Trust Boundary Specification

**Purpose:** Formally specify each trust boundary: what evidence is required to cross it from lower-trust to higher-trust, what the system must do when evidence is absent or invalid, and what the permitted failure mode is (fail-open or fail-closed) at each boundary.

**Scope:** All 8 boundaries identified in the certification plus any new ones introduced by DOC-01 entity types. For each boundary: entry condition, exit condition, required evidence, failure mode, permitted exceptions.

**Why it is needed:** The constitutions establish fail-closed as default. The certification found 10 permissive failure modes, 3 of which are on the most security-critical paths. No document currently states which failure modes are intentional vs unintentional. This document makes that determination explicit for every boundary.

**Dependencies:** DOC-01 (what entities cross boundaries), DOC-02 (what identity evidence looks like), DOC-03 (where authoritative identity records live).

**Expected size:** 500–700 lines.

**Immutable or evolvable:** Immutable for boundary definitions. Evolvable for evidence requirements as new authentication mechanisms are added.

---

### DOC-05 — Failure Mode Policy

**Purpose:** For each critical subsystem, formally declare whether fail-open or fail-closed is the intended behavior and why. Establish the canonical failure mode taxonomy (FAIL-OPEN, FAIL-CLOSED, FAIL-SOFT, FAIL-SILENT, FIRE-AND-FORGET) and specify which are permissible in which contexts.

**Scope:** All 14 failure modes classified in the certification. Constitutional constraints from Art. 2 (fail-closed default). Rules for when fire-and-forget is permissible (non-critical observability) vs prohibited (audit records, governance writes).

**Why it is needed:** Without this document, Phase 3 design discussions cannot determine whether a permissive failure mode is a bug to fix or a deliberate design choice. The certification documented all 14 modes; it cannot determine intent. This document establishes intent.

**Dependencies:** DOC-04 (trust boundaries determine what failure costs are acceptable at each layer). Constitution Art. 2 (immutable input).

**Expected size:** 300–400 lines.

**Immutable or evolvable:** Immutable for safety-critical subsystems. Evolvable for observability and non-critical subsystems.

---

### DOC-06 — Memory Architecture Standard

**Purpose:** Define the canonical memory architecture: memory types, schemas, storage backends, write paths, access controls, lifecycle states, and retention policies. Assign authoritative backends per DOC-03.

**Scope:** Semantic memory, episodic memory, procedural memory, decision memory, working memory, reflexion records, obsidian vault records. For each: schema, authoritative backend, permitted write paths, read strategy, lifecycle (creation → active → compressed → archived → expired), quota model.

**Why it is needed:** The certification found 5+ write paths to memory with no unified schema, governance, or quota enforcement. `memory-governor.js` enforces zero quotas despite its name. The three storage backends have no specified division of responsibility. Phase 3 cannot design a coherent memory system without a ground-truth architecture.

**Dependencies:** DOC-01 (memory record as entity type), DOC-03 (authoritative backend assignments), DOC-04 (access controls at the memory write boundary).

**Expected size:** 700–1000 lines.

**Immutable or evolvable:** Immutable for schema contracts (adding columns requires versioning). Evolvable for quota values, retention periods, and compression strategies.

---

### DOC-07 — Event Architecture Standard

**Purpose:** Define the canonical event system: event envelope schema, event registry (canonical list of all events), routing rules, idempotency contract, ordering guarantees, and consumer obligations.

**Scope:** All 16 named events on the current event bus plus any new events required by DOC-01 entity types. Canonical envelope: event_id, event_type, entity_type, entity_id, content_hash, idempotency_key, emitted_at, emitted_by, correlation_id. Consumer obligations: acknowledgement, at-most-once vs at-least-once semantics, failure handling.

**Why it is needed:** Architectural constitution Art. 3 mandates events not polling, with canonical envelope and idempotency key. The current event bus uses `setImmediate` dispatch with no persistence, no envelope schema, and no idempotency enforcement. The consumer (event-consumer.js) uses at-most-once with silent failure. This document specifies what "event" means for Phase 3 design.

**Dependencies:** DOC-01 (entities referenced in event envelopes), DOC-03 (where event logs are the authoritative source).

**Expected size:** 400–600 lines.

**Immutable or evolvable:** Evolvable (event registry grows as new entity types are introduced). Envelope schema is immutable once ratified.

---

### DOC-08 — Agent Lifecycle Standard

**Purpose:** Define the canonical lifecycle of an agent: what stages exist, what transitions are permitted, what data must be produced at each stage, what resources are allocated and released, and what happens on forced termination.

**Scope:** Agent stages (planned → approved → queued → executing → completed / failed / cancelled). Transition conditions and required evidence. Data produced per stage: task record, execution log, reflexion record, audit record. AUTONOMY_LEVEL interaction: which stages are skipped at each level. Resource lifecycle: budget reservation, release, reclamation. Forced termination protocol.

**Why it is needed:** The current agent system has different controls on different paths (agent-task-cycle vs master-orchestrator). AUTONOMY_LEVEL=3 bypasses approval. The execution-verifier is advisory only. No document specifies what stages are mandatory and what data each must produce. Phase 3 cannot improve the agent system without a lifecycle specification to design against.

**Dependencies:** DOC-01 (agent and task entity types), DOC-02 (agent identity), DOC-04 (trust boundary at agent execution), DOC-05 (failure mode at each lifecycle stage).

**Expected size:** 500–700 lines.

**Immutable or evolvable:** Immutable for mandatory stage definitions. Evolvable for AUTONOMY_LEVEL rules as the system matures.

---

### DOC-09 — Observability and Auditability Standard

**Purpose:** Specify exactly what telemetry is required, what constitutes a complete audit record for each operation type, and what constraints apply to audit record writes. Operationalise Art. 3 of constitution-v1.md (Evidence & Auditability) with specific schemas and requirements.

**Scope:** Audit record schema (operation_id, actor_identity, operation_type, entity_type, entity_id, input_hash, outcome, governance_score_impact, timestamp, chain_hash, chain_link). Required audit points per operation type. Constraints on audit writes: what failure mode is permitted (must be fail-closed per Art. 2). Health telemetry schema. Observability coverage requirements per subsystem.

**Why it is needed:** The certification found governance.js `_w()` is fire-and-forget (audit gaps possible), reflexion-tracker produces null links (audit links broken), and post-response hooks are best-effort. Art. 3 requires no silent failures and full traceability. This document defines what those requirements mean in implementation terms. Without it, every write path will continue to make its own judgment about what audit coverage is sufficient.

**Dependencies:** DOC-01 (entity types referenced in audit records), DOC-02 (actor identity in audit records), DOC-08 (agent lifecycle produces audit records). Constitution Art. 3 (immutable constraint).

**Expected size:** 400–600 lines.

**Immutable or evolvable:** Immutable for mandatory audit fields. Evolvable for optional telemetry dimensions.

---

### DOC-10 — Runtime Execution Model

**Purpose:** Specify the canonical request processing pipeline — what phases exist, what each phase's responsibilities are, what the failure mode of each phase must be, and what data each phase produces. This is the specification that civilization-kernel and kernelChain must implement.

**Scope:** Inbound pipeline phases (rate limiting → authentication → identity resolution → ownership resolution → authority check → governance check → constitutional gate → route dispatch → response). Post-response phases (audit write → memory write → reflexion tracking → event emission). Required data at each phase boundary. Permitted failure modes per phase (referencing DOC-05).

**Why it is needed:** The current pipeline was reverse-engineered from source code in Phase 2.2. It was never specified. Phase 3 changes to the pipeline have no reference model to validate against. The certification found Gate 4 (checkGovernance) is structurally open — but without a specification, it cannot be confirmed whether this is a bug or intended. This document makes that determination.

**Dependencies:** DOC-02 (identity phases), DOC-04 (trust boundaries map to pipeline phases), DOC-05 (failure modes per phase), DOC-09 (audit records produced per phase).

**Expected size:** 500–700 lines.

**Immutable or evolvable:** Immutable for mandatory phases. Evolvable for optional phases and phase-internal implementation details.

---

### DOC-11 — Knowledge Architecture Standard

**Purpose:** Specify the canonical architecture for knowledge storage and retrieval — the division of responsibility between Supabase structured memory, GraphNexus, and Obsidian vault, the read strategy when stores diverge, and the write authority per knowledge type.

**Scope:** Knowledge types (structured facts, episodic lessons, procedural knowledge, relationship graphs, vault documents). Authoritative store per type (referencing DOC-03). Read strategy: primary + fallback, conflict resolution. Write strategy: single authoritative write, optional projection writes. GraphNexus role (relationship graph only vs general knowledge). Obsidian role (long-term narrative knowledge vs operational memory).

**Why it is needed:** The certification found 3 knowledge stores with no specified division of responsibility and no synchronization. The Python RAG sidecar is unresolved. chat-context.js builds prompts from all three stores without a defined authority hierarchy. Phase 3 knowledge features cannot be designed without knowing what each store is for.

**Dependencies:** DOC-01 (knowledge record entity types), DOC-03 (authoritative source assignments), DOC-06 (memory architecture defines structured memory layer).

**Expected size:** 400–500 lines.

**Immutable or evolvable:** Evolvable (store selection and sync strategies may change). Store assignment contracts are immutable once ratified.

---

### DOC-12 — Database Schema Standard

**Purpose:** Specify the canonical design rules for database schema: naming conventions, required columns on all tables, transaction requirements, RLS policy requirements, indexing standards, and the process for introducing or modifying tables.

**Scope:** Naming conventions (table, column, index, constraint naming). Required columns on all tables (id, created_at, updated_at, owner_id, governance_record_id). Transaction requirements: which operations require real transactions vs can use fire-and-forget. RLS policy: which tables require RLS, what policies are required. Schema change process: migration scripts, idempotency, rollback. Forbidden patterns: direct Supabase client bypassing gateway, service-role key in application code vs in dedicated gateway.

**Why it is needed:** The certification found no confirmed transactions, multiple modules holding their own Supabase clients (bypassing the canonical gateway), and RLS status unknown for all tables. The architectural constitution Art. 4 requires real transactions for state+outbox pairs — but no document specifies what that means for each table. Phase 3 cannot introduce new tables without a schema design standard to follow.

**Dependencies:** DOC-01 (entity types map to tables), DOC-09 (required audit columns), DOC-10 (outbox pattern requirements from runtime pipeline). Constitution Art. 4 (immutable constraint).

**Expected size:** 400–500 lines.

**Immutable or evolvable:** Immutable for required column contracts and naming conventions. Evolvable for optional conventions and process details.

---

## 5. Dependency Graph — Document Authoring Order

The following graph shows the dependency order. A document can only be authored after all documents it depends on are ratified.

```
LAYER 0 (Immutable Input — Already Exists)
├── constitution-v1.md (Operational Constitution)
└── Scripts/CONSTITUTION.md (Architectural Constitution)

LAYER 1 (No Dependencies — Must Be First)
└── DOC-01: Canonical Entity Taxonomy
    (All other documents depend on DOC-01)

LAYER 2 (Depends on DOC-01 Only)
├── DOC-02: Identity and Ownership Standard
│   └── requires: DOC-01
└── DOC-07: Event Architecture Standard
    └── requires: DOC-01

LAYER 3 (Depends on DOC-01 + DOC-02)
└── DOC-03: Source of Truth Registry
    └── requires: DOC-01, DOC-02

LAYER 4 (Depends on DOC-01, DOC-02, DOC-03)
└── DOC-04: Trust Boundary Specification
    └── requires: DOC-01, DOC-02, DOC-03

LAYER 5 (Depends on DOC-04)
└── DOC-05: Failure Mode Policy
    └── requires: DOC-04

LAYER 6 (First multi-dependency layer)
├── DOC-06: Memory Architecture Standard
│   └── requires: DOC-01, DOC-03, DOC-04
└── DOC-08: Agent Lifecycle Standard
    └── requires: DOC-01, DOC-02, DOC-04, DOC-05

LAYER 7 (Depends on DOC-05, DOC-08, DOC-09 prerequisites)
└── DOC-09: Observability and Auditability Standard
    └── requires: DOC-01, DOC-02, DOC-08

LAYER 8 (Runtime model — requires most prior docs)
└── DOC-10: Runtime Execution Model
    └── requires: DOC-02, DOC-04, DOC-05, DOC-09

LAYER 9 (Knowledge layer — requires memory architecture)
└── DOC-11: Knowledge Architecture Standard
    └── requires: DOC-01, DOC-03, DOC-06

LAYER 10 (Database — requires schema inputs from all prior layers)
└── DOC-12: Database Schema Standard
    └── requires: DOC-01, DOC-09, DOC-10
```

### Parallel Authoring Opportunities

Documents with no shared dependencies within a layer can be authored in parallel:

- **DOC-02 and DOC-07** can be authored simultaneously (both depend only on DOC-01)
- **DOC-06 and DOC-08** can be authored simultaneously once DOC-01 through DOC-05 are ratified
- **DOC-11 and DOC-12** cannot be parallelised — DOC-11 feeds DOC-12 via DOC-06

### Minimum Critical Path

If only one document can be authored at a time, the critical path is:

```
DOC-01 → DOC-02 → DOC-03 → DOC-04 → DOC-05 → DOC-08 → DOC-09 → DOC-10 → DOC-12
```

DOC-06, DOC-07, and DOC-11 are off the critical path and can be interleaved.

---

## 6. Summary Table

| Doc | Title | Layer | Immutable? | Est. Size |
|-----|-------|-------|-----------|----------|
| DOC-01 | Canonical Entity Taxonomy | 1 | Core immutable, appendix evolvable | 600–900 ln |
| DOC-02 | Identity and Ownership Standard | 2 | Core immutable | 300–500 ln |
| DOC-03 | Source of Truth Registry | 3 | Assignments immutable | 400–600 ln |
| DOC-04 | Trust Boundary Specification | 4 | Boundaries immutable | 500–700 ln |
| DOC-05 | Failure Mode Policy | 5 | Safety-critical immutable | 300–400 ln |
| DOC-06 | Memory Architecture Standard | 6 | Schema contracts immutable | 700–1000 ln |
| DOC-07 | Event Architecture Standard | 2 | Envelope immutable | 400–600 ln |
| DOC-08 | Agent Lifecycle Standard | 6 | Mandatory stages immutable | 500–700 ln |
| DOC-09 | Observability and Auditability Standard | 7 | Mandatory fields immutable | 400–600 ln |
| DOC-10 | Runtime Execution Model | 8 | Mandatory phases immutable | 500–700 ln |
| DOC-11 | Knowledge Architecture Standard | 9 | Store assignments immutable | 400–500 ln |
| DOC-12 | Database Schema Standard | 10 | Required columns immutable | 400–500 ln |

**Total estimated volume:** 5,400–7,200 lines across 12 documents.  
**Phase 3 gate:** All 12 documents ratified. No canonical system design begins before DOC-12 is complete.
