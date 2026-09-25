# I2 — MIGRATION CONTROL SYSTEM
## APEX Constitutional Architecture — Artifact Transition Control

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | I2-MIGRATION |
| Phase | I2 — Implementation Control Plane |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Date | 2026-07-25 |
| Constitutional Basis | D8 INV-1 through INV-7; I1-REPOSITORY-MIGRATION-PLAN.md |
| Authority | I2-IMPLEMENTATION-GOVERNANCE-MODEL.md governs approvals |

**Purpose:** Define the exact mechanism for migrating from the current APEX repository into the certified RT architecture. Every artifact in the repository — files, tables, APIs, schedulers — follows a defined transition lifecycle. This system prevents duplicate sources of truth, competing architectures, hidden legacy systems, and constitutional drift.

---

## PART 1 — MIGRATION PRINCIPLES

### MP-1: Single Source of Truth

At any point in time, exactly one artifact holds authoritative ownership of any constitutional function. The migration system's primary obligation is to maintain this invariant during the transition.

**Enforcement:** The Migration Control System maintains explicit OWNER fields in the artifact registry. When two artifacts both implement the same constitutional function, the system is in a CONFLICT state that must be resolved immediately — not deferred.

### MP-2: No Parallel Architectures

The transition period must not produce a state where the constitutional layer and the legacy layer both handle the same constitutional operation. When the constitutional layer takes ownership of a function, the legacy layer must be disabled for that function — not merely deprecated.

**Enforcement:** Adapter artifacts (ADAPTER CREATED state) are the only permitted bridge mechanism. Adapters route legacy callers to constitutional implementations, not the reverse.

### MP-3: Constitutional Object Types Gate Migration

No artifact may advance to MIGRATED state without emitting and consuming constitutional object types where required by its runtime specification. Migration means constitutional compliance, not just code presence.

**Enforcement:** MIGRATED state requires documented evidence of constitutional object type production/consumption. The evidence must cite the specific RS-07 object type from the runtime's specification.

### MP-4: Append-Only Records Are Permanent

Migration never deletes records from append-only constitutional stores. Data migration (e.g., `amendments.json` → `amendments` DB table) copies data; it never deletes the source record.

**Enforcement:** Migration scripts for append-only tables are INSERT-only. The Migration Control System flags any migration script containing DELETE against a protected table as a constitutional violation.

### MP-5: Dependency Order is Constitutional Order

The constitutional dependency graph (A0-v1.1.1 §4.1; I1-IMPLEMENTATION-SEQUENCING.md critical path) determines migration order. A higher-tier runtime may not be migrated before the lower-tier runtimes it depends on are verified.

**Enforcement:** The artifact registry tracks blocking dependencies. An artifact cannot advance past MAPPED state until all its dependencies have reached at least ADAPTER CREATED state.

### MP-6: Verified Before Deprecated

No legacy artifact may enter DEPRECATED state until the constitutional replacement has passed VERIFIED state. The sequence is: new system VERIFIED → old system DEPRECATED → old system REMOVED. There is no shortcut.

**Enforcement:** State transitions to DEPRECATED are gated by a verified successor entry in the registry.

### MP-7: Removal Requires Evidence

No artifact may enter REMOVED state without evidence that all callers have been migrated. Evidence means: a code search confirming zero imports or calls to the removed artifact, reviewed by the Implementation Owner.

**Enforcement:** REMOVED state transition requires a signed-off caller audit in the artifact's registry entry.

---

## PART 2 — ARTIFACT TRANSITION STATES

Every artifact in the repository has exactly one migration state at all times. States advance forward only (no regression to a lower state once advanced, except under emergency rollback).

### State Definitions

```
EXISTING
  ↓ (I0 audit performed)
AUDITED
  ↓ (I1 migration plan assigned)
MAPPED
  ↓ (adapter/wrapper created, or typing added for Wave 1)
ADAPTER CREATED
  ↓ (constitutional object types emitted/consumed; wiring complete)
MIGRATED
  ↓ (constitutional gate tests pass; RT spec verification)
VERIFIED
  ↓ (new system handles full load; old code unused)
DEPRECATED
  ↓ (all references removed; caller audit complete)
REMOVED
```

