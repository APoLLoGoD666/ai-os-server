# 07 — Database Relationships

**Date:** 2026-07-02  
**Evidence Source:** lib/pg_helpers.js, lib/pg_database.js, lib/clients.js, lib/memory/gateway.js, lib/governance.js, lib/integrity-crons.js, server.js

---

## Database Architecture Overview

Two parallel database access paths exist:

1. **Supabase JS Client** (primary) — `lib/clients.js` singleton → `lib/pg_helpers.js` → all business logic
2. **Raw pg Pool** (secondary) — `lib/pg_database.js` → schema ops + pgvector only

Additionally, several modules maintain **independent Supabase clients** (not through the singleton).

---

## lib/clients.js — Supabase Singleton

**Pattern:** Lazily initialized singleton — created once, reused.

**Exports:**
```javascript
{ getSupabaseClient, getAnthropicClient, getHoldoutClient }
```

**Used by:** lib/pg_helpers.js (primary consumer), lib/memory/gateway.js, lib/embed.js, lib/memory/*.js layers

**Connection:** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars

---

## lib/pg_helpers.js — Query Function Library

**Import:** `const supabase = require('./clients').getSupabaseClient()`

**Exports:** 63 named functions across 10 domains

### Domain Groupings and Tables

| Domain | Functions | Tables |
|--------|-----------|--------|
| Documents | pgSaveDocument, pgListDocuments, pgGetDocument, pgSearchDocuments, pgDeleteDocument, pgRenameDocument, pgUpdateDocumentSummary | `documents` |
| Memory (legacy) | pgAddMemory, pgLoadMemory, pgLoadFacts | `memory` |
| Voice Tasks | pgCreateVoiceTask, pgListVoiceTasks, pgCompleteVoiceTask | `agent_tasks` |
| Agent Actions | pgLogAgentAction, pgGetRecentAgentActions, pgGetLastUndoableAgentAction, pgMarkAgentActionUndone | `agent_actions` |
| Agent Tasks | pgCreateAgentTask, pgUpdateAgentTask, pgGetAgentTask, pgGetRecentAgentTasks, pgGetLatestWaitingAgentTask, pgCreateAgentTaskOwned | `agent_tasks` |
| Agent Schedules | pgCreateAgentSchedule, pgGetAgentSchedule, pgListAgentSchedules, pgGetAgentSchedules, pgDisableAgentSchedule, pgUpdateAgentScheduleLastRun, pgGetDueAgentSchedules | `agent_schedules` |
| Notifications | pgCreateNotification, pgListNotifications, pgMarkNotificationRead | `notifications` |
| Reflections | pgCreateAgentReflection, pgListAgentReflections, pgGetApprovedReflections, pgApproveAgentReflection | `agent_reflections` |
| Standing Approvals | pgCreateStandingApproval, pgListStandingApprovals, pgDisableStandingApproval, pgGetEnabledStandingApprovals | `standing_approvals` |
| Email Queue | pgSaveEmailQueueItem, pgGetEmailQueueItemByGmailId, pgListEmailQueue, pgUpdateEmailQueueStatus | `email_queue` |
| Finance | pgSaveTransaction, pgListTransactions, pgGetFinanceSummaryCurrentMonth, pgSaveBudget, pgListBudgets, pgGetBudgetByCategory | `transactions`, `budgets` |
| Routines | pgCreateRoutine, pgListRoutines, pgUpdateRoutine, pgDeleteRoutine, pgMarkRoutineRun | `routines` |
| Gmail Tokens | pgSaveGmailToken, pgGetGmailToken, pgClearGmailToken | `gmail_tokens` |
| Kernel — Executions | pgInsertToolExecution | `tool_executions` |
| Kernel — Approvals | pgInsertApproval, pgListApprovals | `approvals` |

### Special logic in pg_helpers

- `pgAddMemory`: keeps only last 20 rows in `memory` table (auto-trim)
- `pgCreateNotification`: dedup window logic (default 60s dedupWindowMs)
- `pgGetDueAgentSchedules`: in-memory filtering for daily/weekly cadence
- `pgSaveGmailToken`: insert-then-delete-old pattern (single token guarantee)

**Consumed by:** server.js (primary), agent-system/*, routes/*, lib/agent-task-cycle.js

---

## lib/pg_database.js — Raw pg Pool

**Purpose:** Schema operations and pgvector extension queries

**Config:**
```javascript
new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false
})
```

**Slow query logging:** Enabled — logs any query >500ms (configurable via SLOW_QUERY_MS env var)

**RLS auto-enable:** setImmediate on startup runs `ALTER TABLE IF EXISTS documents ENABLE ROW LEVEL SECURITY` + other tables

**Consumed by:**
- server.js (imported for pgvector embedding queries at startup)
- routes/observatory.js (observatory schema operations)

**Exports:** `pool` (raw Pool object)

---

## Additional Supabase Tables (from gateway.js reads)

| Table | Purpose | Writer |
|-------|---------|--------|
| `working_memory` | Layer 1 TTL working memory | lib/memory/working-memory.js |
| `episodic_memory` | Layer 2 durable episodes | lib/memory/episodic-memory-pg.js, agent-system/episodic-memory.js |
| `strategic_memory` | Layer 5 strategic goals | lib/memory/strategic-memory.js |
| `apex_lessons` | Layer 10 consolidated lessons | lib/memory/consolidation-engine.js |
| `executive_verdicts` | Executive council decisions | lib/executive/*.js (inferred) |
| `knowledge_graph` | Layer 8 KG nodes/edges | lib/memory/knowledge-graph.js |

---

## Independent Supabase Clients (NOT using lib/clients.js singleton)

These modules create their own Supabase connections:

| Module | How | Impact |
|--------|-----|--------|
| lib/governance.js | `createClient` direct (line <20) | Separate connection pool |
| lib/integrity-crons.js | `createClient` direct | Separate connection pool |
| lib/outbox-relay.js | `_sb` singleton pattern (own createClient) | Separate connection |
| lib/write-with-outbox.js | `createClient` direct | Separate connection |
| routes/intelligence.js | `_sbClient` singleton (own createClient) | Separate connection |

**Risk:** 5+ independent Supabase clients + lib/clients.js singleton = potentially 6+ simultaneous connections per process. At 220MB heap limit, connection overhead matters.

---

## Outbox / Event Tables (from lib/write-with-outbox.js and lib/outbox-relay.js)

**Purpose:** Atomic write + event outbox pattern for state changes

**write_outbox_with_state:** PL/pgSQL RPC called by lib/write-with-outbox.js → atomic write + outbox event in single transaction

**lib/outbox-relay.js:** Reads from outbox table, processes events using `_sb` singleton

**Tables (inferred):**
- `outbox` — pending events
- Per-domain state tables (written atomically with outbox)

---

## Database at Startup

**lib/pg_database.js startup probes:**
1. `pool.query('SELECT 1')` — connection health check
2. RLS enable via setImmediate (ALTER TABLE statements)

**server.js startup queries:** pgvector embedding generation, initial schema verification

**Render build command:** `node scripts/certify.js` — runs cert check against DB before deploy proceeds

---

## Supabase Storage

**Module:** `lib/storage.js` (confirmed in CLAUDE.md as key file)

**Purpose:** Supabase Storage for file operations (not raw DB)

**Integration:** Separate from pg client; uses Supabase JS storage API

---

## Migration / Schema Management

**Primary:** Supabase dashboard migrations (inferred — no migration files found in Scripts/)

**Secondary:** `lib/pg_database.js` RLS enables at startup

**Certification check:** `scripts/certify.js` → `lib/certification/checker.js` — validates DB connectivity and schema state before each deployment

---

## Database Consumer Summary

```
server.js (primary consumer via pg_helpers)
        │
        ├── lib/pg_helpers.js ──────────────► Supabase JS (lib/clients.js singleton)
        │                                              │
        ├── lib/pg_database.js ────────────► raw pg Pool (DATABASE_URL)
        │                                              │
        ├── lib/governance.js ──────────────► Supabase JS (own createClient)
        ├── lib/integrity-crons.js ─────────► Supabase JS (own createClient)
        ├── lib/outbox-relay.js ─────────────► Supabase JS (own createClient)
        ├── lib/write-with-outbox.js ───────► Supabase JS (own createClient)
        └── routes/intelligence.js ─────────► Supabase JS (own _sbClient)
```
