# APEX AI OS — Agent Failure Intelligence

**Date:** 2026-06-05 | **Protocol:** Phase 28 — Phase 4

---

## Problem

`apex_agent_runs` stores per-run metadata including an `agent_summary` JSON blob. This blob contains stage results but is opaque to SQL queries — you cannot `GROUP BY stage` or `COUNT WHERE stage = 'DEVELOPER' AND success = false`.

**Consequences:**
- No way to identify which stage fails most often (failure hotspot blind spot)
- No per-stage duration analytics (cannot detect slow stages)
- REFLECTOR has no structured data source to learn from
- Debugging a failed run requires reading raw JSON blobs manually

---

## Implementation

### apex_agent_stages table

```sql
CREATE TABLE IF NOT EXISTS apex_agent_stages (
  id          BIGSERIAL PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES apex_agent_runs(task_id) ON DELETE CASCADE,
  stage       TEXT NOT NULL,          -- PLANNER, RESEARCHER, DEVELOPER, REVIEWER, COMMITTER, NOTIFIER, REFLECTOR
  success     BOOLEAN NOT NULL,
  error       TEXT,                   -- null on success; error message on failure
  duration_ms INTEGER,                -- wall-clock time for this stage
  attempt     INTEGER DEFAULT 1,      -- retry attempt number
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_stages_task_id   ON apex_agent_stages(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_stages_hotspot   ON apex_agent_stages(stage, success);
CREATE INDEX IF NOT EXISTS idx_agent_stages_time      ON apex_agent_stages(created_at);
```

**Rationale for CASCADE delete:** stage rows are meaningless without their parent run; cleaning up a run cleans its stages automatically.

### _auditLog() Modification in orchestrator.js

After the existing `apex_agent_runs` upsert, a second batch insert writes one row per stage:

```js
// Determine success for each stage
const stageSuccess = {
  PLANNER:    result.plan != null,
  RESEARCHER: result.context != null,
  DEVELOPER:  (result.applied?.length ?? 0) > 0,
  REVIEWER:   result.reviewPassed !== false && !stageErrors.REVIEWER,
  COMMITTER:  result.commitHash != null,
  NOTIFIER:   !stageErrors.NOTIFIER,
  REFLECTOR:  !stageErrors.REFLECTOR,
};

// Insert rows
const stageRows = this.STAGES.map((stage, i) => ({
  task_id:     taskId,
  stage:       stage,
  success:     stageSuccess[stage] ?? false,
  error:       stageErrors[stage] ?? null,
  duration_ms: stageDurations[stage] ?? null,
  attempt:     stageAttempts[stage] ?? 1,
}));

await supabase.from('apex_agent_stages').insert(stageRows);
```

**Stage success logic:**

| Stage | Success Condition |
|-------|------------------|
| PLANNER | `result.plan != null` |
| RESEARCHER | `result.context != null` |
| DEVELOPER | `result.applied.length > 0` |
| REVIEWER | `result.reviewPassed !== false && no error` |
| COMMITTER | `result.commitHash != null` |
| NOTIFIER | no error thrown |
| REFLECTOR | no error thrown |

---

## Query Examples

### Failure hotspots (all time)
```sql
SELECT stage, COUNT(*) AS failures
FROM apex_agent_stages
WHERE success = false
GROUP BY stage
ORDER BY failures DESC;
```

### Weekly failure rate by stage
```sql
SELECT
  stage,
  COUNT(*) AS total,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) AS failures,
  ROUND(100.0 * SUM(CASE WHEN success = false THEN 1 ELSE 0 END) / COUNT(*), 1) AS failure_pct
FROM apex_agent_stages
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY stage
ORDER BY failure_pct DESC;
```

### Slowest stages (p95 duration)
```sql
SELECT stage, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms
FROM apex_agent_stages
WHERE duration_ms IS NOT NULL
GROUP BY stage
ORDER BY p95_ms DESC;
```

### Retry analysis
```sql
SELECT stage, attempt, COUNT(*) AS count
FROM apex_agent_stages
WHERE attempt > 1
GROUP BY stage, attempt
ORDER BY stage, attempt;
```

---

## Integration with Tech Debt Engine

The `_scheduleTechDebtAudit()` cron (Phase 5) queries `apex_agent_stages` for failure hotspots and includes them in the weekly report. This creates a feedback loop:

```
apex_agent_stages → tech debt report → Obsidian vault → REFLECTOR reads → future task planning
```

---

## File Changed

- `agent-system/orchestrator.js` — `_auditLog()` method extended with ~20 lines for stage row insertion
- `server.js` — `apex_agent_stages` table + 3 indexes added to migration IIFE

---

## Rollback

1. Remove the 20-line `apex_agent_stages` insert block from `_auditLog()` in orchestrator.js
2. Optionally drop the `apex_agent_stages` table from Supabase
3. No effect on existing `apex_agent_runs` data or any other system

**Non-breaking:** The insert is fire-and-forget after the main run upsert. A failure to insert stage rows logs a warning but does not fail the agent run.
