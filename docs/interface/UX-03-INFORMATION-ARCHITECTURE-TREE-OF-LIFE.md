# UX-03 — INFORMATION ARCHITECTURE + TREE OF LIFE

**Programme:** APEX Interface / UX Programme
**Phase:** UX-03 — Information Architecture + Tree of Life
**Status:** IN PROGRESS
**Depends on:** UX-00, UX-01, UX-02
**Produces:** Canonical IA for UX-04 through UX-19

---

## 1. AUTHORITY

This document is authorised by the APEX Interface / UX Programme following
explicit sign-off of:

- UX-00 — Legacy Interface Baseline (CERTIFIED)
- UX-01 — Canonical UX Discovery (COMPLETE)
- UX-02 — User + Task Model / Canonical User Journeys (COMPLETE)

UX-03 is explicitly authorised. No application modifications are permitted.

**Programme authority chain:**

```
APEX Constitutional Architecture (A0-v1.1.1)
  ↓
APEX Canonical Convergence Architecture
  ↓
UX-00 Legacy Interface Baseline
  ↓
UX-01 Canonical UX Discovery
  ↓
UX-02 User + Task Model
  ↓
UX-03 Information Architecture + Tree of Life  ← THIS DOCUMENT
  ↓
UX-04 Communication Architecture (PENDING AUTHORISATION)
```

---

## 2. SCOPE

UX-03 defines:

- The canonical information architecture of APEX
- The precise role of each of the five canonical surfaces
- The Tree of Life structure, levels, rules, and growth model
- The canonical object vocabulary
- All object relationships
- How information is discovered, searched, and navigated
- Cross-domain information handling
- The distinction between contextual and persistent information
- Progressive disclosure across the three experience layers
- Rules for placing new capabilities in the Tree
- Duplication prevention and canonical object views
- Mobile and accessibility IA
- Real-life scenario verification
- Binding IA invariants
- Open questions requiring future resolution
- Handoff specification for UX-04

**In scope:**

- Information architecture design
- Object model definition
- Relationship model
- Navigation model (conceptual)
- Tree of Life specification
- Canonical placement rules
- Mobile and accessibility IA adaptation

**Explicitly out of scope:**

- HTML modification
- CSS modification
- JavaScript modification
- Frontend component creation
- Backend route changes
- Database schema changes
- Runtime behaviour changes
- Dependency installation
- UX-04 implementation

---

## 3. SOURCE ARTEFACTS

| Artefact | Type | Evidence Classification |
|----------|------|------------------------|
| UX-00 Legacy Interface Baseline | Design audit | OBSERVED |
| UX-01 Canonical UX Discovery | Design specification | INHERITED |
| UX-02 User + Task Model | Design specification | INHERITED |
| APEX_SYSTEM_INDEX.md | Architecture audit | OBSERVED |
| APEX_ARCHITECTURE_MAP.md | Architecture audit | OBSERVED |
| APEX_DATA_MODEL.md | Architecture audit | OBSERVED |
| APEX_AGENT_SYSTEM.md | Architecture audit | OBSERVED |
| APEX_GOVERNANCE_MODEL.md | Architecture audit | OBSERVED |
| APEX_MEMORY_SYSTEM.md | Architecture audit | OBSERVED |
| apex-self-knowledge.md | Architecture audit | OBSERVED |

**Evidence classification key:**

- OBSERVED — directly established by UX-00 or repository source code
- INHERITED — established by UX-01 or UX-02, carried forward unchanged
- PROPOSED — new UX-03 design decision
- OPEN — not responsibly resolvable at this stage

---

## 4. INFORMATION ARCHITECTURE MODEL

### 4.1 Fundamental Relationship

```
SYSTEM COMPLEXITY
      ↓
CANONICAL APEX MODEL
      ↓
HUMAN INFORMATION ARCHITECTURE
      ↓
CONTEXTUAL EXPERIENCE
```

APEX's underlying architecture is deliberately complex: 10+ architectural
layers, 8-agent execution pipeline, 13-layer memory system, 40-domain
governance evidence chain, 225 agents across 15 categories, 80+ database
tables across 27 migrations, and integration with 15+ external services.

The human information architecture must make that complexity understandable
through progressive disclosure. The user must never be required to understand
lib/memory/gateway.js in order to ask "What do you remember about my finances?"

### 4.2 Core Model

```
USER
 ↓
APEX  (the unified system)
 ↓
SURFACES  (5 canonical views into APEX)
 ↓
OBJECTS  (canonical entities within each surface)
 ↓
RELATIONSHIPS  (how objects connect across surfaces)
 ↓
ACTIONS  (what the user can do with objects)
```

### 4.3 Key Architectural Principles

**ONE APEX.** (INHERITED from UX-01 P-01)
All surfaces are views into the same system. There is no Finance APEX and
System APEX. There is one APEX, viewed through different lenses.

**Backend architecture does not dictate navigation.** (PROPOSED)
The existence of `lib/memory/gateway.js` does not create a "Memory" navigation
section. The existence of `agent-system/orchestrator.js` does not create an
"Orchestrator" page. Backend structure is implementation detail. IA is human
information structure.

**Human tasks determine information placement.** (PROPOSED)
A user asking "What are my finances?" should arrive at Finance domain
information. A user asking "What did APEX decide?" should arrive at Decisions.
Information lives where human tasks originate, not where data is stored.

**Progressive disclosure controls complexity.** (INHERITED from UX-01)
A simple question receives a simple answer. Constitutional detail is available
but not default. Complexity expands on request, never by default.

### 4.4 The Five Surfaces and the Tree

The five canonical surfaces (INHERITED from UX-01) map to distinct human
information needs:

```
COMMAND    →  "Talk to me / What's happening now?"
WORLD      →  "What exists in my APEX environment?"
DECISIONS  →  "What needs my authority?"
KNOWLEDGE  →  "What does APEX know?"
SYSTEM     →  "How is APEX operating?"
```

The Tree of Life is housed within the WORLD surface. It is the canonical
organisation of domains, capabilities, and objects in the human-facing IA.

---

## 5. FIVE CANONICAL SURFACES

### 5.1 COMMAND

**Purpose:**
The primary human interaction surface. Where conversation happens, voice
operates, and contextual intelligence is delivered.

**Primary user need:**
"I want to talk to APEX and understand what is happening right now."

**Primary objects:**
- Conversation (ongoing dialogue)
- Contextual Presentation (APEX-generated visual response)
- Activity Feed (live event stream)
- Orb (voice state + identity)
- Stat Chips (current key metrics)
- Notifications (Level 3–5 attention items)

**Secondary objects:**
- Pending Decisions (surfaced when awaiting authority)
- Active Task Progress (surfaced when tasks are running)
- Knowledge References (surfaced in conversation context)
- Agent Status (surfaced when relevant to conversation)

**Entry conditions:**
- Default surface on load
- User navigates explicitly
- Voice activation from any surface
- Notification routes to COMMAND context
- "Take me home" or equivalent command

**Exit conditions:**
- User navigates to another surface
- Contextual navigation from a presentation object
- Notification routes to specific surface

**Navigation role:**
First-class primary navigation destination. Also the universal fallback —
when context is unclear, COMMAND is the default.

**Contextual role:**
COMMAND is the primary contextual surface. It surfaces relevant knowledge,
relevant decisions, relevant tasks, and relevant agent activity in real time,
based on conversation and current state. It does not duplicate objects — it
surfaces contextual views of objects that live canonically elsewhere.

**Persistent role:**
The conversation thread persists across sessions (memory-backed). The activity
feed is always live. Stat chips always current. The orb always present.

**Cross-surface relationships:**
- WORLD: domain objects surface contextually in COMMAND presentations
- DECISIONS: pending decisions surface in COMMAND when urgent
- KNOWLEDGE: evidence surfaces in COMMAND at L2 of progressive disclosure
- SYSTEM: APEX state surfaces in COMMAND status strip and stat chips

**Human layer content:**
Conversation, voice, activity summary, current metrics, key notifications.

**Intelligence layer content:**
Evidence behind assertions, confidence indicators, explanation on request,
contextual comparisons, reasoning summaries.

**Constitutional layer content:**
Authority requests, governance indicators on pending actions, audit availability,
execution pipeline visibility when relevant to task.

**What COMMAND must NOT become:**
A giant dashboard that attempts to show everything. COMMAND's purpose is
focused interaction and contextual awareness — not a comprehensive
information display. Relevant objects are surfaced on demand or when genuinely
attention-worthy. Persistent comprehensive displays belong in WORLD and SYSTEM.

---

### 5.2 WORLD

**Purpose:**
The Tree of Life environment. Where the user explores what exists in their
APEX environment: domains, capabilities, agents, knowledge, activity, and
relationships.

**Primary user need:**
"I want to understand what APEX contains and explore what it can do."

**Primary objects:**
- Domains (branches of the Tree)
- World-level Activity (cross-domain summary)
- Active Agents (system-wide agent activity summary)
- Current Priorities (cross-domain important items)

**Secondary objects:**
- Capabilities (within domains)
- Knowledge (domain-scoped or cross-domain)
- Decisions (domain-scoped, pending)
- Tasks (active, within domains)

**Entry conditions:**
- User navigates explicitly
- Voice: "Show me the world" / "What domains exist?"
- Notification routes to a domain

**Exit conditions:**
- User navigates to another surface
- User enters a domain (stays within WORLD at domain level)
- User follows a decision link → DECISIONS surface

**Navigation role:**
WORLD provides the primary structural navigation of APEX content. Within
WORLD, the user navigates the Tree: WORLD → DOMAIN → CAPABILITY → OBJECT.
This is structural/exploratory navigation, distinct from task-driven
navigation (COMMAND) or authority navigation (DECISIONS).

**Contextual role:**
Within a domain, WORLD surfaces contextually relevant knowledge, active tasks,
and recent decisions. These are contextual views of objects that live
canonically in KNOWLEDGE, SYSTEM, and DECISIONS respectively.

**Persistent role:**
The domain structure is persistent. Domain state (active/dormant), capability
registry, agent assignments, and activity history persist. The Tree structure
itself is the persistent skeleton of the APEX IA.

**Cross-surface relationships:**
- COMMAND: domain objects surface contextually in COMMAND on task completion
- DECISIONS: domain-specific decisions navigable from domain view
- KNOWLEDGE: domain-specific knowledge browsable from domain view
- SYSTEM: domain health metrics visible in SYSTEM

**Human layer content:**
Domain overview, recent activity, active capabilities, agent roster, key
metrics per domain.

**Intelligence layer content:**
Domain performance trends, opportunity signals, knowledge gaps within domain,
cross-domain pattern observations.

**Constitutional layer content:**
Domain-level authority settings, agent authority within domain, governance
records for domain-specific actions.

---

### 5.3 DECISIONS

**Purpose:**
The canonical surface for human authority. Where the user discovers, reviews,
and acts on all decisions requiring their authority — pending, historical,
deferred, and rejected.

**Primary user need:**
"I want to see what requires my decision and act on it."

**Primary objects:**
- Pending Decisions (awaiting authority)
- Recommendations (APEX recommendations requiring review)
- Decision History (approved, rejected, deferred, expired)

**Secondary objects:**
- Evidence (supporting data for each decision)
- Related Knowledge (knowledge relevant to the decision)
- Actions (what will execute on approval)
- Domain Context (which domain the decision belongs to)

**Entry conditions:**
- User navigates explicitly
- Keyboard shortcut `A` (OBSERVED, UX-00)
- Notification of Level 4 DECISION type
- Voice: "Show me the decisions" / "What needs my approval?"
- Link from COMMAND when decision pending

**Exit conditions:**
- User navigates elsewhere
- After completing all pending decisions
- User navigates to evidence in KNOWLEDGE

**Navigation role:**
DECISIONS is an authority surface, not a structural/exploratory one. Users
come here with specific intent (review decisions) rather than exploration.
Navigation within DECISIONS is list → detail → evidence, not tree-based.

**Contextual role:**
Evidence and knowledge relevant to each decision are surfaced contextually
within the decision detail. These are contextual views of objects from KNOWLEDGE.

**Persistent role:**
Decision history is permanent. The record of every decision (who decided,
what the evidence was, what was authorised, what outcome occurred) persists
indefinitely as part of the governance audit trail.

**Cross-surface relationships:**
- KNOWLEDGE: decision evidence links to canonical knowledge objects
- SYSTEM: decision execution records accessible from SYSTEM audit
- WORLD: domain decisions navigable from WORLD domain view
- COMMAND: pending decisions surfaced contextually when urgent

**Human layer content:**
Decision title, recommendation, key options, requested action summary.

**Intelligence layer content:**
Evidence, confidence levels, alternative options APEX considered, reasoning
explanation, risk assessment, comparison data.

**Constitutional layer content:**
Authority record, governance classification, evidence chain hash, execution
authorisation scope, escalation history.

---

### 5.4 KNOWLEDGE

**Purpose:**
APEX's knowledge state made observable. Not a document library — a living
representation of what APEX knows, with evidence, confidence, gaps, and
provenance.

**Primary user need:**
"I want to understand what APEX knows, where it came from, and what it
doesn't know."

**Primary objects:**
- Knowledge Items (facts, concepts, patterns, rules)
- Knowledge Gaps (identified unknowns with confidence score)
- Sources (origin references for knowledge claims)
- Evidence Blocks (supporting data for knowledge items)

**Secondary objects:**
- Knowledge Contradictions (where sources disagree)
- Research Trails (how knowledge was discovered)
- Knowledge Graph (relationships between knowledge items)
- Memory (conversation-derived knowledge)

**Entry conditions:**
- User navigates explicitly
- Voice: "Show me what you know about X" / "What are the knowledge gaps?"
- Link from decision evidence
- Link from presentation "Underlying source" action
- Notification of knowledge gap or contradiction

**Exit conditions:**
- User navigates elsewhere
- User follows action to initiate research → task created
- User navigates to decision linked to knowledge item

**Navigation role:**
KNOWLEDGE provides browsable/searchable access to APEX's knowledge base.
Navigation is knowledge-graph-shaped: item → related items → sources → evidence.
Not hierarchical like WORLD, not list-based like DECISIONS.

**Contextual role:**
Within a knowledge item, related decisions, tasks, and domain context surface
contextually. KNOWLEDGE is the canonical store for knowledge objects; COMMAND
and DECISIONS surface contextual views.

**Persistent role:**
Knowledge items persist until corrected, superseded, or explicitly forgotten.
Knowledge gaps persist until resolved. Sources and evidence blocks are
immutable once written (governance integrity).

**Cross-surface relationships:**
- DECISIONS: knowledge items surface as decision evidence
- COMMAND: knowledge referenced in conversation presentations at L2
- WORLD: domain-specific knowledge browsable from domain view
- SYSTEM: knowledge system health (gap count, confidence distribution) in SYSTEM

**Human layer content:**
What APEX knows expressed in plain language. Confidence stated simply.
Gaps acknowledged. Contradictions flagged without technical detail.

**Intelligence layer content:**
Confidence scores, source count, evidence quality, recency, contradiction
detail, alternative interpretations.

**Constitutional layer content:**
Evidence chain integrity, governance classification of knowledge source,
memory layer classification, write authority record.

**What KNOWLEDGE must NOT become:**
A generic document or file library. KNOWLEDGE represents APEX's epistemic
state — what it knows and how confidently — not a place to store files.
Files and documents live in the Storage/File capability, not in KNOWLEDGE.

---

### 5.5 SYSTEM

**Purpose:**
Owner-level transparency into APEX's operation. Constitutional state,
authority model, execution pipeline, runtime health, audit trail, and
configuration — accessible without dominating normal UX.

**Primary user need:**
"I want to understand how APEX is operating and verify it is within bounds."

**Primary objects:**
- Constitutional State (articles A1–A6, current status)
- Execution Pipeline (current and historical agent runs)
- Agent Council (executive entities and domain agents)
- Runtime Health (server, memory, model availability)
- Audit Trail (governance evidence chain, certifications)
- Activity Log (full chronological event log)
- Memory Audit (memory system state, layer usage)
- Configuration (autonomy level, cognitive policies, settings)

**Secondary objects:**
- Incidents (open and resolved)
- Cron Logs (scheduled task history)
- Governance Probes (readiness probe results)
- Agent Performance (per-stage pipeline metrics)
- Cost Summary (API cost breakdown)

**Entry conditions:**
- User navigates explicitly
- Voice: "Show me the system" / "What is APEX doing?"
- Notification of system incident
- Link from COMMAND activity feed

