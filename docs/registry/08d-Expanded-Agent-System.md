# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 08d · Expanded Entity Records — Block 06: Agent-System Core Files

**Registry Version:** 1.0.0
**Date:** 2026-07-05
**Part:** Registry Part 2 — Full Attribute Expansion
**Entities:** ENT-000258 through ENT-000263 (6 core agent-system files)

---

### ENT-000258 — master-orchestrator.js *(Expanded Record)*

**Family:** AGT | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/agent-system/master-orchestrator.js |
| Parent | ENT-000099 (agent-system/) |
| Description | Top-level orchestrator that parses ROADMAP.md into structured workstreams, pre-classifies features by complexity tier (simple/complex/critical), routes them to the pipeline, manages Supabase notification dedup, maintains a cognition-weights cache with 60-min TTL sourced from Supabase `adaptation_cycles.routing_table`, and caps concurrent feature executions via bounded concurrency. |
| Purpose | Supreme scheduling authority — decides which ROADMAP features run, at what complexity tier, and in what order; the entry point for all autonomous civilisation-building work. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | Server.js route handlers (POST /api/master/run or similar), scheduled Render cron triggers |
| Dependencies | fs, path, child_process (execSync/spawnSync), @supabase/supabase-js, ./obsidian-memory, ../lib/runtime/constitutional-gate, ../lib/clients (getAnthropicClient), ../lib/models/runtime |
| Interfaces | Exports: parseRoadmap, planFeature, runFeature (inferred from usage context); internal: _preClassifyFeature, _loadCognitionWeights, _runWithConcurrency, _insertNotification |
| Entry Points | Module load triggers setImmediate Supabase cache warm-up; externally called by server routes or cron via exported run function |
| Exit Points | Writes notifications to `apex_notifications` Supabase table; emits console logs prefixed [Master]; returns structured run results to caller |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (plan cache in-memory per process; cognition weights persisted in Supabase adaptation_cycles + config/cognition-weights.json) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Console logs with [Master] prefix; Supabase notification table; cognition-weights TTL logging |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Full export surface below line 120; exact route that invokes module; constitutional-gate integration details |

---

### ENT-000259 — orchestrator.js *(Expanded Record)*

**Family:** AGT | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/agent-system/orchestrator.js |
| Parent | ENT-000099 (agent-system/) |
| Description | Core 8-stage pipeline executor implementing the RESEARCHER→ARCHITECT→DEVELOPER→REVIEWER→VALIDATOR→TESTER→COMMITTER→REFLECTOR sequence. Performs complexity classification (simple/moderate/complex/critical), routes each pipeline agent to the correct model tier via a ROUTING matrix, maintains a circuit breaker (opens after 5 consecutive API failures with exponential backoff up to 15 min), validates ARCHITECT output via a Zod schema, and tracks per-run cost using model-specific pricing. |
| Purpose | The workhorse pipeline — transforms a feature spec into committed, deployed code by coordinating all 8 specialised pipeline agents with cost-aware model selection and fault tolerance. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | master-orchestrator.js (calls pipeline per feature); server.js pipeline route handlers |
| Dependencies | fs, path, os, child_process (spawnSync/execSync), crypto (randomUUID), ./obsidian-memory, zod, ./agent-pipeline-hooks, ../lib/governance, ./agent-reputation, ./episodic-memory, ./memory-indexer, ./dynamic-agent-selector, ./execution-verifier, ./goal-tracker, ./adaptation-engine, ./reflection-engine, ../lib/models/runtime, ../lib/memory/gateway, ../runtime/task-router, ../lib/memory/reflexion-tracker, @supabase/supabase-js |
| Interfaces | Exports: runPipeline (primary), getOrchestratorStatus; internal: _classifyComplexity, _clientFor, _trackCost, _callClaude, circuit breaker object _cb |
| Entry Points | Called by master-orchestrator.js with a feature spec object; also callable directly from server route |
| Exit Points | Returns pipeline run result object (success, cost_usd, token_usage, duration_ms); writes agent run records to Supabase; commits code via COMMITTER stage; writes Obsidian lessons via REFLECTOR stage |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (Supabase apex_agent_runs table; Obsidian vault lessons; git commits) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Circuit breaker state (_cb.failures); _lastRunModels snapshot for getOrchestratorStatus; Supabase apex_agent_runs records; cost tracking per model/role |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Full stage implementations below line 120; RESEARCHER/COMMITTER/REFLECTOR exact logic; reflexion-tracker integration depth |

