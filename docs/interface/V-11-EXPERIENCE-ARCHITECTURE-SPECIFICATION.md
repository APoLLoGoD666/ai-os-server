# V-11 EXPERIENCE ARCHITECTURE SPECIFICATION
## FINAL LOCKED DESIGN AUTHORITY — APEX INTERFACE OVERHAUL

**Date:** 2026-08-31  
**Status:** LOCKED — All design decisions resolved. Awaiting implementation authorisation.  
**Authority:** APEX Product — V-11 Design Lock  
**Predecessor:** V-10 Experience Architecture Reconnaissance (`c04c215`)  
**Design Decisions:** See `docs/interface/V-11-DESIGN-DECISIONS.md`  
**Application code changes:** NONE  
**Production:** UNCHANGED (dd1dd1f / 1d3f17e)

> This document is the authoritative design specification governing every subsequent V-11 implementation phase. No implementation phase begins without explicit user authorisation referencing a specific phase defined here. All 10 previously unresolved decisions are resolved in V-11-DESIGN-DECISIONS.md and reflected throughout this document.

---

## PART I — EXPERIENCE PHILOSOPHY

---

### 1.1 The Guiding Principle

APEX should expose **intelligence first**, context second, evidence third, system detail fourth, technical detail only when required.

The interface is not a dashboard. It is a personal AI operating system — an intelligent partner that observes, learns, acts, and reports. The interface must feel like a calm, expert colleague: proactive when it matters, invisible when it doesn't, always honest about what it knows and doesn't know.

**Qualities the final interface must embody:**

- Immediately understandable without prior APEX knowledge
- Extremely easy to navigate
- Transparent without exposing unnecessary implementation detail
- Progressively understandable (depth available on demand, never imposed)
- Visually exceptional — futuristic without gaming aesthetics, calm and intelligent
- Information-dense without feeling cluttered
- Actionable — every consequential item has a clear next step
- Trustworthy — never misleads, never hides failures, always explains
- Responsive and seamless across desktop and mobile
- Coherent across voice, intelligence, memory, knowledge, tasks, approvals, communication and activity

---

### 1.2 The Canonical Questions

APEX is organised around the questions a user naturally asks. The interface maps directly to these questions:

| Question | Surface | Destination |
|----------|---------|-------------|
| **WHAT IS APEX?** | Topbar + system status indicator | Shell (always visible) |
| **WHAT DOES APEX SHOW ME?** | TODAY surface | TODAY |
| **WHAT DOES APEX KNOW?** | Intelligence brief + knowledge coverage | INTELLIGENCE |
| **WHAT DOES APEX THINK?** | Opportunities + briefing analysis | INTELLIGENCE |
| **WHAT DOES APEX RECOMMEND?** | Needs You queue + intelligence items | TODAY + INTELLIGENCE |
| **WHAT IS APEX DOING?** | Active tasks + status indicator | ACTIONS + topbar |
| **WHAT DOES APEX NEED FROM ME?** | Approval queue + alerts | TODAY → Needs You + ACTIONS |
| **WHAT HAS APEX DONE?** | Activity log (human-readable) | ACTIONS → log |
| **WHAT CAN I ASK APEX?** | Command thread + voice | COMMAND |
| **WHAT CAN I CHANGE?** | Preferences + standing approvals | SYSTEM + COMMAND |
| **WHAT DOES APEX REMEMBER?** | Memory in human language | INTELLIGENCE → Memory |
| **WHAT EVIDENCE SUPPORTS THIS?** | L2 evidence expansion (always available) | Any item, inline |
| **WHAT DOES APEX NOT KNOW?** | Knowledge gaps + uncertainty communication | INTELLIGENCE → Knowledge |

A user who has never seen APEX before should be able to answer at least the first six questions within 30 seconds of opening it.

---

### 1.3 Thirteen Design Principles

1. **L0 exists for everything.** Every data surface has a one-sentence human summary. No exceptions.
2. **Depth is available, never imposed.** L3/L4 never appears unless the user requests it.
3. **Blank is prohibited.** Every panel is always in a named state (loading, empty, error, stale, partial, healthy). Never blank.
4. **Failures are honest.** APEX communicates what went wrong and what can be done about it, in plain language.
5. **Evidence is discoverable.** Every intelligence item has a path to its evidence. The path is never more than two taps deep.
6. **Actions have consequence.** Every action card shows: what will happen, why, cost, risk, and reversibility.
7. **Voice is first-class.** A user can accomplish any fundamental task by speaking without a different mental model from the visual UI.
8. **Trust is earned.** Confidence, freshness, and source are always available. APEX acknowledges knowledge gaps.
9. **Context survives navigation.** Expanding an item and navigating away does not lose the context on return.
10. **Mobile is primary.** Mobile is not a shrunken desktop. It is a distinct, thumb-first environment.
11. **Performance is a design decision.** No redesign phase ships if it regresses V-09 performance baselines.
12. **Technical vocabulary belongs in SYSTEM.** Task IDs, agent names, memory UUIDs, and API paths are L4. They belong in SYSTEM → Advanced. Never in user-facing primary UI.
13. **The approval boundary is sacred.** APEX never executes a consequential action without either explicit approval or a standing approval rule. The UI makes this boundary visible at all times.

---

## PART II — USER MODEL

---

### 2.1 Who Uses APEX

A single user who is simultaneously:

- A **student** — University work, assignments, deadlines, research
- A **founder/operator** — Business, CRM, projects, proposals, finance
- A **self-directed individual** — Health, wellbeing, journal, personal practice
- A **system operator** — Managing APEX itself: agents, memory, intelligence, approvals

This user is sophisticated enough to build and operate an AI OS. They do not need to be protected from depth. They need depth available **on demand**, not imposed by default.

### 2.2 Three Usage Patterns

| Pattern | Time | Goal | Entry point |
|---------|------|------|-------------|
| Morning review | 2–5 min, deliberate | "What matters today?" | TODAY |
| Active work | Seconds to minutes, goal-directed | "Do this / research that / check this" | COMMAND |
| Quick check | Under 30 seconds, ambient | "Anything urgent? Any approvals?" | TODAY |

### 2.3 Understanding Targets

**Within 5 seconds:**
- Whether anything urgently requires attention right now
- Whether APEX is healthy and active
- A single meaningful signal about today

**Within 30 seconds:**
- The top 3 things that matter today (from the APEX brief)
- What APEX has done since last session
- What is pending their decision

**Within 2 minutes:**
- A complete picture of priorities across life and work
- APEX's current intelligence state (what it knows, what it's researching)
- All pending approvals with full context to act

### 2.4 What Should Never Be Required

Users should never need to know:
- How APEX is implemented or how its agents work
- The distinction between episodic, semantic, and procedural memory
- Agent task IDs, pipeline stages, or cost-per-run
- Internal vocabulary: "civilization cycles", "reality fabric", "epistemic health"
- Which specific page contains which information (Cmd+K handles this)
- Technical details of the API surface

---

## PART III — INFORMATION HIERARCHY — THE L0–L4 DISCLOSURE MODEL

---

Every surface in APEX conforms to this hierarchy. Implementation of a new surface begins by defining which levels it supports and what information appears at each level.

### L0 — IMMEDIATE SUMMARY

**Purpose:** The answer at a glance. One line. Human language. Always visible.  
**When shown:** Always — never hidden by a toggle  
**Visual treatment:** Primary text weight, full contrast, no explanation required  
**Examples:**
- "3 things need your attention today"
- "APEX completed your research — ready to review"
- "Finance: £240 spent this week"
- "78% of agent actions succeeded this month"

### L1 — ACTIONABLE CONTEXT

**Purpose:** Why this matters and what to do about it  
**When shown:** Single tap/click of L0 element — expands inline  
**Visual treatment:** Secondary weight, muted label, clear action button where applicable  
**Examples:**
- "Your highest-priority opportunity: AI Privacy-Compliance. First-mover window is open."
- "2 tasks need approval before APEX can proceed. Estimated cost: £0.03."

### L2 — SUPPORTING EVIDENCE

**Purpose:** The data behind the L1 context  
**When shown:** Second tap — "Show evidence"  
**Visual treatment:** Smaller text, source tags, timestamps, confidence indicator  
**Examples:**
- "Based on: 3 web sources (TechCrunch, GDPR enforcement report, competitor analysis)"
- "Agent run completed at 14:02 · Cost: £0.02 · 12 steps taken"

### L3 — REASONING / OPERATIONAL DETAIL

**Purpose:** The reasoning chain, step trace, or operational context  
**When shown:** Third expand — "Show reasoning"  
**Visual treatment:** Monospace accents for step traces, numbered steps  
**Examples:**
- "APEX identified this opportunity by: (1) scanning intelligence briefing, (2) cross-referencing with your active goals, (3) scoring against 4 criteria"

### L4 — TECHNICAL PROVENANCE

**Purpose:** Raw data, system IDs, API responses, debug information  
**Audience:** System administration or debugging only  
**When shown:** Explicit toggle in SYSTEM destination — never shown by default elsewhere  
**Visual treatment:** Code block, monospace, full opacity, clear "SYSTEM" label

### Cross-Level Rules

1. L0 must exist for every data surface. No exceptions.
2. L1 is required whenever an action is available.
3. L2 is strongly recommended for all intelligence and recommendation surfaces.
4. L3 is optional for most surfaces; required for agent execution and approvals.
5. L4 is opt-in only; scoped to the SYSTEM destination.
6. Expanding to a deeper level never navigates away from the current page.
7. Each level is revealed by a single tap/click, not navigation.
8. Collapse is always available (tap again or Escape).

**Per-surface default disclosure levels:**

| Surface | Default level | Max level without toggle |
|---------|--------------|--------------------------|
| TODAY Brief | L0 | L2 (evidence) |
| TODAY Needs You | L0 | L3 (plan detail) |
| TODAY Since Last Visit | L0 | L2 (action detail) |
| COMMAND thread | L0 (result card) | L3 (step trace) |
| INTELLIGENCE Brief | L0 | L3 (reasoning) |
| INTELLIGENCE Opportunities | L0 | L3 (scoring rationale) |
| INTELLIGENCE Memory | L0 | L2 (source) |
| ACTIONS Approval | L0 | L3 (full plan) |
| ACTIONS Log | L0 | L3 (step trace) |
| SYSTEM Health | L0 | L4 (raw metrics) |

---

## PART IV — THE NOW SURFACE

---

### 4.1 Purpose

**Core question:** "What matters to me right now?"

This is the first question every user asks when opening APEX. The NOW surface answers it immediately. It is not a dashboard of all information. It is a curated relevance surface — only what qualifies, in priority order.

### 4.2 Relevance Filter

| Category | Qualifies if... |
|----------|----------------|
| Approval pending | Any approval in pending state |
| Urgent task | Task marked urgent or overdue |
| New intelligence | Briefing or opportunity not yet seen |
| Upcoming calendar event | Within next 4 hours |
| Unread email (priority) | Priority-labelled, unread |
| Finance alert | Budget exceeded, overdue invoice |
| Health alert | 2+ consecutive missed targets |
| Assignment deadline | Due within 48 hours |
| Agent failure | Failed action requiring user input |
| System alert | Production error, WS disconnection |

**Does NOT qualify:**
- General notifications (ACTIONS)
- Historical agent runs (INTELLIGENCE)
- Technical metrics (SYSTEM)
- Items the user has already reviewed and dismissed

### 4.3 Visual Layout

```
┌─────────────────────────────────────────────────────┐
│  APEX                            14:23  ●  🔔2  🎤   │
│  ─────────────────────────────────────────────────── │
│                                                      │
│  TODAY                           Mon 31 Aug 2026     │
│                                                      │
│  ┌─ BRIEF ───────────────────────────────────────┐   │
│  │ AI Privacy-Compliance is your highest-priority │   │
│  │ opportunity. First-mover window is open now.   │   │
│  │                              [Read full brief] │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  NEEDS YOU          ● 2 items                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ ▶ Approve: Create calendar event — James     │    │
│  │   Cost £0.00 · No risk · Reversible          │    │
│  │   [Approve]  [View detail]                   │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │ ⚠ Deadline: Assignment due in 2 days         │    │
│  │   Advanced ML — Chapter 8 submission         │    │
│  │   [View assignment]                          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  SINCE LAST VISIT               3 actions · 1h 22m   │
│  · Research completed: AI compliance market    ✓     │
│  · Cost logged: £47 research run               ✓     │
│  · No new emails                               —     │
│                                                      │
│  HEALTH                                              │
│  Sleep 6.5h ↓ · Workout — · Nutrition partial       │
│  [View health]                                       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 4.4 All NOW States

**ONE IMPORTANT ITEM:**
```
BRIEF  ────────────────────────────────────────────────
  AI Privacy-Compliance is your highest-priority 
  opportunity. [Read full brief]

