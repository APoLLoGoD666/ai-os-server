# POST-WAVE-4 ONE-APEX RECONCILIATION
## Canonical System Reconciliation — Authoritative Technical Inventory

**Task:** POST-W4 ONE-APEX CONVERGENCE PHASE 0  
**Type:** INVESTIGATION + ARCHITECTURAL DECISION — NO IMPLEMENTATION  
**Status:** COMPLETE  
**Date:** 2026-08-24  
**Wave:** POST-WAVE-4  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Governing principle:** ONE PLATFORM. ONE SYSTEM. ONE APEX.

---

## 1. Executive Conclusion

APEX has **one canonical platform path**. The primary architectural claim (ONE APEX) is substantially true and falsifiable from evidence. The following divergences from perfect convergence exist and are classified:

| Category | Count | Status |
|----------|-------|--------|
| Uncommitted Wave 4 files (local only) | 16 files | GIT GAP — must commit |
| Wave 3 migrations not confirmed applied to production | 3 migrations | DEPLOYMENT BLOCKER |
| PETL cluster (built, never wired) | 9 files | DEFERRED (T4-PETL task) |
| Unreachable lib/runtime files | 4 files | REMOVE (future cleanup) |
| Test-only governance cluster | 7 files | RECLASSIFY as test-only |
| Dual route system (routes/ + src/routes/) | 2 systems | INTENTIONAL — by-design dual-register |
| pg_helpers.js → shim | 1 file | KEEP (backward-compat shim) |
| rag-bridge.js | 1 file | CANONICAL (active sidecar bridge) |
| Shadow runtimes | 0 | NONE |
| Duplicate startups | 0 | NONE |

**PRODUCTION IS BLOCKED** from Wave 3/Wave 4 constitutional activation by two prerequisites:
1. Migrations 080–082 not confirmed applied to production Supabase
2. Wave 4 bootstrap files not committed to git

Neither item requires new code. Both require operational actions.

---

## 2. Current Repository Reality

### 2.1 Git State (HEAD: 748fc83, 2026-08-20)

**Last commit:** `refactor(db): rename lib/pg_helpers.js → lib/supabase-helpers.js`

**Working tree:** 2 modified, 20 untracked files.

**Modified (not staged):**
- `lib/civilization/deliberation-registry.js` — T4-05 changes (dom000001 wiring, cmId + domOperRef params)
- `architecture/index.yaml` — auto-generated, non-critical

**Untracked (local only — 16 Wave 4 bootstrap files + 4 test files):**

| File | Task | Status |
|------|------|--------|
| `lib/civilization/rt14-bootstrap.js` | T4-01 | CERTIFIED, UNTRACKED |
| `lib/civilization/rt11-bootstrap.js` | T4-02 | CERTIFIED, UNTRACKED |
| `lib/civilization/rt16-bootstrap.js` | T4-03 | CERTIFIED, UNTRACKED |
| `lib/civilization/rt04-bootstrap.js` | T4-04 | CERTIFIED, UNTRACKED |
| `lib/civilization/dom000001-bootstrap.js` | T4-05 | CERTIFIED, UNTRACKED |
| `tests/rt14-bootstrap.test.js` | T4-01 | CERTIFIED, UNTRACKED |
| `tests/rt11-bootstrap.test.js` | T4-02 | CERTIFIED, UNTRACKED |
| `tests/rt16-bootstrap.test.js` | T4-03 | CERTIFIED, UNTRACKED |
| `tests/rt04-bootstrap.test.js` | T4-04 | CERTIFIED, UNTRACKED |
| `tests/dom000001-bootstrap.test.js` | T4-05 | CERTIFIED, UNTRACKED |
| `T4-01-CERTIFICATION.md` | T4-01 | CERT DOC, UNTRACKED |
| `T4-02-CERTIFICATION.md` | T4-02 | CERT DOC, UNTRACKED |
| `T4-03-CERTIFICATION.md` | T4-03 | CERT DOC, UNTRACKED |
| `T4-04-CERTIFICATION.md` | T4-04 | CERT DOC, UNTRACKED |
| `T4-05-CERTIFICATION.md` | T4-05 | CERT DOC, UNTRACKED |
| `T4-05-PHASE-0-AUDIT.md` | T4-05 | CERT DOC, UNTRACKED |
| `T4-06-CERTIFICATION.md` | T4-06 | CERT DOC, UNTRACKED |
| `T4-06-OAR-TERMINAL-FRAMEWORK.md` | T4-06 | CERT DOC, UNTRACKED |
| `POST-W4-ONE-APEX-RECONCILIATION.md` | This task | UNTRACKED (current) |
| `POST-W4-ONE-APEX-RECONCILIATION-CERTIFICATION.md` | This task | UNTRACKED (current) |

**Tracked and committed (Wave 3):**
- `lib/civilization/rt12-bootstrap.js` — in git
- `lib/civilization/rt13-bootstrap.js` — in git
- `lib/civilization/civilization-understanding-registry.js` — in git
- `lib/civilization/deliberation-registry.js` — in git (original, pre-T4-05 modification)
- `lib/runtime/` — all 34 files — in git
- `lib/constitutional-types/` — all 18 files — in git
- `migrations/080_constitutional_records.sql` — in git
- `migrations/081_obs_record_id_propagation.sql` — in git
- `migrations/082_domain_id_propagation.sql` — in git

### 2.2 Documents Referenced but Not Found

- No standalone `APEX-ONE-PLATFORM-CANONICAL.md` found (referenced in prompt as "canonical APEX implementation plan governing ONE PLATFORM / ONE SYSTEM / ONE APEX" — this document does not exist by that name)
- `docs/implementation/APEX-ONE-PLATFORM-PHASE0-CERTIFICATION.md` — EXISTS, references Wave 3 deployment gap
- Wave 2 masterplan: not found under that name; Wave 3/4 roadmaps exist in `docs/implementation/`
- Wave 3 migration/deployment records: not found as a distinct file; production state noted in APEX-ONE-PLATFORM-PHASE0-CERTIFICATION.md

