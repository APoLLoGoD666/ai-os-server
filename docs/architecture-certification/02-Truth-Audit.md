# 02 — Truth Audit

**Date:** 2026-07-02  
**Mode:** Certification — Every architectural property from the Phase 2.3 prompt classified

---

## Purpose

This document classifies every architectural property question posed in the Phase 2.3 mission against implementation evidence. Questions are taken verbatim from the mission brief.

---

## AUTHENTICATION

### Can unauthenticated execution occur?

**Verdict: YES — by design on specific endpoints**

Evidence: `GET /health`, `GET /manifest.json`, `GET /sw.js`, static CSS, `POST /auth/login`, and all `GET /api/operations/*` routes (healthz, version, status, ping, ready, metrics) execute with zero authentication. These are not bypasses — they are explicitly registered without auth middleware in server.js.

For all other routes, unauthenticated execution is prevented by `requireAppAccess` or `requireAuth`.

---

### Can authentication be bypassed?

**Verdict: YES — for dashboard auth**

Evidence: `lib/middleware.js requireAuth` Step 1: `BYPASS_DASHBOARD_AUTH === 'true' && NODE_ENV !== 'production'`. Both conditions are environment variables. An operator can set `NODE_ENV=development` and `BYPASS_DASHBOARD_AUTH=true` on any environment including production infrastructure. The enforcement relies entirely on operator discipline.

For `requireAppAccess` (API routes): no bypass path confirmed — PARTIALLY ENFORCED.

---

### Can requests enter without identity?

**Verdict: YES**

Evidence: `lib/kernel.js` Gate 1 (`resolveIdentity`) is fail-soft. Error → anonymous identity attached → `next()` called. The request proceeds carrying an anonymous identity that is structurally indistinguishable from a verified identity at the route handler level. No route handler was confirmed to reject anonymous identity.

---

## AUTHORIZATION

### Is authority always checked?

**Verdict: NO**

Evidence: `lib/kernel.js` Gate 4 (`checkGovernance`) unconditionally calls `next()`. This gate is documented as "checking standing approvals" but never blocks any request. Gate 3 (`checkAuthority`) is fail-open — error → `next()`. Both gates that constitute "authority checking" can be bypassed (one by error, one unconditionally).

---

### Can privileged operations bypass authority?

**Verdict: YES**

Evidence: `routes/operations.js POST /api/operations/migrations/run` executes raw SQL protected only by `_auth` (not `requireAppAccess`, not kernelChain authority gates). This is a privileged operation (schema mutation) with weaker-than-standard auth and no confirmed authority gate.

Additionally: checkGovernance never blocks, so all operations technically "bypass" governance authority checks in the sense that checkGovernance cannot prevent them.

---

### Is ownership consistently enforced?

**Verdict: NO**

Evidence: `resolveOwnership` (Gate 2) is fail-soft. Even when ownership resolution succeeds, no confirmed mechanism enforces that downstream route handlers respect ownership boundaries. `req.ownership` is set but its consumption by handlers is unverified across the 42 auto-loaded route files.

---

## CONSTITUTION

### Is constitutional gating mandatory?

**Verdict: PARTIALLY**

Evidence: Every request passes through `middleware/civilization-kernel.js` which calls `constitutional-gate.evaluate()`. The gate cannot be bypassed structurally. BUT the gate is fail-open — any error in evaluation returns ALLOW. The gate fires on every request; it just cannot guarantee a non-trivial outcome on error.

---

### Can constitutional validation be skipped?

**Verdict: YES — via error or timeout**

Evidence: `lib/runtime/constitutional-gate.js`: any exception → returns ALLOW. 400ms timeout → returns RESTRICT (not DENY). Validation is fired for every request but can return a permissive verdict due to implementation failure.

---

### Can requests bypass governance?

**Verdict: YES**

Evidence: 
1. `checkGovernance` in kernelChain always calls next() — governance gate is not a gate
2. `lib/governance.js` writes are fire-and-forget — governance recording is not atomic with the operation being governed
3. Any code using a direct Supabase client (5 confirmed) writes without triggering governance recording

---

## EXECUTIVE GOVERNMENT

### Can executives operate without authority?

**Verdict: YES**

