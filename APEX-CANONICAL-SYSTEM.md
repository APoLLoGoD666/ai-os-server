# APEX — Canonical System Reference

**Version**: R16 (2026-08-25)  
**Certified by**: R-Series Refinement Programme R0–R15  
**Governing principle**: ONE PLATFORM. ONE SYSTEM. ONE APEX.

This document is the single authoritative entry point for understanding the APEX AI OS.
It supersedes all prior system description documents as the canonical reference.
It describes **what actually exists and is verified** — not what is planned or aspirational.

> **Read this first.** For certification evidence, see `APEX-CERTIFICATION-INDEX.md`.  
> For the complete test suite, run `npm test`.

---

## §1 — What is APEX

APEX is a Render-hosted Node.js / Express AI Operating System. It is a single-server application that:

- Receives HTTP and WebSocket requests from a dashboard UI.
- Routes requests through a constitutional governance kernel before execution.
- Invokes AI models (Anthropic Claude, Google Gemini) through a canonical Execution Authority runtime.
- Stores memory, documents, and constitutional records in Supabase Postgres.
- Orchestrates autonomous multi-stage agent pipelines on user-triggered tasks.
- Enforces constitutional and governance rules on every production request.

**What APEX is not**: A microservices system. A multi-server system. APEX is one platform, one production HTTP server, one canonical runtime.

---

## §2 — Production Baseline

| Item | Value |
|------|-------|
| Production service | ai-os-server |
| Production deployment | Render (web service) |
| Production database | Supabase Postgres |
| Production storage | Supabase Storage |
| Production HTTP server | `server.js` (sole authority — R5 verified) |
| Production port | `process.env.PORT` (Render-assigned) |
| Certified production commit | `d087c19` (Wave 4 architecture) |
| Current repository HEAD | `2658a05` (R15 — post-Wave 4 refinements) |
| R-Series complete | R0 through R15 |

> **CRITICAL DISTINCTION**: `d087c19` is the certified production baseline. Repository HEAD `2658a05` includes R-series refinements (R0–R15) that are **not yet confirmed as deployed to production**. Do not treat repository state as production state unless explicitly verified.

---

## §3 — How APEX Starts

Verified production startup path (R5):

```
1. node server.js
   │
   ├─ services/init.js (required pre-server)
   │    └─ lib/outbox-relay.start()           [5s setInterval]
   │
   ├─ lib/startup.js wireEvents(deps)         [event bus wiring, before listen]
   │
   └─ lib/startup.js onListen(deps)           [called inside server.listen callback]
        ├─ lib/models/runtime/subscriber.activate()   [immediate]
        ├─ lib/integrity-crons.start()                [60s tick]
        ├─ lib/event-consumer.start()                 [10s tick]
        ├─ setTimeout(60s)  → lib/governance-probe.runProbe()
        ├─ setTimeout(300s) → agent-system/mastra_agents.initMastra()
        └─ 5× setImmediate → deploy event, schema check, adaptation cleanup,
                              task recovery, agent lib load
```

**Server authority**: `server.js` is the SOLE canonical production HTTP server. `scripts/session-bridge.js` also creates an HTTP server but is DEV-ONLY, not reached from production. (R5-verified)

---

## §4 — Canonical Execution Path

Every production HTTP request flows through this path:

```
POST /endpoint (any route)
    │
    ├─ requireAppAccess (auth middleware)
    │   └─ validates APP_KEY / JWT token
    │
    ├─ civilization-kernel.js (7-phase middleware chain)
    │   ├─ Phase 1: execution-context.js (req.apex context, 10 blocks)
    │   ├─ Phase 2: identity check
    │   ├─ Phase 3: ownership check
    │   ├─ Phase 4: constitutional gate (6-check verification)
    │   │           └─ fail-CLOSED: failed gate = denied request
    │   ├─ Phase 5: execution evaluation
    │   ├─ Phase 6: telemetry / observability
    │   └─ Phase 7: governance record write (OBSERVATIONAL — not hard-blocking)
    │
    └─ route handler → lib/models/runtime.execute()
```

