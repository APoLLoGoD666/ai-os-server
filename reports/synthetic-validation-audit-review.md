# Synthetic Validation Framework — Independent Audit Review
**Date:** 2026-06-06  
**Reviewer:** Independent Verification (Session 3)  
**Method:** Re-read every cited source file independently; re-derived every calculation  
**Scope:** Review of `reports/synthetic-validation-audit.md` and `reports/synthetic-validation-go-no-go.md`

---

## 0. Methodology

Every major VERIFIED claim was re-tested against the actual source file at the cited line. Every calculation was re-derived from first principles using the actual formulas. Claims marked CONFIRMED were independently reproducible. Claims marked OVERSTATED or NOT VERIFIED represent cases where the evidence did not support the conclusion to the degree claimed.

Source files read in this review (full text):
- `agent-system/episodic-memory.js`
- `agent-system/goal-tracker.js`
- `agent-system/autonomy-metrics.js`
- `agent-system/adaptation-engine.js`
- `agent-system/planning-quality-registry.js`
- `agent-system/reflection-engine.js`
- `agent-system/improvement-executor.js`
- `agent-system/self-evaluator.js`
- `agent-system/memory-indexer.js`
- `agent-system/memory-retriever.js`
- `test-data-generator/generators.js`
- `test-data-generator/loader.js`
- `test-data-generator/cleanup.js`

---

## 1. Phase 1 — DEFECT-1 and Issue-5 Findings

### Claim: DEFECT-1 — goal `status: 'active'` is not valid

**Evidence cited:** `goal-tracker.js` STATUS enum.  
**Independent check:** Read `goal-tracker.js` lines 12–18:
```javascript
const STATUS = Object.freeze({
    PENDING:   'pending',
    RUNNING:   'running',
    COMPLETED: 'completed',
    BLOCKED:   'blocked',
    CANCELLED: 'cancelled',
});
```
No 'active' value exists. The finding is **CONFIRMED CORRECT**.

**Was it fixed?** Read `generators.js` lines 119, 127: Tier 2 goal-006 has `status: 'running'`, Tier 3 goal-009 has `status: 'running'`. **Fix CONFIRMED in place.**

**Impact of fix:** `getStats()` (line 129–143) counts goals by status using `counts[g.status]++` only if the status key exists. A goal with status 'active' would count in `total` but in no status bucket, silently deflating `completionRate`. The fix was necessary and correct.

---

### Claim: Issue-5 — `agent_summary: '[]'` (string) should be `[]` (array)

**Evidence cited:** Supabase JSONB column type mismatch.  
**Independent check:** Read `generators.js` lines 527–557: all agent run rows show `agent_summary: []`. **Fix CONFIRMED in place.** No string occurrences remain.

---

## 2. Phase 2 — Integration Trace Verification

### Claim: `episodic-memory ← episode files` — VERIFIED
**Evidence cited:** `_loadAll()` reads `ep-*.json`.  
**Independent check:** `episodic-memory.js` line 61:
```javascript
const files = fs.readdirSync(EPISODES_DIR).filter(f => f.startsWith('ep-') && f.endsWith('.json'));
```
Framework files: `ep-synth-sdv1-dim-001.json`, `ep-synth-sdv1-loop-003.json` — all start with `ep-` and end with `.json`. **CONFIRMED CORRECT.**

`episodeCount()` (line 186) uses same pattern. **CONFIRMED CORRECT.**

---

### Claim: `goal-tracker ← goal files` — VERIFIED (after fix)
**Evidence cited:** `_loadAll()` reads `goal-*.json`; all statuses valid.  
**Independent check:** `goal-tracker.js` line 43–49:
```javascript
fs.readdirSync(GOALS_DIR)
    .filter(f => f.startsWith('goal-') && f.endsWith('.json'))
```
Framework files: `goal-synth-sdv1-dim-001.json` — starts with `goal-`, ends with `.json`. Loader writes file as `${goal.id}.json` where `goal.id = 'goal-synth-sdv1-dim-001'` → filename `goal-synth-sdv1-dim-001.json`. **CONFIRMED CORRECT.**

---

