# APEX CIVILISATION — ARCH-04: Identity and Authority Specification

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Specification
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00 (Architectural Meta-Model), ARCH-01 (Entity Taxonomy), ARCH-03 (Registry Architecture)
**Depended on by:** ARCH-05, ARCH-06, ARCH-07, ARCH-08, ARCH-09, ARCH-10, ARCH-11, ARCH-12, ARCH-13, ARCH-14, ARCH-15

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document specifies the canonical identity model for the APEX Civilisation: how identity is established, represented, and verified; the six trust levels and their correspondence to identity types; the authority matrix defining what each trust level may do by operation class; the rules governing authority delegation and escalation; and the conditions under which identity is considered lost.

Every ARCH document that references identity, trust level, or authority derives its definitions from this specification. No downstream document may define these concepts independently.

### 1.2 Scope

This document covers:

- The definition of identity as an architectural primitive, distinguished from ownership and authority
- The canonical identity schema: mandatory fields, types, and immutability contracts
- The six identity types and their correspondence to entity types in ARCH-01
- The six trust levels: ordinal values, assignment rules, and permanence guarantees
- Credential types: definitions, verification methods, verification guarantees, and the trust level each credential type grants upon successful verification
- The identity establishment protocol: how identity is resolved from an inbound request and what failure mode governs failed verification
- The authority matrix: what each trust level may do by operation class
- Authority delegation: what may be delegated, to whom, under what conditions, and what may never be delegated
- Escalation rules: when an operation must escalate to a higher trust level before proceeding
- Identity loss conditions and recovery protocol
- Architectural invariants governing all identity operations

This document does not cover:

- **Ownership** — an attribute of entities defined in ARCH-01, not a property of the requesting identity
- **Trust boundary enforcement locations** — where in the request pipeline each boundary check is performed, specified in ARCH-06
- **Runtime identity attachment to request context** — the exact mechanism by which the identity object is attached to `req.identity`, specified in ARCH-14
- **Session lifecycle** — the creation, persistence, and expiry of sessions as entity type ET-COM-003, specified in ARCH-14; this document specifies only what trust level a session identity carries
- **Database schema for identity storage** — specified in ARCH-15

---

## Section 2 — Identity as an Architectural Primitive

### 2.1 Definition

**Identity** is the canonical, verified representation of WHO is responsible for an operation in the APEX Civilisation. Every operation that produces a Governance Record, modifies a governed entity, invokes a registered capability, or transitions a lifecycle state must be traceable to an established identity. An operation whose identity cannot be established is an unattributed operation and must not reach a governed handler.

Identity is established at the point of request entry. It is carried through the request lifecycle as an immutable fact. It is attached to every Governance Record, Audit Record, and Admission Record produced during the request's processing.

### 2.2 The Three Identity Concerns

Three distinct concerns are separated in the APEX Civilisation. Conflating them in implementation produces the defects documented in ARCH-01.

**Identity** — answers WHO: which entity is responsible for this operation? This is the subject of this document.

**Ownership** — answers WHOSE: which entity holds governance rights over this resource? Ownership is an attribute of entities (defined in ARCH-01) and is not a property of the requesting identity. An identity that owns an entity receives additional authority over that entity beyond its baseline trust level (Section 7.3). Ownership does not change the identity's trust level.

**Authority** — answers WHAT IS PERMITTED: given this identity's trust level, which operation classes may it perform on which entity categories? Authority is derived from trust level via the authority matrix (Section 7). It is not a property of the credential type directly — it follows from the trust level the credential type grants.

### 2.3 Identity Is Not a Boolean

Identity in this specification is not a binary authenticated/unauthenticated flag. Identity is a typed, levelled representation. A request carries identity at a specific trust level from NONE(1) through SOVEREIGN(6). The trust level determines what the request is permitted to do. The critical failure of the current implementation (ET-IDN-001) is treating failed verification as a fallback to anonymous identity rather than as a rejection — allowing unauthenticated requests to reach handlers that require verified identity.

---

## Section 3 — Canonical Identity Schema

Every identity representation in the APEX Civilisation must conform to the following schema. The identity object is produced by the identity resolution function at request entry and is immutable for the duration of the request.

### 3.1 Mandatory Fields

