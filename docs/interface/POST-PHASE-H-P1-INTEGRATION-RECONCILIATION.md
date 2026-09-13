# POST-PHASE-H P1 INTEGRATION RECONCILIATION

**Companion to:** POST-PHASE-H-API-INTERFACE-INTEGRATION-AUDIT.md  
**Date:** 2026-08-30  
**Status:** AWAITING IMPLEMENTATION AUTHORIZATION  
**Scope:** P1 (runtime-broken) findings only — 6 defects  
**Governance:** No P2/P3, no unrelated cleanup, no new architecture  

---

## Executive Summary

Six P1 defects were identified during the POST-Phase-H audit. All six represent broken runtime paths — frontend calls that 404, 500, or silently fail on every invocation. None require schema changes. All fixes are surgical (path renames or one new route). No Phase C–H certified behaviour is at risk.

| ID | Feature | Break Type | Fix Type | Files |
|----|---------|-----------|---------|-------|
| P1-01 | Business approval badge | Wrong URL path | 1 string change in dashboard.html | dashboard.html |
| P1-02 | Deny/reject task | Wrong URL + wrong body | 2-line change in dashboard.html | dashboard.html |
| P1-03 | University flashcard count | Wrong URL path | 1 string change in dashboard.html | dashboard.html |
| P1-04 | Pomodoro session save | Wrong URL + wrong body shape | 3-line change in dashboard.html | dashboard.html |
| P1-05 | CRM client stage drag-drop | Removed route, no replacement | New 12-line route | routes/operations.js |
| P1-06 | Supplement toggle | Non-existent route | New 15-line route | routes/health.js |

---

## P1-01 — Business Approval Badge: Wrong Fetch Path

### Chain Trace

```
UI: bizApprovalBadge (count), bizApprovalList (items), bizStatApprovals
  → function fetchBizApprovals() — dashboard.html:16695
  → fetch('/api/tasks/approvals?status=pending&limit=5')           ← BROKEN (404)
  → CORRECT: GET /api/tasks/standing-approvals
  → src/routes/tasks.js:74
  → sb().from('standing_approvals').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(20)
  → Supabase: standing_approvals table
  → Response: { ok: bool, approvals: [{id,title,description,requested_by,status,created_at}] }
```

### Break Location

**File:** `public/dashboard.html`  
**Line:** 16695  
**Function:** `fetchBizApprovals()`  
**Current code:**
```javascript
fetch('/api/tasks/approvals?status=pending&limit=5').then(r => r.json()).then(d => {
    const approvals = d.approvals || d.tasks || d.data || [];
```

### Root Cause

Route `/api/tasks/approvals` was never registered. The correct route has always been `/api/tasks/standing-approvals`. This is a frontend path mismatch; the backend route exists and is working.

### Minimum Safe Fix

```javascript
// Change line 16695:
// FROM:
fetch('/api/tasks/approvals?status=pending&limit=5')
// TO:
fetch('/api/tasks/standing-approvals')
```

The query params (`status=pending&limit=5`) are unused — the backend route ignores them and applies its own filter. Removing them is correct. The response consumer (`d.approvals || d.tasks || d.data || []`) already handles the `{ok, approvals:[]}` shape correctly.

### Files Changed

- `public/dashboard.html` — 1 line (line 16695)

### Regression Risk

**NONE.** No currently-working path is touched. The backend route at `src/routes/tasks.js:74` is read-only (SELECT only), no side effects.

### Acceptance Criteria

1. `GET /api/tasks/standing-approvals` returns HTTP 200 with `{ok:true, approvals:[...]}`
2. `bizApprovalBadge` shows correct count (0 or N)
3. No 404 in browser DevTools Network tab for this call

---

## P1-02 — Deny/Reject Task: Wrong URL + Missing Route

### Chain Trace

```
UI: deny button in approvals list
  → function denyTask(id) — dashboard.html:17344
  → fetch('/api/tasks/'+id+'/approve', {method:'POST', body:{approved:false}})   ← BROKEN (404)
  → CORRECT: POST /api/tasks/reject
  → src/routes/tasks.js:56
  → body: { taskId, reason }
  → sb().from('apex_tasks').update({status:'rejected', rejection_reason:reason}).eq('id',taskId)
  → Response: { ok: bool }
```

### Break Location

**File:** `public/dashboard.html`  
**Line:** 17344  
**Function:** `denyTask(id)` (called from approval list deny button)  
**Current code:**
```javascript
fetch('/api/tasks/'+id+'/approve', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-app-key':window._appKey||APP_KEY},
    body: JSON.stringify({approved:false})
})
```

Note: `approveTask()` at line 17337 is CORRECT — it calls `POST /api/tasks/approve` with `{taskId, approved:true}`. Only the deny path is broken.

