# V-11-H IMPLEMENTATION CERTIFICATION
## ACTIONS Experience Convergence

Date: 2026-09-01
Predecessor: V-11-G at commit `e464d8b`
Production: UNCHANGED (`dd1dd1f`)
Backend files changed: NONE
Schema files changed: NONE
Migration files created: NONE

---

## SECTION 1 — EXECUTIVE SUMMARY

V-11-H consolidates the four fragmented ACTIONS-cluster surfaces (`#page-approvals`, `#page-agents`, `#page-activity`, hidden `#page-operation`) into a single canonical `#page-actions` destination, per V-11 §7.5 and the V-11-H reconnaissance (§32 order). All frontend-only packages H-1 through H-18 are SHIPPED. Two P3 polish packages (H-19 mobile swipe, H-20 day-grouped recent) are DEFERRED. Twelve backend gates (H-B1..H-B12) are DEFERRED to separate authorised backend PRs.

The new surface implements the §11.2 canonical approval card (What / Why / Cost / Risk / Reversibility / three actions), the SD-3 30-second undo banner, priority classification and sort, rejection reason capture, master-only feature-approval and standing-approval sub-panels, an in-flight progress card, notifications migration, live-feed and self-check subsections, WebSocket subscription bridge (dormant until H-B5), hash-alias backwards compatibility (`#approvals` / `#agents` / `#activity` → `#actions`), and a two-column / three-column desktop layout.

Test coverage: `playwright-v11h-verify.js` — **85 assertions across H-1..H-18 + REG. 85 PASS / 0 FAIL.**

Regression: V-11-B (29/29), V-11-D2 (37/37), V-11-E (70/70), V-11-F (55/55), V-11-G (34/34) all green. V-11-A (27/28 — 1 legitimate regression from nav consolidation) and V-11-D1 (43/45 — 2 legitimate regressions from same) show only expected consequence-of-consolidation failures and are documented in Section 26.

---

## SECTION 2 — H-1 THROUGH H-20 STATUS TABLE

| ID   | Purpose                                                | Status   | Notes |
|------|--------------------------------------------------------|----------|-------|
| H-1  | ACTIONS shell + role gating                            | SHIPPED  | `#page-actions` created; nav consolidated; hash-alias resolver; User stub. |
| H-2  | Canonical approval card (interim evidence)             | SHIPPED  | 6-field card via `_apexActionInfo`/`_apexActionIcon`/`_apexActionPriority`. |
| H-3  | Two-step approval modal upgrade                        | SHIPPED  | Detail body + focus-trap + `aria-live=assertive` + Escape. |
| H-4  | 30-second undo banner (SD-3)                           | SHIPPED  | Countdown, urgent red at ≤5s, skip when reversibility=no. |
| H-5  | `setState()` adoption for 9 panels                     | SHIPPED  | All 9 panels carry `data-apex-state`; retry buttons on failed. |
| H-6  | XSS escape across ACTIONS renders                      | SHIPPED  | `_actnEscape` at every innerHTML insertion. |
| H-7  | Rejection reason capture                               | SHIPPED  | Inline textarea (280-char) + Confirm/Cancel. |
| H-8  | Priority chip + urgency sort                           | SHIPPED  | Critical/Urgent/Important/Standard; sort by tier then created_at desc. |
| H-9  | Vocabulary sweep                                       | SHIPPED  | `_apexActionStatus`; state-model pipeline note replaced. |
| H-10 | Notifications panel migration                          | SHIPPED  | `#actnNotifPanel` on ACTIONS; unread feeds `#navActionsBadge`. |
| H-11 | Standing approvals + Master feature-approvals          | SHIPPED  | Read-only standing (O-6); Master-only feature-approvals via `/api/master/approve`. |
| H-12 | In-flight progress card                                | SHIPPED  | Poll every 15s via `window.activePage` guard. |
| H-13 | Accessibility pass                                     | SHIPPED  | `aria-label`, `aria-busy`, `role=region` on each panel; focus-trap in H-3. |
| H-14 | Keyboard shortcut restoration                          | SHIPPED  | `A` → `switchPage('actions')`; V-11-F test-suite update noted below. |
| H-15 | TODAY ACTIONS integration                              | SHIPPED  | Top-3 pending on `#page-overview`; overflow link; caught-up message. |
| H-16 | WebSocket subscription bridge                          | SHIPPED  | `_apexActionsWsBridge` dormant subscriber; awaits H-B5 emission. |
| H-17 | Desktop multi-column layout                            | SHIPPED  | 1024px = 2-col; 1280px = 3-col; ≤767px stacked. |
| H-18 | Hash-alias resolver + swipe sequence                   | SHIPPED  | `#approvals`/`#agents`/`#activity` → `#actions`; `pages` order updated. |
| H-19 | Mobile approval swipe-to-approve                       | DEFERRED | P3 polish per §32; deferred to a follow-up frontend PR. |
| H-20 | Day-grouped recent actions                             | DEFERRED | P3 polish per §32; deferred to a follow-up frontend PR. |

