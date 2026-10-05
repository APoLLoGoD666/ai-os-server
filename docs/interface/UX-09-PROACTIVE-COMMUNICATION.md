# UX-09 — PROACTIVE COMMUNICATION

**Status:** COMPLETE
**Phase:** UX-09
**Design Authority:** UX-05 (Canonical Visual Design System)
**Date:** 2026-08-27
**Evidence basis:** Direct observation of production source files unless marked PROPOSED

---

## 1. Objective

Define when, how, and why APEX initiates communication with the user without an explicit request. Establish a principled silence model — covering suppression, deduplication, timing, escalation, and channel selection — anchored to the existing attention architecture (UX-05) and presentation pipeline (UX-08). Document the production architecture as observed, identify gaps, and specify the target behaviour.

---

## 2. Scope

Covers all system-initiated communication: push notifications, in-app notifications, voice interruptions, proactive briefing content, activity-feed insertions, and background intelligence surfacing. Does not cover user-initiated queries, command responses, or passive ambient display (those are covered by UX-08). Explicitly includes the silence decision — the case where APEX observes an event and deliberately does not communicate.

---

## 3. Authoritative Inputs

| Document | Role |
|---|---|
| UX-00 — Legacy Interface Baseline | Baseline behaviour before redesign |
| UX-01 — Canonical UX Discovery | User mental models, pain points, observed workflows |
| UX-02 — User Task Model | Task hierarchy, interruption cost by task type |
| UX-03 — Information Architecture | Data taxonomy, information relationships |
| UX-04 — Communication Architecture | Channel definitions, message types |
| UX-05 — Canonical Visual Design System | **Binding.** Attention levels L0–L5, channel rules |
| UX-06 — Command Centre Visual Prototype | Visual surface constraints |
| UX-07 — Voice Experience | **Binding.** Voice state machine, 11 states, suppression rules |
| UX-08 — Contextual Presentation | **Binding.** Present vs Notify distinction, presentation pipeline |

Where UX-09 conflicts with UX-05, UX-07, or UX-08, those documents take precedence. UX-09 extends and specialises them for proactive events.

---

## 4. Production Proactive Architecture (OBSERVED)

### 4.1 Scheduler

**File:** `lib/pwa/notification-scheduler.js`

Implements 10 hardcoded reminder entries. Ticks on a 60-second interval. Matching logic: exact hour:minute comparison against current time. No date tracking, no cooldown, no deduplication. A reminder configured for 09:00 will fire every day at 09:00 and will fire again if the scheduler restarts within the same minute. No awareness of user activity state, voice state, or attention level.

### 4.2 Push

**File:** `lib/pwa/push.js`

Delivers WebPush to all active subscriptions. No deduplication guard. No subscription filtering by user state or relevance score. Sends the raw notification payload to every registered endpoint unconditionally.

### 4.3 Notification Creation Points

Four points in `src/routes/browser.js`, three points in `src/routes/master.js`, and success/failure hooks in `lib/auto-pipeline.js` all insert directly into the notification store. There is no central creation gate. No point checks whether an equivalent notification already exists, whether the user is currently in voice interaction, or whether the attention engine recommends suppression.

### 4.4 Attention Engine

**File:** `lib/attention/attention-engine.js`

Implements 6-factor attention scoring. Production-active. Not wired to any notification creation point. The attention score is computed but has no effect on whether a proactive communication fires or what channel it uses.

### 4.5 Event Bus

**File:** `lib/event-bus.js`

Defines 17 canonical system events with a 200-event rolling log. Not wired to proactive communication. Events that could drive intelligent proactive surfacing (task completion, pipeline failure, external data changes) are logged but not consumed by the notification system.

### 4.6 Production Status Table

| Component | Exists | Wired to Proactive | Dedup | State-Aware |
|---|---|---|---|---|
| Notification scheduler | Yes | Yes (direct) | No | No |
| Push delivery | Yes | Yes (direct) | No | No |
| Attention engine | Yes | No | N/A | Yes |
| Event bus | Yes | No | N/A | Yes |
| Briefing aggregator | Yes | Partial (priority-inbox) | No | No |
| Supabase realtime | Yes | Yes (INSERT listener) | No | No |
| Deduplication layer | No | — | — | — |
| Silence model | No | — | — | — |
| Voice suppression | No | — | — | — |

---

## 5. Production Gaps