NEEDS YOU  ● 1 item
  ▶ Approve: Create calendar event — James
    [Approve]  [View detail]
```
Single focused card. No overwhelming list.

**SEVERAL PRIORITIES:**
Cards stack vertically, max 3 in NEEDS YOU at any time. 4th+ items appear with "2 more in Actions →" link at bottom. Priority scoring determines display order (approvals > urgent tasks > deadlines > opportunities).

**URGENT ITEM:**
```
┌─ URGENT ─────────────────────────────────────────────┐
│ ⚠ Assignment deadline in 6 hours                     │
│   Advanced ML Chapter 8 — submit by 23:59            │
│   [Open assignment]  [Ask APEX to help]              │
└──────────────────────────────────────────────────────┘
```
Amber border on card. Placed at top of NEEDS YOU regardless of score.

**NEW OPPORTUNITY:**
```
┌─ NEW INTELLIGENCE ───────────────────────────────────┐
│ ◉ New: AI Privacy-Compliance · Score 58 · High       │
│   First-mover window identified — not yet reviewed   │
│   [Explore]  [Dismiss]                               │
└──────────────────────────────────────────────────────┘
```
Cyan dot indicator. "Not yet reviewed" dismisses on first tap of card.

**APEX NEEDS APPROVAL:**
Approval cards appear immediately in NEEDS YOU with Approve / View detail / Reject. Badge count on topbar notification icon increments. If user is on another page, the badge draws attention without forcing navigation.

**APEX IS WAITING:**
```
WAITING ON YOU  ⏳ 2 items
  · Approval: Market Validation Outreach task
  · Your response needed: Should APEX proceed?
```
Waiting items appear above regular NEEDS YOU items. They are blocking APEX's work.

**AN ACTION FAILED:**
```
┌─ ACTION FAILED ──────────────────────────────────────┐
│ ✕ Research couldn't complete                         │
│   Search service was temporarily unavailable         │
│   Queued to retry in 8 minutes                       │
│   [Cancel retry]  [Try now]                         │
└──────────────────────────────────────────────────────┘
```
Red dot indicator on card. Placed below approvals, above standard items.

**DATA IS STALE:**
```
TODAY  ─────────────────────────────  ↻ 3 days old
  Last updated 3 days ago                [Refresh all]

BRIEF  (3 days old — may be outdated)
  ↻ AI Privacy-Compliance opportunity — verify if current
```
Amber refresh indicator in section header. Content renders normally with stale indicator.

**INFORMATION CONFLICTS:**
```
⚠ Conflicting information
  Current brief rates AI compliance as high opportunity.
  An older analysis (3 months ago, low confidence) suggested 
  market saturation. [Compare →]
```
Inline conflict notice below the affected item. Never suppresses either piece of information.

**NOTHING QUALIFIES — EMPTY STATE:**
```
TODAY IS CLEAR

No urgent items, pending approvals, or alerts.
APEX has been active — view what happened →

SINCE LAST VISIT
  · 3 automated tasks completed ✓
  · Weekly finance check: within budget ✓
  · Health: targets met yesterday ✓

What would you like to do today?
[Start a conversation]  [Review intelligence]
```
This is a deliberate positive signal. "Clear" is a good outcome.

### 4.5 Loading Behaviour

1. Shell and topbar render: <100ms (no data required)
2. Skeleton TODAY surface: <50ms
3. Brief loads (6h cached — nearly instant on cache hit): ~800ms
4. NEEDS YOU loads: ~1,100ms
5. SINCE LAST VISIT loads: ~1,400ms
6. Health/domain signals: <2,000ms

The user never sees a blank screen at any point.

### 4.6 Priority Scoring

```
score(item) {
  base:     approval=100, urgent_task=90, deadline_48h=80, new_intel=70,
            priority_email=60, finance_alert=55, health_alert=50, agent_failure=95
  recency:  decay by hours since created (half-life: 12h)
  dismissed: dismissed items score 0
}
display items where score > 40, max 3 in NEEDS YOU, max 7 total on surface
```

### 4.7 Last Visit Tracking (LOCKED: SD-2)

`apex_last_session_ts` (localStorage) records when the user last opened APEX. On load, the previous timestamp is read as `apex_prev_session_ts` before being updated. SINCE LAST VISIT shows agent runs since `apex_prev_session_ts`.

---

## PART V — SHELL ARCHITECTURE

---

### 5.1 What the Shell Is

The shell is the permanent, always-visible frame of APEX. It renders before any data loads. It communicates APEX's state at all times. It provides navigation, status, and global controls.

The shell is composed entirely of HTML and CSS — no JavaScript is required to paint it. It is boot-critical.

### 5.2 Shell Components

**Topbar (52px, permanent)**

```
┌────────────────────────────────────────────────────────┐
│  APEX (Cinzel)   [Page title (Inter)]   [●] [🔔2] [🎤] │
└────────────────────────────────────────────────────────┘
```

| Component | Position | Purpose |
|-----------|----------|---------|
| APEX wordmark | Left | Brand identity (Cinzel typeface only here) |
| Page title | Centre (mobile) / after sidebar (desktop) | Current location — Inter typeface |
| System status dot (●) | Right, first | 8px dot — APEX operational state |
| Notification badge | Right, second | Bell icon + unread count |
| Voice trigger (🎤) | Right, third / rightmost | Global voice activation |

**System status dot states:**

| Colour | State | On hover/tap |
|--------|-------|--------------|
| Cyan ● | Healthy | "APEX is online" |
| Cyan ● (pulsing) | Active — working | "APEX is working" |
| Amber ● | Degraded | "Some features limited" |
| Red ● | Offline / error | "No connection" |
| Amber ↻ | Stale | "Data may be outdated" |

**Desktop sidebar (≥1024px, 220px fixed, collapsible to 56px)**

```
┌─ SIDEBAR ──────────────┐
│                         │
│  TODAY                  │
│  COMMAND                │
│  LIFE & WORK            │
│  INTELLIGENCE           │
│  ACTIONS  ●2            │
│  SYSTEM                 │
│                         │
│  ─────────────          │
│  ⌘K  Search APEX...     │
│                         │
└─────────────────────────┘
```

- Active destination: cyan left border (3px) + subtle background accent (`--apex-surface-2`)
- Notification badge: shown inline on destination label
- Collapse toggle: `‹` at top-right of sidebar; collapses to icon-only 56px width
- Collapse state persisted in `apex_sidebar_collapsed` (localStorage)
- The sidebar collapse does not affect the content area layout (flex-grow fills available space)

**Bottom tab bar (mobile ≤767px)**

```
┌────────────────────────────────────────────────────────┐
│ [TODAY] [CMD] [LIFE] [INTEL] [ACTIONS] [···]           │
└────────────────────────────────────────────────────────┘
  safe-area-inset-bottom padding
