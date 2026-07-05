# APEX CIVILISATION — Phase 3 Architectural Master Plan

**Date:** 2026-07-02
**Phase:** 3.0.1 — Architectural Blueprint Refinement
**Role:** Independent Chief Enterprise Architect
**Mode:** Architecture planning only. No documents authored. No code changed.

---

## Part 1 — Review of the Original Roadmap

The Gap Analysis (Phase 2.3 Part 2, document 14) proposed 12 foundational documents across 10 dependency layers. The proposal was sound in identifying the correct problem: that APEX possesses operational governance but lacks architectural governance. The proposed document set correctly identified most of the domains that need specification.

However, the original roadmap has structural weaknesses that would compound over a multi-year horizon. They are examined below.

---

## Part 2 — Weaknesses in the Original Document Structure

### Weakness 1 — DOC-01 Is Three Documents in One

The "Canonical Entity Taxonomy" was proposed as a 600–900 line document covering: entity types, their attributes, their constraints, and their relationships. This conflates three fundamentally different artefacts with different authors, different stability profiles, and different purposes.

**The meta-model** defines the modelling *language* — what "entity type", "attribute", "relationship", "cardinality", "lifecycle", and "constraint" mean within the APEX modelling system. It is the grammar before the vocabulary. It is maximally immutable — once written, the language does not change even as the entities do.

**The entity taxonomy** applies the meta-model language to classify what specific entities exist in APEX. It can be immutable at the core, evolvable at the margins. Ministry types, memory subtypes, and new agent categories can be added without rewriting the taxonomy's structure.

**The relationship ontology** defines how entities relate: what relationships exist, their cardinality, their directionality, their semantic meaning, and what constraints govern their formation. Relationships evolve more rapidly than entities — new capabilities, new agent roles, new governance patterns change the relationship graph without changing the core entity types.

Combining these three produces a document that cannot be ratified as a whole, because the meta-model should be immutable, the entity taxonomy is largely immutable, and the relationship ontology is evolvable. A combined document cannot declare a clear immutability contract.

### Weakness 2 — The Registry Is Not Specified As a First-Class Artefact

The original roadmap includes DOC-03 "Source of Truth Registry" — a document that assigns authoritative sources to fact domains. This is correct in intent. But the roadmap contains no document specifying what a *registry* is, how one is structured, how entries are admitted, versioned, governed, deprecated, and synchronised to projections.

The APEX architectural constitution (Scripts/CONSTITUTION.md) is explicit: "entities, agents, and scores are config rows, not bespoke code" (Art. 5) and "admission_rules table governs module admission" (Art. 2). The registry is not a list — it is the central governance mechanism. Everything that exists in APEX must be registered. A registry of registries (DOC-03) cannot be written coherently until a Registry Architecture exists defining what a registry is and how it operates.

Without this, DOC-03 becomes a static document with no governance. Entries cannot be added, removed, versioned, or audited. It decays immediately.

### Weakness 3 — Identity, Ownership, and Authority Are Three Concerns Treated As Two

DOC-02 "Identity and Ownership Standard" combined two things. But there are actually three distinct concerns:

**Identity** — answers WHO: who is making this request? What credential establishes that? What happens when the credential is absent?

**Ownership** — answers WHOSE: which entity holds rights over this resource? This is a property of *entities*, not of *requests*. Ownership belongs in the entity taxonomy as an attribute, not in a standalone identity document.

**Authority** — answers WHAT IS PERMITTED: given this identity, what operations are permitted, on which entity types, in which stages, under which conditions? Authority is a policy, not a schema.

The original DOC-02 attempted to cover identity schema, ownership schema, and the trust levels associated with identity types. The coupling is correct — these concepts relate — but the document was building an authority model without naming it as such, and embedding ownership as an identity concern when it is an entity attribute.

### Weakness 4 — Observability and Auditability Are Combined But Governed by Different Sources

The original DOC-09 "Observability and Auditability Standard" conflated two distinct requirements:

**Auditability** is a *constitutional mandate* (Art. 3 of constitution-v1.md): immutable evidence chain, no silent failures, full traceability, governance score ≥ 60/100. This is a constitutional specification — immutable at its core, carrying constitutional authority.

**Observability** is an *engineering requirement*: metrics, health telemetry, log coverage, trace propagation. No constitutional article mandates a specific observability model. It is a quality standard that evolves with the system.

A combined document produces an unclear immutability contract and conflates constitutional obligation with engineering choice. A Phase 3 design team cannot distinguish which requirements they *must* meet from those they *should* meet.

### Weakness 5 — Missing Pre-Conditions for the Event Architecture

DOC-07 "Event Architecture Standard" was placed at Layer 2 depending only on DOC-01. But events in APEX have properties that require prior definitions:

- **emitted_by** requires an Identity specification (who can emit events)
- **entity_type / entity_id** requires an Entity Taxonomy
- **event types as registry entries** requires a Registry Architecture
- **idempotency_key semantics** require the Source of Truth model (where idempotency is enforced)

Placing DOC-07 at Layer 2 was a consequence of it depending only on DOC-01. With the correct set of pre-conditions, the Event Architecture belongs in the domain layer (Layer 8 in the revised plan), not Layer 2.

### Weakness 6 — No Document Type Discipline

The original roadmap used "Standard" for most documents without distinguishing between:

- A **taxonomy** (classification of things that exist)
- An **ontology** (formal definition of relationships)
- A **specification** (exact form something must take)
- A **policy** (rules governing decisions)
- an **architecture** (structure of a subsystem)
- a **registry** (governed catalogue)
- a **model** (representation of how something works)

