# W2-07 Knowledge Validator Baseline

**Task:** W2-07 — EvidenceObject Constitutional Integration  
**Date:** 2026-07-29  
**Phase:** 0 (Baseline / Field Honesty Assessment)  
**Target file:** `lib/intelligence/knowledge-validator.js`  
**Constitutional type:** `EvidenceObject` (RT-09)  
**Baseline:** APEX-CONSTITUTION-v1.0

---

## 1. TARGET FILE INVENTORY

### 1.1 `lib/intelligence/knowledge-validator.js`

**Size:** 297 lines  
**Exports:** `{ submitLesson, processPending, getStats }`  
**Purpose:** Validates lessons through a multi-stage epistemic pipeline before promoting them to semantic memory and the knowledge graph.

**Pipeline summary:**
```
submitLesson(lessonText, options)
  ↓
knowledge_validation_queue (DB table)
  ↓
processPending() — hourly cron batch
  ↓
_processValidationItem(item)
  ↓
  ├── _scoreLessonText(text)         — heuristic keyword scoring
  ├── _findContradictions(text)      — semantic memory search
  ├── _computeConfidence(...)        — weighted formula
  └── → _promoteToKnowledge(item, confidence, contradictions)
           ↓
           semanticMem.storeFact()
           knowledgeGraph.syncFromMemory()
           knowledge_validation_queue UPDATE (status: 'validated')
```

**Execution contexts:**
1. `submitLesson()` — caller-triggered; inserts into `knowledge_validation_queue`
2. `processPending()` — batch processor; promotes qualifying items to semantic memory
3. `_promoteToKnowledge()` — the promotion endpoint; creates semantic facts + graph nodes

**Data available at `_promoteToKnowledge()`:**
| Field | Source | Type |
|-------|--------|------|
| `validation_id` | Generated (`kvq-*` prefix from `generateMemoryId`) | string |
| `lesson_text` | Caller-provided text | string |
| `trace_id` | Caller option | string or null |
| `confidence` | `_computeConfidence()` result | float (0.0–1.0) |
| `contradictions` | `_findContradictions()` result | array |

---

## 2. CONSTITUTIONAL TYPE ASSESSMENT

### 2.1 EvidenceObject Required Fields (14 fields)

| Field | Required | Type | Enum |
|-------|----------|------|------|
| `evidence_id` | YES | string | — |
| `observation_projection_ref` | YES | string | — |
| `rt09_operation_id` | YES | string | — |
| `interpretation_protocol_ref` | YES | string | — |
| `protocol_version` | YES | string | — |
| `uncertainty_source` | YES | string | — |
| `uncertainty_confidence` | YES | string | — |
| `uncertainty_limitations` | YES | string | — |
| `uncertainty_timestamp` | YES | string | — |
| `uncertainty_observer_capability` | YES | string | — |
| `domain_classification` | YES | string | — |
| `temporal_validity_metadata` | YES | string | — |
| `formation_timestamp` | YES | string (ISO 8601) | — |
| `lifecycle_state` | YES | string | FORMING\|SUBMITTED\|ADMITTED\|HISTORICAL\|REJECTED |

**Scope note:** KnowledgeClaim is OUT OF SCOPE for W2-07. `KnowledgeClaim.belief_object_ref` requires a `BeliefObject.belief_id` from a BeliefObject produced nowhere in the codebase. Same IDR class as W2-05 `decision_ref`. KnowledgeClaim deferred to Wave 3 per task issuance constraint.

---

## 3. FIELD HONESTY ASSESSMENT

### 3.1 Field-by-Field Analysis

