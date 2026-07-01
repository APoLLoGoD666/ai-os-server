# APEX-REALITY-MODEL.md
## What APEX Actually Is — Evidence-Backed Reality
**Generated:** 2026-06-16 | **Source Corpus:** Phases 30–30E | **Baseline Commit:** f77a36d

---

## SYSTEM IDENTITY

APEX AI OS is a personal AI operating system deployed as a single Node.js/Express monolith on Render. It is the personal operating system for a solo AI founder: task management, autonomous code modification, 12-layer memory, cognitive policy, voice interface, and external integrations. It is not enterprise software. It is not multi-tenant. Its adversarial surface is near-zero because its agent endpoints require authentication and all agent traffic originates from a single trusted operator.

**What code proves it does in production:** Receives authenticated HTTP requests, routes them through Express to 23 route files or inline handlers in server.js, executes autonomous code-modification pipelines via orchestrator.js, persists all state to Supabase Postgres, and self-learns via REFLECTOR → apex_lessons on every completed pipeline run.

Source: ARCHITECTURAL-ATLAS.md §System Identity, §Core Subsystem Inventory

---

## THE ACTUAL ARCHITECTURE

**The monolith:** server.js (~12,300 lines, ~515KB) is the sole HTTP entry point. It loads all 23 route files via `_loadAgentRoutes()` at line 11162-11176, which mounts every file at `/api/` with a single unparameterized string literal — no filename-to-prefix transformation occurs. All startup logic, inline route definitions (~35), auth middleware, and the legacy task agent system live here.

Source: ARCHITECTURAL-ATLAS.md §High-Level Architecture Description; PHASE-30B-EXECUTIVE-CERTIFICATION.md §Basis for Certification (Line 1)

**The 21 route files:** Handle domain logic for chat, agents, memory, governance, cognitive, intelligence, founder, empire, executive, integrations, communications, operations, voice, simulations, and more.

Source: ARCHITECTURAL-ATLAS.md §Core Subsystem Inventory

**The agent pipeline:** orchestrator.js (1739 lines) implements a 6-stage pipeline: RESEARCHER (optional) → ARCHITECT → DEVELOPER → REVIEWER + VALIDATOR (parallel) → TESTER → COMMITTER. Five pre-execution gates run before any stage fires. Entry point: routes/agents.js → runtime/task-router.js → orchestrator.js runAgentTeam().

Source: AGENT-ATLAS.md §Overview, §5 Pre-Execution Gates, §6-Stage Pipeline

**The 12-layer memory:** lib/memory/gateway.js routes all memory writes through a numbered-layer dispatch (layers 0-12, with layer 4 absent). Every write passes through lib/memory/sanitizer.js (10 secret patterns) before persistence. Layers 0 (founder_memory) and 11 (reflexion_records) trigger immutable evidence_blocks audit chains.

Source: MEMORY-ATLAS.md §Architecture Overview, §12 Active Memory Layers, §Gateway Write Flow

**Post-hoc governance:** lib/governance*.js implements evidence chains, certifications, SLOs, policies, incidents, cost accounting, and the governance probe. governance-probe.js runs 10 automated checks. This subsystem has zero calls in orchestrator.js — it observes and audits, it does not gate.

Source: GOVERNANCE-ATLAS.md §Governance Overview; PHASE-30D-FINAL-DECISION.md §Evidence Basis ("Zero gov. calls. Zero require('./governance'). Confirmed by grep.")

---

## WHAT ACTUALLY GOVERNS

Three entities provide actual execution-time oversight, in order of their position in the pipeline:

**TESTER** (`node --check` per modified JS file) is the only deterministic gate in the pipeline. It has no model involved, no JSON parsing, no exception bypass. A syntax error stops TESTER unconditionally. Limitation: it catches syntax errors only; runtime errors (MODULE_NOT_FOUND, type errors, logic bugs) are invisible to it.

Source: AGENT-ATLAS.md §Stage 5: TESTER; ARCHITECTURAL-ATLAS.md §Key Architectural Findings #7

**REVIEWER** (Claude model) is the last semantic gate before commit. It runs OWASP Top 10, STRIDE threat modeling, spec correctness, error handling, HTTP status codes, raw secrets check, async/try-catch coverage, and duplicate route detection on every file the DEVELOPER produced. If REVIEWER returns `passed:false`, pipeline stops and retries. REVIEWER is the final cognitive evaluation before any code reaches git.

Known weakness: if the Claude response fails to parse, orchestrator.js:559 catches the exception and defaults to `{passed:true, issues:[]}` — a model API failure becomes an auto-approval.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #6, PHASE-30E-FINAL-DECISION.md §Single Point of Failure

