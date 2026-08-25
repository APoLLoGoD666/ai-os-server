# R12 — Obsolete / Duplicate Removal Certification

**Programme**: APEX R-Series Refinement  
**Task**: R12 — Obsolete / Duplicate Removal  
**Status**: CERTIFIED WITH CONDITIONS  
**Certified**: 2026-08-25  
**Commit**: pending  
**Predecessor**: R11-DOCUMENTATION-CANONICALISATION-CERTIFICATION.md (commit 1a90482)

---

## §1 — Executive Summary

R12 performed a complete, evidence-driven obsolete/duplicate removal audit across the APEX repository. The audit covered 863 source JavaScript files (excluding node_modules, .git, and .claude agent infrastructure), all documentation (346 files from R11), and all configuration and package artifacts.

**Key finding**: The repository is substantially clean. Prior R-series phases (R4, R5, R7, R9) already removed the most significant orphans. Only two files are proven safe to remove in R12.

**Files removed (2)**:
1. `agent-system/langchain-memory.js` — Confirmed orphan (R9-04). Zero importers. 136 LOC.
2. `scripts/reflection_agent.js` — Confirmed duplicate. Binary-identical to `agent-system/reflection_agent.js`. 61 LOC.

**Total LOC removed**: 197

**Test result**: 1,579 / 1,579 PASS (unchanged from R11 baseline)

**Governing principle**: R12 does not redesign APEX. It removes only artifacts proven obsolete, duplicated, superseded, unreachable, or otherwise safe to remove.

---

## §2 — Baseline

| Item | Value |
|------|-------|
| HEAD at R12 start | `1a90482` (R11 commit) |
| Branch | main |
| Working tree at start | clean |
| R11 certified commit | `1a90482` ✓ — confirmed match |
| Platform | Render (Node.js + Express) |
| Canonical test baseline | 1,579 / 1,579 PASS |

---

## §3 — Repository Scope

| Area | Files examined |
|------|----------------|
| `agent-system/` | 43 JS files |
| `lib/` (all subdirectories) | ~320 JS files |
| `routes/` | 47 JS files |
| `src/routes/` | 33 JS files |
| `middleware/` | 4 JS files |
| `scripts/` | 53 JS files |
| `tests/` | 76 JS files + registry suite |
| `civilisation/` | 6 JS files |
| `domains/` | 30 JS files |
| `registry/` (root shims) | 8 JS files |
| `runtime/` | 1 JS file |
| `services/` | 14 JS files |
| `migrations/` | 2 JS files |
| `public/` | 2 JS files |
| `src/components/` | 1 JS file |
| Configuration / root | 6 JS files |
| **Total** | **~700+ unique JS files** (excluding node_modules, .git, .claude) |

---

## §4 — Phase 1 Candidate Inventory

### 4A — Orphan Production Modules (Category I)

| Candidate | Path | Importers | Decision | Evidence |
|-----------|------|-----------|----------|----------|
| langchain-memory.js | `agent-system/langchain-memory.js` | 0 | **DELETE** | Grep "langchain-memory" → zero files outside itself. R9-04 confirmed ORPHAN. No dynamic loader can reach it. |
| task-router.js | `runtime/task-router.js` | 3 | RETAIN-ACTIVE | `agent-system/orchestrator.js:24` (direct require), `lib/intelligence/civilization-runtime.js:231` (dynamic require), `tests/runtime-integration.test.js:26` |

### 4B — Duplicate Source Modules (Category A)

| Candidate | Path | Duplicate of | Decision | Evidence |
|-----------|------|-------------|----------|----------|
| reflection_agent.js (scripts) | `scripts/reflection_agent.js` | `agent-system/reflection_agent.js` | **DELETE** | `fc /b` confirms binary-identical (61 lines = 61 lines). server.js:239 imports agent-system version. scripts/ version has zero importers. |

### 4C — Root-Level Compatibility Shims (Category S)