```

- 5 visible tabs + ··· overflow (SYSTEM in overflow)
- Tab height: 56px (touch-friendly)
- Voice trigger: rightmost position in tab bar (mic icon, same size as tabs)
- Swipe dot indicators: 5 dots above tab bar, active dot cyan (Decision 9: LOCKED)
- First-session swipe hint: "Swipe between sections" for 3 seconds on first open

**Content area**

- `flex: 1`, fills remaining space after sidebar/topbar
- `max-width: 1400px`, centred on wide screens (≥1400px)
- Independently scrollable
- Page content renders here via `switchPage()` system

### 5.3 Shell Render Budget

| Component | Render target | Data required |
|-----------|--------------|---------------|
| Topbar HTML | <10ms | None |
| Sidebar/bottom tab bar | <20ms | None (badge counts load async) |
| Status dot initial state | <50ms | None (defaults to grey until WS connected) |
| Skeleton page content | <50ms | None |
| Badge counts | <500ms | `/api/actions/summary` |
| Status dot update | <500ms | WS connection event |

---

## PART VI — NAVIGATION ARCHITECTURE

---

### 6.1 Final Primary Destinations (LOCKED)

Six primary destinations. All naming decisions are LOCKED — see V-11-DESIGN-DECISIONS.md Decision 1.

| # | Internal ID | Desktop label | Mobile label | Primary question |
|---|-------------|--------------|-------------|-----------------|
| 1 | `now` | TODAY | TODAY | What matters right now? |
| 2 | `command` | COMMAND | CMD | Ask or tell APEX anything |
| 3 | `domains` | LIFE & WORK | LIFE | How are my domains doing? |
| 4 | `intelligence` | INTELLIGENCE | INTEL | What does APEX know? |
| 5 | `actions` | ACTIONS | ACTIONS | What needs my decision? |
| 6 | `system` | SYSTEM | ··· | How is APEX itself doing? |

### 6.2 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | TODAY |
| `2` | COMMAND |
| `3` | LIFE & WORK |
| `4` | INTELLIGENCE |
| `5` | ACTIONS |
| `6` | SYSTEM |
| `A` | ACTIONS (retained — existing shortcut) |
| `N` | Notifications |
| `K` or `⌘K` / `Ctrl+K` | Command palette |
| `/` | Focus command input |
| `?` | Help overlay |
| `R` | Refresh current destination |
| `V` | Voice trigger (global) |
| `ESC` | Close overlay / collapse expansion / dismiss |

### 6.3 Default Landing (LOCKED)

TODAY (`now`) is the default landing page. User preference override stored in `apex_default_page` (localStorage), settable from SYSTEM → Settings → Interface. See Decision 3.

### 6.4 Existing-Page Migration Map

Every current destination is classified. No functionality disappears.

| Current page (20) | V-11 classification | V-11 location |
|-------------------|--------------------|--------------:|
| Command | **Retained + rebuilt** | COMMAND (single-column, V-11-E) |
| Today/Overview | **Transformed** | TODAY (V-11-C) |
| Intelligence | **Retained + rebuilt** | INTELLIGENCE sub-section (V-11-G) |
| Memory | **Merged** | INTELLIGENCE → Memory |
| Knowledge | **Merged** | INTELLIGENCE → Knowledge |
| Research | **Merged** | COMMAND (research is an action) |
| Tasks | **Merged** | ACTIONS → Task queue |
| Approvals | **Merged** | ACTIONS → Approvals (primary) |
| Notifications | **Merged** | ACTIONS → Notifications |
| Activity | **Moved to secondary** | SYSTEM → Activity |
| Health | **Retained** | LIFE & WORK → Health tab |
| Finance | **Retained** | LIFE & WORK → Finance tab |
| Communications | **Retained** | LIFE & WORK → Communications tab |
| University | **Retained** | LIFE & WORK → University tab |
| Business | **Retained** | LIFE & WORK → Business tab |
| Journal | **Merged** | LIFE & WORK → Personal tab |
| Spiritual | **Merged** | LIFE & WORK → Personal tab |
| Occult | **Renamed + merged** | LIFE & WORK → Personal → Esoteric Research |
| Agents | **Moved to secondary** | SYSTEM → Agents |
| Reality/Governance/Civilisation/Master | **Advanced** | SYSTEM → Advanced (L4 destination) |

---

## PART VII — DESTINATION DESIGNS

---

### 7.1 TODAY

See Part IV (NOW Surface) for complete design. TODAY is the `now` destination.

Secondary content sections (below the fold):
- **Upcoming calendar:** Events within next 4 hours
- **Health signals:** Sleep/workout/nutrition — one line each (L0 only unless tapped)
- **Finance signals:** Budget status — one line (L0 only unless tapped)

### 7.2 COMMAND

**Purpose:** APEX's primary cognitive interface. Text and voice interaction. Research, instructions, approvals, conversation.

**What COMMAND is NOT:** A system dashboard, a health monitor, a financial overview, or a page for displaying the APEX constitution.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  [COMMAND]                                               │
│  ┌─ THREAD ──────────────────────────────────────────┐   │
│  │ [APEX]  Your AI Privacy-Compliance research is    │   │
│  │         complete. 3 key findings:                 │   │
│  │         · First-mover window: 8–14 months         │   │
│  │         · TAM: £340M by 2028                      │   │
│  │         · 3 incumbent gaps identified             │   │
│  │         [Read full research ↗] [Save note]        │   │
│  │                                                   │   │
│  │ [YOU]   Research the AI compliance market [14:02] │   │
│  │                                                   │   │
│  │ [APEX]  Ready. What else?                         │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ INPUT ────────────────────────────────────────┐ 🎤  │
│  │ Ask APEX anything…                             │     │
│  └────────────────────────────────────────────────┘     │
│                                                          │
│  SUGGESTIONS                                             │
│  [What's my brief?]  [Check emails]  [Log a workout]    │
│                                                          │
│  RECENT  ▼                                               │
│  Research AI compliance · Finance summary · Add event    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**What leaves Command (V-11-E):**
1. APEX Constitution Charter → SYSTEM → Governance
2. 3-column `cmd-split` layout → single conversation column
3. Bottom stat strip (`cmdStrip`) → TODAY surface
4. PlasmaOrb as primary interactive element → ambient background only (desktop, LOCKED)

**PlasmaOrb (LOCKED — Decision 2):** Retained as ambient background on COMMAND, desktop only. Reduced opacity (~15%), slower animation. Not interactive — voice trigger moves to topbar microphone icon. Not rendered on mobile (performance guard: `window.innerWidth < 768`).

**Interaction states:**

| State | Visual | Text |
|-------|--------|------|
| Idle | Input focused, caret | "Ask APEX anything…" |
| Thinking | Animated cyan dots in thread | "APEX is thinking…" |
| Streaming | Text appearing (SSE, LOCKED) | Progressive output |
| Tool running | Progress indicator in thread | "Researching… step X of Y" |
| Approval needed | Inline orange approval card | "This needs your approval" |
| Complete | Full result card | Result + suggestions |
| Error | Red indicator in thread | Human error + retry |

**Structured result cards:**

```
┌─ RESEARCH COMPLETE ────────────────────────────────┐
│ AI Privacy-Compliance Market                        │
│ 3 key findings · 5 sources · ● High confidence     │
│ [Expand findings] [Save to knowledge] [Share]       │
└─────────────────────────────────────────────────────┘
```

```
┌─ APPROVAL NEEDED ──────────────────────────────────┐
│ Create calendar event: James · Thu 14:00 · 1h      │
│ Cost: £0.00 · Reversible · No data accessed        │
│ [Approve]  [View detail]  [Reject]                 │
└─────────────────────────────────────────────────────┘
```

**Chat history (LOCKED — Decision 7):** localStorage key `apex_chat_history`, max 100 messages, cleared on logout. Server-side persistence is a subsequent authorisation.

**Streaming (LOCKED — Decision 8):** SSE via new `GET /api/chat/stream` endpoint. Existing `POST /chat` retained for non-streaming contexts. This requires separate implementation authorisation.

### 7.3 LIFE & WORK

Sub-navigation tabs within one destination:

**Health · Finance · Business · Communications · University · Personal**

Each tab defers loading until first activation (preserving V-09 performance gains). Each tab has:
- L0 summary row at the top (domain-wide one-liner)
- Domain panels below (L0 visible, L1/L2 on expand)

**Scope clarity (LOCKED — SD-4):**
- Finance tab: money flow (income, expenses, budget, invoices, subscriptions)
- Business tab: operations (CRM, projects, proposals, documents)
- These are distinct. Finance shows where money goes; Business shows what APEX manages operationally.

**Personal tab (LOCKED — Decision 5):** Label "Personal". Contains: Journal · Spiritual · Esoteric Research (formerly "Occult"). Icon: journal/book symbol.

**Health tab API constraint:** Currently makes 15 API calls. V-11-H reduces this to ≤5 via aggregation or batching.

### 7.4 INTELLIGENCE

**Purpose:** APEX's analytical lens on the world and on the user. Not a system health page.

**Layout:**

```
┌─ INTELLIGENCE ────────────────────────────────────────┐
│  Updated 2h ago                    [Refresh]          │
│                                                       │
│  BRIEFING                                             │
│  [Headline L0] [Expand → L1 → L2] [Act on this]      │
│                                                       │
│  OPPORTUNITIES     [3 found · 1 new]                  │
│  [Card L0]  [Card L0]  ...                            │
│                                                       │
│  WHAT APEX KNOWS   Facts: 418 · Confidence avg: 78%   │
│  [Domain coverage bars] [3 knowledge gaps] →          │
│                                                       │
│  WHAT APEX REMEMBERS  95 episodes · 74 successful     │
│  [Recent memories in human language]                  │
│                                                       │
│  LESSONS           7 lessons · 3 applied today        │
│  [Plain-language lessons]                             │
│                                                       │
└───────────────────────────────────────────────────────┘
```

Every intelligence item follows the L0→L3 disclosure model with the locked confidence indicator (● High + one-word label at L0; expanded explanation at L1).

Opportunities graceful degraded state (until V-11-J schema fix):
```
OPPORTUNITIES — analysis temporarily unavailable
The opportunities database is being updated.
[View System Status]
```
Never shows a 500 error to the user.

### 7.5 ACTIONS

**Primary content:**
1. Pending approvals (highest priority — top of page)
2. Task queue: pending, in-progress, recently completed
3. Agent run log (human-readable: "APEX researched X and found Y")
4. Standing approval rules (what APEX can do automatically)

**Undo banner (LOCKED — SD-3):** 30-second window. Banner shows for the full 30 seconds. Final 5 seconds shows countdown ("Undo — 4s remaining").

**Keyboard shortcut A:** Maps to ACTIONS destination (retained).

### 7.6 SYSTEM

**Purpose:** How APEX itself is doing. Technical detail available here. L4 is welcome in SYSTEM.

**Sub-sections:**
- System health: APEX status, API health, DB status, WS state
- Agents: domain agents, pipeline, schedules
- Cost: today/week/month breakdown
- Activity: raw event log (technical telemetry)
- Memory technical health: counts, health scores
- Advanced: Reality, Governance, Civilisation, Master (L4 surfaces, not primary)
- Settings: auth, preferences, autonomy level, API keys

---

## PART VIII — VOICE ARCHITECTURE

---

### 8.1 Global Voice Trigger

Voice is a first-class, globally-accessible input mode. Not a Command page feature.

**Activation:**
- Desktop: `V` key, or persistent microphone icon in topbar
- Mobile: microphone icon in bottom tab bar (rightmost position)
- Mobile voice session: full-screen listening UI (no competing UI during active listening)

### 8.2 Voice States

| State | Topbar indicator | Full-screen |
|-------|-----------------|------------|
| Available | Dim microphone icon | — |
| Listening | Pulsing cyan microphone | Waveform animation |
| Processing | Rotating dots | "APEX is thinking…" |
| Responding | Speaker animation | Response text + audio |
| Complete | Returns to idle | Result card |
| Error | Red microphone | "I didn't catch that — try again" |

### 8.3 Voice Result Display (LOCKED — SD-1)

**Problem:** If the user is on INTELLIGENCE reading something and triggers voice, forcing navigation to COMMAND destroys their context.

**Solution:** Voice responses appear in a non-destructive overlay panel:

```
┌─ APEX VOICE RESPONSE ──────────────────────────────────┐
│                                                        │
│  You have one calendar event today —                   │
│  James Anderson at 3pm.                               │
│                                                        │
│  [Open in Command]                      [Dismiss]      │
└────────────────────────────────────────────────────────┘
```

- Slides up from bottom (40% screen height)
- Shows response text alongside TTS audio
- "Open in Command" navigates to full thread
- Tapping outside or pressing Escape dismisses
- Approval cards can be actioned from the overlay directly (Approve / Reject)
- Overlay auto-dismisses after TTS completes if no interaction
- The response is simultaneously appended to the COMMAND thread

Short responses (single sentence): small overlay, auto-dismisses after TTS.  
Longer responses: overlay shows first 3 lines + "Read more in Command" link.  
Approval responses: full approval card with Approve/Reject in overlay.

### 8.4 Voice Pipeline

Voice triggers the same pipeline as text Command:
- Transcript appears in Command thread
- Response renders in both overlay AND Command thread
- Tool calls (calendar check, research, task create) proceed normally
- Barge-in: user can speak while APEX is responding (interrupts TTS)
- Long responses (>30s): "stop speaking" button in overlay
- Transcript always visible alongside audio (accessibility)

---

## PART IX — KNOWLEDGE & MEMORY

---

### 9.1 Conceptual Distinctions (User-Visible)

The user must never need to understand the backend architecture to understand why APEX knows something.

| Backend concept | User-visible concept |
|----------------|---------------------|
| Current session context | "Current session — active now" |
| Episodic memory | "APEX remembers from [date/event]" |
| Semantic facts | "APEX knows that…" |
| Procedural memory | "APEX has learned to…" |
| Inference | "APEX inferred from…" |
| Evidence | "Based on: [source list]" |

These conceptual labels appear in the UI. The underlying memory type is never surfaced.

### 9.2 Knowledge Surface

```
APEX KNOWLEDGE

Search: [___________________________________]

Domain coverage:
Business    ████████░░  82%   127 facts
University  █████████░  90%   148 facts
Health      ██████░░░░  60%    95 facts
Finance     ███░░░░░░░  30%    48 facts

GAPS IDENTIFIED
· Finance: No budget tracking data since August 1st
· Health: No sleep data for 3 nights
· Business: "Horizon Tech" — no contact logged in 14 days

RECENT FACTS
"AI Privacy-Compliance is a first-mover opportunity"  ● High · 2h ago
"User prefers morning study sessions"                 ● High · today
```

### 9.3 Memory Translation Rules

| Raw data | Human-visible |
|----------|--------------|
| `ep-mthdz8dc-m1iu` | [never shown to user] |
| `confidence: 0.7789` | `● High confidence` |
| `episodic_memory: 95 records` | "95 memories from the last N months" |
| `objective: "voice-task-178..."` | "APEX handled a voice request" |
| `success: true, cost_usd: 0.049` | "Completed · £0.05" |
| `topFailStage: null` | [not shown on success] |

### 9.4 Memory Correction Flow

```
USER: "That's wrong — I study in the morning now"

COMMAND processes:
"Got it. I'll update that. Your study preference is now: morning."

APEX creates:
  Contradiction fact: "User prefers evening sessions" → CONTRADICTED
  New fact: "User prefers morning study sessions" — confidence 1.0 (user-stated)
  Lesson: "User explicitly corrected study time preference — morning, not evening"

UI confirms:
  "Updated ✓ — I'll remember you prefer mornings."
  [View change] → shows what changed and why
