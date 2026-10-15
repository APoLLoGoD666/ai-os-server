# UX-01 — Canonical UX Discovery

**Programme**: APEX UX Phase  
**Task ID**: UX-01  
**Status**: COMPLETE  
**Date**: 2026-08-26  
**Auditor**: Claude (claude-sonnet-4-6)  
**Type**: Design / Discovery — ZERO APPLICATION MODIFICATIONS  

---

## 1. Authority

This document is the authoritative canonical UX blueprint for APEX.

It derives authority from:
- UX-00 (accepted legacy baseline, 2026-08-26)
- APEX Constitutional Architecture (A1–A6)
- Canonical Tree-of-Life direction
- APEX runtime and agent architecture (CLAUDE.md, project memory)
- KG-01 through KG-08 knowledge system (certified 2026-08-26)

This document governs all subsequent UX implementation phases.

No implementation phase may deviate from this blueprint without explicit authorisation and a recorded design decision.

---

## 2. Relationship to UX-00

UX-00 established the authoritative baseline of the legacy interface. That baseline is consumed here — not automatically implemented.

| UX-00 finding | UX-01 disposition |
|---------------|------------------|
| 14-page SPA with CSS transition navigation | Navigation architecture retained; page count consolidated |
| 5 competing `:root` token sets | Replaced by one canonical token set |
| 4 distinct voice mechanisms | Collapsed into one canonical APEX Voice |
| 4 polling intervals | Replaced by WebSocket event subscription |
| Monolithic 20,826-line HTML | Architecture decision deferred to UX-02 (engineering phase) |
| Plasma orb (command page) | PROTECTED — core APEX presence element |
| Activity feed | PROTECTED — core transparency mechanism |
| Constitutional charter | PROTECTED — core identity element |
| `data-fn` event delegation | PROTECTED — retain as interaction pattern |
| Dual auth (JWT + localStorage API key) | localStorage key to be retired (security) |
| Knowledge-Gap system invisible from UI | NEW — knowledge state surfaces throughout |
| Missing approval/decision UI | NEW — Decisions surface defined |
| CSS cascade chaos | REWORK — single design token source |
| 14 page stubs (occult, research, civilisation, browser) | Reorganised under World surface |

UX-00 design recommendations are distinct from UX-01 design decisions. Where UX-00 proposed and UX-01 decides, this document is the record of that decision and its rationale.

---

## 3. UX-01 Scope

UX-01 defines what APEX should be for the user — not how it is built.

In scope:
- Canonical UX model (the fundamental relationship)
- User and task model
- Information architecture
- Three experience layers
- Visual identity principles
- Command Centre specification
- All communication channels (Converse, Present, Notify)
- Voice UX
- Knowledge UX
- Intelligence UX
- Agent UX
- Action and Decision UX
- Memory UX
- Activity UX
- Constitutional / system UX
- Responsive and mobile UX
- Accessibility requirements
- UX state model
- Terminology
- Progressive disclosure model
- Canonical UX principles
- Legacy preservation decisions

Out of scope (deferred to implementation phases):
- Frontend framework selection
- Component implementation
- CSS architecture
- JS module architecture
- Voice provider integration
- Notification transport
- Realtime transport
- Authentication refactor
- Database changes
- Route changes

---

## 4. Design Objectives

**DO-01**: Define a human experience that matches the sophistication of the APEX backend.

**DO-02**: Preserve the APEX identity — dark, purposeful, command-oriented, alive.

**DO-03**: Collapse fragmented capabilities into one coherent experience.

**DO-04**: Make APEX intelligence observable and trustworthy without being overwhelming.

**DO-05**: Establish three first-class communication channels: Converse, Present, Notify.

**DO-06**: Ground the UX in what a human actually wants to do, not in backend module structure.

**DO-07**: Define a stable architecture that can grow with APEX's capabilities.

**DO-08**: Protect human authority explicitly throughout.

**DO-09**: Never leave the user wondering whether something is happening.

**DO-10**: Earn the right to interrupt.

---

## 5. Canonical UX Model

### 5.1 The Fundamental Relationship

```
USER
  │
  ▼
COMMAND CENTRE   ──── APEX Presence (orb)
  │                   APEX Voice (unified)
  │                   Conversation
  │                   Text input
  │
  ├─── CONVERSE ──────► APEX Intelligence ─────► spoken / text response
  │                                        ├────► contextual presentation
  │                                        └────► activity record
  │
  ├─── PRESENT  ◄────── APEX decides to show ─────► contextual panel
  │                                                  (adjacent to orb)
  │
  ├─── NOTIFY   ◄────── APEX proactively signals ──► feed / banner / decision
  │
  ├─── DECIDE  ────────► Approval surface
  │
  └─── EXPLORE ─────────► World surface (Tree of Life)
                           Knowledge surface
                           Activity surface
                           System surface
```

### 5.2 What the Command Centre Must Be

The Command Centre is the primary environment through which APEX can:

| Capability | Mechanism |
|-----------|-----------|
| Listen | Voice activation via orb or shortcut |
| Understand | APEX processes intent; user sees thinking state |
| Think | Knowledge retrieval, reasoning, agent coordination |
| Speak | Canonical APEX Voice — one unified output |
| Show | Contextual presentation surface — adjacent to orb |
| Ask | APEX may ask clarifying questions in conversation |
| Recommend | Intelligence layer — evidence-backed proposals |
| Act | After explicit human approval |
| Notify | Activity feed + proactive channel |
| Remember | Conversation leads to memory — user-controlled |
| Explain | Progressive disclosure — "Why?" expands evidence |

The Command Centre is not a chat page. It is the environment through which a human commands and is informed by an intelligent personal operating system.

### 5.3 APEX as Presence, not Application

APEX has a presence — the orb. The orb is not decorative. It communicates state, invites interaction, and signals that APEX is ready. The user should feel that APEX is attentive and capable, not that they are using a piece of software.

This is the fundamental distinction between the APEX UX and a conventional AI assistant interface:

| Conventional AI assistant | APEX |
|--------------------------|------|
| Text in, text out | Living environment |
| Chat history as context | Memory as first-class entity |
| One modality | Three channels: Converse, Present, Notify |
| System answers when asked | APEX is proactively present |
| No visual context | Contextual presentation surface |
| Generic interface | Personal operating environment |

---

## 6. User / Task Model

### 6.1 Principle

The UX is structured around what a human actually wants to accomplish — not around the backend's internal organisation. Backend modules and agent domains are implementation details, not user intentions.

### 6.2 Canonical Task Map

Each task below defines the complete interaction model:

---

**TASK-01: "What's happening?"**

| Step | Detail |
|------|--------|
| Intent | Situation awareness — current state of my world |
| Entry point | Command Centre (default view); or voice: "What's happening?" |
| Interaction | Voice or text query |
| APEX response | Spoken summary of active items, recent changes, pending items |
| Presentation | Activity feed highlights; contextual status strip |
| Action | Optional: "Tell me more about [item]" |
| Result | User has situational awareness |
| Memory/record | Activity log |

---

**TASK-02: "Tell me what I should do."**

| Step | Detail |
|------|--------|
| Intent | Prioritisation and recommendation |
| Entry point | Voice or text from Command Centre |
| Interaction | Natural language |
| APEX response | Spoken recommendation with top 2–3 priorities |
| Presentation | Priority card panel — items with brief rationale |
| Action | Select an item to expand; approve or defer |
| Result | User has an action plan |
| Memory/record | Decision record logged |

---

**TASK-03: "Why?" / "Why did you do that?"**

| Step | Detail |
|------|--------|
| Intent | Explanation — understanding APEX reasoning |
| Entry point | Follow-up in active conversation; or from activity feed |
| Interaction | Single word "Why?" or contextual question |
| APEX response | Natural language explanation of reasoning |
| Presentation | Evidence panel: sources, confidence, alternatives considered |
| Action | "Show me the evidence." goes deeper |
| Result | User understands basis for APEX action or recommendation |
| Memory/record | Explanation linked to activity record |

---

**TASK-04: "Show me."**

| Step | Detail |
|------|--------|
| Intent | Visual contextualisation of spoken information |
| Entry point | Conversation follow-up; or APEX proactively invokes |
| Interaction | "Show me." or "Show me my [domain] overview." |
| APEX response | Contextual presentation surface activates adjacent to orb |
| Presentation | Domain-specific: metrics, charts, timeline, comparison |
| Action | Tap/click to expand; "Explain this." for detail |
| Result | Visual context supplements spoken conversation |
| Memory/record | Presentation context linked to session |

---

**TASK-05: "Do it."**

| Step | Detail |
|------|--------|
| Intent | Execute a proposed action |
| Entry point | Following APEX recommendation or user-initiated request |
| Interaction | "Do it." / "Yes." / "Go ahead." |
| APEX response | Confirms action, initiates execution, provides progress |
| Presentation | Action status panel — executing → completed / failed |
| Action | If authority required: routes to Decisions surface first |
| Result | Action executed; outcome recorded |
| Memory/record | Action record with authority, outcome, timestamp |

---

**TASK-06: "I don't agree." / "Stop." / "Don't do that."**

| Step | Detail |
|------|--------|
| Intent | Override, correction, or rejection |
| Entry point | Any point in conversation or from Decisions surface |
| Interaction | Natural language or explicit Reject button |
| APEX response | Acknowledges override, halts action, asks for correction |
| Presentation | Action status shows REJECTED |
| Action | APEX asks: "Would you like me to do something different?" |
| Result | Action stopped; correction optionally captured |
| Memory/record | Override recorded; preference learned if applicable |

---

**TASK-07: "Remember this."**

| Step | Detail |
|------|--------|
| Intent | Explicit memory capture |
| Entry point | Any conversation turn; or "Remember: [fact]" |
| Interaction | Natural language instruction |
| APEX response | Confirms what it will remember; confirms domain |
| Presentation | Memory confirmation chip in conversation |
| Action | User can edit before confirming |
| Result | Memory stored; linked to conversation context |
| Memory/record | Memory record with source, domain, timestamp |

---

**TASK-08: "What do you know about this?"**

| Step | Detail |
|------|--------|
| Intent | Knowledge inspection |
| Entry point | Conversation; or Knowledge surface |
| Interaction | Natural language or explicit knowledge query |
| APEX response | Knowledge summary: what is known, freshness, confidence |
| Presentation | Knowledge panel: facts, evidence refs, gaps, freshness indicators |
| Action | "Show me the evidence." / "Research this." |
| Result | User understands APEX knowledge state on subject |
| Memory/record | Knowledge query logged |

---

**TASK-09: "Something needs my attention."**

| Step | Detail |
|------|--------|
| Intent | Attend to a notification or alert |
| Entry point | Activity feed; notification banner; APEX verbal alert |
| Interaction | Tap/click notification; or voice: "What's urgent?" |
| APEX response | Describes situation, provides context, states what is required |
| Presentation | Notification detail panel with context and options |
| Action | Acknowledge / Act / Defer / Dismiss |
| Result | Notification resolved or deferred |
| Memory/record | Notification record updated |

---

**TASK-10: "What are you doing?"**

