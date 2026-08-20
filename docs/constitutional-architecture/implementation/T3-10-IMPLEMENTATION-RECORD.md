# T3-10 — EvidenceObject Wiring: Implementation Record

**Task:** T3-10 — EvidenceObject Wiring (RT-09, Stage 2)  
**Wave:** Wave 3, Tier 4  
**Date:** 2026-08-02  
**Status:** STOPPED AT PHASE 0 — IDR-W3-10-001 ISSUED  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Authority:** R9-v1.0-canonical.md RS-07/RS-08/RS-12 (RT09-PROC-01); D4 KI-017; D6 §2.1; D8 INV-4; RT09-INV-1/INV-3; IDR-W2-07-001

---

## 1. OBJECTIVE

Wire EvidenceObject (RT-09 Stage 2) at `lib/intelligence/knowledge-validator.js:_promoteToKnowledge()`, emitting one EvidenceObject per constitutionally promoted lesson, grounded in an admitted RT-08 ObservationRecord and a registered EpistemicProtocol. Confirm canonical domain count (10 vs 12) before implementation.

---

## 2. PHASE 0 VERDICT: STOP

Full audit: `docs/constitutional-architecture/implementation/T3-10-PHASE-0-AUDIT.md`

**Field honesty: FULL. Five falsification attempts made. All blocked by structural pipeline gaps.**

### Blocking Gaps

| Gap | Missing Prerequisite | Required By | Consequence |
|-----|---------------------|-------------|-------------|
| G-1 | ObservationRecord ID not returned by `claimReality()`; not in knowledge_validation_queue; not accessible at `_promoteToKnowledge()` | EvidenceObject.observation_projection_ref (REQUIRED); RT09-INV-1; D8 INV-4 | EvidenceObject cannot be emitted; observation_projection_ref cannot be grounded honestly |
| G-2 | No EpistemicProtocol registered; RT09-STATE-02 empty | EvidenceObject.interpretation_protocol_ref (REQUIRED); RT09-INV-3; D6 §4.3 AIR-2 | EvidenceObject cannot be emitted; interpretation_protocol_ref cannot be grounded honestly |
| G-3 | domain-loader missing DOM-000011 (Reality Architecture) and DOM-000012 (Theory of Change) | EvidenceObject.domain_classification (REQUIRED); D6 §2.1; D8 INV-4 | EvidenceObjects for 2 of 12 constitutional domains cannot have honest domain_classification values |

**IDR-W2-07-001 precedent confirmed:** G-1 is not a new discovery. The Wave 2 IDR explicitly documented "No synthetic value can satisfy RT09-INV-1" and established the Wave 3 resolution path: "Connect knowledge-validator.js to RT-08 pipeline as D3 epistemic chain consumer." This IDR-W3-10-001 supersedes IDR-W2-07-001 in the Wave 3 context.

**Canonical domain count confirmed:** D6-v1.0-canonical.md is authoritative. Domain count is **12**. System domain-loader has an implementation gap (10 of 12), not a constitutional design difference.

---

## 3. FILES CREATED

| File | Purpose |
|------|---------|
| `docs/constitutional-architecture/implementation/T3-10-PHASE-0-AUDIT.md` | Phase 0 falsification audit — 5 attempts, STOP verdict, gap documentation, resolution path |
| `docs/constitutional-architecture/decisions/IDR-W3-10-001.md` | IDR — 3 blocking gaps, 2 resolution options, acceptance criteria |
| `docs/constitutional-architecture/implementation/T3-10-IMPLEMENTATION-RECORD.md` | This document |

---

## 4. FILES MODIFIED

**None.** Implementation was constitutionally prohibited.

---

## 5. EVIDENCEOBJECT WIRING STATUS

**BLOCKED.** Cannot proceed until IDR-W3-10-001 is resolved.

```
RT-08 Pipeline (active, but disconnected from wiring site)
    claimReality() → lib/reality/fabric.js
        → setImmediate closure: obsRecordId = 'OBS-${_obs_claimId}-${Date.now()}'
        → returns: data.id (claim ID only)
        → obsRecordId: NEVER SURFACED
    chat.js / orchestrator.js
        → submitLesson(text, { taskId, sourceType })
        → NO obsRecordId parameter
    knowledge_validation_queue
        → columns: validation_id, lesson_text, lesson_source_id, trace_id, task_id, source_type
        → NO obs_record_id column
    _promoteToKnowledge(item, confidence, contradictions)
        → item: { trace_id (observability ID), ...no ObservationRecord ref }
        → observation_projection_ref: CANNOT BE GROUNDED
                                       ←── REQUIRED by EvidenceObject
                                       ←── RT09-INV-1: HARD INVARIANT

EpistemicProtocolRegistry (RT09-STATE-02)
    NO instances registered
    Registration authority constitutionally undefined (R9-v1.0 RS-12 Open Question)
        → interpretation_protocol_ref: CANNOT BE GROUNDED
                                        ←── REQUIRED by EvidenceObject
                                        ←── RT09-INV-3: HARD INVARIANT

Domain-Loader (lib/registry/domain-loader.js)
    10 of 12 constitutional domains registered
    DOM-000011 (Reality Architecture): ABSENT
    DOM-000012 (Theory of Change): ABSENT
        → domain_classification for these 2 domains: CANNOT BE GROUNDED

EvidenceObject (RT-09 Stage 2)
    BLOCKED — all three prerequisites absent
        ↓ (required by InterpretationRecord → BeliefObject → KnowledgeClaim)

KnowledgeClaim → DomainUnderstandingModel → CivilizationUnderstandingModel
    ALL BLOCKED downstream
```

