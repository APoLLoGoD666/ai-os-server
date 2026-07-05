# ARCH-01 — Entity Taxonomy

**Document ID:** ARCH-01
**Version:** 1.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Phase:** 3.1 — Foundational Architecture
**Immutability:** HIGHLY IMMUTABLE — new Entity Types require EXECUTIVE authority; modification of existing types requires SOVEREIGN authority
**Constitutional basis:** constitution-v1.md (Art. 1, 2, 3, 6) · Scripts/CONSTITUTION.md (Art. 1, 2, 5)
**Depends on:** ARCH-00 (all concepts used herein are defined there)

---

## Section 1 — Purpose and Scope

### 1.1 What This Document Is

This document is the canonical Entity Taxonomy of the APEX Civilisation. It defines the 76 Entity Types that the Civilisation formally recognises as governed architectural objects. An Entity Type is a category definition: it specifies what Properties entities of that class possess, what Lifecycle governs them, what Relationships they may participate in, and what Constraints must always hold for instances of that type.

This document does not describe specific entity instances. It does not name the particular agents running in production, the specific goals the Founder has declared, or the individual memory records held in the persistence layer. Those are instances — governed objects that come into existence when something is registered as conforming to a type defined here. This document defines the types that make those instances possible.

Every entity that the Civilisation creates, governs, audits, or destroys must be of a type declared in this document. An entity whose type is not listed here does not exist in the governed architecture. Its creation does not produce a Registry Record, its lifecycle is not subject to constitutional constraint, and its destruction produces no audit obligation. For the purposes of governance, it does not exist.

### 1.2 Relationship to ARCH-00

ARCH-00 establishes the modelling language used throughout this document. Every structural concept employed here — Entity Type, Attribute, Lifecycle, Relationship, Registry, Source of Truth, Trust Level, Boundary — is defined in ARCH-00 with precision and authority. This document does not redefine those concepts; it applies them to produce a complete taxonomy.

Where this document refers to a concept defined in ARCH-00 (for example, "Registry Record" or "Trust Level"), the ARCH-00 definition is authoritative. Where an apparent conflict exists between ARCH-01 and ARCH-00, ARCH-00 prevails without exception.

### 1.3 Relationship to ARCH-02 (Relationship Ontology)

This document defines the Entity Types that participate in Relationships. ARCH-02, the Relationship Ontology, defines the Relationship Types — the permitted connection patterns between Entity Types. The two documents are complementary and must be read together to understand the full architectural graph of the Civilisation.

Within each Entity Type definition below, a Permitted Relationships section enumerates the Relationship Types in which instances of that type may participate. These enumerations are provisional pending the ratification of ARCH-02. Upon ARCH-02 ratification, any conflict between the relationship listings here and those in ARCH-02 is resolved by ARCH-02.

### 1.4 How to Use This Taxonomy

The Entity Taxonomy is consulted whenever:

- A new object is being considered for creation and its category must be determined
- An existing object's governance regime must be established (who owns it, what authority governs it, where its Source of Truth lives)
- A relationship is to be formed between two objects and the permitted Relationship Types must be checked
- A lifecycle transition is proposed and its validity must be confirmed
- A certification or audit must identify which Entity Type a finding concerns

When a new category of object is proposed that does not match any existing Entity Type, Section 15 governs the admission process for new types.

---

## Section 2 — Classification Scheme

### 2.1 Civilisation Layer vs Physical Layer

All 76 Entity Types defined in this taxonomy are classified as belonging to either the **Civilisation Layer** or the **Physical Layer**.

**Civilisation Layer** Entity Types represent the logical, governance, and operational structure of the APEX Civilisation independent of any specific implementation technology. They are first-class architectural objects governed by the full ARCH series. A Memory Record is a Civilisation Layer entity. It exists architecturally whether it is persisted in a relational database, a document store, or a vault file. The technology that holds it is a separate concern.

**Physical Layer** Entity Types represent the implementation of the Civilisation in a specific technical context. They are governed as implementation artifacts, subject to change as the technical substrate evolves. Their primary relationship to Civilisation Layer entities is via the IMPLEMENTS and DEPLOYS Relationship Types. A database Table that persists Memory Records is a Physical Layer entity. It is governed differently from the Memory Record, owned by different authorities, and carries different audit obligations.

This distinction is architecturally essential. Conflating a Memory Record with the table that stores it is the category error that produces systems where the implementation defines the architecture rather than the architecture governing the implementation.

### 2.2 The Twelve Layers

Entity Types are further organised into twelve Layers within the two primary classifications. Each Layer represents a distinct concern and governance regime.

| Layer | Code | Classification | Purpose |
|-------|------|----------------|---------|
| 1 — Governance | ET-GOV | Civilisation | Entities that define, enforce, and record the rules governing the Civilisation |
| 2 — Executive | ET-EXE | Civilisation | Entities constituting the leadership and governance structure |
| 3 — Operational | ET-OPS | Civilisation | Entities that perform bounded work |
| 4 — Knowledge | ET-KNW | Civilisation | Entities that hold, represent, and preserve information |
| 5 — Intent | ET-INT | Civilisation | Entities representing purpose, planning, and direction |
| 6 — Communication | ET-COM | Civilisation | Entities that transmit information and maintain interaction context |
| 7 — Capability | ET-CAP | Civilisation | Entities that define what the Civilisation can do |
| 8 — Service | ET-SVC | Civilisation | Entities that provide Capabilities to other Entities |
| 9 — Resource | ET-RES | Civilisation | Entities representing finite quantities consumed by Capability invocations |
| 10 — Data Governance | ET-DAT | Civilisation | Entities governing the authority, structure, and provenance of information |
| 11 — Identity | ET-IDN | Civilisation | Entities establishing who things are and what they are permitted to do |
| 12 — Physical | ET-PHY | Physical | Entities representing the implementation of the Civilisation in its technical context |

### 2.3 Naming Conventions

Every Entity Type is assigned a canonical identifier following the format:

**ET-[LAYER_CODE]-[NNN]**

Where:
- `ET` is the universal prefix for Entity Types
- `[LAYER_CODE]` is the three-letter code for the Layer (GOV, EXE, OPS, KNW, INT, COM, CAP, SVC, RES, DAT, IDN, PHY)
- `[NNN]` is a zero-padded three-digit sequence number within the Layer, assigned in the order of definition and never reused

Examples: ET-GOV-001, ET-KNW-003, ET-PHY-012.

Sequence numbers are permanent. When an Entity Type is deprecated, its number is retired — not reassigned. New Entity Types are assigned the next available sequence number within their Layer.

### 2.4 Entity Type Attributes Common to All Types

Every Entity Type defined in this taxonomy, regardless of Layer, carries the following meta-attributes at the type level (these are attributes of the Entity Type definition itself, not of instances):

| Meta-Attribute | Type | Description |
|----------------|------|-------------|
| `entity_type_id` | Identifier | The canonical ET-XXX-NNN identifier |
| `layer` | Enumeration | The Layer this type belongs to |
| `classification` | Enumeration | CIVILISATION or PHYSICAL |
| `lifecycle_states` | List | The ordered set of Lifecycle states |
| `source_of_truth` | Reference | The authoritative Domain for instances |
| `ownership_rule` | Text | Who may own instances of this type |
| `immutability_class` | Enumeration | MUTABLE, APPEND_ONLY, or IMMUTABLE |
| `admission_authority` | Enumeration | The Trust Level required to create instances |

These meta-attributes appear in the Entity Type Registry (an instance of ET-DAT-001) and are inherited by all instances. They are not repeated in each definition below but are implied.

---

## Section 3 — Layer 1: Governance Entity Types

Layer 1 contains the eight Entity Types that define, enforce, and record the rules governing the Civilisation. No work may be performed within the Civilisation without reference to at least one Governance entity — the constitutional and policy framework that authorises that work. Governance entities are immutable or append-only by nature: a Constitution is not edited, it is amended; a Rule is not deleted, it is superseded. This immutability is the architectural expression of the constitutional principle that governance obligations persist and cannot be quietly removed.

All Layer 1 Entity Types are owned at the SOVEREIGN or EXECUTIVE trust level. Instances of these types may only be created, modified, or retired by entities holding the corresponding authority. Any operation that would alter a Governance entity must produce an Evidence Record identifying the authority that authorised the change.

---

### ET-GOV-001 — Founder

**Definition:** The Founder is the singular human principal of the APEX Civilisation — the sovereign entity at the root of all authority, ownership, and trust. There is exactly one Founder. The Founder Entity has no owner; it is the root of the ownership graph as established in ARCH-00 invariant INV-META-38. All other entities in the Civilisation are directly or transitively owned by the Founder.

**Purpose:** To represent the source of all authority in the Civilisation. Without the Founder Entity Type, there is no root to the ownership graph, no anchor for SOVEREIGN-level authority, and no entity to which the constitutional kill-switch is attributed. Every governance decision, every authority grant, and every constitutional amendment traces to this entity.

**Required Attributes:**
- `identity_id` (Reference → ET-IDN-001) — the SOVEREIGN-level canonical Identity of the Founder
- `canonical_name` (String) — the Founder's full canonical name
- `trust_level` (Enumeration: SOVEREIGN) — fixed; cannot be changed
- `email` (String) — primary communication address for Civilisation notifications
- `status` (Enumeration: ACTIVE) — the Founder entity does not have a conventional terminal lifecycle state
- `established_at` (DateTime, immutable) — when this entity was first registered in the Civilisation

**Optional Attributes:**
- `timezone` (String) — the Founder's operational timezone, used for scheduling and notification timing
- `communication_preferences` (Structured) — preferred channels and priorities for Civilisation notifications

**Lifecycle:**
REGISTERED → ACTIVE

The Founder Entity does not terminate. Once registered, it remains ACTIVE for the life of the Civilisation. There is no INACTIVE, SUSPENDED, or ARCHIVED state for the Founder.

**Ownership Rule:** No owner. Root entity. The Founder Entity is the sole exception to the rule that every Entity must have an owner.

**Source of Truth:** Identity Domain (ARCH-04)

**Permitted Relationships:**
- OWNS → all Entity Types (directly or transitively — the Founder is the root of all ownership)
- IS_IDENTIFIED_BY → ET-IDN-001 (Identity)
- GOVERNS → ET-GOV-002 (Constitution)
- DELEGATES_TO → ET-EXE-002 (Council Member)
- IS_NOTIFIED_BY → ET-COM-002 (Notification)

**Constraints:**
- Exactly one instance of ET-GOV-001 may exist at any time. Any attempt to create a second instance must be rejected by the Registry.
- The `trust_level` attribute is immutable and must always equal SOVEREIGN. No governance operation may lower the Founder's trust level.
- The Founder Entity may not be OWNED by any other entity. Any Relationship of type IS_OWNED_BY originating from ET-GOV-001 is architecturally invalid.
- All kill-switch procedures, SOVEREIGN-level amendments, and override actions must be attributed to the Founder Entity via its Identity in the Evidence chain.

**Known Implementation State:**
The Founder Entity is partially implemented. The human principal's email and preferences are referenced in configuration and notification services, but no formal Founder Entity Registry Record exists in the current implementation. The Founder is effectively implicit — referenced by Identity resolution — rather than explicitly registered as a governed entity with a Registry Record. This constitutes a gap against the Registry admission requirement. There are no defect codes specific to the Founder entity, but the absence of a formal Registry Record means that ARCH-03 audit obligations cannot be satisfied for this type.

**Non-examples:** A Council Member is not a Founder — Council Members hold EXECUTIVE authority delegated from the Founder, not SOVEREIGN authority. An administrative user account is not a Founder — an account is a Credential, not an entity in the governed architecture. A system service operating with elevated privileges is not a Founder — services hold SYSTEM-level trust, not SOVEREIGN.

---

### ET-GOV-002 — Constitution

**Definition:** A Constitution is a ratified foundational law governing all Civilisation behaviour. A Constitution is not a Policy — it is the basis upon which Policies derive their authority. Constitutions are immutable except via a defined amendment process that requires SOVEREIGN authority. The APEX Civilisation has two Constitution instances: the Operational Constitution (constitution-v1.md, 8 articles) and the Architectural Constitution (Scripts/CONSTITUTION.md, 6 articles plus amendment log).

**Purpose:** To establish the foundational law of the Civilisation. Without the Constitution Entity Type, there is no mechanism for distinguishing a foundational law from an operational policy, no basis for the authority hierarchy, and no constitutional constraint on what the Civilisation may do. The Constitution is the source of authority for every Policy, Rule, and governance decision in the Civilisation.

**Required Attributes:**
- `constitution_id` (Identifier) — canonical Identity
- `title` (String) — canonical name of this Constitution
- `version` (String) — current ratified version in semantic form
- `scope` (Enumeration: OPERATIONAL | ARCHITECTURAL | DOMAIN_SPECIFIC) — what the Constitution governs
- `article_count` (Integer) — number of ratified articles
- `ratified_at` (DateTime, immutable) — date of ratification
- `ratified_by` (Reference → ET-IDN-001) — Identity of ratifying authority (must be SOVEREIGN)
- `status` (Enumeration: DRAFTED | UNDER_REVIEW | RATIFIED | UNDER_AMENDMENT | SUPERSEDED)

**Optional Attributes:**
- `amendment_log` (List of References → ET-GOV-006) — ordered history of all amendments applied to this Constitution
- `supersedes` (Reference → ET-GOV-002) — reference to the prior Constitution this replaces, if applicable

**Lifecycle:**
DRAFTED → UNDER_REVIEW → RATIFIED → UNDER_AMENDMENT (→ RATIFIED) / SUPERSEDED

A Constitution transitions from DRAFTED through UNDER_REVIEW via a formal review process involving the CRO and CLO. It becomes RATIFIED only upon SOVEREIGN approval. UNDER_AMENDMENT is a transient state during which the Constitution retains its governing force — it is not suspended during amendment. SUPERSEDED is terminal.

**Ownership Rule:** Owned by the Founder (ET-GOV-001).

**Source of Truth:** Governance Domain

**Permitted Relationships:**
- IS_OWNED_BY → ET-GOV-001 (Founder)
- GOVERNS → ET-GOV-003 (Policy) — Policies derive authority from a Constitution
- GOVERNS → all Civilisation Entity Types (foundational constraint applies universally)
- IS_AMENDED_BY → ET-GOV-006 (Amendment)
- IS_SUPERSEDED_BY → ET-GOV-002 (Constitution) — when a newer version is ratified
- IS_ENFORCED_BY → ET-SVC-003 (Gateway) — constitutional constraints are enforced at Gateways

**Constraints:**
- A Constitution in RATIFIED state may not be modified directly. All changes must proceed through the UNDER_AMENDMENT state and produce an Amendment record (ET-GOV-006).
- A Constitution may only be ratified by an entity holding SOVEREIGN trust level. Any Constitution whose `ratified_by` field references a non-SOVEREIGN Identity is invalid.
- The two current Constitution instances (Operational and Architectural) are both valid simultaneously and govern different scopes. Neither supersedes the other. Where they conflict, the conflict must be resolved via Amendment — not by ignoring one.

**Known Implementation State:**
Both Constitution instances exist as physical files (constitution-v1.md and Scripts/CONSTITUTION.md) and are read by the Constitutional Gate service. However, they exist as file artifacts, not as formally registered entities with Registry Records. The Constitutional Gate reads their content but does not maintain versioned Entity records for them. Defect C02 (checkGovernance unconditionally open — NEVER blocks) means that while the Constitution files exist, their enforcement through the gateway is not operative. This is a CRITICAL implementation gap per Phase 2.3 certification.

**Non-examples:** A Policy is not a Constitution — a Policy derives authority from a Constitution and governs a specific decision domain. An ARCH specification document is not a Constitution — ARCH documents are architectural specifications that derive authority from the Architectural Constitution. An Amendment is not a Constitution — an Amendment is the instrument of change; the Constitution is the thing being changed.

---

### ET-GOV-003 — Policy

**Definition:** A Policy is a named, ratified set of Rules governing a specific category of decisions within the Civilisation. Policies derive their authority from a Constitution. A Policy specifies what decisions are required — it does not specify how those decisions are implemented. Implementation is the domain of Services and Capabilities; Policy governs what outcomes those implementations must produce.

**Purpose:** To provide a governed mechanism for expressing operational rules at a level below the Constitution but above individual capability invocations. Without Policies, all governance must either be embedded in the Constitution (making it unworkably rigid) or left to individual services (making it ungoverned). Policies occupy the essential middle layer.

**Required Attributes:**
- `policy_id` (Identifier) — canonical Identity
- `title` (String) — canonical name of this Policy
- `scope_description` (String) — a precise statement of what category of decisions this Policy governs
- `constitutional_basis` (Reference → ET-GOV-002, article number) — the specific constitutional article from which this Policy derives authority
- `version` (String) — current ratified version
- `status` (Enumeration: DRAFT | RATIFIED | DEPRECATED)
- `ratified_by` (Reference → ET-IDN-001) — Identity of ratifying authority
- `ratified_at` (DateTime) — date of ratification
- `enforcement_mechanism` (String) — description of how violations are detected and reported

**Optional Attributes:**
- `expiry_date` (DateTime) — for time-limited Policies; absent means perpetual until explicitly DEPRECATED
- `override_conditions` (String) — conditions under which the Policy may be suspended, and by whom; if absent, the Policy cannot be suspended

**Lifecycle:**
DRAFT → UNDER_REVIEW → RATIFIED → DEPRECATED

DEPRECATED is terminal. A deprecated Policy must identify the Policy or constitutional provision that supersedes it.

**Ownership Rule:** Owned by the Founder or delegated to a Council Member with appropriate authority over the Policy's domain.

**Source of Truth:** Governance Domain

**Permitted Relationships:**
- CONTAINS → ET-GOV-004 (Rule) — a Policy contains one or more Rules
- GOVERNS → ET-CAP-001 (Capability) — certain Capabilities are governed by specific Policies
- GOVERNS → lifecycle Transitions within Entity Lifecycles
- IS_ENFORCED_AT → ET-SVC-003 (Gateway) — Policies are enforced at Boundaries
- DERIVES_FROM → ET-GOV-002 (Constitution)

**Constraints:**
- A Policy may not exist without a valid constitutional basis. The `constitutional_basis` attribute must reference an article in a RATIFIED Constitution.
- A Policy must contain at least one Rule (ET-GOV-004). A Policy with no Rules has no governing content and must not be ratified.
- A Policy may not be ratified without an identified enforcement mechanism. An unenforced Policy is an architectural fiction that creates false confidence.

**Known Implementation State:**
Policies are referenced in the architectural documentation and certification findings but are not maintained as formal registered entities in the current implementation. The constitutional gate evaluates constitutional articles directly rather than evaluating ratified Policy records. This means the Policy layer of the governance hierarchy exists architecturally but is not instantiated in the runtime governance model. Establishing formal Policy Registry Records is a Phase 3 obligation.

**Non-examples:** A Rule is not a Policy — a Rule is an atomic governance statement contained within a Policy. A Constitution article is not a Policy — it is foundational law; Policies derive from Constitution articles. An engineering standard or best practice is not a Policy unless it has been formally ratified under constitutional authority.

---

### ET-GOV-004 — Rule

**Definition:** A Rule is an individual, atomic governance statement within a Policy. A Rule declares a condition and a required response and must be independently evaluable as satisfied or violated. A Rule is the finest-grained unit of governance that the Civilisation maintains as a named, registered entity.

**Purpose:** To make governance obligations specific, testable, and attributable. Without Rules, Policies are aspirational statements without measurable compliance. Rules are the basis for certification (ET-GOV-005) — you cannot certify compliance with a Policy without knowing its individual Rules. The 25 invariants certified in Phase 2.3 are all instances of architectural Rules.

**Required Attributes:**
- `rule_id` (Identifier) — canonical Identity
- `policy_id` (Reference → ET-GOV-003) — the parent Policy containing this Rule
- `rule_text` (String) — the formal statement: a condition and a required response, expressed precisely enough to be evaluable
- `enforcement_mode` (Enumeration: MANDATORY | CONDITIONAL) — MANDATORY rules must always hold; CONDITIONAL rules apply only when specified conditions are true
- `severity` (Enumeration: CRITICAL | HIGH | MEDIUM | LOW) — the impact of a violation
- `status` (Enumeration: ACTIVE | SUSPENDED | SUPERSEDED)

**Optional Attributes:**
- `reporting_obligation` (Boolean) — whether a violation must produce an Evidence Record
- `violation_response` (String) — the required action when this Rule is violated, if defined at the Rule level rather than the Policy level

**Lifecycle:**
ACTIVE → SUSPENDED / SUPERSEDED

SUSPENDED indicates a temporary, authorised pause in enforcement (requires EXECUTIVE authority). SUPERSEDED indicates that a newer Rule replaces this one. Both are terminal with respect to enforcement of this specific Rule instance.

**Ownership Rule:** Owned by its parent Policy, and transitively by the Policy's owner.

**Source of Truth:** Governance Domain

**Permitted Relationships:**
- BELONGS_TO → ET-GOV-003 (Policy)
- IS_CERTIFIED_AGAINST → ET-GOV-005 (Certification) — Certifications assess specific Rules
- IS_EVALUATED_AGAINST → ET-OPS-002 (Agent Task), lifecycle Transitions, and Boundary crossings

**Constraints:**
- A Rule's `rule_text` must be evaluable — it must be possible to determine, given a specific system state, whether the Rule is satisfied or violated. Aspirational text that cannot be evaluated is not a valid Rule.
- A Rule may not reference another Rule as its condition. Rules must be atomic. Complex conditions are expressed by creating multiple Rules and grouping them in a Policy.

**Known Implementation State:**
Individual Rules are not maintained as registered entities in the current implementation. The 25 invariants from Phase 2.3 certification (INV-A1 through INV-H3) represent the closest existing approximation of architectural Rules, but they exist in certification documents rather than in a Rule Registry. Establishing a Rule Registry is a prerequisite for the runtime governance model specified in ARCH-06.

**Non-examples:** A software assertion or unit test is not a Rule — it is a test of implementation behaviour, not a governance statement. A guideline or recommendation is not a Rule — Rules require a defined violation response. A constitutional article is not a Rule — it is foundational law from which Rules derive.

---

### ET-GOV-005 — Certification

**Definition:** A Certification is a formal, evidence-backed verdict on whether a specific architectural Constraint, invariant, or Policy Rule is satisfied within the Civilisation at a specific point in time. Certifications are the mechanism by which architectural compliance is formally recorded.

**Purpose:** To provide an authoritative, timestamped record of compliance status for specific governance obligations. Without Certifications, the Civilisation has no formal mechanism for knowing what it complies with, what it does not comply with, and when that status was last verified. The Phase 2.3 certification exercise produced 25 Certifications across the invariant set — these constitute the foundation of the current compliance record.

**Required Attributes:**
- `certification_id` (Identifier) — canonical Identity
- `subject_ref` (String) — the Constraint, invariant, or Rule being certified (by ID)
- `verdict` (Enumeration: ENFORCED | PARTIALLY_ENFORCED | NOT_ENFORCED | SIMULATED_ONLY | UNKNOWN)
- `evidence_refs` (List of References → ET-KNW-004) — Evidence Records supporting this verdict
- `issued_by` (Reference → ET-IDN-001) — Identity of certifying authority
- `issued_at` (DateTime, immutable) — when this Certification was produced
- `scope` (String) — what part of the Civilisation this Certification covers
- `validity_period` (Duration) — how long this Certification remains valid before re-certification is required

**Optional Attributes:**
- `remediation_notes` (String) — for non-ENFORCED verdicts: the required remediation action and responsible entity

**Lifecycle:**
ISSUED → VALID → EXPIRED / SUPERSEDED

A Certification is VALID until its validity_period elapses (→ EXPIRED) or until a new Certification for the same subject is issued (→ SUPERSEDED). SUPERSEDED Certifications remain in the record as historical evidence.

**Ownership Rule:** Owned by the Governance authority that issued it.

**Source of Truth:** Governance Domain

**Permitted Relationships:**
- IS_SUPPORTED_BY → ET-KNW-004 (Evidence Record)
- CONCERNS → ET-GOV-004 (Rule) or architectural Constraint
- SUPERSEDES → ET-GOV-005 (Certification) — for the same subject

**Constraints:**
- A Certification must carry at least one Evidence Record reference. An unsupported Certification verdict is not architecturally valid.
- A Certification with verdict NOT_ENFORCED or PARTIALLY_ENFORCED must include remediation_notes identifying the responsible entity and required action.
- A Certification does not improve the compliance state it documents. A NOT_ENFORCED verdict means the Rule is not enforced — the Certification records this fact, it does not remedy it.

**Known Implementation State:**
The 25 Phase 2.3 Certifications exist as findings in certification documents but are not registered as formal Certification Entity instances with Registry Records. The verdicts from Phase 2.3 are: 4 ENFORCED, 12 PARTIALLY_ENFORCED, 7 NOT_ENFORCED, 1 SIMULATED_ONLY, 1 UNKNOWN. Establishing these as registered Certification entities is a Phase 3.2 obligation. The remediation obligations from the non-ENFORCED verdicts are tracked in the defect register (Section 17).

**Non-examples:** A test result is not a Certification — tests verify implementation behaviour; Certifications verify governance compliance. A code review comment is not a Certification. An audit finding is not a Certification unless it follows the Certification Lifecycle and carries the required Evidence references.

---

### ET-GOV-006 — Amendment

**Definition:** An Amendment is a ratified change to a Constitution or architectural specification (ARCH document). An Amendment records the change, its justification, its impact, the authority that ratified it, and the version it produces. Amendments are immutable once ratified — the historical record of changes to foundational documents must be preserved.

**Purpose:** To provide the formal mechanism through which the most immutable documents in the Civilisation may evolve. Without the Amendment Entity Type, constitutions and architectural specifications would be either permanently frozen (impossible to improve) or informally edited (losing the integrity of the ratification record). The Amendment creates a governed middle path.

**Required Attributes:**
- `amendment_id` (Identifier, immutable) — canonical Identity
- `target_ref` (Reference → ET-GOV-002 or ARCH document) — what is being amended
- `change_type` (Enumeration: MAJOR | MINOR | PATCH)
- `change_description` (String) — what is being changed and the precise justification
- `proposed_by` (Reference → ET-IDN-001) — Identity of proposing entity
- `reviewed_by` (List of References → ET-IDN-001) — must include the CRO and CLO (constitutional requirement per constitution-v1.md Art. 8)
- `ratified_by` (Reference → ET-IDN-001) — must be SOVEREIGN Identity
- `ratified_at` (DateTime, immutable) — timestamp of ratification
- `version_produced` (String) — the new version identifier of the target document after this Amendment

**Lifecycle:**
PROPOSED → UNDER_REVIEW → RATIFIED / REJECTED

REJECTED is terminal. RATIFIED is terminal and triggers a version increment in the amended document. A REJECTED Amendment is retained in the record.

**Ownership Rule:** Owned by the Founder.

**Source of Truth:** Governance Domain

**Permitted Relationships:**
- MODIFIES → ET-GOV-002 (Constitution) or ARCH specification document
- IS_RATIFIED_BY → ET-GOV-001 (Founder)
- PRODUCES → new Version of the target document

**Constraints:**
- An Amendment to a Constitution must be reviewed by both the CRO and CLO before ratification. Any Amendment missing these reviews is constitutionally invalid per constitution-v1.md Art. 8.
- An Amendment may not be retrospectively applied to produce a version earlier than the current version. Amendments are always forward-only.
- A RATIFIED Amendment is immutable. Its content, ratification date, and authority attribution may not be changed after ratification.

**Known Implementation State:**
The Architectural Constitution (Scripts/CONSTITUTION.md) contains an amendment log with four entries covering the period from initial ratification through Phase 3. These entries exist as text within the file rather than as formal Amendment Entity instances with Registry Records. The Operational Constitution (constitution-v1.md) does not include an equivalent log. Formalising both amendment histories as registered Amendment entities is a Phase 3.2 obligation.

**Non-examples:** A code commit is not an Amendment — commits modify implementation artifacts, not constitutional or architectural documents. A clarification note added to a document informally is not an Amendment — it has not followed the PROPOSED → UNDER_REVIEW → RATIFIED process. A version increment in a service's configuration is not an Amendment.

---

### ET-GOV-007 — External Contact

**Definition:** An External Contact is a human entity outside the Civilisation who has a defined relationship with the Founder or with Civilisation operations. External Contacts do not hold Civilisation authority and may not own Civilisation entities, but they may be referenced in Goals, Projects, Knowledge Articles, and Notifications as participants in the Founder's life context.

**Purpose:** To allow the Civilisation to reason about, communicate with, and maintain knowledge concerning the humans that matter to the Founder's life and work. Without this Entity Type, the Civilisation cannot maintain relationship context, cannot address Notifications to relevant third parties, and cannot connect projects and goals to the external relationships they serve.

**Required Attributes:**
- `contact_id` (Identifier) — canonical Identity
- `name` (String) — canonical name of this External Contact
- `contact_type` (Enumeration: PERSONAL | PROFESSIONAL | INSTITUTIONAL) — the nature of the relationship
- `relationship_to_founder` (String) — a precise description of how this contact relates to the Founder
- `communication_channels` (Structured) — how to reach this contact (channels and addresses)
- `status` (Enumeration: ACTIVE | INACTIVE | ARCHIVED)

**Optional Attributes:**
- `organisation_ref` (Reference → ET-GOV-008) — the External Organisation this contact is associated with, if applicable
- `last_interaction_at` (DateTime) — when the most recent meaningful interaction occurred
- `notes` (String) — contextual notes relevant to the relationship

**Lifecycle:**
REGISTERED → ACTIVE → INACTIVE → ARCHIVED

INACTIVE indicates the relationship has become dormant but has not ended. ARCHIVED is terminal for operational purposes but the record is retained.

**Ownership Rule:** Owned by the Founder.

**Source of Truth:** Identity Domain

**Permitted Relationships:**
- IS_ASSOCIATED_WITH → ET-GOV-008 (External Organisation)
- IS_REFERENCED_IN → ET-INT-003 (Project), ET-KNW-003 (Knowledge Article)
- IS_RECIPIENT_OF → ET-COM-002 (Notification) — for external-facing communications mediated by the Civilisation

**Constraints:**
- An External Contact does not hold any Authority Grant within the Civilisation. Any attempt to create an Authority Grant for an External Contact must be rejected.
- An External Contact may not own any Civilisation entity. The ownership graph is bounded by the Founder and their delegated internal entities.

**Known Implementation State:**
External Contacts are maintained informally within the Obsidian vault and in agent context but are not registered as formal entities with Registry Records in the current implementation. No defect codes apply specifically to this Entity Type, as it has not been formally implemented yet. Formalisation is a Phase 3 registry population obligation.

**Non-examples:** A Council Member is not an External Contact — Council Members are internal Civilisation entities holding delegated authority. An API provider (such as an AI model provider) is not an External Contact — it is an External Organisation (ET-GOV-008). An anonymous visitor to the Civilisation's interfaces is not an External Contact — they hold NONE trust level and produce no External Contact record.

---

### ET-GOV-008 — External Organisation

**Definition:** An External Organisation is an institutional entity outside the Civilisation that the Founder or the Civilisation has a relationship with. External Organisations are referenced in Goals, Projects, Budget entities, and Knowledge Articles as the institutional context for the Civilisation's external activities.

**Purpose:** To allow the Civilisation to maintain structured knowledge about the institutions that shape its operating environment — employers, clients, service providers, educational institutions, and government entities. Without this Entity Type, all external institutional context must be maintained as unstructured notes, which cannot be governed, referenced in structured Relationships, or surfaced reliably in agent reasoning.

**Required Attributes:**
- `org_id` (Identifier) — canonical Identity
- `name` (String) — canonical name of this organisation
- `org_type` (Enumeration: EMPLOYER | CLIENT | SERVICE_PROVIDER | EDUCATIONAL | GOVERNMENT | OTHER)
- `relationship_to_civilisation` (String) — the nature and significance of the relationship
- `status` (Enumeration: ACTIVE | INACTIVE | ARCHIVED)

**Optional Attributes:**
- `primary_contact_ref` (Reference → ET-GOV-007) — the main External Contact at this organisation
- `contract_ref` (String) — reference to any formal agreement or contract
- `website` (String) — canonical public address

**Lifecycle:**
REGISTERED → ACTIVE → INACTIVE → ARCHIVED

**Ownership Rule:** Owned by the Founder.

**Source of Truth:** Identity Domain

**Permitted Relationships:**
- HAS_CONTACT → ET-GOV-007 (External Contact)
- IS_REFERENCED_IN → ET-INT-003 (Project), ET-RES-002 (Budget), ET-KNW-003 (Knowledge Article)

**Constraints:**
- An External Organisation may not hold Authority Grants within the Civilisation. Institutional relationships are tracked for context, not for delegation.
- The relationship_to_civilisation attribute must be maintained accurately. An External Organisation whose relationship type has changed must have its record updated via governed Entity mutation, not silently reused with stale context.

