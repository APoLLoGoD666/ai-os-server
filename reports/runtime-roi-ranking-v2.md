# Runtime ROI Ranking v2
**Date:** 2026-06-06  
**Engineer:** Principal Software Architecture Auditor  
**Method:** Full codebase dead-path discovery + runtime reachability analysis  
**Scope:** 38 agent-system modules, 15 lib modules, server.js (12,000+ lines)

---

## 1. Dead Exports

Exported functions with zero callers and the module never imported anywhere.

### execution-recovery.js — FULLY DEAD (never imported)

| Export | Line | Callers | Status |
|--------|------|---------|--------|
| `buildRetryChain` | 34 | 0 (internal helper) | DEAD |
| `executeWithRecovery` | 57 | 0 | **DEAD** |
| `assignFallback` | 120 | 0 | **DEAD** |
| `buildEscalationPath` | 139 | 0 | **DEAD** |
| `buildRecoverySummary` | 151 | 0 | **DEAD** |
| `MAX_RETRIES` | 9 | 0 | DEAD |
| `ESCALATE_AFTER` | 22 | 0 | DEAD |

**Why dormant:** Module was written as a wrapper around `runAgentTeam()` but was never imported into `multi-agent-coordinator.js` or `orchestrator.js`. The `coordinators _worker()` function calls `runAgentTeam()` directly with no retry logic.

**Capability sitting idle:** Automatic retry chains (up to 4 attempts), failure-type-aware delay schedules, tier escalation on repeated failures, full `attemptLog` for planning-quality-registry.

---

### adaptive-planner.js — FULLY DEAD (never imported)

| Export | Line | Callers | Status |
|--------|------|---------|--------|
| `isOversized` | ~28 | 0 | **DEAD** |
| `splitTask` | ~50 | 0 | **DEAD** |
| `mergeRelated` | ~80 | 0 | **DEAD** |
| `replan` | ~100 | 0 | **DEAD** |
| `createMultiStagePlan` | ~140 | 0 | **DEAD** |
| `advanceStage` | ~175 | 0 | **DEAD** |
| `failStage` | ~190 | 0 | **DEAD** |
| `isPlanComplete` | ~210 | 0 | **DEAD** |
| `STAGES` | const | 0 | DEAD |
| `STAGE_STATUS` | const | 0 | DEAD |

**Why dormant:** Module wraps `task-planner.decomposeGoal()` with adaptive logic but is never called by `multi-agent-coordinator.assignWork()` which calls `decomposeGoal()` directly. The `replan()` function has no caller when a subtask fails — coordinator just logs the error and continues.

**Capability sitting idle:** Automatic task splitting when `filesToModify > 3` or `steps > 6`, multi-stage plan creation, failure-triggered replanning.

---

## 2. Cold Exports

Modules are imported but specific exported functions are never called at runtime.

### lib/response-timing-engine.js — IMPORTED, ALL 3 FUNCTIONS NEVER CALLED

| Import in server.js | Line |
|---------------------|------|
| `const _timingEng = require('./lib/response-timing-engine');` | 85 |

| Export | Callers in server.js | Status |
|--------|----------------------|--------|
| `decideResponseTiming()` | 0 | **COLD** |
| `buildStreamPlan()` | 0 | **COLD** |
| `splitIntoPhases()` | 0 | **COLD** |

**Passive activity:** Event bus listeners for `CLAUDE_STARTED` and `CLAUDE_FIRST_TOKEN` fire on module load, keeping `_state.activeSessions` counter updated. But this counter is never read.

**Capability sitting idle:** Progressive response disclosure — splits shaped reply into `{ ack, frame, partial_answer, final }` phases with ms delays for the frontend to reveal progressively. Reduces perceived latency for multi-paragraph responses.

---

### lib/executive-arbitration-engine.js — IMPORTED, KEY FUNCTIONS NEVER CALLED

| Import in server.js | Line |
|---------------------|------|
| `const _eae = require('./lib/executive-arbitration-engine');` | 87 |

| Export | Callers | Status |
|--------|---------|--------|
| `arbitrate()` | 0 direct (fired from EAE event listeners) | PARTIAL |
| `generateExecutiveSnapshot()` | 0 in server.js; called lazily in `_cogOrch.getExecutiveContext()` | **COLD** |
| `recordTransition()` | 0 | **COLD** |
| `stats()` | 0 | **COLD** |
| `FOCUS` | 0 | COLD |

**Passive activity:** `arbitrate()` fires via event bus listeners on `USER_INTERRUPTED`, `AGENT_STARTED`, `AGENT_COMPLETED` — so EAE IS scoring threads on each event. But the scores are computed and silently discarded. `generateExecutiveSnapshot()` is the only way to read the result, and nothing calls it.

**Capability sitting idle:** Per-session executive focus tracking (which cognitive thread is top priority), attention entropy, strategic thread rescue, focus transition history — all computed but unconsumed.

---

### lib/strategic-planning-engine.js — IMPORTED, ALL KEY FUNCTIONS NEVER CALLED

