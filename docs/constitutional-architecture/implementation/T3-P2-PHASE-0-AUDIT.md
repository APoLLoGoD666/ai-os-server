# T3-P2 — Observation Pipeline Propagation: Phase 0 Falsification Audit

**Task:** T3-P2 — Observation Pipeline Propagation  
**Wave:** Wave 3, New Prerequisite Tier  
**Date:** 2026-08-03  
**Auditor:** APEX Constitutional Implementation Process  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Verdict: AUTHORIZED — Implementation may proceed**

---

## Audit Objective

Attempt to falsify T3-P2. Prove, if possible, that ObservationRecord identity cannot be propagated to the RT-09 pipeline without fabrication, constitutional violation, or behaviour regression. If any propagation path requires fabricated identifiers, breaks invariants, or cannot be honestly satisfied, the task must STOP and issue an IDR.

---

## Evidence Examined

| File | Lines | Finding |
|------|-------|---------|
| `lib/reality/fabric.js` | 105–216 | `claimReality()`: obsRecordId generated at line 168 INSIDE `setImmediate()` async closure; returns only `data.id` at line 215 — obsRecordId is lost to caller |
| `lib/reality/fabric.js` | 144–213 | Full ObservationRecord emission block: `_obs_ts` captured BEFORE setImmediate (line 153); `obsRecordId` wrongly captured INSIDE setImmediate (line 168) |
| `routes/reality.js` | 30 | `const claimId = await fabric.claimReality(...)` → uses string return; sends `{ ok: true, claimId }` to HTTP client |
| `lib/reality/projections/knowledge.js` | 23 | `const id = await claimReality(...)` → passes string to `advanceClaim({ claimId: id, ... })` |
| `lib/reality/projections/knowledge.js` | 48 | `await claimReality(...)` → ignores return value entirely |
| `lib/intelligence/knowledge-validator.js` | 23–60 | `submitLesson(lessonText, options)`: no `obsRecordId` parameter; insert to `knowledge_validation_queue` has no `obs_record_id` field |
| `migrations/010_intelligence_layer.sql` | 8–28 | `knowledge_validation_queue` schema: no `obs_record_id` column; has `lesson_source_id` (optional) and `source_type` (enum) but no observation identity link |
| `lib/constitutional-types/knowledge-record.js` | 89–93 | `EvidenceObject.observation_projection_ref`: required string; "RT-08 ObservationRecord.record_id … Cross-runtime provenance anchor (RT09-INV-1; D8 INV-4)" |
| `tests/observation-record-integration.test.js` | all | 39 tests; builds ObservationRecords via `buildObsRecord()` helper — does NOT call `claimReality()` directly; no test verifies claimReality() return type |
| `tests/reality-fabric-constitutional.test.js` | all (grep) | No direct calls to `claimReality()`; tests exports, STAGES, HEALTH_DIMS — no return-value assertions |
| Codebase-wide search | — | No other callers of `claimReality()` found outside `routes/reality.js` and `lib/reality/projections/knowledge.js` |

---

## Exact Propagation Gap

```
lib/reality/fabric.js — claimReality()
  │
  ├─ Line 109: INSERT reality_claims → data.id (claimId)
  ├─ Line 123: _recordEvent() synchronous
  ├─ Line 127: setImmediate #1 — ChangeRecord (unrelated)
  ├─ Line 154: setImmediate #2 — ObservationRecord emission
  │   │
  │   └─ Line 168: const obsRecordId = `OBS-${_obs_claimId}-${Date.now()}`  ← INSIDE async closure
  │
  └─ Line 215: return data.id                                                ← only claimId returned

LOST: obsRecordId is generated asynchronously and never returned to caller.
```

**All downstream consumers receive only `data.id` (claimId). `obsRecordId` is unreachable.**

---

## Falsification Attempts

### Attempt 1: Where ObservationRecord identifiers are created