### State Descriptions

| State | Meaning | Entry Condition | Owner |
|-------|---------|----------------|-------|
| EXISTING | Artifact in current repository; no constitutional assessment | Default (all artifacts start here) | — |
| AUDITED | Assessed against I0; gap register entries noted; runtime assigned | I0 audit complete; migration classification assigned from I1-REPOSITORY-MIGRATION-PLAN | Implementation Owner |
| MAPPED | Specific migration action documented in Ledger; wave assignment confirmed | Ledger entry exists; no code change required | Implementation Owner |
| ADAPTER CREATED | Compatibility adapter or type wrapper created; old interface still works | Adapter deployed; callers of old interface routed to new | Implementation Author |
| MIGRATED | Artifact emits/consumes constitutional object types; constitutional function complete | Evidence of RT-N object type production/consumption in place | Implementation Author |
| VERIFIED | Artifact passes constitutional gate test for its runtime; no constitutional violations | Gate test evidence filed; Implementation Owner sign-off | Implementation Owner |
| DEPRECATED | Artifact superseded; no new code may reference it; existing callers being migrated | Verified successor exists; Implementation Owner decision | Implementation Owner |
| REMOVED | Artifact deleted; caller audit confirmed zero references | Zero-reference audit signed off by Implementation Owner | Implementation Owner |

### Special State: CONFLICT

An artifact enters CONFLICT state when two artifacts both claim MIGRATED or VERIFIED status for the same constitutional function. CONFLICT is not a normal state — it is an alarm condition requiring immediate resolution.

**Resolution rule:** One artifact is demoted to DEPRECATED; the canonical version retains VERIFIED. The demotion is a Class C decision (Migration Decision) requiring Implementation Owner approval.

---

## PART 3 — LEGACY PRESERVATION RULES

### LP-1: Preserve Before Replace

No artifact classified as REPLACE in I1-REPOSITORY-MIGRATION-PLAN.md may be replaced until the replacement has passed ADAPTER CREATED state. The sequence is: replacement created → tested → ADAPTER CREATED → old artifact advanced to DEPRECATED.

### LP-2: Constitutionally Preserved Artifacts Are Protected

The ten artifacts in I1-ARCHITECTURE Part 18 (Constitutional Preservation Requirements) may not advance to DEPRECATED or REMOVED without a Class A constitutional change through RT-16. They are not migration candidates — they are constitutional implementations.

**Protected artifacts:**
1. PETL 5-state machine in `execution-transaction.js`
2. 6-gate sequence in `constitutional-gate.js`
3. 13-stage reality claim lifecycle in `fabric.js`
4. Append-only audit ledger in `decision_ledger.js`
5. 13-layer memory architecture in `gateway.js`
6. 9-dimension reality health in `fabric.js scoreRealityHealth()`
7. Consensus quorum 5-of-9 in `consensus.js`
8. Constitutional gate fail-closed (400ms timeout→DENY) in `constitutional-gate.js`
9. DOM-000001 through DOM-000010 domain structure in `domains/`
10. `amendments.json` location in `lib/constitution/`

### LP-3: Legacy Duplication Window

During the migration period, a legacy artifact and its constitutional replacement may coexist. This window is permitted only if:
1. The artifacts do not both respond to the same constitutional operation
2. The legacy artifact is in EXISTING, AUDITED, or MAPPED state (not MIGRATED or VERIFIED)
3. The TCL (Temporary Compatibility Layer) routing mechanism is in place to prevent dual execution

### LP-4: No New Code in Legacy Artifacts

Once an artifact is MAPPED or higher, no new business logic may be written in it. New logic must go in the constitutional replacement. Bug fixes to the legacy artifact are permitted if the fix is a Class D refactor (no behavior change) and the artifact hasn't yet reached DEPRECATED state.

---

## PART 4 — MIGRATION OWNERSHIP RULES

### Ownership by Runtime Tier

Each runtime owns its artifacts. No runtime may migrate an artifact owned by another runtime.

