# T4-INV-DECISION-RECORD
**Date:** 2026-08-20
**HEAD:** 748fc83
**Purpose:** Resolve AMB-1 (PETL) and AMB-2 (Observability Persistence) to authorize T4-01

---

## 1. Purpose

This document resolves the two CRITICAL ambiguities identified in T4-INV-RUNTIME-REALITY.md before T4-01 can be authorized. AMB-1 asks whether PETL should be wired before, during, or after T4-01 — or not at all in T4-01 scope. AMB-2 asks whether RT-14 requires durable persistence of observability chain output or whether in-memory rolling windows are sufficient. Both answers directly determine T4-01 scope, file targets, and the definition of "done."

---

## 2. T4-INV Baseline

T4-INV (T4-INV-RUNTIME-REALITY.md, HEAD 748fc83) established the following facts relevant to these ambiguities:

- **PETL is fully built but never wired.** Nine files (`petl-middleware.js`, `execution-transaction.js`, `decision-lattice.js`, `constitutional-preflight.js`, `concurrency-slot-manager.js`, `invariant-compiler.js`, `compensation-log.js`, `lattice-feedback-loop.js`, `lattice-health-signal.js`) form a complete, tested transaction-level gate that has zero production callers. `petl-middleware.js` line 6 documents its intended mount point in server.js but was never mounted.
- **Production gate is civilization-kernel.js.** It calls `constitutional-gate.js` and `execution-context.js` directly. No PETL involved.
- **Observability chain is active but ephemeral.** `assembler.js` runs 10 pure in-memory modules after every orchestrator task. All output is discarded after each call. No DB writes, no state persistence across process restarts.
- **RT-14 does not exist.** No RT-14 file is present anywhere in the codebase. RT-14 is explicitly marked NOT YET OPERATIONAL in at least 5 civilization files.
- **T4-01 is the first Wave 4 task.** Its scope must be defined from the ambiguity resolutions in this document.

---

## 3. AMB-1 Evidence

### E1-1: governance-manifest.js tier assignment
`lib/runtime/governance-manifest.js` lines 43–55 place PETL files in the following tiers:
- `petl-middleware` → TIER.MIDDLEWARE
- `execution-transaction` → TIER.EXECUTION
- `concurrency-slot-manager` → TIER.EXECUTION
- `compensation-log` → TIER.EXECUTION
- `constitutional-preflight` → TIER.SCORING (mapped as SCORING in the manifest; governance-contract.js treats it as SCORING tier rank 4)
- `decision-lattice` → TIER.DECISION
- `invariant-compiler` → TIER.INVARIANT
- `lattice-feedback-loop` → TIER.RECORDER
- `lattice-health-signal` → TIER.RECORDER

The manifest (line 3) identifies itself as the "Authoritative module tier registry for the APEX runtime." PETL is a first-class defined system in the governance architecture.

### E1-2: petl-middleware.js self-documentation
`lib/runtime/petl-middleware.js` lines 5–16:
```
// Usage in server.js (after auth middleware, before route mounting):
//   const { petlGate, petlErrorHandler } = require('./lib/runtime/petl-middleware');
//   app.use(petlGate);
//   // ... mount routes ...
//   app.use(petlErrorHandler);
//
// Guarantees:
//   - No route handler executes without a committed transaction.
//   - req.txId and req.tx are set before next() is called.
//   - res.json and res.send are wrapped to auto-finalize the transaction.
//   - Preflight failure returns structured JSON; next() is never called.
//   - petlErrorHandler aborts any open transaction on unhandled route errors.
```
The module self-documents as designed for server.js mounting. It defines a bypass list (`/health`, `/favicon.ico`, `/sw.js`, `/manifest.json`) appropriate for production deployment. This is purpose-built production middleware, not a prototype or test utility.

### E1-3: governance-contract.js — PETL's role in the authority model
`lib/runtime/governance-contract.js` lines 49–86 define the AUTHORITY_PRECEDENCE invariant:
```
CONSTITUTION → FOUNDER_MODEL → DIGITAL_TWIN → EXECUTION → RECORDER → OBSERVABILITY
```
MIDDLEWARE tier sits at authority rank 4 alongside EXECUTION, SCORING, DECISION, and INVARIANT. The contract explicitly defines that PETL (MIDDLEWARE) sits in the execution-path tier hierarchy, not in the observability or advisory tiers. PETL's role is to enforce this authority precedence on every request by running the 3-signal lattice (CONSTITUTION → FM → DT) before committing a transaction.