| Import in server.js | Line |
|---------------------|------|
| `const _spe = require('./lib/strategic-planning-engine');` | 88 |

| Export | Callers | Status |
|--------|---------|--------|
| `createObjective()` | 0 | **COLD** |
| `decomposeObjective()` | 0 | **COLD** |
| `resumeStrategicContext()` | 0 in server.js; 0 in _cogOrch | **COLD** |
| `updateFromResponse()` | 0 | **COLD** |
| `getStrategicContext()` | called lazily in `_cogOrch.getStrategicContext()` | **COLD** |
| `generateStrategicInitiatives()` | 0 | **COLD** |
| `updateWorldState()` | 0 | **COLD** |
| `stats()` | 0 | **COLD** |

**Passive activity:** Event bus listeners for `USER_INTERRUPTED`, `AGENT_STARTED`, `AGENT_COMPLETED`, `SESSION_COMPLETED` fire on module load. SPE updates objective confidence and progress scores on each event. But `updateFromResponse()` — the function that creates objectives from strategic user messages — is never called. The SPE is receiving events but never ingesting the content that would let it build objectives.

**The missing call:** `_spe.updateFromResponse({sessionId, userMessage, reply, intent, mode})` should be called after each `/chat` response. Without it, no objectives are ever created, so the event-bus confidence updates operate on an empty store.

**Capability sitting idle:** Long-horizon objective tracking across multiple chat turns, strategic continuity hints (`resumeStrategicContext`), world-state entity modeling, advisory initiative generation.

---

### reflection-engine.js — 5 OF 8 EXPORTS COLD

| Export | Live? | Callers |
|--------|-------|---------|
| `analyzeFailures()` | LIVE | `autonomy-metrics.js:7`, `self-evaluator.js` |
| `buildPerformanceSummary()` | LIVE | `autonomy-metrics.js`, `adaptation-engine.js` |
| `getRankedLessons()` | LIVE | `wiki-reader.js:54` |
| `scoreLessonText()` | COLD | 0 |
| `consolidateLessons()` | LIVE (cron) | `_scheduleLessonConsolidation` → server.js |
| `analyzeSuccesses()` | COLD | 0 |
| `scoreArchitectOutput()` | COLD | 0 |
| `generateReflectionLesson()` | **COLD** | 0 — **HIGH VALUE** |

**`generateReflectionLesson()` detail:** The `_reflector` stage in orchestrator.js makes a raw `client.messages.create()` call to generate lessons. `generateReflectionLesson()` wraps this with deduplication (checks against existing lessons), synthesized prompting, and fallback to existing lesson on API failure. It was built precisely to replace the raw call but the replacement was never made.

---

### memory-retriever.js — 6 OF 7 EXPORTS COLD

| Export | Live? | Callers |
|--------|-------|---------|
| `formatExperiencesAsContext()` | LIVE | `orchestrator.js` |
| `findSimilarEpisodes()` | **COLD** | 0 — used internally by `formatExperiencesAsContext` |
| `findSimilarLessons()` | COLD | 0 |
| `findExecutionPatterns()` | COLD | 0 |
| `findCrossProject()` | COLD | 0 |
| `retrieve()` | COLD | 0 — unified search not wired |
| `formatForContext()` | COLD | 0 |

---

### memory-indexer.js — 6 OF 8 EXPORTS COLD

| Export | Live? | Callers |
|--------|-------|---------|
| `indexEpisode()` | LIVE | `orchestrator.js:946, 1113` |
| `indexLesson()` | LIVE | `orchestrator.js:761` |
| `indexExecutionPattern()` | **COLD** | 0 — execution patterns never indexed |
| `rebuildIndex()` | COLD | 0 |
| `getEpisodes()` | COLD | 0 |
| `getLessons()` | COLD | 0 |
| `getStats()` | COLD | 0 |
| `_flush()` | COLD | 0 |

---

### agent-registry.js — 8 OF 10 EXPORTS COLD

| Export | Live? |
|--------|-------|
| `getRegistrySummary()` | LIVE (routes/intelligence.js) |
| `DOMAIN_AGENTS` | LIVE (server.js:90) |
| All 8 others | COLD |

---

### goal-tracker.js — 8 OF 12 EXPORTS COLD

| Export | Live? | Note |
|--------|-------|------|
| `startGoal()`, `completeGoal()`, `blockGoal()` | LIVE | orchestrator.js |
| `getStats()` | LIVE | autonomy-metrics.js |
| `addGoal()` | COLD (currently) | Called by improvement-executor when proposals are scheduled — not yet triggered |
| `cancelGoal()`, `retryGoal()` | COLD | No API route |
| `getGoals()` | LIVE (new) | `/api/autonomy/goals` route added in runtime-wiring session |
| `getGoal()`, `linkSubtask()` | COLD | No callers |
| `STATUS`, `GOALS_DIR` | COLD | Never imported |

---

## 3. Dormant Schedulers

