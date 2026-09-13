# W2-03 Reality Fabric Baseline

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | W2-03-REALITY-FABRIC-BASELINE |
| Phase | 0 — Pre-implementation baseline |
| Date | 2026-07-28 |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Task | W2-03 — Reality Fabric Constitutional Integration |
| Constitutional Runtime | RT-05 (Reality Fabric Runtime) |

---

## 1. CURRENT ARCHITECTURE

### Files in `lib/reality/`

| File | Size | Role |
|------|------|------|
| `lib/reality/fabric.js` | 200 lines | Core orchestrator — mutation entry points, health scoring |
| `lib/reality/reality_loop.js` | ~9.7K | Reality processing loop |
| `lib/reality/gates.js` | ~5.9K | Reality gate evaluations |
| `lib/reality/self-model.js` | — | Self-model management |
| `lib/reality/projections/civilisation.js` | — | Civilisation projection |
| `lib/reality/projections/intelligence.js` | — | Intelligence projection |
| `lib/reality/projections/memory.js` | — | Memory projection |
| `lib/reality/projections/knowledge.js` | — | Knowledge projection |
| `lib/reality/projections/governance.js` | — | Governance projection |

### Core Data Model

Claims travel through a **13-stage lifecycle** (STAGES constant):

```
potential → emergent → observed → verified → contested → revised →
deprecated → superseded → validated → integrated → embedded → critical → evolved
```

Claims are stored in Supabase table `reality_claims` with fields:
`entity_id`, `domain`, `claim_type`, `content`, `stage`, `confidence`, `source`, `evidence`, `projected_by`.

Stage lifecycle events are written to Supabase table `claim_lifecycle_events` with fields:
`claim_id`, `from_stage`, `to_stage`, `trigger`, `actor`, `evidence`.

---

## 2. MUTATION ENTRY POINTS

### 2.1 `claimReality()` — Lines 37–57

**Purpose:** Creates a new reality claim in `potential` stage.

**Data flow:**
1. Validates required parameters (`entityId`, `domain`, `content`, `source`)
2. Validates `claimType` against `VALID_TYPES` enum
3. Inserts into `reality_claims` via Supabase — throws on DB error
4. Calls `_recordEvent({ claimId: data.id, fromStage: null, toStage: 'potential', trigger: 'created', actor: source })` — non-fatal
5. Returns `data.id` (the new claim UUID)

**Before state:** No prior stage (creation event — `fromStage: null`)
**After state:** `stage: 'potential'`
**Actor:** `source` parameter
**Trigger:** `'created'` (hardcoded)

**Constitutional gap:** No ChangeRecord emitted post-mutation.

### 2.2 `advanceClaim()` — Lines 59–74

**Purpose:** Advances an existing claim from its current stage to a new stage.

**Data flow:**
1. Validates `toStage` against `STAGES` enum — throws on invalid
2. Fetches current claim (`stage`, `revision_count`) from DB — throws on fetch failure
3. Builds update object (`stage`, `stage_entered_at`, `updated_at`; increments `revision_count` if `toStage === 'revised'`)
4. Updates `reality_claims` via Supabase — throws on DB error
5. Calls `_recordEvent({ claimId, fromStage: current.stage, toStage, trigger, actor, evidence })` — non-fatal
6. Returns `{ claimId, fromStage: current.stage, toStage }`

**Before state:** `current.stage` from DB fetch
**After state:** `toStage` parameter
**Actor:** `actor` parameter (default: `'system'`)
**Trigger:** `trigger` parameter

**Constitutional gap:** No ChangeRecord emitted post-mutation.

### 2.3 `updateClaimConfidence()` — Lines 76–81

**Purpose:** Updates `confidence` value only. NOT a stage lifecycle transition.

**Constitutional assessment:** ChangeRecord is for stage transitions (per `ChangeRecord.CONSTITUTIONAL.constitutional_note`: "constitutional event type for every stage transition"). Confidence updates are NOT stage transitions — `_recordEvent()` is NOT called here. **W2-03 does NOT wire this function.**

---

## 3. INTERNAL AUDIT HOOK

### `_recordEvent()` — Lines 172–185