- **No deduplication at any layer.** The same notification can be created multiple times from different insertion points with no guard.
- **No suppression during active voice interaction.** Push notifications and in-app notifications fire regardless of voice state.
- **No relevance scoring before notification fires.** Notifications are not filtered or ranked by contextual relevance to current user activity.
- **No silence model.** Every scheduled event and every pipeline event produces a notification. There is no defined threshold below which APEX deliberately does not communicate.
- **Attention engine not used to gate notification creation.** The 6-factor score is computed but has no downstream effect on proactive decisions.
- **No escalation logic.** There is no mechanism to retry a missed notification at a higher channel after a timeout.
- **No defer persistence.** When a user dismisses a notification, the dismissal is not recorded in a way that prevents the same notification from appearing again.
- **No user activity state awareness in scheduler.** The scheduler does not know whether the user is actively interacting, idle, in a voice session, or absent.
- **Event bus not consumed by proactive system.** 17 canonical events are available but unused as proactive triggers.

---

## 6. Evidence Classification

| Classification | Meaning |
|---|---|
| OBSERVED | Confirmed by direct inspection of production source files |
| INFERRED | Consistent with observed code; not explicitly verified by test |
| PROPOSED | Not present in production; specified here as target behaviour |
| BINDING | Defined in a prior UX document; UX-09 must conform |

All section 4 content is OBSERVED. All gap remediation in sections 8–24 is PROPOSED unless explicitly marked otherwise.

---

## 7. Core Principle

**Attention is a finite resource. Silence is valid behaviour.**

APEX communicates proactively only when the expected value of communication exceeds its interruption cost. The interruption cost is not zero. A user whose attention is solicited unnecessarily experiences degraded trust, reduced engagement with future communications, and increased cognitive load. The correct response to a low-relevance event is not a low-urgency notification — it is silence, with the event recorded for optional review.

APEX does not communicate to demonstrate activity. APEX communicates when the user benefits from knowing something at that moment.

---

## 8. Proactive Communication Lifecycle

The full pipeline for any system-initiated communication:

```
EVENT (internal or external)
  │
  ▼
CONTEXT ENRICHMENT
  │  — What is the user currently doing?
  │  — What is the current voice state?
  │  — What is the current attention level?
  │  — What is the recent interaction history?
  │
  ▼
RELEVANCE SCORING
  │  — Does this event relate to the user's current task?
  │  — Is the information novel (not already known)?
  │  — Is it time-sensitive?
  │  — Has equivalent content been delivered recently?
  │
  ▼
PROACTIVE DECISION
  │
  ├─► SILENT ──────────────────────────────────────────────────────────────┐
  │     Relevance or importance below threshold.                           │
  │     Event recorded in rolling log. No communication.                  │
  │     Available in Briefing and Activity Feed if user pulls.            │
  │                                                                        │
  ├─► SURFACE (Present)                                                    │
  │     Contextually relevant. Embedded in current view.                  │
  │     No interruption. Follows UX-08 Present pipeline.                  │
  │                                                                        │
  └─► INTERRUPT (Notify)                                                   │
        High relevance or high urgency.                                    │
        Follows UX-08 Notify pipeline.                                     │
        Channel selected per §12.                                          │
              │                                                            │
              ▼                                                            │
        USER EXPERIENCE                                                    │
              │                                                            │
              ▼                                                            │
        USER RESPONSE                                                      │
          ├─ ACKNOWLEDGED → mark resolved                                  │
          ├─ ACTED UPON → mark resolved, record action                     │
          ├─ DISMISSED → record dismissal, suppress recurrence             │
          ├─ DEFERRED → record defer intent, schedule re-surface           │
          └─ NO RESPONSE → escalation timer begins                         │
              │                                                            │
              ▼                                                            │
        RESOLVE / DEFER / DISMISS / ESCALATE                              │
              │                                                            │
              ▼                                                            │
        STATE + MEMORY UPDATE ◄──────────────────────────────────────────┘
          — Update notification state (§16)
          — Record in event log
          — Update dedup fingerprint store
          — Feed back to attention engine
```

The SILENT branch is not a failure path. It is a first-class outcome. The majority of events should resolve as SILENT.

---

## 9. Silence / Suppression Model

APEX must not communicate proactively under any of the following conditions:

1. Voice state is LISTENING — user is actively speaking; all non-L5 suppressed.
2. Voice state is UNDERSTANDING — processing user speech; all non-L5 suppressed.
3. Voice state is THINKING — generating response; all non-L5 suppressed.
4. Voice state is SPEAKING — APEX is delivering a voice response; L0–L3 suppressed.
5. Voice state is INTERRUPTED — transition in progress; all comms suppressed.
6. Voice state is ACTIVATING — startup sequence; non-urgent (L0–L2) suppressed.
7. An equivalent notification was delivered within the last deduplication window (PROPOSED: 4 hours for L1–L2; 30 minutes for L3; no cooldown for L4–L5).
8. The user has dismissed this notification type for this source within the current session.
9. The user has an active do-not-disturb preference (explicit or inferred from schedule).
10. The relevance score is below the threshold for the current attention level.
11. The event has already been resolved (task completed, risk cleared, opportunity expired).
12. The notification's content is substantively identical to content already visible in the current view.
13. A higher-priority notification for the same domain is already in the delivered/unacknowledged state.
14. The event is older than its defined expiry window (stale events must not surface).
15. The user is in a DECISION-required interaction and has not yet responded — adding a second DECISION notification is prohibited until the first resolves.
16. The event was generated by a background pipeline that failed silently — failures require human-readable context before surfacing, not a raw error push.

---

## 10. Attention Budget

Extends the UX-08 model.

**Frequency limits (PROPOSED):**
- L1 LOG: uncapped; recorded only, never surfaced as push.
- L2 IN-APP: maximum 8 per hour in aggregate across all sources.
- L3 ATTENTION: maximum 3 per hour; maximum 1 per 15 minutes per source.
- L4 DECISION: maximum 2 active unresolved at any time.
- L5 URGENT: no cap; but false L5 classification degrades trust and must be auditable.

**Interruption cost model:**
- Each interruption during an active task carries a recovery cost estimated at 2–5 minutes of user attention.
- Batching: low-urgency items should be held and delivered together at the next natural break (next-interaction or next-briefing timing mode per §13).
- Fatigue signal: if a user dismisses 3 or more notifications in a 30-minute window without acting on any, the system should reduce proactive output to L3+ only for the following 2 hours (PROPOSED).

**Attention budget recovery:**
- After a resolved L4 or L5 interaction, the budget for L2–L3 is partially restored.
- User-initiated briefing review counts as a full budget reset signal.

---

## 11. Communication Types

Nine canonical proactive communication types. Each entry specifies: description, UX-05 attention channel, default attention level, timing mode (§13), and suppression conditions specific to this type.

| Type | Description | Channel | Default Level | Timing | Type-Specific Suppression |
|---|---|---|---|---|---|
| REMINDER | Time-anchored obligation the user set | Push or In-App | L3 | SCHEDULED | Suppress if event already passed; suppress if user is in active task and event is >30 min away |
| ALERT | Urgent external change requiring awareness | Push | L4 | IMMEDIATE | Only suppress for L5 URGENT override conflict |
| INSIGHT | Pattern or anomaly detected in user data | In-App Present | L2 | NEXT-BRIEFING or NEXT-INTERACTION | Suppress if insight is older than 24h; suppress if substantively similar insight was delivered this week |
| CHANGE | Something the user was tracking has changed | In-App | L2–L3 | DELAYED | Suppress if change is below defined threshold magnitude |
| OPPORTUNITY | Time-bounded action available to the user | In-App or Push | L3 | IMMEDIATE or SCHEDULED | Suppress if opportunity has expired; suppress if user has previously declined similar opportunities |
| RISK | Potential negative outcome if no action taken | Push | L4 | IMMEDIATE or DELAYED | Suppress if risk has been acknowledged and accepted by user |
| DECISION | User action required to unblock a process | In-App L4 | L4 | IMMEDIATE | Do not suppress; escalate per §14 if unacknowledged |
| ACTION | A recurring or queued action is now executable | In-App | L2–L3 | NEXT-INTERACTION | Suppress if action has been completed by another path |
| STATUS | Background process completed or changed state | Activity Feed | L1–L2 | BATCHED | Suppress entirely if failure requires context; surface only success or failure-with-explanation |

---

## 12. Channel Selection Model

Selection is determined by three inputs: urgency (derived from attention level), complexity (information density of the communication), and user state.