**Known Implementation State:**
Like External Contacts, External Organisations are tracked informally in the Obsidian vault and agent context but are not registered as formal entities in the current implementation. No specific defect codes apply. Formalisation is a Phase 3 registry population obligation.

**Non-examples:** The AI model provider (Anthropic) is an External Organisation of type SERVICE_PROVIDER — it is registered as an External Organisation, not as an internal Service. The Civilisation's own services are not External Organisations — they are Service entities (ET-SVC-001). A regulatory body whose rules the Founder must comply with is an External Organisation of type GOVERNMENT.

---

## Section 4 — Layer 2: Executive Entity Types

Layer 2 contains the six Entity Types that constitute the leadership and governance structure of the Civilisation. Executive entities hold delegated EXECUTIVE or OPERATIONAL authority from the Founder. They deliberate, decide, and direct the work of the Civilisation within constitutional constraints.

The Executive Layer is distinguished from the Governance Layer by its operational character — where Governance entities define rules, Executive entities act under those rules. A Constitution (ET-GOV-002) does not act; the Council (ET-EXE-001) acts within the Constitution's bounds.

Executive entities are the most complex in terms of implementation — the current implementation maintains active runtime services for several Council Member roles, and the deliberation-vote-decision chain is partially implemented in executable form. This makes the Executive Layer particularly important from a defect perspective: architectural gaps in Executive entities have direct runtime consequences.

---

### ET-EXE-001 — Council

**Definition:** The Council is the collective executive body of the Civilisation. It is not an individual entity but a governing assembly whose authority derives from the collective decisions of its Council Members. The Council deliberates, votes, and produces binding Decision Records within its constitutional authority. The Council is constitutionally capped at a $500/month budget authority per constitution-v1.md Art. 6.

**Purpose:** To provide a structured, multi-perspective decision-making body that can exercise executive authority without requiring the Founder's direct involvement in every decision. Without the Council Entity Type, all decisions must be made directly by the Founder — there is no mechanism for delegation of executive function to a governed, auditable body.

**Required Attributes:**
- `council_id` (Identifier) — canonical Identity
- `name` (String) — canonical name (the APEX Executive Council)
- `member_count` (Integer) — current number of active Council Members
- `quorum_requirement` (Integer) — minimum number of voting members required for a valid Deliberation
- `budget_cap` (Decimal) — monthly budget authority in USD; constitutionally capped at $500/month
- `status` (Enumeration: CONSTITUTED | ACTIVE | SUSPENDED | DISSOLVED)

**Optional Attributes:**
- `founding_date` (DateTime) — when the Council was constituted
- `last_deliberation_at` (DateTime) — timestamp of the most recent Deliberation

**Lifecycle:**
CONSTITUTED → ACTIVE → SUSPENDED → DISSOLVED

CONSTITUTED is the initial state when the Council is formally established under constitutional authority. DISSOLVED is terminal — if the Council is dissolved, a new Council requires fresh constitutional ratification.

**Ownership Rule:** Owned by the Founder.

**Source of Truth:** Executive Domain

**Permitted Relationships:**
- CONTAINS → ET-EXE-002 (Council Member)
- CONDUCTS → ET-EXE-004 (Deliberation)
- IS_GOVERNED_BY → ET-GOV-002 (Constitution)
- REPORTS_TO → ET-GOV-001 (Founder)
- CONTROLS → ET-RES-002 (Budget) — within the constitutional cap

**Constraints:**
- The Council's `budget_cap` must never exceed $500/month. This is a constitutional constraint and may not be overridden without a formal Constitutional Amendment (ET-GOV-006).
- A Deliberation may only produce a valid Decision Record if the quorum requirement is met. Sub-quorum deliberations are advisory only and must not produce binding Decision Records.
- Exactly one Council instance may exist at any time.

**Known Implementation State:**
The Council is partially implemented via the executive-council.js runtime, which orchestrates multi-role deliberation. The ENTITIES array defines seven roles, and the deliberate() function writes to executive_deliberations and executive_votes tables. However, the Council is not registered as a formal entity with a Registry Record. The implementation reflects the Council's function but not its governed identity. No specific defect codes target the Council entity itself, but INV-F1 (Executive decisions require full council: NOT ENFORCED) applies directly to Council operations.

**Non-examples:** A Ministry is not a Council — a Ministry is a functional unit directed by a Council Member, not a deliberative body with voting authority. A single Council Member acting unilaterally is not the Council — the Council's authority is collective and requires the deliberation-vote-decision chain.

---

### ET-EXE-002 — Council Member

**Definition:** A Council Member is an individual executive entity within the Council, holding a defined role with specific domain responsibility and authority. Council Members are AI-governed entities — they operate under AI models but represent specific executive perspectives. APEX has seven defined Council Member roles: CEO (Chief Executive Officer), COO (Chief Operating Officer), CSO (Chief Strategy Officer), CGO (Chief Governance Officer), CRO (Chief Risk Officer), CLO (Chief Legal Officer), CHO (Chief Human Officer). Of these seven, four hold voting rights in Deliberations: CEO, COO, CSO, and CGO. CRO, CLO, and CHO are confirmed non-voting per Phase 2.2 certification findings.

**Purpose:** To embody specific executive perspectives within the deliberation process. Without distinct Council Member Entity Types, the deliberative process collapses into a single voice — losing the multi-perspective reasoning that the executive council architecture is designed to produce. Each Member's distinct domain responsibility ensures that decisions are evaluated from governance, risk, legal, human, and strategic dimensions before commitment.

**Required Attributes:**
- `member_id` (Identifier) — canonical Identity
- `role_title` (String) — canonical role title (CEO | COO | CSO | CGO | CRO | CLO | CHO)
- `role_abbreviation` (String) — three-letter code used in deliberation records and evidence
- `domain_responsibility` (String) — the specific domain this executive oversees
- `has_vote` (Boolean) — whether this Member participates in formal votes; true for CEO, COO, CSO, CGO; false for CRO, CLO, CHO
- `authority_level` (Enumeration: EXECUTIVE) — fixed; Council Members hold EXECUTIVE authority
- `status` (Enumeration: ACTIVE | RECUSED | SUSPENDED)
- `implementation_ref` (String) — reference to the implementing Service file or module

**Optional Attributes:**
- `specialisation_notes` (String) — domain-specific notes from vault specifications for this Member's role

**Lifecycle:**
APPOINTED → ACTIVE → RECUSED → SUSPENDED → RETIRED

RECUSED is a temporary state for a specific Deliberation where the Member has a conflict of interest. SUSPENDED is an administrative hold. RETIRED is terminal.

**Ownership Rule:** Owned by the Council (ET-EXE-001), which is owned by the Founder.

**Source of Truth:** Executive Domain

**Permitted Relationships:**
- IS_MEMBER_OF → ET-EXE-001 (Council)
- SUPERVISES → ET-EXE-003 (Ministry)
- VOTES_ON → ET-EXE-004 (Deliberation) — only when has_vote = true
- CASTS → ET-EXE-005 (Vote) — only when has_vote = true
- IS_IMPLEMENTED_BY → ET-SVC-001 (Service)

**Constraints:**
- Exactly seven Council Member instances may be active at any one time, corresponding to the seven defined roles. No role may have more than one active instance.
- The `has_vote` attribute must reflect the Phase 2.2 confirmed voting structure: CEO, COO, CSO, CGO have votes; CRO, CLO, CHO do not. This is an architectural fact, not a configurable preference.
- A Council Member in RECUSED status may not cast a Vote in the Deliberation from which they are recused, but may participate in other concurrent Deliberations.
- The CEO role implementation file was confirmed absent (defect UR01 from Phase 2.2). This constitutes a gap between the Entity Type definition and the implementation — the CEO Member entity must be registered but its implementation_ref currently cannot be populated.

**Known Implementation State:**
Six of seven Council Member roles have confirmed implementation files (COO, CSO, CGO, CRO, CLO, CHO). The CEO implementation file is absent — this is defect UR01, which remains unresolved. The non-voting status of CRO, CLO, and CHO is architecturally confirmed from examination of the VOTING_ENTITIES constant in executive-council.js. Phase 2.2 certification examined all six confirmed executive files and their vault specifications.

**Non-examples:** An Agent is not a Council Member — Agents hold TASK authority and execute work; Council Members hold EXECUTIVE authority and govern decisions. A Ministry is not a Council Member — a Ministry is a functional unit supervised by a Council Member. The Founder is not a Council Member — the Founder is SOVEREIGN, not EXECUTIVE.

---

### ET-EXE-003 — Ministry

**Definition:** A Ministry is a functional unit responsible for a specific Domain of the Civilisation's operations. Ministries are governed at the OPERATIONAL trust level and report to Council Members. The Ministry system was confirmed as design-only in Phase 2.2 certification — no runtime code implementing Ministry logic was found. Ministries are therefore registered entity types whose instances carry an explicit implementation_status attribute that must reflect this gap.

**Purpose:** To provide a structured organisational layer between executive decision-making and operational task execution. Without the Ministry Entity Type, there is no formal mechanism for delegating domain authority from Council Members to operational entities, and no organisational unit that can own Agents and coordinate domain-specific work. The Ministry is the bridge between governance and operations.

**Required Attributes:**
- `ministry_id` (Identifier) — canonical Identity
- `name` (String) — canonical name of this Ministry
- `domain_responsibility` (String) — the Domain this Ministry oversees, precisely stated
- `supervising_council_member` (Reference → ET-EXE-002) — the Council Member who directs this Ministry
- `authority_level` (Enumeration: OPERATIONAL) — fixed; Ministries hold OPERATIONAL authority
- `implementation_status` (Enumeration: DESIGN_ONLY | PARTIAL | IMPLEMENTED) — current state of runtime implementation; must be DESIGN_ONLY at initial registration per Phase 2.2 finding
- `status` (Enumeration: REGISTERED | ACTIVE | INACTIVE)

**Optional Attributes:**
- `agent_roster` (List of References → ET-OPS-001) — Agents currently supervised by this Ministry

**Lifecycle:**
PROPOSED → REGISTERED → ACTIVE / INACTIVE

REGISTERED is a designed-but-not-yet-operational state, appropriate given the confirmed DESIGN_ONLY implementation status. Transition to ACTIVE requires implementation_status to be PARTIAL or IMPLEMENTED and requires EXECUTIVE authority approval.

**Ownership Rule:** Owned by its supervising Council Member.

**Source of Truth:** Executive Domain

**Permitted Relationships:**
- IS_SUPERVISED_BY → ET-EXE-002 (Council Member)
- GOVERNS → ET-OPS-001 (Agent) — Ministries direct the work of Agents within their domain
- MANAGES → ET-SVC-001 (Service) — Ministries own the Services in their domain

**Constraints:**
- A Ministry must be supervised by exactly one Council Member. Dual supervision is not permitted.
- A Ministry's `implementation_status` attribute must reflect the actual implementation state and must be updated via governed Entity mutation whenever the implementation progresses. Falsely recording IMPLEMENTED when the status is DESIGN_ONLY is a governance violation.

**Known Implementation State:**
No runtime code implementing Ministry logic was found in Phase 2.2 certification. The Ministry system is confirmed DESIGN_ONLY. Ministry registrations will be created as part of Phase 3 registry population, but all will carry implementation_status = DESIGN_ONLY at initial registration. No specific defect codes apply — the absence of implementation is an architectural gap documented at this level, not a defect in code that exists.

**Non-examples:** An Agent is not a Ministry — an Agent executes tasks within a domain; a Ministry governs that domain. A Service is not a Ministry — a Service provides Capabilities; a Ministry oversees the domain within which those Capabilities operate. A Council Member is not a Ministry — a Council Member holds executive authority and supervises a Ministry; the Ministry is the operational unit.

---

### ET-EXE-004 — Deliberation

**Definition:** A Deliberation is a formal, structured executive decision-making process conducted by the Council. A Deliberation has a defined subject, a quorum requirement, a set of Votes from participating Council Members, and a resulting Decision Record. Deliberations are the canonical unit of Council decision-making — all binding executive decisions must arise from a Deliberation.

**Purpose:** To provide a governed, auditable mechanism for collective executive decision-making. Without the Deliberation Entity Type, executive decisions are made informally by individual Council Members without quorum validation, vote recording, or Decision Record production. The Deliberation creates the structured process that makes executive authority legitimate and traceable.

**Required Attributes:**
- `deliberation_id` (Identifier) — canonical Identity
- `subject` (String) — what decision is being deliberated, stated precisely
- `initiated_by` (Reference → ET-IDN-001) — Identity of entity that initiated the Deliberation
- `quorum_met` (Boolean) — whether the required voting members participated
- `participating_members` (List of References → ET-EXE-002) — Council Members who participated
- `status` (Enumeration: OPEN | QUORUM_MET | CONCLUDED | ABANDONED)
- `initiated_at` (DateTime, immutable) — when the Deliberation began
- `concluded_at` (DateTime) — when the Deliberation reached CONCLUDED status

**Optional Attributes:**
- `context_provided` (String) — the briefing or context supplied to deliberating members
- `constraints` (String) — any constraints on the decision that members must observe

**Lifecycle:**
OPEN → QUORUM_MET → CONCLUDED / ABANDONED

A Deliberation opens when initiated, becomes QUORUM_MET when sufficient voting members have cast votes, CONCLUDED when a Decision Record is produced, and ABANDONED if the process is terminated without producing a Decision.

**Ownership Rule:** Owned by the Council.

**Source of Truth:** Executive Domain

**Permitted Relationships:**
- IS_CONDUCTED_BY → ET-EXE-001 (Council)
- HAS → ET-EXE-005 (Vote) — one per participating voting Member
- PRODUCES → ET-EXE-006 (Decision Record)

**Constraints:**
- A Deliberation may only produce a Decision Record if `quorum_met` is true. A Decision Record produced by a sub-quorum Deliberation is constitutionally invalid.
- INV-F1 (Executive decisions require full council participation) is currently NOT ENFORCED — the implementation permits Deliberations to conclude without all voting members having cast votes. This is an architectural defect that must be flagged in the initial Registry Record for this Entity Type.

**Known Implementation State:**
Deliberations are partially implemented via the executive-council.js deliberate() function, which records to the executive_deliberations table. However, defect UN02 identifies uncertainty about whether these writes are properly awaited or fire-and-forget. INV-F1 is NOT ENFORCED — full council participation is not validated before a Deliberation concludes. The quorum mechanism exists in design but is not enforced at runtime. These gaps mean Deliberations are produced but may not satisfy the constitutional requirements for binding executive decisions.

**Non-examples:** An informal discussion between Council Members is not a Deliberation — it has no Lifecycle, no Vote records, and produces no Decision Record. A single Council Member's recommendation is not a Deliberation — it lacks the collective character that makes a Deliberation binding. An Agent task planning session is not a Deliberation — it operates at TASK authority, not EXECUTIVE.

---

### ET-EXE-005 — Vote

**Definition:** A Vote is the formal recorded position of a Council Member on a specific Deliberation. Each Vote carries a position (FOR, AGAINST, or ABSTAIN) and a rationale. A Vote is immutable after casting — the record of a Member's position in a Deliberation may not be changed.

**Purpose:** To provide the atomic unit of executive decision-making. Without Vote entities, the Deliberation process produces collective outcomes with no record of individual positions. The Vote makes executive accountability possible: any Decision Record can be traced to the individual positions of the Council Members who participated.

**Required Attributes:**
- `vote_id` (Identifier, immutable) — canonical Identity
- `deliberation_id` (Reference → ET-EXE-004) — the parent Deliberation
- `council_member_id` (Reference → ET-EXE-002) — the voting Council Member
- `position` (Enumeration: FOR | AGAINST | ABSTAIN)
- `rationale` (String) — the reasoning behind the position, required for all positions
- `cast_at` (DateTime, immutable) — when the Vote was cast

**Optional Attributes:**
None. A Vote is a complete, self-contained record. All fields are required by architectural necessity.

**Lifecycle:**
CAST (terminal — a Vote is immutable after casting)

There are no state transitions after CAST. A Vote exists in a single terminal state. It may not be recalled, amended, or superseded by the same Member in the same Deliberation.

**Ownership Rule:** Owned by the casting Council Member.

**Source of Truth:** Executive Domain

**Permitted Relationships:**
- BELONGS_TO → ET-EXE-004 (Deliberation)
- IS_CAST_BY → ET-EXE-002 (Council Member)
- CONTRIBUTES_TO → ET-EXE-006 (Decision Record)

**Constraints:**
- A Vote may only be cast by a Council Member with `has_vote = true`. A non-voting Member (CRO, CLO, CHO) attempting to cast a Vote must be rejected.
- A Council Member may cast at most one Vote per Deliberation. Duplicate Vote casting must be rejected.
- A Vote is immutable. Once cast, the position and rationale may not be changed under any authority, including SOVEREIGN. The historical record of deliberation must be preserved.

**Known Implementation State:**
Votes are recorded to the executive_votes table via the deliberate() function in executive-council.js. The actual implementation of Vote recording was confirmed in Phase 2.2. However, the validation rules — particularly the constraint that non-voting Members cannot cast Votes, and the uniqueness constraint per Member per Deliberation — were not confirmed as enforced. INV-F1 NOT ENFORCED implies that Vote completeness is not validated before Deliberations conclude.

**Non-examples:** An opinion or recommendation provided by a non-voting Council Member is not a Vote — it is context for the Deliberation but not a binding position. An Agent task status update is not a Vote. A governance score contribution is not a Vote.

---

### ET-EXE-006 — Decision Record

**Definition:** A Decision Record is the formal outcome of a completed Deliberation. It records what was decided, the vote distribution, the rationale derived from member positions, and the authority under which the decision was made. Decision Records are immutable Evidence — they are the constitutional record that executive decisions occurred.

**Purpose:** To provide the durable, immutable record of every binding executive decision. Without Decision Records, the Civilisation has no formal trace of what its executive body decided, when, and why. Decision Records are the basis for all downstream obligation tracking — a decision that commits the Civilisation to a course of action must be findable, immutable, and properly attributed.

**Required Attributes:**
- `decision_id` (Identifier, immutable) — canonical Identity
- `deliberation_id` (Reference → ET-EXE-004) — the Deliberation that produced this Decision
- `decision_text` (String, immutable) — the formal statement of the decision
- `vote_distribution` (Structured) — FOR count, AGAINST count, ABSTAIN count
- `decided_by` (Reference → ET-EXE-001) — the Council Identity
- `decided_at` (DateTime, immutable) — when the Decision was made
- `constitutional_basis` (String) — the constitutional authority under which this Decision falls
- `binding` (Boolean) — whether this Decision obligates downstream action

**Lifecycle:**
ISSUED (terminal — immutable once issued)

A Decision Record has no transitions after ISSUED. It is created in its terminal state. This reflects the constitutional requirement for an immutable evidence chain.

**Ownership Rule:** Owned by the Council.

**Source of Truth:** Executive Domain and Evidence chain (dual classification — the Decision Record is both an executive artifact and an Evidence Record)

**Permitted Relationships:**
- IS_PRODUCED_BY → ET-EXE-004 (Deliberation)
- IS_SUPPORTED_BY → ET-EXE-005 (Vote) — through the parent Deliberation
- IS_CLASSIFIED_AS → ET-KNW-004 (Evidence Record) — Decision Records are a subtype of Evidence

**Constraints:**
- A Decision Record may only be created from a Deliberation with `quorum_met = true`. A Decision Record created from a sub-quorum Deliberation is constitutionally invalid.
- All fields on a ISSUED Decision Record are immutable. No modification, correction, or amendment is permitted. A correction requires a new Deliberation producing a new Decision Record that explicitly supersedes the prior one.
- The `constitutional_basis` field must not be left empty. An executive decision made without traceable constitutional authority is a governance violation.

**Known Implementation State:**
Defect C09 (Strategic planning is ephemeral) establishes that Decision Records from the strategic planning process are not persisted durably. The executive_deliberations table writes are confirmed by Phase 2.2 examination, but defect UN02 (fire-and-forget uncertainty) means that writes may not be reliably persisted. INV-F1 NOT ENFORCED means Decision Records may be produced by Deliberations that did not achieve proper quorum. These gaps collectively mean that the Decision Record chain does not currently satisfy the constitutional evidence chain requirement of constitution-v1.md Art. 3.

**Non-examples:** An agent task completion record is not a Decision Record — task completions are Audit Records (ET-KNW-005), not executive decisions. A Council Member's individual recommendation is not a Decision Record — it is context for a Deliberation, not its outcome. A configuration change is not a Decision Record unless it was authorised through a formal Deliberation.

---

## Section 5 — Layer 3: Operational Entity Types

Layer 3 contains the five Entity Types that perform bounded work within the Civilisation. Operational entities are the runtime actors — they execute, process, and produce outputs. Where Governance entities define rules and Executive entities make decisions, Operational entities carry out the work that those rules and decisions authorise.

Operational entities are the most frequently created and destroyed entities in the Civilisation — every task execution creates and terminates an Agent Task entity. This high frequency of instantiation makes the operational layer the primary source of Evidence, Audit Records, and telemetry data. It also makes the operational layer the place where governance gaps have the most immediate practical impact.

---

### ET-OPS-001 — Agent

**Definition:** An Agent is an autonomous operational entity that executes Agent Tasks using registered Capabilities, operating within its assigned stage and within the bounds of its AUTONOMY_LEVEL. Agents are the primary workforce of the Civilisation. An Agent operates under a specific identity, holds TASK-level authority, and is subject to all capability and authority constraints. APEX defines multiple agent types: MASTER_ORCHESTRATOR, FILE, UNI, FINANCE, BUSINESS, and SYSTEM.

**Purpose:** To represent the governed autonomous actors that perform work on behalf of the Civilisation. Without the Agent Entity Type, there is no formal distinction between a governed autonomous actor and an ungoverned automated script. The Agent Entity Type establishes the accountability boundary: work done by an Agent is traceable to that Agent's Identity, governed by its Autonomy Level, and subject to the full constraint regime.

**Required Attributes:**
- `agent_id` (Identifier) — canonical Identity
- `agent_name` (String) — human-readable canonical name
- `agent_type` (Enumeration: SYSTEM | FILE | UNI | FINANCE | BUSINESS | MASTER_ORCHESTRATOR) — the functional classification of this Agent
- `assigned_stage` (String) — which lifecycle stage this Agent operates in
- `autonomy_level` (Integer: 1 | 2 | 3) — governs the approval requirement; 1 = approval required for all actions, 2 = approval required for high-impact actions, 3 = self-directed; current production value is 3
- `authority_level` (Enumeration: TASK) — fixed; Agents hold TASK authority
- `model_tier_id` (Reference → ET-CAP-004) — the default Model Tier used by this Agent
- `status` (Enumeration: REGISTERED | ACTIVE | SUSPENDED | RETIRED)
- `reputation_score` (Decimal) — current reputation derived from task outcome history
- `registered_at` (DateTime, immutable) — when this Agent was first registered

**Optional Attributes:**
- `capability_restrictions` (List of References → ET-CAP-001) — Capabilities explicitly excluded from this Agent's permitted invocations
- `budget_allocation` (Reference → ET-RES-002) — the Resource Budget allocated to this Agent

**Lifecycle:**
REGISTERED → ACTIVE → SUSPENDED → RETIRED

SUSPENDED is a temporary administrative hold. RETIRED is terminal — a retired Agent's Identity is preserved but the Agent may not execute further tasks.

**Ownership Rule:** Owned by its assigned Ministry or, in the absence of an active Ministry implementation, by the relevant Council Member.

**Source of Truth:** Agent Domain

**Permitted Relationships:**
- EXECUTES → ET-OPS-002 (Agent Task)
- INVOKES → ET-CAP-001 (Capability)
- IS_GOVERNED_BY → ET-GOV-003 (Policy)
- PRODUCES → ET-KNW-004 (Evidence Record)
- LEARNS_FROM → ET-KNW-002 (Lesson)
- REFLECTS_ON → ET-KNW-001 (Memory Record)
- USES → ET-CAP-003 (Model)

**Constraints:**
- An Agent may only execute Agent Tasks of types registered in the Capability Registry. The eight-type step allowlist (create_document, create_workspace_file, summarize_document, rename_document, delete_document, list_documents, list_files, search_documents) is the current operational constraint.
- An Agent's Autonomy Level determines whether Agent Tasks require prior approval before execution. At Autonomy Level 3 (current production), the PLANNED → APPROVED transition is bypassed — the Agent self-authorises task execution. This is an intentional configuration, not a defect, but it means the approval gate invariant (INV-E1) is PARTIALLY ENFORCED by design.
- An Agent may not exceed its assigned stage scope. An Agent assigned to the execution stage may not perform planning stage operations.

**Known Implementation State:**
Agents are the most substantively implemented entity in the current codebase. Agent lifecycle is managed via agent-task-cycle.js, agent-queue.js, and dynamic-agent-selector.js. The apex_agent_runs table tracks task execution. Reputation scoring is confirmed operational. INV-E1 (Agents require approval before execution) is PARTIALLY ENFORCED — AUTONOMY_LEVEL=3 bypasses the approval gate. No critical defects apply specifically to the Agent entity definition, though B4 (getSuccessRate reads wrong table) affects reputation score accuracy.

**Non-examples:** A scheduled cron job is not an Agent — it is a Schedule entity (ET-OPS-004) that may trigger Agent Tasks, but the trigger mechanism itself is not an Agent. The Master Orchestrator is an Agent of type MASTER_ORCHESTRATOR — it is an Agent, not a separate Entity Type. A human user is not an Agent — humans are either the Founder (ET-GOV-001) or External Contacts (ET-GOV-007).

---

### ET-OPS-002 — Agent Task

**Definition:** An Agent Task is a bounded unit of work assigned to a specific Agent, with a defined input, a set of execution steps, a defined output, and a full Lifecycle. Agent Tasks are the canonical unit of agent work — everything an Agent does is expressed as a Task. All Agent work is observable, auditable, and governable via the Agent Task entity.

**Purpose:** To make every unit of agent work a first-class governed entity. Without the Agent Task Entity Type, agent work is opaque — it happens, produces outputs, and cannot be reliably audited, cancelled, or attributed. The Agent Task creates the accountability wrapper around every discrete piece of work the Civilisation's agents perform.

**Required Attributes:**
- `task_id` (Identifier) — canonical Identity
- `assigned_agent_id` (Reference → ET-OPS-001) — the Agent responsible for executing this Task
- `task_type` (String) — the classification of work, drawn from the Capability Registry
- `input_description` (String) — what the Task requires to begin
- `steps` (List) — the ordered list of Capability invocations constituting this Task
- `autonomy_level_at_creation` (Integer: 1 | 2 | 3) — the AUTONOMY_LEVEL at the time the Task was created; determines approval requirement
- `status` (Enumeration: PLANNED | APPROVED | QUEUED | EXECUTING | COMPLETED | FAILED | CANCELLED | FORCE_TERMINATED)
- `created_at` (DateTime, immutable)
- `started_at` (DateTime) — populated when status transitions to EXECUTING
- `completed_at` (DateTime) — populated when any terminal status is reached
- `outcome` (String) — the result of the Task; required upon reaching COMPLETED or FAILED

**Optional Attributes:**
- `budget_reserved` (Decimal) — Resource reserved for this Task prior to execution
- `budget_consumed` (Decimal) — actual Resource consumption recorded after completion
- `parent_workflow_id` (Reference → ET-OPS-003) — if this Task is part of a Workflow Run

**Lifecycle:**
PLANNED → APPROVED → QUEUED → EXECUTING → COMPLETED / FAILED / CANCELLED / FORCE_TERMINATED

When AUTONOMY_LEVEL = 3, the PLANNED → APPROVED transition is automatic. FORCE_TERMINATED is a terminal state used when the Task must be halted by authority override. CANCELLED is a pre-execution terminal state. FAILED and COMPLETED are post-execution terminal states.

**Ownership Rule:** Owned by the executing Agent.

**Source of Truth:** Agent Execution Domain (apex_agent_runs table in the current implementation)

**Permitted Relationships:**
- IS_EXECUTED_BY → ET-OPS-001 (Agent)
- IS_PART_OF → ET-OPS-003 (Workflow Run) — when part of a larger workflow
- INVOKES → ET-CAP-001 (Capability) — at each step in the Task
- PRODUCES → ET-KNW-004 (Evidence Record)
- PRODUCES → ET-KNW-005 (Audit Record)
- PRODUCES → ET-KNW-008 (Reflection) — on completion

**Constraints:**
- An Agent Task's step types must be drawn exclusively from the registered step allowlist. The current confirmed allowlist contains eight types: create_document, create_workspace_file, summarize_document, rename_document, delete_document, list_documents, list_files, search_documents. Steps of unregistered types must be rejected.
- An Agent Task may not begin execution (transition to EXECUTING) without having reached APPROVED status, except when AUTONOMY_LEVEL = 3. At level 3, the approval is considered granted implicitly at creation.
- The Queue's maximum depth of 50 tasks and maximum concurrency of 3 simultaneous executing tasks are Resource constraints that govern when QUEUED tasks may transition to EXECUTING.

**Known Implementation State:**
Agent Tasks are substantially implemented via agent-task-cycle.js and tracked in the apex_agent_runs table. The eight-type step allowlist is confirmed enforced. The Queue constraints (MAX_QUEUE_DEPTH=50, MAX_CONCURRENCY=3) are confirmed in agent-queue.js. INV-E1 is PARTIALLY ENFORCED due to AUTONOMY_LEVEL=3 bypassing the approval gate in production. Budget tracking against tasks (budget_reserved, budget_consumed) is not implemented — consumption is logged to console only, not persisted (defect confirmed, no specific code, relates to ET-RES-004 consumption record gap).

**Non-examples:** A Workflow Run is not an Agent Task — it is the container within which Agent Tasks execute. A Deliberation is not an Agent Task — it is an executive decision process, not an operational task. A Schedule is not an Agent Task — it is the trigger specification; the work it triggers is expressed as Agent Tasks.

---

### ET-OPS-003 — Workflow Run

**Definition:** A Workflow Run is an instance of a Workflow being executed. A Workflow Run has a conceptual parent Workflow template, a specific set of inputs, an ordered history of Agent Task executions, and a terminal outcome. Workflow Runs are the container entities within which related Agent Tasks are coordinated.

**Purpose:** To provide the coordination envelope for multi-task, multi-agent work. Without the Workflow Run Entity Type, related Agent Tasks are independent — there is no entity that tracks their collective progress, their combined outcome, or the shared context within which they operate. The Workflow Run makes coordinated work governable.

**Required Attributes:**
- `run_id` (Identifier) — canonical Identity
- `workflow_id` (String) — the identifier of the Workflow template this Run instantiates
- `triggered_by` (Reference → ET-IDN-001) — the Entity that initiated this Run
- `input_context` (Structured) — the specific inputs to this Run
- `status` (Enumeration: INITIATED | IN_PROGRESS | COMPLETED | FAILED | ABANDONED)
- `started_at` (DateTime, immutable)
- `completed_at` (DateTime) — populated when any terminal status is reached

**Optional Attributes:**
- `concurrency_slot` (Integer) — which of the maximum three concurrent workstream slots this Run occupies
- `max_workstreams_at_peak` (Integer) — the maximum concurrent Agent Tasks during this Run

**Lifecycle:**
INITIATED → IN_PROGRESS → COMPLETED / FAILED / ABANDONED

INITIATED is the state immediately after creation. IN_PROGRESS begins when the first Agent Task begins executing. ABANDONED is used when the Run is terminated before natural completion.

**Ownership Rule:** Owned by the triggering entity's owner (transitively by the Founder).

**Source of Truth:** Agent Execution Domain

**Permitted Relationships:**
- CONTAINS → ET-OPS-002 (Agent Task) — one or more Tasks constitute the Run
- IS_TRIGGERED_BY → ET-IDN-001 (Identity of triggering entity)
- IS_CONSTRAINED_BY → ET-OPS-005 (Queue) — Runs compete for Queue capacity

**Constraints:**
- A maximum of three Workflow Runs may be IN_PROGRESS simultaneously, per the confirmed MAX_CONCURRENCY=3 constraint in agent-queue.js.
- A Workflow Run may not transition to COMPLETED unless all of its constituent Agent Tasks have reached a terminal status (COMPLETED, FAILED, or CANCELLED).

**Known Implementation State:**
The Master Orchestrator (master-orchestrator.js) implements a form of Workflow Run management via planFeature, runMasterOrchestrator, and markFeatureComplete functions. The three concurrent workstream limit is confirmed. However, Workflow Runs are not registered as formal entities with Registry Records — they are tracked implicitly through the Agent Task records in apex_agent_runs. No specific defect codes apply directly to Workflow Run, but the absence of formal Run records means cross-task coordination state is not durably governed.

**Non-examples:** A single Agent Task is not a Workflow Run — a Run requires the coordination of multiple Tasks toward a shared objective. A Schedule is not a Workflow Run — a Schedule triggers Runs but is not itself a Run. A Deliberation is not a Workflow Run — it is an executive process, not an operational execution.

---

