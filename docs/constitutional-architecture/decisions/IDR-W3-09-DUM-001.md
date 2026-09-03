# IDR-W3-09-DUM-001 — T3-09-DUM Blocked: RT-09 Epistemic Chain Absent; No KnowledgeClaim; No InferenceProtocol

---

## Record Header

| Field | Value |
|-------|-------|
| IDR Number | IDR-W3-09-DUM-001 |
| Date | 2026-08-02 |
| Author | Implementation Governance Agent |
| Change Class | Class A (Constitutional Prerequisite Gap) |
| Status | **OPEN — BLOCKING T3-09-DUM** |
| Constitutional Basis | R10-v1.1 RS-07/RS-08/RS-10.1/RS-12; D4 KI-007; D4 KI-016; D8 INV-4; RT10-INV-1; RT10-INV-3 |
| Phase 0 Audit | `docs/constitutional-architecture/implementation/T3-09-DUM-PHASE-0-AUDIT.md` |
| Blocking | T3-09-DUM (DomainUnderstandingModel Wiring, RT-10) |
| Prior IDR | IDR-W3-09-001 (RESOLVED — Founding Ratification, different task) |
| Prior Task | T3-08/T3-08.1 (COMPLETE — bootstrap authority; constitutional_records active; 176 tests passing) |

---

## Executive Summary

T3-09-DUM (DomainUnderstandingModel Wiring) was halted at Phase 0 by the discovery of three blocking constitutional prerequisites absent from the current system:

1. **No KnowledgeClaim exists** — DomainUnderstandingModel.knowledge_record_ref is a required field (RT10-INV-1; D8 INV-4) that must reference a constitutional KnowledgeClaim from RT-09. The full RT-09 epistemic chain (EvidenceObject → InterpretationRecord → BeliefObject → KnowledgeClaim) is unimplemented. T3-10 (EvidenceObject Wiring) is not yet done, and no Wave 3 task exists for InterpretationRecord, BeliefObject, or KnowledgeClaim wiring beyond the EvidenceObject stage.

2. **No InferenceProtocol registered** — DomainUnderstandingModel.inference_protocol_ref is required (RT10-INV-3; D6 §4.3 AIR-2). RT10-STATE-02 (InferenceProtocolRegistry) is empty. No InferenceProtocol bootstrap infrastructure exists. Registration authority is constitutionally undefined (R10-v1.1 RS-10.2 RS-12 stated limitation).

3. **Domain count discrepancy** — Wave 3 Authorization Report specifies DOM-000001 through DOM-000012 (12 DUMs). System domain-loader confirms only 10 domains (DOM-000001 through DOM-000010). DUM.domain_id must reference an actual registered domain (D8 INV-4).

Additionally, the Wave 3 Authorization Report T3-09-DUM prerequisite chain contains a planning error: the report states "T3-07 (ObservationRecord as DUM input)" but R10-v1.1 RS-08 and the RT-10 constitutional specification confirm that DUM's primary input is "Knowledge Record / KnowledgeState from RT-09 (PAIR 31)." The Wave 3 report understated the prerequisite depth by omitting the full RT-09 epistemic chain.

The T3-08 bootstrap authority and existing ObservationRecord wiring (T3-07) remain valid. No regression. The system is constitutionally honest about its current epistemic state.

---

## Blocking Gap Detail

### Gap G-1 — Full RT-09 Epistemic Chain Absent

**Constitutional source:** R10-v1.1 RS-07 RT10-OBJ-01: "Creation requires a current Knowledge Record from RT-09 for the domain (PAIR 31 P4)." R10-v1.1 RS-12 RT10-PROC-01: "Constitutional trigger: Receipt of admitted Knowledge Record / KnowledgeState from RT-09 (RT10-IN-01)."

**DUM schema enforcement:**
```javascript
knowledge_record_ref: { required: true, type: 'string',
  constitutional_source: 'A1 §6.2; R10-v1.1 RS-10.1; RT10-INV-1; D8 INV-4'
}
```

**Epistemic chain status:**

| Stage | Type | Schema | Wiring | Wave 3 Task |
|-------|------|--------|--------|-------------|
| Stage 2 | EvidenceObject | EXISTS (knowledge-record.js) | NOT DONE | T3-10 (parallel) |
| Stage 3 | InterpretationRecord | EXISTS (knowledge-record.js) | NOT DONE | NO TASK |
| Stage 4 | BeliefObject | EXISTS (knowledge-record.js) | NOT DONE | NO TASK |
| Stage 5 | KnowledgeClaim | EXISTS (knowledge-record.js) | NOT DONE | NO TASK |

**D4 KI-007:** "Epistemic chain stage sequence must not be skipped; RT-10 must receive Knowledge Records before forming Domain Understanding Models."