| Urgency | Complexity | User State | → Channel |
|---|---|---|---|
| Low (L1–L2) | Simple | Active conversation | Silent — do not interrupt |
| Low (L1–L2) | Simple | Idle | Activity feed or brief L2 In-App |
| Low (L1–L2) | Complex | Any | Next-briefing — hold for aggregated delivery |
| Medium (L3) | Simple | Idle | L2–L3 In-App Notify or Present |
| Medium (L3) | Simple | Active non-voice | L2 Present (embedded) |
| Medium (L3) | Complex | Idle | L3 Present with expanded context |
| Medium (L3) | Any | Voice LISTENING/UNDERSTANDING/THINKING | Queue until after voice resolves |
| High (L4) | Any | Any non-voice | L4 In-App Notify |
| High (L4) | Any | Voice SPEAKING | L4 visual only (no audio interruption) |
| High (L4) | Any | Voice LISTENING | Queue until voice exits |
| Critical (L5) | Any | Any | L5 Notify — overrides all suppression |
| Critical (L5) | Any | Voice SPEAKING | L5 audio interrupt permitted |

**Present vs Notify (per UX-08 binding distinction):**
- Present = embedded contextual content within the current view. No time-bounded alert. User encounters it; it does not demand attention.
- Notify = time-bounded alert. Demands acknowledgement. Counts against the attention budget.

---

## 13. Timing Model

Seven timing modes for proactive delivery:

| Mode | Description | Appropriate Use |
|---|---|---|
| IMMEDIATE | Deliver as soon as technically possible | L4–L5 events; time-critical alerts; risk notifications |
| DELAYED | Deliver after a short hold (30–120 seconds) | L3 events where context enrichment may change relevance; avoids duplicate rapid-fire notifications |
| SCHEDULED | Deliver at a user-defined or system-defined time | REMINDER type; recurring briefings; digest delivery |
| BATCHED | Accumulate until batch threshold; deliver together | L1–L2 STATUS and ACTION types; reduces interruption count |
| NEXT-INTERACTION | Deliver at the start of the user's next APEX interaction | INSIGHT and CHANGE types; non-urgent, benefits from active attention |
| NEXT-BRIEFING | Hold for inclusion in the next scheduled briefing | Low-urgency items; complex insights; historical context |
| ESCALATION | Redeliver at higher channel after timeout | Used only when a DECISION or ALERT has received no response within defined window |

The scheduler (`lib/pwa/notification-scheduler.js`) currently implements SCHEDULED only. All other modes are PROPOSED.

---

## 14. Escalation Model

Five-step escalation sequence for unresponded communications:

```
Step 1: SILENT
  Event generated. Relevance below threshold.
  Recorded in log. No delivery.

Step 2: PRESENT (L2)
  Relevance above threshold but not urgent.
  Embedded in current view. No alert.
  Escalation timer: 4 hours with no user interaction with content.

Step 3: NOTIFY (L3)
  Escalated from PRESENT after timeout, or generated at L3 directly.
  In-App notification. Counts against attention budget.
  Escalation timer: 2 hours with no acknowledgement.

Step 4: ESCALATED-NOTIFY (L4)
  Escalated from L3, or generated at L4 directly.
  Prominent In-App notification. May include Push if user is not active in app.
  Escalation timer: 30 minutes with no response for DECISION type; 4 hours for ALERT type.

Step 5: VOICE / HIGH-ATTENTION (L5)
  Reserved for: critical system failures, security events, time-critical decisions with imminent consequence.
  Overrides all suppression including voice state (SPEAKING only; LISTENING still queued).
  No further escalation step. If L5 receives no response, the item remains in ESCALATED state.
```

Escalation must not be used to compensate for low relevance. An event that does not merit NOTIFY at L3 must not be escalated to L4 simply because time has passed.

---

## 15. Deduplication Model

**PROPOSED.** Not implemented in production. Three layers required:

**Layer 1 — Event-level deduplication**
At event ingestion, before any notification is created. A fingerprint is computed from: event type + source identifier + content hash + date bucket. If an identical fingerprint exists in the dedup store with a delivery timestamp within the cooldown window, the event is dropped. No notification record is created.

Cooldown windows by level:
- L1: 24 hours
- L2: 4 hours
- L3: 30 minutes
- L4: 10 minutes
- L5: no cooldown

**Layer 2 — Content-level deduplication**
Before delivery. If the notification content is substantively equivalent to a notification already in DELIVERED or UNACKNOWLEDGED state (semantic similarity, not exact match), the new notification is suppressed and the existing notification's timestamp is refreshed.

**Layer 3 — User-experience-level deduplication**
After dismissal. If a user dismisses a notification, a dismissal record is written: source + content-class + timestamp. For the remainder of the session (and for L2 notifications, for 48 hours), the same content-class from the same source is suppressed. This record must persist across page reloads — storing in Supabase against the user profile, not in sessionStorage.

