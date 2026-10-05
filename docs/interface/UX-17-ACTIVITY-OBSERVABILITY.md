# UX-17 — ACTIVITY / OBSERVABILITY

**Status:** COMPLETE  
**Date:** 2026-08-28  
**Version:** 1.0  
**Preceded by:** UX-16 SYSTEM / CONSTITUTIONAL  
**Succeeded by:** UX-18 MOBILE / RESPONSIVE (requires explicit authorisation)

---

## 1. Authority

This document is authorised by the UX-17 ACTIVITY / OBSERVABILITY prompt.

The completed UX-05 through UX-16 work is authoritative and must not be reopened.

The completed Knowledge-Gap programme is authoritative and must not be reopened.

ONE PLATFORM. ONE SYSTEM. ONE APEX. ONE EVENT BUS. ONE OBSERVABILITY ARCHITECTURE.

---

## 2. Objective

Define the canonical user-facing experience for APEX's activity, observability, event visibility, audit trail, and real-time state transport layers.

Answer:

> What is APEX doing right now, what did it do, what happened to a specific task, what events have occurred, what is the live state of agents and pipelines, and how can the user understand system activity without private chain-of-thought exposure — all grounded in the production event architecture that actually exists?

---

## 3. Scope

- Canonical activity model (EVENT → CONTEXT → ACTOR → ACTION/STATE → RESULT → EVIDENCE → PROVENANCE → TIMESTAMP → CORRELATION → RESOLUTION)
- In-memory event bus (`lib/event-bus.js`) — 200-event rolling ring buffer
- WebSocket transport (`lib/ws-handler.js`) — three upgrade paths, channel subscriptions
- Viz broadcaster (`lib/viz-broadcaster.js`) — 300-event ring buffer, /ws/viz
- Event spine (`migrations/024_phase0a_event_spine.sql`) — persistent events table, outbox, consumer_offsets
- Event consumer (`lib/event-consumer.js`) — pipeline failure alert consumer
- Activity tables: apex_timeline, apex_agent_runs, apex_agent_stages, apex_notifications, notifications, cron_logs, deployment_events, agent_actions
- Observability transport: /api/intelligence/self-check, /health, /api/timeline, /api/intelligence/agent-runs
- Lifecycle states (12), execution states (8), connection states (5)
- Event category taxonomy (17 categories)
- Progressive disclosure L0–L4 (UX-08)
- Voice integration (UX-07)
- Proactive communication (UX-09)
- Domain integration (UX-10)
- Knowledge activity integration (UX-11)
- Intelligence/decision chain integration (UX-12)
- Agent identity integration (UX-13)
- Action/approval execution integration (UX-14)
- Memory activity integration (UX-15)
- Constitutional/governance activity integration (UX-16)
- Production gaps (10 documented)
- Invariants (46 documented)
- Scenarios V-ACTIVITY-01 through V-ACTIVITY-50

---

## 4. Non-scope

- UX-18 Mobile / Responsive (not authorised)
- UX-19 Integration / E2E Certification (not authorised)
- Building a second event bus
- Building a second observability system
- Building a second audit store
- Modification of any production file
- Modification of any constitutional enforcement
- Modification of any governance write path
- Implementing event-level correlation_id in the in-memory bus (PROPOSED — not in scope to build here)
- Implementing L0-L4 disclosure in production dashboard (PROPOSED — documented gap)
- Implementing a live event API endpoint (PROPOSED — documented gap)

---

## 5. Production Event Architecture

### 5.1 In-Memory Event Bus — PRODUCTION ACTIVE

**File:** `lib/event-bus.js`

The APEX event bus extends Node.js `EventEmitter`. It is the single canonical in-process event transport. There is no second event bus.

**Characteristics:**
- Rolling ring buffer: 200 events maximum (oldest evicted on overflow)
- Non-blocking: all emissions dispatched via `setImmediate()` — callers are never blocked
- Session-scoped API: `forSession(sessionId)` returns a filtered event emitter for session-local consumers
- All events carry the canonical payload structure

**Canonical payload structure:**
```
{
  type:       string,       // canonical event type constant
  session_id: string,       // session identifier
  timestamp:  number,       // Date.now() — milliseconds since epoch
  payload:    object        // event-specific data
}
```

**Canonical event types (PRODUCTION ACTIVE):**

| Type | Category | Description |
|------|----------|-------------|
| VOICE_STARTED | VOICE | Voice session initiated |
| AUDIO_RECEIVED | VOICE | Audio input received from user |
| INTENT_CLASSIFIED | VOICE | Intent classification complete |
| REFLEX_RESPONSE_SENT | RUNTIME | Reflex-class response dispatched |
| CLAUDE_STARTED | AGENT | Claude API call initiated |
| CLAUDE_FIRST_TOKEN | AGENT | First token received from Claude |
| TOOL_DISPATCHED | TOOL | Tool invocation sent |
| TOOL_COMPLETED | TOOL | Tool invocation returned |
| AGENT_STARTED | AGENT | Agent execution begun |
| AGENT_COMPLETED | AGENT | Agent execution finished |
| BACKGROUND_TASK_QUEUED | RUNTIME | Task placed in background queue |
| USER_INTERRUPTED | VOICE | User interrupted active output |
| SESSION_COMPLETED | RUNTIME | Session lifecycle ended |
| MODEL_INVOKED | AGENT | Model API call made |
| EMAIL_PARSED | COMMUNICATION | Email parsed from inbox |
| CALENDAR_EVENT_SYNCED | COMMUNICATION | Calendar event synchronised |
| CIVILIZATION_OPPORTUNITY_EXECUTE | ACTION | Civilisation opportunity execution triggered |

**What the in-memory bus does NOT have (MISSING — documented):**
- `correlation_id` field (no event-level correlation chain in the bus)
- `causation_id` field (no causation linkage between events in the bus)
- `agent_id` field (agent identity is in agent_runs, not bus events)
- Category field (taxonomy not applied to bus events in production)
- No public API endpoint to query the bus log as a list

### 5.2 WebSocket Handler — PRODUCTION ACTIVE

**File:** `lib/ws-handler.js`

The WebSocket handler provides the real-time transport layer for APEX. It is the single canonical WebSocket subsystem.

**Three upgrade paths:**

| Path | Auth | Purpose |
|------|------|---------|
| /ws | access-key protected | Main real-time channel |
| /ws/viz | open | Visualization channel |
| /ws/gemini-live | open | Voice/Gemini live channel |

**Channel subscriptions:**
- `system` — system events and state
- `voice` — voice session events
- `agents` — agent status events

**Session registry:**
`Map<ws, { sessionId, connectedAt, channels: Set, _pongReceived: boolean }>`

**Global broadcast functions (production):**
- `global._wsBroadcast(data)` — send to all connected clients
- `global._wsSend(ws, data)` — send to single client
- `global._wsChunkedSend(ws, data)` — chunked delivery for large payloads

**Keepalive:** 60-second ping/pong cycle. `_pongReceived` flag per session. Clients that fail to pong are terminated.

**Compression:** `perMessageDeflate` enabled. Threshold: 1 KB (payloads under 1 KB are not compressed).

**Inbound message types (client → server):**

| Type | Purpose |
|------|---------|
| subscribe | Subscribe to a named channel |
| ping | Client keepalive ping |
| voice:transcript | Voice transcript from client |
| agent:status | Agent status update from client |
| browser:snapshot | Browser state snapshot from client |

**Outbound message types (server → client):**

| Type | Purpose |
|------|---------|
| connected | Connection confirmed, sessionId assigned |
| subscribed | Channel subscription confirmed |
| pong | Keepalive response |
| chunk | Chunked payload delivery |
| voice:transcript | Voice transcript relay |
| agent:status | Agent status update |
| error | Error notification |

### 5.3 Viz Broadcaster — PRODUCTION ACTIVE

**File:** `lib/viz-broadcaster.js`

The viz broadcaster is a ring-buffered, single-topic broadcast layer for agent activity visualisation.

**Characteristics:**
- Ring buffer: 300 events
- Endpoint: /ws/viz (open, no auth)
- Taps the event bus for: `AGENT_STARTED`, `AGENT_COMPLETED`
- On new subscriber connect: full ring buffer history sent immediately

