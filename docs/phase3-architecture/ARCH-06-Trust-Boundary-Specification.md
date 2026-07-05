# APEX CIVILISATION — ARCH-06: Trust Boundary Specification

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Specification
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00 (Architectural Meta-Model), ARCH-01 (Entity Taxonomy), ARCH-04 (Identity and Authority Specification)
**Forward references:** ARCH-07 (Failure Mode Policy) — failure mode names FAIL-CLOSED, FAIL-OPEN, FAIL-SOFT, FAIL-SILENT used in this document are defined in ARCH-07; used here as forward references only
**Depended on by:** ARCH-07, ARCH-14

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document formally specifies each trust boundary in the APEX Civilisation: the structural definition of the boundary, the evidence required to cross from lower to higher trust, the permitted failure mode when crossing evidence cannot be verified, and the governance records produced when a boundary is crossed or a crossing attempt is rejected.

This specification declares, for each of the eight canonical trust boundaries, whether its failure mode is FAIL-CLOSED (the constitutional default) and whether the current implementation is compliant with that declaration. Where deviations exist, they are classified as defects. ARCH-07 (Failure Mode Policy) will use these classifications as inputs for its formal taxonomy.

### 1.2 Scope

This document covers:

- The definition of a trust boundary as an architectural primitive
- Eight canonical trust boundaries in the APEX Civilisation
- For each boundary: structural definition, trust levels at each side, crossing evidence required, permitted failure mode, governance records produced, known implementation state, and constitutional significance
- Trust boundary invariants that all implementations must satisfy
- Phase 3 remediation priorities for non-compliant boundaries

This document does not cover:

- Failure mode definitions and the full failure mode taxonomy — ARCH-07
- The exact pipeline position where each boundary check executes — ARCH-14
- Credential verification mechanisms and trust level definitions — ARCH-04
- Identity establishment protocol — ARCH-04 Section 8

### 1.3 Note on ARCH-07 Forward References

This document uses the failure mode names FAIL-CLOSED, FAIL-OPEN, FAIL-SOFT, and FAIL-SILENT. These are forward references to ARCH-07's failure mode taxonomy. Their meanings in this document are:

- **FAIL-CLOSED** — the boundary check fails toward rejection; the operation does not proceed when evidence cannot be verified
- **FAIL-OPEN** — the boundary check fails toward permission; the operation proceeds when evidence cannot be verified
- **FAIL-SOFT** — the boundary check produces a degraded outcome (e.g., anonymous identity) rather than an error; the operation proceeds in a weakened state that may be indistinguishable from a permitted state
- **FAIL-SILENT** — the boundary check fails without producing any observable signal or governance record

---

## Section 2 — Trust Boundary as an Architectural Primitive

### 2.1 Definition

A **trust boundary** is a point in the APEX architecture where the trust level of an operation's principal must be verified before the operation proceeds, where the trust level changes, or where the consequences of an incorrect trust determination have constitutional significance.

A trust boundary is not merely an application-layer authorization check. It is a governance event. Every trust boundary crossing — successful or rejected — is a traceable fact about the Civilisation's operation. The distinction is:

| Property | Application Auth Check | Trust Boundary |
|---|---|---|
| Existence | Implementation decision | Architectural mandate |
| Bypass | Implementation-defined | Constitutional violation |
| Audit trail | Optional | Governance Record required |
| Failure mode | Implementation-defined | Declared in advance; constitutional |
| Position in pipeline | Developer-placed | Specified in ARCH-14 |

### 2.2 The Constitutional Default

The APEX Architectural Constitution (Art. 2) establishes FAIL-CLOSED as the default failure mode for trust boundaries. Any boundary that fails toward permissiveness requires explicit constitutional justification recorded in ARCH-07. The trust boundary specification declared in this document takes FAIL-CLOSED as the intended mode for all eight boundaries. No boundary in the APEX Civilisation is intentionally FAIL-OPEN. Where the current implementation deviates, the deviation is a defect.

### 2.3 Governance Record Obligation

Every trust boundary crossing must produce a Governance Record (ET-GOV-001, ARCH-01) before the crossing outcome takes effect. This means:

- On a successful crossing: a Governance Record is produced recording the identity, the boundary crossed, and the timestamp — before the operation handler is invoked
- On a rejected crossing: a Governance Record is produced recording the failure reason and the identity that attempted the crossing — before the rejection response is sent

A boundary crossing for which no Governance Record can be produced must be treated as a FAIL-CLOSED event: the crossing is rejected. The inability to produce a governance record is itself a governance failure.

