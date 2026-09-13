# SUBSYSTEM-CONSTITUTIONAL-ATLAS
## APEX Repository — Complete Subsystem Inventory for Gate 2

---

## DOCUMENT IDENTIFICATION

| Field | Value |
|-------|-------|
| Document ID | SUBSYSTEM-CONSTITUTIONAL-ATLAS |
| Issuing Authority | Independent Constitutional Certification Authority |
| Date | 2026-07-27 |
| Baseline | APEX-CONSTITUTION-v1.0 |
| Purpose | Complete catalogue of every production subsystem for Wave 2 adoption planning |

---

## PART 1 — REPOSITORY STRUCTURE OVERVIEW

The APEX repository (`Scripts/`) contains the following major subsystem groups:

| Group | Directories/Files | Approximate Size | Constitutional Layer |
|-------|------------------|-----------------|---------------------|
| Constitutional Types (Wave 1) | `lib/constitutional-types/` | 18 files, ~600KB | COMPLETE (Wave 1) |
| Pre-Constitutional Constitution | `lib/constitution/`, `lib/runtime/` | ~100 files, ~600KB | OPERATIONAL, NOT TYPED |
| Reality Fabric | `lib/reality/` | 4 files, ~29KB | OPERATIONAL, NOT TYPED |
| Civilizational Decision | `civilisation/`, `lib/civilization/` | 8 files, ~80KB | OPERATIONAL, NOT TYPED |
| Memory Architecture | `lib/memory/` | 12+ files | OPERATIONAL, NOT TYPED |
| Intelligence | `lib/intelligence/` | 10+ files | OPERATIONAL, NOT TYPED |
| Cognitive | `lib/cognitive/` | 20+ files | OPERATIONAL, NOT TYPED |
| Agent System | `agent-system/` | 60+ files, ~700KB | PRE-CONSTITUTIONAL (Wave 4) |
| Route Layer | `routes/` | 44 files | PRE-CONSTITUTIONAL |
| Governance | `lib/governance.js`, `lib/runtime/governance-*.js` | ~100KB | OPERATIONAL, NOT TYPED |
| Database | `lib/pg_helpers.js`, `migrations/` | 80+ files | OPERATIONAL |
| Server | `server.js`, `middleware/` | ~500KB total | OPERATIONAL |

---

## PART 2 — SUBSYSTEM CATALOGUE

### SS-01 — Constitutional Type Layer (Wave 1 Output)

| Field | Value |
|-------|-------|
| Path | `lib/constitutional-types/` |
| Purpose | Formal constitutional object type definitions — 83 types across 16 runtimes |
| Status | COMPLETE (Wave 1 CERTIFIED) |
| Size | 18 files; ~600KB |
| Entry Point | `lib/constitutional-types/index.js` |
| Dependencies | `lib/constitutional-types/_utils.js` only (two-level DAG) |
| Constitutional Owner | All 16 runtimes (RT-01 through RT-16) |
| Wave 2 Integration | TO BE WIRED — no production code currently imports these types |
| Technical Debt | R-01: module.exports unfrozen; DOC-1: header count stale |
| Migration Complexity | LOW — already defined; needs callers |
| Risk | LOW |

### SS-02 — Pre-Constitutional Constitution System

| Field | Value |
|-------|-------|
| Path | `lib/constitution/` |
| Purpose | Operational constitutional enforcement: 23 principles, 7 categories. Each principle has `verify()` (behavioral) and `fingerprint()` (structural) functions |
| Status | OPERATIONAL. Used by lib/runtime/constitutional-gate.js |
| Size | ~70 files, ~350KB |
| Entry Point | `lib/constitution/index.js` (exports spec, driftDetector, evolutionManager, arbitrator, crisisManager, riskMonitor, steward, watchdog, accountability, escalationController, metaAccountability, + more) |
| Key Files | `spec.js` (22.2K), `authority-resistance.js` (5.9K), `modification-governor.js` (6.6K), `deception-detector.js` (6.1K), `risk-monitor.js` (4.9K), `evolution-manager.js` (7.9K), `drift-detector.js` (4.1K), `amendments.json` (450B) |
| Dependencies | `lib/clients` (Supabase); `fs`, `path`, `crypto` |
| Constitutional Owner | RT-02 (authority), RT-03 (kernel/enforcement), RT-06 (coherence) — functionally |
| Current Constitutional Coverage | Stage 1 (type coverage exists in Wave 1) but NOT YET WIRED to produce formal constitutional objects |
| Wave 2 Integration | PRIMARY TARGET — verify() outputs need to become ConstitutionalAuditRecord, ConstitutionalViolationRecord; enforcement decisions need to emit RejectionRecord, SuspensionNotice |
| Technical Debt | The pre-existing amendments.json (450B) conflicts semantically with the Wave 1 RT-16 AmendmentProposal type — these need reconciliation |
| Migration Complexity | HIGH — 70+ files, deep coupling to lib/runtime/ |
| Risk | MEDIUM-HIGH — any change risks breaking the working gate system |

