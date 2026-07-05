# ARCH-02 — Relationship Ontology: Complete Pre-Document Mapping

**Status:** PRE-DOCUMENT PLANNING — for review and approval before ARCH-02 is authored
**Date:** 2026-07-02
**Basis:** ARCH-00 meta-model · ARCH-01-PLAN (76 entity types) · Phase 1–2.3 certification findings · Master Project Handoff · Master Plan (Phase 3.0.1)
**Constraint:** No assumptions. Every relationship type derives from documented evidence. Every source and target entity type references an ID defined in ARCH-01-PLAN.

---

## Mapping Method

Every relationship type listed here satisfies all of the following:

1. It has a confirmed source — at least one instance of this relationship type exists or is required by certification findings, constitutional basis, or the handoff's typed relationship list
2. It cannot be collapsed into another relationship type without losing distinct architectural meaning
3. The source and target entity types are both defined in ARCH-01-PLAN
4. It captures a semantically distinct type of connection — not merely a synonym of another type

Relationship types are assigned to one of eleven Groups. The Group determines the relationship type's semantic category, its evidence obligation defaults, and its position in the dependency graph.

Every relationship type entry specifies:
- **RT ID** — assigned identifier (RT-GROUP-NNN format)
- **Canonical Name** — UPPER_SNAKE_CASE, active-voice verb phrase, left-to-right reading
- **Source** — the certification or architectural evidence basis for this type
- **Definition** — precise, unambiguous statement of what this relationship type asserts
- **Source Entity Types** — which entity types may appear on the source (subject) side
- **Target Entity Types** — which entity types may appear on the target (object) side
- **Source Cardinality** — ONE or MANY instances on the source side per relationship instance
- **Target Cardinality** — ONE or MANY instances on the target side per relationship instance
- **Inverse Name** — the canonical inverse relationship name (UPPER_SNAKE_CASE)
- **Evidence Obligation** — YES / NO / CONDITIONAL
- **Conditional Evidence Rule** — when CONDITIONAL, what triggers the evidence requirement
- **Notes** — architectural observations, known defects, constitutional basis

---

## Classification Scheme

### Ontological Principles

**Principle 1: Relationship Types Are Not Entity Types.** A relationship type defines a permitted assertion between two entity types. It is not itself an entity and does not appear in the Entity Taxonomy (ARCH-01). When a relationship instance must itself be governed, it is reified as an entity (e.g., an Authority Grant is the reification of a DELEGATES_TO relationship).

**Principle 2: Cardinality Is Structural.** Source cardinality is the number of source-entity instances that may participate in a single relationship instance. Target cardinality is the number of target-entity instances. ONE means exactly one; MANY means one or more. Zero-or-one and zero-or-more distinctions are resolved in ARCH-02 through optionality specifications.

**Principle 3: Canonical Direction.** Every relationship type has a canonical direction, stated as "source VERB target." The inverse is named for readability but is not a separate relationship type — it is the same edge read in reverse. Inverses are named but not separately specified.

**Principle 4: Evidence Obligations Are Inherited From ARCH-00.** Any relationship instance that crosses a Boundary, modifies a Source of Truth, consumes a Resource, or constitutes a governance decision carries a YES evidence obligation. Others carry NO unless the specific type warrants it. CONDITIONAL means the obligation depends on context.

**Principle 5: Relationship Types Are Language, Not Policy.** A relationship type says what CAN be asserted. Policy (ARCH-07) specifies what MUST or MUST NOT be asserted. The ontology does not forbid undesirable relationships — it makes them nameable so policy can govern them.

### Group Classification

| Group Code | Group Name | Semantic Domain |
|------------|-----------|----------------|
| RT-GOV | Governance | Authority, constraint, enforcement, delegation, certification |
| RT-STR | Structure | Ownership, composition, membership, versioning, dependency |
| RT-PHY | Physical | Implementation mapping, deployment, modification |
| RT-EXE | Execution | Task execution, capability invocation, scheduling, triggering |
| RT-DAT | Data Flow | Reading, writing, producing, consuming |
| RT-KNW | Knowledge | Learning, reflection, knowledge generation |
| RT-OBS | Observability | Monitoring, measurement, observation, tracking |
| RT-COM | Communication | Event emission, notification, escalation |
| RT-EXC | Executive | Deliberation, voting, supervision, reporting |
| RT-INT | Intent | Goal pursuit, achievement, contribution, informing |
| RT-IDN | Identity | Identification, authentication, credential possession |

---

## Group 1: Governance (RT-GOV)

Relationship types that establish, constrain, verify, and enforce the rules governing the Civilisation.

---

### RT-GOV-001 — GOVERNS

**Source:** constitution-v1.md Art. 1–8 (Constitution governs all behaviour); ARCH-00 (GOVERNS listed in typed relationship set); certification Phase 2.3 (25 invariants evaluated against governing documents); handoff ("Constitution", "Policy", "Rule" in typed relationship list)

**Definition:** GOVERNS asserts that the source entity imposes behavioural constraints on the target entity. The source is a constitutional or policy authority; the target is any entity whose behaviour is constrained by that authority. GOVERNS is the foundational structural relationship of the Civilisation — it establishes that no entity operates outside the constraints of the governing hierarchy. GOVERNS is a structural relationship, not a per-action event; a Constitution GOVERNS all Civilisation entities by definition, not by individual assertion.

**Source Entity Types:** ET-GOV-002 (Constitution), ET-GOV-003 (Policy), ET-GOV-004 (Rule), ET-IDN-004 (Authority Grant)

**Target Entity Types:** Any entity type — the scope is declared in the source entity's `scope_description` attribute

**Source Cardinality:** MANY (a single authority may govern many target entities)
**Target Cardinality:** MANY (a single entity may be governed by multiple authorities at different levels)
**Inverse Name:** IS_GOVERNED_BY
**Evidence Obligation:** NO (GOVERNS is structural; individual enforcement events are captured by ENFORCES and VALIDATES)
**Conditional Evidence Rule:** N/A

**Notes:** The scope of Constitution's GOVERNS is implicit — it governs all entities. Policy's GOVERNS is explicit — declared in `scope_description`. Rule's GOVERNS is narrowest — it governs specific transition types or boundary crossings. This hierarchy of specificity governs the authority precedence rule: Rule-level GOVERNS cannot override Constitution-level GOVERNS.

---

### RT-GOV-002 — DERIVES_FROM

**Source:** constitution-v1.md ("Policies derive from constitutional authority"); Scripts/CONSTITUTION.md Art. 2 (admission_rules are policy-derived); certification (DERIVES_FROM in handoff typed relationship list); Phase 2.3 Gap Analysis (10 domains, each Projection derives from a Source of Truth)

**Definition:** DERIVES_FROM asserts that the source entity's existence, authority, or content is grounded in the target entity. Used in two structural contexts: (a) authority derivation — a Policy or Rule derives its authority from a Constitution; (b) data derivation — a Projection derives its content from a Source of Truth. In both cases, if the target ceases to exist or is superseded, the source entity must be re-evaluated.

**Source Entity Types:** ET-GOV-003 (Policy), ET-GOV-004 (Rule), ET-DAT-005 (Projection), ET-KNW-002 (Lesson — derives from Episodic Memory), ET-KNW-008 (Reflection — derives from Memory Records)

**Target Entity Types:** ET-GOV-002 (Constitution — for authority derivation), ET-DAT-004 (Source of Truth — for data derivation), ET-KNW-001 (Memory Record — for Lesson derivation)

**Source Cardinality:** MANY (many Policies may derive from one Constitution)
**Target Cardinality:** ONE (each Policy derives from exactly one Constitution; each Projection from exactly one Source of Truth)
**Inverse Name:** IS_BASIS_FOR
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** DERIVES_FROM is transitive in the authority domain: if Policy DERIVES_FROM Constitution, and Rule BELONGS_TO Policy, then Rule transitively DERIVES_FROM Constitution. This transitivity must be enforced by ARCH-07 (Boundary Policy).

---

### RT-GOV-003 — ENFORCES

**Source:** lib/memory/gateway.js (write gateway enforces memory write Policy); lib/runtime/constitutional-gate.js (enforces constitutional Policy); lib/kernel.js kernelChain (enforces authority Policy at each gate); certification finding C02 (checkGovernance UNCONDITIONALLY_OPEN — confirms a gateway that should ENFORCE but does not)

**Definition:** ENFORCES asserts that the source entity actively applies a Policy or Rule at a Boundary, producing a permitted or denied outcome for each attempted crossing or invocation. ENFORCES is the runtime relationship that instantiates GOVERNS — while GOVERNS is structural, ENFORCES is the per-boundary operational commitment of a Service to apply rules to all passing requests. A Gateway without any ENFORCES relationship is structurally incomplete.

**Source Entity Types:** ET-SVC-003 (Gateway), ET-SVC-001 (Service)

**Target Entity Types:** ET-GOV-003 (Policy), ET-GOV-004 (Rule)

**Source Cardinality:** ONE (a Gateway enforces a specific set of Policies/Rules)
**Target Cardinality:** MANY (a Gateway may enforce multiple Policies)
**Inverse Name:** IS_ENFORCED_BY
**Evidence Obligation:** YES (every ENFORCES evaluation must produce an Audit Record — ET-KNW-005)
**Conditional Evidence Rule:** N/A

**Notes:** The checkGovernance function in lib/agent-file-utils.js should produce an ENFORCES relationship with the Governance Policy as target. Instead, it is confirmed UNCONDITIONALLY_OPEN — it never produces a DENIES relationship. This means the ENFORCES relationship exists architecturally (the function exists) but is defective in implementation (C02, CRITICAL). The constitutional-gate.js is FAIL-OPEN on error — also producing phantom ENFORCES relationships.

---

### RT-GOV-004 — AUTHORIZES

**Source:** lib/kernel.js checkAuthority() gate; constitution-v1.md Art. 6 (authority limits); certification INV-B1 (Authority checked before privileged operations: NOT ENFORCED); kernelChain gate 3 confirmed FAIL-OPEN on error

**Definition:** AUTHORIZES asserts that a specific Identity, Authority Grant, or Session Identity has granted permission for a specific Capability invocation, Lifecycle Transition, or Boundary crossing. AUTHORIZES is a positive permission decision — it asserts that the action is permitted under the governing rules. Every AUTHORIZES relationship must be traceable to a Trust Level and, transitively, to a governing Policy.

**Source Entity Types:** ET-IDN-001 (Identity), ET-IDN-004 (Authority Grant), ET-IDN-005 (Session Identity)

**Target Entity Types:** ET-CAP-001 (Capability), ET-CAP-002 (Tool), ET-OPS-002 (Agent Task) lifecycle transition, any Boundary crossing

**Source Cardinality:** ONE (a specific Identity authorizes a specific action)
**Target Cardinality:** ONE (each authorization decision concerns one specific action)
**Inverse Name:** IS_AUTHORIZED_BY
**Evidence Obligation:** YES (each AUTHORIZES decision must produce an Audit Record)
**Conditional Evidence Rule:** N/A

**Notes:** INV-B1 confirms checkAuthority() is NOT ENFORCED — the gate is FAIL-OPEN, meaning AUTHORIZES relationships are produced even when the Identity lacks sufficient Trust Level. This produces invalid AUTHORIZES relationships — architecturally valid in form but defective in content. ARCH-07 must require that AUTHORIZES is only produced when Trust Level ≥ required_authority.

---

### RT-GOV-005 — DENIES