---

## SECTION 3 — SIX P0 RESOLUTION TABLE

| ID   | Finding                                                                 | Resolution in V-11-H |
|------|-------------------------------------------------------------------------|-----------------------|
| P0-1 | ACTIONS unreachable to User role                                        | Canonical `#page-actions` is role-adapted: User sees a stub ("APEX is preparing your Actions view — available once your account is fully activated."), Master sees full surface. |
| P0-2 | `/api/tasks/approve` and `/api/tasks/reject` accept ANY task id         | DEFERRED — backend gate H-B1 (owner-scope middleware + `human_id` migration) is required. Frontend applies role gating and User stub to prevent User-side interaction. |
| P0-3 | `/api/tasks`, `/api/timeline`, `/api/notifications`, `/api/intelligence/agent-runs` return all rows | DEFERRED — H-B1 gate required. Frontend does not display these to User. |
| P0-4 | No `/api/actions/summary` endpoint                                      | DEFERRED — H-B2 gate. Frontend continues to derive badge count via `/api/tasks` filter (as before), + notifications unread additive. |
| P0-5 | `apex-master-only` DOM gate is CSS-only, not backend                    | DOCUMENTED — CSS gate remains; backend enforcement gated by H-B1. V-11-H spec matches V-11-G-P0-3 precedent (interim client-side gating). |
| P0-6 | No undo banner post-approval                                            | RESOLVED — H-4 ships the SD-3 30s banner (action-level, per O-3). Task-level undo remains H-B3. |

---

## SECTION 4 — H-B1 THROUGH H-B12 STATUS

All twelve backend gates remain UNIMPLEMENTED in V-11-H phase (frontend-only scope, per §34 non-goals). Each requires a separate authorised backend PR with associated schema migration where marked.

| ID    | Purpose                                                            | Migration required | Status |
|-------|--------------------------------------------------------------------|--------------------|--------|
| H-B1  | Per-User owner scoping middleware + schema `human_id` migration    | YES                | DEFERRED |
| H-B2  | `GET /api/actions/summary` endpoint (badge count aggregator)       | NO                 | DEFERRED |
| H-B3  | Task-level `POST /api/tasks/:id/undo` (compensating operations)    | Partial (lifecycle columns) | DEFERRED |
| H-B4  | Approval-card evidence bundle (server-computed cost/risk/reversibility) | YES            | DEFERRED |
| H-B5  | WS push for `task.*` / `notification.new` / `standing_approval.matched` | NO             | DEFERRED |
| H-B6  | `POST /api/tasks/:id/cancel` (in-flight cancellation)              | Partial (lifecycle columns) | DEFERRED |
| H-B7  | `POST /api/tasks/:id/defer`                                        | Partial (lifecycle columns) | DEFERRED |
| H-B8  | `POST /api/tasks/:id/feedback`                                     | YES                | DEFERRED |
| H-B9  | `POST /api/tasks/:id/modify`                                       | NO                 | DEFERRED |
| H-B10 | Web Push notification delivery                                     | NO                 | DEFERRED |
| H-B11 | Backend task/notification text sanitisation                        | NO                 | DEFERRED |
| H-B12 | Notification subscription preferences                              | YES                | DEFERRED |

N/A for this frontend-only phase: all H-B* items require backend PR authorisation not granted here.

---

## SECTION 5 — AUTHORITY VERIFICATION

- Master identity path unchanged (`_bootIdentity` → `/api/me` → `applyRoleProfile('master'|'user')`).
- ACTIONS surface split via body-class check (`document.body.classList.contains('apex-role-master')`).
- V-11-H introduces a re-init hook: when `applyRoleProfile` fires with the active page = `actions`, `actionsInitPage()` re-runs to apply the correct branch.
- Master sees: pending, in-flight, recent, notifications, runs, standing, feature-approvals, self-check, live-feed, capabilities.
- User sees: single stub panel.
- Approve/Reject buttons for User are not rendered (surface hidden).
- Standing-approval and Master feature-approval sub-panels bear `apex-master-only` class → hidden for User via CSS.
- Backend enforcement of authority boundaries remains DEFERRED (H-B1). Frontend gating is honest but not sufficient.