**VALIDATOR** (Claude model, parallel with REVIEWER) verifies ARCHITECT-defined test cases against DEVELOPER output. It is a hard gate when test cases are present and `failedCases` is non-empty. Known weakness: when `passed:false` but `failedCases:[]`, the dispatch gate at orchestrator.js:1528 requires both conditions (`!passed AND failedCases.length > 0`) and the empty array causes the gate to not fire, allowing the pipeline to continue to TESTER and COMMITTER.

Source: PHASE-30C-FINAL-DECISION.md §Defect 1; PHASE-30D-FINAL-DECISION.md §Evidence Basis

---

## WHAT ACTUALLY DECIDES

The orchestrator pipeline (orchestrator.js runAgentTeam()) is the authority. Specifically:

- The pipeline is gate-negative: each gate blocks or allows-by-default. No entity grants positive forward permission.
- The 5 pre-execution gates check constitutional constraints, autonomy level (cognitive evaluation, not AUTONOMY_LEVEL env var), digital twin simulation results, deployment policy hold state, and behavioral modification constraints.
- For simple/moderate/complex tasks with `deploymentPolicy=auto` (the majority of runs), the only semantic gate is REVIEWER. The CTO gate does not fire for these complexity tiers.
- For critical tasks, the CTO gate fires in addition — but its exception is swallowed at orchestrator.js:1585 (fail-open).
- TESTER and COMMITTER are deterministic and non-bypassable via model failure (though COMMITTER has git-level bypass paths like "nothing to commit").

Source: PHASE-30E-AUTHORITY-MAP.md §Complete Authority Chain — Stage Table, §The 10 Required Questions #10

---

## WHAT ACTUALLY COMMITS

`_committer()` at orchestrator.js:662, called unconditionally at orchestrator.js:1602 when the retry loop exits without a hard stop. It executes:

1. `git add -A` (stages all changes including VALIDATOR-failed code if gap triggered)
2. `git commit -m [task description]`
3. `git pull --rebase` (syncs to remote HEAD)
4. `git merge --no-ff` (merges branch into main)
5. `git push` (pushes to GitHub)
6. Render deploy API POST (triggers production deployment)

_committer() reads no validator state. There is no human approval step. There is no governance call. There is no approval request. It executes as the Node.js process identity on the Render server. A smoke tester fires 90 seconds after deploy but logs a lesson only — it cannot roll back.

Source: PHASE-30D-BLIND-SPOT-ASSESSMENT.md §Question 2; PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #5, #7

---

## WHAT ACTUALLY LEARNS

REFLECTOR runs after successful pipeline completion via `setImmediate` (fire-and-forget, cannot stop anything). It uses Claude Haiku to extract a lesson, then calls `obsidian-memory.js logLesson()` → `gateway.storeMemory(layer:10)` → INSERT apex_lessons with `task_id` AND `trace_id` (both required, per BD-01 fix).

Governance probe check 7 (`lesson_traceability_bd01`) verifies that apex_lessons rows carry both fields. The memory consolidation queue (`memory_consolidation_queue`, migration 009) queues entries for promotion across layers (e.g., episodic → semantic). Cognitive crons run Sunday 9-11am UTC when `COGNITIVE_CRONS_ENABLED=true`.

Source: AGENT-ATLAS.md §Post-Pipeline: REFLECTOR; MEMORY-ATLAS.md §Trace ID Handling (BD-01 Fix), §Memory Consolidation Queue; GOVERNANCE-ATLAS.md §Governance Probe (Check 7)

---

## WHAT ACTUALLY EVOLVES

The cognitive evolution subsystem uses `cognitive_policy_settings` and `cognitive_evolution_proposals` tables. The engine writes data correctly. However, the read-back API defined in routes/cognitive-evolution.js is unreachable from its documented paths.

All 15 routes in cognitive-evolution.js define paths like `/attribution/impact`, `/twin/accuracy`, `/policies`, `/benchmark/run` — none include the `/cognitive-evolution` prefix in their definitions. Because `_loadAgentRoutes()` mounts every file uniformly at `/api/`, these routes resolve as `/api/attribution/impact`, `/api/twin/accuracy`, etc. — not `/api/cognitive-evolution/attribution/impact` as the inline comments claim.

Any caller referencing `/api/cognitive-evolution/*` receives a 404. The cognitive evolution subsystem is "broken in silence" — data flows in, the control surface is unreachable from the intended interface.