### Claim: `apex_agent_runs → retryRate/recoveryRate` — VERIFIED
**Evidence cited:** Supabase rows inserted; recovery matching by ILIKE confirmed.

**retryRate() independent check:** `autonomy-metrics.js` lines 34–43:
```javascript
.from('apex_agent_runs').select('success').order('created_at', { ascending: false }).limit(sampleSize)
```
Framework inserts rows with `success` column via `loader.insertAgentRuns()`. **CONFIRMED CORRECT.**

**recoveryRate() independent check:** `autonomy-metrics.js` lines 60–72:
```javascript
const kw = (ep.objective || '').slice(0, 40);
.ilike('objective', `%${kw}%`).eq('success', true).gt('created_at', ep.timestamp)
```
Failure episode (ep-002): objective = `'[SYNTHETIC] Build metrics dashboard widget for system health monitoring'`. Truncated to 40 chars: `'[SYNTHETIC] Build metrics dashboard widg'`.

Success agent run row (generators.js line 528): `objective: '[SYNTHETIC] Build metrics dashboard widget for system'`.

Does `'[SYNTHETIC] Build metrics dashboard widget for system'` contain `'[SYNTHETIC] Build metrics dashboard widg'`? YES — `widg` is a prefix of `widget`. ILIKE passes.

Timestamp check: failure timestamp `2026-05-31T15:00:00.000Z`, success run `created_at: '2026-06-01T10:00:00.000Z'`. June 1 > May 31. **CONFIRMED CORRECT.**

PostgreSQL ILIKE note: `[` is not a special wildcard character in PostgreSQL ILIKE — only `%` and `_` are. So `[SYNTHETIC]` matches literally. **CONFIRMED CORRECT.**

---

### Claim: `autonomy-metrics ← episodes + apex_agent_runs` — VERIFIED
**Evidence cited:** All 6 dimensions produce real values.  
**Independent check:** `autonomy-metrics.js` line 103–119 confirms all 6 dimension weights match spec. See Section 4 for independent score calculation.

---

### Claim: `adaptation-engine Pass 2 ← episodes` — VERIFIED
**Evidence cited:** `devFails=4 ≥ ceil(8/2)=4`; `split_large_tasks` fires.  
**Independent check:**  
- `adaptation-engine.js` line 27: `const MIN_SAMPLES = 8`
- Line 176: `if (totalEps < MIN_SAMPLES) return recs;` — at Tier 2, `totalEps = 10` ≥ 8 ✓
- Line 185: `if (devFails >= Math.ceil(MIN_SAMPLES / 2))` = `devFails >= 4`

DEVELOPER failures from generators.js:
- ep-002 (Tier 1): `failedStage: 'DEVELOPER'`
- ep-003, 004, 005, 006 (Tier 2): `failedStage: 'DEVELOPER'`
- Total at Tier 2: 5 DEVELOPER failures

5 ≥ 4 → `split_large_tasks` recommendation generated. **CONFIRMED CORRECT.**

---

### Claim: `planning-quality-registry ← plan registry` — VERIFIED
**Evidence cited:** `completedAt` set on all records; `getPlanQuality()` returns non-empty at 3 records.  
**Independent check:**  
- `planning-quality-registry.js` line 177: filter by `if (!r.completedAt) return false`
- `generators.js` lines 150, 163, 175: ALL 3 Tier 2 plan records have `completedAt` set ✓
- `MIN_SAMPLES = 3` (line 24); 3 records = exactly MIN_SAMPLES → `getPlanQuality()` returns non-empty
- `generatePlanningInsights()` (line 314): `if (n < MIN_SAMPLES) return { insufficient: true }` — 3 = MIN_SAMPLES so `n >= MIN_SAMPLES`. **CONFIRMED CORRECT.**

---

### Claim: `reflection-engine ← Lessons.md` — PARTIALLY VERIFIED (quality score OVERSTATED)
**Evidence cited:** "8 lessons have high actionScore (1.0) and specificScore (1.0); composite ~0.85"  
**Independent check:** Read `reflection-engine.js` lines 37–47:
```javascript
const actionable = /\b(always|never|must|avoid|use\b|check|ensure|wrap|add\b|replace|validate|guard)\b/i.test(lesson);
const specific   = /\b(\.js|\.md|route|function|table|await|async|try|catch|limit|guard|schema|query)\b/i.test(lesson);
const actionScore = (actionable ? 0.5 : 0) + (specific ? 0.5 : 0);
```

