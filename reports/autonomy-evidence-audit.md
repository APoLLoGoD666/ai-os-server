# Autonomy Evidence Audit
**Date:** 2026-06-06  
**Engineer:** Principal Runtime Audit Engineer  
**Objective:** Determine which autonomy score inputs are derived from real runtime data versus defaults, placeholders, or empty datasets. Measure only. No code changes.

---

## 1. Autonomy Score Formula Map

**Source file:** `agent-system/autonomy-metrics.js`

```
computeAutonomyScore() — called by getFullMetrics()

INPUT SIGNALS → DIMENSION FORMULA → WEIGHT

  getSuccessRate(50)          → executionSuccess = value ?? 0.5                → × 0.30
  retryRate()                 → lowRetryRate     = r !== null ? max(0,1-r×2) : 0.5  → × 0.15
  recoveryRate()              → recovery         = value ?? 0.5                → × 0.20
  goalStats().completionRate  → goalCompletion   = value ?? 0.5                → × 0.20
  composite(sr,epVol,goalScr) → confidence       = sr×0.5 + epVol×0.2 + gs×0.3 → × 0.10
  episodeCount()/100          → episodeRichness  = min(1.0, count/100)          → × 0.05

RAW = Σ(dimension × weight)
SCORE = RAW × 10   [reported as 0–10]
```

**Confidence sub-formula:**
```
sr       = getSuccessRate(50) ?? 0.5   (same as executionSuccess input)
epVol    = min(1.0, episodeCount()/100)
goalScr  = goalStats().completionRate ?? 0.5

confidence = sr×0.5 + epVol×0.2 + goalScr×0.3
```

**Current calculation with live values:**
```
executionSuccess = 0.5   (default — 0 episodes)
lowRetryRate     = 0.5   (default — null retryRate)
recovery         = 0.5   (default — null recoveryRate)
goalCompletion   = 1.0   (REAL — 1/1 goals completed)
confidence       = 0.5×0.5 + 0×0.2 + 1.0×0.3 = 0.25 + 0 + 0.30 = 0.55
episodeRichness  = min(1.0, 0/100) = 0.0   (REAL — zero episodes confirmed)

RAW = 0.5×0.30 + 0.5×0.15 + 0.5×0.20 + 1.0×0.20 + 0.55×0.10 + 0.0×0.05
    = 0.150 + 0.075 + 0.100 + 0.200 + 0.055 + 0.000
    = 0.580

Measured score = 5.80 / 10
```

---

## 2. Telemetry Lineage Graph

```
TELEMETRY PRODUCERS → STORAGE → CONSUMER → DIMENSION

runAgentTeam()
  └─ setImmediate: _episodic.storeEpisode(spec, success, agentLogs)
       └─ VAULT/12 Memory/Episodes/ep-{id}.json       [0 episodes]
            ├─→ episodic-memory.getSuccessRate(50)    → executionSuccess
            ├─→ episodic-memory.getSuccessRate(50)    → confidence.sr
            ├─→ episodic-memory.episodeCount()        → episodeRichness
            ├─→ episodic-memory.episodeCount()        → confidence.epVol
            └─→ episodic-memory.getFailureEpisodes()  → recoveryRate (partial input)

runAgentTeam()
  └─ Supabase upsert: apex_agent_runs row per run    [0 rows]
       ├─→ autonomy-metrics.retryRate()              → lowRetryRate
       └─→ autonomy-metrics.retryRate() fallback     (via episodic if Supabase null)

runAgentTeam()
  └─ Supabase upsert: apex_agent_stages rows         [0 rows]
       ├─→ adaptation-engine Pass 1 (stage failures) [blocked — MIN_SAMPLES=8]
       └─→ agent-reputation shouldPreEscalate()      [blocked — no data]

assignWork() / explicit addGoal() + completeGoal()
  └─ VAULT/System/Goals/goal-{id}.json               [1 goal — smoke test]
       ├─→ goal-tracker.getStats().completionRate    → goalCompletion = 1.0 [REAL]
       └─→ goal-tracker.getStats().completionRate    → confidence.goalScore = 1.0 [REAL]

adaptation-engine.runCycle()
  └─ VAULT/System/Adaptations/adaptation-registry.json [exists, 0 adaptations]
       └─→ all downstream consumers receive empty snapshot

multi-agent-coordinator.assignWork()
  └─ planning-quality-registry.recordPlanOutcome()
       └─ VAULT/System/PlanQuality/plan-quality-registry.json [MISSING — dir not created]
            └─→ formatQualityContext() → ARCHITECT context injection [returns '']

orchestrator._reflector()
  └─ obsidian-memory.logLesson() → VAULT/01 Executive/Lessons.md [untracked by metrics]
       └─ NOT consumed by any autonomy dimension directly
          (would feed scoreLessonText → self-evaluator.lessonUsefulness if episodes existed)
```

