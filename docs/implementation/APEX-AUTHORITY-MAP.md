# APEX-AUTHORITY-MAP.md
# APEX One Platform — Authority Map

**Phase:** Phase 0 Authority Audit (Re-run)
**Date:** 2026-08-19
**Previous audit:** 2026-08-04
**Authority:** APEX-CONSTITUTION-v1.0; repository reality
**Method:** Direct file reads, import tracing, git status inspection

---

## CRITICAL FINDING — GIT STATE

**The last git commit is 2026-07-11.** All Wave 3 constitutional files (rt12-bootstrap.js, rt13-bootstrap.js, deliberation-registry.js, constitutional-store.js, and migrations 080–082) are UNTRACKED in git (status `??`). They exist in the local working tree but have NEVER been committed or deployed to Render. The production server on Render.com is running the 2026-07-11 codebase — Wave 3 constitutional bootstrap does NOT exist in production.

This is the single most important finding of this audit.

---

## 1. TRUE ENTRY POINT

**`server.js`** — sole Node.js process entry point.

- Size: 18.4K
- Render start command: `node --max-old-space-size=220 server.js`
- Local dev: `node --watch server.js`
- Port: `process.env.PORT || 3000`
- Required env at boot: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

No alternative entry points. `instrument.js` is first require (Sentry init, 7 lines), not an entry point.

---

## 2. ACTIVE SERVER / RUNTIME FILES

| File | Role | Git Status |
|------|------|-----------|
| `server.js` | Express app, route mounting, startup | Tracked — last commit 2026-07-11 |
| `instrument.js` | Sentry init — first require in server.js | Tracked |
| `lib/startup.js` | `wireEvents()` + `onListen()` — event wiring and init | Tracked (modified `M`) |
| `lib/server-state.js` | Process singletons (GIT_SHA, error buffers, Mastra state) | Tracked |
| `lib/server-utils.js` | Domain detection, cache, helpers | Unknown |
| `lib/error-handlers.js` | Express error middleware | Unknown |
| `lib/shutdown-handler.js` | SIGTERM/SIGINT handler | Unknown |
| `config/index.js` | Model IDs, rate limits, timeouts, paths | Unknown |
| `ecosystem.config.js` | PM2 config for local dev | Tracked |
| `lib/startup/index.js` | SECONDARY startup module — separate from lib/startup.js | UNKNOWN |

**New finding:** `lib/startup/index.js` exists (distinct from `lib/startup.js`). Role is UNKNOWN — not confirmed in previous audit.

---

## 3. ACTIVE ORCHESTRATION LAYER

### Primary Orchestrator
**`agent-system/orchestrator.js`** — 115.3K — exports `runAgentTeam`.

Key imports:
- `./obsidian-memory` — Obsidian vault memory (legacy path, direct)
- `./episodic-memory` — LEGACY episodic memory (direct, bypasses gateway)
- `./memory-indexer`, `./memory-retriever`
- `../lib/memory/gateway` — canonical memory access
- `../runtime/task-router` — root-level `runtime/` directory (NEW — see Section 8)
- `../lib/memory/reflexion-tracker`

**Finding:** orchestrator.js imports BOTH `agent-system/episodic-memory.js` (legacy) AND `lib/memory/gateway.js` (canonical). Dual memory path is active in production.

### Task Execution
**`lib/agent-task-cycle.js`** — 55.0K. Imports `lib/pg_helpers` for all task CRUD. Imports `../agent-system/agents` (not `orchestrator.js`).

### Cognitive Layer
**`lib/cognitive-orchestrator.js`** — Intent shaping layer. Modes: REFLEX, FRAMED, DEFERRED, STREAMED. Imported by server.js.

### Master Orchestrator
**`agent-system/master-orchestrator.js`** — 52.8K. Imports Supabase client directly. Imports `lib/runtime/constitutional-gate`. Role overlaps with orchestrator.js.

---

## 4. ACTIVE KERNEL / MIDDLEWARE CHAIN

Every HTTP request traverses (in order):