Independent analysis of 8 Tier 2 lessons against both patterns:

| # | Lesson fragment | actionable | specific | actionScore |
|---|-----------------|:----------:|:--------:|:-----------:|
| 1 | "Always check git status before committing..." | ✓ (always, check) | ✗ | 0.5 |
| 2 | "DEVELOPER fails on TypeScript type inference..." | ✗ | ✗ | 0.0 |
| 3 | "Tasks with fileCount > 4 have 60% failure rate..." | ✗ | ✗ | 0.0 |
| 4 | "REVIEWER failures concentrate on test coverage..." | ✗ | ✗ | 0.0 |
| 5 | "Budget projections should use 4× multiplier..." | ✓ (use) | ✗ | 0.5 |
| 6 | "RESEARCHER adds context quality for domain-specific..." | ✗ | ✗ | 0.0 |
| 7 | "Recovery attempts succeed when model is escalated..." | ✗ | ✗ | 0.0 |
| 8 | "VALIDATOR false positives — check should be added..." | ✓ (check) | ✗ | 0.5 |

**No lesson scores `specific=0.5`** because none contain `.js`, `.md`, `route`, `function`, `table`, `await`, `async`, `try`, `catch`, `limit`, `guard`, `schema`, or `query` as whole words.

**Actual composite scores** (with confidence=1.0, recency≈1.0, ageDays≈0):
- composite = 1.0×0.4 + 1.0×0.3 + actionScore×0.3
- Lessons scoring 0.5: composite = 0.7 + 0.15 = **0.85**
- Lessons scoring 0.0: composite = 0.7 + 0.0 = **0.70**
- Average composite: (3×0.85 + 5×0.70) / 8 = **≈ 0.757**, not 0.85

**FINDING: The audit OVERSTATED lesson quality.** actionScore is NOT uniformly 1.0 — it is 0.0 or 0.5. Average composite is ~0.76, not 0.85.

**Impact on GO decision:** LOW. The reflection-engine integration DOES work — lessons are indexed, scored, and retrievable. The quality is somewhat lower than claimed but all composites are ≥ 0.70 (well above any threshold used by APEX subsystems).

---

### Claim: `improvement-executor ← episode count` — PARTIALLY VERIFIED (count understated)
**Evidence cited:** "3 templates activate at Tier 2 (tpl-episode-cross-reference, tpl-reflection-lesson-wire, tpl-self-evaluator-endpoint)"  
**Independent check:** `improvement-executor.js` trigger conditions at `episodeCount = 10`:

| Template | Trigger | Fires at Tier 2? |
|----------|---------|:----------------:|
| tpl-lesson-consolidation-cron | episodeCount > 20 | ✗ |
| **tpl-adaptation-routing-wire** | activeAdaptations > 0 && topStage !== null | **✓ IF adaptation cycle run** |
| tpl-reflection-lesson-wire | episodeCount >= 10 | ✓ |
| tpl-episode-cross-reference | episodeCount >= 5 | ✓ |
| tpl-episode-cap-increase | episodeCount > 150 | ✗ |
| tpl-lesson-deduplication | episodeCount > 15 | ✗ |
| tpl-confidence-estimator | episodeCount >= 15 | ✗ |
| tpl-self-evaluator-endpoint | episodeCount >= 10 | ✓ |
| tpl-semantic-retrieval-pgvector | episodeCount >= 30 && embedded > 20 | ✗ |
| tpl-planning-quality-registry | episodeCount >= 25 | ✗ |

`tpl-adaptation-routing-wire` condition: `activeAdaptations > 0 && topStage !== null`. At Tier 2 after adaptation cycle runs: 1 active adaptation (`split_large_tasks`), and `failureAnalysis.topStage = 'DEVELOPER'` (not null). The go-no-go document explicitly recommends triggering adaptation before generating the roadmap. So at execution time, **4 templates activate, not 3**.