**Finding (exact line):** `lib/reality/fabric.js:168` inside `setImmediate()`:
```javascript
const obsRecordId = `OBS-${_obs_claimId}-${Date.now()}`;
```

The identifier is constructed from `_obs_claimId` (= `data.id`, known before setImmediate) and `Date.now()` (called at async execution time, not claim time).

**Falsification question:** Is the identifier generated in a way that prevents pre-computation?

**Answer:** NO. `_obs_claimId` is known at synchronous claim time. `Date.now()` can be captured at the same moment `_obs_ts` is captured (line 153 already does this for the timestamp). The identifier can be moved BEFORE `setImmediate()` without changing the ObservationRecord content.

**Conclusion:** NOT FALSIFIED — identifier can be pre-generated honestly.

---

### Attempt 2: Does claimReality() currently discard the ObservationRecord identifier?

**Finding:** YES, confirmed. Line 215: `return data.id;` — only the Supabase claim UUID is returned. `obsRecordId` exists only within the setImmediate closure scope and is GC'd after the closure completes.

**Falsification question:** Is there a secondary channel (event, store, cache) through which the caller could retrieve obsRecordId after the fact?

**Answer:** NO. The constitutional store's `write()` is no-throw fire-and-forget with no query interface exposed. There is no `getObservationRecordByClaim()` API. The identifier is genuinely lost.

**Conclusion:** NOT FALSIFIED — gap is real; fix requires changing the return path.

---

### Attempt 3: Can observation identity be propagated without fabrication?

**Proposed fix:** Move obsRecordId generation from inside setImmediate to before setImmediate, using `data.id` (already known synchronously):
```javascript
const _obs_obsRecordId = `OBS-${data.id}-${Date.now()}`;  // captured at claim time
setImmediate(async () => {
    // ...
    const obsRecordId = _obs_obsRecordId;  // uses pre-captured ID
```

**Fabrication test:** `OBS-${data.id}-${Date.now()}` — `data.id` is the authentic Supabase UUID; `Date.now()` is the authentic claim receipt time. No fabrication.

**Format change:** The only change is that `Date.now()` is now called at `claimReality()` synchronous return time rather than at setImmediate execution time. This is constitutionally honest — the claim reception time is when the ObservationRecord ID should be assigned, not the asynchronous write time. It is strictly more accurate.

**D8 INV-4 check:** `OBS-${data.id}` (claim UUID) derives from the authentic Supabase insert. No fabrication.

**Conclusion:** NOT FALSIFIED — propagation is honest.

---

### Attempt 4: Every function boundary through which ObservationRecord identity must travel

**Mapped call graph:**

```
fabric.claimReality()                         [lib/reality/fabric.js]
  → return { claimId, obsRecordId }           [modified return]
  │
  ├─ routes/reality.js:30                     [HTTP POST /api/reality/claims]
  │   └─ res.json({ ok: true, claimId, obsRecordId })
  │
  ├─ lib/reality/projections/knowledge.js:23  [entity projection loop]
  │   └─ const { claimId: id } = await claimReality(...)
  │       └─ advanceClaim({ claimId: id, ... })   [obsRecordId not needed here]
  │
  └─ lib/reality/projections/knowledge.js:48  [document projection]
      └─ await claimReality(...)              [ignores return — no change needed]

RT-09 pipeline entry (submitLesson — when observation source_type used):
  submitLesson(lessonText, { obsRecordId })   [knowledge-validator.js]
  → knowledge_validation_queue.insert({ ..., obs_record_id: obsRecordId })
  → [T3-10 reads obs_record_id to populate EvidenceObject.observation_projection_ref]
```

**Conclusion:** NOT FALSIFIED — full boundary map established; 4 call sites identified; 2 require signature updates; 1 ignores return (no change needed).

---

### Attempt 5: Every caller that would require signature modification

