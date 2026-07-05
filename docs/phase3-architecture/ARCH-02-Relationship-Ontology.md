# ARCH-02 — Relationship Ontology

**Document ID:** ARCH-02
**Version:** 1.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Phase:** 3.1 — Foundational Architecture
**Immutability:** HIGHLY IMMUTABLE — new Relationship Types require EXECUTIVE authority; modification of source/target constraints requires SOVEREIGN authority
**Constitutional basis:** constitution-v1.md (Art. 1, 3, 6) · Scripts/CONSTITUTION.md (Art. 1, 5)
**Depends on:** ARCH-00 (all concepts used herein are defined there) · ARCH-01 (all Entity Types referenced herein are defined there)

---

## Section 1 — Purpose and Scope

### 1.1 What This Document Is

This document is the Relationship Ontology of the APEX Civilisation. It defines the fifty Relationship Types that govern how Entity Types may relate to one another within the Civilisation's architectural graph. A Relationship Type is a categorised, named, and constrained assertion: it declares what it means for two entities to be connected in a specific way, what entity types may appear on each side of that connection, what constraints must hold, and what evidence obligations arise when such a connection is asserted.

This document does not record individual relationship instances. It does not state that a specific Agent executes a specific Task — it states that the EXECUTES relationship type exists, that Agents may be on its source side, that Agent Tasks may be on its target side, and that asserting this relationship requires evidence in the form of an Audit Record. The instances themselves are created, maintained, and queried at runtime and registered in the Entity Relationship Network (ARCH-14).

This document is a governance specification, not a data model. Its provisions are authoritative statements about the architecture of the Civilisation. All services, agents, and system components that create, modify, or destroy relationships between entities are bound by the definitions herein.

### 1.2 Relationship to ARCH-00 and ARCH-01

ARCH-00 defines the concept of a Relationship Type at the meta-model level: it establishes what a Relationship Type is, what characteristics it must have, what constraints it carries, and how it differs from a Relationship instance. This document operates within that definition. Every Relationship Type herein is an instance of the meta-model concept "Relationship Type" as ARCH-00 defines it. Where this document uses terms such as Entity, Identity, Attribute, Lifecycle, Evidence, or Boundary, those terms carry precisely the meaning ARCH-00 assigns them. No term in this document has a meaning that departs from ARCH-00.

ARCH-01 defines the seventy-six Entity Types that populate the APEX Civilisation. Each Relationship Type defined in this document references specific Entity Types by their ARCH-01 identifiers (ET-XXX-NNN format). This document may not reference an Entity Type that does not exist in ARCH-01. When ARCH-01 is amended to add or remove Entity Types, this document must be reviewed to assess whether affected Relationship Types require amendment.

### 1.3 What a Relationship Type Governs

A Relationship Type governs six aspects of any relationship instance asserted under its definition:

**Permitted sources and targets.** A Relationship Type enumerates exactly which Entity Types may appear on each side. An assertion connecting entity types not listed is architecturally invalid regardless of whether it is technically possible.

**Cardinality.** A Relationship Type declares whether the source side of any given relationship instance is ONE entity or MANY entities, and whether the target side is ONE or MANY. Cardinality is structural: it expresses what the architecture requires, not what the current implementation enforces.

**Directionality.** Every Relationship Type has a canonical direction expressed as source VERB target. The inverse relationship — the same edge read in the opposite direction — is named for navigational convenience but is not a separate Relationship Type. Inverses are listed in this document but not separately specified.

**Evidence obligations.** A Relationship Type declares whether asserting a relationship of this type requires the production of an Evidence Record. Obligations are YES (always required), NO (not required), or CONDITIONAL (required under specified conditions). These obligations derive from constitutional authority and the boundary-crossing rules of ARCH-00.

**Constraints.** A Relationship Type specifies invariants that must hold for all instances. These are conditions that cannot be violated without creating an architectural defect. Constraints are stated as obligations, not as recommendations.

**Semantic role.** A Relationship Type establishes the unique architectural fact it captures — the thing no other Relationship Type captures. Without a distinct semantic role, the type cannot be justified as a separate category.

### 1.4 How to Read This Ontology

Each Relationship Type is presented with a standardised structure including its definition, semantic role, permitted source and target entity types, cardinality, inverse name, evidence obligation, constraints, known implementation state, and distinguishing notes relative to adjacent types. Readers should consult the definition first to understand what the type asserts, then the constraints to understand what invariants all instances must satisfy, then the known implementation state to understand the current gap between the architecture and its realisation.

Section 3 introduces the eleven Relationship Groups that organise the fifty types. Sections 4 through 14 specify each type within its group. Section 15 lists cross-cutting invariants that span multiple types. Section 16 defines prohibited relationship patterns. Section 17 provides the summary table. Section 18 documents known defects in relationship coverage.

---

## Section 2 — Ontological Principles

### 2.1 Directionality

Every Relationship Type has a canonical direction. The source entity is the entity from which the relationship originates; the target entity is the entity to which it points. The canonical reading of a relationship instance is: source VERB target. For example, Agent EXECUTES Task means the Agent is the source and the Task is the target.

Directionality is not merely navigational — it carries semantic weight. The same two entity types connected in opposite directions represent different architectural facts. An Agent INVOKES a Capability is different from a Capability IS_INVOKED_BY an Agent, even though both describe the same edge. The canonical direction is the one that assigns the active, causal, or governing role to the source. The inverse is the passive reading.

All fifty Relationship Types in this ontology specify a canonical direction. The inverse is named but not separately specified. When a specific navigation requires the inverse direction, it is accessed by traversing the same relationship instance in reverse, using the inverse name for clarity. No inverse is treated as a new Relationship Type: this ontology contains exactly fifty types.

### 2.2 Cardinality

Cardinality is declared independently for the source side and the target side of each Relationship Type.

**Source Cardinality ONE** means that in any given relationship instance of this type, exactly one source entity participates. It does not prevent a source entity from being involved in multiple relationship instances of this type over time; it states the structure of each individual instance.

**Source Cardinality MANY** means that a source entity typically participates in multiple relationship instances of this type — the semantic nature of the type is such that many-to-many or many-to-one structures are normal and expected.

**Target Cardinality ONE** means that in any given relationship instance of this type, the target side is a single entity. This often represents an ownership, assignment, or containment relationship where each target belongs to exactly one source at any given time.

**Target Cardinality MANY** means that the target side may be one of many entities related to this source in this way, or that this target entity may be related to many sources.

Cardinality declarations in this ontology represent the canonical structural intent. Where implementation currently violates cardinality — for example, by permitting multiple owners of a single entity — that constitutes a defect to be corrected, not a basis for amending the cardinality declaration.

### 2.3 Inverse Relationships

Every Relationship Type specifies an inverse name. The inverse name is an UPPER_SNAKE_CASE label that describes the same edge read from target to source. For example, if the canonical type is EXECUTES (Agent → Task), its inverse is IS_EXECUTED_BY (Task → Agent).

Inverses are named in this ontology for the following purposes: to support natural-language queries that navigate in the reverse direction; to enable specification documents to refer to the incoming relationships of an entity without implying a separate type; and to maintain symmetry in the relationship graph model.

No inverse is a separate Relationship Type. An architecture implementation that treats inverses as independent types would be creating one hundred relationship definitions from fifty, introducing redundancy and the risk of inconsistency between the two directions.

Where a Relationship Type has no meaningful or useful inverse — because the relationship is definitionally one-directional and the reverse direction carries no useful semantic — this is noted explicitly.

### 2.4 Evidence Obligations

Every Relationship Type carries one of three evidence obligation designations:

**YES** means that every instance of this relationship type must produce an Evidence Record at the moment of assertion. The Evidence Record must identify the source entity, the target entity, the relationship type, the actor who caused the assertion, and the timestamp. Relationship instances with a YES obligation that do not produce Evidence Records are constitutionally invalid under Art. 3 of constitution-v1.md, regardless of whether the relationship itself is otherwise valid.

**NO** means that asserting a relationship of this type does not inherently require an Evidence Record. This designation applies to structural, definitional, or navigational relationships whose assertion is not a significant governance event. However, if asserting a NO-obligation relationship happens in the context of a larger governed action (such as a lifecycle transition or boundary crossing), the governing evidence obligation of that action applies.

**CONDITIONAL** means that the evidence obligation depends on context. The Conditional Evidence Rule for each such type specifies exactly what condition triggers the obligation. Implementations must evaluate the condition at assertion time and produce Evidence if the condition is met.

Evidence obligations derive from ARCH-00's boundary-crossing rules: any relationship instance that crosses a Trust Boundary, modifies a Source of Truth, consumes a Resource, or constitutes a governance decision carries a YES obligation.

### 2.5 Relationship Types versus Relationship Instances

This document defines Relationship Types. The distinction between a type and an instance is fundamental and must not be conflated in implementation or governance usage.

A Relationship Type is the category definition — the schema, the permitted participants, the constraints, the evidence obligations. It exists in this document and is governed at the architectural level.

A Relationship Instance is a specific assertion that two specific entities are related in the way this type describes. Instances are created at runtime, recorded in the Entity Relationship Network (ARCH-14), and governed by the rules this document establishes for their type.

No instance is created or destroyed by ratifying or amending this document. Amendments to a Relationship Type's definition affect the governance of future instances and the evaluation of existing ones against the revised constraints — they do not automatically create, modify, or destroy instances.

---

## Section 3 — Group Classifications

The fifty Relationship Types are organised into eleven Groups. A Group is a Classification in the sense of ARCH-00 Section 2: it groups Relationship Types by shared semantic domain without constituting a new Relationship Type itself. Groups support governance scoping, evidence obligation reasoning, and architectural navigation.

**RT-GOV — Governance (8 types).** The Governance group encompasses all Relationship Types through which constitutional authority is established, applied, and recorded. These types concern the imposition of rules (GOVERNS, ENFORCES), the derivation of authority (DERIVES_FROM), the granting and denial of permission (AUTHORIZES, DENIES), the delegation of authority (DELEGATES_TO), and the formal assessment and validation of compliance (CERTIFIES, VALIDATES). Every significant governance act in the Civilisation is represented by a Relationship Type in this group. The Governance group has the highest average evidence obligation of any group — six of its eight types carry YES or CONDITIONAL obligations.

**RT-STR — Structure (5 types).** The Structure group encompasses Relationship Types that establish the compositional, ownership, versioning, and dependency architecture of the Civilisation. These types do not represent events or actions; they represent the persistent structural fabric within which events occur. OWNS establishes the governance tree; CONTAINS and BELONGS_TO are the bidirectional reading of compositional membership; SUPERSEDES records version succession; DEPENDS_ON captures operational dependency. The Structure group is foundational: every other group's relationship instances exist within the structure these types define.

**RT-PHY — Physical (3 types).** The Physical group bridges the Civilisation Layer to the Physical Layer. IMPLEMENTS connects a physical artifact to the Civilisation entity it realises. DEPLOYS connects a repository or deployment unit to the runtime environment in which artifacts are available. MODIFIES records the amendment of constitutional and specification documents. These three types are the only Relationship Types that may have Physical Layer entity types (ET-PHY-NNN) as their source. All Civilisation Layer entities are connected to their physical realisations exclusively through this group.

**RT-EXE — Execution (7 types).** The Execution group encompasses Relationship Types that capture operational work in progress: task assignment and execution (EXECUTES), capability invocation (INVOKES), utilisation of shared resources (USES), code-level calling (CALLS), scheduling (SCHEDULES), event triggering (TRIGGERS), and functional participation in a larger execution context (IS_PART_OF). This group is the largest because operational work is the most varied category of relationship in the Civilisation.

**RT-DAT — Data Flow (4 types).** The Data Flow group governs how data moves through the Civilisation: reading from stores (READS), writing to stores (WRITES), producing formal output entities (PRODUCES), and consuming finite resources (CONSUMES). Data flow relationships are particularly governance-sensitive: unauthorised writes and untracked consumption are among the most critical architectural defects identified in Phase 2.3 certification.

**RT-KNW — Knowledge (4 types).** The Knowledge group governs the Civilisation's learning and reflection processes: acquiring lessons from experience (LEARNS_FROM), directing analytical attention at past experiences (REFLECTS_ON), generating knowledge artifacts from operational processes (GENERATES), and capturing specific operational facts in observations (CAPTURES). These types form the intelligence loop through which the Civilisation improves over time.

**RT-OBS — Observability (4 types).** The Observability group governs the Civilisation's awareness of its own operational state: continuous monitoring relationships (OBSERVES, MONITORS), quantitative measurement (MEASURES), and longitudinal history tracking (TRACKS). Without this group's relationship types, no governance assertion could be verified, no threshold breach could be detected, and no trend could be identified.

**RT-COM — Communication (4 types).** The Communication group governs the propagation of information and conditions through the Civilisation: event publication (EMITS), event consumption (RECEIVES), handler registration (RESPONDS_TO), and upward escalation of conditions exceeding local authority (ESCALATES). The constitutional 5-minute notification requirement in Art. 7 of constitution-v1.md is enforced through ESCALATES and RECEIVES relationships.

**RT-EXC — Executive (4 types).** The Executive group governs the Council's deliberative, supervisory, and reporting functions: conducting formal deliberations (DELIBERATES_ON), casting votes (VOTES_ON), exercising executive oversight of Ministries (SUPERVISES), and maintaining upward information flow (REPORTS_TO). These types constitute the governance infrastructure of the Council as the Civilisation's executive authority.

**RT-INT — Intent (4 types).** The Intent group connects execution to purpose: pursuing goals and objectives (PURSUES), achieving terminal completion (ACHIEVES), contributing incrementally to larger goals (CONTRIBUTES_TO), and providing advisory knowledge to strategic direction (INFORMS). Without this group, the Civilisation would have no architectural mechanism for connecting what its agents do to what they are trying to accomplish.

**RT-IDN — Identity and Trust (3 types).** The Identity group establishes the fundamental naming, verification, and possession relationships that make governance possible: designating an entity's canonical identity (IDENTIFIES), verifying credentials against identity claims (AUTHENTICATES), and recording the possession of credentials and authority grants (IS_HELD_BY). Every other governance relationship in this ontology depends on IDENTIFIES being intact — an entity that cannot be identified cannot be governed.

---

## Section 4 — Governance Relationships (RT-GOV)

The Governance group contains the eight Relationship Types through which constitutional authority is established, applied, verified, and enforced. These types occupy the foundational level of the Civilisation's governance architecture. They express the facts that make governance possible: that rules exist and have authority (GOVERNS, DERIVES_FROM), that rules are actively applied at boundaries (ENFORCES, VALIDATES), that specific actions are permitted or denied (AUTHORIZES, DENIES), that authority may be distributed (DELEGATES_TO), and that compliance has been formally assessed (CERTIFIES). No governance claim — no assertion that an entity is authorised, constrained, or compliant — can be expressed without at least one relationship from this group.

---

### RT-GOV-001 — GOVERNS

**Definition:** GOVERNS asserts that the source entity imposes behavioural constraints on the target entity by virtue of its constitutional or policy authority. The source is a governing authority — a Constitution, Policy, Rule, or Authority Grant. The target is any entity whose behaviour is constrained by that authority. GOVERNS is a structural relationship: it does not record individual enforcement events. A Constitution GOVERNS all Civilisation entities by virtue of its ratification; a Policy GOVERNS all entities within the scope declared in its `scope_description` attribute; a Rule GOVERNS specific transition types or boundary crossings. Asserting GOVERNS establishes the constraint relationship; it does not enforce it — enforcement is the function of ENFORCES (RT-GOV-003).

**Semantic Role:** GOVERNS captures the structural fact that a governing authority has jurisdiction over a governed entity. This fact is logically prior to all other governance relationships: ENFORCES presupposes GOVERNS (a Gateway can only ENFORCES a Policy because that Policy GOVERNS the relevant boundary), and CERTIFIES presupposes GOVERNS (a Certification assesses whether a GOVERNS constraint is satisfied). No other Relationship Type captures the structural jurisdiction claim that GOVERNS makes.

**Source Entity Types:**
- ET-GOV-002 (Constitution) — Constitutions are the foundational governing authorities whose scope is the entirety of the Civilisation
- ET-GOV-003 (Policy) — Policies govern specific categories of decisions within their declared scope
- ET-GOV-004 (Rule) — Rules govern specific transition types, capability invocations, or boundary crossings
- ET-IDN-004 (Authority Grant) — Authority Grants govern what a delegated entity may do within the granted scope

**Target Entity Types:**
- Any Entity Type — the scope of governance is declared in the source entity's `scope_description` attribute; Constitution-sourced GOVERNS has universal scope; Policy-sourced GOVERNS has declared scope; Rule-sourced GOVERNS has the narrowest scope

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_GOVERNED_BY

**Evidence Obligation:** NO
**Evidence Rule:** GOVERNS is a structural jurisdictional relationship. Individual enforcement events are captured by ENFORCES (RT-GOV-003) and VALIDATES (RT-GOV-008), each of which carries its own evidence obligation. Creating or modifying the GOVERNS relationship itself — for example, when a new Policy is ratified — is evidenced by the ratification governance event, not by a separate GOVERNS evidence record.

**Constraints:**
- A Constitution's GOVERNS relationship may not be restricted by any Policy or Rule — constitutional scope is paramount
- A Policy's GOVERNS scope may not exceed the scope of the Constitution from which it DERIVES_FROM (RT-GOV-002)
- A Rule's GOVERNS scope may not exceed the scope of the Policy that CONTAINS it (RT-STR-002)
- Authority Grants may only establish GOVERNS relationships within the scope of the grantor's existing authority

**Known Implementation State:**
The constitutional governance relationship is structurally present in the codebase: constitution-v1.md and Scripts/CONSTITUTION.md both exist as ET-GOV-002 instances and their scope is implicitly declared. Policy entities are instantiated through certification policies, failure mode policies, and authority policies. However, no explicit GOVERNS relationship registry exists — the structural jurisdiction claim is embedded in document references rather than expressed as formal relationship instances. This means the GOVERNS graph cannot be traversed programmatically. ARCH-14 (Entity Relationship Network) must instantiate all GOVERNS relationships for the two confirmed Constitutions and all ratified Policies.

**Distinguishing from Adjacent Types:**
GOVERNS must be distinguished from ENFORCES (RT-GOV-003). GOVERNS is the structural fact that authority exists over an entity; ENFORCES is the per-boundary operational commitment to apply that authority to passing requests. A Constitution GOVERNS all agents; a Gateway ENFORCES the constitutional Policy at a specific boundary crossing. A world where GOVERNS exists but ENFORCES does not would be a world where rules have jurisdiction but are never applied — this is precisely the defect state identified in the checkGovernance finding (C02).

---

### RT-GOV-002 — DERIVES_FROM

**Definition:** DERIVES_FROM asserts that the source entity's existence, authority, or content is grounded in the target entity. This relationship type serves two structurally analogous contexts: authority derivation, where a Policy or Rule derives its constitutional authority from a Constitution or parent Policy; and data derivation, where a Projection derives its content from a Source of Truth, or a knowledge artifact derives its substance from prior records. In both cases, if the target entity ceases to be authoritative or is superseded, the source entity must be re-evaluated. DERIVES_FROM makes explicit the provenance chain without which an authority or data claim cannot be traced to its root.

**Semantic Role:** DERIVES_FROM captures the provenance chain — the fact that one entity owes its validity, content, or authority to another. This is distinct from BELONGS_TO (which expresses structural containment within a parent), from IS_PART_OF (which expresses functional participation), and from OWNS (which expresses governance authority). A Rule that BELONGS_TO a Policy also DERIVES_FROM that Policy's authority, but BELONGS_TO captures the compositional structure while DERIVES_FROM captures the authority lineage. These are different architectural facts.

**Source Entity Types:**
- ET-GOV-003 (Policy) — Policies derive their constitutional authority from the Constitution they are based upon
- ET-GOV-004 (Rule) — Rules derive their authority from the parent Policy, and transitively from the Constitution
- ET-DAT-005 (Projection) — Projections derive their content from a designated Source of Truth
- ET-KNW-002 (Lesson) — Lessons derive their substance from the Episodic Memory Records they were extracted from
- ET-KNW-008 (Reflection) — Reflections derive their analytical content from the Memory Records they examine

**Target Entity Types:**
- ET-GOV-002 (Constitution) — the authoritative root from which Policy authority derives
- ET-DAT-004 (Source of Truth) — the authoritative data store from which Projection content derives
- ET-KNW-001 (Memory Record) — the experiential record from which knowledge artifacts derive

**Source Cardinality:** MANY
**Target Cardinality:** ONE

**Inverse Name:** IS_BASIS_FOR

**Evidence Obligation:** NO
**Evidence Rule:** DERIVES_FROM is a structural provenance relationship. The authority chain it expresses is established at the time a Policy is ratified or a Projection is designated — those governance events produce their own evidence. No additional Evidence Record is required for the DERIVES_FROM relationship itself.

**Constraints:**
- A Policy may only DERIVES_FROM a Constitution that exists in the Civilisation's governance hierarchy — derivation from external or non-existent authorities is architecturally invalid
- A Projection's DERIVES_FROM target must be the single designated Source of Truth for its data domain — a Projection that claims to derive from multiple Sources of Truth is an architectural defect
- DERIVES_FROM is transitive in the authority domain: if Policy DERIVES_FROM Constitution, and Rule BELONGS_TO Policy, then Rule transitively DERIVES_FROM Constitution; this transitivity must be computationally verifiable
- No entity may DERIVES_FROM itself directly or transitively — derivation cycles are architectural defects

**Known Implementation State:**
Authority derivation is implicit in the codebase — constitution-v1.md references are embedded in comments and service code rather than expressed as formal DERIVES_FROM relationship instances. Data derivation is partially expressed: the memory system acknowledges projections (multiple memory tables) but does not formally register which are Sources of Truth and which are Projections deriving from them. ARCH-05 (Source of Truth Registry) and ARCH-10 (Memory Architecture) must establish formal DERIVES_FROM registrations for all Projections in the ten identified data domains.