---

## 3. Evidence vs Default Breakdown — Per Dimension

### executionSuccess (weight: 0.30)

| Field | Value |
|-------|-------|
| Formula | `getSuccessRate(50) ?? 0.5` |
| Data source | `episodic-memory.getSuccessRate(n)` |
| Storage | `VAULT/12 Memory/Episodes/ep-*.json` |
| Runtime producer | `orchestrator.runAgentTeam()` → setImmediate → `_episodic.storeEpisode()` |
| Dataset size | **0 episodes** |
| Current value | **0.5 (default)** |
| Default behavior | `getSuccessRate` returns `null` when episodes=0; null-coalescing applies 0.5 |
| **Classification** | **DEFAULT-DERIVED** |
| Synthetic conditions | Any time episodeCount < 1 |

---

### lowRetryRate (weight: 0.15)

| Field | Value |
|-------|-------|
| Formula | `retryR !== null ? Math.max(0, 1 - retryR × 2) : 0.5` |
| Primary source | `autonomy-metrics.retryRate()` → Supabase `apex_agent_runs` |
| Fallback source | `episodic-memory.getRetryRate()` (when Supabase unavailable) |
| Runtime producer | `runAgentTeam()` → Supabase upsert after each run |
| Supabase dataset size | **0 rows** in `apex_agent_runs` |
| Episodic fallback size | **0 episodes** |
| Current value | **0.5 (default)** |
| Default behavior | Both Supabase query and episodic fallback return null → 0.5 applied |
| **Classification** | **DEFAULT-DERIVED** |
| Synthetic conditions | Both `apex_agent_runs` empty AND episodeCount=0 |

---

### recovery (weight: 0.20)

| Field | Value |
|-------|-------|
| Formula | `recoveryR ?? 0.5` |
| Source function | `autonomy-metrics.recoveryRate()` |
| Input 1 | `episodic-memory.getFailureEpisodes()` — requires failure episodes |
| Input 2 | Supabase `apex_agent_runs` recovery records |
| Runtime producer | `runAgentTeam()` failure path → setImmediate → `_episodic.storeEpisode(spec, false, ...)` |
| Episodic failures | **0 failure episodes** (0 total) |
| Supabase data | **0 rows** |
| Current value | **0.5 (default)** |
| Default behavior | No failures to measure → recoveryRate returns null → 0.5 applied |
| **Classification** | **DEFAULT-DERIVED — double-gated** |
| Synthetic conditions | No pipeline failures recorded AND no Supabase data |
| Risk note | Even after first pipeline run, recovery stays null until at least one failure+retry occurs |

---

### goalCompletion (weight: 0.20)

| Field | Value |
|-------|-------|
| Formula | `goalStats.completionRate ?? 0.5` |
| Source function | `goal-tracker.getStats().completionRate` |
| Storage | `VAULT/System/Goals/goal-{id}.json` |
| Runtime producer | `addGoal()` + `completeGoal()` or `blockGoal()` |
| Dataset size | **1 goal (completed)** |
| Completion rate | `1 / 1 = 1.0` |
| Current value | **1.0 (REAL)** |
| **Classification** | **EVIDENCE-BACKED** |
| Caveat | Single smoke-test goal with no failure signal. 1/1 = 100% completion is maximally optimistic from one data point. |
| Risk | High completionRate from 1 sample creates positive bias — first failure drops rate to 0.5 (1/2) |