### SS-03 — PETL (Pre-Execution Transaction Layer)

| Field | Value |
|-------|-------|
| Path | `lib/runtime/execution-transaction.js` + supporting files |
| Purpose | Every request must pass `begin()` before route handler executes. 5-state machine: PENDING → PREFLIGHT → COMMITTED → EXECUTING → FINALIZED (or ABORTED). Runs constitutional preflight, concurrency, invariant checks |
| Status | OPERATIONAL. Used in production request pipeline |
| Size | execution-transaction.js (19.5K / ~500 lines), + 7 supporting files |
| Key Supporting Files | `constitutional-preflight.js` (2.5K), `compensation-log.js` (2.6K), `concurrency-slot-manager.js` (2.9K), `invariant-compiler.js` (7.3K), `decision-lattice.js` (9.7K), `lattice-feedback-loop.js` (5.3K), `lattice-health-signal.js` (4.0K) |
| Dependencies | `lib/constitution/` (via constitutional-preflight); compensation-log, concurrency-slot-manager, invariant-compiler, decision-lattice |
| Constitutional Owner | RT-03 (Kernel Runtime) — PETL is the primary RT-03 operational implementation |
| Current Constitutional Coverage | Stage 1 — PETL produces no formal constitutional type objects; it enforces constitutionally but does not record KernelOperationManifest, RejectionRecord, etc. |
| Wave 2 Integration | W2-02 (PETL Step 2 fix) directly targets this. begin() should eventually produce a KernelOperationManifest (RT-03); abort() should produce a RejectionRecord (RT-03) |
| Technical Debt | PETL state machine and constitutional type state machines (RT-05 ObjectLifecycleRecord) are not connected |
| Migration Complexity | MEDIUM — well-structured; additive wiring is feasible without modification |
| Risk | HIGH — PETL is the innermost gate; any disruption affects all requests |

### SS-04 — Constitutional Gate

| Field | Value |
|-------|-------|
| Path | `lib/runtime/constitutional-gate.js` |
| Purpose | Per-request constitutional check before route handler. Uses 4 lib/constitution/ modules: authority-resistance, risk-monitor, modification-governor, deception-detector, confabulation-guard. Fail-CLOSED (timeout → DENY) |
| Status | OPERATIONAL |
| Size | 7.9K |
| Entry Point | `evaluate(ctx, options)` — synchronous; all constitution modules are pure functions |
| Dependencies | `lib/constitution/authority-resistance`, `risk-monitor`, `modification-governor`, `deception-detector`, `confabulation-guard` |
| Constitutional Owner | RT-03 (Kernel Runtime) |
| Current Constitutional Coverage | Stage 1 (types defined); functionally OPERATIONAL but produces no formal typed records |
| Wave 2 Integration | Gate evaluations should produce ConstitutionalAuditRecord (RT-04) or ConstitutionalViolationRecord (RT-04) |
| Technical Debt | Gate verdicts (ALLOW/WARN/RESTRICT/DENY) are not recorded in any formal constitutional object |
| Migration Complexity | LOW-MEDIUM — pure function; wrap output with audit record creation |
| Risk | MEDIUM — gate is on hot path; any latency increase from record creation is a concern |

### SS-05 — Governance Attestation Layer

