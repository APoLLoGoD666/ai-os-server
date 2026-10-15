# W2-04 Gate 6 Baseline — Pre-Implementation State

**Task:** W2-04 Gate 6 ChangeRecord Validation Gate  
**Date captured:** 2026-07-28  
**Purpose:** Phase 0 baseline — documents the state of `constitutional-gate.js` before W2-04 changes

---

## 1. FILE STATE

**File:** `lib/runtime/constitutional-gate.js`  
**Pre-W2-04 line count:** ~184 lines  
**Module exports (pre-W2-04):** `{ VERDICT, evaluate, DEFAULT_TIMEOUT_MS }`

---

## 2. GATE STRUCTURE (PRE-W2-04)

`evaluate(ctx, options)` ran 5 checks in sequence:

| # | Check | Module | Condition |
|---|-------|--------|-----------|
| 1 | authority | `authority-resistance` | Always |
| 2 | risk | `risk-monitor` | Always |
| 3 | modification | `modification-governor` | Only if path matches `MOD_PATH_PATTERNS` |
| 4 | deception | `deception-detector` | Always |
| 5 | confabulation | `confabulation-guard` | Always |

**No Gate 6 existed.** No check for ChangeRecord integrity or constitutional change record validation.

---

## 3. `fabric.js` STATE (PRE-W2-04)

**File:** `lib/reality/fabric.js`  
**Pre-W2-04 exports:** `{ STAGES, HEALTH_DIMS, claimReality, advanceClaim, updateClaimConfidence, getClaimsForEntity, getClaimsByDomain, scoreRealityHealth, getRealityHealth, getSystemRealityHealth, writeBaselineCheckpoint }`

**`getChangeHistory()` did not exist.** No designated data source for Gate 6 callers.

---

## 4. CONSTITUTIONAL GAP

| Gap | Impact |
|-----|--------|
| No ChangeRecord validation in the gate | Constitutional gate could ALLOW requests despite malformed or absent ChangeRecord |
| No `getChangeHistory()` in fabric.js | No designated async data source for callers to pre-fetch ChangeRecord |
| `options.changeRecord` parameter not defined | Gate silently ignored any changeRecord passed by callers |

---

## 5. W2-03 PREREQUISITE STATE

W2-03 was VERIFIED and CERTIFIED before W2-04 began. Key outputs consumed by W2-04:

- `fabric.js` now emits `ChangeRecord` objects at `claimReality()` and `advanceClaim()` mutation boundaries
- `ChangeRecord` type is live in `lib/constitutional-types/change-record.js`
- `constitutionalStore.write()` is active (stub — MR-08)
- Constitutional wiring pattern V1.0 is designated MATURE and MANDATORY

---

*W2-04 baseline captured: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*
