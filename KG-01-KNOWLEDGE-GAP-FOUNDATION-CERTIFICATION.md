# KG-01 — Knowledge-Gap Foundation Certification

**Status:** CERTIFIED  
**Date:** 2026-08-26  
**Baseline commit:** e000386 (FDR, 2026-08-26)  
**Production HEAD after KG-01:** (pending commit)  
**Tests:** 1741 / 1741 PASS  

---

## 1. Mandate

Establish the canonical foundation for APEX's ability to know: what it knows, what it doesn't know, what is uncertain/stale/conflicting/incomplete, and what information is required for decisions.

**Authorised by:** FDR certification — "KNOWLEDGE-GAP SYSTEM: AUTHORISED TO BEGIN"  
**Critical constraints honoured:**
- NO broad historical data ingestion
- NO parallel knowledge system
- NO bypass of canonical memory gateway or governance authority
- First Principle enforced: **Knowledge ≠ Memory**

---

## 2. Repository Investigation Findings

A comprehensive investigation of the existing codebase was performed before any implementation. Key findings:

### A. Existing Epistemic Architecture (must not be duplicated)

APEX already has a rich epistemic architecture spanning the T3 chain:

| Layer | File | Type |
|-------|------|------|
| Observation | `lib/reality/fabric.js` | ObservationRecord |
| Evidence | `lib/knowledge/evidence-object-registry.js` | EvidenceObject |
| Interpretation | `lib/knowledge/interpretation-record-registry.js` | InterpretationRecord |
| Belief | `lib/knowledge/belief-object-registry.js` | BeliefObject |
| Knowledge Claim | `lib/knowledge/knowledge-claim-registry.js` | KnowledgeClaim |

Constitutional types are defined in `lib/constitutional-types/knowledge-record.js` and immutably written to `constitutional_records` via `lib/runtime/constitutional-store.js`.

### B. What Did Not Exist (the gaps KG-01 fills)

| Missing Component | Status Before KG-01 | Status After |
|---|---|---|
| `knowledge_gaps` table | No table | Migration 083 — APPLIED |
| `knowledge_requirements` table | No table | Migration 084 — APPLIED |
| `temporal_validity_windows` table (RT09-PROC-06) | Stub (L-02 limitation) | Migration 085 — APPLIED |
| `lib/knowledge/knowledge-gap-engine.js` | No canonical gap authority | Created — 464 LOC |

### C. Existing Contradiction System

`lib/knowledge/contradiction-engine.js` exists and handles DKS-3 CONTESTED state. KG-01 does not duplicate this — `getKnowledgeState()` reads `knowledge_gaps` for CONFLICTING gap types and maps to the `CONFLICTING` state.

### D. Existing Decay System

`lib/knowledge/knowledge-decay-assessments.js` and associated tables exist. KG-01 does not duplicate decay scoring — the `temporal_validity_windows` table is the freshness model, and `assessStaleness()` is the lookup function.

### E. Validation Pipeline

`knowledge_validation_queue` (existing) is the operational store for lesson→knowledge validation. `declareRequirement()` searches this table to determine if a requirement is already satisfied.

---

## 3. Canonical Knowledge Model

```
ObservationRecord (T3-07)
  → EvidenceObject (T3-09)
    → InterpretationRecord (T3-10B)
      → BeliefObject (T3-10C)
        → KnowledgeClaim (T3-10D, EP-T4 gate: conf≥0.60, conf_count≥2, contradictions=0)
          → constitutional_records (immutable, permanent audit trail)
          → knowledge_validation_queue (operational state: pending/validated)

PARALLEL OPERATIONAL LAYER (KG-01 additions):
  knowledge_gaps          (queryable, mutable, lifecycle-tracked gap state)
  knowledge_requirements  (decision-declared information needs, FK to gaps)
  temporal_validity_windows (freshness model: 13 knowledge types)

READS (canonical, no bypass):
  lib/knowledge/knowledge-gap-engine.js reads from:
    - knowledge_validation_queue (validated claims)
    - knowledge_gaps (open gaps)
    - temporal_validity_windows (freshness windows)
  It does NOT read directly from constitutional_records or write to the T3 chain.
```