```
server.js app.use(middleware/civilization-kernel)   ← CIVILIZATION KERNEL
server.js app.use('/api', kernelChain)              ← API AUTHORITY CHAIN (4 gates)
lib/runtime/petl-middleware.js                      ← PETL TRANSACTION LAYER
```

**Civilization Kernel** (`middleware/civilization-kernel.js`):
- Pipeline: `INIT → IDENTITY → CONSTITUTION → GOALS → ATTENTION → [route] → POST HOOK`
- Constitutional thresholds by autonomy level: AL1→0.95, AL2→0.90, AL3→0.75, AL4→0.60, AL5→0.50, AL6→0.40
- Destructive patterns blocked: `/drop`, `/force-delete`, `/hard-delete`, `/truncate`, `/purge`
- Writes: `logs/kernel.ndjson` + `logs/apex_audit.ndjson`
- Imports: `lib/runtime/execution-context`, `lib/runtime/constitutional-gate`, `lib/goals/goal-graph`, `lib/attention/attention-engine`, `lib/memory/gateway`

**API Kernel Chain** (`lib/kernel.js` — 4 gates):
1. `resolveIdentity` — `lib/middleware.js`
2. `resolveOwnership` — `lib/middleware.js`
3. `checkAuthority` — `lib/agent-file-utils.js`
4. `checkGovernance` — `lib/agent-file-utils.js`

**PETL Gate** (`lib/runtime/petl-middleware.js`):
- Calls `execution-transaction.beginWithLattice(req)`
- Bypass: `/health`, `/favicon.ico`, `/sw.js`, `/manifest.json`, `/icon-*`, `/public/*`
- Wraps `res.json` / `res.send` to auto-finalize transactions
- Full execution-transaction.js imports: `compensation-log`, `concurrency-slot-manager`, `invariant-compiler`, `constitutional-preflight`, `decision-lattice`, `lattice-feedback-loop`, `lattice-health-signal`, constitutional types

---

## 5. ACTIVE DATABASE CONNECTIONS

### PRIMARY: Supabase (via JavaScript client)
- Module: `lib/clients.js` → `getSupabaseClient()`
- Auth: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Client: `@supabase/supabase-js`
- Used by: `lib/pg_helpers.js` (all application CRUD), `lib/memory/*.js`, `lib/runtime/constitutional-store.js`, all route handlers

### SECONDARY: PostgreSQL direct pool — SCOPE EXPANDED (regression)
- Module: `lib/pg_database.js` → exports `pg.Pool`
- Auth: `DATABASE_URL`
- Previously: "RLS setup only"
- **Current confirmed imports:** `agent-system/supabase-setup.js`, `lib/cron-scheduler.js`, `lib/event-consumer.js`, `lib/outbox-relay.js`, `lib/startup/index.js` (×4), `lib/startup.js` (×2)
- **Risk upgraded to HIGH:** pg pool is no longer narrowly scoped to RLS. Multiple production modules import it directly. Same underlying Postgres; different protocol (TCP vs REST). Naming confusion worsened.

### HOLDOUT: Supabase holdout client
- Module: `lib/clients.js` → `getHoldoutClient()`
- Auth: `SUPABASE_HOLDOUT_URL` + `SUPABASE_HOLDOUT_ANON_KEY`
- Purpose: holdout evaluation dataset (respects RLS, anon key)

### TERTIARY: Local filesystem (append-only)
- `logs/kernel.ndjson` + `logs/apex_audit.ndjson`
- `.civilisation/consensus/` — flat-file fallback

---

## 6. ACTIVE MEMORY SYSTEMS

**Canonical path:** `lib/memory/gateway.js`

lib/memory/ files (24 total — 3 new since last audit):
`access-controller.js`, `adaptation-cycle.js`, `cache.js`, `consolidation-engine.js`, `decision-memory.js`, `episodic-memory-pg.js`, `founder-memory.js`, `gateway.js`, **`governance-synthesizer.js`** (NEW), **`importance-engine.js`** (NEW), `improvement-engine.js`, `index.js`, `knowledge-graph.js`, `memory-governor.js`, `ownership.yaml`, **`policy-extractor.js`** (NEW), `procedural-memory.js`, `reflexion-ranker.js`, `reflexion-tracker.js`, `sanitizer.js`, `semantic-memory.js`, `skill-memory.js`, `strategic-memory.js`, `working-memory.js`

