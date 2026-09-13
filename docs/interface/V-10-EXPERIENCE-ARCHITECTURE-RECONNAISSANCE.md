# V-10 EXPERIENCE ARCHITECTURE RECONNAISSANCE
# PRE-OVERHAUL EVIDENCE-BACKED PRODUCT MODEL

**Date:** 2026-08-31  
**Authority:** APEX Product — V-10 Reconnaissance  
**Status:** COMPLETE — No application code modified  
**Baseline commit:** 1d3f17e (docs cert) / app code dd1dd1f (V-09)  
**Evidence sources:** Source code (dashboard.html ~19,809 lines, server.js 433 lines, 75+ route files), browser automation (Playwright), direct API testing (25+ endpoints), existing performance documentation V-06 through V-09

---

## 1. Executive Summary

APEX is a personal AI operating system with deep, sophisticated backend capability: 265+ API endpoints, 7-layer cognitive memory, multi-agent orchestration, autonomy scoring, knowledge decay tracking, voice pipelines, real-time briefings, and a constitutional governance framework. The system is architecturally mature and functionally powerful.

The interface does not reflect this maturity.

**The fundamental problem is signal burial.** APEX exposes its implementation architecture rather than its intelligence. A first-time user navigating to any of the 20 primary destinations is confronted with technical labels, empty panels, unfamiliar terminology, and no clear indication of what APEX is doing or what the user should do. The system's most valuable capability — autonomous reasoning, proactive intelligence, and structured action — is hidden behind navigation hierarchy rather than foregrounded as the primary experience.

**The core principle violation:** APEX currently exposes its complexity by default and its intelligence on demand. The opposite should be true.

### Critical Findings at a Glance

| Severity | Finding |
|----------|---------|
| Critical | 20 primary navigation pages with no clear hierarchy or priority ordering |
| Critical | Command page conflates chat, constitution, activity feed, and orb without a clear primary purpose |
| Critical | No unified "What matters now" surface — the most important user question has no answer |
| Critical | Progressive disclosure is absent — all information at every level simultaneously |
| High | Intelligence capability is scattered across 6+ separate navigation destinations |
| High | Empty states are visually indistinguishable from loading states, data absence, or errors |
| High | `/briefing/today` and `/briefing/priority-inbox` return 404 — primary briefing routes broken |
| High | Dual CSS token namespace (v11 + APEX Zero) producing visual inconsistency |
| High | WebSocket connectivity inconsistent — live state updates unreliable |
| High | Finance summary returns empty data with no graceful handling |
| Medium | Mobile navigation uses a dropdown grid — not a native mobile pattern |
| Medium | Rate limiters create friction in active use sessions (10 login/hr, 300 API/15min) |
| Medium | `/api/intelligence/opportunities` returns 500 — DB schema defect |
| Medium | `occult`, `spiritual`, `reality`, `civilisation`, `occult` as primary navigation destinations are opaque to a new user |

---

## 2. Current Product Model

### 2a. What APEX Is

APEX is a single-user personal AI operating system hosted on Render. It provides:

- An AI chat/command interface powered by Claude
- Autonomous agents that execute background tasks
- A multi-layer cognitive memory system (episodic, semantic, procedural, strategic, decisions, skills, reflexion)
- Domain-specific intelligence panels across Health, Finance, Business, University, Communications, and Life
- A governance/approval framework for agent actions
- A constitutional operating framework (6 articles, active)
- Voice input capability (Gemini Live + TTS)
- Proactive briefings and opportunity identification
- A reality/claims framework for epistemic tracking
- A civilisation/governance model for long-running strategic state

### 2b. The Gap Between Backend and Interface

The backend is exceptionally capable. The interface communicates almost none of this capability to the user at first encounter.

| Capability | Backend Status | Interface Visibility |
|------------|---------------|---------------------|
| Proactive intelligence briefing | 200 OK, structured data | Buried in Intelligence page |
| Autonomy score (5.46/10) | 200 OK | Not surfaced anywhere |
| 95 agent runs, 78% success rate | 200 OK | Buried in System/Operation page |
| 7-layer memory health | 200 OK | Buried in Memory page |
| Roadmap: 108 pending items | 200 OK | Not surfaced to user |
| Active constitution (6 articles) | Prominent on Command page | Command page is primary home |
| Cost tracking ($4.70 total) | 200 OK | Resource monitor in System |
| Voice pipeline | Active | Single button on Command |
| WebSocket live updates | Architecture exists | Connectivity unreliable |
| Daily priority briefing | Route returns 404 | Completely unavailable |

### 2c. Platform Reality

- **Stack:** Node/Express, Render, Supabase Postgres, Claude API, Gemini (TTS/voice)
- **File:** Single ~19,809-line `public/dashboard.html` — all UI
- **Auth:** Server-side `requireAuth` + client-side `apex_session` cookie check
- **Navigation model:** 20 page destinations via `switchPage()` function, with keyboard shortcuts and touch swipe
- **Real-time:** WebSocket handler exists (`lib/ws-handler.js`), connectivity inconsistent
- **Performance baseline:** DCL 1,249ms (local), 35 boot requests, 3 residual duplicate groups

---

## 3. Current Information Architecture

### 3a. Navigation Inventory

The mobile dropdown nav reveals the full page inventory. Pages are listed in navigation order:

| ID | Title | Subtitle (from pageMeta) | Current Classification |
|----|-------|--------------------------|----------------------|
| command | Command | AI · Interface · Control | PRIMARY |
| overview | Overview | Governance · Pipeline · Status | PRIMARY |
| operation | Operation | Tasks · Agents · Schedules | PRIMARY |
| system | System | Agents · Processes · Health | PRIMARY |
| communication | Network | Comms · Messages · Contacts | PRIMARY |
| finance | Finance | Budgets · Investing · Planning | PRIMARY |
| business | Business | Ideas · Shopify · Projects | PRIMARY |
| university | University | Coursework · Revision · Notes | PRIMARY |
| health | Health | Health · Habits · Wellbeing | PRIMARY |
| occult | Occult | Research · Esoteric · Archive | PRIMARY |
| research | Research | Intelligence · Sources · Data | PRIMARY |
| activity | Activity | Events · Observability · Live Feed | PRIMARY |
| agents | Agents | Status · Tasks · Authority · Runs | PRIMARY |
| approvals | Approvals | Pending · Actions · Governance | PRIMARY |
| knowledge | Knowledge | Facts · Evidence · Gaps · Coverage | PRIMARY |
| intelligence | Intelligence | Briefing · Opportunities · Health | PRIMARY |
| memory | Memory | Episodic · Semantic · Health | PRIMARY |
| governance | Governance | Constitutional · Authority · Records | PRIMARY |
| civilisation | Civilisation | Genome · Consensus · Clock · Domains | PRIMARY |
| reality | Reality | Fabric · Claims · Health · Epistemic | PRIMARY |

**Additional pages found in Playwright smoke test (pages array in dashboard.html):**
`tasks`, `emails`, `notifications`, `chat`, `journal`, `master`, `spiritual`, `timeline`

**Total primary navigation destinations: 20+**

### 3b. Page-by-Page Analysis

**COMMAND (command)**
- **Purpose:** Primary AI interaction surface + identity/brand home
- **Primary user task:** Ask APEX something; issue commands; monitor APEX activity
- **Data displayed:** Chat/command input, APEX constitution (6 articles), live activity feed, voice button, OrB animation
- **Actions available:** Type/send message, voice hold-to-talk, view logs, clear feed
- **Dependencies:** WebSocket, Claude API, agent queue
- **Understandability without context:** PARTIAL — chat input is obvious; constitution is confusing; activity feed is unlabelled
- **Verdict:** Should remain primary destination, but needs focus — currently a 4-way split (chat, identity, constitution, activity feed)
- **Recommendation:** Consolidate as primary intelligence/command surface; merge activity feed inline

**OVERVIEW (overview)**
- **Purpose:** System health + governance pipeline status
- **Primary user task:** "What is APEX doing? What is the health of the system?"
- **Data displayed:** Health score (78), last cycle timestamp, agent runs (3 in 24h), burn ($0 today), memory operations (0), alerts (0)
- **API:** `/api/overview/vitals` → `{ health:78, alerts:0, agentRuns24h:3, burnUsd24h:"0.0000", memOps1h:0 }`
- **Understandability without context:** LOW — "vitals" is system jargon; "health:78" has no reference scale; "cycleMs:84412" is meaningless
- **Verdict:** Should become the primary landing page after command — but needs complete redesign to answer "What's important now?"
- **Recommendation:** Merge with intelligence briefing to create a genuine "Now" surface

**OPERATION (operation) / TASKS (tasks)**
- **Purpose:** Agent task management, approvals, scheduling
- **Primary user task:** Review pending tasks; approve/reject agent actions; see what's running
- **Data displayed:** Task queue (33 tasks), agent runs (95 total), schedules, standing approvals
- **Understandability without context:** MEDIUM — "tasks" is familiar; "agent runs" needs explanation
- **Verdict:** Merge tasks + approvals into a single "Actions" destination
- **Recommendation:** Secondary destination; primary action surface for approvals

