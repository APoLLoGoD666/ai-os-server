# 02 — Module Relationships

**Date:** 2026-07-02  
**Evidence Source:** grep require() across all module files

---

## lib/memory/ — Memory Fabric

### lib/memory/gateway.js

**Role:** Single access point for all memory operations. All consumers route through here.

**Imports:**
- `./index` — re-exports all memory layer modules
- `./access-controller` — AccessController class
- `./sanitizer` — sanitize()
- `./cache` — in-process cache
- `./founder-memory` — founder-specific memory
- `../clients` — getSupabaseClient()
- `../logger` — logger
- `../health/monitor` — health monitoring
- `./reflexion-tracker` [lazy, line 86]
- `./working-memory` [lazy, line 102]
- `./adaptation-cycle` [lazy, line 286]
- `../founder/context-provider` [lazy, line 403]
- `../governance` [lazy, line 568]
- `../intelligence/sie` [lazy, line 596]

**Exports:** `{ getContext, readMemory, writeMemory, ... }` (module.exports = { ... } at line 612)

**Consumed by (confirmed):**
- server.js (_gateway)
- agent-system/orchestrator.js (_gateway)
- middleware/civilization-kernel.js (memGateway)
- lib/intelligence/civilization-runtime.js (gateway, gw)
- lib/chat-context.js (_gateway)
- src/routes/telemetry/index.js (via health check)

### lib/memory/index.js

**Role:** Exports all memory layer instances as named exports.

**Exports:**
- `working-memory`
- `episodic-memory-pg`
- `semantic-memory`
- `procedural-memory`
- `strategic-memory`
- `skill-memory`
- `decision-memory`
- `knowledge-graph`
- `consolidation-engine`
- `reflexion-tracker`
- `improvement-engine`
- `adaptation-cycle`
- `memory-governor`

**Consumed by:** lib/memory/gateway.js (mem = require('./index'))

### routes/memory.js

**Imports:**
- `express`
- `lib/app-auth` (auth middleware)
- `lib/memory` (index — all layers)

---

## lib/cognitive/ — Cognitive Engine

### lib/cognitive/index.js

**Role:** Barrel export — loads all 16 cognitive engines as named exports.

**Exports (all engines loaded at import time):**
- `reasoning-strategy-engine`
- `planning-strategy-engine`
- `execution-strategy-engine`
- `confidence-aware-autonomy-engine`
- `execution-influence-engine`
- `retrieval-evaluation-engine`
- `knowledge-decay-engine`
- `meta-reasoning-engine`
- `cognitive-performance-engine`
- `cognitive-evolution-engine`
- `organizational-intelligence-engine`
- `cognitive-digital-twin`
- `cognitive-validation-framework`
- `retrieval-policy-engine`
- `behavior-modification-engine`
- `cognitive-policy-engine`

**Consumed by:** routes/cognitive.js (cog = require('../lib/cognitive'))

### lib/cognitive-orchestrator.js

**Imports:**
- `./event-bus` (bus)
- `./latency-tracker` (tracker)
- `./session-state-registry` (registry)
- `./persistent-cognition-manager` [lazy circular avoidance]
- `./executive-arbitration-engine` [lazy circular avoidance]
- `./strategic-planning-engine` [lazy circular avoidance]

**Exports:** `{ shape, classifyIntent, determineMode, sessionState, counter, ... }`

**Consumed by:** server.js (_cogOrch)

### lib/cognitive/runtime/

**Role:** 10 runtime controllers — called during request lifecycle.

**Consumed by (confirmed):**
- middleware/civilization-kernel.js (autonomy-runtime-controller, lazy line 83)
- server.js chat handler (lib/cognitive/runtime, lazy inline)

---

## lib/constitution/ — Constitutional Engine

### lib/constitution/watchdog.js

**Imports:**
- `lib/logger`
- `./drift-detector` [lazy]
- `./evolution-manager` [lazy]
- `./crisis-manager` [lazy]
- `./risk-monitor` [lazy]
- `./steward` [lazy]

