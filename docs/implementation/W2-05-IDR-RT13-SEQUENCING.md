# IDR-W2-05-001: RT-13 Constitutional Sequencing Conflict

**IDR Type:** Implementation Decision Record — STOP → RESOLVED  
**Task:** W2-05 RT-13 ActionProjection + EffectExpectationRecord  
**Date:** 2026-07-28  
**Resolved:** 2026-08-04 (T3-15)  
**Status:** RESOLVED — all 3 blockers eliminated; T3-15 implementation AUTHORIZED and COMPLETE  
**Authority:** W2-CONSTITUTIONAL-WIRING-PATTERN.md §4 Rule 6 (Field Honesty)

> **RESOLUTION SUMMARY (2026-08-04):**
> Blocker 1 (wrong wiring file): RESOLVED — wiring at `lib/civilization/rt12-bootstrap.js`
> (decision formation time, pre-Stage-4), not `execution-evaluator.js`.
> Blocker 2 (no CivilizationalDecision): RESOLVED — T3-13 produced `DEC-BOOTSTRAP-v1-${ts}`
> at AUTHORIZED state; `decision_ref` now available.
> Blocker 3 (EER honesty): RESOLVED — EER formed at decision formation time (before Stage 4);
> pre-crossing context from DR/CDP/CUM is constitutionally honest (D5 PI-7).
> Implementation: `lib/civilization/rt13-bootstrap.js` (CREATED T3-15);
> wiring: `rt12-bootstrap.js` → `formActionProjection()`.
> Tests: `tests/rt13-bootstrap.test.js` — 30/30 PASS.
> Phase 0 Audit: T3-15-ACTION-PROJECTION-PHASE-0-AUDIT.md — AUTHORIZED.

---

## 1. CONFLICT IDENTIFIED

The Wave 2 Master Plan (WAVE-2-MASTERPLAN.md Part 5) specifies:

> "W2-05: RT-13 ActionProjection + EffectExpectationRecord on execution-evaluator.js
> Objective: Wrap `lib/runtime/execution-evaluator.js` to emit `EffectExpectationRecord` before execution and `ActionProjection` as part of execution evaluation.
> Dependencies: W2-02 (KernelOperationManifest must exist before projection)."

**Three independent blocking constraints prevent this implementation:**

### Constraint 1 — Target file is post-execution, not pre-execution

`lib/runtime/execution-evaluator.js` is called from `lib/runtime/assembler.js:runObservabilityChain()` **after** task completion. The file header states explicitly:

```
// PURE OBSERVABILITY. NOT enforcement. NOT execution. NOT authority.
// No imports. No writes. Memory only.
```

The Master Plan states EffectExpectationRecord should be emitted "before execution." This is constitutionally correct — RT13-INV-2 requires the EER be formed before Stage 4 (Projection Boundary crossing). The specified target file operates exclusively post-execution. There is no "before execution" boundary in `execution-evaluator.js`.

### Constraint 2 — RT-12 (CivilizationalDecision) prerequisite not wired

`ActionProjection.decision_ref` is a **required** field defined as:

> "Reference to CivilizationalDecision.decision_id (RT-12 owned; A0 §3.13) that authorized this ActionProjection. D8 INV-1: every AP must trace to an authorized CivilizationalDecision. RT-13 may not form an ActionProjection without a valid Decision reference (A0 §3.14 R1)."

APEX does not currently produce `CivilizationalDecision` objects (RT-12). W2-09 (RT-11 Civilization/Consensus — the upstream producer of decisions) is on the Wave 2 secondary parallel path and is `NOT STARTED`. Without W2-09 (or W2-12 if RT-12 is to be wired separately), no `CivilizationalDecision.decision_id` exists in the system to reference.

Using `taskId` or any other available identifier as `decision_ref` would fabricate a constitutional reference that does not exist. This violates:
- W2-CONSTITUTIONAL-WIRING-PATTERN.md §4 Rule 6: "Do not fabricate, synthesize, or infer values that are not directly observable at the wiring point."
- D8 INV-1: "every AP must trace to an authorized CivilizationalDecision"

### Constraint 3 — EER expected_effects_description cannot be honest post-execution

`EffectExpectationRecord.expected_effects_description` is a **required** field defined as:

> "Constitutional description of the effects expected from the ActionProjection in external reality. This is the 'expectation' that RT-14 compares against the ConsequenceObservationRecord (RT-08 formed). D5 PI-7: if external reality diverges from this description, reality is the truth — this description is never revised post-crossing."

