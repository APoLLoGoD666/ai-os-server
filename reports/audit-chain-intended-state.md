# Phase 3 — Intended State

**Date:** 2026-06-06

---

## Evidence Summary

### Evidence A: Code was written to write to this table

`orchestrator.js:797–817` contains a fully implemented stage logging block. It maps `agentLogs` to typed rows with 7 columns and inserts them. This is not a stub — it processes real runtime data from every pipeline execution.

### Evidence B: Code was written to read from this table

`agent-reputation.js` is a 200-line module whose entire purpose is to read `apex_agent_stages`, compute statistics, and expose them to the adaptation engine and agent selector. It has a 5-minute cache, p95 latency computation, failure pattern detection, and pre-escalation logic. This module is actively called from 8 callsites in production code.

### Evidence C: Reports reference the table as operational

- `reports/agent-baseline.md:70`: `"Schema exists, no API route"` — documents this table as existing (incorrect — this was aspirational documentation written before the migration was run)
- `reports/adaptation-report.md:241`: References `apex_agent_stages` as a data source for stage failure rates

### Evidence D: No deprecation evidence

No comment, no migration removal, no conditional skip, no environment flag gates this table. The write path has no `if (STAGES_ENABLED)` guard. The read path has no fallback to an alternative source. Both paths are unconditional.

### Evidence E: Migration gap is the only explanation

`apex_agent_runs` (the sibling table) IS in `supabase-setup.js:198`. `apex_agent_stages` was likely added to the codebase after the initial migration run, or was accidentally omitted when `apex_agent_runs` was added. The omission is isolated and consistent across all migration files.

---

## Determination

**A) Table should exist.**

This is a migration omission, not an obsolete code path.

---

## Required Schema

Derived from writer (`orchestrator.js:799–812`) and reader (`agent-reputation.js:31–32`):

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
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created_at 
    ON apex_agent_stages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_stage 
    ON apex_agent_stages (stage);
```

The index on `created_at DESC` matches the reader's `.order('created_at', { ascending: false }).limit(300)` query pattern. The index on `stage` supports the per-stage grouping done in `_loadStageStats()`.
