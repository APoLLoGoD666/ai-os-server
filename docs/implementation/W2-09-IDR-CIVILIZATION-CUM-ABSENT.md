# IDR-W2-09-001 — CivilizationUnderstandingModel Synthesis Chain Absent

**IDR ID:** IDR-W2-09-001  
**Task:** W2-09 — RT-11 Civilization Intelligence Constitutional Integration  
**Date Issued:** 2026-07-29  
**Issuing Authority:** W2-09 Phase 0 Constitutional Reality Audit  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Status:** OPEN — Deferred to Wave 3

---

## 1. DECISION SUMMARY

**RT-11 types CivilizationalDecisionProposal (CDP) and DeliberationRecord (DR) cannot be honestly wired at `civilisation/consensus.js` in Wave 2.**

The constitutional deliberation and decision proposal chain requires a synthesized CivilizationUnderstandingModel (CUM) as its epistemic foundation. No CUM has ever been synthesized in the APEX system. `cum_version_ref` is a required field in both CDP and DR — its fabrication violates D-8 INV-4 (Reality Grounding). Additionally, `civilisation/consensus.js` is an operational voting protocol architecturally disconnected from the RT-11 constitutional deliberation process. Honest field satisfaction: CDP 3/14 (21%), DR 2/16 (13%).

**W2-09 is deferred.** No production code changes. Migration ledger SS-05 status: DEFERRED.

---

## 2. BLOCKING CONSTRAINTS

### Constraint 1 — `cum_version_ref` Absent in Both CDP and DR (CRITICAL — D-8 INV-4)

**Constitutional requirement:**  
`CivilizationalDecisionProposal.cum_version_ref` references the specific CivilizationUnderstandingModel version current at proposal formation. `DeliberationRecord.cum_version_ref` establishes that deliberation proceeded from a specific CUM state. Both are required fields. D-8 INV-4 (Reality Grounding): field values must derive from actual system state, not assertion.

**Why this cannot be satisfied:**  
No CivilizationUnderstandingModel has ever been synthesized in the APEX system. CUM synthesis requires 12 completed DomainUnderstandingModels (RT-10), one per constitutional domain, produced from ObservationRecord inputs (RT-08). RT-10 is Wave 3 scope. RT-08 ObservationRecord wiring is blocked by D5 protocol absence (IDR-W2-11-001). Fabricating `cum_version_ref` as a synthetic ID would create a false epistemic foundation for the highest-significance constitutional decision chain — a D-8 INV-4 violation with maximal downstream consequence.

---

### Constraint 2 — `civilisation/consensus.js` is an Operational Voting Protocol, NOT a Constitutional Deliberation Engine (ARCHITECTURAL DISCONNECT)

**Constitutional requirement:**  
D-7 §4.6 specifies 13 required elements for a valid DeliberationRecord: (1) question formulation, (2) CUM state at initiation, (3) participants, (4) evidence used, (5) alternatives considered, (6) conflicts registered, (7) knowledge gaps, (8) competing objectives, (9) resolution reasoning, (10) sacrificed objectives, (11) decision output reference, (12) confidence assessment, (13) review requirement. All 13 are required.

**Audit of `consensus.js` schema:**  
The session schema tracks: `id`, `type`, `title`, `description`, `proposer_id`, `changes`, `content_hash`, `eligible_voters`, `quorum`, `votes`, `status`, `created_at`, `expires_at`, `ratified_at`.

**Mapping result:**  
- Element 3 (participants): PARTIAL via `eligible_voters` / `votes`
- Element 11 (decision output reference): PARTIAL via `id`
- Elements 1, 2, 4–10, 12, 13: NO DATA — zero fields in session schema address any of these elements

The operational voting system records who voted and how, not why, with what epistemic basis, from what understanding state. These are different protocols at different abstraction levels. This is not a wiring location selection problem — the gap is architectural and module-wide.

---

### Constraint 3 — DA-1 through DA-6 Decision Authority Booleans (CRITICAL — RT-02 absent)

**Constitutional requirement:**  
`CivilizationalDecisionProposal` requires six DA boolean fields confirming that all six Decision Authority requirements from the CivilizationalDecision chain have been verified before a proposal can be constitutionally formed.

**Why this cannot be satisfied:**  
RT-02 (Authority Runtime) is Wave 3 scope (SS-10). No authority delegation records exist. `governance-meta.js` is a 58-byte stub. `consensus.js` performs no DA-1 through DA-6 verification. Setting all DA booleans to `false` is honest but constitutionally invalid (a proposal without authority verification is not a constitutional proposal). Setting them to `true` is fabricated.

---

### Constraint 4 — `dom_000001_registration_id` (NO SOURCE)