| Field | Type | Description |
|---|---|---|
| `identity_id` | UUID v4 | Stable identifier for this identity; same credential always produces the same `identity_id` |
| `identity_type` | enum | FOUNDER / COUNCIL_MEMBER / MINISTRY / AGENT / SYSTEM / ANONYMOUS |
| `trust_level` | integer (1–6) | Ordinal trust level; derived from identity_type and credential verification outcome |
| `credential_type` | enum | FOUNDER_TOKEN / COUNCIL_KEY / APP_KEY / AGENT_TOKEN / INTERNAL / NONE |
| `verification_status` | enum | VERIFIED / UNVERIFIED / DEGRADED |
| `verification_method` | string | Description of the verification method applied |
| `established_at` | timestamptz | Timestamp at which identity was established for this request |
| `session_id` | UUID v4 or null | Associated session (ET-COM-003) identifier; null for stateless requests |

### 3.2 Field Immutability Contracts

The identity object is immutable once established. No middleware, route handler, or downstream system may modify any field of the identity object after establishment. Specifically:

- `trust_level` may not be escalated by downstream code; escalation requires a new request from a higher-trust identity or an explicit Authority Grant (Section 9)
- `verification_status` may not be upgraded downstream; UNVERIFIED remains UNVERIFIED for the lifetime of the request
- `identity_type`, `credential_type`, and `identity_id` are immutable for the request lifetime

An attempt to mutate an established identity object must be treated as a constitutional violation and must produce a Governance Record recording the attempt.

### 3.3 The DEGRADED Verification Status

`verification_status: DEGRADED` applies when the credential type was recognised and would normally produce a verified identity, but the verification service was transiently unavailable. DEGRADED is not used for invalid credentials; invalid credentials always produce ANONYMOUS.

A DEGRADED identity carries the trust level of a successful verification of the same credential type, subject to the following constraints:
- May not perform GOVERN, ADMIT, DEPRECATE, or REMOVE operations
- Must produce a Governance Record on every operation noting the degraded state
- Must not access endpoints whose audit obligation is FAIL-CLOSED

---

## Section 4 — Identity Types

The APEX Civilisation recognises six identity types, each mapping to entity types defined in ARCH-01 and carrying a defined trust level.

### 4.1 FOUNDER

The Founder is the originating sovereign authority of the APEX Civilisation. Exactly one Founder identity exists. The Founder identity is IMMUTABLE — it may not be transferred, delegated, deprecated, or removed.

- **Entity type:** ET-GOV-001 (Founder) — ARCH-01
- **Trust level:** SOVEREIGN (6)
- **Credential type:** FOUNDER_TOKEN (dashboard session)
- **Verification method:** Dashboard authentication with timing-safe comparison (INV-A5)
- **Constitutional status:** The Founder identity is the root of all authority. It is the only identity that may perform SOVEREIGN-level operations.

### 4.2 COUNCIL_MEMBER

Council Members are the Executive governance layer: CLO, CRO, CHO, CTO, COO, CMO (six members confirmed in Phase 2 audit). Council Members act through system-mediated invocation, not through direct request authentication.

- **Entity type:** ET-GOV-002 (Council Member) — ARCH-01
- **Trust level:** EXECUTIVE (5)
- **Credential type:** COUNCIL_KEY (internal system assertion)
- **Verification method:** Internal process assertion by the civilisation runtime; not an external credential
- **Constraint:** COUNCIL_MEMBER identity may only be asserted by the civilisation runtime (ET-SVC-001) or the executive council subsystem. No external HTTP request may claim COUNCIL_MEMBER identity.

### 4.3 MINISTRY

Ministries are the Operational governance layer: governed organisational units performing operations within their designated domain.

- **Entity type:** ET-GOV-003 (Ministry) — ARCH-01
- **Trust level:** OPERATIONAL (4)
- **Credential type:** APP_KEY (`X-App-Key` header)
- **Verification method:** Timing-safe string comparison against the registered APP_KEY value (INV-A5)
- **Scope:** Ministry identity is domain-scoped. Cross-domain operations require an explicit Authority Grant (ET-IDN-004).

### 4.4 AGENT

Agent identity represents an executing agent task, scoped to a single task execution. It is established when the task begins and invalidated when the task reaches a terminal lifecycle state.