**FINDING: Minor undercount.** The claim of "3 templates" is correct only before the adaptation cycle runs. After it runs (as recommended), 4 templates fire. The system works better than claimed.

---

### Claim: `self-evaluator ← all sources` — VERIFIED
**Evidence cited:** "Reads episodic, goal-tracker, adaptation-engine, autonomy-metrics; all sources available."  
**Independent check:** `self-evaluator.js` imports: `episodic-memory`, `reflection-engine`, `adaptation-engine`, `autonomy-metrics`, `goal-tracker`, `execution-verifier`. All these subsystems have data at Tier 2. **CONFIRMED CORRECT.**

---

### Claim: `memory-indexer ← episode files` — VERIFIED
**Evidence cited:** `rebuildIndex()` reads `ep-synth-*.json`.  
**Independent check:** `memory-indexer.js` lines 255–265:
```javascript
const files = fs.readdirSync(EPISODES_DIR)
    .filter(f => f.startsWith('ep-') && f.endsWith('.json'));
```
Synthetic episode files start with `ep-` and end with `.json`. **CONFIRMED CORRECT.**

Side note: Lessons.md BEGIN/END markers (e.g., `<!-- SYNTHETIC-BEGIN:sdv1-loop -->`, 37 chars) WILL be indexed as pseudo-lessons by `rebuildIndex()` since they exceed the 10-char minimum. These marker strings score near-zero for any real query (no actionable/specific keywords) and pose no functional risk. This is cosmetic only.

---

### Claim: `memory-retriever ← indexer` — VERIFIED
**Evidence cited:** "Keyword fallback functional; findSimilarEpisodes() returns matches."  
**Independent check:** `memory-retriever.js` lines 92–95:
```javascript
const sim = hasEmbedded && ep.embedding
    ? _cosineSim(queryVec, ep.embedding)
    : _kwScore(query, ep.text);
```
With VOYAGE_API_KEY empty → no embeddings → `hasEmbedded = false` → keyword fallback path. **CONFIRMED CORRECT.**

---

### Claim: Broken integrations (7 structural limitations) — CONFIRMED
All 7 correctly identified:
- **Pass 1 ← agent-reputation**: `_analyzeStageFailures()` calls `_rep.getFailurePatterns()` which reads `apex_agent_stages`. Framework does not insert into `apex_agent_stages`. Confirmed broken.
- **Pass 3 ← category routing**: `_analyzeCategoryRouting()` checks `stats.sampleSize < MIN_SAMPLES` (8) per category. 10 total runs spread across 8+ unique objective prefixes → each category < 8. Confirmed broken.
- **Embeddings**: `_embedPending()` requires `embedText` from `lib/embed.js`. With VOYAGE_API_KEY empty, this fails. Confirmed broken.
- **Semantic search**: Depends on embeddings. Confirmed broken.
- **tpl-semantic-retrieval-pgvector**: `triggerCondition: (s) => s.episodeCount >= 30 && s.memoryStats?.embedded > 20`. With 0 embeddings, never fires. Confirmed broken.
- **wiki-reader → finance context**: wiki-reader reads Obsidian vault via CORE_PAGES hardcoded list, not Supabase tables. Confirmed broken.
- **wiki-reader → synthetic project files**: CORE_PAGES does not include synthetic project directory. Confirmed broken.

---

## 3. Phase 3 — Schema Compatibility

### Claim: Episode, plan, financial schemas fully compatible
**Independent check:** 
- Episodes: required fields (`id`, `timestamp`, `objective`, `success`, `failedStage`, etc.) all present in generators.js. ✓
- Plan records: `planId`, `completedAt`, `outcome`, `successRate` all present and correctly typed. ✓
- Goals: after fix, all statuses are valid enum values. ✓
- Agent runs: `task_id`, `objective`, `success`, `cost_usd`, `complexity`, `agent_summary` (array, not string) all correct. ✓

**CONFIRMED CORRECT.**

---

## 4. Autonomy Score Calculation — Independent Verification

### Claim: Score 5.80 → ~5.30 after Tier 1

At Tier 1 load (2 episodes, 3 goals, 2 agent runs in Supabase):