### ET-OPS-004 — Schedule

**Definition:** A Schedule is a logical specification for recurring Process or Workflow execution. A Schedule defines the trigger pattern (time-based, event-based, or condition-based), the Process or Workflow to trigger, and the authority under which execution occurs. Schedules are the governance artifacts that authorise automated, recurring work.

**Purpose:** To formally authorise recurring work without requiring per-instance approval. Without the Schedule Entity Type, recurring work either requires manual initiation each time (eliminating automation) or runs without any governance record of the authorisation (making it ungoverned). The Schedule creates a persistent, governed authorisation for a class of recurring invocations.

**Required Attributes:**
- `schedule_id` (Identifier) — canonical Identity
- `schedule_name` (String) — canonical name
- `trigger_type` (Enumeration: TIME_BASED | EVENT_BASED | CONDITION_BASED)
- `trigger_specification` (String) — the cron expression, event type, or condition definition
- `target_workflow_id` (String) — the Workflow or Process to trigger; required if trigger leads to a Workflow Run
- `authority_level_required` (Enumeration) — minimum trust level required for execution
- `status` (Enumeration: ACTIVE | PAUSED | DISABLED)
- `last_triggered_at` (DateTime) — timestamp of most recent successful trigger
- `next_trigger_at` (DateTime) — for TIME_BASED schedules: computed next trigger time
- `implementation_ref` (Reference → ET-PHY-012) — the Cron Schedule entity that physically implements this Schedule

**Optional Attributes:**
- `failure_policy` (Enumeration: RETRY | SKIP | ALERT) — what to do if a triggered execution fails

**Lifecycle:**
REGISTERED → ACTIVE → PAUSED → DISABLED

PAUSED is a temporary suspension. DISABLED is an administrative terminal state for Schedules no longer in use. DISABLED does not delete the Schedule record — the authorisation history is preserved.

**Ownership Rule:** Owned by the Ministry or Service responsible for the scheduled process.

**Source of Truth:** Operations Domain

**Permitted Relationships:**
- TRIGGERS → ET-OPS-003 (Workflow Run) — a Schedule trigger creates a Workflow Run
- IS_IMPLEMENTED_BY → ET-PHY-012 (Cron Schedule) — the physical trigger mechanism
- IS_AUTHORISED_BY → ET-GOV-003 (Policy) — recurring work must be policy-authorised

**Constraints:**
- A Schedule may only trigger work that falls within the authority of its owning entity. A Schedule owned by a Ministry may not trigger work that requires EXECUTIVE authority.
- An ACTIVE Schedule's execution must produce Evidence — each trigger invocation must create at minimum an Observation record.

**Known Implementation State:**
Schedules are partially implemented via runDueSchedules in agent-task-cycle.js and Render cron routes. Two specific cron schedules are flagged as unresolved in Phase 2.2: adaptation_refresh (UR14) and weekly_review (UR15), whose trigger targets could not be confirmed. The runDueSchedules function executes schedules sequentially, not concurrently — this is an implementation characteristic that limits throughput but does not constitute a governance defect.

**Non-examples:** A single one-time trigger is not a Schedule — Schedules govern recurring invocations. A Queue is not a Schedule — a Queue orders pending work; a Schedule creates that work. An Alert threshold is not a Schedule — it is a trigger condition for a Notification, not an authorisation for recurring work.

---

### ET-OPS-005 — Queue

**Definition:** A Queue is an ordered collection of pending work items awaiting execution, governed by defined capacity, concurrency, and overflow policies. A Queue governs the sequencing, priority, and concurrency of work. The Agent Queue is the primary Queue instance in APEX, managing all Agent Task execution with a confirmed depth limit of 50 and concurrency limit of 3.

**Purpose:** To provide governed flow control for work execution. Without the Queue Entity Type, work items compete for execution resources without any ordered, governed mechanism. The Queue prevents resource exhaustion, enables priority ordering, and provides the mechanism by which overflow policies are enforced.

**Required Attributes:**
- `queue_id` (Identifier) — canonical Identity
- `queue_name` (String) — canonical name
- `queue_type` (Enumeration: AGENT_TASK | EVENT | NOTIFICATION | OTHER)
- `max_depth` (Integer) — maximum number of items the Queue may hold; 50 for the Agent Queue
- `max_concurrency` (Integer) — maximum number of items that may be in active processing simultaneously; 3 for the Agent Queue
- `deduplication_key` (String) — the field used to detect and reject duplicate entries; `id` in the current Agent Queue
- `overflow_policy` (Enumeration: DROP | REJECT | BLOCK) — what happens when max_depth is reached
- `status` (Enumeration: ACTIVE | PAUSED | FULL)

**Optional Attributes:**
- `priority_scheme` (String) — if items are ordered by priority rather than arrival order, the scheme definition

**Lifecycle:**
CREATED → ACTIVE → PAUSED → DRAINED → DECOMMISSIONED

DRAINED is a transitional state when all items have been processed and the Queue is being wound down. DECOMMISSIONED is terminal.

**Ownership Rule:** Owned by the Service that manages the Queue.

**Source of Truth:** Operations Domain

**Permitted Relationships:**
- CONTAINS → ET-OPS-002 (Agent Task) — as pending work items
- IS_MANAGED_BY → ET-SVC-001 (Service)
- GOVERNS → ET-OPS-001 (Agent) execution concurrency

**Constraints:**
- The Queue's `max_depth` and `max_concurrency` limits are hard constraints — they may not be exceeded without a Registry Record update authorised by the Queue's owning Service.
- A Queue with overflow_policy = REJECT must return an explicit rejection to the caller when max_depth is reached. Silent dropping (DROP policy) must be explicitly configured and documented.

**Known Implementation State:**
The Agent Queue is fully implemented via agent-queue.js. MAX_CONCURRENCY=3, MAX_QUEUE_DEPTH=50, deduplication by `id`, and AGENT_STARTED/AGENT_COMPLETED events are all confirmed. The Queue implementation is one of the more robust components in the current codebase. No critical defects apply to the Queue entity itself.

**Non-examples:** An Event Bus is not a Queue — it dispatches Events to consumers rather than managing ordered pending work. A Scheduler is not a Queue — it creates work items; the Queue holds them until execution. A database table holding pending records is not a Queue unless it is governed by a Queue entity with defined capacity and overflow policies.

---

## Section 6 — Layer 4: Knowledge Entity Types

Layer 4 contains the nine Entity Types that hold, represent, and preserve information and understanding across the Civilisation. Knowledge entities are the information fabric — they make the Civilisation's experience, insights, facts, and evidence available for reasoning, governance, and decision-making.

The Knowledge Layer is where several of the most significant defects from Phase 2.3 certification are concentrated. Bug B1 (reflexion-tracker decisionMemoryId always null), Bug B4 (getSuccessRate reads wrong table), and Contradiction C04 (reflexion-tracker records null decision links) all affect Knowledge Layer entities. The five write paths that bypass the Memory Write Gateway represent the most consequential architectural violation in the current implementation — they mean that Memory Records can be created without governance oversight, without Evidence production, and without the integrity guarantees the Memory Gateway is designed to provide.

---

### ET-KNW-001 — Memory Record

**Definition:** A Memory Record is a governed persistence unit of Knowledge retained by the Civilisation. Memory Records are classified by type, each type having a distinct schema, Lifecycle, and Source of Truth. The five Memory Record types are: SEMANTIC (structured facts about the world), EPISODIC (records of specific past interactions and events), PROCEDURAL (knowledge of how to perform tasks), DECISION (records of past decisions and their outcomes), and WORKING (transient context for an active session).

**Purpose:** To provide the Civilisation with persistent, typed, and governable memory. Without the Memory Record Entity Type, the Civilisation has no mechanism for retaining knowledge across sessions, no basis for learning from past experience, and no governed store for the factual context that agents need to perform well. Memory Records are what makes the Civilisation cumulative rather than amnesiac.

**Required Attributes:**
- `memory_id` (Identifier) — canonical Identity
- `memory_type` (Enumeration: SEMANTIC | EPISODIC | PROCEDURAL | DECISION | WORKING)
- `content` (String) — the retained knowledge content
- `content_hash` (String) — SHA-256 of content, used for integrity verification and deduplication
- `owner_id` (Reference → ET-IDN-001) — the Identity of the Entity that created or owns this record
- `created_at` (DateTime, immutable)
- `status` (Enumeration: ACTIVE | COMPRESSED | ARCHIVED | EXPIRED)

**Optional Attributes:**
- `embedding_vector` (Array of Decimal) — vector representation for semantic similarity retrieval
- `confidence_score` (Decimal: 0.0–1.0) — certainty level of the knowledge content
- `source_session_id` (Reference → ET-COM-003) — the Session in which this record was created
- `relevance_tags` (List of String) — subject tags for structured retrieval
- `compression_summary_id` (Reference → ET-KNW-001) — reference to the summary record if this record has been compressed; points to another Memory Record of the same type
- `decision_link_id` (Reference → ET-EXE-006) — for DECISION type records: link to the authoritative Decision Record. NOTE: This is always null in the current implementation due to defect B1 (reflexion-tracker queries `'id'` instead of `'memory_id'`)

**Lifecycle:**
CREATED → ACTIVE → COMPRESSED → ARCHIVED → EXPIRED

WORKING type records expire at session end. COMPRESSED records have their content replaced by a summary reference. ARCHIVED records are retained but no longer surfaced in active retrieval. EXPIRED is terminal — the content is no longer retained.

**Ownership Rule:** Owned by the Agent or Service that created it, ultimately by the Founder.

**Source of Truth:** Memory Domain (each sub-type has its own authoritative table — ARCH-10 will designate these formally)

**Permitted Relationships:**
- IS_OWNED_BY → ET-OPS-001 (Agent) or ET-SVC-001 (Service)
- IS_CREATED_IN → ET-COM-003 (Session)
- IS_COMPRESSED_INTO → ET-KNW-001 (Memory Record) — the summary record
- LINKS_TO → ET-EXE-006 (Decision Record) — for DECISION type only

**Constraints:**
- All Memory Records must be written through the Memory Write Gateway (ET-SVC-003). Any write path that bypasses the Gateway is a constitutional violation. Phase 2.3 certification identified five write paths that bypass the gateway — these are confirmed Constraint violations that must be resolved.
- The `content_hash` must be computed at creation and must match the content at all times the record is ACTIVE. A content hash mismatch indicates tampering.
- WORKING type Memory Records must not persist beyond the Session that created them. Transition to EXPIRED must occur automatically on Session close.

**Known Implementation State:**
Memory Records are the most substantially implemented Knowledge entity, with four persistence tables confirmed (semantic_memory, episodic_memory, procedural_memory, decision_memory) and an active Memory Write Gateway (lib/memory/gateway.js). However, defect B1 causes all DECISION type Memory Records to have `decision_link_id` = null, breaking the link to the Decision Record chain. Defect B4 causes getSuccessRate to read from an incorrect table, producing inaccurate reputation metrics. Contradiction C04 (reflexion-tracker records null decision links) is a direct consequence of B1. Most critically, five confirmed write paths bypass the Memory Write Gateway, meaning a significant proportion of Memory Records lack the governance oversight and Evidence production that gateway writes provide. These bypass paths are the most severe Knowledge Layer defect in the current implementation.

**Non-examples:** A Knowledge Article is not a Memory Record — Knowledge Articles represent stable, reference-quality information; Memory Records represent retained experience and episodic context. An Evidence Record is not a Memory Record — Evidence Records are immutable assertions about occurrences; Memory Records are knowledge that may evolve, compress, or expire. An Observation is not a Memory Record — Observations are pre-validation; Memory Records are validated and governed.

---

### ET-KNW-002 — Lesson

**Definition:** A Lesson is a crystallised, reusable insight extracted from episodic experience and scored for quality. Lessons are produced by the reflection process from Episodic Memory Records and stored in both the Memory system and the Obsidian vault. Lessons are scored on four evaluation dimensions and are used to inform future Agent behaviour through the reflection and adaptation cycle.

**Purpose:** To convert raw episodic experience into actionable, reusable insight. Without the Lesson Entity Type, the Civilisation accumulates episodic records but cannot extract durable learning from them. Lessons are the mechanism by which individual experiences become generalised knowledge that improves all future similar situations.

**Required Attributes:**
- `lesson_id` (Identifier) — canonical Identity
- `lesson_text` (String) — the insight statement in clear, actionable form
- `source_episode_id` (Reference → ET-KNW-001) — the Episodic Memory Record from which this Lesson was extracted
- `score_dimensions` (Structured) — scores on the four evaluation dimensions used by scoreLessonText
- `overall_score` (Decimal) — the composite quality score
- `sha1_hash` (String) — SHA-1 hash of the lesson_text for deduplication; confirmed in obsidian-memory.js
- `created_at` (DateTime, immutable)
- `status` (Enumeration: ACTIVE | SUPERSEDED | ARCHIVED)

**Optional Attributes:**
- `vault_path` (String) — the path in the Obsidian vault where this Lesson is persisted, if applicable

**Lifecycle:**
EXTRACTED → ACTIVE → SUPERSEDED / ARCHIVED

SUPERSEDED indicates a newer, better Lesson on the same subject has replaced this one. ARCHIVED indicates the Lesson is no longer surfaced but is retained for historical purposes.

**Ownership Rule:** Owned by the Agent that generated the Reflection from which this Lesson was extracted, ultimately by the Founder.

**Source of Truth:** Knowledge Domain — persisted to both the persistence layer and the Obsidian vault; ARCH-13 will designate which is the authoritative Source of Truth

**Permitted Relationships:**
- IS_EXTRACTED_FROM → ET-KNW-001 (Memory Record, EPISODIC type)
- IS_PRODUCED_BY → ET-KNW-008 (Reflection)
- INFORMS → ET-OPS-001 (Agent) — Lessons are retrieved and used in agent context

**Constraints:**
- A Lesson must carry a SHA-1 hash for deduplication. If a Lesson with the same hash already exists in the active set, the duplicate must not be created — the existing Lesson must be referenced instead.
- The `_lessonBuffer` capacity (50 items) and `_lessonHashes` capacity (200 items) in the current implementation are operational constraints that must be respected. When the buffer is full, older Lessons must be flushed before new ones are added.

**Known Implementation State:**
Lessons are implemented via reflection-engine.js (which generates them using a Haiku model), obsidian-memory.js (which persists them to the vault with SHA-1 deduplication), and the lesson scoring subsystem. The buffer capacities (_lessonBuffer[50], _lessonHashes[200]) are confirmed. The dual persistence (persistence layer and vault) creates a potential source-of-truth ambiguity that ARCH-13 must resolve. No critical defects apply directly to the Lesson entity, but B1 means that Lessons extracted from DECISION memory may not be correctly linked to their source episodes.

**Non-examples:** A Knowledge Article is not a Lesson — Knowledge Articles are deliberate, curated knowledge entries; Lessons are extracted insights produced by the reflection process. A Reflection is not a Lesson — a Reflection is the process artifact that contains Lessons; a Lesson is the individual insight. An Observation is not a Lesson — Observations are raw perceptions; Lessons are crystallised insights.

---

### ET-KNW-003 — Knowledge Article

**Definition:** A Knowledge Article is a structured unit of domain knowledge that the Civilisation holds about a subject. Unlike Memory Records (which capture past experience) and Lessons (which capture extracted insights), Knowledge Articles represent stable, reference-quality information that the Civilisation maintains about subjects relevant to its operation. Knowledge Articles may originate from external search, from deliberation, from agent synthesis, or from direct Founder input.

**Purpose:** To provide a governed store of stable, reference-quality knowledge distinct from ephemeral or experience-based information. Without Knowledge Articles, all Civilisation knowledge is either transient (session context), experience-based (Memory Records), or unstructured. Knowledge Articles are the Civilisation's library — stable reference information that persists and is retrievable across contexts.

**Required Attributes:**
- `article_id` (Identifier) — canonical Identity
- `title` (String) — canonical name of this Knowledge Article
- `content` (String) — the knowledge content
- `domain` (String) — which Domain this knowledge belongs to
- `source_type` (Enumeration: INTERNAL | WEB_SEARCH | FOUNDER_INPUT | AGENT_GENERATED)
- `source_ref` (String) — where this knowledge came from (URL for WEB_SEARCH, identity reference for FOUNDER_INPUT)
- `confidence` (Enumeration: HIGH | MEDIUM | LOW)
- `created_at` (DateTime, immutable)
- `status` (Enumeration: ACTIVE | SUPERSEDED | ARCHIVED)

**Optional Attributes:**
- `updated_at` (DateTime) — when the content was last revised
- `superseded_by_id` (Reference → ET-KNW-003) — if SUPERSEDED, reference to the article that replaces this one

**Lifecycle:**
CREATED → ACTIVE → SUPERSEDED / ARCHIVED

**Ownership Rule:** Owned by the Service or Agent that created it, ultimately by the Founder.

**Source of Truth:** Knowledge Domain

**Permitted Relationships:**
- IS_RETRIEVED_BY → ET-OPS-001 (Agent) — agents retrieve Knowledge Articles for context
- IS_SOURCED_FROM → ET-CAP-002 (Tool) — web_search tool creates Knowledge Articles
- SUPERSEDES → ET-KNW-003 (Knowledge Article) — when a newer article replaces an older one

**Constraints:**
- A Knowledge Article with `confidence = LOW` must not be surfaced in agent context without an explicit confidence caveat. Low-confidence knowledge, presented without qualification, degrades the reliability of agent reasoning.
- A SUPERSEDED Knowledge Article must reference its replacement via superseded_by_id. Orphaned SUPERSEDED articles with no replacement reference indicate an incomplete knowledge governance process.

**Known Implementation State:**
Knowledge Articles are partially implemented. The chat-context.js buildPrompt function includes a KNOWLEDGE CONNECTIONS block surfacing up to four knowledge items per prompt. Web search (toolWebSearch in lib/apex-tools.js) produces knowledge content that enters the context pipeline. However, Knowledge Articles are not formally registered entities with Registry Records — they exist as data in the knowledge retrieval layer without formal Entity lifecycle governance. No specific defect codes apply.

**Non-examples:** A Memory Record is not a Knowledge Article — Memory Records capture experience; Knowledge Articles represent stable reference knowledge. A Document is not a Knowledge Article unless it has been curated into the knowledge base. A web search result is not a Knowledge Article until it has been processed into the structured article format with all required attributes.

---

### ET-KNW-004 — Evidence Record

**Definition:** An Evidence Record is an immutable, provenance-bearing, cryptographically chain-linked record asserting that a specific occurrence happened within the Civilisation. Evidence Records are the constitutional mechanism for traceability per constitution-v1.md Art. 3. They form an append-only chain where each record includes the hash of its predecessor, making the chain tamper-evident.

**Purpose:** To provide the constitutional evidence chain that makes the Civilisation's behaviour auditable and trustworthy. Without Evidence Records, the Civilisation operates without a verifiable history — decisions can be claimed or denied without proof, failures can be concealed, and governance can be circumvented without consequence. The Evidence chain is the most fundamental governance mechanism below the Constitution itself.

**Required Attributes:**
- `evidence_id` (Identifier, immutable) — canonical Identity
- `evidence_type` (String) — the category of occurrence being evidenced (registered in the Event Type Registry)
- `subject_entity_id` (Reference → Entity Identity) — the Entity this Evidence concerns
- `actor_identity_id` (Reference → ET-IDN-001) — whose action or observation produced this Evidence
- `operation_type` (String) — what operation produced this Evidence
- `outcome` (Enumeration: SUCCESS | FAILURE | PARTIAL)
- `chain_hash` (String) — SHA-256 of the preceding Evidence Record in the chain; null only for the genesis record
- `chain_link_id` (Reference → ET-KNW-004) — Identity of the preceding Evidence Record in the chain; null only for the genesis record
- `created_at` (DateTime, immutable)
- `immutable` (Boolean: always true) — explicitly records that this record may not be modified

**Optional Attributes:**
- `governance_score_delta` (Decimal) — impact on the Civilisation's governance score, if applicable
- `payload` (Structured) — additional structured data supporting the assertion
- `constitutional_impact` (String) — which constitutional article this Evidence relates to

**Lifecycle:**
CREATED (terminal — immutable, no state transitions after creation)

**Ownership Rule:** Owned by the Governance system.

**Source of Truth:** Evidence Domain (append-only, authoritative)

**Permitted Relationships:**
- CONCERNS → any Entity — Evidence records occurrences involving any entity
- IS_ATTRIBUTED_TO → ET-IDN-001 (Identity) — the actor whose action produced this Evidence
- FOLLOWS → ET-KNW-004 (Evidence Record) — chain predecessor reference
- IS_REFERENCED_BY → ET-GOV-005 (Certification)

**Constraints:**
- An Evidence Record may not be modified after creation. Any system that permits modification of existing Evidence Records is in violation of constitution-v1.md Art. 3.
- The `chain_hash` must be computed from the actual content of the preceding record. A chain_hash that does not match the preceding record's content indicates tampering and must trigger an immediate governance alert.
- Every Evidence Record must have an `actor_identity_id`. Anonymous Evidence — evidence with no attributable actor — must be explicitly flagged as such, not silently omitted.

**Known Implementation State:**
Evidence Records are partially implemented via the governance.js `_w()` wrapper function. However, a critical defect exists: `_w()` uses fire-and-forget invocation, meaning Evidence Records can be silently lost if the write fails. This directly violates constitution-v1.md Art. 3's immutable evidence chain requirement. Contradiction C03 (evidence chain gaps undetectable) confirms this: because the chain is not validated at write time, gaps in the chain cannot be detected. This is one of the most severe architectural defects in the current implementation — the evidence chain that the Constitution mandates is neither reliably written nor validated for completeness.

**Non-examples:** An Observation is not an Evidence Record — Observations are pre-validation and may be modified. A log entry is not an Evidence Record unless it is written through the governed evidence chain with chain-linking, attribution, and the full required attribute set. An Audit Record (ET-KNW-005) is a subtype of Evidence Record, not a different entity — every Audit Record is also an Evidence Record.

---

### ET-KNW-005 — Audit Record

**Definition:** An Audit Record is a specialised Evidence Record that specifically captures a governed action: a Boundary crossing, a Capability invocation, a Lifecycle Transition, or a Governance decision. Every Audit Record is also an Evidence Record and inherits all Evidence Record attributes and constraints. Audit Records carry additional fields required for governance score computation and compliance tracking.

**Purpose:** To distinguish governance-significant events from general evidence. While all Audit Records are Evidence Records, not all Evidence Records are Audit Records. The distinction matters because Audit Records feed directly into the governance score calculation, are subject to specific retention requirements, and are the primary data source for compliance reporting. Separating this concern from general Evidence prevents governance scoring from being diluted by non-governance-relevant events.

**Required Attributes:**
- Inherits all ET-KNW-004 (Evidence Record) Required Attributes
- `boundary_crossed` (String) — identifier of the Boundary crossed, if applicable; null if this Audit Record concerns something other than a Boundary crossing
- `capability_invoked` (Reference → ET-CAP-001) — the Capability invoked, if applicable
- `lifecycle_transition` (String) — the Lifecycle Transition that occurred, if applicable; expressed as FROM_STATE → TO_STATE
- `governance_score_impact` (Decimal) — quantified positive or negative impact on the Civilisation's governance score

**Lifecycle:**
CREATED (terminal — inherits immutability from Evidence Record)

**Ownership Rule:** Owned by the Governance system.

**Source of Truth:** Evidence Domain

**Permitted Relationships:**
- Inherits all ET-KNW-004 (Evidence Record) Permitted Relationships
- IMPACTS → ET-KNW-007 (Metric) — governance score metrics

**Constraints:**
- All constraints of ET-KNW-004 apply.
- An Audit Record must be produced for every Boundary crossing, every Capability invocation classified as requiring audit, and every Lifecycle Transition that the governing Policy marks as audit-obligated.
- The `governance_score_impact` field must always be populated. An Audit Record with a null governance_score_impact cannot contribute to compliance calculations and defeats its purpose.

**Known Implementation State:**
Audit Records share the implementation gap of Evidence Records — the fire-and-forget write mechanism in governance.js means Audit Records can be silently lost. The civilisation-kernel.js post-response hooks (setImmediate) write episodic memory, decision memory, and audit log entries as FIRE-AND-FORGET operations. This is confirmed as a critical gap per Phase 2.3 — INV-H1 (all failures produce telemetry) is NOT ENFORCED. The governance score computation in telemetry/aggregator.js (Contradiction C06 — aggregator does not write health scores) further limits the usefulness of any Audit Records that are successfully written.

**Non-examples:** A Memory Record is not an Audit Record. A Lesson is not an Audit Record. A general Evidence Record that records an observation (rather than a governed action) is not an Audit Record.

---

### ET-KNW-006 — Observation

**Definition:** An Observation is a structured record of a perception made by a Service or Agent about something that occurred or exists. Observations are the raw material from which Evidence and Metrics are produced. Unlike Evidence Records, Observations may be updated before they are validated — they represent a preliminary, mutable record of a perceived fact.

**Purpose:** To provide a governed staging area for raw perceptions before they enter the immutable Evidence chain. Without the Observation Entity Type, Services and Agents must choose between immediately committing to an immutable Evidence Record (which may be premature) or not recording the perception at all (which loses information). Observations provide the intermediate step.

**Required Attributes:**
- `observation_id` (Identifier) — canonical Identity
- `observer_id` (Reference → ET-IDN-001) — the Entity making the Observation
- `subject_id` (Reference → Entity Identity) — what is being observed
- `observation_type` (String) — what aspect of the subject is being observed
- `observed_value` (Structured) — the observed state or value
- `observed_at` (DateTime, immutable) — when the observation was made
- `validated` (Boolean) — false until the Observation has been converted to Evidence

**Optional Attributes:**
- `validation_evidence_id` (Reference → ET-KNW-004) — the Evidence Record produced when this Observation was validated

**Lifecycle:**
RECORDED → VALIDATED (→ Evidence Record produced) / DISCARDED

VALIDATED means the Observation has been converted to an Evidence Record. DISCARDED means the Observation was found invalid or irrelevant and is no longer retained.

**Ownership Rule:** Owned by the observing Service or Agent.

**Source of Truth:** Operations Domain (transient — Observations are not preserved indefinitely; validated Observations become Evidence)

**Permitted Relationships:**
- IS_MADE_BY → ET-OPS-001 (Agent) or ET-SVC-001 (Service)
- CONCERNS → any Entity
- PRODUCES → ET-KNW-004 (Evidence Record) — upon validation
- FEEDS → ET-KNW-007 (Metric) — validated Observations update Metrics

**Constraints:**
- An Observation must be validated or discarded within a defined retention period. Observations that remain RECORDED indefinitely without validation indicate a stalled observation pipeline.
- A validated Observation's content may not be modified. The `observed_value` at the time of validation is what enters the Evidence chain.

**Known Implementation State:**
Observations are partially implemented via health/monitor.js (recordProviderCall, recordRetrievalCall, recordReflexionWrite, recordPolicyRetrieval) and telemetry/aggregator.js. However, the health snapshot mechanism is disabled — the civilization_health_snapshots table (UR12, partially resolved with dimensions column confirmed) is not receiving writes from the aggregator due to Contradiction C06. The in-memory _state in monitor.js provides ephemeral Observations that are lost on process restart.

**Non-examples:** A log line is not an Observation unless it is governed as an Observation entity with the full required attribute set and is subject to the RECORDED → VALIDATED lifecycle. A raw sensor reading is not an Observation until it is structured into the Observation schema. A final Evidence Record is not an Observation — Evidence is post-validation; Observations are pre-validation.

---

### ET-KNW-007 — Metric

**Definition:** A Metric is a quantifiable measurement of a specific operational aspect of the Civilisation. Metrics support governance score computation, health monitoring, and Objective measurement. APEX defines Metrics at multiple levels: provider health, retrieval success, reflexion quality, and policy compliance. Metrics are derived from validated Observations and Audit Records.

**Purpose:** To provide the numerical basis for governance decisions, health assessments, and objective tracking. Without Metrics, the Civilisation must rely on qualitative assessment of its own state — it cannot know whether it is improving, degrading, or operating within bounds. Metrics make the Civilisation measurable.

**Required Attributes:**
- `metric_id` (Identifier) — canonical Identity
- `metric_name` (String) — canonical name
- `metric_type` (Enumeration: GAUGE | COUNTER | RATIO | SCORE)
- `subject_entity_id` (Reference → Entity Identity) — what is being measured
- `current_value` (Decimal) — the most recent measurement
- `unit` (String) — the unit of measurement (e.g., percentage, count, USD, milliseconds)
- `collection_methodology` (String) — precisely how the value is determined
- `sampled_at` (DateTime) — timestamp of the current_value measurement

**Optional Attributes:**
- `threshold_warning` (Decimal) — value at which a Warning-priority Notification is emitted
- `threshold_critical` (Decimal) — value at which a CRITICAL-priority Notification is emitted
- `history` (List of Structured) — retained historical values with timestamps

**Lifecycle:**
ACTIVE → DEPRECATED

Metrics do not have complex lifecycles — they either exist and are being measured (ACTIVE) or are no longer measured (DEPRECATED). Historical values are preserved even for DEPRECATED metrics.

**Ownership Rule:** Owned by the monitoring Service.

**Source of Truth:** Operations Domain for health metrics; Governance Domain for governance score metrics.

**Permitted Relationships:**
- MEASURES → any Entity — Metrics measure aspects of any entity
- IS_FED_BY → ET-KNW-006 (Observation) — validated Observations update Metrics
- IS_FED_BY → ET-KNW-005 (Audit Record) — governance Audit Records update governance score Metrics
- TRIGGERS → ET-COM-002 (Notification) — when threshold values are crossed

**Constraints:**
- A Metric's `collection_methodology` must be precise enough to be independently reproduced. A Metric whose value cannot be independently verified is architecturally unreliable.
- Threshold values, once set, must not be changed without a governed Entity mutation with accompanying Evidence. Quietly changing thresholds to suppress alerts is a governance violation.

**Known Implementation State:**
Metrics are partially implemented via health/monitor.js (_state in-memory) and telemetry/aggregator.js. However, Contradiction C06 confirms that the aggregator does not write health scores to the civilization_health_snapshots table — Metrics are computed in memory but not persisted. This means historical Metric values are lost on process restart, making trend analysis impossible. INV-H1 (all failures produce telemetry: NOT ENFORCED) directly affects Metric coverage. UR12 (civilization_health_snapshots table partially resolved — dimensions column confirmed) indicates the infrastructure for Metric persistence exists but is not being populated.

**Non-examples:** A log entry is not a Metric — it is a record of an event, not a quantified measurement. A boolean status flag (UP/DOWN) is not a Metric — Metrics are quantifiable; status flags are Observations. A governance verdict (ENFORCED/NOT ENFORCED) is a Certification result, not a Metric.

---

### ET-KNW-008 — Reflection

**Definition:** A Reflection is a synthesised analysis of past Agent behaviour patterns and outcomes, used to improve future performance. Reflections are produced by the reflection engine after Agent Task completion or on a periodic schedule. A Reflection analyses completed Task outcomes, scores their quality, produces Lessons, and generates adaptation recommendations for the Agent.

**Purpose:** To close the learning loop between task execution and future behaviour improvement. Without Reflection entities, Agents accumulate execution records but do not systematically learn from them. Reflection is the mechanism by which the Civilisation's agents become better over time — by explicitly analysing past behaviour and extracting actionable lessons.

**Required Attributes:**
- `reflection_id` (Identifier) — canonical Identity
- `agent_id` (Reference → ET-OPS-001) — the Agent this Reflection concerns
- `source_task_ids` (List of References → ET-OPS-002) — the Agent Tasks that triggered this Reflection
- `lessons_produced` (List of References → ET-KNW-002) — Lesson entities produced by this Reflection
- `adaptation_recommendations` (Structured) — structured recommendations for future Agent behaviour
- `produced_by_model` (Reference → ET-CAP-003) — which Model produced this Reflection
- `created_at` (DateTime, immutable)

**Optional Attributes:**
- `quality_score` (Decimal) — an assessment of the quality of the Reflection itself

**Lifecycle:**
CREATED → APPLIED / ARCHIVED

APPLIED indicates the adaptation recommendations have been incorporated into the Agent's operating parameters. ARCHIVED indicates the Reflection is retained for historical purposes but its recommendations are no longer active.

**Ownership Rule:** Owned by the Agent it concerns.

**Source of Truth:** Knowledge Domain

**Permitted Relationships:**
- CONCERNS → ET-OPS-001 (Agent)
- ANALYSES → ET-OPS-002 (Agent Task)
- PRODUCES → ET-KNW-002 (Lesson)
- IS_PRODUCED_BY → ET-CAP-003 (Model)

**Constraints:**
- A Reflection must produce at least one Lesson to be considered architecturally complete. A Reflection that analyses task history but produces no Lessons has failed its core purpose.
- The `produced_by_model` field must always be populated — knowing which Model produced a Reflection is essential for evaluating the quality of the analysis and for attribution in the Evidence chain.

