# V-11 EXPERIENCE ARCHITECTURE SPECIFICATION
# CANONICAL DESIGN AUTHORITY FOR THE APEX INTERFACE OVERHAUL

**Date:** 2026-08-31  
**Authority:** APEX Product — V-11 Design Lock  
**Predecessor:** V-10 Experience Architecture Reconnaissance (`c04c215`)  
**Status:** SPECIFICATION COMPLETE — AWAITING IMPLEMENTATION AUTHORISATION  
**Application code changes:** NONE  
**Production:** UNCHANGED (dd1dd1f / 1d3f17e)

> This document is the authoritative design and product specification governing every subsequent implementation phase of the APEX interface overhaul. No implementation should begin without explicit authorisation referencing a specific phase defined here.

---

## PART I — FOUNDATIONS

---

### A. Core User Model

#### Who is the interface for?

A single user who is simultaneously:
- A student (University work, assignments, deadlines)
- A founder/operator (Business, CRM, projects, finance)
- A self-directed individual (Health, wellbeing, journal, personal practice)
- A system operator (Managing APEX itself — agents, memory, intelligence)

This user is sophisticated enough to build and operate an AI OS. They do not need to be protected from depth. They need depth to be available *on demand*, not imposed by default.

The interface must serve this user across three distinct usage patterns:
1. **Morning review** — "What matters today?" (2–5 minutes, deliberate)
2. **Active work** — "Do this / research that / check this" (seconds to minutes, goal-directed)
3. **Quick check** — "What's happening / any approvals?" (under 30 seconds, ambient)

#### What must a user understand within 5 seconds?

- Whether anything urgently needs their attention right now
- Whether APEX is healthy and active
- A single meaningful signal about their day

#### Within 30 seconds?

- The top 3 things that matter today (from the APEX brief)
- What APEX has done since last session
- What is pending their decision

#### Within 2 minutes?

- A complete picture of their priorities across life and work
- APEX's current intelligence state (what it knows, what it's researching)
- Any pending approvals with full context to act

#### What should never be required to understand APEX?

- Knowledge of how APEX is implemented
- Understanding of episodic vs semantic vs procedural memory
- Knowledge of agent task IDs, pipeline stages, cost-per-run
- Understanding of "civilization cycles", "reality fabric", or "epistemic health"
- Memory of which page contains which information
- Technical knowledge of the API surface

---

### B. Information Hierarchy — The Canonical Disclosure Model

Every surface in APEX must conform to this hierarchy. Implementation of a new surface begins by defining which levels it supports.

#### L0 — IMMEDIATE SUMMARY

**Purpose:** The answer at a glance. One line. Human language. Always visible.  
**Audience:** User at any moment, no context required  
**When shown:** Default — always  
**Visual treatment:** Primary text weight, full contrast, no explanation required  
**Examples:**
- "3 things need your attention today"
- "APEX completed your research — ready to review"
- "Finance: £240 spent this week"
- "Health: Sleep and workout logged ✓"
- "78% of agent actions succeeded this month"

#### L1 — ACTIONABLE CONTEXT

**Purpose:** Why this matters and what to do about it  
**Audience:** User who noticed the L0 summary and wants to act  
**When shown:** On tap/click of L0 element — expands inline  
**Visual treatment:** Secondary weight, muted label, clear action button if applicable  
**Examples:**
- "Your highest-priority opportunity: AI Privacy-Compliance. Scores 58. First-mover window is open."
- "2 tasks need approval before APEX can proceed. Estimated cost: £0.03."
- "Sleep data from last night: 6.5 hours, quality 7/10. Below your 7.5h target."

#### L2 — SUPPORTING EVIDENCE

**Purpose:** The data behind the L1 context  
**Audience:** User who wants to verify or understand before acting  
**When shown:** Second expand, or "Show evidence" tap  
**Visual treatment:** Smaller text, source tags, timestamps, confidence indicator  
**Examples:**
- "Based on: 3 web sources (TechCrunch, GDPR enforcement report, competitor analysis)"
- "Agent run completed at 14:02 · Cost: £0.02 · 12 steps taken"
- "Sleep log from Supabase · Last updated: 08:14 today"

#### L3 — REASONING / OPERATIONAL DETAIL

**Purpose:** The reasoning chain, step trace, or operational context  
**Audience:** User who wants to understand *how* APEX reached a conclusion  
**When shown:** Third expand, or "Show reasoning" tap  
**Visual treatment:** Monospace accents for step traces, numbered steps, confidence per step  
**Examples:**
- "APEX identified this opportunity by: (1) scanning intelligence briefing, (2) cross-referencing with your active goals, (3) scoring against 4 criteria: timing, moat, cost, relevance"
- "Agent run steps: [1] Retrieve context → [2] Search web → [3] Synthesise findings → [4] Write result"

#### L4 — TECHNICAL PROVENANCE

**Purpose:** Raw data, system IDs, API responses, debug information  
**Audience:** User performing system administration or debugging  
**When shown:** Explicit "Developer detail" toggle — never shown by default  
**Visual treatment:** Code block / monospace, full opacity, clear "SYSTEM" label  
**Examples:**
- `{ memory_id: "ep-mthdz8dc-m1iu", confidence: 0.7789, created_at: "2026-08-31T14:02:00Z" }`
- Task ID: `TASK-282001`, Agent run ID: `voice-task-1788188041221`

#### Cross-Level Rules

1. L0 must exist for every data surface. There are no exceptions.
2. L1 is required if an action is available. Users must understand before acting.
3. L2 is strongly recommended for intelligence/recommendation surfaces.
4. L3 is optional for most surfaces; required for agent execution and approvals.
5. L4 is opt-in only and scoped to the System destination.
6. Expanding to a deeper level never navigates away from the current page.
7. Each level is revealed by a single tap/click, not by navigation.
8. Collapse is always available (tap again or press Escape).

---

## PART II — THE NOW EXPERIENCE

---

### C. The "NOW" Surface — Canonical Design

#### Core Question

"What matters to me right now?"

This is the first question every user asks when opening APEX. Currently there is no answer. The NOW surface is its answer.

#### What Qualifies as "Matters Now"

Not everything qualifies. The NOW surface must apply a **relevance filter** — not an aggregation of all available data. Inclusion criteria:

| Category | Qualifies if... |
|----------|----------------|
| Approval pending | Any approval in pending state |
| Urgent task | Task marked urgent or overdue |
| Proactive intelligence | New briefing or opportunity not yet seen |
| Calendar event | Within next 4 hours |
| Unread email (priority) | Priority-labelled, unread |
| Finance alert | Budget exceeded, overdue invoice |
| Health alert | 2+ consecutive missed targets |
| Assignment deadline | Due within 48 hours |
| Agent failure | Agent action failed requiring user input |
| System alert | Production error, WS disconnection |

Does NOT qualify (filtered by default):
- General notifications (surfaced in ACTIONS)
- Historical agent runs (surfaced in INTELLIGENCE)
- Technical metrics (surfaced in SYSTEM)
- Items the user has already reviewed (dismissed items stay dismissed)

#### NOW Surface Layout

```
┌─────────────────────────────────────────────────────┐
│  APEX                            14:23  ●  2 pending │
│  ─────────────────────────────────────────────────── │
│                                                      │
│  TODAY                           Mon 31 Aug 2026     │
│                                                      │
│  ┌─ BRIEF ───────────────────────────────────────┐   │
│  │ AI Privacy-Compliance opportunity is highest  │   │
│  │ priority. First-mover window is open now.     │   │
│  │                              [Read full brief]│   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  NEEDS YOU          ●●  2 items                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ ▶ Approve: Create calendar event — James     │    │
│  │   Cost: £0.00 · No risk · Reversible         │    │
│  │   [Approve]  [View detail]                   │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │ ⚠ Deadline: University assignment due 2 days │    │
│  │   Advanced ML — Chapter 8 submission         │    │
│  │   [View assignment]                          │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  SINCE LAST VISIT               3 actions, 1h 22m    │
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

#### Empty NOW State

When nothing qualifies:

```
  TODAY IS CLEAR
  
  No urgent items, pending approvals, or alerts.
  APEX has been active — view what happened →
