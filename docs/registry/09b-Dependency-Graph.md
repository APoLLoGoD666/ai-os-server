# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 09b · Dependency Graph — Entity Relationships

**Registry Version:** 1.0.0
**Date:** 2026-07-05
**Part:** Registry Part 3 — Relationship Mapping
**Scope:** All 51 fully attributed entities (Blocks 01–03, key Block 06–07, Block 22)

---

## How to Read This Graph

Each entry shows: ENT-ID → Name → what it DEPENDS ON → what CONSUMES it.
Relationships are directional: A depends on B means A requires B to function.
Evidence: all relationships confirmed by direct file reads or env var inspection.

---

## 1. Civilisation Spine (Critical Path)

Execution path from incoming HTTP request to route handler. Every `/api` request traverses all 4 kernel gates before reaching its route handler (confirmed: `lib/kernel.js` lines 4–23).

```
HTTP Request
  → ENT-000040 (server.js)
    → ENT-000041 (instrument.js) [loaded first, side-effect only]
    → ENT-000249 (kernel.js) [4-gate auth chain]
      → ENT-001131 (lib/middleware.js) [resolveIdentity, resolveOwnership — Gate 1 & 2]
      → ENT-000248 (governance.js) [score computation — Gate 3 & 4 authority/governance checks]
        → ENT-000024 (Supabase) [createClient — lazy singleton _sb()]
        → lib/canonical-json.js [payload hashing]
        → lib/logger.js [fire-and-forget write logging]
      → ENT-000256 (constitutional-gate.js) [constitutional checks — post-gate enforcement]
        → lib/constitution/authority-resistance
        → lib/constitution/risk-monitor
        → lib/constitution/modification-governor
        → lib/constitution/deception-detector
        → lib/constitution/confabulation-guard
    → ENT-001130 (civilization-kernel.js) [audit writes per-request]
      → ENT-000024 (Supabase) [audit table writes]
    → [Route Handler] (Block 08 routes)
      → ENT-000251 (pg_helpers.js) [DB operations]
        → ENT-000250 (pg_database.js) [connection pool]
          → ENT-000024 (Supabase) [external — terminal dependency]
```

**Evidence:** `lib/kernel.js` exports `kernelChain = [resolveIdentity, resolveOwnership, checkAuthority, checkGovernance]` (line 18–23). `lib/governance.js` line 7 confirms `createClient` from `@supabase/supabase-js` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Memory Pipeline

All memory access in APEX flows through `lib/memory/gateway.js`. No model, agent, or pipeline component reads memory directly (confirmed: `gateway.js` lines 1–4).

```
Agent request for context
  → ENT-000257 (memory/gateway.js) [11-layer fan-out via Promise.allSettled]
    → Layer 0:  founder_memory      (_getFounderContext)
    → Layer 1:  episodic_memory     (_getHistorical)
    → Layer 2:  semantic_memory     (_getSemanticFacts)
    → Layer 3:  procedural_memory   (_getSkillSummary)
    → Layer 4:  strategic_memory    (_getPolicies)
    → Layer 5:  working_memory      (_getWorkingMemory)
    → Layer 6:  project_context     (_getProjectContext)
    → Layer 7:  lessons             (_getLessons)
    → Layer 8:  knowledge_graph     (_getKnowledgeNodes)
    → Layer 9:  sie_briefing        (_getSIEBriefing)
    → Layer 10: executive_verdicts  (_getExecutiveVerdicts)
      → lib/memory/index.js         [layer implementations]
      → lib/memory/access-controller.js [per-layer access control]
      → lib/memory/sanitizer.js     [output sanitisation]
      → lib/memory/cache.js         [read-through cache]
      → lib/memory/founder-memory.js [Layer 0 — founder context]
      → lib/memory/working-memory.js [Layer 5 — working memory]
      → lib/clients.js              [getSupabaseClient()]
        → ENT-000250 (pg_database.js)
          → ENT-000024 (Supabase) [external — terminal dependency]
      → lib/health/monitor.js       [health telemetry]
      → lib/logger.js
  → ENT-000255 (embed.js) [for semantic search — Layer 2 semantic_memory]
    → ENT-000018 (Voyage AI API) [primary embedding model]
    → ENT-000012 (Google Gemini API) [fallback on HTTP 429]
```

**Evidence:** `gateway.js` lines 39–51 show `Promise.allSettled([...])` fanning out to 11 functions. Lines 6–14 confirm all internal module imports. `getSupabaseClient` from `lib/clients` confirmed line 11.

---

## 3. Agent Execution Pipeline

Task routing from incoming work item through orchestration layers to domain agent action.