```

The user can view all corrections in INTELLIGENCE → Memory → Corrections.

### 9.5 Evidence Provenance

Every fact, memory, and recommendation in APEX has a provenance chain:
- Source (web article, user statement, APEX inference, API data)
- Timestamp (when it was created or last verified)
- Confidence (● High / ● Good / ● Medium / ● Low / ● Very Low — dot + word, LOCKED)
- Freshness (how long ago it was verified)

"Where did APEX learn this?" is always answerable by tapping any item and expanding to L2.

---

## PART X — ACTIVITY

---

### 10.1 Classification

| Event type | User-visible label | Shown in |
|------------|-------------------|---------|
| APEX completed an action | "APEX did: [plain description]" | TODAY → Since last visit; ACTIONS → log |
| APEX learned something | "APEX learned: [fact]" | INTELLIGENCE → Lessons |
| APEX discovered something | "APEX found: [insight]" | TODAY → Brief; INTELLIGENCE |
| APEX recommends | "APEX suggests: [action]" | TODAY → Needs You; INTELLIGENCE |
| APEX is waiting | "Waiting for your approval: [item]" | TODAY → Needs You; ACTIONS |
| Something failed | "APEX couldn't: [plain description]. [Why]. [What now]." | TODAY if blocking; ACTIONS |
| Technical telemetry | Raw event log | SYSTEM → Activity only |

### 10.2 Activity Display Conventions

```
✓  APEX did     — completed, successful
●  APEX learned — new fact or lesson
◉  APEX found   — new insight or opportunity
→  APEX suggests — recommendation pending
⏳  Waiting      — approval or input needed
✕  Failed       — error with remediation
⚙  System       — technical event (SYSTEM only)
```

Technical telemetry (agent task IDs, cost-per-run, pipeline stage, execution time) belongs in SYSTEM → Activity. It never appears in TODAY, COMMAND, or INTELLIGENCE primary views. It is available in ACTIONS → log detail (L3), and in SYSTEM → Activity (L4).

---

## PART XI — TASKS / APPROVALS / ACTIONS LIFECYCLE

---

### 11.1 The Eight-Stage Lifecycle

```
DISCOVER → UNDERSTAND → REVIEW → APPROVE/DENY → EXECUTE → MONITOR → COMPLETE → LEARN
```

**DISCOVER:** Item appears in TODAY → Needs You (if urgent) or ACTIONS. Notification badge increments. L0: What, who, when.

**UNDERSTAND:** User taps item. L1 expands inline: why, what will happen, cost, risk, reversibility. L2: evidence or context that generated the action.

**REVIEW:** User options: Approve / Reject / Modify / Defer / "Ask APEX to explain more" (opens COMMAND pre-loaded with action context).

**APPROVE/DENY:** Single tap. Rejection: optional "Tell APEX why — helps it learn" input. Approval: immediate confirmation animation.

**EXECUTE:** Progress state: "APEX is working on this…" If long-running: progress card in ACTIONS with step count.

**MONITOR:** For long-running tasks: expandable step trace. "What has APEX done so far?" shows completed steps.

**COMPLETE:** Result card: what happened, cost, outcome. Undo banner: 30-second window for reversible actions (LOCKED — SD-3).

**LEARN:** Rejection → APEX generates reflexion lesson. Completion → episode stored in memory. User can provide feedback ("This was helpful / not helpful").

### 11.2 Approval Card Design

```
┌─ APPROVAL NEEDED ─────────────────────────────────────┐
│  ▶ Create calendar event                               │
│                                                        │
│  James Anderson · Thursday 4 Sep · 14:00 · 1h         │
│                                                        │
│  Cost: £0.00  ·  Risk: None  ·  Reversible: Yes       │
│                                                        │
│  APEX created this because:                            │
│  "You asked me to schedule a meeting with James"       │
│                                                        │
│  [Approve]          [View detail]          [Reject]    │
└────────────────────────────────────────────────────────┘
```

Every approval card shows: What (human language, never API call) · Why (user's original instruction) · Cost / Risk / Reversibility · Three actions.

**Destructive actions additionally show:**
- "DESTRUCTIVE" label in red
- "This cannot be undone" if irreversible
- The specific entity named: "delete 'Project Proposal v3.pdf'" not "delete the file"

---

## PART XII — COMMUNICATION ARCHITECTURE

---

### 12.1 Priority Hierarchy

| Priority | Type | Mechanism | Frequency |
|----------|------|-----------|-----------|
| 1 — Critical | Approval blocking execution | Badge + TODAY card | Immediate |
| 2 — Urgent | System failure, deadline breach | Badge + push | Immediate |
| 3 — Important | New briefing, opportunity, finance alert | Badge | On generation |
| 4 — Standard | Task completion, email, reminder | Notification item | Batched |
| 5 — Ambient | Health/activity status | TODAY surface | On open |
| 6 — Digest | Daily summary | Brief in TODAY | Once/day |

### 12.2 Anti-Overload Rules

1. Maximum 3 items in TODAY → Needs You at any time (overflow → ACTIONS)
2. Push notifications only for Priority 1–2
3. APEX learns which notification types the user dismisses quickly and deprioritises them
4. Each notification has exactly one clear action — never two competing CTAs
5. Repeated reminders for the same item suppressed within 4 hours

---

## PART XIII — TRANSPARENCY MODEL

---

### 13.1 The Transparency Contract

Every consequential APEX action must be:

1. **Observable:** User can always find what APEX did
2. **Auditable:** User can always understand how and why
3. **Attributable:** Each action links to the user instruction that caused it
4. **Reversible where possible:** Undo offered for reversible actions
5. **Explainable at multiple depths:** L0→L4 always available

Transparency does NOT mean showing raw API responses, internal task IDs, database row IDs, or error stack traces in the primary UI. These are L4 and appear only in SYSTEM → Advanced.

### 13.2 Confidence Communication (LOCKED — Decision 10)

| Confidence | Level | Dot colour | Label |
|------------|-------|-----------|-------|
| ≥ 0.85 | High | Cyan ● | "High" |
| 0.65–0.84 | Good | Blue ● | "Good" |
| 0.45–0.64 | Medium | Amber ● | "Medium" |
| 0.25–0.44 | Low | Orange ● | "Low" |
| < 0.25 | Very Low | Red ● | "Very Low" |
| Unknown | — | Grey — | (no indicator) |

At L0: `● High` (dot + one-word label inline)  
At L1: `● High confidence — based on 3 consistent sources from the last 7 days`

### 13.3 Discoverable Transparency Queries

These must be answerable from anywhere in APEX:

| User question | Path |
|---------------|------|
| "Why am I seeing this?" | Tap any item → L1 expands with "APEX surfaced this because…" |
| "What evidence supports this?" | Tap "Show evidence" → L2 panel |
| "Why did APEX do this?" | ACTIONS → log → tap action → L2 |
| "What does APEX know?" | INTELLIGENCE → Knowledge |
| "What doesn't APEX know?" | INTELLIGENCE → Knowledge → Gaps section |
| "What changed?" | TODAY → Since Last Visit; INTELLIGENCE → Memory recent |
| "Is this current?" | Every data item shows "Updated [time ago]" |

---

## PART XIV — STATE SYSTEM

---

### 14.1 Eight Canonical States

Every panel in APEX is always in exactly one of these states:

**1. LOADING** — Skeleton shimmer (`skel` class). Never blank. Timeout at 10s → ERROR.

**2. HEALTHY** — Content rendered, fresh. Small "Updated [time ago]" in panel header. No indicator needed (healthy is the baseline).

**3. STALE** — Content rendered, past TTL. Amber `↻ [time ago] · Refresh` in panel header. Never prevents reading stale content.

**4. EMPTY** — No data exists (valid). Illustration or icon + human headline + onboarding CTA. Never a blank panel.

**5. NO_RESULTS** — Query returned nothing. Different icon from EMPTY. "No results for '[query]'" + suggestion or "APEX could research this →".

**6. ERROR** — API failure (5xx). Red dot in panel header. Human error message. Retry button. Never shows technical error text.

**7. PARTIAL** — Some data failed. Warning indicator. Renders what succeeded. Footnote: "[N] items unavailable — [Retry]".

**8. PERMISSION_RESTRICTED** — Lock icon. "Access restricted" or "Sign in to see this." Clear path to resolution.

### 14.2 Prohibited Patterns

1. Blank panel — NEVER
2. Technical error text in user-facing context — NEVER
3. Raw IDs in any error message — NEVER
4. "undefined" or "NaN" in rendered UI — NEVER
5. Loading state identical to empty state — NEVER
6. Error state identical to empty state — NEVER
7. False "live" state when data is stale — NEVER
8. Unexplained spinner (no timeout, no label) — NEVER

---

## PART XV — FAILURE & DEGRADED EXPERIENCE

---

This section is mandatory. APEX must communicate the truth in all failure scenarios.

### 15.1 Failure Scenarios

**Claude API (AI) unavailable:**
```
COMMAND shows:
"I can't process requests right now — the AI service is temporarily 
unavailable. Your message has been saved. [Retry now]  [Cancel]"

TODAY brief shows:
"Brief unavailable — AI service is recovering. Last brief: [date]. [View cached →]"

Status dot: Amber ● "AI service limited"
```

**Supabase database unavailable:**
```
All data panels → ERROR state simultaneously
Topbar: Red ● "Connection lost"

TODAY shows:
"APEX can't reach its data right now. [Last loaded: 14:23]
 Some features limited. [Retry all]"

COMMAND: Still functional for simple queries (no memory/task access)
```

**WebSocket disconnected:**
```
Status dot → Amber ● "Real-time updates paused"
On hover: "Reconnecting... [reconnect now]"

Panels don't break — they show last known data with stale indicator
Approval notifications paused (push notification fallback if available)
```

**Voice (Gemini TTS) unavailable:**
```
Voice trigger becomes text-only mode:
"Voice playback unavailable — response shown as text only"

Listening and processing still work; only TTS output is affected
Transcript always visible anyway (no degradation to information)
```

**Stale data (API slow / network degraded):**
```
Panel shows stale content with amber indicator:
"↻ Updated 47 minutes ago · [Refresh]"

Content is fully readable. User chooses whether to refresh.
Never block reading stale data to force a refresh.
```

**Partial data (some endpoints failed):**
```
TODAY shows with partial indicator:
"⚠ Some data unavailable (3 sections)"

Successful sections render normally.
Failed sections show ERROR state.
"Show what's unavailable →" lists the failed sections.
```

**Permission denied (401/403):**
```
Panel shows:
"Access restricted — you may need to sign in again."
[Sign in]

Never show "403 Forbidden" or HTTP status codes to the user.
```

**Action fails during execution:**
```
If user is watching (COMMAND thread):
"I couldn't complete this — [specific reason in plain English].
 [Retry]  [Try a different approach]  [Cancel]"

If user is not watching (background task):
TODAY surface adds:
"✕ Research paused — [plain reason]. Retry in 8 minutes. [Cancel]"
ACTIONS badge: +1 (failed)
```

**Action partially succeeds:**
```
Result card shows:
"Partially completed
 ✓ 3 of 5 steps succeeded
 ✕ Step 4 failed: [specific reason]
 Completed actions have been saved.
 [Retry from step 4]  [View what was done]  [Abandon]"
```

**External service fails (email, calendar):**
```
Specific to the service:
"Couldn't access your email — Google authentication may have expired.
 [Reconnect Google]  [Try later]"

Never say "API error" or "service unavailable" without context.
Always name the specific service.
```

### 15.2 Degraded Mode Principles

1. Always tell the user what is unavailable and why (plain English)
2. Always offer a path forward (retry, reconnect, use cached, cancel)
3. Never show blank panels — show ERROR or STALE state instead
4. Never show false-success states
5. Never show technical error details (moved to L4/SYSTEM)
6. Preserve what works — partial availability is better than total shutdown
7. The status dot communicates system health at a glance — always accurate

---

## PART XVI — RESPONSIVE ARCHITECTURE

---

### 16.1 Desktop Shell (≥1024px)

```
┌─ TOPBAR (52px) ──────────────────────────────────────────┐
│ APEX    [Page Title]              [●] [🔔2] [🎤]          │
├─ SIDEBAR (220px) ──┬─ CONTENT (flex) ───────────────────┤
│                    │                                     │
│  TODAY             │  [Page content, max-width 1400px]   │
│  COMMAND           │                                     │
│  LIFE & WORK       │                                     │
│  INTELLIGENCE      │                                     │
│  ACTIONS  ●2       │                                     │
│  SYSTEM            │                                     │
│                    │                                     │
│  ───────────       │                                     │
│  ⌘K Search...      │                                     │
└────────────────────┴─────────────────────────────────────┘
```

### 16.2 Tablet Shell (768–1023px)

```
┌─ TOPBAR (52px) ──────────────────────────────────────────┐
│ [☰]  APEX    [Page Title]         [●] [🔔] [🎤]          │
├──────────────────────────────────────────────────────────┤
│  [Page content — full width, 2-column panels]            │
├──────────────────────────────────────────────────────────┤
│  TODAY  │  CMD  │  LIFE  │  INTEL  │  ACTIONS  │  ···   │
└──────────────────────────────────────────────────────────┘
```

Sidebar collapses to overlay (hamburger). Bottom tab bar with 5 primary tabs + ··· overflow.

### 16.3 Mobile Shell (≤767px)

```
┌─ TOPBAR (52px) ──────────────────────────────────────────┐
│  APEX    [Page Title]                    [●] [🔔] [🎤]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Page content — single column, swipeable]               │
│                                                          │
│  · · · · ·  (swipe indicator dots)                      │
├──────────────────────────────────────────────────────────┤
│  [TODAY] [CMD]  [LIFE]  [INTEL] [ACTIONS]  [···] [🎤]    │
└──────────────────────────────────────────────────────────┘
  safe-area-inset-bottom padding
```

**Mobile-specific patterns:**

| Pattern | Usage |
|---------|-------|
| Bottom sheet | Agent detail, approval detail, evidence, memory, knowledge |
| Swipe to dismiss | Notifications, action cards |
| Pull to refresh | Any data surface |
| Long press | Context menu on cards |
| Swipe between tabs | Primary navigation (swipe indicator dots: LOCKED Decision 9) |
| Haptic feedback | Approval confirm, action complete |

**What becomes action-first on mobile** (one visible primary action, secondary in ··· menu):

| Card | Primary | Secondary |
|------|---------|-----------|
| Approval | [Approve] | View detail, Reject |
| Task | [Run] | Edit, Defer, Delete |
| Briefing | [Read brief] | Expand, Save, Act |
| Opportunity | [Explore] | Save, Dismiss |
| Memory | [View] | Correct, Pin |

**PlasmaOrb mobile guard (LOCKED — Decision 2):** WebGL canvas is NOT instantiated on mobile (`window.innerWidth < 768`). Command page uses CSS-only animated dot grid background on mobile.

---

## PART XVII — VISUAL SYSTEM

---

### 17.1 Visual Direction

APEX Zero is the canonical visual identity. Non-negotiable properties:

- Pure black canvas: `#000000` or near-black `#03060f`
- Cyan primary signal: `#00d4ff`
- Animated dot grid (`radial-gradient` 28px pattern, `apex-grid-drift` animation): retained — distinctive APEX identity, CSS-only, low-cost
- Inter as primary reading typeface
- Controlled density — richness through hierarchy, not clutter
- Motion that communicates state, not decoration