### E1-4: civilization-kernel.js — no reference to PETL
`middleware/civilization-kernel.js` has zero references to `petl`, `PETL`, `execution-transaction`, or `concurrency`. Grep confirmed 0 matches (investigated 2026-08-20). civilization-kernel.js calls `constitutional-gate.js` directly (line 9: `const gate = require('../lib/runtime/constitutional-gate')`) and `execution-context.js` (line 8: `const ec = require('../lib/runtime/execution-context')`). It contains no statement — comment or code — indicating it is temporary or that PETL replaces it in the future.

### E1-5: civilization-kernel.js scope vs PETL scope
civilization-kernel.js gates every HTTP request. It performs: identity hydration, governance score threshold check, constitutional gate evaluation (`gate.evaluate()`), ARCH-14 rule evaluation, audit record write to `governance_records`, goal resolution, attention scoring, memory hydration, and post-response hook. This is a request-level *context pipeline* — it enriches the request with context objects consumed by downstream routes.

PETL's scope is different: it adds **transaction lifecycle management** (PENDING → PREFLIGHT → COMMITTED → EXECUTING → FINALIZED), **concurrency slot reservation** (prevents double-submission), **invariant compilation** (per-transaction invariant predicates), **compensation logging** (failure markers), and **feedback recording** (lattice-feedback-loop and lattice-health-signal). PETL does *also* call constitutional-gate (via `constitutional-preflight.js` which wraps it), but its primary value is the transaction state machine and ancillary systems around the gate, not the gate itself.

### E1-6: Double-gate analysis
If PETL were mounted in server.js alongside civilization-kernel.js, `constitutional-gate.evaluate()` would be called twice per request:
1. In `civilization-kernel.js` line 421: `gate.evaluate(ctx, _watchdogGateOpts())`
2. In `execution-transaction.js` line 22: `const constPreflight = require('./constitutional-preflight')` → `constPreflight.run()` → `constitutional-gate.evaluate()`

`constitutional-gate.js` is stateless and deterministic (confirmed in T4-INV). Running it twice per request is redundant but not harmful. The second run (PETL) has no watchdog opts, so it loses the drift/healthState enrichment that civilization-kernel passes. This is a latency and coverage gap, not a correctness issue. The double-invocation is architectural redundancy, not a conflict.

### E1-7: PETL tests exist and test the correct scope
`tests/petl-constitutional.test.js` (8.4 KB) tests `KernelOperationManifest`, `RejectionRecord`, and `AccountabilityRecord` from `lib/constitutional-types/kernel-record.js`. The test file header says "W2-02 PETL constitutional wiring offline tests." The `W2-02` designation indicates PETL wiring was planned for Wave 2 but was not completed. The test specifically exercises the record types that `execution-transaction.js` would write to `constitutional-store` when mounted — meaning the persistence path was tested but the middleware mount was not completed.

### E1-8: No server.js mounting instruction
`grep "petlGate|petlErrorHandler|petl-middleware" server.js` returns 0 matches (confirmed in T4-INV evidence index). This is the definitive evidence that PETL has never been wired.

### E1-9: decision-lattice.js — FM and DT modules exist
`decision-lattice.js` line 29: `const _founderLib = require('../founder/alignment-engine')` and line 30: `const _dtLib = require('../cognitive/runtime/digital-twin-gate')`. Both modules exist (confirmed: `lib/founder/alignment-engine.js` exists; `lib/cognitive/runtime/digital-twin-gate.js` exists as confirmed by benchmark-runner.js importing it). The 3-signal lattice is not a stub — its dependencies are real and operational.

---

## 4. AMB-1 Resolution

**PETL STATUS: REQUIRED AFTER T4-01**

PETL is architectural infrastructure for the full constitutional execution pipeline, not a precondition for T4-01's primary mandate (which is building RT-14 as the Reflection Runtime). The evidence establishes:

