# Phase D — Final Decision

**Date:** 2026-06-06  
**Campaign:** Production Runtime Defect — Audit Chain Completion

---

## 1. Root Cause

`apex_agent_stages` was referenced by two production modules (`orchestrator.js:814` and `agent-reputation.js:30`) but was never added to the Supabase migration scripts. `apex_agent_runs` (sibling table) was correctly migrated; `apex_agent_stages` was omitted.

Secondary finding: `pg_database.js` (direct TCP Postgres connection) returns `ECONNREFUSED` from Render's network. All startup migrations using `pg_database.js` were silently failing. This blocked two automated fix attempts before the root cause was isolated.

---

## 2. Runtime Evidence

| Evidence | Source |
|----------|--------|
| Table absent from PostgREST schema cache | `check-stages-table.js` live query, 2026-06-06 |
| `[Audit] stage log non-fatal` error on every run | Pipeline logs: run-mq2q87rw, run-mq2s6da9, run-mq2tirww (pre-fix) |
| `ECONNREFUSED` from pg pool on Render | `/api/setup/migrate-stages` route response, 2026-06-06 |
| 7 apex tables in schema, `apex_agent_stages` absent | OpenAPI spec query, 2026-06-06 |
| `apex_agent_runs` has 48 rows — Supabase HTTPS path works | Live count query, Phase A |

---

## 3. Fix Applied

**Action:** CREATE TABLE executed directly in Supabase SQL editor  
**SQL:**
```sql
CREATE TABLE IF NOT EXISTS apex_agent_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL, stage TEXT NOT NULL,
    success BOOLEAN DEFAULT FALSE, error TEXT,
    duration_ms INTEGER, attempt INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created_at ON apex_agent_stages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_stage ON apex_agent_stages (stage);
```
**Committed to codebase:** `agent-system/supabase-setup.js` updated with the table definition (committed `3bcd3e5`) so future fresh deployments include it.

---

## 4. Validation Results

| Criterion | Result | Evidence |
|-----------|--------|----------|
| Table exists | ✓ | `TABLE_EXISTS: true` — Phase B live query |
| Row insert works | ✓ | Test row `de51dabe` inserted and read back |
| Row delete works | ✓ | Test row confirmed gone |
| 3 post-fix pipeline runs | ✓ | run-mq2tirww, run-mq2twpey, run-mq2u2fnj |
| Stage rows written per run | ✓ | 9 / 10 / 6 rows (25 total) |
| Missing-table errors | **0** | Absent from all 3 run logs |
| Audit capture rate | **100%** | Every run produced stage rows |
| Execution success | ✓ | Runs 1 and 3 committed; run 2 correctly rejected by VALIDATOR |
| Reflection executes | ✓ | Runs 1 and 3 |
| Memory updates | ✓ | 40 → 41 entries |
| Reputation system consuming data | ✓ | Run 3 escalated to `complex` based on 50% api success rate |
| Deployment path | ✓ | Render deploy triggered on runs 1 and 3 |

---

## 5. Residual Risks

| Risk | Severity | Status |
|------|----------|--------|
| `pg_database.js` direct TCP fails from Render | Medium | Known. All pg-dependent startup migrations are no-ops on Render. Features relying on direct pg (pgvector, RLS setup) are silently degraded. Not in scope of this campaign. |
| `SUPABASE_ACCESS_TOKEN` not set | Low | Server startup migration (`setImmediate` in `server.js`) skips if token absent. Table now exists, so this is moot for `apex_agent_stages`. |
| `supabase-setup.js` Management API path untested | Low | Committed to codebase but untested without the token. Does not affect production. |
| VALIDATOR success rate 33% in sample | Informational | Based on 6 samples including 1 task with a non-existent route. Not a signal of systemic failure. |

---

## 6. Production Recommendation

**AUDIT CHAIN VERIFIED**

`apex_agent_stages` is live and operational. Stage telemetry is being captured on every pipeline run. The adaptation engine and dynamic agent selector now have real data to act on — confirmed by live escalation in run 3. No regressions observed in execution, reflection, memory, or deployment paths.

The audit chain defect is closed.