---

## 3. Canonical Startup

**ONE STARTUP: `server.js`**

| Attribute | Value |
|-----------|-------|
| File | `server.js` (16.8KB) |
| Render start command | `node --max-old-space-size=220 server.js` |
| PM2 (local dev) | `ecosystem.config.js` — apex process runs `server.js` |
| Sentry init | `instrument.js` (required first in server.js) |
| Post-listen | `lib/startup.js::onListen()` |
| Production-verified | YES — Render web service |

**No competing server entries.** `ecosystem.config.js` also starts `apex-watcher` (scripts/watcher.js), which is a dev-only file watcher, not a server. Render cron (`scripts/registry-cron.js`) is a separate scheduled process, not a competing server.

### Startup Inventory

| Component | File | Role | Canonical? |
|-----------|------|------|-----------|
| Main server | `server.js` | Express app, all routing, middleware mount | YES |
| Sentry | `instrument.js` | Error tracking (required first) | YES |
| Post-listen hooks | `lib/startup.js` | Events, Mastra init, integrity crons | YES |
| PM2 dev config | `ecosystem.config.js` | Local dev only | DEV ONLY |
| File watcher | `scripts/watcher.js` | Local dev only | DEV ONLY |
| Render cron | `scripts/registry-cron.js` | Scheduled registry health check | CANONICAL (cron) |
| Build step | `scripts/certify.js` | Build-time certification check | BUILD ONLY |

---

## 4. Canonical Routing

**TWO ROUTE REGISTRIES — both production-active, by design.**

This is not a duplication problem. It is an intentional two-tier architecture:

| Registry | Location | Count | Mount pattern | Canonical? |
|----------|----------|-------|---------------|-----------|
| Agent routes | `routes/` | 47 files | Auto-loaded at `/api` via `_loadAgentRoutes()` | YES — domain routes |
| Application routes | `src/routes/` | 28 files | Explicit `app.use(require('./src/routes/X'))` | YES — curated app routes |

**Why not a duplicate:** Each route file defines an internal sub-prefix per CLAUDE.md rule: "Every new route file must define an internal sub-prefix matching its filename to prevent route collision under `_loadAgentRoutes` flat-mount." No route collision exists when rule is followed.

**Key route files:**
- `routes/civilization.js` (27.7KB) — Civilization capabilities API
- `routes/governance.js` (30.0KB) — Governance routes
- `routes/intelligence.js` (24.8KB) — Intelligence routes
- `routes/gemini-live.js` (38.6KB) — WebSocket, explicitly excluded from auto-load, attached via `attach(server)`
- `src/routes/telemetry/index.js` (14.1KB) — Telemetry at `/`

**Note on `routes/finance.js` and `src/routes/finance.js`:** Both mounted simultaneously. Sub-prefix rule must be enforced to prevent collision. This is a governance rule, not an architectural error.

---

## 5. Canonical Runtime

**ONE CANONICAL RUNTIME PATH:** `lib/civilization/` (constitutional bootstrap) + `lib/runtime/` (observability pipeline)

These are NOT competing implementations. They serve orthogonal functions.

### Runtime Component Map

| Component | Location | Function | Production Status | Canonical |
|-----------|----------|----------|------------------|-----------|
| Constitutional gate | `lib/runtime/constitutional-gate.js` | Per-request governance evaluation | ACTIVE — called every request | YES |
| Execution context | `lib/runtime/execution-context.js` | Per-request context initialization | ACTIVE — called every request | YES |
| Constitutional store | `lib/runtime/constitutional-store.js` | Fire-and-forget constitutional record write | ACTIVE — 18+ callers | YES |
| Observability assembler | `lib/runtime/assembler.js` | Post-task observability chain | ACTIVE — fire-and-forget post-task | YES |
| Task router | `runtime/task-router.js` | Request classification → RouteDecision | ACTIVE — orchestrator + civilization-runtime | YES |
| Wave 3 decision | `lib/civilization/rt12-bootstrap.js` | CivilizationalDecision + OAR entry formation | TRACKED, not wired to startup | CANONICAL (committed) |
| Wave 3 action | `lib/civilization/rt13-bootstrap.js` | ActionProjection + EffectExpectation | TRACKED, not wired to startup | CANONICAL (committed) |
| Wave 3 deliberation | `lib/civilization/deliberation-registry.js` | DeliberationRecord + CDP | TRACKED (T4-05 mod not committed) | CANONICAL (committed version) |
| Wave 3 CUM | `lib/civilization/civilization-understanding-registry.js` | CivilizationUnderstandingModel | TRACKED, called by knowledge-validator | CANONICAL (committed) |
| Wave 4 RT-14 | `lib/civilization/rt14-bootstrap.js` | Reflection: OCR + OAR-TSR + RTR + CMDR | UNTRACKED — local only | CANONICAL (must commit) |
| Wave 4 RT-11 | `lib/civilization/rt11-bootstrap.js` | CausalModel + AssumptionRegister | UNTRACKED — local only | CANONICAL (must commit) |
| Wave 4 RT-16 | `lib/civilization/rt16-bootstrap.js` | AmendmentProposal + AmendmentRegistry | UNTRACKED — local only | CANONICAL (must commit) |
| Wave 4 RT-04 | `lib/civilization/rt04-bootstrap.js` | AuditScope + ConstitutionalAuditRecord + CCA | UNTRACKED — local only | CANONICAL (must commit) |
| Wave 4 DOM-000001 | `lib/civilization/dom000001-bootstrap.js` | DomainBootstrapOperationalizationRecord | UNTRACKED — local only | CANONICAL (must commit) |
| PETL cluster | `lib/runtime/petl-middleware.js` + 8 files | Pre-execution transaction layer | BUILT, NEVER MOUNTED | DEFERRED (T4-PETL) |
| Governance cluster | `lib/runtime/governance-*.js` (7 files) | Runtime governance types | TEST-ONLY (no production callers) | RECLASSIFY |
| Unreachable | 4 files in `lib/runtime/` | Various | ZERO importers, ZERO tests | REMOVE |