| Step | Detail |
|------|--------|
| Intent | Activity transparency — understanding APEX behaviour |
| Entry point | Activity surface; or voice: "What are you working on?" |
| Interaction | Natural language or tap to expand activity feed |
| APEX response | Summary of current and recent activity |
| Presentation | Activity feed with agent attribution, action types, status |
| Action | Tap any item for full detail; "Why?" for reasoning |
| Result | User has full transparency of APEX autonomous activity |
| Memory/record | Activity log (always on) |

---

**TASK-11: "Can I approve this?" / "What needs my decision?"**

| Step | Detail |
|------|--------|
| Intent | Approval queue review |
| Entry point | Decisions surface (keyboard shortcut A); notification; voice |
| Interaction | Voice: "What needs my approval?" or navigate to Decisions |
| APEX response | Describes pending decisions in order of priority |
| Presentation | Decision panel per item: proposed action, why, evidence, risks, alternatives |
| Action | APPROVE / REJECT / MODIFY / DEFER / ASK APEX |
| Result | Decision recorded with authority timestamp |
| Memory/record | Decision record with full provenance |

---

**TASK-12: "Find [information]."**

| Step | Detail |
|------|--------|
| Intent | Information retrieval |
| Entry point | Conversation; or Knowledge surface |
| Interaction | Natural language |
| APEX response | Retrieves from memory/knowledge base or acknowledges gap |
| Presentation | Results card or knowledge state panel |
| Action | "Research this." if gap detected |
| Result | Information returned or gap surfaced |
| Memory/record | Query logged; knowledge access tracked |

---

**TASK-13: "What agents do you have? What are they doing?"**

| Step | Detail |
|------|--------|
| Intent | Agent transparency |
| Entry point | System surface; or conversation |
| Interaction | Natural language or navigate to Agents view |
| APEX response | Summary of agents, their roles, current status |
| Presentation | Agent council view — roles, capabilities, current task |
| Action | Tap agent for detailed view; chat with specific agent |
| Result | User understands APEX's operational capability |
| Memory/record | — |

---

**TASK-14: "Correct this." / "That's wrong."**

| Step | Detail |
|------|--------|
| Intent | Correction — teaching APEX |
| Entry point | Any response or presentation from APEX |
| Interaction | "That's wrong." / "Actually, [correct fact]." |
| APEX response | Acknowledges correction, asks for clarification if needed |
| Presentation | Correction confirmation chip |
| Action | Optionally: "Update my memory." |
| Result | Correction captured; knowledge updated if appropriate |
| Memory/record | Correction linked to prior assertion |

---

**TASK-15: "Explore [domain]."**

| Step | Detail |
|------|--------|
| Intent | Domain exploration |
| Entry point | World surface; or conversation: "Show me my [domain]." |
| Interaction | Navigation or natural language |
| APEX response | Domain context with current state, recent changes, active items |
| Presentation | Domain overview panel — metrics, recent activity, open items |
| Action | Drill into specific items; "What should I focus on here?" |
| Result | User has domain situational awareness |
| Memory/record | Navigation logged; domain interest tracked |

---

## 7. Information Architecture

### 7.1 Principle

The information architecture is structured around the five things a user wants to do with APEX — not around the system's internal modules.

This produces **five canonical surfaces**:

```
COMMAND        WORLD         DECISIONS      KNOWLEDGE      SYSTEM
─────────      ─────────     ─────────      ─────────      ─────────
Converse       Tree of Life  Pending        What APEX      Health
Voice          Domains       Approvals      knows          Agents
Present        Capabilities  Proposed       Evidence       Execution
Notify         Activity      Actions        Gaps           Governance
Activity       Agents        History        Memory         Constitution
Status         Knowledge     Calendar       Freshness      Audit
               Browse        Reminders      Confidence
```

**Five surfaces, not 14 pages.**

Domain content (finance, health, communication, etc.) lives inside **World** as a navigable Tree-of-Life rather than as top-level pages.

### 7.2 Navigation Model

**Desktop**: Left sidebar with 5 surface icons + labels. Sub-navigation within World surface expands domain branches. Contextual panels open inline to the right.

**Mobile**: Bottom navigation with 5 icons (labels optional at narrow width). Domain exploration uses a layered navigation stack within World. Command Centre is always one tap away.

**Keyboard**: `1` = Command, `2` = World, `3` = Decisions, `4` = Knowledge, `5` = System. Domain shortcuts within World are discoverable.

**Voice**: Any surface is reachable by voice from anywhere. "Go to finance" or "Show me my decisions" navigates without manual input.

### 7.3 Surface Descriptions

**COMMAND** — The default home surface. APEX presence (orb), conversation, voice input, text input, activity feed, status strip, contextual presentation surface. This is where the user spends most of their time.

**WORLD** — The human-facing Tree of Life. Organised by domains the user understands, not backend modules. Domains include: Finance, Health, Communication, Operations, Business, Education, Research, Civilisation, Metaphysical/Occult. Each domain is a navigable branch that reveals current state, recent activity, open tasks, and agent assignments. New capabilities appear as new branches.

**DECISIONS** — The approval queue. All pending decisions, proposed actions, approvals, reminders, and calendar events requiring human attention. Prioritised by urgency. This is where human authority is exercised explicitly. Previously the `A` keyboard shortcut destination — now a first-class surface.

**KNOWLEDGE** — What APEX knows. Browsable knowledge state by domain or subject. Shows evidence, freshness, confidence, gaps, contradictions, and sources. Entry point for knowledge correction, teaching APEX, and research requests. The KG-01–08 system becomes observable here.

**SYSTEM** — Owner-level transparency. Constitutional state, agent council, execution traces, governance records, runtime health, audit log, authority records. Not the normal experience — the deep system view available to the owner when needed.

### 7.4 What Doesn't Get a Surface

The following do not get top-level surfaces because they are either contextual or accessible through progressive disclosure:

- Specific agent chat (contextual within agents in System / World)
- Individual notification management (within activity feed or Decisions)
- Raw browser/web content (accessible within World as a capability, not a surface)
- GrapesJS editor (system-level tool, accessible via System surface)
- Calendar as a standalone page (calendar events are items within Decisions and World)

---

## 8. Tree-of-Life UX

### 8.1 Conceptual Model

The Tree of Life is APEX's internal model of the user's world. As a human experience, it must feel like a map of the user's life domains — not an org chart of backend agents.

```
WORLD — Tree of Life
│
├── LIFE
│   ├── Health & Wellbeing
│   ├── Relationships & Communication
│   ├── Personal Finance
│   └── Personal Schedule
│
├── WORK & ENTERPRISE
│   ├── Operations
│   ├── Business
│   └── Projects
│
├── MIND & KNOWLEDGE
│   ├── Education / University
│   ├── Research
│   └── Metaphysical / Occult
│
├── CIVILISATION
│   ├── Macro trends
│   └── World model
│
└── APEX SYSTEM
    └── (bridges to System surface)
```

### 8.2 What is Visible by Default

When a user opens World:
- Top-level domain branches with current state summary (one-line status)
- Active items count per domain
- Knowledge freshness indicator per domain
- Agent assigned (if any)

### 8.3 What is Contextual (on expand)

When a user expands a domain:
- Current state overview (metrics, key facts)
- Recent activity in this domain
- Open tasks and pending items
- Knowledge state (freshness, confidence, gaps)
- Active agent and what it's working on

### 8.4 What is Accessible via Deep Disclosure

- Raw evidence for domain knowledge
- Historical activity in domain
- Constitutional decisions affecting this domain
- Agent execution history
- Memory records associated with this domain

### 8.5 How New Capabilities Appear

When APEX gains a new capability in a domain, it appears as a new item within the existing domain branch — not as a new top-level surface. Capability badges indicate what APEX can now do within a domain. The user discovers through natural conversation or through exploring expanded domain state.

### 8.6 Civilisation and Occult Pages

These domains (currently stub pages) are retained as legitimate Tree-of-Life branches — APEX is a personal OS with an expansive scope. They grow into their branches as capabilities and content are added. They do not need to be removed; they need to be presented as works-in-progress within the World surface rather than as empty pages the user can navigate directly to.

---

## 9. Three Experience Layers

### 9.1 Model

Every interaction in APEX operates at one of three layers. The user can move between layers through explicit requests or through natural conversation.

```
LAYER 1 — HUMAN
  Simple. Natural. Fast.
  The everyday experience.
       │
       │ "Why?" / "Show me." / "Explain."
       ▼
LAYER 2 — INTELLIGENCE
  Evidence. Reasoning. Confidence.
  The thinking experience.
       │
       │ "Show me everything." / "Governance." / "How exactly?"
       ▼
LAYER 3 — CONSTITUTIONAL
  Authority. Execution. Audit.
  The owner experience.
```

### 9.2 Layer 1 — Human

What it exposes:
- Direct answers to questions
- Natural language responses
- Simple recommendations
- Status updates
- Notifications
- Activity summary

What it hides:
- Evidence sources
- Confidence numbers
- Agent orchestration details
- Knowledge gap mechanics
- Constitutional machinery

Visual signature: Clean, minimal. The response is the content. No metadata visible.

Example interaction at Layer 1:
> USER: "How's my spending this month?"  
> APEX: "Your spending is up about 14% compared to last month. Most of the difference is travel costs."

### 9.3 Layer 2 — Intelligence

Triggered by: "Why?", "Show me the evidence.", "How confident are you?", "What alternatives did you consider?", "What do you know about this?"

What it exposes:
- Evidence sources with freshness and confidence
- Reasoning steps (in plain language)
- Alternatives considered and why they were not chosen
- Knowledge gaps that limit confidence
- Contradictions detected
- Prior decisions and whether they've been superseded

Visual signature: Evidence panels, confidence indicators (HIGH / MEDIUM / LOW, not raw numbers), freshness labels (Fresh / Aging / Stale), source cards.

Example at Layer 2:
> USER: "Why?"  
> APEX: "Based on your Monzo data from this morning — confidence: High, freshness: 3 hours — travel costs are £180 more than last month. I'm less confident about any business expense reimbursements since that data was last synced 4 days ago."  
> [Evidence panel shows: Monzo data fresh, Business expense data stale]

### 9.4 Layer 3 — Constitutional

Triggered by: "Show me the governance record.", "What authority did you use?", "Show me the full execution.", "What constitutional article applies?", "Audit this."

What it exposes:
- Constitutional authority used (A1–A6)
- Agent authority matrix
- Execution trace (step by step)
- Decision records with immutable timestamps
- Knowledge-gap certification records
- Approval chain
- Who or what approved what and when

Visual signature: Monospace data-dense display (JetBrains Mono dominant). Certification records. Immutable audit trail presentation.

Example at Layer 3:
> USER: "Show me the governance record."  
> [Constitutional panel: Action X, authority: A5 (Generic Engines), KG assessment: KG-06 PROCEED, decision ID: KGD-..., executed by: Finance Agent, timestamp: 2026-08-26 14:22 UTC]

### 9.5 Layer Navigation

The user moves between layers through:
- Natural language prompts ("Why?", "Show me the evidence.", "Show me everything.")
- A progressive disclosure chevron on any evidence-backed response
- Explicit navigation within System surface (always Layer 3)
- Keyboard shortcut for advanced users