This matters over a multi-year horizon because each document type has a different change process, different authority to amend, and different relationship to implementation. A specification is not a policy. A policy is not a registry. A registry is not an architecture. Using "Standard" for all of them obscures these distinctions.

### Weakness 7 — The Capability Gap

The original roadmap has no document defining what operations APEX is capable of performing. The entity taxonomy says what things *are*. The relationship ontology says how they *relate*. But no document says what the system can *do* — what operations exist, what resources they consume, what their pre-conditions and post-conditions are, what their governance classification is.

The certification confirmed this gap: the 8-type step allowlist in agent-task-cycle.js is the only capability governance mechanism, and it is a hardcoded list in a runtime file. No architectural document specifies what the canonical capability set is, how new capabilities are admitted, or what each capability requires.

For a long-horizon system, capability governance is foundational — it determines what can be built and under what authority. It should be a registered artefact, not a hardcoded array.

### Weakness 8 — The Database Schema Standard Is at the Wrong Level

DOC-12 "Database Schema Standard" is a valid and necessary document. However, at Layer 10, it was positioned as the last foundational document before Phase 3 could begin. This is incorrect: a database schema standard is an *engineering standard*, not an *architectural standard*. It governs implementation choices (naming conventions, RLS configuration, migration process) rather than architectural decisions (what entities exist, how they relate, what must be recorded).

Database Schema Standard belongs in a lower-priority authoring tier — important, but not blocking domain architecture work. A Memory Architecture can be specified before the database naming conventions are locked.

---

## Part 3 — Proposed Improvements

### Improvement 1 — Introduce the Architectural Meta-Model as Document Zero

Before any taxonomy, ontology, or specification can be written, the modelling language must be defined. The Architectural Meta-Model defines:

- What an **entity type** is (definition, not instance)
- What an **attribute** is (typed field belonging to an entity)
- What a **relationship type** is (typed edge between entity types)
- What a **lifecycle** is (ordered set of states with transition rules)
- What a **registry** is at the meta level (governed catalogue with schema, admission rules, versioning)
- What a **capability** is (a named, governable operation)
- What a **boundary** is (a point where trust level changes)
- What a **policy** is (a rule governing a decision)
- What a **specification** is (an exact contract)

All subsequent documents are expressed in the language defined by the Meta-Model. This makes every other document internally consistent and cross-referenceable.

**This document did not exist in the original roadmap and is the most important addition.**

### Improvement 2 — Separate the Relationship Ontology from the Entity Taxonomy

After the Meta-Model defines what "entity type" and "relationship type" mean, the Entity Taxonomy lists the specific entity types in APEX. The Relationship Ontology then defines the specific relationships between those types.

This separation:
- Allows the Entity Taxonomy to be ratified first (more stable)
- Allows the Relationship Ontology to evolve as new agent roles and capabilities emerge
- Prevents the combined document from requiring amendments every time a new relationship is added

### Improvement 3 — Introduce the Registry Architecture Before Any Registry

The Registry Architecture specifies:
- Registry entry schema (what fields all registry entries must have)
- Registry lifecycle (how entries are proposed, reviewed, admitted, deprecated, removed)
- Registry versioning (how breaking changes to a registry are managed)
- Registry projections (how registries are surfaced — as DB rows, as config files, as API responses)
- Registry synchronisation (how projections are kept consistent with the authoritative registry)
- Registry governance (who has authority to admit entries, under what conditions)

Every subsequent registry (Source of Truth Registry, Event Type Registry, Capability Registry, Agent Role Registry) then instantiates this pattern. This eliminates the inconsistency found in the certification: admission_rules exists as a concept but is not governed by any specification.

### Improvement 4 — Promote the Auditability Specification Above the Domain Architectures

The Auditability Specification (split from DOC-09) defines what constitutes a valid audit record, which operations must produce one, and what failure mode is permitted for audit writes. This specification must be written before domain architectures (Memory, Events, Agent Lifecycle) because those architectures must specify what audit records their operations produce.

If the Auditability Specification comes after the domain architectures, those architectures will make independent decisions about what constitutes adequate audit coverage — recreating the fragmentation the certification documented.

### Improvement 5 — Name Documents by Their Architectural Type

Every document name should include its type. This makes the role of each document unambiguous:

- "Architectural Meta-Model" not "Foundation"
- "Entity Taxonomy" not "Entity Standard"
- "Relationship Ontology" not "Relationship Standard"
- "Registry Architecture" not "Registry Standard"
- "Identity and Authority Specification" not "Identity Standard"
- "Auditability Specification" not "Auditability Standard"
- "Failure Mode Policy" (correctly named in original)
- "Memory Architecture" (correctly named in original)
- "Agent Lifecycle Model" not "Agent Lifecycle Standard"
- "Runtime Execution Model" (correctly named in original)

### Improvement 6 — Introduce a Capability Registry

The APEX system has a set of operations (Tools, Agent step types, API endpoints, Model operations) that represent its capability set. The architectural constitution requires that everything earns its place. This requires a governed registry of capabilities. Capabilities that are not in the registry should not exist in the runtime.

This is not a large document, but it is structurally important: it closes the gap between "entity taxonomy" (what things are) and "runtime execution model" (how operations execute) by defining what operations exist and what governance they require.

---

## Part 4 — Revised Document Hierarchy

The revised hierarchy introduces 15 foundational documents across 9 dependency layers (compared to 12 documents in 10 layers originally). Three documents are new. Two existing documents are split. One document is removed from the foundational set (Observability Standard — engineering-level, not architectural).