**The canonical AI execution sub-path** (POST /chat):
```
civilization-kernel chain
    │
    └─ lib/models/runtime.execute({ tier, messages, tools: TOOLS })
        │
        ├─ TIER_ROUTING: tier → model ID (registry.js)
        ├─ per-model circuit breaker (5 failures → open, 60s backoff)
        ├─ 90s timeout, 3 retries
        ├─ _emit() telemetry
        ├─ gov.appendEvidenceBlock() → governance_records (fire-and-forget)
        ├─ feedbackEngine.process() (fire-and-forget)
        │
        └─ tool_use response → handleCommand()  [agent-command-handler.js]
```

**Constitutional gate** (R8-verified):
- 6 checks applied in sequence.
- Any failure → request **denied** (fail-CLOSED).
- Timeout (default 5s) → request **denied** (fail-CLOSED).
- Gate is NOT advisory — it is enforcing.

**Governance** (R8-verified):
- `governance_records` writes are OBSERVATIONAL — they record but do not block.
- Hard blocking lives exclusively in the constitutional gate (Phase 4).
- Do not confuse `checkGovernance` (observational) with the constitutional gate (enforcing).

---

## §5 — Canonical Memory Path

Verified R7 architecture:

```
ALL MEMORY WRITES AND READS
    │
    └─ lib/memory/gateway.js  (SINGLE CANONICAL ENTRY POINT)
        │
        ├─ lib/memory/index.js  (namespace/layer router)
        │
        └─ 13 Memory Layers:
            Layer 0  — Working memory (active task context)
            Layer 1  — Short-term memory
            Layer 2  — Episodic memory
            Layer 3  — Semantic memory
            Layer 4  — Procedural memory
            Layer 5  — Conceptual memory
            Layer 6  — Relational memory
            Layer 7  — Temporal memory
            Layer 8  — Emotional/affective memory
            Layer 9  — Governance evidence (P23-audited)
            Layer 10 — Long-term reflective memory
            Layer 11 — Constitutional memory (P23-audited)
            Layer 12 — Archival memory

Database: lib/clients.getSupabaseClient() → Supabase Postgres
```

**Intentional direct/admin paths** (R7 classified, not violations):
- `lib/models/runtime/subscriber.js` — event-driven activation, pre-gateway
- `lib/reality/` — reality projection reads (SELECT only)

**Legacy paths** (R7 classified):
- Direct `memory` table writes from pre-gateway code — still operational, not removed
- `agent-system/obsidian-memory.js` — Obsidian vault JSON files (operational data, not semantic memory)

**MEM-01** (R7 open finding): Not all 13 memory layers have been fully verified as exclusively using the canonical gateway path. Gateway is canonical; complete enforcement of all 13 layers through gateway is DEFERRED.

---

## §6 — Canonical Database

Verified R4 architecture:

| Client | Location | Scope |
|--------|----------|-------|
| **Canonical Supabase client** | `lib/clients.getSupabaseClient()` | All standard DB access |
| **Specialised pg client** | `pg_database.js` | Long-running queries, raw SQL, migrations |
| **REMOVED** | `lib/pg_helpers.js` | Renamed to `lib/supabase-helpers.js` in R4 |

**Rules**:
- All new code must use `getSupabaseClient()` from `lib/clients.js`.
- Do NOT use direct `createClient()` calls in new code.
- `pg_database.js` is for specialised queries only (not general application use).

**Known R4-deferred bypasses** (LOW severity, not violations — same env vars, fire-and-forget):
- R9-01: `agent-system/orchestrator.js` direct `createClient()`
- R9-02: `agent-system/master-orchestrator.js` direct `createClient()`
- R8-01: `lib/governance.js` direct `createClient()`

These are documented findings, not approved patterns for new code.

**Key tables**:
- `constitutional_records` — single writer: `lib/runtime/constitutional-store.js` ONLY
- `governance_records` — single writer: `civilization-kernel._writeGateRecord()` ONLY
- `apex_tasks`, `apex_events`, `apex_outbox` — multi-writer (controlled)
- `apex_notifications` — multi-writer (agent output + autoApprove reader)