Movement between layers must never reset the conversation or change the surface. The user stays where they are; more detail appears.

---

## 10. Visual Identity Principles

### 10.1 Identity to Protect

The following elements constitute the APEX visual identity and must be protected:

| Element | Why it matters | Status |
|---------|---------------|--------|
| Deep dark background (near-black) | The "darkness from which intelligence emerges" aesthetic | PROTECT |
| Plasma orb with animated states | APEX presence — not decorative | PROTECT |
| Cyan as APEX primary colour | Distinctive; associated with APEX intelligence / voice | PROTECT |
| Indigo as structural accent | Navigation, UI structure | PROTECT |
| JetBrains Mono for data/labels | Technical precision aesthetic | PROTECT |
| Activity feed (live stream) | Transparency and life signal | PROTECT |
| Constitutional charter visible | Identity as a governed OS | PROTECT |
| Waveform visualisation during voice | Voice feedback signal | PROTECT |
| Status dot (online/offline) | System presence indicator | PROTECT |
| Domain colour vocabulary (sys/fin/uni/biz) | Semantic differentiation | PROTECT |

### 10.2 What is Not Visual Identity (Technical Debt Masquerading)

These elements feel like APEX identity but are actually implementation accidents:

| Element | Reality |
|---------|---------|
| 12-15 inline `<style>` blocks | CSS accumulation, not design intent |
| 5 competing `:root` token sets | Cascade collision, not a deliberate system |
| Inconsistent panel borders across pages | Version drift, not variation |
| `!important` throughout | Specificity workaround, not design |
| Different button styles per page | CSS epoch difference, not design language |

### 10.3 Future Visual Language

The future APEX visual language preserves the identity while professionalising it:

**Colour architecture**:
- Base: `#000000` (pure black — matches apex-v2.css, not the original `#03060f`)
- Surface ladder: `#0c0c0c` → `#131313` → `#1a1a1a` → `#222222`
- APEX primary (voice / orb / live): Cyan `#00d4ff` (legacy) or `#38bdf8` (v2). Final decision deferred to design system phase.
- Structural accent (navigation, focus): Indigo `#6366f1`
- Domain colours: retain AX system (sys/fin/uni/biz/file)
- Semantic: green success `#34d399`, amber warning `#fbbf24`, red danger `#f87171`
- ONE `:root` token set. No competing definitions.

**Typography architecture** (reduce from 5 families to 3):
- Identity / display: Cinzel (APEX brand, page display titles only)
- Data / code / labels / mono: JetBrains Mono
- UI / body / conversation: Space Grotesk (replace Inter and IBM Plex Sans — one modern sans for UI)
- IBM Plex Sans: retire
- Inter: retire (not CDN-loaded anyway; Space Grotesk covers its role)

**Animation principles**:
- Orb states remain (idle / listening / processing / speaking / error) — these are identity
- Page transitions: retain slide + fade (220ms)
- Reduce gratuitous glow animations (multiple CSS `box-shadow` pulses are noise, not signal)
- Every animation must signal meaningful state change, not merely aesthetic interest
- All animations must honour `prefers-reduced-motion` (already implemented — protect)

**Surface elevation**:
- No glow shadows for decoration (apex-v2.css "zero-glow philosophy" is correct)
- Elevation via surface brightness only (the v2 system)
- Glow reserved for APEX voice states (orb) and active/live indicators — these are intentional signal

**Borders**:
- Subtle, consistent: `rgba(255,255,255,0.085)` (v2 `--border`)
- One border scale, not per-page definitions
- Cyan/indigo borders only on focused / active elements

### 10.4 What the Future Interface Looks Like

An APEX expert arriving at the future interface should immediately recognise:
- It's APEX (dark, orb, cyan/indigo, JetBrains Mono, constitutional)
- It's more coherent (one design language across all surfaces)
- It's more alive (knowledge state visible, activity always streaming, agent council visible)
- It's more powerful (the full intelligence system is now observable)
- It's still a personal operating environment, not a SaaS app

---

## 11. Command Centre Specification

### 11.1 Purpose

The Command Centre is the default landing surface and the primary human interface with APEX. A user should be able to accomplish 80% of their interactions without leaving this surface.

### 11.2 Layout Zones

```
┌─────────────────────────────────────────────────────────────┐
│  TOP BAR: APEX brand · clock · status dot · topbar actions  │
├───────────────────┬─────────────────────────────────────────┤
│                   │                                         │
│   SIDE NAV        │     COMMAND STAGE                       │
│   (desktop)       │                                         │
│                   │  ┌──────────┐  ┌─────────────────────┐ │
│   COMMAND ●       │  │          │  │                     │ │
│   WORLD           │  │   ORB    │  │   PRESENTATION      │ │
│   DECISIONS  [n]  │  │          │  │   SURFACE           │ │
│   KNOWLEDGE       │  │          │  │   (contextual)      │ │
│   SYSTEM          │  └──────────┘  └─────────────────────┘ │
│                   │     state label                         │
│                   │     waveform (active)                   │
│                   │                                         │
│                   │  ┌─────────────────────────────────────┐│
│                   │  │  CONVERSATION / RESPONSE AREA       ││
│                   │  │  (APEX speaks / writes here)        ││
│                   │  └─────────────────────────────────────┘│
│                   │                                         │
│                   │  ┌──────────────────────────────────┐  │
│                   │  │  STATUS STRIP: key domain metrics  │  │
│                   │  │  Balance · Messages · Tasks · Health│  │
│                   │  └──────────────────────────────────┘  │
│                   │                                         │
│                   ├─────────────────────────────────────────┤
│                   │     ACTIVITY FEED (right column)        │
│                   │     Real-time event stream              │
└───────────────────┴──────────────────────────────────────────┤
│  INPUT ZONE: text input · mic · send · voice toggle         │
└──────────────────────────────────────────────────────────────┘
```

**Note on layout**: The current legacy "cmd-split" two-column (orb left, feed right) is directionally correct. The refinement adds the Presentation Surface as a third zone that appears contextually — it is hidden when not active, and opens in place of or adjacent to the activity feed when APEX has something to show.

### 11.3 Zone Definitions

**ORB ZONE** (always present on Command surface)
- The plasma orb remains the primary APEX presence element
- Clickable / tappable to initiate voice
- Animates to reflect APEX state (see Voice UX, Section 12)
- Sub-label below orb shows current state in plain language
- APEX branding (CINZEL "APEX") above or within orb

**PRESENTATION SURFACE** (contextual — APEX-invoked or user-invoked)
- Appears adjacent to orb when APEX has something to show
- Content types: metrics card, chart, timeline, evidence panel, comparison, recommendation, decision
- Has title, content, "Explain this" + "Close" actions minimum
- Animated entry (slide in from right) and exit
- Remains active until dismissed, until conversation context changes, or on navigation away
- Does NOT interrupt voice — both can be active simultaneously
- On mobile: appears below orb, full-width

**CONVERSATION / RESPONSE AREA**
- Where APEX's written responses appear (if voice is off or supplementing speech)
- Conversational history — last N turns visible, scrollable
- User messages right-aligned, APEX responses left-aligned with APEX identifier
- Streaming text rendering (text appears as it arrives)
- Evidence chips inline with responses at Layer 2
- Response area may be collapsed when conversation is inactive

**STATUS STRIP**
- 4 stat chips: Balance · Messages / Unread · Tasks Due · System Health
- Always up-to-date (WebSocket subscribed, not polled)
- Tap/click any chip to expand to domain detail
- Chips are user-configurable in later phases

**ACTIVITY FEED**
- Right column on desktop, slide-out on mobile
- Real-time event stream: agent activity, decisions, completions, notifications, errors
- Tagged entries: SYSTEM, APEX, AGENT, USER, ACTION, KNOWLEDGE, DECISION
- Feed entries are interactive — tap for detail, "Why?" for explanation
- Feed does not auto-dismiss; it is a persistent log visible in the moment

**INPUT ZONE** (always present, including on Command surface — removing the `display:none` on `#page-command.active` is a UX-01 decision)
- Text input: pill shape, prominent placeholder "Ask APEX anything…"
- Mic button: initiates APEX Voice (see Voice UX)
- Send button
- Voice mode toggle: "LIVE" pill to enable continuous Gemini Live mode
- The input zone must be visible on the Command surface — the current hiding behaviour is a defect (D-03 from UX-00)

### 11.4 What is Always Present

- Orb
- Status strip
- Input zone
- Top bar (brand + clock + status dot)
- Navigation (sidebar / bottom bar)

### 11.5 What is Contextual

- Presentation surface (APEX-invoked or user-invoked)
- Response area (appears with first message; can be collapsed)
- Activity feed expand (feed chip in top bar collapses/expands full feed)

### 11.6 What is Temporary

- APEX speaking animation (waveform + orb state)
- Voice transcript overlay
- Processing indicator

### 11.7 What is APEX-Invoked

- Presentation surface activation (APEX decides to show something)
- Notification banners
- Decision alerts

### 11.8 What is User-Invoked

- Conversation
- Presentation detail ("Explain this")
- Feed expansion
- Domain navigation

### 11.9 What is Hidden Until Requested

- Evidence panel detail (Layer 2)
- Constitutional / execution records (Layer 3)
- Memory inspection
- System / agent detail
- Configuration

### 11.10 Command Centre in Idle State

When no conversation is active:
- Orb in "waiting" animation — slow, gentle pulse
- Sub-label: "STANDBY · TAP TO SPEAK" (current legacy text is correct — protect)
- Status strip showing live domain metrics
- Activity feed showing recent events
- No empty state — APEX is always present and always has context to show

The Command Centre should feel like a live operational environment, not an empty chat window waiting for input.

---

## 12. Voice UX

### 12.1 One Canonical APEX Voice

From the user's perspective, there is exactly one voice interaction with APEX. The technical implementation (Gemini Live / browser STT / HTTP transcription / browser TTS) is invisible.

The user experiences:
- One activation gesture (orb tap / mic button / keyboard shortcut)
- One visual state model
- One voice output (APEX speaks — one voice, one identity)
- One conversation context (voice and text share the same session)

### 12.2 Voice States

| State | Orb animation | Waveform | Sub-label | Input zone |
|-------|--------------|----------|-----------|-----------|
| IDLE / STANDBY | Slow 4s pulse | Hidden | "STANDBY · TAP TO SPEAK" | Normal |
| LISTENING | Red pulse, 0.55s | Hidden | "LISTENING…" | Mic button lit |
| UNDERSTANDING | Cyan slow glow | Subtle static bars | "THINKING…" | — |
| PROCESSING | Cyan fast glow | — | "PROCESSING…" | — |
| SPEAKING | Active cyan animation | 7-bar animated | "SPEAKING…" | — |
| INTERRUPTED | Rapid dim + return to listen | — | "LISTENING…" | — |
| ERROR | Brief red flash → standby | — | "ERROR · TRY AGAIN" | — |
| LIVE (continuous) | Distinct mode indicator | Persistent | "LIVE MODE" | Live pill active |

### 12.3 Visual Feedback

