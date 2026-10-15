# UX-08 — CONTEXTUAL PRESENTATION

Status: COMPLETE
Phase: UX-08
Design Authority: UX-05 (binding)
Hard Stop After: YES
Date Completed: 2026-08-27

---

## 1. Objective

Define how APEX surfaces information to the user based on current context, attention state, and relevance — ensuring that the right content appears at the right moment through the right visual channel, without overloading cognitive bandwidth.

This phase establishes the specification for a dynamic contextual presentation layer that wires the existing Attention Engine to front-end visual state, replaces static dashboard widgets with context-aware cards, and enforces UX-05 presentation discipline across all APEX surfaces.

---

## 2. Scope

### In Scope
- Contextual card system (appearing, active, dismissed lifecycle)
- Wiring Attention Engine scores to UX-05 L0–L5 attention levels
- Progressive disclosure rules for all presentation categories
- Present vs Notify distinction (authoritative)
- Voice interaction constraints on presentation
- Converse integration triggers
- Activity feed filtering (meaningful vs noise)
- Governance and attention management rules
- Prototype architecture specification
- Voice scenario definitions V-CONTEXT-01 through V-CONTEXT-10

### Out of Scope
- Implementation of front-end components (prototype only in this phase)
- Changes to Attention Engine scoring weights (UX-05 authority)
- Push notification content (owned by `lib/pwa/push.js` and UX-04)
- New Supabase schema changes (flagged as dependencies only)
- Voice synthesis and ASR (UX-07 authority)

---

## 3. Authoritative Inputs

| Phase | Document | Authority Level | Key Contribution to UX-08 |
|-------|----------|----------------|---------------------------|
| UX-00 | Legacy Interface Baseline | Reference | Existing widget inventory; static layout assumptions to retire |
| UX-01 | Canonical UX Discovery | Reference | User mental model; attention preferences; distraction sensitivity |
| UX-02 | User Task Model | Reference | Task taxonomy; task-context triggers for presentation |
| UX-03 | Information Architecture | Reference | Content hierarchy; what belongs at which IA node |
| UX-04 | Communication Architecture | Binding | Present vs Notify distinction; channel rules; briefing cadence |
| UX-05 | Canonical Visual Design System | BINDING | Attention levels L0–L5; Present states; progressive disclosure; elevation model; all presentation rules |
| UX-06 | Command Centre Visual Prototype | Reference | Dashboard layout; widget placement; surface constraints |
| UX-07 | Voice Experience | Binding | Voice state constraints on visual presentation; voice-triggered presentation rules |

---

## 4. Existing Production Presentation Architecture (OBSERVED)

### 4.1 Notification System

**File:** `src/routes/notifications.js`
**Transport:** Supabase Realtime
**Status:** Production-active

Handles creation, retrieval, and real-time delivery of notifications. Currently delivers to a notification strip on dashboard.html. The strip is always visible and does not adapt to context — it renders all notifications regardless of attention state or user context.

### 4.2 Attention Engine

**File:** `lib/attention/attention-engine.js`
**Status:** Production-active (back-end only)

Weighted 6-factor scoring system producing scores 0.0–1.0 (internally 0–1000):

| Factor | Weight |
|--------|--------|
| goalPriority | 0.30 |
| risk | 0.25 |
| financialWeight | 0.15 |
| memoryRelevance | 0.15 |
| urgency | 0.10 |
| cognitiveConfidence | 0.05 |

The engine produces scores but does not currently pass them to any front-end visual channel. No UX-05 attention level is assigned downstream. The score is computed but not acted on visually.

### 4.3 Activity Feed

**File:** WebSocket endpoint `/ws/viz`
**Status:** Production-active

Renders 40 rolling events, color-coded by event type. Draws from the Event Bus (17 canonical events, 200-event rolling log in `lib/event-bus.js`). Currently shows all events without filtering — there is no relevance model applied. Signal and noise are visually equivalent.

### 4.4 Briefing System

**File:** `routes/briefing.js`
**Status:** Production-active

9-source aggregation producing priority-inbox, motivation, and wind-down push content. Operates on a schedule. Delivers structured briefing content but does not inject contextual cards dynamically — briefing is a periodic batch delivery, not a contextual surface.

### 4.5 Push Notifications

**Files:** `lib/pwa/push.js`, `lib/pwa/notification-scheduler.js`
**Status:** Production-active

10 scheduled reminders delivered via PWA push. These are time-triggered, not context-triggered. They live in the Notify channel (UX-04), not the Present channel. No dynamic contextual adaptation.

### 4.6 Intelligence / Insights

**File:** `routes/intelligence.js`
**Status:** Production-active

Aggregates news, lessons, performance data, and system status. Delivers to dashboard as static widgets. Content does not appear or disappear based on context — it is always rendered. No UX-05 Present state lifecycle.

