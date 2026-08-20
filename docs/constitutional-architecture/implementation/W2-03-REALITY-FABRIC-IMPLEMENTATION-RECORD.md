# W2-03 Reality Fabric Implementation Record

---

## 1. OBJECTIVE

Wire the APEX Reality Fabric subsystem to the constitutional runtime layer so that every reality claim mutation produces a `ChangeRecord` (RT-05) constitutional record. After W2-03, APEX can answer:

- What reality state changed?
- Which operation caused the change?
- Which principal/runtime initiated it?
- Which constitutional authority permitted it?
- What was the before state (prior stage)?
- What is the after state (new stage)?
- What evidence supports the mutation?

---

## 2. BASELINE ARCHITECTURE

See `docs/implementation/W2-03-REALITY-FABRIC-BASELINE.md` for full pre-implementation state.

**Key pre-W2-03 gaps:**
- `lib/reality/fabric.js` had no constitutional record emission at any mutation boundary
- `claimReality()` created claims with no `ChangeRecord` emitted
- `advanceClaim()` advanced claim stages with no `ChangeRecord` emitted
- Existing audit trail (`claim_lifecycle_events` table via `_recordEvent()`) produces raw DB rows, not constitutional objects
- No RT-05 interface object was produced for provenance chain consumption

---

## 3. INTEGRATION DESIGN

### Integration Points

Two wiring sites added to `lib/reality/fabric.js`:

**Site 1 — `claimReality()` (line 57, after `await _recordEvent(...)`):**
- Event type: Reality claim creation (initial `potential` stage)
- `stage_from`: absent (creation event — no prior stage)
- `stage_to`: `'potential'` (hardcoded — all claims enter at potential)
- `transition_vector`: `'created'`
- `actor_ref`: `source` parameter

**Site 2 — `advanceClaim()` (line 92, after `await _recordEvent(...)`):**
- Event type: Reality claim stage advance
- `stage_from`: `current.stage` (fetched from DB before update)
- `stage_to`: `toStage` parameter
- `transition_vector`: `trigger || 'advance'`
- `actor_ref`: `actor || 'system'`

**Design decision — wire after `_recordEvent()` not inside it:**
`_recordEvent()` is a fire-and-forget internal helper whose own catch block swallows all errors. Wiring ChangeRecord inside `_recordEvent()` would create nested fire-and-forget patterns and reduce observability. Wiring after `_recordEvent()` at the canonical mutation boundary (after all DB writes succeed) is cleaner, more traceable, and matches the pattern used in W2-02 and W2-01.

**Design decision — not wiring `updateClaimConfidence()`:**
`ChangeRecord` is constitutionally defined as "the constitutional event type for every stage transition" (ChangeRecord.CONSTITUTIONAL.constitutional_note). Confidence updates are NOT stage transitions — `_recordEvent()` is not called in `updateClaimConfidence()`. No ChangeRecord is emitted for confidence-only updates.

### Data Flow (post-W2-03)

```
claimReality() or advanceClaim()
    ↓
DB insert/update succeeds
    ↓
_recordEvent() (existing audit trail — claim_lifecycle_events table)
    ↓
setImmediate → ChangeRecord.create({
  change_id, claim_ref, stage_from?, stage_to,
  transition_vector, timestamp, actor_ref,
  historical_anchor_ref
})
    ↓
setImmediate → constitutionalStore.write(changeRecord)  — fire-and-forget
    ↓
return claimId | { claimId, fromStage, toStage }  — caller unblocked
```

If DB operations fail (before `_recordEvent()`), execution throws and ChangeRecord is never emitted. This is the correct failure-path behavior — constitutional records are only produced on successful mutations.

---

## 4. CONSTITUTIONAL TYPES USED

| Type | Runtime | File | Role |
|------|---------|------|------|
| `ChangeRecord` | RT-05 | `change-record.js` | Primary type — emitted at every reality claim stage transition |