1. PETL is a complete, governance-registered system (governance-manifest.js) that belongs in the execution path but has no blocking relationship to RT-14 construction.
2. civilization-kernel.js is a sufficient production gate for the current request scope. It calls constitutional-gate.js directly and writes governance_records to Supabase. No critical capability is missing because PETL is unwired.
3. PETL wiring requires a server.js modification, which is an independent scope item. Wiring it during T4-01 would conflate two separate concerns: the transaction-level gate rollout (PETL) and the Reflection Runtime implementation (RT-14).
4. The double-gate risk (constitutional-gate called twice if both civilization-kernel and PETL are mounted) requires resolution before PETL can be safely wired. This resolution is a separate task, not T4-01 scope.
5. Test designation "W2-02" confirms PETL wiring was a Wave 2 deliverable that slipped. It should receive its own task slot in Wave 4 or a dedicated remediation task — not be silently absorbed into T4-01.

PETL is not a precondition for T4-01 and is not T4-01 scope. It requires its own authorized task.

---

## 5. PETL Ownership

PETL belongs to the **MIDDLEWARE constitutional domain** (governance-manifest.js line 47: `'petl-middleware': TIER.MIDDLEWARE`) with supporting modules in EXECUTION (execution-transaction, concurrency-slot-manager, compensation-log), DECISION (decision-lattice), INVARIANT (invariant-compiler), SCORING (constitutional-preflight), and RECORDER (lattice-feedback-loop, lattice-health-signal).

governance-contract.js lines 75–86 assign MIDDLEWARE tier the role: "Request interception and transaction wiring" at authority rank 4. This places PETL as a peer of the EXECUTION and SCORING tiers — all three sit between CONSTITUTION/FM/DT (authority ranks 1–3) and RECORDER/OBSERVABILITY (ranks 5–6).

Ownership for wiring purposes sits with the server.js maintainer / Wave infrastructure task. No single constitutional domain "owns" the decision to mount it — that is an architectural integration decision.

---

## 6. PETL Dependency on T4-01

PETL has no dependency on T4-01 in either direction:
- T4-01 (RT-14 Reflection Runtime) does not require PETL to be wired. RT-14 consumes ObservedConsequenceRecords from RT-08, Effect Expectations from RT-13, and triggers knowledge updates to RT-11. None of these sources pass through PETL.
- PETL's `execution-transaction.js` would, when wired, write `KernelOperationManifest`, `RejectionRecord`, and `AccountabilityRecord` to `constitutional-store`. These are transaction-level records, not Reflection Runtime inputs.
- The constitutional-types for RT-14 (`observed-consequence-record.js`) are already defined in `lib/constitutional-types/` (confirmed present, 34.8 KB). PETL wiring is not a precondition for using them.

---

## 7. PETL Future Integration Boundary

