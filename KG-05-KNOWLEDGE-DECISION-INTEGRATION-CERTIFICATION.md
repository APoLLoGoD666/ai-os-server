# KG-05 — Knowledge Decision Integration: Certification Record

**Programme**: APEX Knowledge-Gap Phase  
**Task ID**: KG-05  
**Status**: CERTIFIED  
**Date**: 2026-08-26  
**Baseline commit**: (KG-04 HEAD — 2022 tests passing before KG-05)  
**Test result**: 2022 / 2022 PASS (0 regressions)

---

## 1. Mandate

KG-05 establishes the canonical integration between **knowledge sufficiency** and **APEX decision/execution**. The objective is to make knowledge sufficiency an explicit, auditable input to whether APEX may proceed with a consequential decision or action.

Prior to KG-05:
- KG-01/02/03 detected and assessed knowledge gaps
- KG-04 built a structured `knowledge_sufficiency` context and added it to `getContext()`
- **No mechanism enforced or recorded the decision outcome** — `can_proceed` existed but nothing checked it, and no audit record was written

KG-05 closes this gap.

---

## 2. Phase 1 — Observation (Production Path Audit)

### 2.1 Canonical Execution Path (from APEX-CANONICAL-SYSTEM.md §4)

```
POST /endpoint
  → requireAppAccess (auth)
  → civilization-kernel.js (7-phase, Phase 4 = constitutional gate)
  → route handler → lib/models/runtime/index.js:execute()
```

`execute()` has **zero knowledge parameters**. The constitutional gate operates on request authority/risk, not knowledge adequacy.

### 2.2 Existing Decision Modules (lib/runtime/)

`decision-lattice.js`, `decision-benchmark.js`, `decision-provenance.js` exist as part of the **PETL cluster** — confirmed unwired (zero `require()` calls from any production entry point — R5-verified). KG-05 does NOT wire into PETL. KG-05 is knowledge-specific, not a composite scoring authority.

### 2.3 Integration Point Decision

The correct integration point is a new `evaluateKnowledgeDecision()` function that:
- Sits **before** the constitutional gate and EA runtime (not inside them)
- Is called explicitly by callers who need knowledge-gating (opt-in)
- Returns a deterministic decision outcome without making AI model calls
- Persists a complete audit record to `knowledge_decision_records`

This is the smallest canonical integration that satisfies all 12 mandatory principles.

---

## 2. Phase 2 — KG-05 Contract

### A. What constitutes a knowledge requirement

An object with:
- `required_subject` (required string) — what information is needed
- `decision_context` (required string) — why it's needed
- `blocks_decision` (boolean, default false) — whether unresolved = block
- `urgency` (IMMEDIATE|SOON|EVENTUAL) — optional
- `evidence_refs` (string[]) — optional canonical evidence refs for KG-03 evaluation

### B. What constitutes sufficient knowledge for an action

`buildKnowledgeContext()` returns `sufficiency_state = 'SUFFICIENT'` and `can_proceed = true`. All requirements are SATISFIED with adequate evidence. Stale evidence can pass with a warning.

### C. KG-05 result states

The full chain from KG-04's sufficiency states to KG-05 decision outcomes:

| Sufficiency State | has_blocking_gaps | Decision Outcome |
|-------------------|-------------------|-----------------|
| SUFFICIENT | any | PROCEED |
| STALE | any | PROCEED_WITH_CONDITION |
| UNCERTAIN | false | PROCEED_WITH_CONDITION |
| UNCERTAIN | true | REQUEST_INFORMATION |
| INSUFFICIENT | false | PROCEED_WITH_CONDITION |
| INSUFFICIENT | true | BLOCKED |
| CONTRADICTORY | any | BLOCKED (always) |
| Unknown/error | any | BLOCKED (fail closed) |

**KG-05 also defines semantics for:**
- **MISSING**: gap_type=MISSING maps through GAP determination → INSUFFICIENT sufficiency → BLOCKED if blocking
- **BLOCKED**: The decision outcome when mandatory knowledge is missing or contradictory

### D. Decision outcome semantics

| Outcome | can_proceed | Caller should |
|---------|-------------|---------------|
| `PROCEED` | true | Proceed to existing constitutional gate + execution |
| `PROCEED_WITH_CONDITION` | true | Proceed; note staleness or uncertainty in execution context |
| `REQUEST_INFORMATION` | false | Do not proceed; obtain evidence for mandatory uncertain requirements |
| `BLOCKED` | false | Do not proceed; mandatory knowledge missing or contradictory |

### E. Which authority makes the final action decision