**Source:** kernelChain gate structure (DENIES is the negative outcome of each gate evaluation); constitution-v1.md Art. 6 (authority limits that may not be exceeded); certification C02 (checkGovernance never DENIES — confirming that DENIES is architecturally expected but absent)

**Definition:** DENIES asserts that a specific Identity, Authority Grant, or Gateway has rejected a specific Capability invocation, Lifecycle Transition, or Boundary crossing. DENIES is the negative permission decision — it asserts that the action is not permitted under the governing rules. Every DENIES relationship must produce an Audit Record with the rejection reason.

**Source Entity Types:** ET-IDN-001 (Identity), ET-IDN-004 (Authority Grant), ET-SVC-003 (Gateway)

**Target Entity Types:** ET-CAP-001 (Capability), ET-CAP-002 (Tool), ET-OPS-002 (Agent Task) lifecycle transition, any Boundary crossing

**Source Cardinality:** ONE
**Target Cardinality:** ONE
**Inverse Name:** IS_DENIED_BY
**Evidence Obligation:** YES (every DENIES decision must produce an Audit Record)
**Conditional Evidence Rule:** N/A

**Notes:** A Gateway that never produces DENIES relationships is architecturally anomalous. The absence of DENIES from checkGovernance (C02) is a diagnostic signal: if a Boundary never DENIEs, either all requests are legitimate or enforcement is broken. The certification confirms the latter. ARCH-07 must require Gateways to produce DENIES relationships or have documented justification for their absence.

---

### RT-GOV-006 — DELEGATES_TO

**Source:** constitution-v1.md Art. 6 ("Founder delegates to Council; Council delegates to Ministry"); lib/kernel.js (identity chain: Founder → Council → Ministry → Agent); handoff (DELEGATES_TO in typed relationship list)

**Definition:** DELEGATES_TO asserts that the source entity has formally conferred a bounded subset of its authority to the target entity. Delegation requires the creation of an Authority Grant (ET-IDN-004) as its reified evidence artifact. A delegated authority may never exceed the delegating entity's own authority. Delegation chains are transitive but bounded — an Entity may only delegate authority it currently holds.

**Source Entity Types:** ET-GOV-001 (Founder), ET-EXE-002 (Council Member)

**Target Entity Types:** ET-EXE-002 (Council Member), ET-EXE-003 (Ministry), ET-OPS-001 (Agent)

**Source Cardinality:** ONE (a specific Entity delegates to specific targets)
**Target Cardinality:** MANY (one Entity may delegate to multiple entities)
**Inverse Name:** RECEIVES_DELEGATION_FROM
**Evidence Obligation:** YES (each DELEGATES_TO must produce an Authority Grant — ET-IDN-004)
**Conditional Evidence Rule:** N/A

**Notes:** DELEGATES_TO is the mechanism by which SOVEREIGN authority is distributed through the Civilisation without being surrendered. The delegating entity retains its authority — DELEGATES_TO is additive for the recipient, not subtractive for the source. This is the constitutional basis for the seven Council Member roles and the Ministry system.

---

### RT-GOV-007 — CERTIFIES

**Source:** Phase 2.3 Architectural Certification (25 invariants certified; 4 ENFORCED, 12 PARTIALLY ENFORCED, 7 NOT ENFORCED, 1 SIMULATED ONLY); ARCH-00 Section 2 (Certification concept); constitution-v1.md Art. 3 (evidence chain required for all governance assertions)

**Definition:** CERTIFIES asserts that a Certification entity has formally assessed a specific architectural Constraint, invariant, or Policy Rule and produced a verdict on whether it is satisfied. CERTIFIES links a Certification entity to what it certifies. The Certification entity carries the verdict; the CERTIFIES relationship establishes what is being assessed.

**Source Entity Types:** ET-GOV-005 (Certification)

**Target Entity Types:** Architectural Constraint (from ARCH-00), ET-GOV-004 (Rule), ET-GOV-003 (Policy)

**Source Cardinality:** ONE (each Certification certifies one subject)
**Target Cardinality:** ONE
**Inverse Name:** IS_CERTIFIED_BY
**Evidence Obligation:** YES (the Certification entity itself is the evidence artifact)
**Conditional Evidence Rule:** N/A

**Notes:** The Phase 2.3 certification produced 25 CERTIFIES instances. Each Certification entity CERTIFIES one invariant and IS_SUPPORTED_BY one or more Evidence Records. A later Certification that CERTIFIES the same target SUPERSEDES the prior one. Regression — a later CERTIFIES producing a worse verdict than the prior — must be flagged as a critical finding.

---

### RT-GOV-008 — VALIDATES

**Source:** ARCH-00 Section 2 (Validation concept); lib/runtime/constitutional-gate.js (validates requests against constitution); lib/kernel.js kernelChain (validates identity, ownership, authority, governance in sequence); certification (4-gate validation chain confirmed)

**Definition:** VALIDATES asserts that a Rule, Policy, or Gateway has evaluated a specific Entity, action, or state against its governing criteria and produced a result. VALIDATES is the per-instance application of governance criteria — distinct from ENFORCES (which is the structural commitment) and GOVERNS (which is the structural constraint). A VALIDATES evaluation produces a binary result: the entity either satisfies or violates the criteria.

**Source Entity Types:** ET-GOV-004 (Rule), ET-GOV-003 (Policy), ET-SVC-003 (Gateway)

**Target Entity Types:** Any entity undergoing a Lifecycle Transition, any Boundary crossing, any Capability invocation

**Source Cardinality:** ONE
**Target Cardinality:** MANY (a Rule validates all relevant instances)
**Inverse Name:** IS_VALIDATED_BY
**Evidence Obligation:** CONDITIONAL
**Conditional Evidence Rule:** Evidence required when VALIDATES produces a violation finding; optional when the result is satisfactory

**Notes:** VALIDATES is the lowest-level governance operation. The kernelChain's four gates each represent one VALIDATES operation: (1) VALIDATES identity (resolveIdentity — FAIL-SOFT), (2) VALIDATES ownership (resolveOwnership — FAIL-SOFT), (3) VALIDATES authority (checkAuthority — FAIL-OPEN on error), (4) VALIDATES governance (checkGovernance — UNCONDITIONALLY_OPEN). All four gates are defective — none consistently produce negative VALIDATES results.

---

## Group 2: Structure (RT-STR)

Relationship types that establish the compositional, ownership, versioning, and dependency structure of the Civilisation.

---

### RT-STR-001 — OWNS

**Source:** constitution-v1.md Art. 1 ("Founder has absolute ownership authority"); ARCH-00 INV-META-38 ("every entity except the root is owned by exactly one entity"); handoff (OWNS in typed relationship list); implicit in all entity type Ownership Rule fields in ARCH-01-PLAN

**Definition:** OWNS asserts that the source entity holds governance authority over the target entity — including the right to modify, archive, delegate, or transfer the target entity within constitutional limits. The OWNS graph is a rooted tree with ET-GOV-001 (Founder) as the root. Every entity except the Founder has exactly one OWNS relationship pointing to it from its owning entity.

**Source Entity Types:** Any entity type (any entity may own others within its authority)

**Target Entity Types:** Any entity type (except ET-GOV-001, which has no owner)

**Source Cardinality:** ONE (each owned entity has exactly one owner)
**Target Cardinality:** MANY (an entity may own many entities)
**Inverse Name:** IS_OWNED_BY
**Evidence Obligation:** NO (ownership is structural; transfer of ownership requires an Amendment or Authority Grant)
**Conditional Evidence Rule:** N/A

**Notes:** OWNS must form a strict tree — no cycles, no orphan entities. Ownership determines audit responsibility: when a target entity violates a rule, the owning entity is accountable. OWNS is the governance foundation; CONTAINS is the operational composition relationship (they differ because an entity may CONTAIN something it does not OWN — e.g., a Queue CONTAINS Agent Tasks whose owner is the executing Agent).

---

### RT-STR-002 — CONTAINS

**Source:** certification (Council ENTITIES array: ceo, coo, cso, cgo, cro, clo, cho — Council CONTAINS Council Members); Policy CONTAINS Rules; Queue CONTAINS pending Agent Tasks; Deliberation CONTAINS Votes; Phase 1 census (Repository CONTAINS Folders and Files); handoff (CONTAINS in typed relationship list)

**Definition:** CONTAINS asserts a compositional membership relationship: the target entity is a member or component of the source entity. CONTAINS establishes the structural hierarchy. Unlike OWNS, CONTAINS does not require that the source entity governs the target — it requires only that the target is structurally part of the source. The source entity's lifecycle directly affects contained entities: when a source entity is ARCHIVED, all contained entities must be addressed.

**Source Entity Types:** ET-EXE-001 (Council), ET-GOV-003 (Policy), ET-EXE-004 (Deliberation), ET-OPS-005 (Queue), ET-OPS-003 (Workflow Run), ET-PHY-001 (Repository), ET-PHY-002 (Folder), ET-PHY-007 (Database)

**Target Entity Types:** ET-EXE-002 (Council Member), ET-GOV-004 (Rule), ET-EXE-005 (Vote), ET-OPS-002 (Agent Task), ET-OPS-002 (Agent Task), ET-PHY-002 (Folder)/ET-PHY-003 (File), ET-PHY-003 (File), ET-PHY-008 (Table)

**Source Cardinality:** MANY (each container may hold many items)
**Target Cardinality:** ONE (each item is contained in exactly one parent container in this relationship)
**Inverse Name:** BELONGS_TO (RT-STR-003)
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** CONTAINS and BELONGS_TO are the same edge — CONTAINS is the parent-to-child reading; BELONGS_TO is the child-to-parent reading. They are specified separately for clarity but share a single implementation.

---

### RT-STR-003 — BELONGS_TO

**Source:** Exact inverse of CONTAINS (RT-STR-002); handoff (BELONGS_TO in typed relationship list); ARCH-01-PLAN Key Relationships sections throughout

**Definition:** BELONGS_TO asserts that the source entity is a structural member or component of the target entity. BELONGS_TO is the canonical inverse of CONTAINS — the child entity's declaration of its parent container. An entity that BELONGS_TO a parent entity cannot independently exist without that parent's existence.

**Source Entity Types:** ET-EXE-002 (Council Member), ET-GOV-004 (Rule), ET-EXE-005 (Vote), ET-OPS-002 (Agent Task), ET-PHY-002 (Folder), ET-PHY-003 (File), ET-PHY-008 (Table)

**Target Entity Types:** ET-EXE-001 (Council), ET-GOV-003 (Policy), ET-EXE-004 (Deliberation), ET-OPS-003 (Workflow Run), ET-PHY-001 (Repository)/ET-PHY-002 (Folder), ET-PHY-001/ET-PHY-002, ET-PHY-007 (Database)

**Source Cardinality:** ONE (each entity belongs to exactly one parent container)
**Target Cardinality:** MANY (a container has many members)
**Inverse Name:** CONTAINS (RT-STR-002)
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** BELONGS_TO is specified separately from CONTAINS because in the relationship model both directions are navigable and have distinct semantic uses. BELONGS_TO is the child's anchor to its structural context; CONTAINS is the parent's enumeration of its members.

---

### RT-STR-004 — SUPERSEDES

**Source:** Scripts/CONSTITUTION.md amendment log (4 entries, each creating a new version that supersedes prior); Phase 2.3 Gap Analysis (12 proposed documents — each eventual replacement supersedes a prior); certification (Certification SUPERSEDES prior Certification for same subject); ARCH-00 Section 5 (Versioning); handoff (SUPERSEDES in typed relationship list)

