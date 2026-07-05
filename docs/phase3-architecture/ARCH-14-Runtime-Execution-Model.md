# APEX CIVILISATION — ARCH-14: Runtime Execution Model

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Architecture
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00, ARCH-01, ARCH-04, ARCH-06, ARCH-07, ARCH-08, ARCH-09, ARCH-10, ARCH-11, ARCH-12, ARCH-13
**Depended on by:** ARCH-15

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document defines the canonical runtime execution model of the APEX Civilisation: the complete pipeline through which every request passes, from initial receipt to final response and post-response governance. It specifies the phases, their order, their failure modes, the checkpoints where governed state is written, and the differentiated pipelines for each request class.

It resolves C02 (Constitutional Gate UNCONDITIONALLY_OPEN) by specifying the exact gate position, the FAIL-CLOSED behaviour, and the governance score threshold that must be met for execution to proceed.

### 1.2 Scope

Covered: the 8-phase runtime pipeline; request classification; Constitutional Gate specification (FAIL-CLOSED, C02 resolution); AUTONOMY_LEVEL interaction at each gate; post-response phases; differentiated pipelines by request class (TASK, CONVERSATION, CIVILISATION_CYCLE, IMPROVEMENT); circuit breaker integration; the session lifecycle; resource accounting per request.

Not covered: the agent pipeline steps 0–8 (ARCH-12 Section 5); the physical database schema (ARCH-15); the specific model prompts used within pipeline steps (deployment detail).

---

## Section 2 — Request Classes

Every inbound request to the APEX Civilisation is classified into one of four request classes before any further processing.