- **Entity type:** ET-EXE-001 (Agent) — ARCH-01
- **Trust level:** TASK (3)
- **Credential type:** AGENT_TOKEN (internal task scope token)
- **Verification method:** Active task record lookup in the task registry; the AGENT_TOKEN references an active, non-terminal task record
- **Lifetime:** An AGENT_TOKEN referencing a task in COMPLETED, FAILED, CANCELLED, or FORCE_TERMINATED state is invalid and must be rejected.
- **Scope:** Agent identity is task-scoped. An Agent may write only to entities within the scope of its task record.

### 4.5 SYSTEM

System identity represents internal APEX processes — cron jobs, background workers, internal service-to-service calls — that are not acting on behalf of a user or agent task.

- **Entity type:** ET-SVC-001 (Service) — ARCH-01
- **Trust level:** SYSTEM (2)
- **Credential type:** INTERNAL (process-internal call; no external credential)
- **Verification method:** Call-origin verification; a SYSTEM identity is established only for calls that originate within the APEX process boundary
- **Constraint:** SYSTEM identity may read governed data and write audit records and telemetry. It may not perform GOVERN, ADMIT, DEPRECATE, or REMOVE operations.

### 4.6 ANONYMOUS

Anonymous identity is assigned when no credential is presented, when a presented credential fails verification, or when verification cannot be completed and DEGRADED status is not appropriate.

- **Entity type:** None — ANONYMOUS does not correspond to a governed entity type
- **Trust level:** NONE (1)
- **Credential type:** NONE
- **Critical constraint:** ANONYMOUS identity must be structurally distinguishable from any VERIFIED identity at every downstream point of use. The current implementation's pattern of producing an anonymous identity object that passes through to route handlers (ET-IDN-001, ET-IDN-005) is a constitutional violation. This specification requires structural distinction — not convention.

---

## Section 5 — Trust Levels

### 5.1 Trust Level Table

| Name | Ordinal | Identity Type | Description |
|---|---|---|---|
| SOVEREIGN | 6 | FOUNDER | Unconditional authority; root of all governance in the Civilisation |
| EXECUTIVE | 5 | COUNCIL_MEMBER | Governance authority; admission, approval, lifecycle governance, override |
| OPERATIONAL | 4 | MINISTRY | Operational authority; governed execution within domain scope |
| TASK | 3 | AGENT | Task-scoped execution; write only within task record scope |
| SYSTEM | 2 | Internal processes | Read governed data; write audit records and telemetry only |
| NONE | 1 | ANONYMOUS | No authority over governed resources |

### 5.2 Trust Level Assignment

Trust levels are assigned by the identity resolution function at request entry. Assignment is deterministic: given a credential type and verification outcome, the trust level is fixed by the mapping in Section 6.3. No downstream system may assign, re-assign, or modify a trust level after establishment.

### 5.3 Trust Level Comparison

Trust level comparisons are ordinal and strict. An operation requiring minimum trust level T is permitted if and only if the requesting identity's trust level ≥ T. No contextual justification substitutes for an insufficient trust level.

### 5.4 Trust Level Permanence

A trust level is immutable for the duration of its request. The only mechanisms by which an operation may proceed at a trust level above the requesting identity's own are:

1. **Authority Delegation** — A higher-trust identity has explicitly granted a specific authority to this identity via an Authority Grant (ET-IDN-004). The delegation is recorded and scoped (Section 9).
2. **Escalation** — The operation is held pending approval by a higher-trust identity, which approves it before the operation proceeds (Section 10).

---

## Section 6 — Credential Types and Verification Guarantees

### 6.1 Credential Type Definitions

| Credential Type | Presentation Mechanism | Description |
|---|---|---|
| FOUNDER_TOKEN | Dashboard session cookie or session token | Establishes Founder identity; highest assurance credential |
| COUNCIL_KEY | Internal system assertion by the civilisation runtime | Establishes Council Member identity for internally-invoked governance operations |
| APP_KEY | `X-App-Key` HTTP header | Establishes Ministry identity for API consumers; the primary external credential |
| AGENT_TOKEN | Internal task scope token; injected into task execution context | Establishes Agent identity for a specific, active task execution |
| INTERNAL | No external credential; call originates within the process boundary | Establishes System identity for background processes and cron jobs |
| NONE | No credential presented | Always results in ANONYMOUS identity at NONE trust level |

### 6.2 Verification Methods and Guarantees

