# UX-14 — ACTIONS / APPROVALS

**APEX AI OS — UX Programme**
**Document ID:** UX-14
**Series:** Interface Canonical Documents
**Status:** CANONICAL — PRODUCTION AUDIT COMPLETE
**Classification:** CONFIDENTIAL — INTERNAL DESIGN REFERENCE
**Supersedes:** None (first issue)
**Predecessor documents:** UX-13-AGENTS.md
**Successor documents:** UX-15 (not yet issued)
**Audit basis:** Full production codebase review — August 2026
**Evidence standard:** OBSERVED = confirmed in source; INHERITED = from prior UX docs; PROPOSED = design intent not yet wired; OPEN = unresolved question

---

## 1. Authority

This document is issued under the APEX AI OS UX Programme. It is the canonical reference for all design, engineering, and governance decisions related to Actions and Approvals within the APEX system.

Classification of all findings in this document follows the canonical evidence taxonomy:

| Tag | Meaning |
|-----|---------|
| OBSERVED | Directly confirmed in production source code or database schema |
| INHERITED | Carried forward from UX-11, UX-12, or UX-13 without re-auditing |
| PROPOSED | Design intent that is not yet implemented or wired |
| OPEN | Unresolved — requires decision before implementation |

Implementation status tags (may be combined with evidence tags):

| Tag | Meaning |
|-----|---------|
| PRODUCTION ACTIVE | Running in production, wired end-to-end |
| PRODUCTION WIRED | Route and handler exist and call downstream |
| IMPLEMENTED | Code exists (function/table) but may not be fully wired to routes |
| PARTIAL | Some parts wired, some parts missing |
| PROTOTYPE ONLY | Exists in prototype or UI mockup only, not production |
| LEGACY | Exists in production but is superseded or deprecated |
| MISSING | Expected by design; not found in any production file |

This document establishes invariants, design constraints, and test scenarios that are binding on all subsequent APEX engineering work involving agent actions and approvals. Deviations must be documented in Section 43.

---

## 2. Objective

The APEX Actions / Approvals system governs the boundary between what APEX proposes and what APEX executes. The objective of this document is to:

1. Define the canonical action model, proposal model, and approval model for the APEX system.
2. Map all production approval routes, database schemas, and execution utilities to their observed status.
3. Establish the autonomy level architecture as it exists in production.
4. Define standing approval semantics, revocation, and scope.
5. Define reversibility semantics for each action type observed in production.
6. Identify all production gaps that require engineering work before the system is safe and complete.
7. Establish invariants that are binding on all future implementation work.
8. Provide verification scenarios for QA and design review.

The Actions / Approvals system is the primary safety mechanism of the APEX AI OS. It is the point at which autonomous agent intent becomes real-world effect. It must be designed conservatively and audited rigorously.

---

## 3. Scope

This document covers:

- All action types defined in `ALLOWED_AGENT_STEP_TYPES` (PRODUCTION ACTIVE — OBSERVED)
- All approval routes: `POST /api/tasks/approve`, `POST /api/tasks/run`, `POST /api/master/approve`
- All approval-related database tables: `standing_approvals`, `agent_actions`, `tool_executions`, `approvals`, `agent_tasks`, `apex_tasks`
- The undo / rollback architecture as observed in production
- Autonomy levels L1 through L4 as implemented in production
- Standing approval matching, persistence, and revocation
- Governance record creation at execution time
- The `tool-executor.js` execution classes (REFLEX, EXECUTIVE, BACKGROUND)
- Authority types from `lib/authority/authority-registry.js`
- Constitutional blocking and the agent self-authorisation prohibition
- Frontend approval surface requirements (including the CRITICAL GAP finding)
- All UX design requirements for proposing, approving, declining, deferring, and undoing actions

Out of scope: the upstream intelligence pipeline (UX-12), agent planner internals (UX-13), knowledge retrieval (UX-11), visual design system (UX-05), voice architecture (UX-07). Those documents govern their respective layers. This document governs the approval boundary only.

---

## 4. Non-Scope

The following are explicitly out of scope for UX-14:

- Agent planning and step generation (covered in UX-13)
- Intelligence scoring and confidence modelling (covered in UX-12)
- Knowledge graph and document classification (covered in UX-11)
- Visual design tokens, colour, spacing, typography (covered in UX-05)
- Domain-specific task flows beyond approval interactions (covered in UX-10)
- Personalisation and adaptation (covered in UX-10 Personalisation)
- Deployment pipeline architecture beyond the observation that code deployments are IRREVERSIBLE
- External API integrations beyond the observation that external API calls are IRREVERSIBLE
- Authentication, authorisation, and session management
- Multi-user / multi-tenant approval delegation (not yet designed — OPEN)
- DelegationRecord architecture (deferred to T3-09+)

---

## 5. Production Action Architecture

The following table maps every production component relevant to the Actions / Approvals system to its file location, implementation status, and evidence classification.

| Component | File | Status | Evidence |
|-----------|------|--------|---------|
| Task Approval Route | `src/routes/tasks.js` `POST /api/tasks/approve` | PRODUCTION WIRED | OBSERVED |
| Task Run Route | `src/routes/tasks.js` `POST /api/tasks/run` | PRODUCTION WIRED | OBSERVED |
| Master Approve Route | `src/routes/master.js` `POST /api/master/approve` | PRODUCTION WIRED | OBSERVED |
| Standing Approvals Table | `standing_approvals` (Supabase) | PRODUCTION ACTIVE | OBSERVED |
| Agent Actions Table | `agent_actions` (status: applied/undone) | PRODUCTION ACTIVE | OBSERVED |
| Tool Executions Table | `tool_executions` | PRODUCTION ACTIVE | OBSERVED |
| Approvals Table | `approvals` (schema defined) | PARTIAL | OBSERVED |
| Undo Record | `lib/agent-execution-utils.js:652` `undoAgentActionRecord` | IMPLEMENTED | OBSERVED |
| Document Snapshot | `lib/agent-file-utils.js:637` `getDocumentSnapshotForUndo` | IMPLEMENTED | OBSERVED |
| Tool Executor | `lib/tool-executor.js` | PRODUCTION ACTIVE | OBSERVED |
| Governance Records | `lib/governance.js` | PRODUCTION ACTIVE | OBSERVED |
| Autonomy Level | `AUTONOMY_LEVEL` env var | PRODUCTION ACTIVE | OBSERVED |
| Standing Approval Matching | `lib/agent-execution-utils.js` `getMatchingStandingApproval` | PRODUCTION ACTIVE | OBSERVED |
| Frontend Approval UI | `dashboard.html` | **MISSING** | OBSERVED |
| Public Undo Route | — | **MISSING** | OBSERVED |
| Approvals Table Wiring | `pgInsertApproval()` | **PARTIAL** | OBSERVED |
| Approval Expiry Enforcement | — | **MISSING / PROPOSED** | OBSERVED (schema field only) |
| Cancellation State | — | **PROPOSED** | OPEN |

### 5.1 Route Analysis

**`POST /api/tasks/approve`** (`src/routes/tasks.js`) — PRODUCTION WIRED — OBSERVED

This route is named "approve" but its observed behaviour is immediate execution. When called, it calls `_runTask(taskId, res)`, which starts the auto-pipeline for `apex_tasks`. This is a one-step approve-and-execute model, not an approve-then-wait model. The route does not insert a record into the `approvals` table before execution. The architectural gap between the route name and its behaviour must be documented for future engineers.

**`POST /api/tasks/run`** (`src/routes/tasks.js`) — PRODUCTION WIRED — OBSERVED

Runs a task via `_startAutoPipeline(taskId)` with a force flag. This is a direct execution route with no pre-execution approval gate. It is used to manually trigger task pipelines. Distinction from `/approve`: the `/run` route explicitly signals forced execution; `/approve` implies a preceding approval decision.

**`POST /api/master/approve`** (`src/routes/master.js`) — PRODUCTION WIRED — OBSERVED

Approves an improvement feature by `{ featureId, approved: bool }`. On approval, triggers `applyLatestCloudProposal()`. This route handles a different approval domain from task-level approvals — it governs master improvement proposals. The `approved: bool` design allows both approval and rejection in a single route.

### 5.2 Execution Pipeline

The production execution pipeline for agent tasks follows this sequence:

```
agent_tasks record created (status: pending)
  → agent planner generates step list
  → for each step:
      → check getMatchingStandingApproval(step)
          → if match: execute without interactive approval
          → if no match: check autonomy level
              → L1: require explicit approval
              → L2: auto-run if isSafeAutoAction(step)
              → L3: auto-run if isSafeLevel3WriteAction() AND canAutoRunLevel3Action()
      → tool-executor.js execute(name, input, sessionId)
          → REFLEX (500ms), EXECUTIVE (5s), or BACKGROUND (120s) class
      → pgInsertToolExecution() records each tool execution
      → pgLogAgentAction() records agent action
      → governance.js recordAgentDecision() fires
  → task status updated to completed or failed
```

---

## 6. Production Approval Architecture

### 6.1 Approval Flow Models

Two distinct approval flow models exist in production:

**Model A — Task Approval (apex_tasks):**
The `/api/tasks/approve` route triggers immediate execution via `_runTask()`. There is no explicit approval record inserted before execution. The model is: approve = execute.

**Model B — Agent Task Approval (agent_tasks):**
The `agent_tasks` table supports a richer state machine with `waiting_approval` and `pending_approval` states observed in production. This suggests a request-for-approval model where the agent pauses execution and waits for human input before proceeding. However, no frontend surface exists to surface this state to the user (CRITICAL GAP — OBSERVED).

**Model C — Master Improvement Approval:**
The `/api/master/approve` route handles improvement proposals. It uses an explicit `approved: bool` field, allowing both approval and rejection through the same endpoint. On approval, `applyLatestCloudProposal()` is called.

### 6.2 `approvals` Table

**Status: PARTIAL — OBSERVED**

Schema fields: `task_id, tool_execution_id, approved_by, action_type, pattern, is_standing, expires_at`

The function `pgInsertApproval()` is defined in `lib/supabase-helpers.js`. No production routes were found that call `pgInsertApproval()` directly. This means the approvals table is schema-complete but not actively populated by the current approval flow.

The `expires_at` field in the schema signals design intent for time-bounded approvals, but no expiry-checking middleware was found in production. Expiry enforcement is classified as MISSING / PROPOSED.

### 6.3 Missing Frontend Approval Surface

A full audit of `dashboard.html` confirmed zero matches for agent action, task approval, or approval UI patterns. No dedicated approval UI was found in any route file. This is the most consequential production gap in the Actions / Approvals system: the backend can process approvals but the user has no interface to see pending approvals, review proposed actions, approve or decline, manage standing approvals, or view execution history.

Classification: CRITICAL GAP — MISSING — OBSERVED

---

## 7. Evidence Classification

All claims in this document are classified by evidence type and implementation status. The combination appears in this format throughout the document:

`[EVIDENCE TAG] — [STATUS TAG]`

Examples:
- `OBSERVED — PRODUCTION ACTIVE` = confirmed in source code and running in production
- `OBSERVED — PARTIAL` = confirmed in source code but not fully wired or enforced
- `OBSERVED — MISSING` = absence confirmed by audit (e.g. grep returned zero matches)
- `PROPOSED — OPEN` = design intent not yet implemented, decision still needed
- `INHERITED — PRODUCTION ACTIVE` = carried from UX-13 and confirmed active

When a finding is ambiguous, the more conservative (less "active") status tag is applied. When evidence conflicts between source and observed behaviour, the observed behaviour takes precedence and the conflict is noted.

---

## 8. Action Model

An action is a discrete, bounded, executable operation proposed by an APEX agent that may change the state of the system or an external service. Actions are the atomic unit of APEX execution.

### 8.1 Canonical Action Structure

```
ACTION
├── IDENTITY:          action_type (e.g. create_document, delete_document)
├── PURPOSE:           why the action is needed (from agent plan)
├── PROPOSAL:          proposed state before approval
├── TARGET:            specific document/file/entity being acted upon
├── INPUTS:            parameters (filename, content, classification)
├── EXPECTED EFFECT:   what will change if approved
├── RISK:              READ | WRITE | DESTRUCTIVE (from step type)
├── REVERSIBILITY:     REVERSIBLE | PARTIALLY_REVERSIBLE | IRREVERSIBLE | UNKNOWN
├── AUTHORITY_REQ:     min authority level needed
├── APPROVAL_REQ:      boolean — depends on autonomy level and step type
├── EXECUTION:         actual operation via executeApprovedAgentActions()
├── RESULT:            success/failure, output, changed objects
└── EVIDENCE:          tool_executions record, agent_actions record, governance record
```

### 8.2 Action Types

The following action types are defined in `ALLOWED_AGENT_STEP_TYPES` (OBSERVED — PRODUCTION ACTIVE):

**READ actions (no approval needed at L1+):**
- `list_documents` — enumerate documents in a workspace
- `list_files` — enumerate files in a directory
- `search_documents` — query document index

**WRITE actions (approval needed at L1–L2; auto-run at L3):**
- `create_document` — create a new document in Supabase
- `create_workspace_file` — write a file to the workspace filesystem
- `summarize_document` — generate and store a document summary

**DESTRUCTIVE actions (approval needed at ALL autonomy levels):**
- `rename_document` — rename a document in Supabase storage and DB
- `delete_document` — permanently remove a document (with snapshot for undo)

### 8.3 Action Identity

Every action in APEX has a unique identity composed of:
- `action_type`: the step type string from `ALLOWED_AGENT_STEP_TYPES`
- `task_id`: the parent task context
- `agent_id`: the agent that generated the action
- `target`: the specific entity being acted upon