---

## Section 3 — Eight Trust Boundary Definitions

### TB-001 — External API Boundary

**Definition:** The outermost boundary of the APEX Civilisation. Every inbound HTTP request from the public internet crosses this boundary. It is the point at which a request transitions from untrusted external origin (NONE trust) to a trust-levelled internal operation. This boundary is enforced by the identity establishment protocol (ARCH-04 Section 8).

| Property | Value |
|---|---|
| Entry Trust Level | NONE (1) — all external HTTP requests arrive at NONE trust |
| Required Exit Trust Level | OPERATIONAL (4) minimum for governed endpoints; NONE (1) permitted for explicitly public, ungoverned endpoints |
| Crossing Evidence Required | Valid `APP_KEY` in `X-App-Key` header, verified by timing-safe comparison (ARCH-04 INV-I5); or FOUNDER_TOKEN for dashboard-tier endpoints (see TB-002) |
| Permitted Failure Mode | FAIL-CLOSED for all governed endpoints — credential verification failure must produce request rejection; NONE trust on public endpoints is the designed state, not a failure |
| Governance Record on Successful Crossing | Records: identity_id, trust_level granted, endpoint path, credential_type verified, timestamp |
| Governance Record on Rejected Crossing | Records: credential type presented, failure reason, endpoint path, timestamp; produced even for rejected requests |

**Implementation State:** DEFECTIVE. The `resolveIdentity` function is FAIL-SOFT (constitutional defect ET-IDN-001, ARCH-01). A failed `APP_KEY` verification produces an ANONYMOUS identity object that is passed through to route handlers. Route handlers cannot structurally distinguish an ANONYMOUS identity from a VERIFIED identity — both arrive as populated identity objects. The boundary exists in intent but its failure mode is FAIL-SOFT, not FAIL-CLOSED.

**Constitutional Significance:** This is the primary perimeter boundary. Its failure mode determines whether unauthenticated requests can reach every governed handler in the Civilisation. A FAIL-SOFT implementation means the external API boundary provides no structural protection — only handlers that explicitly check `trust_level` are protected, and that check depends on developer discipline rather than architecture.

---

### TB-002 — Dashboard Boundary

**Definition:** The boundary between unauthenticated browser access and Founder-level dashboard access. Crossed when the Founder accesses `dashboard.html` and presents the FOUNDER_TOKEN credential. This is the highest-trust boundary in the Civilisation, granting SOVEREIGN (6) access.

| Property | Value |
|---|---|
| Entry Trust Level | NONE (1) |
| Required Exit Trust Level | SOVEREIGN (6) |
| Crossing Evidence Required | Valid FOUNDER_TOKEN, verified by timing-safe comparison against the authoritative session record (ARCH-05 SOT-004); session must be ACTIVE in the session records table |
| Permitted Failure Mode | FAIL-CLOSED — a failed FOUNDER_TOKEN verification must reject the request; no SOVEREIGN-level session may be established without verified credentials |
| Governance Record on Successful Crossing | Records: Founder identity_id, SOVEREIGN trust level granted, session_id, established_at |
| Governance Record on Rejected Crossing | Records: credential type presented (FOUNDER_TOKEN), failure reason, timestamp |

**Implementation State:** DEFECTIVE. `BYPASS_DASHBOARD_AUTH=true` environment variable bypasses this boundary entirely, granting SOVEREIGN access without credential verification (constitutional defect C10, ARCH-01; ARCH-04 INV-I7). The bypass is honoured in any environment, including production. The boundary implementation exists but is bypassable by any party with access to the Render environment configuration.

**Constitutional Significance:** This is the SOVEREIGN access boundary. A breach grants unconditional authority over the Civilisation, including REMOVE, OVERRIDE_CONSTITUTIONAL, and ADMIT_CORE operations (ARCH-04 Section 7.2). Its failure mode must be FAIL-CLOSED without exception, in every environment. The current bypass mechanism is the most constitutionally significant single defect in the identity architecture.

---

### TB-003 — WebSocket Boundary

**Definition:** The boundary crossed when a client establishes a WebSocket connection to an APEX WebSocket handler (`/ws/*` endpoints). WebSocket connections are long-lived and high-frequency; trust is established once at connection time and is not re-verified per message.

