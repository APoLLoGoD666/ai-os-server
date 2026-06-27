# Phase A — Table Existence and CRUD Validation

**Session:** 2026-06-07  
**Validation timestamp:** 2026-06-06T23:58:04.409Z

---

## Table State

`apex_agent_stages` exists in `public` schema of Supabase project `devmtexqjstappalqbeg`.

Confirmed by live SELECT: `TABLE_EXISTS: row_count_sample=1` (from `check-stages-table.js`).

**Authoritative creation mechanism:** Supabase SQL editor  
(`https://supabase.com/dashboard/project/devmtexqjstappalqbeg/sql/new`)

```sql
CREATE TABLE IF NOT EXISTS apex_agent_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    error TEXT,
    duration_ms INTEGER,
    attempt INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_created_at ON apex_agent_stages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apex_agent_stages_stage ON apex_agent_stages (stage);
```

---

## CRUD Evidence

All operations via `@supabase/supabase-js` HTTPS client (the only functional DB path from Render).

### Baseline row count

```
BASELINE_ROW_COUNT: 77 (2026-06-06T23:58:04.409Z)
```

### INSERT

```
INSERT_OK id=7564d62e-e819-4d8b-b73b-314d71fef12f task_id=crud-verify-mq30k1h6
```

Row inserted:
- `task_id`: `crud-verify-mq30k1h6`
- `stage`: `PHASE_A_TEST`
- `success`: `true`
- `duration_ms`: `42`
- `attempt`: `1`

### READ-BACK

```
READ_OK stage=PHASE_A_TEST success=true duration_ms=42
```

Row retrieved by `id`. All fields match inserted values.

### DELETE

```
DELETE_OK id=7564d62e-e819-4d8b-b73b-314d71fef12f
```

### Post-delete verification

```
POST_DELETE_CHECK remaining=0
POST_DELETE_ROW_COUNT: 77
```

Row count returned to baseline. Table remains fully queryable after delete.

---

## Gate A Determination

| Operation | Result |
|-----------|--------|
| Table exists | **PASS** — `TABLE_EXISTS: row_count_sample=1` |
| INSERT | **PASS** — row confirmed in DB with correct values |
| READ-BACK | **PASS** — all fields match |
| DELETE | **PASS** — row removed |
| Table queryable post-delete | **PASS** — baseline row count restored |

**GATE A: CLEARED.**
