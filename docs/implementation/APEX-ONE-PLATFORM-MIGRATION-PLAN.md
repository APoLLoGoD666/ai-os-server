# APEX-ONE-PLATFORM-MIGRATION-PLAN.md
# APEX One Platform — Migration Plan

**Phase:** Phase 0 Authority Audit (Re-run) — Output
**Date:** 2026-08-19
**Authority:** All Phase 0 re-audit findings (Aug-19 versions of all 6 output documents)
**Constraint:** No production code changes until Phase 0 certification approved

---

## STRATEGIC GOAL

ONE SYSTEM. ONE RUNTIME. ONE MEMORY. ONE DATABASE AUTHORITY. ONE INTERFACE FUTURE.

**New prerequisite discovered in this audit:** Before ANY Wave 4 implementation, the Wave 3 working tree must be committed and deployed. The production system has never received the constitutional pipeline.

---

## PHASE 0.5 — EMERGENCY PREREQUISITE (NEW — NOT IN AUG-4 PLAN)

**Objective:** Bring production to parity with working tree. Close the git gap.

This phase did not exist in the Aug-4 plan because the audit did not discover the untracked file situation until now.

### Task 0.5-01: Audit all untracked (`??`) files before committing

- Run `git status` and identify every `??` file
- For each file: confirm it is safe to commit (no secrets, no broken imports)
- Verify `lib/runtime/constitutional-store.js` is self-contained
- Verify `lib/civilization/deliberation-registry.js`, `rt12-bootstrap.js`, `rt13-bootstrap.js` import only tracked dependencies

### Task 0.5-02: Commit Wave 3 constitutional files

- Stage and commit all `??` civilization bootstrap files
- Stage and commit `lib/runtime/constitutional-store.js`
- Stage and commit migrations 080, 081, 082
- Verify node --check passes on all new files before commit

### Task 0.5-03: Push to main and deploy

- Push to main → Render auto-deploy
- Wait for health check to pass
- Confirm server logs show constitutional bootstrap running

### Task 0.5-04: Apply migrations 080–082 to production Supabase

- Run migration 080 (`constitutional_records` table)
- Run migration 081 (obs_record_id propagation)
- Run migration 082 (domain_id propagation)
- Verify `SELECT * FROM constitutional_records LIMIT 5` returns rows after startup

---

## PHASE 1: REMOVE AMBIGUITY

**Objective:** Establish what is canonical. Mark what is legacy. Close duplicate paths.

### Phase 1A — Naming Clarity (UNCHANGED FROM AUG-4)

**Task 1A-01:** Rename `lib/pg_helpers.js` → `lib/supabase-helpers.js`
- Evidence: Uses Supabase JS client, not pg pool
- Risk: HIGH — 24+ importers. Audit all imports first. One commit.
- Note: This was planned in Aug-4 but NOT completed.

**Task 1A-02:** Add deprecation notice to `lib/pg_database.js`
- Evidence: Was "RLS only"; now imported by 8 additional modules
- Risk: MEDIUM — must audit each new importer before adding deprecation notice
- Note: Scope expansion makes this higher priority than in Aug-4

**Task 1A-03:** Add deprecation notices to `civilisation/` directory (British spelling)
- Preserve `civilisation/domain-loader.js` — still imported by 8 knowledge registries
- Add `// LEGACY — superseded by lib/civilization/. Do not extend.` header to each file

### Phase 1B — New Risk Resolution (NEW IN THIS PLAN)

**Task 1B-01:** Classify `src/routes/` directory
- Read server.js route mounting section
- Determine if agent-schedules.js, agent-tasks.js, auth.js, chat.js in src/routes/ are mounted
- If mounted: identify why duplicate routes exist and which is canonical
- If orphaned: archive to scripts/archive/src-routes/

**Task 1B-02:** Classify `runtime/` root directory
- Read `runtime/task-router.js` (imported by orchestrator.js as `../runtime/task-router`)
- Determine what task routing logic lives here vs lib/runtime/
- Classify all files in runtime/

**Task 1B-03:** Read `lib/startup/index.js`
- Determine role in boot sequence
- Determine why pg_database.js consumers use startup/index.js (×4) vs startup.js
- Classify as ACTIVE CANONICAL or ACTIVE SECONDARY

**Task 1B-04:** Classify 3 new memory modules
- Read `lib/memory/governance-synthesizer.js`, `importance-engine.js`, `policy-extractor.js`
- Determine if they are wired into gateway.js layers
- Document table dependencies

