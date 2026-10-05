# APEX ONE PLATFORM INTEGRATION — PHASE 0 CERTIFICATION REPORT

**Status:** PHASE 0 RE-RUN COMPLETE — AWAITING APPROVAL TO PROCEED
**Date:** 2026-08-19
**Previous certification:** 2026-08-04
**Authority:** Repository reality — all findings based on direct file reads, import tracing, git status inspection
**Output documents:** 7 (APEX-AUTHORITY-MAP, APEX-SYSTEM-INVENTORY, APEX-CANONICAL-RUNTIME-GRAPH, APEX-DATA-AUTHORITY-AUDIT, APEX-INTERFACE-READINESS-AUDIT, APEX-DAILY-OPERATION-READINESS-AUDIT, APEX-ONE-PLATFORM-MIGRATION-PLAN)

---

## CRITICAL FINDING NOT PRESENT IN AUG-4 CERTIFICATION

**Wave 3 has never been deployed.**

The last git commit is `2026-07-11`. All Wave 3 constitutional files — `lib/civilization/deliberation-registry.js`, `rt12-bootstrap.js`, `rt13-bootstrap.js`, `lib/civilization/civilization-understanding-registry.js`, `lib/runtime/constitutional-store.js` — and all three Wave 3 migrations (080, 081, 082) are UNTRACKED in git. They exist in the local working tree only.

The production Render server is running the 2026-07-11 codebase. Constitutional bootstrap does not exist in production. `constitutional_records` table does not exist in the production Supabase database.

This is not a gap to plan around. It is a prerequisite to fix before Wave 4 begins.

---

## 1. CURRENT STATE

APEX is a **single Node.js + Express process** (`server.js`, 18.4K) deployed on Render.com. It is operational as a personal AI OS at the 2026-07-11 commit level.

**APEX works in production today for:**
- Chat with Claude models (Haiku/Sonnet/Opus)
- Agent task creation and execution (Autonomy Level 3)
- 13-layer memory persistence (all to Supabase)
- 47 domain route handlers (including new reality-architecture route from 2026-07-11)
- APEX MIND v2 dashboard (44-node topology, reality architecture page)
- Ministry crons (5), Supreme Council (weekly), Self-Expansion Engine (weekly)
- PWA notifications

**What does NOT exist in production:**
- Constitutional bootstrap (Wave 3 — all files untracked)
- `constitutional_records` table (migration 080 not applied)
- OAR entries, ActionProjection records, CivilizationalDecision records
- Anything described in the WAVE-4-RECOMPUTED-EXECUTION-ROADMAP as "Wave 3 verified"

**New since Aug-4 audit:**
- `runtime/` directory at root (imported by orchestrator.js as `../runtime/task-router` — UNKNOWN)
- `src/routes/` with 4 duplicate route files (mount status UNKNOWN)
- `lib/startup/index.js` (secondary startup module — UNKNOWN role)
- 3 new memory modules: `governance-synthesizer.js`, `importance-engine.js`, `policy-extractor.js`
- `lib/memory/governance-synthesizer.js`, etc. (unclassified)
- `agent-system/rag-bridge.js` (new, unclassified)
- `lib/pg_database.js` scope expanded from "RLS only" to 8+ production modules (regression)
- `dashboard.html` grown from ~602KB to 1.2MB / 20,826 lines

---

## 2. CANONICAL ARCHITECTURE

| Component | Canonical File | Deployed? |
|-----------|---------------|-----------|
| Entry point | `server.js` | YES |
| Orchestration | `agent-system/orchestrator.js` | YES |
| Task execution | `lib/agent-task-cycle.js` | YES |
| Kernel | `middleware/civilization-kernel.js` + `lib/kernel.js` | YES |
| PETL | `lib/runtime/petl-middleware.js` | YES |
| Constitutional store | `lib/runtime/constitutional-store.js` | **NO — untracked** |
| Memory | `lib/memory/gateway.js` (13 layers) | YES |
| Database | Supabase via `lib/clients.js` | YES |
| Interface | `public/dashboard.html` (1.2MB) | YES |
| Constitutional bootstrap | `lib/civilization/` (rt12, rt13, deliberation) | **NO — all untracked** |
| constitutional_records table | migration 080 | **NO — untracked** |

---

## 3. LEGACY SYSTEMS

| System | Files | Issue | Status Change from Aug-4 |
|--------|-------|-------|--------------------------|
| Old civilization | `civilisation/` (British) | Still active | UNCHANGED |
| LangChain memory | `agent-system/langchain-memory.js`, `langchain-rag.js` | Still present | UNCHANGED |
| Old episodic memory | `agent-system/episodic-memory.js` | Still imported by orchestrator.js directly | UNCHANGED |
| pg_helpers naming | `lib/pg_helpers.js` | NOT renamed (was planned Aug-4) | **PLAN NOT EXECUTED** |
| pg_database pool | `lib/pg_database.js` | Scope expanded to 8+ modules | **REGRESSION** |
| Scripts reflection agent | `scripts/reflection_agent.js` | Still present | UNCHANGED |
| lib/constitution/ | 68 files | baseline.json deleted; rest UNKNOWN | baseline.json deletion is new |
| lib/orchestration/ | 26 files | Mostly UNKNOWN | Count grew from ~20 |
| Mastra agents | `agent-system/mastra_agents.js` | Still unclear | UNCHANGED |
| src/routes/ | 4 files | NEW — duplicate routes; mount status UNKNOWN | NEW FINDING |
| runtime/ (root) | Unknown files | NEW — imported by orchestrator | NEW FINDING |

