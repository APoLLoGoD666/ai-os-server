# KG-07 — Longitudinal Knowledge Integrity: Certification Record

**Programme**: APEX Knowledge-Gap Phase  
**Task ID**: KG-07  
**Status**: CERTIFIED  
**Date**: 2026-08-26  
**Baseline commit**: (KG-06 HEAD — 2091 tests passing before KG-07)  
**Test result**: 2168 / 2168 PASS (0 regressions); KG-07 suite: 77 / 77 PASS

---

## 1. Mandate

KG-07 establishes **longitudinal knowledge integrity**: once a knowledge requirement is satisfied, that satisfaction must not be trusted indefinitely. Evidence expires, becomes stale, gets superseded, or contradictions emerge. KG-07 detects these conditions and surfaces them as actionable reassessment triggers — without making any final sufficiency decisions itself.

Prior to KG-07:
- KG-01 through KG-06 detected, assessed, contextualised, gated, and resolved knowledge gaps
- **No mechanism existed to invalidate a previously satisfied requirement** — SATISFIED was final
- KG-07 closes this gap: it monitors longitudinal validity and triggers reassessment when validity has changed

KG-07 is **detection and signalling only**. It does NOT make final sufficiency decisions. Every re-evaluation after reassessment routes through the canonical KG-03 → KG-04 → KG-05 chain.

---

## 2. Phase 1 — Observation (Production Path Audit)

### 2.1 Reassessment Trigger Types (canonical)

| Trigger | Condition |
|---------|-----------|
| EXPIRATION | Evidence has passed its temporal validity window (freshness_state=EXPIRED or confidence below threshold) |
| STALENESS | Evidence is approaching expiration (freshness_state=STALE); should be refreshed |
| CONTRADICTION | Open contradictions detected for the requirement subject via KG-03 |
| REQUIREMENT_CHANGE | The knowledge requirement itself changed materially (new_required_subject ≠ prior subject) |
| EVIDENCE_SUPERSESSION | Newer authoritative evidence supersedes the satisfying evidence ref |

### 2.2 Integration Point

KG-07 sits **above KG-01/02/03** but does not replace them. `checkRequirementIntegrity` calls `kge.evaluateEvidenceRef()` (KG-03) and `kge.detectContradictions()` (KG-03) to access canonical evidence state. It does not duplicate that logic.

`kge` is lazy-required inside function bodies to prevent circular dependency (knowledge-gap-engine.js re-exports this module).

### 2.3 State Machine

```
Requirement: SATISFIED
    ↓ checkRequirementIntegrity()
    → still_valid=true: no action
    → still_valid=false (trigger detected):
        triggerReassessment() → knowledge_reassessment_triggers INSERT
                              → gap reopened (RESOLVED → OPEN)
                              → requirement → PENDING
        [caller routes through KG-03/04/05 for re-evaluation]
        → resolveReassessmentTrigger() → RESOLVED

Evidence supersession path:
    supersedEvidence(old_ref, new_ref)
        → KVQ status='superseded' (record preserved — NOT deleted)
        → knowledge_reassessment_triggers INSERT
        → requirement → PENDING (if requirement_id provided)

Decision review path:
    markDecisionForReview(kg_decision_id, trigger_id)
        → trigger.invalidation_state → DECISION_REQUIRES_REVIEW
        → knowledge_decision_records: UNCHANGED (immutable)

Batch scan path:
    scanForExpiredSatisfactions()
        → reads SATISFIED requirements
        → calls checkRequirementIntegrity() per requirement
        → returns { scanned, needs_reassessment, requirements }
        → READ ONLY — caller triggers reassessment per finding
```

---

## 3. KG-07 Contract

### A. Core functions

| Function | Read/Write | Effect |
|----------|-----------|--------|
| `checkRequirementIntegrity(requirement_id, opts)` | Read-only | Returns `{ still_valid, trigger_type, reason }` without modifying state |
| `triggerReassessment(requirement_id, trigger_type, opts)` | Write | Inserts trigger record; reopens gap; sets requirement→PENDING |
| `supersedEvidence(old_ref, new_ref, opts)` | Write | KVQ status→superseded (preserved); inserts trigger; sets requirement→PENDING |
| `markDecisionForReview(kg_decision_id, trigger_id, reason)` | Write (trigger only) | Sets trigger invalidation_state→DECISION_REQUIRES_REVIEW; decision record unchanged |
| `scanForExpiredSatisfactions(opts)` | Read-only | Batch check; returns findings; does NOT create triggers |
| `resolveReassessmentTrigger(trigger_id, opts)` | Write | Sets trigger→RESOLVED; closes trigger lifecycle |

