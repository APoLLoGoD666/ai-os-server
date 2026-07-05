# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 08c · Expanded Entity Records — Block 07: Core Library Files

**Registry Version:** 1.0.0
**Date:** 2026-07-05
**Part:** Registry Part 2 — Full Attribute Expansion
**Entities:** 10 core library files (governance, kernel, database, event-bus, constitutional-gate, memory gateway, etc.)

---

### ENT-000248 — governance.js *(Expanded Record)*

**Family:** LIB | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/governance.js |
| Parent | ENT-000081 (lib/) |
| Description | Central write module for all 40 Level 9 autonomous OS governance domains. Implements fire-and-forget Supabase writes that never crash the caller. Covers execution graphs, execution nodes/edges, system events, and change classification via keyword pattern matching. |
| Purpose | Provides durable, non-blocking audit trails for every autonomous operation across all 40 OS domains; enforces Constitution Article 4 (governance writes must never crash callers). |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | agent-task-cycle.js, civilization-runtime, server.js, any pipeline component recording governance events |
| Dependencies | @supabase/supabase-js, crypto (Node built-in), os (Node built-in), ./canonical-json, ./logger, ../services/slack/slack-alerts (lazy, on error) |
| Interfaces | startExecutionGraph(), completeExecutionGraph(), recordExecutionNode(), recordExecutionEdges(), recordSystemEvent() (partial — file continues beyond 120 lines); internal _w() fire-and-forget wrapper |
| Entry Points | Imported by consumers; functions called individually per governance domain |
| Exit Points | Writes to Supabase tables: execution_graphs, execution_nodes, execution_edges; alerts to Slack on non-duplicate write failures; returns null/void (never throws) |
| Runtime Presence | ALWAYS |
| Persistence | DURABLE |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Logs warnings via ./logger on write errors; Slack alerts on failures |
| Governance Status | CONSTITUTIONAL — implements Constitution Article 4; created by migrations/005_level9_governance.sql |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Full function surface beyond line 120; total domain count confirmed as 40 by comment |

---

### ENT-000249 — kernel.js *(Expanded Record)*

**Family:** LIB | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/kernel.js |
| Parent | ENT-000081 (lib/) |
| Description | APEX v1 Kernel — composes the 4-gate request authorization chain (resolveIdentity, resolveOwnership, checkAuthority, checkGovernance) that every /api request traverses before reaching its route handler. Gates 5 (Execution) and 6 (Memory) are enforced structurally by agent-task-cycle.js and memory/gateway.js respectively. |
| Purpose | Provides a single, composable middleware array (kernelChain) that enforces identity, ownership, authority, and governance checks on all API requests; is the primary access-control chokepoint for the civilisation. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | server.js (applied to all API routes); any route file that mounts Express middleware chains |
| Dependencies | ./middleware (resolveIdentity, resolveOwnership), ./agent-file-utils (checkAuthority, checkGovernance) |
| Interfaces | exports: { kernelChain } — an ordered array of 4 Express middleware functions |
| Entry Points | Spread into Express route definitions: app.use(kernelChain) or router.use(...kernelChain) |
| Exit Points | Calls next() to pass control to route handlers after all gates pass; gates may call next(err) or res.status(403) on failure |
| Runtime Presence | ALWAYS |
| Persistence | NONE |
| Documentation | Inline comments describe each gate's responsibility |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN (delegated to middleware and agent-file-utils) |
| Governance Status | CONSTITUTIONAL — directly enforces the 4-gate governance model; Gate 4 is checkGovernance |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Exact failure behavior of each gate (deferred to middleware and agent-file-utils implementations) |

---

### ENT-000250 — pg_database.js *(Expanded Record)*

**Family:** LIB | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/pg_database.js |
| Parent | ENT-000081 (lib/) |
| Description | Creates and exports a configured node-postgres (pg) Pool connected to DATABASE_URL. Instruments pool.query with slow-query logging (threshold configurable via SLOW_QUERY_MS env var, default 500ms). On startup enables Row Level Security on the documents and memory tables. |
| Purpose | Provides the singleton PostgreSQL connection pool used by all direct SQL queries in the civilisation; ensures RLS is enforced and surfaces slow queries for performance diagnostics. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | pg_helpers.js, cron-scheduler.js (daily-briefing-pipeline), any module requiring raw SQL access |
| Dependencies | pg (npm), ./logger |
| Interfaces | exports: Pool instance (singleton); patched pool.query method with slow-query timing |
| Entry Points | require('./pg_database') returns the pool; pool is used immediately on load (SELECT 1 connectivity test) |
| Exit Points | pool.query() returns Promises of query results; logs to ./logger on errors and slow queries |
| Runtime Presence | ALWAYS |
| Persistence | DURABLE (manages persistent database connections) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Startup connectivity log; slow query warning logs; pool idle error logs |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Pool health monitoring beyond idle error events; connection retry logic |