**D4 KI-016:** "Epistemic stage transition requires prior chain objects present; RT-10 cannot synthesize Domain Understanding Models without required Knowledge Records."

**D8 INV-4:** `knowledge_record_ref` value must derive from actual system state. Zero KnowledgeClaims exist. No bootstrap KnowledgeClaim is constitutionally permissible (stage-skipping prohibition; KnowledgeClaim itself has required references to BeliefObject, EvidenceObject, and RT-09 operation ID that cannot be fabricated).

**Wave 3 planning error:** T3-10 was specified as parallel with T3-09-DUM. Even if T3-10 were complete, T3-10 only wires EvidenceObjects — three additional chain stages (InterpretationRecord, BeliefObject, KnowledgeClaim) have no Wave 3 task. The Wave 3 plan implicitly assumed T3-10 would produce KnowledgeClaims, but T3-10's scope is explicitly "EvidenceObject wiring" only.

**`_promoteToKnowledge()` does NOT produce KnowledgeClaims:** The Wave 3 report's proposed T3-10 wiring site (`lib/intelligence/knowledge-validator.js:_promoteToKnowledge()`) produces semantic memory entries (application-layer), not constitutional KnowledgeClaim objects. Even after T3-10 is completed, KnowledgeClaims will not exist unless InterpretationRecord, BeliefObject, and KnowledgeClaim wiring is also implemented at this site.

---

### Gap G-2 — InferenceProtocol Registry Empty

**Constitutional source:** RT10-INV-3: "Only registered InferenceProtocols may be applied to DUM formation." D6 §4.3 AIR-2 obligation: "apply only registered, versioned inference protocols." R10-v1.1 RS-10.2: "Registration through constitutionally authorized process (authority undefined in current constitutional record — stated limitation)."

**DUM schema enforcement:**
```javascript
inference_protocol_ref: { required: true, type: 'string',
  constitutional_source: 'RT10-INV-3; D-2 §VII; D6 §4.3 (AIR-2 obligation); R10-v1.1 RS-10.1'
}
```

**System state:** RT10-STATE-02 (InferenceProtocolRegistry) is empty. No InferenceProtocol instances exist in the codebase. No bootstrap infrastructure for InferenceProtocol registration exists.

**Constitutional open question:** R10-v1.1 RS-10.2 and RS-12 explicitly state that the InferenceProtocol registration authority is not defined in the current constitutional record. This parallels the EpistemicProtocol registration authority open question in R9-v1.0 RS-12.

**D8 INV-4:** A fabricated protocol_id violates Reality Grounding. Absent ≠ registered.

---

### Gap G-3 — Domain Count Discrepancy

**Wave 3 Authorization Report T3-09:** "12 × DomainUnderstandingModel wired... one per constitutional domain (DOM-000001 through DOM-000012)"

**System state:** `civilisation/domain-loader.js` exposes exactly 10 domains (DOM-000001 through DOM-000010). DOM-000011 and DOM-000012 do not exist in the system.

**D8 INV-4:** DUM.domain_id must reference an actual registered domain. If only 10 domains exist, then 2 of the 12 required DUMs cannot have honest domain_id values.

**Resolution path:** Confirm canonical domain count from constitutional specification (D6 §2.1 or A0 §3.11 — whichever specifies domain count), then either register 2 additional domains or update the Wave 3 target from 12 to 10 DUMs.

---

### Gap G-4 — Wave 3 Planning Prerequisite Error

**Wave 3 Report T3-09-DUM prerequisite chain (stated):** "T3-00 → T3-01 → T3-06 → T3-07 (ObservationRecord as DUM input)"

**Actual prerequisite chain (constitutionally required):**
```
T3-00 → T3-01 → T3-06 → T3-07 (ObservationRecord)
    → T3-10 (EvidenceObject at knowledge-validator.js)
    → [New: InterpretationRecord wiring]
    → [New: BeliefObject wiring]
    → [New: KnowledgeClaim wiring]
    → [New: InferenceProtocol bootstrap per domain]
    → T3-09-DUM (DomainUnderstandingModel wiring)
```

**Governing authority:** R10-v1.1 RS-08 RT10-IN-01 governs over Wave 3 planning document (R-series > planning documents per established Wave 3 precedent).

---

## What Is NOT Affected

| Component | Status |
|-----------|--------|
| DomainUnderstandingModel schema | VALID — `learning-record.js` correct |
| InferenceProtocol schema | VALID — `learning-record.js` correct |
| UnderstandingDegradationFlag schema | VALID — `learning-record.js` correct |
| T3-08 bootstrap authority | ACTIVE — unmodified |
| ObservationRecord wiring | ACTIVE — T3-07/T3-08 |
| constitutional_records table | ACTIVE — T3-08.1 |
| All 176 tests | PASSING — unmodified |

---

## Options for Resolution

### Option A: Complete RT-09 Epistemic Chain (Recommended)