### B. Constitutional immutability

`KC-` evidence references cannot be superseded via `supersedEvidence()`. The function checks `old_ref.startsWith('KC-')` and skips the KVQ update, returning `constitutional_record: true`. Constitutional records are immutable by design.

### C. Decision immutability

`markDecisionForReview()` does NOT modify `knowledge_decision_records`. Prior decisions are immutable historical facts. The function updates the `knowledge_reassessment_triggers` record (`kg_decision_id_ref` + `invalidation_state=DECISION_REQUIRES_REVIEW`). The prior decision record is preserved unchanged.

### D. Evidence provenance

Evidence supersession marks the old record `status='superseded'` in `knowledge_validation_queue`. The record is **never deleted**. This preserves audit provenance. The existing KG-03 evaluator already handles `status='superseded'` by setting `derived_confidence=0, derived_completeness=0`, so superseded evidence naturally fails sufficiency checks.

### E. What KG-07 does NOT do

- Does NOT make final sufficiency decisions (delegates to KG-03/04/05)
- Does NOT bypass the constitutional gate
- Does NOT make AI model calls
- Does NOT delete historical evidence (supersession marks; never deletes)
- Does NOT automatically rollback real-world actions
- Does NOT create a second memory or knowledge system
- Does NOT import `lib/memory/gateway.js` (knowledge ≠ memory invariant)
- Does NOT grant or revoke constitutional authority (knowledge ≠ governance)

---

## 4. Files Delivered

### 4.1 `migrations/090_knowledge_reassessment_triggers.sql` (NEW)

Idempotent migration: `knowledge_reassessment_triggers` table. 5 trigger types in CHECK constraint; 4 invalidation states in CHECK constraint; `DEFAULT 'REASSESSMENT_REQUIRED'`; 5 indexes. All CREATE statements use IF NOT EXISTS.

### 4.2 `lib/knowledge/knowledge-integrity.js` (NEW — ~550 lines)

Core KG-07 module. Exports (frozen):
- `checkRequirementIntegrity(requirement_id, opts)` — pure integrity check
- `triggerReassessment(requirement_id, trigger_type, opts)` — state-changing trigger
- `supersedEvidence(old_ref, new_ref, opts)` — evidence supersession
- `markDecisionForReview(kg_decision_id, trigger_id, reason)` — decision linkage
- `scanForExpiredSatisfactions(opts)` — batch read-only scan
- `resolveReassessmentTrigger(trigger_id, opts)` — lifecycle close
- `REASSESSMENT_TRIGGERS` — frozen taxonomy (5 trigger types)
- `INVALIDATION_STATES` — frozen taxonomy (4 states)
- `_triggerId()` — `KRT-{12 hex uppercase}` ID generator

**Key design decisions:**
- `kge` lazy-required inside function bodies (circular dependency prevention)
- `_persistTrigger` is fail-soft (log and continue; never throws)
- Gap reopen and requirement update are individually fail-soft
- `supersedEvidence` guards `KC-` prefix unconditionally
- `markDecisionForReview` updates trigger record only; decision record is never touched
- `scanForExpiredSatisfactions` is read-only; callers must call `triggerReassessment` per finding

### 4.3 `lib/knowledge/knowledge-gap-engine.js` (MODIFIED)

Added KG-07 require and re-exports:
```javascript
const _integrity = require('./knowledge-integrity');
// Added to exports:
checkRequirementIntegrity:   _integrity.checkRequirementIntegrity,
triggerReassessment:         _integrity.triggerReassessment,
supersedEvidence:            _integrity.supersedEvidence,
markDecisionForReview:       _integrity.markDecisionForReview,
scanForExpiredSatisfactions: _integrity.scanForExpiredSatisfactions,
resolveReassessmentTrigger:  _integrity.resolveReassessmentTrigger,
REASSESSMENT_TRIGGERS:       _integrity.REASSESSMENT_TRIGGERS,
INVALIDATION_STATES:         _integrity.INVALIDATION_STATES,
_triggerId:                  _integrity._triggerId,
```