**Outbound event shape:**
```
{
  type:   'agent',
  status: 'started' | 'completed' | 'failed',
  ok:     boolean,
  label:  string
}
```

**What viz does NOT cover (gap):** Tool dispatches, constitutional decisions, memory writes, knowledge updates, voice events, and approval state changes are not surfaced through the viz channel.

### 5.4 Event Spine — WIRED (PARTIAL)

**File:** `migrations/024_phase0a_event_spine.sql`

The event spine provides durable, queryable event persistence. The migration exists and has been applied.

**Schema:**

`events` table:
```
event_id         UUID PRIMARY KEY
idempotency_key  TEXT UNIQUE
source           TEXT
type             TEXT
entity_refs      UUID[]
payload          JSONB
content_hash     TEXT
occurred_at      TIMESTAMPTZ
ingested_at      TIMESTAMPTZ
```

`outbox` table (transactional staging):
```
id               BIGSERIAL PRIMARY KEY
idempotency_key  TEXT UNIQUE
source           TEXT
type             TEXT
entity_refs      UUID[]
payload          JSONB
occurred_at      TIMESTAMPTZ
created_at       TIMESTAMPTZ
relayed_at       TIMESTAMPTZ
```

`consumer_offsets` table (idempotency for consumers):
```
consumer_name    TEXT
last_event_id    UUID
last_processed   TIMESTAMPTZ
```

**Pattern:** write to outbox → async relay to events → consumer processes → marks consumer_offsets offset.

**Status:** Migration exists and is applied. The outbox-to-events relay loop is NOT confirmed fully active. This is a documented production gap (Gap 6).

### 5.5 Event Consumer — PRODUCTION ACTIVE (LIMITED)

**File:** `lib/event-consumer.js`

**Consumer name:** `pipeline-failure-alert`

**Handles:** `pipeline.failed` events ONLY. No other event types are consumed.

**Polling:** every 10 seconds, batch size 20.

**Action on event:** sends Slack notification.

**Idempotency:** marks `consumer_offsets` after processing to prevent duplicate alerts.

**Gap:** only one consumer exists, handling only one event type. The full range of canonical event types (17 in the bus; all types in the spine) has no consumer routing. This is documented production gap (Gap 5).

---

## 6. Production Activity Architecture

### 6.1 apex_timeline Table — PRODUCTION ACTIVE

**Purpose:** Task completion history.

**Fields:**
```
task_id         TEXT
objective       TEXT
commit_hash     TEXT
files_changed   JSONB
duration        INTEGER (ms)
completed_at    TIMESTAMPTZ
agent_logs      JSONB
success         BOOLEAN
error           TEXT
```

**Populated by:** `lib/auto-pipeline.js` on both success and failure.

**Route:** `GET /api/timeline` — returns 20 most recent entries. Hard limit of 20 (documented gap 9).

### 6.2 apex_agent_runs Table — PRODUCTION ACTIVE

**Purpose:** Pipeline execution audit log.

**Fields:**
```
task_id         TEXT
success         BOOLEAN
cost_usd        NUMERIC
model           TEXT
created_at      TIMESTAMPTZ
duration_ms     INTEGER
```

**Route:** `GET /api/intelligence/agent-runs`

### 6.3 apex_agent_stages Table — PRODUCTION ACTIVE

**Purpose:** Per-stage breakdown within a pipeline run.

**Fields:**
```
task_id         TEXT
stage           TEXT
success         BOOLEAN
error           TEXT
duration_ms     INTEGER
created_at      TIMESTAMPTZ
```

No dedicated public route confirmed. Data available via forensic query engine (UX-16 § 5.9, Q10).

### 6.4 apex_notifications Table — PRODUCTION ACTIVE

**Purpose:** Async task queue for master task system.

**Fields:**
```
type            TEXT   (master_task | master_run | permission)
message         JSONB
read            BOOLEAN
```

**Used by:** `src/routes/master.js`. Internal task queue — not the user-facing notification feed.

### 6.5 notifications Table — PRODUCTION ACTIVE

**Purpose:** User-facing notification feed.

**Fields:**
```
type            TEXT
title           TEXT
message         TEXT
event_key       TEXT
related_type    TEXT
related_id      TEXT
read            BOOLEAN
created_at      TIMESTAMPTZ
```

**Deduplication:** 60-second window by `event_key`. Hard-coded (documented gap 8).

**Routes:**
- `GET /notifications` — returns 50 most recent
- `POST /notifications/{id}/read` — mark as read

### 6.6 cron_logs Table — PRODUCTION ACTIVE

**Purpose:** Scheduled job execution audit.

**Fields:**
```
job_name        TEXT
status          TEXT
duration_ms     INTEGER
ran_at          TIMESTAMPTZ
```

No dedicated public route confirmed beyond governance forensics.

### 6.7 deployment_events Table — PRODUCTION ACTIVE

**Purpose:** Deployment audit log.

**Fields:**
```
deploy_id       TEXT
commit_sha      TEXT
build_version   TEXT
status          TEXT
metadata        JSONB
created_at      TIMESTAMPTZ
```

### 6.8 agent_actions Table — PRODUCTION ACTIVE

**Purpose:** Agent action audit log.

**Fields:**
```
action_type     TEXT
status          TEXT
request         JSONB
result          JSONB
created_at      TIMESTAMPTZ
```

---

## 7. Observability Transport — PRODUCTION ACTIVE

### 7.1 Self-Check

**Route:** `GET /api/intelligence/self-check`

9 subsystems checked:

| Subsystem | Check Type |
|-----------|-----------|
| memory | DB connectivity + memory gateway |
| supabase | Supabase client connectivity |
| event-bus | In-memory bus health |
| agent-queue | Queue depth and state |
| vault | Vault connectivity |
| embeddings | Embedding service reachability |
| notion | Notion API connectivity |
| slack | Slack webhook reachability |
| sentry | Sentry transport reachability |

Result: per-subsystem status. Not an aggregate health score.

### 7.2 Health

**Route:** `GET /health`

Returns:
- DB status
- TTS status
- AI provider status
- Memory usage
- WebSocket connection count
- Recent errors (list)

### 7.3 Timeline

**Route:** `GET /api/timeline`

Returns 20 most recent `apex_timeline` entries. Includes success/failure flag, duration, objective, files changed. Hard limit of 20 — no pagination.

### 7.4 Agent Runs

**Route:** `GET /api/intelligence/agent-runs`

Returns `apex_agent_runs` entries. Per-run cost, model, duration, success flag.

### 7.5 In-Memory Event Log

200-event rolling ring buffer in `lib/event-bus.js`. No public API endpoint to retrieve it as a list. Observable only by consumers who subscribe to the EventEmitter directly. This is documented production gap (Gap 1).

### 7.6 Viz Channel

`/ws/viz` — 300-event ring buffer. Delivers `AGENT_STARTED` and `AGENT_COMPLETED` events to viz subscribers. History delivered on connect.

---

## 8. Canonical Activity Model

The canonical activity model defines how every observable event is structured for presentation purposes. This model governs all UX-17 surfaces — it does not modify the production event payload.

```
EVENT
  → CONTEXT     (what state was APEX in when this occurred)
    → ACTOR      (who or what caused this event — agent, user, system, cron)
      → ACTION / STATE  (what action was taken, or what state change occurred)
        → RESULT         (outcome: success, failure, partial, unknown)
          → EVIDENCE      (what persisted proof exists — governance record, timeline entry)
            → PROVENANCE   (what is the basis for this event's occurrence)
              → TIMESTAMP   (when it occurred — Date.now() from event bus, or DB timestamp)
                → CORRELATION  (what other events is this related to — where correlation exists)
                  → RESOLUTION  (final state: completed, failed, cancelled, deferred, expired)
```

**Critical:** Correlation is only shown where a correlation_id or explicit linkage exists in the data. Causation is NEVER inferred from chronology alone. If two events occurred sequentially, that is not evidence they are causally related unless an explicit linkage field is present.

---

## 9. Lifecycle States

These are the canonical lifecycle states for any observable activity item in UX-17.