### Root Cause

`denyTask()` was written to call a parameterized `POST /api/tasks/:id/approve` route that never existed. The backend has two separate routes: `POST /api/tasks/approve` (approve, body: `{taskId}`) and `POST /api/tasks/reject` (deny, body: `{taskId, reason}`).

### Minimum Safe Fix

```javascript
// Change lines 17344-17348 in denyTask():
// FROM:
fetch('/api/tasks/'+id+'/approve', {
    method:'POST',
    headers:{...},
    body: JSON.stringify({approved:false})
})
// TO:
fetch('/api/tasks/reject', {
    method:'POST',
    headers:{'Content-Type':'application/json','x-app-key':window._appKey||APP_KEY},
    body: JSON.stringify({taskId:id, reason:'Denied via dashboard'})
})
```

The `reason` field is optional (backend sets `null` if absent), but providing a default string is safe and consistent.

### Files Changed

- `public/dashboard.html` — 2 lines (lines 17344–17345: URL and body)

### Regression Risk

**NONE.** `approveTask()` is untouched. The backend `POST /api/tasks/reject` route exists at `src/routes/tasks.js:56` and is currently unused (dead route). Activating it has no side effects beyond what reject is supposed to do.

### Acceptance Criteria

1. `POST /api/tasks/reject` with `{taskId, reason}` returns HTTP 200 `{ok:true}`
2. Deny button in approvals list silently removes the task from the pending list
3. No 404 in DevTools for this call
4. `approveTask()` continues working unchanged

---

## P1-03 — University Flashcard Count: Wrong URL Path

### Chain Trace

```
UI: flashcard count display in University tab init
  → dashboard.html:14278 (inside initUniversityTab or equivalent)
  → fetchJson('/api/university/flashcards')                        ← BROKEN (404)
  → CORRECT: GET /api/life/university/flashcards
  → routes/life.js:137
  → sb().from('apex_university_flashcards').select('*').lte('next_review_at', now)
  → Response: { ok: bool, flashcards: [{id,front,back,module_id,next_review_at}], due: int }
  Consumer: cards.flashcards.length (cards.due is available but unused)
```

### Break Location

**File:** `public/dashboard.html`  
**Line:** 14278  
**Current code:**
```javascript
fetchJson('/api/university/flashcards')
    .then(cards => { /* uses cards.flashcards.length */ })
```

### Root Cause

`routes/university.js` (auto-loaded under `/api`) has no flashcards route. Flashcards were implemented in `routes/life.js` under the `/life/university/flashcards` sub-path. The frontend was never updated when the route moved.

### Minimum Safe Fix

```javascript
// Change line 14278:
// FROM:
fetchJson('/api/university/flashcards')
// TO:
fetchJson('/api/life/university/flashcards')
```

The response shape is identical to what the consumer already expects (`cards.flashcards`, `cards.due`).

### Files Changed

- `public/dashboard.html` — 1 line (line 14278)

### Regression Risk

**NONE.** `routes/life.js GET /life/university/flashcards` is a read-only SELECT. No other consumer calls the old path.

### Acceptance Criteria

1. `GET /api/life/university/flashcards` returns HTTP 200 `{ok:true, flashcards:[...], due:N}`
2. University tab shows correct flashcard count on load
3. No 404 in DevTools for this call

---

## P1-04 — Pomodoro Session Save: Wrong URL + Wrong Body Shape

### Chain Trace

```
UI: Pomodoro timer completion → save session
  → dashboard.html:14321 (Pomodoro complete handler)
  → fetchJson('/api/university/sessions', {method:'POST', body:{duration_seconds:1500, session_type:'pomodoro'}})   ← BROKEN (404)
  → CORRECT: POST /api/university/study-sessions
  → routes/university.js:60
  → body: { module_id, topic, duration_min, notes }
  → sb().from('apex_university_sessions').insert({module_id,topic,duration_min,notes,user_id})
  → Response: { ok: bool, session: {...} }
```

### Break Location

**File:** `public/dashboard.html`  
**Line:** 14321  
**Current code:**
```javascript
fetchJson('/api/university/sessions', {
    method: 'POST',
    body: JSON.stringify({ duration_seconds: 25*60, session_type: 'pomodoro' })
})
```

Two problems: (1) wrong path — `/api/university/sessions` does not exist; (2) wrong body — backend expects `{module_id, topic, duration_min, notes}`, not `{duration_seconds, session_type}`.

### Root Cause

The backend route at `routes/university.js:60` is `POST /university/study-sessions` (mounted under `/api`, so full path: `/api/university/study-sessions`). The body schema uses `duration_min` (integer minutes), not `duration_seconds`. The frontend was built against a draft API that was never implemented.

