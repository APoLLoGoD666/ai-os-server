# Phase 3: Agent Intelligence — Tracking and Performance

---

## Current Agent Tracking

Agent execution is tracked across two Supabase tables via `orchestrator.js _auditLog`.

### apex_agent_runs

Per-task record written at task completion.

| Column | Type | Description |
|---|---|---|
| task_id | uuid | Unique identifier for the task |
| objective | text | The task objective passed to the orchestrator |
| success | boolean | Whether the task completed successfully |
| cost_usd | numeric | Estimated LLM cost for the task |
| complexity | text | Complexity classification (simple/medium/complex) |
| agent_summary | jsonb | Per-role output summaries |
| duration_ms | integer | Total wall-clock time for the task |
| token_usage | jsonb | Prompt and completion token counts |

### apex_agent_stages

Per-role, per-stage record written as the orchestrator moves through execution steps.

| Column | Type | Description |
|---|---|---|
| task_id | uuid | Foreign key to apex_agent_runs |
| stage | text | Role or stage name (e.g. planner, executor, reviewer) |
| success | boolean | Whether this stage succeeded |
| error | text | Error message if failed, null otherwise |
| duration_ms | integer | Wall-clock time for this stage |
| attempt | integer | Attempt number (for retry tracking) |

---

## /api/intelligence/agent-performance Endpoint

This endpoint was added as part of Phase 3 to surface per-role analytics from the stored tracking data.

**Method:** `GET /api/intelligence/agent-performance`

**Authentication:** `requireAppAccess` (same as all intelligence routes)

**Data sources:** `apex_agent_stages` joined to `apex_agent_runs`

**Response shape:**

```json
{
  "by_role": {
    "<role_name>": {
      "total_runs": 42,
      "success_rate": 0.93,
      "avg_duration_ms": 1840,
      "p95_duration_ms": 4200,
      "most_common_errors": [
        {"error": "timeout", "count": 2},
        {"error": "rate_limit", "count": 1}
      ]
    }
  },
  "overall": {
    "total_tasks": 18,
    "success_rate": 0.89,
    "avg_cost_usd": 0.0042,
    "total_cost_usd": 0.076
  }
}
```

**Aggregation logic:**
- Groups `apex_agent_stages` rows by `stage` (role name)
- Computes success rate as `COUNT(success=true) / COUNT(*)`
- Computes avg and p95 duration from `duration_ms`
- Extracts most common non-null `error` values via frequency count
- Overall stats come from `apex_agent_runs` aggregate

---

## Gaps and Opportunities

| Gap | Impact | Effort |
|---|---|---|
| No time-series view (performance over time) | Cannot detect model degradation trends | Medium |
| No cost-per-role breakdown | Cannot identify expensive stages | Low — add cost allocation to stages |
| No retry rate metric | Attempt column exists but not surfaced | Low |
| No agent_summary query interface | Summaries stored as JSONB, not queryable | Medium |

The tracking schema is well-designed. The main opportunity is surfacing the existing data through additional aggregation endpoints rather than changing the data model.
