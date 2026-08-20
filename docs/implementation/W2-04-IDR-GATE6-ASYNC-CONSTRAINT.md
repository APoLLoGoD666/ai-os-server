# IDR-W2-04-001: Gate 6 Async/Sync Constraint

**IDR Type:** Implementation Decision Record  
**Task:** W2-04 Gate 6 ChangeRecord Validation  
**Date:** 2026-07-28  
**Status:** RESOLVED — Wave 2 constraint documented; Wave 3 resolution path identified

---

## 1. CONFLICT IDENTIFIED

**I1-IMPLEMENTATION-SEQUENCING states:**

> "RT-03: Gate 6 Temporal Integrity (calls fabric.getChangeHistory(claimId))"

This implies Gate 6 should call `fabric.getChangeHistory(claimId)` inline during `evaluate()`.

**Architectural constraint:**

`fabric.getChangeHistory()` is an `async` function — it makes a Supabase database query and returns a Promise.

`constitutional-gate.evaluate()` is `synchronous` — and must remain so. The call chain is:

```
PETL begin()  [synchronous]
    ↓
constitutional-preflight.run()  [synchronous — calls gate.evaluate()]
    ↓
constitutional-gate.evaluate()  [synchronous — returns verdict object directly]
```

`constitutional-preflight.run()` is called from `execution-transaction.js` `begin()` which is synchronous. Making `evaluate()` async would require making `run()` async, which would require making `begin()` async, which would break the PETL integration contract and all downstream callers.

**These two requirements are mutually contradictory under Wave 2 constraints.**

---

## 2. RESOLUTION SELECTED

**Pattern: Caller pre-fetch + synchronous gate validation**

Rather than calling `fabric.getChangeHistory()` inside `evaluate()`:

1. Callers with ChangeRecord context call `fabric.getChangeHistory(claimId)` asynchronously before invoking the gate.
2. The caller constructs or retrieves the relevant `ChangeRecord` object.
3. The caller passes it to `gate.evaluate()` via `options.changeRecord`.
4. Gate 6 validates the pre-fetched ChangeRecord synchronously against constitutional field requirements.

This preserves:
- The synchronous gate contract
- The PETL integration chain
- Gate 6 constitutional enforcement
- The fail-CLOSED timeout model (ARCH-14 INV-RT1)

`fabric.getChangeHistory()` is created as the **designated data source** for Gate 6 callers. The gate comments document this relationship.

---

## 3. WHAT IS VALIDATED VS WHAT IS DEFERRED

**Wave 2 Gate 6 validates (synchronously):**
- `__type === 'ChangeRecord'` — structural type identity
- `__baseline === 'APEX-CONSTITUTION-v1.0'` — constitutional baseline
- `claim_ref` is non-empty string — claim linkage
- `stage_to` is non-empty string — transition target
- `actor_ref` is non-empty string — actor provenance

**Deferred to Wave 3:**
- Temporal integrity: `ChangeRecord.timestamp` vs `temporal_validity_ms` boundary check (requires async time comparison)
- Cross-referencing `change_id` against `claim_lifecycle_events` table entries
- Full provenance chain validation from `historical_anchor_ref` to `HistoricalAnchor` (P1 type, not yet wired)
- Real-time staleness detection for pre-fetched ChangeRecords

---

## 4. RATIONALE FOR NOT USING ALTERNATIVE PATTERNS

**Alternative considered: Make evaluate() return a Promise**

Rejected. Would require making `constitutional-preflight.run()` async, then `execution-transaction.begin()` async. `begin()` is called synchronously in at least 6 request handlers. The refactor scope exceeds Wave 2 boundary and risks breaking runtime integrity.

**Alternative considered: Run Gate 6 in a post-evaluate async pass**

Rejected. The APEX constitutional gate model requires all checks to run within `evaluate()` and contribute to a single unified verdict returned to the caller. A split verdict model introduces temporal inconsistency: a request could be allowed by the synchronous path and blocked asynchronously after operations have begun.

**Alternative considered: Cache ChangeRecord per claimId in a sync-accessible store**

Rejected. A synchronous cache would require a Wave 2 cache infrastructure that does not exist, and introduces staleness risk. The caller pre-fetch pattern is simpler and architecturally cleaner.

---

## 5. WAVE 3 RESOLUTION PATH

Wave 3 targets full async temporal integrity for Gate 6:

1. `constitutionalStore.write()` becomes persistent (MR-08 resolution)
2. Gate 6 can query `constitutional-store` via a synchronous in-memory index maintained by the store
3. Alternatively: PETL `begin()` becomes async, unlocking async gate evaluation
4. Temporal validity check (`timestamp vs temporal_validity_ms`) added to Gate 6
5. `historical_anchor_ref` → `HistoricalAnchor` cross-reference validation added

---

*IDR-W2-04-001 created: 2026-07-28. Constitutional authority: I1-IMPLEMENTATION-SEQUENCING; ARCH-14 INV-RT1.*