**Distinction from RealityGapEntry (constitutional type):**
- `RealityGapEntry` → immutable, permanent, written to `constitutional_records`. 3 triggering conditions: OBSERVATION_ABSENCE, KNOWLEDGE_CONFLICT, OBSERVATION_CONTRADICTS_KNOWLEDGE.
- `knowledge_gaps` → queryable, mutable, lifecycle-tracked. 10 gap types. Can be RESOLVED, ACCEPTED_UNKNOWN, SUPERSEDED. These are COMPLEMENTARY, not competing.

---

## 4. Gap Taxonomy (10 Canonical Types)

| Type | Severity Default | Blocks | Description |
|------|-----------------|--------|-------------|
| UNKNOWN | MEDIUM | No | No information about subject exists |
| MISSING | HIGH | No | Should be known but absent from store |
| INCOMPLETE | MEDIUM | No | Partial knowledge; key attributes missing |
| STALE | MEDIUM | No | Knowledge past freshness window |
| CONFLICTING | HIGH | **Yes** | Contradictory knowledge; truth indeterminate |
| LOW_CONFIDENCE | LOW | No | Confidence below useful threshold |
| UNVERIFIED | LOW | No | Present but not passed validation pipeline |
| CONTEXT_MISSING | MEDIUM | No | Knowledge exists but context to apply it absent |
| DECISION_BLOCKING | HIGH | **Yes** | Decision requires knowledge that doesn't exist |
| SOURCE_UNAVAILABLE | MEDIUM | No | Authoritative source unreachable |

---

## 5. Knowledge States (6 Canonical States)

| State | Trigger |
|-------|---------|
| `KNOWN` | Validated claims present, no STALE/INCOMPLETE/CONFLICTING open gaps |
| `KNOWN_LOW_CONFIDENCE` | Claims present but confidence < 0.60, OR in validation pipeline |
| `STALE` | Validated claims present but STALE gap open |
| `CONFLICTING` | CONFLICTING gap open (DKS-3 CONTESTED) |
| `PARTIALLY_KNOWN` | Claims present but INCOMPLETE gap open |
| `UNKNOWN` | No validated or pending claims; UNKNOWN/MISSING gap or nothing |

---

## 6. Confidence Model

Gap urgency is quantified via `gap_score` (0–100):

```
base = SEVERITY_BASE[severity]  // CRITICAL=80, HIGH=60, MEDIUM=40, LOW=20
gap_score = clamp(base + (blocks_decision ? 20 : 0) + (auto_resolvable ? -10 : 0), 0, 100)
```

Key scores:
- CRITICAL + blocking = 100
- HIGH + blocking = 80 (same as CRITICAL non-blocking — treated equally)
- MEDIUM + blocking = 60
- LOW + blocking = 40
- MEDIUM auto-resolvable = 30

Gaps are ordered by `gap_score DESC` in `queryGaps()`.

---

## 7. Freshness Model (RT09-PROC-06)

`temporal_validity_windows` implements RT09-PROC-06, resolving the L-02 limitation documented in T3-10, T3-10B, T3-10C, T3-10D chain files.

**Staleness computation (pure, testable):**
```
stale_threshold = validity_seconds - staleness_seconds       (if validity_seconds != null)
stale_threshold = staleness_seconds                           (if validity_seconds is null)
stale_threshold = Infinity                                    (if both null → permanent)

is_expired = validity_seconds != null AND age >= validity_seconds
is_stale   = is_expired OR age >= stale_threshold
```

**13 seed knowledge types applied:**

| Type | Validity | Stale At | Decay/day |
|------|----------|----------|-----------|
| CALENDAR_EVENT | 1 day | 1h before | 0.050 |
| FINANCIAL_BALANCE | 1h | 30m | 0.200 |
| FINANCIAL_RATE | 24h | 6h | 0.050 |
| CONTACT_DETAIL | 90d | 30d | 0.001 |
| PERSON_FACT | permanent | permanent | 0.001 |
| UNIVERSITY_SCHEDULE | 7d | 1d | 0.010 |
| UNIVERSITY_DEADLINE | 1d | 2h | 0.100 |
| DOCUMENT | 30d | 7d | 0.003 |
| PREFERENCE | permanent | 30d | 0.001 |
| CONVERSATION | 2h | 1h | 0.010 |
| TASK_STATUS | 1h | 30m | 0.050 |
| NEWS_SIGNAL | 24h | 4h | 0.100 |
| GENERAL_FACT | 30d | 7d | 0.003 |