| State | Meaning |
|-------|---------|
| CREATED | Activity record created, not yet queued or started |
| QUEUED | Placed in execution queue, awaiting worker |
| STARTED | Worker has begun processing |
| IN_PROGRESS | Active execution underway |
| WAITING | Paused, waiting for a dependency or condition |
| AWAITING_APPROVAL | Halted, requires user approval before continuing |
| BLOCKED | Blocked by constitutional gate, policy, or governance rule |
| COMPLETED | Successfully finished |
| FAILED | Execution failed with error |
| CANCELLED | Explicitly cancelled before completion |
| DEFERRED | Postponed to a future time |
| EXPIRED | Time limit elapsed without completion |

Unknown state: if a record's state cannot be determined from available data, it is presented as UNKNOWN. Unknown is never resolved to a guess.

### 9.1 Execution States

Execution-phase states that apply specifically to action/approval workflows (integrates UX-14):

| State | Meaning |
|-------|---------|
| PROPOSED | Action proposed, not yet submitted for approval |
| APPROVAL_REQUIRED | Approval gate triggered, awaiting user |
| APPROVED | User granted approval |
| EXECUTING | Execution underway |
| EXECUTED | Execution complete |
| FAILED | Execution failed |
| CANCELLED | Cancelled before execution |
| NOT_EXECUTED | Approved but not executed; or proposed and withdrawn |

### 9.2 Connection States

Real-time transport connection states (applies to WebSocket channels):

| State | Meaning |
|-------|---------|
| LIVE | WebSocket connected, receiving events |
| DEGRADED | Connected but experiencing latency or partial delivery |
| DISCONNECTED | Connection lost |
| RECONNECTING | Attempting to re-establish connection |
| STALE | Connected but no events received within expected window; data may be outdated |

Stale data is always marked stale. Disconnected state is always visible. The user is never left with no indicator when the real-time channel is unavailable.

---

## 10. Event Category Taxonomy

The canonical category taxonomy for UX-17. These categories are the design-layer grouping for activity presentation. They are NOT currently applied to in-memory bus events in production (documented gap 3 — no category taxonomy in production events). They are the proposed presentation taxonomy.

| Category | Covers |
|----------|--------|
| SYSTEM | Server health, runtime bootstrap, startup/shutdown events |
| RUNTIME | Execution class events, reflex responses, background queue |
| CONSTITUTIONAL | Constitutional gate evaluations, verdicts, blocked requests |
| GOVERNANCE | Governance writes, certifications, anomalies, SLOs, policy decisions |
| DECISION | Intelligence chain outputs, recommendations, proposals |
| AGENT | Agent start, completion, failure, stage transitions |
| ACTION | Action execution, tool dispatches, file operations |
| APPROVAL | Approval requests, grants, standing approval matches |
| TOOL | Tool invocations, completions, errors |
| MEMORY | Memory writes, reads, consolidations, corrections, deletions |
| KNOWLEDGE | Knowledge discovery, evidence, contradiction, gap lifecycle |
| VOICE | Voice session start, audio, intent, interruption, completion |
| COMMUNICATION | Email parsed, calendar synced, notification sent |
| NOTIFICATION | User-facing notification created, read, expired |
| ERROR | Errors, exceptions, failures across any subsystem |
| SECURITY | Auth events, access denials, key rotations, anomaly flags |
| USER | User-initiated events: commands, approvals, dismissals |

---

## 11. Activity Model Integration with UX-05 through UX-16

### 11.1 Design Tokens (UX-05)

Activity surfaces use the canonical UX-05 design token system. Key tokens for activity:

| Token | Value | Use |
|-------|-------|-----|
| bg | #0a0a0f | Activity panel background |
| surface | #111118 | Event row / card surface |
| accent | #6b6bff | Live indicator, active state |
| text-primary | — | Event label, actor name |
| text-secondary | — | Timestamp, secondary metadata |
| success colour | — | COMPLETED, EXECUTED states |
| error colour | — | FAILED, BLOCKED states |
| warning colour | — | DEGRADED, STALE, UNKNOWN states |
| muted colour | — | CANCELLED, DEFERRED, EXPIRED states |

Status colours are never used alone. Every status has a text label. No colour-only semantics.

### 11.2 Command Centre (UX-06)

Activity is accessible from the Command Centre surface. The command surface may surface:
- Recent activity summary (L0)
- Live event count and connection state
- Quick access to timeline
- Notification count

No second activity surface is created. The activity feed is one surface, accessible from Command Centre.

### 11.3 Voice States (UX-07)

Voice activity maps directly to the canonical UX-07 voice state machine. Activity events generated by voice sessions use the UX-07 state vocabulary:

| UX-07 State | Activity Event |
|-------------|---------------|
| ACTIVATING | VOICE_STARTED |
| LISTENING | AUDIO_RECEIVED |
| UNDERSTANDING | INTENT_CLASSIFIED |
| THINKING | CLAUDE_STARTED |
| SPEAKING | CLAUDE_FIRST_TOKEN (first token in) |
| INTERRUPTED | USER_INTERRUPTED |
| PAUSED | — (state held) |
| LIVE | SESSION active |
| FAILED | Error event in voice session |
| CANCELLED | USER_INTERRUPTED + no resume |
| IDLE | SESSION_COMPLETED |

Voice activity is visible in the VOICE category. No second voice activity model.

### 11.4 Contextual Presentation (UX-08)

All activity surfaces implement UX-08 progressive disclosure. Default is L0. Escalation on user request.

| L-Level | Shows in Activity |
|---------|-----------------|
| L0 | Event type, actor, status, timestamp |
| L1 | Event category, session context, brief description |
| L2 | Full event payload (non-sensitive), correlation (if present) |
| L3 | Evidence linkage (governance record, timeline entry), provenance |
| L4 | Raw event data, all fields, full audit trail, DB record links |

L4 is never shown automatically. Private chain-of-thought is never exposed at any level.

### 11.5 Proactive Communication (UX-09)

Activity events enter the proactive communication pipeline only when materially relevant. The full UX-09 proactive lifecycle applies:

```
GENERATED → EVALUATED → SUPPRESSED / QUEUED → PRESENTED / DELIVERED → ACKNOWLEDGED / DISMISSED / DEFERRED / RESOLVED / EXPIRED
```

Candidates for proactive activity notification:
- Pipeline failure (pipeline.failed — currently handled by event consumer)
- Agent blocked (constitutional gate)
- Approval required (AWAITING_APPROVAL state)
- Session completed after extended run
- Critical anomaly detected (anomalies table, >50% deviation)
- Connection state degraded or lost

Do not notify for every event in the bus. Use relevance and attention semantics from UX-09.

### 11.6 Domain Lenses (UX-10)

Activity may be filtered by domain lens (Finance, System, File, Uni, Business). Domain filtering applies at the presentation layer — it does not create a second event stream. One event bus. One observability system. Domain lens = view filter over the canonical activity feed.

### 11.7 Knowledge Activity (UX-11)

Knowledge events are surfaced in the KNOWLEDGE category. Knowledge activity types:

| Activity | Event Description |
|----------|-----------------|
| discovered | New knowledge item created |
| evidence added | Evidence block appended to knowledge item |
| contradiction | Conflicting knowledge items identified |
| gap created | Knowledge gap opened |
| gap resolved | Knowledge gap closed |
| status changed | Knowledge item status transition |

Knowledge activity is observability only. Knowledge activity cannot grant authority, authorise execution, or bypass governance.

### 11.8 Intelligence / Decision Chain (UX-12)

Decision chain activity is surfaced in the DECISION category. The full UX-12 chain is observable:

```
OBSERVATION → INTERPRETATION → RECOMMENDATION → PROPOSAL → DECISION → ACTION
```

Each stage transition is an observable activity event where evidence exists. A recommendation event is not an authorised action event. The chain is observable — it is not the authority chain.

### 11.9 Agent Activity (UX-13)

Agent activity is surfaced in the AGENT category. Each observable agent event carries (where available):
- Agent identity (name, type, capability context)
- Task being executed
- Current lifecycle state
- Authority context (what authority level is in effect)
- Outcome (on completion or failure)

Agent activity is observability. Agent activity is not agent authority. An agent appearing ACTIVE in the activity feed does not mean it has authority to execute actions beyond its approved scope.

### 11.10 Action / Approval Activity (UX-14)