| Runtime | Primary Artifact Owner | Migration Supervisor |
|---------|----------------------|----------------------|
| RT-01 | `lib/identity/`, `humans`/`agents` tables | Implementation Owner |
| RT-02 | `lib/constitution/authority-resistance.js` | Implementation Owner |
| RT-03 | `lib/runtime/execution-transaction.js`, `constitutional-gate.js` | Implementation Owner (CRITICAL artifacts) |
| RT-04 | `lib/audit/decision_ledger.js`, `apex_audit.ndjson` | Implementation Owner |
| RT-05 | `lib/reality/fabric.js`, `reality_claims` table | Implementation Owner |
| RT-06 | `lib/coherence/` (new) | Implementation Author |
| RT-07 | `lib/memory/gateway.js`, memory tables | Implementation Owner |
| RT-08 | `lib/observation/` (new), `lib/observer-health/` | Implementation Author |
| RT-09 | `lib/knowledge/` (new), `lib/beliefs/` | Implementation Author |
| RT-10 | `lib/intelligence/sie.js`, `lib/understanding/` | Implementation Author |
| RT-11 | `civilisation/`, `consensus_sessions` | Implementation Owner |
| RT-12 | `lib/decision/` (new), `lib/runtime/decision-lattice.js` | Implementation Author |
| RT-13 | `lib/action/` (new), PETL EXECUTING state | Implementation Owner (PETL is critical) |
| RT-14 | `lib/reflection/` (new), `lib/runtime/outcome-registry.js` | Implementation Author |
| RT-15 | `domains/` (12 instances) | Implementation Author |
| RT-16 | `lib/amendment/` (new), `lib/constitution/amendments.json` | Implementation Owner |

**Cross-ownership rule:** When a migration task touches artifacts owned by two different runtimes (e.g., RT-03's Gate 6 reads RT-05's ChangeRecord), both runtime owners must approve the interface contract. The interface contract is defined in I1-ARCHITECTURE Part 8.

---

## PART 5 — RUNTIME-BY-RUNTIME MIGRATION TRACKING

### Format

For each runtime: current state, target state, blocking gaps, migration action, current artifact lifecycle state.

---

### RT-01 — Identity Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — identity inferred from DB rows; no IdentityRecord type |
| Target state | VERIFIED — ActorProfile type produced; lib/identity/ active |
| Critical gap | GAP-01-001 (no IdentityRecord object type) |
| Migration action | REFACTOR `access-controller.js`; CREATE `lib/identity/` |
| Blocking this | GAP-07-001 (must be ADAPTER CREATED before RT-01 can reach MIGRATED) |
| Blocking others | RT-03 Gate 1 (requires IdentityRecord to validate) |
| Wave | Wave 0 (type) + Wave 2 (wiring) |

**Artifact states:**

| Artifact | Current State | Target State |
|----------|--------------|--------------|
| `lib/memory/access-controller.js` | EXISTING | MIGRATED |
| `humans` table | EXISTING | MIGRATED (schema extension migration 088) |
| `agents` table | EXISTING | MIGRATED (schema extension migration 088) |
| `lib/identity/record.js` | — | VERIFIED (CREATE) |
| `lib/identity/manifest.js` | — | VERIFIED (CREATE) |
| `lib/constitutional-types/identity-record.js` | — | VERIFIED (CREATE) |

---

### RT-02 — Authority Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — authority enforced conceptually; no AIR type taxonomy |
| Target state | VERIFIED — DelegationRecord type active; AIR-1 through AIR-5 (types) implemented |
| Critical gap | GAP-02-001 (no five-type AIR taxonomy) |
| Migration action | REFACTOR `authority-resistance.js`; CREATE authority type definitions |
| Blocking this | None |
| Blocking others | RT-03 Gate 3 (requires AuthorityCertificate) |
| Wave | Wave 0 (type) + Wave 2 (wiring) |

---

### RT-03 — Kernel Runtime