```

This is NOT the same as "nothing is happening." It is a deliberate positive signal.

#### Loading NOW State

Skeleton cards during data fetch — each section loads independently. The brief section loads first (cached). NEEDS YOU loads next. SINCE LAST VISIT loads last. No blank screen at any point.

#### Degraded NOW State

If briefing API fails: show last cached brief with stale indicator. If all APIs fail: show timestamp of last successful load and a retry. The NOW surface never shows as blank.

#### NOW Decision Logic

Implemented server-side or in the page JS as a priority scorer:

```
score(item) {
  base = item.type scores (approval=100, urgent_task=90, deadline_48h=80, ...)
  recency = decay(item.created_at)  // older items score lower
  dismissed = item.user_dismissed ? 0 : 1
  return base * recency * dismissed
}
display items where score > threshold, max 7 items
```

---

### D. Home / Landing Experience

When the user opens APEX:

1. **Instant shell:** Pure black canvas + topbar + navigation — renders in <100ms (no data required)
2. **Skeleton content:** NOW surface skeleton appears immediately
3. **Brief loads first:** The APEX intelligence brief populates within 1–2s (6h cached — nearly instant on cache hit)
4. **Needs You loads:** Approval/alert items populate
5. **Since Last Visit loads:** Agent activity summary populates
6. **Health/domain signals load last:** Optional context, not blocking

The user never sees a blank screen. The shell and skeleton communicate "APEX is loading" rather than "nothing is happening."

**Default landing destination:** NOW  
**Exception:** If the user's last session was in a specific domain and they return within 5 minutes, restore that context.

---

## PART III — NAVIGATION ARCHITECTURE

---

### E. Navigation — Canonical Information Architecture

#### Final Primary Destinations: 6

After evidence-based analysis, 6 primary destinations are recommended. 5 would collapse useful distinctions; 7 would introduce the same fragmentation that currently exists with 20.

| # | Destination | Human Name | Icon concept | Primary Question Answered |
|---|-------------|------------|--------------|--------------------------|
| 1 | now | TODAY | Horizon / sun | What matters right now? |
| 2 | command | COMMAND | Diamond / gem | Ask or tell APEX anything |
| 3 | domains | LIFE & WORK | Grid / layers | How are my domains doing? |
| 4 | intelligence | INTELLIGENCE | Eye / signal | What does APEX know? |
| 5 | actions | ACTIONS | Check / arrow | What needs my decision? |
| 6 | system | SYSTEM | Node / circuit | How is APEX itself doing? |

**Important:** Destination naming — "TODAY", "LIFE & WORK", "INTELLIGENCE" — requires explicit authorisation before implementation. These are recommendations, not locked labels.

#### What Each Destination Contains

**TODAY (now)**
- Morning brief (L0: headline, L1: full brief, L2: evidence links)
- Needs You queue (approvals, alerts, deadlines)
- Since Last Visit summary (agent activity in natural language)
- Health signals (sleep, workout, nutrition — one-line each)
- Finance signals (budget status — one-line)
- Upcoming calendar (next 4 hours)

**COMMAND (command)**
- Full-width conversational AI interface
- Persistent chat history (across sessions)
- Voice trigger (global — also accessible from any other page)
- Streaming response with progress indicator
- Structured result cards (research, task created, calendar event)
- Inline approval prompt when agent action requires authorization
- Recent commands (last 5, accessible without scrolling)

**LIFE & WORK (domains)**
- Sub-navigation tabs within the destination: Health · Finance · Communications · University · Business · Personal
- Each sub-tab is a domain panel, not a separate primary page
- Domain panels load on first visit to that tab (deferred — preserving V-09 perf gains)
- Finance covers both personal and professional (single unified view)
- Business tab covers CRM, projects, proposals, documents

**INTELLIGENCE (intelligence)**
- Deep intelligence brief (the full `/api/intelligence/briefing` response at L0→L3)
- Opportunities list (when schema is fixed — `/api/intelligence/opportunities`)
- What APEX knows: knowledge summary, fact count, confidence distribution
- Memory highlights: recent episodic memories in human language
- Knowledge gaps: areas where APEX has limited knowledge
- Research history: recent research runs and their outcomes
- Lessons learned: APEX reflexion lessons in plain language

**ACTIONS (actions)**
- Pending approvals (primary — `keyboard A` retained)
- Task queue: pending, in-progress, recently completed
- Agent run log (human-readable: "APEX researched X and found Y")
- Standing approval rules (what APEX can do automatically)
- Undo: most recent reversible action with 30s undo window
- Notifications: all system notifications (badge count in nav)

**SYSTEM (system)**
- System health: APEX status, API health, DB status, WS state
- Agent technical view: domain agents, pipeline, schedules
- Cost dashboard: today / week / month breakdown
- Memory technical health: episodic count, semantic facts, health scores
- Reality/governance/civilization: advanced system governance (L4 destination)
- Settings: auth, preferences, API keys, autonomy level

#### What Is Deliberately Hidden (Secondary Access Only)

These exist in the system and remain accessible — they simply do not appear in primary navigation:

| Currently primary | Becomes |
|------------------|---------|
| Activity (raw event log) | Sub-section of SYSTEM → Activity |
| Agents (agent library) | Sub-section of SYSTEM → Agents |
| Memory (technical view) | Sub-section of INTELLIGENCE → Memory detail |
| Knowledge (graph view) | Sub-section of INTELLIGENCE → Knowledge |
| Reality (claims framework) | Sub-section of SYSTEM → Advanced |
| Governance | Sub-section of SYSTEM → Advanced |
| Civilisation | Sub-section of SYSTEM → Advanced |
| Master | Sub-section of SYSTEM → Advanced (dev tools) |
| Timeline | Accessible from TODAY → History |
| Research (raw) | Accessible from COMMAND (research is an action) |

#### Keyboard Shortcuts (Revised)

| Key | Action |
|-----|--------|
| `1` | TODAY |
| `2` | COMMAND |
| `3` | LIFE & WORK |
| `4` | INTELLIGENCE |
| `5` | ACTIONS |
| `6` | SYSTEM |
| `A` | ACTIONS (retained — existing shortcut) |
| `N` | Notifications (retained) |
| `K` or `⌘K` / `Ctrl+K` | Command palette |
| `/` | Focus command input (retained) |
| `?` | Help overlay (retained) |
| `R` | Refresh current destination (retained) |
| `ESC` | Close overlay / collapse expansion / dismiss |
| `V` | Voice trigger (global) |

---

## PART IV — DESTINATION DESIGNS

---

### F. COMMAND — First Principles Redesign

#### What Command Means

Command is APEX's primary cognitive interface. It is where the user:
- Asks questions and receives structured answers
- Issues instructions that APEX executes or queues
- Interacts via voice
- Reviews the results of previous requests
- Explores topics with APEX as a thinking partner

Command is NOT:
- A system dashboard
- A health monitor
- A financial overview
- A page for displaying the APEX constitution

#### Command Surface Design

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌─ MESSAGE THREAD ───────────────────────────────────┐ │
│  │  [APEX]  Your AI Privacy-Compliance research is    │ │
│  │          complete. Key findings:                   │ │
│  │          · First-mover market window: 8–14 months  │ │
│  │          · Estimated TAM: £340M by 2028            │ │
│  │          · Three incumbent gaps identified          │ │
│  │          [Read full research ↗] [Save note]        │ │
│  │                                                    │ │
│  │  [YOU]   Research the AI privacy compliance market │ │
│  │          [14:02]                                   │ │
│  │                                                    │ │
│  │  [APEX]  Ready. What else can I help with?         │ │
│  │                                                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ INPUT ─────────────────────────────────────────┐🎤 │
│  │ Ask APEX anything…                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  SUGGESTIONS                                            │
│  [What's my brief?]  [Check emails]  [Log a workout]   │
│                                                         │
│  RECENT  ↓                                              │
│  Research AI compliance · Finance summary · Add event   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Command Interaction States

| State | Visual | Text |
|-------|--------|------|
| Idle | Input focused, caret blinking | "Ask APEX anything…" |
| User typing | Input active | Live text |
| Thinking | Animated cyan dots in message thread | "APEX is thinking…" |
| Streaming | Text appearing character by character | Progressive output |
| Tool running | Progress bar in message thread | "Researching… [step X of Y]" |
| Approval needed | Inline orange approval card | "This needs your approval" [Approve] [Change] |
| Complete | Full result card | Result + follow-up suggestions |
| Error | Red indicator in thread | Human-language error + retry |

#### Structured Result Cards in Command

When APEX completes an action, it does not return plain text. It returns a typed result card:

**Research result:**
```
┌─ RESEARCH COMPLETE ────────────────────────────────┐
│ AI Privacy-Compliance Market                        │
│ 3 key findings · 5 sources · Confidence: High       │
│                                                     │
│ [Expand findings] [Save to knowledge] [Share link]  │
└─────────────────────────────────────────────────────┘
```

**Task created:**
```
┌─ TASK QUEUED ──────────────────────────────────────┐
│ "Review AI compliance opportunity"                  │
│ Priority: High · Scheduled: Tomorrow 09:00          │
│ [View task] [Edit] [Run now]                        │
└─────────────────────────────────────────────────────┘
```

**Action requiring approval:**
```
┌─ APPROVAL NEEDED ───────────────────────────────── ┐
│ Create calendar event: James · Thu 14:00 · 1h       │
│ Cost: £0.00 · Reversible · No data accessed         │
│ [Approve]  [View detail]  [Reject]                  │
└─────────────────────────────────────────────────────┘
```

#### Command and Voice Relationship

Voice is a first-class input mode within Command. They share:
- The same message thread
- The same response rendering
- The same approval workflow

Voice-specific behaviours:
- "V" key or persistent microphone button activates globally
- Waveform animation during listening (existing `waveform` element, repurposed)
- "APEX is listening" text (replace "STANDBY · TAP TO SPEAK")
- TTS playback with matching text highlight in thread
- Barge-in: user can speak while APEX is responding (interrupt)

#### What Leaves the Command Page

The following must be removed from the Command page primary view:
1. The APEX Constitution Charter (6-article grid) — moves to SYSTEM → Governance
2. The 3-column `cmd-split` layout — replaced by single conversation column + input
3. The bottom stat strip (`cmdStrip`) — Balance, Messages, Tasks, Health — surface these in TODAY instead
4. The PlasmaOrb as primary visual identity — see Section R for evaluation

The `cmd-feed-col` (activity feed) moves to ACTIONS and SYSTEM. It should not be the third column on the primary command surface.

---

### G. VOICE — First-Class Interaction

#### Global Voice Trigger

Voice is not a Command page feature. It is a global input mode.

**Trigger mechanism:**
- Desktop: `V` key, or persistent microphone icon in topbar (right side)
- Mobile: Persistent microphone button in bottom tab bar
- Hardware: Compatible Bluetooth button (future consideration)

**Visual states:**

| State | Topbar indicator | Full-screen if active |
|-------|-----------------|----------------------|
| Available | Dim microphone icon | — |
| Listening | Pulsing cyan microphone | Waveform animation (full-width) |
| Processing | Spinning indicator | "APEX is thinking…" |
| Responding | Speaker animation | Response text appearing + audio |
| Complete | Returns to idle | Result card in Command thread |
| Error | Red microphone | "I didn't catch that — try again" |

#### Voice Interactions

Voice triggers the same pipeline as text Command. The result appears in the Command thread regardless of which page the user is on when they trigger voice.

Voice-specific considerations:
- After a voice exchange, the user may navigate away — the response appears as a push notification if they miss it
- Long voice responses (>30s) include a "stop speaking" button
- Voice on mobile activates full-screen listening UI (no competing UI)
- Transcript is always visible alongside audio (accessibility)

---

### H. INTELLIGENCE — What APEX Knows and Finds

#### Intelligence Purpose

Intelligence is APEX's perspective on the world and on the user. It is not a system health page. It is an analytical lens.

#### Intelligence Surface Layout

```
┌─ INTELLIGENCE ────────────────────────────────────────┐
│  Updated 2h ago                    [Refresh]          │
│                                                       │
│  BRIEFING                                             │
│  ┌─────────────────────────────────────────────────┐  │
│  │ APEX DAILY BRIEF · Mon 31 Aug 2026              │  │
│  │                                                 │  │
│  │ Highest opportunity: AI Privacy-Compliance       │  │
│  │ scores 58. First-mover window is open now.      │  │
│  │                                                 │  │
│  │ [Expand brief] [Show evidence] [Act on this]    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  OPPORTUNITIES          [3 found · 1 new]             │
│  ┌──────────────────┐ ┌──────────────────┐            │
│  │ AI Privacy       │ │ Shopify Plugin   │            │
│  │ Score: 58        │ │ Score: 41        │            │
│  │ High confidence  │ │ Medium           │            │
│  │ [Explore]        │ │ [Explore]        │            │
│  └──────────────────┘ └──────────────────┘            │
│                                                       │
│  WHAT APEX KNOWS        Facts: 418 · Confidence: 78%  │
│  Health: 95 facts · Business: 127 facts · ...         │
│  [3 knowledge gaps identified] → [View gaps]          │
│                                                       │
│  WHAT APEX REMEMBERS    95 episodes · 74 successful   │
│  "Researched AI privacy market" · 2h ago             │
│  "Logged university session" · yesterday              │
│  [View all memory]                                    │
│                                                       │
│  LESSONS                7 lessons · 3 applied today   │
│  "When asking about finance, include both personal    │
│   and business transactions for a complete view"     │
│  [View all lessons]                                   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

#### Intelligence Item Design

Every intelligence item (opportunity, insight, briefing point) follows the APEX object model:

```
TITLE (L0)
One sentence summary with confidence indicator (● High / ◐ Medium / ○ Low)

[Expand for L1]
  Why this matters: [actionable context]
  What to do: [concrete next step]
  
[Show evidence — L2]
  Sources: [list with links]
  Data used: [what APEX read]
  
[Show reasoning — L3]  
  How APEX reached this: [step-by-step]
  Confidence basis: [what drives high/medium/low]
```

---

### I. KNOWLEDGE — What APEX Knows

#### Knowledge is accessed through Intelligence, not as a separate primary destination

The "Knowledge" page becomes a sub-section within INTELLIGENCE. Users access it by asking "What does APEX know about X?" in Command, or by tapping "View all knowledge" within Intelligence.

#### Knowledge Surface

```
APEX KNOWLEDGE

Search: [___________________________] 

Domain coverage:
Business    ████████░░  82%   127 facts
Health      ██████░░░░  60%    95 facts  
Finance     ███░░░░░░░  30%    48 facts
University  █████████░  90%   148 facts

GAPS
· Finance: No budget tracking since August 1st
· Health: No sleep data for 3 nights
· Business: Client "Horizon Tech" — no contact logged in 14 days

RECENT FACTS
"AI Privacy-Compliance is a first-mover opportunity" · confidence 0.76
"User prefers evening study sessions" · confidence 0.82
```