Required fields populated at every wiring site:

| Field | claimReality() | advanceClaim() |
|-------|---------------|----------------|
| `change_id` | `CR-${data.id}-${Date.now()}` | `CR-${claimId}-${Date.now()}` |
| `claim_ref` | `data.id` | `claimId` |
| `stage_from` | *(omitted — creation event)* | `current.stage` |
| `stage_to` | `'potential'` | `toStage` |
| `transition_vector` | `'created'` | `trigger \|\| 'advance'` |
| `timestamp` | `new Date().toISOString()` | `new Date().toISOString()` |
| `actor_ref` | `source` | `actor \|\| 'system'` |
| `historical_anchor_ref` | `ANCHOR-${data.id}` | `ANCHOR-${claimId}` |

**Note on `historical_anchor_ref`:** `HistoricalAnchor` is a Wave 2 P1 type (not wired in W2-03). The `ANCHOR-${claimId}` format is a forward-compatible reference — the anchor_id that will be established when HistoricalAnchor wiring is added. The field satisfies `required: true, type: 'string'` constraint.

---

## 5. PETL PROVENANCE CONNECTION

`ChangeRecord` does not have a dedicated PETL `tx_id` field. Per W2-CONSTITUTIONAL-WIRING-PATTERN.md §6: "If the type schema does not have a field for the PETL operation_id, do not add one — do not alter type schemas."

The PETL provenance chain is maintained through temporal correlation:

```
PETL begin() → KernelOperationManifest (era) [W2-02]
    ↓
Request handler calls claimReality() / advanceClaim() inside PETL transaction
    ↓
ChangeRecord.claim_ref = claimId  — uniquely identifies the mutated claim
ChangeRecord.actor_ref = source/actor  — request-level provenance
ChangeRecord.timestamp = mutation time  — temporally bounded within PETL txId window
    ↓
PETL finalize() → AccountabilityRecord.operation_identifier = txId [W2-02]
```

Constitutional audit (RT-04) can correlate: `AccountabilityRecord.timestamp` + `ChangeRecord.timestamp` + `ChangeRecord.claim_ref` to trace any reality mutation to its originating PETL transaction.

**Orphan ChangeRecord prevention:** ChangeRecord is only emitted after successful DB writes (`claimReality insert succeeded` / `advanceClaim update succeeded`). Failed mutations throw before reaching the wiring site — no orphan records are created.

**Rejected mutation evidence:** Mutations that fail DB operations propagate errors to the PETL layer, which emits a `RejectionRecord` (RT-03, W2-02) representing the request-level rejection. Reality Fabric does not independently emit `RejectionRecord` — that is RT-03 responsibility, already wired in W2-02.

---

## 6. FILES CHANGED

| File | Change |
|------|--------|
| `lib/reality/fabric.js` | Added 2 requires (lines 8–9); added ChangeRecord wiring in `claimReality()` (after line 57); added ChangeRecord wiring in `advanceClaim()` (after line 92) |

**Files created:**

| File | Purpose |
|------|---------|
| `docs/implementation/W2-03-REALITY-FABRIC-BASELINE.md` | Phase 0 baseline document |
| `tests/reality-fabric-constitutional.test.js` | 34 offline wiring tests |
| `docs/constitutional-architecture/implementation/W2-03-REALITY-FABRIC-IMPLEMENTATION-RECORD.md` | This document |

---

## 7. TESTS ADDED

**File:** `tests/reality-fabric-constitutional.test.js` (34 tests, all passing)

| Category | Tests |
|----------|-------|
| `ChangeRecord.create()` — type validation | 9 |
| Constitutional immutability (frozen type objects) | 2 |
| Before/after state capture | 3 |
| PETL provenance linkage | 2 |
| Fire-and-forget wiring pattern (mock store) | 2 |
| Rejected mutation non-emission | 2 |
| Existing Reality Fabric export preservation | 11 |
| **Duplicate setImmediate callbacks (async timing)** | 3 |
| **Total** | **34** |