---

### ENT-000251 — pg_helpers.js *(Expanded Record)*

**Family:** LIB | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/pg_helpers.js |
| Parent | ENT-000081 (lib/) |
| Description | High-level data access layer wrapping Supabase client calls for documents and memory tables. Provides CRUD operations for documents (save, list, get, search, delete, rename, update summary) and memory (add with auto-trim to 20 records, load, load facts). Input is sanitized via memory/sanitizer before writes. |
| Purpose | Abstracts all Postgres/Supabase document and memory operations behind typed async functions; enforces the 20-record memory rolling window and input sanitization at the data layer. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | agent-task-cycle.js (pgGetAgentTask, pgUpdateAgentTask, pgLogAgentAction, pgCreateAgentTask, pgUpdateAgentScheduleLastRun, pgGetDueAgentSchedules, pgGetApprovedReflections, pgSearchDocuments, pgInsertToolExecution), chat-context.js, any route requiring document/memory operations |
| Dependencies | ./clients (getSupabaseClient), ./memory/sanitizer |
| Interfaces | pgSaveDocument(), pgListDocuments(), pgGetDocument(), pgSearchDocuments(), pgDeleteDocument(), pgRenameDocument(), pgUpdateDocumentSummary(), pgAddMemory(), pgLoadMemory(), pgLoadFacts(); plus agent-task functions visible in agent-task-cycle.js imports |
| Entry Points | Imported by consumers; functions called individually per operation |
| Exit Points | Returns data arrays/objects or true on success; throws Error with [DB] prefix on Supabase errors |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (reads/writes Supabase Postgres) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Errors thrown with labeled context strings; no explicit logging at this layer |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Full agent-task function surface (pgGetAgentTask, pgCreateAgentTask, etc.) beyond line 120 |

---

### ENT-000252 — event-bus.js *(Expanded Record)*

**Family:** LIB | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/event-bus.js |
| Parent | ENT-000081 (lib/) |
| Description | Singleton APEX Event Bus extending Node.js EventEmitter. Provides non-blocking event emission via setImmediate (default) and synchronous emission via emitSync(). Maintains a rolling in-memory log of the last 200 events. Defines 15 canonical event type constants (VOICE_STARTED through CALENDAR_EVENT_SYNCED). Supports wildcard (*) listener for all events. |
| Purpose | Decouples all civilisation subsystems through a typed, non-blocking event backbone; prevents any listener from delaying the caller; enables session-scoped event replay and system-wide observability hooks. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | gemini-live.js (VOICE_STARTED, AUDIO_RECEIVED, REFLEX_RESPONSE_SENT, USER_INTERRUPTED, SESSION_COMPLETED), any module emitting CLAUDE_STARTED, AGENT_STARTED, AGENT_COMPLETED, TOOL_DISPATCHED, MODEL_INVOKED, EMAIL_PARSED, CALENDAR_EVENT_SYNCED |
| Dependencies | events (Node built-in) |
| Interfaces | bus.emit(type, payload), bus.emitSync(type, payload), bus.recent(n), bus.forSession(sessionId, n), bus.E / bus.EVENTS (event type constants), bus.on(type, handler) (inherited from EventEmitter) |
| Entry Points | require('./lib/event-bus') returns the singleton bus instance |
| Exit Points | Delivers events to registered listeners via EventEmitter; returns boolean true from emit(); populates rolling _log array |
| Runtime Presence | ALWAYS |
| Persistence | EPHEMERAL (in-memory rolling log only; not persisted to database) |
| Documentation | Inline JSDoc with usage examples and integration guide for gemini-live.js |
| Test Coverage | UNKNOWN |
| Observability | console.warn on unknown event types; rolling log queryable via recent() and forSession() |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Whether any consumer subscribes to the wildcard (*) listener in production |

---

### ENT-000253 — agent-task-cycle.js *(Expanded Record)*

