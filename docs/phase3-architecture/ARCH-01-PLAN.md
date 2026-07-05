# ARCH-01 — Entity Taxonomy: Complete Pre-Document Mapping

**Status:** PRE-DOCUMENT PLANNING — for review and approval before ARCH-01 is authored
**Date:** 2026-07-02
**Basis:** ARCH-00 meta-model · Phase 1–2.3 certification findings · Master Project Handoff · Master Plan (Phase 3.0.1)
**Constraint:** No assumptions. Every entity type derives from documented evidence.

---

## Mapping Method

Every entity type listed here satisfies all of the following:
1. It has a confirmed source (certification findings, handoff document, or constitutional basis)
2. It cannot be collapsed into another entity type without losing distinct architectural meaning
3. It requires its own Registry Records, Lifecycle, and Ownership rules
4. It participates in at least two distinct Relationship Types

Entity types are assigned to one of twelve Layers. The Layer determines the entity type's governance regime, its Source of Truth domain, and its relationship to the four-layer architecture (Governance / Executive / Operational / Knowledge / Intent / Communication / Capability / Service / Resource / Data / Identity / Physical).

---

## Classification Scheme

### Primary Classification: Civilisation Layer vs Physical Layer

**Civilisation Layer** entities exist as part of the civilisation's logical, governance, and operational structure, independent of any specific implementation. They are first-class architectural objects governed by the full ARCH series.

**Physical Layer** entities represent the implementation of the Civilisation in a specific technical context. They are governed as implementation artifacts. Their primary relationship to Civilisation Layer entities is via the IMPLEMENTS and DEPLOYS Relationship Types.

This distinction is essential. A Memory Record is a Civilisation entity. A database Table that persists Memory Records is a Physical entity. They are governed differently, owned by different Entity Types, and have different audit obligations.

### Secondary Classification: Four Architecture Layers

| Architecture Layer | Purpose | Entity Groups |
|-------------------|---------|---------------|
| Governance | Entities that define and enforce the rules | Governance, Executive |
| Logical | Entities that perform work and hold intent | Operational, Intent |
| Knowledge | Entities that hold and represent information | Knowledge, Communication |
| Runtime | Entities visible during live execution | Capability, Service, Resource, Data, Identity |

Physical Layer entities map across all four layers (a physical file is Governance-layer if it holds a constitution; a physical Route is Runtime-layer).

---

## Layer 1: Governance Entities

Entities that define, enforce, and record the rules governing the Civilisation. No work may be performed without reference to governance entities. These entities are owned at the SOVEREIGN or EXECUTIVE trust level.

---

### ET-GOV-001 — Founder

**Source:** constitution-v1.md Art. 1 ("Absolute authority hierarchy; escalation right; non-delegation of kill switch"); certification INV-A1 through A5 (authentication model); handoff ("Human")

**Definition:** The Founder is the singular human principal of the APEX Civilisation — the sovereign entity at the root of all authority, ownership, and trust. There is exactly one Founder. The Founder Entity has no Owner (it is the root of the ownership graph per ARCH-00 INV-META-38). All other entities in the Civilisation are directly or transitively owned by the Founder.

**Required Attributes:**
- `identity_id` — SOVEREIGN-level canonical Identity
- `canonical_name` — the Founder's name
- `trust_level` — fixed: SOVEREIGN
- `email` — primary communication address
- `status` — ACTIVE (only state; the Founder entity does not have a conventional lifecycle)
- `established_at` — when this entity was first registered

**Optional Attributes:**
- `timezone` — operational timezone
- `communication_preferences` — preferred channels for notifications

**Lifecycle:** REGISTERED → ACTIVE (no terminal state; the Founder entity persists for the life of the Civilisation)

**Ownership Rule:** No owner. Root entity.

**Source of Truth:** Identity Domain (ARCH-04)

**Key Relationships:**
- OWNS → [all other Entities, directly or transitively]
- IS_IDENTIFIED_BY → Identity (ET-IDN-001)
- GOVERNS → Constitution (ET-GOV-002)
- DELEGATES_TO → Council Member (ET-EXE-002)

**Notes:** This is the APEX equivalent of the Digital Twin's principal. All kill-switch procedures, all SOVEREIGN-level amendments, and all override actions are attributed to this entity. Only one instance may exist.

---

### ET-GOV-002 — Constitution

**Source:** constitution-v1.md (8 articles); Scripts/CONSTITUTION.md (6 articles + amendment log); certification Phase 2.3 ("two constitutions confirmed")

**Definition:** A Constitution is a ratified foundational law governing all civilisation behaviour. A Constitution is not a Policy — it is the basis upon which Policies derive their authority. Constitutions are immutable except via a defined amendment process that requires SOVEREIGN authority.

**Required Attributes:**
- `constitution_id` — canonical Identity
- `title` — canonical name of this Constitution
- `version` — current ratified version
- `scope` — what the Constitution governs (Operational, Architectural, or Domain-specific)
- `article_count` — number of ratified articles
- `ratified_at` — date of ratification
- `ratified_by` — Identity of ratifying authority
- `status` — RATIFIED / UNDER_AMENDMENT / SUPERSEDED

**Optional Attributes:**
- `amendment_log` — history of amendments
- `supersedes` — reference to prior Constitution this replaces

**Lifecycle:** DRAFTED → UNDER_REVIEW → RATIFIED → UNDER_AMENDMENT (→ RATIFIED) / SUPERSEDED

**Ownership Rule:** Owned by the Founder (ET-GOV-001)

**Source of Truth:** Governance Domain

**Key Relationships:**
- IS_OWNED_BY → Founder (ET-GOV-001)
- GOVERNS → Policy (ET-GOV-003)
- GOVERNS → all Civilisation Entities (foundational constraint)
- IS_SUPERSEDED_BY → Constitution (when amended to new version)
- IS_ENFORCED_BY → Service (constitutional enforcement services)

**Notes:** APEX currently has two Constitution instances: the Operational Constitution (constitution-v1.md) and the Architectural Constitution (Scripts/CONSTITUTION.md). Both are ET-GOV-002 instances.

---

### ET-GOV-003 — Policy

**Source:** ARCH-00 Section 2 (Policy concept); certification documents (failure mode policy, authority policy); handoff ("Policy")

**Definition:** A Policy is a named, ratified set of Rules governing a specific category of decisions within the Civilisation. Policies derive their authority from a Constitution. A Policy specifies what decisions are required — not how to implement them.

**Required Attributes:**
- `policy_id` — canonical Identity
- `title` — canonical name
- `scope_description` — what decisions this Policy governs
- `constitutional_basis` — reference to the Constitution article from which this Policy derives authority
- `version` — current ratified version
- `status` — DRAFT / RATIFIED / DEPRECATED
- `ratified_by` — Identity of ratifying authority
- `ratified_at` — date
- `enforcement_mechanism` — how violations are detected and reported

**Optional Attributes:**
- `expiry_date` — if time-limited
- `override_conditions` — conditions under which the Policy may be suspended, and by whom

**Lifecycle:** DRAFT → UNDER_REVIEW → RATIFIED → DEPRECATED

**Ownership Rule:** Owned by the Founder or delegated Council Member

**Source of Truth:** Governance Domain

**Key Relationships:**
- CONTAINS → Rule (ET-GOV-004)
- GOVERNS → Capability (ET-CAP-001)
- GOVERNS → Transition (within Lifecycles)
- IS_ENFORCED_AT → Boundary (Gateway entities)
- DERIVES_FROM → Constitution (ET-GOV-002)

---

### ET-GOV-004 — Rule

**Source:** ARCH-00 Section 2 (Rule concept); certification findings (16 architectural contradictions represent Rule violations); handoff ("Rule")

**Definition:** A Rule is an individual, atomic governance statement within a Policy. A Rule declares a condition and a required response and must be independently evaluable as satisfied or violated.

**Required Attributes:**
- `rule_id` — canonical Identity
- `policy_id` — parent Policy reference
- `rule_text` — the formal statement of the rule (condition + required response)
- `enforcement_mode` — MANDATORY or CONDITIONAL
- `severity` — CRITICAL / HIGH / MEDIUM / LOW
- `status` — ACTIVE / SUSPENDED / SUPERSEDED

**Optional Attributes:**
- `reporting_obligation` — must violation produce Evidence
- `violation_response` — what action is taken when violated

**Lifecycle:** ACTIVE → SUSPENDED / SUPERSEDED

