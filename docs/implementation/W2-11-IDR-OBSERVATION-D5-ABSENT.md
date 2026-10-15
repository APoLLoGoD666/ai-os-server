# IDR-W2-11-001 — D5 Uncertainty Protocol Absent: RT-08 ObservationRecord

**IDR ID:** IDR-W2-11-001  
**Task:** W2-11 — RT-08 ObservationRecord Constitutional Integration  
**Date Issued:** 2026-07-29  
**Issuing Authority:** W2-11 Phase 0 Constitutional Reality Audit  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Status:** OPEN — Deferred to Wave 3

---

## 1. DECISION SUMMARY

**RT-08 ObservationRecord cannot be honestly wired at any APEX production code location in Wave 2.**

ObservationRecord requires 16 fields. 10 of 16 cannot be honestly satisfied: five require D5 uncertainty protocol infrastructure absent from the entire codebase; three require RT-08 prerequisite types (ObserverRegister, ObservationChannelRecord, ObserverLimitationRecord) with zero entries; one requires RT-02 authority grants (Wave 3); one has no tracking mechanism. D5 §3.2 prohibits post-hoc uncertainty assignment, eliminating all placeholder strategies. D-8 INV-1 and INV-2 prohibit false channel and observer references.

**W2-11 is deferred.** No production code changes. Migration ledger SS-11 status: DEFERRED.

---

## 2. BLOCKING CONSTRAINTS

### Constraint 1 — D5 Uncertainty Protocol Absent (CRITICAL — D5 §3.1, D5 §3.2, 5 fields blocked)

**Constitutional requirement:**  
D5 §3.1 (Uncertainty Propagation Mandate): every observation entering the constitutional record must carry a complete uncertainty descriptor at the point of capture.  
D5 §3.2 (Atomic Capture): the five uncertainty attributes must be captured atomically at observation time — `d5_uncertainty_source`, `d5_uncertainty_confidence`, `d5_uncertainty_limitations`, `d5_uncertainty_timestamp`, `d5_uncertainty_observer_capability`. Post-hoc assignment is constitutionally invalid regardless of value.

**Why this cannot be satisfied:**  
No D5 uncertainty protocol exists at any layer in the APEX codebase. No uncertainty capture middleware, no observer capability measurement, no uncertainty descriptor schema. The operational health monitor (`lib/observer-health/index.js`) tracks CPU/memory/error rates — not constitutional observer capability per D5.

**D5 §3.2 eliminates all placeholder strategies:** There is no mechanism by which `d5_uncertainty_confidence: 'NOT_ESTABLISHED'` or any similar honest-unknown marker can satisfy D5 §3.2. The protocol requires uncertainty to be captured at observation time. Setting uncertainty fields after the fact is constitutionally invalid regardless of the value used.

---

### Constraint 2 — ObserverRegister Empty (CRITICAL — D-8 INV-2)

**Constitutional requirement:**  
`ObservationRecord.observer_identity_ref` must reference a registered observer in the ObserverRegister. D-8 INV-2: "observer_identity_ref must resolve to a constitutionally registered observer."

**Why this cannot be satisfied:**  
ObserverRegister is an RT-08 prerequisite type. Zero constitutional observers are registered in the APEX system. No observer registration ceremony has been performed.

---

### Constraint 3 — ObservationChannelRecord Not Registered (CRITICAL — D-8 INV-1)

**Constitutional requirement:**  
`ObservationRecord.observation_channel_ref` must reference a registered ObservationChannelRecord. D-8 INV-1 (Source Traceability): observation must trace to a constitutionally registered channel.

**Why this cannot be satisfied:**  
No ObservationChannelRecord has been created. No channel registry exists in the APEX system.

---

### Constraint 4 — RT-02 Authority Absent (authority_ref — Wave 3)

**Constitutional requirement:**  
`ObservationRecord.authority_ref` — the RT-02 authority reference governing this observation.

**Why this cannot be satisfied:**  
RT-02 (Authority Runtime) is Wave 3 scope (SS-10). `governance-meta.js` is a 58-byte stub. No DelegationRecord or AuthorityClaim exists.

---

### Constraint 5 — ObserverLimitationRecord Not Created (observer_limitation_ref)