---

## 16. Proactive Communication State Lifecycle

Thirteen states. Each notification record transitions through this graph:

```
GENERATED
  │
  ▼
EVALUATING — context enrichment and relevance scoring in progress
  │
  ├──► SUPPRESSED — below threshold; no further transitions; recorded only
  │
  └──► QUEUED — above threshold; awaiting timing condition or voice state clearance
         │
         ▼
       PRESENTED — delivered to user (Present channel) or DELIVERED (Notify channel)
         │
         ├──► ACKNOWLEDGED — user viewed/acted without explicit dismiss
         ├──► DISMISSED — user explicitly dismissed; dismissal record written
         ├──► DEFERRED — user invoked defer; re-queue with new timing
         ├──► RESOLVED — underlying condition resolved; notification withdrawn
         ├──► EXPIRED — timing window elapsed; item stale; withdraw silently
         ├──► ESCALATED — no response within escalation window; step up per §14
         └──► FAILED — delivery error; retry up to 3 times; then mark FAILED
```

State transitions must be recorded with timestamp. SUPPRESSED and RESOLVED are terminal without user action. DISMISSED and ACKNOWLEDGED are terminal with user action. ESCALATED is non-terminal — it re-enters the delivery path at the next step.

---

## 17. Present / Notify Integration

Proactive events enter the same pipeline defined in UX-08. There is no separate UI pathway for proactive content.

When the PROACTIVE DECISION resolves to SURFACE (Present), the event is passed to the UX-08 contextual presentation pipeline as a proactive context item. It is treated identically to a reactively surfaced context item: it undergoes the full UX-08 sequence (Context → Relevance → Attention Score → Presentation Decision → Visual Channel → User Response → Resolution → Withdrawal).

When the PROACTIVE DECISION resolves to INTERRUPT (Notify), the event is passed to the UX-08 notification pipeline with its computed attention level. The UX-08 channel rules and visual treatment apply unchanged.

The proactive system's contribution is the decision to initiate. The presentation system's responsibility is how to present. These must not be conflated.

---

## 18. Voice Integration

Per UX-07 binding authority. Rules for each of the 11 voice states:

| Voice State | Proactive Communication Rule |
|---|---|
| IDLE | All proactive communications proceed normally. |
| ACTIVATING | Suppress L0–L2. L3+ may queue but not deliver until IDLE or LISTENING achieved. |
| LISTENING | Suppress all non-L5. L5 queued until LISTENING exits; delivered immediately after. |
| UNDERSTANDING | Suppress all non-L5. Same queue behaviour as LISTENING. |
| THINKING | Suppress all non-L5. APEX is generating response; no interruption. |
| SPEAKING | Suppress L0–L3. L4 may appear visually without audio. L5 may audio-interrupt. |
| INTERRUPTED | Suppress all. System is in transition. No new deliveries until stable state reached. |
| PAUSED | L3 and above permitted. User attention is available. L1–L2 may surface silently. |
| LIVE (ongoing voice session) | Suppress L0–L2. L3 visual only. L4 visual only. L5 permitted. |
| FAILED | Silence until IDLE restored. Do not add notifications to a failing voice session. |
| CANCELLED | Silence until IDLE restored. |

Queue behaviour: notifications that are suppressed due to voice state are held in QUEUED state, not dropped. When the voice state returns to IDLE, queued notifications are evaluated: expired items are discarded; remaining items are re-evaluated for delivery. They are not automatically delivered in a burst — they re-enter the full evaluation pipeline.

---

## 19. Contextual Presentation Integration

Proactive events do not bypass contextual presentation. The distinction between proactive and reactive is an input classification, not a presentation pathway.

Flow for a proactive event that resolves to SURFACE:

1. APEX detects event (scheduler tick, pipeline hook, event bus event — PROPOSED for event bus).
2. Proactive lifecycle (§8): evaluate, score, decide SURFACE.
3. Event is wrapped as a proactive context item with: source, type, attention level, evidence, relevance score.
4. Item enters UX-08 pipeline at the Context Enrichment stage.
5. UX-08 pipeline applies its own relevance check, attention scoring, and presentation decision.
6. If UX-08 also confirms delivery, item is rendered in the appropriate UX-08 visual channel.
7. User response is captured by UX-08 resolution logic; the notification state (§16) is updated accordingly.