```javascript
async function _recordEvent({ claimId, fromStage, toStage, trigger, actor, evidence = {} }) {
    try {
        await _sb().from('claim_lifecycle_events').insert({
            claim_id: claimId, from_stage: fromStage || null,
            to_stage: toStage, trigger, actor: actor || 'system', evidence,
        });
    } catch (_) {
        // non-fatal: audit trail must never block primary operations
    }
}
```

Called by both `claimReality()` and `advanceClaim()` after successful DB writes. Errors are silently caught. This is the existing audit mechanism — ChangeRecord emission is additive to it.

---

## 4. EXISTING EXPORTS

```javascript
module.exports = {
    STAGES, HEALTH_DIMS,
    claimReality, advanceClaim, updateClaimConfidence,
    getClaimsForEntity, getClaimsByDomain,
    scoreRealityHealth, getRealityHealth,
    getSystemRealityHealth, writeBaselineCheckpoint,
};
```

No `Object.freeze(module.exports)` on this file — it is a production subsystem file (not a constitutional type file). W2-03 does not freeze it.

---

## 5. PETL INTEGRATION CONTEXT

From W2-02: `lib/runtime/execution-transaction.js` emits `AccountabilityRecord` on `finalize()` with `operation_identifier: txId`. The Reality Fabric functions are called inside PETL-governed request transactions. `ChangeRecord` does not have a dedicated PETL tx_id field — provenance is maintained via temporal correlation: the ChangeRecord's `claim_ref` + `timestamp` uniquely identifies the mutation within the PETL transaction window.

From W2-01: `lib/memory/gateway.js` `getHistoricalState()` returns `HistoricalStateQueryResult` with optional `petlTxId`. Reality Fabric mutations are independent of memory queries in the W2-03 wiring scope.

---

## 6. GAP ANALYSIS (Pre-W2-03)

| Gap | Severity | Resolution |
|-----|----------|------------|
| `claimReality()` produces no ChangeRecord | HIGH (Gate 3 criterion) | Wire in W2-03 |
| `advanceClaim()` produces no ChangeRecord | HIGH (Gate 3 criterion) | Wire in W2-03 |
| No constitutional evidence of any reality mutation | HIGH | Resolved by W2-03 |

---

## 7. MIGRATION APPROACH

**Integration point:** Immediately after `await _recordEvent(...)` in both `claimReality()` and `advanceClaim()`. This is the canonical mutation boundary — all DB writes have succeeded, all field values are available, no blocking of the return path.

**Pattern:** Fire-and-forget per W2-CONSTITUTIONAL-WIRING-PATTERN.md.

**Require path from `lib/reality/fabric.js`:**
```javascript
const { ChangeRecord } = require('../constitutional-types/change-record');
const constitutionalStore = require('../runtime/constitutional-store');
```

**Field mapping:**

| ChangeRecord Field | claimReality() | advanceClaim() |
|-------------------|----------------|----------------|
| `change_id` | `CR-${data.id}-${Date.now()}` | `CR-${claimId}-${Date.now()}` |
| `claim_ref` | `data.id` | `claimId` |
| `stage_from` | *(omitted — creation event)* | `current.stage` |
| `stage_to` | `'potential'` | `toStage` |
| `transition_vector` | `'created'` | `trigger \|\| 'advance'` |
| `timestamp` | `new Date().toISOString()` | `new Date().toISOString()` |
| `actor_ref` | `source` | `actor \|\| 'system'` |
| `historical_anchor_ref` | `ANCHOR-${data.id}` | `ANCHOR-${claimId}` |

**Note on `historical_anchor_ref`:** `HistoricalAnchor` is a Wave 2 P1 type (not yet wired). The `ANCHOR-${claimId}` format is a forward-compatible reference — the anchor_id that will be established when W2-03 P1 wiring is added. The field satisfies the `required: true, type: 'string'` constraint.

**Files to modify:** `lib/reality/fabric.js` (1 file only)

**Files to create:**
- `docs/implementation/W2-03-REALITY-FABRIC-BASELINE.md` (this document)
- `tests/reality-fabric-constitutional.test.js`
- `docs/constitutional-architecture/implementation/W2-03-REALITY-FABRIC-IMPLEMENTATION-RECORD.md`

---

*W2-03 Reality Fabric Baseline created: 2026-07-28. Constitutional authority: APEX-CONSTITUTION-v1.0.*