### 4.4 `tests/knowledge-integrity.test.js` (NEW — 77 tests)

---

## 5. Test Suite — 77 Tests

| Section | Tests | Coverage |
|---------|-------|----------|
| Module contract (KGI-01–10) | 10 | frozen exports, function types, all symbols |
| REASSESSMENT_TRIGGERS taxonomy (KGI-11–18) | 8 | all 5 types, frozen, mutation throws |
| INVALIDATION_STATES taxonomy (KGI-19–25) | 7 | all 4 states, frozen, mutation throws |
| _triggerId format (KGI-26–28) | 3 | format, uniqueness (200 IDs), uppercase |
| checkRequirementIntegrity (KGI-29–31) | 3 | input validation, graceful without DB |
| triggerReassessment (KGI-32–36) | 5 | input validation, invalid type, valid types |
| supersedEvidence (KGI-37–40) | 4 | input validation, same-ref rejection, KC- guard |
| markDecisionForReview (KGI-41–43) | 3 | input validation, decision immutability |
| scanForExpiredSatisfactions (KGI-44–46) | 3 | DB-graceful, sync-safe, result structure |
| resolveReassessmentTrigger (KGI-47) | 1 | input validation |
| KGE re-exports (KGI-48–56) | 9 | all 9 KG-07 symbols through kge |
| Architecture invariants (KGI-57–62) | 6 | no constitutional, no PETL, no AI, no createClient, no gateway, migration |
| Falsification (FALSIFY-KG07-01–15) | 15 | all 15 mandated falsification attempts |

**Total: 77 tests. Results: 77 passed, 0 failed.**

---

## 6. Falsification Results (15 Attempts — All Blocked)

| # | Attempt | Result |
|---|---------|--------|
| 01 | REASSESSMENT_TRIGGERS is immutable — mutation throws | CONFIRMED: Object.freeze, throws on mutation |
| 02 | INVALIDATION_STATES is immutable — mutation throws | CONFIRMED: Object.freeze, throws on mutation |
| 03 | supersedEvidence cannot overwrite old_ref with itself | CONFIRMED: throws "must be different" |
| 04 | KC- constitutional refs are not updated in KVQ | CONFIRMED: startsWith('KC-') guard; constitutional_record returned |
| 05 | triggerReassessment rejects arbitrary strings as trigger_type | CONFIRMED: 6 bad types all throw |
| 06 | checkRequirementIntegrity cannot produce still_valid without evaluating evidence | CONFIRMED: still_valid:true only after evaluateEvidenceRef + detectContradictions |
| 07 | scanForExpiredSatisfactions is read-only — no INSERT in function body | CONFIRMED: no .insert() call in scan function |
| 08 | markDecisionForReview does not modify knowledge_decision_records | CONFIRMED: no .update() on knowledge_decision_records |
| 09 | module exports are frozen — cannot add new exports at runtime | CONFIRMED: Object.freeze, throws on injection |
| 10 | knowledge-integrity does not import lib/memory/gateway | CONFIRMED: no memory/gateway import |
| 11 | supersedEvidence preserves old record — no DELETE call in function | CONFIRMED: no .delete() call in supersedEvidence |
| 12 | KGE remains fully backwards-compatible — KG-01 through KG-06 exports intact | CONFIRMED: detectGap, attemptResolution, evaluateEvidenceRef, buildKnowledgeContext, evaluateKnowledgeDecision, resolveAndDecide all present |
| 13 | trigger taxonomy values match migration CHECK constraint | CONFIRMED: all 5 values present in migration SQL |
| 14 | invalidation state values match migration CHECK constraint | CONFIRMED: all 4 states present in migration SQL |
| 15 | kge re-exports all 9 KG-07 symbols (no partial re-export) | CONFIRMED: all 9 symbols exported through canonical surface |

---

## 7. Architecture Invariants