**SYSTEM (system)**
- **Purpose:** Technical infrastructure, agent health, cost monitoring
- **Primary user task:** "How is APEX performing? What's running?"
- **Data displayed:** Executive council (AI agents), command chain, active systems, resource monitor (cost today/week/forecast), agent pipeline, system activity feed, memory architecture, automation center
- **Understandability without context:** LOW — "Executive Council", "Command Chain" are APEX-internal terms
- **Verdict:** Should not be primary navigation — should be a detail view accessible from Overview
- **Recommendation:** Demote to Detail → accessible from Overview or System health indicator

**INTELLIGENCE (intelligence)**
- **Purpose:** Proactive briefings, opportunities, system intelligence health
- **Primary user task:** "What has APEX found? What opportunities exist?"
- **API:** `/api/intelligence/briefing` → structured briefing with biggest opportunity identified
- **Known defect:** `/api/intelligence/opportunities` returns 500 (DB schema defect)
- **Understandability without context:** MEDIUM — "Intelligence" is comprehensible; briefing is valuable
- **Verdict:** Should be elevated — currently buried at position 16 of 20
- **Recommendation:** Surface briefing content as the primary "home" or merge into Overview

**FINANCE (finance)**
- **Purpose:** Budget tracking, expense management, financial summary
- **API:** `/api/finance/summary` returns `{ summary:[], budgets:[], month:8, year:2026 }` — empty data
- **Understandability without context:** HIGH — finance is universally understood
- **Data sparsity:** No graceful empty state — empty array renders as blank panel
- **Verdict:** Keep as primary domain; improve empty state handling
- **Recommendation:** Show helpful "Add your first transaction" onboarding when empty

**HEALTH (health)**
- **Purpose:** Physical health tracking, habits, wellbeing
- **Primary user task:** Log workouts, sleep, habits; view health overview
- **API calls on navigation:** 15 (heaviest nav trigger in system)
- **Verdict:** Keep as primary domain destination
- **Recommendation:** Reduce API call count on navigation; progressive loading

**COMMUNICATIONS (communications / communication)**
- **Purpose:** Email, calendar, contacts
- **Understandability without context:** HIGH — universal concept
- **Verdict:** Keep as primary domain

**UNIVERSITY (university)**
- **Purpose:** Course modules, assignments, flashcards, reading list
- **Verdict:** Domain-specific — keep as primary domain
- **Recommendation:** Could merge with a broader "Learning" concept

**MEMORY (memory)**
- **Purpose:** Episodic, semantic, procedural memory system health
- **API:** `/api/memory/health` — 95 episodes, 74 success, complex nested structure
- **Understandability without context:** LOW — "episodic memory" is technical AI terminology
- **Verdict:** Should not be primary navigation — should be detail view
- **Recommendation:** Surface as "What does APEX remember?" accessible from command or transparency panel

**REALITY (reality)**
- **Purpose:** Claims framework, epistemic health tracking
- **API calls on navigation:** 16 (tied for heaviest with health)
- **Understandability without context:** VERY LOW — "reality fabric", "epistemic", "claims" are highly specialised
- **Verdict:** Should not be primary navigation — advanced/system-level capability
- **Recommendation:** Demote to System Detail or Transparency panel

**OCCULT (occult)**
- **Purpose:** Esoteric research archive, spiritual practice
- **API calls on navigation:** 21 (highest in system)
- **Understandability without context:** VERY LOW — opaque name
- **Verdict:** Personal domain — appropriate as an accessible destination but should not be in primary nav
- **Recommendation:** Secondary domain; merge with spiritual/journal into "Inner" or "Life" domain

**SPIRITUAL (spiritual)**
- **Verdict:** Merge with occult and journal under a unified personal domain

**JOURNAL (journal)**
- **Verdict:** Merge with inner/life domain

**MASTER (master)**
- **Purpose:** Technical orchestration — QA, code review, deployment, release management
- **Understandability without context:** VERY LOW — "Master" is an internal term
- **Verdict:** Developer tooling — should not be primary navigation for a user-facing OS
- **Recommendation:** Accessible via Settings/Advanced or command

**AGENTS (agents)**
- **Verdict:** Surface agent status as a component within System/Overview, not a primary destination

**APPROVALS (approvals)**
- **Verdict:** Critical UX surface — should be easily accessible (keyboard shortcut `A` already exists)
- **Recommendation:** Keep as accessible destination; badge count visible in nav

**KNOWLEDGE (knowledge)**
- **Purpose:** Semantic facts, evidence gaps, knowledge coverage
- **Verdict:** Should be accessible via "What does APEX know?" — not primary nav
- **Recommendation:** Detail view from command or transparency panel

**GOVERNANCE (governance)**
- **Verdict:** Advanced administrative function — not primary nav
- **Recommendation:** Accessible from settings or system deep-dive

**CIVILISATION (civilisation)**
- **Verdict:** Internal system model — not appropriate as user-facing primary navigation
- **Recommendation:** Accessible from system deep-dive only

**ACTIVITY (activity)**
- **Purpose:** Live event feed, observability
- **Verdict:** Merge into Command page activity feed or System page

**TIMELINE (timeline)**
- **Purpose:** Historical timeline of APEX activity
- **Verdict:** Accessible detail view; not primary navigation

**NOTIFICATIONS (notifications)**
- **Purpose:** System and agent notifications
- **Verdict:** Keep — critical for action-oriented UX; keyboard shortcut `N` already exists

### 3c. Proposed Destination Reduction

**Current:** 20+ primary navigation pages  
**Recommended primary destinations (7):**

| Destination | Replaces / Includes |
|-------------|-------------------|
| **Now** | Overview + Intelligence briefing + Notifications |
| **Command** | Command (consolidated — chat only, no constitution) |
| **Actions** | Operation + Approvals + Notifications |
| **Life** | Health + Journal + Occult + Spiritual + University |
| **Work** | Finance + Business + Communications |
| **System** | System + Agents + Memory + Reality + Activity + Governance + Civilisation |
| **Research** | Research + Knowledge |

Secondary/detail destinations:
- Timeline — accessible from Now or History
- Master — accessible from System
- Notifications — global badge, accessible everywhere

---

## 4. Complete Capability Inventory

### 4a. Command & Intelligence

| Capability | Where | Access | Data Source | Action Available | Current UX | Limitations | Ideal UX |
|------------|-------|--------|-------------|-----------------|------------|------------|---------|
| AI chat/command | Command page | Chat input | Claude API via `/chat` | Type or voice | Mixed with constitution, feed | No streaming indicator, no conversation history visible on load | Full-screen chat with persistent history, streaming, follow-up context |
| Daily briefing | Intelligence page + `/api/intelligence/briefing` | Navigate to Intelligence | Claude-generated 6h cache | None (read only) | Hidden in navigation | `/briefing/today` 404 | Surfaced as home page card with "biggest opportunity" |
| Priority inbox | `/briefing/priority-inbox` | Not accessible | — | — | 404 | Route broken | "What needs you" as the first thing seen on opening APEX |
| Opportunity detection | Intelligence page | Navigate | `/api/intelligence/opportunities` | None | 500 error | DB schema defect | Opportunity card with confidence, evidence, action |
| News feed | Intelligence page | Navigate | `/api/intelligence/news` | Refresh | Not visible without navigation | No source citation | Push to Now surface |
| Agent cost summary | System + Command | Available | `/api/intelligence/cost-summary` | None | Tiny metrics in System | No per-action breakdown | Transparency panel accessible from any agent run |
| Autonomy score | `/api/autonomy/score` | Not surfaced in UI | Backend only | None | Not visible | No UI | Small indicator on System page |

### 4b. Agents & Automation

| Capability | Where | Access | Data Source | Current UX | Limitations | Ideal UX |
|------------|-------|--------|-------------|------------|------------|---------|
| Agent task execution | Operation/Tasks | Task list | `/api/tasks` | List view | No explanation of what agent will do | Approval surface with preview |
| Task approval/rejection | Approvals + Tasks | Navigate + keyboard A | `/api/tasks/approve` | Works | No approval history shown | Inline approval with evidence |
| Standing approvals | Tasks | Navigate | `/api/tasks/standing-approvals` | List view | Not discoverable | Rule builder |
| Scheduled tasks | Operation | Navigate | `/api/master/schedules` | Grid view | Last run only, no history | Timeline with next/last/status |
| Agent run history | System/Operation | Navigate | `/api/intelligence/agent-runs` | Log list | No explanation of each run's reasoning | Expandable run with objective, steps, cost, outcome |
| Pipeline status | Overview | Visible | `/api/overview/vitals` | Numbers | "cycleMs" unexplained | "Last action: X seconds ago" |
| Undo last action | Tasks | API only | `/api/tasks/undo` | No UI | Not exposed in interface | Undo action visible after any agent action |
| Voice pipeline | Command | Hold-to-talk button | `/api/voice/pipeline` + Gemini | Single button | No visual feedback during processing | Full voice state animation |
| Domain agents | System | Navigate + chat modal | `/agents/domain` | Modal chat | Requires 2+ clicks to discover | Persistent agent roster |