Two actions with identical `action_type` and `target` within the same task are not automatically equivalent — they may have different inputs, timing, and context. Each must be evaluated independently.

### 8.4 Action vs. Task vs. Step

These three concepts are distinct in APEX:

- **Task**: the top-level unit of work (recorded in `apex_tasks` or `agent_tasks`)
- **Step**: a single entry in the agent's plan (recorded as part of the plan in `agent_tasks.plan`)
- **Action**: the concrete, executable form of a step, with resolved inputs and targets (recorded in `agent_actions`)

The proposal model (Section 9) operates at the action level, not the task level. Approving a task does not approve all steps — each step that requires approval must be individually proposed and approved, unless a standing approval covers it.

---

## 9. Proposal Model

A proposal is a specific, bounded, approvable action that has NOT yet executed.

### 9.1 What a Proposal Must State

Every proposal surfaced to the user must contain all of the following:

| Field | Description | Example |
|-------|-------------|---------|
| WHAT APEX WANTS TO DO | action_type, human-readable | "Create a new document" |
| WHY | Agent's rationale from plan | "The task requires a summary of Q3 results" |
| TO WHAT | Target: specific filename / document | "Q3-Results-Summary.md" |
| WITH WHAT INPUT | Parameters and their values | content: "[full text]", classification: "INTERNAL" |
| EXPECTED EFFECT | What will be different after | "A new document will exist at this path" |
| RISK / CONSEQUENCE | Risk tier | "WRITE — creates new content" |
| WHAT REQUIRES APPROVAL | This specific step only | "Only this document creation is being proposed" |
| WHAT WILL NOT HAPPEN | Boundary — no automatic chain | "Approving this does not approve subsequent steps" |

### 9.2 Proposal Boundaries

A proposal is bounded. Approving a proposal approves exactly one action. The following are guaranteed by the proposal model:

- Approval of a proposal does not automatically approve any subsequent step in the same plan
- Approval of a proposal does not grant standing approval for future identical actions (unless explicitly converted to a standing approval)
- A proposal that times out (if expiry is enforced) is not automatically approved or declined — it enters EXPIRED state and must be re-proposed
- A proposal may be edited by the user before approval (see Section 29)

### 9.3 Proposal Lifecycle

```
STEP GENERATED BY AGENT PLANNER
  ↓
PROPOSAL CREATED (NOT YET EXECUTED)
  ↓
USER PRESENTED WITH PROPOSAL
  ↓
  ├── APPROVED → EXECUTING → COMPLETED / FAILED
  ├── DECLINED → STEP SKIPPED / TASK FAILED
  ├── DEFERRED → PROPOSAL HELD (timer set if expiry enforced)
  ├── EDITED → MODIFIED PROPOSAL → RE-PRESENTED
  └── EXPIRED (if timer elapsed) → USER NOTIFIED → RE-PROPOSE OR CANCEL
```

### 9.4 Proposal Integrity

A proposal must not be mutated between presentation and execution without explicit user action. The system must not silently alter inputs, targets, or parameters after the user has reviewed but before they have approved. If the system state changes such that the proposal is no longer valid (e.g. the target document was deleted), the proposal must be withdrawn and the user notified.

---

## 10. Approval Model

An approval is the human act of authorising a specific proposed action to execute. It is distinct from the proposal (which precedes it) and from execution (which follows it).

### 10.1 Approval as a Distinct Event

The canonical sequence is:

```
PROPOSAL → APPROVAL → EXECUTION → SUCCESS / FAILURE
```

Each arrow represents a distinct state transition. In the current production implementation, the `POST /api/tasks/approve` route collapses APPROVAL and EXECUTION into a single event (approve = execute). This is noted as an architectural constraint, not a design goal. The target architecture separates these states.

### 10.2 What Approval Means

When a user approves an action, they are asserting:
- They have read and understood the proposal
- They accept the expected effect and risk
- They authorise the system to execute this action now
- They understand that execution may be irreversible

### 10.3 What Approval Does Not Mean

Approval of one action does not mean:
- Approval of any subsequent action in the same plan
- Approval of any future identical action (unless converted to standing approval)
- Acceptance of any error or failure in execution
- Waiver of the right to request undo (where reversal is available)

### 10.4 Approval Recording

The `approvals` table is designed to record each formal approval event with fields: `task_id, tool_execution_id, approved_by, action_type, pattern, is_standing, expires_at`.

Current status: `pgInsertApproval()` is defined but not called by any production route. The approval event is not formally recorded in the `approvals` table. This is classified as PARTIAL — OBSERVED and is a production gap.

### 10.5 Approval vs. Standing Approval

A single approval authorises one action, one time. A standing approval (Section 13) authorises all future actions matching a given `action_type + pattern` combination, until revoked.

---

## 11. Approval States

### 11.1 State Definitions

| State | DB Source | Classification |
|-------|-----------|---------------|
| PENDING_APPROVAL | `agent_tasks.status = 'pending_approval'` | PRODUCTION ACTIVE — OBSERVED |
| WAITING_APPROVAL | `agent_tasks.status = 'waiting_approval'` | PRODUCTION ACTIVE — OBSERVED |
| APPROVED | `agent_tasks.status = 'approved'` | PRODUCTION ACTIVE — OBSERVED |
| COMPLETED | `agent_tasks.status = 'completed'` | PRODUCTION ACTIVE — OBSERVED |
| FAILED | `agent_tasks.status = 'failed'` | PRODUCTION ACTIVE — OBSERVED |
| DECLINED | — | PROPOSED — OPEN |
| EXPIRED | `approvals.expires_at` field | PARTIAL — schema exists, enforcement MISSING |
| CANCELLED | — | PROPOSED — OPEN |
| EXECUTING | `agent_tasks.status = 'running'` (post-approval) | PRODUCTION ACTIVE — OBSERVED |
| UNDONE | `agent_actions.status = 'undone'` | PRODUCTION ACTIVE — OBSERVED |

### 11.2 State Transition Diagram

```
[PENDING]
  ↓  (agent planner generates step requiring approval)
[PENDING_APPROVAL] / [WAITING_APPROVAL]
  ↓  (user approves)          ↓  (user declines — PROPOSED)   ↓  (timer elapses — PROPOSED)
[APPROVED]                   [DECLINED]                        [EXPIRED]
  ↓  (execution begins)
[EXECUTING / RUNNING]
  ↓  (success)      ↓  (failure)
[COMPLETED]        [FAILED]
  ↓  (user requests undo — MISSING frontend route)
[UNDONE]
```

### 11.3 PENDING_APPROVAL vs. WAITING_APPROVAL

Both states are observed in production in the `agent_tasks` table. The semantic distinction is not yet canonically defined in documentation. Based on naming convention:

- `WAITING_APPROVAL`: the task/step is actively paused, waiting for a human approval decision before proceeding
- `PENDING_APPROVAL`: the approval request has been created and is pending action but may not yet be in active wait state

This distinction requires clarification with engineering before frontend work proceeds. Classification: OPEN.

### 11.4 DECLINED State

No DECLINED state was observed in production schemas or status enumerations for `agent_tasks`. The `POST /api/master/approve` route uses `approved: bool` which could model decline as `approved: false`, but this is the master approval domain, not agent task approval. A DECLINED state for agent tasks must be designed and implemented. Classification: PROPOSED — OPEN.

### 11.5 CANCELLED State

No CANCELLED status was found for `apex_tasks` in `_parseTasks()` (only `pending`, `in_progress`, `completed`, `failed` observed). No CANCELLED status was confirmed for `agent_tasks`. Cancellation before and during execution is classified as PROPOSED — OPEN with no production evidence of implementation.

---

## 12. Approval Scope

### 12.1 Single-Action Scope (Default)

Every approval is scoped to exactly one action unless the user explicitly creates a standing approval. The approval covers:
- This `action_type`
- This `target`
- This moment in time
- This set of input parameters

Scope does not extend to any future action, even if identical.

### 12.2 Multi-Step Plans and Scope

When an agent has a multi-step plan, each step that requires approval must receive its own approval. The user must be shown each step individually before it executes. The user is not shown the entire plan as a single approve-all interface (unless the design introduces a bulk approval model — PROPOSED, not yet designed).

### 12.3 Plan Visibility

The full agent plan should be visible to the user for context, even if each step requires individual approval. Seeing the full plan allows the user to make informed decisions on individual steps. This is a PROPOSED UX requirement not yet implemented (MISSING frontend).

### 12.4 Scope Escalation

The user may escalate a single-action approval to a standing approval. This escalation must be an explicit, intentional user action, not a default. The system must clearly explain the scope difference when presenting the escalation option.

---

## 13. Standing Approvals

### 13.1 Production Implementation

Standing approvals are PRODUCTION ACTIVE — OBSERVED. The `standing_approvals` table is active in Supabase.

**Table fields:**
- `id` — primary key
- `name` — human-readable label (e.g. "Auto-approve list operations")
- `action_type` — matches step type (e.g. "list_documents")
- `pattern` — text pattern matched against step description
- `enabled` — boolean; false = revoked

**CRUD functions:**
- `pgCreateStandingApproval(name, actionType, pattern)` — create a new standing approval
- `pgListStandingApprovals()` — list all standing approvals (enabled and disabled)
- `pgDisableStandingApproval(id)` — revoke a standing approval by setting `enabled = false`
- `pgGetEnabledStandingApprovals(actionType)` — retrieve enabled approvals for a given action type

**Matching:**
- `getMatchingStandingApproval(step)` in `lib/agent-execution-utils.js`
- Checks the step description against all enabled patterns for the matching action_type
- When matched: step executes without interactive approval

### 13.2 Standing Approval Semantics

A standing approval is a persistent user decision that future steps matching the given `action_type + pattern` combination may execute without interactive approval. It is:
- Scoped to: all future matching steps while `enabled = true`
- Not scoped to: specific targets, specific tasks, or specific time windows (unless expiry is implemented)
- Not retroactive: does not affect past steps

### 13.3 Revocation

Revocation is via `pgDisableStandingApproval(id)`, which sets `enabled = false`. Effects of revocation:
- Immediate: all future step matching checks will no longer match this rule
- Does not undo past executions that were already approved by this rule
- Does not affect any step currently in execution

Revocation UI: MISSING. The frontend has no interface for listing, creating, or revoking standing approvals. This is a production gap.

### 13.4 Standing Approval Risk

Standing approvals increase the system's autonomy for the covered pattern. The UX design must make this risk visible:
- Show all active standing approvals prominently in the system settings
- Show the standing approval rule that matched when a step auto-executes
- Show execution history for steps covered by standing approvals
- Allow one-click revocation from the approval history view

### 13.5 Standing Approval for Destructive Actions

DESTRUCTIVE action types (`rename_document`, `delete_document`) require human approval at ALL autonomy levels (including L3). The system must not allow standing approvals for DESTRUCTIVE actions. This is classified as a design invariant (INV-ACTION-23).

The current production implementation does not enforce this restriction at the standing approval creation layer — `pgCreateStandingApproval()` accepts any `action_type` without validation. This is a production gap that must be remedied.

### 13.6 Standing Approval Expiry

The `approvals.expires_at` field exists in the schema. No expiry-checking middleware was found for standing approvals specifically. The standing_approvals table does not have an `expires_at` field in the observed schema — expiry exists only in the `approvals` table. Standing approval expiry is classified as PROPOSED — OPEN.

---

## 14. Autonomy Levels

### 14.1 Production Implementation

Autonomy levels are PRODUCTION ACTIVE — OBSERVED. Controlled by the `AUTONOMY_LEVEL` environment variable, defaulting to "1".

| Level | Name | Behaviour | Status |
|-------|------|-----------|--------|
| L1 | Default | All steps require explicit human approval | PRODUCTION ACTIVE — OBSERVED |
| L2 | Read-Auto | Read-only steps auto-run via `isSafeAutoAction(step)` predicate | PRODUCTION ACTIVE — OBSERVED |
| L3 | Write-Auto | Safe write steps auto-run via `isSafeLevel3WriteAction()` + `canAutoRunLevel3Action()`; DESTRUCTIVE steps still require approval | PRODUCTION ACTIVE — OBSERVED |
| L4 | Full-Auto | DISABLED — `getAutonomyLevelMessage()` returns non-null blocking message | PRODUCTION ACTIVE (disabled) — OBSERVED |

### 14.2 L1 — Default (Explicit Approval)

At L1, every step in an agent's plan that is not a READ action requires explicit human approval before execution. READ actions (`list_documents`, `list_files`, `search_documents`) do not require approval at any level because they produce no side effects.

L1 is the safe default. New APEX installations must start at L1.

### 14.3 L2 — Read Auto-Execute

At L2, READ steps (`isSafeAutoAction(step)` = true) execute automatically without approval. All WRITE and DESTRUCTIVE steps still require explicit approval.

The `isSafeAutoAction()` predicate determines which steps qualify. The predicate's exact logic must be documented in the engineering reference. From the step type classification (Section 8.2), READ steps are the expected scope.

### 14.4 L3 — Write Auto-Execute

At L3, READ steps auto-execute (as at L2). Additionally, WRITE steps that satisfy both `isSafeLevel3WriteAction()` and `canAutoRunLevel3Action()` auto-execute. DESTRUCTIVE steps (`rename_document`, `delete_document`) still require explicit approval at L3.

The distinction between L2 and L3 write auto-execution depends on both the step type and a context check (`canAutoRunLevel3Action()`). The context check's logic must be documented in the engineering reference.

### 14.5 L4 — DISABLED

L4 (full autonomy, no approval required for any step) is disabled in production. `getAutonomyLevelMessage()` returns a non-null message when L4 is requested, preventing activation. L4 must not be re-enabled without explicit architectural review and governance approval.

