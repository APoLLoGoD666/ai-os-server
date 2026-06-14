# Runtime Evidence Generation Audit
**Date:** 2026-06-06  
**Engineer:** Principal Runtime Audit Engineer  
**Objective:** Determine the minimum sequence of real pipeline executions required to convert every autonomy score dimension from default-derived to evidence-backed. Measure only. No code changes.

---

## 1. Telemetry Dependency Graph

```
TRIGGERING EVENT → STORAGE WRITE → CONSUMER → SCORE DIMENSION / SUBSYSTEM

┌─────────────────────────────────────────────────────────────────────────────┐
│  runAgentTeam() completes (success OR failure)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  orchestrator.js ~line 786                                                   │
│    └─ apex_agent_runs.upsert({task_id, objective, success, ...})             │
│         ├─→ autonomy-metrics.retryRate()   → lowRetryRate dimension          │
│         ├─→ autonomy-metrics.recoveryRate() (success check after failure)    │
│         └─→ dynamic-agent-selector.getCategoryStats() → adaptation Pass 3   │
│                                                                              │
│  setImmediate: _episodic.storeEpisode(spec, success, agentLogs)              │
│    └─ VAULT/12 Memory/Episodes/ep-{id}.json                                  │
│         ├─→ episodic-memory.getSuccessRate(50)  → executionSuccess           │
│         ├─→ episodic-memory.getSuccessRate(20)  → confidence.sr              │
│         ├─→ episodic-memory.episodeCount()      → episodeRichness            │
│         ├─→ episodic-memory.episodeCount()      → confidence.epVol (/50)     │
│         └─→ episodic-memory.getFailureEpisodes() → recoveryRate (gating)     │
│                                                                              │
│  setImmediate: _adaptEngine.learn(spec, {success, ...})                      │
│    └─ adaptation-engine: _cyclesSinceRun++                                   │
│         └─ if failure OR _cyclesSinceRun ≥ 5: runCycle()                    │
│              ├─ Pass 1: apex_agent_stages ≥8/stage → routing recommendations │
│              ├─ Pass 2: episodeCount() ≥8 → pattern recommendations          │
│              └─ Pass 3: getCategoryStats() ≥8/category → tier recommendations│
│                    → adaptation-registry.json (VAULT/System/Adaptations/)    │
│                         └─→ ARCHITECT context injection (next pipeline run)  │
│                                                                              │
│  setImmediate: _reflector(spec, agentLogs, success)                         │
│    └─ obsidian-memory.logLesson(lesson) → VAULT/01 Executive/Lessons.md     │
│         └─→ context for future ARCHITECT prompts (not a score dimension)     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  assignWork({simulate:false}) — multi-agent-coordinator.js                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  coordinator.js:185  createPlanRecord(plan)                                  │
│  coordinator.js:195  setImmediate: recordPlanOutcome({...})                  │
│    └─ VAULT/System/PlanQuality/plan-quality-registry.json                    │
│         └─ After MIN_SAMPLES=3 records:                                      │
│              └─→ formatQualityContext() → ARCHITECT context injection         │
│              └─→ generatePlanningInsights() → adaptation engine bridge        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  addGoal() / completeGoal() — any route that calls goal-tracker              │
├─────────────────────────────────────────────────────────────────────────────┤
│    └─ VAULT/System/Goals/goal-{id}.json                                      │
│         └─→ goal-tracker.getStats().completionRate → goalCompletion dimension │
│         └─→ confidence.goalScore (same source)                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Sunday 05:00 UTC cron — improvement-executor._scheduleEvolutionCycle       │
├─────────────────────────────────────────────────────────────────────────────┤
│    └─ generateRoadmap() → reads all upstream data sources                    │
│         └─ All 10 templates gate on episodeCount (lowest gate: ≥5)           │
│              └─→ VAULT/System/Improvements/proposals.json + roadmap-*.md     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Threshold Map

### Autonomy Score — Per-Dimension Thresholds

| Dimension | Weight | Source function | Null-coalescing default | Threshold to become non-null | Minimum triggering event |
|-----------|--------|-----------------|------------------------|------------------------------|--------------------------|
| executionSuccess | 0.30 | `getSuccessRate(50)` | `?? 0.5` | episodeCount ≥ 1 | 1st runAgentTeam() completion |
| lowRetryRate | 0.15 | `retryRate(50)` | `: 0.5` | apex_agent_runs ≥ 1 row (primary) OR episodeCount ≥ 1 (fallback) | 1st runAgentTeam() completion |
| recovery | 0.20 | `recoveryRate(30)` | `?? 0.5` | getFailureEpisodes().length ≥ 1 AND Supabase available | 1st FAILED runAgentTeam() |
| goalCompletion | 0.20 | `goalStats().completionRate` | `?? 0.5` | goalStats.total > 0 | **ALREADY MET** (1 smoke-test goal) |
| confidence | 0.10 | `executionConfidence()` | none (internal defaults) | getSuccessRate(20) ≥ 1 episode | 1st runAgentTeam() completion |
| episodeRichness | 0.05 | `min(1, episodeCount()/100)` | none (formula bottoms at 0) | always evidence-backed | **ALREADY MET** (accurately 0.0) |

### Confidence Sub-Component Thresholds

| Sub-component | Weight in confidence | Default behavior | Threshold | Current value |
|---------------|---------------------|-----------------|-----------|---------------|
| sr (success rate) | × 0.5 | `?? 0.5` (null-coalesced) | episodeCount ≥ 1 | **0.5 (default)** |
| epVol (episode volume) | × 0.2 | 0.0 (formula, no default) | always real | **0.0 (real)** |
| goalScore | × 0.3 | `?? 0.5` (null-coalesced) | goalStats.total > 0 | **1.0 (real)** |

### Adaptation Engine Thresholds

| Pass | Data source | Threshold | Blocking condition | Minimum runs |
|------|-------------|-----------|-------------------|--------------|
| Pass 1 — Stage failures | `apex_agent_stages` via agent-reputation.js | ≥ MIN_SAMPLES (8) rows per stage | apex_agent_stages empty | 8 runs |
| Pass 2 — Episodic patterns | `episodic-memory.episodeCount()` | `episodeCount < MIN_SAMPLES (8)` → returns empty immediately | episodeCount < 8 | 8 episodes |
| Pass 3 — Category routing | `dynamic-agent-selector.getCategoryStats()` | sampleSize < MIN_SAMPLES (8) per category | apex_agent_runs < 8 per category | 8 runs in same category |

**runCycle() trigger conditions:**
- Any failure: `!pipelineResult?.success` → immediate runCycle (counter reset)
- Interval: `_cyclesSinceRun >= CYCLE_INTERVAL (5)` → runCycle after every 5 learn() calls

### Planning Quality Registry Thresholds

| Function | MIN_SAMPLES | Condition | Minimum runs |
|----------|-------------|-----------|--------------|
| `formatQualityContext()` | 3 | getPlanQuality({minSamples:3}).insufficient | 3 real assignWork() calls |
| `generatePlanningInsights()` | 3 | `n < MIN_SAMPLES` | 3 real assignWork() calls |
| `getBestPatterns()` / `getWorstPatterns()` | 3 | `records.length < minSamples` | 3 real assignWork() calls |

*Note: assignWork() calls only from `POST /api/autonomy/assign` (simulate:false) or internal coordinator use. Not the same as simple chat pipeline runs.*

### Improvement Executor Template Gates

| Template | triggerCondition | First fires at |
|----------|-----------------|----------------|
| episode-cross-reference | `episodeCount >= 5` | **5 pipeline runs** |
| reflection-lesson-wire | `episodeCount >= 10` | 10 pipeline runs |
| self-evaluator-endpoint | `episodeCount >= 10` | 10 pipeline runs |
| lesson-deduplication | `episodeCount > 15` | 16 pipeline runs |
| confidence-estimator | `episodeCount >= 15` | 15 pipeline runs |
| lesson-consolidation-cron | `episodeCount > 20` | 21 pipeline runs |
| adaptation-routing-wire | `activeAdaptations > 0` | 8–10 pipeline runs + adaptation cycle |
| semantic-retrieval-pgvector | `episodeCount >= 30 && embedded > 20` | 30+ runs |
| planning-quality-registry | `episodeCount >= 25` | 25 pipeline runs |
| episode-cap-increase | `episodeCount > 150` | 151 pipeline runs |

---

## 3. Blocked Learning Loops

### Loop A — Autonomy Score: `recovery` dimension (HIGHEST VALUE UNBLOCK)

| Property | Value |
|----------|-------|
| Blocked signal | `recoveryRate()` returns null → `recovery = 0.5 (default)` |
| Weight | 0.20 (second-largest dimension) |
| Blocking condition | `getFailureEpisodes(30).length === 0` → immediate null return at line 54 |
| Secondary requirement | Supabase available (`_getSb()` non-null) |
| Tertiary requirement | A successful run with matching objective must exist AFTER the failure |
| **Unblock event** | **1st failed runAgentTeam() call** |
| **Unblock cost** | 1 pipeline failure |
| Progress | 0 failure episodes / threshold: 1 |
| Note | After 1 failure with no matching recovery: recoveryRate=0.0 (real, not synthetic). Recovery score = 0.0 × 0.20 = 0.000 contribution |

---

### Loop B — Adaptation Engine: All 3 passes blocked

| Property | Value |
|----------|-------|
| Blocked signals | routing recommendations, model-tier escalations, category insights |
| Blocking condition | episodeCount < MIN_SAMPLES (8) for Pass 2; apex_agent_stages < 8/stage for Pass 1; apex_agent_runs < 8/category for Pass 3 |
| runCycle triggers | Any failure (immediate) or every 5 completions |
| **Unblock event** | Pass 2: episodeCount reaches 8 AND runCycle fires |
| **Earliest unblock** | Run 8 fails → immediate runCycle with episodeCount=8 → **Pass 2 active** |
| **All-success unblock** | Run 10 → 5th interval runCycle with episodeCount=10 → **Pass 2 active** |
| Progress | 0 episodes / threshold: 8 |
| Downstream unlock | ARCHITECT context gets routing intelligence; improvement proposals for routing categories become possible |

---

### Loop C — Planning Quality Registry: ARCHITECT context injection blocked

| Property | Value |
|----------|-------|
| Blocked signal | `formatQualityContext()` returns `''` (empty string) — ARCHITECT never sees plan history |
| Blocking condition | `getPlanQuality({minSamples:3}).insufficient === true` |
| **Unblock event** | 3rd `assignWork({simulate:false})` call completes |
| **Trigger path** | `POST /api/autonomy/assign` (not simple chat) |
| Progress | 0 plan records / threshold: 3 |

---

### Loop D — Self-Evaluator: 4 of 5 dimensions synthetic

| Dimension | Blocking condition | Unblock event |
|-----------|-------------------|---------------|
| executionQuality | `successRate ?? 0.5` | 1 pipeline run |
| recoveryEffectiveness | `recoveryRate ?? 0.5` | 1 failed run |
| lessonUsefulness | `episodeCount/50` richness bottomed at 0 | 1 pipeline run |
| adaptationEffectiveness | `adaptSnapshot.totalCount === 0` → static 0.5 | 8–10 pipeline runs (adaptation cycle) |
| planningQuality | Partially real via goalStats | Already partially real |

---

### Loop E — Improvement Roadmap: All 10 templates blocked

| Property | Value |
|----------|-------|
| Blocked output | 0 proposals from `generateRoadmap()` |
| Lowest blocking condition | `episodeCount < 5` (episode-cross-reference template) |
| **Unblock event** | 5th completed pipeline run before next Sunday 05:00 UTC |
| Calendar dependency | Next fire is Sunday 05:00 UTC — can have 5+ runs before then |
| Progress | 0 episodes / lowest threshold: 5 |

---

## 4. First Learning Milestone

**Definition:** Episodic memory accumulates first record; reflection lesson generated; score dimensions begin transitioning from synthetic.

**Trigger:** 1st `runAgentTeam()` call completes (any outcome)

**What happens on run 1:**

| Signal | Before | After |
|--------|--------|-------|
| Episode count | 0 | 1 |
| apex_agent_runs rows | 0 | 1 |
| executionSuccess | 0.5 (synthetic) | 0.0 or 1.0 (REAL) |
| lowRetryRate | 0.5 (synthetic) | 0.0 or 1.0 (REAL) |
| confidence.sr | 0.5 (synthetic) | 0.0 or 1.0 (REAL) |
| confidence.epVol | 0.0 (real) | 0.02 (real, non-zero) |
| episodeRichness | 0.0 (real) | 0.01 (real, non-zero) |
| Lessons.md entries | 0 | 1 |
| adaptation learn() calls | 0 | 1 |
| runCycle() fired | 0× | 0× (counter=1, failure triggers 1 early cycle) |

**Score after run 1 (if success):**
```
executionSuccess = 1.0 (real) × 0.30 = 0.300
lowRetryRate     = 1.0 (real) × 0.15 = 0.150
recovery         = 0.5 (default) × 0.20 = 0.100  ← still synthetic
goalCompletion   = 1.0 (real) × 0.20 = 0.200
confidence       = 0.804 (real) × 0.10 = 0.080
episodeRichness  = 0.01 (real) × 0.05 = 0.001
RAW = 0.831 → Score = 8.31
Inflation = 0.100/0.831 = 12.0%
```

**Score after run 1 (if failure):**
```
executionSuccess = 0.0 (real) × 0.30 = 0.000
lowRetryRate     = 0.0 (real) × 0.15 = 0.000
recovery         = 0.0 (real) × 0.20 = 0.000  ← real (0 recoveries from 1 failure)
goalCompletion   = 1.0 (real) × 0.20 = 0.200
confidence       = 0.302 (real) × 0.10 = 0.030
episodeRichness  = 0.01 (real) × 0.05 = 0.001
RAW = 0.231 → Score = 2.31
Inflation = 0%  ← ALL DIMENSIONS REAL
```

**First learning milestone: 1 pipeline run.**

---

## 5. First Adaptation Milestone

**Definition:** adaptation-engine.runCycle() produces at least 1 non-empty recommendation.

**Binding condition:** Pass 2 (`_analyzeEpisodicPatterns`) requires `episodeCount >= MIN_SAMPLES (8)`.

**runCycle() trigger paths and timing:**

| Scenario | Runs | When runCycle fires | Episodes at fire | Pass 2 active? |
|----------|------|---------------------|-----------------|----------------|
| Run 1–5 succeed, run 5 fires cycle interval | 5 | After run 5 | 5 | NO (5 < 8) |
| Runs 1–7 succeed, run 8 fails | 8 | Immediately at run 8 (failure) | 8 | **YES** |
| All 10 runs succeed | 10 | After run 10 (2nd interval) | 10 | **YES** |
| Run 4 fails (early failure), runs 5–9 succeed | 9 | After run 9 (interval from reset at run 4) | 9 | **YES** |

**Earliest possible adaptation: 8 pipeline runs** (when run 8 is a failure, triggering immediate runCycle with episodeCount=8)

**Guaranteed adaptation (all-success path): 10 pipeline runs**

**What the first adaptation cycle produces (Pass 2, episodeCount=8):**
- Scans failure episodes for `failedStage` patterns
- Requires `devFails >= ceil(8/2) = 4` DEVELOPER failures to produce split-task recommendation
- Requires `reviewFails >= 4` REVIEWER failures to produce model-upgrade recommendation
- Requires `failRate >= 0.35 && totalEps >= 16` for global retry recommendation

**Critical finding:** Pass 2 can FIRE at 8 episodes but may produce 0 recommendations if failures are distributed across stages (no single stage hits 4/8 failures). The MINIMUM for a GUARANTEED first recommendation from Pass 2 is 8 episodes with ≥4 failures at the same stage.

**For Pass 1 (stage failures via Supabase):** apex_agent_stages needs ≥8 rows per stage. Each runAgentTeam() call writes multiple stage rows. With 8 runs: ≥64 stage rows (8 stages × 8 runs), all stages should have ≥8 rows after 8 runs.

**First adaptation milestone: 8 pipeline runs** (failure at run 8 optimal; 10 runs guaranteed on all-success path).

---

## 6. First Roadmap Milestone

**Definition:** `generateRoadmap()` produces ≥1 proposal (not empty output).

**Lowest template gate:** `episode-cross-reference` requires `episodeCount >= 5`

**Trigger:** Sunday 05:00 UTC cron fires after ≥5 episodes exist

**Minimum pipeline runs before milestone:** 5

**Calendar constraint:** Roadmap fires weekly. If 5 runs complete before the next Sunday 05:00 UTC, the next Sunday roadmap will produce ≥1 proposal.

**Earliest possible roadmap milestone:** 5 pipeline runs + wait until Sunday 05:00 UTC (max 7 days)

**Templates that become active at each episode milestone:**

| Episodes | Templates unlocked | Proposals possible |
|----------|-------------------|-------------------|
| 5 | episode-cross-reference | 1 |
| 10 | + reflection-lesson-wire, self-evaluator-endpoint | 3 |
| 15 | + confidence-estimator, lesson-deduplication | 5 |
| 20 | (lesson-deduplication: >15 → already at 16) | — |
| 21 | + lesson-consolidation-cron | 6 |
| 25 | + planning-quality-registry | 7 |
| 30 | + semantic-retrieval-pgvector (partial — also needs embedded>20) | up to 8 |
| adaptations > 0 | + adaptation-routing-wire | up to 9 |

**Note:** All templates that CAN fire will produce proposals only if `priorityScore >= minPriority (0.25)`. At 5 episodes with 0 adaptations, confidence is low (base=0.55, no urgency boosts) → episode-cross-reference will still exceed 0.25. First roadmap proposal is guaranteed once episodeCount ≥ 5.

**First roadmap milestone: 5 pipeline runs + next Sunday 05:00 UTC.**

---

## 7. First Evidence-Backed Autonomy Score Milestone

**Definition:** All 6 autonomy dimensions reporting real values (non-null, non-coalesced-default). Score inflation = 0%.

**Current gaps (3 dimensions still synthetic):**
- executionSuccess: needs episodeCount ≥ 1
- lowRetryRate: needs apex_agent_runs ≥ 1 row
- recovery: needs getFailureEpisodes().length ≥ 1

**Path A — Failure first (inflation → 0% in 1 run):**
```
Run 1: fails
  → storeEpisode(success:false) → episodeCount=1
  → apex_agent_runs upsert (success:false) → 1 row