| Class | Description | Entry Point | Authorised Caller |
|---|---|---|---|
| CONVERSATION | A stateful message in a user session; may invoke agent tools | POST /api/conversation or WebSocket | FOUNDER (trust ≥ 5) |
| TASK | An explicit agent task request (create, approve, cancel, force-terminate) | POST /api/tasks/* | OPERATIONAL(4) and above |
| CIVILISATION_CYCLE | The 8-phase self-improvement loop triggered by cron or EXECUTIVE | POST /api/cycle/start or internal Render cron | EXECUTIVE(5) and above |
| IMPROVEMENT | Improvement engine deployment: code patch, configuration change, schema migration | POST /api/improvement/deploy | EXECUTIVE(5) and above |

The request class determines which pipeline variant executes (Section 7). Misclassification defaults to CONVERSATION pipeline with reduced trust level, which applies the most conservative gate settings.

---

## Section 3 — The 8-Phase Runtime Pipeline

Every request — regardless of class — passes through the following 8 phases in sequence. Phase exits are labelled with their permitted outcomes.

```
PHASE 1: ADMISSION
PHASE 2: IDENTITY RESOLUTION
PHASE 3: CONSTITUTIONAL GATE  ← C02 resolution
PHASE 4: CONTEXT ASSEMBLY
PHASE 5: EXECUTION
PHASE 6: RESPONSE COMMIT
PHASE 7: POST-RESPONSE GOVERNANCE
PHASE 8: RESOURCE RECONCILIATION
```

Phases 1–3 must complete before any execution resource (model token, database write, agent step) is consumed. Phases 7–8 execute asynchronously after the response is sent; they must not delay the response.

### 3.1 Phase 1 — Admission

**Purpose:** Validate that the request has the structural prerequisites to be processed.

**Operations:**
1. Parse and validate the request envelope (method, path, Content-Type, body schema)
2. Extract the session token or API key from the request
3. Assign a `request_id` (UUID v4) and `correlation_id` (UUID v4; new chain if no parent correlation)
4. Check rate limit: if the caller's rate bucket is exhausted, reject with 429 and emit EVT-019 (TRUST_BOUNDARY_REJECTED, TB-001)
5. Assign request class (Section 2)

**Failure mode:** FAIL-CLOSED — any admission failure produces a 4xx response and no execution proceeds. No audit record is produced for malformed requests (no entity to audit against).

**Output:** `request_id`, `correlation_id`, `request_class`, `raw_identity_token`

### 3.2 Phase 2 — Identity Resolution

**Purpose:** Resolve the raw identity token to a verified ARCH-04 identity record, establishing the trust level for this request.

**Operations:**
1. Invoke the identity resolution protocol (ARCH-04 Section 5: token → identity record → trust level)
2. Verify the session is active (SOT-004; sessions table; status: ACTIVE, not expired)
3. If identity cannot be resolved or session is expired: reject with 401; emit EVT-019 (TB-001 External API Gateway)
4. Snapshot the resolved identity for use in all downstream audit records
5. Assign `effective_trust_level` from the identity record

**DEGRADED verification:** If the identity verification method returns DEGRADED (ARCH-04 Section 3.2), the request proceeds with `effective_trust_level = TASK(3)` regardless of the claimed level. DEGRADED identities may not invoke OPERATIONAL(4) or higher operations.

**Failure mode:** FAIL-CLOSED — unresolved identity produces 401; no execution proceeds.

**Output:** `identity_snapshot` (ARCH-04 JSONB); `effective_trust_level`; `session_id`

### 3.3 Phase 3 — Constitutional Gate

**Purpose:** Evaluate the request against the Constitutional rules before any execution resource is consumed. This is the primary safety checkpoint of the APEX Civilisation.

**This phase resolves C02 (Constitutional Gate UNCONDITIONALLY_OPEN).** The gate must evaluate every request, and a gate score below threshold must prevent execution.

**Operations:**
1. Compute the current governance score (ARCH-08 Section 6; cached value from SOT-007, max staleness: 120 seconds)
2. Apply the AUTONOMY_LEVEL matrix (ARCH-12 Section 4) to determine the minimum governance score threshold for the active AUTONOMY_LEVEL
3. Evaluate the 5 Constitutional rules (ARCH-00 Section 3) against the request intent:
   - Rule 1 (Serve the Founder): Does this request serve the Founder's declared goals (SOT-001)?
   - Rule 2 (Avoid harm): Does this request trigger any harm classification?
   - Rule 3 (Maintain FAIL-CLOSED default): Does this request require an explicit override of a FAIL-CLOSED setting?
   - Rule 4 (Preserve Civilisation state): Does this request risk irreversible state destruction?
   - Rule 5 (Human oversight): Does this request require escalation to human approval at the active AUTONOMY_LEVEL?
4. Aggregate the gate result: PASS (all rules pass, governance score ≥ threshold) or BLOCK (any rule fails or score below threshold)

**Gate result PASS:** Execution proceeds. Emit EVT-018 (TRUST_BOUNDARY_CROSSED, TB-004).

**Gate result BLOCK:**
- Return 403 with gate_result details (which rule failed, current governance score, threshold)
- Emit EVT-019 (TRUST_BOUNDARY_REJECTED, TB-004)
- Write a Governance Record with `gate_result: BLOCKED`, `governance_score`, `blocking_rule`
- No execution resource is consumed
- The request terminates at Phase 3; Phases 4–8 do not execute

**Governance score thresholds by AUTONOMY_LEVEL:**

| AUTONOMY_LEVEL | Minimum Score to Pass Gate |
|---|---|
| 1 | 95 (SOVEREIGN review required below) |
| 2 | 90 |
| 3 | 75 (current confirmed operating level) |
| 4 | 60 |
| 5 | 50 |
| 6 | 40 |

At AUTONOMY_LEVEL=3 (current production): the gate passes if governance score ≥ 75 AND all 5 Constitutional rules pass.

**Failure mode:** FAIL-CLOSED — a gate that cannot compute governance score (database unavailable, SOT-007 not readable) must BLOCK the request. A gate that cannot evaluate is a blocked gate.

**INV-RT1: The Constitutional Gate Cannot Be Bypassed.** No code path, flag, environment variable, or runtime configuration may skip Phase 3. The gate executes for every request, including internal Render cron triggers and SOVEREIGN-level callers.

### 3.4 Phase 4 — Context Assembly

**Purpose:** Assemble the knowledge context required for execution, including working memory, retrieved episodic/semantic memory, and the active task record if applicable.

**Operations:**
1. Execute the knowledge retrieval pipeline (ARCH-13 Section 6) for the request entity_refs
2. Load the active session's conversation history from working_context (ARCH-10 Section 4.1)
3. For TASK class requests: load the full task record and step_log from Supabase (SOT-002)
4. For CIVILISATION_CYCLE class: load the active goal list (SOT-001), current governance score (SOT-007), and last cycle's reflexion records
5. Assemble the context block (ARCH-13 Section 6.2)

**Failure mode:** FAIL-SOFT — if knowledge retrieval partially fails (e.g., embedding query times out), execution proceeds with degraded context. The degradation is noted in the request_log. If Supabase is entirely unavailable, the request transitions to FAILED (knowledge store unavailable is not a soft failure for TASK and CIVILISATION_CYCLE classes).

**Output:** `context_block` (ARCH-13 Section 6.2 format); `retrieval_metadata` (sources queried, similarity scores, token count)

### 3.5 Phase 5 — Execution

**Purpose:** Execute the request using the appropriate pipeline variant (Section 7). This is the phase that consumes model tokens, writes agent step outputs, and produces the primary response.

**Operations (vary by request class):** See Section 7 for differentiated pipelines.

**Common operations across all classes:**
1. Reserve the budget for this request (ARCH-12 Section 7.1; per-call cap $2.00)
2. Invoke the designated pipeline variant
3. Track resource consumption via RESOURCE_CONSUMED events (EVT-020) at each model invocation
4. Enforce budget cap: if running total reaches $2.00, stop pipeline and transition to budget-capped terminal state

**Failure mode:** FAIL-CLOSED for TASK and CIVILISATION_CYCLE; FAIL-SOFT for CONVERSATION (a partial conversation response is acceptable).

**Output:** `execution_result`; `step_log` (TASK class); `actual_cost_usd`

### 3.6 Phase 6 — Response Commit

**Purpose:** Commit the execution outputs to the authoritative stores and send the response to the caller.

**Operations:**
1. Write the execution outputs to the appropriate authoritative store (SOT reference per output type)
2. Update the task record to COMPLETED or FAILED (TASK class only; via orchestrator.js canonical write path)
3. Emit the completion event (EVT-003 TASK_COMPLETED or EVT-004 TASK_FAILED)
4. Commit the session working_context update (conversation history, last_active timestamp)
5. Send the HTTP response or WebSocket message to the caller
6. Write the final Governance Record for this request

**Failure mode:** FAIL-CLOSED — if the authoritative store write fails, the response must not be sent (the caller would receive a success with no persisted state). If the write fails, the request transitions to FAILED and the caller receives a 500 with the failure reason.

**Exception:** Session working_context update failure is FAIL-SOFT — the response is sent even if the session state update fails. The conversation is not lost (the caller received the response); only the session state is stale.

### 3.7 Phase 7 — Post-Response Governance

**Purpose:** Execute governance obligations that must not block the response: reflexion record creation, knowledge graph updates, skill metric updates, event dispatching.

**Executed asynchronously (setImmediate or equivalent) after response is sent.**

**Operations:**
1. Write the reflexion record to Supabase (reflexion_records table; SOT-003) if the request produced a lesson
2. Emit EVT-011 (REFLEXION_RECORDED) — GOVERNED; write to event log before dispatch
3. Emit EVT-023 (KNOWLEDGE_GRAPH_UPDATED) if new concepts were identified during execution
4. Update skill_metrics (SOT-010) for any skills exercised in this request
5. Trigger the REFLECTOR step (CAP-STEP-REFLECT) for TASK class requests: write Obsidian narrative lesson (FAIL-SOFT)
6. Dispatch all pending GOVERNED events from the transactional outbox (write-with-outbox.js)

**Failure mode:** FAIL-SOFT — post-response governance failures are logged and trigger redelivery via the event system (ARCH-11 Section 7.3). They do not affect the already-sent response.

### 3.8 Phase 8 — Resource Reconciliation

**Purpose:** Reconcile the resource consumption for this request: release the budget reservation, record the actual cost, update the resource pool.

**Executed asynchronously after Phase 7 begins.**

**Operations:**
1. Record the final `actual_cost_usd` to the resource_consumption table (SOT-006)
2. Release the budget reservation (`budget_reserved_usd` → returned to pool)
3. Emit EVT-020 (RESOURCE_CONSUMED) with final cost — GOVERNED event
4. If `actual_cost_usd` exceeded `budget_reserved_usd` (overage): emit EVT-021 (BUDGET_CAP_REACHED) and write Governance Record with `constitutional_impact: true`
5. Update the session-level cumulative cost tracking

**Failure mode:** FAIL-SOFT — if resource reconciliation fails (database write fails), the reservation is eventually reconciled on the next cycle. The request is not re-executed. A failed reconciliation is flagged in the governance record for manual review.

---

## Section 4 — Constitutional Gate Detailed Specification

This section provides the complete specification for the Constitutional Gate (TB-004, ARCH-06), resolving C02.

### 4.1 Gate Inputs

| Input | Source | Staleness Tolerance |
|---|---|---|
| `governance_score` | SOT-007 (governance_score table) | 120 seconds |
| `active_autonomy_level` | Environment variable AUTONOMY_LEVEL | No cache (read at gate time) |
| `request_intent` | Phase 1 classification + Phase 2 identity | Per-request |
| `constitutional_rules` | constitution-v1.md parsed representation | Loaded on service start; reloaded on SIGUSR1 |
| `active_goals` | SOT-001 (strategic_memory, status: ACTIVE) | 300 seconds |

### 4.2 Rule Evaluation Protocol

Each Constitutional rule is evaluated as a binary PASS/FAIL with a blocking reason string.

**Rule 1 — Serve the Founder:**
- PASS if the request entity_refs or task_type can be mapped to at least one ACTIVE goal in SOT-001
- PASS if the request is a CONVERSATION class (conversations serve the Founder by definition)
- FAIL if the request would modify or delete a STRATEGIC memory record that directly supports an ACTIVE goal without EXECUTIVE approval
- Blocking reason on FAIL: `RULE_1_GOAL_MISALIGNMENT`

**Rule 2 — Avoid Harm:**
- PASS if the request does not trigger any classifier in the harm_classifiers registry (ARCH-03)
- FAIL if any harm classifier returns positive for the request content
- Blocking reason on FAIL: `RULE_2_HARM_DETECTED`

**Rule 3 — Maintain FAIL-CLOSED Default:**
- PASS if the request does not request an override of a FAIL-CLOSED boundary (ARCH-06)
- FAIL if the request body contains an explicit override flag for a FAIL-CLOSED boundary without the requisite authority level
- Blocking reason on FAIL: `RULE_3_FAIL_CLOSED_OVERRIDE_UNAUTHORIZED`

**Rule 4 — Preserve Civilisation State:**
- PASS if the request does not involve irreversible state destruction (hard delete, DROP TABLE, git force-push to main, FORCE_TERMINATED without EXECUTIVE authority)
- FAIL if the request would irreversibly destroy governed state without EXECUTIVE or SOVEREIGN authority
- Blocking reason on FAIL: `RULE_4_IRREVERSIBLE_STATE_RISK`

**Rule 5 — Human Oversight:**
- Evaluated against the AUTONOMY_LEVEL authority matrix (ARCH-12 Section 4)
- PASS if the request class and operation require no human approval at the active AUTONOMY_LEVEL, or if the required approval is present in the request
- FAIL if the request requires EXECUTIVE or SOVEREIGN approval that is absent
- Blocking reason on FAIL: `RULE_5_APPROVAL_REQUIRED`

### 4.3 Gate Score Formula

The gate does not produce a composite score — it produces a binary PASS/BLOCK. The governance score is a precondition: if `governance_score < threshold(AUTONOMY_LEVEL)`, the gate BLOCKs immediately without evaluating the five rules. If the governance score passes the threshold, all five rules are evaluated; any FAIL produces a BLOCK.

### 4.4 Gate Audit Obligation

Every gate evaluation produces a Governance Record regardless of the outcome (ARCH-08 Section 4.2 mandatory audit point: CONSTITUTIONAL_GATE_EVALUATION). The record contains:
- `gate_result`: PASS or BLOCK
- `governance_score`: the score used in evaluation
- `autonomy_level`: active level at evaluation time
- `rule_results`: array of {rule_id, result, blocking_reason} for all 5 rules
- `request_id`: correlation to the triggering request

---

## Section 5 — AUTONOMY_LEVEL Interaction

AUTONOMY_LEVEL is evaluated at three points in the pipeline:

| Phase | AUTONOMY_LEVEL Role |
|---|---|
| Phase 3 (Constitutional Gate) | Determines minimum governance score threshold (Section 4.3) |
| Phase 3 (Rule 5) | Determines which operations require explicit human approval |
| Phase 5 (TASK Execution) | Determines PLANNED→APPROVED transition authority (ARCH-12 Section 4) |

AUTONOMY_LEVEL does not affect Phases 1, 2, 4, 6, 7, or 8. Those phases execute identically regardless of the active level.

**At AUTONOMY_LEVEL=3 (current production):**
- Minimum governance score: 75
- PLANNED→APPROVED requires EXECUTIVE explicit approval (ARCH-12 Section 4)
- All other TASK transitions are automatic
- FORCE_TERMINATED transitions require EXECUTIVE explicit

---

## Section 6 — Circuit Breaker Integration

Circuit breakers (ARCH-09 Section 5) are enforced at Phase 5 (Execution). Before invoking any model tier:

1. Check the circuit breaker state for the target model tier (OPEN / HALF-OPEN / CLOSED)
2. If OPEN: reject the model invocation; return to the pipeline as a step failure
3. If HALF-OPEN: allow one probe invocation; on success, transition to CLOSED; on failure, reset to OPEN with extended backoff
4. If CLOSED: proceed normally

Circuit breaker state transitions are governed by the thresholds defined in ARCH-09 Section 5 (5 failures / 60s base backoff / 900s max). The circuit breaker state is held in-process (not persisted); it resets on service restart.

**Circuit breaker failure mode:** FAIL-SOFT for CONVERSATION class (the response degrades gracefully); FAIL-CLOSED for TASK and CIVILISATION_CYCLE class (model invocation failure fails the step).

---

## Section 7 — Differentiated Pipelines by Request Class

### 7.1 CONVERSATION Pipeline

The CONVERSATION pipeline handles stateful dialogue with the Founder. It is the most frequently invoked pipeline.

```
Phase 1: ADMISSION
Phase 2: IDENTITY RESOLUTION
Phase 3: CONSTITUTIONAL GATE
Phase 4: CONTEXT ASSEMBLY (conversation history + semantic recall)
Phase 5: EXECUTION
  5a. Classify intent (tool call, query, task creation, conversational)
  5b. If intent = task creation: emit PLANNED task record; transition to TASK pipeline approval
  5c. If intent = tool call: invoke tool (CAP-TOOL-* from ARCH-09); check trust level for tool
  5d. If intent = query or conversational: invoke CLAUDE model (CAP-MODEL-002 or 003)
  5e. Assemble response
Phase 6: RESPONSE COMMIT (session state; conversation history)
Phase 7: POST-RESPONSE GOVERNANCE (skill metrics; reflexion if insight detected)
Phase 8: RESOURCE RECONCILIATION
```

**Tool invocations within CONVERSATION:** Each tool invocation within a conversation phase is a capability invocation subject to:
- Trust level check (the effective_trust_level from Phase 2 must meet the tool's minimum_trust_level from ARCH-09)
- TB-005 Memory Write boundary if the tool writes memory
- EVT-018 TRUST_BOUNDARY_CROSSED on each tool entry

**Session state:** The CONVERSATION pipeline maintains session state in working_context (ARCH-10 Section 4.1). The conversation history is updated in Phase 6 and is available in Phase 4 on the next turn.

### 7.2 TASK Pipeline

The TASK pipeline manages the agent task lifecycle (ARCH-12). It can be invoked from a CONVERSATION (intent = task creation) or directly via the API.

```
Phase 1: ADMISSION
Phase 2: IDENTITY RESOLUTION
Phase 3: CONSTITUTIONAL GATE
Phase 4: CONTEXT ASSEMBLY (task record; strategic context; relevant episodic memory)
Phase 5: EXECUTION (dispatch to orchestrator.js)
  5a. PLANNED: task record created; EVT-001 (TASK_CREATED) emitted
  5b. APPROVAL: if AUTONOMY_LEVEL=3, EXECUTIVE approval awaited; on approval, status → APPROVED
  5c. QUEUED: enqueue with MAX_CONCURRENCY=3, MAX_QUEUE_DEPTH=50
  5d. EXECUTING: run 8-step agent pipeline (ARCH-12 Section 5)
       Step 0: RESEARCHER (optional, FAIL-SOFT)
       Step 1: ARCHITECT (FAIL-CLOSED)
       Step 2: DEVELOPER (FAIL-CLOSED)
       Step 3: REVIEWER (FAIL-CLOSED)
       Step 4: SECURITY (FAIL-CLOSED)
       Step 5: VALIDATOR (FAIL-CLOSED)
       Step 6: TESTER (FAIL-CLOSED)
       Step 7: COMMITTER (FAIL-CLOSED)
  5e. Terminal state: COMPLETED or FAILED
Phase 6: RESPONSE COMMIT (task record terminal state; EVT-003 or EVT-004; git commit + deploy)
Phase 7: POST-RESPONSE GOVERNANCE (reflexion record; EVT-011; REFLECTOR Obsidian write)
Phase 8: RESOURCE RECONCILIATION
```

**Canonical write path:** All task record state writes in Phase 5 are executed by `agent-system/orchestrator.js` (INV-AL1, ARCH-12 Section 6.2). `master-orchestrator.js` creates the initial PLANNED record and hands off; it writes no further state.

**Approval gate (AUTONOMY_LEVEL=3):** The pipeline pauses at 5b pending EXECUTIVE approval. The HTTP response from the initial TASK creation request is sent immediately with `status: AWAITING_APPROVAL`. The pipeline resumes when the approval API call arrives. The approval call itself goes through Phases 1–3 before the approval is recorded.

### 7.3 CIVILISATION_CYCLE Pipeline

The CIVILISATION_CYCLE pipeline implements the 8-phase self-improvement loop. It is triggered by the Render cron job or by EXECUTIVE command.

```
Phase 1: ADMISSION (cron or API caller identity)
Phase 2: IDENTITY RESOLUTION (system identity for cron; EXECUTIVE for API trigger)
Phase 3: CONSTITUTIONAL GATE (governance score ≥ 75 required; AUTONOMY_LEVEL=3)
Phase 4: CONTEXT ASSEMBLY (active goals; last cycle reflexion; performance metrics)
Phase 5: EXECUTION
  5a. EVT-008 (CIVILISATION_CYCLE_STARTED) emitted
  5b. Phase 1: Observe — collect metrics, governance score, skill metrics, reflexion lessons
  5c. Phase 2: Analyse — identify improvement candidates against active goals
  5d. Phase 3: Propose — generate improvement proposals (EVT-012 per proposal)
  5e. Phase 4: Prioritise — rank proposals by expected governance score delta
  5f. Phase 5: Plan — convert top-ranked proposals to PLANNED tasks
  5g. Phase 6: Execute — approve and run PLANNED tasks (AUTONOMY_LEVEL-gated)
  5h. Phase 7: Review — collect step_logs; identify lessons
  5i. Phase 8: Adapt — update skill metrics; update knowledge graph; store reflexion
Phase 6: RESPONSE COMMIT (goal state updates; EVT-009 CIVILISATION_CYCLE_COMPLETED)
Phase 7: POST-RESPONSE GOVERNANCE (batch reflexion writes; knowledge graph updates)
Phase 8: RESOURCE RECONCILIATION (cycle-level budget accounting)
```

**Cycle budget:** The CIVILISATION_CYCLE pipeline has a cycle-level budget cap separate from per-task caps. The cycle budget is the sum of all task budgets spawned within the cycle. Configurable; default $10.00 per cycle.

**AUTONOMY_LEVEL in cycle:** Individual tasks spawned in Phase 5f are subject to the AUTONOMY_LEVEL approval requirement (ARCH-12 Section 4). At AUTONOMY_LEVEL=3, each spawned task requires EXECUTIVE approval before proceeding to EXECUTING. The cycle does not auto-approve tasks on behalf of EXECUTIVE.

### 7.4 IMPROVEMENT Pipeline

The IMPROVEMENT pipeline deploys a specific improvement proposal: a code patch, configuration change, or schema migration.

```
Phase 1: ADMISSION
Phase 2: IDENTITY RESOLUTION (EXECUTIVE(5) minimum required)
Phase 3: CONSTITUTIONAL GATE (Rule 4 — irreversible state check applied; Rule 5 — EXECUTIVE required)
Phase 4: CONTEXT ASSEMBLY (improvement proposal record; affected scope)
Phase 5: EXECUTION
  5a. Validate the improvement patch (syntax check; scope check against ARCH-06 TB-006)
  5b. Create git worktree for isolated application
  5c. Apply the patch to the worktree
  5d. Run validation suite (node --check; unit tests if present)
  5e. On validation pass: commit to branch; create PR; await merge (EXECUTIVE authority)
  5f. On merge: deploy; EVT-013 (IMPROVEMENT_DEPLOYED) emitted
  5g. On validation fail: discard worktree; record failure reason; emit EVT-004 (TASK_FAILED)
Phase 6: RESPONSE COMMIT (improvement record; deployment record)
Phase 7: POST-RESPONSE GOVERNANCE (reflexion on improvement outcome; governance score recalculation)
Phase 8: RESOURCE RECONCILIATION
```

**Scope constraint:** The IMPROVEMENT pipeline must not modify files outside the declared scope of the improvement proposal. Scope is checked against the agent scope boundary (ARCH-06 TB-006). An improvement that modifies files outside scope must be rejected (FAIL-CLOSED).

---

## Section 8 — Session Lifecycle

### 8.1 Session Creation

A session is created at the first CONVERSATION request from a new user agent. Session creation:
1. Generate `session_id` (UUID v4)
2. Write session record to sessions table (SOT-004) with `status: ACTIVE`, `created_at`, `expires_at` (TTL: 24 hours)
3. Emit EVT-015 (SESSION_ESTABLISHED)
4. Initialise working_context for the session (ARCH-10 Section 4.1)

### 8.2 Session Expiry

Sessions expire after the configured TTL (default: 24 hours from last activity). Expiry:
1. Background job checks `expires_at` on sessions table
2. On expiry: set `status: EXPIRED`
3. Emit EVT-016 (SESSION_EXPIRED)
4. Flush working_context (ephemeral; discarded on expiry)
5. The session's episodic events that crossed the consolidation threshold are already in episodic_memory; no data loss on expiry

### 8.3 Session Limits

- Maximum concurrent active sessions: 10 (configurable)
- Maximum conversation turns per session: 500 (after which a new session must be created)
- Maximum working_context size: 50 entries (eviction by LRU after this limit)

---

## Section 9 — Resource Accounting

### 9.1 Per-Request Accounting

Each request produces the following resource accounting records:

| Event | When | Store |
|---|---|---|
| Budget reservation | Phase 5 start | In-process + resource_consumption table |
| Per-model-call cost | Each model invocation | EVT-020 + resource_consumption table |
| Budget cap breach | If $2.00 reached | EVT-021 + Governance Record |
| Final actual cost | Phase 8 | resource_consumption table; budget reservation released |

### 9.2 Budget Cap Enforcement

The $2.00 per-call cap is enforced at Phase 5 via the running-total tracker. When the running total reaches $2.00:
1. The current model API call is allowed to complete (no mid-call abort)
2. No further model invocations are initiated
3. The pipeline transitions to budget-capped terminal state
4. EVT-021 (BUDGET_CAP_REACHED) is emitted — GOVERNED
5. A Governance Record is written with the overage amount

### 9.3 Cycle-Level Budget Accounting

The CIVILISATION_CYCLE pipeline tracks budget at two levels:
- Per-task: $2.00 cap (ARCH-12 Section 7.1)
- Per-cycle: configurable cap (default $10.00)

If the cycle budget is exhausted before all planned tasks execute, no further tasks are spawned. Tasks already in EXECUTING continue to their natural terminal state.

---

## Section 10 — Audit Obligations Per Phase

| Phase | Mandatory Audit Records |
|---|---|
| Phase 2 | SESSION_ESTABLISHED (if new session); IDENTITY_RESOLVED |
| Phase 3 | CONSTITUTIONAL_GATE_EVALUATION (GOVERNED; always) |
| Phase 3 (BLOCK) | TRUST_BOUNDARY_REJECTED (EVT-019, TB-004) |
| Phase 3 (PASS) | TRUST_BOUNDARY_CROSSED (EVT-018, TB-004) |
| Phase 5 | TASK_CREATED (EVT-001); AGENT_INVOKED (EVT-010) per step |
| Phase 5 (each model call) | RESOURCE_CONSUMED (EVT-020) |
| Phase 6 | TASK_COMPLETED (EVT-003) or TASK_FAILED (EVT-004) |
| Phase 7 | REFLEXION_RECORDED (EVT-011) if reflexion produced |
| Phase 7 | KNOWLEDGE_GRAPH_UPDATED (EVT-023) if graph updated |
| Phase 8 | RESOURCE_CONSUMED (EVT-020, final); BUDGET_CAP_REACHED (EVT-021) if applicable |

All Phase 3 audit records must be written within the same transaction as the gate decision (ARCH-08 INV-A1).

---

## Section 11 — Runtime Execution Invariants

**INV-RT1 — Constitutional Gate Cannot Be Bypassed.** No code path may skip Phase 3. The gate executes for every request, including internal cron triggers and SOVEREIGN-level callers. An environment variable, flag, or configuration setting that disables Phase 3 is a constitutional violation.

**INV-RT2 — Phases 1–3 Precede Resource Consumption.** No model token, database write (beyond admission logging), or agent step may be initiated before Phase 3 completes with a PASS result.

**INV-RT3 — Response Is Not Sent Before Phase 6 State Commit.** The HTTP response or WebSocket message to the caller must not be sent before the Phase 6 authoritative state write succeeds. A response that confirms an action that has not been persisted is a constitutional violation.

**INV-RT4 — Phases 7–8 Do Not Block the Response.** Post-response governance and resource reconciliation must execute asynchronously. They must not delay the caller's response. The response is sent after Phase 6 completes; Phases 7 and 8 run after.

**INV-RT5 — Canonical Write Path for Task State.** All task lifecycle state writes in Phase 5 must be performed by `agent-system/orchestrator.js` (ARCH-12 INV-AL1). No other module may write task state beyond PLANNED.

**INV-RT6 — Audit Record Before State Change.** For every governed state transition in the pipeline, the audit record must be written before the transition completes (ARCH-08 INV-A1). The audit write and the state change must be in the same transaction.

---

## Section 12 — Known Implementation State

| Gap | Description | Resolution |
|---|---|---|
| C02 — Constitutional Gate UNCONDITIONALLY_OPEN | Gate currently returns PASS for all requests | Section 3.3 and Section 4 specify the FAIL-CLOSED gate; Phase 3 implementation is Phase 3 critical |
| Pipeline phases not formally sequenced | `lib/intelligence/civilization-runtime.js` does not implement the 8-phase model | Section 3 defines the canonical sequence; Phase 3 refactor obligation |
| AUTONOMY_LEVEL bypass at PLANNED→APPROVED | Tasks proceed without EXECUTIVE approval at AUTONOMY_LEVEL=3 | Phase 7.2 Step 5b specifies the approval gate; ARCH-12 Section 4 is the authority matrix |
| Per-request budget reservation not persisted | Budget tracked in-process only | Section 9.1: resource_consumption table writes required; ARCH-15 physical schema |
| master-orchestrator.js writes post-PLANNED state | Dual write path (ARCH-12 Section 6.1) | Section 7.2: orchestrator.js is canonical; master-orchestrator.js limited to PLANNED |
| setImmediate dispatch without persistence | Phase 7 events dispatched without event log write | ARCH-11 Section 5.2: transactional write protocol required |

---

## Section 13 — Downstream Dependencies

| Document | Dependency |
|---|---|
| ARCH-15: Database Schema Standard | Physical schema for all tables written in the pipeline (sessions, tasks, governance_records, resource_consumption, events) |

---

## Section 14 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification | SOVEREIGN |

---

*End of ARCH-14 — Runtime Execution Model*