| Field | Value |
|-------|-------|
| Path | `lib/runtime/governance-attestation.js` (10.7K) + `governance-compiler.js` (6.3K) + `governance-contract.js` (10.7K) + `governance-manifest.js` (4.3K) |
| Purpose | Proves compiled governance accurately represents declared governance. Computes coverage, integrity, source hashes. "Attestation is evidence. Not execution. Not enforcement." |
| Status | OPERATIONAL |
| Size | ~32KB total |
| Dependencies | governance-compiler, governance-contract, governance-manifest, recorder-policy |
| Constitutional Owner | RT-04 (Constitutional Governance Audit Runtime) |
| Current Constitutional Coverage | Stage 1 — attestation results not wrapped in ConstitutionalComplianceAttestation (RT-04) |
| Wave 2 Integration | Attestation output should produce ConstitutionalComplianceAttestation (RT-04) |
| Migration Complexity | LOW — attestation is already structured as evidence production; wrapping is additive |
| Risk | LOW |

### SS-06 — Reality Fabric

| Field | Value |
|-------|-------|
| Path | `lib/reality/fabric.js` + `gates.js` + `reality_loop.js` + `self-model.js` |
| Purpose | 13-stage lifecycle for reality claims: potential → emergent → observed → verified → contested → revised → deprecated → superseded → validated → integrated → embedded → critical → evolved. 9-dimensional health scoring |
| Status | OPERATIONAL. Claims persist to Supabase |
| Size | ~29KB total |
| Entry Point | `fabric.js` — `claimReality()`, `advanceClaim()`, `scoreRealityHealth()` |
| Dependencies | `lib/clients` (Supabase) |
| Constitutional Owner | RT-08 (Observation Runtime) — `ObservationRecord` is the formal type equivalent |
| Current Constitutional Coverage | Stage 1. The 13-stage fabric lifecycle is more granular than RT-08's ObservationRecord |
| Architectural Tension | RT-08's `ObservationRecord` has a simpler lifecycle than the 13-stage fabric. Wave 2 must decide whether to: (a) map fabric stages to ObservationRecord lifecycle_state values, or (b) treat fabric claims as the detailed substrate with ObservationRecord as the formal typed summary |
| Migration Complexity | MEDIUM — fabric has Supabase persistence; adding RT-08 type wrapping is additive |
| Risk | MEDIUM |

### SS-07 — Civilizational Decision and Consensus System

| Field | Value |
|-------|-------|
| Path | `civilisation/consensus.js` (11.0K), `civilisation/clock.js`, `civilisation/contract-validator.js`, `civilisation/genome-validator.js`, `civilisation/shadow-registry.js`, `civilisation/domain-loader.js` |
| Purpose | Multi-domain constitutional consensus: PENDING → APPROVED/REJECTED/EXPIRED. Majority quorum (5 of 9 domains). 48-hour expiry. Manages constitutional amendments and governed operations |
| Status | OPERATIONAL. Persists to Supabase `consensus_sessions` table |
| Size | ~47KB total |
| Entry Point | `civilisation/consensus.js` |
| Dependencies | Supabase client (lazy); filesystem fallback in `.civilisation/consensus/` |
| Constitutional Owner | RT-11 (Civilization Intelligence Runtime) + RT-16 (Amendment Runtime) |
| Current Constitutional Coverage | Stage 1. `consensus.js` is the pre-constitutional implementation of what RT-11's DeliberationRecord and RT-16's AmendmentProposal will formally type |
| Critical Finding | `civilisation/amendments.json` (450B) exists as a pre-constitutional amendment tracker. RT-16's AmendmentRegistry type must eventually replace or wrap this |
| Migration Complexity | MEDIUM — Supabase persistence exists; needs formal type wrapping |
| Risk | MEDIUM |

### SS-08 — Memory Architecture

| Field | Value |
|-------|-------|
| Path | `lib/memory/` |
| Purpose | Multi-layer memory: working memory, episodic, semantic, procedural, decision, strategic, skill, knowledge graph, founder memory, cache |
| Status | OPERATIONAL |
| Size | 12+ files |
| Key Files | `gateway.js` (W2-01 target), `working-memory.js`, `knowledge-graph.js`, `decision-memory.js`, `strategic-memory.js`, `procedural-memory.js`, `founder-memory.js`, `skill-memory.js`, `cache.js`, `improvement-engine.js`, `memory-governor.js` |
| Constitutional Owner | RT-07 (Memory Runtime) |
| Wave 2 Integration | W2-01 adds `getHistoricalState()` to gateway.js → returns HistoricalStateQueryResult (RT-07) |
| Technical Debt | Multiple memory types (episodic, semantic, etc.) operate independently without a formal unified HistoricalStateRecord |
| Migration Complexity | LOW-MEDIUM (gateway.js) to MEDIUM-HIGH (full memory federation) |
| Risk | MEDIUM |