executionSuccess = getSuccessRate(50) = 0/1 = 0.0 (REAL)
lowRetryRate = retryRate() = 1 failure / 1 run = 1.0 → max(0, 1-1×2) = 0.0 (REAL)
recovery = getFailureEpisodes() = [ep-1] (length=1 ≥ 1) → Supabase check →
           no matching success found → checks[0]=false → recoveryRate = 0/1 = 0.0 (REAL)
goalCompletion = 1.0 (already real)
confidence = getSuccessRate(20)=0.0, epVol=0.02, goalScore=1.0 → 0×0.5+0.02×0.2+1.0×0.3 = 0.304 (REAL)
episodeRichness = 0.01 (real)

All 6 dimensions real → inflation = 0%
Score = 2.31 (real, low — system just failed)
```

**Path B — Success first, then failure (inflation → 0% in 2 runs):**
```
Run 1: succeeds → inflation = 12.0% (recovery still synthetic)
Run 2: fails →
  executionSuccess = 1/2 = 0.5 (REAL)
  lowRetryRate: retryRate = 1 failure / 2 runs = 0.5 → lowRetryRate = 0.0 (REAL)
  recovery = getFailureEpisodes()=[ep-2] (length=1) → Supabase check → 
             run 1 succeeded but different objective OR same objective →
             if same objective: recoveryRate = 1/1 = 1.0 (REAL)
             if different objective: recoveryRate = 0/1 = 0.0 (REAL, not matching)
  All dimensions real → inflation = 0%