---

## §7 — Canonical AI Path

Verified R9 architecture:

```
ALL AI MODEL INVOCATIONS
    │
    └─ lib/models/runtime/index.js  (Execution Authority — EA runtime)
        │
        ├─ execute({ tier, caller, messages, ... })   [canonical — EA resolves model]
        ├─ execute({ client, model, ... })             [legacy bridge — still supported]
        ├─ stream({ ... })                             [streaming variant]
        └─ voice({ ... })                              [voice variant]
```

**TIER_ROUTING** (canonical model selection):

| Tier | Model |
|------|-------|
| `fast` | claude-haiku-4-5-20251001 |
| `balanced` / `moderate` / `complex` | claude-sonnet-4-6 |
| `powerful` / `critical` | claude-opus-4-7 |
| `voice` | claude-haiku-4-5-20251001 (then Gemini for audio) |

**Active AI providers**:

| Provider | Status | Path |
|----------|--------|------|
| Anthropic Claude | ACTIVE | EA runtime (`lib/models/runtime`) |
| Google Gemini 2.5 Flash | ACTIVE | Voice only (`gemini-2.5-flash` via `lib/models/providers/google`) |
| OpenAI GPT-4o | STUB — NOT IMPLEMENTED | `_stub: true` in registry |
| OpenRouter | STUB — NOT IMPLEMENTED | Reference only |

**Exception — Mastra agents bypass EA runtime** (R9-03, MEDIUM, DEFERRED):
- `agent-system/mastra_agents.js` uses `@ai-sdk/anthropic` directly.
- This bypasses circuit breaker, governance evidence recording, EA telemetry.
- Status: OPEN finding, not yet resolved.

---

## §8 — Canonical Agents

Verified R9 — five distinct agent namespaces (LAYERED, not duplicates):

| Namespace | File | Purpose |
|-----------|------|---------|
| **agent-registry** | `lib/agent-registry.js` | Capability metadata store |
| **agent-library** | `lib/agent-library.js` | 150+ external personas (GitHub-synced, stored in `apex_agents`) |
| **mastra_agents** | `agent-system/mastra_agents.js` | 6 Mastra framework agents (deferred 300s at startup) |
| **domain-agents** | `agent-system/domain-agents.js` | 7 runtime-invocable agents (EA canonical path) |
| **agents.js** | `lib/agents.js` | UI profile objects |

**Canonical task orchestrator**: `agent-system/orchestrator.js` → `runAgentTeam()`

**Pipeline stages** (runAgentTeam, 8 stages):
```
RESEARCHER → ARCHITECT → DEVELOPER → REVIEWER → VALIDATOR → TESTER → COMMITTER → REFLECTOR
```

Each stage is a function within a single process, not a separate process.

**COMMITTER stage side effects** (autonomy level 3):
- Git commit + push to GitHub
- Render API deploy trigger (`RENDER_API_KEY` + `RENDER_SERVICE_ID`)

**REFLECTOR stage**:
- `gateway.storeMemory({ layer: 10, ... })` — canonical EA memory path

**Autonomy Level** (R9-05, MEDIUM, OPEN):
- `server.js` defaults AUTONOMY_LEVEL to `"1"`
- `civilization-kernel.js` defaults AUTONOMY_LEVEL to `3`
- Resolved only if `process.env.AUTONOMY_LEVEL` is explicitly set in Render
- **Ops verification required**: confirm Render env var is explicitly set

**F-15 — Autonomous startup path** (OPEN, partially verified R10):
- `server.js` calls `autoApproveStandardPermissions()` at startup
- This reads `apex_notifications` for pending permission requests
- If a standing DB approval exists for a "safe" reason, it calls `runFeatureWithPermission()` → `runAgentTeam()`
- Safety boundary: `BLOCK_PATTERNS` exclude oauth, linkedin, crisis, clinical, plaid
- Without DB access, function returns early (safe by default)

---

## §9 — Canonical Tools

Verified R9:

**Canonical tool execution path**:
```
POST /chat (civilization-kernel authenticated)
    │
    └─ runtime.execute({ tools: TOOLS })
        │
        └─ tool_use response
            │
            └─ handleCommand()  [lib/agent-command-handler.js]
                │
                └─ dispatches to specific tool implementation
```

**21 native chat tools** (defined in `src/routes/chat.js` TOOLS constant):
Invoked via Anthropic native `tool_use` mechanism.

**20 Mastra tools** (defined in `agent-system/mastra_agents.js`):
Created via `@mastra/core/agent createTool()`. All delegate to `handleCommand()`.

**Total tools**: 41 (21 native + 20 Mastra).

> **Coverage gap (R10)**: `handleCommand()` has zero behavioral tests. Tool invocation path (PATH F) is untested.

---

## §10 — Constitutional Authority

Verified R8:

**Constitutional specification**: `lib/constitution/spec.js`
- 23 principles across 7 categories (AUTHORITY, PRIVACY, CERTIFICATION, LEARNING, HEALTH, IDENTITY, GOVERNANCE)
- `verifyAll()` and `snapshotFingerprints()` exported

**Constitutional gate**: `lib/runtime/constitutional-gate.js`
- 6 checks applied to every request
- Fail-CLOSED: failed check → request DENIED
- Timeout → request DENIED
- NOT advisory — this is the enforcement point

**Constitutional store**: `lib/runtime/constitutional-store.js`
- SOLE writer to `constitutional_records` table
- All writes are fire-and-forget (async, no-throw)
- Used by all Wave 4 bootstraps and constitutional type creation

**Wave 4 bootstraps** (all BOOTSTRAPPED as of d087c19):

| Bootstrap | File | Status |
|-----------|------|--------|
| RT-04 (Audit) | `lib/civilization/rt04-bootstrap.js` | BOOTSTRAPPED |
| RT-11 (Reflection) | `lib/civilization/rt11-bootstrap.js` | BOOTSTRAPPED |
| RT-12 (Amendment) | `lib/civilization/rt12-bootstrap.js` | BOOTSTRAPPED |
| RT-13 (Action Projection) | `lib/civilization/rt13-bootstrap.js` | BOOTSTRAPPED |
| RT-14 (Reflection trigger) | `lib/civilization/rt14-bootstrap.js` | BOOTSTRAPPED |
| RT-16 (Amendment) | `lib/civilization/rt16-bootstrap.js` | BOOTSTRAPPED |
| DOM-000001 | `lib/civilization/dom000001-bootstrap.js` | BOOTSTRAPPED |

**BOOTSTRAPPED** means: one-time setup records written to `constitutional_records`. It does NOT mean the operational runtime is active. Operational deployment of these runtimes is DEFERRED.

**PETL** (Policy Execution Transaction Layer):
- 9 files in `lib/runtime/` classified PETL-CLUSTER
- `petl-middleware.js` defines `petlGate` and `petlErrorHandler`
- **CONFIRMED UNWIRED** — zero `require()` calls from any production entry point (R5-verified)
- Status: INTENTIONALLY DEFERRED — built for future mount, not dead code

---

## §11 — Background Execution

Verified R5/R9 — 11 background execution paths:

| Component | Mechanism | Period | Gate |
|-----------|-----------|--------|------|
| `lib/outbox-relay.js` | setInterval | 5s | Always on |
| `lib/event-consumer.js` | setInterval | 10s | Always on |
| `lib/integrity-crons.js` | setInterval | 60s | Always on |
| `lib/governance-probe.js` | setTimeout one-shot | 60s delay | Always |
| `lib/models/runtime/subscriber.js` | event listeners | on-event | Always on |
| `agent-system/mastra_agents.js` | setTimeout init | 300s delay | Always |
| `agent-system/email_agent.js` | setInterval | 5 min | `GMAIL_ENABLED=true` |
| `agent-system/routine_agent.js` | setInterval | 60s + 24h | Always on |
| `agent-system/langchain-rag.js` | setInterval | 30 min | `.unref()` (non-blocking) |
| Orchestrator metrics | setInterval | (per config) | Always on |
| Constitutional watchdog | setInterval | 30 min | Always on |