Action and approval activity is surfaced in the ACTION and APPROVAL categories. Execution states from UX-14 map directly to UX-17 execution states (Section 9.1).

Observable events include:
- Approval requested
- User approved / rejected
- Standing approval matched
- Execution started
- Execution completed / failed
- Action undone (REVERSIBLE only)

An approval event in the activity feed confirms approval was granted. It does not confirm execution was completed. Execution is a separate event.

### 11.11 Memory Activity (UX-15)

Memory activity is surfaced in the MEMORY category. Memory activity types:

| Activity | Description |
|----------|-------------|
| created | New memory item stored |
| updated | Existing memory item modified |
| consolidated | Multiple memory items merged |
| corrected | Memory item corrected (error or contradiction resolved) |
| forgotten/deleted | Memory item removed or expired |

Memory activity is observability. Memory activity cannot grant authority, authorise execution, or bypass governance.

### 11.12 Constitutional / Governance Activity (UX-16)

Constitutional and governance activity is surfaced in the CONSTITUTIONAL and GOVERNANCE categories. UX-16 establishes the canonical data sources:

| Source | UX-17 Category |
|--------|---------------|
| execution_graphs | AGENT, ACTION |
| system_events | SYSTEM, RUNTIME |
| agent_decisions | DECISION, AGENT |
| otel_spans | SYSTEM (trace) |
| constitutional_records | CONSTITUTIONAL |
| policy_decisions | GOVERNANCE |
| evidence_blocks | GOVERNANCE |
| anomalies | GOVERNANCE, ERROR |
| incidents | GOVERNANCE, ERROR |
| certifications | GOVERNANCE |

Constitutional activity is observability. Constitutional activity does not replace the constitutional source of truth (lib/runtime/constitutional-gate.js, lib/constitution/spec.js).

---

## 12. Real-Time Feed Design

### 12.1 Feed Structure

The activity feed is a time-ordered stream of observable events. Each event row in the feed contains:

```
[CATEGORY BADGE]  [ACTOR]  [ACTION / STATE LABEL]  [TIMESTAMP]  [STATUS INDICATOR]
```

On expand (L1):
```
[CATEGORY BADGE]  [ACTOR]  [ACTION / STATE LABEL]  [TIMESTAMP]  [STATUS INDICATOR]
[SESSION ID]  [BRIEF DESCRIPTION]  [CORRELATION — if present]
```

On full expand (L2+):
Per Section 11.4 progressive disclosure.

### 12.2 Connection State Banner

A persistent connection state indicator is shown at all times when the real-time channel is active. States: LIVE (accent colour + live indicator), DEGRADED (warning), DISCONNECTED (error), RECONNECTING (animated), STALE (warning + "data may be outdated").

Stale is triggered when connected but no events received within expected window. The threshold is a design-layer setting, not a production config change.

### 12.3 Ring Buffer Boundary

The in-memory event bus holds 200 events. The viz broadcaster holds 300 events. Events older than the ring buffer are not retrievable from the bus (they may be in the persistent events table if the outbox relay is active — but the relay is not confirmed fully active). The feed must clearly indicate when it is showing "last N events" vs. a complete history.

When the ring buffer boundary is reached, the feed shows: "Showing last [N] events. Earlier events may not be available."

### 12.4 No Live Event API

There is currently no API endpoint to retrieve the in-memory event bus log as a paginated list. The feed can only show:
- Events received over the WebSocket connection since the page loaded
- The 300-event viz ring buffer (via /ws/viz, AGENT_STARTED/COMPLETED only)
- The 20-entry apex_timeline (completed tasks only, via /api/timeline)
- The 50-entry notifications feed (user-facing notifications, via /notifications)

This is production gap 1. The design must communicate this boundary clearly — it does not fabricate a history that does not exist.

---

## 13. Timeline Surface

The timeline surface presents completed pipeline activity from `apex_timeline`.

**Data source:** `GET /api/timeline` — 20 most recent entries.

**Each entry shows (L0):**
- Objective (task description)
- Status: COMPLETED / FAILED
- Duration (ms → human readable)
- Completed at (timestamp)

**On expand (L1):**
- Files changed (from JSONB)
- Commit hash (if present)
- Success flag

**On full expand (L2):**
- Agent logs (from JSONB)
- Error message (if failed)

**On L3:**
- Link to forensic query engine (UX-16 §5.9) for this task_id — 16 structured answers

**Boundary:** Hard limit of 20 entries. No pagination. Earlier entries are not retrievable via this route. This is production gap 9. The surface must state "Showing 20 most recent" — not "Showing all history."

---

## 14. Agent Runs Surface

The agent runs surface presents pipeline execution audit data from `apex_agent_runs`.

**Data source:** `GET /api/intelligence/agent-runs`

**Each entry shows:**
- Task ID
- Model used
- Cost (USD)
- Duration (ms → human readable)
- Success / Failed
- Created at

Relates to `apex_agent_stages` for per-stage detail (no direct public route — via forensics).

---

## 15. Self-Check Surface

The self-check surface presents the 9-subsystem health check.

**Data source:** `GET /api/intelligence/self-check`

**Presentation:**

Each subsystem shown as a row:
```
[SUBSYSTEM NAME]  [STATUS: UP / DOWN / DEGRADED / UNKNOWN]
```

Connection state is not inferred — shown exactly as returned by self-check. A subsystem reported as DOWN is shown as DOWN. Unknown is shown as UNKNOWN.

Self-check is a snapshot — not a live feed. The timestamp of the check is shown. If the check was performed more than N minutes ago, the data is marked STALE.

---

## 16. Notification Feed Surface

**Data source:** `GET /notifications` — 50 most recent user-facing notifications.

**Each notification shows:**
- Type
- Title
- Message
- Read / Unread state
- Created at

**Mark as read:** `POST /notifications/{id}/read`

**Deduplication note:** 60-second dedup window by `event_key`. If the same event fires multiple times within 60 seconds, only one notification is created. This is a production constraint (gap 8) — the design does not attempt to work around it.

---

## 17. Evidence and Provenance in Activity

Every activity item that has a persistence record must link to that record.

**Evidence linkage rules:**
- `apex_timeline` entry → linked from completed task activity item
- `apex_agent_runs` entry → linked from agent run activity item
- `evidence_blocks` entry → linked from governance activity item (where present)
- `certifications` entry → linked from pipeline certification activity item
- `constitutional_records` entry → linked from constitutional gate activity item (where record exists)
- `otel_spans` entry → linked from trace-enabled activity item (where present)

**Provenance rules:**
- Timestamps come from `Date.now()` at event emission (in-memory bus) or `occurred_at`/`created_at` (DB records). Timestamps are never fabricated.
- Actors come from the request identity chain (kernel Gate 1) or agent registration. Actors are never fabricated.
- Correlation is shown only where a correlation field explicitly links events. Chronological proximity alone is not correlation.
- If a record does not exist, it is reported as absent — not fabricated.

---

## 18. Progressive Disclosure

Integrates UX-08.

| Level | Shows in Activity |
|-------|-----------------|
| L0 | Event type label, actor, status badge, relative timestamp |
| L1 | Category, session ID, brief event description, absolute timestamp |
| L2 | Full non-sensitive payload, correlation chain (if present), provenance note |
| L3 | Evidence linkage, governance record reference, DB record link |
| L4 | Raw event data, all available fields, full forensic trail |

L4 must be explicitly requested. It is never shown by default.

Private chain-of-thought — the model's internal reasoning — is never exposed at any disclosure level.

---

## 19. Failure Visibility

Failure is always visible. Failed activity is never silently converted to success.

| Failure Type | Visibility in Feed |
|-------------|-------------------|
| Pipeline failure | FAILED status on apex_timeline entry |
| Agent failure | AGENT_COMPLETED with failure flag; viz 'failed' status |
| Tool failure | TOOL_COMPLETED with error payload |
| Constitutional block | BLOCKED status; constitutional gate verdict |
| Governance write failure | Fire-and-forget — not surfaced in activity feed (caller unaffected) |
| Approval rejection | CANCELLED / NOT_EXECUTED state on action |
| Event consumer failure | Not surfaced (internal — no user-facing route) |
| WebSocket disconnect | DISCONNECTED connection state banner |
| Self-check subsystem down | DOWN status on subsystem row |
| Stale data | STALE label on affected data |

