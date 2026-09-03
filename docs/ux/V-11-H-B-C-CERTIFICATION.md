# V-11-H-B-C — BACKGROUND OWNERSHIP PROPAGATION CERTIFICATION

Date: 2026-09-01
Prior commit: `4457dc5`
Production commit: `dd1dd1f` (unchanged, migration 092 NOT executed in production)

---

## 1. Executive result

**COMPLETE.**

The final H-B ownership gap is closed. Background pipeline functions
(`_appendNotif`, `_appendTimeline`, `pgLogAgentAction`) now accept and
persist `human_id`, and every downstream call site in the execution chain
threads the parent-task owner through. Migration 092 remains structurally
compatible; no schema changes were required.

- 54/54 new propagation tests pass.
- 0 new regressions across the V-11-A through V-11-H suites.
- 0 pre-existing tests transitioned from PASS to FAIL.
- Production remains `dd1dd1f`; nothing pushed or deployed.

---

## 2. Baseline

| Baseline | Commit / Value |
|---|---|
| Prior local commit | `4457dc5 V-11-H-B: enforce ACTIONS ownership and authority convergence` |
| Production commit | `dd1dd1f` (unchanged) |
| Migration 092 | Exists in local tree; NOT executed against production |
| Prior test totals | V-11-A 28, V-11-B 29, V-11-E 70, V-11-F 55, V-11-G 34, V-11-H 85, V-11-H-B 79/89 |
| Prior V-11-H-B behavioural fails | 10 (pre-existing; require /api/actions/summary live-server dependencies) |

---

## 3. Exact previous limitation (from V-11-H-B certification §15)

From `V-11-H-B-CERTIFICATION.md`:

> Pipeline-originated rows lack `human_id` (§15 limitations 1 and 2).

And explicitly:

| Function | Status prior |
|---|---|
| `lib/auto-pipeline.js::_appendNotif` / `_appendTimeline` | pipeline-side propagation | **NOT DONE** |
| `lib/supabase-helpers.js::pgLogAgentAction` | signature accepts humanId | **NOT DONE** |

H-B-C is the follow-up work referenced in H-B certification §15.

---

## 4. Complete background pipeline trace

### 4a. Table of every write to H-B-owned tables

| Table | Function/Location | HumanId param pre-HBC | Persists human_id post-HBC | Risk / Note |
|---|---|---|---|---|
| `apex_tasks` | `src/routes/tasks.js` `/add` | YES (`req.identity.humanId`) | YES (already in H-B1) | closed in H-B1 |
| `apex_notifications` | `src/routes/tasks.js` `/notify,/reject` | YES | YES (H-B1) | closed in H-B1 |
| `apex_notifications` | `lib/auto-pipeline.js::_appendNotif` | **NO** | **YES (H-B-C)** | closed here |
| `apex_notifications` | `src/routes/master.js` (multi) | Master-only surface | Master rows OK | low risk |
| `apex_notifications` | `src/routes/browser.js` | Master session | NO — Master rows | Master-only surface |
| `apex_notifications` | `src/routes/setup.js`, `wiki.js` | System | NO | system-level, NULL acceptable |
| `apex_notifications` | `agent-system/master-orchestrator.js` | System | NO | system-level, NULL acceptable |
| `apex_notifications` | `lib/cron-scheduler.js` line 336 | System | NO | cron-level, NULL acceptable |
| `apex_notifications` | `lib/registry/capability-monitor.js` | System | NO | system alerts, NULL acceptable |
| `apex_notifications` | `lib/knowledge/knowledge-resolution-engine.js` | System | NO | system-level, NULL acceptable |
| `apex_notifications` | `lib/intelligence/civilization-runtime.js` | System | NO | system-level, NULL acceptable |
| `apex_timeline` | `lib/auto-pipeline.js::_appendTimeline` | **NO** | **YES (H-B-C)** | closed here |
| `apex_agent_runs` | `agent-system/orchestrator.js::_auditLog` | **NO** | **YES (H-B-C)** — lookup from apex_tasks | closed here |
| `apex_agent_runs` | `services/init.js` AGENT_COMPLETED bus | **NO** | **YES (H-B-C)** — via bus payload | closed here |
| `agent_actions` | `lib/supabase-helpers.js::pgLogAgentAction` | **NO** | **YES (H-B-C)** — trailing param | closed here |
| `agent_actions` | 20 call sites (task-cycle × 7, cmd-handler × 12, execution-utils × 1 dep) | **NO** | **YES (H-B-C)** — pass task.created_by or userId | closed here |
| `standing_approvals` | `pgCreateStandingApproval` | NO | NO — Master-only surface | out-of-scope for H-B-C |