| Field | Value |
|-------|-------|
| Current state | PARTIALLY MIGRATED — PETL operational; 3 critical gaps |
| Target state | VERIFIED — Step 2, Gate 6, Stage 10 MPW all active |
| Critical gaps | GAP-03-001 (Step 2); GAP-03-002 (Gate 6); GAP-03-003 (Stage 10 MPW) |
| Migration action | REFACTOR execution-transaction.js (extend only — PRESERVED artifact) |
| Blocking this | GAP-07-001 (Step 2 needs RT-07 HSQR); GAP-05-001 (Gate 6 needs ChangeRecord) |
| Blocking others | Everything — RT-03 is the gate for all Class A operations |
| Wave | Wave 2 (critical path) |

**Preservation constraint:** The PETL 5-state machine and 6-gate sequence are constitutionally preserved. Migration extends them; it does not replace them.

---

### RT-04 — Audit Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — append-only ledger operational; no formal AuditRecord type |
| Target state | VERIFIED — ConstitutionalAuditRecord type active; AIR-5 independence enforced |
| Critical gap | GAP-04-001 (no formal AuditRecord type) |
| Migration action | REFACTOR `decision_ledger.js` (type wrapper only) |
| Blocking this | None (RT-04 never gated by RT-03 per AIR-5) |
| Blocking others | RT-16 PreservationAuditRecord (Wave 3) |
| Wave | Wave 0 (type) + Wave 3 (PreservationAuditRecord) |

**Preservation constraint:** `decision_ledger.js` is a constitutionally-preserved artifact. Migration wraps its output; no internal logic may change.

---

### RT-05 — Reality Fabric Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — 13-stage fabric operational; ChangeRecord missing |
| Target state | VERIFIED — ChangeRecord and HistoricalAnchor produced on every advanceClaim() |
| Critical gap | GAP-05-001 (ChangeRecord/HistoricalAnchor not produced) |
| Migration action | REFACTOR `fabric.js` (extend advanceClaim only — PRESERVED artifact) |
| Blocking this | None |
| Blocking others | RT-03 Gate 6 depends on GAP-05-001 fix |
| Wave | Wave 2 (critical for Gate 6) |

---

### RT-06 — Coherence Runtime

| Field | Value |
|-------|-------|
| Current state | MISSING — no dedicated RT-06 implementation |
| Target state | VERIFIED — GCR-1 through GCR-7 active; CoherenceViolationRecord produced |
| Critical gap | GAP-06-001 (entire runtime missing) |
| Migration action | CREATE `lib/coherence/` |
| Blocking this | GAP-03-003 (Stage 10 MPW signal, RT-03 side) |
| Blocking others | None blocking, but RT-15 DomainCoherenceStatus depends on it |
| Wave | Wave 2 (after Stage 10 MPW) |

---

### RT-07 — Memory Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — 13-layer gateway operational; HistoricalStateQueryResult interface missing |
| Target state | VERIFIED — getHistoricalState() method active; formal HSQR type returned |
| Critical gap | GAP-07-001 (HistoricalStateQueryResult formal type missing) |
| Migration action | REFACTOR `gateway.js` (add method only — PRESERVED artifact) |
| Blocking this | None |
| Blocking others | RT-03 Step 2 (GAP-03-001) depends on this fix |
| Wave | Wave 2 (critical path, first task) |

---

### RT-08 — Observation Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — observer sensors operational; ObservationRecord not produced |
| Target state | VERIFIED — Observation Boundary active; ObservationRecord produced for all inputs |
| Critical gap | GAP-05-002 (Observation Boundary gate at fabric entry missing) |
| Migration action | CREATE `lib/observation/`; REFACTOR `lib/observer-health/` |
| Blocking this | Wave 2 completion |
| Blocking others | RT-09 pipeline (depends on ObservationRecord) |
| Wave | Wave 3 |

---

### RT-09 — Knowledge Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — beliefs and knowledge-validator present; KnowledgeRecord not formal |
| Target state | VERIFIED — KnowledgeRecord produced; lineage traced to ObservationRecord (INV-4) |
| Critical gap | No formal KnowledgeRecord with lineage |
| Migration action | CREATE `lib/knowledge/`; WRAP `knowledge-validator.js` |
| Blocking this | RT-08 must be MIGRATED (ObservationRecord source) |
| Blocking others | RT-10 CUM synthesis; RT-03 Gate 4 |
| Wave | Wave 2 |

