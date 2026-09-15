# T4-INV — RUNTIME REALITY INVENTORY
**Date:** 2026-08-20
**HEAD:** 748fc83
**Branch:** main

---

## 1. Executive Summary

`lib/runtime/` is a 34-file, 6 408-line module cluster serving two structurally separate functions: a **Constitutional Execution Pipeline** (PETL) that gates every HTTP request, and a **Post-Execution Observability Chain** that runs fire-and-forget after each agent task completes. The two functions are connected only through `lib/runtime/assembler.js`, which is lazily required by `agent-system/orchestrator.js`.

Key finding: **the PETL cluster (`petl-middleware`, `execution-transaction`, `decision-lattice`, `concurrency-slot-manager`, `invariant-compiler`, `constitutional-preflight`, `lattice-feedback-loop`, `lattice-health-signal`, `compensation-log`) is fully implemented but not wired into `server.js`.** The current production gate is `middleware/civilization-kernel.js`, which uses `lib/runtime/constitutional-gate` and `lib/runtime/execution-context` directly but bypasses PETL entirely. `petl-middleware.js` documents its own intended usage in a comment and has zero real importers.

The 10-module observability chain (managed by `assembler.js`) is wired and runs non-blocking in production after every orchestrator task. All 10 observability modules are pure functions with no DB access, no model calls, and no state side effects beyond in-memory rolling windows.

`constitutional-store.js` is the most widely consumed runtime file (18+ production callers across `lib/civilization/`, `lib/constitution/`, `lib/knowledge/`, `lib/memory/`, `lib/reality/`, `lib/registry/`, and `lib/runtime/execution-transaction.js`).

RT-14 (the Reflection Runtime) is referenced as NOT YET OPERATIONAL in at least 5 civilization files. The observability cluster provides the raw evidence RT-14 would consume, making it the primary precondition for T4-01.

---

## 2. Repository Baseline

| Item | Value |
|---|---|
| Branch | main |
| HEAD | 748fc83 |
| Working tree | Clean (architecture/index.yaml auto-generated, irrelevant) |
| lib/runtime file count | **34 files, 0 subdirectories, 6 408 lines total** |
| Largest file | execution-transaction.js (581 lines, 23.9 KB) |
| Smallest file | constitutional-store.js (35 lines, 1.3 KB) |

