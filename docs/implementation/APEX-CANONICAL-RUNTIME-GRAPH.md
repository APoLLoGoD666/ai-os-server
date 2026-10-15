# APEX-CANONICAL-RUNTIME-GRAPH.md
# APEX One Platform — Canonical Runtime Graph

**Phase:** Phase 0 Authority Audit (Re-run)
**Date:** 2026-08-19
**Authority:** Repository reality — server.js imports, middleware chain, direct file reads

**Note on deployment reality:** Wave 3 constitutional files are UNTRACKED in git. The runtime graph below describes the LOCAL working tree. The production Render deployment reflects the 2026-07-11 commit — constitutional bootstrap layers do NOT exist in production.

---

## CANONICAL EXECUTION FLOW

```
┌─────────────────────────────────────────────────────────────────────────┐
│  USER                                                                   │
│  Browser / Mobile / Voice / Electron                                    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  HTTP / WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  INTERFACE LAYER                                                        │
│  public/dashboard.html  (primary — 1.2MB / 20,826 lines)               │
│  public/editor.html     (secondary — 4.5K)                              │
│  public/sw.js           (PWA service worker — push notifications)       │
│  public/apex-v2.css     (stylesheet — 55.7K)                           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  fetch / WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API / SERVER LAYER                                                     │
│  server.js — Express app, port $PORT                                    │
│    instrument.js       (Sentry — first require)                         │
│    lib/middleware.js   (CORS, compression, helmet, rate limiting)       │
│    lib/app-auth.js     (JWT auth)                                       │
│    lib/ws-handler.js   (WebSocket upgrade)                              │
│    lib/event-bus.js    (non-blocking EventEmitter, 200-event log)       │
│    lib/viz-broadcaster.js (taps event bus for visualization)            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CIVILIZATION KERNEL LAYER                                              │
│  middleware/civilization-kernel.js                                      │
│  Pipeline: INIT → IDENTITY → CONSTITUTION → GOALS → ATTENTION          │
│                                                                         │
│  ├── lib/runtime/execution-context.js   (request lifecycle context)     │
│  ├── lib/runtime/constitutional-gate.js (constitutional gate check)     │
│  ├── lib/goals/goal-graph.js            (goal evaluation)               │
│  ├── lib/attention/attention-engine.js  (attention scoring)             │
│  └── lib/memory/gateway.js             (decision memory write)          │
│                                                                         │
│  AL thresholds: AL1→0.95, AL2→0.90, AL3→0.75, AL4→0.60, AL5→0.50     │
│  Audit writes: logs/kernel.ndjson + logs/apex_audit.ndjson             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API AUTHORITY CHAIN (lib/kernel.js — 4 gates)                         │
│  Applied to all /api/* requests                                         │
│                                                                         │
│  Gate 1: resolveIdentity   — lib/middleware.js                         │
│  Gate 2: resolveOwnership  — lib/middleware.js                         │
│  Gate 3: checkAuthority    — lib/agent-file-utils.js                   │
│  Gate 4: checkGovernance   — lib/agent-file-utils.js                   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PETL TRANSACTION LAYER                                                 │
│  lib/runtime/petl-middleware.js                                         │
│    → lib/runtime/execution-transaction.js                               │
│      → lib/runtime/compensation-log.js                                  │
│      → lib/runtime/concurrency-slot-manager.js                          │
│      → lib/runtime/invariant-compiler.js                                │
│      → lib/runtime/constitutional-preflight.js                          │
│      → lib/runtime/decision-lattice.js  (FM + DT scoring)              │
│      → lib/runtime/lattice-feedback-loop.js                             │
│      → lib/runtime/lattice-health-signal.js                             │
│    Sets req.txId + req.tx before route handlers                         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ROUTE LAYER (routes/*.js — 47 route handlers)                         │
│  /chat, /api/agent, /api/tasks, /api/memory, /api/documents            │
│  /api/governance, /api/intelligence, /api/reality, /api/registry       │
│  /api/finance, /api/journal, /api/life, /api/wealth, /api/health       │
│  /api/strategic, /api/observatory, /api/operations, /api/voice-chat    │
│  /api/reality-architecture (NEW 2026-07-11), plus 28+ domain routes   │
│                                                                         │
│  DUPLICATE LAYER RISK: src/routes/ contains agent-schedules,           │
│  agent-tasks, auth, chat — unknown if these are mounted or orphaned    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATION LAYER                                                    │
│  agent-system/orchestrator.js — runAgentTeam()  [115.3K]               │
│    ├── agent-system/prompt-expander.js                                  │
│    ├── agent-system/dynamic-agent-selector.js                           │
│    ├── agent-system/agent-pipeline-hooks.js                             │
│    ├── agent-system/agent-reputation.js                                 │
│    ├── agent-system/execution-verifier.js                               │
│    ├── agent-system/goal-tracker.js                                     │
│    ├── agent-system/adaptation-engine.js                                │
│    ├── agent-system/reflection-engine.js                                │
│    ├── agent-system/obsidian-memory.js  [DIRECT — bypasses gateway]     │
│    ├── agent-system/episodic-memory.js  [LEGACY — bypasses gateway]     │
│    ├── lib/memory/gateway.js            [CANONICAL memory path]         │
│    ├── lib/memory/reflexion-tracker.js  [direct import]                 │
│    ├── runtime/task-router.js           [ROOT runtime/ dir — UNKNOWN]   │
│    └── lib/agent-task-cycle.js                                          │
│         ├── agent-system/agents.js      (not orchestrator.js)           │
│         ├── lib/agent-execution-utils.js                                │
│         ├── lib/agent-command-handler.js                                │
│         ├── lib/agent-step-utils.js                                     │
│         ├── lib/agent-plan-utils.js                                     │
│         └── lib/pg_helpers.js           (task CRUD via Supabase)        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CONSTITUTIONAL RUNTIME                [LOCAL ONLY — NOT IN PRODUCTION] │
│  lib/runtime/assembler.js → runObservabilityChain()                    │
│                                                                         │
│  Post-execution observability chain (10 modules via setImmediate):     │
│  1. execution-evaluator    (recordOutcome + evaluate)                   │
│  2. decision-benchmark                                                   │
│  3. counterfactual-evaluator                                             │
│  4. outcome-registry       (buildRegistry)                              │
│  5. outcome-lineage                                                      │
│  6. improvement-lab                                                      │
│  7. strategy-engine                                                      │
│  8. learning-ledger        (buildLedger)                                │
│  9. adaptation-simulator                                                 │
│  10. decision-provenance                                                 │
│  All PURE OBSERVABILITY — no DB writes — in-memory only                │
│                                                                         │
│  lib/runtime/lattice-feedback-loop.js — drift metrics (in-memory)      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  REALITY FABRIC                        [LOCAL ONLY — NOT IN PRODUCTION] │
│  lib/runtime/constitutional-store.js  [UNTRACKED ??]                   │
│    → Supabase constitutional_records table                              │
│    → migration 080 NOT applied in production                            │
│    → fire-and-forget, no-throw, insert-only                             │
│                                                                         │
│  lib/reality/fabric.js          (Reality Fabric definition)             │
│  lib/reality/gates.js           (Reality gates)                         │
│  lib/reality/observer-registry.js                                       │
│  lib/reality/observer-limitations.js                                    │
│  lib/reality/d5-uncertainty.js                                          │
│  lib/reality/self-model.js                                              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  KNOWLEDGE RUNTIME                                                      │
│  lib/knowledge/knowledge-claim-registry.js                              │
│  lib/knowledge/evidence-object-registry.js                              │
│  lib/knowledge/belief-object-registry.js                                │
│  lib/knowledge/interpretation-record-registry.js                        │
│  lib/epistemics/epistemic-protocol-registry.js                          │
│  lib/inference/inference-protocol-registry.js                           │
│  lib/reality/observation-channel-registry.js                            │
│                                                                         │
│  NOTE: All knowledge registries import civilisation/domain-loader.js   │
│  (LEGACY file — still the active domain dependency)                     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CIVILIZATION RUNTIME          [LOCAL ONLY — NOT IN PRODUCTION]        │
│                                                                         │
│  lib/civilization/deliberation-registry.js   [UNTRACKED ??]           │
│    → CivilizationUnderstandingModel (RT-01)                             │
│    → DeliberationRecord (RT-11 partial)                                 │
│    → CivilizationalDecisionProposal PRODUCED                            │
│         ↓                                                               │
│  lib/civilization/rt12-bootstrap.js          [UNTRACKED ??]           │
│    → CDP ACCEPTED + CivilizationalDecision (RT-12)                     │
│    → OpenActionRegisterEntry PENDING (RT-12)                            │
│    → DecisionArchiveRecord (RT-12)                                      │
│    → CivilizationalDecisionChainRecord (RT-12)                         │
│         ↓                                                               │
│  lib/civilization/rt13-bootstrap.js          [UNTRACKED ??]           │
│    → ActionProjection CIVILIZATIONAL_ACTION (RT-13)                    │
│    → IrreversibilityClassificationRecord REVERSIBLE (RT-13)            │
│    → EffectExpectationRecord (RT-13)                                    │
│                                                                         │
│  Also active:                                                           │
│  lib/civilization/civilization-understanding-registry.js [UNTRACKED]   │
│  lib/civilization/admission-engine.js                                   │
│  lib/civilization/domain-scorer.js                                      │
│  lib/intelligence/civilization-runtime.js  (8-phase loop, cron)        │
│  lib/expansion/  (gap-detector, gap-analyzer, index)                    │
│  lib/ministry/   (index, session)                                       │
│  lib/executive/executive-council.js                                     │
│                                                                         │
│  NOT YET WIRED (Wave 4):                                               │
│  RT-14 Reflection Runtime — type exists, no bootstrap                   │
│  RT-11 CausalModel — no bootstrap                                       │
│  Stage 4 crossing — never occurred                                      │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  DECISION RUNTIME                                                       │
│  lib/runtime/decision-lattice.js   (FM + DT composite scoring)         │
│  lib/executive/executive-council.js                                     │
│  lib/executive/cfo.js                                                   │
│  lib/executive/entity.js                                                │
│  lib/executive/registry.js                                              │
│  lib/audit/decision_ledger.js                                           │
│  lib/authority/authority-registry.js                                    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  MEMORY LAYER                                                           │
│  lib/memory/gateway.js  (canonical access point)                       │
│    ├── Layer 0:  lib/memory/founder-memory.js   (Supabase)              │
│    ├── Layer 1:  lib/memory/working-memory.js   (Supabase)              │
│    ├── Layer 2:  lib/memory/episodic-memory-pg.js (Supabase)            │
│    ├── Layer 3:  lib/memory/semantic-memory.js  (Supabase)              │
│    ├── Layer 4:  lib/memory/procedural-memory.js (Supabase)             │
│    ├── Layer 5:  lib/memory/strategic-memory.js (Supabase)              │
│    ├── Layer 6:  lib/memory/skill-memory.js     (Supabase)              │
│    ├── Layer 7:  lib/memory/decision-memory.js  (Supabase)              │
│    ├── Layer 8:  lib/memory/knowledge-graph.js  (Supabase)              │
│    ├── Layer 10: lib/memory/consolidation-engine.js (Supabase)          │
│    ├── Layer 11: lib/memory/reflexion-tracker.js (Supabase)             │
│    ├── Layer 12: lib/memory/improvement-engine.js (Supabase)            │
│    └── Layer 13: lib/memory/adaptation-cycle.js (Supabase)              │
│                                                                         │
│  PARALLEL PATHS (not via gateway — active in production):               │
│  agent-system/episodic-memory.js   [LEGACY — imported by orchestrator]  │
│  agent-system/obsidian-memory.js   [PARALLEL — imported by orchestrator]│
│  @mastra/memory                    [UNKNOWN — delayed init]             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PERSISTENCE LAYER                                                      │
│                                                                         │
│  PRIMARY: Supabase Postgres                                             │
│    lib/clients.js → getSupabaseClient()                                │
│    SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY                             │
│    82 migrations defined; 079 applied in production (080–082 untracked) │
│                                                                         │
│  SECONDARY: pg.Pool (SCOPE EXPANDED — was RLS-only)                    │
│    lib/pg_database.js → DATABASE_URL                                    │
│    Now: cron-scheduler, event-consumer, outbox-relay, startup/index     │
│                                                                         │
│  TERTIARY: Supabase Storage                                             │
│    lib/storage.js → file uploads (workspace artifacts)                  │
│                                                                         │
│  LOCAL: Filesystem                                                      │
│    logs/kernel.ndjson       (kernel audit log — append-only)           │
│    logs/apex_audit.ndjson   (audit ledger — append-only)               │
│    .civilisation/consensus/ (consensus session flat-file fallback)      │
│    workspace/               (agent artifact files)                      │
│                                                                         │
│  EXTERNAL: Obsidian vault                                               │
│    Via OBSIDIAN_URL + OBSIDIAN_API_KEY (tunnel-dependent)              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## SECONDARY RUNTIME SERVICES (Render deployment)

```
┌─────────────────────────┐  ┌───────────────────────────┐  ┌──────────────────┐
│ ai-os-server (web)      │  │ apex-ai-sidecar (web)     │  │ registry-health  │
│ Node.js — server.js     │  │ Python — uvicorn sidecar  │  │ Cron (*/30 min)  │
│ max-old-space=220MB     │  │ RAG-Anything + MarkItDown │  │ registry-cron.js │
│ PRIMARY PROCESS         │  │ RAG_SIDECAR_URL env var   │  │                  │
└─────────────────────────┘  └───────────────────────────┘  └──────────────────┘
```

---

## FILE-TO-LAYER MAPPING SUMMARY

| Layer | Canonical Files | Notes |
|-------|----------------|-------|
| Interface | `public/dashboard.html` (1.2MB), `public/editor.html`, `public/sw.js` | dashboard doubled in size since project memory |
| API | `server.js`, `routes/*.js` (47 files) | `src/routes/` duplicates unknown |
| Civilization Kernel | `middleware/civilization-kernel.js` | Committed |
| Authority Chain | `lib/kernel.js`, `lib/middleware.js`, `lib/agent-file-utils.js` | Committed |
| PETL Transaction | `lib/runtime/petl-middleware.js`, `lib/runtime/execution-transaction.js` | Committed |
| Orchestration | `agent-system/orchestrator.js`, `lib/agent-task-cycle.js` | Committed; dual memory paths |
| Constitutional Runtime | `lib/runtime/assembler.js` + 10 observability modules | Committed — pure observability |
| Reality Fabric | `lib/runtime/constitutional-store.js` | **UNTRACKED — not in production** |
| Knowledge Runtime | `lib/knowledge/*.js`, `lib/epistemics/*.js`, `lib/inference/*.js` | All import legacy domain-loader |
| Civilization Runtime | `lib/civilization/deliberation-registry.js`, `rt12-bootstrap.js`, `rt13-bootstrap.js` | **ALL UNTRACKED** |
| Decision Runtime | `lib/runtime/decision-lattice.js`, `lib/executive/*.js` | Committed |
| Memory | `lib/memory/gateway.js` + 13 layer modules | Committed; 3 new modules (governance-synthesizer, importance-engine, policy-extractor) |
| Persistence | `lib/clients.js` (Supabase primary), `lib/pg_database.js` (expanded scope), `lib/storage.js` | pg pool scope expanded |

---

*APEX-CANONICAL-RUNTIME-GRAPH.md — Phase 0 Authority Audit (Re-run) — 2026-08-19*