---

### J. MEMORY — The Human Experience

#### Memory Translation Rules

Memory must be presented in human language, never as database records.

| Raw data | Human translation |
|----------|------------------|
| `ep-mthdz8dc-m1iu` | [never shown] |
| `confidence: 0.7789` | "High confidence" |
| `episodic_memory: 95 records` | "APEX has 95 memories from the last N months" |
| `objective: "voice-task-178..."` | "APEX handled a voice request" |
| `success: true, cost_usd: 0.049` | "Completed · £0.04" |
| `topFailStage: null` | [not shown — success] |

#### Memory User Experience

The user should be able to:

1. **Ask in plain language:** "What does APEX remember about my health?" → Command routes to memory search
2. **Browse chronologically:** INTELLIGENCE → Memory → timeline of recent memories
3. **Correct a memory:** Tap any memory → "This is incorrect" → APEX creates a contradiction fact
4. **Inspect confidence:** Any memory shows a confidence indicator (●◐○)
5. **Understand source:** "Where did APEX learn this?" → L2 expansion shows source

Memory is distinguished from current context by timestamp and a "Remembered" label vs "Current session" label.

Uncertainty is communicated through confidence indicators, never through hedging language alone. A low-confidence fact shows ○ + "Low confidence — verify before acting."

---

### K. ACTIVITY / OBSERVABILITY — Human-Meaningful

#### Activity Classification

| Event type | Label | Shown in |
|------------|-------|----------|
| APEX completed an action | "APEX did: [plain description]" | TODAY → Since last visit; ACTIONS → log |
| APEX learned something | "APEX learned: [fact]" | INTELLIGENCE → Lessons |
| APEX discovered something | "APEX found: [insight]" | TODAY → Brief; INTELLIGENCE → Opportunities |
| APEX recommends | "APEX suggests: [action]" | TODAY → Needs You; INTELLIGENCE |
| APEX is waiting | "Waiting for your approval: [item]" | TODAY → Needs You; ACTIONS |
| Something failed | "APEX couldn't: [human description]. [Why]. [What now]." | TODAY if blocking; ACTIONS |
| Technical telemetry | Raw event data | SYSTEM → Activity only |

#### Distinguishing Action Types (Display)

```
✓  APEX did     — completed, successful
●  APEX learned — new fact or lesson
◉  APEX found   — new insight or opportunity
→  APEX suggests — recommendation pending
⏳  Waiting      — approval or input needed
✕  Failed       — error, with remediation
⚙  System       — technical event (SYSTEM only)
```

---

### L. TASKS / APPROVALS / ACTIONS — Complete Lifecycle

#### The Action Lifecycle

```
DISCOVER → UNDERSTAND → REVIEW → APPROVE/DENY → EXECUTE → MONITOR → COMPLETE → LEARN
```

Each stage has a defined visual state:

**DISCOVER**
- Item appears in TODAY → Needs You (if urgent) or ACTIONS
- L0: What, who, when
- Notification badge increments

**UNDERSTAND**
- User taps item
- L1 expands: why, what will happen, cost, risk level, reversibility
- L2: evidence or context that generated this action

**REVIEW**
- User can: Approve / Reject / Modify / Defer / Ask APEX to explain more
- "Ask APEX" opens Command thread pre-loaded with the action context

**APPROVE/DENY**
- Single tap action
- Rejection: optional reason input ("Tell APEX why — helps it learn")
- Approval: immediate confirmation animation

**EXECUTE**
- Progress state: "APEX is working on this…"
- If long-running: progress card in ACTIONS with step count
- If instant: completion state immediate

**MONITOR**
- For long-running: expandable step trace
- "What has APEX done so far?" shows completed steps

**COMPLETE**
- Result card: what happened, cost, outcome
- Undo window: 30 seconds for reversible actions (banner at top)
- Success animation: subtle, not distracting

**LEARN**
- Rejection → APEX generates reflexion lesson
- Completion → episode stored in memory
- User can optionally provide feedback ("This was helpful / not helpful")

#### Approval Card Design

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