Every document is named by its type. Every document has exactly one primary responsibility.

---

### ARCH-00 — Architectural Meta-Model

**Type:** Meta-Model
**Purpose:** Define the modelling language used across all APEX architectural documents. Specify what "entity type", "attribute", "relationship", "lifecycle", "registry", "capability", "boundary", "policy", and "specification" mean at the meta level.
**Scope:** Vocabulary for the entire document hierarchy. Modelling primitives only — no instances.
**Why needed:** Without a meta-model, every document defines its own vocabulary. Taxonomy entries, ontology relationships, registry schemas, and lifecycle states will be inconsistent across documents because they use the same words differently.
**Dependencies:** Both constitutions (immutable constraints on the modelling language).
**Expected size:** 300–400 lines.
**Immutability:** Maximally immutable. This is the grammar of the architecture. A change to the meta-model potentially invalidates all other documents.

---

### ARCH-01 — Entity Taxonomy

**Type:** Taxonomy
**Purpose:** Classify every entity type that exists in the APEX Civilisation. For each entity type, define its canonical name, its essential attributes, its lifecycle reference, its registry membership, and its constitutional classification (Founder, Council, Ministry, Agent, Resource, Record).
**Scope:** Agent, Council Member, Ministry, Task, Event, Memory Record, Decision Record, Conversation, Session, Tool, Model, Budget Allocation, Audit Record, Governance Record, Goal, Objective, Lesson, Document, Capability. Ownership is an attribute of entities defined here.
**Why needed:** Every other architectural document references entity types. Without canonical definitions, every document creates its own vocabulary, recreating the fragmentation the certification found (at least 3 implicit definitions of "agent" in the current codebase).
**Dependencies:** ARCH-00 (uses meta-model vocabulary).
**Expected size:** 500–700 lines. One definition block per entity type.
**Immutability:** Core entity types (Agent, Task, Memory, Event, Decision, Audit, Founder) are immutable. An evolvable appendix governs entity type additions via the admission process.

---

### ARCH-02 — Relationship Ontology

**Type:** Ontology
**Purpose:** Define every canonical relationship between entity types: relationship name, source type, target type, cardinality, directionality, semantic meaning, and constraints. Defines the authority relationships (who reports to whom), capability relationships (what can invoke what), and data relationships (what produces what).
**Scope:** All relationship types between entity types defined in ARCH-01. Authority graph (Founder → Council → Ministry → Agent). Invocation graph (which entity types can invoke which operations on which other entity types). Data lineage graph (which operations produce which record types).
**Why needed:** The entity taxonomy defines nodes; the relationship ontology defines edges. Without the ontology, the taxonomy is a flat list. The APEX certification found two independent goal systems with no sync and two independent agent systems with different controls — both failures are relationship failures, not entity failures.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (entity types to relate).
**Expected size:** 400–600 lines.
**Immutability:** Relationship types between core entities are immutable. The set of relationships evolves as new entity types are added to ARCH-01 appendix.

---

### ARCH-03 — Registry Architecture

**Type:** Architecture
**Purpose:** Specify what a registry is, how it is structured, how entries are admitted, versioned, deprecated, and removed, how projections are produced and kept consistent, and who has authority to govern each registry.
**Scope:** Registry entry schema (universal fields all registry entries must have: id, canonical_name, version, status, admitted_by, admitted_at, deprecated_at, superseded_by, admission_evidence). Admission lifecycle (proposed → reviewed → admitted → active → deprecated → removed). Versioning protocol (major version = breaking change requires re-admission; minor version = additive, backward compatible). Projection rules (how DB rows, config files, and API responses project from the authoritative registry). Synchronisation obligations (when projections must be refreshed). Registry governance (who can propose entries, who can admit, who can deprecate — references ARCH-04).
**Why needed:** Every subsequent registry (ARCH-05 Source of Truth Registry, event type registry, capability registry, agent role registry) must instantiate this pattern. Without it, each registry is ad hoc. The certification found admission_rules referenced in the architectural constitution but governed by no specification.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (Registry is an entity type).
**Expected size:** 400–500 lines.
**Immutability:** Registry entry schema and admission lifecycle are immutable. Projection and synchronisation mechanisms are evolvable.

---

### ARCH-04 — Identity and Authority Specification

**Type:** Specification
**Purpose:** Define the canonical representation of identity in APEX, the trust levels associated with each identity type, the authority model (what each identity type is permitted to do), and the rules governing authority delegation and escalation.
**Scope:** Identity schema (identity_type, identity_id, credential_type, verification_level, session_id, established_at). Identity types: Founder, Council Member, Ministry, Agent, System, Anonymous. Trust levels: SOVEREIGN (Founder), EXECUTIVE (Council), OPERATIONAL (Ministry), TASK (Agent), SYSTEM (internal services), NONE (anonymous). Authority matrix: what each trust level may do by entity type and operation class. Authority delegation rules: what can be delegated, to whom, under what conditions. Escalation rules: when an operation must escalate upward. Credential types and their verification guarantees. Identity loss conditions and recovery.
**Scope exclusion:** Ownership (entity attribute in ARCH-01). Trust boundary enforcement locations (ARCH-06). Runtime identity attachment (ARCH-13).
**Why needed:** The certification found resolveIdentity fails soft — anonymous identity is indistinguishable from verified identity downstream. No route handler can determine with certainty who made the request. The authority model (INV-B1, INV-B2) is not enforced because it is not specified. This document provides the specification that ARCH-06 and ARCH-13 enforce.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (identity types are entity types), ARCH-03 (identity types are registry entries).
**Expected size:** 400–600 lines.
**Immutability:** Founder identity invariants and SOVEREIGN trust level are immutable. Trust level rules for Agent and System types are evolvable as the system matures.