Evidence: Executive council deliberation is triggered by route handlers calling executive functions. The path from route handler to `executive-council.deliberate()` does not pass through kernelChain authority gates (kernelChain is applied at `/api/*` level, but executive-specific authority for who can trigger deliberation is not confirmed).

---

### Can executive decisions bypass validation?

**Verdict: PARTIALLY**

Evidence: `executive-council.deliberate()` calls `constitutional-gate.evaluate()` indirectly (through civilization-kernel). But the CEO synthesis step (Step 9) occurs after the entity votes and produces the final decision — no separate validation of the CEO synthesis output was confirmed.

---

### Can executive delegation bypass governance?

**Verdict: YES**

Evidence: `lib/executive/entity.js decide()` calls `reflexion-tracker.recordInfluence()` but this has the confirmed bug (decisionMemoryId always null). The reflexion record is created but carries null link. Governance evidence via `_w()` is fire-and-forget and can be lost. Executive delegation records can silently fail.

---

### Can executive arbitration be skipped?

**Verdict: YES**

Evidence: `lib/executive-arbitration-engine.js` manages cognitive threads and responds to event bus emissions. It is not in any request processing path — it is a background listener. No code path was confirmed to require arbitration before proceeding with an operation. Arbitration can be bypassed by simply not emitting the relevant events.

---

## AGENT EXECUTION

### Can agents execute without approval?

**Verdict: YES — at AUTONOMY_LEVEL=3**

Evidence: `lib/agent-task-cycle.js executeApprovedAgentTask()`: "if AUTONOMY_LEVEL is `"1"` or `"2"`, return immediately with `status: 'pending_approval'`". AUTONOMY_LEVEL=3 proceeds without approval. Current production setting is AUTONOMY_LEVEL=3. This is confirmed from Phase 2.2.

---

### Can agents execute without ownership?

**Verdict: YES**

Evidence: `resolveOwnership` is fail-soft (anonymous ownership on error). Agent execution steps do not confirm re-check of ownership at step execution time. `executeApprovedAgentActions` was not fully read to confirm ownership validation inside it.

---

### Can agents bypass routing?

**Verdict: YES**

Evidence: `runtime/task-router.js route()` is called from `runAgentPlanningCycle`. Direct calls to `executeApprovedAgentTask(taskId)` from API route handlers bypass task routing classification entirely. The router is not a mandatory gate on all agent execution paths.

---

### Can agents bypass verification?

**Verdict: YES**

Evidence: `agent-system/execution-verifier.js verifyOutput()` runs after execution and verifies files exist and have valid syntax. It is not a pre-execution gate — it cannot prevent execution. Its output (pass/fail) must be acted on by the caller. If the caller ignores the result, verification has no effect.

---

## MEMORY

### Can memory be written without governance?

**Verdict: YES**

Evidence: Direct Supabase clients (5 confirmed) write to memory-related tables without calling lib/memory/gateway.js. lib/governance.js itself writes to governance tables without a higher governance layer. Even writes through the gateway trigger governance via fire-and-forget _w() — the write completes whether or not governance recording succeeds.

---

### Can memory be written without audit?

**Verdict: YES**

Evidence: `lib/memory/memory-governor.js` enforces zero quotas. `lib/memory/reflexion-tracker.js recordInfluence()` BUG causes null decisionMemoryId — the audit link is broken. Direct Supabase client writes bypass the reflexion tracking entirely. Memory can be written and the audit record will either be null-linked or absent.

---

### Can memory be modified directly?

**Verdict: YES**

Evidence: Any code with access to a Supabase client can UPDATE rows in memory tables. Five modules have own clients. Supabase RLS policies would constrain this — but RLS enforcement relies on `lib/pg_database.js` calling `SET LOCAL ROLE` or similar, and whether RLS is active on all tables was not confirmed to be enforced at runtime.

---

### Can memory quotas actually be enforced?

**Verdict: NO**

Evidence: `lib/memory/memory-governor.js` exports only utility functions (ID generation, metadata building, content hashing, lifecycle transitions). Zero quota enforcement exists. No rate limiting, size limiting, or count limiting was found in any memory write path.

---

## KNOWLEDGE

### Can knowledge bypass validation?

**Verdict: YES**

