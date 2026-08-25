# R13 — Structural Refinement Certification

**Programme**: APEX R-Series Refinement  
**Task**: R13 — Structural Refinement  
**Status**: CERTIFIED WITH CONDITIONS  
**Certified**: 2026-08-25  
**Commit**: pending  
**Predecessor**: R12-OBSOLETE-DUPLICATE-REMOVAL-CERTIFICATION.md (commits 778b1bc / 30013c4)

---

## §1 — Authority

R13 is authorised by the APEX R-Series Refinement Programme following completion of R12. R13's mandate is to improve structural quality of the canonical repository — directory coherence, module placement, layering clarity, import direction — without changing production behaviour.

**Governing principle**: ONE PLATFORM. ONE SYSTEM. ONE APEX.

---

## §2 — Baseline Commit

| Item | Value |
|------|-------|
| HEAD at R13 start | `30013c4` (R12 hash-patch) |
| Branch | main |
| Working tree at start | clean |
| Pre-R13 test result | 1,579 / 1,579 PASS |
| Canonical server | `server.js` (R5 proven) |
| Canonical startup | `lib/startup.js` (R5 proven) |
| Canonical runtime | `lib/models/runtime/index.js` (R9 proven) |
| Canonical memory | `lib/memory/gateway.js` (R7 proven) |
| Constitutional authority | `middleware/civilization-kernel.js` → `lib/runtime/constitutional-gate.js` (R8 proven) |

---

## §3 — R13 Commit

`pending` — to be updated after commit.

---

## §4 — Date

2026-08-25

---

## §5 — Scope

R13 performs a structural audit of 700+ source JavaScript files across all directories. The audit covers all 26 structural dimensions (A–Z) specified in the R13 mandate. Only safe, traceable structural changes with zero production-behaviour impact are implemented.

---

## §6 — Pre-R13 Metrics

| Metric | Value |
|--------|-------|
| Tests passing | 1,579 |
| Tests failing | 0 |
| JS files (excl. node_modules, .git, .claude) | 861 |
| Confirmed orphans | 0 (resolved R12) |
| Confirmed duplicates | 0 (resolved R12) |
| Reversed layering instances (lib→routes) | 2 |
| Registry shim indirections (single-hop) | 1 |
| Circular dep workarounds (lazy require) | 1 |

---

## §7 — Structural Audit Methodology

Every structural dimension (A–Z from the R13 mandate) was audited using:
- Grep-based importer mapping for each candidate
- Node.js `require()` resolution analysis (relative path tracing)
- Cross-reference with R1–R12 certification findings
- Classification before action (R13-A/B/C/D/E/F)

No file was modified without first tracing all importers and confirming the change would not alter runtime resolution.

---

## §8 — Complete Finding Register

### 8A — Directory Structure

| Finding | Path | Classification | Action |
|---------|------|----------------|--------|
| Root `civilisation/` is active utility library | `civilisation/` | R13-D INTENTIONAL | RETAIN — imported by `lib/registry/` |
| Root `domains/` is dynamically loaded | `domains/` | R13-D INTENTIONAL | RETAIN — loaded by `civilisation/domain-loader.js` |
| Root `registry/` contains shims to `lib/registry/` | `registry/` | R13-B CONTROLLED | PARTIAL FIX — see §8E |
| Root `runtime/` contains `task-router.js` | `runtime/task-router.js` | R13-D INTENTIONAL | RETAIN — imported by `agent-system/orchestrator.js:24` |
| `lib/pwa/` missing canonical push sender | `lib/pwa/` | R13-A SAFE | FIXED — created `lib/pwa/push.js` |

### 8B — Module Placement

| Finding | Classification | Action |
|---------|----------------|--------|
| `_sendPush` function defined in `routes/pwa.js` | R13-A SAFE IMPROVEMENT | FIXED — extracted to `lib/pwa/push.js` |
| `syncGoogleCalendar` defined in `routes/communications.js` | R13-B CONTROLLED | DEFERRED — requires moving `getGCalClient` + R4 bypass fix |
| `voiceState` exported from `routes/intelligence.js` | R13-B CONTROLLED | DEFERRED — shared state; extraction is complex |
| `langchain-rag.js` in `agent-system/` (vs `lib/`) | R13-D INTENTIONAL | RETAIN — agent-system is its canonical home |