### 14.6 Autonomy Level and Standing Approvals

Standing approvals operate independently of autonomy levels. A standing approval for a WRITE action at L1 will auto-execute that action even though L1 would otherwise require explicit approval for WRITE steps. The standing approval takes precedence.

This interaction must be surfaced clearly in the UX: when a step auto-executes due to a standing approval, the UI must indicate which standing approval rule matched, regardless of the current autonomy level.

### 14.7 Changing the Autonomy Level

Changing `AUTONOMY_LEVEL` requires a server restart in the current implementation (env var). The UX design requires a runtime-configurable autonomy level with immediate effect, without server restart. This is a PROPOSED capability. Current implementation requires a deployment to change the level.

---

## 15. Risk

### 15.1 Risk Classification

Every action type in APEX is assigned a risk tier based on its potential to cause undesired or irreversible change:

| Risk Tier | Definition | Action Types | Approval Required |
|-----------|-----------|--------------|-------------------|
| READ | No state change; no side effects | `list_documents`, `list_files`, `search_documents` | Never |
| WRITE | Creates or modifies content; reversible in most cases | `create_document`, `create_workspace_file`, `summarize_document` | L1–L2; auto L3 |
| DESTRUCTIVE | Removes or renames content; may be irreversible | `rename_document`, `delete_document` | ALL levels |
| EXTERNAL | Calls external services; cannot be recalled | API calls, code deployment | ALL levels |

### 15.2 Risk Presentation

The risk tier must be prominently displayed on every proposal card presented to the user. The presentation must not bury risk information in fine print. Risk-appropriate visual treatment applies:
- READ: neutral / informational tone
- WRITE: moderate emphasis; user should be aware
- DESTRUCTIVE: strong emphasis; user must actively acknowledge the destructive nature
- EXTERNAL: strongest emphasis; system must confirm irreversibility before proceeding

### 15.3 Risk Escalation

If an agent plan contains a mix of risk tiers, the user must not be presented with a uniform approval experience. Each step must be presented with its individual risk tier. The system must not aggregate risk in a way that obscures individual step risk.

### 15.4 Unclassified Risk

If an action type is encountered that is not in `ALLOWED_AGENT_STEP_TYPES`, it must be classified as UNKNOWN risk and require explicit approval. Unrecognised action types must not auto-execute regardless of autonomy level.

---

## 16. Consequence

### 16.1 Consequence Disclosure

Every proposal presented to the user must include a consequence statement: a plain-language description of what will be different if this action executes. The consequence statement must be specific, not generic.

Good: "A new document named 'Q3-Results-Summary.md' will be created in your Personal workspace with the following content: [preview]."
Bad: "A document will be created."

### 16.2 Irreversible Consequences

When an action is IRREVERSIBLE, the consequence statement must explicitly say so:

"This action cannot be undone. Once executed, the system cannot reverse it automatically. You may need to intervene manually."

### 16.3 Downstream Consequences

If approving a step will likely trigger a downstream step that is also consequential, the system should surface this. The user should not be surprised by subsequent proposals that follow from the action they approved. The full plan should be visible (see Section 12.3).

### 16.4 Consequence and the `agent_actions` Table

The `agent_actions` table records `actions_json` (what was done) and `undo_json` (how to reverse it). These are the production evidence of consequence tracking. The UX must surface both fields — what happened and whether it can be undone — in the execution history view.

---

## 17. Evidence

### 17.1 Evidence Architecture

Every executed action in APEX generates three types of evidence (PRODUCTION ACTIVE — OBSERVED):

**Tool Execution Record** (`tool_executions` table):
- Fields: `task_id, agent_id, tool_name, input, output, cost_usd, duration_ms`
- Written by: `pgInsertToolExecution()`
- Purpose: atomic record of each tool execution with inputs, outputs, cost, and timing

**Agent Action Record** (`agent_actions` table):
- Fields: `id, action_type, status, request, plan, actions_json, undo_json, result`
- Status values: `applied`, `undone`
- Written by: `pgLogAgentAction()`
- Purpose: records the full action with its reversibility data (undo_json)

**Governance Record** (`lib/governance.js`):
- Functions: `recordAgentDecision()`, `recordRollbackEvent()`, `appendEvidenceBlock()`, `issueCertification()`
- All fire-and-forget writes to Supabase
- Purpose: institutional audit trail, reasoning capture, certification

### 17.2 Evidence Completeness

All three evidence types must be written for every executed action. If any evidence write fails, the system must log the failure but must not retroactively prevent or undo the action (the evidence failure is a secondary concern to the primary action outcome).

### 17.3 Evidence for Declined Actions

Currently, no evidence record is written for declined actions (there is no DECLINED state). The design target is to record declined proposals in the `approvals` table (`approved_by = null`, or with a rejection record), but this requires the `pgInsertApproval()` wiring to be completed.

### 17.4 Evidence UI

The user must be able to access all three evidence streams from the frontend:
- Full execution history from `tool_executions`
- Agent action history including undo status from `agent_actions`
- Governance audit trail from governance records

None of these are currently surfaced in `dashboard.html`. Classification: MISSING — OBSERVED.

---

## 18. Intelligence Integration

The Actions / Approvals system sits downstream of the Intelligence layer (UX-12). The boundary between intelligence and approval is:

- Intelligence: generates confidence scores, selects actions, generates rationale
- Approval: presents the proposed action to the user for human authorisation

### 18.1 Inherited Intelligence Properties

The following intelligence properties are inherited by the approval layer (INHERITED from UX-12):

- Confidence score: the agent's assessed confidence in the proposed action's correctness
- Rationale: the agent's reasoning for why this action is needed
- Supporting evidence: which knowledge sources informed the proposal
- Alternative actions: other actions the agent considered and rejected

### 18.2 Confidence in Approval UI

The agent's confidence score for a proposed action must be surfaced in the approval UI. A low-confidence action requires more prominent user attention. The design may apply visual weight proportional to the inverse of confidence (low confidence = more friction).

### 18.3 Intelligence Cannot Approve

The Intelligence layer cannot approve its own proposals. Intelligence generates proposals; Approval is a human act. This boundary is a constitutional invariant (INV-ACTION-02). An agent cannot call `POST /api/tasks/approve` on its own behalf.

---

## 19. Agent Integration

### 19.1 Agent Tasks and Approval

Agents create work items in `agent_tasks` with status `pending`. When an agent step requires human approval, the task transitions to `waiting_approval` or `pending_approval` (both observed in production). The agent pauses execution and waits for the human to act.

### 19.2 Agent Cannot Proceed Without Approval

When a step requires approval and the task is in `waiting_approval` or `pending_approval` state, the agent must not proceed to the next step. The execution loop must block on the approval state. If the agent somehow bypasses this block, the invariant INV-ACTION-01 is violated.

### 19.3 Agent Action Records

The `agent_actions` table links agent execution to its audit trail. The agent is identified by `agent_id` in `tool_executions`. The full execution record (request, plan, actions, undo, result) is stored in `agent_actions`. This is the agent's "receipt" for every action it takes.

### 19.4 Authority Types

From `lib/authority/authority-registry.js` (PRODUCTION ACTIVE — OBSERVED):
- OBSERVATION — the agent observed a fact
- INTERPRETATION — the agent interpreted evidence
- DECISION — the agent made a decision
- PROJECTION — the agent projected a future state
- AUDIT — the agent reviewed past actions

Actions are authorised at the DECISION authority level. The agent cannot self-authorise at DECISION level. Authority must flow from the human approval event. Full DelegationRecord semantics are deferred to T3-09+ (INHERITED from UX-13).

---

## 20. Governance

### 20.1 Governance Functions (PRODUCTION ACTIVE — OBSERVED)

All governance functions are in `lib/governance.js`:

- `recordAgentDecision(reasoning, confidence, inputs, outputs)` — records the agent's reasoning for an action
- `recordRollbackEvent()` — records when a rollback/undo occurs
- `appendEvidenceBlock()` — adds additional evidence to an existing decision record
- `issueCertification()` — issues a formal certification that an action was performed correctly

All functions are fire-and-forget writes to Supabase. Governance failures do not block execution.

### 20.2 Governance and Approval

Every approved action must generate a governance record. The governance record must capture:
- What was proposed
- What was approved
- By whom (approved_by)
- When
- What was the agent's reasoning (from `recordAgentDecision`)
- What was the outcome

The link between the approval event and the governance record is currently not fully wired (the `approvals` table is not being written by production routes). This is a gap.

### 20.3 Governance Certification

`issueCertification()` is designed to formally certify that an action was performed correctly. The certification conditions (what qualifies an action for certification) are not documented in the codebase audit. This must be defined before certification is used in a compliance context.

---

## 21. Constitutional Blocking

### 21.1 Definition

A constitutional block is a hard stop enforced by the APEX system that cannot be bypassed by any human approval or autonomy level change. Constitutional blocks represent absolute invariants — system properties that must always be true.

### 21.2 Known Constitutional Blocks (OBSERVED / INHERITED)

**INV-AGENT-14 (inherited from UX-13):** Agents cannot self-authorise. No agent may approve or trigger its own proposed actions without a human approval event in the causal chain.

**L4 Disabled:** `getAutonomyLevelMessage()` enforces a hard block on L4 activation. Even if `AUTONOMY_LEVEL=4` is set, the system refuses to enable full autonomy. This block cannot be bypassed by a standing approval or approval route call.

### 21.3 Cannot-Be-Approved-Away List

The following actions cannot be authorised regardless of approval state, autonomy level, or standing approval:
- Activating L4 autonomy (blocked in production)
- Agent self-approval (no route path exists)
- Executing an action of an unrecognised type (UNKNOWN type blocks execution)
- Bypassing constitutional governance record creation

### 21.4 Block vs. Warning

A constitutional block is not a warning. A warning can be acknowledged and bypassed. A block cannot. The UX must distinguish these clearly:
- Warning: amber visual treatment, user can acknowledge and proceed
- Constitutional block: red, non-dismissable, system explains why, no "proceed anyway" option

---

## 22. Execution

### 22.1 Tool Executor (PRODUCTION ACTIVE — OBSERVED)

Production file: `lib/tool-executor.js`

The tool executor handles all action execution. It supports three execution classes:

| Class | Timeout | Use Case |
|-------|---------|----------|
| REFLEX | 500ms | Fast, deterministic operations (e.g. list operations) |
| EXECUTIVE | 5s | Standard operations (e.g. document create) |
| BACKGROUND | 120s | Long-running operations (e.g. large file processing) |

**Functions:**
- `execute(name, input, sessionId)` — executes an action; throws on validation failure or timeout
- `dispatch(name, input, sessionId)` — fire-and-forget variant; does not wait for completion

**Events emitted:**
- `TOOL_DISPATCHED` — when tool execution begins
- `TOOL_COMPLETED` — when tool execution ends (success or failure)

**Validation:** optional Zod schema validation of inputs before execution.

### 22.2 Execution Sequence

```
Approval received
  ↓
tool-executor execute(name, input, sessionId) called
  ↓
TOOL_DISPATCHED event emitted
  ↓
Zod validation (if schema defined) — throws on failure
  ↓
Timeout class determined (REFLEX / EXECUTIVE / BACKGROUND)
  ↓
Action executed
  ↓
TOOL_COMPLETED event emitted
  ↓
pgInsertToolExecution() records tool execution
  ↓
pgLogAgentAction() records agent action
  ↓
governance.js recordAgentDecision() fires
  ↓
Task status updated (completed / failed)
```

### 22.3 Execution Atomicity

Each step executes as an atomic unit. A failure in one step does not automatically roll back preceding steps. If a multi-step plan partially executes before failure, the completed steps remain applied (see Section 25).

### 22.4 Execution and the Approval Model

In the current production model, `POST /api/tasks/approve` calls `_runTask()` which immediately starts execution. There is no explicit "approval recorded → execution later" gap. The design target is to separate approval recording from execution scheduling, but this requires architectural changes to the current route.

---

## 23. Execution Evidence

### 23.1 Per-Execution Records

For every tool execution, the following evidence is recorded:

**`tool_executions` record:**
- `task_id` — parent task
- `agent_id` — executing agent
- `tool_name` — name of tool/action
- `input` — full input parameters (JSON)
- `output` — full output (JSON)
- `cost_usd` — cost of the execution (for AI model calls)
- `duration_ms` — execution time in milliseconds

**`agent_actions` record:**
- `action_type` — type of action
- `status` — `applied` or `undone`
- `request` — original request context
- `plan` — agent's plan at execution time
- `actions_json` — what was done (structured)
- `undo_json` — how to reverse it (structured)
- `result` — execution result

### 23.2 Evidence Gaps

The following evidence is currently not captured:
- Who approved the action (`approved_by` field in `approvals` table not being written)
- Whether approval was manual or standing (`is_standing` field not being written)
- Approval timestamp (not captured separately from execution timestamp)
- Declined proposals (no evidence record for declined actions)

These gaps must be addressed in the `approvals` table wiring work.

---

## 24. Failure

### 24.1 Failure Modes

An action can fail in the following ways:

| Failure Mode | Description | DB State | User Notification |
|-------------|-------------|----------|-------------------|
| Validation failure | Input fails Zod schema check | `agent_tasks.status = 'failed'` | PROPOSED |
| Timeout | Execution exceeds class timeout | `agent_tasks.status = 'failed'` | PROPOSED |
| Runtime error | Exception during execution | `agent_tasks.status = 'failed'` | PROPOSED |
| Target not found | Target document/file does not exist | `agent_tasks.status = 'failed'` | PROPOSED |
| Permission denied | Agent lacks authority for action | `agent_tasks.status = 'failed'` | PROPOSED |
| Partial failure | Some steps succeed, later step fails | Mixed states | PROPOSED |

