# RX-05 — PRE-IMPLEMENTATION RECONNAISSANCE

**Programme:** RX — Production Reconciliation  
**Phase:** RX-05 EVENT INFRASTRUCTURE  
**Date:** 2026-08-28  
**Status:** RECONNAISSANCE COMPLETE — AWAITING EXPLICIT IMPLEMENTATION AUTHORISATION  
**Scope:** GAP-21 (`correlation_id` in event bus) + GAP-15/16/22 current state

---

## 1. Authoritative Plan Recovery

**Canonical RX-05 tasks** (`POST-UX-19-R-SERIES-RECONCILIATION.md` lines 198–203):

| Task | Gap | Action | File |
|------|-----|--------|------|
| RX-05-A | GAP-21 | Add `correlation_id` field to event bus emission | `lib/event-bus.js` |
| RX-05-B | GAP-21 | Propagate `correlation_id` from event bus to viz-broadcaster payloads | `lib/viz-broadcaster.js` |

**Gate (from plan):** `node -e "require('./lib/event-bus')"` resolves; regression test suite still passes.

**Dependency:** None — parallel track, independent of Wave-3 constitutional track.

---

## 2. GAP-21 — Current Production State

### 2.1 event-bus.js — event object structure

`lib/event-bus.js` lines 61–66 (`emit()`):

```js
const event = {
    type,
    session_id: payload.session_id || null,
    timestamp:  Date.now(),
    payload,
};
```

`lib/event-bus.js` line 81 (`emitSync()`):

```js
const event = { type, session_id: payload.session_id || null, timestamp: Date.now(), payload };
```

**Finding:** `correlation_id` is absent from both paths. The in-memory ring buffer (`this._log`) stores events without a correlation field. `forSession()` groups by `session_id` only — no correlation chain possible.

### 2.2 viz-broadcaster.js — propagation gap

`lib/viz-broadcaster.js` `emit()` function (lines 32–41):

```js
function emit(event) {
    if (!event || !event.type) return;
    const payload = Object.assign({}, event, { ts: event.ts || new Date().toISOString() });
    // ...sends payload to WebSocket subscribers
}
```

`Object.assign({}, event, ...)` WOULD propagate `correlation_id` if it existed on the inbound event object — the function itself is not the problem.

The problem is in `tapEventBus()` (lines 43–112): each handler builds a new minimal object from `event.payload` only, discarding the top-level event envelope:

```js
bus.on(E.AGENT_STARTED, function(event) {
    const ev = event.payload || {};
    emit({ type: 'agent', status: 'started', ok: true, label: ev.label || ev.task_id || '' });
    //     ↑ new object — event.correlation_id not passed
});
```

This pattern repeats across all 11 `tapEventBus()` handlers. Each builds a minimal payload and drops any top-level fields from the bus event (including `correlation_id` and `session_id`, which are also not propagated).

### 2.3 Repository-wide correlation_id search

`grep -r correlation_id --include="*.js"` → **0 results.**

`correlation_id` exists nowhere in any `.js` file in the repository. It appears only in:
- `migrations/058_arch15_missing_tables.sql` line 56 (governance records table — unrelated to event bus)
- Documentation files (gap descriptions, UX-17 spec)

### 2.4 Emitter site inventory

All `bus.emit()` / `_bus.emit()` calls in production `.js` files:

| File | Lines | Events emitted |
|------|-------|----------------|
| `lib/agent-queue.js` | 55, 90, 100, 110 | BACKGROUND_TASK_QUEUED, AGENT_STARTED, AGENT_COMPLETED ×2 |
| `lib/auto-pipeline.js` | 93, 96 | AGENT_STARTED, AGENT_COMPLETED |
| `lib/tool-executor.js` | 77, 86, 90, 102 | TOOL_DISPATCHED, TOOL_COMPLETED ×2, BACKGROUND_TASK_QUEUED |
| `lib/cognitive-orchestrator.js` | 145, 160 | INTENT_CLASSIFIED, REFLEX_RESPONSE_SENT |
| `lib/models/runtime/index.js` | 126, 187 | MODEL_INVOKED, CLAUDE_FIRST_TOKEN |
| `lib/calendar/sync.js` | 97 | CALENDAR_EVENT_SYNCED |
| `lib/orchestration/execution_orchestrator.js` | 166, 173, 179, 185, 245 | REALITY_LOOP_RESULT, CERTIFICATION_RESULT, COVENANT_RESULT, COHERENCE_RESULT, EXECUTION_TRACE |
| `lib/orchestration/governance_instrumentation.js` | 18, 28, 38 | EXECUTION_START, EXECUTION_END, EXECUTION_ERROR |
| `lib/orchestration/governance_event_bus.js` | 134 | governance:* |
| `lib/orchestration/governance_event_adapter.js` | 47 | (event_type variable) |
| `routes/gemini-live.js` | 304, 442, 512, 599, 621, 644 | CLAUDE_FIRST_TOKEN, VOICE_STARTED, CLAUDE_STARTED, REFLEX_RESPONSE_SENT, AUDIO_RECEIVED, SESSION_COMPLETED |
| `agent-system/email_agent.js` | 156 | EMAIL_PARSED |

**None of these callers pass `correlation_id` in their payload** — the field is absent at every emission site.

### 2.5 Classification

**GAP-21 Status: GENUINELY OPEN.** Not false-fail, not partially closed, not misclassified.

- `correlation_id` is absent from `lib/event-bus.js` (both `emit()` and `emitSync()`)
- `correlation_id` is absent from all 11 `tapEventBus()` handlers in `lib/viz-broadcaster.js`
- Zero emitters pass `correlation_id` in payload
- Gap class E (Event infrastructure) is correct
- Priority P2 is correct
- "Parallel" dependency designation is correct — no Wave-3 blockers

---

## 3. Minimum Canonical Implementation

### 3.1 Scope: 2 files only

The canonical plan scope is `lib/event-bus.js` + `lib/viz-broadcaster.js`. No emitters require modification for the minimum implementation — the bus hoists `correlation_id` from payload if present; callers that don't supply it get `null` in the event envelope.

### 3.2 Change A — lib/event-bus.js

Two surgical edits: one in `emit()`, one in `emitSync()`.

**`emit()` at lines 61–66 — add `correlation_id` field:**

```js
// BEFORE
const event = {
    type,
    session_id: payload.session_id || null,
    timestamp:  Date.now(),
    payload,
};

// AFTER
const event = {
    type,
    session_id:     payload.session_id     || null,
    correlation_id: payload.correlation_id || null,
    timestamp:      Date.now(),
    payload,
};
```

**`emitSync()` at line 81 — same addition:**

```js
// BEFORE
const event = { type, session_id: payload.session_id || null, timestamp: Date.now(), payload };

// AFTER
const event = { type, session_id: payload.session_id || null, correlation_id: payload.correlation_id || null, timestamp: Date.now(), payload };
```

**Backward compatibility:** callers that do not pass `correlation_id` in payload receive `null` on the event — no breakage. Callers that do pass it get it hoisted to the event envelope and available to all listeners.

### 3.3 Change B — lib/viz-broadcaster.js

Each of the 11 `tapEventBus()` handlers builds a minimal payload without propagating the top-level event fields. Each handler must be updated to pass `correlation_id` from the bus event.

Pattern for every handler:

```js
// BEFORE (example — AGENT_STARTED handler)
bus.on(E.AGENT_STARTED, function(event) {
    const ev = event.payload || {};
    emit({ type: 'agent', status: 'started', ok: true, label: ev.label || ev.task_id || '' });
});

// AFTER
bus.on(E.AGENT_STARTED, function(event) {
    const ev = event.payload || {};
    emit({ type: 'agent', status: 'started', ok: true, label: ev.label || ev.task_id || '', correlation_id: event.correlation_id || null });
});
```

This pattern applies to all 11 handlers: AGENT_STARTED, AGENT_COMPLETED, VOICE_STARTED, REFLEX_RESPONSE_SENT, USER_INTERRUPTED, SESSION_COMPLETED, TOOL_DISPATCHED, TOOL_COMPLETED, CLAUDE_STARTED, BACKGROUND_TASK_QUEUED, MODEL_INVOKED.