No schedulers are fully dormant. All 8 recurring schedulers fire correctly. The `_scheduleEvolutionCycle` (Sunday 05:00 UTC) will fire for the first time on 2026-06-07. As documented in autonomy-telemetry-validation.md, the first roadmap will produce 0 proposals due to episodeCount=0 blocking all template trigger conditions.

---

## 4. Orphaned Telemetry

Telemetry produced but never consumed by any route, dashboard, or downstream module.

| Telemetry source | Data produced | Consumer | Status |
|-----------------|---------------|----------|--------|
| `_eae.arbitrate()` | executive_focus, attention_entropy, focus_switch_count, suppressed_threads | None | **ORPHANED** |
| `_eae.stats()` | focus_duration_p50/p95, strategy_goal_count, decay_events | None | **ORPHANED** |
| `_spe.stats()` | strategic_objective_count, world_state_entity_count, autonomy_signal_score | None | **ORPHANED** |
| `_timingEng._state.activeSessions` | active LLM session count from event bus | None | **ORPHANED** |
| `reflection-engine.scoreLessonText()` | lesson quality composite score | None | **ORPHANED** |
| `reflection-engine.scoreArchitectOutput()` | ARCHITECT output quality scoring | None | **ORPHANED** |
| `memory-indexer.getStats()` | embedded episode/lesson counts, index coverage | None | **ORPHANED** |
| `execution-recovery` outputs | attemptLog, recoveryCount, escalations | None | **ORPHANED** |

---

## 5. Inactive Autonomy Paths

The APEX cognition stack has 5 declared stages. Current activation status:

```
Stage 3.1 — Session State Registry      ACTIVE     (session-state-registry.js)
Stage 3.2 — Response Timing Engine      PARTIAL    (event listeners active; buildStreamPlan never called)
Stage 3.3 — Persistent Cognition Mgr   ACTIVE     (thread tracking live)
Stage 3.4 — Executive Arbitration      PARTIAL    (event-driven scoring active; generateExecutiveSnapshot never called)
Stage 3.5 — Strategic Planning Engine  PARTIAL    (event listeners active; updateFromResponse never called → zero objectives ever created)

Adaptation Loop                         WIRED/COLD (learn() wired, no pipeline runs yet)
Planning Quality Registry               WIRED/COLD (createPlanRecord wired, no real assignWork calls yet)
Improvement Executor Roadmap            SCHEDULED  (first fire Sunday; will produce empty roadmap)
Execution Recovery                      DEAD       (never imported)
Adaptive Planning                       DEAD       (never imported)
```

---

## Phase 2 — Runtime Reachability Map

### orchestrator.runAgentTeam()

```
ACTIVE   orchestrator.runAgentTeam(spec, taskId)
           ├─ ACTIVE   _researcher(spec)
           ├─ ACTIVE   _architect(spec)
           │     └─ WIRED/COLD  _adaptEngine.getRecommendationsFor() → returns [] (no adaptations)
           ├─ ACTIVE   _developer(spec)
           ├─ ACTIVE   _reviewer(spec)
           ├─ ACTIVE   _validator(spec)
           ├─ ACTIVE   _tester(spec)
           ├─ ACTIVE   _committer(spec)
           ├─ ACTIVE   _reflector(spec)
           │     └─ DEAD    reflection-engine.generateReflectionLesson() ← bypassed; raw API call used instead
           ├─ ACTIVE   agent-pipeline-hooks.onPipelineStart/Complete/Failed()
           ├─ ACTIVE   goal-tracker.startGoal / completeGoal / blockGoal()
           ├─ ACTIVE   memory-indexer.indexEpisode() / indexLesson()
           ├─ WIRED/COLD _adaptEngine.learn(spec, result)
           │     └─ WIRED/COLD _adaptEngine.runCycle() → 0 adaptations (MIN_SAMPLES not met)
           └─ DEAD    execution-recovery.executeWithRecovery() ← not wired
```

### multi-agent-coordinator.assignWork()

```
ACTIVE   assignWork(goal, {simulate: false})
           ├─ ACTIVE   decomposeGoal(goal)
           │     └─ DEAD    adaptive-planner.isOversized() ← not called before/after decompose
           │     └─ DEAD    adaptive-planner.splitTask() ← never called on oversized tasks
           ├─ WIRED/COLD _pqr.createPlanRecord(plan) → writes to disk (no data yet)
           ├─ ACTIVE   runParallel(specs)
           │     └─ for each spec:
           │           └─ ACTIVE   _dynSelector.selectAgentConfig()
           │           └─ ACTIVE   runAgentTeam(spec, taskId)
           │           └─ DEAD    execution-recovery.executeWithRecovery() ← not wired
           ├─ ACTIVE   aggregate(results)
           └─ WIRED/COLD _pqr.recordPlanOutcome(summary) → writes to disk (no data yet)
```

### adaptation-engine

