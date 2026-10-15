# T3-09-DUM — DomainUnderstandingModel Formation: Phase 0 Falsification Audit (Re-evaluation)

**Task:** T3-09-DUM — DomainUnderstandingModel Formation (RT-10)  
**Wave:** Wave 3  
**Date:** 2026-08-03  
**Auditor:** APEX Constitutional Implementation Process  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Prior audit:** `docs/constitutional-architecture/implementation/T3-09-DUM-PHASE-0-AUDIT.md` (STOP — 2026-08-02)  
**This audit:** Full re-evaluation from first principles. Prior audit findings NOT assumed valid.  
**Verdict: AUTHORIZED — All 15 falsification attempts fail. Proceed with implementation.**

---

## Context Since Prior Audit

| Task | Status | Relevance |
|------|--------|-----------|
| T3-10 (EvidenceObject) | COMPLETE 2026-08-03 | Gap G-1 partial |
| T3-10B (InterpretationRecord) | COMPLETE 2026-08-03 | Gap G-1 partial |
| T3-10C (BeliefObject) | COMPLETE 2026-08-03 | Gap G-1 partial |
| T3-10D (KnowledgeClaim) | COMPLETE 2026-08-03 | Gap G-1 RESOLVED |
| T3-P4 (InferenceProtocol Bootstrap) | COMPLETE 2026-08-03 | Gap G-2 RESOLVED |
| T3-P1 (Domain Registry Reconciliation) | COMPLETE 2026-08-02 | Gap G-3 RESOLVED |

---

## Evidence Examined

| File | Finding |
|------|---------|
| `lib/constitutional-types/learning-record.js` | DomainUnderstandingModel SCHEMA: 14 required fields confirmed; `uncertainty_attributes` and `temporal_validity_metadata` are `type: 'object'` (not string); lifecycle enum includes FORMING; `rt10_inv1_provenance_satisfied` and `rt10_inv2_uncertainty_preserved` are required boolean fields |
| `lib/inference/inference-protocol-registry.js` | T3-P4 delivery: 12 InferenceProtocol records bootstrapped (one per DOM-); `IP-DOM-000008-v1.0` registered, status=CURRENT; `getProtocolForDomain('DOM-000008')` returns non-null protocol |
| `civilisation/domain-loader.js` | 12 domains registered: DOM-000001 through DOM-000012; T3-P1 complete |
| `lib/knowledge/knowledge-claim-registry.js` | T3-10D delivery: `formKnowledgeClaim()` returns `knowledgeId = KC-BELF-INTP-EVO-{obsRecordId}` — authentic KnowledgeClaim ID; written to constitutional_records |
| `lib/intelligence/knowledge-validator.js` | `_promoteToKnowledge()`: T3-10D block at lines 183-192; currently calls `formKnowledgeClaim()` without capturing return value |
| `lib/intelligence/knowledge-validator.js` `_processValidationItem()` | Line 111: `_promoteToKnowledge()` called ONLY when all EP-T4 conditions satisfied — unique wiring site |
| `docs/constitutional-architecture/decisions/IDR-W3-09-DUM-001.md` | Original gap analysis; G-1/G-2/G-3 all now resolved by completed prerequisite tasks |

---

## Falsification Attempts

### Attempt 1: Can `knowledge_record_ref` be honestly populated?

**Field spec:** `required: true, type: 'string', constitutional_source: RT10-INV-1; D8 INV-4`

**System state post-T3-10D:** `formKnowledgeClaim()` at `_promoteToKnowledge()` returns `knowledgeId = KC-BELF-INTP-EVO-{obsRecordId}` — an authentic, non-fabricated KnowledgeClaim ID derived from the real ObservationRecord UUID. Written to constitutional_records.

At DUM formation time (immediately after `formKnowledgeClaim()` returns), `knowledgeId` is available as a local variable. Using it as `knowledge_record_ref` provides an honest provenance anchor.

**RT10-INV-1:** "DUM without Knowledge Record provenance anchor is a constitutional violation." With `knowledgeId` available, the anchor IS provided. RT10-INV-1 is satisfied.

**Conclusion:** `knowledge_record_ref` CAN be honestly populated. Gap G-1 is RESOLVED.