### 4.7 Production Status Summary Table

| Capability | Exists | Contextual | UX-05 Wired | Gap |
|------------|--------|------------|-------------|-----|
| Notification delivery | YES | NO | NO | Not context-adaptive |
| Attention scoring | YES | YES (back-end) | NO | Score not consumed by front-end |
| Activity feed | YES | NO | NO | No relevance filter |
| Briefing aggregation | YES | NO (scheduled) | NO | Batch only, not dynamic |
| Push notifications | YES | NO | NO | Time-triggered only |
| Intelligence widgets | YES | NO | NO | Static, always visible |
| Contextual cards | NO | — | — | Does not exist |
| Progressive disclosure | NO | — | — | Does not exist |
| Present state lifecycle | NO | — | — | Does not exist |

---

## 5. Production Gaps

1. **No contextual card system.** Dashboard widgets are permanent. No mechanism exists to surface, animate, and withdraw cards based on context.
2. **Attention Engine is disconnected from the front-end.** Scores are computed but never consumed by any visual channel. L0–L5 assignment does not happen.
3. **No UX-05 Present state lifecycle.** APPEARING (slide 350ms), ACTIVE, and DISMISSED (fade 220ms) states do not exist in dashboard.html or any front-end component.
4. **Activity feed has no relevance filter.** All 40 events render equally regardless of their contextual significance.
5. **Notification strip does not adapt to context.** It is always visible and does not reflect attention level or user state.
6. **No progressive disclosure.** Users cannot expand from L0 Surface to L4 Constitutional — all information is flat and equally visible.
7. **No Present vs Notify enforcement at the UI layer.** Both channels collapse into the notification strip.

---

## 6. Evidence Classification

Evidence cited in this document is classified as follows:

- **OBSERVED:** Confirmed in production code audit. File paths verified.
- **INFERRED:** Behaviour deduced from code structure; not directly tested at runtime.
- **PROPOSED:** Design specification for capabilities that do not yet exist.
- **BINDING:** Rules derived from UX-05 that cannot be overridden by this document.

All production gap claims are OBSERVED. All contextual card, progressive disclosure, and Present state rules are PROPOSED unless marked otherwise.

---

## 7. Context Model

Context is the set of signals APEX evaluates to determine what to present. Context is not a single value — it is a composite of the following dimensions:

| Dimension | Source | Examples |
|-----------|--------|---------|
| Time of day | System clock | Morning (briefing-mode), evening (wind-down), mid-day (execution-mode) |
| Active task | Task system | Currently running pipeline, open goal, pending decision |
| Recent activity | Event Bus (`lib/event-bus.js`) | Last 5 canonical events within 10 minutes |
| Voice state | UX-07 voice engine | SPEAKING, LISTENING, IDLE |
| Conversation state | Converse module | Active thread, awaiting response, idle |
| Pending decisions | Attention Engine | Items scored above threshold awaiting resolution |
| Notification queue | Supabase Realtime | Unread count, age, category |
| Calendar / schedule | Briefing system | Upcoming commitments within 30 minutes |
| System health | `routes/intelligence.js` | Error rates, pipeline failures, anomalies |
| User presence | Activity signal | Active (recent interaction), idle (>5 min no input) |

Context is evaluated on every Attention Engine scoring cycle. Context signals collapse into a relevance score per candidate presentation item before channel assignment.

---

## 8. Relevance Model

APEX determines what to present by evaluating each candidate item against current context. A candidate item passes the relevance filter if it meets the following criteria:

**Criteria (all must pass):**

1. **Contextual match:** The item's topic or entity overlaps with at least one active context dimension (current task, recent event type, active goal).
2. **Recency:** The item was generated or updated within the relevance window (default: 30 minutes for L1–L3; 4 hours for L4–L5 decisions).
3. **Threshold:** The item's attention score (from the Attention Engine) is at or above the minimum threshold for its category (see §9).
4. **Deduplication:** The same item or substantially identical content has not already been presented in the current session.
5. **Cognitive load budget:** The total number of ACTIVE Present cards does not exceed the cap (see §13).

Items that fail relevance are suppressed (L0 SILENT). They are not discarded — they remain in the queue and are re-evaluated on the next context cycle (default: 60 seconds).

---

## 9. Priority Model — Attention Engine to UX-05 Attention Levels

The Attention Engine produces a normalised score in the range 0.0–1.0. This section is the authoritative mapping from score to UX-05 attention level. This mapping is BINDING for all front-end presentation decisions.

