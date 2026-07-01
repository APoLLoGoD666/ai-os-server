# APEX-ASSUMPTIONS-DISPROVEN.md
## Every Prior Belief Disproven, Corrected, or Reclassified
**Generated:** 2026-06-16 | **Source Corpus:** Phases 30–30E | **Baseline Commit:** f77a36d

---

## HOW TO READ THIS DOCUMENT

Each entry states the prior belief, the evidence that disproves or reclassifies it, the corrected understanding, and the operational consequence of the original belief being wrong. Evidence citations are to document name + section or file:line.

---

## BELIEF 1: "APEX is governed by the governance module"

**Status: DISPROVEN**

**Prior belief:** The governance library (lib/governance*.js) gates or controls agent execution. The governance probe passing at 100/100 implies the system operates under active governance control during pipeline runs.

**Evidence that disproves it:**
- PHASE-30D-FINAL-DECISION.md §Evidence Basis: "Zero gov. calls. Zero require('./governance'). Zero issueCertification, appendEvidenceBlock, or createIncident calls. Confirmed by grep with NO MATCHES across 1740 lines [of orchestrator.js]."
- PHASE-30D-BLIND-SPOT-ASSESSMENT.md §Question 1: "No call to gov.createIncident(), gov.issueCertification(), or any blocking governance action exists between line 1549 and line 1602."
- GOVERNANCE-ATLAS.md §Known Governance Risks: Policy engine scope note — "Policies only evaluated at orchestrator pre-execution; no runtime re-evaluation."

**Corrected understanding:** Governance is post-hoc audit, not an execution gate. The governance library records what happened (evidence_blocks, cost_accounting, certifications, incidents). It does not influence what happens during a pipeline run. The governance probe tests governance infrastructure (can we write to evidence_blocks? can we create incidents?), not pipeline safety gates. A 100/100 governance probe score says nothing about whether REVIEWER, VALIDATOR, or TESTER are working correctly.

**Operational consequence of the prior belief being wrong:** Anyone who believed governance was a runtime gate would have confidence that a governance failure would stop a bad pipeline run. That confidence is false. Bad code can reach production with governance probe at 100/100, because governance is never consulted during the pipeline.

---

## BELIEF 2: "WS-1B fully resolved the validator security risk"

**Status: DISPROVEN**

**Prior belief:** Work Stream 1B (VALIDATOR fail-closed fix) closed the VALIDATOR security gap. VALIDATOR now reliably fails closed on any anomalous response.

**Evidence that disproves it:**
- PHASE-30C-FINAL-DECISION.md §Defect 1: orchestrator.js:1528 requires `!passed AND failedCases.length > 0`. The shape `{passed:false, failedCases:[]}` satisfies the first condition but not the second. The retry block does not execute.
- PHASE-30C-FINAL-DECISION.md §Defect 1 logical trace: "`!false` = `true` (first condition met), `[].length > 0` = `false` (second condition NOT met), Combined AND: `true && false` = `false`."
- PHASE-30E-FINAL-DECISION.md §Two Open Single Points of Failure: "VALIDATOR dispatch gate at orchestrator.js:1528... contains empty-failedCases gap."
- PHASE-30E-AUTHORITY-MAP.md §Stage Table: "[REVIEWER catch] at :559 defaults to `{passed:true, issues:[]}` (pass-through on model failure)." (Second residual defect — REVIEWER parse bypass.)

**Corrected understanding:** WS-1B closed the exception-handling path (exception during VALIDATOR call → `passed:false`) and the non-boolean normalization (non-boolean `passed` → coerced to `false`). It did not close the semantic gap: a type-valid, schema-valid response `{passed:false, failedCases:[]}` passes through normalization unchanged because `typeof false === 'boolean'` (first normalization branch skips) and `Array.isArray([])` is true (second normalization branch skips). The dispatch gate at line 1528 then silently bypasses.

Additionally, Phase 30E revealed a second unfixed defect: REVIEWER's catch block at orchestrator.js:559 converts model parse failure into `{passed:true, issues:[]}` — this is a separate bypass that WS-1B did not address.

**Operational consequence:** Pipeline runs where VALIDATOR returns `{passed:false, failedCases:[]}` — a natural LLM hallucination pattern — deploy code the VALIDATOR model concluded was wrong. No alert fires. No incident is created. The pipeline returns `{success:true}`. The defect is traceable only via manual query of `apex_agent_stages`.