**What to avoid:**
- Decorative glow and bloom without semantic meaning
- Gaming aesthetics — APEX is calm, intelligent, professional
- Excessive neon
- Unnecessary gradients
- Ornamental 3D
- Dashboard clutter (too many cards at equal visual weight)
- Excessive borders (APEX Zero uses borders sparingly — surface differentiation comes from opacity layers, not border boxes)

### 17.2 Token Namespace (LOCKED — Decision 1 of V-11-A)

The dual-namespace problem (v11 indigo tokens + APEX Zero cyan tokens) is resolved in V-11-A. APEX Zero tokens (`--apex-color-*`) become the single canonical namespace. All v11 indigo tokens (`--primary`, `--border`, `--primary-dim`) are deprecated and aliased to APEX Zero values.

**Canonical token set:**

```css
/* Canvas */
--apex-bg:              #000000;
--apex-bg-raised:       #03060f;
--apex-surface:         rgba(255,255,255,0.04);
--apex-surface-2:       rgba(0,212,255,0.05);

/* Signal */
--apex-cyan:            #00d4ff;
--apex-cyan-dim:        rgba(0,212,255,0.16);
--apex-cyan-glow:       rgba(0,212,255,0.40);
--apex-blue:            #0066ff;
--apex-violet:          #7b2fff;

/* Status */
--apex-success:         #10b981;
--apex-warning:         #f59e0b;
--apex-danger:          #ef4444;

/* Text */
--apex-text:            #e8f4ff;
--apex-text-2:          rgba(232,244,255,0.70);
--apex-text-muted:      rgba(232,244,255,0.45);
--apex-text-dim:        rgba(232,244,255,0.25);

/* Border */
--apex-border:          rgba(0,212,255,0.16);
--apex-border-dim:      rgba(0,212,255,0.08);
--apex-border-bright:   rgba(0,212,255,0.35);

/* Timing */
--apex-duration-instant:  80ms;
--apex-duration-fast:     150ms;
--apex-duration-standard: 220ms;
--apex-duration-slow:     350ms;
```

### 17.3 Typography (LOCKED)

| Typeface | Role | Domain |
|----------|------|--------|
| **Cinzel** | Brand identity only | APEX wordmark in topbar; section headers in ceremonial contexts |
| **JetBrains Mono** | System/technical | SYSTEM page, timestamps in system contexts, cost values, L4 detail |
| **Inter** | All human-facing content | ALL domain pages, command thread, intelligence briefing, approval cards, notifications |

**Rule:** JetBrains Mono is never the primary typeface on Health, Finance, Communications, University, Business, or Personal pages. These are human domains.

### 17.4 Colour Usage

- **Cyan** (`#00d4ff`): primary actions, active state, WS connected, links, confidence High
- **Blue** (`#0066ff`): secondary actions, CTA backgrounds, confidence Good
- **Violet** (`#7b2fff`): AI/intelligence context, memory, knowledge
- **Green** (`#10b981`): success, health positive, completed
- **Amber** (`#f59e0b`): warnings, stale data, caution, confidence Medium/Low
- **Orange** (`#f97316`): confidence Low indicator
- **Red** (`#ef4444`): errors, failures, destructive, confidence Very Low

### 17.5 Spacing

```
4px   — micro (between related elements)
8px   — small (within components)
12px  — base (between component sections)
16px  — medium (between cards)
24px  — large (between page sections)
32px  — section (between major groups)
48px  — page margin (desktop sides)
```

### 17.6 Components

**Cards:** 12px radius, `--apex-surface` background, `1px solid --apex-border` border.  
**Buttons — primary:** `--apex-cyan` background, `#000` text, 8px radius, 44px min-height.  
**Buttons — secondary:** Transparent, `--apex-cyan` border, `--apex-cyan` text.  
**Buttons — destructive:** `--apex-danger` background, white text.  
**Chips/badges:** 6px radius, `--apex-cyan-dim` background.  
**Sheets:** 16px top radius only, from bottom of screen.  
**Overlays:** Semi-transparent backdrop `rgba(0,0,0,0.6)`.

---

## PART XVIII — MOTION SYSTEM

---

### 18.1 Where Animation Adds Meaning

| Event | Animation | Duration |
|-------|-----------|---------|
| Page/tab switch | Fade + subtle Y translate (8px) | 220ms |
| Card expand (L0→L1) | Height expand + fade | 250ms |
| Evidence panel | Slide up | 200ms |
| Approval success | Scale + green flash | 300ms |
| Rejection | Brief red flash | 200ms |
| Loading skeleton | Shimmer (CSS gradient) | Continuous |
| Notification arrive | Slide in from right | 200ms |
| Toast dismiss | Fade out | 150ms |
| Voice listening | Waveform pulse | Continuous |
| Voice processing | Rotating dots | Continuous |
| Agent working | Progress pulse | Continuous |
| WS reconnect | Green pulse on dot | 300ms |

### 18.2 Where Animation Is Prohibited

- Data loading (data appears immediately when ready — no entrance animation on data content)
- Approval card content (clarity over animation)
- Error states (error must read immediately)
- Navigation to ACTIONS from urgent approval (speed matters)
- Anything triggered more than once per 3 seconds by the same event

### 18.3 Reduced Motion

All animations respect `prefers-reduced-motion: reduce`. Under reduced motion:
- All transitions: `0ms` duration
- Skeleton shimmer: static background pattern
- Waveform: static bars
- Dot grid: static (no drift animation)

---

## PART XIX — PERSONALISATION

---

### 19.1 Three Layers

**Stable (user-set, persistent):**
- Default landing destination (LOCKED: TODAY, user-overridable via `apex_default_page`)
- Domain ordering within LIFE & WORK
- Notification frequency per category
- TTS voice preference
- Autonomy level (1–5, existing system)
- Sidebar collapsed state

**Contextual (automatic, session-level):**
- Command suggestions based on time of day (morning → "What's my brief?"; evening → "Log the day")
- TODAY content ordering based on interaction patterns

**Behavioural (learned from memory system):**
- Notification timing (APEX learns when user is most responsive)
- Domain tab ordering (most-visited appears first)
- Suggestion vocabulary

### 19.2 Personalisation Boundaries

Personalisation must not:
- Change the canonical disclosure model (L0→L4 always applies)
- Reorder the 6 primary navigation destinations
- Suppress security-relevant information (approvals, errors)
- Override the design system for visual consistency

---

## PART XX — COMMAND PALETTE

---

### 20.1 Scope (7 Categories)

| Category | What's searched | Ranking |
|----------|----------------|---------|
| Pages/destinations | All 6 primary + secondary | Recency |
| Commands | Common actions | Frequency |
| Knowledge | Semantic facts | Relevance |
| Memory | Recent episodes | Recency |
| Tasks | Active and recent | Status priority |
| People | Contacts | Name match |
| Messages | Recent email subjects | Date |

### 20.2 Palette Design

```
┌─ ⌘K ──────────────────────────────────────────────────┐
│  [____________________________________] × recent       │
│                                                        │
│  SUGGESTED                                             │
│  ► Today's brief                                       │
│  ► Pending approvals (2)                               │
│  ► Check emails                                        │
│                                                        │
│  PAGES                                                 │
│  › TODAY · COMMAND · INTELLIGENCE · ACTIONS           │
│                                                        │
│  TYPE TO SEARCH ALL OF APEX…                           │
└────────────────────────────────────────────────────────┘
```

Keyboard: `↑↓` navigate · `Enter` select · `Escape` close · `Tab` switch category.  
Binding: `Cmd+K` (Mac) / `Ctrl+K` (Windows) → existing `#cmdPalette` element.

---

## PART XXI — CROSS-SYSTEM COHERENCE

---

The complete APEX action cycle, without page navigation breaking context:

```
TODAY (sees brief headline)
  → tap "Read full brief" 
    → INTELLIGENCE (full brief at L1)
      → tap "Show evidence"
        → L2 panel (inline — no navigation)
          → tap "Act on this"
            → COMMAND (pre-loaded with opportunity context)
              → user: "Research this further"
                → research result card in thread
                  → user: "Create a task to follow up"
                    → approval card in thread
                      → user taps [Approve]
                        → task executes
                          → result in COMMAND thread + ACTIONS log
                            → episode stored in INTELLIGENCE → Memory
                              → next session: TODAY shows
                                "APEX acted on the AI compliance opportunity"
```

At every step: no full-page navigation required to go deeper. Context carries forward. Back navigation returns to exact previous state. The full trace is retrievable from INTELLIGENCE → Memory.

---

## PART XXII — API/DATA CONTRACT

---

### 22.1 Existing APIs — Ready

| Surface | API | Status |
|---------|-----|--------|
| TODAY brief | `GET /api/intelligence/briefing` | ✅ 6h cache |
| TODAY priority inbox | `GET /api/briefing/priority-inbox` | ✅ Works at /api/ prefix |
| TODAY vitals | `GET /api/overview/vitals` | ✅ |
| TODAY approvals | `GET /api/tasks` | ✅ |
| COMMAND chat | `POST /chat` | ✅ |
| COMMAND voice | `POST /api/voice/pipeline` | ✅ |
| ACTIONS tasks | `GET /api/tasks` | ✅ |
| ACTIONS approve | `POST /api/tasks/approve` | ✅ |
| ACTIONS agent runs | `GET /api/intelligence/agent-runs` | ✅ |
| INTELLIGENCE briefing | `GET /api/intelligence/briefing` | ✅ |
| INTELLIGENCE memory | `GET /api/memory/episodic/recent` | ✅ |
| INTELLIGENCE knowledge | `GET /api/memory/semantic/search` | ✅ |
| INTELLIGENCE cost | `GET /api/intelligence/cost-summary` | ✅ |
| SYSTEM health | `GET /health` | ✅ |

### 22.2 Schema Fix Required

| API | Issue | Fix |
|-----|-------|-----|
| `GET /api/intelligence/opportunities` | `evidence_refs` column missing | `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS evidence_refs jsonb` |

### 22.3 New Endpoints Required

| Endpoint | Purpose | Source data | Phase |
|---------|---------|------------|-------|
| `GET /api/now/summary` | Single TODAY call (LOCKED: Option C) | briefing + priority-inbox + vitals + pending tasks | V-11-C |
| `GET /api/domains/health/summary` | Health domain L0 one-liner | sleep + workout + nutrition | V-11-H |
| `GET /api/intelligence/memory-summary` | Memory in human language | episodic/recent + semantic/top + lessons | V-11-G |
| `GET /api/actions/summary` | Badge counts | pending tasks + pending approvals | V-11-F |

### 22.4 Response Shape Changes Required

| API | Add field |
|-----|-----------|
| `/api/intelligence/agent-runs` | `human_description`, `step_count` |
| `/api/tasks` | `priority`, `reason` |
| `/api/memory/episodic/recent` | `human_summary` per record |

### 22.5 Briefing Route Note

V-10 recon listed `/briefing/today` and `/briefing/priority-inbox` as 404. This was a test artefact — routes ARE mounted at `/api/briefing/today`. No server change required. V-11-C verifies and fixes the client-side fetch call prefix if needed.

---

## PART XXIII — PERFORMANCE ARCHITECTURE

---

### 23.1 V-09 Baseline Preservation

| Anti-pattern | V-09 fix | V-11 rule |
|-------------|---------|----------|
| Eager domain loading | Deferred | Domain tabs load on first tab activation only |
| Duplicate boot requests | TTL cache + dedup | All new panels use `cachedFetch` |
| Synchronous heavy JS | PlasmaOrb dynamic inject | All new components: dynamic load post-DCL |
| Heavy navigation API calls | Occult (21), Reality (16) | Max 5 calls per tab on activation |

### 23.2 Performance Budgets (V-11 targets)

| Metric | V-09 certified | V-11 target |
|--------|---------------|-------------|
| TTFB | 46ms | <80ms |
| FCP | 394ms | <500ms |
| DCL | 1,249ms | <1,500ms |
| Boot requests (10s) | 35 | <30 |
| TODAY first meaningful content | — | <800ms |
| Navigation switch (shell) | — | <16ms |
| Navigation switch (data L0) | — | <1,200ms |

### 23.3 Boot Criticality Classification

| Asset class | Load timing |
|-------------|------------|
| Shell HTML/CSS | Synchronous — boot critical |
| Font: Inter, Cinzel | Preloaded — boot critical |
| Core JS (`switchPage`, auth check) | Synchronous — boot critical |
| Domain panels | Deferred — on first tab activation |
| PlasmaOrb WebGL | Dynamic — only when Command is active (desktop only) |
| Chart.js | Deferred — only when finance/system charts visible |
| New page sections | Dynamic — `import()` or deferred `<script>` |

