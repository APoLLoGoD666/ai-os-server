# APEX CIVILISATION — ARCH-07: Failure Mode Policy

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Policy
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00 (Architectural Meta-Model), ARCH-04 (Identity and Authority Specification), ARCH-06 (Trust Boundary Specification)
**Depended on by:** ARCH-08, ARCH-09, ARCH-10, ARCH-11, ARCH-12, ARCH-14

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document establishes the canonical failure mode taxonomy for the APEX Civilisation, declares which failure modes are constitutionally permitted for each subsystem category, and formally classifies each of the 14 known implementation failure modes from the Phase 2 certification as intentional or non-intentional and constitutional or non-constitutional.

Every ARCH document that specifies a failure mode for an operation, boundary, or write path uses the taxonomy defined here. No downstream document may define failure modes independently.

### 1.2 Scope

This document covers:

- The five canonical failure modes and their precise definitions
- Constitutional rules governing failure mode selection (derived from constitution-v1.md and Scripts/CONSTITUTION.md)
- The permissibility matrix: which failure modes are permitted, tolerated, or prohibited for each subsystem category
- Classification of all 14 known implementation failure modes (B1, B4, C01–C03, C09–C10, C13, UN01–UN02, UR14–UR15, GAP-RES, GAP-EVT)
- Remediation obligations for non-constitutional failure modes
- Architectural invariants governing failure mode selection

This document does not cover:

- The implementation mechanism for enforcing FAIL-CLOSED at specific pipeline positions — ARCH-14
- The specific audit record schema produced at failure events — ARCH-08
- Trust boundary definitions — ARCH-06 (this policy governs which failure modes are permitted at those boundaries)

---

## Section 2 — Canonical Failure Mode Taxonomy

Five canonical failure modes are defined. All APEX subsystem specifications must use exactly these names. No subsystem may introduce local failure mode vocabulary.

### 2.1 FAIL-CLOSED

The operation is rejected when the required evidence cannot be verified or when the required precondition is not met. The rejection is explicit, traceable, and produces an error response or a governance record. The protected resource or state is not accessed and not modified.

FAIL-CLOSED is the constitutional default for all safety-critical operations. It is the only acceptable failure mode for trust boundaries, audit writes, and constitutional gates.

### 2.2 FAIL-OPEN

The operation proceeds when the required evidence cannot be verified or when the required precondition is not met. The operation is treated as if it had passed the check. The protected resource or state is accessed or modified as if permitted.

FAIL-OPEN is constitutionally prohibited for safety gates, trust boundaries, audit writes, and capability invocation gates. It is tolerated only for explicitly non-safety-critical observability operations where operational continuity outweighs protection, and only when explicitly justified in the subsystem specification.

### 2.3 FAIL-SOFT

The operation proceeds in a reduced or degraded state when the full evidence cannot be verified. A typical manifestation is that an identity verification failure produces an anonymous identity object that is passed downstream rather than rejecting the request. The caller cannot distinguish the degraded state from a successful state without explicit inspection of the degraded indicators.

FAIL-SOFT is the most architecturally dangerous failure mode in the APEX Civilisation because it renders failure invisible to downstream systems. It is conditionally tolerated for non-identity-bearing transient operations (e.g., a dashboard refresh that proceeds with stale data). It is prohibited for any operation where the degraded state is indistinguishable from a verified state by downstream checks.

### 2.4 FAIL-SILENT

The operation fails — or does not execute — without producing any observable signal, governance record, or error response. The failure leaves no trace. The caller and the system have no evidence that the failure occurred.

FAIL-SILENT is constitutionally prohibited without exception. Art. 3 of constitution-v1.md mandates "no silent failures." A FAIL-SILENT implementation directly violates Art. 3 regardless of the operation type. It is never acceptable, not even for low-consequence observability operations.

### 2.5 FIRE-AND-FORGET

The operation is dispatched but its completion, success, or failure is not verified by the dispatching system. The dispatching system proceeds on the assumption of eventual completion without confirmation. A typical manifestation is an `async` function call without `await`, or a write without error handling.

FIRE-AND-FORGET is constitutionally prohibited for audit writes, governance record writes, and admission record writes. It is tolerated for low-consequence telemetry emissions where loss of a single record does not affect governance or auditability. Any FIRE-AND-FORGET write that fails must produce a detectable signal (even if async) — a FIRE-AND-FORGET that also FAIL-SILENTs on failure is a compound violation.

---

## Section 3 — Constitutional Rules

The following rules are derived directly from the APEX constitutions and are immutable. They constrain failure mode selection for every subsystem.

