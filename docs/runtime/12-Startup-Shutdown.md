# 12 — Startup and Shutdown

**Date:** 2026-07-02  
**Evidence Source:** server.js (startup sequence, deferred loads), services/init.js, render.yaml, lib/cron-scheduler.js, lib/integrity-crons.js

---

## Build Phase (Before Process Start)

Render executes build command before starting server.js:

```bash
npm install --legacy-peer-deps && node scripts/certify.js
```

`scripts/certify.js` is a **deployment gate**:
- Runs 4 certification clauses (behavioral check, domain seeding, trait promotion, health check)
- `exit 0` → deploy proceeds
- `exit 1` → deploy fails, Render rolls back

If certification fails, server.js never starts. The build-time gate catches configuration/data problems before they reach production.

---

## Startup Phase 1 — Module Load (Synchronous)

When `node --max-old-space-size=220 server.js` runs, Node.js `require()` statements execute synchronously in order. Key modules loaded at startup:

```
server.js requires:
  express, fs, path, os, crypto, http
  dotenv → .env loaded
  express-rate-limit
  helmet
  cors
  jsonwebtoken
  lib/clients (getSupabaseClient, getAnthropicClient)
  lib/pg_helpers (all 63 pg* functions + Pool from lib/pg_database.js)
  lib/middleware (requireAuth, requireAppAccess, requireCronAccess)
  lib/app-auth → lib/middleware.requireAppAccess (shim)
  lib/kernel (kernelChain)
  lib/agent-task-cycle (all exports)
  lib/memory/gateway (_gateway)
  lib/ws-handler
  lib/event-bus
  lib/event-consumer
  lib/logger
  lib/agent-queue (_agentQueue)
  agent-system/orchestrator (runAgentTeam)
  agent-system/domain-agents (DOMAIN_AGENTS)
  agent-system/email_agent (initEmailAgent, etc.)
  agent-system/finance_agent (categoriseTransaction, etc.)
  agent-system/routine_agent (initRoutineAgent)
  agent-system/reflection_agent (runReflectionCheck)
  agent-system/cloud_autopilot (previewCloudAutopilot, etc.)
  lib/executive-arbitration-engine (_eae)
  lib/strategic-planning-engine (_spe)
  lib/models/runtime (runtime)
  config (model constants)
```

**Memory cost of module loading:** All static imports execute their module-level code at load time. This includes:
- `lib/governance.js` → creates own Supabase client at module load
- `lib/executive-arbitration-engine.js` → starts 10-minute setInterval for thread eviction
- `lib/models/runtime/index.js` → initializes circuit breaker state maps
- `lib/strategic-planning-engine.js` → registers event bus listeners

---

## Startup Phase 2 — Express App Configuration (Synchronous)

```
1. app = express()
2. app.use(cors()) — with allowed origins
3. app.use(helmet(...)) — CSP and security headers
4. app.use(express.json({ limit: '10mb' }))
5. app.use(express.urlencoded({ extended: true }))
6. Content-type enforcement middleware registered
7. app.use(generalLimiter) — 300 req/15min
8. Execution class tagger middleware registered
9. app.use(require('./middleware/civilization-kernel')) — all routes
10. Static file routes registered:
    GET /manifest.json, GET /sw.js, GET /apex-v2.css, GET /apex-custom.css
11. Public HTML files served (dashboard.html, editor.html)
12. POST /auth/login (with authLimiter)
13. GET /health inline handler
14. Dashboard auth routes registered
15. app.use('/api', ...kernelChain) — all /api/* routes
16. Cron auth routes registered
17. POST /chat (with chatLimiter)
18. _loadAgentRoutes() — 42 route files auto-loaded
19. Remaining inline /api/* routes registered (lines 4040-4240)
20. Error handler registered
```

---

## Startup Phase 3 — HTTP Server + Listen (Async)

```javascript
const server = http.createServer(app)

// WebSocket server initialized (noServer mode, attaches to upgrade event)
lib/ws-handler.init(server)

// Memory subsystem async loads
lib/goals/goal-graph._load()  // async fire-and-forget, no await

// HTTP server begins listening
server.listen(PORT, () => {
  // === Listen callback fires here ===
})
```

---

## Startup Phase 4 — Listen Callback (Immediate, at listen)

Everything here runs inside the `server.listen` callback — at the moment the process starts accepting HTTP connections:

```
T+0s (listen):
  console.log('Server started on port', PORT)
  
  services/init.js init()
    ├── setImmediate: db-migrate.runLifeDomainMigration()
    ├── outbox-relay.start() [10s polling interval]
    ├── integrity-crons.start()
    ├── relationship-consumer.register()
    ├── notification-scheduler.start()
    └── [if tokens] event bus wiring, Notion sync setup, Slack health setup

  lib/intelligence/civilization-runtime.js start()
    ├── _tick() called immediately (first tick)
    └── setInterval(_tick, 6 * 60 * 60 * 1000)  [every 6h]

  lib/cron-scheduler.start()
    ├── wiki_consolidation [weekly]
    ├── vault_health [regular]
    ├── daily_briefing [daily]
    ├── weekly_review [weekly]
    └── adaptation_refresh [weekly]

  agent-system/email_agent.initEmailAgent()
  agent-system/routine_agent.initRoutineAgent()
  agent-system/reflection_agent schedule setup
```

---

## Startup Phase 5 — Deferred Loads

```
T+5min (setTimeout 300000):
  Mastra agent initialization
    ├── require('@mastra/core') — heavy import
    ├── require('@mastra/memory') — heavy import
    └── getMastraStatus() → updates /health response
  
  [If NOTION_API_KEY]:
    services/sync/supabase-notion-sync.runFullSync()  [first sync]
  
  [If SLACK_BOT_TOKEN]:
    services/slack/slack-system-health.runHealthCheck()  [first health post]

T+10min (setTimeout 600000):
  Ruflo daemon spawn:
    child_process.spawn(
      'node_modules/.bin/ruflo', ['daemon', 'start'],
      { detached: true, stdio: 'ignore' }
    )
```

---

## Full Startup Timeline

```
T+0s    Process starts
         └── Module loads (synchronous) [~2-5s estimated]
         └── Express configuration (synchronous) [<1s]
         └── server.listen() called

T+?s    Server accepting connections (health check responds 200)
         └── services/init.js cascade begins
         └── civilization-runtime.js first tick begins
         └── cron-scheduler registered

T+?min  Civilization tick completes (8 phases, LLM call involved)

T+5min  Mastra agents attempt initialization
        Notion sync + Slack health first run

T+10min Ruflo daemon spawned as child process
```

At what point Render's health check (`/health`) begins receiving traffic after listen is UNKNOWN — depends on Render's internal timing between listen and traffic routing.

---

## Startup Memory Budget

Peak memory during startup is ~340MB (from render.yaml comment) before settling to ~280MB steady-state.

Key memory consumers at startup:
- Node.js + V8 overhead: ~50MB base
- Static module imports: governance.js, executive-arbitration-engine.js, orchestrator.js, all pg_helpers, all agent modules
- Supabase client connections: 5 clients initialized by module load time
- goal-graph.js async load: pulls from DB into in-memory Maps

The +5min and +10min deferrals exist specifically to let the peak settle before adding Mastra and Ruflo memory costs.

---

## Shutdown

No confirmed graceful shutdown handler in server.js (UNKNOWN — may exist but was not read in full).

**Render behavior:** On deploy or restart, Render sends SIGTERM. If no handler: Node.js exits immediately. In-flight requests are aborted. In-flight memory writes (setImmediate callbacks) that haven't fired yet are dropped.

**Risk:** Memory writes queued via setImmediate but not yet executed are lost on shutdown. This includes:
- Episodic memory writes from civilization-kernel.js post-hooks
- Governance evidence writes
- Fact extraction (from extractAndSaveFacts)
- Lesson storage (logLesson)

**Ruflo daemon:** Spawned with `detached: true` — continues running after parent process exits. Render likely cleans it up as part of container lifecycle.

---

## Certification (Build-Time Gate)

```
scripts/certify.js runs:

Clause 1: Behavioral Check
  → Makes HTTP request to /health
  → Checks response.ok === true
  → exit 1 on failure

Clause 2: Agent Task Presence
  → Checks apex_agent_tasks count

Clause 3: Domain Seeding
  → Checks minDomainsSeeded >= 6 (source table: UNKNOWN)

Clause 4: Trait Promotion
  → Checks minPromotedTraits >= 1 (source table: UNKNOWN)
  → requiresInjection: true
```

All 4 clauses must pass. Any failure → `exit 1` → Render deploy fails.

The certification is run against the PRODUCTION database (or whatever SUPABASE_* env vars point to during build). A cold database with empty tables will fail clause 3 and 4.
