# 11 — Architectural Contradictions

**Date:** 2026-07-02  
**Mode:** Certification — Evidence-only. No solutions recommended.

---

## Purpose

This document records every confirmed contradiction between architectural intent (documentation, naming, structure) and actual implementation. No solutions are proposed.

---

## Contradiction C01 — memory-governor Enforces No Governance

**Claim (by naming and positioning):** `lib/memory/memory-governor.js` is described as and named as a "governor" — implying quota, rate, or access enforcement.

**Implementation reality:** The module exports only utility functions: ID generation, metadata building, content hashing, lifecycle state machine helpers, support accumulation, contradiction recording, competency derivation. Zero quota enforcement. Zero rate limiting. Zero write blocking.

**Evidence:** Phase 2.2 direct read of memory-governor.js: "ZERO quota enforcement. Zero rate limiting."

**Contradiction severity:** HIGH — the name creates a false confidence that memory writes are bounded.

---

## Contradiction C02 — checkGovernance Does Not Check or Enforce Governance

**Claim (by naming and position in kernelChain):** `checkGovernance` is Gate 4 of kernelChain, positioned as a governance verification gate on all `/api/*` requests.

**Implementation reality:** From Phase 2.2: "`checkGovernance` (Gate 4): ALWAYS calls next()" — unconditionally, regardless of governance state, standing approvals, or any other factor.

**Evidence:** `lib/agent-file-utils.js checkGovernance` confirmed to always call next().

**Contradiction severity:** CRITICAL — the governance gate that all `/api/*` requests pass through is permanently open. It provides governance security theater.

---

## Contradiction C03 — Governance Evidence Chain Has Undetectable Gaps

**Claim (by implementation of SHA-256 linking):** The governance evidence chain uses blockchain-style SHA-256 hash linking, implying tamper-evident, complete audit records.

**Implementation reality:** All writes use `_w(fn)` — fire-and-forget with error swallowing. A failed write creates a gap in the chain. No verification of chain continuity runs at runtime. A chain with gaps is structurally identical to a complete chain unless specifically audited.

**Evidence:** `lib/governance.js _w()`: `fn().catch(err => logger.error(...))` — all writes.

**Contradiction severity:** HIGH — the evidence chain implies immutability and completeness; the implementation provides neither.

---

## Contradiction C04 — reflexion-tracker Records Null Decision Links

**Claim (by function name and purpose):** `reflexion-tracker.recordInfluence()` records which decisions influenced which outcomes — creating a traceable audit trail.

**Implementation reality:** Bug in `recordInfluence()` — queries `decision_memory` for column `'id'` (PK is `'memory_id'`). `decisionMemoryId` is always null. All reflexion records have broken links.

**Evidence:** Phase 2.2: "BUG: `recordInfluence()` queries `decision_memory` for column `'id'` (PK is `'memory_id'`) — `decisionMemoryId` always null."

**Contradiction severity:** MEDIUM — the reflexion system appears functional but produces unusable audit data.

---

## Contradiction C05 — procedural-memory findProcedure Has Dead Semantic Search

**Claim (by code structure):** `procedural-memory.findProcedure()` has a semantic search path that implies vector-based procedure retrieval.

**Implementation reality:** The semantic query is built at line ~124 but never executed. All calls fall through to ILIKE text search.

**Evidence:** Phase 2.2: "findProcedure() semantic path is DEAD CODE (query built, never executed); always falls to keyword ILIKE."

**Contradiction severity:** LOW — procedure retrieval still works via ILIKE; semantic retrieval just never works.

---

## Contradiction C06 — Telemetry Aggregator Computes But Does Not Write Health Scores

**Claim (by function name):** `lib/telemetry/aggregator.js computeCivilizationHealth()` computes civilization health and implies persistence of those scores.

**Implementation reality:** Snapshot write is intentionally DISABLED in the code (DATA-5 comment). The computation runs but produces no persistent record. `/health` reads stale snapshots from a table that this aggregator does not update.