This means a proactive item may be further suppressed by the UX-08 pipeline even after the proactive system decided to surface it. Both layers must agree before delivery occurs.

---

## 20. Governance and User Agency

APEX proactive communications must clearly represent their authority level. Five authority tiers:

| Tier | Description | Example |
|---|---|---|
| INFORMATION | Sharing a fact. No action required or implied. | "Your pipeline completed in 4.2s." |
| RECOMMENDATION | Suggesting an action. User decides. | "You may want to review this before the 10:00 meeting." |
| PROPOSAL | Specific action formulated. Awaiting approval. | "I can reschedule that task to Thursday. Approve?" |
| APPROVAL-REQUIRED | APEX cannot proceed without explicit user consent. Must be presented as DECISION (L4). | "Sending this message requires your confirmation." |
| EXECUTED | Action already taken. Notification is informational. | "Background sync completed. 3 items updated." |

APEX must not use language that implies authority it does not have. A RECOMMENDATION must not use the phrasing of EXECUTED. An INFORMATION item must not be framed as a DECISION.

Users must always be able to:
- See why APEX communicated (trigger event, evidence source, relevance score — §21).
- Dismiss any notification permanently for a source or type.
- Reduce proactive frequency per domain.
- Review suppressed notifications (items that resolved as SILENT).

---

## 21. Observability

Every proactive communication must carry a verifiable reason. Users who ask "why did APEX tell me this?" must receive a factual answer.

Required metadata on each notification:
- **Trigger:** the event that initiated the proactive lifecycle (e.g., "pipeline-completed", "scheduler:09:00", "event-bus:TASK_FAILED").
- **Context snapshot:** the user state at evaluation time (voice state, active view, recent task context).
- **Relevance score:** numeric score and the factors that drove it (PROPOSED — requires attention engine wiring).
- **Evidence classification:** OBSERVED / INFERRED / PROPOSED per §6.
- **Suppression history:** if this item was previously suppressed and re-evaluated, the suppression reasons.
- **Channel selected:** why this channel was chosen over alternatives.

This metadata should be accessible to users through a notification detail view. It should not be shown by default — it is available on request. For operators and developers, it must be logged to the rolling event log.

---

## 22. Knowledge / Intelligence Integration

When the Knowledge Graph programme is complete, it will provide a structured representation of user context, relationships between entities, and temporal patterns. The proactive system can consume this to:

- Detect when a tracked entity changes state (a contact replies, a project milestone passes, a metric crosses a threshold) and evaluate whether this warrants surfacing.
- Compute relevance scores grounded in graph relationships rather than keyword matching.
- Identify patterns (user consistently checks a data source at 09:00) and pre-compute context for proactive presentation at that time.
- Detect anomalies against baseline behaviour and surface them as INSIGHT type communications.

Until KG is production-active, relevance scoring is PROPOSED and may be approximated by rule-based heuristics per communication type.

---

## 23. Prototype Architecture

Target architecture for a production-conformant proactive system (all PROPOSED):

```
Event Sources
  ├── Scheduler (existing: lib/pwa/notification-scheduler.js — requires dedup + state-awareness)
  ├── Pipeline hooks (existing: lib/auto-pipeline.js — requires central gate)
  ├── Route insertion points (existing: browser.js, master.js — requires central gate)
  └── Event bus consumer (new: lib/proactive/event-bus-consumer.js)

Central Proactive Gate (new: lib/proactive/proactive-gate.js)
  ├── Receives all proactive event candidates
  ├── Calls attention engine for current user state
  ├── Applies silence model (§9)
  ├── Applies deduplication layer 1 and 2 (§15)
  ├── Scores relevance
  ├── Selects timing mode (§13)
  └── Emits to: queue or SUPPRESSED record

Delivery Queue (new: lib/proactive/delivery-queue.js)
  ├── Holds QUEUED notifications
  ├── Monitors voice state (lib/voice/voice-state.js — existing or new)
  ├── Applies timing conditions
  └── Passes to UX-08 presentation pipeline on release

State Store (new: Supabase table: apex_notification_states)
  ├── Full state per notification (§16)
  ├── Dismissal records
  ├── Dedup fingerprints (layer 1 and 3)
  └── Escalation timers

Escalation Worker (new: lib/proactive/escalation-worker.js)
  ├── Polls DELIVERED state for timeout
  └── Advances escalation step per §14
```

---

## 24. Scenarios