The approval card shows:
- What APEX plans to do (human language, not API call)
- Why (the user's original instruction)
- Cost / Risk / Reversibility (always three-attribute summary)
- Three actions: primary approve, secondary view detail, tertiary reject

---

### M. COMMUNICATION — Proactive Design

#### Communication Hierarchy

| Priority | Type | Mechanism | Frequency |
|----------|------|-----------|-----------|
| 1 — Critical | Approval blocking execution | Badge + TODAY card | Immediate |
| 2 — Urgent | System failure, deadline breach | Badge + push | Immediate |
| 3 — Important | New briefing, new opportunity, finance alert | Badge | On generation |
| 4 — Standard | Task completion, email, reminder | Notification item | Batched |
| 5 — Ambient | Health/activity status | TODAY surface | On open |
| 6 — Digest | Daily summary | Brief in TODAY | Once/day |

#### Anti-Overload Rules

1. At most 3 items in TODAY → Needs You at any time (overflow → ACTIONS)
2. Push notifications only for Priority 1–2 (never for Priority 4–6)
3. APEX learns which notification types the user dismisses quickly and deprioritises them
4. "Do Not Disturb" mode: suppresses all non-critical notifications
5. Each notification has exactly one clear action — never two competing CTAs

#### Proactive Communication

APEX should communicate proactively when:
- A decision-relevant change has occurred (new email from key person, market event)
- An approval will block a scheduled task
- A deadline is approaching and the user hasn't acted
- A new opportunity score exceeds the user's interest threshold
- A previously failing API is restored

APEX should NOT communicate proactively for:
- Routine agent completions (show in ACTIONS on demand)
- Technical metrics changes (never to user surface)
- Repeated reminders for the same item within 4 hours (once is enough)

---

### N. TRANSPARENCY / TRUST — Every Consequential Decision

#### The Transparency Contract

Every consequential APEX action — any action that affects data, sends a communication, or incurs cost — must be:

1. **Observable:** User can always find what APEX did
2. **Auditable:** User can always understand how and why
3. **Attributable:** Each action is linked to the user instruction that caused it
4. **Reversible where possible:** Undo is offered for reversible actions
5. **Explainable at multiple depths:** L0→L4 always available

#### What Transparency Is NOT

Transparency does not mean showing:
- Raw API responses to users
- Internal agent task IDs in user-facing contexts
- Database row IDs as references
- Technical error stack traces

These are L4 and appear only in SYSTEM → Advanced.

#### Confidence Communication

APEX must communicate confidence clearly and consistently:

| Confidence | Label | Indicator | What it means |
|------------|-------|-----------|---------------|
| ≥ 0.85 | High | ● | Strong evidence, multiple sources, consistent |
| 0.65–0.84 | Good | ◕ | Reasonable evidence, some uncertainty |
| 0.45–0.64 | Medium | ◐ | Partial evidence, verify before acting |
| 0.25–0.44 | Low | ◑ | Weak evidence, treat as hypothesis |
| < 0.25 | Very Low | ○ | Speculative — use cautiously |
| Unknown | — | — | No confidence data available |

#### What APEX Does Not Know

APEX must be explicit about knowledge gaps. This is part of trust, not weakness:
- "I don't have data on your finances after August 1st"
- "I haven't found information about [topic] — I could research it"
- "The last time this was verified was 3 weeks ago — it may have changed"

---

## PART V — STATE SYSTEM

---

### O. Empty / Loading / Error / Degraded States

#### The 8 Canonical States

Every panel in APEX is always in exactly one of these states:

**1. LOADING**
- Skeleton shimmer animation (existing `skel` class)
- Never blank white or black — always shimmering skeleton
- Label: "Loading" not required if skeleton shape communicates content type
- Timeout: If loading >10s, transition to ERROR state

**2. HEALTHY (data loaded, fresh)**
- Content rendered
- Small "Updated [time ago]" label (muted, bottom of panel)
- No indicator needed (healthy is the baseline)

**3. STALE (data loaded, past TTL)**
- Content rendered with amber "↻" refresh indicator in panel header
- Label: "Updated [time ago] · Refresh"
- Never prevent reading stale data — just communicate it

**4. EMPTY (no data exists — this is valid)**
- Illustration or icon (topic-relevant)
- Human headline: "No [items] yet"
- Onboarding prompt: "Add your first [item] → [action]"
- NEVER a blank panel

**5. NO RESULTS (query returned nothing)**
- Different icon from EMPTY
- "No results for '[query]'"
- Suggestion: "Try [alternative]"
- Or: "APEX could research this for you → [Ask APEX]"

**6. ERROR (API failure, 5xx)**
- Red dot in panel header
- Human-readable error: "Couldn't load [panel name]"
- Reason if meaningful: "The service is temporarily unavailable"
- Retry button
- Never show technical error text (moved to L4/SYSTEM)

**7. PARTIAL (some data failed)**
- Warning indicator in panel header
- Renders what succeeded
- Footnote: "[N] items unavailable — [Retry]"

**8. PERMISSION RESTRICTED**
- Lock icon
- "Access restricted" or "Sign in to see this"
- Clear path to resolution

#### Prohibited Patterns

These patterns are explicitly banned:

1. Blank panel (no content, no state) — NEVER
2. Technical error text in user-facing context — NEVER
3. Raw IDs in any error message — NEVER
4. "undefined" or "NaN" appearing in rendered UI — NEVER
5. Loading state that looks identical to empty state — NEVER
6. Error state that looks identical to empty state — NEVER

---

### P. Global System Status

#### System Status Indicator

A small persistent indicator in the top bar communicates APEX's operational state:

| State | Indicator | Colour | Label (on hover/tap) |
|-------|-----------|--------|---------------------|
| Healthy | ● | Cyan | "APEX is online" |
| Active | ◉ (animated) | Cyan pulse | "APEX is working" |
| Degraded | ● | Amber | "Some features limited" |
| Offline | ● | Red | "No connection" |
| Stale | ↻ | Amber | "Data may be outdated" |

**Evaluation of current LIVE indicator:**

The current "LIVE" indicator in the topbar (hidden stubs `connDot`, `connLabel`) is conceptually correct but not implemented in a user-visible way. The new indicator replaces it:
- Position: topbar right, before any badge counts
- Size: 8px dot — unobtrusive but always readable
- On tap: expands to show last health check, WS state, API latency

**PlasmaOrb Evaluation (as system status indicator):**

The PlasmaOrb currently exists as:
- A WebGL canvas animation on the Command page
- A voice interaction trigger (tap to speak)
- A visual identity element ("APEX" label beneath it)

Assessment:
- As a decorative element: visually distinctive but competes with the chat-first command purpose
- As a voice trigger: functional but not globally accessible (requires Command page)
- As a system status indicator: not currently used this way; conceptually plausible
- As brand identity: the strongest case for retention

**Recommendation:** Retain the PlasmaOrb canvas as an ambient animation element on the Command page background — but remove it as the primary visual hierarchy element that competes with the chat interface. The voice trigger moves to the topbar (microphone icon). The orb becomes ambient, not interactive. This requires explicit authorisation before implementation.

---

## PART VI — RESPONSIVE EXPERIENCE

---

### Q. Desktop, Tablet, Mobile

#### Desktop Shell (≥1024px)

```
┌─ TOPBAR (52px) ─────────────────────────────────────────┐
│ APEX    [Page Title]    [Time]    [●] [🔔2] [🎤]         │
├─ SIDEBAR (220px fixed) ─┬─ CONTENT (flex) ──────────────┤
│                          │                               │
│  TODAY                   │  [Page content]               │
│  COMMAND                 │                               │
│  LIFE & WORK             │                               │
│  INTELLIGENCE            │                               │
│  ACTIONS  ●2             │                               │
│  SYSTEM                  │                               │
│                          │                               │
│  ─────────────────       │                               │
│  [⌘K Search]             │                               │
│                          │                               │
└──────────────────────────┴───────────────────────────────┘
```

- Sidebar: permanent, 220px, collapsible to 56px (icon-only) via toggle
- Content: full remaining width, max-width 1400px, centred on wide screens
- No bottom navigation
- Keyboard shortcuts primary navigation method

#### Tablet Shell (768–1023px)

```
┌─ TOPBAR (52px) ─────────────────────────────────────────┐
│ [☰]  APEX    [Page Title]    [Time]    [●] [🔔] [🎤]    │
├─────────────────────────────────────────────────────────┤
│  [Page content — full width, 2-column panels]           │
├─────────────────────────────────────────────────────────┤
│  TODAY  │  CMD  │  LIFE  │  INTEL  │  ACTIONS           │
└─────────────────────────────────────────────────────────┘
```

- Sidebar collapses to overlay (hamburger toggle)
- Bottom tab bar with 5 primary tabs (SYSTEM accessible via ···)
- 2-column panel layout where appropriate
- Touch targets: 44px minimum

#### Mobile Shell (≤767px)

```
┌─ TOPBAR (52px) ─────────────────────────────────────────┐
│  APEX    [Page Title]                    [●] [🔔] [🎤]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Page content — single column, swipeable]              │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [TODAY] [CMD]  [LIFE]  [INTEL] [ACTIONS]  [···]        │
└─────────────────────────────────────────────────────────┘
  safe-area padding-bottom
```

- No sidebar — bottom tab bar only
- Single column content
- Swipe left/right between primary tabs (with swipe hint dots visible)
- All detail surfaces open as bottom sheets (not page navigations)
- Voice trigger persistent in topbar

#### Mobile-Specific Interaction Patterns

| Pattern | Usage |
|---------|-------|
| Bottom sheet | Agent detail, approval detail, intelligence deep-dive |
| Swipe to dismiss | Notifications, action cards |
| Pull to refresh | Any data surface |
| Long press | Context menu on cards |
| Swipe between tabs | Primary navigation |
| Haptic feedback | Approval confirm, action complete |

#### What Moves to Sheets on Mobile

- Agent run detail → bottom sheet (50% → 90% snap points)
- Approval detail → bottom sheet (actionable from half-open state)
- Intelligence evidence → bottom sheet
- Memory detail → bottom sheet
- Knowledge item → bottom sheet
- All "View detail" links → bottom sheet

#### What Becomes Action-First on Mobile

Every mobile card has one visible primary action. Secondary actions in ··· menu.

| Card | Primary action | Secondary |
|------|---------------|-----------|
| Approval | [Approve] | View detail, Reject |
| Task | [Run] | Edit, Defer, Delete |
| Briefing | [Read brief] | Expand, Save, Act |
| Opportunity | [Explore] | Save, Dismiss |
| Memory | [View] | Correct, Pin |

---

## PART VII — VISUAL LANGUAGE

---

### R. Final APEX Visual Identity

#### Visual Direction

APEX Zero is the correct direction. These are its non-negotiable properties:
- Pure black canvas: `#000000` or `#03060f` (very near-black)
- Cyan primary signal: `#00d4ff`
- Inter as the primary reading typeface
- Controlled density — information richness through hierarchy, not clutter
- Motion that communicates state, not decoration

The animated dot grid (`radial-gradient` 28px pattern, `apex-grid-drift` animation) is retained. It is a distinctive APEX identity element that adds depth without visual noise.

#### Token Namespace Resolution

The dual-namespace problem (v11 indigo tokens + APEX Zero cyan tokens) must be resolved before any V-11 CSS is written:

**Resolution:**
1. APEX Zero tokens (`--apex-color-*`) become the single canonical namespace
2. All `--primary`, `--border`, `--primary-dim` v11 tokens are deprecated (aliased to APEX Zero values)
3. The Phase F correction block is rolled into the main token definitions
4. The `background-image: radial-gradient(...rgba(94,106,210,...))` dot grid is updated to cyan

**Canonical token set (authoritative):**

```css
/* Primary canvas */
--apex-bg:              #000000;
--apex-bg-raised:       #03060f;
--apex-surface:         rgba(255,255,255,0.04);
--apex-surface-2:       rgba(0,212,255,0.05);

/* Signal / accent */
--apex-cyan:            #00d4ff;
--apex-cyan-dim:        rgba(0,212,255,0.16);
--apex-cyan-glow:       rgba(0,212,255,0.40);
--apex-blue:            #0066ff;
--apex-violet:          #7b2fff;

/* Status */
--apex-success:         #10b981;
--apex-warning:         #f59e0b;
--apex-danger:          #ef4444;
--apex-info:            #00d4ff;

/* Text */
--apex-text:            #e8f4ff;
--apex-text-2:          rgba(232,244,255,0.70);
--apex-text-muted:      rgba(232,244,255,0.45);
--apex-text-dim:        rgba(232,244,255,0.25);

/* Border */
--apex-border:          rgba(0,212,255,0.16);
--apex-border-dim:      rgba(0,212,255,0.08);
--apex-border-bright:   rgba(0,212,255,0.35);
```

#### Typography

Three typefaces, with strict domain assignments:

| Typeface | Role | Usage |
|----------|------|-------|
| **Cinzel** | Brand identity only | APEX wordmark in topbar; section headers in ceremonial contexts |
| **JetBrains Mono** | System/technical context | System page, Memory IDs, cost values, timestamps in system contexts, L4 detail |
| **Inter** | All human-facing content | ALL domain pages (health, finance, comms, uni, personal), command thread, intelligence briefing, approval cards, notifications |

**Rule:** JetBrains Mono is never the primary typeface on health, finance, business, communications, or personal pages. These are human domains, not technical consoles.

#### Spacing System

```
4px   — micro gap (between related elements)
8px   — small gap (within components)
12px  — base gap (between component sections)
16px  — medium gap (between cards)
24px  — large gap (between page sections)
32px  — section gap (between major groups)
48px  — page margin (desktop sides)
```

#### Component Radius

- Cards/panels: 12px
- Buttons: 8px
- Small chips/badges: 6px
- Full-radius: 50% (dots, avatars)
- Large sheets: 16px top radius only

#### Colour Usage Rules

- Cyan (`#00d4ff`) for: primary actions, active state, key signals, WS connected, links
- Blue (`#0066ff`) for: secondary actions, CTA backgrounds
- Violet (`#7b2fff`) for: AI/intelligence context, memory, knowledge
- Green (`#10b981`) for: success, health positive, completed
- Amber (`#f59e0b`) for: warnings, stale data, caution, pending
- Red (`#ef4444`) for: errors, failures, destructive actions, danger
- White text hierarchy: `#e8f4ff` → `70%` → `45%` → `25%`

---

### S. Motion / Transitions

#### Where Animation Adds Meaning

| Event | Animation | Duration | Reason |
|-------|-----------|----------|--------|
| Page/tab switch | Fade + subtle Y translate | 220ms | Context change |
| Card expand (L0→L1) | Height expand + fade | 250ms | Disclosure |
| Evidence panel open | Slide up | 200ms | Depth |
| Approval success | Scale + green flash | 300ms | Confirmation |
| Rejection | Brief red flash | 200ms | Negative action |
| Loading skeleton | Shimmer (CSS) | Continuous | Status |
| Notification arrive | Slide in from right | 200ms | Attention |
| Toast dismiss | Fade out | 150ms | Completion |
| Voice listening | Waveform pulse | Continuous | Live state |
| Voice processing | Rotating dots | Continuous | Working |
| Agent working | Progress pulse | Continuous | Long operation |
| System alert | Amber glow | 400ms | Attention draw |
| WS reconnect | Green pulse on indicator | 300ms | Status change |

#### Where Animation Is Explicitly Prohibited

- Data loading (data appears instantly when ready — no entrance animation on data)
- Approval card content (clarity over animation)
- Error states (error must read immediately)
- Navigation to ACTIONS from approval notification (speed matters)
- Anything triggered more than once per 3 seconds

#### Reduced Motion

All animations respect `prefers-reduced-motion: reduce`. Under reduced motion:
- All transitions: `0ms`
- Skeleton shimmer: static background pattern (no animation)
- Waveform: static bars
- Dot grid: static (no drift)

---

## PART VIII — ADVANCED EXPERIENCE DESIGN

---

### T. Personalisation

#### Stable Preferences (user-set, persistent)

- Light/dark mode toggle (dark is default and primary)
- Notification frequency per category
- Default landing destination (default: TODAY)
- Domain ordering within LIFE & WORK
- TTS voice preference
- Autonomy level (1–5, existing system)

#### Contextual Adaptation (automatic, session-level)

- Command suggestions based on time of day (morning → "What's my brief?"; evening → "Log the day")
- TODAY content ordering based on user interaction patterns
- Stale threshold adapts to how often user refreshes

#### Behavioural Adaptation (learned over time, from memory system)

- Notification timing (APEX learns when user is most responsive)
- Domain panel ordering within LIFE & WORK (most-visited tab appears first)
- Suggestion vocabulary adapts to user's language patterns

#### Personalisation Boundaries

Personalisation must not:
- Change the canonical disclosure model (L0→L4 always applies)
- Reorder the primary 6 navigation destinations
- Suppress security-relevant information (approvals, errors)
- Introduce visual inconsistency (personalisation cannot override the design system)

---

### U. Search / Command Palette (Cmd+K)

#### Scope

The command palette searches:

| Category | What's searched | Ranking factor |
|----------|----------------|----------------|
| Pages/destinations | All 6 primary + secondary destinations | Recency |
| Commands | "Check emails", "Log workout", "Run research" | Frequency |
| Knowledge | Semantic facts | Relevance to query |
| Memory | Recent episodes | Recency |
| Tasks | Active and recent tasks | Status priority |
| People | Contacts | Name match |
| Messages | Recent email subjects | Date |

#### Palette Design

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
│  › TODAY                                               │
│  › COMMAND                                             │
│  › ACTIONS                                             │
│                                                        │
│  TYPE TO SEARCH ALL OF APEX…                           │
└────────────────────────────────────────────────────────┘
```

#### Keyboard Navigation

- `↑↓`: Navigate results
- `Enter`: Select
- `Escape`: Close
- `Tab`: Switch category
- First character of result: Jump to result (if unique)

---

### V. Cross-System Coherence

The user must be able to move through the complete APEX action cycle without losing context:

```
TODAY (sees briefing headline)
  → tap "Read full brief" 
    → INTELLIGENCE (briefing at L1)
      → tap "Show evidence"
        → L2 evidence panel (inline)
          → tap "Act on this"
            → COMMAND (pre-loaded with opportunity context)
              → user says "Research this further"
                → research result card in COMMAND
                  → user says "Create a task to follow up"
                    → task created → approval card in COMMAND
                      → user taps "Approve"
                        → task executes → result in COMMAND
                          → result also appears in ACTIONS log
                            → episode stored in INTELLIGENCE → Memory
                              → next day: TODAY surface shows "APEX acted on the AI compliance opportunity"
```

At every step:
- No full page navigation required to go deeper (only expand/sheet)
- Context carries forward (each step knows why the user is there)
- Back navigation returns to the exact previous state (not the page root)
- The full trace is retrievable from INTELLIGENCE → Memory

---

## PART IX — DATA CONTRACT

---

### W. Data Contract / API Requirements

#### Existing APIs That Are Ready

| Surface | API | Status | Notes |
|---------|-----|--------|-------|
| TODAY brief | `GET /api/intelligence/briefing` | ✅ | 6h cache — fast |
| TODAY priority inbox | `GET /api/briefing/priority-inbox` | ✅ | Works at /api/ prefix |
| TODAY vitals | `GET /api/overview/vitals` | ✅ | — |
| TODAY approvals (tasks) | `GET /api/tasks` | ✅ | Pending tasks from response |
| COMMAND chat | `POST /chat` | ✅ | Multi-intent, tool-capable |
| COMMAND voice | `POST /api/voice/pipeline` | ✅ | — |
| ACTIONS tasks | `GET /api/tasks` | ✅ | — |
| ACTIONS approve | `POST /api/tasks/approve` | ✅ | — |
| ACTIONS reject | `POST /api/tasks/reject` | ✅ | — |
| ACTIONS agent runs | `GET /api/intelligence/agent-runs` | ✅ | — |
| ACTIONS standing approvals | `GET /api/tasks/standing-approvals` | ✅ | — |
| INTELLIGENCE briefing deep | `GET /api/intelligence/briefing` | ✅ | — |
| INTELLIGENCE memory | `GET /api/memory/episodic/recent` | ✅ | — |
| INTELLIGENCE knowledge | `GET /api/memory/semantic/search` | ✅ | — |
| INTELLIGENCE lessons | `GET /intelligence/lessons` | ✅ | — |
| INTELLIGENCE cost | `GET /api/intelligence/cost-summary` | ✅ | — |
| INTELLIGENCE health | `GET /api/intelligence/health` | ✅ | — |
| LIFE Finance | `GET /api/finance/summary` | ✅ | Empty data — not a route bug |
| LIFE Health | `GET /api/health/sleep` etc. | ✅ | 15 API calls — needs optimisation |
| LIFE Comms | `GET /api/communications/emails` | ✅ | — |
| LIFE University | `GET /api/life/university/modules` | ✅ | — |
| LIFE Journal | `GET /api/life/journal/entries` | ✅ | — |
| SYSTEM health | `GET /health` | ✅ | — |
| SYSTEM queue | `GET /api/system/queue` | ✅ | — |
| SYSTEM agents | `GET /api/agents` | ✅ | — |

#### APIs That Need Schema Fixes

| API | Issue | Required fix |
|-----|-------|-------------|
| `GET /api/intelligence/opportunities` | `evidence_refs` column missing | `ALTER TABLE opportunities ADD COLUMN evidence_refs jsonb` |

#### APIs That Need New Aggregation Endpoints

| New endpoint | Purpose | Source data |
|-------------|---------|------------|
| `GET /api/now/summary` | Single call for TODAY surface | Aggregates: briefing, priority-inbox, vitals, pending approvals, recent agent runs |
| `GET /api/domains/health/summary` | Health domain L0 one-liner | Aggregates: sleep, workout, nutrition for today |
| `GET /api/intelligence/memory-summary` | Memory in human language | Aggregates: episodic/recent, semantic/top, lessons |
| `GET /api/actions/summary` | ACTIONS badge count | Aggregates: pending tasks, pending approvals |

#### APIs That Need Response Shape Changes

| API | Current response | Required addition |
|-----|-----------------|------------------|
| `/api/intelligence/agent-runs` | `{task_id, objective, success, cost_usd}` | Add `human_description`, `step_count` |
| `/api/tasks` | `{pending:[], inProgress:[], completed:[]}` | Add `priority`, `reason` (why agent created it) |
| `/api/memory/episodic/recent` | Raw memory records | Add `human_summary` field per record |

#### Performance Budget

| Surface | API budget | Max requests | Max total wait |
|---------|-----------|-------------|---------------|
| TODAY shell | 1 aggregated call | 1 | <800ms |
| COMMAND (chat) | Per message | 1 + tool calls | — |
| LIFE Health tab | Parallel fetches | Max 5 | <1,200ms |
| LIFE Finance tab | 1 call | 1 | <500ms |
| INTELLIGENCE | Parallel fetches | Max 4 | <1,500ms |
| ACTIONS | 2 calls | 2 | <800ms |
| SYSTEM | Parallel fetches | Max 6 | <2,000ms |

---

## PART X — PERFORMANCE

---

### X. Performance Architecture

#### Preserving V-06 → V-09 Gains

The V-11 redesign must not reintroduce:

| Anti-pattern | V-09 fix | V-11 rule |
|-------------|---------|----------|
| Eager domain loading | Deferred to first navigation | Domain tabs load on first tab activation |
| Duplicate boot requests | TTL cache + dedup | Maintained — all new panels use `cachedFetch` |
| Synchronous heavy JS | PlasmaOrb dynamic injection | All new components: dynamic load post-DCL |
| Unnecessary polling | Interval deferred + TTL | New surfaces: event-driven where possible |
| Render-blocking assets | Chart.js deferred | All new third-party scripts: `defer` |
| Heavy navigation API calls | Occult (21), Reality (16), Health (15) | Lazy-load on tab activate, max 5 calls per tab |

#### Performance Budgets (V-11 targets, not regression from V-09)

| Metric | V-09 certified | V-11 maximum |
|--------|---------------|-------------|
| TTFB | 46ms | <80ms |
| FCP | 394ms | <500ms |
| DCL | 1,249ms | <1,500ms |
| Boot requests (10s) | 35 | <30 (aggregation reduces this) |
| TODAY tab load | (not measured) | <800ms to first meaningful content |
| Navigation switch | (not measured) | <200ms perceived (instant shell, async data) |

#### Navigation Performance Model

Every destination switch must:
1. Show the shell immediately (<16ms)
2. Show skeleton content while data loads (<50ms)
3. Populate primary content (L0) within <1,200ms
4. Complete all secondary content within <3,000ms

Domain tabs within LIFE & WORK must deferred-load on first activation and then cache for subsequent visits within the session.

#### The NOW Aggregation Call

The most important performance optimization for V-11 is creating `GET /api/now/summary`. This replaces 4+ independent calls on boot:
- `/api/intelligence/briefing`
- `/api/briefing/priority-inbox`
- `/api/overview/vitals`
- `/api/tasks` (pending only)

One aggregated call returns everything TODAY needs. This call must be:
- Cacheable for 5 minutes
- Served from a lightweight server-side aggregator
- Populated from already-cached sub-responses where available

---

## PART XI — ACCESSIBILITY

---

### Y. Accessibility Requirements

#### Keyboard Navigation

- Every interactive element is keyboard-reachable
- Tab order follows visual order (no surprising jumps)
- Focus ring: visible, 2px cyan outline, offset 2px
- Skip-to-main link: existing implementation retained
- All dropdowns/sheets: Escape to close
- Command palette: full keyboard operation (↑↓, Enter, Escape, Tab)

#### Semantic Structure

- Each primary destination uses `<main role="main">` with appropriate landmark
- Navigation uses `<nav aria-label="Primary navigation">`
- Cards use `<article>` with descriptive `aria-label`
- Approval cards: `role="alertdialog"` when approval is pending
- Loading states: `aria-live="polite"` for content updates
- Error states: `aria-live="assertive"` for blocking errors

#### Colour and Contrast

- All text meets WCAG 2.1 AA contrast (4.5:1 for normal text, 3:1 for large)
- Status indicators never rely on colour alone (shape + colour + text)
- Confidence indicators: colour + shape + text label

#### Touch Targets

- Mobile: 44px minimum touch target for all interactive elements (existing `min-height: 44px` rule retained)
- Approval buttons: 48px minimum (higher-stakes action)
- Tab bar items: 56px height minimum

#### Screen Reader

- All icons have `aria-label` or are `aria-hidden="true"` with accompanying text
- Dynamic content updates announced via `aria-live`
- Progressive disclosure: expanded/collapsed state communicated via `aria-expanded`
- Voice state: `aria-live="assertive"` for voice status changes

#### Progressive Disclosure Accessibility

When L0 → L1 expansion occurs:
- Focus moves to expanded content
- `aria-expanded="true"` on the trigger element
- `aria-describedby` links trigger to expanded section
- Collapse returns focus to trigger

---

### Z. Security / Governance UX

#### Authentication Remains Unchanged

- Server-side `requireAuth` middleware: unchanged
- Client-side `apex_session` cookie check: unchanged
- Login overlay: unchanged
- Rate limiting: unchanged (but authentication error messages are now user-readable)

**Note:** The previous V-10 report flagged `/briefing/today` as 404. This was a testing artefact — the routes work at `/api/briefing/today`. No authentication changes are required.

#### Approval Boundaries

Every consequential agent action requires explicit approval unless:
- The action type is in the user's standing approvals list (existing mechanism)
- The autonomy level explicitly permits auto-execution (existing AUTONOMY_LEVEL system)

The approval UI makes these boundaries explicit:
- "This is automatic: you've approved this type of action before" (standing approval)
- "This needs your approval" (pending)
- "APEX can do this without asking you (Level 3 autonomy)" (when applicable)

#### Destructive Actions

Any action that deletes, modifies, or irreversibly affects data requires:
1. A "Destructive" label on the approval card
2. "This cannot be undone" if irreversible
3. The specific entity affected named explicitly (never "delete the file" — always "delete 'Project Proposal v3.pdf'")

#### No Accidental Exposure

V-11 must not:
- Expose APEX_ACCESS_KEY or JWT_SECRET in any client-rendered content
- Include API keys in error messages
- Surface internal route paths in user-facing error messages
- Render raw database error text (catch and translate to L0)

---

## PART XII — EXPERIENCE FLOWS

---

### Phase 3 — Concrete End-to-End Flows

#### Flow 1: Morning Review

```
USER OPENS APEX (07:30)

Shell renders: 50ms
  ↓
Skeleton TODAY: 50ms
  ↓
Brief loads: 800ms (cached)
  Visual: "AI Privacy-Compliance opportunity is highest priority. 
           First-mover window is open."
  ↓
Needs You: 1,100ms
  Visual: Two cards: "Approve: calendar event" + "Assignment due 2 days"
  ↓
Since Last Visit: 1,400ms
  Visual: "APEX completed research · Finance summary checked · No new emails"
  ↓

USER READS: 45 seconds
  
USER TAPS: Approval card "Create calendar event — James"
  Sheet slides up: 200ms
  Shows: James Anderson · Thursday 14:00 · Cost £0.00 · Reversible
  
USER TAPS: [Approve]
  Animation: Approval card → green flash → dismissed
  Undo banner: "Done — Undo?" fades after 8s
  
USER TAPS: [Read full brief]
  Navigates: INTELLIGENCE
  Full briefing renders with L0 → L1 visible immediately
```

#### Flow 2: "What matters today?"

```
USER: types "What matters today?" in COMMAND input

APEX processes: 2-3s
  Response: Structured brief card
  L0: "3 priorities for today:
       1. Review AI compliance opportunity (new intelligence)
       2. University assignment due in 2 days
       3. Weekly finance review (last done 8 days ago)"
  Actions: [Explore opportunity] [View assignment] [Check finance]

USER TAPS: [Explore opportunity]
  INTELLIGENCE destination activates
  Opportunity card shows at L0 → L1 visible
```

#### Flow 3: APEX Identifies an Issue

```
APEX (automated, background):
  Opportunity score crosses threshold (58 > user preference 50)
  
APEX response:
  Notification badge: +1
  TODAY surface: new card appears in "NEEDS YOU"
  Card: "New opportunity: AI Privacy-Compliance · Score 58 · High confidence"
  
USER SEES: On next APEX open
  TODAY shows the card at top of "Needs You"
  
USER TAPS: Card
  L1 expands inline:
  "AI Privacy-Compliance automation for content creators
   First-mover market · 8-14 month window · Est. TAM £340M"
  Actions: [Explore] [Research more] [Dismiss]
```

#### Flow 4: "Why does this matter?"

```
USER: taps "Explore" on opportunity card
  INTELLIGENCE shows: Opportunity at L1
  
USER: taps "Why does this matter?"  
  L1 context:
  "Because you've identified 'AI for businesses' as your primary
   empire-building objective. This opportunity scores highest on
   timing, moat, and relevance to your stated goals."
  
USER: taps "Show evidence"
  L2 panel slides up (bottom sheet on mobile):
  - Source: TechCrunch article (2 days ago)
  - Source: GDPR enforcement report (1 week ago)  
  - Source: Competitor analysis APEX ran (3 days ago)
  - Confidence: 0.76 (Good)
```

#### Flow 5: Expanding Evidence

```
USER: taps source "GDPR enforcement report"
  Sheet deepens:
  Full article summary
  Key relevant excerpts highlighted
  "APEX used this because: it demonstrates regulatory tailwind"
  [Read full article →]
  
USER: taps "Read full article"
  Browser opens (external link)
```

#### Flow 6: "Ask APEX to act"

```
USER: taps "Research more" on opportunity
  COMMAND pre-loaded with context:
  "[Research AI Privacy-Compliance opportunity — building on previous findings]"
  
  Or user says: "Research this market further and create a brief"
  
APEX: "Researching… 15-30 seconds"
  Progress indicator in thread: "Step 2 of 5: Reading GDPR enforcement data"
  
APEX completes:
  Research result card appears in thread
  L0: "AI Privacy-Compliance: Full market brief ready"
  L1: [expanded automatically] 5 key findings, 7 sources, high confidence
  Actions: [Save to Knowledge] [Create task] [Share]
```

#### Flow 7: APEX Requires Approval

```
USER: "Create a task to reach out to 5 content creators for market validation"

APEX: evaluates → requires approval (external communications planned)

Thread response:
┌─────────────────────────────────────────────────────┐
│ I've planned this task. It needs your approval       │
│ before I start.                                      │
│                                                      │
│ TASK: Market Validation Outreach                     │
│ Steps: Draft 5 outreach emails + schedule send       │
│ Cost: ~£0.45 (research + drafting)                   │
│ Risk: Low — no sending without your review           │
│ Reversible: Yes — you'll review drafts first         │
│                                                      │
│ [Approve]      [View full plan]     [Reject]         │
└─────────────────────────────────────────────────────┘
```

#### Flow 8: User Approves

```
USER: taps [Approve]

Thread:
"Starting the task. I'll have drafts ready for your review."

ACTIONS badge: +1 (In Progress)

After completion (async):
TODAY surface: "APEX drafted 5 outreach emails — ready to review"
ACTIONS: Task card with "Review drafts" as primary action
Notification badge: +1
```

#### Flow 9: Watching the Result

```
USER: navigates to ACTIONS

Task card: "Market Validation Outreach"
Status: Completed ✓
"5 email drafts ready · Cost: £0.43 · 4 steps taken"

[Review drafts]  [View detail]  [Mark done]

USER: taps [View detail]
  Bottom sheet (mobile) / inline expand (desktop)
  Step trace:
  1. ✓ Researched 5 relevant content creators (1.2s)
  2. ✓ Drafted email for Creator 1 — Sarah Chen
  3. ✓ Drafted email for Creator 2 — Marcus Webb
  4. ✓ Drafted email for Creator 3 — Priya Nair
  5. ✓ Saved all 5 drafts to workspace (0.3s)
  
  Total cost: £0.43 · Total time: 48s
```

#### Flow 10: APEX Records the Outcome

```
AUTOMATIC (after user marks done):

Episode stored: "Market validation outreach drafted — 5 emails"
Knowledge fact: "User approved external outreach tasks with review step"
Lesson: "Include draft review step in all outreach tasks"

Next time user creates similar task:
APEX automatically includes review step
"Based on your preference, I've included a draft review step"
```

#### Flow 11: Return Visit — Understanding What Happened

```
USER OPENS APEX (evening)

TODAY: "Since last visit (9h ago)"
  ✓ Market validation drafts ready · [Review]
  ✓ Research completed · £0.43
  ✓ University: no deadline actions needed

USER TAPS: "Research completed"
  → INTELLIGENCE → Memory
  Episode card: "AI Privacy-Compliance research"
  L0: "Completed at 14:02 · High confidence · 7 sources"
  L1: Key findings summary
  L2: Sources with links
  L3: 12-step execution trace
```

#### Flow 12: Something Fails

```
APEX attempts task → API service unavailable

Thread response (if user is watching):
"I couldn't complete the research — the search service is temporarily 
unavailable. I've queued it to retry in 10 minutes.
[Cancel retry]  [Try now]  [Use different method]"

If user is NOT watching:
TODAY surface adds: 
"⚠ Research paused — service unavailable. Retry in 8 minutes. [Cancel]"

After retry succeeds:
"Research completed ✓" replaces the warning
```

#### Flow 13: No Relevant Information

```
USER OPENS APEX — no priorities, no alerts, no approvals

TODAY shows:
"TODAY IS CLEAR
 No urgent items, pending approvals, or intelligence alerts.
 
 APEX has been active since your last visit:
 · 3 automated tasks completed
 · Weekly finance check: all within budget
 · Health: targets met yesterday
 
 What would you like to do? [Command]"
```

#### Flow 14: Stale Information

```
User opens APEX after 72 hours offline

TODAY shows:
"Last updated 3 days ago  [Refresh all]
 
 BRIEF  (3 days old)
 ↻ AI Privacy-Compliance opportunity — verify if still current
 [Refresh brief]
 
 STALE DATA — these may have changed:
 · Finance: last checked 3 days ago
 · Emails: last synced 3 days ago"
```

#### Flow 15: Conflicting Information

```
INTELLIGENCE shows:
"AI Privacy-Compliance — score 58 (High confidence)"

But memory shows an older fact:
"AI compliance market is saturated — confidence 0.31 (3 months ago)"

APEX surface:
"Note: An older analysis suggested this market was saturated (3 months ago, 
Low confidence). Current brief rates this opportunity highly based on more 
recent data. [See full comparison]"
```

#### Flow 16: User Corrects APEX

```
INTELLIGENCE shows: "User prefers evening study sessions"

