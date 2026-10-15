# KG-06 — Knowledge Acquisition & Gap-Resolution Orchestration: Certification Record

**Programme**: APEX Knowledge-Gap Phase  
**Task ID**: KG-06  
**Status**: CERTIFIED  
**Date**: 2026-08-26  
**Baseline commit**: (KG-05 HEAD — 2022 tests passing before KG-06)  
**Test result**: 2091 / 2091 PASS (0 regressions); KG-06 suite: 69 / 69 PASS

---

## 1. Mandate

KG-06 establishes **gap-resolution orchestration**: when KG-05 determines APEX cannot proceed due to insufficient knowledge, KG-06 orchestrates the acquisition of evidence through authorised mechanisms, then re-evaluates the decision through the canonical KG-03 → KG-04 → KG-05 chain.

Prior to KG-06:
- KG-01/02/03/04/05 detected, assessed, contextualised, and gated knowledge sufficiency
- **No mechanism existed to actively resolve gaps** — BLOCKED was final
- KG-06 closes this gap: it attempts evidence acquisition, then re-evaluates

KG-06 is **orchestration only**. It does NOT make final sufficiency decisions. Every resolution attempt closes through `evaluateKnowledgeDecision()` (KG-05).

---

## 2. Phase 1 — Observation (Production Path Audit)

### 2.1 Acquisition Authorities (canonical)

| Strategy | Authority | Mechanism |
|----------|-----------|-----------|
| USE_EXISTING_KNOWLEDGE | `kge.getKnowledgeState()` | Query operational knowledge state |
| QUERY_CANONICAL_MEMORY | `gateway.searchMemory()` + `knowledge-validator.submitLesson()` | Search memory → submit to KVQ |
| SUBMIT_FOR_VALIDATION | `knowledge-validator.submitLesson()` | Caller evidence text → KVQ |
| REQUEST_USER_INFORMATION | `apex_notifications` table | Fire-and-forget user notification |
| BLOCK_ACTION | None | No acquisition; immediately BLOCKED |

### 2.2 Integration Point

KG-06 is an **orchestration layer above** both KG and Memory. The resolution engine CAN import `gateway.searchMemory()` — this does not violate the KNOWLEDGE ≠ MEMORY invariant because the resolution engine is not the core KG engine. `knowledge-gap-engine.js` itself does not import gateway.

### 2.3 Closed-Loop Invariant

```
evaluateKnowledgeDecision()  [initial — KG-04/05]
  if can_proceed → return immediately (resolution_attempted=false)
  if blocked:
    for each requirement:
      planResolution() → knowledge_resolution_plans INSERT
      executeResolutionPlan():
        acquire evidence via strategy
        kge.attemptResolution()  [KG-02/03 assessment]
        persist provenance
    evaluateKnowledgeDecision()  [re-evaluation — KG-04/05]
  return final KgDecisionResult + plans
```

KG-06 CANNOT shortcut to PROCEED. The final outcome is always determined by KG-05.

---

## 3. KG-06 Contract

### A. Resolution strategies

| Strategy | Acquires evidence? | Evidence type |
|----------|-------------------|---------------|
| USE_EXISTING_KNOWLEDGE | Yes, if validated claims exist | RETRIEVED |
| QUERY_CANONICAL_MEMORY | Yes, if memory results found and submitted | RETRIEVED |
| SUBMIT_FOR_VALIDATION | Yes, if evidence_text ≥ 10 chars submitted | INFERRED |
| REQUEST_USER_INFORMATION | No — user notified, awaiting response | N/A |
| BLOCK_ACTION | No — no acquisition attempted | N/A |

### B. Plan lifecycle

```
PLANNED → RESOLVING → EVIDENCE_ACQUIRED → (re-eval) → RESOLVED
                   ↘ BLOCKED (no evidence, non-user strategy)
                   ↘ REASSESSMENT_REQUIRED (user notified, awaiting)
                   ↘ ABANDONED (max_attempts exceeded)
```

### C. Termination budget

`max_attempts` (default 3) enforces bounded resolution. `attempts_used >= max_attempts` → plan ABANDONED, outcome BLOCKED. Unbounded loops are structurally impossible.

### D. Evidence provenance

Every acquisition attempt appends a record to `evidence_provenance` JSONB array:
```json
{
  "acquired_at": "ISO timestamp",
  "strategy": "USE_EXISTING_KNOWLEDGE",
  "source": "existing_knowledge",
  "evidence_ref": "existing:subject...",
  "evidence_type": "RETRIEVED",
  "acquired": true,
  "detail": "2 validated claims; state=KNOWN",
  "attempt": 1,
  "assessment_id": "KRA-..." 
}
```

### E. What KG-06 does NOT do

- Does NOT make final sufficiency decisions (delegates to KG-03/04/05)
- Does NOT bypass the constitutional gate
- Does NOT make AI model calls
- Does NOT use the PETL cluster
- Does NOT insert directly to `knowledge_validation_queue` (uses `submitLesson()`)
- Does NOT create a second memory system
- Does NOT allow unbounded loops

---

## 4. Files Delivered

### 4.1 `migrations/089_knowledge_resolution_plans.sql` (NEW)