---

## BELIEF 3: "35+ memory bypass callsites exist"

**Status: PARTIALLY TRUE → RECLASSIFIED AND REDUCED**

**Prior belief:** 35+ callsites bypass lib/memory/gateway.js and write directly to Supabase or pg, creating a memory security perimeter leak of 35+ points.

**Evidence that reclassifies it:**
- PHASE-30-EXECUTIVE-CERTIFICATION.md §The Recommendation Disproven Through Scrutiny: "The original framing — '35+ callsites bypass lib/memory/gateway.js and write directly to Supabase or pg' — conflates two distinct concerns: (1) Files that create their own Supabase clients (structural observation), (2) Files that write to the memory security perimeter (actual bypass)."
- PHASE-30-EXECUTIVE-CERTIFICATION.md: "This audit found no confirmed production code that writes to apex_lessons or the memory table outside the gateway or pgAddMemory (which is sanitized). The '35+ bypass' count was based on counting createClient() calls regardless of what tables those clients write to."
- PHASE-30-EXECUTIVE-CERTIFICATION.md: "The vast majority write to operational tables (agent_tasks, agent_reputation, cost_accounting) that are correctly outside the gateway's scope."

**Corrected understanding:** The count was based on `createClient()` occurrences, not on memory-perimeter writes. Creating a Supabase client does not constitute a memory bypass — it only constitutes a bypass if that client subsequently writes to a protected memory table (apex_lessons, episodic_memory, etc.) outside the gateway. No confirmed apex_lessons INSERT bypass was found in production code. The 3 confirmed per-request Supabase clients (routes/governance.js:12-14, routes/integrations.js:122-123, server.js inline) are connection-leak bugs, not memory security bypasses.

**Operational consequence:** WS-6 full consolidation (consolidating all 35+ callsites) was authorized based on an inflated threat model. It was CANCELLED as a result of this audit. The actual risk — no confirmed memory perimeter bypasses — warrants only a targeted sub-audit (WS-6C) to confirm zero bypasses remain.

---

## BELIEF 4: "The cognitive-evolution subsystem is properly routed"

**Status: DISPROVEN**

**Prior belief:** Routes in routes/cognitive-evolution.js are accessible at `/api/cognitive-evolution/*` as the file's comments state.

**Evidence that disproves it:**
- PHASE-30B-EXECUTIVE-CERTIFICATION.md §Basis for Certification, Line 1: "`_loadAgentRoutes()` at server.js:11162–11176 contains the literal string `app.use('/api', require(...))`. No filename processing occurs. No path prefix is derived from the filename."
- PHASE-30B-EXECUTIVE-CERTIFICATION.md §Basis for Certification, Line 2: "cognitive-evolution.js defines routes as `/attribution/impact`, `/twin/accuracy`, `/policies`, `/benchmark/run`, `/reports/weekly`, etc. (15 routes across lines 13–199). None of these strings contain `cognitive-evolution`."
- PHASE-30B-EXECUTIVE-CERTIFICATION.md §Basis for Certification, Line 3: "Every inline comment (lines 12, 24, 37, 49, 62, 73, 85, 97, 109, 126, 139, 153, 164, 175, 186) states the path as `/api/cognitive-evolution/[subpath]`. The gap between stated intent and actual code is exactly one missing path segment."
- DEAD-CODE-ATLAS.md §Definitively Dead Artifacts #3: Route comment "Mounted at /api/cognitive-evolution" confirmed DEAD (misleading).

**Corrected understanding:** All 15 cognitive-evolution routes resolve at `/api/attribution/impact`, `/api/twin/accuracy`, `/api/policies`, etc. — not at `/api/cognitive-evolution/*`. Callers referencing the documented paths get 404. The data pipeline (engine writes to database tables) is live, but the read-back and control API is silently inaccessible. The cognitive evolution subsystem cannot be queried or controlled via its intended interface.

**Operational consequence:** Any dashboard, external caller, or documentation that references `/api/cognitive-evolution/*` has been receiving 404 responses silently. The subsystem is operationally inaccessible for read-back.

---

## BELIEF 5: "governance-probe.js covers VALIDATOR behavior"

**Status: DISPROVEN**

**Prior belief:** The 10-check governance probe includes validation of VALIDATOR behavior, providing automated verification that VALIDATOR is functioning correctly.