Extend Wave 3 with prerequisite tasks that complete the full RT-09 chain before T3-09-DUM:

**A.1 — Complete T3-10 (EvidenceObject wiring at `knowledge-validator.js:_promoteToKnowledge()`)**

**A.2 — New task: Wire InterpretationRecord, BeliefObject, KnowledgeClaim at `knowledge-validator.js`**
At `_promoteToKnowledge()`, the lesson goes through: scoring → evidence aggregation → validation. This is exactly the RT-09 epistemic chain pattern:
- Score applied = EvidenceObject (interpretation protocol applied to observation)
- Evidence aggregated = InterpretationRecord (inference applied to Evidence)
- Validated = BeliefObject (confidence attributes assigned)
- `meetsMin` → KnowledgeClaim (EP-T4 Validation Gate satisfied, promoted to knowledge)

The full epistemic chain CAN be honestly wired at this single site.

**A.3 — New task: Bootstrap InferenceProtocol registry**
Register one InferenceProtocol per domain with documented limitations (registration authority undefined per RS-12 Open Question). Similar constitutional standing to T3-08 bootstrap authority: honest, documented, with stated limitations. No constitutional prohibition on registering protocols through a bootstrap process that documents the open question.

**A.4 — Confirm domain count** 
Verify canonical count from D6 §2.1, adjust Wave 3 DUM target accordingly.

**A.5 — Re-execute T3-09-DUM** with all prerequisites satisfied.

**Constitutional compliance:** Full. No fabrication. No stage-skipping. Knowledge_record_refs point to real KnowledgeClaims produced by the honest RT-09 chain.

---

### Option B: Wire DUM Emission Infrastructure Only (Partial)

Wire the DUM emission point at the wiring site without emitting actual DUM records (fire-and-forget infrastructure that activates when KnowledgeClaims arrive from Option A). Register InferenceProtocol bootstrap. The wiring site exists but produces no DUM instances until the RT-09 chain is complete.

**Constitutional compliance:** Honest about absence of DUM records. Does NOT satisfy Wave 3 certification requirement ("12 DomainUnderstandingModel records produced"). The emission infrastructure is constitutional — it just has no trigger events until prerequisite chain completes. Could be combined with Option A: Option B first (infrastructure), then Option A (produce actual records).

**Limitation:** Wave 3 T3-09-DUM cannot be certified under Option B alone. Would require an IDR for partial scope before this option can be marked RESOLVED.

---

### Option C: Defer T3-09-DUM

Defer T3-09-DUM until T3-10 is complete AND the full RT-09 chain is wired through KnowledgeClaim. Mark T3-09-DUM as DEFERRED with this IDR documenting the blocking dependencies.

**Constitutional compliance:** Honest. No violation. Current system remains constitutionally valid — the bootstrap authority is sufficient for current observation scope. Constitutional maturity lower.

---

## Acceptance Criteria for Resolution

| Criterion | Required for |
|-----------|-------------|
| T3-10 complete — EvidenceObject emitting at `knowledge-validator.js` | Options A, B |
| InterpretationRecord wired at `knowledge-validator.js` | Option A |
| BeliefObject wired at `knowledge-validator.js` | Option A |
| KnowledgeClaim wired at `knowledge-validator.js` | Option A |
| InferenceProtocol bootstrap registered per domain | Options A, B |
| Domain count confirmed (10 or 12) | All options |
| 10 or 12 DomainUnderstandingModel records produced (one per domain) | Option A |
| knowledge_record_ref in each DUM resolves to honest KnowledgeClaim | Option A |
| inference_protocol_ref in each DUM resolves to registered InferenceProtocol | Options A, B |
| All 176 existing tests continue to pass | All options |
| New constitutional tests added for DUM production | Option A |

---

## Required Resolution Authority

Implementation Owner.

This IDR requires a decision on which option to pursue. No T3-09-DUM implementation may proceed until the Implementation Owner selects an option and this IDR is marked RESOLVED.

---

## Constitutional Current State

While this IDR is open:
- T3-08 bootstrap authority (`AG-APEX-SYSTEM-OBSERVER-OBSERVATION-BOOTSTRAP`) is the constitutionally honest authority for all ObservationRecord emissions
- ObservationRecord wiring (T3-07) is active and emitting
- constitutional_records table active (T3-08.1)
- No DomainUnderstandingModel records exist — constitutionally honest (no epistemic chain)
- RT-11 CUM synthesis cannot begin — constitutionally honest (DUMs absent)
- No fabrication is present anywhere in the system

---

*IDR-W3-09-DUM-001 | Status: OPEN | Date: 2026-08-02 | Baseline: APEX-CONSTITUTION-v1.0*  
*Issued per T3-09-DUM Phase 0 Falsification Audit — constitutional STOP verdict.*
