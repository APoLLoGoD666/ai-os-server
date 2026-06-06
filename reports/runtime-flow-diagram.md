# Runtime Flow Diagram — APEX AI OS Autonomy Layer
**Date:** 2026-06-06

---

## Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  ENTRY POINTS                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐ │
│  │ POST /api/run   │  │ POST /autonomy/ │  │ _startAutoPipeline() │ │
│  │ (single task)   │  │ assign          │  │ (scheduled cron)     │ │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬───────────┘ │
└───────────┼─────────────────────┼───────────────────────┼────────────┘
            │                     │                       │
            ▼                     ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PLANNING LAYER                                                      │
│                                                                      │
│  task-planner.decomposeGoal(goal)                                    │
│    ├─ scoreRisk(objective)          → float 0-1                      │
│    ├─ Claude API (simulate=false)   → subtask list                   │
│    └─ planToSpecs(plan)             → spec[]                         │
│                                                                      │
│  adaptive-planner.isOversized(spec) → split if tokens > 8000        │
│  (currently: oversized detection only, replan not yet wired)         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ spec[]
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  COORDINATION LAYER  (multi-agent-coordinator)                       │
│                                                                      │
│  runParallel(specs, { concurrency: 2 })                              │
│    │                                                                  │
│    ├─ dynamic-agent-selector.selectAgentConfig(spec)                 │
│    │    ├─ detectCategory(objective)  → auth|db|frontend|api|...     │
│    │    ├─ getStageHealthStats()      → per-stage success rates       │
│    │    ├─ risk escalation            → tier bump if risk ≥ 0.8      │
│    │    └─ returns { tier, category, models, escalated }             │
│    │                                                                  │
│    └─ orchestrator.runAgentTeam(spec, taskId)  ─────────────────────┐│
└───────────────────────────────────────────────────────────────────── ││
                                                                        ││
┌──────────────────────────────────────────────────────────────────────┘│
│  EXECUTION LAYER  (orchestrator.js)                                    │
│                                                                        │
│  goal-tracker.startGoal(taskId)  ← non-blocking setImmediate          │
│                                                                        │
│  RESEARCHER   → wiki-reader + vector search + Supabase context        │
│       │                                                                │
│  ARCHITECT    → system prompt + cached context → architecture plan     │
│       │                                                                │
│  DEVELOPER    → file writes to git worktree (os.tmpdir())             │
│       │                                                                │
│  ┌────┴──────────────────────────────────────────────┐                │
│  │ execution-verifier.verifyOutput(spec, log, root)  │ ← NEW          │
│  │   ├─ checkEmptyFiles()   → flag zero-byte outputs │                │
│  │   ├─ checkMissedTargets() → flag unwritten files  │                │
│  │   └─ structuralSyntaxCheck() → node --check       │                │
│  │                                                    │                │
│  │   FAIL → rollback() → retry (up to MAX_ATTEMPTS)  │                │
│  └────────────────────────────────────────────────────┘                │
│       │ pass                                                           │
│  REVIEWER    → Claude code review of diff                             │
│       │                                                                │
│  VALIDATOR   → acceptance criteria check                              │
│       │                                                                │
│  TESTER      → test generation                                         │
│       │                                                                │
│  COMMITTER   → git commit to worktree                                 │
│       │                                                                │
│  REFLECTOR   → episodic-memory.recordEpisode()  (async)              │
│                                                                        │
│  goal-tracker.completeGoal(taskId, outcome) ← non-blocking           │
│  goal-tracker.blockGoal(taskId, error)      ← on any failure path    │
│                                                                        │
│  returns { success, commitHash, cost, agentLogs, complexity }         │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
┌────────────────────────────────▼───────────────────────────────────────┐
│  POST-EXECUTION  (coordinator result assembly)                          │
│                                                                         │
│  execution-verifier.summarizeExecution(spec, agentLogs, result)        │
│    └─ { retryStrategy, outputVerified, failureType, confidence }       │
│                                                                         │
│  aggregate(results)                                                     │
│    └─ { total, success, failed, successRate, totalCostUsd, items[] }   │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │
┌────────────────────────────────▼───────────────────────────────────────┐
│  METRICS / LEARNING LAYER                                               │
│                                                                         │
│  autonomy-metrics.getFullMetrics()                                      │
│    ├─ episodic-memory.getSuccessRate()      → executionSuccess dim      │
│    ├─ episodic-memory.getFailureEpisodes()  → recovery dim              │
│    ├─ goal-tracker.getStats()               → goalCompletion dim        │
│    ├─ Supabase apex_agent_runs              → retryRate dim             │
│    └─ composite score (0-10):                                           │
│         executionSuccess × 0.30                                         │
│         lowRetryRate     × 0.15                                         │
│         recovery         × 0.20                                         │
│         goalCompletion   × 0.20                                         │
│         confidence       × 0.10                                         │
│         episodeRichness  × 0.05                                         │
│                                                                         │
│  reflection-engine.analyzeFailures(failures)                            │
│  reflection-engine.buildPerformanceSummary(episodes)                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## API Route Map