- The orb is the primary voice state indicator — visible from across the room
- Waveform (7 animated bars) shows when APEX is speaking
- State label below orb is secondary — readable on close inspection
- The "LIVE" pill (`#apexLivePill`) indicates continuous mode is active — this is a mode, not a state within single-turn voice
- Transcript overlay (`#apexLiveTranscript`) shows user's words and APEX response text — optional, user-dismissible

### 12.4 Activation

- **Primary**: Tap / click orb anywhere on Command surface
- **Secondary**: Mic button in input zone (single-turn)
- **Keyboard**: Spacebar when Command surface is active and no input focused
- **Mobile**: Tap orb or mic button; no keyboard shortcut required

### 12.5 Turn-Taking

- APEX finishes speaking before processing next user input (except interruption)
- User can interrupt APEX mid-speech — orb transitions to LISTENING state
- After user speaks, orb transitions to UNDERSTANDING/PROCESSING
- No artificial delays between states

### 12.6 Interruption

- User speaks over APEX → APEX stops, state → LISTENING
- User says "Stop" or "Wait" → APEX stops, acknowledges, waits
- Interruption must feel natural and immediate — latency here destroys trust

### 12.7 Continuous Mode (Live)

- Activated via "LIVE" pill
- Conversation flows without per-turn activation — APEX and user can speak naturally
- Visual indicator: "LIVE" pill stays active; orb has distinct "live" ring
- User can deactivate at any time: "End voice session" or toggle the pill

### 12.8 Text Fallback

- Voice is always optional — the text input remains fully functional
- Voice and text share conversation context — switching mid-conversation is natural
- Voice output (APEX speaking) can be muted: user says "Mute" or uses a volume control
- Muted mode: APEX responds in text only

### 12.9 Cancellation / Retry

- "Cancel" or "Never mind" during UNDERSTANDING/PROCESSING → returns to STANDBY
- ERROR state shows "Try again" sub-label; tap orb to retry
- Persistent voice failures (3+) surface a text suggestion: "Voice may be unavailable — use text input"

### 12.10 Accessibility

- Full keyboard path: Tab to mic button, Enter/Space to activate
- Visual state communicated by text label (not colour alone)
- Screen reader: aria-live region for state changes; transcript is readable
- All voice functions have text equivalents

### 12.11 Mobile Voice

- Same states, same activation (orb tap or mic button)
- Continuous mode available on mobile; background state management per platform constraints
- Transcript overlay displays on mobile (important when ambient noise makes speaker hard to hear)
- No mobile-specific degradation of voice experience

---

## 13. Contextual Presentation UX

### 13.1 Purpose

APEX can determine when information is better communicated visually than verbally. The Presentation Surface is the mechanism for this.

It is NOT a static page or a persistent dashboard panel. It is a contextual surface that appears when there is something worth showing, and disappears when not needed.

### 13.2 Trigger Conditions

**APEX-invoked (automatic)**:
- APEX responds to a question where data would materially aid understanding
- APEX identifies a pattern or anomaly worth highlighting
- APEX makes a recommendation that benefits from visual comparison
- A decision is pending that requires visual evidence presentation

**User-invoked (explicit)**:
- "Show me."
- "Show me my [domain] overview."
- "Can you put that in a chart?"
- "Visualise this for me."
- Tap any domain chip in status strip
- Tap any evidence reference in Layer 2

**Notification-triggered**:
- A high-priority notification includes contextual visual data (e.g., "Your spending is unusual this week" → spending overview appears)

### 13.3 Presentation Types

| Type | Use case | Example |
|------|----------|---------|
| Metrics card | Single domain snapshot | "Your spending this month" |
| Comparison card | Two states side by side | "This month vs. last month" |
| Chart | Trends, distributions | "Spending over 3 months" |
| Evidence panel | Layer 2 knowledge state | Sources, confidence, freshness |
| Timeline | Sequence of events | "What happened today" |
| Decision panel | Approval workflow | Proposed action + evidence + risks |
| Recommendation card | APEX recommendation | Option A vs. Option B + rationale |
| Knowledge state panel | KG system output | What APEX knows, gaps, freshness |
| Agent status panel | Agent council state | Who is doing what |
| Action result panel | Completed action | What happened, outcome |

### 13.4 Duration and Dismissal

| Mode | Duration | Dismiss |
|------|----------|---------|
| Temporary | Auto-dismiss after conversation moves on (3+ turns) | "Close." / ✕ button |
| Persistent | Stays until explicitly dismissed | "Close." / ✕ button |
| Conversational | Remains as long as relevant to current topic | Dismissed when topic changes or user closes |

APEX should default to **conversational** duration — the presentation stays relevant to the current discussion and closes naturally when the conversation moves to a different subject.

### 13.5 Conversational Relationship

The presentation surface is part of the conversation, not separate from it.

- APEX may refer to the presentation verbally: "I've highlighted the main difference here."
- User may respond to the presentation: "Explain the travel line."
- User may dismiss verbally: "OK, close that." or "Got it."
- User may expand verbally: "Show me the full breakdown."

The presentation surface should never feel like a background dashboard that happens to be visible — it is a contextual artefact of the current conversation.

### 13.6 Mobile Behaviour

- On mobile, presentation surface appears below the orb, full-width, with the conversation area scrolling above it
- Swipe down to dismiss
- Presentations may be simplified on mobile (key metrics only; "Show full breakdown" expands)
- Voice still works while presentation is active

---

## 14. Proactive Communication UX

### 14.1 The Earned Interruption Principle

APEX earns the right to interrupt. This is a constitutional design constraint, not a preference.

APEX may not interrupt the user arbitrarily. Each notification must pass:

1. **Relevance**: Is this genuinely important to the user now?
2. **Knowledge sufficiency**: Does APEX have sufficient knowledge to communicate this correctly?
3. **Urgency**: Does this require attention before the user's next natural interaction?
4. **User context**: Is the user likely to be in a state where this interruption is acceptable?
5. **Governance**: Does APEX have authority to surface this type of notification?

Only notifications that pass all five may interrupt above the feed.

### 14.2 Notification Hierarchy

| Level | Name | Mechanism | Auto-dismiss | Interrupts voice? |
|-------|------|-----------|-------------|-----------------|
| 0 | SILENT | Activity feed only | — | No |
| 1 | LOG | Activity feed + badge on feed icon | — | No |
| 2 | IN-APP | Notification banner (bottom of screen, 5s) | Yes, 5s | No |
| 3 | ATTENTION | Notification banner (stays) + badge | Manual | No |
| 4 | DECISION | Decision surface notification — requires user action | Manual | Gentle orb signal |
| 5 | URGENT | Fullscreen overlay (reserved for critical safety/authority events only) | Manual + acknowledge | Yes |

**Level 5 (URGENT) must not be used for routine notifications under any circumstances.**

### 14.3 Categories

| Category | Level | Example |
|----------|-------|---------|
| INFORMATION | 0–1 | "Email received from [sender]" |
| REMINDER | 1–2 | "Meeting in 30 minutes" |
| ATTENTION | 2–3 | "Your account balance is below threshold" |
| DECISION REQUIRED | 3–4 | "Agent proposes action [X] — requires approval" |
| APPROVAL REQUIRED | 4 | "High-value action pending your authority" |
| URGENT | 5 | "Constitutional authority event" (rare) |

### 14.4 Communication Decision Flow

```
EVENT occurs
      │
      ▼
Relevance check → irrelevant → IGNORE (never logged to user)
      │
      ▼
Knowledge sufficiency → insufficient → LOG only (low confidence flag)
      │
      ▼
Urgency assessment → not urgent → LOG / queue for next natural interaction
      │
      ▼
User context → deep focus / quiet period → defer (unless URGENT)
      │
      ▼
Governance → no authority to surface → block (never surface unauthorised)
      │
      ▼
Select level (0–5)
      │
      ▼
Deliver via mechanism
```

### 14.5 Notification Presentation

All notifications above level 0:
- Title: plain-language statement of what requires attention
- Body: brief context (1–2 sentences maximum)
- Timestamp
- Category badge
- Action button (for DECISION / APPROVAL levels)
- "More context" expands to Layer 2 evidence

Notification should never be a dead end. From any notification:
- "Tell me more." → APEX verbal explanation
- Tap notification → contextual presentation surface opens
- "Open this in [domain]." → World surface, domain expanded

### 14.6 Quiet Periods

The user can configure quiet periods (e.g., 22:00–07:00) during which only URGENT (level 5) notifications deliver. All others queue and present at session start.

### 14.7 Notification History

All notifications (all levels) are permanently logged in the Activity feed and accessible at Knowledge surface under activity history. The user can always see what APEX communicated and when.

---

## 15. Decision / Approval UX

### 15.1 Human Authority is Explicit

The canonical APEX constitutional principle: APEX advises and executes only with human authority. The Decisions surface makes this tangible and unavoidable.

### 15.2 Decision Panel Structure

Every decision presented to the user has:

```
┌─────────────────────────────────────────────────────────────┐
│  PROPOSED ACTION                                            │
│  [plain language description of what APEX wants to do]     │
├─────────────────────────────────────────────────────────────┤
│  WHY                                                        │
│  [reason — 2–3 sentences]                                   │
├────────────────┬─────────────────────────────────────────── │
│  EVIDENCE      │  RISKS                                     │
│  [key facts]   │  [what could go wrong]                     │
│  [confidence]  │  [magnitude + likelihood]                  │
├────────────────┴─────────────────────────────────────────── │
│  ALTERNATIVES                                               │
│  [Option A — recommended]                                   │
│  [Option B — alternative]                                   │
│  [Do nothing — consequence]                                 │
├─────────────────────────────────────────────────────────────┤
│  AUTHORITY REQUIRED: [human / agent-level X]               │
│  CONSTITUTIONAL BASIS: [A1–A6 citation if applicable]      │
├─────────────────────────────────────────────────────────────┤
│  [ APPROVE ] [ REJECT ] [ MODIFY ] [ DEFER ] [ ASK APEX ]  │
└─────────────────────────────────────────────────────────────┘
```

### 15.3 User Actions

| Action | Outcome |
|--------|---------|
| APPROVE | Action authorised, executed, outcome recorded |
| REJECT | Action cancelled, APEX acknowledges, asks for guidance |
| MODIFY | Editable field opens — user specifies modification; APEX re-proposes |
| DEFER | Decision queued for later; APEX re-surfaces at specified time |
| ASK APEX | APEX provides more context verbally; decision remains open |

### 15.4 Decision Record

Every decision (approve or reject) creates an immutable record:
- What was decided
- Who decided (user)
- When
- Evidence state at time of decision
- Constitutional basis
- Outcome (if executed)

Records are accessible via System surface under Governance / Audit.

### 15.5 Approval Flow Priority

Pending approvals show on the Decisions surface badge count. The APEX voice may say "I have [N] decisions waiting for you" at session start or on request.

APEX never re-proposes a rejected action without explicitly asking: "Would you like me to try a different approach to [goal]?"

---

## 16. Knowledge UX

### 16.1 Knowledge Must be Observable

The KG-01 through KG-08 certified system is entirely invisible from the current interface (UX-00, MC-02). This is a significant gap — the most sophisticated backend subsystem is completely hidden from the user.