---

## 6. Canonical Governance

**ONE CANONICAL GOVERNANCE PATH:**

```
server.js
  → app.use(require('./middleware/civilization-kernel'))  [global gate]
  → app.use('/api', resolveIdentity, resolveOwnership, checkAuthority, checkGovernance)  [kernelChain]
```

**Primary gate:** `middleware/civilization-kernel.js` (26.6KB)

### civilization-kernel.js Pipeline

| Phase | Component | What it does |
|-------|-----------|-------------|
| INIT | `ec.initializeContext(req)` | Creates execution context |
| IDENTITY | Identity hydration | Sets `req.apex.identity` |
| GOVERNANCE SCORE | `AUTONOMY_LEVEL` threshold check | ARCH-14 §3.3 compliance |
| CONSTITUTION | `gate.evaluate(ctx, watchdogOpts)` | Constitutional gate evaluation → ALLOW/WARN/RESTRICT/DENY |
| GATE RECORD | `_writeGateRecord()` | Writes to Supabase `governance_records` table |
| GOALS | `goalGraph.resolveGoal()` | Goal resolution |
| ATTENTION | `attention-engine.score()` | Attention scoring |
| MEMORY | `memGateway.getContext()` | Memory context (non-blocking) |

**PETL STATUS: NOT CANONICAL FOR PRODUCTION. Not mounted. Not wired. Requires separate task.**

### governance-contract.js Missing Validators (RISK-3 from T4-INV)

`lib/runtime/governance-contract.js` references three enforcement scripts that **do not exist**:
- `scripts/validate-governance.js` — MISSING
- `scripts/validate-recorder-purity.js` — MISSING
- `scripts/validate-governance-contract.js` — MISSING

This is a known risk (RISK-3 from T4-INV). Not blocking production, but constitutes a governance integrity gap.

---

## 7. Canonical Authority

**ONE CANONICAL AUTHORITY PATH:**

```
lib/kernel.js::kernelChain
  = [resolveIdentity, resolveOwnership, checkAuthority, checkGovernance]
```

Mounted: `app.use('/api', ...kernelChain)` — all /api routes pass through authority chain.

`lib/middleware.js` provides: `hasAppAccess`, `requireAppAccess`, `requireAuth`, `resolveIdentity`, `resolveOwnership`.

No competing authority implementation exists in production path. PETL's `constitutional-preflight.js` is built but not mounted.

---

## 8. Canonical Memory

**TARGET: `lib/memory/gateway.js` as the ONE canonical memory aggregator.**

Current state: multiple memory layers exist under `lib/memory/`. All are aggregated through `gateway.js` as the primary entry point (imported by server.js). Individual layers are:

| Layer | File | Backing | Canonical |
|-------|------|---------|-----------|
| Primary aggregator | `lib/memory/gateway.js` (30.2KB) | Multi-layer + constitutional-store writes | YES |
| Working memory | `lib/memory/working-memory.js` | In-memory, session-scoped | YES |
| Episodic | `lib/memory/episodic-memory-pg.js` | Supabase | YES |
| Semantic | `lib/memory/semantic-memory.js` | Supabase | YES |
| Strategic | `lib/memory/strategic-memory.js` | Supabase | YES |
| Procedural | `lib/memory/procedural-memory.js` | Supabase | YES |
| Skill | `lib/memory/skill-memory.js` | Supabase | YES |
| Decision | `lib/memory/decision-memory.js` | Supabase | YES |
| Reflexion | `lib/memory/reflexion-tracker.js` (8.7KB) | Supabase | YES |
| Adaptation | `lib/memory/adaptation-cycle.js` (19.0KB) | Supabase | YES |
| Governance synth | `lib/memory/governance-synthesizer.js` | TBD | CLASSIFY |
| Swarm memory | `.swarm/memory.db` (SQLite, 152KB) | SQLite | DEFERRED (Ruflo scope) |
| Mastra memory | `agent-system/mastra_agents.js` | @mastra/memory | CANONICAL (Mastra scope) |
| Langchain memory | `agent-system/langchain-memory.js` | Legacy | LEGACY — classify |
| RAG bridge | `agent-system/rag-bridge.js` | Python sidecar | CANONICAL (see §20) |

No memory migration is required. `gateway.js` already aggregates. Classification of `governance-synthesizer.js` and `langchain-memory.js` is deferred.

---

## 9. Canonical Database

**TWO CANONICAL DATABASE PATHS — both required, non-competing:**

| Path | File | Pattern | When Used |
|------|------|---------|-----------|
| Supabase JS API | `lib/clients.js::getSupabaseClient()` | `@supabase/supabase-js` (service role) | All application CRUD, constitutional-store, most writes |
| Direct Postgres | `lib/pg_database.js` | `pg.Pool` (max 10, SSL) | Transactions, DDL, RLS, migrations, event-consumer |

These are not competing — they are used for different access patterns against the same underlying Supabase Postgres instance.

**Third path — holdout:**
- `lib/clients.js::getHoldoutClient()` — anon key, RLS-enforced — CANONICAL (benchmark isolation)

**Target:** These three paths remain; no migration between them is required.

### Constitutional Store

| Item | Value |
|------|-------|
| File | `lib/runtime/constitutional-store.js` (35 lines) |
| Pattern | Fire-and-forget via `getSupabaseClient()` |
| Target table | `constitutional_records` |
| Migration | `080_constitutional_records.sql` (tracked in git) |
| Production status | **UNCONFIRMED** — migration may not be applied |
| Callers | 18+ production callers in lib/civilization/, lib/constitution/, lib/knowledge/, etc. |

---

## 10. Canonical Constitutional Path