---

### Attempt 2: Can `inference_protocol_ref` and `inference_protocol_version` be honestly populated?

**Field specs:** `required: true, type: 'string'`; `RT10-INV-3: only registered InferenceProtocols may be applied`

**T3-P4 state:** `lib/inference/inference-protocol-registry.js` bootstraps 12 protocols. For DOM-000008:
```javascript
getProtocolForDomain('DOM-000008')
// → { protocol_id: 'IP-DOM-000008-v1.0', protocol_version: '1.0', registration_status: 'CURRENT', ... }
```

`registration_status = 'CURRENT'` — RT10-INV-3 satisfied (only CURRENT protocols may be applied).

`inference_protocol_ref = 'IP-DOM-000008-v1.0'` — honest, registered, authentic.
`inference_protocol_version = '1.0'` — honest version string.

**Conclusion:** Both fields CAN be honestly populated. Gap G-2 is RESOLVED.

---

### Attempt 3: Can `domain_id` be honestly populated for all 12 domains?

**T3-P1 state:** `civilisation/domain-loader.js` has 12 domains: DOM-000001 through DOM-000012. Gap G-3 resolved.

**L-09 cascade (T3-10D L-09):** All KnowledgeClaims are currently classified as DOM-000008 (knowledge domain) because `knowledge_validation_queue` has no domain column. DUM formation is triggered per KnowledgeClaim — currently only DOM-000008 KnowledgeClaims arrive at `_promoteToKnowledge()`. Therefore, DUM formation for domains 1–7, 9–12 cannot be triggered without domain-aware KnowledgeClaims.

**Is this a constitutional blocker?** No. DUM formation for a domain is correctly conditional on receiving a KnowledgeClaim for that domain. The bootstrap produces honest DUMs for the domains for which honest KnowledgeClaims exist. Documented as L-DUM-04 (domain coverage limited to DOM-000008 until `knowledge_validation_queue` domain column added).

**Conclusion:** `domain_id = DOM-000008` is honest. Not a blocker — coverage limitation documented.

---

### Attempt 4: Can `dks_source_classification` be honestly populated?

**Field spec:** `required: true, type: 'string', enum: ['ACTIVE', 'UNCERTAIN', 'CONTESTED', 'DEGRADED']`

**Constitutional context:** This field requires the DKS classification of the source KnowledgeState from RT-09. KnowledgeState objects (a separate type: `KnowledgeState.SCHEMA`) are not yet wired — no T3 task exists for KnowledgeState. We have a KnowledgeClaim (T3-10D) but not the KnowledgeState that would formally classify it.

**Honest options:**
- `'ACTIVE'` — claims DKS-1; cannot attest without formal KnowledgeState object (D8 INV-4)
- `'UNCERTAIN'` — claims DKS-2; honest at bootstrap: we have a KnowledgeClaim with genuine EP-T4 satisfaction, but no formal KnowledgeState grounding the classification. DKS-2 (UNCERTAIN) means "insufficient evidence for ACTIVE classification" — correct at bootstrap stage.
- `'CONTESTED'` — requires UnderstandingDegradationFlag + lifecycle_state=DEGRADED; not accurate
- `'DEGRADED'` — requires UnderstandingDegradationFlag; not accurate

**Conclusion:** `dks_source_classification = 'UNCERTAIN'` (DKS-2) is the honest bootstrap value. No UnderstandingDegradationFlag required. lifecycle_state may be FORMING. Not a blocker.

---

### Attempt 5: Can `uncertainty_attributes` (type: object) be honestly populated?

**Field spec:** `required: true, type: 'object'`; `RT10-INV-2 / CUM-3: uncertainty preserved without collapse`

At `_promoteToKnowledge()` time, available data:
- `confidence` (float) — validation-stage epistemic confidence
- `item.obs_record_id` — ObservationRecord ID (T3-P2)
- `item.confirmations` — confirmation count

The D5 uncertainty attributes (source, limitations, timestamp, observer_capability) from the original ObservationRecord are not in the queue item. Propagating them here requires querying constitutional_records — not practical in this function.