**Governance write failure:** governance writes are fire-and-forget by constitutional design. A failed governance write does not appear in the activity feed — it does not crash the caller. This is a known design characteristic of the governance architecture, not a gap.

---

## 20. Cancelled and Blocked Activity Visibility

Cancelled activity is always visible. Blocked activity is always visible.

- CANCELLED: shown with CANCELLED status badge. Actor, timestamp, and cancellation reason (if available) shown.
- BLOCKED: shown with BLOCKED status badge. The blocking determination (constitutional gate, policy, governance rule) shown at L1. The specific rule or risk identifier shown at L2. Full audit trail at L3/L4.

Blocked does not become hidden. Cancelled does not become hidden. A user who cancelled an action can see that it was cancelled.

---

## 21. Unknown State Handling

If the state of an activity item cannot be determined from available data:

- State is shown as UNKNOWN (not resolved to a guess)
- Confidence is not rounded up to certainty
- If the event bus record exists but the DB record does not, the state is UNKNOWN (not COMPLETED)
- If the DB record exists but the event bus record does not, the state is taken from the DB record
- Stale data (ring buffer evicted, relay not confirmed) is shown as STALE / UNKNOWN with explanation

---

## 22. Voice Integration

Integrates UX-07.

Users may ask activity queries by voice. These resolve to the same canonical activity model. No second activity explanation pathway for voice.

Example voice queries and canonical responses:
- "What's happening right now?" → current lifecycle states of active agents and voice session
- "What did you just do?" → most recent apex_timeline or agent_runs entry
- "Why did that fail?" → FAILED status + error field + (L2) payload detail
- "Was that approved?" → approval event from action/approval activity (if present)
- "What tools did you use?" → TOOL_DISPATCHED events for current session
- "Show me recent activity." → last N events from feed
- "Is everything OK?" → self-check summary + connection state

Voice uses the same canonical information. No voice-specific activity model.

---

## 23. Proactive Communication Integration

Integrates UX-09.

Activity events that are materially relevant to the user enter the proactive pipeline. The full UX-09 lifecycle (GENERATED → EVALUATED → SUPPRESSED/QUEUED → PRESENTED/DELIVERED → ACKNOWLEDGED/DISMISSED/DEFERRED/RESOLVED/EXPIRED) applies.

Proactive activity notifications:
- Pipeline failure — `pipeline.failed` event (currently handled by event consumer → Slack)
- Approval required — AWAITING_APPROVAL state reached
- Agent blocked — constitutional gate BLOCKED verdict
- Session completed — SESSION_COMPLETED after extended run
- Critical anomaly — anomalies table, >50% deviation
- Connection degraded or lost — WebSocket state change

The 60-second dedup window on the notifications table limits notification frequency (production gap 8). This is a known production constraint.

---

## 24. Domain Integration

Integrates UX-10.

Domain lens filters activity to events relevant to that domain's operations. Domains: Finance, System, File, Uni, Business.

Domain filtering is a presentation-layer view filter. It does not create a separate event stream. The event bus is not partitioned by domain. Domain lens = category and actor filter applied to the canonical activity feed.

---

## 25. Memory Activity

Integrates UX-15.

Memory activity is observable where the memory gateway produces events. Observable memory activity:
- Memory written (storeMemory() call completed)
- Memory retrieved (getContext() / searchMemory() result returned)
- Memory consolidated
- Memory corrected
- Memory item forgotten / deleted

Memory activity is observability only. Memory activity cannot grant authority. Memory activity cannot bypass governance. Memory writes to Layer 0 and Layer 11 produce governance audit trail (P23 — UX-16 §12, §36).

---

## 26. Knowledge Activity

Integrates UX-11.

Knowledge activity is observable where the knowledge pipeline produces records. Observable knowledge activity:
- Knowledge item discovered
- Evidence appended
- Contradiction identified
- Gap created
- Gap resolved
- Status changed

Knowledge activity is observability only. Knowledge activity cannot grant authority. Unknown, stale, conflicting, or uncertain knowledge remains visible. Knowledge activity does not reopen the Knowledge-Gap programme.

---

## 27. Constitutional and Governance Activity

Integrates UX-16.

Constitutional and governance activity visible in UX-17:
- Constitutional gate evaluation result (ALLOW/WARN/RESTRICT/DENY) where verdict is WARN, RESTRICT, or DENY
- Blocked request (constitutionBlocked flag)
- Certification issued, partial, or denied
- Anomaly detected (>50% deviation)
- Incident created or resolved
- SLO violation recorded
- Policy decision recorded

Constitutional activity does not replace the constitutional source of truth. Governance activity does not replace the governance source of truth. UX-17 surfaces these as observable events — it does not modify how they are generated.

---

## 28. Security and Privacy in Activity

**What may safely be shown in the activity feed:**
- Event type and category
- Actor identity (agent name, system component, user indicator)
- Lifecycle and execution state
- Timestamps
- Session ID (anonymised or hashed for shared displays)
- Status outcomes (COMPLETED, FAILED, BLOCKED, etc.)
- Constitutional determination (ALLOW/WARN/RESTRICT/DENY) on blocked/warned events
- Risk identifiers (RISK_CRITICAL, AUTHORITY_REJECTED, etc.)
- Notification title and type

**What must NOT be shown:**
- Secrets, credentials, or environment variables
- Private chain-of-thought (model internal reasoning)
- Protected people (lib/founder/privacy-guard.js — P05, P08)
- Raw memory layer 0 content to AGENT class
- Another user's private data
- Full payload of events that contain PII (payload must be redacted at L0/L1; L3/L4 require explicit user request and access check)
- Webhook URLs or internal routing paths

---

## 29. Explanation Model

Every activity item must be explainable. Canonical explanation structure:

```
EVENT
  → CONTEXT       (what state was APEX in — session, domain, execution class)
    → ACTOR        (who or what caused it)
      → ACTION / STATE  (what happened)
        → APPLICABLE RULE  (if blocked/warned: which constitutional principle or policy)
          → DETERMINATION  (outcome verdict)
            → RESULT        (what changed in the world, or what did not change)
              → EVIDENCE     (what record exists to verify this)
```

This explanation model is an auditable trail — not an exposure of private chain-of-thought. The model's internal reasoning is never surfaced. Only the observable facts and their governing basis are shown.

---

## 30. Auditability in Activity

Activity is auditable where evidence exists.

**Auditable via activity surfaces:**
- Which tasks ran (apex_timeline — 20 most recent)
- Which pipeline succeeded or failed (apex_agent_runs)
- Which agent stages ran (apex_agent_stages — via forensics)
- What notifications were sent (notifications table — 50 most recent)
- Which subsystems are healthy (self-check)
- Agent start/completion (viz channel — 300 event buffer)
- WebSocket session state (session registry)
- Pipeline forensics (GET /api/governance/forensics/:taskId — 16 Q&A from UX-16)

**Not auditable via activity surfaces (gaps):**
- Full event bus log (no API, ring buffer only)
- Events older than ring buffer (not retrievable unless spine relay is active)
- Historical events beyond /api/timeline 20-entry limit
- Searchable cross-event query (no search API)

---

## 31. Correlation

Correlation is shown only where explicit linkage exists.

**Existing explicit linkage:**
- `task_id` links apex_timeline → apex_agent_runs → apex_agent_stages → forensics
- `session_id` on in-memory bus events links events within a session
- `trace_id` in governance pipeline links pipeline events to governance records
- `idempotency_key` on outbox/events table links transactional staging to durable events

**What is NOT in the in-memory bus (MISSING — gap 2):**
- `correlation_id` (no cross-session or cross-request correlation in bus events)
- `causation_id` (no explicit causation chain in bus events)

Where correlation_id does not exist, events from the same session_id are the best available grouping — but session_id proximity is not causation.

---

## 32. Timestamp Handling

All timestamps in the activity feed are sourced from the data, not inferred.

