# ARCH-00 — Architectural Meta-Model

**Document ID:** ARCH-00
**Version:** 1.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Phase:** 3.1 — Foundational Architecture
**Immutability:** MAXIMALLY IMMUTABLE — amendment requires SOVEREIGN authority and CRO + CLO review
**Constitutional basis:** constitution-v1.md (Art. 3, 6, 7, 8) · Scripts/CONSTITUTION.md (Art. 1, 2, 5)

---

## Section 1 — Purpose of the Meta-Model

### 1.1 What This Document Is

This document defines the canonical modelling language of the APEX Civilisation. It does not describe APEX. It establishes the vocabulary, grammar, and invariants through which APEX may be described.

Every architectural specification produced after this document exists within the language defined here. No later document may redefine any concept established in this document. Later documents may specialise concepts — instantiating them for specific domains — but they may not change their meaning, extend their constraints, or introduce synonyms.

This document is the single authoritative source of architectural meaning for the APEX Civilisation.

### 1.2 Why a Meta-Model Is Necessary

Without a shared modelling language, each architectural specification invents its own vocabulary. An "entity" in one document becomes an "actor" in another and an "object" in a third. A "registry" in one context is a "catalogue" in another. When these documents are used together — as they must be — their vocabulary conflicts produce ambiguity, which produces inconsistency, which produces systems that contradict their own specifications.

A meta-model prevents this by establishing shared meaning before any specification is written. When ARCH-01 defines an Entity Type called Agent, it uses the concept "Entity Type" as ARCH-00 defines it. When ARCH-03 defines a Registry for Capabilities, it uses the concept "Registry" as ARCH-00 defines it. Every concept is defined once. Every document uses the same definitions.

### 1.3 How It Prevents Architectural Drift

Architectural drift occurs when different parts of a system evolve independently, each making locally reasonable decisions that are globally incompatible. The meta-model prevents drift in two ways.

First, it provides a single reference point. When two specifications conflict, the conflict is resolved by returning to ARCH-00 and determining which interpretation is consistent with the canonical definition.

Second, it constrains extension. New architectural documents may introduce domain-specific concepts, but only by instantiating or specialising meta-model concepts. A new concept that cannot be expressed in terms of ARCH-00 primitives is either: (a) a concept that belongs in this document, triggering a meta-model amendment, or (b) a concept that should not exist.

### 1.4 Scope and Limits

This document is technology-agnostic. It makes no reference to specific platforms, languages, databases, or runtime environments. Technology choices are made in engineering standards (ARCH-15 and later), informed by domain architectures (ARCH-10 through ARCH-14), governed by the policies and specifications of ARCH-04 through ARCH-09. The meta-model exists above all of them.

This document is also instance-agnostic. It does not name specific agents, specific registries, or specific capabilities. Those are named in ARCH-01 through ARCH-14. This document names only the categories that make those names possible.

---

## Section 2 — Fundamental Concepts

Concepts are organised into ten groups by conceptual proximity. The sequence within each group proceeds from the most general to the most specific.

---

### Group A — Entity Foundation

---

#### Entity

**Definition:** An Entity is a discrete, identifiable thing within the APEX Civilisation that has architectural significance. An Entity is the fundamental unit of the architecture. All things that the architecture must reason about, govern, or represent are Entities.

**Purpose:** To provide the universal unit of discourse. Any concept that requires a canonical Identity, an Attribute set, a Lifecycle, or a presence in a Registry must be modelled as an Entity.

**Required characteristics:**
- Possesses exactly one canonical Identity
- Belongs to exactly one Entity Type
- Has a current State within its Lifecycle
- Is discoverable via at least one Registry

**Optional characteristics:**
- Owns other Entities
- Is owned by another Entity
- Participates in Relationships with other Entities
- Carries a Version history

**Architectural responsibilities:**
- Serving as the unit of governance, ownership, and identity across the Civilisation
- Being the subject of Observations, Events, and Evidence
- Persisting across operations — an Entity is not consumed by its use