**Exports:** `{ tick, start, stop, isActive, getLastAssessment, getTickCount }`

**Consumed by:**
- server.js (started at listen, every 30 min tick)
- middleware/civilization-kernel.js (getLastAssessment, lazy line 240)

---

## lib/governance.js

**Imports:**
- `@supabase/supabase-js` (createClient — direct, not via lib/clients)
- `crypto` (createHash, randomUUID)
- `os`
- `./canonical-json`
- `./logger`
- `services/slack/slack-alerts` [lazy line 38]

**Exports:** Large exports object (module.exports at line 974)

**Consumed by:**
- agent-system/orchestrator.js (_gov)
- routes/governance.js [lazy]

---

## lib/kernel.js

**Imports:**
- `./middleware` (resolveIdentity, resolveOwnership)
- `./agent-file-utils` (checkAuthority, checkGovernance)

**Exports:** `{ kernelChain }`

**Consumed by:** server.js (applied to all /api/ routes at line 638)

---

## middleware/civilization-kernel.js

**Imports:**
- `fs`, `path`
- `../lib/runtime/execution-context`
- `../lib/runtime/constitutional-gate`
- `../lib/goals/goal-graph`
- `../lib/attention/attention-engine`
- `../lib/memory/gateway`
- `../lib/cognitive/runtime/autonomy-runtime-controller` [lazy line 83]
- `../lib/constitution/watchdog` [lazy line 240]

**Exports:** `civilizationKernel` (single middleware function)

**Consumed by:** server.js (app.use — applied to ALL requests, line 409)

---

## lib/clients.js

**Imports:**
- `@anthropic-ai/sdk` (Anthropic)
- `@supabase/supabase-js` (createClient)

**Exports:** `{ getAnthropicClient, getSupabaseClient, getHoldoutClient }`

**Pattern:** Singleton — lazy init, memoized instances.

**Consumed by (confirmed):**
- server.js (sbAdmin = getSupabaseClient())
- lib/pg_helpers.js (supabase = getSupabaseClient())
- lib/memory/gateway.js (getSupabaseClient)
- lib/chat-context.js (sbAdmin = getSupabaseClient())
- lib/outbox-relay.js (createClient direct) — uses createClient not wrapper
- lib/integrity-crons.js (createClient direct)
- lib/governance.js (createClient direct)
- routes/briefing.js
- routes/civilization.js
- routes/entities.js
- routes/finance.js
- routes/health.js
- routes/intelligence.js
- routes/journal.js
- routes/knowledge-graph.js (via lib/memory/knowledge-graph)
- routes/observatory.js
- routes/pwa.js
- routes/relationships.js
- routes/spiritual.js
- routes/university.js
- routes/wealth.js
- routes/operations.js
- services/init.js (createClient direct)
- src/routes/telemetry/index.js

---

## lib/pg_helpers.js

**Imports:**
- `./clients` (supabase = getSupabaseClient())
- `./memory/sanitizer` (sanitize)

**Exports:** 30+ functions (module.exports at line 749):
- Document operations: pgListDocuments, pgSaveDocument, pgGetDocument, pgSearchDocuments, pgDeleteDocument, pgRenameDocument, pgUpdateDocumentSummary
- Memory operations: pgLoadMemory, pgLoadFacts
- Agent operations: pgLogAgentAction, pgGetRecentAgentActions, pgGetLastUndoableAgentAction, pgMarkAgentActionUndone
- Task operations: pgCreateAgentTask, pgUpdateAgentTask, pgGetAgentTask, pgGetRecentAgentTasks, pgGetLatestWaitingAgentTask
- Schedule operations: pgCreateAgentSchedule, pgGetAgentSchedule, pgListAgentSchedules, pgDisableAgentSchedule, pgUpdateAgentScheduleLastRun, pgGetDueAgentSchedules
- Notification operations: pgCreateNotification, pgListNotifications, pgMarkNotificationRead
- Reflection operations: pgCreateAgentReflection, pgListAgentReflections, pgGetApprovedReflections, pgApproveAgentReflection
- Approval operations: pgCreateStandingApproval, pgListStandingApprovals, pgDisableStandingApproval, pgGetEnabledStandingApprovals
- Finance operations: pgListEmailQueue, pgUpdateEmailQueueStatus, pgSaveTransaction, pgListTransactions, pgGetFinanceSummaryCurrentMonth, pgSaveBudget, pgListBudgets
- Routine operations: pgCreateRoutine, pgListRoutines, pgUpdateRoutine, pgDeleteRoutine
- Email operations: pgSaveGmailToken, pgGetGmailToken, pgClearGmailToken

