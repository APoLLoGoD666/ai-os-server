# T3-P5 — Domain Provenance Propagation: Implementation Record

**Task:** T3-P5 — Domain Provenance Propagation
**Wave:** Wave 3 Prerequisite
**Date:** 2026-08-03
**Status:** COMPLETE
**Baseline:** APEX-CONSTITUTION-v1.0
**Authority:** R10-v1.1-canonical.md RT10-INV-3; R11-v1.3-canonical.md RT11-INV-3;
              D8 INV-4 (Reality Grounding); A0-v1.1.1 §3.11 §3.12;
              T3-09-DUM COMPLETE; T3-11 COMPLETE;
              T3-P5-DOMAIN-PROVENANCE-PHASE-0-AUDIT.md (AUTHORIZED)

---

## 1. OBJECTIVE

Add domain provenance propagation through the knowledge validation pipeline so that:
- Callers can assert a constitutional domain when submitting a lesson
- The asserted domain is stored in `knowledge_validation_queue.domain_id`
- The domain is propagated to `formDomainUnderstanding()` to produce domain-encoded DUM IDs
- DUMs from any of the 12 constitutional domains can be formed (CUM aggregation readiness)
- All existing contracts and callers are preserved (backward compatible)

---

## 2. PHASE 0 VERDICT: AUTHORIZED

Full audit: `docs/constitutional-architecture/implementation/T3-P5-DOMAIN-PROVENANCE-PHASE-0-AUDIT.md`

**12 falsification attempts. 0 blockers found. AUTHORIZED.**

Key findings:
- F-01: Domain provenance IS constitutionally required (RT11-INV-3 / RT10-INV-3)
- F-02: Text inference PROHIBITED by D8 INV-4
- F-03: Nullable column addition is non-destructive (T3-P2 precedent)
- F-04: DOMAIN_MAP validation improves RT10-INV-3 compliance
- F-05, F-09: Existing callers and tests unaffected (backward compatible)
- F-08: All 12 domains have registered InferenceProtocols (T3-P4 COMPLETE)

---

## 3. CONSTITUTIONAL LIMITATIONS

| Limitation | Description |
|-----------|-------------|
| L-P5-01 | Source B (ObservationRecord.domain_attribution lookup via obs_record_id) deferred to T3-P5B; requires DB query at submitLesson() time |
| L-P5-02 | Existing callers (chat.js, orchestrator.js) do not provide domainId — their submissions continue to route to DOM-000008 |
| L-P5-03 | CUM advancement to SYNTHESIZING requires 12 DUMs from 12 distinct domains; deferred to operational RT-11 |
| L-P5-04 | null domain_id → DOM-000008 default — backward compatible; existing lessons remain in knowledge domain |

---

## 4. FILES CREATED

| File | Purpose |
|------|---------|
| `migrations/082_domain_id_propagation.sql` | ADD COLUMN domain_id TEXT to knowledge_validation_queue; CREATE INDEX idx_kvq_domain_id |
| `tests/domain-provenance-propagation.test.js` | T3-P5 constitutional test suite (28 tests) |
| `docs/constitutional-architecture/implementation/T3-P5-DOMAIN-PROVENANCE-PHASE-0-AUDIT.md` | Phase 0 falsification audit — 12 attempts, AUTHORIZED |
| `docs/constitutional-architecture/implementation/T3-P5-DOMAIN-PROVENANCE-IMPLEMENTATION-RECORD.md` | This record |

---

## 5. FILES MODIFIED

| File | Change |
|------|--------|
| `lib/intelligence/knowledge-validator.js` | `submitLesson()`: destructure `domainId` from options; add `domain_id: domainId \|\| null` to INSERT. `_promoteToKnowledge()`: pass `domainId: item.domain_id \|\| null` to `formDomainUnderstanding()`. |
| `lib/learning/domain-understanding-registry.js` | Added `DOMAIN_MAP` import from `civilisation/domain-loader`. `formDomainUnderstanding()`: accept `domainId` param; compute `effectiveDomainId = (domainId && DOMAIN_MAP[domainId]) ? domainId : _DUM_DOMAIN_ID`; use `effectiveDomainId` throughout (DUM ID, InferenceProtocol lookup, domain_id field, domain_understanding_content). |

---

## 6. DOMAIN PROVENANCE MECHANISM