---

### ARCH-05 — Source of Truth Registry

**Type:** Registry
**Purpose:** For every domain of fact in APEX, designate exactly one authoritative source, specify what constitutes a projection of that source, and define the consistency obligations projections carry.
**Scope:** All 10 fact domains identified in the certification plus any new domains from ARCH-01. For each domain: canonical name, authoritative source (system + storage layer), projection sources (with acceptable staleness), synchronisation trigger (event-driven vs schedule), conflict resolution rule (authoritative source always wins), update protocol.
**Why needed:** ARCH-00/01/02 define the modelling language and what things are. This registry applies them to settle the source-of-truth conflicts the certification documented. The architectural constitution states the principle (Art. 1); this registry makes the specific assignments. Without assignments, the principle is unenforceable.
**Dependencies:** ARCH-00 (registry entry schema pattern), ARCH-03 (how a registry works), ARCH-01 (entity types map to fact domains), ARCH-04 (authority to write to an authoritative source).
**Expected size:** 400–500 lines. One registry entry block per fact domain.
**Immutability:** Core assignments (where Goal truth lives, where Memory truth lives) are immutable once ratified. New fact domains are added via the admission process defined in ARCH-03.

---

### ARCH-06 — Trust Boundary Specification

**Type:** Specification
**Purpose:** Formally specify each trust boundary in APEX: the structural definition of the boundary, the evidence required to cross from lower trust to higher trust, the permitted failure mode at the boundary, and the governance record produced when the boundary is crossed.
**Scope:** All 8 trust boundaries identified in the certification. For each boundary: name, entry trust level, exit trust level, required identity evidence (referencing ARCH-04 identity types), required authority evidence (referencing ARCH-04 authority matrix), permitted failure mode (FAIL-OPEN / FAIL-CLOSED — referencing ARCH-07), governance record produced on crossing, governance record produced on rejection.
**Why needed:** The certification found 3 of the most security-critical boundaries fail toward permissiveness. The constitutions mandate fail-closed as default. This document specifies, for each boundary, whether the current implementation is correct (intentionally fail-open) or incorrect (should be fail-closed). Without it, Phase 3 cannot determine which of the 10 permissive failure modes are bugs to fix.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (entity types crossing boundaries), ARCH-04 (evidence types and trust levels), ARCH-07 (failure mode taxonomy — note: ARCH-06 and ARCH-07 are co-dependent; see Dependency Review below).
**Expected size:** 500–600 lines.
**Immutability:** Boundary definitions are immutable. Evidence requirements are evolvable as new credential types are introduced.

---

### ARCH-07 — Failure Mode Policy