```
GET  /api/autonomy/score          → autonomy-metrics.computeAutonomyScore()
GET  /api/autonomy/metrics        → autonomy-metrics.getFullMetrics()
POST /api/autonomy/plan           → task-planner.decomposeGoal()       [simulate:true]
POST /api/autonomy/assign         → multi-agent-coordinator.assignWork() [simulate:true]
GET  /api/autonomy/goals          → goal-tracker.getGoals(status?)
PATCH /api/autonomy/goals/:id/status → goal-tracker lifecycle mutations

All routes: requireAppAccess middleware
```

---

## Goal State Machine

```
addGoal(objective, meta)
      │
      ▼
  PENDING ──────────────────────────────────────────────────────► CANCELLED
      │                                                            (cancelGoal)
      │ startGoal(id)
      ▼
  RUNNING ─────────────────────────────────────────────────────► BLOCKED
      │                                                            (blockGoal)
      │ completeGoal(id, outcome)
      ▼
  COMPLETED
```

Vault path: `System/Goals/{id}.json`

---

## Failure Recovery Path

```
orchestrator failure
    │
    ├─ attempt < MAX_ATTEMPTS → continue (retry loop)
    │       │
    │       ├─ attempt 1-3: same tier
    │       └─ attempt N: escalate tier via dynamic-agent-selector
    │
    └─ attempt == MAX_ATTEMPTS → _fail(lastFailure)
            │
            ├─ goal-tracker.blockGoal()     [non-blocking]
            ├─ _rollback()                  [remove worktree]
            └─ return { success: false, error }

execution-recovery.buildRetryChain() — determines per-failure-type retry budget:
    NO_FILES  → 2 retries, escalate immediately
    SYNTAX    → 2 retries, escalate immediately
    REVIEW    → 2 retries, escalate after 1
    TIMEOUT   → 3 retries, escalate after 2
    BUDGET    → 0 retries (no retry)
    API       → 3 retries, escalate after 2
```

---

## Module Dependency Graph

```
server.js
  └─ agent-system/
       ├─ orchestrator.js
       │    ├─ dynamic-agent-selector.js
       │    │    └─ (no local deps)
       │    ├─ execution-verifier.js
       │    │    └─ (no local deps)
       │    ├─ goal-tracker.js
       │    │    └─ (vault I/O only)
       │    ├─ agent-reputation.js
       │    ├─ wiki-reader.js
       │    └─ [all 8 agent stage modules]
       │
       ├─ multi-agent-coordinator.js
       │    ├─ task-planner.js
       │    │    └─ (Claude API + complexity scoring)
       │    ├─ execution-verifier.js
       │    ├─ dynamic-agent-selector.js
       │    └─ orchestrator.js  (lazy require inside runParallel)
       │
       └─ autonomy-metrics.js
            ├─ episodic-memory.js
            ├─ reflection-engine.js
            ├─ goal-tracker.js
            └─ Supabase (read-only)
```

No circular dependencies. `task-planner.js` duplicates `estimateComplexity` from orchestrator (intentional — avoids `task-planner→orchestrator` cycle). Extraction to `lib/complexity-classifier.js` is the recommended long-term fix.