**From autonomy-metrics.js formulas:**

`getSuccessRate(50)` = 1 success / 2 total = **0.5**  
`episodeCount()` = 2 → `episodeRichness` = min(1.0, 2/100) = **0.02**  
`goalStats()`: total=3, completed=2, completionRate = 2/3 = **0.667**  
`retryRate(50)` from Supabase: 1 failure / 2 rows = 0.5 → `lowRetryRate` = max(0, 1 - 0.5×2) = **0.0**  
`recoveryRate(30)`: 1 failure episode, 1 matching success row → 1/1 = **1.0**  
`executionConfidence()`:
- sr = getSuccessRate(20) = 0.5
- epVol = min(1.0, 2/50) = 0.04
- goalScore = 0.667
- conf = 0.5×0.5 + 0.04×0.2 + 0.667×0.3 = 0.25 + 0.008 + 0.200 = **0.458**

`raw` = 0.5×0.30 + 0.0×0.15 + 1.0×0.20 + 0.667×0.20 + 0.458×0.10 + 0.02×0.05  
     = 0.150 + 0.000 + 0.200 + 0.133 + 0.046 + 0.001 = **0.530**  
`score` = 0.530 × 10 = **5.30** ✓

**CONFIRMED CORRECT.** The projected ~5.30 is independently verified.

**Caveat not mentioned in audit:** This score assumes near-zero pre-existing real data. If the system currently has real goals with non-zero completionRate, the starting score of 5.80 incorporates that data, and adding Tier 1 on top will yield a score that depends on the combined dataset, not just the synthetic data alone. The "5.30 after Tier 1" is accurate only if real goals/episodes are minimal.

### Claim: goalCompletion = 0.667 after Tier 2
After Tier 2 (6 goals): 4 completed (dim-001, dim-002, loop-004, loop-005), 1 blocked (dim-003), 1 running (loop-006).  
completionRate = 4/6 = **0.667** ✓ **CONFIRMED CORRECT.**

---

## 5. Cleanup Safety — Independent Verification

### Episode cleanup
`cleanup.js` line 120: prefix `'ep-synth-'` (or `'ep-synth-{id}-'`).  
Real orchestrator episode IDs: `${Date.now()}-${Math.random().toString(36).slice(2,6)}` → filename `ep-{timestamp}-{random}.json`. No 'synth-' prefix. **SAFE.** ✓