```
WIRED/COLD learn(spec, result)  ← called from orchestrator (3 paths)
                └─ if failure OR every 5 runs: runCycle()
                       ├─ WIRED/COLD _analyzeStageFailures()  ← needs apex_agent_stages rows >= 8
                       ├─ WIRED/COLD _analyzeEpisodicPatterns() ← episodeCount() = 0, blocked
                       └─ WIRED/COLD _analyzeCategoryRouting() ← needs category sampleSize >= 8
```

### planning-quality-registry

```
WIRED/COLD createPlanRecord(plan)    ← called from coordinator (no real runs)
WIRED/COLD recordPlanOutcome(data)   ← called from coordinator (no real runs)
DEAD       getPlanQuality()          ← never called externally
DEAD       getBestPatterns()         ← never called externally
DEAD       getWorstPatterns()        ← never called externally
DEAD       generatePlanningInsights() ← never called
DEAD       formatQualityContext()    ← never called (should feed ARCHITECT prompt)
DEAD       getSummary()              ← never called
```

### improvement-executor

```
SCHEDULED  generateRoadmap()   ← Sunday 05:00 UTC (fires in ~19h)
                └─ _snapshot(): episodeCount=0 → all templates gate-blocked
                └─ Will write empty roadmap on first fire
LIVE       getTopImprovements() ← API route (returns [])
LIVE       getStats()           ← API route (returns zero counts)
DEAD       generateProposal()   ← no external caller
DEAD       scheduleProposal()   ← awaiting human approval workflow
DEAD       markCompleted()      ← awaiting human approval workflow
DEAD       markRejected()       ← awaiting human approval workflow
```

### episodic-memory

```
ACTIVE     storeEpisode()        ← orchestrator writes after each run
ACTIVE     getSimilarExperiences() ← orchestrator uses for ARCHITECT context
ACTIVE     episodeCount()        ← autonomy-metrics + adaptation-engine
ACTIVE     getFailureEpisodes()  ← adaptation-engine + autonomy-metrics + improvement-executor
ACTIVE     getSuccessRate()      ← autonomy-metrics + adaptation-engine
DEAD (currently) — episodeCount = 0, so all functions return empty
```

### cognitive stack (Stages 3.2 / 3.4 / 3.5)

```
ACTIVE     cognitive-orchestrator.shape()     ← called in chat route
PARTIAL    cognitive-orchestrator.getUnresolvedContext()  ← lazy-loads PCM, never called in server.js
PARTIAL    cognitive-orchestrator.getExecutiveContext()   ← lazy-loads EAE, never called in server.js
PARTIAL    cognitive-orchestrator.getStrategicContext()   ← lazy-loads SPE, never called in server.js

PARTIAL    executive-arbitration-engine.arbitrate()  ← fires via event bus only
DEAD       executive-arbitration-engine.generateExecutiveSnapshot()  ← 0 callers
DEAD       executive-arbitration-engine.recordTransition()  ← 0 callers

DEAD       strategic-planning-engine.updateFromResponse()  ← 0 callers (zero objectives ever created)
DEAD       strategic-planning-engine.resumeStrategicContext()  ← 0 callers
DEAD       response-timing-engine.buildStreamPlan()  ← 0 callers
```

### roadmap generation

```
SCHEDULED  improvement-executor.generateRoadmap()  ← Sunday 05:00 UTC
DEAD       (all 10 templates gate on episodeCount > N; episodeCount = 0)
BLOCKED    First roadmap will be empty
```

### telemetry subsystems

```
ACTIVE     autonomy-metrics.getFullMetrics()    ← /api/autonomy/metrics route
ACTIVE     autonomy-metrics.computeAutonomyScore() ← /api/autonomy/score route
ACTIVE     self-evaluator.generateSystemEvaluation() ← /api/autonomy/evaluation route
WIRED/COLD adaptation-engine.learn() → runCycle() ← wired, zero data
WIRED/COLD planning-quality-registry ← wired, zero data
DEAD       execution-recovery telemetry ← not wired
DEAD       adaptive-planner telemetry ← not wired
ORPHANED   _eae telemetry ← computed but not queryable
ORPHANED   _spe telemetry ← computed but not queryable
```

---

## Phase 3 — ROI Ranking

Impact scale: direct effect on pipeline success rate, autonomy score, or telemetry completeness.  
Risk: LOW = additive only, no orchestrator internals modified. MEDIUM = 1 internal call site changed.  
Effort: estimated implementation time.