### 24.2 Failure Notification

When an action fails, the user must be notified with:
- Which action failed
- Why it failed (error message in user-friendly language)
- What state the system is in (which preceding steps completed successfully)
- What the user can do next (retry, modify, cancel, contact support)

Failure notification is PROPOSED — there is no evidence of a frontend failure notification surface in `dashboard.html`.

### 24.3 Failure and Evidence

Even for failed actions, evidence records must be written. A failed tool execution must still be recorded in `tool_executions` with the error in the `output` field. A failed agent action must still be recorded in `agent_actions` with the failure in the `result` field.

---

## 25. Partial Execution

### 25.1 Definition

Partial execution occurs when a multi-step agent plan executes some steps successfully before encountering a failure. The successfully executed steps are not automatically rolled back.

### 25.2 Production Behaviour (OBSERVED)

From the production audit: each step is applied in sequence; a failed step does not auto-rollback completed steps. The system does not have an automatic rollback mechanism for partial execution.

### 25.3 Partial Execution Recovery

When partial execution occurs, the user must be shown:
- Which steps completed successfully
- Which step failed and why
- Which steps were not reached (were pending at time of failure)
- What manual or assisted remediation is available

The user may choose to:
- Manually undo completed steps (via undo functionality, where available)
- Accept the partial state and continue from the failed step
- Abandon the task

### 25.4 Undo of Partial Execution

The undo architecture (`undoAgentActionRecord`) processes `undo_json` entries in reverse order. For a partially executed plan, the undo function can reverse the completed steps, but only if:
- Each completed step has an entry in `undo_json`
- Each entry has the data needed for reversal (e.g. document snapshot for `restore_document`)
- A public undo route exists (currently MISSING — OBSERVED)

Until the public undo route is implemented, partial execution recovery requires manual intervention.

---

## 26. Cancellation

### 26.1 Pre-Execution Cancellation

Before execution begins (while a task is in `PENDING_APPROVAL` or `WAITING_APPROVAL` state), the user should be able to cancel the task. Cancellation at this stage has no side effects — no actions have executed.

Production status: no explicit `cancelled` state confirmed for `agent_tasks`. The `apex_tasks` table has no `cancelled` status in `_parseTasks()`. Pre-execution cancellation is classified as PROPOSED — OPEN.

### 26.2 During-Execution Cancellation

During execution (while a task is in `running` state), cancellation is significantly more complex. No production evidence of mid-execution task cancellation was found. The challenges are:
- The tool executor does not expose a cancellation API
- Background-class executions (120s timeout) cannot be interrupted mid-execution
- Steps may be at any point in their execution when the cancel signal arrives

During-execution cancellation is classified as PROPOSED — OPEN. It requires engineering design work before implementation.

### 26.3 Cancellation UI

No cancellation UI was found in `dashboard.html`. When cancellation is implemented:
- A cancel button must be available for tasks in PENDING_APPROVAL, WAITING_APPROVAL, and RUNNING states
- Cancellation during execution must show a warning about partial execution risk
- The UI must show the cancellation outcome and any partial execution state

### 26.4 Cancellation Evidence

When a task is cancelled, a cancellation event must be recorded in the evidence trail. The cancelled state must be distinguishable from failed in `agent_tasks.status`.

---

## 27. Reversibility

### 27.1 Production Reversibility Evidence

| Action | Reversibility | Mechanism | Evidence |
|--------|--------------|-----------|---------|
| `create_document` | REVERSIBLE | undo_json: `delete_document` entry removes created document | OBSERVED |
| `delete_document` | REVERSIBLE | undo_json: `restore_document` + document snapshot in `undo_json.document` | OBSERVED |
| `rename_document` | REVERSIBLE | undo_json: reverse rename in Supabase storage + DB | OBSERVED |
| `create_workspace_file` | PARTIALLY_REVERSIBLE | file deletion possible; explicit undo entry not confirmed in audit | OBSERVED (partial) |
| Multi-step partial execution | PARTIAL | earlier completed steps remain; manual undo required | OBSERVED |
| Code deployment | IRREVERSIBLE | no rollback found in production; git commit+push not undoable by system | OBSERVED |
| External API calls | IRREVERSIBLE | no rollback mechanism found | OBSERVED |
| Pipeline execution | IRREVERSIBLE | full pipeline completion cannot be reversed by system | OBSERVED |
| `summarize_document` | UNKNOWN | no undo entry observed; classification requires confirmation | OPEN |

### 27.2 Undo Architecture (PRODUCTION PARTIAL)

**`undoAgentActionRecord(record)`** — `lib/agent-execution-utils.js:652` — IMPLEMENTED — OBSERVED
- Processes `undo_json` entries in reverse order
- Handles three entry types:
  - `delete_document`: removes created document (reverts `create_document`)
  - `restore_document`: restores from snapshot stored in `undo_json.document` field
  - `rename_document`: reverses rename in Supabase storage + DB

**`getDocumentSnapshotForUndo(filename)`** — `lib/agent-file-utils.js:637` — IMPLEMENTED — OBSERVED
- Takes a pre-destructive snapshot of a document before a destructive operation
- The snapshot is stored in `undo_json.document` for later restoration

**Public Undo Route** — MISSING — OBSERVED
- `undoAgentActionRecord` is imported in `server.js:185` but no public route was found that exposes undo to the frontend
- This means undo functionality exists in code but is inaccessible to users
- Classification: CRITICAL GAP

### 27.3 Undo UX Requirements

When undo is available for an action:
- An "Undo" option must be visible in the execution history immediately after the action completes
- The undo option must show what will be reversed
- The undo option must have a time window (PROPOSED — expiry not yet implemented)
- After undo completes, the action's status in `agent_actions` transitions to `undone`
- A `recordRollbackEvent()` governance record must be written

When undo is not available (IRREVERSIBLE):
- The action history must clearly show "Cannot be undone"
- The undo option must be absent (not greyed out — absence is less confusing)

### 27.4 Implementing the Undo Route

The public undo route must be designed as follows:
- `POST /api/actions/:id/undo`
- Request body: `{ actionId: string }`
- Server-side: calls `undoAgentActionRecord(record)` with the retrieved record
- Returns: confirmation of undo with list of reversed entries
- Must require the same authority level as the original approval
- Must record `recordRollbackEvent()` in governance

---

## 28. User Confirmation

### 28.1 Confirmation Design Principles

When presenting a proposal for user confirmation:

1. **Show, don't abbreviate** — display the full action with real values, not summaries
2. **Risk first** — display the risk tier before the details
3. **Default to decline** — the default state must not be "approve"; the user must take an affirmative action
4. **No dark patterns** — do not make decline harder than approve through button placement, colour, or timing
5. **Reversibility visible** — always show whether the action is reversible before the user decides

### 28.2 Confirmation for Destructive Actions

For DESTRUCTIVE actions (`rename_document`, `delete_document`), a two-step confirmation is required:
1. First: show the proposal and risk tier
2. Second: require explicit typed confirmation (e.g. type the document name to confirm deletion) or a second affirmative button press with a distinct label (e.g. "Yes, delete this document permanently")

### 28.3 Confirmation Timeout

If a confirmation request is left unanswered, it should eventually expire. When the `approvals.expires_at` mechanism is implemented, the UX must show:
- A countdown timer on the proposal card
- A warning when less than 30 seconds remain
- Transition to EXPIRED state with a clear message when the timer elapses

Currently, no expiry enforcement exists (MISSING — OBSERVED). Confirmation timeout is PROPOSED.

### 28.4 Confirmation and Autonomy Level

At L1, all WRITE and DESTRUCTIVE proposals require explicit confirmation. At L2 and L3, the user must be informed when steps have auto-executed without confirmation, in near-real-time. At all levels, DESTRUCTIVE proposals require confirmation.

---

## 29. Proposal Editing

### 29.1 User Editing of Proposals

The user may edit a proposal before approving it. For example:
- Change the target document name before approving `create_document`
- Modify the content before approving `summarize_document`
- Correct an input parameter the agent set incorrectly

### 29.2 Edit Constraints

Editing a proposal:
- Creates a new proposal revision (the original proposal is superseded)
- Requires re-presentation of the edited proposal to the user for final confirmation
- Does not bypass any risk tier check or constitutional block
- Must be logged: the system must record that the user modified the agent's proposed action

### 29.3 Edit History

The system should maintain an edit trail for modified proposals, showing the original agent proposal alongside the user-modified version that was actually approved and executed. This supports the governance requirement and the user's ability to review decisions.

### 29.4 Limits on Editing

The user may not edit:
- The `action_type` — the type of action is fundamental; if the user wants a different action, they should decline the proposal and issue a new instruction
- Constitutional properties — edits that would remove undo_json entries or disable governance recording are not permitted

---

## 30. Deferral

### 30.1 Deferral Definition

Deferral is the user's decision to neither approve nor decline a proposal, but to hold it for later decision. A deferred proposal remains in `PENDING_APPROVAL` state.

### 30.2 Deferral Behaviour

When a proposal is deferred:
- The agent's plan pauses at this step
- No execution occurs
- The proposal remains visible in the "Pending Decisions" view
- If expiry is enforced, the deferral timer continues running
- The user may return and approve, decline, or edit the deferred proposal

### 30.3 Deferral and Multi-Step Plans

In a multi-step plan, deferring one step defers all subsequent steps (since they cannot execute until the deferred step is resolved). The UI must make clear that deferring step 2 also defers steps 3 through N.

### 30.4 Deferral Persistence

Deferred proposals must persist across sessions. If the user closes the application and returns later, deferred proposals must be visible and actionable. The `agent_tasks` table's `waiting_approval` / `pending_approval` states support this persistence (PRODUCTION ACTIVE — OBSERVED).

---

## 31. Expiry

### 31.1 Expiry Architecture

The `approvals.expires_at` field exists in the schema (OBSERVED). No expiry-checking middleware was found in production (MISSING — OBSERVED). Expiry enforcement is classified as PROPOSED.

### 31.2 Expiry Design (PROPOSED)

When implemented, expiry should work as follows:
- Each proposal is given an expiry time when created (default: configurable, e.g. 24 hours)
- A background process checks `approvals.expires_at` periodically
- When a proposal expires:
  - Status transitions to EXPIRED
  - The user is notified
  - The agent's plan pauses (same as deferral, but system-initiated)
  - The user may re-propose (which creates a new proposal with a new expiry time)
- Expired proposals cannot be approved or declined — they must be re-proposed

### 31.3 Expiry for Standing Approvals

Standing approvals do not currently have an `expires_at` field in the `standing_approvals` table. Time-bounded standing approvals are PROPOSED. Without expiry, standing approvals persist indefinitely until explicitly revoked.

### 31.4 Expiry UI

When expiry is implemented:
- All pending proposals must show a countdown timer or expiry datetime
- Proposals approaching expiry (e.g. < 1 hour) must show a warning
- Expired proposals must be clearly marked and removed from the active queue

---

## 32. Proactive Communication

### 32.1 Scope

Proactive communication for the Actions / Approvals system refers to:
- Notifying the user when a new proposal is waiting for their decision
- Notifying the user when an auto-executed action completes (at L2/L3)
- Notifying the user when an action fails
- Notifying the user when a deferred proposal is approaching expiry
- Notifying the user when a standing approval has been triggered

This section inherits from UX-09 (Proactive Communication) and applies its principles to the approval domain.

### 32.2 Notification Timing

| Event | Notification Timing | Channel |
|-------|-------------------|---------|
| New proposal requiring approval | Immediate | In-app + voice (if active) |
| Auto-executed action (L2/L3) | Within 5 seconds of completion | In-app |
| Action failure | Immediate on failure | In-app + voice (if active) |
| Proposal approaching expiry | At -1 hour and -15 minutes | In-app |
| Proposal expired | Immediately on expiry | In-app |
| Standing approval triggered | Within 5 seconds of auto-execution | In-app |
| Undo completed | Immediately on undo completion | In-app |

### 32.3 Notification Content

Each notification must include:
- What action it relates to
- What decision or acknowledgement is required (if any)
- A deep link to the relevant proposal, execution record, or task

### 32.4 Notification Volume

At high autonomy levels (L3), the system may execute many steps without user interaction. The notification design must avoid overwhelming the user with per-step notifications. A digest mode that summarises multiple completed steps is PROPOSED.

---

## 33. Voice

### 33.1 Voice and Approval (Inherited from UX-07)

Voice is a primary interaction channel in APEX (UX-07). The Actions / Approvals system must be fully operable by voice. This section defines voice-specific requirements for the approval flow.

### 33.2 Voice Proposal Presentation

When a proposal is pending and the user is in a voice session:
- APEX announces the proposal verbally
- The verbal announcement covers: what APEX wants to do, to what, why, and the risk level
- APEX then waits for a voice command

### 33.3 Voice Approval Commands

| Voice Command | Action |
|--------------|--------|
| "Approve" / "Yes" / "Go ahead" | Approve the current proposal |
| "Decline" / "No" / "Don't" / "Cancel" | Decline the current proposal |
| "Hold" / "Wait" / "Not now" / "Defer" | Defer the current proposal |
| "Tell me more" / "Explain" | Full verbal read of all proposal details |
| "Show me" / "Details" | Open the visual proposal card |
| "Undo" | Attempt undo of the most recent action |

### 33.4 Voice Confirmation for Destructive Actions

Destructive actions require two-step voice confirmation:
- Step 1: APEX announces the destructive action and asks for confirmation
- Step 2: APEX asks the user to say the document name or say "Confirm delete" to complete

A single "yes" is insufficient for destructive action approval via voice.

### 33.5 Voice Auto-Execution Announcement

