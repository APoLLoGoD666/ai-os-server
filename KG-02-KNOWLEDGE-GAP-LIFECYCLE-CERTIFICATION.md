# KG-02 — Knowledge-Gap Lifecycle Certification

**Status:** CERTIFIED  
**Date:** 2026-08-26  
**Baseline commit:** d8bc683 (KG-01, 2026-08-26)  
**Tests:** 1807 / 1807 PASS (66 new + 1741 regression)  

---

## 1. Authority

- KG-01-KNOWLEDGE-GAP-FOUNDATION-CERTIFICATION.md
- APEX-CANONICAL-SYSTEM.md
- APEX-CERTIFICATION-INDEX.md
- APEX-CONSTITUTION-v1.0
- KG-01 commit d8bc683

---

## 2. Mandate

Implement the first operational knowledge-gap lifecycle:

```
REQUIRE → ASSESS → DETECT GAP → CLASSIFY → RESOLVE → REASSESS → CERTIFY SUFFICIENCY
```

---

## 3. Files Changed / Created

| File | Type | Description |
|------|------|-------------|
| `migrations/086_knowledge_evidence_assessments.sql` | New | Evidence assessment records per requirement/phase |
| `migrations/087_gap_resolution_attempts.sql` | New | Resolution attempt records with PENDING→outcome lifecycle |
| `lib/knowledge/knowledge-lifecycle.js` | New | Canonical lifecycle implementation, owned by KG engine |
| `routes/knowledge.js` | New | HTTP integration boundary `/api/knowledge/*` |
| `tests/knowledge-lifecycle.test.js` | New | 66 tests: A–W mandate + falsification |
| `lib/knowledge/knowledge-gap-engine.js` | Modified | Re-exports KG-02 lifecycle through canonical surface |

---

## 4. Schema Changes

### `knowledge_evidence_assessments` (migration 086)

Canonical record of every evidence assessment against a knowledge requirement.

| Column | Type | Notes |
|--------|------|-------|
| assessment_id | text PK | `KEA-{12 hex}` |
| requirement_id | text FK | ON DELETE CASCADE |
| gap_id | text FK | ON DELETE SET NULL |
| phase | text | INITIAL \| RESOLUTION \| REASSESSMENT |
| evidence_type | text | OBSERVED \| RETRIEVED \| USER_PROVIDED \| INFERRED \| NONE |
| evidence_source | text | Where evidence came from |
| evidence_ref | text | knowledge_id, validation_id, etc. |
| evidence_content | text | Summary |
| knowledge_type | text FK→TVW | For temporal validity check |
| formed_at | timestamptz | When evidence was formed |
| freshness_state | text | FRESH \| STALE \| EXPIRED \| UNKNOWN |
| confidence | numeric(4,3) | 0.000 – 1.000 |
| completeness | numeric(4,3) | 0.000 – 1.000 |
| has_contradictions | boolean | Triggers CONFLICTING determination |
| determination | text | SATISFIED \| GAP \| UNCERTAIN \| INSUFFICIENT \| CONFLICTING \| STALE_EVIDENCE |
| determination_reason | text NOT NULL | Auditable reason |
| assessed_at | timestamptz | DEFAULT now() |
| assessed_by | text | DEFAULT 'system' |
| metadata | jsonb | DEFAULT '{}' |

4 indexes: requirement+date, gap+phase, determination+date, phase+date.

### `gap_resolution_attempts` (migration 087)

Tracks each attempt to supply evidence to resolve a gap. PENDING until reassessment runs.

| Column | Type | Notes |
|--------|------|-------|
| attempt_id | text PK | `GRA-{12 hex}` |
| gap_id | text FK | ON DELETE CASCADE |
| requirement_id | text FK | ON DELETE SET NULL |
| strategy | text | Resolution strategy class |
| evidence_type | text | As above |
| evidence_source | text | |
| evidence_ref | text | |
| evidence_summary | text | |
| outcome | text | PENDING → SUCCESS \| INSUFFICIENT \| CONFLICTING \| STALE \| FAILED |
| outcome_reason | text | Set after reassessment |
| assessment_ref | text FK | Linked reassessment record |
| attempted_at | timestamptz | |
| attempted_by | text | |
| metadata | jsonb | |

3 indexes: gap+date, requirement+date, outcome+date.

