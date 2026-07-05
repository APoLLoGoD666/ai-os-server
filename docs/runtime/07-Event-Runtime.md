# 07 — Event Runtime

**Date:** 2026-07-02  
**Evidence Source:** lib/event-bus.js, lib/event-consumer.js, lib/ws-handler.js, lib/agent-queue.js, services/init.js

---

## Event System Architecture

APEX uses two distinct event propagation mechanisms:

| Mechanism | File | Pattern | Scope |
|-----------|------|---------|-------|
| In-process event bus | `lib/event-bus.js` | Node.js EventEmitter, in-memory | Same process only |
| DB event consumer | `lib/event-consumer.js` | Polling against Supabase `events` table | Cross-restart persistence |

These do NOT share state. The in-process bus is ephemeral; the DB consumer processes persisted events.

---

## lib/event-bus.js — In-Process Event Bus

**File:** `lib/event-bus.js`  
**Extends:** Node.js `EventEmitter`  
**Max listeners:** 100  
**In-memory log:** Rolling, capped at 200 entries

### All 16 Named Event Types

| Event | Primary Emitter | Primary Consumer(s) |
|-------|----------------|-------------------|
| `VOICE_STARTED` | routes/gemini-live.js | any subscriber |
| `AUDIO_RECEIVED` | routes/gemini-live.js | any subscriber |
| `INTENT_CLASSIFIED` | UNKNOWN | any subscriber |
| `REFLEX_RESPONSE_SENT` | routes/gemini-live.js | any subscriber |
| `CLAUDE_STARTED` | routes/chat | any subscriber |
| `CLAUDE_FIRST_TOKEN` | lib/models/runtime/index.js (setImmediate) | session-state-registry, response-timing-engine |
| `TOOL_DISPATCHED` | tool dispatcher | any subscriber |
| `TOOL_COMPLETED` | tool dispatcher | any subscriber |
| `AGENT_STARTED` | lib/agent-queue.js | services/init.js (Slack notify) |
| `AGENT_COMPLETED` | lib/agent-queue.js | services/init.js (Slack + Notion + Supabase persist) |
| `BACKGROUND_TASK_QUEUED` | lib/agent-queue.js | any subscriber |
| `USER_INTERRUPTED` | routes/gemini-live.js | lib/executive-arbitration-engine.js |
| `SESSION_COMPLETED` | routes/gemini-live.js | lib/strategic-planning-engine.js |
| `MODEL_INVOKED` | lib/models/runtime/index.js (setImmediate) | telemetry |
| `EMAIL_PARSED` | UNKNOWN | UNKNOWN |
| `CALENDAR_EVENT_SYNCED` | UNKNOWN | UNKNOWN |

### emit() vs emitSync()

**`emit(type, payload)`** — dispatches via `setImmediate`. Caller is never blocked. Returns `true` immediately. Event fires asynchronously.

**`emitSync(type, payload)`** — dispatches via `super.emit()` (synchronous). Used when ordering matters. Rare usage.

Both dispatch two EventEmitter events:
1. The specific event type (e.g., `AGENT_STARTED`)
2. The wildcard `'*'` — receives ALL events regardless of type

### Session Filtering

```javascript
bus.forSession(sessionId, n = 100)
// Returns last N events from _log filtered by session_id
```

`session_id` is extracted from `payload.session_id` at emit time.

---

## Event Bus Wiring (services/init.js)

services/init.js connects specific events to action handlers during startup:

```javascript
// If SLACK_BOT_TOKEN present:
bus.on(AGENT_STARTED,   (ev) => slackAgents.notifyRunStart(ev.payload))
bus.on(AGENT_COMPLETED, (ev) => slackAgents.notifyRunComplete(ev.payload))

// If NOTION_API_KEY present:
bus.on(AGENT_COMPLETED, (ev) => notionSync.logAgentRun(ev.payload))

// Always (if any token present):
bus.on(AGENT_COMPLETED, (ev) => {
  supabase.from('apex_agent_runs').insert({
    run_id:    ev.payload.task_id,
    label:     ev.payload.label,
    elapsed_ms: ev.payload.elapsed_ms,
    ok:        ev.payload.ok
  })
  // ON CONFLICT DO NOTHING
  // ON ERROR: slack-alerts.alertError()
})
```

If neither Slack nor Notion tokens are set, **no event handlers are wired** — events are emitted to the bus but nothing acts on them.

---

## lib/agent-queue.js — Task Queue

**File:** `lib/agent-queue.js`  
**Singleton:** Single `AgentQueue` instance exported  
**Max concurrency:** `MAX_CONCURRENCY = 3`  
**Max queue depth:** `MAX_QUEUE_DEPTH = 50`

### enqueue(id, fn, meta)

```
1. If queue.length >= 50 → drop, log error, return
2. If id already in _queue OR _runningIds → skip (dedup)
3. Push { id, fn, meta, queued_at } to _queue
4. bus.emit(BACKGROUND_TASK_QUEUED, { task_id, label, queue_depth })
5. setImmediate → _drain()
```

### _drain() / _run(task)