All scenarios are PROPOSED. Dynamic proactive gating is not implemented in production; the validation conditions cannot currently be met.

| ID | Scenario | Expected Outcome |
|---|---|---|
| V-PROACTIVE-01 | Scheduler fires at 09:00 while user is in LISTENING voice state | Notification queued; delivered after voice returns to IDLE |
| V-PROACTIVE-02 | Same reminder fires two days in a row | Second delivery passes dedup check (daily cooldown); delivers normally |
| V-PROACTIVE-03 | Pipeline task fails; user is in active DECISION interaction | Failure notification queued; delivered after first DECISION resolves |
| V-PROACTIVE-04 | Low-relevance insight generated at L2 | Held for next-briefing; not pushed; available in Activity Feed |
| V-PROACTIVE-05 | L5 URGENT alert fires while user is in SPEAKING voice state | Audio interrupt permitted; visual notification appears |
| V-PROACTIVE-06 | User dismisses REMINDER type from source X | Dismissal recorded; same type from source X suppressed for session |
| V-PROACTIVE-07 | DECISION notification receives no response for 2 hours | Escalated to L4; push sent if user not active in app |
| V-PROACTIVE-08 | Three notifications dismissed in 30 minutes without action | Fatigue signal triggers; proactive output reduced to L3+ for 2 hours |
| V-PROACTIVE-09 | Opportunity type notification: opportunity expires | Notification marked EXPIRED; withdrawn from view without requiring user action |
| V-PROACTIVE-10 | Event bus emits TASK_FAILED; proactive gate evaluates relevance | If relevance above threshold: ALERT generated with human-readable context; else SUPPRESSED |
| V-PROACTIVE-11 | User is in PAUSED voice state; L3 CHANGE notification pending | Delivered as In-App notify; voice not interrupted |
| V-PROACTIVE-12 | Two routes simultaneously create equivalent notifications | Layer 1 dedup at event ingestion drops second; one notification created |
| V-PROACTIVE-13 | User requests explanation of why notification appeared | Observability metadata (§21) shown: trigger, context, relevance score, evidence class |
| V-PROACTIVE-14 | APEX generates INSIGHT with PROPOSED evidence classification | Evidence classification shown in notification detail; user can verify basis |

---

## 25. Files Created

| File | Purpose |
|---|---|
| `docs/interface/UX-09-PROACTIVE-COMMUNICATION.md` | This document |

---

## 26. Files Deliberately Not Modified

| File | Reason |
|---|---|
| `lib/pwa/notification-scheduler.js` | Observed; documented as-is; modifications are PROPOSED architecture work |
| `lib/pwa/push.js` | Observed; documented as-is |
| `lib/attention/attention-engine.js` | Observed; wiring to proactive gate is PROPOSED |
| `lib/event-bus.js` | Observed; event bus consumer is PROPOSED |
| `src/routes/browser.js` | Observed; central gate replacement is PROPOSED |
| `src/routes/master.js` | Observed; central gate replacement is PROPOSED |
| `lib/auto-pipeline.js` | Observed; hook replacement is PROPOSED |
| `routes/briefing.js` | Observed; proactive integration is PROPOSED |

---

## 27. Tests