---

## 4. MIGRATION RISKS

| Risk | Severity | Change from Aug-4 |
|------|----------|-------------------|
| Wave 3 never committed to git | CRITICAL | **NEW — most important finding** |
| Migrations 080–082 not applied | CRITICAL | **NEW — consequence of untracked files** |
| `lib/pg_helpers.js` rename breaks imports | HIGH | Unchanged — plan not executed |
| `civilisation/domain-loader.js` still active | HIGH | Unchanged |
| pg pool scope expanded silently | HIGH | **REGRESSION — was medium in Aug-4** |
| src/routes/ may be mounted (duplicate routes) | HIGH | **NEW** |
| runtime/ root dir role unknown | MEDIUM | **NEW** |
| lib/startup/index.js role unknown | MEDIUM | **NEW** |
| 3 new memory modules unclassified | MEDIUM | **NEW** |
| baseline.json deleted from lib/constitution/ | MEDIUM | **NEW** |
| Mastra memory writes outside gateway | MEDIUM | Unchanged |
| Obsidian tunnel instability | MEDIUM | Unchanged |
| lib/constitution/ 68 files status unknown | MEDIUM | Unchanged |
| agent_tasks vs apex_tasks ambiguity | MEDIUM | Unchanged |
| Reality loop disabled | MEDIUM | Unchanged |
| OAR entries stuck at PENDING | LOW now / CRITICAL if Wave 4 attempted without Wave 3 deployed | **ELEVATED** |

---

## 5. RECOMMENDED EXECUTION ORDER

### IMMEDIATE — Before ANY Wave 4 discussion:

0. **Commit Wave 3 untracked files** — all `??` files in working tree
   - Audit for secrets and broken imports first
   - Commit, push, wait for Render deploy
   - Apply migrations 080, 081, 082 to production Supabase
   - Verify `constitutional_records` table populated at startup

### Short-term — Phase 1 (1-2 sessions):