---

### RT-10 — Intelligence Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — SIE operational; no CUM type |
| Target state | VERIFIED — SIE output wrapped as CivilizationUnderstandingModel |
| Critical gap | No formal CUM type |
| Migration action | WRAP `sie.js` output with CUM type |
| Blocking this | Wave 1 CUM type definition |
| Blocking others | RT-11 deliberation (PAIR 32) |
| Wave | Wave 2 |

---

### RT-11 — Civilization Intelligence Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — consensus.js operational; OVL-009 conflict |
| Target state | VERIFIED — CivilizationalDecisionProposal produced; OVL-009 resolved |
| Critical gap | OVL-009 (lib/cognitive/ conflict); no formal CivilizationalDecisionProposal |
| Migration action | REFACTOR `consensus.js`; MERGE then DELETE `lib/cognitive/` (Wave 4) |
| Blocking this | RT-10 CUM delivery (PAIR 32) |
| Blocking others | RT-12 compliance gate; RT-16 amendment initiation |
| Wave | Wave 2 (type wiring) + Wave 4 (legacy cleanup) |

---

### RT-12 — Decision Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — decision-lattice operational; no ComplianceVerificationRecord |
| Target state | VERIFIED — ComplianceVerificationRecord produced; Gate 5 validated |
| Critical gap | No formal ComplianceVerificationRecord |
| Migration action | WRAP `decision-lattice.js`; CREATE `lib/decision/` |
| Blocking this | RT-11 must produce CivilizationalDecisionProposal |
| Blocking others | RT-03 Gate 5; RT-13 Action |
| Wave | Wave 2 |

---

### RT-13 — Action Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — PETL EXECUTING state handles actions; no EffectExpectationRecord |
| Target state | VERIFIED — EffectExpectationRecord produced at COMMITTED; INV-7 enforced |
| Critical gap | No EffectExpectationRecord before EXECUTING |
| Migration action | CREATE `lib/action/`; REFACTOR PETL COMMITTED state |
| Blocking this | RT-12 must produce CivilizationalDecision |
| Blocking others | RT-14 ConsequenceObservationRecord (requires EER reference) |
| Wave | Wave 2 |

---

### RT-14 — Reflection Runtime

| Field | Value |
|-------|-------|
| Current state | EXISTING — post-hook and outcome-registry partial; no formal COR |
| Target state | VERIFIED — ConsequenceObservationRecord produced; loop-back to RT-08 active |
| Critical gap | No formal ConsequenceObservationRecord; INV-6 not enforced |
| Migration action | CREATE `lib/reflection/`; WRAP `outcome-registry.js` |
| Blocking this | RT-13 EffectExpectationRecord (reference required) |
| Blocking others | None (end of loop) |
| Wave | Wave 2 |

---

### RT-15 — Domain Runtime (×12)

| Field | Value |
|-------|-------|
| Current state | EXISTING — 10 domain instances present; 2 missing |
| Target state | VERIFIED — 12 domain instances; DomainProfile types active |
| Critical gap | GAP-15-001 (DOM-000011, DOM-000012 missing) |
| Migration action | CREATE dom-000011, dom-000012; REFACTOR domain-loader.js |
| Blocking this | Wave 2 completion |
| Blocking others | Domain count invariant (II-11) |
| Wave | Wave 3 |

---

### RT-16 — Amendment Runtime

| Field | Value |
|-------|-------|
| Current state | STUB — amendments.json exists; no pipeline |
| Target state | VERIFIED — 15-step pipeline active; PAIR 59/60/61 all wired |
| Critical gap | GAP-16-001 (pipeline missing); GAP-16-002 (types missing) |
| Migration action | CREATE `lib/amendment/`; MIGRATE amendments.json to DB |
| Blocking this | RT-11 must produce AmendmentProposal; RT-04 PreservationAudit |
| Blocking others | Nothing (RT-16 is out-of-band) |
| Wave | Wave 3 (largest task) |

---

## PART 6 — MIGRATION DEPENDENCY ORDERING

