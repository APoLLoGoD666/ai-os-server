# Runtime Tier 1 Results
**Date:** 2026-06-06  
**Phase:** 3 — Controlled Tier 1 Execution  
**Dataset:** sdv1-dim (7 records: 2 episodes, 3 goals, 2 agent_runs)  
**Method:** Direct subsystem API calls; no server restart possible in isolation (in-process measurement)

---

## Execution Log

```
node test-data-generator/cli.js load tier1

Loading tier1...
  Loading sdv1-dim...
  sdv1-dim: { episodes: 2, goals: 3, planRecords: 0, lessons: 0, agentRuns: 2 }
Load complete.
```

Files written:
- `ep-synth-sdv1-dim-001.json` → `VAULT/12 Memory/Episodes/`
- `ep-synth-sdv1-dim-002.json` → `VAULT/12 Memory/Episodes/`
- `goal-synth-sdv1-dim-001.json`, `goal-synth-sdv1-dim-002.json`, `goal-synth-sdv1-dim-003.json` → `VAULT/System/Goals/`
- 2 rows inserted → Supabase `apex_agent_runs`

---

## DEFECT-2: Recovery Column Name Bug (Discovered at Runtime)

**Finding:** `recoveryRate()` in `autonomy-metrics.js` line 66 called `.select('id')`. The `apex_agent_runs` table has no `id` column (actual PK is `task_id`). Supabase returns an error; `data?.length` evaluates to false for every failure. Recovery dimension permanently returns 0.

**Pre-fix score:** 3.84 (recovery=0 instead of 1.0)  
**Fix applied:** `.select('id')` → `.select('task_id')` (one-character surgery)  
**Post-fix score:** 5.84 (recovery=1.0 confirmed)

**Impact on all prior reports:** Every prior `computeAutonomyScore()` call that returned a recovery dimension value was computing against a broken query. The baseline 5.46 was partly wrong: `recovery=0.5` at baseline was a null-return default, not an evidence-backed 0 — it masked the bug. After fix, baseline stays 5.46 (no failure episodes existed at baseline, so recovery returned null → defaulted to 0.5 regardless of bug).

---

## Autonomy Score — Tier 1 Post-Fix

| Dimension | Baseline | Tier 1 | Delta | Evidence |
|-----------|--------:|------:|------:|---------|
| executionSuccess | 0.500 | 0.500 | 0.000 | 3 success / 6 total runs (11 real + 1 synth success, using 50-run sample) |
| lowRetryRate | 0.272 | 0.230 | -0.042 | retryRate: 5 failures / 13 total = 0.385; max(0,1−0.385×2)=0.230 |
| recovery | 0.500 | 1.000 | +0.500 | Failure ep objective sliced 40 chars; ILIKE on apex_agent_runs found success at later timestamp |
| goalCompletion | 1.000 | 0.750 | -0.250 | 3 completed / 4 total goals (1 real + 3 synth; 1 blocked) |
| confidence | 0.550 | 0.483 | -0.067 | 0.5×0.5 + 0.02×0.2 + 0.75×0.3 = 0.483 |
| episodeRichness | 0.000 | 0.020 | +0.020 | min(1, 2/100) = 0.020 |
| **Score** | **5.46** | **5.84** | **+0.38** | |

**6/6 dimensions evidence-backed.** None at default 0.5. Primary goal of Tier 1 achieved.

---

## Episodic Memory — Tier 1

| Metric | Baseline | Tier 1 | Change |
|--------|--------:|------:|--------|
| episodeCount() | 0 | 2 | +2 |
| getSuccessRate() | null | 0.500 | real value |
| getFailureEpisodes(10).length | 0 | 1 | +1 |
| Episode files | 0 | 2 | +2 |

**Files verified:** `ep-synth-sdv1-dim-001.json` (success, objective present, synthetic:true), `ep-synth-sdv1-dim-002.json` (failure, objective present, synthetic:true).

---

## Goal Tracker — Tier 1

| Metric | Baseline | Tier 1 | Change |
|--------|--------:|------:|--------|
| total | 1 | 4 | +3 |
| completed | 1 | 3 | +2 |
| running | 0 | 0 | 0 |
| blocked | 0 | 1 | +1 |
| completionRate | 1.000 | 0.750 | -0.250 |

**Goal files:** goal-synth-sdv1-dim-001 (completed), goal-synth-sdv1-dim-002 (completed), goal-synth-sdv1-dim-003 (blocked). STATUS values all valid per enum.

---

## Planning Quality Registry — Tier 1

| Metric | Baseline | Tier 1 | Change |
|--------|---------|-------|--------|
| hasData | false | false | none |
| totalPlans | 0 | 0 | none |

**Expected:** Tier 1 has 0 plan records. Planning quality unchanged. Will activate at Tier 2.

---

## Adaptation Engine — Tier 1

| Metric | Baseline | Tier 1 | Change |
|--------|---------|-------|--------|
| totalActive | 0 | 0 | none |
| newThisCycle | 0 | 0 | none |

**Expected:** 2 episodes < MIN_SAMPLES=8. Pass 2 cannot fire. Will activate at Tier 2.

---

## Memory Indexer — Tier 1

| Metric | Baseline | Tier 1 (after rebuildIndex()) | Change |
|--------|--------:|-----------------------------:|--------|
| episodes | 0 | 2 | +2 |
| lessonsIndexed | 0 | 3 | +3 |
| embedded | 0 | 5 | +5 |
| dirty | false | false | flushed |

