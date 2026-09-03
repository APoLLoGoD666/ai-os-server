# V-11-H PRE-IMPLEMENTATION RECONNAISSANCE
## ACTIONS Experience Convergence

Date: 2026-09-01
Status: RECONNAISSANCE — no application code, backend, schema, or dashboard modified
Predecessor: V-11-G certified at commit `e464d8b`
Production: UNCHANGED (`dd1dd1f`)
Application code changed by this phase: NONE
Sole artefact produced: this document

Scope of this document: forensic pre-implementation audit of the ACTIONS-cluster surfaces (Approvals, Agents, Activity, Operation, plus the ambient action/approval/notification affordances distributed across TODAY, COMMAND, LIFE & WORK, and SYSTEM) evaluated against the locked V-11 experience contract (§7.5, Part X, Part XI, Decision 6, Part XXV, Part XXVII table row "ACTIONS Task/Approval/Log").

Files inspected (path + role):
- `public/dashboard.html` (~21,500 lines) — sole frontend surface
- `server.js` — top-level route mounting, agent/task/approval wiring, cron and startup
- `routes/agents.js` — agent library + domain-agent invoke
- `routes/operations.js` — operations sub-resources (`clients`, `projects`, `documents`, `proposals`)
- `routes/governance.js` — governance/forensics/anomalies/certifications/probe/architecture-registry
- `routes/intelligence.js` — `/intelligence/agent-runs`, `/intelligence/lessons`, `/intelligence/cost-summary`, `/intelligence/self-check`
- `src/routes/tasks.js` — canonical `/api/tasks*`, `/api/tasks/approve`, `/api/tasks/reject`, `/api/tasks/undo`, `/api/tasks/standing-approvals`
- `src/routes/agent-tasks.js` — `/agent-tasks`, `/agent-task/:id`
- `src/routes/agent-schedules.js` — `/agent-schedules`, `/run-schedules-now`, `/cron/run-schedules`
- `src/routes/notifications.js` — `/notifications`, `/notifications/:id/read`, `/api/notifications`, `/api/notifications/mark-read`
- `src/routes/master.js` — `/api/master/permissions`, `/api/master/approve`, `/api/master/*` (office-hours, review, ship, etc.)
- `src/routes/telemetry/index.js` — `/api/timeline`, `/api/cost/today`, `/api/latency-stats`, `/api/latency-traces`
- `lib/agent-queue.js`, `lib/agent-command-handler.js`, `lib/agent-execution-utils.js`, `lib/agent-plan-utils.js`, `lib/agent-step-utils.js`, `lib/agent-task-cycle.js`, `lib/auto-pipeline.js` — task runtime + execution engine
- `lib/governance.js`, `lib/governance-meta.js`, `lib/governance-probe.js` — governance runtime
- `lib/clients.js` — canonical Supabase client (`getSupabaseClient`)
- `docs/interface/V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md` §7.5, Part X, Part XI, Part XXVII
- `docs/interface/V-11-DESIGN-DECISIONS.md` (all locked decisions; SD-3 undo window)
- `docs/interface/V-11-G-PRE-IMPLEMENTATION-RECONNAISSANCE.md` / `V-11-G-IMPLEMENTATION-CERTIFICATION.md`
- `docs/interface/V-11-F-IMPLEMENTATION-CERTIFICATION.md`
- `docs/interface/V-11-E-IMPLEMENTATION-CERTIFICATION.md`
- `docs/interface/V-11-D2-IMPLEMENTATION-CERTIFICATION.md`
- `docs/interface/V-11-D1-TODAY-NAVIGATION-IMPLEMENTATION-CERTIFICATION.md`
- `docs/interface/V-11-B-IMPLEMENTATION-CERTIFICATION.md` (referenced)
- `docs/interface/V-11-A-IMPLEMENTATION-CERTIFICATION.md` (referenced)
- `docs/interface/UX-14-ACTIONS-APPROVALS.md` (canonical UX contract)
- `docs/interface/UX-13-AGENTS.md`
- `docs/interface/UX-17-ACTIVITY-OBSERVABILITY.md`

---

## SECTION 1 — EXECUTIVE SUMMARY

The ACTIONS destination as demanded by V-11 §7.5 ("Pending approvals · Task queue · Agent run log · Standing approval rules · 30-second undo") does not exist as a single, coherent, canonical surface. What exists instead is a **fragmented archipelago of 4 separate pages** wired to overlapping backend endpoints, with no unified state model, no per-approval evidence bundle, no owner scoping, no undo affordance, no life-cycle progression indicator, and no consistent action-priority classification:

1. `#page-approvals` (Master-only) — the closest existing surface to canonical ACTIONS. Loads `/api/tasks`, filters by three legacy statuses (`awaiting_approval`, `pending_approval`, `approval_required`), renders bespoke approval cards with a two-step modal, and posts to `/api/tasks/approve` and `/api/tasks/reject`. Contains a "Recent Actions" panel keyed off tasks with terminal statuses.
2. `#page-agents` (Master-only) — self-check tiles, `/api/intelligence/agent-runs`, `/api/tasks/standing-approvals`, domain-agent capabilities. This is the "who is doing what" surface, orthogonal to "what needs your decision".
3. `#page-activity` (Master-only) — live WebSocket event feed with 6 category filters (Agent/Voice/Tool/System/Error/Governance), plus `/api/timeline` (last 20 completed tasks) and `/api/notifications`.
4. `#page-operation` (V-11-F ghost-kept, `display:none !important`) — the legacy 4-lane pipeline board (QUEUED · PROCESSING · REVIEW · COMPLETE), agent roster, filterable "Approval Gate" panel wired to `pollPermissions()` → `/api/master/permissions`, CRM/Projects/Documents/Proposals sub-panels. **Retained in DOM only for legacy JS references; not user-reachable.**

The three approval and action-related surfaces are all `apex-master-only` today. The specification requires ACTIONS to be **role-adapted**, not Master-hidden: Users must be able to see their own pending approvals, task history, and standing rules. Every consequential item across the system passes through an approval boundary; if the surface hosting those boundaries is invisible to Users, Users cannot participate in APEX's cardinal safety loop.

**Top-line finding:** V-11-H is a substantial UX + light-authorisation rebuild, not a refinement. There is no `#page-actions` container; there is no `/api/actions/summary` (referenced by the V-11 spec at §7.5 and Part V/Metrics but not implemented); there is no unified `pending_actions | pending_approvals | executing | completed | failed` state view; there is no evidence bundle on approval cards (only a task id and description); there is no 30-second undo banner (SD-3); there is no priority classification; there is no cost/risk/reversibility rendering per §11.2 approval card design; there is no cross-link from an executed action back to the memory episode, agent run, or COMMAND instruction that generated it.

**Top 5 critical (P0) issues:**

1. **Owner scoping absent on every task, approval, notification, and agent-run endpoint.** `apex_tasks` has no `human_id` column; `/api/tasks` returns all tasks to every authenticated caller; `/api/tasks/approve` and `/api/tasks/reject` accept any task id from any account; `/api/master/permissions` (which pollPermissions renders into `#permissionCards`) returns Master-only notifications but is `requireAppAccess` only (no role gate); `apex_notifications` has no owner column; `apex_agent_runs` has no owner column. RD-3 §11 requires per-actor scoping on tasks and approvals. This is the ACTIONS equivalent of the episodic-memory owner leak fixed in V-11-G.
2. **`#page-approvals` is Master-only (`apex-master-only`) but every consequential User action must pass an approval boundary.** Users cannot see any pending approvals in the current DOM. If a User is the originator of an instruction that produced a task, they have no surface on which to approve/reject. The spec (§7.5, §11) requires ACTIONS to be a first-class role-aware destination.
3. **No `/api/actions/summary` endpoint exists.** V-11 §5.1 metrics row 3 requires "Badge counts | <500ms | `/api/actions/summary`". `#navApprovalsBadge` is populated by post-filtering `/api/tasks`; there is no atomic counts endpoint. This is a backend gate.
4. **Task approval carries no evidence bundle, no cost, no risk classification, no reversibility flag, no originating-instruction pointer.** `_loadPendingApprovals` (dashboard.html:20522) renders only `task_type`, `description` (140-char slice), and `created_at`. §11.2 canonical approval card requires: What (human sentence), Why (originating user instruction), Cost, Risk, Reversibility, three actions (Approve / View detail / Reject). Currently 2/6 fields present.
5. **No 30-second undo banner exists after any approval.** SD-3 locks the undo window at 30 s with 5 s countdown. The only undo affordance is `/api/tasks/undo` (endpoint-level; last-applied `agent_action`, not task-level, no UI). The dashboard has no `_v11eToast`-driven undo scaffold on the approval path. This is a P0 correctness gap because "reversibility" is claimed on the approval card but cannot actually be exercised.

