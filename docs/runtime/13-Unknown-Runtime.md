# 13 — Unknown Runtime Behaviors

**Date:** 2026-07-02  
**Evidence Source:** All Phase 2.2 investigation agents

---

## How to Read This Document

Each unknown has:
- **ID:** UR prefix (Runtime Unknown), distinct from Phase 2.1 U-prefix unknowns
- **What is unknown:** The specific gap
- **Evidence gathered:** What was read and what it showed
- **Why it matters:** Impact on runtime understanding

Phase 2.1 unknowns (U35–U64, U86) remain in `14-Unknown-Relationships.md`. This document covers unknowns that are **runtime-specific** — behaviors that could not be determined from file reads.

---

## LLM Execution Unknowns

### UR01 — CEO Synthesis Model

**Unknown:** Which model is used for CEO synthesis (step 9 of executive-council.js deliberate())?

**Evidence:** executive-council.js confirms CEO synthesizes votes via an LLM call. CEO has no confirmed implementation file (`lib/executive/ceo.js` not found in Phase 2.1). CEO entity not in VOTING_ENTITIES in registry.js.

**Why it matters:** CEO synthesis is on the critical path of every executive deliberation. Unknown if it uses Haiku, Sonnet, or Opus.

---

### UR02 — Mastra Production Status

**Unknown:** Does Mastra successfully initialize in production? What does `getMastraStatus()` return in /health?

**Evidence:** Deferred 5 minutes after listen. Memory constraint of 220MB heap may block `@mastra/core` + `@mastra/memory` from loading.

**Why it matters:** `/health` reports Mastra status. If initialization fails silently, health appears degraded but system continues.

---

### UR03 — Voice Execution Path (gemini-live.js)

**Unknown:** How does `routes/gemini-live.js` actually execute? It is excluded from auto-load and no manual mount was found.

**Evidence:** Event bus has `VOICE_STARTED`, `AUDIO_RECEIVED`, `REFLEX_RESPONSE_SENT`, `USER_INTERRUPTED`, `SESSION_COMPLETED` all sourced from gemini-live.js. These events exist and are wired in services/init.js. Yet the route file has no confirmed mount.

**Why it matters:** Voice is confirmed to be a real feature (voiceState in routes/intelligence.js, voiceLimiter on /api/voice-chat). The execution path is unresolved.

---

## Memory Unknowns

### UR04 — Semantic Memory Validation Trigger

**Unknown:** What transitions `semantic_memory` rows from `candidate` to `validated` status?

**Evidence:** `storeFact()` inserts as `candidate`. No confirmed code path found that updates status to `validated`. The status column exists and the lifecycle is documented in the file, but the trigger for validation is unknown.

**Why it matters:** If no code runs the validation step, all semantic memories stay as `candidate` indefinitely. Some queries may filter to `validated` only.

---

### UR05 — Who Writes to civilization_health_snapshots

**Unknown:** Which code path writes to the `civilization_health_snapshots` table?

**Evidence:** `server.js /health` reads from this table. `lib/telemetry/aggregator.js computeCivilizationHealth()` has snapshot write **intentionally disabled** (DATA-5 comment). No other confirmed writer found.

**Why it matters:** If nothing writes to this table, /health always returns stale or null civilization data.

---

### UR06 — consolidation-engine.js Duplicate

**Unknown:** Are `lib/consolidation-engine.js` and `lib/memory/consolidation-engine.js` the same file or distinct?

**Evidence:** `lib/memory/consolidation-engine.js` is in the memory barrel export. `lib/consolidation-engine.js` is imported by `lib/integrity-crons.js`. Two distinct paths exist.

**Why it matters:** If they're different files, integrity-crons.js uses a different consolidation logic than the memory system.

---

### UR07 — agent-system/reflexion-tracker.js

**Unknown:** Does `agent-system/reflexion-tracker.js` exist separately from `lib/memory/reflexion-tracker.js`?

**Evidence:** Some grep results suggested an agent-system version. `agent-system/orchestrator.js` imports from `../lib/memory/reflexion-tracker` (confirmed). An agent-system version is unconfirmed.

---

## Infrastructure Unknowns

### UR08 — Sentry Initialization

**Unknown:** Is Sentry SDK actually initialized in server.js?

**Evidence:** `/health` returns `sentry: !!process.env.SENTRY_DSN`. This is a DSN presence check only. No `Sentry.init()` call confirmed in files read.

**Why it matters:** Error monitoring may not be active even if SENTRY_DSN is set.

---

### UR09 — Slack Client Internal Error Handling

**Unknown:** Does `services/slack/slack-client.js` catch errors internally?

**Evidence:** All slack-alerts.js functions call `postToChannel` or `postDeduped`. These are module-level calls with no wrapping try/catch in slack-alerts.js itself.

**Why it matters:** If slack-client throws, the alertCritical call in /health (called when DB is down) will throw, potentially causing the /health handler to fail.

---

### UR10 — Render Traffic Timing After Listen

**Unknown:** How long after `server.listen()` does Render begin routing traffic to the new instance?

**Evidence:** render.yaml specifies `healthCheckPath: /health`. Render sends health check requests until 200, then routes traffic. But no timing data on health check frequency.

