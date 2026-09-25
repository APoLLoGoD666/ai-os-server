# RX-05 GAP-21 CERTIFICATION

**Programme:** RX — Production Reconciliation  
**Phase:** RX-05 EVENT INFRASTRUCTURE  
**Date:** 2026-08-28  
**Status:** CERTIFIED CLOSED

---

## 1. Objective

Add `correlation_id` to the event bus event envelope so that callers who supply a correlation identifier have it propagated to all listeners and through the viz-broadcaster WebSocket payloads.

---

## 2. GAP-21 Original Finding

| Field | Value |
|-------|-------|
| Gap ID | GAP-21 |
| UX authority | UX-17 |
| Class | E (Event infrastructure) |
| Priority | P2 |
| Description | Event bus payloads do not carry `correlation_id`. Events cannot be correlated across agent/voice/tool chains. |
| Pre-RX-05 state | `correlation_id` absent from `lib/event-bus.js`, `lib/viz-broadcaster.js`, and all emitter sites. Zero `.js` occurrences. |

---

## 3. Architecture Before Implementation

**`lib/event-bus.js` — event envelope (pre-RX-05):**

```js
const event = {
    type,
    session_id: payload.session_id || null,
    timestamp:  Date.now(),
    payload,
};
```

**`lib/viz-broadcaster.js` — AGENT_STARTED handler (pre-RX-05, representative):**

```js
bus.on(E.AGENT_STARTED, function(event) {
    const ev = event.payload || {};
    emit({ type: 'agent', status: 'started', ok: true, label: ev.label || ev.task_id || '' });
});
```

`correlation_id` was absent from both paths. No emitter passed it; no listener received it.

---

## 4. Exact Implementation

### 4.1 lib/event-bus.js — emit()

`lib/event-bus.js` lines 61–67 — added `correlation_id` field:

```js
const event = {
    type,
    session_id:     payload.session_id     || null,
    correlation_id: payload.correlation_id || null,
    timestamp:      Date.now(),
    payload,
};
```

### 4.2 lib/event-bus.js — emitSync()

`lib/event-bus.js` line 82 — added `correlation_id` field:

```js
const event = { type, session_id: payload.session_id || null, correlation_id: payload.correlation_id || null, timestamp: Date.now(), payload };
```

### 4.3 lib/viz-broadcaster.js — all 11 tapEventBus() handlers

Added `correlation_id: event.correlation_id || null` to each handler's emitted payload. Handlers modified:

| Handler (event type) | Field added |
|---------------------|-------------|
| AGENT_STARTED | `correlation_id: event.correlation_id \|\| null` |
| AGENT_COMPLETED | `correlation_id: event.correlation_id \|\| null` |
| VOICE_STARTED | `correlation_id: event.correlation_id \|\| null` |
| REFLEX_RESPONSE_SENT | `correlation_id: event.correlation_id \|\| null` |
| USER_INTERRUPTED | `correlation_id: event.correlation_id \|\| null` |
| SESSION_COMPLETED | `correlation_id: event.correlation_id \|\| null` |
| TOOL_DISPATCHED | `correlation_id: event.correlation_id \|\| null` |
| TOOL_COMPLETED | `correlation_id: event.correlation_id \|\| null` |
| CLAUDE_STARTED | `correlation_id: event.correlation_id \|\| null` |
| BACKGROUND_TASK_QUEUED | `correlation_id: event.correlation_id \|\| null` |
| MODEL_INVOKED | `correlation_id: event.correlation_id \|\| null` |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `lib/event-bus.js` | +`correlation_id` field in `emit()` and `emitSync()` event objects |
| `lib/viz-broadcaster.js` | +`correlation_id` propagation in all 11 `tapEventBus()` handlers |

## Files Created

| File | Purpose |
|------|---------|
| `tests/rx-05-p1.test.js` | 15-assertion test suite |
| `docs/interface/RX-05-PRE-IMPLEMENTATION-RECONNAISSANCE.md` | Reconnaissance record (created pre-implementation) |
| `docs/interface/RX-05-GAP-21-CERTIFICATION.md` | This document |

---

## 6. Event Contract — Before / After

| Field | Before | After |
|-------|--------|-------|
| `type` | present | present (unchanged) |
| `session_id` | present | present (unchanged) |
| `correlation_id` | **absent** | **present — `null` when not supplied** |
| `timestamp` | present | present (unchanged) |
| `payload` | present | present (unchanged) |

The event envelope is backward-compatible. No existing field was removed or altered.

---

## 7. Correlation Semantics

`correlation_id` records an **explicit relationship** between events belonging to the same execution or activity context. It is not:

- causation (chronological proximity does not imply correlation)
- provenance
- authorization
- execution authority
- an auto-generated identifier

**The event bus does not generate correlation identifiers.** If the caller does not supply `correlation_id` in the payload, the field is `null`. No fabrication occurs.

---

## 8. Null / Absent Behavior

