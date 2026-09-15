# W2-10 Drift Detector — Pre-Implementation Baseline

**Task:** W2-10 RT-06 CoherenceViolationRecord on drift-detector.js  
**Date captured:** 2026-07-28  
**Purpose:** Phase 0 baseline — documents state of drift-detector.js and RT-06 before W2-10 implementation.

---

## 1. TARGET FILE

**File:** `lib/constitution/drift-detector.js`  
**Size:** 111 lines  
**Design contract:** Detects constitutional drift by comparing current APEX behavioral/structural snapshot against a stored baseline.

**Exports:** `{ takeSnapshot, compareSnapshots, detectDrift, establishBaseline, clearBaseline, loadBaseline }`

**Key function:** `detectDrift()` — async; returns `{ hasBaseline, driftItems, snapshot, critical, high }`

**Wiring point:** Inside `detectDrift()`, after:
```javascript
const driftItems = compareSnapshots(baseline, snapshot);
```
Line 90 of the pre-W2-10 file.

**Existing imports:** `fs`, `path`, `./spec`, `../logger`  
**No constitutional type imports exist pre-W2-10.**

---

## 2. DRIFT ITEM STRUCTURE

`compareSnapshots()` returns an array of drift items with this shape:

| Field | Type | When present | Values |
|-------|------|--------------|--------|
| `id` | string | always | Principle ID (e.g. `P01_FOUNDER_LAYER_ZERO`) |
| `type` | string | always | `BEHAVIORAL_DRIFT`, `STRUCTURAL_DRIFT`, `PRINCIPLE_ADDED`, `PRINCIPLE_RECOVERED`, `PRINCIPLE_REMOVED` |
| `severity` | string | always | `CRITICAL`, `HIGH`, `INFO` |
| `detail` | string | always | Human-readable description |
| `category` | string | BEHAVIORAL_DRIFT, STRUCTURAL_DRIFT only (not PRINCIPLE_REMOVED) | `AUTHORITY`, `PRIVACY`, `CERTIFICATION`, `LEARNING`, `HEALTH`, `IDENTITY`, `GOVERNANCE` |

**INFO severity items (not constitutional violations):** `PRINCIPLE_ADDED`, `PRINCIPLE_RECOVERED`

---

## 3. SPEC.JS CATEGORIES

23 principles across 7 categories:
- `AUTHORITY` — P01–P04 (layer 0 access, entity class hierarchy, permission matrix, elevated rights)
- `PRIVACY` — P05–P08 (PII abstraction, passthrough fields, strip fields, protected people access)
- `CERTIFICATION` — P09–P12 (4-clause standard, deployment gate, behavioral verification, certification recorded)
- `LEARNING` — P13–P15 (lesson persistence, applied status, reflexion observable)
- `HEALTH` — P16–P19 (health monitoring, anomaly detection, provider failover, containment)
- `IDENTITY` — P20–P22 (executive differentiation, founder context, intelligence delivery)
- `GOVERNANCE` — P23 (layer writes audited)

---

## 4. CONSTITUTIONAL TYPE TARGET

**Type:** `CoherenceViolationRecord` (`lib/constitutional-types/coherence-violation-record.js`)  
**Runtime:** RT-06

Required fields:

| Field | Type | Constraint | Available at wiring point |
|-------|------|-----------|--------------------------|
| `violation_id` | string | unique | Yes — `CVR-${item.id}-${timestamp}` |
| `timestamp` | string | ISO 8601 | Yes — `new Date().toISOString()` |
| `gcr_check_id` | number | enum [1–7] | Yes — via CATEGORY_TO_GCR mapping (Wave 2 limitation L-01) |
| `objects_in_violation` | array | non-empty | Yes — `[item.id]` |
| `violation_type` | string | — | Yes — `item.type` |
| `severity` | string | — | Yes — `item.severity` |
| `closure_status` | string | enum ['OPEN','CLOSED'] | Yes — `'OPEN'` (new violations are OPEN) |

Optional fields:
- `associated_cre_ref` — omitted (no CRE system wired in Wave 2)

**Honest field satisfaction: 7/7 required fields (100%). W2-10 is IMPLEMENTABLE.**

---

## 5. CATEGORY-TO-GCR MAPPING (Wave 2)

The drift-detector spec categories do not directly correspond to GCR numbers. Wave 2 uses a constitutional interpretive mapping (documented as L-01):

| Category | GCR | Rationale |
|----------|-----|-----------|
| `LEARNING` | 1 | GCR-1 (Epistemic Chain Completeness) — learning builds APEX's epistemic basis |
| `AUTHORITY` | 2 | GCR-2 (Authority Chain Completeness) — authority principles enforce constitutional authority |
| `PRIVACY` | 3 | GCR-3 (Provenance Chain Completeness) — privacy controls information provenance |
| `HEALTH` | 4 | GCR-4 (Temporal Causality) — health monitors temporal operational integrity |
| `IDENTITY` | 5 | GCR-5 (Identity Consistency) — identity principles enforce entity identity coherence |
| `GOVERNANCE` | 6 | GCR-6 (Value Alignment) — governance enforces constitutional value alignment |
| `CERTIFICATION` | 7 | GCR-7 (Ontological Soundness) — certification verifies APEX's constitutional conformance |

Default (unknown category or PRINCIPLE_REMOVED without recoverable category): GCR-7.

Wave 3 resolution: I1-SEQUENCING W2-10 (gcr-evaluator.js) will implement direct GCR-1 through GCR-7 evaluation per D3 RF-A9.

---

## 6. WIRING SCOPE

- **Emit:** One `CoherenceViolationRecord` per driftItem where `severity !== 'INFO'`
- **Pattern:** Fire-and-forget V1.0 (`setImmediate(async () => { try {...} catch(err) { console.error(...) } })`)
- **Production path impact:** Zero — setImmediate defers until after `detectDrift()` returns
- **PETL provenance:** Not available — drift-detector runs outside PETL transaction context (Wave 2 limitation L-04)

---

*W2-10 baseline captured: 2026-07-28. Baseline: APEX-CONSTITUTION-v1.0.*