Relevant paths:
- `C:\Users\arwwo\Desktop\APEX\Scripts\lib\runtime\` — the 34 files
- `C:\Users\arwwo\Desktop\APEX\Scripts\middleware\civilization-kernel.js` — actual production gate
- `C:\Users\arwwo\Desktop\APEX\Scripts\agent-system\orchestrator.js` — calls assembler
- `C:\Users\arwwo\Desktop\APEX\Scripts\agent-system\master-orchestrator.js` — calls constitutional-gate directly
- `C:\Users\arwwo\Desktop\APEX\Scripts\lib\runtime\constitutional-store.js` — Wave 3 persistence layer

---

## 3. lib/runtime File Inventory

### Tier 1: Constitutional Execution Pipeline (PETL) — Core

| # | File | Lines | Primary Purpose | Key Exports | External Importers | Constitutional Domain |
|---|---|---|---|---|---|---|
| 1 | `execution-transaction.js` | 581 | Core PETL engine: begin/commit/abort/finalize transaction state machine for every request | `begin`, `commit`, `finalize`, `abort`, `getTransaction` | `petl-middleware.js` only | EXECUTION |
| 2 | `petl-middleware.js` | 124 | Express middleware gate: enforces PETL on every request before route handlers execute | `petlGate`, `petlErrorHandler`, `assertTransaction`, `BYPASS_PATHS` | **NONE (not wired to server.js)** | MIDDLEWARE |
| 3 | `decision-lattice.js` | 219 | Unified 3-signal decision engine: CONSTITUTION → FM → DT with composite formula and drift detection | `evaluate`, `getDriftStats`, `_reset` | `execution-transaction.js` only | DECISION |
| 4 | `concurrency-slot-manager.js` | 107 | In-memory TTL slot manager preventing double-submission of identical operations | `deriveKey`, `reserve`, `release`, `isFree`, `owner`, `getStats`, `_reset` | `execution-transaction.js` only | EXECUTION |
| 5 | `invariant-compiler.js` | 178 | Converts preflight stage verdicts into executable invariant predicates; evaluates them per-transaction | `compile`, `evaluate`, `INVARIANT` | `execution-transaction.js` only | INVARIANT |
| 6 | `constitutional-preflight.js` | 71 | PETL-compatible wrapper for constitutional-gate; maps ALLOW/WARN/RESTRICT/DENY to passed:bool | `run` | `execution-transaction.js` only | CONSTITUTIONAL |
| 7 | `compensation-log.js` | 86 | Immutable append-only in-memory log of compensation markers per failed transaction | `record`, `getByTx`, `hasCompensations`, `count`, `stats`, `TYPES`, `_reset` | `execution-transaction.js` only | EXECUTION |
| 8 | `lattice-feedback-loop.js` | 141 | Append-only in-memory recorder: feeds finalized PETL outcomes into drift metrics for FM+DT calibration | `record`, `getAll`, `getLast`, `getStats`, `_reset` | `execution-transaction.js` only | RECORDER |
| 9 | `lattice-health-signal.js` | 111 | Passive rolling health signal: 4 metrics (fmStabilityScore, dtStabilityScore, systemDriftIndex, constitutionPressureIndex) over last N transactions | `record`, `getHealthSnapshot`, `reset` | `execution-transaction.js`, `lattice-calibration-advisor.js` | RECORDER |

### Tier 2: Constitutional Gate and Context — Active in Production

| # | File | Lines | Primary Purpose | Key Exports | External Importers | Constitutional Domain |
|---|---|---|---|---|---|---|
| 10 | `constitutional-gate.js` | 215 | Runtime constitutional check (fail-closed, 400ms timeout): authority-resistance + risk-monitor + modification-governor + deception-detector + confabulation-guard | `evaluate`, `VERDICT` | `middleware/civilization-kernel.js`, `agent-system/master-orchestrator.js`, `routes/observatory.js`, `constitutional-preflight.js`, `scripts/verify-c06.js`, tests | CONSTITUTIONAL |
| 11 | `execution-context.js` | 163 | Single runtime context object for every APEX request: initializeContext, hydrateContext, finalizeContext, measureContext | `initializeContext`, `hydrateContext`, `finalizeContext`, `validateContext`, `measureContext` | `middleware/civilization-kernel.js`, `scripts/verify-c06.js` | EXECUTION |
| 12 | `constitutional-store.js` | 35 | T3-00 fire-and-forget write-only persistence to Supabase `constitutional_records` table via getSupabaseClient | `write` | **18+ production callers** (see Part 3) | PERSISTENCE |

### Tier 3: Governance Cluster — Internal/Test-only

| # | File | Lines | Primary Purpose | Key Exports | External Importers | Constitutional Domain |
|---|---|---|---|---|---|---|
| 13 | `governance-attestation.js` | 274 | Proves compiled governance accurately represents declared governance; writes attestation record to constitutional-store | `createGovernanceAttestation` | `governance-reproducibility.js`, `governance-traceability.js`, tests | GOVERNANCE |
| 14 | `governance-compiler.js` | 172 | Pure read-only transformation of governance declarations into a single deterministic compiled artifact | `compileGovernance` | `governance-attestation.js`, `governance-reproducibility.js`, `governance-traceability.js` | GOVERNANCE |
| 15 | `governance-contract.js` | 173 | Static compiled governance contract — all APEX governance rules as pure data, no logic | `CONTRACT` | `governance-compiler.js`, `governance-attestation.js`, `governance-traceability.js` | GOVERNANCE |
| 16 | `governance-manifest.js` | 91 | Authoritative module tier registry (EXECUTION/DECISION/MIDDLEWARE/INVARIANT/RECORDER/OBSERVABILITY/GOVERNANCE) | `TIER`, `MODULES`, `INVARIANTS` | `governance-compiler.js`, `governance-attestation.js`, `governance-traceability.js` | GOVERNANCE |
| 17 | `governance-reproducibility.js` | 121 | Proves governance artifacts can be regenerated from source and produce identical outputs | `createReproducibilityProof` | `governance-traceability.js` | GOVERNANCE |
| 18 | `governance-traceability.js` | 284 | Deterministic provenance map between all governance elements and origin sources | `createTraceabilityMap` | **NONE outside lib/runtime** | GOVERNANCE |
| 19 | `recorder-policy.js` | 78 | RECORDER_PURITY_INVARIANT: pure data defining allowed/forbidden export names and import tiers for RECORDER modules | `POLICY`, `ALLOWED_EXPORT_NAMES`, `FORBIDDEN_EXPORT_NAMES`, `ALLOWED_IMPORT_TIERS`, `FORBIDDEN_IMPORT_TIERS` | `governance-compiler.js`, `governance-attestation.js`, `governance-traceability.js` | GOVERNANCE |

### Tier 4: Observability Chain (10 modules) — Active in Production via assembler

| # | File | Lines | Primary Purpose | Key Exports | External Importers | Constitutional Domain |
|---|---|---|---|---|---|---|
| 20 | `assembler.js` | 182 | Runs all 10 observability modules non-blocking after each task; each module individually wrapped so failures don't cascade | `runObservabilityChain` | `agent-system/orchestrator.js` (lazy require, setImmediate) | OBSERVABILITY |
| 21 | `execution-evaluator.js` | 195 | Pure in-memory rolling window: recordOutcome + evaluate execution quality metrics | `recordOutcome`, `evaluate`, `evaluateAgainst`, `reset`, `getEvaluationSnapshot` | `assembler.js` | OBSERVABILITY |
| 22 | `decision-benchmark.js` | 166 | Pure: statistical quality benchmarks over finalized outcomes (mean, stddev, regret index, consistency) | `benchmark`, `createContext` | `assembler.js` | OBSERVABILITY |
| 23 | `counterfactual-evaluator.js` | 194 | Pure: alternative policy comparison (same/conservative/aggressive/constitutionOnly/founderOnly) | `evaluate`, `createContext` | `assembler.js` | OBSERVABILITY |
| 24 | `outcome-registry.js` | 295 | Pure: immutable descriptive datasets from finalized outcomes; no imports, no persistence | `buildRegistry`, `createContext` | `assembler.js`, `outcome-lineage.js` | OBSERVABILITY |
| 25 | `outcome-lineage.js` | 242 | Pure: deterministic provenance chains for registry evidence; imports only outcome-registry | `buildLineage`, `createContext` | `assembler.js` | OBSERVABILITY |
| 26 | `improvement-lab.js` | 266 | Pure: descriptive improvement candidate analysis from evidence; no imports | `analyze`, `createContext` | `assembler.js` | OBSERVABILITY |
| 27 | `strategy-engine.js` | 302 | Pure: converts evidence into ranked strategic initiatives; no imports | `formulate`, `createContext` | `assembler.js` | OBSERVABILITY |
| 28 | `learning-ledger.js` | 237 | Pure: immutable learning records from historical evidence; no imports | `buildLedger`, `createContext` | `assembler.js` | OBSERVABILITY |
| 29 | `adaptation-simulator.js` | 180 | Pure: hypothetical future trajectory simulation from learning evidence; no imports | `simulate`, `createContext` | `assembler.js` | OBSERVABILITY |
| 30 | `decision-provenance.js` | 195 | Pure: reconstructs complete decision ancestry from pipeline stages; no imports | `buildProvenance`, `createContext` | `assembler.js` | OBSERVABILITY |

### Tier 5: Observability / Calibration — Internal only

| # | File | Lines | Primary Purpose | Key Exports | External Importers | Constitutional Domain |
|---|---|---|---|---|---|---|
| 31 | `lattice-calibration-advisor.js` | 156 | Zero-authority calibration advisor: reads health snapshot, produces frozen advisory for human operator | `getCalibrationAdvice` | **NONE (imports lattice-health-signal but nothing imports it)** | OBSERVABILITY |
| 32 | `execution-replay.js` | 139 | Pure deterministic reconstruction of finalized outcomes for comparison; imports only crypto | `createReplay`, `simulate`, `compare` | **NONE** | OBSERVABILITY |
| 33 | `policy-experiment.js` | 204 | Pure: descriptive evaluation of candidate policies against historical data; no imports | `experiment`, `createContext` | **NONE** | OBSERVABILITY |
| 34 | `resource-planner.js` | 231 | Pure: hypothetical effort allocation across strategic initiatives; no imports | `plan`, `createContext` | **NONE** | OBSERVABILITY |

---

## 4. Runtime Responsibility Classification

### CANONICAL_EXECUTION_RUNTIME (wired, production-active)
- `constitutional-gate.js` — hot path gate in civilization-kernel (every request)
- `execution-context.js` — hot path context builder in civilization-kernel (every request)
- `constitutional-store.js` — persistence layer (18+ callers, fire-and-forget)
- `assembler.js` — observability chain orchestrator (after every orchestrator task)

### PETL_CLUSTER_BUILT_NOT_WIRED (implemented, not mounted in server.js)
- `petl-middleware.js` — middleware exists, not in server.js middleware stack
- `execution-transaction.js` — state machine exists, only reachable via petl-middleware
- `decision-lattice.js` — evaluator exists, only reachable via execution-transaction
- `constitutional-preflight.js` — PETL stage, only reachable via execution-transaction
- `concurrency-slot-manager.js` — slot tracking, only reachable via execution-transaction
- `invariant-compiler.js` — invariant evaluator, only reachable via execution-transaction
- `compensation-log.js` — failure log, only reachable via execution-transaction
- `lattice-feedback-loop.js` — recorder, only reachable via execution-transaction
- `lattice-health-signal.js` — health metrics, reachable via execution-transaction + lattice-calibration-advisor

### OBSERVABILITY_CHAIN_ACTIVE (wired via assembler, fire-and-forget)
- `execution-evaluator.js`, `decision-benchmark.js`, `counterfactual-evaluator.js`
- `outcome-registry.js`, `outcome-lineage.js`, `improvement-lab.js`
- `strategy-engine.js`, `learning-ledger.js`, `adaptation-simulator.js`, `decision-provenance.js`

### GOVERNANCE_INFRASTRUCTURE (internal cluster, test-verified, not externally wired)
- `governance-attestation.js` (test-covered)
- `governance-compiler.js` (imported by attestation)
- `governance-contract.js` (imported by compiler, attestation, traceability)
- `governance-manifest.js` (imported by compiler, attestation, traceability)
- `governance-reproducibility.js` (imported by traceability)
- `governance-traceability.js` (no external importers)
- `recorder-policy.js` (imported by compiler, attestation, traceability)

### OBSERVABILITY_UNREACHABLE (no importers at all in production or tests)
- `lattice-calibration-advisor.js` — advisor with no consumer
- `execution-replay.js` — replay engine with no consumer
- `policy-experiment.js` — experiment module with no consumer
- `resource-planner.js` — planner with no consumer

---

## 5. Import / Reachability Analysis

| File | Reachability Status | Notes |
|---|---|---|
| `constitutional-gate.js` | PRODUCTION | civilization-kernel, master-orchestrator, observatory route |
| `execution-context.js` | PRODUCTION | civilization-kernel (every request) |
| `constitutional-store.js` | PRODUCTION | 18+ callers across lib/civilization, lib/constitution, lib/knowledge, lib/memory, lib/reality, lib/registry |
| `assembler.js` | PRODUCTION | orchestrator.js lazy-require via setImmediate |
| `execution-evaluator.js` | PRODUCTION | via assembler (post-task, fire-and-forget) |
| `decision-benchmark.js` | PRODUCTION | via assembler |
| `counterfactual-evaluator.js` | PRODUCTION | via assembler |
| `outcome-registry.js` | PRODUCTION | via assembler |
| `outcome-lineage.js` | PRODUCTION | via assembler (also imports outcome-registry) |
| `improvement-lab.js` | PRODUCTION | via assembler |
| `strategy-engine.js` | PRODUCTION | via assembler |
| `learning-ledger.js` | PRODUCTION | via assembler |
| `adaptation-simulator.js` | PRODUCTION | via assembler |
| `decision-provenance.js` | PRODUCTION | via assembler |
| `petl-middleware.js` | BUILT_NOT_WIRED | code complete, usage documented in comment, not mounted in server.js |
| `execution-transaction.js` | BUILT_NOT_WIRED | only importer is petl-middleware |
| `decision-lattice.js` | BUILT_NOT_WIRED | only importer is execution-transaction |
| `constitutional-preflight.js` | BUILT_NOT_WIRED | only importer is execution-transaction |
| `concurrency-slot-manager.js` | BUILT_NOT_WIRED | only importer is execution-transaction |
| `invariant-compiler.js` | BUILT_NOT_WIRED | only importer is execution-transaction |
| `compensation-log.js` | BUILT_NOT_WIRED | only importer is execution-transaction |
| `lattice-feedback-loop.js` | BUILT_NOT_WIRED | only importer is execution-transaction |
| `lattice-health-signal.js` | BUILT_NOT_WIRED* | imported by execution-transaction AND lattice-calibration-advisor; calibration-advisor itself has no importers |
| `governance-attestation.js` | TEST-ONLY | tested by governance-attestation-constitutional.test.js; internally used by governance-reproducibility, governance-traceability |
| `governance-compiler.js` | TEST-ONLY | no external callers; reached via governance-attestation from tests |
| `governance-contract.js` | TEST-ONLY | pure data; reached transitively |
| `governance-manifest.js` | TEST-ONLY | pure data; reached transitively |
| `governance-reproducibility.js` | TEST-ONLY | reached via governance-traceability which has no external callers |
| `governance-traceability.js` | UNREACHABLE | no external importers at all |
| `recorder-policy.js` | TEST-ONLY | reached via governance-compiler from tests |
| `lattice-calibration-advisor.js` | UNREACHABLE | no external importers |
| `execution-replay.js` | UNREACHABLE | no importers at all |
| `policy-experiment.js` | UNREACHABLE | no importers at all |
| `resource-planner.js` | UNREACHABLE | no importers at all |

---

## 6. Canonical Production Execution Graph

```
HTTP Request
     │
     ▼