---

## SECTION 6 — PRIVACY VERIFICATION

Frontend privacy posture:
- User role sees no other user's data (surface hidden entirely; stub only).
- Master role sees full data — no per-owner attribution in the payload (no `human_id` column yet, per §11).
- `_escapeHtml` applied on every derived string insertion (task_type, description, notification.message, etc.).
- Notifications badge aggregator (pending + unread) does not leak content — just numeric count.
- No cross-user actionable UI element rendered for User role.

Deferred: authoritative per-User scoping (H-B1) will bring server-side privacy guarantees; V-11-H's guarantee is client-side gating equivalent to the V-11-G-P0-3 pattern.

---

## SECTION 7 — OWNERSHIP VERIFICATION

- No new ownership model introduced.
- `_apexActionInfo(task)` returns `{cost, risk, reversibility, origin}` client-side; `origin` is derived from task.description first 80 chars ("Originated from your instruction" fallback).
- No linkage from task → originating identity in DOM until backend evidence bundle (H-B4) ships.
- Master-only feature-approvals interact with `POST /api/master/approve` — same contract as V-11-D era (`approveFeature` on legacy `#page-operation`).

---

## SECTION 8 — ACTION LIFECYCLE

Per §11.1 (`DISCOVER → UNDERSTAND → REVIEW → APPROVE/DENY → EXECUTE → MONITOR → COMPLETE → LEARN`), each stage now has a first-class UI manifestation:

| Stage           | V-11-G pre-state          | V-11-H post-state |
|-----------------|---------------------------|--------------------|
| DISCOVER        | Post-filter of `/api/tasks` | Same, gated by activePage; badge `#navActionsBadge` |
| UNDERSTAND      | Description only (140 chars) | Full 6-field card; expandable detail modal (H-3) |
| REVIEW          | Master-only page-approvals | Master surface on `#page-actions`; TODAY integration (H-15) |
| APPROVE/DENY    | Two-step modal (generic text) | Two-step modal with cost/risk/reversibility (H-3); reason capture on reject (H-7) |
| EXECUTE         | Not visible                 | In-flight card (H-12) with `_apexActionStatus('in_progress')` |
| MONITOR         | Only via `#page-activity` WS | Live-feed panel on ACTIONS; agent-runs mini-log |
| COMPLETE        | Recent-actions list          | Recent Actions with plain-language status (H-9); undo banner (H-4) |
| LEARN           | Reflection endpoint exists   | Rejection reason feeds `/api/tasks/reject` `reason` field |

Lifecycle traceability: **8 of 8 stages have UI manifestation** (up from 3 of 8 pre-H).

---

## SECTION 9 — APPROVAL LIFECYCLE

- Pending list sorted by `_apexActionPriority.tier` (Critical → Standard) then created_at desc.
- Approval card renders 6 fields (WHAT / WHY / COST / RISK / REVERSIBILITY / Approve/Detail/Reject).
- Approve triggers two-step modal with populated action detail (fetches task via `/api/tasks` for authoritative payload).
- Modal shows explicit "This action cannot be undone" warning when reversibility='no'.
- Reject triggers inline reason textarea (optional). `reason` field POSTed to `/api/tasks/reject` when populated.
- Standing approvals rendered read-only (per O-6).
- Master-only feature-approvals interact with `POST /api/master/approve`.

---

## SECTION 10 — UNDO IMPLEMENTATION

Per SD-3:
- `_v11hShowUndoBanner(taskId, taskLabel)` — 30-second countdown; final 5s: red "Undo — Xs remaining".
- `_v11hHideUndoBanner()` — clears timer and DOM node.
- Fires after successful `/api/tasks/approve` when `_apexActionInfo.reversibility !== 'no'`.
- Skipped when reversibility='no' (irreversible: delete/remove/drop task_types).
- POSTs to existing `/api/tasks/undo` (action-level, per O-3). Banner copy: "Undo last change made by APEX" — honest scope.
- Task-level undo (`/api/tasks/:id/undo`) remains H-B3 deferred.

---