When a step auto-executes (L2/L3 or standing approval), APEX must verbally announce what happened unless the user has configured silent auto-execution. The announcement must be brief: "I've listed your documents. Ready for the next step."

---

## 34. Context

### 34.1 Contextual Approval

Approval decisions benefit from context. The approval UI must provide the user with enough context to make an informed decision without overwhelming them. Context includes:

- The current task objective (why the agent is running this plan)
- The position of this step in the plan (step 3 of 7)
- What preceded this step (what has already executed)
- What follows this step (what will be proposed next, if approved)
- The agent's confidence in this step
- Any relevant knowledge or intelligence that informed the proposal

### 34.2 Context Depth Control

The user may want more or less context depending on their familiarity with the task. The UI must support:
- Compact view: risk tier, action summary, approve/decline buttons
- Full view: all context fields as listed above

The user's preferred view depth is a personalisation setting (see Section 36).

### 34.3 Context and the Knowledge Boundary

Context shown in the approval UI must come from the APEX knowledge layer (UX-11) and intelligence layer (UX-12), not from external sources not yet verified by the system. If the system cannot determine the context of a proposal (e.g. the agent plan context is missing), the proposal must still be presented but with a clear "Context unavailable" indicator.

---

## 35. Domain

### 35.1 Domain-Specific Approval Behaviour

Different APEX domains (UX-10) may have domain-specific approval requirements. While the core approval model is domain-agnostic, domain contexts may affect:
- Default autonomy level for domain-specific tasks
- Standing approval eligibility for domain-specific actions
- Risk classification of domain-specific step types
- Confirmation language and labels (domain-appropriate terminology)

### 35.2 Domain Approval Override

A domain may specify that certain actions require stricter approval than the global autonomy level would otherwise require. For example, a legal document domain may require explicit approval for `summarize_document` even at L3. Domain overrides take precedence over the global autonomy level but cannot override constitutional blocks.

### 35.3 Domain Approval UI

The approval UI must adapt its language and presentation to the active domain:
- Domain-appropriate labels (e.g. "Add entry to case file" rather than "create_document" in a legal context)
- Domain-appropriate consequence descriptions
- Domain-relevant evidence display (e.g. show document classification level in a knowledge management domain)

---

## 36. Personalisation

### 36.1 User Approval Preferences (Inherited from UX-10 Personalisation)

Users may have persistent approval preferences:
- Preferred default autonomy level (subject to system minimum)
- Standing approvals they have created (visible in settings)
- Preferred proposal view depth (compact vs. full context)
- Notification preferences for auto-executed actions
- Voice vs. visual confirmation preference

### 36.2 Learned Approval Patterns

Over time, the system may observe the user's approval patterns and suggest standing approvals for frequently approved action+pattern combinations. The suggestion must be explicit and require user confirmation to activate. The system must not silently create standing approvals.

### 36.3 Approval History as Personalisation Signal

The user's approval history informs the intelligence layer's confidence model. If a user consistently approves a certain action type, the agent's confidence in proposing that type increases. If a user consistently declines or modifies a certain type, the agent should adjust its proposals accordingly.

---

## 37. Prototype

### 37.1 Prototype Status

No production frontend approval UI exists in `dashboard.html` (MISSING — OBSERVED). No approval UI was found in any prototype directory based on the audit.

### 37.2 Prototype Requirements for V1

The V1 prototype must implement:

1. **Pending Approvals View** — list of all proposals in `PENDING_APPROVAL` / `WAITING_APPROVAL` state
2. **Proposal Card** — for each pending proposal: action type, target, inputs, expected effect, risk tier, reversibility, approve/decline/defer buttons
3. **Execution History View** — list of completed actions from `agent_actions` and `tool_executions`
4. **Standing Approvals Management** — list active standing approvals, create new, revoke existing
5. **Undo Surface** — for REVERSIBLE actions in execution history: an undo button that calls the (to-be-created) undo route

### 37.3 Prototype Exclusions

V1 prototype may exclude:
- Proposal editing (Section 29)
- Expiry countdown timers (requires expiry enforcement)
- Voice approval interface (requires voice integration)
- Cancellation during execution
- Multi-user approval delegation

---

## 38. Scenarios

All 45 verification scenarios for the Actions / Approvals system. Each scenario includes: preconditions, trigger, expected system behaviour, expected UI behaviour, pass/fail criteria.

---

### V-ACTION-01: Single WRITE action approval at L1

**Preconditions:** Autonomy level = L1. Agent has a single-step plan: `create_document` for filename "Report.md".
**Trigger:** Agent plan is ready for execution.
**Expected system:** Task status = `waiting_approval`. Agent execution paused.
**Expected UI:** Proposal card displayed with: action_type=create_document, target=Report.md, expected effect, risk tier=WRITE, reversibility=REVERSIBLE, approve/decline/defer buttons.
**Pass criteria:** Proposal card is visible. No execution has occurred before user approves.

---

### V-ACTION-02: User approves WRITE action at L1

**Preconditions:** V-ACTION-01 complete. Proposal card displayed.
**Trigger:** User clicks Approve.
**Expected system:** `POST /api/tasks/approve` called. `_runTask()` executes. `create_document` executes. `tool_executions` record written. `agent_actions` record written with `status=applied`. Task status = `completed`.
**Expected UI:** Proposal card disappears. Execution history shows the completed action. Undo option visible.
**Pass criteria:** Document created. Evidence records written. Undo option available in UI.

---

### V-ACTION-03: User declines WRITE action at L1

**Preconditions:** V-ACTION-01 complete. Proposal card displayed.
**Trigger:** User clicks Decline.
**Expected system:** Task step marked declined (PROPOSED — no DECLINED state exists). Task fails or is marked with appropriate terminal status.
**Expected UI:** Proposal card removed from pending queue. Message shown: "Action declined. Task cannot continue." or similar.
**Pass criteria:** No execution occurred. Step was not executed. Task status is updated.
**Gap note:** DECLINED state not implemented. Current system behaviour on decline is undefined — this is a PROPOSED scenario.

---

### V-ACTION-04: READ action at L1 auto-executes

**Preconditions:** Autonomy level = L1. Agent plan includes `list_documents`.
**Trigger:** Agent plan executes.
**Expected system:** `list_documents` auto-executes without user approval (READ actions exempt at all levels). `tool_executions` record written.
**Expected UI:** Execution history shows the auto-executed READ action with a "No approval required" label.
**Pass criteria:** READ action executed without proposal card. Evidence written.

---

### V-ACTION-05: WRITE action auto-executes at L3

**Preconditions:** Autonomy level = L3. Agent plan includes `create_document`. `isSafeLevel3WriteAction()` and `canAutoRunLevel3Action()` both return true.
**Trigger:** Agent plan executes.
**Expected system:** `create_document` auto-executes. `tool_executions` record written. `agent_actions` record written.
**Expected UI:** Notification shown to user within 5 seconds: "APEX created document X automatically." Execution history shows the auto-executed action with the L3 label.
**Pass criteria:** Document created. User notified. Evidence written. No proposal card shown.

---

### V-ACTION-06: DESTRUCTIVE action requires approval at L3

**Preconditions:** Autonomy level = L3. Agent plan includes `delete_document` for "OldReport.md".
**Trigger:** Agent plan reaches the delete step.
**Expected system:** Task status = `waiting_approval`. Execution paused. Document snapshot taken via `getDocumentSnapshotForUndo("OldReport.md")`.
**Expected UI:** Proposal card displayed with risk tier=DESTRUCTIVE. Two-step confirmation UI shown (e.g. type document name to confirm).
**Pass criteria:** No deletion occurs before two-step confirmation. Snapshot taken before approval. Proposal card shows DESTRUCTIVE risk.

---

### V-ACTION-07: User completes two-step confirmation for DESTRUCTIVE action

**Preconditions:** V-ACTION-06 complete. Proposal card with two-step confirmation displayed.
**Trigger:** User types "OldReport.md" and clicks "Yes, delete permanently".
**Expected system:** `delete_document` executes. Snapshot stored in `undo_json.document`. `agent_actions` record written with `undo_json`. Task completed.
**Expected UI:** Confirmation acknowledged. Execution history shows delete with reversibility=REVERSIBLE and undo option.
**Pass criteria:** Document deleted. Snapshot in undo_json. Undo option available.

---

### V-ACTION-08: Standing approval auto-executes a WRITE step

**Preconditions:** Standing approval exists: `name="Auto summarise", action_type="summarize_document", pattern="summarise", enabled=true`. Agent plan includes `summarize_document` with step text containing "summarise".
**Trigger:** Agent plan reaches the summarize step.
**Expected system:** `getMatchingStandingApproval(step)` returns the standing approval. Step auto-executes without interactive approval. Evidence written.
**Expected UI:** Notification shown: "APEX summarised document X (standing approval: Auto summarise)." Execution history shows the action with standing approval label.
**Pass criteria:** Summarize executed without proposal card. Correct standing approval rule shown in history.

---

### V-ACTION-09: Standing approval creation

**Preconditions:** User is viewing a proposal card for `list_documents`.
**Trigger:** User clicks "Always approve this type of action" (or equivalent).
**Expected system:** `pgCreateStandingApproval(name, actionType, pattern)` called. Record created in `standing_approvals` with `enabled=true`.
**Expected UI:** Confirmation: "Standing approval created. Future list_documents steps matching this pattern will execute automatically." Standing approvals list updated.
**Pass criteria:** DB record created. Future matching steps auto-execute.

---

### V-ACTION-10: Standing approval revocation

**Preconditions:** Standing approval exists with `enabled=true`.
**Trigger:** User clicks Revoke on the standing approval in settings.
**Expected system:** `pgDisableStandingApproval(id)` called. Record updated with `enabled=false`.
**Expected UI:** Standing approval removed from active list. Moved to "Revoked" section.
**Pass criteria:** Immediately after revocation, matching steps are no longer auto-executed. Past executions are not affected.

---

### V-ACTION-11: User requests undo of `create_document`

**Preconditions:** `create_document` completed. `agent_actions` record has `undo_json` with `delete_document` entry. Undo route exists.
**Trigger:** User clicks Undo in execution history.
**Expected system:** `undoAgentActionRecord(record)` called. `delete_document` entry processed. Document deleted. `agent_actions.status` updated to `undone`. `recordRollbackEvent()` fires.
**Expected UI:** Undo confirmation shown. Execution history updated: action shows status=UNDONE.
**Pass criteria:** Document deleted (undone). `agent_actions.status = undone`. Governance rollback event recorded.
**Gap note:** Public undo route is MISSING. This scenario is currently not executable from the frontend.

---

### V-ACTION-12: User requests undo of `delete_document`

**Preconditions:** `delete_document` completed. Snapshot stored in `undo_json.document`. Undo route exists.
**Trigger:** User clicks Undo in execution history.
**Expected system:** `undoAgentActionRecord(record)` called. `restore_document` entry processed. Document restored from snapshot. `agent_actions.status = undone`. `recordRollbackEvent()` fires.
**Expected UI:** Undo confirmation shown. Document visible again in workspace.
**Pass criteria:** Document restored from snapshot. Status = undone. Governance event recorded.
**Gap note:** Public undo route is MISSING.

---

### V-ACTION-13: User requests undo of `rename_document`

**Preconditions:** `rename_document` completed. `undo_json` has reverse rename entry. Undo route exists.
**Trigger:** User clicks Undo in execution history.
**Expected system:** `undoAgentActionRecord(record)` called. `rename_document` reverse entry processed. Document renamed back in Supabase storage and DB. `agent_actions.status = undone`.
**Expected UI:** Document appears with original name. Execution history shows UNDONE.
**Pass criteria:** Document has original name. Status = undone.
**Gap note:** Public undo route is MISSING.

---

### V-ACTION-14: Attempt undo of IRREVERSIBLE action

**Preconditions:** External API call completed. No undo_json. User navigates to execution history.
**Trigger:** User looks for undo option on the external API action.
**Expected system:** No undo option exposed (action_type has no undo handler). No undo attempt made.
**Expected UI:** Action in history shows "Cannot be undone." No undo button visible.
**Pass criteria:** No undo option shown. No failed undo attempt.

---

### V-ACTION-15: Multi-step plan with mixed risk tiers

**Preconditions:** L1. Agent plan: [1] `list_documents` (READ), [2] `create_document` (WRITE), [3] `delete_document` (DESTRUCTIVE).
**Trigger:** Agent plan executes.
**Expected system:** Step 1 auto-executes (READ). Step 2 proposal displayed for approval. On approval, step 2 executes. Step 3 proposal displayed with DESTRUCTIVE treatment. On two-step confirmation, step 3 executes.
**Expected UI:** Plan progress visible: Step 1 complete, Step 2 pending, Step 3 queued. Each proposal shown individually.
**Pass criteria:** Each step approved individually. Correct risk treatment for each step.

---

### V-ACTION-16: Multi-step plan partial failure

**Preconditions:** L1. Agent plan: [1] `create_document` (approved, succeeded), [2] `create_document` target causes name collision (fails).
**Trigger:** Step 2 fails with runtime error.
**Expected system:** `agent_tasks.status = 'failed'`. Step 1 remains `applied` in `agent_actions`. Step 2 recorded in `tool_executions` with error in output.
**Expected UI:** Task shown as FAILED. Step 1 shown as completed. Step 2 shown as failed with error. Option to undo Step 1 visible.
**Pass criteria:** Partial execution state is visible. Step 1 not auto-rolled back. Undo available for Step 1.

---

### V-ACTION-17: Master improvement approval