**Definition:** SUPERSEDES asserts that the source entity is the authoritative current version and the target entity is its prior version that is now superseded. The superseded entity is ARCHIVED but must remain accessible for historical audit. The SUPERSEDES chain provides the version history of any versioned entity. A SUPERSEDES relationship must reference the Amendment or governance event that authorised the version transition.

**Source Entity Types:** ET-GOV-002 (Constitution), ET-GOV-003 (Policy), ET-GOV-005 (Certification), ET-DAT-002 (Registry Record), ET-KNW-009 (Document)

**Target Entity Types:** Prior instance of the same entity type

**Source Cardinality:** ONE
**Target Cardinality:** ONE
**Inverse Name:** IS_SUPERSEDED_BY
**Evidence Obligation:** YES (supersession requires an Amendment — ET-GOV-006 — or equivalent governance event as evidence)
**Conditional Evidence Rule:** N/A

**Notes:** The SUPERSEDES chain must be acyclic and linear (no entity may supersede more than one prior; no prior may be superseded by more than one successor). Bi-directional traversal of the chain provides full version history. A Certification that SUPERSEDES a prior Certification for the same target provides a regression or improvement signal.

---

### RT-STR-005 — DEPENDS_ON

**Source:** Phase 2.1 static dependency graph (import/require relationships across the codebase); services/init.js (12-step cascade — each step DEPENDS_ON prior steps completing); handoff (DEPENDS_ON in typed relationship list); 00-MASTER-PLAN.md dependency layers (each ARCH document DEPENDS_ON prior ones)

**Definition:** DEPENDS_ON asserts that the source entity's correct operation requires the target entity to be available and functioning. DEPENDS_ON is a structural relationship — it persists for the life of the source entity, not per invocation. If the target entity fails or is unavailable, the source entity's health is degraded or broken.

**Source Entity Types:** ET-SVC-001 (Service), ET-PHY-004 (Module), ET-CAP-001 (Capability), ET-KNW-009 (Document), ET-PHY-009 (Environment Variable)

**Target Entity Types:** ET-SVC-001 (Service), ET-PHY-004 (Module), ET-CAP-001 (Capability), ET-PHY-009 (Environment Variable)

**Source Cardinality:** MANY
**Target Cardinality:** MANY
**Inverse Name:** IS_DEPENDENCY_OF
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** DEPENDS_ON graphs must be acyclic — a dependency cycle is an architectural defect. The services/init.js 12-step cascade is the runtime manifestation of DEPENDS_ON: each initialisation step depends on the prior steps. The FAIL-SOFT classification of the init cascade means that some DEPENDS_ON relationships are satisfied with degraded targets, not just full failures.

---

## Group 3: Physical (RT-PHY)

Relationship types bridging the Physical Layer to the Civilisation Layer and governing versioned change.

---

### RT-PHY-001 — IMPLEMENTS

**Source:** Phase 2.1 and Phase 2.2 runtime census (modules implement services; functions implement capabilities); handoff ("the repository is one projection of the civilisation" — Files IMPLEMENT Civilisation entities); ARCH-00 meta-model (the Physical Layer implements Civilisation entities via IMPLEMENTS); handoff (IMPLEMENTS in typed relationship list)

**Definition:** IMPLEMENTS asserts that a Physical entity (File, Module, Function, Class, Route, Handler) is the technical realisation of a specific Civilisation entity (Service, Capability, Source of Truth, Schedule, Interface). IMPLEMENTS is the bridge relationship that makes the repository meaningful in Civilisation terms. A Civilisation entity with no IMPLEMENTS relationship pointing to it is unimplemented — it exists in the governance architecture but has no physical form.

**Source Entity Types:** ET-PHY-003 (File), ET-PHY-004 (Module), ET-PHY-005 (Function), ET-PHY-006 (Class), ET-PHY-010 (API Route), ET-PHY-011 (WebSocket Handler), ET-PHY-012 (Cron Schedule)

**Target Entity Types:** ET-SVC-001 (Service), ET-CAP-001 (Capability), ET-DAT-004 (Source of Truth), ET-OPS-004 (Schedule), ET-SVC-002 (Interface)

**Source Cardinality:** MANY (multiple Physical entities may contribute to implementing one Civilisation entity)
**Target Cardinality:** ONE (each Physical entity has one primary Civilisation entity it implements)
**Inverse Name:** IS_IMPLEMENTED_BY
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** IMPLEMENTS is the foundation of the Repository Transformation Plan (ARCH-15). When every Physical entity has exactly one IMPLEMENTS target, the repository structure can be reorganised to reflect Civilisation structure rather than programming conventions. The inverse IS_IMPLEMENTED_BY supports the query "which physical artifacts implement this Civilisation entity?" — essential for impact analysis.

---

### RT-PHY-002 — DEPLOYS

**Source:** Render hosting (platform deploys the Repository); Repository DEPLOYS Files into the runtime; handoff (DEPLOYS in typed relationship list); certification (Render cron routes — Render platform deploys cron endpoints)

**Definition:** DEPLOYS asserts that the source entity makes the target entity available in a runtime environment. DEPLOYS is distinct from IMPLEMENTS: a File IMPLEMENTS a Service (logical relationship), while the Repository DEPLOYS that File (availability relationship). DEPLOYS concerns environment-level availability — whether the artifact is accessible at runtime — not its logical meaning.

**Source Entity Types:** ET-PHY-001 (Repository), ET-PHY-002 (Folder)

**Target Entity Types:** ET-PHY-003 (File), ET-PHY-004 (Module), ET-SVC-001 (Service), ET-PHY-012 (Cron Schedule)

**Source Cardinality:** ONE (a Repository deploys into one primary runtime environment; folder deploys its contents)
**Target Cardinality:** MANY (one Repository deploys many artifacts)
**Inverse Name:** IS_DEPLOYED_BY
**Evidence Obligation:** CONDITIONAL
**Conditional Evidence Rule:** Deployments to production that change constitutional-significance environment variables or routes must produce Evidence

**Notes:** DEPLOYS is the operational availability relationship. A Civilisation entity may IMPLEMENT a capability that is not yet DEPLOYED — this represents a planned but not yet active feature. The inverse IS_DEPLOYED_BY supports the query "in which environments is this artifact available?"

---

### RT-PHY-003 — MODIFIES

**Source:** Scripts/CONSTITUTION.md amendment log (4 entries, each MODIFYING the Constitution); ARCH-00 Section 6 (Meta-Model Governance — amendment process); constitution-v1.md Art. 8 (amendment procedure requiring SOVEREIGN ratification)

**Definition:** MODIFIES asserts that an Amendment has made a sanctioned change to the content or structure of a Constitution or architectural specification. MODIFIES is the amendment-to-document relationship. Every MODIFIES relationship produces a new version of the target document and a SUPERSEDES chain. MODIFIES without SOVEREIGN ratification is an unauthorised modification — an architectural defect.

**Source Entity Types:** ET-GOV-006 (Amendment)

**Target Entity Types:** ET-GOV-002 (Constitution), ET-KNW-009 (Document — specifically ARCH specification documents)

**Source Cardinality:** ONE (each Amendment modifies one primary target, though it may produce cascading changes)
**Target Cardinality:** ONE
**Inverse Name:** IS_MODIFIED_BY
**Evidence Obligation:** YES (the Amendment entity is the evidence artifact; ratification by SOVEREIGN must be recorded)
**Conditional Evidence Rule:** N/A

**Notes:** MODIFIES requires CRO + CLO review and SOVEREIGN ratification per constitution-v1.md Art. 8. An Amendment that lacks these reviews is structurally present but constitutionally invalid. MODIFIES creates a new version; SUPERSEDES records the version chain. Together, MODIFIES + SUPERSEDES form the full change history.

---

## Group 4: Execution (RT-EXE)

Relationship types that capture operational work: task assignment, capability use, scheduling, and triggering.

---

### RT-EXE-001 — EXECUTES

**Source:** certification (agent-task-cycle.js: Agent assigned to Task, Task moves through lifecycle; agent-queue.js: queue dequeues and executes); ARCH-01-PLAN ET-OPS-001 Key Relationships (EXECUTES → Agent Task); handoff (EXECUTES implied)

**Definition:** EXECUTES asserts that an Agent has assumed responsibility for and is performing or has performed an Agent Task. EXECUTES is the assignment-to-action relationship — it connects the Agent identity to the work unit. An Agent Task is EXECUTED by exactly one Agent. An Agent may EXECUTE many Tasks over its lifetime. EXECUTES begins when the Task transitions to EXECUTING state and persists through COMPLETED or FAILED.

**Source Entity Types:** ET-OPS-001 (Agent)

**Target Entity Types:** ET-OPS-002 (Agent Task)

**Source Cardinality:** MANY (one Agent executes many Tasks over time)
**Target Cardinality:** ONE (each Task is executed by exactly one Agent)
**Inverse Name:** IS_EXECUTED_BY
**Evidence Obligation:** YES (task execution must produce an Audit Record — apex_agent_runs table)
**Conditional Evidence Rule:** N/A

**Notes:** AUTONOMY_LEVEL=3 bypasses the PLANNED→APPROVED lifecycle gate, meaning EXECUTES relationships are established without an explicit AUTHORIZES relationship being produced first. This is constitutionally permitted at AUTONOMY_LEVEL=3 but must be documented in the Task's `autonomy_level_at_creation` attribute. The apex_agent_runs table is the current evidence store for EXECUTES relationships.

---

### RT-EXE-002 — INVOKES

**Source:** lib/apex-tools.js (22 APEX_TOOLS — each invocation is an INVOKES relationship); agent-task-cycle.js (each step invokes a Capability from the 8-type allowlist); constitution-v1.md Art. 6 (Agents limited to assigned capabilities); handoff (INVOKES in typed relationship list)

**Definition:** INVOKES asserts that the source entity has made a discrete, request-level call to a Capability, Tool, or Model at a specific point in time. INVOKES is the per-invocation runtime relationship — not a structural dependency (DEPENDS_ON) but a discrete execution event. Each INVOKES instance may require AUTHORIZES to have been produced first, depending on the Capability's `authority_required` attribute.

**Source Entity Types:** ET-OPS-001 (Agent), ET-OPS-002 (Agent Task), ET-SVC-001 (Service)

**Target Entity Types:** ET-CAP-001 (Capability), ET-CAP-002 (Tool), ET-CAP-003 (Model)

**Source Cardinality:** MANY (an entity invokes many capabilities over time)
**Target Cardinality:** MANY (a capability is invoked by many entities)
**Inverse Name:** IS_INVOKED_BY
**Evidence Obligation:** CONDITIONAL
**Conditional Evidence Rule:** YES when Capability has `audit_obligation = YES`; YES for all Model invocations (cost tracking); NO for low-governance read Capabilities

**Notes:** The 22 APEX Tools each generate INVOKES relationships during execution. 6 browser tools are unadvertised — they may be INVOKED by the system without the model's explicit selection. web_search has Brave+DDG fallback — a failed INVOKES of the primary Capability followed by INVOKES of the fallback. The 8-type Agent step allowlist constrains which Capabilities may be the target of Agent-sourced INVOKES.

---

### RT-EXE-003 — SCHEDULES

**Source:** agent-task-cycle.js runDueSchedules (reads Schedule entities and triggers Agent Tasks); ET-OPS-004 (Schedule entity definition); ET-PHY-012 (Cron Schedule implements Schedule); certification (UR14 adaptation_refresh cron, UR15 weekly_review cron — confirmed SCHEDULES with unconfirmed targets)