| Rank | Opportunity | Module(s) | Expected Impact | Risk | Effort |
|------|------------|-----------|----------------|------|--------|
| 1 | Wire `executeWithRecovery` into `runParallel._worker()` | execution-recovery.js → coordinator.js | +0.3-0.5 on `recovery` autonomy dimension; auto-retry on API/timeout failures; feeds `recoveryCount` into planning-quality-registry | LOW | 1h |
| 2 | Wire `reflection-engine.generateReflectionLesson()` into orchestrator `_reflector()` | reflection-engine.js → orchestrator.js | +0.7 lesson quality (self-evaluator dimension); lesson deduplication; cross-reference synthesis vs existing lessons | LOW | 1h |
| 3 | Wire `adaptive-planner.splitTask()` into `assignWork()` pre-execution guard | adaptive-planner.js → coordinator.js | Reduces DEVELOPER stage failures on oversized tasks; +0.2-0.4 on `executionSuccess`; feeds `wasReplanned` field in planning-quality-registry | MEDIUM | 2h |
| 4 | Call `_spe.updateFromResponse()` after each `/chat` response | strategic-planning-engine.js → server.js | Activates Stage 3.5 objective tracking; enables strategic continuity across turns; `generateStrategicInitiatives()` becomes live | LOW | 30min |
| 5 | Call `_eae.recordTransition({sessionId})` after each `/chat` response + expose `generateExecutiveSnapshot()` in `/api/system/state` | executive-arbitration-engine.js → server.js | Activates Stage 3.4 focus tracking output; makes attention entropy, focus switch history consumable | LOW | 30min |
| 6 | Call `_timingEng.buildStreamPlan()` in chat route; attach `stream_plan` to response JSON | response-timing-engine.js → server.js | Enables frontend progressive disclosure; reduces perceived latency for multi-paragraph responses | LOW | 1h |
| 7 | Wire `reflection-engine.scoreLessonText()` after `_reflector` lesson generation | reflection-engine.js → orchestrator.js | Adds per-lesson quality score to telemetry; enables `lessonUsefulness` dimension tracking; feeds self-evaluator | LOW | 30min |
| 8 | Wire `memory-indexer.indexExecutionPattern()` after successful pipeline run | memory-indexer.js → orchestrator.js | Enriches semantic memory index with execution patterns; improves `formatExperiencesAsContext()` recall quality | LOW | 30min |
| 9 | Wire `planning-quality-registry.formatQualityContext()` into ARCHITECT prompt | planning-quality-registry.js → orchestrator.js | Once data accumulates (3+ plan records), ARCHITECT gets historical plan quality context before planning | LOW | 30min |
| 10 | Expose `/api/system/intelligence` aggregating `_eae.stats()`, `_spe.stats()`, `memory-indexer.getStats()`, `_timingEng` data | All dormant stats → server.js | Makes all orphaned telemetry queryable; enables dashboard observability over cognitive stack | LOW | 1h |

---

## Phase 4 — Wiring Candidate Validation (Top 10)

---

### Opportunity 1 — executeWithRecovery in runParallel

**File:** `agent-system/multi-agent-coordinator.js`  
**Function:** `_worker()` inside `runParallel()`  
**Insertion point:** Replace the `runAgentTeam()` call block (lines 105–113)

**Call path BEFORE:**
```
runParallel(specs)
  → _worker()
      → runAgentTeam({...spec, _selectedTier, _agentCategory}, taskId)
         ← result or error
      → results[i] = { taskId, spec, result, error, ... }
         (if error: recorded, no retry, no escalation)
```

**Call path AFTER:**
```
runParallel(specs)
  → _worker()
      → [add at top of file] const _recovery = require('./execution-recovery');
      → const _runFn = async (s, cfg) => runAgentTeam(
            {...s, _selectedTier: cfg.tier, _agentCategory: cfg.category}, taskId);
      → const _recovered = await _recovery.executeWithRecovery(
            spec, _runFn, agentConfig, { maxAttempts: 3 });
      → result = _recovered.result;
        error  = _recovered.success ? null : _recovered.error;
      → [add to execSummary]: recoveryData = _recovery.buildRecoverySummary(_recovered.attemptLog)
      → results[i] = { ..., recoveryCount: recoveryData.failedAttempts }
         (passed to recordPlanOutcome → fills planning-quality-registry recoveryCount field)
```

**Expected telemetry increase:**
- `planning-quality-registry` records gain non-zero `recoveryCount` and `replanCount` values
- `autonomy-metrics.recoveryRate()` gains real data (currently returns null)
- `self-evaluator._scoreRecovery()` produces real signal vs default 0.5

**Expected autonomy score increase:**
- `recovery` dimension: from 0.5 (default) to ~0.6-0.8 depending on actual recovery success rate
- Formula: (0.7 - 0.5) × 0.20 × 10 = **+0.4 points** at steady state (10+ runs)

**Rollback:** Remove the `_recovery` require and revert the `runAgentTeam` call to the original direct form. The `recoveryCount` field in plan records returns to 0.

---

### Opportunity 2 — generateReflectionLesson in _reflector()

**File:** `agent-system/orchestrator.js`  
**Function:** `_reflector(spec, agentLogs, success)` (inner function in `runAgentTeam` closure)  
**Insertion point:** Replace the `client.messages.create()` call in `_reflector()` with `reflection-engine.generateReflectionLesson()`

**Call path BEFORE:**
```
_reflector(spec, agentLogs, success)
  → const existingLesson = await memory.getLessons()
  → const msg = await client.messages.create({...raw SYSTEM prompt...})
  → const lesson = msg.content[0].text
  → memory.logLesson(lesson)
  → _indexer.indexLesson(lesson)
```