> **Coverage gap (R10)**: 0/11 background paths have behavioral tests.

**Cron jobs** (via `lib/integrity-crons.js`, persisted in `apex_sync_checkpoints`):

| Job | Interval |
|-----|----------|
| `integrity_backup` | 24h |
| `integrity_reconcile` | 7d |
| `domain_scorer` | 24h |
| `admission_engine` | 7d |
| `consolidation_engine` | 1h |

---

## §12 — Routes and API

Verified R6:

- **Route authority**: `server.js` registers all routes
- **Dynamic loader**: `_loadAgentRoutes()` flat-mounts route files under `/`
- **Total route files**: 27+ (see R6 certification for complete list)
- **Rule**: Every route file under `routes/` must use an internal sub-prefix matching its filename to prevent collision

**Known R6 findings** (OPEN):
- 7 alpha-order shadow collisions (route files where ordering causes shadowing)
- 1 namespace violation
- 1 unresolved frontend call (`/memory/search` — MEM-01)

**Auth boundary**: `requireAppAccess` middleware protects all agent/task/memory routes. WebSocket auth uses timing-safe comparison.

> **Coverage gap (R10)**: No HTTP route integration tests exist.

---

## §13 — Testing

Verified R10:

| Metric | Value |
|--------|-------|
| Total test files | 76 |
| Total tests | 1,579 |
| Passing | 1,579 |
| Failing | 0 |
| Canonical command | `npm test` |

**CRITICAL**: 1,579/1,579 PASS does NOT mean all APEX behaviour is verified.

Critical path coverage:

| Path | Status |
|------|--------|
| A (HTTP → gate → response) | PARTIALLY TESTED |
| B (Memory gateway → DB) | PARTIALLY TESTED |
| C (Constitutional store) | MEANINGFULLY TESTED |
| D (Governance records) | STRUCTURAL ONLY |
| E (EA runtime) | PARTIALLY TESTED |
| F (Chat → handleCommand) | **UNTESTED** |
| G (Task → runAgentTeam) | **UNTESTED** |
| H (Agent → memory → tool) | **UNTESTED** |
| I (Background → runtime) | **UNTESTED** |
| J (Production startup) | **UNTESTED** |

Deployment certification gate: `npm run certify` → 5/5 clauses PASS.

See `R10-TEST-CONSOLIDATION-CERTIFICATION.md` for full test inventory.

---

## §14 — What is Legacy

| Component | Status | Notes |
|-----------|--------|-------|
| `runtime/task-router.js` | LEGACY | Pre-Wave-4 task routing. Still operational. Not canonical EA runtime. |
| `lib/pg_helpers.js` | REMOVED (R4) | Renamed to `lib/supabase-helpers.js` |
| `agent-system/langchain-memory.js` | ORPHAN | Zero production importers. Uses `@langchain/anthropic` direct. R9-04. |
| `data/memory.json` | LEGACY | Local JSON fallback. Not primary memory store. |
| Architecture A memory (pre-R7) | LEGACY-ACTIVE | Direct `memory` table writes. Still operational alongside gateway. |
| `lib/models/runtime` legacy `{client, model}` contract | LEGACY-SUPPORTED | Still accepted by EA runtime. Bridge active through Phase 4. |

---

## §15 — What is Planned / Deferred

**PLANNED — NOT YET IMPLEMENTED**:

### Knowledge Gap System

Intended future pipeline:
```
OBSERVATION → KNOWLEDGE → EVIDENCE → IDENTIFIED GAP
    → RETRIEVAL/ACQUISITION → VALIDATION
    → MEMORY/KNOWLEDGE → REASONING
```

No files implementing this system exist yet. This is a future architectural goal.

### Observability Interface

Intended future interface exposing:
- System state, runtime activity, nodes, events, requests
- Memory, evidence, decisions, governance, actions
- Knowledge gaps, background activity, failures, provenance

Not yet implemented. Current observability is limited to logs, governance_records, and constitutional_records.

### PETL (Policy Execution Transaction Layer)