**Task 1B-05:** Confirm lib/constitution/baseline.json deletion is safe
- Read 68 files in lib/constitution/ for `require('baseline.json')` or `./baseline` imports
- If referenced: determine what replaces it before committing the deletion
- If not referenced: commit deletion as-is

**Task 1B-06:** Classify `services/`, `domains/`, `vault/` directories
- Quick file listing and first-line inspection
- Determine if any are imported in server.js or startup

### Phase 1C — Legacy Memory Path Isolation (UNCHANGED FROM AUG-4)

**Task 1C-01:** Add deprecation notice to `agent-system/langchain-memory.js`
**Task 1C-02:** Add deprecation notice to `agent-system/langchain-rag.js`
**Task 1C-03:** Add deprecation notice to `agent-system/episodic-memory.js`
- Note: This file is STILL imported by orchestrator.js (115.3K). Cannot deprecate until orchestrator.js is updated.

### Phase 1D — Database Authority Declaration

**Task 1D-01:** Create `DATABASE-AUTHORITY.md`
- Supabase is primary. pg pool is secondary (scope: audit what each pg pool importer actually does).
- pg_helpers.js uses Supabase despite name — document.

**Task 1D-02:** Inventory production Supabase tables (post-migration-080 deployment)
- `SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::regclass)) FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(tablename::regclass) DESC`
- Document all tables with source migration

**Task 1D-03:** Audit each pg pool importer
- For each of: `cron-scheduler.js`, `event-consumer.js`, `outbox-relay.js`, `startup/index.js`:
  - What operations use the pool directly?
  - Are these writes to production tables? Which tables?
  - Is RLS enforced on those tables via the pool connection?

### Phase 1E — Script Archival (UNCHANGED FROM AUG-4)

**Task 1E-01:** Archive completed one-time scripts to `scripts/archive/`

---

## PHASE 2: RUNTIME CONSOLIDATION

**Objective:** Unify execution path, unify memory, unify APIs.

### Phase 2A — Civilization Layer Unification

**Task 2A-01:** Complete T4-INV
- Prerequisite: Phase 0.5 complete; Wave 3 deployed
- Classify all 34 lib/runtime/ files (no classification file exists yet)
- Produce APEX-RUNTIME-INV.md

**Task 2A-02:** Unify consensus path
- Route all new consensus through `lib/civilization/` only
- `civilisation/consensus.js` → historical reads only, no new writes
- Requires confirming `lib/intelligence/civilization-runtime.js` can be updated to use deliberation-registry instead

**Task 2A-03:** Resolve domain loading
- `civilisation/domain-loader.js` imported by 8 knowledge registries
- Determine if `lib/civilization/domain-scorer.js` + `lib/civilization/admission-engine.js` can replace it
- Cannot deprecate domain-loader.js until replacement confirmed

### Phase 2B — Memory Unification

**Task 2B-01:** Remove legacy episodic-memory.js from orchestrator.js
- Current: `orchestrator.js` imports `agent-system/episodic-memory.js` directly (bypassing gateway)
- Required: Route episodic writes through `lib/memory/gateway.js` Layer 2 only
- Risk: HIGH (orchestrator.js is 115.3K; surgical change required)

**Task 2B-02:** Remove obsidian-memory.js from orchestrator.js direct import
- Current: `orchestrator.js` imports obsidian-memory.js directly
- Decision required: Is Obsidian primary (needs stable tunnel) or secondary (Supabase primary)?
- Recommended: Supabase = primary; obsidian = read-only reference or async sync

**Task 2B-03:** Clarify Mastra memory role
- Determine if Mastra memory is additive (adds capability) or redundant (duplicates gateway)
- If redundant: disable; rely on lib/memory/

### Phase 2C — Constitutional Pipeline Extension (Wave 4)

Prerequisite for all Wave 4 tasks: Phase 0.5 complete (Wave 3 deployed, migration 080 applied).

**Task 2C-01:** T4-01 — RT-14 Reflection Runtime Bootstrap
- Closes constitutional loop (D8 INV-6)
- Produces OCR, OAR-TSR, RTR
- Gate: T4-INV complete + IDR-W4-PAIR48-001 + IDR-W4-STAGE4-001 resolved

**Task 2C-02:** T4-02 — RT-11 CausalModel + AssumptionRegister

**Task 2C-03:** T4-06 — OAR Terminal Status Framework

**Task 2C-04:** T4-03 — RT-16 Amendment Runtime

**Task 2C-05:** T4-04 — RT-04 Audit Runtime

**Task 2C-06:** T4-05 — DOM-000001 Operationalization

### Phase 2D — API Unification

**Task 2D-01:** Resolve src/routes/ (complete Phase 1B-01 first)
- If src/routes/ is mounted: unify with routes/ or establish clear ownership
- If orphaned: archive