| Path | Content | References | Decision |
|------|---------|------------|----------|
| `registry/index.js` | `module.exports = require('../lib/registry')` | Indirect via kernel.js | RETAIN-SHIM |
| `registry/kernel.js` | `module.exports = require('../lib/registry/kernel')` | `lib/intelligence/civilization-runtime.js:85` | RETAIN-SHIM (ACTIVE) |
| `registry/engine.js` | `module.exports = require('../lib/registry/engine')` | None found | RETAIN-SHIM |
| `registry/constraints.js` | `module.exports = require('../lib/registry/constraints')` | None found | RETAIN-SHIM |
| `registry/events.js` | `module.exports = require('../lib/registry/events')` | None found | RETAIN-SHIM |
| `registry/health-score.js` | `module.exports = require('../lib/registry/health-score')` | None found | RETAIN-SHIM |
| `registry/relationships.js` | `module.exports = require('../lib/registry/relationships')` | None found | RETAIN-SHIM |
| `registry/state-version.js` | `module.exports = require('../lib/registry/state-version')` | None found | RETAIN-SHIM |

**Rationale**: `registry/kernel.js` is referenced by `lib/intelligence/civilization-runtime.js:85`. The full set is retained as a group for consistency. Removing unused shims without also updating all potential callers is a structural operation belonging to R13.

### 4D — Parallel Architecture Directories

| Path | Relationship to lib/ equivalent | Decision |
|------|----------------------------------|----------|
| `civilisation/` | Distinct from `lib/civilization/` — different files, shared utility library | RETAIN-ACTIVE |
| `domains/` | Dynamically loaded by `civilisation/domain-loader.js:49` (`require(indexPath)`) | RETAIN-ACTIVE |

**Note on `civilisation/`**: NOT a duplicate of `lib/civilization/`. The root `civilisation/` contains domain validation utilities (clock, consensus, contract-validator, genome-validator, shadow-registry, domain-loader). The `lib/civilization/` contains Wave 4 bootstraps and registries. These are separate systems. `civilisation/` is imported by `lib/registry/index.js:39-42`, `lib/registry/kernel.js:31-36`, `lib/registry/context.js:21-26`, and `lib/intelligence/civilization-runtime.js:25`.

**Note on `domains/`**: Dynamically loaded by `civilisation/domain-loader.js` using `path.join(__dirname, '../domains')` + per-domain `require(indexPath)`. Reachable from `lib/registry/` → `civilisation/domain-loader` → `domains/`. NOT orphaned.

### 4E — PETL and Governance Clusters (Category E/J)

| Cluster | Files | Decision |
|---------|-------|----------|
| PETL-CLUSTER (`lib/runtime/`) | 9 files | RETAIN-INTENTIONAL-DEFERRED (R5 finding) |
| GOVERNANCE-CLUSTER (`lib/runtime/`) | 8 files | RETAIN-INTENTIONAL-DEFERRED (R5 finding) |

No new evidence changes R5 determinations. Production reachability: unwired (PETL) / self-referential (GOVERNANCE). These are intentionally built for future activation.

### 4F — Agent-System Files Not in R9 Inventory

| File | Status | Evidence |
|------|--------|----------|
| `agent-system/impeccable-validator.js` | ACTIVE | Referenced by `agent-system/orchestrator.js`, `src/routes/master.js`, `src/routes/editor.js` |
| `agent-system/news-ingest.js` | ACTIVE | Referenced by `routes/intelligence.js`, `lib/cron-scheduler.js`, `lib/observer-health/index.js` |

### 4G — Scripts Directory (Categories K/Q/V)