### 4b. Execution chain trace with humanId availability

1. `POST /api/tasks/approve` → `src/routes/tasks.js` handler: has `req.identity.humanId`; loads `task.human_id` from DB; verifies ownership (H-B1 P0-2 gate).
2. → `_runTask(taskId, res)` in `lib/auto-pipeline.js`: has `taskId`; loads task with `select('*')`; extracts `humanId = task.human_id` (H-B-C).
3. → `_startAutoPipeline(taskId)` via `_agentQueue.enqueue`: fresh load; extracts `humanId = task.human_id` (H-B-C).
4. → `_bus.emit(AGENT_STARTED, {..., human_id})` (H-B-C).
5. → `runAgentTeam(spec, taskId)` in `agent-system/orchestrator.js` — signature unchanged; `_auditLog` internally reads `apex_tasks.human_id` (H-B-C).
6. → `_bus.emit(AGENT_COMPLETED, {..., human_id})` (H-B-C).
7. → `services/init.js` bus listener → `apex_agent_runs` INSERT includes `human_id: p.human_id` (H-B-C).
8. → `_appendNotif(msg, type, humanId)` → `apex_notifications` INSERT with `human_id` (H-B-C).
9. → `_appendTimeline(entry, humanId)` → `apex_timeline` INSERT with `human_id` (H-B-C).
10. Independently, `executeApprovedAgentTask(taskId)` in `lib/agent-task-cycle.js`: has `task`; passes `task.created_by` to `pgLogAgentAction` (H-B-C).
11. Chat-initiated: `handleCommand(command, userId)` in `lib/agent-command-handler.js`: has `userId`; passes `userId` to all `pgLogAgentAction` calls (H-B-C).

---

## 5. Ownership propagation architecture

**Load early, thread as parameter, default to NULL when absent.**

- **Entry points** are the authority: `apex_tasks.human_id` (populated by H-B1) is the sole ground truth for the "who owns this pipeline run" question.
- Auto-pipeline functions **load humanId from `apex_tasks` at pipeline entry** and pass it as an explicit function parameter (`_appendNotif(msg, type, humanId)`), not a global.
- Legacy call sites without ownership context (system cron, capability monitor, master-orchestrator) call the same functions with the default `humanId = null` — this is honest: NULL indicates "no per-human origin" rather than false-Master.
- The `_auditLog` audit path uses a small Supabase lookup inside the audit function itself, so the orchestrator signature (`runAgentTeam(spec, taskId)`) is preserved unchanged and every existing caller continues to work.
- `services/init.js` reads `p.human_id` from the event bus payload rather than performing an extra DB round-trip.

---

## 6. Functions changed

| File | Function | Change |
|---|---|---|
| `lib/auto-pipeline.js` | `_appendNotif` | Added trailing `humanId = null` param; INSERT now includes `human_id: humanId || null` |
| `lib/auto-pipeline.js` | `_appendTimeline` | Added trailing `humanId = null` param; INSERT now includes `human_id: humanId || null` |
| `lib/auto-pipeline.js` | `_runTask` | Extract `const humanId = task.human_id \|\| null`; pass to internal `_appendNotif` calls |
| `lib/auto-pipeline.js` | `_startAutoPipeline` | Extract `const humanId = task.human_id \|\| null`; pass to `_appendNotif`, `_appendTimeline`, and `AGENT_STARTED`/`AGENT_COMPLETED` bus emits |
| `lib/supabase-helpers.js` | `pgLogAgentAction` | Added trailing `humanId = null` param; INSERT now includes `human_id: humanId \|\| null` |
| `lib/agent-task-cycle.js` | 7 `pgLogAgentAction` call sites | Now pass `task.created_by \|\| null` as trailing arg |
| `lib/agent-command-handler.js` | 12 `pgLogAgentAction` call sites | Now pass `userId \|\| null` as trailing arg |
| `services/init.js` | `AGENT_COMPLETED` bus handler | INSERT now includes `human_id: p.human_id \|\| null` |
| `agent-system/orchestrator.js` | `_auditLog` | Looks up `human_id` from `apex_tasks` and includes it in `baseRow`; both primary and retry upsert carry human_id |