```

**Minimum pipeline runs to fully evidence-backed score:**
- Path A: **1 failed run** (optimal — 0 successful runs, 1 failed run)
- Path B: **2 runs** (1 successful + 1 failed) — 1 successful, 1 failed

**All-success path — NEVER reaches inflation < 10%:**
If no failures ever occur, `recovery` remains null → default 0.5 → inflation permanently at ~12%.
This is structural: `if (!failures.length) return null` is the first line of `recoveryRate()`.
A system that never fails cannot measure its recovery capability. Score stays ~12% inflated indefinitely.

**First fully evidence-backed autonomy score: 1 failed pipeline run minimum.**

---

## 8. Autonomy Score Inflation Thresholds

### How inflation is measured

```
inflation_raw = Σ (0.5 × weight) for each null-defaulted dimension
inflation%    = inflation_raw / total_raw
```

**Note:** `recovery` requires special handling — it becomes non-null after the first failure, regardless of whether the recovery succeeds. The value may be 0.0 (real) rather than 0.5 (default), which may LOWER the score further.

---

### Inflation < 50%

**Current:** 60.3%

**Required:** `inflation_raw / total_raw < 0.50`

After 1 successful run:
```
executionSuccess: 0.5(default) → 1.0(real) → -0.150 inflation, +0.150 measured
lowRetryRate:     0.5(default) → 1.0(real) → -0.075 inflation, +0.075 measured
recovery:         0.5(default) → 0.5(default) → unchanged
confidence.sr:    0.5(default) → real → -0.025 inflation, +0.025 measured
Remaining inflation = 0.100 (only recovery)
New measured = 0.831
inflation% = 0.100/0.831 = 12.0%  ← well below 50%
```

After 1 failed run:
```
All 3 defaults resolved → inflation = 0%
```

**Required pipeline runs for inflation < 50%:**
| Run type | Successful runs | Failed runs | Reflection cycles | Roadmap cycles |
|----------|----------------|-------------|-------------------|----------------|
| **1 successful run** | **1** | **0** | **1** | **0** |
| *1 failed run* | *0* | *1* | *1* | *0* |

**Either 1 successful OR 1 failed run achieves < 50% inflation.**

---

### Inflation < 25%

**The same 1-run threshold applies.** After 1 successful run, inflation = 12% (< 25%). After 1 failed run, inflation = 0%.

**Required pipeline runs for inflation < 25%:**
| Run type | Successful runs | Failed runs | Reflection cycles | Roadmap cycles |
|----------|----------------|-------------|-------------------|----------------|
| **1 successful run** | **1** | **0** | **1** | **0** |
| *1 failed run* | *0* | *1* | *1* | *0* |

**Inflation jumps from 60.3% past both 50% and 25% thresholds simultaneously after just 1 run.**

---

### Inflation < 10%

**Recovery must become real.** With recovery still at 0.5 default (0.100 inflation_raw), and max possible measured_raw = 1.0:
```
0.100 / 1.0 = 10.0% (exactly at threshold, never below without a failure)
```
The 10% threshold is **structurally unreachable without a pipeline failure.** A perfect-success-only system permanently stays at ~12% inflation.

After 1 failed run:
```
All 3 defaults resolved → inflation = 0% (< 10%)
```

After 1 successful + 1 failed:
```
All 3 defaults resolved → inflation = 0% (< 10%)
```

**Required pipeline runs for inflation < 10%:**
| Path | Successful runs | Failed runs | Reflection cycles | Roadmap cycles |
|------|----------------|-------------|-------------------|----------------|
| **Failure first** | **0** | **1** | **1** | **0** |
| **Success then failure** | **1** | **1** | **2** | **0** |

**Minimum: 1 failed pipeline run.**

---

## 9. Quantified Roadmap: Current → Fully Evidence-Backed

### Run-by-Run Progression (optimal path: success/failure mix)

| Run # | Type | Cumulative episodes | Dimensions evidence-backed | Inflation% | Score | New subsystems unlocked |
|-------|------|--------------------|-----------------------------|------------|-------|------------------------|
| 0 (now) | — | 0 | goalCompletion, episodeRichness (2/6) | **60.3%** | 5.80 | None |
| 1 | success | 1 | +executionSuccess, lowRetryRate, confidence (5/6) | **12.0%** | ~8.31 | learning milestone |
| 2 | failure | 2 | +recovery → all 6/6 | **0%** | ~6.06 | **fully evidence-backed score** |
| 3 | success | 3 | — | 0% | varies | PlanQuality: 1st record (if via assignWork) |
| 5 | success | 5 | — | 0% | varies | Improvement roadmap unlocked (next Sunday) |
| 8 | failure | 8 | — | 0% | varies | **Adaptation engine: Pass 2 active** |
| 10 | success | 10 | — | 0% | varies | All-success fallback for adaptation; 3 roadmap templates |

### Key Milestones Summary

| Milestone | Required runs | Required failures | Required successes | Calendar wait |
|-----------|-------------|-------------------|-------------------|---------------|
| Any dimension evidence-backed | 1 | 0 | 1 | None |
| Inflation < 50% | 1 | 0 (success) | 1 | None |
| Inflation < 25% | 1 | 0 (success) | 1 | None |
| Inflation < 10% | 1 | 1 (failure) | 0 | None |
| **Full evidence-backed score** | **2** | **1** | **0–1** | **None** |
| 1st plan quality record | 1 (via assignWork) | 0 | 1 | None |
| ARCHITECT plan context injection | 3 (via assignWork) | 0 | 3 | None |
| 1st improvement proposal | 5 | 0 | 5 | Next Sunday |
| Self-evaluator all-real | 8–10 | ≥1 | varies | None |
| **1st adaptation recommendation** | **8** | **≥1** | **7** | **None** |
| ARCHITECT routing intelligence | ~8 | ≥1 | ~7 | None |
| 3 roadmap templates active | 10 | 0 | 10 | Next Sunday |
| 7 roadmap templates active | 25 | 0 | 25 | Next Sunday |
| Semantic pgvector retrieval | 30+ | 0 | 30 | Next Sunday |
| True autonomy saturation | 50–100 | mixed | mixed | Several months |

### Inflation Decay Curve (per-run, optimal path)

| After run | Synthetic dimensions | inflation_raw | inflation% | Score |
|-----------|---------------------|--------------|------------|-------|
| 0 | executionSuccess, lowRetryRate, recovery, confidence.sr | 0.350 | 60.3% | 5.80 |
| 1 (success) | recovery | 0.100 | 12.0% | ~8.31 |
| 1 (failure) | none | 0.000 | **0%** | ~2.31 |
| 2 (any after 1 success) | none | 0.000 | **0%** | ~6.06 |

**Observation:** The inflation curve is not gradual — it drops discontinuously. Run 1 removes 82% of inflation (3 of 4 defaulted signals). Run 2 (a failure) removes the remaining 18%. There is no gradual warmup phase for the score formula itself.

---

## 10. Blocking Condition Summary

| Subsystem | Current state | Binding blocker | Unblock condition | Unblock cost |
|-----------|--------------|----------------|-------------------|-------------|
| autonomy-metrics (3 dims) | 60.3% inflated | 0 pipeline runs | 1 pipeline run | Minimal |
| autonomy-metrics (recovery) | 0.5 default | No failure episodes | 1 failed run | 1 failure |
| adaptation-engine | 0 cycles w/ data | episodeCount < 8 | 8 pipeline runs + cycle trigger | ~8 runs |
| planning-quality-registry | 0 records | No assignWork() calls | 3 assignWork({simulate:false}) | 3 API calls |
| improvement-executor | 0 proposals | episodeCount < 5 | 5 pipeline runs + Sunday cron | ~5 runs + 7 days |
| self-evaluator | 4/5 synthetic | Episodes + adaptations | 8 runs (for full data) | ~8 runs |
| goal-tracker | 1 goal only | Single data point | More goal tracking | Organic |
| reflection-engine lesson quality | unmeasured | No episodes | 1 pipeline run | Minimal |

---

## No Modifications Made

Per mission constraints: no systems were modified. No code was changed. All measurements are derived from static code analysis and confirmed dataset sizes.

**Verdict:** The autonomy score inflation problem is resolved faster than any subsystem milestone — 2 pipeline runs (1 success + 1 failure, or just 1 failure) eliminate all score inflation. The adaptation engine milestone (8 runs) and roadmap milestone (5 runs + Sunday) are the longer gates, driven by MIN_SAMPLES thresholds rather than the score formula itself.