### 23.4 The NOW Aggregation

`GET /api/now/summary` replaces 4+ individual calls on boot. Server-side 5-minute TTL. Client makes one call. See API contract section and Decision 6.

---

## PART XXIV — ACCESSIBILITY

---

### 24.1 Keyboard Navigation

- Every interactive element keyboard-reachable
- Tab order follows visual order
- Focus ring: 2px solid `--apex-cyan`, offset 2px
- Skip-to-main link: existing implementation retained
- All dropdowns/sheets: Escape to close
- Command palette: full keyboard operation

### 24.2 Semantic Structure

- Primary destination: `<main role="main">` with `aria-label`
- Navigation: `<nav aria-label="Primary navigation">`
- Cards: `<article>` with descriptive `aria-label`
- Approval cards: `role="alertdialog"` when pending
- Loading: `aria-live="polite"` for content updates
- Errors: `aria-live="assertive"` for blocking errors

### 24.3 Colour and Contrast

- All text: WCAG 2.1 AA (4.5:1 normal text, 3:1 large)
- Status indicators: never colour alone (shape + colour + text)
- Confidence indicators: dot (colour+shape) + word label (text)

### 24.4 Touch Targets

- Mobile interactive elements: 44px minimum
- Approval buttons: 48px minimum
- Bottom tab bar: 56px height minimum

### 24.5 Progressive Disclosure Accessibility

On L0 → L1 expansion:
- Focus moves to expanded content
- `aria-expanded="true"` on trigger element
- `aria-describedby` links trigger to expanded section
- Collapse returns focus to trigger

---

## PART XXV — SECURITY / GOVERNANCE UX

---

Authentication, approval boundaries, and destructive action patterns are unchanged from V-10.

- Server-side `requireAuth` middleware: unchanged
- Client-side `apex_session` cookie check: unchanged
- Rate limiting: unchanged
- Approval flow: unchanged (every consequential action requires approval unless standing approval exists)

**What the UI adds:**
- Every approval card shows whether it's automatic ("You've approved this type before") or manual ("This needs your approval")
- Destructive action cards: "DESTRUCTIVE" label + "Cannot be undone" if irreversible + specific entity named

**No accidental exposure:** V-11 UI never exposes `APEX_ACCESS_KEY`, `JWT_SECRET`, API keys, internal route paths, or raw DB error text in any client-rendered surface.

---

## PART XXVI — END-TO-END JOURNEYS

---

### Journey 0: First-Ever Login

```
USER opens APEX for the first time

Shell renders: 50ms
  Topbar: "APEX" wordmark
  Status dot: Amber ● (connecting)

Auth check: session valid (past login or fresh login)
  Status dot → Cyan ● "APEX is online"

TODAY loads with empty states:
┌───────────────────────────────────────────────┐
│  WELCOME TO APEX                              │
│                                               │
│  APEX is your personal AI operating system.  │
│  It manages your life and work intelligently. │
│                                               │
│  BRIEF  ─────────────────────────────────    │
│  No brief generated yet.                     │
│  [Generate your first brief]                 │
│                                               │
│  NEEDS YOU                                   │
│  Nothing requires your attention yet.        │
│                                               │
│  To get started:                             │
│  [Tell APEX about yourself → COMMAND]        │
│  [Explore APEX intelligence → INTELLIGENCE]  │
│  [Set up your domains → LIFE & WORK]         │
└───────────────────────────────────────────────┘

First-session swipe hint appears:
"Swipe between sections" — fades after 3s
```

### Journey 1: Returning to APEX

```
USER opens APEX (has used it before)

Shell: instant
TODAY: skeleton → brief loads (cached, ~200ms)

"AI Privacy-Compliance is your highest-priority 
 opportunity. First-mover window is open."

NEEDS YOU: "Approve: Calendar event — James [Approve]"
SINCE LAST VISIT: "3 completed · Finance checked · No new emails"

User scans in 15 seconds, takes action on approval.
```

### Journey 2: Morning Briefing

```
USER opens APEX (07:30)
Brief loads → headline: "3 priorities today"
User taps [Read full brief] → navigates to INTELLIGENCE
Full brief: L0 summary visible, L1 expands inline on tap
Evidence for top priority: [Show evidence] → L2 panel slides up (inline)
User taps [Act on this] → COMMAND opens pre-loaded with opportunity context
```

### Journey 3: "What matters today?"

```
USER types "What matters today?" in COMMAND

APEX: structured brief card
L0: "3 priorities:
     1. Review AI compliance opportunity (new)
     2. University assignment due in 2 days
     3. Weekly finance review (last done 8 days ago)"
Actions: [Explore opportunity] [View assignment] [Check finance]
```

### Journey 4: Reviewing an Intelligence Insight

```
USER → INTELLIGENCE → sees opportunity card at L0
Taps card → L1 expands inline:
  "Why this matters: First-mover market · 8-14 month window"
  "What to do: Research further or create an outreach strategy"
  [Explore] [Research more] [Dismiss]

User taps [Show evidence] → L2:
  Source: TechCrunch (2 days ago)
  Source: GDPR enforcement report (1 week ago)
  ● High confidence
```

### Journey 5: "Why?"

```
User taps "Why does this matter?" on any INTELLIGENCE item
L1 context explains: "Because you've set 'AI for businesses' as your
primary empire-building objective. This scores highest on timing, moat,
and relevance to your stated goals."
```

### Journey 6: Inspecting Evidence

```
User taps "Show evidence" → L2 panel
Sees: source list, article summaries, confidence basis
Taps a source → full article summary + "APEX used this because: [reason]"
Taps "Read full article" → external link opens (browser)
```

### Journey 7: Taking Action

```
User taps "Research more" on opportunity
→ COMMAND opens with pre-loaded context
→ user: "Research this market and create a brief"
→ APEX: progress indicator "Researching… step 2 of 5"
→ APEX: research result card with [Save to Knowledge] [Create task] [Share]
```

### Journey 8: Approval

```
APEX creates a task requiring approval
Thread shows inline approval card:
"I've planned this task. It needs your approval."
[Task detail] [Cost £0.43] [Risk: Low] [Reversible: Yes]
[Approve] [View full plan] [Reject]

User: [Approve]
Thread: "Starting the task. I'll have drafts ready for your review."
ACTIONS badge: +1 (In Progress)
```

### Journey 9: Execution

```
User → ACTIONS
Task card: "Market Validation Outreach — In Progress"
"5 email drafts ready · Cost: £0.43 · 4 steps taken"
[Review drafts] [View detail] [Mark done]

User taps [View detail]:
Step trace expands:
1. ✓ Researched 5 creators (1.2s)
2. ✓ Drafted email for Sarah Chen
3. ✓ Drafted email for Marcus Webb
4. ✓ Saved all drafts (0.3s)
Cost: £0.43 · Time: 48s
```

### Journey 10: Completion

```
User marks task done:
Success animation — subtle green flash on card
Undo banner: "Done — Undo? 30s" → countdown → auto-dismisses

APEX records:
Episode: "Market validation outreach drafted"
Knowledge: "User approved outreach tasks with review step"
Lesson: "Include draft review step in all outreach tasks"
```

### Journey 11: Failure

```
APEX attempts task → search service unavailable

If watching (COMMAND thread):
"I couldn't complete the research — the search service is temporarily 
unavailable. I've queued it to retry in 10 minutes.
[Cancel retry]  [Try now]  [Use different method]"

If not watching (background):
TODAY: "✕ Research paused — service unavailable. Retry in 8 min. [Cancel]"

After retry succeeds:
"Research completed ✓" replaces the warning
```

### Journey 12: Correcting APEX

```
User (in COMMAND): "That's wrong — I study in the morning now"

APEX: "Got it. Your study preference is now: morning."
→ Creates contradiction fact + lesson
→ [View change] shows: old fact contradicted, new fact created

User can review all corrections in INTELLIGENCE → Memory → Corrections
```

### Journey 13: Inspecting Memory

```
USER (COMMAND): "What do you remember about my health?"

APEX: "From your health history:
 · Sleep average: 6.8h over 14 days (target: 7.5h)
 · 5 workouts logged this month
 · No nutrition data since August 20th
 Confidence: ● High (26 logged entries)
 [View all health memory]"
```

### Journey 14: Inspecting Knowledge

```
USER: "What do you know about AI compliance regulations?"

APEX: "I have 23 facts about AI compliance:
 · GDPR enforcement: increasing (● High, 1 week old)
 · EU AI Act: implementation updated (● Good, 2 days old)
 · UK equivalent: in consultation (● Medium, 3 weeks old)
 Gap: No information on US state-level regulations
 [Expand knowledge]  [Research gaps]"
```

### Journey 15: Using Voice

```
USER (on INTELLIGENCE page): taps microphone icon in topbar
Voice overlay appears — waveform animation

USER SPEAKS: "What's my calendar today?"

Processing: 2s

Voice overlay slides up:
"You have one event — James Anderson at 3pm."
[Open in Command]  [Dismiss]

TTS plays the response
Overlay auto-dismisses after TTS
INTELLIGENCE page context preserved
```

### Journey 16: Using Cmd+K

```
USER: presses Cmd+K from any page
Palette opens:
  Suggested: Today's brief · Pending approvals (2) · Check emails
  Recent: Research AI compliance · Finance summary
  
User types "health"
  Results: Health page (LIFE & WORK) · Health memory · Sleep log

User selects → navigates directly
```

### Journey 17: Mobile-Only Operation

```
USER (on phone):
Opens APEX → TODAY loads, single column
Reads brief headline
Swipes right → COMMAND
Types "Log my workout: 45 min run"
APEX: "Logged ✓. 5 workouts this month now."

User swipes left → TODAY → sees health signal updated: "Workout ✓"
Taps microphone → voice overlay (not full page)
"Any approvals?" → APEX: "One approval pending" → overlay shows approval card
User taps [Approve] → done, never left TODAY
```

### Journey 18: No Important Information

```
USER opens APEX — no priorities, no alerts, no approvals

TODAY:
"TODAY IS CLEAR
 No urgent items, pending approvals, or intelligence alerts.
 
 SINCE LAST VISIT
 · 3 automated tasks completed ✓
 · Weekly finance: within budget ✓
 · Health: targets met yesterday ✓
 
 What would you like to do?
 [Start a conversation]  [Review intelligence]"
```

### Journey 19: Stale/Offline

```
User opens APEX after 3 days offline

TODAY:
"Last updated 3 days ago  [Refresh all]

BRIEF  (3 days old)
↻ AI Privacy-Compliance opportunity — verify if still current
[Refresh brief]

STALE DATA — these may have changed:
· Finance: last checked 3 days ago
· Emails: last synced 3 days ago"

Status dot: Amber ↻ "Data may be outdated"
After [Refresh all]: panels reload, dot returns to Cyan ●
```

### Journey 20: Degraded Infrastructure

```
USER opens APEX — Claude API unavailable

TODAY: renders from cache (brief is cached 6h)
COMMAND: 
"I can't process requests right now — the AI service is temporarily 
unavailable. [Retry now]"

Status dot: Amber ● "AI service limited"

User can still:
- Read cached TODAY brief
- Review INTELLIGENCE (data is not AI-dependent)
- Review ACTIONS and approve/reject pending tasks
- Navigate all destinations

Cannot:
- Chat with APEX
- Voice queries
- Run agent tasks

This is communicated clearly, not hidden.
```

---

## PART XXVII — IA MATRIX

---

