# APEX CIVILISATION — ARCH-12: Agent Lifecycle Model

**Version:** 1.0.0
**Status:** RATIFIED
**Date:** 2026-07-02
**Type:** Lifecycle Model
**Author:** Chief Enterprise Architect
**Depends on:** ARCH-00, ARCH-01, ARCH-02, ARCH-04, ARCH-07, ARCH-08, ARCH-09
**Depended on by:** ARCH-14

---

## Section 1 — Purpose and Scope

### 1.1 Purpose

This document defines the canonical lifecycle of an agent task in the APEX Civilisation: the stages, permitted transitions, data produced at each stage, resources allocated and released, the AUTONOMY_LEVEL authority matrix, the forced termination protocol, and the audit records produced at each transition.

It designates the canonical write path for agent task state and resolves the two-path problem (agent-task-cycle.js vs master-orchestrator.js) by naming one path as authoritative.

### 1.2 Scope

Covered: the seven-stage agent task lifecycle; transition conditions and evidence; data produced per stage; AUTONOMY_LEVEL interaction with each transition; budget reservation and release; forced termination; the canonical write path designation; audit obligations at each transition.

Not covered: the agent pipeline implementation details (orchestrator.js internals); model invocation within pipeline steps (ARCH-09 CAP-MODEL entries govern those); the post-task reflexion content (ARCH-10 Reflexion Tracker).

---

## Section 2 — Canonical Task Lifecycle

### 2.1 Stage Definitions

```
PLANNED → APPROVED → QUEUED → EXECUTING → COMPLETED
                                        → FAILED
                                        → CANCELLED
                                        → FORCE_TERMINATED
```

| Stage | Meaning |
|---|---|
| PLANNED | Task record created; parameters defined; not yet approved for execution |
| APPROVED | Execution authorised by the appropriate authority for the active AUTONOMY_LEVEL |
| QUEUED | Approved; awaiting resource availability (MAX_CONCURRENCY=3, MAX_QUEUE_DEPTH=50) |
| EXECUTING | Actively running the pipeline steps; resource budget reserved |
| COMPLETED | All pipeline steps finished successfully; outputs committed |
| FAILED | One or more pipeline steps failed without recovery; terminal |
| CANCELLED | Cancelled by OPERATIONAL authority or higher before EXECUTING reached a terminal step |
| FORCE_TERMINATED | Terminated by EXECUTIVE or SOVEREIGN authority mid-execution; terminal |

### 2.2 Transition Definitions

**PLANNED → APPROVED**
- Trigger: Authorised identity approves execution (see AUTONOMY_LEVEL matrix, Section 4)
- Evidence produced: Governance Record (approval decision, approving identity, AUTONOMY_LEVEL active)
- Data produced: `approved_by` field set on task record; `approved_at` timestamp
- Audit record: `REGISTRY_ENTRY_ADMITTED` (task admission into execution queue)
- Failure mode: FAIL-CLOSED — a task that cannot be approved stays in PLANNED

**APPROVED → QUEUED**
- Trigger: Task enters the execution queue; concurrency slot not yet available
- Evidence produced: Governance Record (queue entry, position, timestamp)
- Data produced: `queued_at` timestamp; queue position
- Audit record: TASK_STATE_CHANGED (EVT-002)
- Constraint: If MAX_QUEUE_DEPTH (50) is reached, the task is rejected back to PLANNED with a rejection reason

**QUEUED → EXECUTING**
- Trigger: Concurrency slot becomes available (MAX_CONCURRENCY=3); resource budget reserved
- Evidence produced: Governance Record (execution start, resource reservation amount)
- Data produced: `executing_at` timestamp; `budget_reserved_usd` (per-call cap: $2.00)
- Audit record: TASK_STATE_CHANGED + RESOURCE_CONSUMED (EVT-020, reservation)
- Constraint: Budget reservation must succeed before EXECUTING begins; if budget is exhausted, task transitions to FAILED with reason BUDGET_EXHAUSTED

**EXECUTING → COMPLETED**
- Trigger: All pipeline steps complete successfully; outputs committed to git and deployed
- Evidence produced: Reflexion Record (ARCH-10 Layer 11); Governance Record (completion, cost incurred)
- Data produced: `completed_at`; `actual_cost_usd`; `outputs` (JSONB); `lesson_id` (reflexion record reference)
- Audit record: TASK_COMPLETED (EVT-003) + REFLEXION_RECORDED (EVT-011)
- Resource release: `budget_reserved_usd` released; actual cost recorded to resource consumption table (SOT-006)