### SS-09 — Intelligence System

| Field | Value |
|-------|-------|
| Path | `lib/intelligence/` |
| Purpose | Context composition, decision intelligence, knowledge validation, contradiction detection, graph reasoning, memory lifecycle, organizational learning, skill evolution, planning influence, decision outcomes, value creation, executive performance, reality loop |
| Status | OPERATIONAL |
| Size | ~140KB across 13+ files |
| Key Files | `context-composer.js`, `decision-intelligence.js`, `knowledge-validator.js`, `contradiction-engine.js`, `graph-reasoning-engine.js`, `memory-lifecycle-engine.js`, `memory-retrieval-engine.js` |
| Constitutional Owner | RT-09 (Knowledge Runtime) + RT-10 (Intelligence Runtime) |
| Wave 2 Integration | `knowledge-validator.js` output → KnowledgeRecord (RT-09); `contradiction-engine.js` → ContradictionRecord (RT-09) |
| Migration Complexity | MEDIUM-HIGH |
| Risk | MEDIUM |

### SS-10 — Cognitive System

| Field | Value |
|-------|-------|
| Path | `lib/cognitive/` |
| Purpose | 14+ reasoning and behavior engines: retrieval-policy, behavior-modification, reasoning-strategy, planning-strategy, execution-strategy, confidence-aware-autonomy, meta-reasoning, cognitive-performance, cognitive-evolution, organizational-intelligence, plus runtime controllers and effectiveness engines |
| Status | OPERATIONAL |
| Size | ~200KB across 20+ files |
| Entry Point | `lib/cognitive/index.js` |
| Key Sub-Paths | `lib/cognitive/runtime/` (4 runtime controllers), `lib/cognitive/benchmarks/`, `lib/cognitive/effectiveness/` |
| Constitutional Owner | RT-10 (Intelligence Runtime) + RT-11 (Civilization Intelligence Runtime) |
| Technical Debt | Cognitive evolution engine and organizational-intelligence-engine overlap semantically with RT-10's DomainUnderstandingModel |
| Migration Complexity | HIGH — many interconnected engines; additive wrapping is complex |
| Risk | MEDIUM-HIGH |

### SS-11 — Agent System

| Field | Value |
|-------|-------|
| Path | `agent-system/` |
| Purpose | Full AI agent execution environment: orchestration, planning, execution, memory, browser automation, cloud autopilot, email, finance, routine, reflection, mastra integration |
| Status | OPERATIONAL. Pre-constitutional environment |
| Size | 60+ files, ~700KB |
| Key Files | `orchestrator.js` (115.3K, 1995 lines), `improvement-executor.js` (51.1K), `browser-agent.js` (51.7K), `master-orchestrator.js` (52.8K), `mastra_agents.js` (25.3K) |
| Constitutional Owner | Multiple runtimes (deferred to Wave 4) |
| Wave Assignment | WAVE 4 — explicitly deferred per I1-ARCHITECTURE §4.3 |
| Technical Debt | orchestrator.js is 1995 lines — likely overloaded, does too much |
| Migration Complexity | VERY HIGH — largest subsystem, heavily coupled to lib/ |
| Risk | HIGH — do not touch in Wave 2 |

### SS-12 — Governance System

| Field | Value |
|-------|-------|
| Path | `lib/governance.js` (46.5K), `lib/governance-meta.js` (58B), `lib/governance-probe.js` (9.3K), `lib/runtime/governance-attestation.js`, `lib/runtime/governance-compiler.js`, `lib/runtime/governance-contract.js`, `lib/runtime/governance-manifest.js`, `lib/runtime/governance-traceability.js`, `lib/runtime/governance-reproducibility.js` |
| Purpose | Level 9 Governance — central write module for all 40 autonomous OS domains. Records execution graphs, events, system telemetry. governance-meta.js is nearly empty (58B stub) |
| Status | OPERATIONAL (lib/governance.js); STUB (lib/governance-meta.js) |
| Size | ~165KB total |
| Constitutional Owner | RT-05 (Reality Fabric Runtime) — ChangeRecord; RT-04 (Audit) — ConstitutionalAuditRecord |
| Critical Finding | lib/governance-meta.js exports `{version: '1.0.0', domains: 40}` — 58 bytes. This is a placeholder. The "40 domains" model (operational governance) does not map to the "16 runtimes" model (constitutional governance). This impedance mismatch must be resolved in Wave 2 strategy |
| Technical Debt | lib/governance.js is 46.5K — oversized; writes to 40+ Supabase tables; "fire-and-forget" writes that "never crash the caller" create silent failure risks |
| Migration Complexity | VERY HIGH — deeply connected to DB schema; 40-domain model vs 16-runtime model |
| Risk | HIGH |