| Score Range | UX-05 Level | Name | Presentation Channel | Visual Elevation |
|-------------|-------------|------|----------------------|-----------------|
| 0.00–0.20 | L0 | SILENT | None — logged only | None |
| 0.20–0.35 | L1 | LOG | Panel (collapsed) | Panel |
| 0.35–0.50 | L2 | IN-APP | Contextual card (visible) | Elevated panel |
| 0.50–0.65 | L3 | ATTENTION | Contextual card (prominent) | Overlay |
| 0.65–0.80 | L4 | DECISION | Modal or persistent overlay | Modal |
| 0.80–1.00 | L5 | URGENT | Top chrome (full-width banner) | Top chrome |

**Notes:**
- L0 items enter the event log only. They are never surfaced in the UI.
- L1 items appear in a collapsible panel section. They do not animate in; they are present when the panel is opened.
- L2 items trigger the APPEARING state (slide in, 350ms). They become ACTIVE and remain until dismissed or context changes.
- L3 items appear with higher visual weight and are not auto-dismissed. They require explicit user action.
- L4 items render as modals. They block interaction with lower-priority content until resolved.
- L5 items render in top chrome. They persist until acknowledged. They are not suppressed by voice state (see §16).
- Score boundaries are inclusive at the lower bound, exclusive at the upper bound (e.g., 0.50 is L3, not L2).

---

## 10. Presentation Model

The full contextual presentation pipeline operates as follows. Each step is described in sequence.

```
CONTEXT → RELEVANCE FILTER → ATTENTION SCORE → PRESENTATION DECISION
       → VISUAL CHANNEL → USER RESPONSE → RESOLUTION → WITHDRAWAL/PERSISTENCE
```

**Step 1: CONTEXT**
On each evaluation cycle (default: 60s, or triggered by event bus event), APEX assembles the current context composite from all dimensions defined in §7. Context is a snapshot — it reflects the state at the moment of evaluation, not a rolling average.

**Step 2: RELEVANCE FILTER**
Each candidate item in the presentation queue is evaluated against the current context snapshot using the criteria in §8. Items that fail are held in the queue and re-evaluated next cycle. Items that pass proceed to scoring.

**Step 3: ATTENTION SCORE**
The Attention Engine (`lib/attention/attention-engine.js`) computes a 6-factor weighted score for each item that passed relevance. The score reflects the inherent importance of the item, not the user's current attentional state. The score is normalised to 0.0–1.0.

**Step 4: PRESENTATION DECISION**
The score is mapped to an attention level (§9). The attention level determines the visual channel and elevation. The cognitive load budget (§13) is checked. If the budget is exhausted for the assigned level, the item is queued and not presented until a slot opens.

**Step 5: VISUAL CHANNEL**
The item is assigned to its visual channel:
- L0: Event log only (no visual render)
- L1: Panel section (no animation)
- L2: Contextual card — APPEARING state triggers (slide, 350ms), transitions to ACTIVE
- L3: Contextual card with elevated styling — APPEARING state triggers, transitions to ACTIVE
- L4: Modal — renders immediately, blocks lower content
- L5: Top chrome banner — renders immediately, persists

**Step 6: USER RESPONSE**
The item waits in ACTIVE state for user interaction. Valid responses depend on item category (§11): dismiss, defer, expand, collapse, act, acknowledge. If no response occurs within the auto-dismiss timeout (L2: 90s default; L3+: no auto-dismiss), the item proceeds to the auto-resolution path.

**Step 7: RESOLUTION**
An item is resolved when the user responds (explicit resolution) or when the triggering context is no longer active (implicit resolution). Resolution type is logged to the event bus.

**Step 8: WITHDRAWAL / PERSISTENCE**
On resolution, items at L2 enter DISMISSED state (fade, 220ms). Items at L3 enter DISMISSED state only on explicit user action. L4/L5 items persist until acknowledged regardless of context change. Withdrawn items are logged as DISMISSED in the notification table with a resolved_at timestamp.

---

## 11. Presentation Categories

There are 7 canonical presentation categories. Each has a fixed channel assignment, attention level range, progressive disclosure entry point, and available controls.

### INFORMATION
- **Description:** Factual content the user may find useful but that requires no action. News, performance summaries, system statistics.
- **UX-05 Channel:** Present only
- **Attention Level:** L1–L2
- **Progressive Disclosure Entry:** L0 Surface (essential summary, one line)
- **Controls:** Expand, Collapse, Dismiss

### INSIGHT
- **Description:** Derived or inferred content that adds interpretive value — pattern detection, anomaly observation, trend identification.
- **UX-05 Channel:** Present only
- **Attention Level:** L2–L3
- **Progressive Disclosure Entry:** L1 Expanded (key finding visible without interaction)
- **Controls:** Expand, Collapse, Dismiss, Act (if actionable)

### STATUS
- **Description:** Current state of a system, pipeline, task, or integration. Includes health indicators and progress updates.
- **UX-05 Channel:** Present only
- **Attention Level:** L1–L3 (L3 if degraded/error state)
- **Progressive Disclosure Entry:** L0 Surface (status indicator only)
- **Controls:** Expand, Dismiss, Act (for error states)