**Exit conditions:**
- User navigates elsewhere
- User follows task link → relevant surface

**Navigation role:**
SYSTEM is accessed for transparency and governance, not for normal tasks.
Navigation within SYSTEM is categorical: constitutional → execution →
agents → audit → health → configuration. Not tree-based, not list-based.

**Contextual role:**
SYSTEM surfaces contextual detail about executions referenced from COMMAND
activity feed. An activity feed item linking to a task execution goes to the
SYSTEM execution view of that task.

**Persistent role:**
All records in SYSTEM are persistent. Constitutional state never changes at
runtime (OBSERVED — `Object.freeze()` on lib/constitution.js). Audit records
are immutable. Agent run history retained per data model retention policies.

**Cross-surface relationships:**
- COMMAND: system status surfaces in status strip and stat chips
- WORLD: domain health metrics contributed from SYSTEM
- DECISIONS: decision execution records auditable in SYSTEM
- KNOWLEDGE: knowledge system health metrics in SYSTEM

**Human layer content:**
Is APEX healthy? Is the pipeline running? What has it done today? Plain
language summaries.

**Intelligence layer content:**
Agent performance metrics, model tier usage, cost trends, pipeline success
rates, memory utilisation patterns.

**Constitutional layer content:**
Constitution article status, governance evidence chain, certification records,
incident log, autonomy level, cognitive policy settings, gate audit trail.

**What SYSTEM must NOT expose by default:**
Raw database internals, memory table schema, file paths, implementation
details without human relevance. Every item in SYSTEM must have a legitimate
owner-level transparency purpose. When in doubt: does the owner need to see
this to understand whether APEX is operating correctly? If no, defer it.

---

## 6. ROOT

**What the root represents:**

```
APEX
```

ROOT is the conceptual unity of the system — the idea that Finance, Health,
System, Knowledge, and all domains are expressions of one APEX, not separate
products.

**Does the user see the root?**

ROOT is primarily conceptual. It is not a navigable destination. The user
does not click "APEX Root" to begin. Instead, ROOT manifests as:

- The APEX brand/identity in the topbar
- The orb on COMMAND (voice presence = system presence)
- The name "APEX" in conversational responses
- The shared context that persists across all surfaces

**What ROOT communicates:**

```
ONE APEX
ONE WORLD
ONE SYSTEM
```

No surface is a silo. No domain is isolated. The entire Tree branches from
one root: the unified APEX system serving one owner.