**EXECUTING → FAILED**
- Trigger: A pipeline step fails beyond the retry policy; or a FORCE_TERMINATED signal arrives during cleanup
- Evidence produced: Reflexion Record (failure analysis); Governance Record (failure reason, last successful step)
- Data produced: `failed_at`; `failure_reason`; `last_successful_step`; `actual_cost_usd`
- Audit record: TASK_FAILED (EVT-004) + REFLEXION_RECORDED (EVT-011)
- Resource release: Same as COMPLETED

**EXECUTING → CANCELLED**
- Trigger: OPERATIONAL authority or higher issues a cancellation before terminal step
- Evidence produced: Governance Record (cancelling identity, reason)
- Data produced: `cancelled_at`; `cancelled_by`; `cancellation_reason`
- Audit record: TASK_STATE_CHANGED
- Resource release: Partial cost recorded; budget reservation released

**EXECUTING → FORCE_TERMINATED**
- Trigger: EXECUTIVE or SOVEREIGN issues force termination; or a constitutional constraint is violated during execution
- Evidence produced: Governance Record (terminating identity, constitutional basis if applicable)
- Data produced: `force_terminated_at`; `terminated_by`; `termination_reason`
- Audit record: TASK_STATE_CHANGED with `constitutional_impact: true`
- Resource release: Partial cost recorded; all in-flight writes rolled back if possible; budget reservation released
- Post-termination: The git worktree is cleaned up; any uncommitted changes are discarded

---

## Section 3 — Data Produced Per Stage

| Stage | Task Record Fields Set | External Records Created |
|---|---|---|
| PLANNED | `task_id`, `task_type`, `description`, `planned_by`, `planned_at`, `status: PLANNED` | None |
| APPROVED | `approved_by`, `approved_at`, `status: APPROVED` | Governance Record |
| QUEUED | `queued_at`, `queue_position`, `status: QUEUED` | Governance Record |
| EXECUTING | `executing_at`, `budget_reserved_usd`, `status: EXECUTING` | Governance Record; Resource reservation record |
| COMPLETED | `completed_at`, `actual_cost_usd`, `outputs`, `lesson_id`, `status: COMPLETED` | Reflexion Record; Resource consumption record; Audit Record |
| FAILED | `failed_at`, `failure_reason`, `last_successful_step`, `actual_cost_usd`, `status: FAILED` | Reflexion Record; Resource consumption record; Audit Record |
| CANCELLED | `cancelled_at`, `cancelled_by`, `cancellation_reason`, `status: CANCELLED` | Governance Record; Partial resource consumption record |
| FORCE_TERMINATED | `force_terminated_at`, `terminated_by`, `termination_reason`, `status: FORCE_TERMINATED` | Governance Record; Partial resource record; Audit Record (constitutional_impact: true) |

---

## Section 4 — AUTONOMY_LEVEL Authority Matrix

AUTONOMY_LEVEL is a runtime setting (environment variable) that governs how much human approval is required at each lifecycle transition. Six levels are defined (1–6); the current confirmed operating level is 3.

| Transition | AUTONOMY_LEVEL 1–2 | AUTONOMY_LEVEL 3 | AUTONOMY_LEVEL 4 | AUTONOMY_LEVEL 5–6 |
|---|---|---|---|---|
| PLANNED → APPROVED | SOVEREIGN explicit approval | EXECUTIVE explicit approval | OPERATIONAL approval or auto-approve on governance score ≥ 80 | Auto-approve if governance score ≥ 60 |
| QUEUED → EXECUTING | Human confirmation required | Auto-proceed | Auto-proceed | Auto-proceed |
| EXECUTING → FORCE_TERMINATED (initiated by system) | Not applicable | EXECUTIVE explicit | EXECUTIVE explicit | OPERATIONAL explicit |
| Budget overrun escalation | SOVEREIGN approval | EXECUTIVE approval | OPERATIONAL approval | Auto-reject with notification |
| Agent scope boundary breach | SOVEREIGN approval | EXECUTIVE approval | OPERATIONAL auto-reject | Auto-reject |

**Constitutional constraint on AUTONOMY_LEVEL:** Regardless of the active AUTONOMY_LEVEL, the Constitutional Gate (TB-004, ARCH-06) must execute before every capability invocation. AUTONOMY_LEVEL does not bypass the Constitutional Gate. A AUTONOMY_LEVEL=6 system still requires governance score ≥ 60 before proceeding (ARCH-08 Section 7.3).

**AUTONOMY_LEVEL=3 (current):** PLANNED → APPROVED requires EXECUTIVE explicit approval. All other transitions are automatic once approval is granted. This is the production-confirmed operating level.

---

## Section 5 — The 8-Step Agent Pipeline