---

## 8. Provenance Model

Gap and requirement IDs are generated from 6 random bytes encoded as uppercase hex:
- `KG-{12-char hex}` — gap_id
- `KR-{12-char hex}` — requirement_id

Verified collision-free in tests: 1000 gap IDs, 500 requirement IDs — 0 collisions.

Cross-references maintained:
- `knowledge_gaps.knowledge_ref` → KnowledgeClaim.knowledge_id (from T3 chain)
- `knowledge_gaps.reality_gap_ref` → RealityGapEntry.gap_id (from constitutional_records)
- `knowledge_gaps.requirement_ref` → knowledge_requirements.requirement_id
- `knowledge_requirements.gap_ref` → knowledge_gaps.gap_id (FK, ON DELETE SET NULL)
- `knowledge_requirements.satisfying_knowledge_ref` → knowledge_validation_queue.validation_id

---

## 9. Resolution Strategies (9 Canonical Classes)

| Strategy | When Used |
|----------|-----------|
| RETRIEVE_AUTO | Retrieve from existing memory/cache |
| QUERY_API | Query connected external API |
| SEARCH_MEMORY | Search canonical memory gateway |
| SEARCH_DOCS | Search documents/RAG |
| ASK_AGENT | Delegate to authorised agent |
| ASK_USER | Require user input |
| REQUEST_APPROVAL | Require governance approval |
| DEFER | Defer resolution |
| UNRESOLVABLE | Cannot be resolved with current resources |

---

## 10. Knowledge Requirements Lifecycle

```
declareRequirement(decision_context, required_subject, ...)
  → checks knowledge_validation_queue for matching validated knowledge
  → if found: status = SATISFIED, satisfying_knowledge_ref = validation_id
  → if not found:
    → creates gap (DECISION_BLOCKING if blocks_decision, else MISSING)
    → links gap_ref back to requirement
    → status = GAP_CREATED
    → returns { requirement_id, status: 'GAP_CREATED', gap_id }
```

Gap lifecycle:
```
OPEN → IN_RESOLUTION → RESOLVED (gap filled)
OPEN → ACCEPTED_UNKNOWN (permanently unknowable, formally accepted)
OPEN → SUPERSEDED (more specific gap created)
```

---

## 11. Integration Boundaries

**Knowledge-gap-engine READS FROM:**
- `knowledge_validation_queue` — to check for existing validated knowledge
- `knowledge_gaps` — to query open gaps
- `temporal_validity_windows` — for freshness window lookup

**Knowledge-gap-engine WRITES TO:**
- `knowledge_gaps` — detectGap, resolveGap, acceptGap
- `knowledge_requirements` — declareRequirement

**Knowledge-gap-engine does NOT:**
- Import or call `lib/memory/gateway.js` (Knowledge ≠ Memory invariant)
- Call `storeMemory()` or any memory write
- Write to `constitutional_records` (T3 chain is append-only from its own pipeline)
- Require `@supabase/supabase-js` directly (uses `lib/clients.js → getSupabaseClient()`)

---

## 12. Files Created / Modified

| File | Type | Description |
|------|------|-------------|
| `migrations/083_knowledge_gaps.sql` | New | Operational gap store, 10 types, 6 indexes |
| `migrations/084_knowledge_requirements.sql` | New | Decision-to-knowledge requirement declarations |
| `migrations/085_temporal_validity_windows.sql` | New | RT09-PROC-06 freshness model, 13 seed types |
| `lib/knowledge/knowledge-gap-engine.js` | New | Canonical gap authority, 464 LOC |
| `tests/knowledge-gap-engine.test.js` | New | 58 tests, all PASS |

---

## 13. Test Results

```
Tests:   58 new KG-01 tests
Suite:   1741 / 1741 total PASS (58 new + 1683 regression)
Regressions: 0
```