**Known Implementation State:**
Reflections are partially implemented via reflection-engine.js and agent-task-cycle.js. The reflexion influence tracking on task completion is confirmed operational. However, defect B1 (decisionMemoryId always null in reflexion-tracker.js — queries `'id'` instead of `'memory_id'`) means that Reflections involving DECISION memory records cannot correctly link to their Decision Record sources. Contradiction C04 (reflexion-tracker records null decision links) is a direct documentation of this gap. The Haiku model is confirmed as the production model for Reflection generation.

**Non-examples:** A single Lesson is not a Reflection — a Reflection is the synthesis process that produces Lessons. A Memory Record is not a Reflection — Memory Records hold experience; Reflections analyse it. A governance audit is not a Reflection — governance audits assess external compliance; Reflections assess internal Agent behaviour.

---

### ET-KNW-009 — Document

**Definition:** A Document is a structured knowledge artifact within the Civilisation — a file-level unit of content with a defined purpose, owner, and location within the knowledge system. Documents differ from Knowledge Articles (which are machine-maintained knowledge entries) and from Files (ET-PHY-003, which are physical artifacts) — a Document is a governed content entity that carries full metadata, has a Lifecycle, and is a first-class architectural object whose existence is registered.

**Purpose:** To make file-level content artifacts governable as Civilisation entities rather than simply as physical files. Without the Document Entity Type, the content artifacts produced by Agent Tasks (specifications, reports, plans, logs) are ungoverned — they exist in the file system without owners, without lifecycle governance, and without the ability to participate in Relationships with other Civilisation entities.

**Required Attributes:**
- `document_id` (Identifier) — canonical Identity
- `title` (String) — canonical name
- `document_type` (Enumeration: SPECIFICATION | POLICY | REPORT | PLAN | REFERENCE | LOG | VAULT_ENTRY)
- `owner_id` (Reference → ET-IDN-001) — the Entity responsible for this Document
- `content_ref` (Reference → ET-PHY-003) — reference to the physical File containing this Document's content
- `created_at` (DateTime, immutable)
- `updated_at` (DateTime) — timestamp of most recent content update
- `status` (Enumeration: DRAFT | ACTIVE | ARCHIVED | SUPERSEDED)

**Optional Attributes:**
- `summary` (String) — a brief summary of the Document's content for retrieval
- `superseded_by_id` (Reference → ET-KNW-009) — if SUPERSEDED, reference to the replacing Document

**Lifecycle:**
DRAFT → ACTIVE → ARCHIVED / SUPERSEDED

DRAFT is the initial state when the Document is being created. ACTIVE is the operational state. ARCHIVED and SUPERSEDED are terminal states — the Document is no longer current but its record is retained.

**Ownership Rule:** Owned by its creator or the relevant Domain's governing Entity.

**Source of Truth:** Knowledge Domain (metadata); Physical Domain (content, via ET-PHY-003)

**Permitted Relationships:**
- IS_IMPLEMENTED_BY → ET-PHY-003 (File) — the Document's physical content exists in a File
- IS_OWNED_BY → ET-OPS-001 (Agent) or ET-GOV-001 (Founder) or ET-EXE-002 (Council Member)
- SUPERSEDES → ET-KNW-009 (Document)

**Constraints:**
- A Document must have a corresponding Physical File (ET-PHY-003) for its content. A Document entity without a physical content reference is a metadata record with no content — this is permitted only for Documents in DRAFT state during the content creation process.
- An ACTIVE Document's `content_ref` must point to an existing, accessible File. A broken content reference is a governance gap that must be reported.

**Known Implementation State:**
Documents are partially implemented. The Agent Task step allowlist includes create_document, summarize_document, rename_document, and delete_document operations, confirming that Documents are actively managed by Agents. The Obsidian vault (accessed via obsidian-memory.js) is the primary repository for Document content. However, Documents are not registered as formal Entities with Registry Records — their existence is tracked implicitly through the file system rather than through a governed Document Registry. No specific defect codes apply directly to Documents.

**Non-examples:** A Knowledge Article is not a Document — Knowledge Articles are machine-maintained structured knowledge entries; Documents are governed content artifacts. A Memory Record is not a Document — Memory Records are experiential; Documents are deliberate content artifacts. A File is not a Document — a File (ET-PHY-003) is the physical storage of a Document's content; the Document is the governed entity that owns that File.

---

## Section 7 — Layer 5: Intent Entity Types

Layer 5 contains the four Entity Types that represent purpose, planning, and direction — what the Civilisation intends to achieve. Intent entities are the goal-bearing layer: they hold the "why" behind all operational activity and provide the basis for evaluating whether that activity is advancing the Civilisation's objectives.

The Intent Layer is notable for its architectural contradictions in the current implementation. Contradiction C13 (two independent goal systems operating in isolation) is the most significant structural defect in this layer — the goal-graph.js Supabase single-row system and the agent-system/goal-tracker.js filesystem JSON system represent two incompatible implementations of the same architectural concept, with no reconciliation mechanism and no designated Source of Truth. Contradiction C09 (strategic planning is ephemeral — Objectives expire in 2 hours) establishes that the current Objective implementation cannot fulfill the persistence requirements of this Entity Type.

---

### ET-INT-001 — Goal

**Definition:** A Goal is a declared desired future state of the Civilisation or a component thereof. Goals express what the Civilisation intends to achieve — they are the canonical statement of purpose against which all Projects, Workflows, and Agent Tasks are ultimately evaluated. ARCH-01 defines a single canonical Goal Entity Type; ARCH-05 will designate a single authoritative Source of Truth for Goals and resolve Contradiction C13.

**Purpose:** To provide the top-level declaration of Civilisation intent. Without Goals, all Projects and Agent Tasks are activity without purpose — there is no way to evaluate whether the work being done advances what the Civilisation is trying to achieve, and no basis for prioritisation between competing demands.

**Required Attributes:**
- `goal_id` (Identifier) — canonical Identity
- `title` (String) — canonical name
- `description` (String) — the desired future state, expressed in outcome terms (not in terms of activities to perform)
- `owner_id` (Reference → ET-IDN-001) — the Entity accountable for this Goal
- `goal_horizon` (Enumeration: SHORT_TERM | MEDIUM_TERM | LONG_TERM | VISIONARY)
- `constitutional_alignment` (String) — which constitutional article motivates this Goal; Goals must derive from the Civilisation's constitutional purpose
- `status` (Enumeration: DECLARED | ACTIVE | ACHIEVED | ABANDONED)
- `declared_at` (DateTime, immutable)

**Optional Attributes:**
- `target_date` (DateTime) — the desired achievement date, if time-bounded
- `priority` (Integer) — relative priority among active Goals; used for resource allocation decisions

**Lifecycle:**
DECLARED → ACTIVE → ACHIEVED / ABANDONED

DECLARED is the initial state when a Goal has been stated but not yet given operational priority. ACTIVE means the Civilisation is actively pursuing it. ACHIEVED and ABANDONED are both terminal.

**Ownership Rule:** Owned by the Founder or delegated Council Member.

**Source of Truth:** Intent Domain (one authoritative source — to be designated in ARCH-05; Contradiction C13 must be resolved before this Source of Truth can be formally designated)

**Permitted Relationships:**
- HAS → ET-INT-002 (Objective) — Goals decompose into measurable Objectives
- IS_PURSUED_BY → ET-INT-003 (Project) — Projects are initiated to pursue Goals
- IS_OWNED_BY → ET-GOV-001 (Founder) or ET-EXE-002 (Council Member)

**Constraints:**
- A Goal must be expressed in outcome terms, not activity terms. "Build feature X" is not a Goal; "achieve capability Y that serves the Founder's objective Z" is a Goal. This distinction is enforced architecturally by requiring `description` to specify a desired future state.
- A Goal must have a `constitutional_alignment` — the Civilisation does not pursue arbitrary objectives; it pursues outcomes that derive from its constitutional purpose.
- At any time, the set of ACTIVE Goals must have a single authoritative Source of Truth. Until C13 is resolved, creating new Goal instances must target the system designated as canonical by ARCH-05 upon ratification.

**Known Implementation State:**
Goals are partially implemented with a confirmed Contradiction. The goal-graph.js system uses a Supabase single-row goal structure. The agent-system/goal-tracker.js system uses a filesystem JSON file. These two systems operate independently with no reconciliation mechanism — Contradiction C13. Neither is designated as the canonical Source of Truth. INV-G1 and INV-G2 (Goal management consistency requirements) are both NOT ENFORCED. Until ARCH-05 resolves C13, all Goal creation must be treated as architecturally provisional pending Source of Truth designation.

**Non-examples:** An Objective is not a Goal — Objectives are the measurable sub-goals that constitute progress toward a Goal. A Project is not a Goal — a Project is the vehicle for pursuing a Goal. A Task is not a Goal — a Task is an execution unit; Goals are the purpose that execution serves.

---

### ET-INT-002 — Objective

**Definition:** An Objective is a specific, measurable sub-goal that, when achieved, constitutes progress toward a parent Goal. Objectives are the measurement units of Goal progress — they decompose an aspirational Goal into discrete, verifiable achievements. An Objective has a defined success criterion and a Metric that measures progress toward it.

**Purpose:** To make Goals measurable by decomposing them into specific, verifiable achievements. A Goal states what the Civilisation wants to achieve; Objectives define what must be true for that achievement to be confirmed. Without Objectives, Goal achievement cannot be formally declared — the Civilisation can only assert progress, not measure it.

**Required Attributes:**
- `objective_id` (Identifier) — canonical Identity
- `parent_goal_id` (Reference → ET-INT-001) — the Goal this Objective serves
- `title` (String) — canonical name
- `success_criterion` (String) — precisely what must be true for this Objective to be considered MET
- `measurement_metric_id` (Reference → ET-KNW-007) — the Metric that measures progress toward this Objective
- `status` (Enumeration: PENDING | ACTIVE | MET | MISSED | DEFERRED)
- `created_at` (DateTime, immutable)

**Optional Attributes:**
- `target_date` (DateTime) — by when this Objective should be MET
- `weight` (Decimal: 0.0–1.0) — contribution of this Objective to overall Goal achievement; weights across an Objective set for a Goal should sum to 1.0

**Lifecycle:**
PENDING → ACTIVE → MET / MISSED / DEFERRED

PENDING means the Objective has been defined but is not yet being actively pursued. ACTIVE means it is in progress. MET and MISSED are terminal outcomes. DEFERRED returns the Objective to PENDING for future activation.

**Ownership Rule:** Owned by the parent Goal's owner.

**Source of Truth:** Intent Domain

**Permitted Relationships:**
- IS_PART_OF → ET-INT-001 (Goal)
- IS_MEASURED_BY → ET-KNW-007 (Metric)
- IS_ADVANCED_BY → ET-INT-003 (Project)

**Constraints:**
- An Objective's `success_criterion` must be independently evaluable. A criterion that requires subjective judgment cannot be used to formally declare the Objective MET — it must be reformulated with an objective, verifiable standard.
- An Objective's `measurement_metric_id` must reference an ACTIVE Metric. An Objective linked to a DEPRECATED or non-existent Metric cannot be measured and must be treated as DEFERRED until a valid Metric is designated.

**Known Implementation State:**
Objectives are implemented with a critical defect: strategic-planning-engine.js uses OBJECTIVE_TTL_MS = 2 hours, meaning all Objectives expire and are lost two hours after creation. Contradiction C09 (strategic planning is ephemeral) documents this directly. The architectural requirement for Objectives is durable persistence with a full lifecycle — the current two-hour TTL means Objectives cannot fulfill this requirement. Any Objective created in the current implementation is architecturally provisional until durable persistence is established.

**Non-examples:** A Project milestone is not an Objective — Milestones are phase markers within a Project; Objectives are measurements of Goal progress. A task completion is not an Objective — task completions are operational events; Objectives are strategic measurements. A Key Performance Indicator is a specific form of Objective when formally registered with a success criterion and measurement Metric — an informal KPI is not an Objective.

---

### ET-INT-003 — Project

**Definition:** A Project is a bounded, purposeful initiative pursuing one or more Goals through a defined set of Workflows and Resource allocations. Projects are the primary organisational unit for significant work — they link strategic intent (Goals) to operational execution (Workflow Runs) and resource consumption (Budgets).

**Purpose:** To provide the organisational container that links strategic intent to operational execution. Without Projects, Goals are pursued through uncoordinated Workflow Runs with no shared context, no budget envelope, and no defined scope. Projects create the structure within which purposeful, coordinated work occurs.

**Required Attributes:**
- `project_id` (Identifier) — canonical Identity
- `title` (String) — canonical name
- `parent_goal_ids` (List of References → ET-INT-001) — the Goals this Project pursues; a Project must serve at least one Goal
- `owner_id` (Reference → ET-IDN-001) — the Entity accountable for this Project's outcomes
- `scope` (String) — a precise statement of what is included in and excluded from this Project
- `budget_id` (Reference → ET-RES-002) — the Budget allocation for this Project
- `status` (Enumeration: PROPOSED | APPROVED | ACTIVE | COMPLETED | ABANDONED)
- `started_at` (DateTime) — populated when status transitions to ACTIVE

**Optional Attributes:**
- `target_completion_date` (DateTime) — when the Project is expected to complete

**Lifecycle:**
PROPOSED → APPROVED → ACTIVE → COMPLETED / ABANDONED

PROPOSED is the initial state. APPROVED means the Project has received EXECUTIVE authority to proceed. ACTIVE means work is underway. COMPLETED and ABANDONED are terminal.

**Ownership Rule:** Owned by the Founder or delegated Council Member.

**Source of Truth:** Intent Domain

**Permitted Relationships:**
- PURSUES → ET-INT-001 (Goal)
- CONTAINS → ET-INT-004 (Milestone)
- CONSUMES → ET-RES-002 (Budget)
- EXECUTES_VIA → ET-OPS-003 (Workflow Run)
- IS_OWNED_BY → ET-GOV-001 (Founder) or ET-EXE-002 (Council Member)

**Constraints:**
- A Project must reference at least one parent Goal. A Project that cannot trace to any Goal is purposeless from the Civilisation's perspective and must not be APPROVED.
- A Project must have an approved Budget before transitioning from APPROVED to ACTIVE. An Active Project without a Budget has no governed resource constraint and risks unconstitutional expenditure.

**Known Implementation State:**
Projects are partially implemented via the Master Orchestrator (master-orchestrator.js), which manages concurrent workstreams (maximum three) and tracks feature completion via planFeature and markFeatureComplete. However, Projects are not registered as formal Entities with Registry Records — they are tracked implicitly through orchestrator state. No specific defect codes apply directly to Project entities.

**Non-examples:** A Workflow Run is not a Project — a Workflow Run is a single execution unit; a Project is the governing container for multiple related Runs. An Agent Task is not a Project. A Goal is not a Project — a Goal states what the Civilisation wants to achieve; a Project is the initiative that pursues it.

---

### ET-INT-004 — Milestone

**Definition:** A Milestone is a significant, predefined point in a Project's execution that marks the completion of a phase or the achievement of a meaningful threshold. Milestones provide governance checkpoints — they are the points at which progress is formally assessed, and at which EXECUTIVE authority may be required to authorise the next phase.

**Purpose:** To decompose Project execution into discrete, verifiable phases. Without Milestones, a Project transitions from ACTIVE to COMPLETED (or ABANDONED) without any intermediate accountability checkpoints. Milestones create the governance rhythm within which Projects are actively managed rather than simply run to completion or failure.

**Required Attributes:**
- `milestone_id` (Identifier) — canonical Identity
- `parent_project_id` (Reference → ET-INT-003) — the Project this Milestone belongs to
- `title` (String) — canonical name
- `completion_criterion` (String) — precisely what must be true for this Milestone to be declared REACHED
- `status` (Enumeration: PENDING | REACHED | MISSED)
- `target_date` (DateTime) — when this Milestone is expected to be reached

**Optional Attributes:**
- `governance_gate` (Boolean) — if true, reaching this Milestone triggers a governance review before the Project may continue

**Lifecycle:**
PENDING → REACHED / MISSED

Milestones have no intermediate states — they are either in progress (PENDING) or have been resolved (REACHED or MISSED). A MISSED Milestone does not automatically terminate its parent Project but must trigger a governance review.

**Ownership Rule:** Owned by the parent Project's owner.

**Source of Truth:** Intent Domain

**Permitted Relationships:**
- IS_PART_OF → ET-INT-003 (Project)
- TRIGGERS → ET-GOV-005 (Certification) — governance gate Milestones may trigger re-certification

**Constraints:**
- A Milestone's `completion_criterion` must be independently verifiable, following the same standard as Objective success criteria.
- A Milestone that is MISSED must produce an Evidence Record. Silently missing a Milestone without evidence is a governance gap.

**Known Implementation State:**
Milestones are not formally implemented in the current codebase as registered entities. The markFeatureComplete function in master-orchestrator.js represents the closest equivalent — feature completions are milestone-level events in practice. However, these are not registered as Milestone entities, have no formal lifecycle management, and produce no Evidence Records on completion or failure. Milestone formalisation is a Phase 3 registry population obligation.

**Non-examples:** An Agent Task completion is not a Milestone — task completions are operational events; Milestones are project governance checkpoints. An Objective being MET is not a Milestone — Objectives measure Goal progress; Milestones mark Project phases. A sprint review is not a Milestone unless formally registered as one with a completion criterion and Evidence obligation.

---

## Section 8 — Layer 6: Communication Entity Types

Layer 6 contains the six Entity Types that govern how information is transmitted, how state changes are announced, and how interaction context is maintained within the Civilisation. Communication entities are the connective tissue of the architecture — they carry signals between operational entities, preserve the context of interaction, and route alerts to the Founder.

Communication entities differ from Knowledge entities in directionality: Knowledge entities hold accumulated information; Communication entities are carriers of specific, time-stamped signals. An Event announces that something happened. A Notification delivers that announcement to a specific recipient. A Session holds the interaction context within which Conversations unfold. A Message is the individual unit of exchange. A Prompt is the structured input pattern for a Model invocation.

The Communication Layer has significant implementation debt. The current Event Bus holds no persistence, the Notification delivery chain has a confirmed silent-failure mode, and Session state has two competing representations. These are defects, not architectural definitions — the Entity Types below define the canonical architecture, not the current broken state.

---

### ET-COM-001 — Event

**Definition:** An Event is an immutable, timestamped announcement that a specific occurrence has taken place within the Civilisation. Events are the canonical mechanism for propagating state changes to all interested parties without polling or direct coupling. Once emitted, an Event cannot be modified, retracted, or selectively withheld from subscribers. Every significant occurrence in the Civilisation must produce an Event if other entities need to know about it.

**Purpose:** To decouple the entity that experiences an occurrence from the entities that must respond to it. Without Events, every response chain requires direct coupling — the Agent completing a Task must directly call the notification service, the audit logger, the queue manager, and every other concerned system. Events invert this dependency: the Agent emits a single Event; registered consumers determine their own response. This architecture enables the Civilisation to add new response behaviours without modifying the emitting entity.

**Required Attributes:**
- `event_id` (Identifier) — canonical Identity, UUID v4
- `event_type` (Enumeration) — the registered Event Type from the Civilisation Event Registry; must be one of the admitted types
- `emitted_by_id` (Reference) — the Identity of the Entity that emitted this Event
- `emitted_at` (DateTime) — the precise timestamp of emission
- `idempotency_key` (String) — enables duplicate detection by consumers; consumers must track received keys to prevent double-processing
- `content_hash` (Hash) — SHA-256 of the payload; enables integrity verification
- `correlation_id` (Identifier) — links this Event to its parent Workflow Run or Session; enables causal chain reconstruction
- `schema_version` (String) — which version of this Event Type's schema the payload conforms to
- `payload` (Structured) — structured data describing the occurrence; schema governed by the Event Type definition

**Optional Attributes:**
- `ttl_ms` (Integer) — time-to-live; after expiry, undelivered Events need not be delivered
- `priority` (Enumeration: CRITICAL | HIGH | NORMAL | LOW) — delivery priority for prioritised dispatch implementations

**Lifecycle:**
EMITTED (terminal — an Event is immutable and non-retractable from the moment of emission)

**Ownership Rule:** Owned by the emitting Entity.

**Source of Truth:** Events Domain — the append-only event log. Currently not persisted; persistence is a required architectural correction.

**Permitted Relationships:**
- IS_EMITTED_BY → any Entity
- TRIGGERS → ET-OPS-002 (Agent Task), ET-COM-002 (Notification), further Events
- IS_PART_OF → ET-OPS-003 (Workflow Run) via correlation_id

**Constraints:**
- An Event's `event_type` must be a registered, admitted type in the Event Type Registry. Unregistered Event Types must be rejected at emission time.
- An Event is immutable after emission. No process may alter an Event's payload, timestamp, or identity after it has been placed on the Event Bus.
- An Event must carry a `correlation_id` linking it to a Workflow Run or Session. Orphan Events with no correlation context are architectural defects.

**Known Implementation State:**
The current implementation maintains 16 confirmed Event Types in lib/event-bus.js. Dispatch is via setImmediate (asynchronous, no delivery guarantee). There is no persistence layer — Events are lost on process restart and cannot be replayed. There is no idempotency enforcement — duplicate Events can be delivered to consumers. There is no schema validation at emission time — malformed payloads are silently dispatched. The rolling in-memory log (_log capped at 200 entries) provides no durable audit trail. None of these are architectural definitions — they are implementation gaps that Phase 4 must resolve.

**Non-examples:** A Notification (ET-COM-002) is not an Event — a Notification is a directed message to a specific recipient; an Event is broadcast to all subscribers. A log entry is not an Event — log entries have no consumer dispatch mechanism and carry no governance significance. A database row insert is not an Event — it is a persistence operation that may produce an Event as a consequence.

---

### ET-COM-002 — Notification

**Definition:** A Notification is a directed message generated by the Civilisation and delivered to a specific, named recipient — typically the Founder — triggered by an Event, a threshold crossing, or a constitutional obligation. Notifications are distinct from Events: Events are broadcast announcements; Notifications are targeted deliveries with delivery confirmation obligations. A Notification that cannot be delivered must not be silently discarded.

**Purpose:** To ensure that the Founder receives timely, actionable awareness of Civilisation conditions that require human attention. Without Notifications, the Civilisation operates silently — it may detect critical conditions but has no mechanism to bring them to the Founder's attention. Constitution-v1.md Art. 7 mandates specific notification behaviours for critical conditions, making this Entity Type constitutionally required.

**Required Attributes:**
- `notification_id` (Identifier) — canonical Identity
- `trigger_event_id` (Reference → ET-COM-001) — the Event that triggered this Notification
- `recipient_id` (Reference → ET-GOV-001 or other Entity) — the specific recipient
- `channel` (Enumeration: SLACK | PUSH | EMAIL | IN_APP) — delivery channel
- `priority` (Enumeration: CRITICAL | HIGH | MEDIUM | LOW) — governs delivery urgency and retry behaviour
- `content` (String) — the notification message content
- `sent_at` (DateTime) — when delivery was attempted
- `status` (Enumeration: PENDING | SENT | DELIVERED | FAILED)

**Optional Attributes:**
- `retry_count` (Integer) — number of delivery attempts made
- `delivered_at` (DateTime) — when delivery was confirmed
- `acknowledged_at` (DateTime) — when the recipient acknowledged the Notification
- `failure_reason` (String) — if status is FAILED, why delivery failed

**Lifecycle:**
PENDING → SENT → DELIVERED / FAILED

A FAILED Notification must trigger a retry or escalation. Silent failure is constitutionally prohibited for CRITICAL priority Notifications.

**Ownership Rule:** Owned by the notification Service.

**Source of Truth:** Communications Domain.

**Permitted Relationships:**
- IS_TRIGGERED_BY → ET-COM-001 (Event)
- IS_ADDRESSED_TO → ET-GOV-001 (Founder) or other Entity
- ESCALATES_VIA → delivery channel Service

**Constraints:**
- A CRITICAL Notification must be delivered within five minutes of its trigger Event per constitution-v1.md Art. 7. Failure to deliver within this window is a constitutional violation requiring its own Evidence Record.
- A FAILED Notification may not be silently discarded. It must either be retried or produce an Evidence Record of the failure.

**Known Implementation State:**
Notification delivery is implemented via services/slack/ (alertCritical, alertError, alertHealthAnomaly, alertBudgetThreshold). A confirmed defect exists in event-consumer.js: Slack delivery failures are silently swallowed with no retry, no failure Evidence Record, and no fallback channel. This means CRITICAL Notifications — including those required by constitution-v1.md Art. 7 — may fail without any trace. No delivery confirmation mechanism exists in the current implementation.

**Non-examples:** An Event (ET-COM-001) is not a Notification — Events are broadcast; Notifications are targeted. An internal log line is not a Notification — it has no delivery mechanism and no recipient governance. A dashboard status indicator is not a Notification — it is a UI projection of Metric state, not a triggered directed message.

---

### ET-COM-003 — Session

**Definition:** A Session is a bounded interaction context established between the Founder and the Civilisation when a communication channel is opened. A Session provides the operational container within which Conversations unfold, Working Memory operates, and identity is resolved for the duration of the interaction. A Session begins when a channel connection is established and ends either explicitly (by the Founder closing the connection) or implicitly (by timeout).

**Purpose:** To provide the temporal and contextual boundary within which interaction-scoped state is managed. Without Sessions, there is no architectural concept governing the lifecycle of interaction context — Working Memory has no beginning or end, conversation history has no container, and identity resolution has no scope. Sessions are the governance unit for interaction-level state.

**Required Attributes:**
- `session_id` (Identifier) — canonical Identity
- `initiated_by_id` (Reference → ET-GOV-001) — the Entity initiating the Session (typically the Founder)
- `channel_type` (Enumeration: WEBSOCKET | HTTP | INTERNAL) — the communication channel type
- `started_at` (DateTime) — when the Session was established
- `ended_at` (DateTime) — when the Session was closed or timed out (null while ACTIVE)
- `status` (Enumeration: INITIATED | ACTIVE | CLOSED | TIMED_OUT)

**Optional Attributes:**
- `last_active_at` (DateTime) — timestamp of the most recent activity within this Session
- `keepalive_interval_ms` (Integer) — how frequently keepalive signals are expected
- `working_memory_ref` (Reference → ET-KNW-001) — the Working Memory Record scoped to this Session

**Lifecycle:**
INITIATED → ACTIVE → CLOSED / TIMED_OUT

TIMED_OUT occurs when no activity is received within the keepalive window (60 seconds in the current WebSocket implementation). CLOSED is an explicit termination.

**Ownership Rule:** Owned by the Founder.

**Source of Truth:** Session Domain. A confirmed architectural gap exists: two independent representations of Session state are maintained — the Working Memory store and the WebSocket connection registry — without a designated single Source of Truth. ARCH-05 must resolve this conflict.

**Permitted Relationships:**
- CONTAINS → ET-COM-004 (Conversation)
- IS_IDENTIFIED_BY → ET-IDN-005 (Session Identity)
- HAS_WORKING_MEMORY → ET-KNW-001 (Memory Record of type WORKING)

**Constraints:**
- A Session must be associated with exactly one resolved Identity (ET-IDN-005). A Session with no resolved Identity must use the ANONYMOUS identity — it may not be left unidentified.
- Working Memory scoped to a Session must be explicitly expired or archived when the Session transitions to CLOSED or TIMED_OUT.

**Known Implementation State:**
Sessions are managed by lib/ws-handler.js (WebSocket: 60-second keepalive, timingSafeEqual authentication, 5 message types) and implicitly by the HTTP request chain. The confirmed dual-representation problem — Working Memory in the database and WebSocket state in the runtime — means Session state has two sources of truth with no reconciliation mechanism. The session_id is not formally registered as a governed entity in the current implementation; it is an implicit runtime concept.

**Non-examples:** An HTTP request is not a Session — an HTTP request is a single transaction within a Session. A Workflow Run is not a Session — a Workflow Run is an execution context; a Session is an interaction context. An Agent Task is not a Session — Agent Tasks run within the Civilisation's operational layer, not the interaction layer.

---

### ET-COM-004 — Conversation

**Definition:** A Conversation is the sequential record of an exchange of Messages between the Founder and the Civilisation within a specific Session. A Conversation accumulates Messages in order and is subject to compression when its length exceeds retention bounds. The Conversation is the primary context object from which the Civilisation constructs prompts for Model invocations.

**Purpose:** To maintain coherent, accessible interaction history within a Session. Without the Conversation Entity Type, each Message is an isolated event with no context — the Civilisation cannot build on prior exchanges, cannot maintain topical coherence, and cannot provide meaningful responses to references made earlier in an interaction. The Conversation provides the temporal thread.

**Required Attributes:**
- `conversation_id` (Identifier) — canonical Identity
- `session_id` (Reference → ET-COM-003) — the parent Session
- `message_count` (Integer) — current number of Messages in this Conversation
- `compression_count` (Integer) — number of times this Conversation's history has been compressed
- `started_at` (DateTime) — when this Conversation began
- `status` (Enumeration: ACTIVE | COMPLETED | COMPRESSED)

**Optional Attributes:**
- `last_compressed_at` (DateTime) — when the most recent compression occurred
- `topic_summary` (String) — a brief summary of the Conversation's subject, maintained by the compression process

**Lifecycle:**
ACTIVE → COMPLETED / COMPRESSED

A COMPRESSED Conversation has had its older Messages summarised and replaced with a compressed representation. Compression occurs every 20 messages in the current implementation. COMPLETED is the terminal state when the parent Session closes.

**Ownership Rule:** Owned by the Session's owner (the Founder).

**Source of Truth:** Session Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-COM-003 (Session)
- CONTAINS → ET-COM-005 (Message)
- IS_SUMMARISED_AS → ET-KNW-001 (Memory Record of type EPISODIC — compression output)

**Constraints:**
- A Conversation must belong to exactly one Session. Conversations may not span Sessions.
- Compression of a Conversation must preserve the informational content of compressed Messages in a summary record before the original Messages are discarded.

**Known Implementation State:**
Conversations are managed by chat-context.js, which builds the prompt from the conversation history (up to 2 PAST CONTEXT blocks) and triggers compression every 20 messages. Compression is implemented via summarisation using the Model. The getMemorySummary function uses a 5-minute cache with an in-flight guard to prevent concurrent summary generation. No formal Conversation entity with a registered Identity is maintained in the current implementation — Conversation state is implicit in the message history.

**Non-examples:** A Session is not a Conversation — a Session may contain multiple Conversations, and a Session has channel-level attributes (keepalive, authentication) that Conversations do not. A Workflow Run is not a Conversation — Workflow Runs are execution contexts; Conversations are interaction records.

---

### ET-COM-005 — Message

**Definition:** A Message is an individual, immutable unit of communication within a Conversation, carrying content from a sender to the Conversation record. Messages are the atomic units of the Conversation — they cannot be divided, they cannot be modified after sending, and they must be ordered within their parent Conversation.

**Purpose:** To provide the indivisible unit of interaction. Without the Message Entity Type, the Conversation is an undifferentiated blob of text with no attribution, no sequencing, and no individual governance. Messages enable attribution (who said what), sequencing (in what order), and type discrimination (is this a user input, a system response, or an agent status report).

**Required Attributes:**
- `message_id` (Identifier) — canonical Identity
- `conversation_id` (Reference → ET-COM-004) — the parent Conversation
- `sender_id` (Reference) — the Identity of the Entity sending this Message
- `message_type` (Enumeration: USER_INPUT | SYSTEM_RESPONSE | AGENT_STATUS | VOICE_TRANSCRIPT | BROWSER_SNAPSHOT) — the category of this Message
- `content` (String) — the message content
- `sent_at` (DateTime) — when this Message was sent

**Optional Attributes:**
- `sequence_number` (Integer) — the position of this Message within its Conversation
- `token_count` (Integer) — the token count of the content (for context window management)
- `tool_invocations` (Structured) — if this Message involved Tool invocations, their records

**Lifecycle:**
SENT (terminal — Messages are immutable after sending)

**Ownership Rule:** Owned by the sender entity.

**Source of Truth:** Session Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-COM-004 (Conversation)
- IS_SENT_BY → Entity (sender)
- TRIGGERS → ET-CAP-003 (Model) invocation for SYSTEM_RESPONSE generation

**Constraints:**
- A Message is immutable after sending. No process may alter a Message's content, sender attribution, or timestamp.
- A Message must belong to exactly one Conversation. Messages may not be moved between Conversations.

**Known Implementation State:**
Messages of five types are confirmed in lib/ws-handler.js: subscribe, ping, voice:transcript, agent:status, and browser:snapshot. The chat-context.js USER MESSAGE block represents the USER_INPUT type. Messages are not formally registered as entities with Identities in the current implementation — they exist as entries in the conversation history array. No message-level audit trail exists.

**Non-examples:** A log entry is not a Message — log entries have no sender attribution, no conversation membership, and no governance significance. An Event is not a Message — Events are broadcast announcements; Messages are conversation-scoped communications.

---

