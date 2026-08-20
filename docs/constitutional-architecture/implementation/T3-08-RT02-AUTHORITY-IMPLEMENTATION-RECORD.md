# T3-08 — RT-02 Authority Grant Infrastructure: Implementation Record

**Task:** T3-08 — RT-02 Authority Grant Infrastructure  
**Wave:** Wave 3, Tier 3  
**Date:** 2026-07-29  
**Status:** COMPLETE  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Authority:** D6 §4.2 (OBSERVATION authority type); D-2 §X (explicit authority); RT02-INV-5 (immediate revocation); D8 INV-4 (no fabrication); IDR-W2-11-001 Resolution Step 5; WAVE-3-AUTHORIZATION-REPORT.md § T3-08

---

## 1. OBJECTIVE

Implement bootstrap RT-02 authority grant infrastructure so that every ObservationRecord produced by `lib/reality/fabric.js:claimReality()` carries a valid, resolvable `authority_ref` field. Resolves IDR-W2-11-001 Step 5 — the final remaining blocker.

---

## 2. PHASE 0 FINDINGS SUMMARY

Full audit: `T3-08-RT02-AUTHORITY-PHASE-0-AUDIT.md`.

**Field honesty: 16/16 (100%).**

Five falsification attempts made. All AUTHORIZE. Key findings:

- `DelegationRecord.create()` cannot be called — RT-01, RT-03, FoundingRatification absent. Bootstrap approach required (same pattern as T3-06/T3-07).
- No existing authority grants anywhere in the codebase.
- Bootstrap scope (OBSERVATION, REALITY_CLAIMS, APEX-CONSTITUTION-v1.0 granted_by) is fully derivable from actual system state — no fabrication.
- Revocation tracking implementable with in-memory registry and frozen-record replacement pattern.

**Verdict: AUTHORIZE** (with limitations L-01 through L-06 — all bootstrap boundary).

---

## 3. FILES CREATED

### 3.1 `lib/authority/authority-registry.js` — CREATED

Bootstrap authority grant registry. Runtime-local in-memory Map. Same pattern as T3-06 observer-registry.js and T3-07 observation-channel-registry.js.

**Exports (frozen):** `registerAuthorityGrant`, `getAuthorityGrant`, `listAuthorityGrants`, `revokeAuthorityGrant`, `validateAuthorityGrant`

**Grant record fields:**
| Field | Type | Notes |
|-------|------|-------|
| `authority_id` | string | Deterministic unique identifier |
| `subject_ref` | string | observer_id / actor_id the grant applies to |
| `subject_type` | string | `SYSTEM\|HUMAN\|AGENT` |
| `authority_type` | string | `OBSERVATION\|INTERPRETATION\|DECISION\|PROJECTION\|AUDIT` (D6 Part 4) |
| `grant_scope` | string | Operation types authorized |
| `granted_by` | string | Constitutional source of the grant |
| `grant_timestamp` | string | ISO — generated at registration time |
| `expiry_timestamp` | string\|null | null = indefinite-until-revoked |
| `status` | string | `ACTIVE\|REVOKED` |
| `limitations` | string[] | Honest enumeration of bootstrap limitations (D8 INV-4) |
| `revocation_timestamp` | string | Added on revocation — RT02-INV-5 (immediate) |

**Constitutional boundary:** Bootstrap records — not constitutional `DelegationRecord` instances. Full RT-02 instantiation requires RT-01, RT-03, FoundingRatification (T3-09+ scope).

**Revocation pattern:** `revokeAuthorityGrant()` spreads the frozen existing record into a new frozen object with `status: 'REVOKED'` and `revocation_timestamp`. No mutation of frozen record. Idempotent.

**Expiry validation:** `validateAuthorityGrant()` flags ACTIVE grants with `expiry_timestamp` in the past as expired. No grace period (RT02-INV-5 spirit).

### 3.2 `tests/authority-grants.test.js` — CREATED

33 tests across all registry capabilities.

---

## 4. FILES MODIFIED

### 4.1 `lib/reality/fabric.js` — MODIFIED

**New import (line 13):**
```javascript
const authorityRegistry = require('../authority/authority-registry');
```

**New constant (line 23):**
```javascript
const APEX_AUTHORITY_ID = 'AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP';
```