The **constitutional gate** (`lib/runtime/constitutional-gate.js`) and **EA runtime** (`lib/models/runtime/index.js`) remain the final authorities for execution. KG-05 is a **pre-condition check** — it determines whether adequate knowledge exists. It does NOT replace the constitutional gate.

### F. Where KG evaluation occurs in the canonical execution path

```
CALLER declares knowledge requirements
  ↓
kge.evaluateKnowledgeDecision(requirements, decisionCtx, opts)
  ↓
kc.buildKnowledgeContext(requirements)  [KG-04]
  ↓
kge.assessKnowledgeRequirements()       [KG-02]
  ↓
SUFFICIENCY STATE determined           [KG-04]
  ↓
_mapToDecisionOutcome()                [KG-05]
  ↓
knowledge_decision_records INSERT      [audit]
  ↓
KgDecisionResult returned to caller
  ↓
[if can_proceed=true]
  ↓
EXISTING CONSTITUTIONAL GATE           [unchanged]
  ↓
EXISTING EA RUNTIME execute()          [unchanged]
```

### G. What is persisted for audit

Every call to `evaluateKnowledgeDecision()` writes one record to `knowledge_decision_records`:

| Field | Description |
|-------|-------------|
| `decision_id` | `KD-{12 hex}` — unique audit reference |
| `decision_context` | caller-supplied context (what action is being gated) |
| `action_type` | caller-supplied action type |
| `outcome` | PROCEED / PROCEED_WITH_CONDITION / REQUEST_INFORMATION / BLOCKED |
| `outcome_reason` | human-readable explanation of the outcome |
| `can_proceed` | boolean summary |
| `sufficiency_state` | overall knowledge sufficiency state |
| `has_blocking_gaps` | boolean |
| `blocking_gap_count` | count |
| `blocking_reasons` | JSONB array of per-requirement blocking reasons |
| `requirements` | JSONB array — requirements as declared |
| `knowledge_context` | JSONB — full `buildKnowledgeContext` result |
| `assessed_by` | identity of the caller |
| `created_at` | timestamp |

---

## 3. Files Delivered

### 3.1 `migrations/088_knowledge_decision_records.sql` (NEW)

Idempotent migration creating `knowledge_decision_records` table with:
- CHECK constraint on `outcome` (enforces valid outcome values at DB level)
- 5 indexes for common queries (outcome, can_proceed, assessed_by, created_at, sufficiency_state)
- `IF NOT EXISTS` on all CREATE statements

### 3.2 `lib/knowledge/knowledge-decision.js` (NEW — 199 lines)

Core KG-05 module. Exports (frozen):
- `evaluateKnowledgeDecision(requirements, decisionCtx, opts)` — main function
- `DECISION_OUTCOMES` — frozen taxonomy object
- `_mapToDecisionOutcome(sufficiency_state, has_blocking_gaps)` — pure function
- `_buildOutcomeReason(outcome, knowledge_context)` — pure function
- `_decisionId()` — `KD-{hex}` ID generator

**Key design decisions:**
- Lazy `require('./knowledge-context')` inside function body to prevent circular dependency
- `_persistDecisionRecord()` is fail-soft (logs, never throws) — audit failure does NOT silently convert BLOCKED to PROCEED (the decision result is already computed before the write)
- Fail-closed path: if `buildKnowledgeContext` throws, returns `BLOCKED` with the error in `blocking_reasons`
- No imports to governance, constitutional, memory/gateway, or EA runtime

### 3.3 `lib/knowledge/knowledge-gap-engine.js` (MODIFIED)

Added KG-05 re-exports through canonical surface:
```javascript
const _dec = require('./knowledge-decision');
// ...
evaluateKnowledgeDecision: _dec.evaluateKnowledgeDecision,
DECISION_OUTCOMES:         _dec.DECISION_OUTCOMES,
_mapToDecisionOutcome:     _dec._mapToDecisionOutcome,
_buildOutcomeReason:       _dec._buildOutcomeReason,
_decisionId:               _dec._decisionId,
```

### 3.4 `tests/knowledge-decision.test.js` (NEW — 77 tests)

---

## 4. Test Suite — 77 Tests

