# 01 — Component Relationships

**Date:** 2026-07-02  
**Evidence Source:** server.js (full read), services/init.js, key lib files

---

## The Hub: server.js

`server.js` is the single application root. Every module relationship flows through or was registered by it.

**Location:** `Scripts/server.js`  
**Size:** 222 KB, ~4,746 lines  
**Entry:** `node --max-old-space-size=220 server.js` (render.yaml)  
**Port:** 3000

---

## server.js Static Imports (require at module load)

| Import | Alias | Purpose |
|--------|-------|---------|
| `./instrument.js` | — | OpenTelemetry instrumentation (first line — must load before anything else) |
| `dotenv` | — | Environment variable loading |
| `child_process` | — | git SHA resolution at startup |
| `@sentry/node` | Sentry | Error tracking — captureException on uncaught errors |
| `express` | — | Web framework |
| `path` | — | File path utilities |
| `fs` | — | File system (route auto-loading, static files) |
| `crypto` | — | Timing-safe password comparison |
| `cors` | — | CORS headers (3 allowed origins) |
| `compression` | — | gzip response compression |
| `express-rate-limit` | rateLimit | Rate limiting middleware |
| `helmet` | — | Security headers (CSP, HSTS, etc.) |
| `@anthropic-ai/sdk` | Anthropic | Direct Claude API client (used in chat handler) |
| `jsonwebtoken` | jwt | JWT signing and verification |
| `axios` | — | HTTP client for external calls |
| `multer` | — | Multipart file upload handling (25 MB limit) |
| `./agent-system/prompt-expander` | expandPrompt | Prompt expansion before agent calls |
| `./agent-system/orchestrator` | runAgentTeam | Primary agent execution pipeline |
| `./agent-system/agent-library` | agentLib | Agent template library |
| `./lib/memory/sanitizer` | _sanitizer | Memory sanitisation |
| `./lib/event-bus` | _bus | In-process event routing |
| `./lib/agent-queue` | _agentQueue | Agent task queue |
| `./lib/cognitive-orchestrator` | _cogOrch | Cognitive orchestration |
| `./lib/session-state-registry` | _sessionReg | Session state tracking |
| `./lib/response-timing-engine` | _timingEng | Request timing |
| `./lib/persistent-cognition-manager` | _pcm | Persistent cognitive state |
| `./lib/executive-arbitration-engine` | _eae | Executive decision arbitration |
| `./lib/strategic-planning-engine` | _spe | Strategic planning |
| `./lib/memory/gateway` | _gateway | Memory access gateway (primary interface) |
| `./lib/memory/working-memory` | _wm | Working memory layer |
| `./lib/temporal/session-tracker` | _sessionTracker | Session time tracking |
| `./lib/embed` | { embedText } | Embedding generation |
| `./agent-system/backup-manager` | { createBackup, restoreBackup, cleanOldBackups } | Data backup |
| `./agent-system/domain-agents` | { DOMAIN_AGENTS } | Domain agent definitions |
| `./lib/kernel` | { kernelChain } | Constitutional middleware chain |
| `./lib/clients` | sbAdmin (getSupabaseClient) | Supabase admin client singleton |
| `./lib/pg_helpers` | { pgListDocuments, pgSaveDocument, ... 30+ functions } | PostgreSQL helper functions |
| `./lib/storage` | { getWorkspaceStorageDebug } | Supabase Storage interface |
| `./lib/apex-tools` | { APEX_TOOLS, executeApexTool } | Claude API tool definitions |
| `./lib/chat-context` | { createAgentNotification, loadMemory, ... 8 functions } | Chat context assembly |
| `./lib/agent-plan-utils` | { normalizeDuplicateComparisonText, ... 8 functions } | Agent planning utilities |
| `./lib/auto-pipeline` | { _parseTasks, _startAutoPipeline, _runTask } | Autonomous pipeline |
| `./lib/agent-step-utils` | { getAutonomyLevelMessage, ... 17 functions } | Step execution utilities |
| `./lib/agent-file-utils` | { extractJsonBlock, ... 10 functions } | File operation utilities |
| `./lib/agent-execution-utils` | { stepRequiresNoMatches, ... 10 functions } | Execution utilities |
| `./lib/agent-task-cycle` | { getLatestCompletedAgentTask, ... 17 functions } | Task lifecycle |
| `./lib/agent-command-handler` | { handleCommand, getAgentState } | Agent command processing |
| `./lib/middleware` | { hasAppAccess, requireAppAccess, hasCronAccess, requireCronAccess, parseCookies, requireAuth } | Auth middleware |
| `./lib/server-utils` | { detectDomain, _resolveConversationId, getCached, setCache, clearCache, _makeSolidPng } | Server utilities |
| `./lib/workspace` | { WORKSPACE_DIR, ensureSetup, safeFilePath, ... 14 functions } | Workspace file management |
| `./agent-system/cloud_autopilot` | { previewCloudAutopilot, applyLatestCloudProposal } | Cloud autopilot |
| `./agent-system/email_agent` | { checkEmails, sendEmailReply, initEmailAgent } | Email agent |
| `./agent-system/finance_agent` | { categoriseTransaction, checkBudgetAlerts, parseCsvTransactions, FINANCE_CATEGORIES } | Finance agent |
| `./agent-system/routine_agent` | { initRoutineAgent } | Routine agent |
| `./agent-system/reflection_agent` | { runReflectionCheck } | Reflection check |
| `./agent-system/obsidian-client` | { obsidianRead, obsidianWrite, ... 6 functions } | Obsidian REST API |
| `./lib/logger` | _log | Logging |
| `./lib/models/runtime` | runtime | Model runtime management |
| `./config` | { HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL, REQUEST_TIMEOUT_MS, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, VAULT } | Configuration |