| File | Description | References | Decision |
|------|-------------|------------|----------|
| `scripts/run-all-tests.js` | Canonical test runner (R10) | `package.json "test"` | RETAIN-ACTIVE |
| `scripts/certify.js` | Deployment certifier | `package.json "certify"`, `render-build` | RETAIN-ACTIVE |
| `scripts/registry-cli.js` | Registry CLI | `package.json "registry"` | RETAIN-ACTIVE |
| `scripts/watcher.js` | File watcher | `ecosystem.config.js` | RETAIN-ACTIVE |
| `scripts/run-pipeline.js` | Pipeline runner | Dev utility | RETAIN-DEV |
| `scripts/session-bridge.js` | HTTP bridge (DEV-ONLY, R5) | None from production | RETAIN-DEV |
| `scripts/smoke-test.js` | Post-deploy smoke test | None from production | RETAIN-DEV |
| `scripts/proof/` (12 files) | Wave 4 verification proofs | None from production | RETAIN-HISTORICAL |
| `scripts/run-c07-http.js` | Phase C0.7 HTTP test | None from production | RETAIN-HISTORICAL |
| `scripts/run-c08-http.js` | Phase C0.8 HTTP test | None from production | RETAIN-HISTORICAL |
| `scripts/verify-c06.js` | Phase C0.6 verifier | None from production | RETAIN-HISTORICAL |
| `scripts/phase1-move-modules.js` | Migration: module boundaries | None from production | RETAIN-HISTORICAL |
| `scripts/phase-a-verify.js` | Phase A verifier | None from production | RETAIN-HISTORICAL |
| `scripts/phase-c-run.js` | Phase C runner | None from production | RETAIN-HISTORICAL |
| `scripts/reflection_agent.js` | **DUPLICATE** of agent-system version | None from production | **DELETED** |
| All other scripts | Dev/maintenance tools | Dev use | RETAIN-DEV |

### 4H — Frontend and Configuration

| File | Decision |
|------|----------|
| `src/components/orb/PlasmaOrb.js` | RETAIN-ACTIVE (referenced by `dashboard.html:20100`) |
| `instrument.js` | RETAIN-ACTIVE (required by `server.js:1` — Sentry instrumentation) |
| `ecosystem.config.js` | RETAIN-ACTIVE (PM2 local config, references `server.js`, `watcher.js`) |
| `migrations/seed-founder-profile.js` | RETAIN-ACTIVE (referenced by `src/routes/setup.js`) |
| `agent-system/supabase-setup.js` | RETAIN-DEV (referenced by `src/routes/setup.js`) |

### 4I — LangChain Packages

| Package | Used by | Decision |
|---------|---------|----------|
| `@langchain/anthropic` | `agent-system/langchain-rag.js` | RETAIN (active importer) |
| `@langchain/community` | `agent-system/langchain-rag.js` | RETAIN |
| `@langchain/core` | `agent-system/langchain-rag.js` | RETAIN |
| `@langchain/textsplitters` | `agent-system/langchain-rag.js` | RETAIN |
| `langchain` | `agent-system/langchain-rag.js` | RETAIN |

Although `langchain-memory.js` was the only file using `@langchain/anthropic` as a standalone client, `langchain-rag.js` also imports from `@langchain/community` and related packages. These packages must not be removed.

### 4J — Git Worktrees (Category U)

| Worktree | Status | On Main? | Decision |
|----------|--------|----------|----------|
| `.claude/worktrees/agent-a51fc597f404c0f3d` | Directory exists, locked | YES (6f40977 is ancestor of main) | STALE-DEV-ARTIFACT — retain for user decision |
| `.clone/worktrees/agent-a383c0016be1e7dd7` | No directory, locked metadata | Unknown | STALE-GIT-METADATA |
| `.clone/worktrees/agent-a80e397fe99e23b0b` | No directory, locked metadata | Unknown | STALE-GIT-METADATA |
| `.clone/worktrees/agent-a82d5be6ece06d273` | No directory, locked metadata | Unknown | STALE-GIT-METADATA |
| `.clone/worktrees/agent-a8bf5a96d0d9a9977` | No directory, locked metadata | Unknown | STALE-GIT-METADATA |
| `.clone/worktrees/agent-aff863809e2e89374` | No directory, locked metadata | Unknown | STALE-GIT-METADATA |

**Classification**: These are Claude Code agent worktree artifacts (dev infrastructure), not APEX production source. R12 scope is source code — worktree cleanup is a separate user operation. CLASSIFIED, not deleted.

