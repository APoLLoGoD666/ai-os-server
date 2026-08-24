# T4-02 Certification — RT-11 CausalModel + AssumptionRegister Bootstrap

**Task:** T4-02  
**Status:** CERTIFIED  
**Date:** 2026-08-20  
**Wave:** APEX — WAVE 4  
**Baseline:** APEX-CONSTITUTION-v1.0  

---

## 1. Phase 0 — T4-01 Verification (Independent)

T4-01 independently verified before proceeding:

| Claim | Verified |
|-------|---------|
| 20/20 tests pass (re-run) | PASS |
| Zero regressions | PASS — rt12 30/30, rt13 30/30, deliberation 30/30 |
| RT14-INV-1 through RT14-INV-6 all enforced | PASS — source inspection |
| OCR-first ordering structural | PASS — Step 1 before Step 2 |
| RTR unconditional | PASS — Step 3 outside all conditionals |
| CMDR conditional | PASS — Step 4 inside `if (divergenceDetected)` |
| RT12-INV-5 enforced | PASS — `issuing_runtime_attestation: true` hardcoded |
| No PETL/assembler changes | PASS — grep 0 matches; git status confirmed |

**T4-01 VERIFIED. Proceeding.**

---

## 2. Next Task Determination

Authoritative source: `WAVE-4-RECOMPUTED-EXECUTION-ROADMAP.md` §6 §9

Critical path after T4-01: **(T4-02, T4-06 parallel)**

T4-02 selected as next because:
- On critical path (T4-02 → T4-03 → T4-04 → T4-05)
- Listed first numerically among parallel successors
- T4-06 is terminal (no dependents) and can follow

---

## 3. Phase 2 — Falsification Attempts

| Attempt | Result |
|---------|--------|
| Missing CausalModel/AssumptionRegister types? | CLEARED — both in civilizational-decision-proposal.js |
| Circular reference AR←→CM? | CLEARED — F-04 pre-assignment pattern (same as rt12-bootstrap) |
| Test T3-12-09 fails (_buildDrParticipants 5-count)? | CLEARED — count preserved; cmId is optional param |
| Hidden PETL dependency? | CLEARED — none |
| Hidden assembler dependency? | CLEARED — none |
| T4-01 RTR required before CausalModel creation? | CLEARED — bootstrap creates CM independently; RTR triggers future TOC-4 updates |
| RS-35 PROH-R8 violation (sub-civilizational CM)? | CLEARED — scope_classification='civilizational' enforced |

**T4-02 AUTHORIZED.**

---

## 4. Files Changed

| File | Action |
|------|--------|
| `lib/civilization/rt11-bootstrap.js` | CREATED — `formCausalModel()` |
| `lib/civilization/deliberation-registry.js` | PATCHED — 3 surgical edits |
| `tests/rt11-bootstrap.test.js` | CREATED — 20 tests |

---

## 5. deliberation-registry.js Patch Detail

Three surgical edits — no structural change to existing logic:

1. Added `const { formCausalModel } = require('./rt11-bootstrap');` (1 line)
2. Changed `_buildDrParticipants()` to `_buildDrParticipants(cmId)` — Theory of Change participant uses real cm_id when available, BOOTSTRAP fallback when absent (backward-compatible)
3. Added `formCausalModel({ drId, cumVersionRef })` call inside `formDeliberationAndDecision()` before participants are built; passes `cmId` to `_buildDrParticipants(cmId)`

---

## 6. Constitutional Objects Produced by `formCausalModel()`

| Step | Object | Lifecycle |
|------|--------|-----------|
| 1 | AssumptionRegister (AR) | ACTIVE — causal_model_ref forward-references cmId (F-04) |
| 2 | CausalModel (CM) | REGISTERED — assumption_register_ref = arId |

---

## 7. Constitutional Limitations

| ID | Scope | Resolution |
|----|-------|-----------|
| L-RT11-01 | causal_chain_description bootstrap only | Documents Wave 3→Wave 4 causal pathway; full analysis deferred |
| L-RT11-02 | assumptions bootstrap-level only | 3 priors (BOOT-ASM-01 through BOOT-ASM-03); full set requires TheoryOfChange deliberation |
| L-RT11-03 | TOC-4/TOC-5 deferred | lifecycle_state=REGISTERED; transition to CURRENT on first operational deliberation |
| L-RT11-04 | RTR trigger deferred | Bootstrap CM created without triggering RTR; RTR-triggered updates deferred |
| L-RT11-05 | CausalModel-BOOTSTRAP placeholder resolved | deliberation-registry participants updated via cmId when formCausalModel() succeeds |

---

## 8. Test Results

```
T4-02: 20 tests — 20 PASS, 0 FAIL
```

---

## 9. Regression Status

| Test Suite | Before | After |
|-----------|--------|-------|
| T3-12 deliberation-record | 30/30 | 30/30 |
| T3-13 rt12-bootstrap | 30/30 | 30/30 |
| T3-15 rt13-bootstrap | 30/30 | 30/30 |
| T4-01 rt14-bootstrap | 20/20 | 20/20 |

**0 regressions.**

---

## 10. Scope Compliance

| Check | Result |
|-------|--------|
| No PETL changes | NONE |
| No assembler changes | NONE |
| No RT-14 redesign | NONE |
| No unauthorized architecture | NONE |
| No parallel storage created | NONE |
| Patch confined to deliberation-registry.js + new files | CONFIRMED |

---

## 11. Remaining Wave 4 Dependencies

| Task | Status | Dependency |
|------|--------|-----------|
| T4-06 | PENDING | Can proceed now (parallel to T4-02, no dependents) |
| T4-03 | BLOCKED ON T4-02 | T4-02 COMPLETE — T4-03 now available |
| T4-04 | BLOCKED ON T4-03 | — |
| T4-05 | BLOCKED ON T4-04 | — |

---

**Certified by:** T4-02 implementation pass  
**Constitutional authority:** A0-v1.1.1 §3.12 R8; R11-v1.3-canonical.md RS-07; D7 Part 8 TOC-3 TOC-4 TOC-5