---

## 5. Lifecycle Model

```
REQUIRE
  → declareRequirement() [KG-01]
  → if existing validated knowledge: status=SATISFIED (done)
  → else: status=GAP_CREATED, gap created

ASSESS (INITIAL)
  → assessRequirement(requirement_id, evidence) [KG-02]
  → evidence characterised: type, source, ref, content
  → temporal validity checked via TVW (if knowledge_type + formed_at provided)
  → determination computed via _determineFromEvidence()
  → written to knowledge_evidence_assessments (phase=INITIAL)

GAP DETECTED
  → determination=GAP: no evidence available
  → determination=INSUFFICIENT: partial/low-confidence evidence
  → determination=CONFLICTING: contradicting evidence
  → determination=STALE_EVIDENCE: expired temporal evidence
  → determination=UNCERTAIN: INFERRED-only evidence

RESOLVE
  → attemptResolution(gap_id, evidence_params) [KG-02]
  → gap status → IN_RESOLUTION
  → gap_resolution_attempts record created (outcome=PENDING)
  → INDEPENDENT REASSESSMENT runs (phase=REASSESSMENT)
  → outcome mapped from reassessment determination
  → if SATISFIED: gap status → RESOLVED, requirement → SATISFIED
  → if not: gap status → OPEN (reverted), failure recorded

REASSESS (inside attemptResolution)
  → assessRequirement(requirement_id, evidence, {phase: REASSESSMENT})
  → independent evidence assessment
  → outcome_reason written to resolution attempt

CERTIFY SUFFICIENCY
  → getLifecycleAuditTrail(requirement_id) [KG-02]
  → full reconstruction: requirement + assessments + resolution_attempts + current_state
  → auditor can determine: what was required, what evidence existed, why gaps/satisfaction
```

---

## 6. Evidence Model

| Type | Description | Max Determination |
|------|-------------|------------------|
| `OBSERVED` | Directly observed by APEX system | SATISFIED |
| `RETRIEVED` | Retrieved from existing knowledge store | SATISFIED |
| `USER_PROVIDED` | Supplied by a human user | SATISFIED |
| `INFERRED` | LLM-generated output | UNCERTAIN (never SATISFIED) |
| `NONE` | No evidence available | GAP |

**Critical rule**: `INFERRED` evidence alone can NEVER produce `SATISFIED`. LLM output is not automatically knowledge. This enforces the "no fabricated knowledge" invariant.

---

## 7. Temporal Validity Model

KG-02 extends KG-01's TVW model into the assessment layer:

```
assessRequirement(requirement_id, {knowledge_type, formed_at, ...})
  → TVW lookup via temporal_validity_windows.knowledge_type
  → age_seconds = now() - formed_at
  → is_expired  = validity_seconds != null AND age >= validity_seconds  → EXPIRED
  → stale_threshold = validity_seconds - staleness_seconds              → STALE
  → freshness_state: FRESH | STALE | EXPIRED | UNKNOWN (no TVW type)
  → EXPIRED → STALE_EVIDENCE determination (cannot satisfy)
  → STALE   → SATISFIED with staleness warning in reason
```

Precedence (highest to lowest):
1. `NONE` evidence → `GAP`
2. `has_contradictions=true` → `CONFLICTING`
3. `freshness_state=EXPIRED` → `STALE_EVIDENCE`
4. `evidence_type=INFERRED` → `UNCERTAIN` (high conf) or `INSUFFICIENT` (low conf)
5. `completeness < 0.50` → `INSUFFICIENT`
6. `confidence < 0.60` → `INSUFFICIENT`
7. `freshness_state=STALE` → `SATISFIED` (with warning)
8. Else → `SATISFIED`

---

## 8. Resolution Semantics

**Invariant: RESOLUTION ATTEMPT ≠ KNOWLEDGE SATISFIED**

`attemptResolution()` does NOT close a gap by accepting evidence. It:
1. Creates a `gap_resolution_attempts` record (outcome=PENDING)
2. Sets gap to IN_RESOLUTION
3. Runs an independent REASSESSMENT assessment
4. Maps determination to outcome
5. If SATISFIED: resolves gap + updates requirement
6. If not: reverts gap to OPEN + records insufficient evidence

This ensures every resolution is independently assessed and auditable. A gap cannot be closed by supplying evidence without assessment.