**Constitutional requirement:**  
`CivilizationalDecisionProposal.dom_000001_registration_id` — the DOM-000001 domain registration anchor for this proposal.

**Why this cannot be satisfied:**  
`consensus.js` sessions have `type` (CONSTITUTIONAL_AMENDMENT, LAW_CHANGE, DOMAIN_OPERATION, AUTONOMY_GRANT) — no DOM-000001 registration ID. No constitutional domain registration event exists anywhere in the operational system.

---

### Constraint 5 — `cum_state_at_initiation` in DeliberationRecord (D-7 §4.6 Element 2)

**Constitutional requirement:**  
D-7 §4.6 Element 2 requires the CUM state at deliberation initiation to be recorded — the epistemic snapshot from which deliberation proceeds.

**Why this cannot be satisfied:**  
No CUM exists. No CUM state snapshot can be produced.

---

## 3. HONEST FIELD COUNT

### CivilizationalDecisionProposal (14 required fields)

| Status | Count | Fields |
|--------|-------|--------|
| HONEST | 3 | `cdp_id` (synthetic), `lifecycle_state` ('PENDING'), `production_timestamp` (`new Date().toISOString()`) |
| CUM ABSENT — D-8 INV-4 blocks fabrication | 1 | `cum_version_ref` |
| RT-02 ABSENT | 6 | `da_1`, `da_2`, `da_3`, `da_4`, `da_5`, `da_6` |
| NO SOURCE | 2 | `dom_000001_registration_id`, `deliberation_record_ref` |
| FABRICATION RISK (CUM-grounded assessment required) | 2 | `irreversibility_classification`, `scope_classification` |
| **TOTAL** | **14** | |

**Honest: 3/14 (21%). Wave 2 wiring threshold not met.**

### DeliberationRecord (16 required fields)

| Status | Count | Fields |
|--------|-------|--------|
| HONEST | 2 | `dr_id` (synthetic), `initiation_timestamp` (`new Date().toISOString()`) |
| CUM ABSENT — D-8 INV-4 blocks fabrication | 2 | `cum_version_ref`, `cum_state_at_initiation` |
| D-7 §4.6 DELIBERATION DATA ABSENT | 8 | `evidence_used`, `alternatives_considered`, `conflicts_registered`, `knowledge_gaps`, `competing_objectives`, `resolution_reasoning`, `sacrificed_objectives`, `decision_output_ref` |
| PARTIAL (incomplete mapping only) | 2 | `question` (partial via `title`), `participants` (partial via `eligible_voters`) |
| NO SOURCE | 2 | `confidence_assessment`, `review_requirement` |
| **TOTAL** | **16** | |

**Honest: 2/16 (13%). Wave 2 wiring threshold not met.**

---

## 4. ALTERNATIVE WIRING LOCATIONS CONSIDERED

### Alternative A — `routes/civilization.js` (27.7K)

HTTP handlers for civilization operations. No constitutional deliberation data. Same field blockers as `consensus.js`. Route-level wiring prohibited by masterplan §1.2. **Rejected.**

### Alternative B — `lib/intelligence/civilization-runtime.js` (296 lines)

Note: Migration ledger listed `lib/civilization/civilization-runtime.js` (18.7K) as the primary file. **This path does not exist.** The actual file at `lib/intelligence/civilization-runtime.js` runs an autonomous "Observe → Analyze → Deliberate → Plan → Execute → Learn" loop calling `domain-loader.init()` and `consensus.init()` at startup. Zero RT-11 constitutional imports. The "Deliberate" step is a stage label — no deliberation data is produced or tracked. **Rejected.**

### Alternative C — Scope CDP emission to only 3 honest fields

Emit CDP with only `cdp_id`, `lifecycle_state`, `production_timestamp` — fabricating or omitting the remaining 11. **Rejected** — D-8 INV-4 prohibits fabricating `cum_version_ref`. Emitting a CDP without `cum_version_ref` violates the constitutional type schema (`required: true`).

### Alternative D — Synthesize a shell CUM with empty DUM manifest

Emit a CUM with `cum_synthesis_status: 'NOT_STARTED'` and zero DomainUnderstandingModel entries, use its synthetic ID as `cum_version_ref`. **Rejected** — creates a false epistemic foundation. A CUM with zero DUM entries is constitutionally invalid per RT-11 synthesis requirements (12 DUMs required from 12 constitutional domains). A false CUM corrupts every downstream CDP, DR, RT-12, and RT-13 record that references it.

**Conclusion:** No alternative wiring location or scope reduction resolves the CUM absence. The constraint is epistemic, not positional.

---

## 5. IDR CLASSIFICATION

**Classification:** PREREQUISITE CHAIN ABSENT — EPISTEMIC FOUNDATION MISSING