Evidence: `lib/memory/semantic-memory.js storeFact()` inserts with `status: 'candidate'`. Transition from `candidate` to `validated` — no confirmed code path was found that performs this transition. Knowledge can remain as candidate indefinitely. Whether candidate-status knowledge is used in responses is UNKNOWN.

---

### Can knowledge become authoritative without verification?

**Verdict: UNKNOWN**

Evidence: The `candidate` → `validated` transition trigger is unknown (UR04 from Phase 2.2). If queries filter to `validated` only, unverified knowledge cannot become authoritative. If queries include `candidate` status, unverified knowledge is used. The query filters in semantic search (`searchFact()`) were confirmed to use pgvector/ILIKE — status filter not confirmed.

---

## EVENTS

### Can events disappear silently?

**Verdict: YES**

Evidence:
1. `lib/event-bus.js`: in-process EventEmitter, in-memory rolling log of 200 entries. Events older than the 200-entry window are permanently lost. On process restart, all 200 in-memory events are lost.
2. `lib/event-consumer.js _handle()`: Slack notification failure is silently swallowed (`catch(err) { }`) — error not logged, event marked processed anyway.

---

### Can events fail without detection?

**Verdict: YES**

Evidence: `lib/event-consumer.js _handle()`: the catch block around `slack-agents.notifyRunFailed()` silently swallows errors. No retry. No alerting. The pipeline failure event is processed (marked in consumer_offsets) whether or not the notification delivery succeeded.

---

### Can events execute out of order?

**Verdict: YES**

Evidence: `lib/event-bus.js emit()` dispatches via `setImmediate`. Multiple rapid `emit()` calls queue as separate setImmediate callbacks. While Node.js setImmediate ordering is generally FIFO within a tick, event handler execution order depends on listener registration order and cannot be guaranteed across multiple event types with multiple listeners.

`emitSync()` is available for ordered dispatch but is not the default.

---

## RUNTIME

### Can runtime initialization fail silently?

**Verdict: YES**

Evidence: `services/init.js`: each initialization step is wrapped in individual try/catch. Any step failure is non-fatal — the cascade continues. A failed step logs an error but does not prevent subsequent steps or server startup. The process appears healthy (`/health` returns 200) even if multiple initialization steps failed.

---

### Can subsystems partially initialize?

**Verdict: YES**

Evidence:
1. `lib/goals/goal-graph._load()`: async fire-and-forget at module load. If DB is unavailable, goal-graph starts with empty in-memory Maps. No error surfaced. Attention engine uses goal-graph — weights zero for goalPriority.
2. Mastra agents: +5min deferred. If initialization fails, `getMastraStatus()` returns a degraded status in `/health`. System continues.
3. Event bus handlers: only wired if SLACK_BOT_TOKEN / NOTION_API_KEY present. Without these, AGENT_COMPLETED events are not persisted to apex_agent_runs via the event path.

---

### Can execution continue after critical failures?

**Verdict: YES**

Evidence: Services/init.js non-fatal design is explicit — individual step failure does not halt the cascade. The LLM circuit breaker opens after 5 failures but only for that model — no system-wide halt. Crisis manager at EMERGENCY state restricts operations but does not halt the HTTP server.

---

## DATABASE

### Is database consistency enforced?

**Verdict: NOT ENFORCED**

Evidence: No transaction blocks confirmed in any Phase 2.1/2.2 file reads. Multi-step operations (agent task status cycling through planned→approved→running→completed) consist of individual UPDATE calls with no atomic boundary. A process crash between steps leaves the task in an intermediate status with no guaranteed recovery.

---

### Are transactions consistently used?

**Verdict: NOT ENFORCED**

Evidence: `lib/pg_helpers.js`: 63 functions — all are individual SQL statements. `lib/governance.js onPipelineComplete()`: 15+ table writes via individual `_w()` calls. No `BEGIN`/`COMMIT`/`ROLLBACK` pattern found in any confirmed file read.

---

### Can writes bypass governance?

**Verdict: YES**

Evidence: See INV-G2 (five independent Supabase clients; governance is side-effect, not gate).

---

### Can writes bypass validation?

**Verdict: YES**

Evidence: Direct Supabase client writes bypass the access-controller in lib/memory/gateway.js. The `validateAgentSteps` function exists for agent planning but is not called on direct DB writes.

