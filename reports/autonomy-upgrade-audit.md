# Autonomy Upgrade Audit — v2

**Date:** 2026-06-06
**Target:** 9+/10 from 7.8/10 baseline (v1 certification)

---

## Current State After v1 (7.8/10)

| Module | File | Capability | Score |
|---|---|---|---|
| Task Planner | task-planner.js | Goal decomposition, risk scoring, simulate mode | 7/10 |
| Execution Verifier | execution-verifier.js | Output validation, failure taxonomy, retry recommendations | 9/10 |
| Multi-Agent Coordinator | multi-agent-coordinator.js | Parallel execution, complexity-tier reputation routing | 7/10 |
| Episodic Memory | episodic-memory.js | Pipeline outcome storage, similarity retrieval | 8/10 |
| Reflection Engine | reflection-engine.js | Lesson scoring, memory consolidation, pattern analysis | 8/10 |
| Agent Reputation | agent-reputation.js | Per-stage success rates, latency, failure patterns | 7/10 |

---

## Gap Analysis — What 9/10 Requires

| Capability | v1 Gap | Impact on Autonomy |
|---|---|---|
| **Dynamic agent selection** | selectTier() uses complexity-tier success rate only — no per-category routing, no stage-level reputation integration | Agent routing doesn't learn from domain-specific patterns |
| **Adaptive re-planning** | decomposeGoal() is static — no context about what failed in previous attempts | Failed tasks retry the same plan that failed |
| **Task splitting** | No mechanism to split specs targeting 5+ files | Oversized tasks fail at DEVELOPER with no recovery |
| **Task merging** | No detection of related subtasks in a plan | Redundant pipeline runs waste cost |
| **Retry chain execution** | recommendRetry() advises but doesn't act — caller must implement | Retries depend entirely on orchestrator's 3-attempt loop |
| **Tier escalation path** | No structured escalation across all 4 tiers | Recovery stops at the tier the orchestrator chose |
| **Goal persistence** | No tracking of objectives across runs or sessions | No way to know what's pending, blocked, or completed |
| **Autonomy metrics** | No completion rate, retry rate, recovery rate, or score tracking | Score is static (from certification), not live |
| **Multi-stage plans** | No PLANNING→EXECUTION→VALIDATION→REFLECTION pipeline object | Agent lifecycle is opaque after the run completes |

---

## v2 Implementation — 5 New Modules

### 1. dynamic-agent-selector.js
**Addresses:** Dynamic agent selection gap

- `detectCategory(objective)` — maps objectives to 8 domains (auth, database, frontend, api, voice, agent, memory, ops)
- `getCategoryStats(category)` — per-domain success rate, avg cost, avg duration from Supabase
- `selectAgentConfig(spec)` — 3-layer escalation: category stats → DEVELOPER stage reputation (agent-reputation.js) → risk score
- `selectFallbackConfig(config)` — one-tier fallback for repeated failures

**Key improvement:** selectTier() in coordinator used complexity-tier success rates. This module uses domain-specific rates AND the existing agent-reputation.js stage data.

### 2. adaptive-planner.js
**Addresses:** Re-planning, task splitting, task merging, multi-stage plans

- `replan(goal, failureContext)` — Haiku-driven replan with failedStage, failureReason, previousPlan context
- `splitTask(spec, maxParts)` — splits oversized specs (>4 files or >7 steps) by file groups or step groups
- `mergeRelated(specs)` — merges specs that share target files or have ≥2 keyword overlaps
- `createMultiStagePlan(goal, plan)` — full lifecycle object: PLANNING → EXECUTION → VALIDATION → REFLECTION → COMPLETION
- `advanceStage / failStage / isPlanComplete` — state machine over the lifecycle

### 3. execution-recovery.js
**Addresses:** Retry chain execution, escalation paths, fallback assignment

- `buildRetryChain(spec, error, attempt)` — per-failure-type retry strategy with escalation threshold
- `executeWithRecovery(spec, runFn, agentConfig)` — runs the task, applies delays, escalates tier via dynamic-agent-selector on repeated failures
- `assignFallback(spec, config, history)` — detects 3+ recurring failures of same type → assigns fallback
- `buildEscalationPath(tier)` — shows full escalation ladder from any starting tier
- `buildRecoverySummary(attemptLog)` — recovered/totalAttempts/escalations/totalCost

### 4. goal-tracker.js
**Addresses:** Goal persistence

- Status machine: PENDING → RUNNING → COMPLETED | BLOCKED | CANCELLED
- `addGoal / startGoal / completeGoal / blockGoal / cancelGoal / retryGoal`
- Persists to vault at `System/Goals/goal-{id}.json`
- `getStats()` — total, per-status counts, completionRate, oldestPending
- `linkSubtask(parentId, subtaskId)` — parent→child objective graph

### 5. autonomy-metrics.js
**Addresses:** Live autonomy scoring

- `completionRate()` — from goal-tracker
- `retryRate(n)` — from Supabase apex_agent_runs (fallback to episodic memory)
- `recoveryRate(n)` — correlates failure episodes to later successes on same objectives
- `executionConfidence()` — success rate (50%) + episode volume (20%) + goal completion (30%)
- `computeAutonomyScore()` — 6-dimension weighted score → 0–10
- `getFullMetrics()` — full report object for dashboard/API

---

## Constraint Compliance

| Constraint | Status |
|---|---|
| No modifications to orchestrator.js | ✅ Untouched |
| No modifications to master-orchestrator.js | ✅ Untouched |
| No DB schema changes | ✅ All reads use existing apex_agent_runs / apex_agent_stages |
| No embeddings or RAG changes | ✅ Untouched |
| No security or auth changes | ✅ Untouched |
| All new files pass node --check | ✅ 5/5 PASS |