1. **Classify src/routes/** — confirm mount vs orphan; resolve if orphaned
2. **Classify runtime/ root** — read task-router.js; determine role
3. **Read lib/startup/index.js** — determine pg pool boot order
4. **Audit pg pool importers** — confirm each module's purpose
5. **Classify 3 new memory modules** — read and document
6. **Confirm baseline.json deletion is safe**
7. **Rename lib/pg_helpers.js** (was planned Aug-4, NOT done)
8. **Inventory production Supabase tables** (post-migration)

### Wave 4 sequence (after Phase 0.5 + Phase 1 complete):

9. **T4-INV** — formally classify all 34 lib/runtime/ files (still not done)
10. **T4-01** — RT-14 Reflection Runtime Bootstrap
11. **T4-02** — RT-11 CausalModel + AssumptionRegister
12. **T4-06** — OAR Terminal Status Framework
13. **T4-03** — RT-16 Amendment Runtime
14. **T4-04** — RT-04 Audit Runtime
15. **T4-05** — DOM-000001 Operationalization

### Medium-term — Phase 3:

16. **Deployment reality panel** in dashboard (shows git gap, migration status)
17. **Constitutional status panel** (post-Wave 3 deployment)
18. **Push notification delivery verification**

---

## 6. WAVE 4 READINESS ASSESSMENT

| Gate | Status | Change from Aug-4 |
|------|--------|-------------------|
| Wave 3 complete (local) | CONFIRMED (local working tree) | Unchanged |
| Wave 3 deployed to production | **NOT DEPLOYED** | **CRITICAL NEW FINDING** |
| Migrations 080–082 applied | **NOT APPLIED** | **CRITICAL NEW FINDING** |
| T4-INV pre-classification | NOT DONE | Unchanged — still not done |
| IDR-W4-STAGE4-001 | OPEN | Unchanged |
| IDR-W4-PAIR48-001 | OPEN | Unchanged |
| lib/runtime/ collision risk | CLEARED (preliminary) | Unchanged |
| pg pool scope audit | NOT DONE | **NEW BLOCKER** |
| src/routes/ classification | NOT DONE | **NEW BLOCKER** |
| runtime/ root classification | NOT DONE | **NEW BLOCKER** |

**VERDICT: Wave 4 implementation CANNOT begin.**

The minimum precondition for Wave 4 is that Wave 3 is deployed. Wave 3 is not deployed. Committing and deploying the Wave 3 working tree must happen before T4-INV or any Wave 4 Phase 0 work begins.

After Wave 3 is deployed, the Aug-4 verdict stands: T4-INV and T4-01 Phase 0 Falsification Audit are the entry points into Wave 4 implementation.

---

## 7. THE FOUR QUESTIONS ANSWERED

### "What is APEX?"

APEX is a personal AI OS: a single Node.js server hosting an evolving constitutional AI pipeline that governs agent actions through a multi-gate kernel, PETL transactions, and a 13-layer memory system. The constitutional layer (Wave 3) exists locally but has never been deployed.

### "Which files are APEX?"

**The canonical APEX system (what is actually in production):**
```
server.js                              ← entry point
lib/clients.js                         ← database authority
lib/memory/gateway.js + memory/*       ← memory system (13 layers)
lib/runtime/petl-middleware.js         ← transaction gate
lib/runtime/assembler.js               ← observability chain
middleware/civilization-kernel.js      ← civilization kernel
lib/kernel.js                          ← authority chain
agent-system/orchestrator.js           ← agent pipeline (115.3K)
lib/agent-task-cycle.js               ← task execution
routes/*.js (47 files)                 ← domain handlers
public/dashboard.html (1.2MB)          ← interface
lib/expansion/, lib/ministry/          ← expansion + ministry
lib/executive/executive-council.js     ← supreme council
```

**The canonical APEX system (local working tree, NOT in production):**
```
lib/civilization/deliberation-registry.js  ← Wave 3 bootstrap start  [UNTRACKED]
lib/civilization/rt12-bootstrap.js         ← Wave 3 bootstrap         [UNTRACKED]
lib/civilization/rt13-bootstrap.js         ← Wave 3 bootstrap         [UNTRACKED]
lib/runtime/constitutional-store.js        ← Reality Fabric           [UNTRACKED]
lib/constitutional-types/*.js              ← type definitions
migrations/080_constitutional_records.sql  ← Wave 3 schema           [UNTRACKED]
```

### "Which systems are not APEX?"

- `civilisation/` (British spelling) — legacy, not canonical
- `agent-system/langchain-memory.js` — legacy memory path
- `agent-system/langchain-rag.js` — legacy RAG path
- `agent-system/episodic-memory.js` — legacy episodic (still imported by orchestrator.js)
- `lib/pg_database.js` (beyond RLS) — secondary path, scope now expanding
- `src/routes/` — UNKNOWN; may be duplicate route layer
- `runtime/` (root level) — UNKNOWN; distinct from lib/runtime/
- `lib/constitution/*.js` (68 files) — status UNKNOWN; require audit
- `lib/orchestration/*.js` (except `governance_global_state_view.js`) — status UNKNOWN
- `lib/startup/index.js` — UNKNOWN; secondary startup module

### "What must be unified before daily operation?"

Priority order:
1. **Commit and deploy Wave 3 working tree** — constitutional bootstrap does not exist in production
2. **Apply migrations 080–082** — constitutional_records table does not exist in production
3. **Resolve pg pool scope expansion** — silent write paths bypassing Supabase RLS
4. **Classify src/routes/ and runtime/** — potential duplicate layers in production
5. **Rename pg_helpers.js** — naming confusion (plan from Aug-4 not executed)
6. **Close constitutional loop (Wave 4 / T4-01)** — D8 INV-6 Feedback Requirement unmet
7. **Enable reality loop** — APEX_COMPLETED events not feeding back

---

## PHASE 0 RE-CERTIFICATION

| Document | Purpose | Status |
|----------|---------|--------|
| `APEX-AUTHORITY-MAP.md` | True entry points, critical git finding, active systems | COMPLETE |
| `APEX-SYSTEM-INVENTORY.md` | All systems classified; new directories flagged | COMPLETE |
| `APEX-CANONICAL-RUNTIME-GRAPH.md` | Full runtime graph; untracked layers marked | COMPLETE |
| `APEX-DATA-AUTHORITY-AUDIT.md` | Database authority; pg pool regression; migration status | COMPLETE |
| `APEX-INTERFACE-READINESS-AUDIT.md` | Interface state; 1.2MB dashboard; deployment gap | COMPLETE |
| `APEX-DAILY-OPERATION-READINESS-AUDIT.md` | 10 gaps; 6 new since Aug-4; readiness matrix | COMPLETE |
| `APEX-ONE-PLATFORM-MIGRATION-PLAN.md` | Phase 0.5 emergency + Phase 1–4 plan | COMPLETE |
| **This document** | Final certification report | COMPLETE |

**No production code was modified during Phase 0 re-run.**

**Awaiting approval to begin:**
- Phase 0.5 (commit Wave 3, deploy, apply migrations)
- Phase 1 (legacy marking, new risk resolution)
- Wave 4 (after Phase 0.5 + Phase 1 complete)

---

*APEX-ONE-PLATFORM-PHASE0-CERTIFICATION.md — Phase 0 Authority Audit (Re-run) — 2026-08-19*
*Constitutional authority: APEX-CONSTITUTION-v1.0; repository reality*