| Surface | User question | L0 | L1 | L2 | Source API | Loading | Empty | Error |
|---------|--------------|----|----|----|-----------|----|----|----|
| TODAY Brief | What's the headline? | 1-sentence briefing | Full briefing text | Sources | `/api/intelligence/briefing` | Skeleton card | "No brief yet — [Generate]" | "Brief unavailable — last brief was [date]" |
| TODAY Needs You | What requires me? | Count + top item | All items | Per-item evidence | `/api/now/summary` | Skeleton | "Today is clear" | "Couldn't load — [Retry]" |
| TODAY Since Last | What happened? | Action count + time | Itemised list | Per-action detail | `/api/intelligence/agent-runs` | Skeleton | "No APEX activity since last visit" | "Activity unavailable" |
| TODAY Health | Am I on track? | Sleep/workout/nutrition | Per-metric detail | Log entries | `/api/domains/health/summary` | Skeleton | "No health data today — [Log entry]" | "Health data unavailable" |
| COMMAND Thread | Ask APEX | User + APEX messages | Structured result card | Sources/evidence | `POST /chat` | "Start a conversation" | "Start a conversation" | "Couldn't connect — [Retry]" |
| INTELLIGENCE Brief | What does APEX know? | Headline + score | Full brief | Sources | `/api/intelligence/briefing` | Skeleton | "Brief generating…" | Stale brief with indicator |
| INTELLIGENCE Opps | Opportunities? | Name + score + confidence | Description + why now | Evidence | `/api/intelligence/opportunities` | Skeleton | "No opportunities — monitoring" | "Analysis unavailable (schema) — [Status]" |
| INTELLIGENCE Memory | What does APEX remember? | Count + highlights | Itemised | Source per memory | `/api/memory/episodic/recent` | Skeleton | "No memories yet — builds over time" | "Memory unavailable" |
| INTELLIGENCE Knowledge | What does APEX know? | Domain coverage | Per-domain facts + gaps | Individual facts | `/api/memory/semantic/search` | Skeleton | "Building knowledge — grows with usage" | "Knowledge unavailable" |
| ACTIONS Task | What's in queue? | Task + status | Description + next step | Why created | `/api/tasks` | Skeleton | "Task queue is clear" | "Tasks unavailable — [Retry]" |
| ACTIONS Approval | What needs approval? | Item + cost + risk | Full detail | Evidence | `/api/tasks` (pending) | Skeleton | "No pending approvals" | "Approvals unavailable — [Retry]" |
| ACTIONS Log | What did APEX do? | Recent (human) | Per-action detail | Cost + outcome | `/api/intelligence/agent-runs` | Skeleton | "No activity yet" | "Log unavailable" |
| LIFE Health | How is my health? | Key metrics | Per-metric trend | Log data | `GET /api/health/*` (max 5 parallel) | Skeleton | "Start tracking — [Log first entry]" | "Health data unavailable" |
| LIFE Finance | How is my money? | Month summary | Category breakdown | Transactions | `/api/finance/summary` | Skeleton | "No transactions yet — [Log transaction]" | "Finance unavailable" |
| LIFE Business | How is the business? | CRM + project summary | Pipeline | Client details | `/api/operations/clients` etc. | Skeleton | "No business data — [Add first client]" | "Business data unavailable" |
| LIFE Comms | What's in my inbox? | Unread count + top | Email list | Per-email | `/api/communications/emails` | Skeleton | "Inbox is clear" | "Email unavailable" |
| LIFE University | What's due? | Assignments + modules | Per-module | Assignment detail | `/api/life/university/assignments` | Skeleton | "No upcoming deadlines" | "University data unavailable" |
| SYSTEM Health | Is APEX healthy? | Status ● | Per-component | API times | `GET /health` | Skeleton | — | "System unavailable" |
| SYSTEM Cost | What did APEX cost? | Today/week/month | Per-run breakdown | Individual runs | `/api/intelligence/cost-summary` | Skeleton | "No cost data yet" | "Cost data unavailable" |

---

## PART XXVIII — IMPLEMENTATION PROGRAMME

---

### 28.1 Implementation Dependency Graph

```
V-11-A (Token unification — CSS only)
  │
  └── V-11-B (State system — loading/empty/error/stale)
        │
        └── V-11-C (Briefing fix + NOW surface alpha)
              │
              └── V-11-D (Navigation reduction: 20 → 6)
                    │
                    ├── V-11-E (Command page rebuild)
                    │     │
                    │     └── V-11-I (Global voice trigger)
                    │
                    ├── V-11-F (ACTIONS destination)
                    │
                    ├── V-11-G (INTELLIGENCE destination)
                    │     │
                    │     └── V-11-J (Opportunities schema fix)
                    │
                    ├── V-11-H (LIFE & WORK domain consolidation)
                    │
                    └── V-11-L (Command palette)

V-11-F + V-11-G + V-11-H
  │
  └── V-11-K (Progressive disclosure + object model)

V-11-A through V-11-L (all complete)
  │
  └── V-11-M (Visual language finalization)
```

Each phase is blocked by its predecessors. Phases at the same level in the graph can be developed in parallel (E, F, G, H after D is complete).

---

### 28.2 Phase V-11-A: Token Unification + Shell Foundation

**Objective:** Single CSS token namespace; shell structure established.  
**User value:** Consistent visual language; groundwork for all subsequent phases.  
**Files:** `public/dashboard.html` (CSS section), `public/apex-zero.css` if present.  
**Dependencies:** None.

**Scope:**
- Deprecate v11 indigo tokens → alias all to APEX Zero cyan equivalents
- Update dot grid animation to use `--apex-border` (cyan) not hardcoded indigo (`5e6ad2`)
- Roll Phase F corrections into main token definitions
- Add `--apex-duration-*` timing tokens
- No structural HTML changes

**Acceptance criteria:**
- All pages render identically or better (no visual regressions)
- `grep -c "5e6ad2\|94,106,210" dashboard.html` returns 0 (or comments only)
- Single `:root` block defines all tokens
- No console errors on any primary destination

**Browser verification:**
- Chrome: all 6 destinations render, no overflow, no console errors
- Safari (if available): visual consistency check
- Firefox: visual consistency check
- Mobile viewport (375px): no overflow, bottom tab bar renders

**Rollback:** Revert CSS block — no functional impact.

---

### 28.3 Phase V-11-B: State System

**Objective:** All panels handle loading/empty/error/stale/partial states distinctly.  
**User value:** Eliminates blank panels; users always know system state.  
**Files:** `public/dashboard.html`.  
**Dependencies:** V-11-A.

**Scope:**
- Standardise loading: every panel uses `skel` skeleton animation (class exists)
- Standardise empty: every domain panel has empty state with onboarding CTA
- Standardise error: every panel uses `panel-error` pattern (class exists) with human text
- Standardise stale: panels with TTL data show amber `↻ [time ago] · Refresh`
- Finance empty: "No transactions logged — [Log transaction] or [Import CSV]"
- Health empty: "No health data today — [Log workout] [Log sleep]"

**Acceptance criteria:**
- Finance page with empty data shows helpful onboarding, not blank panel
- Each state visually distinct from the others
- Error state never shows raw HTTP error text

**Browser verification:**
- Disconnect network in DevTools → error states appear on all panels
- Empty panels render with CTA on pages with no test data
- Screenshot comparison: each state is visually distinct

**Rollback:** Revert affected panel HTML blocks.

---

### 28.4 Phase V-11-C: Briefing Route Fix + NOW Surface Alpha

**Objective:** Fix briefing fetch prefix issue; create initial NOW surface as primary destination.  
**User value:** "What matters today?" has an actual answer.  
**Files:** `public/dashboard.html`.  
**Dependencies:** V-11-B.

**Scope:**
- Verify client-side briefing fetch uses `/api/briefing/today` (add prefix if missing — 1-line fix)
- Create `page-now` HTML section: brief card + needs-you list + since-last-visit list
- Register in `switchPage()` as `'now'`
- Set as default page (`apex_default_page` check → falls back to `'now'`)
- Last visit tracking: read/write `apex_last_session_ts` in localStorage
- Load from: `GET /api/intelligence/briefing` + `GET /api/briefing/priority-inbox` + `GET /api/overview/vitals` (parallel, until `/api/now/summary` exists)

**Acceptance criteria:**
- `switchPage('now')` renders meaningful content
- Brief card shows headline text from live API
- Empty TODAY state ("TODAY IS CLEAR") renders cleanly when no priorities
- Stale brief shows amber indicator
- Default page is NOW on fresh load

**Browser verification:**
- Load APEX → NOW renders as first view (not COMMAND)
- Brief card shows text (not skeleton) within 2s
- Mobile (375px): single-column layout, all content readable

**Rollback:** Restore `command` as default; remove `page-now` section.

---

### 28.5 Phase V-11-D: Navigation Architecture Reduction

**Objective:** Reduce primary nav from 20 to 6 destinations.  
**User value:** Dramatically reduced cognitive load; clearer mental model.  
**Files:** `public/dashboard.html` (nav HTML, `pages` array, mobile nav).  
**Dependencies:** V-11-C (NOW must exist before it becomes primary).

**Scope:**
- Desktop sidebar: 6 items (TODAY · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM)
- Mobile bottom tab bar: 5 tabs (TODAY · CMD · LIFE · INTEL · ACTIONS) + ··· overflow (SYSTEM)
- Swipe dot indicators: 5 dots above tab bar
- First-session swipe hint: localStorage `apex_swipe_hint_shown`
- `pageMeta` updated with new destination titles/subtitles
- Keyboard shortcuts 1–6 mapped
- All previously-primary pages reachable via SYSTEM sub-nav or LIFE & WORK tabs
- State map in JS: `pageState = {}` tracks scroll position + expanded cards per destination

**Acceptance criteria:**
- All 6 destinations accessible via nav and keyboard 1–6
- All previously-accessible pages still reachable (secondary nav or SYSTEM)
- `window.switchPage('command')` and all existing internal calls continue to work
- Mobile: bottom tab bar at ≤767px, sidebar at ≥1024px
- Swipe between tabs works at mobile viewport

**Browser verification:**
- All 6 destinations load without errors
- Keyboard 1–6 navigation confirmed in DevTools
- Mobile: tab bar, swipe indicator dots visible
- No orphaned pages (every current switchPage destination still reachable)

**Rollback:** Restore 20-item nav; restore old `pages` array.

---

### 28.6 Phase V-11-E: Command Page Rebuild

**Objective:** COMMAND becomes a pure conversational AI surface.  
**User value:** Clear primary purpose; conversation history; better AI interaction.  
**Files:** `public/dashboard.html` (page-command section).  
**Dependencies:** V-11-D.

**Scope:**
- Remove Constitution Charter from primary Command view → SYSTEM → Governance
- Remove 3-column `cmd-split` → single-column conversation thread
- Retain PlasmaOrb as ambient background (desktop only, non-interactive, reduced opacity)
- PlasmaOrb mobile guard: `if (window.innerWidth < 768) skip WebGL init`
- localStorage chat history: `apex_chat_history`, 100-message FIFO
- Streaming: implement SSE endpoint (requires separate authorisation — note in spec)
- Structured result cards: research, task created, approval needed
- Command suggestions below input
- Bottom stat strip (`cmdStrip`) moved to TODAY

**Acceptance criteria:**
- Chat input is dominant visual element
- Chat history persists within session (localStorage)
- "APEX is thinking…" visible during API call
- Approval card renders inline in thread
- No constitution visible in default view
- PlasmaOrb not rendered on mobile viewport

**Browser verification:**
- Desktop (1280px): PlasmaOrb visible as ambient background (not interactive)
- Mobile (375px): no PlasmaOrb, CSS background only
- Send test message → response renders in thread
- Reload page → history preserved from localStorage

**Rollback:** Restore `cmd-split` layout; re-add constitution block.

---

### 28.7 Phase V-11-F: ACTIONS Destination

**Objective:** Unified actions/approvals/task management surface.  
**Files:** `public/dashboard.html`.  
**Dependencies:** V-11-D.

**Scope:**
- `page-actions`: pending approvals (primary), task queue, agent run log (human)
- Approval cards: full what/why/cost/risk/reversibility design
- Undo banner: 30-second window (SD-3), countdown in final 5s
- Keyboard shortcut A maps to ACTIONS
- Badge count from `GET /api/actions/summary`

**Acceptance criteria:**
- Pending approvals render with full approval card design
- Approve/reject works
- Agent log shows human descriptions (no raw task IDs)
- Keyboard A → ACTIONS
- Undo banner shows after approval, countdown from 30s

**Browser verification:**
- Approve a pending task → undo banner appears, countdown visible
- Agent log: verify no UUIDs or task IDs in L0 text
- Keyboard A from any destination → ACTIONS

**Rollback:** Restore old tasks/approvals pages; remap keyboard A.

---

### 28.8 Phase V-11-G: INTELLIGENCE Destination

**Objective:** Unified intelligence surface.  
**Files:** `public/dashboard.html`.  
**Dependencies:** V-11-D; V-11-C.

**Scope:**
- `page-intelligence`: Briefing · Opportunities · Memory · Knowledge · Lessons
- Briefing at L0→L2 (expandable inline)
- Opportunities: graceful "unavailable" state until V-11-J schema fix
- Memory summary in human language
- Knowledge coverage bars + gaps
- `GET /api/intelligence/memory-summary` new endpoint used

**Acceptance criteria:**
- Briefing section shows headline + expandable full brief
- Opportunities shows graceful unavailable (not 500 error)
- Memory shows episode count + recent highlights (human language, no UUIDs)
- Knowledge domain bars render
- All sub-sections load independently

**Browser verification:**
- INTELLIGENCE loads without 500 error in console
- Expand briefing → L1 appears inline
- Memory section: verify no raw IDs in displayed text

**Rollback:** Restore old intelligence/memory/knowledge pages.

---

### 28.9 Phase V-11-H: LIFE & WORK Domain Consolidation

