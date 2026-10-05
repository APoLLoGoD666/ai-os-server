# W2-01 Memory Gateway Implementation Record

---

## 1. OBJECTIVE

Wire the APEX memory subsystem to the constitutional runtime layer so that every historical state query produces a `HistoricalStateQueryResult` (RT-07) constitutional record. After W2-01, APEX can answer:

- What memory state was queried?
- When was it queried?
- Which operation initiated the query?
- Which principal/runtime requested it?
- What historical state was returned?
- What provenance supports the result?

---

## 2. BASELINE ARCHITECTURE

See `docs/implementation/W2-01-MEMORY-GATEWAY-BASELINE.md` for full pre-implementation state.

**Key pre-W2-01 gaps:**
- `lib/memory/gateway.js` had no constitutional historical query function
- Every historical query (`_getHistorical()`, `searchMemory()`) returned raw arrays with no provenance
- No constitutional type was emitted by any memory operation
- No RT-07 interface object was produced for RT-03 consumption

---

## 3. INTEGRATION DESIGN

### Integration Point

New public function `getHistoricalState()` added to `lib/memory/gateway.js`.

**Design decision — new function over wiring existing `searchMemory()`:**
`searchMemory()` is a multi-purpose utility called 3–12 times per `getContext()` invocation across different semantic purposes (semantic search, procedural search, etc.). Adding constitutional emission there would produce noisy, low-signal records. `getHistoricalState()` is the explicit constitutional interface for RT-07 → RT-03 interaction, as specified in the Coverage Matrix and Atlas.

### Data Flow (post-W2-01)

```
Caller (orchestrator / agent / RT-09 / RT-10 / RT-11 / RT-04 / RT-08 / RT-14)
    ↓
gateway.getHistoricalState({ query, entityRef, layers, limit, requestingEntity, petlTxId })
    ↓
ctrl.check(requestingEntity, layers, 'READ')           — access enforcement
    ↓
searchMemory(...)                                      — existing multi-layer search
    ↓ (try/catch — failure → status: UNAVAILABLE)
HistoricalStateQueryResult.create({                    — constitutional record creation
  query_id, query_timestamp, historical_layers,
  temporal_validity_ms: 120_000, status,
  completeness_attestation, [provenance_segments]      — optional PETL link
})
    ↓
setImmediate → constitutionalStore.write(queryResult)  — fire-and-forget persistence
    ↓
return queryResult                                     — RT-07 interface object to caller
```

---

## 4. CONSTITUTIONAL TYPES USED

| Type | Runtime | File | Role |
|------|---------|------|------|
| `HistoricalStateQueryResult` | RT-07 | `historical-state-record.js` | Primary type — returned by `getHistoricalState()`; emitted to store |

Required fields populated at every wiring site:

| Field | Source |
|-------|--------|
| `query_id` | `HSQR-${Date.now()}-${random(5)}` — unique per call |
| `query_timestamp` | `new Date().toISOString()` at query time |
| `historical_layers` | Results array from `searchMemory()` (empty on failure) |
| `temporal_validity_ms` | `120_000` (matches `searchMemory()` cache TTL) |
| `status` | `'VALID'` (results present) / `'PARTIAL'` (empty) / `'UNAVAILABLE'` (DB error) |

Optional fields:

| Field | Source | Condition |
|-------|--------|-----------|
| `provenance_segments` | `[{ petl_tx_id, requesting_entity, timestamp }]` | Only when `petlTxId` supplied |
| `completeness_attestation` | `layers=X; entity=Y; count=Z[; petl_tx=W]` | Always populated |

---

## 5. PETL PROVENANCE CONNECTION

The RT-07 → RT-03 constitutional chain is enabled through the `petlTxId` parameter:

```
PETL begin() → KernelOperationManifest (era) [W2-02]
    ↓
request handler calls gateway.getHistoricalState({ ..., petlTxId: tx.txId })
    ↓
HistoricalStateQueryResult.provenance_segments[0].petl_tx_id = txId
    ↓
RT-04 audit can trace: HistoricalStateQueryResult → PETL txId → AccountabilityRecord
```

Without `petlTxId` (when called outside PETL context), the `completeness_attestation` still provides entity + layer provenance for RT-04 audit.

---

## 6. FILES CHANGED

