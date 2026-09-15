# T3-01 D5 Uncertainty Protocol — Phase 0 Pre-Implementation Audit

**Task:** T3-01 — D5 Uncertainty Protocol Implementation  
**Audit Type:** Falsification-first constitutional reality audit  
**Date:** 2026-07-29  
**Auditor:** T3-01 Phase 0  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Authority:** D5 Uncertainty Propagation Protocol; D8 INV-1/2/4; IDR-W2-11-001  
**Status:** AUTHORIZE IMPLEMENTATION

---

## 1. AUDIT OBJECTIVE

Attempt to prove T3-01 cannot be honestly implemented. Determine whether the D5 uncertainty capture module (`lib/reality/d5-uncertainty.js`) can be created without fabricating constitutional field values or violating D5 §3.2 (Atomic Capture).

---

## 2. CURRENT STATE

### 2.1 D5-Relevant Infrastructure

| Module | Relevance | D5 Compatible? |
|--------|-----------|----------------|
| `lib/constitution/meta-uncertainty.js` | Second-order uncertainty estimation pipeline (UNCERTAINTY_SOURCES, calibration, overconfidence detection) | Partial — operational reasoning aid; no atomic D5 capture |
| `lib/constitution/epistemic-humility.js` | Knowledge state taxonomy (KNOWN/KNOWN_UNKNOWN/UNKNOWN_UNKNOWN/UNRESOLVABLE) with confidence ceilings | Partial — useful for observer capability representation; not a D5 entry point |
| `lib/constitution/observation-registry.js` | `registerObservation()` with `uncertaintyEstimate` field and modality types | **Non-compliant** — uses silent defaults (`|| 0.10`, `|| 'UNKNOWN'`) which D5 §3.2 prohibits |
| `agent-system/confidence-estimator.js` | Pre-run confidence from episodic success rate | Not D5-relevant — episodic confidence estimation |
| `lib/observer-health/index.js` | Sensor registry and calibration management; `observer_registry` and `calibration_events` tables in Supabase | Partially relevant — provides queryable health scores and calibration status; not atomically available at observation time |

**Finding: No D5 atomic capture protocol exists in the codebase.** All existing uncertainty infrastructure is either (a) operational reasoning aids that don't feed constitutional types, or (b) explicitly D5-incompatible due to silent defaults.

### 2.2 Where Observations Currently Enter the System

| Entry Point | Module | Uncertainty Capture |
|-------------|--------|---------------------|
| Reality claim formation | `lib/reality/fabric.js:claimReality()` | `confidence` parameter (number 0-1) — operational, not D5-structured |
| Observation registration | `lib/constitution/observation-registry.js:registerObservation()` | `uncertaintyEstimate` — silent default `|| 0.10` violates D5 §3.2 |
| Sensor health | `lib/observer-health/index.js` | `health_score`, calibration data — queryable but not atomically available at entry time |

**No existing entry point captures all five D5 §3.4 attributes atomically.**

### 2.3 Confidence and Provenance Information Available

| Data | Location | Usable for D5? |
|------|----------|----------------|
| Computational confidence estimate | `meta-uncertainty.js:runMetaUncertaintyPipeline()` | As input to `uncertainty_confidence` — caller computes, descriptor captures atomically |
| Observer health score | `observer-health/observer_registry` table | As input to `uncertainty_observer_capability` — caller queries, descriptor captures atomically |
| Knowledge state taxonomy | `epistemic-humility.js:KNOWLEDGE_STATES` | As input to `uncertainty_source` description — caller chooses, descriptor captures atomically |

### 2.4 D5 §3.2 Compliance Analysis

**D5 §3.2 Atomic Capture** requires: the five uncertainty attributes must be captured at observation time. Post-hoc assignment is constitutionally invalid regardless of value.

**D5 §3.2 does NOT prohibit:** callers computing the values before calling the capture function. The "atomic" requirement means the values must exist at the moment of observation entry — not that they must be computed from scratch by the D5 module.

**What `createUncertaintyDescriptor` does:** it accepts the four caller-supplied values and captures `uncertainty_timestamp` internally at call time. The call itself IS the atomic capture event. D5 §3.2 is satisfied because:
- The caller has the uncertainty information available at observation time
- `createUncertaintyDescriptor` captures all five attributes in a single synchronous call
- The returned descriptor is frozen — post-hoc mutation is structurally impossible
- If any required value is missing, the call throws — no silent defaults

**This is constitutionally honest.** The D5 module is the capture mechanism, not the information generator.

---

## 3. AVAILABLE DATA SOURCES

| D5 Attribute | Available Data | Source |
|-------------|----------------|--------|
| `uncertainty_source` | Caller-provided string describing observation source nature | Caller knows source at observation time |
| `uncertainty_confidence` | Caller-provided number 0-1; can be computed via `meta-uncertainty.js` | Caller-computed or estimated at observation time |
| `uncertainty_limitations` | Caller-provided array; can be populated from observer health, knowledge state | Caller knows limitations at observation time |
| `uncertainty_timestamp` | Generated by `d5-uncertainty.js` at call time via `new Date().toISOString()` | Internally captured — not caller-supplied |
| `uncertainty_observer_capability` | Caller-provided object describing observer state | Caller provides capability snapshot at observation time |