**Evidence that disproves it:**
- PHASE-30D-FINAL-DECISION.md §Evidence Basis: "governance-probe.js exercises zero VALIDATOR-specific behavior (lib/governance-probe.js:1–219). 10 checks. Zero mention of VALIDATOR, validatorLog, failedCases, or validator behavior patterns."
- PHASE-30D-BLIND-SPOT-ASSESSMENT.md §Question 1: "No call to gov.createIncident()... or any blocking governance action exists between line 1549 and line 1602."
- GOVERNANCE-ATLAS.md §Governance Probe (10 Checks): All 10 checks are governance infrastructure tests (evidence_blocks write, cost_accounting write, incident creation/resolution, lesson traceability, certification logic). None test pipeline stage behavior.

**Corrected understanding:** The governance probe tests the governance library's own infrastructure — can it write evidence blocks, create incidents, resolve incidents, record lesson sources, issue certifications? It does not test whether REVIEWER passes or fails correctly, whether VALIDATOR catches behavioral defects, or whether TESTER runs on the right files. A 100/100 governance probe score is compatible with both VALIDATOR defects remaining open.

**Operational consequence:** The probe score 100/100 can be misread as "all system safety checks passing." It only means governance infrastructure is functional. It says nothing about pipeline gate integrity.

---

## BELIEF 6: "VALIDATOR is the primary security gate before commit"

**Status: DISPROVEN**

**Prior belief:** VALIDATOR is the primary last-line gate ensuring code quality and safety before COMMITTER runs.

**Evidence that disproves it:**
- PHASE-30E-FINAL-DECISION.md §Single Point of Authority: "REVIEWER is the last entity to evaluate code correctness, security, and spec conformance before COMMITTER executes... REVIEWER's judgment is the final semantic gate."
- PHASE-30D-BLIND-SPOT-ASSESSMENT.md §Question 3: "REVIEWER is a HARD gate (orchestrator.js:1522–1526). If REVIEWER fails, execution DOES NOT reach COMMITTER. REVIEWER has no escape path analogous to the validator gap."
- PHASE-30E-AUTHORITY-MAP.md §Stage Table: REVIEWER runs OWASP, STRIDE, spec correctness, error handling, HTTP status codes, raw secrets, duplicate routes. VALIDATOR only checks ARCHITECT-defined test cases.
- PHASE-30C-EXECUTIVE-CERTIFICATION.md §Operational Impact: "In normal LLM operation, there is a non-zero probability that VALIDATOR returns `{passed:false, failedCases:[]}` on any given run. When this occurs, code with behavioral defects... can reach production without retry or escalation."

**Corrected understanding:** REVIEWER is the primary semantic gate. It provides broader coverage (security, quality, spec conformance) and has no empty-failedCases bypass analog. VALIDATOR provides behavioral contract coverage (ARCHITECT test cases) — narrower scope, and it has the empty-failedCases gap. For most runs, REVIEWER is the real last gate. TESTER (node --check) is the only deterministic gate.

**Operational consequence:** Security-focused remediation effort directed at VALIDATOR first was missequenced. REVIEWER's parse-bypass at orchestrator.js:559 is a higher-priority defect because REVIEWER is the primary semantic gate.

---

## BELIEF 7: "The autonomy level controls orchestrator execution"

**Status: DISPROVEN**

**Prior belief:** `AUTONOMY_LEVEL` env var (set to 3 in production) controls how the orchestrator pipeline behaves — what it can do autonomously.

**Evidence that disproves it:**
- PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #9: "The `AUTONOMY_LEVEL` env var in server.js (line 544) controls the legacy task execution path (`shouldAutoRunTaskAction`, `canAutoRunLevel3Action`). This is the TASK AGENT system (server.js), NOT the orchestrator pipeline. The two autonomy systems are parallel and independent. `runAgentTeam()` uses cognitive autonomy evaluation from `ctx.runtimeControls`, not `process.env.AUTONOMY_LEVEL`."
- PHASE-30E-EXECUTIVE-CERTIFICATION.md §Actual Authority Owner: "Human approval exists in the legacy task agent system (server.js AUTONOMY_LEVEL env var) which is a separate execution path."
- AGENT-ATLAS.md §Autonomy Gate Levels: "LEVEL_0: Blocks ALL pipeline execution (GATE 2 fails immediately); LEVEL_1+: PASS." But this LEVEL is sourced from `ctx.runtimeControls.blockExecution` (cognitive evaluation), not from `process.env.AUTONOMY_LEVEL`.