1. **PROVENANCE PRESERVED**: superseded evidence stays in DB; `status='superseded'` marks; no DELETE
2. **CONSTITUTIONAL IMMUTABILITY**: KC- records cannot be superseded via this path; guard is unconditional
3. **DECISION IMMUTABILITY**: `knowledge_decision_records` not modified; trigger record updated instead
4. **READ-ONLY SCAN**: `scanForExpiredSatisfactions` detects but does not act; callers trigger reassessment
5. **KNOWLEDGE ≠ MEMORY**: module does not import `lib/memory/gateway.js`
6. **KNOWLEDGE ≠ GOVERNANCE**: reassessment triggers do not grant or revoke constitutional authority
7. **FAIL-SOFT PERSISTENCE**: `_persistTrigger` logs and continues; never throws
8. **LAZY REQUIRE**: `kge` required inside function bodies; no circular dependency at module load time
9. **NO AI CALLS**: all functions deterministic; no model calls; no Anthropic instantiation
10. **BACKWARDS-COMPATIBLE**: KG-01 through KG-06 function signatures unchanged; 0 regressions

---

## 8. Production Verification

- `node --check server.js` → PASS
- `node --check lib/knowledge/knowledge-integrity.js` → PASS
- `node --check lib/knowledge/knowledge-gap-engine.js` → PASS
- `node -e "require('./lib/knowledge/knowledge-integrity')"` → resolves without error
- `node -e "require('./lib/knowledge/knowledge-gap-engine')"` → resolves without error
- Full regression suite: **2168 / 2168 PASS** (0 regressions)
- Migration `090_knowledge_reassessment_triggers.sql` is idempotent (IF NOT EXISTS)
- No new routes, no server.js changes, no startup path changes

---

## 9. Open Conditions

None introduced by KG-07.

**Inherited limitations from prior KG phases** (unchanged):
- KG-01-L01 through KG-01-L04 (subject matching, deduplication)
- KG-02-L01 through KG-02-L02 (evidence validation improvements)
- KG-03-L01 through KG-03-L05 (evidence evaluator scope)

**KG-07 integration boundary** (documented, not gaps):
- Automated scheduling of `scanForExpiredSatisfactions` not implemented — intended to be caller-driven
- Automated promotion from REASSESSMENT_REQUIRED → KNOWLEDGE_INVALIDATED not implemented — requires operator or higher-layer orchestration
- These are authorised boundaries, not defects

---

## 10. Chain of Evidence

```
Longitudinal validity check:
    CALLER invokes checkRequirementIntegrity(requirement_id, opts)
        ↓
    Load requirement from knowledge_requirements               [DB read]
        if status ≠ SATISFIED → { still_valid: false, trigger_type: null }
        if new_required_subject ≠ req.required_subject → REQUIREMENT_CHANGE
        ↓
    kge.evaluateEvidenceRef(ref, opts)                        [KG-03]
        if status='superseded' → EVIDENCE_SUPERSESSION
        if freshness_state='EXPIRED' → EXPIRATION
        if freshness_state='STALE' → STALENESS
        ↓
    kge.detectContradictions(subject, domain_id)              [KG-03]
        if has_contradictions → CONTRADICTION
        ↓
    confidence check
        if derived_confidence < MIN_CONFIDENCE → EXPIRATION
        ↓
    { still_valid: true }

Reassessment trigger path:
    CALLER invokes triggerReassessment(requirement_id, trigger_type, opts)
        ↓
    _persistTrigger → knowledge_reassessment_triggers INSERT   [KG-07 audit]
    gap reopen     → knowledge_gaps.status → OPEN             [fail-soft]
    req PENDING    → knowledge_requirements.status → PENDING  [fail-soft]
        ↓
    { trigger_id, gap_id, requirement_id }
        ↓
    [CALLER routes through KG-06 resolveAndDecide() or KG-03/04/05 directly]
        ↓
    resolveReassessmentTrigger(trigger_id) → RESOLVED

Evidence supersession path:
    CALLER invokes supersedEvidence(old_ref, new_ref, opts)
        ↓
    if old_ref.startsWith('KC-') → skip KVQ update (constitutional_record=true)
    else → KVQ.update({ status: 'superseded' })               [record preserved]
        ↓
    _persistTrigger → knowledge_reassessment_triggers INSERT   [KG-07 audit]
    [if requirement_id] → requirement → PENDING                [fail-soft]
        ↓
    { trigger_id, old_ref, new_ref, constitutional_record }
```

---

## 11. Next Authorised Task

Per the KG-07 mandate:
- KG-07 is now **CERTIFIED**
- Do NOT begin any further KG phases without explicit authorisation
- No automatic continuation