Idempotent migration: `knowledge_resolution_plans` table. 8 status values in CHECK constraint; `evidence_provenance JSONB NOT NULL DEFAULT '[]'`; 5 indexes.

### 4.2 `lib/knowledge/knowledge-resolution-engine.js` (NEW — ~310 lines)

Core KG-06 module. Exports (frozen):
- `resolveAndDecide(requirements, decisionCtx, opts)` — main entry point
- `planResolution(gap_id, requirement_id, opts)` — create plan record
- `executeResolutionPlan(plan_id, requirement, opts)` — execute plan with budget
- `RESOLUTION_STRATEGIES` — frozen taxonomy (5 strategies)
- `PLAN_STATUSES` — frozen taxonomy (7 statuses)
- `_planId()` — `KRP-{12 hex}` ID generator
- `_selectStrategy(requirement, opts)` — pure strategy selector

**Key design decisions:**
- `kge` lazy-required inside function bodies (circular dependency prevention)
- `gateway` and `knowledge-validator` lazy-required inside strategy functions
- `_persistPlan` and `_updatePlan` are fail-soft (log and continue)
- Strategy exceptions produce `acquired: false` (fail-closed)
- `max_attempts` enforced at plan-load time; exceeded → ABANDONED

### 4.3 `lib/knowledge/knowledge-gap-engine.js` (MODIFIED)

Added KG-06 re-exports:
```javascript
const _res = require('./knowledge-resolution-engine');
// ...
resolveAndDecide:      _res.resolveAndDecide,
planResolution:        _res.planResolution,
executeResolutionPlan: _res.executeResolutionPlan,
RESOLUTION_STRATEGIES: _res.RESOLUTION_STRATEGIES,
PLAN_STATUSES:         _res.PLAN_STATUSES,
_planId:               _res._planId,
_selectStrategy:       _res._selectStrategy,
```

### 4.4 `tests/knowledge-resolution.test.js` (NEW — 69 tests)

---

## 5. Test Suite — 69 Tests

| Section | Tests | Coverage |
|---------|-------|----------|
| Module contract (KRE-01–06) | 6 | frozen exports, function types |
| RESOLUTION_STRATEGIES taxonomy (KRE-07–12) | 6 | all 5 strategies + frozen |
| PLAN_STATUSES taxonomy (KRE-13–19) | 7 | all 7 statuses + frozen |
| _planId format (KRE-20–21) | 2 | format, uniqueness (200 IDs) |
| _selectStrategy pure function (KRE-22–27) | 6 | caller override, evidence_text, defaults |
| DB-dependent (KRE-28–36) | 9 | graceful without Supabase, input validation |
| KGE re-exports (KRE-37–43) | 7 | all 7 KG-06 exports through kge |
| Architecture invariants (KRE-44–49) | 6 | no constitutional, no PETL, no AI, migration |
| Falsification (FALSIFY-KG06-01–20) | 20 | all 20 mandated falsification attempts |

**Total: 69 tests. Results: 69 passed, 0 failed.**

---

## 6. Falsification Results (20 Attempts — All Blocked)

| # | Attempt | Result |
|---|---------|--------|
| 01 | resolveAndDecide cannot manufacture PROCEED without evaluateKnowledgeDecision | CONFIRMED: must call evaluateKnowledgeDecision |
| 02 | Closed loop re-evaluates after resolution (two evaluateKnowledgeDecision calls) | CONFIRMED: ≥2 calls present in source |
| 03 | RESOLUTION_STRATEGIES is immutable | CONFIRMED: Object.freeze, throws on mutation |
| 04 | PLAN_STATUSES is immutable | CONFIRMED: Object.freeze, throws on mutation |
| 05 | BLOCK_ACTION does not attempt acquisition | CONFIRMED: explicit case returns no-acquisition |
| 06 | REQUEST_USER_INFORMATION strategy acquired=false (cannot PROCEED) | CONFIRMED: acquired=false always |
| 07 | max_attempts budget enforced — exceeded plans become ABANDONED | CONFIRMED: ABANDONED status, max_attempts check |
| 08 | Strategy exception → acquisition.acquired=false (fail-closed) | CONFIRMED: catch block sets acquired=false |
| 09 | No AI model calls | CONFIRMED: no messages.create, no Anthropic instantiation |
| 10 | SUBMIT_FOR_VALIDATION rejects short evidence_text | CONFIRMED: <10 chars → USE_EXISTING_KNOWLEDGE |
| 11 | kge is sole public API (callers use kge) | CONFIRMED: all exports re-exported via kge |
| 12 | No PETL cluster imports | CONFIRMED: no decision-lattice, decision-benchmark, decision-provenance |
| 13 | Uses getSupabaseClient, not createClient | CONFIRMED: no createClient() call |
| 14 | Evidence acquisition through knowledge-validator, not direct KVQ insert | CONFIRMED: uses submitLesson(); no direct KVQ insert |
| 15 | KG-06 acquisition calls KG-02/03 (attemptResolution) | CONFIRMED: attemptResolution called after evidence acquired |
| 16 | Non-array requirements rejected (not silently ignored) | CONFIRMED: throws for object, string, null |
| 17 | Initial PROCEED skips resolution loop (resolution_attempted=false) | CONFIRMED: early return with resolution_attempted=false |
| 18 | planResolution records strategy explicitly in plan | CONFIRMED: resolution_strategy and evidence_provenance in record |
| 19 | Evidence provenance accumulated, not overwritten | CONFIRMED: spread syntax `[...(plan.evidence_provenance || []), entry]` |
| 20 | Existing KG-01/02/03/04/05 exports intact after KG-06 | CONFIRMED: 2091/2091 PASS (0 regressions) |