```js
// Caller supplies correlation_id
bus.emit(bus.E.AGENT_STARTED, { session_id: 's1', correlation_id: 'run-xyz' });
// → event.correlation_id === 'run-xyz'

// Caller does not supply correlation_id
bus.emit(bus.E.AGENT_STARTED, { session_id: 's1', task_id: 't1' });
// → event.correlation_id === null
```

`null` is preserved through the ring buffer, `recent()`, `forSession()`, and all viz-broadcaster handlers. No substitution is made.

---

## 9. Viz Propagation

The `tapEventBus()` handlers in `lib/viz-broadcaster.js` now forward `event.correlation_id || null` in each outgoing WebSocket payload. The pattern is:

```js
bus.on(E.AGENT_STARTED, function(event) {
    const ev = event.payload || {};
    emit({ type: 'agent', status: 'started', ok: true, label: ev.label || ev.task_id || '', correlation_id: event.correlation_id || null });
});
```

The viz-broadcaster's internal `emit()` function already uses `Object.assign({}, event, ...)` so `correlation_id` is present in the ring buffer and in all WebSocket broadcasts.

---

## 10. Certification Checklist

| # | Item | Result |
|---|------|--------|
| 1 | `node --check lib/event-bus.js` | PASS |
| 2 | `node --check lib/viz-broadcaster.js` | PASS |
| 3 | P5-01: `emit()` propagates supplied `correlation_id` | PASS |
| 4 | P5-02: `emit()` yields `null` when `correlation_id` absent | PASS |
| 5 | P5-03: `emitSync()` propagates supplied `correlation_id` | PASS |
| 6 | P5-04: `emitSync()` yields `null` when `correlation_id` absent | PASS |
| 7 | P5-05: event envelope has exactly the expected fields | PASS |
| 8 | P5-06: existing typed listeners unaffected | PASS |
| 9 | P5-07: ring buffer stores `correlation_id` correctly | PASS |
| 10 | P5-08: `forSession()` unaffected; `correlation_id` in results | PASS |
| 11 | P5-09: viz-broadcaster receives `correlation_id` on bus events | PASS |
| 12 | P5-10: viz-broadcaster emits `null` when correlation absent | PASS |
| 13 | P5-11: no second event bus introduced | PASS |
| 14 | P5-12: no database dependency in `event-bus.js` | PASS |
| 15 | P5-13: production files outside scope unmodified | PASS |
| 16 | P5-14: no auto-generation of `correlation_id` | PASS |
| 17 | P5-15: async `emit()` path carries `correlation_id` | PASS |
| 18 | `tests/rx-02-p1.test.js` regression | ALL PASS |
| 19 | `tests/rx-03-p1.test.js` regression | ALL PASS |
| 20 | `tests/rx-04-p1.test.js` regression | ALL PASS |

---

## 11. Database Impact

**None.** The event bus is in-memory. No migrations were created. No Supabase tables were altered. The events table schema (`migrations/024_phase0a_event_spine.sql`) was not modified.

---

## 12. ONE-APEX Integrity

| Principle | Status |
|-----------|--------|
| No second runtime | MAINTAINED |
| No second event bus | MAINTAINED |
| No new tracing subsystem | MAINTAINED |
| No new correlation subsystem | MAINTAINED |
| No database schema change | MAINTAINED |
| No frontend change | MAINTAINED |
| `server.js` unmodified | MAINTAINED |
| `routes/*` unmodified | MAINTAINED |
| `public/dashboard.html` unmodified | MAINTAINED |
| Additive only — no existing fields removed | MAINTAINED |

---

## 13. Explicit Exclusions Confirmed

| Item | Status |
|------|--------|
| GAP-15 (Memory correction route) | NOT IMPLEMENTED — remains OPEN |
| GAP-16 (Memory deletion route) | NOT IMPLEMENTED — remains OPEN |
| GAP-22 (Historical event query API) | NOT IMPLEMENTED — remains OPEN |
| GAP-20 (Viz-broadcaster expansion) | NOT IN SCOPE — no new event types added |
| GAP-23 (17-category taxonomy) | NOT IN SCOPE |
| RX-06 | NOT STARTED |
| RX-07 | NOT STARTED |
| Database persistence for `correlation_id` | NOT IMPLEMENTED |
| Frontend correlation UI | NOT IMPLEMENTED |
| Causation inference | NOT IMPLEMENTED |
| Auto-generated correlation IDs | NOT IMPLEMENTED |

---

## 14. Remaining Unscheduled Gaps

| Gap | Description | Status |
|-----|-------------|--------|
| GAP-15 | Memory correction route (PATCH /api/memory/:id) | OPEN — was canonical RX-03-A; not scheduled |
| GAP-16 | Memory deletion route (DELETE /api/memory/forget) | OPEN — was canonical RX-03-B; not scheduled |
| GAP-22 | Historical event query API | OPEN — was canonical RX-03-E; not scheduled |
| GAP-20 | Viz-broadcaster event expansion (Voice, Tool, System, Error) | OPEN — P1 |
| GAP-28 | IBM Plex Sans / Space Grotesk removal | DEFERRED to RX-07 |

---

## RX-05 NOT Continued

**CONFIRMED.** No RX-06 work performed. No RX-07 work performed. Hard stop observed.