**Type:** Policy
**Purpose:** For each critical subsystem and trust boundary in APEX, declare the intended failure mode and the constitutional justification for that choice. Establish the canonical failure mode taxonomy and specify which modes are permitted in which contexts.
**Scope:** Canonical taxonomy: FAIL-CLOSED, FAIL-OPEN, FAIL-SOFT, FAIL-SILENT, FIRE-AND-FORGET (definitions). Rules governing which modes are permissible: constitutional constraints from Art. 2 (fail-closed default) and Art. 3 (no silent failures). Permissibility matrix: for each subsystem category (safety gate, audit write, operational gate, observability write, background task), which failure modes are constitutional, which are tolerated, which are prohibited. Classification of all 14 failure modes from the certification as: intentional or unintentional; constitutional or non-constitutional. Remediation obligations for prohibited modes.
**Why needed:** The certification documented 14 failure modes but could not determine intent. Phase 3 cannot resolve this without a policy document that declares intent for each mode. A design team that does not know which permissive failure modes are bugs will leave them in place.
**Dependencies:** ARCH-00 (modelling language), ARCH-04 (authority determines who can override a failure mode), ARCH-06 (trust boundaries shape what failure is acceptable at each layer). Note: ARCH-06 references ARCH-07 for permitted failure modes; ARCH-07 references ARCH-06 for boundary classification. This near-circular dependency is broken by sequencing: ARCH-07 is written after ARCH-06, with ARCH-07 taking ARCH-06 boundary definitions as input and ARCH-06 referencing ARCH-07 by a forward reference for failure mode names only (which are defined in ARCH-07's taxonomy).
**Expected size:** 300–400 lines.
**Immutability:** Failure mode taxonomy is immutable. Safety-critical classifications (constitutional gate must be FAIL-CLOSED) are immutable. Non-critical classifications are evolvable.

---

### ARCH-08 — Auditability Specification

**Type:** Specification
**Purpose:** Specify what constitutes a valid audit record in APEX, which operations must produce one, what constraints govern audit writes (including failure mode), and how the evidence chain is maintained and verified. Operationalises Art. 3 of constitution-v1.md.
**Scope:** Audit record schema: operation_id, actor_identity (references ARCH-04 identity schema), operation_type (references ARCH-09 capability registry), entity_type, entity_id (references ARCH-01), input_hash, outcome, constitutional_impact, governance_score_delta, timestamp, chain_hash (SHA-256 of prior record), chain_link (prior record id). Mandatory audit points: which operation types must produce a record. Audit write obligations: failure mode for audit writes must be FAIL-CLOSED for safety-critical operations (references ARCH-07). Chain verification: how chain continuity is checked. Governance score computation: how governance_score_delta is calculated.
**Scope exclusion:** Observability (metrics, health telemetry) — engineering concern, separate standard. Agent-specific or memory-specific audit record production — specified in domain architectures (ARCH-10, ARCH-11, ARCH-12).
**Why needed:** The certification found governance.js `_w()` is fire-and-forget, reflexion-tracker produces null chain links, and post-response hooks are best-effort. Art. 3 of constitution-v1.md requires no silent failures and full traceability. This specification defines what those requirements mean in implementation terms. Without it, domain architectures (ARCH-10–ARCH-12) have no canonical audit record schema to produce records against.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (entity types in audit records), ARCH-04 (actor_identity schema), ARCH-07 (failure mode for audit writes is FAIL-CLOSED).
**Expected size:** 400–500 lines.
**Immutability:** Audit record schema is immutable (a change to the schema breaks chain verification). Mandatory audit point list is evolvable as new operation types are introduced.

---

### ARCH-09 — Capability Registry

**Type:** Registry
**Purpose:** Define every canonical operation that APEX can perform — Tools, Agent step types, API operations, Model invocations — as registered capabilities. Each capability entry specifies its governance classification, its resource requirements, its authority requirements, its audit obligations, and its admission status.
**Scope:** Every operation type currently in the system (22 APEX_TOOLS, 8 agent step types, API endpoint categories, Model tier operations). For each capability: canonical_name, capability_class (tool / agent_step / api_operation / model_invocation), resource_profile (compute, memory, cost), required_authority (references ARCH-04 authority matrix), audit_obligation (references ARCH-08), current_admission_status (ADMITTED / PROVISIONAL / DEPRECATED). Admission process for new capabilities (references ARCH-03 registry admission lifecycle).
**Why needed:** The certification found the 8-type step allowlist is a hardcoded array in agent-task-cycle.js. No architectural document governs what capabilities exist or how new ones are admitted. The architectural constitution Art. 2 requires everything to earn its place — this registry is the mechanism. Without it, Phase 3 designs can propose arbitrary new capabilities with no governed admission path.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (Capability is an entity type), ARCH-03 (registry admission lifecycle), ARCH-04 (authority requirements), ARCH-08 (audit obligations per capability).
**Expected size:** 400–600 lines. Grows as capabilities are admitted.
**Immutability:** Registry schema and admission process are immutable. Registry contents are evolvable via the admission process.

---

### ARCH-10 — Memory Architecture

**Type:** Architecture
**Purpose:** Define the canonical architecture of the APEX memory system: the five memory types, their schemas, their authoritative storage backends (references ARCH-05), their permitted write paths, their access controls (references ARCH-04), their lifecycle states, their retention policies, their audit obligations (references ARCH-08), and their quota model.
**Scope:** Semantic memory, episodic memory, procedural memory, decision memory, working memory, reflexion records, Obsidian vault records. For each: canonical schema, authoritative backend, permitted write paths, prohibited write paths (eliminating bypass patterns found in certification), read strategy, lifecycle (creation → active → compressed → archived → expired), quota specification, audit records produced on write.
**Why needed:** The certification found 5+ write paths to memory, no unified schema, zero quota enforcement, and null audit chain links. This architecture assigns one authoritative backend per memory type, specifies the canonical schema, defines the single permitted write path through the gateway, and specifies the audit records each write must produce.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (memory record entity types and ownership attribute), ARCH-02 (memory record relationships), ARCH-04 (write authority), ARCH-05 (authoritative backend assignments), ARCH-07 (failure mode for memory gateway), ARCH-08 (audit record schema for memory writes), ARCH-09 (memory write as registered capability).
**Expected size:** 600–900 lines.
**Immutability:** Schema contracts are immutable (column additions require versioning). Quota values, retention periods, and compression strategies are evolvable.

---

### ARCH-11 — Event Architecture

**Type:** Architecture
**Purpose:** Define the canonical event system: the event envelope schema, the event type registry (all valid event types in APEX), routing rules, idempotency contracts, ordering guarantees, persistence obligations, and consumer obligations.
**Scope:** Canonical event envelope: event_id (UUID v4), event_type (references event type registry), entity_type, entity_id (references ARCH-01), emitted_by (references ARCH-04 identity), content_hash (SHA-256 of payload), idempotency_key, emitted_at, correlation_id, schema_version. Event type registry (all 16 current events plus admission process for new types, references ARCH-09). Consumer obligations: acknowledgement protocol, at-least-once delivery guarantee, idempotency enforcement, failure handling (references ARCH-07). Persistence obligations: which events must be durably persisted vs in-memory only.
**Why needed:** The architectural constitution Art. 3 mandates events not polling, with canonical envelope and idempotency key. The current event bus has no persistence, no envelope schema, no idempotency enforcement, and silent failure on consumer errors. This architecture specifies the canonical event system that Phase 3 will implement.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (entity types referenced in events), ARCH-03 (event type registry uses registry pattern), ARCH-04 (emitted_by identity schema), ARCH-05 (event log authoritative source), ARCH-07 (consumer failure mode), ARCH-08 (audit obligations for system events), ARCH-09 (event emission as registered capability).
**Expected size:** 400–600 lines.
**Immutability:** Event envelope schema is immutable once ratified. Event type registry grows via admission process.

---

### ARCH-12 — Agent Lifecycle Model

**Type:** Lifecycle Model
**Purpose:** Define the canonical lifecycle of an agent task in APEX: the stages, permitted transitions, data produced at each stage, resources allocated and released, AUTONOMY_LEVEL interaction, forced termination protocol, and audit records produced at each transition.
**Scope:** Agent task stages: PLANNED → APPROVED → QUEUED → EXECUTING → COMPLETED / FAILED / CANCELLED / FORCE_TERMINATED. Transition conditions and evidence. Data produced per stage: task record (at PLANNED), execution log entries (during EXECUTING), reflexion record (at COMPLETED/FAILED), audit record at each transition (references ARCH-08 schema). AUTONOMY_LEVEL matrix: which transitions require human approval at each level. Resource lifecycle: budget reservation (at APPROVED), expenditure tracking (during EXECUTING), budget release (at terminal state). Forced termination protocol: what state is produced, what cleanup is required. Multi-path reconciliation: when agent-task-cycle path and master-orchestrator path produce the same lifecycle, what is the canonical record.
**Why needed:** The certification found agent-task-cycle and master-orchestrator have different controls with no reconciliation. AUTONOMY_LEVEL=3 bypasses approval with no specification of what this permits. The execution-verifier is advisory only. No document specifies mandatory stages or mandatory data production. Phase 3 cannot improve the agent system without a lifecycle model to design against.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (Agent, Task entity types), ARCH-02 (agent-task relationships), ARCH-04 (authority for each lifecycle transition), ARCH-07 (failure mode per stage), ARCH-08 (audit record per transition), ARCH-09 (agent execution as registered capability).
**Expected size:** 500–700 lines.
**Immutability:** Mandatory stage definitions and PLANNED→APPROVED→QUEUED→EXECUTING sequence are immutable. AUTONOMY_LEVEL rules are evolvable as the system matures toward greater autonomy.

---

### ARCH-13 — Knowledge Architecture

**Type:** Architecture
**Purpose:** Define the canonical architecture for knowledge in APEX: the division of responsibility between structured memory (Supabase), relational knowledge (GraphNexus), and long-term narrative knowledge (Obsidian vault); the read strategy when stores diverge; the write authority per knowledge type; and the role of the RAG sidecar when deployed.
**Scope:** Knowledge types: structured facts (Supabase), relationship graphs (GraphNexus), procedural knowledge (Supabase), episodic lessons (Supabase + Obsidian), vault documents (Obsidian). Authoritative store per type (references ARCH-05). Read strategy: primary source query → fallback source → conflict rule (authoritative source always wins). Write strategy: write to authoritative source first; projections are synchronised by event (references ARCH-11). GraphNexus role: relationship graph only; not general knowledge store. Obsidian role: long-term narrative knowledge and lessons; not operational memory. RAG sidecar: if deployed, it is a read-only projection of Supabase memory; it does not write to any authoritative source.
**Why needed:** The certification found 3 knowledge stores with no specified division of responsibility, no sync, and chat-context.js querying all three with no authority hierarchy. Phase 3 knowledge features cannot be designed without knowing what each store is for and what happens when they disagree.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (knowledge record entity types), ARCH-05 (authoritative store assignments), ARCH-10 (structured memory layer defines the Supabase side of knowledge).
**Expected size:** 400–500 lines.
**Immutability:** Store assignment contracts are immutable once ratified. Read/write strategies and RAG sidecar integration are evolvable.

---

### ARCH-14 — Runtime Execution Model

**Type:** Runtime Model
**Purpose:** Specify the canonical request processing pipeline: what phases exist, what each phase is responsible for, what data it produces, what failure mode governs it, and what the pipeline looks like for each request class (chat, agent, cron, WebSocket, internal).
**Scope:** Inbound pipeline phases (rate limiting → authentication → identity attachment → ownership resolution → authority check → capability check → constitutional gate → route dispatch → response). Post-response phases (audit write → memory write → event emission → reflexion tracking). Data at each phase boundary. Failure mode per phase (references ARCH-07). Audit record per phase boundary (references ARCH-08). Differentiated pipelines per request class (chat requests vs agent task requests vs cron vs WebSocket have different phase configurations). Constitutional gate behaviour specification (must be FAIL-CLOSED on error, per ARCH-07 — resolving C02 contradiction).
**Why needed:** The current pipeline was reverse-engineered from source code in Phase 2.2. It was never specified. The certification found Gate 4 (checkGovernance) is structurally open and the constitutional gate is fail-open — both are contradictions that cannot be resolved without a specification that declares what the correct behaviour must be.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (entity types in pipeline), ARCH-04 (identity attachment, authority check phases), ARCH-07 (failure mode per phase), ARCH-08 (audit record per phase), ARCH-09 (capability check references capability registry), ARCH-10 (memory write phase), ARCH-11 (event emission phase), ARCH-12 (agent task pipeline).
**Expected size:** 500–700 lines.
**Immutability:** Mandatory pipeline phases are immutable. Phase-internal implementation details are evolvable.

---

### ARCH-15 — Database Schema Standard

**Type:** Engineering Standard
**Purpose:** Specify the canonical design rules for all Supabase Postgres schemas in APEX: naming conventions, required columns on every table, transaction requirements, RLS policy configuration, indexing standards, migration protocol, and forbidden implementation patterns.
**Scope:** Naming conventions (snake_case tables, columns; ix_ indexes; fk_ foreign keys; chk_ check constraints). Required columns on every table (id UUID primary key, created_at timestamptz, updated_at timestamptz, owner_id references entity registry, governance_record_id). Transaction requirements: which write operations require a real transaction with outbox (references architectural constitution Art. 4). RLS policy: every table that holds user data requires RLS; service role key permitted in gateway only. Migration protocol: every schema change requires an idempotent up migration and a rollback migration. Forbidden patterns: direct Supabase client in application modules (gateway only); service role key outside lib/clients.js; fire-and-forget writes for audit records.
**Why needed:** The certification found no confirmed transactions, 5 modules holding independent Supabase clients, and RLS status unknown. The architectural constitution Art. 4 requires real transactions for state+outbox pairs. This standard specifies what that means for every table. Without it, Phase 3 schema work recreates the existing inconsistencies.
**Dependencies:** ARCH-00 (modelling language), ARCH-01 (entity types map to tables), ARCH-08 (required audit columns), ARCH-14 (outbox pattern requirements from runtime pipeline). All domain architectures (ARCH-10, ARCH-11, ARCH-12) inform the schema patterns, but ARCH-15 does not gate any of them.
**Expected size:** 400–500 lines.
**Immutability:** Required column contracts and naming conventions are immutable. Optional conventions and process details are evolvable.

---

## Part 5 — Revised Dependency Graph

```
LAYER 0 — CONSTITUTIONAL (Existing, Immutable)
├── constitution-v1.md
└── Scripts/CONSTITUTION.md


LAYER 1 — META
└── ARCH-00: Architectural Meta-Model
    └── requires: Both constitutions only


LAYER 2 — CLASSIFICATION
├── ARCH-01: Entity Taxonomy
│   └── requires: ARCH-00
└── (ARCH-02 blocked until ARCH-01)


LAYER 3 — RELATIONAL
└── ARCH-02: Relationship Ontology
    └── requires: ARCH-00, ARCH-01


LAYER 4 — REGISTRY INFRASTRUCTURE
└── ARCH-03: Registry Architecture
    └── requires: ARCH-00, ARCH-01


LAYER 5 — AUTHORITY
└── ARCH-04: Identity and Authority Specification
    └── requires: ARCH-00, ARCH-01, ARCH-03


LAYER 6 — GOVERNANCE (can be parallelised within layer)
├── ARCH-05: Source of Truth Registry
│   └── requires: ARCH-00, ARCH-01, ARCH-03, ARCH-04
└── ARCH-06: Trust Boundary Specification
    └── requires: ARCH-00, ARCH-01, ARCH-04
        [references ARCH-07 by name only for failure mode labels]


LAYER 7 — POLICY AND AUDIT (can be parallelised within layer)
├── ARCH-07: Failure Mode Policy
│   └── requires: ARCH-00, ARCH-04, ARCH-06
└── ARCH-08: Auditability Specification
    └── requires: ARCH-00, ARCH-01, ARCH-04, ARCH-07


LAYER 8 — CAPABILITY
└── ARCH-09: Capability Registry
    └── requires: ARCH-00, ARCH-01, ARCH-03, ARCH-04, ARCH-08


LAYER 9 — DOMAIN ARCHITECTURE (can be parallelised within layer)
├── ARCH-10: Memory Architecture
│   └── requires: ARCH-00, ARCH-01, ARCH-02, ARCH-04, ARCH-05,
│                 ARCH-07, ARCH-08, ARCH-09
├── ARCH-11: Event Architecture
│   └── requires: ARCH-00, ARCH-01, ARCH-03, ARCH-04, ARCH-05,
│                 ARCH-07, ARCH-08, ARCH-09
├── ARCH-12: Agent Lifecycle Model
│   └── requires: ARCH-00, ARCH-01, ARCH-02, ARCH-04, ARCH-07,
│                 ARCH-08, ARCH-09
└── ARCH-13: Knowledge Architecture
    └── requires: ARCH-00, ARCH-01, ARCH-05, ARCH-10


LAYER 10 — EXECUTION
└── ARCH-14: Runtime Execution Model
    └── requires: ARCH-00, ARCH-01, ARCH-04, ARCH-07, ARCH-08,
                  ARCH-09, ARCH-10, ARCH-11, ARCH-12


LAYER 11 — ENGINEERING STANDARDS
└── ARCH-15: Database Schema Standard
    └── requires: ARCH-00, ARCH-01, ARCH-08, ARCH-14
        [informed by ARCH-10/11/12 but does not block them]
```

### Parallel Authoring Opportunities

- **Layer 6:** ARCH-05 and ARCH-06 can be authored simultaneously (ARCH-06 uses only ARCH-04 authority types; ARCH-05 uses ARCH-03 registry pattern).
- **Layer 7:** ARCH-07 and ARCH-08 can be authored simultaneously (ARCH-08 uses ARCH-07's failure mode taxonomy but ARCH-07 does not depend on ARCH-08).
- **Layer 9:** ARCH-10, ARCH-11, ARCH-12 can be authored simultaneously. ARCH-13 must wait for ARCH-10.

### Near-Circular Dependency Resolution

**ARCH-06 ↔ ARCH-07:** ARCH-06 (Trust Boundary Specification) references failure modes that are named in ARCH-07 (Failure Mode Policy). ARCH-07 references trust boundary classifications defined in ARCH-06. Resolution: ARCH-06 is authored first, using the failure mode taxonomy names (FAIL-CLOSED, FAIL-OPEN, etc.) as forward references. ARCH-07 then assigns concrete policy decisions to each boundary identified in ARCH-06. The names used in ARCH-06 are defined in ARCH-07's taxonomy section, which has no dependency. This is a reference dependency, not a definitional dependency.

### Minimum Critical Path (sequential)

```
ARCH-00 → ARCH-01 → ARCH-02 → ARCH-03 → ARCH-04 → ARCH-06 → ARCH-07 →
ARCH-08 → ARCH-09 → ARCH-12 → ARCH-14 → ARCH-15
```

Off the critical path (can interleave): ARCH-05, ARCH-10, ARCH-11, ARCH-13.

---

## Part 6 — Explanation of Every Change

| Change | Original | Revised | Reason |
|--------|----------|---------|--------|
| New document | — | ARCH-00: Architectural Meta-Model | No modelling language existed. Every document defined its own vocabulary. Without a meta-model, cross-document consistency cannot be verified. |
| Split document | DOC-01 (combined) | ARCH-01: Entity Taxonomy | DOC-01 conflated three artefacts with different immutability profiles. |
| New document | Missing from DOC-01 | ARCH-02: Relationship Ontology | Relationships are a distinct concern from entity classification. The two goal systems and two agent systems are relationship failures, not entity failures. The ontology must be separately governed. |
| New document | — | ARCH-03: Registry Architecture | The registry is the central governance mechanism of APEX. Every subsequent registry must instantiate this pattern. Without it, DOC-03 (Source of Truth Registry) is a static list with no governance. |
| Renamed and restructured | DOC-02: Identity and Ownership | ARCH-04: Identity and Authority Specification | Ownership is an entity attribute (in ARCH-01). Authority is a policy (incorrectly embedded in the identity document). The renamed document correctly covers identity schema, trust levels, and authority matrix. |
| Moved later | DOC-03: Layer 3 | ARCH-05: Layer 6 | Source of Truth Registry now correctly depends on Registry Architecture (ARCH-03) which defines what a registry is before you can create one. |
| Dependency added | DOC-07: depends only on DOC-01 | ARCH-11: Layer 9 | Events require identity (emitted_by), capability registration (event emission as a capability), audit obligations, and source-of-truth assignments for event logs. The original Layer 2 placement was too early. |
| New document | — | ARCH-09: Capability Registry | No document governed what operations APEX can perform or how new capabilities are admitted. The 8-type step allowlist is a hardcoded runtime array with no architectural backing. |
| Split document | DOC-09: Observability + Auditability | ARCH-08: Auditability Specification only | Observability is an engineering standard with no constitutional mandate. Auditability is a constitutional specification. They require different authority to amend and serve different purposes. Observability Standard is excluded from the foundational set. |
| Moved earlier | DOC-09: Layer 7 (original) | ARCH-08: Layer 7 (revised, earlier in sequence) | Auditability specification must precede domain architectures so those architectures know what audit records they must produce. In the original, it came after Agent Lifecycle. |
| Type renamed | DOC-08: Agent Lifecycle Standard | ARCH-12: Agent Lifecycle Model | A lifecycle is a model (states, transitions, data). Calling it a "Standard" obscures this. The name change clarifies the document's type. |
| Removed from foundational set | DOC-09 (observability half) | Not in foundational set | Observability is an engineering concern. It does not block any foundational architectural document. It belongs in Phase 3.1 or later. |
| Moved later | DOC-12: Layer 10 (blocking) | ARCH-15: Layer 11 (non-blocking) | Database Schema Standard is an engineering standard that does not gate domain architecture work. ARCH-10, ARCH-11, ARCH-12 can be authored without it. It only needs to precede implementation. |

---

## Part 7 — Final Recommended Phase 3 Authoring Order

This is the definitive architectural roadmap for Phase 3. All subsequent Phase 3 documents follow this plan.

### Authoring Sequence

**Tier 1 — Meta and Classification (Sequential)**
1. ARCH-00: Architectural Meta-Model
2. ARCH-01: Entity Taxonomy
3. ARCH-02: Relationship Ontology
4. ARCH-03: Registry Architecture

**Tier 2 — Authority (Sequential)**
5. ARCH-04: Identity and Authority Specification

**Tier 3 — Governance (Parallel)**
6a. ARCH-05: Source of Truth Registry
6b. ARCH-06: Trust Boundary Specification

**Tier 4 — Policy and Audit (Parallel)**
7a. ARCH-07: Failure Mode Policy
7b. ARCH-08: Auditability Specification

**Tier 5 — Capability (Sequential)**
8. ARCH-09: Capability Registry

**Tier 6 — Domain Architectures (Partially Parallel)**
9a. ARCH-10: Memory Architecture
9b. ARCH-11: Event Architecture
9c. ARCH-12: Agent Lifecycle Model
9d. ARCH-13: Knowledge Architecture *(requires ARCH-10 to complete first)*

**Tier 7 — Execution (Sequential)**
10. ARCH-14: Runtime Execution Model

**Tier 8 — Engineering Standards (Sequential)**
11. ARCH-15: Database Schema Standard

---

### Phase 3 Gate

Phase 3 design of canonical systems may begin after ARCH-14 is ratified.

ARCH-15 may be authored in parallel with early Phase 3 design work, as it governs implementation rather than architecture.

No Phase 3 implementation begins before ARCH-15 is ratified.

---

### Summary: Original vs Revised

| Dimension | Original (Phase 2.3 Part 2) | Revised (Phase 3.0.1) |
|-----------|----------------------------|----------------------|
| Document count | 12 | 15 |
| Dependency layers | 10 | 11 (Tiers 1–8) |
| Documents doing multiple jobs | 3 (DOC-01, DOC-02, DOC-09) | 0 |
| Missing foundational concepts | 3 (meta-model, registry architecture, capability registry) | 0 |
| Document type discipline | Low (most called "Standard") | High (taxonomy, ontology, registry, specification, policy, architecture, model, standard) |
| Registry governance specified | No | Yes (ARCH-03) |
| Auditability vs Observability | Combined | Separated |
| Circular dependencies | 1 (near-circular in failure mode / trust boundary) | 0 (broken by sequencing and forward reference) |
| Phase 3 gate document | DOC-12 | ARCH-14 (ARCH-15 non-blocking for design) |