| Credential Type | Verification Method | Guarantee Level | Failure Mode |
|---|---|---|---|
| FOUNDER_TOKEN | Timing-safe comparison against authoritative session record (INV-A5) | Strong | FAIL-CLOSED — request rejected |
| COUNCIL_KEY | Internal assertion with process-boundary check | Medium — trusted internal process | FAIL-CLOSED — operation does not proceed if assertion fails |
| APP_KEY | Timing-safe comparison against registered key (INV-A5) | Strong | FAIL-CLOSED — request rejected |
| AGENT_TOKEN | Active task record lookup in task registry | Medium — verified against live task state | FAIL-CLOSED — invalid or terminal token is rejected |
| INTERNAL | Call-origin verification against process boundary | Structural | FAIL-CLOSED — external process presenting INTERNAL credential is rejected |
| NONE | No verification | None | Not applicable |

### 6.3 Credential Type to Trust Level Mapping

| Credential Type | Verification Outcome | Assigned Trust Level | Verification Status |
|---|---|---|---|
| FOUNDER_TOKEN | Verified | SOVEREIGN (6) | VERIFIED |
| FOUNDER_TOKEN | Verification failed | NONE (1) | UNVERIFIED |
| FOUNDER_TOKEN | Verification service transiently unavailable | SOVEREIGN (6) with constraints | DEGRADED |
| COUNCIL_KEY | Asserted by runtime | EXECUTIVE (5) | VERIFIED |
| COUNCIL_KEY | Assertion fails | NONE (1) | UNVERIFIED |
| APP_KEY | Verified | OPERATIONAL (4) | VERIFIED |
| APP_KEY | Verification failed | NONE (1) | UNVERIFIED |
| APP_KEY | Verification service transiently unavailable | OPERATIONAL (4) with constraints | DEGRADED |
| AGENT_TOKEN | Task record found and ACTIVE | TASK (3) | VERIFIED |
| AGENT_TOKEN | Task record not found or terminal state | NONE (1) | UNVERIFIED |
| INTERNAL | Origin within process boundary | SYSTEM (2) | VERIFIED |
| INTERNAL | Origin unverifiable | NONE (1) | UNVERIFIED |
| NONE | N/A | NONE (1) | UNVERIFIED |

### 6.4 BYPASS_DASHBOARD_AUTH

`BYPASS_DASHBOARD_AUTH` is an environment variable that, when set to `true`, causes dashboard requests to be granted FOUNDER-level access without credential verification. This is constitutional defect C10 documented in ARCH-01.

The intended specification, superseding the current implementation:

- `BYPASS_DASHBOARD_AUTH=true` is permitted only in non-production environments for development use.
- In a production environment, `BYPASS_DASHBOARD_AUTH` must be unset or explicitly `false`.
- Any request processed with `BYPASS_DASHBOARD_AUTH=true` active in any environment must produce a Governance Record noting: the bypass was active, the endpoint reached, and the timestamp.
- The gateway layer (ARCH-14) must enforce the production prohibition; an environment check must block this bypass before the identity establishment step runs.

This constraint is stated as an architectural invariant in Section 12 (INV-I7).

---

## Section 7 — Authority Matrix

The authority matrix defines what each trust level may do by operation class. All enforcement mechanisms — ARCH-06 trust boundaries, ARCH-09 capability registry entries, and the ARCH-14 runtime pipeline — derive their rules from this matrix.

### 7.1 Operation Classes

| Operation Class | Description |
|---|---|
| READ_PUBLIC | Read data from explicitly public, ungoverned endpoints |
| READ_GOVERNED | Read governed entity instances, registry entries, and operational data |
| READ_AUDIT | Read Governance Records, Audit Records, and Admission Records |
| WRITE_OPERATIONAL | Create or update operational entity instances |
| WRITE_GOVERNANCE | Write Governance Records and Audit Records |
| EXECUTE_CAPABILITY | Invoke a registered capability (ARCH-09) |
| GOVERN_LIFECYCLE | Perform lifecycle state transitions on governed entities |
| PROPOSE_REGISTRY | Submit a registry entry proposal (ARCH-03 admission lifecycle) |
| ADMIT_REGISTRY | Approve registry entry admission for a standard registry |
| ADMIT_CORE | Approve registry entry admission for a Core Registry or IMMUTABLE entry |
| DEPRECATE_EVOLVABLE | Deprecate an EVOLVABLE registry entry |
| DEPRECATE_CORE | Deprecate a Core Registry entry (requires prior SOVEREIGN reclassification) |
| REMOVE | Remove a registry entry (permanently; entry retained with REMOVED status) |
| OVERRIDE_CONSTITUTIONAL | Override a constitutional gate or bypass a FAIL-CLOSED mechanism |