The APEX agent pipeline implements the EXECUTING stage. Eight step types (CAP-STEP-001 through CAP-STEP-008, ARCH-09) correspond to the following pipeline positions:

| Step | CAP-STEP ID | Agent Role | Optional? | Failure Mode |
|---|---|---|---|---|
| 0 | CAP-STEP-001 | RESEARCHER — Playwright web research | Yes (ML/research keywords only) | FAIL-SOFT: skipped if no research trigger |
| 1 | CAP-STEP-002 | ARCHITECT — Zod-validated JSON plan | No | FAIL-CLOSED: task fails if plan invalid |
| 2 | CAP-STEP-003 | DEVELOPER — code into git worktree | No | FAIL-CLOSED |
| 3 | CAP-STEP-004 | REVIEWER — spec conformance review | No | FAIL-CLOSED |
| 4 | CAP-STEP-005 | SECURITY — OWASP Top 10 review | No | FAIL-CLOSED |
| 5 | CAP-STEP-006 | VALIDATOR — confirms spec met | No | FAIL-CLOSED |
| 6 | CAP-STEP-007 | TESTER — `node --check` syntax validation | No | FAIL-CLOSED |
| 7 | CAP-STEP-008 | COMMITTER — git pull --rebase → commit → push → deploy | No | FAIL-CLOSED |
| 8 (async) | CAP-STEP-REFLECT | REFLECTOR — writes lesson to Obsidian + reflexion_records | Yes (async) | FAIL-SOFT: task COMPLETED even if reflexion fails |

Each step produces a `step_log` entry in the task record. Step failure transitions the task to EXECUTING with a failed step marker; after retry exhaustion, the task transitions to FAILED.

---

## Section 6 — Canonical Write Path Designation

### 6.1 The Two-Path Problem

The Phase 2 audit identified two independent paths for agent task state writes:
- `agent-system/orchestrator.js` — the primary 8-step pipeline
- `agent-system/master-orchestrator.js` — the roadmap parser / feature planning path

Both paths write task state with different controls and no reconciliation. This is a source-of-truth violation (ARCH-05 SOT-002).

### 6.2 Designation

**`agent-system/orchestrator.js` is the canonical write path for agent task lifecycle state.**

`agent-system/master-orchestrator.js` is designated a planning and coordination layer. It may create task records (PLANNED stage) but must hand off to `orchestrator.js` for all subsequent lifecycle transitions. `master-orchestrator.js` must not write task state beyond PLANNED independently.

This designation makes `orchestrator.js` the single write path for APPROVED through terminal states, satisfying SOT-002 (ARCH-05).

---

## Section 7 — Budget Lifecycle

### 7.1 Reservation

At QUEUED → EXECUTING: The per-call cap ($2.00) is reserved from the available budget pool. If the pool has insufficient budget, the task transitions to FAILED with reason BUDGET_EXHAUSTED.

### 7.2 Expenditure Tracking

During EXECUTING: Each model invocation writes a RESOURCE_CONSUMED record (EVT-020, SOT-006). The running total is maintained in-process and reconciled against the persistent record at step boundaries.

### 7.3 Release

At any terminal stage (COMPLETED, FAILED, CANCELLED, FORCE_TERMINATED): The reserved budget is released. The actual cost incurred is recorded as a final RESOURCE_CONSUMED entry. The net (reservation minus actual) is returned to the pool.

### 7.4 Budget Cap Enforcement

If the running total reaches $2.00 during EXECUTING: The current step is allowed to complete its current API call, then the task transitions to FAILED with reason BUDGET_CAP_REACHED. The task must not be silently truncated — a BUDGET_CAP_REACHED Governance Record is produced.

---

## Section 8 — Forced Termination Protocol

Forced termination may be triggered by:
- EXECUTIVE or SOVEREIGN authority (manual termination)
- Constitutional gate detecting a constitutional violation during execution
- Budget cap overrun after cap enforcement fails to stop the step

Protocol:
1. Signal is received by the orchestrator
2. The current model API call is allowed to complete (no mid-call abort — in-flight calls may not be cancelled)
3. No further pipeline steps are initiated
4. In-flight git worktree changes are discarded
5. A FORCE_TERMINATED Governance Record is produced with `constitutional_impact: true`
6. The task transitions to FORCE_TERMINATED
7. A TASK_STATE_CHANGED event is emitted
8. Budget reconciliation executes

---

## Section 9 — Task Record Schema