### DECISION
- **Description:** Items requiring the user to choose between options before a process can continue. Approval requests, configuration prompts, goal prioritisation.
- **UX-05 Channel:** Present (L4 modal) + optional Notify (L5 push if unresolved beyond threshold)
- **Attention Level:** L4
- **Progressive Disclosure Entry:** L2 Detail (options visible; context available on expand)
- **Controls:** Act (primary), Expand (for context), Defer

### ACTION
- **Description:** Suggested or required user actions — tasks to execute, steps to complete, quick replies.
- **UX-05 Channel:** Present (L2–L3), Notify (L4 push if time-sensitive)
- **Attention Level:** L2–L4
- **Progressive Disclosure Entry:** L1 Expanded (action button visible without expand)
- **Controls:** Act (primary), Defer, Dismiss

### WARNING
- **Description:** Conditions that may cause harm, loss, or degradation if not addressed. Risk signals, threshold breaches, anomalies.
- **UX-05 Channel:** Present (L3–L4) + Notify (L4–L5 push)
- **Attention Level:** L3–L5
- **Progressive Disclosure Entry:** L1 Expanded (warning text visible; severity indicated)
- **Controls:** Act (primary), Acknowledge, Expand (for evidence)

### CONFIRMATION
- **Description:** Acknowledgement that a requested action has completed. Task done, pipeline succeeded, message sent.
- **UX-05 Channel:** Present only (L1–L2), brief
- **Attention Level:** L1–L2
- **Progressive Disclosure Entry:** L0 Surface (one-line result)
- **Controls:** Dismiss (auto-dismisses at L2 after 5s by default)

---

## 12. Presentation Depth / Progressive Disclosure

UX-05 §35.4 defines five disclosure levels. These are BINDING and must be implemented for all contextual cards at L2 and above.

| Level | Name | Content Rule | Triggered By |
|-------|------|--------------|--------------|
| L0 Surface | Essential summary only | One line maximum. No secondary data. Status indicator or count only. | Default render state |
| L1 Expanded | Key finding visible | 2–4 lines. Primary metric or finding visible. No evidence detail. | Tap / hover on card |
| L2 Detail | Supporting data visible | Full card content. Data points, timestamps, contributing factors. | Explicit expand action |
| L3 Evidence | Source material visible | Raw data, logs, linked records, contributing event list. | Secondary expand within L2 Detail |
| L4 Constitutional | Governance and authority chain | Which rule, principle, or governance decision this item relates to. Audit trail link. | Explicit "why" action |

**Rules:**
- All contextual cards begin at L0 Surface when entering APPEARING state.
- No card may render at L2 Detail or deeper without user interaction.
- L4 Constitutional is only available for DECISION and WARNING categories.
- Auto-dismiss (DISMISSED state) applies only to cards at L0 or L1 Expanded. Cards expanded to L2+ are not auto-dismissed.

---

## 13. Attention Management

APEX enforces a cognitive load budget to prevent attention overload. The following limits apply simultaneously.

| Attention Level | Maximum Concurrent ACTIVE Items |
|----------------|--------------------------------|
| L2 IN-APP | 3 |
| L3 ATTENTION | 1 |
| L4 DECISION | 1 (modal, blocks others) |
| L5 URGENT | 1 (top chrome, persistent) |

**Competition Resolution:**
When a new item's assigned level would exceed the budget:
1. If the new item scores higher than the lowest-scoring ACTIVE item at the same level, the lowest-scoring item enters DISMISSED state and the new item enters APPEARING.
2. If the new item scores equal or lower, it is queued and re-evaluated on the next cycle.
3. L4 and L5 items are never displaced by lower-scoring items — they must be resolved by the user before new L4/L5 items render.

**Anti-spam rule:** A given entity (task, integration, goal ID) may not generate more than 1 ACTIVE card per attention level at any time. Subsequent items from the same entity are queued until the existing card is resolved.

**Auto-dismiss:**
- L2 INFORMATION and CONFIRMATION cards: auto-dismiss after 90 seconds if user has not interacted.
- L2 ACTION and INSIGHT cards: auto-dismiss after 180 seconds.
- L3+: no auto-dismiss. User resolution required.

---

## 14. User Controls

The following controls are available on contextual cards. Not all controls apply to all categories (see §11).