---

### confidence (weight: 0.10)

| Field | Value |
|-------|-------|
| Formula | `sr×0.5 + epVol×0.2 + goalScore×0.3` |
| Component: sr | `getSuccessRate(50) ?? 0.5` → currently **0.5 (default)** |
| Component: epVol | `min(1.0, episodeCount()/100)` → currently **0.0 (real)** |
| Component: goalScore | `goalStats().completionRate ?? 0.5` → currently **1.0 (real)** |
| Current value | `0.5×0.5 + 0.0×0.2 + 1.0×0.3 = 0.25 + 0 + 0.30 = **0.55**` |
| **Classification** | **PARTIALLY EVIDENCE-BACKED** |
| Real components | goalScore (30% of formula) = 1.0 — from smoke-test goal |
| Synthetic components | sr (50% of formula) = 0.5 default; epVol (20% of formula) = 0.0 real-but-zero |
| Effective real contribution | 30% of formula weight is evidence-backed |
| Note | epVol=0.0 is accurate — zero episodes is the true state — but contributes 0 signal |

---

### episodeRichness (weight: 0.05)

| Field | Value |
|-------|-------|
| Formula | `Math.min(1.0, episodeCount() / 100)` |
| Source | `episodic-memory.episodeCount()` = `fs.readdirSync(EPISODES_DIR).filter(f => f.startsWith('ep-')).length` |
| Storage | `VAULT/12 Memory/Episodes/` |
| Dataset size | **0 episodes** |
| Current value | **0.0 (real — accurately zero)** |
| **Classification** | **EVIDENCE-BACKED AT ZERO** |
| Note | This is the only dimension that is both 100% evidence-backed AND accurately reporting the cold-start state |

---

## 4. Synthetic Score Inventory

| Dimension | Weight | Current | True value | Contribution (current) | Contribution (true) | Synthetic inflation |
|-----------|--------|---------|------------|------------------------|---------------------|---------------------|
| executionSuccess | 0.30 | **0.5 (default)** | 0 (no data) | 0.150 | 0.000 | **+0.150** |
| lowRetryRate | 0.15 | **0.5 (default)** | 0 (no data) | 0.075 | 0.000 | **+0.075** |
| recovery | 0.20 | **0.5 (default)** | 0 (no data) | 0.100 | 0.000 | **+0.100** |
| goalCompletion | 0.20 | 1.0 (real) | 1.0 | 0.200 | 0.200 | 0 |
| confidence | 0.10 | 0.55 (partial) | 0.30 (goalScore only) | 0.055 | 0.030 | **+0.025** |
| episodeRichness | 0.05 | 0.0 (real) | 0.0 | 0.000 | 0.000 | 0 |
| **TOTAL** | **1.00** | | | **0.580** | **0.230** | **+0.350** |

**Measured score:** 5.80 / 10  
**True score (all defaults replaced with real values):** 2.30 / 10  
**Score inflation:** +3.50 points (60.3% of reported score is synthetic)

### Synthetic score decomposition
- `executionSuccess` contributes 1.50 points of synthetic score (26% of total reported score)
- `recovery` contributes 1.00 point of synthetic score (17%)
- `lowRetryRate` contributes 0.75 points of synthetic score (13%)
- `confidence.sr` contributes 0.25 points of synthetic score (4%)

---

## 5. Blocked Learning Loops

### Loop 1 — Adaptation Engine
**Chain:** `runAgentTeam()` completes → `_adaptEngine.learn()` → `runCycle()` → analysis passes → adaptations stored → ARCHITECT context injection

**Blocked at:** `runCycle()` → all 3 analysis passes

