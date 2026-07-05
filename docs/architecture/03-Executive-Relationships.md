# 03 — Executive Relationships

**Date:** 2026-07-02  
**Evidence Source:** lib/executive/, lib/kernel.js, lib/intelligence/civilization-runtime.js, routes/civilization.js, routes/executive-performance.js

---

## Executive System Overview

The executive system has two distinct layers:

1. **Vault layer** — Specifications in `APEX AI OS/11 Agents/` (140+ specs)
2. **Runtime layer** — Implemented in `lib/executive/` (7 files)

Only the runtime layer has confirmed code relationships. The vault layer specifies intent.

---

## Runtime Executive Council

### lib/executive/executive-council.js

**Consumed by:**
- lib/intelligence/civilization-runtime.js (council, lazy line 113)
- routes/civilization.js (_council(), lazy)

**Internal imports:** UNKNOWN — file contents not read beyond require() grep

### lib/executive/cfo.js

**Status:** CONFIRMED — only executive role file found in lib/executive/

**Note:** CEO, COO, CSO, CGO, CRO, CLO, CHO — no implementation files found. These roles are spec-only in vault (U35–U37 in Unknowns Register).

### lib/executive/domain-memory.js

**Purpose:** Per-executive domain memory storage

**Internal imports:** UNKNOWN

### lib/executive/entity.js

**Purpose:** Executive entity model

**Internal imports:** UNKNOWN

### lib/executive/financial-attention-scorer.js

**Purpose:** Scores financial attention for executive decisions

**Internal imports:** UNKNOWN

### lib/executive/registry.js

**Purpose:** Executive role registry

**Internal imports:** UNKNOWN

### lib/executive/trigger-evaluator.js

**Purpose:** Evaluates when to trigger executive actions

**Internal imports:** UNKNOWN

---

## Kernel Chain (lib/kernel.js)

The kernel chain is the constitutional middleware layer applied to all `/api/` requests.

**Location:** lib/kernel.js  
**Exports:** `{ kernelChain }`

**Imports:**
- `lib/middleware` — resolveIdentity, resolveOwnership
- `lib/agent-file-utils` — checkAuthority, checkGovernance

**Applied at:** server.js:638 — `app.use('/api', ...kernelChain)`

**Purpose:** Identity resolution + authority checking on every API request before route handlers run.

---

## Civilization Kernel (middleware/civilization-kernel.js)

Applied to ALL requests (not just /api/).

**Applied at:** server.js:409 — `app.use(require('./middleware/civilization-kernel'))`

**Internal chain:**
1. Loads execution context (lib/runtime/execution-context)
2. Checks constitutional gate (lib/runtime/constitutional-gate)
3. Consults goal graph (lib/goals/goal-graph)
4. Consults attention engine (lib/attention/attention-engine)
5. Queries memory gateway (lib/memory/gateway)
6. Lazy: autonomy-runtime-controller (cognitive runtime)
7. Lazy: watchdog last assessment (lib/constitution/watchdog)

**Exports single function:** civilizationKernel

---

## Executive Arbitration Engine

**Location:** lib/executive-arbitration-engine.js

**Consumed by:**
- server.js (_eae)
- lib/cognitive-orchestrator.js [lazy, avoids circular — _eaeRef]

**Internal imports:** UNKNOWN

---

## Strategic Planning Engine

**Location:** lib/strategic-planning-engine.js

**Consumed by:**
- server.js (_spe)
- lib/cognitive-orchestrator.js [lazy, avoids circular — _speRef]

**Internal imports:** UNKNOWN

---

## Governance

### lib/governance.js

**Imports:**
- `@supabase/supabase-js` (direct createClient — NOT through lib/clients)
- `crypto` (createHash, randomUUID)
- `os`
- `lib/canonical-json`
- `lib/logger`
- `services/slack/slack-alerts` [lazy]

**Exports:** Large object (module.exports line 974) — exact keys UNKNOWN

**Consumed by:**
- agent-system/orchestrator.js (_gov — used in agent pipeline)
- routes/governance.js [lazy at lines 512, 525, 537]

### routes/governance.js

**Imports:**
- `express`
- `@supabase/supabase-js` (direct createClient)
- `lib/app-auth`
- `lib/governance` [lazy]
- `lib/governance-probe` [lazy]
- `lib/runtime-readiness` (calculateReadiness, lazy)
- `lib/evidence-completeness` (scoreExecution, scoreRecentExecutions, lazy)
- `fs`, `path` [lazy]

**Provides:** Governance health check, probe, readiness, evidence scoring endpoints

---

## Constitution Runtime

### lib/constitution/watchdog.js

**Role:** Constitutional watchdog — runs periodic assessment of system constitutional integrity.

**Imports:**
- `lib/logger`
- `./drift-detector` [lazy]
- `./evolution-manager` [lazy]
- `./crisis-manager` [lazy]
- `./risk-monitor` [lazy]
- `./steward` [lazy]

**Exports:** `{ tick, start, stop, isActive, getLastAssessment, getTickCount }`

**Lifecycle:**
- Started: server.js at listen (watchdog.start())
- Tick interval: 30 minutes (server.js:4521)
- Assessment accessed: middleware/civilization-kernel.js (getLastAssessment, lazy)

### lib/constitution/index.js

**Role:** Constitution module entry  
**Internal imports:** UNKNOWN (file not read beyond grep scan)

---

## Executive Dashboard Relationships

### routes/executive-performance.js

**Imports:**
- `express`
- `lib/app-auth`
- `lib/intelligence/executive-performance-engine` [lazy factory]

**Provides:** Executive KPI and performance endpoints

### routes/civilization.js

**Imports:**
- `express`
- `lib/app-auth`
- `lib/telemetry/aggregator` (computeCivilizationHealth)
- `lib/clients` (getSupabaseClient)
- `lib/intelligence/civilization-health-engine` [lazy]
- `lib/intelligence/global-intelligence-engine` [lazy]
- `lib/intelligence/opportunity-engine` [lazy]
- `lib/executive/executive-council` [lazy]

**Provides:** Civilization cycle endpoints, health dashboard data

---

## Executive Roles — Implementation Status

| Role | File Found | Spec in Vault | Status |
|------|-----------|--------------|--------|
| CFO | `lib/executive/cfo.js` | Yes | PARTIAL — file exists, content UNKNOWN |
| CEO | None found | Yes (vault spec) | SPEC-ONLY (U35) |
| COO | None found | Yes (vault spec) | SPEC-ONLY (U36) |
| CSO | None found | Yes (vault spec) | SPEC-ONLY (U37) |
| CGO | None found | Yes (vault spec) | SPEC-ONLY (U37) |
| CRO | None found | Yes (vault spec) | SPEC-ONLY (U37) |
| CLO | None found | Yes (vault spec) | SPEC-ONLY (U37) |
| CHO | None found | Yes (vault spec) | SPEC-ONLY (U37) |

---

## Ministry System

**Status:** SPEC-ONLY  
**Vault spec:** `APEX AI OS/00 Foundation/ministry-system-spec.md`  
**Runtime file:** None found matching "ministry"  
**Status:** U38 in Unknowns Register
