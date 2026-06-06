# Shadow Workload Execution
**Date:** 2026-06-06  
**Phase:** 1 — Shadow Workload Execution  
**Campaign:** Production Shadow Evaluation  
**Corpus:** 35 episodes (20 prior + 15 shadow), 15 goals (10 prior + 5 shadow), 46 apex_agent_runs

---

## Defect Discovered During Phase 1

### DEFECT-7: `selectAgentConfig` crashes when `catStats` is null

**File:** `agent-system/dynamic-agent-selector.js:98`  
**Condition:** Category has fewer than 3 matching `apex_agent_runs` records → `getCategoryStats()` returns null  
**Code (before fix):**
```js
if (catStats?.successRate !== null && catStats.successRate < 0.55) {
```
**Root cause:** `catStats?.successRate` evaluates to `undefined` when catStats is null. `undefined !== null` is `true`. The second half `catStats.successRate` then crashes.

**Evidence:** Error `Cannot read properties of null (reading 'successRate')` thrown for `auth` and `agent` categories (both had fewer than 3 matching runs).

**Fix applied (line 98):**
```js
if (catStats?.successRate != null && catStats.successRate < 0.55) {
```
`!= null` catches both null and undefined (loose equality).

**Verification:** `selectAgentConfig({ objective: '[SHADOW] Build auth token refresh...' })` → `{ tier:'moderate', category:'auth', escalated:false }` — no crash.

**Severity:** CRITICAL in production. Every task whose category matches `auth` or `agent` (common categories) would crash `selectAgentConfig`, causing `runParallel` to fall back to the `.catch()` default tier. Category-aware routing was silently bypassed for these categories.

---

## Workload Configuration

### Shadow Corpus Injected

**Episodes (disk):**
```
15 episodes written: 10 success + 5 failure
- shadow-001 to shadow-010: DEVELOPER success (moderate/simple/complex)
- shadow-011: DEVELOPER failure — Redis migration timeout (critical)
- shadow-012: DEVELOPER failure — WebSocket memory spike (moderate)
- shadow-013: REVIEWER  failure — RLS policy missing on index (moderate)
- shadow-014: DEVELOPER failure — TOTP unencrypted at rest (complex)
- shadow-015: DEVELOPER failure — Race condition parallel agents (critical)
Write throughput: 2.53 ms/episode
```

**Goals (disk):**
```
5 goals written: 2 completed, 1 in_progress, 1 blocked, 1 pending
Write throughput: 1.0 ms/goal
```

**apex_agent_runs (Supabase):**
```
15 runs inserted: 10 success + 5 failure
Insert latency: 309ms (single batch)
```

**Post-ingestion state:**
```
Episodes: 20 → 35   (+15)
Goals:    10 → 15   (+5)
apex_agent_runs: 31 → 46  (+15)
```

---

## Workload 1 — Memory Ingestion

| Operation | Throughput | Latency | Notes |
|-----------|-----------|---------|-------|
| Episode write (disk) | 394 eps/sec | 2.53 ms/ep | Local file I/O |
| Goal write (disk) | 1000 goals/sec | 1.0 ms/goal | Local file I/O |
| apex_agent_runs batch insert | — | 309ms | Supabase network |
| Memory module load | — | 6ms | Module init + dir scan |

---

## Workload 2 — Retrieval

### Episode retrieval (8 queries):

| Query | Result count | Latency | Top result | Relevance |
|-------|------------:|---------|-----------|-----------|
| episodeCount | 35 | 0ms | — | — |
| getFailureEpisodes(20) | 14 | 9ms | — | — |
| getSimilarExp: auth | 5 | 7ms | shadow-006 (RBAC) | 0.439 |
| getSimilarExp: ops | 5 | 6ms | shadow-010, shadow-004 | 0.579 |
| getSimilarExp: database | 5 | 7ms | shadow-011, shadow-008 | 0.579 |
| goalStats | 15 total | 11ms | — | — |
| getRankedLessons: auth | 5 sections | 5ms | OAuth2 lesson | — |
| Supabase shadow runs | 15 | 672ms | — | — |

**Repeat latency (getFailureEpisodes × 5):** avg 6ms, range 5–7ms. Stable.

**Success rate by episode window:**
```
n=5:  0.0   (5 most recent = all shadow failures)
n=10: 0.5   (shadow mixed)
n=20: 0.7   (prior corpus dominates)
n=35: 0.6   (full corpus: 21 success / 35 total)
```