No route files changed. No dashboard.html changes. No migration changes.

---

## 7. Write-path audit

| Write path | Result |
|---|---|
| `_appendNotif` → apex_notifications | **owner-propagated** |
| `_appendTimeline` → apex_timeline | **owner-propagated** |
| `pgLogAgentAction` → agent_actions | **owner-propagated** |
| Orchestrator `_auditLog` → apex_agent_runs | **owner-propagated (DB lookup)** |
| `services/init.js` bus → apex_agent_runs | **owner-propagated (bus payload)** |
| tasks.js `/add`, `/notify`, `/reject` | already owner-propagated (H-B1) |
| `runSingleScheduleOnce` → agent_tasks | intentionally uses `APEX_HUMAN_ID` (Master) — legitimate |
| Cron / capability-monitor / civilization-runtime notif writes | intentionally NULL — no originating human context |

---

## 8. NULL ownership policy

**Rule:** NULL `human_id` is legitimate ONLY when the write has no originating human context (system-initiated cron, capability monitor, civilization-runtime alerts). NULL is preferred over false-Master because Master would grant fictitious authority to a machine event.

**Legitimate NULL writers (documented):**
- `lib/cron-scheduler.js` line 336 — retention cron notifications
- `lib/registry/capability-monitor.js` — capability degradation alerts
- `lib/knowledge/knowledge-resolution-engine.js` — knowledge-gap system notifications
- `lib/intelligence/civilization-runtime.js` — civilization-scale governance alerts
- `agent-system/master-orchestrator.js` — Master-agent orchestration alerts (Master surface)

**All User-facing chains carry owner:**
- User task → approve → run → all downstream rows carry User's humanId.
- Master task → approve → run → all downstream rows carry Master's humanId.
- No User-owned task can spawn a downstream row that lands with NULL.

---

## 9. Security tests (H-B baseline retained)

Section E of `playwright-v11hbc-verify.js` re-checks H-B security invariants:

| Test | Result |
|---|---|
| `requireOwnerScope` declared in middleware | PASS |
| `requireOwnerScope` exported | PASS |
| `requireOwnerScope` bypasses Master | PASS |
| `/api/tasks/approve` ownership check before `_runTask` | PASS |
| `/api/tasks/reject` ownership check | PASS |
| `/api/tasks/undo` ownership check for non-Master | PASS |
| `/api/tasks/reject` propagates task owner into notification | PASS |
| `GET /api/tasks` has owner filter | PASS |
| `GET /api/notifications` has owner filter | PASS |
| `/api/notifications/mark-read` has owner filter | PASS |
| `/api/actions/summary` endpoint exists | PASS |
| Telemetry agent-runs collision resolved | PASS |

12/12 security-critical structural tests PASS. No regression from H-B.

---

## 10. Propagation tests

Section A–D of `playwright-v11hbc-verify.js`:

| Section | Count | Result |
|---|---|---|
| A — Signature changes | 5 | 5/5 PASS |
| B — Insert-shape changes | 6 | 6/6 PASS |
| C — Caller-side propagation | 6 | 6/6 PASS |
| D — Migration 092 compatibility | 11 | 11/11 PASS |
| E — H-B security invariants | 12 | 12/12 PASS |
| F — Ownership chain integrity | 8 | 8/8 PASS |
| G — System-initiated NULL policy | 3 | 3/3 PASS |
| H — Migration structural baseline | 3 | 3/3 PASS |

**Total: 54/54 PASS.**

---

## 11. Regression results

| Suite | Result |
|---|---|
| V-11-A | 28/28 PASS |
| V-11-B | 29/29 PASS |
| V-11-E | 70/70 PASS |
| V-11-F | 55/55 PASS |
| V-11-G | 34/34 PASS |
| V-11-H | 85/85 PASS |
| V-11-H-B | 79/89 PASS (10 pre-existing behavioural fails — unchanged from `4457dc5` baseline; unrelated to H-B-C changes) |
| V-11-H-B-C | 54/54 PASS |