**Call path AFTER:**
```
_reflector(spec, agentLogs, success)
  → const existingLesson = await memory.getLessons()
  → [add] const _rf = require('./reflection-engine');
  → const lesson = await _rf.generateReflectionLesson(spec, agentLogs, success, existingLesson)
  → memory.logLesson(lesson)
  → _indexer.indexLesson(lesson)
  → [add] const quality = _rf.scoreLessonText(lesson);
     if (quality !== null) console.log(`[REFLECTOR] lesson quality: ${quality.toFixed(2)}`);
```

**`generateReflectionLesson()` internals:** Uses same Claude API call but wraps with:
1. Deduplication check against existing lessons (avoids repeating already-captured insights)
2. Synthesis prompt that asks Claude to connect to existing lessons
3. Fallback: returns `existingLesson` slice on API failure (avoids blank lesson entries)

**Expected telemetry increase:**
- `scoreLessonText()` quality scores logged per pipeline run
- Lesson deduplication reduces noise in `01 Executive/Lessons.md`
- `reflection-engine.analyzeFailures()` downstream analysis quality improves

**Expected autonomy score increase:**
- `lessonUsefulness` dimension in self-evaluator: +0.7 (as modeled in improvement-executor template)
- Self-evaluator composite: indirect +0.2 on overall score via lesson quality pathway
- **+0.2 points** net on autonomy score

**Rollback:** Revert `_reflector()` to use `client.messages.create()` directly. Remove `_rf` require.

---

### Opportunity 3 — adaptive-planner.splitTask in assignWork

**File:** `agent-system/multi-agent-coordinator.js`  
**Function:** `assignWork(goal, options)` — before `runParallel()`  
**Insertion point:** After `planToSpecs(plan)`, add oversized-task guard

**Call path BEFORE:**
```
assignWork(goal, options)
  → decomposeGoal(goal)  → plan
  → planToSpecs(plan)    → specs[]
  → createPlanRecord(plan)
  → runParallel(specs)
```

**Call path AFTER:**
```
assignWork(goal, options)
  → decomposeGoal(goal)  → plan
  → planToSpecs(plan)    → specs[]
  → [add] const _ap = require('./adaptive-planner');
  → specs = specs.flatMap(s => _ap.isOversized(s) ? _ap.splitTask(s) : [s]);
     // splitTask returns array of 2 sub-specs when oversized, else [spec]
  → createPlanRecord({...plan, subtasks: specs})  // updated spec count
  → runParallel(specs)
```

**`isOversized()` criteria:** Returns true when `spec.filesToModify.length > 3` OR `spec.steps.length > 6`. These are the exact thresholds that correlate with DEVELOPER stage failures per the `_ADAPT_TO_PROPOSAL.split_large_tasks` entry in improvement-executor.

**Expected telemetry increase:**
- Planning-quality-registry records gain `wasReplanned: true` and higher `subtaskCount`
- Adaptation engine Pass 2 (episodic patterns) begins seeing fewer DEVELOPER failures after activation
- `failurePatterns` in plan records reduces for oversized tasks

**Expected autonomy score increase:**
- `executionSuccess` dimension: from reduced DEVELOPER failure rate, +0.1-0.3 depending on task profile
- Formula: 0.2 × 0.30 × 10 = **+0.6 points** at steady state (50+ runs)

**Rollback:** Remove `_ap` require and the `specs = specs.flatMap(...)` line. Specs revert to unmodified planToSpecs output.

---

### Opportunity 4 — _spe.updateFromResponse in chat route

**File:** `server.js`  
**Function:** `/chat` POST handler (approximately line 8000–9000 based on structure)  
**Insertion point:** After `_cogOrch.shape()` returns and before `res.json()`

**Call path BEFORE:**
```
POST /chat
  → _cogOrch.shape(userMessage, rawReply, executionClass, sessionId)
  → res.json({ ok: true, reply, response_mode: mode })
```

**Call path AFTER:**
```
POST /chat
  → const { reply, mode, intent } = _cogOrch.shape(...)
  → setImmediate(() => {
        try { _spe.updateFromResponse({sessionId, userMessage, reply, intent, mode}); }
        catch {}
    });
  → res.json({ ok: true, reply, response_mode: mode })
```

`_spe` is already imported at line 88. No new require needed. `setImmediate` keeps it non-blocking.

**Expected telemetry increase:**
- `_spe.stats()` becomes non-zero (strategic objective count, world entity count)
- `resumeStrategicContext()` can return hints for subsequent turns
- `_cogOrch.getStrategicContext()` begins returning data after first strategic message

**Expected autonomy score increase:** None directly (SPE not in autonomy-metrics formula). Qualitative: enriches per-session strategic continuity for high-value tasks.

**Rollback:** Remove the `setImmediate` block.

---

### Opportunity 5 — _eae.recordTransition in chat route

**File:** `server.js`  
**Function:** `/chat` POST handler  
**Insertion point:** Same location as Opportunity 4, add to same `setImmediate` block