**Constitutional requirement:**  
`ObservationRecord.observer_limitation_ref` — reference to an ObserverLimitationRecord documenting this observer's constitutional limitations at time of observation.

**Why this cannot be satisfied:**  
ObserverLimitationRecord is an RT-08 prerequisite type. No ObserverLimitationRecord has been created.

---

### Constraint 6 — contact_timestamp Not Tracked (NO SOURCE)

**Constitutional requirement:**  
`ObservationRecord.contact_timestamp` — the moment the observer made contact with the external referent, distinct from `formation_timestamp`.

**Why this cannot be satisfied:**  
No APEX operational system separately tracks external contact timing. `formation_timestamp` is the only available timestamp at all candidate wiring sites.

---

## 3. HONEST FIELD COUNT

| Status | Count | Fields |
|--------|-------|--------|
| HONEST | 6 | `record_id` (synthetic), `external_referent_id` (claim entity_id), `external_state_description` (claim data), `domain_attribution` (claim domain), `internal_external_marker` ('INTERNAL'), `formation_timestamp` (`new Date().toISOString()`) |
| D5 PROTOCOL ABSENT — §3.2 blocks all placeholders | 5 | `d5_uncertainty_source`, `d5_uncertainty_confidence`, `d5_uncertainty_limitations`, `d5_uncertainty_timestamp`, `d5_uncertainty_observer_capability` |
| RT-08 INFRASTRUCTURE ABSENT | 3 | `observer_identity_ref`, `observation_channel_ref`, `observer_limitation_ref` |
| RT-02 ABSENT | 1 | `authority_ref` |
| NO SOURCE | 1 | `contact_timestamp` |
| **TOTAL** | **16** | |

**Honest: 6/16 (38%). Wave 2 wiring threshold not met. D5 §3.2 eliminates all placeholder strategies.**

---

## 4. ALTERNATIVE WIRING LOCATIONS CONSIDERED

All candidate locations were assessed. The constraint is not wiring-location-specific — Constraints 1–4 apply universally across the codebase.

### Alternative A — `lib/observer-health/index.js` (7.1K)

Tracks CPU/memory/error health metrics. Health metrics could partially serve `external_state_description`. However: D5 protocol absent (5 fields blocked); no constitutional observer registered; no channel registered; no RT-02 authority. **Rejected** — Constraints 1–4 unresolved.

### Alternative B — `routes/observatory.js` (12.6K)

HTTP handlers for observatory dashboard reads. Request context provides `external_referent_id`. However: same Constraints 1–4. Route-level wiring prohibited by masterplan §1.2. **Rejected.**

### Alternative C — `lib/reality/self-model.js` (4.1K)

Self-model update logic. Self-model updates are natural constitutional self-observation candidates. However: same Constraints 1–4. **Rejected.**

### Alternative D — `lib/reality/fabric.js:claimReality()` (masterplan AD-02 target)

The masterplan W2-11 specification target. ChangeRecord already emitted here (W2-03 CERTIFIED). `claimId`, `claimData`, domain information all available — `external_referent_id`, `external_state_description`, `domain_attribution` are honest. However: same Constraints 1–4 block 10 remaining fields. **Rejected** — correct location for Wave 3 re-execution once constraints are resolved.

**Conclusion:** No wiring location resolves the root constraints. `lib/reality/fabric.js:claimReality()` is confirmed as the correct Wave 3 wiring site pending resolution.

---

## 5. IDR CLASSIFICATION

**Classification:** FOUNDATIONAL INFRASTRUCTURE ABSENT — D5 PROTOCOL MISSING

The D5 uncertainty protocol is constitutional foundational infrastructure equivalent in scope to the PETL transaction machine (RT-03). It must be implemented before any constitutional observation can be recorded. The current APEX system has no constitutional observation infrastructure — only operational observation systems (observer-health, observatory routes, self-model) that operate independently of the constitutional type system.

**Root blocker cascade:**

```
IDR-W2-11-001 (D5 absent, RT-08 infrastructure absent)
  ├── BLOCKS: IDR-W2-07-001 (EvidenceObject.observation_projection_ref requires ObservationRecord)
  ├── BLOCKS: IDR-W2-09-001 (CUM requires DUMs which require ObservationRecords)
  └── BLOCKS (transitively): IDR-W2-05-001 (ActionProjection chain flows through RT-11/RT-12)
```