**Evidence classification:** PROPOSED — derived from UX-01 principle P-01
("ONE APEX") and UX-02 INV-01 ("APEX is one system seen through contextual
lenses, never multiple systems").

---

## 7. WORLD

World is the first navigable level below ROOT. It is the environment where
the owner can see, explore, and navigate everything that exists within APEX.

**World-level information answers:**
"What exists in my APEX environment?"

**World-level composition:**

```
WORLD
├── Active Cross-Domain Summary
│   ├── Current priorities (top 3–5 items needing attention)
│   ├── Cross-domain activity (last 24h, most significant events)
│   └── Active agents (which agents are currently working)
├── Domain Registry (the Tree branches)
│   ├── Finance
│   ├── Health
│   ├── Business
│   ├── Communication
│   ├── Operations
│   ├── Learning
│   ├── Research
│   ├── Occult
│   ├── Civilisation
│   └── Reality
└── World-Level Knowledge Signals
    ├── Cross-domain knowledge gaps (if significant)
    └── Cross-domain decisions (if pending)
```

**World-level user experience (Human layer):**
The user sees APEX's environment at a glance. Active domains with recent
activity are prominent. Dormant domains recede. Current priorities surface
at the top. The user can immediately see what needs attention and which
domains are alive.

**World-level user experience (Intelligence layer, on request):**
Domain health scores, activity trends, cross-domain pattern summaries,
opportunity signals, agent utilisation.

**World-level user experience (Constitutional layer, on request):**
Domain-level authority configurations, agent authority within domains,
governance status per domain.

**Evidence classification:**
- Five canonical surfaces: INHERITED (UX-01)
- Domain list (Finance, Health, Business, etc.): OBSERVED — derived from
  14 legacy pages in UX-00 after removing Command (→ COMMAND surface),
  System (→ SYSTEM surface), Overview (→ WORLD summary)
- World-level composition: PROPOSED

---

## 8. TREE OF LIFE

The Tree of Life is the HUMAN INFORMATION ARCHITECTURE of APEX.

It is not a filesystem, not a database schema, not a list of API routes. It
is the structure through which the owner discovers and navigates what APEX
contains, what it can do, and what it knows.

### 8.1 Tree Structure

```
ROOT (APEX)
 └─ WORLD
     └─ DOMAIN  (e.g., Finance)
         ├─ CAPABILITIES  (e.g., Log Expense, Budget Analysis)
         ├─ AGENTS        (e.g., Finance Agent)
         ├─ KNOWLEDGE     (domain-scoped knowledge items)
         ├─ DECISIONS     (domain-scoped pending/historical decisions)
         ├─ TASKS         (active and recent tasks in this domain)
         └─ ACTIVITY      (domain event log)
```

### 8.2 Tree Levels

| Level | Name | Quantity | Navigable? | Persistent? |
|-------|------|----------|------------|-------------|
| 0 | ROOT | 1 | No (conceptual) | Always |
| 1 | WORLD | 1 | Yes | Always |
| 2 | DOMAIN | 10 canonical + extensible | Yes | Persistent |
| 3 | CAPABILITY / AGENT / KNOWLEDGE / DECISION / TASK / ACTIVITY | Multiple per domain | Yes | Varies |
| 4 | OBJECT (instance) | N per type | Yes | Lifecycle-dependent |

### 8.3 Tree Navigation Principle

A user moves through the Tree by:
1. **Natural language** — "Take me to Finance" (COMMAND-driven, preferred)
2. **Visual navigation** — clicking domain cards in WORLD surface
3. **Deep link** — notification or presentation link routes directly to object
4. **Search** — finding objects regardless of Tree position

The Tree is not a mandatory click-path. A user who asks "What's my balance?"
never needs to know that Finance is a domain in WORLD. APEX surfaces the
answer in COMMAND. The Tree is for exploration and browsing, not for task
completion.

### 8.4 Tree Visibility Rules

```
WORLD (Level 1)
  → Always visible: all active domains, cross-domain summary
  → On demand: dormant domains, world-level knowledge signals

DOMAIN (Level 2)
  → Entry: always visible, minimal state
  → Expanded: capabilities, active tasks, recent activity, knowledge summary
  → Full: all content, including history

CAPABILITY / OBJECT (Level 3–4)
  → On activation or explicit navigation
  → Contextual when relevant to current task (appears in COMMAND)
```

---

## 9. DOMAINS

### 9.1 What Qualifies as a Domain

A domain is a coherent, persistent area of life or work with:
- Distinct scope that does not overlap with another domain
- Multiple capabilities (not a single feature)
- Recurring tasks or activity
- Persistent state (knowledge, history, decisions)
- At least one associated agent (current or future)

**What does NOT qualify as a domain:**
- A single capability (e.g., "web search" → capability within Research)
- A temporary project (unless it matures into a domain)
- A feature or tool (e.g., "browser" → capability, not domain)
- A backend module (e.g., orchestrator → not a domain)
- A surface (COMMAND, WORLD, DECISIONS, KNOWLEDGE, SYSTEM are surfaces, not
  domains in the Tree)

### 9.2 Canonical Domains

The following ten domains are derived directly from the legacy pages
(OBSERVED in UX-00), validated against the architecture docs, and confirmed
as distinct coherent areas of life/work:

| # | Domain | Legacy Page | Agent | Scope |
|---|--------|-------------|-------|-------|
| 1 | Finance | page-finance | Finance Agent | Expenses, budgets, balance, transactions, financial intelligence |
| 2 | Health | page-health | (future) | Workouts, nutrition, sleep, mood, body measurements |
| 3 | Business | page-business | Business Agent | Business tasks, CRM, leads, business intelligence |
| 4 | Communication | page-communication | (future) | Email, messages, calendar, outreach |
| 5 | Operations | page-operation | System Agent | System operations, processes, automations |
| 6 | Learning | page-university | Uni Agent | University work, flashcards, study, learning goals |
| 7 | Research | page-research | Research Agent | Web research, fact-finding, synthesis |
| 8 | Occult | page-occult | (future) | Esoteric studies, personal domain |
| 9 | Civilisation | page-civilisation | (future) | Civilisation management, strategic domain |
| 10 | Reality | page-reality | (future) | Epistemic architecture, reality convergence, observer models |

**Evidence classification:**
- Domain list: OBSERVED (from UX-00 legacy pages, minus Command/System/Overview)
- Agent assignments: OBSERVED (from apex-self-knowledge.md domain agents)
- Scope descriptions: PROPOSED (refined from legacy page content + architecture)

### 9.3 Domain Creation Rules

A new domain may be created when:
1. It passes the qualification test (Section 9.1)
2. It has a declared name, scope statement, and primary capability
3. It does not overlap with an existing domain's scope
4. A placement decision confirms it cannot be a capability within an existing
   domain
5. Human approval of the new domain (constitutional requirement)

APEX may propose domain creation. The owner must authorise it.

### 9.4 Domain Permanence

Domains are persistent by default. They do not disappear when inactive.
Instead:

- **ACTIVE**: has activity in the last 30 days
- **DORMANT**: no activity in 30+ days (recedes in WORLD but not removed)
- **ARCHIVED**: owner explicitly archived (hidden from WORLD by default)

Domain archiving requires explicit human authorisation. APEX may suggest
archiving dormant domains; it may not archive them autonomously.

### 9.5 Domain Overlap

Domains must not overlap in scope. When a task involves multiple domains
(e.g., a business decision requiring financial analysis), this is a
cross-domain task — handled by cross-domain rules (Section 14), not by
creating an overlapping domain.

The canonical domain receives the task. Cross-domain input is gathered
automatically and surfaced without requiring the user to visit each domain.

### 9.6 Domain Naming

Domains are named by their human-recognisable scope, not by their backend
module. The domain is "Finance", not "FinanceAgent" or "pg_finance". The
domain is "Learning", not "UniversityModule".

---

## 10. DOMAIN INTERNAL STRUCTURE

### 10.1 Standard Domain Components

Every domain contains the following components. Visibility varies:

| Component | Always Visible | Contextual | Expandable | Hidden Until Relevant |
|-----------|---------------|------------|------------|----------------------|
| Domain Overview | Yes | — | — | — |
| Active Capabilities | Yes | — | — | — |
| Active Tasks | Yes (if any) | — | — | — |
| Active Agents | Yes (if any) | — | — | — |
| Recent Activity | Yes (last 5 items) | — | Full log | — |
| Pending Decisions | — | Yes (if any pending) | — | — |
| Knowledge Summary | — | Yes (top items) | Full KNOWLEDGE | — |
| Historical Tasks | — | — | Yes | — |
| Decision History | — | — | Yes | — |
| Domain Configuration | — | — | — | System/owner access only |

### 10.2 Domain Overview Content

The domain overview answers:

- What is this domain about? (one sentence)
- What is its current state? (active/dormant/specific status)
- What is APEX doing in this domain right now?
- What are the most important items to know right now?

The overview is the Human layer. Intelligence layer (trends, analysis,
opportunity signals) expands on request.

### 10.3 Domain Capabilities List

Capabilities are listed in order of: most recently used → most frequently
used → available but unused. This surfaces relevant capabilities first
without requiring the user to know what APEX can do in advance.

### 10.4 Domain Agent Roster

The domain agent roster shows which agents are assigned to this domain,
their current state (IDLE/ACTIVE/EXECUTING), and their most recent action.
Tapping an agent entry opens the contextual agent view (what it's doing,
its scope, communication with it).

### 10.5 Avoiding Rigid Identical Navigation

Domains are not identical templates. Domain internal structure adapts:
- Finance shows financial metrics prominently
- Health shows health tracking prominently
- Research shows recent research threads prominently
- Learning shows due flashcards and study sessions prominently

The structure is consistent (overview, capabilities, agents, activity,
knowledge, decisions). The content and visual weight distribution adapts
to domain characteristics.

**Evidence classification:** PROPOSED

---

## 11. CAPABILITIES

### 11.1 What is a Capability

A capability is something APEX can do within a domain. It is a named,
discoverable function that the user can invoke (directly or through
conversation).

Examples:
- Finance → "Log Expense", "Budget Analysis", "Balance Check",
  "Transaction History", "Financial Forecast"
- Health → "Log Workout", "Log Meal", "Sleep Log", "Mood Check",
  "Health Trend Analysis"
- Research → "Web Search", "Fact Finding", "Synthesis", "Source Evaluation"

### 11.2 Capability vs. Task vs. Action

| Concept | Definition |
|---------|-----------|
| CAPABILITY | A type of thing APEX can do (persistent template) |
| TASK | A specific execution of a capability (lifecycle instance) |
| ACTION | A consequential operation within or resulting from a task |

A capability is a potential. A task is a realisation of that potential. An
action is a consequential step within a task.

### 11.3 Capability Classification

| Type | Description | Example |
|------|-------------|---------|
| Global | Available across all domains | "Search", "Web Access", "Memory recall" |
| Domain-specific | Only available in one domain | "Log Expense" in Finance |
| Cross-domain | Spans multiple domains | "Business financial analysis" |
| Contextual | Only appears when conditions are met | "Escalate to executive council" |
| Agent-mediated | Executed by a specific agent | "Deploy to Render" (System Agent) |

### 11.4 Capability Discovery

A user should never need to know implementation details to discover a
capability. Discovery paths:

1. **Conversational discovery** — "What can you do with my finances?"
   → APEX responds with capability list for Finance domain

2. **Domain browsing** — Navigate to Finance in WORLD → capability list
   visible

3. **Contextual suggestion** — During conversation, APEX suggests relevant
   capability: "I can also forecast your spend — would you like that?"

4. **Search** — "budget" in global search returns Finance Budget Analysis
   capability

5. **APEX-initiated** — APEX proactively surfaces a capability when
   conditions are met: "I noticed your expenses haven't been logged this
   week. Would you like me to check your recent transactions?"

### 11.5 Capability Placement Rule

New capabilities obey the following placement rule (see also Section 25):

1. Identify the domain where the human task originates
2. If single domain → place capability in that domain
3. If multiple domains → place in primary domain, cross-reference from
   secondary domains
4. If no suitable domain → evaluate whether a new domain is warranted
   (Section 9.3), or classify as a global capability
5. Never create a new surface to house a capability

**Evidence classification:** PROPOSED

---

## 12. OBJECTS

### 12.1 Canonical Object Vocabulary

APEX's IA operates on 15 canonical object types. All information in APEX
is an instance of one of these types.

| # | Object | Canonical Surface | Core Purpose |
|---|--------|------------------|-------------|
| 1 | DOMAIN | WORLD | Coherent area of life/work |
| 2 | CAPABILITY | WORLD (within domain) | Something APEX can do |
| 3 | AGENT | SYSTEM | An APEX execution entity |
| 4 | TASK | SYSTEM (audit) | A unit of work in progress or complete |
| 5 | DECISION | DECISIONS | A choice requiring human authority |
| 6 | ACTION | SYSTEM (audit) | A consequential operation |
| 7 | KNOWLEDGE | KNOWLEDGE | A fact, concept, pattern, or rule |
| 8 | SOURCE | KNOWLEDGE | The origin of a knowledge claim |
| 9 | EVIDENCE | DECISIONS + KNOWLEDGE | Data supporting a claim or decision |
| 10 | MEMORY | SYSTEM (memory audit) | Retained context from interaction |
| 11 | EVENT | SYSTEM (event log) | A system occurrence |
| 12 | NOTIFICATION | COMMAND (delivery) | A user-facing signal |
| 13 | PRESENTATION | COMMAND (temporary) | A contextual visual object |
| 14 | ACTIVITY | COMMAND + SYSTEM | Human-readable action log |
| 15 | SYSTEM STATE | SYSTEM | Runtime condition of APEX |

### 12.2 Object Specifications

---

#### DOMAIN

| Attribute | Value |
|-----------|-------|
| Identity | Stable name + UUID |
| Purpose | Organise capabilities, knowledge, tasks, agents for one area of life/work |
| Owner | APEX (auto-created from architecture) or Founder (user-created) |
| Parent | WORLD |
| Children | Capabilities, Agents, Tasks, Knowledge, Decisions, Activity |
| Relationships | Cross-domain links; shared agents; shared decisions |
| Lifecycle | INITIALISED → ACTIVE → DORMANT → ARCHIVED |
| Visibility | Always in WORLD; contextually referenced in COMMAND |
| Actions | Enter, search, browse capabilities, view activity, configure, archive |
| Canonical surface | WORLD |
| Contextual surfaces | COMMAND (reference in conversation), SYSTEM (health metrics) |

---

#### CAPABILITY

| Attribute | Value |
|-----------|-------|
| Identity | Name within domain + UUID |
| Purpose | Discoverable function APEX can perform |
| Owner | Domain (parent) |
| Parent | DOMAIN |
| Children | Tasks (instances of this capability), Presentations (output type) |
| Relationships | Domain, Agents (which execute it), Knowledge (what it uses) |
| Lifecycle | AVAILABLE → EXECUTING (instance) → COMPLETE (instance) |
| Visibility | Within domain view; contextually in COMMAND when relevant |
| Actions | Invoke, learn about, see execution history |
| Canonical surface | WORLD (within domain) |
| Contextual surfaces | COMMAND (when contextually suggested or invoked) |

---

#### AGENT

| Attribute | Value |
|-----------|-------|
| Identity | Role name + UUID |
| Purpose | Execute tasks, monitor domain, coordinate execution |
| Owner | SYSTEM (APEX-managed) |
| Parent | SYSTEM (canonical) |
| Children | Tasks (assigned/executing), Activity log |
| Relationships | Domains served, Tasks executed, Executive Council (supervisory) |
| Lifecycle | IDLE → ACTIVE → EXECUTING → REPORTING → IDLE |
| Visibility | Canonical in SYSTEM; contextual in domain, COMMAND |
| Actions | View scope, view current task, view history, communicate with |
| Canonical surface | SYSTEM |
| Contextual surfaces | WORLD/domain (domain agent roster), COMMAND (agent status) |

**Agent types from architecture (OBSERVED):**
- 8-stage pipeline agents: RESEARCHER, ARCHITECT, DEVELOPER, REVIEWER,
  VALIDATOR, TESTER, COMMITTER, REFLECTOR
- 7 executive entities: CEO, CTO, CFO, COO, CSO, CIO, CGO
- 5 domain agents: System, File, Uni, Finance, Business
- 225-agent library across 15 categories (source: APEX_AGENT_SYSTEM.md)

In the IA, agents are presented by ROLE (Finance Agent, Research Agent),
not by internal class name (financeAgent) or pipeline stage (ARCHITECT).
Users interact with roles. Roles may involve multiple underlying agents.

---

#### TASK

| Attribute | Value |
|-----------|-------|
| Identity | UUID + description + created_at |
| Purpose | Track a unit of work from initiation to outcome |
| Owner | APEX (auto-created from intent or explicit request) |
| Parent | DOMAIN (domain-specific) or WORLD (cross-domain) |
| Children | Stages (pipeline stages), Actions, Evidence, Memory (lessons) |
| Relationships | Decision (task may require decision), Agent (executor), Knowledge (input) |
| Lifecycle | DISCOVERED → QUEUED → APPROVED → RUNNING → [COMPLETE / FAILED / CANCELLED / DEFERRED] |
| Visibility | Active tasks in COMMAND activity; history in SYSTEM/WORLD |
| Actions | Approve, reject, cancel, view progress, view stages, view lessons |
| Canonical surface | SYSTEM (full execution record) |
| Contextual surfaces | COMMAND (active tasks in activity feed), WORLD/domain (domain tasks), DECISIONS (if awaiting approval) |

---

#### DECISION

| Attribute | Value |
|-----------|-------|
| Identity | UUID + title + status + created_at |
| Purpose | Surface a choice requiring human authority |
| Owner | APEX (proposes) + Founder (decides) |
| Parent | DOMAIN (domain-specific) or cross-domain |
| Children | Evidence, Actions (what executes on approval), Related Knowledge |
| Relationships | Task (decision may block task), Knowledge (evidence), Action (decision enables action) |
| Lifecycle | PROPOSED → PENDING → [APPROVED / REJECTED / DEFERRED / EXPIRED] |
| Visibility | Pending decisions prominent in COMMAND + DECISIONS; history in DECISIONS |
| Actions | Approve, Reject, Modify, Defer, Ask Why, Ask for Evidence |
| Canonical surface | DECISIONS |
| Contextual surfaces | COMMAND (pending decisions), WORLD/domain (domain decisions) |

---

#### ACTION

| Attribute | Value |
|-----------|-------|
| Identity | UUID + description + status + authority_record |
| Purpose | Track consequential operations with authority chain |
| Owner | APEX (executes on authority) |
| Parent | TASK or DECISION |
| Children | Audit records, Evidence |
| Relationships | Decision (source of authority), Task (execution context), Agent (executor) |
| Lifecycle | PENDING_APPROVAL → AUTHORISED → EXECUTING → [COMPLETE / FAILED / CANCELLED] |
| Visibility | Active actions in COMMAND activity; history in SYSTEM audit |
| Actions | View authority chain, view execution detail, view outcome |
| Canonical surface | SYSTEM (audit trail) |
| Contextual surfaces | COMMAND (active actions), DECISIONS (action associated with decision), WORLD/domain |

---

#### KNOWLEDGE

| Attribute | Value |
|-----------|-------|
| Identity | UUID + type (fact/concept/pattern/rule) + domain + confidence |
| Purpose | Represent what APEX knows, with provenance |
| Owner | APEX (derived) + Founder (corrections) |
| Parent | KNOWLEDGE surface (canonical); optionally DOMAIN (domain-scoped) |
| Children | Sources, Evidence, Related Knowledge (graph edges) |
| Relationships | Source (origin), Evidence (support), Decision (used by), Task (relied on) |
| Lifecycle | DISCOVERED → ACTIVE → STALE → CORRECTED → SUPERSEDED |
| Visibility | Canonical in KNOWLEDGE surface; contextual in COMMAND presentations |
| Actions | Correct, dispute, request research, view evidence, see decision usage |
| Canonical surface | KNOWLEDGE |
| Contextual surfaces | COMMAND (L2 evidence in presentations), DECISIONS (decision evidence), WORLD/domain |

---

#### SOURCE

| Attribute | Value |
|-----------|-------|
| Identity | UUID + type (web/document/memory/agent/external) + reference |
| Purpose | Provenance for knowledge claims |
| Owner | APEX (discovered) |
| Parent | KNOWLEDGE (items that cite it) |
| Lifecycle | ACTIVE → STALE → UNAVAILABLE |
| Canonical surface | KNOWLEDGE |
| Contextual surfaces | DECISIONS (evidence sources) |

---

#### EVIDENCE

| Attribute | Value |
|-----------|-------|
| Identity | UUID + payload + SHA-256 hash (from governance evidence chain) |
| Purpose | Verifiable data supporting knowledge claims and decisions |
| Owner | APEX (collected via governance pipeline) |
| Parent | DECISION or KNOWLEDGE |
| Lifecycle | CREATED → CITED → SUPERSEDED (immutable once created) |
| Canonical surface | DECISIONS (decision evidence), KNOWLEDGE (knowledge evidence) |
| Contextual surfaces | COMMAND (L2 layer progressive disclosure) |

---

#### MEMORY

| Attribute | Value |
|-----------|-------|
| Identity | UUID + type (preference/fact/context/correction/instruction) + scope |
| Purpose | Persist context that improves future interactions |
| Owner | APEX (stores) + Founder (controls, corrects, forgets) |
| Parent | COMMAND (conversation memory) or DOMAIN (domain-specific) |
| Lifecycle | STORED → ACTIVE → RECALLED → [CORRECTED / EXPIRED / FORGOTTEN] |
| Visibility | Referenced contextually in COMMAND; auditable in SYSTEM |
| Actions | Correct, forget, view provenance, browse |
| Canonical surface | SYSTEM (memory audit) |
| Contextual surfaces | COMMAND (when recalled in conversation), KNOWLEDGE (knowledge-class memories) |

**Memory layers from architecture (OBSERVED):**
13-layer memory system (lib/memory/). In the IA, memory is presented by
scope and type (preference, fact, instruction), not by internal layer number.

---

#### EVENT

| Attribute | Value |
|-----------|-------|
| Identity | UUID + type + payload + created_at |
| Purpose | Immutable record of significant system occurrence |
| Owner | APEX (auto-generated) |
| Parent | SYSTEM (event log) |
| Lifecycle | CREATED → LOGGED (immutable) |
| Visibility | SYSTEM event log (full); relevant events in COMMAND activity feed |
| Canonical surface | SYSTEM |

---

#### NOTIFICATION

| Attribute | Value |
|-----------|-------|
| Identity | UUID + level (0–5) + content + destination object |
| Purpose | Communicate proactively to the user |
| Owner | APEX (generated) |
| Parent | EVENT (what triggered it) |
| Lifecycle | CREATED → DELIVERED → [ACKNOWLEDGED / ACTED_ON / DISMISSED / EXPIRED] |
| Visibility | COMMAND (activity feed, attention zone); surface overlays for L3–L5 |
| Actions | Acknowledge, act on (follows to destination), dismiss |
| Canonical surface | COMMAND (delivery surface) |
| Contextual surfaces | Any surface (overlay for L3 ATTENTION and above) |

**Notification levels (INHERITED from UX-01, UX-02):**
- Level 0 SILENT — logged only
- Level 1 LOG — activity feed only
- Level 2 IN-APP — visible in notification tray
- Level 3 ATTENTION — interrupts current context mildly
- Level 4 DECISION — requires authority action
- Level 5 URGENT — interrupts regardless

---

#### PRESENTATION

| Attribute | Value |
|-----------|-------|
| Identity | UUID + type (chart/card/comparison/table/text) + TTL |
| Purpose | Contextual visual augmentation of conversation |
| Owner | APEX (generated for context) |
| Parent | TASK or KNOWLEDGE or DECISION (what prompted it) |
| Lifecycle | GENERATED → DISPLAYED → [DISMISSED / EXPIRED / NAVIGATED_FROM] |
| Visibility | COMMAND presentation zone |
| Actions | Expand (progressive disclosure), navigate to source, dismiss |
| Canonical surface | COMMAND (temporary; not persistent) |
| Contextual surfaces | None — all context navigates to source object |

A presentation is NOT a persistent object. It is a view generated from
persistent objects (knowledge items, task outputs, decision data). Dismissing
a presentation does not lose the underlying data — it is always retrievable
from the canonical source.

---

#### ACTIVITY

| Attribute | Value |
|-----------|-------|
| Identity | Chronological stream; individual items have UUID + timestamp + summary |
| Purpose | Human-readable log of what APEX has done |
| Owner | APEX (auto-logged) |
| Parent | SYSTEM (full log); COMMAND (recent relevant); WORLD/domain (domain-scoped) |
| Lifecycle | Persistent; retention per data model policies |
| Visibility | Always-on in COMMAND activity feed; filtered by domain in WORLD; full in SYSTEM |
| Actions | Expand item, navigate to source task/decision/event |
| Canonical surface | SYSTEM (full chronological log) |
| Contextual surfaces | COMMAND (recent relevant), WORLD/domain (domain activity) |

---

#### SYSTEM STATE

| Attribute | Value |
|-----------|-------|
| Identity | Composite metric (server health + agent status + memory + model availability) |
| Purpose | Owner-level transparency about APEX's operational condition |
| Owner | APEX (auto-maintained) |
| Lifecycle | Continuous / real-time |
| Visibility | SYSTEM surface (full); COMMAND (stat chips + status dot summary) |
| Actions | Drill into specific metric, view history, trigger health check |
| Canonical surface | SYSTEM |
| Contextual surfaces | COMMAND (status strip, health stat chip) |

---

## 13. RELATIONSHIPS

### 13.1 Canonical Relationship Map

```
DOMAIN ──────────── CAPABILITY    (domain owns capabilities)
DOMAIN ──────────── AGENT         (domain has assigned agents)
DOMAIN ──────────── TASK          (tasks belong to domains)
DOMAIN ──────────── KNOWLEDGE     (domain-scoped knowledge)
DOMAIN ──────────── DECISION      (domain-scoped decisions)
DOMAIN ──────────── ACTIVITY      (domain event log)

CAPABILITY ──────── TASK          (capability instantiates as task)
CAPABILITY ──────── AGENT         (agent executes capability)

TASK ────────────── DECISION      (task may require decision)
TASK ────────────── ACTION        (task contains actions)
TASK ────────────── EVIDENCE      (task produces evidence)
TASK ────────────── AGENT         (agent executes task)
TASK ────────────── KNOWLEDGE     (task uses/produces knowledge)
TASK ────────────── MEMORY        (task produces lessons/memory)
TASK ────────────── EVENT         (task emits events)

DECISION ────────── KNOWLEDGE     (decision uses knowledge as evidence)
DECISION ────────── EVIDENCE      (decision has supporting evidence)
DECISION ────────── ACTION        (decision enables action on approval)
DECISION ────────── TASK          (decision authorises or blocks task)

ACTION ──────────── DECISION      (action has authority from decision)
ACTION ──────────── AGENT         (agent executes action)
ACTION ──────────── EVIDENCE      (action produces evidence/audit record)

KNOWLEDGE ──────── SOURCE         (knowledge has provenance sources)
KNOWLEDGE ──────── EVIDENCE       (knowledge supported by evidence)
KNOWLEDGE ──────── KNOWLEDGE      (graph edges: related concepts)
KNOWLEDGE ──────── MEMORY         (some memories are knowledge-class)

EVIDENCE ────────── SOURCE        (evidence has origin source)
EVIDENCE ────────── TASK          (evidence produced by task execution)

EVENT ───────────── NOTIFICATION  (event triggers notification)
EVENT ───────────── ACTIVITY      (event appears in activity log)

NOTIFICATION ────── OBJECT        (notification links to destination object)
NOTIFICATION ────── COMMAND       (notification delivered via COMMAND)

PRESENTATION ────── KNOWLEDGE     (presentation renders knowledge)
PRESENTATION ────── TASK          (presentation renders task output)
PRESENTATION ────── DECISION      (presentation renders decision data)

MEMORY ──────────── CONVERSATION  (memory derived from conversation)
MEMORY ──────────── TASK          (memory derived from task lessons)
MEMORY ──────────── KNOWLEDGE     (knowledge-class memories)
```

### 13.2 Relationship Directionality

All relationships are bidirectional for navigation but have a primary
direction for ownership:

- A TASK belongs to a DOMAIN. Navigation: domain → task list, OR task → its domain.
- A DECISION uses KNOWLEDGE. Navigation: decision → evidence, OR knowledge → which decisions cited it.
- A NOTIFICATION links to an OBJECT. Navigation: notification → destination object.

The bidirectional traversal is what prevents information silos (Section 14).

---

## 14. CROSS-DOMAIN INFORMATION

### 14.1 The Problem

A business decision may require:
- Business domain (context, strategy)
- Finance domain (financial data)
- Knowledge surface (relevant research)
- Decisions surface (prior related decisions)
- System (agent execution status)

Without a cross-domain model, the user must manually visit five locations
to assemble the picture. APEX must assemble it.

### 14.2 Cross-Domain Model

Cross-domain information is handled by APEX, not by the user. When a task
or decision spans multiple domains:

1. APEX identifies the relevant domains automatically
2. APEX assembles the cross-domain view in COMMAND or DECISIONS
3. The user sees a unified view
4. Each piece of information is attributable to its domain of origin
5. The user may navigate to each domain for depth if desired

### 14.3 Cross-Domain Objects

Some objects are inherently cross-domain:

| Object | Cross-Domain Handling |
|--------|----------------------|
| TASK | Task may span multiple domains; appears in each relevant domain's task list |
| DECISION | Decision may reference knowledge from multiple domains; all evidence assembled in DECISIONS |
| KNOWLEDGE | Cross-domain knowledge items have multiple domain tags; appear in each relevant domain |
| ACTIVITY | Cross-domain events appear in COMMAND activity feed and in each relevant domain |
| AGENT | Executive agents (CTO, CFO, etc.) are cross-domain by nature; domain agents are domain-scoped |

### 14.4 Cross-Domain Search

Search (Section 17) is inherently cross-domain. A search for "revenue"
returns results from: Finance (transactions, budgets), Business (CRM,
business tasks), Knowledge (financial facts), Decisions (revenue-related
decisions), Tasks (revenue-related tasks).

### 14.5 Cross-Domain Presentation

When APEX surfaces a contextual presentation in COMMAND involving data
from multiple domains, the presentation is clearly attributed ("This combines
your Finance and Business data"). Each data component is navigable to its
source domain.

### 14.6 Canonical Home for Cross-Domain Objects

Even cross-domain objects have a canonical home:

- Cross-domain TASK → lives in the primary domain; referenced in secondary domains
- Cross-domain DECISION → lives in DECISIONS (not domain-specific)
- Cross-domain KNOWLEDGE → lives in KNOWLEDGE (tagged with multiple domains)

**Evidence classification:** PROPOSED

---

## 15. CONTEXTUAL VS PERSISTENT INFORMATION

### 15.1 Classification

| Class | Definition | Examples | Rules |
|-------|-----------|----------|-------|
| PERSISTENT | Survives indefinitely; canonical; source of truth | Domains, Decisions, Knowledge items, Tasks (record), Memory, Sources, Evidence | Cannot be destroyed without explicit authority; canonical copy always exists |
| CONTEXTUAL | Generated for current task; references persistent objects; does not duplicate | Presentations, Contextual views in COMMAND, Domain knowledge summary | Generated from persistent sources; dismissing does not lose data |
| TEMPORARY | Lifecycle-bound; expires automatically | Active task progress display, Agent state indicators | Expires when task completes or TTL elapses |
| EPHEMERAL | In-flight only; not stored | Orb listening state, "Thinking..." indicator, voice waveform | Not recorded; reflects live state only |

### 15.2 Contextual Information Rules

1. **Contextual information must always reference its canonical source.**
   A presentation card showing financial data links to the Finance domain
   canonical objects, not to a copy of the data.

2. **Dismissing contextual information never loses data.**
   Dismissing a presentation card does not delete the underlying knowledge.

3. **Contextual information does not create new canonical objects.**
   APEX may generate a contextual view of a decision in COMMAND. This is not
   a new decision. The decision lives in DECISIONS.

4. **Contextual placement is driven by user context, not object type.**
   A knowledge item that is relevant to the current conversation surfaces
   contextually in COMMAND. The same item may surface contextually in a
   decision. The item itself lives in KNOWLEDGE.

### 15.3 Persistent Information Rules

1. **Persistent objects have stable identities (UUIDs).**
2. **Persistent objects have canonical surfaces.**
3. **Persistent objects can appear in multiple contextual surfaces simultaneously.**
4. **Destroying a persistent object requires explicit human authority.**
5. **The governance audit trail (evidence_blocks, certifications) is immutable
   — not even the founder can delete it.**

---

## 16. DISCOVERY

### 16.1 Browsing

The WORLD surface is the primary browsing environment. A user who does not
know what APEX contains can navigate: WORLD → domains list → domain →
capabilities list → capability detail.

This browsing path requires zero knowledge of backend architecture.

### 16.2 Conversational Discovery

The most natural discovery path. Examples:

- "What can you do?"
  → APEX responds with top-level capability summary + invitation to explore
    specific domains

- "What can you do with my finances?"
  → APEX responds with Finance domain capabilities

- "What do you know about my business?"
  → APEX responds with Business domain knowledge summary + invites navigation

- "What agents do you have?"
  → APEX responds with agent roster by role

Conversational discovery does not require navigation. APEX provides the
answer in COMMAND.

### 16.3 Contextual Suggestions

APEX proactively surfaces capabilities and information when conditions are
met (INHERITED from UX-02 proactive governance gate):

- "I noticed you haven't logged a workout this week. Want me to check your
  routine?"
- "Based on what you've told me, I can also forecast your monthly spend."
- "There's a new research capability available for the Research domain."

Contextual suggestions are governed by the proactive gate (UX-02 Section:
Proactive Behaviour). They are not arbitrary pop-ups.

### 16.4 World Exploration

WORLD itself is a discovery environment. A user who browses to an unfamiliar
domain discovers what APEX can do there. Capability lists within domains
show available functions with brief descriptions.

### 16.5 APEX Recommendations

APEX may recommend capabilities or domains proactively based on patterns:

- Repeated manual tasks → "I can automate this"
- Knowledge gaps in a domain → "I don't have enough information about X —
  should I research it?"
- Opportunity signals → "I notice a pattern in your business data"

Recommendations surface in COMMAND activity or as Level 2 IN-APP
notifications. Never higher without genuine urgency.

### 16.6 Anti-Pattern: Static Feature Directory

APEX must not present a static flat list of features. Discovery must be
contextual, progressive, and conversation-first. A feature directory exists
implicitly within the WORLD domain capability lists, but it is not the
primary discovery surface.

**Evidence classification:** PROPOSED

---

## 17. SEARCH

### 17.1 Search Scope

Global search covers all persistent objects:

| Object type | Searchable fields |
|-------------|------------------|
| DOMAIN | Name, description |
| CAPABILITY | Name, description, domain |
| AGENT | Role name, scope |
| TASK | Description, objective, status |
| DECISION | Title, recommendation, status |
| KNOWLEDGE | Fact text, concept name, tags, domain |
| SOURCE | Reference, type |
| MEMORY | Content, type, scope |
| ACTIVITY | Summary text, type |

### 17.2 Search Types

| Type | Description |
|------|-------------|
| Global search | Searches all object types simultaneously |
| Contextual search | Searches within current surface or domain |
| Semantic search | Natural language query matched by meaning (backed by pgvector, OBSERVED in data model) |
| Filter search | Constrained by type, status, domain, date range |

### 17.3 Search Result Types

Results are grouped by object type and weighted by relevance to the query.
Each result shows:
- Object type badge
- Title/summary
- Domain attribution (if applicable)
- Status indicator (if lifecycle-relevant)
- Relationship count (if useful — e.g., "used in 3 decisions")
- Deep link to canonical location

### 17.4 Search Result Relationships

Search results must surface cross-object relationships. A search for
"revenue" returns a knowledge item, linked decisions, linked tasks, and
linked activity — not just isolated items.

### 17.5 Search Navigation

From a search result, the user navigates to the canonical surface of the
object (e.g., a decision result navigates to DECISIONS/that-decision).
Context is preserved — after visiting the result, back returns to search.

### 17.6 Command-Driven Search

Search can be invoked through conversation:
- "Find everything about my business revenue"
- "Search for last week's decisions"
- "What knowledge do I have on sleep?"

Conversational search results surface in COMMAND as a structured response,
with navigation links to canonical surfaces.

**Evidence classification:** Search concept INHERITED from UX-01; search
details PROPOSED.

---

## 18. NAVIGATION

### 18.1 Navigation Model

APEX uses a four-tier navigation model:

| Tier | Name | Scope | Persistence |
|------|------|-------|-------------|
| T1 | Primary navigation | 5 canonical surfaces | Always visible |
| T2 | Domain navigation | Domains within WORLD | Visible in WORLD surface |
| T3 | Object navigation | Objects within domain or surface | Visible when in domain/surface |
| T4 | Contextual navigation | Relationships from current object | Visible when object is open |

### 18.2 Primary Navigation (T1)

Five items, always accessible:

```
COMMAND | WORLD | DECISIONS | KNOWLEDGE | SYSTEM
```

Primary navigation is always visible on desktop (sidebar or topbar), always
accessible on mobile (bottom nav or command). Active surface is indicated.

The existing bottom-nav → sidebar responsive behaviour (OBSERVED in UX-00)
is retained. The 14-page nav is replaced by 5-surface nav.

### 18.3 Domain Navigation (T2)

Within WORLD, the domain list provides T2 navigation. Domain items show:
- Domain name
- Active indicator (recent activity)
- Agent status indicator (if agents active)
- Pending decision count (if any)

Domain navigation is only visible within the WORLD surface. On other
surfaces, the user navigates to a domain by returning to WORLD first, or
by voice command.

### 18.4 Object Navigation (T3)

Within a domain or surface, a list of primary objects (capabilities, tasks,
decisions, knowledge items) provides T3 navigation. Object items show enough
context to identify the object without opening it.

### 18.5 Contextual Navigation (T4)

When an object is open, its relationships provide contextual navigation.
A decision shows: "Related knowledge →", "Resulting action →", "See
execution in System →". These T4 links traverse the relationship graph
without requiring the user to know where the destination object lives.

### 18.6 Back Behaviour

Back in APEX navigates the contextual stack, not browser history:

- Object → parent surface/domain
- Domain → WORLD
- T4 cross-surface navigation → previous object (not previous surface)

Back must be predictable and never lose context.

### 18.7 Deep Links

Specific objects are directly addressable. A notification for a pending
decision deep-links to that decision in DECISIONS. A share of a knowledge
item deep-links to that item in KNOWLEDGE. Deep links must:

- Carry the object UUID
- Restore relevant context on arrival
- Respect permission requirements
- Not expose internal file paths or database identifiers in the human-visible URL

### 18.8 Keyboard Navigation (OBSERVED, retained from UX-00)

The keyboard shortcut system (OBSERVED, UX-00 Section 6.3) is retained and
extended for the 5-surface model:

| Key | Action |
|-----|--------|
| `1` | COMMAND |
| `2` | WORLD |
| `3` | DECISIONS |
| `4` | KNOWLEDGE |
| `5` | SYSTEM |
| `/` | Focus chat input |
| `A` | Jump to pending decisions |
| `N` | Notifications |
| `?` | Help overlay |
| `ESC` | Close overlay / collapse current panel |

Domain and object shortcuts: PROPOSED for UX-04.

**Evidence classification:**
- Primary nav (5 surfaces): INHERITED from UX-01
- Keyboard: OBSERVED (UX-00) + PROPOSED extensions
- Back behaviour: PROPOSED
- Deep links: PROPOSED

---

## 19. COMMAND-CENTRIC NAVIGATION

### 19.1 Principle

The user must be able to navigate to any meaningful location using natural
language from COMMAND. The visual navigation (T1–T4) and command-driven
navigation are both valid paths. Neither invalidates the other.

### 19.2 Navigation Intent Recognition

APEX recognises navigation intent as a class of CONTROL intents (INHERITED
from UX-02 intent taxonomy):

```
"Take me to my business."
"Show me Finance."
"Open the decisions waiting for me."
"What decisions need my approval?"
"Show me the knowledge gaps."
"What are my active tasks?"
"Show me what you're working on."
"Go to the system."
"Take me home."  → COMMAND
```

### 19.3 Navigation Resolution

When APEX receives a navigation intent:

1. Identify destination type (surface / domain / object)
2. If surface: navigate to that surface
3. If domain: navigate to WORLD → that domain
4. If object: navigate to the canonical surface of that object type, scrolled
   or filtered to that object
5. If ambiguous: ask one clarifying question ("Did you mean Finance or the
   financial section of Business?")

### 19.4 Navigation and Conversation Continuity

Navigation triggered from conversation does not break the conversation thread.
After navigating to Finance, the conversation is still available. The user
may ask follow-up questions that are answered in COMMAND, even while viewing
Finance in WORLD.

### 19.5 Navigation via Presentation

A contextual presentation in COMMAND may include navigation affordances:
- "View in Finance domain →"
- "Open full decision →"
- "See all evidence →"

These navigate the user to the canonical location of the underlying object
while keeping conversation context intact.

**Evidence classification:** PROPOSED — derived from UX-02 CONTROL intent
group and cross-surface task model.

---

## 20. NOTIFICATION NAVIGATION

### 20.1 Principle

Every notification must route the user to meaningful context — not to a
generic surface. A notification about a pending decision must take the user
directly to that decision. A notification about a knowledge gap must take the
user directly to the relevant knowledge area.

### 20.2 Notification Destination Model

| Notification type | Destination object | Canonical surface | Context preserved |
|------------------|-------------------|------------------|------------------|
| Pending decision | DECISION (specific) | DECISIONS | Evidence pre-loaded |
| Task completion | TASK (specific) | SYSTEM (task detail) | Outcome visible |
| Task failure | TASK (specific) | SYSTEM (task + error) | Failure reason visible |
| Knowledge gap discovered | KNOWLEDGE ITEM (gap) | KNOWLEDGE | Gap detail + research option |
| Knowledge contradiction | KNOWLEDGE ITEM (conflict) | KNOWLEDGE | Both sources visible |
| Agent update | AGENT (specific) | SYSTEM (agent view) | Current task visible |
| System incident | SYSTEM STATE | SYSTEM (incident) | Incident detail visible |
| Urgent action required | DECISION or TASK | DECISIONS or SYSTEM | Full context loaded |
| New capability | CAPABILITY (specific) | WORLD (domain + capability) | Capability detail visible |
| Domain activity | DOMAIN ACTIVITY ITEM | WORLD (domain) | Activity context visible |

### 20.3 Notification → Object → Context → Action Flow

```
NOTIFICATION received
  ↓
User taps / clicks notification
  ↓
Navigate to destination object's canonical surface
  ↓
Object displayed with relevant context pre-loaded
  ↓
Primary action affordance visible immediately
  ↓
User acts OR dismisses OR asks APEX for more context
```

### 20.4 Context Preservation at Destination

When a notification navigates the user to a destination, the destination
surface must:
- Load the specific object (not just the surface)
- Pre-load relevant context (evidence for decisions, error detail for failures)
- Show the primary action clearly (Approve/Reject for decisions)
- Preserve conversation context so the user may ask follow-up questions

### 20.5 Notification Level vs. Navigation Behaviour

| Level | Navigation behaviour |
|-------|---------------------|
| 0 SILENT | No navigation — logged only |
| 1 LOG | No navigation — activity feed entry only |
| 2 IN-APP | Tap to navigate; not intrusive |
| 3 ATTENTION | Interrupts; user may navigate or dismiss |
| 4 DECISION | Opens decision panel; navigation is primary CTA |
| 5 URGENT | Immediate navigation; cannot be dismissed without acknowledgement |

**Evidence classification:** PROPOSED — derived from UX-02 notification
architecture and UX-01 notification hierarchy.

---

## 21. PRESENTATION NAVIGATION

### 21.1 Principle

A contextual presentation in COMMAND is a summary view. The user must be
able to move from summary to detail to source to action without losing context.

### 21.2 Progressive Navigation Path

```
SUMMARY (L0 — in conversation)
    ↓  "Show me more" / "Why?"
CONTEXTUAL PRESENTATION (chart, card, comparison)
    ↓  "See the data" / tap expand
DETAILED INTELLIGENCE (L2 — evidence + reasoning)
    ↓  "Where does this come from?"
SOURCE / CANONICAL OBJECT (KNOWLEDGE or DOMAIN)
    ↓  "What can I do about this?"
ACTION (DECISION or CAPABILITY invocation)
```

### 21.3 Presentation Navigation Affordances

Every contextual presentation must include, at minimum:

- **Expand** — open the next level of progressive disclosure
- **Navigate to source** — go to the canonical object (knowledge item, domain, task)
- **Related action** — initiate the most likely next action from this context

### 21.4 Context Preservation in Presentation Navigation

When the user navigates from a presentation to its source object, the
conversation and the presentation remain accessible. The user may return
to COMMAND and continue the conversation. Navigating away from a
presentation does not end the conversation.

### 21.5 Presentation ↔ Conversation

Presentations do not replace conversation. They augment it. The user may:
- Ask APEX about the presentation without navigating ("What does that spike mean?")
- Ask APEX to update the presentation ("Show me last month instead")
- Navigate from the presentation to the source
- Dismiss the presentation and continue conversation without it

**Evidence classification:** PROPOSED — derived from UX-01 contextual
presentation UX and UX-02 multimodal behaviour model.

---

## 22. THREE EXPERIENCE LAYERS

### 22.1 Layer Mapping to IA

Every object in the IA is accessible at three experience layers (INHERITED
from UX-01: L1-HUMAN, L2-INTELLIGENCE, L3-CONSTITUTIONAL).

| Layer | Label | Access | Purpose |
|-------|-------|--------|---------|
| L1 | HUMAN | Default | Simple, clear, immediately useful |
| L2 | INTELLIGENCE | On request ("Why?" / "Show me more") | Evidence, reasoning, confidence |
| L3 | CONSTITUTIONAL | Explicit navigation to SYSTEM / deep expand | Governance, authority, audit |

### 22.2 Layer Content by Object Type

| Object | L1 (Human) | L2 (Intelligence) | L3 (Constitutional) |
|--------|-----------|-------------------|---------------------|
| DOMAIN | Name, status, recent activity | Performance trends, knowledge gaps, agent utilisation | Domain authority config, governance classification |
| TASK | What APEX did, outcome | Stages, agent choices, model used, cost | Evidence chain, certification status, incident log |
| DECISION | Title, recommendation, options | Evidence, confidence, alternatives considered, risk | Authority record, governance classification, chain hash |
| KNOWLEDGE | Fact in plain language, confidence level | Source count, evidence detail, recency, alternatives | Evidence block hash, memory layer classification, write authority |
| AGENT | Role name, current state, last action | Task history, success rate, model tier | Agent authority scope, cognitive policy settings |
| MEMORY | What APEX remembers, scope | How it was derived, confidence | Memory layer, write authority, sanitisation record |
| SYSTEM STATE | Healthy / Degraded / Issue summary | Metric details, trend, model availability | Constitutional gate status, governance probe result |

### 22.3 Layer Navigation

Layer transitions are triggered by:
- L1 → L2: "Why?", "Show me more", "Explain that", expand button
- L2 → L3: Explicit navigation to SYSTEM, "Show me the governance", "How was this authorised?"
- L3 → L2: Back
- L2 → L1: "Summarise this", dismiss detail

The default always presents L1. L2 and L3 are available without friction
but not imposed.

**Evidence classification:** INHERITED from UX-01; layer-to-object mapping
PROPOSED.

---

## 23. PROGRESSIVE DISCLOSURE

### 23.1 Disclosure Levels

```
LEVEL 0  Simple answer (voice or text)
LEVEL 1  Relevant context (key facts, related state)
LEVEL 2  Evidence (sources, confidence, data)
LEVEL 3  Detailed intelligence (analysis, comparison, reasoning)
LEVEL 4  Constitutional detail (governance, audit, authority chain)
```

### 23.2 Default Display Level

Default is Level 0. APEX answers simply unless the user requests depth or
the task requires it.

Level 1 context surfaces automatically when the answer is part of an active
task or pending decision.

Levels 2–4 are only displayed on explicit request or when the user navigates
to the relevant canonical surface.

### 23.3 Disclosure Triggers

| Phrase / action | Disclosure effect |
|----------------|------------------|
| "Why?" | L0 → L2 |
| "Show me more" | Current level + 1 |
| "Explain that" | L0 → L2 |
| "Where does that come from?" | L1 → L2/source |
| "Show me the evidence" | → L2/L3 |
| "How was this authorised?" | → L3 |
| Navigate to SYSTEM | → L3 (full) |
| Expand presentation | Current level + 1 |
| "Summarise this" | Current level → L0 |

### 23.4 Progressive Disclosure Across Surfaces

Progressive disclosure operates independently on each surface:

- COMMAND: L0 default, L1–L2 via conversation
- WORLD: L1 domain overview, L2 domain intelligence, L3 domain governance
- DECISIONS: L1 decision summary, L2 full evidence, L3 authority chain
- KNOWLEDGE: L1 fact summary, L2 source + evidence, L3 integrity record
- SYSTEM: L3 default (SYSTEM is the constitutional layer)

### 23.5 Disclosure and Complexity Management

Progressive disclosure is the mechanism by which APEX manages the
complexity gap between the 13-layer memory system, 40-domain governance
engine, and 8-agent pipeline on one side — and a simple user asking
"How much have I spent this month?" on the other.

Complexity is available. It is not the default.

**Evidence classification:** INHERITED from UX-01 progressive disclosure
model; level content PROPOSED.

---

## 24. TREE GROWTH MODEL

### 24.1 The Growth Requirement

APEX will grow. New domains, capabilities, agents, knowledge types, action
types, and decision types will appear over time. The Tree must accommodate
growth without requiring:

- A new surface (COMMAND/WORLD/DECISIONS/KNOWLEDGE/SYSTEM are fixed)
- A redesign of the navigation
- Manual restructuring of the IA

### 24.2 How New Capabilities Enter the Tree

New capabilities enter via the canonical placement rules (Section 25). They
appear within an existing domain or are classified as global. They do not
create new surfaces.

### 24.3 How New Domains Enter the Tree

New domains are exceptional. The 10 canonical domains are expected to be
stable. A new domain is warranted only when:
1. A new coherent area of life/work emerges that genuinely cannot be a
   capability within an existing domain
2. It passes the domain qualification test (Section 9.1)
3. The owner explicitly authorises the new domain

New domains appear in WORLD as additional branches. The WORLD surface is
inherently extensible — it is a list/tree, not a fixed layout. Adding a
domain does not break WORLD.

### 24.4 How New Agent Roles Enter the Tree

New agent roles are added to SYSTEM (agent registry). They may be assigned
to existing domains. They do not create new navigation items — they appear
in the relevant domain's agent roster and in SYSTEM's agent council.

### 24.5 How New Decision Types Enter the Tree

New decision types appear in DECISIONS using the existing decision pattern.
Decision types may have domain-specific fields or evidence structures, but
the surface (DECISIONS) and the object type (DECISION) remain constant.

### 24.6 How New Knowledge Types Enter the Tree

New knowledge types (e.g., a new class of research finding) are added to the
KNOWLEDGE surface using the existing knowledge item pattern. Tags and domain
classification accommodate new types without structural change.

### 24.7 Consistency Rule for New Entries

Every new entry in the Tree must:
- Have a declared name (human-readable)
- Have a declared parent (which domain, or global)
- Have a declared canonical surface
- Have a declared object type from the canonical vocabulary (Section 12)
- Have a declared authority requirement
- Not duplicate an existing object with a different name

If a new entry cannot satisfy these requirements, it must not be added until
it can.

### 24.8 Anti-Fragmentation Rule

The primary failure mode for growing information architectures is
fragmentation — each new feature creates a new section, new navigation
item, or new concept. APEX must resist this.

**The rule:** No new APEX capability creates a new surface. No new agent
creates a new navigation section. No new decision type creates a new
"decisions" area. Everything fits the existing Tree.

The Tree grows by adding branches (new domains, new capabilities), not by
adding new trees.

**Evidence classification:** PROPOSED

---

## 25. CANONICAL PLACEMENT RULES

When a new object, capability, domain, or agent is added to APEX, the
following decision tree determines where it belongs:

### 25.1 Placing a New Capability

```
1. What is the primary human task this capability enables?
2. Which canonical domain does that task belong to?
3. Does a domain match? → Place capability in that domain.
4. Does the capability span multiple domains?
   → Place in primary domain; cross-reference from secondary domains.
5. No suitable domain?
   → Evaluate: is this global (available everywhere)?
      YES → Add to global capabilities (accessible via COMMAND/search)
      NO  → Is this enough to warrant a new domain? Apply Section 9.3.
6. Never create a new surface for a capability.
```

### 25.2 Placing a New Agent

```
1. What domain(s) does this agent serve?
2. Is it a domain agent? → Assign to domain(s) in WORLD; canonical in SYSTEM.
3. Is it an executive / cross-domain agent? → Canonical in SYSTEM executive
   council; contextual in all relevant domains.
4. Is it a pipeline agent (ARCHITECT, DEVELOPER, etc.)? → Canonical in SYSTEM
   execution; not visible in WORLD as a domain agent.
5. Never create a new surface for an agent.
```

### 25.3 Placing a New Type of Knowledge

```
1. Is this knowledge domain-specific? → Tag with domain(s); browse from domain.
2. Is this knowledge cross-domain or general? → Tag as global; accessible from
   KNOWLEDGE surface without domain filter.
3. Does this require a new knowledge category (fact/concept/pattern/rule)?
   → Only if existing categories genuinely cannot classify it.
4. Never create a new surface for a knowledge type.
```

### 25.4 Placing a New Decision Type

```
1. All decisions live in DECISIONS surface. No exceptions.
2. Domain-specific decisions are additionally visible from the relevant domain.
3. If the decision requires new evidence structure, extend the evidence model
   — do not create a new decision surface.
4. Never create a new surface for a decision type.
```

### 25.5 Placing a New Action Type

```
1. All actions live in SYSTEM (audit). No exceptions.
2. Actions are contextually visible from the domain/task/decision they relate to.
3. New action types extend the action lifecycle model — do not create new
   surfaces.
```

### 25.6 The Override Question

Before adding any new structural element, ask: "Can a user of APEX already
discover this through conversation with APEX?" If yes, it does not need new
structural IA — it needs better capability documentation within existing
structure.

**Evidence classification:** PROPOSED

---

## 26. DUPLICATION PREVENTION

### 26.1 The Rule

ONE CANONICAL REPRESENTATION of each meaningful object. No exceptions.

A DECISION is not:
- The approval item on COMMAND
- The decision in WORLD
- The decision in KNOWLEDGE
- The decision in SYSTEM audit

A DECISION is ONE DECISION in DECISIONS surface, with contextual views
surfaced elsewhere.

### 26.2 How Duplication Occurs (Anti-Patterns)

| Anti-pattern | Result | Correct approach |
|-------------|--------|-----------------|
| Building a "pending approvals" page separate from DECISIONS | Two decision tracking systems | Surface pending decisions as contextual view within DECISIONS |
| Storing task history in WORLD and SYSTEM separately | Two task records | One TASK in SYSTEM; WORLD shows contextual task list |
| Showing knowledge items in KNOWLEDGE and domain pages separately | Two knowledge stores | One KNOWLEDGE item; domain shows contextual filtered view |
| Creating "Finance decisions" as separate from DECISIONS | Fragmented decision tracking | DECISIONS hosts all decisions; domain filters to Finance decisions |

### 26.3 Duplication Prevention Mechanism

Every object has a canonical surface. All other surfaces show VIEWS of that
object, not copies.

A view is:
- A filtered subset (e.g., Finance decisions from DECISIONS)
- A summarised excerpt (e.g., knowledge summary in domain overview)
- A contextual card (e.g., pending decision card in COMMAND)

A view does not store the object. It references it by UUID. Updating the
canonical object updates all views automatically.

### 26.4 Memory as Canonical Example

Memory demonstrates this correctly in the architecture (OBSERVED):
- gateway.js claims single write point (partially true)
- memory items are stored once
- context assembly fetches for conversation, domain views, etc.

In the IA, this means MEMORY objects have one canonical location (SYSTEM
memory audit) and surface contextually elsewhere (COMMAND when recalled,
KNOWLEDGE when knowledge-class).

---

## 27. OBJECT VIEWS

### 27.1 Definition

| Term | Definition |
|------|-----------|
| CANONICAL OBJECT | The persistent, authoritative instance of an object |
| CONTEXTUAL VIEW | A rendered representation of the canonical object in a non-canonical surface |

### 27.2 View Types

| View type | Description | Example |
|-----------|-------------|---------|
| Summary card | Compact representation for list/feed | Decision card in COMMAND |
| Detail panel | Full object detail in canonical surface | Decision detail in DECISIONS |
| Inline reference | Inline mention with link | "decision about X" in conversation |
| Notification | Alert-format with primary CTA | "Decision pending: approve X?" |
| Relation item | Entry in parent's children list | Decision in domain decision list |
| Search result | Search-optimised excerpt | Decision in search results |

### 27.3 View Consistency Rules

1. The canonical object's title and status must be consistent across all views.
2. A view may show less information than the canonical object, never different
   information.
3. A view must provide a path to the canonical object (link or navigation).
4. A view must not allow editing the canonical object directly (except where
   the canonical surface is the view — e.g., DECISIONS is the canonical
   surface for decisions, so editing in DECISIONS is editing the canonical
   object).

### 27.4 Example: DECISION Views

```
CANONICAL OBJECT (DECISIONS surface):
  Title, status, recommendation, evidence, options, authority record, outcome

CONTEXTUAL VIEW — COMMAND pending decisions:
  Title, primary option (Approve/Reject), "View evidence" link

CONTEXTUAL VIEW — WORLD domain decision list:
  Title, status, created date, "Open" link

CONTEXTUAL VIEW — NOTIFICATION (Level 4 DECISION):
  Title, "APPROVE" / "REJECT" / "View Decision" CTAs

CONTEXTUAL VIEW — KNOWLEDGE (if knowledge item linked to decision):
  "Used in decision: [title]" reference link
```

All views reference the same UUID. Approving from the COMMAND view approves
the canonical decision. No secondary approval mechanism exists.

---

## 28. GLOBAL VS CONTEXTUAL STATE

### 28.1 Global State

Global state is always accessible regardless of which surface or object the
user is viewing:

| Global state item | Location | Always visible |
|------------------|----------|---------------|
| Current conversation | COMMAND input area | Yes (input zone always visible — D-03 fix) |
| Notifications tray | Persistent overlay | Yes (notification indicator) |
| Urgent attention (Level 5) | Full-surface overlay | Yes (interrupts all surfaces) |
| APEX status (healthy/issue) | Topbar status dot | Yes |
| Current surface | Primary nav indicator | Yes |
| User identity | Topbar | Yes |
| APEX orb (voice) | COMMAND (accessible from all surfaces) | Surface-dependent |

### 28.2 Contextual State

Contextual state is surface- or object-dependent:

| Contextual state | Visible when |
|-----------------|-------------|
| Current domain | In WORLD domain view |
| Active task progress | In COMMAND activity / SYSTEM task view |
| Current decision evidence | In DECISIONS decision detail |
| Current knowledge item | In KNOWLEDGE item view |
| Active agent task | In SYSTEM agent view |
| Presentation object | In COMMAND presentation zone |

### 28.3 Coexistence Rules

1. Global state must not be hidden by contextual state (nav, notifications,
   status always accessible).
2. Contextual state may expand to fill available space, but not occlude
   global navigation.
3. The input zone (COMMAND conversation input) is global and always visible
   regardless of surface. (This fixes D-03 from UX-00.)
4. Surface transitions preserve global state (conversation context, urgent
   notifications, status).

**Evidence classification:** PROPOSED; D-03 fix INHERITED from UX-01.

---

## 29. DEEP-LINK REQUIREMENTS

### 29.1 Conceptual URL Structure

Deep links provide stable addresses for canonical objects. The structure is
conceptual (implementation in UX-04+):

```
/                          → COMMAND (default)
/world                     → WORLD surface
/world/{domain}            → Domain view (e.g., /world/finance)
/world/{domain}/{capability} → Capability view
/decisions                 → DECISIONS surface (pending)
/decisions/{id}            → Specific decision
/knowledge                 → KNOWLEDGE surface
/knowledge/{id}            → Specific knowledge item
/system                    → SYSTEM surface
/system/execution/{id}     → Specific task execution
/system/agents             → Agent council view
/system/audit              → Audit trail view
/system/memory             → Memory audit view
```

### 29.2 Stable Identity Requirements

Objects that require stable deep-link identities (UUID-based):

| Object | Requires stable ID? | Reason |
|--------|--------------------|---------| 
| DOMAIN | Yes (name-based slug) | Referenced in notifications, links |
| CAPABILITY | Yes | Referenced in discovery, links |
| TASK | Yes (UUID) | Referenced in notifications, audit |
| DECISION | Yes (UUID) | Referenced in notifications, authority chain |
| ACTION | Yes (UUID) | Referenced in audit trail |
| KNOWLEDGE | Yes (UUID) | Referenced in decisions, presentations |
| SOURCE | Yes (UUID) | Referenced in knowledge provenance |
| EVIDENCE | Yes (UUID + hash) | Referenced in governance, immutable |
| AGENT | Yes (role slug) | Referenced in task records, domain roster |
| MEMORY | Yes (UUID) | Referenced in memory audit |
| EVENT | Yes (UUID) | Referenced in activity, notifications |

### 29.3 Deep Link Context Preservation

A deep link to a specific decision must:
- Load the decision detail
- Load the relevant evidence
- Show the primary authority action
- Not require the user to navigate back to DECISIONS to find the object

A deep link must not expire. Decisions, tasks, and knowledge items have
persistent stable addresses for their lifetime.

### 29.4 Deep Link Security

Deep links must:
- Respect authentication (apex_token cookie, OBSERVED in UX-00)
- Not expose internal identifiers in human-visible text beyond UUIDs
- Not expose file paths, database table names, or module names
- Not bypass the permission model

**Evidence classification:** PROPOSED; auth requirement OBSERVED (UX-00).

---

## 30. MOBILE INFORMATION ARCHITECTURE

### 30.1 Mobile IA Principles

Mobile does not simply shrink the desktop Tree. The following adaptations apply:

1. **COMMAND is the primary mobile surface.** Voice and text interaction is
   first-class. World exploration is secondary.
2. **Bottom navigation provides T1 navigation** (5 surfaces). OBSERVED pattern
   (UX-00) retained and extended to 5 surfaces.
3. **Domain navigation is layered**, not a sidebar. Mobile enters WORLD →
   domain list → domain (full screen) → object (full screen).
4. **Presentations are mobile-optimised.** Charts and cards stack vertically.
   Complex multi-column presentations are reformatted for single-column.
5. **Contextual navigation uses back** (T4 relationships via back stack, not
   side panels).

### 30.2 Mobile Surface Priority

| Surface | Mobile priority | Mobile entry |
|---------|----------------|-------------|
| COMMAND | PRIMARY | Default landing; always accessible |
| WORLD | SECONDARY | Bottom nav tap; domain discovery |
| DECISIONS | HIGH | Bottom nav tap; urgent decisions surfaced via notification |
| KNOWLEDGE | MEDIUM | Bottom nav tap; search-first on mobile |
| SYSTEM | LOW | Bottom nav tap; owner-level detail |

### 30.3 Mobile Domain Entry

Mobile domain entry is swipe/tap-based, not sidebar-based:

```
WORLD (domain list, scroll-based)
  ↓ tap domain
DOMAIN (full-screen domain view)
  ↓ tap capability / task / decision
OBJECT (full-screen object detail)
  ↓ back
DOMAIN
  ↓ back
WORLD
```

### 30.4 Mobile Navigation Adaptation

| Desktop | Mobile adaptation |
|---------|-----------------|
| Sidebar domain nav | Bottom sheet or scrollable list in WORLD |
| Multi-column domain view | Single-column, stacked |
| Side-by-side presentation + conversation | Stacked (presentation above, input below) |
| Contextual side panels | Full-screen sheets |
| Hover states | Tap states |
| Keyboard shortcuts | Bottom nav + voice primary |

### 30.5 Mobile Search

Mobile search is command-first: the user asks APEX via voice or text.
Visual search is available as a secondary entry point. Search results
are presented as a scrollable list; tapping navigates to the canonical
surface of the result.

### 30.6 Mobile Notifications

Mobile notifications follow the same level model. Level 3–5 notifications
interrupt the current view with a full-width card or modal. Level 1–2
appear in the notification tray (accessible via nav indicator).

Push notifications (Level 3–5, OPEN question OAQ-06 from UX-01) deep-link
into the relevant object when the user taps from the OS notification.

**Evidence classification:** PROPOSED; bottom nav pattern OBSERVED (UX-00).

---

## 31. ACCESSIBILITY INFORMATION ARCHITECTURE

### 31.1 Semantic Hierarchy

The information architecture must remain semantically coherent regardless of
visual presentation. Accessibility requires:

| IA level | Semantic element requirement |
|----------|------------------------------|
| Primary navigation (T1) | `<nav aria-label="Main navigation">` with 5 items |
| Domain navigation (T2) | `<nav aria-label="Domain navigation">` |
| Main content | `<main>` containing current surface content |
| Object lists | `<ul>` / `<ol>` with semantic list items |
| Object detail | `<article>` or `<section>` with heading |
| Progressive disclosure | `<details>` / ARIA expandable pattern |
| Status indicators | `aria-live` regions for dynamic updates |
| Orb voice state | `aria-label` updated with voice state |

### 31.2 Keyboard Navigation Requirements

All IA levels must be keyboard-navigable:

| Function | Keyboard requirement |
|---------|---------------------|
| T1 surface navigation | Tab to nav, arrow keys to items, Enter to navigate |
| Domain navigation | Tab to domain list, arrow keys, Enter to enter domain |
| Object lists | Tab to list, arrow keys to items, Enter to open |
| Progressive disclosure | Tab to expand control, Enter/Space to toggle |
| Decision actions | Tab to Approve/Reject/Defer, Enter to act |
| Search | Tab to search field, Enter to submit |
| Back navigation | Browser Back or explicit back control |
| Close overlay | Escape |
| Voice | Keyboard trigger for orb / voice input |

OBSERVED keyboard shortcuts (UX-00) are retained and extended.

### 31.3 Screen Reader Requirements

Screen readers must receive meaningful context at every level:

- Surface name announced on navigation
- Domain name announced on entry
- Object type + title announced on focus
- Status changes announced via `aria-live="polite"` (or `assertive` for
  urgent notifications)
- Contextual presentations announced with brief description
- Progressive disclosure state announced (expanded/collapsed)
- Voice state announced when it changes

The existing `skip-to-main` link (OBSERVED in UX-00) is retained.

### 31.4 Reduced-Motion Adaptation

APEX has comprehensive `prefers-reduced-motion` support (OBSERVED in UX-00).
In the IA, objects with animated state (orb, waveform, activity feed, live
status dots) must have non-animated alternatives:
- Orb → static indicator with text label
- Waveform → text-based voice state label
- Animated transitions → instant state change

### 31.5 Voice-Unavailable Path

When voice input is unavailable (or user preference), the full IA must be
reachable via text input and keyboard navigation. No capability may be
voice-only. Every voice-invocable action has a text equivalent.

### 31.6 Visual-Unavailable Path

When visual output is unavailable (screen reader, audio-only mode), the
full IA must be semantically navigable. Every object must have a meaningful
textual representation. Charts and presentations must have text summaries.

**Evidence classification:** PROPOSED; observed accessibility patterns
(prefers-reduced-motion, skip-to-main, touch targets) OBSERVED (UX-00).

---

## 32. REAL-LIFE IA SCENARIOS

### Scenario 1: User asks a simple question

**Entry:** COMMAND (default surface)
**User action:** "How much have I spent this week?"
**Information location:** Finance domain → transactions → weekly aggregate
**Object:** KNOWLEDGE (Finance-scoped knowledge summary) + TASK (retrieval)
**Relationship:** Finance domain → Finance Agent → transaction data
**APEX action:** Retrieves data, responds in conversation (L0)
**User action:** (none needed)
**Next location:** COMMAND (stays)
**Outcome:** Answer delivered in conversation. No navigation required.
No Finance page visited. No manual domain entry.

---

### Scenario 2: User asks a cross-domain business question

**Entry:** COMMAND
**User action:** "How is my business performing financially this quarter?"
**Information location:** Business domain (context) + Finance domain (data) + Knowledge (analysis)
**Object:** TASK (cross-domain analysis), KNOWLEDGE (business + finance)
**Relationship:** Business domain + Finance domain → cross-domain analysis → KNOWLEDGE
**APEX action:** Identifies cross-domain task, assembles data from both domains,
  presents analysis in COMMAND with cross-domain attribution
**User action:** "Show me the breakdown" → L2 presentation surfaces (chart)
**Next location:** COMMAND with contextual presentation
**Outcome:** Unified cross-domain answer. User never visits Finance or Business
  separately. Both domains are contextually assembled.

---

### Scenario 3: User receives an approval notification

**Entry:** Notification (Level 4 DECISION) arrives while user is on WORLD
**Information location:** DECISIONS surface → specific decision
**Object:** DECISION (with evidence pre-loaded)
**Relationship:** DECISION → EVIDENCE → ACTION (what will execute on approval)
**User action:** Taps notification
**Next location:** DECISIONS → decision detail (full context pre-loaded)
**APEX action:** Evidence pre-loaded, primary CTAs visible (Approve/Reject/Defer)
**User action:** Reviews evidence, taps "Approve"
**Outcome:** Decision approved. ACTION authorised. Governance record written.
  User receives confirmation. Return to WORLD optional (back button).

---

### Scenario 4: User explores a knowledge gap

**Entry:** COMMAND — APEX mentions in conversation: "I don't have enough
  information about X to be fully confident."
**Information location:** KNOWLEDGE surface → knowledge gap item
**Object:** KNOWLEDGE (gap state), SOURCE (insufficient), EVIDENCE (missing)
**Relationship:** KNOWLEDGE (gap) → CAPABILITY (research) → TASK (research task)
**User action:** "Show me the gap" or taps knowledge gap link in conversation
**Next location:** KNOWLEDGE → specific knowledge gap item
**APEX action:** Gap displayed with: what is known, what is missing,
  confidence level, option to initiate research
**User action:** "Research this" → triggers Research capability
**Outcome:** Research TASK created. User returns to COMMAND. APEX updates
  knowledge when research completes (notification).

---

### Scenario 5: User asks what an agent is doing

**Entry:** COMMAND
**User action:** "What is the Finance Agent doing?"
**Information location:** SYSTEM → agent view → Finance Agent → current task
**Object:** AGENT (Finance Agent), TASK (current task if any)
**Relationship:** AGENT → TASK → DOMAIN (Finance)
**APEX action:** Retrieves agent state, responds in COMMAND: "Finance Agent is
  currently processing last month's transaction reconciliation. It started
  3 minutes ago."
**User action:** "Show me the details" → navigates to SYSTEM agent view
**Next location:** SYSTEM → Finance Agent view → current task detail
**Outcome:** User sees task stages, progress, estimated completion.

---

### Scenario 6: User asks why APEX made a recommendation

**Entry:** COMMAND — APEX made a recommendation ("I recommend increasing
  your emergency fund by £500 this month")
**User action:** "Why?"
**Information location:** Triggers L2 disclosure → DECISIONS (recommendation)
  + KNOWLEDGE (evidence) + EVIDENCE (supporting data)
**Object:** DECISION (recommendation), KNOWLEDGE (financial facts), EVIDENCE (trend data)
**Relationship:** DECISION → EVIDENCE → KNOWLEDGE → Finance domain data
**APEX action:** Presents L2 disclosure: "Based on your spending patterns
  over the last 3 months and your stated savings goal, a £500 increase now
  puts you on track by the target date. Confidence: high."
**User action:** "Show me the data" → chart presentation
**Next location:** COMMAND with contextual presentation (DECISION + chart)
**Outcome:** User understands the reasoning without visiting DECISIONS or KNOWLEDGE
  directly. Can navigate there for full L3 detail.

---

### Scenario 7: User discovers a new capability

**Entry:** WORLD → Finance domain
**User action:** Browsing Finance domain capability list
**Information location:** Finance domain → capabilities → "Financial Forecast"
  (not previously used)
**Object:** CAPABILITY (Financial Forecast)
**Relationship:** CAPABILITY → Finance Agent → task template
**User action:** Taps "Financial Forecast" capability item
**APEX action:** Shows capability detail: what it does, what inputs it needs,
  example output, how to invoke it
**User action:** "Run this" → conversation invocation in COMMAND
**Next location:** COMMAND with forecast task running
**Outcome:** User discovers and uses a capability they didn't know existed.
  No knowledge of lib/finance-forecast.js required.

---

### Scenario 8: User enters a domain

**Entry:** WORLD surface
**User action:** Taps "Business" domain card
**Information location:** Business domain → overview, capabilities, active tasks,
  recent activity, active agents, knowledge summary
**Object:** DOMAIN (Business), ACTIVITY (recent), TASK (active if any)
**Relationship:** DOMAIN → CAPABILITY + AGENT + TASK + KNOWLEDGE + DECISION + ACTIVITY
**APEX action:** Renders domain view with current state:
  - Overview: "Business domain active. 2 active tasks. Business Agent running."
  - Capabilities: visible list
  - Recent activity: last 5 items
  - Pending decisions: 1 pending (if any)
**Next location:** Business domain view (within WORLD)
**Outcome:** User has a complete picture of the Business domain without any
  prior knowledge of which capabilities or agents exist.

---

### Scenario 9: User moves from a decision to evidence

**Entry:** DECISIONS → specific decision detail (L1)
**Object seen:** DECISION (title, recommendation, approve/reject options)
**User action:** "Show me the evidence" / taps evidence expand
**Information location:** DECISIONS → same decision → L2 evidence panel
**Object:** EVIDENCE (multiple blocks), SOURCE (references)
**Relationship:** DECISION → EVIDENCE → SOURCE
**APEX action:** Expands to L2: evidence blocks displayed with source
  attribution, confidence scores, recency indicators
**User action:** Taps a source reference
**Next location:** KNOWLEDGE → source detail (what APEX knows from this source)
**Outcome:** User traces the evidence chain from decision to source, verifying
  the basis for the recommendation.

---

### Scenario 10: User moves from evidence to action

**Entry:** DECISIONS → decision detail → L2 evidence (from Scenario 9)
**User action:** Satisfied with evidence. Taps "Approve".
**Information location:** DECISIONS (authority action)
**Object:** DECISION (now approved), ACTION (enabled by approval)
**Relationship:** DECISION (approved) → ACTION (PENDING_APPROVAL → AUTHORISED)
**APEX action:** Records approval. Updates decision status. Authorises action.
  Writes governance record (authority chain, evidence hash).
  "Approved. [Action] will execute now."
**Next location:** COMMAND (returns with confirmation + activity item)
  OR SYSTEM (if user wants to watch execution)
**Outcome:** Consequential action authorised and executing. Full audit trail
  written. User informed. No ambiguity about what was authorised.

---

### Scenario 11: User opens the System layer

**Entry:** SYSTEM surface
**User action:** Navigates to SYSTEM
**Information location:** SYSTEM → overview: Constitutional state, pipeline
  health, active tasks, recent executions
**Object:** SYSTEM STATE, AGENT (council), TASK (recent), EVENT (recent)
**User action:** "Show me the pipeline" → SYSTEM execution view
**Next location:** SYSTEM → execution view with recent agent runs
**User action:** Taps a specific run
**Next location:** SYSTEM → task detail → stages → evidence → certification
**Outcome:** Owner verifies APEX pipeline is operating within constitutional
  bounds. Full execution detail available. Constitutional article status
  visible. Governance probe result visible. All at L3 (constitutional layer)
  by default in SYSTEM.

---

### Scenario 12: User performs the same task on mobile

**Task:** Review and approve a pending decision (same as Scenario 3)
**Entry:** Mobile device. Level 4 DECISION notification received.
**Information location:** DECISIONS surface → specific decision
**Object:** DECISION (mobile-optimised view)
**APEX action:** Notification appears as full-width card. Primary CTAs visible.
**User action:** Taps notification card "View Decision"
**Next location:** DECISIONS → decision detail (full-screen on mobile)
  Evidence stacked vertically below recommendation.
**User action:** Scrolls to review evidence. Taps "Approve".
**APEX action:** Same approval flow as desktop. Governance record written.
  Confirmation shown.
**Next location:** Returns to previous surface (COMMAND or wherever user was)
**Outcome:** Decision approved on mobile with same authority and audit
  integrity as desktop. No information lost. Evidence accessible. Full
  authority chain recorded.

---

## 33. CANONICAL IA MATRIX

| Object | Purpose | Canonical Location | Secondary Contexts | Parent | Children | Key Relationships | Lifecycle | Visibility | Discovery | Actions | Authority | Mobile |
|--------|---------|-------------------|-------------------|--------|----------|------------------|-----------|-----------|-----------|---------|-----------|--------|
| DOMAIN | Area of life/work | WORLD | COMMAND (ref), SYSTEM (health) | WORLD | Capabilities, Agents, Tasks, Knowledge, Decisions, Activity | Cross-domain links, shared agents | INITIALISED→ACTIVE→DORMANT→ARCHIVED | Always in WORLD | WORLD browse, voice, search | Enter, explore, configure, archive | Founder to create/archive | Full-screen in WORLD |
| CAPABILITY | What APEX can do | WORLD (domain) | COMMAND (contextual) | DOMAIN | Tasks, Presentations | Agent (executor), Domain | AVAILABLE→EXECUTING→COMPLETE | Domain capability list | Browse domain, conversation, search, contextual suggestion | Invoke, learn about, view history | None for invocation | Domain list, tap to view |
| AGENT | Execution entity | SYSTEM | WORLD/domain roster, COMMAND | SYSTEM | Tasks, Activity | Domains served, Tasks, Executive Council | IDLE→ACTIVE→EXECUTING→REPORTING | SYSTEM canonical; contextual in domain | SYSTEM agent list, domain roster | View scope, view task, view history | SYSTEM-managed | SYSTEM list, compact |
| TASK | Unit of work | SYSTEM (audit) | COMMAND (active), WORLD/domain, DECISIONS | DOMAIN or WORLD | Stages, Actions, Evidence, Memory | Decision, Agent, Knowledge | DISCOVERED→QUEUED→APPROVED→RUNNING→[COMPLETE/FAILED/CANCELLED/DEFERRED] | Active in COMMAND; history in SYSTEM | Activity feed, SYSTEM task list, search | Approve, cancel, view, view stages | Approve/reject requires founder | SYSTEM task detail, full-screen |
| DECISION | Human authority choice | DECISIONS | COMMAND (pending), WORLD/domain | DOMAIN or cross-domain | Evidence, Actions, Knowledge | Task, Knowledge, Action | PROPOSED→PENDING→[APPROVED/REJECTED/DEFERRED/EXPIRED] | Pending prominent; history in DECISIONS | DECISIONS surface, notification, A shortcut, search | Approve, Reject, Modify, Defer, Ask Why | Founder always | Full-screen in DECISIONS |
| ACTION | Consequential operation | SYSTEM (audit) | COMMAND (active), DECISIONS | TASK or DECISION | Audit records, Evidence | Decision (authority), Agent, Task | PENDING_APPROVAL→AUTHORISED→EXECUTING→[COMPLETE/FAILED/CANCELLED] | Active in COMMAND; history in SYSTEM | SYSTEM audit, activity feed | View authority chain, view execution | Founder authority required | SYSTEM detail |
| KNOWLEDGE | What APEX knows | KNOWLEDGE | COMMAND (L2), DECISIONS (evidence), WORLD/domain | KNOWLEDGE surface (or DOMAIN) | Sources, Evidence, Related Knowledge | Source, Evidence, Decision, Task | DISCOVERED→ACTIVE→STALE→CORRECTED→SUPERSEDED | KNOWLEDGE surface; contextual in presentations | KNOWLEDGE browse, search, conversation | Correct, dispute, research, view evidence | Founder for corrections | KNOWLEDGE list, search-first |
| SOURCE | Knowledge origin | KNOWLEDGE | DECISIONS (evidence) | KNOWLEDGE items | Evidence (from source) | Knowledge items that cite it | ACTIVE→STALE→UNAVAILABLE | KNOWLEDGE source list | Via knowledge item | View, flag as stale | APEX-managed | Compact reference |
| EVIDENCE | Supporting data | DECISIONS + KNOWLEDGE | COMMAND (L2) | DECISION or KNOWLEDGE | — | Source, Task, Governance chain | CREATED→CITED→SUPERSEDED (immutable) | DECISIONS evidence panel, KNOWLEDGE evidence | Via decision or knowledge item | View, verify hash | Immutable once created | Stacked in decision detail |
| MEMORY | Retained context | SYSTEM (memory audit) | COMMAND (recalled), KNOWLEDGE | COMMAND or DOMAIN | — | Conversation, Task, Knowledge | STORED→ACTIVE→RECALLED→[CORRECTED/EXPIRED/FORGOTTEN] | SYSTEM memory audit; contextual in COMMAND | SYSTEM memory list, conversation mention | Correct, forget, view | Founder controls | SYSTEM list |
| EVENT | System occurrence | SYSTEM (event log) | COMMAND (activity feed) | SYSTEM | Notifications, Activity | Notification (triggered by), Activity | CREATED→LOGGED (immutable) | SYSTEM event log; relevant in COMMAND | SYSTEM event list, activity feed | View detail | APEX-generated | Compact in activity feed |
| NOTIFICATION | User-facing signal | COMMAND (delivery) | Any surface (L3–L5 overlay) | EVENT | — | Destination object | CREATED→DELIVERED→[ACKNOWLEDGED/ACTED_ON/DISMISSED/EXPIRED] | Notification tray; overlay for L3–L5 | Tray indicator, overlay | Acknowledge, act on, dismiss | Level-dependent | Full-width card (L3–L5) |
| PRESENTATION | Contextual visual | COMMAND (temporary) | None | TASK or KNOWLEDGE or DECISION | — | Source object (canonical) | GENERATED→DISPLAYED→[DISMISSED/EXPIRED/NAVIGATED_FROM] | COMMAND presentation zone | Contextual (APEX-generated) | Expand, navigate to source, dismiss | None | Stacked vertically |
| ACTIVITY | Action log | SYSTEM (full) | COMMAND (recent), WORLD/domain | SYSTEM + COMMAND + DOMAIN | Individual activity items | Event, Task, Notification | Persistent; retention per policy | Always-on in COMMAND; filtered elsewhere | COMMAND feed, SYSTEM log, domain log | Expand item, navigate to source | None | Feed in COMMAND |
| SYSTEM STATE | Runtime condition | SYSTEM | COMMAND (stat chips, status dot) | SYSTEM | Individual metrics | All system components | Continuous / real-time | SYSTEM full; COMMAND summary | SYSTEM surface | Drill into metric, view history, health check | SYSTEM-managed | Compact stat chips |

---

## 34. SURFACE MATRIX

| Attribute | COMMAND | WORLD | DECISIONS | KNOWLEDGE | SYSTEM |
|-----------|---------|-------|-----------|-----------|--------|
| **Purpose** | Primary interaction; contextual intelligence | Tree of Life; exploration; domain organisation | Human authority; decision lifecycle | APEX knowledge state; provenance | Owner transparency; governance; runtime |
| **Primary objects** | Conversation, Presentation, Activity, Orb, Stat Chips | Domains, World Activity, Active Agents | Pending Decisions, Recommendations, Decision History | Knowledge Items, Gaps, Sources, Evidence | Constitutional State, Pipeline, Agent Council, Audit, Health |
| **Secondary objects** | Pending Decisions, Active Tasks, Knowledge Refs | Capabilities (in domain), Decisions, Knowledge, Tasks | Evidence, Related Knowledge, Actions, Domain Context | Knowledge Graph, Memory, Research Trails | Incidents, Cron Logs, Governance Probes, Cost Summary |
| **Entry methods** | Default; voice; explicit nav; notification; command | Explicit nav; "Take me to World"; notification to domain | Explicit nav; `A` shortcut; notification Level 4; voice | Explicit nav; decision evidence link; presentation source link; voice | Explicit nav; activity feed link; incident notification; voice |
| **Exit methods** | Nav to other surface; contextual nav from presentation | Nav to other surface; follow decision → DECISIONS | Nav to other surface; follow evidence → KNOWLEDGE | Nav to other surface; follow decision | Nav to other surface |
| **Contextual content** | Relevant knowledge, pending decisions, agent status, active tasks | Domain knowledge summary, active tasks, pending decisions | Evidence, related knowledge, domain context | Related decisions, domain context, task usage | Task detail (from activity feed link) |
| **Persistent content** | Conversation thread, Activity feed, Orb, Input zone | Domain structure (Tree), Domain state | Decision history | Knowledge items, Knowledge graph | Constitutional state, Audit trail, Agent history |
| **Cross-surface links** | → WORLD (domain), DECISIONS (pending), KNOWLEDGE (evidence), SYSTEM (task detail) | → DECISIONS (domain decision), KNOWLEDGE (domain knowledge), SYSTEM (domain health) | → KNOWLEDGE (evidence source), SYSTEM (execution audit), WORLD (domain context) | → DECISIONS (knowledge cited in), COMMAND (contextual presentation), WORLD (domain) | → COMMAND (status), WORLD (domain health), DECISIONS (execution→decision), KNOWLEDGE (knowledge system health) |
| **Human layer** | Conversation, voice, activity summary, current metrics | Domain overview, recent activity, agent roster | Decision title, recommendation, options | Fact in plain language, confidence | Is APEX healthy? What has it done? |
| **Intelligence layer** | Evidence in presentations, confidence, explanation | Domain performance, knowledge gaps, opportunity signals | Evidence detail, alternatives, risk assessment | Source count, evidence quality, alternatives | Agent performance, cost trends, pipeline success |
| **Constitutional layer** | Authority requests, governance indicators | Domain authority config, governance per domain | Authority record, evidence chain, escalation history | Evidence chain integrity, write authority | Full: Constitution articles, governance probe, gate audit |

---

## 35. TREE-OF-LIFE SPECIFICATION

### 35.1 Formal Definition

The Tree of Life is the canonical hierarchical organisation of all human-facing
information in APEX. It is a five-level structure that accommodates current
capabilities, extensible growth, and progressive discovery.

### 35.2 Level Specifications

---

**LEVEL 0 — ROOT**

| Attribute | Value |
|-----------|-------|
| Meaning | The unified APEX system |
| Ownership | The system itself |
| Visibility | Conceptual — not a navigable node |
| Navigation | Not navigable; manifests as brand identity and system presence |
| Lifecycle | Permanent |
| Extensibility | N/A |

---

**LEVEL 1 — WORLD**

| Attribute | Value |
|-----------|-------|
| Meaning | The totality of what exists in APEX |
| Ownership | APEX |
| Visibility | WORLD surface; always navigable |
| Navigation | Primary nav → WORLD |
| Children | Domains |
| Lifecycle | Permanent; content evolves as domains change |
| Extensibility | New domains added as children; WORLD itself does not change |

---

**LEVEL 2 — DOMAIN**

| Attribute | Value |
|-----------|-------|
| Meaning | A coherent area of life or work |
| Ownership | APEX (canonical domains) or Founder (new domains) |
| Visibility | WORLD domain list; always visible if ACTIVE; recedes if DORMANT |
| Navigation | Tap/click domain card in WORLD; voice command; deep link |
| Children | Capabilities, Agents, Knowledge, Decisions, Tasks, Activity |
| Lifecycle | INITIALISED → ACTIVE → DORMANT → ARCHIVED |
| Extensibility | New domains added by passing Section 9.3 qualification; no limit on count |
| Canonical domains | Finance, Health, Business, Communication, Operations, Learning, Research, Occult, Civilisation, Reality |

---

**LEVEL 3 — CAPABILITY / AGENT / KNOWLEDGE / DECISION / TASK / ACTIVITY**

Level 3 is not a single node type. Within each domain, multiple object
categories exist at this level:

| Sub-level | Object types | Count | Navigation |
|-----------|-------------|-------|-----------|
| 3a | CAPABILITY | Multiple per domain | Capability list in domain |
| 3b | AGENT | 1–N per domain | Agent roster in domain |
| 3c | KNOWLEDGE | Multiple (domain-scoped) | Knowledge summary in domain |
| 3d | DECISION | Multiple (pending/historical) | Decision list in domain |
| 3e | TASK | Multiple (active/historical) | Task list in domain |
| 3f | ACTIVITY | Stream | Activity feed in domain |

| Attribute | Value |
|-----------|-------|
| Meaning | What exists and happens within a domain |
| Ownership | Domain (parent) |
| Visibility | Domain view (within WORLD); contextual in COMMAND; canonical in respective surfaces |
| Navigation | Within domain; or direct to canonical surface |
| Lifecycle | Object-type dependent (see Section 12) |
| Extensibility | New capabilities, agents, knowledge items added within existing structure |

---

**LEVEL 4 — OBJECT INSTANCE**

| Attribute | Value |
|-----------|-------|
| Meaning | A specific instance of a Level 3 object type |
| Ownership | Varies by object type |
| Visibility | Detail view within canonical surface; contextual views elsewhere |
| Navigation | Tap/click from Level 3 list; deep link; notification; search result |
| Lifecycle | Object-type dependent |
| Extensibility | No structural change — new instances are new rows, not new architecture |

### 35.3 Tree Navigation Paths

```
COMMAND           → voice/text: direct to object (no Tree traversal required)
COMMAND           → contextual presentation → navigate to source (Level 4)
WORLD             → domain list → domain (Level 2)
WORLD/domain      → capability list → capability detail (Level 3a → 4)
WORLD/domain      → agent roster → agent detail → SYSTEM (Level 3b → SYSTEM)
WORLD/domain      → knowledge summary → KNOWLEDGE surface (Level 3c → canonical surface)
WORLD/domain      → decision list → DECISIONS surface (Level 3d → canonical surface)
DECISIONS         → decision detail → evidence → KNOWLEDGE (Level 4 → relationship)
KNOWLEDGE         → knowledge item → related items (Level 4 → graph traversal)
SYSTEM            → agent council → agent → current task (Level 3b → 4)
SYSTEM            → execution → task → stages (Level 4 → sub-detail)
NOTIFICATION      → deep link → Level 4 object in canonical surface
SEARCH            → result → Level 4 object in canonical surface
```

### 35.4 Relationship Rules in the Tree

1. Traversal down the Tree (World → Domain → Object) is always available.
2. Traversal across the Tree (Object in Domain A → Object in Domain B) is
   available via relationships (T4 contextual navigation).
3. Traversal up the Tree (Object → Domain → World) is always available via
   back navigation.
4. Cross-surface traversal (Object in WORLD → canonical surface in DECISIONS)
   is always available via relationship links.
5. The Tree never requires the user to traverse every level to reach an object.
   Deep links and conversation bypass intermediate levels.

---

## 36. IA INVARIANTS

Binding rules. No implementation may violate these.

| # | Invariant | Classification |
|---|-----------|---------------|
| INV-IA-01 | ONE APEX. All surfaces are views into the same system. There is no separate Finance system or System system. | INHERITED (UX-01 P-01) |
| INV-IA-02 | ONE canonical representation of each meaningful object. A decision exists once. A knowledge item exists once. A task exists once. | PROPOSED |
| INV-IA-03 | Surfaces provide contextual views of canonical objects. They do not duplicate objects. | PROPOSED |
| INV-IA-04 | Human tasks determine information placement. Backend architecture does not dictate navigation structure. | PROPOSED |
| INV-IA-05 | New APEX capabilities do not create new surfaces. They enter the existing Tree as capabilities within existing or new domains. | PROPOSED |
| INV-IA-06 | Domains are branches of World. There are no domains that live outside World. | PROPOSED |
| INV-IA-07 | Cross-domain tasks are first-class. APEX assembles cross-domain information; the user does not visit multiple domains manually. | PROPOSED |
| INV-IA-08 | Contextual presentations are views, not records. Dismissing a presentation does not lose the underlying data. | PROPOSED |
| INV-IA-09 | Progressive disclosure controls complexity. L1 is the default. L2–L3 require explicit request. | INHERITED (UX-01) |
| INV-IA-10 | New capabilities must fit the existing Tree. They declare a parent domain and a canonical surface from the existing vocabulary. | PROPOSED |
| INV-IA-11 | Navigation must never require knowledge of implementation details. A user must never need to know a file path, table name, or module name to navigate APEX. | PROPOSED |
| INV-IA-12 | COMMAND remains a first-class entry point to all information. Any object can be reached via conversation from COMMAND. | INHERITED (UX-01 P-02) |
| INV-IA-13 | Voice can navigate the full IA. Every navigation destination is reachable by voice command. | INHERITED (UX-02) |
| INV-IA-14 | Notifications deep-link to meaningful context. A notification must not route to a generic surface. | PROPOSED |
| INV-IA-15 | Knowledge, decisions, and actions remain connected via explicit relationships. No object is an island. | PROPOSED |
| INV-IA-16 | Human authority is visible in context. Authority requirements surface at the moment they are relevant, not buried in SYSTEM. | INHERITED (UX-01, UX-02) |
| INV-IA-17 | System transparency is available without dominating normal UX. SYSTEM is navigable; it does not interrupt COMMAND by default. | INHERITED (UX-01) |
| INV-IA-18 | Mobile and accessibility are first-class. The IA must be fully traversable on mobile and via keyboard/screen reader. | INHERITED (UX-01, UX-02) |
| INV-IA-19 | No arbitrary page proliferation. The 14-page legacy model is replaced by 5 surfaces + extensible Tree. No new surface may be created for a single capability. | PROPOSED |
| INV-IA-20 | The Tree must be extensible without structural redesign. New domains, capabilities, agents, and knowledge types enter the existing Tree; they do not require new navigation systems. | PROPOSED |
| INV-IA-21 | The governance audit trail is immutable. Evidence blocks, certifications, and authority records cannot be modified or deleted. | OBSERVED (APEX_GOVERNANCE_MODEL.md) |
| INV-IA-22 | Every persistent object has a stable identity (UUID or name-based slug) that survives across sessions and enables deep linking. | PROPOSED |
| INV-IA-23 | The input zone is globally accessible. The conversation input is visible and focusable from any surface. (Fixes D-03.) | INHERITED (UX-01 D-03 fix) |
| INV-IA-24 | Domain archiving requires explicit human authority. APEX may suggest; it may not archive autonomously. | PROPOSED (derives from UX-02 authority model) |
| INV-IA-25 | Objects destroyed or forgotten require explicit human authority and leave an audit record. Nothing disappears silently. | INHERITED (UX-02 INV-05, constitutional safety invariants) |

---

## 37. OPEN QUESTIONS

### 37.1 UX Questions

| # | Question | Why it matters | Evidence | Impact | Required phase |
|---|---------|----------------|----------|--------|---------------|
| OQ-IA-01 | Should the 10 canonical domains be fixed, or can the user rename/reorganise them? | Determines whether WORLD is configurable or fixed. A user may want "Studies" instead of "Learning". | UX-02 user model: user wants to understand APEX, not maintain it. | Affects domain identity, deep links, notification routing. | UX-04 or UX-05 |
| OQ-IA-02 | How should APEX handle "Reality" domain — it has significant overlap with KNOWLEDGE surface (epistemic architecture). Is Reality a domain or a section of KNOWLEDGE? | Reality page (UX-00) covers epistemic infrastructure and observer models — some of this is domain-level (civilisation, reality convergence) and some is KNOWLEDGE-surface-level. | UX-00 page-reality (12 loader functions, epistemic scope). KNOWLEDGE surface definition (epistemic state). | If Reality is KNOWLEDGE not WORLD, it simplifies domain list. If it is a domain, it needs careful scope delineation from KNOWLEDGE surface. | UX-03 or UX-05 |
| OQ-IA-03 | What is the correct granularity for the domain capability list? Should every API endpoint be a capability, or only human-recognisable actions? | If too granular, capability lists become noise. If too coarse, discovery suffers. | apex-self-knowledge.md lists ~55+ API routes; these are not all distinct capabilities. | Affects discovery UX, capability list length, APEX recommendation quality. | UX-04 capability specification |
| OQ-IA-04 | How should dormant domains behave in WORLD? Should they collapse, fade, or remain equal weight? | Affects WORLD visual hierarchy and whether users notice inactive domains. | UX-00 stub pages (browser, civilisation — minimal content). | Affects WORLD surface design in UX-05+. | UX-05 (WORLD surface design) |
| OQ-IA-05 | Should the user be able to create custom domains (beyond the 10 canonical ones)? | Determines whether IA is owner-extensible or APEX-managed. | User model (UX-02): single owner, high autonomy. Constitution: human authority required for structural changes. | High impact if allowed — requires placement rules, naming rules, domain qualification UI. | UX-05+ |

### 37.2 Product Questions

| # | Question | Why it matters | Evidence | Impact | Required phase |
|---|---------|----------------|----------|--------|---------------|
| OQ-IA-06 | Is "Occult" a permanent canonical domain or a personal domain that may not be relevant to all APEX deployments? | Affects whether Occult is hardcoded or configurable. | UX-00 page-occult (confirmed existing page). APEX is personal AI OS for one owner. | If APEX is ever multi-tenant, personal domains need different treatment. | Product decision before UX-19 |
| OQ-IA-07 | Should "Browser" (page-browser stub, UX-00) become a capability within Research/Operations, or be retired? | Browser stub is nearly empty (36 lines, UX-00). It doesn't meet domain qualification. | UX-00 D-07 (stub pages), OQ-02 from UX-00. | Placement decision affects Research domain scope. | UX-05 |
| OQ-IA-08 | What is the relationship between the Obsidian vault (OBSERVED: obsidian-memory.js, vault files) and the KNOWLEDGE surface? | Vault is an external knowledge store. KNOWLEDGE surface represents APEX knowledge state. Vault appears in both knowledge retrieval and lesson storage. | APEX_ARCHITECTURE_MAP.md: Obsidian vault is Layer 10 (consolidation) memory source. APEX_MEMORY_SYSTEM.md: vault-based writes confirmed active. | Affects how vault content is discoverable in KNOWLEDGE and whether vault entries become KNOWLEDGE objects. | UX-04 / UX-06 |

### 37.3 Architecture Questions

| # | Question | Why it matters | Evidence | Impact | Required phase |
|---|---------|----------------|----------|--------|---------------|
| OQ-IA-09 | OAQ-01 from UX-01: Frontend framework choice. This affects how deep links, object views, and contextual panels are implemented. | IA defines the structure; implementation depends on whether the monolithic HTML becomes modular components. | UX-00 TD-01 (monolithic HTML, 20,826 lines). CLAUDE.md: no rewrites. | Implementation path changes significantly based on framework decision. | UX-04 engineering decision |
| OQ-IA-10 | OAQ-05 from UX-01: Real-time transport. WebSocket vs polling affects how activity feeds, agent state, and notification delivery work in the IA. | Activity feed (COMMAND), agent status (SYSTEM/WORLD), and notification delivery all depend on real-time transport. | UX-00 D-04 (4 polling intervals violating A3). Existing /ws/viz WebSocket. | Polling → WebSocket migration scope determines how live IA objects are updated. | Engineering phase |
| OQ-IA-11 | Gateway completeness (OBSERVED gap): lib/memory/gateway.js claims single entry point but 9/13 tables have no gateway path. How does this affect the MEMORY object model in the IA? | The IA presents MEMORY as a coherent object type. The implementation has fragmented writes. | APEX_MEMORY_SYSTEM.md: "Gateway claim false — 9/13 tables have no gateway path." | Presenting MEMORY as coherent in the IA while implementation is fragmented risks misleading the user about what APEX actually remembers. Transparency requires honesty. | UX-06 (memory UX) + engineering |
| OQ-IA-12 | Should the knowledge graph (knowledge_graph_nodes, knowledge_graph_edges — OBSERVED in data model) be directly navigable in the KNOWLEDGE surface, or is it an internal APEX model not surfaced to the user? | The graph nodes and edges table is confirmed active. A user-navigable knowledge graph could be powerful but also overwhelming. | APEX_DATA_MODEL.md: knowledge_graph_nodes + knowledge_graph_edges confirmed. API exposed via routes/knowledge-graph.js. | Affects KNOWLEDGE surface design complexity and whether graph visualisation is a UX-03 recommendation. | UX-06 (knowledge UX) |

### 37.4 Security Questions

| # | Question | Why it matters | Evidence | Impact | Required phase |
|---|---------|----------------|----------|--------|---------------|
| OQ-IA-13 | How should the IA handle authority level in deep links? A deep link to a specific decision must not bypass authentication or reveal decision content to unauthenticated users. | Deep links increase navigational richness but introduce surface area if not protected. | UX-00 D-05 (dual auth, localStorage API key XSS risk). APEX_ARCHITECTURE_MAP.md: dual auth system confirmed. | Deep link design must respect requireAppAccess middleware and JWT auth without exposing object content in the URL itself. | UX-04 engineering |

---

## 38. UX-04 HANDOFF

### 38.1 What UX-04 Inherits from UX-03

UX-04 (Communication Architecture) covers: CONVERSE, PRESENT, NOTIFY,
voice UX, proactive communication, modality selection, attention management,
and contextual presentation specification.

UX-04 must receive and apply the following from UX-03:

---

**Surface Definitions (established, non-negotiable):**

```
COMMAND   — Primary interaction; contextual delivery surface for PRESENT and NOTIFY
WORLD     — Tree of Life; exploration; domain organisation
DECISIONS — Human authority; decision lifecycle
KNOWLEDGE — APEX knowledge state; provenance
SYSTEM    — Owner transparency; governance; runtime
```

**Object Model (canonical vocabulary):**
15 canonical objects (Section 12). UX-04 must define how each object type
is communicated when surfaced via CONVERSE, PRESENT, or NOTIFY.

**Notification Destination Model (Section 20.2):**
Full table of notification type → destination object → canonical surface.
UX-04 must specify the delivery mechanism, timing, and modality for each.

**Contextual Presentation Placement (Section 21):**
Presentations live in COMMAND presentation zone. UX-04 must specify the
visual specification, trigger conditions, lifecycle, and dismissal for
contextual presentations.

**Command Navigation Model (Section 19):**
Navigation intent taxonomy and resolution rules. UX-04 must specify how
APEX communicates navigation confirmation and how voice navigates the IA.

**Progressive Disclosure Structure (Section 23):**
L0–L4 disclosure levels. UX-04 must specify how each level is communicated:
- L0: voice/text response format
- L1: context card format
- L2: evidence presentation format
- L3: intelligence layer presentation format
- L4: constitutional layer communication format

**Tree Relationships (Section 35):**
Navigation paths through the Tree. UX-04 must specify voice and text
navigation confirmation patterns for each path type.

**Mobile Requirements (Section 30):**
Mobile IA priorities, surface priorities, presentation stacking rules.
UX-04 must specify how communication modalities adapt on mobile.

**Accessibility Requirements (Section 31):**
Semantic hierarchy, keyboard requirements, screen reader requirements.
UX-04 must specify how communication channels (CONVERSE, PRESENT, NOTIFY)
adapt for accessibility.

---

**IA Invariants that UX-04 must not violate:**

| Invariant | Communication implication |
|-----------|--------------------------|
| INV-IA-02 (one canonical object) | CONVERSE must never create a second representation of an existing object |
| INV-IA-03 (surfaces are views) | PRESENT must reference canonical objects, not create new ones |
| INV-IA-08 (presentations are views) | Dismissing a PRESENT does not lose the underlying data |
| INV-IA-14 (notifications deep-link) | NOTIFY must include destination object reference |
| INV-IA-23 (input zone global) | CONVERSE input must be accessible from all surfaces |

---

**Confirmed object-to-modality mappings (from UX-02 multimodal matrix,
carried into UX-04):**

| Object type | Primary communication | Secondary |
|-------------|----------------------|-----------|
| Simple fact (KNOWLEDGE L0) | Voice/text | None |
| Trend analysis (KNOWLEDGE L2) | Voice + chart PRESENTATION | None |
| Decision (DECISION pending) | NOTIFICATION L4 + decision panel | Voice |
| Task completion | NOTIFICATION L1–L2 + activity item | Voice if urgent |
| Knowledge gap | NOTIFICATION L2–L3 + knowledge panel | Voice |
| Cross-domain analysis | Voice + contextual PRESENTATION | None |
| Error | Voice + text | NOTIFICATION |

---

**Open questions UX-04 must resolve or inherit:**

| Question | For UX-04 |
|---------|-----------|
| OQ-IA-09 (framework) | Affects component model for PRESENT and NOTIFY |
| OQ-IA-10 (real-time transport) | Affects live delivery of NOTIFY and activity feed updates |
| OQ-IA-12 (knowledge graph navigability) | Affects how PRESENT surfaces knowledge graph relationships |

---

### 38.2 What UX-04 Must Not Assume

- UX-04 must not create new surfaces. COMMAND, WORLD, DECISIONS, KNOWLEDGE,
  SYSTEM are fixed.
- UX-04 must not create new object types without returning to UX-03 for
  extension.
- UX-04 must not specify how navigation is implemented — only how navigation
  is communicated (voice confirmation, visual transition).
- UX-04 must not introduce a new notification level beyond the established 0–5.

---

### 38.3 UX-04 Minimum Deliverables

UX-04 must produce at minimum:

1. CONVERSE specification (text and voice conversation interaction model)
2. PRESENT specification (contextual presentation types, triggers, lifecycle)
3. NOTIFY specification (notification delivery, routing, mobile behaviour)
4. Voice UX specification (state model, activation, turn-taking, interruption,
   accessibility)
5. Proactive communication specification (governance gate, modality selection,
   quiet periods)
6. Attention management specification (5-tier model from UX-02, visual treatment)
7. Modality selection rules (when voice, when text, when visual, when combined)
8. Contextual presentation visual specification (chart types, card types,
   comparison formats, table formats)
9. Mobile communication adaptation
10. Accessibility communication specification

---

## 39. VERIFICATION

Before completion:

- No application files were modified
- No HTML files were modified
- No CSS files were modified
- No JavaScript files were modified
- No backend routes were changed
- No APIs were changed
- No database schemas were changed
- No dependencies were installed
- No runtime behaviour was changed
- No production configuration was changed

Only `docs/interface/UX-03-INFORMATION-ARCHITECTURE-TREE-OF-LIFE.md` was
created.

---

## 40. FINAL REPORT

**UX-03 STATUS: COMPLETE**

**Source documents consumed:**
- UX-00 Legacy Interface Baseline (read: screen inventory, nav map, components,
  functional inventory, defects, tech debt, missing capabilities, keep/rework
  matrix, conclusions, UX-01 handoff)
- UX-01 Canonical UX Discovery (read: 5 surfaces, Tree-of-Life UX, 3 layers,
  18 principles, legacy preservation, open questions, UX-02 handoff)
- UX-02 User + Task Model (read: intent taxonomy, 12 task types, 25 journeys,
  surface transitions, cross-surface tasks, 22 invariants, open questions,
  UX-03 handoff spec)
- APEX_SYSTEM_INDEX.md (read: component map, route index, quick navigation)
- APEX_ARCHITECTURE_MAP.md (read: 10-layer architecture, component wiring,
  auth system, route loading, agent pipeline, memory access paths)
- APEX_DATA_MODEL.md (read: 27 migrations, all tables, hot paths,
  pgvector RPCs, unused tables)
- APEX_AGENT_SYSTEM.md (read: 8-agent pipeline, model tier matrix, 225-agent
  library, 7 executive entities, 9 cognitive controllers, 5 domain agents)
- APEX_GOVERNANCE_MODEL.md (read: 3-layer governance, constitution, 40-domain
  evidence chain, 7 gates, authority graph)
- APEX_MEMORY_SYSTEM.md (read: 13-layer memory, dual architecture A+B,
  gateway gaps, write authority matrix)
- apex-self-knowledge.md (read: identity, API routes, agent pipeline summary,
  memory layers, model tiers)

**Five-surface IA:** COMMAND / WORLD / DECISIONS / KNOWLEDGE / SYSTEM —
  fully specified with purpose, objects, entry/exit, all three experience layers.

**Canonical object model:** 15 objects defined — DOMAIN, CAPABILITY, AGENT,
  TASK, DECISION, ACTION, KNOWLEDGE, SOURCE, EVIDENCE, MEMORY, EVENT,
  NOTIFICATION, PRESENTATION, ACTIVITY, SYSTEM STATE — each with full
  attribute specification.

**Tree-of-Life structure:** 5-level tree (ROOT → WORLD → DOMAIN → CAPABILITY/
  OBJECT → INSTANCE). 10 canonical domains. Level specifications complete.
  Navigation paths defined.

**Domain model:** 10 canonical domains derived from UX-00 legacy pages.
  Domain qualification rules. Domain permanence and lifecycle model.
  Naming rules.

**Capability model:** Classification (global/domain-specific/cross-domain/
  contextual/agent-mediated). Discovery paths. Placement rules.

**Relationship model:** 28 canonical relationships mapped across all 15 object
  types.

**Cross-domain model:** Cross-domain task model. Cross-domain objects.
  Cross-domain search. Cross-domain presentation with attribution.

**Navigation model:** 4-tier navigation (T1 primary / T2 domain / T3 object
  / T4 contextual). Keyboard model. Back behaviour. Deep links.

**Discovery model:** Browsing, conversational, contextual suggestion, World
  exploration, APEX recommendation. Anti-pattern documented.

**Search model:** Global search, contextual, semantic (pgvector-backed), filter.
  Result types and relationship surfacing.

**Progressive disclosure model:** L0–L4 with triggers, cross-surface behaviour,
  complexity management rationale.

**Duplication prevention rules:** ONE canonical representation. Contextual
  views pattern. Anti-pattern table.

**Growth/extensibility model:** Rules for new capabilities, domains, agents,
  decision types, knowledge types. Anti-fragmentation rule.

**Mobile IA:** Surface priorities, domain entry model, navigation adaptation,
  search adaptation, notification adaptation.

**Accessibility IA:** Semantic hierarchy, keyboard nav, screen reader, reduced
  motion, voice-unavailable, visual-unavailable paths.

**Real-life scenario verification:** 12 scenarios tested against IA. All 12
  successfully trace ENTRY → OBJECT → RELATIONSHIP → ACTION → OUTCOME.

**IA Invariants:** 25 binding rules (INV-IA-01 through INV-IA-25).

**Unresolved questions:** 13 questions across UX (5), Product (3), Architecture
  (4), Security (1) — each with why-it-matters, evidence, impact, required
  future phase.

**UX-04 handoff:** Complete. Surface definitions, object model, notification
  destination model, presentation placement, command navigation model,
  progressive disclosure structure, Tree relationships, mobile requirements,
  accessibility requirements, invariant constraints, minimum deliverables.

**Documentation created:** `docs/interface/UX-03-INFORMATION-ARCHITECTURE-TREE-OF-LIFE.md`

**Repository changes:** None other than the document above.

**Verification result:** PASS — zero application modifications.

---

**Hard stop: ACTIVE — UX-04 requires explicit authorisation.**