### 4K — Documentation Disposition (Phase 3)

All 346 documents from R11 inventory are retained. No documentation deletions in R12.

| Classification | Count | Decision |
|----------------|-------|----------|
| AUTHORITATIVE | 12 | RETAIN-AUTHORITATIVE |
| CERTIFICATION | 185 | RETAIN-CERTIFICATION |
| ARCHITECTURAL | 35 | RETAIN-ARCHITECTURAL |
| OPERATIONAL | 8 | RETAIN-OPERATIONAL |
| HISTORICAL | 30 | RETAIN-HISTORICAL |
| LEGACY/DEPRECATED | 5 | RETAIN-LEGACY |
| DUPLICATES | 0 | — |
| UNKNOWN | 2 | RETAIN-PENDING-CLASSIFICATION |

The 2 UNKNOWN documents (`docs/apex-self-knowledge.md`, `.claude-flow logs`) remain classified as UNKNOWN — insufficient evidence for deletion.

---

## §5 — Disposition Matrix

| File | Category | Action | LOC | Evidence |
|------|----------|--------|-----|----------|
| `agent-system/langchain-memory.js` | I — Orphan module | **DELETED** | 136 | Zero importers (Grep confirms), R9-04 ORPHAN, no dynamic loader, no tests, no startup reference |
| `scripts/reflection_agent.js` | A — Duplicate | **DELETED** | 61 | Binary-identical to `agent-system/reflection_agent.js` (fc /b verified), server.js:239 uses agent-system version, zero importers of scripts version |
| All others | — | RETAINED | — | See §4 |

**Total deleted**: 2 files, 197 LOC  
**Total retained as active**: All other production modules  
**Total retained as historical**: ~20 dev/proof scripts  
**Total retained as deferred**: 17 lib/runtime/ files (PETL-CLUSTER + GOVERNANCE-CLUSTER)

---

## §6 — Deleted Artifacts

### 6A — `agent-system/langchain-memory.js` (136 LOC)

**Purpose**: LangChain-based conversational memory for voice/chat. Used `@langchain/anthropic` ChatAnthropic, `@langchain/core/messages`, and a direct `createClient()` for Supabase.

**Why deleted**:
- Zero production importers (Grep search "langchain-memory" → zero matches outside itself)
- No startup reference
- No test file imports it
- No dynamic loader discovers it (agent-system/ is not glob-loaded)
- R9-04 explicitly classified as ORPHAN
- Also violated R4-DB-01 (direct createClient) — deletion resolves one R4 bypass instance

**What remains active for LangChain**: `agent-system/langchain-rag.js` is the active LangChain module (imported by `routes/intelligence.js:233`, `routes/intelligence.js:444`, `src/routes/telemetry/index.js:201`, `agent-system/memory-retriever.js:241`). LangChain packages are retained.

**What remains for conversational memory**: `lib/memory/gateway.js` is the canonical memory entry point. Chat sessions use the EA runtime path.

### 6B — `scripts/reflection_agent.js` (61 LOC)

**Purpose**: Reflection check runner — identical functionality to `agent-system/reflection_agent.js`.

**Why deleted**:
- Binary-identical to `agent-system/reflection_agent.js` (verified with `fc /b`)
- Both files: 61 lines, same functions, same caller string, same model
- `server.js:239` imports `require("./agent-system/reflection_agent")` — production always used the agent-system version
- `scripts/reflection_agent.js` had zero importers
- Deleting this eliminates the maintenance risk of the two drifting apart

**What remains**: `agent-system/reflection_agent.js` is unchanged and fully operational.

---

## §7 — Retained Artifacts (Key Classifications)