| Property | Value |
|---|---|
| Entry Trust Level | NONE (1) |
| Required Exit Trust Level | OPERATIONAL (4) minimum |
| Crossing Evidence Required | Valid credential in WebSocket handshake headers or initial connection message, verified by timing-safe comparison (INV-A4 enforced, ARCH-01 ET-PHY-011) |
| Permitted Failure Mode | FAIL-CLOSED — a WebSocket connection that cannot be verified must be rejected at handshake; the connection must not be established at a degraded trust level |
| Governance Record on Successful Crossing | Records: identity_id, trust level, WebSocket handler path, connection_id, established_at |
| Governance Record on Rejected Crossing | Records: failure reason, handler path, timestamp |

**Implementation State:** PARTIALLY CONFORMANT. The core credential check uses `timingSafeEqual` (INV-A4 enforced). The 60-second keepalive and 64KB chunk limits are implemented (ET-PHY-011, ARCH-01). Governance Record production at connection establishment is not confirmed as fully implemented.

**Constitutional Significance:** WebSocket connections carry all real-time dashboard updates, agent status events, and voice session audio. An unauthenticated WebSocket connection can receive live Civilisation state continuously. The boundary is security-critical; its partial conformance means the governance trail for connection establishment is incomplete.

---

### TB-004 — Constitutional Gate

**Definition:** The boundary every capability invocation must cross before execution. The Constitutional Gate verifies: (1) the Civilisation governance score meets the minimum operational threshold; (2) the operation type is constitutionally permitted under the active AUTONOMY_LEVEL; (3) the requesting identity holds the authority to invoke the capability per the authority matrix (ARCH-04 Section 7.2).

| Property | Value |
|---|---|
| Entry Trust Level | OPERATIONAL (4) — only requests that have crossed TB-001 reach this boundary |
| Required Exit Trust Level | Constitutionally permitted — trust level is already established; this boundary verifies authority to act, not identity |
| Crossing Evidence Required | (1) Governance score ≥ 60/100 (constitutional minimum); (2) Operation type in the permitted set for the current AUTONOMY_LEVEL; (3) Requesting identity trust_level ≥ required authority for the operation class |
| Permitted Failure Mode | FAIL-CLOSED — if governance score cannot be retrieved, the operation is rejected; if score is below threshold, the operation is rejected; if authority cannot be verified, the operation is rejected |
| Governance Record on Successful Crossing | Records: operation type, requesting identity, governance score at time of check, AUTONOMY_LEVEL active, timestamp |
| Governance Record on Rejected Crossing | Records: rejection reason (score below threshold / operation not permitted / authority insufficient), requesting identity, timestamp |

**Implementation State:** DEFECTIVE. The `checkGovernance()` function is structurally UNCONDITIONALLY_OPEN (constitutional defect C02, ARCH-01). The function executes but does not enforce rejection when governance checks fail. Every governed operation currently proceeds regardless of governance state. This is the most architecturally significant single defect in the APEX Civilisation.

**Constitutional Significance:** The Constitutional Gate is the last line of defence before a governed operation executes. Its purpose is to ensure the Civilisation cannot execute governed operations in an ungoverned state. Its current FAIL-OPEN implementation means the constitutional contract is structurally unenforceable: the Civilisation can and does operate in constitutionally non-compliant states without any operation being blocked. This defect affects every governed operation in the system simultaneously.

---

### TB-005 — Memory Write Boundary

**Definition:** The boundary that all memory writes must cross before reaching an authoritative memory store. Implemented by `lib/memory/gateway.js`. This boundary enforces that all memory writes pass through the unified gateway rather than reaching Supabase tables through direct client calls in application modules.

| Property | Value |
|---|---|
| Entry Trust Level | Any trust level that has already crossed TB-001 |
| Required Exit Trust Level | OPERATIONAL (4) minimum for SEMANTIC, EPISODIC, PROCEDURAL, DECISION memory; TASK (3) for WORKING memory (within agent task scope only) |
| Crossing Evidence Required | (1) Caller identity meets minimum trust level for the memory type; (2) For AGENT identity: the write target is within the agent's task scope; (3) Write payload validates against the memory type schema |
| Permitted Failure Mode | FAIL-CLOSED — a write that cannot be attributed to a verified identity at the required trust level must be rejected at the gateway; the authoritative memory store must not receive the write |
| Governance Record on Successful Crossing | Records: memory type written, actor identity, entity_id affected, timestamp; this is the audit trail record that resolves defect B1 (decisionMemoryId always null) |
| Governance Record on Rejected Crossing | Records: rejected write target, identity that attempted the write, rejection reason |

