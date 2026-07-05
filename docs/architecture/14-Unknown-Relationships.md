# 14 — Unknown Relationships

**Date:** 2026-07-02  
**Evidence Source:** All Phase 2.1 investigation. Items marked UNKNOWN were not resolvable from grep scans and direct file reads.

---

## How to Read This Document

Each unknown has an ID (U prefix), a description of what is unknown, the evidence gathered so far, and the question that remains unanswered.

---

## Executive System Unknowns

### U35 — CEO Implementation

**Unknown:** Is there a `lib/executive/ceo.js` file?

**Evidence:** grep for any CEO implementation file found nothing. Vault spec exists at `APEX AI OS/11 Agents/`.

**Question:** Does a runtime CEO agent exist, or is CEO role handled by executive-council.js?

---

### U36 — COO Implementation

**Unknown:** `lib/executive/coo.js` — exists or not?

**Evidence:** Same as U35 — vault spec only.

**Question:** COO role may be bundled in executive-council.js or is spec-only.

---

### U37 — CSO, CGO, CRO, CLO, CHO Implementation

**Unknown:** 5 executive roles with vault specs and no implementation files found.

**Evidence:** grep for these exact role names found no lib/executive/*.js files matching.

**Question:** Are these roles modeled as sub-functions of executive-council.js, or are they genuinely unimplemented?

---

### U38 — Ministry System

**Unknown:** Does the ministry system have any runtime code?

**Evidence:** Vault spec at `APEX AI OS/00 Foundation/ministry-system-spec.md`. No runtime files found matching "ministry" in any grep.

**Question:** Ministry system appears to be design-only. No routes, no lib files, no agent files.

---

### U39 — lib/executive/*.js Internal Imports

**Unknown:** What do these 7 files import and export internally?

**Files:**
- lib/executive/entity.js
- lib/executive/financial-attention-scorer.js
- lib/executive/registry.js
- lib/executive/trigger-evaluator.js
- lib/executive/domain-memory.js
- lib/executive/cfo.js

**Evidence read:** Only consume patterns (what requires these files). File contents not read.

---

## Agent System Unknowns

### U40 — Mastra Production Status

**Unknown:** Does Mastra successfully initialize in production?

**Evidence:** Deferred 5 minutes after server listen. getMastraStatus() is passed to telemetry route. Memory constraint of 220MB may block @mastra/core + @mastra/memory from loading.

**Question:** /health response includes `mastra: getMastraStatus()` — what does this currently return in production?

---

### U41 — lib/agent-task-cycle.js Internal Imports

**Unknown:** Complete dependency map for lib/agent-task-cycle.js.

**Evidence:** Confirmed exports (buildAgentPlan, runAgentPlanningCycle, executeApprovedAgentTask, runDueSchedules) and confirmed consumer of lib/memory/gateway.js. Beyond that, unknown.

---

### U86 — Agent Pipeline Hooks Duplicate

**Unknown:** Relationship between `agent-system/agent-pipeline-hooks.js` and `services/pipelines/agent-pipeline-hooks.js`

**Evidence:** Both files confirmed to exist. Orchestrator imports agent-system version. services/pipelines version has no confirmed consumers in grep.

**Question:** Is services/pipelines version: (a) a stale copy, (b) a diverged fork for different contexts, (c) dead code?

---

## Memory System Unknowns

### U42 — lib/write-with-outbox.js Production Consumers

**Unknown:** What calls writeWithOutbox() in production?

**Evidence:** grep across all .js files found 0 consumers of lib/write-with-outbox.js. Module exists, exports `{ writeWithOutbox }`, uses createClient directly.

**Question:** Is this: (a) called via dynamic require(), (b) used only in tests, (c) superseded by direct Supabase writes, (d) dead code?

---

### U43 — lib/consolidation-engine.js vs lib/memory/consolidation-engine.js

**Unknown:** Are these the same file at two paths, or two distinct files?

**Evidence:**
- `lib/memory/consolidation-engine.js` — in lib/memory/index.js barrel export
- `lib/consolidation-engine.js` — imported by lib/integrity-crons.js as `./consolidation-engine`

**Question:** If they are different files, what is the difference in purpose? If the same (symlink or copy), why two locations?

---

### U44 — agent-system/reflexion-tracker.js vs lib/memory/reflexion-tracker.js

**Unknown:** Do both files exist independently?

**Evidence:** orchestrator.js imports `../lib/memory/reflexion-tracker`. Some references in agent-system/ suggest a possible agent-system version.

**Question:** Is there an `agent-system/reflexion-tracker.js`? If so, what is it?

---

### U45 — lib/memory/episodic-memory-pg.js vs agent-system/episodic-memory.js

**Unknown:** These are two different episodic write paths. What is the division of responsibility?

**Evidence:**
- `lib/memory/episodic-memory-pg.js` — exported as `episodicMemory` in lib/memory/index.js
- `agent-system/episodic-memory.js` — imported by orchestrator as `_episodic`

**Question:** Which path is canonical for writing? Do they write to the same table (`episodic_memory`)?

---

### U46 — Memory Governor (lib/memory/memory-governor.js)

**Unknown:** What does memory-governor enforce?

**Evidence:** Exported as `governor` in lib/memory/index.js. Name implies quota/governance. No consumer confirmed beyond barrel export.

**Question:** Does memory-governor.js enforce write quotas, rate limits, or access policy? Who calls it in the write path?

---

## Database Unknowns

### U47 — Clause 3 Domain Seeding Table

**Unknown:** What table does `minDomainsSeeded ≥ 6` check in lib/certification/checker.js?

**Evidence:** Clause 3 checks "domain seeding" but the source table was not read beyond the threshold constant.

---

### U48 — Clause 4 Trait Promotion Table

**Unknown:** What table does trait promotion check against?

**Evidence:** `minPromotedTraits ≥ 1` + `requiresInjection: true` in THRESHOLDS. Source table unknown.

---

### U49 — civilization_health_snapshots Table Schema

**Unknown:** Full schema of this table.

**Evidence:** SELECT `score, classification` confirmed in server.js query. Additional columns unknown.

---

### U50 — Outbox Table Schema

**Unknown:** Schema of the `outbox` table processed by lib/outbox-relay.js.

**Evidence:** Module exists and processes events, but table schema not read.

---

## Infrastructure Unknowns

### U51 — Python Sidecar Production Status

**Unknown:** Is `apex-ai-sidecar` deployed and receiving traffic?

**Evidence:** render.yaml defines it. RAG_SIDECAR_URL must be set on ai-os-server. No confirmation of this env var being set.

---

### U52 — Sentry Integration

**Unknown:** Is Sentry actually initialized in server.js?

**Evidence:** `/health` response includes `sentry: !!process.env.SENTRY_DSN` — DSN check only. Sentry SDK import not confirmed in files read.

---

### U53 — Ruflo Production Status

**Unknown:** Does the Ruflo daemon successfully start on Render?

**Evidence:** server.js spawns Ruflo 10 minutes after listen. Render allows child processes. But Ruflo's memory footprint at startup is unknown — could exceed remaining heap.

---

## API / Route Unknowns

### U54 — routes/gemini-live.js Endpoints

**Unknown:** What endpoints does gemini-live.js define, and why is it excluded from auto-load?

**Evidence:** Excluded from `_loadAgentRoutes()` alongside tts-gemini.js. No separate manual mount found for gemini-live.js.

**Question:** Is gemini-live.js mounted elsewhere, or is it completely disabled?

---

### U55 — routes/intelligence-memory.js Endpoints

**Unknown:** What endpoints does intelligence-memory.js expose?

**Evidence:** File exists, auto-loaded. No internal read performed.

---

### U56 — routes/observatory.js Endpoints

**Unknown:** What specific endpoints does observatory expose?

**Evidence:** File exists, auto-loaded. Confirmed uses lib/pg_database.js (raw Pool). Exact endpoints unknown.

---

### U57 — routes/pwa.js Endpoints

**Unknown:** What PWA-specific API endpoints does this expose?

**Evidence:** File auto-loaded. Name implies push notifications or PWA state management.

---

## Module Content Unknowns

### U58 — lib/governance.js Export Keys

**Unknown:** What are the exported keys from lib/governance.js `module.exports` at line 974?

**Evidence:** File is 974+ lines. `module.exports = { ... }` at line 974. Exact key list not read. Consumers: orchestrator (_gov) and routes/governance.js (lazy).

---

### U59 — lib/strategic-planning-engine.js

**Unknown:** Internal imports and API surface.

**Evidence:** Consumed by server.js (_spe) and lib/cognitive-orchestrator.js (lazy _speRef). File contents not read.

---

### U60 — lib/executive-arbitration-engine.js

**Unknown:** Internal imports and API surface.

**Evidence:** Consumed by server.js (_eae) and lib/cognitive-orchestrator.js (lazy _eaeRef). File contents not read.

---

### U61 — lib/intelligence/civilization-runtime.js Full Export

**Unknown:** Complete export list beyond isRunning() and getCycleCount() and runOnce().

**Evidence:** These three confirmed from server.js usage. Other exports unknown.

---

### U62 — lib/cognitive/index.js — 16 Engine Names

**Unknown:** Exact names of all 16 cognitive engines in the barrel export.

**Evidence:** File read confirmed it is a barrel exporting 16 engines. Names not captured.

---

### U63 — apex-audit.html Purpose and Mounting

**Unknown:** What is apex-audit.html for, and is it served by any route?

**Evidence:** File exists at repo root and in public/. No server.js route found serving it specifically.

---

## Historical Phase Script Status

### U64 — Which Phase Scripts Have Been Run

**Unknown:** Which of the 38 phase validation scripts (phases 10–41) have been executed, and what were their outcomes?

**Evidence:** Files exist. No run log found in repository.

---

## Summary Count

| Category | Count |
|----------|-------|
| Executive system unknowns | U35–U39 (5) |
| Agent system unknowns | U40–U41, U86 (3) |
| Memory system unknowns | U42–U46 (5) |
| Database unknowns | U47–U50 (4) |
| Infrastructure unknowns | U51–U53 (3) |
| API/Route unknowns | U54–U57 (4) |
| Module content unknowns | U58–U63 (6) |
| Historical unknowns | U64 (1) |
| **Total Phase 2.1 unknowns** | **31** |

Note: U-numbers U35–U38 were carried from Phase 1 census. U39–U64 and U86 are new from Phase 2.1 investigation.