**Precision observation:** Auth search returns shadow-006 (RBAC/admin routes) before synth-sdv1-scale-016 (OAuth2), despite OAuth2 being more explicitly "auth" — keyword overlap with "admin, auth" in shadow-006 outscores the OAuth2 episode by 0.002. Both are relevant.

---

## Workload 3 — Reflection

| Operation | Cycles | Avg latency | Result |
|-----------|-------:|----------:|--------|
| analyzeFailures | 5 | 0.2ms | DEVELOPER: 9/14 (64.3%) |
| buildPerformanceSummary | 5 | 0.2ms | total:14, sr:0, avgCost:0.032 |
| scoreLessonText | 6 | 0.2ms | range 0.684–0.834 |
| getRankedLessons | 5 queries | 0.2ms | 8 sections/query |
| consolidateLessons | 1 | 1ms | 15→10 sections |

**Reflection pipeline total: <5ms for all 5 operations.** No Supabase dependency.

**Stage distribution (14 failures):**
```
DEVELOPER:  9  (64.3%)  ← dominant
REVIEWER:   2  (14.3%)
VALIDATOR:  1   (7.1%)
COMMITTER:  1   (7.1%)
TESTER:     1   (7.1%)
```

**Lesson ranking observation:** For "database migration" query, top result is still OAuth2/authentication — no DB-specific lesson exists in Lessons.md. Content gap identified (not a retrieval defect).

---

## Workload 4 — Adaptation

### Adaptation cycles:

| Cycle | Latency | totalActive | newThisCycle | byType | avgConfidence |
|-------|------:|----------:|----------:|-------|----------:|
| 0 | 349ms | 3 | 3 | planning:2, retry:1 | 0.716 |
| 1 | 87ms | 3 | 3 | planning:2, retry:1 | 0.716 |
| 2 | 85ms | 3 | 3 | planning:2, retry:1 | 0.716 |

**Adaptation escalation: 1 → 3 active adaptations** (shadow corpus triggered 2 new adaptations)

| Adaptation | Confidence | Trigger |
|-----------|----------:|--------|
| enable_simulation_before_execution | 0.833 | Persistent DEVELOPER failures |
| split_large_tasks | 0.764 | High failure rate + sufficient sample |
| increase_max_retries | 0.550 | DEVELOPER failure pattern |

**`split_large_tasks` now fires** (previously 0.167 confidence in Campaign 2, below threshold). With 14 failures and 35 total episodes, vol = min(1, 14/24) = 0.583; signal crosses MIN_CONF=0.25 threshold.

**Recommendation coverage:** All 5 pipeline stages receive 2 recommendations (global adaptations).

**`recordApplication` verified:** appliedCount 0→1, successCount 0→1 after single application record.

**`newThisCycle:3` on every cycle:** Adaptation engine idempotently regenerates all adaptations each cycle — this is expected behavior, not a counter drift issue.

---

## Workload 5 — Evaluation

| Operation | Latency | Result |
|-----------|------:|--------|
| generateSystemEvaluation | 547ms | overallScore: 5.80 |
| getLatestEvaluation | 9ms | Returns just-generated eval (ID match confirmed) |
| createPlanRecord (×5) | 0.4ms avg | 5 plan records created |
| recordPlanOutcome (×5) | 3.2ms avg | Outcomes written to registry |
| getSummary (post-load) | 1ms | 18 total plans |
| generatePlanningInsights | 3ms | 3 insights |

**System evaluation score improved: 5.32 → 5.80** with shadow corpus.

| Dimension | Before | After |
|-----------|------:|------:|
| planningQuality | 0.757 | 0.560 |
| executionQuality | 0.420 | 0.530 |
| recoveryEffectiveness | 0.426 | 0.412 |
| lessonUsefulness | 0.460 | 0.766 |
| adaptationEffectiveness | 0.630 | 0.836 |

Planning quality dropped (more moderate-complexity failures in shadow corpus). Lesson and adaptation effectiveness improved significantly.

**Planning insights after shadow:**
```
prefer_split_plans     (confidence=0.800)  ← high confidence
limit_files_per_task   (confidence=0.417)
replan_needs_tuning    (confidence=0.200)  ← low confidence
```

---

## Workload 6 — Orchestration

### Simulation mode (5 goals):
```
Avg latency: 0.6ms per decompose+plan call
All returned simulated:true, wouldRun:1
```

### Dynamic agent routing (5 specs, post-DEFECT-7 fix):

