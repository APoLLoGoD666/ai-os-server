# T3-06 Observer Bootstrap — Phase 0 Pre-Implementation Audit

**Task:** T3-06 — Observer Bootstrap Infrastructure  
**Audit Type:** Falsification-first constitutional reality audit  
**Date:** 2026-07-29  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Authority:** D8 INV-1/INV-2; D5 §3.4; IDR-W2-11-001 Steps 2–4; WAVE-3-AUTHORIZATION-REPORT.md  
**Status:** AUTHORIZE IMPLEMENTATION (with limitations)

---

## 1. AUDIT OBJECTIVE

Attempt to prove T3-06 cannot be honestly implemented. Determine whether observer bootstrap infrastructure can be created without fabricating constitutional field values, inventing authority, or violating D8 invariants.

---

## 2. CURRENT IDENTITY INFRASTRUCTURE

### 2.1 RT-01 ActorProfile (ACTIVE — W2-12)

`lib/founder/profile.js:load()` fires-and-forgets an ActorProfile for `FOUNDER-APEX` (`actor_type: 'HUMAN'`).

**ActorProfile SCHEMA fields (required):** `actor_id`, `actor_type` (`HUMAN | AGENT`), `display_name`, `registered_at`, `status`.

**Critical finding:** `observer_identity_ref` in ObservationRecord is defined as "RT-01 ActorProfile identifier of the observer" (RT08-INV-2). This means the bootstrap registry's `observer_id` values are the ActorProfile-equivalent identifiers used as `observer_identity_ref`. The bootstrap registry creates observer identity records that serve this referencing function. T3-07 will link these to constitutional ObservationRecord fields.

**APEX-SYSTEM as observer:** The APEX runtime is an `actor_type: 'AGENT'` actor that can be constitutionally registered as an observer. No existing ActorProfile for APEX-SYSTEM-OBSERVER exists — W2-12 only registered FOUNDER-APEX (HUMAN).

### 2.2 Constitutional ObserverRegister Type (DEFINED — cannot instantiate)

`lib/constitutional-types/observation-record.js` defines `ObserverRegister` with required fields:
- `register_id`, `observer_ref` (RT-01 ActorProfile ref), `observation_scope` (array)
- `calibration_record_ref` — CalibrationRecord reference (not yet created)
- `health_assessment` — operational health status
- `authority_chain_ref` — **must trace to FoundingRatification per D3 §5.6 R5** (RT-02 scope; governance-meta.js is a 58-byte stub)
- `registration_status` — `ACTIVE | SUSPENDED | LAPSED`
- `last_verification_timestamp`

**Falsification finding:** Cannot create a constitutional ObserverRegister instance without `authority_chain_ref`. RT-02 authority grants are T3-08 scope. Setting `authority_chain_ref` to any value would violate D8 INV-4 (Reality Grounding). **Full constitutional ObserverRegister instantiation is blocked.**

### 2.3 Operational Observer Infrastructure (EXISTING — non-constitutional)

`lib/observer-health/index.js` maintains an `observer_registry` Supabase table for sensor health:
- Fields: `sensor_id`, `sensor_name`, `sensor_type`, `domain`, `health_score`, `last_calibrated`, `calibration_due`
- Purpose: operational sensor health tracking, NOT constitutional observer registration
- Not compatible with RT-08 `observer_identity_ref` requirement

`lib/constitution/observation-registry.js` — operational observation registry with `uncertaintyEstimate` (uses D5-prohibited silent defaults). Not constitutional.

**Finding:** No constitutional observer registry exists. No operational registry is suitable for RT-08 observer identity references.

---

## 3. OBSERVER CONCEPT GAP

| Requirement | Required By | Current State |
|-------------|-------------|---------------|
| `observer_identity_ref` — RT-01 ActorProfile ID | ObservationRecord RT08-INV-2 | No APEX-SYSTEM ActorProfile exists |
| `observation_channel_ref` — ObservationChannelRecord | ObservationRecord RT08-INV-5 | No ObservationChannelRecord exists |
| `observer_limitation_ref` — ObserverLimitationRecord | ObservationRecord RT08-INV-3 | No ObserverLimitationRecord exists |
| `authority_chain_ref` in ObserverRegister | Constitutional ObserverRegister D3 §5.6 R5 | RT-02 absent — governance-meta.js is 58-byte stub |
| Observer bootstrap registry | T3-06 | **Does not exist** |

**T3-06 scope:** creates the observer bootstrap registry only. `observation_channel_ref` (ObservationChannelRecord) and concurrent `observer_limitation_ref` formation are T3-07 scope. `authority_chain_ref` is T3-08 scope.

---

## 4. DEPENDENCY ANALYSIS