**Ownership Rule:** Owned by its parent Policy (and transitively by the Policy's owner)

**Source of Truth:** Governance Domain

**Key Relationships:**
- BELONGS_TO → Policy (ET-GOV-003)
- IS_EVALUATED_AGAINST → Capability invocation, Transition, or Boundary crossing

---

### ET-GOV-005 — Certification

**Source:** ARCH-00 Section 2 (Certification concept); certification Phase 2.3 (25 invariants certified, 4 ENFORCED, 12 PARTIALLY ENFORCED, 7 NOT ENFORCED, 1 SIMULATED ONLY); handoff ("Everything should be measured against the canonical model")

**Definition:** A Certification is a formal, evidence-backed verdict on whether a specific architectural Constraint, invariant, or Policy Rule is satisfied within the Civilisation at a specific point in time.

**Required Attributes:**
- `certification_id` — canonical Identity
- `subject_ref` — the Constraint, invariant, or Rule being certified
- `verdict` — ENFORCED / PARTIALLY ENFORCED / NOT ENFORCED / SIMULATED ONLY / UNKNOWN
- `evidence_refs` — references to Evidence Records supporting the verdict
- `issued_by` — Identity of certifying authority
- `issued_at` — timestamp
- `scope` — what part of the system the Certification covers
- `validity_period` — duration before re-certification is required

**Optional Attributes:**
- `remediation_notes` — for non-ENFORCED verdicts

**Lifecycle:** ISSUED → VALID → EXPIRED / SUPERSEDED

**Ownership Rule:** Owned by the Governance authority that issued it

**Source of Truth:** Governance Domain

**Key Relationships:**
- IS_SUPPORTED_BY → Evidence Record (ET-KNW-004)
- CONCERNS → architectural Constraint or Rule
- SUPERSEDES → prior Certification for the same subject

---

### ET-GOV-006 — Amendment

**Source:** constitution-v1.md Art. 8 (Amendment Process); Scripts/CONSTITUTION.md amendment log (4 entries); ARCH-00 Section 6 (Meta-Model Governance)

**Definition:** An Amendment is a ratified change to a Constitution or architectural specification (ARCH document). An Amendment records the change, its justification, its impact, the authority that ratified it, and the version it produces.

**Required Attributes:**
- `amendment_id` — canonical Identity
- `target_ref` — the Constitution or ARCH document being amended
- `change_type` — MAJOR / MINOR / PATCH
- `change_description` — what is being changed and why
- `proposed_by` — Identity of proposing entity
- `reviewed_by` — CRO and CLO reference (constitutional requirement)
- `ratified_by` — SOVEREIGN Identity
- `ratified_at` — timestamp
- `version_produced` — the new version number after this Amendment

**Lifecycle:** PROPOSED → UNDER_REVIEW → RATIFIED / REJECTED

**Ownership Rule:** Owned by the Founder

**Source of Truth:** Governance Domain

**Key Relationships:**
- MODIFIES → Constitution (ET-GOV-002) or ARCH specification
- IS_RATIFIED_BY → Founder (ET-GOV-001)
- PRODUCES → new Version of the target document

---

### ET-GOV-007 — External Contact

**Source:** Handoff ("Human" — other humans the Civilisation interacts with); operational reality of a personal AI OS that manages relationships with external parties

**Definition:** An External Contact is a human entity outside the Civilisation who has a defined relationship with the Founder or with Civilisation operations. External Contacts do not hold Civilisation authority but may be referenced in Goals, Projects, and Knowledge.

**Required Attributes:**
- `contact_id` — canonical Identity
- `name` — canonical name
- `contact_type` — PERSONAL / PROFESSIONAL / INSTITUTIONAL
- `relationship_to_founder` — description of the relationship
- `communication_channels` — how to reach this contact
- `status` — ACTIVE / INACTIVE / ARCHIVED

**Lifecycle:** REGISTERED → ACTIVE → INACTIVE → ARCHIVED

**Ownership Rule:** Owned by the Founder

**Source of Truth:** Identity Domain

---

### ET-GOV-008 — External Organisation

**Source:** Handoff ("Organization"); operational reality of tracking employer, service providers, institutions

**Definition:** An External Organisation is an institutional entity outside the Civilisation that the Founder or the Civilisation has a relationship with. External Organisations are referenced in Goals, Projects, and Budget entities.

**Required Attributes:**
- `org_id` — canonical Identity
- `name` — canonical name
- `org_type` — EMPLOYER / CLIENT / SERVICE_PROVIDER / EDUCATIONAL / GOVERNMENT / OTHER
- `relationship_to_civilisation` — nature of the relationship
- `status` — ACTIVE / INACTIVE / ARCHIVED

**Lifecycle:** REGISTERED → ACTIVE → INACTIVE → ARCHIVED

**Ownership Rule:** Owned by the Founder

**Source of Truth:** Identity Domain

---

## Layer 2: Executive Entities

Entities constituting the leadership and governance structure of the Civilisation. Executive entities hold delegated EXECUTIVE or OPERATIONAL authority from the Founder.

---

### ET-EXE-001 — Council

**Source:** constitution-v1.md Art. 6 ("Council budget cap < $500/month"); certification findings (executive-council.js, ENTITIES array, VOTING_ENTITIES); executive-council.js runtime analysis (deliberate(), Step 10 — executive_deliberations and executive_votes)

**Definition:** The Council is the collective executive body of the Civilisation. It is not an individual entity but a governing assembly whose authority derives from the collective decisions of its Council Members. The Council deliberates, votes, and produces binding Decision Records within its constitutional authority.

**Required Attributes:**
- `council_id` — canonical Identity
- `name` — canonical name (e.g., "APEX Executive Council")
- `member_count` — current number of active Council Members
- `quorum_requirement` — minimum members required for a valid deliberation
- `budget_cap` — monthly budget authority (constitutionally capped at $500/month)
- `status` — ACTIVE / SUSPENDED / DISSOLVED

**Lifecycle:** CONSTITUTED → ACTIVE → SUSPENDED → DISSOLVED

**Ownership Rule:** Owned by the Founder

**Source of Truth:** Executive Domain

**Key Relationships:**
- CONTAINS → Council Member (ET-EXE-002)
- DELIBERATES_ON → Deliberation (ET-EXE-004)
- IS_GOVERNED_BY → Constitution (ET-GOV-002)
- REPORTS_TO → Founder (ET-GOV-001)

---

### ET-EXE-002 — Council Member

**Source:** constitution-v1.md Art. 6; certification findings (ENTITIES = [ceo, coo, cso, cgo, cro, clo, cho], VOTING_ENTITIES — CHO, CLO, CRO NOT in VOTING_ENTITIES); executive-council.js (all 6 executive files read); vault specs for CSO, CGO, CRO, CLO, CHO

**Definition:** A Council Member is an individual executive entity within the Council, holding a defined role with specific domain responsibility and authority. Council Members are AI-governed entities — they operate under AI models but represent specific executive perspectives. APEX has seven defined roles: CEO (Chief Executive), COO (Chief Operating), CSO (Chief Strategy), CGO (Chief Governance), CRO (Chief Risk), CLO (Chief Legal), CHO (Chief Human).

**Required Attributes:**
- `member_id` — canonical Identity
- `role_title` — canonical role (CEO / COO / CSO / CGO / CRO / CLO / CHO)
- `role_abbreviation` — three-letter code
- `domain_responsibility` — the domain this executive oversees
- `has_vote` — boolean (CEO, COO, CSO, CGO have votes; CRO, CLO, CHO confirmed NOT in VOTING_ENTITIES)
- `authority_level` — EXECUTIVE
- `status` — ACTIVE / RECUSED / SUSPENDED
- `implementation_ref` — reference to the implementing Service

**Optional Attributes:**
- `specialisation_notes` — domain-specific notes from vault specs

**Lifecycle:** APPOINTED → ACTIVE → RECUSED → SUSPENDED → RETIRED

**Ownership Rule:** Owned by the Council (ET-EXE-001), which is owned by the Founder

**Source of Truth:** Executive Domain

**Key Relationships:**
- IS_MEMBER_OF → Council (ET-EXE-001)
- SUPERVISES → Ministry (ET-EXE-003)
- VOTES_ON → Deliberation (ET-EXE-004) [only if has_vote = true]
- IS_IMPLEMENTED_BY → Service (ET-SVC-001)

**Notes:** The non-voting status of CRO, CLO, CHO is a confirmed architectural fact from Phase 2.2. This must be captured as an Attribute, not left implicit. CEO implementation file confirmed absent (UR01 unresolved unknown).

---

### ET-EXE-003 — Ministry

**Source:** certification findings ("Ministry system runtime: UNRESOLVED — appears design-only"); constitution-v1.md Art. 6 ("Ministry cross-domain actions require Council approval"); handoff document

**Definition:** A Ministry is a functional unit responsible for a specific Domain of the Civilisation's operations. Ministries are governed at the OPERATIONAL trust level and report to Council Members. The Ministry system was confirmed as design-only in Phase 2.2 — no runtime code was found. Ministries are registered as entities but have no active implementation.

**Required Attributes:**
- `ministry_id` — canonical Identity
- `name` — canonical name
- `domain_responsibility` — the Domain this Ministry oversees
- `supervising_council_member` — reference to ET-EXE-002
- `authority_level` — OPERATIONAL
- `implementation_status` — DESIGN_ONLY / PARTIAL / IMPLEMENTED
- `status` — REGISTERED / ACTIVE / INACTIVE

**Lifecycle:** PROPOSED → REGISTERED → ACTIVE / INACTIVE

**Ownership Rule:** Owned by its supervising Council Member

**Source of Truth:** Executive Domain

**Notes:** Must carry `implementation_status` = DESIGN_ONLY at initial registration, reflecting the Phase 2.2 finding. No runtime code confirmed.

---

### ET-EXE-004 — Deliberation

**Source:** certification findings (executive-council.js Step 10 writes to executive_deliberations table; UN02 — whether writes are awaited or fire-and-forget); certification INV-F1 (Executive decisions require full council: NOT ENFORCED)

**Definition:** A Deliberation is a formal, structured executive decision-making process conducted by the Council. A Deliberation has a defined subject, a quorum requirement, a set of Votes from participating Council Members, and a resulting Decision Record.

**Required Attributes:**
- `deliberation_id` — canonical Identity
- `subject` — what decision is being deliberated
- `initiated_by` — Identity of entity that initiated the deliberation
- `quorum_met` — boolean
- `participating_members` — list of Council Member refs
- `status` — OPEN / QUORUM_MET / CONCLUDED / ABANDONED
- `initiated_at` — timestamp
- `concluded_at` — timestamp (when status reaches CONCLUDED)

**Lifecycle:** OPEN → QUORUM_MET → CONCLUDED / ABANDONED

**Ownership Rule:** Owned by the Council

**Source of Truth:** Executive Domain

**Key Relationships:**
- IS_CONDUCTED_BY → Council (ET-EXE-001)
- HAS → Vote (ET-EXE-005)
- PRODUCES → Decision Record (ET-EXE-006)

---

### ET-EXE-005 — Vote

**Source:** certification findings (executive-council.js deliberate() records votes to executive_votes table); INV-F1 (full council requirement not enforced — votes may be missing)

**Definition:** A Vote is the formal recorded position of a Council Member on a specific Deliberation. Each Vote carries a position (FOR / AGAINST / ABSTAIN) and a rationale.

**Required Attributes:**
- `vote_id` — canonical Identity
- `deliberation_id` — parent Deliberation reference
- `council_member_id` — the voting Council Member
- `position` — FOR / AGAINST / ABSTAIN
- `rationale` — the reasoning behind the position
- `cast_at` — timestamp

**Lifecycle:** CAST (terminal — a Vote is immutable after casting)

**Ownership Rule:** Owned by the casting Council Member

**Source of Truth:** Executive Domain

**Key Relationships:**
- BELONGS_TO → Deliberation (ET-EXE-004)
- IS_CAST_BY → Council Member (ET-EXE-002)

---

### ET-EXE-006 — Decision Record

**Source:** certification findings (executive_deliberations table writes; INV-F1 NOT ENFORCED; C09 Strategic planning is ephemeral); constitution-v1.md Art. 3 (evidence chain)

**Definition:** A Decision Record is the formal outcome of a completed Deliberation. It records what was decided, the vote distribution, the rationale, and the authority under which the decision was made. Decision Records are immutable Evidence.

**Required Attributes:**
- `decision_id` — canonical Identity
- `deliberation_id` — parent Deliberation reference
- `decision_text` — the formal decision
- `vote_distribution` — FOR count, AGAINST count, ABSTAIN count
- `decided_by` — Council Identity
- `decided_at` — timestamp
- `constitutional_basis` — which constitutional authority permits this decision
- `binding` — boolean (whether this decision obligates action)

**Lifecycle:** ISSUED (terminal — immutable once issued)

**Ownership Rule:** Owned by the Council

**Source of Truth:** Executive Domain / Evidence chain

---

## Layer 3: Operational Entities

Entities that perform bounded work within the Civilisation. Operational entities are the runtime actors — they execute, process, and produce outputs.

---

### ET-OPS-001 — Agent

**Source:** certification findings (agent-task-cycle.js, master-orchestrator.js, dynamic-agent-selector.js, agent-queue.js); handoff ("Agent"); constitution-v1.md Art. 6 ("Agents limited to assigned stage only"); ARCH-00 ("Agent" referenced throughout)

**Definition:** An Agent is an autonomous operational entity that executes Agent Tasks using registered Capabilities, operating within its assigned stage and within the bounds of its AUTONOMY_LEVEL. Agents are the primary workforce of the Civilisation. An Agent operates under a specific identity, holds TASK-level authority, and is subject to all capability and authority constraints.

**Required Attributes:**
- `agent_id` — canonical Identity
- `agent_name` — human-readable name
- `agent_type` — the classification of this agent (SYSTEM / FILE / UNI / FINANCE / BUSINESS / MASTER_ORCHESTRATOR or domain-specific)
- `assigned_stage` — which lifecycle stage this agent operates in
- `autonomy_level` — 1 / 2 / 3 (governs approval requirement — current production: 3)
- `authority_level` — TASK
- `model_tier` — the default Model Tier used by this agent
- `status` — REGISTERED / ACTIVE / SUSPENDED / RETIRED
- `reputation_score` — current reputation (from apex_agent_runs, per ET-OPS-002)
- `registered_at` — timestamp

**Optional Attributes:**
- `capability_restrictions` — Capabilities this agent is explicitly excluded from
- `budget_allocation` — Resource budget allocated to this agent

**Lifecycle:** REGISTERED → ACTIVE → SUSPENDED → RETIRED

**Ownership Rule:** Owned by its assigned Ministry or Council Member

**Source of Truth:** Agent Domain

**Key Relationships:**
- EXECUTES → Agent Task (ET-OPS-002)
- INVOKES → Capability (ET-CAP-001)
- IS_GOVERNED_BY → Policy (ET-GOV-003)
- PRODUCES → Evidence Record (ET-KNW-004)
- LEARNS_FROM → Lesson (ET-KNW-002)
- REFLECTS_ON → Memory Record (ET-KNW-001)
- USES → Model (ET-CAP-003)

---

### ET-OPS-002 — Agent Task

**Source:** certification findings (agent-task-cycle.js 8-type allowlist, MAX_QUEUE_DEPTH=50, apex_agent_runs table; agent-queue.js AGENT_STARTED / AGENT_COMPLETED events); INV-E1 (Agents require approval before execution: PARTIALLY ENFORCED)

**Definition:** An Agent Task is a bounded unit of work assigned to a specific Agent, with a defined input, a set of execution steps, a defined output, and a full Lifecycle. Agent Tasks are the canonical unit of agent work — everything an Agent does is expressed as a Task.

**Required Attributes:**
- `task_id` — canonical Identity
- `assigned_agent_id` — the Agent responsible for execution
- `task_type` — the classification of work (drawn from the Capability Registry)
- `input_description` — what the Task requires to begin
- `steps` — the ordered list of Capability invocations constituting this Task
- `autonomy_level_at_creation` — the AUTONOMY_LEVEL when the Task was created (determines approval requirement)
- `status` — PLANNED / APPROVED / QUEUED / EXECUTING / COMPLETED / FAILED / CANCELLED / FORCE_TERMINATED
- `created_at` — timestamp
- `started_at` — timestamp (when EXECUTING begins)
- `completed_at` — timestamp (when terminal state reached)
- `outcome` — the result of the Task (populated on COMPLETED or FAILED)

**Optional Attributes:**
- `budget_reserved` — Resource reserved for this Task
- `budget_consumed` — actual Resource consumption
- `parent_workflow_id` — if this Task is part of a Workflow Run

**Lifecycle:** PLANNED → APPROVED → QUEUED → EXECUTING → COMPLETED / FAILED / CANCELLED / FORCE_TERMINATED

**Ownership Rule:** Owned by the executing Agent

**Source of Truth:** Agent Execution Domain (apex_agent_runs table in current implementation)

**Key Relationships:**
- IS_EXECUTED_BY → Agent (ET-OPS-001)
- IS_PART_OF → Workflow Run (ET-OPS-003) [optional]
- INVOKES → Capability (ET-CAP-001) [at each step]
- PRODUCES → Evidence Record / Audit Record
- PRODUCES → Reflection (ET-KNW-008) [on completion]

**Notes:** Step type allowlist confirmed: create_document, create_workspace_file, summarize_document, rename_document, delete_document, list_documents, list_files, search_documents. AUTONOMY_LEVEL=3 bypasses the PLANNED→APPROVED transition.

---

### ET-OPS-003 — Workflow Run

**Source:** ARCH-00 (Workflow concept); master-orchestrator.js (max 3 concurrent workstreams, planFeature, markFeatureComplete); handoff ("Workflow")

**Definition:** A Workflow Run is an instance of a Workflow being executed. A Workflow Run has a parent Workflow (the template), a specific set of inputs, an ordered history of Agent Task executions, and a terminal outcome.

**Required Attributes:**
- `run_id` — canonical Identity
- `workflow_id` — the Workflow template this Run instantiates
- `triggered_by` — the Entity that initiated this Run
- `input_context` — the specific inputs to this Run
- `status` — INITIATED / IN_PROGRESS / COMPLETED / FAILED / ABANDONED
- `started_at` — timestamp
- `completed_at` — timestamp

**Lifecycle:** INITIATED → IN_PROGRESS → COMPLETED / FAILED / ABANDONED

**Ownership Rule:** Owned by the triggering entity's owner

**Source of Truth:** Agent Execution Domain

---

### ET-OPS-004 — Schedule

**Source:** certification findings (runDueSchedules in agent-task-cycle.js sequential execution; cron routes; adaptation_refresh cron UR14 unresolved; weekly_review cron UR15 unresolved); handoff ("Scheduler", "Queue")

**Definition:** A Schedule is a logical specification for recurring Process or Workflow execution. A Schedule defines the trigger pattern (time-based, event-based, or condition-based), the Process or Workflow to trigger, and the authority under which execution occurs.

**Required Attributes:**
- `schedule_id` — canonical Identity
- `schedule_name` — canonical name
- `trigger_type` — TIME_BASED / EVENT_BASED / CONDITION_BASED
- `trigger_specification` — the cron expression, event type, or condition
- `target_workflow_id` or `target_process_id` — what is triggered
- `authority_level_required` — minimum trust level for schedule execution
- `status` — ACTIVE / PAUSED / DISABLED
- `last_triggered_at` — timestamp
- `next_trigger_at` — timestamp (for TIME_BASED)
- `implementation_ref` — reference to Physical Cron Schedule (ET-PHY-012)

**Lifecycle:** REGISTERED → ACTIVE → PAUSED → DISABLED

**Ownership Rule:** Owned by the Ministry or Service responsible for the scheduled process

**Source of Truth:** Operations Domain

---

### ET-OPS-005 — Queue

**Source:** certification findings (agent-queue.js MAX_CONCURRENCY=3, MAX_QUEUE_DEPTH=50, dedup by id, AGENT_COMPLETED/AGENT_STARTED events); handoff ("Queue")

**Definition:** A Queue is an ordered collection of pending work items awaiting execution. A Queue governs the sequencing, priority, and concurrency of work. The Agent Queue is the primary Queue instance in APEX.

**Required Attributes:**
- `queue_id` — canonical Identity
- `queue_name` — canonical name
- `queue_type` — AGENT_TASK / EVENT / NOTIFICATION / OTHER
- `max_depth` — maximum queue depth (50 in current Agent Queue)
- `max_concurrency` — concurrent processing capacity (3 in current Agent Queue)
- `deduplication_key` — how duplicate entries are detected (by id in current implementation)
- `overflow_policy` — DROP / REJECT / BLOCK
- `status` — ACTIVE / PAUSED / FULL

**Lifecycle:** CREATED → ACTIVE → PAUSED → DRAINED → DECOMMISSIONED

**Ownership Rule:** Owned by the Service that manages the Queue

**Source of Truth:** Operations Domain

---

## Layer 4: Knowledge Entities

Entities that hold, represent, and preserve information and understanding across the Civilisation.

---

### ET-KNW-001 — Memory Record

**Source:** certification findings (semantic_memory, episodic_memory, procedural_memory, decision_memory tables; access-controller; memory-governor; reflexion-tracker; 5 confirmed write paths bypassing gateway; gateway.js storeMemory()); INV-D1 through D4; C01 (memory-governor contradiction)

**Definition:** A Memory Record is a governed persistence unit of Knowledge retained by the Civilisation. Memory Records are classified by type, each type having a distinct schema, Lifecycle, and Source of Truth. The five Memory Record types are: SEMANTIC (structured facts about the world), EPISODIC (records of specific past interactions), PROCEDURAL (knowledge of how to perform tasks), DECISION (records of past decisions and their outcomes), WORKING (transient context for an active session).

**Required Attributes:**
- `memory_id` — canonical Identity
- `memory_type` — SEMANTIC / EPISODIC / PROCEDURAL / DECISION / WORKING
- `content` — the retained knowledge
- `content_hash` — SHA-256 of content (for integrity and deduplication)
- `owner_id` — the Entity that created or owns this record
- `created_at` — timestamp
- `status` — ACTIVE / COMPRESSED / ARCHIVED / EXPIRED

**Optional Attributes:**
- `embedding_vector` — for semantic similarity retrieval
- `confidence_score` — certainty level (0.0–1.0)
- `source_session_id` — the Session in which this was created
- `relevance_tags` — subject tags for retrieval
- `compression_summary_id` — reference to summary record if this record is compressed
- `decision_link_id` — for DECISION type: link to the Decision Record (NOTE: Bug B1 — this is always null in current implementation due to wrong column query)

**Lifecycle:** CREATED → ACTIVE → COMPRESSED → ARCHIVED → EXPIRED

**Ownership Rule:** Owned by the Agent or Service that created it, ultimately by the Founder

**Source of Truth:** Memory Domain (each sub-type has its own Source of Truth table — ARCH-10 will specify)

**Notes:** Bug B1 (reflexion-tracker: `decisionMemoryId` always null — queries `'id'` instead of `'memory_id'`) and Bug B4 (getSuccessRate reads wrong table) are known defects. Certification finding: 5+ write paths bypass the gateway — this must be classified as a Constraint violation in ARCH-10.

---

### ET-KNW-002 — Lesson

**Source:** certification findings (reflection-engine.js scoreLessonText 4 dimensions; generateReflectionLesson uses Haiku; obsidian-memory.js logLesson SHA-1 dedup; _lessonBuffer[50] _lessonHashes[200])

**Definition:** A Lesson is a crystallised, reusable insight extracted from episodic experience. Lessons are produced by the reflection process and stored in both the Memory system and the Obsidian vault. Lessons are scored on four dimensions and are used to inform future Agent behaviour.

**Required Attributes:**
- `lesson_id` — canonical Identity
- `lesson_text` — the insight statement
- `source_episode_id` — the Episodic Memory Record from which this Lesson was extracted
- `score_dimensions` — scores on the four evaluation dimensions (from scoreLessonText)
- `overall_score` — composite score
- `sha1_hash` — SHA-1 for deduplication
- `created_at` — timestamp
- `status` — ACTIVE / SUPERSEDED / ARCHIVED

**Lifecycle:** EXTRACTED → ACTIVE → SUPERSEDED / ARCHIVED

**Ownership Rule:** Owned by the Agent that generated the reflection, ultimately by the Founder

**Source of Truth:** Knowledge Domain (persisted to both Supabase and Obsidian vault — ARCH-13 governs the authority designation)

---

### ET-KNW-003 — Knowledge Article

**Source:** handoff ("Knowledge Source", "Document"); chat-context.js (buildPrompt 13 blocks including KNOWLEDGE CONNECTIONS up to 4); lib/apex-tools.js (toolWebSearch, web knowledge integration)

**Definition:** A Knowledge Article is a structured unit of domain knowledge that the Civilisation holds about a subject. Unlike Memory Records (which record past experiences), Knowledge Articles represent stable, reference-quality information. Knowledge Articles may originate from external search, from deliberation, or from the Founder.

**Required Attributes:**
- `article_id` — canonical Identity
- `title` — canonical name
- `content` — the knowledge content
- `domain` — which Domain this knowledge belongs to
- `source_type` — INTERNAL / WEB_SEARCH / FOUNDER_INPUT / AGENT_GENERATED
- `source_ref` — where this knowledge came from
- `confidence` — HIGH / MEDIUM / LOW
- `created_at` — timestamp
- `status` — ACTIVE / SUPERSEDED / ARCHIVED

**Lifecycle:** CREATED → ACTIVE → SUPERSEDED / ARCHIVED

**Ownership Rule:** Owned by the Service or Agent that created it

**Source of Truth:** Knowledge Domain

---

### ET-KNW-004 — Evidence Record

**Source:** ARCH-00 Section 2 (Evidence concept); constitution-v1.md Art. 3 (immutable evidence chain); certification findings (governance.js `_w()` fire-and-forget, C03 evidence chain gaps); Contradiction C03 (chain gaps undetectable)

**Definition:** An Evidence Record is an immutable, provenance-bearing, cryptographically chain-linked record asserting that a specific occurrence happened. Evidence Records are the constitutional mechanism for traceability (Art. 3 of constitution-v1.md). They form an append-only chain where each record includes the hash of its predecessor.

**Required Attributes:**
- `evidence_id` — canonical Identity
- `evidence_type` — the category of occurrence being evidenced
- `subject_entity_id` — the Entity this Evidence concerns
- `actor_identity_id` — whose action or observation produced this Evidence
- `operation_type` — what operation produced this Evidence
- `outcome` — SUCCESS / FAILURE / PARTIAL
- `chain_hash` — SHA-256 of the preceding Evidence Record in the chain
- `chain_link_id` — Identity of the preceding Evidence Record
- `created_at` — timestamp
- `immutable` — always true; may not be modified after creation

**Optional Attributes:**
- `governance_score_delta` — impact on the Civilisation's governance score
- `payload` — structured data supporting the assertion
- `constitutional_impact` — which constitutional article this Evidence relates to

**Lifecycle:** CREATED (terminal — immutable, no further states)

**Ownership Rule:** Owned by the Governance system

**Source of Truth:** Evidence Domain (authoritative, append-only)

**Notes:** Current implementation defect: governance.js `_w()` wrapper uses fire-and-forget — Evidence Records can be silently lost. This violates constitution-v1.md Art. 3 and must be classified as NOT ENFORCED.

---

### ET-KNW-005 — Audit Record

**Source:** civilization-kernel.js (setImmediate post-response: episodic write + decision write + audit log append); certification findings (FIRE-AND-FORGET classification for post-response hooks); INV-H1 (all failures produce telemetry: NOT ENFORCED)

**Definition:** An Audit Record is a specialised Evidence Record that specifically records a governed action: a Boundary crossing, a Capability invocation, a Lifecycle Transition, or a Governance decision. Every Audit Record is also an Evidence Record, but it carries additional fields required for governance score computation.

**Required Attributes:**
- Inherits all Evidence Record (ET-KNW-004) Required Attributes
- `boundary_crossed` — which Boundary was crossed, if applicable
- `capability_invoked` — which Capability was invoked, if applicable
- `lifecycle_transition` — which Transition occurred, if applicable
- `governance_score_impact` — quantified impact on governance score

**Lifecycle:** CREATED (terminal — inherits from Evidence Record)

**Ownership Rule:** Owned by the Governance system

**Source of Truth:** Evidence Domain

**Notes:** Audit Records are currently best-effort (post-response hooks are FIRE-AND-FORGET). This is a critical architectural defect per constitution-v1.md Art. 3.

---

### ET-KNW-006 — Observation

**Source:** ARCH-00 Section 2 (Observation concept); health/monitor.js (recordProviderCall, recordRetrievalCall, recordReflexionWrite, recordPolicyRetrieval); telemetry/aggregator.js (computeCivilizationHealth — DATA-5 comment, snapshot disabled)

**Definition:** An Observation is a structured record of a perception made by a Service or Agent about something that occurred or existed. Observations are the raw material from which Evidence and Metrics are produced. Unlike Evidence Records, Observations may be modified before they are validated into Evidence.

**Required Attributes:**
- `observation_id` — canonical Identity
- `observer_id` — the Entity making the Observation
- `subject_id` — what is being observed
- `observation_type` — what aspect is being observed
- `observed_value` — the observed state or value
- `observed_at` — timestamp
- `validated` — boolean (false until converted to Evidence)

**Lifecycle:** RECORDED → VALIDATED (→ Evidence) / DISCARDED

**Ownership Rule:** Owned by the observing Service or Agent

**Source of Truth:** Operations Domain (transient; Observations are not preserved indefinitely)

---

### ET-KNW-007 — Metric

**Source:** certification findings (health/monitor.js _state in-memory; telemetry/aggregator.js; civilization_health_snapshots table UR12 partially resolved — dimensions column confirmed; health check response fields); INV-H1 (NOT ENFORCED); C06 (aggregator does not write health scores)

**Definition:** A Metric is a quantifiable measurement of a specific operational aspect of the Civilisation. Metrics support governance score computation, health monitoring, and Objective measurement. APEX defines metrics at multiple levels: provider health, retrieval success, reflexion quality, policy compliance.

**Required Attributes:**
- `metric_id` — canonical Identity
- `metric_name` — canonical name
- `metric_type` — GAUGE / COUNTER / RATIO / SCORE
- `subject_entity_id` — what is being measured
- `current_value` — current measurement
- `unit` — unit of measurement
- `collection_methodology` — how the value is determined
- `sampled_at` — timestamp of current value

**Optional Attributes:**
- `threshold_warning` — value at which a warning Event is emitted
- `threshold_critical` — value at which a critical Event is emitted
- `history` — retained historical values

**Lifecycle:** ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the monitoring Service

**Source of Truth:** Operations Domain (health metrics); Governance Domain (governance score metrics)

---

### ET-KNW-008 — Reflection

**Source:** certification findings (reflection-engine.js; agent-task-cycle.js reflexion influence tracking on completion; reflexion-tracker.js Bug B1 — decisionMemoryId always null); C04 (reflexion-tracker records null decision links)

**Definition:** A Reflection is a synthesised analysis of past Agent behaviour patterns and outcomes, used to improve future performance. Reflections are produced by the reflection engine after task completion or on a periodic schedule. A Reflection contains scored Lessons and adaptation recommendations.

**Required Attributes:**
- `reflection_id` — canonical Identity
- `agent_id` — the Agent this Reflection concerns
- `source_task_ids` — the Agent Tasks that triggered this Reflection
- `lessons_produced` — references to Lesson entities (ET-KNW-002) produced
- `adaptation_recommendations` — structured recommendations for future behaviour
- `produced_by_model` — which Model produced this Reflection
- `created_at` — timestamp

**Lifecycle:** CREATED → APPLIED / ARCHIVED

**Ownership Rule:** Owned by the Agent it concerns

**Source of Truth:** Knowledge Domain

---

### ET-KNW-009 — Document

**Source:** agent-task-cycle.js (8-type step allowlist includes create_document, summarize_document, rename_document, delete_document); handoff ("Document"); obsidian-memory.js (write(), append() to vault documents)

**Definition:** A Document is a structured knowledge artifact within the Civilisation — a file-level unit of content with a defined purpose, owner, and location. Documents differ from Knowledge Articles (which are machine-maintained) and from Files (which are physical artifacts) — a Document is a governed content entity with full metadata.

**Required Attributes:**
- `document_id` — canonical Identity
- `title` — canonical name
- `document_type` — SPECIFICATION / POLICY / REPORT / PLAN / REFERENCE / LOG / VAULT_ENTRY
- `owner_id` — the Entity responsible for this Document
- `content_ref` — reference to where content is physically stored (links to ET-PHY-003)
- `created_at` — timestamp
- `updated_at` — timestamp
- `status` — DRAFT / ACTIVE / ARCHIVED / SUPERSEDED

**Lifecycle:** DRAFT → ACTIVE → ARCHIVED / SUPERSEDED

**Ownership Rule:** Owned by its creator or the relevant Domain's governing entity

**Source of Truth:** Knowledge Domain (metadata); Physical Domain (content)

---

## Layer 5: Intent Entities

Entities that represent purpose, planning, and direction — what the Civilisation intends to achieve.

---

### ET-INT-001 — Goal

**Source:** certification findings (C13 — two independent goal systems: goal-graph.js Supabase single row vs agent-system/goal-tracker.js filesystem JSON; INV-G1/G2 NOT ENFORCED); handoff ("Goal"); ARCH-00 (Goal concept)

**Definition:** A Goal is a declared desired future state of the Civilisation or a component thereof. Goals express what the Civilisation intends to achieve. APEX currently has two independent goal systems — this is a confirmed architectural contradiction (C13). ARCH-01 defines a single canonical Goal entity type; ARCH-05 will designate a single Source of Truth for Goals.

**Required Attributes:**
- `goal_id` — canonical Identity
- `title` — canonical name
- `description` — the desired future state (outcome-expressed, not activity-expressed)
- `owner_id` — the Entity accountable for this Goal
- `goal_horizon` — SHORT_TERM / MEDIUM_TERM / LONG_TERM / VISIONARY
- `constitutional_alignment` — which constitutional article motivates this Goal
- `status` — DECLARED / ACTIVE / ACHIEVED / ABANDONED
- `declared_at` — timestamp

**Optional Attributes:**
- `target_date` — by when
- `priority` — relative priority among active Goals

**Lifecycle:** DECLARED → ACTIVE → ACHIEVED / ABANDONED

**Ownership Rule:** Owned by the Founder or delegated Council Member

**Source of Truth:** Intent Domain (one authoritative source — to be designated in ARCH-05; the C13 split must be resolved)

**Key Relationships:**
- HAS → Objective (ET-INT-002)
- IS_PURSUED_BY → Project (ET-INT-003)

---

### ET-INT-002 — Objective

**Source:** ARCH-00 (Objective concept); handoff (goals hierarchy implied); strategic-planning-engine.js (OBJECTIVE_TTL_MS=2h — all objectives expire; confirms C09: strategic planning is ephemeral)

**Definition:** An Objective is a specific, measurable sub-goal that, when achieved, constitutes progress toward a parent Goal. Objectives are the measurement units of Goal progress.

**Required Attributes:**
- `objective_id` — canonical Identity
- `parent_goal_id` — the Goal this Objective serves
- `title` — canonical name
- `success_criterion` — what must be true for this Objective to be MET
- `measurement_metric_id` — the Metric measuring progress
- `status` — PENDING / ACTIVE / MET / MISSED / DEFERRED
- `created_at` — timestamp

**Optional Attributes:**
- `target_date` — by when
- `weight` — contribution to overall Goal achievement

**Lifecycle:** PENDING → ACTIVE → MET / MISSED / DEFERRED

**Ownership Rule:** Owned by the parent Goal's owner

**Source of Truth:** Intent Domain

**Notes:** Current implementation stores Objectives in-memory via strategic-planning-engine.js with 2-hour TTL. This is confirmed dead on restart (C09). ARCH-01 requires persistent Objectives — the implementation defect does not define the entity type.

---

### ET-INT-003 — Project

**Source:** ARCH-00 (Project concept); handoff ("Project"); master-orchestrator.js (planFeature, runMasterOrchestrator max 3 concurrent workstreams)

**Definition:** A Project is a bounded, purposeful initiative pursuing one or more Goals through a defined set of Workflows and Resource allocations. Projects are tracked from inception through completion or abandonment.

**Required Attributes:**
- `project_id` — canonical Identity
- `title` — canonical name
- `parent_goal_ids` — Goals this Project pursues
- `owner_id` — accountable Entity
- `scope` — what is included and excluded
- `budget_id` — Resource allocation reference
- `status` — PROPOSED / APPROVED / ACTIVE / COMPLETED / ABANDONED
- `started_at` — timestamp

**Lifecycle:** PROPOSED → APPROVED → ACTIVE → COMPLETED / ABANDONED

**Ownership Rule:** Owned by the Founder or delegated Council Member

**Source of Truth:** Intent Domain

---

### ET-INT-004 — Milestone

**Source:** handoff (implied by Project/Goal structure); master-orchestrator.js (markFeatureComplete commits — each completion is a milestone-level event)

**Definition:** A Milestone is a significant, predefined point in a Project's execution that marks the completion of a phase or the achievement of a meaningful threshold. Milestones provide checkpoints for governance review.

**Required Attributes:**
- `milestone_id` — canonical Identity
- `parent_project_id` — the Project this Milestone belongs to
- `title` — canonical name
- `completion_criterion` — what must be true for this Milestone to be REACHED
- `status` — PENDING / REACHED / MISSED
- `target_date` — when this Milestone is expected

**Lifecycle:** PENDING → REACHED / MISSED

**Ownership Rule:** Owned by the parent Project's owner

**Source of Truth:** Intent Domain

---

## Layer 6: Communication Entities

Entities that transmit information, signal state changes, and maintain interaction context.

---

### ET-COM-001 — Event

**Source:** certification findings (lib/event-bus.js — 16 EVENTS, setImmediate dispatch, wildcard '*', maxListeners 100, rolling _log[200]; BACKGROUND_TASK_QUEUED, AGENT_STARTED, AGENT_COMPLETED etc.); ARCH-00 (Event concept); INV-H1 (NOT ENFORCED)

**Definition:** An Event is an immutable announcement that an occurrence has taken place within the Civilisation. Events are the canonical mechanism for propagating state changes to all interested parties without polling. Events must carry a canonical type registered in the Event Type Registry.

**Required Attributes:**
- `event_id` — canonical Identity (UUID v4)
- `event_type` — registered Event Type (one of the 16 canonical types + any admitted additions)
- `emitted_by_id` — the Entity that emitted this Event
- `emitted_at` — timestamp
- `idempotency_key` — allows duplicate detection by consumers
- `content_hash` — SHA-256 of payload
- `correlation_id` — links to a parent Workflow Run or Session
- `schema_version` — which version of the Event Type schema this Event conforms to
- `payload` — structured data about the occurrence

**Lifecycle:** EMITTED (terminal — immutable after emission)

**Ownership Rule:** Owned by the emitting Entity

**Source of Truth:** Events Domain (the event log)

**Notes:** Confirmed 16 Event Types in current implementation: BACKGROUND_TASK_QUEUED, AGENT_STARTED, AGENT_COMPLETED, CONSTITUTION_EVALUATED, MEMORY_STORED, DECISION_RECORDED, plus others. Full list to be confirmed in ARCH-11. Current implementation has no persistence, no idempotency enforcement, no envelope schema.

---

### ET-COM-002 — Notification

**Source:** certification findings (event-consumer.js — Slack failure silently swallowed; services/slack/ alertCritical, alertError, alertHealthAnomaly, alertBudgetThreshold); constitution-v1.md Art. 7 (PushNotification to Founder within 5 minutes)

**Definition:** A Notification is a directed message sent to a specific Entity (typically the Founder) triggered by an Event or threshold crossing. Notifications are distinct from Events — Events are broadcast; Notifications are targeted.

**Required Attributes:**
- `notification_id` — canonical Identity
- `trigger_event_id` — the Event that triggered this Notification
- `recipient_id` — the Entity receiving this Notification
- `channel` — SLACK / PUSH / EMAIL / IN_APP
- `priority` — CRITICAL / HIGH / MEDIUM / LOW
- `content` — the notification message
- `sent_at` — timestamp
- `status` — PENDING / SENT / DELIVERED / FAILED

**Lifecycle:** PENDING → SENT → DELIVERED / FAILED

**Ownership Rule:** Owned by the notification Service

**Source of Truth:** Communications Domain

---

### ET-COM-003 — Session

**Source:** certification findings (working memory as session context; ws-handler.js 60s keepalive; chat-context.js getMemorySummary 5min cache with in-flight guard; memory compression every 20 messages)

**Definition:** A Session is a bounded interaction context between the Founder and the Civilisation. A Session begins when an interaction commences and ends when it concludes (via timeout, explicit close, or disconnection). Sessions provide the context window within which Working Memory operates.

**Required Attributes:**
- `session_id` — canonical Identity
- `initiated_by_id` — the Entity initiating the Session
- `channel_type` — WEBSOCKET / HTTP / INTERNAL
- `started_at` — timestamp
- `ended_at` — timestamp (populated on session end)
- `status` — ACTIVE / CLOSED / TIMED_OUT

**Lifecycle:** INITIATED → ACTIVE → CLOSED / TIMED_OUT

**Ownership Rule:** Owned by the Founder

**Source of Truth:** Session Domain (working memory); confirmed two representations (working memory + WS registry) creating source-of-truth conflict — to be resolved in ARCH-05

---

### ET-COM-004 — Conversation

**Source:** chat-context.js (buildPrompt 13 blocks; PAST CONTEXT up to 2; memory compression every 20 messages); ws-handler.js (5 message types)

**Definition:** A Conversation is a sequential exchange of Messages within a Session. A Conversation has context that builds across its Messages and may be compressed when it exceeds retention bounds.

**Required Attributes:**
- `conversation_id` — canonical Identity
- `session_id` — parent Session reference
- `message_count` — current number of Messages
- `compression_count` — number of times this Conversation's history has been compressed
- `started_at` — timestamp
- `status` — ACTIVE / COMPLETED / COMPRESSED

**Lifecycle:** ACTIVE → COMPLETED / COMPRESSED

**Ownership Rule:** Owned by the Session's owner

**Source of Truth:** Session Domain

---

### ET-COM-005 — Message

**Source:** ws-handler.js (5 message types: subscribe/ping/voice:transcript/agent:status/browser:snapshot); chat-context.js (USER MESSAGE block)

**Definition:** A Message is an individual communication unit within a Conversation — either from the Founder to the Civilisation or from the Civilisation to the Founder.

**Required Attributes:**
- `message_id` — canonical Identity
- `conversation_id` — parent Conversation reference
- `sender_id` — the Entity sending this Message
- `message_type` — USER_INPUT / SYSTEM_RESPONSE / AGENT_STATUS / VOICE_TRANSCRIPT / BROWSER_SNAPSHOT
- `content` — the message content
- `sent_at` — timestamp

**Lifecycle:** SENT (terminal — immutable after sending)

**Ownership Rule:** Owned by its sender

**Source of Truth:** Session Domain

---

### ET-COM-006 — Prompt

**Source:** chat-context.js (buildPrompt 13 blocks; SELF-STATE, FOUNDER ALIGNMENT, STRATEGIC INTELLIGENCE, etc.); handoff ("Prompt"); lib/apex-tools.js (tool invocation prompts)

**Definition:** A Prompt is a structured input pattern for a Model invocation, composed of multiple context blocks in a defined order. Prompts are constructed by the Civilisation at runtime from registered context block templates. The canonical prompt structure is a governed artifact — changes to prompt construction require governance review.

**Required Attributes:**
- `prompt_id` — canonical Identity
- `prompt_type` — CHAT_CONTEXT / AGENT_TASK / REFLECTION / TOOL_INVOCATION / EXECUTIVE_SYNTHESIS
- `block_structure` — ordered list of context blocks (with their sources)
- `model_tier_target` — which Model Tier this Prompt is designed for
- `version` — current version (prompt changes are versioned)
- `status` — ACTIVE / DEPRECATED

**Lifecycle:** ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the Service that manages prompt construction

**Source of Truth:** Capability Domain

---

## Layer 7: Capability Entities

Entities that define what the Civilisation can do.

---

### ET-CAP-001 — Capability

**Source:** ARCH-00 (Capability concept); lib/apex-tools.js (22 APEX_TOOLS in schema); agent-task-cycle.js (8-type step allowlist); handoff ("Tool"); certification (all tool invocations, constitution gate evaluations, memory writes as governed operations)

**Definition:** A Capability is a named, governed, and registered operation the Civilisation can perform. All significant operations — tool invocations, memory writes, constitutional evaluations, model invocations — are Capabilities. A Capability that is not in the Capability Registry does not officially exist.

**Required Attributes:**
- `capability_id` — canonical Identity
- `canonical_name` — unique name within the Capability Registry
- `capability_class` — TOOL / AGENT_STEP / API_OPERATION / MODEL_INVOCATION / MEMORY_OPERATION / GOVERNANCE_OPERATION
- `authority_required` — minimum Trust Level to invoke
- `audit_obligation` — YES / NO / CONDITIONAL
- `resource_profile` — estimated Resource consumption
- `admission_status` — ADMITTED / PROVISIONAL / DEPRECATED
- `provided_by_service_id` — the Service providing this Capability

**Optional Attributes:**
- `rate_limit` — maximum invocations per period
- `preconditions` — what must be true before invocation
- `compensation` — how to reverse effects

**Lifecycle:** PROVISIONAL → ADMITTED → ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the providing Service's owner

**Source of Truth:** Capability Domain (Capability Registry)

---

### ET-CAP-002 — Tool

**Source:** lib/apex-tools.js (22 tools: web_search, get_weather, read_memory, write_memory, create_document, etc.); handoff ("Tool"); certification runtime analysis

**Definition:** A Tool is a registered Capability specifically designed for direct invocation during Agent task execution or chat interaction. Tools are the primary mechanism through which Agents interact with external systems and internal Memory. All 22 confirmed APEX Tools are instances of this entity type.

**Required Attributes:**
- Inherits all Capability (ET-CAP-001) Required Attributes
- `tool_schema` — the JSON Schema defining the Tool's input and output
- `advertised` — boolean (some tools are unadvertised to the model — 6 browser tools confirmed unadvertised)
- `fallback_tool_id` — reference to fallback if this Tool fails (e.g., web_search falls back to DuckDuckGo)

**Lifecycle:** Inherits from Capability

**Ownership Rule:** Owned by the apex-tools Service

**Notes:** 22 tools in APEX_TOOLS schema confirmed. 6 browser tools confirmed unadvertised. web_search has Brave+DDG fallback. get_weather is UK-first then Open-Meteo.

---

### ET-CAP-003 — Model

**Source:** certification findings (lib/models/runtime/index.js — execute/stream/voice; TIER_ROUTING: simple/fast/voice→Haiku, moderate/complex/balanced→Sonnet, critical/powerful→Opus 4.7; circuit breaker per-model 5 failures exp backoff max 15min; 90s timeout); handoff ("Model")

**Definition:** A Model is an AI reasoning or generation system used by Agents and Services to produce outputs. Models are registered Capabilities with specific tier assignments, cost profiles, and circuit-breaker behaviour.

**Required Attributes:**
- `model_id` — canonical Identity
- `model_name` — canonical name (e.g., claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5)
- `model_tier_id` — the Tier classification (ET-CAP-004)
- `provider` — the external organisation providing this Model
- `cost_per_call` — approximate cost (for budget governance)
- `context_window` — maximum token context
- `capabilities` — what this Model can do (TEXT / VOICE / VISION)
- `circuit_breaker_threshold` — consecutive failures before circuit opens (5 in current implementation)
- `status` — ACTIVE / CIRCUIT_OPEN / DEPRECATED

**Lifecycle:** ACTIVE → CIRCUIT_OPEN (→ ACTIVE after cooldown) → DEPRECATED

**Ownership Rule:** Owned by the Model Service

**Source of Truth:** Capability Domain

---

### ET-CAP-004 — Model Tier

**Source:** certification findings (TIER_ROUTING confirmed: SIMPLE/FAST/VOICE→Haiku, MODERATE/COMPLEX/BALANCED→Sonnet, CRITICAL/POWERFUL→Opus 4.7; dynamic-agent-selector.js 4 TIERS)

**Definition:** A Model Tier is a classification of Models by cost-capability profile. Model Tiers govern which Model is selected for a given task type. APEX defines four tiers with routing rules.

**Required Attributes:**
- `tier_id` — canonical Identity
- `tier_name` — canonical name (TIER_1 / TIER_2 / TIER_3 / TIER_4)
- `routing_triggers` — the task classifications that route to this Tier
- `default_model_id` — the Model assigned to this Tier
- `cost_ceiling_per_call` — maximum allowed cost at this Tier

**Lifecycle:** ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the Model routing Service

**Source of Truth:** Capability Domain

---

## Layer 8: Service Entities

Entities that provide Capabilities to other Entities.

---

### ET-SVC-001 — Service

**Source:** certification findings (services/init.js 12-step cascade; services/slack/, services/notion/; memory service, constitutional gate; FAIL-SOFT classification for init cascade)

**Definition:** A Service is an Entity that provides one or more Capabilities to other Entities through defined Interfaces. Services have Lifecycles, health states, and dependency relationships with other Services.

**Required Attributes:**
- `service_id` — canonical Identity
- `service_name` — canonical name
- `service_type` — INTERNAL / EXTERNAL / HYBRID
- `capabilities_provided` — list of Capability IDs
- `health_status` — HEALTHY / DEGRADED / CRITICAL / DOWN
- `owner_id` — the Entity accountable for this Service
- `status` — INITIALISING / ACTIVE / DEGRADED / STOPPED

**Optional Attributes:**
- `init_sequence_step` — order in the startup cascade (services/init.js 12-step)
- `dependencies` — other Services this Service requires

**Lifecycle:** INITIALISING → ACTIVE → DEGRADED → STOPPED

**Ownership Rule:** Owned by its responsible Ministry or Council Member

**Source of Truth:** Infrastructure Domain

---

### ET-SVC-002 — Interface

**Source:** ARCH-00 (Interface concept); ws-handler.js (WebSocket interface); routes/* (HTTP interfaces); certification (8 public endpoints in /api/operations/*)

**Definition:** An Interface is the exposed contract through which a Service makes its Capabilities invocable. APEX Services expose HTTP REST, WebSocket, and internal programmatic Interfaces.

**Required Attributes:**
- `interface_id` — canonical Identity
- `service_id` — the Service providing this Interface
- `interface_type` — HTTP_REST / WEBSOCKET / INTERNAL / EVENT_BUS
- `capabilities_exposed` — which Capabilities this Interface exposes
- `authentication_required` — boolean
- `version` — current Interface version

**Lifecycle:** ACTIVE → DEPRECATED

**Ownership Rule:** Owned by its parent Service

**Source of Truth:** Infrastructure Domain

---

### ET-SVC-003 — Gateway

**Source:** certification findings (lib/memory/gateway.js as write gateway; lib/runtime/constitutional-gate.js as constitutional gateway; lib/kernel.js kernelChain as authority gateway; lib/agent-file-utils.js checkGovernance NEVER BLOCKS — CRITICAL C02)

**Definition:** A Gateway is a Service that controls access to a set of Capabilities across a Trust Boundary. A Gateway enforces Authority requirements, produces Audit Records, and determines the failure mode for its boundary. APEX has three confirmed Gateways: the Memory Write Gateway, the Constitutional Gate, and the kernelChain.

**Required Attributes:**
- Inherits all Service (ET-SVC-001) Required Attributes
- `boundary_id` — the Trust Boundary this Gateway enforces
- `failure_mode` — FAIL_CLOSED / FAIL_OPEN / FAIL_SOFT
- `audit_obligation` — YES / NO
- `bypass_conditions` — explicit list of conditions under which the Gateway may be bypassed (must be empty or have SOVEREIGN justification)

**Lifecycle:** Inherits from Service

**Notes:** Constitutional Gate confirmed FAIL-OPEN on error (critical architectural defect). checkGovernance confirmed unconditionally OPEN — NEVER blocks (C02, CRITICAL). Both must be reflected in failure_mode attribute at initial registration.

---

### ET-SVC-004 — Circuit Breaker

**Source:** certification findings (lib/models/runtime/index.js circuit breaker — 5 consecutive non-429 failures, exponential backoff 60s × 2^(failures-5), max 15min cooldown; FAIL-CLOSED classification)

**Definition:** A Circuit Breaker is a Service that protects downstream Services by failing fast when failure thresholds are crossed. The APEX Circuit Breaker is per-Model and uses exponential backoff.

**Required Attributes:**
- Inherits all Service (ET-SVC-001) Required Attributes
- `protected_service_id` — the Service being protected
- `failure_threshold` — consecutive failures before circuit opens (5 in current implementation)
- `cooldown_strategy` — FIXED / EXPONENTIAL / LINEAR
- `max_cooldown_ms` — maximum cooldown duration (900000ms = 15min in current implementation)
- `circuit_state` — CLOSED / OPEN / HALF_OPEN

**Lifecycle:** Inherits from Service; Circuit state transitions: CLOSED → OPEN → HALF_OPEN → CLOSED

---

### ET-SVC-005 — Event Bus

**Source:** certification findings (lib/event-bus.js — emit() setImmediate, emitSync() synchronous, 16 EVENTS, wildcard '*', _log capped 200, maxListeners 100); C05 (procedural semantic search dead code) — the event bus is its own entity

**Definition:** The Event Bus is the Service responsible for receiving emitted Events and routing them to registered consumers. APEX's Event Bus uses in-memory, setImmediate-based dispatch with no persistence.

**Required Attributes:**
- Inherits all Service (ET-SVC-001) Required Attributes
- `dispatch_mode` — SYNC / ASYNC (setImmediate)
- `persistence_enabled` — boolean (false in current implementation — significant defect)
- `max_listeners` — 100 in current implementation
- `log_capacity` — rolling log size (200 in current implementation)
- `wildcard_supported` — boolean (true — '*' subscription confirmed)

**Notes:** No persistence is a critical architectural gap — Events are lost on process restart. Must be flagged in initial registry entry.

---

## Layer 9: Resource Entities

Entities representing finite quantities that Capability invocations consume.

---

### ET-RES-001 — Resource

**Source:** ARCH-00 (Resource concept); constitution-v1.md Art. 2 ($2 per-call financial limit, $500/month Council cap); lib/consumption-log.js (logger.info only, no DB — confirmed NOT persisted)

**Definition:** A Resource is a finite, governed quantity consumed by Capabilities. APEX Resources include budget (measured in currency), compute capacity (memory, CPU), and authorisation counts. The $2 per-call limit and $500/month Council cap are constitutional Resource limits.

**Required Attributes:**
- `resource_id` — canonical Identity
- `resource_type` — BUDGET / COMPUTE_MEMORY / AUTHORISATION_COUNT
- `unit` — the unit of measurement (USD, MB, count)
- `governing_limit` — maximum available (constitutional limit for BUDGET type)
- `current_balance` — current remaining amount
- `allocated_to_id` — the Entity this Resource is allocated to
- `replenishment_rule` — how this Resource is restored
- `status` — AVAILABLE / DEPLETED / FROZEN

**Lifecycle:** ALLOCATED → AVAILABLE → DEPLETED / FROZEN

**Ownership Rule:** Owned by the Founder (all Resources are ultimately under Founder authority)

**Source of Truth:** Resource Domain

**Notes:** Current implementation: lib/consumption-log.js logs to console only — no Resource tracking in DB. This means there is no reliable accounting of Civilisation expenditure. Critical gap per constitution-v1.md Art. 2.

---

### ET-RES-002 — Budget

**Source:** constitution-v1.md Art. 2 ($2 per-call limit; $500/month Council cap); lib/consumption-log.js; civilization-runtime.js ($0.50/cycle budget gate phases 3+4); lib/models/runtime/index.js (3 retries logic)

**Definition:** A Budget is a governed allocation of financial Resource with defined limits, accounting rules, and depletion policies. The Civilisation has three Budget scopes: per-call ($2 limit), per-cycle ($0.50 gate for civilization-runtime phases 3+4), and per-month Council ($500/month cap).

**Required Attributes:**
- `budget_id` — canonical Identity
- `budget_scope` — PER_CALL / PER_CYCLE / MONTHLY_COUNCIL / MONTHLY_TOTAL
- `limit_amount` — the constitutional or operational limit
- `currency` — USD
- `current_spend` — amount spent in current period
- `period_start` — start of accounting period
- `status` — WITHIN_LIMIT / APPROACHING_LIMIT / AT_LIMIT / EXCEEDED

**Lifecycle:** PERIOD_ACTIVE → PERIOD_CLOSED → PERIOD_ARCHIVED

**Ownership Rule:** Owned by the Founder

**Source of Truth:** Resource Domain

---

### ET-RES-003 — Resource Pool

**Source:** agent-queue.js (MAX_CONCURRENCY=3 shared across all agents); civilization-runtime.js (8-phase cycle sharing budget)

**Definition:** A Resource Pool is a shared allocation of Resources managed as a collective limit across multiple Entities or Capability invocations. The Agent Queue's concurrency limit is the primary Resource Pool in APEX.

**Required Attributes:**
- `pool_id` — canonical Identity
- `pool_name` — canonical name
- `resource_type` — the type of Resource in this Pool
- `total_capacity` — total pool size
- `current_allocation` — currently allocated amount
- `allocation_policy` — how capacity is distributed among requestors

**Lifecycle:** ACTIVE → DEPLETED → REPLENISHED

---

### ET-RES-004 — Consumption Record

**Source:** lib/consumption-log.js (logger.info only — NOT stored in DB — confirmed); certification INV-H1 (NOT ENFORCED); constitution-v1.md Art. 2 (financial limits)

**Definition:** A Consumption Record is a record of Resource usage by a specific Capability invocation. Consumption Records are required for budget governance and Resource accounting. In the current implementation, these are log-only (no DB persistence) — a confirmed architectural gap.

**Required Attributes:**
- `record_id` — canonical Identity
- `capability_id` — the Capability that consumed the Resource
- `resource_type` — what was consumed
- `amount_consumed` — how much
- `invoking_entity_id` — who invoked the Capability
- `consumed_at` — timestamp
- `budget_id` — which Budget this consumption draws from

**Lifecycle:** RECORDED (terminal — immutable)

**Ownership Rule:** Owned by the Resource governance system

---

## Layer 10: Data Governance Entities

Entities governing the authority, structure, and provenance of information.

---

### ET-DAT-001 — Registry

**Source:** ARCH-00 (Registry concept); Scripts/CONSTITUTION.md Art. 2 (admission_rules table); Art. 5 (entities, agents, scores are config rows); Phase 2.3 Contradiction C11 (write-with-outbox.js has no consumers — the registry governance mechanism is broken); handoff ("Registry will become the canonical source of truth")

**Definition:** A Registry is a governed catalogue of Records representing a specific Entity Type. Registries are the canonical mechanism through which existence in a governed category is established. Nothing is officially registered unless it has a Registry Record.

**Required Attributes:**
- `registry_id` — canonical Identity
- `registry_name` — canonical name
- `entry_type` — the Entity Type this Registry catalogues
- `governing_authority_id` — which Entity controls admission
- `admission_process_ref` — reference to the admission process specification (ARCH-03)
- `record_count` — current number of active Records
- `status` — ACTIVE / DEPRECATED

**Lifecycle:** ESTABLISHED → ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the governing authority

**Source of Truth:** The Registry is itself a Source of Truth for its domain — it is registered in the Registry of Registries

---

### ET-DAT-002 — Registry Record

**Source:** ARCH-00 (Registry Record concept); Scripts/CONSTITUTION.md Art. 2 (admission_rules governs admission)

**Definition:** A Registry Record is an entry in a Registry that formally constitutes the existence of an architectural object within a governed category. A Registry Record is the object's admission ticket — without it, the object does not exist in that category.

**Required Attributes:**
- `record_id` — canonical Identity (unique within its Registry)
- `registry_id` — the Registry this Record belongs to
- `represents_entity_id` — the Identity of the object this Record represents
- `admission_status` — PROPOSED / UNDER_REVIEW / ADMITTED / ACTIVE / DEPRECATED / REMOVED
- `admitted_by_id` — the Identity of the admitting authority
- `admitted_at` — timestamp
- `admission_evidence_ref` — the Evidence supporting admission
- `version` — current version of this Record
- `deprecated_at` — timestamp (if DEPRECATED)
- `superseded_by_id` — Reference to replacement Record (if superseded)

**Lifecycle:** PROPOSED → UNDER_REVIEW → ADMITTED → ACTIVE → DEPRECATED → REMOVED

**Ownership Rule:** Owned by the governing Registry's authority

---

### ET-DAT-003 — Domain

**Source:** ARCH-00 (Domain concept); certification findings (10 fact domains identified in Source-of-Truth audit: Goals, Memory, Agent Tasks, Configuration, Identity, Health State, Knowledge, Session State, Strategic Objectives, Agent Reputation)

**Definition:** A Domain is a bounded area of concern within the Civilisation with exactly one Source of Truth. Domains are the partitioning mechanism that implements ARCH-00's single-source-of-truth principle.

**Required Attributes:**
- `domain_id` — canonical Identity
- `domain_name` — canonical name
- `subject_matter` — what facts and Entities fall within this Domain
- `source_of_truth_id` — reference to the single authoritative Source of Truth
- `governing_authority_id` — the Entity accountable for this Domain
- `status` — ACTIVE / DEPRECATED

**Lifecycle:** ESTABLISHED → ACTIVE → DEPRECATED

**Ownership Rule:** Owned by its governing authority

**Source of Truth:** Data Governance Domain (meta)

---

### ET-DAT-004 — Source of Truth

**Source:** ARCH-00 (Source of Truth concept); Scripts/CONSTITUTION.md Art. 1 ("each fact has exactly one authoritative source; all others are projections"); certification findings (10 domains with fragmented sources — C13, C09 etc.); handoff ("Registry will become the canonical source of truth")

**Definition:** A Source of Truth is the single authoritative store for all facts within a designated Domain. When it conflicts with any Projection, it is correct by definition.

**Required Attributes:**
- `sot_id` — canonical Identity
- `sot_name` — canonical name
- `domain_id` — the Domain this Source of Truth governs
- `storage_system_ref` — reference to the physical storage system
- `write_protocol` — how facts are written (must go through designated gateway)
- `consistency_guarantee` — the consistency level this Source provides
- `status` — ACTIVE / DEGRADED / SUSPENDED

**Lifecycle:** DESIGNATED → ACTIVE → DEGRADED → SUSPENDED

**Ownership Rule:** Owned by the Domain's governing authority

---

### ET-DAT-005 — Projection

**Source:** ARCH-00 (Projection concept); Scripts/CONSTITUTION.md Art. 1 ("all others are projections"); certification findings (multiple memory paths, multiple goal systems — all secondary stores are Projections)

**Definition:** A Projection is a derived, read-optimised view of facts whose authoritative version resides in a Source of Truth. A Projection must be explicitly identified as such and may never be treated as the Source of Truth.

**Required Attributes:**
- `projection_id` — canonical Identity
- `source_of_truth_id` — the Source this Projection derives from
- `staleness_tolerance_ms` — maximum acceptable lag
- `sync_mechanism` — EVENT_DRIVEN / SCHEDULED / ON_READ
- `transformation_rules` — how data is transformed from the Source
- `status` — ACTIVE / STALE / SYNC_FAILED

**Lifecycle:** ACTIVE → STALE → SYNC_FAILED / ACTIVE

---

### ET-DAT-006 — Admission Record

**Source:** ARCH-00 (Registry governance); Scripts/CONSTITUTION.md Art. 2 (admission_rules table); ARCH-03 (will specify admission lifecycle)

**Definition:** An Admission Record is the formal evidence record produced when an Entity is admitted to a Registry. It records the admission decision, its basis, the admitting authority, and the version of the Registry Record created.

**Required Attributes:**
- `admission_id` — canonical Identity
- `registry_id` — which Registry admitted the Entity
- `entity_id` — the Entity being admitted
- `admitted_by_id` — the admitting authority
- `admitted_at` — timestamp
- `justification` — the basis for admission
- `registry_record_id` — the Registry Record created by this admission

**Lifecycle:** ISSUED (terminal — immutable)

---

## Layer 11: Identity Entities

Entities establishing who things are and what they are permitted to do.

---

### ET-IDN-001 — Identity

**Source:** ARCH-00 (Identity concept); certification findings (resolveIdentity fail-soft — anonymous identity indistinguishable from verified; JWT verification in lib/middleware.js); INV-A1 through A5; lib/kernel.js req.identity attachment

**Definition:** An Identity is the canonical, persistent, and unique designation of a specific Entity within the Civilisation. An Identity establishes WHO something is, providing the basis for all Authority decisions.

**Required Attributes:**
- `identity_id` — canonical Identity
- `canonical_form` — the unique string or structured value identifying this Entity
- `entity_id` — the Entity this Identity designates
- `identity_type` — FOUNDER / COUNCIL_MEMBER / MINISTRY / AGENT / SYSTEM / ANONYMOUS
- `trust_level_id` — reference to the Trust Level this Identity carries
- `established_at` — timestamp
- `status` — ACTIVE / SUSPENDED / REVOKED

**Lifecycle:** ESTABLISHED → ACTIVE → SUSPENDED → REVOKED

**Ownership Rule:** Owned by the Governance system (Identities are assigned, not self-claimed)

**Source of Truth:** Identity Domain

---

### ET-IDN-002 — Credential

**Source:** certification findings (requireAppAccess: APP_ACCESS_KEY or JWT; timingSafeEqual; jsonwebtoken.verify(); INV-A5: timing attacks prevented — ENFORCED; BYPASS_DASHBOARD_AUTH — C10)

**Definition:** A Credential is a verifiable assertion presented to establish Identity. APEX uses two credential types: APP_ACCESS_KEY (string comparison) and JWT cookie (signature verification). Credentials are the mechanism by which claimed Identities are verified.

**Required Attributes:**
- `credential_id` — canonical Identity
- `credential_type` — APP_ACCESS_KEY / JWT / API_KEY / OTHER
- `holder_entity_id` — the Entity holding this Credential
- `issued_at` — timestamp
- `expiry` — timestamp (for time-limited credentials)
- `status` — ACTIVE / EXPIRED / REVOKED

**Lifecycle:** ISSUED → ACTIVE → EXPIRED / REVOKED

**Ownership Rule:** Owned by its holder entity

**Source of Truth:** Identity Domain

---

### ET-IDN-003 — Trust Level

**Source:** ARCH-00 (Trust concept); constitution-v1.md Art. 1 and 6 (authority hierarchy); certification findings (authority chain: Founder → Council → Ministry → Agent → System → Anonymous)

**Definition:** A Trust Level is a defined, strictly ordered degree of architectural confidence associated with an Identity type. Trust Levels govern the Authority an Identity may hold and the Boundaries it may cross.

**Required Attributes:**
- `trust_level_id` — canonical Identity
- `level_name` — SOVEREIGN / EXECUTIVE / OPERATIONAL / TASK / SYSTEM / NONE
- `ordinal` — numeric ordering (SOVEREIGN=6, EXECUTIVE=5, OPERATIONAL=4, TASK=3, SYSTEM=2, NONE=1)
- `associated_identity_types` — which Identity Types carry this Trust Level
- `authority_scope_description` — what Authority this level permits

**Lifecycle:** DEFINED (effectively permanent; changing Trust Level definitions is a MAJOR change)

**Ownership Rule:** Owned by the Governance system

**Source of Truth:** Identity Domain

**Notes:** Six defined Trust Levels: SOVEREIGN (Founder), EXECUTIVE (Council Members), OPERATIONAL (Ministries), TASK (Agents), SYSTEM (internal services), NONE (anonymous). Strictly ordered — no equivalence.

---

### ET-IDN-004 — Authority Grant

**Source:** ARCH-00 (Authority concept); constitution-v1.md Art. 6 (authority limits); certification INV-B1 (Authority checked before privileged operations: NOT ENFORCED); checkAuthority() fail-open confirmed

**Definition:** An Authority Grant is a formal record of specific Authority delegated from one Entity to another. Authority Grants are the mechanism by which the Founder's SOVEREIGN authority is distributed to Council Members, Ministries, and Agents within constitutional limits.

**Required Attributes:**
- `grant_id` — canonical Identity
- `grantor_identity_id` — the Identity granting Authority
- `grantee_identity_id` — the Identity receiving Authority
- `capability_scope` — which Capabilities this Grant covers
- `entity_scope` — which Entity Types this Grant covers
- `trust_level_ceiling` — the grantee may not exercise Authority above this level
- `granted_at` — timestamp
- `expiry` — when this Grant expires (or PERPETUAL)
- `status` — ACTIVE / EXPIRED / REVOKED

**Lifecycle:** GRANTED → ACTIVE → EXPIRED / REVOKED

**Ownership Rule:** Owned by the grantor

**Source of Truth:** Identity Domain

---

### ET-IDN-005 — Session Identity

**Source:** certification findings (lib/kernel.js req.identity attachment; resolveIdentity FAIL-SOFT — anonymous identity indistinguishable from verified; lib/middleware.js JWT verification)

**Definition:** A Session Identity is the resolved, request-scoped representation of an Identity for a specific Session or request. It carries the Identity's Trust Level, the verified credential type, and the verification status for the duration of that request or Session.

**Required Attributes:**
- `session_identity_id` — canonical Identity
- `session_id` — the Session this belongs to
- `base_identity_id` — the persistent Identity this is derived from
- `verification_method` — APP_KEY / JWT / ANONYMOUS
- `verification_status` — VERIFIED / UNVERIFIED / FAILED
- `trust_level_id` — the effective Trust Level for this Session
- `resolved_at` — timestamp

**Lifecycle:** RESOLVED → ACTIVE → EXPIRED (on session end)

**Ownership Rule:** Owned by the Session

**Source of Truth:** Session Domain

---

## Layer 12: Physical Architecture Entities

Entities representing the implementation of the Civilisation in its physical technical context. These are governed as implementation artifacts. Their primary relationship to Civilisation Layer entities is via IMPLEMENTS and DEPLOYS.

---

### ET-PHY-001 — Repository

**Source:** handoff ("Repository — the repository is one projection of the civilisation"); certification Phase 1 (Great Census — repository fully catalogued); Scripts/ folder structure

**Definition:** A Repository is the version-controlled store for implementation artifacts — the physical projection of the Civilisation's code, configuration, and documentation.

**Required Attributes:**
- `repository_id` — canonical Identity
- `repository_name` — canonical name
- `primary_branch` — the production branch
- `hosting_platform` — where the repository is hosted
- `status` — ACTIVE / ARCHIVED

---

### ET-PHY-002 — Folder

**Source:** handoff ("Folder", "Folders should represent organisational divisions"); Phase 1 census (repository structure)

**Definition:** A Folder is an organisational container within the Repository. Per the handoff principles, Folders represent organisational divisions of the Civilisation, not programming conventions.

**Required Attributes:**
- `folder_id` — canonical Identity
- `path` — canonical path within the Repository
- `organisational_purpose` — which Civilisation domain this Folder represents
- `parent_folder_id` — parent Folder (null for root)
- `status` — ACTIVE / DEPRECATED

---

### ET-PHY-003 — File

**Source:** handoff ("File"); Phase 1 census (census of all files across repository)

**Definition:** A File is an individual artifact within the Repository — a named unit of content. Files implement Civilisation entities or hold Civilisation documentation.

**Required Attributes:**
- `file_id` — canonical Identity
- `path` — canonical path within the Repository
- `file_type` — SOURCE / CONFIG / DOCUMENTATION / SCHEMA / TEST / DATA
- `implements_entity_id` — the Civilisation entity this File implements (if applicable)
- `status` — ACTIVE / DEPRECATED / ARCHIVED

---

### ET-PHY-004 — Module

**Source:** Phase 1 census; Phase 2.1 dependency graph; handoff ("Class", "Function") — treating Module as the logical unit

**Definition:** A Module is a named unit of implementation logic within the codebase. A Module groups related Functions and may export a defined interface.

**Required Attributes:**
- `module_id` — canonical Identity
- `name` — canonical module name
- `file_id` — the File containing this Module
- `implements_service_id` — the Service this Module implements (if applicable)
- `implements_capability_id` — the Capability this Module provides (if applicable)
- `export_interface` — what this Module exposes
- `status` — ACTIVE / DEPRECATED

---

### ET-PHY-005 — Function

**Source:** Phase 2.1 import/dependency graph; Phase 2.2 runtime census; handoff ("Function")

**Definition:** A Function is a named, typed operation within a Module. Functions are the finest-grained implementation unit tracked in the Registry.

**Required Attributes:**
- `function_id` — canonical Identity
- `name` — canonical function name
- `module_id` — the Module containing this Function
- `implements_capability_id` — the Capability this Function implements (if applicable)
- `signature` — input/output type signature
- `status` — ACTIVE / DEPRECATED

---

### ET-PHY-006 — Class

**Source:** handoff ("Class"); Phase 1 census (class definitions across codebase)

**Definition:** A Class is a named, typed object definition within a Module, grouping related Functions and Properties.

**Required Attributes:**
- `class_id` — canonical Identity
- `name` — canonical class name
- `module_id` — the Module containing this Class
- `status` — ACTIVE / DEPRECATED

---

### ET-PHY-007 — Database

**Source:** Phase 1 census (Supabase Postgres); certification findings (multiple Supabase clients; RLS status unknown — UN01); handoff ("Database")

**Definition:** A Database is a persistent data store hosting one or more Tables. In APEX, the primary Database is the Supabase Postgres instance. The Database implements multiple Source of Truth entities.

**Required Attributes:**
- `database_id` — canonical Identity
- `database_name` — canonical name
- `implements_sot_ids` — list of Source of Truth entities this Database implements
- `connection_auth_type` — how connections are authenticated
- `rls_enabled` — boolean (UNKNOWN in current implementation — UN01)
- `status` — ACTIVE / DEGRADED / UNAVAILABLE

---

### ET-PHY-008 — Table

**Source:** Phase 1 census; certification findings (apex_agent_runs, semantic_memory, episodic_memory, decision_memory, executive_deliberations, executive_votes, civilization_health_snapshots, outbox, consumer_offsets, admission_rules); handoff ("Table")

**Definition:** A Table is a structured data collection within a Database. Each Table implements a specific aspect of a Source of Truth or Registry.

**Required Attributes:**
- `table_id` — canonical Identity
- `table_name` — canonical name
- `database_id` — parent Database
- `implements_entity_type_id` — which Entity Type's instances this Table stores
- `rls_status` — ENABLED / DISABLED / UNKNOWN
- `has_outbox` — boolean (per constitution Art. 4 — real transaction for state+outbox)
- `status` — ACTIVE / DEPRECATED

---

### ET-PHY-009 — Environment Variable

**Source:** Phase 1 census; certification findings (BYPASS_DASHBOARD_AUTH, NODE_ENV, SUPABASE_SERVICE_ROLE_KEY, APP_ACCESS_KEY, ANTHROPIC_API_KEY, AUTONOMY_LEVEL, SLACK_BOT_TOKEN, etc.); handoff ("Environment Variable")

**Definition:** An Environment Variable is a named runtime configuration value that governs the behaviour of Services and Capabilities. Environment Variables are the primary configuration mechanism for APEX.

**Required Attributes:**
- `env_var_id` — canonical Identity
- `variable_name` — canonical name
- `purpose` — what this variable controls
- `sensitivity` — PUBLIC / SENSITIVE / SECRET
- `required` — boolean
- `current_environment` — which deployment environment (PRODUCTION / STAGING / LOCAL)
- `governance_significance` — CONSTITUTIONAL / OPERATIONAL / CONFIGURATION (some env vars — like BYPASS_DASHBOARD_AUTH, AUTONOMY_LEVEL — have constitutional significance)

**Notes:** BYPASS_DASHBOARD_AUTH with NODE_ENV check confirmed as C10 (operator-dependent guard). AUTONOMY_LEVEL=3 in production bypasses approval gate — governance-significant variable.

---

### ET-PHY-010 — API Route

**Source:** Phase 1 census (routes/* directory); Phase 2.2 runtime (auto-loaded routes); certification (8 public endpoints in /api/operations/*, authentication gaps); handoff ("Route", "API")

**Definition:** An API Route is a registered HTTP endpoint that exposes a Capability through an Interface. API Routes are the HTTP projection of Service Interfaces.

**Required Attributes:**
- `route_id` — canonical Identity
- `path` — the URL path pattern
- `method` — GET / POST / PUT / PATCH / DELETE
- `implements_capability_id` — the Capability this Route exposes
- `authentication_required` — boolean
- `auth_mechanism` — APP_KEY / JWT / NONE
- `rate_limit_id` — reference to applicable rate limit
- `status` — ACTIVE / DEPRECATED

---

### ET-PHY-011 — WebSocket Handler

**Source:** certification findings (lib/ws-handler.js — timingSafeEqual on token, 5 msg types, 60s keepalive, wsChunkedSend 64KB chunks, globals set; INV-A4 WebSocket auth ENFORCED)

**Definition:** A WebSocket Handler is a registered bidirectional communication channel that implements real-time Interfaces. APEX's WebSocket handler manages the live dashboard connection.

**Required Attributes:**
- `ws_handler_id` — canonical Identity
- `path` — the WebSocket upgrade path
- `authentication_required` — boolean (true — timingSafeEqual confirmed)
- `implements_capability_ids` — the Capabilities available via this handler
- `keepalive_interval_ms` — 60000 in current implementation
- `chunk_size_bytes` — 65536 (64KB) in current implementation

---

### ET-PHY-012 — Cron Schedule

**Source:** certification findings (Render cron routes; adaptation_refresh UR14 unresolved; weekly_review UR15 unresolved); lib/agent-task-cycle.js runDueSchedules

**Definition:** A Cron Schedule is a time-based trigger specification in the physical runtime environment. Cron Schedules are the physical implementation of logical Schedule entities.

**Required Attributes:**
- `cron_schedule_id` — canonical Identity
- `cron_expression` — the schedule expression
- `implements_schedule_id` — the logical Schedule (ET-OPS-004) this implements
- `target_route` — the API Route triggered by this cron
- `status` — ACTIVE / PAUSED / DISABLED

---

### ET-PHY-013 — Dashboard

**Source:** Phase 1 census (dashboard.html); certification (GET /api/operations/status public endpoint powers dashboard); handoff ("Dashboard"); Phase 3 Master Plan (ARCH-16 Dashboard Information Model proposed)

**Definition:** A Dashboard is a visual Interface that presents operational state to the Founder. The APEX Dashboard is the primary runtime visibility tool.

**Required Attributes:**
- `dashboard_id` — canonical Identity
- `dashboard_name` — canonical name
- `purpose` — what operational view this Dashboard provides
- `data_sources` — which Source of Truth or Projection feeds this Dashboard
- `authentication_required` — boolean (BYPASS_DASHBOARD_AUTH gap confirmed)
- `status` — ACTIVE / DEPRECATED

---

### ET-PHY-014 — Widget

**Source:** handoff ("Widget"); dashboard.html (UI components confirmed)

**Definition:** A Widget is a discrete visual component within a Dashboard. Each Widget presents one aspect of the Civilisation's state.

**Required Attributes:**
- `widget_id` — canonical Identity
- `dashboard_id` — parent Dashboard
- `widget_type` — METRIC / GRAPH / TABLE / STATUS / LIST / ALERT
- `data_source_id` — the Source of Truth or Projection providing data
- `refresh_interval_ms` — how often this Widget updates
- `status` — ACTIVE / DEPRECATED

---

## Entity Type Summary

| Layer | Count | IDs |
|-------|-------|-----|
| Governance | 8 | ET-GOV-001 to ET-GOV-008 |
| Executive | 6 | ET-EXE-001 to ET-EXE-006 |
| Operational | 5 | ET-OPS-001 to ET-OPS-005 |
| Knowledge | 9 | ET-KNW-001 to ET-KNW-009 |
| Intent | 4 | ET-INT-001 to ET-INT-004 |
| Communication | 6 | ET-COM-001 to ET-COM-006 |
| Capability | 4 | ET-CAP-001 to ET-CAP-004 |
| Service | 5 | ET-SVC-001 to ET-SVC-005 |
| Resource | 4 | ET-RES-001 to ET-RES-004 |
| Data Governance | 6 | ET-DAT-001 to ET-DAT-006 |
| Identity | 5 | ET-IDN-001 to ET-IDN-005 |
| Physical | 14 | ET-PHY-001 to ET-PHY-014 |
| **TOTAL** | **76** | |

---

## Known Defects Captured in Entity Types

The following confirmed defects from certification are encoded as Attribute values or notes in entity types, so they are not lost at registration:

| Defect | Entity Type | Captured As |
|--------|-------------|-------------|
| B1: decisionMemoryId always null | ET-KNW-001 | note on decision_link_id attribute |
| B4: getSuccessRate reads wrong table | ET-KNW-001 | note; metric source defect |
| C02: checkGovernance never blocks | ET-SVC-003 | failure_mode = UNCONDITIONALLY_OPEN |
| C10: BYPASS_DASHBOARD_AUTH operator-dependent | ET-PHY-013 | authentication_required note; ET-PHY-009 governance_significance |
| C13: two goal systems | ET-INT-001 | note; Source of Truth conflict documented |
| UN01: RLS unknown | ET-PHY-007, ET-PHY-008 | rls_enabled / rls_status = UNKNOWN |
| Consumption log-only | ET-RES-004 | note |
| Event Bus no persistence | ET-SVC-005 | persistence_enabled = false |
