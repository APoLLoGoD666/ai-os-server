# IDR-W2-07-001 — EvidenceObject Architectural Disconnect

**IDR ID:** IDR-W2-07-001  
**Task:** W2-07 — EvidenceObject Constitutional Integration  
**Date Issued:** 2026-07-29  
**Issuing Authority:** W2-07 Implementation Assessment  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Status:** OPEN — Deferred to Wave 3

---

## 1. DECISION SUMMARY

**EvidenceObject (RT-09) cannot be honestly wired at `lib/intelligence/knowledge-validator.js` in Wave 2.**

The knowledge validator operates an independent lesson-validation pipeline that is architecturally disconnected from the RT-08 Observation layer. Eleven of fourteen EvidenceObject required fields cannot be honestly populated from data available in this pipeline. Fabricating values would violate Reality Fabric principles (A1 §1.3, D8 §3) and constitutional field honesty requirements (W2-CONSTITUTIONAL-WIRING-PATTERN.md §2).

**W2-07 is deferred.** No production code changes. Migration ledger SS-06 updated to DEFERRED.

---

## 2. BLOCKING CONSTRAINTS

### Constraint 1 — `observation_projection_ref` (CRITICAL, RT09-INV-1, D8 INV-4)

**Constitutional requirement:**  
EvidenceObject.observation_projection_ref is the RT-08 → RT-09 provenance anchor. It must reference an admitted RT-08 ObservationRecord.record_id or ConsequenceObservationRecord.record_id. This is enforced by:
- RT09-INV-1 (provenance to Observation Projection required)
- D8 INV-4 (Reality Grounding — every epistemic object traceable to Observation)
- A1 §6.2 (provenance anchor pair: Observation Projection ID + RT-09 operation ID)

**Why this cannot be satisfied:**  
`knowledge-validator.js` processes lessons submitted through `knowledge_validation_queue`. The queue fields are: `validation_id`, `lesson_text`, `lesson_source_id`, `trace_id`, `task_id`, `source_type`, `confirmations`, `evidence`, `status`. None of these are RT-08 ObservationRecord references. The lesson source (`lesson_source_id`) is an APEX operational reference — not an RT-08 output. The knowledge validator has zero require() calls to any RT-08 module and receives no RT-08 data as input.

**Fabrication option considered and rejected:**  
Using `trace_id` or `lesson_source_id` as `observation_projection_ref` would assert a false RT-08 provenance anchor. D8 INV-4 (Reality Grounding) and A1 §6.2 (provenance anchor honesty) prohibit this. No synthetic value can satisfy RT09-INV-1.

---

### Constraint 2 — `interpretation_protocol_ref` / `protocol_version` (CRITICAL, D6 §4.3 AIR-2)

**Constitutional requirement:**  
EvidenceObject requires `interpretation_protocol_ref` — an `EpistemicProtocol.protocol_id` from a constitutionally registered interpretation protocol applied to form this Evidence. D6 §4.3 AIR-2 obligation: RT-09 AIR-2 holders must apply only registered, versioned interpretation protocols.

**Why this cannot be satisfied:**  
No EpistemicProtocol has been registered in the APEX codebase. The functions that approximate protocol behavior in knowledge-validator.js are:
- `_scoreLessonText(text)` — keyword presence test (actionWords regex), returns 0.75 or 0.45
- `_classifyLesson(text)` — regex pattern matching, returns 'rule'/'pattern'/'fact'/'concept'

These are heuristic functions, not registered constitutional EpistemicProtocols. They have no `protocol_id`, no `protocol_version`, and are not registered through any constitutional process. Fabricating a protocol reference for these functions would violate D6 §4.3 AIR-2 (which prohibits application of unregistered protocols) and would create a false protocol citation in the constitutional record.

---

### Constraint 3 — Five KI-017 Uncertainty Attributes (CRITICAL, D4 KI-017, D5 §3.4)

**Constitutional requirement:**  
EvidenceObject must preserve five uncertainty attributes from the source ObservationRecord (KI-017):
1. `uncertainty_source` — origin and nature of the observation source
2. `uncertainty_confidence` — confidence level of the source observation
3. `uncertainty_limitations` — known limitations at time of observation
4. `uncertainty_timestamp` — temporal position of the source observation
5. `uncertainty_observer_capability` — capability state of observer at time of observation