| Field | Type | Set At | Description |
|---|---|---|---|
| `task_id` | UUID v4 | PLANNED | Task identifier |
| `task_type` | string | PLANNED | FEATURE / BUG_FIX / REFACTOR / RESEARCH / MAINTENANCE |
| `description` | text | PLANNED | Human-readable task description |
| `planned_by` | JSONB | PLANNED | ARCH-04 identity snapshot of requester |
| `planned_at` | timestamptz | PLANNED | |
| `approved_by` | JSONB or null | APPROVED | Identity that approved |
| `approved_at` | timestamptz or null | APPROVED | |
| `queued_at` | timestamptz or null | QUEUED | |
| `queue_position` | integer or null | QUEUED | |
| `executing_at` | timestamptz or null | EXECUTING | |
| `budget_reserved_usd` | decimal or null | EXECUTING | |
| `step_log` | JSONB[] | EXECUTING | Array of step outcomes |
| `actual_cost_usd` | decimal or null | Terminal | |
| `outputs` | JSONB or null | COMPLETED | |
| `lesson_id` | UUID or null | COMPLETED/FAILED | Reflexion record reference |
| `failed_at` | timestamptz or null | FAILED | |
| `failure_reason` | string or null | FAILED | |
| `last_successful_step` | integer or null | FAILED | |
| `cancelled_at` | timestamptz or null | CANCELLED | |
| `cancelled_by` | JSONB or null | CANCELLED | |
| `cancellation_reason` | string or null | CANCELLED | |
| `force_terminated_at` | timestamptz or null | FORCE_TERMINATED | |
| `terminated_by` | JSONB or null | FORCE_TERMINATED | |
| `termination_reason` | string or null | FORCE_TERMINATED | |
| `status` | enum | Per transition | Current lifecycle stage |
| `governance_record_id` | UUID | Per transition | Latest governance record |
| `autonomy_level_at_approval` | integer | APPROVED | AUTONOMY_LEVEL active when approved |

---

## Section 10 — Agent Lifecycle Invariants

**INV-AL1 — Canonical Write Path.** All agent task lifecycle state transitions after PLANNED must be written by `agent-system/orchestrator.js`. Any other write path is a source-of-truth violation.

**INV-AL2 — Audit Record at Every Transition.** Every lifecycle stage transition produces an audit record before the transition completes. A transition without an audit record must not complete (ARCH-08 INV-A1).

**INV-AL3 — Constitutional Gate Cannot Be Bypassed by AUTONOMY_LEVEL.** No AUTONOMY_LEVEL value permits bypassing the Constitutional Gate (TB-004). AUTONOMY_LEVEL governs human approval requirements, not constitutional compliance.

**INV-AL4 — Budget Reservation Precedes EXECUTING.** A task may not enter EXECUTING without a successful budget reservation. A task that begins EXECUTING without budget reservation is in violation of the resource governance model.

**INV-AL5 — Terminal Stages Are Irreversible.** COMPLETED, FAILED, CANCELLED, and FORCE_TERMINATED are terminal. A task in a terminal stage may not be transitioned to any other stage. A new task must be created for retry.

**INV-AL6 — Forced Termination Produces constitutional_impact Record.** Every FORCE_TERMINATED transition produces an audit record with `constitutional_impact: true`. This ensures forced terminations are visible in governance score computation.

---

## Section 11 — Known Implementation State

| Gap | Description | Resolution |
|---|---|---|
| Dual write paths | `master-orchestrator.js` and `orchestrator.js` both write task state | Section 6: `orchestrator.js` designated canonical; `master-orchestrator.js` limited to PLANNED |
| AUTONOMY_LEVEL bypasses approval | At AUTONOMY_LEVEL=3, tasks proceed without EXECUTIVE approval as specified | Section 4: EXECUTIVE explicit approval required at level 3 — current behaviour is non-compliant with this specification; Phase 3 must enforce |
| Budget not persisted | Per-call cost tracked in-process only (GAP-RES) | Section 7: persistent resource consumption records required; ARCH-05 SOT-006 |
| Agent scope not enforced | Agent writes are not scope-checked against task record | ARCH-06 TB-006; INV-AL1 combined with gateway scope check in ARCH-10 |

---

## Section 12 — Downstream Dependencies

| Document | Dependency |
|---|---|
| ARCH-14: Runtime Execution Model | Agent task request pipeline uses this lifecycle model; AUTONOMY_LEVEL checks reference Section 4 |
| ARCH-15: Database Schema Standard | Task records table physical schema; step_log JSONB conventions |

---

## Section 13 — Document History

| Version | Date | Change | Authority |
|---|---|---|---|
| 1.0.0 | 2026-07-02 | Initial ratification | SOVEREIGN |

---

*End of ARCH-12 — Agent Lifecycle Model*