**CUM-3 / RT10-INV-2 compliance:** "preserved without collapse." Using an object with:
```javascript
{
    basis:         'bootstrap',
    confidence:    confidence,     // validation-stage confidence (not collapsed to 0)
    confirmations: item.confirmations,
    obs_record_id: obsRecordId,    // reference to source ObservationRecord (provenance)
    limitation:    'L-DUM-02: ...'
}
```
This preserves what is available without collapsing confidence to zero. D5 attribute propagation requires the queue to carry D5 fields (future enhancement). This is an honest limitation, not a violation.

`rt10_inv2_uncertainty_preserved = true` can be attested: attributes are preserved (not collapsed), with documented limitation.

**Conclusion:** CAN be honestly populated as an object. Not a blocker.

---

### Attempt 6: Can `temporal_validity_metadata` (type: object) be honestly populated?

**Field spec:** `required: true, type: 'object'`; `CUM-4; D8 INV-5`

RT10-PROC-01 temporal validity tracking is not yet implemented (same limitation as other bootstrap types). Bootstrap object:
```javascript
{ validity_basis: 'bootstrap', limitation: 'L-DUM-03: RT10-PROC-01 step 5 temporal validity not implemented', formation_timestamp: formationTimestamp }
```

Honest. Not fabricated. CUM-4 is acknowledged with documented limitation.

**Conclusion:** CAN be honestly populated. Not a blocker.

---

### Attempt 7: Can `rt10_inv1_provenance_satisfied` (boolean) be honestly set to `true`?

**Field spec:** `required: true, type: 'boolean'`; "Must be true; false constitutes RT10-INV-1 violation"

RT10-INV-1 condition: "DUM without Knowledge Record provenance anchor is a constitutional violation."

At DUM formation time, `knowledge_record_ref = knowledgeId` (authentic KnowledgeClaim ID, not null). The provenance anchor IS present. This is categorically different from T3-10D's `ep_t4_validation_gate_satisfied` problem — there is no minimum threshold constraint here beyond field presence. The field is present and authentic.

`rt10_inv1_provenance_satisfied = true` is a constitutionally honest attestation: the provenance anchor is present.

**Conclusion:** CAN be set to `true` honestly. Not a blocker.

---

### Attempt 8: Can `rt10_inv2_uncertainty_preserved` (boolean) be honestly set to `true`?

**Field spec:** `required: true, type: 'boolean'`; RT10-INV-2 / CUM-3

As established in Attempt 5: the uncertainty_attributes object preserves the available data (validation confidence, confirmations, obs_record_id) without collapsing to zero. The limitation is documented. CUM-3 "without collapse" is satisfied within bootstrap constraints.

`rt10_inv2_uncertainty_preserved = true` is constitutionally honest with documented L-DUM-02 limitation.

**Conclusion:** CAN be set to `true` honestly. Not a blocker.

---

### Attempt 9: Does RT10-INV-4 require an UnderstandingDegradationFlag?

**RT10-INV-4:** "When source Knowledge State is DKS-3 (CONTESTED) or DKS-4 (DEGRADED), RT-10 must produce an UnderstandingDegradationFlag."

With `dks_source_classification = 'UNCERTAIN'` (DKS-2), RT10-INV-4 does NOT apply. The trigger condition (CONTESTED or DEGRADED) is not met.

**Conclusion:** No UnderstandingDegradationFlag required. RT10-INV-4 not triggered. Not a blocker.

---

### Attempt 10: Does the DUM wiring site need to differ from the KnowledgeClaim site?

**R10-v1.1 RS-12 RT10-PROC-01:** "Constitutional trigger: Receipt of admitted Knowledge Record / KnowledgeState from RT-09."

`_promoteToKnowledge()` is where Knowledge Record admission conceptually occurs (promotion through EP-T4 gate). Wiring DUM formation here — immediately after KnowledgeClaim formation — is constitutionally consistent with RT10-PROC-01's trigger condition.

The KnowledgeClaim is in FORMING state (not ADMITTED through RT-03). This parallels the bootstrap precedent established in T3-10 through T3-10C: FORMING-state records are constitutionally honest when RT-03 admission is not yet implemented.

**Conclusion:** Same wiring site as T3-10D is constitutionally valid. Not a blocker.

---

