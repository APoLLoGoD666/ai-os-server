# RX-02 P1 FUNCTIONAL BETA CLOSURE

**Document ID:** RX-02-P1-FUNCTIONAL-BETA-CLOSURE  
**Sprint:** RX-02 — P1 Functional Beta Quality Close  
**Date:** 2026-08-28  
**Status:** COMPLETE — ALL P1 GAPS CLOSED  
**Predecessor:** RX-01-VERIFICATION-CERTIFICATION.md (P0 cleared)  
**Authorization:** Explicit user authorization; POST-UX-19-FINAL-RECONCILIATION.md §4

---

## SECTION 1 — SPRINT SUMMARY

RX-02 closes all four P1 (beta-quality) gaps identified by the POST-UX-19 reconciliation. No P2, P3, or RX-03+ work was performed. No new surfaces introduced. No architectural changes. No database migrations.

**Production files modified:**

| File | Change |
|------|--------|
| `src/routes/tasks.js` | Added `POST /api/tasks/reject` and `GET /api/tasks/standing-approvals` |
| `lib/viz-broadcaster.js` | Extended `tapEventBus()` with Voice, Tool, System event taps |
| `public/dashboard.html` | Three surgical patches: reject wiring, recent-actions filter, event renderer |

**Test file created:** `tests/rx-02-p1.test.js` (36 assertions, all PASS)

---

## SECTION 2 — GAP CLOSURE REPORT

### P1-01 — Task rejection route (GAP-10)

**Status: CLOSED**

**Change:** Added `router.post('/api/tasks/reject', ...)` to `src/routes/tasks.js`.

**Behaviour:**
- Accepts `{ taskId, reason }` in request body
- Fetches task; returns 404 if not found
- Guards against rejecting non-rejectable statuses (`completed`, `failed`, `in_progress`, `rejected`, `cancelled`) — returns 409 with current status
- Rejectable statuses: `pending`, `awaiting_approval`, `approval_required`, `pending_approval`
- Updates `apex_tasks.status` → `'rejected'` with `updated_at` timestamp
- Inserts notification to `apex_notifications` (fire-and-forget; failure does not fail the request)
- Returns `{ ok: true, taskId, status: 'rejected' }`

**Frontend wiring:** Reject click handler in `public/dashboard.html` now calls `POST /api/tasks/reject` with `taskId`, shows success/error toast, refreshes approvals panel. Prior behaviour: toast only, no API call.

**Audit trail:** `apex_tasks.status = 'rejected'` is the audit record, consistent with how `completed`/`failed` are recorded.

### P1-02 — Standing approvals route (GAP-13)

**Status: CLOSED**

**Change:** Added `router.get('/api/tasks/standing-approvals', ...)` to `src/routes/tasks.js`.

**Behaviour:**
- Queries `standing_approvals` table via `sbAdmin` (same admin client used by all task routes)
- Returns all rows ordered by `id` descending, limit 50
- Returns `{ ok: true, approvals: [...] }`
- On error: `{ ok: false, error: '...' }`

**Frontend wiring:** `_loadStandingApprovals()` in `public/dashboard.html` already called `GET /api/tasks/standing-approvals` and handled absence gracefully. No frontend change required — the route being present is the fix.

### P1-03 — Viz-broadcaster expansion (GAP-20)

**Status: CLOSED**

**Change:** Extended `tapEventBus()` in `lib/viz-broadcaster.js` with 9 additional event taps.

**New event taps added:**

| Event bus constant | Emitted payload |
|-------------------|----------------|
| `VOICE_STARTED` | `{ type: 'voice', status: 'started', session_id }` |
| `REFLEX_RESPONSE_SENT` | `{ type: 'voice', status: 'reflex', data }` |
| `USER_INTERRUPTED` | `{ type: 'voice', status: 'interrupted' }` |
| `SESSION_COMPLETED` | `{ type: 'voice', status: 'completed', session_id }` |
| `TOOL_DISPATCHED` | `{ type: 'tool', status: 'dispatched', data }` |
| `TOOL_COMPLETED` | `{ type: 'tool', status: 'completed'\|'failed', data }` |
| `CLAUDE_STARTED` | `{ type: 'system', status: 'claude_started', data }` |
| `BACKGROUND_TASK_QUEUED` | `{ type: 'system', status: 'queued', data }` |
| `MODEL_INVOKED` | `{ type: 'system', status: 'model_invoked', data }` |