| Control | Trigger | Effect | Logged |
|---------|---------|--------|--------|
| Dismiss | Swipe or X button | Card enters DISMISSED state (fade, 220ms). Item marked dismissed in notification table. | YES |
| Defer | Defer button (L3+) | Card enters DISMISSED state. Item re-queued for re-evaluation after user-selected delay (15m, 1h, 4h, tomorrow). | YES |
| Expand | Tap card body | Card advances one progressive disclosure level. | NO |
| Collapse | Collapse button | Card retreats one progressive disclosure level. | NO |
| Act | Primary action button | Executes the item's primary action. Card enters DISMISSED state on success. | YES |
| Acknowledge | Acknowledge button (L5) | Marks item as seen. Top chrome retracts. Item remains in log. | YES |

All Dismiss, Defer, Act, and Acknowledge interactions are written to the event bus as canonical events. Expand and Collapse are local UI state only.

---

## 15. Present vs Notify

This section is authoritative. These two channels are not interchangeable. Any implementation that treats them as equivalent is non-compliant with UX-04 and UX-05.

**PRESENT**
Present is contextual surface-embedded content requiring extended attention. It is rendered within the dashboard or active APEX surface. It persists for the duration of its relevance window or until the user resolves it. It supports full progressive disclosure. It is appropriate for content where the user needs time to read, assess, or decide.

- Rendered in: Dashboard contextual card area, modal (L4), top chrome (L5)
- Duration: Seconds to hours depending on category and level
- Interaction model: Rich — expand, collapse, act, defer, dismiss
- Auto-triggers: Context change, Attention Engine threshold crossing, event bus event
- Voice constraint: Suppressed at L2 during SPEAKING (see §16)

**NOTIFY**
Notify is a time-bounded alert requiring brief attention or a single action. It is delivered via push notification, notification strip, or audio cue. It does not support progressive disclosure. It is appropriate for time-sensitive signals where the user must decide to engage (open APEX) or dismiss.

- Rendered in: Push notification, notification strip, audio cue
- Duration: Bounded — disappears after acknowledgement or timeout
- Interaction model: Minimal — tap to open, swipe to dismiss
- Auto-triggers: Scheduled time, threshold breach, pipeline event
- Voice constraint: L4/L5 Notify may fire during SPEAKING (brief audio cue only; no visual overlay during voice)

**Key distinction:** A DECISION item that needs resolution uses PRESENT (L4 modal) within the APEX surface. The same item uses NOTIFY only as an escalation mechanism when the user is outside APEX and the decision has been pending beyond a threshold. These are sequential, not simultaneous.

---

## 16. Voice Integration

Voice state (UX-07) constrains contextual presentation. These rules are BINDING.

### When Voice State = SPEAKING (APEX is generating spoken output)

- Do NOT inject new L2 or L3 Present cards. Any newly triggered L2/L3 items are queued and presented after speaking ends.
- L4 DECISION modals: suppressed during SPEAKING unless the decision is directly related to the current voice interaction.
- L5 URGENT items: MAY appear in top chrome even during SPEAKING. Top chrome is outside the voice interaction area and does not disrupt the spoken flow.
- L4/L5 Notify (push): MAY deliver. Push notifications are outside the APEX surface.
- L1 items: Log silently; do not animate in.
- Rationale: Injecting new visual content during speech splits attention and degrades comprehension of the spoken output.

### When Voice State = LISTENING (APEX is receiving spoken input)

- No new cards of any level are injected. The user's visual attention should remain on what they are saying, not on new content appearing.
- L5 URGENT items: suppressed during LISTENING. If a new L5 item arrives during LISTENING, it is queued and surfaces immediately when LISTENING ends.
- Exception: If LISTENING ends due to silence timeout (not user action), queued items surface normally.
- Rationale: Visual distraction during LISTENING degrades speech recognition accuracy and breaks the conversational loop.

### When Voice State = IDLE (voice engine not active)

- All presentation levels operate normally.
- No restrictions apply.
- This is the default operating mode for the contextual presentation layer.

### Voice-triggered presentation

A voice interaction may itself trigger a contextual card. Example: the user asks "what is my pipeline status?" — APEX speaks the answer AND surfaces an L2 STATUS card with supporting detail. The card enters APPEARING state when the spoken response begins, not before. This ensures the card is available for visual follow-up after the voice interaction ends.

---

## 17. Converse Integration

The Converse module (conversation interface) interacts with contextual presentation in the following ways.

**Converse triggers presentation:**
When a conversation thread produces a DECISION, ACTION, or WARNING output, the relevant contextual card is injected at the appropriate attention level. The card is linked to the conversation thread ID so the user can return to context.

**Converse suppresses presentation:**
During an active Converse thread, L2 and L3 cards that are unrelated to the current conversation topic are suppressed. The relevance filter checks conversation entity overlap before allowing injection. This prevents unrelated cards from distracting from an in-progress interaction.

**Presentation triggers Converse:**
An L4 DECISION card may include a "Discuss" control that opens a Converse thread pre-loaded with the decision context. This allows the user to reason through the decision conversationally before committing.