**Corrected understanding:** There are two parallel autonomy systems in APEX:
1. The legacy task agent system in server.js, controlled by `process.env.AUTONOMY_LEVEL`. This governs whether server.js auto-runs task actions directly.
2. The orchestrator pipeline autonomy gate, which reads `ctx.runtimeControls` assembled by the cognitive stack. This is independent of AUTONOMY_LEVEL.

Setting `AUTONOMY_LEVEL=3` grants full autonomy to the server.js task agent system. It has no effect on `runAgentTeam()` pipeline behavior, which is governed by the cognitive runtime evaluation.

**Operational consequence:** Setting AUTONOMY_LEVEL=0 does NOT block the orchestrator pipeline if the cognitive stack fails to assemble `runtimeControls.blockExecution=true`. Conversely, even at AUTONOMY_LEVEL=3, the pipeline can be blocked if the cognitive evaluation returns LEVEL_0. The two systems must be understood and managed independently.

---

## BELIEF 8: "WS-4 (governance.js singleton) is a P2 hygiene fix"

**Status: CONFIRMED — still true**

**Prior belief:** WS-4 is a low-risk hygiene fix — governance.js creates a Supabase client per request instead of using the singleton in lib/clients.js.

**Evidence that confirms it:**
- ARCHITECTURAL-ATLAS.md §Key Architectural Findings #2: "routes/governance.js lines 12-14... call `createClient()` on every request, bypassing the singleton pattern and leaking connections."
- GOVERNANCE-ATLAS.md §Known Governance Risks: "routes/governance.js lines 12-14 — `_sb()` creates `createClient()` on every handler invocation — connection leak. MEDIUM severity."
- PHASE-30-EXECUTIVE-CERTIFICATION.md §What Work Remains #1: "Evidence: routes/governance.js:13–15 — `_sb()` calls createClient() per-request with no caching guard. File: routes/governance.js. Change: add `let _client = null` guard. 4 lines. Risk: NEGLIGIBLE."
- PHASE-30-EXECUTIVE-CERTIFICATION.md §The Recommendation Strengthened Most by Scrutiny: "WS-4 survives scrutiny because the consistency argument is independent of performance claims. Every other Supabase client in the codebase uses a singleton or delegates to lib/clients. governance.js is the sole exception."

**Corrected understanding:** The belief is correct. WS-4 is a 4-line singleton guard in routes/governance.js. It is structural hygiene. It does not improve probe scores or fix security gaps. It is confirmed at lines 12-14. The justification is consistency with the singleton pattern used by all other modules, not performance.

**Operational consequence of misclassification:** None currently. Calling it a P2 hygiene fix is accurate. The only risk of downgrading it is it remains open indefinitely — which it has.

---

## BELIEF 9: "APEX has a fail-closed VALIDATOR"

**Status: PARTIALLY TRUE**

**Prior belief:** After WS-1B, VALIDATOR is fully fail-closed — any failure mode results in retry or pipeline stop.

**Evidence for the partial truth:**
- PRODUCTION-ATLAS.md §Applied Fixes: "WS-1B: VALIDATOR fail-closed on exception/parse failure."
- AGENT-ATLAS.md §VALIDATOR Behavior: "Exception or parse failure: passed=false (fail-closed via WS-1B fix)" and "Non-boolean `passed` field: Coerced to false (normalization block)."

**Evidence for the partial falsehood:**
- PHASE-30C-FINAL-DECISION.md §Defect 1: The normalization block's two branches both check for type violations. `{passed:false, failedCases:[]}` passes both branches unchanged because it is type-valid.
- PHASE-30E-AUTHORITY-MAP.md: REVIEWER parse failure at orchestrator.js:559 auto-passes — this is not VALIDATOR but is a related semantic gate failure.

**Corrected understanding:** VALIDATOR is fail-closed for exception-and-parse-failure paths and for non-boolean `passed` types. It is NOT fail-closed for the `{passed:false, failedCases:[]}` shape, which is type-valid and passes normalization. The statement "fail-closed" is true in the exception-handling sense but false in the semantic-validity sense.

**Operational consequence:** Projects or post-mortems that concluded VALIDATOR was fully secured by WS-1B would not have tracked the residual gap. The gap remains open and is the subject of Phase 30C/30D findings.

---

## BELIEF 10: "The governance library provides execution-time protection"

**Status: DISPROVEN**