**Updated `_ensureRT08Bootstrap()` — authority grant registration added:**
```javascript
if (!authorityRegistry.getAuthorityGrant(APEX_AUTHORITY_ID)) {
    authorityRegistry.registerAuthorityGrant({
        authority_id:   APEX_AUTHORITY_ID,
        subject_ref:    APEX_OBSERVER_ID,
        subject_type:   'SYSTEM',
        authority_type: 'OBSERVATION',
        grant_scope:    'REALITY_CLAIMS_OBSERVATION — lib/reality/fabric.js:claimReality()',
        granted_by:     'APEX-CONSTITUTION-v1.0',
        expiry_timestamp: null,
        limitations: [
            'bootstrap authority — no FoundingRatification chain (D3 GI-5; T3-09+ scope)',
            'no RT-01 ActorProfile reference — actor identity bootstrap only',
            'no RT-03 Gate admission of authority grant creation',
            'autonomy_band not formally constrained per D4 §4.3(f) — T3-09+ scope',
        ],
    });
}
```

**Updated observer `known_limitations`** — removed stale "RT-02 authority absent (T3-08)" reference; updated to accurate bootstrap limitation description.

**Updated ObservationRecord fire-and-forget block:**
- Authority validation added (before record construction): if grant absent or REVOKED, emission is skipped with `console.error`
- `authority_ref: APEX_AUTHORITY_ID` added to `obsRecord`
- Removed comment "authority_ref intentionally absent — RT-02 T3-08 scope; D8 INV-4 prohibits fabrication"
- `__wave` updated from `'W3-T3-07'` to `'W3-T3-08'`

**Existing behaviour: fully preserved.** ChangeRecord emission unchanged. Function signature unchanged. Return value unchanged. All exports unchanged.

### 4.2 `tests/observation-record-integration.test.js` — MODIFIED

**Added import:**
```javascript
const authorityRegistry = require('../lib/authority/authority-registry');
```

**Added constant:** `APEX_AUTHORITY_ID = 'AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP'`

**Added `_ensureTestAuthorityBootstrap()`** — idempotent bootstrap of APEX authority grant for test isolation.

**Updated `buildObsRecord()`** — calls `_ensureTestAuthorityBootstrap()` and includes `authority_ref: APEX_AUTHORITY_ID`.

**Replaced test "authority_ref is absent — not fabricated (D8 INV-4)"** (T3-07 limitation test) with:
1. `authority_ref is present and a non-empty string (T3-08)`
2. `authority_ref resolves to registered ACTIVE authority grant`
3. `authority-registry module exports are frozen`
4. `ObservationRecord without authority_ref fails schema validation`

Net: 36 → 39 tests (+3).

---

## 5. AUTHORITY GRANT FIELD MAP

| Field | Source | Available | Notes |
|-------|--------|-----------|-------|
| `authority_id` | `'AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP'` | ✓ | Deterministic constant |
| `subject_ref` | `APEX_OBSERVER_ID` | ✓ | Registered in T3-06 observer registry |
| `subject_type` | `'SYSTEM'` | ✓ | Matches observer_type |
| `authority_type` | `'OBSERVATION'` | ✓ | D6 §4.2 — correct type for claimReality() |
| `grant_scope` | `'REALITY_CLAIMS_OBSERVATION — lib/reality/fabric.js:claimReality()'` | ✓ | Precise, derivable |
| `granted_by` | `'APEX-CONSTITUTION-v1.0'` | ✓ | Actual constitutional source |
| `grant_timestamp` | Generated at `_ensureRT08Bootstrap()` | ✓ | ISO timestamp |
| `expiry_timestamp` | `null` | ✓ | Indefinite-until-revoked |
| `status` | `'ACTIVE'` | ✓ | Default on registration |
| `limitations` | Four honest bootstrap limitations | ✓ | D8 INV-4 — absent capabilities declared |

**ObservationRecord integration:**
| Field | Source | Notes |
|-------|--------|-------|
| `authority_ref` | `APEX_AUTHORITY_ID` | Now present; previously absent (T3-07 L-01) |

---

## 6. TESTS EXECUTED