```
Constitutional type (lib/constitutional-types/*.js)
        ↓
Runtime (lib/civilization/rt12-bootstrap.js → rt13 → deliberation-registry → rt11 → rt04 → dom000001)
        ↓
constitutional-store.write(record)  [lib/runtime/constitutional-store.js]
        ↓
Supabase insert → constitutional_records table  [migration 080]
        ↓
RT-04 audit (lib/civilization/rt04-bootstrap.js) → ConstitutionalAuditRecord in constitutional_records
```

**Alternative paths that bypass governance:** NONE identified. All constitutional record writes go through `constitutional-store.write()`. The fire-and-forget pattern means failures are logged but not propagated — this is by design (bootstrap limitation).

**Can a constitutional record bypass the canonical store?**
- Direct Supabase writes: YES — any code with `getSupabaseClient()` can write to `constitutional_records`. This is not currently exploited but is a theoretical bypass.
- Outside constitutional types: The `__type` field on records is not enforced at the DB layer — any record structure can be written.
- **Recommendation:** Schema-level RLS or check constraints on `constitutional_records` would strengthen the canonical path. DEFERRED — not in scope for this task.

---

## 11. Production Reality

### What Is Deployed

| Item | Status |
|------|--------|
| Render web service | `server.js` — DEPLOYED |
| Render sidecar | Python/uvicorn RAG — DEPLOYED |
| Render cron | `scripts/registry-cron.js` — DEPLOYED |
| Git HEAD | 748fc83 (2026-08-20) |
| Wave 3 civilization files | IN GIT — likely deployed |
| Wave 4 bootstrap files | NOT IN GIT — NOT deployed |
| deliberation-registry.js T4-05 changes | NOT STAGED — NOT deployed |

### What Is NOT Deployed

- Wave 4: rt14-bootstrap.js, rt11-bootstrap.js, rt16-bootstrap.js, rt04-bootstrap.js, dom000001-bootstrap.js
- T4-05 modification to deliberation-registry.js (cmId + domOperRef params)
- All Wave 4 test files
- All certification documents (these are documentation, not runtime)

### Production Database

- `governance_records` table: **ACTIVE** — written by civilization-kernel.js every request
- `constitutional_records` table: **UNCONFIRMED** — migration 080 is in git, deployment state unknown
- Wave 3 constitutional bootstrap output: **NEVER WRITTEN IN PRODUCTION** (no startup trigger has ever called `formCivilizationUnderstanding()` at server start; it is called only from `knowledge-validator.js` in the intelligence pipeline)

### Production Access Note

**Direct production Supabase access was not performed during this investigation.** Production state is inferred from:
- Git history and untracked file status
- `render.yaml` configuration
- `APEX-ONE-PLATFORM-PHASE0-CERTIFICATION.md` (pre-existing document)
- Code inspection of startup path

**Production state must be verified before deployment.**

---

## 12. Runtime Inventory

### lib/runtime/ — Complete Classification (34 files)

**Tier 1: Production-Active, Hot Path**

| File | Function | Callers |
|------|----------|---------|
| `constitutional-gate.js` | Per-request governance evaluation | civilization-kernel.js, master-orchestrator.js, routes/observatory.js |
| `execution-context.js` | Request context initialization | civilization-kernel.js |
| `constitutional-store.js` | Fire-and-forget constitutional writes | 18+ callers |

**Tier 2: Production-Active, Post-Task Observability (fire-and-forget)**

| File | Function |
|------|----------|
| `assembler.js` | Orchestrates observability chain post-task |
| `execution-evaluator.js` | Evaluates execution quality |
| `decision-benchmark.js` | Benchmarks decisions |
| `counterfactual-evaluator.js` | Counterfactual analysis |
| `outcome-registry.js` | In-memory outcome registry (max 10K) |
| `outcome-lineage.js` | Outcome lineage tracking |
| `improvement-lab.js` | Improvement suggestions |
| `strategy-engine.js` | In-memory strategy analysis (NOT same as lib/intelligence/strategy-engine.js) |
| `learning-ledger.js` | Learning ledger (in-memory) |
| `adaptation-simulator.js` | Adaptation simulation |
| `decision-provenance.js` | Decision provenance tracking |

**Tier 3: Built, Never Wired (PETL Cluster) — DEFERRED**

| File | Function | Status |
|------|----------|--------|
| `petl-middleware.js` | Pre-execution transaction layer gate | NOT MOUNTED |
| `execution-transaction.js` | Transaction management | PETL dependency |
| `decision-lattice.js` | Decision lattice | PETL dependency |
| `constitutional-preflight.js` | Pre-execution constitutional check | PETL dependency |
| `concurrency-slot-manager.js` | Concurrency control | PETL dependency |
| `invariant-compiler.js` | Invariant compilation | PETL dependency |
| `compensation-log.js` | Compensation logging | PETL dependency |
| `lattice-feedback-loop.js` | Feedback loop | PETL dependency |
| `lattice-health-signal.js` | Health signaling | PETL dependency |

**Tier 4: Test-Only Governance Cluster — RECLASSIFY**

| File | Note |
|------|------|
| `governance-attestation.js` | No production callers |
| `governance-compiler.js` | No production callers |
| `governance-contract.js` | References missing validator scripts |
| `governance-manifest.js` | No production callers |
| `governance-reproducibility.js` | No production callers |
| `governance-traceability.js` | No production callers |
| `recorder-policy.js` | No production callers |

**Tier 5: Unreachable — REMOVE (future)**

| File | Note |
|------|------|
| `lattice-calibration-advisor.js` | Zero importers, zero tests |
| `execution-replay.js` | Zero importers, zero tests |
| `policy-experiment.js` | Zero importers, zero tests |
| `resource-planner.js` | Zero importers, zero tests |

---

## 13. Startup Inventory

See §3. Summary:

| Path | File | Production? | Canonical? |
|------|------|------------|-----------|
| Primary | `server.js` | YES | YES |
| Post-listen | `lib/startup.js` | YES | YES |
| Render cron | `scripts/registry-cron.js` | YES (cron service) | YES |
| Build | `scripts/certify.js` | YES (build-time only) | BUILD ONLY |
| Dev watcher | `scripts/watcher.js` | NO (local PM2) | DEV ONLY |
| PM2 config | `ecosystem.config.js` | NO (local) | DEV ONLY |

---

## 14. Routing Inventory

See §4. Two canonical route registries. Not a problem — designed dual-tier.

**Potential collision points requiring sub-prefix rule enforcement:**
- `routes/finance.js` + `src/routes/finance.js` — both mounted
- `routes/health.js` + `src/routes/health.js` — both mounted
- `routes/system.js` + `src/routes/system.js` — may exist

The CLAUDE.md rule (sub-prefix enforcement) is the governance control. No route collision audit was performed — this is a deferred verification task.

---

## 15. Memory Inventory

See §8. No memory migration required. `lib/memory/gateway.js` is the aggregation point.

**Items requiring classification:**
- `lib/memory/governance-synthesizer.js` — purpose unclear; no T4-INV entry
- `agent-system/langchain-memory.js` — likely legacy; no confirmed production caller found

---

## 16. Database/Storage Inventory

See §9. Two database paths (Supabase JS + pg.Pool) — both canonical, orthogonal.

| File | Role | Status |
|------|------|--------|
| `lib/clients.js` | Singleton factory (Anthropic, Supabase, holdout) | CANONICAL |
| `lib/supabase-helpers.js` | All Supabase CRUD helpers | CANONICAL |
| `lib/pg_database.js` | pg.Pool for direct Postgres | CANONICAL |
| `lib/pg_helpers.js` | Backward-compat shim → supabase-helpers | KEEP (shim) |
| `lib/storage.js` | Supabase Storage helpers | CANONICAL |
| `lib/runtime/constitutional-store.js` | Fire-and-forget constitutional writes | CANONICAL |

---

## 17. Constitutional Inventory

### Constitutional Types (lib/constitutional-types/)

All 18 files tracked in git. See §5 (Runtime Inventory) for functional mapping.

### Constitutional Bootstrap Chain (lib/civilization/)

| File | Wave | Tracked | Called By | Notes |
|------|------|---------|-----------|-------|
| `civilization-understanding-registry.js` | W3 | YES | `lib/intelligence/knowledge-validator.js` | CUM formation |
| `deliberation-registry.js` | W3/T4-05 | YES (pre-T4-05) | Called by CUM registry | T4-05 mod not committed |
| `rt12-bootstrap.js` | W3 | YES | `deliberation-registry.js` | CivilizationalDecision + OAR |
| `rt13-bootstrap.js` | W3 | YES | `deliberation-registry.js` | ActionProjection + EER |
| `rt11-bootstrap.js` | T4-02 | **NO** | `deliberation-registry.js` | CausalModel — **must commit** |
| `rt14-bootstrap.js` | T4-01 | **NO** | Nothing in production | Reflection — **must commit** |
| `rt16-bootstrap.js` | T4-03 | **NO** | Nothing in production | Amendment — **must commit** |
| `rt04-bootstrap.js` | T4-04 | **NO** | Nothing in production | Audit — **must commit** |
| `dom000001-bootstrap.js` | T4-05 | **NO** | `deliberation-registry.js` (T4-05 mod) | DOM-000001 — **must commit** |

**WIRING GAP:** rt04-bootstrap.js and rt16-bootstrap.js have no production callers even in the T4-05-modified deliberation-registry.js. They are tested standalone but not wired into the bootstrap chain. This is a known architectural gap — resolution would require wiring into the chain or defining a separate activation trigger. DEFERRED.

---

## 18. Shadow/Duplicate Analysis

### Candidate: lib/runtime/strategy-engine.js vs lib/intelligence/strategy-engine.js

**VERDICT: DISTINCT — NOT a shadow.**
- `lib/runtime/strategy-engine.js` — pure in-memory post-task observability analysis (part of assembler chain; no model calls; no DB writes)
- `lib/intelligence/strategy-engine.js` (9.6KB) — makes AI model calls; produces 90-day/1-year/3-year/10-year plans; writes to Supabase

Different purposes, different callers, different semantics.

### Candidate: routes/finance.js vs src/routes/finance.js

**VERDICT: BY DESIGN — sub-prefix rule enforced.**

Both mounted simultaneously; each defines internal sub-prefix preventing HTTP collision. Same pattern for other potential overlaps (health, system).

### Candidate: civilization-kernel.js vs petl-middleware.js

**VERDICT: DISTINCT — PETL is future evolution, NOT a shadow.**

`civilization-kernel.js` is the current production gate. `petl-middleware.js` is a pre-transaction layer designed to precede (not replace) civilization-kernel.js. It was never mounted. Not a shadow — an unactivated enhancement.

### Candidate: lib/runtime/ observability vs lib/intelligence/

**VERDICT: DISTINCT.**

`lib/runtime/` observability chain (assembler.js and 10 files) is pure in-memory post-task analysis.
`lib/intelligence/` contains AI-model-calling intelligence functions.

### SHADOW RUNTIMES FOUND: 0

No file in the repository implements the same runtime as another file in a competing or duplicate manner.

---

## 19. PETL Status

→ SOURCE: T4-INV-DECISION-RECORD.md (AMB-1 resolution)

| Attribute | Value |
|-----------|-------|
| PETL implementation | COMPLETE (`lib/runtime/petl-middleware.js` + 8 files) |
| Production callers | ZERO |
| Mount point | NOT MOUNTED (no `app.use(petlGate)` in server.js) |
| Constitutional authority | PETL not yet authorized as production gate |
| Double-gate risk | If PETL is mounted before civilization-kernel.js is removed, requests pass TWO governance gates — must be resolved before PETL activation |
| Canonical production gate | `middleware/civilization-kernel.js` — current and permanent until T4-PETL task |
| Decision | T4-INV AMB-1: PETL NOT T4-01 scope; requires separate task (T4-PETL) |
| Status | **DEFERRED — requires T4-PETL task** |