### 8C — Import / Export Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| `routes/pwa.js` exported `sendPush` as side-channel on router | R13-A SAFE | FIXED — `sendPush` now canonical in `lib/pwa/push.js` |
| `routes/pwa.js` imported by `lib/pwa/notification-scheduler.js` (reversed) | R13-A SAFE | FIXED — `notification-scheduler.js` now imports from `./push` |
| Lazy `require()` in `notification-scheduler.js` with comment "avoid circular deps" | R13-A SAFE | FIXED — circular dep eliminated, lazy require removed |
| `routes/intelligence.js` exports `voiceState` as side-channel on router | R13-B CONTROLLED | DEFERRED — would require extracting shared state module |
| `routes/communications.js` exports `syncGoogleCalendar` as side-channel | R13-B CONTROLLED | DEFERRED — complex dependency chain |

### 8D — Layering

| Finding | Path | Classification | Action |
|---------|------|----------------|--------|
| `lib/pwa/notification-scheduler.js` → `routes/pwa.js` (lib→routes) | lib/pwa/ → routes/ | R13-A SAFE | FIXED — reversed layering eliminated |
| `routes/briefing.js` → `routes/pwa.js.sendPush` (route→route side-channel) | routes/ → routes/ | R13-A SAFE | FIXED — now routes/briefing → lib/pwa/push |
| `lib/cron-scheduler.js` → `routes/communications.js` (lib→routes) | lib/ → routes/ | R13-B CONTROLLED | DEFERRED — `syncGoogleCalendar` extraction is a separate operation |
| `src/routes/health.js` → `routes/intelligence.js` (route→route) | src/routes/ → routes/ | R13-B CONTROLLED | DEFERRED — `voiceState` is shared state requiring its own module |
| `src/routes/telemetry/index.js` → `routes/intelligence.js` (route→route) | src/routes/ → routes/ | R13-B CONTROLLED | DEFERRED — same voiceState issue |
| `lib/` → `agent-system/` (multiple files) | lib/ → agent-system/ | R13-D INTENTIONAL | RETAIN — lib/ orchestration utilities legitimately use agent-system; intentional design |

### 8E — Registry Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| Root `registry/kernel.js` shim: single-hop indirection via `civilization-runtime.js` | R13-A SAFE | FIXED — civilization-runtime now imports `lib/registry/kernel` directly |
| Root `registry/kernel.js` shim: still used by all `domains/*/index.js` (13+ importers) | R13-D INTENTIONAL | RETAIN — shim serves domains/ interface |
| Root `registry/engine.js`, `constraints.js`, `events.js`, `health-score.js`, `relationships.js`, `state-version.js`: used by `civilisation/` | R13-D INTENTIONAL | RETAIN — shims serve civilisation/ interface |
| Root `registry/index.js`: no direct importers found | R13-E HISTORICAL | RETAIN — safety net for future callers |
| Full consolidation of root `registry/` → `lib/registry/`: would require updating 20+ files in `domains/` and `civilisation/` | R13-C OUT OF SCOPE | DEFERRED — large-scale path update; R14+ territory |

### 8F — Startup Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| Production startup path verified intact | R13-D INTENTIONAL | No change |
| `server.js` → `lib/startup.js` → 6 background runtimes | R13-D INTENTIONAL | No change |
| F-15 `autoApproveStandardPermissions` at startup | R13-D INTENTIONAL | Documented condition, no structural change |

### 8G — Server Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| `server.js` is sole production HTTP server | R13-D INTENTIONAL | INVARIANT 01 — verified |
| `scripts/session-bridge.js` is DEV-ONLY (R5) | R13-E HISTORICAL | No change |

### 8H — Route Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| All routes under `routes/` and `src/routes/` properly sub-prefixed | R13-D INTENTIONAL | No change |
| R6-SHADOW-7 (7 alpha-order shadow collisions) open | R13-E carry-forward | DEFERRED — R14 or beyond |
| R6-NAMESPACE-1 (namespace violation) open | R13-E carry-forward | DEFERRED |