9 files built (`lib/runtime/petl-*.js`). Mount point planned. **INTENTIONALLY DEFERRED** — not dead, not production-mounted.

### Wave 4 Operational Runtimes

RT-04, RT-11, RT-12, RT-13, RT-14, RT-16, DOM-000001: BOOTSTRAPPED (setup records written). Operational execution: DEFERRED.

### Multi-agent Roles (from CLAUDE.md)

Planned roles: System Agent, File Agent, Uni Agent, Finance Agent, Business Agent. Foundation exists via domain agents and Mastra. Full role separation: PLANNED.

---

## §16 — Open Findings Register

From R4–R10 certification records. Do not treat as resolved unless explicitly updated in a subsequent R-series certification.

| ID | Finding | Severity | Status |
|----|---------|---------|--------|
| R4-DB-01 | Remaining direct createClient() calls post-R4 | LOW | DEFERRED |
| R5-SHUTDOWN | outbox-relay/integrity-crons not explicitly stopped on SIGTERM | LOW | ADEQUATE (within Render 30s window) |
| R6-SHADOW-7 | 7 alpha-order shadow route collisions | MEDIUM | OPEN |
| R6-NAMESPACE-1 | 1 namespace violation in route files | LOW | OPEN |
| R6-MEM-01 | Frontend calls /memory/search (unresolved) | LOW | OPEN |
| R7-MEM-01 | Not all 13 memory layers fully gateway-enforced | MEDIUM | DEFERRED |
| R7-MEM-02 | Legacy direct memory writes still operational | LOW | INTENTIONAL |
| R8-01 | lib/governance.js direct createClient() (R4-bypass) | LOW | DEFERRED |
| R9-01 | agent-system/orchestrator.js direct createClient() | LOW | DEFERRED |
| R9-02 | agent-system/master-orchestrator.js direct createClient() | LOW | DEFERRED |
| R9-03 | Mastra agents bypass EA runtime (@ai-sdk/anthropic) | MEDIUM | OPEN |
| R9-04 | langchain-memory.js zero production importers (orphan) | LOW | DEFERRED |
| R9-05 | AUTONOMY_LEVEL discrepancy: server.js="1" vs civilization-kernel.js=3 | MEDIUM | OPS VERIFICATION REQUIRED |
| F-15 | autoApproveStandardPermissions() can trigger runAgentTeam() at startup | MEDIUM | PARTIALLY VERIFIED (R10) |
| R10-PATH-F | chat → handleCommand: UNTESTED | HIGH | DEFERRED to R11+ |
| R10-PATH-G | task → runAgentTeam: UNTESTED | HIGH | DEFERRED |
| R10-PATH-H | agent → memory → tool: UNTESTED | HIGH | DEFERRED |
| R10-PATH-I | background → runtime: UNTESTED | MEDIUM | DEFERRED |
| R10-PATH-J | production startup: UNTESTED | MEDIUM | DEFERRED |
| R10-GOV | governance_records integration test missing | MEDIUM | DEFERRED |
| R10-BG | background execution 0/11 paths tested | MEDIUM | DEFERRED |

---

## §17 — Terminology