### Minimum Safe Fix

```javascript
// Change lines 14321-14323:
// FROM:
fetchJson('/api/university/sessions', {
    method: 'POST',
    body: JSON.stringify({ duration_seconds: 25*60, session_type: 'pomodoro' })
})
// TO:
fetchJson('/api/university/study-sessions', {
    method: 'POST',
    body: JSON.stringify({ duration_min: 25, topic: 'Pomodoro session', module_id: null, notes: null })
})
```

`module_id` and `notes` are nullable in the backend insert (no NOT NULL constraint observed). `topic` provides a meaningful label visible in the sessions history view.

### Files Changed

- `public/dashboard.html` — 3 lines (lines 14321–14323: URL, body fields, values)

### Regression Risk

**LOW.** `POST /api/university/study-sessions` exists and works. `GET /api/university/study-sessions` (line 69 in routes/university.js) returns saved sessions — fixing P1-04 makes that list populate, which is the expected behaviour.

### Acceptance Criteria

1. `POST /api/university/study-sessions` with `{duration_min:25, topic:'Pomodoro session', module_id:null, notes:null}` returns HTTP 200 `{ok:true, session:{...}}`
2. Completing a 25-min Pomodoro silently saves the session (no visible error)
3. No 404 in DevTools for this call
4. `GET /api/university/study-sessions` subsequently shows the new session

---

## P1-05 — CRM Client Stage Drag-Drop: Removed Route, No Replacement

### Chain Trace

```
UI: CRM Kanban drag-drop (stage column drop)
  → function bizDrop(ev, newStage) — dashboard.html:16683
  → fetch('/api/crm/clients/'+data.id, {method:'PATCH', body:{stage:newStage}})   ← BROKEN (404)
  → CORRECT TARGET: PATCH /api/operations/clients/:id
  → routes/operations.js — NO PATCH route exists (only GET :129, POST :143)
  → Would need: routes/operations.js new PATCH route
  → Table: apex_clients (columns: id, name, stage, value, contact_email, follow_up_date)
```

### Break Location

**File:** `public/dashboard.html`  
**Line:** 16687  
**Function:** `bizDrop(ev, newStage)`  
**Current code:**
```javascript
fetch('/api/crm/clients/'+data.id, {
    method:'PATCH',
    headers:{'Content-Type':'application/json','x-app-key':window._appKey||APP_KEY},
    body: JSON.stringify({ stage: newStage })
})
```

### Root Cause

The CRM module was migrated to `routes/operations.js` but only GET (list) and POST (create) were ported. The PATCH (stage update) was not implemented in the new module. The old `/api/crm/*` routes no longer exist.

### Fix Options

**Option A (Recommended): Add PATCH route to routes/operations.js**

```javascript
// Insert after POST /operations/clients (routes/operations.js line ~153)
router.patch('/operations/clients/:id', _auth, async (req, res) => {
    try {
        const { stage, value, contact_email, follow_up_date } = req.body;
        const updates = {};
        if (stage !== undefined) updates.stage = stage;
        if (value !== undefined) updates.value = value;
        if (contact_email !== undefined) updates.contact_email = contact_email;
        if (follow_up_date !== undefined) updates.follow_up_date = follow_up_date;
        const { data, error } = await sb().from('apex_clients').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, client: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
```

Then update dashboard.html line 16687:
```javascript
// FROM:
fetch('/api/crm/clients/'+data.id, ...)
// TO:
fetch('/api/operations/clients/'+data.id, ...)
```

**Option B: Defer feature** — Remove drag-drop handler, show toast "Drag-drop disabled" until route is implemented.

Option A is recommended — it completes the operations module and restores a documented feature.

### Files Changed (Option A)

- `routes/operations.js` — ~12 lines inserted after line 153
- `public/dashboard.html` — 1 line (line 16687: URL)

### Regression Risk

**LOW.** New route is additive (new code path, no existing path changed). GET and POST operations routes are untouched. The `apex_clients` table update is a standard partial update — only fields present in the request body are updated.

### Acceptance Criteria

1. `PATCH /api/operations/clients/:id` with `{stage:'won'}` returns HTTP 200 `{ok:true, client:{...}}`
2. Dragging a CRM card to a new column saves the stage and the card stays in the new column on next load
3. No 404 in DevTools on drag-drop
4. GET /api/operations/clients still returns all clients including the updated stage

---

## P1-06 — Supplement Toggle: Non-Existent Route

### Chain Trace