### 3.4 Test gate

After both changes:

```
node -e "require('./lib/event-bus')"  → must resolve cleanly
node --check lib/event-bus.js         → PASS
node --check lib/viz-broadcaster.js   → PASS
```

Regression: existing tests must still pass (no assertion checks for absence of correlation_id).

---

## 4. Architectural Risk Assessment

**Risk: LOW**

| Concern | Assessment |
|---------|------------|
| Breaking callers that don't pass correlation_id | No — field is `|| null`, callers unaffected |
| Breaking listeners that receive event objects | No — additive field, no listener checks for field absence |
| Breaking the rolling log / forSession() | No — log stores full event objects; forSession() filters on session_id only |
| Breaking viz-broadcaster ring buffer or WS sends | No — payload is `Object.assign({}, event, ...)`, additive |
| Schema migration required | No — event bus is in-memory; events table schema not changed |
| Constitutional test regression | Low — 695 constitutional tests do not assert on event bus field shape |

**No risk of removing or altering existing functionality.** Both changes are additive.

---

## 5. GAP-15/16/22 Current State

These three gaps were in the canonical RX-03 plan but were NOT implemented in RX-03 execution.

### GAP-15 — Memory correction route (PATCH /api/memory/:id)

**Canonical plan task:** RX-03-A — `POST-UX-19-R-SERIES-RECONCILIATION.md` line 166  
**Production state:** `routes/memory.js` has no PATCH route for correction. Confirmed via test assertion in `tests/rx-04-p1.test.js` (P4-13). No `router.patch('/memory/` exists in the file.  
**Status: OPEN, UNSCHEDULED.** Not in RX-04, not in RX-05 canonical plan. Requires scheduling.

### GAP-16 — Memory deletion route (DELETE /api/memory/forget)

**Canonical plan task:** RX-03-B — `POST-UX-19-R-SERIES-RECONCILIATION.md` line 167  
**Production state:** `routes/memory.js` has `DELETE /memory/working/:sessionId` (bulk working memory clear, line 40) but no semantic/episodic correction-targeted delete route. Confirmed via test assertion in `tests/rx-04-p1.test.js` (P4-13).  
**Status: OPEN, UNSCHEDULED.** Not in RX-04, not in RX-05 canonical plan. Requires scheduling.

### GAP-22 — Historical event query API

**Canonical plan task:** RX-03-E — `POST-UX-19-R-SERIES-RECONCILIATION.md` line 170  
**Production state:** No `GET /api/events/log` or paginated event route exists. Only `GET /api/timeline` (20-task window) is available.  
**Note:** GAP-22 appears in the RX-05 dependency table (`POST-UX-19-R-SERIES-RECONCILIATION.md` line 76) as "Parallel / no dependency" but is NOT assigned to any RX-05 task (RX-05-A and RX-05-B cover only GAP-21). It is a distinct Class C (Missing backend route) gap.  
**Status: OPEN, UNSCHEDULED.** Requires explicit sprint assignment.

---

## 6. Discovery: Planning Document Accuracy

| Claim | Accurate? | Finding |
|-------|-----------|---------|
| GAP-21: "parallel, no Wave-3 dependency" | YES | Confirmed — event bus is self-contained |
| GAP-21: files are `lib/event-bus.js` + all emitters | PARTIAL — emitters not required for minimum | Bus-level hoist is sufficient; emitters pass correlation_id from payload if they choose to |
| GAP-14 "depends on GAP-15 + GAP-16" | NOTE | The read-only memory panel (GAP-14) was closed in RX-04 without GAP-15/16. The dependency was for write capability, which remains absent. |

---

## 7. Files Modified (None — Reconnaissance Only)

No production files were modified. This document is the sole output of RX-05 reconnaissance.

---

## Hard Stop

**RX-05 PRE-IMPLEMENTATION RECONNAISSANCE COMPLETE — AWAITING EXPLICIT IMPLEMENTATION AUTHORISATION.**

Do not begin RX-05 implementation. Do not modify `lib/event-bus.js`. Do not modify `lib/viz-broadcaster.js`.