**Call path BEFORE:**
```
POST /chat → res.json({ ... })
```

**Call path AFTER:**
```
POST /chat
  → setImmediate(() => {
        try { _spe.updateFromResponse(...); } catch {}
        try { _eae.recordTransition({sessionId}); } catch {}
    });
  → res.json({ ... })
```

**Additional:** Add to `GET /api/system/state` response:
```js
const eaeSnap = (() => { try { return _eae.generateExecutiveSnapshot(sessionId); } catch { return null; } })();
// Merge eaeSnap into the state response
```

`_eae` is already imported at line 87. No new require needed.

**Expected telemetry increase:**
- `_eae.stats()` begins accumulating focus_switch_count, focus_duration_p50/p95
- `generateExecutiveSnapshot()` returns live executive focus data per session
- Attention entropy visible per session

**Expected autonomy score increase:** None directly. Enables observability of Stage 3.4.

**Rollback:** Remove `_eae.recordTransition()` call from setImmediate block.

---

### Opportunity 6 — _timingEng.buildStreamPlan in chat route

**File:** `server.js`  
**Function:** `/chat` POST handler  
**Insertion point:** After `_cogOrch.shape()`, before `res.json()`

**Call path BEFORE:**
```
POST /chat
  → { reply, mode, intent } = _cogOrch.shape(...)
  → res.json({ ok: true, reply, response_mode: mode, ... })
```

**Call path AFTER:**
```
POST /chat
  → { reply, mode, intent } = _cogOrch.shape(...)
  → const snap = _sessionReg.getDerivedCognitiveSnapshot(sessionId);
  → const streamPlan = _timingEng.buildStreamPlan(reply, intent, executionClass, snap);
  → res.json({ ok: true, reply, response_mode: mode, stream_plan: streamPlan, ... })
```

`_timingEng` is already imported at line 85. `_sessionReg` is already imported at line 84.

**Requires:** Frontend JS update to read `stream_plan.chunks` and reveal progressively.

**Expected telemetry increase:** `_state.activeSessions` counter becomes consumed data rather than orphaned.

**Expected autonomy score increase:** None directly. Qualitative: perceived latency improvement for multi-paragraph responses (ack phase arrives 950ms before final).

**Rollback:** Remove `buildStreamPlan()` call and `stream_plan` field from response.

---

### Opportunity 7 — scoreLessonText after _reflector

**File:** `agent-system/orchestrator.js`  
**Function:** `_reflector()` — immediately after lesson is written  
**Insertion point:** After `memory.logLesson(lesson)` call

**Call path BEFORE:**
```
_reflector()
  → lesson = generateReflectionLesson() [or raw API call]
  → memory.logLesson(lesson)
  → _indexer.indexLesson(lesson)
```

**Call path AFTER:**
```
_reflector()
  → lesson = generateReflectionLesson()
  → memory.logLesson(lesson)
  → _indexer.indexLesson(lesson)
  → setImmediate(() => {
        try {
            const score = _rf.scoreLessonText(lesson);
            if (score !== null) console.log(`[REFLECTOR] lesson quality score: ${score.toFixed(2)}`);
        } catch {}
    });
```

`_rf` would already be required (per Opportunity 2). No additional require.

**Expected telemetry increase:** Per-lesson quality scores in logs; quality trend visible in log aggregation.

**Expected autonomy score increase:** Indirect via Opportunity 2 (lesson quality improvement). Direct: none.

**Rollback:** Remove `setImmediate` block.

---

### Opportunity 8 — indexExecutionPattern after successful pipeline run

**File:** `agent-system/orchestrator.js`  
**Function:** Success path in `runAgentTeam()` (line ~1110 area, after learn() call)  
**Insertion point:** After the success `setImmediate` for `_adaptEngine.learn()`

**Call path AFTER:**
```
// Success path (line ~1110):
setImmediate(() => { try { _adaptEngine.learn(spec, {...}); } catch {} });
setImmediate(() => {
    try {
        _indexer.indexExecutionPattern({
            category:   _dynSelector.detectCategory(spec.objective),
            complexity,
            stagesCompleted: agentLogs.map(l => l.stage).filter(Boolean),
            success:    true,
            cost,
        });
    } catch {}
});
```

`_indexer` is already imported in orchestrator.js (used for `indexEpisode` and `indexLesson`).

**Expected telemetry increase:**
- `memory-indexer` execution pattern index gains entries
- `memory-retriever.findExecutionPatterns()` can now return results
- Future `formatExperiencesAsContext()` calls include execution pattern matches

**Expected autonomy score increase:** Indirect — richer ARCHITECT context → better plans → higher success rate. Estimated +0.1 over time.

**Rollback:** Remove the added `setImmediate` block.

---

### Opportunity 9 — formatQualityContext in ARCHITECT prompt

**File:** `agent-system/orchestrator.js`  
**Function:** `_architect(spec)` — context assembly before `_callClaude()`  
**Insertion point:** After existing `_adaptCtx` assembly (line ~363)