### 7.2 Authority Matrix

| Operation Class | SOVEREIGN (6) | EXECUTIVE (5) | OPERATIONAL (4) | TASK (3) | SYSTEM (2) | NONE (1) |
|---|---|---|---|---|---|---|
| READ_PUBLIC | YES | YES | YES | YES | YES | YES |
| READ_GOVERNED | YES | YES | YES | YES | YES | NO |
| READ_AUDIT | YES | YES | NO | NO | NO | NO |
| WRITE_OPERATIONAL | YES | YES | YES | Scoped† | NO | NO |
| WRITE_GOVERNANCE | YES | YES | NO | NO | YES‡ | NO |
| EXECUTE_CAPABILITY | YES | YES | YES | YES (task scope) | NO | NO |
| GOVERN_LIFECYCLE | YES | YES | NO | NO | NO | NO |
| PROPOSE_REGISTRY | YES | YES | YES | NO | NO | NO |
| ADMIT_REGISTRY | YES | YES | NO | NO | NO | NO |
| ADMIT_CORE | YES | NO | NO | NO | NO | NO |
| DEPRECATE_EVOLVABLE | YES | YES | NO | NO | NO | NO |
| DEPRECATE_CORE | YES | NO | NO | NO | NO | NO |
| REMOVE | YES | NO | NO | NO | NO | NO |
| OVERRIDE_CONSTITUTIONAL | YES | NO | NO | NO | NO | NO |

† **Scoped TASK(3) WRITE_OPERATIONAL:** An Agent may write operational data only to entity instances within the scope of its task record. Cross-task or cross-scope writes require OPERATIONAL(4) minimum.

‡ **SYSTEM(2) WRITE_GOVERNANCE:** System identity may write Audit Records and telemetry records as part of background process audit obligations. It may not write Admission Records, lifecycle Governance Records, or any record that triggers a state transition in a governed entity.

### 7.3 Ownership Modifier

The authority matrix defines baseline authority by trust level. An identity that is the registered owner of a specific entity instance receives the following additional authority over that instance, beyond the matrix baseline:

- WRITE_OPERATIONAL on owned entity instances — granted regardless of base trust level, subject to a minimum of TASK(3)
- GOVERN_LIFECYCLE on owned entity instances — granted up to and including transition to DEPRECATED; transition to REMOVED remains SOVEREIGN(6) only

Ownership does not expand an identity's authority over entities it does not own, and it does not grant any authority above its trust level in other operation classes.

---

## Section 8 — Identity Establishment Protocol

### 8.1 Protocol Definition

The identity establishment protocol is the sequence of steps executed once per inbound request, at the earliest possible position in the request pipeline (the exact position is specified in ARCH-14). The protocol produces exactly one of the following outcomes:

- A **verified** identity object (verification_status: VERIFIED) at the appropriate trust level
- A **degraded** identity object (verification_status: DEGRADED) with DEGRADED constraints applied
- An **anonymous** identity object (trust_level: NONE, verification_status: UNVERIFIED)
- A **rejection** — the request is terminated before reaching any route handler

### 8.2 Protocol Steps

1. **Extract credential** — Identify the credential type from request headers, session state, or call context. If no credential is recognisable, proceed to step 5 with credential_type: NONE.

2. **Validate credential type** — Confirm the credential type is recognised. An unrecognised credential type is treated as NONE.

3. **Verify credential** — Apply the verification method for the credential type per Section 6.2. All string-secret credential comparisons use timing-safe comparison (INV-A5, INV-I5).

4. **Assign trust level** — Using the mapping in Section 6.3, assign the trust level corresponding to the verification outcome.

5. **Construct identity object** — Produce the canonical identity object per Section 3.1. Set `established_at` to the current timestamp. Assign a stable `identity_id` consistent with the credential — the same valid credential always produces the same `identity_id`.

6. **Attach to request** — The identity object is attached to the request context (`req.identity`) as an immutable property. No subsequent step in the pipeline may replace or modify it.

### 8.3 Failure Mode Requirement: FAIL-CLOSED

The failure mode for identity establishment is **FAIL-CLOSED** for all endpoints that require trust level OPERATIONAL(4) or above.

