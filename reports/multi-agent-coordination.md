# Multi-Agent Coordinator — Implementation Report

File: agent-system/multi-agent-coordinator.js
Branch: feature/autonomy-layer

## Purpose

Wraps orchestrator.runAgentTeam for parallel execution of multiple specs. Uses reputation data from apex_agent_runs (read-only) to select model tiers dynamically. Aggregates results across all runs.

## API

| Export | Signature | Description |
|---|---|---|
| `assignWork` | `(goal, options?) → Promise<WorkResult>` | Full flow: decompose → assign → run → aggregate |
| `runParallel` | `(specs[], options?) → Promise<Result[]>` | Run specs in parallel with concurrency cap |
| `aggregate` | `(results[]) → AggregateResult` | Summarize results: success/failed/cost |
| `getReputationStats` | `() → Promise<stats\|null>` | Read apex_agent_runs for per-tier success rates |
| `selectTier` | `(spec, stats?) → Promise<tier>` | Reputation + risk → complexity tier selection |

## assignWork Options

| Option | Default | Description |
|---|---|---|
| `simulate` | `false` | Plan only — no execution; returns estimated cost |
| `concurrency` | `2` | Max parallel pipeline runs (Render 512MB ceiling) |
| `maxSubtasks` | `5` | Max subtasks from goal decomposition |

## Reputation-Based Tier Selection Logic

```
1. Query last 50 apex_agent_runs for success rates per complexity tier
2. If tier success rate < 60% → escalate one tier (e.g. moderate → complex)
3. If risk score ≥ 0.8 → escalate simple→moderate, moderate→complex
4. If no reputation data → use static complexity estimate
```

## Simulation Mode Output Example

```json
{
  "simulated": true,
  "plan": { "goal": "...", "subtasks": [...] },
  "specs": [...],
  "wouldRun": 3,
  "estimatedCost": 0.41
}
```

## Aggregate Result Schema

```json
{
  "total": 3, "success": 2, "failed": 1,
  "successRate": 0.667, "totalCostUsd": 0.212,
  "items": [{ "taskId": "...", "objective": "...", "success": true, "commitHash": "abc" }]
}
```

## Design Decisions

- **Concurrency = 2** — Render 512MB RAM. Each pipeline run peaks at ~200MB. Two concurrent runs approach the safe ceiling. Configurable via options.
- **Read-only Supabase access** — coordinator never writes to the database. Reputation queries are SELECT only.
- **Lazy reputation load** — `getReputationStats` is called once per `runParallel` invocation, not per spec. Single DB round-trip.
- **Graceful degradation** — if Supabase is unreachable, `selectTier` falls back to static complexity estimate. Never throws.
- **External wrapping only** — `runAgentTeam` is required at runtime, not at module load. This avoids circular dependencies and keeps the coordinator independent of orchestrator internals.

## Smoke Test Results

```
aggregate(mock results with 1 success, 1 review fail, 1 circuit breaker) ✅
totalCostUsd: 1.208 (correctly summed) ✅
successRate: 0.333 ✅
```
