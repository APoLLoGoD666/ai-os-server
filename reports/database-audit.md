# Database Audit — Phase 7
*Audited: 2026-06-05*

---

## Schema Sources

| File | Purpose |
|---|---|
| agent-system/supabase-setup.js | CREATE TABLE for all tables; called at startup (server.js line 10896) |
| supabase-rls.sql | RLS policies for 11 tables |
| supabase-task-tables.sql | apex_notifications, apex_timeline, apex_agent_runs |
| supabase-indexes.sql | 25+ performance indexes |
| pg_helpers.js | All application-layer CRUD functions |
| pg_database.js | node-pg Pool connection |
| database.js | Local SQLite fallback (documents, memory) |

**Migration runner:** `supabase-setup.js` is called via `createAllTables()` at server startup. All tables are `CREATE TABLE IF NOT EXISTS` — idempotent ✅

---

## Table Classification

### ACTIVE (defined + pg_helpers.js CRUD)

| Table | RLS | Indexes | pg_helpers functions |
|---|---|---|---|
| agent_actions | ✅ | ✅ | 4 |
| agent_reflections | ✅ | ✅ | 4 |
| agent_schedules | ✅ | ✅ | 6 |
| agent_tasks | ✅ | ✅ | 6 |
| budgets | ✅ | ✅ | 3 |
| documents | ❌ | ✅ | varies |
| email_queue | ✅ | ✅ | 4 |
| gmail_tokens | ✅ | ✅ | 3 |
| memory | ❌ | ✅ | varies |
| notifications | ✅ | ✅ | 3 |
| routines | ✅ | ✅ | 6 |
| standing_approvals | ✅ | ✅ | 4 |
| transactions | ✅ | ✅ | 3 |

**RLS gap:** `documents` and `memory` have no RLS policies. Low risk (service-role only access, no anon key used).

---

### DEAD (CREATE TABLE exists, no pg_helpers.js functions)

These 32 tables are created at startup by supabase-setup.js but have no CRUD layer in pg_helpers.js. Some are accessed directly in routes/*.js.

**Route-accessed (likely active):**
- apex_agent_runs — queried in intelligence.js, server.js weekly review aggregation
- apex_notifications — queried in server.js (purge cron, notifications route)
- apex_timeline — queried in operations/dashboard routes

**Route-orphaned (no route or helper accesses them):**
```
apex_agents, assignments, body_measurements, briefing_history,
calendar_events, clients, contacts, deals, email_threads,
expense_reports, fasting_sessions, flashcards, habit_logs,
invoices, journal_entries, meal_logs, meeting_summaries,
mindfulness_logs, mood_logs, projects, reading_list, reminders,
routine_suggestions, sleep_logs, spiritual_sessions,
subscriptions, supplement_logs, university_sessions, workout_logs
```

These are **infrastructure for future agent roles** (Finance Agent, Uni Agent, Business Agent) — not dead code, just unlaunched.

---

### GHOST (used in pg_helpers.js, no CREATE TABLE)

**ZERO ghost tables.** All 13 active tables have CREATE TABLE statements. ✅

---

## Dual Database Architecture

APEX AI OS uses two Postgres connections simultaneously:

| Connection | File | Used for |
|---|---|---|
| Supabase JS client | lib/clients.js → @supabase/supabase-js | All agent/app data |
| node-pg Pool | pg_database.js | pgvector, heavy analytics, pgAdmin queries |

Both point to the same Supabase Postgres instance. This is intentional — pgvector requires raw SQL not supported by the Supabase JS client.

**SQLite local fallback** (database.js) — legacy from pre-Supabase era. Still imported by server.js but Supabase is preferred. Can be removed once confirmed unused in prod.

---

## apex_sync_checkpoints

Created by `services/sync/supabase-notion-sync.js` via `ensureCheckpointTable()` at startup:
```sql
CREATE TABLE IF NOT EXISTS apex_sync_checkpoints (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
)
```
Currently used for: `sync:agent_runs:last_synced_at`

**Gap:** No RLS, no index on `key`. Low risk (primary key = implicit index). RLS not needed (service-role only).

---

## Performance

- 25+ indexes cover all query paths in pg_helpers.js ✅
- Unique constraint on `email_queue(gmail_id)` prevents duplicate email processing ✅
- Unique constraint on `budgets(category, month, year)` prevents duplicate budget records ✅
- No N+1 query patterns identified in pg_helpers.js
- pgvector `match_documents` function created at startup for similarity search ✅

---

## Risk Summary

| Risk | Severity | Status |
|---|---|---|
| Ghost tables (used but no schema) | CRITICAL | ✅ NONE |
| Missing RLS on documents/memory | MEDIUM | ⚠️ OPEN |
| 29 unlaunched tables consuming schema space | LOW | ℹ️ INTENTIONAL |
| SQLite fallback confusion | LOW | ⚠️ OPEN (remove when confirmed unused) |
| apex_sync_checkpoints no RLS | INFO | Acceptable |
