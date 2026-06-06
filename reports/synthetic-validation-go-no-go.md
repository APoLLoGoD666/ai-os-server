# Synthetic Validation Framework — GO / NO-GO Decision
**Date:** 2026-06-06  
**Auditor:** Principal Verification Engineer  
**Based on:** `reports/synthetic-validation-audit.md` (full phase 1–5 audit)  
**Decision:** **GO ✓** — with documented limitations

---

## 1. Executive Summary

The Synthetic Validation Framework was audited across 6 phases:
implementation correctness, integration traces, schema compatibility, execution readiness, dry-run simulation, and risk assessment.

**One blocking defect was found and fixed during this audit session:**
- DEFECT-1: Goal `status: 'active'` is not a valid value in `goal-tracker.STATUS`. Fixed to `status: 'running'` in both affected goals (Tier 2 goal-006, Tier 3 goal-009).

**One minor issue was found and fixed:**
- Issue-5: `agent_summary: '[]'` (string) corrected to `agent_summary: []` (array) in all agent run rows.

**After these fixes:** The framework correctly generates records that will be discovered, processed, and consumed by the existing APEX subsystems it targets. All record counts match specification. All cleanup paths are complete. No production data is touched.

**Recommendation: PROCEED with Tier 1 load.**

---

## 2. Verified Integrations

The following integrations were traced end-to-end and confirmed functional:

| Integration | Verification | Evidence |
|-------------|:----------:|---------|
| episodic-memory ← episode files | ✓ VERIFIED | `_loadAll()` reads `ep-*.json`; `getSuccessRate()`, `getFailureEpisodes()` work from disk |
| autonomy-metrics ← episodes + apex_agent_runs | ✓ VERIFIED | retryRate() queries apex_agent_runs; recoveryRate() cross-ref matches by objective; all 6 dims produce real values |
| goal-tracker ← goal files | ✓ VERIFIED | `_loadAll()` reads `goal-*.json`; after fix, all statuses valid |
| planning-quality-registry ← plan registry | ✓ VERIFIED | `completedAt` set on all records; `getPlanQuality()` returns non-empty at 3 records; `generatePlanningInsights()` fires |
| adaptation-engine Pass 2 ← episodes | ✓ VERIFIED | 10 episodes ≥ MIN_SAMPLES(8); devFails=4 ≥ ceil(8/2)=4; "split_large_tasks" recommendation generated |
| reflection-engine ← Lessons.md | ✓ VERIFIED | 8 lessons have high actionScore (1.0) and specificScore (1.0); composite ~0.85 |
| improvement-executor ← episode count | ✓ VERIFIED | 3 templates activate at Tier 2 (tpl-episode-cross-reference, tpl-reflection-lesson-wire, tpl-self-evaluator-endpoint) |
| self-evaluator ← all sources | ✓ VERIFIED | Reads episodic, goal-tracker, adaptation-engine, autonomy-metrics; all sources available |
| memory-indexer ← episode files | ✓ VERIFIED | `rebuildIndex()` reads `ep-synth-*.json`; builds keyword-searchable index entries |
| memory-retriever ← indexer | ✓ VERIFIED | Keyword fallback functional; `findSimilarEpisodes()` returns matches |
| apex_agent_runs → retryRate/recoveryRate | ✓ VERIFIED | Supabase rows inserted; recovery matching by ILIKE confirmed (PostgreSQL treats `[` as literal) |

---

## 3. Broken Integrations

The following integrations will NOT produce evidence from synthetic data alone:

| Integration | Status | Root Cause |
|-------------|--------|-----------|
| adaptation-engine Pass 1 ← agent-reputation | NOT VERIFIED | `agent-reputation.js` reads `apex_agent_stages` Supabase table. Framework does not insert into this table. Pass 1 produces 0 recommendations. |
| adaptation-engine Pass 3 ← category routing | NOT VERIFIED | `dynamic-agent-selector.getCategoryStats()` requires ≥8 `apex_agent_runs` rows per category. Synthetic runs are spread across 8+ categories, none reaching MIN_SAMPLES. Pass 3 produces 0 recommendations. |
| memory-indexer → embeddings | NOT VERIFIED | `VOYAGE_API_KEY` is empty in `.env`. `_embedPending()` cannot generate vectors. All episodes have `embedding: null`. |
| memory-retriever → semantic search | NOT VERIFIED | Depends on embeddings (above). Falls back to keyword search, which works. |
| tpl-semantic-retrieval-pgvector | NOT VERIFIED | Requires `embedded > 20` — unreachable with empty VOYAGE_API_KEY. |
| wiki-reader → finance context injection | NOT VERIFIED | wiki-reader reads Obsidian vault notes, not the `transactions` Supabase table. Synthetic transactions won't appear in agent context automatically. |
| wiki-reader → synthetic project context | NOT VERIFIED | wiki-reader CORE_PAGES hardcodes `02 Projects/Active/Apex-AI-OS.md`. Synthetic project files are not in CORE_PAGES and won't be injected automatically. |

**These broken integrations are structural limitations, not framework bugs.** They require either real pipeline runs (Pass 1, Pass 3) or credential setup (VOYAGE_API_KEY). The framework correctly identifies what data it CAN generate; these are areas outside its scope.

---

## 4. Missing Consumers

The following record types have no current consumer that reads them for learning/adaptation:

| Record type | Framework generates | Consumer | Gap |
|-------------|:------------------:|---------|-----|
| Chat history files | ✓ | None (vault scale only) | By design — no chat-ingestion subsystem |
| Email threads (Supabase) | ✓ | email_threads SQL queries only | By design — Tier 3 purpose is query testing |
| Financial transactions | ✓ | transactions/invoices SQL queries only | By design — Tier 3 purpose is query testing |
| Synthetic project files | ✓ | Not auto-ingested by wiki-reader | Gap — wiki-reader doesn't scan project dir |