| Caller | File | Line | Change Required |
|--------|------|------|----------------|
| HTTP route | `routes/reality.js` | 30 | Destructure `{ claimId, obsRecordId }` from return; include `obsRecordId` in response |
| Knowledge entity projection | `lib/reality/projections/knowledge.js` | 23 | Destructure `{ claimId: id }` from return |
| Knowledge document projection | `lib/reality/projections/knowledge.js` | 48 | **No change** — ignores return |
| `submitLesson` | `lib/intelligence/knowledge-validator.js` | 23–60 | Accept `obsRecordId` in options; insert to queue |

**Backward compatibility:** No external API contract requires `claimReality()` to return a string. The HTTP route returns `claimId` to clients (JSON property name unchanged); adding `obsRecordId` to the response is additive and non-breaking.

**Conclusion:** NOT FALSIFIED — signature modifications are minimal and backward-compatible.

---

### Attempt 6: Does propagation preserve fire-and-forget semantics?

**D5 §3.2 atomic uncertainty capture:** The `d5` descriptor is created INSIDE `setImmediate()` — this is correct and is NOT changed. Uncertainty is captured at observation-write time, not at claim-receipt time.

**ObservationRecord write:** Remains inside `setImmediate()` — no change.

**What changes:** `obsRecordId` is pre-captured synchronously so it can be returned to caller. The write operation itself is identical.

**Timing impact:** `Date.now()` embedded in obsRecordId is now called ~microseconds earlier (before setImmediate is scheduled vs. when setImmediate fires). This is constitutionally honest — if anything, it is more accurate (closer to actual claim receipt time).

**Conclusion:** NOT FALSIFIED — fire-and-forget preserved.

---

### Attempt 7: Does propagation change any constitutional invariants?

**RT08-INV-1** (Observation capture required): Unchanged — ObservationRecord still written.  
**RT08-INV-3** (ObserverLimitationRecord concurrent): Unchanged — formed with same `obsRecordId`.  
**D5 §3.2** (Atomic uncertainty capture): Unchanged — d5 descriptor formed inside setImmediate.  
**D8 INV-4** (Reality Grounding): Unchanged — same derivation from real state.  
**RT09-INV-1** (Observation provenance required): SATISFIED by this propagation — without T3-P2, RT09-INV-1 could never be met.

**Conclusion:** NOT FALSIFIED — no constitutional invariants harmed; RT09-INV-1 becomes satisfiable.

---

### Attempt 8: Does propagation require persistence to succeed before returning?

**Current return:** `return data.id;` — synchronous, no persistence dependency.

**New return:** `return { claimId: data.id, obsRecordId: _obs_obsRecordId };` — synchronous, no persistence dependency.

Both the `claimId` (from Supabase insert at line 109, which DOES await) and `obsRecordId` (computed from `data.id` + `Date.now()`) are available synchronously at return time.

**The only await in claimReality():** `await _sb().from('reality_claims').insert(...)` at line 109 — this is already present. The ObservationRecord write remains fire-and-forget.

**Conclusion:** NOT FALSIFIED — no additional persistence required before returning.

---

### Attempt 9: Does propagation introduce ordering or race hazards?

**obsRecordId derivation:** `OBS-${data.id}-${Date.now()}` — fully deterministic at the moment of computation. Since `data.id` is unique per claim and the timestamp prefix is captured once, there is no race between calls.

**Concurrent claimReality() calls:** Each invocation has its own `data.id` (Supabase guarantees UUID uniqueness) and its own synchronous timestamp capture. No shared mutable state.

**setImmediate ordering:** The ObservationRecord write remains inside setImmediate and executes after the synchronous stack clears. Moving obsRecordId generation before setImmediate does not change the order of any I/O operations.

**knowledge_validation_queue write:** `submitLesson()` is called by the CALLER of `claimReality()`, not by `claimReality()` itself — no new internal ordering.

**Conclusion:** NOT FALSIFIED — no ordering or race hazards introduced.

---

### Attempt 10: Do any existing tests assume ObservationRecord identifiers are unavailable?