| Pass | Blocking condition | Current state |
|------|--------------------|---------------|
| Pass 1 — Stage failures | `apex_agent_stages` needs ≥8 rows per stage | 0 rows |
| Pass 2 — Episodic patterns | `episodeCount >= MIN_SAMPLES (8)` | 0 episodes |
| Pass 3 — Category routing | `getCategoryStats()` needs sampleSize ≥ 8 | 0 rows |

**Effect:** ARCHITECT receives no routing intelligence. Dynamic agent selection runs on defaults. Model escalation decisions unmeasured.

**Unblocks at:** 8 completed `runAgentTeam()` calls.

---

### Loop 2 — Planning Quality Registry
**Chain:** `assignWork({simulate:false})` → `createPlanRecord()` → `runParallel()` → `recordPlanOutcome()` → `getPlanQuality()` → `formatQualityContext()` → ARCHITECT context injection

**Blocked at:** No real `assignWork()` calls — directory missing, 0 records.

**Effect:** ARCHITECT plans without historical success rate feedback. No complexity-routing intelligence. `formatQualityContext()` returns `''` on every call.

**Unblocks at:** First real `POST /api/autonomy/assign` with `simulate: false`.  
**First insight generation at:** MIN_SAMPLES = 3 records.

---

### Loop 3 — Self-Evaluator Cognitive Measurement
**Chain:** Episodes + adaptations + lessons → self-evaluator dimensions → `GET /api/cognition/self-evaluation`

**Blocked at:** 4 of 5 dimensions dependent on empty datasets.

| Dimension | Blocking source | Current value |
|-----------|----------------|---------------|
| executionQuality | `successRate ?? 0.5` | 0.5 (default) |
| recoveryEffectiveness | `recoveryRate ?? 0.5` | 0.5 (default) |
| lessonUsefulness | `episodeCount/50` + `adaptSnapshot.avgConf` | ~0.5 (default) |
| adaptationEffectiveness | `adaptSnapshot.totalCount === 0` guard | 0.5 (static default) |
| planningQuality | `goalStats.completionRate` (partially real) | >0.5 (partial signal) |

**Effect:** Self-evaluation scores are synthetically centered at 0.5 regardless of actual behavior.

---

### Loop 4 — Improvement Roadmap
**Chain:** Sunday 05:00 UTC → `generateRoadmap()` → `_snapshot()` → template trigger gates → proposals written

**Blocked at:** All 10 templates gate on `episodeCount`. Lowest gate: `episodeCount >= 5`.

| Template | Gate | Fires at 0 episodes? |
|----------|------|----------------------|
| lesson-consolidation-cron | `episodeCount > 20` | NO |
| adaptation-routing-wire | `activeAdaptations > 0` | NO |
| reflection-lesson-wire | `episodeCount >= 10` | NO |
| episode-cross-reference | `episodeCount >= 5` | NO |
| episode-cap-increase | `episodeCount > 150` | NO |
| lesson-deduplication | `episodeCount > 15` | NO |
| confidence-estimator | `episodeCount >= 15` | NO |
| self-evaluator-endpoint | `episodeCount >= 10` | NO |
| semantic-retrieval-pgvector | `episodeCount >= 30` | NO |
| planning-quality-registry | `episodeCount >= 25` | NO |

**Effect:** First Sunday roadmap produces 0 proposals — empty document. No improvement work is scheduled.

**Unblocks at:** 5 episodes (episode-cross-reference), 10 episodes (3 templates), 15–30 episodes (remaining templates).

---

### Loop 5 — Episode–Lesson Cross-Reference
**Chain:** `runAgentTeam()` → `_reflector()` → `obsidian-memory.logLesson()` → (proposed) `_episodic.updateEpisode(id, {lessonText})` → episode enrichment → semantic retrieval quality

**Blocked at:** Requires episodes to exist before lesson linking. `updateEpisode()` function does not exist in episodic-memory.js (identified as Opportunity 4 in activation-readiness.md — unimplemented template).

**Effect:** Even after episodes begin accumulating, lessons are not cross-referenced into episode records. Semantic retrieval cannot surface "similar task → this lesson."

---