### 4c. Memory & Knowledge

| Capability | Where | Access | Data Source | Current UX | Limitations | Ideal UX |
|------------|-------|--------|-------------|------------|------------|---------|
| Episodic memory | Memory page | Navigate | `/api/memory/episodic/recent` | List | 95 episodes — raw technical data | "APEX remembers: [recent actions]" |
| Semantic facts | Memory page | Navigate | `/api/memory/semantic/search` | Search | Category/confidence not surfaced | Browsable fact library with confidence |
| Knowledge gaps | Knowledge page | Navigate | Vault + memory | Present | Not discoverable | "APEX doesn't know: [list]" |
| Wiki/vault search | Knowledge page | Navigate | `/api/wiki/search` | Search input | Deep navigation required | Command: "What does APEX know about X?" |
| Reflexion lessons | Intelligence/Memory | Not visible | `/intelligence/lessons` | No UI | Not surfaced | "APEX learned: [recent lesson]" transparency |

### 4d. Finance

| Capability | Current Data | Access | Limitation |
|------------|-------------|--------|-----------|
| Monthly summary | Empty (`summary:[]`) | Finance page | No data = blank panel |
| Budget tracking | Empty (`budgets:[]`) | Finance page | No setup guidance |
| Transaction log | Not tested | Finance page | CSV import available but hidden |

### 4e. Health

| Capability | API Calls | Data | Issue |
|------------|-----------|------|-------|
| Sleep tracking | `/api/health/sleep` | Active | 15 API calls on nav — too many |
| Workout log | `/api/workouts` | Active | Deferred to first navigation |
| Supplement tracking | `/api/health/supplements` | Active | — |
| Journal | `/api/life/journal/entries` | Active | — |
| Habits | `/api/habits` | Active | — |
| Psychology/crisis | `/api/life/psychology/crisis-check` | Active | — |
| Spiritual sessions | `/api/life/spiritual/sessions` | Active | — |
| Metrics | `/api/health/metrics` | Active | — |

### 4f. Communications & Calendar

| Capability | Status |
|------------|--------|
| Email list | `/api/communications/emails` 200 |
| Calendar events | `/calendar/events` 200 |
| Contacts | `/contacts` 200 |
| Birthday tracking | Deferred to first comm navigation |

### 4g. Research

| Capability | Endpoint | Availability |
|------------|----------|-------------|
| Web scrape | `/api/research/scrape` | Active |
| Web search | `/api/research/search` | Active |
| Async crawl | `/api/research/crawl` | Active |
| Agentic research | `/api/research/agent` | Active |
| Screenshot | `/api/research/screenshot` | Active |
| Wiki search | `/api/wiki/search` | Active |

### 4h. Voice

| Capability | Endpoint | Status |
|------------|----------|--------|
| Full voice pipeline | `/api/voice/pipeline` | Active |
| Gemini Live voice chat | `routes/gemini-live.js` | Active |
| TTS (Gemini) | `routes/tts-gemini.js` | Active |
| Barge-in interrupt | `/intelligence/interrupt` | Active |

### 4i. Reality / Governance

| Capability | Status | User Accessibility |
|------------|--------|------------------|
| Reality health score | 200 OK | Reality page (primary nav but opaque) |
| Claims projection | Active | Reality page |
| Governance cycle | Active | Governance page (rarely visited) |
| Constitution (6 articles) | PROMINENT | Command page (primary real estate) |
| Approval framework | Active | Tasks + Approvals |

---

## 5. User Journey Analysis

### Journey 1: "What's important right now?"
**Current steps:** Open APEX → see Command page with chat input + constitution → navigate to Overview → see health:78, alerts:0 → navigate to Intelligence → see briefing (hidden in navigation)  
**Friction:** 3 navigation steps to find answer  
**Missing:** No unified "Now" surface; briefing not on first screen  
**Ideal:** Open APEX → first screen shows: Today's briefing headline, 2–3 prioritised items, action queue badge  

### Journey 2: "What changed?"
**Current steps:** Navigate to Activity or System → scroll activity feed  
**Friction:** Activity feed exists only on Command page (right column) and as separate Activity page  
**Missing:** No timeline view of changes; no "since last visit" marker  
**Ideal:** "Last 24h" summary card on Now page; expandable full timeline  

### Journey 3: "What needs my attention?"
**Current steps:** Navigate to Approvals (keyboard A) → see pending tasks  
**Friction:** Must know keyboard shortcut; approvals page is primary nav position 14 of 20  
**Missing:** Badge count in navigation; push notification summary  
**Ideal:** Approval queue badge persistent in nav; approval cards on Now page  

### Journey 4: "Explain this insight."
**Current steps:** Navigate to Intelligence → read briefing text  
**Friction:** Briefing is plain text; no expandable evidence; no source citation visible  
**Missing:** L1/L2 disclosure (context, evidence); "Why is APEX saying this?"  
**Ideal:** Briefing card with "Show evidence" → evidence panel → "Show reasoning" → reasoning panel  

### Journey 5: "Why am I seeing this?"
**Current steps:** No mechanism exists  
**Friction:** Complete absence  
**Missing:** Provenance on every surfaced item  
**Ideal:** Every insight/recommendation has a "?" button showing data source + reasoning chain  

### Journey 6: "Where did this information come from?"
**Current steps:** No mechanism exists for most data  
**Friction:** Finance data has no source attribution; health data has no timestamp visibility  
**Missing:** Data freshness indicators; source attribution  
**Ideal:** Every panel shows "Last updated: Xm ago" + data source link  

### Journey 7: "What does APEX remember?"
**Current steps:** Navigate to Memory → see raw episodic/semantic lists  
**Friction:** 3 clicks; data shown as technical API output (memory IDs, confidence floats)  
**Missing:** Human-readable memory summary; searchable from Command  
**Ideal:** "APEX remembers: [5 most recent relevant memories]" accessible from command or transparency panel  

### Journey 8: "What does APEX know?"
**Current steps:** Navigate to Knowledge → search  
**Friction:** Knowledge page buried (position 15 of 20 in nav)  
**Missing:** Discovery mechanism for knowledge gaps  
**Ideal:** "Ask APEX what it knows about X" returns structured fact + confidence + gaps  

### Journey 9: "What does APEX not know?"
**Current steps:** No mechanism  
**Missing entirely.** Knowledge gaps exist in data (`/api/wiki/health` returns orphaned files) but not surfaced  
**Ideal:** "APEX knowledge gaps" panel showing domains with low coverage  

### Journey 10: "Ask APEX to research something."
**Current steps:** Type in chat → APEX routes to research pipeline  
**Friction:** No feedback that research is running; no structured result presentation  
**Missing:** Research progress indicator; structured result card with sources  
**Ideal:** Chat → "Researching…" progress → structured result card with title, summary, sources, confidence  

### Journey 11: "Ask APEX to perform an action."
**Current steps:** Type in chat → APEX creates task → approval required → navigate to Approvals  
**Friction:** No notification that approval is pending after sending message; must navigate away  
**Missing:** Inline approval prompt in chat; "pending approval" state in command  
**Ideal:** Chat reply includes "I've queued this for your approval" with inline approve/reject buttons  

### Journey 12: "Approve an action."
**Current steps:** Navigate to Approvals (or keyboard A) → see pending task → approve  
**Friction:** Context of why approval is needed not always visible; no preview of what will happen  
**Missing:** Evidence panel on approval card; "What will this do?" preview  
**Ideal:** Approval card with: objective, planned steps, estimated cost, risk level, approve/reject  

### Journey 13: "Reject an action."
**Current steps:** Approvals page → reject button  
**Friction:** No feedback mechanism — why did user reject? APEX doesn't learn  
**Missing:** Rejection reason field; reflexion capture  
**Ideal:** Rejection with optional reason → APEX creates reflexion lesson → "Got it, I won't do that again"  

### Journey 14: "Find something."
**Current steps:** Command palette (no documented keyboard shortcut in help overlay); or scroll through pages  
**Friction:** Command palette exists (`#cmdPalette`) but not clearly surfaced; help overlay shows shortcuts 1–0, R, A, N, /, ? — no mention of global search  
**Missing:** Universal search shortcut (Cmd+K typically); search results across all APEX data  
**Ideal:** Cmd+K or / → unified search across tasks, memories, knowledge, messages, transactions  

### Journey 15: "See what APEX has been doing."
**Current steps:** Navigate to System → Agent Pipeline or Activity → read logs  
**Friction:** Logs show raw task IDs and objectives without natural language summary  
**Missing:** "APEX digest" — "In the last 24h, APEX did X, Y, Z"  
**Ideal:** Timeline on Now page showing agent actions in natural language with cost and outcome  

### Journey 16: "Understand an agent run."
**Current steps:** Navigate to System or Operation → find run in list → limited detail  
**Friction:** Agent run data shows: task_id, objective, success bool, cost_usd — no step breakdown  
**Missing:** Execution trace; per-step reasoning; what APEX attempted vs achieved  
**Ideal:** Agent run card → expand → step-by-step trace with reasoning → evidence used → outcome  