**Definition:** SCHEDULES asserts that a Schedule or Cron Schedule entity is configured to initiate the creation and execution of an Agent Task, Workflow Run, or Process at defined intervals or trigger points. SCHEDULES is the configuration-time relationship; TRIGGERS is the per-execution runtime event. A Schedule entity SCHEDULES a Workflow indefinitely; at each trigger it TRIGGERS a new execution.

**Source Entity Types:** ET-OPS-004 (Schedule), ET-PHY-012 (Cron Schedule)

**Target Entity Types:** ET-OPS-003 (Workflow Run), ET-OPS-002 (Agent Task)

**Source Cardinality:** ONE (each Schedule is configured to trigger one target type)
**Target Cardinality:** ONE (structural — though many instances are created at runtime)
**Inverse Name:** IS_SCHEDULED_BY
**Evidence Obligation:** NO (the trigger is evidenced by the resulting EXECUTES)
**Conditional Evidence Rule:** N/A

**Notes:** Two unresolved Cron Schedules (UR14: adaptation_refresh, UR15: weekly_review) have confirmed SCHEDULES relationships where the target is UNKNOWN. This represents open SCHEDULES relationships — they exist in the physical layer (Render cron config) without confirmed Civilisation layer targets. ARCH-01-PLAN documented `implementation_ref` in ET-OPS-004 to bridge to ET-PHY-012.

---

### RT-EXE-004 — TRIGGERS

**Source:** lib/event-bus.js (Events trigger handlers; BACKGROUND_TASK_QUEUED TRIGGERS enqueuing; AGENT_COMPLETED TRIGGERS next step); agent-task-cycle.js (lifecycle transitions trigger subsequent steps); handoff (TRIGGERS in typed relationship list); certification (16 confirmed Event Types, each with expected trigger consequences)

**Definition:** TRIGGERS asserts that an Event, Lifecycle Transition, or threshold crossing has caused an execution consequence — the initiation of an Agent Task, Notification, further Event, or state change. TRIGGERS is a causal relationship between an occurrence and its consequence. Unlike SCHEDULES (time-based configuration), TRIGGERS is event-based and immediate.

**Source Entity Types:** ET-COM-001 (Event), ET-OPS-004 (Schedule) at fire time, Lifecycle Transition

**Target Entity Types:** ET-OPS-002 (Agent Task), ET-COM-002 (Notification), ET-COM-001 (Event — chain triggers), ET-OPS-003 (Workflow Run)

