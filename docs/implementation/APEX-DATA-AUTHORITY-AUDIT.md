# APEX-DATA-AUTHORITY-AUDIT.md
# APEX One Platform — Data Authority Audit

**Phase:** Phase 0 Authority Audit (Re-run)
**Date:** 2026-08-19
**Authority:** Repository reality — file reads, migration inspection, git status

---

## 1. WHAT DATABASE IS AUTHORITATIVE?

**AUTHORITATIVE: Supabase Postgres (via JavaScript client)**

- Access: `lib/clients.js` → `getSupabaseClient()` → `@supabase/supabase-js`
- Auth: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Protocol: HTTPS REST API
- Used by: `lib/pg_helpers.js` (all application CRUD), all memory layers, `lib/runtime/constitutional-store.js`, all route handlers, all agent files

**SECONDARY (SCOPE EXPANDED — REGRESSION): PostgreSQL direct pool**

- Access: `lib/pg_database.js` → `pg.Pool`
- Auth: `DATABASE_URL`
- Protocol: Direct TCP connection (same underlying Postgres)
- Previously confirmed scope: RLS setup only
- **Current confirmed importers:** `lib/cron-scheduler.js`, `lib/event-consumer.js`, `lib/outbox-relay.js`, `lib/startup/index.js` (×4), `lib/startup.js` (×2), `agent-system/supabase-setup.js`
- **Risk:** pg pool writes are NOT going through Supabase RLS or the JS client's auth layer. If any of these modules write data directly via the pool, those writes bypass RLS. This is a security and consistency regression from the Aug-4 finding.

**TERTIARY (HOLDOUT): Separate Supabase instance**

- Access: `lib/clients.js` → `getHoldoutClient()`
- Auth: `SUPABASE_HOLDOUT_URL` + `SUPABASE_HOLDOUT_ANON_KEY` (anon key, respects RLS)
- Purpose: holdout evaluation dataset only

**NAMING CONFUSION — UNCHANGED:** `lib/pg_helpers.js` still uses the Supabase JS client, NOT the pg pool. The `pg_` prefix is a misleading historical artifact. The rename to `lib/supabase-helpers.js` planned in the Aug-4 audit was NOT completed.

---

## 2. WHAT TABLES STORE CONSTITUTIONAL RECORDS?

### Primary constitutional table
**`constitutional_records`** — created by migration 080

**CRITICAL:** Migration 080 is UNTRACKED (`??`) in git. It has NEVER been applied to production Supabase. In production, the `constitutional_records` table does NOT exist. All Wave 3 constitutional writes in `lib/runtime/constitutional-store.js` will fail silently in production (fire-and-forget pattern swallows errors).

Schema (from migration 080 file):
```sql
id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid()
record_type          TEXT        NOT NULL
runtime_id           TEXT        NOT NULL
baseline             TEXT        NOT NULL DEFAULT 'APEX-CONSTITUTION-v1.0'
wave                 TEXT
record_data          JSONB       NOT NULL
structural_immutable BOOLEAN     NOT NULL DEFAULT false
created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
session_id           TEXT
trace_id             TEXT
```

### Secondary constitutional-adjacent tables

| Table | Migration | Content | Status |
|-------|-----------|---------|--------|
| `consensus_sessions` | 015/016 | Old `civilisation/consensus.js` sessions | LEGACY — actively written in production |
| `governance_events` | 024 | Event spine for governance | Status UNKNOWN |
| `deployment_events` | UNKNOWN | Deployment lifecycle events (`lib/startup.js`) | ACTIVE |
| `outbox` | 026 | Async action relay (`lib/outbox-relay.js`) | ACTIVE — uses pg pool |
| `obs_record_id` propagation | 081 | Wave 3 observation record IDs | UNTRACKED |
| `domain_id` propagation | 082 | Wave 3 domain IDs | UNTRACKED |

---

## 3. WHAT TABLES STORE MEMORY?

| Table | Layer | Migration | Status |
|-------|-------|-----------|--------|
| `memory` | Episodic (general) | 001/009 | ACTIVE — core table |
| `working_memory` | Layer 1 | 009/025 | ACTIVE — session-scoped, TTL |
| `episodic_memory` | Layer 2 | 009 | ACTIVE |
| `semantic_memory` | Layer 3 | 009 | ACTIVE |
| `procedural_memory` | Layer 4 | 009 | ACTIVE |
| `strategic_memory` | Layer 5 | 009 | ACTIVE |
| `skill_memory` | Layer 6 | 009 | ACTIVE |
| `decision_memory` | Layer 7 | 009 | ACTIVE |
| `knowledge_graph_nodes` | Layer 8 | 010/019 | ACTIVE |
| `knowledge_graph_edges` | Layer 8 | 010/019 | ACTIVE |
| `reflexion_records` | Layer 11 | 030 | ACTIVE |
| `improvement_registry` | Layer 12 | 030 | ACTIVE |
| `memory_consolidations` | Layer 10 | 009 | ACTIVE |
| `agent_reflections` | Reflections | 001 | ACTIVE |

**New memory modules (governance-synthesizer, importance-engine, policy-extractor) may write to additional tables not yet identified.**

---

## 4. WHAT STORES USER CONTEXT?

