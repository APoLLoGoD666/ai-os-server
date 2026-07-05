# 04 — Agent Relationships

**Date:** 2026-07-02  
**Evidence Source:** agent-system/orchestrator.js, server.js, services/init.js, routes/agents.js

---

## Agent Execution Architecture

```
server.js (chat endpoint / task dispatch)
  │
  ├── agent-system/prompt-expander.js (expandPrompt)
  │       └── Expands user request before orchestration
  │
  └── agent-system/orchestrator.js (runAgentTeam)
          │
          ├── runtime/task-router.js (_taskRouter)
          │       └── Routes: research | execution | persona | constitutional
          │
          ├── agent-system/dynamic-agent-selector.js (_dynSelector)
          │       └── Selects appropriate agent for task
          │
          ├── lib/memory/gateway.js (_gateway)
          │       └── Memory context for agent execution
          │
          ├── lib/governance.js (_gov)
          │       └── Governance gate before execution
          │
          ├── agent-system/agent-pipeline-hooks.js (_hooks)
          │       └── Pre/post execution hooks
          │
          ├── agent-system/episodic-memory.js (_episodic)
          │       └── Episode recording
          │
          ├── agent-system/memory-indexer.js (_indexer)
          │       └── Indexes output into memory
          │
          ├── agent-system/execution-verifier.js (_execVerifier)
          │       └── Verifies execution correctness
          │
          ├── agent-system/goal-tracker.js (_goalTracker)
          │       └── Tracks goal progress
          │
          ├── agent-system/adaptation-engine.js (_adaptEngine)
          │       └── Post-execution adaptation
          │
          ├── agent-system/reflection-engine.js (_rf)
          │       └── Reflection generation
          │
          ├── agent-system/agent-reputation.js (_reputation)
          │       └── Agent reputation tracking
          │
          ├── lib/models/runtime (runtime)
          │       └── Model selection
          │
          ├── lib/memory/reflexion-tracker.js (_reflexionTracker)
          │       └── Reflexion cycle tracking
          │
          └── [Domain-specific lazy loads]
                  ├── agent-system/firecrawl-bridge [lazy: research tasks]
                  ├── agent-system/obsidian-client [lazy: vault tasks]
                  └── agent-system/browser-agent [lazy: browser tasks]
```

---

## agent-system/orchestrator.js

**Location:** `agent-system/orchestrator.js` (1,976 lines)

**Entry Point:** `runAgentTeam(spec)` — default export

**Additional Export:** `getOrchestratorStatus`

**Static imports:**
- `fs`, `path`, `os`, `child_process` (spawnSync, execSync), `crypto` (randomUUID)
- `./obsidian-memory` (memory)
- `zod` (z)
- `./agent-pipeline-hooks` (_hooks)
- `../lib/governance` (_gov)
- `./agent-reputation` (_reputation)
- `./episodic-memory` (_episodic)
- `./memory-indexer` (_indexer)
- `./dynamic-agent-selector` (_dynSelector)
- `./execution-verifier` (_execVerifier)
- `./goal-tracker` (_goalTracker)
- `./adaptation-engine` (_adaptEngine)
- `./reflection-engine` (_rf)
- `../lib/models/runtime` (runtime)
- `../lib/memory/gateway` (_gateway)
- `../runtime/task-router` (_taskRouter)
- `../lib/memory/reflexion-tracker` (_reflexionTracker)

**Lazy imports:**
- `./firecrawl-bridge` (line 269 — research tasks)
- `./obsidian-client` (lines 276, 279 — vault write tasks)
- `./browser-agent` (line 293 — browser tasks)
- Additional internal lazy requires (lines confirmed from grep)

**Consumed by:** server.js (runAgentTeam = require('./agent-system/orchestrator'))

---

## Domain Agents

### agent-system/domain-agents.js

**Exports:** `{ DOMAIN_AGENTS }` — object mapping domain names to agent handler functions

**Consumed by:**
- server.js ({ DOMAIN_AGENTS: _DOMAIN_AGENTS })
- routes/agents.js (_domain() lazy factory)
- routes/voice-chat.js (DOMAIN_AGENTS)

### Named Domain Agents (files)

| File | Consumed by | Notes |
|------|------------|-------|
| `agent-system/email_agent.js` | server.js (initEmailAgent at listen) | Exports: checkEmails, sendEmailReply, initEmailAgent |
| `agent-system/finance_agent.js` | server.js (categoriseTransaction etc.) | Exports: categoriseTransaction, checkBudgetAlerts, parseCsvTransactions, FINANCE_CATEGORIES |
| `agent-system/routine_agent.js` | server.js (initRoutineAgent at listen) | Exports: initRoutineAgent |
| `agent-system/reflection_agent.js` | server.js (runReflectionCheck every 30 min) | Exports: runReflectionCheck |
| `agent-system/cloud_autopilot.js` | server.js (previewCloudAutopilot, applyLatestCloudProposal) | Cloud autopilot |
| `agent-system/browser-agent.js` | agent-system/orchestrator.js [lazy] | Playwright-powered |