### Loop 6 — Recovery Signal
**Chain:** `runAgentTeam()` failure → `storeEpisode(spec, false, ...)` → `getFailureEpisodes()` → `recoveryRate()` → `recovery` dimension

**Blocked at:** Double-gated. Requires (a) at least one failure episode AND (b) that failure to be successfully recovered. The `recovery` dimension reports 0.5 default until the system both fails AND recovers, which by definition requires at least two pipeline runs with one failure.

**Effect:** `recovery` dimension (weight 0.20) will report 0.5 default indefinitely in early operation, even when the system is performing perfectly (never failing). Perfect performance = same score as zero performance on this dimension.

---

## 6. Inflation / Deflation Risks

### Inflation Risks (score reports higher than actual capability)

| Risk | Magnitude | Mechanism |
|------|-----------|-----------|
| **Default 0.5 centering** | **+3.50 points** | Three null-coalescing defaults inflate executionSuccess, lowRetryRate, recovery |
| **Single-sample goalCompletion** | Low-medium | 1/1 = 100% — first failure halves this to 0.5 |
| **Confidence.sr default** | +0.025 points | sr=0.5 default inflates confidence |
| **Smoke-test goal counting** | Low | The 1 completed goal has no real-world pipeline execution behind it |

**Total identified inflation: +3.50 points**

### Deflation Risks (score reports lower than actual capability)

| Risk | Magnitude | Mechanism |
|------|-----------|-----------|
| **episodeRichness penalizes cold start** | -0 points today, -0.05 asymptotic | Weight is only 0.05; not a meaningful penalty |
| **recovery double-gate** | Structural | A system that never fails will always have null recoveryRate → 0.5 default. Perfect reliability does NOT increase recovery score above 0.5 until a failure+recovery cycle is observed. This is a structural measurement gap, not inflation. |
| **confidence.epVol=0** | -0.020 points vs base | epVol=0 accurately penalizes cold start but only carries 2% weight |

---

## 7. Top 10 Telemetry Gaps

| Rank | Gap | Affected dimensions | Severity | Unblocks at |
|------|-----|---------------------|----------|-------------|
| 1 | **Zero pipeline runs** — all episodic signals blocked | executionSuccess, lowRetryRate (fallback), episodeRichness, confidence.sr, confidence.epVol | CRITICAL | First `runAgentTeam()` call |
| 2 | **`apex_agent_runs` empty** — primary retryRate source | lowRetryRate | HIGH | First completed pipeline run |
| 3 | **`apex_agent_stages` empty** — adaptation engine Pass 1 blocked | No direct dimension — blocks adaptation loop | HIGH | 8 pipeline runs |
| 4 | **Recovery dimension unmeasurable pre-failure** — needs failure+recovery | recovery (weight 0.20 = largest defaulted dimension) | HIGH | First pipeline failure + recovery |
| 5 | **Adaptation engine cold** — no routing corrections reaching ARCHITECT | Indirect: blocks future executionSuccess improvement | HIGH | 8 pipeline runs |
| 6 | **Planning quality registry missing** — no ARCHITECT context enrichment | Indirect: blocks plan quality learning | MEDIUM | First real `assignWork()` call |
| 7 | **Self-evaluator 4/5 dimensions synthetic** — executionQuality, recoveryEffectiveness, lessonUsefulness, adaptationEffectiveness | Separate self-evaluation system | MEDIUM | 8 pipeline runs |
| 8 | **Confidence dimension: sr component synthetic** — 50% of confidence formula is default 0.5 | confidence (weight 0.10) | MEDIUM | First pipeline run |
| 9 | **Improvement roadmap blocked** — all 10 templates gated on episodeCount | No direct dimension — blocks proposal generation | MEDIUM | 5 pipeline runs (lowest gate) |
| 10 | **Episode–lesson cross-reference absent** — lessons not written back to episodes | Indirect: blocks semantic lesson retrieval quality | LOW | `updateEpisode()` implementation + episodes |

---

## 8. Autonomy Maturity Assessment

### Score Comparison

