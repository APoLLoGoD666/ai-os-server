# 13 — Dependency Graph

**Date:** 2026-07-02  
**Evidence Source:** All files read in Phase 2.1, grep scans, import analysis

---

## Central Hubs (Most Imported Modules)

| Module | Approximate Consumer Count | Role |
|--------|--------------------------|------|
| lib/memory/gateway.js | 39 files | Memory access singleton |
| lib/app-auth.js (→ lib/middleware.js) | ~40 route files | Auth middleware |
| lib/clients.js (getSupabaseClient) | ~30 files | Supabase singleton |
| lib/pg_helpers.js | ~20 files | DB query functions |
| lib/logger.js | Widespread | Logging |
| agent-system/obsidian-memory.js | 20 files | Vault access |
| lib/memory/index.js | routes/memory.js + lib/memory/gateway.js | Memory layer barrel |

---

## Barrel Exports

### lib/memory/index.js

13 modules exported as single object:
```
workingMemory, episodicMemory, semanticMemory, proceduralMemory,
strategicMemory, skillMemory, decisionMemory, knowledgeGraph,
consolidationEngine, reflexionTracker, improvementEngine,
adaptationCycle, governor
```

**Consumers:** lib/memory/gateway.js, routes/memory.js

### lib/cognitive/index.js

16 cognitive engines exported as barrel:
```
(16 named engines — exact names UNKNOWN, confirmed as barrel)
```