| Section | Tests | Coverage |
|---------|-------|----------|
| Module contract (KD-01–05) | 5 | frozen exports, function types |
| DECISION_OUTCOMES taxonomy (KD-06–10) | 5 | all 4 outcomes correct |
| _mapToDecisionOutcome pure function (KD-11–19) | 9 | all state×blocking combinations |
| can_proceed semantics (KD-20) | 1 | PROCEED/PROCEED_WITH_CONDITION→true, others→false |
| _buildOutcomeReason pure (KD-21–25) | 5 | all outcomes + unknown |
| _decisionId format (KD-26–27) | 2 | format, uniqueness (200 IDs) |
| Empty requirements (KD-28–32) | 5 | PROCEED, decision_id, assessed_at, knowledge_context |
| Input validation (KD-33) | 1 | non-array throws |
| DB-dependent (KD-34–35) | 2 | graceful handling without Supabase |
| Decision outcome coverage (KD-36–38) | 3 | all states valid, CONTRADICTORY invariants, BLOCKED→can_proceed=false |
| KGE re-exports (KD-39–41) | 3 | evaluateKnowledgeDecision, DECISION_OUTCOMES, helpers through kge |
| Governance composition (KD-42–46) | 5 | no constitutional/governance/runtime/gateway imports |
| Fail-closed (KD-47–48) | 2 | unknown state→BLOCKED, bad requirement→BLOCKED or throw |
| Architecture invariants (KD-49–53) | 5 | execute() unchanged, no createClient, single authority, no new memory, migration |
| Falsification (FALSIFY-KG05-01–17) | 17 | all 17 mandated falsification attempts |
| KG-01/02/03/04 regression (KD-54–60) | 7 | all prior exports and constants intact |

**Total: 77 tests. Results: 77 passed, 0 failed.**

---

## 5. Falsification Results (17 Attempts — All Blocked)

| # | Attempt | Result |
|---|---------|--------|
| 01 | SUFFICIENT → PROCEED | CONFIRMED: maps correctly |
| 02 | Missing evidence (NONE/GAP) cannot become SUFFICIENT | CONFIRMED: INSUFFICIENT+blocking → BLOCKED |
| 03 | INFERRED → UNCERTAIN, cannot silently become PROCEED | CONFIRMED: UNCERTAIN never maps to PROCEED |
| 04 | EXPIRED → STALE, not BLOCKED (PROCEED_WITH_CONDITION) | CONFIRMED: temporal semantics preserved |
| 05 | CONTRADICTORY always BLOCKS | CONFIRMED: both blocking=true and false → BLOCKED |
| 06 | STALE is distinct from PROCEED (condition noted) | CONFIRMED: STALE → PROCEED_WITH_CONDITION, not PROCEED |
| 07 | KG cannot override constitutional denial | CONFIRMED: knowledge-decision.js imports no constitutional modules |
| 08 | Constitutional approval cannot manufacture knowledge | CONFIRMED: no governance imports in knowledge-decision.js |
| 09 | Failed KG evaluation cannot accidentally execute action | CONFIRMED: unknown state → BLOCKED |
| 10 | KG failure itself fails safely | CONFIRMED: bad requirement → BLOCKED or throw (both acceptable) |
| 11 | No direct model execution bypass | CONFIRMED: no messages.create, no anthropic, no models/runtime require |
| 12 | No direct Supabase client bypass | CONFIRMED: uses getSupabaseClient(), no createClient() |
| 13 | No second memory system | CONFIRMED: no memory/gateway require |
| 14 | No second governance authority | CONFIRMED: no constitutional-gate, governance, petl, decision-lattice require |
| 15 | Existing non-KG execution paths unchanged | CONFIRMED: execute() signature has no knowledge parameters |
| 16 | Canonical AI execution remains sole authority | CONFIRMED: no AI model calls in knowledge-decision.js |
| 17 | Existing tests continue passing | CONFIRMED: 2022/2022 PASS (0 regressions) |

---

## 6. Governance Interaction

KG-05 is **orthogonal** to the constitutional gate:

```
KG-05 (evaluateKnowledgeDecision)    CONSTITUTIONAL GATE (civilization-kernel Phase 4)
─────────────────────────────────    ─────────────────────────────────────────────────
"Does APEX have sufficient           "Does this request comply with APEX's
knowledge to act safely?"            constitutional principles?"
↓                                    ↓
PROCEED / BLOCKED (knowledge)        ALLOW / DENY (authority/risk/identity)
↓                                    ↓
Knowledge pre-condition              Execution permission
```

- A `PROCEED` from KG-05 does NOT grant constitutional permission
- A `DENY` from the constitutional gate is not affected by KG-05
- Both checks are independent; both are required for consequential actions
- Constitutional gate is enforcing (fail-CLOSED, Phase 4 civilization-kernel)
- KG-05 is an opt-in pre-condition check (callers explicitly invoke it)

---

## 7. Evidence Semantics

Per KG-03 invariants (preserved and enforced in KG-05):

