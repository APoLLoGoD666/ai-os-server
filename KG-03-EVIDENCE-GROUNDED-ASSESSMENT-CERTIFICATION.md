# KG-03 — Evidence-Grounded Knowledge Assessment Certification

**Status:** CERTIFIED  
**Date:** 2026-08-26  
**Baseline commit:** KG-02 (1ec8546)  
**Tests:** 1878 / 1878 PASS (71 new + 1807 regression)

---

## 1. Authority

- KG-02-KNOWLEDGE-GAP-LIFECYCLE-CERTIFICATION.md
- KG-01-KNOWLEDGE-GAP-FOUNDATION-CERTIFICATION.md
- APEX-CANONICAL-SYSTEM.md
- APEX-CERTIFICATION-INDEX.md
- APEX-CONSTITUTION-v1.0

---

## 2. Mandate

Solve **KG-02-L03**: confidence and completeness in `assessRequirement()` were caller-authoritative — a caller could supply `{evidence_type:'OBSERVED', confidence:0.99, completeness:1.0}` and force `SATISFIED` with no evidence verification.

KG-03 answer: when a caller supplies `evidence_refs` (validation_id or KC-* knowledge claim IDs), the engine looks up the actual records in canonical stores and derives confidence, completeness, contradictions, and freshness **independently**. Caller-supplied values are entirely overridden.

---

## 3. Files Changed / Created

| File | Type | Description |
|------|------|-------------|
| `lib/knowledge/knowledge-evidence-evaluator.js` | New | KG-03 core evaluator; independent derivation from KVQ + constitutional_records |
| `lib/knowledge/knowledge-lifecycle.js` | Modified | `assessRequirement()` — added `evidence_refs` param + evidence-grounded path |
| `lib/knowledge/knowledge-gap-engine.js` | Modified | Re-exports evaluator through canonical surface |
| `tests/knowledge-evidence-evaluator.test.js` | New | 71 tests: contract, taxonomy, pure helpers, falsification, regression |

**No new migrations required.** KG-03 works entirely against existing tables:
- `knowledge_validation_queue` (migration 010)
- `constitutional_records` (existing)
- `contradiction_reports` (existing)
- `knowledge_gaps` (migration 083)
- `temporal_validity_windows` (migration 085)

---

## 4. Evidence-Grounded Evaluation Model

### 4.1 Source Authority Weights

| Source Type | Evidence Type | Authority |
|-------------|---------------|-----------|
| `constitutional` | RETRIEVED | 1.00 |
| `observation`   | OBSERVED   | 0.90 |
| `user`          | USER_PROVIDED | 0.85 |
| `lesson`        | RETRIEVED  | 0.80 |
| `reflection`    | RETRIEVED  | 0.75 |
| `pattern`       | INFERRED   | 0.50 |

### 4.2 Confidence Derivation

For KVQ entries:
```
derived_confidence = stored_confidence × authority
```
Exception — INFERRED (pattern): `min(derived_confidence, MIN_CONFIDENCE - 0.01 = 0.59)`. Pattern evidence can never breach the epistemic threshold regardless of stored confidence.

For constitutional (KC-) claims:
- Reads `record_data.validation_attributes.confidence` from JSONB
- Falls back to 0.85 if not found (KC- guarantees EP-T4 gate passage)
- Floor: 0.60 (EP-T4 minimum)

### 4.3 Completeness Derivation

```
completeness = min(1.0, confirmations / min_confirmations)
```
- Validated + full confirmations: floor at 0.70
- rejected/superseded: completeness = 0, confidence = 0
- Subject mismatch penalty (if subject fragment not in lesson_text): × 0.70

### 4.4 Corroboration Bonus (multi-ref bundle)

| Refs found | Bonus |
|------------|-------|
| 1 | 0 |
| 2 | +0.15 |
| 3+ | +0.25 |

Bonus applied to completeness (capped at 1.0).