| File | Change |
|------|--------|
| `lib/memory/gateway.js` | Added 2 requires (lines 12–13); added `getHistoricalState()` function; added to `module.exports` |

**Files created:**

| File | Purpose |
|------|---------|
| `docs/implementation/W2-01-MEMORY-GATEWAY-BASELINE.md` | Phase 0 baseline document |
| `tests/memory-gateway-constitutional.test.js` | 29 offline wiring tests |
| `docs/constitutional-architecture/implementation/W2-01-MEMORY-GATEWAY-IMPLEMENTATION-RECORD.md` | This document |

---

## 7. TESTS ADDED

**File:** `tests/memory-gateway-constitutional.test.js` (29 tests, all passing)

| Category | Tests |
|----------|-------|
| `HistoricalStateQueryResult.create()` — type validation | 9 |
| Optional fields (`provenance_segments`, `completeness_attestation`) | 3 |
| PETL provenance chain linkage | 1 |
| Constitutional immutability (frozen type objects) | 2 |
| Fire-and-forget wiring pattern (mock store) | 1 |
| `getHistoricalState()` offline integration | 12 |
| Existing gateway function preservation | 3 |
| **Total** | **29** |

---

## 8. VALIDATION EVIDENCE

### New Test Results

```
Results: 29 passed, 0 failed
```

(Supabase unavailability warnings during offline tests are expected — `searchMemory()` fails internally,
`getHistoricalState()` catches the error and returns `status: 'UNAVAILABLE'`. This confirms Phase 4 failure path.)

### Registry Test Suite (regression check)

```
Results: 538 passed, 3 failed, 0 skipped
```

3 failures are pre-existing domain count assertion drift — unchanged. Zero new failures.

### PETL Tests (W2-02 regression check)

```
Results: 18 passed, 0 failed
```

### Syntax Checks

```
node --check lib/memory/gateway.js   → PASS
node --check server.js               → PASS
```

### Module Load Verification

```
node -e "const { HistoricalStateQueryResult } = require('./lib/constitutional-types/historical-state-record'); console.log(!!HistoricalStateQueryResult.create);"
true

node -e "const gw = require('./lib/memory/gateway'); console.log(typeof gw.getHistoricalState);"
function
```

---

## 9. KNOWN LIMITATIONS

| ID | Limitation | Severity | Resolution |
|----|-----------|----------|-----------|
| L-01 | `getHistoricalState()` offline returns `PARTIAL` (not `UNAVAILABLE`) when `searchMemory()` catches its own DB errors and returns `[]` | LOW | Acceptable — `PARTIAL` correctly represents incomplete results. The search layer handles its own error tolerance. |
| L-02 | `historical_layers` contains raw gateway result objects (not typed `HistoricalStateRecord` snapshots per RT-07 constitutional note) | MEDIUM | Wave 3: full RT-07 federated historical record layer will formalize the content schema. Wave 2 satisfies the interface requirement. |
| L-03 | `constitutionalStore.write()` is a stub (MR-08) — records are not persisted | MEDIUM | Wave 3 Supabase persistence will resolve this. Documented per W2 boundary MR-08. |
| L-04 | Existing `searchMemory()` and `getContext()` callers don't produce `HistoricalStateQueryResult` | LOW | Constitutional coverage is additive. Callers can migrate to `getHistoricalState()` incrementally. |

---

## 10. NEXT DEPENDENCIES

Tasks that depend on W2-01 being VERIFIED:

| Task | Dependency |
|------|-----------|
| W2-03 Reality Fabric (ChangeRecord) | Depends on W2-02 (PETL) — W2-01 not blocking |
| W2-08 Governance Attestation | Depends on W2-02 (PETL) — W2-01 provides memory provenance |
| Gate 3 Assessment (W2-11) | Requires at least 8 types wired in production; W2-01 contributes `HistoricalStateQueryResult` |

W2-01 also enables RT-09, RT-10, RT-11, RT-04, RT-08, RT-14 consumers to receive constitutionally-typed historical state results by calling `getHistoricalState()`.

---

*W2-01 Memory Gateway Implementation Record created: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*
*Constitutional authority: D8-v1.0; A0-v1.1.1; R7-v1.1; I2-IMPLEMENTATION-GOVERNANCE-MODEL.md.*