### Goal cleanup
`cleanup.js` line 124: prefix `'goal-synth-'` (or `'goal-synth-{id}-'`).  
Real goal IDs: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}` → filename `goal-{timestamp36}-{random}.json`. No 'synth-' prefix. **SAFE.** ✓

### Plan registry cleanup
`cleanup.js` lines 75–79: filters by `r.synthetic !== true`.  
Real `recordPlanOutcome()` records do not include `synthetic: true`. **SAFE.** ✓

### Lessons.md cleanup
Regex removes content between `<!-- SYNTHETIC-BEGIN:{id} -->` and `<!-- SYNTHETIC-END:{id} -->`.  
`_escapeRe()` correctly handles all special regex characters in these strings (there are none of `.*+?^${}()|[\]\\` in the marker text). **SAFE.** ✓

### Supabase cleanup
- `apex_agent_runs WHERE task_id LIKE 'synth-%'`: Real IDs use timestamp pattern, no 'synth-' prefix. **SAFE.** ✓
- `transactions WHERE description LIKE '[SYNTHETIC]%'`: Real transactions from Stripe/bank feeds don't use this prefix. **SAFE.** ✓
- `invoices WHERE invoice_number LIKE 'SYNTH-%'`: Real invoices use different numbering. **SAFE.** ✓
- `email_threads WHERE thread_id LIKE 'synth-thread-%'`: Real thread IDs from Gmail API. **SAFE.** ✓

---

## 6. Finding: Adaptation Registry NOT Auto-Cleaned

**Audit claim (go-no-go, risk table):** "Cleanup resets `_adaptation-registry.json` to `{ totalActive: 0, adaptations: [] }` — documented as manual step"

**Independent check:** Read `cleanup.js` in full (161 lines). The `cleanupSyntheticDataset()` function handles:
1. Episodes ✓
2. Goals ✓
3. Plan records ✓
4. Lessons.md ✓
5. Memory index ✓
6. Chat files ✓
7. Project files ✓
8. Supabase ✓

**NO step touches `adaptation-registry.json`.** The phrasing "Cleanup resets" is misleading — the CLI `cleanup all` command does NOT reset the adaptation registry. The reset is purely manual (not automated by the framework).

**FINDING: The go-no-go document misrepresented this.** "Cleanup resets" implies the cleanup command does it. The accurate statement is: "CLI cleanup does NOT touch adaptation-registry.json. Manual reset required after cleanup: set `adaptations: []`, `totalActive: 0` in `System/Adaptations/adaptation-registry.json`."

**Impact:** LOW. Adaptations generated from synthetic data (e.g., `split_large_tasks`) will persist after CLI cleanup. They expire automatically after 7 days (TTL_MS in adaptation-engine.js), but until expiry they may influence real pipeline behavior. This is a documentation gap, not a data safety issue.

---

## 7. Summary of Audit Findings

| Claim | Verdict | Notes |
|-------|---------|-------|
| DEFECT-1: goal status 'active' invalid | ✓ CONFIRMED | Fix verified in generators.js |
| Issue-5: agent_summary string → array | ✓ CONFIRMED | Fix verified in generators.js |
| episodic-memory reads ep-*.json | ✓ CONFIRMED | Line 61 independently verified |
| goal-tracker reads goal-*.json | ✓ CONFIRMED | Line 43 independently verified |
| recoveryRate() ILIKE matching | ✓ CONFIRMED | Substring match verified character-by-character |
| Adaptation Pass 2 fires at devFails=4 | ✓ CONFIRMED | 5 DEVELOPER failures at Tier 2 |
| planning-quality-registry MIN_SAMPLES=3 | ✓ CONFIRMED | completedAt present on all records |
| Autonomy score ~5.30 after Tier 1 | ✓ CONFIRMED | Independent calculation matches |
| goalCompletion = 0.667 after Tier 2 | ✓ CONFIRMED | 4/6 independently verified |
| memory-indexer reads ep-*.json | ✓ CONFIRMED | Lines 255-265 independently verified |
| memory-retriever keyword fallback | ✓ CONFIRMED | Lines 92-95 independently verified |
| 7 broken integrations correctly identified | ✓ CONFIRMED | All 7 root causes verified |
| All cleanup patterns isolate synthetic data | ✓ CONFIRMED | All 8 cleanup steps analyzed |
| **Lesson actionScore = 1.0 for all 8 lessons** | **✗ OVERSTATED** | Actual: 0.0-0.5; avg composite ~0.76 not 0.85 |
| **3 templates activate at Tier 2** | **⚠ MINOR UNDERCOUNT** | Actually 4 if adaptation cycle runs first |
| **"Cleanup resets adaptation-registry.json"** | **⚠ MISLEADING** | CLI cleanup does NOT touch this file; manual only |
| Score projection "5.80 → ~5.30" | ⚠ ASSUMPTION | Accurate only if pre-existing real data is minimal |

---

## 8. Corrected Claims

**Lesson quality:** The reflection-engine integration is verified. Lessons are indexed and score composites of 0.70–0.85 (not uniformly 0.85). Average is ~0.76. The integration works; the quality was mildly overstated.

**Template count:** At Tier 2, 3 templates activate on `generateRoadmap()` call alone (episodeCount threshold). If adaptation cycle is triggered first (as recommended), 4 templates activate. The system performs better than claimed.

**Adaptation registry cleanup:** Requires manual intervention. Not automated by CLI.

**Score projection:** Correct for clean-slate scenario (no pre-existing data). Real execution result depends on combined real + synthetic data.

---

**Audit Review Conclusion:** The original audit was largely accurate on all technical claims. The blocking defect was real and correctly fixed. Two factual errors were found (lesson quality overstated, adaptation registry cleanup misrepresented) and one minor undercount (template count). None of these invalidate the framework's readiness. The critical consumption paths are correctly traced and the cleanup is safe.