---

## 9. Reassessment Semantics

Every `attemptResolution()` call internally runs `assessRequirement()` with `phase=REASSESSMENT`. The assessment record is linked to the resolution attempt via `assessment_ref`.

This means:
- Every gap closure has a linked assessment explaining why it was satisfied
- Every failed resolution has a linked assessment explaining why it failed
- Audit trail shows full chain: resolution attempt → assessment → determination

---

## 10. Auditability

`getLifecycleAuditTrail(requirement_id)` returns:

```json
{
  "requirement":  { ...full requirement row... },
  "assessments":  [ ...all assessments in chronological order... ],
  "resolution_attempts": [ ...all attempts in chronological order... ],
  "current_state": {
    "requirement_status":   "GAP_CREATED | SATISFIED | ...",
    "latest_determination": "SATISFIED | GAP | ...",
    "latest_assessed_at":   "2026-08-26T...",
    "total_assessments":    2,
    "total_attempts":       1,
    "successful_attempts":  1,
    "failed_attempts":      0
  }
}
```

A reviewer can reconstruct:
- What was required and why (decision_context, required_subject)
- What evidence was available at each phase
- What determination was made and the reason
- What resolution was attempted and what evidence it supplied
- Why reassessment passed or failed
- When each transition occurred and who triggered it

---

## 11. Integration Boundary

`POST /api/knowledge/assess` — the canonical future integration point.

Future execution phases call:
```javascript
kge.assessKnowledgeRequirements(requirements, context)
→ { requirements_assessed, has_blocking_gaps, overall_sufficient, determinations }
```

Each determination contains: `{ requirement_id, status, determination, gap_id, assessment_id }`.

Other routes:
- `POST /api/knowledge/requirements` — declare a requirement
- `POST /api/knowledge/requirements/:id/assess` — assess evidence for a requirement
- `GET /api/knowledge/requirements/:id/lifecycle` — full audit trail
- `POST /api/knowledge/gaps/:id/resolve` — attempt resolution with evidence
- `GET /api/knowledge/gaps` — query open gaps
- `GET /api/knowledge/stats` — aggregate statistics

Routes are auto-loaded by `_loadAgentRoutes()` — no server.js change required.

---

## 12. Tests

| Category | Count |
|----------|-------|
| Module contract + exports | 5 |
| Evidence types taxonomy | 4 |
| Thresholds (MIN_CONFIDENCE, MIN_COMPLETENESS) | 2 |
| ID format + uniqueness | 3 |
| No-evidence → GAP (C) | 2 |
| Valid satisfaction (D) | 3 |
| Stale evidence (E) | 1 |
| Expired evidence (F) | 2 |
| Unknown freshness (G) | 1 |
| Conflicting evidence (H) | 2 |
| Partial evidence (I) | 2 |
| Low-confidence inference (J) | 3 |
| Confidence threshold edge | 1 |
| Precedence rules | 4 |
| assessRequirement validation (A) | 2 |
| attemptResolution validation (K) | 3 |
| getLifecycleAuditTrail validation (O) | 1 |
| assessKnowledgeRequirements validation (B) | 2 |
| Falsification (FALSIFY-01 through -07) | 7 |
| Governance: Knowledge≠Memory (T) | 1 |
| Canonical client (U) | 1 |
| No second KG authority (V) | 3 |
| KG-01 regression (W) | 4 |
| Route structure | 2 |
| Stability / idempotency (R, S) | 2 |
| DB-dependent lifecycle (L, M, N, O) | 4 |
| **Total** | **66** |

```
Suite total: 1807 / 1807 PASS (66 new + 1741 regression, 0 regressions)
```

---

## 13. Falsification Attempts

The following were actively attempted to find bypasses:

| Attempt | Result |
|---------|--------|
| INFERRED at confidence=1.0 → SATISFIED | BLOCKED: determination=UNCERTAIN |
| EXPIRED at confidence=1.0 → SATISFIED | BLOCKED: determination=STALE_EVIDENCE |
| EXPIRED for OBSERVED, RETRIEVED, USER_PROVIDED | BLOCKED: all produce STALE_EVIDENCE |
| confidence=0.59 OBSERVED FRESH → SATISFIED | BLOCKED: determination=INSUFFICIENT |
| NONE with contradictions=true, high confidence → GAP? or CONFLICTING? | NONE wins → GAP |
| Contradictions with EXPIRED → CONFLICTING wins over EXPIRED | CONFIRMED (contradictions higher priority) |
| EXPIRED with INFERRED → STALE_EVIDENCE wins over INFERRED type check | CONFIRMED |
| attemptResolution with NONE evidence → SUCCESS | BLOCKED: outcome=INSUFFICIENT |
| assessRequirement with invalid phase | BLOCKED: throws before DB |
| assessKnowledgeRequirements with non-array | BLOCKED: throws before DB |
| _determineFromEvidence called 20× same input produces different result | BLOCKED: pure function, deterministic |

No bypass was found. All falsification attempts were blocked.

---

## 14. Invariants (Post-KG-02)

1. `INFERRED` evidence alone → `UNCERTAIN` or `INSUFFICIENT` (never `SATISFIED`)
2. `EXPIRED` freshness_state → `STALE_EVIDENCE` (cannot satisfy)
3. `has_contradictions=true` → `CONFLICTING` (takes precedence over all except NONE)
4. `evidence_type=NONE` → `GAP` (highest priority, always)
5. `confidence < 0.60` → `INSUFFICIENT`
6. `completeness < 0.50` → `INSUFFICIENT`
7. `attemptResolution` always creates independent REASSESSMENT assessment; gap is not auto-closed
8. Every `resolveGap` via `attemptResolution` has a linked `assessment_ref` in the attempt record
9. `routes/knowledge.js` imports through `knowledge-gap-engine` (canonical surface only)
10. `knowledge-lifecycle.js` does NOT import `lib/memory/gateway.js`
11. `knowledge-lifecycle.js` uses `getSupabaseClient()` only (no direct `createClient`)
12. `knowledge-gap-engine.js` is the SINGLE canonical surface; lifecycle not directly callable
13. `assessment_id` format: `KEA-{12 uppercase hex}`
14. `attempt_id` format: `GRA-{12 uppercase hex}`
15. All KG-01 functions, constants, and helpers remain fully operational (0 regressions)

---

## 15. Known Limitations

| ID | Finding | Severity |
|----|---------|----------|
| KG-02-L01 | `assessKnowledgeRequirements` creates requirements inline; no deduplication across calls with same subject | LOW |
| KG-02-L02 | `attemptResolution` with no `requirement_id` runs determination internally but cannot write assessment to DB (assessment_id=null in result) | LOW |
| KG-02-L03 | Evidence `confidence` and `completeness` are caller-supplied — system does not independently verify these values | MEDIUM |
| KG-02-L04 | `knowledge_evidence_assessments.evidence_content` is free-text summary — not validated against a schema | LOW |

---

## 16. Deferred Findings

No new unrelated architectural discoveries were made during KG-02 implementation. All prior deferred findings (from APEX-CERTIFICATION-INDEX.md) remain unchanged.

---

## 17. Explicit Non-Goals of KG-02

- NOT broad API ingestion or historical knowledge backfill
- NOT automated knowledge harvesting (no research agents created)
- NOT connected to POST /chat, /api/tasks/run, or background execution paths
- NOT a UI or dashboard component
- NOT a redesign of memory gateway
- NOT a redesign of canonical AI runtime
- NOT a new governance writer
- NOT a second knowledge system

---

## 18. Production Verification

- `node --check` passed on all modified JS files
- `npm test`: 1807 / 1807 PASS (0 regressions)
- Migration 086: 5 statements OK, 0 errors
- Migration 087: 4 statements OK, 0 errors
- `routes/knowledge.js` auto-loaded by `_loadAgentRoutes()` — no server.js modification required
- KG-01 full test suite (58 tests) regression: 0 failures

---

## 19. Next Authorised KG Phase

**STOP CONDITION — KG-02 is complete.** Do NOT proceed to:
- Broad ingestion or historical backfill
- Automated gap resolution pipeline
- Connecting KG evaluation to every production execution path
- Building KG UI/dashboard panels
- Creating new domain agents with KG awareness

The next authorised task is **KG-03** — to be defined in a new mandate after this certification is reviewed.

---

*KG-02 constitutionally compliant. R-series chain: d087c19 → ... → e000386 → d8bc683 → KG-02 commits.*
