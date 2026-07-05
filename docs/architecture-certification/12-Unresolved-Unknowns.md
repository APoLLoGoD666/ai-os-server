# 12 — Unresolved Unknowns

**Date:** 2026-07-02  
**Mode:** Certification — Preserving all unresolved unknowns from Phases 1, 2.1, and 2.2

---

## Status Key

| Status | Meaning |
|--------|---------|
| RESOLVED | New evidence from Phases 2.2 or 2.3 resolved this unknown |
| UNRESOLVED | No new evidence; unknown remains |
| PARTIALLY RESOLVED | Some aspects resolved; core unknown remains |

---

## Phase 1 Unknowns (Census)

Phase 1 unknowns were not formally numbered. Key structural unknowns from census:

| Item | Status |
|------|--------|
| lib/executive/ceo.js existence | UNRESOLVED — no runtime CEO file confirmed |
| lib/executive/coo.js existence | UNRESOLVED |
| lib/finance/* files | UNRESOLVED — Phase 2.2 confirmed cfo.js delegates to lib/finance/ but content not read |
| Ministry system runtime code | UNRESOLVED — still appears design-only |
| gemini-live.js mount path | UNRESOLVED — excluded from auto-load, no manual mount found (UR03) |
| tts-gemini.js mount path | UNRESOLVED — excluded from auto-load, no manual mount found |

---

## Phase 2.1 Unknowns (U-series)

### RESOLVED by Phase 2.2

| Unknown | Resolution |
|---------|-----------|
| U58 — governance.js export keys | RESOLVED: 40+ domain functions, CERTIFICATION_CONDITIONS, 3 orchestration entry points |
| U62 — cognitive engine names | RESOLVED: All 16 names confirmed |
| U39 — lib/executive/*.js imports | RESOLVED: All 6 files read |
| U41 — agent-task-cycle.js imports | RESOLVED: Complete dependency map |
| U59 — strategic-planning-engine.js | RESOLVED: pure in-memory, no DB |
| U60 — executive-arbitration-engine.js | RESOLVED: cognitive thread management |
| U61 — civilization-runtime.js full export | RESOLVED: isRunning, getCycleCount, runOnce |
| U46 — memory-governor.js behavior | RESOLVED: zero quota enforcement |

### UNRESOLVED from Phase 2.1

**U35 — CEO Implementation**

Does `lib/executive/ceo.js` exist? Phase 2.2 confirmed executive-council.js calls CEO synthesis (Step 9) but found no CEO implementation file. CEO entity not in registry ENTITIES as a votable entity. Status: **UNRESOLVED** — CEO synthesis model and implementation remain unknown (see also UR01).

**U36 — COO Implementation**

Does `lib/executive/coo.js` exist? COO is in ENTITIES (coo) and VOTING_ENTITIES. entity.js provides the base decide() mechanism. Whether a specialized COO override exists: **UNRESOLVED**.

**U37 — CSO, CGO, CRO, CLO, CHO Implementation**

5 executive roles with vault specs. All are in ENTITIES registry. CHO, CLO, CRO are NOT in VOTING_ENTITIES (confirmed by Phase 2.2). Whether any have specialized implementation files beyond entity.js: **UNRESOLVED**.

**U38 — Ministry System Runtime**

No runtime code found. **UNRESOLVED** — ministry system appears design-only.

**U40 — Mastra Production Status**

getMastraStatus() confirmed in /health response. Whether Mastra successfully initializes under 220MB heap constraint: **UNRESOLVED** (see also UR02).

**U42 — lib/write-with-outbox.js Production Consumers**

0 confirmed consumers. Phase 2.3 confirms this as a contradiction (C11). The question of WHY it has no consumers: **UNRESOLVED** — dead code, dynamic require, or test-only.

**U43 — lib/consolidation-engine.js vs lib/memory/consolidation-engine.js**

Both files confirmed to exist. Relationship (same or different): **UNRESOLVED** (see also Memory Certification doc).

**U44 — agent-system/reflexion-tracker.js**

Whether a separate agent-system version exists alongside lib/memory/reflexion-tracker.js: **UNRESOLVED**.

**U45 — episodic-memory-pg.js vs agent-system/episodic-memory.js division**

Phase 2.2 confirmed both files exist and orchestrator imports agent-system version. Division of responsibility: **PARTIALLY RESOLVED** — episodic-memory-pg.js is the Postgres layer; agent-system/episodic-memory.js is the agent-specific episodic store. Whether they write to the same table: **UNRESOLVED**.

**U47 — Clause 3 Domain Seeding Table**

Source table for `minDomainsSeeded >= 6` check in scripts/certify.js: **UNRESOLVED**.

**U48 — Clause 4 Trait Promotion Table**

Source table for `minPromotedTraits >= 1` check: **UNRESOLVED**.

**U49 — civilization_health_snapshots Full Schema**

`score, classification, dimensions` confirmed. Full schema: **PARTIALLY RESOLVED** — `dimensions` column exists (queried by chat-context.js) but its structure is unknown.

**U50 — Outbox Table Schema**

Schema of `outbox` table processed by lib/outbox-relay.js: **UNRESOLVED**.

**U51 — Python Sidecar Production Status**

RAG_SIDECAR_URL env var presence not confirmed. Sidecar status: **UNRESOLVED**.

**U52 — Sentry Integration**

Confirmed as unresolved in Phase 2.2 (UR08): DSN presence check only, SDK initialization not confirmed. **UNRESOLVED**.

**U53 — Ruflo Production Status**

Ruflo daemon spawned +10min. Startup success not confirmed. Memory footprint unknown. **UNRESOLVED**.

**U54 — routes/gemini-live.js Endpoints**

Excluded from auto-load. No manual mount found. Events reference gemini-live.js as emitter. **UNRESOLVED** (UR03).

**U55 — routes/intelligence-memory.js Endpoints**

File confirmed to exist. Internal endpoints not read. **UNRESOLVED**.

**U56 — routes/observatory.js Endpoints**

File confirmed to exist. Uses pg Pool. Exact endpoints not read. **UNRESOLVED**.

**U57 — routes/pwa.js Endpoints**

File confirmed to exist. PWA-specific endpoints not read. **UNRESOLVED**.

**U63 — apex-audit.html Purpose and Mounting**

File exists at repo root and in public/. No confirmed serving route. **UNRESOLVED**.

**U64 — Which Phase Scripts Have Been Run**

38 phase validation scripts (phases 10–41). Execution history not in repository. **UNRESOLVED**.

**U86 — agent-pipeline-hooks.js Duplicate**

Both `agent-system/agent-pipeline-hooks.js` and `services/pipelines/agent-pipeline-hooks.js` confirmed to exist. Relationship: **UNRESOLVED**.

---

## Phase 2.2 Unknowns (UR-series)

All 20 UR unknowns from `docs/runtime/13-Unknown-Runtime.md`:

| ID | Unknown | Status |
|----|---------|--------|
| UR01 | CEO synthesis model | UNRESOLVED |
| UR02 | Mastra production initialization | UNRESOLVED |
| UR03 | gemini-live.js mount path | UNRESOLVED |
| UR04 | Semantic memory validation trigger | UNRESOLVED |
| UR05 | Who writes to civilization_health_snapshots | UNRESOLVED |
| UR06 | consolidation-engine.js duplicate relationship | UNRESOLVED |
| UR07 | agent-system/reflexion-tracker.js existence | UNRESOLVED |
| UR08 | Sentry SDK initialization | UNRESOLVED |
| UR09 | slack-client.js internal error handling | UNRESOLVED |
| UR10 | Render traffic timing after listen | UNRESOLVED |
| UR11 | /operations/migrations/run _auth level | UNRESOLVED |
| UR12 | civilization_health_snapshots full schema | PARTIALLY RESOLVED — dimensions column confirmed |
| UR13 | crisis-manager.js Slack alerting at EMERGENCY | UNRESOLVED |
| UR14 | adaptation_refresh cron implementation | UNRESOLVED |
| UR15 | weekly_review cron implementation | UNRESOLVED |
| UR16 | lib/finance/* sub-modules | UNRESOLVED |
| UR17 | privacy-guard.abstractForExternalPrompt output | UNRESOLVED |
| UR18 | adaptation-cycle.js weekly trigger | PARTIALLY RESOLVED — likely via adaptation_refresh cron (UR14) |
| UR19 | Outbox table schema | UNRESOLVED |
| UR20 | Entity trigger context source | UNRESOLVED |

---

## Phase 2.3 New Unknowns

**UN01 — RLS Policy Status on Memory Tables**

Whether Row Level Security is enforced on Supabase memory tables (`semantic_memory`, `episodic_memory`, `decision_memory`, etc.). If RLS is disabled and service role key is used, all access-controller enforcement is bypassable at the DB layer.

**Evidence available:** `lib/pg_database.js` appears to call `SET LOCAL ROLE` — but whether this is applied to all connections and tables: UNRESOLVED.

**UN02 — Executive Deliberation Write Pattern**

Whether `executive_deliberations` and `executive_votes` inserts in `executive-council.js deliberate()` Step 10 are awaited or fire-and-forget. If fire-and-forget: deliberation records can be lost silently. If awaited: failures throw to caller.

**UN03 — Crisis Manager Event Emission**

Whether `lib/constitution/crisis-manager.js` emits Slack alerts, event bus events, or logs on EMERGENCY state transition. The `_activateSafeDefaults()` function was confirmed but its complete implementation was not read.

**UN04 — checkAuthority Blocking Behavior**

Phase 2.2 noted checkAuthority is "FAIL-OPEN on error." Whether checkAuthority also fails open on explicit authority mismatch (not just on error) — i.e., whether it actually blocks any request under any condition — was not confirmed. The fail-open was confirmed for the error case; the non-error authority failure case is UNKNOWN.

**UN05 — event-consumer.js Slack Error Swallow**

Whether the Slack notification failure in `_handle()` is completely silent (no log) or whether it logs the error before continuing. Phase 2.2 described it as "silently swallowed" but did not confirm the exact catch block content.

---

## Unknown Count Summary

| Phase | Total Unknowns | Resolved | Unresolved |
|-------|---------------|---------|-----------|
| Phase 1 (Census) | ~6 structural | 0 | 6 |
| Phase 2.1 (U-series) | 31 (U35–U64, U86) | 8 | 23 |
| Phase 2.2 (UR-series) | 20 | 0 (2 partial) | 18 + 2 partial |
| Phase 2.3 (UN-series) | 5 new | 0 | 5 |
| **Total** | **~62** | **8** | **~54** |