```
submitLesson(text, { domainId: 'DOM-000002' })
    ↓
knowledge_validation_queue INSERT { domain_id: 'DOM-000002' }
    ↓
_promoteToKnowledge(item)   [item.domain_id = 'DOM-000002']
    ↓
formDomainUnderstanding({ domainId: 'DOM-000002' })
    ↓
effectiveDomainId = DOMAIN_MAP['DOM-000002'] ? 'DOM-000002' : 'DOM-000008'
                  = 'DOM-000002'  (valid → passes through)
    ↓
dumId = DUM-DOM-000002-KC-...   (domain-encoded)
InferenceProtocol = IP-DOM-000002-v1.0
```

**D8 INV-4 validation:**
- Valid ID (in DOMAIN_MAP) → passes through as `effectiveDomainId`
- Invalid/absent ID → falls back to `_DUM_DOMAIN_ID` = 'DOM-000008'
- No fabricated domains can enter the DUM pipeline

---

## 7. CUM AGGREGATION READINESS

With T3-P5 complete, the pipeline is structurally ready to receive DUMs from all 12 domains:

| Domain | DUM ID Formula | InferenceProtocol |
|--------|---------------|-------------------|
| DOM-000001 (civilisation) | DUM-DOM-000001-KC-... | IP-DOM-000001-v1.0 |
| DOM-000002 (intelligence) | DUM-DOM-000002-KC-... | IP-DOM-000002-v1.0 |
| ... | ... | ... |
| DOM-000012 (theory_of_change) | DUM-DOM-000012-KC-... | IP-DOM-000012-v1.0 |

Each domain produces a distinct DUM ID. All 12 InferenceProtocols registered (T3-P4 COMPLETE).

CUM advancement to SYNTHESIZING (all 12 DUMs present) requires:
1. Callers across all 12 domains submitting lessons with `domainId` — **NOW POSSIBLE** (T3-P5)
2. CUM synthesis process aggregating DUMs from all 12 domains — deferred (L-P5-03)

---

## 8. TEST RESULTS

### T3-P5 Dedicated Suite

| File | Tests | Result |
|------|-------|--------|
| `tests/domain-provenance-propagation.test.js` | 28 | 28/28 PASS |

Test coverage:
- Module loading (4 tests)
- DOMAIN_MAP structure: 12 domains, key IDs (4 tests)
- Registry exports: function, _DUM_DOMAIN_ID, frozen (3 tests)
- Backward compat: null/omitted → DOM-000008 (2 tests)
- Valid domainId → domain-encoded DUM ID: 3 representative domains (3 tests)
- D8 INV-4: invalid/fabricated IDs rejected (2 tests)
- Multiple domains → distinct DUM IDs, no collision (2 tests)
- No-throw contract (1 test)
- knowledge-validator wiring verification via source (3 tests)
- CUM aggregation readiness: 12 domains, distinct IDs, formula validation, DOM- prefix (4 tests)

### Full Constitutional Regression

| Result | Count |
|--------|-------|
| PASS | 661 |
| FAIL | 0 |

**Prior baseline (post-T3-11):** 633/633 PASS
**Post-T3-P5 total:** 661/661 PASS
**New tests added by T3-P5:** 28 net-new

---

## 9. INVARIANT COMPLIANCE

| Invariant | Status |
|-----------|--------|
| RT10-INV-3: only registered InferenceProtocols applied | IMPROVED — DOMAIN_MAP validation rejects unregistered domains |
| RT11-INV-3: CSP not initiated with <12 DUMs | SATISFIED — ACCUMULATING state; infrastructure ready |
| D8 INV-4: no fabricated domains | SATISFIED — effectiveDomainId validated against DOMAIN_MAP |
| L-DUM-04: resolved | domain_id column added; DUMs can now be formed for any domain |

---

## 10. REMAINING WAVE 3 BLOCKERS

| Item | Status | Blocker |
|------|--------|---------|
| Source B domain lookup (ObservationRecord.domain_attribution) | Not started | T3-P5B — DB query at submitLesson() time |
| CUM advancement to SYNTHESIZING (12 DUMs) | Blocked pending callers | Callers must provide domainId; operational RT-11 synthesis process |
| CUM lifecycle management (STALE/EXPIRED/DEGRADED) | Not started | RT-03 Gate |
| CivilizationalDecisionProposal (CDP) | Not started | Requires CURRENT CUM |

---

*T3-P5 Implementation Record: 2026-08-03.*
*Status: COMPLETE. 661/661 constitutional tests PASS.*
*Files created: 4. Files modified: 2.*