**Implementation State:** DEFECTIVE. Five or more write paths to memory tables bypass `lib/memory/gateway.js` via direct Supabase client references in application modules (constitutional defect C01, ARCH-01). The gateway module exists but is not structurally enforced — any module that holds a Supabase client reference can bypass it. Unattributed writes produced by these bypass paths cannot be traced to an identity and cannot participate in the governance evidence chain.

**Constitutional Significance:** The memory write boundary protects the integrity of the Civilisation's entire knowledge state. Every unattributed memory write is a hole in the audit trail. The volume of writes that bypass the gateway determines the fraction of the Civilisation's knowledge state that is ungoverned.

---

### TB-006 — Agent Scope Boundary

**Definition:** The boundary that enforces the scope constraint on AGENT identity (TASK trust level). An agent operating under TASK(3) trust may only write to entity instances within the scope defined in its task record. The boundary is crossed each time an agent attempts a WRITE_OPERATIONAL operation, verifying the target entity is within scope.

| Property | Value |
|---|---|
| Entry Trust Level | TASK (3) — applies to AGENT identities only |
| Required Exit Trust Level | Confirmed in-scope — trust level does not change; the boundary verifies scope, not elevation |
| Crossing Evidence Required | The target entity_id and entity_type must be within the scope definition of the agent's active task record; the AGENT_TOKEN must reference an ACTIVE (non-terminal) task |
| Permitted Failure Mode | FAIL-CLOSED — a write to an out-of-scope entity must be rejected and must trigger escalation to OPERATIONAL(4) (ARCH-04 Section 10.2) |
| Governance Record on Successful Crossing | Records: agent identity_id, task_id, entity written, scope confirmation |
| Governance Record on Rejected Crossing | Records: agent identity_id, task_id, out-of-scope target attempted, escalation triggered |

**Implementation State:** NOT ENFORCED. Agent task scope is not structurally defined or enforced in the current implementation. The task scope concept exists in architectural intent (ET-EXE-003, ARCH-01) but has no enforcement mechanism. An agent with a valid AGENT_TOKEN can currently write to any entity accessible via the API, regardless of whether that entity is related to the agent's task.

**Constitutional Significance:** The Agent Scope Boundary is the primary containment mechanism for autonomous agent execution. At AUTONOMY_LEVEL=3, agent tasks are initiated with reduced human oversight. Without scope enforcement, every agent task has a blast radius equal to the entire accessible state of the Civilisation. The absence of this boundary means that a single defective or malicious agent task could corrupt any governed entity in the system.

---

### TB-007 — Council Assertion Boundary

**Definition:** The boundary that enforces the constraint that COUNCIL_MEMBER identity (EXECUTIVE trust) may only be asserted by the civilisation runtime's internal processes — never by external requests. This boundary prevents external actors from claiming EXECUTIVE-level authority.

| Property | Value |
|---|---|
| Entry Trust Level | Any — the boundary applies to any credential presentation that claims COUNCIL_KEY type |
| Required Exit Trust Level | EXECUTIVE (5) — only if the assertion originates from within the process boundary |
| Crossing Evidence Required | The COUNCIL_KEY credential must be asserted by an internal process within the APEX process boundary (`lib/intelligence/civilization-runtime.js` or the executive council subsystem); no external HTTP request may assert COUNCIL_KEY |
| Permitted Failure Mode | FAIL-CLOSED — an external request presenting a COUNCIL_KEY credential must be rejected with no trust elevation |
| Governance Record on Successful Crossing | Records: Council Member identity asserted, asserting process, timestamp |
| Governance Record on Rejected Crossing | Records: external COUNCIL_KEY presentation attempt, origin information, timestamp |

**Implementation State:** PARTIALLY ENFORCED. Council Members are invoked through internal runtime processes and do not handle external HTTP requests directly. However, there is no explicit structural check that rejects external requests claiming COUNCIL_KEY credentials. The separation is currently enforced by architectural convention — external callers do not know the COUNCIL_KEY format — not by code.

**Constitutional Significance:** If an external actor could claim COUNCIL_MEMBER identity, they would hold EXECUTIVE(5) authority: the ability to admit registry entries, approve lifecycle transitions, govern operational decisions, and deprecate EVOLVABLE registry entries. Convention-based enforcement is insufficient for a boundary of this constitutional significance.

---

### TB-008 — Internal Process Boundary

**Definition:** The boundary governing the trust level of internal background processes — cron jobs, scheduled tasks, background workers — that execute operations within the APEX Civilisation without being initiated by an external request. These processes are assigned SYSTEM(2) trust.