| Mechanism | Location | Notes |
|-----------|----------|-------|
| JWT authentication | `lib/app-auth.js` + `lib/middleware.js` | `JWT_SECRET` env var; single-user system |
| Request context | `lib/runtime/execution-context.js` | Per-request context object |
| Session state | `lib/session-state-registry.js` | In-memory session registry |
| Session tracker | `lib/temporal/session-tracker.js` | Temporal session data; Supabase-backed |
| Working memory | `lib/memory/working-memory.js` | TTL-based session context |
| Civilization kernel | `middleware/civilization-kernel.js` | Per-request governance context |

Single user system. No multi-user auth table. `JWT_SECRET` gates all API access.

---

## 5. WHAT STORES TASKS?

| Table | File | Notes |
|-------|------|-------|
| `agent_tasks` | `lib/pg_helpers.js` → `pgCreateAgentTask()` | PRIMARY task storage |
| `agent_actions` | `lib/pg_helpers.js` → `pgLogAgentAction()` | Action log |
| `agent_schedules` | `lib/pg_helpers.js` → `pgCreateAgentSchedule()` | Scheduled task definitions |
| `apex_tasks` | Civilization opportunity engine | Civilization-triggered tasks; different schema from agent_tasks |

**Conflict unchanged:** `apex_tasks` vs `agent_tasks` — two task tables, different schemas, unclear which is canonical for civilization-triggered work.

---

## 6. WHAT STORES DECISIONS?

| Storage | Table / Location | Authority |
|---------|----------------|----------|
| Constitutional decisions | `constitutional_records` (type = CivilizationalDecision) | PRIMARY — UNTRACKED, not in production |
| Legacy consensus sessions | `consensus_sessions` | LEGACY — written by civilisation/consensus.js |
| Decision memory (Layer 7) | `decision_memory` table | Operational via memory gateway |
| Decision ledger | `lib/audit/decision_ledger.js` | Audit file |
| Lattice decisions | In-memory in `lib/runtime/decision-lattice.js` | Ephemeral per-request |
| Kernel audit log | `logs/apex_audit.ndjson` | Append-only file |

**Conflict:** `constitutional_records` (constitutional decision) vs `decision_memory` (operational decision) — two separate paths claiming "decisions"; no sync; different semantics. Additionally, constitutional_records does not exist in production.

---

## 7. WHAT STORES ACTIONS?

| Storage | Table / Location | Authority |
|---------|----------------|----------|
| Constitutional actions | `constitutional_records` (type = ActionProjection, OAR entry) | PRIMARY — UNTRACKED |
| Agent actions | `agent_actions` table | Operational log via `pgLogAgentAction()` |
| Outbox | `outbox` table (migration 026) | Async relay — uses pg pool (via outbox-relay.js) |

---

## 8. DUPLICATE STORAGE LOCATIONS

| Item | Location 1 | Location 2 | Risk |
|------|-----------|-----------|------|
| Deliberation/consensus | `constitutional_records` (Wave 3 — untracked) | `consensus_sessions` (legacy — active in production) | Dual sources; production only has legacy |
| Agent task storage | `agent_tasks` | `apex_tasks` | Two task tables, different schemas |
| Episodic memory | `lib/memory/episodic-memory-pg.js` → Supabase | `agent-system/episodic-memory.js` (legacy, imported by orchestrator.js) | Both active; dual-write risk |
| Database client | `lib/clients.js` (Supabase JS) | `lib/pg_database.js` (pg pool — scope expanded) | Same DB, different protocols, scope growing |
| Decision records | `decision_memory` | `constitutional_records` (type=CivilizationalDecision) | Different semantics; constitutional version not in production |
| Route definitions | `routes/*.js` | `src/routes/*.js` | src/routes/ duplicates unknown — may be mounted or orphaned |
| Outbox writes | `outbox` via outbox-relay.js (pg pool) | vs Supabase JS client path | Same table, two protocols |

---

## 9. MIGRATIONS STATUS

| Range | Status |
|-------|--------|
| 001–079 | Applied in production (assumed — committed in git by 2026-07-11) |
| 080 — `constitutional_records` | **UNTRACKED — NOT applied** |
| 081 — obs_record_id propagation | **UNTRACKED — NOT applied** |
| 082 — domain_id propagation | **UNTRACKED — NOT applied** |

**No migration state table exists in the repository.** Cannot confirm production state without a database query. Migration 080 is the most critical — without it, all Wave 3 constitutional writes fail silently (fire-and-forget pattern).

---

## 10. INCONSISTENT SOURCES OF TRUTH

| Domain | Issue |
|--------|-------|
| Database client naming | `pg_helpers.js` uses Supabase client; `pg_database.js` is the pg pool; names imply opposite |
| pg pool scope | Was "RLS setup only" in Aug-4 audit; now used by 8 additional modules (cron-scheduler, event-consumer, outbox-relay, startup/index, etc.) |
| Constitutional decisions | In `constitutional_records` (not in production) AND `decision_memory` (active) |
| Memory layers | 13 defined layers via gateway + obsidian (parallel) + mastra (unknown) + legacy episodic (direct in orchestrator) |
| Civilization consensus | `civilisation/consensus.js` (production, legacy) vs `lib/civilization/deliberation-registry.js` (local, untracked) |
| Agent tasks | `agent_tasks` vs `apex_tasks` |
| Routes | `routes/*.js` (canonical) vs `src/routes/*.js` (unknown — may be mounted) |
| Outbox writes | pg pool (direct TCP) vs Supabase JS in other paths — same underlying table |

---

*APEX-DATA-AUTHORITY-AUDIT.md — Phase 0 Authority Audit (Re-run) — 2026-08-19*