---

## server.js Lazy Imports (require() inside handlers, not at module load)

| Import | Location in file | Purpose |
|--------|-----------------|---------|
| `./lib/memory/consolidation-engine` | lines 1265, 1405, 1459, 1477 | Triggered during long conversation |
| `./lib/cognitive/chat-cognitive-layer` | line 1341 | Cognitive directive during chat |
| `./lib/cognitive/runtime` | inline in chat handler | Cognitive executive consultation |
| `./lib/cognitive/meta-reasoning-engine` | inline in chat handler | Meta-reasoning recording |
| `./services/slack/slack-alerts` | health check handler | DB-down alert |
| `./lib/intelligence/civilization-runtime` | admin endpoint | Civilization status |
| `./lib/cognitive/reporting/intelligence-evolution-reporter` | cognitive report endpoint | Weekly/monthly reports |
| `./lib/pg_database` | health check, startup schema ops | Raw pg pool |
| `./lib/clients` | admin endpoint | Additional Supabase client |
| `pg` | operations route, startup | Direct pg Pool for migrations |
| `child_process` | Ruflo daemon start | Spawn Ruflo daemon |
| `https` | startup schema ops | Supabase Management API calls |
| `./config` | line 3500 | VAULT path |

---

## server.js Middleware Stack (in application order)