This IDR is the highest-priority Wave 3 foundational task. Its resolution initiates the entire epistemic chain.

---

## 6. WAVE 3 RESOLUTION PATH

| Step | Work Required | Constraint Resolved |
|------|--------------|---------------------|
| 1 | Implement D5 uncertainty protocol — uncertainty capture middleware at all constitutional observation entry points | Constraint 1 (all 5 D5 fields) |
| 2 | Bootstrap ObserverRegister — register APEX as a constitutional self-observer | Constraint 2 (`observer_identity_ref`) |
| 3 | Bootstrap ObservationChannelRecord — register APEX internal observation channel | Constraint 3 (`observation_channel_ref`) |
| 4 | Bootstrap ObserverLimitationRecord — baseline limitation record for APEX observer | Constraint 5 (`observer_limitation_ref`) |
| 5 | SS-10: Implement RT-02 authority grants (governance-meta.js prerequisite) | Constraint 4 (`authority_ref`) |
| 6 | Implement contact_timestamp tracking at constitutional observation entry points | Constraint 6 (`contact_timestamp`) |
| 7 | Wire ObservationRecord at `lib/reality/fabric.js:claimReality()` per masterplan AD-02 | IDR-W2-11-001 RESOLVED; W2-11 re-execution authorized |

---

## 7. SCOPE IMPACT

### IDR-W2-07-001 (EvidenceObject)

IDR-W2-07-001 Constraint 1 requires `ObservationRecord.record_id` as `observation_projection_ref` in EvidenceObject. Step 7 above (ObservationRecord wired) resolves this blocker. W2-07 re-execution can proceed after this IDR is resolved.

### IDR-W2-09-001 (Civilization Intelligence)

CUM synthesis requires 12 DomainUnderstandingModels (RT-10), which require ObservationRecord inputs. Steps 1–7 above must complete, then RT-10 wiring, then CUM synthesis, before W2-09 can proceed.

### IDR-W2-05-001 (ActionProjection)

Transitively blocked. ActionProjection chain: RT-11 CUM → DeliberationRecord → CDP → CivilizationalDecision → ActionProjection. This IDR resolves the epistemic foundation of the entire chain.

### Downstream constitutional coverage

```
ObservationRecord (RT-08) — THIS IDR
  → EvidenceObject, KnowledgeClaim (RT-09) — IDR-W2-07-001
  → DomainUnderstandingModel (RT-10)
  → CivilizationUnderstandingModel (RT-11) — IDR-W2-09-001
  → DeliberationRecord, CDP (RT-11)
  → CivilizationalDecision (RT-12)
  → ActionProjection, EER (RT-13) — IDR-W2-05-001
```

This IDR's resolution initiates the complete epistemic chain that was dormant in Wave 2.

---

## 8. MIGRATION LEDGER IMPACT

SS-11 (Observation Layer):
- **Migration Status:** `NOT STARTED` → `DEFERRED`
- **Verification Status:** `NOT STARTED` (unchanged)
- **Certification Status:** `NOT STARTED` (unchanged)
- **Notes:** IDR-W2-11-001 issued 2026-07-29

---

## 9. RECOMMENDATION

**Issue IDR-W2-11-001. Defer W2-11 to Wave 3. Prioritize D5 protocol implementation as the highest-priority Wave 3 technical task — it is the root blocker for three other open IDRs.**

The D5 protocol is a foundational constitutional infrastructure component. Its absence means zero constitutional observations can be recorded in the APEX system. Until D5 exists, the epistemic chain from observation through knowledge through civilization intelligence through decision through action is constitutionally empty. Wave 3 must begin with this infrastructure before any epistemic-chain wiring can be authorized.

---

*IDR-W2-11-001 issued: 2026-07-29. Constitutional authority: APEX-CONSTITUTION-v1.0.*  
*Blocking constraints: D5 §3.1 (Uncertainty Propagation Mandate); D5 §3.2 (Atomic Capture — prohibits post-hoc assignment); D-8 INV-1 (Source Traceability); D-8 INV-2 (Observer Identity); D-8 INV-4 (Reality Grounding); RT-08 observer infrastructure prerequisites.*
