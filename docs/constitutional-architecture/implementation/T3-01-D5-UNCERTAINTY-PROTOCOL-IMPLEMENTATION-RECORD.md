# T3-01 — D5 Uncertainty Protocol: Implementation Record

**Task:** T3-01 — D5 Uncertainty Protocol Implementation  
**Wave:** Wave 3, Tier 1  
**Date:** 2026-07-29  
**Status:** COMPLETE  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Authority:** D5 Uncertainty Propagation Protocol; D5 §3.1 (Propagation Mandate); D5 §3.2 (Atomic Capture); D5 §3.4 (five uncertainty attributes); RT08-INV-3; IDR-W2-11-001 Resolution Step 1; WAVE-3-AUTHORIZATION-REPORT.md § T3-01

---

## 1. OBJECTIVE

Create the foundational uncertainty capture infrastructure required by D5 before any RT-08 ObservationRecord can be constitutionally formed. This is Step 1 of the 7-step IDR-W2-11-001 resolution path.

**IDR-W2-11-001 root cause:** "No D5 uncertainty protocol exists at any layer in the APEX codebase." T3-01 resolves this by implementing the protocol. The remaining 6 resolution steps (observer bootstrap, ObservationRecord wiring) are deferred to T3-06 and T3-07.

---

## 2. CONSTITUTIONAL AUTHORITY

| Document | Provision | Role in T3-01 |
|----------|-----------|---------------|
| D5 §3.1 | Uncertainty Propagation Mandate — every observation entering the constitutional record must carry a complete uncertainty descriptor | T3-01 creates that descriptor mechanism |
| D5 §3.2 | Atomic Capture — five attributes captured at observation time; post-hoc assignment constitutionally invalid | `createUncertaintyDescriptor` captures `uncertainty_timestamp` internally; returned descriptor is frozen |
| D5 §3.4 | Five uncertainty attributes: Source, Confidence, Limitations, Timestamp, Observer Capability | All five are validated in `createUncertaintyDescriptor` and `validateUncertaintyDescriptor` |
| RT08-INV-3 | Every ObservationRecord requires all five D5 §3.4 uncertainty attributes | D5 module enforces this at the capture layer |
| D8 INV-4 | Reality Grounding — field values must derive from actual system state | No silent defaults; missing fields throw |
| A1 §1.3 | No-fabrication — every field must be DIRECTLY AVAILABLE, DERIVABLE, or HONEST UNKNOWN | Callers supply real values; no fabrication permitted by API design |

---

## 3. FILES CREATED

### 3.1 `lib/reality/d5-uncertainty.js` — CREATED

**Constitutional module: D5 uncertainty capture and validation.**

**Exports (frozen):**
- `createUncertaintyDescriptor(params)` — creates and returns a frozen D5 descriptor
- `validateUncertaintyDescriptor(descriptor)` — validates any value against D5 schema

**Input parameters for `createUncertaintyDescriptor`:**

| Parameter | Type | D5 Attribute | Requirement |
|-----------|------|-------------|-------------|
| `uncertainty_source` | `string` | D5 §3.4 attr 1 | Required, non-empty |
| `uncertainty_confidence` | `number` | D5 §3.4 attr 2 | Required, [0, 1] inclusive |
| `uncertainty_limitations` | `Array` | D5 §3.4 attr 3 | Required, may be empty |
| *(not supplied)* | *(generated)* | D5 §3.4 attr 4 (`uncertainty_timestamp`) | Captured internally at call time |
| `uncertainty_observer_capability` | `object` | D5 §3.4 attr 5 | Required, non-null, non-array object |

**D5 §3.2 atomic capture implementation:**
- `uncertainty_timestamp = new Date().toISOString()` is generated at call time, not supplied by caller
- Callers cannot inject a pre-formed timestamp
- The call to `createUncertaintyDescriptor` IS the atomic capture event
- All five attributes are bundled into the descriptor in a single synchronous operation