If a credential is presented but verification fails for any reason other than a transient service outage, the request must be **rejected at the identity establishment step**. The request must not proceed to a route handler with ANONYMOUS identity.

This resolves defects ET-IDN-001 and ET-IDN-005 documented in ARCH-01. The current `resolveIdentity` implementation is FAIL-SOFT — it produces an anonymous identity on verification failure and passes it downstream, making anonymous requests indistinguishable from verified requests at the handler level. This is a constitutional defect. Phase 3 implementation must replace this with FAIL-CLOSED behaviour for all protected endpoints.

### 8.4 What Must Never Happen

The following are constitutional violations of the identity establishment protocol:

- Passing a request to a governed endpoint with `verification_status: UNVERIFIED` and `trust_level > 1`
- Allowing a request with ANONYMOUS identity to reach a route handler that requires `trust_level ≥ OPERATIONAL(4)`
- Modifying the `trust_level` field of the established identity object at any downstream step
- Inferring elevated trust from request body content, URL parameters, or assertion in request headers without repeating the formal verification protocol

---

## Section 9 — Authority Delegation

### 9.1 Definition

Authority delegation is the explicit, recorded grant of a specific authority by a higher-trust identity to a lower-trust identity for a defined, scoped purpose. Delegation does not transfer the delegating identity's trust level — it grants a named permission within a bounded scope.

Delegations are governed entities of type ET-IDN-004 (Authority Grant, ARCH-01). The Authority Grant entity type is defined in ARCH-01 but is not implemented in the current codebase. This section specifies the canonical delegation model for Phase 3 implementation.

### 9.2 Authority Grant Schema

| Field | Type | Description |
|---|---|---|
| `grant_id` | UUID v4 | Unique identifier for this delegation |
| `granted_by` | identity_ref | Identity making the delegation |
| `granted_to` | identity_ref | Identity receiving the delegated authority |
| `operation_class` | enum | The specific operation class being delegated (Section 7.1) |
| `entity_scope` | string or null | If scope-limited: entity type or entity ID scope; null for full operation class delegation |
| `valid_from` | timestamptz | When the delegation becomes effective |
| `valid_until` | timestamptz or null | When the delegation expires; null means indefinite (not recommended) |
| `governance_record_id` | UUID v4 ref | Governance Record produced at delegation creation |
| `revoked_at` | timestamptz or null | If revoked: timestamp of revocation |
| `revoked_by` | identity_ref or null | If revoked: identity that revoked the grant |

### 9.3 Delegation Rules

- An identity may only delegate operation classes it holds per the authority matrix.
- EXECUTIVE(5) may delegate to OPERATIONAL(4) identities only.
- OPERATIONAL(4) may delegate to TASK(3) identities only, and only within their domain scope.
- TASK(3) and below may not delegate.
- No identity may delegate more authority than it holds.
- All delegations require a Governance Record at creation, written FAIL-CLOSED.
- Delegation revocation requires a Governance Record. Revocation may be performed by the granting identity or by any identity with higher trust.

### 9.4 What Cannot Be Delegated

- SOVEREIGN trust level itself — trust levels are not transferable
- ADMIT_CORE — admission of IMMUTABLE Core Registry entries is SOVEREIGN-only and non-delegable
- REMOVE — registry entry removal is SOVEREIGN-only and non-delegable
- OVERRIDE_CONSTITUTIONAL — constitutional gate override is SOVEREIGN-only and non-delegable
- Ownership of an entity — ownership is an entity attribute (ARCH-01), not a delegable authority

---

## Section 10 — Escalation Rules

### 10.1 Definition

Escalation is the process by which an operation the requesting identity does not have sufficient trust to perform is held pending approval by a higher-trust identity before proceeding. Escalation is per-operation and requires an explicit approval event. It is distinct from delegation, which is persistent and pre-granted.

### 10.2 Mandatory Escalation Conditions

| Condition | Escalation Target | Authority |
|---|---|---|
| Operation class requires EXECUTIVE(5); requesting identity is OPERATIONAL(4) | Any COUNCIL_MEMBER | Section 7.2 |
| Operation class requires SOVEREIGN(6); requesting identity is below SOVEREIGN | FOUNDER | Section 7.2 |
| Agent task write would exceed the entity scope defined in its task record | OPERATIONAL(4) minimum | Section 4.4 |
| Agent task capability invocation would exceed its budget allocation | OPERATIONAL(4) minimum | ARCH-12 (forward reference) |
| `AUTONOMY_LEVEL=3` is active and the operation has constitutional impact | EXECUTIVE(5) minimum | AUTONOMY_LEVEL does not override constitutional gates |