**Consumed by:**
- server.js (direct import of all 30+ functions)
- lib/middleware.js (pgGetAgentTask)
- lib/chat-context.js

---

## lib/pg_database.js

**Imports:**
- `pg` (Pool)
- `./logger`

**Exports:** `pool` (raw pg Pool instance)

**Purpose:** Raw PostgreSQL pool — used for schema operations and pgvector (cannot use Supabase JS for these).

**Consumed by:**
- server.js [lazy at startup for schema ops and pgvector setup]
- lib/outbox-relay.js (_pgPool)
- lib/event-consumer.js (_pgPool)
- routes/observatory.js (_pg)
- routes/intelligence.js [lazy]
- services/init.js (connection test)
- src/routes/telemetry/index.js [lazy]

---

## lib/cron-scheduler.js

**Imports:**
- `./logger`
- `./clients` (sbAdmin = getSupabaseClient())
- `./models/runtime`
- `./cron-logger` [lazy inside jobs]
- `../agent-system/obsidian-memory` [lazy inside jobs]
- `../agent-system/obsidian-client` [lazy inside jobs]
- `../services/pipelines/daily-briefing-pipeline` [lazy inside jobs]
- `../services/slack/slack-briefings` [lazy inside jobs]
- `../agent-system/adaptation-engine` [lazy inside jobs]

**Exports:** `{ start }` (implied — started via .start() in server.js)

**Cron Jobs Registered:**
- `wiki_consolidation` — agent-system/obsidian-memory consolidation
- `vault_health` — agent-system/obsidian-client vault health
- `daily_briefing` — services/pipelines/daily-briefing-pipeline.runDailyBriefing()
- `weekly_review` — services/slack/slack-briefings + obsidian write
- `adaptation_refresh` — agent-system/adaptation-engine

**Consumed by:** server.js (lib/cron-scheduler.start() at line 4662)

---

## lib/integrity-crons.js

**Imports:**
- `./logger`
- `@supabase/supabase-js` (createClient — direct)
- `../services/slack/slack-alerts` [lazy line 186]
- `./cron-logger` (wrapCron)
- `./civilization/domain-scorer` [lazy factory]
- `./civilization/admission-engine` [lazy factory]
- `./consolidation-engine` [lazy factory] — Note: using `lib/consolidation-engine` not `lib/memory/consolidation-engine`
- `./memory/adaptation-cycle` (repairStuckCycles)

**Exports:** `{ backup, reconcile, start }`

**Cron Jobs:**
- `integrity_backup` — confirmed firing on Render
- `integrity_reconcile` — confirmed firing on Render

**Consumed by:** services/init.js (integrity-crons.start() at line 45)

---

## lib/outbox-relay.js

**Imports:**
- `crypto`
- `./logger`
- `./canonical-json`
- `@supabase/supabase-js` (createClient — direct, _sb singleton)
- `./pg_database` (_pgPool)
- `../services/slack/slack-alerts` [lazy line 107]

**Exports:** `{ relay, start, stop }`

**Consumed by:** services/init.js (outbox-relay.start() at line 38)

---

## lib/write-with-outbox.js

**Imports:**
- `crypto`
- `./canonical-json`
- `@supabase/supabase-js` (createClient — direct)

