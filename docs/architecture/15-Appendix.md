# 15 — Appendix: Complete Raw Relationship Catalogue

**Date:** 2026-07-02  
**Operation:** Phase 2.1 — The Great Relationship Discovery  
**Evidence Standard:** Every relationship below supported by direct file read or grep scan. UNKNOWN = not verifiable from evidence gathered.

---

## A. server.js — Complete Import Registry

### Static requires (top of file)

| Alias | Module | Purpose |
|-------|--------|---------|
| express | express | HTTP framework |
| fs | fs | File system (route loading, static) |
| path | path | Path resolution |
| os | os | OS info for health |
| crypto | crypto | Timing-safe auth comparisons |
| http | http | WebSocket attachment |
| dotenv | dotenv | Env var loading |
| rateLimit | express-rate-limit | Rate limiting |
| helmet | helmet | Security headers |
| cors | cors | CORS enforcement |
| jwt | jsonwebtoken | JWT verification |
| sbAdmin | @supabase/supabase-js (direct) | Admin Supabase client |
| { getSupabaseClient, getAnthropicClient } | lib/clients | Client singletons |
| { pgXxx... } | lib/pg_helpers | DB query functions (50+) |
| { requireAuth, requireAppAccess, requireCronAccess } | lib/middleware | Auth middleware |
| requireAppAccess | lib/app-auth | Re-export of middleware.requireAppAccess |
| { kernelChain } | lib/kernel | Constitutional middleware |
| { buildAgentPlan, runAgentPlanningCycle, executeApprovedAgentTask, runDueSchedules } | lib/agent-task-cycle | Task planning/execution |
| _gateway | lib/memory/gateway | Memory access gateway |
| lib/ws-handler | lib/ws-handler | WebSocket management |
| lib/event-bus | lib/event-bus | Event bus singleton |
| lib/event-consumer | lib/event-consumer | Event consumption |
| _log | lib/logger | Application logger |
| _agentQueue | lib/agent-queue | Agent queue management |
| runAgentTeam | agent-system/orchestrator | Primary agent execution |
| { DOMAIN_AGENTS: _DOMAIN_AGENTS } | agent-system/domain-agents | Domain agent handlers |
| { initEmailAgent, checkEmails, sendEmailReply } | agent-system/email_agent | Email integration |
| { categoriseTransaction, checkBudgetAlerts, parseCsvTransactions, FINANCE_CATEGORIES } | agent-system/finance_agent | Finance processing |
| { initRoutineAgent } | agent-system/routine_agent | Routine management |
| { runReflectionCheck } | agent-system/reflection_agent | Reflection trigger |
| { previewCloudAutopilot, applyLatestCloudProposal } | agent-system/cloud_autopilot | Cloud automation |
| _eae | lib/executive-arbitration-engine | Executive arbitration |
| _spe | lib/strategic-planning-engine | Strategic planning |
| runtime | lib/models/runtime | Model selection |
| { HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL, REQUEST_TIMEOUT_MS, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } | config | Model constants |
| MODEL | 'claude-opus-4-7' (hardcoded) | Primary model |

### server.js Lazy Requires (inline)

