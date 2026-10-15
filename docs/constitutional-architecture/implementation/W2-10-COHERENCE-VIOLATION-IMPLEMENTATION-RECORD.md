# W2-10 CoherenceViolationRecord Implementation Record

---

## 1. OBJECTIVE

Wire `lib/constitution/drift-detector.js` to emit `CoherenceViolationRecord` (RT-06) for every constitutional drift item where severity is CRITICAL or HIGH. INFO-severity items (PRINCIPLE_ADDED, PRINCIPLE_RECOVERED) are not violations and are excluded from emission.

**W2-10 constitutional type after this task:**

| Type | Runtime | Wiring site |
|------|---------|------------|
| `CoherenceViolationRecord` | RT-06 | `drift-detector.js:detectDrift()` — after `compareSnapshots()` |

---

## 2. BASELINE ARCHITECTURE

See `docs/implementation/W2-10-DRIFT-DETECTOR-BASELINE.md` for full pre-implementation state.

**Key pre-W2-10 gaps:**
- `drift-detector.js` had no constitutional type imports
- Drift detection results were logged and returned but not constitutionally recorded
- `CoherenceViolationRecord` was never emitted in any APEX production code path

---

## 3. INTEGRATION DESIGN

### Wiring Location

**File:** `lib/constitution/drift-detector.js`  
**Location:** Inside `detectDrift()`, immediately after `const driftItems = compareSnapshots(baseline, snapshot);`  
**Pattern:** Fire-and-forget V1.0 (CONSTITUTIONAL WIRING PATTERN V1.0)

### Emission Scope

| Drift type | Severity | Emitted? | Rationale |
|-----------|---------|---------|-----------|
| `BEHAVIORAL_DRIFT` | CRITICAL | YES | Principle switched from PASS to FAIL |
| `STRUCTURAL_DRIFT` | HIGH | YES | Structural fingerprint changed |
| `PRINCIPLE_REMOVED` | CRITICAL | YES | Principle disappeared from spec |
| `PRINCIPLE_RECOVERED` | INFO | NO | Not a violation |
| `PRINCIPLE_ADDED` | INFO | NO | Not a violation |

### Field Mapping

| Field | Source | Notes |
|-------|--------|-------|
| `violation_id` | `CVR-${item.id}-${_runTs}` | Unique per principle per run |
| `timestamp` | `new Date().toISOString()` | ISO 8601 at time of setImmediate execution |
| `gcr_check_id` | `CATEGORY_TO_GCR[item.category] \|\| 7` | Wave 2 category mapping (see L-01) |
| `objects_in_violation` | `[item.id]` | Single principle id per record |
| `violation_type` | `item.type` | Direct from drift item |
| `severity` | `item.severity` | Direct from drift item |
| `closure_status` | `'OPEN'` | All new violations start OPEN (RT06-INV-5) |
| `associated_cre_ref` | omitted | No CRE system wired in Wave 2 |

### CATEGORY_TO_GCR Mapping (Wave 2)

| Spec Category | GCR | Rationale |
|--------------|-----|-----------|
| `LEARNING` | 1 | GCR-1 Epistemic Chain — learning builds APEX's epistemic basis |
| `AUTHORITY` | 2 | GCR-2 Authority Chain — authority principles enforce constitutional authority |
| `PRIVACY` | 3 | GCR-3 Provenance Chain — privacy controls information provenance |
| `HEALTH` | 4 | GCR-4 Temporal Causality — health monitors temporal operational integrity |
| `IDENTITY` | 5 | GCR-5 Identity Consistency — identity principles enforce entity coherence |
| `GOVERNANCE` | 6 | GCR-6 Value Alignment — governance enforces constitutional value alignment |
| `CERTIFICATION` | 7 | GCR-7 Ontological Soundness — certification verifies constitutional conformance |

Default (unknown or unrecoverable category): GCR-7.

### PRINCIPLE_REMOVED Category Recovery

`PRINCIPLE_REMOVED` drift items do not carry `category` (the compareSnapshots function does not copy it). The wiring recovers the category by looking up `_baseline.verifications.find(v => v.id === item.id).category`. This is always available because the baseline was loaded from disk before `compareSnapshots()` was called.