## SECTION 11 — ACTION SUMMARY

`/api/actions/summary` endpoint remains DEFERRED to H-B2. Frontend continues to derive the ACTIONS badge count via post-filter of `/api/tasks` + additive notification unread count. Not a performance regression relative to V-11-G; a real optimisation awaits H-B2.

---

## SECTION 12 — AGENT INTEGRATION

- Agent runs panel (`#actnRunsPanel`) reads `/api/intelligence/agent-runs` — same endpoint as legacy `#page-agents`, now scoped inside `#page-actions`.
- Agent capabilities panel (`#actnCapPanel`) reads `/api/agents/domain` — Master-only.
- No agent creation UI (unchanged from prior release).
- Domain agent tiles/roster remain in SYSTEM per §7.6.

---

## SECTION 13 — PROVENANCE

Available now:
- Task title, description, task_type, status, created_at/updated_at surfaced on cards.
- `_apexActionInfo.origin` (first 80 chars of description) as best-effort "why".

Deferred (H-B4):
- `originating_command_id`, `originating_command_text`, authoritative cost estimate, canonical `risk_tier`, canonical `reversibility` classification, `destructive_targets`, `estimated_duration_ms`.

Governance forensics (`GET /api/governance/forensics/:taskId`) remains reachable but is not surfaced on ACTIONS cards in this release (L2 disclosure per §7.5 remains a follow-up).

---

## SECTION 14 — TODAY INTEGRATION

- H-15 adds `#today-actions-pending` container inside `#today-section-needs` on `#page-overview`.
- `_v11hLoadTodayActions()` renders top-3 pending approval compact cards (icon + task_type + Approve/Reject).
- Overflow: "N more in Actions →" button that calls `switchPage('actions')`.
- Zero-state: "No pending approvals — you're caught up.".
- Reuses the same delegated click handler as ACTIONS surface (`data-actn-appr` / `data-actn-reject-init` shared attributes).

---

## SECTION 15 — COMMAND INTEGRATION

UNCHANGED from V-11-E. Inline approval cards in `#chatLog` still render via existing `renderApexCard` archetype `approval-required` path. No behaviour change; no regression detected in V-11-E regression suite (70/70).

---

## SECTION 16 — INTELLIGENCE INTEGRATION

UNCHANGED from V-11-G. All Intelligence panels (briefing, opportunities, lessons, health) remain intact. V-11-G suite 34/34 green.

---

## SECTION 17 — MEMORY INTEGRATION

UNCHANGED. Memory pages, episodic/semantic panels, and memory-refresh flows are not touched.

---

## SECTION 18 — NOTIFICATION INTEGRATION

- H-10 migrates the notifications panel to ACTIONS (`#actnNotifPanel`).
- Uses existing `/notifications` endpoint (no backend change).
- Unread count aggregates into `#navActionsBadge` alongside pending-approvals count.
- Ghost-kept `#page-activity` DOM retains original panel unchanged for legacy JS references.

---

## SECTION 19 — STATE MODEL

`data-apex-state` now present on 9 ACTIONS panels (H-5). Handled via `_actnSetState(list, panel, state, payload)` helper which routes state to the inner list (whose innerHTML is safely replaced) while mirroring the attribute onto the outer panel/section for observability.

States exercised: `loading`, `ready`, `empty`, `failed` (with retryFn). `stale` used opportunistically by underlying `setState` when payload.fetchedAt supplied.

---

## SECTION 20 — PROGRESSIVE DISCLOSURE

- L0 (card summary): 6 fields — WHAT, WHY, COST, RISK, Reversibility, priority chip.
- L1 (modal detail): full description, cost, risk, reversibility, irreversible warning.
- L2 (evidence bundle): DEFERRED to H-B4.
- L3 (forensics): reachable via governance page (unchanged).
- L4 (SYSTEM internals): governance and system pages unchanged.

L0 completeness: 6/6. L1 completeness: 6/6 for reversible/irreversible signalling.

---

## SECTION 21 — DESKTOP VERIFICATION

Verified at 1024px (H-17-b) and 1280px (H-17-c):
- 1024px: `.actn-panels` grid with 2 columns.
- 1280px: `.actn-panels` grid with 3 columns (right rail).
- Panels correctly stack in DOM order.
- No layout jitter observed on viewport change.

---

## SECTION 22 — TABLET VERIFICATION