| # | Test Criterion | Category | Status |
|---|---|---|---|
| T-09-01 | Scheduler fires at exact configured time | Scheduler | OBSERVED (passes) |
| T-09-02 | Scheduler does not fire duplicate within same minute on restart | Dedup | PROPOSED — not implemented |
| T-09-03 | Push delivery reaches all active subscriptions | Delivery | OBSERVED (passes) |
| T-09-04 | Push does not deliver duplicate within L2 cooldown window | Dedup | PROPOSED — not implemented |
| T-09-05 | Notification creation from browser.js passes through central gate | Gate | PROPOSED — not implemented |
| T-09-06 | Notification creation from master.js passes through central gate | Gate | PROPOSED — not implemented |
| T-09-07 | Attention engine score influences notification channel selection | Wiring | PROPOSED — not implemented |
| T-09-08 | All 17 event bus events can trigger proactive evaluation | Event bus | PROPOSED — not implemented |
| T-09-09 | SILENT decision produces log record with suppression reason | Lifecycle | PROPOSED — not implemented |
| T-09-10 | Voice state LISTENING suppresses all notifications except L5 | Voice | PROPOSED — not implemented |
| T-09-11 | Voice state SPEAKING permits L5 audio interrupt | Voice | PROPOSED — not implemented |
| T-09-12 | Queued notifications re-enter evaluation on IDLE | Voice | PROPOSED — not implemented |
| T-09-13 | Dismissed notification creates persistent dismissal record | Dedup | PROPOSED — not implemented |
| T-09-14 | Dismissal record persists across page reload | Dedup | PROPOSED — not implemented |
| T-09-15 | DECISION notification escalates to L4 after timeout | Escalation | PROPOSED — not implemented |
| T-09-16 | L5 escalation overrides all suppression conditions | Escalation | PROPOSED — not implemented |
| T-09-17 | Expired notification is withdrawn without user action | Lifecycle | PROPOSED — not implemented |
| T-09-18 | Fatigue signal reduces proactive output after 3 consecutive dismissals | Fatigue | PROPOSED — not implemented |
| T-09-19 | Notification metadata includes trigger, context, relevance score | Observability | PROPOSED — not implemented |
| T-09-20 | User can retrieve suppressed notification from Activity Feed | User agency | PROPOSED — not implemented |
| T-09-21 | Proactive Present item enters UX-08 pipeline unchanged | Integration | PROPOSED — not implemented |
| T-09-22 | Opportunity notification marked EXPIRED does not re-surface | Lifecycle | PROPOSED — not implemented |
| T-09-23 | APEX language conforms to governance tier (no EXECUTED phrasing for RECOMMENDATION) | Governance | PROPOSED — requires content audit |

---

## 28. Deviations

| Deviation | From | Reason |
|---|---|---|
| Deduplication cooldown windows specified | UX-08 does not define cooldown windows | Required to operationalise silence model; defined here as PROPOSED |
| Fatigue model specified | UX-05 does not define fatigue model | Required to prevent attention budget collapse; defined here as PROPOSED |
| Authority tier taxonomy (§20) | Not defined in prior UX documents | Required to govern APEX language in proactive communications |

---

## 29. Open Questions

1. **Dedup store persistence**: Should the deduplication fingerprint store be Supabase-persisted (cross-device) or in-memory (session only)? Cross-device is more correct but introduces latency on every notification creation.

2. **Relevance scoring algorithm**: What is the concrete algorithm for computing relevance score? Rule-based heuristics per type (§11) are a starting point, but this requires calibration. Who defines the thresholds and what is the tuning process?

3. **Voice state source of truth**: `lib/pwa/notification-scheduler.js` has no access to voice state. What is the mechanism by which the proactive gate reads current voice state? Is there a shared state store, or does the gate subscribe to voice state events?

4. **Fatigue model signals**: The fatigue model (§10) uses dismissal count as its primary signal. Are there other signals that should contribute — time-of-day, session length, number of active tasks, explicit user preference?

5. **Briefing integration**: The briefing aggregator (`routes/briefing.js`) is production-active. Should proactive items that resolve to NEXT-BRIEFING timing be inserted directly into the briefing aggregation pipeline, or should they be stored separately and merged at briefing render time?

6. **L5 definition boundary**: The current production system has no formal definition of what constitutes L5 URGENT. Without a definition, any notification creator can self-classify as L5, defeating all suppression. Who has authority to assign L5 classification, and is this enforced in code or by convention?

7. **Backward compatibility**: The central gate (§23) would replace 7 existing insertion points. What is the migration path that does not break existing notification delivery during transition?

---

## 30. Final Status

| Completion Criterion | Status |
|---|---|
| Production proactive architecture fully documented | DONE |
| All production gaps identified and classified | DONE |
| Silence / suppression model specified (15+ conditions) | DONE |
| Attention budget model defined and extended from UX-08 | DONE |
| Nine communication types defined with channel, level, timing | DONE |
| Channel selection model specified (urgency × complexity × state) | DONE |
| Seven timing modes defined | DONE |
| Five-step escalation model defined | DONE |
| Three-layer deduplication model specified (PROPOSED) | DONE |
| Thirteen-state notification lifecycle defined | DONE |
| Voice integration rules specified for all 11 UX-07 states | DONE |
| Present / Notify integration with UX-08 pipeline documented | DONE |
| Governance and user agency tiers defined | DONE |
| Observability requirements specified | DONE |
| Knowledge / intelligence integration pathway documented | DONE |
| Prototype architecture specified | DONE |
| Fourteen scenarios documented with PROPOSED status | DONE |
| Twenty-three test criteria defined | DONE |
| Open questions captured | DONE |
| Evidence classification applied throughout | DONE |