**No-defaults contract:**
- Every missing or invalid field throws explicitly
- No `|| 'UNKNOWN'`, no `|| 0.1`, no silent coercion
- `validateUncertaintyDescriptor` returns `{ valid: false, errors: [...] }` — never substitutes values

**Immutability:**
- `Object.freeze(descriptor)` applied before return
- Post-formation mutation is structurally impossible (throws in strict mode)

### 3.2 `tests/d5-uncertainty.test.js` — CREATED

24 tests covering all required cases plus boundary values.

### 3.3 `docs/constitutional-architecture/implementation/T3-01-D5-PHASE-0-AUDIT.md` — CREATED

Phase 0 falsification-first audit. Verdict: AUTHORIZE IMPLEMENTATION.

---

## 4. D5 INVARIANTS IMPLEMENTED

| Invariant | Enforcement Mechanism |
|-----------|----------------------|
| D5 §3.1 — every constitutional observation must carry complete uncertainty | `validateUncertaintyDescriptor` requires all 5 fields; `createUncertaintyDescriptor` enforces at creation |
| D5 §3.2 — atomic capture; no post-hoc assignment | `uncertainty_timestamp` generated internally; descriptor frozen on return |
| D5 §3.4 attr 1 — Source required | `typeof source !== 'string' \|\| source.trim() === ''` → error |
| D5 §3.4 attr 2 — Confidence required, [0,1] | `typeof conf !== 'number' \|\| isNaN(conf) \|\| conf < 0 \|\| conf > 1` → error |
| D5 §3.4 attr 3 — Limitations required, array | `!Array.isArray(limitations)` → error |
| D5 §3.4 attr 4 — Timestamp required, valid ISO | generated internally; validate checks string + `Date.parse` |
| D5 §3.4 attr 5 — Observer Capability required, object | `capability === null \|\| typeof cap !== 'object' \|\| Array.isArray(cap)` → error |
| A1 §1.3 — no fabrication | API design requires caller to supply real values; no fallbacks exist |

---

## 5. VALIDATION RULES

`validateUncertaintyDescriptor(descriptor)`:

1. Input must be a non-null, non-array object → `{ valid: false, errors: [...] }` if not
2. `uncertainty_source`: must be a non-empty string
3. `uncertainty_confidence`: must be a number, not NaN, in [0, 1]
4. `uncertainty_limitations`: must be an Array
5. `uncertainty_timestamp`: must be a non-empty string parseable by `Date.parse`
6. `uncertainty_observer_capability`: must be a non-null, non-array object
7. Returns `{ valid: true, errors: [] }` when all pass; `{ valid: false, errors: string[] }` when any fail

---

## 6. TESTS EXECUTED

```
  T3-01 D5 Uncertainty Protocol Tests

  PASS  createUncertaintyDescriptor creates valid descriptor
  PASS  validateUncertaintyDescriptor accepts valid descriptor
  PASS  Missing uncertainty_source rejected
  PASS  Confidence below 0 rejected
  PASS  Confidence above 1 rejected
  PASS  Missing limitations rejected
  PASS  Missing timestamp rejected by validateUncertaintyDescriptor
  PASS  Missing observer capability rejected
  PASS  null descriptor rejected by validateUncertaintyDescriptor
  PASS  string descriptor rejected by validateUncertaintyDescriptor
  PASS  number descriptor rejected by validateUncertaintyDescriptor
  PASS  Timestamp generated only at creation time
  PASS  Caller-supplied timestamp is ignored (timestamp always generated internally)
  PASS  Descriptor is frozen — cannot be silently modified after creation
  PASS  module exports are frozen
  PASS  module exports createUncertaintyDescriptor and validateUncertaintyDescriptor
  PASS  Confidence 0 accepted (lower bound)
  PASS  Confidence 1 accepted (upper bound)
  PASS  Empty limitations array accepted
  PASS  Empty string uncertainty_source rejected
  PASS  Whitespace-only uncertainty_source rejected
  PASS  Array passed as uncertainty_observer_capability rejected
  PASS  null passed as uncertainty_observer_capability rejected
  PASS  NaN passed as uncertainty_confidence rejected

  Results: 24 passed, 0 failed
```