### 4.1 What T3-06 needs (to proceed honestly)

| Dependency | Available? | Source |
|------------|-----------|--------|
| Observer concept from D8/R8 | YES | `lib/constitutional-types/observation-record.js` — ObserverRegister schema |
| In-memory storage mechanism | YES | JavaScript Map — no external dependency |
| Constitutional type validation pattern | YES | `lib/constitutional-types/_utils.js` — `_validate` pattern |
| D5 uncertainty protocol | YES | T3-01 COMPLETE — `lib/reality/d5-uncertainty.js` |

### 4.2 What T3-06 explicitly cannot do

| Operation | Reason | Resolution Wave |
|-----------|--------|----------------|
| Create constitutional ObserverRegister instance | `authority_chain_ref` requires RT-02 — absent | T3-08 |
| Create ObservationChannelRecord | Requires RT-02 authorization; instrument_ref undefined | T3-07 |
| Assign authority to observers | RT-02 governance-meta.js is a 58-byte stub | T3-08 |
| Persist to constitutional-store | Bootstrap records are NOT constitutional type instances — no `__type` stamp | T3-07+ when full wiring exists |

---

## 5. D8 COMPATIBILITY ASSESSMENT

### D8 INV-2 — Observer Identity (observer_identity_ref must resolve to registered observer)

**T3-06 resolution:** The bootstrap registry provides registered observer records. Each `observer_id` is a real, explicit identity string — not fabricated. When T3-07 uses `observer_id` as `observer_identity_ref` in an ObservationRecord, it references a record in the bootstrap registry. D8 INV-2 is satisfied at the infrastructure layer by the existence of the registry record.

**Limitation:** D3 §5.6 R5 requires `authority_chain_ref` tracing to FoundingRatification for full constitutional ObserverRegister compliance. The bootstrap registry does NOT satisfy this — it satisfies the identity existence requirement only. Full compliance is T3-08.

### D8 INV-4 — Reality Grounding (no fabricated field values)

**Satisfied:** Every bootstrap observer field is caller-supplied at registration time. No fabricated values. `registration_timestamp` is generated internally at call time. `limitation_ref` is explicitly nullable (no fabrication).

### A1 §1.3 — No fabrication

**Satisfied:** The bootstrap registry explicitly does NOT create authority_chain_ref or calibration_record_ref. No implied permissions.

---

## 6. STORAGE DETERMINATION

**Decision: Runtime-local (in-memory Map) — Option B.**

**Reasoning:**
1. Bootstrap observer records are NOT constitutional ObserverRegister type instances. They lack `__type`, `__runtime`, `__baseline` constitutional stamps.
2. Writing to constitutional-store requires proper constitutional type provenance. Bootstrap records do not have it.
3. Using the operational `observer_registry` Supabase table would conflate constitutional observer registration with operational sensor health tracking.
4. In-memory registry is appropriate for bootstrap infrastructure — analogous to how PETL transaction context is runtime-local.
5. T3-07 will register observers at startup before emitting ObservationRecords. Server restart = re-registration on next startup. This is acceptable for Wave 3 scope.

**Future:** When full constitutional ObserverRegister type instantiation is possible (T3-08 authority, calibration records), observer registration will persist to constitutional-store with proper `ObserverRegister.create()` type stamps.

---

## 7. FALSIFICATION VERDICT

**Falsification fails. T3-06 CAN be honestly implemented** with the following constitutional boundaries:

1. Bootstrap registry is pre-constitutional infrastructure — NOT a constitutional ObserverRegister instance
2. No `authority_chain_ref` created — authority remains RT-02/T3-08 scope
3. `limitation_ref` is nullable — ObserverLimitationRecord formation is T3-07 scope (formed concurrently with each ObservationRecord)
4. Storage is runtime-local — no constitutional type persistence until T3-08
5. Observer existence does NOT imply authority — the registry explicitly separates identity from authorization

These are constitutionally honest limitations, not fabrications.

---

## 8. IMPLEMENTATION RECOMMENDATION

**AUTHORIZE T3-06.**

Create `lib/reality/observer-registry.js` with runtime-local Map storage. Exports: `registerObserver`, `getObserver`, `validateObserver`, `listObservers`. Do NOT auto-seed at module load time (preserves test isolation). T3-07 will call `registerObserver` for APEX-SYSTEM-OBSERVER at ObservationRecord wiring startup.

---

*Phase 0 audit issued: 2026-07-29. Constitutional authority: APEX-CONSTITUTION-v1.0 → D8 INV-2; D8 INV-4; A1 §1.3; D3 §5.6.*  
*Verdict: AUTHORIZE. Implementation may proceed with documented limitations.*