These five fields exist specifically to carry KI-017 uncertainty provenance forward from RT-08 through the epistemic chain. They are NOT general-purpose metadata fields.

**Why these cannot be satisfied:**  
There is no ObservationRecord in the knowledge validator pipeline. The fields available are:
- `source_type` ('lesson', etc.) — a category label, not an observation source description
- `confidence` (float 0.0–1.0) — computed by weighted formula, NOT preserved from a source observation
- Evidence array timestamps — operational queue timestamps, NOT observation timestamps
- No limitations metadata exists anywhere in the queue schema
- No observer capability metadata exists anywhere in the queue schema

Using any of these as substitutes for KI-017 attributes would fabricate false epistemic provenance. KI-017 requires PRESERVATION of attributes from a source ObservationRecord — substitution from unrelated operational data is constitutionally prohibited.

---

### Constraint 4 — `domain_classification` (WRONG DATA TYPE, A0 §3.10 R5)

**Constitutional requirement:**  
`domain_classification` requires one of the twelve constitutional domain identifiers per A0 §3.10 R5 and RT-15 coordination requirements. The EvidenceObject domain_classification drives DKS state tracking across all twelve domains.

**Why this cannot be satisfied:**  
`_classifyLesson()` produces semantic categories: 'rule', 'pattern', 'fact', 'concept'. These are not constitutional domain identifiers. There is no mapping between semantic lesson categories and the twelve constitutional domains (DOM-000001 through DOM-000012). Assigning a semantic category as a constitutional domain ID would create false DKS tracking entries in RT-15.

---

### Constraint 5 — `temporal_validity_metadata` (NO SOURCE, D8 INV-5, RT09-INV-2)

**Constitutional requirement:**  
D8 INV-5 (Temporal Awareness) and RT09-INV-2 require every EvidenceObject to carry temporal validity metadata governing its validity window and expiration conditions.

**Why this cannot be satisfied:**  
The knowledge validation queue has no temporal validity metadata. Lessons do not carry validity windows or expiration conditions. Fabricating a placeholder value would create false temporal governance data in the constitutional record.

---

## 3. HONEST FIELD COUNT

| Status | Count | Fields |
|--------|-------|--------|
| HONEST | 3 | `evidence_id` (generated), `formation_timestamp` (`new Date().toISOString()`), `lifecycle_state` ('FORMING') |
| IDR BLOCKER | 2 | `observation_projection_ref`, `interpretation_protocol_ref` |
| BLOCKED (depends on IDR fields) | 1 | `protocol_version` |
| FABRICATION (KI-017 attributes; no ObservationRecord) | 4 | `uncertainty_source`, `uncertainty_confidence`, `uncertainty_timestamp`, `uncertainty_observer_capability` |
| NO SOURCE | 2 | `uncertainty_limitations`, `temporal_validity_metadata` |
| WRONG DATA TYPE | 1 | `domain_classification` |
| **TOTAL** | **14** | |

**Honest: 3/14 (21%). Threshold for Wave 2 wiring: majority of required fields must be honestly populatable. 21% does not clear any reasonable threshold.**

---

## 4. ALTERNATIVE WIRING LOCATIONS CONSIDERED

### Alternative A: `submitLesson()` — Entry point

**Rejected.** Even earlier in the pipeline than `_promoteToKnowledge()`. No additional RT-08 data is available. The same 11 field blockers apply.

### Alternative B: `processPending()` — Batch processor

**Rejected.** Processes items from `knowledge_validation_queue` with the same field set. No RT-08 provenance data is introduced at this stage.

### Alternative C: `_processValidationItem()` — Item processor

**Rejected.** Has access to `validation_id`, `lesson_text`, `confirmations`, `evidence` array. Same field blockers apply.

### Alternative D: Knowledge graph operations (existing `setImmediate` in `_promoteToKnowledge`)

**Rejected.** The existing `setImmediate` block in `_promoteToKnowledge()` (lines 161–179) creates knowledge graph edges and nodes. Adding EvidenceObject emission here would still have the same 11 field blockers — the knowledge graph operations don't introduce RT-08 data.