| Property | Value |
|---|---|
| Entry Trust Level | Not applicable — internal processes originate internally; they do not cross from external to internal |
| Assigned Trust Level | SYSTEM (2) |
| Crossing Evidence Required | Process-origin verification — the process must be identifiable as an APEX internal process started by the Render runtime or the Civilisation cron system; an externally-triggered process must not be granted SYSTEM identity |
| Permitted Failure Mode | FAIL-CLOSED for operations exceeding SYSTEM(2) authority — a background process attempting a GOVERN, ADMIT, or REMOVE operation must be rejected; FAIL-SOFT tolerated for telemetry and audit writes (a failed telemetry write should not halt the background process, but must produce a silent-failure governance record) |
| Governance Record on Successful Crossing | Process start record noting: process type (cron / background worker), operation class, SYSTEM identity, start_timestamp; enforced by `wrapCron()` in `lib/cron-logger.js` |
| Governance Record on Rejected Crossing | Records: process identity, out-of-scope operation attempted, rejection reason |

**Implementation State:** PARTIALLY CONFORMANT. `wrapCron()` in `lib/cron-logger.js` wraps cron jobs with a `finally`-block that writes to `cron_run_log` (start and completion records confirmed). However, formal SYSTEM identity is not assigned or enforced; cron jobs inherit the Supabase service role key and have effectively unconstrained database write access, not SYSTEM(2)-constrained access. Defects UR14 and UR15 (unresolved cron schedule conflicts, ARCH-01) affect this boundary.

**Constitutional Significance:** Background processes execute the Civilisation's 8-phase civilisation loop and all cron-driven governance. An unconstrained background process can write to any table, invoke any capability, and produce no governance attribution if SYSTEM identity is not formally enforced. The `wrapCron()` wrapper provides start/end records but does not restrict the operations the cron job can perform during execution.

---

## Section 4 — Trust Boundary Summary

| ID | Name | Entry Trust | Exit Trust | Failure Mode | Status |
|---|---|---|---|---|---|
| TB-001 | External API Boundary | NONE (1) | OPERATIONAL (4) for governed | FAIL-CLOSED | DEFECTIVE (ET-IDN-001) |
| TB-002 | Dashboard Boundary | NONE (1) | SOVEREIGN (6) | FAIL-CLOSED | DEFECTIVE (C10) |
| TB-003 | WebSocket Boundary | NONE (1) | OPERATIONAL (4) | FAIL-CLOSED | PARTIALLY CONFORMANT |
| TB-004 | Constitutional Gate | OPERATIONAL (4) | Confirmed permitted | FAIL-CLOSED | DEFECTIVE (C02) |
| TB-005 | Memory Write Boundary | Any verified | OPERATIONAL (4) / TASK (3) | FAIL-CLOSED | DEFECTIVE (C01) |
| TB-006 | Agent Scope Boundary | TASK (3) | Confirmed in-scope | FAIL-CLOSED | NOT ENFORCED |
| TB-007 | Council Assertion Boundary | Any | EXECUTIVE (5) internal only | FAIL-CLOSED | PARTIALLY ENFORCED |
| TB-008 | Internal Process Boundary | Internal | SYSTEM (2) | FAIL-CLOSED (operations) | PARTIALLY CONFORMANT |

---

## Section 5 — Permitted vs Prohibited Failure Modes

All eight trust boundaries are specified with FAIL-CLOSED as their required failure mode. This is the constitutional default (Art. 2, constitution-v1.md). No boundary in the APEX Civilisation is intentionally FAIL-OPEN.

Where the current implementation deviates from FAIL-CLOSED, the deviation is a defect, not an intentional design decision. ARCH-07 (Failure Mode Policy) will formally classify each deviation as intentional or unintentional; the positions declared in this specification — all eight boundaries are FAIL-CLOSED by intent — are the inputs ARCH-07 uses for that classification.

FAIL-SOFT deviations (TB-001, TB-002 via BYPASS) are particularly dangerous because they produce no error visible to the caller. The boundary appears to function — it accepts the request and returns a response — while the protection the boundary was designed to provide is absent. FAIL-SOFT at a trust boundary makes the breach invisible to both the system and the operator. All FAIL-SOFT boundary implementations identified in this specification are non-intentional defects.

---

## Section 6 — Trust Boundary Invariants