| Metric | Value |
|--------|-------|
| **Measured autonomy score** | **5.80 / 10** |
| **True autonomy score** (defaults → 0) | **2.30 / 10** |
| **Score inflation** | **+3.50 points (60.3%)** |
| **Evidence-backed score fraction** | 39.7% of reported score has real data behind it |

### Dimension-Level Maturity

| Dimension | Maturity | Evidence quality |
|-----------|----------|-----------------|
| executionSuccess | DEFAULT-DERIVED | 0 data points |
| lowRetryRate | DEFAULT-DERIVED | 0 data points |
| recovery | DEFAULT-DERIVED | 0 data points — structurally unmeasurable until first failure |
| goalCompletion | EVIDENCE-BACKED | 1 data point (smoke test) — low statistical confidence |
| confidence | PARTIALLY EVIDENCE-BACKED | 30% of formula real (goalScore); 70% default/zero |
| episodeRichness | EVIDENCE-BACKED AT ZERO | 0 data points — accurately reporting cold-start state |

### Maturity Classification

| Axis | Score | Basis |
|------|-------|-------|
| **True autonomy maturity** | **2.3 / 10** | Only real signals: goalCompletion=1.0 (1 smoke test), episodeRichness=0 (accurate) |
| **Measured autonomy maturity** | **5.8 / 10** | Reported score including defaults |
| **Score inflation** | **3.5 points** | 3 null-coalescing defaults × their weights |
| **Estimated score (all defaults removed, no data = 0)** | **2.3 / 10** | goalCompletion×0.20 + confidence.goalScore×0.03 only |

### Score Trajectory

| State | Episodes | Score |
|-------|----------|-------|
| Current (0 runs) | 0 | **5.80** (inflated) |
| After 1 successful run | 1 | ~6.05 (executionSuccess becomes real, epVol > 0) |
| After 1 failure + recovery | 1–2 | recovery dimension becomes real |
| After 3 real plan outcomes | varies | planning quality insights unlocked |
| After 8 runs (MIN_SAMPLES) | 8 | adaptation engine unlocks |
| After 8 runs, sr ~ 0.75 | 8 | ~7.20 (all defaults resolved, real signals driving) |
| True 10/10 score | 50+ | All dimensions saturated with real data |

### Critical Finding

The system's measured score of 5.80 is **structurally normal for a cold-start state** — the defaults are intentional, not bugs. The 0.5 centering prevents score collapse to near-zero while awaiting data. However:

1. The measured score is **not comparable** to a score produced by a system with 50+ pipeline runs. The two 5.80s measure completely different things.
2. The `recovery` dimension (weight 0.20 — the second-largest weight) **cannot move above 0.5 default without a pipeline failure**. A perfectly reliable system and a completely broken system report identical recovery scores until the first failure occurs.
3. **goalCompletion** (the only real positive signal at 1.0) is from one smoke-test goal. It will regress toward the mean as more goals are tracked, and the first failure drops it to 0.5 (1/2). The current 1.0 overstates goal-completion quality.

---

## Appendix — Module Coverage

| Module | Read | Relationship to autonomy score |
|--------|------|-------------------------------|
| `agent-system/autonomy-metrics.js` | YES | Primary score calculator |
| `agent-system/self-evaluator.js` | YES | Parallel 5-dimension evaluator (not part of 6D score) |
| `agent-system/episodic-memory.js` | YES | Source for executionSuccess, confidence.sr, episodeRichness |
| `agent-system/goal-tracker.js` | YES | Source for goalCompletion, confidence.goalScore |
| `agent-system/adaptation-engine.js` | YES | Upstream of routing corrections; not a direct dimension input |
| `agent-system/planning-quality-registry.js` | YES | Feeds ARCHITECT context; not a direct dimension input |
| `agent-system/improvement-executor.js` | YES | Reads autonomy score; does not contribute to it |
| `agent-system/reflection-engine.js` | YES (prior session) | Feeds lesson quality; not a direct dimension input |

---

*No code was modified during this audit. All findings are observational.*