---

## APIs

### Can APIs bypass middleware?

**Verdict: PARTIALLY**

Evidence: civilization-kernel is applied to all routes via `app.use()`. But the operations endpoints (healthz, version, ping, etc.) are public — they pass through middleware but the middleware produces no auth gate for them. They "pass through" middleware without any meaningful enforcement.

---

### Can APIs bypass authentication?

**Verdict: YES — for operations endpoints**

Evidence: `GET /api/operations/healthz`, `/version`, `/status`, `/ping`, `/ready`, `/metrics` — all public, no auth. Confirmed from routes/operations.js in Phase 2.2.

---

### Can APIs bypass kernelChain?

**Verdict: PARTIALLY**

Evidence: kernelChain is applied at `app.use('/api', ...kernelChain)`. All `/api/*` routes pass through it. But kernelChain Gates 3 and 4 never block (checkAuthority fail-open, checkGovernance always next). Passing through kernelChain does not guarantee meaningful authority enforcement.

---

## DASHBOARDS

### Do dashboards display authoritative data?

**Verdict: PARTIALLY**

Evidence: Dashboard queries go through routes that query Supabase. Data is as fresh as the most recent query. BUT:
1. `lib/telemetry/aggregator.js`: snapshot write disabled (DATA-5) — civilization health snapshots may be stale
2. `lib/strategic-planning-engine.js`: pure in-memory — dashboard data for strategic objectives is process-local, not persisted, lost on restart
3. `lib/health/monitor.js`: in-memory state — health metrics reset on restart

---

### Can dashboards display stale or mock data?

**Verdict: YES**

Evidence:
1. Civilization health snapshot: if nothing writes to `civilization_health_snapshots`, `/health` returns the last-written snapshot regardless of age — no staleness check confirmed
2. `lib/goals/goal-graph.js`: `scoreGoal()` is in-memory only — dashboard goal scores may differ from DB state if in-memory Map diverges

---

### Can dashboards diverge from runtime reality?

**Verdict: YES**

Evidence: strategic-planning-engine.js maintains pure in-memory state — no dashboard route reads it. The in-memory state is authoritative at runtime but invisible to dashboards. Dashboards reflect DB state; the runtime may diverge.

---

## OBSERVABILITY

### Can failures occur without telemetry?

**Verdict: YES**

Evidence: Telemetry snapshot write disabled. Governance write failures are console-only. Event-consumer Slack failure is silently swallowed. Multiple failure paths produce no telemetry record.

---

### Can failures occur without logging?

**Verdict: YES**

Evidence: `lib/event-consumer.js _handle()` Slack failure: catch block with no logger call confirmed. Whether other silent-swallow patterns exist in unread files is UNKNOWN.

---

### Can failures occur without audit records?

**Verdict: YES**

Evidence: Governance evidence chain has gaps (fire-and-forget writes). Reflexion records have null decisionMemoryId (bug). Direct Supabase writes bypass reflexion tracking entirely. Multiple failure modes produce no audit record.

---

## RECOVERY

### Are recovery paths actually implemented?

**Verdict: PARTIALLY**

Evidence:
1. LLM circuit breaker: implemented — cooldown with exponential backoff, re-close on probe success
2. Agent task retry: execution-verifier classifies failures and recommends retry — caller must implement
3. `adaptation-cycle.repairStuckCycles()`: repairs cycles stuck in 'running' for >2h
4. No general-purpose recovery for: failed governance writes, broken reflexion links, partial task execution after crash

---

### Are retries enforced?

**Verdict: PARTIALLY**

Evidence:
1. `lib/models/runtime/index.js`: 3 retry attempts for 429, immediate fail for non-429 — enforced
2. Agent task execution retry: recommended by execution-verifier, not automatically enforced
3. Event-consumer: no retry for Slack notification failure
4. Governance writes: no retry

---

### Can failures leave inconsistent state?

**Verdict: YES**

Evidence: Agent task status cycle (planned→approved→running→completed) has no atomic transaction. Process crash between steps leaves task in intermediate status. No confirmed recovery for interrupted task status transitions. Multi-step governance writes (15+ tables) are not atomic — partial completion leaves inconsistent evidence chain.