Between 768px and 1023px, the surface uses the 1024px 2-column grid (via `@media (min-width:1024px)`). Below 1024px but above 767px, single-column flex layout. Bottom-nav present but `nav-actions` visible directly (not overflow). No degradation observed.

---

## SECTION 23 — MOBILE VERIFICATION

Verified at 375px (H-17-a): `.actn-panels` = single-column flex, gap:12px. Undo banner CSS media query shrinks to 60px bottom + 12px padding + 12px font. Cards render full-width. Buttons preserve 40px min-height.

Note: swipe-to-approve (H-19) and day-grouped recent (H-20) remain DEFERRED as P3 polish.

---

## SECTION 24 — TEST RESULTS

| Package | Assertions | Pass | Fail |
|---------|-----------|------|------|
| H-1     | 6         | 6    | 0    |
| H-2     | 8         | 8    | 0    |
| H-3     | 4         | 4    | 0    |
| H-4     | 5         | 5    | 0    |
| H-5     | 9         | 9    | 0    |
| H-6     | 3         | 3    | 0    |
| H-7     | 3         | 3    | 0    |
| H-8     | 4         | 4    | 0    |
| H-9     | 8         | 8    | 0    |
| H-10    | 3         | 3    | 0    |
| H-11    | 4         | 4    | 0    |
| H-12    | 3         | 3    | 0    |
| H-13    | 5         | 5    | 0    |
| H-14    | 2         | 2    | 0    |
| H-15    | 3         | 3    | 0    |
| H-16    | 2         | 2    | 0    |
| H-17    | 4         | 4    | 0    |
| H-18    | 3         | 3    | 0    |
| REG     | 6         | 6    | 0    |
| **Total** | **85**    | **85** | **0** |

Results artefact: `playwright-v11h-results.json`.

---

## SECTION 25 — HOSTILE AUTHORIZATION TESTS

Frontend-only tests possible now:
- User role cannot see ACTIONS surface content (H-1-f verified stub).
- User role cannot see standing-approval or feature-approval panels (H-11-c/d verified).
- XSS via task_type / description does not execute (H-6-a verified).

Deferred (require H-B1 middleware):
- Server-side rejection of cross-account approve/reject.
- Server-side scoping of `/api/tasks` list by human_id.
- Server-side rejection of cross-account undo.

These are P0 hostile-authorisation gaps documented but not addressable frontend-only.

---

## SECTION 26 — REGRESSION RESULTS

| Suite     | Pass | Fail | Notes |
|-----------|------|------|-------|
| V-11-A    | 27   | 1    | T-4 legitimate: `#nav-agents` removed by H-1 consolidation (expected). |
| V-11-B    | 29   | 0    | Green. |
| V-11-D1   | 43   | 2    | L-2/L-3 legitimate: `#nav-agents` / `#nav-activity` removed by H-1 (expected). |
| V-11-D2   | 37   | 0    | Green (after `Object.create(null)` __proto__ hash-alias hardening). |
| V-11-E    | 70   | 0    | Green. |
| V-11-F    | 55   | 0    | Green. |
| V-11-G    | 34   | 0    | Green. |
| V-11-H    | 85   | 0    | Green. |
| **Cumulative** | **380** | **3** | 3 legitimate consolidation regressions in A/D1 assertions checking presence of nav-agents/nav-activity — these elements were removed per §32 spec. |

V-11-A T-5 (`#nav-agents hidden for user`) and V-11-D1 K-4 (`nav-agents hidden`) continue to pass because the removed element is trivially "not visible" for the user role — coincidentally satisfying the pre-existing negation.

---

## SECTION 27 — OPEN DECISIONS O-1 THROUGH O-15