USER: "That's wrong — I study in the morning now"

COMMAND processes:
"Got it. I'll update that. Your study preference is now: morning."

APEX creates contradiction fact:
Old: "User prefers evening study sessions" — CONTRADICTED
New: "User prefers morning study sessions" — confidence 1.0 (user-stated)

Lesson created: "User explicitly corrected study time preference"
```

#### Flow 17: "What does APEX remember?"

```
USER (in COMMAND): "What do you remember about my health?"

APEX: Research result card:
"From your health history:
 · Sleep average: 6.8h over last 14 days (target: 7.5h)
 · 5 workouts logged this month
 · No nutrition data since August 20th
 
 Confidence: High (based on 26 logged entries)
 [View all health memory]"
```

#### Flow 18: "What does APEX know about a topic?"

```
USER: "What do you know about AI compliance regulations?"

APEX: Knowledge result card:
"I have 23 facts about AI compliance:
 · GDPR enforcement: increasing (High confidence, 1 week old)
 · EU AI Act: implementation timeline updated (Good confidence, 2 days old)
 · UK equivalent: in consultation phase (Medium confidence, 3 weeks old)
 
 Gaps: No information on US state-level regulations
 [Expand knowledge]  [Research gaps]"
```

#### Flow 19: Proactive Communication

```
APEX (automated, 09:15):
Briefing generated → opportunity score exceeds threshold