**Exports:** `{ writeWithOutbox }`

**Purpose:** Atomic write via `write_outbox_with_state` PL/pgSQL RPC — state change + outbox INSERT in one transaction.

**Consumed by:** UNKNOWN — no confirmed require() found in evidence. Present in CONSTITUTION.md as canonical write mechanism.

---

## lib/event-bus.js

**Imports:**
- `events` (EventEmitter)

**Exports:** `bus` (EventEmitter singleton)

**Consumed by:**
- server.js (_bus)
- lib/cognitive-orchestrator.js (bus)
- lib/event-consumer.js (implied)
- routes/intelligence.js (bus, lazy line 192)
- services/slack/slack-agents.js (via services/init.js event subscription)
- src/routes/telemetry/index.js (bus, lazy line 175)
- lib/intelligence/civilization-runtime.js (eventBus, line 204)

---

## lib/event-consumer.js

**Imports:**
- `@supabase/supabase-js` (createClient)
- `./logger`
- `./pg_database` (_pgPool)
- `../services/slack/slack-agents` [lazy line 58]

**Exports:** `{ start, stop }`

---

## lib/middleware.js

**Imports:**
- `jsonwebtoken`
- `crypto`
- `./pg_helpers` (pgGetAgentTask)

**Exports:** `{ requireAppAccess, hasCronAccess, requireCronAccess, requireAuth, parseCookies, hasAppAccess, resolveIdentity, resolveOwnership, LOGIN_HTML }`

**Consumed by:**
- server.js ({ hasAppAccess, requireAppAccess, hasCronAccess, requireCronAccess, parseCookies, requireAuth })
- lib/kernel.js (resolveIdentity, resolveOwnership)
- lib/app-auth.js (re-exports requireAppAccess)

---

## lib/app-auth.js

**Content:** Single line — `module.exports = require('./middleware').requireAppAccess`

**Purpose:** Thin alias so route files can `require('../lib/app-auth')` without knowing about middleware.js.

**Consumed by:** ALL route files that use auth (agents.js, briefing.js, finance.js, memory.js, intelligence.js, cognitive.js, governance.js, civilization.js, executive-performance.js, operations.js, health.js, observatory.js, entities.js, knowledge-graph.js, founder.js, spiritual.js, journal.js, relationships.js, voice-chat.js, wealth.js, university.js, tts-gemini.js, pwa.js, and all others)

---

## lib/embed.js

**Imports:** `https` (Node built-in for Voyage AI API calls)

**Exports:** `{ embedText }`

**Purpose:** Text embedding — likely calls Voyage AI or similar embedding API via HTTPS directly.

**Consumed by:** server.js ({ embedText })

---

## lib/logger.js

**Exports:** `{ info, warn, error, debug, ... }` (module.exports at line 19)

**Consumed by:**
- server.js (_log)
- lib/outbox-relay.js
- lib/pg_database.js
- lib/cron-scheduler.js
- lib/governance.js
- lib/memory/gateway.js
- lib/intelligence/civilization-runtime.js
- lib/constitution/watchdog.js
- lib/event-consumer.js
- runtime/task-router.js
- and many others

---

## services/init.js

**Imports:**
- `@supabase/supabase-js` (createClient)
- `../lib/outbox-relay` (start)
- `../lib/integrity-crons` (start)
- `../lib/entities/relationship-consumer` (register)
- `../lib/pwa/notification-scheduler` (start)
- `../lib/event-bus` (bus)
- `./slack/slack-agents`
- `./notion/notion-sync`
- `./slack/slack-alerts` (alertError)
- `./sync/supabase-notion-sync` (runFullSync, ensureCheckpointTable)
- `./slack/slack-system-health` (runHealthCheck)
- `../lib/pg_database` (connection test)

**Exports:** `{ init }`

**Consumed by:** server.js at listen (`services/init.init(app, sbAdmin)`)

---

## lib/ws-handler.js