PETL should be wired in a dedicated task, provisionally named **T4-PETL** or a Wave 4 remediation slot, with the following preconditions:
1. Decide whether to deduplicate the constitutional-gate call (civilization-kernel calls it with watchdog opts; PETL's constitutional-preflight calls it without). Options: (a) remove the gate call from civilization-kernel and let PETL own it entirely, (b) keep both and document double-gate as defense-in-depth, (c) pass watchdog opts through to constitutional-preflight.
2. Verify server.js mount order: PETL must come after auth middleware and before route mounting, per petl-middleware.js line 6–8 comment.
3. Confirm `lib/constitutional-types/kernel-record.js` resolves at runtime before PETL is mounted (it is required by execution-transaction.js line 27 and exists in the constitutional-types directory).
4. Decide bypass path list (petl-middleware.js BYPASS_PATHS) is production-appropriate.

---

## 8. AMB-2 Evidence

### E2-1: assembler.js — no persistence intent documented
`lib/runtime/assembler.js` contains no comment, variable, or code path referencing Supabase, constitutional-store, any database client, or persistence. The module header (lines 3–6) states: "Observability chain — runs all 10 runtime analysis modules for a completed task. Each module is wrapped individually so one failure never stops the rest. Called via setImmediate from orchestrator — fully non-blocking, never throws." There is no statement of persistence intent. All 10 module calls produce return values that are neither stored nor used by assembler.js.

### E2-2: execution-evaluator.js — explicitly memory-only
`lib/runtime/execution-evaluator.js` lines 1–12:
```
// PURE OBSERVABILITY. NOT enforcement. NOT execution. NOT authority.
// No imports. No writes. Memory only.
```
The module uses a MAX_RECORDS cap of 10,000 entries (line 16). This is a rolling window design — it is intentionally size-bounded and ephemeral. The header explicitly prohibits writes.

### E2-3: RT-14 is the Reflection Runtime — its scope is consequence observation, not task metrics
`docs/constitutional-architecture/A0-v1.0-canonical.md` line 196: "Constitutional justification: D5 Part 8 establishes the mandatory Reality Feedback Loop as the mechanism closing the Constitutional Loop... Reflection holds independent state (Observed Consequence Records, Causal Model Divergence Register, terminal Open Action Register updates)." RT-14's mandated state is: **Observed Consequence Records**, **Causal Model Divergence Register**, and **terminal Open Action Register updates** — not execution evaluator rolling windows.

A0-v1.0-canonical.md line 318 and 350 categorize RT-14 as "Tier 5 — Feedback: Closing the Constitutional Loop." RT-14's inputs are ConsequenceObservationRecords from RT-08 (line 790, 805) and Effect Expectations from RT-13 (line 1031). These are constitutional-store records, not assembler.js in-memory snapshots.

### E2-4: RT-14 references in civilization files — NOT YET OPERATIONAL, NON-BLOCK
- `lib/civilization/deliberation-registry.js` line 20: "RT-14 full implementation deferred. NON-BLOCK."
- `lib/civilization/deliberation-registry.js` lines 229–230: "Feedback route: ObservedConsequenceSignal → RT-14 → RT-11 ... L-DA4-09: RT-14 not yet operational; review trigger documented here per VC-9 bootstrap."
- `lib/civilization/rt12-bootstrap.js` line 146: "RT12-INV-5: terminal states (COMPLETE/PARTIAL/FAILED/LOST) EXCLUSIVELY by RT-14."
- `lib/civilization/rt12-bootstrap.js` line 153: `rt14_terminal_assignment_only: true`
- `lib/civilization/rt13-bootstrap.js` line 21: "bootstrap placeholder pending RT-14 operationalization. NON-BLOCK."
- `lib/civilization/rt13-bootstrap.js` lines 164–168: "L-RT13-03: RT-14 not yet operational. Observation window activates on first operational RT-14 feedback cycle. RT14-INV-1 deferred pending RT-14 operationalization."

All references use NON-BLOCK, meaning RT-14's absence does not break existing runtime pipelines.

### E2-5: constitutional-types for RT-14 already define the persistence model
`lib/constitutional-types/observed-consequence-record.js` (34.8 KB, task W1-11) is the RT-14 primary owned type. It defines `ObservedConsequenceRecord` and `CausalModelDivergenceRecord`. These are constitutional-types objects designed to be written to `constitutional-store` (the established pattern for all constitutional record types). RT-14's persistence path is **constitutional-store → constitutional_records table** — the same Supabase table used by all 18+ other callers. RT-14 does not need assembler-level persistence.

### E2-6: reflexion-tracker.js uses Supabase for closed-loop tracking
`lib/memory/reflexion-tracker.js` imports `getSupabaseClient` and `decision-memory`. It persists lesson→behavior closed-loop records (createReflexion, recordRetrieval, recordInfluence, verifyBehaviorChange). This is the Layer 11 reflex system. It is architecturally separate from RT-14 but confirms the pattern: cross-session behavioral learning in APEX goes through Supabase, not in-memory buffers.

### E2-7: RT-12 Open Action Register requires terminal status from RT-14
`lib/constitutional-types/civilizational-decision.js` lines 246–247: "Terminal state assignment is EXCLUSIVELY by RT-14 (RT12-INV-5). RT-12 receives RT-14's TerminalStatusRecord and records the closure." Line 266 (constitutional_note): "CRITICAL: RT12-INV-5 — terminal states (COMPLETE, PARTIAL, FAILED, LOST) are assigned EXCLUSIVELY by RT-14 via TerminalStatusRecord. RT-12 may NEVER self-assign a terminal state." This is a cross-runtime invariant. RT-14 must write TerminalStatusRecords that RT-12 reads. Both sides must be durable — in-memory would not survive a process restart that happens between RT-14's assignment and RT-12's read.

### E2-8: effect-expectation-record.js confirms RT-14's data source is RT-13, not assembler
`lib/constitutional-types/effect-expectation-record.js` line 45: "ObservedConsequenceRecord — RT-14 (A0 §3.15)". The pipeline is: RT-13 (Action Projection) → produces Effect Expectations → RT-14 receives these for consequence comparison → RT-14 produces ObservedConsequenceRecords → written to constitutional_records. The assembler.js observability chain (task metrics, benchmarks, counterfactuals) is parallel infrastructure for operational telemetry, not the RT-14 input pipeline.

### E2-9: No RT-14 specification file exists
`find /c/Users/arwwo/Desktop/APEX/Scripts -name "RT-14*"` returned 0 results. No Wave 4 YAML or markdown file defining T4-01 scope was found in the repository. ROADMAP.md is a feature roadmap (communications, finance, health), not a constitutional runtime roadmap. T4-INV-RUNTIME-REALITY.md (this investigation's predecessor) is the most current authoritative source.

### E2-10: Observability chain in-memory data and RT-14 relationship
The assembler.js observability chain produces operational quality metrics (execution success rates, token costs, counterfactual comparisons, strategy snapshots). These are useful for **operational monitoring of RT-14 once it is operational** — i.e., RT-14's own executions would feed into these rolling windows. But they are not RT-14's constitutional input data. The distinction:
- **RT-14 consumes:** ConsequenceObservationRecords (from RT-08), EffectExpectations (from RT-13), Open Action Register entries (from RT-12). All durable, all in constitutional_records.
- **Assembler/observability chain produces:** Task-level operational telemetry (duration, token count, outcome, cost, counterfactuals). Ephemeral. No constitutional authority. Not RT-14 inputs.

---

## 9. AMB-2 Resolution

**OBSERVABILITY PERSISTENCE STATUS: NOT REQUIRED BEFORE T4-01**

The observability chain's in-memory-only design is intentional (execution-evaluator.js self-documents "No writes. Memory only.") and correct for its observational tier. RT-14 does not consume assembler.js output. RT-14's authoritative input pipeline is: RT-08 ConsequenceObservationRecords → RT-14 → ObservedConsequenceRecords written to constitutional_records.

RT-14's persistence is handled through the constitutional-store pattern (same as all other 18+ callers), using the already-defined `ObservedConsequenceRecord` type in `lib/constitutional-types/observed-consequence-record.js`. No assembler-level persistence modification is required before or during T4-01.

If operational telemetry persistence (assembler output) is wanted for dashboards or future analysis, it is a separate infrastructure task unrelated to T4-01.

---

## 10. RT-14 Persistence Requirements

RT-14 requires **durable, cross-session persistence** via constitutional-store.

Evidence chain:
- RT-14 must write `TerminalStatusRecord` entries that RT-12 reads to close Open Action Register entries (civilizational-decision.js line 247). A process restart between RT-14's write and RT-12's read would cause data loss if in-memory. Therefore durable storage is mandatory.
- RT-14 owns `ObservedConsequenceRecord` and `CausalModelDivergenceRecord` (A0-v1.0-canonical.md line 196, observed-consequence-record.js). These are designed as constitutional record types — the constitutional-types pattern is always paired with constitutional-store writes.
- RT-14 triggers Understanding updates to RT-11 (CUM revision) based on consequence observation (A0-v1.0-canonical.md lines 1072, 1446). These are permanent model updates, not session-local.
- All peer runtimes (RT-12, RT-13, RT-08) that interact with RT-14 write to constitutional_records already.

**In-memory is not sufficient.** RT-14 needs constitutional-store writes for its produced record types.

---

## 11. Canonical Persistence Ownership

RT-14 persistence is owned by **constitutional-store** (`lib/runtime/constitutional-store.js`) writing to the **constitutional_records** Supabase table.

This is the established pattern for all constitutional record types. `constitutional-store.js` (35 lines, 18+ production callers) provides the fire-and-forget write interface. RT-14 should follow the identical pattern used by:
- `lib/reality/fabric.js` → writes OBSERVATION_RECORD, CHANGE_RECORD
- `lib/civilization/rt12-bootstrap.js` → writes CDP_SUBMITTED, DECISION_RECORD, OAR_ENTRY
- `lib/civilization/rt13-bootstrap.js` → writes AP_DECISION_RECEIPT, ICR_RECORD, EER_RECORD

RT-14 will write record types including at minimum: OBSERVED_CONSEQUENCE_RECORD, TERMINAL_STATUS_RECORD, CAUSAL_MODEL_DIVERGENCE_RECORD (per observed-consequence-record.js and A0 §3.15).

No new table, no new persistence layer, no assembler modification is required. The infrastructure exists.

---

## 12. Falsification Attempts

### FA-1: Could PETL be a T4-01 precondition because RT-14 needs transaction-level records?
**Checked:** `execution-transaction.js` would write `KernelOperationManifest`, `RejectionRecord`, and `AccountabilityRecord` to constitutional-store when mounted. RT-14 does not consume these record types. RT-14's inputs are ConsequenceObservationRecords from RT-08 and EffectExpectations from RT-13. PETL records are transaction-level infrastructure records, not Reflection Runtime inputs. **Falsified: PETL is not a T4-01 precondition.**

### FA-2: Could assembler.js need persistence for RT-14 to operate?
**Checked:** A0-v1.0-canonical.md, effect-expectation-record.js, observed-consequence-record.js — all define RT-14's input pipeline as coming from RT-13/RT-08 via constitutional-store. Assembler.js produces operational telemetry (token counts, durations, counterfactuals), not constitutional consequence observations. **Falsified: assembler persistence is not required for RT-14.**

### FA-3: Is civilization-kernel.js documented as temporary anywhere?
**Checked:** civilization-kernel.js (581 lines) contains no comment indicating it is temporary, transitional, or to be replaced by PETL. The most recent additions (W3, W4 comments on lines 127, 252, 329, 396) show active Wave development on this file, not deprecation signals. **Falsified: civilization-kernel.js is not marked as temporary.**

### FA-4: Does the double-gate (constitional-gate called by both civilization-kernel and PETL) cause incorrect verdicts?
**Checked:** constitutional-gate.js is stateless — it evaluates the same ctx and returns the same verdict on each call. The only difference is that civilization-kernel passes `watchdogOpts` (drift indicators, health state from watchdog) while PETL's constitutional-preflight does not. This means PETL's gate would produce a slightly less-informed verdict (missing watchdog data), not an incorrect one. The double-gate is a latency and accuracy concern, not a correctness or security failure. **Partially falsified: double-gate does not cause incorrect verdicts, but does cause accuracy loss in PETL's constitutional evaluation.**

### FA-5: Does any RT-14 reference indicate it consumes assembler.js output?
**Searched:** All RT-14 references in lib/, docs/, constitutional-types/ — none reference assembler.js, execution-evaluator, decision-benchmark, counterfactual-evaluator, or any of the 10 observability modules. RT-14's defined inputs are exclusively from other constitutional runtimes (RT-08, RT-13, RT-12). **Falsified: RT-14 has no dependency on assembler.js output.**

---

## 13. Remaining Risks

### RR-1: PETL's constitutional-preflight misses watchdog enrichment
When PETL is eventually wired (post-T4-01), its call to constitutional-gate via constitutional-preflight does not pass watchdogOpts (drift indicators, health state). civilization-kernel's gate call does. If both are mounted, the PETL gate evaluation will be less precise. This must be resolved in the PETL wiring task — either thread watchdog opts through constitutional-preflight, or accept defense-in-depth with acknowledged accuracy gap.
**Severity: MEDIUM. Affects PETL wiring task, not T4-01.**

### RR-2: RT-12 Open Action Register entries are permanently open until RT-14 is built
`rt12-bootstrap.js` line 153: `rt14_terminal_assignment_only: true`. Every CivilizationalDecision that transitions to IN_PROGRESS via RT-13 will remain in IN_PROGRESS until RT-14 assigns terminal status. With RT-14 not yet built, no OAR entry can be closed. This is a growing debt that T4-01 must address by building RT-14 with terminal status assignment capability.
**Severity: HIGH. T4-01 must include TerminalStatusRecord production to unblock RT-12.**

### RR-3: Observability chain output has no consumer for cross-session analysis
All 10 assembler modules produce frozen in-memory objects that are discarded. The rolling window in execution-evaluator (max 10,000 records) resets on process restart. This data is unavailable for historical trend analysis across deployments. A future task should decide whether to persist observability snapshots to a dedicated telemetry table. This does not block T4-01.
**Severity: LOW. Does not block T4-01 or RT-14.**

### RR-4: RT14-INV-1 deferred
rt13-bootstrap.js line 168: "RT14-INV-1 deferred pending RT-14 operationalization." The content of RT14-INV-1 is not defined in any accessible file. T4-01 must surface this invariant's specification before RT-14 can claim constitutional correctness.
**Severity: MEDIUM. Requires discovery during T4-01 implementation.**

---

## 14. Explicit Non-Actions

The following were found during this investigation and deliberately not changed:

1. `petl-middleware.js` found unwired — NOT modified, NOT mounted to server.js
2. `assembler.js` found to have no persistence — NOT modified to add persistence writes
3. `execution-evaluator.js` found to be memory-only — NOT modified
4. `observed-consequence-record.js` type definitions found complete — NOT modified
5. `lib/civilization/deliberation-registry.js`, `rt12-bootstrap.js`, `rt13-bootstrap.js` — RT-14 deferred markers found — NOT modified
6. `docs/constitutional-architecture/A0-v1.0-canonical.md` — read for RT-14 scope definition — NOT modified
7. civilization-kernel.js watchdog enrichment gap noted — NOT patched

---

## 15. T4-01 Preconditions

The following must be true before T4-01 begins:

1. **AMB-1 resolved** (this document): PETL is NOT T4-01 scope. T4-01 proceeds without wiring petl-middleware.js. A separate PETL wiring task is required post-T4-01.

2. **AMB-2 resolved** (this document): Observability chain persistence is NOT required before or during T4-01. RT-14 uses constitutional-store for its own record persistence. Assembler.js is not modified.

3. **RT-14 scope defined at implementation start**: T4-01 must begin by reading `lib/constitutional-types/observed-consequence-record.js` (RT-14's primary type definitions, task W1-11) and `docs/constitutional-architecture/A0-v1.0-canonical.md` §3.15 (RT-14 constitutional seat) before writing any code.

4. **TerminalStatusRecord must be included in T4-01**: RT-12's Open Action Register cannot close without RT-14 terminal status assignments. T4-01 scope must include the capability to produce TerminalStatusRecords and write them to constitutional-store.

5. **RT14-INV-1 must be surfaced during T4-01**: rt13-bootstrap.js defers RT14-INV-1 pending RT-14 operationalization. T4-01 implementation must discover and enforce this invariant before declaring RT-14 operational.

6. **No modifications to server.js, civilization-kernel.js, or assembler.js**: T4-01 is RT-14 implementation only. These three files are out of scope.

7. **constitutional-store and constitutional_records table confirmed available**: RT-14 will write to constitutional-store. The table is confirmed active (18+ callers in production). No schema migration is expected, but the implementer should verify `constitutional_records` column set accommodates the new RT-14 record types before writing the first `constitutional-store.write()` call.

---

## 16. Final Authorization Decision

**AMB-1 RESOLVED:** YES

**AMB-2 RESOLVED:** YES

---

### [AUTHORIZE T4-01]

**Justification:**

AMB-1: PETL is NOT a T4-01 precondition or scope item. It is built, governance-registered, and ready to wire, but its wiring is an independent architectural integration task that requires its own authorization and double-gate resolution. civilization-kernel.js is the established production gate and remains so through T4-01. PETL is classified REQUIRED AFTER T4-01, in a dedicated task.

AMB-2: Observability persistence is NOT required before T4-01. RT-14's durable persistence path already exists: it writes to constitutional-store using the ObservedConsequenceRecord and TerminalStatusRecord types defined in lib/constitutional-types/. Assembler.js in-memory behavior is correct for its observational tier and is not RT-14's input source.

T4-01 is authorized to proceed as the RT-14 Reflection Runtime implementation task, with the following mandatory scope inclusions: (a) ObservedConsequenceRecord production and constitutional-store write path, (b) TerminalStatusRecord production to unblock RT-12 OAR closure, (c) RT14-INV-1 invariant discovery and enforcement, (d) RT-08 ConsequenceObservationRecord and RT-13 EffectExpectation consumption wiring. PETL wiring and assembler persistence are explicitly out of scope.