| Objective | Category | Tier | Escalated | Reason |
|-----------|----------|------|-----------|--------|
| 2FA TOTP | general | moderate | No | base — no escalation |
| Real-time dashboard | frontend | complex | YES | 33% success → escalated |
| Redis migration | database | complex | No | base critical |
| Health endpoint | api | moderate | YES | 40% success → escalated |
| Agent orchestrator | agent | critical | No | base critical |

**Category routing active:** `frontend` (33% sr) and `api` (40% sr) both triggered escalation. Routing correctly identifies high-risk categories.

**TOTP categorization gap:** "Implement two-factor authentication via TOTP" classified as `general` — TOTP not in the auth keyword regex (`auth|password|jwt|oauth|session|login|logout|token|secret|rbac|permission`). Task correctly assigned `moderate` (via base complexity), but escalation based on auth success rate was skipped.

### Category stats from apex_agent_runs:
```
auth:     null (< 3 records)
database: ss=7,  sr=0.714
api:      ss=5,  sr=0.400 → ESCALATE
ops:      ss=4,  sr=1.000
frontend: ss=3,  sr=0.333 → ESCALATE
agent:    null (< 3 records)
general:  ss=46, sr=0.609
```

### Reputation stats by complexity:
```
simple:   sr=0.857  (7 runs)
moderate: sr=0.529  (17 runs)
complex:  sr=0.611  (18 runs)
critical: sr=0.500  (4 runs)
```

---

## Workload 7 — Throughput (3 Full Pipeline Cycles)

| Cycle | Total | Retrieve | Reflect | Rank | Adapt | Score | Route | PQR |
|-------|------:|--------:|-------:|-----:|------:|------:|------:|----:|
| 0 | 689ms | 13ms | 2ms | 1ms | 407ms | 214ms | 50ms | 2ms |
| 1 | 327ms | 8ms | 0ms | 0ms | 103ms | 163ms | 52ms | 1ms |
| 2 | 316ms | 7ms | 0ms | 0ms | 101ms | 150ms | 57ms | 1ms |
| **Avg** | **444ms** | **9.3ms** | **0.7ms** | **0.3ms** | **203.7ms** | **175.7ms** | **53ms** | **1.3ms** |

**Cold start penalty:** Cycle 0 is 2.1× slower than warm cycles (689ms vs 316ms) — Supabase connection init.  
**Steady-state throughput:** ~2.2 full pipeline cycles/second (316ms each).  
**Network cost dominates:** Adapt + Score + Route = 432ms = 97% of steady-state time.  
**Score determinism:** 4.31 across all 3 cycles (variance=0).

---

## Post-Workload Autonomy Score

```
computeAutonomyScore() → {
  score: 4.31  (up from 4.18 pre-shadow)
  dimensions: {
    executionSuccess: 0.600  ← 21/35 episodes (up from 0.55)
    lowRetryRate:    0.218  ← up from 0.162
    recovery:        0.071  ← DOWN from 0.111 (more unrecovered failures)
    goalCompletion:  0.600  ← down from 0.70 (pending/blocked goals added)
    confidence:      0.670  ← up from 0.565
    episodeRichness: 0.350  ← up from 0.20 (35 episodes)
  }
}
```

Score direction mixed: 4 dimensions improved, 2 declined. Net +0.13 points. Recovery declined because 5 additional shadow failures have no matching success runs.

---

## Failure Summary

| Category | Count | % |
|---------|------:|--:|
| DEFECT-7 reproduced and fixed | 1 | — |
| Tests passed | 7 workloads | 100% |
| Pipeline crashes | 0 | 0% |

---

## Findings

**FINDING-1: DEFECT-7 was a production-impacting crash** in selectAgentConfig for any task classified as `auth` or `agent` category. Fixed. Category-aware routing now works for all categories.

**FINDING-2: Adaptation engine correctly escalated from 1 to 3 active adaptations** under shadow failure load. `split_large_tasks` crossed MIN_CONF threshold with expanded corpus.

**FINDING-3: Pipeline throughput is 316ms steady-state; Supabase is 97% of cost.** Local compute (reflection, lessons, PQR) is negligible at <12ms combined.

**FINDING-4: TOTP categorization gap.** "two-factor authentication via TOTP" classified as `general`, not `auth`. Routing works correctly but misses the auth category success-rate check. Low impact — TOTP tasks routed at base complexity, not escalated.

**FINDING-5: Score is stable at 4.31 across all 3 throughput cycles.** Determinism confirmed under sustained load.