### 8I — Runtime Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| PETL-CLUSTER (9 files): intentionally unwired | R13-D INTENTIONAL | No change |
| GOVERNANCE-CLUSTER (8 files): built, no production entry | R13-D INTENTIONAL | No change |
| All other runtime files: R5 classifications preserved | R13-D INTENTIONAL | No change |

### 8J — Memory Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| `lib/memory/gateway.js` is sole canonical entry | R13-D INTENTIONAL | INVARIANT 05 — verified |
| 13 memory layers intact | R13-D INTENTIONAL | No change |

### 8K — Database Client Ownership

| Finding | Classification | Action |
|---------|----------------|--------|
| R9-01, R9-02, R8-01, R4-DB-01: direct createClient() bypasses | R13-C BEHAVIOURAL | DEFERRED — ownership conditions, not structural change |
| `lib/clients.getSupabaseClient()` is canonical | R13-D INTENTIONAL | No change |
| `lib/pwa/push.js` (new): uses canonical `getSupabaseClient()` | R13-A SAFE | FIXED — new module follows canonical pattern |

### 8L — Constitutional / Governance Boundaries

| Finding | Classification | Action |
|---------|----------------|--------|
| constitutional-gate.js is fail-CLOSED (R8 verified) | R13-D INTENTIONAL | INVARIANT 03 — preserved |
| constitutional-store.js is sole writer | R13-D INTENTIONAL | INVARIANT 04 — preserved |
| Governance is OBSERVATIONAL (R8 design) | R13-D INTENTIONAL | No change |

### 8M — AI / Agent Boundaries

| Finding | Classification | Action |
|---------|----------------|--------|
| `lib/models/runtime/index.js` is canonical AI execution authority | R13-D INTENTIONAL | INVARIANT 11 — preserved |
| Mastra bypasses EA runtime (R9-03) | R13-C BEHAVIOURAL | DEFERRED — architectural condition |
| AUTONOMY_LEVEL discrepancy (R9-05) | R13-C BEHAVIOURAL | DEFERRED — operational verification required |

### 8N — Tool Boundaries

| Finding | Classification | Action |
|---------|----------------|--------|
| `lib/apex-tools.js` + `lib/agent-command-handler.js` are canonical tool handlers | R13-D INTENTIONAL | No change |
| Tool execution path intact: `/chat → handleCommand → tools` | R13-D INTENTIONAL | INVARIANT 11 — preserved |

### 8O — Background Execution

| Finding | Classification | Action |
|---------|----------------|--------|
| 6 background runtimes + 5 cron jobs (R5) | R13-D INTENTIONAL | No change |
| 11 background paths (R9) | R13-D INTENTIONAL | No change |

### 8P — Test Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| `npm test` is canonical test command (R10) | R13-D INTENTIONAL | INVARIANT 13 — preserved |
| 76 test files, 1,579 tests | R13-D INTENTIONAL | No change |
| Critical path tests still gap (R10 conditions) | R13-E carry-forward | DEFERRED |

### 8Q — Script Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| `scripts/proof/`, `scripts/phase*.js`, `scripts/run-c0*.js` | R13-E HISTORICAL | RETAIN — no change |
| `scripts/run-all-tests.js` | R13-D INTENTIONAL (R10) | No change |

### 8R — Configuration Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| `ecosystem.config.js`: PM2 local config | R13-D INTENTIONAL | No change |
| `package.json`: canonical scripts defined | R13-D INTENTIONAL | No change |

### 8S — Naming Consistency

| Finding | Classification | Action |
|---------|----------------|--------|
| `civilisation` (British) vs `civilization` (American) spelling mix | R13-D INTENTIONAL | RETAIN — historical naming, changing all references is large-scale R14+ work |
| `_sendPush` (underscore prefix) in routes vs `sendPush` in lib | R13-A SAFE | FIXED — `lib/pwa/push.js` exports clean `sendPush` |

### 8T — Documentation Structure