| Field | Available at wiring point? | Honest source | Assessment |
|-------|---------------------------|---------------|------------|
| `evidence_id` | YES | Generate from `validation_id` (`'eo-' + validation_id`) | **HONEST** |
| `observation_projection_ref` | **NO** | No RT-08 ObservationRecord in pipeline | **BLOCKER — IDR** |
| `rt09_operation_id` | Partial | Could synthesize from `validation_id` | Borderline synthetic |
| `interpretation_protocol_ref` | **NO** | No registered EpistemicProtocol exists | **BLOCKER — IDR** |
| `protocol_version` | **NO** | Depends on interpretation_protocol_ref | **BLOCKED** |
| `uncertainty_source` | **NO** | `source_type` ('lesson') is NOT a KI-017 uncertainty attribute from an ObservationRecord | **FABRICATION** |
| `uncertainty_confidence` | **NO** | `confidence` is a computed float (0.0–1.0), NOT preserved from a source ObservationRecord per KI-017 | **FABRICATION** |
| `uncertainty_limitations` | **NO** | No limitations metadata in validation queue | **NO SOURCE** |
| `uncertainty_timestamp` | **NO** | Evidence timestamps exist but are NOT KI-017 Observation timestamps | **FABRICATION** |
| `uncertainty_observer_capability` | **NO** | No observer capability metadata anywhere | **NO SOURCE** |
| `domain_classification` | **NO** | `_classifyLesson()` returns 'rule'/'pattern'/'fact'/'concept' — NOT constitutional domain IDs (DOM-000001..12) | **WRONG DATA TYPE** |
| `temporal_validity_metadata` | **NO** | No temporal validity metadata in the validation queue | **NO SOURCE** |
| `formation_timestamp` | YES | `new Date().toISOString()` | **HONEST** |
| `lifecycle_state` | YES | `'FORMING'` at creation point | **HONEST** |

### 3.2 Summary

| Status | Count | Fields |
|--------|-------|--------|
| HONEST | 3 | `evidence_id`, `formation_timestamp`, `lifecycle_state` |
| IDR BLOCKER | 2 | `observation_projection_ref`, `interpretation_protocol_ref` |
| BLOCKED (depends on IDR) | 1 | `protocol_version` |
| FABRICATION (would synthesize value from unrelated data) | 4 | `uncertainty_source`, `uncertainty_confidence`, `uncertainty_timestamp`, `uncertainty_observer_capability` — all are KI-017 preserved attributes from ObservationRecord |
| NO SOURCE | 2 | `uncertainty_limitations`, `temporal_validity_metadata` |
| WRONG DATA TYPE | 1 | `domain_classification` (semantic category ≠ constitutional domain ID) |
| **TOTAL** | **14** | |

**Honest field satisfaction: 3/14 (21%)**

---

## 4. ROOT CAUSE ANALYSIS

### 4.1 Architectural Disconnect

The knowledge validator pipeline is architecturally disconnected from the RT-08 Observation layer:

**D3 Epistemic Chain (constitutional requirement):**
```
RT-08 ObservationRecord (Observation Projection)
  ↓ admitted via RT-03 Class A
EvidenceObject.observation_projection_ref → ObservationRecord.record_id
  ↓
InterpretationRecord.evidence_record_ref → EvidenceObject.evidence_id
  ↓
BeliefObject.interpretation_record_ref → InterpretationRecord.interpretation_id
  ↓
KnowledgeClaim.belief_object_ref → BeliefObject.belief_id
```

**Actual knowledge-validator.js pipeline:**
```
submitLesson(lessonText, options)
  → knowledge_validation_queue (lesson text, not RT-08 ObservationRecord)
  → heuristic scoring (_scoreLessonText, _classifyLesson)
  → semanticMem.storeFact()
```

The validation queue has `lesson_source_id`, `trace_id`, `task_id` — these are APEX operational identifiers, not RT-08 ObservationRecord references. The validator bypasses the entire D3 epistemic chain.

### 4.2 EpistemicProtocol Absence

EvidenceObject requires:
- `interpretation_protocol_ref` → an `EpistemicProtocol.protocol_id` from a constitutionally registered protocol
- `protocol_version` → the version of that protocol