```
_drain():
  while (_running < 3 && queue.length > 0):
    task = _queue.shift()
    _run(task)

_run(task):
  _running++
  _runningIds.add(task.id)
  tracker.activeAgentRuns++
  
  bus.emit(AGENT_STARTED, { task_id, wait_ms })
  
  try:
    await task.fn()
    bus.emit(AGENT_COMPLETED, { task_id, elapsed_ms, ok: true })
  catch e:
    bus.emit(AGENT_COMPLETED, { task_id, elapsed_ms, ok: false, error })
  finally:
    _running--
    _runningIds.delete(task.id)
    tracker.activeAgentRuns--
    setImmediate → _drain()
```

The queue drains itself: on every task completion, `_drain()` is called via setImmediate to start the next task.

---

## lib/event-consumer.js — DB Event Polling

**File:** `lib/event-consumer.js`  
**Pattern:** Polling consumer (NOT a subscriber to event-bus)  
**Poll interval:** 10 seconds  
**Consumer name:** `pipeline-failure-alert`

### What it Processes

Only one event type: **`pipeline.failed`** from Supabase `events` table.

### Per-Tick Flow

```
_tick() [every 10s]:
  1. Query: SELECT * FROM events WHERE type='pipeline.failed'
            ORDER BY occurred_at ASC LIMIT 20
  2. Query: SELECT event_id FROM consumer_offsets
            WHERE consumer_name='pipeline-failure-alert'
  3. Filter: events not in consumer_offsets
  4. For each unprocessed event:
     _handle(event)
       ├── slack-agents.notifyRunFailed(runId, agent, error, taskDescription)
       │     └── Error silently swallowed
       └── INSERT INTO consumer_offsets(consumer_name, event_id)
                   ON CONFLICT DO NOTHING
```

**At-most-once delivery:** The `consumer_offsets` table tracks processed event IDs. Reprocessing is prevented by `ON CONFLICT DO NOTHING`. However, if Slack notification fails, the event is still marked processed.

**Supabase client:** Lazily created on first tick (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).

**`_timer.unref()`** — The interval is unreffed so it does NOT prevent Node.js process exit.

---

## lib/ws-handler.js — WebSocket Handler

**File:** `lib/ws-handler.js`  
**Library:** `ws` (WebSocketServer)  
**Mode:** `noServer` — attaches to HTTP server upgrade event, NOT a standalone port  
**Compression:** `perMessageDeflate` (zlib level 6, threshold 1KB)

### Connection Authentication

```
GET /ws?token=<APP_ACCESS_KEY>
  → crypto.timingSafeEqual(token, APP_ACCESS_KEY)
  → Fail: socket.destroy() immediately
  → Pass: ws.handleUpgrade(req, socket, head, callback)
```

Sub-paths (`/ws/*`) fall through silently — reserved for e.g., `/ws/gemini-live`. All other paths: `socket.destroy()`.

### Per-Connection State

```javascript
_wsSessions = Map<ws, {
  sessionId: 'ws-<timestamp>-<random>',
  connectedAt: Date,
  channels: Set<string>  // starts with ['system']
}>
```

On connect: sends `{ type: 'connected', sessionId, ts }`.

### Message Types Handled (inbound FROM client)

| `msg.type` | Handler |
|-----------|---------|
| `subscribe` | Adds channels to session Set; replies `{ type: 'subscribed', channels }` |
| `ping` | Replies `{ type: 'pong', ts }` |
| `voice:transcript` | Broadcasts to all sessions in `voice` channel |
| `agent:status` | Broadcasts to all sessions in `agents` channel |
| `browser:snapshot` | Echoes back to sending session only |
| *(unknown)* | Replies `{ type: 'error', message: 'Unknown message type: ...' }` |

### Keepalive Protocol (60s interval)

```
Every 60s:
  For each session in _wsSessions:
    if meta._pongReceived === false:
      ws.terminate()  ← dead socket, kill it
    else:
      meta._pongReceived = false
      ws.ping()
```

### Broadcast Functions (set as globals)

```javascript
global._wsBroadcast = wsBroadcast   // all connections, optional channel filter
global._wsSend = wsSend             // single connection
global._wsChunkedSend = wsChunkedSend  // large payloads, 64KB chunks with seq numbers
```

`global._apexWsCount` — live getter returning `_wsSessions.size`.

### wsChunkedSend Format

```javascript
{
  type: 'chunk',
  seq: i,           // 0-indexed chunk number
  total: totalChunks,
  data: chunkString // substring of serialized payload
}
```

---

## Event Flow Summary

```
Agent task completes
    │
    ▼
agent-queue.js _run():
  bus.emit('AGENT_COMPLETED', { task_id, elapsed_ms, ok, label })
    │
    ├──[setImmediate]──► services/init.js handler:
    │                      slackAgents.notifyRunComplete()
    │                      notionSync.logAgentRun()
    │                      supabase.insert(apex_agent_runs)
    │
    └──[setImmediate]──► executive-arbitration-engine.js:
                           Updates thread state for AGENT_COMPLETED

Pipeline failure written to Supabase `events` table
    │
    ▼ [10 seconds later]
event-consumer.js _tick():
  Reads events WHERE type='pipeline.failed'
  → slack-agents.notifyRunFailed()
  → consumer_offsets.insert() [at-most-once]
```