**Verification commands:**
```
node --check lib/reality/d5-uncertainty.js         → SYNTAX OK
node tests/d5-uncertainty.test.js                  → 24/24 PASS
node -e "const d5=require('./lib/reality/d5-uncertainty'); console.log(Object.isFrozen(d5))"  → true
```

---

## 7. LIMITATIONS

| Ref | Description | Resolution |
|-----|-------------|------------|
| L-01 | `uncertainty_observer_capability` object structure is unconstrained at the D5 layer. Any non-null, non-array object passes validation. Future RT-08 wiring may define a canonical capability schema. | T3-06/T3-07 scope |
| L-02 | `uncertainty_confidence` is a `number` in the D5 descriptor, but `ObservationRecord.d5_uncertainty_confidence` is defined as `type: 'string'` in the Wave 1 constitutional type schema. When D5 descriptors are mapped to ObservationRecord fields in T3-07, the number will be stringified. | T3-07 mapping responsibility — documented in Phase 0 audit |
| L-03 | T3-01 does not wire `d5-uncertainty.js` to any observation entry point. The module is standalone infrastructure. Integration with `lib/reality/fabric.js:claimReality()` occurs in T3-07. | T3-07 scope |
| L-04 | `uncertainty_limitations` array element types are not validated. Individual elements may be any value. Future hardening may enforce string-only elements. | Non-blocking; array contents are caller-provided and honest |

---

## 8. IDR-W2-11-001 RESOLUTION PROGRESS

| Step | Description | Status |
|------|-------------|--------|
| 1 | Implement D5 uncertainty protocol | **COMPLETE (T3-01)** |
| 2 | Bootstrap ObserverRegister | Pending — T3-06 |
| 3 | Bootstrap ObservationChannelRecord | Pending — T3-06 |
| 4 | Bootstrap ObserverLimitationRecord | Pending — T3-06 |
| 5 | Implement RT-02 authority grants | Pending — T3-08 |
| 6 | Implement contact_timestamp tracking | Pending — T3-07 |
| 7 | Wire ObservationRecord at `lib/reality/fabric.js:claimReality()` | Pending — T3-07 |

IDR-W2-11-001 remains OPEN. Step 1 complete. Steps 2–4 (T3-06) are the next unblocked Wave 3 tasks.

---

## 9. FUTURE RT-08 INTEGRATION PATH

When T3-07 wires `ObservationRecord` at `lib/reality/fabric.js:claimReality()`, the integration will follow this pattern:

```javascript
const { createUncertaintyDescriptor } = require('./d5-uncertainty');

// Called at observation entry time with real caller-known values:
const d5 = createUncertaintyDescriptor({
    uncertainty_source:              source,
    uncertainty_confidence:          confidence,
    uncertainty_limitations:         knownLimitations,
    uncertainty_observer_capability: observerCapabilitySnapshot,
});

// Map into ObservationRecord fields (type coercion per limitation L-02):
const record = ObservationRecord.create({
    // ...other fields...
    d5_uncertainty_source:             d5.uncertainty_source,
    d5_uncertainty_confidence:         String(d5.uncertainty_confidence),
    d5_uncertainty_limitations:        JSON.stringify(d5.uncertainty_limitations),
    d5_uncertainty_timestamp:          d5.uncertainty_timestamp,
    d5_uncertainty_observer_capability: JSON.stringify(d5.uncertainty_observer_capability),
});
```

---

*T3-01 Implementation Record issued: 2026-07-29.*  
*Constitutional authority: APEX-CONSTITUTION-v1.0 → D5 §3.1 §3.2 §3.4; RT08-INV-3; IDR-W2-11-001 Step 1.*  
*Status: COMPLETE. 24/24 tests pass. D5 protocol infrastructure active.*