APEX action:
TODAY surface updated with brief card
Notification badge: +1
(If PWA push enabled) Push notification: "Your morning brief is ready"

USER RECEIVES: Push
Opens APEX → TODAY shows brief immediately (pre-loaded via cache)
```

#### Flow 20: Mobile Voice Session

```
USER (on phone, on the go):

Taps microphone button in bottom tab bar

Full-screen listening state:
[APEX waveform / listening animation]
"Listening..."

USER SPEAKS: "What's on my calendar today?"

Processing: 2s

APEX speaks (TTS) + text appears:
"You have one event today — James Anderson at 3pm. No other calendar items."

USER SPEAKS: "Create a reminder to prepare for that"

APEX: "Creating reminder for 2pm: Prepare for James meeting"
[Approval card slides up]
"Approve?" [Approve] [Change]

USER TAPS: [Approve]

APEX speaks: "Done. Reminder set for 2pm."

User puts phone away
```

---

## PART XIII — INFORMATION ARCHITECTURE MATRIX

---

### Phase 4 — Canonical IA Matrix

| Surface | User question | Primary info (L0) | Secondary info (L1) | Evidence (L2) | Reasoning (L3) | Primary action | Secondary actions | Data source | Loading | Empty | Error |
|---------|--------------|-------------------|---------------------|--------------|----------------|----------------|------------------|------------|---------|-------|-------|
| TODAY Brief | "What's the headline?" | 1-sentence briefing | Full briefing text | Sources used | APEX reasoning chain | Read full brief | Act on this, Dismiss | `/api/intelligence/briefing` | Skeleton card | "No brief generated yet — [Generate]" | "Brief unavailable — last brief was [date]" |
| TODAY Needs You | "What requires me?" | Count + top item | All items in order | Per-item evidence | — | Approve / View / Act | Defer, Dismiss | `/api/briefing/priority-inbox` + `/api/tasks` | Skeleton list | "Today is clear — nothing needs you" | "Couldn't load actions — [Retry]" |
| TODAY Since Last | "What happened?" | Agent count + time | Itemised list | Per-action detail | — | View details | — | `/api/intelligence/agent-runs` | Skeleton | "No APEX activity since last visit" | "Activity unavailable" |
| TODAY Health | "Am I on track?" | Sleep/workout/nutrition one-liner | Per-metric detail | Log entries | — | View health | Log entry | `/api/domains/health/summary` | Skeleton | "No health data today — [Log entry]" | "Health data unavailable" |
| COMMAND Thread | "APEX, do this" | User message + APEX response | Structured result card | Sources/evidence | Step trace | Primary action on result card | Save, Share, Follow up | `POST /chat` | Thinking indicator | "Start a conversation" empty state | "Couldn't connect — [Retry]" |
| COMMAND Approval | "Do I approve this?" | What + why + cost + risk | Full plan detail | Evidence for action | Step-by-step plan | Approve | View detail, Reject | From task queue | — | — | — |
| INTELLIGENCE Brief | "What does APEX know?" | Headline + score | Full brief | Sources | Reasoning chain | Act on this | Research more, Save, Share | `/api/intelligence/briefing` | Skeleton | "Brief generating… check back in a moment" | Stale brief with indicator |
| INTELLIGENCE Opportunities | "What opportunities exist?" | Opportunity name + score + confidence | Description + why now | Evidence sources | Scoring rationale | Explore | Research more, Dismiss | `/api/intelligence/opportunities` | Skeleton grid | "No opportunities identified — APEX is monitoring" | Schema defect: "Analysis unavailable — [Status]" |
| INTELLIGENCE Memory | "What does APEX remember?" | Count + recent highlights | Itemised memories | Source of each memory | — | Search memory | View all | `/api/memory/episodic/recent` | Skeleton | "No memories yet — memories build over time" | "Memory unavailable" |
| INTELLIGENCE Knowledge | "What does APEX know?" | Domain coverage | Per-domain facts + gaps | Individual facts | — | Search | Research gaps | `/api/memory/semantic/search` | Skeleton | "Building knowledge — grows with usage" | "Knowledge unavailable" |
| ACTIONS Task | "What's in my queue?" | Task name + status | Description + next step | Why created | Agent reasoning | Run / Review / Approve | Edit, Defer, Delete | `/api/tasks` | Skeleton list | "Task queue is clear" | "Tasks unavailable — [Retry]" |
| ACTIONS Approval | "What needs my approval?" | Item + cost + risk | Full detail | Evidence | Plan | Approve | View, Reject, Ask APEX | `/api/tasks` (pending only) | Skeleton | "No pending approvals" | "Approvals unavailable — [Retry]" |
| ACTIONS Log | "What did APEX do?" | Recent actions list (human) | Per-action detail | Cost + outcome | Step trace | View detail | Undo (if reversible) | `/api/intelligence/agent-runs` | Skeleton | "No activity yet" | "Log unavailable" |
| LIFE Health | "How is my health?" | Key metrics (sleep, workout, nutrition) | Per-metric trend | Log data | — | Log entry | View history | `/api/health/sleep` etc. (parallel, max 5) | Skeleton cards | "Start tracking your health — [Log first entry]" | "Health data unavailable — [Retry]" |
| LIFE Finance | "How is my money?" | Month summary (income/expense/net) | Category breakdown | Transactions | — | Log expense | View history, Set budget | `/api/finance/summary` | Skeleton | "No transactions yet — [Log transaction]" | "Finance unavailable — [Retry]" |
| LIFE Business | "How is the business?" | CRM + project summary | Pipeline details | Client details | — | Add client / Create project | View all | `/api/operations/clients` + `/api/operations/projects` | Skeleton | "No business data — [Add first client]" | "Business data unavailable" |
| LIFE Communications | "What's in my inbox?" | Unread count + top item | Email list | Per-email detail | — | Reply / Archive | View all | `/api/communications/emails` | Skeleton | "Inbox is clear" | "Email unavailable" |
| LIFE University | "What's due?" | Assignments due + modules | Per-module detail | Assignment detail | — | Mark complete | View all | `/api/life/university/assignments` | Skeleton | "No upcoming deadlines" | "University data unavailable" |
| SYSTEM Health | "Is APEX healthy?" | Status indicator (●/◕/○) | Per-component status | API response times | — | — | View deep diagnostics | `GET /health` + `/api/system/health/detailed` | Skeleton | — | "System unavailable — contact support" |
| SYSTEM Agents | "What agents exist?" | Agent count + active count | Agent roster | Per-agent detail | — | Invoke agent | — | `/api/agents` | Skeleton | "No agents configured" | "Agent list unavailable" |
| SYSTEM Cost | "What did APEX cost?" | Today/week/month summary | Per-run breakdown | Individual runs | — | — | Export | `/api/intelligence/cost-summary` | Skeleton | "No cost data yet" | "Cost data unavailable" |

---

## PART XIV — IMPLEMENTATION PROGRAMME

---

### Phase 5 — V-11 Implementation Roadmap

Each phase is a safe, testable, rollback-capable unit. No phase begins without explicit authorisation from the prior phase's review.

---

#### PHASE V-11-A: Token Unification + Shell Foundation

**Objective:** Single CSS token namespace; shell structure; no visual regressions  
**User value:** Consistent visual language; groundwork for all subsequent phases  
**Files affected:** `public/dashboard.html` (CSS section), `public/apex-zero.css`  
**Dependencies:** None  
**Scope:**
- Deprecate v11 indigo tokens → alias all to APEX Zero cyan equivalents
- Update dot grid animation to use `--apex-border` (cyan) not hardcoded indigo
- Roll Phase F corrections into main token definitions
- No structural HTML changes

**Acceptance criteria:**
- All pages render identically or better (no visual regressions)
- `grep -c "5e6ad2\|#5e6a\|94,106,210" dashboard.html` returns 0 (or only in comments)
- Single `:root` block defines all tokens
- Playwright: no overflow at any viewport; no console errors

**Rollback:** Revert CSS block — no functional impact

---

#### PHASE V-11-B: State System Implementation

**Objective:** All panels distinguishably handle: loading, empty, error, stale, partial  
**User value:** Eliminates blank panels; users always know system state  
**Files affected:** `public/dashboard.html`  
**Dependencies:** V-11-A (uses canonical tokens)  
**Scope:**
- Standardise loading: every panel uses `skel` skeleton animation (class already exists)
- Standardise empty: every domain panel has an empty state with onboarding CTA
- Standardise error: every panel has `panel-error` pattern (class already exists) with human text
- Standardise stale: panels with TTL data show amber `↻ [time ago]` in header
- Finance empty state: "No transactions logged — [Log transaction] or [Import CSV]"
- Health empty state: "No health data today — [Log workout] [Log sleep]"

**Acceptance criteria:**
- Finance page with empty data shows helpful onboarding, not blank panel
- Playwright: trigger each error state (disconnect network); verify non-blank rendering
- Each state visually distinct (screenshot comparison)

**Rollback:** Revert affected panel HTML blocks

---

#### PHASE V-11-C: Briefing Route Fix + NOW Surface (Alpha)

**Objective:** Fix `/api/briefing/today` prefix issue; create initial NOW surface  
**User value:** First usable "What matters today" surface  
**Files affected:** `public/dashboard.html` (new `page-now` section), `server.js` or `routes/briefing.js`  
**Dependencies:** V-11-B  
**Note:** The briefing routes ARE mounted at `/api/briefing/today` — the dashboard.html JS may be calling without the `/api` prefix. This is a 1-line fix in the client JS.  
**Scope:**
- Fix client-side briefing fetch to use `/api/briefing/today`
- Create `page-now` HTML section with: brief card, needs-you list, since-last-visit list
- Register in `switchPage` system as `'now'`
- Set as default page on boot (replaces `command` as default)
- Load from: `/api/intelligence/briefing` + `/api/briefing/priority-inbox` + `/api/overview/vitals`
- L0 brief headline displayed immediately from cached response

**Acceptance criteria:**
- `switchPage('now')` renders meaningful content
- Brief card shows headline text
- Empty TODAY state ("today is clear") renders cleanly
- Playwright: NOW page loads, no blank panels, no console errors
- Boot: NOW as default visible page, Command accessible via navigation

**Rollback:** Restore `command` as default; remove `page-now` section

---

#### PHASE V-11-D: Navigation Architecture Reduction

**Objective:** Reduce primary nav from 20 to 6 destinations; introduce secondary access  
**User value:** Dramatically reduced cognitive load; clearer mental model  
**Files affected:** `public/dashboard.html` (nav HTML, `pages` array in switchPage, mobile nav dropdown)  
**Dependencies:** V-11-C (NOW must exist before it can be primary)  
**Scope:**
- Create 6-tab navigation: NOW · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM
- Internal destination names: `now`, `command`, `domains`, `intelligence`, `actions`, `system`
- Secondary destinations (occult, reality, governance, civilisation, master, activity, memory) accessible from SYSTEM sub-navigation
- Mobile bottom tab bar: 5 tabs + ··· (SYSTEM in overflow)
- Desktop sidebar: 6 items + ··· for advanced
- Keyboard shortcuts updated (1–6 for primary tabs)
- Swipe navigation: primary tabs only (not secondary)
- `pageMeta` updated with new destination titles/subtitles

**Acceptance criteria:**
- All 6 destinations accessible via nav
- All previously-accessible pages still reachable (via secondary nav or SYSTEM)
- Keyboard shortcuts 1–6 work
- Swipe between primary tabs works
- Mobile bottom tab bar renders at <768px
- `window.switchPage('command')` and all existing internal calls continue to work

**Rollback:** Restore 20-item nav; restore old `pages` array

---

#### PHASE V-11-E: Command Page Rebuild

**Objective:** Consolidate Command to conversational AI surface only  
**User value:** Clear primary purpose; conversation history; better AI interaction  
**Files affected:** `public/dashboard.html` (page-command section)  
**Dependencies:** V-11-D  
**Scope:**
- Remove Constitution Charter from primary Command view (move to SYSTEM → Governance)
- Remove 3-column `cmd-split` layout — replace with single-column conversation thread
- Retain: chat input, voice button, PlasmaOrb (as ambient background, not primary UI element)
- Add: persistent conversation history (store in localStorage or server-side session)
- Add: streaming response indicator (animated dots during AI thinking)
- Add: structured result cards (research, task created, approval needed)
- Command suggestions ("What's my brief?", "Check emails", "Log a workout") below input
- Bottom stat strip (`cmdStrip`) moved to TODAY surface

**Acceptance criteria:**
- Chat input is the dominant visual element
- Chat history persists within session
- "APEX is thinking…" state visible during API call
- Approval card renders inline in thread when action requires approval
- No constitution visible in default view
- Playwright: send test message, verify response renders

**Rollback:** Restore `cmd-split` layout; re-add constitution block

---

#### PHASE V-11-F: ACTIONS Destination

**Objective:** Unified actions/approvals/task management surface  
**User value:** Single place for all decisions and approvals  
**Files affected:** `public/dashboard.html`  
**Dependencies:** V-11-D  
**Scope:**
- `page-actions` renders: pending approvals (primary), task queue, agent run log (human-readable)
- Approval cards: what/why/cost/risk/reversibility (full approval design)
- Task cards: title, status, primary action
- Agent log: human descriptions, not task IDs
- Undo banner: 30s window after any approved/completed action
- Keyboard shortcut A maps to ACTIONS destination

**Acceptance criteria:**
- Pending approvals render with full detail
- Approve/reject works
- Agent log renders in human language (no raw task IDs)
- Keyboard A navigates to ACTIONS
- Undo banner appears after approve action, auto-dismisses after 30s

**Rollback:** Restore old tasks/approvals pages; remap keyboard A

---

#### PHASE V-11-G: INTELLIGENCE Destination

**Objective:** Unified intelligence surface: briefing + opportunities + memory + knowledge  
**User value:** Single place to understand what APEX knows and finds  
**Files affected:** `public/dashboard.html`  
**Dependencies:** V-11-D; V-11-C (briefing fix)  
**Scope:**
- `page-intelligence` with sub-sections: Briefing · Opportunities · Memory · Knowledge · Lessons
- Briefing at L0→L2 (expandable inline)
- Opportunities list (requires DB schema fix — show "Analysis unavailable" with clear status until fixed)
- Memory summary in human language
- Knowledge coverage (domain bars, gap list)
- Lessons in plain language

**Acceptance criteria:**
- Briefing section shows headline + expandable full brief
- Opportunities section shows graceful "unavailable" state (not 500 error)
- Memory section shows episode count + recent highlights (human language)
- Knowledge section shows domain coverage bars
- All sub-sections load independently (parallel fetches)

**Rollback:** Restore old intelligence/memory/knowledge pages

---

#### PHASE V-11-H: LIFE & WORK Domain Consolidation

**Objective:** All personal/professional domains in one destination with sub-tabs  
**User value:** Reduced navigation depth; domain data accessible in 2 taps  
**Files affected:** `public/dashboard.html`  
**Dependencies:** V-11-D; V-11-B (state system for empty states)  
**Scope:**
- `page-domains` with sub-tab navigation: Health · Finance · Business · Communications · University · Personal
- Each tab loads its domain panels on first activation (deferred — preserves V-09 gains)
- Each tab has: L0 summary row at top, domain panels below
- Personal tab combines: Journal · Spiritual · Occult (renamed "Esoteric Research")
- Finance tab: personal + business combined (single table, category filter)
- All tabs: maximum 5 API calls on first activation (Health tab currently 15 — must be reduced)

**Acceptance criteria:**
- Tab switch feels instant (shell immediate, data loads within 1,200ms)
- Health tab: ≤5 API calls on first activation
- Finance empty state shows onboarding prompt
- All domain panels retained with deferred loading preserved
- Playwright: measure navigation timing; verify <1200ms to first meaningful content per tab

**Rollback:** Restore individual domain pages; restore domain-specific switchPage hooks

---

#### PHASE V-11-I: Global Voice Trigger

**Objective:** Voice accessible from any page, not only Command  
**User value:** Voice as a natural global input  
**Files affected:** `public/dashboard.html` (topbar section)  
**Dependencies:** V-11-E (Command voice state)  
**Scope:**
- Microphone icon in topbar (right side, persistent on all destinations)
- Keyboard shortcut `V` triggers voice globally
- Voice state transitions: idle → listening → processing → responding
- All voice responses appear in Command thread (user navigated there automatically if not already)
- Mobile: microphone in bottom tab bar (rightmost position)
- Waveform animation uses existing `waveform` element

**Acceptance criteria:**
- Voice trigger visible from all 6 destinations
- Keyboard V activates voice
- Voice state shown in topbar indicator during active voice session
- Voice response appears in COMMAND thread
- Playwright (mobile viewport): microphone visible in bottom nav

**Rollback:** Remove topbar mic icon; unbind V key

---

#### PHASE V-11-J: Opportunities Schema Fix + Intelligence Complete

**Objective:** Fix `evidence_refs` schema; complete INTELLIGENCE destination  
**User value:** Opportunities surface fully functional  
**Files affected:** Supabase DB migration  
**Dependencies:** V-11-G  
**Scope:**
- Database migration: `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS evidence_refs jsonb`
- Remove graceful "unavailable" placeholder from INTELLIGENCE → Opportunities
- Opportunities render as full L0→L2 cards

**Acceptance criteria:**
- `GET /api/intelligence/opportunities` returns 200 with data
- Opportunities cards render with confidence indicators
- No 500 errors in production logs

**Rollback:** Revert DB migration (column is additive — safe rollback)

---

#### PHASE V-11-K: Progressive Disclosure + Object Model

**Objective:** Implement canonical L0→L4 disclosure pattern across all object types  
**User value:** Users can always go deeper without navigating away  
**Files affected:** `public/dashboard.html`  
**Dependencies:** V-11-F, V-11-G (destinations established)  
**Scope:**
- Universal expand/collapse pattern (single tap → L1, second tap → L2, etc.)
- All approval cards: full L0→L3 with evidence and plan
- All agent run entries: expandable step trace
- All intelligence items: expandable to evidence and reasoning
- All memory items: expandable to source and confidence
- Focus management on expand (accessibility)
- Collapse always available via Escape or second tap

**Acceptance criteria:**
- Every card type has at least L0+L1
- No page navigation required to see detail
- Expand/collapse keyboard accessible
- Focus moves correctly on expand

**Rollback:** Remove expand/collapse JS; items remain at L0 only

---

#### PHASE V-11-L: Command Palette + Search

**Objective:** Global search via Cmd+K  
**User value:** Find anything in APEX without knowing where it lives  
**Files affected:** `public/dashboard.html` (extends existing `cmdPalette`)  
**Dependencies:** V-11-D  
**Scope:**
- Bind `Cmd+K` / `Ctrl+K` to existing `#cmdPalette` (already exists)
- Add search scope: pages, commands, knowledge, memory, tasks, contacts
- Search results grouped by type
- Keyboard navigation (↑↓Enter Escape)
- Recent commands section (localStorage)
- Suggested items when palette opens empty