**Searched:**
- `tests/observation-record-integration.test.js` — 39 tests; builds ObservationRecords via `buildObsRecord()` helper; does NOT call `claimReality()` directly; no assertions on `claimReality()` return type
- `tests/reality-fabric-constitutional.test.js` — exports test (`typeof fabric.claimReality === 'function'`), STAGES/HEALTH_DIMS lengths; no `claimReality()` invocation; no return-type assertions
- All other constitutional suites — no `claimReality()` calls found

**No existing test:**
- Asserts `claimReality()` returns a primitive string
- Asserts `typeof result === 'string'`
- Uses the return value directly as a claimId without destructuring

**Conclusion:** NOT FALSIFIED — zero tests broken by return-type change.

---

## Verdict: AUTHORIZED

**Field honesty: FULL. All 10 falsification attempts failed to block implementation.**

**Summary:**

| Gap | Status |
|-----|--------|
| obsRecordId generated inside setImmediate | FIXABLE — move before setImmediate |
| claimReality() discards obsRecordId | FIXABLE — change return to `{ claimId, obsRecordId }` |
| Callers require update | 2 callers; additive/backward-compatible |
| knowledge_validation_queue missing obs_record_id | FIXABLE — migration + submitLesson update |
| Fire-and-forget preserved | YES |
| D5 atomic capture preserved | YES (d5 descriptor remains inside setImmediate) |
| Constitutional invariants | UNCHANGED or IMPROVED (RT09-INV-1 becomes satisfiable) |
| Existing tests | ZERO regressions |

**Minimum files to modify: 5 (fabric.js, routes/reality.js, projections/knowledge.js, knowledge-validator.js, new migration)**

**Implementation is constitutionally authorized. Proceed.**

---

## Implementation Specification

### Change 1 — `lib/reality/fabric.js`

Move obsRecordId generation from line 168 (inside setImmediate) to line 153 area (before setImmediate). Change return from `data.id` to `{ claimId: data.id, obsRecordId }`.

```diff
-    const _obs_ts       = new Date().toISOString();
+    const _obs_ts           = new Date().toISOString();
+    const _obs_obsRecordId  = `OBS-${data.id}-${Date.now()}`;  // T3-P2: pre-captured for caller
     setImmediate(async () => {
         try {
             ...
-            const obsRecordId = `OBS-${_obs_claimId}-${Date.now()}`;
+            const obsRecordId = _obs_obsRecordId;
             ...
         }
     });
-    return data.id;
+    return { claimId: data.id, obsRecordId: _obs_obsRecordId };
```

### Change 2 — `routes/reality.js`

```diff
-    const claimId = await fabric.claimReality({ ... });
-    res.json({ ok: true, claimId });
+    const { claimId, obsRecordId } = await fabric.claimReality({ ... });
+    res.json({ ok: true, claimId, obsRecordId });
```

### Change 3 — `lib/reality/projections/knowledge.js`

```diff
-    const id = await claimReality({ ... });
+    const { claimId: id } = await claimReality({ ... });
```

### Change 4 — `lib/intelligence/knowledge-validator.js`

```diff
-    const { lessonSourceId, traceId, taskId, sourceType = 'lesson' } = options;
+    const { lessonSourceId, traceId, taskId, sourceType = 'lesson', obsRecordId } = options;
     ...
     await _sb().from('knowledge_validation_queue').insert({
         ...
+        obs_record_id: obsRecordId || null,
     });
```

### Change 5 — `migrations/081_obs_record_id_propagation.sql` (new)

```sql
ALTER TABLE knowledge_validation_queue
    ADD COLUMN IF NOT EXISTS obs_record_id TEXT;

CREATE INDEX IF NOT EXISTS idx_kvq_obs_record_id
    ON knowledge_validation_queue (obs_record_id)
    WHERE obs_record_id IS NOT NULL;
```

---

*T3-P2 Phase 0 Audit completed: 2026-08-03.*  
*Verdict: AUTHORIZED. Implementation proceeds immediately.*  
*10 falsification attempts. 0 blockers found.*