server.js
  app.use(require('./middleware/civilization-kernel'))  ← PHASE 3: gate
     │
     ▼
middleware/civilization-kernel.js
  ec.initializeContext(req)            ← lib/runtime/execution-context.js   [PRODUCTION]
  gate.evaluate(ctx, watchdogOpts)     ← lib/runtime/constitutional-gate.js  [PRODUCTION]
  _writeGateRecord()                   → Supabase governance_records (direct via @supabase/supabase-js)
  ec.hydrateContext / finalizeContext  ← lib/runtime/execution-context.js
  → next() if verdict != DENY
     │
     ▼
Route Handlers (server.js routes/, src/routes/)
  ← NO PETL middleware here (petl-middleware.js NOT mounted)
     │
     ▼
Agent Task (agent-system/orchestrator.js _auditLog)
  setImmediate(() => runObservabilityChain(taskId, ctx))
     │
     ▼
lib/runtime/assembler.js::runObservabilityChain()   [PRODUCTION, fire-and-forget]
  1.  execution-evaluator.recordOutcome + evaluate
  2.  decision-benchmark.benchmark
  3.  counterfactual-evaluator.evaluate
  4.  outcome-registry.buildRegistry
  5.  outcome-lineage.buildLineage
  6.  improvement-lab.analyze
  7.  strategy-engine.formulate
  8.  learning-ledger.buildLedger
  9.  adaptation-simulator.simulate
  10. decision-provenance.buildProvenance
  (all 10 are pure in-memory, no DB, no model calls)