| Term | Definition |
|------|-----------|
| **APEX** | The APEX AI OS — this single Render-hosted Node/Express application |
| **civilization-kernel** | The 7-phase request middleware chain (`middleware/civilization-kernel.js`) |
| **constitutional gate** | Phase 4 of civilization-kernel; 6-check, fail-CLOSED enforcement (`lib/runtime/constitutional-gate.js`) |
| **constitutional store** | Sole writer to `constitutional_records` (`lib/runtime/constitutional-store.js`) |
| **EA runtime** | Execution Authority — `lib/models/runtime/index.js`; sole admission point for all model invocations |
| **execution context** | `req.apex` context object built by `lib/runtime/execution-context.js`; 10 named blocks per request |
| **governance** | OBSERVATIONAL evidence recording to `governance_records` via `lib/governance.js` |
| **governance_records** | Supabase table; OBSERVATIONAL, not enforcing; sole writer: civilization-kernel._writeGateRecord() |
| **constitutional_records** | Supabase table; constitutional evidence store; sole writer: constitutional-store.write() |
| **memory gateway** | `lib/memory/gateway.js` — canonical single entry for all memory operations |
| **runAgentTeam** | 8-stage autonomous pipeline in `agent-system/orchestrator.js` |
| **master-orchestrator** | Outer feature planner; calls runAgentTeam for execution |
| **cognitive-orchestrator** | Response shaper only (`lib/cognitive-orchestrator.js`); NOT an agent runner |
| **Mastra** | `@mastra/core` framework; 6 agents using `@ai-sdk/anthropic` — bypasses EA runtime |
| **domain agent** | One of 7 named agents in `agent-system/domain-agents.js`; uses EA runtime canonically |
| **PETL** | Policy Execution Transaction Layer — 9 built files, INTENTIONALLY UNWIRED in production |
| **RT-xx** | Constitutional Runtime specification (Wave 4 architecture) — e.g. RT-04, RT-11, RT-12 |
| **R-Series** | APEX Repository Refinement Programme — R0 through R10+ |
| **BOOTSTRAPPED** | Constitutional record written to constitutional_records; operational execution may still be deferred |
| **production baseline** | Commit d087c19 (Wave 4 certified production deployment) |
| **canonical repository** | Current repository HEAD (9794171 as of R10) — not yet proven deployed to production |
| **knowledge gap** | A capability or knowledge item identified as missing; PLANNED system not yet implemented |
| **autoApproveStandardPermissions** | Function called at server startup that can trigger autonomous pipeline execution (F-15) |

---

## §18 — Authority Hierarchy

When documentation contradicts code or evidence, resolve using this hierarchy:

1. **LIVE PRODUCTION EVIDENCE** — what Render reports, what the live database contains
2. **CANONICAL PRODUCTION CODE** — `server.js`, `lib/`, `agent-system/` at current HEAD
3. **R-SERIES CERTIFICATION RECORDS** — R0-R10 certification documents (falsification-backed)
4. **CANONICAL ARCHITECTURE DOCUMENTATION** — this document (`APEX-CANONICAL-SYSTEM.md`)
5. **TESTS** — `npm test` output (1,579/1,579 PASS)
6. **OPERATIONAL DOCUMENTATION** — `docs/` ATLAS files (mostly June 2026, pre-Wave-4 completion)
7. **HISTORICAL / PLANNING DOCUMENTATION** — Wave 1-4 implementation plans, ROADMAP.md

A lower-level document cannot override Level 1-3 evidence. If a docs/ ATLAS file says X and the R-series certification says not-X, the certification governs.

---

## §19 — Navigation

| Question | Go to |
|----------|-------|
| What is APEX? | §1 this document |
| How does APEX start? | §3 this document |
| Canonical execution path? | §4 this document |
| Canonical memory? | §5 this document |
| Database access? | §6 this document |
| AI models? | §7 this document |
| Agents? | §8 this document |
| Tools? | §9 this document |
| Constitutional authority? | §10 this document |
| Background workers? | §11 this document |
| Routes/API? | §12 this document |
| Tests? | §13 this document |
| Open findings? | §16 this document |
| Certification evidence? | `APEX-CERTIFICATION-INDEX.md` |
| Full runtime inventory? | `R5-RUNTIME-CANONICALISATION-CERTIFICATION.md` |
| Memory architecture? | `R7-MEMORY-CANONICALISATION-CERTIFICATION.md` |
| Governance architecture? | `R8-CONSTITUTIONAL-GOVERNANCE-AUDIT-CERTIFICATION.md` |
| AI/agent/tool inventory? | `R9-AI-AGENT-TOOL-AUDIT-CERTIFICATION.md` |
| Test inventory? | `R10-TEST-CONSOLIDATION-CERTIFICATION.md` |
| Developer setup? | `docs/SETUP.md` |
| Feature roadmap? | `ROADMAP.md` (aspirational; not certification evidence) |

---

*Last updated: R11 (2026-08-25). Update this document when R-series certifications change the verified architecture.*