**Converse state signals:**
- ACTIVE THREAD: Suppress unrelated L2/L3 cards. Allow L4/L5.
- AWAITING RESPONSE: All presentation normal; user is not engaged in active input.
- IDLE: All presentation normal.

---

## 18. Activity Integration

The Activity Feed (`/ws/viz`) currently renders 40 raw events without filtering. UX-08 introduces a meaningful vs noise classification.

**Meaningful events** (surface in contextual cards when relevance criteria met):
- Task completed or failed
- Pipeline stage changed
- Goal threshold crossed
- Decision required
- Integration error or recovery
- Briefing delivered
- Anomaly detected

**Noise events** (log only, never surface as contextual cards):
- Heartbeat / ping events
- Cache refresh events
- Read-only data polling
- Repeated identical events within 60 seconds (deduplication window)
- Internal system housekeeping events

**Implementation rule:** The activity feed continues to show all events for transparency. However, only meaningful events are eligible as contextual card candidates. The feed and the contextual card layer are separate surfaces — the feed is an audit log, not a presentation layer.

---

## 19. Governance Considerations

1. **Attention budget must be respected.** Exceeding the concurrent card limits defined in §13 is a governance violation. Any code path that bypasses the budget check requires explicit documented justification.
2. **L4 and L5 items must be logged with full audit trail.** Timestamp, score, factor breakdown, user response, resolution time.
3. **Dismissal is not deletion.** A dismissed card must be recoverable from the notification log. Users must be able to access the full history of what was presented and what they did.
4. **Auto-dismiss only at L2 and below.** Auto-dismissing an L3+ item without user action is a governance violation.
5. **Voice constraints are not optional.** Injecting L2+ cards during SPEAKING or LISTENING states is a UX-07 compliance violation.
6. **No direct database writes from the presentation layer.** Presentation state changes (dismiss, defer, acknowledge) are written via the notifications API (`src/routes/notifications.js`), not directly to Supabase.

---

## 20. Prototype Architecture

The following components are specified for prototype implementation. None exist in production today (PROPOSED).

### 20.1 ContextEngine (new)

**Location:** `lib/context/context-engine.js`
**Role:** Assembles the context composite from all dimension sources on each evaluation cycle. Emits a `context:updated` event to the event bus.
**Inputs:** System clock, task system, event bus rolling log, voice state signal, conversation state, notification queue, intelligence routes.
**Output:** Context object `{ timeOfDay, activeTask, recentEvents[], voiceState, converseState, pendingDecisions[], systemHealth }`.

### 20.2 RelevanceFilter (new)

**Location:** `lib/context/relevance-filter.js`
**Role:** Evaluates each candidate presentation item against the current context object. Returns pass/fail + relevance score.
**Inputs:** Context object, candidate item, session history (for deduplication).
**Output:** `{ pass: boolean, relevanceScore: 0.0–1.0, reason: string }`.

### 20.3 PresentationQueue (new)

**Location:** `lib/presentation/presentation-queue.js`
**Role:** Manages the ordered queue of items that have passed relevance. Enforces cognitive load budget. Dispatches items to the front-end via WebSocket.
**State:** Per-level ACTIVE slots, per-entity deduplication map, defer registry.
**Output:** `presentation:inject` WebSocket events to dashboard.html.

### 20.4 ContextualCard (new front-end component)

**Location:** `public/js/components/contextual-card.js`
**Role:** Renders a single contextual card with full UX-05 Present state lifecycle and progressive disclosure.
**States:** APPEARING (slide, 350ms), ACTIVE, DISMISSED (fade, 220ms).
**Disclosure levels:** L0 Surface → L1 Expanded → L2 Detail → L3 Evidence → L4 Constitutional.
**Controls:** Per §14.

### 20.5 AttentionBridge (new)

**Location:** `lib/attention/attention-bridge.js`
**Role:** Consumes Attention Engine output and maps scores to UX-05 levels per §9. Passes level-assigned items to PresentationQueue.
**Input:** Raw attention score (0.0–1.0) + item metadata.
**Output:** Level-assigned item `{ item, level: 'L0'|'L1'|...|'L5', score: 0.0–1.0 }`.

### 20.6 dashboard.html modifications (PROPOSED)

- Add contextual card mount point `<div id="cx-card-zone">` below command bar.
- Add top chrome mount point `<div id="cx-top-chrome">` above all content.
- Remove static always-visible widget wrappers that will be replaced by contextual cards.
- Wire `presentation:inject` WebSocket events to ContextualCard renderer.

---

## 21. Voice Scenarios

All scenarios below are PROPOSED. Dynamic contextual presentation does not exist in production.