**Rule 1 — FAIL-CLOSED Default (Art. 2)**
The default failure mode for any operation in the APEX Civilisation is FAIL-CLOSED. Any deviation from FAIL-CLOSED requires explicit justification in the subsystem specification referencing this document. The absence of a justification means FAIL-CLOSED applies.

**Rule 2 — No Silent Failures (Art. 3)**
FAIL-SILENT is constitutionally prohibited at every layer, for every operation type. An operation that fails without producing a traceable signal violates Art. 3. This includes failures in background processes, async writes, and low-priority telemetry.

**Rule 3 — Audit Writes Are FAIL-CLOSED**
Governance Record writes, Audit Record writes, and Admission Record writes must be FAIL-CLOSED. A system that cannot write its governance record must not proceed as if it had. The governance record is a precondition for the operation, not a side-effect of it.

**Rule 4 — Safety Gates Are Inviolable**
Trust boundaries (ARCH-06) and the Constitutional Gate (TB-004) must be FAIL-CLOSED. FAIL-OPEN, FAIL-SOFT, and FAIL-SILENT at these positions are non-constitutional regardless of operational justification.

**Rule 5 — FAIL-SOFT Requires Structural Distinction**
Where FAIL-SOFT is tolerated, the degraded state must be structurally distinguishable from a successful state by downstream systems. A FAIL-SOFT that produces an outcome indistinguishable from success is equivalent to FAIL-OPEN and is constitutionally prohibited.

---

## Section 4 — Permissibility Matrix

The following matrix specifies, for each subsystem category, which failure modes are REQUIRED, PERMITTED, CONDITIONAL, TOLERATED, or PROHIBITED.

- **REQUIRED** — this is the only acceptable mode for this category
- **PERMITTED** — this mode is acceptable for this category
- **CONDITIONAL** — acceptable only with specific constraints (noted below)
- **TOLERATED** — accepted as a transitional state pending remediation; not acceptable permanently
- **PROHIBITED** — constitutionally or architecturally prohibited for this category

| Subsystem Category | FAIL-CLOSED | FAIL-OPEN | FAIL-SOFT | FAIL-SILENT | FIRE-AND-FORGET |
|---|---|---|---|---|---|
| SAFETY_GATE | REQUIRED | PROHIBITED | PROHIBITED | PROHIBITED | PROHIBITED |
| AUDIT_WRITE | REQUIRED | PROHIBITED | PROHIBITED | PROHIBITED | PROHIBITED |
| OPERATIONAL_GATE | REQUIRED | PROHIBITED | CONDITIONAL† | PROHIBITED | PROHIBITED |
| MEMORY_WRITE | REQUIRED | PROHIBITED | CONDITIONAL‡ | PROHIBITED | PROHIBITED |
| REGISTRY_WRITE | REQUIRED | PROHIBITED | PROHIBITED | PROHIBITED | PROHIBITED |
| EVENT_EMISSION | REQUIRED* | PROHIBITED | CONDITIONAL§ | PROHIBITED | CONDITIONAL¶ |
| OBSERVABILITY_WRITE | PERMITTED | PERMITTED | PERMITTED | PROHIBITED | PERMITTED |
| BACKGROUND_TASK | REQUIRED** | PROHIBITED | CONDITIONAL | PROHIBITED | CONDITIONAL†† |

**SAFETY_GATE:** Trust boundaries (TB-001 through TB-008, ARCH-06) and the Constitutional Gate (TB-004). Constitutional default and inviolable (Rule 4).

**AUDIT_WRITE:** Governance Records, Audit Records, Admission Records. Write must be awaited and confirmed before the operation that triggered the write may proceed (Rule 3).

**OPERATIONAL_GATE:** Capability invocation authority checks, AUTONOMY_LEVEL enforcement, budget checks.

† **CONDITIONAL FAIL-SOFT at OPERATIONAL_GATE:** Permitted only when the degraded state carries explicit structural markers distinguishing it from a permitted state (`verification_status: DEGRADED`, constrained operation class), and only when a Governance Record is produced noting the degraded condition.

**MEMORY_WRITE:** Writes to authoritative memory stores via the gateway (ARCH-05 SOT-003).

‡ **CONDITIONAL FAIL-SOFT at MEMORY_WRITE:** Permitted only for WORKING memory writes (task-scoped, low consequence, no governance chain impact). Not permitted for SEMANTIC, EPISODIC, PROCEDURAL, or DECISION memory writes.

**REGISTRY_WRITE:** Any write to a governed registry entry or state transition.

**EVENT_EMISSION:** Event Bus emissions.

* **REQUIRED FAIL-CLOSED at EVENT_EMISSION:** For events that trigger governance actions or whose loss would create an audit gap. The specific event types in this class are defined in ARCH-11.