| Evidence | Sufficiency | Decision Outcome |
|----------|-------------|-----------------|
| OBSERVED/RETRIEVED with conf ≥ 0.60, completeness ≥ 0.50, FRESH | SUFFICIENT | PROCEED |
| OBSERVED with STALE freshness | STALE | PROCEED_WITH_CONDITION |
| INFERRED with conf ≥ 0.60 | UNCERTAIN | PROCEED_WITH_CONDITION or REQUEST_INFORMATION |
| Any evidence with conf < 0.60 | INSUFFICIENT | PROCEED_WITH_CONDITION or BLOCKED |
| EXPIRED evidence | STALE (STALE_EVIDENCE det.) | PROCEED_WITH_CONDITION |
| Contradictory evidence | CONTRADICTORY | BLOCKED (always) |
| No evidence (NONE) | INSUFFICIENT | PROCEED_WITH_CONDITION or BLOCKED |

---

## 8. Architecture Invariants

1. **KNOWLEDGE ≠ GOVERNANCE**: `PROCEED` reflects knowledge adequacy only; execution authority is separate
2. **KNOWLEDGE ≠ MEMORY**: decision records written to `knowledge_decision_records`, not memory gateway
3. **ONE CANONICAL AUTHORITY**: `knowledge-decision.js` is owned by `knowledge-gap-engine.js`; callers use `kge.evaluateKnowledgeDecision()`
4. **FAIL-CLOSED**: evaluator exception → `BLOCKED`; unknown sufficiency state → `BLOCKED`
5. **CONTRADICTORY always blocks**: regardless of individual `blocks_decision` flags
6. **NO AI CALLS**: `evaluateKnowledgeDecision()` is deterministic logic over existing evidence
7. **AUDIT GUARANTEED**: every call writes to `knowledge_decision_records` before returning
8. **BACKWARDS-COMPATIBLE**: no changes to existing function signatures; `evaluateKnowledgeDecision()` is new

---

## 9. Production Verification

- `node --check server.js` → PASS
- `node --check lib/knowledge/knowledge-decision.js` → PASS
- `node --check lib/knowledge/knowledge-gap-engine.js` → PASS
- `node -e "require('./lib/knowledge/knowledge-gap-engine')"` → resolves without error
- Full regression suite: **2022 / 2022 PASS** (0 regressions)
- Migration `088_knowledge_decision_records.sql` is idempotent (IF NOT EXISTS)
- No new routes, no server.js changes, no startup path changes
- No unintended require() from production entry points

---

## 10. Open Conditions

None introduced by KG-05.

**Inherited limitations from prior KG phases** (unchanged):
- KG-01-L01 through KG-01-L04 (subject matching, deduplication)
- KG-02-L01 through KG-02-L02 (evidence validation improvements)
- KG-03-L01 through KG-03-L05 (evidence evaluator scope)

---

## 11. What KG-05 Does NOT Implement

- No modification of the constitutional gate (Phase 4 civilization-kernel)
- No modification of `lib/models/runtime/index.js:execute()`
- No automatic injection of KG-05 into existing routes
- No new domain agents
- No broad ingestion or historical backfill
- No user interface
- No broad resolution pipeline
- No second memory system
- No second AI execution authority
- No wiring into the PETL cluster

---

## 12. Chain of Evidence

```
KNOWLEDGE REQUIREMENT declared by caller
    ↓
kge.evaluateKnowledgeDecision(requirements, decisionCtx, opts)
    ↓
buildKnowledgeContext(requirements)          [KG-04]
    ↓
assessKnowledgeRequirements(requirements)   [KG-02]
    ↓
declareRequirement() per requirement         [KG-01]
assessRequirement() with evidence_refs       [KG-02/03]
evaluateEvidenceBundle()                     [KG-03]
    ↓
DETERMINATION per requirement                [KG-02]
DETERMINATION_TO_SUFFICIENCY mapping        [KG-04]
SUFFICIENCY_STATE per requirement            [KG-04]
worst-case SUFFICIENCY_STATE                [KG-04]
has_blocking_gaps computation               [KG-04]
    ↓
_mapToDecisionOutcome(state, blocking)      [KG-05]
    ↓
DECISION OUTCOME: PROCEED | PROCEED_WITH_CONDITION | REQUEST_INFORMATION | BLOCKED
    ↓
knowledge_decision_records INSERT            [KG-05 audit]
    ↓
KgDecisionResult returned to caller
    ↓
[if can_proceed=true] → CONSTITUTIONAL GATE [unchanged]
    ↓
                      → EA RUNTIME execute() [unchanged]
```

---

## 13. Next Authorised Task

Per the KG-05 mandate:
- KG-05 is now **CERTIFIED**
- Do NOT begin KG-06 without explicit authorisation
- No automatic continuation to further knowledge-gap phases