```
  T3-08 Authority Grant Registry Tests

  PASS  registerAuthorityGrant produces frozen record
  PASS  authority_id matches registered value
  PASS  status defaults to ACTIVE on creation
  PASS  grant_timestamp is a valid ISO string
  PASS  expiry_timestamp defaults to null
  PASS  limitations array is frozen
  PASS  getAuthorityGrant returns null for unknown id
  PASS  getAuthorityGrant returns registered grant
  PASS  listAuthorityGrants includes all registered grants
  PASS  validateAuthorityGrant accepts a valid grant
  PASS  validateAuthorityGrant returns errors array even on success
  PASS  validateAuthorityGrant rejects null
  PASS  validateAuthorityGrant rejects missing authority_id
  PASS  validateAuthorityGrant rejects invalid subject_type
  PASS  validateAuthorityGrant rejects invalid authority_type
  PASS  validateAuthorityGrant rejects invalid status
  PASS  validateAuthorityGrant rejects non-array limitations
  PASS  registerAuthorityGrant throws on duplicate authority_id
  PASS  registerAuthorityGrant throws on missing subject_ref
  PASS  registerAuthorityGrant throws on invalid authority_type
  PASS  revokeAuthorityGrant sets status to REVOKED
  PASS  revokeAuthorityGrant returns updated frozen record
  PASS  revokeAuthorityGrant adds revocation_timestamp
  PASS  revokeAuthorityGrant persists REVOKED state in registry
  PASS  revokeAuthorityGrant is idempotent on already-revoked grant
  PASS  revokeAuthorityGrant throws for unknown authority_id
  PASS  validateAuthorityGrant flags expired ACTIVE grant
  PASS  validateAuthorityGrant accepts future expiry_timestamp
  PASS  APEX bootstrap grant resolves via getAuthorityGrant after fabric bootstrap
  PASS  authority grant subject_type is SYSTEM for APEX observer
  PASS  authority grant authority_type OBSERVATION aligns with D6 §4.2
  PASS  authority-registry module exports are frozen
  PASS  module exports only the five specified functions

  Results: 33 passed, 0 failed
```

**Updated integration suite:**
```
  T3-07 ObservationRecord Integration Tests

  [39 tests — all PASS]

  Results: 39 passed, 0 failed
```

**Regression verification:**
- `tests/reality-fabric-constitutional.test.js`: 34/34 PASS (unchanged)
- `tests/d5-uncertainty.test.js`: 24/24 PASS (unchanged)
- `tests/observer-registry.test.js`: 26/26 PASS (unchanged)

**Total test count across all suites: 156 passing, 0 failing.**

---

## 7. LIMITATIONS

| Ref | Description | Resolution |
|-----|-------------|------------|
| L-01 | Bootstrap authority grants — NOT constitutional DelegationRecord instances. RT-01, RT-03, FoundingRatification absent. | T3-09+: RT-01/RT-03 implementation |
| L-02 | `authorization_chain_ref` absent — no traceable chain to FoundingRatification (D3 GI-5; RT02-INV-6) | T3-09+: FoundingRatification |
| L-03 | `subject_ref` is not a RT-01 ActorProfile reference — bootstrap identifier only | T3-09+: RT-01 integration |
| L-04 | No RT-03 Gate admission of authority grant creation (RT02-PROC-01 Class A) | T3-09+: RT-03 integration |
| L-05 | `autonomy_band` not formally constrained per D4 §4.3(f) | T3-09+: D4 formal parameterization |
| L-06 | Authority grants in-memory only — not persisted to constitutional-store | T3-09+: persist with new migration |

---

## 8. IDR-W2-11-001 RESOLUTION STATUS

| Step | Description | Status |
|------|-------------|--------|
| 1 | D5 uncertainty protocol | RESOLVED (T3-01) |
| 2 | Bootstrap ObserverRegister | RESOLVED (T3-06 + T3-07) |
| 3 | Bootstrap ObservationChannelRecord | RESOLVED (T3-07) |
| 4 | Bootstrap ObserverLimitationRecord | RESOLVED (T3-07) |
| 5 | RT-02 authority grants | **RESOLVED** (T3-08) |
| 6 | contact_timestamp tracking | RESOLVED (T3-07 — L-02 honest proxy) |
| 7 | Wire ObservationRecord at `lib/reality/fabric.js:claimReality()` | RESOLVED (T3-07) |

**IDR-W2-11-001 STATUS: FULLY RESOLVED.** All 7 steps complete. ObservationRecords now emit from production on every `claimReality()` call with all schema-required fields present, including `authority_ref`.

---

## 9. REMAINING WAVE 3 DEPENDENCIES

- **Migration application:** `migrations/080_constitutional_records.sql` must be applied to Supabase before ObservationRecords persist. Until applied, `write()` catches and logs the error (no-throw).
- **T3-09+ (RT-01/RT-03/FoundingRatification):** Resolves bootstrap boundary limitations L-01 through L-06. Enables `DelegationRecord.create()` and full constitutional authority chain.

---

*T3-08 Implementation Record issued: 2026-07-29.*  
*Constitutional authority: APEX-CONSTITUTION-v1.0 → D6 §4.2; D-2 §X; RT02-INV-5; D8 INV-4; IDR-W2-11-001.*  
*Status: COMPLETE. 33/33 new tests pass. 156 total tests pass. IDR-W2-11-001 FULLY RESOLVED.*