### SS-13 — Audit System

| Field | Value |
|-------|-------|
| Path | `lib/audit/decision_ledger.js` (196 lines), `lib/runtime/learning-ledger.js` (10.2K), `lib/runtime/outcome-registry.js` (12.2K), `lib/runtime/outcome-lineage.js` (10.6K) |
| Purpose | Decision audit trail, learning outcomes, outcome lineage tracking |
| Status | OPERATIONAL |
| Constitutional Owner | RT-04 (Constitutional Governance Audit Runtime) |
| Wave 2 Integration | decision_ledger.js outputs → ConstitutionalAuditRecord (RT-04); outcome-registry.js → ObservedConsequenceRecord (RT-14) |
| Migration Complexity | MEDIUM |
| Risk | LOW-MEDIUM |

### SS-14 — Observation and Health System

| Field | Value |
|-------|-------|
| Path | `lib/observer-health/index.js` (7.1K) |
| Purpose | System health observation |
| Status | OPERATIONAL |
| Constitutional Owner | RT-08 (Observation Runtime) |
| Migration Complexity | LOW |
| Risk | LOW |

### SS-15 — Founder and Identity System

| Field | Value |
|-------|-------|
| Path | `lib/founder/` (8 files: profile, alignment-engine, anti-goal-monitor, opportunity-scorer, state-tracker, context-provider, graph-data, graph.js) |
| Purpose | Founder profile management, alignment monitoring, opportunity scoring, graph-based state tracking |
| Status | OPERATIONAL |
| Constitutional Owner | RT-01 (Identity Runtime) |
| Wave 2 Integration | Founder profile → ActorProfile (RT-01) formal typing |
| Migration Complexity | MEDIUM |
| Risk | LOW-MEDIUM |

### SS-16 — Domain/Empire System

| Field | Value |
|-------|-------|
| Path | `lib/empire/` (graph-data.js, graph.js, health.js, index.js), `lib/ministry/` |
| Purpose | Multi-domain empire graph, domain health monitoring |
| Status | OPERATIONAL |
| Constitutional Owner | RT-15 (Domain Runtime) |
| Migration Complexity | MEDIUM |
| Risk | LOW |

### SS-17 — Route Layer

| Field | Value |
|-------|-------|
| Path | `routes/` (44 files) |
| Purpose | Express route handlers for all 44 API domains |
| Status | OPERATIONAL |
| Size | ~44 files, estimated ~500KB total |
| Key Files | `routes/civilization.js` (27.7K), `routes/governance.js`, `routes/intelligence.js`, `routes/memory.js`, `routes/cognitive.js`, `routes/agents.js`, `routes/observatory.js`, `routes/reality.js`, `routes/reality-architecture.js` |
| Constitutional Owner | Multiple runtimes depending on route purpose |
| Wave 2 Integration | Routes do not need to be rewritten; they need their handlers to emit constitutional type objects |
| Technical Debt | 44 routes with no constitutional type emission; `routes/civilization.js` (27.7K) is likely overloaded |
| Migration Complexity | LOW per route (additive) to HIGH for civilization.js |
| Risk | MEDIUM (some routes serve as primary API for constitutional operations) |

### SS-18 — Middleware Layer

| Field | Value |
|-------|-------|
| Path | `middleware/` |
| Purpose | Express middleware: civilization-kernel (26.6K), express-config (1.4K), rate-limiting (806B), request-context (3.1K), ownership.yaml (366B) |
| Status | OPERATIONAL |
| Key Finding | `middleware/civilization-kernel.js` (26.6K) is the largest middleware. Its name suggests constitutional relevance but it sits in middleware/ not lib/runtime/ — its relationship to the constitutional gate system needs investigation |
| Constitutional Owner | RT-03 (Kernel Runtime) |
| Migration Complexity | MEDIUM-HIGH (civilization-kernel.js) |
| Risk | MEDIUM |