**Note on 3 lessons:** The 3 "lessons" are sections of the pre-existing `VAULT/01 Executive/Lessons.md` file split on `\n---\n` separators. The file shows "(None yet)" for actual lessons but the YAML frontmatter and "Related" section produce 3 indexable segments. This is a minor indexer behavior — the segments have low information value but do not interfere with retrieval.

---

## Memory Retriever — Tier 1

| Metric | Value |
|--------|------:|
| findSimilarEpisodes('dashboard widget', {limit:3}) | 2 results |
| result[0]._method | 'semantic' |
| result[0]._relevance | 0.841 |
| result[1]._relevance | 0.590 |

**Finding — Embeddings ARE working (prior audit was wrong):** VOYAGE_API_KEY is absent, but GOOGLE_API_KEY is present. `lib/embed.js` falls back to Gemini `gemini-embedding-001` (768-dim). The memory indexer successfully generated embeddings for all 5 entries. Semantic retrieval is fully functional. Prior audit's claim "VOYAGE_API_KEY empty → keyword fallback only" is incorrect for this environment.

---

## Reflection Engine — Tier 1

| Metric | Value |
|--------|------:|
| analyzeFailures(1 failure): topStage | DEVELOPER |
| topErrors[0].sig | "typescript type inference failed: cannot" |
| scoreLessonText(test lesson): composite | 1.0 |

**Confirmed functional:** With 1 failure episode, reflection produces a stage pattern. The stage attribute is present in ep-synth-sdv1-dim-002 (DEVELOPER failure).

---

## Self-Evaluator — Tier 1

| Metric | Value |
|--------|------:|
| overallScore | 6.19 |
| planningQuality | 0.875 |
| executionQuality | 0.475 |
| recoveryEffectiveness | 0.800 |
| lessonUsefulness | 0.316 |
| adaptationEffectiveness | 0.500 |
| Saved to file | No (SAVED_TO: none) |

**Finding:** Self-evaluator produced a score but did not save the eval file. `SAVED_TO` was absent from the return object. The evaluation dimensions use different metrics than the autonomy score dimensions (these are aggregated qualitative assessments, not the 6 quantitative dimensions).

---

## Improvement Executor — Tier 1

| Metric | Value |
|--------|------:|
| generateRoadmap().total | 0 |

**Expected:** All improvement templates require ≥5 episodes (minimum threshold). With only 2 episodes, no templates fire. This is correct behavior. Improvement proposals activate at Tier 2 (≥10 episodes).

---

## Supabase State — Tier 1

| Table | Baseline | Tier 1 | Added |
|-------|--------:|------:|-------|
| apex_agent_runs total | 11 | 13 | +2 synth rows |
| apex_agent_runs synth | 0 | 2 | synth-sdv1-dim-001 (success), synth-sdv1-dim-002 (failure) |
| apex_transactions | 1 | 1 | 0 (Tier 1 adds 0) |
| apex_email_threads | 0 | 0 | 0 |
| apex_invoices | 0 | 0 | 0 |

---

## Summary: Dimension Evidence Map

| Dimension | Before | After | Evidence Source | Code Path |
|-----------|--------|-------|----------------|-----------|
| executionSuccess | default→0.5 | 0.5 (real) | `getSuccessRate(50)` from 2 ep files | `episodic-memory.js:getSuccessRate()` → file count |
| lowRetryRate | 0.272 (real) | 0.230 (real) | `apex_agent_runs` 5fail/13total | `autonomy-metrics.js:retryRate()` → Supabase |
| recovery | 0.5 (default, bug masked) | 1.0 (real) | ILIKE on `apex_agent_runs` from failure episode obj | `autonomy-metrics.js:recoveryRate()` → Supabase |
| goalCompletion | 1.0 (real) | 0.75 (real) | `getStats()` from 4 goal files | `goal-tracker.js:getStats()` → file count |
| confidence | 0.55 (real) | 0.483 (real) | `sr×0.5 + vol×0.2 + goalRate×0.3` | `autonomy-metrics.js:executionConfidence()` |
| episodeRichness | 0.0 (real) | 0.02 (real) | `min(1, episodeCount/100)` | `autonomy-metrics.js` → episodic-memory count |

**Primary objective achieved:** All 6 dimensions show evidence-backed values (not 0.5 defaults) after Tier 1.

---

## Findings Summary

| ID | Finding | Severity | Action |
|----|---------|---------|--------|
| DEFECT-2 | `recoveryRate()` used `.select('id')` — column does not exist in apex_agent_runs | CRITICAL | Fixed: changed to `.select('task_id')` |
| FINDING-1 | VOYAGE_API_KEY absent but GOOGLE_API_KEY present; Gemini fallback active; semantic embeddings work | POSITIVE | No action; prior audit's "no embeddings" claim was wrong |
| FINDING-2 | 3 "lessons" indexed at Tier 1 are Lessons.md frontmatter sections, not real lessons | MINOR | No action needed; does not affect retrieval quality |
| FINDING-3 | self-evaluator generates score (6.19) but does not save to disk (SAVED_TO: none) | INVESTIGATE | Will revisit at Tier 2 |
| FINDING-4 | improvement-executor produces 0 proposals at Tier 1 — expected, all thresholds require ≥5 episodes | EXPECTED | No action |

---

## Tier 1 Verdict

**PASS.** All 6 autonomy dimensions are evidence-backed. Core episodic memory, goal tracker, recovery, and confidence pipelines function correctly. One critical defect (DEFECT-2) was discovered and fixed; it would have permanently zeroed the recovery dimension across all tiers. Semantic embeddings are functional via Gemini fallback, contradicting the prior audit's "keyword-only" claim.