**Task 2D-02:** Audit route sub-prefix consistency
- CLAUDE.md rule: every route file must define internal sub-prefix matching filename
- Verify all 47 routes comply

---

## PHASE 3: LIVE OPERATION LAYER

**Objective:** Dashboard, monitoring, event stream, deployment reality visibility.

### Phase 3A — Deployment Reality Panel (NEW — HIGHEST INTERFACE PRIORITY)

**Task 3A-01:** Add deployment reality panel to dashboard.html
- Show: current git SHA deployed on Render vs local working tree
- Show: untracked/uncommitted file count (proxy: call `git status --short | wc -l`)
- Show: migration status (query `information_schema.tables` for constitutional_records existence)
- Show: Wave 3 deployed flag (YES/NO based on constitutional_records row count)

### Phase 3B — Constitutional Status Panel

**Task 3B-01:** Add constitutional status panel
- Show: `constitutional_records` row count by type
- Show: last ActionProjection timestamp and stage
- Show: OAR pending count
- Show: Stage 4 crossing status (NEVER OCCURRED)

### Phase 3C — Memory and Observability

**Task 3C-01:** Memory layer health panel (per-layer row counts)
**Task 3C-02:** Lattice feedback loop metrics endpoint
**Task 3C-03:** Audit log viewer (last N records from `logs/apex_audit.ndjson`)

### Phase 3D — Daily Operation Infrastructure

**Task 3D-01:** Complete push notification device registration flow
**Task 3D-02:** Enable reality loop (set `REALITY_LOOP_ENABLED=true`)
**Task 3D-03:** Configure CRON_SECRET, GITHUB_TOKEN

---

## PHASE 4: PRIVATE LOCAL DEPLOYMENT READINESS

(Unchanged from Aug-4 plan — not yet relevant.)

**Task 4A-01:** Local model adapter (Ollama, LM Studio, OpenAI-compatible)
**Task 4A-02:** Degraded mode for API unavailability
**Task 4B-01:** SQLite fallback for Supabase-unavailable mode
**Task 4C-01:** Data classification audit (what goes to Anthropic, Supabase, Sentry)
**Task 4C-02:** Anthropic API prompt privacy review
**Task 4C-03:** Sentry data minimization

---

## MIGRATION EXECUTION ORDER

```
Phase 0.5 (EMERGENCY PREREQUISITE — do before any Wave 4 planning)
  ├── 0.5-01: Audit all ?? untracked files for safety
  ├── 0.5-02: Commit Wave 3 constitutional files
  ├── 0.5-03: Push to main → Render deploy → health check
  └── 0.5-04: Apply migrations 080, 081, 082 to production Supabase

Phase 1 (Naming, legacy marking, new risk resolution)
  ├── 1B-01: Classify src/routes/ (mount vs orphan)
  ├── 1B-02: Classify runtime/ root directory
  ├── 1B-03: Read lib/startup/index.js
  ├── 1B-04: Classify 3 new memory modules
  ├── 1B-05: Confirm baseline.json deletion is safe
  ├── 1B-06: Classify services/, domains/, vault/
  ├── 1D-02: Inventory production Supabase tables (post-migration)
  ├── 1D-03: Audit pg pool importers
  ├── 1A-01: Rename pg_helpers → supabase-helpers (after importer audit)
  ├── 1A-02: Deprecate pg_database.js
  ├── 1A-03: Deprecate civilisation/ headers
  ├── 1C-01/02: Deprecate langchain memory modules
  └── 1E-01: Archive completed scripts

Phase 2 (Consolidation — requires Phase 0.5 complete)
  ├── 2A-01: T4-INV (lib/runtime/ formal classification)
  ├── 2C-01: T4-01 RT-14 bootstrap
  ├── 2C-02: T4-02 RT-11 CausalModel
  ├── 2C-03: T4-06 OAR terminal status
  ├── 2B-01: Remove legacy episodic-memory from orchestrator
  ├── 2B-02: Resolve obsidian memory path
  └── 2A-02: Unify consensus path

Phase 3 (Interface + live operation)
  ├── 3A-01: Deployment reality panel  ← HIGHEST NEW PRIORITY
  ├── 3B-01: Constitutional status panel
  ├── 3D-01/02/03: Daily operation infrastructure
  └── 3C-01/02/03: Observability

Phase 4 (Local deployment — future)
  └── 4A through 4C
```

---

*APEX-ONE-PLATFORM-MIGRATION-PLAN.md — Phase 0 Authority Audit (Re-run) — 2026-08-19*