**Evidence:** Phase 2.2: "snapshot write intentionally DISABLED (DATA-5 comment)."

**Contradiction severity:** MEDIUM — dashboard health display reflects stale data. The computation is correct but its output is discarded.

---

## Contradiction C07 — executive-arbitration-engine Arbitrates Threads, Not Tasks

**Claim (by name and positioning alongside executive council):** `lib/executive-arbitration-engine.js` appears to arbitrate executive decisions or agent task assignments.

**Implementation reality:** The engine manages **cognitive threads** — persistent session focus objects. It does not participate in agent task assignment, executive council deliberation, or any decision-gate path. It is a session focus manager that happens to use executive naming conventions.

**Evidence:** Phase 2.2: "This module does NOT arbitrate agent tasks. It arbitrates cognitive threads — persistent session focus objects that represent ongoing work across multiple interactions."

**Contradiction severity:** MEDIUM — naming misrepresents the module's role.

---

## Contradiction C08 — cognitive-orchestrator Does Not Orchestrate

**Claim (by name):** `lib/cognitive-orchestrator.js` appears to orchestrate cognitive processes, pipeline stages, or agent coordination.

**Implementation reality:** The module performs response shaping only — it classifies intent (via regex + length rules) and prepends acknowledgment strings to already-produced LLM output. No orchestration of pipelines, agents, or cognitive processes occurs.

**Evidence:** Phase 2.2: "This module is NOT a pipeline orchestrator and does NOT control which agents run. It shapes the final text of LLM responses."

**Contradiction severity:** MEDIUM — creates false impression of centralized cognitive orchestration.

---

## Contradiction C09 — Strategic Planning Engine Produces No Persistent State

**Claim (by name and role description):** `lib/strategic-planning-engine.js` implies persistent strategic plans that inform ongoing system behavior.

**Implementation reality:** Pure in-memory Maps. Zero database writes. State is lost on every process restart. All objectives expire in 2 hours even within a session.

**Evidence:** Phase 2.2: "Zero database interaction. All state in process memory. State is lost on process restart."

**Contradiction severity:** HIGH — "strategic planning" implies durable, cross-session planning. The implementation is session-scoped ephemeral state.

---

## Contradiction C10 — BYPASS_DASHBOARD_AUTH "Blocked in Production"

**Claim (by comment/documentation):** The BYPASS_DASHBOARD_AUTH bypass is described as "blocked in production."

**Implementation reality:** The guard is `process.env.NODE_ENV !== 'production'`. NODE_ENV is an operator-controlled environment variable. On Render, NODE_ENV could be set to any value. "Blocked in production" relies entirely on operator discipline, not on any enforcement mechanism.

**Evidence:** `lib/middleware.js`: `if (process.env.BYPASS_DASHBOARD_AUTH === 'true' && process.env.NODE_ENV !== 'production')`

**Contradiction severity:** MEDIUM — creates false confidence about production security.

---

## Contradiction C11 — lib/write-with-outbox.js Exists But Is Never Called

**Claim (by CONSTITUTION.md description):** `lib/write-with-outbox.js` is described as the canonical atomic write mechanism for outbox-pattern writes.

**Implementation reality:** 0 confirmed production consumers in grep across all .js files. The module creates a Supabase client at load time and exports `writeWithOutbox` that is never called.

**Evidence:** Phase 2.1: "grep result: 0 confirmed production consumers."

**Contradiction severity:** MEDIUM — the intended canonical write mechanism is unused. Direct Supabase writes are used instead, bypassing the outbox pattern.

---

## Contradiction C12 — entities.js /merge-queue Is Registered But Never Reached

**Claim (by route registration):** `routes/entities.js` registers a `/merge-queue` endpoint.

**Implementation reality:** `/merge-queue` is registered AFTER `/:id`. Express first-match routing means `/entities/merge-queue` is matched by `/:id` with `req.params.id = 'merge-queue'`. The merge-queue handler never executes.