### SS-19 — Database Layer

| Field | Value |
|-------|-------|
| Path | `lib/pg_helpers.js` (23.8K), `lib/pg_database.js` (2.0K), `lib/storage.js` (3.0K), `lib/clients.js` (1.8K), `migrations/` (79 SQL files) |
| Purpose | PostgreSQL access layer, Supabase client initialization, Supabase Storage, migration management |
| Status | OPERATIONAL |
| Size | ~30KB helpers; 79 migrations |
| Key Finding | No migration files for constitutional type tables. 79 existing migrations cover 40+ domain tables but none cover constitutional object type persistence. Wave 2 wiring tasks that require DB backing must create new migrations |
| Constitutional Owner | All runtimes (shared infrastructure) |
| Migration Complexity | LOW (adding new tables is additive; existing tables are unaffected) |
| Risk | LOW (schema additions only) |

### SS-20 — Scheduler/Cron

| Field | Value |
|-------|-------|
| Path | `lib/cron-scheduler.js` (52.5K), `lib/cron-logger.js`, `lib/integrity-crons.js` (9.3K) |
| Purpose | Agent schedule management, cron-based task execution, integrity maintenance |
| Status | OPERATIONAL |
| Constitutional Owner | RT-03 (Kernel Runtime) — scheduled execution is kernel-mediated |
| Migration Complexity | MEDIUM |
| Risk | MEDIUM (cron-scheduler.js is 52.5K and likely does too much) |

### SS-21 — Server Entry Point

| Field | Value |
|-------|-------|
| Path | `server.js` (474 lines) |
| Purpose | Main Express server: env validation, Sentry error tracking, route mounting, agent initialization, WebSocket setup, graceful shutdown |
| Status | OPERATIONAL |
| Key Observations | (1) Imports from both agent-system/ and lib/ at startup — the two-environment boundary is blurred at server startup; (2) Imports 30+ modules at top level — startup dependency chain is very wide; (3) Zero imports from lib/constitutional-types/ |
| Constitutional Owner | RT-03 (Kernel Runtime) — server startup is the kernel boot sequence |
| Wave 2 Integration | The server startup should eventually produce a KernelOperationManifest on boot |
| Migration Complexity | LOW (additive startup type emission) |
| Risk | LOW |

### SS-22 — Additional Lib Subsystems (Phase 3+ Candidates)

The following `lib/` subdirectories exist and require individual assessment in Wave 2/3 planning:

| Subsystem | Path | Probable Constitutional Owner | Priority |
|-----------|------|------------------------------|----------|
| Attention | `lib/attention/` | RT-08 (Observation) | Wave 3 |
| Beliefs | `lib/beliefs/` | RT-09 (Knowledge) | Wave 2 |
| Certification | `lib/certification/` | RT-04 (Audit) | Wave 2 |
| Civilization | `lib/civilization/` | RT-11/RT-12 | Wave 2 |
| Constitution | `lib/constitution/` | RT-03 | Wave 2 (SS-02) |
| Council | `lib/council/` | RT-11 (Deliberation) | Wave 2 |
| Counterfactual | `lib/counterfactual/` | RT-13 (Action/Projection) | Wave 3 |
| Economics | `lib/economics/` | RT-15 (Domain) | Wave 3 |
| Entities | `lib/entities/` | RT-01 (Identity) | Wave 2 |
| Epistemic Capital | `lib/epistemic-capital/` | RT-09 (Knowledge) | Wave 3 |
| Evolution | `lib/evolution/` | RT-05 (Reality Fabric) | Wave 2 |
| Executive | `lib/executive/` | RT-12 (Decision) | Wave 2 |
| Finance | `lib/finance/` | RT-15 (Domain) | Wave 3 |
| Goals | `lib/goals/` | RT-11 (Deliberation) | Wave 3 |
| Health | `lib/health/` | RT-04 (Audit) | Wave 2 |
| Integrity | `lib/integrity/` | RT-06 (Coherence) | Wave 2 |
| Intent | `lib/intent/` | RT-11 (Deliberation) | Wave 3 |
| Learning | `lib/learning/` | RT-10 (Intelligence) | Wave 2 |
| Mental Models | `lib/mental-models/` | RT-09/RT-10 | Wave 3 |
| Meta-Model | `lib/meta-model/` | RT-09 (Knowledge) | Wave 3 |
| Ministry | `lib/ministry/` | RT-15 (Domain) | Wave 3 |
| Models | `lib/models/` | Multiple | Wave 2 |
| Orchestration | `lib/orchestration/` | RT-03 (Kernel) | Wave 2 |
| Reality | `lib/reality/` | RT-08 (Observation) | Wave 2 (SS-06) |
| Registry | `lib/registry/` | RT-01/RT-02 | Wave 2 |
| Simulation | `lib/simulation/` | RT-13 (Action/Projection) | Wave 3 |
| State | `lib/state/` | RT-07 (Memory) | Wave 2 |
| Synthetic | `lib/synthetic/` | RT-09 (Knowledge) | Wave 3 |
| Telemetry | `lib/telemetry/` | RT-04 (Audit) | Wave 2 |
| Temporal | `lib/temporal/` | RT-07 (Memory) | Wave 2 |
| Understanding | `lib/understanding/` | RT-10 (Intelligence) | Wave 2 |