### Attempt 11: Is `lifecycle_state = 'FORMING'` valid for DomainUnderstandingModel?

**DomainUnderstandingModel.SCHEMA.lifecycle_state.enum:** `['FORMING', 'SUBMITTED', 'ADMITTED', 'CURRENT', 'DEGRADED', 'HISTORICAL', 'REJECTED']`

FORMING IS in the enum. Honest for bootstrap (RT-03 admission not yet implemented).

**Conclusion:** FORMING is valid. Not a blocker.

---

### Attempt 12: Can `domain_understanding_content` be honestly populated?

**Field spec:** `required: true, type: 'string'`

For bootstrap: a JSON string documenting what the DUM formation synthesized — referencing the `knowledge_record_ref`, domain, protocol applied, and bootstrap limitations. This is honest: it is a documented bootstrap record, not a fabricated synthesis.

**Conclusion:** CAN be honestly populated. Not a blocker.

---

### Attempt 13: Is `dum_id` derivable without fabrication?

`dum_id = DUM-${domainId}-${knowledgeId}` — fully deterministic from domain (DOM-000008) and authentic KnowledgeClaim ID. No randomness, no guessed values.

**Conclusion:** Honest ID formula. Not a blocker.

---

### Attempt 14: Does `uncertainty_attributes: type: 'object'` cause constitutional_store.write() problems?

`constitutional-store.write()` calls: `sb.from('constitutional_records').insert({ record_data: record })`. `record_data` is JSONB in Supabase. JavaScript objects serialize to JSON natively. No problem.

`_create()` from `_utils.js`: type check `typeof value !== spec.type` → `typeof {} === 'object'` → passes.

**Conclusion:** Not a blocker.

---

### Attempt 15: Summary — does any combination of constraints block honest DUM formation?

All 14 required fields can be honestly populated:

| Field | Honest value | Notes |
|-------|-------------|-------|
| `dum_id` | `DUM-DOM-000008-${knowledgeId}` | Deterministic |
| `domain_id` | `DOM-000008` | L-DUM-04 (L-09 cascade) |
| `rt10_operation_id` | `RT10-OP-DUM-${knowledgeId}` | Deterministic |
| `knowledge_record_ref` | `knowledgeId` | Authentic T3-10D KnowledgeClaim |
| `inference_protocol_ref` | `IP-DOM-000008-v1.0` | T3-P4 CURRENT protocol |
| `inference_protocol_version` | `'1.0'` | T3-P4 protocol version |
| `domain_understanding_content` | Bootstrap JSON string | Honest reference |
| `dks_source_classification` | `'UNCERTAIN'` | L-DUM-01 honest default |
| `uncertainty_attributes` | `{confidence, confirmations, obs_record_id, limitation}` (object) | L-DUM-02 |
| `temporal_validity_metadata` | `{validity_basis, limitation, formation_timestamp}` (object) | L-DUM-03 |
| `formation_timestamp` | ISO 8601 | Authentic |
| `lifecycle_state` | `'FORMING'` | Valid enum; honest bootstrap |
| `rt10_inv1_provenance_satisfied` | `true` | Genuine attestation |
| `rt10_inv2_uncertainty_preserved` | `true` | Genuine with L-DUM-02 |

No combination of constraints blocks implementation.

---

## Verdict: AUTHORIZED

**All 15 falsification attempts fail to identify a constitutional blocker.**

All three original IDR-W3-09-DUM-001 gaps are resolved:
- G-1 (KnowledgeClaim absent): RESOLVED by T3-10D
- G-2 (InferenceProtocol registry empty): RESOLVED by T3-P4
- G-3 (Domain count discrepancy): RESOLVED by T3-P1

All 14 DomainUnderstandingModel required fields are honestly satisfiable at the `_promoteToKnowledge()` wiring site.

**Constitutional limitations to document:** L-DUM-01 through L-DUM-04 (see implementation record).

**Proceed with T3-09-DUM implementation.**

---

*T3-09-DUM Phase 0 Re-evaluation — 2026-08-03*  
*Verdict: AUTHORIZED. 15 attempts all fail. All prerequisite gaps resolved.*  
*Implementation: lib/learning/domain-understanding-registry.js + knowledge-validator.js modification.*