**Why it matters:** civilization-runtime.js first tick runs immediately at listen. If Render routes traffic before the first tick completes (first tick includes LLM calls), the system is operational but civilization state is not yet initialized.

---

## Route Unknowns

### UR11 — /operations/migrations/run Auth Level

**Unknown:** What exactly does `_auth` check in routes/operations.js?

**Evidence:** `POST /api/operations/migrations/run` is protected by `_auth` only (not `requireAppAccess`). The `_auth` function definition was not read.

**Why it matters:** This endpoint executes raw SQL. If `_auth` is weaker than `requireAppAccess`, this is a high-risk endpoint with insufficient protection.

---

### UR12 — civilization_health_snapshots Full Schema

**Unknown:** Full schema of `civilization_health_snapshots` table.

**Evidence:** `/health` queries `score, classification`. `chat-context.fetchSelfContext()` queries `score, classification, dimensions`. The `dimensions` column is queried but its structure is unknown.

---

### UR13 — crisis-manager.js Slack Alerting

**Unknown:** Does `lib/constitution/crisis-manager.js` call `alertCritical` on EMERGENCY state?

**Evidence:** crisis-manager.js was read and `_activateSafeDefaults()` was confirmed. No Slack alert call confirmed in the file read.

**Why it matters:** EMERGENCY state is the most severe constitutional crisis. If no alert fires, the operator may not know.

---

## Cron / Schedule Unknowns

### UR14 — adaptation_refresh Cron Implementation

**Unknown:** What exactly does the `adaptation_refresh` weekly cron do?

**Evidence:** `lib/cron-scheduler.js` schedules `adaptation_refresh` weekly. The handler function implementation was not read.

---

### UR15 — weekly_review Cron Implementation

**Unknown:** What does the `weekly_review` cron do?

**Evidence:** `lib/cron-scheduler.js` registers it. Handler not read.

---

### UR16 — lib/finance/* Sub-modules

**Unknown:** What files exist in lib/finance/ and what do they implement?

**Evidence:** `lib/executive/cfo.js` delegates heavy financial analysis to `lib/finance/*`. No direct reads of lib/finance/ files were performed.

---

## Behavioral Unknowns

### UR17 — chat-context.js Privacy Guard Output

**Unknown:** What does `privacy-guard.abstractForExternalPrompt()` return?

**Evidence:** `buildPrompt()` includes a `FOUNDER ALIGNMENT` block sourced from `privacy-guard.abstractForExternalPrompt()`. This function was not read.

**Why it matters:** The founder alignment block is included in every chat prompt — it shapes how Claude responds.

---

### UR18 — Adaptation Cycle Weekly Trigger

**Unknown:** What triggers `lib/memory/adaptation-cycle.js runWeeklyCycle()`?

**Evidence:** The function is confirmed to exist and its implementation was read. But the scheduler that calls it was not confirmed. Likely via `adaptation_refresh` cron (UR14).

---

### UR19 — Outbox Table Schema

**Unknown:** Full schema of the `outbox` table processed by `lib/outbox-relay.js`.

**Evidence:** `outbox-relay.start()` confirmed called at services/init.js. The relay processes events from an outbox table. Table schema not read.

---

### UR20 — Entity Trigger Context Source

**Unknown:** Where does the `ctx` object in `trigger-evaluator.getTriggeredRoles(ctx)` come from at runtime?

**Evidence:** trigger-evaluator.js confirmed — reads `ctx.deploymentPolicy`, `ctx.complexity`, `ctx.costUsd`, `ctx.hasStrategicImpact`, etc. But the code that constructs this ctx object before calling getTriggeredRoles was not traced.

---

## Summary Count

| Category | Count |
|----------|-------|
| LLM execution unknowns | UR01–UR03 (3) |
| Memory unknowns | UR04–UR07 (4) |
| Infrastructure unknowns | UR08–UR10 (3) |
| Route unknowns | UR11–UR12 (2) |
| Constitutional unknowns | UR13 (1) |
| Cron/schedule unknowns | UR14–UR16 (3) |
| Behavioral unknowns | UR17–UR20 (4) |
| **Total Phase 2.2 unknowns** | **20** |

---

## Resolved Phase 2.1 Unknowns

The following Phase 2.1 unknowns (U-series) were **resolved** by Phase 2.2 investigation:

| Phase 2.1 Unknown | Resolution |
|-------------------|-----------|
| U58 — lib/governance.js export keys | Resolved: 40+ domain functions, CERTIFICATION_CONDITIONS, 3 orchestration entry points |
| U62 — lib/cognitive/index.js engine names | Resolved: All 16 names confirmed (see 03-Cognitive-Runtime.md) |
| U39 — lib/executive/*.js internal imports | Partially resolved: all 6 files read, imports confirmed |
| U41 — lib/agent-task-cycle.js imports | Fully resolved: complete dependency map documented |
| U59 — lib/strategic-planning-engine.js | Resolved: pure in-memory, no DB, 2h TTL objectives |
| U60 — lib/executive-arbitration-engine.js | Resolved: cognitive thread management, 10min eviction |
| U61 — lib/intelligence/civilization-runtime.js full export | Resolved: isRunning, getCycleCount, runOnce + implementation |
| U46 — memory-governor.js behavior | Resolved: zero quota enforcement, utility functions only |