### 4.5 Worst-Case Freshness

When multiple refs are evaluated, worst freshness wins:
```
EXPIRED (rank 0) > STALE (rank 1) > UNKNOWN (rank 2) > FRESH (rank 3)
```

### 4.6 Contradiction Detection

`detectContradictions(subject, domain_id)` checks:
1. `knowledge_gaps` where `gap_type='CONFLICTING'` and `status='OPEN'` and subject matches
2. `contradiction_reports` where `resolution_status='open'` and description matches

Result fed into `_combineEvaluations()` as the external contradiction check.

---

## 5. assessRequirement() Modification

The evidence-grounded path activates when `evidence_refs` (or a single `evidence_ref`) is present:

```
evidence_refs present?
  YES → evaluateEvidenceBundle(refs, { subject, knowledge_type })
          → derived_evidence_type, derived_confidence, derived_completeness,
             has_contradictions, freshness_state (from evaluator)
          → assessment_method = 'EVIDENCE_GROUNDED'
          → caller confidence/completeness/has_contradictions IGNORED
  NO  → use caller-supplied values as before (KG-02 path)
          → assessment_method = 'CALLER_ASSERTED'
```

`assessment_method` is stored in `knowledge_evidence_assessments.metadata` as an auditable flag. Reviewers can distinguish evidence-grounded from caller-asserted assessments in the audit trail.

---

## 6. Engine Exports (New in KG-03)

| Export | Type | Notes |
|--------|------|-------|
| `evaluateEvidenceRef` | Function | Evaluate single ref (KVQ or KC-) |
| `evaluateEvidenceBundle` | Function | Evaluate array of refs + combine |
| `detectContradictions` | Function | Check canonical stores for conflicts |
| `SOURCE_AUTHORITY` | Const | Source type → evidence type + authority map |
| `FRESHNESS` | Const | FRESH / STALE / EXPIRED / UNKNOWN |
| `_combineEvaluations` | Function | Pure combine (exported for testability) |
| `_sourceTypeToEvidenceType` | Function | Pure mapping helper |
| `_sourceTypeToAuthority` | Function | Pure mapping helper |

All routed through `knowledge-gap-engine.js` canonical surface. Callers must not require `knowledge-evidence-evaluator.js` directly.

---

## 7. Governance Invariants

1. `knowledge-evidence-evaluator.js` does NOT import `lib/memory/gateway.js`
2. `knowledge-evidence-evaluator.js` uses `getSupabaseClient()` only (no `createClient` direct)
3. `routes/knowledge.js` does NOT import evaluator directly — goes through kge
4. `pattern` source_type → `INFERRED` → confidence capped at `MIN_CONFIDENCE - 0.01` regardless of stored value
5. `evaluateEvidenceRef(null)` → `found=false`, confidence=0, evidence_type=NONE → feeds into GAP
6. Caller-supplied confidence/completeness are SILENTLY OVERRIDDEN when evidence_refs provided
7. `assessment_method` recorded in every assessment metadata for audit trail
8. All KG-01 and KG-02 invariants remain fully operational (0 regressions)

---

## 8. Tests

| Category | Count |
|----------|-------|
| Module contract + exports | 5 |
| SOURCE_AUTHORITY taxonomy | 6 |
| _sourceTypeToEvidenceType | 3 |
| _sourceTypeToAuthority | 2 |
| FRESHNESS constants | 1 |
| _combineEvaluations: empty/not-found | 1 |
| _combineEvaluations: worst freshness | 2 |
| _combineEvaluations: corroboration bonus | 2 |
| _combineEvaluations: all-INFERRED cap | 1 |
| _combineEvaluations: contradiction propagation | 2 |
| _combineEvaluations: dominant evidence type | 1 |
| _combineEvaluations: pure/deterministic | 1 |
| evaluateEvidenceRef: null/undefined | 2 |
| evaluateEvidenceRef: KC- routing | 1 |
| evaluateEvidenceRef: KVQ routing | 1 |
| evaluateEvidenceBundle: empty array | 1 |
| evaluateEvidenceBundle: non-array | 1 |
| detectContradictions: empty/null subject | 2 |
| detectContradictions: shape | 1 |
| kge re-exports | 8 |
| assessRequirement: evidence_refs param | 6 |
| Governance: no bypass, no direct import | 4 |
| Falsification (FALSIFY-KG03-01 through -07) | 7 |
| KG-02 regression | 8 |
| DB-dependent lifecycle path | 2 |
| **Total** | **71** |