### Journey 17: "Understand an error."
**Current steps:** If APEX fails, the failure may appear in activity feed or agent run log  
**Friction:** Error messages are technical (e.g., "column opportunities.evidence_refs does not exist")  
**Missing:** User-friendly error translation; suggested remediation; no "this broke" surface  
**Ideal:** Error card in natural language: "APEX couldn't complete X because Y. Here's what you can do."  

### Journey 18: "Use APEX by voice."
**Current steps:** Navigate to Command → hold "HOLD TO TALK" button  
**Friction:** Voice button not visible without navigating to Command; no visual feedback  
**Missing:** Voice state indicator globally visible; waveform animation; "APEX is listening" state  
**Ideal:** Voice trigger globally accessible; animated waveform during listening; TTS playback with progress  

### Journey 19: "Use APEX on mobile."
**Current steps:** Tap hamburger → see 3-column dropdown grid of 18 pages  
**Friction:** 18-item dropdown grid is not a native mobile navigation pattern; target areas may be too small  
**Missing:** Bottom tab navigation with 5–7 primary tabs; swipe between pages works but isn't signposted  
**Note:** Touch swipe for page navigation IS implemented (left/right swipe on pageWrap) — underexposed  
**Ideal:** Bottom tab bar with 5 primary destinations; swipe navigation between tabs; sheet/drawer for detail  

### Journey 20: "Return to something previously viewed."
**Current steps:** Navigate back to same page  
**Friction:** No history/back navigation within APEX; no "recent" surface  
**Missing:** Recent pages, recent searches, recent insights  
**Ideal:** Recent items accessible from Now page or command palette history  

---

## 6. Understandability Gap Register

For each major screen, an assessment by a first-time user with no APEX knowledge:

### Command Page
- "What is this?" — It's a chat interface. But there's also a grid of 6 boxes and a live feed.
- "What is the constitution doing here?" — UNKNOWN — why are 6 governance articles the main content?
- "What is the activity feed?" — Hard to tell without watching it for a while
- "What is the orb?" — A decorative element? A button? What does it indicate?
- "What does HOLD TO TALK do?" — Voice input — but only if you already know
- **Gap:** Command page primary purpose is unclear. Chat is obvious; everything else is not.

### Overview Page
- "What is health:78?" — 78 out of what? Good or bad?
- "What is a cycle?" — UNKNOWN
- "What does 'alerts:0' mean?" — No alerts — but alerts of what type?
- "What is memOps:0?" — UNKNOWN
- "What is burnUsd:$0.00?" — APEX costs money? Why?
- **Gap:** Overview speaks entirely in system metrics. No human-readable context.

### System Page
- "Executive Council" — UNKNOWN — these are AI agents, but this is not clear
- "Command Chain" — UNKNOWN — routing trace is a technical debugging concept
- "Active Systems" — Slightly clearer — services running
- "Resource Monitor" — Understood — cost tracking
- "AI Workforce" — More comprehensible than "Executive Council"
- **Gap:** System page alternates between clear (cost, status) and completely opaque (command chain, council)

### Intelligence Page
- "Intelligence" — Understood as "AI-generated insights"
- "Briefing" — Clear — a daily summary
- "Opportunities" — Clear concept — currently broken (500)
- "Health" — APEX health score — less clear as a concept
- **Gap:** Intelligence page is actually the most understandable page name — but it's buried at position 16

### Memory Page
- "Episodic memory" — UNKNOWN to most users — sounds like psychology jargon
- "Semantic memory" — UNKNOWN
- Memory IDs like "ep-mthdz8dc-m1iu" — completely opaque
- **Gap:** Memory page exposes the implementation directly. No human translation.

### Reality Page
- "Reality fabric" — UNKNOWN
- "Claims" — Ambiguous in this context
- "Epistemic health" — UNKNOWN
- 16 API calls on navigation — high data density with no clear purpose for user
- **Gap:** Reality page is entirely internal APEX architecture. Zero user comprehension expected.

### Occult Page
- "Occult" — For most users: witchcraft or hidden. Neither implies a research archive.
- 21 API calls on navigation — highest in system
- **Gap:** Page name actively obscures purpose. Even if content is valuable, discovery is blocked by name.

### Finance Page
- Finance is universally understood.
- But: empty data returns blank panel with no onboarding, no "get started" guidance
- **Gap:** Empty state looks like broken, not empty.

---

## 7. Progressive Disclosure Model

### Current Disclosure State

APEX currently has effectively **one disclosure level**: everything visible at all times. There is no L0→L4 path. Users either see a panel with data or they see an empty/loading panel. There is no "summary first, expand for detail" pattern.

### Evidence of Missing Disclosure

| Location | Currently shows | Should show at L0 | Missing |
|----------|-----------------|-------------------|---------|
| Intelligence briefing | Full text | Headline only | L1 expand for full |
| Agent run | task_id, success:bool, cost | "Completed: [objective]" | L2 step trace |
| Memory entry | memory_id, confidence float | "APEX remembers: [fact]" | L3 evidence |
| Cost summary | `totalCostUsd:"4.70"` | "APEX has spent $4.70 total" | L1 breakdown by run |
| Autonomy score | `score:5.46` API only | Not surfaced | All levels missing |
| Reality claims | Technical claim structure | Not user-readable | Full model missing |
| Error states | Technical error text | "Something went wrong" | L2 explain, L3 technical |

### Canonical Disclosure Model (Proposed)

```
L0 — SUMMARY
  One line. State + key value. Always visible.
  Example: "Intelligence: 78% health · 3 briefings today"
  
L1 — CONTEXT
  Expand: what this means and why it matters.
  Example: "APEX identified 3 briefings. Health score reflects execution success rate."
  
L2 — EVIDENCE
  Expand: the data that produced the summary.
  Example: "Based on 95 agent runs, 74 successful, $4.70 total cost"
  
L3 — REASONING
  Expand: the reasoning chain or decision path.
  Example: "Autonomy score is 5.46 because execution success (0.84) offset by 0 recovery rate (0.00)"
  
L4 — EXECUTION / SYSTEM DETAIL
  Expand: raw data, technical IDs, API response, execution trace.
  Example: Full episodic memory record, raw API JSON
```

**Implementation principle:** Every panel in APEX should start at L0. Tap/click progressively reveals L1, L2, L3, L4. The user never needs to navigate to a different page to go deeper — they expand in place.

---

## 8. Universal Object Model Proposal

### Current State: Inconsistent Object Representations

APEX currently represents similar concepts with completely different structures across pages:

| Object type | Current representation | Inconsistency |
|-------------|----------------------|--------------|
| Agent run | `{task_id, objective, success, cost_usd, complexity, created_at}` | No natural language description |
| Task | `{id:"TASK-282001", title, status, created_at}` | Different ID format from agent run |
| Notification | `{notifications:[]}` | Empty — no structure observed |
| Memory | `{memory_id:"ep-mthdz8dc-m1iu", objective, ...}` | UUID IDs, no human label |
| Opportunity | 500 error | Schema defect prevents observation |
| Schedule | `{name, enabled, last_run, status, duration_ms}` | Technical names only |

### Proposed Canonical APEX Object Model

Every meaningful object in APEX should conform to this structure (fields are optional; at minimum: type + title + state):

```javascript
{
  // Identity
  id: "apex-obj-{uuid}",
  type: "insight|task|notification|approval|agent-run|memory|knowledge|opportunity|warning|event|communication|execution|research",
  
  // Display
  title: "Short, human-readable title",
  summary: "1–2 sentence human-readable description",
  
  // State
  state: "pending|active|completed|failed|cancelled|stale|requires-approval|processing",
  priority: "critical|high|medium|low|none",
  
  // Time
  createdAt: ISO8601,
  updatedAt: ISO8601,
  expiresAt: ISO8601 | null,
  
  // Provenance
  source: "agent|user|scheduled|external|derived",
  sourceId: "reference to originating entity",
  
  // Intelligence
  confidence: 0.0–1.0 | null,
  
  // Progressive disclosure
  context: "L1 — why this matters",
  evidence: ["L2 — supporting data points"],
  reasoning: "L3 — how this was derived",
  executionTrace: [{ step, action, result, durationMs }],  // L4
  
  // Action
  actions: [{ label, type: "approve|reject|expand|navigate|dismiss|undo", endpoint }],
  
  // History
  history: [{ timestamp, event, actor }],
  
  // Relations
  relatedObjects: ["apex-obj-{uuid}", ...],
  
  // Governance
  requiresApproval: bool,
  approvalStatus: "pending|approved|rejected|auto-approved|bypassed",
  permissions: ["read|write|execute|approve"],
}
```

---

## 9. Canonical State Model Proposal

### Current State: Collapsed and Ambiguous

The current system collapses multiple distinct states into visual silence (empty panels). There is no systematic distinction between:

| Actual state | Currently appears as |
|-------------|---------------------|
| API returned empty array | Blank panel |
| API not yet called (lazy load) | Blank panel |
| API error / 500 | Usually blank panel |
| API timeout / network error | Blank panel |
| User has no data (legitimate empty) | Blank panel |
| Permission denied | Blank panel or error text |
| Data is stale (>TTL) | No indicator |
| Data is loading | `Loading…` text (some panels) |