Source: PHASE-30B-EXECUTIVE-CERTIFICATION.md §Basis for Certification (all three lines of evidence); DEAD-CODE-ATLAS.md §Definitively Dead Artifacts #3

---

## WHAT ACTUALLY SCALES

The 12-layer memory architecture with VECTOR(768) embeddings in episodic_memory and vault_embeddings (migration 002 corrected the initial 1536 dimension). Three SQL vector search functions (migration 009) enable cosine similarity search on episodic_memory. The Postgres-backed event spine (migrations 024, 026) provides an atomic outbox write procedure (`write_outbox_with_state()`). Working memory has a `UNIQUE(session_id, memory_type)` constraint (migration 025) preventing duplicate session entries.

Source: MEMORY-ATLAS.md §Vector Embedding Tables; ARCHITECTURAL-ATLAS.md §Key Architectural Characteristics

---

## WHAT ACTUALLY BREAKS

**The REVIEWER parse bypass (orchestrator.js:559):** When the Claude model returns a response that fails JSON parsing, the catch block defaults to `{passed:true, issues:[]}`. Model failure equals auto-approval. This is the single point of failure in the authority chain.

**The VALIDATOR empty-failedCases gap (orchestrator.js:1528):** The AND condition `(!passed && failedCases.length > 0)` allows `{passed:false, failedCases:[]}` through to COMMITTER. Code the VALIDATOR concluded was wrong can reach production with no alert, no retry, no incident.

**The cognitive-evolution route defect:** All 15 routes in routes/cognitive-evolution.js are unreachable from their documented paths. The cognitive evolution control surface is effectively inaccessible.

**Three per-request Supabase clients:** routes/governance.js (lines 12-14), routes/integrations.js (line 122-123), and one server.js inline handler each call `createClient()` on every request, bypassing the singleton in lib/clients.js and leaking connections.

**Login timing vulnerability:** POST /api/login uses `password !== DASHBOARD_PASSWORD` (plain string inequality) instead of `crypto.timingSafeEqual()`, enabling a timing side-channel attack to enumerate the password.

Source: PHASE-30E-FINAL-DECISION.md §Single Point of Failure; PHASE-30C-FINAL-DECISION.md §Defect 1; PHASE-30B-EXECUTIVE-CERTIFICATION.md; ARCHITECTURAL-ATLAS.md §Critical Risks; AUTHENTICATION-ATLAS.md §Login Endpoint Vulnerability

---

## WHAT APPEARS IMPORTANT BUT IS NOT

**The governance library during execution:** lib/governance*.js has zero calls in orchestrator.js. Zero `gov.` calls, zero `require('./governance')`, zero `issueCertification`, `appendEvidenceBlock`, or `createIncident` calls confirmed across 1739 lines of orchestrator.js. Governance observes completed runs via audit tables — it does not gate them.

Source: PHASE-30D-FINAL-DECISION.md §Evidence Basis; PHASE-30D-BLIND-SPOT-ASSESSMENT.md §Question 1

**The AUTONOMY_LEVEL env var in the orchestrator context:** `process.env.AUTONOMY_LEVEL` (server.js line 544) controls the legacy task agent system (server.js `shouldAutoRunTaskAction`, `canAutoRunLevel3Action`). The orchestrator pipeline uses cognitive autonomy evaluation from `ctx.runtimeControls`, built from the cognitive stack. The two systems are parallel and independent.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #9 ("Autonomy Level")

**The CTO gate for non-critical tasks:** For simple, moderate, and complex tasks with `deploymentPolicy=auto`, the CTO gate never fires. The CTO is a critical-task-only reviewer.

Source: PHASE-30E-AUTHORITY-MAP.md §Complexity Routing Effect on Authority

---

## WHAT APPEARS SECONDARY BUT IS CRITICAL

**TESTER (node --check):** The only deterministic gate in the entire pipeline. No model, no JSON parsing, no exception bypass. Syntax-broken code unconditionally cannot pass. It is the last non-bypassable gate before COMMITTER.

**REVIEWER (Claude model):** Despite appearing to be one gate among many, REVIEWER is the actual last semantic gate. For the majority of pipeline runs, REVIEWER's `passed:true` is the signal that authorizes production deployment.

**sanitizer.js:** The only injection defense on the hot path. Applied on every `pgAddMemory` call (WS-6A fix). Without it, every memory write would be a potential credential exposure vector. Its gaps (no OpenAI keys, no Supabase service role keys, no DB connection strings, no PEM blocks) are the actual coverage boundary for memory security.

Source: PRODUCTION-ATLAS.md §Memory Security Status; PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #6; MEMORY-ATLAS.md §Sanitizer Details