### V-CONTEXT-01: Pipeline completes during voice interaction
**Trigger:** `task:completed` event fires while voice state = SPEAKING.
**Expected behaviour:** Attention score computed. If L1–L3, card is queued. After SPEAKING ends, card enters APPEARING state. User sees CONFIRMATION card with task result.
**Status:** PROPOSED

### V-CONTEXT-02: Urgent warning during voice listening
**Trigger:** L5 WARNING fires (score ≥ 0.80) while voice state = LISTENING.
**Expected behaviour:** L5 item queued during LISTENING. When LISTENING ends, top chrome banner enters immediately. Voice recognition result is processed first; top chrome renders on completion of the turn.
**Status:** PROPOSED

### V-CONTEXT-03: User asks voice "what needs my attention?"
**Trigger:** Voice query triggers APEX to evaluate current presentation queue.
**Expected behaviour:** APEX speaks top 2–3 pending items by attention level. Simultaneously surfaces each as a contextual card in APPEARING state as it is mentioned. Cards enter ACTIVE after mention.
**Status:** PROPOSED

### V-CONTEXT-04: Decision card awaiting resolution, user starts voice session
**Trigger:** L4 DECISION modal is ACTIVE; user activates voice.
**Expected behaviour:** Modal remains visible. Voice session begins. If user says "defer the decision" or equivalent, Defer control is triggered via voice command. Modal enters DISMISSED.
**Status:** PROPOSED

### V-CONTEXT-05: New high-priority insight while user is in Converse thread
**Trigger:** Attention Engine scores a new INSIGHT item at L3 (score 0.52). Converse thread is ACTIVE on unrelated topic.
**Expected behaviour:** Relevance filter checks topic overlap — no match. Item suppressed during Converse. When Converse thread ends, item is re-evaluated and surfaces if still within relevance window.
**Status:** PROPOSED

### V-CONTEXT-06: Multiple L2 cards competing for budget
**Trigger:** 3 L2 cards are ACTIVE. A 4th L2 item arrives with higher attention score than the lowest ACTIVE card.
**Expected behaviour:** Lowest-scoring ACTIVE L2 card enters DISMISSED (fade, 220ms). New item enters APPEARING (slide, 350ms). Budget maintained at 3.
**Status:** PROPOSED

### V-CONTEXT-07: User expands card to L2 Detail, auto-dismiss should not fire
**Trigger:** L2 INFORMATION card is ACTIVE. User expands to L2 Detail. 90-second auto-dismiss timer expires.
**Expected behaviour:** Auto-dismiss is cancelled once card is at L2 Detail or deeper. Card persists until explicit user action (Collapse to L1, then auto-dismiss re-arms; or Dismiss).
**Status:** PROPOSED

### V-CONTEXT-08: Morning briefing triggers contextual card burst
**Trigger:** Briefing system delivers morning briefing. Multiple items qualify as contextual cards.
**Expected behaviour:** Items are scored and level-assigned. Only the top 3 L2 items and at most 1 L3 item surface immediately. Remaining items are queued and surface as current cards are dismissed. No more than budget-max cards render simultaneously.
**Status:** PROPOSED

### V-CONTEXT-09: Integration error detected, user is idle (no voice, no Converse)
**Trigger:** `integration:error` event fires. Attention score = 0.67 (L4).
**Expected behaviour:** L4 DECISION modal renders immediately. Top chrome does not render (L4 is modal, not top chrome). User must acknowledge or act before lower-priority content is accessible.
**Status:** PROPOSED

### V-CONTEXT-10: User returns to APEX after extended absence (>1 hour idle)
**Trigger:** Activity signal transitions from idle to active. Presentation queue has accumulated items during absence.
**Expected behaviour:** Context is re-evaluated with fresh snapshot. Stale items (older than relevance window) are auto-expired from the queue without surfacing. Remaining items are surfaced in priority order, respecting the cognitive load budget. No burst injection — items stagger with minimum 3-second gap between APPEARING transitions.
**Status:** PROPOSED

---

## 22. Files Created

None. This is a specification document. No production files were created in this phase.

Prototype files specified (not yet created):
- `lib/context/context-engine.js`
- `lib/context/relevance-filter.js`
- `lib/presentation/presentation-queue.js`
- `public/js/components/contextual-card.js`
- `lib/attention/attention-bridge.js`

---

## 23. Files Deliberately Not Modified

| File | Reason Not Modified |
|------|---------------------|
| `lib/attention/attention-engine.js` | Scoring weights are UX-05 authority; no changes permitted without UX-05 amendment |
| `src/routes/notifications.js` | Production-active; modifications deferred to implementation phase |
| `lib/event-bus.js` | Canonical event list stable; new events require separate governance review |
| `dashboard.html` | Front-end modifications deferred to prototype implementation phase |
| `routes/briefing.js` | Briefing architecture unchanged; contextual card integration is additive |
| `lib/pwa/push.js` | Push notifications remain in Notify channel; no structural changes needed |