---

### ENT-000260 — finance_agent.js *(Expanded Record)*

**Family:** AGT | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/agent-system/finance_agent.js |
| Parent | ENT-000099 (agent-system/) |
| Description | Domain agent handling personal and business finance operations. Provides AI-powered transaction categorisation (via runtime 'fast' tier, max 10 tokens), budget threshold alerting at 80% of monthly limit with automatic agent task and notification creation, and CSV bank-statement parsing with support for debit/credit split columns or signed-amount formats. |
| Purpose | Keeps the Founder's financial state current and governed — automatically categorises spending, fires budget alerts as agent tasks requiring approval, and ingests bank exports. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | Server.js finance routes (POST /api/finance/transaction, POST /api/finance/csv); domain-agents.js chat dispatcher; cron-triggered budget check |
| Dependencies | ../lib/pg_helpers (pgSaveTransaction, pgGetFinanceSummaryCurrentMonth, pgListBudgets, pgCreateAgentTask, pgCreateNotification), ../lib/models/runtime |
| Interfaces | Exports: categoriseTransaction, checkBudgetAlerts, parseCsvTransactions (inferred); additional exports likely below line 120 (saveTransaction, getFinanceSummary) |
| Entry Points | HTTP route handlers calling exported functions; Render cron route calling checkBudgetAlerts periodically |
| Exit Points | Writes transactions to Postgres via pgSaveTransaction; creates agent tasks in Postgres via pgCreateAgentTask; fires notifications via pgCreateNotification; returns categorised transaction arrays |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (Postgres transactions, budgets, agent_tasks, notifications tables) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Console.error on BUDGET ALERT ERROR; runtime caller tag 'finance-agent' for cost tracking |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Full export list below line 120; saveTransaction implementation; currency handling edge cases |

---

### ENT-000261 — email_agent.js *(Expanded Record)*

**Family:** AGT | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/agent-system/email_agent.js |
| Parent | ENT-000099 (agent-system/) |
| Description | Gmail integration agent that is entirely gated behind the GMAIL_ENABLED=true environment variable — exports a disabled stub when not set. When enabled, authenticates via OAuth2 (credentials from Postgres DB preferred over env-var fallback), fetches up to 10 unread non-promotional emails, parses headers and base64-encoded body parts, and triages each email via Claude runtime ('fast' tier, 200 tokens) producing priority, category, summary, suggested_reply, and needs_approval fields. Deduplicates against Postgres email queue by Gmail message ID. |
| Purpose | Keeps the Founder's inbox processed without constant manual attention — surfaces urgent items as agent tasks requiring approval and generates draft replies for human review. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | Server.js email routes; Render cron route for periodic email polling; domain-agents.js chat dispatcher |
| Dependencies | googleapis (google.auth.OAuth2, google.gmail), ../lib/pg_helpers (pgSaveEmailQueueItem, pgGetEmailQueueItemByGmailId, pgUpdateEmailQueueStatus, pgCreateAgentTask, pgCreateNotification, pgGetGmailToken, pgSaveGmailToken, pgClearGmailToken), ../lib/models/runtime |
| Interfaces | Exports: checkEmails, sendEmailReply, initEmailAgent, isDisabled (stub exports when GMAIL_ENABLED != true) |
| Entry Points | Cron-triggered checkEmails(); manual sendEmailReply() from approval handler; module load checks GMAIL_ENABLED env var |
| Exit Points | Writes email queue records to Postgres; creates agent tasks for urgent/needs_approval emails; fires notifications; sends Gmail replies via API |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (Postgres email_queue, agent_tasks, notifications; Gmail OAuth token persisted to Postgres) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Console.log when Gmail not configured; runtime caller tag 'email-agent' for cost tracking; isDisabled flag inspectable by callers |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | sendEmailReply implementation (below line 120); initEmailAgent implementation; token refresh/re-auth flow detail |