**Distinguishing from Adjacent Types:**
DERIVES_FROM must be distinguished from CONTAINS (RT-STR-002) and BELONGS_TO (RT-STR-003). A Policy CONTAINS Rules (structural membership — the Rules are compositional parts of the Policy). A Policy DERIVES_FROM a Constitution (authority provenance — the Policy's legitimacy comes from the Constitution). These are orthogonal facts: the compositional structure and the authority chain may involve different entities and different cardinalities.

---

### RT-GOV-003 — ENFORCES

**Definition:** ENFORCES asserts that the source entity actively applies a specific Policy or Rule at a Boundary, evaluating each attempted crossing or invocation and producing a permitted or denied outcome. ENFORCES is the runtime relationship that instantiates GOVERNS: while GOVERNS establishes structural jurisdiction, ENFORCES is the per-boundary operational commitment of a Gateway or Service to apply governance rules to all passing requests. A Gateway that GOVERNS but does not ENFORCES has jurisdiction without practice. A Gateway with no ENFORCES relationship is structurally incomplete — it stands at a boundary but does not function as governance infrastructure.

**Semantic Role:** ENFORCES captures the active application of governance at a boundary — the fact that a specific service has taken on the enforcement responsibility for a specific policy at a specific crossing point. This is distinct from GOVERNS (which is static jurisdiction), VALIDATES (which is per-instance evaluation), and AUTHORIZES/DENIES (which are per-instance permission decisions). ENFORCES is the commitment; VALIDATES is the act; AUTHORIZES or DENIES is the outcome.

**Source Entity Types:**
- ET-SVC-003 (Gateway) — Gateways are the primary enforcement entities; their architectural definition requires at least one ENFORCES relationship
- ET-SVC-001 (Service) — Services may enforce policies that govern their operational scope, not only Gateways

**Target Entity Types:**
- ET-GOV-003 (Policy) — Policies are the primary enforcement targets; a Gateway ENFORCES the Policy governing its boundary
- ET-GOV-004 (Rule) — Individual Rules may be enforced at more granular boundaries

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** IS_ENFORCED_BY

**Evidence Obligation:** YES
**Evidence Rule:** Every ENFORCES evaluation must produce an Audit Record (ET-KNW-005) that records which Gateway evaluated which request, which Policy was applied, and what outcome was produced (PERMITTED or DENIED). The Audit Record is not optional — a Gateway that produces no Audit Records is not fulfilling its ENFORCES obligation regardless of whether it produces the correct outcome.

**Constraints:**
- A Gateway without at least one ENFORCES relationship pointing to a ratified Policy is architecturally incomplete
- Every ENFORCES evaluation must produce either an AUTHORIZES (RT-GOV-004) or a DENIES (RT-GOV-005) relationship instance for the specific request being evaluated
- A Service that ENFORCES a Policy must have the authority level required to enforce that Policy — a TASK-level Service may not enforce a SOVEREIGN-level Policy
- An ENFORCES relationship may not be established with a Policy that is in DRAFT or DEPRECATED status

**Known Implementation State:**
Three confirmed Gateway entities exist in the codebase: the Memory Write Gateway (lib/memory/gateway.js), the Constitutional Gate (lib/runtime/constitutional-gate.js), and the kernelChain (lib/kernel.js). All three have structural ENFORCES relationships with their respective Policies. However, all three are defective in enforcement quality: the Constitutional Gate is FAIL-OPEN on error, the kernelChain's checkAuthority gate is FAIL-OPEN (INV-B1), and checkGovernance (lib/agent-file-utils.js) is UNCONDITIONALLY_OPEN — never producing DENIES outcomes (C02, CRITICAL). The ENFORCES relationship instances exist architecturally, but their operational realisation is broken. Additionally, defect C03 (evidence chain gaps via `_w()` fire-and-forget) means that Audit Records from ENFORCES evaluations may be silently lost.

**Distinguishing from Adjacent Types:**
ENFORCES must be distinguished from VALIDATES (RT-GOV-008). VALIDATES is the per-instance evaluation act — a Rule validates a specific entity against its criteria on a specific occasion. ENFORCES is the structural commitment — a Gateway holds the ongoing responsibility to enforce a Policy at a Boundary. VALIDATES may happen without ENFORCES (ad-hoc evaluation), but a proper governance architecture requires all boundary-crossing VALIDATES events to be backed by an ENFORCES structural commitment.

---

### RT-GOV-004 — AUTHORIZES

**Definition:** AUTHORIZES asserts that a specific Identity, Authority Grant, or Session Identity has granted permission for a specific Capability invocation, Lifecycle Transition, or Boundary crossing. AUTHORIZES is a positive permission decision — it asserts that the action is permitted under the governing rules as applied to the requesting entity's Trust Level and the target action's authority requirements. Every AUTHORIZES relationship must be traceable to a Trust Level and, transitively, to a governing Policy. An AUTHORIZES relationship that cannot be traced to a legitimate governing authority is constitutionally invalid even if it is structurally present.

**Semantic Role:** AUTHORIZES captures the affirmative permission decision — the positive outcome of a governance evaluation. This is distinct from DENIES (the negative outcome), ENFORCES (the structural commitment to evaluate), and VALIDATES (the act of evaluation). AUTHORIZES says: this specific request by this specific entity has been evaluated and found to be within the permitted scope. Without AUTHORIZES, no action is architecturally permitted to proceed, regardless of whether technical barriers exist.

**Source Entity Types:**
- ET-IDN-001 (Identity) — An Identity grants permission based on its Trust Level and the governing Policy
- ET-IDN-004 (Authority Grant) — An Authority Grant may grant permission for actions within its delegated scope
- ET-IDN-005 (Session Identity) — A Session Identity carries the request-scoped permission context

**Target Entity Types:**
- ET-CAP-001 (Capability) — A Capability invocation requires AUTHORIZES before proceeding
- ET-CAP-002 (Tool) — Tool invocations require AUTHORIZES at the appropriate Trust Level
- ET-OPS-002 (Agent Task) — Lifecycle transitions (e.g., PLANNED→APPROVED) require AUTHORIZES

**Source Cardinality:** ONE
**Target Cardinality:** ONE

**Inverse Name:** IS_AUTHORIZED_BY

**Evidence Obligation:** YES
**Evidence Rule:** Each AUTHORIZES decision must produce an Audit Record identifying the authorizing Identity, the target action, the Trust Level applied, the governing Policy, and the timestamp. The Audit Record is required to support the constitutional traceability obligation (Art. 3 of constitution-v1.md) and to enable detection of inappropriate authorizations.

**Constraints:**
- An AUTHORIZES relationship is constitutionally valid only when the source entity's Trust Level equals or exceeds the `authority_required` attribute of the target Capability or Lifecycle Transition
- An AUTHORIZES relationship must reference the governing Policy or Rule under which it was issued — unconstrained AUTHORIZES relationships are architecturally invalid
- An Authority Grant may only AUTHORIZES actions within the scope declared in its `capability_scope` and `entity_scope` attributes
- An AUTHORIZES relationship may not be produced for actions that a governing DENIES relationship has already evaluated and rejected

**Known Implementation State:**
The checkAuthority() gate in lib/kernel.js is confirmed FAIL-OPEN on error (INV-B1 NOT ENFORCED). This means AUTHORIZES relationships are produced even when the requesting Identity's Trust Level is insufficient. These phantom AUTHORIZES relationships are structurally valid in form — they have a source, a target, and a timestamp — but are constitutionally invalid in content because they have been issued in violation of the Trust Level requirement. The kernelChain's gate 3 (authority check) must be refactored to be FAIL-CLOSED and to only produce AUTHORIZES relationships when Trust Level ≥ `authority_required`. ARCH-06 (Capability Policy) must specify the authority requirement for every Capability.

**Distinguishing from Adjacent Types:**
AUTHORIZES must be distinguished from DELEGATES_TO (RT-GOV-006). DELEGATES_TO is a one-time structural act that confers a bounded authority scope from one entity to another, producing an Authority Grant. AUTHORIZES is the per-action permission decision that occurs each time a specific action is evaluated — it is the runtime exercise of authority that DELEGATES_TO establishes. A Council Member receives authority via DELEGATES_TO; each time that authority is exercised, an AUTHORIZES relationship is produced.

---

### RT-GOV-005 — DENIES

**Definition:** DENIES asserts that a specific Identity, Authority Grant, or Gateway has rejected a specific Capability invocation, Lifecycle Transition, or Boundary crossing. DENIES is the negative permission decision — it asserts that the action is not permitted under the governing rules as applied to the requesting entity's Trust Level and the target action's authority requirements. Every DENIES relationship must produce an Audit Record with the rejection reason. The absence of DENIES relationships from a Gateway that processes non-trivial traffic is a diagnostic signal of defective enforcement.

**Semantic Role:** DENIES captures the negative governance outcome — the refusal of a permission request. It is the essential counterpart of AUTHORIZES. A governance architecture that can only produce AUTHORIZES but never produces DENIES is not functioning as governance — it is functioning as a pass-through. The certification finding C02 (checkGovernance UNCONDITIONALLY_OPEN) demonstrates that the absence of DENIES in a governance function is an architectural defect of the highest severity.

**Source Entity Types:**
- ET-IDN-001 (Identity) — An Identity may deny based on insufficient Trust Level or out-of-scope request
- ET-IDN-004 (Authority Grant) — An Authority Grant may deny requests outside its delegated scope
- ET-SVC-003 (Gateway) — Gateways are the primary producers of DENIES relationships at boundary crossings

**Target Entity Types:**
- ET-CAP-001 (Capability) — A Capability invocation that fails governance evaluation
- ET-CAP-002 (Tool) — A Tool invocation that fails governance evaluation
- ET-OPS-002 (Agent Task) — A Lifecycle Transition that fails governance evaluation

**Source Cardinality:** ONE
**Target Cardinality:** ONE

**Inverse Name:** IS_DENIED_BY

**Evidence Obligation:** YES
**Evidence Rule:** Every DENIES decision must produce an Audit Record identifying the denying entity, the rejected action, the rejection reason (specifying which Policy or Rule was violated), and the timestamp. DENIES Audit Records are critical for security analysis and governance score computation.

**Constraints:**
- A DENIES relationship must reference the specific Policy, Rule, or Trust Level requirement that caused the rejection — a DENIES without a reason is architecturally incomplete
- A Gateway must be capable of producing DENIES relationships — a Gateway whose implementation cannot produce DENIES is architecturally defective regardless of its structural ENFORCES relationship
- A DENIES relationship may not be reversed without a subsequent AUTHORIZES evaluation under modified conditions — the entity must re-request with corrected identity or scope
- An entity that receives a DENIES relationship for a specific action may not proceed with that action by any technical means — technical bypass of DENIES is an architectural violation

**Known Implementation State:**
The checkGovernance function (lib/agent-file-utils.js) is confirmed UNCONDITIONALLY_OPEN — it never produces DENIES relationships (C02, CRITICAL). The constitutional-gate.js is FAIL-OPEN on error, meaning errors in governance evaluation produce pass-through behaviour rather than DENIES. The kernelChain's authority gate is FAIL-OPEN on error (INV-B1). The practical consequence is that DENIES relationships are architecturally required but operationally absent from the three primary governance boundaries. ARCH-07 (Boundary Policy) must require all Gateways to demonstrate DENIES production capability through defined test scenarios.

**Distinguishing from Adjacent Types:**
DENIES must be distinguished from ESCALATES (RT-COM-004). DENIES is a permission decision at a governance boundary: the action is not permitted. ESCALATES is an upward referral: the situation requires attention from a higher authority. A Gateway may produce a DENIES and separately ESCALATES the denied request to a Council Member if the pattern suggests a security concern. DENIES is the governance outcome; ESCALATES is the communication act.

---

### RT-GOV-006 — DELEGATES_TO

**Definition:** DELEGATES_TO asserts that the source entity has formally conferred a bounded subset of its authority to the target entity. Delegation requires the concurrent creation of an Authority Grant (ET-IDN-004) as its reified evidence artifact — without an Authority Grant, the DELEGATES_TO relationship is constitutionally unrecognised. A delegated authority may never exceed the delegating entity's own authority: no entity may delegate what it does not hold. Delegation chains are transitive but bounded: an entity that has received delegated authority may further delegate within that scope, but the sum of delegations may never exceed the original grant. Delegation is additive for the recipient — the grantor retains their own authority after delegating.

**Semantic Role:** DELEGATES_TO captures the formal distribution of authority through the Civilisation's hierarchy without surrendering the grantor's own authority. It is the mechanism by which SOVEREIGN authority reaches operational layers while remaining traceable to its constitutional source. No other Relationship Type captures this combination of authority conferral, scope limitation, and retention of grantor authority.

**Source Entity Types:**
- ET-GOV-001 (Founder) — The Founder holds SOVEREIGN authority and delegates portions to Council Members
- ET-EXE-002 (Council Member) — Council Members may delegate portions of their EXECUTIVE authority to Ministries and Agents within their domain

**Target Entity Types:**
- ET-EXE-002 (Council Member) — Council Members receive delegated authority from the Founder
- ET-EXE-003 (Ministry) — Ministries receive delegated operational authority from Council Members
- ET-OPS-001 (Agent) — Agents receive delegated task authority from Ministries or Council Members

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** RECEIVES_DELEGATION_FROM

**Evidence Obligation:** YES
**Evidence Rule:** Each DELEGATES_TO relationship must produce an Authority Grant (ET-IDN-004) as its evidence artifact. The Authority Grant must specify the capability scope, entity scope, trust level ceiling, and expiry. A DELEGATES_TO assertion without a corresponding Authority Grant is constitutionally invalid.

**Constraints:**
- The delegated authority scope may not exceed the scope of the delegating entity's own authority
- Every DELEGATES_TO must produce exactly one Authority Grant as its evidence artifact
- An entity may not delegate authority it has not itself received — delegation chains must trace to the Founder
- Authority Grants produced by DELEGATES_TO must specify an expiry — perpetual delegations require explicit renewal
- A Council Member may not DELEGATES_TO another Council Member of equal or higher authority rank

**Known Implementation State:**
DELEGATES_TO relationships are architecturally present in the constitutional structure (Founder → Council Members, implied by the ENTITIES array in executive-council.js) but are not formally registered as relationship instances with corresponding Authority Grant entities. The seven Council Member roles are confirmed operational, but their delegated authority scopes are defined in vault specifications rather than as formal Authority Grant records. ARCH-04 (Identity Architecture) must specify the process by which existing authority delegations are formalised as DELEGATES_TO instances with corresponding Authority Grants.

**Distinguishing from Adjacent Types:**
DELEGATES_TO must be distinguished from AUTHORIZES (RT-GOV-004). DELEGATES_TO is a structural, one-time authority conferral that creates a persistent scope for future action. AUTHORIZES is the per-action permission decision that occurs within the scope established by DELEGATES_TO. The Founder DELEGATES_TO the CEO the authority to manage the Civilisation's operations; the CEO AUTHORIZES a specific Agent Task within that delegated scope.

---

### RT-GOV-007 — CERTIFIES

**Definition:** CERTIFIES asserts that a Certification entity has formally assessed a specific architectural Constraint, invariant, or Policy Rule and produced a verdict on whether it is satisfied. CERTIFIES links a Certification entity to the specific subject it assessed. The Certification entity itself carries the verdict (ENFORCED / PARTIALLY ENFORCED / NOT ENFORCED / SIMULATED ONLY / UNKNOWN), the evidence base, the issuing authority, and the validity period. The CERTIFIES relationship establishes what is being assessed; the Certification entity carries the result. A later Certification that CERTIFIES the same subject SUPERSEDES (RT-STR-004) the prior Certification, creating a version history of compliance assessments.

**Semantic Role:** CERTIFIES captures the formal compliance verdict — the result of structured, evidence-backed assessment of whether a specific architectural requirement is met. This is distinct from VALIDATES (which is per-instance evaluation of a specific entity against a rule) and ENFORCES (which is the structural commitment to apply rules at a boundary). CERTIFIES is the audit-level fact: at a specific point in time, a specific requirement was found to be in a specific state of compliance.

**Source Entity Types:**
- ET-GOV-005 (Certification) — Certifications are the entities that hold compliance verdicts; each Certification certifies one subject

**Target Entity Types:**
- Architectural Constraints (as defined in ARCH-00 Section 5) — the primary certification subjects
- ET-GOV-004 (Rule) — Individual Rules may be the subject of Certification
- ET-GOV-003 (Policy) — Policies may be the subject of Certification for overall compliance

**Source Cardinality:** ONE
**Target Cardinality:** ONE

**Inverse Name:** IS_CERTIFIED_BY

**Evidence Obligation:** YES
**Evidence Rule:** The Certification entity itself is the evidence artifact. The CERTIFIES relationship is self-evidencing in the sense that the Certification entity it originates from must carry `evidence_refs` pointing to the Evidence Records that support the verdict. A Certification without evidence references is an assertion without basis and must be treated as UNKNOWN verdict.

**Constraints:**
- Each Certification entity must CERTIFIES exactly one subject — a single Certification covering multiple unrelated subjects is architecturally invalid
- A Certification's verdict must be supported by at least one Evidence Record referenced in its `evidence_refs`
- A later Certification that CERTIFIES the same subject as a prior Certification must produce a SUPERSEDES relationship to the prior Certification
- A Certification with verdict NOT ENFORCED or PARTIALLY ENFORCED must include `remediation_notes` identifying what corrective action is required

**Known Implementation State:**
The Phase 2.3 certification process produced twenty-five Certification entity instances across the confirmed invariants (4 ENFORCED, 12 PARTIALLY ENFORCED, 7 NOT ENFORCED, 1 SIMULATED ONLY). These Certifications exist as documents in the certification reports rather than as formal Registry Records. ARCH-03 (Registry Architecture) must specify a Certification Registry. ARCH-14 must instantiate the CERTIFIES relationships for all twenty-five Phase 2.3 Certifications. Regression detection — identifying when a later Certification produces a worse verdict than its predecessor — requires the IS_CERTIFIED_BY inverse to be traversable for each architectural invariant.

**Distinguishing from Adjacent Types:**
CERTIFIES must be distinguished from VALIDATES (RT-GOV-008). VALIDATES is the per-instance evaluation of a specific entity against a specific rule on a specific occasion. CERTIFIES is the structured, evidence-backed, authority-issued verdict on whether a systematic requirement is met across the Civilisation as a whole. A Rule VALIDATES a specific agent task's authority level; a Certification CERTIFIES that the authority validation invariant is satisfied across all agent tasks.

---

### RT-GOV-008 — VALIDATES

**Definition:** VALIDATES asserts that a Rule, Policy, or Gateway has evaluated a specific Entity, action, or state against its governing criteria and produced a result. VALIDATES is the per-instance application of governance criteria at a specific moment for a specific subject. The result of VALIDATES is binary: the entity either satisfies the criteria (producing an AUTHORIZES relationship) or violates them (producing a DENIES relationship). VALIDATES is distinct from ENFORCES (which is the structural commitment to evaluate) and from CERTIFIES (which is the audit-level verdict on systematic compliance). A single VALIDATES event is one data point; a Certification is the aggregated assessment of many VALIDATES events.

**Semantic Role:** VALIDATES captures the act of evaluation — the moment at which a governing criterion is applied to a specific subject and a result is produced. This is the operational mechanism through which GOVERNS becomes actionable: a Policy GOVERNS many entities, but it VALIDATES each specific request individually. No other Relationship Type captures this per-instance evaluation act.

**Source Entity Types:**
- ET-GOV-004 (Rule) — Rules are the atomic evaluation criteria; each VALIDATES event applies one Rule to one subject
- ET-GOV-003 (Policy) — Policies may validate at the policy level (evaluating all their constituent Rules collectively)
- ET-SVC-003 (Gateway) — Gateways perform VALIDATES as their core operational function at each boundary crossing

**Target Entity Types:**
- Any entity undergoing a Lifecycle Transition
- Any Boundary crossing request
- Any Capability invocation

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** IS_VALIDATED_BY

**Evidence Obligation:** CONDITIONAL
**Evidence Rule:** Evidence is required when VALIDATES produces a violation finding (a DENIES relationship). When VALIDATES produces a satisfactory finding (an AUTHORIZES relationship), the AUTHORIZES evidence obligation applies. When VALIDATES produces neither — for example, when the evaluation is inconclusive or the rule does not apply — no evidence is required but the inconclusive result should be logged as an Observation.

**Constraints:**
- Every VALIDATES evaluation must produce a deterministic result — an inconclusive result is an implementation defect, not a valid governance outcome
- A VALIDATES relationship must reference the specific Rule or Policy being applied — evaluation against unspecified criteria is architecturally invalid
- A Gateway that performs VALIDATES must be in an ACTIVE state — a DEGRADED or DOWN gateway may not perform governance evaluations
- The kernelChain's four-gate sequence (identity, ownership, authority, governance) constitutes four sequential VALIDATES operations — all must complete before the overall evaluation produces AUTHORIZES or DENIES

**Known Implementation State:**
The kernelChain in lib/kernel.js implements four VALIDATES operations in sequence: (1) resolveIdentity (FAIL-SOFT — anonymous identity indistinguishable from verified), (2) resolveOwnership (FAIL-SOFT), (3) checkAuthority (FAIL-OPEN on error — INV-B1), (4) checkGovernance (UNCONDITIONALLY_OPEN — C02). All four gates are defective: they either produce inconclusive results (FAIL-SOFT), fail open on error (FAIL-OPEN), or never produce negative results (UNCONDITIONALLY_OPEN). The result is that the kernelChain's VALIDATES operations systematically produce AUTHORIZES relationships regardless of whether the subject deserves them.

**Distinguishing from Adjacent Types:**
VALIDATES must be distinguished from CERTIFIES (RT-GOV-007). VALIDATES is a single evaluation event at runtime; CERTIFIES is an audit-level assessment of systematic compliance. VALIDATES produces an immediate AUTHORIZES or DENIES for a specific request; CERTIFIES produces a verdict on whether a class of VALIDATES events is producing the correct results. The relationship between them is: many VALIDATES events provide the evidence base for a CERTIFIES verdict.

---

## Section 5 — Structure Relationships (RT-STR)

The Structure group contains the five Relationship Types that constitute the compositional, ownership, versioning, and dependency fabric of the Civilisation. Structure relationships are not events — they do not record what happened at a specific moment. They record what is: the persistent facts about how entities relate to one another in terms of ownership, membership, succession, and operational dependency. All other relationship types exist within the structural context that these five types establish. The OWNS tree determines audit accountability for every entity. The CONTAINS/BELONGS_TO hierarchy determines how lifecycle events propagate through the architecture. The SUPERSEDES chain is the version history of all governed artifacts. The DEPENDS_ON graph determines the blast radius of failures.

---

### RT-STR-001 — OWNS

**Definition:** OWNS asserts that the source entity holds governance authority over the target entity — including the right to modify, archive, delegate, or transfer the target entity within constitutional limits. The OWNS graph is a rooted directed tree with ET-GOV-001 (Founder) as the single root node. Every entity in the Civilisation except the Founder has exactly one OWNS relationship pointing to it from its owning entity. OWNS establishes audit accountability: when a target entity commits an action or violates a constraint, the owning entity bears governance responsibility for that action.

**Semantic Role:** OWNS captures the governance accountability relationship — the fact that one entity is responsible for another's existence and behaviour within the Civilisation. This is distinct from CONTAINS (which captures compositional membership without necessarily implying governance authority) and from GOVERNS (which captures the imposition of rules without implying ownership). An entity may CONTAINS items it does not OWN (a Queue contains Agent Tasks whose owner is the executing Agent, not the Queue), and an entity may GOVERNS entities it does not OWN (a Constitution governs all entities but owns none of them).

**Source Entity Types:**
- Any Entity Type — any entity in the Civilisation may own other entities within its authority level

**Target Entity Types:**
- Any Entity Type except ET-GOV-001 (Founder) — the Founder entity has no owner; it is the root of the ownership tree

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** IS_OWNED_BY

**Evidence Obligation:** NO
**Evidence Rule:** Ownership is structural and typically established at the time of entity creation. The transfer of ownership — when an entity's owner changes — requires an Amendment or Authority Grant as evidence, but the static ownership fact itself does not require ongoing evidence production.

**Constraints:**
- Every entity except ET-GOV-001 must have exactly one IS_OWNED_BY relationship — no orphan entities are permitted
- The OWNS graph must be an acyclic tree — no ownership cycles are permitted under any circumstances
- An entity may not OWN itself
- An entity may not OWN an entity at a higher Trust Level than itself — a TASK-level Agent may not own a SOVEREIGN-level Constitution
- An ownership transfer must preserve the acyclicity constraint — circular ownership created by a transfer is invalid

**Known Implementation State:**
Ownership is implicit in the current codebase: entity types have designated owners in ARCH-01-PLAN (e.g., the Council is owned by the Founder, Policies are owned by the Founder or delegated Council Members), but formal OWNS relationship instances are not registered in any traversable registry. The OWNS tree exists as an architectural intent document rather than as a queryable graph. ARCH-14 (Entity Relationship Network) must instantiate the OWNS graph for all registered entities.

**Distinguishing from Adjacent Types:**
OWNS must be distinguished from CONTAINS (RT-STR-002). A Council CONTAINS Council Members (structural membership); the Founder OWNS the Council and, transitively, the Council Members (governance accountability). CONTAINS asks "what is structurally part of this entity?" OWNS asks "who bears governance responsibility for this entity?" The distinction matters when a container and an owner are different entities — for example, a Queue CONTAINS Agent Tasks, but the Agent OWNS those Tasks, not the Queue.

---

### RT-STR-002 — CONTAINS

**Definition:** CONTAINS asserts a compositional membership relationship: the target entity is a structural member or component of the source entity. CONTAINS establishes the hierarchical structure of composite entities. Unlike OWNS, CONTAINS does not require that the source entity governs the target — it requires only that the target is structurally part of the source in the sense that the source entity's definition includes the target as a constituent. The source entity's lifecycle directly affects contained entities: when a source entity transitions to ARCHIVED, all contained entities must be addressed in the transition.

**Semantic Role:** CONTAINS captures compositional structure — the fact that one entity is made up of other entities as members. This is distinct from OWNS (governance authority), DEPENDS_ON (operational dependency), and IS_PART_OF (functional participation in an execution context). A Policy CONTAINS Rules because Rules are structural components of the Policy's definition. A Council CONTAINS Council Members because Council Members are definitional components of the Council. These are not merely operational dependencies — they are structural facts about what these entities are.

**Source Entity Types:**
- ET-EXE-001 (Council) — the Council contains its Council Members as definitional members
- ET-GOV-003 (Policy) — a Policy contains its constituent Rules
- ET-EXE-004 (Deliberation) — a Deliberation contains its Votes
- ET-OPS-005 (Queue) — a Queue contains the Agent Tasks awaiting execution
- ET-OPS-003 (Workflow Run) — a Workflow Run contains its constituent Agent Tasks
- ET-PHY-001 (Repository) — a Repository contains its Folders and Files
- ET-PHY-002 (Folder) — a Folder contains its child Folders and Files
- ET-PHY-007 (Database) — a Database contains its Tables

**Target Entity Types:**
- ET-EXE-002 (Council Member) — member of the Council
- ET-GOV-004 (Rule) — component of a Policy
- ET-EXE-005 (Vote) — component of a Deliberation
- ET-OPS-002 (Agent Task) — item in a Queue or Workflow Run
- ET-PHY-002 (Folder) — component of a Repository or Folder
- ET-PHY-003 (File) — component of a Repository or Folder
- ET-PHY-008 (Table) — component of a Database

**Source Cardinality:** MANY
**Target Cardinality:** ONE

**Inverse Name:** BELONGS_TO (RT-STR-003)

**Evidence Obligation:** NO
**Evidence Rule:** CONTAINS is a structural fact established at the time of entity creation or admission. No evidence is required for the containment relationship itself.

**Constraints:**
- CONTAINS must not create cycles — an entity may not be a container of itself directly or transitively
- When a source entity is ARCHIVED, all contained entities must either be ARCHIVED, TRANSFERRED to a new container, or explicitly addressed — silent orphaning of contained entities is an architectural defect
- An entity may be CONTAINED by at most one parent container at any given time within a given containment hierarchy

**Known Implementation State:**
CONTAINS relationships are structurally implied by the entity definitions in ARCH-01-PLAN but are not registered as formal relationship instances. The Council's CONTAINS relationship with its seven Council Members is confirmed by the ENTITIES array in executive-council.js. Policy CONTAINS Rule relationships are implied by the constitutional structure. Repository CONTAINS Folder/File relationships are documented in the Phase 1 Great Census. All must be formally registered in ARCH-14.

**Distinguishing from Adjacent Types:**
CONTAINS must be distinguished from IS_PART_OF (RT-EXE-007). IS_PART_OF expresses functional participation in an execution context without structural membership. An Agent Task IS_PART_OF a Workflow Run (it participates in the workflow's execution), but the Workflow Run CONTAINS Agent Tasks only if those Tasks are definitionally registered members. The distinction: CONTAINS is structural and lifecycle-coupled; IS_PART_OF is functional and execution-scoped.

---

### RT-STR-003 — BELONGS_TO

**Definition:** BELONGS_TO asserts that the source entity is a structural member or component of the target entity. BELONGS_TO is the exact canonical inverse of CONTAINS — it is the same edge read in the child-to-parent direction. An entity that BELONGS_TO a parent entity cannot independently exist without that parent's existence. The BELONGS_TO relationship establishes the source entity's structural context and determines lifecycle coupling: when the target entity is ARCHIVED, the source entity's existence must be addressed.

**Semantic Role:** BELONGS_TO captures the child entity's structural anchoring to its parent container. While CONTAINS is the parent's enumeration of its members, BELONGS_TO is the child's declaration of its parent. Both are specified in this ontology because both navigational directions carry distinct semantic utility: a Rule BELONGS_TO a Policy (navigating from Rule to find its governing context), and a Policy CONTAINS Rules (navigating from Policy to enumerate its constraints). They are the same edge but they serve different architectural queries.

**Source Entity Types:**
- ET-EXE-002 (Council Member) — belongs to the Council
- ET-GOV-004 (Rule) — belongs to its governing Policy
- ET-EXE-005 (Vote) — belongs to its Deliberation
- ET-OPS-002 (Agent Task) — belongs to its Queue or Workflow Run (when in queued or workflow context)
- ET-PHY-002 (Folder) — belongs to its parent Repository or Folder
- ET-PHY-003 (File) — belongs to its parent Folder
- ET-PHY-008 (Table) — belongs to its Database

**Target Entity Types:**
- ET-EXE-001 (Council) — parent of Council Members
- ET-GOV-003 (Policy) — parent of Rules
- ET-EXE-004 (Deliberation) — parent of Votes
- ET-OPS-003 (Workflow Run) / ET-OPS-005 (Queue) — parent context for Agent Tasks
- ET-PHY-001 (Repository) / ET-PHY-002 (Folder) — parent of Folders and Files
- ET-PHY-007 (Database) — parent of Tables

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** CONTAINS (RT-STR-002)

**Evidence Obligation:** NO
**Evidence Rule:** As the inverse of CONTAINS, BELONGS_TO carries the same evidence obligation: none. The containment relationship is established structurally; its evidence is the same governance event that established CONTAINS.

**Constraints:**
- An entity may BELONGS_TO at most one structural parent at any given time
- An entity that BELONGS_TO a parent inherits that parent's lifecycle consequences — if the parent is ARCHIVED, the child must be addressed
- An entity may not BELONGS_TO itself
- BELONGS_TO must not create cycles in the containment hierarchy

**Known Implementation State:**
BELONGS_TO shares the same implementation state as CONTAINS — both are structurally implied but not formally registered. The inverse traversal of the CONTAINS graph provides all BELONGS_TO instances. ARCH-14 must instantiate both directions for all confirmed containment relationships.

**Distinguishing from Adjacent Types:**
BELONGS_TO must be distinguished from DERIVES_FROM (RT-GOV-002). A Rule BELONGS_TO a Policy (it is structurally contained within the Policy and part of its definition). A Policy DERIVES_FROM a Constitution (it derives its authority from the Constitution). Both relationships may hold simultaneously for the same source entity — a Rule both BELONGS_TO its Policy and, transitively, DERIVES_FROM the Constitution that gives the Policy its authority. Structural containment and authority provenance are different facts.

---

### RT-STR-004 — SUPERSEDES

**Definition:** SUPERSEDES asserts that the source entity is the authoritative current version and the target entity is its prior version that is now superseded. The superseded entity must transition to SUPERSEDED lifecycle state and remain accessible for historical audit — it may not be deleted. The SUPERSEDES chain provides the complete version history of any versioned entity. A SUPERSEDES relationship must be backed by an Amendment or equivalent governance event as its authorising evidence. The SUPERSEDES chain must be linear and acyclic: each entity may supersede at most one predecessor, and no entity may be part of a supersession cycle.

**Semantic Role:** SUPERSEDES captures version succession — the fact that a new version of an architectural artifact has been ratified and the prior version is now displaced but preserved. This is distinct from MODIFIES (RT-PHY-003), which captures the amendment act; SUPERSEDES captures the resulting version relationship. An Amendment MODIFIES a Constitution and the new version SUPERSEDES the old version — these are two different relationship types recording two different architectural facts about the same event.

**Source Entity Types:**
- ET-GOV-002 (Constitution) — a new Constitution version supersedes its predecessor
- ET-GOV-003 (Policy) — a revised Policy supersedes its prior version
- ET-GOV-005 (Certification) — a new Certification of the same subject supersedes the prior Certification
- ET-DAT-002 (Registry Record) — an updated Registry Record supersedes its prior version
- ET-KNW-009 (Document) — a revised ARCH specification supersedes its prior version

**Target Entity Types:**
- Prior instance of the same entity type as the source — SUPERSEDES may only connect entities of the same type

**Source Cardinality:** ONE
**Target Cardinality:** ONE

**Inverse Name:** IS_SUPERSEDED_BY

**Evidence Obligation:** YES
**Evidence Rule:** Supersession requires an Amendment (ET-GOV-006) or equivalent ratified governance event as its authorising evidence. The evidence artifact must identify the authority under which the supersession was sanctioned. Scripts/CONSTITUTION.md amendment log confirms four Amendment events, each of which has produced a SUPERSEDES relationship.

**Constraints:**
- The SUPERSEDES chain must be strictly linear — no entity may supersede more than one predecessor
- No entity may be superseded by more than one successor — the SUPERSEDES graph is a simple directed path, not a tree or DAG
- The SUPERSEDES chain must be acyclic
- A superseded entity must be preserved in ARCHIVED or SUPERSEDED lifecycle state — deletion of superseded entities is prohibited
- SUPERSEDES relationships may only connect entities of the same Entity Type

**Known Implementation State:**
Four confirmed Amendment instances in Scripts/CONSTITUTION.md each produce a SUPERSEDES relationship for the Constitution entity. Phase 2.3 Certification SUPERSEDES relationships should exist between consecutive Certifications of the same invariant but are currently not formalised. Document SUPERSEDES relationships for ARCH specifications will be created as new versions are issued. ARCH-14 must register all confirmed SUPERSEDES relationships for the amendment log entries.

**Distinguishing from Adjacent Types:**
SUPERSEDES must be distinguished from MODIFIES (RT-PHY-003). An Amendment MODIFIES a Constitution (the Amendment entity records the change act). The new version of the Constitution SUPERSEDES the old version (the succession relationship between the two Constitution versions). MODIFIES involves three entities: Amendment, prior Constitution, new Constitution. SUPERSEDES involves two entities: new version and old version.

---

### RT-STR-005 — DEPENDS_ON

**Definition:** DEPENDS_ON asserts that the source entity's correct operation requires the target entity to be available and functioning. DEPENDS_ON is a structural, persistent relationship — it persists for the life of the source entity, not per invocation. If the target entity fails or becomes unavailable, the source entity's health is degraded or broken accordingly. DEPENDS_ON is the architectural dependency declaration; the consequence of dependency failures is determined by the source entity's failure mode specification (FAIL-CLOSED, FAIL-OPEN, or FAIL-SOFT).

**Semantic Role:** DEPENDS_ON captures structural operational dependency — the fact that one entity cannot function correctly without another. This is distinct from USES (RT-EXE-005, which is operational reliance during execution without the structural lifetime binding), INVOKES (RT-EXE-002, which is per-call invocation without persistent dependency), and CALLS (RT-EXE-006, which is code-level invocation within the Physical Layer). DEPENDS_ON is the persistent structural fact; the others are runtime events or code-level relationships.

**Source Entity Types:**
- ET-SVC-001 (Service) — Services have structural dependencies on other Services and infrastructure
- ET-PHY-004 (Module) — Modules have structural import dependencies on other Modules
- ET-CAP-001 (Capability) — Capabilities may depend on specific Services or infrastructure to function
- ET-KNW-009 (Document) — ARCH specification documents depend on prior ARCH documents for their concepts
- ET-PHY-009 (Environment Variable) — Features or Services may depend on specific Environment Variables

**Target Entity Types:**
- ET-SVC-001 (Service) — Services depend on other Services
- ET-PHY-004 (Module) — Modules depend on other Modules
- ET-CAP-001 (Capability) — Capabilities may depend on other Capabilities
- ET-PHY-009 (Environment Variable) — Services may depend on specific configuration values

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_DEPENDENCY_OF

**Evidence Obligation:** NO
**Evidence Rule:** DEPENDS_ON is a structural declaration. It is established through static analysis (import graphs, service dependency declarations) or explicit specification. No runtime evidence is required for the dependency relationship itself; however, when a DEPENDS_ON target fails, the resulting health state must produce Observations and potentially Metrics.

**Constraints:**
- The DEPENDS_ON graph must be acyclic — circular dependencies are architectural defects, not architectural patterns
- A dependency cycle that cannot be broken by refactoring must be resolved by introducing a mediating entity
- The services/init.js 12-step initialisation cascade represents the canonical DEPENDS_ON ordering for Services — initialisation order must respect this graph
- An entity's failure mode must be specified before its DEPENDS_ON relationships can be governed — without knowing whether an entity is FAIL-CLOSED, FAIL-OPEN, or FAIL-SOFT, the impact of dependency failure cannot be assessed

**Known Implementation State:**
The static dependency graph was confirmed in Phase 2.1 across the codebase. The services/init.js 12-step cascade represents the canonical Service DEPENDS_ON order. The Phase 2.1 analysis confirmed the import dependency structure across all modules. No cycles were confirmed, but the 12-step init cascade's FAIL-SOFT classification means some dependency failures are masked rather than propagated. ARCH-14 must register the full DEPENDS_ON graph from the Phase 2.1 findings.

**Distinguishing from Adjacent Types:**
DEPENDS_ON must be distinguished from USES (RT-EXE-005). DEPENDS_ON is a structural, lifetime-coupled dependency: if the target is unavailable, the source is degraded or non-functional. USES is operational reliance during execution: the source entity draws on the target during normal operation, but the relationship is not necessarily structural or lifetime-coupled. A Service DEPENDS_ON its database (the Service cannot function at all without the database); an Agent USES a Model (the Agent relies on the Model during task execution, but the Agent entity itself exists independently of any particular Model invocation).

---

## Section 6 — Physical Relationships (RT-PHY)

The Physical group contains the three Relationship Types that bridge the Civilisation Layer to the Physical Layer and govern versioned change through the amendment process. These are the only Relationship Types in this ontology whose source entity types include Physical Layer entities (ET-PHY-NNN). All Civilisation entities are connected to their physical realisations exclusively through IMPLEMENTS and DEPLOYS. MODIFIES is the relationship that records the formal alteration of constitutional and specification documents — it is placed in this group because it concerns the physical artifacts (files, documents) that instantiate Civilisation governance, even though its governance significance is Civilisation-level.

---

### RT-PHY-001 — IMPLEMENTS

**Definition:** IMPLEMENTS asserts that a Physical entity is the technical realisation of a specific Civilisation entity. IMPLEMENTS is the bridge relationship that makes the physical repository meaningful in Civilisation terms. A Civilisation entity with no IMPLEMENTS relationship pointing to it is unimplemented — it exists in the governance architecture but has no physical form. A Physical entity that IMPLEMENTS a Civilisation entity is subject to all governance rules that apply to that Civilisation entity.

**Semantic Role:** IMPLEMENTS captures the implementation relationship — the fact that a physical artifact realises a logical Civilisation entity. This is the foundational relationship for the Repository Transformation Plan (ARCH-15): when every Physical entity has exactly one IMPLEMENTS target, the repository structure can be reorganised to reflect Civilisation structure. No other Relationship Type captures this logical-to-physical mapping.

**Source Entity Types:**
- ET-PHY-003 (File) — Files implement Civilisation entities as their primary physical carrier
- ET-PHY-004 (Module) — Modules implement Services or Capabilities as their logical unit
- ET-PHY-005 (Function) — Functions implement specific Capabilities
- ET-PHY-006 (Class) — Classes implement Service entities or structured Capability providers
- ET-PHY-010 (API Route) — Routes implement exposed Capabilities through Interfaces
- ET-PHY-011 (WebSocket Handler) — WebSocket Handlers implement real-time Interface Capabilities
- ET-PHY-012 (Cron Schedule) — Cron Schedules implement the physical realisation of logical Schedules

**Target Entity Types:**
- ET-SVC-001 (Service) — a Module or File implements a Service
- ET-CAP-001 (Capability) — a Function or Module implements a Capability
- ET-DAT-004 (Source of Truth) — a File or Table implements a Source of Truth's physical storage
- ET-OPS-004 (Schedule) — a Cron Schedule implements a logical Schedule
- ET-SVC-002 (Interface) — an API Route or WebSocket Handler implements an Interface

**Source Cardinality:** MANY
**Target Cardinality:** ONE

**Inverse Name:** IS_IMPLEMENTED_BY

**Evidence Obligation:** NO
**Evidence Rule:** IMPLEMENTS is a structural mapping relationship established through static analysis. No runtime evidence is required. Changes to what a Physical entity implements are captured by the Amendment process.

**Constraints:**
- A Physical entity may IMPLEMENTS at most one primary Civilisation entity — if a single file implements multiple Services, it must be refactored or one Service must be designated as primary
- A Civilisation entity that requires physical implementation must have at least one IS_IMPLEMENTED_BY relationship — unimplemented required entities are architectural defects
- An IMPLEMENTS relationship may not be established between entities at incompatible abstraction levels — a Function may not implement a Council (a governance-level executive entity requires a Service-level implementation)
- When a Physical entity is deprecated or removed, all IMPLEMENTS relationships it holds must be transferred or the Civilisation entities must be flagged as unimplemented

**Known Implementation State:**
Phase 2.1 and Phase 2.2 produced the foundational analysis for IMPLEMENTS registration: the runtime census identified which modules implement which services and capabilities. ARCH-15 (Repository Transformation Plan) is entirely dependent on the IMPLEMENTS graph — reorganising the repository requires knowing which physical artifacts implement which Civilisation entities. The CEO Council Member implementation file is confirmed absent (UR01 unresolved). ARCH-14 must register all confirmed IMPLEMENTS relationships from Phase 2.2.

**Distinguishing from Adjacent Types:**
IMPLEMENTS must be distinguished from DEPLOYS (RT-PHY-002). A File IMPLEMENTS a Service (logical mapping: the file is the code that realises the service's capabilities). The Repository DEPLOYS that File (availability mapping: the repository makes the file available in a runtime environment). IMPLEMENTS concerns meaning; DEPLOYS concerns availability.

---

### RT-PHY-002 — DEPLOYS

**Definition:** DEPLOYS asserts that the source entity makes the target entity available in a runtime environment. DEPLOYS is the availability relationship: it records that an artifact has been placed into an environment where it can be executed or accessed. DEPLOYS is distinct from IMPLEMENTS: a File IMPLEMENTS a Service (logical meaning), while the Repository DEPLOYS that File (runtime availability). A Civilisation entity may IMPLEMENTS a capability that is not yet DEPLOYED — it exists in the governance architecture and has physical code but is not currently available in the runtime environment.

**Semantic Role:** DEPLOYS captures environment-level availability — the fact that a physical artifact is accessible in a specific runtime context. This is the relationship that distinguishes designed (IMPLEMENTS relationship present) from operational (DEPLOYS relationship present in production environment). No other Relationship Type captures this deployment availability fact.

**Source Entity Types:**
- ET-PHY-001 (Repository) — the Repository deploys its artifacts into the runtime environment
- ET-PHY-002 (Folder) — a Folder may deploy its contents into a specific environment

**Target Entity Types:**
- ET-PHY-003 (File) — Files are the primary DEPLOYS targets
- ET-PHY-004 (Module) — Modules are deployed as part of File deployment
- ET-SVC-001 (Service) — Services are deployed from their implementing files
- ET-PHY-012 (Cron Schedule) — Cron Schedules are deployed to the hosting platform's scheduler

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** IS_DEPLOYED_BY

**Evidence Obligation:** CONDITIONAL
**Evidence Rule:** Evidence is required when DEPLOYS includes changes to environment variables with constitutional significance (such as BYPASS_DASHBOARD_AUTH, AUTONOMY_LEVEL) or changes to routes that expose new Capabilities. Standard code deployments that change no constitutionally significant configuration do not require DEPLOYS evidence records.

**Constraints:**
- A DEPLOYS relationship must specify the target environment — production, staging, or local — to avoid ambiguity about where an artifact is available
- DEPLOYS of constitutionally significant Environment Variables (those with `governance_significance = CONSTITUTIONAL`) must be backed by an Amendment or Authority Grant
- A DEPLOYS relationship to the production environment for a Service that has not been CERTIFIES is a defect — unvalidated Services must not be deployed to production without explicit governance approval

**Known Implementation State:**
The primary DEPLOYS relationship in APEX connects the Repository to the Render hosting platform. Render cron routes confirm that Cron Schedules are DEPLOYED (adaptation_refresh UR14, weekly_review UR15 are confirmed deployed but their Civilisation-layer targets remain unresolved). The DEPLOYS relationship is implicit in the Render hosting configuration rather than formally registered. ARCH-14 must formalise the production DEPLOYS relationships.

**Distinguishing from Adjacent Types:**
DEPLOYS must be distinguished from IMPLEMENTS (RT-PHY-001). IMPLEMENTS is the permanent logical mapping between a physical artifact and the Civilisation entity it realises. DEPLOYS is the environment-specific availability fact — a file that IMPLEMENTS a Service may or may not be DEPLOYED in any given environment. IMPLEMENTS is a logical relationship; DEPLOYS is an operational one.

---

### RT-PHY-003 — MODIFIES

**Definition:** MODIFIES asserts that an Amendment has made a sanctioned change to the content or structure of a Constitution or architectural specification. MODIFIES is the amendment-to-document relationship — it records the formal change act. Every MODIFIES relationship must produce a new version of the target document and initiate a SUPERSEDES chain. MODIFIES without SOVEREIGN ratification (as confirmed by the Amendment entity's `ratified_by` attribute) is constitutionally unauthorised.

**Semantic Role:** MODIFIES captures the amendment act — the formal, ratified change to a governing document. This is distinct from SUPERSEDES (which records the version succession) and from WRITES (which records data modification). MODIFIES is the constitutional change record; SUPERSEDES is the version graph; WRITES is the data operation. A single Amendment produces all three: it MODIFIES the Constitution (the Amendment entity records the change), and the new Constitution version SUPERSEDES the old (the version succession), and the physical file is WRITTEN with new content.

**Source Entity Types:**
- ET-GOV-006 (Amendment) — only Amendment entities may produce MODIFIES relationships; informal changes are not MODIFIES

**Target Entity Types:**
- ET-GOV-002 (Constitution) — the primary target for constitutional Amendments
- ET-KNW-009 (Document) — specifically ARCH specification documents that may be amended through the formal process

**Source Cardinality:** ONE
**Target Cardinality:** ONE

**Inverse Name:** IS_MODIFIED_BY

**Evidence Obligation:** YES
**Evidence Rule:** The Amendment entity itself is the primary evidence artifact. The Amendment must carry references to CRO and CLO review records (required by constitution-v1.md Art. 8) and the SOVEREIGN ratification identity. An Amendment without these fields is structurally present but constitutionally invalid.

**Constraints:**
- Every MODIFIES relationship must be backed by a ratified Amendment with SOVEREIGN authority — informal modifications are prohibited
- A MODIFIES relationship must produce a new version of the target document — the original is preserved via SUPERSEDES
- Constitution-v1.md Art. 8 requires CRO and CLO review before ratification — the Amendment entity must carry evidence of both reviews
- A MODIFIES relationship may only be produced by an entity of type ET-GOV-006 (Amendment) — no other entity type may produce a MODIFIES relationship

**Known Implementation State:**
Four confirmed MODIFIES instances exist in the Scripts/CONSTITUTION.md amendment log. Each corresponds to a constitutional change. These are documented in the amendment log text rather than as formal relationship instances with corresponding Amendment entities. ARCH-14 must instantiate the four confirmed MODIFIES relationships with their corresponding Amendment entities. Future amendments to ARCH specification documents will each produce additional MODIFIES instances.

**Distinguishing from Adjacent Types:**
MODIFIES must be distinguished from WRITES (RT-DAT-002). WRITES is the data-layer operation that changes the content of a Source of Truth or Memory Record — it is an operational event that may be performed by Agents, Services, or Gateways. MODIFIES is the constitutional-level amendment act performed exclusively by Amendment entities with SOVEREIGN ratification. Every MODIFIES results in a physical WRITES to the document's file, but MODIFIES is the governance relationship and WRITES is the data operation. The two are causally related but architecturally distinct.

---

## Section 7 â€” Execution Relationships (RT-EXE)

The Execution group contains the seven Relationship Types that capture operational work in progress: how agents take on tasks, how capabilities are invoked, how shared resources are utilised, how code calls other code, how schedules drive recurring execution, how events cascade into consequences, and how work units participate in larger execution contexts. This group is the largest in the ontology because operational work is the most varied category of relationship in the Civilisation. These types collectively describe the runtime behaviour of the Civilisation â€” what is happening, who is doing it, and how capabilities are being exercised.

---

### RT-EXE-001 â€” EXECUTES

**Definition:** EXECUTES asserts that an Agent has assumed responsibility for and is performing or has performed an Agent Task. EXECUTES connects the Agent identity to the work unit for the full duration of the Task's active lifecycle. An Agent Task is EXECUTED by exactly one Agent. EXECUTES begins when the Task transitions to EXECUTING state and persists through COMPLETED, FAILED, CANCELLED, or FORCE_TERMINATED. An Agent may EXECUTE many Tasks over its operational lifetime. The EXECUTES relationship is the basis for Agent accountability: all outputs, resource consumption, and governance decisions made during a Task are attributable to the executing Agent through this relationship.

**Semantic Role:** EXECUTES captures the assignment-to-action relationship â€” the fact that a specific Agent bears responsibility for a specific work unit. No other Relationship Type captures this binding of an agent identity to a task execution. INVOKES captures individual capability calls within a Task; IS_PART_OF captures a Task's participation in a Workflow Run. EXECUTES is the top-level accountability relationship for agent work.

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents are the only entities that may produce EXECUTES relationships; no Service or other entity type may directly execute Agent Tasks

**Target Entity Types:**
- ET-OPS-002 (Agent Task) â€” Agent Tasks are the only valid targets of EXECUTES

**Source Cardinality:** MANY
**Target Cardinality:** ONE

**Inverse Name:** IS_EXECUTED_BY

**Evidence Obligation:** YES
**Evidence Rule:** Every EXECUTES relationship must produce an Audit Record in the apex_agent_runs table, recording the executing Agent identity, the Task identity, the start time, the end time, the outcome, and the Task's `autonomy_level_at_creation`.

**Constraints:**
- Each Agent Task must have exactly one EXECUTES relationship â€” a Task being executed by multiple Agents simultaneously is architecturally invalid
- EXECUTES may only be established when the Task is in APPROVED or QUEUED state (except at AUTONOMY_LEVEL=3, where the PLANNEDâ†’APPROVED transition is bypassed)
- The executing Agent must have the Capability to perform all step types listed in the Task's `steps` attribute
- When an Agent is SUSPENDED or RETIRED, all EXECUTES relationships for active Tasks must be resolved

**Known Implementation State:**
The agent-task-cycle.js and agent-queue.js confirm EXECUTES relationships are instantiated via the apex_agent_runs table. AUTONOMY_LEVEL=3 in production bypasses the PLANNEDâ†’APPROVED gate, meaning EXECUTES relationships are established without explicit AUTHORIZES (INV-E1 PARTIALLY ENFORCED). The deduplication mechanism in agent-queue.js (dedup by task id) prevents duplicate EXECUTES relationships for the same Task.

**Distinguishing from Adjacent Types:**
EXECUTES must be distinguished from INVOKES (RT-EXE-002). EXECUTES is the overarching relationship between an Agent and an entire Agent Task â€” it persists for the full task lifecycle. INVOKES is the per-step relationship between an Agent or Task and a specific Capability call â€” a discrete event within the EXECUTES context. An EXECUTES relationship may encompass dozens of INVOKES relationships.

---

### RT-EXE-002 â€” INVOKES

**Definition:** INVOKES asserts that the source entity has made a discrete, request-level call to a Capability, Tool, or Model at a specific point in time. INVOKES is the per-invocation runtime relationship â€” not a structural dependency but a discrete execution event. Each INVOKES instance may require an AUTHORIZES relationship first, depending on the Capability's `authority_required` attribute.

**Semantic Role:** INVOKES captures the per-call event â€” the specific moment when a capability is exercised. This is the unit of governance enforcement, resource consumption accounting, and operational auditing.

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents invoke Capabilities as their primary mode of action
- ET-OPS-002 (Agent Task) â€” Agent Tasks invoke Capabilities at each step
- ET-SVC-001 (Service) â€” Services invoke Capabilities including Model invocations

**Target Entity Types:**
- ET-CAP-001 (Capability) â€” the primary target; all governed operations are Capabilities
- ET-CAP-002 (Tool) â€” Tools are a subtype of Capability with specific invocation semantics
- ET-CAP-003 (Model) â€” Model invocations are INVOKES relationships with significant resource consumption implications

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_INVOKED_BY

**Evidence Obligation:** CONDITIONAL
**Evidence Rule:** Evidence is required when the Capability has `audit_obligation = YES`, or when the target is a Model invocation (cost tracking obligation), or when the Capability crosses a Trust Boundary.

**Constraints:**
- An INVOKES of a Capability with `authority_required` above the invoking entity's Trust Level must be preceded by an AUTHORIZES relationship
- An INVOKES targeting a Model must produce a corresponding CONSUMES relationship for the budget consumed
- An INVOKES of a Capability not in the Agent Task's 8-type step allowlist is a violation when the source is an Agent Task
- Model INVOKES must respect the circuit breaker state â€” invoking a Model whose circuit is OPEN is prohibited

**Known Implementation State:**
The 22 APEX Tools in lib/apex-tools.js each generate INVOKES relationships. Six browser tools are unadvertised â€” they may be INVOKED without the model's explicit selection. web_search has Brave+DDG fallback â€” a failed INVOKES of the primary Tool followed by INVOKES of the fallback. Model INVOKES relationships are instantiated in lib/models/runtime/index.js but corresponding CONSUMES relationships are not persisted (consumption-log.js logs only).

**Distinguishing from Adjacent Types:**
INVOKES must be distinguished from CALLS (RT-EXE-006). INVOKES is a Civilisation-layer relationship between Civilisation entities and Capabilities. CALLS is a Physical Layer relationship between physical code entities. An Agent INVOKES a Capability; the Function implementing the Agent CALLS the Function implementing the Capability.

---

### RT-EXE-003 â€” SCHEDULES

**Definition:** SCHEDULES asserts that a Schedule or Cron Schedule entity is configured to initiate the creation and execution of an Agent Task, Workflow Run, or Process at defined intervals or trigger points. SCHEDULES is the configuration-time relationship â€” it exists from the moment a Schedule is registered and persists for the Schedule's operational lifetime. One SCHEDULES relationship produces many TRIGGERS events over time.

**Semantic Role:** SCHEDULES captures the recurring configuration relationship between a schedule definition and the work type it periodically initiates. TRIGGERS is the per-execution event; SCHEDULES is the standing configuration that produces those events.

**Source Entity Types:**
- ET-OPS-004 (Schedule) â€” logical Schedule entities govern what is triggered and at what frequency
- ET-PHY-012 (Cron Schedule) â€” physical Cron Schedule entities are the runtime implementation of logical Schedules

**Target Entity Types:**
- ET-OPS-003 (Workflow Run) â€” a Schedule may be configured to initiate new Workflow Run instances
- ET-OPS-002 (Agent Task) â€” a Schedule may be configured to initiate specific Agent Tasks at each fire

**Source Cardinality:** ONE
**Target Cardinality:** ONE

**Inverse Name:** IS_SCHEDULED_BY

**Evidence Obligation:** NO
**Evidence Rule:** SCHEDULES is a configuration relationship. Each execution triggered by the schedule is evidenced by the EXECUTES relationship and Audit Record produced at that execution.

**Constraints:**
- A Schedule may not SCHEDULES a work type that the scheduling authority does not have authorisation to initiate
- A Cron Schedule must have a corresponding IMPLEMENTS relationship to a logical Schedule entity â€” orphaned Cron Schedules with no Civilisation-layer target are unresolved architectural items
- A Schedule in PAUSED or DISABLED state may not produce TRIGGERS events
- The authority level required to create or modify a SCHEDULES relationship must equal or exceed the authority required to initiate the target work type

**Known Implementation State:**
Two unresolved Cron Schedules (UR14: adaptation_refresh, UR15: weekly_review) have confirmed physical presence in the Render cron configuration but unresolved Civilisation-layer targets. Their SCHEDULES relationships exist at the Physical Layer but have no corresponding logical Schedule entity target. The runDueSchedules function in agent-task-cycle.js manages the execution of scheduled work. ARCH-14 must resolve UR14 and UR15 and register their SCHEDULES relationships once targets are confirmed.

**Distinguishing from Adjacent Types:**
SCHEDULES must be distinguished from TRIGGERS (RT-EXE-004). SCHEDULES is the standing configuration that declares what will be initiated and at what frequency â€” a structural relationship existing independently of any specific execution. TRIGGERS is the per-occurrence event recording a specific initiation act. One SCHEDULES relationship produces many TRIGGERS events.

---

### RT-EXE-004 â€” TRIGGERS

**Definition:** TRIGGERS asserts that an Event, Lifecycle Transition, or threshold crossing has caused an execution consequence â€” the initiation of an Agent Task, Notification, further Event, or state change. TRIGGERS is a causal relationship between an occurrence and its immediate consequence. Unlike SCHEDULES, TRIGGERS is event-based and immediate: it records a specific causal link between one occurrence and its consequence at a specific point in time.

**Semantic Role:** TRIGGERS captures the causal event relationship â€” the fact that one occurrence directly caused another to begin. This is the mechanism by which the Civilisation responds to state changes without polling.

**Source Entity Types:**
- ET-COM-001 (Event) â€” Events are the primary triggers routed to handlers by the Event Bus
- ET-OPS-004 (Schedule) â€” at each fire time, a Schedule produces a TRIGGERS event for its target execution
- Lifecycle Transition â€” a transition in an entity's lifecycle state may TRIGGERS consequences

**Target Entity Types:**
- ET-OPS-002 (Agent Task) â€” an Event may TRIGGERS the creation and queuing of an Agent Task
- ET-COM-002 (Notification) â€” an Event may TRIGGERS a Notification to the Founder
- ET-COM-001 (Event) â€” an Event may TRIGGERS further Events (cascading event chains)
- ET-OPS-003 (Workflow Run) â€” an Event may TRIGGERS a new Workflow Run

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** IS_TRIGGERED_BY

**Evidence Obligation:** NO
**Evidence Rule:** The triggered entity's creation is its own evidence. TRIGGERS relationships in chains should be traceable through the `correlation_id` attribute of resulting entities.

**Constraints:**
- A TRIGGERS relationship must be traceable â€” the causal link must be preserved
- TRIGGERS chains must not create infinite loops
- A TRIGGERS relationship may not be produced by an entity in a terminal lifecycle state
- When a TRIGGERS consequence fails to materialise, the absence must be detected and logged

**Known Implementation State:**
The Event Bus (lib/event-bus.js) uses setImmediate dispatch with no persistence. If the process crashes between EMITS and TRIGGERS delivery, the TRIGGERS relationship is silently lost. The 16 confirmed Event Types each have expected TRIGGERS consequences, but causal chains are not registered as formal relationship instances. AGENT_COMPLETED TRIGGERS the next workflow step; BACKGROUND_TASK_QUEUED TRIGGERS queue processing. ARCH-11 must specify which Events must have guaranteed TRIGGERS delivery.

**Distinguishing from Adjacent Types:**
TRIGGERS must be distinguished from RESPONDS_TO (RT-COM-003). RESPONDS_TO is the handler registration: a Service declares it will handle a specific Event type. TRIGGERS is the causal event: when an Event occurs, it causes handler execution. RESPONDS_TO is the structural setup; TRIGGERS is the runtime occurrence.

---

### RT-EXE-005 â€” USES

**Definition:** USES asserts a general ongoing utilisation relationship: the source entity makes regular operational use of the target entity during its normal functioning. USES is weaker than INVOKES (discrete per-call event) and less structurally binding than DEPENDS_ON (implies failure cascade). USES represents continuous operational reliance without the strong failure-mode implications of structural dependency.

**Semantic Role:** USES captures the ongoing operational relationship that is too general for INVOKES and too loose for DEPENDS_ON â€” the catch-all for operational reliance that requires architectural acknowledgement.

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents use Models, Resource Pools, and Registries in normal operation
- ET-SVC-001 (Service) â€” Services use Interfaces, data sources, and other Services
- ET-PHY-004 (Module) â€” Modules use other Modules' exported interfaces

**Target Entity Types:**
- ET-CAP-003 (Model) â€” Agents and Services regularly use Models for AI reasoning
- ET-RES-003 (Resource Pool) â€” Agents and Services use shared Resource Pools
- ET-SVC-002 (Interface) â€” Services use Interfaces to communicate
- ET-DAT-001 (Registry) â€” Services use Registries to look up authoritative entity records

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_USED_BY

**Evidence Obligation:** CONDITIONAL
**Evidence Rule:** Evidence is required when the target is a Resource type (consumption tracking obligation to support budget governance). Not required for structural service dependencies or operational interface usage.

**Constraints:**
- A USES relationship to a Resource target must be paired with CONSUMES relationships recording actual consumption
- An entity may not USES a target at a Trust Level higher than its own authority level
- USES relationships to Models must respect the tier routing rules

**Known Implementation State:**
lib/models/runtime/index.js confirms Agents USES Model instances. agent-queue.js confirms Agents USES the Queue's concurrency pool. lib/apex-tools.js confirms Services USES Tool schemas. These are operational facts not formally registered as USES relationship instances. ARCH-14 must register the primary USES relationships confirmed in Phase 2.2.

**Distinguishing from Adjacent Types:**
USES must be distinguished from DEPENDS_ON (RT-STR-005). DEPENDS_ON is structural and lifetime-coupled: the source entity is architecturally broken if the target is unavailable. USES is operational and tolerant: the source entity can partially function if the USES target is temporarily unavailable. An Agent DEPENDS_ON the Agent Queue but USES a particular Model â€” the Agent is broken without a queue but can adapt to using a different Model tier.

---

### RT-EXE-006 â€” CALLS

**Definition:** CALLS asserts that a Physical entity has a direct code-level invocation relationship with another Physical entity. CALLS is the Physical Layer equivalent of INVOKES: it captures the static and dynamic code call graph within the Physical Layer. CALLS relationships correspond to INVOKES relationships between the Civilisation entities they implement.

**Semantic Role:** CALLS captures the code-level dependency and invocation structure of the Physical Layer. The blast radius of modifying a Function is determined by traversing IS_CALLED_BY relationships upstream. This graph is essential for repository transformation and refactoring governance.

**Source Entity Types:**
- ET-PHY-004 (Module) â€” Modules import and call other Modules
- ET-PHY-005 (Function) â€” Functions call other Functions directly
- ET-PHY-010 (API Route) â€” Routes call handler Functions and Modules

**Target Entity Types:**
- ET-PHY-004 (Module) â€” a Module may be called by another Module
- ET-PHY-005 (Function) â€” a Function may be called by another Function
- ET-PHY-010 (API Route) â€” a Route may call other Routes in delegation scenarios

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_CALLED_BY

**Evidence Obligation:** NO
**Evidence Rule:** CALLS is a structural code-level relationship established through static analysis.

**Constraints:**
- The CALLS graph must be used to compute blast radius before any function or module modification
- CALLS relationships must preserve correspondence with INVOKES relationships at the Civilisation Layer
- When ARCH-15 reorganises the Physical Layer, all CALLS relationships must be preserved

**Known Implementation State:**
Phase 2.1 produced the static dependency graph. Key confirmed CALLS chains: civilization-kernel.js â†’ agent-task-cycle.js â†’ agent-queue.js â†’ gateway.js. This graph is the basis for impact analysis via GitNexus (3614 symbols, 17201 relationships, 300 execution flows). ARCH-15 must preserve all CALLS relationships when reorganising the Physical Layer.

**Distinguishing from Adjacent Types:**
CALLS must be distinguished from INVOKES (RT-EXE-002). CALLS is strictly a Physical Layer relationship between code entities. INVOKES is a Civilisation Layer relationship between governance entities and Capabilities. They correspond: a Function that CALLS another Function is the physical expression of an Agent INVOKES a Capability.

---

### RT-EXE-007 â€” IS_PART_OF

**Definition:** IS_PART_OF asserts that the source entity is a constituent component of the target entity's execution, contributing to the target's completion without necessarily being owned by or structurally contained within the target. IS_PART_OF is a participation relationship â€” the source entity contributes to the target entity's operational outcome. This differs from BELONGS_TO (structural containment with lifecycle coupling) and OWNS (governance authority).

**Semantic Role:** IS_PART_OF captures functional participation in execution without implying structural ownership or containment. The participating entity's owner bears responsibility for its contribution, not the execution context it participates in.

**Source Entity Types:**
- ET-OPS-002 (Agent Task) â€” a Task participates as a step in a Workflow Run
- ET-INT-004 (Milestone) â€” a Milestone is a constituent checkpoint of a Project
- ET-EXE-005 (Vote) â€” a Vote is a constituent element of a Deliberation

**Target Entity Types:**
- ET-OPS-003 (Workflow Run) â€” a Workflow Run is composed of participating Agent Tasks
- ET-INT-003 (Project) â€” a Project is composed of Milestones
- ET-EXE-004 (Deliberation) â€” a Deliberation is composed of Votes

**Source Cardinality:** MANY
**Target Cardinality:** ONE

**Inverse Name:** HAS_PART

**Evidence Obligation:** NO
**Evidence Rule:** IS_PART_OF is a participation relationship. Evidence for the participating entity's contribution is carried by the participating entity's own evidence obligations.

**Constraints:**
- An Agent Task may IS_PART_OF at most one Workflow Run at a given time
- A Vote may IS_PART_OF exactly one Deliberation
- IS_PART_OF does not transfer ownership

**Known Implementation State:**
Agent Task IS_PART_OF Workflow Run is confirmed by the `parent_workflow_id` attribute in ET-OPS-002 and master-orchestrator.js planFeature. Vote IS_PART_OF Deliberation is confirmed by the executive_votes table structure. Milestone IS_PART_OF Project is architectural design only. ARCH-14 must register IS_PART_OF relationships as they are instantiated.

**Distinguishing from Adjacent Types:**
IS_PART_OF must be distinguished from BELONGS_TO (RT-STR-003). BELONGS_TO is structural containment with full lifecycle coupling. IS_PART_OF is functional participation without structural coupling â€” an Agent Task IS_PART_OF a Workflow Run but is owned by the Agent, not the Workflow Run.

---

## Section 8 â€” Data Flow Relationships (RT-DAT)

The Data Flow group contains the four Relationship Types that govern how data moves through the Civilisation: reading from governed stores, writing to governed stores, producing formal output entities, and consuming finite resources. Data flow relationships are among the most governance-sensitive in the ontology. The Phase 2.3 certification confirmed that five or more write paths bypass the designated Memory Gateway, that resource consumption is not persisted, and that evidence records may be silently lost.

---

### RT-DAT-001 â€” READS

**Definition:** READS asserts that the source entity has accessed the content of the target entity's data store during its operation, without modifying it. READS establishes the access relationship for audit and governance purposes. The Source-of-Truth architecture requires that all reads of authoritative data occur through designated read paths â€” READS relationships that bypass these paths are architectural violations even though they do not modify data.

**Semantic Role:** READS captures data access without modification. Reading is architecturally significant because it reveals data flow patterns, establishes audit trails for sensitive data access, and enables detection of unauthorised direct database reads that bypass governance layers.

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents read Memory Records, Registries, and Sources of Truth during task execution
- ET-SVC-001 (Service) â€” Services read configuration, state, and data sources during operation
- ET-PHY-004 (Module) â€” Modules read from data sources during their operation
- ET-PHY-005 (Function) â€” Functions may directly read from data stores

**Target Entity Types:**
- ET-DAT-004 (Source of Truth) â€” reading from the authoritative data source
- ET-DAT-005 (Projection) â€” reading from a derived view
- ET-KNW-001 (Memory Record) â€” reading stored knowledge
- ET-KNW-009 (Document) â€” reading specification or knowledge documents
- ET-PHY-008 (Table) â€” direct table reads when accessing Physical Layer directly

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_READ_BY

**Evidence Obligation:** CONDITIONAL
**Evidence Rule:** Evidence is required when reading constitutionally significant data (Evidence Records, Certifications, Authority Grants, Audit Records) or when reading through a bypass path that circumvents the designated Gateway.

**Constraints:**
- READS of a Source of Truth must go through the designated read path â€” direct database reads that bypass designated paths are architectural violations
- READS of constitutionally significant data must be preceded by an AUTHORIZES relationship
- A READS relationship to a SUPERSEDED or ARCHIVED entity must be flagged as historical access

**Known Implementation State:**
Phase 2.3 confirmed multiple read paths: chat-context.js reads memory tables; health/monitor.js reads health state; dynamic-agent-selector.js reads agent specs. The analysis focused primarily on write paths, but the same bypass risk applies to reads â€” direct table reads via pg_helpers.js may bypass any access control layer. ARCH-05 must map all READS relationships per domain and identify those that bypass designated read paths.

**Distinguishing from Adjacent Types:**
READS must be distinguished from OBSERVES (RT-OBS-001). READS is a data access relationship â€” the entity is consuming data from a store. OBSERVES is a monitoring relationship â€” the entity has established a structured monitoring relationship to perceive state changes. READS is data consumption; OBSERVES is state perception.

---

### RT-DAT-002 â€” WRITES

**Definition:** WRITES asserts that the source entity has modified the content of the target entity's data store. All WRITES to governed Sources of Truth must flow through the designated Gateway and must produce Audit Records. A WRITES relationship that bypasses the designated Gateway is an unauthorised write â€” an architectural defect regardless of whether the content written is valid.

**Semantic Role:** WRITES captures data modification â€” the specific act of changing a governed data store. Data modification is a governance event: it changes the Civilisation's authoritative record of truth and must therefore be controlled, audited, and traceable.

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents write Memory Records as the primary output of their knowledge work
- ET-SVC-001 (Service) â€” Services write to their authoritative data domains
- ET-SVC-003 (Gateway) â€” Gateways write on behalf of requesting entities after evaluating governance requirements
- ET-PHY-004 (Module) â€” Modules may write directly (authorised path) or via bypass (defect)

**Target Entity Types:**
- ET-DAT-004 (Source of Truth) â€” the canonical target for governed writes
- ET-KNW-001 (Memory Record) â€” the primary target of memory write operations
- ET-PHY-008 (Table) â€” direct table writes (authorised through Gateway or identified as bypass)

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_WRITTEN_BY

**Evidence Obligation:** YES
**Evidence Rule:** All WRITES to governed data stores must produce Audit Records identifying the writing entity, the target store, the content written (or a hash), the Gateway through which the write passed, and the timestamp.

**Constraints:**
- All WRITES to a Source of Truth must pass through the designated Gateway
- A WRITES must be preceded by an AUTHORIZES relationship confirming sufficient authority
- A WRITES without ENFORCES standing between the writing entity and the target is an unauthorised write pattern
- A WRITES to an ARCHIVED or SUPERSEDED entity is architecturally prohibited

**Known Implementation State:**
Five or more confirmed WRITES paths bypass the Memory Gateway (lib/memory/gateway.js): reflection-engine.js, obsidian-memory.js, and reflexion-tracker.js all perform direct writes without passing through the Gateway (C01, C08). The memory-governor contradiction (C01) restricts memory writes via policy but allows bypasses in implementation. WRITES without ENFORCES is the confirmed defect pattern. ARCH-10 must enumerate all WRITES paths and enforce Gateway routing.

**Distinguishing from Adjacent Types:**
WRITES must be distinguished from PRODUCES (RT-DAT-003). WRITES is the data-layer operation that modifies a store's content. PRODUCES is the creation of a formal, named, lifecycle-bearing Civilisation entity. When an Agent Task completes and creates an Evidence Record, it both PRODUCES the Evidence Record and WRITES to the Evidence domain's Source of Truth. These are different architectural facts about the same operation.

---

### RT-DAT-003 â€” PRODUCES

**Definition:** PRODUCES asserts that the source entity's operational process has created a formal output artifact â€” a new entity with its own Identity, Lifecycle, and governance obligation â€” as a direct result of that operation. A PRODUCED entity is a first-class architectural object that must be registered, carries an Identity, and has a Lifecycle beginning at the moment of production.

**Semantic Role:** PRODUCES captures the output entity creation relationship â€” the fact that one entity's operation has brought a new governed entity into existence. The PRODUCES relationship is the birth event for new Civilisation entities, triggering Registry admission and establishing governance obligations.

**Source Entity Types:**
- ET-OPS-002 (Agent Task) â€” Agent Tasks produce Evidence Records and Reflections on completion
- ET-EXE-004 (Deliberation) â€” Deliberations produce Decision Records when concluded
- ET-KNW-008 (Reflection) â€” Reflections produce Lessons as their primary output
- ET-SVC-001 (Service) â€” Services may produce Notifications and other formal outputs
- ET-CAP-003 (Model) â€” Model invocations produce structured outputs that may be formalised as entities

**Target Entity Types:**
- ET-KNW-004 (Evidence Record) â€” the canonical output of completed Agent Tasks and governance events
- ET-EXE-006 (Decision Record) â€” the canonical output of completed Deliberations
- ET-KNW-002 (Lesson) â€” the canonical output of the Reflection process
- ET-KNW-008 (Reflection) â€” Agent Tasks may produce Reflections on completion
- ET-COM-002 (Notification) â€” Services produce Notifications as formal communication entities
- ET-KNW-009 (Document) â€” Agent Tasks may produce formal Documents

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** IS_PRODUCED_BY

**Evidence Obligation:** YES
**Evidence Rule:** The PRODUCED entity is the evidence artifact â€” PRODUCES is self-evidencing. However, the governance.js `_w()` fire-and-forget pattern (C03) means Evidence Records may be silently lost, severing the self-evidencing property. All PRODUCES operations must await confirmation of the produced entity's persistence.

**Constraints:**
- A PRODUCED entity must receive a Registry Record within its admissible admission window
- A PRODUCES operation that fails must record the failure in an Observation
- An Agent Task that PRODUCES an Evidence Record must include the Task's Identity in `subject_entity_id`
- A Deliberation that PRODUCES a Decision Record must include the complete vote distribution and constitutional basis

**Known Implementation State:**
Agent Task PRODUCES Evidence Record is confirmed by the apex_agent_runs table. Deliberation PRODUCES Decision Record is confirmed by executive_deliberations write in executive-council.js Step 10. Reflection PRODUCES Lesson is confirmed in reflection-engine.js. However, the fire-and-forget pattern in governance.js `_w()` (C03) means Evidence Records may be silently lost. ARCH-08 must specify the required evidence persistence protocol.

**Distinguishing from Adjacent Types:**
PRODUCES must be distinguished from GENERATES (RT-KNW-003). PRODUCES concerns the creation of formal, named, lifecycle-bearing Civilisation entities with explicit governance obligations. GENERATES concerns knowledge artifacts that emerge as natural by-products of operational processes. A Reflection GENERATES Observations (natural by-products) and PRODUCES Lessons (formal entities with Identity and Lifecycle).

---

### RT-DAT-004 â€” CONSUMES

**Definition:** CONSUMES asserts that the source entity's operation has depleted a finite Resource â€” specifically Budget, Compute capacity, or authorisation count. Every CONSUMES event must produce a Consumption Record (ET-RES-004). Without persisted CONSUMES records, the per-call financial limit ($2) and the monthly Council cap ($500) established in Art. 2 of constitution-v1.md cannot be programmatically enforced.

**Semantic Role:** CONSUMES captures the depletion of finite resources. No other Relationship Type captures resource depletion. USES captures operational reliance on a resource but does not record depletion. Only CONSUMES captures the financial and computational cost of operations.

**Source Entity Types:**
- ET-OPS-002 (Agent Task) â€” Agent Tasks consume Budget through their Capability invocations
- ET-SVC-001 (Service) â€” Services consume Budget and compute resources
- ET-CAP-003 (Model) â€” each Model invocation consumes Budget at a measurable rate

**Target Entity Types:**
- ET-RES-001 (Resource) â€” general Resource depletion
- ET-RES-002 (Budget) â€” financial budget depletion (primary target for Model CONSUMES)
- ET-RES-003 (Resource Pool) â€” shared pool capacity depletion

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_CONSUMED_BY

**Evidence Obligation:** YES
**Evidence Rule:** Every CONSUMES event must produce a Consumption Record (ET-RES-004) persisted to the database. Console-only logging is constitutionally insufficient. The Consumption Record must identify the consuming entity, the Resource type, the amount consumed, the Capability that caused the consumption, and the budget period affected.

**Constraints:**
- A CONSUMES event that would cause a Budget to exceed its `governing_limit` must be rejected
- Every Model invocation must produce a corresponding CONSUMES for the Budget entity
- CONSUMES relationships must be persisted synchronously with the operation that triggers them
- Consumption Records produced by CONSUMES must be immutable once created

**Known Implementation State:**
This is the most critical unimplemented relationship type in the current codebase. Every Model invocation is a CONSUMES event with measurable financial cost. lib/consumption-log.js logs CONSUMES events to console only â€” no Consumption Records are persisted to the database. The $2 per-call limit and $500/month Council cap cannot be programmatically enforced. Constitution-v1.md Art. 2 violation is structural and ongoing. ARCH-10 and ARCH-06 must specify the implementation of database-persisted Consumption Records.

**Distinguishing from Adjacent Types:**
CONSUMES must be distinguished from WRITES (RT-DAT-002). WRITES is a data modification operation. CONSUMES is a resource depletion operation. When a Model invocation occurs, it CONSUMES Budget (resource depletion) and may also WRITES to Memory (data modification). These are two different architectural facts about the same operation.

---

## Section 9 â€” Knowledge Relationships (RT-KNW)

The Knowledge group contains the four Relationship Types that govern the Civilisation's learning, reflection, and knowledge generation processes. These types form the intelligence loop: an Agent EXECUTES a Task, the Task PRODUCES a Reflection, the Reflection REFLECTS_ON its source experiences and GENERATES Lessons, and the Agent LEARNS_FROM those Lessons in subsequent Tasks. Additionally, Services GENERATE Observations and Metrics as natural by-products of monitoring, and Observations CAPTURES specific operational facts before validation into Evidence.

---

### RT-KNW-001 â€” LEARNS_FROM

**Definition:** LEARNS_FROM asserts that an Agent has incorporated the insight of a Lesson into its operational knowledge, influencing future behaviour. LEARNS_FROM is the knowledge acquisition relationship â€” it establishes the connection between a synthesised insight and the Agent whose future behaviour is shaped by incorporating it. The `_lessonBuffer[50]` limit in obsidian-memory.js limits how many Lessons may influence a given processing batch; SHA-1 deduplication prevents the same lesson text from being incorporated multiple times.

**Semantic Role:** LEARNS_FROM captures the knowledge acquisition event â€” the moment when a Lesson's insight crosses from the Knowledge domain into the Agent's operational context. This closes the intelligence loop: execution produces experience, reflection extracts insight, LEARNS_FROM incorporates that insight into future execution.

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents are the only entities that may LEARNS_FROM Lessons

**Target Entity Types:**
- ET-KNW-002 (Lesson) â€” Lessons are the only valid targets

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_LEARNED_FROM_BY

**Evidence Obligation:** NO
**Evidence Rule:** The Lesson entity is the evidence artifact. The LEARNS_FROM relationship is navigational.

**Constraints:**
- An Agent may not LEARNS_FROM a Lesson in SUPERSEDED or ARCHIVED state
- SHA-1 deduplication must prevent an Agent from LEARNS_FROM the same lesson content more than once per operational cycle
- LEARNS_FROM must reference a Lesson causally connected to the Agent's operational domain

**Known Implementation State:**
LEARNS_FROM is operationally present through obsidian-memory.js (logLesson, _lessonBuffer[50] cap, _lessonHashes[200] SHA-1 dedup) and reflection-engine.js (scoreLessonText four-dimension evaluation). The intelligence loop functions operationally. However, LEARNS_FROM relationship instances are not formally registered as persistent relationship records in ARCH-14.

**Distinguishing from Adjacent Types:**
LEARNS_FROM must be distinguished from REFLECTS_ON (RT-KNW-002). REFLECTS_ON is the analytical attention relationship directing examination at past Memory Records to extract insights. LEARNS_FROM is the knowledge acquisition relationship incorporating an already-extracted Lesson. REFLECTS_ON precedes Lesson creation; LEARNS_FROM follows it.

---

### RT-KNW-002 â€” REFLECTS_ON

**Definition:** REFLECTS_ON asserts that an Agent or Reflection entity has performed structured analytical examination of specific Memory Records or Agent Tasks in order to extract insights. REFLECTS_ON is the reflective attention relationship establishing which past experiences are the subject of the reflection process. The Reflection produced by this process constitutes the evidence artifact.

**Semantic Role:** REFLECTS_ON captures the analytical attention relationship â€” the fact that a reflection process has been directed at specific past experiences. This is architecturally distinct from READS (data access without analysis) and LEARNS_FROM (incorporation of synthesised insight).

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents initiate reflection by directing analytical attention to past experiences
- ET-KNW-008 (Reflection) â€” Reflection entities reflect on the Memory Records or Tasks that constitute their analytical basis

**Target Entity Types:**
- ET-KNW-001 (Memory Record) â€” past experiences and knowledge records are the primary subjects of reflection
- ET-OPS-002 (Agent Task) â€” completed Agent Tasks may be the subject of reflection

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** IS_REFLECTED_ON_BY

**Evidence Obligation:** YES
**Evidence Rule:** The Reflection entity produced by the REFLECTS_ON process is the evidence artifact. A REFLECTS_ON relationship that produces no Reflection entity is an incomplete reflection process.

**Constraints:**
- A Reflection entity must REFLECTS_ON at least one source Memory Record or Agent Task
- REFLECTS_ON relationships to DECISION-type Memory Records require a valid `memory_id` reference â€” Bug B1 (decisionMemoryId always null) is a specific violation of this constraint
- An Agent may only REFLECTS_ON Memory Records within its Trust Level access scope

**Known Implementation State:**
REFLECTS_ON is operationally present through reflexion-tracker.js and reflection-engine.js. However, Bug B1 (reflexion-tracker: `decisionMemoryId` always null â€” queries column `'id'` instead of `'memory_id'`) means REFLECTS_ON relationships between Reflections and DECISION-type Memory Records cannot be established. The column query defect severs this specific link, meaning the Civilisation cannot reflect on its decisions â€” the most valuable category of reflective experience. ARCH-10 must specify the corrected column query.

**Distinguishing from Adjacent Types:**
REFLECTS_ON must be distinguished from READS (RT-DAT-001). READS is data access: an entity reads content from a store to use it. REFLECTS_ON is analytical attention: an entity subjects specific past experiences to structured analysis to extract insights. Reading is consumption; reflecting is analysis.

---

### RT-KNW-003 â€” GENERATES

**Definition:** GENERATES asserts that the source entity's ongoing operational process has produced a knowledge or observability artifact as a natural by-product of its functioning. GENERATES differs from PRODUCES: PRODUCES concerns the creation of formal operational output entities with explicit lifecycle governance; GENERATES concerns knowledge artifacts that emerge naturally from system operation.

**Semantic Role:** GENERATES captures the natural knowledge production relationship â€” the emergence of insights, measurements, and perceptions from operational processes. Without GENERATES relationships, there are no Observations to validate into Evidence, no Metrics to inform governance, and no Lessons to incorporate through LEARNS_FROM.

**Source Entity Types:**
- ET-KNW-008 (Reflection) â€” Reflections generate Lessons as their primary output artifact
- ET-SVC-001 (Service) â€” Services generate Observations and Metrics as natural by-products of monitoring
- ET-OPS-002 (Agent Task) â€” Agent Tasks generate Evidence Records and Reflections on completion

**Target Entity Types:**
- ET-KNW-002 (Lesson) â€” Reflections generate Lessons through the scoreLessonText evaluation
- ET-KNW-006 (Observation) â€” monitoring Services generate Observations of operational state
- ET-KNW-007 (Metric) â€” monitoring Services generate Metrics from aggregated operational data
- ET-KNW-004 (Evidence Record) â€” governance events generate Evidence Records

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** IS_GENERATED_BY

**Evidence Obligation:** NO
**Evidence Rule:** The generated artifact is itself the knowledge record. GENERATES is the relationship by which these artifacts come into existence; the artifacts carry their own governance obligations once created.

**Constraints:**
- GENERATES relationships to Metric targets must be backed by a MEASURES relationship
- A disabled or DEGRADED Service may not GENERATES valid knowledge artifacts
- GENERATES relationships for Lessons must trace through a Reflection entity

**Known Implementation State:**
health/monitor.js GENERATES Observations through recordProviderCall, recordRetrievalCall, recordReflexionWrite, and recordPolicyRetrieval â€” four confirmed GENERATES targets. The telemetry/aggregator.js health snapshot generation is DISABLED (DATA-5), meaning the GENERATES relationship between the aggregator Service and Metric entities is defined but not operational. ARCH-08 must reactivate the disabled aggregator GENERATES pipeline.

**Distinguishing from Adjacent Types:**
GENERATES must be distinguished from PRODUCES (RT-DAT-003). PRODUCES is the formal creation of a governed entity with an Identity, Lifecycle, and Registry obligation. GENERATES is the natural emergence of knowledge artifacts from operational activity. A Reflection GENERATES Observations (natural outputs) and PRODUCES Lessons (formal entities).

---

### RT-KNW-004 â€” CAPTURES

**Definition:** CAPTURES asserts that an Observation entity has recorded a specific operational fact or occurrence at a specific point in time. CAPTURES is the perception-to-record relationship connecting an Observation entity to the specific state or occurrence it documents. An Observation that has been VALIDATED becomes an Evidence Record; before validation, it CAPTURES a raw, unverified fact.

**Semantic Role:** CAPTURES captures the perception event â€” the moment when an operational fact is registered in an Observation entity. This is the first step in the constitutional traceability chain: system state occurs, monitoring perceives it, the Observation CAPTURES it, validation elevates it to Evidence.

**Source Entity Types:**
- ET-KNW-006 (Observation) â€” Observations are the entities that capture operational facts; each Observation CAPTURES exactly one fact

**Target Entity Types:**
- Operational state or occurrence â€” the specific fact being captured; ARCH-08 will formalise the observation target model

**Source Cardinality:** ONE
**Target Cardinality:** ONE

**Inverse Name:** IS_CAPTURED_BY

**Evidence Obligation:** NO
**Evidence Rule:** Observations are pre-evidence artifacts. The Evidence Record produced after validation is the evidence.

**Constraints:**
- Each Observation may CAPTURES exactly one fact
- An Observation's CAPTURES target must be identifiable and attributable
- An Observation in DISCARDED state has had its CAPTURES relationship invalidated

**Known Implementation State:**
health/monitor.js produces Observations through its four recording functions, each CAPTURES one category of operational fact. The Observation entities are currently held in the `_state` in-memory structure rather than as persisted entities. CAPTURES relationships are transient â€” they exist during the process lifetime but are not persisted for audit traversal. ARCH-08 must specify the persistence requirements for Observation entities and their CAPTURES relationships.

**Distinguishing from Adjacent Types:**
CAPTURES must be distinguished from MEASURES (RT-OBS-003). CAPTURES is the registration of a specific occurrence or state value at a specific moment â€” a per-event relationship. MEASURES is the structural definition-time relationship connecting a Metric to what it quantifies â€” a persistent schema relationship. A Metric MEASURES Queue depth; an Observation CAPTURES the specific value at a specific time.

---

## Section 10 â€” Observability Relationships (RT-OBS)

The Observability group contains the four Relationship Types that govern the Civilisation's awareness of its own operational state. OBSERVES establishes structured monitoring relationships for specific attributes. MONITORS is the comprehensive continuous health responsibility. MEASURES connects Metrics to their measurement subjects. TRACKS is the longitudinal history relationship. Together, these four types provide the architectural infrastructure for the constitutional health monitoring obligations in Art. 7 of constitution-v1.md.

---

### RT-OBS-001 â€” OBSERVES

**Definition:** OBSERVES asserts that a Service or Agent has established a structured monitoring relationship with another entity, such that significant state changes or events in the target are perceived and recorded as Observations. OBSERVES is the continuous structural monitoring relationship persisting for the life of the monitoring arrangement. It is distinct from MONITORS: OBSERVES targets specific attributes or event types; MONITORS is the comprehensive health responsibility across all aspects of the target.

**Semantic Role:** OBSERVES captures the structured perceptual commitment â€” the fact that one entity has taken on the responsibility of noticing and recording specific aspects of another entity's state. This makes targeted observability architecturally explicit and governable.

**Source Entity Types:**
- ET-SVC-001 (Service) â€” Services are the primary observers in the Civilisation's monitoring architecture
- ET-OPS-001 (Agent) â€” Agents may observe specific aspects relevant to their task execution

**Target Entity Types:**
- ET-SVC-001 (Service) â€” Services observe other Services' health states
- ET-OPS-001 (Agent) â€” Services observe Agent execution states
- ET-OPS-005 (Queue) â€” Services observe Queue depth and processing rates
- ET-SVC-004 (Circuit Breaker) â€” Services observe Circuit Breaker state transitions
- ET-CAP-003 (Model) â€” Services observe Model call rates and failure patterns

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_OBSERVED_BY

**Evidence Obligation:** NO
**Evidence Rule:** OBSERVES is the structural setup relationship. The evidence of what is perceived is carried by the Observation entities GENERATED as a result.

**Constraints:**
- An OBSERVES relationship must specify which attributes or event types are being observed
- An entity that has OBSERVES responsibilities must be operational
- OBSERVES relationships targeting constitutionally significant entities require EXECUTIVE-level authority

**Known Implementation State:**
health/monitor.js OBSERVES Provider calls, Retrieval calls, Reflexion writes, and Policy retrievals â€” four confirmed OBSERVES targets. The telemetry snapshot being disabled (DATA-5) means OBSERVES relationships exist structurally but their Metric outputs are not materialised. ARCH-08 must specify the minimum OBSERVES coverage required for constitutional compliance.

**Distinguishing from Adjacent Types:**
OBSERVES must be distinguished from MONITORS (RT-OBS-002). OBSERVES is focused on specific attributes or event types â€” selective perception. MONITORS is comprehensive health awareness encompassing all health aspects of the target. OBSERVES produces targeted Observations; MONITORS produces holistic health assessments.

---

### RT-OBS-002 â€” MONITORS

**Definition:** MONITORS asserts that the source entity maintains ongoing, continuous health awareness of the target entity â€” watching for degradation, failure, or threshold breaches across all health-relevant aspects of the target. MONITORS is the relationship that triggers ESCALATES when health thresholds are breached: a monitoring Service that MONITORS an entity is responsible for producing ESCALATES relationships when that entity's health deteriorates beyond defined thresholds.

**Semantic Role:** MONITORS captures the comprehensive health responsibility relationship. If an entity is designated IS_MONITORED_BY a Service, that Service bears the governance responsibility for detecting and escalating that entity's health failures.

**Source Entity Types:**
- ET-SVC-001 (Service) â€” monitoring Services hold MONITORS responsibilities
- ET-PHY-013 (Dashboard) â€” the Dashboard MONITORS the operational state it displays to the Founder

**Target Entity Types:**
- ET-SVC-001 (Service) â€” Services are monitored for operational health
- ET-KNW-007 (Metric) â€” Metrics are monitored for threshold breaches
- ET-OPS-005 (Queue) â€” Queue depth and processing health is monitored
- ET-RES-002 (Budget) â€” Budget expenditure is monitored against constitutional limits
- ET-SVC-004 (Circuit Breaker) â€” Circuit Breaker state is monitored

**Source Cardinality:** ONE
**Target Cardinality:** MANY

**Inverse Name:** IS_MONITORED_BY

**Evidence Obligation:** NO
**Evidence Rule:** MONITORS is the structural health responsibility relationship. Threshold breach events that produce ESCALATES carry their own evidence obligations.

**Constraints:**
- Every Service entity that participates in constitutional governance must have at least one IS_MONITORED_BY relationship
- A MONITORS relationship carries an implied obligation to ESCALATES when the target's health falls below the defined threshold
- The entity holding MONITORS responsibility must itself be ACTIVE

**Known Implementation State:**
health/monitor.js MONITORS the operational state in the `_state` in-memory structure. The Dashboard MONITORS the operational state via GET /api/operations/status. The Budget MONITORS relationship is architecturally required (constitution-v1.md Art. 2) but not operationally present â€” no entity currently MONITORS the $500/month limit with database-persisted consumption records.

**Distinguishing from Adjacent Types:**
MONITORS must be distinguished from TRACKS (RT-OBS-004). MONITORS is current-state awareness â€” the ongoing perception of whether an entity is healthy right now. TRACKS is historical record-keeping â€” the longitudinal preservation of state values over time. MONITORS triggers ESCALATES when current state crosses a threshold; TRACKS enables trend analysis over historical states.

---

### RT-OBS-003 â€” MEASURES

**Definition:** MEASURES asserts that a Metric entity quantifies a specific attribute of a specific target entity type as its definition-time structural role. MEASURES is the schema relationship connecting the Metric's definition to what that Metric is designed to quantify. At runtime, Metric instances carry the current measured values of their MEASURES target.

**Semantic Role:** MEASURES captures the definition-time connection between a Metric and its measurement subject. A Metric without a MEASURES relationship is an undifferentiated number with no architectural meaning.

**Source Entity Types:**
- ET-KNW-007 (Metric) â€” Metric entities are the only valid sources

**Target Entity Types:**
- Any Entity Type that has quantifiable attributes

**Source Cardinality:** ONE
**Target Cardinality:** ONE

**Inverse Name:** IS_MEASURED_BY

**Evidence Obligation:** NO
**Evidence Rule:** MEASURES is a definition-time structural relationship. No runtime evidence is required.

**Constraints:**
- Each Metric must MEASURES exactly one attribute of one entity type
- A Metric's `metric_type` must be compatible with the attribute being measured
- The entity type that a Metric MEASURES must have threshold attributes defined if the Metric is to trigger ESCALATES

**Known Implementation State:**
health/monitor.js defines four measurement dimensions: providerCalls, retrievalCalls, reflexionWrites, policyRetrievals. The governance score computed by telemetry/aggregator.js is a SCORE-type Metric that MEASURES overall constitutional compliance. The civilization_health_snapshots table is the intended persistence target but the aggregator is currently disabled (DATA-5). ARCH-08 must formalise the MEASURES relationships for all defined Metrics.

**Distinguishing from Adjacent Types:**
MEASURES must be distinguished from CAPTURES (RT-KNW-004). MEASURES is the definition-time schema relationship: this Metric is defined to quantify this attribute. CAPTURES is the per-event relationship: this Observation has recorded this specific value at this specific moment. MEASURES defines what the Metric is about; CAPTURES records what was perceived.

---

### RT-OBS-004 â€” TRACKS

**Definition:** TRACKS asserts that the source entity maintains a longitudinal record of the target entity's state or value over time, enabling historical analysis, trend identification, and regression detection. TRACKS is the temporal persistence relationship. Unlike MONITORS (current-state awareness) and OBSERVES (specific event type targeting), TRACKS is explicitly historical.

**Semantic Role:** TRACKS captures the longitudinal record-keeping relationship â€” the commitment to preserve an entity's state history over time. Without TRACKS relationships, the Civilisation has only a current-state snapshot with no historical context.

**Source Entity Types:**
- ET-SVC-001 (Service) â€” monitoring and data Services maintain longitudinal records of operational entities
- ET-DAT-001 (Registry) â€” Registries track the history of their records over time

**Target Entity Types:**
- ET-OPS-001 (Agent) â€” Agent reputation and performance history is tracked over time
- ET-KNW-007 (Metric) â€” Metric historical values are tracked for trend analysis
- ET-GOV-005 (Certification) â€” Certification history per invariant is tracked for regression detection

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_TRACKED_BY

**Evidence Obligation:** CONDITIONAL
**Evidence Rule:** Evidence is required when TRACKS is applied to constitutional compliance states or governance scores. Standard operational metrics tracking does not require Evidence Records but should produce Observations.

**Constraints:**
- A TRACKS relationship must specify a minimum retention period for historical records
- TRACKS of governance score history must preserve records for the constitutional validity period
- TRACKS must not be established for sensitive personal data without appropriate access controls

**Known Implementation State:**
apex_agent_runs TRACKS Agent execution history â€” each row is a TRACKS instance. civilization_health_snapshots TRACKS governance score â€” currently disabled (DATA-5). The _lessonHashes[200] in obsidian-memory.js implicitly TRACKS Lesson history for deduplication. The TRACKS relationship over Certifications â€” essential for regression detection â€” is not formally established. ARCH-08 must re-enable the civilization_health_snapshots TRACKS pipeline.

**Distinguishing from Adjacent Types:**
TRACKS must be distinguished from MONITORS (RT-OBS-002). MONITORS is the real-time health awareness relationship â€” what is happening right now. TRACKS is the historical record-keeping relationship â€” what has happened over time. The current value comes from MONITORS; the trend analysis comes from TRACKS.

---

## Section 11 â€” Communication Relationships (RT-COM)

The Communication group contains the four Relationship Types that govern the propagation of information, signals, and conditions through the Civilisation. Events are published through EMITS and consumed through RECEIVES. Handlers are registered through RESPONDS_TO to process incoming Events. Critical conditions are propagated upward through ESCALATES. The constitutional 5-minute notification requirement (Art. 7 of constitution-v1.md) is enforced through the ESCALATES â†’ RECEIVES chain. The confirmed silent failure in Slack delivery means this constitutional obligation is currently unenforceable.

---

### RT-COM-001 â€” EMITS

**Definition:** EMITS asserts that the source entity has published an Event to the Event Bus, making that Event available for all registered consumers. EMITS is the event publication relationship. The Event entity carries all information about the occurrence; the EMITS relationship establishes which entity produced the Event and when.

**Semantic Role:** EMITS captures the event publication act â€” the moment when an occurrence is broadcast to the Civilisation. Without EMITS, Events have no traceable origin and the audit trail for event-driven operations is severed.

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents emit lifecycle Events (AGENT_STARTED, AGENT_COMPLETED)
- ET-SVC-001 (Service) â€” Services emit operational Events (MEMORY_STORED, DECISION_RECORDED)
- ET-SVC-005 (Event Bus) â€” the Event Bus may emit meta-events about its own state
- ET-OPS-002 (Agent Task) â€” Agent Tasks emit Events at lifecycle transitions

**Target Entity Types:**
- ET-COM-001 (Event) â€” Events are the only valid targets of EMITS

**Source Cardinality:** MANY
**Target Cardinality:** ONE

**Inverse Name:** IS_EMITTED_BY

**Evidence Obligation:** NO
**Evidence Rule:** The Event entity is the evidence artifact for the occurrence it records. Constitutionally significant Events must have persistence guaranteed â€” setImmediate without persistence is insufficient for these categories.

**Constraints:**
- EMITS may only produce Events of canonical types registered in the Event Type Registry
- An EMITS of a constitutionally significant Event type must guarantee delivery
- The emitting entity's identity must be correctly propagated into the Event's `emitted_by_id` attribute

**Known Implementation State:**
The Event Bus (lib/event-bus.js) dispatches Events via setImmediate with no persistence. Sixteen canonical Event types are confirmed. Because Events are not persisted, EMITS relationships older than the rolling `_log[200]` are lost. CONSTITUTION_EVALUATED, MEMORY_STORED, DECISION_RECORDED and other constitutionally significant Event types are EMITTED with no persistence guarantee. ARCH-11 must specify the persistence requirements for EMITS of constitutionally significant Events.

**Distinguishing from Adjacent Types:**
EMITS must be distinguished from PRODUCES (RT-DAT-003). PRODUCES creates a formal, governed Civilisation entity with its own Identity, Registry Record, and Lifecycle. EMITS publishes an Event â€” a broadcast announcement of an occurrence. An Agent Task PRODUCES an Evidence Record and EMITS an AGENT_COMPLETED Event. The Evidence Record persists with governance obligations; the Event may be lost under current implementation.

---

### RT-COM-002 â€” RECEIVES

**Definition:** RECEIVES asserts that the source entity has subscribed to and received delivery of an Event or Notification. RECEIVES is the consumption end of the EMITS-to-RECEIVES channel. For Events, RECEIVES requires successful delivery to a registered consumer. For Notifications, RECEIVES requires delivery confirmation to the designated recipient. A RECEIVES that fails without retry or fallback is a silent delivery failure.

**Semantic Role:** RECEIVES captures the delivery confirmation relationship â€” the fact that a specific entity has successfully received a specific Event or Notification. For constitutional notifications, RECEIVES is the proof of constitutional compliance.

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents receive Events relevant to their operational context
- ET-SVC-001 (Service) â€” Services receive Events they have subscribed to
- ET-GOV-001 (Founder) â€” the Founder receives critical Notifications within the constitutional 5-minute window

**Target Entity Types:**
- ET-COM-001 (Event) â€” Events are received by their registered consumers
- ET-COM-002 (Notification) â€” Notifications are received by their designated recipients

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_RECEIVED_BY

**Evidence Obligation:** CONDITIONAL
**Evidence Rule:** Evidence is required for Notifications to the Founder (constitution-v1.md Art. 7 requires proof of delivery within 5 minutes). Evidence is also required when RECEIVES of a critical Event triggers a governance-relevant consequence.

**Constraints:**
- A failed RECEIVES for a constitutional Notification must produce an Error Record and trigger ESCALATES
- RECEIVES of a constitutional Notification must produce evidence within 5 minutes of the triggering EMITS
- A RECEIVES may not be claimed for an Event that was never EMITTED

**Known Implementation State:**
The Slack failure in event-consumer.js is silently swallowed â€” when Slack Notification delivery fails, no RECEIVES relationship is produced and no failure evidence is generated. The Founder may not RECEIVES constitutional Notifications without any alert or retry. ARCH-11 must specify mandatory retry logic and delivery confirmation for constitutional Notifications.

**Distinguishing from Adjacent Types:**
RECEIVES must be distinguished from RESPONDS_TO (RT-COM-003). RECEIVES records the delivery event â€” the fact that an entity has successfully received an Event or Notification. RESPONDS_TO records the handler registration â€” the fact that an entity is configured to process Events of a specific type. RESPONDS_TO is structural setup; RECEIVES is runtime delivery confirmation.

---

### RT-COM-003 â€” RESPONDS_TO

**Definition:** RESPONDS_TO asserts that the source entity has a registered handler relationship with a specific Event or Message type, such that when an instance of that type is received, the source entity performs a defined action. RESPONDS_TO is the reaction relationship â€” it connects a consumer entity to the specific Event types it is designed to handle. RESPONDS_TO is established at service initialisation; TRIGGERS activates it at runtime; RECEIVES confirms delivery.

**Semantic Role:** RESPONDS_TO captures the handler registration relationship â€” the structural commitment to process Events of a specific type. Without RESPONDS_TO, event handlers are invisible â€” they exist in code but are not part of the Civilisation's governance model.

**Source Entity Types:**
- ET-SVC-001 (Service) â€” Services register handlers for specific Event types relevant to their domain
- ET-OPS-001 (Agent) â€” Agents may register handlers for Events relevant to their current task context

**Target Entity Types:**
- ET-COM-001 (Event) â€” Services register handlers for specific Event types
- ET-COM-005 (Message) â€” WebSocket handlers respond to specific Message types

**Source Cardinality:** MANY
**Target Cardinality:** MANY

**Inverse Name:** IS_RESPONDED_TO_BY

**Evidence Obligation:** CONDITIONAL
**Evidence Rule:** Evidence is required when the RESPONDS_TO handler's response involves a state change or Resource consumption. A handler that merely logs an Event does not require Evidence.

**Constraints:**
- RESPONDS_TO registrations must be maintained in the Event Registry
- A RESPONDS_TO handler must be idempotent with respect to its Event type
- RESPONDS_TO registrations must survive Service restarts

**Known Implementation State:**
event-consumer.js registers handler functions for specific Event types. ws-handler.js registers handlers for the five WebSocket Message types (subscribe/ping/voice:transcript/agent:status/browser:snapshot). lib/event-bus.js on()/subscribe() calls instantiate RESPONDS_TO relationships. The maxListeners cap of 100 limits RESPONDS_TO registrations per Event type. ARCH-11 must specify the canonical RESPONDS_TO registrations required for operational continuity.

**Distinguishing from Adjacent Types:**
RESPONDS_TO must be distinguished from TRIGGERS (RT-EXE-004). RESPONDS_TO is the static registration: a Service declares it will handle Events of a specific type. TRIGGERS is the dynamic causation: when an Event occurs, it causes handler execution. RESPONDS_TO is the structural setup; TRIGGERS is the runtime occurrence. A TRIGGERS without a corresponding RESPONDS_TO means an Event caused an action through an unregistered handler â€” a governance gap.

---

### RT-COM-004 â€” ESCALATES

**Definition:** ESCALATES asserts that the source entity has transferred a condition, decision, or situation to a higher-authority entity for resolution or awareness, because the condition exceeds the source entity's authority, capacity, or AUTONOMY_LEVEL. ESCALATES is the constitutional upward-delegation relationship. Every ESCALATES event must produce an Audit Record. For critical conditions affecting the Founder, ESCALATES must result in a Notification delivered within 5 minutes (constitution-v1.md Art. 7).

**Semantic Role:** ESCALATES captures the upward referral act â€” the moment when an entity acknowledges that a situation exceeds its authority and transfers responsibility upward. Without ESCALATES, lower-level entities would either act beyond their authority or fail to surface critical conditions.

**Source Entity Types:**
- ET-OPS-001 (Agent) â€” Agents escalate situations that exceed AUTONOMY_LEVEL or authority scope
- ET-SVC-001 (Service) â€” Services escalate health threshold breaches and operational anomalies
- ET-SVC-003 (Gateway) â€” Gateways escalate patterns of DENIES that indicate potential security issues

**Target Entity Types:**
- ET-EXE-002 (Council Member) â€” Council Members are the first tier of escalation for operational matters
- ET-GOV-001 (Founder) â€” the Founder is the escalation target for critical constitutional matters

**Source Cardinality:** ONE
**Target Cardinality:** ONE

**Inverse Name:** IS_ESCALATED_TO

**Evidence Obligation:** YES
**Evidence Rule:** Every ESCALATES event must produce an Audit Record identifying the escalating entity, the target entity, the condition being escalated, and the timestamp. For ESCALATES targeting the Founder, an Audit Record is required and a Notification must be produced and delivered within 5 minutes.

**Constraints:**
- ESCALATES must produce a Notification (ET-COM-002) as its delivery mechanism when targeting the Founder
- ESCALATES must produce an Audit Record regardless of delivery outcome
- An Agent may not ESCALATES to a target at lower authority than itself
- ESCALATES triggered by a governance score below 60 is a constitutional requirement per constitution-v1.md Art. 5

**Known Implementation State:**
alertCritical() in services/slack/index.js is the primary ESCALATES mechanism. The confirmed silent swallowing of Slack failures in event-consumer.js means ESCALATES may fail silently â€” the ESCALATES relationship is produced but the IS_ESCALATED_TO delivery confirmation is absent. The governance score threshold trigger is architecturally required but the telemetry aggregator being disabled (DATA-5) means this threshold cannot be evaluated. ARCH-11 must specify mandatory retry and delivery confirmation for ESCALATES targeting the Founder.

**Distinguishing from Adjacent Types:**
ESCALATES must be distinguished from REPORTS_TO (RT-EXC-004). REPORTS_TO is the ongoing informational accountability relationship â€” a Ministry regularly informs its supervising Council Member of its activities. ESCALATES is an exceptional, urgent referral of a condition requiring higher-authority attention. REPORTS_TO is routine; ESCALATES is exceptional.

---

---

## Section 12 â€” RT-EXC: Executive Relationship Types

This group defines the four Relationship Types that model deliberation, voting, supervision, and upward reporting within the governance executive layer. These types are exclusively inhabited by entities at EXECUTIVE or SOVEREIGN trust levels and represent the highest-authority coordination mechanisms in the ontology.

---

### RT-EXC-001 â€” DELIBERATES_ON

**Definition**
A Governing Body (ET-GOV-002) engages in formal structured consideration of a matter â€” a Proposal (ET-GOV-008), an Issue, or a Policy Instrument (ET-GOV-005) â€” prior to reaching a decision or producing a Vote.

**Semantic Role**
Models the process phase of executive governance: the structured intake, discussion, and analysis of a matter before any binding resolution is reached. Deliberation is non-binding; it precedes and enables VOTES_ON (RT-EXC-002).

**Source Entity Types**
- ET-GOV-002 (Governing Body)

**Target Entity Types**
- ET-GOV-008 (Proposal)
- ET-GOV-005 (Policy Instrument)

**Source Cardinality**
ONE

**Target Cardinality**
MANY

**Inverse Name**
IS_DELIBERATED_BY

**Evidence Obligation**
YES

**Evidence Rule**
A Deliberation Record must be produced documenting: the body convened, the matter(s) deliberated, the quorum status, the deliberation outcome (Proceed to Vote, Defer, Reject Without Vote), and a timestamp. Deliberation Records are append-only and must be stored in the Audit Log layer.

**Constraints**
- A Governing Body may only DELIBERATES_ON matters that fall within its defined mandate scope.
- Deliberation must occur before VOTES_ON for the same matter.
- A matter may not be simultaneously deliberated by two bodies unless one is subordinate and the subordinate body's output feeds into the superior body's deliberation.
- Deliberation of SOVEREIGN-classified matters requires quorum confirmation before the Deliberation Record is finalised.

**Known Implementation State**
Partially implemented. Deliberation events are not consistently distinguished from vote events in the current audit trail. Defect B1 (missing approval trace) affects the completeness of Deliberation Records. Invariant INV-G1 (all governance actions must be recorded) is PARTIALLY ENFORCED.

**Distinguishing from Adjacent Types**
DELIBERATES_ON models process (consideration), while VOTES_ON (RT-EXC-002) models resolution (decision). SUPERVISES (RT-EXC-003) models continuous oversight rather than event-scoped consideration.

---

### RT-EXC-002 â€” VOTES_ON

**Definition**
A Governing Body (ET-GOV-002) or a Member Role (ET-GOV-003) casts a formal vote on a Proposal (ET-GOV-008) or Policy Instrument (ET-GOV-005), producing a binding or advisory resolution.

**Semantic Role**
Models the decision-making act of the executive layer. VOTES_ON is the resolution mechanism â€” it converts deliberation into a directional outcome (approved, rejected, deferred, abstained). Vote outcomes are immutable once recorded.

**Source Entity Types**
- ET-GOV-002 (Governing Body)
- ET-GOV-003 (Member Role)

**Target Entity Types**
- ET-GOV-008 (Proposal)
- ET-GOV-005 (Policy Instrument)

**Source Cardinality**
MANY

**Target Cardinality**
ONE

**Inverse Name**
IS_VOTED_ON_BY

**Evidence Obligation**
YES

**Evidence Rule**
A Vote Record must be produced documenting: the voting entity, the matter voted on, the vote cast (YES / NO / ABSTAIN / NOT PRESENT), the voting weight if applicable, the total vote tally, the quorum threshold, the outcome (PASSED / FAILED / TIED), and an immutable timestamp. Vote Records are cryptographically sealed after production.

**Constraints**
- Only entities with VOTING_MEMBER classification within a Governing Body may cast a binding vote.
- A Member Role may not vote on a matter in which they hold a declared conflict of interest (RECUSED state).
- A vote outcome of TIED must trigger a defined tie-breaking protocol; the protocol used must be recorded.
- A FAILED vote does not prevent re-deliberation after a mandated cooling-off period defined in the governing body's charter.
- AUTONOMY_LEVEL must not bypass the vote gate for matters classified as requiring Governing Body resolution.

**Known Implementation State**
Not enforced. No automated vote-gating exists in the current implementation. AUTONOMY_LEVEL=3 can bypass approval-required paths (INV-E1 PARTIALLY ENFORCED). Defects C01 (approval bypassed), C02 (no vote audit trail), UN01 (undefined quorum logic) are relevant.

**Distinguishing from Adjacent Types**
VOTES_ON produces a binding outcome; DELIBERATES_ON (RT-EXC-001) does not. REPORTS_TO (RT-EXC-004) carries information upward; VOTES_ON produces resolution downward or laterally.

---

### RT-EXC-003 â€” SUPERVISES

**Definition**
A Governing Body (ET-GOV-002), Supervisor Role (ET-GOV-003), or Agent (ET-AGT-001) in a supervisory capacity holds continuous authoritative oversight over a subordinate Agent, Process, or Organisational Unit, with the right to intervene, suspend, or terminate.

**Semantic Role**
Models the ongoing, persistent oversight relationship that carries intervention authority. SUPERVISES is not event-scoped (unlike VOTES_ON) â€” it is a standing relationship that persists across time and spans multiple operational cycles.

**Source Entity Types**
- ET-GOV-002 (Governing Body)
- ET-GOV-003 (Member Role)
- ET-AGT-001 (Agent)

**Target Entity Types**
- ET-AGT-001 (Agent)
- ET-GOV-004 (Organisational Unit)
- ET-PRO-001 (Process)

**Source Cardinality**
ONE

**Target Cardinality**
MANY

**Inverse Name**
IS_SUPERVISED_BY

**Evidence Obligation**
YES

**Evidence Rule**
A Supervision Register entry must exist for each SUPERVISES relationship, documenting: supervisor identity, supervised entity, scope of oversight, intervention authority level, activation date, and any suspension or termination events. Supervision Register entries are reviewed at each governance cycle.

**Constraints**
- A supervisory relationship must not create a circular supervision chain (A supervises B supervises A).
- The supervisor's trust level must be strictly higher than the supervised entity's trust level.
- Intervention authority must be explicitly bounded â€” a supervisor may not exceed their chartered intervention scope.
- Temporary supervision (e.g., acting supervision) must have a defined expiry date in the Supervision Register.
- An Agent may not SUPERVISES itself.

**Known Implementation State**
Partially implemented. Agent-to-Agent supervision exists conceptually but is not formally tracked in a Supervision Register. Defect C08 (missing oversight binding) and C09 (no intervention audit trail) are relevant. Invariant INV-G2 (supervisors must be registered) is NOT ENFORCED.

**Distinguishing from Adjacent Types**
SUPERVISES is continuous and carries intervention rights; DELIBERATES_ON is event-scoped and advisory. GOVERNS (RT-GOV-001) sets the constitutional frame; SUPERVISES operates within that frame at the operational level.

---

### RT-EXC-004 â€” REPORTS_TO

**Definition**
An Agent (ET-AGT-001), Process (ET-PRO-001), or Organisational Unit (ET-GOV-004) submits periodic or triggered status, outcome, or exception reports upward to a supervising entity or Governing Body.

**Semantic Role**
Models the upward information flow obligation in the executive hierarchy. REPORTS_TO is the accountability discharge mechanism â€” entities under supervision fulfil their oversight obligations by reporting. It is distinct from general communication (RT-COM group) because it carries a formal obligation and produces a structured artefact consumed by governance.

**Source Entity Types**
- ET-AGT-001 (Agent)
- ET-PRO-001 (Process)
- ET-GOV-004 (Organisational Unit)

**Target Entity Types**
- ET-GOV-002 (Governing Body)
- ET-GOV-003 (Member Role)
- ET-AGT-001 (Agent in supervisory role)

**Source Cardinality**
MANY

**Target Cardinality**
ONE

**Inverse Name**
RECEIVES_REPORT_FROM

**Evidence Obligation**
YES

**Evidence Rule**
A Report Submission Record must document: the reporting entity, the receiving entity, the report type (Periodic / Triggered / Exception), the reporting period or trigger event, the report content reference (artefact ID), and a timestamp. Failure to submit a required report within the defined cadence must generate an automatic alert to the next supervisory level.

**Constraints**
- An entity must REPORTS_TO every entity that SUPERVISES it.
- Report content must not be altered after submission; amendments require a separate amended report with reference to the original.
- Exception reports must be submitted within a defined SLA from event detection (default: within one operational cycle).
- An entity may not REPORTS_TO an entity at a lower trust level than itself unless explicitly chartered (e.g., peer review mechanisms).

**Known Implementation State**
Not enforced. No structured report submission mechanism exists. Reporting obligations are informally handled via chat or logs. Defects C10 (no periodic reporting mechanism) and UR14 (undefined reporting cadence) are relevant. Invariant INV-G3 (reporting obligations must be tracked) is NOT ENFORCED.

**Distinguishing from Adjacent Types**
REPORTS_TO carries a formal obligation and produces a structured artefact; NOTIFIES (RT-COM-001) is a one-time informational event with no formal artefact requirement. SUPERVISES (RT-EXC-003) is the inverse authority relationship of which REPORTS_TO is the accountability discharge.

---

## Section 13 â€” RT-INT: Intent Relationship Types

This group defines four Relationship Types governing how goal-oriented intent is declared, tracked, fulfilled, and informed. These types connect strategic intent (Objectives, Goals) to operational execution and observational evidence.

---

### RT-INT-001 â€” PURSUES

**Definition**
An Agent (ET-AGT-001), Process (ET-PRO-001), or Organisational Unit (ET-GOV-004) is actively working toward the achievement of an Objective (ET-GOV-006) or Goal, with this pursuit representing the primary operational commitment of that entity in the current cycle.

**Semantic Role**
Models the active commitment relationship between an acting entity and its target intent. PURSUES distinguishes active operational effort from passive awareness or incidental contribution. An entity that PURSUES an Objective bears primary accountability for its progress.

**Source Entity Types**
- ET-AGT-001 (Agent)
- ET-PRO-001 (Process)
- ET-GOV-004 (Organisational Unit)

**Target Entity Types**
- ET-GOV-006 (Objective)
- ET-GOV-007 (Goal â€” if defined in Entity Taxonomy)

**Source Cardinality**
MANY

**Target Cardinality**
ONE

**Inverse Name**
IS_PURSUED_BY

**Evidence Obligation**
YES

**Evidence Rule**
A Pursuit Registration must exist for each PURSUES relationship, documenting: the pursuing entity, the Objective, the commitment start date, the commitment horizon (cycle or date-bounded), and the current progress state (NOT_STARTED / IN_PROGRESS / BLOCKED / COMPLETED / ABANDONED). Progress must be updated at each reporting cycle.

**Constraints**
- An entity may not simultaneously PURSUES more than the maximum pursuit capacity defined in its configuration (default: 3 concurrent Objectives).
- A PURSUES relationship must be established through an explicit PLANNED or APPROVED event â€” passive drift into objective pursuit is not permitted.
- An entity pursuing an Objective must also be authorised to CONTRIBUTES_TO (RT-INT-003) any parent Objective that the target Objective is nested under.
- PURSUES must not be established for a DEPRECATED or SUPERSEDED Objective.

**Known Implementation State**
Not enforced. Objectives are tracked informally. No Pursuit Registration mechanism exists. Invariant INV-I1 (all active objectives must have at least one pursuing entity) is NOT ENFORCED. Defect UR15 (undefined objective assignment protocol) is relevant.

**Distinguishing from Adjacent Types**
PURSUES carries primary accountability; CONTRIBUTES_TO (RT-INT-003) is a supporting role without primary accountability. ACHIEVES (RT-INT-002) marks the terminal completion state of a PURSUES relationship.

---

### RT-INT-002 â€” ACHIEVES

**Definition**
An Agent (ET-AGT-001), Process (ET-PRO-001), or Organisational Unit (ET-GOV-004) has fulfilled the success criteria of an Objective (ET-GOV-006), terminating the active PURSUES relationship and marking the Objective as achieved.

**Semantic Role**
Models the terminal success event in the intent lifecycle. ACHIEVES is an immutable historical record â€” it cannot be retracted, only superseded by a subsequent Objective if the achievement is later determined to be partial or incorrect. ACHIEVES triggers downstream notifications to all entities holding CONTRIBUTES_TO relationships against the same Objective.

**Source Entity Types**
- ET-AGT-001 (Agent)
- ET-PRO-001 (Process)
- ET-GOV-004 (Organisational Unit)

**Target Entity Types**
- ET-GOV-006 (Objective)

**Source Cardinality**
ONE

**Target Cardinality**
ONE

**Inverse Name**
IS_ACHIEVED_BY

**Evidence Obligation**
YES

**Evidence Rule**
An Achievement Record must be produced documenting: the achieving entity, the Objective, the evidence artefacts demonstrating fulfilment of each success criterion, the assessment authority (entity that certified the achievement), and an immutable timestamp. Achievement Records must be approved by the supervising entity before the Objective is formally transitioned to ACHIEVED state.

**Constraints**
- ACHIEVES may only be asserted when all defined success criteria for the Objective are met.
- The asserting entity must hold an active PURSUES relationship against the target Objective.
- Achievement must be certified by an entity with authority level equal to or higher than the Objective's classification level.
- Partial achievement must be recorded as a new Objective (a successor) rather than a modified ACHIEVES record.
- Once an Objective is in ACHIEVED state, it may not be transitioned back to IN_PROGRESS.

**Known Implementation State**
Not enforced. No formal achievement certification mechanism exists. Objective completion is tracked informally in task notes. Defect DATA-5 (no completion audit trail) is relevant.

**Distinguishing from Adjacent Types**
ACHIEVES is the terminal state of PURSUES; it is a historical fact rather than an ongoing commitment. CONTRIBUTES_TO (RT-INT-003) supports without necessarily triggering achievement. INFORMS (RT-INT-004) supplies evidence to but does not produce the achievement itself.

---

### RT-INT-003 â€” CONTRIBUTES_TO

**Definition**
An Agent (ET-AGT-001), Process (ET-PRO-001), Data Asset (ET-DAT-001), or Knowledge Asset (ET-KNW-001) provides meaningful supporting input toward the achievement of an Objective (ET-GOV-006), without bearing primary accountability for that Objective's completion.

**Semantic Role**
Models the supporting, non-accountable contribution relationship. CONTRIBUTES_TO enables network effects in goal achievement â€” multiple entities can contribute to a single Objective without each bearing the full primary responsibility that PURSUES implies. It is the correct type for incidental, partial, or enabling contributions.

**Source Entity Types**
- ET-AGT-001 (Agent)
- ET-PRO-001 (Process)
- ET-DAT-001 (Data Asset)
- ET-KNW-001 (Knowledge Asset)

**Target Entity Types**
- ET-GOV-006 (Objective)

**Source Cardinality**
MANY

**Target Cardinality**
ONE

**Inverse Name**
RECEIVES_CONTRIBUTION_FROM

**Evidence Obligation**
CONDITIONAL

**Evidence Rule**
If the contributing entity is at OPERATIONAL trust level or above, a Contribution Record must document: the contributing entity, the Objective, the nature of contribution (artefact reference, service provided, capability enabled), and the contribution period. For TASK-level entities, Contribution Records are optional but recommended.

**Constraints**
- A CONTRIBUTES_TO relationship does not grant the contributing entity authority to alter the Objective definition or success criteria.
- The contributing entity must have at least READ access to the Objective's scope definition.
- A CONTRIBUTES_TO relationship must not be used as a substitute for PURSUES when primary accountability is required.
- Contribution must be scoped to the current pursuit cycle; cross-cycle contributions require re-registration.

**Known Implementation State**
Not enforced. No formal contribution tracking exists. Contributions are implicit in task completion records. Invariant INV-I2 (all contributions to active objectives must be registered) is NOT ENFORCED.

**Distinguishing from Adjacent Types**
CONTRIBUTES_TO is a supporting role; PURSUES bears primary accountability. INFORMS (RT-INT-004) provides information flow rather than direct contribution to outcome. PRODUCES (RT-DAT-001) creates artefacts that may then CONTRIBUTES_TO an Objective, but the two steps are distinct.

---

### RT-INT-004 â€” INFORMS

**Definition**
An Observation (ET-OBS-001), Knowledge Asset (ET-KNW-001), Data Asset (ET-DAT-001), or Report (ET-COM-001) provides evidential or contextual input that influences the formulation, refinement, or evaluation of an Objective (ET-GOV-006), Policy Instrument (ET-GOV-005), or Decision.

**Semantic Role**
Models the evidence-to-intent pipeline. INFORMS captures the epistemic dependency â€” how observational and knowledge inputs shape what is decided and what is pursued. It is the canonical type for connecting the observability layer (RT-OBS group) to the governance and intent layers.

**Source Entity Types**
- ET-OBS-001 (Observation)
- ET-KNW-001 (Knowledge Asset)
- ET-DAT-001 (Data Asset)
- ET-COM-001 (Communication / Report)

**Target Entity Types**
- ET-GOV-006 (Objective)
- ET-GOV-005 (Policy Instrument)
- ET-GOV-008 (Proposal)

**Source Cardinality**
MANY

**Target Cardinality**
MANY

**Inverse Name**
IS_INFORMED_BY

**Evidence Obligation**
CONDITIONAL

**Evidence Rule**
If an INFORMS relationship is used to support a governance decision (Policy Instrument or Proposal), the informing artefact must be versioned, timestamped, and referenced by ID in the Decision Record. For Objective refinement, a lightweight reference (artefact ID + observation date) is sufficient.

**Constraints**
- An INFORMS relationship must reference a specific version of the informing artefact â€” unversioned or mutable artefacts may not be used as governance evidence.
- The informing artefact must pre-date the decision it informs.
- A single Decision or Objective must not be informed by fewer than the minimum evidence count defined in the governing Policy Instrument.
- Conflicting INFORMS relationships (informing artefacts that contradict each other) must be explicitly reconciled in the Decision Record.

**Known Implementation State**
Not enforced. The link between observations/reports and governance decisions is implicit and untracked. Defect INV-F1 (no evidence-to-decision traceability) is relevant. Invariant INV-I3 (decisions must have documented evidential basis) is NOT ENFORCED.

**Distinguishing from Adjacent Types**
INFORMS provides epistemic input but does not carry accountability or commitment. CONTRIBUTES_TO (RT-INT-003) provides direct operational contribution. PRODUCES (RT-DAT-001) creates an artefact that may subsequently INFORMS a decision, but the creation and the informing are distinct relationships.

---

## Section 14 â€” RT-IDN: Identity and Trust Relationship Types

This group defines the three Relationship Types governing how entities establish, verify, and hold identity and trust within the APEX Civilisation ontology. These types underpin all access control, delegation validity, and audit attribution.

---

### RT-IDN-001 â€” IDENTIFIES

**Definition**
An Identity Provider (ET-IDN-001) or Credential (ET-IDN-002) asserts the identity of an Agent (ET-AGT-001), Human Principal (ET-GOV-003), or Service (ET-PHY-003), binding a verifiable identifier to that entity.

**Semantic Role**
Models the authoritative identity binding act. IDENTIFIES is the root relationship from which all access control flows â€” an entity that cannot be identified cannot be granted trust, cannot act on behalf of another, and cannot be held accountable in audit records. IDENTIFIES must precede AUTHENTICATES (RT-IDN-002).

**Source Entity Types**
- ET-IDN-001 (Identity Provider)
- ET-IDN-002 (Credential)

**Target Entity Types**
- ET-AGT-001 (Agent)
- ET-GOV-003 (Member Role / Human Principal)
- ET-PHY-003 (Service)

**Source Cardinality**
ONE

**Target Cardinality**
ONE

**Inverse Name**
IS_IDENTIFIED_BY

**Evidence Obligation**
YES

**Evidence Rule**
An Identity Binding Record must be produced documenting: the identity provider, the identifier issued, the target entity, the identity assurance level (IAL-1 / IAL-2 / IAL-3), the binding timestamp, and the expiry date if applicable. Identity Binding Records are immutable after creation; revocation is recorded as a separate event.

**Constraints**
- An entity may hold at most one authoritative identifier per Identity Provider.
- An entity may hold identifiers from multiple Identity Providers only if a federation agreement exists between those providers.
- IDENTIFIES must not be established for an entity in DEPRECATED or TERMINATED lifecycle state.
- The Identity Provider must itself be registered and active in the Identity Provider Registry before it may IDENTIFIES any entity.
- Self-identification (an entity IDENTIFIES itself) is explicitly prohibited.

**Known Implementation State**
Partially implemented. Identity binding exists via authentication provider integration, but the Identity Binding Record is not produced or retained in the current implementation. Defect INV-B1 (no identity audit trail) is relevant. IAL classification is not implemented.

**Distinguishing from Adjacent Types**
IDENTIFIES creates the binding; AUTHENTICATES (RT-IDN-002) verifies it per session or operation. IS_HELD_BY (RT-IDN-003) tracks which entity holds which credential. IDENTIFIES is the root; the other two presuppose it.

---

### RT-IDN-002 â€” AUTHENTICATES

**Definition**
A Credential (ET-IDN-002) or Authentication Service (ET-IDN-001) verifies the claimed identity of an Agent (ET-AGT-001) or Human Principal (ET-GOV-003) at the point of access or action initiation, producing a session token or authentication assertion.

**Semantic Role**
Models the per-session or per-operation identity verification event. AUTHENTICATES is a point-in-time assertion â€” it does not permanently bind identity (that is IDENTIFIES) but confirms the claimed identity is valid at the moment of access. Every privileged action must be preceded by a valid AUTHENTICATES event.

**Source Entity Types**
- ET-IDN-002 (Credential)
- ET-IDN-001 (Authentication Service)

**Target Entity Types**
- ET-AGT-001 (Agent)
- ET-GOV-003 (Member Role / Human Principal)

**Source Cardinality**
MANY

**Target Cardinality**
ONE

**Inverse Name**
IS_AUTHENTICATED_BY

**Evidence Obligation**
YES

**Evidence Rule**
An Authentication Event Record must be produced for every authentication attempt (successful or failed), documenting: the authenticating credential or service, the target entity, the outcome (SUCCESS / FAILURE / CHALLENGE), the authentication method, the session token issued (if SUCCESS), the source context (IP, device fingerprint, etc.), and an immutable timestamp.

**Constraints**
- A failed authentication attempt must trigger a progressive lockout policy after exceeding the defined threshold (default: 5 consecutive failures).
- An Authentication Event Record must reference the Identity Binding Record (from IDENTIFIES) to establish the chain of trust.
- Authentication tokens must have a defined expiry; indefinite tokens are prohibited.
- Re-authentication must be required for operations classified at SOVEREIGN or EXECUTIVE trust level, regardless of existing session state.
- Authentication of a SUSPENDED entity must fail and trigger an alert to the supervising entity.

**Known Implementation State**
Partially implemented. Session authentication exists but Authentication Event Records are incomplete. Failed authentication lockout is not consistently enforced. Defect C13 (incomplete session audit trail) and INV-B1 (no identity audit trail) are relevant.

**Distinguishing from Adjacent Types**
AUTHENTICATES is event-scoped (per session or operation); IDENTIFIES is a persistent binding. IS_HELD_BY (RT-IDN-003) tracks credential possession, which is a prerequisite for AUTHENTICATES but distinct from the authentication act itself.

---

### RT-IDN-003 â€” IS_HELD_BY

**Definition**
A Credential (ET-IDN-002) â€” such as a key pair, token, certificate, or biometric factor â€” is possessed and controlled by a specific Agent (ET-AGT-001) or Human Principal (ET-GOV-003), establishing that entity's exclusive right to use that credential for authentication.

**Semantic Role**
Models the possession relationship between credentials and principals. IS_HELD_BY establishes exclusive custody â€” a credential held by one principal may not be simultaneously held by another without explicit credential-sharing authorisation (which itself is a chartered exception requiring approval). It enables credential lifecycle management: issuance, rotation, revocation, and transfer.

**Source Entity Types**
- ET-IDN-002 (Credential)

**Target Entity Types**
- ET-AGT-001 (Agent)
- ET-GOV-003 (Member Role / Human Principal)

**Source Cardinality**
ONE

**Target Cardinality**
ONE

**Inverse Name**
HOLDS

**Evidence Obligation**
YES

**Evidence Rule**
A Credential Custody Record must exist for each IS_HELD_BY relationship, documenting: the credential identifier, the holding entity, the issuance date, the expiry date, the custody transfer history (if any), and the current custody state (ACTIVE / SUSPENDED / REVOKED / TRANSFERRED). Custody Records are updated on each state transition.

**Constraints**
- A Credential may be held by exactly one principal at any time; shared custody is prohibited unless a Shared Custody Exception is chartered and recorded.
- Transfer of credential custody requires an explicit Transfer Event Record with approval from the supervising entity.
- A REVOKED credential may not be re-issued to the same or a different entity without a fresh IDENTIFIES binding.
- Credential rotation must produce a new IS_HELD_BY record and revoke the prior credential simultaneously â€” there must be no window during which both old and new credentials are simultaneously ACTIVE.
- IS_HELD_BY must not be established for a credential whose Identity Binding Record (IDENTIFIES) has expired or been revoked.

**Known Implementation State**
Not enforced. No Credential Custody Records exist. Credential rotation is manual and untracked. Defects INV-B1 (no identity audit trail) and C03 (no credential lifecycle management) are relevant. Invariant INV-D1 (credentials must have traceable custody) is NOT ENFORCED.

**Distinguishing from Adjacent Types**
IS_HELD_BY is a static possession relationship; AUTHENTICATES (RT-IDN-002) is the dynamic verification event that uses the held credential. IDENTIFIES (RT-IDN-001) creates the binding between identity provider and entity; IS_HELD_BY tracks which entity has the physical or logical token enabling that identity to be asserted.

---

---

## Section 15 â€” Cross-Cutting Relationship Constraints and Invariants

This section defines the invariants that apply across the entire Relationship Ontology â€” constraints that are not specific to a single Relationship Type but govern the integrity of the relationship graph as a whole. Each invariant is stated as a testable assertion, assigned a unique invariant identifier (INV-R-NNN), and annotated with its current enforcement state.

---

### INV-R-001 â€” Directionality is Non-Reversible

**Statement**: Every Relationship Type has a fixed source and target direction. A relationship may not be stored or traversed in the inverse direction and treated as the same relationship. The inverse direction is a distinct named relationship (the Inverse Name field) and must be treated as a separate logical assertion if required.

**Rationale**: Bidirectional conflation produces circular reasoning in impact analysis and breaks cardinality constraints.

**Enforcement State**: PARTIALLY ENFORCED. The modelling tool enforces direction, but some runtime graph queries traverse relationships bidirectionally without distinguishing inverse semantics.

---

### INV-R-002 â€” Cardinality Must Be Respected at Instance Level

**Statement**: For every Relationship Type with a ONE source or ONE target cardinality, no instance of that relationship may be created in the live graph that would violate the cardinality bound. Specifically: if a source entity already participates in a ONE-source relationship of type R, no second instance of R may be created from that same source entity until the first is terminated.

**Rationale**: Cardinality violations produce ambiguous ownership, ambiguous accountability, and split authority chains that cannot be resolved deterministically.

**Enforcement State**: NOT ENFORCED. Cardinality is defined in this document but not enforced at the storage or API layer. Multiple conflicting relationships of the same type can currently exist for the same source entity.

---

### INV-R-003 â€” Evidence Obligations Are Not Optional for YES-Obligation Types

**Statement**: For any Relationship Type with Evidence Obligation = YES, the required Evidence Record must be produced at the moment the relationship instance is created. A relationship instance of an evidence-obligated type may not exist in the graph without a corresponding Evidence Record in the Audit Log. The absence of an Evidence Record for a YES-obligation relationship is a Category A compliance violation.

**Rationale**: Relationships without evidence are legally and operationally unverifiable. They cannot be used to support governance decisions, delegation chains, or audit trails.

**Enforcement State**: NOT ENFORCED. Evidence Records are not consistently produced. The Audit Log is incomplete for most Relationship Types that carry YES obligations.

---

### INV-R-004 â€” Trust Level Monotonicity in Authority Chains

**Statement**: In any authority chain composed of GOVERNS (RT-GOV-001), DELEGATES_TO (RT-GOV-002), or SUPERVISES (RT-EXC-003) relationships, the trust level of each successive entity in the chain must be equal to or lower than the trust level of the preceding entity. Authority may not escalate through a chain.

**Rationale**: Trust escalation through delegation is the canonical privilege escalation attack vector. Monotonicity ensures that a TASK-level entity cannot acquire SOVEREIGN-level authority by traversing a delegation chain.

**Enforcement State**: NOT ENFORCED. Trust levels are not consistently checked when delegation chains are established or traversed.

---

### INV-R-005 â€” No Self-Relationships Except Where Explicitly Permitted

**Statement**: An entity may not be both the source and target of the same Relationship Type instance, except for Relationship Types that explicitly permit self-relationships. No Relationship Type in this ontology permits self-relationships. Therefore, for all 50 Relationship Types, source entity and target entity must be distinct entity instances.

**Rationale**: Self-relationships produce logical contradictions in ownership, supervision, and accountability. An entity that governs itself, delegates to itself, or identifies itself cannot be held externally accountable.

**Enforcement State**: PARTIALLY ENFORCED. Some API endpoints check for self-reference; others do not.

---

### INV-R-006 â€” Deprecated and Terminated Entities May Not Participate as Source in New Relationships

**Statement**: An entity in DEPRECATED or TERMINATED lifecycle state may not be established as the source of a new Relationship Type instance. Existing relationship instances where such an entity is the source must be transitioned to a TERMINATED or SUSPENDED state within one governance cycle of the entity's lifecycle state change.

**Rationale**: Deprecated or terminated entities have no active operational standing. Relationships sourced from them produce phantom authority and phantom accountability.

**Enforcement State**: NOT ENFORCED. Lifecycle state is not checked before new relationships are created.

---

### INV-R-007 â€” Delegation May Not Exceed Grantor Authority

**Statement**: In any DELEGATES_TO (RT-GOV-002) or AUTHORISES (RT-GOV-003) relationship, the set of permissions, scope, and trust level delegated to the target entity must be a strict subset of the permissions, scope, and trust level held by the source entity at the time of delegation. A delegating entity may not grant what it does not itself hold.

**Rationale**: Authority inflation through delegation is equivalent to privilege escalation. This constraint closes the delegation amplification attack surface.

**Enforcement State**: NOT ENFORCED. Delegation scope is not validated against grantor scope at delegation time.

---

### INV-R-008 â€” Approval Gates May Not Be Bypassed by Autonomy Configuration

**Statement**: For any Relationship Type transition that requires an APPROVED state (defined by the governing Policy Instrument or the constraints in this document), the AUTONOMY_LEVEL configuration of any Agent may not override or skip that gate. Autonomy level controls initiative and task selection; it does not grant authority to bypass mandatory approval checkpoints.

**Rationale**: AUTONOMY_LEVEL=3 currently creates a de facto bypass of the PLANNEDâ†’APPROVED gate (INV-E1 PARTIALLY ENFORCED). This invariant clarifies the intended boundary: autonomy governs proactivity, not authority level.

**Enforcement State**: PARTIALLY ENFORCED. AUTONOMY_LEVEL=3 agents currently bypass some approval gates. The bypass is a known defect (C01) pending resolution.

---

### INV-R-009 â€” Inverse Relationship Names Are Distinct Logical Assertions

**Statement**: The Inverse Name of a Relationship Type is not an alias â€” it is a distinct logical assertion that must be explicitly instantiated if required. Asserting the forward relationship does not implicitly assert the inverse. Systems that require bidirectional traversal must explicitly store and maintain both directions.

**Rationale**: Implicit inverse derivation introduces consistency risks when relationships are updated or terminated. Explicit storage of both directions enables independent audit and validation.

**Enforcement State**: NOT ENFORCED. Inverse relationships are not stored; they are derived at query time.

---

### INV-R-010 â€” Relationship Instances Must Reference Existing Entity Instances

**Statement**: The source and target of every Relationship Type instance must be entity instances that currently exist in the Entity Registry and are not in a DELETED or PURGED lifecycle state. Orphaned relationship instances (where either endpoint has been deleted) must be detected and resolved within one governance cycle.

**Rationale**: Orphaned relationships corrupt the integrity of the graph and produce unreachable audit chains.

**Enforcement State**: NOT ENFORCED. No orphan detection mechanism exists.

---

### INV-R-011 â€” Vote-Required Matters Must Pass Through DELIBERATES_ON Before VOTES_ON

**Statement**: For any matter classified as requiring formal Governing Body resolution, the DELIBERATES_ON (RT-EXC-001) relationship must be established and its Deliberation Record produced before the VOTES_ON (RT-EXC-002) relationship may be created for the same matter.

**Rationale**: Vote without deliberation is a procedural nullity â€” it cannot produce a legitimate governance outcome. This sequence constraint enforces due process.

**Enforcement State**: NOT ENFORCED. No sequencing check exists between deliberation and vote events.

---

### INV-R-012 â€” Achievement Certification Must Precede ACHIEVED Lifecycle State

**Statement**: An Objective (ET-GOV-006) may not transition to ACHIEVED lifecycle state unless an Achievement Record produced by ACHIEVES (RT-INT-002) exists and has been certified by an authorised entity. The lifecycle state transition and the ACHIEVES relationship instance must be causally linked.

**Rationale**: Objectives marked ACHIEVED without certification produce false progress signals and undermine governance accountability.

**Enforcement State**: NOT ENFORCED. Objectives can be manually marked complete without a corresponding ACHIEVES record.

---

## Section 16 â€” Prohibited Relationship Patterns

This section enumerates relationship graph patterns that are structurally or constitutionally prohibited. The patterns below must be detected and flagged by any conformant implementation of this ontology. Where automated detection is not yet implemented, manual review is required at each governance cycle.

---

### PRO-001 â€” Circular Ownership

**Pattern**: A OWNS (RT-STR-001) B, and B OWNS A â€” directly or through a chain of intermediate OWNS relationships.

**Prohibition Basis**: Circular ownership produces undefined authority resolution, infinite loops in impact analysis, and makes it impossible to determine which entity bears ultimate accountability for the shared resource.

**Detection**: Traverse the OWNS relationship graph from any entity; detect any cycle. Any cycle involving OWNS is prohibited.

**Known Violation Risk**: Medium. Circular ownership can occur when services are decomposed and ownership boundaries are not formally tracked.

---

### PRO-002 â€” Delegation Beyond Grantor Authority (Amplified Delegation)

**Pattern**: Entity A DELEGATES_TO B a scope S, where S is not a strict subset of A's currently held authority.

**Prohibition Basis**: Amplified delegation is privilege escalation. It allows trust and authority to accumulate beyond what the constitutional chain authorises.

**Detection**: At delegation creation, resolve A's authority scope. Verify that every permission in the delegated scope S is contained within A's resolved authority scope. Reject if not.

**Known Violation Risk**: High. No automated scope comparison exists. All delegation is currently unvalidated.

---

### PRO-003 â€” Self-Identification

**Pattern**: An entity IDENTIFIES (RT-IDN-001) itself â€” i.e., an Agent or Principal acts as its own Identity Provider.

**Prohibition Basis**: Self-identification defeats the purpose of the identity layer. An entity that controls its own identity assertion can fabricate any identity it chooses and cannot be externally verified.

**Detection**: For every IDENTIFIES instance, check that source entity instance â‰  target entity instance. Reject if equal.

**Known Violation Risk**: Low. Not a current observed pattern, but the absence of enforcement makes it theoretically possible.

---

### PRO-004 â€” Vote Cast by Non-Voting Member

**Pattern**: An entity VOTES_ON (RT-EXC-002) a matter when that entity does not hold VOTING_MEMBER status within the relevant Governing Body.

**Prohibition Basis**: Non-member votes produce illegitimate resolutions. Governing Body decisions must reflect only the will of chartered voting members.

**Detection**: Before recording a VOTES_ON instance, resolve the voting entity's membership status in the Governing Body chartered to decide the matter. Reject if the entity does not hold VOTING_MEMBER status.

**Known Violation Risk**: Medium. No membership status check exists in the current implementation.

---

### PRO-005 â€” Write Without Authorisation

**Pattern**: An Agent (ET-AGT-001) WRITES_TO (RT-DAT-003) or MODIFIES a Data Asset without an active AUTHORISES (RT-GOV-003) or DELEGATES_TO (RT-GOV-002) relationship granting WRITE permission to that asset.

**Prohibition Basis**: Unauthorised writes violate data integrity and produce unaccountable mutations. Every write must be traceable to an authorisation chain.

**Detection**: Before any WRITES_TO operation is executed, resolve the acting Agent's authorisation graph and confirm that a valid, non-expired WRITE permission exists for the target asset in the target scope.

**Known Violation Risk**: High. Authorisation chains are not resolved before write operations. AUTONOMY_LEVEL=3 agents currently write without explicit per-operation authorisation checks (Defect C01, C09).

---

### PRO-006 â€” Supervision Cycle

**Pattern**: Entity A SUPERVISES B, and B SUPERVISES A â€” directly or through a chain.

**Prohibition Basis**: Circular supervision means neither entity can be held independently accountable. Intervention authority becomes paradoxical â€” each entity can theoretically suspend the other.

**Detection**: Traverse the SUPERVISES graph from any entity; detect any cycle. Any cycle is prohibited.

**Known Violation Risk**: Low to medium. No formal Supervision Register exists, so cycles are theoretically possible in the current untracked state.

---

### PRO-007 â€” Trust Level Escalation Through Inheritance

**Pattern**: An entity acquires a trust level through an INHERITS (RT-STR-002) or EXTENDS (RT-STR-003) relationship that is strictly higher than the trust level of the entity it inherits from or extends.

**Prohibition Basis**: Trust is non-heritable upward. An entity derived from another may not exceed the trust ceiling of its origin entity.

**Detection**: At INHERITS or EXTENDS instantiation, compare the trust levels of source and target. Reject if the inheriting/extending entity's assigned trust level exceeds the source's trust level.

**Known Violation Risk**: Medium. Trust level assignment is currently manual and unvalidated against the inheritance hierarchy.

---

## Section 17 â€” Relationship Type Summary Table

The table below provides a complete summary of all 50 Relationship Types defined in this ontology. Entries are ordered by Group and then by numeric suffix within each Group.

| RT ID | Name | Group | Source Cardinality | Target Cardinality | Evidence Obligation |
|---|---|---|---|---|---|
| RT-GOV-001 | GOVERNS | Governance | ONE | MANY | YES |
| RT-GOV-002 | DELEGATES_TO | Governance | MANY | MANY | YES |
| RT-GOV-003 | AUTHORISES | Governance | ONE | MANY | YES |
| RT-GOV-004 | ENFORCES | Governance | MANY | MANY | YES |
| RT-GOV-005 | MANDATES | Governance | ONE | MANY | YES |
| RT-GOV-006 | SCOPES | Governance | ONE | MANY | NO |
| RT-GOV-007 | SUPERSEDES | Governance | ONE | ONE | YES |
| RT-GOV-008 | CLASSIFIES | Governance | MANY | MANY | CONDITIONAL |
| RT-STR-001 | OWNS | Structure | ONE | MANY | YES |
| RT-STR-002 | INHERITS | Structure | MANY | ONE | NO |
| RT-STR-003 | EXTENDS | Structure | MANY | ONE | CONDITIONAL |
| RT-STR-004 | COMPOSES | Structure | ONE | MANY | NO |
| RT-STR-005 | REFERENCES | Structure | MANY | MANY | NO |
| RT-PHY-001 | DEPLOYED_ON | Physical | MANY | ONE | YES |
| RT-PHY-002 | CONNECTS_TO | Physical | MANY | MANY | NO |
| RT-PHY-003 | HOSTED_BY | Physical | MANY | ONE | YES |
| RT-EXE-001 | EXECUTES | Execution | ONE | MANY | YES |
| RT-EXE-002 | TRIGGERS | Execution | MANY | MANY | CONDITIONAL |
| RT-EXE-003 | SCHEDULED_BY | Execution | MANY | ONE | YES |
| RT-EXE-004 | SPAWNS | Execution | ONE | MANY | YES |
| RT-EXE-005 | WAITS_FOR | Execution | MANY | MANY | NO |
| RT-EXE-006 | TERMINATES | Execution | ONE | MANY | YES |
| RT-EXE-007 | RESUMES | Execution | ONE | ONE | YES |
| RT-DAT-001 | PRODUCES | Data Flow | MANY | MANY | CONDITIONAL |
| RT-DAT-002 | CONSUMES | Data Flow | MANY | MANY | CONDITIONAL |
| RT-DAT-003 | WRITES_TO | Data Flow | MANY | ONE | YES |
| RT-DAT-004 | READS_FROM | Data Flow | MANY | ONE | NO |
| RT-KNW-001 | KNOWS | Knowledge | ONE | MANY | NO |
| RT-KNW-002 | LEARNS_FROM | Knowledge | MANY | MANY | CONDITIONAL |
| RT-KNW-003 | SYNTHESISES | Knowledge | ONE | MANY | YES |
| RT-KNW-004 | APPLIES | Knowledge | MANY | MANY | CONDITIONAL |
| RT-OBS-001 | MONITORS | Observability | MANY | MANY | YES |
| RT-OBS-002 | DETECTS | Observability | MANY | MANY | YES |
| RT-OBS-003 | ALERTS | Observability | ONE | MANY | YES |
| RT-OBS-004 | MEASURES | Observability | MANY | MANY | NO |
| RT-COM-001 | NOTIFIES | Communication | ONE | MANY | CONDITIONAL |
| RT-COM-002 | REQUESTS | Communication | MANY | ONE | YES |
| RT-COM-003 | RESPONDS_TO | Communication | ONE | ONE | CONDITIONAL |
| RT-COM-004 | BROADCASTS | Communication | ONE | MANY | NO |
| RT-EXC-001 | DELIBERATES_ON | Executive | ONE | MANY | YES |
| RT-EXC-002 | VOTES_ON | Executive | MANY | ONE | YES |
| RT-EXC-003 | SUPERVISES | Executive | ONE | MANY | YES |
| RT-EXC-004 | REPORTS_TO | Executive | MANY | ONE | YES |
| RT-INT-001 | PURSUES | Intent | MANY | ONE | YES |
| RT-INT-002 | ACHIEVES | Intent | ONE | ONE | YES |
| RT-INT-003 | CONTRIBUTES_TO | Intent | MANY | ONE | CONDITIONAL |
| RT-INT-004 | INFORMS | Intent | MANY | MANY | CONDITIONAL |
| RT-IDN-001 | IDENTIFIES | Identity/Trust | ONE | ONE | YES |
| RT-IDN-002 | AUTHENTICATES | Identity/Trust | MANY | ONE | YES |
| RT-IDN-003 | IS_HELD_BY | Identity/Trust | ONE | ONE | YES |

**Total Relationship Types: 50**
**Groups: 11**
**YES Evidence Obligation: 30**
**CONDITIONAL Evidence Obligation: 13**
**NO Evidence Obligation: 7**

---

## Section 18 â€” Known Defects in Relationship Coverage

This section catalogues confirmed defects in the current implementation's coverage of the Relationship Types defined in this ontology. Defects are sourced from Phase 2.3 Certification findings and cross-referenced to the Relationship Types they affect.

| Defect Code | Description | RT Affected | Nature | Required Resolution |
|---|---|---|---|---|
| B1 | Missing approval trace for governance actions | RT-GOV-003, RT-GOV-004, RT-EXC-001, RT-EXC-002 | Evidence Record not produced at relationship instantiation | Implement Approval Event Record creation at every AUTHORISES and ENFORCES instantiation; create Deliberation and Vote Records for executive events |
| C01 | AUTONOMY_LEVEL=3 bypasses PLANNEDâ†’APPROVED gate | RT-GOV-003, RT-EXE-001, RT-EXE-004 | Autonomy configuration overrides mandatory approval checkpoint | Enforce INV-R-008: autonomy level must not bypass approval gates; separate autonomy scope from authority scope |
| C02 | No vote audit trail for Governing Body decisions | RT-EXC-002 | Vote Records not produced or stored | Implement Vote Record generation and immutable storage for every VOTES_ON instance |
| C03 | No credential lifecycle management | RT-IDN-003 | IS_HELD_BY instances not tracked; credential rotation unmanaged | Implement Credential Custody Record creation and rotation tracking |
| C08 | Missing oversight binding for agent supervision | RT-EXC-003 | SUPERVISES relationships not registered in a Supervision Register | Create and maintain a Supervision Register; enforce registration at SUPERVISES instantiation |
| C09 | No intervention audit trail for supervisory actions | RT-EXC-003, RT-EXE-006 | Supervisory interventions and termination events not recorded | Produce Supervision Action Record for every intervention, suspension, and termination event |
| C10 | No periodic reporting mechanism | RT-EXC-004 | Report Submission Records not generated; reporting cadence not enforced | Implement Report Submission Record generation and cadence enforcement with alert escalation |
| C13 | Incomplete session audit trail | RT-IDN-002 | Authentication Event Records incomplete; failed attempts not consistently logged | Complete Authentication Event Record implementation; enforce failed attempt logging and lockout |
| DATA-5 | No completion audit trail for objectives | RT-INT-002 | Achievement Records not produced; objective completion is informally tracked | Implement Achievement Record generation with certification step |
| INV-B1 | No identity audit trail | RT-IDN-001, RT-IDN-002, RT-IDN-003 | Identity Binding Records not produced; authentication chain incomplete | Produce Identity Binding Records at IDENTIFIES instantiation; link all AUTHENTICATES events to their binding records |
| INV-F1 | No evidence-to-decision traceability | RT-INT-004 | INFORMS relationships not tracked; decisions lack documented evidential basis | Implement INFORMS instance storage; require evidential artefact references in all Decision Records |
| UN01 | Undefined quorum logic for Governing Body votes | RT-EXC-001, RT-EXC-002 | Quorum thresholds not defined or enforced; vote validity indeterminate | Define quorum thresholds in Governing Body charters; enforce quorum check before VOTES_ON instantiation |
| UR14 | Undefined reporting cadence | RT-EXC-004 | Reporting cadence not specified in governance charters; SLA not enforced | Define reporting cadence in each supervised entity's governance charter; enforce via scheduled trigger |
| UR15 | Undefined objective assignment protocol | RT-INT-001, RT-INT-003 | No Pursuit Registration mechanism; PURSUES relationships established informally | Define and implement Pursuit Registration: explicit assignment, capacity checks, cycle-bound commitments |

---

## Appendix A â€” Relationship Group Reference

| Group Code | Group Name | RT Count | RT IDs |
|---|---|---|---|
| RT-GOV | Governance | 8 | RT-GOV-001 through RT-GOV-008 |
| RT-STR | Structure | 5 | RT-STR-001 through RT-STR-005 |
| RT-PHY | Physical | 3 | RT-PHY-001 through RT-PHY-003 |
| RT-EXE | Execution | 7 | RT-EXE-001 through RT-EXE-007 |
| RT-DAT | Data Flow | 4 | RT-DAT-001 through RT-DAT-004 |
| RT-KNW | Knowledge | 4 | RT-KNW-001 through RT-KNW-004 |
| RT-OBS | Observability | 4 | RT-OBS-001 through RT-OBS-004 |
| RT-COM | Communication | 4 | RT-COM-001 through RT-COM-004 |
| RT-EXC | Executive | 4 | RT-EXC-001 through RT-EXC-004 |
| RT-INT | Intent | 4 | RT-INT-001 through RT-INT-004 |
| RT-IDN | Identity/Trust | 3 | RT-IDN-001 through RT-IDN-003 |
| **TOTAL** | | **50** | |

---

## Appendix B â€” Evidence Obligation Reference

Evidence obligations determine what artefacts must be produced when a Relationship Type instance is created. The following record types are defined by this ontology:

- **Approval Event Record** â€” for RT-GOV-003, RT-GOV-004
- **Delegation Record** â€” for RT-GOV-002
- **Governance Action Record** â€” for RT-GOV-001, RT-GOV-005, RT-GOV-007
- **Deployment Record** â€” for RT-PHY-001, RT-PHY-003
- **Execution Record** â€” for RT-EXE-001, RT-EXE-003, RT-EXE-004, RT-EXE-006, RT-EXE-007
- **Observation Record** â€” for RT-OBS-001, RT-OBS-002, RT-OBS-003
- **Alert Record** â€” for RT-OBS-003
- **Request Record** â€” for RT-COM-002
- **Deliberation Record** â€” for RT-EXC-001
- **Vote Record** â€” for RT-EXC-002
- **Supervision Register Entry** â€” for RT-EXC-003
- **Report Submission Record** â€” for RT-EXC-004
- **Pursuit Registration** â€” for RT-INT-001
- **Achievement Record** â€” for RT-INT-002
- **Identity Binding Record** â€” for RT-IDN-001
- **Authentication Event Record** â€” for RT-IDN-002
- **Credential Custody Record** â€” for RT-IDN-003

All Evidence Records must be stored in the Audit Log layer, must be immutable after creation (amendments produce new records with references to predecessors), and must be retained for the duration defined in the governing Data Retention Policy.

---

## Appendix C â€” Constitutional Basis

The Relationship Types and constraints defined in this ontology derive their authority from the following constitutional provisions:

| Article | Document | Provisions Engaged |
|---|---|---|
| Article 1 | constitution-v1.md | All governance relationships (RT-GOV group) operate under the supreme authority of the constitution |
| Article 3 | constitution-v1.md | Delegation constraints (RT-GOV-002, INV-R-007) enforce the non-amplification principle |
| Article 6 | constitution-v1.md | Evidence obligations (Section 15, INV-R-003) give effect to the transparency mandate |
| Article 7 | constitution-v1.md | Prohibited patterns (Section 16) enforce the integrity and non-manipulation clause |
| Article 8 | constitution-v1.md | Identity and trust relationships (RT-IDN group) implement the identity assurance mandate |
| Article 1 | Scripts/CONSTITUTION.md | All operational agents operate under the constitutional frame established by this article |
| Article 5 | Scripts/CONSTITUTION.md | Safety constraints in prohibited patterns (PRO-003 through PRO-007) give effect to the harm prevention clause |

---

*Document ends.*

*ARCH-02 Relationship Ontology â€” Version 1.0 â€” Phase 3 Architecture Series*
*Prepared under the APEX Civilisation Architecture Programme*
*All 50 Relationship Types are normative. All constraints and invariants are binding on all conformant implementations.*