The CivilizationUnderstandingModel is the constitutive epistemic foundation of the RT-11 → RT-12 → RT-13 decision-action chain. Its absence reflects that the entire RT-08 → RT-10 → RT-11 epistemic pipeline has never been activated. No constitutional observation has ever produced an ObservationRecord; no domain understanding has ever produced a DomainUnderstandingModel; no CUM has ever been synthesized.

Structural parallel:
- IDR-W2-05-001: `ActionProjection.decision_ref` requires CivilizationalDecision — RT-12 not wired
- IDR-W2-07-001: `EvidenceObject.observation_projection_ref` requires ObservationRecord — RT-08 not wired
- IDR-W2-09-001: `CDP.cum_version_ref` + `DR.cum_version_ref` require CUM — RT-08→RT-10→RT-11 chain not wired
- IDR-W2-11-001: `ObservationRecord.d5_uncertainty_*` requires D5 protocol — absent

All four IDRs share the same root: the RT-08 epistemic chain has not been initialized.

---

## 6. WAVE 3 RESOLUTION PATH

| Step | Work Required | Constraint Resolved |
|------|--------------|---------------------|
| 1 | D5 uncertainty protocol implementation (new foundational infrastructure) | Enables RT-08 ObservationRecord D5 fields |
| 2 | RT-08 observer infrastructure bootstrap (ObserverRegister, ObservationChannelRecord, ObserverLimitationRecord) | `observer_identity_ref`, `observation_channel_ref`, `observer_limitation_ref` |
| 3 | SS-11: Wire ObservationRecord at constitutional observation entry points | Produces ObservationRecord.record_id for downstream chains |
| 4 | SS-12: Wire DomainUnderstandingModel (RT-10) for all 12 constitutional domains | Produces 12 × DomainUnderstandingModel |
| 5 | Synthesize CivilizationUnderstandingModel via CSP 9-step process from 12 DUMs | `cum_version_ref` becomes honestly available |
| 6 | SS-10: Implement RT-02 authority grants (governance-meta.js) | `da_1`–`da_6` become verifiable |
| 7 | Implement constitutional domain registration (dom_000001_registration_id) | `dom_000001_registration_id` becomes available |
| 8 | Add D-7 §4.6 deliberation tracking infrastructure to constitutional deliberation layer | D-7 elements 4–10 become trackable |
| 9 | Wire DeliberationRecord at deliberation initiation; wire CDP at proposal formation; authorize W2-09 re-execution | IDR-W2-09-001 RESOLVED |

---

## 7. SCOPE IMPACT

### RT-12 (CivilizationalDecision) — Scope Boundary Correction

The W2-09 task title cited "RT-12 CivilizationalDecisionProposal / DeliberationRecord." Phase 0 confirmed: `CivilizationalDecisionProposal` and `DeliberationRecord` are **RT-11** types, not RT-12. `CivilizationalDecision` is RT-12. This is a task title error in the original masterplan. RT-12 wiring remains a separate Wave 3 task (RT-12-WIRE) dependent on this IDR's resolution.

### IDR-W2-05-001 (ActionProjection)

IDR-W2-05-001 requires `CivilizationalDecision.decision_id` (RT-12), which requires prior `DeliberationRecord` (RT12-INV-1). Since this IDR blocks DeliberationRecord, IDR-W2-05-001 resolution is also deferred pending this IDR.

---

## 8. MIGRATION LEDGER IMPACT

SS-05 (Civilization Intelligence Runtime):
- **Migration Status:** `NOT STARTED` → `DEFERRED`
- **Verification Status:** `NOT STARTED` (unchanged)
- **Certification Status:** `NOT STARTED` (unchanged)
- **Notes:** IDR-W2-09-001 issued 2026-07-29

---

## 9. RECOMMENDATION

**Issue IDR-W2-09-001. Defer W2-09 to Wave 3. Wave 3 resolution begins with MR-08 → D5 protocol → RT-08 bootstrap → RT-10 → CUM synthesis.**

Attempting to wire CDP or DR without CUM would create constitutionally false records at the top of the decision chain. Every RT-12 and RT-13 record that traces to a fabricated CDP inherits false provenance. The constitutional damage of premature wiring exceeds the cost of correct deferral.

---

*IDR-W2-09-001 issued: 2026-07-29. Constitutional authority: APEX-CONSTITUTION-v1.0.*  
*Blocking constraints: D-8 INV-4 (Reality Grounding); D-7 §4.6 (13-element deliberation requirement); RT-11 CUM synthesis prerequisites; A1 §1.3 (no-fabrication); RT-12-INV-1; IDR-W2-11-001 (upstream root).*