The canonical UX makes knowledge state observable at two levels:
- **Inline** (Layer 2): confidence and freshness chips appear alongside any APEX assertion
- **Knowledge surface**: browsable knowledge state with full detail

### 16.2 Inline Knowledge Indicators

When APEX makes an assertion at Layer 2 or deeper, it is accompanied by:

```
[✓ High confidence · Fresh · 2 hours ago]
[⚠ Medium confidence · Aging · 3 days ago]
[! Low confidence · Knowledge gap detected]
```

These are compact chips, not full panels. Tapping opens the evidence panel.

Labels use plain language, not internal system terminology:
- HIGH / MEDIUM / LOW (not numeric confidence scores)
- FRESH / AGING / STALE (not EXPIRED / STALE from KG-07)
- "Knowledge gap detected" (not "KG status: BLOCKED")

### 16.3 Knowledge Surface

Entry point for explicit knowledge inspection:

**Browse by domain**: Same Tree-of-Life structure as World. Each domain shows:
- Last knowledge refresh
- Overall freshness indicator
- Number of knowledge gaps
- Number of contradictions detected
- Active research requests

**Search**: Natural language — "What do you know about [subject]?"

**Knowledge record detail**:
- Subject and domain
- What APEX knows (facts, assertions)
- Evidence sources with freshness, confidence, and provenance
- Knowledge gaps: what is unknown and why
- Contradictions: conflicting evidence detected
- Last verified / last assessed date

### 16.4 User Actions on Knowledge

| Action | Mechanism | Effect |
|--------|-----------|--------|
| Correct a fact | "That's wrong — actually, [X]" | APEX captures correction, updates knowledge |
| Refresh knowledge | "Research this." | APEX initiates knowledge acquisition |
| View evidence | "Show me the evidence." | Evidence panel at Layer 2 |
| Mark a fact as outdated | "This is no longer current." | Knowledge freshness reset; gap logged |
| View knowledge gaps | Knowledge surface → domain → gaps | List of known gaps with status |

### 16.5 Knowledge Gap Communication

When APEX encounters a knowledge gap:

> APEX: "I'm not confident about the current supplier pricing — that data hasn't been refreshed in 6 days. Would you like me to research it, or shall I proceed with the best available estimate?"

Never silently proceed with stale data on consequential queries.
Always surface gaps on decision-relevant queries.
Never expose internal KG identifiers (KGD-, KRT-, KC-) in normal UX.

---

## 17. Intelligence UX

### 17.1 Principle

Intelligence must be observable without being overwhelming. APEX should feel intelligent without requiring the user to engage with the mechanics of that intelligence.

### 17.2 Surfacing Intelligence Appropriately

| Intelligence type | Normal UX (Layer 1) | Layer 2 expansion |
|-------------------|--------------------|--------------------|
| Assessment | APEX states its conclusion | Evidence for assessment shown |
| Recommendation | APEX makes one clear recommendation | Alternatives and reasoning shown |
| Risk | APEX flags risk in plain language | Risk magnitude + basis shown |
| Reflection | APEX notes it considered this before | Prior decision reference shown |
| Adaptation | APEX acts on past correction naturally | User can see what changed |
| Contradiction detected | "I've found conflicting information on this" | Both sources shown |

### 17.3 Recommendation Pattern

Recommendations must follow: Recommendation → Reasoning → Evidence → Alternatives → Action

APEX does not present analysis matrices. APEX presents:
- One clear recommendation
- One-sentence reason
- One-sentence risk
- "Would you like alternatives?"

The user can ask "Why?" to see reasoning. The user can ask "What else could we do?" to see alternatives. The user can ask "What are the risks?" to expand risks.

Intelligence is revealed progressively, not dumped at once.

### 17.4 Uncertainty

APEX must communicate uncertainty naturally:

- "I'm fairly confident, but…" (medium confidence)
- "I don't have current data on this" (knowledge gap)
- "I found conflicting information" (contradiction)
- "I haven't assessed this recently" (freshness issue)

APEX never silently proceeds as if certain when uncertain.
APEX never refuses to act on low confidence — it flags the uncertainty and asks whether to proceed.

### 17.5 Deliberation Transparency

When APEX is processing a complex query, it may briefly surface its deliberation at Layer 1:

> APEX: "Let me check a few things…" [processing state]

At Layer 2, the user can see:
> "Assessed financial data · Checked knowledge state · Retrieved 3 evidence sources · Resolved 1 contradiction · Generated recommendation"

Not a technical trace — a plain-language summary of what APEX did to arrive at the response.

---

## 18. Agent UX

### 18.1 Agents Are Roles, Not Bots

Agents must be presented according to their role in APEX — not as a generic list of AI entities.

| Presentation to avoid | Canonical presentation |
|----------------------|----------------------|
| "Agent 4 — business assistant" | "Business Agent — manages projects, tracks revenue, monitors client relationships" |
| Generic chat bot | Domain expert with defined scope and authority |
| List of models | Council of operational roles |

### 18.2 Executive Council

The current "Executive Council" in the System page is directionally correct — a council of named agents with domain roles. This is the right metaphor.

Each agent in the council shows:
- Role name (not internal identifier)
- Domain / scope (what it is responsible for)
- Current status (idle / working / waiting for input / requires approval)
- Current task (if active) in plain language
- Authority level (what it can do without approval)

### 18.3 Agent Transparency

The user can ask:
- "What is [agent] working on?" → APEX responds verbally; agent detail panel shows
- "What can [agent] do?" → Capability summary
- "What authority does [agent] have?" → Authority description in plain language
- "Show me [agent]'s recent activity" → Activity subset filtered to agent

### 18.4 Agent Interaction

Users can converse with the system (APEX orchestrates) or direct a query to a specific domain:
- "Ask the Finance Agent about my Q3 projections."
- APEX routes the query and may relay the response, or open a domain-specific conversation

Domain agent modal (currently in System page) is the correct interaction pattern — refine presentation, not architecture.

### 18.5 Agent Authority Communication

APEX must never imply an agent has authority it does not have.

When an agent proposes an action outside its authority:
> "The Finance Agent wants to transfer funds. This requires your explicit approval."

When an agent operates within its authority:
> "The System Agent completed the scheduled maintenance check."

The user must always be able to understand what each agent can and cannot do without human approval.

---

## 19. Action UX

### 19.1 Action Lifecycle

Every APEX action visible to the user has a lifecycle:

```
PROPOSED → PENDING APPROVAL → APPROVED → EXECUTING → COMPLETED
                           → REJECTED
                                        → FAILED
                                        → CANCELLED
                                                    → REQUIRES ATTENTION
```

### 19.2 Action Presentation

Each action shows:
- What APEX did (or wants to do) — plain language
- Why — one-sentence rationale
- With what authority — agent + constitutional basis
- What happened — result
- What happens next — if applicable

Example:
> Finance Agent — Categorised 23 transactions [COMPLETED]  
> Routine maintenance · Finance Agent authority · Completed 14:22

Example (failed):
> System Agent — Attempted connection check [FAILED]  
> API unreachable · No data affected · Will retry in 5 minutes

### 19.3 Action Visibility Rules

| Action type | Visible where |
|-------------|--------------|
| All actions | Activity feed (always) |
| Proposed / pending | Decisions surface |
| Failed | Activity feed + attention notification (level 3) |
| Requires attention | Activity feed + banner notification |
| Completed (routine) | Activity feed only (not notifications) |
| Completed (significant) | Activity feed + brief banner (level 2) |

### 19.4 What the User Can Always Determine

From the interface, the user must always be able to answer:
- What did APEX do? (activity feed)
- Why? (Layer 2 expansion)
- With what authority? (action detail / Layer 3)
- What happened? (outcome record)
- What happens next? (APEX states this, or Decisions surface shows it)

---

## 20. Memory UX

### 20.1 Memory is First-Class

APEX memory is not a hidden database. It is an observable, correctable record of what APEX knows about the user, their world, and their preferences.

### 20.2 Memory Surface

Within Knowledge surface, a Memory tab shows:
- What APEX remembers — organised by domain
- Where it came from — conversation, user statement, agent inference
- When it was recorded
- How it affects APEX behaviour — plain language

### 20.3 Memory Presentation

Each memory record shows:
- Subject: what APEX knows ("Your preferred meeting time is 10am")
- Domain: personal / finance / health / etc.
- Source: "You told me on [date]" / "Inferred from [pattern]" / "You corrected APEX on [date]"
- Effect: "I consider this when scheduling reminders."
- Controls: EDIT · REMOVE · CONFIRM

### 20.4 User Control Over Memory

| Action | Available |
|--------|-----------|
| View all memories | Yes |
| View memories by domain | Yes |
| Edit a memory | Yes — "Actually, [correction]" or inline edit |
| Remove a memory | Yes — with confirmation |
| Confirm a memory as current | Yes |
| See what a memory affects | Yes — "Effect" field |
| Add a memory explicitly | Yes — "Remember: [fact]" |

### 20.5 Memory Transparency Without Database Exposure

The user never sees:
- Database table names
- Internal memory identifiers
- Storage implementation details
- Memory query syntax

The user always sees:
- Plain-language descriptions
- Domain categorisation
- Source attribution in human terms
- Behavioural effect in plain language

---

## 21. Activity UX

### 21.1 Activity Feed is Always On

The activity feed (currently implemented in the Command page) is the primary transparency mechanism for APEX's autonomous activity. It must be:
- Always streaming while the app is open
- Readable in the moment (each entry self-contained)
- Archived and searchable in Activity surface

### 21.2 Activity Categories

| Tag | Examples |
|-----|---------|
| SYSTEM | Startup, health checks, connectivity |
| APEX | Conversational actions, responses, decisions |
| AGENT:[name] | Domain agent activity |
| USER | User actions and inputs |
| ACTION | Executed actions and their outcomes |
| KNOWLEDGE | Knowledge updates, assessments, gap detections |
| DECISION | Pending and resolved decisions |
| NOTIFICATION | Proactive communications sent |
| ERROR | Failures, retries, degraded states |

### 21.3 Activity Surface (Extended View)

The Activity surface provides:
- Full activity log with filtering (by date, category, agent, domain)
- Search
- Entry detail on tap (full context, Layer 2 expansion)
- Export (future capability)

### 21.4 Activity Principles

- Activity creates trust — the user can see APEX is working
- Activity must not become noise — routine repeated events should be grouped (e.g., "8 routine maintenance checks completed today")
- Activity entries are immutable once created
- Activity is not the same as notifications — all activity is logged, only significant events become notifications

---

## 22. Constitutional / System UX

### 22.1 Owner-Level Transparency

The System surface is the owner-level view of APEX. It should feel like looking at a control room, not a settings panel.

It is not a normal user experience. It is available to the owner when they need it, without dominating or complicating the normal experience.

### 22.2 System Surface Contents

| Section | Contents |
|---------|---------|
| Constitutional State | A1–A6 active/inactive status; any active constitutional events |
| Agent Council | Full executive council; each agent's authority, status, recent activity |
| Knowledge State | Global knowledge freshness; gap summary; reassessment queue |
| Governance | Decision records; authority audit; constitutional decisions |
| Execution | Runtime traces; current execution state; recent completions |
| Health | System health; connectivity; service status; error rates |
| Audit | Full immutable audit log |
| Configuration | (System-level settings — not in normal UX) |