**Acceptance criteria:**
- Cmd+K opens palette
- Search returns results from multiple scopes
- Keyboard navigation works
- Escape closes
- Recent commands shown on empty open

**Rollback:** Unbind Cmd+K; palette reverts to existing (limited) implementation

---

#### PHASE V-11-M: Visual Language Finalization

**Objective:** Typography, spacing, motion final implementation  
**User value:** Coherent premium visual identity  
**Files affected:** `public/dashboard.html`, `public/apex-zero.css`  
**Dependencies:** V-11-A through V-11-L complete  
**Scope:**
- JetBrains Mono restricted to SYSTEM destination + timestamps + cost values
- Inter as the primary typeface for all domain content
- Motion system applied: transitions at `--apex-duration-standard` (220ms)
- Reduced motion respected throughout
- Final card border-radius, spacing normalisation
- Status indicator (●) in topbar: WS state, system health

**Acceptance criteria:**
- No JetBrains Mono on health, finance, communications, university content
- All page transitions use `ax-page-in` animation (existing keyframe)
- All panel transitions use `ax-panel-in` (existing)
- Reduced motion: all animations disabled, content still functions
- Playwright: visual consistency check at 375, 768, 1280, 1660px

**Rollback:** Revert typography rules; restore previous motion implementation

---