**Do NOT wire PETL as part of this task or any near-term task without T4-PETL scoping.**

---

## 20. rag-bridge.js Status

| Attribute | Value |
|-----------|-------|
| File | `agent-system/rag-bridge.js` (5.5KB) |
| Function | HTTP client to Python RAG sidecar (`sidecar/main.py`) |
| Sidecar URL | `RAG_SIDECAR_URL` env var (default `http://localhost:8001`) |
| Render sidecar | `apex-ai-sidecar` — deployed in `render.yaml` |
| Production callers | `src/routes/rag.js`, `routes/research.js`, others in intelligence routes |
| Status | **CANONICAL — active sidecar bridge** |
| Migration required | NO |

---

## 21. baseline.json Dependency Analysis

| Attribute | Value |
|-----------|-------|
| File | `lib/constitution/baseline.json` |
| Existence | DOES NOT EXIST (deleted) |
| References | `lib/constitution/drift-detector.js` (3 references) |
| Error behavior | `loadBaseline()` returns null gracefully on missing file; `saveBaseline()` creates it when run |
| Production impact | NONE — drift-detector handles absence; no blocking startup dependency |
| `record.__baseline` field | STRING VALUE 'APEX-CONSTITUTION-v1.0' in constitutional-store records — UNRELATED to this file |
| `lib/synthetic/regression-runner.js` | References `regression-baseline.json` — SEPARATE file, unrelated |
| **Status** | **NOT A BLOCKER — no action required** |

---

## 22. pg_database.js Analysis

| Attribute | Value |
|-----------|-------|
| File | `lib/pg_database.js` (2.0KB) |
| Pattern | `pg.Pool` (max 10 connections, SSL) |
| Environment vars | `DATABASE_URL` (Supabase Postgres direct connection URL) |
| Purpose | Direct Postgres for: transactions, DDL (CREATE TABLE), RLS, migrations, event-consumer |
| Production callers (main tree) | `lib/event-consumer.js`, `lib/outbox-relay.js`, `lib/startup.js` (4 uses), `routes/observatory.js`, `routes/integrations.js`, `services/init.js`, `services/sync/supabase-notion-sync.js`, `src/routes/health.js`, `src/routes/telemetry/index.js`, `agent-system/supabase-setup.js`, `lib/cron-scheduler.js` |
| **Status** | **CANONICAL — required for direct Postgres operations** |
| Migration | NONE — keep as-is |

---

## 23. pg_helpers.js Analysis

| Attribute | Value |
|-----------|-------|
| File | `lib/pg_helpers.js` (139B) |
| Content | `module.exports = require('./supabase-helpers')` — pure shim |
| Purpose | Backward-compat shim after rename in commit 748fc83 |
| Importers | Any file that still uses `require('./pg_helpers')` or `require('../lib/pg_helpers')` |
| **Status** | **KEEP — backward-compat shim until all importers migrated** |
| Migration | Identify all importers; update to `supabase-helpers`; then remove shim |

---

## 24. Migration Ledger

Every non-canonical component receives one disposition.

| # | Component | Current Location | Function | Disposition | Risk | Order | Blocker |
|---|-----------|-----------------|---------|-------------|------|-------|---------|
| M-01 | Wave 4 bootstrap files (5) | `lib/civilization/` (untracked) | RT-14, RT-11, RT-16, RT-04, DOM-000001 | **GIT COMMIT** | LOW (tested) | 1 | YES — not in production |
| M-02 | deliberation-registry.js T4-05 changes | `lib/civilization/` (modified, unstaged) | T4-05 wiring (domOperRef, formCausalModel) | **GIT COMMIT** | LOW (certified 187/187 tests pass) | 1 | YES — modified not staged |
| M-03 | Wave 4 test files (5) | `tests/` (untracked) | Certified test suites | **GIT COMMIT** | NONE | 1 | NO |
| M-04 | Wave 4 certification docs (10+) | Root + docs (untracked) | Certification records | **GIT COMMIT** | NONE | 1 | NO |
| M-05 | Migrations 080–082 | `migrations/` (tracked, not applied) | constitutional_records, obs_record_id, domain_id | **APPLY TO PRODUCTION** | LOW (schema additions only) | 2 | YES — blocks constitutional writes |
| M-06 | PETL cluster (9 files) | `lib/runtime/` | Pre-execution transaction layer | **DEFER (T4-PETL task)** | HIGH if wired wrong (double-gate) | N/A | NO — not in path |
| M-07 | Governance cluster (7 files) | `lib/runtime/governance-*.js` | Runtime governance types | **RECLASSIFY as test-only** | LOW | 3 | NO |
| M-08 | Unreachable files (4) | `lib/runtime/` | Dead code | **REMOVE (future cleanup)** | LOW | 4 | NO |
| M-09 | Missing governance validators | `scripts/` (referenced, not found) | Enforcement scripts | **INVESTIGATE or REMOVE REFS** | MEDIUM (RISK-3) | 3 | NO |
| M-10 | pg_helpers.js shim | `lib/pg_helpers.js` | Backward-compat | **KEEP until importers migrated** | LOW | 5 | NO |
| M-11 | rag-bridge.js | `agent-system/rag-bridge.js` | Sidecar HTTP client | **KEEP (canonical)** | NONE | N/A | NO |
| M-12 | baseline.json | `lib/constitution/baseline.json` (missing) | Drift detector baseline | **NO ACTION** | NONE | N/A | NO |
| M-13 | .swarm/memory.db | `.swarm/` | Ruflo swarm memory | **DEFER (Ruflo scope)** | NONE | N/A | NO |
| M-14 | langchain-memory.js | `agent-system/` | Legacy memory | **CLASSIFY in Ruflo/Mastra cleanup** | LOW | 5 | NO |
| M-15 | governance-synthesizer.js | `lib/memory/` | Unknown purpose | **CLASSIFY** | UNKNOWN | 3 | NO |
| M-16 | rt04-bootstrap + rt16-bootstrap wiring gap | `lib/civilization/` | No production callers | **DOCUMENT as DEFERRED wiring** | LOW | 4 | NO |