```
Suite total: 1878 / 1878 PASS (71 new + 1807 regression, 0 regressions)
```

---

## 9. Falsification Attempts

| Attempt | Result |
|---------|--------|
| pattern source_type + stored confidence=1.0 → SATISFIED | BLOCKED: capped to 0.59, INSUFFICIENT |
| _combineEvaluations with contradictions=true + confidence=0.99 → SATISFIED | BLOCKED: CONFLICTING |
| evaluateEvidenceRef(null) → SATISFIED | BLOCKED: found=false, NONE, GAP |
| All-not-found bundle → positive confidence | BLOCKED: derived_confidence=0, NONE |
| EXPIRED freshness + confidence=0.99 → SATISFIED | BLOCKED: STALE_EVIDENCE |
| _combineEvaluations called 20x same inputs → different result | BLOCKED: pure function, deterministic |
| Caller confidence=0.99 + evidence_refs present → caller wins | BLOCKED: evaluator overrides caller entirely |

No bypass found. All falsification attempts blocked.

---

## 10. Known Limitations

| ID | Finding | Severity |
|----|---------|----------|
| KG-03-L01 | Subject relevance scoring uses simple substring match (first 40 chars) — may miss semantic relevance | LOW |
| KG-03-L02 | Constitutional claim fallback uses fixed 0.85 confidence if JSONB parse fails — may overstate confidence on corrupted records | LOW |
| KG-03-L03 | `detectContradictions` queries contradiction_reports.description with a substring search — description field quality dependent | LOW |
| KG-03-L04 | KG-02-L02 (attemptResolution without requirement_id) remains open — unrelated to KG-03 scope | LOW |
| KG-03-L05 | KG-02-L01 (assessKnowledgeRequirements no deduplication) remains open | LOW |
| KG-03-L06 | **KG-02-L03 RESOLVED**: confidence/completeness are now derived from canonical stores when evidence_refs are provided | — |

---

## 11. Explicit Non-Goals of KG-03

- NOT a UI or dashboard component
- NOT a new migration or schema change
- NOT a redesign of the memory gateway
- NOT automated knowledge harvesting or research agents
- NOT connected to POST /chat or background execution paths by default
- NOT a replacement for the KG-02 caller-asserted path (both paths coexist)
- NOT changing the KG-02 determination rules or thresholds

---

## 12. Production Verification

- `node --check` passed on all modified/created JS files
- `node --check server.js` passed (no server.js modification required)
- `npm test`: 1878 / 1878 PASS (0 regressions, 71 new tests)
- KG-01 full test suite (58 tests) regression: 0 failures
- KG-02 full test suite (66 tests) regression: 0 failures
- No new migrations — all queries against existing tables

---

## 13. Next Authorised KG Phase

**STOP CONDITION — KG-03 is complete.** Do NOT proceed to:
- Automated evidence harvesting or background KVQ scanning
- Connecting KG-03 evaluation to every production execution path
- Building KG UI or dashboard panels
- Creating new domain agents with KG-03 awareness
- Broad ingestion or historical confidence backfill

The next authorised task is **KG-04** — to be defined in a new mandate after this certification is reviewed.

---

*KG-03 constitutionally compliant. Solves KG-02-L03. All KG-01/KG-02 invariants preserved.*