---

### ENT-000262 — domain-agents.js *(Expanded Record)*

**Family:** AGT | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/agent-system/domain-agents.js |
| Parent | ENT-000099 (agent-system/) |
| Description | Registry and system-prompt library for the five conversational domain agents (system, file, uni, finance, business). Each entry carries a slug, name, category, description, and a richly detailed system_prompt scoped to that domain's responsibilities and known API endpoints. Agents are keyed by slug in the DOMAIN_AGENTS object and dispatched by slug lookup. Relies on ../lib/models/runtime for LLM execution. |
| Purpose | Provides the personality, knowledge scope, and endpoint awareness for each domain agent — the single source of system-prompt truth that all chat-based domain agent invocations consume. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | Server.js domain-agent chat routes (POST /api/agent/:slug/chat or similar); agent-registry.js cross-references capabilities |
| Dependencies | ../lib/models/runtime |
| Interfaces | Exports: DOMAIN_AGENTS object (keyed by slug: system, file, uni, finance, business); likely exports a dispatch/chat function below line 120 |
| Entry Points | HTTP route handler passes slug + user message; module looked up by slug to retrieve system_prompt then calls runtime.execute |
| Exit Points | Returns LLM text response to route handler; runtime.execute records cost against domain agent caller tag |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (stateless prompt library; conversation state handled externally) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Runtime cost tracking per agent via caller tag; no dedicated logging visible in first 120 lines |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Chat dispatch function implementation (below line 120); conversation history handling; whether per-agent conversation memory is maintained |

---

### ENT-000263 — agent-registry.js *(Expanded Record)*

**Family:** AGT | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/agent-system/agent-registry.js |
| Parent | ENT-000099 (agent-system/) |
| Description | Canonical source-of-truth registry for all 13 agents in the system (8 pipeline + 5 domain). Defines each agent's id, role, optional flag, pipeline order, capabilities array, default model tier, and description. Builds two fast-lookup Maps at module load (_byId, _byCapability) and exports query functions: getAllAgents, getAgent, getAgentCapabilities, findAgentsByCapability, getPipelineOrder, getDomainAgentIds, getCapabilityMap. |
| Purpose | Single authoritative reference for agent topology — any subsystem needing to know pipeline order, capability ownership, or agent metadata consults this registry rather than hardcoding assumptions. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | orchestrator.js (pipeline ordering), dynamic-agent-selector.js (capability lookup), server.js introspection routes (GET /api/agents or similar), domain-agents.js (cross-reference), any subsystem routing by capability |
| Dependencies | None (pure data + logic; no require() calls) |
| Interfaces | Exports: getAllAgents(), getAgent(id), getAgentCapabilities(id), findAgentsByCapability(capability), getPipelineOrder(), getDomainAgentIds(), getCapabilityMap() |
| Entry Points | require('./agent-registry') at module load; all exports are synchronous pure functions |
| Exit Points | Returns plain objects and arrays; no I/O, no side effects |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (pure in-memory; data is code-defined constants) |
| Documentation | Inline comments describing pipeline stages and domain categories |
| Test Coverage | UNKNOWN |
| Observability | No logging; introspectable via getAllAgents() and getCapabilityMap() |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; content read 2026-07-05 |
| Unknown Fields | Any additional exports below line 120; whether a validation function enforces capability uniqueness at load time |

---

*End of 08d — Block 06 Agent-System Core Full Attribute Expansion*