The EER is a PRE-CROSSING record. Its purpose is to record what was expected BEFORE the Projection Boundary was crossed. The `execution-evaluator.js` only has post-execution outcome data (`outcome`, `duration`, `cost`, `retries`, etc.). There is no pre-execution expectation description available at this wiring point.

Constructing `expected_effects_description` from post-execution outcome data would violate D8 PROH-6 (No Assumption-to-Fact Conversion): the EER would misrepresent post-hoc observations as pre-execution expectations.

Additionally, `EffectExpectationRecord.effect_observation_window` is required and represents "the constitutional window within which RT-14 must form an ObservedConsequenceRecord." No observation window concept exists in `execution-evaluator.js`.

---

## 2. DETAILED ANALYSIS

### 2.1 Target File Assessment

| Property | Value | Implication for RT-13 |
|----------|-------|-----------------------|
| File location | `lib/runtime/execution-evaluator.js` | Secondary runtime module |
| Call site | `assembler.js:runObservabilityChain()` | Called AFTER task completion |
| Execution timing | POST-COMPLETION | Cannot be "before execution" |
| Design contract | "No imports. No writes. Memory only." | Adding require() violates contract |
| Available data | taskId, agentType, duration, tokenCount, outcome, retries, cost, traceId, error | None of these satisfy RT-13 required fields |
| Has `decision_ref` source? | NO | ActionProjection cannot be formed |
| Has pre-execution context? | NO | EER cannot be formed |

### 2.2 RT-13 Required Field Availability

| Field | Required? | Available at wiring point? | Source if available |
|-------|-----------|---------------------------|---------------------|
| `action_projection_id` | YES | Yes (synthetic) | `AP-${taskId}-${Date.now()}` |
| `decision_ref` | YES | **NO** | Requires RT-12 CivilizationalDecision |
| `lifecycle_stage` | YES | Partial (`DECISION_RECEIPT` as static default) | No lifecycle tracking exists |
| `domain` | YES | Partial (agentType ≠ constitutional domain) | Cannot map honestly |
| `formation_timestamp` | YES | Yes | `new Date().toISOString()` |
| `is_cross_domain` | YES | Partial (default false, no basis) | No cross-domain info |
| `eer_id` | YES | Yes (synthetic) | `EER-${taskId}-${Date.now()}` |
| `action_projection_ref` | YES | Conditional (if AP formed) | Depends on AP |
| `expected_effects_description` | YES | **NO** | Cannot describe pre-execution expectations post-execution |
| `effect_observation_window` | YES | **NO** | No observation window concept |

**Honest field satisfaction rate: 3/10 required fields (30%). INSUFFICIENT.**

The two fields that cannot be populated honestly (`decision_ref`, `expected_effects_description`) are load-bearing constitutional fields. `decision_ref` is explicitly checked by D8 INV-1.

### 2.3 Constitutional Sequencing Dependency

The correct Wave 2 sequencing for RT-13 is:

```
W2-09 (RT-11 Civilization) → produces DeliberationRecord
    ↓
RT-12 wiring → CivilizationalDecision formed per approved deliberation
    ↓
W2-05 (RT-13) → ActionProjection formed per CivilizationalDecision
    ↓
EffectExpectationRecord registered before Stage 4
```

The WAVE-2-MASTERPLAN places W2-05 on the CRITICAL PATH immediately after W2-04:

```
W2-04 → W2-05 → W2-10
```

But W2-09 (the prerequisite) is on the SECONDARY PATH and is `NOT STARTED`. The Master Plan's critical path sequencing for W2-05 is incorrect relative to RT-13's constitutional dependencies.

### 2.4 File Design Contract Conflict

The design contract "No imports. No writes. Memory only." is a deliberate architectural choice, not an accident. The file explicitly declares this in its header. Adding `require('../constitutional-types/effect-expectation-record')` would:

1. Add an import to a "No imports" module
2. Implicitly add an external write path (via constitutionalStore.write) to a "No writes" module
3. Violate the module's architectural isolation guarantee

The certified wiring pattern requires `require()` for constitutional types and `await constitutionalStore.write(record)`. These are incompatible with the module's design contract.

---

## 3. ALTERNATIVE APPROACHES CONSIDERED

### Alternative A — Wire at assembler.js instead of execution-evaluator.js

`assembler.js` has more context (decision, policyDecisions, inputHash, outputHash) but still lacks `decision_ref` and pre-execution expectation data. The same field honesty problem exists. REJECTED.