**Overall assessment:** V-11-H must (a) collapse the four fragmented surfaces into a canonical `#page-actions` while ghost-keeping the DOM for backward reference (analogous to V-11-F's operation merge), (b) enforce role adaptation with a shared middleware pattern, (c) surface the eight-stage lifecycle (DISCOVER → UNDERSTAND → REVIEW → APPROVE/DENY → EXECUTE → MONITOR → COMPLETE → LEARN) as visible state transitions, (d) implement the canonical approval card, (e) implement the undo banner, and (f) request three backend gates (`/api/actions/summary`, owner-scoping middleware, per-approval evidence bundle contract) prior to full-fidelity delivery. Frontend-only progress is possible for surface consolidation and card redesign; role-adapted content and undo require the backend gates.

---

## SECTION 2 — CURRENT ACTIONS ARCHITECTURE

The ACTIONS surface is presently distributed across four page containers and one hidden container. There is no single-DOM aggregation; every panel loads its own endpoint on page-switch:

| Container (dashboard.html line) | Purpose | Nav id | Role gate |
|---|---|---|---|
| `#page-approvals` (10392–10443) | Pending approvals + recent actions + governance state-model note | `#nav-approvals` (10802) | `apex-master-only` |
| `#page-agents` (10324–10389) | System self-check + agent runs + standing approvals + domain-agent capabilities | `#nav-agents` (10798) | `apex-master-only` |
| `#page-activity` (10240–10321) | Live WebSocket event feed + task timeline + notifications | `#nav-activity` (10814) | `apex-master-only` |
| `#page-operation` (7835–8063) | Pipeline board + agent roster + approval gate + CRM/Projects/Documents/Proposals | (nav removed by V-11-F F-7) | `display:none !important` |
| `#page-command` inline approval card (per V-11-E §E-9) | Approval card inserted in `#cmdThread` for conversation-scoped decisions | n/a | Depends on caller |

The `pages` array (dashboard.html:10845) contains `'agents', 'approvals', 'activity'` at positions 11, 12, 10 in the swipe sequence. There is no `'actions'` entry.

The topbar/sidebar has an "ACTIONS" group label (line 10796) but the two nav buttons under it (`#nav-agents`, `#nav-approvals`) are both `apex-master-only`. Under a User role the ACTIONS group renders as an empty label with no children.

Backend surface is spread across:
- `src/routes/tasks.js` — task lifecycle (list/add/run/approve/reject/undo/standing-approvals/notify)
- `src/routes/agent-tasks.js` — richer agent-task records with `/agent-task/:id`
- `src/routes/agent-schedules.js` — recurring schedule enumeration + cron trigger
- `routes/agents.js` — agent library + invoke
- `routes/operations.js` — CRM/projects/documents/proposals + operations/migrations
- `src/routes/master.js` — Master-only permissions / approval flow for orchestrator features
- `src/routes/notifications.js` — notification list + mark-read
- `src/routes/telemetry/index.js` — `/api/timeline`
- `routes/intelligence.js` — `/intelligence/agent-runs`, `/intelligence/lessons`, `/intelligence/cost-summary`, `/intelligence/self-check`
- `routes/governance.js` — 17 endpoints for forensics/certifications/anomalies/probe/policy-violations/architecture-registry
- `lib/agent-queue.js`, `lib/auto-pipeline.js`, `lib/agent-task-cycle.js` — execution runtime

There are two task tables:
- `apex_tasks` — high-level task list (id, title, status, created_at, updated_at)
- `apex_agent_tasks` (via `pgGetRecentAgentTasks`) — agent execution records with plan/steps

There is one execution/actions ledger:
- `agent_actions` — applied/undone status; the target of `/api/tasks/undo`

There is one notification table:
- `apex_notifications` — generic; typed by `type` (`permission`, `info`, `capture_auto`, `capture_review`)

There is one run audit:
- `apex_agent_runs` — pipeline execution audit with `task_id, objective, success, cost_usd, complexity, created_at, duration_ms`

There is one timeline:
- `apex_timeline` — task completion timeline consumed by `#page-activity`

There is one governance ledger:
- Multiple governance tables (`policy_decisions`, `certifications`, `agent_decisions`, `execution_graphs`, `execution_nodes`, `execution_artifacts`, `cost_accounting`, `apex_lessons`, `slo_measurements`, `anomalies`, `risk_scores`, `evidence_blocks`, `system_events`, `otel_spans`, `request_logs`) — all discoverable via `/api/governance/forensics/:taskId`

---

## SECTION 3 — ACTION LIFECYCLE

Per §11.1: `DISCOVER → UNDERSTAND → REVIEW → APPROVE/DENY → EXECUTE → MONITOR → COMPLETE → LEARN`.

Actual lifecycle observable in the current code:

1. **DISCOVER** — Task is created by an agent (`pgCreateAgentTask`) or by manual insert (`POST /api/tasks/add`). Status: `pending` or (from planner) `awaiting_approval`. Notification badge count is fed from post-filtering `/api/tasks` — not from a discovery event.
2. **UNDERSTAND** — Not implemented. Approval card renders 140-char description only. No L1 disclosure. No "why" back-link to originating instruction. No cost/risk/reversibility.
3. **REVIEW** — Present via `#page-approvals` for Master only, or `#page-operation` pipeline (hidden). User cannot review.
4. **APPROVE/DENY** — `POST /api/tasks/approve` (calls `_runTask` in `lib/auto-pipeline.js`) or `POST /api/tasks/reject` (updates status + inserts notification). Two-step confirmation modal present (`#apexApprModal`). No "Modify" or "Defer" option. No "Ask APEX to explain more".
5. **EXECUTE** — `_runTask` → `_startAutoPipeline(taskId)` via `_agentQueue.enqueue`. Executes agent plan through `lib/agent-task-cycle.js::executeApprovedAgentTask`. No progress card in UI. No "APEX is working on this…" state.
6. **MONITOR** — `#page-activity` live event feed shows raw events (`role="log"` at 10290) but the feed is Master-only and does not aggregate by task_id. No expandable step trace bound to a task in any user-facing surface.
7. **COMPLETE** — Task status transitions to `completed` or `failed`; `apex_timeline` receives a row. `/api/tasks/undo` can mark last-applied `agent_action` as `undone`. **No undo BANNER, no 30 s countdown, no toast, no post-approval confirmation animation.**
8. **LEARN** — Reflexion path exists (`generateReflectionForTask`, `pgCreateAgentReflection`, `/api/intelligence/lessons`) but there is no user-visible feedback loop ("This was helpful / not helpful") and no rejection-reason capture in the UI (`/api/tasks/reject` accepts optional `reason` but the frontend does not solicit it).

Lifecycle traceability score (per V-11 §11 requirements): **3 of 8 stages have any user-visible manifestation** (Discover count, Review card, Complete/Fail badge in Recent Actions).

---

## SECTION 4 — EXISTING ACTION CAPABILITIES (inventory)

The following capabilities exist somewhere in the codebase, whether or not exposed to the ACTIONS surface:

**Task-level:**
- Create task (`POST /api/tasks/add`, `pgCreateAgentTask`)
- List tasks (`GET /api/tasks` → `_parseTasks`)
- Run task (`POST /api/tasks/run` → `_startAutoPipeline`)
- Approve task (`POST /api/tasks/approve` → `_runTask`)
- Reject task (`POST /api/tasks/reject`)
- Update task (`pgUpdateAgentTask`)
- Get task (`GET /agent-task/:id`, `pgGetAgentTask`)
- Get recent agent tasks (`GET /agent-tasks`, `pgGetRecentAgentTasks(20)`)
- Get latest active task (`getLatestActiveAgentTask`)
- Get latest waiting task (`pgGetLatestWaitingAgentTask`)
- Get latest completed task (`getLatestCompletedAgentTask`)
- Get remaining task steps (`getRemainingTaskSteps`)
- Get next task status (`getNextTaskStatus`, `getNextTaskStatusForExecution`)
- Auto-run read-only steps (`autoRunReadOnlyTaskSteps`)
- Notify task status (`notifyTaskStatus`)
- Undo agent action (`POST /api/tasks/undo`, `undoAgentActionRecord`, `pgMarkAgentActionUndone`)

**Approval / authority:**
- Standing approvals CRUD (`pgCreateStandingApproval`, `pgListStandingApprovals`, `pgDisableStandingApproval`, `pgGetEnabledStandingApprovals`, `GET /api/tasks/standing-approvals`)
- Master permissions queue (`GET /api/master/permissions`, `POST /api/master/approve`)
- Constitutional/governance gate (`lib/governance.js`, `lib/governance-meta.js`; `hasUnsafeAutoActionLanguage`, `isSafeAutoAction`, `isSafeLevel3WriteAction`, `isStandingApprovalEligibleAction`, `canAutoRunLevel3Action`, `getMatchingStandingApproval`, `getLevel3AutoExecutablePrefix`)
- Auto-approve standard permissions (`autoApproveStandardPermissions`)
- Reflection approval (`pgApproveAgentReflection`, `pgGetApprovedReflections`)

**Execution:**
- Auto-pipeline (`_startAutoPipeline`, `_runTask` in `lib/auto-pipeline.js`)
- Agent queue (`lib/agent-queue.js::enqueue`)
- Execute approved actions (`executeApprovedAgentActions`, `executeApprovedAgentTask`, `getApprovedAgentActions`)
- Tool executor (`lib/tool-executor.js`)
- Agent plan build (`buildAgentPlan`, `validateAgentSteps`)
- Direct safe steps (`buildDirectSafeAgentStepsFromRequest`, `buildSafeDefaultDiscoverySteps`)
- Cleanup proposal (`generateTaskCleanupProposal`, `buildCleanupProposalPlan`, `applyAgentCleanupPreview`)

**Schedules:**
- List schedules (`GET /agent-schedules`, `pgListAgentSchedules`)
- Create/disable (`pgCreateAgentSchedule`, `pgDisableAgentSchedule`)
- Run now (`POST /run-schedules-now`)
- Cron run (`POST /cron/run-schedules`, `runDueSchedules`, `runSingleScheduleOnce`)
- Update last-run (`pgUpdateAgentScheduleLastRun`, `pgGetDueAgentSchedules`)

**Notifications:**
- List (`GET /notifications`, `GET /api/notifications`)
- Mark read (`POST /notifications/:id/read`, `POST /api/notifications/mark-read`)
- Create (`pgCreateNotification`, `createAgentNotification`)

**Governance/forensics:**
- Forensics by task (`GET /api/governance/forensics/:taskId` — 16 questions from evidence)
- Certifications (`GET /api/governance/certifications`)
- Anomalies (`GET /api/governance/anomalies`)
- Agent reputation (`GET /api/governance/agent-reputation`)
- Change intelligence (`GET /api/governance/change-intelligence`)
- Evidence chain (`GET /api/governance/evidence-chain`)
- Policy violations (`GET /api/governance/policy-violations`)
- Probe (`POST /api/governance/probe`, `GET /api/governance/probe/latest`)
- Readiness / completeness (`GET /api/governance/readiness`, `GET /api/governance/completeness/:taskId?`)
- Architecture registry (`GET /api/governance/architecture-registry`)
- Governance history (`GET /api/governance/history`)

**Agents:**
- Status (`GET /api/agents/status`)
- Categories / list (`GET /api/agents/categories`, `GET /api/agents?category`)
- Domain list (`GET /api/agents/domain`)
- Invoke (`POST /api/agents/invoke`, `POST /api/agents/domain/invoke`)
- Sync from GitHub (`POST /api/agents/sync`)
- Individual agent (`GET /api/agents/:slug`)

**Intelligence action metrics:**
- Agent runs (`GET /api/intelligence/agent-runs`)
- Cost summary (`GET /api/intelligence/cost-summary`, `GET /api/cost/today`)
- Lessons (`GET /api/intelligence/lessons`)
- Self-check (`GET /api/intelligence/self-check`)
- Agent performance (`GET /api/intelligence/agent-performance`)
- Timeline (`GET /api/timeline`)

**Reflection / learning:**
- Reflection generation (`generateReflectionForTask`, `runReflectionCheck`)
- Reflection list (`pgListAgentReflections`, `pgGetApprovedReflections`)

**Missing capabilities (per §7.5 / Part XI):**
- No `/api/actions/summary` (badge count endpoint)
- No unified "pending decisions" view (currently 3 statuses hard-coded in frontend)
- No "Modify" or "Defer" affordance on approval cards
- No "Ask APEX to explain more" (COMMAND handoff from approval)
- No progress card for in-flight task
- No cost/risk/reversibility on approval card
- No originating-instruction pointer on approval card
- No 30-second undo banner
- No rejection-reason capture UI
- No feedback loop ("helpful / not helpful") on completed action

---

## SECTION 5 — ROUTE / API INVENTORY

Every endpoint that touches actions / agents / approvals / operations / governance / notifications. Auth column notation: `app-auth` = `requireAppAccess` (X-App-Key header); `cron-auth` = `requireCronAccess` (CRON_SECRET header); `none` = unauthenticated.

### 5.1 Task lifecycle (`src/routes/tasks.js`)

| Method | Path | Auth | What it does | Tables |
|---|---|---|---|---|
| GET | `/api/tasks` | app-auth | Returns parsed task list via `_parseTasks` | `apex_tasks` (+ TASKS.md) |
| POST | `/api/tasks/add` | app-auth | Inserts a new pending task | `apex_tasks` |
| POST | `/api/tasks/run` | app-auth | Marks in_progress; enqueues execution | `apex_tasks` + agent-queue |
| POST | `/api/tasks/notify` | app-auth | Inserts a notification | `apex_notifications` |
| POST | `/api/tasks/approve` | app-auth | Delegates to `_runTask` | `apex_tasks`, `agent_actions` |
| POST | `/api/tasks/reject` | app-auth | Sets status=rejected; posts notification | `apex_tasks`, `apex_notifications` |
| GET | `/api/tasks/standing-approvals` | app-auth | Lists standing approvals | `standing_approvals` |
| POST | `/api/tasks/undo` | app-auth | Marks last-applied action undone | `agent_actions` |

### 5.2 Agent-task records (`src/routes/agent-tasks.js`)

| Method | Path | Auth | What it does | Tables |
|---|---|---|---|---|
| GET | `/agent-tasks` | app-auth | 20 most recent agent tasks | `apex_agent_tasks` |
| GET | `/agent-task/:id` | app-auth | Single agent task detail | `apex_agent_tasks` |

### 5.3 Agent schedules (`src/routes/agent-schedules.js`)

| Method | Path | Auth | What it does | Tables |
|---|---|---|---|---|
| GET | `/agent-schedules` | app-auth | Lists 50 schedules | `apex_agent_schedules` |
| POST | `/run-schedules-now` | app-auth | Runs due schedules once | `apex_agent_schedules` |
| GET | `/cron/health` | app-auth | Cron liveness | — |
| POST | `/cron/run-schedules` | cron-auth | Cron trigger for due schedules | `apex_agent_schedules`, `cron_logs` |

### 5.4 Agents (`routes/agents.js`)

| Method | Path | Auth | What it does | Tables |
|---|---|---|---|---|
| GET | `/api/agents/status` | app-auth | Agent library status | file cache |
| GET | `/api/agents/categories` | app-auth | Categories | file cache |
| GET | `/api/agents` | app-auth | List by category | file cache |
| GET | `/api/agents/domain` | app-auth | Domain agents | in-memory |
| POST | `/api/agents/invoke` | app-auth | Invoke an agent by slug | LLM |
| GET | `/api/agents/:slug` | app-auth | Single agent | file cache |
| POST | `/api/agents/domain/invoke` | app-auth | Invoke a domain agent | LLM |
| POST | `/api/agents/sync` | app-auth | Re-fetch from GitHub in background | file cache + `apex_agents` |

### 5.5 Master orchestrator (`src/routes/master.js`)

| Method | Path | Auth | What it does | Tables |
|---|---|---|---|---|
| GET | `/api/master/permissions` | app-auth | Unread permission notifications | `apex_notifications` |
| POST | `/api/master/approve` | app-auth | Approve/skip a feature | `apex_notifications`, `ROADMAP.md` |
| POST | `/api/capture` | app-auth | Capture note; classify; notify | `apex_notifications` |
| GET | `/api/agent/status` | app-auth | Live agent list | `apex_agents` |
| GET | `/api/master/schedules` | app-auth | Master-scoped schedules | (per handler) |
| POST | `/api/master/office-hours` `qa-review` `release-check` `retro` `benchmark` `investigate` `code-review` `eng-review` `design-review` `design-consult` `design-shotgun` `document-release` `canary` `ship` `codex` `quality-gate` `autoplan` `pair` (~20 endpoints) | app-auth | Orchestrator flows | varies |

### 5.6 Notifications (`src/routes/notifications.js`)

| Method | Path | Auth | What it does | Tables |
|---|---|---|---|---|
| GET | `/notifications` | app-auth | Last 50 notifications | `apex_notifications` |
| POST | `/notifications/:id/read` | app-auth | Mark one read | `apex_notifications` |
| GET | `/api/notifications` | app-auth | Unread notifications | `apex_notifications` |
| POST | `/api/notifications/mark-read` | app-auth | Mark all non-permission read | `apex_notifications` |

### 5.7 Operations (`routes/operations.js`)

| Method | Path | Auth | What it does | Tables |
|---|---|---|---|---|
| GET | `/api/operations/clients` | app-auth | CRM clients list | `apex_clients` |
| POST | `/api/operations/clients` | app-auth | Create client | `apex_clients` |
| PATCH | `/api/operations/clients/:id` | app-auth | Update client | `apex_clients` |
| GET | `/api/operations/projects` | app-auth | Projects list | `apex_projects` |
| GET | `/api/operations/documents` | app-auth | Docs list | `apex_documents` |
| GET | `/api/operations/proposals` | app-auth | Proposals list | `apex_proposals` |
| POST | `/api/operations/migrations/run` | app-auth | Apply DB migration | pg |
| GET | `/api/operations/migrations/list` | app-auth | List migration files | fs |

(Plus 8 `/api/{healthz,version,status,ping,ready,metrics,memory-stats,info,uptime,build-info}` diagnostics that live in this file; not action-related.)

### 5.8 Governance (`routes/governance.js`)

17 endpoints under `/api/governance/*`. Full list: `forensics/:taskId`, `certifications`, `anomalies`, `slo-status`, `agent-reputation`, `system-certification`, `incidents`, `change-intelligence`, `evidence-chain`, `policy-violations`, `dashboard`, `probe` (POST), `probe/latest`, `readiness`, `completeness/:taskId?`, `completeness` (POST), `architecture-registry`, `history`. All `app-auth` via router-wide middleware.

### 5.9 Intelligence action metrics (`routes/intelligence.js`)

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/intelligence/agent-runs` | app-auth | Recent pipeline runs from audit log |
| GET | `/api/intelligence/cost-summary` | app-auth | Total spend + success rate + per-complexity |
| GET | `/api/intelligence/lessons` | app-auth | Recent agent reflexion lessons |
| GET | `/api/intelligence/self-check` | app-auth | Phase-10 self-diagnostics |
| GET | `/api/intelligence/agent-performance` | app-auth | Per-role breakdown |
| GET | `/api/intelligence/performance` | app-auth | Latency stats |
| GET | `/api/intelligence/system-status` | app-auth | Unified subsystems status |
| POST | `/api/intelligence/interrupt` | app-auth | Barge-in TTS |
| POST | `/api/intelligence/voice-state` | app-auth | Update voice state |
| GET | `/api/intelligence/voice-status` | app-auth | Current voice state |

### 5.10 Activity / observability

| Method | Path | Source | Auth | What it does |
|---|---|---|---|---|
| GET | `/api/timeline` | `src/routes/telemetry/index.js:246` | app-auth | Last 20 completed tasks from `apex_timeline` |
| GET | `/api/cost/today` | telemetry | app-auth | Today's total agent cost |
| GET | `/api/latency-stats` | telemetry | app-auth | Latency-tracker stats |
| GET | `/api/latency-traces` | telemetry | app-auth | Session/active traces |
| WS | `/ws/v10-events` | `lib/ws-handler.js` (mounted in server.js:405) | app-auth | Live event push |

### 5.11 Missing routes (referenced by spec but not implemented)

| Method | Path | Spec ref | Purpose |
|---|---|---|---|
| GET | `/api/actions/summary` | §5.1 metrics, §7.5, Part V | Badge count + top-level counts for TODAY / topbar |
| GET | `/api/now/summary` | Decision 6 | Aggregated TODAY payload (includes pending tasks) — Landing dependency for full ACTIONS integration |
| POST | `/api/tasks/:id/defer` | §11 REVIEW options | Defer approval |
| POST | `/api/tasks/:id/modify` | §11 REVIEW options | Modify then approve |
| POST | `/api/tasks/:id/undo` (task-level) | §11 COMPLETE, SD-3 | Undo executed task (distinct from `/api/tasks/undo` which is action-level) |
| POST | `/api/tasks/:id/feedback` | §11 LEARN | Helpful/not-helpful capture |
| GET | `/api/actions/pending?scope=me` | §7.5, RD-3 §11 | Per-User pending-approvals view |

**Auth model summary:** All routes use `requireAppAccess` (X-App-Key). NO route enforces role (Master vs User) beyond `/api/master/*`. NO route filters by `human_id` — because `human_id` columns do not exist on the primary task, action, notification, or run tables.

---

## SECTION 6 — RUNTIME / EXECUTION TRACE

Task-execution runtime sequence when a User (or Master) approves a task via `POST /api/tasks/approve`:

1. `src/routes/tasks.js:50` receives the request.
2. Handler calls `_runTask(taskId, res)` (`lib/auto-pipeline.js`).
3. `_runTask` fetches the task row, updates status to `in_progress`, and invokes `_startAutoPipeline(taskId)` via `_agentQueue.enqueue`.
4. `lib/agent-queue.js::enqueue` places the task on the in-process queue, then drains it FIFO.
5. Execution proceeds through `lib/agent-task-cycle.js::executeApprovedAgentTask`:
   - Fetches plan and steps.
   - Validates via `validateAgentSteps`.
   - For each step: `normalizeExecutableAgentStep` → `canAutoRunLevel3Action` → `stepMatchesStandingApproval` guard → `getMatchingStandingApproval` → executes via `executeApprovedAgentActions`.
   - Each executed step writes an `agent_actions` row with `status='applied'`.
   - Governance gate: `hasAppAccess` was checked at route; policy checks happen via `lib/governance.js` during execution.
6. On success: `getNextTaskStatus` transitions to `completed`; `apex_timeline` row inserted; `pgLogAgentAction` writes audit; optional `generateReflectionForTask` runs, `pgCreateAgentReflection` inserted.
7. On failure: status → `failed`; notification created (`notifyUnsafeActionBlocked` where relevant).

Cost accounting is written to `cost_accounting` during execution. Governance decisions to `policy_decisions`. OTel spans to `otel_spans`. All observable via `/api/governance/forensics/:taskId`.

No user-visible progress panel binds to this execution. `#page-activity`'s WS event feed (10281–10293) is the only channel by which a user (Master only) can see the run in-flight, and even then events are un-grouped.

---

## SECTION 7 — AGENT INTEGRATION

Agent creation, ownership, and status:

- **Creation:** Agents are defined statically in `agent-system/agent-library` and `agent-system/domain-agents`. Runtime agents (`apex_agents` table) receive `slug/name/status`. There is no per-User agent ownership.
- **Ownership:** None. Every agent is system-wide.
- **Status:** `apex_agents.status` (via `GET /api/agent/status`); no lifecycle state for a specific User's engagement.

Agent tasks and runs:

- **Task creation:** `pgCreateAgentTask` (called from planner + command handler). No `human_id` argument.
- **Task ownership:** None — `apex_agent_tasks` schema does not carry an owner.
- **Task status:** Enumerated via `getNextTaskStatus` / `getNextTaskStatusForExecution` in `lib/agent-task-cycle.js`. Known statuses observed in frontend and backend: `pending`, `awaiting_approval`, `pending_approval`, `approval_required`, `in_progress`, `completed`, `failed`, `cancelled`, `rejected`.
- **Task stages:** Multi-step plans; each step in `agent_actions` (status `pending | applied | undone`).
- **Runs:** `apex_agent_runs` with `task_id, objective, success, cost_usd, complexity, duration_ms, created_at`.
- **Failure:** No dedicated UI for failure remediation. Failed tasks appear in Recent Actions (`#page-approvals`) with red badge. Governance `anomalies` capture failures.
- **Cancellation:** No `/api/tasks/:id/cancel` endpoint. Rejection is the only pre-execution stop; there is no in-flight cancellation surface.
- **Retries:** No user-facing retry. `POST /api/tasks/run` accepts `force:true` to re-run a completed task, but this is not exposed in UI.
- **Approval:** Handled via `/api/tasks/approve`. No per-step approval UI (each `agent_action` executes under standing approval or unified task approval).
- **Autonomy:** `AUTONOMY_LEVEL` env var (default `1`); `getAutonomyLevelMessage`, `isSafeLevel3WriteAction`, `canAutoRunLevel3Action`. Users cannot see or change autonomy level from UI; it lives in env only.
- **Results:** Success path writes to `apex_timeline` and generates a reflection; visible on `#page-activity` (Master) and (in aggregate counts) on `#page-approvals` recent actions.

**Domain agents (per §7.5, spec references "SYS/FILE/UNI/FIN/BIZ"):** Roster present on `#page-operation` (hidden) at lines 7940–7986. Not surfaced elsewhere. `#page-agents` renders capability list (`_loadDomainCapabilities` → `/api/agents/domain`).

---

## SECTION 8 — APPROVAL MODEL

- **What requires approval vs autonomous:**
  - Auto-run eligible: `isSafeAutoAction`, `isReadOnlyAgentAction`, `shouldAutoRunTaskAction`, `shouldInferSafeAuto`, `canAutoRunLevel3Action` (all in `lib/agent-step-utils.js` / `lib/agent-execution-utils.js`).
  - Autonomous when `AUTONOMY_LEVEL >= 3` AND step passes `isSafeLevel3WriteAction`.
  - Standing approval bypass: `stepMatchesStandingApproval` + `getMatchingStandingApproval` allow pre-approved patterns to auto-execute.
  - Everything else: `awaiting_approval` status → approval card.
  - Explicit unsafe list guarded by `hasUnsafeAutoActionLanguage` (never auto).
- **Where enforced:**
  - Backend, during plan → step → execute pipeline in `lib/agent-execution-utils.js` and `lib/agent-task-cycle.js`.
  - Governance overlays via `lib/governance.js` policy decisions.
  - Frontend two-step modal (`#apexApprModal`) is a UX confirmation only, not a safety boundary.
  - **Frontend-only enforcement risk:** The `apex-master-only` gate on `#page-approvals` is DOM-hiding, not authoritative — a User with `X-App-Key` can call `/api/tasks/approve` directly. This is a P0/P1 risk (see Section 22/23).
- **Human-scoped:** No. `apex_tasks` has no owner. Any authenticated caller can approve any task.
- **Expiry:** No expiry on pending approvals. A pending task remains pending until manually approved or rejected.
- **Auditable:** Yes — `agent_actions` records applied state; `apex_agent_runs` records run; `policy_decisions` records governance; `/api/governance/forensics/:taskId` reconstructs the full chain.
- **Persisted:** Yes — `apex_tasks`, `agent_actions`, `apex_agent_runs`, `apex_timeline`.
- **Bypass possible?** Yes — via `standing_approvals`, autonomy level ≥3, or a direct call to `/api/tasks/approve` from any account with the X-App-Key.

Standing approvals surface:
- Frontend: `#agentStandingList` (10367) on `#page-agents`.
- Backend: `GET /api/tasks/standing-approvals`.
- Rendered fields: `action_type`, `pattern`; badge "ACTIVE".
- Missing: creation UI, edit UI, disable UI, expiry, per-User scope.

---

## SECTION 9 — GOVERNANCE INTEGRATION

Governance runtime provides:
- **Policy decisions:** `policy_decisions` rows keyed by task_id.
- **Anomalies:** `anomalies` rows.
- **Certifications:** `certifications` rows.
- **Risk scores:** `risk_scores` rows.
- **Evidence blocks:** `evidence_blocks` rows.
- **SLO measurements:** `slo_measurements` rows.
- **Agent reputation:** `agent_reputation` derived.
- **Change intelligence:** `change_intelligence` derived.
- **Architecture registry:** `apex_architecture_registry` derived.

Governance rendering in dashboard:
- `#page-governance` (line ~10688) — Constitutional Charter, authority, records. Not part of ACTIONS surface today but ACTIONS references governance via a state-model note ("Approval ≠ execution · Governance gate applies after approval", line 10402).
- No cross-link from an approval card to the policy decision(s) that will apply. No cross-link from a completed action to its `apex_lessons` reflection.

ACTIONS ↔ governance gap: The V-11 §7.5 spec calls for "Governance ← ACTIONS log → Learn" — this is present in the backend (`apex_lessons`, `apex_agent_reflections`) but has no user-facing loop.

---

## SECTION 10 — IDENTITY / AUTHORITY ANALYSIS

Answers to the 15 audit questions:

1. **Who can create an action?** Any authenticated caller (`app-auth`). Master and User indistinguishable at the API layer. Agent-created tasks come from `pgCreateAgentTask` without owner metadata.
2. **Who can view an action?** Any authenticated caller. `GET /api/tasks` and `GET /agent-tasks` return all tasks system-wide, unscoped.
3. **Who can approve an action?** Any authenticated caller. `POST /api/tasks/approve` is `app-auth` only.
4. **Who can execute an action?** Server-side agent runtime (`_startAutoPipeline`). Users trigger indirectly via approve. No per-User capability restriction.
5. **Who can cancel an action?** No cancellation endpoint. Rejection is only pre-execution; `/api/tasks/reject` is `app-auth` only.
6. **Who can see action results?** Any authenticated caller — `/api/tasks?limit=20` returns all terminal-state tasks (`_loadRecentActions`, dashboard.html:20560).
7. **Who can see action history?** Any authenticated caller — `apex_timeline` via `/api/timeline`; `apex_agent_runs` via `/api/intelligence/agent-runs`.
8. **Can one user's actions be accessed by another?** Yes — the tables have no owner column, so there is no separation. Users can enumerate Master's tasks and vice versa.
9. **How is `human_id` propagated?** It isn't. `req.humanId` is set by `_bootIdentity` middleware in some flows but not consulted by task/action/approval handlers. `apex_tasks`, `apex_notifications`, `apex_agent_runs`, `agent_actions`, `apex_timeline` all lack `human_id` columns.
10. **How is authority propagated?** Environment `AUTONOMY_LEVEL`; standing approvals; safety guards in step-utils. No per-User authority profile.
11. **Where are authorisation decisions enforced?** In the step-execution utility (`canAutoRunLevel3Action`, `isSafeLevel3WriteAction`, etc.) and in `lib/governance.js` policy layer. Enforcement is task-shape based, not identity based.
12. **Are any protections frontend-only?** Yes — the `apex-master-only` DOM gate on `#page-approvals`, `#page-agents`, `#page-activity`, `#page-operation`. All backend endpoints (`/api/tasks*`, `/api/master/permissions`, `/api/master/approve`, `/api/agent-tasks`, `/api/notifications`) are `app-auth` only, not role-gated.
13. **Can an action created by one human be accessed by another?** Yes (see 8). This is a P0 privacy issue if any task carries User-private context in its description.
14. **Can Master system authority accidentally expose User-private action data?** Yes — `/api/master/permissions` returns unread permission-type notifications. If a User-scoped notification was ever inserted with `type='permission'`, Master would see it (currently no code path inserts User-scoped permission notifications, but the schema and query permit it).
15. **Can User actions affect Master/system-level state?** Yes — any authenticated caller can `POST /api/tasks/approve`, which triggers `_runTask` → `_startAutoPipeline` → arbitrary write. A User with `X-App-Key` can execute Master-scoped or system-scoped tasks. **This is the highest-severity finding in this reconnaissance.**

---

## SECTION 11 — PRIVACY ANALYSIS

Data classifications on ACTIONS surfaces (per RD-3 §11 requirements):

| Field | Sensitivity | Current scoping |
|---|---|---|
| `apex_tasks.title` | Medium (could contain domain-specific text) | Unscoped — visible to all |
| `apex_tasks.description` | High (may include personal statements) | Unscoped — visible to all |
| `apex_agent_tasks.plan` / `.steps` | High (embeds user requests verbatim) | Unscoped |
| `apex_agent_runs.objective` | High | Unscoped |
| `apex_notifications.message` | High (contains rejection reasons, capture excerpts) | Unscoped |
| `agent_actions` | High (action target names, file paths) | Unscoped |
| `apex_timeline.agent_logs` | High | Unscoped |
| Master permissions (feature-approval flow) | Medium | Master-only via `type='permission'` filter but not enforced at role level |
| Governance policy decisions | Medium (references task_id which links to owner) | Unscoped |

Privacy boundary evaluation: 8 of 8 material fields on ACTIONS surfaces are unscoped. This is a systemic gap analogous to (but broader than) the episodic-memory leak fixed in V-11-G-P0-1.

---

## SECTION 12 — PROVENANCE ANALYSIS

Chain: **user instruction → command/conversation → intelligence/decision → action → approval → execution → result**.

Actual coverage:

| Link | Present? | Where |
|---|---|---|
| User instruction ↔ COMMAND thread | Partial | Chat message stored in `apex_chat_history_{humanId}` (localStorage per V-11-E D7); no back-pointer from task to chat message id |
| COMMAND thread ↔ command intent | Partial | `lib/agent-command-handler.js` executes; no `command_id` written to `apex_tasks` |
| Command ↔ intelligence/decision | Partial | `agent_decisions` table exists; keyed by task_id; queryable via forensics |
| Decision ↔ action (task creation) | Yes | `apex_agent_tasks` created by planner |
| Action ↔ approval | Partial | Approval is a status transition on the same row; no dedicated `approval` row/record with `approved_by`, `approved_at`, `approver_reason` |
| Approval ↔ execution | Yes | `agent_actions` rows |
| Execution ↔ result | Yes | `apex_timeline` rows + `apex_agent_runs` |
| Result ↔ memory (episode) | Partial | Episode written but no cross-link on the task record |
| Result ↔ lesson | Partial | `apex_lessons` per task, but no user-visible chain |
| Result ↔ notification | Yes | `notifyTaskStatus` creates `apex_notifications` on transitions |

Traceability from a user standpoint: **broken**. There is no user-visible surface that says "this action came from your instruction X on date Y". The forensic query at `/api/governance/forensics/:taskId` reconstructs it end-to-end from evidence, but the ACTIONS UI does not consume it.

---

## SECTION 13 — MEMORY INTEGRATION

Actions ↔ memory relationships:

- **Episodic memory:** `episodicMemory.recordEpisode` is called by the runtime after task completion. No cross-link surfaced.
- **Semantic memory:** Task success/failure does not automatically extract facts. Contradictions can be surfaced via COMMAND memory-correction flow (§9.4) but not from ACTIONS.
- **Procedural memory:** Standing approvals are procedural in nature; not stored in `procedural_memory` table.
- **Skill memory:** Agent skill success rates written via `pgUpdateSkill` — not linked from ACTIONS.
- **Decision memory:** `agent_decisions` per task; not surfaced in ACTIONS UI.
- **Reflexion:** `pgCreateAgentReflection` after completion; visible via `/api/intelligence/lessons` on INTELLIGENCE (V-11-G LESSONS panel).

Under whose identity: everything runs under the system/agent identity. `human_id` is not propagated into any memory-write from the ACTIONS path.

Recommendation: add `originating_human_id` and `originating_command_id` fields to `apex_agent_tasks` schema (backend gate).

---

## SECTION 14 — NOTIFICATION INTEGRATION

Notifications for actions:

- **Approval needed:** `notifyTaskStatus` on transition to `awaiting_approval` creates `apex_notifications` row.
- **Completion:** `notifyTaskStatus` on transition to `completed`.
- **Failure:** `notifyTaskStatus` on transition to `failed`; `notifyUnsafeActionBlocked` for policy blocks.
- **Escalation:** No dedicated escalation channel. A pending approval that expires simply stays pending indefinitely.
- **Cancellation:** No cancellation notification (no cancellation endpoint).
- **Rejection:** `/api/tasks/reject` inserts `apex_notifications` with prefix `⛔ ${taskId} rejected`.

Notification delivery paths:
- In-app: `#page-activity` (`_loadActNotifications`, top-right badge on nav) and `#actNotifList`.
- Topbar: `#navApprovalsBadge` (approval count), `#navActivityBadge` (activity count).
- Cross-channel: WebSocket `/ws/v10-events` push (Master only in current UI).
- Push notifications: Not implemented (spec §12 references push, absent from code).

Notification acknowledgement: `POST /notifications/:id/read` and `POST /api/notifications/mark-read`. Master-permission notifications are excluded from `mark-read` via `neq('type', 'permission')`.

Missing: per-User notification filtering, "silence for 24h" preferences, category subscription settings, digest mode (§12.6).

---

## SECTION 15 — TODAY INTEGRATION

TODAY ↔ ACTIONS relationship (per §7.1 + §7.5):

- **Needs You** section on TODAY (`#page-overview`) should surface top-3 pending approvals. Currently: TODAY renders a "priority inbox" via `/api/briefing/priority-inbox`, which is not the same as pending approvals.
- **Since Last Visit** on TODAY consumes `/api/intelligence/agent-runs` filtered by SD-2 `apex_prev_session_ts`.
- **Approvals overflow rule:** "Maximum 3 items in TODAY → Needs You at any time (overflow → ACTIONS)" (§12.6). Currently NOT enforced because Needs You is not wired to `/api/tasks?status=pending`.
- **Cross-navigation:** No "2 more in Actions →" link on TODAY overflow; would need to be added.

Existing linking: `pollPermissions()` populates the topbar `#navApprovalsBadge`; from TODAY the user must click the sidebar `Approvals` entry to reach the surface (Master-only).

---

## SECTION 16 — COMMAND INTEGRATION

COMMAND → action creation → state → result:

- **Command creates a task:** `lib/agent-command-handler.js::handleCommand` may call `pgCreateAgentTask` and enqueue.
- **Command shows an inline approval card:** V-11-E E-9 shipped inline `apex-card` archetype detection for `approval-required`; approve/reject wired inline within `#cmdThread`.
- **Command result surface:** Result appears in COMMAND thread as archetype card; ACTIONS log receives the run via `/api/intelligence/agent-runs`.
- **"Ask APEX to explain more" (§11 REVIEW option):** Not implemented — no ACTIONS→COMMAND handoff from an approval card.

Missing: a shared `renderApprovalCard(task, {location: 'command'|'actions'|'today'})` primitive so approve/reject behaves identically wherever surfaced.

---

## SECTION 17 — INTELLIGENCE INTEGRATION

INTELLIGENCE → proposed action → approval → execution:

- **Proposed opportunities:** `/api/intelligence/opportunities` returns items with `composite_score`. None of them auto-generate tasks; users cannot "escalate opportunity to task" from INTELLIGENCE (V-11-G open decision O-8 recommendation was "creates a research task in ACTIONS" — deferred).
- **Cross-link:** V-11-G shipped a WebSocket bridge (`_apexIntelligenceWsBridge`) for `opportunity.detected`; no corresponding push for `task.created_from_opportunity`.
- **Lessons ↔ ACTIONS:** LESSONS panel on `#page-intelligence` (V-11-G G-6) reads reflexion outcomes. No visible tie back to the specific task that generated each lesson.

Backend gate implied: `/api/intelligence/opportunities/:id/escalate` → creates a task with `origin: 'opportunity'` and `origin_id`.

---

## SECTION 18 — CURRENT UI ANALYSIS

### `#page-approvals` — closest existing surface to ACTIONS

Container: dashboard.html:10392–10443. Master-only via nav-btn `apex-master-only`.

Components:
- Two-step approval modal `#apexApprModal` (10394–10404) — z-index 401, role="dialog", aria-modal, Confirm/Cancel buttons at 44px min-height. Modal focus-trap partial (first-focus set, no trap loop).
- Page header (10405–10411) — title "APPROVALS" 7px letter-spacing, subtitle "PENDING · ACTIONS · GOVERNANCE", `↻ Refresh` cyan btn (`data-fn="approvalsRefresh"`).
- Panel 1 "Pending Approvals" (10414–10425): amber pulse dot `#apprPendingDot`, count `#apprPendingCount`, list `#apprPendingList`.
- Panel 2 "Recent Actions" (10427–10437): cyan dot, list `#apprRecentList` (max-height 280px scroll).
- State-model note (10438–10441): "PROPOSED → APPROVAL_REQUIRED → APPROVED → EXECUTING → EXECUTED/FAILED. Approval ≠ execution. Proposal ≠ approval." — pipeline-vocabulary leak like V-11-G's Intelligence boundary note.

JS handlers:
- `approvalsRefresh` (20519) — orchestrates the two loaders.
- `_loadPendingApprovals` (20522) — fetches `/api/tasks`, filters, renders bespoke card. Renders raw status enum "APPROVAL REQUIRED" (20544).
- `_loadRecentActions` (20557) — fetches `/api/tasks?limit=20`, filters to `completed|failed|cancelled|rejected`, renders 15.
- Two-step approval delegated click handler (20581–20606) — listens for `data-appr-id` / `data-reject-id`.
- `apexConfirmApproval` (20608) / `apexDeclineApproval` (20617).

### `#page-agents` — agents surface (Master-only)

Container: 10324–10389. Panels: Self-Check (`#agentSelfCheck`), Recent Agent Runs (`#agentRunsList` via `/api/intelligence/agent-runs`), Standing Approvals (`#agentStandingList`), Domain Agent Capabilities (`#agentCapList`), Authority note.

### `#page-activity` — activity feed (Master-only)

Container: 10240–10321. Live WebSocket event feed with 6 category filters; task timeline (last 20 completed via `/api/timeline`); notifications panel.

### `#page-operation` — legacy pipeline (hidden)

Container: 7835–8063. `display:none !important` per V-11-F F-7. Contains: pipeline flow header (QUEUED/PROCESSING/REVIEW/COMPLETE counts), pipeline board (4 lanes), Agent Roster (5 domain agents), Approval Gate `#opsApprovalsFull` with 7 filter pills and `#permissionCards` populated by `pollPermissions()`, CRM/Projects/Documents/Proposals sub-panels.

### `#page-command` — inline approval card

Per V-11-E E-9: `renderApexCard` with archetype `approval-required` inserts inline approve/reject buttons in `#cmdThread`.

### Empty states — current

- Approvals empty: `<div style="color:#8893a0;font-size:11px">No pending approvals</div>` (20536).
- Recent actions empty: "No recent actions" (20565).
- Agent runs empty: "No agent runs recorded" (20480).
- Standing approvals empty: "No standing approvals configured" (20503).
- Activity notifications empty: not observed inline, likely bespoke.

None use the V-11-B `setState('empty')` pattern.

### Error states

- All catch handlers write bespoke red inline text (`Failed to load approvals`, `Recent actions unavailable`, `Standing approvals unavailable`, `Agent runs unavailable`). No retry buttons.

### Mobile behaviour

- `#page-approvals` at 375px: panels stack, approval card buttons min-height 44px (compliant), reject/approve buttons 50/50 flex.
- No swipe-left-to-approve pattern (§XX mobile suggests haptic + swipe).
- No mobile bottom-sheet approval detail (§22.3).

### Desktop behaviour (≥1280px)

- Single column full-width. No multi-column layout. Wastes real estate.

### What can be retained, transformed, removed

| Element | Verdict |
|---|---|
| `#page-approvals` container | RETAIN, transform into unified `#page-actions` shell |
| `#apexApprModal` two-step confirmation | RETAIN — canonical two-step per UX-14 INV-ACTION-24 |
| `#page-agents` self-check + agent runs + standing approvals + capabilities | TRANSFORM — split: standing approvals migrate to ACTIONS; self-check to SYSTEM; capabilities to SYSTEM per §7.6; agent runs stay as a "log" panel on ACTIONS |
| `#page-activity` live feed + notifications | TRANSFORM — live feed migrates to SYSTEM Activity (§7.6); notifications migrate to ACTIONS notifications panel |
| `#page-operation` | REMOVE from user paths (already hidden) — but `pollPermissions()`, `#permissionCards`, and Approval Gate filters have UX value and should be re-used in the new ACTIONS approval card. |
| State-model note text | REMOVE — pipeline vocabulary leak; replace with 1-sentence plain-language boundary note. |
| `#nav-approvals`, `#nav-agents`, `#nav-activity` | CONSOLIDATE into single `#nav-actions` |
| Legacy Approval Gate filter pills (7) | CONSOLIDATE — inherit as ACTIONS filter chips: All · Comms · Finance · Health · Ops (+ Simple/Complex sort) |
| Agent Roster (5 tiles) | REMOVE from ACTIONS — belongs to SYSTEM per §7.6 |

---

## SECTION 19 — STATE MODEL ANALYSIS

Required states (§7.5 + §11):

| State | Present? | Where |
|---|---|---|
| loading | Partial | Skeleton rows on all panels; not via `setState('loading')` |
| ready | Yes | Bespoke render |
| pending | Yes | Approval card, amber pulse |
| awaiting-approval | Yes | Explicit status filter |
| approved (post-approval, pre-executing) | No | Transitions directly to `in_progress` |
| rejected | Yes | Terminal status, red badge |
| executing | Partial | `in_progress` in `apex_tasks` — but no in-progress UI card |
| completed | Yes | Green OK badge |
| failed | Yes | Red FAIL badge |
| cancelled | Yes | Grey badge in Recent Actions filter — but no cancellation path |
| expired | No | No expiry logic anywhere |
| blocked | No | Governance blocks are silent; `notifyUnsafeActionBlocked` writes a notification but no dedicated blocked-state card |
| forbidden | No | 403 responses do not exist on task routes today |
| unavailable | Partial | Error text "Failed to load approvals" |
| degraded | No | Not modelled per-panel |

Delta: 9 of 15 required states have no first-class rendering.

---

## SECTION 20 — PROGRESSIVE DISCLOSURE ANALYSIS

Per §7.5 / Part IV disclosure model:

- **L0 — What needs my attention?** Present as pending approvals card, but overloaded: shows task_type, uppercase "APPROVAL REQUIRED" badge, description (140 char slice), created_at, two 50/50 buttons. Missing: confidence-equivalent priority chip, cost, risk, reversibility.
- **L1 — What is happening and why?** ABSENT. No inline expansion. No "View detail" behaviour beyond the two-step modal (which shows only "Task ID: X — This action will be submitted for governance gate evaluation.").
- **L2 — What caused it / what supports it?** ABSENT. No evidence bundle. No originating instruction back-link.
- **L3 — Detailed execution / agent / action info.** ABSENT on ACTIONS. Available via `/api/governance/forensics/:taskId` (16-question forensic answer) — but unconsumed by UI.
- **L4 — Technical / runtime / governance internals.** Belongs in SYSTEM per §7.6. Governance page is separate — no link from an ACTIONS card to `#page-governance` forensics.

L0 completeness score: 3/7 fields present. L1–L4 completeness: 0%.

---

## SECTION 21 — MOBILE / DESKTOP ANALYSIS

**Mobile (375px):**
- `#page-approvals` panels stack correctly. Two-step modal at 90vw max-width. Buttons 44px min-height. Fine.
- No swipe-to-approve, no bottom-sheet detail, no haptic feedback hook.
- Text overflow on `task_type` un-truncated — long identifiers push out.

**Mobile 768–1023px:** Same single-column; wastes horizontal real estate.

**Desktop 1024px+:** Single column; would benefit from 2-column layout (pending approvals left, recent actions right) or split "urgent | important | ambient" sections.

**Desktop 1280px+ / 1660px+:** Should introduce filters and search input, per legacy `#opsApprovalsFull` pattern.

**Mobile bottom-tab positioning:** Per §7 spec, mobile-tab abbreviation is `ACTIONS`. Currently the bottom-tab does not have an `#nav-actions` entry.

---

## SECTION 22 — P0 FINDINGS

- **P0-1: ACTIONS surface unreachable to User role.** `#page-approvals`, `#page-agents`, `#page-activity`, `#page-operation` are all `apex-master-only`. Users can never reach an approval affordance. Priority: fix by (a) removing `apex-master-only` from a canonical `#page-actions` container and (b) rendering only per-User-scoped content for User role.
- **P0-2: `POST /api/tasks/approve` and `POST /api/tasks/reject` accept ANY task id from ANY authenticated caller.** No `human_id` check. Any account with `X-App-Key` can approve or reject any task — including Master's private/sensitive tasks. This is the highest-severity finding: cross-account write authority.
- **P0-3: `GET /api/tasks`, `GET /agent-tasks`, `GET /api/timeline`, `GET /api/notifications`, `GET /api/intelligence/agent-runs` return all rows to all authenticated callers.** No owner scoping. Users can enumerate every task, notification, and agent run in the system.
- **P0-4: No `/api/actions/summary` endpoint despite spec dependency.** Badge counts are computed by client-side filtering of the full task list — this both (a) leaks all task data to any caller (P0-3 duplicate) and (b) defeats the <500 ms metric target.
- **P0-5: `apex-master-only` DOM gate is presented as an authority boundary but is CSS-hiding only.** DOM elements are still present; JS can still be called via console. Backend does not enforce. This is a P0 documentation/expectation gap — the spec assumes role-based content boundaries exist.
- **P0-6: No undo banner post-approval.** SD-3 locks the 30 s window. Absence means "reversible" claims on approval cards are not honoured. If V-11-H ships approval cards claiming "Reversible: Yes", the user must actually be able to undo — otherwise the claim is false.

---

## SECTION 23 — P1 FINDINGS

- **P1-1: Approval card missing 4 of 6 canonical fields.** Cost, risk, reversibility, originating instruction all absent. §11.2 required.
- **P1-2: No progress card for in-flight execution.** Users see no "APEX is working on this…" state after approving.
- **P1-3: No cancellation endpoint for in-flight tasks.**
- **P1-4: No "Modify" / "Defer" / "Ask APEX to explain more" review options.** §11 REVIEW spec unmet.
- **P1-5: No rejection-reason UI.** `/api/tasks/reject` accepts optional `reason` but the frontend never collects it.
- **P1-6: No "helpful / not helpful" feedback loop** on completed actions. §11 LEARN unmet.
- **P1-7: No `data-apex-state` on any panel.** V-11-B universal state pattern not adopted.
- **P1-8: Raw enum leakage across the surface.** "APPROVAL REQUIRED", "PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "REJECTED" all rendered as raw uppercase strings. §7.5 needs plain-language mapping.
- **P1-9: State-model note ("PROPOSED → APPROVAL_REQUIRED → …") leaks pipeline vocabulary.** Delete per V-11-G precedent.
- **P1-10: No `/api/actions/pending?scope=me` filter path.** All-or-nothing; no per-User feed.
- **P1-11: Standing approvals surface is view-only** — no creation / edit / disable / expire UI. §7.5 requires standing rules to be user-manageable.
- **P1-12: Notifications, permission-notifications, and approvals are three parallel systems** — `apex_notifications` (typed), `apex_notifications` type='permission' (via /api/master/permissions), and `apex_tasks` awaiting_approval. No unified inbox.
- **P1-13: No push notification integration** despite §12.2 hierarchy (priority 1-2 = "Immediate — push").
- **P1-14: XSS risk in approval card rendering.** `_loadPendingApprovals` inserts `t.task_type` and `t.description` via string concatenation; V-11-G shipped `_escapeHtml` but it is not applied on the approvals surface.
- **P1-15: `apex_tasks` schema has no owner column — schema migration needed to move P0-2/3 fixes beyond role-only gating.**

---

## SECTION 24 — P2 FINDINGS

- **P2-1: No `aria-busy` on skeleton loaders** across all four surfaces.
- **P2-2: Refresh buttons lack `aria-label`** on `#page-approvals`, `#page-agents`, `#page-activity`.
- **P2-3: Approval card badge (`APPROVAL REQUIRED`) is color-only (amber) with no textual severity cue for screen readers beyond the text itself** — okay but not audited.
- **P2-4: Focus-trap on `#apexApprModal` is partial** — first-focus only, no tab-loop.
- **P2-5: No landmark roles** (`<main>`, `<section role="region">`) on the four surfaces.
- **P2-6: Truncation without expansion** — description 140-char slice, no "read more".
- **P2-7: `#navApprovalsBadge` polls via `_loadPendingApprovals`** every entry; not WS-pushed. Wastes cycles.
- **P2-8: Two-step modal description is generic** — always says "Task ID: X — This action will be submitted for governance gate evaluation." Should surface the actual action detail.
- **P2-9: `_loadRecentActions` cannot distinguish `rejected` from `cancelled` visually** — both use grey/orange badges; user cannot tell the difference between "I rejected this" and "it was cancelled by the system".
- **P2-10: `pollPermissions` fires every 30 s regardless of active page**, per `setInterval(pollPermissions, 30000)` at line 14594. Should suspend when the user is not on ACTIONS / TODAY.

---

## SECTION 25 — P3 FINDINGS

- **P3-1: `#page-operation` DOM ghost-keep is a memory / bytes cost.** Retention is intentional per F-7 but candidate for deletion in a subsequent cleanup pass.
- **P3-2: Standing approvals rendering has no expiry visibility.** If `standing_approvals` has `expires_at`, it isn't shown.
- **P3-3: No day-grouping on Recent Actions.** Long lists become hard to scan.
- **P3-4: No search over past actions.**
- **P3-5: Agent Roster tiles duplicate content on other surfaces** (agent capabilities on `#page-agents`, agents overview on `#page-system`).
- **P3-6: No dark/light mode consideration for ACTIONS surface** (whole app is dark; not a P0 but noted).
- **P3-7: `#page-approvals` container `<div class="page">` has no `id="page-actions"` alias — future rename would break external references.**

---

## SECTION 26 — OPEN DECISIONS

### O-1: Consolidate `#page-approvals` + `#page-agents` + `#page-activity` into a single `#page-actions`, or keep separate?

- **Question:** §7.5 implies a single ACTIONS destination with pending approvals + task queue + agent run log + standing rules. Currently three separate pages.
- **Current alternatives:** (A) Full merge into `#page-actions`, ghost-keep the three legacy DOMs; (B) Keep three pages but re-label the parent nav-group; (C) Merge Approvals + Agent Runs, keep Activity in SYSTEM.
- **Recommended option:** **A (full merge into `#page-actions`, ghost-keep DOMs)** — mirrors the V-11-F F-7 pattern used for `#page-operation`.
- **Rationale:** Single canonical destination matches spec; ghost-keep preserves JS references (`_loadPendingApprovals`, `_loadRecentActions`, `agentsRefresh`, `_loadStandingApprovals`, `_loadAgentRuns`, `_loadActNotifications`, etc.) without deletion risk.
- **Consequence:** Nav consolidation to `#nav-actions` (single entry). Existing badges `#navApprovalsBadge`, `#navActivityBadge` migrate to a single `#navActionsBadge`.

### O-2: Role-adapted content — Users see own tasks/approvals/actions; Master sees all + own

- **Question:** With no `human_id` on tasks/notifications/actions, how do we render role-adapted content for V-11-H shipment?
- **Current alternatives:** (A) Ship User view with empty state until backend gate H-B1 lands; (B) Ship User view showing all system tasks (no privacy improvement); (C) Ship User view showing only tasks created within the User's own COMMAND session (client-side filter by session id); (D) Defer ACTIONS to User role entirely until backend gate lands.
- **Recommended option:** **A — Empty state for User until backend gate H-B1 provides owner-scoping.**
- **Rationale:** Consistent with V-11-G-P0-3 pattern (personal briefing stub for User). Preserves user-facing correctness. Backend gate H-B1 is small (add `human_id` column + `_requireOwnerScope('tasks')` middleware) and can ship in a follow-up authorised backend PR.
- **Consequence:** For V-11-H, User sees "APEX is preparing your Actions view" stub; Master sees full ACTIONS surface. Not a regression — User had no reachable ACTIONS surface before.

### O-3: 30-second undo banner — implement in V-11-H or defer to V-11-H-2?

- **Question:** SD-3 locks the 30 s undo window. Implementation requires: (a) UI banner + countdown; (b) POST target that reverses `_runTask` outputs; (c) safe reversibility classification per action-type.
- **Current alternatives:** (A) Ship banner UI + wire to `/api/tasks/undo` (which currently reverses only the last-applied `agent_action` at row-level, not the whole task); (B) Ship banner but only for reject (no post-approve undo); (C) Defer undo entirely; add banner in V-11-H-2 backed by a new `/api/tasks/:id/undo` (task-level) endpoint.
- **Recommended option:** **A for reversible actions only**, using the existing `/api/tasks/undo` (action-level) with a UI note "This will undo the last change made by APEX for this task."
- **Rationale:** Ships the SD-3 UX now (30 s banner, countdown, single Undo button). The action-level undo is what actually happens today; the banner honours the SD-3 window and provides real reversibility for atomic actions. Task-level undo (rolling back multi-step tasks) is a bigger surgery deferred to backend gate H-B4.
- **Consequence:** Undo works for single-step actions; multi-step tasks show banner but Undo only reverses the last step. Spec §11.2 destructive-actions guidance ("This cannot be undone if irreversible") is respected — irreversible tasks skip the banner.

### O-4: Approval-card evidence bundle — where does it come from?

- **Question:** §11.2 requires cost / risk / reversibility on every approval card. Where do these values come from?
- **Current alternatives:** (A) Server-computed at approval time via a new field on `apex_agent_tasks.plan`; (B) Client-inferred from task_type using a static mapping table; (C) Both — server-computed when available, client-fallback otherwise.
- **Recommended option:** **C — server-computed via backend gate H-B2, client-fallback mapping for V-11-H interim.**
- **Rationale:** Ship interim value now; upgrade to authoritative once backend evidence bundle lands.
- **Consequence:** V-11-H ships a `_apexActionInfo(task)` client utility with a heuristic mapping. Follow-up backend gate populates a canonical `evidence` object on task response payload.

### O-5: Cross-user visibility for Master

- **Question:** Master's ACTIONS view — should Master see per-User tasks in aggregate, or with content?
- **Current alternatives:** (A) Full content (status quo); (B) Counts only (Layer 2 aggregate per RD-3 §6.2); (C) Full content but with a "OTHER USER" badge on rows not owned by Master; (D) Emergency-access invocation required to expand a User's task content.
- **Recommended option:** **C for V-11-H, upgrade to D under emergency-access in a follow-up.**
- **Rationale:** Master needs operational visibility now; emergency-access UI already shipped in F-11 scaffold.
- **Consequence:** Requires backend gate H-B1 to distinguish owner-scoping.

### O-6: Standing-approvals user management UI

- **Question:** V-11-H scope — ship create/edit/disable UI, or read-only for now?
- **Current alternatives:** (A) Read-only + "Managed via CLI"; (B) Add-only (no edit) UI; (C) Full CRUD.
- **Recommended option:** **A (read-only) for V-11-H.**
- **Rationale:** Creation UI implies rule-syntax comprehension. Owner-scoping on `standing_approvals` also needs backend gate. Defer.
- **Consequence:** Users understand what's auto-approved for them; changes require Master action or CLI.

### O-7: Priority classification — per-item chip or global sort?

- **Question:** §11.2 "priority scoring" (approvals > urgent tasks > deadlines > opportunities) — surface as visible chip or use only for ordering?
- **Current alternatives:** (A) Both (chip + ordering); (B) Ordering only (subtle); (C) Chip only, no re-ordering.
- **Recommended option:** **A.**
- **Rationale:** Users need to scan by urgency; chip communicates "why this is here first".
- **Consequence:** New client utility `_apexActionPriority(task)` returns `{ tier, label }` for chip render.

### O-8: Notifications integration — merge into ACTIONS or keep separate on SYSTEM?

- **Question:** Currently notifications appear on `#page-activity`. Spec §7.5 lists "standing approval rules" not notifications. §12 puts notifications everywhere.
- **Current alternatives:** (A) Notifications panel in ACTIONS + Activity in SYSTEM; (B) Notifications in TODAY (Needs You section already implies this); (C) Notifications in a dedicated `#page-inbox` (over-engineered).
- **Recommended option:** **A — Notifications panel in ACTIONS (mirrors §7.5 "log"); Activity live-feed migrates to SYSTEM per §7.6.**
- **Rationale:** Notifications ARE actions on completion/failure; belong with the action log.
- **Consequence:** `#page-activity` DOM ghost-kept; JS `_loadActNotifications` re-used.

### O-9: Master-only `pollPermissions()` migration

- **Question:** `pollPermissions` populates `#permissionCards` on the hidden `#page-operation`. It fires every 30 s regardless of active page. In V-11-H, should permission notifications be surfaced somewhere user-visible?
- **Current alternatives:** (A) Migrate `#permissionCards` block into ACTIONS as a Master-only sub-section; (B) Discard entirely (feature already accessible via `apex_notifications` list); (C) Migrate to SYSTEM.
- **Recommended option:** **A — Master-only "Feature Approvals" sub-panel on ACTIONS.**
- **Rationale:** These ARE approvals (of orchestrator features). They belong with other approvals for Master. `pollPermissions` visibility guard (§F-15 pattern) still applies.
- **Consequence:** `#page-operation` DOM further empties.

### O-10: Agent Roster placement

- **Question:** The 5-tile Agent Roster currently on `#page-operation` — retain on ACTIONS or move to SYSTEM?
- **Current alternatives:** (A) SYSTEM (per §7.6 "Agents: domain agents, pipeline, schedules"); (B) ACTIONS (agent status while doing work); (C) Both (redundant).
- **Recommended option:** **A — SYSTEM.** Consistent with §7.6.
- **Rationale:** ACTIONS answers "what needs my decision"; SYSTEM answers "how is APEX composed". Agent identity belongs to SYSTEM.
- **Consequence:** ACTIONS is leaner; SYSTEM surface grows (already noted for other elements: civilization health, self-check).

### O-11: Recent Actions retention window

- **Question:** How much history to show on ACTIONS log at L0 vs paginate?
- **Current alternatives:** (A) Last 15 (current); (B) Last 24 h; (C) Last 7 days with "load more".
- **Recommended option:** **B (Last 24 h) with "View all" → dedicated log page or SYSTEM Activity for deeper history.**
- **Rationale:** ACTIONS is a decision surface, not a records archive.
- **Consequence:** Client filter by `created_at >= now - 24h`.

### O-12: Approval-card action-type icon set

- **Question:** §11.2 example shows "▶ Create calendar event" — a leading icon per action type. Are icons already defined?
- **Current alternatives:** (A) Unicode geometric characters (`◈`, `▶`, `⊛`, `◍`); (B) SVG glyphs; (C) None (text only).
- **Recommended option:** **A with fallback to text.** Consistent with existing dashboard use of Unicode iconography.
- **Rationale:** Cheap, no bundle cost, accessible with `aria-hidden` on the glyph.
- **Consequence:** New `_apexActionIcon(task_type)` mapping table (~15 entries).

### O-13: XSS defence layer for ACTIONS

- **Question:** V-11-G shipped `_escapeHtml` for Intelligence. Should V-11-H apply it to Actions inserts?
- **Current alternatives:** (A) Yes — apply globally to `title/description/task_type/rejection_reason`; (B) Backend sanitisation only.
- **Recommended option:** **A — apply `_escapeHtml` at every insertion site.** Follow V-11-G precedent.
- **Rationale:** Defence in depth; frontend is the last stop before render.

### O-14: WebSocket subscriptions for ACTIONS

- **Question:** V-11-G shipped `_apexIntelligenceWsBridge`. Should V-11-H add an analogous bridge for `task.created`, `task.approved`, `task.completed`, `task.failed`, `notification.new`?
- **Current alternatives:** (A) Yes — dormant subscribe, refresh panel on event; (B) No — poll only.
- **Recommended option:** **A.**
- **Rationale:** Consistent with V-11-G pattern; supports live badge counts; backend WS server already exists (`/ws/v10-events`, `lib/ws-handler.js`).

### O-15: Keyboard shortcut `A` behaviour

- **Question:** §7.5 keyboard shortcut `A` maps to ACTIONS. V-11-F F-7 remapped `A` → `switchPage('business')` (scroll to `#bizApprovalList`). In V-11-H, revert `A` to ACTIONS?
- **Current alternatives:** (A) Revert `A` → `#page-actions`; (B) Keep V-11-F behaviour (`A` → business approvals); (C) Add `Shift+A` for ACTIONS, keep `A` for business.
- **Recommended option:** **A — revert `A` to canonical ACTIONS.**
- **Rationale:** Spec explicit.
- **Consequence:** V-11-F test suite `A`-key assertion must be adjusted; low risk.

---

## SECTION 27 — BACKEND GATES

None are implemented in V-11-H frontend scope. Documented for future authorisation.

### H-B1 (P0) — Per-User owner scoping middleware + schema migration

- **What:** Add `human_id` column to `apex_tasks`, `apex_agent_tasks`, `apex_notifications`, `apex_agent_runs`, `agent_actions`, `apex_timeline`, `standing_approvals`. Backfill from originating request context or set to `null` (system-owned). Add `_requireOwnerScope('tasks'|'notifications'|'actions'|'runs'|'timeline'|'standing')` middleware that filters by `req.humanId` and lets Master bypass.
- **Why:** P0-2/P0-3 privacy + authority breach. Currently any authenticated caller can enumerate and act on any task.
- **What must happen:** (a) migration file added under `migrations/`, (b) column added, (c) middleware written, (d) applied to all 6 route files above, (e) frontend gains a `scope=me|all` query param, defaulting to `me` for Users and `me` for Master unless `?scope=all` is passed.
- **Note:** Migration mirrors V-11-G G-B1 for episodic memory.

### H-B2 (P0) — `GET /api/actions/summary` endpoint

- **What:** Returns `{ pending_approvals, in_progress, completed_today, failed_today, notifications_unread, needs_attention_count }` in one call. Owner-scoped per H-B1.
- **Why:** §5.1 metrics badge target; eliminates client-side full-task-list scan for badge counts.
- **What must happen:** New route in `src/routes/tasks.js`. Reads `apex_tasks` + `apex_notifications` + `apex_agent_runs`. TTL cache 15 s.

### H-B3 (P0) — Task-level undo endpoint

- **What:** `POST /api/tasks/:id/undo` that reverses all `agent_actions` for a task (in reverse order), issues compensating operations where safe (file deletes → restore from backup; DB updates → revert), and marks task `status='undone'`.
- **Why:** SD-3 requires reversible actions. Current `/api/tasks/undo` is action-level; the banner promises task-level.
- **What must happen:** Add reversibility classification per action-type; add backup-restore paths for `create_document`, `create_workspace_file`, `rename_document`, `delete_document`; add task-level undo logic that assembles a compensating plan.

### H-B4 (P1) — Approval-card evidence bundle

- **What:** Include on every task response payload: `{ evidence: { originating_command_id, originating_command_text, cost_estimate_usd, risk_tier: 'none'|'low'|'medium'|'high'|'destructive', reversibility: 'yes'|'partial'|'no', destructive_targets: [], estimated_duration_ms } }`.
- **Why:** §11.2 canonical approval card design.
- **What must happen:** Extend `pgCreateAgentTask` and `_parseTasks` to populate these. Extend planner to write cost/risk during plan generation.

### H-B5 (P1) — Task-level status transitions surfaced via WS

- **What:** WS push `task.created`, `task.approved`, `task.rejected`, `task.executing`, `task.completed`, `task.failed`, `task.undone`, `notification.new`, `standing_approval.matched`.
- **Why:** Live badge counts + inline card updates without polling.
- **What must happen:** Instrument `lib/agent-task-cycle.js` status transitions and `pgCreateNotification` writes to emit through `_bus` → `lib/ws-handler.js`.

### H-B6 (P1) — `POST /api/tasks/:id/cancel` (in-flight cancellation)

- **What:** Sets task `status='cancelling'`; agent queue dequeues if pending; running task receives signal (best-effort) and stops after current step.
- **Why:** Users cannot stop an in-flight task; §11 EXECUTE stage requires monitor/cancel affordance.

### H-B7 (P2) — `POST /api/tasks/:id/defer`

- **What:** Sets task `deferred_until` timestamp; excluded from pending until timestamp expires.
- **Why:** §11 REVIEW spec.

### H-B8 (P2) — `POST /api/tasks/:id/feedback`

- **What:** Writes `{ helpful: bool, note: string? }` to `apex_task_feedback`. Feeds reflexion engine.
- **Why:** §11 LEARN spec.

### H-B9 (P2) — `POST /api/tasks/:id/modify`

- **What:** Allows a caller to amend a pending task's plan before approval.
- **Why:** §11 REVIEW spec.

### H-B10 (P2) — Push notification delivery

- **What:** Web Push subscription registration + delivery for priority-1 approvals + failures per §12.2.
- **Why:** Async user attention.

### H-B11 (P2) — Backend fact/text sanitisation on task/notification writes

- **What:** Strip `<script>`, `<iframe>`, event-handler attrs from `apex_tasks.title/description`, `apex_notifications.message`.
- **Why:** Defence in depth alongside frontend `_escapeHtml`.

### H-B12 (P3) — Notification subscription preferences per human

- **What:** `apex_notification_preferences` table; per-human category subscriptions and silence windows.
- **Why:** §12 anti-overload rules require user control.

Required schema migrations (NOT created here):
- `migrations/NNN_actions_owner_scope.sql` — add `human_id` to 7 tables + backfill.
- `migrations/NNN_task_evidence_bundle.sql` — extend `apex_agent_tasks` with evidence columns.
- `migrations/NNN_task_lifecycle_columns.sql` — add `cancelled_at`, `deferred_until`, `undone_at`.
- `migrations/NNN_task_feedback.sql` — new `apex_task_feedback` table.
- `migrations/NNN_notification_preferences.sql` — new `apex_notification_preferences` table.

---

## SECTION 28 — PROPOSED IMPLEMENTATION PACKAGES

Frontend-first packages authorised in this phase (no backend changes required; backend-dependent items explicitly gated).

### H-1 (P0) — ACTIONS shell + role gating

- **Purpose:** Establish `#page-actions` as canonical destination. Consolidate `#nav-approvals`/`#nav-agents`/`#nav-activity` into `#nav-actions`. Add role-adapted rendering: Master sees canonical Actions; User sees stub "APEX is preparing your Actions view" until backend gate H-B1 lands (mirrors V-11-G P0-3 pattern).
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** V-11-G shipped (`_escapeHtml`, `setState`, `_apexToast`, `apex-master-only` gate primitives already present).
- **Tests required:** New `playwright-v11h-verify.js` — 6 assertions (nav present, page loads Master, User sees stub, activity/agents/approvals still reachable via hash for backward compat, `A` key routes here).
- **Risks:** Nav consolidation could break hash-based direct links to `#approvals`/`#agents`/`#activity`. Mitigation: hash-alias resolver — `#approvals`, `#agents`, `#activity` all resolve to `#actions` and scroll to the relevant sub-section.
- **Authorisation gates:** None; frontend surface work.

### H-2 (P0) — Canonical approval card (interim evidence)

- **Purpose:** Replace `_loadPendingApprovals` render with §11.2 six-field card (What / Why / Cost / Risk / Reversibility / three actions). Use client-side `_apexActionInfo(task)` heuristic mapping until H-B4 lands. Add `_apexActionIcon`, `_apexActionPriority`.
- **Exact files/components:** `public/dashboard.html` (`_loadPendingApprovals`, new utilities).
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** H-1.
- **Tests required:** 8 assertions (all 6 fields present per card, priority chip present, icon present, plain-language status label absent raw enums).
- **Risks:** Heuristic mapping produces inaccurate cost/risk. Mitigation: label as "Estimated" in copy; H-B4 replaces with authoritative values.
- **Authorisation gates:** None.

### H-3 (P0) — Two-step approval modal upgrade

- **Purpose:** Populate `#apexApprModal` description with actual action detail (currently generic string). Add focus-trap loop. Add ARIA live announce.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** H-2.
- **Tests required:** 4 assertions (modal shows action detail, Tab-loops within modal, screen-reader announcement).
- **Risks:** Focus-trap regression on iOS Safari; mitigation via well-tested pattern.

### H-4 (P0) — 30-second undo banner (SD-3, action-level)

- **Purpose:** After successful `POST /api/tasks/approve`, show a bottom-anchored banner "Approved · Undo" with countdown; final 5 s "Undo — 4s remaining". Wire Undo button to existing `POST /api/tasks/undo`. Skip banner for irreversible tasks (per client-side reversibility classification).
- **Exact files/components:** `public/dashboard.html` (new `_v11hShowUndoBanner`, `_v11hHideUndoBanner`, `_v11hRunUndo`).
- **Frontend/backend scope:** Frontend + uses existing backend `/api/tasks/undo`.
- **Dependencies:** H-2 (for reversibility classification).
- **Tests required:** 5 assertions (banner appears, countdown decrements, click Undo posts, banner disappears after 30 s if no click, no banner for `reversibility='no'`).
- **Risks:** Existing `/api/tasks/undo` reverses only the most recent action, not the whole task — banner claim vs reality gap. Mitigation: banner copy "Undo last change from this task"; task-level undo deferred to backend gate H-B3.

### H-5 (P0) — `setState()` adoption for 9 panels

- **Purpose:** Wrap all ACTIONS panels (pending approvals, recent actions, agent runs, standing approvals, self-check, notifications, live feed, permission-notifications sub-panel, agent capabilities) with `data-apex-state` per V-11-B pattern. Add retry buttons.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** V-11-B universal state architecture (already shipped).
- **Tests required:** 9 assertions (each panel transitions loading → ready/empty/failed with retry).

### H-6 (P0) — XSS escape across ACTIONS renders

- **Purpose:** Apply `_escapeHtml` to `t.task_type`, `t.description`, `t.title`, `n.message`, `r.objective`, `r.type`, `r.task_type`, `a.action_type`, `a.pattern`, `f.name`, `f.description`, `f.stage`.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** H-2, H-5.
- **Tests required:** 3 assertions (inject `<img onerror=alert(1)>` in task description; no execution).

### H-7 (P1) — Rejection reason capture

- **Purpose:** Instead of immediate reject on button click, show a small inline textarea "Optional: tell APEX why (helps it learn)"; post reason to `/api/tasks/reject`.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only (backend already supports optional `reason`).
- **Dependencies:** H-2.
- **Tests required:** 3 assertions.

### H-8 (P1) — Priority chip + urgency sort

- **Purpose:** Add priority chip to each approval card (Critical / Urgent / Important / Standard). Sort list by priority tier then time.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only (heuristic scoring).
- **Dependencies:** H-2.
- **Tests required:** 4 assertions.

### H-9 (P1) — Vocabulary sweep

- **Purpose:** Map raw statuses to plain-language equivalents:
  - `awaiting_approval|pending_approval|approval_required` → "Waiting for your approval"
  - `in_progress` → "APEX is working on this"
  - `completed` → "Done"
  - `failed` → "Couldn't complete"
  - `cancelled` → "Stopped"
  - `rejected` → "You said no"
  - Remove state-model pipeline note (line 10438) — replace with 1-sentence plain-language boundary.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** H-2.
- **Tests required:** 8 assertions (forbidden strings absent from rendered DOM: `AWAITING_APPROVAL`, `APPROVAL REQUIRED`, `IN_PROGRESS`, `PROPOSED → APPROVAL_REQUIRED …`).

### H-10 (P1) — Notifications panel migration

- **Purpose:** Move `#actNotifList` from `#page-activity` (ghost-kept) to new "Notifications" panel on `#page-actions`. Add unread badge inheritance to `#navActionsBadge`.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** H-1.

### H-11 (P1) — Standing approvals + Master feature-approvals sub-panel

- **Purpose:** Bring `#agentStandingList` and (Master-only) `#permissionCards` (from hidden operation page) into `#page-actions` as sub-panels. Read-only for standing approvals; interactive for feature approvals (delegates to existing `POST /api/master/approve`).
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** H-1.

### H-12 (P1) — In-flight progress card

- **Purpose:** Show a "APEX is working on this…" card for every task with `status='in_progress'`. Poll `/api/tasks?limit=20` every 15 s (with V-11-F F-15 polling guard on active page). Display step count from `apex_agent_tasks.steps` where possible.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** H-1, H-5.

### H-13 (P1) — Accessibility pass

- **Purpose:** `aria-label` on all refresh buttons; `aria-busy` on skeleton containers; `role="region"` + `aria-label` on major sections; focus-trap loop on modal (from H-3).
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.

### H-14 (P1) — Keyboard shortcut restoration

- **Purpose:** Revert `A` keyboard shortcut to `switchPage('actions')`. Preserve `V-11-F F-8` shortcut cleanup for numeric keys.
- **Exact files/components:** `public/dashboard.html` (line 15341 region).
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** H-1.
- **Tests required:** 2 assertions (A → actions; existing V-11-F test updated).

### H-15 (P1) — TODAY ACTIONS integration

- **Purpose:** On TODAY (`#page-overview`), "Needs You" section wires to top-3 pending approvals from `/api/tasks?status=pending&limit=3` (or via H-B2 summary endpoint when it lands). Adds "N more in Actions →" cross-nav link when >3 pending.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.
- **Dependencies:** H-1, H-2.

### H-16 (P2) — WebSocket subscription bridge

- **Purpose:** `_apexActionsWsBridge` binds to `_actWs`/`GL.ws`. Listens for `task.*`, `notification.*`, `standing_approval.matched`. Refreshes only the active page. Dormant until H-B5 backend emits events.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only (backend gate H-B5 for events).

### H-17 (P2) — Desktop multi-column layout

- **Purpose:** At ≥1024 px, split ACTIONS into 2 columns (Pending Approvals + In-flight left; Recent Actions + Notifications + Standing right). At ≥1280 px, add a right rail with agent-run mini-log.
- **Exact files/components:** `public/dashboard.html` (CSS grammar).
- **Frontend/backend scope:** Frontend only.

### H-18 (P2) — Hash-alias resolver + swipe sequence update

- **Purpose:** `#approvals`, `#agents`, `#activity` all resolve to `#actions` with scrollIntoView on the relevant sub-section. `pages` array updated so `actions` sits after `intelligence` in the swipe sequence.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.

### H-19 (P3) — Mobile approval swipe-to-approve

- **Purpose:** Bottom-sheet detail on tap; swipe-left-to-reveal Approve/Reject; haptic on confirm.
- **Exact files/components:** `public/dashboard.html`.
- **Frontend/backend scope:** Frontend only.

### H-20 (P3) — Day-grouped recent actions

- **Purpose:** Group Recent Actions by date ("Today", "Yesterday", "Wed 27 Aug").

---

## SECTION 29 — RISKS

1. **Breaking hash-based direct links** to `#approvals`/`#agents`/`#activity`. Mitigation: hash-alias resolver in H-18.
2. **`A` keyboard shortcut regression** — V-11-F F-7 tests expect `A` → business. V-11-H reverts to canonical ACTIONS. Mitigation: co-ordinated test update in `playwright-v11f-verify.js`.
3. **`pollPermissions` still fires on hidden `#page-operation`** — will migrate into ACTIONS in H-11. Risk: two poll timers overlap during transition. Mitigation: single-owner poll pattern.
4. **Client-side cost/risk heuristic (H-2 interim)** produces incorrect values for exotic task types. Mitigation: label as "Estimated" until H-B4.
5. **Undo banner claims (H-4) exceed current backend capability** (`/api/tasks/undo` is action-level). Mitigation: banner copy explicitly says "last change"; task-level undo deferred to H-B3.
6. **User role sees empty ACTIONS** until H-B1 lands. Mitigation: informative stub matches V-11-G-P0-3 precedent.
7. **XSS defence (H-6) missing on legacy `pollPermissions` render** — if `#permissionCards` migrates as-is, escape must be applied. Mitigation: touch during H-11.
8. **WebSocket bridge (H-16) inert until H-B5** — no immediate benefit; regression risk zero.
9. **`_apexApprModal` z-index (401) conflicts** — verify against any other modal/overlay z-index (V-11-E toast at ~9999). No known conflict, but check.
10. **`_loadRecentActions` and `_loadPendingApprovals` both call `/api/tasks`** — 2 identical requests per refresh. Mitigation: shared `cachedFetch` in H-1 or H-5.

---

## SECTION 30 — DEPENDENCIES

- **Upstream (must remain green):** V-11-A shell (28/28), V-11-B universal state (29/29), V-11-D1 TODAY navigation (45/45), V-11-D2 TODAY default+hash (37/37), V-11-E COMMAND (70/70), V-11-F LIFE & WORK (55/55), V-11-G INTELLIGENCE (34/34). Total 298/298 must remain green post-H.
- **Downstream:** V-11-I (Global Voice Trigger) — voice overlay approval actioning inherits from H-2 approval card renderer.
- **Backend gates:** All H-B* items are DEFERRED to separate backend PRs.
- **External:** None. No new dependencies on external services.
- **Schema:** No schema changes in this phase.

---

## SECTION 31 — TEST STRATEGY

New Playwright suite `playwright-v11h-verify.js` — proposed assertion coverage:

| Package | Assertions | Focus |
|---|---|---|
| H-1 | 6 | Nav consolidation, role gating, backward-compat hash |
| H-2 | 8 | Canonical approval card fields, priority chip, icon, plain-language status |
| H-3 | 4 | Modal detail, focus-trap, ARIA announce |
| H-4 | 5 | Undo banner, countdown, click posts, disappearance, irreversible skip |
| H-5 | 9 | setState per panel with retry |
| H-6 | 3 | XSS injection blocked in card renders |
| H-7 | 3 | Rejection reason capture |
| H-8 | 4 | Priority chip + sort order |
| H-9 | 8 | Forbidden raw enums absent from DOM |
| H-10 | 3 | Notifications panel on ACTIONS |
| H-11 | 4 | Standing approvals + Master permissions sub-panel |
| H-12 | 3 | In-flight progress card |
| H-13 | 5 | Accessibility (aria-label, aria-busy, region, focus-trap) |
| H-14 | 2 | Keyboard shortcut restoration |
| H-15 | 3 | TODAY Needs You integration + overflow link |
| H-16 | 2 | WS bridge subscribes and ignores unknown events |
| H-17 | 4 | Desktop 2-col layout at 1024 / 3-col at 1280 |
| H-18 | 3 | Hash-alias resolver |
| REG | 6 | Prior V-11-A..G smoke: TODAY renders, COMMAND renders, Intelligence renders, Memory renders, Knowledge renders, no console errors on ACTIONS entry |

**Total proposed:** ~85 new assertions. Cumulative post-V-11-H: **~383 assertions across V-11-A through V-11-H.**

**Manual regression checklist:**
- Master smoke: `A` → ACTIONS; pending approvals card renders 6 fields; approve → undo banner; reject → reason input; refresh works; hash `#approvals` still routes to ACTIONS.
- User smoke: `A` → ACTIONS; stub message shown; no Master content leaks; no 500s.
- Cross-page smoke: TODAY Needs You updates on approval; COMMAND inline approval card unchanged (V-11-E preserved); INTELLIGENCE opportunities unaffected.
- WS smoke: force-disconnect; card list stays; no ghost updates.
- XSS smoke: insert `<img src=x onerror=alert(1)>` in dev task title; confirm no execution.
- Accessibility smoke: keyboard-only navigation through pending approval → Confirm → focus returns after modal close.

---

## SECTION 32 — RECOMMENDED IMPLEMENTATION ORDER

1. **H-1** (shell + role gating) — foundation.
2. **H-5** (setState adoption on legacy renders BEFORE canonical card work) — establishes state contract.
3. **H-9** (vocabulary sweep before H-2 to avoid re-work).
4. **H-2** (canonical approval card).
5. **H-6** (XSS escape — must land alongside H-2 to avoid shipping unescaped renders).
6. **H-3** (modal upgrade).
7. **H-4** (undo banner) — requires H-2 reversibility classification.
8. **H-7** (rejection reason).
9. **H-8** (priority chip + sort).
10. **H-10** (notifications panel).
11. **H-11** (standing + Master permissions).
12. **H-12** (in-flight progress).
13. **H-13** (accessibility pass).
14. **H-14** (keyboard shortcut restore).
15. **H-15** (TODAY integration).
16. **H-18** (hash-alias resolver).
17. **H-17** (desktop multi-column).
18. **H-16** (WS bridge) — last; dormant.
19. **H-19, H-20** — polish, defer to follow-up if scope pressure.

---

## SECTION 33 — FILES EXPECTED TO CHANGE

- `public/dashboard.html` — sole application file to be edited during V-11-H.
- `playwright-v11h-verify.js` — new test suite.
- `playwright-v11h-results.json` — test artefact.
- `docs/interface/V-11-H-IMPLEMENTATION-CERTIFICATION.md` — post-implementation.
- `playwright-v11f-verify.js` — coordinated 1-line update to the `A`-key assertion (per H-14, mirrors V-11-D1/D2 pattern).

Backend files that MAY be touched for authorised follow-up (not V-11-H):
- `src/routes/tasks.js` — for H-B1 owner scoping and H-B2 summary endpoint.
- `src/routes/notifications.js` — for H-B1 owner scoping.
- `src/routes/agent-tasks.js` — for H-B1 owner scoping.
- `src/routes/master.js` — for role-scope tightening.
- `routes/intelligence.js` — for `agent-runs` owner scoping.
- `src/routes/telemetry/index.js` — for `/api/timeline` owner scoping.
- `lib/agent-task-cycle.js` — for H-B5 WS emission and H-B3 task-level undo.
- `lib/middleware.js` — for `_requireOwnerScope(resourceType)` middleware.
- `migrations/` — for H-B1 schema migration + H-B3/H-B4/H-B7/H-B8 supporting columns.

**Files NOT changed in V-11-H:** `server.js`, all `routes/*.js` (except future authorised backend PR), all `lib/*` (except future), any database schema, any environment variables.

---

## SECTION 34 — EXPLICIT NON-GOALS

- **Not implementing full server-side task-level undo (H-B3).** Client banner exercises action-level undo only.
- **Not creating any new backend route in V-11-H.**
- **Not modifying any database schema in V-11-H.**
- **Not shipping personal per-User pending-approval feed** until H-B1 lands.
- **Not deleting `#page-operation`, `#page-approvals`, `#page-agents`, or `#page-activity` DOMs.** Ghost-keep per V-11-F F-7 pattern.
- **Not implementing WebSocket push (backend emission)** — H-B5 gated.
- **Not implementing standing-approval CRUD UI** (read-only per O-6).
- **Not implementing feedback loop backend (H-B8).**
- **Not implementing "Modify" / "Defer" affordances** (H-B7/H-B9 gated).
- **Not implementing push notifications (H-B10).**
- **Not modifying `applyRoleProfile()`, `_bootIdentity()`, `setState()` internals, `switchPage()` internals.**
- **Not touching COMMAND thread inline approval-card behaviour** (V-11-E E-9 preserved verbatim).
- **Not modifying V-11-G Intelligence surfaces.**
- **Not modifying `AUTONOMY_LEVEL` behaviour, standing-approval matching, or governance policy evaluation.**
- **Not touching `/api/tasks/undo` route contract** — banner consumes existing endpoint.
- **Not producing any migration file.**
- **Not creating any git commit.**
- **Not pushing or deploying.**

---

## SECTION 35 — PRODUCTION IMPACT ASSESSMENT

- **Production commit:** UNCHANGED (`dd1dd1f`).
- **V-11-G commit:** UNCHANGED (`e464d8b`).
- **Runtime risk on deploy of V-11-H frontend:** LOW. Only `public/dashboard.html` changes; static file. No route registration changes; no schema; no env vars.
- **Cache invalidation:** Users must hard-refresh to receive new dashboard.html. Standard cache-bust on deploy.
- **Rollback strategy:** `git revert` of V-11-H commit restores V-11-G-close state. Each package (H-1..H-20) is bounded within `public/dashboard.html` and can be selectively reverted.
- **Data risk:** ZERO. No schema changes, no writes, no deletions.
- **Behavioural risk:** Master users will notice the new ACTIONS surface at first navigation. Existing `#page-approvals`/`#page-agents`/`#page-activity` still resolve via hash alias. Test-suite full regression required.
- **Backend deploy risk:** ZERO in V-11-H phase (no backend edits). Backend gates H-B1..H-B12 require separate authorisation.

---

## SECTION 36 — FINAL READINESS ASSESSMENT

**Reconnaissance completeness:** All 36 required sections authored. All 15 authority questions answered. All 8 lifecycle stages evaluated. All 4 existing surfaces catalogued. Backend inventory of ~60 relevant endpoints across 9 route files complete.

**Readiness for implementation authorisation:**

| Aspect | Verdict |
|---|---|
| Scope bounded | YES — H-1..H-20 all frontend-only in `public/dashboard.html` |
| P0 items enumerated | YES — 6 P0 findings, 5 addressable frontend-only + P0-2/P0-3 requiring backend gate |
| Backend gates identified | YES — 12 gates enumerated (H-B1..H-B12) with rationale and required migrations |
| Owner decisions surfaced | YES — 15 open decisions (O-1..O-15) with recommendations, all resolvable without user authority |
| Test plan defined | YES — ~85 new assertions + 298 regression assertions |
| Non-goals explicit | YES — 15 non-goals documented |
| Rollback simple | YES — single file revert |
| Production impact | YES — zero-risk frontend-only deploy |
| Predecessor state | GREEN — V-11-G certified 298/298 |

**Explicit blockers for a full-fidelity ACTIONS ship:**
- Backend gate H-B1 (owner scoping migration + middleware) is a P0 correctness dependency for User-role functionality.
- Backend gate H-B2 (`/api/actions/summary`) is a P0 performance dependency for badge counts.
- Backend gate H-B3 (task-level undo) is required to honour the SD-3 undo banner claim for multi-step tasks.

**Recommendation:** V-11-H frontend package (H-1..H-20, or subset) may proceed under implementation authorisation. Backend gates H-B1..H-B3 require separate concurrent authorisation to unlock full V-11-H acceptance; V-11-H may certify against a "Master-only interim + User stub" acceptance ceiling until backend gates land, mirroring the V-11-G-P0-3 precedent.

---

## END OF RECONNAISSANCE

Application code changed: NO
Backend code changed: NO
Database changed: NO
Production changed: NO — remains `dd1dd1f`
V-11-G commit remains: `e464d8b`
Sole artefact produced: this document