§ **CONDITIONAL FAIL-SOFT at EVENT_EMISSION:** Permitted for observability events (dashboard refresh triggers, telemetry heartbeats) where event loss does not affect governance.

¶ **CONDITIONAL FIRE-AND-FORGET at EVENT_EMISSION:** Permitted for observability events only. Governance-triggering events must be confirmed before the emitting operation proceeds.

**BACKGROUND_TASK:** Cron jobs, async workers, civilisation loop phases.

** **REQUIRED FAIL-CLOSED at BACKGROUND_TASK:** For operations that produce governance records, modify authoritative state, or invoke registered capabilities. The process must not continue past a failed governance write.

†† **CONDITIONAL FIRE-AND-FORGET at BACKGROUND_TASK:** Permitted for telemetry writes and low-consequence status updates where individual record loss does not compound into an audit gap. Failures must produce a detectable signal even if async.

---

## Section 5 — Classification of Known Implementation Failure Modes

The following table classifies each of the 14 failure modes identified in the Phase 2 certification. For each: the failure mode it exemplifies, whether it is intentional, and whether it is constitutional (compliant with the rules in Section 3).

| Defect | Description | Failure Mode | Intentional | Constitutional | Required Resolution |
|---|---|---|---|---|---|
| B1 | `decisionMemoryId` always null — decision records not linked to the governance chain | FAIL-SILENT | No | No (Art. 3) | Link decision records to governance chain at write time; ARCH-08 audit schema enforces non-null `chain_link` |
| B4 | Per-call budget cap not atomically enforced — cap enforcement relies on in-process running total lost on restart | FAIL-SOFT (cap appears enforced; is not persistent) | No | No (budget governance gap) | Implement persistent resource consumption records (ARCH-05 SOT-006 GAP-RES); enforce cap against DB total |
| C01 | Memory writes bypass `lib/memory/gateway.js` via direct Supabase client — writes are unattributed | FAIL-SOFT (writes succeed without governance attribution) | No | No (Art. 3 — traceability) | Remove bypass paths; all memory writes must pass through the gateway |
| C02 | `checkGovernance()` is UNCONDITIONALLY_OPEN — the Constitutional Gate does not enforce rejection | FAIL-OPEN | No | No (Art. 2 — FAIL-CLOSED default; Rule 4) | Implement FAIL-CLOSED enforcement in the Constitutional Gate (TB-004, ARCH-06) |
| C03 | `reflexion-tracker.js` produces null `chain_link` fields — evidence chain continuity broken for reflexion records | FAIL-SILENT | No | No (Art. 3 — chain integrity) | Enforce non-null `chain_link` at reflexion record write; ARCH-08 chain verification catches null links |
| C09 | Governance score computation does not cover all governed operation types — several operation categories produce no score contribution | FAIL-SOFT (score appears complete; is not) | No | No (audit completeness gap) | Expand governance probe to cover all mandatory audit points (ARCH-08 Section 5) |
| C10 | `BYPASS_DASHBOARD_AUTH=true` bypasses FOUNDER credential verification in any environment | FAIL-OPEN | No | No (Rule 4 — SOVEREIGN boundary) | Enforce production prohibition in gateway; produce Governance Record when bypass is active |
| C13 | Dual goal systems (`strategic_memory` and `goal-tracker.js`) with no synchronisation | FAIL-SOFT (goal state appears consistent; is not) | No | No (source of truth violation — ARCH-05 SOT-001) | Demote `goal-tracker.js` to read-only projection; all goal writes through `strategic-memory.js` |
| UN01 | RLS (Row Level Security) status unknown for governed tables | UNKNOWN | N/A | Unknown — if RLS is absent on identity-bearing tables, constitutionally non-compliant | Audit RLS status per table; apply RLS to all tables holding user-attributable data (ARCH-15) |
| UN02 | Identity type assignments are implicit — no formal registry of which identities exist in the system | FAIL-SILENT (implicit assignments produce no governance record) | No | No (Art. 3 — traceability) | Admit identity type assignments to the Source of Truth Registry (ARCH-05 SOT-005) |
| UR14 | Cron schedule conflict — overlapping cron trigger timing unresolved | FAIL-SILENT (duplicate executions produce no conflict detection) | No | No (Art. 3) | Resolve schedule conflicts; implement idempotency keys on cron operations (ARCH-11 event idempotency) |
| UR15 | Cron schedule conflict (second instance) — same class as UR14 | FAIL-SILENT | No | No (Art. 3) | Same resolution as UR14 |
| GAP-RES | Resource consumption not persisted — no database record produced on model API calls | FAIL-SILENT | No | No (Art. 3 — budget auditability) | Implement resource consumption table and write path (ARCH-05 SOT-006) |
| GAP-EVT | Event log not persisted — events held in 200-entry in-memory rolling log only | FAIL-SILENT | No | No (Art. 3 — event durability) | Implement event log table and durable emission write path (ARCH-11) |