**Preconditions:** An improvement proposal with `featureId = "feat-42"` is pending.
**Trigger:** User calls `POST /api/master/approve` with `{ featureId: "feat-42", approved: true }`.
**Expected system:** `applyLatestCloudProposal()` triggered. Feature applied.
**Expected UI:** Improvement proposal marked as APPROVED. Application status shown.
**Pass criteria:** Feature applied after approval. UI reflects applied state.

---

### V-ACTION-18: Master improvement rejection

**Preconditions:** Improvement proposal with `featureId = "feat-43"` is pending.
**Trigger:** User calls `POST /api/master/approve` with `{ featureId: "feat-43", approved: false }`.
**Expected system:** Proposal rejected. `applyLatestCloudProposal()` not called. Proposal status updated.
**Expected UI:** Proposal marked as DECLINED. Reason for decline (if any) captured.
**Pass criteria:** Feature not applied. UI reflects declined state.

---

### V-ACTION-19: Autonomy level L1 — all WRITE steps require approval

**Preconditions:** `AUTONOMY_LEVEL=1`. Agent plan has 5 `create_document` steps.
**Trigger:** Agent plan executes.
**Expected system:** Each `create_document` step generates a proposal. Task waits for each approval before proceeding.
**Expected UI:** Each proposal card shown in sequence. User approves or declines each individually.
**Pass criteria:** No `create_document` executes without an individual approval at L1.

---

### V-ACTION-20: Autonomy level L2 — READ auto-executes, WRITE requires approval

**Preconditions:** `AUTONOMY_LEVEL=2`. Agent plan: [1] `search_documents`, [2] `create_document`.
**Trigger:** Agent plan executes.
**Expected system:** Step 1 auto-executes (isSafeAutoAction). Step 2 proposal displayed for approval.
**Expected UI:** Step 1 shown in execution history as auto-executed. Step 2 proposal card displayed.
**Pass criteria:** Step 1 auto-executed without proposal. Step 2 required approval.

---

### V-ACTION-21: Autonomy level L3 — safe WRITE auto-executes

**Preconditions:** `AUTONOMY_LEVEL=3`. Agent plan: `create_document`. `isSafeLevel3WriteAction()=true`, `canAutoRunLevel3Action()=true`.
**Trigger:** Agent plan executes.
**Expected system:** `create_document` auto-executes. Evidence written. User notified.
**Expected UI:** Notification within 5 seconds. Execution history shows auto-executed with L3 label.
**Pass criteria:** Step auto-executed. User notified. Evidence written.

---

### V-ACTION-22: L4 activation attempt

**Preconditions:** Operator attempts to set `AUTONOMY_LEVEL=4`.
**Trigger:** Server starts with `AUTONOMY_LEVEL=4`.
**Expected system:** `getAutonomyLevelMessage()` returns non-null. L4 activation blocked. System falls back to L1 or throws startup error.
**Expected UI:** Error message visible in admin/config view explaining L4 is disabled.
**Pass criteria:** L4 does not activate. System remains at a lower level. Constitutional block is enforced.

---

### V-ACTION-23: Standing approval for DESTRUCTIVE action — blocked

**Preconditions:** User attempts to create a standing approval for `delete_document`.
**Trigger:** User calls standing approval creation with `action_type = "delete_document"`.
**Expected system:** System rejects the creation (INV-ACTION-23 enforcement). Error returned.
**Expected UI:** Error message: "Standing approvals cannot be created for destructive actions."
**Pass criteria:** Standing approval not created. User informed of the block.
**Gap note:** This validation is not currently implemented in `pgCreateStandingApproval`. It must be added.

---

### V-ACTION-24: Proposal expiry (PROPOSED)

**Preconditions:** Expiry enforcement implemented. Proposal created with `expires_at = now + 1 hour`.
**Trigger:** 1 hour elapses without user action.
**Expected system:** Background process detects expiry. Proposal status → EXPIRED. User notified.
**Expected UI:** Proposal card replaced with "This proposal has expired. Start over?"
**Pass criteria:** Proposal expires. User notified. No action taken on expired proposal.
**Gap note:** Expiry enforcement is MISSING. This is a PROPOSED scenario.

---

### V-ACTION-25: Deferred proposal returned to

**Preconditions:** Proposal deferred. Task is in `waiting_approval`. User returns to the app.
**Trigger:** User opens Pending Decisions view.
**Expected system:** Deferred proposal is visible in pending queue, retrieved from `agent_tasks` with status `waiting_approval`.
**Expected UI:** Proposal card shown with "Deferred" label and time since deferral.
**Pass criteria:** Deferred proposal persists across sessions. Visible and actionable on return.

---

### V-ACTION-26: Action failure notification

**Preconditions:** `create_document` approved and executing. Runtime error occurs.
**Trigger:** `tool-executor.js` throws exception.
**Expected system:** `agent_tasks.status = 'failed'`. `tool_executions` record written with error. Governance record written.
**Expected UI:** Immediate notification: "Action failed: [error summary]. Document was not created." Link to full error in execution history.
**Pass criteria:** User notified. Failure recorded. No partial state left uncommunicated.

---

### V-ACTION-27: Execution timeout

**Preconditions:** `create_document` is EXECUTIVE class (5s timeout). Document creation takes 10 seconds.
**Trigger:** 5 second timeout elapses.
**Expected system:** `execute()` throws timeout error. `agent_tasks.status = 'failed'`. Evidence written with timeout error.
**Expected UI:** Notification: "Action timed out. The document was not created."
**Pass criteria:** Timeout enforced. Task failed. Evidence written. User notified.

---

### V-ACTION-28: Voice approval of WRITE action

**Preconditions:** Voice session active. WRITE proposal pending.
**Trigger:** APEX announces proposal verbally. User says "Approve."
**Expected system:** Voice command recognised as approve. Approval signal sent. Execution begins.
**Expected UI:** Approval acknowledged verbally: "Got it. Creating the document now." Visual proposal card updates to EXECUTING state.
**Pass criteria:** Voice approval triggers execution. Verbal and visual confirmation given.

---

### V-ACTION-29: Voice decline of proposal

**Preconditions:** Voice session active. Proposal pending.
**Trigger:** User says "No" or "Don't do that."
**Expected system:** Voice command recognised as decline. Proposal declined. Task updated.
**Expected UI:** Verbal: "Okay, I won't do that. What would you like instead?" Visual card removed.
**Pass criteria:** Decline recognised. No execution. User prompted for next instruction.

---

### V-ACTION-30: Voice approval of DESTRUCTIVE action — two steps required

**Preconditions:** Voice session active. DESTRUCTIVE proposal pending.
**Trigger:** APEX announces delete proposal verbally. User says "Yes."
**Expected system:** Single "yes" not sufficient for DESTRUCTIVE. APEX asks for second confirmation.
**Expected UI:** Verbal: "This will permanently delete OldReport.md. Say the document name to confirm."
**Pass criteria:** Single "yes" does not trigger delete. Second confirmation step required.

---

### V-ACTION-31: User edits proposal before approval

**Preconditions:** `create_document` proposal presented with filename "report.md".
**Trigger:** User edits filename field to "Q3-Report-FINAL.md" and clicks Approve.
**Expected system:** Modified proposal (with new filename) executed. Edit recorded. `agent_actions` records modified parameters.
**Expected UI:** Edited proposal re-presented for confirmation with changed fields highlighted. Approve button available after review.
**Pass criteria:** Document created with edited filename. Edit recorded in evidence.

---

### V-ACTION-32: Constitutional block on agent self-approval