### 22.3 Constitutional Charter Placement

The constitutional charter (A1–A6) currently displayed on the Command page is correct — it belongs at the heart of the system. Two representations:

1. **Command page**: The compact charter grid (current implementation) — shows article status, always visible to the owner. PROTECT this.

2. **System surface — Constitutional State**: Full constitutional state view — articles with their current active status, recent constitutional events, authority records.

### 22.4 System is Layer 3

Everything in the System surface is Layer 3 content. The user accessing it understands they are in the deep system view. Visual language shifts to monospace-dominant, data-dense presentation.

---

## 23. Responsive / Mobile UX

### 23.1 Same Experience, Not Shrunk Desktop

The canonical APEX experience must exist across desktop, tablet, and mobile. Not a mobile version — the same product adapting.

### 23.2 Desktop (≥ 900px)

- Left sidebar navigation (5 surfaces + labels, 200px)
- Command Centre: cmd-split (orb zone | presentation surface), below: conversation, status strip, activity feed
- Input zone: full width at bottom
- Activity feed: right column

### 23.3 Tablet (600px–899px)

- Left sidebar narrow (icon-only, expand on hover, 60px)
- Command Centre: orb + presentation stacked (no split)
- Conversation scrollable
- Activity feed: slide-out drawer (swipe from right)
- Input zone: full width

### 23.4 Mobile (< 600px)

- Bottom navigation bar (5 surface icons, labels below at 8px)
- Command Centre: orb centred, presentation surface below full-width
- Conversation: scrollable above input
- Activity feed: accessible via feed icon in top bar (opens as overlay)
- Input zone: always visible at bottom
- Voice: primary input modality (orb tap to activate)
- Min touch targets: 44px (currently implemented — protect)
- Safe-area-inset applied (currently implemented — protect)

### 23.5 Mobile Command Centre

The mobile Command Centre is voice-first. The orb is prominent, centred, large. The text input is present but secondary. The status strip is compact (2-column, 2 rows). The presentation surface appears below the orb when active.

Mobile navigation: bottom bar with 5 items. World surface uses layered navigation (drill into domains). Decisions shows badge count. The hamburger + dropdown (current implementation) is retired in favour of the bottom nav alone.

### 23.6 Cross-Device Consistency

- Same navigation surfaces and labels on all breakpoints
- Same information (no mobile-only degraded data)
- Same presentation types (charts may simplify for mobile; data doesn't disappear)
- Same voice model
- Same progressive disclosure access

---

## 24. Accessibility Requirements

These are requirements, not implementations. All apply to future UX phases.

| Requirement | Category | Priority |
|-------------|----------|---------|
| All interactive elements keyboard-navigable via Tab | Keyboard | MUST |
| Focus ring visible on all interactive elements | Keyboard | MUST |
| Logical focus order (top-to-bottom, left-to-right) | Keyboard | MUST |
| Skip-to-main link (currently implemented — protect) | Keyboard | MUST |
| All voice functions have text equivalents | Alternative | MUST |
| Screen reader: aria-live for state changes (voice, APEX state) | Screen reader | MUST |
| Screen reader: aria-labels on icon-only buttons | Screen reader | MUST |
| Screen reader: descriptive alt/titles on charts | Screen reader | MUST |
| Colour contrast: 4.5:1 minimum for body text | Visual | MUST |
| Colour contrast: 3:1 minimum for large text / UI components | Visual | MUST |
| Colour not the sole indicator of state (text label always accompanies state colour) | Visual | MUST |
| `prefers-reduced-motion`: all animations disabled (currently implemented — protect) | Motion | MUST |
| 44px minimum touch target on all interactive elements on mobile (currently implemented — protect) | Touch | MUST |
| Error states communicated by text, not colour alone | Error | MUST |
| Notifications accessible without voice (in-app always present) | Alternative | MUST |
| APEX voice output has transcript / text representation | Voice alternative | SHOULD |
| High-contrast mode: tested and functional | Visual | SHOULD |
| Headings correctly hierarchical (not used for styling) | Structure | SHOULD |
| Charts have data tables as alternative | Data | SHOULD |

---

## 25. UX State Model

Every major APEX interaction must have a defined state. The user must never wonder whether something is happening.

### 25.1 Canonical States

| State | Definition | Visual signal |
|-------|-----------|--------------|
| IDLE | APEX ready, no active task | Orb slow pulse; sub-label "STANDBY" |
| LOADING | Data being retrieved for a surface | Skeleton loaders on panels (current `.skel` pattern — protect) |
| THINKING | APEX processing a query | Orb glow transition; status "THINKING…" |
| SPEAKING | APEX generating voice output | Waveform active; orb animated |
| SUCCESS | Task / action completed | Brief green tick animation; activity feed entry |
| EMPTY | Surface has no content yet | Empty state illustration + plain-language explanation + suggested action |
| ERROR | Something failed | Red signal on orb or panel; plain-language error + suggested next step |
| OFFLINE | No connectivity | Offline banner; cached content shown; voice disabled |
| DEGRADED | Partial service (some APIs down) | Warning indicator; affected surfaces show "limited data" |
| UNAUTHORISED | Action requires authority not held | Plain-language explanation; Decisions surface suggestion |
| REQUIRES APPROVAL | Pending decision awaiting user | Decisions badge + notification |
| WAITING | APEX waiting for external event or user input | Calm pulse state; "Waiting for [X]" |
| EXECUTING | Action in progress | Action status panel with progress |
| COMPLETED | Task finished | Activity feed entry; brief banner if significant |

### 25.2 State Composition

Multiple states can be active simultaneously:
- IDLE (orb) + LOADING (a domain panel) = both signals visible
- SPEAKING (orb) + EXECUTING (action panel) = voice + action status
- OFFLINE + IDLE = offline banner + orb standby

States do not conflict — each zone or component can have its own state independently.

---

## 26. Terminology Glossary

### 26.1 Terms to Use

| APEX term | Use in human UX? | Preferred user-facing term |
|-----------|-----------------|--------------------------|
| Command Centre | YES | "Command" (navigation label); "Command Centre" (documentation) |
| APEX | YES | "APEX" — the system's name; always uppercase |
| Domain | YES | "Domain" — clear enough; also "area of life" in explanations |
| Agent | YES with care | "APEX agents" or "[Agent Name]" — not "Agent 4" |
| Memory | YES | "What APEX remembers" or "Memory" |
| Activity | YES | "Activity" — clear and neutral |
| Decision | YES | "Decision" — what requires human authority |
| Notification | YES | "Notification" — standard term |
| Knowledge | YES | "What APEX knows" or "Knowledge" |
| Recommendation | YES | "Recommendation" — clear |
| Voice | YES | "APEX Voice" or simply "voice" |
| Live mode | YES | "Live Voice" or "Live Mode" |
| Evidence | YES (Layer 2+) | "Evidence" — but only when user has opted into that level |
| Confidence | YES (Layer 2+) | "High / Medium / Low confidence" — NOT numeric values |
| Freshness | YES (Layer 2+) | "Fresh / Aging / Stale" — NOT EXPIRED (sounds broken) |
| Gap | YES (Layer 2+) | "Knowledge gap" or "I don't have current data on this" |
| Constitutional | YES (Layer 3) | "Governance" or "Constitutional record" — not "constitutional" in L1 |

### 26.2 Terms to Avoid in Normal UX

| Technical term | Why to avoid | Alternative |
|---------------|-------------|------------|
| `KGD-`, `KRT-`, `KC-` identifiers | Internal system identifiers | Not exposed |
| "Knowledge Gap Engine" | Module name, not user concept | — |
| "PETL" | Technical layer | — |
| "Supabase" | Provider name | "APEX data" / "your data" |
| "Claude" / "Gemini" / "Haiku" | Provider/model names | "APEX" (everything is APEX) |
| "Route" | Technical routing | — |
| "Middleware" | Technical term | — |
| Route paths (`/api/...`) | Internal endpoints | — |
| "Postgres" / "SQL" | Database technology | — |
| "KG-01 through KG-08" | System certification labels | — |
| "requireAuth" | Middleware name | "secure" / "protected" |
| BLOCKED / PROCEED / ABANDONED | KG acquisition states | "Couldn't complete" / "Research in progress" |
| EVIDENCE_SUPERSESSION | KG-07 trigger type | "Updated information available" |
| INFERRED evidence source | KG evidence type | "Based on available information" |
| "apex_token" / "apex_app_key" | Auth implementation | — |

### 26.3 Terms to Standardise

| Current state | Standard term |
|--------------|--------------|
| Multiple uses of "page" vs "view" vs "surface" | "Surface" (top-level) / "Panel" (within surface) / "View" (expanded state) |
| "Chat" vs "conversation" vs "ask" | "Conversation" for the interaction; "Ask APEX" for entry points |
| "Orb" (internal) / "APEX" (brand) | Orb is the internal component name; user-facing: "APEX" (the presence) |
| "Live" / "Gemini Live" | "APEX Live Voice" or "Live Mode" |
| "Agent drawer" vs "agent detail" | "Agent Detail" (what the panel shows) |

### 26.4 Ambiguous Terms Requiring Care

| Term | Ambiguity | Resolution |
|------|-----------|-----------|
| "Action" | Could be UI action (click) or APEX action (execute something) | Context-dependent; use "APEX action" when distinguishing |
| "Activity" | The feed or a domain (business activity) | In navigation: "Activity" = feed. In domain context: use domain-specific terms |
| "Knowledge" | APEX knowledge base vs. user knowledge | Prefix: "APEX knows…" vs. educational domain "Knowledge / Education" |
| "Memory" | APEX memory vs. user's memory | "What APEX remembers" is always APEX memory |
| "Reality" | Current page name is confusing out of context | Rename to "Reality Architecture" or "World Model" in navigation |
| "Occult" | Domain name may need user-facing label | "Metaphysical" / "Esoteric" as display label; "occult" internal ID retained |

---

## 27. Progressive Disclosure Model

### 27.1 The Three-Layer Journey

```
LAYER 1 ─────────────────────────────────────────────────────────
  User asks: "How am I doing financially?"
  APEX responds: "Your spending is up 14% — mostly travel."
  [No further action required for most queries]

  TRIGGER: User asks "Why?" or "Show me the evidence." or taps [▾]
                              │
                              ▼
LAYER 2 ─────────────────────────────────────────────────────────
  Evidence panel appears:
    Source: Monzo data · Fresh (3 hours) · High confidence
    Travel: £180 more than last month
    Business expenses: Aging (4 days) · Medium confidence
  [User can close or continue]

  TRIGGER: User asks "Show me the governance record." or navigates to System
                              │
                              ▼
LAYER 3 ─────────────────────────────────────────────────────────
  Constitutional record:
    KG assessment: PROCEED (sufficient)
    Decision record: [immutable ID, timestamp, authority]
    Evidence evaluated by: KG-03 → KG-04 → KG-05
  [Owner-level view]
```

### 27.2 Trigger Phrases

Natural language triggers that promote layer:

| Phrase | Layer promoted to |
|--------|-----------------|
| "Why?" | Layer 2 |
| "How do you know?" | Layer 2 |
| "Show me the evidence." | Layer 2 |
| "How confident are you?" | Layer 2 |
| "What else could we do?" | Layer 2 (alternatives) |
| "What are the risks?" | Layer 2 (risk detail) |
| "Show me everything." | Layer 3 |
| "Governance record." | Layer 3 |
| "How exactly did you do that?" | Layer 3 |
| "Audit this." | Layer 3 |
| "Constitutional basis?" | Layer 3 |

### 27.3 Visual Triggers

- Every APEX response at Layer 1 has a subtle `[▾]` disclosure chevron — tap to expand to Layer 2
- Evidence panel has `[System detail ▾]` — expands to Layer 3
- Layer 3 is always accessible from System surface without needing to trigger from a response

### 27.4 Layer Persistence

- The user's layer preference for a session persists (if they've gone to Layer 2 once, subsequent responses show Layer 2 by default until they dismiss)
- The user can say "Go back to simple." or "Keep it simple." to return to Layer 1 default
- Layer 3 is never default — always explicit access