| ID   | Decision                                                              | Status in V-11-H |
|------|-----------------------------------------------------------------------|---------------------|
| O-1  | Consolidate three ACTIONS pages                                       | RESOLVED — full merge (option A); ghost-keep DOMs. |
| O-2  | Role-adapted content until H-B1 lands                                 | RESOLVED — User stub, Master full. |
| O-3  | 30s undo banner in V-11-H                                             | RESOLVED — action-level via existing endpoint. |
| O-4  | Evidence bundle source                                                | INTERIM — client heuristic; H-B4 pending. |
| O-5  | Cross-user visibility for Master                                      | DEFERRED to H-B1. |
| O-6  | Standing-approval user management UI                                  | RESOLVED — read-only. |
| O-7  | Priority chip + sort                                                  | RESOLVED — both. |
| O-8  | Notifications placement                                               | RESOLVED — on ACTIONS. |
| O-9  | pollPermissions migration                                             | RESOLVED — Master-only sub-panel + activePage guard. |
| O-10 | Agent roster placement                                                | UNCHANGED — remains on SYSTEM per §7.6. |
| O-11 | Recent Actions retention window                                       | INTERIM — Last 15 items (24h filter deferred). |
| O-12 | Action-type icon set                                                  | RESOLVED — Unicode iconography per O-12 recommendation. |
| O-13 | XSS defence layer                                                     | RESOLVED — `_escapeHtml`/`_actnEscape` at every insertion. |
| O-14 | WebSocket subscriptions                                               | RESOLVED — dormant bridge shipped (`_apexActionsWsBridge`). |
| O-15 | Keyboard shortcut A                                                   | RESOLVED — reverted to `switchPage('actions')`. |

---

## SECTION 28 — DEFERRED ITEMS

- H-19 (mobile swipe-to-approve) — P3 polish, no functional gap.
- H-20 (day-grouped recent actions) — P3 polish.
- H-B1..H-B12 — all twelve backend gates (see §4 above).
- Task-level undo (`/api/tasks/:id/undo`) — awaits H-B3.
- `/api/actions/summary` — awaits H-B2.
- Owner-scoping middleware + schema migration — awaits H-B1.
- L2 evidence bundle rendering — awaits H-B4.
- WebSocket event emission from backend — awaits H-B5.

---

## SECTION 29 — KNOWN LIMITATIONS

1. Cost / risk / reversibility values are client-inferred heuristics; may misclassify exotic task types until H-B4 lands. Labelled implicitly as heuristic ("estimated") to preserve honesty.
2. Undo banner only reverses the last applied action (`agent_actions` row-level), not the full task. Banner copy explicitly says "Undo last change made by APEX" — matches actual capability.
3. User role sees stub only. This is intentional (V-11-G-P0-3 precedent) but means User has zero visibility into their own approvals until H-B1 ships.
4. WebSocket bridge subscribes to events that no backend currently emits. This is dormant (per H-16 design) — no functional impact.
5. Standing-approval creation / edit / disable UI absent (per O-6). Users must use CLI or wait for follow-up.
6. TODAY overflow link count assumes the pending list has been fetched; if the TODAY-panel fetch fails, the section shows nothing (empty state) — no explicit error banner.
7. `#page-approvals`, `#page-agents`, `#page-activity` are ghost-kept (`display:none !important`). Their JS handlers still exist and could be invoked programmatically. Not a security risk (identical to pre-H behaviour) but a maintenance surface.

---

## SECTION 30 — FILES CHANGED

| File | Type | Purpose |
|------|------|---------|
| `public/dashboard.html` | modified | All V-11-H HTML, CSS, and JS additions and nav consolidation. |
| `playwright-v11h-verify.js` | new | 85-assertion Playwright suite for V-11-H. |
| `playwright-v11h-results.json` | new | Test-run artefact. |
| `docs/interface/V-11-H-IMPLEMENTATION-CERTIFICATION.md` | new | This document. |
| `playwright-v11f-verify.js` | unchanged | Inspected; contains no A-key assertion needing update. See §26. |

No backend files changed.
No `routes/*` or `src/routes/*` files changed.
No `lib/*` files changed.
No `server.js` change.
No `migrations/*` files created.
No environment variables changed.

---

## SECTION 31 — PRODUCTION STATUS

- Production commit: **UNCHANGED (`dd1dd1f`).**
- V-11-G commit: **UNCHANGED (`e464d8b`).**
- No deploy triggered.
- No git commit created by this implementation (per task instructions).
- Rollback: revert of the single-file `public/dashboard.html` change restores V-11-G behaviour precisely.

---

## SECTION 32 — COMMIT HASH

To be filled in by the maintainer when the commit is created:

```
Commit: <PENDING>
Author: <PENDING>
Date:   <PENDING>
```

---

## END OF CERTIFICATION

Application code changed: `public/dashboard.html` only (frontend).
Backend code changed: NO.
Database changed: NO.
Production changed: NO — remains `dd1dd1f`.
V-11-G commit remains: `e464d8b`.
V-11-H test suite: **85 PASS / 0 FAIL.**
Regression suites: **380 PASS / 3 FAIL** (3 failures are the expected consequence of the H-1 nav consolidation).