**Preconditions:** Agent attempts to call `POST /api/tasks/approve` on its own task.
**Trigger:** Agent issues HTTP call to approval route with its own `taskId`.
**Expected system:** System detects self-approval attempt (agent_id matches task's agent_id). Request rejected. Constitutional block logged.
**Expected UI:** No approval UI presented to agent. Block recorded in governance.
**Pass criteria:** Self-approval rejected. Governance record created. Task remains in `waiting_approval`.

---

### V-ACTION-33: Governance record written at execution

**Preconditions:** `create_document` approved and executing.
**Trigger:** Tool executor completes execution.
**Expected system:** `recordAgentDecision(reasoning, confidence, inputs, outputs)` called. Record written to Supabase.
**Expected UI:** Governance record visible in audit trail view (if implemented).
**Pass criteria:** Governance record created with reasoning, confidence, inputs, outputs. Even if governance write fails, execution result is still recorded.

---

### V-ACTION-34: `pgInsertApproval` not called — gap confirmation

**Preconditions:** `create_document` approved and executed.
**Trigger:** Approval event occurs.
**Expected system (current):** `pgInsertApproval()` is NOT called. `approvals` table remains empty for this approval.
**Expected system (target):** `pgInsertApproval()` IS called with `task_id`, `tool_execution_id`, `approved_by`, `action_type`, `is_standing=false`.
**Pass criteria for gap:** Confirm `approvals` table has no record for this approval (confirming the PARTIAL gap).
**Pass criteria for target:** `approvals` table has a record for this approval.

---

### V-ACTION-35: Execution history view

**Preconditions:** Multiple actions have been executed. `agent_actions` and `tool_executions` tables have records.
**Trigger:** User navigates to execution history view.
**Expected system:** `pgGetRecentAgentActions()` called. Tool executions retrieved. Combined history displayed.
**Expected UI:** List of actions with: action_type, target, status (applied/undone), timestamp, undo button (if reversible), cost, duration.
**Pass criteria:** All executed actions visible. Status and reversibility accurate. Undo available where applicable.
**Gap note:** No execution history UI exists in `dashboard.html`. MISSING.

---

### V-ACTION-36: `apex_tasks` pipeline approval

**Preconditions:** An `apex_tasks` record with status `pending` exists.
**Trigger:** `POST /api/tasks/approve` called with `taskId`.
**Expected system:** `_runTask(taskId, res)` called. `_startAutoPipeline()` executed. `apex_tasks.status` transitions from `pending` to `in_progress` then `completed` or `failed`.
**Expected UI:** Task status visible: pending → running → completed.
**Pass criteria:** Pipeline executes after approval. Status transitions correctly.

---

### V-ACTION-37: Standing approval list in settings

**Preconditions:** Multiple standing approvals exist in `standing_approvals` table.
**Trigger:** User navigates to Settings > Standing Approvals.
**Expected system:** `pgListStandingApprovals()` called. All records returned.
**Expected UI:** List showing: name, action_type, pattern, enabled status, revoke button (for enabled rules).
**Pass criteria:** All standing approvals listed. Revoke works immediately.
**Gap note:** No standing approvals settings UI in `dashboard.html`. MISSING.

---

### V-ACTION-38: BACKGROUND class action execution

**Preconditions:** Agent executes an action classified as BACKGROUND class (120s timeout).
**Trigger:** Tool executor dispatches the BACKGROUND action.
**Expected system:** `dispatch(name, input, sessionId)` used (fire-and-forget). `TOOL_DISPATCHED` emitted. Up to 120s for completion. `TOOL_COMPLETED` emitted on completion.
**Expected UI:** Action shown as "In Progress" in execution history while running. Completion notification when done.
**Pass criteria:** Action runs up to 120s. Not blocked by EXECUTIVE timeout. Completion event fires.

---

### V-ACTION-39: REFLEX class action execution

**Preconditions:** Agent executes a READ-type action classified as REFLEX (500ms timeout).
**Trigger:** Tool executor executes the REFLEX action.
**Expected system:** `execute(name, input, sessionId)` with 500ms timeout. Returns result rapidly. `tool_executions` record written.
**Expected UI:** Action appears in execution history as completed within 1 second.
**Pass criteria:** Action completes in < 500ms. Timeout not triggered for normal READ operations.

---

### V-ACTION-40: Zod validation failure

**Preconditions:** Agent proposes `create_document` with an input that fails Zod schema validation (e.g. missing required `filename` field).
**Trigger:** Tool executor calls `execute()` with invalid input.
**Expected system:** Zod validation throws. `agent_tasks.status = 'failed'`. `tool_executions` record written with validation error. No document created.
**Expected UI:** Failure notification: "Action could not execute. Invalid input: filename is required."
**Pass criteria:** No execution. Validation error recorded. User notified.

---

### V-ACTION-41: Undo a multi-step sequence

**Preconditions:** Three steps executed in sequence: `create_document A`, `create_document B`, `rename_document A → C`. All have undo_json entries. Undo route exists.
**Trigger:** User requests undo of the full sequence.
**Expected system:** `undoAgentActionRecord` processes undo_json in reverse: [1] rename back C → A, [2] delete B, [3] delete A. All three `agent_actions.status` = undone. Three `recordRollbackEvent()` calls.
**Expected UI:** Confirmation that all three steps were reversed. Execution history shows all as UNDONE.
**Pass criteria:** All three actions reversed in correct order. All governance events recorded.
**Gap note:** Public undo route MISSING. Multi-step undo UI not designed.

---

### V-ACTION-42: Proposal presented with full plan context

**Preconditions:** L1. Agent plan has 5 steps. User is on step 3 approval.
**Trigger:** Proposal card for step 3 is displayed.
**Expected system:** Full plan is accessible from the proposal card.
**Expected UI:** Proposal card shows "Step 3 of 5." Full plan visible on expand: steps 1–2 completed, step 3 pending, steps 4–5 queued.
**Pass criteria:** User can see the full plan context without approving all steps at once.

---

### V-ACTION-43: Proactive notification of auto-executed L3 steps

**Preconditions:** L3. Agent auto-executes 3 consecutive WRITE steps without proposals.
**Trigger:** Steps complete.
**Expected system:** Three `TOOL_COMPLETED` events. Notification logic fires.
**Expected UI:** Single digest notification: "APEX completed 3 actions automatically: [list]. Review in history." Shown within 5 seconds of the last step.
**Pass criteria:** Digest notification shown. User not overloaded with 3 separate notifications.
**Gap note:** Digest notification mode is PROPOSED.

---

### V-ACTION-44: Approval recorded in `approvals` table (target state)

**Preconditions:** `pgInsertApproval()` wiring is complete. `create_document` approved by user.
**Trigger:** User clicks Approve.
**Expected system:** Before execution, `pgInsertApproval()` called with `{ task_id, approved_by: user_id, action_type: "create_document", is_standing: false }`. Record written to `approvals` table. Then execution proceeds.
**Expected UI:** No visible change (approval recording is backend only).
**Pass criteria:** `approvals` table has a record for this approval. `approved_by` field populated.
**Gap note:** Currently PARTIAL — `pgInsertApproval()` is defined but not called by any route.

---

### V-ACTION-45: Agent authority boundary enforced

**Preconditions:** Agent with DECISION authority attempts to call an approval route directly via internal API.
**Trigger:** Internal API call by agent to approve its own pending step.
**Expected system:** Authority registry checks that the caller is not the agent that proposed the step. Self-approval blocked (INV-ACTION-02). Governance records the violation attempt.
**Expected UI:** Admin alert: "Self-approval attempt blocked for agent [id]."
**Pass criteria:** Approval blocked. Governance alert recorded. Step remains in `waiting_approval`.

---

## 39. Accessibility

### 39.1 Approval UI Accessibility Requirements

All approval surfaces must meet WCAG 2.1 AA as a minimum standard:

- **Keyboard navigation:** All approve, decline, defer, and undo actions must be reachable and operable by keyboard alone
- **Screen reader support:** Proposal cards must have correct ARIA roles and labels; risk tier must be announced by screen readers
- **Focus management:** When a proposal card appears, focus must move to the card; when dismissed, focus must return to the triggering element or the next pending proposal
- **Colour independence:** Risk tiers must be distinguishable without relying on colour alone (use icons and text labels alongside colour)
- **Timing:** If confirmation timers (Section 28.3) are implemented, users must be able to extend or disable the timer
- **Error identification:** All error messages must be programmatically associated with the relevant form element

### 39.2 Destructive Action Accessibility

Two-step confirmation for destructive actions must be accessible:
- The second confirmation step must be announced by screen readers without requiring visual inspection
- The "type document name to confirm" pattern must have an accessible alternative (e.g. a secondary button with a distinct label)
- Confirmation instructions must be clear and not rely on visual context

### 39.3 Voice as Primary Access

For users who use voice as their primary access channel (UX-07), all approval decisions must be completable by voice alone. The voice command set (Section 33.3) must be discoverable — APEX must be able to announce available voice commands when asked.

---

## 40. Production Gaps

### 40.1 Critical Gaps

These gaps must be resolved before the Actions / Approvals system can be considered production-ready:

| Gap | Impact | Classification | Priority |
|-----|--------|---------------|----------|
| No frontend approval UI (dashboard.html) | Users cannot see pending proposals or approve them | MISSING — OBSERVED | P0 |
| No public undo route | Undo code exists but is inaccessible | MISSING — OBSERVED | P0 |
| `pgInsertApproval()` not called by any route | Approval events not formally recorded | PARTIAL — OBSERVED | P1 |
| No DECLINED state for agent_tasks | Cannot record or communicate declined proposals | MISSING — PROPOSED | P1 |
| No CANCELLED state for apex_tasks or agent_tasks | Cannot cancel pending or running tasks | MISSING — PROPOSED | P1 |
| No expiry enforcement middleware | `expires_at` field unused | MISSING — PROPOSED | P2 |
| No standing approval type restriction | DESTRUCTIVE action standing approvals not blocked | MISSING — OBSERVED | P1 |
| No frontend standing approval management | Cannot view, create, or revoke standing approvals | MISSING — OBSERVED | P1 |

### 40.2 Secondary Gaps

These gaps are design-ready but not yet blocking:

| Gap | Classification | Priority |
|-----|---------------|----------|
| PENDING_APPROVAL vs. WAITING_APPROVAL semantic distinction not documented | OPEN | P2 |
| `summarize_document` reversibility not confirmed | OPEN | P2 |
| Standing approval expiry not designed | PROPOSED | P2 |
| Autonomy level not runtime-configurable without server restart | PROPOSED | P2 |
| Digest notification for L3 auto-execution not designed | PROPOSED | P3 |
| Multi-step undo UI not designed | PROPOSED | P2 |
| Governance certification conditions not documented | OPEN | P2 |
| `create_workspace_file` undo entry not confirmed | OPEN | P2 |

### 40.3 Gap Remediation Sequence

Recommended remediation order:

1. Implement public undo route (`POST /api/actions/:id/undo`)
2. Build pending approvals view (frontend)
3. Build proposal card component (frontend)
4. Wire `pgInsertApproval()` into approval route handlers
5. Add DECLINED state to `agent_tasks` state machine
6. Build execution history view (frontend)
7. Build standing approvals management UI (frontend)
8. Add DESTRUCTIVE action block to `pgCreateStandingApproval`
9. Add CANCELLED state and cancellation route
10. Implement expiry enforcement middleware

---

## 41. Invariants

All invariants in this section are binding on all APEX engineering work. Deviations require documented justification in Section 43. Invariants prefixed INV-ACTION are specific to this document. INV-AGENT invariants are inherited from UX-13.

---

**INV-ACTION-01:** An agent must not proceed past a step that requires approval until an explicit human approval event is in the causal chain for that step. (PRODUCTION ACTIVE — `waiting_approval` state enforces this; OBSERVED)

**INV-ACTION-02:** An agent cannot self-authorise. No agent may approve or trigger its own proposed actions without a human approval event in the causal chain. (CONSTITUTIONAL BLOCK — INHERITED from INV-AGENT-14)

**INV-ACTION-03:** Proposal ≠ approval ≠ execution ≠ success. These four states are distinct and must never be collapsed without explicit design review and this document updated. (CANONICAL BOUNDARY)

**INV-ACTION-04:** Every executed action must generate all three evidence records: a `tool_executions` record, an `agent_actions` record, and a governance record. Failure to write one record does not retroactively invalidate the action, but the failure must be logged. (OBSERVED — partially enforced)

**INV-ACTION-05:** READ actions (`list_documents`, `list_files`, `search_documents`) never require approval at any autonomy level. (PRODUCTION ACTIVE — OBSERVED)

**INV-ACTION-06:** DESTRUCTIVE actions (`rename_document`, `delete_document`) require explicit human approval at ALL autonomy levels, including L3. No autonomy level setting can remove this requirement. (PRODUCTION ACTIVE — OBSERVED)

**INV-ACTION-07:** DESTRUCTIVE actions require two-step confirmation in the UI. A single click or voice command is insufficient. (PROPOSED — design requirement)

**INV-ACTION-08:** L4 full autonomy is disabled. `getAutonomyLevelMessage()` enforces this block. L4 must not be re-enabled without explicit architectural review, governance approval, and an update to this document. (PRODUCTION ACTIVE — OBSERVED)

**INV-ACTION-09:** Standing approvals cannot be created for DESTRUCTIVE action types (`rename_document`, `delete_document`). (DESIGN INVARIANT — enforcement MISSING in production; P1 gap)

**INV-ACTION-10:** Revoking a standing approval takes immediate effect for all future steps. It does not undo past executions authorised by the standing approval. (PRODUCTION ACTIVE — OBSERVED semantics)

**INV-ACTION-11:** Approving a proposal approves exactly one action. Approval does not extend to subsequent steps, future identical actions, or any other scope unless explicitly converted to a standing approval by the user. (CANONICAL MODEL)

**INV-ACTION-12:** Approving a proposal does not guarantee execution success. Approval authorises the attempt; the result is determined by execution. (CANONICAL MODEL)

**INV-ACTION-13:** A proposal that has been modified by the user must be re-presented for final confirmation before execution. The system must not execute a modified proposal without explicit final approval. (DESIGN INVARIANT — PROPOSED)

**INV-ACTION-14:** The `undo_json` for a destructive action must be captured before execution begins, not after. A snapshot taken after deletion is useless. `getDocumentSnapshotForUndo()` must be called pre-execution. (PRODUCTION ACTIVE — OBSERVED)

**INV-ACTION-15:** A failed step does not automatically roll back preceding steps. Partial execution must be communicated clearly to the user. Manual undo is the only recovery mechanism for partial execution in the current system. (PRODUCTION ACTIVE — OBSERVED)

**INV-ACTION-16:** Code deployments and external API calls are IRREVERSIBLE. The system has no rollback mechanism for these. The UI must clearly communicate this before the user approves. (OBSERVED)

**INV-ACTION-17:** Constitutional blocks cannot be bypassed by any approval, standing approval, autonomy level change, or user override. If the block is reached, the system stops and the user is informed. (CONSTITUTIONAL)

**INV-ACTION-18:** If an action type is not in `ALLOWED_AGENT_STEP_TYPES`, it is classified as UNKNOWN risk, requires explicit human approval, and must not auto-execute regardless of autonomy level or standing approvals. (DESIGN INVARIANT)

**INV-ACTION-19:** The `approvals` table wiring (`pgInsertApproval()`) must be completed before the system is considered production-ready for compliance purposes. Informal approval via the current route is not sufficient for a full audit trail. (P1 GAP)

**INV-ACTION-20:** The public undo route must require the same authority level as the original approval. A user who cannot approve an action must not be able to undo it. (DESIGN INVARIANT — PROPOSED)

**INV-ACTION-21:** Governance records must be written for every approval event, not just execution events. Declined proposals, expired proposals, and undone actions must each generate governance records. (DESIGN INVARIANT — partial enforcement in production)

**INV-ACTION-22:** The autonomy level governs auto-execution of steps, not the risk classification of those steps. Changing the autonomy level does not reclassify a DESTRUCTIVE step as WRITE or a WRITE step as READ. (CANONICAL MODEL)

**INV-ACTION-23:** Standing approvals are scoped to `action_type + pattern + enabled`. They do not carry implicit scope over all documents, all tasks, or all users. (CANONICAL MODEL)

**INV-ACTION-24:** A proposal that has expired must not be approved or declined. It must be re-proposed. The system must prevent approval of an expired proposal. (PROPOSED — enforcement MISSING)

**INV-ACTION-25:** The user must never be presented with a proposal for a step that has already executed. The proposal and execution must be sequentially ordered and not overlapping. (DESIGN INVARIANT)

**INV-ACTION-26:** No dark patterns are permitted in approval UI. The approve and decline actions must have equal visual weight unless risk considerations justify differentiation (e.g. a red decline button for destructive actions to visually align with risk). (DESIGN INVARIANT — UX-05 governs)

**INV-ACTION-27:** Proposals must display the full, specific inputs to the proposed action. Summarised or abbreviated inputs that obscure what will actually execute are not permitted. (DESIGN INVARIANT)

**INV-ACTION-28:** The risk tier of a proposed action must be displayed prominently on the proposal card. It must not be buried in a tooltip or secondary panel. (DESIGN INVARIANT)

**INV-ACTION-29:** The reversibility status of a proposed action must be displayed on the proposal card before the user approves. "Cannot be undone" must appear before the approve button, not after. (DESIGN INVARIANT)

**INV-ACTION-30:** Auto-executed steps (L2/L3 or standing approval) must generate a near-real-time notification to the user. Silent auto-execution without any notification is not permitted. (DESIGN INVARIANT — PROPOSED)

**INV-ACTION-31:** The `agent_actions` table `status` field has only two observed values: `applied` and `undone`. No other values must be inserted by the system without updating this document. (CANONICAL MODEL — OBSERVED)

**INV-ACTION-32:** The KNOWLEDGE → INTELLIGENCE → AGENTS → PROPOSAL → APPROVAL → EXECUTION canonical boundary must be maintained. No layer may skip a boundary. The intelligence layer cannot execute; the execution layer cannot approve. (CONSTITUTIONAL BOUNDARY)

**INV-ACTION-33:** Approval by one session or user must not be transferred to another session or user without explicit delegation. Sessions are isolated for approval purposes until multi-user delegation is designed. (DESIGN INVARIANT — multi-user delegation OPEN)

**INV-ACTION-34:** An action in `waiting_approval` or `pending_approval` state must not auto-transition to `approved` or execute under any circumstance except an explicit human approval event. Timeout alone must not trigger approval. (CONSTITUTIONAL INVARIANT)

**INV-ACTION-35:** All standing approval rules must be visible to the user in the settings UI. Hidden standing approvals are not permitted. The user must always be able to see what the system is authorised to do automatically. (DESIGN INVARIANT — PROPOSED; standing approvals UI MISSING)

**INV-ACTION-36:** The `agent_actions.undo_json` field must be populated at the time of action execution for all REVERSIBLE action types. A REVERSIBLE action with no `undo_json` is an implementation defect. (DESIGN INVARIANT)

**INV-ACTION-37:** The `getDocumentSnapshotForUndo()` function must be called before any destructive operation. Calling it after execution renders the snapshot useless. Pre-snapshot is a pre-condition of DESTRUCTIVE action execution. (PRODUCTION ACTIVE — OBSERVED)

**INV-ACTION-38:** The `tool-executor.js` timeout classes (REFLEX 500ms, EXECUTIVE 5s, BACKGROUND 120s) are mandatory. Actions must be classified into these classes. An action that cannot be assigned to a class must default to EXECUTIVE. (PRODUCTION ACTIVE — OBSERVED)

**INV-ACTION-39:** Cancellation of a task during execution must show the user the partial execution state and require confirmation before the cancellation is processed. Silent cancellation of executing tasks is not permitted. (DESIGN INVARIANT — PROPOSED)

**INV-ACTION-40:** Approval events must record `approved_by` (the human who approved). Approvals without an `approved_by` field are invalid for compliance purposes. (DESIGN INVARIANT — requires `pgInsertApproval()` wiring)

---

## 42. Tests

### 42.1 Unit Tests

| Test | Target | Assertion |
|------|--------|-----------|
| UT-ACT-01 | `getMatchingStandingApproval(step)` | Returns matching rule for exact pattern match |
| UT-ACT-02 | `getMatchingStandingApproval(step)` | Returns null for disabled rule |
| UT-ACT-03 | `getMatchingStandingApproval(step)` | Returns null for action_type mismatch |
| UT-ACT-04 | `isSafeAutoAction(step)` | Returns true for READ action types |
| UT-ACT-05 | `isSafeAutoAction(step)` | Returns false for WRITE action types |
| UT-ACT-06 | `isSafeLevel3WriteAction()` | Returns true for WRITE action types |
| UT-ACT-07 | `isSafeLevel3WriteAction()` | Returns false for DESTRUCTIVE action types |
| UT-ACT-08 | `undoAgentActionRecord()` | Processes delete_document entry correctly |
| UT-ACT-09 | `undoAgentActionRecord()` | Processes restore_document entry with snapshot |
| UT-ACT-10 | `undoAgentActionRecord()` | Processes rename_document reverse entry |
| UT-ACT-11 | `undoAgentActionRecord()` | Processes entries in reverse order |
| UT-ACT-12 | `getDocumentSnapshotForUndo()` | Returns document content before deletion |
| UT-ACT-13 | `pgCreateStandingApproval()` | Creates record with correct fields |
| UT-ACT-14 | `pgDisableStandingApproval(id)` | Sets enabled=false |
| UT-ACT-15 | `pgGetEnabledStandingApprovals(actionType)` | Returns only enabled records for type |

### 42.2 Integration Tests

| Test | Target | Assertion |
|------|--------|-----------|
| IT-ACT-01 | `POST /api/tasks/approve` | Triggers `_runTask()` for valid taskId |
| IT-ACT-02 | `POST /api/tasks/run` | Triggers `_startAutoPipeline()` with force flag |
| IT-ACT-03 | `POST /api/master/approve` with `approved: true` | Triggers `applyLatestCloudProposal()` |
| IT-ACT-04 | `POST /api/master/approve` with `approved: false` | Does NOT trigger `applyLatestCloudProposal()` |
| IT-ACT-05 | L1 WRITE step execution | Pauses for approval (task in waiting_approval) |
| IT-ACT-06 | L2 READ step execution | Auto-executes without pausing |
| IT-ACT-07 | L3 WRITE step (safe) | Auto-executes without pausing |
| IT-ACT-08 | L3 DESTRUCTIVE step | Pauses for approval |
| IT-ACT-09 | Standing approval match + L1 | Auto-executes matching step |
| IT-ACT-10 | `tool_executions` record | Written for every tool execution |
| IT-ACT-11 | `agent_actions` record | Written with actions_json and undo_json |
| IT-ACT-12 | `governance.recordAgentDecision()` | Called for every approved execution |

### 42.3 End-to-End Tests

| Test | Flow | Pass Criteria |
|------|------|---------------|
| E2E-ACT-01 | Full approval flow: WRITE at L1 | Proposal shown → approved → executed → evidence written |
| E2E-ACT-02 | Full decline flow | Proposal shown → declined → no execution → task updated |
| E2E-ACT-03 | Full undo flow: create_document | Executed → undo clicked → document deleted → status=undone |
| E2E-ACT-04 | Full undo flow: delete_document | Executed → undo clicked → document restored from snapshot |
| E2E-ACT-05 | Multi-step plan: partial failure | Step 1 succeeds, Step 2 fails, user shown partial state |
| E2E-ACT-06 | Standing approval lifecycle | Created → auto-executes matching step → revoked → next step requires approval |
| E2E-ACT-07 | DESTRUCTIVE two-step confirmation | Single click rejected → second step required → executes on completion |
| E2E-ACT-08 | L4 block | AUTONOMY_LEVEL=4 → system refuses to activate → stays at safe level |

---

## 43. Deviations

### 43.1 Current Approved Deviations

The following deviations from the canonical model exist in production and are acknowledged here:

| Deviation | Location | Reason | Remediation |
|-----------|----------|--------|-------------|
| `POST /api/tasks/approve` collapses approval and execution | `src/routes/tasks.js` | Expedient implementation; no separate approval state | Architectural separation required in future iteration |
| `pgInsertApproval()` not wired to any route | `lib/supabase-helpers.js` | Schema defined before route wiring was complete | P1 gap — wire in next sprint |
| No public undo route | `server.js` import of `undoAgentActionRecord` | Undo code complete but not exposed | P0 gap — implement `POST /api/actions/:id/undo` |
| No DECLINED state | `agent_tasks` | Not yet designed or implemented | P1 gap — add to state machine |
| No CANCELLED state | `apex_tasks`, `agent_tasks` | Not yet designed | P1 gap — add to state machine |
| Standing approval allows DESTRUCTIVE types | `pgCreateStandingApproval()` | Validation not added at creation time | P1 gap — add type check |
| No frontend approval UI | `dashboard.html` | Frontend not yet built for approval flows | P0 gap — build approval UI |

### 43.2 Future Deviation Protocol

Any future deviation from the invariants in Section 41 must:
1. Be documented in this section with rationale
2. Be approved by the system owner
3. Have a remediation plan and timeline
4. Be reviewed at the next UX Programme review

---

## 44. Open Questions

The following questions are unresolved and require decisions before they can be designed or implemented:

| ID | Question | Impact | Owner |
|----|----------|--------|-------|
| OQ-ACT-01 | What is the exact semantic difference between `pending_approval` and `waiting_approval` in `agent_tasks`? | Frontend state display, notification logic | Engineering |
| OQ-ACT-02 | Should `summarize_document` be REVERSIBLE? Is there an undo entry for it? | Reversibility table, undo implementation | Engineering |
| OQ-ACT-03 | Is `create_workspace_file` reversible? What does its undo entry look like? | Reversibility table, undo implementation | Engineering |
| OQ-ACT-04 | What are the exact conditions under which `issueCertification()` fires? | Governance completeness | Engineering / Governance |
| OQ-ACT-05 | Should standing approvals have expiry? If so, what is the default expiry period? | Standing approval UX, schema changes | Product |
| OQ-ACT-06 | What is the default expiry period for single-action approvals (`approvals.expires_at`)? | Expiry enforcement implementation | Product |
| OQ-ACT-07 | Should autonomy level be runtime-configurable without server restart? What UI controls this? | System settings, operator experience | Engineering / Product |
| OQ-ACT-08 | How should multi-user approval delegation work? Can one user approve an action proposed for another user's task? | Multi-user architecture — deferred to T3-09+ | Architecture |
| OQ-ACT-09 | What is the right behaviour when a standing approval is revoked mid-execution (while a matching step is in progress)? | Revocation semantics | Engineering |
| OQ-ACT-10 | Should there be a "bulk cancel" function for tasks in `waiting_approval` state? | Cancellation UX | Product |
| OQ-ACT-11 | When a proposal is declined, should the agent attempt to replan? Or should the task fail? | Task failure semantics | Product |
| OQ-ACT-12 | Should the approval expiry timer be suspended while the user is actively viewing the proposal card? | Expiry UX | Product |
| OQ-ACT-13 | Is there a maximum number of standing approvals per user? Should there be? | Scale and risk | Product / Engineering |
| OQ-ACT-14 | What is the canonical list of BACKGROUND-class actions vs. EXECUTIVE-class actions? | Tool executor classification | Engineering |
| OQ-ACT-15 | Should the user be able to approve all steps in a multi-step plan in a single "Approve All" action? | Proposal scope, INV-ACTION-11 | Product — requires invariant review |

---

## 45. Production Impact

### 45.1 Impact of Resolving P0 Gaps

**Implementing the public undo route** will expose undo functionality that already exists in production code. Impact:
- Users can reverse create_document, delete_document, and rename_document actions
- `agent_actions.status` transitions to `undone` will become observable via UI
- Governance rollback events will begin appearing in the audit trail

**Implementing the frontend approval UI** will unlock the full approval flow for users. Impact:
- `waiting_approval` and `pending_approval` tasks will become actionable from the UI
- The system will move from "backend-only approvals" to a user-accessible approval model
- Standing approvals will need a management interface concurrently

### 45.2 Impact of `pgInsertApproval()` Wiring

Once `pgInsertApproval()` is wired into the approval routes:
- The `approvals` table will begin to accumulate records
- `approved_by` will be recorded for every approval event
- `is_standing` will distinguish manual from standing-approval-triggered executions
- The compliance audit trail will be complete

No schema migration is required — the table and function already exist.

### 45.3 Impact of Adding DECLINED State

Adding a DECLINED state to `agent_tasks` requires:
- A new status value in the state machine
- A route handler for the decline action (likely `POST /api/tasks/decline` or a parameter on the existing approval route)
- A frontend decline button on proposal cards
- Governance record for declined proposals

Existing tasks and their status values are unaffected (DECLINED is additive).

### 45.4 Impact of Standing Approval Type Validation

Adding DESTRUCTIVE type blocking to `pgCreateStandingApproval()` is a backend validation change. Impact:
- Any code that attempts to create a standing approval for `rename_document` or `delete_document` will receive an error
- Existing standing approvals for DESTRUCTIVE types (if any exist) must be identified and disabled
- No schema change required

### 45.5 Performance Considerations

The approval system generates multiple database writes per action:
- 1 `tool_executions` write
- 1 `agent_actions` write
- 1+ `governance` writes
- 1 `approvals` write (when wired)

For BACKGROUND-class actions (120s), this is not a performance concern. For REFLEX-class actions (500ms), the combined write latency must not exceed the timeout. Evidence writes should be async where possible.

---

## 46. Final Certification

This document has been produced following a full production codebase audit conducted in August 2026. All OBSERVED findings are based on direct inspection of the production source code. All PROPOSED findings represent design intent that has not yet been implemented. All OPEN items require decisions before implementation.

### 46.1 Production Accuracy Statement

The following are confirmed accurate as of the audit date:

- The three production approval routes (`POST /api/tasks/approve`, `POST /api/tasks/run`, `POST /api/master/approve`) behave as described
- The four database tables (`standing_approvals`, `agent_actions`, `tool_executions`, `agent_tasks`) are PRODUCTION ACTIVE with the described schemas and status values
- The `approvals` table schema exists but `pgInsertApproval()` is not called by any production route
- `undoAgentActionRecord()` and `getDocumentSnapshotForUndo()` are IMPLEMENTED but no public route exposes them
- `dashboard.html` contains zero approval UI elements (confirmed by grep)
- Autonomy levels L1–L3 are PRODUCTION ACTIVE; L4 is DISABLED
- `getMatchingStandingApproval()` is PRODUCTION ACTIVE for standing approval matching

### 46.2 Design Accuracy Statement

The following design requirements are established by this document and are binding on future engineering work:

- All 40 invariants (INV-ACTION-01 through INV-ACTION-40) are binding
- All 15 open questions (OQ-ACT-01 through OQ-ACT-15) must be resolved before their respective features are implemented
- All 8 P0/P1 production gaps (Section 40.1) must be resolved before the system is production-ready
- All 45 scenarios (V-ACTION-01 through V-ACTION-45) must pass before the approval system is released

### 46.3 Governance Certification

```
Document: UX-14 — ACTIONS / APPROVALS
Version: 1.0
Audit date: 2026-08-28
Produced by: APEX AI OS UX Programme
Evidence basis: Full production source audit
Classification: CANONICAL — supersedes all informal action/approval notes
```

---

## 47. Hard Stop

### 47.1 Hard Stop Definition

A hard stop is a condition that prevents the APEX system from proceeding. Hard stops are distinct from warnings and from constitutional blocks in that they are surfaced to the operator as system-level conditions, not user-level approval decisions.

### 47.2 Hard Stops Relevant to Actions / Approvals

| Condition | Hard Stop Behaviour |
|-----------|-------------------|
| L4 activation attempt | System refuses. Operator notified. Server remains at safe level. |
| Unrecognised action type in plan | Step execution refused. Task fails. Governance record written. |
| Agent self-approval attempt | Request rejected. Block recorded. Task remains in waiting_approval. |
| `getDocumentSnapshotForUndo()` fails pre-destructive | Destructive action MUST NOT proceed. Task fails. User notified. |
| Zod validation failure on action input | Execution refused. Task fails. Error recorded. User notified. |
| Constitutional governance write failure (if marked critical) | Action proceeds (governance is fire-and-forget) but failure is logged for operator review. |

### 47.3 Hard Stop UX

When a hard stop is reached:
- The system displays a clear, non-dismissable message explaining what happened
- The message does not blame the user
- The message explains what the system will not do and why
- The message indicates what the user or operator can do next (if anything)
- A governance record is written for the hard stop event

### 47.4 Hard Stop and Undo

A hard stop that occurs before execution begins (e.g. validation failure) requires no undo — no action was taken. A hard stop that occurs during execution (e.g. snapshot failure mid-destructive) may leave the system in a partial state. The operator must be notified and must take manual action to resolve.

### 47.5 Hard Stop Audit

All hard stops must be recorded in the audit trail. The hard stop record must include:
- The condition that triggered the stop
- The action that was being attempted
- The task and agent context
- The timestamp

---

*End of UX-14 — ACTIONS / APPROVALS*

*Document version: 1.0 | Audit date: 2026-08-28 | Status: CANONICAL*
*Next review: Upon resolution of any P0 or P1 gap, or upon material change to production approval architecture.*