---

## 28. Canonical UX Principles

These are binding. All UX implementation phases must conform to them.

**P-01 — APEX is one system.**  
One voice, one presentation surface, one notification channel, one conversation context. No duplicated capabilities with different entry points.

**P-02 — Human tasks drive UX, not backend modules.**  
Navigation and surface design is based on what the user wants to accomplish. Backend architecture is implementation detail.

**P-03 — Preserve the APEX identity.**  
The dark aesthetic, orb, cyan/indigo language, JetBrains Mono data typography, activity feed, and constitutional charter are protected identity elements.

**P-04 — Three first-class channels.**  
Converse (bidirectional), Present (APEX → USER visual), Notify (APEX → USER proactive). Every APEX communication is through one of these.

**P-05 — Voice is optional; text is first-class.**  
The user must never be required to use voice. Text is always available and fully capable.

**P-06 — APEX earns the right to interrupt.**  
Proactive communication requires: relevance + knowledge sufficiency + urgency + user context + governance authority.

**P-07 — Progressive disclosure controls complexity.**  
Layer 1 is simple. Layer 2 is evidence. Layer 3 is constitutional. The user moves between layers deliberately.

**P-08 — Human authority is explicit.**  
The user knows what APEX can do without approval and what requires their decision. Authority is never implied or hidden.

**P-09 — Evidence accompanies consequential intelligence.**  
Any recommendation, decision, or significant assertion must have accessible evidence at Layer 2.

**P-10 — Knowledge state is observable.**  
The user can always inspect what APEX knows, how fresh it is, and where the gaps are.

**P-11 — APEX should feel alive without becoming noisy.**  
Activity feed is always streaming. Notifications are earned. Routine events are grouped. Exceptions surface.

**P-12 — Powerful underneath; simple on the surface.**  
The KG-08 system, constitutional engine, and agent council are beneath the surface. The user experiences their output: confident answers, reliable action, transparent reasoning.

**P-13 — The interface grows with the Tree of Life.**  
New capabilities appear within existing structures (World branches, agent council, Knowledge panels). No new top-level surfaces are created without a compelling user-task justification.

**P-14 — The UI consumes canonical APEX state.**  
The frontend reads from the same canonical state that the backend maintains. No frontend-side reimplementation of state that the backend manages.

**P-15 — No duplicate UX pathways.**  
One capability has one canonical entry point. If voice, text, and tap all lead to the same capability — they must. But the capability itself is implemented once.

**P-16 — APEX never leaves the user wondering.**  
Every state has a visual and verbal signal. Processing is shown. Completion is confirmed. Failure is explained. Waiting is communicated.

**P-17 — System transparency is available without overwhelming normal use.**  
Constitutional and governance detail lives in the System surface and Layer 3 expansion. It is always accessible; it never dominates Layer 1.

**P-18 — Accessibility is not an afterthought.**  
Keyboard, screen reader, reduced motion, colour contrast, and touch targets are requirements, not enhancements.

---

## 29. Legacy Preservation Decisions

### 29.1 Formal Preservation Matrix

| Legacy element | Current value | Future role | Decision |
|---------------|--------------|------------|----------|
| Plasma orb (`#plasmaOrb`) | Primary APEX presence and voice trigger | Primary APEX presence; remains the canonical voice entry point on Command surface | PROTECT |
| Orb animation states (idle/listen/active/waiting) | Strong voice state communication | All states retained and refined | PROTECT |
| "STANDBY · TAP TO SPEAK" sub-label | Clear affordance | Retained verbatim | PROTECT |
| Activity feed (`#apexFeedBody`) | Real-time transparency | Retained; expanded with richer tags and interaction | PROTECT |
| Constitutional charter (A1–A6, Command page) | Identity and governance visibility | Retained in Command surface; refined presentation | PROTECT |
| `data-fn` event delegation pattern | Clean interaction architecture | Retained as interaction pattern | PROTECT |
| Waveform animation (7 bars) | Voice activity signal | Retained for APEX speaking state | PROTECT |
| `skip-to-main` link | Accessibility | Retained | PROTECT |
| `prefers-reduced-motion` implementation | Accessibility | Retained and extended | PROTECT |
| 44px mobile touch targets | Accessibility | Retained | PROTECT |
| Safe-area-inset-bottom | iOS PWA | Retained | PROTECT |
| Desktop sidebar / mobile bottom nav layout | Responsive architecture | Retained; updated for 5 surfaces | PROTECT |
| Domain colour vocabulary (AX system: sys/fin/uni/biz) | Semantic differentiation | Retained; extended to all domains | PROTECT |
| `.ds-panel`, `.ds-btn`, `.ds-grid-*` design system vocabulary | Component language | Retained; consolidated to single token source | REFINE |
| `.skel` skeleton loaders | Loading UX | Retained | PROTECT |
| Status dot (online/offline) | System presence | Retained; expanded to show connectivity state | REFINE |
| Command palette (`#cmdPalette`) | Power-user navigation | Retained; connected to 5-surface IA | REFINE |
| Keyboard shortcut system | Power-user efficiency | Retained; updated for new surfaces (1–5) | REFINE |
| Bottom stat strip (Balance/Messages/Tasks/Health) | At-a-glance status | Retained; connected to live WebSocket data | REFINE |
| Domain Agent Modal | Per-agent conversation | Retained; visual refinement | REFINE |
| 14-page structure | Navigation | Consolidated to 5 surfaces; domain pages become World branches | REWORK |
| 5 competing `:root` token sets | CSS cascade | Single canonical token set | REWORK |
| 12-15 inline `<style>` blocks | CSS architecture | External modular CSS | REWORK |
| 4 polling intervals | Data sync | WebSocket event subscription | REWORK |
| 4 voice mechanisms | Voice UX | Single canonical APEX Voice | REWORK |
| Input zone hidden on command page (D-03) | UX defect | Input zone always visible | REWORK |
| localStorage API key (`apex_app_key`) | Auth mechanism | Retire; JWT cookie only | REPLACE |
| Service worker cache name hardcoded ("apex-v11") | Cache management | Automated cache versioning | REPLACE |
| Z-index unstandardised values | Layer management | Formal z-index scale in design tokens | REPLACE |
| `page-browser` (36 lines) | Incomplete surface | Web content as World capability, not page | RETIRE |
| `apex-custom.css` (99B) | Trivial override file | Fold into design token system | RETIRE |
| IBM Plex Sans | Typography | Retire; Space Grotesk covers the role | RETIRE |
| Inter | Typography | Retire; Space Grotesk covers the role | RETIRE |
| Mobile nav dropdown (hamburger + 3×4 grid) | Navigation | Bottom nav 5-surface replaces this | RETIRE |
| GrapesJS editor (`editor.html`) | Visual layout editor | Investigate active use before decision | INVESTIGATE |
| Electron wrapper (`apex-electron.js`) | Desktop app | Investigate active use; may warrant dedicated treatment | INVESTIGATE |
| `page-civilisation`, `page-occult`, `page-research` (stub pages) | Emerging domains | Migrate to World surface as branches; grow from there | DEFER |

---

## 30. Future Capability Requirements

Capabilities not currently implemented that the UX-01 blueprint requires. These become requirements for engineering phases.

| Requirement | Description | Phase dependency |
|-------------|-------------|-----------------|
| WebSocket data sync | Replace 4 polling intervals; subscribe to events from `/ws/viz` | UX-02 / Engineering |
| Unified Voice API | Single frontend voice orchestration layer; hide Gemini/STT/TTS provider | UX-02 / Engineering |
| Knowledge surface | Browse and correct APEX knowledge state; KG system observable | UX-02 / Engineering |
| Decisions surface | Approval queue; decision panel; authority records | UX-02 / Engineering |
| Presentation surface | Contextual visual panel adjacent to orb; types: card, chart, timeline, evidence, decision | UX-02 / Engineering |
| Progressive disclosure components | Layer 2 evidence chips; Layer 3 expansion; disclosure chevron | UX-02 / Engineering |
| Notification hierarchy | 5-level system with governance gate | UX-02 / Engineering |
| Memory surface | Browse, edit, remove APEX memories | UX-03+ |
| Activity surface | Full searchable activity log | UX-03+ |
| World / Tree-of-Life surface | Domain navigation; branch expansion | UX-03+ |
| Inline knowledge indicators | Fresh/Aging/Stale + confidence chips on APEX responses | UX-02 |
| Single CSS token source | One `:root` definition; remove competing blocks | UX-02 / Engineering |
| Cache versioning automation | Service worker cache name from build | UX-02 / Engineering |
| localStorage API key retirement | JWT-only auth from frontend | UX-02 / Engineering |
| Formal z-index scale | Token-based z-index system | UX-02 / Engineering |
| Reduce typography to 3 families | Retire Inter and IBM Plex Sans | UX-02 / Engineering |

---

## 31. Open Architectural Questions

Decisions UX-01 cannot responsibly resolve. These are downstream engineering and product decisions.

**OAQ-01 — Frontend framework**: Whether the next-generation frontend uses a component framework (React, Svelte, etc.) or continues as vanilla JS with modular architecture. UX-01 does not mandate a framework. The UX blueprint is framework-agnostic.

**OAQ-02 — Modularisation strategy**: How the monolithic dashboard.html is broken into modules. This is an engineering architecture decision, not a UX decision. Possible: web components, view templates, build-time assembly, server-side rendering.

**OAQ-03 — Voice provider strategy**: Whether Gemini Live, browser STT/TTS, or a different provider constitutes the canonical APEX Voice backend. UX-01 defines the user experience; the provider is an implementation choice.

**OAQ-04 — Realtime transport**: Whether `/ws/viz` is extended for all realtime data, or a separate subscription mechanism is used. Engineering decision.

**OAQ-05 — Notification transport for push**: Whether Web Push (current service worker infrastructure) is the canonical push notification mechanism for mobile. Engineering + product decision.

**OAQ-06 — Mobile app strategy**: Whether the mobile experience is the PWA (current), Electron (desktop only), a native app, or a separate React Native / Capacitor implementation. This affects responsive design trade-offs.

