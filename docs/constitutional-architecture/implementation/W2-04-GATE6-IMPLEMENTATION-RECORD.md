# W2-04 Gate 6 Implementation Record

---

## 1. OBJECTIVE

Add Gate 6 (ChangeRecord integrity validation) to `lib/runtime/constitutional-gate.js` as the 6th sequential check in `evaluate()`. Create `fabric.getChangeHistory()` as the designated async data source for Gate 6 callers. No new constitutional wiring pattern required.

**W2-04 constitutional gate capability after this task:**

| Gate | Check | Module |
|------|-------|--------|
| 1 | Authority resistance | authority-resistance |
| 2 | Risk assessment | risk-monitor |
| 3 | Modification governance | modification-governor |
| 4 | Deception detection | deception-detector |
| 5 | Confabulation guard | confabulation-guard |
| **6** | **ChangeRecord integrity** | **constitutional-gate (inline)** |

---

## 2. BASELINE ARCHITECTURE

See `docs/implementation/W2-04-GATE6-BASELINE.md` for full pre-implementation state.

**Key pre-W2-04 gaps:**
- `constitutional-gate.js` had 5 checks; no ChangeRecord validation existed
- `options.changeRecord` was ignored by `evaluate()`
- `fabric.js` had no `getChangeHistory()` function
- No designated async data source for Gate 6 callers

---

## 3. INTEGRATION DESIGN

### Design Decision — Synchronous inline validation, not fire-and-forget

W2-04 does NOT use the fire-and-forget wiring pattern (V1.0). Gate 6 performs synchronous inline validation of a pre-fetched ChangeRecord passed by the caller via `options.changeRecord`. This is architecturally distinct from emission patterns:

- W2-01, W2-02, W2-03: **emit** a constitutional type record as a side-effect of an operation
- W2-04: **validate** an existing ChangeRecord passed in by a caller who pre-fetched it

No new constitutional wiring pattern is required. Gate 6 is a structural gate check, not an emission site.

See `docs/implementation/W2-04-IDR-GATE6-ASYNC-CONSTRAINT.md` for the full architectural decision record explaining why inline async calls are not possible.

### Gate 6 Integration Point

**File:** `lib/runtime/constitutional-gate.js`  
**Location:** After Gate 5 (confabulation guard), before `return {}` at end of `evaluate()`

**Validation logic:**
```javascript
const valid = cr !== null &&
              cr.__type     === 'ChangeRecord' &&
              cr.__baseline === 'APEX-CONSTITUTION-v1.0' &&
              typeof cr.claim_ref === 'string' && cr.claim_ref !== '' &&
              typeof cr.stage_to  === 'string' && cr.stage_to  !== '' &&
              typeof cr.actor_ref === 'string' && cr.actor_ref !== '';
```

**Behaviour matrix:**

| `options.changeRecord` | Gate 6 outcome |
|------------------------|---------------|
| `undefined` (not provided) | `applicable: false` — no verdict change |
| Valid ChangeRecord | `valid: true` — no verdict change |
| Invalid/malformed | `valid: false` → `DENY` + `CHANGE_RECORD_INVALID` risk |
| `null` | `valid: false` → `DENY` + `CHANGE_RECORD_INVALID` risk |
| Exception during check | `failOpen: true` — verdict unchanged, error logged in auditTrail |

**Audit trail entry:**
```javascript
{ check: 'changeRecord', valid, change_id, claim_ref, stage_to }
// or when not applicable:
{ check: 'changeRecord', applicable: false }
// or on exception:
{ check: 'changeRecord', failOpen: true, error: err.message }
```

### Data Source Integration Point

**File:** `lib/reality/fabric.js`  
**Location:** New function before `_recordEvent()`, exported in `module.exports`

```javascript
async function getChangeHistory(claimId, limit = 20) {
    const { data, error } = await _sb()
        .from('claim_lifecycle_events')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) throw new Error(`getChangeHistory failed: ${error.message}`);
    return data || [];
}
```

This function reads from `claim_lifecycle_events` (the existing audit table populated by `_recordEvent()`). It is the canonical pre-fetch mechanism for callers that need to pass a ChangeRecord to Gate 6.

### Call Flow (Gate 6 enabled)

```
Caller (async context)
    ↓
fabric.getChangeHistory(claimId)    ← async pre-fetch
    ↓ returns lifecycle events
Caller selects/constructs ChangeRecord from events
    ↓
gate.evaluate(ctx, { changeRecord: cr })    ← synchronous gate call
    ↓
Gate 6 validates cr.{__type, __baseline, claim_ref, stage_to, actor_ref}
    ↓
verdict + auditTrail returned to caller
```

---

## 4. CONSTITUTIONAL TYPES USED

| Type | Runtime | Role |
|------|---------|------|
| `ChangeRecord` | RT-05 | Validation target — Gate 6 checks these objects when provided by callers |

Gate 6 does not **emit** a ChangeRecord. It **validates** one. The type is consumed, not produced.

---

## 5. WAVE 2 CONSTRAINT — ASYNC/SYNC

The full W2-04 specification (I1-IMPLEMENTATION-SEQUENCING) states Gate 6 should call `fabric.getChangeHistory(claimId)`. This is async (Supabase query), but `evaluate()` is synchronous and cannot be made async without breaking the PETL chain:

```
PETL begin() [sync] → preflight.run() [sync] → gate.evaluate() [sync]
```

**Wave 2 resolution:** Caller pre-fetch pattern. Callers who need Gate 6 to validate a ChangeRecord call `getChangeHistory()` asynchronously before calling the gate. Gate 6 validates the result synchronously via `options.changeRecord`.

**Wave 3 full resolution:** Full async temporal integrity, including `timestamp vs temporal_validity_ms` boundary check, when PETL `begin()` becomes async or constitutional-store gains a synchronous index.

---

## 6. FILES CHANGED

| File | Change |
|------|--------|
| `lib/runtime/constitutional-gate.js` | Added Gate 6 check (check #6 in `evaluate()`, after confabulation guard, before `return`) |
| `lib/reality/fabric.js` | Added `getChangeHistory()` function and added it to `module.exports` |

**Files created:**

| File | Purpose |
|------|---------|
| `tests/gate6-constitutional.test.js` | 26 Gate 6 tests |
| `docs/implementation/W2-04-GATE6-BASELINE.md` | Phase 0 baseline |
| `docs/implementation/W2-04-IDR-GATE6-ASYNC-CONSTRAINT.md` | Architectural decision record for sync/async constraint |
| `docs/constitutional-architecture/implementation/W2-04-GATE6-IMPLEMENTATION-RECORD.md` | This document |

---

## 7. TESTS ADDED

**File:** `tests/gate6-constitutional.test.js` (26 tests, all passing)

| Category | Tests |
|----------|-------|
| changeRecord absent — no-op | 2 |
| Valid ChangeRecord — pass-through | 5 |
| Null ChangeRecord — DENY | 3 |
| Invalid ChangeRecord field violations (7 variants) | 7 |
| DENY sticky on clean context | 1 |
| Gate sequence integrity (checks present, order, count) | 3 |
| Gate 6 failOpen on exception | 1 |
| Existing gate behaviour regression | 4 |
| **Total** | **26** |

---

## 8. VALIDATION EVIDENCE

### Gate 6 Tests
```
Results: 26 passed, 0 failed
```

### W2-03 Regression (Reality Fabric)
```
Results: 34 passed, 0 failed
```

### W2-02 Regression (PETL)
```
Results: 18 passed, 0 failed
```

### W2-01 Regression (Memory Gateway)
```
Results: 29 passed, 0 failed
```

### Syntax Checks
```
node --check lib/runtime/constitutional-gate.js  → PASS
node --check lib/reality/fabric.js               → PASS
```

### Module Load Verification
```
node -e "const f = require('./lib/reality/fabric'); console.log(typeof f.getChangeHistory);"
function
```

### Offline Gate 6 Smoke Test
```javascript
// absent changeRecord:
evaluate({...}, {})                          → { check: 'changeRecord', applicable: false }
// valid ChangeRecord:
evaluate({...}, { changeRecord: validCR })   → { check: 'changeRecord', valid: true, ... }
// invalid ChangeRecord:
evaluate({...}, { changeRecord: badCR })     → verdict: 'DENY', risks: ['CHANGE_RECORD_INVALID']
// null changeRecord:
evaluate({...}, { changeRecord: null })      → verdict: 'DENY', risks: ['CHANGE_RECORD_INVALID']
```

### Audit Trail Sequence Verification
```
Gate audit checks for /status path:
[ 'authority', 'risk', 'deception', 'confabulation', 'changeRecord' ]
Gate audit checks for /self-modify/memory path:
[ 'authority', 'risk', 'modification', 'deception', 'confabulation', 'changeRecord' ]
changeRecord is always last — confirmed.
```

---

## 9. KNOWN LIMITATIONS

| ID | Limitation | Severity | Resolution |
|----|-----------|----------|-----------|
| L-01 | Wave 2 Gate 6 validates only structural fields (`__type`, `__baseline`, required strings); temporal integrity (`timestamp vs temporal_validity_ms`) is not checked | MEDIUM | Wave 3: full async temporal check when PETL chain becomes async or constitutional-store gains sync index |
| L-02 | `getChangeHistory()` returns raw `claim_lifecycle_events` rows; Gate 6 caller must construct/extract the ChangeRecord object — no automatic mapping | LOW | Acceptable for Wave 2 pre-fetch pattern; Wave 3 may add a typed mapping layer |
| L-03 | `historical_anchor_ref` validation not part of Gate 6 (forward reference — HistoricalAnchor not yet wired) | LOW | Inherited from W2-03 L-01; Wave 2 P1 HistoricalAnchor wiring will resolve |

---

## 10. NEXT DEPENDENCIES

| Task | Dependency on W2-04 |
|------|-------------------|
| W2-08 Governance Attestation | Not blocked by W2-04 — parallel |
| W2-09 Civilization Consensus | Not blocked by W2-04 — parallel |
| W2-07 Knowledge | Not blocked by W2-04 — parallel |
| W2-06 Domain Registry | Not blocked by W2-04 — parallel |
| Wave 3 Full Temporal Integrity | Depends on W2-04 Gate 6 infrastructure being in place |

---

*W2-04 Gate 6 Implementation Record created: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*  
*Constitutional authority: D8-v1.0; A0-v1.1.1; I1-IMPLEMENTATION-SEQUENCING §W2-04; WAVE-2-MASTERPLAN.md.*