**Objective:** All domain pages in one destination with sub-tabs.  
**Files:** `public/dashboard.html`.  
**Dependencies:** V-11-D; V-11-B.

**Scope:**
- `page-domains` with sub-tab nav: Health · Finance · Business · Communications · University · Personal
- Each tab loads on first activation (deferred — V-09 gains preserved)
- Finance tab scope: money flow only
- Business tab scope: operations (CRM, projects, proposals)
- Personal tab: Journal · Spiritual · Esoteric Research (label: "Personal", icon: journal)
- Health tab: max 5 API calls on activation (reduced from 15)
- Finance empty state: onboarding prompt

**Acceptance criteria:**
- Tab switch: shell immediate, data within 1,200ms
- Health tab: ≤5 API calls on first activation (measure in DevTools Network)
- Finance empty state shows onboarding, not blank panel
- All domain content preserved

**Browser verification:**
- DevTools Network: count Health tab requests on first activation (must be ≤5)
- Finance tab with no data: onboarding prompt visible
- Personal tab: "Journal", "Spiritual", "Esoteric Research" sub-sections visible
- Mobile (375px): tabs scroll horizontally if needed, content single-column

**Rollback:** Restore individual domain pages.

---

### 28.10 Phase V-11-I: Global Voice Trigger

**Objective:** Voice accessible from any destination.  
**Files:** `public/dashboard.html` (topbar section).  
**Dependencies:** V-11-E.

**Scope:**
- Microphone icon in topbar (right, persistent)
- Keyboard shortcut `V` triggers voice globally
- Voice result overlay (Part VIII — not forced navigation to COMMAND)
- Voice state transitions: idle → listening → processing → responding
- Mobile: microphone icon in bottom tab bar (rightmost position)
- PlasmaOrb NOT a voice trigger (desktop)

**Acceptance criteria:**
- Voice icon visible from all 6 destinations
- Keyboard V activates voice
- Voice response appears as overlay (not forced navigation)
- Overlay shows response text + TTS plays
- [Open in Command] link navigates to thread

**Browser verification:**
- Desktop: trigger voice on INTELLIGENCE page → overlay appears, INTELLIGENCE context preserved
- Mobile (375px): mic icon in bottom tab bar, tapping opens voice session
- V key from any destination → voice activates

**Rollback:** Remove topbar mic icon; unbind V key; restore COMMAND-only voice.

---

### 28.11 Phase V-11-J: Opportunities Schema Fix

**Objective:** Fix `evidence_refs` schema; INTELLIGENCE Opportunities fully functional.  
**Files:** Supabase DB migration.  
**Dependencies:** V-11-G.

**Scope:**
- `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS evidence_refs jsonb`
- Remove graceful unavailable placeholder from INTELLIGENCE → Opportunities
- Opportunity cards render as full L0→L2

**Acceptance criteria:**
- `GET /api/intelligence/opportunities` returns 200 with data
- Opportunity cards render with confidence indicators (● High etc.)
- No 500 errors in production logs

**Browser verification:**
- INTELLIGENCE → Opportunities: cards render, no error state
- Check Supabase dashboard: column exists

**Rollback:** Revert migration (additive column — safe rollback); restore graceful unavailable state.

---

### 28.12 Phase V-11-K: Progressive Disclosure + Object Model

**Objective:** Canonical L0→L4 disclosure across all object types.  
**Files:** `public/dashboard.html`.  
**Dependencies:** V-11-F, V-11-G.

**Scope:**
- Universal expand/collapse pattern (tap → L1, tap → L2, tap → L3)
- JS state map preserves expanded state across navigation (SD-5)
- All approval cards: L0→L3 with evidence and plan
- All agent run entries: expandable step trace
- All intelligence items: expandable to evidence and reasoning
- All memory items: expandable to source and confidence
- Focus management on expand (accessibility)
- Escape collapses

**Acceptance criteria:**
- Every card type has at least L0+L1
- No page navigation required to see detail
- Expand/collapse keyboard accessible
- Focus moves correctly on expand
- Navigate away and back → expansion state preserved

**Browser verification:**
- Expand intelligence item L1 → navigate to COMMAND → navigate back → L1 still expanded
- Keyboard: Tab to card, Enter to expand, Escape to collapse
- Screen reader: `aria-expanded` state changes announced

**Rollback:** Remove expand/collapse JS; items remain at L0.

---

### 28.13 Phase V-11-L: Command Palette

**Objective:** Global search via Cmd+K.  
**Files:** `public/dashboard.html` (extends existing `#cmdPalette`).  
**Dependencies:** V-11-D.

**Scope:**
- Bind Cmd+K / Ctrl+K to existing `#cmdPalette`
- Search scope: pages, commands, knowledge, memory, tasks, contacts, messages
- Results grouped by type
- Keyboard navigation (↑↓ Enter Escape Tab)
- Recent commands: localStorage
- Suggested items on empty open
- First-session: auto-suggest "Today's brief", "Pending approvals"

**Acceptance criteria:**
- Cmd+K opens palette from any destination
- Search returns results from multiple scopes
- ↑↓ navigation, Enter selects, Escape closes
- Recent commands shown on empty open

**Browser verification:**
- Cmd+K (Mac) and Ctrl+K (Windows/Linux) both work
- Type "health" → LIFE & WORK Health tab appears in results
- Type "approve" → pending approvals appear
- Arrow navigation and Enter selection confirmed

**Rollback:** Unbind Cmd+K; palette reverts to existing implementation.

---

### 28.14 Phase V-11-M: Visual Language Finalization

**Objective:** Typography, spacing, motion — final implementation.  
**Files:** `public/dashboard.html`, `public/apex-zero.css`.  
**Dependencies:** V-11-A through V-11-L all complete.

**Scope:**
- JetBrains Mono restricted to SYSTEM + timestamps + cost values
- Inter as primary typeface for all domain content
- Motion system: page transitions at `--apex-duration-standard` (220ms)
- Reduced motion: all animations disabled via `prefers-reduced-motion`
- Final card border-radius and spacing normalisation
- Status indicator (●) in topbar: WS state + system health
- Swipe dot indicators: 5 dots above mobile bottom tab bar

**Acceptance criteria:**
- No JetBrains Mono on Health, Finance, Communications, University content
- All page transitions use `ax-page-in` keyframe (existing)
- All panel transitions use `ax-panel-in` (existing)
- Reduced motion: all animations disabled; content still functions
- Status dot reflects WS connection state in real time

**Browser verification:**
- Visual consistency at 375px, 768px, 1280px, 1660px
- DevTools: `prefers-reduced-motion: reduce` → no transitions visible
- WS disconnect → status dot changes to Amber within 5s
- Font audit: no JetBrains Mono on domain content pages (DevTools Computed)

**Rollback:** Revert typography and motion rules.

---

## PART XXIX — FINAL EXPERIENCE TEST

---

Can a completely new user open APEX and understand what it is?

**YES.** The topbar shows "APEX". The TODAY surface shows "3 things need your attention today" at L0. The shell communicates "this is an intelligent operating system that is aware of your day."

Can they understand what matters?

**YES.** TODAY → Needs You shows exactly what requires their attention, in priority order, in plain English.

Can they tell what APEX knows?

**YES.** INTELLIGENCE → "WHAT APEX KNOWS" section shows domain coverage and fact counts. INTELLIGENCE → Knowledge shows gaps explicitly.

Can they tell what APEX thinks?

**YES.** INTELLIGENCE → Briefing shows APEX's analysis and recommendations. Confidence indicators communicate certainty.

Can they tell what APEX is doing?

**YES.** The system status dot (●) in the topbar shows operational state. ACTIONS shows in-progress tasks. TODAY → Since Last Visit shows what APEX did.

Can they tell what APEX needs from them?

**YES.** TODAY → Needs You shows pending approvals and items requiring decision. ACTIONS badge count is always visible.

Can they understand why?

**YES.** Every item has an L1 expansion ("APEX surfaced this because…"). Every approval card shows the originating instruction.

Can they inspect evidence?

**YES.** Every intelligence item has "Show evidence" → L2 expansion with sources, timestamps, and confidence. Never more than 2 taps from L0 to evidence.

Can they take action?

**YES.** Every consequential item has a primary action button. Actions are always labelled clearly. COMMAND accepts any instruction in natural language.

Can they see consequences?

**YES.** Every approval card shows: what will happen, cost, risk, reversibility. After completion, a result card shows what APEX did and what it cost.

Can they correct APEX?

**YES.** Any memory item has a "This is incorrect" path. COMMAND understands "That's wrong" in natural language. The correction flow creates a contradiction fact and a lesson.

Can they find anything?

**YES.** Cmd+K searches across all 7 categories. COMMAND answers "Where is X?" in natural language. Every destination is reachable in ≤2 taps from anywhere.

Can they operate it from mobile?

**YES.** Bottom tab bar, single-column content, bottom sheets for detail, swipe navigation, thumb-reachable controls, 44px+ touch targets, mobile voice session.

Can they use voice naturally?

**YES.** `V` key or microphone icon from any destination. Response appears as overlay without disrupting current context. Approval cards appear in the voice overlay and can be actioned directly.

Can they understand failures?

**YES.** Every failure shows a human-language explanation, the specific service affected, and a clear path forward. No blank panels. No technical error text. Status dot reflects system state.

Can they access technical detail without being forced to see it?

**YES.** L4 technical detail is opt-in, scoped to SYSTEM → Advanced. It never appears in TODAY, COMMAND, INTELLIGENCE, ACTIONS, or LIFE & WORK primary views.

---

## PART XXX — LOCKED DESIGN DECISIONS

---

All 10 previously unresolved decisions are resolved. Full rationale in `docs/interface/V-11-DESIGN-DECISIONS.md`.

| Decision | Locked outcome |
|---------|---------------|
| 1 — Destination naming | TODAY · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM (mobile truncations: TODAY/CMD/LIFE/INTEL/ACTIONS/···) |
| 2 — PlasmaOrb | Ambient background on COMMAND, desktop only. Non-interactive. Not rendered on mobile. |
| 3 — Default landing | TODAY. User-overridable via `apex_default_page` in localStorage. |
| 4 — Navigation model | Desktop sidebar (220px, collapsible). Mobile bottom tab bar (5 tabs + ··· overflow). |
| 5 — Personal tab naming | "Personal" — contains Journal, Spiritual, Esoteric Research. |
| 6 — NOW aggregation | Server-side route `GET /api/now/summary` (Option C). New file: `routes/now.js`. |
| 7 — Chat history | Phase 1: localStorage (`apex_chat_history`, 100 messages). Phase 2: server-side (separate authorisation). |
| 8 — Streaming | SSE streaming via `GET /api/chat/stream`. Existing `/chat` retained. Requires separate authorisation. |
| 9 — Swipe indicator | Dot indicators (always visible, 5 dots, active=cyan) + first-session text hint (3 seconds, `apex_swipe_hint_shown`). |
| 10 — Confidence indicator | Dot (coloured, 8px) + one-word label at L0. Expanded explanation at L1. WCAG-compliant. |

**Supplementary decisions resolved (see V-11-DESIGN-DECISIONS.md):**

| SD | Decision | Outcome |
|----|---------|---------|
| SD-1 | Voice result display | Non-destructive overlay panel. Response also in COMMAND thread. Not forced navigation. |
| SD-2 | Last visit tracking | `apex_last_session_ts` and `apex_prev_session_ts` in localStorage. |
| SD-3 | Undo window | 30 seconds. Banner shows countdown in final 5 seconds. |
| SD-4 | Finance vs Business scope | Finance = money flow. Business = operations. Distinct, no overlap. |
| SD-5 | Navigation state survival | JS `pageState` Map — scroll position + expanded card IDs per destination, session-only. |

---

## APPENDIX — V-10 Corrections

**V-10 listed as defects:**
- D-02: `/briefing/today` → 404
- D-03: `/briefing/priority-inbox` → 404

**Correction:** These routes work at `/api/briefing/today` and `/api/briefing/priority-inbox`. The V-10 test used the wrong prefix. V-11-C verifies and fixes the client-side fetch call if it is calling without the `/api` prefix.

**D-01: `/api/intelligence/opportunities` → 500** remains a real defect (missing `evidence_refs` column). Addressed in V-11-J.

---

**V-11 EXPERIENCE ARCHITECTURE SPECIFICATION — LOCKED**

*Status: LOCKED — All decisions resolved — Awaiting implementation authorisation*  
*Recorded: 2026-08-31*  
*Application code changes: NONE*  
*Production: UNCHANGED (dd1dd1f / 1d3f17e)*  
*Design Decisions: `docs/interface/V-11-DESIGN-DECISIONS.md`*
