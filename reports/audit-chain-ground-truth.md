# Phase A — Ground Truth

**Date:** 2026-06-06  
**Method:** Live Supabase queries via `@supabase/supabase-js` with service role key

---

## 1. Does apex_agent_stages exist?

**Evidence:**
```
TABLE_EXISTS: false
error: Could not find the table 'public.apex_agent_stages' in the schema cache
```
**Verdict: NO. Table does not exist.**

---

## 2. What apex tables ARE in the schema?

```json
["apex_timeline","apex_news_cache","apex_agent_runs","apex_memories",
 "apex_tasks","apex_calendar_events","apex_notifications"]
```
`apex_agent_stages` is absent. `apex_agent_runs` (sibling table) is present.

---

## 3. Is Supabase HTTPS connectivity working?

```
APEX_AGENT_RUNS_COUNT: 48 | error: none
```
Yes. 48 pipeline run rows exist. Every query via the Supabase HTTPS client succeeds.

---

## 4. Last confirmed pipeline runs

| task_id | success | cost_usd | created_at |
|---------|---------|----------|------------|
| run-mq2s6da9 | true | $0.164 | 2026-06-06 20:04 UTC |
| run-mq2q87rw | true | $0.171 | 2026-06-06 19:11 UTC |
| shadow-run-015 | false | $0.103 | 2026-06-06 16:30 UTC |

Both production runs succeeded. Both produced 0 rows in `apex_agent_stages` (table missing).

---

## 5. Can a row be inserted manually?

**Blocked.** Table does not exist. Insert not possible yet.

---

## 6. Can agent-reputation.js consume data?

**Blocked.** `_loadStageStats()` calls `.from('apex_agent_stages')` which returns error. Function returns `{}` (empty stats). All downstream callers (`shouldPreEscalate`, `getWeakestStage`, `getStageScores`) operate with zero data.

---

## Ground Truth Summary

| Check | Result |
|-------|--------|
| Table exists | **NO** |
| Supabase HTTPS reachable | **YES** |
| apex_agent_runs reachable | **YES** (48 rows) |
| Stage data being captured | **NO** (0 rows — table absent) |
| Reputation system operational | **DEGRADED** (zero data) |
| pg_database.js (direct TCP) | **ECONNREFUSED** from Render |
| Management API | **Needs SUPABASE_ACCESS_TOKEN** |

---

## Corrective Action Required

Run the following SQL in the Supabase SQL editor at  
`https://supabase.com/dashboard/project/devmtexqjstappalqbeg/sql/new`:

```sql
CREATE TABLE IF NOT EXISTS apex_agent_stages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id     TEXT NOT NULL,
    stage       TEXT NOT NULL,
    success     BOOLEAN DEFAULT FALSE,
    error       TEXT,
    duration_ms INTEGER,
    attempt     INTEGER DEFAULT 1,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created_at ON apex_agent_stages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_stage ON apex_agent_stages (stage);
```