**Family:** LIB | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/agent-task-cycle.js |
| Parent | ENT-000081 (lib/) |
| Description | Core agent execution orchestrator. Manages the full lifecycle of agent tasks: planning, step execution, scheduling, validation, and reflection generation. Defines allowed agent step types, retrieves and updates tasks via pg_helpers, builds execution context from memory/gateway and working-memory, and generates safety-constrained reflection notes via the runtime model after task completion. |
| Purpose | Enforces Gate 5 (Execution) of the kernel model; every autonomous agent action in the civilisation must flow through this module; ensures steps are validated, approved, and logged before execution. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | server.js (task dispatch routes), cron-scheduler.js (runDueSchedules), any pipeline triggering autonomous agent execution |
| Dependencies | ./models/runtime, ../agents (AGENT_PROFILES), ./memory/gateway, ./memory/working-memory, ./pg_helpers (9 functions), ./chat-context, ./workspace, ./agent-plan-utils, ./agent-step-utils, ./agent-file-utils, ./agent-execution-utils |
| Interfaces | getLatestCompletedAgentTask(), generateReflectionForTask(); full surface extends beyond line 120 |
| Entry Points | Invoked by task dispatch routes in server.js; also called by cron-scheduled task runners |
| Exit Points | Writes task status/results via pg_helpers; writes reflections to Supabase; returns task result objects |
| Runtime Presence | ON_REQUEST / ON_SCHEDULE |
| Persistence | DURABLE (task records and reflections written to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN (delegates to pg_helpers and runtime logging) |
| Governance Status | GOVERNED — enforces autonomy level checks, standing approval matching, and write-action gating; reflections require_human_approval by constitution |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Full exported function surface beyond line 120; complete step execution and scheduling logic |

---

### ENT-000254 — cron-scheduler.js *(Expanded Record)*

**Family:** LIB | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/cron-scheduler.js |
| Parent | ENT-000081 (lib/) |
| Description | Standalone recurring job scheduler extracted from server.js. Exports a single start() function that registers all time-based jobs: 5-minute periodic telemetry (memory/CPU), 6-hour retention purges across 7 Supabase tables (apex_notifications, apex_agent_runs, agent_tasks, email_queue, apex_agent_stages, apex_lessons, cron_logs), nightly wiki consolidation at 3am, and daily briefing note generation at 7am. |
| Purpose | Owns all time-based housekeeping for the civilisation; keeps Supabase tables lean via retention windows; generates daily intelligence briefings; triggers nightly knowledge consolidation. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | server.js (calls start() once inside app.listen() after server is stable) |
| Dependencies | ./logger, ./clients (getSupabaseClient), ./models/runtime, ./cron-logger (lazy), ../agent-system/wiki-reader (lazy), ../agent-system/obsidian-memory (lazy), ../agent-system/obsidian-client (lazy), ../services/pipelines/daily-briefing-pipeline (lazy), ./pg_database (lazy) |
| Interfaces | exports: { start() } |
| Entry Points | start() called once at server startup |
| Exit Points | Registers setInterval and setTimeout callbacks; writes to Supabase (deletions); writes Obsidian briefing files; triggers wiki consolidation |
| Runtime Presence | ON_STARTUP (registers intervals); then ALWAYS (intervals fire continuously) |
| Persistence | DURABLE (retention deletes are permanent; briefing files written to Obsidian vault) |
| Documentation | Inline comments per job block |
| Test Coverage | UNKNOWN |
| Observability | _log.info/warn per job run; cron-logger.record() for daily briefing and wiki; console.warn on errors |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Jobs defined beyond line 120; full set of cron intervals in server.js (noted as remaining there) |

---

### ENT-000255 — embed.js *(Expanded Record)*

**Family:** LIB | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/embed.js |
| Parent | ENT-000081 (lib/) |
| Description | Shared embedding utility with primary/fallback provider strategy. Primary: Voyage AI voyage-3-lite (1024-dim, configurable output dimension) when VOYAGE_API_KEY is set. Fallback: Google Gemini gemini-embedding-001 (768-dim, outputDimensionality override for vault_embeddings schema compatibility) when GOOGLE_API_KEY or GEMINI_API_KEY is set. Implements per-provider 429 backoff (1-minute suppression). Uses raw HTTPS requests with no SDK dependency. |
| Purpose | Provides vector embeddings for semantic search across the memory and document layers; schema-compatible with vault_embeddings (vector(768)); enables similarity retrieval in memory/gateway. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | memory/gateway.js (_getSemanticFacts, knowledge graph retrieval), any module requiring text-to-vector conversion |
| Dependencies | https (Node built-in); env vars: VOYAGE_API_KEY, GOOGLE_API_KEY / GEMINI_API_KEY |
| Interfaces | exports: { embedText(text, options?) } — returns float array or null |
| Entry Points | embedText(text, { dimensions }) called by memory subsystem |
| Exit Points | Returns embedding float array on success; returns null if both providers fail or are in 429 backoff |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE |
| Documentation | JSDoc header with provider strategy and schema compatibility notes |
| Test Coverage | UNKNOWN |
| Observability | console.warn on provider errors; silent null return on 429 backoff |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Whether dimension override (default 768) is always respected by Voyage provider |

---

### ENT-000256 — constitutional-gate.js *(Expanded Record)*

**Family:** LIB-RUNTIME | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/runtime/constitutional-gate.js |
| Parent | ENT-000081 (lib/runtime/) |
| Description | Runtime constitutional evaluation layer. Exports evaluate(ctx, options) which runs four constitution module checks in sequence — authority resistance, risk assessment, modification governance, and (beyond line 120) deception detection and confabulation guard — each with a shared 400ms deadline. Fail-open: any timeout or thrown error degrades verdict to WARN rather than dropping the request. Returns a structured verdict (ALLOW/WARN/RESTRICT/DENY) with full audit trail. |
| Purpose | Provides per-request constitutional compliance checking that enforces authority, risk thresholds, and self-modification governance; acts as the primary runtime safety layer before any sensitive operation executes. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | kernel.js (checkGovernance gate), server.js (sensitive API routes), agent-task-cycle.js (pre-execution check) |
| Dependencies | ../constitution/authority-resistance, ../constitution/risk-monitor, ../constitution/modification-governor, ../constitution/deception-detector, ../constitution/confabulation-guard |
| Interfaces | exports: evaluate(ctx, options) → { verdict, auditTrail, risks, riskScore }; VERDICT constants (ALLOW, WARN, RESTRICT, DENY, BLOCK) |
| Entry Points | evaluate(ctx, options) called synchronously per request; ctx includes identity.roles and metadata.path |
| Exit Points | Returns verdict object; never throws (fail-open contract) |
| Runtime Presence | ALWAYS |
| Persistence | NONE |
| Documentation | Inline header comment explaining fail-open policy and wired constitution modules |
| Test Coverage | UNKNOWN |
| Observability | auditTrail array in returned verdict captures each check result including failOpen flags |
| Governance Status | CONSTITUTIONAL — directly implements and enforces the APEX constitution at runtime |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Steps 4 (deception-detector) and 5 (confabulation-guard) checks beyond line 120; _failOpen() implementation |

---

### ENT-000257 — gateway.js (memory) *(Expanded Record)*

**Family:** LIB-MEMORY | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/lib/memory/gateway.js |
| Parent | ENT-000081 (lib/memory/) |
| Description | The single authorised entry point for all memory access in the civilisation. Implements getContext() which assembles a full Context Package from 11 parallel memory layers (founder context, lessons, policies, historical, project context, semantic facts, working memory, skill memory, knowledge graph nodes, SIE briefing, executive verdicts) with a 60-second cache. Also implements searchMemory() for cross-layer keyword and similarity search. Enforces access control via AccessController; sanitizes inputs; tracks reflexion retrieval; links lessons to tasks via working memory. |
| Purpose | Enforces Gate 6 (Memory) of the kernel model; no model, agent, or pipeline reads memory directly — all must call this gateway; provides rich, structured context packages that drive agent planning and execution. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | agent-task-cycle.js (_gateway imported), any pipeline or agent requiring context assembly; kernel enforces structural routing through this module |
| Dependencies | ./index (mem), ./access-controller (AccessController), ./sanitizer, ./cache, ./founder-memory, ../clients (getSupabaseClient), ../logger, ../health/monitor, ./reflexion-tracker (lazy), ./working-memory (lazy), ../consumption-log (lazy) |
| Interfaces | getContext({ taskId, description, category, complexity, modelFormat, tokenBudget, requestingEntity }), searchMemory({ query, layers, limit, requestingEntity }); additional functions beyond line 120 |
| Entry Points | getContext() called by agent-task-cycle and orchestration layer; searchMemory() called by search-capable routes |
| Exit Points | Returns structured Context Package (pkg) or cached version; writes lesson-task linkage to working memory; records reflexion retrievals; logs to consumption-log |
| Runtime Presence | ON_REQUEST |
| Persistence | EPHEMERAL (60s in-memory cache); reads from DURABLE Supabase layers |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | healthMonitor.recordReflexionWrite(); logger.warn on retrieval failures; consumption-log.record() per call |
| Governance Status | GOVERNED — enforces access control per requesting entity; structurally enforced by kernel as Gate 6 |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | searchMemory() full implementation beyond line 120; writeMemory() surface if present; full access control layer definitions |

---

*End of 08c — Block 07 Core Lib Full Attribute Expansion*