---

## 24. Tests

No tests are created in this phase (specification only). The following test cases are specified for implementation:

| Test ID | Description | Pass Criteria |
|---------|-------------|---------------|
| T-CX-01 | Score 0.15 item never renders a card | Event log only; no front-end dispatch |
| T-CX-02 | Score 0.40 item enters APPEARING state | Slide animation at 350ms; transitions to ACTIVE |
| T-CX-03 | L2 card auto-dismisses after 90s if not expanded | DISMISSED state fires; fade at 220ms |
| T-CX-04 | L2 card does not auto-dismiss when at L2 Detail | Card persists; auto-dismiss timer cancelled |
| T-CX-05 | 4th L2 card displaces lowest-scoring ACTIVE card | Lowest card dismissed; new card appears |
| T-CX-06 | L3 card not injected during voice SPEAKING | Card queued; surfaces after SPEAKING ends |
| T-CX-07 | L5 card surfaces during voice SPEAKING | Top chrome renders without suppression |
| T-CX-08 | Duplicate entity does not generate second ACTIVE card | Second item queued until first resolved |
| T-CX-09 | Deferred item re-surfaces after selected delay | Item re-enters queue after defer interval |
| T-CX-10 | Stale items (>relevance window) auto-expire on return from idle | Expired items not surfaced; logged as expired |

---

## 25. Deviations

No deviations from UX-05 are recorded in this phase. All rules in this document are compliant with UX-05 binding authority.

If a future implementation requires deviation from any rule in this document, a formal deviation must be logged here with justification and the originating authority's approval.

---

## 26. Open Questions

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| OQ-01 | What is the correct evaluation cycle interval? 60s assumed; may need tuning based on event frequency. | Engineering | Open |
| OQ-02 | Should Defer options (15m, 1h, 4h, tomorrow) be user-configurable or fixed? | UX | Open |
| OQ-03 | Does the attention_profiles table in Supabase need schema changes to store per-item resolution history? | Engineering | Open |
| OQ-04 | Should L3 cards in the activity feed panel be sorted by score or by recency? | UX | Open |
| OQ-05 | Is 3-second stagger between APPEARING transitions on return-from-idle the right value? | UX | Open |
| OQ-06 | Should the ContextEngine run server-side (Node) or client-side (browser)? Current assumption is server-side with WebSocket dispatch. | Engineering | Open |

---

## 27. Production Gaps Summary

| Gap ID | Description | Severity | Prerequisite For |
|--------|-------------|----------|-----------------|
| GAP-01 | No contextual card system in production | Critical | All dynamic contextual presentation |
| GAP-02 | Attention Engine not wired to front-end | Critical | Score-based presentation channel assignment |
| GAP-03 | No UX-05 Present state lifecycle in dashboard.html | Critical | APPEARING/ACTIVE/DISMISSED animations |
| GAP-04 | Activity feed has no relevance filter | High | Meaningful vs noise distinction |
| GAP-05 | Notification strip does not adapt to context | High | Unified Present channel |
| GAP-06 | No progressive disclosure in current UI | High | L0 Surface → L4 Constitutional depth |
| GAP-07 | No Present vs Notify enforcement at UI layer | Medium | Channel compliance |
| GAP-08 | No cognitive load budget enforcement | Medium | Attention management |

---

## 28. Final Status

| Criterion | Status |
|-----------|--------|
| Objective defined | COMPLETE |
| Scope bounded | COMPLETE |
| Authoritative inputs catalogued | COMPLETE |
| Production audit conducted | COMPLETE |
| Production gaps identified and documented | COMPLETE |
| Evidence classified | COMPLETE |
| Context model defined | COMPLETE |
| Relevance model defined | COMPLETE |
| Attention Engine to UX-05 level mapping defined | COMPLETE |
| Presentation pipeline documented | COMPLETE |
| 7 presentation categories specified | COMPLETE |
| Progressive disclosure rules specified | COMPLETE |
| Attention management and competition resolution defined | COMPLETE |
| User controls defined | COMPLETE |
| Present vs Notify distinction authored (authoritative) | COMPLETE |
| Voice integration rules defined | COMPLETE |
| Converse integration defined | COMPLETE |
| Activity integration (meaningful vs noise) defined | COMPLETE |
| Governance considerations stated | COMPLETE |
| Prototype architecture specified | COMPLETE |
| 10 voice scenarios documented | COMPLETE |
| Files created / not modified catalogued | COMPLETE |
| Tests specified | COMPLETE |
| Deviations logged | COMPLETE |
| Open questions captured | COMPLETE |
| Production gaps summary table | COMPLETE |

**Phase UX-08 is COMPLETE. Hard stop observed. No implementation was performed.**