**Source Cardinality:** ONE (each triggering event causes specific consequences)
**Target Cardinality:** MANY (one Event may trigger multiple consequences)
**Inverse Name:** IS_TRIGGERED_BY
**Evidence Obligation:** NO (the triggered entity's creation is its own evidence)
**Conditional Evidence Rule:** N/A

**Notes:** The Event Bus delivers TRIGGERS relationships via setImmediate dispatch with no persistence. If the process dies between EMITS and TRIGGERS delivery, the causal relationship is silently lost. This is the no-persistence gap (ET-SVC-005 confirmation). TRIGGERS chains — where one Event TRIGGERS another Event — are present in the APEX runtime but are not traced, making causal analysis of cascading failures impossible.

---

### RT-EXE-005 — USES

**Source:** lib/models/runtime/index.js (Agents USE Model instances); agent-queue.js (Agents USE the Queue's capacity — USES the Resource Pool); lib/apex-tools.js (Services USE Tool schemas); certification (all confirmed runtime consumption relationships not rising to INVOKES specificity)

**Definition:** USES asserts a general ongoing utilisation relationship: the source entity makes regular use of the target entity during its operation. USES is weaker than INVOKES (which is a discrete per-call event) and less structural than DEPENDS_ON (which implies failure cascade). USES represents continuous, operational reliance — the source entity's normal operations regularly draw on the target.

**Source Entity Types:** ET-OPS-001 (Agent), ET-SVC-001 (Service), ET-PHY-004 (Module)

**Target Entity Types:** ET-CAP-003 (Model), ET-RES-003 (Resource Pool), ET-SVC-002 (Interface), ET-DAT-001 (Registry)

**Source Cardinality:** MANY
**Target Cardinality:** MANY
**Inverse Name:** IS_USED_BY
**Evidence Obligation:** CONDITIONAL
**Conditional Evidence Rule:** YES when the target is a Resource type (consumption tracking obligation); NO for structural service dependencies

**Notes:** USES serves as the catch-all operational dependency not covered by the more specific types (INVOKES, READS, WRITES, EXECUTES). It prevents the relationship ontology from needing a separate type for every permutation of operational reliance. ARCH-07 may restrict which Entity Types may USES which targets.

---

### RT-EXE-006 — CALLS

**Source:** Phase 2.1 static dependency graph (all import/require relationships mapped); Phase 2.2 runtime (confirmed function call chains: civilization-kernel.js → agent-task-cycle.js → agent-queue.js → gateway.js); handoff (CALLS in typed relationship list)

**Definition:** CALLS asserts that a Physical entity (Function, Module) has a direct code-level invocation relationship with another Physical entity (Function, API Route). CALLS is the Physical Layer equivalent of INVOKES and captures the static and dynamic code call graph confirmed in Phase 2.1. CALLS relationships between Physical entities correspond to INVOKES relationships between their implementing Civilisation entities.

**Source Entity Types:** ET-PHY-004 (Module), ET-PHY-005 (Function), ET-PHY-010 (API Route)

**Target Entity Types:** ET-PHY-004 (Module), ET-PHY-005 (Function), ET-PHY-010 (API Route)

**Source Cardinality:** MANY
**Target Cardinality:** MANY
**Inverse Name:** IS_CALLED_BY
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** CALLS is the code-level graph underlying the Civilisation-level INVOKES graph. Impact analysis in gitnexus is fundamentally an analysis of CALLS chains. The blast-radius of modifying a Function is determined by traversing IS_CALLED_BY relationships upstream. ARCH-15 (Repository Transformation Plan) must preserve all CALLS relationships when reorganising the Physical Layer.

---

### RT-EXE-007 — IS_PART_OF

**Source:** agent-task-cycle.js (Agent Tasks are steps in a Workflow Run; master-orchestrator.js planFeature groups Tasks into a workstream); certification (Deliberation HAS Vote — Vote IS_PART_OF Deliberation); ARCH-01-PLAN ET-OPS-002 Optional Attributes (`parent_workflow_id`)

**Definition:** IS_PART_OF asserts that the source entity is a constituent component of the target entity's execution, without necessarily being owned by it. IS_PART_OF is a participation relationship — the source contributes to the target's completion. Unlike BELONGS_TO (structural containment) and OWNS (governance authority), IS_PART_OF concerns functional participation in an execution context.

**Source Entity Types:** ET-OPS-002 (Agent Task), ET-INT-004 (Milestone), ET-EXE-005 (Vote)

**Target Entity Types:** ET-OPS-003 (Workflow Run), ET-INT-003 (Project), ET-EXE-004 (Deliberation)

**Source Cardinality:** MANY (one Task may participate in multiple Workflow Runs — though typically one)
**Target Cardinality:** ONE (an Agent Task IS_PART_OF exactly one Workflow Run)
**Inverse Name:** HAS_PART
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** IS_PART_OF differs from BELONGS_TO in ownership semantics. A Vote BELONGS_TO a Deliberation (structural containment and ownership by the voting Council Member). An Agent Task IS_PART_OF a Workflow Run (functional participation — the Task is owned by the Agent, not the Workflow Run). This distinction matters for audit attribution.

---

## Group 5: Data Flow (RT-DAT)

Relationship types governing how data is accessed, produced, and consumed.

---

### RT-DAT-001 — READS

**Source:** Phase 2.2 runtime census (chat-context.js reads memory tables; health/monitor.js reads health state; dynamic-agent-selector.js reads agent specs); handoff (READS in typed relationship list); certification (multiple read paths confirmed, many bypassing governance)

**Definition:** READS asserts that the source entity has accessed the content of the target entity's data store during its operation. READS does not modify the target. READS relationships feed the Source-of-Truth audit (ARCH-05) — they reveal which entities have read access to which stores and whether reads bypass designated Gateways.

**Source Entity Types:** ET-OPS-001 (Agent), ET-SVC-001 (Service), ET-PHY-004 (Module), ET-PHY-005 (Function)

**Target Entity Types:** ET-DAT-004 (Source of Truth), ET-DAT-005 (Projection), ET-KNW-001 (Memory Record), ET-KNW-009 (Document), ET-PHY-008 (Table)

**Source Cardinality:** MANY
**Target Cardinality:** MANY
**Inverse Name:** IS_READ_BY
**Evidence Obligation:** CONDITIONAL
**Conditional Evidence Rule:** YES when reading constitutionally significant data (Evidence Records, Certifications); NO for operational reads

**Notes:** The Source-of-Truth architecture requires all READS of authoritative data to go through the designated read path. READS relationships that bypass the designated path are architectural violations. Phase 2.3 confirmed 5+ write paths bypassing the Memory Gateway — the same analysis must be applied to READS in ARCH-05.

---

### RT-DAT-002 — WRITES

**Source:** lib/memory/gateway.js (designated write path for memory); certification (5+ write paths CONFIRMED bypassing gateway — C01, C08); lib/pg_helpers.js (direct table writes); handoff (WRITES in typed relationship list)

**Definition:** WRITES asserts that the source entity has modified the content of the target entity's data store. WRITES is the critical data modification relationship — all WRITES to Sources of Truth must flow through the designated Gateway and produce Audit Records. WRITES relationships that bypass the Gateway are unauthorised and constitute architectural defects.

**Source Entity Types:** ET-OPS-001 (Agent), ET-SVC-001 (Service), ET-SVC-003 (Gateway), ET-PHY-004 (Module)

**Target Entity Types:** ET-DAT-004 (Source of Truth), ET-KNW-001 (Memory Record), ET-PHY-008 (Table)

**Source Cardinality:** MANY
**Target Cardinality:** MANY
**Inverse Name:** IS_WRITTEN_BY
**Evidence Obligation:** YES (all WRITES to governed stores must produce Audit Records)
**Conditional Evidence Rule:** N/A

**Notes:** The memory-governor contradiction (C01) — which restricts memory writes but allows bypasses — means that WRITES relationships exist between modules and the Memory Source of Truth that have no corresponding ENFORCES relationship standing between them. WRITES without ENFORCES is an architectural defect pattern. Certification confirmed the following unauthorised WRITES paths: reflection-engine.js, obsidian-memory.js, reflexion-tracker.js direct writes bypassing gateway.

---

### RT-DAT-003 — PRODUCES

**Source:** agent-task-cycle.js (Agent Task PRODUCES Evidence Record on completion); executive-council.js (Deliberation PRODUCES Decision Record); reflection-engine.js (Reflection PRODUCES Lesson); handoff (PRODUCES in typed relationship list)

**Definition:** PRODUCES asserts that the source entity's operational process has created a formal output artifact — an entity with its own Identity, Lifecycle, and governance obligation. PRODUCES concerns the creation of formal civilisation entities as outputs, not raw data writes. A PRODUCED entity is a first-class architectural object that enters the Registry admission process.

**Source Entity Types:** ET-OPS-002 (Agent Task), ET-EXE-004 (Deliberation), ET-KNW-008 (Reflection), ET-SVC-001 (Service), ET-CAP-003 (Model) invocation

**Target Entity Types:** ET-KNW-004 (Evidence Record), ET-EXE-006 (Decision Record), ET-KNW-002 (Lesson), ET-KNW-008 (Reflection), ET-COM-002 (Notification), ET-KNW-009 (Document)

**Source Cardinality:** ONE (an Agent Task produces its specific outputs)
**Target Cardinality:** MANY (an Agent Task may produce multiple output artifacts)
**Inverse Name:** IS_PRODUCED_BY
**Evidence Obligation:** YES (the produced entity is the evidence; PRODUCES is self-evidencing)
**Conditional Evidence Rule:** N/A

**Notes:** PRODUCES differs from WRITES (raw data modification) and GENERATES (knowledge artifacts). PRODUCES concerns the creation of formal, named, lifecycle-bearing entities. An Agent Task that PRODUCES a Document must also WRITES to the Document's physical storage — two relationship instances for one act.

---

### RT-DAT-004 — CONSUMES

**Source:** lib/models/runtime/index.js (Model invocations consume Budget); lib/consumption-log.js (intended to track CONSUMES relationships but only logs to console — no DB); constitution-v1.md Art. 2 ($2 per-call and $500/month limits); certification (Resource consumption NOT PERSISTED — critical gap)

**Definition:** CONSUMES asserts that the source entity's operation has depleted a finite Resource — specifically Budget, Compute, or authorisation count. Every CONSUMES event must produce a Consumption Record (ET-RES-004). CONSUMES relationships are the constitutional mechanism for budget enforcement — without them, financial limits cannot be enforced.

**Source Entity Types:** ET-OPS-002 (Agent Task), ET-SVC-001 (Service), ET-CAP-003 (Model — each invocation consumes Budget)

**Target Entity Types:** ET-RES-001 (Resource), ET-RES-002 (Budget), ET-RES-003 (Resource Pool)

**Source Cardinality:** MANY
**Target Cardinality:** MANY
**Inverse Name:** IS_CONSUMED_BY
**Evidence Obligation:** YES (each CONSUMES must produce a Consumption Record)
**Conditional Evidence Rule:** N/A

**Notes:** This is among the most critical unimplemented relationship types. Every Model invocation is a CONSUMES event with a financial cost. The current lib/consumption-log.js logs CONSUMES relationships to the console only — no Consumption Records are persisted to the database. This means the $2 per-call limit and $500/month Council cap cannot be programmatically enforced. Constitution-v1.md Art. 2 violation is structural and ongoing.

---

## Group 6: Knowledge (RT-KNW)

Relationship types governing learning, reflection, and knowledge generation.

---

### RT-KNW-001 — LEARNS_FROM

**Source:** reflection-engine.js (generateReflectionLesson uses scoreLessonText; Agents incorporate lessons); obsidian-memory.js (logLesson — _lessonBuffer[50] cap); handoff (LEARNS_FROM in typed relationship list); ARCH-01-PLAN ET-OPS-001 Key Relationships

**Definition:** LEARNS_FROM asserts that an Agent has incorporated the insight of a Lesson into its operational knowledge, influencing future behaviour. LEARNS_FROM is the knowledge acquisition relationship — it establishes the connection between a Lesson (a synthesised insight) and the Agent whose future behaviour is shaped by it. The `_lessonBuffer[50]` cap in obsidian-memory.js limits how many concurrent LEARNS_FROM relationships can influence a given batch.

**Source Entity Types:** ET-OPS-001 (Agent)

**Target Entity Types:** ET-KNW-002 (Lesson)

**Source Cardinality:** MANY (one Agent learns from many Lessons over its lifetime)
**Target Cardinality:** MANY (one Lesson may be learned from by multiple Agents)
**Inverse Name:** IS_LEARNED_FROM_BY
**Evidence Obligation:** NO (the Lesson entity is the evidence artifact)
**Conditional Evidence Rule:** N/A

**Notes:** LEARNS_FROM is the relationship that closes the intelligence loop: Agent EXECUTES Task → Task PRODUCES Reflection → Reflection GENERATES Lesson → Agent LEARNS_FROM Lesson → Agent EXECUTES next Task with updated knowledge. Breaks in this chain degrade the Civilisation's adaptive capacity. SHA-1 deduplication on Lessons (_lessonHashes[200]) prevents duplicate LEARNS_FROM relationships from the same lesson text.

---

### RT-KNW-002 — REFLECTS_ON

**Source:** reflexion-tracker.js (tracks agent task outcomes for reflection); reflection-engine.js (uses episodic memory as reflection input); agent-task-cycle.js (reflexion influence tracking); handoff (REFLECTS_ON in typed relationship list)

**Definition:** REFLECTS_ON asserts that an Agent or Reflection entity has performed structured analytical examination of specific Memory Records or Agent Tasks in order to extract insights. REFLECTS_ON is the reflective attention relationship — it establishes which past experiences are the subject of the reflection process. A Reflection entity REFLECTS_ON its source experiences; an Agent initiates the reflection by directing attention to specific Memory Records.

**Source Entity Types:** ET-OPS-001 (Agent), ET-KNW-008 (Reflection)

**Target Entity Types:** ET-KNW-001 (Memory Record), ET-OPS-002 (Agent Task)

**Source Cardinality:** ONE (a Reflection reflects on its specific source experiences)
**Target Cardinality:** MANY (a Reflection may draw on multiple source records)
**Inverse Name:** IS_REFLECTED_ON_BY
**Evidence Obligation:** YES (the Reflection entity produced by this process is the evidence artifact)
**Conditional Evidence Rule:** N/A

**Notes:** Bug B1 (reflexion-tracker: `decisionMemoryId` always null — queries `'id'` instead of `'memory_id'`) means that REFLECTS_ON relationships between Reflections and DECISION-type Memory Records cannot be established in the current implementation. The column query defect severs this specific link. ARCH-10 must specify the corrected query.

---

### RT-KNW-003 — GENERATES

**Source:** health/monitor.js (generates Observations and Metrics); reflection-engine.js (generates Lessons from Reflection); telemetry/aggregator.js (generates health snapshots — currently disabled, DATA-5 comment)

**Definition:** GENERATES asserts that the source entity's ongoing operational process has produced a knowledge or observability artifact as a natural by-product of its functioning. GENERATES differs from PRODUCES — PRODUCES concerns formal operational outputs with explicit lifecycle governance; GENERATES concerns knowledge artifacts that emerge from the operation of a system (Observations from monitoring, Metrics from measurement, Lessons from reflection).

**Source Entity Types:** ET-KNW-008 (Reflection), ET-SVC-001 (Service), ET-OPS-002 (Agent Task)

**Target Entity Types:** ET-KNW-002 (Lesson), ET-KNW-006 (Observation), ET-KNW-007 (Metric), ET-KNW-004 (Evidence Record)

**Source Cardinality:** ONE (each generation process produces specific outputs)
**Target Cardinality:** MANY
**Inverse Name:** IS_GENERATED_BY
**Evidence Obligation:** NO (the generated artifact is itself the knowledge record)
**Conditional Evidence Rule:** N/A

**Notes:** The telemetry/aggregator.js health snapshot generation is DISABLED (DATA-5 comment). This means the GENERATES relationship between the aggregator Service and Metric entities is architecturally defined but not operational. The civilization_health_snapshots table exists (dimensions column confirmed) but receives no GENERATES writes.

---

### RT-KNW-004 — CAPTURES

**Source:** health/monitor.js (recordProviderCall, recordRetrievalCall — each recording captures a specific operational fact); ARCH-00 Section 2 (Observation concept — raw perceptions before validation); certification (observability findings confirm monitoring functions capture call-level data)

**Definition:** CAPTURES asserts that an Observation entity has recorded a specific operational fact or occurrence at a specific point in time. CAPTURES is the perception-to-record relationship — it connects an Observation to the specific state or occurrence it documents. An Observation that is VALIDATED becomes an Evidence Record; before validation, it CAPTURES a raw, unverified fact.

**Source Entity Types:** ET-KNW-006 (Observation)

**Target Entity Types:** Operational state or occurrence (not yet a formal entity — ARCH-08 will formalise the observation target model)

**Source Cardinality:** ONE (each Observation captures one specific fact)
**Target Cardinality:** ONE
**Inverse Name:** IS_CAPTURED_BY
**Evidence Obligation:** NO (Observations are pre-evidence; validation produces Evidence)
**Conditional Evidence Rule:** N/A

**Notes:** CAPTURES is the observability primitive. The progression is: system state occurs → monitoring Service GENERATES Observation → Observation CAPTURES the state → Observation is VALIDATED → produces Evidence Record. Breaking this chain at any point results in untracked system behaviour. The GENERATES → CAPTURES → VALIDATES pipeline is the constitutional traceability mechanism per Art. 3.

---

## Group 7: Observability (RT-OBS)

Relationship types governing monitoring, measurement, and state tracking.

---

### RT-OBS-001 — OBSERVES

**Source:** health/monitor.js (recordProviderCall, recordRetrievalCall, recordReflexionWrite, recordPolicyRetrieval — 4 confirmed observation types); telemetry/aggregator.js (computeCivilizationHealth — disabled); handoff (OBSERVES in typed relationship list)

**Definition:** OBSERVES asserts that a Service or Agent has set up a structured monitoring relationship with another entity, where significant state changes or events in the target are perceived and recorded as Observations. OBSERVES is the continuous monitoring relationship — distinct from the discrete CAPTURES (one observation event) and the structural MONITORS (ongoing health responsibility). A Service that OBSERVES another may be triggered by any change in the target's monitored attributes.

**Source Entity Types:** ET-SVC-001 (Service), ET-OPS-001 (Agent)

**Target Entity Types:** ET-SVC-001 (Service), ET-OPS-001 (Agent), ET-OPS-005 (Queue), ET-SVC-004 (Circuit Breaker), ET-CAP-003 (Model)

**Source Cardinality:** MANY (one Service may observe many targets)
**Target Cardinality:** MANY (one entity may be observed by many Services)
**Inverse Name:** IS_OBSERVED_BY
**Evidence Obligation:** NO (GENERATES Observation is the result; OBSERVES is the structural setup)
**Conditional Evidence Rule:** N/A

**Notes:** health/monitor.js OBSERVES Provider calls, Retrieval calls, Reflexion writes, and Policy retrievals — 4 confirmed OBSERVES targets. The telemetry snapshot being disabled means OBSERVES relationships exist but their outputs (Metrics in civilization_health_snapshots) are not materialised. ARCH-08 must specify which entities must be OBSERVED and the minimum observation frequency.

---

### RT-OBS-002 — MONITORS

**Source:** health/monitor.js _state in-memory structure (continuous health monitoring); certification findings (health check response fields); dashboard.html (visual monitoring of operational state); constitution-v1.md Art. 7 (system health must be monitored continuously); handoff (MONITORS in typed relationship list)

**Definition:** MONITORS asserts that the source entity maintains ongoing, continuous health awareness of the target entity — watching for degradation, failure, or threshold breaches. MONITORS is broader than OBSERVES (which targets specific attributes) — it encompasses all health aspects of the target. MONITORS is the relationship that triggers ESCALATES when thresholds are breached.

**Source Entity Types:** ET-SVC-001 (Service), ET-PHY-013 (Dashboard)

**Target Entity Types:** ET-SVC-001 (Service), ET-KNW-007 (Metric), ET-OPS-005 (Queue), ET-RES-002 (Budget), ET-SVC-004 (Circuit Breaker)

**Source Cardinality:** ONE (designated monitoring service for each target)
**Target Cardinality:** MANY (one monitoring service watches many entities)
**Inverse Name:** IS_MONITORED_BY
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** The MONITORS relationship from Dashboard to Service entities is the basis for the dashboard.html UI. Each dashboard widget IS_MONITORED_BY the widget's data source. MONITORS must be distinguished from OBSERVES: MONITORS is ongoing health responsibility; OBSERVES is specific attribute perception. A Service may MONITORS many entities while OBSERVES only specific metrics within each.

---

### RT-OBS-003 — MEASURES

**Source:** health/monitor.js _state (providerCalls, retrievalCalls, reflexionWrites, policyRetrievals — 4 measured dimensions); telemetry/aggregator.js (governance score computation); certification INV-H1 (NOT ENFORCED); handoff (implied by Metric entity type)

**Definition:** MEASURES asserts that a Metric entity quantifies a specific attribute of a specific target entity type. MEASURES is the structural link between a Metric and what it quantifies. A Metric that MEASURES a Queue's depth provides information about queue pressure; one that MEASURES a Model's call count provides usage data; one that MEASURES the governance score provides constitutional compliance state.

**Source Entity Types:** ET-KNW-007 (Metric)

**Target Entity Types:** Any entity type that has a quantifiable attribute

**Source Cardinality:** ONE (each Metric measures one specific attribute)
**Target Cardinality:** ONE (a specific Metric is defined for one attribute of one entity type)
**Inverse Name:** IS_MEASURED_BY
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** MEASURES is a definition-time relationship: it connects the Metric schema to what the Metric is about. At runtime, Metric instances contain values from their MEASURES target. The APEX governance score is a composite Metric that MEASURES the overall constitutional compliance of the Civilisation — its MEASURES target is the Civilisation as a whole.

---

### RT-OBS-004 — TRACKS

**Source:** apex_agent_runs table (tracks Agent execution history over time); civilization_health_snapshots (tracks governance score over time); obsidian-memory.js (tracks Lesson history via _lessonHashes[200]); certification (TRACKS implied by all time-series recording)

**Definition:** TRACKS asserts that the source entity maintains a longitudinal record of the target entity's state or value over time, enabling historical analysis and trend identification. TRACKS is the temporal persistence relationship — it creates the time-series record of an entity's evolution. Unlike MONITORS (which is current-state awareness), TRACKS is historical record-keeping.

**Source Entity Types:** ET-SVC-001 (Service), ET-DAT-001 (Registry)

**Target Entity Types:** ET-OPS-001 (Agent) reputation over time, ET-KNW-007 (Metric) historical values, ET-GOV-005 (Certification) history per invariant

**Source Cardinality:** MANY
**Target Cardinality:** MANY
**Inverse Name:** IS_TRACKED_BY
**Evidence Obligation:** CONDITIONAL
**Conditional Evidence Rule:** YES when tracking constitutional compliance states or governance scores

**Notes:** apex_agent_runs TRACKS Agent execution history — each row is a TRACKS instance. civilization_health_snapshots TRACKS governance score — currently disabled (DATA-5). The TRACKS relationship over Certifications enables regression detection: comparing consecutive TRACKS instances reveals whether governance is improving or deteriorating.

---

## Group 8: Communication (RT-COM)

Relationship types governing event emission, notification delivery, and upward escalation.

---

### RT-COM-001 — EMITS

**Source:** lib/event-bus.js emit() (16 confirmed event types; setImmediate dispatch); certification (AGENT_STARTED, AGENT_COMPLETED, BACKGROUND_TASK_QUEUED, CONSTITUTION_EVALUATED, MEMORY_STORED, DECISION_RECORDED and others confirmed); handoff (GENERATES in typed relationship list maps to event emission)

**Definition:** EMITS asserts that the source entity has published an Event to the Event Bus, making that Event available for all registered consumers. EMITS is the event publication relationship — the moment of announcement. The Event entity carries all information about the occurrence; the EMITS relationship establishes which entity produced it.

**Source Entity Types:** ET-OPS-001 (Agent), ET-SVC-001 (Service), ET-SVC-005 (Event Bus), ET-OPS-002 (Agent Task — lifecycle transitions)

**Target Entity Types:** ET-COM-001 (Event)

**Source Cardinality:** MANY (each entity may emit many Events)
**Target Cardinality:** ONE (each Event is emitted by one source)
**Inverse Name:** IS_EMITTED_BY
**Evidence Obligation:** NO (the Event is the evidence artifact)
**Conditional Evidence Rule:** N/A

**Notes:** setImmediate dispatch makes EMITS asynchronous — the emitting entity does not wait for consumers. Combined with no persistence, a process crash after EMITS but before consumer delivery means the Event is lost with no trace. ARCH-11 must specify whether EMITS requires delivery confirmation for constitutional Events (e.g., CONSTITUTION_EVALUATED must reach all consumers or be retried).

---

### RT-COM-002 — RECEIVES

**Source:** lib/event-bus.js on()/subscribe() (consumers register to receive Events); event-consumer.js (Slack notification delivery); constitution-v1.md Art. 7 (Founder must receive critical notifications within 5 minutes); certification (Slack failure silently swallowed — RECEIVES failure undetected)

**Definition:** RECEIVES asserts that the source entity has subscribed to and received delivery of an Event or Notification. RECEIVES is the consumption end of the EMITS-to-RECEIVES channel. For Events, RECEIVES requires successful delivery to the consumer. For Notifications, RECEIVES requires delivery to the designated recipient. A RECEIVES that fails but is not retried is a silent delivery failure.

**Source Entity Types:** ET-OPS-001 (Agent), ET-SVC-001 (Service), ET-GOV-001 (Founder — via Notification)

**Target Entity Types:** ET-COM-001 (Event), ET-COM-002 (Notification)

**Source Cardinality:** MANY (one entity may receive many Events)
**Target Cardinality:** MANY (one Event may be received by many consumers)
**Inverse Name:** IS_RECEIVED_BY
**Evidence Obligation:** CONDITIONAL
**Conditional Evidence Rule:** YES for Notifications to the Founder (constitution-v1.md Art. 7); NO for routine Event delivery

**Notes:** The Slack failure in event-consumer.js is silently swallowed — when Notification delivery fails, no RECEIVES relationship is produced and no failure evidence is generated. This means the Founder may not RECEIVE constitutional notifications without any alert. Constitution-v1.md Art. 7 requires notification within 5 minutes — the current silent-failure model cannot guarantee this.

---

### RT-COM-003 — RESPONDS_TO

**Source:** event-consumer.js (handler functions respond to specific Event types); lib/agent-task-cycle.js (responds to schedule triggers); ws-handler.js (server responds to WebSocket messages — 5 message type handlers); certification (confirmed event handler registrations)

**Definition:** RESPONDS_TO asserts that the source entity has a registered handler relationship with a specific Event or Message type, such that when an instance of that type is received, the source entity performs a defined action. RESPONDS_TO is the reaction relationship — it connects a consumer entity to the specific Event types it is designed to handle.

**Source Entity Types:** ET-SVC-001 (Service), ET-OPS-001 (Agent)

**Target Entity Types:** ET-COM-001 (Event), ET-COM-005 (Message)

**Source Cardinality:** MANY (one entity may respond to many Event types)
**Target Cardinality:** MANY (one Event type may have multiple responders)
**Inverse Name:** IS_RESPONDED_TO_BY
**Evidence Obligation:** CONDITIONAL
**Conditional Evidence Rule:** YES when the response involves a state change or Resource consumption

**Notes:** RESPONDS_TO is the structural handler registration. At runtime, when an Event TRIGGERS a RESPONDS_TO handler, the handler produces a RECEIVES followed by the handler's specific action (which may produce WRITES, PRODUCES, EMITS, or ESCALATES relationships). The chain EMITS → RECEIVES → RESPONDS_TO → [action] is the complete event handling sequence.

---

### RT-COM-004 — ESCALATES

**Source:** constitution-v1.md Art. 7 (critical conditions require Founder notification within 5 minutes); services/slack/index.js alertCritical() (escalation to Slack channel); certification (governance score < 60 — constitution Art. 5 escalation trigger); handoff (ESCALATES in typed relationship list)

**Definition:** ESCALATES asserts that the source entity has transferred a condition, decision, or situation to a higher-authority entity for resolution or awareness, because the condition exceeds the source entity's authority, capacity, or AUTONOMY_LEVEL. ESCALATES is the constitutional upward-delegation relationship. Every ESCALATES event must produce an Audit Record and, for critical conditions, must be delivered within 5 minutes (constitution-v1.md Art. 7).

**Source Entity Types:** ET-OPS-001 (Agent), ET-SVC-001 (Service), ET-SVC-003 (Gateway)

**Target Entity Types:** ET-EXE-002 (Council Member), ET-GOV-001 (Founder)

**Source Cardinality:** ONE (a specific entity escalates a specific condition)
**Target Cardinality:** ONE (escalation has a defined recipient)
**Inverse Name:** IS_ESCALATED_TO
**Evidence Obligation:** YES (escalation is a constitutional event; Audit Record required)
**Conditional Evidence Rule:** N/A

**Notes:** ESCALATES must produce a Notification (ET-COM-002) as its delivery mechanism when targeting the Founder. The Notification TRIGGERS a RECEIVES relationship at the Founder level. Slack failure silently swallowing the delivery (confirmed in event-consumer.js) means ESCALATES may fail silently — the ESCALATES relationship is produced but the IS_ESCALATED_TO delivery confirmation is absent.

---

## Group 9: Executive (RT-EXC)

Relationship types governing executive deliberation, voting, supervision, and reporting.

---

### RT-EXC-001 — DELIBERATES_ON

**Source:** executive-council.js deliberate() function (Step 10: writes to executive_deliberations table); constitution-v1.md Art. 6 (Council authority and quorum); certification findings (INV-F1: Executive decisions require full council — NOT ENFORCED; UN02: whether writes are awaited or fire-and-forget)

**Definition:** DELIBERATES_ON asserts that the Council has initiated and conducted a structured decision-making process on a specific subject. The subject of deliberation becomes a Deliberation entity (ET-EXE-004). DELIBERATES_ON connects the Council to the Deliberation it is conducting. A Deliberation is complete when sufficient VOTES_ON relationships have been collected and a Decision Record PRODUCED.

**Source Entity Types:** ET-EXE-001 (Council)

**Target Entity Types:** ET-EXE-004 (Deliberation)

**Source Cardinality:** ONE (the Council as a whole deliberates)
**Target Cardinality:** MANY (the Council conducts many Deliberations)
**Inverse Name:** IS_DELIBERATED_ON_BY
**Evidence Obligation:** YES (executive_deliberations table records this; certification confirmed writes)
**Conditional Evidence Rule:** N/A

**Notes:** INV-F1 (Executive decisions require full council: NOT ENFORCED) means the quorum requirement for DELIBERATES_ON is not enforced. A Deliberation may be CONCLUDED without all Council Members having VOTED_ON it. UN02 (whether executive writes are awaited or fire-and-forget) means the DELIBERATES_ON evidence record may be silently lost if the write is fire-and-forget.

---

### RT-EXC-002 — VOTES_ON

**Source:** executive-council.js (deliberate() records votes to executive_votes table — VOTING_ENTITIES confirmed as CEO, COO, CSO, CGO; CRO, CLO, CHO confirmed NOT in VOTING_ENTITIES); certification (INV-F1 NOT ENFORCED — missing votes not detected); ET-EXE-002 Required Attributes (has_vote: boolean)

**Definition:** VOTES_ON asserts that an individual Council Member has cast a formal vote on a Deliberation, recording a position (FOR / AGAINST / ABSTAIN) and rationale as a Vote entity (ET-EXE-005). VOTES_ON is restricted to Council Members where `has_vote = true`. A Deliberation that has not received VOTES_ON from all eligible voting members is constitutionally incomplete.

**Source Entity Types:** ET-EXE-002 (Council Member) where `has_vote = true`

**Target Entity Types:** ET-EXE-004 (Deliberation)

**Source Cardinality:** ONE (each eligible Council Member casts one vote per Deliberation)
**Target Cardinality:** MANY (a Council Member votes on many Deliberations over time)
**Inverse Name:** IS_VOTED_ON_BY
**Evidence Obligation:** YES (executive_votes table records this)
**Conditional Evidence Rule:** N/A

**Notes:** The non-voting status of CRO, CLO, CHO is a confirmed architectural fact. These three Council Members participate in Deliberations (their perspectives are included in the deliberation context) but may not produce VOTES_ON relationships. This architectural distinction must be enforced — a CRO VOTES_ON instance would be an unauthorised Vote and must be rejected.

---

### RT-EXC-003 — SUPERVISES

**Source:** constitution-v1.md Art. 6 (Council Members supervise Ministries); ET-EXE-003 Required Attributes (`supervising_council_member`); handoff (SUPERVISES implied in authority hierarchy)

**Definition:** SUPERVISES asserts that a Council Member holds executive oversight responsibility for a Ministry — including direction-setting, performance accountability, and the authority to approve cross-domain Ministry actions. SUPERVISES establishes the reporting line from Operational layer to Executive layer. Every Ministry must be SUPERVISED by exactly one Council Member.

**Source Entity Types:** ET-EXE-002 (Council Member)

**Target Entity Types:** ET-EXE-003 (Ministry)

**Source Cardinality:** ONE → MANY (one Council Member may supervise multiple Ministries)
**Target Cardinality:** ONE (each Ministry has exactly one supervising Council Member)
**Inverse Name:** IS_SUPERVISED_BY
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** The Ministry system is confirmed DESIGN_ONLY — no runtime implementation found in Phase 2.2. However, SUPERVISES relationships must be registered for Ministries at their creation, establishing the governance chain even before operational activation. The six confirmed Council Member roles (excluding CHO's scope) each carry implied SUPERVISES relationships for their domain's Ministries.

---

### RT-EXC-004 — REPORTS_TO

**Source:** constitution-v1.md Art. 6 (authority hierarchy — Ministries report to Council Members; Agents report to Ministries); handoff (authority chain: Human → Council → Ministry → Agent); ET-EXE-003 definition (Ministries report to their supervising Council Member)

**Definition:** REPORTS_TO asserts that the source entity has a formal information and accountability obligation to the target entity — it must keep the target informed of its activities, outcomes, and issues. REPORTS_TO establishes the upward information flow path that enables Council oversight of Operational activities. REPORTS_TO is the inverse of SUPERVISES for the Ministry-Council relationship and extends to the Agent-Ministry relationship.

**Source Entity Types:** ET-EXE-003 (Ministry), ET-OPS-001 (Agent)

**Target Entity Types:** ET-EXE-002 (Council Member), ET-EXE-001 (Council)

**Source Cardinality:** MANY (many entities report upward)
**Target Cardinality:** ONE (each entity reports to one superior)
**Inverse Name:** RECEIVES_REPORTS_FROM
**Evidence Obligation:** NO (reports are operational communications, not governance events)
**Conditional Evidence Rule:** N/A

**Notes:** REPORTS_TO and SUPERVISES are the two directions of the same hierarchical relationship. REPORTS_TO is the subordinate's obligation; SUPERVISES is the superior's authority. Together they constitute the governance chain. Agents without a defined REPORTS_TO relationship are ungoverned — ARCH-06 (Authority Policy) must require all Agents to have a REPORTS_TO target.

---

## Group 10: Intent (RT-INT)

Relationship types connecting execution to purpose, goal hierarchy, and strategic direction.

---

### RT-INT-001 — PURSUES

**Source:** master-orchestrator.js (planFeature, runMasterOrchestrator — workstreams organised around Goals); certification C13 (two independent goal systems — both PURSUE Goals but store them differently); ARCH-01-PLAN ET-INT-003 Key Relationships; handoff (PURSUES in typed relationship list)

**Definition:** PURSUES asserts that the source entity is actively directed toward the achievement of the target entity's desired state. PURSUES is the ongoing alignment relationship between execution and intent — an Agent Task PURSUES an Objective while it is executing; a Project PURSUES Goals over its life. PURSUES is not terminal — it describes directional orientation, not completion.

**Source Entity Types:** ET-INT-003 (Project), ET-OPS-001 (Agent), ET-OPS-002 (Agent Task), ET-OPS-003 (Workflow Run)

**Target Entity Types:** ET-INT-001 (Goal), ET-INT-002 (Objective)

**Source Cardinality:** MANY (a Project may pursue multiple Goals)
**Target Cardinality:** MANY (a Goal may be pursued by multiple Projects)
**Inverse Name:** IS_PURSUED_BY
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** The C13 defect (two independent goal systems) means PURSUES relationships are inconsistently registered — some land in Supabase (goal-graph.js), others in filesystem JSON (agent-system/goal-tracker.js). ARCH-05 must designate a single Source of Truth for Goals, at which point all PURSUES relationships can be consolidated.

---

### RT-INT-002 — ACHIEVES

**Source:** master-orchestrator.js markFeatureComplete (marks Goal-level completion); certification findings (Goal achievement not consistently tracked — Goal Source of Truth fragmented); constitution-v1.md Art. 3 (significant outcomes require evidence); handoff (ACHIEVES implied)

**Definition:** ACHIEVES asserts that the source entity's completion has resulted in the target entity transitioning to ACHIEVED state. ACHIEVES is the terminal completion relationship — unlike PURSUES (ongoing), ACHIEVES is a point-in-time event that permanently changes the target's lifecycle state. ACHIEVES must produce Evidence linking the completing action to the achieved Goal or Objective.

**Source Entity Types:** ET-INT-003 (Project), ET-OPS-002 (Agent Task), ET-OPS-003 (Workflow Run)

**Target Entity Types:** ET-INT-001 (Goal), ET-INT-002 (Objective), ET-INT-004 (Milestone)

**Source Cardinality:** ONE (a specific completion event achieves a specific outcome)
**Target Cardinality:** ONE
**Inverse Name:** IS_ACHIEVED_BY
**Evidence Obligation:** YES (achievement of a Goal is a significant civilisation event requiring Evidence)
**Conditional Evidence Rule:** N/A

**Notes:** ACHIEVES is the relationship type that transitions a Goal from ACTIVE to ACHIEVED. Without persistent ACHIEVES evidence, the Civilisation cannot demonstrate progress over time. The current implementation's ephemeral strategic planning (C09 — all Objectives expire in 2 hours) means ACHIEVES relationships for Objectives cannot be established before they expire.

---

### RT-INT-003 — CONTRIBUTES_TO

**Source:** handoff (Goal hierarchy — Objectives contribute to Goals, Milestones contribute to Projects); ARCH-01-PLAN ET-INT-002 Optional Attributes (`weight` — contribution magnitude); strategic-planning-engine.js (objective tracking toward goals, despite ephemeral storage)

**Definition:** CONTRIBUTES_TO asserts that the source entity's completion or progress makes a partial positive contribution to the target entity's completion. CONTRIBUTES_TO is the partial progress relationship in the goal hierarchy — many sources contribute to one target. The source entity's `weight` attribute determines the magnitude of its contribution. CONTRIBUTES_TO is accumulative — multiple completed sources aggregate toward full achievement.

**Source Entity Types:** ET-INT-002 (Objective), ET-INT-004 (Milestone), ET-OPS-002 (Agent Task)

**Target Entity Types:** ET-INT-001 (Goal), ET-INT-003 (Project)

**Source Cardinality:** MANY (many Objectives contribute to one Goal)
**Target Cardinality:** ONE (each contribution is toward one specific Goal or Project)
**Inverse Name:** RECEIVES_CONTRIBUTION_FROM
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** CONTRIBUTES_TO relationships form the progress aggregation graph. When all sources that CONTRIBUTES_TO a Goal have been ACHIEVED, the Goal should automatically be eligible for ACHIEVES. The strategic-planning-engine.js 2-hour TTL means CONTRIBUTES_TO relationships from Objectives expire before Goal progress can be properly aggregated.

---

### RT-INT-004 — INFORMS

**Source:** reflection-engine.js (Lessons inform future Agent behaviour); telemetry/aggregator.js (Metrics inform governance decisions); certification findings (Decision Records inform subsequent Deliberations); handoff (INFORMS in typed relationship list)

**Definition:** INFORMS asserts that the source entity's content provides relevant knowledge that should influence the decisions or direction of the target entity. INFORMS is an advisory relationship — the target entity is not obligated to act on it, but the Civilisation's decision quality depends on INFORMS relationships being followed. Metrics INFORM Objectives; Lessons INFORM Agent behaviour; Decision Records INFORM subsequent Deliberations.

**Source Entity Types:** ET-KNW-007 (Metric), ET-KNW-006 (Observation), ET-EXE-006 (Decision Record), ET-KNW-002 (Lesson), ET-KNW-008 (Reflection)

**Target Entity Types:** ET-INT-001 (Goal), ET-INT-002 (Objective), ET-GOV-003 (Policy), ET-EXE-004 (Deliberation)

**Source Cardinality:** MANY (many Metrics may inform one Goal)
**Target Cardinality:** MANY (one Metric may inform many Objectives)
**Inverse Name:** IS_INFORMED_BY
**Evidence Obligation:** NO
**Conditional Evidence Rule:** N/A

**Notes:** INFORMS is the knowledge-to-strategy pipeline. The Civilisation's strategic coherence depends on Metrics INFORMS Goals being evaluated regularly. The governance score (computed by telemetry/aggregator.js but currently disabled) should INFORMS the constitutional compliance Policy — this INFORMS relationship is architecturally required but structurally broken.

---

## Group 11: Identity / Trust (RT-IDN)

Relationship types establishing who entities are and what they are permitted to hold.

---

### RT-IDN-001 — IDENTIFIES

**Source:** ARCH-00 INV-META-01 ("every Entity has exactly one canonical Identity"); lib/kernel.js (resolveIdentity — FAIL-SOFT); lib/middleware.js (JWT and APP_KEY identity resolution); certification INV-A1 through A5; handoff (IDENTIFIES implied by Identity entity type)

**Definition:** IDENTIFIES asserts that an Identity entity is the canonical, persistent, and unique designation for a specific entity within the Civilisation. IDENTIFIES is the fundamental naming relationship — it establishes who something is for all purposes of authority, audit, and governance. Every entity except the root Founder must have exactly one Identity that IDENTIFIES it. An entity without an IDENTIFIES relationship pointing to it cannot be governed.

**Source Entity Types:** ET-IDN-001 (Identity)

**Target Entity Types:** Any entity type

**Source Cardinality:** ONE (each Identity identifies exactly one entity)
**Target Cardinality:** ONE (each entity has exactly one canonical Identity)
**Inverse Name:** IS_IDENTIFIED_BY
**Evidence Obligation:** NO (IDENTIFIES is structural)
**Conditional Evidence Rule:** N/A

**Notes:** resolveIdentity FAIL-SOFT means anonymous requests receive an Identity that IDENTIFIES them as Anonymous — indistinguishable in form from a verified Identity. This violates the architectural requirement that IDENTIFIES should carry trust information distinguishing verified from unverified entities. The FAIL-SOFT design makes all IDENTIFIES relationships structurally present but semantically weak for unverified requestors.

---

### RT-IDN-002 — AUTHENTICATES

**Source:** lib/middleware.js (requireAppAccess: APP_ACCESS_KEY timingSafeEqual or JWT jsonwebtoken.verify()); lib/ws-handler.js (WebSocket token verification timingSafeEqual); certification INV-A4 (WebSocket auth ENFORCED); INV-A5 (timing attacks prevented ENFORCED); C10 (BYPASS_DASHBOARD_AUTH operator-dependent guard)

**Definition:** AUTHENTICATES asserts that a Credential has been cryptographically or cryptographically-equivalent verified as proof of an Identity claim, establishing that the presenting entity is who they claim to be. AUTHENTICATES is the verification event relationship — it is produced each time a Credential is successfully validated. A failed authentication does not produce an AUTHENTICATES relationship; it produces a DENIES relationship.

**Source Entity Types:** ET-IDN-002 (Credential)

**Target Entity Types:** ET-IDN-001 (Identity)

**Source Cardinality:** MANY (a Credential authenticates many times over its lifecycle)
**Target Cardinality:** ONE (each authentication verifies one specific Identity)
**Inverse Name:** IS_AUTHENTICATED_BY
**Evidence Obligation:** YES (authentication events must produce Audit Records)
**Conditional Evidence Rule:** N/A

**Notes:** Two AUTHENTICATES mechanisms exist in APEX: (1) APP_ACCESS_KEY via timingSafeEqual — AUTHENTICATES the Founder identity for dashboard and API access; (2) JWT via jsonwebtoken.verify() — AUTHENTICATES for scoped access. BYPASS_DASHBOARD_AUTH (C10) creates conditions where AUTHENTICATES is bypassed when `NODE_ENV !== 'production'` — a critical authentication gap that must be explicitly modelled.

---

### RT-IDN-003 — IS_HELD_BY

**Source:** lib/middleware.js (Credentials are presented by requesting entities); ET-IDN-002 (Credential) Required Attributes (`holder_entity_id`); ET-IDN-004 (Authority Grant) Required Attributes (`grantee_identity_id`); handoff (credential possession implied)

**Definition:** IS_HELD_BY asserts that the source entity (a Credential or Authority Grant) is possessed by the target entity (the holder). IS_HELD_BY establishes the possession link between the proof artifact and the entity who may present or exercise it. A Credential IS_HELD_BY the entity who may present it for authentication. An Authority Grant IS_HELD_BY the entity who may exercise the delegated authority.

**Source Entity Types:** ET-IDN-002 (Credential), ET-IDN-004 (Authority Grant)

**Target Entity Types:** ET-GOV-001 (Founder), ET-EXE-002 (Council Member), ET-OPS-001 (Agent), ET-SVC-001 (Service)

**Source Cardinality:** ONE (each Credential or Grant is held by one entity)
**Target Cardinality:** MANY (an entity may hold multiple Credentials)
**Inverse Name:** HOLDS
**Evidence Obligation:** NO (IS_HELD_BY is structural)
**Conditional Evidence Rule:** N/A

**Notes:** IS_HELD_BY changes when Credentials expire or are revoked (the Credential's `status` transitions to EXPIRED or REVOKED, terminating the IS_HELD_BY relationship). Authority Grant IS_HELD_BY relationships terminate when the Grant expires or is rescinded. ARCH-04 (Identity Architecture) must specify the revocation process that severs IS_HELD_BY relationships.

---

## Relationship Type Summary

| Group | Count | IDs |
|-------|-------|-----|
| RT-GOV — Governance | 8 | RT-GOV-001 to RT-GOV-008 |
| RT-STR — Structure | 5 | RT-STR-001 to RT-STR-005 |
| RT-PHY — Physical | 3 | RT-PHY-001 to RT-PHY-003 |
| RT-EXE — Execution | 7 | RT-EXE-001 to RT-EXE-007 |
| RT-DAT — Data Flow | 4 | RT-DAT-001 to RT-DAT-004 |
| RT-KNW — Knowledge | 4 | RT-KNW-001 to RT-KNW-004 |
| RT-OBS — Observability | 4 | RT-OBS-001 to RT-OBS-004 |
| RT-COM — Communication | 4 | RT-COM-001 to RT-COM-004 |
| RT-EXC — Executive | 4 | RT-EXC-001 to RT-EXC-004 |
| RT-INT — Intent | 4 | RT-INT-001 to RT-INT-004 |
| RT-IDN — Identity/Trust | 3 | RT-IDN-001 to RT-IDN-003 |
| **TOTAL** | **50** | |

---

## Evidence Obligation Summary

| Obligation | Count | Relationship Types |
|-----------|-------|-------------------|
| YES (always required) | 18 | RT-GOV-003, RT-GOV-004, RT-GOV-005, RT-GOV-006, RT-GOV-007, RT-PHY-003, RT-EXE-001, RT-DAT-003, RT-DAT-004, RT-COM-004, RT-EXC-001, RT-EXC-002, RT-INT-002, RT-IDN-002, RT-STR-004, RT-GOV-008 (failure), RT-KNW-002, RT-EXE-006 (delegate) |
| CONDITIONAL | 10 | RT-GOV-008, RT-EXE-002, RT-EXE-005, RT-PHY-002, RT-DAT-001, RT-COM-002, RT-COM-003, RT-OBS-004, RT-DAT-002, RT-EXE-003 |
| NO | 22 | All remaining |

---

## Known Defects in Relationship Coverage

The following confirmed defects from certification represent relationship types that are architecturally required but missing, broken, or mis-implemented in the current codebase:

| Defect | Relationship Type Affected | Nature of Defect |
|--------|---------------------------|-----------------|
| C02: checkGovernance UNCONDITIONALLY_OPEN | RT-GOV-005 DENIES | Gateway never produces DENIES; ENFORCES exists but produces no negative outcomes |
| INV-B1: checkAuthority FAIL-OPEN | RT-GOV-004 AUTHORIZES | AUTHORIZES produced even when Trust Level insufficient |
| C03: Evidence chain gaps | RT-GOV-003 ENFORCES → RT-DAT-003 PRODUCES Evidence | `_w()` fire-and-forget means Evidence Records may be silently lost |
| Consumption not persisted | RT-DAT-004 CONSUMES | CONSUMES events exist but Consumption Records are not written to DB |
| 5+ memory write paths bypass gateway | RT-DAT-002 WRITES | WRITES to Memory SoT occur without ENFORCES standing between them |
| Bug B1: decisionMemoryId null | RT-KNW-002 REFLECTS_ON | Reflection cannot REFLECTS_ON DECISION Memory Records — column query wrong |
| Slack failure swallowed | RT-COM-002 RECEIVES | RECEIVES not produced on Notification delivery failure; no retry |
| INV-F1: quorum NOT ENFORCED | RT-EXC-002 VOTES_ON | Deliberation may CONCLUDE without sufficient VOTES_ON relationships |
| C13: two goal systems | RT-INT-001 PURSUES | PURSUES targets are fragmented across two independent stores |
| C09: strategic planning ephemeral | RT-INT-003 CONTRIBUTES_TO | 2-hour TTL destroys CONTRIBUTES_TO relationships before aggregation |
| Event Bus no persistence | RT-COM-001 EMITS → RT-COM-002 RECEIVES | EMITS without guaranteed RECEIVES delivery |
| DATA-5: health snapshots disabled | RT-KNW-003 GENERATES Metric | GENERATES Metric relationships exist but Metrics not persisted |
| C10: BYPASS_DASHBOARD_AUTH | RT-IDN-002 AUTHENTICATES | AUTHENTICATES bypassed in non-production NODE_ENV |
| resolveIdentity FAIL-SOFT | RT-IDN-001 IDENTIFIES | Anonymous IDENTIFIES indistinguishable from verified IDENTIFIES |

---

## Key Invariants for ARCH-02

The following architectural invariants must be formally specified in ARCH-02:

1. **Every entity has exactly one IDENTIFIES relationship** (from an Identity entity pointing to it) — derives from ARCH-00 INV-META-01
2. **Every entity except ET-GOV-001 has exactly one IS_OWNED_BY relationship** — derives from ARCH-00 INV-META-38
3. **OWNS must form an acyclic tree rooted at ET-GOV-001** — no cycles, no orphans
4. **DEPENDS_ON must be acyclic** — dependency cycles are architectural defects
5. **Every WRITES to a governed Source of Truth must cross an ENFORCES Boundary** — any WRITES without ENFORCES is unauthorised
6. **Every CONSUMES must produce a Consumption Record** — constitutional Art. 2 obligation
7. **Every DENIES must produce an Audit Record** — architectural requirement for governance traceability
8. **DELEGATES_TO requires an Authority Grant as evidence artifact** — delegation without a Grant is constitutionally invalid
9. **SUPERSEDES must be linear and acyclic** — no entity may supersede more than one predecessor
10. **VOTES_ON may only be produced by Council Members where `has_vote = true`** — architectural restriction on vote eligibility
11. **ESCALATES must produce both an Audit Record and a Notification** when targeting the Founder
12. **AUTHORIZES requires that source Trust Level ≥ Capability's `authority_required`** — any AUTHORIZES below this threshold is constitutionally invalid

---

## ARCH-02 Downstream Dependency Map

The following ARCH documents depend on relationship types defined in ARCH-02:

| ARCH Document | Primary RT Dependencies |
|--------------|------------------------|
| ARCH-03 Registry Architecture | RT-DAT-003 PRODUCES (Registry Records), RT-GOV-004 AUTHORIZES (admission), RT-STR-001 OWNS (Registry ownership) |
| ARCH-04 Identity Architecture | RT-IDN-001 IDENTIFIES, RT-IDN-002 AUTHENTICATES, RT-IDN-003 IS_HELD_BY, RT-GOV-006 DELEGATES_TO |
| ARCH-05 Source of Truth Registry | RT-DAT-001 READS, RT-DAT-002 WRITES, RT-PHY-001 IMPLEMENTS (SoT), RT-INT-001 PURSUES (goal SoT) |
| ARCH-06 Capability Policy | RT-EXE-002 INVOKES, RT-GOV-004 AUTHORIZES, RT-GOV-005 DENIES, RT-GOV-003 ENFORCES |
| ARCH-07 Boundary Policy | RT-GOV-003 ENFORCES, RT-GOV-005 DENIES, RT-GOV-008 VALIDATES, RT-COM-004 ESCALATES |
| ARCH-08 Auditability | RT-KNW-004 CAPTURES, RT-OBS-001 OBSERVES, RT-OBS-002 MONITORS, RT-DAT-003 PRODUCES Evidence |
| ARCH-10 Memory Architecture | RT-DAT-002 WRITES, RT-KNW-001 LEARNS_FROM, RT-KNW-002 REFLECTS_ON, RT-OBS-004 TRACKS |
| ARCH-11 Event Architecture | RT-COM-001 EMITS, RT-COM-002 RECEIVES, RT-COM-003 RESPONDS_TO, RT-EXE-004 TRIGGERS |
| ARCH-12 Agent Architecture | RT-EXE-001 EXECUTES, RT-EXE-002 INVOKES, RT-EXC-003 SUPERVISES, RT-INT-001 PURSUES |
| ARCH-14 ERN | All 50 RT types — the Entity Relationship Network instantiates every RT for every entity pair |
| ARCH-15 Repository Transformation | RT-PHY-001 IMPLEMENTS, RT-PHY-002 DEPLOYS, RT-EXE-006 CALLS |