**INV-TB1 — All Boundaries Are FAIL-CLOSED**
The intended failure mode of every trust boundary in the APEX Civilisation is FAIL-CLOSED. An implementation that fails a boundary check toward permissiveness is non-compliant with this specification unless ARCH-07 explicitly classifies the deviation as intentional with constitutional justification.

**INV-TB2 — Every Crossing Produces a Governance Record**
Every trust boundary crossing — successful or rejected — must produce a Governance Record before the outcome takes effect. A boundary crossing for which no Governance Record can be produced must be treated as a FAIL-CLOSED event: the crossing is rejected and the Governance Record failure is itself recorded.

**INV-TB3 — Boundary Bypasses Are Constitutional Violations**
No code path may bypass a trust boundary. An operation that reaches a governed handler without having crossed the appropriate boundary is a constitutional violation regardless of whether the operation would have been permitted at the boundary. The crossing itself is a governance event; its bypass removes all traceability.

**INV-TB4 — No Self-Elevation at a Boundary**
An operation may not claim a higher trust level than the identity that initiated it. Boundary crossing verifies an identity's trust level — it does not elevate it. The only mechanisms for operating above one's trust level are Authority Delegation (ARCH-04 Section 9) and Escalation (ARCH-04 Section 10).

**INV-TB5 — Constitutional Gate Is the Last Internal Boundary**
TB-004 (Constitutional Gate) is the final verification boundary before a governed operation executes. An operation that has passed the Constitutional Gate has been verified for identity, authority, and governance compliance. Boundaries TB-005, TB-006, and TB-007 apply within the scope of specific operation types and are not substitutes for TB-004.

**INV-TB6 — Boundary Definitions Are Immutable**
The eight trust boundaries defined in this document are architectural invariants. New capabilities, endpoints, or operation types are evaluated against existing boundary definitions. A new trust boundary requires ratification as an amendment to this specification at SOVEREIGN authority.

---

## Section 7 — Phase 3 Remediation Priorities

Ordered by constitutional significance:

1. **TB-004 (Constitutional Gate) — CRITICAL.** C02 means every governed operation in the Civilisation currently proceeds without governance verification. This is the highest-priority boundary fix in Phase 3: implement FAIL-CLOSED enforcement in `checkGovernance()` — rejection when score < 60 or authority insufficient.

2. **TB-001 (External API Boundary) — CRITICAL.** ET-IDN-001 means external requests reach governed handlers without verified identity. Fix: reimplement `resolveIdentity` as FAIL-CLOSED; replace the FAIL-SOFT anonymous-identity fallback with request rejection for all governed endpoints.

3. **TB-002 (Dashboard Boundary) — HIGH.** C10 allows SOVEREIGN access without credential verification. Fix: enforce `BYPASS_DASHBOARD_AUTH` prohibition in production at the gateway layer (ARCH-14); add Governance Record production whenever the bypass is active in any environment.

4. **TB-005 (Memory Write Boundary) — HIGH.** C01 means 5+ bypass paths to memory tables produce unattributed, ungoverned writes. Fix: remove all direct Supabase client write paths from memory modules; route all writes through `lib/memory/gateway.js`.

5. **TB-006 (Agent Scope Boundary) — HIGH.** No enforcement exists. Fix: define task scope in the task record schema (ARCH-12); enforce scope at the memory write gateway and at every WRITE_OPERATIONAL check for AGENT identities.

6. **TB-007 (Council Assertion Boundary) — MEDIUM.** Convention-based only. Fix: add an explicit structural check that rejects external HTTP requests presenting COUNCIL_KEY credentials before the identity establishment protocol completes.

7. **TB-008 (Internal Process Boundary) — MEDIUM.** Cron jobs have unconstrained DB access. Fix: assign formal SYSTEM identity to all cron and background processes; enforce SYSTEM(2) authority constraints via RLS (ARCH-15).

8. **TB-003 (WebSocket Boundary) — LOW.** Credential check is conformant; governance record production at connection establishment needs implementation confirmation.

---

## Section 8 — Downstream Dependencies

| Document | How It Depends on ARCH-06 |
|---|---|
| ARCH-07: Failure Mode Policy | Takes the eight boundary definitions and their declared FAIL-CLOSED intent as inputs; classifies each implementation deviation as intentional or non-intentional |
| ARCH-14: Runtime Execution Model | Specifies the exact pipeline position of each boundary check; the sequence TB-001 → TB-004 maps directly onto the inbound pipeline phases |

---

## Section 9 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification — eight trust boundaries specified | SOVEREIGN |

---

*End of ARCH-06 — Trust Boundary Specification*