### Evidence from Source Inspection

CSS classes found:
- Loading: `ds-spinner`, `ds-skeleton`, `ds-placeholder`, `ds-empty-icon`
- Error: `panel-error` (with `Failed to load · Retry` text)
- Status: `ds-dot` (with color variants: `.green`, `.amber`, `.red`, `.cyan`, `.pulse`)
- States partially implemented via animation classes

### Proposed Canonical APEX State Model

```
LOADING
  Visual: Skeleton/shimmer animation
  Text: "Loading…" (never blank)
  
EMPTY (legitimate — user has no data)
  Visual: Empty state illustration + onboarding prompt
  Text: "No [items] yet. [Action to create first one]."
  
NO_RESULTS (query returned nothing)
  Visual: Empty state icon (different from EMPTY)
  Text: "No results for '[query]'. Try [suggestion]."
  
NOT_YET_LOADED (deferred panel not yet triggered)
  Visual: Greyed card with "Navigate here to load" or automatic trigger
  Text: Not visible — should auto-load on navigation
  
STALE (data older than TTL)
  Visual: Amber dot or "Updated Xm ago" timestamp
  Text: "Updated [timestamp] · Refresh"
  
ERROR (API error, 5xx)
  Visual: Red dot, error card
  Text: "Couldn't load [panel]. [Reason in plain English]. Retry"
  
PARTIAL (some data loaded, some failed)
  Visual: Warning indicator on panel
  Text: "Showing [N] of [N] items. [Failed panel] unavailable."
  
SUCCESS (data fresh and loaded)
  Visual: No indicator (baseline state)
  Text: "Updated [timestamp]" (subtle)
  
STALE_OFFLINE (no network)
  Visual: Offline banner at top
  Text: "Working offline. Last updated [timestamp]."
  
PERMISSION_REQUIRED
  Visual: Lock icon
  Text: "Sign in to see this." or "Upgrade to access."
  
APPROVAL_REQUIRED
  Visual: Orange badge
  Text: "Waiting for your approval."
  
PROCESSING (async operation running)
  Visual: Progress indicator, animated
  Text: "APEX is working on this…"
```

**Critical rule:** EMPTY, NO_RESULTS, NOT_YET_LOADED, ERROR, and STALE must never look identical. Each must have a distinct visual treatment.

---

## 10. Communication Architecture

### Current Communication Model

| Channel | Current Implementation | Issues |
|---------|----------------------|--------|
| Intelligence | Briefing text on Intelligence page | Buried, requires navigation |
| Errors | Technical error messages (API text) | Not user-readable |
| Progress | Sometimes "Loading…", sometimes blank | Inconsistent |
| Completion | No completion indicator | Agent finishes → silence |
| Notifications | `/api/notifications` — empty during test | No delivery mechanism visible |
| Proactive findings | Intelligence briefing | Not pushed to home |
| Approvals | Approvals page | Requires navigation |
| Agent execution | Activity feed on Command page | Not available on other pages |
| Voice state | Hold button on Command page | No global indicator |
| System state | System page | Requires navigation |
| Telemetry | System/overview metrics | Technical, not communicative |

### Key Problem: Implementation Communication

APEX communicates implementation details rather than meaningful user information:

| APEX currently says | APEX should say |
|--------------------|----------------|
| `cycleMs: 84412` | "Civilization cycle: 84 seconds" |
| `score: 5.46` | "Autonomy: 55% — growing" |
| `ep-mthdz8dc-m1iu` | "Health optimization research" |
| `success: true, cost: 0.049 USD` | "Completed · $0.05 · 2 seconds" |
| `totalRuns: 95, successRate: 78` | "78% of APEX's 95 actions succeeded" |
| `{"ok":false,"error":"column..."}` | "System error — contact support" |

### Proposed Communication Hierarchy

```
L1 — PROACTIVE (pushed, user didn't ask)
  Examples: "Your briefing is ready", "Action needs approval", "Finance alert"
  Surface: Now page + notification badge
  
L2 — REACTIVE (user asked, APEX responds)
  Examples: Chat reply, search results, command output
  Surface: Command page, inline with the action
  
L3 — STATUS (ambient, always available)
  Examples: Health indicator, cost today, WS connected
  Surface: Top bar or persistent system indicator
  
L4 — ON DEMAND (user explicitly requests)
  Examples: Full agent run trace, memory detail, evidence panel
  Surface: Expandable drawer or detail sheet
  
L5 — DIAGNOSTIC (developer/admin only)
  Examples: Raw API responses, execution IDs, DB queries
  Surface: System page, only visible to admin
```

---

## 11. Navigation Architecture Proposal

### Current Navigation

- **Desktop:** Sidebar (unknown — not visible in source scan without authenticated render; topbar contains page title/subtitle)
- **Mobile:** Hamburger → 3-column dropdown grid of 18 pages
- **Keyboard:** Shortcuts 1–0 (10 pages), A (approvals), N (notifications), / (chat), ? (help), R (refresh)
- **Touch:** Swipe left/right on `#pageWrap` for adjacent page navigation
- **Command palette:** Exists (`#cmdPalette`), keyboard shortcut not documented in help overlay

### Navigation Problems

1. 20 destinations in primary nav — exceeds comfortable cognitive load (3–7 items ideal)
2. Mobile dropdown grid is not a standard mobile navigation pattern
3. Command palette exists but is not discoverable
4. Swipe navigation is implemented but not signposted
5. No breadcrumb or back navigation within detail views
6. No "recently visited" mechanism

### Proposed Navigation Architecture

**Primary structure (5 destinations):**
```
[NOW]   [COMMAND]   [ACTIONS]   [LIFE]   [SYSTEM]
```

**Mobile (bottom tab bar):**
```
[ Now ] [ Command ] [ Actions ] [ Life ] [ ··· ]
                                           ↓ sheet
                                        System
                                        Work
                                        Research
```

**Keyboard shortcuts (retained):**
- `K` or `/`: Command palette (global search + quick actions)
- `A`: Approvals (retained)
- `N`: Notifications (retained)
- `1–5`: Primary tabs (NOW, CMD, ACT, LIFE, SYS)
- `?`: Help (retained)

**Secondary destinations (accessible via Command or ··· menu):**
- Finance, Business, Communications → grouped under Work
- Health, Journal, University, Spiritual, Occult → grouped under Life
- Memory, Reality, Governance, Knowledge, Agents → grouped under System
- Research → accessible from Command or Search
- Timeline, Activity → accessible from Now (History section)

**Global elements (always visible):**
- Top bar: Page title, time, approval badge, notification badge
- Voice trigger: Globally accessible (not only on Command page)
- Command palette: Cmd+K / K from any page

---

## 12. Command Experience Model

### Current State

The Command page (`#page-command`) currently contains:
1. A 3-column split: `cmd-stage` (orb + voice), `cmd-main` (chat input + constitution), `cmd-feed-col` (activity feed)
2. Constitution Charter (6 articles, hardcoded HTML, displayed by default)
3. Chat/command input
4. Hold-to-talk voice button
5. PlasmaOrb (canvas animation, dynamically loaded post-DCL)
6. Activity feed (right column, live updates)

### Problems with Current Command

1. **Primary purpose is unclear.** Is Command for chatting? Managing APEX? Understanding its constitution? The visual weight is split equally.
2. **The constitution dominates below-fold content.** A 6-panel governance grid is the most prominent content block on the primary page.
3. **The chat input is present but the chat history isn't.** On load, no conversation history is shown — starts fresh each session.
4. **No streaming indicator.** When a message is sent, there is no "APEX is thinking…" state.
5. **Voice requires navigation.** Voice must navigate to Command page. Global voice trigger missing.
6. **No structured output.** Chat responses are plain text. Research results, agent outputs, and briefings are not structurally presented.

### Proposed Command Interaction Model

```
COMMAND SURFACE STRUCTURE:

[ Input field — full width, persistent ]
  ↓ Sends message → 
  [ Thinking indicator → Streaming response ]
  [ Structured result card if action performed ]
  [ Approval prompt if action requires approval ]
  [ Follow-up suggestions ]

BELOW INPUT:
  [ Recent messages — scrollable, persistent across sessions ]
  [ Pinned insights — APEX-surfaced proactively ]

GLOBAL VOICE TRIGGER:
  [ Microphone button — visible globally ]
  [ Waveform animation during listen ]
  [ TTS playback indicator during response ]
  
COMMAND TYPES (recognized and handled distinctly):
  Question → Answer card with evidence
  Research request → Progress → Research result card with sources
  Action request → Confirmation → Approval if required → Execution → Result
  Memory query → Memory card
  Explanation request → Disclosure panel (L0 → L4)
  Navigation request → Direct page navigation
```

---

## 13. Transparency / Trust Model

### Current Transparency Gaps