```
Incoming task
  → ENT-000258 (master-orchestrator.js) [scheduling, cognition-weights cache]
    → ENT-000259 (orchestrator.js) [routing matrix, circuit breaker]
      → ENT-000253 (agent-task-cycle.js) [task lifecycle — planning, execution, validation]
        → lib/models/runtime.js          [model selection]
        → agents/index.js                [AGENT_PROFILES]
        → ENT-000257 (memory/gateway.js) [context assembly]
        → lib/memory/working-memory.js   [working memory ops]
        → ENT-000251 (pg_helpers.js)     [9 pg* task helpers]
          → pgGetAgentTask
          → pgUpdateAgentTask
          → pgLogAgentAction
          → pgCreateAgentTask
          → pgUpdateAgentScheduleLastRun
          → pgGetDueAgentSchedules
          → pgGetApprovedReflections
          → pgSearchDocuments
          → pgInsertToolExecution
        → ENT-000252 (event-bus.js) [async dispatch]
        → lib/chat-context.js            [createAgentNotification, loadMemory]
        → lib/workspace.js               [listWorkspaceFiles, getRelevantDocuments]
      → ENT-000263 (agent-registry.js) [pure data — no runtime deps]
      → ENT-000262 (domain-agents.js) [prompt dispatch — no external deps]
      → ENT-000260 (finance_agent.js) [domain action — finance domain]
        → ENT-000251 (pg_helpers.js)
        → ENT-000259 (orchestrator.js) [LLM calls]
          → ENT-000010 (Anthropic API)
          → ENT-000011 (Claude claude-sonnet-4-6)
      → ENT-000261 (email_agent.js) [domain action — email domain]
        → ENT-000022 (Gmail API) [OAuth2]
        → ENT-000251 (pg_helpers.js)
```

**Evidence:** `lib/agent-task-cycle.js` lines 3–30 confirm: `require('./models/runtime')`, `require('../agents')`, `require('./memory/gateway')`, `require('./memory/working-memory')`, 9 named imports from `./pg_helpers`, and imports from `./chat-context` and workspace utilities.

---

## 4. Scheduled / Cron Pipeline

Background task execution triggered by Render cron or internal scheduler.

```
Cron trigger
  → ENT-000254 (cron-scheduler.js) [7 Supabase retention windows]
    → ENT-000250 (pg_database.js) [direct pool access for bulk deletes]
    → ENT-000024 (Supabase) [retention window enforcement]
  → ENT-001090 (Civilization Cycle Cron) [scheduled civilisation heartbeat]
    → ENT-000007 (Civilisation Cycle) [core cycle logic]
      → ENT-000257 (memory/gateway.js)
      → ENT-000251 (pg_helpers.js)
      → ENT-000249 (kernel.js) [if invoked via HTTP route]
  → ENT-001092 (Daily Briefing Pipeline Cron) [morning briefing generation]
    → services/pipelines/daily-briefing-pipeline.js
      → ENT-000257 (memory/gateway.js) [context for briefing]
      → ENT-000261 (email_agent.js) [delivery]
        → ENT-000022 (Gmail API)
      → ENT-000010 (Anthropic API) [briefing generation]
      → ENT-000011 (Claude claude-sonnet-4-6)
```

---

## 5. External Service Dependencies

| Entity | Depends On (external) | Auth Mechanism | Env Var(s) |
|---|---|---|---|
| ENT-000040 (server.js) | ENT-000024 (Supabase) | Service role key | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| ENT-000040 (server.js) | ENT-000023 (Sentry) | DSN token | `SENTRY_DSN` |
| ENT-000248 (governance.js) | ENT-000024 (Supabase) | Service role key | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| ENT-000250 (pg_database.js) | ENT-000024 (Supabase) | Connection string | `DATABASE_URL` |
| ENT-000255 (embed.js) | ENT-000018 (Voyage AI API) | Bearer API key | `VOYAGE_API_KEY` |
| ENT-000255 (embed.js) | ENT-000012 (Google Gemini API) | Bearer API key | `GEMINI_API_KEY` |
| ENT-000259 (orchestrator.js) | ENT-000010 (Anthropic API) | Bearer API key | `ANTHROPIC_API_KEY` |
| ENT-000259 (orchestrator.js) | ENT-000011 (Claude claude-sonnet-4-6) | Via Anthropic API | `ANTHROPIC_API_KEY` |
| ENT-000261 (email_agent.js) | ENT-000022 (Gmail API) | OAuth2 refresh token | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` |
| ENT-001130 (civilization-kernel.js) | ENT-000024 (Supabase) | Service role key | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| ENT-001090 (Civilization Cycle Cron) | ENT-000024 (Supabase) | Via pg_database.js | `DATABASE_URL` |
| ENT-001092 (Daily Briefing Pipeline Cron) | ENT-000010 (Anthropic API) | Bearer API key | `ANTHROPIC_API_KEY` |
| ENT-001092 (Daily Briefing Pipeline Cron) | ENT-000022 (Gmail API) | OAuth2 | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` |
| ENT-000258 (master-orchestrator.js) | ENT-000010 (Anthropic API) | Via orchestrator.js | `ANTHROPIC_API_KEY` |
| ENT-000260 (finance_agent.js) | ENT-000010 (Anthropic API) | Via orchestrator.js | `ANTHROPIC_API_KEY` |

---

## 6. Entity Relationship Summary Table

Centrality = HIGH if consumed by 5+ entities, MEDIUM if 2–4, LOW if 0–1.