- In-memory bus events: `Date.now()` at emission time (milliseconds since epoch)
- DB records: `occurred_at`, `ingested_at`, `created_at`, `completed_at` as appropriate
- Timestamps are displayed as both relative ("3 minutes ago") and absolute (ISO 8601) at L1
- Timestamps are never fabricated
- If a timestamp field is null or missing, the display shows "timestamp unavailable" — not a fabricated value
- Timezone: all absolute timestamps displayed in user's local timezone with UTC offset shown

---

## 33. Activity vs. Authority — Hard Boundary

**Activity is observability, not authority.**

This boundary is absolute:
- Events in the feed cannot authorise actions
- Activity cannot bypass governance
- Activity cannot bypass approval requirements
- An event marked COMPLETED does not grant authority to repeat the action
- An event marked APPROVED does not grant authority to execute without a current approval
- Proposal is not execution
- Approval is not execution
- Execution is not merely an event

An agent visible as ACTIVE in the activity feed is not thereby authorised for any specific action. Authority is determined by `lib/authority/authority-registry.js` and the constitutional gate — not by presence in the activity feed.

---

## 34. Failure, Uncertainty, and Conflict Handling

| Condition | Handling |
|-----------|---------|
| Event with no DB record | State shown as from event; evidence shows "no DB record found" |
| DB record with no matching event | State taken from DB; event bus history noted as unavailable |
| Conflicting status (event says COMPLETED, DB says FAILED) | Both shown at L1; conflict flagged; DB record treated as authoritative for final state |
| Unknown state | Shown as UNKNOWN — not resolved |
| Stale data | Shown as STALE with timestamp of last update |
| Missing timestamp | Shown as "timestamp unavailable" |
| Missing actor | Shown as "actor unknown" — not fabricated |
| Ring buffer overflow | "Earlier events not available" notice shown |
| Relay not confirmed | Events table shown as PARTIAL source; may not contain all events |
| WebSocket disconnected | DISCONNECTED banner; feed paused; reconnection attempted |

---

## 35. Self-Check and Health Integration

The activity feed includes a persistent self-check status indicator showing the 9 subsystems at L0 (summary: all OK / N degraded / N down). Full 9-subsystem detail at L1.

The health route (`/health`) supplies:
- DB connection status
- TTS status
- AI provider status
- Memory usage (shown as trend, not raw MB)
- WebSocket count (active connections)
- Recent errors list

Health data is a snapshot. Age of snapshot shown. Stale snapshots marked STALE.

---

## 36. Notification Deduplication

Production dedup: 60-second window by `event_key`. This means:
- If APEX emits the same event type within 60 seconds, only one notification is created
- The activity feed reflects actual notification records — not raw event counts
- The 60-second window is hardcoded in production (gap 8 — not configurable)

The activity feed does not attempt to circumvent dedup. It shows what was recorded.

---

## 37. Prototype

**File:** `docs/interface/prototype/apex-activity-prototype.html`

Three-column layout following UX-05/UX-06 design language:
- Left (280px): Connection state panel + self-check summary + category filter + domain lens selector
- Centre (flex 1): Live activity feed + timeline surface + agent runs surface
- Right (300px): Event detail surface (L0→L4 disclosure) + notification feed + scenario panel

50 scenarios demonstrating the canonical activity/observability UX.

---

## 38. Scenarios

### V-ACTIVITY-01 — Live Feed Connected
User opens activity feed. Connection state shows LIVE. Activity feed begins receiving events from /ws main channel. Recent events from ring buffer shown.

### V-ACTIVITY-02 — Live Feed Disconnected
WebSocket drops. Connection state banner changes to DISCONNECTED. Feed pauses. "Reconnecting..." shown. Reconnection attempted automatically.

### V-ACTIVITY-03 — Live Feed Reconnected
Reconnection succeeds. Banner changes to LIVE. Feed resumes. Missing events during disconnect: "N events may have been missed during disconnect."

### V-ACTIVITY-04 — Stale Feed
Connection is maintained but no events received within expected window. Banner changes to STALE. "Data may be outdated — last event received [timestamp]."

### V-ACTIVITY-05 — Agent Started
AGENT_STARTED event received. Feed shows: [AGENT badge] [Agent name] STARTED [timestamp]. Status: IN_PROGRESS.

### V-ACTIVITY-06 — Agent Completed Successfully
AGENT_COMPLETED event received with success flag. Feed shows: [AGENT badge] [Agent name] COMPLETED [duration] [timestamp]. Status: COMPLETED.

### V-ACTIVITY-07 — Agent Failed
AGENT_COMPLETED event received with failure flag. Feed shows: [AGENT badge] [Agent name] FAILED [timestamp]. Status: FAILED. Error visible at L1.

### V-ACTIVITY-08 — Tool Dispatched
TOOL_DISPATCHED event received. Feed shows: [TOOL badge] [Tool name] DISPATCHED [timestamp].

### V-ACTIVITY-09 — Tool Completed
TOOL_COMPLETED event received. Feed shows: [TOOL badge] [Tool name] COMPLETED [timestamp]. Result summary at L1.

### V-ACTIVITY-10 — Claude Started
CLAUDE_STARTED event received. Feed shows: [AGENT badge] Claude API STARTED [timestamp].

### V-ACTIVITY-11 — Claude First Token
CLAUDE_FIRST_TOKEN event received. Feed shows: [AGENT badge] First token received [latency from start] [timestamp].

### V-ACTIVITY-12 — Voice Session Started
VOICE_STARTED event received. Feed shows: [VOICE badge] Voice session ACTIVATING [timestamp]. UX-07 state: ACTIVATING.

### V-ACTIVITY-13 — Audio Received
AUDIO_RECEIVED event received. Feed shows: [VOICE badge] Audio received LISTENING [timestamp]. UX-07 state: LISTENING.

### V-ACTIVITY-14 — Intent Classified
INTENT_CLASSIFIED event received. Feed shows: [VOICE badge] Intent classified UNDERSTANDING [timestamp]. UX-07 state: UNDERSTANDING.

### V-ACTIVITY-15 — User Interrupted
USER_INTERRUPTED event received. Feed shows: [VOICE badge] User interrupted INTERRUPTED [timestamp]. UX-07 state: INTERRUPTED.

### V-ACTIVITY-16 — Session Completed
SESSION_COMPLETED event received. Feed shows: [RUNTIME badge] Session completed [timestamp]. Status: COMPLETED.

### V-ACTIVITY-17 — Background Task Queued
BACKGROUND_TASK_QUEUED event received. Feed shows: [RUNTIME badge] Background task QUEUED [timestamp].

### V-ACTIVITY-18 — Reflex Response Sent
REFLEX_RESPONSE_SENT event received. Feed shows: [RUNTIME badge] Reflex response SENT [timestamp].

### V-ACTIVITY-19 — Model Invoked
MODEL_INVOKED event received. Feed shows: [AGENT badge] [Model name] INVOKED [timestamp].

### V-ACTIVITY-20 — Email Parsed
EMAIL_PARSED event received. Feed shows: [COMMUNICATION badge] Email parsed [timestamp]. Subject at L1 (if non-private).

### V-ACTIVITY-21 — Calendar Event Synced
CALENDAR_EVENT_SYNCED event received. Feed shows: [COMMUNICATION badge] Calendar event synced [timestamp].

### V-ACTIVITY-22 — Timeline Entry — Task Completed
GET /api/timeline returns new entry. Timeline surface shows: [Objective] COMPLETED [duration] [timestamp]. Files changed at L1. Agent logs at L2.

### V-ACTIVITY-23 — Timeline Entry — Task Failed
GET /api/timeline returns failed entry. Timeline surface shows: [Objective] FAILED [timestamp]. Error message at L1.

### V-ACTIVITY-24 — Agent Run — Cost Summary
GET /api/intelligence/agent-runs returns entry. Agent runs surface shows: [task_id] [model] [cost USD] [duration] COMPLETED.

### V-ACTIVITY-25 — Self-Check — All Subsystems Up
GET /api/intelligence/self-check returns all 9 UP. Self-check surface shows: "All systems operational" at L0. 9-subsystem detail at L1.

### V-ACTIVITY-26 — Self-Check — Subsystem Down
GET /api/intelligence/self-check returns Notion: DOWN. Self-check surface shows: "1 subsystem degraded" at L0. Notion: DOWN at L1.

### V-ACTIVITY-27 — Notification Created
New notification appears in feed. [Type badge] [Title] [Message] UNREAD [timestamp].