**Consumers:** lib/cognitive-orchestrator.js (inferred), lib/intelligence/* (inferred)

---

## Circular Dependency Workarounds

### lib/cognitive-orchestrator.js

**Problem:** Would create circular with lib/executive-arbitration-engine.js and lib/strategic-planning-engine.js if statically imported

**Solution:** Lazy references
```javascript
let _eaeRef;  // lazy load: lib/executive-arbitration-engine
let _speRef;  // lazy load: lib/strategic-planning-engine
```

**Evidence:** server.js comment on _eae and _spe: "lazy, avoids circular — _eaeRef"

### lib/constitution/watchdog.js

**Problem:** Would create circular if statically imported from lib/

**Solution:** All 5 internal deps are lazy:
- `./drift-detector` [lazy]
- `./evolution-manager` [lazy]
- `./crisis-manager` [lazy]
- `./risk-monitor` [lazy]
- `./steward` [lazy]

### middleware/civilization-kernel.js

**Problem:** Needs watchdog + autonomy-runtime-controller at request time without startup circular

**Solution:** Lazy requires:
- `lib/cognitive/runtime/autonomy-runtime-controller` [lazy]
- `lib/constitution/watchdog` (getLastAssessment) [lazy]

---

## Dead-End Modules (No Confirmed Consumers)

### lib/write-with-outbox.js

**Exports:** `{ writeWithOutbox }`

**Grep result:** 0 confirmed production consumers (grep of 39+ files, none import it)

**Expected consumers:** Should be the canonical atomic write mechanism (described in CONSTITUTION.md), but no call sites found in source grep

**Hypothesis:** Either called dynamically (string require), used only in tests, or superseded by direct Supabase writes

---

## Duplicate File Relationships

### agent-system/agent-pipeline-hooks.js vs services/pipelines/agent-pipeline-hooks.js

**Confirmed:** Both files exist (from census)

**Consumer:** agent-system/orchestrator.js imports `./agent-pipeline-hooks` → agent-system version

**Relationship between copies:** UNKNOWN (U86 in unknowns) — may be: same file copied, diverged fork, or one is stale

### lib/consolidation-engine.js vs lib/memory/consolidation-engine.js

**lib/memory/consolidation-engine.js:** Exported by lib/memory/index.js (confirmed)

**lib/consolidation-engine.js:** Imported by lib/integrity-crons.js as `./consolidation-engine`

**Relationship:** UNKNOWN — may be: two different consolidation functions, same file at two paths, or one is stale

### agent-system/reflexion-tracker.js vs lib/memory/reflexion-tracker.js

**lib/memory/reflexion-tracker.js:** Exported in lib/memory/index.js, imported by orchestrator (`../lib/memory/reflexion-tracker`)

**agent-system/reflexion-tracker.js:** Possible separate file (grep found agent-system/ path in some imports)

**Relationship:** UNKNOWN — may be: the agent-system version is an older path; lib/memory version is canonical

---

## Independent Supabase Clients (Parallel Connections)

Five modules bypass lib/clients.js singleton and create own Supabase connections:

```
lib/clients.js ──────────────── getSupabaseClient() [singleton]
        │
        ├── lib/pg_helpers.js (primary consumer)
        ├── lib/memory/gateway.js
        └── ~28 other modules

lib/governance.js ──────────── createClient() [own connection]
lib/integrity-crons.js ─────── createClient() [own connection]
lib/outbox-relay.js ────────── createClient() [own connection]  
lib/write-with-outbox.js ───── createClient() [own connection]
routes/intelligence.js ─────── createClient() [own _sbClient singleton]
```

**Risk:** Up to 6 separate Supabase connection pools on a 220MB heap process. Each Supabase JS client maintains its own HTTP connection pool.

---

## Duplicate Route Definitions (server.js)

### GET /health/deep

```
Line 467:  app.get('/health/deep', requireAppAccess, async (req, res) => { ... })
Line 4088: app.get('/health/deep', requireAppAccess, async (req, res) => { ... })
```

**Effect:** Express first-match wins — line 467 handles all requests. Line 4088 never executes.

### GET /api/cognitive/report

```
Line 4111: app.get('/api/cognitive/report', requireAppAccess, async (req, res) => { ... })
Line 4138: app.get('/api/cognitive/report', requireAppAccess, async (req, res) => { ... })
```

**Effect:** Line 4111 handles all requests. Line 4138 never executes.

---

## Import Graph: server.js Static Imports

```
server.js
├── express, fs, path, os, crypto, http
├── dotenv
├── express-rate-limit
├── helmet
├── cors
├── jsonwebtoken
├── @anthropic-ai/sdk (or via lib/clients)
├── lib/clients (getSupabaseClient, getAnthropicClient)
├── lib/pg_helpers (30+ pg* functions)
├── lib/middleware (requireAuth, requireAppAccess, requireCronAccess)
├── lib/app-auth (→ lib/middleware.requireAppAccess)
├── lib/kernel (kernelChain)
├── lib/agent-task-cycle (buildAgentPlan, runAgentPlanningCycle, etc.)
├── lib/memory/gateway (_gateway)
├── lib/ws-handler
├── lib/event-bus
├── lib/event-consumer
├── lib/logger
├── lib/agent-queue (_agentQueue)
├── agent-system/orchestrator (runAgentTeam)
├── agent-system/domain-agents (DOMAIN_AGENTS)
├── agent-system/email_agent (initEmailAgent, etc.)
├── agent-system/finance_agent (categoriseTransaction, etc.)
├── agent-system/routine_agent (initRoutineAgent)
├── agent-system/reflection_agent (runReflectionCheck)
├── agent-system/cloud_autopilot (previewCloudAutopilot, etc.)
├── lib/executive-arbitration-engine (_eae)
├── lib/strategic-planning-engine (_spe)
├── lib/models/runtime (runtime)
└── config (HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL, etc.)
```

---

## Import Graph: agent-system/orchestrator.js Static Imports

```
orchestrator.js
├── fs, path, os, child_process (spawnSync, execSync), crypto
├── ./obsidian-memory (memory)
├── zod (z)
├── ./agent-pipeline-hooks (_hooks)
├── ../lib/governance (_gov)
├── ./agent-reputation (_reputation)
├── ./episodic-memory (_episodic)
├── ./memory-indexer (_indexer)
├── ./dynamic-agent-selector (_dynSelector)
├── ./execution-verifier (_execVerifier)
├── ./goal-tracker (_goalTracker)
├── ./adaptation-engine (_adaptEngine)
├── ./reflection-engine (_rf)
├── ../lib/models/runtime (runtime)
├── ../lib/memory/gateway (_gateway)
├── ../runtime/task-router (_taskRouter)
└── ../lib/memory/reflexion-tracker (_reflexionTracker)

Lazy:
├── ./firecrawl-bridge (line 269 — research)
├── ./obsidian-client (lines 276, 279 — vault write)
└── ./browser-agent (line 293 — browser)
```

---

## Import Graph: lib/memory/gateway.js Imports

```
gateway.js
├── ./index (mem — all 13 layers)
├── ./access-controller (AccessController)
├── ./sanitizer
├── ./cache
├── ./founder-memory (founderMemory)
├── ../clients (getSupabaseClient)
├── ../logger
└── ../health/monitor (healthMonitor)

Lazy (inside functions):
├── ../intelligence/sie (in _getSIEBriefing)
├── ./working-memory (in lesson-task linkage)
├── ./reflexion-tracker (in reflexion recording)
└── ../consumption-log (in getContext)
```

---

## lib/agent-task-cycle.js Dependencies

**Confirmed exports used in server.js:**
- buildAgentPlan
- runAgentPlanningCycle
- executeApprovedAgentTask
- runDueSchedules

**Imports:** lib/memory/gateway.js (confirmed consumer)

**Internal imports:** UNKNOWN beyond gateway dependency

---

## Thin Shim Chain

```
routes/*.js
    └── require('../lib/app-auth')
            └── require('./middleware').requireAppAccess
                    └── requireAppAccess function (defined inline)
```

All auth in route files flows through this 2-hop shim.

---

## Key Isolation Patterns

| Pattern | Modules | Reason |
|---------|---------|--------|
| Lazy require (circular avoidance) | cog-orchestrator, watchdog, civ-kernel | Prevent startup circular deps |
| Own createClient (isolation) | governance, integrity-crons, outbox-relay | Independent connection lifecycle |
| Factory export (dependency injection) | src/routes/telemetry/index.js | Avoid direct server.js globals |
| Lazy load (memory) | Mastra (+5min), Ruflo (+10min), domain agents | Reduce startup peak RSS |
| setImmediate (async side-effect) | gateway reflexion tracking, RLS enables | Non-blocking startup/request |