### ET-COM-006 — Prompt

**Definition:** A Prompt is a structured, versioned input pattern constructed by the Civilisation for presentation to a Model. A Prompt is composed of multiple context blocks assembled in a defined order, each block drawing from a specific Knowledge or operational source. The canonical prompt structure is a governed artifact — its composition rules determine the quality and governance-alignment of every Model response.

**Purpose:** To formalise the input presented to Models as a governed, versioned artifact rather than an ad-hoc string. Without the Prompt Entity Type, prompt construction is implementation-level code with no governance visibility, no versioning, and no architectural accountability. Formalising Prompts as entities enables the Civilisation to track which prompt structures produce which outcomes, to version prompt changes, and to apply governance review to changes that affect how the Civilisation presents itself to its reasoning engine.

**Required Attributes:**
- `prompt_id` (Identifier) — canonical Identity
- `prompt_type` (Enumeration: CHAT_CONTEXT | AGENT_TASK | REFLECTION | TOOL_INVOCATION | EXECUTIVE_SYNTHESIS) — the category of Model invocation this Prompt serves
- `block_structure` (Structured) — the ordered list of context blocks with their source references and assembly rules
- `model_tier_target` (Reference → ET-CAP-004) — the Model Tier this Prompt is designed for
- `version` (String) — current version; changes to block structure or assembly rules require version increment
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `token_count_estimate` (Integer) — estimated token count of a fully-assembled Prompt of this type
- `compression_applied` (Boolean) — whether context blocks in this Prompt may be compressed when the total exceeds Model context limits

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the Service responsible for prompt construction.

**Source of Truth:** Capability Domain.

**Permitted Relationships:**
- IS_PRESENTED_TO → ET-CAP-003 (Model)
- DRAWS_FROM → ET-KNW-001 (Memory Record), ET-KNW-003 (Knowledge Article), ET-COM-004 (Conversation)
- SUPERSEDES → prior version of this Prompt type

**Constraints:**
- Changes to a Prompt's block_structure or assembly rules require a version increment. Silent modification of Prompt structure without versioning is an architectural defect — it makes Prompt behaviour non-reproducible.
- A Prompt's model_tier_target must be an admitted Model Tier. A Prompt constructed for a deprecated Model Tier must be updated.

**Known Implementation State:**
The canonical CHAT_CONTEXT Prompt is constructed by chat-context.js buildPrompt, which assembles 13 named context blocks in a defined order (SELF-STATE, FOUNDER ALIGNMENT, STRATEGIC INTELLIGENCE, KNOWLEDGE CONNECTIONS up to 4, PAST CONTEXT up to 2, USER MESSAGE, and others). This structure is implemented but not versioned and not registered as a formal entity. Changes to buildPrompt have no governance record and no version trail. The 13-block structure is a confirmed architectural fact from Phase 2.2.

**Non-examples:** A Model's output is not a Prompt — Prompts are inputs. A Message is not a Prompt — a Message is a single communication unit within a Conversation; a Prompt is a fully assembled, multi-block input structure. A system instruction string is not a Prompt unless it is assembled as part of a Prompt entity with full block structure governance.

---

## Section 9 — Layer 7: Capability Entity Types

Layer 7 contains the four Entity Types that define what the Civilisation can do. Capability entities are the governance layer over the Civilisation's operational powers — they specify which operations exist, what authority is required to invoke them, and what resource consumption they entail.

Every operation that the Civilisation performs — every Tool invocation, every Model call, every memory write, every governance evaluation — is a Capability. A Capability that is not registered in the Capability Registry does not officially exist from a governance perspective. Its invocation cannot be authorised, audited, or constrained by policy. Making Capabilities first-class entities is what enables the Civilisation to govern its own operational powers rather than simply executing code.

---

### ET-CAP-001 — Capability

**Definition:** A Capability is a named, governed, and registered operation that the Civilisation may perform. Capabilities are the canonical catalogue of the Civilisation's operational powers. All significant operations — tool invocations, memory writes, constitutional evaluations, model invocations, governance decisions — are Capabilities. A Capability defines WHAT can be done and WHAT authority is required to do it; it does not define WHO is doing it or WHEN.

**Purpose:** To transform the Civilisation's operational powers from implicit code into explicitly governed objects. Without the Capability Entity Type, there is no architectural basis for authority control (you cannot check authority for an operation that has no canonical identity), no basis for audit (you cannot record what was done if the operation has no name), and no basis for policy (you cannot constrain something that is not defined). Capabilities are the prerequisite for all governance of operational behaviour.

**Required Attributes:**
- `capability_id` (Identifier) — canonical Identity
- `canonical_name` (String) — unique name within the Capability Registry; used in all authority rules and audit records
- `capability_class` (Enumeration: TOOL | AGENT_STEP | API_OPERATION | MODEL_INVOCATION | MEMORY_OPERATION | GOVERNANCE_OPERATION) — the category of operation
- `authority_required` (Reference → ET-IDN-003) — the minimum Trust Level required to invoke this Capability
- `audit_obligation` (Enumeration: YES | NO | CONDITIONAL) — whether every invocation must produce an Audit Record
- `resource_profile` (Structured) — estimated Resource consumption per invocation (type, amount, currency if applicable)
- `admission_status` (Enumeration: PROVISIONAL | ADMITTED | ACTIVE | DEPRECATED) — Registry admission state
- `provided_by_service_id` (Reference → ET-SVC-001) — the Service that provides this Capability

**Optional Attributes:**
- `rate_limit` (Structured) — maximum invocations per time period
- `preconditions` (Structured) — conditions that must be satisfied before invocation is permitted
- `compensation` (Structured) — how to reverse the effects of this Capability if a containing transaction must be rolled back

**Lifecycle:**
PROVISIONAL → ADMITTED → ACTIVE → DEPRECATED

A PROVISIONAL Capability has been proposed but not yet evaluated for admission. ADMITTED means the Registry has accepted it but it may not yet be invoked. ACTIVE is the operational state. DEPRECATED means the Capability is being withdrawn — it may still be invoked during the withdrawal period but new INVOKES relationships must not be created.

**Ownership Rule:** Owned by the providing Service's owner.

**Source of Truth:** Capability Domain (Capability Registry).

**Permitted Relationships:**
- IS_PROVIDED_BY → ET-SVC-001 (Service)
- IS_INVOKED_BY → ET-OPS-001 (Agent), ET-OPS-002 (Agent Task), ET-SVC-001 (Service)
- IS_GOVERNED_BY → ET-GOV-003 (Policy)
- CONSUMES → ET-RES-001 (Resource)

**Constraints:**
- A Capability that is not ADMITTED or ACTIVE in the Capability Registry must not be invoked. Invocation of an unadmitted Capability is an authorisation violation.
- The `authority_required` field may not be set below TASK level for any Capability that modifies a Source of Truth or crosses a constitutional Boundary.

**Known Implementation State:**
The current implementation has 22 confirmed Tool Capabilities (lib/apex-tools.js), 8 Agent Step Capabilities (agent-task-cycle.js step allowlist), and multiple API Operation, Model Invocation, Memory Operation, and Governance Operation Capabilities. None of these are formally registered in a Capability Registry — they exist as code and configuration. The absence of a Capability Registry means there is no authoritative catalogue of what the Civilisation can do, and capability-level governance (authority checking per Capability, rate limits, audit obligations) cannot be systematically enforced.

**Non-examples:** A Service (ET-SVC-001) is not a Capability — a Service provides Capabilities but is not itself one. A Tool is a specialised Capability (ET-CAP-002) — Tool is a sub-type, not a separate concept at this level. An Agent (ET-OPS-001) is not a Capability — an Agent is an entity that invokes Capabilities.

---

### ET-CAP-002 — Tool

**Definition:** A Tool is a registered Capability specifically designed for direct invocation during Agent task execution or chat interaction. Tools are the Civilisation's primary mechanism for interacting with external systems, reading and writing Memory, and performing bounded operations within the Founder's environment. All confirmed APEX Tools are instances of this Entity Type. Tool is a sub-type of Capability — all Tool constraints inherit from ET-CAP-001, and Tools carry additional schema and advertisement attributes.

**Purpose:** To distinguish the class of Capabilities that are directly selectable by the reasoning Model from other Capability classes. A Tool has a JSON schema that the Model can inspect, an advertisement flag that determines whether the Model is shown this Tool, and an optional fallback designation. These attributes are not relevant to other Capability classes (memory writes, for example, are not selectable by the Model in the same way). Separating Tools as an Entity Type enables governance of exactly which operations the Model may request.

**Required Attributes:**
- Inherits all Required Attributes of ET-CAP-001
- `tool_schema` (JSON Schema) — the schema defining this Tool's input parameters and output structure; presented to the Model for function calling
- `advertised` (Boolean) — whether this Tool is included in the tool list presented to the Model; unadvertised Tools may still be invoked internally

**Optional Attributes:**
- `fallback_tool_id` (Reference → ET-CAP-002) — a Tool to invoke if this Tool fails; enables graceful degradation
- `external_dependency` (String) — the external service or API this Tool depends on

**Lifecycle:** Inherits from ET-CAP-001.

**Ownership Rule:** Owned by the apex-tools Service.

**Source of Truth:** Capability Domain (Capability Registry).

**Permitted Relationships:** Inherits from ET-CAP-001, plus:
- HAS_FALLBACK → ET-CAP-002 (Tool) — the designated fallback

**Constraints:**
- A Tool's `tool_schema` must be valid JSON Schema. An invalid schema produces malformed function call requests to the Model.
- An unadvertised Tool (advertised = false) must have documented justification for its non-advertisement. Silent non-advertisement without justification is a governance gap.

**Known Implementation State:**
22 Tools are confirmed in lib/apex-tools.js. Of these, 6 browser tools are confirmed unadvertised (advertised = false). The web_search Tool has a confirmed DuckDuckGo fallback when the primary Brave Search provider fails. The get_weather Tool uses a UK-first strategy then falls back to Open-Meteo. None of the 22 Tools are formally registered as Entity instances with Registry Records. The tool schema definitions in apex-tools.js represent the tool_schema attribute content.

**Non-examples:** A Service (ET-SVC-001) is not a Tool — Services provide capabilities; Tools are the specific Capabilities selectable by the Model. A Capability that is not directly selectable by the Model (such as an internal memory write) is ET-CAP-001, not ET-CAP-002.

---

### ET-CAP-003 — Model

**Definition:** A Model is a registered AI reasoning or generation system invoked by Agents and Services to produce textual, analytical, or generative outputs. Models are Capabilities with specific cost profiles, context window limits, tier assignments, and circuit-breaker behaviour. All Model invocations consume Budget (ET-RES-002) and must produce Consumption Records (ET-RES-004). The Model Entity Type captures both the identity of the AI system and its operational governance parameters.

**Purpose:** To govern the Civilisation's use of AI reasoning capacity as a first-class architectural concern. Without the Model Entity Type, AI invocations are ungoverned — there is no canonical record of which models are approved, what their cost profiles are, how their failure behaviour is managed, or how they are selected for different task types. Making Models first-class entities enables tier routing governance, cost accountability, and circuit-breaker management.

**Required Attributes:**
- `model_id` (Identifier) — canonical Identity
- `model_name` (String) — canonical name of the AI model (e.g., claude-opus-4-7, claude-sonnet-4-6, claude-haiku-4-5)
- `model_tier_id` (Reference → ET-CAP-004) — the Tier classification governing when this Model is selected
- `provider` (Reference → ET-GOV-008) — the External Organisation providing this Model
- `cost_per_call_estimate` (Decimal) — approximate cost per invocation in USD; used for Budget governance
- `context_window_tokens` (Integer) — maximum token context this Model can process
- `capabilities` (Enumeration set: TEXT | VOICE | VISION) — the output modalities this Model supports
- `circuit_breaker_threshold` (Integer) — consecutive non-429 failures before the circuit opens; 5 in the current implementation
- `status` (Enumeration: ACTIVE | CIRCUIT_OPEN | DEPRECATED)

**Optional Attributes:**
- `max_cooldown_ms` (Integer) — maximum circuit-breaker cooldown duration; 900000 (15 minutes) in the current implementation
- `timeout_ms` (Integer) — maximum time to wait for a response before treating as failure; 90000 (90 seconds) in the current implementation

**Lifecycle:**
ACTIVE → CIRCUIT_OPEN → ACTIVE (after cooldown) → DEPRECATED

The CIRCUIT_OPEN state is temporary. The circuit-breaker uses exponential backoff: cooldown = 60s × 2^(consecutive_failures − 5), capped at max_cooldown_ms. After each cooldown period, the circuit enters HALF_OPEN, sends one probe request, and returns to ACTIVE on success or CIRCUIT_OPEN on failure.

**Ownership Rule:** Owned by the Model routing Service.

**Source of Truth:** Capability Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-CAP-004 (Model Tier)
- IS_PROVIDED_BY → ET-GOV-008 (External Organisation — the AI provider)
- CONSUMES → ET-RES-002 (Budget) on each invocation

**Constraints:**
- A Model in CIRCUIT_OPEN state must not be invoked. Any invocation attempt against a CIRCUIT_OPEN Model must fail fast without making an external API call.
- A Model's `cost_per_call_estimate` must be current. A Model with an outdated cost estimate cannot support accurate Budget governance.

**Known Implementation State:**
Three Models are confirmed in the current implementation: claude-opus-4-7 (Tier CRITICAL/POWERFUL), claude-sonnet-4-6 (Tier MODERATE/COMPLEX/BALANCED), claude-haiku-4-5 (Tier SIMPLE/FAST/VOICE). The circuit-breaker implementation is in lib/models/runtime/index.js with confirmed parameters: 5 failure threshold, exponential backoff 60s × 2^(failures-5), 15-minute maximum cooldown, 90-second request timeout. The execute, stream, and voice invocation paths are all confirmed. Models are not registered as formal Entity instances.

**Non-examples:** The AI provider (Anthropic) is not a Model — the provider is an External Organisation (ET-GOV-008); the Model is the specific AI system the provider makes available. A Model Tier is not a Model — a Tier is a routing classification; Models are assigned to Tiers.

---

### ET-CAP-004 — Model Tier

**Definition:** A Model Tier is a named classification of Models by cost-capability profile that governs Model selection for different task types. Model Tiers implement the Civilisation's cost-proportionality principle: simpler tasks must use less capable, less expensive Models; only tasks requiring the highest reasoning quality may invoke the most capable, most expensive Models. Tier routing rules are the operational expression of this principle.

**Purpose:** To prevent both overspend and underprovision in Model selection. Without Model Tiers, every task uses the same Model — either the cheapest (poor quality for complex tasks) or the most expensive (unconstitutional cost for simple tasks). Tiers create a governed mapping from task complexity to Model capability, enabling the Civilisation to optimise cost and quality simultaneously.

**Required Attributes:**
- `tier_id` (Identifier) — canonical Identity
- `tier_name` (String) — canonical name (e.g., TIER_1_ECONOMY, TIER_2_STANDARD, TIER_3_ADVANCED, TIER_4_CRITICAL)
- `routing_triggers` (Enumeration set) — the task complexity classifications that route to this Tier (e.g., SIMPLE, FAST, VOICE for TIER_1)
- `default_model_id` (Reference → ET-CAP-003) — the Model assigned to this Tier as default
- `cost_ceiling_per_call` (Decimal) — the maximum permitted cost per invocation at this Tier

**Optional Attributes:**
- `fallback_tier_id` (Reference → ET-CAP-004) — the Tier to fall back to if the default Model is CIRCUIT_OPEN

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the Model routing Service.

**Source of Truth:** Capability Domain.

**Permitted Relationships:**
- CONTAINS → ET-CAP-003 (Model) — one or more Models assigned to this Tier
- IS_SELECTED_FOR → task complexity classification

**Constraints:**
- Every active routing trigger classification must be assigned to exactly one Tier. Unassigned classification values are routing gaps — tasks with those values have no governed Model selection path.
- The default Model assigned to a Tier must be ACTIVE. A Tier whose default Model is DEPRECATED or CIRCUIT_OPEN with no fallback is non-operational.

**Known Implementation State:**
Four Tiers are confirmed in dynamic-agent-selector.js with the following routing assignments: TIER_1 (SIMPLE, FAST, VOICE → claude-haiku-4-5), TIER_2 (MODERATE, COMPLEX, BALANCED → claude-sonnet-4-6), TIER_3/4 (CRITICAL, POWERFUL → claude-opus-4-7). The routing logic is confirmed but not registered as formal Tier entities. No cost ceiling enforcement is implemented — the tier routing exists but the cost governance obligation is not enforced per invocation.

**Non-examples:** A Model is not a Model Tier — a Model is assigned to a Tier; it is not the Tier itself. A routing rule is not a Tier — routing rules implement Tier selection; the Tier is the governed classification that routing rules serve.

---

## Section 10 — Layer 8: Service Entity Types

Layer 8 contains the five Entity Types that provide Capabilities to other Entities. Service entities are the operational infrastructure of the Civilisation — they are the running, health-bearing systems through which the Civilisation's powers are delivered.

Services are distinct from Capabilities: a Capability defines what can be done; a Service is the entity that does it. One Service may provide multiple Capabilities. Services have health states, initialisation sequences, dependency chains, and runtime characteristics that Capabilities do not. The five Service sub-types defined here represent specialisations of the Service concept with distinct governance requirements: the base Service, the Interface (the exposed contract), the Gateway (the Boundary enforcer), the Circuit Breaker (the failure protector), and the Event Bus (the announcement channel).

---

### ET-SVC-001 — Service

**Definition:** A Service is an Entity that provides one or more Capabilities to other Entities through defined Interfaces. Services are runtime entities — they have health states, dependency relationships with other Services, and lifecycle transitions that reflect their operational availability. A Service that is STOPPED provides no Capabilities; a Service that is DEGRADED provides Capabilities with reduced reliability.

**Purpose:** To give the Civilisation's operational subsystems architectural identity. Without the Service Entity Type, the components of the system are code files and processes with no governed identity, no health model, no ownership, and no audit obligations. Services transform components into governed entities that can be observed, owned, health-checked, and referenced in authority rules.

**Required Attributes:**
- `service_id` (Identifier) — canonical Identity
- `service_name` (String) — canonical name
- `service_type` (Enumeration: INTERNAL | EXTERNAL | HYBRID) — whether the Service operates entirely within the Civilisation, entirely outside it, or bridges both
- `capabilities_provided` (Reference list → ET-CAP-001) — the Capabilities this Service provides
- `health_status` (Enumeration: HEALTHY | DEGRADED | CRITICAL | DOWN) — current health state
- `owner_id` (Reference) — the Entity accountable for this Service
- `status` (Enumeration: INITIALISING | ACTIVE | DEGRADED | STOPPED)

**Optional Attributes:**
- `init_sequence_step` (Integer) — the step number in the startup cascade (services/init.js 12-step sequence)
- `dependencies` (Reference list → ET-SVC-001) — other Services this Service requires to function
- `restart_policy` (Enumeration: ALWAYS | ON_FAILURE | NEVER) — what happens when this Service stops unexpectedly

**Lifecycle:**
INITIALISING → ACTIVE → DEGRADED → STOPPED

The FAIL-SOFT classification of the init cascade means some Services may transition to ACTIVE in a degraded configuration when dependencies are unavailable. This is an architectural choice that must be explicitly documented in the Service's registry entry.

**Ownership Rule:** Owned by its responsible Ministry or Council Member.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- PROVIDES → ET-CAP-001 (Capability)
- EXPOSES → ET-SVC-002 (Interface)
- DEPENDS_ON → ET-SVC-001 (Service)
- IS_MONITORED_BY → monitoring Service

**Constraints:**
- A Service with `status` = STOPPED must not accept invocations against any of its Capabilities. Invocations against a STOPPED Service must be rejected with a clear failure response, not silently lost.
- A Service's `dependencies` must not form a cycle. Circular service dependencies are architectural defects that prevent deterministic initialisation.

**Known Implementation State:**
The current implementation initialises Services via services/init.js in a 12-step cascade. The FAIL-SOFT classification means each step may proceed even if prior dependencies are unavailable, resulting in Services that are nominally ACTIVE but functionally limited. Confirmed Services include: the Memory Service, Constitutional Gate Service, Slack Service, Notion Service, Model Service, Event Bus Service, Agent Queue Service, and Master Orchestrator. None are registered as formal Entity instances. The health monitoring infrastructure (health/monitor.js) tracks per-call success rates in memory but does not maintain formal health_status Entity attributes.

**Non-examples:** A Capability is not a Service — a Capability is what a Service does; a Service is the entity that does it. An Agent is not a Service — Agents execute tasks and invoke Capabilities; Services provide Capabilities. A database is not a Service in this taxonomy — it is a Database (ET-PHY-007), a Physical Layer entity.

---

### ET-SVC-002 — Interface

**Definition:** An Interface is the exposed contract through which a Service makes its Capabilities invocable by other Entities. An Interface defines the invocation mechanism, the authentication requirements, the input and output schemas, and the versioning of the exposed Capability surface. The Civilisation currently exposes Capabilities through HTTP REST Interfaces, a WebSocket Interface, and internal programmatic Interfaces.

**Purpose:** To formalise the contract between a Service and its consumers. Without the Interface Entity Type, the boundary between a Service and the outside world is implicit in code — there is no governed specification of what is exposed, what authentication is required, or what versioning discipline applies. Interfaces make the exposure surface explicit and governable.

**Required Attributes:**
- `interface_id` (Identifier) — canonical Identity
- `service_id` (Reference → ET-SVC-001) — the Service this Interface belongs to
- `interface_type` (Enumeration: HTTP_REST | WEBSOCKET | INTERNAL | EVENT_BUS) — the communication protocol
- `capabilities_exposed` (Reference list → ET-CAP-001) — which Capabilities this Interface exposes
- `authentication_required` (Boolean) — whether callers must authenticate before invocation
- `version` (String) — current Interface version; breaking changes require version increment

**Optional Attributes:**
- `rate_limit_policy` (Structured) — rate limits applied at the Interface level
- `deprecation_date` (DateTime) — when this Interface version will be removed

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by its parent Service.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-SVC-001 (Service)
- EXPOSES → ET-CAP-001 (Capability)
- IS_AUTHENTICATED_AT → via Credential (ET-IDN-002) inspection

**Constraints:**
- An Interface that exposes Capabilities requiring EXECUTIVE or SOVEREIGN authority must enforce authentication. An unauthenticated Interface exposing high-authority Capabilities is an unconstitutional exposure.
- An Interface version change that removes or changes the schema of an exposed Capability must increment the version and maintain backward compatibility for a defined grace period.

