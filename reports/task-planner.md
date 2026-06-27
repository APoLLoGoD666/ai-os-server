# Task Planner — Implementation Report

**File:** `agent-system/task-planner.js`
**Branch:** feature/autonomy-layer
**Date:** 2026-06-06

## Purpose

Decomposes high-level goals into independently-executable subtasks. Estimates complexity and risk without API calls. Converts decomposed plans into orchestrator-compatible spec objects. Supports simulation mode (zero cost, returns plan structure only).

## API

| Export | Signature | Description |
|---|---|---|
| `decomposeGoal` | `(goal, options?) → Promise<Plan>` | Calls Claude Haiku to break goal into subtasks |
| `estimateComplexity` | `(specOrGoal) → 'simple'\|'moderate'\|'complex'\|'critical'` | Static rule-based, mirrors orchestrator classifier |
| `scoreRisk` | `(goal) → 0.0–1.0` | Static risk score: 0.9=high, 0.5=medium, 0.2=low |
| `planToSpecs` | `(plan) → spec[]` | Converts plan.subtasks → orchestrator spec objects |

## decomposeGoal Options

| Option | Default | Description |
|---|---|---|
| `simulate` | `false` | If true, skip API call, return goal as single subtask |
| `maxSubtasks` | `5` | Cap on number of subtasks generated |

## Plan Object Schema

```json
{
  "goal": "string",
  "complexity": "simple|moderate|complex|critical",
  "risk": 0.0,
  "simulated": false,
  "subtasks": [
    {
      "objective": "one-sentence task",
      "filesToModify": ["server.js"],
      "steps": ["step 1"],
      "complexity": "moderate",
      "risk": 0.2,
      "rationale": "why this subtask exists"
    }
  ]
}
```

## Design Decisions

- **Haiku model only** — decomposition is a classification task, not a reasoning task. Haiku is 5x cheaper than Sonnet.
- **Graceful degradation** — if API call fails or ANTHROPIC_API_KEY is absent, returns the goal as a single-subtask plan. Never throws.
- **Mirrors orchestrator classifier** — `estimateComplexity` uses the same keyword rules as `_classifyComplexity` in orchestrator.js. Ensures consistency without importing internal functions.
- **Prompt caching** — system prompt uses `cache_control: ephemeral` for repeated calls.
- **No DB writes** — planner is read-only, no side effects beyond the API call.

## Smoke Test Results

```
estimateComplexity('rewrite auth middleware with JWT') → 'critical' ✅
estimateComplexity('add route to health.js')           → 'simple'   ✅
scoreRisk('change password hashing algorithm')         → 0.9        ✅
scoreRisk('reformat the config file')                  → 0.2        ✅
planToSpecs()                                          → valid spec  ✅
```