**Prior belief:** lib/governance*.js is an active participant in pipeline execution — it certifies, gates, or constrains what the agent pipeline can do.

**Evidence that disproves it:**
- PHASE-30D-FINAL-DECISION.md §Evidence Basis: Confirmed via grep: zero `gov.` calls, zero `require('./governance')`, zero `issueCertification`, `appendEvidenceBlock`, or `createIncident` in orchestrator.js:1-1739.
- PHASE-30D-BLIND-SPOT-ASSESSMENT.md §Question 1: "The governance library (`lib/governance.js`) is never required or called from `orchestrator.js` — zero `gov.` calls anywhere in the file."
- GOVERNANCE-ATLAS.md §Governance Subsystem Dependency Map: The dependency map shows `orchestrator.js (pre-execution gates)` reads from behavioral_modifications, founder_anti_goal_alerts, autonomy_decisions, digital_twin_simulations, deployment_policy — all database tables, NOT governance library functions.

**Corrected understanding:** The governance library provides post-hoc audit infrastructure. The orchestrator's pre-execution gates read directly from database tables (not from governance library functions). Governance records what happened — it does not change what happens. The 10-check probe verifies governance infrastructure is functional (can write blocks, incidents, certifications) — not that governance gates pipelines.

**Operational consequence:** Any assumption that "governance passing" implies "pipeline is safe" is false. Governance can be 100/100 while the VALIDATOR gap and REVIEWER parse bypass are both open.

---

## ADDITIONAL BELIEFS FOUND DURING READING

---

## BELIEF 11: "The Phase 29B incident proves node --check catches all pre-deploy errors"

**Status: DISPROVEN**

**Prior belief (implied by reliance on node --check in TESTER and VALIDATOR):** `node --check` is sufficient to catch production-breaking code before deploy.

**Evidence that disproves it:**
- ARCHITECTURAL-ATLAS.md §Key Architectural Findings #7: "VALIDATOR is static-analysis only: The VALIDATOR stage runs `node --check` for syntax and Zod schema validation but cannot catch runtime errors, logical bugs, or integration failures."
- PRODUCTION-ATLAS.md §Known Production Gaps: "MODULE_NOT_FOUND not caught pre-deploy — node --check doesn't catch require() errors. HIGH severity."
- PHASE-30-EXECUTIVE-CERTIFICATION.md §Single Most Important Lesson: "The Phase 29B incident was the most operationally consequential event... A server.js commit removed an inline route and replaced it with `require('./src/routes/telemetry')` — a module that did not exist. The server crashed on Render with MODULE_NOT_FOUND. node --check does not validate require() paths."
- AGENT-ATLAS.md §Stage 5: "Note: TESTER also runs `node --check` — same limitation as VALIDATOR. Phase 29B incident (MODULE_NOT_FOUND) was NOT caught by TESTER because require() path errors only manifest at runtime."

**Corrected understanding:** `node --check` validates JavaScript syntax only. It does not validate: require() paths resolve, runtime dependencies exist, type correctness at runtime, or integration correctness. Both TESTER and VALIDATOR share this limitation. The Phase 29B crash class (MODULE_NOT_FOUND) cannot be prevented by the current gate set.

**Operational consequence:** The pre-deploy process has a documented gap for require() path errors. CLAUDE.md pre-deploy checklist addition (Phase 30A) is the authorized mitigation.

---

## BELIEF 12: "The 12-layer memory is fully implemented"

**Status: PARTIALLY TRUE — Layer 4 is absent**

**Prior belief:** All 12 memory layers are implemented and operational.

**Evidence that partially disproves it:**
- MEMORY-ATLAS.md §Layer 4 Gap: "gateway.js dispatch handles layers 0, 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12. Layer 4 has no handler. Any call to `gateway.storeMemory(layer: 4, ...)` will silently fall through or throw an unhandled case error. No table is assigned to layer 4."
- DEAD-CODE-ATLAS.md §Definitively Dead Artifacts #5: "Layer 4 — DEAD (gap — no handler, no table, never functional)."

**Corrected understanding:** 11 of 12 layers are implemented. Layer 4 has no handler and no assigned table. Writes targeting layer 4 silently fail or throw. The layer is effectively dead.

**Operational consequence:** Any cognitive cron or pipeline stage that attempts to write to layer 4 will produce a silent failure with no alert. Current evidence shows no known callers targeting layer 4, but the gap creates a silent failure mode.