All five attributes are obtainable without fabrication. `uncertainty_timestamp` is generated internally (constitutionally correct per D5 §3.2 atomic capture intent).

---

## 4. MISSING INFRASTRUCTURE

The following are NOT prerequisites for T3-01 (they are prerequisites for T3-07 ObservationRecord wiring, not for the D5 module itself):

| Missing Item | Impact on T3-01 | Impact on T3-07 |
|-------------|-----------------|-----------------|
| ObserverRegister (RT-08) | None — T3-01 creates standalone infrastructure | Blocks `observer_identity_ref` |
| ObservationChannelRecord (RT-08) | None | Blocks `observation_channel_ref` |
| RT-02 authority grants | None | Blocks `authority_ref` |
| contact_timestamp tracking | None | Blocks `contact_timestamp` |

T3-01 creates the D5 descriptor mechanism only. It does not wire ObservationRecord. The wiring prerequisites are T3-06 and T3-07's responsibility.

---

## 5. CONSTITUTIONAL COMPATIBILITY ASSESSMENT

### 5.1 Schema Type Discrepancy (DOCUMENTED)

The ObservationRecord schema (`lib/constitutional-types/observation-record.js`) defines all five D5 fields as `type: 'string'`:
```
d5_uncertainty_confidence: { type: 'string' }  — ObservationRecord schema
```

The T3-01 specification defines `uncertainty_confidence` as `number between 0 and 1`.

**Assessment:** The D5 descriptor (`lib/reality/d5-uncertainty.js`) correctly uses semantically typed values:
- `uncertainty_confidence`: `number` (semantic type for a [0,1] range)
- `uncertainty_limitations`: `array` (semantic type for a list of limitation strings)
- `uncertainty_observer_capability`: `object` (semantic type for a capability descriptor)

When a D5 descriptor is mapped into an ObservationRecord in T3-07, the number and object will be serialized to strings (e.g., `String(confidence)`, `JSON.stringify(capability)`). This serialization is T3-07's mapping responsibility. The D5 module enforces correct semantic types at the capture layer.

**This discrepancy does NOT block T3-01. It is a mapping concern for T3-07.**

### 5.2 `observation-registry.js` D5 Non-Compliance (DOCUMENTED, NOT MODIFIED)

`lib/constitution/observation-registry.js:registerObservation()` uses:
- `|| 'UNKNOWN'` default for `source` — D5-prohibited silent default
- `|| 0.10` default for `uncertaintyEstimate` — D5-prohibited silent default enrichment

**T3-01 does not modify this module.** It is an operational module, not a constitutional wiring site. Its continued use for operational observation registration is out of T3-01 scope. Future constitutional observation registration (T3-07) will use the D5 protocol exclusively.

### 5.3 Falsification Verdict

**Falsification fails.** T3-01 CAN be implemented honestly.

- No fields require fabrication
- `uncertainty_timestamp` is generated atomically at call time
- Callers supply the other four values at observation entry time
- Validation enforces all five attributes — no silent defaults possible
- The module is standalone — it creates infrastructure without wiring

---

## 6. IMPLEMENTATION RECOMMENDATION

**AUTHORIZE IMPLEMENTATION.**

Implement `lib/reality/d5-uncertainty.js` as specified:
- `createUncertaintyDescriptor({ uncertainty_source, uncertainty_confidence, uncertainty_limitations, uncertainty_observer_capability })` — generates timestamp internally, validates all five fields, returns frozen descriptor
- `validateUncertaintyDescriptor(descriptor)` — returns `{ valid: boolean, errors: [] }` without throwing
- `module.exports = Object.freeze({ createUncertaintyDescriptor, validateUncertaintyDescriptor })`

**No existing module is modified.** T3-01 creates new infrastructure only.

The D5 module does not resolve IDR-W2-11-001 alone — it is Step 1 of the 7-step resolution path. Steps 2–6 (observer bootstrap) are T3-06; Step 7 (ObservationRecord wiring) is T3-07.

---

## 7. CANDIDATE WIRING SITE CONFIRMATION

Per IDR-W2-11-001 §4, the confirmed Wave 3 wiring site for ObservationRecord is `lib/reality/fabric.js:claimReality()` (masterplan AD-02 target). The D5 module created by T3-01 will be imported at that site in T3-07. `claimReality()` already receives `confidence`, `source`, `domain`, and `evidence` — all usable as inputs to `createUncertaintyDescriptor` after appropriate uncertainty context is assembled.

---

*Phase 0 audit issued: 2026-07-29. Constitutional authority: APEX-CONSTITUTION-v1.0 → D5 Uncertainty Propagation Protocol.*  
*Verdict: AUTHORIZE. Implementation may proceed.*