---

## 25. Target Architecture

The target ONE APEX architecture is **already approximately realized**. Required work is operational and commitment-based, not architectural redesign.

### ONE STARTUP
- **CURRENT:** `server.js` + `lib/startup.js`
- **TARGET:** Same — no change required
- **Migration:** None

### ONE SERVER
- **CURRENT:** `server.js` (Express) + Python sidecar (separate service)
- **TARGET:** Same — sidecar is a separate Render service, not a competing server
- **Migration:** None

### ONE ROUTING SYSTEM
- **CURRENT:** Dual-tier (routes/ + src/routes/)
- **TARGET:** Same — this is intentional; CLAUDE.md sub-prefix rule is the governance control
- **Migration:** Enforce sub-prefix rule audit (verify all overlapping route names have distinct sub-prefixes)

### ONE GOVERNANCE PATH
- **CURRENT:** `middleware/civilization-kernel.js` → `lib/runtime/constitutional-gate.js`
- **TARGET:** Same, with PETL as future evolution (separate T4-PETL task)
- **Migration:** T4-PETL task (deferred)

### ONE AUTHORITY PATH
- **CURRENT:** `lib/kernel.js::kernelChain`
- **TARGET:** Same
- **Migration:** None

### ONE RUNTIME PATH
- **CURRENT:** `lib/civilization/` (constitutional) + `lib/runtime/constitutional-gate.js, execution-context.js, constitutional-store.js, assembler.js` (active production runtime)
- **TARGET:** Same, plus Wave 4 bootstrap files committed and available
- **Migration:** M-01, M-02 (commit Wave 4 files)

### ONE MEMORY ARCHITECTURE
- **CURRENT:** `lib/memory/gateway.js` aggregates all layers
- **TARGET:** Same — gateway is already the canonical aggregator
- **Migration:** Classify governance-synthesizer.js, langchain-memory.js (M-14, M-15)

### ONE DATABASE ARCHITECTURE
- **CURRENT:** Supabase JS API (primary) + pg.Pool (Postgres-direct for DDL/transactions)
- **TARGET:** Same — two paths serve different purposes against same underlying DB
- **Migration:** Apply migrations 080-082 (M-05)

### ONE CONSTITUTIONAL STORE
- **CURRENT:** `lib/runtime/constitutional-store.js` → `constitutional_records` table
- **TARGET:** Same
- **Migration:** Apply migration 080, confirm table exists in production (M-05)

### ONE DEPLOYMENT PATH
- **CURRENT:** Render (web + sidecar + cron)
- **TARGET:** Same
- **Migration:** Apply migrations 080-082; deploy HEAD; verify production

---

## 26. Migration Dependency Graph

```
[M-01] Commit Wave 4 bootstrap files + deliberation-registry.js
[M-02] Stage and commit T4-05 deliberation-registry.js changes
[M-03] Commit Wave 4 test files
[M-04] Commit certification documents
    │
    └─→ [GIT COMPLETE] HEAD contains full Wave 3 + Wave 4 canonical state
            │
            └─→ [M-05] Apply migrations 080-082 to production Supabase
                    │
                    └─→ [PRODUCTION DEPLOY] Push HEAD to Render
                            │
                            └─→ [PRODUCTION VERIFY] Confirm constitutional_records writable
                                    │
                                    ├─→ [M-07] Reclassify governance cluster as test-only
                                    ├─→ [M-09] Investigate/remove RISK-3 missing validator refs
                                    ├─→ [M-15] Classify governance-synthesizer.js
                                    │
                                    └─→ [FUTURE]
                                            ├─→ [T4-PETL] PETL wiring task (M-06)
                                            ├─→ [M-08] Remove unreachable lib/runtime files
                                            ├─→ [M-10] Migrate pg_helpers.js importers
                                            └─→ Wave 5
```

---

## 27. Migration Order

**Dependency-respecting order:**

| Step | Action | Dependency | Blocker? |
|------|--------|-----------|----------|
| 1 | Git: stage + commit all Wave 4 untracked files and deliberation-registry.js modification | None | YES — precedes deployment |
| 2 | Database: apply migrations 080, 081, 082 to production Supabase | Step 1 committed | YES — precedes production constitutional writes |
| 3 | Deploy: push HEAD to Render | Steps 1-2 done | YES — production convergence |
| 4 | Verify: confirm `constitutional_records` table exists and accepts writes | Step 3 deployed | YES — production verification |
| 5 | Classify: governance-synthesizer.js, langchain-memory.js | Step 4 done | NO |
| 6 | Document: reclassify governance cluster as test-only artifacts | Step 5 done | NO |
| 7 | Investigate: RISK-3 missing governance validator scripts | Step 6 done | NO |
| 8 | Sub-prefix audit: verify all overlapping route names have distinct sub-prefixes | Any time | NO |
| 9 | T4-PETL task: scoped PETL wiring with double-gate resolution | After prod verified | NO |
| 10 | Remove unreachable lib/runtime files (4) | After T4-PETL | NO |
| 11 | Migrate pg_helpers.js importers | Any time | NO |
| 12 | Wave 5 | After production verified | NO |

---

## 28. Production Deployment Readiness

**CURRENT STATUS: NOT READY — BLOCKED BY M-01 and M-05**

| Gate Item | Status |
|-----------|--------|
| Wave 4 files committed to git | BLOCKED (M-01) |
| deliberation-registry.js T4-05 changes committed | BLOCKED (M-02) |
| Migrations 080-082 applied to production | UNCONFIRMED (M-05) |
| constitutional_records table verified in production | UNCONFIRMED |