| Finding | Classification | Action |
|---------|----------------|--------|
| `APEX-CANONICAL-SYSTEM.md` is canonical reference (R11) | R13-D INTENTIONAL | Needs update post-R13 for new structural finding |

### 8U — Shims / Adapters

| Finding | Classification | Action |
|---------|----------------|--------|
| Root `registry/` shims: 8 files | See §8E | PARTIAL — civilization-runtime fix reduces one indirection |
| Root `registry/kernel.js` still needed by domains/ | R13-D INTENTIONAL | RETAIN |

### 8V — Legacy Boundaries

| Finding | Classification | Action |
|---------|----------------|--------|
| All R12 legacy/historical classifications preserved | R13-E HISTORICAL | No change |

### 8W — Public vs Internal Modules

| Finding | Classification | Action |
|---------|----------------|--------|
| `lib/pwa/push.js` (new): exports `{ sendPush }` as clean public API | R13-A SAFE | IMPLEMENTED |
| Routes previously exposed internal functions via `module.exports.sendPush` | R13-A SAFE | FIXED |

### 8X — Circular / Reversed Layering

| Finding | Path | Classification | Action |
|---------|------|----------------|--------|
| `lib/pwa/notification-scheduler.js` → `routes/pwa.js` | lib → routes | R13-A SAFE | **FIXED** |
| `routes/briefing.js` → `routes/pwa.js.sendPush` | route→route side-channel | R13-A SAFE | **FIXED** |
| `lib/cron-scheduler.js` → `routes/communications.js` | lib → routes | R13-B CONTROLLED | DEFERRED |
| `src/routes/health.js` → `routes/intelligence.js` | route→route | R13-B CONTROLLED | DEFERRED |
| `src/routes/telemetry/index.js` → `routes/intelligence.js` | route→route | R13-B CONTROLLED | DEFERRED |

### 8Y — Duplicated Responsibilities

| Finding | Classification | Action |
|---------|----------------|--------|
| `_sendPush` duplicated between `routes/pwa.js` (old) and `lib/pwa/push.js` (new) | R13-A SAFE | FIXED — old copy removed, single canonical copy in lib/ |
| No other confirmed responsibility duplication found | — | — |

### 8Z — High-Coupling / High-Blast-Radius Modules

| Module | Coupling | R13 Action |
|--------|---------|------------|
| `lib/models/runtime/index.js` | HIGH (R9: circuit breaker, all AI calls) | R13-D — preserve as-is |
| `middleware/civilization-kernel.js` | HIGH (all production requests) | R13-D — preserve as-is |
| `lib/memory/gateway.js` | HIGH (all memory operations) | R13-D — preserve as-is |
| `lib/agent-command-handler.js` | HIGH (all tool dispatch) | R13-D — preserve as-is |
| `server.js` | HIGHEST (HTTP authority) | R13-D — preserve as-is |

---

## §9 — Changes Made

### Change 1 — Registry Shim De-indirection

**File**: `lib/intelligence/civilization-runtime.js` (line 85)  
**Before**: `const { Registry } = require('../../registry/kernel');`  
**After**: `const { Registry } = require('../registry/kernel');`

**Effect**: `civilization-runtime.js` now imports `lib/registry/kernel.js` directly instead of going through the root `registry/kernel.js` shim. The shim remains in place for `domains/` importers.

**Risk**: ZERO — same module is returned (shim was a single-line re-export).

---

### Change 2 — `sendPush` Extracted to Canonical Module

**Files created**: `lib/pwa/push.js` (54 LOC)  
**Files modified**: `routes/pwa.js`, `lib/pwa/notification-scheduler.js`, `routes/briefing.js`

**Before**:
```
routes/pwa.js                  — defined _sendPush (53 LOC)
                               — exported module.exports.sendPush
lib/pwa/notification-scheduler.js — lazy require('../../routes/pwa').sendPush (reversed layering)
routes/briefing.js             — lazy require('./pwa').sendPush (route→route side-channel)
```