---

## Agent Lifecycle

### Registration

**Routes:** routes/agents.js

**Imports:**
- `express`
- `@supabase/supabase-js` (createClient direct)
- `lib/app-auth`
- `lib/agent-library` [lazy factory: _lib()]
- `lib/domain-agents` [lazy factory: _domain()]

**Provides:** Agent CRUD, agent run dispatch, agent status endpoints

### Task Pipeline

1. **Plan** — lib/agent-task-cycle.js (buildAgentPlan, runAgentPlanningCycle)
2. **Approve** — lib/agent-task-cycle.js (executeApprovedAgentTask)
3. **Execute** — agent-system/orchestrator.js (runAgentTeam)
4. **Verify** — agent-system/execution-verifier.js
5. **Reflect** — agent-system/reflection-engine.js
6. **Index** — agent-system/memory-indexer.js
7. **Adapt** — agent-system/adaptation-engine.js

### Task Storage

All task state persists to Supabase via lib/pg_helpers.js:
- pgCreateAgentTask, pgUpdateAgentTask, pgGetAgentTask
- pgGetRecentAgentTasks, pgGetLatestWaitingAgentTask

### Schedule Execution

**Trigger sources:**
1. Render Cron (primary) — HTTP call to cron endpoint
2. In-process setInterval every 5 min (server.js:4692) — fallback
3. Manual: `runDueSchedules()` from lib/agent-task-cycle.js

---

## Claude Code Agents (.claude/agents/)

**Count:** 80+ agent definition files

**Format:** Markdown files — spec/instruction files for Claude Code agent modes

**Consumed by:** Claude Code CLI (not by server.js runtime)

**Relationship to runtime:** Separate system — Claude Code operates locally, server.js runs on Render. No import relationship.

---

## Mastra Agents

**Module:** agent-system/mastra_agents.js  
**Framework:** `@mastra/core` + `@mastra/memory`

**Loading pattern:** Lazy — deferred 5 minutes after server listen to avoid startup OOM.

**Server.js code:**
```javascript
let initMastra = () => null;  // stub until loaded
// 5 min after listen: _loadMastra() replaces initMastra with real module
mastraAgents = initMastra(handleCommand);
```

**Status:** UNKNOWN — whether Mastra successfully initializes in production (memory constraint of 220 MB may block)

---

## LangChain RAG Agent

**Module:** agent-system/langchain-rag.js

**Consumed by:**
- routes/intelligence.js (retrieveContext, rag lazy)

**Framework:** `@langchain/anthropic`, `@langchain/core`, `@langchain/community`, `langchain`

---

## Reflection System

**Trigger:** server.js `setInterval(runReflectionCheck, 30 * 60 * 1000)` — every 30 minutes

**Chain:**
- agent-system/reflection_agent.js (runReflectionCheck)
  - agent-system/reflection-engine.js (internal)
  - agent-system/self-evaluator.js (implied)

**Storage:** pgCreateAgentReflection, pgGetApprovedReflections (lib/pg_helpers.js)

---

## Agent Memory Access

**Primary:** All agents use lib/memory/gateway.js  
**Secondary:** agent-system/episodic-memory.js (direct episodic writes)  
**Tertiary:** agent-system/obsidian-memory.js (vault memory)

---

## Autonomy Levels

**Source:** `AUTONOMY_LEVEL` environment variable (currently = 3)

**Read by:**
- server.js (getAutonomyLevel(), snapshot in AUTONOMY_LEVEL)
- lib/agent-step-utils.js (getAutonomyLevelMessage)
- lib/cognitive/runtime/autonomy-runtime-controller.js

**Effect on agent behaviour:**
- Level 1: All actions require approval
- Level 2: Safe read-only actions auto-run
- Level 3: Safe write actions auto-run (lib/agent-step-utils.js: isSafeLevel3WriteAction)

---

## Agent Pipeline Hooks

**File:** agent-system/agent-pipeline-hooks.js (also duplicate at services/pipelines/agent-pipeline-hooks.js)

**Consumed by:** agent-system/orchestrator.js (_hooks)

**Relationship between copies:** UNKNOWN — see U86 in Unknowns Register

---

## Agent Queue

**Module:** lib/agent-queue.js

**Consumed by:**
- server.js (_agentQueue)
- routes/intelligence.js (agentQueue, lazy)
- src/routes/telemetry/index.js [lazy]

**Purpose:** Queue management for agent task dispatching

**Status:** Exports a `.status()` method confirmed (telemetry route calls it)