### 10.3 Escalation Protocol

An escalation produces the following sequence:

1. The requesting operation is suspended; it does not proceed.
2. A Governance Record is produced noting the escalation request, requesting identity, operation class, and reason.
3. The escalation target identity is notified.
4. **On approval:** A Governance Record records the approving identity and the operation proceeds.
5. **On rejection:** A Governance Record records the rejection; the operation terminates with a structured rejection response.
6. **On timeout:** The operation is rejected. Timeout values are specified in ARCH-12 for agent task escalations and ARCH-14 for runtime pipeline escalations.

---

## Section 11 — Identity Loss and Recovery

### 11.1 Identity Loss Conditions

| Condition | Effect | In-Flight Operations |
|---|---|---|
| Session TTL expiry | Session identity invalidated | In-flight operations that began under a valid session complete normally |
| Credential revocation (APP_KEY, FOUNDER_TOKEN) | Identity invalidated immediately | In-flight operations using the revoked credential must be terminated |
| Task completion or terminal state | AGENT_TOKEN invalidated | No new operations may begin; in-flight writes must be completed or rolled back |
| Process restart | SYSTEM identity invalidated | Background processes re-establish SYSTEM identity on restart |

### 11.2 Recovery Protocol

| Loss Condition | Recovery Path |
|---|---|
| Session expiry | Re-authenticate using the appropriate credential type; new session_id assigned |
| Credential revocation | Credential re-issued by SOVEREIGN or EXECUTIVE authority; new `identity_id` assigned |
| Task completion | No recovery; a new task creates a new AGENT_TOKEN |
| Process restart | SYSTEM identity automatically re-established when the process starts |

Prior audit history is always preserved and associated with the prior `identity_id`. Recovery creates a new identity; it does not restore the old one.

---

## Section 12 — Identity Invariants

**INV-I1 — Identity Is Established Once Per Request**
Identity is established at the start of request processing and is immutable for the request lifetime. No middleware, handler, or subsystem may replace, re-establish, or modify the identity object after it is attached to the request context.

**INV-I2 — Anonymous Is Structurally Distinguishable**
An ANONYMOUS identity must be structurally distinguishable from any VERIFIED identity at every downstream check. Downstream code must check `trust_level` and `verification_status` explicitly. Treating an object whose `trust_level` is 1 and `verification_status` is UNVERIFIED as equivalent to a verified identity is a constitutional violation.

**INV-I3 — FAIL-CLOSED on Verification Failure**
A credential verification failure for any endpoint requiring trust level ≥ OPERATIONAL(4) must result in request rejection, not fallback to ANONYMOUS identity. The only exception is a transient service outage that produces DEGRADED status with its associated constraints. Passing a failed verification through to a governed handler is the constitutional defect documented as ET-IDN-001 and ET-IDN-005 in ARCH-01.

**INV-I4 — Trust Level Is Immutable Within a Request**
A trust level assigned to a request may not be escalated by application code during request processing. The only legitimate paths to operating above one's trust level are Authority Delegation (Section 9) and Escalation (Section 10), both of which require explicit, recorded governance actions.

**INV-I5 — Timing-Safe Comparison for All String Credentials**
All credential types that involve comparison of secret strings (APP_KEY, FOUNDER_TOKEN, and any future string-based credential) must use timing-safe comparison. Direct string equality operators for credential comparison are a constitutional violation. Compliance with INV-A5 from constitution-v1.md is mandatory.

**INV-I6 — No Self-Issued Trust**
No identity may elevate its own trust level. An identity that claims trust level T must be able to produce the credential that the identity establishment protocol maps to trust level T. Self-assertion of trust level without credential verification is a constitutional violation.

**INV-I7 — BYPASS_DASHBOARD_AUTH Is Production-Prohibited**
In production environments, `BYPASS_DASHBOARD_AUTH=true` is constitutionally prohibited. Any gateway that honours this bypass in a production context is non-compliant with this specification. If the bypass is active in any environment, every request processed under it must produce a Governance Record.