### V-ACTIVITY-28 — Notification Marked Read
User marks notification as read. Status changes from UNREAD to READ. POST /notifications/{id}/read called.

### V-ACTIVITY-29 — Notification Deduplicated
Same event fires twice within 60 seconds. Only one notification shown. Feed note: "Duplicate suppressed (60s window)."

### V-ACTIVITY-30 — Constitutional Block Visible
Constitutional gate returns DENY verdict. Feed shows: [CONSTITUTIONAL badge] Request BLOCKED [timestamp]. Risk identifiers at L1. Audit trail at L3.

### V-ACTIVITY-31 — Constitutional Allow (No Feed Entry by Default)
Constitutional gate returns ALLOW verdict. Feed does not show an entry for every allowed request (too noisy). Allow events suppressed at L0. Available at L4 on explicit request.

### V-ACTIVITY-32 — Governance Anomaly
Anomaly detected (>50% deviation). Feed shows: [GOVERNANCE badge] Anomaly detected [threshold exceeded] [timestamp].

### V-ACTIVITY-33 — Certification Issued
Pipeline certification issued with score ≥0.7. Feed shows: [GOVERNANCE badge] Certification ISSUED [score] [timestamp].

### V-ACTIVITY-34 — Certification Denied
Pipeline certification denied with score 0. Feed shows: [GOVERNANCE badge] Certification DENIED [score] [timestamp].

### V-ACTIVITY-35 — Approval Required
Task reaches AWAITING_APPROVAL state. Feed shows: [APPROVAL badge] Approval required [action description] [timestamp]. Proactive notification sent via UX-09.

### V-ACTIVITY-36 — Approval Granted
User approves. Feed shows: [APPROVAL badge] Approved [timestamp]. Execution state: APPROVED → EXECUTING.

### V-ACTIVITY-37 — Action Executed
Execution completes. Feed shows: [ACTION badge] [Action description] EXECUTED [timestamp].

### V-ACTIVITY-38 — Action Cancelled
User cancels pending action. Feed shows: [ACTION badge] [Action description] CANCELLED [timestamp]. Status: CANCELLED. Visible in feed — not hidden.

### V-ACTIVITY-39 — Memory Write Activity
Memory item stored via storeMemory(). Feed shows: [MEMORY badge] Memory created [timestamp]. Layer and domain at L1.

### V-ACTIVITY-40 — Memory Corrected
Memory item corrected. Feed shows: [MEMORY badge] Memory corrected [timestamp]. Correction reason at L1.

### V-ACTIVITY-41 — Knowledge Gap Created
Knowledge gap opened. Feed shows: [KNOWLEDGE badge] Gap created [gap label] [timestamp].

### V-ACTIVITY-42 — Knowledge Gap Resolved
Knowledge gap resolved. Feed shows: [KNOWLEDGE badge] Gap resolved [gap label] [timestamp].

### V-ACTIVITY-43 — Domain Lens Applied
User selects Finance domain lens. Activity feed filters to Finance-relevant events. All other events de-emphasised (not hidden — available at L4). One event bus — domain lens is a view filter.

### V-ACTIVITY-44 — Ring Buffer Boundary
Feed reaches 200-event limit. Oldest event evicted. Notice shown: "Showing last 200 events. Earlier events may not be available from the live feed."

### V-ACTIVITY-45 — Timeline Limit Boundary
/api/timeline returns 20 entries. Notice shown: "Showing 20 most recent completed tasks."

### V-ACTIVITY-46 — Relay Not Confirmed Active
User accesses historical events beyond the ring buffer. Notice shown: "Historical event retrieval requires the outbox relay to be active. This feature is not confirmed fully operational."

### V-ACTIVITY-47 — L0 Disclosure Default
User opens activity feed. Default display: event type label, actor, status badge, relative timestamp only. No payload, no session ID, no correlation detail.

### V-ACTIVITY-48 — L4 Disclosure Requested
User requests full detail on an event. L4 display: raw event data, all fields, full forensic trail, DB record links. L4 requires explicit user action.

### V-ACTIVITY-49 — Unknown State
Event received but state cannot be determined from available data. Feed shows: [badge] [actor] UNKNOWN [timestamp]. "State could not be determined."

### V-ACTIVITY-50 — Voice Query for Activity
User asks: "What did you just do?" Voice session in SPEAKING state. Response: most recent apex_timeline entry, summarised. If FAILED: error reason stated. Same canonical activity data — no separate voice model.

---

## 39. Accessibility

- `aria-live="polite"` on live activity feed
- `aria-live="assertive"` on connection state banner (state change is time-sensitive)
- `role="log"` on scrolling event feed
- `role="status"` on self-check summary
- `tabindex="0"` on all interactive event rows
- Heading hierarchy: h1 (header) → h2 (panel labels) → h3 (section labels)
- No colour-only semantics: every status has a text label in addition to colour
- LIVE indicator: text "LIVE" shown alongside accent colour indicator
- FAILED state: text "FAILED" + error indicator (not just red colour)
- BLOCKED state: text "BLOCKED" + visual indicator
- CANCELLED state: text "CANCELLED" — visible in feed, not hidden
- UNKNOWN state: text "UNKNOWN" — never resolved silently
- STALE state: text "STALE — data may be outdated"
- DISCONNECTED state: text "DISCONNECTED" in connection banner
- Ring buffer boundary: explicit text notice
- Timeline limit: explicit text notice
- Reduced motion: `prefers-reduced-motion` disables live pulse animation on LIVE indicator
- Keyboard navigation: event rows navigable, expand/collapse on Enter/Space
- Empty state: descriptive placeholder text ("No events received yet")

---

## 40. Invariants

| ID | Invariant | Verified |
|----|-----------|---------|
| INV-ACT-01 | Activity is observability, not authority | ✓ DESIGN |
| INV-ACT-02 | Events cannot authorise actions | ✓ DESIGN |
| INV-ACT-03 | Activity cannot bypass governance | ✓ DESIGN |
| INV-ACT-04 | Activity cannot bypass approval | ✓ DESIGN |
| INV-ACT-05 | Proposal is not execution | ✓ DESIGN |
| INV-ACT-06 | Approval is not execution | ✓ DESIGN |
| INV-ACT-07 | Execution is not merely an event | ✓ DESIGN |
| INV-ACT-08 | Agent activity is not agent authority | ✓ DESIGN |
| INV-ACT-09 | Memory activity is not memory authority | ✓ DESIGN |
| INV-ACT-10 | Knowledge activity is not knowledge authority | ✓ DESIGN |
| INV-ACT-11 | Constitutional activity does not replace constitutional source of truth | ✓ DESIGN |
| INV-ACT-12 | Governance activity does not replace governance source of truth | ✓ DESIGN |
| INV-ACT-13 | Provenance is never fabricated | ✓ DESIGN |
| INV-ACT-14 | Timestamps are never fabricated | ✓ DESIGN |
| INV-ACT-15 | Actors are never fabricated | ✓ DESIGN |
| INV-ACT-16 | Correlation is never fabricated | ✓ DESIGN |
| INV-ACT-17 | Causation is never inferred merely from chronology | ✓ DESIGN |
| INV-ACT-18 | Unknown states remain unknown | ✓ DESIGN |
| INV-ACT-19 | Stale data is marked stale | ✓ DESIGN |
| INV-ACT-20 | Disconnected state is visible | ✓ DESIGN |
| INV-ACT-21 | Failed activity is visible | ✓ DESIGN |
| INV-ACT-22 | Cancelled activity is visible | ✓ DESIGN |
| INV-ACT-23 | Blocked activity is visible | ✓ DESIGN |
| INV-ACT-24 | Private chain-of-thought is never exposed | ✓ DESIGN |
| INV-ACT-25 | L0–L4 follows UX-08 | ✓ DESIGN |
| INV-ACT-26 | Voice uses UX-07 | ✓ DESIGN |
| INV-ACT-27 | Proactive communication uses UX-09 | ✓ DESIGN |
| INV-ACT-28 | Domains use UX-10 | ✓ DESIGN |
| INV-ACT-29 | Knowledge uses UX-11 | ✓ DESIGN |
| INV-ACT-30 | Intelligence uses UX-12 | ✓ DESIGN |
| INV-ACT-31 | Agents use UX-13 | ✓ DESIGN |
| INV-ACT-32 | Actions/approvals use UX-14 | ✓ DESIGN |
| INV-ACT-33 | Memory uses UX-15 | ✓ DESIGN |
| INV-ACT-34 | System/constitutional activity uses UX-16 | ✓ DESIGN |
| INV-ACT-35 | No second event bus exists | ✓ OBSERVED (lib/event-bus.js is the only bus) |
| INV-ACT-36 | No second observability system exists | ✓ OBSERVED |
| INV-ACT-37 | No second audit store exists | ✓ OBSERVED |
| INV-ACT-38 | No production capability is falsely represented | ✓ gaps documented |
| INV-ACT-39 | UX-18 is not implemented | ✓ NOT STARTED |
| INV-ACT-40 | UX-19 is not implemented | ✓ NOT STARTED |
| INV-ACT-41 | One event bus only (lib/event-bus.js) | ✓ OBSERVED |
| INV-ACT-42 | One WebSocket handler only (lib/ws-handler.js) | ✓ OBSERVED |
| INV-ACT-43 | One viz broadcaster only (lib/viz-broadcaster.js) | ✓ OBSERVED |
| INV-ACT-44 | One event spine only (events + outbox tables) | ✓ OBSERVED |
| INV-ACT-45 | Ring buffer boundary explicitly communicated to user | ✓ DESIGN |
| INV-ACT-46 | Timeline 20-entry limit explicitly communicated to user | ✓ DESIGN |