| Order | Middleware | Source | Applied to |
|-------|-----------|--------|-----------|
| 1 | helmet() (CSP, security headers) | `helmet` | All requests |
| 2 | cors() | `cors` | All requests (3 origins) |
| 3 | apiLimiter (120 req/min) | `express-rate-limit` | /api/* |
| 4 | masterLimiter (5 req/min) | `express-rate-limit` | /api/master/* |
| 5 | compression() | `compression` | All responses |
| 6 | express.json({ limit: "10mb" }) | `express` | All requests |
| 7 | express.urlencoded | `express` | All requests |
| 8 | Request correlation ID injector | lib/logger | All /api/ requests |
| 9 | Content-Type guard | inline | /api/ POST/PUT/PATCH |
| 10 | Execution class tagger (REFLEX/EXECUTIVE/BACKGROUND) | inline | All requests |
| 11 | civilization-kernel | `middleware/civilization-kernel.js` | All requests |
| 12 | chatLimiter (30 req/min) | `express-rate-limit` | /chat |
| 13 | generalLimiter (300 req/15min) | `express-rate-limit` | All requests |
| 14 | voiceLimiter (40 req/min) | `express-rate-limit` | /api/voice-chat |
| 15 | authLimiter (10 req/hr) | `express-rate-limit` | /auth/login |
| 16 | kernelChain | `lib/kernel.js` | /api/* |
| 17 | requireAppAccess (via route files) | `lib/app-auth.js` → `lib/middleware.js` | All /api/ routes |

---

## server.js Route Mount Points

| Route Prefix | Source | Method |
|-------------|--------|--------|
| `GET /` | server.js → `_serveDashboard` → `public/dashboard.html` | Direct |
| `GET /dashboard.html` | server.js → `_serveDashboard` | Direct |
| `GET /login` | server.js → lib/middleware LOGIN_HTML | Direct |
| `GET /health` | server.js inline handler | Direct |
| `GET /health/deep` | server.js inline handler (×2 defined) | Direct |
| `GET /sw.js` | server.js → `public/sw.js` | Direct |
| `GET /apex-v2.css` | server.js → `public/apex-v2.css` | Direct |
| `GET /apex-custom.css` | server.js → `public/apex-custom.css` | Direct |
| `GET /manifest.json` | server.js → `public/manifest.json` | Direct |
| `POST /auth/login` | server.js inline | Direct |
| `POST /auth/logout` | server.js inline | Direct |
| `/src/components` (static) | server.js → `src/components/` | express.static |
| `/api` | All routes/ files (auto-loaded) | `_loadAgentRoutes()` at line 4048 |
| `/api` | `routes/tts-gemini.js` | Explicitly mounted (excluded from auto-load) |
| `/` | `src/routes/telemetry/index.js` | Factory function mounted at line 4065 |
| `/api/chat` | server.js inline (before route auto-load) | Direct (main chat endpoint) |
| `/api/finance/transactions` | server.js inline (legacy) | Direct (alongside routes/finance.js) |
| `/api/master/*` | server.js inline | Direct (pipeline, halt, backup endpoints) |
| `/api/admin/*` | server.js inline | Direct (admin endpoints) |
| `/api/governance/apply-migration-005` | server.js inline | Direct |
| `/api/governance/run-cycle` | server.js inline | Direct |
| `/api/cognitive/report` | server.js inline (×2 defined) | Direct |

---

## server.js Startup Sequence (at listen)

| Step | Timing | Action | Module |
|------|--------|--------|--------|
| 1 | immediate | `lib/cron-scheduler.start()` | lib/cron-scheduler.js |
| 2 | `setImmediate` | `services/init.init(app, sbAdmin)` | services/init.js |
| 3 | immediate | `watchdog.start()` | lib/constitution/watchdog.js |
| 4 | 8s delay | Startup integration verification (episodic count check) | server.js |
| 5 | immediate | `initEmailAgent()` | agent-system/email_agent.js |
| 6 | immediate | `initRoutineAgent()` | agent-system/routine_agent.js |
| 7 | every 30 min | `runReflectionCheck()` | agent-system/reflection_agent.js |
| 8 | 15s delay | `autoApproveStandardPermissions()` | server.js inline |
| 9 | every 60s | `checkPendingMasterTasks()` | server.js inline |
| 10 | every 5 min | `runDueSchedules()` via cron-logger | lib/agent-task-cycle.js |
| 11 | every 10 min | Pipeline stale check (30+ min threshold) | server.js |
| 12 | 10 min delay | `ruflo daemon start` via child_process spawn | node_modules/ruflo |
| 13 | SIGTERM/SIGINT | `_gracefulShutdown()` → `wsHandler.stop()` → `server.close()` | server.js |

---

## services/init.js Startup Cascade (called at step 2 above)

| Order | Action | Module |
|-------|--------|--------|
| 1 | `outbox-relay.start()` | lib/outbox-relay.js |
| 2 | `integrity-crons.start()` | lib/integrity-crons.js |
| 3 | `entities/relationship-consumer.register()` | lib/entities/relationship-consumer.js |
| 4 | `pwa/notification-scheduler.start()` | lib/pwa/notification-scheduler.js |
| 5 | event-bus subscriptions for Slack alerts | services/slack/slack-agents.js |
| 6 | `notion-sync` initialization | services/notion/notion-sync.js |
| 7 | `supabase-notion-sync.runFullSync()` | services/sync/supabase-notion-sync.js |
| 8 | `slack-system-health.runHealthCheck()` | services/slack/slack-system-health.js |
| 9 | pg pool connection test | lib/pg_database.js |

---

## Key Cross-Component Relationships

```
server.js
  │
  ├── [middleware] civilization-kernel.js
  │       ├── lib/runtime/execution-context
  │       ├── lib/runtime/constitutional-gate
  │       ├── lib/goals/goal-graph
  │       ├── lib/attention/attention-engine
  │       ├── lib/memory/gateway  ← single memory access point
  │       ├── lib/cognitive/runtime/autonomy-runtime-controller [lazy]
  │       └── lib/constitution/watchdog [lazy]
  │
  ├── [middleware] lib/kernel.js → kernelChain
  │       ├── lib/middleware (resolveIdentity, resolveOwnership)
  │       └── lib/agent-file-utils (checkAuthority, checkGovernance)
  │
  ├── [hub] lib/memory/gateway.js ← ALL memory consumers route here
  │       ├── lib/memory/index (working, episodic, semantic, procedural, strategic, skill, decision, knowledge-graph)
  │       ├── lib/memory/access-controller
  │       ├── lib/memory/sanitizer
  │       ├── lib/memory/cache
  │       ├── lib/memory/founder-memory
  │       ├── lib/clients (Supabase)
  │       ├── lib/logger
  │       ├── lib/health/monitor
  │       ├── lib/memory/reflexion-tracker [lazy]
  │       ├── lib/memory/working-memory [lazy]
  │       ├── lib/memory/adaptation-cycle [lazy]
  │       ├── lib/founder/context-provider [lazy]
  │       ├── lib/governance [lazy]
  │       └── lib/intelligence/sie [lazy]
  │
  ├── [hub] lib/clients.js ← Supabase client singleton
  │       ├── @anthropic-ai/sdk
  │       └── @supabase/supabase-js
  │       Exports: getAnthropicClient, getSupabaseClient, getHoldoutClient
  │
  ├── [hub] lib/pg_helpers.js ← 30+ Supabase JS query helpers
  │       ├── lib/clients (supabase)
  │       └── lib/memory/sanitizer
  │
  ├── [pipeline] agent-system/orchestrator.js ← runAgentTeam
  │       ├── agent-system/obsidian-memory
  │       ├── agent-system/agent-pipeline-hooks
  │       ├── lib/governance
  │       ├── agent-system/agent-reputation
  │       ├── agent-system/episodic-memory
  │       ├── agent-system/memory-indexer
  │       ├── agent-system/dynamic-agent-selector
  │       ├── agent-system/execution-verifier
  │       ├── agent-system/goal-tracker
  │       ├── agent-system/adaptation-engine
  │       ├── agent-system/reflection-engine
  │       ├── lib/models/runtime
  │       ├── lib/memory/gateway
  │       ├── runtime/task-router
  │       ├── lib/memory/reflexion-tracker
  │       ├── agent-system/firecrawl-bridge [lazy]
  │       ├── agent-system/obsidian-client [lazy]
  │       └── agent-system/browser-agent [lazy]
  │
  ├── [governance] lib/governance.js
  │       ├── @supabase/supabase-js (direct createClient)
  │       ├── crypto
  │       ├── lib/canonical-json
  │       ├── lib/logger
  │       └── services/slack/slack-alerts [lazy]
  │
  └── [cron] lib/cron-scheduler.js (started at listen)
          ├── lib/logger
          ├── lib/clients (sbAdmin)
          ├── lib/models/runtime
          ├── agent-system/obsidian-memory [lazy]
          ├── agent-system/obsidian-client [lazy]
          ├── services/pipelines/daily-briefing-pipeline [lazy]
          ├── services/slack/slack-briefings [lazy]
          └── agent-system/adaptation-engine [lazy]
```

---

## Component Status Summary

| Component | Status | Evidence |
|-----------|--------|---------|
| server.js | Production — Live on Render | render.yaml confirmed |
| middleware/civilization-kernel | Production — Active on every request | server.js:409 |
| lib/kernel.js | Production — Active on every /api/ request | server.js:638 |
| lib/memory/gateway.js | Production — Active | Multiple consumers confirmed |
| lib/clients.js | Production — Active | Singleton pattern, all modules use it |
| agent-system/orchestrator.js | Production — Active | Called at every agent dispatch |
| services/init.js | Production — Starts 8 subsystems at listen | server.js:4511 |
| lib/cron-scheduler.js | Production — Running on Render | Confirmed firing |
| lib/integrity-crons.js | Production — Confirmed firing | CONSTITUTION.md |
| lib/outbox-relay.js | Production — Started by init.js | services/init.js:38 |
| lib/constitution/watchdog.js | Production — Active, 30 min tick | server.js:4518 |
| lib/intelligence/civilization-runtime.js | Production — Active | admin endpoint confirmed |
| src/routes/telemetry/index.js | Production — Mounted at `/` | server.js:4065 — NOT unknown |
| lib/ws-handler.js | Production — WebSocket server | Stopped on SIGTERM |