| File/Group | Classification | Reason |
|------------|---------------|--------|
| `runtime/task-router.js` | RETAIN-ACTIVE | Imported by `orchestrator.js:24` and `civilization-runtime.js:231` |
| `civilisation/*.js` | RETAIN-ACTIVE | Imported by `lib/registry/index.js`, `lib/registry/kernel.js`, `lib/registry/context.js` |
| `domains/*/` | RETAIN-ACTIVE | Dynamically loaded by `civilisation/domain-loader.js` → reachable from `lib/registry/` |
| `registry/kernel.js` et al. | RETAIN-SHIM | `registry/kernel.js` referenced by `lib/intelligence/civilization-runtime.js:85`; full shim group retained |
| `agent-system/langchain-rag.js` | RETAIN-ACTIVE | Active LangChain RAG module; 4 production importers |
| `lib/runtime/petl-middleware.js` et al. | RETAIN-DEFERRED | R5 PETL-CLUSTER: INTENTIONALLY DEFERRED, not dead |
| `lib/runtime/governance-manifest.js` et al. | RETAIN-DEFERRED | R5 GOVERNANCE-CLUSTER: built, no production entry point |
| `scripts/proof/*.js` (12) | RETAIN-HISTORICAL | Wave 4 one-time verification proofs; not referenced from production |
| `scripts/run-c07-http.js` | RETAIN-HISTORICAL | Phase C0.7 HTTP test; historical certification artifact |
| `scripts/run-c08-http.js` | RETAIN-HISTORICAL | Phase C0.8 HTTP test; historical certification artifact |
| `scripts/verify-c06.js` | RETAIN-HISTORICAL | Phase C0.6 verifier; historical certification artifact |
| `scripts/phase1-move-modules.js` | RETAIN-HISTORICAL | Module boundary migration script (already executed) |
| `scripts/phase-a-verify.js` | RETAIN-HISTORICAL | Phase A verifier (already executed) |
| `scripts/phase-c-run.js` | RETAIN-HISTORICAL | Phase C runner (already executed) |

---

## §8 — Reclassified Artifacts

None. All classifications from R9/R10/R11 carried forward unchanged.

---

## §9 — Archived Artifacts

None. Git history preserves complete content of deleted files.

---

## §10 — Evidence for Every Deletion

### Deletion 1: `agent-system/langchain-memory.js`

```
Grep tool: pattern="langchain-memory", path=project root, glob="*.js"
Result: No files found (zero matches outside itself)

Prior classification: R9 §3B: "agent-system/langchain-memory.js | ORPHAN |
@langchain/anthropic + direct createClient; zero production importers"

Dynamic loader check:
- _loadAgentRoutes() globs routes/*.js — does NOT cover agent-system/
- civilisation/domain-loader.js dynamically loads domains/ — does NOT cover agent-system/
- agent-library.js loads from apex_agents Supabase table (persona files) — NOT module files
- startup.js setImmediate "agent lib load" loads agentLib.loadAgents() — loads from Supabase table

Test check:
- No test file contains "langchain-memory"

node --check: passes (module is syntactically valid, self-contained)
npm test post-deletion: 1,579 / 1,579 PASS
```

### Deletion 2: `scripts/reflection_agent.js`

```
fc /b scripts/reflection_agent.js agent-system/reflection_agent.js
Result: BINARY IDENTICAL (both 61 lines, same content)

Production importer:
server.js:239: const { runReflectionCheck } = require("./agent-system/reflection_agent");

Grep tool: pattern="reflection_agent", output=content
Result: only self-reference and agent-system/reflection_agent.js and server.js:239

Package.json scripts: no reference to scripts/reflection_agent.js

npm test post-deletion: 1,579 / 1,579 PASS
```

---

## §11 — Unresolved Candidates (Retained)