**After**:
```
lib/pwa/push.js                — defines sendPush (canonical location, 54 LOC)
routes/pwa.js                  — imports { sendPush: _sendPush } from ../lib/pwa/push
lib/pwa/notification-scheduler.js — imports { sendPush } from ./push (direct, no lazy)
routes/briefing.js             — imports { sendPush } from ../lib/pwa/push (proper direction)
```

**Effect**:
- Reversed layering `lib/pwa/notification-scheduler.js → routes/pwa.js` eliminated
- Route→route side-channel `routes/briefing.js → routes/pwa.js` eliminated
- Lazy-require workaround (circular dep avoidance) eliminated
- `sendPush` has a canonical home in `lib/pwa/` where it belongs
- `routes/pwa.js` is now purely a route handler (no exported service functions)

**Behaviour unchanged**: Same `sendPush` function, same logic, same call sites.

---

## §10 — Files Changed

| File | Change |
|------|--------|
| `lib/intelligence/civilization-runtime.js` | 1-line path fix: `../../registry/kernel` → `../registry/kernel` |
| `lib/pwa/push.js` | NEW — extracted `sendPush` function (canonical home) |
| `routes/pwa.js` | Import from `lib/pwa/push`; remove 53-LOC `_sendPush` definition; remove side-channel export |
| `lib/pwa/notification-scheduler.js` | Direct import from `./push`; remove lazy-require wrapper |
| `routes/briefing.js` | Import `sendPush` from `../lib/pwa/push` |
| `architecture/index.yaml` | Auto-generated timestamp update (not R13 work) |

---

## §11 — Files Moved

None. No files were moved in R13.

---

## §12 — Files Removed

None. No files were removed in R13.

---

## §13 — Files Added

| File | Purpose |
|------|---------|
| `lib/pwa/push.js` | Canonical `sendPush` WebPush sender extracted from routes/pwa.js |

---

## §14 — Deferred Findings

| ID | Finding | Why Deferred |
|----|---------|-------------|
| R13-D1 | `lib/cron-scheduler.js` → `routes/communications.js` (lib→routes) | `syncGoogleCalendar` depends on `getGCalClient` which has its own deps + R4 bypass. Extraction requires multiple-function migration. R14+ |
| R13-D2 | `src/routes/health.js` → `routes/intelligence.js` (voiceState) | `voiceState` is shared mutable state in a route; extracting requires a new shared-state module. R14+ |
| R13-D3 | `src/routes/telemetry/index.js` → `routes/intelligence.js` (voiceState) | Same as R13-D2 |
| R13-D4 | Root `registry/` shim full consolidation | Would require updating 20+ files in `domains/` and `civilisation/`. Large-scale structural work. R14+ |
| R13-D5 | `civilisation`/`civilization` naming inconsistency | Changing all references across the codebase is a large-scale rename. R14+ |
| R13-D6 | R6-SHADOW-7 route shadow collisions | Route structure concern from R6; R14+ |
| R13-D7 | R6-NAMESPACE-1 route namespace violation | R14+ |

---

## §15 — Out-of-Scope Findings (R13-C)

| Finding | Reason Out of Scope |
|---------|---------------------|
| R9-03: Mastra bypasses EA runtime | Architectural/behavioural; not R13 structural work |
| R9-05: AUTONOMY_LEVEL discrepancy | Operational verification; not structural |
| R10 critical path test gaps (PATH-F through J) | Test creation, not structural refinement |
| R8-01, R9-01, R9-02: direct createClient() bypasses | Database ownership conditions; behavioural change if fixed |
| F-15: autoApproveStandardPermissions | Operational boundary; not structural |
| PETL wiring | R5 explicitly deferred; cannot wire in R13 |

---

## §16 — Structural Invariants