## PART XV — UNRESOLVED DECISIONS

---

These items require explicit authorisation before V-11 implementation addresses them:

### Decision 1: Primary destination naming

**Options:**
- A: TODAY · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM
- B: NOW · ASK · DOMAINS · MIND · DO · SYSTEM  
- C: TODAY · COMMAND · MY LIFE · APEX MIND · ACTIONS · SYSTEM
- D: [User-specified names]

**Impact:** High — affects all keyboard shortcuts, navigation labels, user mental model  
**Recommendation:** Option A. "TODAY" and "LIFE & WORK" are immediately human-readable. "INTELLIGENCE" is appropriate given the sophistication of this user.

### Decision 2: PlasmaOrb disposition

**Options:**
- A: Retain as ambient background animation on Command; remove as primary interactive element
- B: Remove entirely; replace with static brand mark in command
- C: Retain as-is (primary visual identity, interactive voice trigger)
- D: Move to System page as a system state visualiser

**Recommendation:** Option A. The orb has visual distinctiveness but competing with the chat interface as the primary element is the wrong architecture. Ambient background use preserves the identity.

### Decision 3: Command page default vs TODAY as default

**Options:**
- A: TODAY is the default landing page (V-11 recommended direction)
- B: COMMAND remains the default landing page (current behaviour)
- C: Context-dependent — TODAY in morning; COMMAND in afternoon

**Recommendation:** Option A for new users. However, since this is the only user, a user preference to restore COMMAND default is appropriate. Implement TODAY as default with a preference to override.

### Decision 4: Mobile vs desktop navigation model

The proposed model uses bottom tabs (mobile) + sidebar (desktop). The sidebar requires implementing a new component that doesn't exist in the current single-column layout. This may require significant structural HTML changes.

**Options:**
- A: Full sidebar (desktop) + bottom tabs (mobile) — recommended
- B: Bottom tabs only (both) — simpler; consistent; loses desktop discovery
- C: Top horizontal tabs (desktop) — simpler; less professional

**Recommendation:** Option A. The sidebar is the correct desktop pattern for this information density.

### Decision 5: "Personal" domain naming

The Occult + Spiritual pages currently exist as primary navigation. In V-11 they're grouped as a sub-tab in LIFE & WORK under "Personal."

**Options:**
- A: "Personal" tab containing Journal + Spiritual + Occult
- B: "Esoteric" tab (matches content more accurately)
- C: "Inner" tab (more neutral)
- D: "Practice" tab

**Recommendation:** Option A. "Personal" is the most neutral and inclusive label.

### Decision 6: `/api/now/summary` aggregation endpoint

This new endpoint is recommended for performance. It requires new backend code.

**Options:**
- A: Create `GET /api/now/summary` as a dedicated aggregation endpoint
- B: Client-side parallel fetch of 4 existing endpoints (simpler; more requests)
- C: Create as a server-side route using existing route handlers internally

**Recommendation:** Option C (implemented as a new src/routes file that calls existing service functions server-side). This keeps the client simple and enables caching at the server layer.

### Decision 7: Chat history persistence

Currently: chat resets on page refresh (no persistence).

**Options:**
- A: localStorage persistence (client-side only, session-ish)
- B: Server-side session persistence (requires new DB table)
- C: No change — preserve current behaviour

**Recommendation:** Option A first (localStorage), then B as a V-11 follow-on if desired.

### Decision 8: Streaming AI responses

Currently: chat waits for full response before rendering.

**Options:**
- A: Implement streaming via Server-Sent Events (SSE) — requires `src/routes/chat.js` changes
- B: Implement streaming via WebSocket — requires WS handler changes
- C: Keep synchronous — improve perceived performance with better loading state

**Recommendation:** Option A. SSE is the right mechanism for chat streaming. This is a significant change to chat.js but the highest-impact UX improvement for the COMMAND experience. Requires separate authorisation.

### Decision 9: Swipe hint / indicator

**Options:**
- A: Small dot indicators at bottom of page (like iOS carousel dots)
- B: Edge gradient suggesting swipeable content
- C: Brief hint text on first session only

**Recommendation:** Option A. Dot indicators are conventional and unobtrusive.

### Decision 10: Confidence indicator visual

**Options:**
- A: Dots (●◕◐◑○) — compact, icon-based
- B: Text only ("High confidence", "Low confidence")
- C: Progress bar
- D: Colour-coded chips (green/amber/red)

**Recommendation:** Option D for L0 (colour chip) + Option B for L1 (text label). Both required for accessibility.

---

## APPENDIX — Correction from V-10 Reconnaissance

**V-10 listed as defects:**
- D-02: `/briefing/today` → 404
- D-03: `/briefing/priority-inbox` → 404

**Correction:**
These routes ARE mounted and working at `/api/briefing/today` and `/api/briefing/priority-inbox`. The V-10 test called them without the `/api` prefix (testing with `http.get` at `/briefing/today`). The issue is the client JS in `dashboard.html` calling these routes — if it calls without `/api` prefix, that is a 1-line fix in the client fetch call. This must be verified before implementing V-11-C.

**D-01: `/api/intelligence/opportunities` → 500** remains a real defect requiring schema migration. Addressed in V-11-J.

---

**V-11 EXPERIENCE ARCHITECTURE SPECIFICATION COMPLETE**

*Recorded: 2026-08-31*  
*Application code changes: NONE*  
*Production: UNCHANGED (dd1dd1f / 1d3f17e)*  
*V-11 implementation: NOT STARTED — AWAITING AUTHORISATION*