| Candidate | Why Not Deleted | Action Required |
|-----------|----------------|-----------------|
| Root `registry/` shims (7 files, unused 6/7) | `registry/kernel.js` is referenced; removing partial set creates inconsistency; updating importer is R13 structural work | R13 may consolidate to `lib/registry/` path |
| `scripts/proof/*.js` | Historical development artifacts, no production impact, possible re-run value | None required |
| `scripts/phase*.js` / `scripts/verify-c06.js` | Historical certification artifacts | None required |
| `scripts/run-c07-http.js`, `run-c08-http.js` | Historical HTTP test scripts | None required |
| `.claude/worktrees/agent-a51fc597f404c0f3d/` | Stale dev worktree (commits on main), but cleanup is a user git operation outside R12 source scope | User can run `git worktree remove --force .claude/worktrees/agent-a51fc597f404c0f3d` |
| Stale worktree metadata (5 locked entries) | Missing directories; metadata orphans in `.git/worktrees/`; cleanup via `git worktree prune` | User can run `git worktree prune` |

---

## §12 — Package / Configuration Changes

**No changes to `package.json` or `package-lock.json`.**

`@langchain/anthropic` and related packages remain in `dependencies` because they are actively imported by `agent-system/langchain-rag.js`. Removing `langchain-memory.js` does not make any npm package orphaned.

No npm dependency removals are safe to perform in R12 without a comprehensive runtime dependency trace for all LangChain packages. That analysis belongs to R13.

---

## §13 — Test Results

| Metric | Before R12 | After R12 |
|--------|-----------|-----------|
| Test files | 76 | 76 |
| Tests passing | 1,579 | 1,579 |
| Tests failing | 0 | 0 |
| Test command | `npm test` | `npm test` |

R10 baseline: 1,579 / 1,579 PASS  
R12 result: **1,579 / 1,579 PASS** — no change

---

## §14 — Regression Results

No regressions. Tests run in full after deletions:

```
══════════════════════════════════════════════════════════════
  Total: 1579 passed, 0 failed
══════════════════════════════════════════════════════════════
```

All previously-passing test suites continue to pass including:
- `ea-runtime-unit.test.js` (R10 P1 test)
- `f15-autonomous-boundary.test.js` (R10 P0 test)
- `runtime-integration.test.js` (tests task-router — confirmed still present)
- All 31 registry suite tests
- All constitutional/governance tests

---

## §15 — Falsification Results

### Deletion 1: `agent-system/langchain-memory.js`

| Question | Answer |
|----------|--------|
| Can production still reach it? | NO — zero importers proven |
| Can startup still load it? | NO — not in startup chain |
| Can a route still reference it? | NO — no route imports it |
| Can a registry still reference it? | NO — not in any registry |
| Can a dynamic loader discover it? | NO — no loader covers agent-system/ for module files |
| Can a test still depend on it? | NO — no test file imports it |
| Can a script still call it? | NO — no script references it |
| Can documentation still require it? | NO — R9-04 classified as ORPHAN |
| Does another subsystem implicitly depend? | NO — `langchain-rag.js` (active) does not import it |
| Did removal alter canonical behavior? | NO — 1,579/1,579 PASS |

**Result**: All falsification checks PASS. Deletion validated.

### Deletion 2: `scripts/reflection_agent.js`

| Question | Answer |
|----------|--------|
| Can production still reach it? | NO — server.js uses agent-system version |
| Can startup still load it? | NO — not in startup path |
| Can a route reference it? | NO — no route imports scripts/ files |
| Can a dynamic loader discover it? | NO — no loader globs scripts/ |
| Can a test depend on it? | NO — no test imports it |
| Can a script call it? | NO — zero references outside itself |
| Can documentation require it? | NO — no documentation contract |
| Does another subsystem implicitly depend? | NO — agent-system/reflection_agent.js (binary identical) still present |
| Did removal alter canonical behavior? | NO — 1,579/1,579 PASS |

**Result**: All falsification checks PASS. Deletion validated.

---

## §16 — Production Impact Assessment

**Impact: ZERO**

Neither deleted file was reachable from the production HTTP path. `langchain-memory.js` had no callers and was never loaded at runtime. `scripts/reflection_agent.js` is a scripts-directory utility — not loaded by server.js or any route.

The canonical Supabase client bypass in `langchain-memory.js` (R4-DB-01 pattern — direct `createClient()`) is now eliminated, reducing the count of R4-style bypasses by 1 (from 3 to 2 remaining: R9-01 orchestrator.js, R9-02 master-orchestrator.js; R8-01 governance.js remains).