---

## 8. VALIDATION EVIDENCE

### New Test Results

```
Results: 34 passed, 0 failed
```

### Registry Test Suite (PC-01/02 regression)

```
Results: 538 passed, 3 failed, 0 skipped
```

3 failures are pre-existing domain count assertion drift — unchanged. Zero new failures.

### PETL Tests (W2-02 regression)

```
Results: 18 passed, 0 failed
```

### Memory Gateway Tests (W2-01 regression)

```
Results: 29 passed, 0 failed
```

### Syntax Checks

```
node --check lib/reality/fabric.js   → PASS
node --check server.js               → PASS
```

### Module Load Verification

```
node -e "const { ChangeRecord } = require('./lib/constitutional-types/change-record'); console.log('loaded:', !!ChangeRecord);"
loaded: true

node -e "const f = require('./lib/reality/fabric'); console.log(typeof f.claimReality);"
function
```

### Constitutional Registry Verification (PC-02)

```
type count: 83
all baselines correct: true
all frozen: true
```

### Offline ChangeRecord Create Verification

```javascript
// claimReality() field set (no stage_from):
ChangeRecord.create({ change_id: 'CR-test-001', claim_ref: 'x', stage_to: 'potential',
    transition_vector: 'created', timestamp: '...', actor_ref: 'src',
    historical_anchor_ref: 'ANCHOR-x' })
// → { __type: 'ChangeRecord', __baseline: 'APEX-CONSTITUTION-v1.0', __runtime: 'RT-05',
//     stage_from: undefined, stage_to: 'potential', ... }

// advanceClaim() field set (with stage_from):
ChangeRecord.create({ ..., stage_from: 'potential', stage_to: 'emergent', ... })
// → validate(): { valid: true, errors: [] }
```

---

## 9. KNOWN LIMITATIONS

| ID | Limitation | Severity | Resolution |
|----|-----------|----------|-----------|
| L-01 | `historical_anchor_ref` is a forward reference (`ANCHOR-${claimId}`) — `HistoricalAnchor` type is not yet wired | MEDIUM | Wave 2 P1: HistoricalAnchor wiring will formalize the anchor_id format and enable O(1) history lookup |
| L-02 | `ChangeRecord` does not carry a direct PETL tx_id field — provenance chain uses temporal correlation | LOW | ChangeRecord schema has no tx_id field; acceptable per W2-CONSTITUTIONAL-WIRING-PATTERN.md §6 |
| L-03 | `constitutionalStore.write()` is a stub (MR-08) — records are not persisted | MEDIUM | Wave 3 Supabase persistence will resolve this. Documented per W2 boundary MR-08. |
| L-04 | `updateClaimConfidence()` does not emit ChangeRecord | NONE | Correct by design — confidence updates are not stage transitions |

---

## 10. NEXT DEPENDENCIES

Tasks that depend on W2-03 being VERIFIED:

| Task | Dependency |
|------|-----------|
| W2-08 Governance Attestation | W2-02 complete (already is); W2-03 not blocking |
| W2-09 Civilization Consensus | W2-02 complete; W2-03 not blocking |
| W2-07 Knowledge | W2-02 complete; W2-03 not blocking |
| W2-06 Domain Registry | W2-02 complete; W2-03 not blocking |
| W2-04 Gate 6 Fabric Query | Depends on W2-03 (ChangeRecord production); W2-03 now satisfies prerequisite |
| W2-11 Gate 3 Assessment | W2-03 contributes `ChangeRecord` to Gate 3 criterion count |

---

*W2-03 Reality Fabric Implementation Record created: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*
*Constitutional authority: D8-v1.0; A0-v1.1.1; R5-v1.0 RS-07; I1-SEQUENCING §W1-04; D3 RF-A1.*