---

## 7. Architecture Invariants

1. **CLOSED LOOP**: KG-06 never determines final sufficiency — always closes through KG-05
2. **FAIL-CLOSED**: strategy exception → `acquired: false` → BLOCKED; never PROCEED
3. **BOUNDED**: `max_attempts` enforced structurally; exceeded → ABANDONED
4. **AUDIT COMPLETE**: every plan written to `knowledge_resolution_plans` before execution
5. **PROVENANCE CHAIN**: every acquisition attempt appended to `evidence_provenance` JSONB
6. **NO AI CALLS**: `resolveAndDecide()` is deterministic orchestration with no model calls
7. **CANONICAL MEMORY**: `QUERY_CANONICAL_MEMORY` uses `gateway.searchMemory()` + `submitLesson()`
8. **CANONICAL EVIDENCE**: all evidence goes through `knowledge-validator.submitLesson()` → KVQ
9. **SINGLE PUBLIC SURFACE**: callers use `kge.resolveAndDecide()`; not the engine directly
10. **BACKWARDS-COMPATIBLE**: no changes to KG-01 through KG-05 function signatures

---

## 8. Production Verification

- `node --check server.js` → PASS
- `node --check lib/knowledge/knowledge-resolution-engine.js` → PASS
- `node --check lib/knowledge/knowledge-gap-engine.js` → PASS
- `node -e "require('./lib/knowledge/knowledge-resolution-engine')"` → resolves without error
- `node -e "require('./lib/knowledge/knowledge-gap-engine')"` → resolves without error
- Full regression suite: **2091 / 2091 PASS** (0 regressions)
- Migration `089_knowledge_resolution_plans.sql` is idempotent (IF NOT EXISTS)
- No new routes, no server.js changes, no startup path changes

---

## 9. Open Conditions

None introduced by KG-06.

**Inherited limitations from prior KG phases** (unchanged):
- KG-01-L01 through KG-01-L04 (subject matching, deduplication)
- KG-02-L01 through KG-02-L02 (evidence validation improvements)
- KG-03-L01 through KG-03-L05 (evidence evaluator scope)

**KG-06 integration boundary** (documented, not gaps):
- External web search has no canonical authority in APEX — not implemented
- Autonomous API queries have no canonical authority — not implemented
- These are authorised boundaries, not defects

---

## 10. What KG-06 Does NOT Implement

- No modification of the constitutional gate
- No modification of `lib/models/runtime/index.js:execute()`
- No automatic injection into existing routes
- No external web search or autonomous API queries
- No new domain agents
- No broad historical backfill
- No user interface
- No second memory system
- No second governance authority
- No PETL cluster wiring
- No AI model calls

---

## 11. Chain of Evidence

```
CALLER invokes resolveAndDecide(requirements, decisionCtx)
    ↓
evaluateKnowledgeDecision()                      [KG-05 — initial]
    ↓ if can_proceed → return immediately
    ↓ if blocked:
declareRequirement() per requirement             [KG-01]
planResolution() → knowledge_resolution_plans    [KG-06 — plan created]
    ↓
executeResolutionPlan():
    strategy switch:
        USE_EXISTING_KNOWLEDGE → getKnowledgeState()       [KG-01]
        QUERY_CANONICAL_MEMORY → searchMemory() + submitLesson()
        SUBMIT_FOR_VALIDATION  → submitLesson()
        REQUEST_USER_INFORMATION → apex_notifications INSERT
        BLOCK_ACTION           → no acquisition
    ↓ (if acquired)
kge.attemptResolution()                          [KG-02/03 — assessment]
evidence_provenance appended                     [KG-06 — audit]
    ↓
evaluateKnowledgeDecision()                      [KG-05 — re-evaluation]
    ↓
buildKnowledgeContext()                          [KG-04]
assessKnowledgeRequirements()                    [KG-02]
_mapToDecisionOutcome()                          [KG-05]
knowledge_decision_records INSERT                [KG-05 audit]
    ↓
FINAL OUTCOME: PROCEED | PROCEED_WITH_CONDITION | REQUEST_INFORMATION | BLOCKED
    ↓
{ ...KgDecisionResult, resolution_attempted, plans } returned to caller
    ↓
[if can_proceed=true] → CONSTITUTIONAL GATE [unchanged]
    ↓
                      → EA RUNTIME execute() [unchanged]
```

---

## 12. Next Authorised Task

Per the KG-06 mandate:
- KG-06 is now **CERTIFIED**
- Do NOT begin any further KG phases without explicit authorisation
- No automatic continuation