Test categories covered:
- Module contract (load, frozen, exports)
- GAP_TYPES taxonomy (all 10 types, structure, defaults)
- KNOWLEDGE_STATES (all 6 states)
- SEVERITY_BASE constants
- Gap score computation (all severity × blocking × auto combinations, clamping)
- ID format / provenance (_gapId, _requirementId: prefix, length, hex, uniqueness)
- Freshness / _computeStaleness (null window, expired, stale-not-expired, fresh, null validity)
- detectGap input validation (sync throws before DB)
- Gap defaults from GAP_TYPES
- Gap prioritisation (score ordering, blocking bonus)
- Resolution lifecycle validation (resolveGap, acceptGap — sync throws)
- Knowledge requirement validation (declareRequirement — sync throws)
- Governance boundary (canonical client, write-only to allowed tables)
- Memory gateway boundary (no require(), no storeMemory)
- getKnowledgeState interface (state field, open_gaps, blocks_decision)
- getGapStats aggregate shape
- Duplicate prevention (ID uniqueness)

---

## 14. Falsification Attempts

The following were checked and did NOT invalidate the design:

1. **"Does this duplicate the existing DKS system?"** — No. DKS levels (DKS-1 through DKS-4) are domain-level state defined in constitutional types. `knowledge_gaps` is the operational gap record store. They complement each other.

2. **"Does this bypass the memory gateway?"** — No. The engine reads `knowledge_validation_queue` directly (not memory gateway) because it needs operational claim state, not conversational context retrieval. Confirmed by source inspection.

3. **"Does this create a second memory system?"** — No. `knowledge_gaps` stores **absence records** (what APEX doesn't know), not knowledge content. The memory gateway stores knowledge content.

4. **"Could `declareRequirement` produce infinite loops?"** — No. It creates at most one gap per requirement. The gap is linked back to the requirement but the requirement is not re-checked.

5. **"Is `createClient` used anywhere in the engine?"** — No. Verified by grep and governance boundary test.

---

## 15. Known Limitations / Unresolved Findings

| ID | Finding | Severity | Resolution |
|----|---------|----------|------------|
| KG-01-L01 | `getKnowledgeState` searches `knowledge_validation_queue.lesson_text` with ILIKE — may miss exact subject matches if lesson_text doesn't contain the subject verbatim | LOW | Acceptable for KG-01 phase. Future: dedicated subject index |
| KG-01-L02 | `declareRequirement` searches up to 80 chars of required_subject — very long subjects may not match | LOW | Acceptable. Edge case in current usage patterns |
| KG-01-L03 | `getGapStats` reads up to 1000 rows — will undercount if more than 1000 gaps exist | LOW | Acceptable for current scale. Future: add COUNT query |
| KG-01-L04 | No deduplication check in `detectGap` — same subject could have multiple OPEN gaps | MEDIUM | By design — gaps track distinct detection events. Resolution deduplication is caller's responsibility |

---

## 16. Invariants (Post-KG-01)

1. `knowledge_gaps` and `knowledge_requirements` are the ONLY tables KG-01 engine writes to
2. KG-01 engine does NOT call `lib/memory/gateway.js`
3. KG-01 engine uses `getSupabaseClient()` — no direct `createClient()` calls
4. `gap_score` is always in range [0, 100]
5. `GAP_TYPES`, `KNOWLEDGE_STATES`, `SEVERITY_BASE` and `module.exports` are all frozen
6. `gap_id` format: `KG-{12 uppercase hex chars}`
7. `requirement_id` format: `KR-{12 uppercase hex chars}`
8. RT09-PROC-06 `_computeStaleness` is a pure function — no side effects
9. `knowledge_gaps.status` lifecycle: OPEN → {IN_RESOLUTION → RESOLVED | ACCEPTED_UNKNOWN | SUPERSEDED}
10. `knowledge_requirements.status` lifecycle: PENDING → {SATISFIED | GAP_CREATED | DEFERRED | CANCELLED}

---

## 17. Next Authorised Task

**STOP CONDITION — KG-01 is complete.** Do NOT proceed to:
- Broad API ingestion or historical knowledge backfill
- Automated knowledge-gap resolution pipeline
- Final KG UI / beta interface
- New domain agents

The next authorised knowledge-system task would be **KG-02** (to be defined in a new mandate after this certification is reviewed).

---

*KG-01 constitutionally compliant. R-series chain: d087c19 → 07cb811 → 66964ab → 284ae2c → e000386 → KG-01 commits.*