| What user needs to understand | Currently available | Gap |
|------------------------------|---------------------|-----|
| What APEX knows | Memory/Knowledge pages (buried) | Requires 3+ clicks |
| Where information came from | Not available for most data | Complete gap |
| Confidence level | Present in memory API, not surfaced in UI | Complete UI gap |
| What APEX inferred | Not available | Complete gap |
| What APEX actually did | Activity feed (partial) + agent run log | Incomplete; not human-readable |
| What APEX attempted | Not available | Complete gap |
| What failed | Error state in some panels | Not systematic |
| Why approval is required | Task card (partial) | No evidence/preview |
| What permissions exist | Standing approvals page | Discoverable |
| What actions are automatic | Not documented in UI | Complete gap |
| What triggers agent execution | Not visible | Complete gap |
| Cost of each action | Cost summary (aggregate only) | No per-action UI |

### Proposed Transparency Model

Every surfaced piece of information should answer:
1. **Source:** Where did this come from? (Database, API, Claude reasoning, user input)
2. **Freshness:** When was this last updated?
3. **Confidence:** How certain is APEX? (Only when applicable)
4. **Provenance:** What triggered this? (Only when not obvious)
5. **Action history:** What happened with this previously?

Implementation pattern: A universal `ℹ` or `···` button on every data card opens a provenance panel.

---

## 14. Mobile Experience Model

### Current Mobile Implementation

- Viewport tag: `width=device-width, initial-scale=1, viewport-fit=cover`
- Safe area: `padding-bottom: env(safe-area-inset-bottom)` on bottom-nav and pages
- Touch targets: 44px minimum enforced at `max-width: 900px`
- Navigation: Hamburger → 3-column dropdown grid (18 items)
- Touch swipe: Left/right swipe on `#pageWrap` (55px threshold, `dx > dy * 1.5`)
- Responsive: No horizontal overflow at any tested viewport (375–1660px)
- PWA: `<link rel="manifest">`, apple-mobile-web-app-capable

### Mobile UX Problems

1. **Navigation model mismatch.** A 3-column grid dropdown with 18 tap targets is a desktop web pattern adapted for mobile, not a native mobile experience.
2. **Swipe navigation is implemented but invisible.** No swipe indicator, no page counter, no swipe hint. Users won't discover it.
3. **Command experience degraded on mobile.** 3-column command layout (`cmd-split`) doesn't work well at 375px; the `cmd-feed-col` is hidden at 900–1099px.
4. **Voice button requires Command page.** On mobile, voice is the most natural input — it should be globally accessible.
5. **Bottom nav at <900px.** Bottom nav exists (`--nav-h: 60px`) but the items in it are not clear from source — need to verify what primary destinations are shown.
6. **Content density.** Many pages use 3+ column grids that collapse poorly on 375px.

### Proposed Mobile-First Architecture

```
MOBILE STRUCTURE:

[ Top bar: Page title + Voice trigger + Notification badge ]

[ Content area: Full width, single column, swipeable ]

[ Bottom tab: NOW | CMD | ACTIONS | LIFE | ··· ]

INTERACTIONS:
  - Swipe left/right: Navigate between primary tabs (visible swipe indicator)
  - Pull down: Refresh current page
  - Tap ···: Sheet slides up with secondary destinations
  - Long press on content: Context menu
  - Voice: Persistent microphone in top bar
  
MOBILE-SPECIFIC SURFACES:
  - Sheets (bottom): Agent detail, approval detail, notification detail
  - Drawers (side): Navigation, settings
  - Cards: Action-focused — one primary action always visible
  
WHAT COLLAPSES TO SHEET:
  - System detail → Sheet
  - Memory detail → Sheet
  - Agent run trace → Sheet
  - Knowledge panel → Sheet
  - Evidence panel → Sheet
  
WHAT BECOMES ACTION-FIRST:
  - Approval cards: Large approve/reject buttons as primary CTAs
  - Task cards: "Run" or "View" as primary CTA
  - Briefing: "Read more" as primary CTA
```

**Mobile viewport classification:**
- 375–480px: Mobile phone — bottom tabs, single column, sheets
- 481–768px: Large phone / compact tablet — bottom tabs, single-column with wider cards
- 769–1024px: Tablet portrait — sidebar or bottom tabs, 2-column content
- 1025px+: Desktop — full sidebar, multi-column content

---

## 15. Perceived Performance Gap Register

### Current Measured Performance (local, V-09 certified)

| Metric | Value | Target |
|--------|-------|--------|
| TTFB | 46ms | <100ms |
| FCP | 394ms | <1000ms |
| DCL | 1,249ms | <1,500ms |
| Boot requests (10s) | 35 | <30 |
| Duplicate groups | 3 | 0 |

### Perceived Performance Gaps (beyond DCL metrics)

| Gap | Evidence | Impact |
|-----|----------|--------|
| Health page fires 15 API calls on navigation | Playwright observation | Visible panel population delay |
| Occult page fires 21 API calls on navigation | Playwright observation | Heaviest navigation in system |
| Reality page fires 16 API calls on navigation | Playwright observation | Significant navigation delay |
| Chat/command response has no streaming | Source inspection | "Black box" feeling; long wait for answer |
| Agent task completion has no notification | Journey analysis | User must poll for results |
| Intelligence briefing has 6h cache but no stale indicator | API inspection | User sees old data with no awareness |
| Finance empty state shows blank panel | API inspection | Looks broken, not empty |
| Rate limiter at 300 req/15min may be hit in active sessions | Server config | Unexpected "Too many requests" to user |
| Boot requires 35 HTTP requests | V-09 certification | 35 is still high |
| WS connection unreliable | Browser test | Live updates not always available |
| No optimistic UI updates | Architecture | Every action requires round trip before feedback |
| No prefetching on navigation hover/intent | Architecture | Each page navigation fires all API calls cold |

### Perceived Performance Anti-Patterns to Eliminate

1. **Blank panels.** A panel that transitions from blank → populated is perceived as slow even when fast.
2. **Multiple panels loading independently.** Each panel with its own loading state creates visual chaos.
3. **No streaming on AI responses.** Every character that appears as it's generated reduces perceived wait time by 40–60%.
4. **No optimistic updates.** Approve task → wait for API → panel updates. Should be: approve → panel updates immediately → API confirms.
5. **No progress on long-running operations.** Research agent, code review, etc. — user has no indication of progress.

---

## 16. Visual Language Audit

### Current Design System State

APEX has **two CSS token namespaces in conflict:**

**Namespace A — v11 tokens** (`:root`, declared first):
```css
--bg: #000000
--primary: #5e6ad2          /* indigo */
--accent: #a78bfa
--border: rgba(94,106,210,0.2)
```

**Namespace B — APEX Zero tokens** (`apex-zero.css` + inline `:root` block):
```css
--apex-color-bg: #03060f
--apex-color-primary: #00d4ff     /* cyan */
--apex-color-secondary: #0066ff
--apex-color-border: rgba(0,212,255,0.16)
```

**Impact:** Some components use `--primary` (indigo), others use `--apex-color-primary` (cyan). The Phase F style block exists explicitly to correct 4 hardcoded indigo values. This dual namespace is a source of visual inconsistency.

### Typography

Three typefaces in use:
- **Cinzel** (serif): Page titles, APEX brand wordmark — `letter-spacing: 0.16em`
- **JetBrains Mono** (monospace): Labels, subtitles, metadata, system values — dominant in system pages
- **Inter** (sans-serif): Body text, buttons, content — primary reading typeface

Assessment:
- Cinzel for a page title like "SYSTEM" adds gravitas but reduces scannability
- JetBrains Mono as the label typeface across ALL domain pages creates a "developer console" aesthetic even in user-facing contexts (Health, Finance, Communications)
- Inter is appropriate for content but is underused relative to JetBrains Mono

### Color

- Primary canvas: Pure black `#000000` — correct for APEX Zero
- Animated dot grid: `rgba(94,106,210,0.13)` — indigo remnant, conflicts with cyan primary
- Accent system: Indigo (`#5e6ad2`) vs Cyan (`#00d4ff`) — both present simultaneously
- Status colors: Green (success), Amber (warning), Red (danger), Cyan (info) — consistent
- Text hierarchy: 4 levels (`--text`, `--text-2`, `--text-mute`, `--muted2`) — appropriate

### Spacing

- Page padding: Not directly visible without render; CSS grid used throughout
- Card/panel structure: `ds-panel` with `ds-panel-header`, `ds-panel-header-left`
- Consistent: `border-radius` primarily 8px, 12px, 14px
- Nav heights: `--topbar-h: 52px`, `--nav-h: 60px`, `--input-h: 54px`

### Component Vocabulary (Current)

Found in source:
- `ds-panel` — primary content container
- `ds-panel-header` / `ds-panel-header-left` — panel headers
- `ds-stat-card` — metric display card
- `ds-btn` (with variants: `xs`, `cyan`, `grey`) — buttons
- `ds-badge` — status badges
- `ds-dot` (with: `.green`, `.amber`, `.red`, `.cyan`, `.pulse`) — status indicators
- `ds-grid-2`, `ds-grid-3`, `ds-grid-agents` — layout grids
- `ds-spinner` — loading indicator
- `ds-empty-icon` — empty state icon
- `ds-input` — form input
- `t-label` — label typography
- `ds-page-title` — page title
- `cmd-palette` / `cmd-box` / `cmd-input` / `cmd-list` — command palette
- `apex-feed` / `apex-feed-hdr` / `apex-feed-body` / `apex-feed-entry` / `apex-tag` — activity feed
- `panel-error` — error state in panels
- `ax-bounce-in`, `ax-shake`, `ax-spin-cls` — animation utilities