| Location | Module | Trigger |
|----------|--------|---------|
| /health handler | lib/pg_database | DB health check |
| /health handler | lib/clients | Supabase health |
| /health handler | services/slack/slack-alerts | DB down alert |
| /api/governance/apply-migration-005 | pg (Pool) | Migration |
| /api/admin/* | lib/intelligence/civilization-runtime | Status endpoints |
| /api/admin/improvements | lib/intelligence/improvement-governor | Queue inspection |
| Chat handler | lib/memory/consolidation-engine (inferred) | Memory consolidation |
| _loadMastra +5min | agent-system/mastra_agents | Mastra init |
| getStatus | getMastraStatus closure | Telemetry |
| Ruflo +10min | child_process spawn | Daemon startup |

---

## B. Route File Dependency Registry

| Route File | Auth Pattern | Key Imports | Key Tables |
|-----------|-------------|------------|-----------|
| routes/agents.js | app-auth | lib/agent-library [lazy], lib/domain-agents [lazy], @supabase/supabase-js | agents (inferred) |
| routes/civilization.js | app-auth | lib/telemetry/aggregator, lib/clients, lib/intelligence/civilization-health-engine [lazy], lib/intelligence/global-intelligence-engine [lazy], lib/intelligence/opportunity-engine [lazy], lib/executive/executive-council [lazy] | civilization_health_snapshots |
| routes/cognitive.js | app-auth | UNKNOWN | UNKNOWN |
| routes/executive-performance.js | app-auth | lib/intelligence/executive-performance-engine [lazy] | UNKNOWN |
| routes/governance.js | app-auth | lib/governance [lazy], lib/governance-probe [lazy], lib/runtime-readiness [lazy], lib/evidence-completeness [lazy] | UNKNOWN |
| routes/intelligence.js | requireAppAccess (inline) | agent-system/obsidian-memory, @supabase/supabase-js (own client) | UNKNOWN |
| routes/knowledge-graph.js | app-auth | lib/memory/knowledge-graph | knowledge_graph |
| routes/memory.js | app-auth | lib/memory (all 10 layers) | working_memory, episodic_memory, etc. |
| routes/voice-chat.js | requireAppAccess | lib/memory/gateway, agent-system/domain-agents, @supabase/supabase-js | UNKNOWN |
| routes/communications.js | app-auth | lib/memory/gateway | UNKNOWN |
| All others | app-auth | UNKNOWN | UNKNOWN |

---

## C. Memory Layer Registry

| Layer | Module File | Table(s) | TTL | Notes |
|-------|------------|---------|-----|-------|
| 0 | lib/memory/founder-memory.js | module constant | None | Hardcoded founder context |
| 1 | lib/memory/working-memory.js | working_memory | TTL-based | Session-scoped |
| 2 | lib/memory/episodic-memory-pg.js | episodic_memory | Durable | Also: agent-system/episodic-memory.js (direct write) |
| 3 | lib/memory/semantic-memory.js | UNKNOWN (pgvector implied) | Durable | |
| 4 | lib/memory/procedural-memory.js | UNKNOWN | Durable | |
| 5 | lib/memory/strategic-memory.js | strategic_memory | Durable | |
| 6 | lib/memory/skill-memory.js | UNKNOWN | Durable | |
| 7 | lib/memory/decision-memory.js | UNKNOWN | Durable | |
| 8 | lib/memory/knowledge-graph.js | knowledge_graph | Durable | Nodes + edges |
| 10 | lib/memory/consolidation-engine.js | apex_lessons | Durable | Pipeline: raw→lessons |
| 11 | lib/memory/reflexion-tracker.js | UNKNOWN | Durable | Lesson→behavior loop |
| 12 | lib/memory/improvement-engine.js | UNKNOWN | Durable | Observation→deployment |
| 13 | lib/memory/adaptation-cycle.js | UNKNOWN | Weekly | Lessons→behavior changes |
| Gov | lib/memory/memory-governor.js | UNKNOWN | — | Quota enforcement |
| Cache | lib/memory/cache.js | In-process | 60s | Gateway response cache |
| AC | lib/memory/access-controller.js | In-process | — | Entity+layer access gate |
| San | lib/memory/sanitizer.js | — | — | Input sanitization |

---

## D. Database Table Registry (Complete)

| Table | Purpose | Primary Writer | Primary Reader |
|-------|---------|---------------|---------------|
| documents | Documents/notes | pgSaveDocument | pgGetDocument |
| memory | Legacy chat memory (last 20) | pgAddMemory | pgLoadMemory |
| agent_tasks | Agent task state | pgCreateAgentTask | pgGetAgentTask |
| agent_actions | Agent action log | pgLogAgentAction | pgGetRecentAgentActions |
| agent_schedules | Recurring task schedules | pgCreateAgentSchedule | pgGetDueAgentSchedules |
| agent_reflections | Reflection lessons | pgCreateAgentReflection | pgGetApprovedReflections |
| notifications | User notifications | pgCreateNotification | pgListNotifications |
| standing_approvals | Auto-approval patterns | pgCreateStandingApproval | pgGetEnabledStandingApprovals |
| email_queue | Pending email items | pgSaveEmailQueueItem | pgListEmailQueue |
| transactions | Financial transactions | pgSaveTransaction | pgListTransactions |
| budgets | Budget limits | pgSaveBudget | pgGetBudgetByCategory |
| routines | Daily/weekly routines | pgCreateRoutine | pgListRoutines |
| gmail_tokens | Gmail OAuth tokens | pgSaveGmailToken | pgGetGmailToken |
| tool_executions | Tool call audit log | pgInsertToolExecution | UNKNOWN |
| approvals | Execution approvals | pgInsertApproval | pgListApprovals |
| working_memory | Layer 1 TTL memory | lib/memory/working-memory.js | gateway.js |
| episodic_memory | Layer 2 episodes | episodic-memory-pg.js | gateway.js |
| strategic_memory | Layer 5 strategy | lib/memory/strategic-memory.js | gateway.js |
| apex_lessons | Consolidated lessons | consolidation-engine.js | gateway.js (searchMemory) |
| executive_verdicts | Council decisions | lib/executive/*.js (inferred) | gateway.js, /api/executive/verdicts |
| knowledge_graph | KG nodes + edges | lib/memory/knowledge-graph.js | gateway.js, routes/knowledge-graph.js |
| civilization_health_snapshots | Health scores over time | lib/intelligence/civilization-runtime.js (inferred) | /api/admin/civilization-status |
| civilization_cycle_log | Cycle audit log | lib/intelligence/civilization-runtime.js (inferred) | /api/admin/civilization-status-v2 |
| cron_run_log | Cron execution history | lib/cron-scheduler.js (inferred) | /api/cron/history |
| apex_notifications | Notifications (health check target) | UNKNOWN | /health (health probe) |
| outbox | Event outbox | lib/write-with-outbox.js | lib/outbox-relay.js |

---

## E. Services Startup Sequence Registry

From services/init.js + server.js:

| Step | Module / Action | Timing |
|------|----------------|--------|
| 1 | server.js static imports resolved | Startup |
| 2 | express app configured (helmet, cors, rate limits) | Startup |
| 3 | middleware stack applied (civilization-kernel, kernelChain) | Startup |
| 4 | Inline routes defined (health, auth, admin) | Startup |
| 5 | _loadAgentRoutes() — 40 route files loaded | Startup |
| 6 | tts-gemini.js + telemetry factory mounted | Startup |
| 7 | HTTP server.listen() | Listen |
| 8 | services/init.js cascade (9 subsystems) | At listen |
| 9 | lib/cron-scheduler.start() | At listen |
| 10 | lib/constitution/watchdog.start() | At listen |
| 11 | lib/event-consumer (initialized) | At listen |
| 12 | initEmailAgent() | At listen |
| 13 | initRoutineAgent() | At listen |
| 14 | runReflectionCheck setInterval (30 min) | At listen |
| 15 | agent task polling setInterval (5 min) | At listen |
| 16 | getMastraStatus stub → lazy load +5 min | +5 min |
| 17 | Ruflo daemon spawn | +10 min |

---

## F. Agent System Registry

| Module | Type | Entry Point | Consumers |
|--------|------|------------|-----------|
| agent-system/orchestrator.js | Primary pipeline | runAgentTeam(spec) | server.js |
| agent-system/domain-agents.js | Domain handlers | DOMAIN_AGENTS object | server.js, routes/agents.js, routes/voice-chat.js |
| agent-system/email_agent.js | Domain agent | initEmailAgent, checkEmails, sendEmailReply | server.js |
| agent-system/finance_agent.js | Domain agent | categoriseTransaction, checkBudgetAlerts, parseCsvTransactions | server.js |
| agent-system/routine_agent.js | Domain agent | initRoutineAgent | server.js |
| agent-system/reflection_agent.js | Periodic agent | runReflectionCheck | server.js (30-min interval) |
| agent-system/cloud_autopilot.js | Domain agent | previewCloudAutopilot, applyLatestCloudProposal | server.js |
| agent-system/browser-agent.js | Tool agent | Playwright automation | orchestrator.js [lazy] |
| agent-system/firecrawl-bridge.js | Tool agent | Web scraping | orchestrator.js [lazy] |
| agent-system/obsidian-client.js | Tool agent | Vault writes | orchestrator.js [lazy] |
| agent-system/mastra_agents.js | Framework agents | initMastra(handleCommand) | server.js [+5min] |
| agent-system/langchain-rag.js | RAG agent | retrieveContext | routes/intelligence.js [lazy] |
| agent-system/episodic-memory.js | Memory writer | direct episodic writes | orchestrator.js |
| agent-system/memory-indexer.js | Memory writer | indexes agent output | orchestrator.js |
| agent-system/dynamic-agent-selector.js | Selector | selects agent for task | orchestrator.js |
| agent-system/execution-verifier.js | Verifier | verifies execution | orchestrator.js |
| agent-system/goal-tracker.js | Tracker | tracks goal progress | orchestrator.js |
| agent-system/adaptation-engine.js | Adapter | post-execution adaptation | orchestrator.js |
| agent-system/reflection-engine.js | Reflector | reflection generation | orchestrator.js |
| agent-system/agent-reputation.js | Reputation | agent reputation tracking | orchestrator.js |
| agent-system/agent-pipeline-hooks.js | Hooks | pre/post execution hooks | orchestrator.js |
| agent-system/prompt-expander.js | Expander | expands user prompt | server.js (before orchestrator) |

---

## G. Intelligence Layer Registry

| Module | Purpose | Consumers |
|--------|---------|-----------|
| lib/intelligence/civilization-runtime.js | Civilization cycle runner | server.js (inline routes), routes/civilization.js |
| lib/intelligence/civilization-health-engine.js | Health scoring | routes/civilization.js [lazy] |
| lib/intelligence/global-intelligence-engine.js | Global intel | routes/civilization.js [lazy] |
| lib/intelligence/opportunity-engine.js | Opportunity detection | routes/civilization.js [lazy], lib/memory/gateway.js |
| lib/intelligence/executive-performance-engine.js | KPI tracking | routes/executive-performance.js [lazy] |
| lib/intelligence/digital-twin-engine.js | Digital twin | lib/memory/gateway.js (consumer of gateway) |
| lib/intelligence/strategy-engine.js | Strategy | lib/memory/gateway.js (consumer of gateway) |
| lib/intelligence/reality-loop.js | Reality assessment | lib/memory/gateway.js (consumer of gateway) |
| lib/intelligence/decision-outcome-engine.js | Decision tracking | lib/memory/gateway.js (consumer of gateway) |
| lib/intelligence/sie.js | Strategic Intel Engine briefing | lib/memory/gateway.js [lazy in _getSIEBriefing] |
| lib/intelligence/improvement-governor.js | Improvement queue | server.js [lazy in /api/admin/improvements] |

---

## H. Cron / Scheduled Work Registry

| Trigger | Schedule | Module | Function |
|---------|----------|--------|---------|
| Render cron HTTP | On schedule | lib/intelligence/civilization-runtime.js | runOnce() via POST /api/cron/civilization |
| setInterval | Every 5 min | lib/agent-task-cycle.js | runDueSchedules() |
| setInterval | Every 30 min | agent-system/reflection_agent.js | runReflectionCheck() |
| setInterval | Every 30 min | lib/constitution/watchdog.js | tick() |
| lib/cron-scheduler | Weekly | lib/memory/consolidation-engine.js | wiki_consolidation |
| lib/cron-scheduler | Daily | Daily briefing generator | daily_briefing |
| lib/cron-scheduler | Weekly | Adaptation refresh | adaptation_refresh |
| lib/integrity-crons | Regular | lib/integrity-crons.js | backup, reconcile |

---

## I. External Integration Registry

| Integration | Module | Env Vars Required |
|-------------|--------|------------------|
| Anthropic Claude | lib/clients.js | ANTHROPIC_API_KEY |
| Supabase | lib/clients.js, lib/pg_database.js | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL |
| Google Gemini TTS | routes/tts-gemini.js | GOOGLE_API_KEY or GEMINI_API_KEY |
| Gmail | agent-system/email_agent.js, pg_helpers (gmail_tokens) | Gmail OAuth credentials |
| Slack | services/slack/slack-alerts.js | SLACK_WEBHOOK_URL (inferred) |
| Firecrawl | agent-system/firecrawl-bridge.js | FIRECRAWL_API_KEY (inferred) |
| RAG Sidecar | routes/intelligence.js (inferred) | RAG_SIDECAR_URL, OPENAI_API_KEY (on sidecar) |
| Sentry | server.js (inferred) | SENTRY_DSN |
| Ruflo | .mcp.json, child_process | Local binary |
| GitNexus | .mcp.json | Local MCP server |

---

## J. Confirmed vs Inferred Relationships

**CONFIRMED** (direct file read evidence):
- server.js → lib/memory/gateway.js (static import _gateway)
- orchestrator.js → 18 static imports (all listed in doc 04)
- lib/memory/gateway.js → 7 exports + lib/memory/index.js (all 13 layers)
- lib/pg_helpers.js → 63 functions, 15+ tables
- lib/middleware.js → 5 auth mechanisms
- render.yaml → 2 services with full config
- lib/certification/checker.js → 4 clauses with thresholds

**INFERRED** (structural reasoning, not confirmed by file read):
- lib/intelligence/*.js internal imports
- Most lib/executive/*.js internal behavior
- Exact schema of tables beyond column names visible in queries
- Which phase validation scripts have run to completion
- Production status of Mastra, Ruflo, RAG sidecar

---

## K. Phase 2.1 Discovery Summary

**Documents produced:** 16 (00 through 15)

**Key discoveries (not in Phase 1 census):**
1. `src/routes/telemetry/index.js` is CONFIRMED mounted — resolves Phase 1 unknown
2. lib/governance.js uses own createClient (not lib/clients singleton) — isolated connection
3. lib/write-with-outbox.js has 0 confirmed consumers in source grep — possible dead code
4. Duplicate routes in server.js: /health/deep and /api/cognitive/report defined twice (second definition never executes)
5. 5 modules maintain independent Supabase connections (beyond singleton)
6. Memory cache: 60-second TTL on gateway.getContext() results
7. Reflexion side-effect on every getContext() call (lesson recordRetrieval via setImmediate)
8. Execution class tagger: REFLEX / EXECUTIVE / BACKGROUND on every request
9. iOS PWA WebKit cookie bug fix: native form POST on login
10. Render memory constraint (220MB) drives Mastra +5min, Ruflo +10min deferred loading patterns