| # | Invariant | Status |
|---|-----------|--------|
| 01 | One canonical production server | PASS — `server.js` sole HTTP server |
| 02 | One canonical startup authority | PASS — `lib/startup.js` unchanged |
| 03 | One constitutional authority | PASS — `constitutional-gate.js` unchanged |
| 04 | One constitutional store writer | PASS — `constitutional-store.js` unchanged |
| 05 | One canonical memory gateway | PASS — `lib/memory/gateway.js` unchanged |
| 06 | No production PETL mount | PASS — PETL remains unwired |
| 07 | No parallel runtime authority | PASS — EA runtime unchanged |
| 08 | No newly introduced database bypass | PASS — `lib/pwa/push.js` uses canonical `getSupabaseClient()` |
| 09 | No newly introduced route duplication | PASS — no new routes added |
| 10 | No newly introduced circular dependency | PASS — circular dep ELIMINATED, not introduced |
| 11 | Canonical AI execution path intact | PASS — `lib/models/runtime/index.js` unchanged |
| 12 | Canonical task execution path intact | PASS — orchestrator unchanged |
| 13 | `npm test` remains canonical regression command | PASS — unchanged |
| 14 | No known production component becomes UNKNOWN | PASS — all components remain classified |
| 15 | No certification finding silently deleted | PASS — all 19 open conditions carried forward |

All 15 structural invariants: **PASS**

---

## §17 — Test Results

| Metric | Before R13 | After R13 |
|--------|-----------|-----------|
| Tests passing | 1,579 | 1,579 |
| Tests failing | 0 | 0 |
| Test files | 76 | 76 |
| Regressions | 0 | 0 |

```
══════════════════════════════════════════════════════════════
  Total: 1579 passed, 0 failed
══════════════════════════════════════════════════════════════
```

---

## §18 — Falsification Results

| Question | Answer |
|----------|--------|
| Did any production import path change unexpectedly? | NO — only 3 files updated, all as planned |
| Did any canonical export disappear? | NO — `sendPush` is now in `lib/pwa/push.js`; `routes/pwa.js.sendPush` was NOT a documented canonical export |
| Did any route registration change? | NO — all routes identical |
| Did any startup path change? | NO — startup chain untouched |
| Did any runtime authority change? | NO — EA runtime unchanged |
| Did memory routing change? | NO — gateway unchanged |
| Did constitutional authority change? | NO — civilization-kernel unchanged |
| Did governance semantics change? | NO — governance unchanged |
| Did AI execution routing change? | NO — models/runtime unchanged |
| Did agent orchestration change? | NO — orchestrator unchanged |
| Did tool execution change? | NO — apex-tools, agent-command-handler unchanged |
| Did background execution change? | NO — all background runtimes unchanged |
| Did test discovery change? | NO — test files unchanged |
| Did any previously active module become unreachable? | NO — all confirmed active |
| Did any canonical module gain an unintended dependency? | NO — `lib/pwa/push.js` only adds `lib/clients` (canonical) |

All 15 falsification checks: **PASS**

---

## §19 — Production Impact Assessment

**Impact: ZERO**

The two structural changes made:
1. `civilization-runtime.js` path fix: the `Registry` object returned is byte-for-byte identical whether loaded via the shim or directly. The shim was a transparent re-export.
2. `sendPush` extraction: same function, same logic, same call sites. Production WebPush behaviour is unchanged.

---

## §20 — Architectural Impact Assessment

**Positive improvements**:
- Reversed layering (`lib/pwa/notification-scheduler.js → routes/pwa.js`) eliminated
- Route→route side-channel (`routes/briefing.js → routes/pwa.js`) eliminated
- One circular-dep workaround (lazy require with comment) eliminated
- `lib/pwa/` module boundary is now coherent: icon-generator, notification-scheduler, push — all purely lib utilities
- `routes/pwa.js` is now purely a route handler; no service function exports
- `civilization-runtime.js` now has a direct, legible import path to the registry kernel

---

## §21 — Remaining Open Conditions

All 19 conditions from R12 are carried forward. 0 resolved in R13.

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
| LOW | R6-NAMESPACE-1 | Route namespace violation | R6 | OPEN |
| LOW | R6-MEM-01 | Frontend /memory/search unresolved | R6 | OPEN |
| LOW | R7-MEM-02 | Legacy direct memory writes | R7 | OPEN |

**New R13 deferred items (not conditions)**: R13-D1 through R13-D7 (see §14).

---

## §22 — Exact Next Authorised Task

R14 — FULL REGRESSION

IMPORTANT: DO NOT BEGIN R14 AUTOMATICALLY.