### Design System Gaps

1. **No unified card component for APEX objects.** Agent runs, tasks, notifications, memories, opportunities — all rendered differently.
2. **No disclosure pattern component.** L0→L4 progressive disclosure not in the component library.
3. **No sheet/drawer component.** Modal exists but no bottom sheet for mobile detail views.
4. **No toast notification component.** `ds-toast` exists in CSS but usage not clear.
5. **No skeleton loading standardisation.** Some panels use `Loading…` text; others are blank.
6. **No voice state component.** Voice button exists but no global voice state system.
7. **No empty state template.** Each page implements empty states ad hoc (many as blank divs).
8. **No confirmation/undo pattern.** Agent actions complete without confirmation animation or undo prompt.

---

## 17. Future Component Vocabulary

Based on evidence, the minimum canonical component set required for the complete APEX product:

### Shell Components
- `ApexShell` — App wrapper with safe areas, dark canvas
- `TopBar` — Page title, time, notification badge, voice trigger
- `BottomNav` — 5-tab primary navigation (mobile)
- `SideNav` — Full navigation (desktop)
- `MoreSheet` — Bottom sheet with secondary destinations

### Content Components
- `ApexCard` — Universal object card with L0 summary, expand to L4
- `ApexSection` — Page section with header, action, content
- `MetricCell` — Single metric with label, value, trend
- `MetricRow` — Horizontal metric group
- `TimelineItem` — Activity/history item with timestamp, actor, event
- `AgentRunCard` — Agent run with objective, status, cost, expandable trace
- `ApprovalCard` — Pending approval with objective, evidence, approve/reject
- `NotificationItem` — Notification with title, body, action

### Intelligence Components
- `BriefingCard` — L0: headline + key insight; L1: full briefing; L2: evidence
- `OpportunityCard` — Opportunity with confidence, evidence, action
- `InsightCard` — Generic intelligence insight with provenance
- `MemoryCard` — Memory entry in human-readable form

### Disclosure Components
- `DisclosurePanel` — L0→L4 progressive disclosure container
- `EvidencePanel` — Evidence list with sources and confidence
- `ReasoningPanel` — Reasoning chain display
- `ExecutionTrace` — Step-by-step agent execution
- `ProvenanceTag` — Source + timestamp indicator

### State Components
- `LoadingState` — Shimmer/skeleton with message
- `EmptyState` — Illustration + CTA for first-use
- `NoResultsState` — Empty search results
- `ErrorState` — User-friendly error with retry
- `StaleState` — Data freshness warning
- `PartialState` — Partial data warning

### Action Components
- `ActionBar` — Primary + secondary actions for a context
- `ApproveRejectBar` — Dedicated approval/rejection UI
- `UndoBanner` — Post-action undo prompt
- `ConfirmModal` — Confirmation dialog for destructive actions

### Communication Components
- `Toast` — Ephemeral notification (success/error/info)
- `GlobalNotification` — Persistent alert
- `VoiceStateIndicator` — Listening / thinking / speaking states
- `PresenceIndicator` — WS connected / offline / syncing

### Input Components
- `CommandInput` — Primary AI command surface with voice trigger
- `SearchInput` — Global search (command palette)
- `InlineForm` — Contextual form within card (add transaction, log habit)

### Chart Components
- `SparkLine` — Trend line for metrics
- `ProgressBar` — Progress toward goal/budget
- `StatusBar` — Multi-segment status (health dimensions)
- `TimeChart` — Time series with Chart.js wrapper

---

## 18. Product Experience North Star

### Opening APEX

You open APEX. The screen is pure black with a subtle indigo dot grid drifting slowly. The top bar shows the time and a small green pulse — "connected." At the centre of the screen is a single, calm surface.

On it: your daily briefing headline — one sentence, what matters most today. Below it, three items: one that needs your approval, one insight APEX has surfaced, one health check. That's it. No noise. No technical labels. Just signal.

### Finding Important Information

You glance at the Now surface. It answers your questions before you ask them: "What's important?" at the top. A notification badge tells you there's one pending approval. The system health is fine. Your cost for today is $0.03.

You don't need to navigate anywhere to understand where you are.

### Understanding an Insight

You tap the briefing headline. It expands inline. You see the full briefing. Below it: "Show evidence" — tap — three data points appear. "Show reasoning" — tap — APEX explains why it reached this conclusion, which sources it used, what confidence level applies. You understand not just what APEX thinks, but why.

### Asking APEX Something

You tap the Command tab. The input is full-width, clean, present. You type: "Research the AI privacy compliance market." APEX says: "Researching. This may take 30–60 seconds." A subtle progress indicator pulses. 47 seconds later, a structured card appears: headline, three key findings, five sources, confidence level, recommended next steps. You tap "Show full research" to expand.

### Asking APEX to Act

You type: "Add a meeting with James next Thursday at 3pm." APEX replies: "I'll add that. It needs your approval first." Below the message, two buttons appear inline: "Approve" and "Change details." You tap Approve. The meeting is created. A brief "✓ Done" toast fades away.

### Approving an Action

Your approval badge shows `1`. You tap Actions. An approval card is front and center: "Create calendar event — James / Thursday 14:00 / 1hr." Below: "Cost: $0.00 · No data accessed · Reversible." Approve / Reject with one tap. After approval, an undo banner appears for 8 seconds. You don't need it.

### Understanding What APEX Did

You tap the Now tab and pull down to reveal "Last 24 hours." A timeline shows: "09:14 — Briefing generated ($0.02) · 11:30 — Research completed ($0.47) · 14:02 — Calendar event created ($0.00)." Tap any item to see its full trace.

### Inspecting Evidence

A briefing card says "AI privacy compliance is an emerging opportunity." You tap "Where does this come from?" A panel slides up: three research documents, two web sources, confidence 0.76, last refreshed 2 hours ago. Each source is tappable. APEX tells you exactly why it believes this.

### Viewing History

The timeline shows the last 30 days of APEX activity. Each agent run is a card — tap to expand. You find the research run from two weeks ago and can see every step it took, every source it accessed, what it cost, and what it concluded.

### Using Voice

You press the microphone button in the top bar. The button glows and a subtle waveform appears. "What's my briefing today?" APEX thinks for 2 seconds — the waveform pulses. Then it speaks the briefing aloud while showing the same briefing card on screen. You say "Add a task to follow up on the opportunity" — APEX creates the task. No typing.

### Using Mobile

On your phone, APEX looks native. Bottom tabs: Now, Command, Actions, Life, ···. The Now tab is your home. You swipe right to Command. You tap the microphone. You say what you need. You swipe left to Actions to approve. Everything fits in reach.

### Recovering from Errors

Something went wrong. APEX shows: "I couldn't research the market — the search service is temporarily unavailable. I've saved your request and will retry in 10 minutes. You can also try manually: [button]." No technical error. No blank screen. A clear state. A clear path.

---

## 19. Design Principles

Based on evidence — not aspiration:

1. **Intelligence first, complexity on demand.** The default view communicates APEX's conclusions, not its architecture. System detail is always one tap deeper.

2. **Everything earns its primary navigation slot.** Primary navigation requires: a distinct purpose, daily relevance, an action the user needs to take. System internals do not qualify.

3. **State is never ambiguous.** Every surface communicates exactly: loaded / loading / empty / error / stale. These states are visually distinct.

4. **Every surface has a provenance.** Every piece of information that APEX surfaces carries: source, freshness, and confidence. Not always visible — but accessible via `ℹ`.

5. **Approval is an opportunity, not a gate.** Every approval surface shows: what APEX plans to do, why, what it will cost, what the risk is, and how to reverse it. Approval is not a barrier — it's a moment of informed collaboration.

6. **Voice is a first-class input everywhere.** Not a feature on one page — a primary interface available from anywhere in APEX.

7. **Progressive, not regressive.** Information progresses from human-readable summary to technical detail. APEX never presents raw data without a human translation at L0.

8. **One object, one canonical form.** A task looks like a task everywhere. An agent run looks like an agent run everywhere. An insight looks like an insight everywhere.

9. **Mobile is not a shrunk desktop.** Mobile APEX is designed for touch, swipe, voice, one-handed use. It has a different layout model, not a scaled-down version of the desktop.

10. **The system explains itself.** A user should always be able to ask "Why?" and get an answer — about any APEX decision, recommendation, or action.

---

## 20. Anti-Patterns to Prohibit

These patterns exist in the current interface and must not appear in V-11 onward:

1. **Raw technical IDs in user-facing UI.** `ep-mthdz8dc-m1iu` must never appear outside System/Debug views.
2. **Float values without human context.** `confidence: 0.7789473684210526` → "78% confident".
3. **Blank panels.** A panel that renders nothing must always show a state — loading, empty, or error.
4. **Navigation as the primary mechanism for progressive disclosure.** Detail does not require a page change. It requires an expand.
5. **Constitution Charter as primary page content.** Governance documents belong in a Governance or Settings section, not on the primary Command surface.
6. **20 equal-weight navigation destinations.** No navigation system should present 20 items at the same visual hierarchy.
7. **Agent actions completing without user awareness.** Every completed agent action should be observable.
8. **Dual token namespaces.** One canonical token namespace per design system. No overrides.
9. **JetBrains Mono for all labels on user-facing domain pages.** Mono typeface appropriate for system/developer surfaces only; Inter for all life/health/finance/communications content.
10. **Rate limiters that silently fail.** If a rate limit is hit, APEX must say so in plain language and indicate when the user can try again.
11. **Missing empty state onboarding.** First-use empty states are onboarding opportunities, not errors. They must have a clear action.
12. **Opaque page names.** `occult`, `civilisation`, `reality` (without context) are not self-describing. All primary navigation must communicate purpose.

---

## 21. Proposed Implementation Programme

### V-11: Navigation & Shell Restructure
- Reduce primary nav from 20 to 5–7 destinations
- Implement bottom tab bar (mobile) + sidebar (desktop)
- Create "Now" as the primary landing surface
- Move System/Memory/Reality/Governance to secondary access
- Implement command palette with Cmd+K shortcut
- Implement global voice trigger in top bar

### V-12: State System & Empty States
- Implement canonical state model (Loading, Empty, NoResults, Error, Stale, Partial, Processing)
- Standardise skeleton loading across all panels
- Implement "first-use" onboarding for Finance, Health
- Fix `/api/intelligence/opportunities` DB schema defect
- Fix `/briefing/today` and `/briefing/priority-inbox` 404 routes

### V-13: Progressive Disclosure & Object Model
- Implement canonical APEX object card (L0 → L4)
- Implement disclosure panel (expandable in-place)
- Implement provenance tag on every data source
- Implement evidence panel and reasoning panel
- Create agent run card with execution trace

### V-14: Now Surface & Intelligence
- Build "Now" page: briefing headline, priority actions, recent agent activity
- Surface autonomy score in accessible UI
- Surface memory health summary in accessible form
- Implement "What APEX is doing" timeline
- Implement priority-inbox surface

### V-15: Command Experience
- Rebuild Command page: full-width chat, persistent history
- Implement streaming AI responses
- Implement structured result cards (research, tasks, calendar)
- Implement inline approval prompt within chat
- Implement undo banner for completed actions

### V-16: Mobile-First Architecture
- Implement native bottom tab navigation
- Implement swipe indicators and page counter
- Implement sheet/drawer components for detail views
- Make approval/action cards mobile-first with large touch targets
- Global voice trigger on all screens

### V-17: Visual Language Unification
- Consolidate to single CSS token namespace (APEX Zero / cyan primary)
- Replace Cinzel for non-brand-mark page titles
- Restrict JetBrains Mono to system/developer contexts
- Implement dark/amoled variants
- Standardise motion system

---

## 22. Dependencies

| Dependency | Blocks |
|------------|--------|
| Fix `evidence_refs` DB schema | V-12: Opportunities panel |
| Fix `/briefing/today` route | V-12: Priority inbox |
| WebSocket reliability | V-16: Live state |
| Streaming API support | V-15: Command experience |
| Finance data population | V-12: Finance empty state |
| Memory API human-readable layer | V-13: Memory card |

---

## 23. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Navigation reduction breaks existing keyboard shortcuts | Medium | High | Map existing shortcuts to new destinations before removing old ones |
| `dashboard.html` monolith limits component architecture | High | High | All V-11+ changes remain within monolith; no split required |
| DCL regression from new component overhead | Medium | Medium | Maintain V-09 measurement scripts; gate each phase |
| 20 existing pages have active JS — deferred pages may lose state | Medium | Medium | Test all `switchPage` hooks after restructure |
| Rate limiter friction during active sessions | Medium | High | Increase `max` on generalLimiter for authenticated requests, or skip for app key |
| WS connectivity inconsistent | High | Medium | Implement graceful offline degradation; show stale state clearly |
| Dual token namespace produces visual regression during migration | High | Medium | Migrate incrementally with visual regression tests |

---

## 24. Open Questions

1. Should the constitutional charter remain on Command page or move to Governance/Settings?
2. Should "occult" be renamed or merged? If renamed, what is the user-facing concept?
3. Is the Reality framework user-relevant or system-internal only?
4. Should finance budget/transaction input be surfaced from Command (e.g., "log £20 groceries")?
5. What is the intended scope of the Civilisation model from a user-facing perspective?
6. Is PlasmaOrb retained as the voice state indicator, or replaced with a simpler animation?
7. Should WebSocket provide real-time panel updates (push) or remain supplementary?
8. What is the desired session persistence model — does APEX remember conversation history across sessions?
9. Is multi-user support a future consideration? (Current auth is single-user password only)
10. What is the autonomy level intent — when should APEX act without asking?

---

## 25. Explicit Recommendations for V-11 Onward

### Immediate (V-11)

1. **Implement the 5-destination primary navigation model.** Now, Command, Actions, Life, System. Everything else is secondary.
2. **Make "Now" the default landing page.** The first thing a user sees should answer "What matters today?"
3. **Consolidate Command page.** Remove constitution from Command. Keep: input, streaming response, recent messages, voice.
4. **Global voice trigger.** Remove voice from being exclusive to Command page. Put it in the top bar.
5. **Implement bottom tab navigation on mobile.** Replace the dropdown grid.

### Architecture Rules to Establish

6. **One token namespace.** Before any V-11 CSS is written, deprecate v11 tokens and migrate everything to APEX Zero tokens.
7. **Canonical object card.** Before writing any new panel, implement the `ApexCard` component that supports L0→L4.
8. **State model contract.** Before any new data panel, define which of the 12 states it can be in and how it renders each one.
9. **No navigation as disclosure.** If additional information about an item requires a page change, that's a design defect. Add an expand.
10. **Human label required.** No technical ID, float, or system term may appear in a user-facing context without a human translation.

### Fix Before V-11

11. **Fix `/briefing/today` and `/briefing/priority-inbox` routes** — these power the primary "What needs me" feature.
12. **Fix `/api/intelligence/opportunities` schema** — this is a primary intelligence surface.
13. **Add `apex_session` cookie to BYPASS_DASHBOARD_AUTH** — critical for test/development workflow.

---

## Appendix A: Known Defects at Reconnaissance Date

| ID | Endpoint | Status | Root Cause | Priority |
|----|----------|--------|------------|---------|
| D-01 | `/api/intelligence/opportunities` | 500 | `evidence_refs` column missing in DB | HIGH |
| D-02 | `/briefing/today` | 404 | Route not mounted or path incorrect | HIGH |
| D-03 | `/briefing/priority-inbox` | 404 | Route not mounted or path incorrect | HIGH |
| D-04 | WebSocket | Unreliable | Connection not established in browser test | MEDIUM |
| D-05 | Finance summary | Empty | No data seeded — acceptable | LOW |

---

## Appendix B: Performance Baseline at Reconnaissance Date

| Metric | Local (V-09) | Production |
|--------|-------------|-----------|
| TTFB | 46ms | ~272–318ms |
| FCP | 394ms | ~1,587–1,632ms |
| DCL | 1,249ms | ~2,276–4,276ms (PlasmaOrb variance) |
| Boot requests (10s) | 35 | 35 |
| Dupe groups | 3 | 3 |
| Health page API calls | 15 on nav | 15 on nav |
| Occult page API calls | 21 on nav | 21 on nav |
| Reality page API calls | 16 on nav | 16 on nav |

---

## Appendix C: Source Evidence Index

| Evidence | Location | Method |
|----------|----------|--------|
| Page/navigation model | `dashboard.html:10310–10330` | Source read |
| Auth overlay | `dashboard.html:6246–6264, 14506–14544` | Source read |
| Design tokens (v11) | `dashboard.html:22–58` | Source read |
| Design tokens (APEX Zero) | `dashboard.html:5937–5976` | Source read |
| Mobile navigation dropdown | `dashboard.html:6307–6328` | Source read |
| Command palette | `dashboard.html:6266–6272` | Source read |
| System page structure | `dashboard.html:6521–6650` | Source read |
| Boot performance (V-09) | `docs/interface/V-09-IMPLEMENTATION-CERTIFICATION.md` | Documentation |
| API capability inventory | `routes/`, `src/routes/` | Agent analysis |
| Live API data | Direct HTTP requests with x-app-key | API testing |
| Browser behaviour | `playwright-v10-recon.js` output | Browser automation |
| Production baseline | `docs/interface/V-10-PRODUCTION-BASELINE-FREEZE.md` | Documentation |

---

**V-10 RECONNAISSANCE COMPLETE**

*Recorded: 2026-08-31*  
*Application code changes: NONE*  
*Production: UNCHANGED*  
*V-11: NOT STARTED — AWAITING AUTHORISATION*