**Summary:** 14 known failure modes. 0 intentional. 0 constitutional. Every known failure mode is a non-intentional defect requiring remediation.

---

## Section 6 — Remediation Obligations

A non-constitutional failure mode is not merely a code defect — it is an architectural obligation. The following rules govern remediation:

**Obligation 1 — PROHIBITED modes must be remediated before Phase 3 feature implementation begins.** No new feature may be built on a subsystem that exhibits a PROHIBITED failure mode for its category. Building on an ungoverned foundation compounds the defect.

**Obligation 2 — TOLERATED modes must carry a remediation timeline.** A TOLERATED failure mode in a subsystem specification must name the Phase 3 deliverable that resolves it. Indefinitely tolerated modes become de facto accepted modes.

**Obligation 3 — FAIL-SILENT defects take priority over FAIL-OPEN defects.** A FAIL-OPEN system rejects access visibly — the failure is observable. A FAIL-SILENT system produces no signal — the failure is invisible. Of the 14 known defects, 8 are FAIL-SILENT; these represent the deepest audit gaps.

**Obligation 4 — Remediation must not introduce new defects.** Converting a FAIL-SOFT to FAIL-CLOSED without implementing the governance record production first would produce a FAIL-SILENT (the write fails silently). Remediation must address the complete failure mode, not just the most visible symptom.

---

## Section 7 — Failure Mode Invariants

**INV-F1 — Taxonomy Immutability**
The five failure mode names defined in Section 2 are the canonical failure mode vocabulary for all APEX architectural documents. New failure mode names may not be introduced without a SOVEREIGN-level amendment to this document.

**INV-F2 — FAIL-SILENT Is Unconditionally Prohibited**
No subsystem, operation, or background process may implement FAIL-SILENT behaviour. This invariant has no exceptions and no conditional relaxations.

**INV-F3 — Safety Gate FAIL-CLOSED Is Non-Negotiable**
The eight trust boundaries (ARCH-06) and all constitutional gates must be FAIL-CLOSED. This invariant cannot be overridden by operational requirements, performance constraints, or AUTONOMY_LEVEL settings.

**INV-F4 — Audit Write FAIL-CLOSED Is Non-Negotiable**
Governance Record, Audit Record, and Admission Record writes must be FAIL-CLOSED and non-FIRE-AND-FORGET. An operation whose governance record write fails must not proceed as if the record was produced.

**INV-F5 — FAIL-SOFT Requires Structural Distinction**
Where FAIL-SOFT is conditionally permitted, the degraded state must carry explicit structural markers distinguishable by downstream systems without heuristic inspection. A FAIL-SOFT that is indistinguishable from success is reclassified as FAIL-OPEN and is prohibited.

**INV-F6 — Failure Mode Is Declared, Not Inferred**
Every subsystem specification must explicitly declare the failure mode for each critical operation. An undeclared failure mode defaults to FAIL-CLOSED per Rule 1 (Section 3). A failure mode that is inferred from implementation behaviour rather than declared in the specification is an architectural gap.

---

## Section 8 — Downstream Dependencies

| Document | How It Depends on ARCH-07 |
|---|---|
| ARCH-08: Auditability Specification | Audit write failure mode is FAIL-CLOSED (Section 4 AUDIT_WRITE); this policy provides the authority for that requirement |
| ARCH-09: Capability Registry | Each capability entry's `audit_obligation` references the failure mode taxonomy; capability invocation gates reference the OPERATIONAL_GATE row |
| ARCH-10: Memory Architecture | Memory gateway failure mode (MEMORY_WRITE row) governs what failure modes are acceptable for each memory type |
| ARCH-11: Event Architecture | Event emission failure modes (EVENT_EMISSION row) govern which events may be FIRE-AND-FORGET vs FAIL-CLOSED |
| ARCH-12: Agent Lifecycle Model | Agent lifecycle transition failure modes use SAFETY_GATE and OPERATIONAL_GATE rows |
| ARCH-14: Runtime Execution Model | Pipeline phase failure modes use the SAFETY_GATE, OPERATIONAL_GATE, and AUDIT_WRITE rows |

---

## Section 9 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification — failure mode taxonomy and 14 defect classifications | SOVEREIGN |

---

*End of ARCH-07 — Failure Mode Policy*