**Evidence:** Phase 2.2: "BUG: `/merge-queue` registered after `/:id` — Express first-match makes it unreachable."

**Contradiction severity:** LOW — feature is silently non-functional.

---

## Contradiction C13 — Goal Graph and Goal Tracker Are Separate Goal Systems

**Claim (by naming similarity):** `lib/goals/goal-graph.js` and `agent-system/goal-tracker.js` both manage "goals" and appear to be parts of the same system.

**Implementation reality:** These are completely independent systems with different schemas, different storage (Supabase single row vs filesystem JSON), and no synchronization. An agent task's goal in goal-tracker has no relationship to a strategic goal in goal-graph.

**Evidence:** Phase 2.2: "These are two distinct goal systems... They do NOT share state."

**Contradiction severity:** HIGH — two goal systems create ambiguity about what "current goals" means at any point in time.

---

## Contradiction C14 — episodic-memory-pg.js getSuccessRate Reads Wrong Table

**Claim (by function name):** `getSuccessRate()` in `lib/memory/episodic-memory-pg.js` returns the episodic memory success rate.

**Implementation reality:** The function queries `apex_agent_runs`, not `episodic_memory`. It returns agent run success rate, not episodic memory write success rate.

**Evidence:** Phase 2.2: "BUG: `getSuccessRate()` reads `apex_agent_runs` (not `episodic_memory`). The function returns statistics about agent runs, not episodic memory episodes."

**Contradiction severity:** MEDIUM — callers expecting episodic success metrics receive agent run metrics.

---

## Contradiction C15 — Health Check Reports Sentry Status Without Confirming Initialization

**Claim (by /health response):** `sentry: !!process.env.SENTRY_DSN` implies Sentry is active when DSN is set.

**Implementation reality:** This is a DSN presence check only. No `Sentry.init()` call was confirmed in any file read. Sentry SDK import not confirmed.

**Evidence:** Phase 2.2: "Sentry SDK initialization not confirmed in files read; DSN check implies conditional setup" (UR08).

**Contradiction severity:** LOW — health check implies Sentry is active when it may not be initialized.

---

## Contradiction C16 — constitution/index.js Exports 60+ Modules, Not 6

**Claim (Phase 2.1 documentation):** Phase 2.1 assumed constitution/index.js contained approximately 6 constitution files.

**Implementation reality:** constitution/index.js barrel re-exports 60+ sub-modules.

**Evidence:** Phase 2.2: "constitution/index.js — barrel re-exports 60+ sub-modules."

**Contradiction severity:** INFORMATIONAL — Phase 2.1 documentation error, not an implementation contradiction. The system is larger than previously documented.

---

## Contradiction Summary Table

| ID | Contradiction | Severity |
|----|--------------|---------|
| C01 | memory-governor enforces no governance | HIGH |
| C02 | checkGovernance never blocks | CRITICAL |
| C03 | Evidence chain has undetectable gaps | HIGH |
| C04 | reflexion-tracker always records null links | MEDIUM |
| C05 | procedural semantic search is dead code | LOW |
| C06 | Telemetry aggregator doesn't write health scores | MEDIUM |
| C07 | Arbitration engine manages threads, not tasks | MEDIUM |
| C08 | cognitive-orchestrator doesn't orchestrate | MEDIUM |
| C09 | Strategic planning is ephemeral (not persistent) | HIGH |
| C10 | BYPASS_DASHBOARD_AUTH protection is operator-dependent | MEDIUM |
| C11 | write-with-outbox.js has no consumers | MEDIUM |
| C12 | /merge-queue endpoint is unreachable | LOW |
| C13 | Two independent goal systems with no sync | HIGH |
| C14 | getSuccessRate reads wrong table | MEDIUM |
| C15 | /health implies Sentry active without confirmation | LOW |
| C16 | constitution/index.js has 60+ modules not ~6 | INFORMATIONAL |