**Conclusion:** No wiring location in `knowledge-validator.js` resolves the architectural disconnect. The constraint is module-wide, not function-specific.

---

## 5. IDR CLASSIFICATION

**Classification:** ARCHITECTURAL DISCONNECT

This IDR is structurally identical to IDR-W2-05-001 (ActionProjection sequencing dependency):
- W2-05: `ActionProjection.decision_ref` requires `CivilizationalDecision.decision_id` — RT-12 not yet wired
- W2-07: `EvidenceObject.observation_projection_ref` requires RT-08 `ObservationRecord.record_id` — RT-08 not yet connected to knowledge validator

Both cases: the required constitutional predecessor does not exist at the wiring point. Neither is a planning error. Both require Wave 3 architectural work to establish the prerequisite layer.

---

## 6. WAVE 3 RESOLUTION PATH

The following Wave 3 work unblocks EvidenceObject at `knowledge-validator.js`:

| Step | Work Required | Constraint Resolved |
|------|--------------|---------------------|
| 1 | Establish RT-08 ObservationRecord emission at APEX observation entry points | `observation_projection_ref`, all five KI-017 attributes |
| 2 | Implement RT-03 Class A admission pathway for RT-08 outputs | Observation Projection formally admitted before becoming an EvidenceObject input |
| 3 | Register constitutional EpistemicProtocols for APEX validation heuristics | `interpretation_protocol_ref`, `protocol_version` |
| 4 | Implement constitutional domain classification (12 domains, DOM-000001..12) | `domain_classification` |
| 5 | Define temporal validity metadata governance for epistemic objects | `temporal_validity_metadata` |
| 6 | Connect `knowledge-validator.js` to RT-08 pipeline as D3 epistemic chain consumer | All RT09-INV-1 chain requirements |

After Wave 3 steps 1–6, `_promoteToKnowledge()` becomes the correct EvidenceObject emission point with all 14 fields honestly populatable.

---

## 7. SCOPE IMPACT

### KnowledgeClaim (separate OUT OF SCOPE constraint)

KnowledgeClaim.`belief_object_ref` requires a `BeliefObject.belief_id`. BeliefObject requires an `InterpretationRecord.interpretation_id`. InterpretationRecord requires an `EvidenceObject.evidence_id`. Since EvidenceObject itself cannot be wired (this IDR), the entire D3 epistemic chain from EvidenceObject through KnowledgeClaim is deferred. Additionally, KnowledgeClaim was already designated OUT OF SCOPE per the W2-07 task issuance constraint.

### Downstream tasks

W2-06 (DomainProfile) has no dependency on W2-07. DomainProfile is in RT-15, not RT-09. W2-07 deferral does not affect W2-06 eligibility.

---

## 8. MIGRATION LEDGER IMPACT

SS-06 (Knowledge / Epistemic Layer):
- **Migration Status:** `NOT STARTED` → `DEFERRED`
- **Verification Status:** `NOT STARTED` (unchanged)
- **Certification Status:** `NOT STARTED` (unchanged)
- **Notes:** Updated with IDR-W2-07-001 issuance and Wave 3 resolution path

---

## 9. RECOMMENDATION

**Issue IDR-W2-07-001. Defer W2-07 to Wave 3. Authorize W2-06 (DomainProfile) as next task.**

W2-07 cannot be completed without Wave 3 prerequisites (RT-08 observation pipeline, registered EpistemicProtocols, constitutional domain classification). Attempting to wire EvidenceObject with fabricated or mismatched fields would violate the Reality Fabric principle (A1 §1.3) and create false constitutional records. The IDR is the correct constitutional response.

W2-06 (DomainProfile, RT-15) is independent of W2-07. The W2-06 Phase 0 feasibility check for `authority_record_ref` intra-RT-15 ordering (DomainAuthorityRecord before DomainProfile) is the only remaining dependency to assess before W2-06 wiring can begin.

---

*IDR-W2-07-001 issued: 2026-07-29. Constitutional authority: APEX-CONSTITUTION-v1.0.*  
*Blocking constraints: RT09-INV-1; D8 INV-4; D6 §4.3 AIR-2; D4 KI-017; D8 INV-5; RT09-INV-2; A0 §3.10 R5.*