### Alternative B — Wire at execution-context.js (initializeContext)

`execution-context.js:initializeContext()` runs at request start (before execution). Has `executionClass`, `requestId`, but:
- No `decision_ref` (no CivilizationalDecision exists)
- `expected_effects_description` would need to be fabricated from request metadata
- No `effect_observation_window` concept
REJECTED — decision_ref still unavailable.

### Alternative C — Wire at PETL begin() using KernelOperationManifest txId as decision_ref

The PETL `begin()` function (W2-02 wiring site) has `txId` which could be reused as `decision_ref`. However:
- KernelOperationManifest is RT-03; it is NOT a CivilizationalDecision (RT-12)
- Using `txId` as `decision_ref` fabricates a cross-runtime reference that doesn't exist
- D8 INV-1 requires traceability to an authorized CivilizationalDecision — PETL txId does not satisfy this
REJECTED — violates field honesty rule and D8 INV-1.

### Alternative D — Defer W2-05 until W2-09 completes, then wire at the correct location

W2-09 (RT-11 Civilization consensus) will wire `DeliberationRecord`. The downstream RT-12 wiring will produce `CivilizationalDecision`. Once that exists, RT-13 ActionProjection can be correctly formed at the point where APEX receives and acts on a CivilizationalDecision.

**This is the correct approach.** However, W2-09 is not yet started. W2-05 must be deferred.

### Alternative E — Scope W2-05 to a reduced "Wave 2 observational emission" at assembler.js

Emit `EffectExpectationRecord` at `assembler.js:runObservabilityChain()` with:
- `expected_effects_description`: static "task execution outcome" descriptor
- `effect_observation_window`: "immediate" (constant)
- `action_projection_ref`: synthesized from taskId

This satisfies type validation but violates field honesty. The EER constitutional purpose is to describe pre-execution expectations for consequence comparison. A post-execution constant descriptor is constitutionally meaningless and would corrupt the RT-14 consequence comparison chain. REJECTED — constitutionally dishonest.

---

## 4. RESOLUTION

### Wave 2 Resolution (Deferred)

W2-05 is **DEFERRED** pending W2-09 (RT-11 Civilization) completion and RT-12 (CivilizationalDecision) wiring.

**New dependency chain for W2-05:**
```
W2-09 (RT-11 DeliberationRecord) + RT-12 wiring
    ↓
W2-05 (RT-13 ActionProjection + EffectExpectationRecord)
```

**Correct wiring location (Wave 3 target):**
Where APEX receives and processes a formal `CivilizationalDecision` object and is about to execute the authorized action. This wiring point does not yet exist.

### Migration Ledger Impact

W2-05 migration status: `BLOCKED` (IDR-W2-05-001)

The critical path:
```
W2-04 (CERTIFIED) → W2-05 (BLOCKED) → W2-10
```

Becomes:
```
W2-04 (CERTIFIED) → [W2-05 DEFERRED to after W2-09] → W2-10 (unblocked)
```

**W2-10 (RT-06 CoherenceViolationRecord) does NOT depend on W2-05.** The critical path can advance to W2-10 without W2-05.

### Wave 3 Resolution Path

1. Complete W2-09 (RT-11 Civilization — DeliberationRecord on civilisation/consensus.js)
2. Wire RT-12 (CivilizationalDecision production — W2 secondary path or Wave 3)
3. Identify the wiring point where APEX acts on a CivilizationalDecision (pre-execution boundary)
4. Wire ActionProjection at that point (fire-and-forget, CONSTITUTIONAL WIRING PATTERN V1.0)
5. Wire EffectExpectationRecord immediately after ActionProjection is formed, before execution

---

## 5. CRITICAL PATH RECOMMENDATION

**Next Wave 2 task:** W2-10 (RT-06 CoherenceViolationRecord on drift-detector.js)

W2-10 does not depend on W2-05. The critical path can continue:
```
W2-04 (CERTIFIED)
    ↓
W2-10 (next — no dependency on W2-05)
```

Simultaneously, W2-06, W2-07, W2-08, W2-09 on the secondary path can proceed. Once W2-09 completes and CivilizationalDecision objects are produced, W2-05 can be re-attempted with the correct wiring point and constitutionally honest field values.

---

*IDR-W2-05-001 created: 2026-07-28. Constitutional authority: W2-CONSTITUTIONAL-WIRING-PATTERN.md §4 Rule 6; D8 INV-1; RT13-INV-2; A0-v1.1.1 §3.14.*