---

## 6. CORRECT WIRING SITE CONFIRMED

Despite the STOP verdict, Phase 0 analysis confirms the constitutional wiring site:

| Object | Wiring Site | Trigger |
|--------|-------------|---------|
| EvidenceObject | `lib/intelligence/knowledge-validator.js:_promoteToKnowledge()` | When lesson reaches scoring step — interpretation protocol applied to observation-grounded lesson |
| InterpretationRecord | Same site — evidence aggregation step | Confirmations gathered, inference applied |
| BeliefObject | Same site — confidence computation step | `_computeConfidence()` assigns epistemic confidence |
| KnowledgeClaim | Same site — `meetsMin` gate | EP-T4: `confirmations >= MIN_CONFIRMATIONS && confidence >= MIN_CONFIDENCE && contradictions.length === 0` |

The full RT-09 epistemic chain maps to a single unified wiring site. This was previously identified in T3-09-DUM Phase 0 analysis and is confirmed by T3-10 Phase 0.

---

## 7. RESOLUTION PATH IDENTIFIED

Three sequential resolutions required:

**R-1 (Pipeline modification — G-1):**
- `lib/reality/fabric.js` — return obsRecordId from claimReality() (alongside claim ID)
- `lib/data/kv.js` submitLesson() — accept obs_record_id; add to knowledge_validation_queue
- `src/routes/chat.js` — pass obsRecordId to submitLesson()
- `agent-system/orchestrator.js` — pass obsRecordId to submitLesson()
- `lib/intelligence/knowledge-validator.js` — receive obs_record_id in item at _promoteToKnowledge()

**R-2 (Bootstrap — G-2):**
- Bootstrap EpistemicProtocol registry: 12 protocols (one per constitutional domain)
- Document: "Registration authority constitutionally undefined per R9-v1.0 RS-12; bootstrap registered under same authority basis as T3-08"
- Register in RT09-STATE-02

**R-3 (Domain-loader update — G-3):**
- Add DOM-000011 (Reality Architecture) and DOM-000012 (Theory of Change) to DOMAIN_MAP
- Update domain count assertion in `tests/registry/domain-loader.test.js` (10 → 12)

All three are constitutionally honest resolutions with no fabrication required.

---

## 8. WAVE 3 AUTHORIZATION REPORT NOTES

The Wave 3 Authorization Report T3-10 states:
- Wiring site: `lib/intelligence/knowledge-validator.js:_promoteToKnowledge()` — **CONFIRMED CORRECT**
- Additional prerequisite: "Constitutional EpistemicProtocol registration for APEX validation heuristics" — **CONFIRMED REQUIRED (Gap G-2)**

The Wave 3 report did NOT document the ObservationRecord pipeline gap (G-1) explicitly, but IDR-W2-07-001 (Wave 2) had already documented this gap and its resolution path. The T3-10 Phase 0 audit confirms and extends that finding in the Wave 3 context.

---

## 9. TEST STATUS

**Unchanged: 176 tests passing, 0 failing.**

No new tests created (no implementation). No regressions introduced.

| Suite | Result |
|-------|--------|
| `tests/authority-grants.test.js` | 33/33 PASS |
| `tests/observation-record-integration.test.js` | 39/39 PASS |
| `tests/reality-fabric-constitutional.test.js` | 34/34 PASS |
| `tests/d5-uncertainty.test.js` | 24/24 PASS |
| `tests/observer-registry.test.js` | 26/26 PASS |
| `tests/constitutional-store-persistence.test.js` | 20/20 PASS |

---

## 10. DOWNSTREAM DEPENDENCY STATE

| Item | Dependency | Status |
|------|-----------|--------|
| EvidenceObject wiring (T3-10) | R-1 + R-2 + R-3 above | BLOCKED (IDR-W3-10-001) |
| InterpretationRecord wiring | After EvidenceObject | NO WAVE 3 TASK |
| BeliefObject wiring | After InterpretationRecord | NO WAVE 3 TASK |
| KnowledgeClaim wiring | After BeliefObject | NO WAVE 3 TASK |
| InferenceProtocol bootstrap (RT-10) | Before DomainUnderstandingModel | NOT DONE |
| DomainUnderstandingModel (T3-09-DUM) | After KnowledgeClaim + InferenceProtocol | BLOCKED (IDR-W3-09-DUM-001) |
| CivilizationUnderstandingModel | After all 12 DUMs | BLOCKED |

---

## 11. IDR-W3-10-001 SUMMARY

**Status: OPEN — requires Implementation Owner decision.**

Two resolution options available:
- **Option A (Recommended):** Implement R-1 (pipeline modification) + R-2 (EpistemicProtocol bootstrap) + R-3 (domain-loader update), then wire EvidenceObject
- **Option B:** Defer T3-10 until pipeline modification is implemented as a separate task

No implementation may begin until the Implementation Owner selects an option and IDR-W3-10-001 is marked RESOLVED.

---

*T3-10 Implementation Record issued: 2026-08-02.*  
*Status: STOPPED AT PHASE 0. IDR-W3-10-001 OPEN.*  
*No code modified. System state: 176 tests passing, bootstrap authority ACTIVE, constitutional_records table LIVE.*