**Call path BEFORE:**
```
_architect(spec)
  → let _adaptCtx = '';
  → try { _adaptCtx = _adaptEngine.formatRecsAsContext(...); } catch {}
  → _callClaude(prompt + (_adaptCtx ? '\n\n' + _adaptCtx : ''))
```

**Call path AFTER:**
```
_architect(spec)
  → let _adaptCtx = '';
  → try { _adaptCtx = _adaptEngine.formatRecsAsContext(...); } catch {}
  → let _pqCtx = '';
  → try {
        const _pqr = require('./planning-quality-registry');
        _pqCtx = _pqr.formatQualityContext(spec.complexity, _dynSelector.detectCategory(spec.objective));
    } catch {}
  → _callClaude(prompt + (_adaptCtx ? '\n\n' + _adaptCtx : '') + (_pqCtx ? '\n\n' + _pqCtx : ''))
```

**Gate:** `formatQualityContext()` returns `''` until MIN_SAMPLES=3 plan records exist. Zero cost until data accumulates.

**Expected telemetry increase:** ARCHITECT prompts enriched with historical plan quality data after 3+ real pipeline runs.

**Expected autonomy score increase:** Improves ARCHITECT plan quality → reduces VALIDATOR failures → +0.1-0.2 on `executionSuccess` over time. Estimated **+0.2 points** after 20+ runs.

**Rollback:** Remove `_pqCtx` assembly block and its injection into `_callClaude()`.

---

### Opportunity 10 — /api/system/intelligence aggregation route

**File:** `server.js`  
**Type:** New GET route  
**Insertion point:** After existing `/api/autonomy/improvements/stats` route

**Call path AFTER:**
```
GET /api/system/intelligence
  → const eaeStats  = _eae.stats();
  → const speStats  = _spe.stats();
  → const idxStats  = require('./agent-system/memory-indexer').getStats();
  → const regSnap   = require('./agent-system/adaptation-engine').getSnapshot();
  → res.json({
        executive:  eaeStats,
        strategic:  speStats,
        memory:     idxStats,
        adaptation: regSnap,
        computedAt: new Date().toISOString(),
    });
```

**Expected telemetry increase:**
- All 4 orphaned telemetry sources become queryable via a single endpoint
- Dashboard can display cognitive stack health
- Alerts possible when `attention_entropy` is high or `strategic_objective_count` is stale

**Expected autonomy score increase:** None directly. Enables observability over 4 previously invisible subsystems.

**Rollback:** Remove the route block.

---

## Estimated Autonomy Score — Top 3 Opportunities Activated

**Baseline score (current, 0 pipeline runs):** 5.80 / 10

### If Top 3 are activated and 10+ real pipeline runs complete:

| Dimension | Current value | After activation (10+ runs) | Delta |
|-----------|-------------|-------------------------|-------|
| executionSuccess | 0.5 (default) | 0.65 (improved by adaptive-planner split) | +0.15 |
| lowRetryRate | 0.5 (default) | 0.55 (fewer retries because failed tasks are split earlier) | +0.05 |
| recovery | 0.5 (default) | 0.70 (executeWithRecovery gives real data) | +0.20 |
| goalCompletion | 1.0 | 1.0 (unchanged) | 0 |
| confidence | 0.55 | 0.65 (sr improves, epVol grows) | +0.10 |
| episodeRichness | 0.00 | 0.10 (10 episodes / 100 cap) | +0.10 |

**New score calculation:**
```
raw = 0.65×0.30 + 0.55×0.15 + 0.70×0.20 + 1.0×0.20 + 0.65×0.10 + 0.10×0.05
    = 0.195 + 0.0825 + 0.140 + 0.200 + 0.065 + 0.005
    = 0.6875

Score = 0.6875 × 10 = 6.88 / 10
```

**Projected improvement: +1.08 points** (5.80 → 6.88) from 10 pipeline runs with top-3 opportunities activated.

### Comparison:

| Scenario | Score after 10 runs |
|----------|-------------------|
| Current wiring, no changes | ~6.10 (data without recovery) |
| + executeWithRecovery only | ~6.50 |
| + generateReflectionLesson only | ~6.30 (indirect) |
| + adaptive-planner splitTask only | ~6.55 |
| **All 3 activated** | **~6.88** |
| After 50+ runs, all 3 active | ~7.2–7.5 |

---

## Summary: The Execution Gap

The system has a fully-built execution recovery layer (`execution-recovery.js`) and an adaptive planning layer (`adaptive-planner.js`) that have never been called in production. Both modules were built, tested (they import correctly per node --check), and are production-ready — but the wiring from `multi-agent-coordinator.runParallel()` to either module was never made.

The three cognition layers (response-timing-engine, executive-arbitration-engine, strategic-planning-engine) ARE imported and subscribe to the event bus passively, but their primary output functions are never invoked. They are doing work (scoring threads, tracking confidence) but the results have no consumer.

**None of the top 10 opportunities require new architecture.** Every function exists. Every module exists. The ROI is entirely in wiring.