---

## PART 3 — ARCHITECTURAL DEBT SUMMARY

### 3.1 Structural Debt

| Debt Item | Location | Severity | Description |
|-----------|----------|----------|-------------|
| DEBT-01 | agent-system/orchestrator.js | HIGH | 1995 lines — clearly overloaded; multiple responsibilities in a single file |
| DEBT-02 | lib/agent-command-handler.js | HIGH | 66.1K — oversized; should be decomposed |
| DEBT-03 | lib/cron-scheduler.js | MEDIUM | 52.5K — likely does too much |
| DEBT-04 | lib/governance.js | MEDIUM | 46.5K, 40-domain model — doesn't map to 16-runtime constitutional model |
| DEBT-05 | lib/governance-meta.js | MEDIUM | 58-byte stub serving as a module dependency — placeholder that was never implemented |
| DEBT-06 | lib/agent-task-cycle.js | MEDIUM | 55.0K — oversized |
| DEBT-07 | lib/constitutional-types/ | LOW | module.exports unfrozen (R-01) |

### 3.2 Constitutional Coverage Debt

| Debt Item | Operational Layer | Missing Formal Layer |
|-----------|------------------|---------------------|
| Gate verdicts | lib/runtime/constitutional-gate.js (operational) | ConstitutionalAuditRecord / ConstitutionalViolationRecord (RT-04) |
| PETL transactions | lib/runtime/execution-transaction.js (operational) | KernelOperationManifest, RejectionRecord (RT-03) |
| Reality claims | lib/reality/fabric.js 13-stage lifecycle (operational) | ObservationRecord (RT-08) |
| Civilizational consensus | civilisation/consensus.js PENDING/APPROVED/REJECTED (operational) | DeliberationRecord, CivilizationalDecisionProposal (RT-11) |
| Amendments | civilisation/amendments.json stub | AmendmentProposal, AmendmentRegistry (RT-16) |
| Governance attestation | lib/runtime/governance-attestation.js (operational) | ConstitutionalComplianceAttestation (RT-04) |
| Learning outcomes | lib/runtime/learning-ledger.js (operational) | DomainUnderstandingModel (RT-10) |

### 3.3 Impedance Mismatches

| Mismatch | Description | Resolution Path |
|----------|-------------|-----------------|
| M-01 | 40-domain model (governance.js) vs 16-runtime model (constitutional) | Map domains to runtimes in Wave 2 strategy |
| M-02 | 13-stage fabric lifecycle vs RT-08 ObservationRecord lifecycle | Either map or treat as substrate/summary pair |
| M-03 | 9-domain consensus (civilisation/) vs RT-11 deliberation model | Map existing domains to constitutional authority structure |
| M-04 | lib/constitution/ 23 principles vs formal constitutional types | lib/constitution/ produces inputs TO formal types; not in conflict |

---

*Document produced by Independent Constitutional Certification Authority.*
*Date: 2026-07-27. Baseline: APEX-CONSTITUTION-v1.0.*
