# W2-05 RT-13 Baseline — Pre-Analysis State

**Task:** W2-05 RT-13 ActionProjection + EffectExpectationRecord  
**Date captured:** 2026-07-28  
**Purpose:** Phase 0 baseline — documents the state of execution-evaluator.js and RT-13 before W2-05 analysis. Task ended in IDR-W2-05-001 (BLOCKED).

---

## 1. SPECIFIED TARGET FILE

**File:** `lib/runtime/execution-evaluator.js`  
**Size:** 9.1K  
**Design contract:** "PURE OBSERVABILITY. NOT enforcement. NOT execution. NOT authority. No imports. No writes. Memory only."

**Current exports:** `{ recordOutcome, evaluate, evaluateAgainst, reset, getEvaluationSnapshot }`

**Call site:** `lib/runtime/assembler.js:runObservabilityChain()` — called AFTER task completion via `setImmediate` from orchestrator.

**Context available at `recordOutcome()` call:**
- `taskId`, `agentType`, `duration`, `tokenCount`, `outcome`, `retries`, `cost`, `traceId`, `error`

---

## 2. RT-13 TYPES SPECIFIED

**Primary types:** `ActionProjection`, `EffectExpectationRecord`  
**File:** `lib/constitutional-types/effect-expectation-record.js`  
**Module exports:** `{ ActionProjection, EffectExpectationRecord, IrreversibilityClassificationRecord, ProjectionResponsibilityRecord, ProjectionBoundaryCrossingRecord, TYPES, RUNTIME_ID, WAVE, BASELINE }`

---

## 3. BLOCKING FINDINGS (IDR-W2-05-001)

Three independent constraints block implementation:

1. **Target file is post-execution** — `execution-evaluator.js` is called after task completion. EER constitutional requirement is BEFORE execution (RT13-INV-2). The timing is irreconcilable.

2. **RT-12 CivilizationalDecision not yet wired** — `ActionProjection.decision_ref` requires a `CivilizationalDecision.decision_id` from RT-12. W2-09 (RT-11, which produces decisions) is NOT STARTED. No `decision_ref` value exists anywhere in APEX to populate this field honestly.

3. **EER expected_effects_description cannot be honest post-execution** — Required field is a description of PRE-execution effects expectations. No pre-execution expectation data exists at the post-execution `recordOutcome()` wiring point.

---

## 4. CORRECT DEPENDENCY CHAIN (per IDR analysis)

W2-09 (RT-11 Civilization) → RT-12 wiring → W2-05 (RT-13)

W2-05 must be deferred until CivilizationalDecision objects are produced.

---

## 5. NEXT UNBLOCKED CRITICAL PATH TASK

**W2-10** — RT-06 CoherenceViolationRecord on `lib/constitution/drift-detector.js`

W2-10 has no dependency on W2-05.

---

*W2-05 baseline captured: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*