Migration must follow constitutional dependency order. A runtime cannot reach VERIFIED state before its dependencies reach ADAPTER CREATED or higher.

**Tier execution order:**

```
Tier 0 (Pre-Wave): PWA-01 (boundary doc), PWA-02 (route collision)

Tier 1 (All in Wave 1): Constitutional object types defined (no wiring)
  → All 16 runtimes can have types created in parallel
  → Types are schema-only; no dependency between type files

Tier 2 (Wave 2, ordered):
  RT-07 (gateway.js method) → RT-03 (Step 2)
  RT-05 (ChangeRecord) → RT-03 (Gate 6)
  RT-03 (Stage 10 MPW) → RT-06 (GCR evaluator)
  RT-09 → RT-10 → RT-11 → RT-12 → RT-13 → RT-14

Tier 3 (Wave 3, ordered):
  Wave 2 complete → RT-08 Observation Boundary
  Wave 2 complete → RT-01 lib/identity/
  Wave 2 complete → RT-15 DOM-000011/12
  RT-11 deliberation + RT-04 → RT-16 pipeline

Tier 4 (Wave 4): Legacy cleanup
  Wave 3 VERIFIED → lib/cognitive/ MERGE → DELETE
  Wave 3 VERIFIED → Route deduplication

Tier 5 (Wave 5): End-to-end verification
```

---

## PART 7 — MIGRATION RULES: PREVENTING CONSTITUTIONAL FAILURES

### MR-1: No Duplicate Sources of Truth

A duplicate source of truth exists when two artifacts both claim to be the authoritative source of data for the same constitutional object type. Prevention:
- The Ledger OWNER field is set to exactly one artifact per object type
- Any artifact that produces the same type as an existing MIGRATED artifact must be reviewed: is it a CONFLICT or a TCL?

### MR-2: No Parallel Competing Architectures

A parallel competing architecture exists when two systems both fully implement the same constitutional function independently, without integration. Prevention:
- The OVL register items must be resolved during Wave 4 — not after
- OVL-001 (route collision) must be resolved in Wave 0 before any wiring begins
- OVL-009 (`lib/cognitive/` overlap) must be resolved in Wave 4 before RT-16 verification

### MR-3: No Hidden Legacy Systems

A hidden legacy system is an artifact classified as DEPRECATED or REMOVED that is still being called by active production code. Prevention:
- The caller audit (required for REMOVED state) must be machine-verified: `grep -r 'require.*path'` across the codebase
- TCLs must not suppress the visibility of legacy calls — they must surface and route them

### MR-4: No Accidental Constitutional Drift

Constitutional drift occurs when cumulative implementation decisions produce behavior that deviates from the specification without a formal amendment. Prevention:
- All Class B (IC) decisions must be logged as IDRs
- At each gate passage, the Implementation Owner reviews all IDRs since the last gate for drift signals
- The gate verification checks (I2-IMPLEMENTATION-GATE-SPECIFICATION.md) explicitly test constitutional compliance

---

## PART 8 — VERIFICATION REQUIREMENTS BEFORE REMOVAL

No artifact may advance from DEPRECATED to REMOVED until all of the following are satisfied:

1. **Zero-reference audit:** `grep -r 'require\|import' --include='*.js'` shows zero references to the artifact path. Audit must be performed by the Implementation Author and signed off by the Implementation Owner.

2. **Successor verification:** The VERIFIED successor artifact for the same constitutional function exists in the registry with Implementation Owner sign-off.

3. **Data migration complete (for database artifacts):** Any data from the artifact's database has been migrated to the successor table. Migration verified by row count reconciliation.

4. **Append-only exception:** If the artifact is an append-only store (e.g., the source of a data migration), it is never REMOVED — it becomes DEPRECATED but physically retained as a constitutional archive.

5. **TCL removal:** Any TCL routing callers from the deprecated artifact to the successor has been removed (TCLs should not outlive their target artifact).

---

*End of I2-MIGRATION-CONTROL-SYSTEM.md*
*Document ID: I2-MIGRATION | Baseline: APEX-CONSTITUTION-v1.0 | Date: 2026-07-25*