---

## §17 — Architectural Impact Assessment

**Impact: ZERO**

No architectural relationships changed:
- `langchain-rag.js` continues to be the active LangChain RAG module
- `lib/memory/gateway.js` remains canonical memory entry point
- `agent-system/reflection_agent.js` remains sole reflection agent implementation
- All canonical execution paths (EA runtime, orchestrator, constitutional gate) unchanged
- All 20 open conditions from R11 carried forward unchanged

---

## §18 — File Count Before / After

| Category | Before R12 | After R12 |
|----------|-----------|-----------|
| Total JS files (excl. node_modules, .git, .claude) | 863 | 861 |
| agent-system/ files | 43 | 42 |
| scripts/ files | 53 | 52 |
| LOC removed | — | 197 |
| Confirmed orphans | 1 | 0 |
| Confirmed duplicates | 1 | 0 |
| PETL-CLUSTER deferred | 9 | 9 (unchanged) |
| GOVERNANCE-CLUSTER deferred | 8 | 8 (unchanged) |

---

## §19 — Remaining R-Series Open Conditions

All 20 conditions from R4–R11 are carried forward unchanged. R12 does not resolve or modify any pre-existing condition except:

**Partial reduction**: R4-DB-01 bypass count decreases by 1 (langchain-memory.js used direct createClient() — eliminated). Remaining R4-style bypasses: R9-01, R9-02, R8-01.

| Priority | ID | Description | From | Status |
|----------|----|-------------|------|--------|
| HIGH | R10-PATH-F | chat → handleCommand UNTESTED | R10 | OPEN |
| HIGH | R10-PATH-G | task → runAgentTeam UNTESTED | R10 | OPEN |
| HIGH | R10-PATH-H | agent → memory → tool UNTESTED | R10 | OPEN |
| HIGH | R10-TOOLS | handleCommand/tools UNTESTED | R10 | OPEN |
| MEDIUM | R9-03 | Mastra bypasses EA runtime | R9 | OPEN |
| MEDIUM | R9-05 | AUTONOMY_LEVEL discrepancy | R9 | OPEN |
| MEDIUM | F-15 | autoApproveStandardPermissions startup | R9 | OPEN |
| MEDIUM | R10-PATH-I | background execution UNTESTED | R10 | OPEN |
| MEDIUM | R10-PATH-J | production startup UNTESTED | R10 | OPEN |
| MEDIUM | R10-GOV | governance_records integration gap | R10 | OPEN |
| MEDIUM | R10-BG | 0/11 background paths tested | R10 | OPEN |
| MEDIUM | R7-MEM-01 | Memory layers gateway enforcement | R7 | OPEN |
| MEDIUM | R6-SHADOW-7 | Route shadow collisions | R6 | OPEN |
| LOW | R9-01 | orchestrator direct createClient() | R9 | OPEN |
| LOW | R9-02 | master-orchestrator direct createClient() | R9 | OPEN |
| LOW | R8-01 | governance.js direct createClient() | R8 | OPEN |
| LOW | R9-04 | langchain-memory.js orphan | R9 | **RESOLVED** (deleted R12) |
| LOW | R6-NAMESPACE-1 | Route namespace violation | R6 | OPEN |
| LOW | R6-MEM-01 | Frontend /memory/search unresolved | R6 | OPEN |
| LOW | R7-MEM-02 | Legacy direct memory writes | R7 | OPEN |

**Net: 19 open conditions remain (R9-04 resolved by deletion).**

---

## §20 — Commit Hash

`pending` — to be updated after commit.

---

## §21 — Final Verdict

**CERTIFIED WITH CONDITIONS**

R12 is certified. Two proven artifacts removed. All other candidates are retained with explicit classification. The 19 remaining open conditions are carried forward and documented.

"R12 does not redesign APEX. It removes only artifacts proven obsolete, duplicated, superseded, unreachable, or otherwise safe to remove."