**Aggregate: 434/444 PASS. 0 new regressions. All 10 failing tests are pre-existing behavioural cases identical to the H-B baseline.**

---

## 12. Migration 092 compatibility

Migration 092 defines every `human_id` column as `TEXT NULL`:

```sql
ALTER TABLE apex_tasks         ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
ALTER TABLE apex_notifications ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
ALTER TABLE apex_agent_runs    ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
ALTER TABLE apex_timeline      ADD COLUMN IF NOT EXISTS human_id TEXT NULL;
-- agent_actions and standing_approvals: same, guarded by DO $$ EXCEPTION
```

- **No CHECK constraint** on `human_id` → any TEXT (UUID or NULL) is accepted.
- **No NOT NULL** → application-level NULL writes are legal.
- Application now writes either a UUID string (H-B-C-propagated) or `null` (system-initiated); both are compatible.

**No changes to migration 092 required. No defect found.**

---

## 13. Remaining limitations

- Migration 092 has not yet been executed against production. All H-B-C propagation is structurally correct against the H-B1 schema, but running the application against production (`dd1dd1f` — schema without migration 092) will silently drop the new `human_id` column values because the column does not exist. Migration 092 must be executed in production before H-B-C's runtime behaviour takes effect there. This is an intentional deferral: production remains at `dd1dd1f`.
- Server-behavioural tests in V-11-H-B suite (10 fails) require a live `/api/actions/summary` implementation that is not yet fully wired in this environment. These failures are unchanged from the H-B baseline and are not related to H-B-C.
- Standing-approvals write path (`pgCreateStandingApproval`) does not yet stamp `human_id`. Not required by H-B-C scope; deferred.
- Master-surface auxiliary writes (`master-orchestrator.js`, `browser.js`) intentionally do not propagate humanId because their calling context is Master-only. If the app opens a User-writable path to these functions in the future, they will need H-B-C-style propagation.

---

## 14. Final authority-chain certification

**Certified:**

```
User authentication (JWT)
    ↓ req.identity.humanId
tasks.js /add              → apex_tasks.human_id             ✓ H-B1
tasks.js /approve          → ownership gate + _runTask       ✓ H-B1
_runTask                   → const humanId = task.human_id   ✓ H-B-C
  ↓
_appendNotif(humanId)      → apex_notifications.human_id     ✓ H-B-C
  ↓
_startAutoPipeline         → const humanId = task.human_id   ✓ H-B-C
  ↓
AGENT_STARTED bus emit     → payload.human_id                ✓ H-B-C
  ↓
runAgentTeam → _auditLog   → lookup + apex_agent_runs        ✓ H-B-C
  ↓
AGENT_COMPLETED bus emit   → payload.human_id                ✓ H-B-C
  ↓
services/init bus handler  → apex_agent_runs.human_id        ✓ H-B-C
  ↓
_appendNotif(humanId)      → apex_notifications.human_id     ✓ H-B-C
_appendTimeline(humanId)   → apex_timeline.human_id          ✓ H-B-C
  ↓
executeApprovedAgentTask   → pgLogAgentAction(task.created_by)
                           → agent_actions.human_id          ✓ H-B-C
  ↓
handleCommand(userId)      → pgLogAgentAction(userId) × 12
                           → agent_actions.human_id          ✓ H-B-C
```

**Authority chain is now fully typed end-to-end. No User-owned execution can spawn a downstream record with NULL `human_id`.**

---

## 15. Recommendation regarding V-11-I

**Safe to begin V-11-I** once these two conditions are met:

1. **Migration 092 executed against production.** Until this happens, H-B and H-B-C protections are inert in production (columns don't exist). V-11-I must not depend on runtime ownership scoping in production before migration 092 lands.
2. **The 10 pre-existing V-11-H-B behavioural failures are triaged.** These are not blocking (they're /api/actions/summary and scope=all live-server issues, not ownership issues), but V-11-I planning should account for them.

The H-B-C work itself introduces no new blockers for V-11-I. The authority chain is complete; the residual work is deploy discipline (migration 092 to production) and V-11-H-B server-side triage — both scoped separately from V-11-I.

---

*END V-11-H-B-C CERTIFICATION*