No EpistemicProtocol is registered anywhere in the codebase:
- `_classifyLesson()` uses regex pattern matching — NOT a registered protocol
- `_scoreLessonText()` uses keyword counting — NOT a registered protocol
- No `EpistemicProtocol.create()` call exists in any production file

### 4.3 KI-017 Uncertainty Attribute Mismatch

EvidenceObject requires five KI-017 uncertainty attributes PRESERVED from the source ObservationRecord:
1. `uncertainty_source` — origin and nature of the observation source
2. `uncertainty_confidence` — confidence level of the source observation
3. `uncertainty_limitations` — known limitations at time of observation
4. `uncertainty_timestamp` — temporal position of the source observation
5. `uncertainty_observer_capability` — capability state of observer at time of observation

The knowledge validator has NO ObservationRecord. Using `source_type`, the computed `confidence` float, or event timestamps as substitutes would constitute fabrication — they are fundamentally different data from different systems.

### 4.4 Constitutional Domain Classification Gap

`domain_classification` requires a constitutional domain identifier (DOM-000001 through DOM-000012 per A0 §3.10 R5 and RT-15 coordination requirements). The `_classifyLesson()` function produces semantic categories ('rule', 'pattern', 'fact', 'concept'). These are not interchangeable — the constitutional domain system is a fixed 12-domain ontology, not a semantic category taxonomy.

---

## 5. WIRING LOCATION ASSESSMENT

**Candidate wiring point: `_promoteToKnowledge()`**

This is the natural promotion endpoint where a lesson is fully validated and transitioned to 'validated' status. It is the best candidate in the file for EvidenceObject emission.

**Assessment:** Even at the ideal wiring point (`_promoteToKnowledge()`), 11 of 14 required fields cannot be honestly populated. The blocking fields include the most fundamental constitutional requirement — the RT-08 provenance anchor (`observation_projection_ref`).

**No other wiring location in the file resolves these deficiencies.** The architectural disconnect between lesson-based validation and RT-08 observation processing is a property of the entire module, not of a specific function.

---

## 6. IDR DETERMINATION

**W2-07 EvidenceObject: IDR REQUIRED**

EvidenceObject cannot be honestly wired at `lib/intelligence/knowledge-validator.js` in Wave 2.

**Primary blockers:**
1. `observation_projection_ref` — no RT-08 ObservationRecord in pipeline (RT09-INV-1, D8 INV-4 Reality Grounding)
2. `interpretation_protocol_ref` — no registered EpistemicProtocol in codebase (D6 §4.3 AIR-2)
3. Five KI-017 uncertainty attributes — all require an ObservationRecord that does not exist in this pipeline

**Classification:** Architectural disconnect IDR (same class as W2-05 `decision_ref`) — not a planning error, not a missing optional field. The fundamental prerequisite (RT-08 observation pipeline) does not exist at the knowledge validator.

**Wave 3 resolution path:**
1. Establish RT-08 ObservationRecord emission in APEX observation entry points
2. Route observation projections through the D3 epistemic chain (RT-03 Class A admission)
3. Register EpistemicProtocols for knowledge validator heuristics
4. Connect `knowledge-validator.js` to the RT-08 pipeline as a consumer
5. Implement constitutional domain classification in the lesson categorization system

---

## 7. SCOPE CONFIRMATION

| Type | Status | Reason |
|------|--------|--------|
| EvidenceObject | IDR REQUIRED — Deferred to Wave 3 | 11/14 fields unresolvable; architectural disconnect |
| KnowledgeClaim | OUT OF SCOPE (task issuance constraint) | `belief_object_ref` requires BeliefObject not in codebase |

**No production code changes in W2-07 Phase 0.**

---

*W2-07 Baseline created: 2026-07-29. Constitutional authority: APEX-CONSTITUTION-v1.0.*  
*Type authority: R9-v1.0 RS-07 RT09-OBJ-01; D8 INV-4 (Reality Grounding); RT09-INV-1; D6 §4.3 AIR-2; D4 KI-017.*