ALSO ACTIVE in production (constitutional-store consumers):
  lib/memory/gateway.js              → constitutional-store.write()
  lib/reality/fabric.js              → constitutional-store.write()
  lib/civilization/rt12-bootstrap.js → constitutional-store.write()
  lib/civilization/rt13-bootstrap.js → constitutional-store.write()
  lib/civilization/deliberation-registry.js → constitutional-store.write()
  lib/civilization/civilization-understanding-registry.js → constitutional-store.write()
  lib/constitution/drift-detector.js → constitutional-store.write()
  lib/founder/profile.js             → constitutional-store.write()
  lib/knowledge/*.js (4 files)       → constitutional-store.write()
  lib/learning/domain-understanding-registry.js → constitutional-store.write()
  lib/registry/universe/index.js     → constitutional-store.write()
  lib/runtime/execution-transaction.js → constitutional-store.write()  [BUILT_NOT_WIRED]
  lib/runtime/governance-attestation.js → constitutional-store.write()  [TEST-ONLY]

NOT IN PRODUCTION PATH (PETL cluster):
  lib/runtime/petl-middleware.js         — documented but NOT mounted
  lib/runtime/execution-transaction.js   — only reachable via petl-middleware
  lib/runtime/decision-lattice.js        — only reachable via execution-transaction
  (+ 6 other PETL cluster files)
```

---

## 7. Constitutional Runtime Mapping

| Constitutional Domain | File(s) | Status |
|---|---|---|
| **Request Gating (Constitutional)** | `constitutional-gate.js` via `civilization-kernel.js` | ESTABLISHED |
| **Request Context** | `execution-context.js` via `civilization-kernel.js` | ESTABLISHED |
| **Constitutional Persistence** | `constitutional-store.js` (18+ callers) | ESTABLISHED |
| **Full PETL Transaction Gate** | `petl-middleware.js` + `execution-transaction.js` + 7 dependencies | BUILT, NOT WIRED |
| **3-Signal Decision Lattice** | `decision-lattice.js` | BUILT, NOT WIRED |
| **Concurrency Protection** | `concurrency-slot-manager.js` | BUILT, NOT WIRED |
| **Transaction Invariant Evaluation** | `invariant-compiler.js` | BUILT, NOT WIRED |
| **Compensation/Failure Tracking** | `compensation-log.js` | BUILT, NOT WIRED |
| **Post-Task Observability** | assembler + 10 observability modules | ESTABLISHED |
| **Governance Provenance Chain** | governance-compiler, governance-attestation, governance-reproducibility, governance-traceability | PARTIALLY WIRED (test-covered, not production-reachable from routes) |
| **Lattice Health Monitoring** | `lattice-health-signal.js`, `lattice-calibration-advisor.js` | NOT WIRED (health data never read by any consumer in production) |
| **RT-14 Reflection Runtime** | NOT PRESENT | NOT BUILT |

---

## 8. Duplicate / Shadow Analysis

| Subject | lib/runtime file | Competing file | Verdict |
|---|---|---|---|
| Strategy engine | `lib/runtime/strategy-engine.js` (pure observability, no imports) | `lib/intelligence/strategy-engine.js` (makes model calls, Supabase writes, generates 90-day/1-year/3-year plans) | DISTINCT — different responsibilities: runtime/strategy-engine produces ranked initiative snapshots from in-memory evidence; intelligence/strategy-engine generates durable AI-generated strategic plans. No conflict. |
| Adaptation/learning | `lib/runtime/adaptation-simulator.js` (pure function, no imports) | `agent-system/adaptation-engine.js` (reads episodic-memory, produces adaptation records to vault/Supabase) | DISTINCT — runtime/adaptation-simulator is a projection tool (what could happen); adaptation-engine is a closed-loop behavior change executor. No conflict. |
| Improvement | `lib/runtime/improvement-lab.js` (pure observability) | `agent-system/improvement-executor.js` (produces ImprovementProposals, writes to registry) | DISTINCT — improvement-lab produces descriptive candidates; improvement-executor acts on them. Correct layering. |
| Self-evaluation | `lib/runtime/execution-evaluator.js` (pure in-memory rolling window, no imports) | `agent-system/self-evaluator.js` (reads episodic-memory, persists evaluations to vault) | DISTINCT — execution-evaluator tracks PETL transaction-level quality; self-evaluator assesses 5 cognitive dimensions from episodic history. No conflict. |
| Constitutional Gate | `lib/runtime/constitutional-gate.js` (runtime per-request gate) | `lib/runtime/constitutional-preflight.js` (PETL adapter for the same gate) | NOT A DUPLICATE — constitutional-preflight wraps constitutional-gate for the PETL pipeline. Correct layering. |
| Reflection | `lib/runtime/execution-evaluator.js` (observability) | `agent-system/reflection-engine.js` (Reflexion pattern, generates verbal lessons) | DISTINCT — different domains, no overlap. |

**No genuine duplicates found.**

---

## 9. Production vs Local Verification Matrix

| Capability | SOURCE EXISTS | TESTED | PRODUCTION REACHABLE | SUPABASE WRITES VERIFIED |
|---|---|---|---|---|
| Constitutional gate (per-request) | YES | YES (gate6, system-test-layer2) | YES | YES (governance_records via civilization-kernel) |
| Execution context (per-request) | YES | YES (verify-c06.js script) | YES | N/A (in-memory) |
| Constitutional store persistence | YES | YES (constitutional-store-persistence.test.js) | YES | FIRE-FORGET (no-throw, swallows errors) |
| Post-task observability chain | YES | NO direct tests for assembler | YES (via setImmediate in orchestrator) | N/A (all in-memory) |
| PETL transaction gate | YES | YES (petl-constitutional.test.js tests kernel-record types; runtime-integration tests task-router) | NO (not mounted in server.js) | N/A |
| Governance attestation | YES | YES (governance-attestation-constitutional.test.js) | NO (test-only consumer) | N/A |
| Lattice health/calibration | YES | NO | NO | N/A |
| Execution replay | YES | NO | NO | N/A |
| Policy experiment | YES | NO | NO | N/A |
| Resource planner | YES | NO | NO | N/A |
| RT-14 Reflection | NO | NO | NO | NO |

---

## 10. Runtime Data / Record Flow

### Constitutional Gate Records (per request)
```
civilization-kernel.js
  → _writeGateRecord() → Supabase governance_records
    (columns: record_type=CONSTITUTIONAL_GATE_EVALUATION, decision, gate_result, verdict, risks, governance_score)
```

### Constitutional Store Records (fire-and-forget)
```
18+ callers → constitutional-store.write(record) → Supabase constitutional_records
  (columns: record_type, runtime_id, baseline, wave, record_data, structural_immutable)

Record types emitted by known callers:
  lib/civilization/rt12-bootstrap.js  → CDP_SUBMITTED, DECISION_RECORD, OAR_ENTRY, ARCHIVE_RECORD, CHAIN_RECORD, CDP_ACCEPTED
  lib/civilization/rt13-bootstrap.js  → AP_DECISION_RECEIPT, ICR_RECORD, EER_RECORD, AP_CIVILIZATIONAL_ACTION
  lib/civilization/civilization-understanding-registry.js → CUM_SYNTHESIS_EVENT, current record, updated record
  lib/civilization/deliberation-registry.js → DELIBERATION_RECORD, CDR_ENTRY, CDP_RECORD
  lib/constitution/drift-detector.js  → DRIFT_DETECTION_RECORD
  lib/founder/profile.js              → FOUNDER_PROFILE_RECORD
  lib/knowledge/belief-object-registry.js → BELIEF_RECORD
  lib/knowledge/evidence-object-registry.js → EVIDENCE_RECORD
  lib/knowledge/interpretation-record-registry.js → INTERPRETATION_RECORD
  lib/knowledge/knowledge-claim-registry.js → KNOWLEDGE_CLAIM
  lib/learning/domain-understanding-registry.js → DOMAIN_UNDERSTANDING_RECORD
  lib/memory/gateway.js               → MEMORY_QUERY_RECORD
  lib/reality/fabric.js               → OBSERVATION_RECORD, CHANGE_RECORD
  lib/registry/universe/index.js      → DAR, DP records
  lib/runtime/execution-transaction.js → KernelOperationManifest, RejectionRecord, AccountabilityRecord (BUILT_NOT_WIRED)
  lib/runtime/governance-attestation.js → GOVERNANCE_ATTESTATION_RECORD (TEST-ONLY)
```

### Observability Chain Data Flow (in-memory only, no DB)
```
orchestrator._auditLog()
  → setImmediate → assembler.runObservabilityChain(taskId, ctx)
      ctx = { agentType, duration, tokenCount, outcome, retries, cost, traceId,
               decision, inputHash, outputHash, policyDecisions, error }
  → 10 pure functions called sequentially, results discarded
  → rolling window in execution-evaluator._records[] (MAX 10,000 entries)
```

### PETL Data Flow (BUILT_NOT_WIRED — what it would do if mounted)
```
petlGate(req, res, next)
  → execution-transaction.begin(req)
      → concurrency-slot-manager.reserve()
      → constitutional-preflight.run() → constitutional-gate.evaluate()
      → invariant-compiler.compile + evaluate()
  → execution-transaction.finalize()
      → lattice-feedback-loop.record()
      → lattice-health-signal.record()
      → constitutional-store.write(KernelOperationManifest)
  → execution-transaction.abort()
      → compensation-log.record()
      → constitutional-store.write(RejectionRecord / AccountabilityRecord)
```

---

## 11. RT-14 Reflection Precondition Map

RT-14 is explicitly referenced as "NOT YET OPERATIONAL" in at least 5 civilization files:
- `lib/civilization/deliberation-registry.js` lines 20, 229-230
- `lib/civilization/rt12-bootstrap.js` lines 146, 153
- `lib/civilization/rt13-bootstrap.js` lines 21, 147, 164-165, 168

### What exists that RT-14 can use

| Asset | File | Readiness | Notes |
|---|---|---|---|
| Execution outcome records | `execution-evaluator.js` (rolling window) | READY | 10,000-record window with success/failure/cost/duration/drift data |
| Decision benchmarks | `decision-benchmark.js` | READY | pure function over outcome records |
| Counterfactual policy comparisons | `counterfactual-evaluator.js` | READY | 5 policies compared per outcome |
| Outcome registry | `outcome-registry.js` | READY | statistical distribution from outcomes |
| Outcome lineage | `outcome-lineage.js` | READY | provenance graph of outcomes |
| Improvement candidates | `improvement-lab.js` | READY | ranked candidates from evidence |
| Strategic initiatives | `strategy-engine.js` | READY | initiative ranking |
| Learning ledger | `learning-ledger.js` | READY | hypotheses, interventions, effectiveness |
| Adaptation projections | `adaptation-simulator.js` | READY | scenario simulation |
| Decision provenance | `decision-provenance.js` | READY | full ancestry reconstruction |
| Reflexion tracker | `lib/memory/reflexion-tracker.js` | ACTIVE | tracks lesson→behavior closed loop |
| Constitutional records DB | `constitutional-store.js` → Supabase | ACTIVE | `constitutional_records` table populated |
| Governance attestation | `governance-attestation.js` | BUILT | proves governance fidelity |

### What is missing for RT-14

| Gap | Impact |
|---|---|
| No RT-14 file exists | RT-14 itself is not built |
| Observability chain data is in-memory only | All 10 modules produce data that is discarded after each call; there is no durable store for observability output |
| No consumer of observability chain output | assembler.js calls 10 modules, none return persisted records; results never leave the process |
| PETL not wired | Transaction-level invariant data (KernelOperationManifest, AccountabilityRecord) never written to constitutional_records in practice |
| lattice-health-signal data never read in production | The drift/health signal accumulates but lattice-calibration-advisor (its only reader) has no callers |
| RT12-INV-5 deferred | Terminal states in RT-12 decisions are reserved for RT-14 assignment; currently a schema-level placeholder only |

### RT-14 Precondition Assessment
The observability evidence infrastructure is **complete and sound** — all 10 modules are well-designed, pure, and deterministic. The gap is that their output is purely in-memory and not persisted. RT-14 will need either: (a) assembler-level persistence of observability snapshots to a table, or (b) a dedicated reader that queries the rolling windows before they fill.

---

## 12. Falsification Findings

### F1: PETL is NOT active in production
**Assumption that could be held:** execution-transaction.js and petl-middleware.js gate all production requests.
**Reality:** Neither is imported by server.js or any middleware stack. `petlGate` is defined and documented but has zero production callers. The comment in `petl-middleware.js` at line 6-9 describes its intended usage but it was never mounted. **This is the most significant falsification.**

### F2: lattice-calibration-advisor.js has zero consumers
**Assumption:** The calibration advisor feeds operator dashboards or automatic recalibration.
**Reality:** No file imports it. The health signal it reads accumulates to a never-read in-memory buffer.

### F3: 4 observability files are completely unreachable
`execution-replay.js`, `policy-experiment.js`, `resource-planner.js`, `lattice-calibration-advisor.js` — zero importers, zero test coverage, zero production reach.

### F4: validate-governance.js and validate-recorder-purity.js referenced in governance-contract.js do NOT exist as files
`governance-contract.js` references `validate-governance.js`, `validate-recorder-purity.js`, and `validate-governance-contract.js` as enforcers in its invariant definitions. These files do not exist in `scripts/` (checked). The enforcement is declared but not implemented.

### F5: Observability chain output is fully ephemeral
All 10 modules in the observability chain produce frozen in-memory objects that are immediately discarded. There is no write path from any of the 10 modules to the database. The chain "runs" but produces no durable record.

### No falsifications found for:
- constitutional-store no-throw contract (correctly implemented)
- constitutional-gate fail-closed behavior (400ms timeout → DENY confirmed in code)
- assembler individual module isolation (each module wrapped in try/catch, confirmed)
- governance-attestation immutability (all outputs frozen, no state, confirmed)
- adaptation-simulator pure function claims (no imports, no writes, confirmed)

---

## 13. Confirmed Risks

### RISK-1: PETL cluster is orphaned
**Severity: HIGH**
9 files (petl-middleware, execution-transaction, decision-lattice, constitutional-preflight, concurrency-slot-manager, invariant-compiler, compensation-log, lattice-feedback-loop, lattice-health-signal) represent a complete, well-implemented PETL system that has been built but never connected to the server. This is either: (a) an intentional deferral, (b) forgotten, or (c) was superseded by civilization-kernel's integrated approach. No comment in server.js or civilization-kernel.js explains this. If T4-01 assumes PETL is active in production, it will be incorrect.

### RISK-2: Observability chain produces no durable output
**Severity: MEDIUM**
The 10-module observability chain runs after every task but all output is in-memory rolling windows. A process restart loses all accumulated data. RT-14 cannot query past history from these modules.

### RISK-3: validate-governance scripts referenced but not implemented
**Severity: LOW**
governance-contract.js declares three enforcement scripts that do not exist. The governance invariants are declared but not automatically enforced by any tooling.

### RISK-4: 4 observability files with zero coverage
**Severity: LOW**
`execution-replay.js`, `policy-experiment.js`, `resource-planner.js`, `lattice-calibration-advisor.js` have no tests, no importers, and are completely dead code paths. They will silently accumulate bit rot.

---

## 14. Confirmed Non-Risks

### NR-1: lib/runtime/strategy-engine.js vs lib/intelligence/strategy-engine.js
These are distinct modules with distinct responsibilities. No conflict, no confusion in import paths (different directory prefixes prevent accidental wrong-import).

### NR-2: constitutional-store no-throw contract
The fire-and-forget write contract is correct: all errors are caught and swallowed, return value is not used by callers. No request can fail due to constitutional-store write failure.

### NR-3: constitutional-gate timeout behavior
The gate implements fail-CLOSED correctly: a 400ms timeout results in VERDICT.DENY, not ALLOW. Confirmed in code structure.

### NR-4: assembler module isolation
Each of the 10 observability modules in assembler is individually wrapped in try/catch. One failing module cannot stop the others or throw to the orchestrator. Correct design.

### NR-5: Observability chain blocking concern
The chain is called via `setImmediate` so it cannot block or delay the HTTP response. Confirmed in orchestrator.js line 1011.

### NR-6: constitutional-store Supabase client management
constitutional-store uses `getSupabaseClient()` from `lib/clients` — correct shared client pattern, not a direct `new Pool()` or raw pg connection. No bypass of established connection management.

### NR-7: Model API isolation
Zero files in `lib/runtime/` make direct Anthropic/Claude API calls. The runtime layer is correctly separated from the intelligence layer.

---

## 15. Ambiguities Requiring Decisions

### AMB-1 (CRITICAL): Is PETL deliberately deferred or accidentally orphaned?
`petl-middleware.js` contains the comment: "Usage in server.js (after auth middleware, before route mounting): app.use(petlGate)". This was never done. civilization-kernel.js performs its own constitutional gate. Decision needed: **Does T4-01 assume PETL gets wired, or does it treat civilization-kernel as the permanent gate?** This affects 9 files.

### AMB-2 (CRITICAL): Does RT-14 need observability chain persistence, or will it use in-memory reads?
The 10 observability modules build rolling windows in-memory. If RT-14 needs to query historical data across process restarts, assembler.js needs a persistence step. If RT-14 only cares about the current session's window, no change needed. This determines the scope of T4-01.

### AMB-3 (MODERATE): What is the intended relationship between civilization-kernel's gate and PETL's gate?
civilization-kernel.js calls `gate.evaluate()` directly (the constitutional-gate module). execution-transaction.js also calls `constitutional-preflight.run()` which wraps the same gate. If PETL is wired, the constitutional gate would run twice per request (once in civilization-kernel, once in PETL). Is this intended (defense-in-depth) or a latency/redundancy concern?

### AMB-4 (MODERATE): Should governance-traceability.js be reachable from a route?
It has zero importers. The governance manifest defines this as the top-level governance provenance document. Either it needs a route endpoint (e.g., `/api/governance/traceability`) or it is intended purely for local dev inspection. Decision needed for T4-01 governance route work.

### AMB-5 (LOW): What happens to the 4 unreachable observability files?
`execution-replay.js`, `policy-experiment.js`, `resource-planner.js`, `lattice-calibration-advisor.js` — are these scheduled for Wave 4 wiring, or candidates for archival?

### AMB-6 (LOW): RT12-INV-5 terminal state assignment by RT-14
rt12-bootstrap.js sets `rt14_terminal_assignment_only: true` as a schema field. Until RT-14 exists, terminal state assignment is deferred. Is there a fallback for the interim period?

---

## 16. Recommended T4-01 Preconditions

Before T4-01 begins, the following must be confirmed or resolved:

1. **Resolve AMB-1** — Get a human decision on whether T4-01 wires PETL or treats civilization-kernel as permanent gate. Do not proceed with T4-01 if this is ambiguous, as the answer changes which files need modification.

2. **Resolve AMB-2** — Determine if observability chain output needs persistence for RT-14. If yes, assembler.js needs modification before RT-14 can be built.

3. **Confirm production Supabase schema** — Verify that `constitutional_records` table exists and has columns: `record_type`, `runtime_id`, `baseline`, `wave`, `record_data`, `structural_immutable`. Also verify `governance_records` table schema matches what civilization-kernel writes.

4. **Confirm `lib/constitutional-types/kernel-record.js` exists and exports KernelOperationManifest, RejectionRecord, AccountabilityRecord** — execution-transaction.js requires these; if PETL is to be wired, this dependency must resolve.

5. **Confirm RT-14 scope** — RT-14 is not a lib/runtime file. Which system component will implement it, and does it build on the existing observability chain or is it independent?

6. **Confirm governance validate scripts status** — Either implement validate-governance.js, validate-recorder-purity.js, validate-governance-contract.js or update governance-contract.js to remove dead references.

---

## 17. Explicit Non-Actions Taken

Per T4-INV mandate (INVESTIGATION ONLY):

1. `petl-middleware.js` was found unwired — NOT modified or wired to server.js
2. `governance-traceability.js` was found unreachable — NOT added to any route
3. `execution-replay.js`, `policy-experiment.js`, `resource-planner.js`, `lattice-calibration-advisor.js` were found with zero importers — NOT deleted, NOT removed
4. validate-governance.js was found missing despite being referenced — NOT created
5. observability chain output found to be ephemeral — assembler.js NOT modified to add persistence
6. governance-contract.js references non-existent enforcement scripts — NOT edited
7. `architecture/index.yaml` modified state was noted — NOT reverted (auto-generated, pre-authorized as irrelevant)
8. 9 PETL cluster files found built-not-wired — NOT wired, NOT deleted
9. lib/intelligence/strategy-engine.js and lib/runtime/strategy-engine.js found as distinct modules — NOT merged or renamed

---

## 18. Evidence Index

```
# File counts
$ ls /c/Users/arwwo/Desktop/APEX/Scripts/lib/runtime/ | wc -l
  → 34

# Line counts per file
$ wc -l /c/Users/arwwo/Desktop/APEX/Scripts/lib/runtime/*.js
  → Σ 6408 lines

# Production importers of constitutional-gate
$ grep -rn "constitutional-gate" .../Scripts --include="*.js"
  → middleware/civilization-kernel.js:9
  → agent-system/master-orchestrator.js:7
  → routes/observatory.js:194
  → tests/gate6-constitutional.test.js:4
  → tests/system-test-layer2.js:23
  → scripts/verify-c06.js:5

# Production importers of constitutional-store (18+ callers)
$ grep -rn "constitutional-store\|constitutionalStore" .../Scripts --include="*.js"
  → lib/civilization/civilization-understanding-registry.js:45 (+2 more)
  → lib/civilization/deliberation-registry.js:26 (+3 more)
  → lib/civilization/rt12-bootstrap.js:34 (+5 more)
  → lib/civilization/rt13-bootstrap.js:38 (+4 more)
  → lib/constitution/drift-detector.js:12
  → lib/founder/profile.js:12
  → lib/knowledge/belief-object-registry.js:23
  → lib/knowledge/evidence-object-registry.js:21
  → lib/knowledge/interpretation-record-registry.js:25
  → lib/knowledge/knowledge-claim-registry.js:37
  → lib/learning/domain-understanding-registry.js:40
  → lib/memory/gateway.js:16
  → lib/reality/fabric.js:9 (+2 more)
  → lib/registry/universe/index.js:16 (+2 more)
  → lib/runtime/execution-transaction.js:28 (BUILT_NOT_WIRED)
  → lib/runtime/governance-attestation.js:28 (TEST-ONLY)

# PETL wiring check
$ grep -n "petlGate|petlErrorHandler|petl-middleware" .../Scripts/server.js
  → 0 matches (NOT WIRED)

# assembler call site
$ grep -n "runObservabilityChain" .../Scripts/agent-system/orchestrator.js
  → line 1010: const { runObservabilityChain } = require('../lib/runtime/assembler');
  → line 1011: setImmediate(() => runObservabilityChain(taskId, {...}).catch(...))

# Model API check in lib/runtime
$ grep -rn "Anthropic|anthropic|openai" .../Scripts/lib/runtime --include="*.js"
  → 0 matches

# Direct pg connection check in lib/runtime
$ grep -rn "pg_database|new Pool" .../Scripts/lib/runtime --include="*.js"
  → 0 matches

# RT-14 references
$ grep -rn "RT-14" .../Scripts/lib/civilization --include="*.js"
  → deliberation-registry.js: "RT-14 full implementation deferred. NON-BLOCK."
  → deliberation-registry.js: "RT-14 not yet operational"
  → rt12-bootstrap.js: "terminal states EXCLUSIVELY by RT-14"
  → rt13-bootstrap.js: "RT-14 not yet operational" (3 occurrences)

# Validate scripts existence check
$ find .../Scripts/scripts -name "validate-governance*.js" -o -name "validate-recorder*.js"
  → 0 results (files do not exist)
```

---

## 19. Final T4-INV Verdict

### AUTHORIZE T4-01 — WITH CONDITIONS

**Rationale:**

The lib/runtime layer is structurally sound and well-designed. The constitutional gate is production-active. The observability chain is production-active. constitutional-store is the backbone of 18+ callers and is correctly implemented. No critical bugs, no security bypass patterns, no model API leakage, and no unauthorized DB access were found.

**However, two ambiguities MUST be resolved before T4-01 begins:**

1. **AMB-1 (CRITICAL):** Confirm whether T4-01 includes wiring PETL (`petl-middleware.js`) into `server.js`. The PETL cluster is 100% complete but has never been mounted. This is a large scope item that changes the T4-01 definition significantly. Do not start T4-01 without a yes/no on this.

2. **AMB-2 (CRITICAL):** Confirm whether RT-14 requires the observability chain output to be persisted to Supabase. Currently all 10 observability modules are fire-and-forget in-memory only. If RT-14 needs historical data, assembler.js needs a persistence write path before RT-14 can be built.

**Conditional authorization:** If AMB-1 and AMB-2 are answered, T4-01 is clear to proceed. The codebase is well-structured, the PETL cluster is ready to wire, the observability evidence is comprehensive, and the constitutional persistence layer is solid.

---

*T4-INV complete. Document written to: C:\Users\arwwo\Desktop\APEX\Scripts\T4-INV-RUNTIME-REALITY.md*