**Permitted relationships:**
- IS_OF_TYPE Entity Type
- HAS Identity (exactly one)
- HAS Property (zero or more, per its Entity Type's Attributes)
- IS_IN State (exactly one at any point in time)
- PARTICIPATES_IN Relationship (zero or more)
- IS_OWNED_BY Entity (zero or one owner; the Founder Entity has no owner)
- IS_REGISTERED_IN Registry (one or more)

**Constraints:**
- An Entity may not exist without an Identity
- An Entity may not exist without an Entity Type
- An Entity may not be in a State that is not defined in its Entity Type's Lifecycle
- An Entity cannot be its own Owner

**Examples:** An agent task instance; a specific memory record; the Founder; a council deliberation record; a goal instance; an active workflow run.

**Non-examples:** An Entity Type is not an Entity — it is the category that Entities belong to. An Attribute is not an Entity — it is a structural definition belonging to an Entity Type. A database table is not an Entity — it is a persistence projection of an Entity's Properties.

---

#### Entity Type

**Definition:** An Entity Type is the canonical definition of a class of Entities. It specifies what Properties all Entities of that class possess, what Lifecycle governs them, what Relationships they may participate in, and what Constraints apply to them.

**Purpose:** To establish the schema governing a category of Entities. An Entity Type is to Entities as a class definition is to instances — but expressed architecturally, not programmatically.

**Required characteristics:**
- A canonical name, unique within the Architecture
- A defined set of Attributes (may be empty)
- A Lifecycle (may be trivial: a single ACTIVE state)
- A Classification within the Entity Taxonomy (ARCH-01)
- A Registry in which instances of this type are recorded

**Optional characteristics:**
- Inheritance from a parent Entity Type (is-a relationship)
- Capability Constraints (which Capabilities operate on this type)
- Cross-type Constraints (invariants involving multiple Entity Types)

**Architectural responsibilities:**
- Providing the schema that all Entities of this type must conform to
- Defining the boundary of what is valid for this category
- Serving as the basis for authority rules (authority is typically granted over an Entity Type, not over individual Entities)

**Permitted relationships:**
- CLASSIFIES Entity (one-to-many)
- DEFINES Attribute (one-to-many)
- HAS Lifecycle (exactly one)
- MAY_PARTICIPATE_IN Relationship Type (zero or more)
- IS_REGISTERED_IN the Entity Type Registry

**Constraints:**
- An Entity Type name must be unique within the Architecture
- An Entity Type must have a designated Source of Truth
- Removing an Attribute from an Entity Type constitutes a MAJOR version change
- An Entity Type may not inherit from more than one parent Entity Type

**Examples:** Agent, Task, Memory Record, Council Member, Goal, Event, Audit Record.

**Non-examples:** A specific agent named "system-agent-01" is not an Entity Type — it is an Entity of type Agent. An attribute called "status" is not an Entity Type — it is an Attribute definition belonging to an Entity Type.

---

#### Identity

**Definition:** An Identity is the canonical, persistent, and unique designation of a specific Entity within the Civilisation. Identity is how an Entity is unambiguously distinguished from all other Entities, including all other Entities of the same type.

**Purpose:** To make every architectural object uniquely addressable, referenceable, and auditable. Without Identity, Relationships cannot be formed, Evidence cannot be attributed, Ownership cannot be established, and Registries cannot function.

**Required characteristics:**
- Uniqueness: no two Entities may share an Identity
- Persistence: an Entity's Identity does not change over its lifetime
- Canonical form: a defined, unambiguous string or structured value
- Type context: Identity is meaningful within the context of an Entity Type (an Agent identity and a Task identity may share the same canonical string only if the architecture explicitly namespaces them)

**Optional characteristics:**
- A human-readable label (distinct from the canonical Identity)
- An external reference (how this Entity is identified in external systems)
- A provenance record (when and by what process the Identity was assigned)

**Architectural responsibilities:**
- Serving as the universal key for all cross-references between Entities
- Appearing in all Evidence, Audit Records, and Events that concern the Entity
- Remaining stable across the Entity's full Lifecycle

**Permitted relationships:**
- IDENTIFIES Entity (exactly one per Identity)
- IS_HELD_BY Authority (defines what authority an Identity carries)
- APPEARS_IN Evidence and Audit Records

**Constraints:**
- An Entity may not have more than one Identity
- An Identity may not be reassigned to a different Entity after the original Entity is retired
- An Identity must be assigned at the moment of Entity creation, not deferred
- An Identity must be resolvable to an Entity via at least one Registry

**Examples:** The canonical identifier of the Founder entity; the unique run identifier of an agent task execution; the canonical key of a memory record.

**Non-examples:** A human-readable name or label is not an Identity — names can change, be duplicated, or be ambiguous. A trust level is not an Identity — it is a property of an Identity.

---

#### Attribute

**Definition:** An Attribute is a named, typed slot defined on an Entity Type. It specifies what Properties Entities of that type may or must carry, the type of value those Properties hold, and the cardinality constraints on them.

**Purpose:** To define the information structure of an Entity Type. Attributes are the schema; Properties are the data. Every piece of information that must be recorded about an Entity must be declared as an Attribute of its Entity Type.

**Required characteristics:**
- A canonical name, unique within its Entity Type
- A value type (scalar: string, integer, boolean, datetime, decimal; or structured: a reference to another Entity Type's Identity, or a bounded enumeration)
- A cardinality (REQUIRED or OPTIONAL; SINGLE or MULTI)

**Optional characteristics:**
- A default value (for optional attributes)
- A validation constraint (a Rule governing valid values)
- A sensitivity classification (for privacy governance)
- Immutability flag (the Property value set at creation may not be changed)

**Architectural responsibilities:**
- Defining what is knowable about an Entity of its type
- Establishing the schema that Projections and Registries must conform to
- Supporting Evidence production when attribute values change

**Permitted relationships:**
- BELONGS_TO Entity Type (exactly one)
- HAS_TYPE value type
- CONSTRAINS Property (the Attribute definition governs all Properties that instantiate it)
- MAY_REFERENCE Entity Type (when the value type is a foreign Identity)

**Constraints:**
- An Attribute may not be defined independently of an Entity Type
- Removing a REQUIRED Attribute from an Entity Type is a MAJOR version change
- Adding a new REQUIRED Attribute to an existing Entity Type is a MAJOR version change (unless a default value is provided for all existing Entities)
- An Attribute's value type may not be changed after the Entity Type is ratified

**Examples:** The `status` attribute of an Agent (type: LifecycleState enumeration, REQUIRED, SINGLE); the `created_at` attribute of any Entity (type: datetime, REQUIRED, immutable, SINGLE); the `outcome_summary` attribute of a Task (type: string, OPTIONAL, SINGLE).

**Non-examples:** An Attribute is not an Entity — it cannot be owned, related to, or independently governed. An Attribute is not a Property — it is the schema, not the value.

---

#### Property

**Definition:** A Property is the instantiated value of an Attribute on a specific Entity. A Property is the piece of data that a specific Entity holds for a specific Attribute defined by its Entity Type.

**Purpose:** To represent the state of an Entity's information at a point in time. Properties are what is read, written, and observed about a specific Entity.

**Required characteristics:**
- Association with exactly one Attribute (the schema it instantiates)
- Association with exactly one Entity (the instance it describes)
- A value conforming to the Attribute's type and constraints

**Optional characteristics:**
- A timestamp of last modification
- Provenance (which operation last modified this Property)

**Architectural responsibilities:**
- Holding the current and historical values of Entity information
- Being the subject of Observations when values change
- Being the data that Projections carry

**Permitted relationships:**
- INSTANTIATES Attribute (exactly one)
- BELONGS_TO Entity (exactly one)
- OBSERVED_BY Observation (when value changes)

**Constraints:**
- A Property may not violate the constraints defined by its Attribute
- A Property declared as immutable in its Attribute definition may not change after initial assignment
- A REQUIRED Attribute must have a corresponding Property on every Entity of that type

**Examples:** The value "EXECUTING" held by a specific agent task's `status` property; the value "2026-07-02T14:30:00Z" held by a memory record's `created_at` property.

**Non-examples:** An Attribute is not a Property. The definition of what `status` means is an Attribute; the value "EXECUTING" on a specific task is a Property.

---

#### Classification

**Definition:** A Classification is an organisational scheme that groups Entities, Entity Types, or other architectural objects into named categories according to shared characteristics, without constituting a new Entity Type.

**Purpose:** To support navigation, governance scoping, authority delegation, and reporting across the architecture without introducing unnecessary Entity Types. Classifications are lightweight grouping mechanisms. They do not carry Lifecycles, Attributes, or Registry memberships of their own.

**Required characteristics:**
- A canonical name
- A defined basis for membership (what characteristic defines inclusion in this group)
- A scope (which architectural concept it classifies: Entity Types, Capabilities, Domains, etc.)

**Optional characteristics:**
- A hierarchical structure (sub-classifications within a classification)
- A governance significance (certain authority rules may be scoped to a classification)

**Architectural responsibilities:**
- Enabling authority rules and policies to be expressed at a group level rather than per individual Entity Type
- Supporting taxonomic navigation in ARCH-01
- Providing a mechanism for architectural reporting and audit

**Permitted relationships:**
- GROUPS Entity or Entity Type (many-to-many; an Entity may belong to multiple Classifications)
- IS_SCOPED_TO architectural concept type
- MAY_GOVERN authority delegation

**Constraints:**
- A Classification may not replace an Entity Type. If a group of Entities requires its own Attributes, Lifecycle, or Registry, it must be defined as an Entity Type.
- Membership in a Classification must be deterministic — given an Entity, it must be possible to determine definitively whether it belongs to a given Classification

**Examples:** "Core Entity Types" vs "Extended Entity Types" (a Classification of Entity Types); "Safety-Critical Capabilities" vs "Operational Capabilities" (a Classification of Capabilities); "Sovereign Authority Tier" vs "Operational Authority Tier" (a Classification of Identity types).

**Non-examples:** Agent is not a Classification — it is an Entity Type. Agents vs Non-Agents is a binary Classification of Entities, but "Agent" itself is an Entity Type with Attributes, a Lifecycle, and a Registry.

---

#### Version

**Definition:** A Version is a named, ordered snapshot of an architectural object or specification at a specific point in its evolution. A Version preserves the Identity of the object while recording a discrete state of its content.

**Purpose:** To support controlled evolution of architectural specifications without losing the history of prior states. Versioning enables backward compatibility analysis, impact assessment, and migration planning.

**Required characteristics:**
- Association with exactly one versioned object (an Entity Type definition, a specification, a Registry entry, etc.)
- A version identifier that establishes order among versions of the same object
- A version type: MAJOR (breaking change), MINOR (additive change), PATCH (clarification, no semantic change)
- A timestamp of ratification

**Optional characteristics:**
- A list of changes from the prior version
- Backward compatibility declaration
- Deprecation status (this version is superseded)
- Migration obligations (what must be updated when this version is adopted)

**Architectural responsibilities:**
- Enabling multiple versions of a specification to coexist during transition periods
- Recording the history of architectural evolution
- Defining what constitutes compatibility between versions of the same object

**Permitted relationships:**
- DESCRIBES architectural object (exactly one)
- SUPERSEDES prior Version (zero or one; the first version has no predecessor)
- IS_SUPERSEDED_BY subsequent Version (zero or one; the current version has no successor)
- IMPLIES migration from prior Version (if MAJOR)

**Constraints:**
- A MAJOR version change requires re-ratification by SOVEREIGN authority
- A version identifier must be strictly monotonically increasing within its object's history
- The Identity of a versioned object does not change across versions
- A deprecated version must name its superseding version

**Examples:** ARCH-00 v1.0 is the initial ratified version of this document. If a new primitive concept is added to ARCH-00, that constitutes a MINOR version change (ARCH-00 v1.1). If an existing concept is redefined, that constitutes a MAJOR version change (ARCH-00 v2.0).

**Non-examples:** A Version is not a Snapshot or an Observation. Versions are controlled and ratified; snapshots are ephemeral and uncontrolled.

---

### Group B — Relationships

---

#### Relationship

**Definition:** A Relationship is a directional, typed association between exactly two Entities. A Relationship asserts that a specific connection of a specific type exists between a source Entity and a target Entity at a given point in time.

**Purpose:** To represent the structural and semantic connections between Entities. Without Relationships, the architecture is a set of isolated Entities with no meaningful organisation. Relationships are the edges of the architectural graph.

**Required characteristics:**
- A source Entity (the Entity from which the Relationship originates)
- A target Entity (the Entity to which the Relationship points)
- A Relationship Type (the definition governing this Relationship's semantics)
- A direction (source → target; all Relationships are directional)
- An active or historical status

**Optional characteristics:**
- A creation timestamp
- An expiry condition (the Relationship ends when a condition is met)
- Properties specific to this Relationship instance (if the Relationship Type defines Attributes)

**Architectural responsibilities:**
- Encoding the structural dependencies, authorities, and associations that govern the Civilisation
- Providing the basis for authority inheritance (e.g., an Owner Entity's authority derives from its OWNS Relationship)
- Enabling the Discovery of related Entities

**Permitted relationships:**
- IS_OF_TYPE Relationship Type (exactly one)
- HAS_SOURCE Entity (exactly one)
- HAS_TARGET Entity (exactly one)
- IS_GOVERNED_BY Policy (zero or more)

**Constraints:**
- A Relationship may only be formed between Entity Types that the Relationship Type permits
- A Relationship may not connect an Entity to itself (unless the Relationship Type explicitly permits reflexive relationships)
- If a Relationship Type specifies a maximum cardinality, that cardinality must be enforced at the time of Relationship creation
- Destroying the source or target Entity requires resolving all Relationships involving that Entity first

**Examples:** A Council Member Entity PARTICIPATES_IN a Deliberation Entity; a Task Entity IS_OWNED_BY an Agent Entity; an Agent Entity INVOKES a Capability.

**Non-examples:** An Attribute defined on an Entity Type is not a Relationship — Attributes describe the properties of an Entity, not its connections to other Entities. An Event is not a Relationship — it records an occurrence, not a persistent association.

---

#### Relationship Type

**Definition:** A Relationship Type is the canonical definition of a class of Relationships. It specifies the permitted source Entity Type, the permitted target Entity Type, the semantic meaning of the association, its cardinality, and any Constraints or Policies governing Relationships of this type.

**Purpose:** To govern what kinds of connections may exist in the architecture. Relationship Types prevent arbitrary, ungoverned associations between Entities.

**Required characteristics:**
- A canonical name (expressed as a verb phrase in UPPER_SNAKE_CASE)
- A permitted source Entity Type (or Classification of Entity Types)
- A permitted target Entity Type (or Classification of Entity Types)
- A semantic statement describing what the Relationship asserts
- Source cardinality (how many Relationships of this type a source Entity may have)
- Target cardinality (how many Relationships of this type a target Entity may have)
- Directionality declaration (is the inverse Relationship implied or must it be separately declared)

**Optional characteristics:**
- Attributes on the Relationship itself (when the association carries its own information)
- Authority requirement (what authority is required to create or destroy Relationships of this type)
- Evidence obligation (must a Relationship creation produce an Evidence record)

**Architectural responsibilities:**
- Serving as the schema for all Relationships of that type
- Constraining what connections are architecturally valid
- Defining the semantics that Policies and Authority rules may reference

**Permitted relationships:**
- GOVERNS Relationship (one-to-many)
- SPECIFIES permitted source Entity Type
- SPECIFIES permitted target Entity Type
- IS_REGISTERED_IN the Relationship Type Registry

**Constraints:**
- A Relationship Type name must be unique within the Architecture
- Adding a new mandatory constraint to an existing Relationship Type is a MAJOR version change
- A Relationship Type may not be removed if active Relationships of that type exist

**Examples:** OWNS (source: Entity, target: Entity; meaning: the source Entity has governing authority over the target Entity); INVOKES (source: Agent, target: Capability; meaning: the Agent exercises the Capability); PRODUCES (source: Capability execution, target: Evidence; meaning: the execution creates a record).

**Non-examples:** A property value is not a Relationship Type. The fact that an agent task has a status of "EXECUTING" is a Property, not a Relationship.

---

### Group C — Authority and Trust

---

#### Ownership

**Definition:** Ownership is a Relationship of type OWNS between an owning Entity (the Owner) and an owned Entity. An Owner has governing authority over its owned Entity, including the right to modify it, delegate authority over it, and initiate its termination.

**Purpose:** To establish clear lines of responsibility and authority within the Civilisation. Ownership answers the question: if this Entity must be governed, controlled, or held accountable — which Entity bears that responsibility?

**Required characteristics:**
- An Owner Entity
- An owned Entity
- The Ownership must be registered (it must appear in the Registry of Ownership Relationships)
- Ownership must be established at the moment the owned Entity is created

**Optional characteristics:**
- Delegated ownership (the Owner may delegate operational authority without transferring Ownership)
- Conditional ownership (Ownership transfers to another Entity upon a defined Transition)

**Architectural responsibilities:**
- Providing the basis for authority inheritance in access decisions
- Establishing accountability for Entity governance
- Defining the authority chain that Policies may reference

**Permitted relationships:**
- IS_A Relationship of type OWNS
- GRANTS certain Authority to Owner over owned Entity
- MAY_DELEGATE Authority to other Entities

**Constraints:**
- Every Entity except the Founder Entity has exactly one Owner
- The Founder Entity has no Owner — it is the root of the ownership graph
- An Entity may not own itself
- An Entity may not own its own Owner (circular ownership is prohibited)
- Ownership may not be transferred without producing an Audit Record

**Examples:** An Agent Entity owns the Task Entities it creates; the Civilisation Entity (represented by the Founder) owns all Service Entities; a Council deliberation record is owned by the Council that produced it.

**Non-examples:** Read access to an Entity is not Ownership. Authority to invoke a Capability on an Entity is not Ownership. Only the OWNS Relationship constitutes Ownership.

---

#### Authority

**Definition:** Authority is the right of an Entity, acting under a specific Identity and Trust Level, to invoke a Capability, initiate a Transition, or govern an owned Entity. Authority is the mechanism by which the architecture governs what is permitted.

**Purpose:** To define and enforce what actions are legitimate within the Civilisation. Every Capability invocation, every State Transition, and every act of governance requires Authority. Without Authority, there is no meaningful distinction between permitted and prohibited acts.

**Required characteristics:**
- A holder (the Identity that holds the Authority)
- A scope (the Entity Type, Capability, or Transition over which Authority applies)
- A trust level requirement (the minimum Trust Level at which this Authority may be exercised)
- A basis (what Relationship or Lifecycle State grants this Authority)

**Optional characteristics:**
- An expiry (Authority may be time-limited)
- A delegation chain (Authority granted by one Identity to another)
- Conditions (Authority is valid only when certain Properties have certain values)

**Architectural responsibilities:**
- Serving as the architectural basis for all access and governance decisions
- Being the subject of the Authority matrix defined in ARCH-04
- Governing Capability invocations and Lifecycle Transitions

**Permitted relationships:**
- IS_HELD_BY Identity
- GOVERNS Capability (zero or more)
- GOVERNS Transition (zero or more)
- IS_SCOPED_TO Entity or Entity Type
- IS_GRANTED_BY Ownership, Role, or explicit delegation

**Constraints:**
- Authority over a Capability cannot be exercised if the holder's Trust Level is below the required minimum
- Authority cannot be delegated to a higher Trust Level than the delegating Identity possesses
- Delegated Authority does not exceed the scope of the original Authority
- An Authority claim without a verifiable basis is not Authority — it is an assertion

**Examples:** The Founder holds SOVEREIGN authority over all Capabilities and Transitions; a Council Member holds EXECUTIVE authority over deliberation transitions within Council scope; an Agent holds TASK authority over Capabilities in its assigned stage only.

**Non-examples:** Holding an API key is not Authority — it is a credential that may establish Identity, which may then carry Authority. Ownership of an Entity is not itself Authority — it is a Relationship that grants Authority according to the Ownership rules in ARCH-04.

---

#### Trust

**Definition:** Trust is the architectural confidence assigned to an Identity, expressing the degree to which that Identity's claims and actions are accepted without additional verification. Trust is strictly ordered: higher Trust Levels carry broader Authority and fewer verification requirements.

**Purpose:** To provide the architecture with a mechanism for graduated verification. Not all Identities require the same scrutiny. Trust levels allow the architecture to calibrate verification requirements to the risk profile of the Identity.

**Required characteristics:**
- A finite, strictly ordered set of Trust Levels
- Assignment: every Identity is assigned a Trust Level at the time of its establishment
- The Trust Level determines what Authority the Identity may hold and what Boundaries it may cross

**Optional characteristics:**
- Trust decay (Trust Level may decrease if certain Events occur)
- Trust elevation (Trust Level may increase upon presentation of additional Evidence)
- Context-specific Trust (an Identity may hold different Trust Levels in different Domains)

**Architectural responsibilities:**
- Serving as the input to the Authority matrix
- Determining the evidence required to cross each Boundary
- Governing which Policies apply to which Identities

**Permitted relationships:**
- IS_ASSOCIATED_WITH Identity
- DETERMINES Authority scope
- IS_REQUIRED_AT Boundary (minimum Trust Level to cross from lower to higher trust)

**Constraints:**
- Trust Levels must be strictly ordered (no two levels may be equivalent)
- Every Identity must have exactly one Trust Level at any point in time
- Trust is not transferable — only the Identity's own Trust Level applies to its actions, regardless of the Trust Level of the Entity it represents
- Trust must be established by verifiable Evidence, not by assertion

**Examples:** SOVEREIGN trust (Founder Identity); EXECUTIVE trust (Council Member Identity); OPERATIONAL trust (Ministry Identity); TASK trust (Agent Identity); SYSTEM trust (internal service Identity); NONE (anonymous Identity). The ordering is SOVEREIGN > EXECUTIVE > OPERATIONAL > TASK > SYSTEM > NONE.

**Non-examples:** Reputation is not Trust in this architecture. An agent may have a high reputation (measured by Metrics) but its Trust Level is governed by its Identity Type, not its performance history. Performance history may inform Authority delegation but does not change the base Trust Level.

---

#### Boundary

**Definition:** A Boundary is a structural point in the architecture where the Trust Level of a request or Entity changes. Crossing a Boundary from a lower Trust Level to a higher Trust Level requires the presentation of Evidence sufficient to warrant the Trust Level being entered. Crossing from higher to lower requires no evidence but may require sanitisation.

**Purpose:** To enforce the Trust Level transitions that protect the Civilisation's integrity. Without Boundaries, all Entities and Capabilities would operate at the same Trust Level, collapsing the Authority structure.

**Required characteristics:**
- A name identifying the Boundary
- An entry Trust Level (the Trust Level of what approaches the Boundary)
- An exit Trust Level (the Trust Level of what passes through)
- A required Evidence set for crossing from lower to higher Trust
- A Failure Mode (what happens when insufficient Evidence is presented)

**Optional characteristics:**
- A governance record obligation (does a Boundary crossing produce an Audit Record)
- Permitted exceptions (conditions under which reduced Evidence is accepted, with compensating controls)

**Architectural responsibilities:**
- Enforcing the Trust Level transitions that the Authority structure requires
- Producing Audit Records for high-significance crossings
- Being the enforcement point for Policies that govern access

**Permitted relationships:**
- SEPARATES two Trust Levels
- REQUIRES Evidence for upward crossing
- HAS Failure Mode (governed by the Failure Mode Policy — ARCH-07)
- IS_GOVERNED_BY Policy
- PRODUCES Audit Record on crossing (when required)

**Constraints:**
- A Boundary that fails toward permissiveness on the upward crossing direction is a Permissive Failure Mode and must be explicitly declared and constitutionally justified (per constitution-v1.md Art. 2)
- A Boundary may not be bypassed without producing an Audit Record of the bypass
- Every Boundary must have exactly one declared Failure Mode
- Boundaries are not optional; they must be enforced, not advisory

**Examples:** The Boundary between anonymous requests and authenticated API access; the Boundary between authenticated user access and agent execution; the Boundary between agent execution and memory writes.

**Non-examples:** An authentication check that is advisory (can be bypassed without consequence) is not a Boundary in this architecture — it is a guideline. A Boundary is enforced or it does not exist.

---

### Group D — Governance Instruments

---

#### Policy

**Definition:** A Policy is a named set of Rules that governs a specific category of decisions within the Civilisation. A Policy does not describe how to implement a decision — it declares what decisions are required. Policies are authored by authorised Entities, ratified by Governance, and enforced at Boundaries and by Services.

**Purpose:** To make the intentions of Governance explicit and enforceable. Without Policies, decisions are made ad hoc, producing inconsistency. Policies transform governance intentions into architectural specifications that implementations must satisfy.

**Required characteristics:**
- A canonical name
- A scope (what decisions, Capabilities, Transitions, or Boundaries this Policy governs)
- An authoring Identity (who produced this Policy)
- A ratifying authority (what Governance process ratified it)
- One or more Rules (a Policy with no Rules is inert)
- An enforcement mechanism (how violations are detected and reported)

**Optional characteristics:**
- An expiry (time-limited Policies)
- Override conditions (conditions under which the Policy may be suspended, and by whom)
- Conflict resolution priority (when two Policies conflict, which takes precedence)

**Architectural responsibilities:**
- Declaring the rules governing a decision domain
- Providing the specification against which implementations are certified
- Being the reference that Audit Records are evaluated against

**Permitted relationships:**
- CONTAINS Rule (one or more)
- GOVERNS Capability, Transition, or Boundary (one or more)
- IS_RATIFIED_BY Governance process
- IS_ENFORCED_AT Boundary or by Service
- MAY_CONFLICT_WITH other Policy (with declared resolution priority)

**Constraints:**
- A Policy must be ratified before it is enforced
- A Policy must identify its scope precisely; a Policy with unlimited scope is a constitutional-level instrument, not a domain Policy
- A Policy may not be self-contradictory (no Rule within a Policy may conflict with another Rule within the same Policy)
- Superseding a Policy requires producing an Audit Record

**Examples:** The Failure Mode Policy (ARCH-07) is a Policy governing what failure behaviour is permitted at each Boundary and Capability. The Auditability Policy (part of ARCH-08) governs which Capability invocations must produce Audit Records.

**Non-examples:** A Constraint is not a Policy — a Constraint is an invariant that cannot be violated; a Policy governs decisions within a space of choices. A Guideline is not a Policy — Guidelines are advisory; Policies are mandatory.

---

#### Rule

**Definition:** A Rule is an individual, atomic governance statement within a Policy. A Rule declares a condition and a required response. Rules are the unit of policy enforcement.

**Purpose:** To make Policy requirements individually testable and attributable. A Policy's enforceability depends on its Rules being sufficiently atomic that each Rule can be independently evaluated as satisfied or violated.

**Required characteristics:**
- A canonical identifier within its Policy
- A condition (the circumstance under which the Rule applies)
- A required response (what must occur when the condition is met)
- An enforcement mode (MANDATORY or CONDITIONAL)
- Association with exactly one Policy

**Optional characteristics:**
- A severity (the consequence of violation: CRITICAL, HIGH, MEDIUM, LOW)
- A reporting obligation (must a Rule violation produce an Evidence record)

**Architectural responsibilities:**
- Being the atomic unit of compliance measurement
- Supporting Certification (each Rule is individually certifiable as satisfied or not)
- Providing the granularity required for governance reporting

**Permitted relationships:**
- BELONGS_TO Policy (exactly one)
- IS_EVALUATED_AGAINST Capability invocation, Transition, or Boundary crossing
- PRODUCES Evidence of violation (when violated)

**Constraints:**
- A Rule must be unambiguous — any qualified observer presented with the same facts must reach the same determination of satisfied or violated
- A Rule must be evaluable — it must be possible to determine whether a Rule is satisfied without additional undefined information
- A Rule may not contradict another Rule within the same Policy

**Examples:** "The constitutional gate Failure Mode must be FAIL-CLOSED" (a Rule within the Failure Mode Policy); "Every memory write must produce an Audit Record" (a Rule within the Auditability Policy); "An Agent may only invoke Capabilities in its assigned stage" (a Rule within the Authority Policy).

**Non-examples:** "Be cautious" is not a Rule — it is not evaluable. "Prefer fail-closed" is not a Rule — it is a guideline. "Never fail open on safety-critical paths" is not a Rule until the set of safety-critical paths is precisely specified.

---

#### Constraint

**Definition:** A Constraint is an invariant that must hold at all times within the architecture. Unlike a Rule, which governs a decision (what one should do when a condition arises), a Constraint states a fact about the architecture that may never be false. A violated Constraint indicates an architectural defect, not a compliance failure.

**Purpose:** To encode the fundamental invariants that make the architecture coherent. Constraints are not enforced by Policies — they are structural requirements whose violation indicates a corrupted or incorrectly designed system.

**Required characteristics:**
- A canonical identifier
- A formal statement of the invariant (universally quantified: "For every X, Y must be true")
- A scope (which architectural objects the Constraint applies to)
- A CRITICAL severity (all Constraints are critical by definition — a violated Constraint is an architectural failure)

**Optional characteristics:**
- A proof basis (why this Constraint must hold)
- A detection mechanism (how a violation is detected at runtime)

**Architectural responsibilities:**
- Establishing the non-negotiable structural requirements of the architecture
- Serving as the basis for Certification (a system cannot be certified if its Constraints are violated)
- Distinguishing architectural defects from policy non-compliance

**Permitted relationships:**
- APPLIES_TO Entity Type, Relationship Type, Capability, Lifecycle, or other architectural object
- IS_VERIFIED_BY Certification process
- PRODUCES CRITICAL Evidence when violated

**Constraints on Constraints:**
- A Constraint must be falsifiable — it must be possible to determine whether it is violated
- A Constraint may not be suspended, overridden, or time-limited — it is invariant
- A Constraint that is found to be violated by the existing system is an architectural defect requiring remediation, not a Policy exception

**Examples:** "Every Entity possesses exactly one canonical Identity" (if violated, the architecture cannot function); "Every Projection derives from exactly one Source of Truth" (if violated, the single-source-of-truth principle is broken); "Every Registry Record represents exactly one architectural object" (if violated, the registry cannot be used as a canonical source).

**Non-examples:** "Agents should prefer Haiku for simple tasks" is not a Constraint — it is a guideline. "Audit records must be fail-closed" is a Rule, not a Constraint — it governs a decision, and its violation is a compliance failure, not an architectural impossibility. The distinction: Constraints are true by construction; Rules are enforced by governance.

---

#### Registry

**Definition:** A Registry is a governed catalogue of Records representing a specific Entity Type or architectural object class. A Registry is the authoritative mechanism through which the Civilisation governs what exists within a given category. Anything that is not registered does not officially exist in that category.

**Purpose:** To enforce the principle that everything earns its place. A Registry implements controlled admission — nothing may exist in a governed category without being admitted through the Registry's governance process. Registries also provide the discoverability foundation: any architectural object can be found by querying its Registry.

**Required characteristics:**
- A canonical name
- An Entry Type (what Entity Type or architectural object class this Registry catalogues)
- A defined admission process (how new Records are proposed, reviewed, admitted, and activated)
- A lifecycle for Registry Records (proposed → reviewed → admitted → active → deprecated → removed)
- A governing authority (which Identity or Governance body controls admission)
- A Source of Truth designation (the Registry itself is a Source of Truth for its domain)

**Optional characteristics:**
- An archival policy (how removed Records are preserved for historical reference)
- Projection definitions (how the Registry's contents are surfaced in other systems)
- Synchronisation rules (how projections are kept consistent with the authoritative Registry)

**Architectural responsibilities:**
- Serving as the canonical source for what exists within its category
- Enforcing admission governance (nothing is registered without passing the admission process)
- Providing the basis for audit (any object not in its Registry is unregistered and therefore ungoverned)

**Permitted relationships:**
- STORES Registry Record (one or more)
- IS_GOVERNED_BY Authority and admission Policy
- IS_THE Source of Truth for its Entry Type
- PRODUCES Projection (zero or more)
- IS_REGISTERED_IN the Registry of Registries (every Registry is itself a registered object)

**Constraints:**
- A Registry may not contain Records for more than one Entry Type
- A Registry must have exactly one governing authority
- Admission to a Registry must produce an Audit Record
- Removal from a Registry must produce an Audit Record
- A Registry may not be destroyed if it contains active Records

**Examples:** The Entity Type Registry (catalogues all Entity Types in ARCH-01); the Capability Registry (ARCH-09, catalogues all admitted Capabilities); the Source of Truth Registry (ARCH-05, catalogues all Source of Truth designations).

**Non-examples:** A configuration file is not a Registry — it is a Projection of Registry contents. A database table is not a Registry — it is a persistence mechanism for a Registry's Projection. A list maintained by a single module without admission governance is not a Registry — it is an implementation detail.

---

#### Registry Record

**Definition:** A Registry Record is an entry in a Registry representing one specific architectural object of the Registry's Entry Type. The Record is the Registry's authoritative information about that object, including its Identity, current status, version, and provenance.

**Purpose:** To constitute the formal, governed existence of an architectural object within a category. The Registry Record is the object's admission to the Civilisation's governed architecture. An object without a Registry Record in the appropriate Registry is unregistered and therefore not governed.

**Required characteristics:**
- A canonical Identity (unique within its Registry)
- The Identity of the object it represents
- Admission status (PROPOSED / UNDER_REVIEW / ADMITTED / ACTIVE / DEPRECATED / REMOVED)
- The Version of the object at time of admission
- The Identity of the admitting authority
- The timestamp of admission
- Admission evidence (the basis on which admission was granted)

**Optional characteristics:**
- Deprecation reason (when status is DEPRECATED)
- Superseding Record identity (when this Record is superseded by another)
- External references (how this object is identified in external contexts)

**Architectural responsibilities:**
- Constituting the formal, auditable record of an object's existence in its category
- Supporting lookup (given an object Identity, the Registry Record provides its governed attributes)
- Supporting audit (Registry Record history provides a complete change log for the object)

**Permitted relationships:**
- IS_STORED_IN Registry (exactly one)
- REPRESENTS architectural object (exactly one)
- HAS_STATUS from the Registry lifecycle
- IS_PRODUCED_BY admission process (producing an Audit Record)

**Constraints:**
- A Registry Record may not represent more than one architectural object
- A Registry Record's Identity must be unique within its Registry
- A Registry Record may not be deleted — only marked REMOVED (records are immutable for audit purposes)
- Changing the status of a Registry Record must produce an Audit Record

**Examples:** The Registry Record for the "INVOKES" Relationship Type in the Relationship Type Registry; the Registry Record for the "constitutional-gate" Capability in the Capability Registry; the Registry Record for the "Memory Record" Entity Type in the Entity Type Registry.

**Non-examples:** A row in a database is not a Registry Record unless it is governed by an admission process and carries the required status, provenance, and audit fields. An entry in a configuration file is not a Registry Record — it is a Projection of a Registry Record.

---

#### Governance

**Definition:** Governance is the system of oversight, authority allocation, admission processes, amendment procedures, and compliance monitoring through which the Civilisation manages its own architecture and operations. Governance is not a single Entity or Service — it is the framework through which the Civilisation governs itself.

**Purpose:** To ensure that all decisions with architectural significance are made by authorised Entities through defined processes, producing verifiable Evidence of those decisions. Governance is the mechanism that makes the architecture accountable to itself.

**Required characteristics:**
- An authority structure (who has authority over what — defined in ARCH-04)
- Admission processes (how new Entities, Capabilities, and architectural objects are admitted)
- Amendment processes (how existing architectural specifications are changed)
- Compliance monitoring (how adherence to Policies and Constraints is verified)
- Evidence production (governance decisions must produce Evidence)

**Optional characteristics:**
- Automated enforcement (Governance Rules enforced by Service-level controls)
- Periodic certification (scheduled verification of compliance)
- Escalation procedures (when automated governance cannot resolve a situation)

**Architectural responsibilities:**
- Maintaining the integrity of the Registry system
- Enforcing the admission principles across all architectural categories
- Producing the Evidence that enables Certification
- Providing the process by which this Meta-Model itself may be amended

**Permitted relationships:**
- PRODUCES Evidence (governance decisions are evidenced)
- ENFORCES Policy (governance implements Policy rules)
- GOVERNS Registry (admission processes are governance functions)
- AMENDS architectural specifications (via the amendment process)
- IS_HELD_ACCOUNTABLE_TO the Civilisation's constitutions

**Constraints:**
- Governance decisions must produce Evidence — an ungoverned decision is architecturally invisible
- No Entity may govern itself without independent oversight
- Governance may not be suspended except by SOVEREIGN authority, for a bounded period, with compensating controls
- The Governance framework itself is subject to Governance

**Examples:** The process by which a new Capability is admitted to the Capability Registry; the process by which ARCH-00 is amended; the process by which a Council deliberates and votes on a decision; the process by which a compliance certification is performed.

**Non-examples:** Administration (operational day-to-day operation) is not Governance. Monitoring (observing what is happening) is not Governance. Governance is the framework; administration and monitoring are activities within it.

---

### Group E — Capabilities and Services

---

#### Capability

**Definition:** A Capability is a named, governed, and registered operation that the Civilisation can perform. A Capability transforms inputs into outputs and typically produces side effects (Evidence records, Events, State Transitions, or Resource consumption). All operations that have architectural significance must be Capabilities.

**Purpose:** To make the operational repertoire of the Civilisation explicit, governable, and auditable. By registering every significant operation as a Capability, the architecture can enforce admission, apply Policies, require Evidence, and audit all invocations.

**Required characteristics:**
- A canonical name (unique within the Capability Registry)
- A Capability class (what category of operation this is)
- An Authority requirement (what minimum Trust Level and Authority scope is required to invoke it)
- An Audit obligation (must invocation produce Evidence; what Evidence is required)
- A Resource profile (what Resources the Capability consumes)
- Admission status in the Capability Registry

**Optional characteristics:**
- Preconditions (what must be true before the Capability may be invoked)
- Postconditions (what must be true after successful invocation)
- Compensation (how to reverse the effects if the Capability must be undone)
- Rate limits (maximum invocation frequency)

**Architectural responsibilities:**
- Serving as the unit of authority enforcement (Authority is granted over Capabilities)
- Serving as the unit of audit (the Audit Record schema references Capability by identity)
- Enabling governance of the operational repertoire through the Capability Registry

**Permitted relationships:**
- IS_REGISTERED_IN Capability Registry
- REQUIRES Authority
- CONSUMES Resource
- PRODUCES Event (on invocation)
- PRODUCES Evidence (per audit obligation)
- IS_PROVIDED_BY Service
- IS_INVOKED_BY Entity (via an INVOKES Relationship)
- IS_GOVERNED_BY Policy

**Constraints:**
- An operation that has architectural significance and is not registered as a Capability is an architectural defect
- A Capability may not be invoked without satisfying its Authority requirement
- A Capability may not be invoked without producing the Evidence its audit obligation requires
- Admitting a new Capability to the Registry must produce an Audit Record

**Examples:** Executing an agent task (requires TASK authority); writing to the semantic memory store (requires OPERATIONAL authority over memory Capabilities); invoking a language model (requires OPERATIONAL authority and is subject to rate limits and budget constraints).

**Non-examples:** A database query within a service implementation is not a Capability — it is an implementation detail. A Capability is the semantic operation (e.g., "retrieve memory records matching criteria") not the technical mechanism (e.g., "execute SQL SELECT statement").

---

#### Service

**Definition:** A Service is an Entity that provides one or more Capabilities to other Entities. A Service has a defined set of Capabilities, a Lifecycle, and an Interface through which those Capabilities are exposed. Services are the runtime providers of Capability.

**Purpose:** To organise Capabilities into governable, deployable, and observable units. A Service encapsulates the implementation of Capabilities and presents a stable Interface through which other Entities may invoke them.

**Required characteristics:**
- A canonical Identity (registered in the Service Registry)
- A defined set of Capabilities it provides
- A Lifecycle (including a health model — what it means for this Service to be operational)
- At least one Interface

**Optional characteristics:**
- Dependencies on other Services
- Resource quotas
- Redundancy and availability characteristics

**Architectural responsibilities:**
- Providing the Capabilities within its scope reliably and under governance
- Enforcing Authority requirements on all Capability invocations it receives
- Producing the Evidence its Capabilities' audit obligations require
- Being observable (its health, throughput, and failure modes must be observable)

**Permitted relationships:**
- PROVIDES Capability (one or more)
- EXPOSES Interface (one or more)
- DEPENDS_ON Service (zero or more)
- HAS Lifecycle
- IS_REGISTERED_IN Service Registry
- IS_OWNED_BY Entity (the Entity accountable for this Service)

**Constraints:**
- A Service must not provide Capabilities beyond its registered scope without a Registry amendment
- A Service must enforce the Authority requirements of every Capability it provides
- A Service failure must produce an Evidence record (no silent Service failures)
- A Service must be discoverable — its existence, Capabilities, and Interface must be registered

**Examples:** The Memory Service (provides Capabilities for reading and writing memory records); the Constitutional Gate Service (provides the constitutional evaluation Capability); the Agent Execution Service (provides Capabilities for enqueueing, executing, and completing agent tasks).

**Non-examples:** A module or library within a Service implementation is not a Service. A Service is an architectural unit with a Registry Record, not an implementation artifact.

---

#### Interface

**Definition:** An Interface is the exposed contract through which a Service makes its Capabilities invocable by other Entities. An Interface specifies the input schema, output schema, error schema, and interaction pattern (synchronous, asynchronous, or event-driven) for each Capability it exposes.

**Purpose:** To decouple the callers of a Capability from the implementation of that Capability. Interfaces allow Services to evolve their implementation without changing the contract that callers depend on.

**Required characteristics:**
- Association with exactly one Service (the Interface belongs to a Service)
- A defined set of Capabilities it exposes (a subset of the Service's total Capabilities)
- For each exposed Capability: an input schema, an output schema, an error schema
- An interaction pattern (synchronous request-response; asynchronous invocation with callback; event-driven subscription)
- A Version (Interfaces are versioned; callers bind to a specific Interface Version)

**Optional characteristics:**
- Authentication requirements (how the caller establishes Identity at this Interface)
- Rate limit specifications
- Deprecation timeline (when an older Interface Version will be removed)

**Architectural responsibilities:**
- Providing the stable contract that callers depend on
- Enabling versioned evolution of Service implementations
- Supporting the Trust Boundary (the Interface is the enforcement point for Authority requirements)

**Permitted relationships:**
- IS_PROVIDED_BY Service (exactly one)
- EXPOSES Capability (one or more)
- HAS Version
- IS_USED_BY Entity (zero or more callers)
- ENFORCES Authority requirements at the point of invocation

**Constraints:**
- An Interface may not expose a Capability that its Service does not provide
- Breaking changes to an Interface require a MAJOR Version increment
- An Interface Version must remain available for a declared minimum period after deprecation

**Examples:** The synchronous request-response Interface of the Memory Service (callers submit a memory retrieval Capability invocation and receive an immediate result); the event-driven Interface of the Event Bus Service (subscribers receive Events as they are emitted).

**Non-examples:** An internal method call within a Service is not an Interface. Interfaces are the externally visible contracts, not internal implementation details.

---

#### Resource

**Definition:** A Resource is a finite, governed quantity that Capabilities consume when invoked. Resources are managed by the Civilisation to ensure that Capability invocations operate within established limits. Resources include but are not limited to: budget allocation, computational capacity, and authorised operation counts.

**Purpose:** To make Resource consumption explicit, governable, and auditable. Without Resource governance, Capabilities may consume unlimited quantities of finite assets, violating constitutional financial limits and operational stability requirements.

**Required characteristics:**
- A canonical type (what kind of Resource: budget, compute, attention-tokens, etc.)
- A unit of measurement
- A governing limit (the maximum available to a given Entity or Capability)
- An accounting mechanism (how consumption is tracked)
- A depletion policy (what happens when the Resource limit is reached)

**Optional characteristics:**
- Replenishment rules (how the Resource is restored: time-based, event-triggered, manual)
- Reservation mechanism (Capabilities may reserve Resources before invocation)
- Shared pool governance (when a Resource is shared among multiple Entities)

**Architectural responsibilities:**
- Providing the basis for financial governance (constitution-v1.md Art. 2 mandates a $2 per-call limit)
- Supporting Capability admission (new Capabilities must declare their Resource profile)
- Being the subject of Audit Records when limits are approached or exceeded

**Permitted relationships:**
- IS_CONSUMED_BY Capability
- IS_GOVERNED_BY Policy (Resource allocation and depletion policies)
- IS_ALLOCATED_TO Entity (who holds this Resource)
- PRODUCES Evidence when threshold is crossed

**Constraints:**
- A Capability may not consume more Resource than its declared Resource profile
- A Resource limit may not be exceeded without SOVEREIGN authority
- Resource consumption must be accounted for in real time — deferred or estimated accounting is not permitted for constitutionally-bounded Resources

**Examples:** Budget allocation (measured in currency units; constitutionally capped at $2 per invocation, $500/month for Council operations); authorised invocation count (how many times a Capability may be called within a period).

**Non-examples:** A database connection is not a Resource in this architectural sense — it is an implementation detail. A Resource is a governed, finite quantity with constitutional or policy significance.

---

### Group F — Change and Time

---

#### Lifecycle

**Definition:** A Lifecycle is the complete set of States an Entity of a specific Entity Type may occupy, together with the set of valid Transitions between those States. A Lifecycle governs how an Entity evolves over time.

**Purpose:** To make the temporal evolution of Entities explicit, governed, and auditable. Without a Lifecycle, an Entity's evolution is unconstrained — it may reach any state from any other state, making its history ambiguous and its governance impossible.

**Required characteristics:**
- Association with exactly one Entity Type
- A finite set of States
- Exactly one initial State (the State all newly created Entities of this type begin in)
- One or more terminal States (States from which no further Transitions are valid)
- A set of Transitions (the valid paths between States)

**Optional characteristics:**
- Default Transitions (Transitions that occur automatically when conditions are met)
- Timed Transitions (Transitions triggered after a specified interval in the current State)
- Historical State retention (how long prior State history is preserved)

**Architectural responsibilities:**
- Governing the valid evolution of Entities of its type
- Defining the points at which Evidence must be produced (Transitions produce Events and Evidence)
- Supporting audit — at any point in time, the complete history of an Entity's States must be reconstructable

**Permitted relationships:**
- GOVERNS Entity Type (exactly one)
- CONTAINS State (one or more)
- DEFINES Transition (zero or more)

**Constraints:**
- Every Entity of the Lifecycle's Entity Type must be in exactly one State at any point in time
- A Lifecycle must have exactly one initial State
- A Lifecycle may not permit a State that is unreachable from the initial State (dead States are architectural defects)
- The Lifecycle of an Entity may not be changed while the Entity is active — Lifecycle changes are MAJOR version changes to the Entity Type

**Examples:** The Task Lifecycle (PLANNED → APPROVED → QUEUED → EXECUTING → COMPLETED / FAILED / CANCELLED / FORCE_TERMINATED); the Registry Record Lifecycle (PROPOSED → UNDER_REVIEW → ADMITTED → ACTIVE → DEPRECATED → REMOVED).

**Non-examples:** A status field with unconstrained string values is not a Lifecycle. A Lifecycle requires defined States with valid Transitions, not a free-form status property.

---

#### State

**Definition:** A State is a stable, named condition that an Entity occupies within its Lifecycle. An Entity in a given State possesses specific characteristics, is subject to specific Constraints, and may undergo specific Transitions.

**Purpose:** To provide the architectural vocabulary for describing where an Entity is in its evolution. States make an Entity's condition deterministic — at any point in time, the Entity is in exactly one named State with a defined meaning.

**Required characteristics:**
- A canonical name, unique within its Lifecycle
- A semantic description (what it means for an Entity to be in this State)
- Classification as initial, intermediate, or terminal
- A defined set of valid outgoing Transitions (may be empty for terminal States)

**Optional characteristics:**
- State-specific Constraints (Constraints that only apply while in this State)
- State-specific Authority requirements (some States may restrict which Identities may invoke Capabilities on this Entity)
- State entry obligations (what must happen when this State is entered)
- State exit obligations (what must happen when this State is departed)

**Architectural responsibilities:**
- Providing the named condition for Lifecycle-governed Entities
- Serving as the condition in Transition definitions
- Being the subject of Evidence when entered or exited

**Permitted relationships:**
- IS_PART_OF Lifecycle (exactly one)
- IS_ENTERED_VIA Transition (zero or more; the initial State has no entry Transition)
- IS_EXITED_VIA Transition (zero or more; terminal States have no exit Transitions)

**Constraints:**
- An Entity may be in exactly one State at any point in time
- A State name must be unique within its Lifecycle
- A terminal State may have no outgoing Transitions
- An initial State must be reachable immediately upon Entity creation

**Examples:** EXECUTING (the State in which an agent task is actively processing; only the Agent owning the task may invoke Capabilities on it; the task produces Evidence of each action taken); ACTIVE (the State in which a Registry Record has been admitted and is the current definition of its object).

**Non-examples:** "Running" as a free-form description is not a State. A State must be defined within a Lifecycle with explicit entry and exit Transitions, not inferred from an attribute value.

---

#### Transition

**Definition:** A Transition is a valid, governed change between two States within a single Lifecycle. A Transition specifies the conditions under which it may occur, the Authority required to trigger it, and the Events and Evidence it must produce.

**Purpose:** To make State changes explicit and auditable. Without Transitions, an Entity's State could change arbitrarily — from any State to any other State, for any reason. Transitions constrain change to what is architecturally valid and ensure that every change is evidenced.

**Required characteristics:**
- A source State (the State before the Transition)
- A target State (the State after the Transition)
- A trigger condition (what causes this Transition)
- An Authority requirement (who may trigger this Transition)
- An Evidence obligation (what Evidence record the Transition must produce)
- Both source and target States must be within the same Lifecycle

**Optional characteristics:**
- Pre-conditions (additional Constraints that must be satisfied before the Transition is valid)
- Post-conditions (guarantees that hold after the Transition completes)
- Compensation (how to reverse the effects if the Transition must be undone)

**Architectural responsibilities:**
- Constituting the only valid mechanism for State change
- Producing the Events and Evidence that make State history auditable
- Being the enforcement point for Authority requirements on State changes

**Permitted relationships:**
- ORIGINATES_FROM State (exactly one)
- TERMINATES_AT State (exactly one)
- IS_PART_OF Lifecycle (exactly one)
- REQUIRES Authority
- PRODUCES Event (always)
- PRODUCES Evidence (when obligated)
- IS_GOVERNED_BY Policy (zero or more)

**Constraints:**
- A Transition may not move an Entity to a State in a different Lifecycle
- A Transition may not be triggered without satisfying its Authority requirement
- A Transition must produce an Event — undocumented State changes are architectural defects
- A Transition that is defined but can never be triggered is a dead Transition — an architectural defect

**Examples:** The Transition from PLANNED to APPROVED (triggered by a governance approval event, requires EXECUTIVE or SOVEREIGN authority, produces an Approval Event and an Audit Record); the Transition from ACTIVE to DEPRECATED in the Registry Record Lifecycle (triggered by a supersession decision, requires governing authority, produces a Deprecation Event).

**Non-examples:** An ad hoc status change without a defined trigger, Authority requirement, or Evidence obligation is not a Transition — it is an uncontrolled State mutation, which is an architectural defect.

---

#### Event

**Definition:** An Event is an immutable record of something that has occurred within the Civilisation. An Event announces that an occurrence has taken place — a State Transition, a Capability invocation, a threshold crossing, or any other occurrence of architectural significance. Events are emitted, not requested; observed, not commanded.

**Purpose:** To provide the architectural mechanism for asynchronous observation and propagation of occurrences. Events allow the architecture to be responsive to change without requiring polling. They are the mechanism by which the Civilisation knows that its state has changed.

**Required characteristics:**
- A canonical Identity (unique, generated at emission time)
- An Event Type (what kind of occurrence this Event records)
- The Identity of the source Entity that emitted the Event
- A timestamp of emission (when the occurrence happened)
- An idempotency key (allows consumers to detect duplicate delivery)
- A content hash (integrity verification)
- Immutability: an Event may not be modified after emission

**Optional characteristics:**
- A correlation identity (linking this Event to a related Workflow or Process run)
- A subject Entity identity (the Entity about whom the Event reports, if different from the emitter)
- A payload (structured data describing the occurrence in detail)
- An expiry (after which time the Event is no longer actionable)

**Architectural responsibilities:**
- Propagating knowledge of occurrences to all interested parties without polling
- Constituting the architectural record of State Transitions (every Transition must emit an Event)
- Being the input to Evidence production (Events are observed and recorded as Evidence)

**Permitted relationships:**
- IS_OF_TYPE Event Type (registered in the Event Type Registry)
- IS_EMITTED_BY Entity (exactly one source)
- RECORDS occurrence (a State Transition, Capability invocation, or threshold crossing)
- PRODUCES Evidence (when the Event is an auditable occurrence)
- IS_CONSUMED_BY Service or Entity (zero or more consumers)

**Constraints:**
- An Event is immutable after emission — no modification is permitted
- An Event must have an idempotency key — duplicate Events must be detectable
- Every State Transition must produce an Event
- An Event Type must be registered in the Event Type Registry before Events of that type may be emitted
- Event emission may not be silently swallowed on failure — a failed emission must produce an Evidence record

**Examples:** A TaskStateChanged Event (emitted when an agent task transitions from QUEUED to EXECUTING); a CapabilityInvoked Event (emitted when a Capability is exercised); a BoundaryViolationAttempted Event (emitted when a Boundary is approached without sufficient Evidence).

**Non-examples:** A log line is not an Event. A log line is an implementation artifact; an Event is an architectural record with Identity, type registration, and idempotency guarantees. A notification is not necessarily an Event — a notification is a downstream response to an Event.

---

### Group G — Intent and Work

---

#### Goal

**Definition:** A Goal is a declared desired future state of the Civilisation or a component thereof. A Goal expresses what the Civilisation intends to achieve, without prescribing the specific Workflow or Process by which it will be achieved. Goals are the architectural representation of intent.

**Purpose:** To make the Civilisation's intentions explicit, registered, and measurable. Without registered Goals, the Civilisation operates without articulated direction. Goals provide the context against which Objectives are measured and Projects are justified.

**Required characteristics:**
- A canonical Identity
- A description of the desired future state (expressed as an outcome, not an activity)
- An Owner (the Entity accountable for pursuing this Goal)
- A Lifecycle State (Goals have a lifecycle: DECLARED → ACTIVE → ACHIEVED / ABANDONED)
- At least one Objective (through which progress is measured)

**Optional characteristics:**
- A time horizon (by when this Goal should be achieved)
- Priority classification
- Constitutional alignment (which constitutional article motivates this Goal)

**Architectural responsibilities:**
- Providing the intentional context for Projects and Workflows
- Being the reference against which achievement is evaluated
- Supporting strategic alignment — all Projects should trace to at least one Goal

**Permitted relationships:**
- IS_OWNED_BY Entity
- HAS Objective (one or more)
- IS_PURSUED_BY Project (zero or more)
- HAS Lifecycle State
- IS_REGISTERED_IN Goal Registry

**Constraints:**
- A Goal must be owned — unowned Goals are unaccountable
- A Goal must be expressed as an outcome, not an activity (outcomes describe what will be true; activities describe what will be done)
- A Goal may not be marked ACHIEVED without Evidence demonstrating achievement

---

#### Objective

**Definition:** An Objective is a specific, measurable sub-goal that, when achieved, constitutes progress toward a parent Goal. An Objective is the unit of measurement for Goal progress.

**Purpose:** To make Goal progress measurable and auditable. Goals express intent; Objectives make that intent evaluable. An Objective must be specifiable in terms that allow its achievement to be determined unambiguously.

**Required characteristics:**
- Association with exactly one parent Goal
- A measurable success criterion (what must be true for this Objective to be considered achieved)
- A Metric or set of Metrics against which achievement is measured
- A Lifecycle State (PENDING → ACTIVE → MET / MISSED / DEFERRED)

**Optional characteristics:**
- A time-bound (by when this Objective must be achieved)
- A weight (contribution to overall Goal achievement)

**Permitted relationships:**
- IS_PART_OF Goal (exactly one parent)
- IS_MEASURED_BY Metric (one or more)
- IS_ACHIEVED_BY Workflow or process outcome

**Constraints:**
- An Objective's success criterion must be evaluable — it must be possible to determine MET or MISSED from observable Evidence
- An Objective may not be marked MET without Evidence

---

#### Project

**Definition:** A Project is a bounded, purposeful initiative that pursues one or more Goals through a defined set of Workflows and the deployment of Resources. A Project has defined scope, a Lifecycle, an Owner, and a defined end state.

**Purpose:** To organise bounded work toward specific Goals. Projects are the architectural unit of intentional, goal-directed effort. They differ from ongoing Processes (which repeat indefinitely) in that they are bounded and terminate when their scope is completed or abandoned.

**Required characteristics:**
- A canonical Identity
- A parent Goal (or Goals it pursues)
- An Owner
- A defined scope (what is included and excluded from this Project)
- A Lifecycle State (PROPOSED → APPROVED → ACTIVE → COMPLETED / ABANDONED)
- A Resource allocation

**Optional characteristics:**
- A deadline
- Dependency relationships to other Projects
- A risk register

**Permitted relationships:**
- PURSUES Goal (one or more)
- IS_OWNED_BY Entity
- CONSISTS_OF Workflow (one or more)
- CONSUMES Resource
- HAS Lifecycle State

**Constraints:**
- A Project must trace to at least one Goal — purposeless Projects are not admitted
- A Project must have a defined end state — Projects do not continue indefinitely

---

#### Workflow

**Definition:** A Workflow is a specific, ordered sequence of steps that achieves a defined outcome by invoking Capabilities in a prescribed order. A Workflow is deterministic: given the same inputs and conditions, it follows the same path.

**Purpose:** To make specific multi-step operations governable, auditable, and repeatable. Workflows are the architectural representation of complex operations that involve multiple Capabilities, multiple Entities, and multiple Transitions.

**Required characteristics:**
- A canonical Identity (registered in the Workflow Registry)
- An ordered sequence of steps (each step invokes a Capability)
- A defined input (what the Workflow requires to begin)
- A defined output (what a successfully completed Workflow produces)
- A defined failure handling (what happens at each step if that step fails)
- A governing Authority requirement

**Optional characteristics:**
- Conditional branching (different step sequences based on conditions)
- Parallelism (some steps may execute simultaneously)
- Compensation steps (steps that undo prior steps if the Workflow fails)

**Permitted relationships:**
- INVOKES Capability (at each step)
- IS_EXECUTED_BY Service or Agent
- CONSUMES Resource
- PRODUCES Evidence
- IS_PART_OF Process or Project

**Constraints:**
- A Workflow must have a defined terminal condition (it must end)
- Every step that invokes a Capability must satisfy that Capability's Authority requirement
- A Workflow must produce Evidence of its completion or failure

---

#### Process

**Definition:** A Process is a repeatable pattern of activities that produces a defined class of outcomes. Unlike a Workflow (which is a specific deterministic sequence), a Process is a template that may be instantiated as multiple Workflow runs. Processes govern how recurring work is organised and governed.

**Purpose:** To make recurring organisational activities explicit and consistent. Processes ensure that recurring work is performed the same way every time, producing comparable Evidence and predictable Resource consumption.

**Required characteristics:**
- A canonical name
- A description of the class of outcomes it produces
- A defined triggering condition (what causes this Process to be instantiated)
- A standard Workflow template (the canonical path through the Process)
- An Owner Entity Type (what type of Entity is accountable for running this Process)

**Optional characteristics:**
- Frequency specification (how often this Process runs)
- Variance handling (what deviations from the standard Workflow are permitted)

**Permitted relationships:**
- INSTANTIATES Workflow (when triggered, a Process produces a Workflow run)
- PRODUCES Evidence (each Process run produces Evidence of its execution)
- IS_GOVERNED_BY Policy

---

### Group H — Knowledge and Evidence

---

#### Knowledge

**Definition:** Knowledge is information that the Civilisation has acquired, validated, and retained for use in future decisions. Knowledge is distinct from raw data (unvalidated observations) and from Evidence (provenance-bearing records of specific events). Knowledge is structured, typed, and persisted in governed Memory.

**Purpose:** To represent the Civilisation's accumulated understanding — about itself, its Entities, its history, and its environment. Knowledge enables the Civilisation to act with context, learn from experience, and make informed decisions.

**Required characteristics:**
- A Knowledge type (what category of understanding this Knowledge represents: procedural, episodic, semantic, declarative)
- A source (how this Knowledge was acquired — from Observations, from deliberation, from external input)
- A confidence level (how certain the Civilisation is of this Knowledge)
- A domain classification (which Domain this Knowledge concerns)
- A governed storage location (where this Knowledge is persisted — references ARCH-10 and ARCH-13)

**Optional characteristics:**
- An expiry or review date (when this Knowledge should be re-evaluated)
- Relationships to other Knowledge (what other Knowledge supports or contradicts this)
- A decay model (how confidence decreases over time without reinforcing Evidence)

**Permitted relationships:**
- IS_RETAINED_IN Memory
- IS_PRODUCED_BY Observation or deliberation
- IS_OF_TYPE Knowledge Type
- INFORMS decision-making and Workflow execution
- IS_GOVERNED_BY Source of Truth (for its Knowledge Type)

**Constraints:**
- Knowledge may not be accepted without a source — sourceless knowledge is unverifiable
- Knowledge that contradicts existing high-confidence Knowledge requires explicit Evidence before the existing Knowledge is superseded
- Knowledge must be stored in its designated Source of Truth — Knowledge stored outside its authoritative Memory system is a Projection, not the authoritative record

---

#### Memory

**Definition:** Memory is the governed persistence mechanism through which the Civilisation retains Knowledge across time and operational boundaries. Memory is a specialised Registry — it stores Knowledge Records and governs their lifecycle from creation through archival.

**Purpose:** To ensure that Knowledge is not lost when operational contexts end. Memory enables the Civilisation to reason about its past, apply prior lessons to new situations, and maintain continuity of understanding across sessions and restarts.

**Required characteristics:**
- A Memory Type (what kind of Knowledge it retains: Semantic, Episodic, Procedural, Decision, Working)
- A Source of Truth designation (this Memory type is the authoritative store for its Knowledge Type)
- A governed write path (all writes must go through a defined gateway)
- A lifecycle for Memory Records (CREATED → ACTIVE → COMPRESSED → ARCHIVED → EXPIRED)
- A retention policy

**Optional characteristics:**
- A retrieval model (how Knowledge is located: exact match, similarity, keyword, relational)
- A compression policy (how older Memory Records are summarised)
- A quota (maximum Memory Records before compression or archival is triggered)

**Permitted relationships:**
- RETAINS Knowledge (its primary function)
- IS_GOVERNED_BY Source of Truth Registry entry
- HAS governed write path (exactly one canonical write path)
- MAY_PRODUCE Projection (for read access patterns)

**Constraints:**
- A Memory write must go through the designated write path — direct writes that bypass the write path are architectural defects
- Every Memory write must produce an Audit Record
- Memory Records are not deleted — they are archived or expired with Evidence
- Multiple Memory types that store the same Knowledge create Source of Truth conflicts and are prohibited unless one is explicitly designated as a Projection of the other

---

#### Observation

**Definition:** An Observation is a structured record of a perception of something that has occurred, exists, or has been measured within the Civilisation or its environment. An Observation is the raw material from which Evidence is produced after validation and provenance attribution.

**Purpose:** To provide the architectural mechanism for recording perceptions before they are validated as Evidence. Observations capture what was seen; Evidence asserts what is known to have happened. The distinction preserves epistemic integrity — not all Observations become Evidence.

**Required characteristics:**
- A subject (what was observed — an Entity, a Property value, a Metric value, or an occurrence)
- An observer (which Entity made the Observation)
- A timestamp (when the Observation was made)
- A description of what was observed

**Optional characteristics:**
- Confidence level (how certain the observer is)
- Corroborating Observations (other Observations that support the same conclusion)
- An associated Event (if the Observation records a specific Event occurrence)

**Permitted relationships:**
- HAS_SUBJECT Entity, Property, Metric, or occurrence
- IS_MADE_BY Entity (the observer)
- PRODUCES Evidence (when validated)
- CORROBORATES other Observations

**Constraints:**
- An Observation may not be modified after it is recorded — modifications constitute new Observations
- An Observation alone does not constitute Evidence — Evidence requires provenance and validation
- An Observation that is not retained (not stored as a record) does not exist architecturally

---

#### Evidence

**Definition:** Evidence is an immutable, provenance-bearing record that asserts that a specific occurrence happened, a specific State existed, or a specific Capability was invoked. Evidence is the constitutional record of the Civilisation's actions and states. Evidence that is chained (each record linking to its predecessor via a cryptographic hash) constitutes an immutable audit trail.

**Purpose:** To constitute the verifiable, tamper-evident record of the Civilisation's history. The constitutions (constitution-v1.md Art. 3) mandate an immutable evidence chain, no silent failures, and full traceability. Evidence is the architectural mechanism that fulfils these mandates.

**Required characteristics:**
- A canonical Identity (unique, assigned at creation)
- An Evidence type (what occurrence or state this Evidence asserts)
- A subject (what Entity, Capability invocation, Transition, or occurrence this Evidence concerns)
- The Identity of the actor (whose action or whose observation produced this Evidence)
- A timestamp
- Immutability: Evidence may not be modified or deleted after creation
- A chain link (the cryptographic hash of the preceding Evidence record in the same chain — absent only for the first record in a chain)

**Optional characteristics:**
- A payload (structured data supporting the assertion)
- A governance score impact (how this Evidence affects the Civilisation's governance score)
- Cross-references to related Evidence records

**Architectural responsibilities:**
- Constituting the immutable record that makes the Civilisation's history auditable
- Supporting Certification (Certifications are made based on accumulated Evidence)
- Providing the foundation for governance score computation
- Being the constitutional fulfilment of the "no silent failures" requirement

**Permitted relationships:**
- IS_PRODUCED_BY Transition, Capability invocation, Observation, or Governance decision
- CONCERNS Entity (the subject of the Evidence)
- IS_CHAINED_TO prior Evidence record (via cryptographic hash)
- SUPPORTS Certification
- IS_IMMUTABLE (no modification Relationships permitted)

**Constraints:**
- Evidence may not be modified after creation — this is an absolute invariant
- Evidence may not be deleted — removal of Evidence constitutes an architectural defect and a constitutional violation
- Evidence chain gaps — a chain in which a record's chain link does not resolve to an existing prior record — constitute an architectural defect requiring investigation
- A Capability invocation that produces no Evidence when its audit obligation requires it is an architectural defect

**Examples:** An Audit Record of a Task Transition from APPROVED to QUEUED; an Observation Record of a Boundary crossing attempt with insufficient Trust; a Certification verdict documenting that INV-A4 (WebSocket authentication) is ENFORCED.

**Non-examples:** A log line is not Evidence unless it is structured, has a canonical Identity, is immutable, and participates in a chain. A comment in code is not Evidence.

---

#### Metric

**Definition:** A Metric is a quantifiable measurement of a specific aspect of the Civilisation's operation, health, or performance. Metrics are a specialised class of Observation — they are numeric, typed, and associated with a defined measurement methodology.

**Purpose:** To make the Civilisation's operational characteristics measurable and comparable over time. Metrics support governance score computation, capacity planning, Objective measurement, and health monitoring.

**Required characteristics:**
- A canonical name
- A value type (integer, decimal, percentage, ratio)
- A unit of measurement
- A measurement subject (what Entity or aspect is being measured)
- A collection methodology (how the Metric value is determined)
- A temporal context (point-in-time measurement or period aggregate)

**Optional characteristics:**
- Threshold values (at which alert Evidence should be produced)
- Historical retention policy (how long Metric values are retained)
- Aggregation rules (how point-in-time values are aggregated into period summaries)

**Permitted relationships:**
- IS_ASSOCIATED_WITH Entity or operational aspect
- IS_USED_BY Objective (to measure progress)
- PRODUCES Evidence when threshold is crossed
- IS_RETAINED_IN Memory (Metric history is a form of Knowledge)

**Constraints:**
- A Metric must have a defined collection methodology — metrics without a defined collection method cannot be verified
- Threshold-crossing Events must be produced promptly — deferred notification defeats the purpose of threshold monitoring

---

### Group I — Truth and Representation

---

#### Domain

**Definition:** A Domain is a bounded area of concern within the Civilisation that has a defined subject matter, a designated governing authority, and a single Source of Truth for the facts it governs. Domains are the units of concern partitioning that prevent architectural sprawl.

**Purpose:** To organise the Civilisation's concerns into bounded, governable areas where authority is clear and Source of Truth is unambiguous. Domains prevent the fragmentation of authority and knowledge that occurs when no boundaries are drawn.

**Required characteristics:**
- A canonical name
- A subject matter definition (what facts and Entities fall within this Domain)
- Exactly one Source of Truth for the facts within this Domain
- A governing authority (which Entity is accountable for this Domain)
- Defined Boundaries with adjacent Domains (where this Domain ends and others begin)

**Optional characteristics:**
- Sub-domains (bounded areas within this Domain with their own sub-authorities)
- Domain-specific Policies (Policies that apply only within this Domain)

**Permitted relationships:**
- CONTAINS Entity Types, Capabilities, and Knowledge pertaining to its subject matter
- HAS Source of Truth (exactly one, for the authoritative facts of this Domain)
- HAS governing authority
- IS_BOUNDED_BY adjacent Domains

**Constraints:**
- A Domain may not be without a Source of Truth — a Domain without a designated authoritative source is an ungoverned fact space
- Facts may not belong to more than one Domain's Source of Truth (they may appear in multiple Projections, but one Domain owns the authoritative version)
- Domain boundaries must be explicit — overlap between Domains must be resolved by assigning the overlapping facts to exactly one Domain

**Examples:** The Memory Domain (governs all facts about what the Civilisation has retained); the Goals Domain (governs all facts about what the Civilisation intends to achieve); the Agent Execution Domain (governs all facts about agent task execution).

**Non-examples:** A module or service is not a Domain. A Domain is an architectural concern boundary, not an implementation boundary.

---

#### Source of Truth

**Definition:** A Source of Truth is the single authoritative store for all facts within a designated Domain or fact sub-domain. When the Source of Truth and a Projection disagree, the Source of Truth is correct by definition. Every fact in the Civilisation has exactly one Source of Truth.

**Purpose:** To implement the architectural constitution's mandate that every fact has exactly one authoritative source (Scripts/CONSTITUTION.md Art. 1). Without a designated Source of Truth, any store that holds a fact may claim to be authoritative, producing irresolvable conflicts.

**Required characteristics:**
- Designation as the authoritative store for exactly one Domain or fact sub-domain
- Registration in the Source of Truth Registry (ARCH-05)
- A defined write protocol (how facts are written to the Source of Truth)
- A defined read protocol (how facts are retrieved from the Source of Truth)
- A consistency guarantee (the Source of Truth is always consistent within itself)

**Optional characteristics:**
- Synchronisation protocol (how the Source of Truth synchronises to its Projections)
- Conflict resolution procedure (if concurrent writes create inconsistency)

**Permitted relationships:**
- IS_AUTHORITATIVE_FOR Domain or fact sub-domain (exactly one)
- IS_REGISTERED_IN Source of Truth Registry
- PRODUCES Projection (zero or more)
- IS_CONSUMED_BY Services that read from this Domain

**Constraints:**
- No fact may have more than one Source of Truth
- A Source of Truth may not be designated for a fact it does not actually store
- A Projection may not be treated as a Source of Truth — the designation must be explicit and registered
- Updating the Source of Truth designation requires an Audit Record and SOVEREIGN or EXECUTIVE authority

**Examples:** The Memory Write Gateway is the Source of Truth for the Semantic Memory Domain; the Goal Registry is the Source of Truth for the Goals Domain.

**Non-examples:** A cache is not a Source of Truth — it is a Projection with a freshness guarantee. A read replica is not a Source of Truth — it is a Projection with high consistency. The designation "Source of Truth" is exclusive; it cannot be shared.

---

#### Projection

**Definition:** A Projection is a derived, read-optimised view of facts whose authoritative version resides in a Source of Truth. A Projection is always derived from exactly one Source of Truth. It may be stale (not yet synchronised with recent writes to the Source of Truth) but it may never be treated as the Source of Truth itself.

**Purpose:** To allow the Civilisation to present information in multiple forms and to multiple consumers without compromising the integrity of the Source of Truth. Projections support performance, accessibility, and format diversity while maintaining the single-source principle.

**Required characteristics:**
- Association with exactly one Source of Truth (the Projection derives from)
- A staleness tolerance (the maximum acceptable lag between Source of Truth updates and Projection updates)
- A synchronisation mechanism (how the Projection is updated when the Source of Truth changes)
- Explicit identification as a Projection (consumers must know they are reading a Projection, not the Source of Truth)

**Optional characteristics:**
- Transformation rules (how the Source of Truth data is transformed for this Projection)
- Conflict detection (if the Projection diverges beyond tolerance, how it alerts)

**Permitted relationships:**
- DERIVES_FROM Source of Truth (exactly one)
- IS_CONSUMED_BY Services or Entities that need read access
- IS_SYNCHRONISED_BY an event-driven or scheduled mechanism

**Constraints:**
- A Projection may not be written to directly — all writes go to the Source of Truth
- A Projection that exceeds its staleness tolerance must produce a warning Event
- A Projection may never claim to be a Source of Truth

---

#### Digital Twin

**Definition:** The Digital Twin is the complete, current, architectural model of the APEX Civilisation — the totality of all registered Entities, all active Relationships, all Source of Truth designations, all active Workflows, and all accumulated Knowledge and Evidence. The Digital Twin is the Civilisation as it is known to itself.

**Purpose:** To provide the architectural concept of the Civilisation's self-model. The Digital Twin represents the Civilisation's self-knowledge — what it knows about itself, its state, and its history. All architectural documents, registries, evidence records, and runtime state together constitute the Digital Twin.

**Required characteristics:**
- Completeness: the Digital Twin encompasses all architectural objects that are registered and active within the Civilisation
- Consistency: the Digital Twin reflects the current state of all Source of Truth systems (via their Projections or directly)
- Accessibility: all components of the Digital Twin must be queryable and discoverable

**Optional characteristics:**
- Historical snapshots (point-in-time records of the Digital Twin's state)
- Predictive extensions (projections of future Digital Twin state based on declared Goals and active Projects)

**Permitted relationships:**
- REPRESENTS the Civilisation
- CONTAINS all registered Entities, Relationships, and architectural objects
- IS_UPDATED_BY Events (each significant Event updates some part of the Digital Twin)

**Constraints:**
- The Digital Twin is the aggregate of the Civilisation's Source of Truth systems — it is not a separate system but a conceptual label for their union
- Gaps in the Digital Twin (architectural objects that exist but are not registered) are architectural defects

---

### Group J — Validation

---

#### Certification

**Definition:** A Certification is a formal, evidence-backed verdict on whether a specific architectural Constraint, invariant, or Policy Rule is satisfied within the Civilisation at a specific point in time. A Certification is produced by a defined Certification process, requires Evidence, and produces an Evidence record of its own verdict.

**Purpose:** To make the Civilisation's compliance with its own architectural invariants and Policies objectively assessable and recorded. Certification is the mechanism by which the Civilisation knows whether its own architecture is functioning as specified.

**Required characteristics:**
- A subject (the Constraint, invariant, or Policy Rule being certified)
- A verdict (ENFORCED / PARTIALLY ENFORCED / NOT ENFORCED / SIMULATED ONLY / UNKNOWN)
- An Evidence basis (the Evidence records that support the verdict)
- A timestamp (when the Certification was made)
- An issuing authority (who conducted the Certification)
- A scope (what part of the system the Certification covers)

**Optional characteristics:**
- A validity period (until when this Certification is considered current)
- Remediation recommendations (for non-ENFORCED verdicts)
- Re-certification trigger (what Event triggers re-certification)

**Permitted relationships:**
- IS_SUPPORTED_BY Evidence (one or more)
- CONCERNS Constraint, invariant, or Policy Rule
- IS_ISSUED_BY governing authority
- PRODUCES Evidence of its own verdict (the act of Certification is itself evidenced)

**Constraints:**
- A Certification may not be issued without an Evidence basis
- A Certification verdict of ENFORCED requires Evidence demonstrating enforcement, not merely the presence of the governing Constraint
- A Certification expires if significant architectural changes occur in the certified area
- Certifications are immutable — a revised assessment produces a new Certification, not a modification of the prior one

---

## Section 3 — Meta-Relationships

This section defines the canonical relationships between the primitive concepts defined in Section 2. These relationships constitute the meta-model's structure — the conceptual graph of APEX's architecture.

All relationship names are expressed as verb phrases. Directionality is from left to right: [source] RELATIONSHIP [target].

### 3.1 Entity Foundation Relationships

| Source | Relationship | Target | Cardinality | Notes |
|--------|-------------|--------|-------------|-------|
| Entity | IS_OF_TYPE | Entity Type | 1:1 | An Entity belongs to exactly one Entity Type |
| Entity | HAS | Identity | 1:1 | An Entity has exactly one canonical Identity |
| Entity | HAS | Property | 1:N | One Property per defined Attribute of its Entity Type |
| Entity | IS_IN | State | 1:1 | Exactly one current State at any point in time |
| Entity | IS_OWNED_BY | Entity | N:1 | Zero or one Owner; Founder has none |
| Entity | PARTICIPATES_IN | Relationship | N:N | As source or target |
| Entity | IS_REGISTERED_IN | Registry | N:M | At least one Registry per Entity |
| Entity Type | CLASSIFIES | Entity | 1:N | One Entity Type; many instances |
| Entity Type | DEFINES | Attribute | 1:N | The schema of the type |
| Entity Type | HAS | Lifecycle | 1:1 | Exactly one Lifecycle per Entity Type |
| Entity Type | PARTICIPATES_IN | Relationship Type | N:M | As permitted source or target |
| Property | INSTANTIATES | Attribute | N:1 | Every Property realises one Attribute definition |
| Property | BELONGS_TO | Entity | N:1 | Every Property belongs to one Entity |
| Identity | IDENTIFIES | Entity | 1:1 | One Identity per Entity; one Entity per Identity |
| Classification | GROUPS | Entity Type | N:M | An Entity Type may belong to multiple Classifications |
| Version | DESCRIBES | architectural object | N:1 | Multiple Versions of one object |
| Version | SUPERSEDES | Version | 1:1 (optional) | Sequential version history |

### 3.2 Relationship Structure

| Source | Relationship | Target | Cardinality | Notes |
|--------|-------------|--------|-------------|-------|
| Relationship | IS_OF_TYPE | Relationship Type | N:1 | Every Relationship conforms to one Type |
| Relationship | HAS_SOURCE | Entity | N:1 | Every Relationship has one source |
| Relationship | HAS_TARGET | Entity | N:1 | Every Relationship has one target |
| Relationship Type | GOVERNS | Relationship | 1:N | The schema for Relationships of this type |
| Relationship Type | PERMITS | Entity Type (as source) | 1:N | What Entity Types may be sources |
| Relationship Type | PERMITS | Entity Type (as target) | 1:N | What Entity Types may be targets |

### 3.3 Authority and Trust Relationships

| Source | Relationship | Target | Cardinality | Notes |
|--------|-------------|--------|-------------|-------|
| Ownership | IS_A | Relationship (type: OWNS) | — | Ownership is a specialised Relationship |
| Ownership | GRANTS | Authority | 1:N | Owning an Entity grants defined Authority over it |
| Authority | IS_HELD_BY | Identity | N:1 | Who holds this Authority |
| Authority | GOVERNS | Capability | N:M | What Capabilities this Authority permits |
| Authority | GOVERNS | Transition | N:M | What Transitions this Authority may trigger |
| Authority | IS_SCOPED_TO | Entity or Entity Type | N:M | The scope of the Authority |
| Trust | IS_ASSOCIATED_WITH | Identity | N:1 | An Identity has one Trust Level |
| Trust | DETERMINES | Authority | 1:N | Trust Level bounds what Authority is held |
| Boundary | SEPARATES | Trust Level × Trust Level | 1:1 | Each Boundary is between two defined levels |
| Boundary | REQUIRES | Evidence | N:M | What Evidence permits upward crossing |
| Boundary | HAS | Failure Mode | 1:1 | Exactly one declared Failure Mode |

### 3.4 Governance Relationships

| Source | Relationship | Target | Cardinality | Notes |
|--------|-------------|--------|-------------|-------|
| Policy | CONTAINS | Rule | 1:N | A Policy without Rules is inert |
| Policy | GOVERNS | Capability | N:M | Policies constrain Capability invocation |
| Policy | GOVERNS | Transition | N:M | Policies constrain Transition triggering |
| Policy | IS_ENFORCED_AT | Boundary | N:M | Policies may be enforced at Boundaries |
| Rule | BELONGS_TO | Policy | N:1 | Every Rule is in exactly one Policy |
| Constraint | APPLIES_TO | architectural object | 1:N | An invariant on an architectural class |
| Registry | STORES | Registry Record | 1:N | The Registry's content |
| Registry | IS_AUTHORITATIVE_FOR | Entity Type | 1:1 | The Source of Truth for its type |
| Registry Record | REPRESENTS | architectural object | 1:1 | One Record per registered object |
| Registry Record | IS_STORED_IN | Registry | N:1 | Every Record belongs to one Registry |
| Governance | ENFORCES | Policy | 1:N | Governance implements Policy rules |
| Governance | GOVERNS | Registry | 1:N | Governance controls admission |

### 3.5 Capability and Service Relationships

| Source | Relationship | Target | Cardinality | Notes |
|--------|-------------|--------|-------------|-------|
| Capability | REQUIRES | Authority | N:1 | Minimum Authority to invoke |
| Capability | CONSUMES | Resource | N:M | What Resources invocation uses |
| Capability | PRODUCES | Event | N:1 | Invocation emits an Event |
| Capability | PRODUCES | Evidence | N:1 | Per audit obligation |
| Capability | IS_PROVIDED_BY | Service | N:1 | Which Service provides this Capability |
| Capability | IS_REGISTERED_IN | Registry | N:1 | The Capability Registry |
| Service | PROVIDES | Capability | 1:N | A Service's Capability set |
| Service | EXPOSES | Interface | 1:N | A Service has one or more Interfaces |
| Interface | EXPOSES | Capability | N:M | A subset of the Service's Capabilities |
| Resource | IS_CONSUMED_BY | Capability | N:M | Resource accounting per Capability |
| Resource | IS_ALLOCATED_TO | Entity | N:M | Who holds this Resource |

### 3.6 Lifecycle and Change Relationships

| Source | Relationship | Target | Cardinality | Notes |
|--------|-------------|--------|-------------|-------|
| Lifecycle | GOVERNS | Entity Type | 1:1 | One Lifecycle per Entity Type |
| Lifecycle | CONTAINS | State | 1:N | All valid States for this Lifecycle |
| Lifecycle | DEFINES | Transition | 1:N | All valid Transitions |
| State | IS_PART_OF | Lifecycle | N:1 | A State belongs to one Lifecycle |
| State | IS_ENTERED_VIA | Transition | N:M | How this State is reached |
| State | IS_EXITED_VIA | Transition | N:M | How this State is departed |
| Transition | ORIGINATES_FROM | State | N:1 | Source State |
| Transition | TERMINATES_AT | State | N:1 | Target State |
| Transition | REQUIRES | Authority | N:1 | Who may trigger |
| Transition | PRODUCES | Event | N:1 | Always; State changes must be observed |
| Transition | PRODUCES | Evidence | N:1 | When audit obligation applies |
| Event | IS_OF_TYPE | Event Type | N:1 | Registered type |
| Event | IS_EMITTED_BY | Entity | N:1 | Source Entity |
| Event | RECORDS | occurrence | N:1 | The occurrence this Event announces |
| Event | PRODUCES | Evidence | N:1 | Auditable Events produce Evidence |

### 3.7 Knowledge and Evidence Relationships

| Source | Relationship | Target | Cardinality | Notes |
|--------|-------------|--------|-------------|-------|
| Knowledge | IS_RETAINED_IN | Memory | N:1 | Stored in the appropriate Memory type |
| Knowledge | INFORMS | decision or Workflow | N:M | Applied Knowledge |
| Memory | RETAINS | Knowledge | 1:N | Memory's purpose |
| Memory | IS_THE | Source of Truth (for its Domain) | 1:1 | Memory is authoritative for its Knowledge type |
| Observation | HAS_SUBJECT | Entity, Property, or occurrence | N:1 | What was observed |
| Observation | IS_MADE_BY | Entity | N:1 | The observer |
| Observation | PRODUCES | Evidence | N:1 | When validated |
| Evidence | IS_PRODUCED_BY | Transition, Capability, or Observation | N:1 | Provenance |
| Evidence | IS_CHAINED_TO | Evidence | N:1 | Prior record in chain |
| Evidence | SUPPORTS | Certification | N:M | Evidence backing a verdict |
| Metric | IS_MEASURED_FOR | Entity or operational aspect | N:1 | Subject of measurement |
| Metric | PRODUCES | Evidence | N:1 | When thresholds are crossed |

### 3.8 Truth and Representation Relationships

| Source | Relationship | Target | Cardinality | Notes |
|--------|-------------|--------|-------------|-------|
| Domain | HAS | Source of Truth | 1:1 | Exactly one per Domain |
| Domain | CONTAINS | Entity Types and Knowledge | 1:N | Domain scope |
| Source of Truth | IS_AUTHORITATIVE_FOR | Domain | 1:1 | One Source per Domain |
| Source of Truth | PRODUCES | Projection | 1:N | Derived views |
| Projection | DERIVES_FROM | Source of Truth | N:1 | Always exactly one |
| Digital Twin | REPRESENTS | Civilisation | 1:1 | The complete self-model |
| Digital Twin | CONTAINS | all registered architectural objects | 1:N | Completeness requirement |
| Certification | IS_SUPPORTED_BY | Evidence | N:M | Verdict basis |
| Certification | CONCERNS | Constraint or Rule | N:1 | What is certified |
| Certification | IS_ISSUED_BY | governing authority | N:1 | Certification provenance |

---

## Section 4 — Architectural Invariants

The following invariants must hold at all times within the APEX Civilisation. A violated invariant constitutes an architectural defect — not a compliance failure — and must be remediated before the affected component can be certified.

These invariants are numbered for reference. They are immutable: no architectural specification may declare an exception.

**INV-META-01** Every Entity possesses exactly one canonical Identity.

**INV-META-02** Every Entity belongs to exactly one Entity Type.

**INV-META-03** Every Entity is in exactly one State at any point in time, and that State must be defined in the Entity's Entity Type Lifecycle.

**INV-META-04** Every Entity is discoverable via at least one Registry.

**INV-META-05** Every Relationship has exactly one Relationship Type.

**INV-META-06** Every Relationship is directional; the source and target are distinct.

**INV-META-07** Every Relationship connects only Entity Types that the Relationship Type permits.

**INV-META-08** Every Attribute belongs to exactly one Entity Type.

**INV-META-09** Every Property instantiates exactly one Attribute.

**INV-META-10** Every Identity identifies exactly one Entity; no two Entities share an Identity.

**INV-META-11** An Identity is assigned at Entity creation and does not change for the lifetime of the Entity.

**INV-META-12** Every Registry stores Records of exactly one Entry Type.

**INV-META-13** Every Registry Record represents exactly one architectural object.

**INV-META-14** A Registry Record may not be deleted; it may only change status to REMOVED.

**INV-META-15** Every Domain has exactly one Source of Truth.

**INV-META-16** Every Source of Truth is designated for exactly one Domain.

**INV-META-17** Every Projection derives from exactly one Source of Truth.

**INV-META-18** A Projection may never be treated as or designated as a Source of Truth.

**INV-META-19** Every fact belongs to exactly one Domain's Source of Truth; a fact may appear in multiple Projections, but only one Domain owns the authoritative version.

**INV-META-20** Every Capability is registered in the Capability Registry before it may be invoked.

**INV-META-21** Every Capability invocation must satisfy the Capability's Authority requirement.

**INV-META-22** Every Capability invocation must satisfy the Capability's audit obligation.

**INV-META-23** Every Lifecycle has exactly one initial State.

**INV-META-24** Every Lifecycle has at least one terminal State.

**INV-META-25** Every State within a Lifecycle is reachable from the initial State via a valid sequence of Transitions.

**INV-META-26** Every Transition produces an Event.

**INV-META-27** Every Event is immutable after emission.

**INV-META-28** Every Event has a unique Identity and an idempotency key.

**INV-META-29** Every Event Type is registered in the Event Type Registry before Events of that type may be emitted.

**INV-META-30** Evidence is immutable after creation; Evidence may not be modified or deleted.

**INV-META-31** Evidence chains have no gaps; each record's chain link must resolve to an existing predecessor.

**INV-META-32** A Boundary failure mode must be explicitly declared; undeclared Boundary failure modes are architectural defects.

**INV-META-33** A Boundary that fails toward permissiveness on the upward-crossing direction must carry a constitutional justification.

**INV-META-34** Every Policy is ratified before it is enforced.

**INV-META-35** Every Rule belongs to exactly one Policy.

**INV-META-36** No Rule within a Policy contradicts another Rule within the same Policy.

**INV-META-37** Every Entity except the Founder has exactly one Owner.

**INV-META-38** The Founder Entity has no Owner; it is the root of the Ownership graph.

**INV-META-39** Ownership may not be circular.

**INV-META-40** Every Registry is itself registered in the Registry of Registries.

**INV-META-41** A Governance decision must produce Evidence; ungoverned decisions are architecturally invisible.

**INV-META-42** The Digital Twin contains all registered architectural objects; an object that is not registered does not exist within the governed architecture.

---

## Section 5 — Modelling Rules

The following rules govern how future architectural documents are authored and how this Meta-Model may be extended. These rules are themselves Constraints — they are invariants of the meta-modelling process.

### 5.1 Naming Rules

**MR-01** All concept names are expressed in TitleCase (e.g., Entity Type, Registry Record, Source of Truth).

**MR-02** All Relationship Type names are expressed as verb phrases in UPPER_SNAKE_CASE (e.g., IS_OF_TYPE, IS_REGISTERED_IN, DERIVES_FROM).

**MR-03** All Attribute names are expressed in lower_snake_case (e.g., created_at, owner_id, admission_status).

**MR-04** Concept names must be unique within the Architecture namespace. If two concepts from different Domains share a name, they must be qualified with their Domain prefix (e.g., Agent.State vs Task.State).

**MR-05** Names must be unambiguous within the Architecture. If a name could refer to more than one concept without qualification, it must be qualified.

### 5.2 Introduction of New Concepts

**MR-06** A new architectural concept may only be introduced by instantiating or specialising a concept defined in ARCH-00. A new concept that cannot be expressed in terms of ARCH-00 primitives requires a Meta-Model amendment before it can be used.

**MR-07** Specialisation is permitted: a specialised concept inherits all Attributes, Constraints, and Relationships of its parent concept and may add to them. It may not remove or redefine inherited characteristics.

**MR-08** Every new concept introduced in an ARCH document must be explicitly declared as a specialisation of its parent ARCH-00 concept.

### 5.3 Relationship Declarations

**MR-09** Every Relationship between concepts in an ARCH document must declare its name, source concept, target concept, cardinality, and directionality.

**MR-10** Relationships that are implied by inheritance (a specialised concept inherits its parent's Relationships) must be explicitly confirmed rather than merely assumed.

### 5.4 Constraint and Invariant Declarations

**MR-11** Every invariant introduced in an ARCH document must be numbered (using the document's prefix, e.g., ARCH-01 invariants are INV-01-xx), stated in universal form ("For every X, Y must be true"), and scoped to the relevant concept.

**MR-12** An invariant introduced in an ARCH document may not contradict an invariant in ARCH-00 or any prior ARCH document.

### 5.5 Ambiguity Prevention

**MR-13** If a definition could be interpreted in two or more ways, the document author must include an explicit disambiguation section for that definition.

**MR-14** Non-examples must be provided for any concept that is commonly confused with a different concept.

### 5.6 Extension Rules

**MR-15** ARCH documents extend the meta-model by instantiation (defining specific Entity Types, specific Relationship Types, specific Capabilities) not by redefinition.

**MR-16** Instantiating a meta-model concept means applying it to a specific APEX domain. Redefining a meta-model concept means changing its meaning. Only instantiation is permitted in ARCH documents subsequent to ARCH-00.

### 5.7 Deprecation Rules

**MR-17** A concept is deprecated by creating a new Registry Record entry with status DEPRECATED and identifying the replacement concept.

**MR-18** Deprecated concepts are never removed from ARCH-00 — they are retained with DEPRECATED status for historical reference and backward compatibility.

**MR-19** A deprecated concept may not be used in new ARCH documents after its deprecation is ratified. Existing documents referencing a deprecated concept must be updated at their next ratification cycle.

### 5.8 Versioning Rules

**MR-20** ARCH-00 uses MAJOR.MINOR versioning. A MAJOR version change (vX.0) indicates that an existing concept has been redefined, renamed, or removed. A MINOR version change (v1.X) indicates that new concepts or Relationship Types have been added without changing existing ones.

**MR-21** A MAJOR version change to ARCH-00 requires re-evaluation of all subsequent ARCH documents for compatibility.

**MR-22** A MINOR version change to ARCH-00 does not invalidate existing ARCH documents, but new ARCH documents must reference the updated version.

### 5.9 Self-Reference

**MR-23** The Meta-Model is itself subject to its own concepts. ARCH-00 is a Document Entity of type "Architectural Specification", governed by Governance rules, versioned, owned by the Civilisation, and registered in the Document Registry. The Meta-Model does not exempt itself from the architecture it defines.

---

## Section 6 — Meta-Model Governance

### 6.1 Governing Authority

ARCH-00 is governed exclusively by SOVEREIGN authority — the Founder. No Entity below SOVEREIGN trust level may propose, review, or ratify changes to this document. An amendment by any other authority is constitutionally void.

This reflects constitution-v1.md Art. 8 (Amendment Process) applied to the foundational architectural layer.

### 6.2 How New Primitive Concepts Are Introduced

A new primitive concept is introduced to ARCH-00 only when all of the following conditions are met:

1. **Necessity:** Demonstrable that the concept cannot be expressed using existing ARCH-00 concepts, even through specialisation.
2. **Completeness:** The concept has a complete definition per the Section 2 template (Definition, Purpose, Required characteristics, Optional characteristics, Architectural responsibilities, Permitted relationships, Constraints, Examples, Non-examples).
3. **Consistency:** The new concept is consistent with all existing invariants and introduces no contradictions.
4. **Impact analysis:** All existing ARCH documents have been reviewed for the impact of the new concept. If impact is found, those documents are queued for amendment.
5. **Ratification:** The amendment has been reviewed by CRO and CLO (per constitution-v1.md Art. 8) and ratified by the Founder.

### 6.3 What Constitutes a Breaking Architectural Change

The following changes to ARCH-00 are MAJOR version changes (breaking):
- Renaming an existing concept (all references in all subsequent documents must be updated)
- Changing the definition of an existing concept such that its extension (the set of things the concept covers) changes
- Removing an existing concept
- Adding a new REQUIRED characteristic to an existing concept
- Changing the cardinality of any invariant (from "exactly one" to "zero or one", or vice versa)
- Adding a new Constraint to an existing concept that would invalidate previously valid uses of that concept

The following changes are MINOR version changes (non-breaking):
- Adding a new concept without redefining existing ones
- Adding a new Relationship Type without modifying existing ones
- Adding an OPTIONAL characteristic to an existing concept
- Adding new Examples or Non-examples
- Adding a new Invariant that is implied by existing Invariants (making implicit requirements explicit)
- Clarifying a definition without changing its scope

### 6.4 How Changes Are Reviewed

1. A change proposal is submitted as a Governance Record, identifying the change, its justification, its type (MAJOR or MINOR), and its impact on all existing ARCH documents.
2. CRO and CLO review the proposal for constitutional alignment and architectural consistency.
3. If no conflicts are found, the Founder ratifies the change, incrementing the Version.
4. The ratified change is published as a new Version of ARCH-00.
5. All subsequent ARCH documents that reference the changed concepts are flagged for review and re-ratification.

### 6.5 How Architectural Compatibility Is Maintained

Upon each Version increment of ARCH-00, a Compatibility Matrix is produced declaring, for each subsequent ARCH document, whether the change is:
- **Transparent:** The ARCH document requires no update
- **Additive:** The ARCH document may optionally adopt the new concept or characteristic
- **Required update:** The ARCH document must be updated before next use
- **Incompatible:** The ARCH document must be re-authored before it can be used with the new ARCH-00 version

---

## Section 7 — Dependency Contract

### 7.1 Universal Inheritance

Every architectural specification produced for the APEX Civilisation — ARCH-01 through ARCH-15 and all subsequent documents — inherits this Meta-Model. The inheritance is unconditional and non-negotiable.

Inheritance means:
- Every concept used in a subsequent document that corresponds to a concept defined in ARCH-00 must use ARCH-00's definition
- Every Relationship declared in a subsequent document that corresponds to a Relationship Type in ARCH-00's Section 3 must conform to that Relationship Type's constraints
- Every invariant in ARCH-00's Section 4 applies throughout the Architecture

### 7.2 Specialisation Is Permitted; Redefinition Is Prohibited

Subsequent documents may specialise ARCH-00 concepts for their domain:
- ARCH-01 may define specific Entity Types (specialising the meta-concept Entity Type)
- ARCH-03 may define the canonical Registry implementation (specialising the meta-concept Registry)
- ARCH-12 may define the Agent Lifecycle (instantiating the meta-concept Lifecycle with specific States and Transitions)

Subsequent documents may NOT:
- Redefine an ARCH-00 concept (change its meaning)
- Use the same name as an ARCH-00 concept to mean something different
- Introduce synonyms for ARCH-00 concepts without declaring them as aliases

### 7.3 Downstream Document Dependencies

| Document | Primary ARCH-00 Concepts Instantiated |
|----------|--------------------------------------|
| ARCH-01 — Entity Taxonomy | Entity Type, Attribute, Lifecycle, Classification |
| ARCH-02 — Relationship Ontology | Relationship Type, Relationship |
| ARCH-03 — Registry Architecture | Registry, Registry Record, Governance |
| ARCH-04 — Identity and Authority Specification | Identity, Trust, Authority, Ownership |
| ARCH-05 — Source of Truth Registry | Source of Truth, Projection, Domain, Registry |
| ARCH-06 — Trust Boundary Specification | Boundary, Trust, Evidence, Failure Mode (via Policy) |
| ARCH-07 — Failure Mode Policy | Policy, Rule, Constraint |
| ARCH-08 — Auditability Specification | Evidence, Observation, Certification |
| ARCH-09 — Capability Registry | Capability, Registry, Resource |
| ARCH-10 — Memory Architecture | Memory, Knowledge, Source of Truth, Lifecycle |
| ARCH-11 — Event Architecture | Event, Registry, Idempotency |
| ARCH-12 — Agent Lifecycle Model | Lifecycle, State, Transition, Entity Type (Agent, Task) |
| ARCH-13 — Knowledge Architecture | Knowledge, Memory, Domain, Source of Truth, Projection |
| ARCH-14 — Runtime Execution Model | Workflow, Process, Boundary, Capability, Evidence |
| ARCH-15 — Database Schema Standard | Projection (of Registry and Source of Truth records) |

### 7.4 Ratification of This Contract

By authoring a document within the ARCH series, the author accepts that:
1. All concepts in this document are inherited without modification
2. Any apparent conflict between this document and a subsequent ARCH document is resolved in favour of this document
3. A change required for architectural reasons must be achieved by amending this document, not by diverging from it silently

---

## Section 8 — Glossary

This glossary provides the canonical one-line reference for every primitive concept defined in this document. It is the authoritative reference for all future architectural specifications.

| Concept | Canonical Definition |
|---------|---------------------|
| **Attribute** | A named, typed slot defined on an Entity Type, specifying what Properties instances may or must carry |
| **Authority** | The right of an Identity to invoke a Capability, trigger a Transition, or govern an owned Entity |
| **Boundary** | A structural point where Trust Level changes; crossing upward requires Evidence; failure mode must be declared |
| **Capability** | A named, governed, and registered operation the Civilisation can perform |
| **Certification** | A formal, evidence-backed verdict on whether an Architectural Invariant or Policy Rule is satisfied |
| **Classification** | An organisational grouping of Entities or Entity Types by shared characteristics, without constituting an Entity Type |
| **Constraint** | An invariant that must hold at all times; violation indicates architectural defect, not compliance failure |
| **Digital Twin** | The complete, current architectural model of the Civilisation — the totality of all registered Entities, Relationships, and Knowledge |
| **Domain** | A bounded area of concern with a designated governing authority and exactly one Source of Truth |
| **Entity** | A discrete, identifiable thing of architectural significance; the fundamental unit of the architecture |
| **Entity Type** | The canonical definition of a class of Entities, specifying their Attributes, Lifecycle, and permitted Relationships |
| **Evidence** | An immutable, provenance-bearing, chain-linked record asserting that a specific occurrence happened or a specific State existed |
| **Event** | An immutable record announcing that an occurrence has taken place; emitted, not requested |
| **Governance** | The system of oversight, authority allocation, admission processes, and compliance monitoring through which the Civilisation governs itself |
| **Identity** | The canonical, persistent, and unique designation of a specific Entity within the Civilisation |
| **Interface** | The exposed contract through which a Service makes its Capabilities invocable |
| **Knowledge** | Information the Civilisation has acquired, validated, and retained for use in future decisions |
| **Lifecycle** | The complete set of States an Entity may occupy and the valid Transitions between them |
| **Memory** | The governed persistence mechanism through which the Civilisation retains Knowledge across time |
| **Metric** | A quantifiable measurement of an aspect of the Civilisation's operation or performance |
| **Observation** | A structured record of a perception made by an Entity about something that occurred or existed |
| **Ownership** | A Relationship of type OWNS granting the Owner governing authority over the owned Entity |
| **Policy** | A named, ratified set of Rules governing a specific category of decisions |
| **Process** | A repeatable pattern of activities that produces a defined class of outcomes |
| **Project** | A bounded, purposeful initiative pursuing specific Goals through defined Workflows |
| **Projection** | A derived, read-optimised view of facts whose authoritative version resides in a Source of Truth |
| **Property** | The instantiated value of an Attribute on a specific Entity |
| **Registry** | A governed catalogue of Registry Records representing a specific Entity Type or architectural object class |
| **Registry Record** | An entry in a Registry constituting the formal, auditable existence of an architectural object |
| **Relationship** | A directional, typed association between exactly two Entities |
| **Relationship Type** | The canonical definition of a class of Relationships, specifying permitted sources, targets, cardinality, and semantics |
| **Resource** | A finite, governed quantity consumed by Capabilities when invoked |
| **Rule** | An atomic governance statement within a Policy, declaring a condition and a required response |
| **Service** | An Entity that provides one or more Capabilities to other Entities via defined Interfaces |
| **Source of Truth** | The single authoritative store for all facts within a designated Domain; when it conflicts with a Projection, it is correct by definition |
| **State** | A stable, named condition that an Entity occupies within its Lifecycle |
| **Transition** | A valid, governed change between two States within a Lifecycle, producing an Event and optional Evidence |
| **Trust** | The architectural confidence assigned to an Identity, governing the Authority it may hold and the Boundaries it may cross |
| **Version** | A named, ordered snapshot of an architectural object or specification at a point in its evolution |
| **Workflow** | A specific, ordered sequence of steps achieving a defined outcome by invoking Capabilities |

---

*End of ARCH-00 — Architectural Meta-Model*
*Version 1.0 · Ratified 2026-07-02 · Governing authority: Founder (SOVEREIGN)*
*All subsequent ARCH documents inherit this specification without modification.*