Once M-01, M-02, M-05 are resolved, deployment gate passes.

**All other items are non-blocking for production deployment.**

---

## 29. Wave 3 Deployment Readiness

| Migration | File | Schema change | Tracked in git | Applied to production | Safe to apply |
|-----------|------|--------------|---------------|----------------------|---------------|
| 080 | `migrations/080_constitutional_records.sql` | Creates `constitutional_records` table | YES | UNCONFIRMED | YES (additive, no data loss) |
| 081 | `migrations/081_obs_record_id_propagation.sql` | Adds nullable `obs_record_id TEXT` to `knowledge_validation_queue` | YES | UNCONFIRMED | YES (nullable column addition) |
| 082 | `migrations/082_domain_id_propagation.sql` | Adds nullable `domain_id TEXT` to `knowledge_validation_queue` | YES | UNCONFIRMED | YES (nullable column addition) |

**All three migrations are additive (new table / nullable column additions). No rollback schema is defined but none is needed — these additions do not modify existing columns or constraints.**

**Rollback plan:** Drop the new table / columns if issues arise. No data migration required (new structures, no existing data affected).

**`knowledge_validation_queue` table must exist** before 081 and 082 apply. If the table doesn't exist in production, 081 and 082 will fail. Verify `knowledge_validation_queue` exists before applying.

---

## 30. Blockers

| Blocker | Description | Resolution |
|---------|-------------|-----------|
| B-01 | Wave 4 bootstrap files not committed to git | Git commit (M-01) |
| B-02 | deliberation-registry.js T4-05 changes not committed | Git commit (M-02) |
| B-03 | Migrations 080-082 not confirmed applied to production | Apply migrations (M-05) |
| B-04 | `constitutional_records` table not confirmed in production | Resolved by B-03 |
| B-05 | `knowledge_validation_queue` must exist before migrations 081-082 | Verify before applying 081-082 |

---

## 31. Deferred Items

| Item | Description | Task |
|------|-------------|------|
| D-01 | PETL wiring (9 files in lib/runtime/) | T4-PETL task |
| D-02 | Double-gate deduplication (civilization-kernel + PETL overlap) | T4-PETL task |
| D-03 | rt04-bootstrap.js and rt16-bootstrap.js wiring into bootstrap chain | Future wiring task |
| D-04 | Removal of 4 unreachable lib/runtime files | Post-T4-PETL cleanup |
| D-05 | governance-contract.js missing validator scripts (RISK-3) | Investigation task |
| D-06 | pg_helpers.js importer migration | Cleanup task |
| D-07 | Ruflo swarm memory (.swarm/memory.db) | Ruflo scope |
| D-08 | Wave 5 constitutional activation | After production verified |
| D-09 | L-T4-06-02 LOST terminal status schema resolution | Future Wave |
| D-10 | RT-08 ConsequenceObservationRecord implementation | Wave 5+ |
| D-11 | OAR entry lifecycle_state update on OAR-TSR delivery | Wave 5+ |
| D-12 | Schema-level RLS on constitutional_records | Security hardening |

---

## 32. Risks

| Risk | Severity | Description |
|------|----------|-------------|
| R-01 | HIGH | PETL wired without double-gate analysis → every request passes two governance gates |
| R-02 | MEDIUM | constitutional_records migration not applied before Wave 4 code deployed → all bootstrap writes silently fail |
| R-03 | MEDIUM | Missing governance validator scripts → governance-contract.js enforcement gap |
| R-04 | LOW | routes/finance.js + src/routes/finance.js collision if sub-prefix rule violated |
| R-05 | LOW | deliberation-registry.js pre-T4-05 version in git → production runs without dom000001 wiring and without rt11 causal model |
| R-06 | LOW | Wave 4 bootstrap files (rt04, rt16) have no production trigger — they must be explicitly called |

---

## 33. Required Next Tasks

| Priority | Task | Description |
|----------|------|-------------|
| 1 | **GIT-COMMIT-W4** | Stage and commit all Wave 4 bootstrap files, test files, certification docs, and T4-05 deliberation-registry.js changes |
| 2 | **MIGRATION-APPLY-080-082** | Apply migrations 080, 081, 082 to production Supabase (verify knowledge_validation_queue first) |
| 3 | **PRODUCTION-DEPLOY** | Push HEAD to Render; verify constitutional_records accepts writes |
| 4 | **PRODUCTION-VERIFY** | Run production verification: confirm governance_records + constitutional_records both active |
| 5 | **CLASSIFY-MEMORY** | Classify governance-synthesizer.js and langchain-memory.js |
| 6 | **SUB-PREFIX-AUDIT** | Audit all overlapping route file names for sub-prefix compliance |
| 7 | **T4-PETL** | Scoped PETL wiring task (double-gate deduplication required first) |

---

## 34. One-APEX Conclusion

**APEX has one canonical platform path. The ONE APEX claim is TRUE subject to two operational prerequisites.**

The architecture is singular:
- ONE startup: `server.js`
- ONE governance gate: `middleware/civilization-kernel.js`
- ONE authority chain: `lib/kernel.js::kernelChain`
- ONE constitutional store: `lib/runtime/constitutional-store.js` → `constitutional_records`
- ONE memory aggregator: `lib/memory/gateway.js`
- ONE database: Supabase (two access patterns — JS API + pg.Pool — against same instance)

The divergences are operational (untracked files, unapplied migrations), not architectural. No competing runtime was found. No shadow constitutional path was found. No parallel startup was found.

**The gap between local-certified state and production state is a git and database operations gap, not an architectural gap.**

Closing that gap requires:
1. Git commit (M-01, M-02)
2. Migration apply (M-05)
3. Production deploy
4. Production verification

After these four steps, APEX operates as ONE PLATFORM, ONE SYSTEM, ONE APEX.

---

*Document produced by APEX AI OS — Claude Code (claude-sonnet-4-6). Post-Wave-4 One-APEX Convergence Investigation. Date: 2026-08-24.*