---

## 41. Tests

Verification: 50-scenario checklist corresponding to V-ACTIVITY-01 through V-ACTIVITY-50. Each scenario verifiable against the production data sources documented in Sections 5–7.

---

## 42. Production Gaps

| Gap | ID | Severity | Classification |
|-----|-----|----------|----------------|
| No live event API endpoint (only /api/timeline for completed tasks) | Gap 1 | HIGH | MISSING |
| No event correlation_id in in-memory bus | Gap 2 | MEDIUM | MISSING |
| No category taxonomy applied to production bus events | Gap 3 | LOW | MISSING |
| No L0-L4 disclosure implementation in production dashboard | Gap 4 | HIGH | MISSING |
| Event consumer handles only pipeline.failed (one event type of 17+) | Gap 5 | MEDIUM | PARTIAL |
| Outbox relay not confirmed fully active | Gap 6 | HIGH | PARTIAL |
| No agent activity beyond viz channel (agent only, not tools/decisions/voice) | Gap 7 | MEDIUM | PARTIAL |
| Notification dedup window hardcoded at 60s (not configurable) | Gap 8 | LOW | PARTIAL |
| No historical event query API beyond /api/timeline 20-entry limit | Gap 9 | MEDIUM | MISSING |
| No search across events | Gap 10 | MEDIUM | MISSING |

---

## 43. Deviations

**DEV-17-01:** The in-memory event bus (`lib/event-bus.js`) does not carry `correlation_id` or `causation_id` fields. Cross-event correlation within a session is achievable via `session_id` grouping but explicit correlation chain does not exist. Documented as Gap 2.

**DEV-17-02:** The viz broadcaster (`lib/viz-broadcaster.js`) emits only AGENT_STARTED and AGENT_COMPLETED events — a small subset of the canonical 17 event types. Tool, voice, memory, constitutional, and other categories are not visible on the viz channel. This is an architectural decision, not an error.

**DEV-17-03:** `GET /api/timeline` returns a hard maximum of 20 entries with no pagination support. Older timeline entries are not queryable via this route. Documented as Gap 9.

**DEV-17-04:** The outbox-to-events relay loop existence is documented in the migration (`migrations/024_phase0a_event_spine.sql`) but is not confirmed as fully active in the production runtime. Events may not be flowing from outbox to the durable events table. Documented as Gap 6.

**DEV-17-05:** The event consumer (`lib/event-consumer.js`) polls only for `pipeline.failed` events. The 16 other canonical event types have no consumer handlers in production. Documented as Gap 5.

**DEV-17-06:** The WebSocket handler (`lib/ws-handler.js`) requires access-key authentication on the main `/ws` path. The `/ws/viz` path is open (no auth). This means the viz channel exposes agent start/completion events without authentication. This is a known production characteristic — not a UX design choice.

---

## 44. Open Questions

1. Should the in-memory event bus be extended with `correlation_id` and `causation_id` fields to enable cross-event correlation chains?
2. Should a paginated GET /api/events endpoint be built to expose the in-memory ring buffer or the events spine table?
3. Should the outbox relay loop be confirmed active and monitored?
4. Should additional event consumers be built for event types beyond pipeline.failed?
5. Should the notification dedup window be made configurable per event_key pattern?
6. Should the viz channel require authentication?
7. Should agent_id be added to in-memory bus events to link activity to agent_runs records?
8. Should category taxonomy be applied to bus events at emission time?
9. What is the target historical event retention period for the events spine table?
10. Should a search API be built over the events spine table?

---

## 45. Production Impact

**UX-17 creates no production impact.** No production files were modified.

**Prototype is in:** `docs/interface/prototype/apex-activity-prototype.html` — static HTML, no production dependency.

**Documentation is in:** `docs/interface/UX-17-ACTIVITY-OBSERVABILITY.md`

The production gaps documented above may inform future production work. No immediate production change is required or recommended from this UX phase.

---

## 46. Final Certification

UX-17 — ACTIVITY / OBSERVABILITY — COMPLETE.

**Event bus architecture audited:** ✓  
**WebSocket transport audited:** ✓  
**Viz broadcaster audited:** ✓  
**Event spine audited:** ✓  
**Event consumer audited:** ✓  
**Activity tables documented:** ✓  
**Observability routes documented:** ✓  
**Canonical activity model defined:** ✓  
**Lifecycle states (12) defined:** ✓  
**Execution states (8) defined:** ✓  
**Connection states (5) defined:** ✓  
**Event category taxonomy (17) defined:** ✓  
**UX-05 design tokens integrated:** ✓  
**UX-06 Command Centre integrated:** ✓  
**UX-07 voice states integrated:** ✓  
**UX-08 disclosure integrated:** ✓  
**UX-09 proactive communication integrated:** ✓  
**UX-10 domain lenses integrated:** ✓  
**UX-11 knowledge activity integrated:** ✓  
**UX-12 intelligence/decision chain integrated:** ✓  
**UX-13 agent activity integrated:** ✓  
**UX-14 action/approval integrated:** ✓  
**UX-15 memory activity integrated:** ✓  
**UX-16 constitutional/governance activity integrated:** ✓  
**Hard boundary: activity ≠ authority documented:** ✓  
**Failure visibility documented:** ✓  
**Cancelled activity visibility documented:** ✓  
**Blocked activity visibility documented:** ✓  
**Unknown state handling documented:** ✓  
**Stale data handling documented:** ✓  
**Provenance rules documented:** ✓  
**Timestamp rules documented:** ✓  
**Correlation rules documented:** ✓  
**Security and privacy rules documented:** ✓  
**Progressive disclosure L0–L4 documented:** ✓  
**Voice integration documented:** ✓  
**Proactive communication integration documented:** ✓  
**Explanation model documented:** ✓  
**Auditability documented:** ✓  
**50 scenarios (V-ACTIVITY-01 through V-ACTIVITY-50) documented:** ✓  
**Accessibility documented:** ✓  
**Invariants (46) documented:** ✓  
**Production gaps (10) documented:** ✓  
**Deviations (6) documented:** ✓  
**Open questions documented:** ✓  
**Production impact assessed:** ✓  
**No second event bus:** ✓  
**No second observability system:** ✓  
**No second audit store:** ✓  
**No production capability falsely represented:** ✓  
**No production files modified:** ✓  
**Knowledge-Gap intact:** ✓  

---

## 47. Exact Next Hard Stop

STOP. DO NOT BEGIN UX-18. DO NOT BEGIN UX-19.

UX-18 — MOBILE / RESPONSIVE requires explicit authorisation.

UX-19 — INTEGRATION / E2E CERTIFICATION requires explicit authorisation.

Do not deploy.