---

## 4. CONSTITUTIONAL TYPES USED

| Type | Runtime | Role |
|------|---------|------|
| `CoherenceViolationRecord` | RT-06 | Emitted — one per non-INFO drift item |

---

## 5. FILES CHANGED

| File | Change |
|------|--------|
| `lib/constitution/drift-detector.js` | Added 2 constitutional imports + CATEGORY_TO_GCR constant + fire-and-forget emission block in `detectDrift()` |

**Files created:**

| File | Purpose |
|------|---------|
| `tests/coherence-violation-constitutional.test.js` | 33 W2-10 tests |
| `docs/implementation/W2-10-DRIFT-DETECTOR-BASELINE.md` | Phase 0 baseline |
| `docs/constitutional-architecture/implementation/W2-10-COHERENCE-VIOLATION-IMPLEMENTATION-RECORD.md` | This document |

---

## 6. TESTS ADDED

**File:** `tests/coherence-violation-constitutional.test.js` (33 tests, all passing)

| Category | Tests |
|----------|-------|
| compareSnapshots BEHAVIORAL_DRIFT | 4 |
| compareSnapshots STRUCTURAL_DRIFT | 3 |
| compareSnapshots PRINCIPLE_REMOVED | 3 |
| compareSnapshots INFO items (non-violations) | 3 |
| CoherenceViolationRecord field validation | 6 |
| CATEGORY_TO_GCR — all 7 spec categories | 7 |
| detectDrift() no-baseline path | 2 |
| Module integrity | 3 |
| Regression — compareSnapshots behavior | 3 |
| **Total** | **33** |

---

## 7. VALIDATION EVIDENCE

### W2-10 Tests
```
Results: 33 passed, 0 failed
```

### W2-04 Regression (Gate 6)
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

### Syntax and Module Checks
```
node --check lib/constitution/drift-detector.js  → PASS
node -e "require('./lib/constitution/drift-detector')"  → PASS (loads cleanly)
drift-detector exports: takeSnapshot, compareSnapshots, detectDrift, establishBaseline, clearBaseline, loadBaseline
```

---

## 8. KNOWN LIMITATIONS

| ID | Limitation | Severity | Resolution |
|----|-----------|----------|-----------|
| L-01 | `gcr_check_id` populated via Wave 2 category-to-GCR mapping (spec.js categories interpreted as GCR domains). Wave 3 gcr-evaluator.js (I1-SEQUENCING W2-10) will implement direct D3 RF-A9 GCR evaluation | MEDIUM | Wave 3: implement `lib/coherence/gcr-evaluator.js` per I1-SEQUENCING W2-10 |
| L-02 | `PRINCIPLE_REMOVED` items have no `category` field; category recovered from `baseline.verifications` — if baseline JSON was written by an older spec version without categories, defaults to GCR-7 | LOW | Acceptable for Wave 2; modern baselines always include category |
| L-03 | Each `detectDrift()` call produces new records for persisting violations; no deduplication (same principle drifting across multiple scans produces multiple CVRs) | LOW | Wave 3: CoherenceResolutionEvent closure status prevents duplicate action |
| L-04 | No PETL provenance for CVR records — drift-detector runs outside any PETL transaction context | LOW | Wave 3: PETL-aware invocation path if needed |

---

## 9. NEXT DEPENDENCIES

| Task | Dependency on W2-10 |
|------|-------------------|
| Wave 3 GCR Evaluator | Depends on W2-10 CVR emission infrastructure being in place |
| CRE generation (W2-X) | W2-10 CVRs provide `violation_id` references for future CRE generation |
| W2-06 Domain Registry | Not blocked by W2-10 — parallel |
| W2-07 Knowledge | Not blocked by W2-10 — parallel |
| W2-08 Governance Attestation | Not blocked by W2-10 — parallel |
| W2-09 Civilization Consensus | Not blocked by W2-10 — parallel |

---

*W2-10 Implementation Record created: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*  
*Constitutional authority: R6-v1.1.1 RS-07 RS-10; A0-v1.1.1 §3.7; D3 RF-A9; RT06-INV-2; RT06-INV-5; WAVE-2-MASTERPLAN.md.*