**INV-I8 — Council Member Identity Is Internally Asserted Only**
No external HTTP request may claim COUNCIL_MEMBER identity or present a COUNCIL_KEY credential. An external request presenting a COUNCIL_KEY must be rejected before the identity establishment protocol completes.

---

## Section 13 — Known Implementation State

The following defects are documented in ARCH-01 and are addressed by this specification:

| Defect Code | Description | This Specification's Resolution |
|---|---|---|
| ET-IDN-001 | `resolveIdentity` FAIL-SOFT: anonymous identity is indistinguishable from verified downstream | INV-I2, INV-I3: FAIL-CLOSED mandatory; anonymous must be structurally distinct; Section 8.3 |
| ET-IDN-005 | `req.identity` attached as FAIL-SOFT: verification failure does not reject the request | Section 8.3: verification failure on protected endpoints must reject the request |
| C10 | `BYPASS_DASHBOARD_AUTH`: dashboard auth bypassable by env var in any environment | INV-I7: production-prohibited; must produce Governance Record if active; Section 6.4 |
| ET-IDN-004 | Authority Grant entity type exists in ARCH-01 but not implemented; roles assigned implicitly | Section 9: Authority Grant schema and delegation rules specified; Phase 3 implementation obligation |
| C02 | `checkGovernance` is structurally UNCONDITIONALLY_OPEN | ARCH-14 will specify constitutional gate as FAIL-CLOSED; this specification defines the authority check the gate enforces |
| UN01 | RLS status unknown for identity-bearing tables | ARCH-15 will specify RLS requirements; identity-bearing tables (`sessions`, identity-related records) require RLS |

### 13.1 Phase 3 Implementation Obligations

1. `resolveIdentity` must be reimplemented as FAIL-CLOSED for all endpoints requiring trust level ≥ OPERATIONAL(4).
2. `req.identity` must carry `trust_level`, `verification_status`, and `identity_type`; route handlers must check `trust_level` before proceeding.
3. `BYPASS_DASHBOARD_AUTH` must be blocked at the gateway layer in production (enforced in ARCH-14).
4. Authority Grant (ET-IDN-004) must be implemented as a database-backed governed entity with Governance Records at creation and revocation.
5. All string credential comparisons must use `timingSafeEqual`; this is already enforced for APP_KEY and WebSocket (INV-A4, INV-A5); the requirement extends to all new credential types.

---

## Section 14 — Non-Examples

The following do not constitute identity in the sense of this specification:

- **An IP address** — a network property usable as a rate-limiting signal, not an identity claim
- **A User-Agent header** — an unverified self-declaration; not a credential type
- **The absence of any credential** — not an identity; produces ANONYMOUS by default
- **A session ID without a resolvable backing session record** — unverified; session record lookup is the verification step; failure produces ANONYMOUS
- **An agent's `role` field or task description** — self-declared task properties; Agent identity is established by AGENT_TOKEN verification against an active task record, not by role assertion

---

## Section 15 — Downstream Dependencies

| Document | How It Depends on ARCH-04 |
|---|---|
| ARCH-05: Source of Truth Registry | Write authority to authoritative sources requires OPERATIONAL(4) minimum; defined here |
| ARCH-06: Trust Boundary Specification | Each boundary uses the trust level definitions and verification requirements from this document |
| ARCH-07: Failure Mode Policy | Identity-related failure modes (INV-I3) inform the failure mode taxonomy |
| ARCH-08: Auditability Specification | `actor_identity` in audit records references the identity schema defined in Section 3.1 |
| ARCH-09: Capability Registry | `required_authority` field in capability entries references operation classes from Section 7.1 |
| ARCH-10: Memory Architecture | Write authority to memory backends references OPERATIONAL(4) and SOVEREIGN(6) definitions |
| ARCH-11: Event Architecture | `emitted_by` in event envelope references identity schema; emission authority references trust levels |
| ARCH-12: Agent Lifecycle Model | Agent identity lifecycle; escalation rules for AUTONOMY_LEVEL interaction |
| ARCH-13: Knowledge Architecture | Write authority per knowledge store references trust level definitions |
| ARCH-14: Runtime Execution Model | Identity establishment protocol is a mandatory pipeline phase; constitutional gate uses authority matrix |
| ARCH-15: Database Schema Standard | Identity-bearing tables require RLS; service role key access restricted to SYSTEM identity contexts |

---

## Section 16 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification | SOVEREIGN |

---

*End of ARCH-04 — Identity and Authority Specification*