**OAQ-07 — Electron wrapper fate**: Whether `apex-electron.js` is actively used and should be maintained as a first-class desktop app, or is a parked experiment. Product decision.

**OAQ-08 — GrapesJS editor fate**: Whether `public/editor.html` (GrapesJS) is actively used for layout customisation and should be part of the new System surface, or is deprecated. Product decision.

**OAQ-09 — Canonical voice in Presentation surface**: Whether APEX speaking and a Presentation panel can be active simultaneously — primarily a UX engineering question around audio + visual attention management.

**OAQ-10 — Quiet periods implementation**: How quiet period preferences are stored (user profile, local preference, or APEX memory). Engineering decision.

**OAQ-11 — Session continuity**: Whether conversation context persists across browser sessions. Product decision (has privacy implications).

**OAQ-12 — Tree-of-Life navigation depth**: How many levels of domain hierarchy are needed. To be determined as World surface is built out; UX-01 defines the model, not the depth.

---

## 32. UX Implementation Phase Dependencies

This blueprint is designed for phased implementation. Each phase depends on prior phases.

| Phase | Description | Depends on |
|-------|-------------|-----------|
| UX-02 | Design system: single token source, typography, component library | UX-01 |
| UX-03 | Command Centre implementation: orb refinement, presentation surface, input zone fix | UX-02 |
| UX-04 | Voice unification: single APEX Voice API, state model implementation | UX-02 |
| UX-05 | Navigation: 5-surface IA, routing, keyboard shortcuts | UX-02 |
| UX-06 | Activity feed: WebSocket integration, tag system, interaction | UX-03, UX-05 |
| UX-07 | Decisions surface: approval queue, decision panel, authority records | UX-05 |
| UX-08 | World surface: Tree-of-Life navigation, domain branches | UX-05 |
| UX-09 | Knowledge surface: KG observability, evidence panels, gap browser | UX-05 |
| UX-10 | Notification system: 5-level hierarchy, governance gate | UX-06 |
| UX-11 | Contextual presentation system: panel types, trigger model | UX-03, UX-04 |
| UX-12 | Progressive disclosure: Layer 2 evidence chips, Layer 3 expansion | UX-11 |
| UX-13 | Memory surface | UX-09 |
| UX-14 | System / Constitutional surface | UX-07, UX-09 |
| UX-15 | Intelligence / agent UX: agent council, domain agent modal refine | UX-14 |
| UX-16 | Mobile-specific: voice-first mobile command, touch optimisation | UX-03–UX-05 |
| UX-17 | Accessibility audit and remediation | All prior phases |
| UX-18 | Performance and offline state | All prior phases |
| UX-19 | User preferences, quiet periods, configuration | All prior phases |

---

## 33. UX-02 Handoff Conditions

UX-02 may proceed when:

**Confirmed complete in UX-01**:
- [x] Canonical UX model defined
- [x] Five surfaces defined (Command, World, Decisions, Knowledge, System)
- [x] Three experience layers defined
- [x] Three communication channels defined (Converse, Present, Notify)
- [x] Visual identity principles established
- [x] Command Centre specification produced
- [x] Voice UX defined (one canonical APEX Voice)
- [x] Progressive disclosure model defined
- [x] Legacy preservation matrix complete
- [x] Open architectural questions documented

**Required before UX-02 begins**:
- OAQ-01 (framework): must be decided before component architecture begins
- OAQ-03 (voice provider): must be confirmed before Voice UX engineering begins
- OAQ-07 (Electron fate): must be confirmed before responsive strategy is finalised
- OAQ-05 (localStorage API key fate): must be confirmed before auth changes

**UX-02 starting conditions**:
- This document (UX-01) explicitly authorised
- Framework decision made (OAQ-01)
- Design system scope agreed: single token source, Space Grotesk as primary sans, 3 font families
- Component library approach agreed (web components vs. framework components)

---

## Appendix A — Canonical UX Matrix

| User need | Canonical entry | Primary modality | Secondary | APEX response | Presentation | Action | Memory/Record |
|-----------|---------------|-----------------|-----------|--------------|-------------|--------|--------------|
| "What's happening?" | Command (voice or text) | Voice or text | Status strip | Spoken/written summary | Activity highlights panel | Optional: drill into item | Activity log |
| "Tell me what to do." | Command (voice) | Voice | Text | Spoken recommendation | Priority card panel | Select/approve item | Decision record |
| "Why?" | Follow-up in conversation | Voice or text | Layer 2 chevron | Spoken explanation | Evidence panel | "Show more" / accept | Explanation linked to record |
| "Show me." | Conversation follow-up | Voice | Visual surface | Presentation surface activates | Domain overview / chart | Expand / close / "Explain" | Session context |
| "Do it." | Conversation | Voice | Approve button | Confirms + executes | Action status panel | Monitor outcome | Action record |
| "I don't agree." | Conversation (any point) | Voice | Reject button | Acknowledges + stops | Action REJECTED status | "What would you prefer?" | Override record |
| "Remember this." | Conversation | Voice or text | Memory confirm chip | Confirms what was saved | Memory confirmation | Edit / confirm | Memory record |
| "What do you know?" | Conversation or Knowledge surface | Text or voice | Domain drill-down | Knowledge summary | Knowledge panel | "Research this" / "Correct" | Query log |
| "Something needs attention" | Notification → Decisions | Notification banner | Activity feed | Describes situation + options | Notification detail + context | Acknowledge / Act / Defer | Notification record |
| "What are you doing?" | Activity feed / voice | Activity surface | Voice | Summary of current activity | Activity feed expanded | Tap item for detail | Activity log |
| "Can I approve this?" | Decisions surface | Decisions panel | Voice alert | Presents decision | Decision panel (full) | APPROVE / REJECT / MODIFY / DEFER | Decision record |

---

## Appendix B — Communication Modality Matrix

| Scenario | Text | Voice | Visual | Notification | Combination |
|----------|------|-------|--------|-------------|-------------|
| Simple factual question | PRIMARY | SECONDARY | — | — | — |
| Situation overview | SECONDARY | PRIMARY | OPTIONAL (summary card) | — | Voice + card |
| Recommendation | SECONDARY | PRIMARY | SUPPORTING (priority panel) | — | Voice + card |
| Evidence / Layer 2 detail | PRIMARY | SECONDARY | PRIMARY (evidence panel) | — | Visual + text |
| Decision requiring approval | PRIMARY | ALERT | PRIMARY (decision panel) | ATTENTION | All |
| Routine action completed | — | — | — | LOG | Activity feed |
| Significant event | — | APEX alerts | — | ATTENTION | Voice + banner |
| Domain overview | SECONDARY | PRIMARY | PRIMARY (domain metrics) | — | Voice + visual |
| Critical failure | — | APEX alerts | — | URGENT | Voice + overlay |
| Knowledge gap detected | PRIMARY | INCLUDED IN RESPONSE | FLAG (freshness chip) | — | Inline flag + text |
| Memory capture | PRIMARY | SECONDARY | CONFIRM CHIP | — | Text + chip |
| Long explanation | PRIMARY | SUMMARY SPOKEN | OPTIONAL | — | Voice summary + full text |
| Chart / numeric data | LABELS | HEADLINE NUMBER | PRIMARY | — | Visual primary |
| Constitutional record | PRIMARY | NEVER | SUPPORTING | — | Text + structured panel |

**Principle**: The right modality for the information. Voice for conversation and alerts; visual for data and evidence; text for precision and records; notification only when earned.

---

## Appendix C — Evidence Register

All UX-01 design decisions are traceable to UX-00 baseline, repository evidence, or explicit design reasoning.

| Decision | Type | Source |
|----------|------|--------|
| 5 surfaces (Command/World/Decisions/Knowledge/System) | PROPOSED | User task model analysis; informed by 14-page legacy IA (UX-00) |
| Plasma orb protected | OBSERVED | UX-00 §16 Existing Strengths; §15 PROTECT decision |
| Activity feed protected | OBSERVED | UX-00 §16; current `#apexFeedBody` implementation |
| Constitutional charter protected | OBSERVED | UX-00 §8614–8760 (dashboard.html); §16 |
| 5 competing token sets → 1 | OBSERVED defect | UX-00 §8.1 Colour Systems |
| Input zone hidden on command page → fix | OBSERVED defect | UX-00 D-03; dashboard.html `display:none!important` |
| 4 polling intervals → WebSocket | OBSERVED defect | UX-00 §9.2, D-04 |
| 4 voice mechanisms → 1 | OBSERVED defect | UX-00 §10.2, D-01 |
| 3 font families (retire Inter + IBM Plex) | PROPOSED | UX-00 §8.2 Typography; design simplification |
| Knowledge surface (new) | PROPOSED | UX-00 MC-02 (KG system invisible from UI); KG-08 certified |
| Decisions surface (new) | PROPOSED | UX-00 MC-05 (approval UI missing); keyboard `A` shortcut implies intent |
| Progressive disclosure 3 layers | PROPOSED | UX-01 design objective; mandate P-09 |
| localStorage API key retired | OBSERVED security risk | UX-00 S-02; D-05 |
| `page-browser` retired | OBSERVED | UX-00 §15 (36 lines, stub) |
| Tree-of-Life in World surface | PROPOSED | Canonical APEX direction; mandate §5 |
| Notification 5-level hierarchy | PROPOSED | Mandate §11; "earns the right to interrupt" principle |
| Evidence chips (Fresh/Aging/Stale) | PROPOSED | KG-07 freshness states; plain-language translation |
| JetBrains Mono for data/labels | OBSERVED + PROTECT | UX-00 §8.2; strong legacy identity |
| Cinzel for display only | OBSERVED + REFINE | UX-00 §8.2; brand identity element |
| Pure black base (#000000) | OBSERVED in apex-v2.css | UX-00 §8.1; "zero-glow philosophy" |

---

## UX-01 STATUS

**STATUS: COMPLETE**

| Field | Value |
|-------|-------|
| UX-00 baseline consumed | YES |
| Canonical UX model defined | YES |
| User/task model produced | YES (15 canonical tasks) |
| Information architecture proposed | YES (5 surfaces) |
| Tree-of-Life UX defined | YES |
| Command Centre specification | YES |
| Three communication channels defined | YES (Converse/Present/Notify) |
| Voice model defined | YES |
| Contextual presentation model | YES |
| Notification model | YES |
| Knowledge/intelligence model | YES |
| Agent/action/memory model | YES |
| System transparency model | YES |
| Legacy preservation matrix | YES |
| Visual identity principles | YES |
| Progressive disclosure model | YES |
| Canonical UX principles | YES (18 principles) |
| Terminology glossary | YES |
| UX state model | YES |
| Responsive/mobile UX | YES |
| Accessibility requirements | YES |
| Open architectural questions documented | YES (12 questions) |
| Implementation phase dependencies | YES (UX-02 through UX-19) |
| Application files modified | ZERO |
| Documentation created | `docs/interface/UX-01-CANONICAL-UX-DISCOVERY.md` |
| Hard stop | ACTIVE — UX-02 requires explicit authorisation |

**Next authorised action**: AWAIT EXPLICIT UX-02 AUTHORISATION.