Gateway aggregates: Layer 0 (founder), lessons, policies, historical, project context, semantic facts, working memory, skill memory, knowledge graph nodes, SIE briefing, executive verdicts. 11 layers in parallel via `Promise.allSettled`.

**Non-canonical parallel memory paths (ACTIVE):**
- `agent-system/obsidian-memory.js` — imported directly by orchestrator.js (not via gateway)
- `agent-system/episodic-memory.js` — imported directly by orchestrator.js (legacy, NOT gateway)
- `@mastra/memory` v1.20.5 — in package.json; delayed init

---

## 7. ACTIVE REGISTRIES

| Registry | File | Status |
|----------|------|--------|
| Agent Library | `agent-system/agent-library.js` | ACTIVE |
| Agent Registry | `agent-system/agent-registry.js` | ACTIVE |
| Executive Registry | `lib/executive/registry.js` | ACTIVE |
| Model Registry | `lib/models/registry.js` | ACTIVE |
| Registry Kernel | `lib/registry/kernel.js` | ACTIVE — 12.2K |
| Knowledge Claim Registry | `lib/knowledge/knowledge-claim-registry.js` | ACTIVE |
| Evidence Object Registry | `lib/knowledge/evidence-object-registry.js` | ACTIVE |
| Belief Object Registry | `lib/knowledge/belief-object-registry.js` | ACTIVE |
| Interpretation Record Registry | `lib/knowledge/interpretation-record-registry.js` | ACTIVE |
| Epistemic Protocol Registry | `lib/epistemics/epistemic-protocol-registry.js` | ACTIVE |
| Inference Protocol Registry | `lib/inference/inference-protocol-registry.js` | ACTIVE |
| Observer Registry | `lib/reality/observer-registry.js` | ACTIVE |
| Domain Loader | `civilisation/domain-loader.js` | ACTIVE LEGACY — still imported by 8 modules; file modified |
| Civilization Understanding Registry | `lib/civilization/civilization-understanding-registry.js` | ACTIVE — UNTRACKED |

---

## 8. NEW ROOT-LEVEL DIRECTORIES (NOT IN PREVIOUS AUDIT)

| Directory | Status |
|-----------|--------|
| `runtime/` | UNKNOWN — root-level, distinct from `lib/runtime/`. Referenced by orchestrator.js as `../runtime/task-router` |
| `services/` | UNKNOWN |
| `domains/` | UNKNOWN |
| `vault/` | UNKNOWN |
| `src/` | UNKNOWN — contains `src/routes/` with separate route files (agent-schedules, agent-tasks, auth, chat) |
| `.constitution/` | UNKNOWN |
| `.registry-cache/` | UNKNOWN |

These directories did not appear in the previous Phase 0 audit and require classification.

---

## 9. ACTIVE CONSTITUTIONAL PIPELINE

**LOCAL ONLY — NOT COMMITTED — NOT IN PRODUCTION**

Wave 3 bootstrap chain (all files are `??` untracked in git):

```
lib/civilization/deliberation-registry.js   [??  UNTRACKED]
    → CUM + DeliberationRecord + CDP
         ↓
lib/civilization/rt12-bootstrap.js          [??  UNTRACKED]
    → CDP→ACCEPTED + CivilizationalDecision + OAR entry + DecisionArchiveRecord + ChainRecord
         ↓
lib/civilization/rt13-bootstrap.js          [??  UNTRACKED]
    → ActionProjection + ICR + EER
         ↓
lib/runtime/constitutional-store.js         [??  UNTRACKED]
    → Supabase constitutional_records (migration 080 — also untracked)
```

**NOT YET WIRED (Wave 4):**
- RT-14 Reflection Runtime — type definition only (`lib/constitutional-types/observed-consequence-record.js`)
- RT-11 CausalModel — no bootstrap file
- Stage 4 crossing — never occurred
- OAR terminal status — all entries at PENDING

---

*APEX-AUTHORITY-MAP.md — Phase 0 Authority Audit (Re-run) — 2026-08-19*