**Imports:**
- `ws` (WebSocketServer)
- `./session-state-registry`
- `crypto` (timingSafeEqual)

**Exports:** `{ init, stop, wsBroadcast, wsSend, wsChunkedSend }`

**Consumed by:** server.js (wsHandler = require at startup, wsHandler.stop() on SIGTERM)

---

## runtime/task-router.js

**Imports:**
- `../lib/logger`

**Exports:** `{ route, routeAndLog, RouteDecision }`

**Purpose:** Routes tasks based on objective analysis — determines if task requires approval, skips research, is persona-related.

**Consumed by:**
- agent-system/orchestrator.js (_taskRouter)
- lib/intelligence/civilization-runtime.js (taskRouter)

---

## lib/intelligence/civilization-runtime.js

**Imports:**
- `../logger`
- `./global-intelligence-engine` (gig, lazy)
- `./decision-outcome-engine` (outcomes, lazy)
- `../memory/gateway` (gateway, gw)
- `./civilization-health-engine` [lazy inside run methods]
- `../founder/graph` (founderGraph, lazy)
- `../executive/executive-council` (council, lazy)
- `./strategy-engine` (strategyEngine, lazy)
- `./opportunity-engine` (oppEngine, lazy)
- `../founder` (founderOS, lazy)
- `../../runtime/task-router` (taskRouter, lazy)
- `../event-bus` (eventBus, lazy)

**Exports:** `{ isRunning, getCycleCount, runOnce, start, stop }` (implied from server.js usage)

**Consumed by:**
- server.js (admin endpoints — isRunning, getCycleCount, runOnce)
- routes/civilization.js (implied via health endpoint)

---

## src/routes/telemetry/index.js

**Status:** CONFIRMED MOUNTED — previously listed as unknown. Evidence: server.js:4065

**Pattern:** Factory function — `module.exports = function makeTelemetryRouter({ requireAppAccess, getStatus, errBuffer, gitSha })`

**Imports (inside factory):**
- `express`
- `../../../lib/clients` (sbAdmin)
- `../../../lib/pg_database` [lazy]
- `../../../routes/intelligence` [lazy]
- `../../../lib/agent-queue` [lazy]
- `../../../agent-system/agent-library` [lazy]
- `../../../lib/latency-tracker` [lazy]
- `../../../lib/event-bus` [lazy]

**Provides endpoints:**
- `GET /health` — DB health check (duplicate of server.js /health)
- `GET /api/system/health/detailed` — detailed subsystem health
- `GET /api/intelligence/agent-runs` — agent run log
- `GET /api/intelligence/cost-summary` — API cost summary
- `GET /api/intelligence/lessons` — lessons learned
- `GET /api/intelligence/self-check` — system self-check
- Additional telemetry endpoints

**Consumed by:** server.js as primary app (mounted at `/`)

---

## lib/cognitive-orchestrator.js

**Imports:**
- `./event-bus` (bus)
- `./latency-tracker` (tracker)
- `./session-state-registry` (registry)
- `./persistent-cognition-manager` [lazy — avoids circular]
- `./executive-arbitration-engine` [lazy — avoids circular]
- `./strategic-planning-engine` [lazy — avoids circular]

**Exports:** `{ shape, classifyIntent, determineMode, sessionState, counter, ... }`

**Consumed by:** server.js (_cogOrch)

---

## lib/chat-context.js

**Imports:**
- `./pg_helpers` (memory/fact loading functions)
- `./models/runtime`
- `./memory/sanitizer`
- `./clients` (sbAdmin)
- `../agent-system/obsidian-client` (obsidianRead, obsidianAppend)
- `./memory/gateway` (_gateway)
- `./founder/privacy-guard` [lazy line 181]

**Exports:** `{ createAgentNotification, loadMemory, timeAgo, formatRecentMemory, getMemorySummary, fetchSelfContext, buildPrompt, backgroundClassifyAndSummarise, extractAndSaveFacts, buildAlexContext }`

**Consumed by:** server.js (main chat handler)