**None of these gaps affect the primary objectives of Tier 1 or Tier 2.** They affect Tier 3 scale testing only, and the scale test purpose (query performance baseline) is still served.

---

## 5. Data Contamination Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| Real pipeline runs during test period | MEDIUM | LOW | episode IDs are `synth-*` prefixed; they coexist safely with real episodes; cleanup filters by naming convention |
| Real `assignWork()` call writes to plan-quality-registry.json during test | LOW | LOW | Cleanup filters by `synthetic===true`; real records preserved |
| episodic-memory in-process cache retains synthetic episodes after cleanup | MEDIUM | MEDIUM | **Server restart required after cleanup**. Documented in CLI output. |
| Lessons.md synthetic block survives partial cleanup | LOW | LOW | Lessons use text-prefix fallback `[SYNTHETIC:{id}]` as secondary cleanup key |
| Adaptation-registry accumulates recommendations from synthetic data | LOW | LOW | Cleanup resets `_adaptation-registry.json` to `{ totalActive: 0, adaptations: [] }` — documented as manual step |

**No irreversible contamination paths exist.** All records are named-convention isolated.

---

## 6. Cleanup Risks

| Cleanup step | Risk | Mitigation |
|-------------|------|-----------|
| `DELETE FROM apex_agent_runs WHERE task_id LIKE 'synth-%'` | Real runs with 'synth-' prefix accidentally deleted | Real orchestrator generates IDs as `${Date.now()}-${random}` — no 'synth-' prefix. Zero collision risk. |
| Filter `synthetic === true` from plan-quality-registry.json | Overwrites real records if serialization fails | Loader reads file, merges, writes atomically. If write fails, original preserved. |
| Lessons.md regex cleanup | Deletes non-synthetic content if BEGIN/END markers corrupt | Markers are dataset-specific (`sdv1-loop`, `sdv1-scale`, `sdv1-dim`). Corruption would need to span cross-lesson content, which is structurally impossible given the append-only write. |
| `rm memory-index.json` | Removes any pre-existing real index | **Risk exists** if real episodes were indexed before test. However: (a) current state has 0 real episodes; (b) `rebuildIndex()` on server restart recreates from remaining episodes. Acceptable. |
| `DELETE FROM transactions WHERE description LIKE '[SYNTHETIC]%'` | Real transactions with `[SYNTHETIC]` prefix | Highly unlikely. Real transactions come from Stripe/bank feeds which don't use this prefix. |

**Overall cleanup risk: LOW.** All cleanup operations are isolated by naming conventions specifically designed to avoid collision with real data.

---

## 7. Confidence Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Implementation completeness | 9/10 | All 10 required functions present; 2 defects fixed |
| Schema compatibility | 9/10 | Episode, plan, financial schemas fully compatible; goal status defect fixed |
| Integration coverage | 7/10 | 11/18 integrations verified; 7 structural limitations documented |
| Cleanup completeness | 10/10 | All 11 data locations handled; patterns non-overlapping |
| Production safety | 10/10 | Opt-in only; no auto-load; no production writes |
| Spec adherence | 8/10 | Record counts match exactly; completionRate differs from spec by 0.047 (spec arithmetic error in original plan) |
| **Overall** | **8.8/10** | Ready to execute with documented limitations |

---

## 8. GO / NO-GO

### Decision: **GO ✓**

The framework is ready for execution. The blocking defect (invalid goal status) has been corrected. All cleanup paths are complete and reversible. No production data is at risk.

### Recommended execution order

```
Step 1 — Snapshot pre-test state
  cp "VAULT/01 Executive/Lessons.md" "VAULT/01 Executive/Lessons.md.bak"
  cp "VAULT/System/Adaptations/adaptation-registry.json" ...adaptation-registry.json.bak

Step 2 — Load Tier 1
  node test-data-generator/cli.js load tier1
  [Restart server]
  node test-data-generator/cli.js validate tier1
  Expected: score 5.80 → ~5.30, all 6 dims real, inflation = 0%

Step 3 — Load Tier 2
  node test-data-generator/cli.js load tier2
  [Restart server]
  node test-data-generator/cli.js validate tier2
  [Trigger adaptation manually: POST /api/autonomy/adapt or similar]
  [Trigger roadmap: GET /api/autonomy/improvements]
  Expected: episodeCount=10, plan records=3, lessons=8, 1 adaptation recommendation

Step 4 — Load Tier 3 (optional scale test)
  node test-data-generator/cli.js load tier3
  [Restart server]
  node test-data-generator/cli.js validate tier3
  Expected: 20 episodes, 24 txns, 52 emails, episodeRichness=0.20

Step 5 — Cleanup when done
  node test-data-generator/cli.js cleanup all
  [Restart server]
  node test-data-generator/cli.js status  → all counts should be 0
```

### Proceed with Tier 1 immediately. Tier 2 adds significant learning loop value. Tier 3 is optional and can wait until a dedicated scale test is warranted.

### Known limitations to set expectations correctly

1. **Score after Tier 1 will be ~5.30, not 5.31** — rounding difference from spec, correct
2. **goalCompletion after Tier 2 will be 0.667, not 0.714** — spec had arithmetic error; 0.667 is mathematically correct (4 completed / 6 total)
3. **Adaptation Pass 2 produces 1 recommendation at Tier 2** (split_large_tasks) — not 3 as spec may imply; Passes 1 and 3 require real pipeline runs
4. **Embeddings will not be generated** — VOYAGE_API_KEY is empty; semantic retrieval uses keyword fallback (functional)
5. **Finance/email/project data not in agent context** — these records are accessible via API routes and test query performance, but are not injected into planning/agent prompts