| ID | Name | Depends On (count) | Consumed By (count) | Centrality |
|---|---|---|---|---|
| ENT-000007 | Civilisation Cycle | 2 | 1 | LOW |
| ENT-000010 | Anthropic API | 0 (external) | 5 | HIGH |
| ENT-000011 | Claude claude-sonnet-4-6 | 1 | 4 | MEDIUM |
| ENT-000012 | Google Gemini API | 0 (external) | 1 | LOW |
| ENT-000018 | Voyage AI API | 0 (external) | 1 | LOW |
| ENT-000022 | Gmail API | 0 (external) | 2 | MEDIUM |
| ENT-000023 | Sentry | 0 (external) | 1 | LOW |
| ENT-000024 | Supabase | 0 (external) | 8 | HIGH |
| ENT-000040 | server.js | 4 | 0 | LOW |
| ENT-000041 | instrument.js | 0 | 1 | LOW |
| ENT-000042 | .env (runtime secrets) | 0 | 15+ | HIGH |
| ENT-000100 | SUPABASE_URL | 0 | 4 | MEDIUM |
| ENT-000101 | SUPABASE_SERVICE_ROLE_KEY | 0 | 4 | MEDIUM |
| ENT-000102 | DATABASE_URL | 0 | 2 | MEDIUM |
| ENT-000103 | ANTHROPIC_API_KEY | 0 | 5 | HIGH |
| ENT-000104 | VOYAGE_API_KEY | 0 | 1 | LOW |
| ENT-000105 | GEMINI_API_KEY | 0 | 1 | LOW |
| ENT-000106 | GMAIL_CLIENT_ID | 0 | 2 | MEDIUM |
| ENT-000107 | GMAIL_CLIENT_SECRET | 0 | 2 | MEDIUM |
| ENT-000108 | GMAIL_REFRESH_TOKEN | 0 | 2 | MEDIUM |
| ENT-000109 | SENTRY_DSN | 0 | 1 | LOW |
| ENT-000110 | JWT_SECRET | 0 | 1 | LOW |
| ENT-000111 | PORT | 0 | 1 | LOW |
| ENT-000248 | governance.js | 3 | 3 | MEDIUM |
| ENT-000249 | kernel.js | 2 | 6 | HIGH |
| ENT-000250 | pg_database.js | 1 | 5 | HIGH |
| ENT-000251 | pg_helpers.js | 1 | 6 | HIGH |
| ENT-000252 | event-bus.js | 0 | 2 | MEDIUM |
| ENT-000253 | agent-task-cycle.js | 6 | 2 | MEDIUM |
| ENT-000254 | cron-scheduler.js | 2 | 0 | LOW |
| ENT-000255 | embed.js | 2 | 2 | MEDIUM |
| ENT-000256 | constitutional-gate.js | 5 | 1 | LOW |
| ENT-000257 | memory/gateway.js | 7 | 5 | HIGH |
| ENT-000258 | master-orchestrator.js | 2 | 0 | LOW |
| ENT-000259 | orchestrator.js | 4 | 3 | MEDIUM |
| ENT-000260 | finance_agent.js | 2 | 1 | LOW |
| ENT-000261 | email_agent.js | 2 | 2 | MEDIUM |
| ENT-000262 | domain-agents.js | 0 | 1 | LOW |
| ENT-000263 | agent-registry.js | 0 | 2 | MEDIUM |
| ENT-001090 | Civilization Cycle Cron | 2 | 0 | LOW |
| ENT-001092 | Daily Briefing Pipeline Cron | 3 | 0 | LOW |
| ENT-001130 | civilization-kernel.js | 1 | 1 | LOW |
| ENT-001131 | lib/middleware.js | 0 | 2 | MEDIUM |
| ENT-002001 | lib/canonical-json.js | 0 | 1 | LOW |
| ENT-002002 | lib/logger.js | 0 | 4 | MEDIUM |
| ENT-002003 | lib/clients.js | 1 | 2 | MEDIUM |
| ENT-002004 | lib/memory/access-controller.js | 0 | 1 | LOW |
| ENT-002005 | lib/memory/cache.js | 0 | 1 | LOW |
| ENT-002006 | lib/memory/founder-memory.js | 1 | 1 | LOW |
| ENT-002007 | lib/memory/sanitizer.js | 0 | 1 | LOW |
| ENT-002008 | lib/health/monitor.js | 0 | 1 | LOW |

---

## Graph Invariants

1. ENT-000024 (Supabase) is the terminal dependency for all persistent state — every write path terminates here.
2. ENT-000250 (pg_database.js) is the single chokepoint between application and database — all DB access flows through it.
3. ENT-000251 (pg_helpers.js) is the most-consumed internal entity — imported by agents, routes, and memory layers.
4. ENT-000249 (kernel.js) sits on every request's critical path — its 4-gate chain executes before any route handler.
5. ENT-000256 (constitutional-gate.js) is now fail-CLOSED (ARCH-14 compliant as of 2026-07-05).

---

*End of 09b — Dependency Graph*