**Skipped (by design):** `AUDIO_RECEIVED`, `CLAUDE_FIRST_TOKEN`, `AUDIO_RECEIVED` — high-frequency, no UX value in feed.

**Existing taps retained unchanged:** `AGENT_STARTED`, `AGENT_COMPLETED`.

**Dashboard category derivation:** The existing `_actRenderEvent` derives category from `(ev.type || '').split('.')[0].toUpperCase()`. So `type: 'voice'` → category `VOICE`, `type: 'tool'` → category `TOOL`, `type: 'system'` → category `SYSTEM`. These match the existing CSS classes.

### P1-04 — Activity renderer + filter extension (GAP-23)

**Status: CLOSED**

**Changes (3 surgical edits to `public/dashboard.html`):**

1. **`_actRenderEvent` status display:** Changed `ev.type || 'event'` to `(ev.type || 'event') + (ev.status ? ' · ' + ev.status : '')`. Events now display as `voice · started`, `tool · completed`, `agent · failed`, etc.

2. **`_loadRecentActions` filter:** Added `|| t.status === 'rejected'` to the terminal-status filter. Rejected tasks now appear in the Recent Actions list with colour `#ff8c42` (amber, distinguishable from failed red `#ff4d6d`).

3. **Reject handler:** Replaced no-op comment with actual `fetch('/api/tasks/reject', ...)` call. Handles success toast, error toast, and network failure gracefully. Refreshes approvals panel in all cases.

---

## SECTION 3 — VERIFICATION RESULTS

### Syntax checks

| File | Result |
|------|--------|
| `node --check server.js` | **PASS** |
| `node --check lib/viz-broadcaster.js` | **PASS** |

### Test suite

```
node tests/rx-02-p1.test.js

P1-01 (reject status guard): all 9 checks PASS
P1-03 (viz-broadcaster new taps): all 20 field checks PASS
P1-04 (actRenderEvent status display): all 5 checks PASS
P1-04 (recent actions filter): all 2 checks PASS

RX-02 P1: ALL TESTS PASS
```

**Total assertions: 36. Failures: 0.**

### ONE-APEX integrity

| Principle | Status |
|-----------|--------|
| Single production HTML file | **MAINTAINED** — no new HTML files |
| Real data only | **MAINTAINED** — new routes hit `sbAdmin` directly; no mock data |
| No fabricated capabilities | **MAINTAINED** — both new routes return live database data |
| Security posture | **MAINTAINED** — both routes protected by `requireAppAccess`; no credential exposure |
| No new database tables | **MAINTAINED** — `standing_approvals` and `apex_tasks` are existing tables |
| No database migrations | **MAINTAINED** — `rejected` status stored in existing `apex_tasks.status` text column |

---

## SECTION 4 — REMAINING GAPS

RX-02 closes all P1 gaps. P0 gaps were cleared by RX-01. The following remain:

| Priority | Count | Resolution path |
|----------|-------|----------------|
| P0 | 0 | CLEARED in RX-01 |
| P1 | 0 | CLOSED in RX-02 |
| P2 | 15 | RX-03, RX-04, RX-05 (require explicit authorization) |
| P3 | 11 | RX-07 (require explicit authorization) |

**Beta verdict remains:** CONDITIONALLY CERTIFIED — FUNCTIONAL BETA WITH EXPLICIT LIMITATIONS  
**Functional quality:** All stated beta surfaces now operate at full P1 quality.

---

## SECTION 5 — HARD STOP

**RX-02 is complete.**

The next sprint in sequence is **RX-03** (P2 backend routes: memory correction/deletion, intelligence surface, event log). RX-03 is **NOT authorized** by this document or by POST-UX-19-FINAL-RECONCILIATION.md.

**No RX-03 through RX-07 work has been performed or is authorized.**

The following files were modified by RX-02:
- `src/routes/tasks.js` — two new routes added
- `lib/viz-broadcaster.js` — nine new event taps added
- `public/dashboard.html` — three surgical patches applied

The following files were created by RX-02:
- `tests/rx-02-p1.test.js`
- `docs/interface/RX-02-P1-FUNCTIONAL-BETA-CLOSURE.md`

---

*RX-02-P1-FUNCTIONAL-BETA-CLOSURE v1.0 — 2026-08-28*  
*Sprint authority: POST-UX-19-FINAL-RECONCILIATION.md §4 (RX-02 authorization block).*  
*Hard stop issued. RX-03 requires explicit user authorization before any implementation.*