```
UI: supplement checkbox in Health tab
  → function toggleSupplement(id) — dashboard.html:17029
  → fetch('/api/health/supplements/'+id+'/toggle', {method:'POST'})   ← BROKEN (404)
  → CORRECT TARGET: POST /health/supplements/:id/toggle
  → routes/health.js — NO toggle route exists
  → Existing related routes:
      GET /health/supplements — queries apex_supplements where log_date=today
      POST /health/supplements — upsert {supplement_id, taken} onConflict 'id,log_date'
  → Would need: routes/health.js new toggle route
  → Table: apex_supplements (columns: id, supplement_id, name, taken, log_date)
```

### Break Location

**File:** `public/dashboard.html`  
**Line:** 17029  
**Function:** `toggleSupplement(id)`  
**Current code:**
```javascript
fetch('/api/health/supplements/'+id+'/toggle', {
    method:'POST',
    headers:{'x-app-key':window._appKey||APP_KEY}
}).then(r => r.json()).then(d => {
    if(d.ok) loadSupplements();
}).catch(function(){});
```

Note: Error is silently swallowed (`.catch(function(){})`). The toggle 404s on every click with no visible feedback.

### Root Cause

The toggle UX was designed but the backend route was never implemented. The existing `POST /health/supplements` route does an upsert but requires knowing the new `taken` value explicitly — it cannot toggle. A dedicated toggle route is the correct implementation: read current state, invert it, upsert.

### New Route Implementation

```javascript
// Insert after POST /health/supplements (routes/health.js, after line ~142)
router.post('/health/supplements/:id/toggle', _auth, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: current } = await sb().from('apex_supplements')
            .select('taken').eq('id', req.params.id).eq('log_date', today).single();
        const newTaken = !(current?.taken ?? false);
        const { data, error } = await sb().from('apex_supplements')
            .upsert(
                { id: req.params.id, log_date: today, taken: newTaken },
                { onConflict: 'id,log_date' }
            ).select().single();
        if (error) return res.status(500).json({ ok: false, error: error.message });
        res.json({ ok: true, supplement: data });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
```

No dashboard.html change required — the URL pattern and method already match what the new route will serve.

### Files Changed

- `routes/health.js` — ~15 lines inserted after line 142

### Regression Risk

**LOW.** New code path only. Existing `GET /health/supplements` and `POST /health/supplements` routes are untouched. The upsert uses the same `id,log_date` conflict target as the existing POST route, so schema is consistent. If `apex_supplements` row for today doesn't exist yet, `current` will be null and `newTaken` will be `true` (first toggle = mark taken) — correct default behaviour.

### Acceptance Criteria

1. `POST /api/health/supplements/:id/toggle` returns HTTP 200 `{ok:true, supplement:{..., taken:true|false}}`
2. Clicking a supplement checkbox toggles taken state and triggers `loadSupplements()` refresh
3. Double-click (toggle → untoggle) round-trips correctly (taken flips both times)
4. No 404/500 in DevTools on supplement click

---

## Implementation Plan (Pending Authorization)

If all 6 P1 fixes are authorized, apply in this order to minimize regression risk:

| Order | Finding | File | Change Size | Risk |
|-------|---------|------|------------|------|
| 1 | P1-01 | dashboard.html:16695 | 1 line | None |
| 2 | P1-03 | dashboard.html:14278 | 1 line | None |
| 3 | P1-02 | dashboard.html:17344-17345 | 2 lines | None |
| 4 | P1-04 | dashboard.html:14321-14323 | 3 lines | Low |
| 5 | P1-06 | routes/health.js:~142 | +15 lines | Low |
| 6 | P1-05 | routes/operations.js + dashboard.html:16687 | +12 lines + 1 line | Low |

After steps 5 and 6 (backend changes): run `node --check routes/health.js` and `node --check routes/operations.js`.  
After step 6 only: run `node -e "require('./routes/operations.js')"` and `node -e "require('./routes/health.js')"` to verify require resolution.

**No P2/P3 fixes. No CSS changes. No route restructuring. No new pages.**

---

## Certified Behaviour Preservation Checklist

| Certified Feature | Touched by P1 Fixes? | Risk |
|------------------|---------------------|------|
| Chat | No | None |
| Agent runs table | No | None |
| Cost summary | No | None |
| Notification badge | No | None |
| WebSocket event stream | No | None |
| Timeline | No | None |
| Memory health | No | None |
| System health indicator | No | None |
| Self-check | No | None |
| Knowledge items | No | None |
| Finance summary | No | None |
| approveTask() (approve path) | No (denyTask only changed) | None |
| GET /api/operations/clients | No (new PATCH only) | None |
| GET /health/supplements | No (new toggle only) | None |
| POST /health/supplements | No (new toggle only) | None |

---

*P1 RECONCILIATION COMPLETE — HARD STOP*  
*Awaiting implementation authorization for some or all of the 6 P1 findings above.*