**Known Implementation State:**
Eight public HTTP REST endpoints are confirmed in /api/operations/*. The WebSocket Interface is confirmed in lib/ws-handler.js (5 message types, timingSafeEqual authentication, 60-second keepalive). Internal programmatic interfaces exist throughout the codebase as module exports. Authentication gaps exist: the dashboard Interface is subject to BYPASS_DASHBOARD_AUTH (C10). Interfaces are not registered as formal entities.

**Non-examples:** A Capability is not an Interface — a Capability is what can be done; an Interface is how it can be invoked. An API Route (ET-PHY-010) is not an Interface — an API Route is the Physical Layer implementation of an Interface; the Interface is the Civilisation Layer concept.

---

### ET-SVC-003 — Gateway

**Definition:** A Gateway is a Service that controls access to a bounded set of Capabilities across a Trust Boundary. Gateways enforce Authority requirements, evaluate Policies, produce Audit Records for every crossing, and determine the failure mode for their Boundary. Every significant Trust Boundary in the Civilisation must be protected by a Gateway. A Boundary without a Gateway is an ungoverned crossing point — it may be used without Authority verification, without Policy evaluation, and without producing evidence.

**Purpose:** To give physical form to the Civilisation's Boundaries. ARCH-00 defines Boundaries as logical demarcations across which Authority must be verified. Gateways are the Services that implement Boundaries operationally. Without Gateways, Boundaries are architectural abstractions with no runtime effect — they exist in specifications but do not control access.

**Required Attributes:**
- Inherits all Required Attributes of ET-SVC-001
- `boundary_id` (Reference) — the Trust Boundary this Gateway enforces
- `failure_mode` (Enumeration: FAIL_CLOSED | FAIL_OPEN | FAIL_SOFT) — what the Gateway does when it cannot reach a determination; FAIL_CLOSED denies all; FAIL_OPEN permits all; FAIL_SOFT permits with reduced functionality
- `audit_obligation` (Enumeration: YES | NO) — whether every crossing must produce an Audit Record
- `bypass_conditions` (Structured) — explicit, documented conditions under which this Gateway may be bypassed; must be empty or carry SOVEREIGN justification

**Optional Attributes:**
- `policy_refs` (Reference list → ET-GOV-003) — the Policies this Gateway enforces

**Lifecycle:** Inherits from ET-SVC-001.

**Ownership Rule:** Owned by the Ministry or Council Member responsible for the protected domain.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:** Inherits from ET-SVC-001, plus:
- ENFORCES → ET-GOV-003 (Policy)
- PROTECTS → Capability set or Source of Truth

**Constraints:**
- A Gateway with `failure_mode` = FAIL_OPEN must carry documented SOVEREIGN justification. FAIL_OPEN is the most dangerous failure mode — it permits all access when the Gateway cannot function — and must be an explicit, justified architectural choice, not a default.
- A Gateway's `bypass_conditions` must be exhaustively enumerated. Any Capability invocation that bypasses the Gateway without a documented bypass condition is an unauthorised crossing.

**Known Implementation State:**
Three Gateways are confirmed: (1) lib/memory/gateway.js — Memory Write Gateway; (2) lib/runtime/constitutional-gate.js — Constitutional Gate, confirmed FAIL_OPEN on error (critical architectural defect); (3) lib/kernel.js kernelChain — Authority Gateway implementing four sequential checks. Critical defect C02: lib/agent-file-utils.js checkGovernance is confirmed UNCONDITIONALLY_OPEN — it never produces a denial decision regardless of the Policy evaluation result. This means the Governance Policy boundary has a Gateway that unconditionally permits all crossings. This defect must be carried forward to the Gateway's registry entry as `failure_mode = UNCONDITIONALLY_OPEN` pending resolution.

**Non-examples:** A Service that provides Capabilities without enforcing Boundaries is ET-SVC-001, not ET-SVC-003. An authentication middleware function is not a Gateway unless it is formally registered as the Boundary enforcer for a specific Trust Boundary with defined failure mode and audit obligations.

---

### ET-SVC-004 — Circuit Breaker

**Definition:** A Circuit Breaker is a Service that protects a downstream dependency from cascading failure by monitoring its error rate and failing fast when the error threshold is exceeded. When the threshold is crossed, the Circuit Breaker opens its circuit, refusing further requests to the failing dependency for a cooldown period. After the cooldown, it allows a probe request — if the dependency has recovered, the circuit closes; if not, it opens again with extended backoff.

**Purpose:** To prevent a failing external dependency (particularly a remote AI Model provider) from consuming the Civilisation's entire budget and compute capacity through repeated failed requests. Without Circuit Breakers, a slow or failing Model API causes every Agent Task to wait for timeouts before failing, exhausting the request budget and queue capacity. Circuit Breakers short-circuit this cascade by failing fast and recovering gracefully.

**Required Attributes:**
- Inherits all Required Attributes of ET-SVC-001
- `protected_service_id` (Reference → ET-SVC-001 or ET-CAP-003) — the Service or Model being protected
- `failure_threshold` (Integer) — consecutive non-transient failures before the circuit opens; 5 in the current implementation
- `cooldown_strategy` (Enumeration: FIXED | EXPONENTIAL | LINEAR) — how the cooldown duration grows with repeated failures
- `max_cooldown_ms` (Integer) — maximum cooldown duration; 900000 (15 minutes) in the current implementation
- `circuit_state` (Enumeration: CLOSED | OPEN | HALF_OPEN) — current circuit state

**Optional Attributes:**
- `excluded_error_codes` (Integer list) — error codes (e.g., HTTP 429 rate-limit) that do not count toward the failure threshold

**Lifecycle:** Inherits from ET-SVC-001. Circuit state transitions: CLOSED → OPEN → HALF_OPEN → CLOSED / OPEN.

**Ownership Rule:** Owned by the Model routing Service.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:** Inherits from ET-SVC-001, plus:
- PROTECTS → ET-CAP-003 (Model)

**Constraints:**
- HTTP 429 (rate limit) responses must not count toward the failure threshold. 429 responses indicate the service is alive but throttling; treating them as failures would open the circuit unnecessarily.
- When the circuit is OPEN, every invocation attempt must fail immediately with a clear circuit-open error. No requests may be forwarded to the protected Service while the circuit is OPEN.

**Known Implementation State:**
The Circuit Breaker is implemented in lib/models/runtime/index.js with confirmed parameters: 5-failure threshold (excluding 429 responses), exponential backoff formula (60s × 2^(failures − 5)), 15-minute maximum cooldown, 90-second per-request timeout. The circuit state is maintained in memory — it does not persist across process restarts, meaning a fresh process deployment always starts with all circuits CLOSED regardless of prior failure history.

**Non-examples:** A rate limiter is not a Circuit Breaker — a rate limiter throttles the caller; a Circuit Breaker protects the callee. A retry mechanism is not a Circuit Breaker — retries re-attempt failed requests; a Circuit Breaker stops attempting requests when the failure pattern warrants it.

---

### ET-SVC-005 — Event Bus

**Definition:** The Event Bus is the Service responsible for receiving emitted Events and routing them to all registered consumers. The Event Bus is the Civilisation's communication backbone — it decouples event producers from event consumers by acting as an intermediary. Every Event in the Civilisation passes through the Event Bus. The Event Bus is a singleton Service — there is exactly one Event Bus in the Civilisation architecture.

**Purpose:** To implement the publish-subscribe communication pattern at the infrastructure level. Without the Event Bus, every producer must directly call every consumer — creating tight coupling that makes the addition of new consumers require modification of existing producers. The Event Bus inverts this: producers emit without knowing who listens; consumers subscribe without knowing who emits.

**Required Attributes:**
- Inherits all Required Attributes of ET-SVC-001
- `dispatch_mode` (Enumeration: SYNC | ASYNC) — whether events are dispatched synchronously or asynchronously; ASYNC (setImmediate) in the current implementation
- `persistence_enabled` (Boolean) — whether events are durably stored for replay; false in the current implementation
- `max_listeners` (Integer) — maximum number of concurrent subscriber registrations; 100 in the current implementation
- `log_capacity` (Integer) — rolling in-memory log size; 200 in the current implementation
- `wildcard_supported` (Boolean) — whether consumers may subscribe to all events via a wildcard; true in the current implementation

**Optional Attributes:**
- `retry_policy` (Structured) — how failed deliveries are retried; not implemented in the current implementation
- `dead_letter_queue_id` (Reference → ET-OPS-005) — where undeliverable Events are sent; not implemented

**Lifecycle:** Inherits from ET-SVC-001. The Event Bus is typically ACTIVE for the entire lifetime of the Civilisation runtime — it has no graceful shutdown sequence in the current implementation.

**Ownership Rule:** Owned by the Infrastructure Ministry or equivalent governing authority.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:** Inherits from ET-SVC-001, plus:
- ROUTES → ET-COM-001 (Event) to subscribed consumers

**Constraints:**
- The Event Bus must not silently discard Events that have registered consumers. An Event delivery failure must produce a failure record or trigger a retry.
- The Event Bus must be the single channel through which Events are propagated. Direct inter-service calls for event-driven communication — bypassing the Event Bus — are architectural violations.

**Known Implementation State:**
The Event Bus is implemented in lib/event-bus.js with confirmed characteristics: setImmediate dispatch (asynchronous, no delivery guarantee), no persistence (Events lost on process restart), 100 max listeners, 200-entry rolling in-memory log, wildcard '*' subscription supported. No retry mechanism exists. No dead-letter queue exists. The absence of persistence is a critical architectural gap — Events are unrecoverable after process restart, making causal chain reconstruction impossible for any event that occurred before the most recent deployment.

**Non-examples:** A message queue (ET-OPS-005) is not an Event Bus — a Queue holds work items for sequential processing; the Event Bus broadcasts announcements to concurrent subscribers. A database write is not an Event Bus dispatch — persisting data is not the same as announcing an occurrence to consumers.

---

## Section 11 — Layer 9: Resource Entity Types

Layer 9 contains the four Entity Types that represent finite quantities consumed by the Civilisation's operations. Resource governance is a constitutional obligation — constitution-v1.md Art. 2 establishes explicit financial limits ($2 per-call, $500/month Council cap) that can only be enforced if Resource consumption is tracked as a governed, persisted record.

The current implementation has a critical failure in this layer: Resource consumption is logged to the console only, not persisted. This means the constitutional limits cannot be programmatically enforced, there is no audit trail of expenditure, and the Founder has no reliable visibility into the Civilisation's financial position. The Entity Types below define the canonical architecture — the implementation gap does not alter the architectural obligation.

---

### ET-RES-001 — Resource

**Definition:** A Resource is a finite, governed quantity whose depletion constrains the Civilisation's operational capacity. Resources are the Civilisation's consumables — unlike Capabilities (which can be invoked repeatedly without being diminished) or Services (which provide Capabilities persistently), Resources are depleted by use and must be replenished. The Civilisation's primary Resources are Budget (financial), Compute Capacity (memory and processing), and Authorisation Counts (where applicable).

**Purpose:** To establish the architectural basis for scarcity governance. Without the Resource Entity Type, the Civilisation has no governed model of its consumable limits — it can invoke Capabilities without bound, spend without limit, and consume memory without accountability. Resources make scarcity a first-class architectural concern, enabling the Civilisation to make governed decisions about resource allocation, to enforce constitutional limits, and to account for expenditure.

**Required Attributes:**
- `resource_id` (Identifier) — canonical Identity
- `resource_type` (Enumeration: BUDGET | COMPUTE_MEMORY | AUTHORISATION_COUNT) — the category of Resource
- `unit` (String) — the unit of measurement (USD for Budget; MB for Compute; count for Authorisation)
- `governing_limit` (Decimal) — the maximum amount available; for BUDGET type, this is the constitutional limit
- `current_balance` (Decimal) — current remaining amount
- `allocated_to_id` (Reference) — the Entity to which this Resource is allocated
- `replenishment_rule` (Structured) — how and when this Resource is restored (e.g., MONTHLY for Budget, CONTINUOUS for Compute)
- `status` (Enumeration: AVAILABLE | APPROACHING_LIMIT | AT_LIMIT | DEPLETED | FROZEN)

**Optional Attributes:**
- `warning_threshold` (Decimal) — the balance level at which APPROACHING_LIMIT status is set and a Notification is triggered
- `freeze_conditions` (Structured) — conditions under which this Resource is FROZEN (suspended from consumption)

**Lifecycle:**
ALLOCATED → AVAILABLE → APPROACHING_LIMIT → AT_LIMIT → DEPLETED / FROZEN → REPLENISHED → AVAILABLE

**Ownership Rule:** Owned by the Founder (all Resources are ultimately under Founder authority per constitutional Art. 2).

**Source of Truth:** Resource Domain.

**Permitted Relationships:**
- IS_ALLOCATED_TO → any Entity
- IS_CONSUMED_BY → ET-CAP-001 (Capability) invocations
- IS_GOVERNED_BY → ET-GOV-003 (Policy) — the Resource governance policy

**Constraints:**
- A Resource at DEPLETED status must block any further CONSUMES relationships until replenishment. A Capability that attempts to CONSUME a DEPLETED Resource must be denied.
- Every CONSUMES event against a Resource must produce a Consumption Record (ET-RES-004). Consumption without a Consumption Record is a constitutional violation per Art. 2.

**Known Implementation State:**
Resource tracking is implemented in lib/consumption-log.js as logger.info calls only — no database persistence. This means there is no governed Resource Entity maintaining a current_balance, no enforcement of the $2 per-call limit or $500/month Council cap, and no Consumption Records produced for any invocation. The constitutional limits exist in specification but have no runtime enforcement mechanism. This is among the most critical implementation gaps in the current Civilisation.

**Non-examples:** A Capability is not a Resource — a Capability is an operation that can be invoked; a Resource is a quantity consumed when it is invoked. A Service is not a Resource — a Service provides Capabilities persistently; a Resource is depleted by use.

---

### ET-RES-002 — Budget

**Definition:** A Budget is a governed allocation of financial Resource with defined period limits, accounting periods, and depletion policies. A Budget is a specialisation of Resource (ET-RES-001) specific to financial expenditure. The Civilisation maintains three distinct Budget scopes: per-call ($2 constitutional limit), per-cycle ($0.50 gate for civilisation-runtime phases 3 and 4), and Council monthly ($500/month constitutional cap). Each scope is a separate Budget entity.

**Purpose:** To implement the Civilisation's constitutional financial governance. Constitution-v1.md Art. 2 establishes explicit financial limits. Without the Budget Entity Type as a governed, persisted artifact, these limits are aspirational rather than enforced — the Civilisation can exceed them without any architectural mechanism detecting or preventing the violation. Budget entities are the technical expression of constitutional financial constraint.

**Required Attributes:**
- `budget_id` (Identifier) — canonical Identity
- `budget_scope` (Enumeration: PER_CALL | PER_CYCLE | MONTHLY_COUNCIL | MONTHLY_TOTAL) — which expenditure scope this Budget governs
- `limit_amount` (Decimal) — the constitutional or operational limit for this scope
- `currency` (String) — USD for all current Budget entities
- `current_spend` (Decimal) — cumulative amount spent in the current accounting period
- `period_start` (DateTime) — the start of the current accounting period
- `status` (Enumeration: WITHIN_LIMIT | APPROACHING_LIMIT | AT_LIMIT | EXCEEDED)

**Optional Attributes:**
- `period_end` (DateTime) — the end of the current accounting period (null for ongoing periods)
- `alert_threshold_pct` (Integer) — the percentage of limit at which an APPROACHING_LIMIT Notification is sent

**Lifecycle:**
PERIOD_ACTIVE → PERIOD_CLOSED → PERIOD_ARCHIVED

A new Budget entity is created for each new accounting period. Prior periods are archived but retained for audit.

**Ownership Rule:** Owned by the Founder.

**Source of Truth:** Resource Domain.

**Permitted Relationships:**
- IS_CONSUMED_BY → ET-CAP-003 (Model) invocations, ET-OPS-002 (Agent Task) executions
- GOVERNS → expenditure decisions

**Constraints:**
- A per-call Budget that has reached AT_LIMIT must prevent the initiating invocation from proceeding. A $2 per-call limit that is not enforced at invocation time cannot prevent constitutional violation.
- Budget periods must be consistently defined — a monthly Budget must have a clear period_start and period_end that do not overlap with adjacent periods. Gap or overlap in Budget periods creates accounting ambiguity.

**Known Implementation State:**
The $0.50 per-cycle gate is confirmed in civilization-runtime.js phases 3 and 4. The $2 per-call limit and $500/month Council cap are specified in constitution-v1.md Art. 6 but have no runtime enforcement implementation. The three Budget scopes exist as constitutional obligations without corresponding Entity instances. No database table for Budget tracking exists in the confirmed schema. Resolution requires both database schema addition and lib/models/runtime/index.js enforcement logic.

**Non-examples:** A Resource Pool (ET-RES-003) is not a Budget — a Resource Pool manages shared non-financial capacity (e.g., concurrency slots); a Budget governs financial expenditure. A Consumption Record (ET-RES-004) is not a Budget — a Consumption Record records a spending event; a Budget is the governed limit against which spending events are measured.

---

### ET-RES-003 — Resource Pool

**Definition:** A Resource Pool is a shared allocation of a Resource type managed as a collective capacity limit across multiple concurrent Entities or Capability invocations. Rather than allocating the Resource to individual Entities independently, a Resource Pool distributes access to a shared total — each consumer draws from the same pool, and when the pool is exhausted, all consumers are constrained. The Agent Queue's concurrency limit is the primary Resource Pool in the current Civilisation.

**Purpose:** To manage shared finite capacities that cannot be allocated in advance to individual consumers. When MAX_CONCURRENCY is set to 3 for the Agent Queue, this is a Resource Pool — it cannot be pre-allocated as 1 slot per Agent because the same 3 slots must serve all Agents dynamically. Without the Resource Pool Entity Type, shared capacity limits are implementation constants with no governance model, no observability, and no policy basis for adjustment.

**Required Attributes:**
- `pool_id` (Identifier) — canonical Identity
- `pool_name` (String) — canonical name
- `resource_type` (Enumeration: CONCURRENCY | MEMORY | CONNECTION) — the type of Resource in this Pool
- `total_capacity` (Integer) — total pool size (e.g., 3 for the Agent Queue concurrency pool)
- `current_allocation` (Integer) — currently allocated amount
- `allocation_policy` (Structured) — how capacity is distributed among requesting Entities (e.g., FIFO, priority-based)

**Optional Attributes:**
- `overflow_policy` (Enumeration: DROP | REJECT | QUEUE) — what happens when the pool is fully allocated
- `current_utilisation_pct` (Integer) — computed: (current_allocation / total_capacity) × 100

**Lifecycle:**
ACTIVE → DEPLETED → REPLENISHED → ACTIVE

**Ownership Rule:** Owned by the Service that manages the Pool.

**Source of Truth:** Operations Domain.

**Permitted Relationships:**
- IS_MANAGED_BY → ET-SVC-001 (Service)
- IS_DRAWN_FROM_BY → ET-OPS-001 (Agent), ET-OPS-002 (Agent Task)

**Constraints:**
- The `current_allocation` must never exceed `total_capacity`. Any allocation request that would cause this violation must be denied per the `overflow_policy`.
- When `total_capacity` is changed, any in-flight allocations that now exceed the new capacity must be gracefully managed — capacity reduction must not abruptly terminate active operations.

**Known Implementation State:**
The Agent Queue Resource Pool is implemented in lib/agent-queue.js with confirmed parameters: MAX_CONCURRENCY = 3 (concurrent execution slots), MAX_QUEUE_DEPTH = 50 (pending items). The concurrency pool is managed in memory — it does not persist across restarts, meaning the allocation state is always reset to 0 on process restart regardless of in-flight tasks. No formal Resource Pool Entity is registered.

**Non-examples:** A Budget (ET-RES-002) is not a Resource Pool — Budgets govern financial expenditure with replenishment periods; Resource Pools govern shared operational capacity that is continuously available within limits. A Queue (ET-OPS-005) is not a Resource Pool — a Queue holds work items awaiting processing; a Resource Pool holds available capacity slots.

---

### ET-RES-004 — Consumption Record

**Definition:** A Consumption Record is an immutable, persisted record of a specific Resource depletion event — capturing exactly what Resource was consumed, how much, by which Entity invoking which Capability, and at what time. Consumption Records are the constitutional evidence of Resource usage. Without Consumption Records, Resource governance is aspirational — limits can be declared but not enforced, because there is no audit trail of what has been consumed.

**Purpose:** To provide the audit foundation for Resource governance. Every consumed Resource that has a constitutional limit (particularly Budget) must have a corresponding Consumption Record. Consumption Records are what allow the Civilisation to: (1) verify that per-call limits were respected, (2) compute running totals against period budgets, (3) produce audit evidence of financial compliance, and (4) detect and alert on unusual consumption patterns.

**Required Attributes:**
- `record_id` (Identifier) — canonical Identity
- `capability_id` (Reference → ET-CAP-001) — the Capability whose invocation caused this consumption
- `resource_type` (Enumeration) — what was consumed
- `amount_consumed` (Decimal) — how much was consumed
- `invoking_entity_id` (Reference) — the Entity that invoked the Capability
- `consumed_at` (DateTime) — when the consumption occurred
- `budget_id` (Reference → ET-RES-002) — which Budget this consumption draws from

**Optional Attributes:**
- `model_id` (Reference → ET-CAP-003) — if the consumption was a Model invocation, which Model
- `task_id` (Reference → ET-OPS-002) — if the consumption was within an Agent Task, which Task
- `running_period_total` (Decimal) — the cumulative spend in the current period after this record

**Lifecycle:**
RECORDED (terminal — immutable after creation)

**Ownership Rule:** Owned by the Resource governance system.

**Source of Truth:** Resource Domain (must be persisted to database — current implementation does not persist).

**Permitted Relationships:**
- RECORDS_CONSUMPTION_FOR → ET-CAP-001 (Capability)
- DRAWS_FROM → ET-RES-002 (Budget)

**Constraints:**
- A Consumption Record is immutable after creation. No process may alter a Consumption Record's amount, entity attribution, or timestamp.
- A Consumption Record must be created synchronously before the Capability invocation result is returned, or within a transactional boundary that guarantees the Record is created if the invocation proceeds. A Consumption Record created asynchronously after the invocation (fire-and-forget) cannot guarantee the record exists if the process fails.

**Known Implementation State:**
Consumption Records are not persisted in the current implementation. lib/consumption-log.js issues logger.info calls only — no database write occurs. This means there are zero Consumption Records in the Civilisation's current evidence chain, and the constitutional per-call and monthly limits have no enforcement mechanism. This is a CRITICAL gap. Resolution requires: (1) a database table for consumption_records, (2) integration into the Model invocation path in lib/models/runtime/index.js to write a record synchronously or within an outbox transaction before returning results.

**Non-examples:** A console log entry is not a Consumption Record — log entries have no Identity, are not persisted to a governed store, and cannot be queried for audit. An Audit Record (ET-KNW-005) is not a Consumption Record — Audit Records concern governance events (boundary crossings, lifecycle transitions); Consumption Records concern Resource depletion specifically.

---

## Section 12 — Layer 10: Data Governance Entity Types

Layer 10 contains the six Entity Types that govern the authority, structure, provenance, and integrity of information within the Civilisation. Data governance entities are the meta-layer over information — they define where facts live, who may write to them, and how derivative representations relate to their authoritative sources.

The data governance layer is particularly significant given the Phase 2.3 finding that 8 of 10 identified fact domains have fragmented Sources of Truth, and that the memory governor (constitution-v1.md-mandated) contradicts the multiple confirmed memory write paths that bypass it. This layer is where the architectural concepts required to resolve those contradictions are defined.

---

### ET-DAT-001 — Registry

**Definition:** A Registry is a governed catalogue of Records representing all admitted instances of a specific Entity Type. A Registry is the canonical mechanism through which the Civilisation establishes the existence of governed objects. An Entity that has no Registry Record does not officially exist from the Civilisation's governance perspective — it cannot be owned, referenced in authority grants, audited, or governed. The Registry of Registries (the registry that catalogues all Registries) is the root data governance entity.

**Purpose:** To provide the formal admission mechanism that distinguishes governed existence from mere implementation presence. Without Registries, the Civilisation has no way to distinguish between entities that are formally recognised and governed versus entities that exist only as code artefacts or database rows. Registries are what transform an implementation into a governed architectural object.

**Required Attributes:**
- `registry_id` (Identifier) — canonical Identity
- `registry_name` (String) — canonical name
- `entry_type` (Reference → Entity Type) — the Entity Type this Registry catalogues; each Registry is specific to one Entity Type
- `governing_authority_id` (Reference) — the Entity that controls admission decisions for this Registry
- `admission_process_ref` (Reference → ET-KNW-009) — reference to the document specifying the admission process (ARCH-03 governs this)
- `record_count` (Integer) — current number of active Registry Records
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `bootstrap_date` (DateTime) — when this Registry was first established
- `last_admission_at` (DateTime) — when the most recent Registry Record was admitted

**Lifecycle:**
ESTABLISHED → ACTIVE → DEPRECATED

**Ownership Rule:** Owned by its governing authority.

**Source of Truth:** The Registry is itself authoritative for its domain. The Registry of Registries is registered in itself.

**Permitted Relationships:**
- CONTAINS → ET-DAT-002 (Registry Record)
- IS_GOVERNED_BY → governing authority Entity
- CATALOGUES → Entity Type

**Constraints:**
- Each Registry may catalogue exactly one Entity Type. A Registry that attempts to serve as the catalogue for multiple Entity Types is an architectural defect — it prevents per-type admission policies and governance rules.
- The Registry of Registries must contain a Registry Record for every other Registry in the Civilisation. A Registry that is not registered in the Registry of Registries does not officially exist as a governed Registry.

**Known Implementation State:**
The admission_rules table in Supabase implements a primitive Registry mechanism per Scripts/CONSTITUTION.md Art. 2. The write-with-outbox.js module implements a transactional write pattern for registry operations, but certification finding C11 confirmed that write-with-outbox.js has no consumers — the Registry governance mechanism exists in code but is not used. No formal Registry entities are instantiated in the current implementation. Phase 3 must bootstrap the Registry of Registries before any other entity can be formally admitted.

**Non-examples:** A database table is not a Registry — a table is the Physical Layer persistence mechanism for Registry data; the Registry is the Civilisation Layer governance entity. A configuration file is not a Registry — it holds settings, not governed admission records. A list of items in code is not a Registry — it has no admission process, no governing authority, and no evidence trail.

---

### ET-DAT-002 — Registry Record

**Definition:** A Registry Record is an entry in a Registry that formally constitutes the governed existence of a specific entity instance within its Entity Type category. A Registry Record is the entity's admission ticket — it records the admission decision, the admitting authority, the admission evidence, and the current status of the entity's governed existence. Without a Registry Record, an entity cannot participate in the Civilisation's governance processes.

**Purpose:** To provide the individual proof-of-existence for each governed entity. While the Registry (ET-DAT-001) is the catalogue, the Registry Record is the individual entry. The Registry Record carries the versioning, the admission evidence, and the deprecation history for each specific entity instance. Registry Records are how the Civilisation tracks not just that an entity exists, but when it was admitted, why it was admitted, and what has changed since.

**Required Attributes:**
- `record_id` (Identifier) — canonical Identity, unique within its Registry
- `registry_id` (Reference → ET-DAT-001) — the Registry this Record belongs to
- `represents_entity_id` (Reference) — the Identity of the entity this Record represents
- `admission_status` (Enumeration: PROPOSED | UNDER_REVIEW | ADMITTED | ACTIVE | DEPRECATED | REMOVED) — current admission state
- `admitted_by_id` (Reference) — the Identity of the admitting authority
- `admitted_at` (DateTime) — when admission was granted
- `admission_evidence_ref` (Reference → ET-KNW-004) — the Evidence Record supporting the admission decision
- `version` (String) — current version of this Registry Record; incremented when the entity's registered attributes change
- `deprecated_at` (DateTime) — when this Record was deprecated (null if not deprecated)
- `superseded_by_id` (Reference → ET-DAT-002) — the Registry Record that supersedes this one, if any

**Optional Attributes:**
- `deprecation_reason` (String) — why this Record was deprecated
- `review_notes` (String) — notes from the admission review process

**Lifecycle:**
PROPOSED → UNDER_REVIEW → ADMITTED → ACTIVE → DEPRECATED → REMOVED

An entity in PROPOSED state has been nominated for the Registry but not yet reviewed. UNDER_REVIEW means the admission process is in progress. ADMITTED means the entity has been accepted but not yet operationally active. ACTIVE is the fully operational state. DEPRECATED means the entity is being withdrawn. REMOVED means the entry has been formally retired — the Record is retained for audit but the entity is no longer governed.

**Ownership Rule:** Owned by the governing Registry's authority.

**Source of Truth:** The parent Registry is the Source of Truth for Registry Records within that Registry.

**Permitted Relationships:**
- BELONGS_TO → ET-DAT-001 (Registry)
- REPRESENTS → the governed entity instance
- IS_SUPPORTED_BY → ET-KNW-004 (Evidence Record) — admission evidence
- SUPERSEDES → prior ET-DAT-002 (Registry Record) for the same entity

**Constraints:**
- A Registry Record must reference at least one Evidence Record supporting the admission decision. An admission without evidence is constitutionally invalid.
- No entity may have more than one ACTIVE Registry Record in the same Registry. Multiple active records for the same entity create ambiguity about the entity's governed state.

**Known Implementation State:**
Registry Records do not exist as formal entities in the current implementation. The admission_rules table approximates Registry Record semantics but without admission evidence references, versioning, or the full lifecycle. The practical consequence is that all current entity instances — all Agents, all Services, all Tools — exist outside the governed Registry architecture. Phase 3 registry population is the primary deliverable of ARCH-05 through ARCH-09.

**Non-examples:** A database row is not a Registry Record — a database row is the physical persistence of a Registry Record's data. A configuration entry is not a Registry Record — configuration holds operational settings; Registry Records constitute governed existence. An Admission Record (ET-DAT-006) is not a Registry Record — the Admission Record is the evidence of the admission event; the Registry Record is the ongoing governed representation of the entity.

---

### ET-DAT-003 — Domain

**Definition:** A Domain is a bounded area of concern within the Civilisation with exactly one designated Source of Truth. Domains partition the Civilisation's information landscape into non-overlapping areas, each with clear ownership and a single authoritative source. The Domain entity is the governance unit that implements ARCH-00's single-source-of-truth principle operationally.

**Purpose:** To establish the organisational boundaries within which information governance applies. Without Domains, the single-source-of-truth principle is an aspiration with no operational structure. Domains answer the question: "Where is the authoritative record of this fact?" The Phase 2.3 audit identified 10 fact domains — Goals, Memory, Agent Tasks, Configuration, Identity, Health State, Knowledge, Session State, Strategic Objectives, Agent Reputation. Each of these is a Domain entity.

**Required Attributes:**
- `domain_id` (Identifier) — canonical Identity
- `domain_name` (String) — canonical name
- `subject_matter` (String) — a precise description of which facts and Entity Types fall within this Domain's scope
- `source_of_truth_id` (Reference → ET-DAT-004) — the single authoritative Source of Truth for this Domain
- `governing_authority_id` (Reference) — the Entity accountable for this Domain's integrity
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `adjacent_domains` (Reference list → ET-DAT-003) — Domains with which this Domain has shared boundaries or cross-references
- `conflict_resolution_policy` (Reference → ET-GOV-003) — the Policy governing how conflicts between this Domain's data and Projections are resolved

**Lifecycle:**
ESTABLISHED → ACTIVE → DEPRECATED

**Ownership Rule:** Owned by its governing authority.

**Source of Truth:** Data Governance Domain (meta-level — the Domain entity is itself governed by the Data Governance Domain).

**Permitted Relationships:**
- HAS_SOURCE_OF_TRUTH → ET-DAT-004 (Source of Truth)
- PERMITS → ET-DAT-005 (Projection) — the Projections derived from this Domain's Source of Truth
- IS_GOVERNED_BY → governing authority

**Constraints:**
- A Domain must have exactly one Source of Truth. A Domain with zero or multiple Sources of Truth is architecturally invalid — the core principle of the domain concept is violated.
- Domain boundaries must be non-overlapping. A fact may belong to exactly one Domain. A fact that falls in the scope of two Domains creates governance ambiguity.

**Known Implementation State:**
Ten Domains were identified in the Phase 2.3 Source of Truth audit. None of these are registered as formal Domain entities. The Goal Domain has a confirmed fragmentation (C13 — two independent goal systems). The Session State Domain has a confirmed dual-representation problem. The Health State Domain has a confirmed disabled persistence path (DATA-5). No Domain governance structure is formally implemented.

**Non-examples:** A database schema is not a Domain — a schema is a Physical Layer organisation of data; a Domain is a Civilisation Layer governance concept. A business area or team is not a Domain — Domains are defined by their information content and Source of Truth, not by organisational structure.

---

### ET-DAT-004 — Source of Truth

**Definition:** A Source of Truth is the single authoritative data store for all facts within a designated Domain. When the Source of Truth conflicts with any Projection of its data, the Source of Truth is correct by definition — Projections are derived and may be stale; the Source of Truth is canonical and always current. Scripts/CONSTITUTION.md Art. 1 mandates that each fact has exactly one authoritative source; the Source of Truth Entity Type is the architectural embodiment of that mandate.

**Purpose:** To designate exactly where the canonical version of each fact lives. Without the Source of Truth designation, every store that holds a fact is an equal claimant to its authority — when they disagree, there is no architectural basis for choosing. The Source of Truth concept resolves this: there is always one designated authority, and all others are derivative.

**Required Attributes:**
- `sot_id` (Identifier) — canonical Identity
- `sot_name` (String) — canonical name
- `domain_id` (Reference → ET-DAT-003) — the Domain this Source of Truth serves
- `storage_system_ref` (Reference → ET-PHY-007 or ET-PHY-008) — the physical storage system implementing this Source of Truth
- `write_protocol` (Structured) — the required process for writing to this Source of Truth; must name the Gateway through which all writes must pass
- `consistency_guarantee` (Enumeration: STRONG | EVENTUAL | BOUNDED_STALENESS) — the consistency level this Source of Truth provides
- `status` (Enumeration: ACTIVE | DEGRADED | SUSPENDED)

**Optional Attributes:**
- `read_protocol` (Structured) — the required process for reading from this Source of Truth
- `replication_policy` (Structured) — if this Source of Truth is replicated, the replication rules

**Lifecycle:**
DESIGNATED → ACTIVE → DEGRADED → SUSPENDED

**Ownership Rule:** Owned by the Domain's governing authority.

**Source of Truth:** Data Governance Domain.

**Permitted Relationships:**
- SERVES → ET-DAT-003 (Domain)
- IS_IMPLEMENTED_BY → ET-PHY-007 (Database) or ET-PHY-008 (Table)
- IS_PROJECTED_BY → ET-DAT-005 (Projection)
- IS_ACCESSED_VIA → ET-SVC-003 (Gateway) — for writes

**Constraints:**
- Every write to a Source of Truth must pass through the designated write_protocol Gateway. A write that bypasses the Gateway is an unauthorised modification — it may corrupt the Source of Truth without producing an Audit Record.
- A Source of Truth in DEGRADED or SUSPENDED state must not be treated as authoritative by consuming systems. Projections must not be updated from a DEGRADED Source — they must retain their last-known-good state until the Source recovers.

**Known Implementation State:**
The Supabase Postgres database serves as the physical implementation of multiple Sources of Truth. However, no formal Source of Truth entities are registered, and the write_protocol Gateways are either absent (5+ confirmed memory write paths bypass the gateway) or defective (checkGovernance UNCONDITIONALLY_OPEN — C02). This means the Source of Truth architecture exists at the constitutional level but is not enforced at the implementation level.

**Non-examples:** A Projection (ET-DAT-005) is not a Source of Truth — it is a derived view. A cache is not a Source of Truth — a cache is a read-optimised projection with bounded staleness. A backup is not a Source of Truth — a backup is a point-in-time copy, not the live authoritative record.

---

### ET-DAT-005 — Projection

**Definition:** A Projection is a derived, read-optimised representation of facts whose authoritative version resides in a Source of Truth. A Projection is explicitly not authoritative — when it conflicts with the Source of Truth, the Source of Truth is correct and the Projection is stale. A Projection must be clearly identified as such, with its source and synchronisation mechanism documented, so that consumers know they are reading a derivative view.

**Purpose:** To enable efficient read access to facts without requiring every read to go to the Source of Truth. Many Civilisation operations require reading facts far more often than those facts change — the in-memory working state, the cached summary of prior conversations, the agent's local view of its task queue. Without Projections, all reads must go to the Source of Truth, which may be too slow or too expensive for high-frequency access patterns. Projections enable performance while the Source of Truth architecture maintains integrity.

**Required Attributes:**
- `projection_id` (Identifier) — canonical Identity
- `source_of_truth_id` (Reference → ET-DAT-004) — the Source of Truth from which this Projection derives
- `staleness_tolerance_ms` (Integer) — the maximum acceptable lag between the Source of Truth and this Projection; violations must trigger a synchronisation or a STALE status
- `sync_mechanism` (Enumeration: EVENT_DRIVEN | SCHEDULED | ON_READ | MANUAL) — how this Projection is updated
- `transformation_rules` (Structured) — how data is transformed from the Source to the Projection format (may be identity transformation)
- `status` (Enumeration: ACTIVE | STALE | SYNC_FAILED)

**Optional Attributes:**
- `last_synced_at` (DateTime) — when this Projection was last successfully synchronised with its Source of Truth
- `consumer_entities` (Reference list) — the Entities that consume this Projection

**Lifecycle:**
ACTIVE → STALE → SYNC_FAILED → ACTIVE (after resynchronisation)

**Ownership Rule:** Owned by the Service or Entity that maintains the Projection.

**Source of Truth:** Data Governance Domain (for the Projection's metadata) — the Projection itself is definitionally not authoritative for the facts it contains.

**Permitted Relationships:**
- DERIVES_FROM → ET-DAT-004 (Source of Truth)
- IS_CONSUMED_BY → Entities that read from this Projection

**Constraints:**
- A Projection that has exceeded its `staleness_tolerance_ms` must transition to STALE status and must not be presented to consumers as authoritative.
- A Projection must never be written to directly with the intent of making it the authoritative record. All writes must go to the Source of Truth.

**Known Implementation State:**
Several confirmed Projections exist without formal registration. The in-memory health state (health/monitor.js _state) is a Projection of the Metrics Source of Truth. The getMemorySummary cache (5-minute TTL in chat-context.js) is a Projection of the Memory Source of Truth. The multiple goal representations (C13) represent a case where it is unclear which is the Source of Truth and which are Projections — a fundamental governance failure that Projections are designed to prevent.

**Non-examples:** The Source of Truth is not a Projection of itself. A database backup is not a Projection — a backup is a point-in-time copy for recovery; a Projection is a live, continuously synchronised derivative view. A log file is not a Projection — logs record events; Projections provide read access to current state.

---

### ET-DAT-006 — Admission Record

**Definition:** An Admission Record is an immutable Evidence Record produced when an Entity is formally admitted to a Registry. An Admission Record captures the admission decision itself as an irrefutable historical fact: what was admitted, to which Registry, by which authority, on what basis, and at what time. Admission Records are the governance trail for the Registry system — they prove that every Registry entry was a deliberate, authorised act.

**Purpose:** To create an immutable audit trail of every Registry admission decision. Without Admission Records, the Registry can be populated without evidence — entities can appear in Registries with no record of who admitted them, why, or when. Admission Records enforce the constitution's evidence chain requirement (Art. 3) at the Registry layer: every governed existence must be evidenced by a formal admission.

**Required Attributes:**
- `admission_id` (Identifier) — canonical Identity
- `registry_id` (Reference → ET-DAT-001) — which Registry admitted the Entity
- `entity_id` (Reference) — the Entity being admitted
- `admitted_by_id` (Reference) — the Identity of the admitting authority
- `admitted_at` (DateTime) — when admission was granted
- `justification` (String) — the formal basis for admission; why this Entity merits governed existence in this Registry
- `registry_record_id` (Reference → ET-DAT-002) — the Registry Record created by this admission

**Optional Attributes:**
- `supporting_evidence_refs` (Reference list → ET-KNW-004) — Evidence Records providing additional support for the admission decision

**Lifecycle:**
ISSUED (terminal — immutable after creation)

**Ownership Rule:** Owned by the governing Registry's authority.

**Source of Truth:** Evidence Domain (Admission Records are Evidence Records).

**Permitted Relationships:**
- EVIDENCES → ET-DAT-002 (Registry Record) — proves the admission was authorised
- IS_ISSUED_BY → admitting authority

**Constraints:**
- An Admission Record is immutable after issuance. No process may alter an Admission Record once it has been created.
- An Admission Record must exist for every ADMITTED or ACTIVE Registry Record. A Registry Record with no corresponding Admission Record is an ungoverned entry.

**Known Implementation State:**
Admission Records do not exist in the current implementation. The admission_rules table in Supabase is the closest structural analog, but it does not produce immutable admission evidence per transaction. When Phase 3 bootstraps the Registry architecture (ARCH-03), establishing the Admission Record creation mechanism is a prerequisite for all subsequent registry population.

**Non-examples:** A Registry Record (ET-DAT-002) is not an Admission Record — the Registry Record is the ongoing governed representation of the entity; the Admission Record is the evidence of the decision to create that Registry Record. An Evidence Record (ET-KNW-004) is not an Admission Record unless it specifically concerns a Registry admission decision.

---

## Section 13 — Layer 11: Identity Entity Types

Layer 11 contains the five Entity Types that establish who entities are and what they are permitted to do. Identity entities are the foundation of the Civilisation's security architecture — without the ability to know with certainty who is making a request, no authority check, no audit, and no governance can be reliable.

The current implementation has significant defects in this layer. The resolveIdentity gate in the kernelChain uses FAIL-SOFT behaviour, making anonymous identities structurally indistinguishable from verified ones. The checkAuthority gate uses FAIL-OPEN behaviour, meaning authority checks pass even when they cannot be completed. BYPASS_DASHBOARD_AUTH creates a condition where authentication can be entirely bypassed in non-production environments. These defects do not alter the architectural definitions below — they are gaps between the canonical architecture and the current implementation.

---

### ET-IDN-001 — Identity

**Definition:** An Identity is the canonical, persistent, and unique designation of a specific Entity within the Civilisation, establishing with certainty who or what that Entity is. An Identity is the basis for all Authority decisions: you cannot authorise something you cannot identify, and you cannot audit something you have not attributed to an Identity. Every Entity in the Civilisation must have exactly one Identity. Identities are assigned by the Governance system — they are not self-claimed.

**Purpose:** To provide the universal subject for all governance, authority, and audit operations. Without the Identity Entity Type, every governance check operates on unverified claims rather than confirmed facts. Who made this request? Who owns this entity? Who should be accountable for this action? All of these questions require Identity to answer. Identity is the prerequisite for everything else in the security and governance architecture.

**Required Attributes:**
- `identity_id` (Identifier) — canonical Identity (yes — an Identity has its own Identity, which is how it is referenced by other Entities)
- `canonical_form` (String) — the unique string designation identifying this Entity within the Civilisation
- `entity_id` (Reference) — the Entity this Identity designates
- `identity_type` (Enumeration: FOUNDER | COUNCIL_MEMBER | MINISTRY | AGENT | SYSTEM | ANONYMOUS) — the category of Identity
- `trust_level_id` (Reference → ET-IDN-003) — the Trust Level associated with this Identity type
- `established_at` (DateTime) — when this Identity was first established
- `status` (Enumeration: ACTIVE | SUSPENDED | REVOKED)

**Optional Attributes:**
- `display_name` (String) — a human-readable label for this Identity in audit and monitoring outputs
- `verification_history` (Structured) — a summary of past authentication events

**Lifecycle:**
ESTABLISHED → ACTIVE → SUSPENDED → REVOKED

A REVOKED Identity must not be used for any authentication or authority purpose. Evidence of revocation must be retained.

**Ownership Rule:** Owned by the Governance system. Identities are assigned, not self-claimed.

**Source of Truth:** Identity Domain.

**Permitted Relationships:**
- DESIGNATES → any Entity
- CARRIES → ET-IDN-003 (Trust Level)
- IS_AUTHENTICATED_BY → ET-IDN-002 (Credential)

**Constraints:**
- Every Entity must have exactly one ACTIVE Identity. An Entity with zero identities cannot be governed. An Entity with two identities has an ambiguous governance subject.
- An Identity's `trust_level_id` must accurately reflect the actual governance authority of its Entity. An Identity carrying a higher Trust Level than its Entity is authorised to hold is an escalation-of-privilege vulnerability.

**Known Implementation State:**
Identity resolution is implemented in lib/kernel.js via the resolveIdentity gate (first gate of the kernelChain). The gate uses FAIL-SOFT behaviour — when resolution fails, it does not reject the request but assigns an anonymous Identity. The critical defect is that an anonymous Identity produced by FAIL-SOFT is structurally identical in form to a verified Identity — downstream gates cannot distinguish between a properly verified Identity and a fallback anonymous one. This undermines the entire authority chain. Authentication mechanisms include APP_ACCESS_KEY (timingSafeEqual) and JWT (jsonwebtoken.verify).

**Non-examples:** A username is not an Identity — a username is a claim presented by a user; an Identity is the verified, canonical designation assigned by the Governance system. A Credential is not an Identity — a Credential proves an Identity claim; the Identity is what the Credential proves.

---

### ET-IDN-002 — Credential

**Definition:** A Credential is a verifiable artifact that a presenting Entity uses to prove its claim to a specific Identity. Credentials are the proof mechanism — they are what makes the difference between claiming to be the Founder and actually demonstrating that claim. The Civilisation currently uses two Credential types: APP_ACCESS_KEY (a shared secret compared with timingSafeEqual to prevent timing attacks) and JWT (a signed token verified with jsonwebtoken.verify()).

**Purpose:** To provide the cryptographic or cryptographic-equivalent mechanism for Identity verification. Without Credentials, the Civilisation must either trust all claims (no security) or reject all claims (no access). Credentials provide the middle path: claims that are accompanied by a verifiable proof can be granted the Trust Level that the proven Identity carries.

**Required Attributes:**
- `credential_id` (Identifier) — canonical Identity
- `credential_type` (Enumeration: APP_ACCESS_KEY | JWT | API_KEY | OTHER) — the credential mechanism
- `holder_entity_id` (Reference) — the Entity holding this Credential; the Entity that may present it for authentication
- `issued_at` (DateTime) — when this Credential was issued
- `expiry` (DateTime) — when this Credential expires (null for non-expiring Credentials)
- `status` (Enumeration: ACTIVE | EXPIRED | REVOKED)

**Optional Attributes:**
- `issuing_authority_id` (Reference) — the Entity that issued this Credential
- `scope` (String) — the scope or access level this Credential is valid for (for JWT-based Credentials)

**Lifecycle:**
ISSUED → ACTIVE → EXPIRED / REVOKED

**Ownership Rule:** Owned by its holder entity.

**Source of Truth:** Identity Domain.

**Permitted Relationships:**
- IS_HELD_BY → the holder Entity
- AUTHENTICATES → ET-IDN-001 (Identity) when successfully verified

**Constraints:**
- An EXPIRED or REVOKED Credential must not be accepted for authentication. A system that accepts expired Credentials is operating without effective access control.
- Credential comparison for secret-type Credentials (APP_ACCESS_KEY) must use constant-time comparison (timingSafeEqual or equivalent) to prevent timing-attack-based credential inference.

**Known Implementation State:**
Two Credential types are confirmed. APP_ACCESS_KEY is verified in lib/middleware.js using timingSafeEqual — timing attack prevention is confirmed ENFORCED (INV-A5). JWT is verified using jsonwebtoken.verify() in lib/middleware.js. A critical defect exists: BYPASS_DASHBOARD_AUTH (C10) creates a condition where the dashboard route skips Credential verification entirely when NODE_ENV !== 'production'. This is an operator-dependent guard — it relies on the environment variable being correctly set. Any deployment where NODE_ENV is not 'production' would grant unauthenticated access to the dashboard.

**Non-examples:** A password is not a Credential in this taxonomy — a password is the secret within an APP_ACCESS_KEY Credential; the Credential entity governs the whole verification mechanism, not just the secret value. An Identity is not a Credential — the Identity is what the Credential proves; the Credential is the proof mechanism.

---

### ET-IDN-003 — Trust Level

**Definition:** A Trust Level is a defined, strictly ordered degree of architectural confidence associated with an Identity type. Trust Levels are the Civilisation's authority stratification — they establish a total ordering from the absolute authority of the Founder to the absence of any claimed authority. Trust Levels govern what Capabilities an Identity may invoke, what Boundaries it may cross, and what Resources it may consume. All six Trust Levels are defined and fixed — no new Trust Level may be added without a MAJOR constitutional amendment.

**Purpose:** To provide a finite, ordered, unambiguous authority scale. Without Trust Levels, authority rules must reference specific Identities — "only the Founder may do X, or CEO, or COO." Trust Levels abstract this: "only SOVEREIGN authority may do X." This abstraction decouples policy from personnel — as the identity of Council Members changes, the policies remain valid because they reference Trust Levels, not individual Identities.

**Required Attributes:**
- `trust_level_id` (Identifier) — canonical Identity
- `level_name` (Enumeration: SOVEREIGN | EXECUTIVE | OPERATIONAL | TASK | SYSTEM | NONE) — canonical name
- `ordinal` (Integer) — numeric ordering enforcing the total order: SOVEREIGN=6, EXECUTIVE=5, OPERATIONAL=4, TASK=3, SYSTEM=2, NONE=1
- `associated_identity_types` (Enumeration set) — which Identity types carry this Trust Level
- `authority_scope_description` (String) — a precise description of what authority this level permits

**Optional Attributes:** None — Trust Levels are fully specified by their required attributes.

**Lifecycle:**
DEFINED (effectively permanent — modifying Trust Level definitions is a MAJOR constitutional amendment requiring SOVEREIGN authority and full Council review)

**Ownership Rule:** Owned by the Governance system.

**Source of Truth:** Identity Domain.

**Permitted Relationships:**
- IS_CARRIED_BY → ET-IDN-001 (Identity)
- GOVERNS → authority checks in all Gateways

**Constraints:**
- The six Trust Levels form a strict total order. No two Trust Levels have the same ordinal. No Trust Level may be added between existing levels without a MAJOR constitutional amendment.
- An entity may not exercise authority at a higher Trust Level than its Identity carries. Any gate that permits this is either defective (FAIL-OPEN) or constitutionally authorised as an exception.

**Known Implementation State:**
The six Trust Levels are implemented implicitly in the authority chain: Founder → Council Members (EXECUTIVE) → Ministries (OPERATIONAL) → Agents (TASK) → System services (SYSTEM) → Anonymous (NONE). The checkAuthority() function in lib/kernel.js should enforce Trust Level requirements at each Boundary. However, checkAuthority is confirmed FAIL-OPEN on error — authority checks that cannot be completed permit access rather than denying it. This means Trust Level enforcement is defective at the gate level, though the conceptual hierarchy is structurally present.

**Non-examples:** A role in a permissions system is not a Trust Level — roles are often flat or hierarchical in ways that do not enforce a total order; Trust Levels are a strict, fixed hierarchy with no equivalences. An access control list entry is not a Trust Level — ACL entries govern individual resource access; Trust Levels govern overall authority class.

---

### ET-IDN-004 — Authority Grant

**Definition:** An Authority Grant is the formal, evidence-bearing record of a specific subset of authority delegated from one Entity to another. An Authority Grant specifies exactly what authority has been delegated, its scope (which Capabilities or Entity Types it covers), its ceiling (the maximum Trust Level the grantee may exercise under this grant), and its duration (perpetual or time-limited). Authority Grants are the mechanism by which SOVEREIGN authority is distributed through the Civilisation without being surrendered by the Founder.

**Purpose:** To make authority delegation explicit, bounded, and revocable. Without Authority Grants, delegation is either total (the delegate has all the grantor's authority — dangerous) or implicit (the delegate's authority is assumed from their role — ungoverned). Authority Grants create governed, auditable, bounded delegation: exactly what is delegated, to whom, for how long, and over what scope.

**Required Attributes:**
- `grant_id` (Identifier) — canonical Identity
- `grantor_identity_id` (Reference → ET-IDN-001) — the Identity granting authority
- `grantee_identity_id` (Reference → ET-IDN-001) — the Identity receiving authority
- `capability_scope` (Reference list → ET-CAP-001) — which Capabilities this Grant covers; an empty list means the Grant covers no specific Capabilities
- `entity_scope` (Reference list → Entity Types) — which Entity Types this Grant covers
- `trust_level_ceiling` (Reference → ET-IDN-003) — the grantee may not exercise authority above this level under this Grant
- `granted_at` (DateTime) — when this Grant was issued
- `expiry` (DateTime) — when this Grant expires; null for PERPETUAL grants
- `status` (Enumeration: ACTIVE | EXPIRED | REVOKED)

**Optional Attributes:**
- `conditions` (Structured) — additional conditions under which this Grant is exercisable
- `revocation_reason` (String) — why this Grant was revoked, if status is REVOKED

**Lifecycle:**
GRANTED → ACTIVE → EXPIRED / REVOKED

**Ownership Rule:** Owned by the grantor.

**Source of Truth:** Identity Domain.

**Permitted Relationships:**
- IS_GRANTED_BY → grantor Entity
- IS_HELD_BY → grantee Entity
- COVERS → ET-CAP-001 (Capability) — the Capabilities within scope

**Constraints:**
- An Authority Grant may not confer Trust Level authority above the grantor's own Trust Level. A Council Member at EXECUTIVE level cannot grant SOVEREIGN authority.
- An EXPIRED or REVOKED Authority Grant must not be honoured. Any gate that accepts a revoked Authority Grant as valid is a security defect.

**Known Implementation State:**
Authority Grants are not implemented as formal entities in the current codebase. Authority is implicitly granted through role assignment (Council Member roles, Agent type assignments) rather than through explicit Authority Grant entities. The DELEGATES_TO relationship documented in the handoff document should be reified as Authority Grant entities during Phase 3 registry population.

**Non-examples:** A user role assignment is not an Authority Grant — roles are implicit authority categories; Authority Grants are explicit, bounded delegations. A session token is not an Authority Grant — session tokens identify and authenticate; Authority Grants delegate authority.

---

### ET-IDN-005 — Session Identity

**Definition:** A Session Identity is the resolved, request-scoped or session-scoped representation of an Identity for a specific interaction. For the duration of a Session or individual request, the Session Identity carries the resolved Trust Level, the verification mechanism that was used, and the verification status. Session Identities are ephemeral — they exist only for the duration of their parent Session or request and are derived from, but not identical to, the persistent Identity they represent.

**Purpose:** To separate the persistent Identity (which lasts for the life of the Entity) from the transient resolved context (which lasts for one Session or request). The persistent Identity establishes who an Entity is. The Session Identity establishes, for this specific interaction, that the Entity has been verified as who they claim to be, by what mechanism, and with what result. This separation enables the Civilisation to answer: "Is this request from someone who has been verified in this session?"

**Required Attributes:**
- `session_identity_id` (Identifier) — canonical Identity
- `session_id` (Reference → ET-COM-003) — the Session or request this Identity is resolved within
- `base_identity_id` (Reference → ET-IDN-001) — the persistent Identity this Session Identity is derived from
- `verification_method` (Enumeration: APP_KEY | JWT | ANONYMOUS) — how this Session Identity was established
- `verification_status` (Enumeration: VERIFIED | UNVERIFIED | FAILED) — the outcome of the verification process
- `trust_level_id` (Reference → ET-IDN-003) — the effective Trust Level for this Session, determined by the verification outcome
- `resolved_at` (DateTime) — when this Session Identity was resolved

**Optional Attributes:**
- `verification_evidence_ref` (Reference) — the Credential or token that was used in verification

**Lifecycle:**
RESOLVED → ACTIVE → EXPIRED (on Session end)

**Ownership Rule:** Owned by the Session.

**Source of Truth:** Session Domain.

**Permitted Relationships:**
- IS_DERIVED_FROM → ET-IDN-001 (Identity)
- BELONGS_TO → ET-COM-003 (Session)

**Constraints:**
- A Session Identity with `verification_status` = UNVERIFIED must carry `trust_level_id` = NONE. An unverified identity may not carry any Trust Level above NONE.
- A Session Identity derived from the resolveIdentity FAIL-SOFT path (anonymous fallback) must be clearly distinguished from a Session Identity derived from successful verification. The current implementation does not make this distinction — this is the architectural defect that must be corrected.

**Known Implementation State:**
Session Identity is implemented via lib/kernel.js req.identity attachment. The resolveIdentity gate constructs a Session Identity for each request. When authentication succeeds, the Session Identity carries the verified Trust Level. When authentication fails (FAIL-SOFT), the Session Identity carries ANONYMOUS trust — but structurally identical to a verified one, making downstream gates unable to distinguish the two cases. This is a critical security defect. The downstream gates (checkAuthority, checkGovernance) cannot correctly apply Trust Level requirements without a reliable verification_status flag.

**Non-examples:** An Identity (ET-IDN-001) is not a Session Identity — the Identity is persistent; the Session Identity is ephemeral and session-scoped. A Credential is not a Session Identity — the Credential is the proof mechanism; the Session Identity is the resolved conclusion of applying that proof mechanism.

---

## Section 14 — Layer 12: Physical Architecture Entity Types

Layer 12 contains the fourteen Entity Types that represent the implementation of the Civilisation in its physical technical substrate. Physical Layer entities are governed as implementation artifacts — they are owned by their Civilisation Layer counterparts via the IMPLEMENTS and DEPLOYS relationship types, and their governance regime is less immutable than Civilisation Layer entities because the physical substrate changes as technology evolves.

The distinction between Civilisation Layer and Physical Layer is not a value judgment — neither layer is more real or more important than the other. The Civilisation Layer defines what the architecture is; the Physical Layer defines how it is currently realised. A Repository Transformation (ARCH-15) changes Physical Layer entities. A constitutional amendment changes Civilisation Layer entities. Both are governed, but under different authority levels and immutability profiles.

---

### ET-PHY-001 — Repository

**Definition:** A Repository is the version-controlled container for all implementation artifacts of the Civilisation. The Repository is the physical projection of the Civilisation — it holds every File, Module, Function, configuration, and document that constitutes the Civilisation's current implementation. The handoff document's formulation is precise: the repository is one projection of the civilisation, not the civilisation itself.

**Purpose:** To provide the canonical physical container for all implementation artifacts. Without the Repository Entity Type, the filesystem is an ungoverned collection of files with no architectural identity. Designating the Repository as an Entity enables the Civilisation to govern its structure, mandate folder organisation conventions, and track the Repository's relationship to the Civilisation entities it implements.

**Required Attributes:**
- `repository_id` (Identifier) — canonical Identity
- `repository_name` (String) — canonical name
- `primary_branch` (String) — the branch that represents the production state
- `hosting_platform` (String) — where the repository is hosted (e.g., the hosting service)
- `status` (Enumeration: ACTIVE | ARCHIVED)

**Optional Attributes:**
- `deployment_target_ref` (String) — the hosting platform where the Repository's contents are deployed

**Lifecycle:**
ACTIVE → ARCHIVED

**Ownership Rule:** Owned by the Founder.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- CONTAINS → ET-PHY-002 (Folder), ET-PHY-003 (File)
- DEPLOYS → ET-SVC-001 (Service) — the Repository, when deployed, makes Services available
- IS_GOVERNED_BY → repository governance policy

**Constraints:**
- The Repository must not contain files with known secret values (API keys, credentials) in version-controlled content. Secret values must be managed via Environment Variables (ET-PHY-009) or equivalent secret management.
- The Repository's folder structure must reflect Civilisation organisational divisions per the repository philosophy established in the handoff document.

**Known Implementation State:**
The APEX repository (Scripts/ folder) is confirmed active and deployed to Render. The current folder structure reflects historical development conventions rather than Civilisation organisational divisions — the Repository Transformation Plan (ARCH-15) will align the Physical structure with the Civilisation architecture. The primary deployment branch and hosting platform are confirmed operational.

**Non-examples:** A backup of the Repository is not the Repository — it is a point-in-time copy. A deployment artifact (a built package or container image) is not the Repository — it is a derived artifact. A documentation system outside version control is not part of the Repository.

---

### ET-PHY-002 — Folder

**Definition:** A Folder is an organisational container within the Repository that groups Files according to the Civilisation domain or architectural concern they represent. Per the handoff document's repository philosophy, Folders must represent organisational divisions of the Civilisation, not programming-language conventions or technical-layer separations. A Folder named after a business domain (e.g., 03_Agents/) governs what it contains by Civilisation meaning; a Folder named after a technical layer (e.g., utils/ or helpers/) is an implementation convention without Civilisation meaning.

**Purpose:** To provide navigable, semantically meaningful structure within the Repository. Without governed Folders, file organisation is arbitrary — developers choose locations based on personal preference or convention, making it impossible to determine what a directory contains without reading every file within it. Folders with Civilisation meaning make the repository self-documenting at the structural level.

**Required Attributes:**
- `folder_id` (Identifier) — canonical Identity
- `path` (String) — canonical path within the Repository (relative to repository root)
- `organisational_purpose` (String) — which Civilisation domain or architectural concern this Folder represents
- `parent_folder_id` (Reference → ET-PHY-002) — parent Folder; null for top-level Folders
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `proposed_name` (String) — the name this Folder will have after the Repository Transformation (if different from current)

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the Civilisation entity whose domain the Folder represents.

**Source of Truth:** Infrastructure Domain (the Repository itself is authoritative for its structure).

**Permitted Relationships:**
- BELONGS_TO → ET-PHY-001 (Repository) or ET-PHY-002 (parent Folder)
- CONTAINS → ET-PHY-002 (Folder), ET-PHY-003 (File)
- REPRESENTS → Civilisation domain or organisational division

**Constraints:**
- A Folder's `organisational_purpose` must reference a Civilisation domain or architectural concern. Folders without Civilisation meaning must be deprecated in the Repository Transformation.
- Folder nesting depth must not be arbitrary. The Repository Transformation Plan must specify the maximum nesting depth and the criteria governing sub-folder creation.

**Known Implementation State:**
The current folder structure is confirmed from the Phase 1 census. Top-level folders include lib/, routes/, services/, docs/, and others — organised by technical function rather than Civilisation domain. The handoff document proposes a reorganisation into numbered Civilisation-domain folders (00_Governance through 99_Archive). The physical reorganisation is planned for ARCH-15.

**Non-examples:** A namespace in code is not a Folder — code namespaces are implementation constructs within Files. A deployment environment (staging, production) is not a Folder — environments are deployment targets, not repository structures.

---

### ET-PHY-003 — File

**Definition:** A File is an individual, named artifact within the Repository containing either source code, configuration, documentation, schema definitions, test specifications, or data. Files are the atomic physical units of the Repository — every piece of content in the Civilisation's implementation is in a File. Files implement Civilisation entities (a Module File implements a Service; a configuration File implements an Environment Variable set; a documentation File implements a Document).

**Purpose:** To provide the physical unit of implementation attribution. Without the File Entity Type, implementation is an undifferentiated mass — there is no governed unit of authorship, no unit of change management, and no unit of Civilisation implementation mapping. Files are what makes it possible to say "this physical artifact implements this Civilisation entity."

**Required Attributes:**
- `file_id` (Identifier) — canonical Identity
- `path` (String) — canonical path within the Repository
- `file_type` (Enumeration: SOURCE | CONFIG | DOCUMENTATION | SCHEMA | TEST | DATA) — the category of content this File holds
- `implements_entity_id` (Reference) — the primary Civilisation entity this File implements; null for Files that do not implement a single primary entity
- `status` (Enumeration: ACTIVE | DEPRECATED | ARCHIVED)

**Optional Attributes:**
- `line_count` (Integer) — current line count (informational; not governed)
- `last_modified_at` (DateTime) — when this File was last modified

**Lifecycle:**
ACTIVE → DEPRECATED → ARCHIVED

**Ownership Rule:** Owned by the Civilisation entity it primarily implements, or the governing authority of its domain.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-PHY-002 (Folder)
- CONTAINS → ET-PHY-004 (Module), ET-PHY-005 (Function), ET-PHY-006 (Class)
- IMPLEMENTS → ET-SVC-001 (Service), ET-CAP-001 (Capability), ET-DAT-004 (Source of Truth), or other Civilisation entity

**Constraints:**
- A File may not contain secrets (API keys, passwords, tokens) in version-controlled content. Secrets discovered in Files must trigger an immediate rotation and removal procedure.
- Files without a meaningful `implements_entity_id` and `file_type` = SOURCE represent unattributed implementation — they implement something but the Civilisation has not recorded what. ARCH-15 must resolve all such attribution gaps.

**Known Implementation State:**
The Phase 1 census catalogued all Files in the current Repository. Key Files confirmed: server.js (primary routing and agent logic), lib/kernel.js (kernelChain), lib/event-bus.js, lib/memory/gateway.js, lib/models/runtime/index.js, lib/apex-tools.js, services/init.js, executive-council.js, agent-task-cycle.js, and many others. No formal File entities are registered with Identities in the current implementation.

**Non-examples:** A database table is not a File — it is ET-PHY-008. An API endpoint is not a File — it is ET-PHY-010 (implemented within a File). A deployment artifact is not a File in this taxonomy — this taxonomy concerns Repository content, not build outputs.

---

### ET-PHY-004 — Module

**Definition:** A Module is a named, logically coherent unit of implementation logic within a File that groups related Functions, Classes, and constants, and exposes a defined export interface. A Module is the Civilisation's unit of logical implementation attribution — when the Phase 2.1 dependency graph was built, it traced Module-level import relationships to establish the implementation graph of the Civilisation.

**Purpose:** To provide the named unit of code organisation above the individual Function. Modules enable dependency analysis (Module A imports Module B), implementation attribution (Module C implements Service D), and governed refactoring (renaming or moving a Module has known consequences on all importing Modules). Without Modules as registered entities, code-level impact analysis is imprecise.

**Required Attributes:**
- `module_id` (Identifier) — canonical Identity
- `name` (String) — canonical module name (the export name or file name used in import statements)
- `file_id` (Reference → ET-PHY-003) — the File containing this Module
- `implements_service_id` (Reference → ET-SVC-001) — the Service this Module implements; null if it does not implement a single Service
- `implements_capability_id` (Reference → ET-CAP-001) — the Capability this Module implements; null if it does not implement a single Capability
- `export_interface` (Structured) — the public API this Module exposes (functions, classes, constants)
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `dependency_count` (Integer) — number of Modules this Module imports (informational)

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the Civilisation entity it implements.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-PHY-003 (File)
- CONTAINS → ET-PHY-005 (Function), ET-PHY-006 (Class)
- CALLS → ET-PHY-004 (Module), ET-PHY-005 (Function) — the import graph
- IMPLEMENTS → ET-SVC-001 (Service) or ET-CAP-001 (Capability)

**Constraints:**
- A Module may not have circular dependencies with other Modules. Circular module dependencies prevent deterministic load order and are implementation defects.
- A Module's exported interface must be documented in its `export_interface` attribute. Undocumented exports are ungoverned extension points.

**Known Implementation State:**
Module-level dependency relationships were mapped in Phase 2.1. Key Modules confirmed: civilization-kernel.js (primary orchestration), agent-task-cycle.js (task lifecycle), agent-queue.js (concurrency), gateway.js (memory writes), constitutional-gate.js (governance evaluation), and many others. No Modules are registered as formal entities.

**Non-examples:** A package (npm package) is not a Module in this taxonomy — external packages are dependencies, not Civilisation-governed Modules. A Folder is not a Module — a Folder organises Files; a Module is a named code unit within a File.

---

### ET-PHY-005 — Function

**Definition:** A Function is a named, typed, callable unit of implementation logic within a Module that accepts defined inputs, performs a bounded operation, and returns a defined output. Functions are the finest-grained implementation unit tracked in the Civilisation Registry. Every Capability invocation ultimately resolves to one or more Function calls in the Physical Layer.

**Purpose:** To enable precise implementation attribution and impact analysis at the finest practical granularity. Module-level attribution tells you which Module implements a Capability; Function-level attribution tells you exactly which code unit. When a certification finding identifies a defect (e.g., Bug B1: decisionMemoryId always null), the defect traces to a specific Function (reflexion-tracker.js getDecisionMemoryId). The Function Entity Type makes that traceability explicit and governed.

**Required Attributes:**
- `function_id` (Identifier) — canonical Identity
- `name` (String) — canonical function name within its Module
- `module_id` (Reference → ET-PHY-004) — the Module containing this Function
- `implements_capability_id` (Reference → ET-CAP-001) — the Capability this Function implements; null if it is an internal helper
- `signature` (Structured) — the input parameter types and output type
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `defect_refs` (String list) — references to known defect codes affecting this Function (e.g., B1, C02)
- `async` (Boolean) — whether this Function is asynchronous

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by its parent Module's owner.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-PHY-004 (Module)
- CALLS → ET-PHY-005 (Function) — call graph
- IMPLEMENTS → ET-CAP-001 (Capability)

**Constraints:**
- A Function with a known defect (defect_refs non-empty) must have an associated remediation record. Defects without remediation plans are ungoverned technical debt.
- Functions that cross Trust Boundaries must be registered and must have `implements_capability_id` pointing to the relevant Gateway Capability.

**Known Implementation State:**
Key Functions with confirmed defects: `getDecisionMemoryId` in reflexion-tracker.js (Bug B1 — queries 'id' instead of 'memory_id'), `checkGovernance` in agent-file-utils.js (C02 — UNCONDITIONALLY_OPEN), `getSuccessRate` in agent-reputation.js (Bug B4 — reads wrong table). The Phase 2.2 runtime census identified execution flows at the function level. No Functions are registered as formal entities.

**Non-examples:** An anonymous arrow function used as a callback is not a Function in this taxonomy unless it is given a named, registered identity. A database stored procedure is not a Function in this taxonomy — stored procedures are Database objects governed by ET-PHY-008 attributes.

---

### ET-PHY-006 — Class

**Definition:** A Class is a named, typed object definition within a Module that groups related Functions and Property definitions under a shared namespace, supports instantiation, and may define inheritance relationships. Classes are the object-oriented organisation unit in the Physical Layer, providing a mechanism for grouped state and behaviour.

**Purpose:** To govern the use of object-oriented patterns in the implementation. Where the Civilisation's code defines Classes, those Classes are Physical Layer entities with implementation relationships to Civilisation entities. Making Classes first-class entities enables the Civilisation to track inheritance hierarchies, identify Classes that implement Civilisation concepts, and govern Class-level refactoring.

**Required Attributes:**
- `class_id` (Identifier) — canonical Identity
- `name` (String) — canonical class name
- `module_id` (Reference → ET-PHY-004) — the Module containing this Class
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `parent_class_id` (Reference → ET-PHY-006) — if this Class inherits from another
- `implements_entity_type_id` (Reference → Entity Type) — the Civilisation Entity Type this Class implements, if applicable

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by its parent Module's owner.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-PHY-004 (Module)
- CONTAINS → ET-PHY-005 (Function)
- IMPLEMENTS → Civilisation Entity Type

**Constraints:**
- A Class may not extend another Class across Module boundaries unless the inheritance relationship is documented and governed.

**Known Implementation State:**
The current codebase uses primarily module-pattern and function-based patterns rather than ES6 class syntax. Where Classes exist, they are not formally registered. Phase 3 will establish Class-level registration for significant implementation patterns.

**Non-examples:** A JavaScript prototype chain is not a Class in this taxonomy unless it is expressed as a named Class definition. A database table schema is not a Class.

---

### ET-PHY-007 — Database

**Definition:** A Database is a managed persistent data store hosting one or more Tables, providing the physical persistence layer for Civilisation Sources of Truth and Projections. The Database is the primary physical implementation of the Civilisation's authoritative data stores. In the current APEX Civilisation, the primary Database is the Supabase Postgres instance. The Database Entity Type governs the Database as a physical infrastructure entity, distinct from the logical Sources of Truth it implements.

**Purpose:** To govern the physical persistence infrastructure as an architectural entity. Without the Database Entity Type, the persistence layer is an implementation detail outside the governance architecture. Making it an Entity enables the Civilisation to record what Sources of Truth the Database implements, what its security configuration is (RLS status, authentication type), and what its health state is. This is the foundation for data governance accountability.

**Required Attributes:**
- `database_id` (Identifier) — canonical Identity
- `database_name` (String) — canonical name
- `implements_sot_ids` (Reference list → ET-DAT-004) — which Sources of Truth this Database physically implements
- `connection_auth_type` (Enumeration: SERVICE_ROLE | ANON_KEY | JWT | OTHER) — how connections to this Database are authenticated
- `rls_enabled` (Enumeration: ENABLED | DISABLED | UNKNOWN) — whether Row Level Security is active at the database level
- `status` (Enumeration: ACTIVE | DEGRADED | UNAVAILABLE)

**Optional Attributes:**
- `schema_version` (String) — the current migration version of the database schema
- `region` (String) — the geographic region where this Database is hosted

**Lifecycle:**
ACTIVE → DEGRADED → UNAVAILABLE → ACTIVE (after recovery)

**Ownership Rule:** Owned by the Infrastructure Ministry or equivalent governing authority.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- IMPLEMENTS → ET-DAT-004 (Source of Truth)
- CONTAINS → ET-PHY-008 (Table)
- IS_ACCESSED_VIA → ET-SVC-003 (Gateway) — for governed writes

**Constraints:**
- RLS configuration must not be UNKNOWN in a production Database. UNKNOWN RLS status means the Civilisation cannot determine whether row-level access control is enforced, which is a security audit gap.
- A Database hosting Sources of Truth must require authenticated connections. Unauthenticated database access is a critical security defect.

**Known Implementation State:**
The primary Database is Supabase Postgres. Multiple Supabase clients are confirmed in the codebase. The RLS status is UNKNOWN (UN01 — certification finding: RLS status not confirmed for any table). Connection uses the SERVICE_ROLE key in production. No formal Database Entity is registered.

**Non-examples:** A cache (e.g., in-memory state) is not a Database — caches are Projections, not persistent Sources of Truth. A file-based store (the Obsidian vault) is not a Database in this taxonomy — it is implemented through File entities.

---

### ET-PHY-008 — Table

**Definition:** A Table is a named, structured collection of records within a Database, implementing a specific aspect of a Source of Truth or Registry. Tables are the finest-grained physical persistence unit in the Civilisation's data architecture. Each Table stores instances of one Entity Type's Properties, or serves a specific operational function (such as the outbox table for transactional writes).

**Purpose:** To govern the physical table structure as a first-class entity. Without Table registration, schema changes are ungoverned — a column dropped from a Table can silently break Civilisation Layer code with no architectural record of the dependency. Making Tables Entities enables the Civilisation to record which Entity Types they store, what their RLS status is, whether they use the outbox pattern, and what their current schema version is.

**Required Attributes:**
- `table_id` (Identifier) — canonical Identity
- `table_name` (String) — canonical table name within the Database
- `database_id` (Reference → ET-PHY-007) — the parent Database
- `implements_entity_type_id` (Reference → Entity Type) — which Entity Type's instances this Table stores; null for operational tables (outbox, consumer_offsets)
- `rls_status` (Enumeration: ENABLED | DISABLED | UNKNOWN) — Row Level Security status for this specific Table
- `has_outbox` (Boolean) — whether this Table participates in the write-with-outbox transactional pattern per Scripts/CONSTITUTION.md Art. 4
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `schema_summary` (Structured) — column names and types (informational; full schema governed by migration files)
- `estimated_row_count` (Integer) — approximate number of rows (for capacity planning)

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the governing authority of the Domain whose Source of Truth this Table implements.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-PHY-007 (Database)
- IMPLEMENTS → Entity Type storage for a specific Source of Truth

**Constraints:**
- A Table's `rls_status` must not be UNKNOWN in a production Database. Every Table must be explicitly confirmed as either ENABLED or DISABLED.
- A Table that implements a Source of Truth and has `has_outbox` = false must have documented justification for the absence of the outbox pattern, if transactional writes are required.

**Known Implementation State:**
Confirmed Tables: apex_agent_runs (implements Agent Task execution records), semantic_memory, episodic_memory, procedural_memory, decision_memory (implement Memory Record sub-types), executive_deliberations, executive_votes (implement Deliberation and Vote), civilization_health_snapshots (implements Metric history — dimensions column confirmed, writes currently disabled DATA-5), outbox, consumer_offsets (transactional infrastructure), admission_rules (Registry primitive). All Tables have rls_status = UNKNOWN (UN01).

**Non-examples:** A JSON file is not a Table — it is a File (ET-PHY-003). A cache hash map is not a Table — it is an in-memory Projection. A view (database view) is not a Table in this taxonomy — views are Projections of Tables.

---

### ET-PHY-009 — Environment Variable

**Definition:** An Environment Variable is a named runtime configuration value supplied to the Civilisation's Services at process startup or via the hosting platform's configuration system. Environment Variables are the primary mechanism for injecting secrets, feature flags, and deployment configuration into the Civilisation without embedding them in version-controlled code. Some Environment Variables have constitutional significance — their values directly affect the Civilisation's security and governance behaviour.

**Purpose:** To govern runtime configuration as a first-class entity. Without the Environment Variable Entity Type, configuration management is ungoverned — any value can be changed without audit, without reviewing its governance impact, and without notifying the Founder. Making Environment Variables Entities enables the Civilisation to classify them by sensitivity, record their constitutional significance, and ensure that changes to governance-significant variables trigger the appropriate review processes.

**Required Attributes:**
- `env_var_id` (Identifier) — canonical Identity
- `variable_name` (String) — canonical name of the variable
- `purpose` (String) — what this variable controls
- `sensitivity` (Enumeration: PUBLIC | SENSITIVE | SECRET) — the security classification of this variable's value
- `required` (Boolean) — whether the Civilisation fails to start if this variable is absent
- `current_environment` (Enumeration: PRODUCTION | STAGING | LOCAL) — which deployment environment this registration covers
- `governance_significance` (Enumeration: CONSTITUTIONAL | OPERATIONAL | CONFIGURATION) — whether this variable directly affects constitutional behaviour

**Optional Attributes:**
- `default_value` (String) — the value used if the variable is absent; only valid when `required` = false
- `valid_values` (String list) — enumerated valid values, if applicable

**Lifecycle:**
REGISTERED → ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the Infrastructure Ministry or the Founder (for CONSTITUTIONAL significance variables).

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- GOVERNS → the Service or behaviour it configures
- IS_MANAGED_BY → hosting platform configuration

**Constraints:**
- A CONSTITUTIONAL significance Environment Variable may only be changed with SOVEREIGN approval. Changes to variables that affect the governance or security behaviour of the Civilisation are constitutional events.
- A SECRET sensitivity variable must not be logged, included in error messages, or exposed in API responses. A Secret value that appears in a log is a security incident.

**Known Implementation State:**
Confirmed Environment Variables with governance significance: AUTONOMY_LEVEL (CONSTITUTIONAL — value "3" bypasses PLANNED→APPROVED lifecycle gate), BYPASS_DASHBOARD_AUTH (CONSTITUTIONAL — when set in non-production environments, bypasses dashboard authentication, C10), NODE_ENV (OPERATIONAL — affects multiple conditional behaviours), ANTHROPIC_API_KEY (SECRET — access to AI Models), SUPABASE_SERVICE_ROLE_KEY (SECRET — privileged database access), APP_ACCESS_KEY (SECRET — dashboard authentication), SLACK_BOT_TOKEN (SENSITIVE — external notification channel).

**Non-examples:** A hardcoded constant in source code is not an Environment Variable — it is a File-level configuration value with no runtime injection. A database configuration row is not an Environment Variable — it is a Table row.

---

### ET-PHY-010 — API Route

**Definition:** An API Route is a registered HTTP endpoint that exposes one or more Capabilities through an HTTP Interface. An API Route is the HTTP projection of a Service Interface — it is the specific URL path, method, authentication requirement, and handler that implements a Capability for HTTP callers. API Routes are the Physical Layer implementation of Civilisation-level Interfaces (ET-SVC-002).

**Purpose:** To govern the HTTP surface of the Civilisation as an architectural entity. Without API Route registration, the Civilisation's public interface is implicit in router configuration — there is no governed catalogue of what is exposed, what is authenticated, what Capability each endpoint implements, or what rate limits apply. Making API Routes Entities enables the Civilisation to audit its exposure surface, enforce authentication requirements, and trace Capability access to specific HTTP paths.

**Required Attributes:**
- `route_id` (Identifier) — canonical Identity
- `path` (String) — the URL path pattern (e.g., /api/operations/status)
- `method` (Enumeration: GET | POST | PUT | PATCH | DELETE) — HTTP method
- `implements_capability_id` (Reference → ET-CAP-001) — the Capability this Route exposes
- `authentication_required` (Boolean) — whether callers must authenticate
- `auth_mechanism` (Enumeration: APP_KEY | JWT | NONE) — how authentication is enforced
- `rate_limit_id` (Reference → ET-RES-001) — applicable rate limit Resource
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `public` (Boolean) — whether this Route is exposed to external callers or internal only
- `cron_triggerable` (Boolean) — whether this Route may be triggered by a Cron Schedule

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the Service whose Capability this Route exposes.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- IMPLEMENTS → ET-SVC-002 (Interface)
- EXPOSES → ET-CAP-001 (Capability)
- IS_TRIGGERED_BY → ET-PHY-012 (Cron Schedule) — for cron-triggerable routes

**Constraints:**
- An API Route that exposes Capabilities requiring EXECUTIVE or SOVEREIGN authority must have `authentication_required` = true. An unauthenticated Route to a high-authority Capability is an unconstitutional exposure.
- All API Routes must be registered. An unregistered API Route is an ungoverned exposure — it may be accessible without the Civilisation's knowledge.

**Known Implementation State:**
Eight public API Routes are confirmed in /api/operations/*. Routes are registered automatically via the _loadAgentRoutes mechanism in server.js, which flat-mounts all route files. The CLAUDE.md instruction that each route file must define a sub-prefix prevents route collision. Route-level authentication is inconsistent — some routes use APP_KEY, others use JWT, and at least one path has the BYPASS_DASHBOARD_AUTH gap (C10).

**Non-examples:** An internal function call is not an API Route — API Routes are HTTP endpoints accessible to external or cross-service callers. A WebSocket message type is not an API Route — WebSocket communication is governed by ET-PHY-011.

---

### ET-PHY-011 — WebSocket Handler

**Definition:** A WebSocket Handler is a registered bidirectional, persistent communication channel implementation that enables real-time interaction between the Founder and the Civilisation. The WebSocket Handler manages the upgrade from HTTP to WebSocket protocol, authenticates the connection, handles incoming message types, and sends outbound responses. In the current APEX Civilisation, the WebSocket Handler implements the live dashboard interaction channel.

**Purpose:** To govern the bidirectional, stateful communication channel as a Physical Layer entity. HTTP API Routes are stateless request-response; the WebSocket Handler is stateful and persistent for the session duration. The WebSocket Handler's security model, authentication, message type governance, and keepalive behaviour are Physical Layer governance concerns that must be registered and audited.

**Required Attributes:**
- `ws_handler_id` (Identifier) — canonical Identity
- `path` (String) — the WebSocket upgrade path
- `authentication_required` (Boolean) — whether the upgrade handshake requires authentication; true and confirmed ENFORCED via timingSafeEqual (INV-A4)
- `implements_capability_ids` (Reference list → ET-CAP-001) — the Capabilities available via this handler
- `keepalive_interval_ms` (Integer) — how frequently keepalive pings are sent; 60000 in the current implementation
- `chunk_size_bytes` (Integer) — maximum response chunk size for wsChunkedSend; 65536 (64KB) in the current implementation

**Optional Attributes:**
- `max_connections` (Integer) — maximum simultaneous WebSocket connections
- `message_types` (String list) — the registered message type names this handler processes

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the interaction Service.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- IMPLEMENTS → ET-SVC-002 (Interface) — the WebSocket Interface
- HANDLES → ET-COM-005 (Message)

**Constraints:**
- A WebSocket Handler must not accept connections without authentication. Unauthenticated WebSocket connections are a real-time security exposure — they cannot be protected by request-level middleware after the upgrade.
- The WebSocket Handler must send keepalive signals at the registered interval to maintain connection health detection.

**Known Implementation State:**
The WebSocket Handler is implemented in lib/ws-handler.js. Confirmed characteristics: timingSafeEqual authentication (ENFORCED — INV-A4); 5 message types (subscribe, ping, voice:transcript, agent:status, browser:snapshot); 60-second keepalive; 64KB chunk size via wsChunkedSend; globals set on the ws server object. The ws-handler.js sets global variables on the WebSocket server instance, which is a Physical Layer implementation pattern that should be reviewed during the Repository Transformation for architectural cleanliness.

**Non-examples:** An HTTP long-poll is not a WebSocket Handler — long-polling is a stateless HTTP pattern; WebSocket is a stateful protocol. An API Route is not a WebSocket Handler.

---

### ET-PHY-012 — Cron Schedule

**Definition:** A Cron Schedule is a time-based trigger specification in the physical runtime environment that initiates execution of a specific API Route or Process at defined intervals. Cron Schedules are the physical implementation of logical Schedule entities (ET-OPS-004) — the Schedule entity defines the logical timing intent; the Cron Schedule is the specific technical expression of that intent in the hosting platform's scheduling system.

**Purpose:** To register and govern time-based automation triggers as Physical Layer entities. Without Cron Schedule registration, the Civilisation has no canonical record of what is running automatically, when it runs, and what it does. Unregistered Cron Schedules are ungoverned automation — they execute without audit, without ownership attribution, and without change governance.

**Required Attributes:**
- `cron_schedule_id` (Identifier) — canonical Identity
- `cron_expression` (String) — the time specification (cron format or equivalent)
- `implements_schedule_id` (Reference → ET-OPS-004) — the logical Schedule this Cron Schedule physically implements
- `target_route` (Reference → ET-PHY-010) — the API Route triggered by this Cron Schedule
- `status` (Enumeration: ACTIVE | PAUSED | DISABLED)

**Optional Attributes:**
- `last_triggered_at` (DateTime) — when this Cron Schedule last fired
- `next_trigger_at` (DateTime) — next scheduled execution

**Lifecycle:**
ACTIVE → PAUSED → DISABLED

**Ownership Rule:** Owned by the Ministry or Service responsible for the scheduled process.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- IMPLEMENTS → ET-OPS-004 (Schedule)
- TRIGGERS → ET-PHY-010 (API Route)

**Constraints:**
- Every active Cron Schedule must have a confirmed `implements_schedule_id`. Cron Schedules that fire without a corresponding logical Schedule registration are ungoverned automation.
- Every active Cron Schedule's `target_route` must be ACTIVE. A Cron Schedule targeting a DEPRECATED route is a defect.

**Known Implementation State:**
Two Cron Schedules are confirmed: adaptation_refresh (UR14 — target and behaviour UNRESOLVED in Phase 2.3) and weekly_review (UR15 — target and behaviour UNRESOLVED). Additional Cron Schedules exist as Render platform cron jobs. The two unresolved Cron Schedules represent ungoverned automation — they fire on a schedule but neither their logical Schedule entity nor their authorised Capability scope has been confirmed.

**Non-examples:** A setTimeout or setInterval in code is not a Cron Schedule — those are in-process timers that do not survive process restart. A rate limiter is not a Cron Schedule.

---

### ET-PHY-013 — Dashboard

**Definition:** A Dashboard is a visual, interactive Interface that presents the Civilisation's operational state to the Founder in real time. The Dashboard aggregates data from multiple Sources of Truth, Projections, and live Metrics, presenting them in a governed visual layout. The Dashboard is the Founder's primary instrument for runtime situational awareness — it is the observable face of the Civilisation.

**Purpose:** To provide the Founder with governed, accurate visibility into the Civilisation's operational state. Without the Dashboard Entity Type, the visual interface is an ungoverned presentation layer with no architectural record of what it displays, what data sources it uses, or what security controls protect it. Making the Dashboard a governed Entity enables authentication requirements to be formally specified, data source dependencies to be tracked, and visual component governance to be applied.

**Required Attributes:**
- `dashboard_id` (Identifier) — canonical Identity
- `dashboard_name` (String) — canonical name
- `purpose` (String) — what operational view this Dashboard provides
- `data_sources` (Reference list → ET-DAT-004 or ET-DAT-005) — which Sources of Truth or Projections feed this Dashboard
- `authentication_required` (Boolean) — whether access to this Dashboard requires authentication; must be true for all production Dashboards
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `refresh_strategy` (Enumeration: REALTIME | POLLING | MANUAL) — how the Dashboard receives updated data
- `access_control_notes` (String) — notes on the authentication mechanism and any gaps

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the Founder.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- CONTAINS → ET-PHY-014 (Widget)
- RECEIVES_DATA_FROM → ET-DAT-004 (Source of Truth) or ET-DAT-005 (Projection)
- IS_ACCESSED_VIA → ET-IDN-002 (Credential)

**Constraints:**
- `authentication_required` must be true for all production Dashboards. A Dashboard accessible without authentication exposes the Civilisation's operational state to any network-accessible caller.
- Every data source feeding the Dashboard must be registered. An unregistered data source means the Dashboard's information provenance cannot be audited.

**Known Implementation State:**
The Dashboard is implemented as dashboard.html. The GET /api/operations/status endpoint (confirmed public — no authentication) powers the status display. The Dashboard is subject to BYPASS_DASHBOARD_AUTH (C10): when NODE_ENV is not 'production', authentication is bypassed entirely. The authentication_required attribute is architecturally true for the Dashboard; the implementation defect is the bypass mechanism. The WebSocket connection provides real-time updates. No formal Dashboard Entity is registered.

**Non-examples:** A log viewer is not a Dashboard in this taxonomy unless it is the governed operational visibility interface for the Founder. An API response is not a Dashboard — it is raw data; a Dashboard is a governed visual presentation layer.

---

### ET-PHY-014 — Widget

**Definition:** A Widget is a discrete, governed visual component within a Dashboard that presents one specific aspect of the Civilisation's state to the Founder. A Widget has a defined data source, a defined refresh behaviour, and a defined visual type. Widgets are the atomic units of Dashboard composition — a Dashboard is the container; Widgets are its content.

**Purpose:** To govern the individual display components of the Dashboard as architectural entities. Without Widget registration, the Dashboard's content is an ungoverned rendering choice — any data from any source can be displayed in any format without audit. Making Widgets Entities enables the Civilisation to record what each visual component displays, where its data comes from, and what governance significance the displayed information carries.

**Required Attributes:**
- `widget_id` (Identifier) — canonical Identity
- `dashboard_id` (Reference → ET-PHY-013) — the parent Dashboard
- `widget_type` (Enumeration: METRIC | GRAPH | TABLE | STATUS | LIST | ALERT) — the visual category of this Widget
- `data_source_id` (Reference → ET-DAT-004 or ET-DAT-005) — the Source of Truth or Projection providing this Widget's data
- `refresh_interval_ms` (Integer) — how frequently this Widget updates its displayed data
- `status` (Enumeration: ACTIVE | DEPRECATED)

**Optional Attributes:**
- `display_label` (String) — the human-readable label shown in the Dashboard
- `governance_significance` (Enumeration: CONSTITUTIONAL | OPERATIONAL | INFORMATIONAL) — whether the data displayed has constitutional significance (e.g., governance score, budget consumption)

**Lifecycle:**
ACTIVE → DEPRECATED

**Ownership Rule:** Owned by the parent Dashboard's owner.

**Source of Truth:** Infrastructure Domain.

**Permitted Relationships:**
- BELONGS_TO → ET-PHY-013 (Dashboard)
- DISPLAYS → data from a Source of Truth or Projection

**Constraints:**
- A Widget's `data_source_id` must reference an admitted, active Source of Truth or Projection. A Widget displaying data from an unregistered source is an ungoverned information display.
- A CONSTITUTIONAL governance_significance Widget must display data from the designated Source of Truth, not from a Projection. The Founder must be shown authoritative data for constitutional metrics.

**Known Implementation State:**
Dashboard.html contains multiple UI components implementing the Widget concept. Confirmed Widget types include: Agent status display (STATUS type), memory viewer (TABLE type), governance score display (METRIC type — CONSTITUTIONAL significance), health indicators, and capability status panels. No formal Widget entities are registered. The governance score Widget is particularly significant — it is a CONSTITUTIONAL Widget but currently displays data from a Projection that may be stale (the civilization_health_snapshots write path is disabled, DATA-5).

**Non-examples:** A static HTML label is not a Widget — a Widget has a live data source and refresh behaviour. A page header is not a Widget.

---

## Section 15 — Entity Type Registry Admission Requirements

### 15.1 What a New Entity Type Proposal Must Contain

A proposal to add a new Entity Type to this taxonomy must include all of the following:

1. **Canonical Name** — the proposed name, following TitleCase convention
2. **Proposed Layer** — which of the twelve Layers this type belongs to, with justification
3. **Civilisation or Physical Classification** — and the reasoning for that classification
4. **Evidence Basis** — at least one confirmed source from certification findings, constitutional documents, or the handoff document demonstrating this type's existence or requirement
5. **Distinctiveness Argument** — a demonstration that this type cannot be modelled as an Attribute of an existing type or as a specialisation of an existing type without losing architectural meaning
6. **Minimum Attribute Set** — the required attributes proposed for this type
7. **Proposed Lifecycle** — the lifecycle states and transitions
8. **Proposed Ownership Rule** — who owns instances of this type
9. **At Least Two Permitted Relationships** — demonstrating the type participates meaningfully in the Civilisation's relationship graph
10. **At Least Two Constraints** — the invariants that must hold for all instances

A proposal that cannot satisfy all ten requirements must be rejected or returned for revision.

### 15.2 Who May Propose a New Entity Type

Any Council Member may submit a proposal to add a new Entity Type. The proposal must be reviewed by:
- The CRO (Chief Risk Officer) — for architectural risk assessment
- The CLO (Chief Legal/Logical Officer) — for constitutional alignment
- The CGO (Chief Governance Officer) — for governance model consistency

Following review, a full Council deliberation (DELIBERATES_ON) must be conducted. Addition of a new Entity Type to this taxonomy requires EXECUTIVE-level authority minimum. Modification of an existing Entity Type's constraints or lifecycle requires SOVEREIGN authority.

### 15.3 Authority Required for Admission

| Action | Minimum Authority |
|--------|------------------|
| Propose a new Entity Type | OPERATIONAL |
| Review a proposal (CRO, CLO, CGO) | EXECUTIVE |
| Approve addition via Deliberation | EXECUTIVE (full Council vote) |
| Modify an existing Entity Type's Required Attributes | EXECUTIVE |
| Modify an existing Entity Type's Constraints or Lifecycle | SOVEREIGN |
| Deprecate an Entity Type | EXECUTIVE |
| Remove an Entity Type from the taxonomy | SOVEREIGN |

---

## Section 16 — Entity Type Summary Table

| ET ID | Name | Layer | Classification | Lifecycle States | Source of Truth |
|-------|------|-------|---------------|-----------------|----------------|
| ET-GOV-001 | Founder | Governance | Civilisation | REGISTERED → ACTIVE | Identity Domain |
| ET-GOV-002 | Constitution | Governance | Civilisation | DRAFTED → RATIFIED → SUPERSEDED | Governance Domain |
| ET-GOV-003 | Policy | Governance | Civilisation | DRAFT → RATIFIED → DEPRECATED | Governance Domain |
| ET-GOV-004 | Rule | Governance | Civilisation | ACTIVE → SUSPENDED / SUPERSEDED | Governance Domain |
| ET-GOV-005 | Certification | Governance | Civilisation | ISSUED → VALID → EXPIRED / SUPERSEDED | Governance Domain |
| ET-GOV-006 | Amendment | Governance | Civilisation | PROPOSED → RATIFIED / REJECTED | Governance Domain |
| ET-GOV-007 | External Contact | Governance | Civilisation | REGISTERED → ACTIVE → ARCHIVED | Identity Domain |
| ET-GOV-008 | External Organisation | Governance | Civilisation | REGISTERED → ACTIVE → ARCHIVED | Identity Domain |
| ET-EXE-001 | Council | Executive | Civilisation | CONSTITUTED → ACTIVE → DISSOLVED | Executive Domain |
| ET-EXE-002 | Council Member | Executive | Civilisation | APPOINTED → ACTIVE → RETIRED | Executive Domain |
| ET-EXE-003 | Ministry | Executive | Civilisation | PROPOSED → REGISTERED → ACTIVE | Executive Domain |
| ET-EXE-004 | Deliberation | Executive | Civilisation | OPEN → CONCLUDED / ABANDONED | Executive Domain |
| ET-EXE-005 | Vote | Executive | Civilisation | CAST (terminal) | Executive Domain |
| ET-EXE-006 | Decision Record | Executive | Civilisation | ISSUED (terminal) | Executive Domain |
| ET-OPS-001 | Agent | Operational | Civilisation | REGISTERED → ACTIVE → RETIRED | Agent Domain |
| ET-OPS-002 | Agent Task | Operational | Civilisation | PLANNED → APPROVED → EXECUTING → COMPLETED / FAILED | Agent Execution Domain |
| ET-OPS-003 | Workflow Run | Operational | Civilisation | INITIATED → IN_PROGRESS → COMPLETED / ABANDONED | Agent Execution Domain |
| ET-OPS-004 | Schedule | Operational | Civilisation | REGISTERED → ACTIVE → DISABLED | Operations Domain |
| ET-OPS-005 | Queue | Operational | Civilisation | CREATED → ACTIVE → DRAINED | Operations Domain |
| ET-KNW-001 | Memory Record | Knowledge | Civilisation | CREATED → ACTIVE → ARCHIVED → EXPIRED | Memory Domain |
| ET-KNW-002 | Lesson | Knowledge | Civilisation | EXTRACTED → ACTIVE → ARCHIVED | Knowledge Domain |
| ET-KNW-003 | Knowledge Article | Knowledge | Civilisation | CREATED → ACTIVE → ARCHIVED | Knowledge Domain |
| ET-KNW-004 | Evidence Record | Knowledge | Civilisation | CREATED (terminal) | Evidence Domain |
| ET-KNW-005 | Audit Record | Knowledge | Civilisation | CREATED (terminal) | Evidence Domain |
| ET-KNW-006 | Observation | Knowledge | Civilisation | RECORDED → VALIDATED / DISCARDED | Operations Domain |
| ET-KNW-007 | Metric | Knowledge | Civilisation | ACTIVE → DEPRECATED | Operations Domain |
| ET-KNW-008 | Reflection | Knowledge | Civilisation | CREATED → APPLIED / ARCHIVED | Knowledge Domain |
| ET-KNW-009 | Document | Knowledge | Civilisation | DRAFT → ACTIVE → SUPERSEDED | Knowledge Domain |
| ET-INT-001 | Goal | Intent | Civilisation | DECLARED → ACTIVE → ACHIEVED / ABANDONED | Intent Domain |
| ET-INT-002 | Objective | Intent | Civilisation | PENDING → ACTIVE → MET / MISSED | Intent Domain |
| ET-INT-003 | Project | Intent | Civilisation | PROPOSED → APPROVED → ACTIVE → COMPLETED | Intent Domain |
| ET-INT-004 | Milestone | Intent | Civilisation | PENDING → REACHED / MISSED | Intent Domain |
| ET-COM-001 | Event | Communication | Civilisation | EMITTED (terminal) | Events Domain |
| ET-COM-002 | Notification | Communication | Civilisation | PENDING → SENT → DELIVERED / FAILED | Communications Domain |
| ET-COM-003 | Session | Communication | Civilisation | INITIATED → ACTIVE → CLOSED / TIMED_OUT | Session Domain |
| ET-COM-004 | Conversation | Communication | Civilisation | ACTIVE → COMPLETED / COMPRESSED | Session Domain |
| ET-COM-005 | Message | Communication | Civilisation | SENT (terminal) | Session Domain |
| ET-COM-006 | Prompt | Communication | Civilisation | ACTIVE → DEPRECATED | Capability Domain |
| ET-CAP-001 | Capability | Capability | Civilisation | PROVISIONAL → ADMITTED → ACTIVE → DEPRECATED | Capability Domain |
| ET-CAP-002 | Tool | Capability | Civilisation | (inherits from Capability) | Capability Domain |
| ET-CAP-003 | Model | Capability | Civilisation | ACTIVE → CIRCUIT_OPEN → DEPRECATED | Capability Domain |
| ET-CAP-004 | Model Tier | Capability | Civilisation | ACTIVE → DEPRECATED | Capability Domain |
| ET-SVC-001 | Service | Service | Civilisation | INITIALISING → ACTIVE → DEGRADED → STOPPED | Infrastructure Domain |
| ET-SVC-002 | Interface | Service | Civilisation | ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-SVC-003 | Gateway | Service | Civilisation | (inherits from Service) | Infrastructure Domain |
| ET-SVC-004 | Circuit Breaker | Service | Civilisation | (inherits from Service) + CIRCUIT_OPEN | Infrastructure Domain |
| ET-SVC-005 | Event Bus | Service | Civilisation | (inherits from Service) | Infrastructure Domain |
| ET-RES-001 | Resource | Resource | Civilisation | ALLOCATED → AVAILABLE → DEPLETED / FROZEN | Resource Domain |
| ET-RES-002 | Budget | Resource | Civilisation | PERIOD_ACTIVE → PERIOD_CLOSED → ARCHIVED | Resource Domain |
| ET-RES-003 | Resource Pool | Resource | Civilisation | ACTIVE → DEPLETED → REPLENISHED | Operations Domain |
| ET-RES-004 | Consumption Record | Resource | Civilisation | RECORDED (terminal) | Resource Domain |
| ET-DAT-001 | Registry | Data Governance | Civilisation | ESTABLISHED → ACTIVE → DEPRECATED | Data Governance Domain |
| ET-DAT-002 | Registry Record | Data Governance | Civilisation | PROPOSED → ADMITTED → ACTIVE → REMOVED | Parent Registry |
| ET-DAT-003 | Domain | Data Governance | Civilisation | ESTABLISHED → ACTIVE → DEPRECATED | Data Governance Domain |
| ET-DAT-004 | Source of Truth | Data Governance | Civilisation | DESIGNATED → ACTIVE → DEGRADED | Data Governance Domain |
| ET-DAT-005 | Projection | Data Governance | Civilisation | ACTIVE → STALE → SYNC_FAILED | Data Governance Domain |
| ET-DAT-006 | Admission Record | Data Governance | Civilisation | ISSUED (terminal) | Evidence Domain |
| ET-IDN-001 | Identity | Identity | Civilisation | ESTABLISHED → ACTIVE → REVOKED | Identity Domain |
| ET-IDN-002 | Credential | Identity | Civilisation | ISSUED → ACTIVE → EXPIRED / REVOKED | Identity Domain |
| ET-IDN-003 | Trust Level | Identity | Civilisation | DEFINED (permanent) | Identity Domain |
| ET-IDN-004 | Authority Grant | Identity | Civilisation | GRANTED → ACTIVE → EXPIRED / REVOKED | Identity Domain |
| ET-IDN-005 | Session Identity | Identity | Civilisation | RESOLVED → ACTIVE → EXPIRED | Session Domain |
| ET-PHY-001 | Repository | Physical | Physical | ACTIVE → ARCHIVED | Infrastructure Domain |
| ET-PHY-002 | Folder | Physical | Physical | ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-PHY-003 | File | Physical | Physical | ACTIVE → DEPRECATED → ARCHIVED | Infrastructure Domain |
| ET-PHY-004 | Module | Physical | Physical | ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-PHY-005 | Function | Physical | Physical | ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-PHY-006 | Class | Physical | Physical | ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-PHY-007 | Database | Physical | Physical | ACTIVE → DEGRADED → UNAVAILABLE | Infrastructure Domain |
| ET-PHY-008 | Table | Physical | Physical | ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-PHY-009 | Environment Variable | Physical | Physical | REGISTERED → ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-PHY-010 | API Route | Physical | Physical | ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-PHY-011 | WebSocket Handler | Physical | Physical | ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-PHY-012 | Cron Schedule | Physical | Physical | ACTIVE → PAUSED → DISABLED | Infrastructure Domain |
| ET-PHY-013 | Dashboard | Physical | Physical | ACTIVE → DEPRECATED | Infrastructure Domain |
| ET-PHY-014 | Widget | Physical | Physical | ACTIVE → DEPRECATED | Infrastructure Domain |

**Total: 76 Entity Types — 62 Civilisation Layer, 14 Physical Layer**

---

## Section 17 — Known Defects

The following confirmed defects from Phase 2.3 architectural certification are encoded in this taxonomy. Each defect is associated with the Entity Type(s) it affects, and a required resolution action is specified. These defects do not invalidate the Entity Type definitions above — they document the gap between the canonical architecture and the current implementation.

| Defect Code | Description | Affected Entity Types | Required Resolution |
|------------|-------------|----------------------|-------------------|
| B1 | decisionMemoryId always null in reflexion-tracker — queries 'id' instead of 'memory_id' | ET-KNW-001 (Memory Record — DECISION type), ET-KNW-008 (Reflection) | Correct column name in reflexion-tracker.js; confirm REFLECTS_ON relationships to DECISION Memory Records are established |
| B4 | getSuccessRate reads wrong table — Agent reputation reads from incorrect source | ET-OPS-001 (Agent — reputation_score attribute), ET-KNW-007 (Metric) | Correct table reference in reputation query; verify Agent reputation_score is computed from the correct Source of Truth |
| C01 | Memory governor contradiction — memory-governor restricts writes but 5+ bypass paths confirmed | ET-KNW-001 (Memory Record), ET-SVC-003 (Gateway — Memory Write Gateway) | All Memory write paths must route through the Memory Write Gateway; bypass paths must be eliminated or formally authorised with SOVEREIGN justification |
| C02 | checkGovernance UNCONDITIONALLY_OPEN — never produces a denial decision | ET-SVC-003 (Gateway — Governance Gate), ET-GOV-003 (Policy) | Implement genuine Policy evaluation in checkGovernance; gateway must be capable of producing denial decisions |
| C03 | Evidence chain gaps — _w() fire-and-forget means Evidence Records can be silently lost | ET-KNW-004 (Evidence Record), ET-KNW-005 (Audit Record) | Change _w() wrapper to awaited write; implement outbox pattern for Evidence writes per constitution-v1.md Art. 3 |
| C09 | Strategic planning ephemeral — Objectives expire in 2 hours; Goals not persisted | ET-INT-001 (Goal), ET-INT-002 (Objective) | Persist Goals and Objectives to database; resolve C13 Source of Truth conflict first |
| C10 | BYPASS_DASHBOARD_AUTH — authentication bypassed when NODE_ENV is not 'production' | ET-PHY-013 (Dashboard), ET-IDN-002 (Credential), ET-PHY-009 (Environment Variable) | Remove NODE_ENV conditional; authentication must apply regardless of environment |
| C13 | Two independent goal systems — goal-graph.js (Supabase) vs agent-system/goal-tracker.js (filesystem) | ET-INT-001 (Goal) | ARCH-05 must designate single Source of Truth for Goals; one system must be deprecated |
| UN01 | RLS status unknown — Row Level Security status unconfirmed for all tables | ET-PHY-007 (Database), ET-PHY-008 (Table) | Audit and confirm RLS status for every Table; document ENABLED or DISABLED with justification |
| UN02 | Executive writes fire-and-forget status unknown — whether executive_deliberations and executive_votes writes are awaited is unconfirmed | ET-EXE-004 (Deliberation), ET-EXE-005 (Vote), ET-EXE-006 (Decision Record) | Confirm async/await status of executive writes; apply outbox pattern if writes are currently fire-and-forget |
| UR14 | adaptation_refresh cron target unresolved | ET-PHY-012 (Cron Schedule), ET-OPS-004 (Schedule) | Confirm target route and logical Schedule for adaptation_refresh; register as governed Cron Schedule entity |
| UR15 | weekly_review cron target unresolved | ET-PHY-012 (Cron Schedule), ET-OPS-004 (Schedule) | Confirm target route and logical Schedule for weekly_review; register as governed Cron Schedule entity |
| GAP-RES | Resource consumption not persisted — lib/consumption-log.js logs to console only | ET-RES-004 (Consumption Record), ET-RES-002 (Budget) | Implement database persistence for Consumption Records; enforce per-call and monthly Budget limits at invocation time |
| GAP-EVT | Event Bus no persistence — Events lost on process restart | ET-SVC-005 (Event Bus), ET-COM-001 (Event) | Implement durable Event store; enable Event replay for recovering missed deliveries after restart |

---

*Document ends.*

*ARCH-01 Entity Taxonomy — Version 1.0 — Phase 3 Architecture Series*
*Prepared under the APEX Civilisation Architecture Programme*

