# UX-10 — DOMAIN EXPERIENCES
**APEX UX Programme | Phase 10 — Canonical**
**Status:** DEFINING — Reconciliation active
**Governs:** How ONE APEX provides coherent, domain-contextual experiences across all life and work domains without fragmenting into multiple systems.
**Governing Principle:** ONE PLATFORM. ONE SYSTEM. ONE APEX.
**Reconciliation Note:** A prior execution labelled personalisation work as UX-10. That work is preserved as SUPPORTING UX WORK. See `UX-10-RECONCILIATION-RECORD.md`.

---

## 1. OBJECTIVE

UX-10 defines how APEX provides coherent, domain-contextual experiences across Finance, Health, Education (Uni), Business, Operations, and other life and work domains — without fragmenting into multiple applications, without maintaining parallel governance systems, and without abandoning the canonical ONE APEX principle.

The specific objective is:

**To design the UX model by which APEX detects, activates, and presents domain-contextual experiences through a single unified interface, using one memory system, one governance layer, one visual design system, and one contextual presentation pipeline — while allowing domain-specific agents, knowledge, capabilities, and communication to be surfaced contextually and coherently.**

UX-10 answers the following questions:

1. What is a domain in APEX, and how does it differ from an application or a product? [PROPOSED]
2. How does APEX detect which domain the user is in? [OBSERVED — via detectDomain()]
3. How does the Command Centre and World surface adapt to domain context? [PROPOSED]
4. How do domain-specific agents, data, and knowledge surface without fragmenting the interface? [PROPOSED]
5. How does APEX switch between domains while preserving task continuity? [PROPOSED]
6. How does the domain experience model compose with UX-08 (contextual presentation) and UX-09 (proactive communication)? [PROPOSED]
7. What is the gap between current production domain architecture and the canonical domain UX model? [OBSERVED]

UX-10 does NOT implement production changes. UX-10 does NOT modify server.js, domain-agents.js, or any production file. UX-10 produces design documentation and a prototype only.

---

## 2. SCOPE

### 2.1 In Scope

The following are within the scope of UX-10:

- **Domain model definition** — what domains are, what they are not, and how they relate to ONE APEX [PROPOSED]
- **Domain identification** — how APEX determines the active domain from user signals [OBSERVED + PROPOSED]
- **Domain context state** — the domain context object maintained during a session [PROPOSED]
- **Domain-specific presentation** — how the contextual presentation pipeline (UX-08) is modified by domain context [PROPOSED]
- **Domain-specific proactive communication** — how the proactive communication model (UX-09) is scoped by domain [PROPOSED]
- **Domain-specific voice** — how the voice experience (UX-07) adapts to domain context [PROPOSED]
- **Domain-specific knowledge surfacing** — how domain context scopes knowledge retrieval (relevant to UX-11) [PROPOSED]
- **Domain-specific agent activation** — how domain agents are surfaced to the user as contextually relevant [PROPOSED]
- **Domain switching model** — the rules governing how APEX transitions between domains [PROPOSED]
- **Cross-domain queries** — how APEX handles queries that span multiple domains [PROPOSED]
- **Domain navigation** — how the user moves between domains via the World surface and Command Centre [PROPOSED — inherits UX-03, UX-06]
- **Domain capability surface** — what APEX capabilities are contextually surfaced per domain [PROPOSED]
- **Command Centre integration** — how domain context appears in the Command Centre (UX-06) [PROPOSED]
- **Production audit** — gap analysis between current production domain architecture and canonical UX model [OBSERVED]
- **Prototype architecture** — what the apex-domain-prototype.html demonstrates [PROPOSED]

### 2.2 Out of Scope

The following are explicitly outside the scope of UX-10:

- **Production implementation** — UX-10 produces no production code. server.js, domain-agents.js, and all production files are untouched.
- **Production database modifications** — No schema changes to Supabase or any other database.
- **Domain-specific governance or constitutional rules** — Governed by UX-16 (System / Constitutional). The Civilisation Agent's authority is not modified here.
- **Individual agent architecture** — The internal architecture of domain agents is governed by UX-13 (Agents).
- **Domain-specific memory architecture** — Memory system design is governed by UX-15 (Memory). Domain context scoping of memory is referenced here but not defined here.
- **Health domain production implementation** — The Health domain gap is documented. A Health Agent is not designed or specified here.
- **Knowledge system architecture** — Knowledge architecture is governed by UX-11. Domain scoping of knowledge is referenced here.
- **Intelligence layer** — Intelligence architecture is governed by UX-12.
- **Approval / action model architecture** — Governed by UX-14.

---

## 3. AUTHORITATIVE INPUTS

The following prior UX phases constitute authoritative inputs to UX-10. All domain experience design must be consistent with these prior phases. No prior phase is reopened by UX-10.

| Phase | Document | Relevance to UX-10 |
|-------|----------|---------------------|
| UX-00 | Legacy Interface Baseline | Documents the legacy multi-application fragmented state that ONE APEX resolves. Domain experiences must not reintroduce application fragmentation. [INHERITED] |
| UX-01 | Canonical UX Discovery | Establishes the ONE APEX governing principle. All domain UX is bounded by this principle. [INHERITED] |
| UX-02 | User Task Model | Defines domain-scoped tasks across Finance, Health, Communication, Operations, Business, Education, Research, Civilisation. The task model is the authoritative reference for what users do within each domain. [INHERITED] |
| UX-03 | Information Architecture — Tree of Life | Defines the COMMAND → WORLD → domains → items hierarchy. Defines the WORLD surface as the primary domain navigation surface. Domain branches in the Tree of Life are the structural reference for domain taxonomy. [INHERITED] |
| UX-04 | Communication Architecture | Defines domain-contextual communication patterns. Domain experiences must route communication through the canonical communication architecture. [INHERITED] |
| UX-05 | Canonical Visual Design System | All domain UX must comply with UX-05 design tokens, typography, spacing, and colour system. Domain experiences cannot introduce domain-specific visual systems. [INHERITED] |
| UX-06 | Command Centre Visual Prototype | Defines the Command Centre as the universal interface shell. Domain context surfaces within the Command Centre — the Command Centre is not replaced by domain shells. [INHERITED] |
| UX-07 | Voice Experience | Defines the 11 voice states (INACTIVE, LISTENING, SPEAKING, THINKING, AMBIENT, ERROR, INTERRUPTION, DOMAIN_SWITCH, TASK_COMPLETE, PROACTIVE, SLEEPING). Voice experience operates within domain context. [INHERITED] |
| UX-08 | Contextual Presentation | Defines the canonical presentation pipeline: attention scoring, five disclosure levels (L1–L5), relevance filtering. All domain content enters this pipeline. Domain context modifies attention scores and relevance weights. [INHERITED] |
| UX-09 | Proactive Communication | Defines the proactive communication model: trigger types, delivery rules, suppression logic, urgency scoring. Domain context scopes proactive triggers. Domain-specific triggers enter the canonical UX-09 model. [INHERITED] |

### 3.1 Key Architectural Constraints from Prior Phases

From UX-02: The canonical domain taxonomy includes Finance, Health, Communication, Operations, Business, Education, Research, and Civilisation. UX-10 must account for all eight, noting that production currently implements five (Finance, Uni, Business, System, File) and omits Health. [OBSERVED — partial production coverage]

From UX-03: The WORLD surface is the canonical domain navigation surface. Domains are branches in the Tree of Life, not separate trees. [INHERITED]

From UX-05: All domain presentation uses UX-05 design tokens exclusively. [INHERITED]

From UX-06: The Command Centre is the universal shell. Domain context surfaces inside the Command Centre, not as a replacement for it. [INHERITED]

From UX-08: Domain content enters the canonical UX-08 presentation pipeline. Domain context modifies relevance scores (detailed in Section 7.3). Domain presentation is NOT a bypass of UX-08. [INHERITED]

From UX-09: Domain proactive communication enters the canonical UX-09 model. Domain context scopes trigger evaluation (detailed in Section 7.4). Domain proactive communication is NOT a bypass of UX-09. [INHERITED]

---

## 4. PRODUCTION AUDIT

### 4.1 Production Domain Architecture

The following table documents the current production domain architecture as observed in the codebase. All entries are evidence-classified [OBSERVED].

| Capability | File / Location | Status | What It Does | Domain UX Wired? | Gap |
|------------|-----------------|--------|--------------|------------------|-----|
| Domain detection | `lib/server-utils.js:detectDomain()` | PRODUCTION ACTIVE | Keyword regex matching → domain slug (finance, uni, file, system, business) or null | No UX layer | Domain slug is computed but never surfaced to user. No domain context indicator exists in the interface. |
| Domain Agents (5 slugs) | `agent-system/domain-agents.js` | PRODUCTION ACTIVE | Defines agents for system, file, uni, finance, business with domain-specific system prompts. Exports DOMAIN_AGENTS map and invokeDomainAgent(). | No UX layer | Agent routing is purely server-side. User has no visibility into which domain agent responded. |
| Domain routing | `server.js` | PRODUCTION ACTIVE | Imports detectDomain, DOMAIN_AGENTS, invokeDomainAgent. Calls detectDomain() in chat and voice routes to select domain agent. | No UX | Routing is invisible. Domain switch produces no notification or context shift visible to user. |
| Finance Agent | `agent-system/finance_agent.js` | PRODUCTION ACTIVE | Transaction categorisation (housing/food/transport/entertainment/business/health/savings/income/other), budget alerts, CSV parsing, finance-specific Supabase helpers. | No domain panel | Finance data is processed server-side but not surfaced in a domain-specific UX panel. No Finance domain context in dashboard. |
| Civilisation Agent | `agent-system/domain-agents.js` | PRODUCTION ACTIVE | Constitutional governance, 10 domain health monitoring (DOM-000001 through DOM-000010), system integrity evaluation. | No UX | Civilisation domain is entirely internal. User has no visibility into constitutional governance status. |
| Health domain | Not present in domain-agents.js | OPEN GAP | Referenced in UX-02 and UX-03 as a core domain. Health categories appear in finance_agent.js categorisation. | Not implemented | No Health Agent, no health domain detection, no health UX. |
| Domain model in UX-02/03 | `docs/interface/` | PROPOSED / HISTORICAL | Tree-of-Life IA defines WORLD surface, domain branches, domain-scoped tasks. | Design only | The UX-02/03 design has not been implemented. The World surface with domain cards does not exist in production. |
| Domain in dashboard | `dashboard.html` (assumed) | OPEN | Current dashboard state unknown without audit. | Unknown | If dashboard exists, domain context is not surfaced per production audit of server-side routing. |
| Domain-specific proactive | Not present | OPEN | No domain-scoped proactive communication in production. | Not implemented | UX-09 proactive model exists in design. Domain scoping of proactive triggers is not in production. |
| Domain-specific voice | Not confirmed | OPEN | Voice routes through detectDomain() but domain-specific voice vocabulary not confirmed. | Unknown | Domain-aware voice system prompts are referenced in domain-agents.js but user-visible domain voice state is not confirmed. |

### 4.2 Domain Coverage Matrix

The following matrix documents coverage across the canonical domain taxonomy. [OBSERVED] where production evidence exists; [PROPOSED] where design-only; [OPEN] where gap identified.

| Domain | In domain-agents.js | In detectDomain() | Finance Data | Agent | UX Panel | Status |
|--------|--------------------|--------------------|--------------|-------|----------|--------|
| Finance | Yes [OBSERVED] | Yes [OBSERVED] | Yes — finance_agent.js [OBSERVED] | Finance Agent [OBSERVED] | No [OPEN] | PARTIAL — agent exists, no UX panel |
| Education / Uni | Yes [OBSERVED] | Yes — keyword: uni [OBSERVED] | No | Uni Agent [OBSERVED] | No [OPEN] | PARTIAL — agent exists, no UX panel |
| Business | Yes [OBSERVED] | Yes — keyword: business [OBSERVED] | No | Business Agent [OBSERVED] | No [OPEN] | PARTIAL — agent exists, no UX panel |
| Operations / System | Yes [OBSERVED] | Yes — keyword: system [OBSERVED] | No | System Agent [OBSERVED] | No [OPEN] | PARTIAL — agent exists, no UX panel |
| File / Knowledge | Yes [OBSERVED] | Yes — keyword: file [OBSERVED] | No | File Agent [OBSERVED] | No [OPEN] | PARTIAL — agent exists, no UX panel |
| Health | No [OPEN] | No [OPEN] | Category in finance_agent.js only | No [OPEN] | No [OPEN] | OPEN GAP — no Health Agent, no detection |
| Civilisation / Constitutional | Yes [OBSERVED] | No [OBSERVED] | No | Civilisation Agent [OBSERVED] | No [OBSERVED — by design] | INTERNAL ONLY — not user-facing by design |
| Communication | No specific agent | No | No | Not present [OPEN] | No | OPEN — referenced in UX-02, not in production |
| Research | No specific agent | No | No | Not present [OPEN] | No | OPEN — referenced in UX-02, not in production |

### 4.3 Production Gaps

The following gaps are identified between the current production domain architecture and the canonical UX-10 domain experience model. All gaps are [OBSERVED] as absences in production.

**GAP-01: No domain context surface in the interface.**
detectDomain() computes a domain slug but this slug is never surfaced to the user. The user has no indication of which domain APEX is operating in at any given moment.

**GAP-02: No domain context panel (World surface not implemented).**
UX-03 defines the WORLD surface with domain branches. This surface does not exist in production. Users cannot navigate to a domain explicitly through the interface.

**GAP-03: No domain agent visibility.**
When invokeDomainAgent() routes a query to the Finance Agent, the user sees a standard response. There is no attribution, no indication that the Finance Agent responded, no domain badge or identifier.

**GAP-04: No domain switching UX.**
When detectDomain() detects a domain switch (Finance → Uni, for example), no notification is shown. No confirmation is sought. The switch is invisible.

**GAP-05: No in-progress task preservation across domain switches.**
Because domain switching is invisible, there is no mechanism to preserve or surface tasks from the prior domain as pending.

**GAP-06: No domain-specific presentation rules.**
UX-08 contextual presentation does not receive domain context. Domain content is not scored with domain-specific relevance weights. A Finance alert does not receive a relevance boost when the user is in Finance domain context.

**GAP-07: No domain-specific proactive communication.**
UX-09 proactive communication model does not receive domain context. Domain-specific triggers (Finance budget threshold, Uni deadline) are not scoped to domain context in production.

**GAP-08: No domain-specific Command Centre adaptation.**
The Command Centre (UX-06) input zone, briefing, and status area do not adapt to domain context. The input placeholder does not change to reflect the active domain. The briefing is not domain-filtered.

**GAP-09: Health domain absent from production.**
No Health Agent exists. Health is not a detectable domain in detectDomain(). Health data (referenced in finance_agent.js categorisation as a transaction category) is not connected to any Health domain UX or agent.

**GAP-10: Finance data not surfaced in domain UX panel.**
finance_agent.js processes transaction data, budget alerts, and CSV parsing. None of this data is surfaced in a dedicated Finance domain panel. Users access Finance data only through conversation, not through a domain knowledge panel.

**GAP-11: Civilisation domain state not user-accessible.**
The Civilisation Agent monitors 10 domain health signals (DOM-000001 through DOM-000010). This constitutional monitoring is not surfaced to the user in any form. There is no observability into domain governance status.

**GAP-12: No cross-domain query handling.**
There is no explicit handling for queries that span multiple domains (e.g., a business invoice that is also a finance transaction). detectDomain() returns a single slug. Cross-domain queries are handled by whichever single agent is selected.

**GAP-13: No domain-specific voice vocabulary.**
Domain-aware system prompts exist in domain-agents.js but domain-specific voice behaviour (GBP quoting in Finance, module name referencing in Edu) is not confirmed as implemented in the voice pipeline.

**GAP-14: Communication and Research domains not implemented.**
UX-02 defines Communication and Research as canonical domains. Neither has an agent, detection keyword, or UX treatment in production.

---

## 5. DOMAIN MODEL

### 5.1 The ONE APEX Domain Principle

**Domains are lenses, not applications.**

This is the foundational principle of UX-10. [PROPOSED]

APEX is ONE platform. It has ONE governance layer (Civilisation Agent, constitutional hierarchy). It has ONE memory system. It has ONE identity model. It has ONE visual design system (UX-05). It has ONE contextual presentation pipeline (UX-08). It has ONE proactive communication model (UX-09). It has ONE voice experience (UX-07). It has ONE Command Centre (UX-06).

A domain is a contextual lens applied to this single platform. When APEX operates in Finance domain context, the same APEX kernel is running. The same governance applies. The same memory is accessible. The same interface shell is active. What changes is: which capabilities are surfaced, which data is foregrounded, which agent is active, which knowledge is prioritised, which proactive triggers are evaluated, and which communication vocabulary is used.

**Domains do NOT create:**
- Separate applications
- Separate databases
- Separate governance systems
- Separate identity systems
- Separate visual systems
- Separate memory stores
- Parallel interface shells

**Domains DO create:**
- A contextual lens on the ONE APEX kernel
- A prioritised capability surface relevant to the domain
- A scoped knowledge and data surface
- An active agent context
- A modified relevance weighting in the UX-08 pipeline
- A scoped trigger evaluation in the UX-09 model
- A domain-aware vocabulary in the UX-07 voice experience

This principle directly resolves the fragmentation problem documented in UX-00 (Legacy Interface Baseline). Legacy systems fragmented APEX into multiple applications. UX-10 defines how domain context is provided without reintroducing fragmentation.

### 5.2 Domain Taxonomy

The canonical domain taxonomy for APEX, as established by UX-02 and extended by production observation, is as follows. [INHERITED from UX-02; production slug status is [OBSERVED]]

| Domain | Slug | Description | Primary Data Sources | Primary Agent | Production Status | Scope Notes |
|--------|------|-------------|---------------------|---------------|-------------------|-------------|
| Finance | `finance` | Financial management, transactions, budgets, income, expenses, financial planning. | Supabase finance tables, transaction CSV, budget records | Finance Agent (`finance_agent.js`) | PRODUCTION ACTIVE [OBSERVED] | Most complete domain implementation. Finance Agent has transaction categorisation, budget alerts, CSV parsing. No UX panel. |
| Education / Uni | `uni` | University studies, assignments, deadlines, reading lists, academic planning, modules. | Uni knowledge base (assumed), calendar, notes | Uni Agent (`domain-agents.js`) | PRODUCTION ACTIVE [OBSERVED] | Agent exists. detectDomain() matches `uni` keyword. No UX panel. No confirmed data sources beyond agent system prompt. |
| Business | `business` | Business operations, clients, projects, invoices, proposals, business relationships. | Business records (assumed), contacts, projects | Business Agent (`domain-agents.js`) | PRODUCTION ACTIVE [OBSERVED] | Agent exists. detectDomain() matches `business` keyword. No UX panel. |
| Operations / System | `system` | Infrastructure, system health, technical operations, configuration, monitoring. | System logs, configuration, health metrics | System Agent (`domain-agents.js`) | PRODUCTION ACTIVE [OBSERVED] | Agent exists. detectDomain() matches `system` keyword. No UX panel. |
| File / Knowledge | `file` | File management, knowledge base, document retrieval, note organisation. | File system, knowledge base, documents | File Agent (`domain-agents.js`) | PRODUCTION ACTIVE [OBSERVED] | Agent exists. detectDomain() matches `file` keyword. No UX panel. |
| Health | Not assigned | Physical health, wellbeing, medical records, fitness, health monitoring. | Health records (none in production), fitness data | Not implemented | OPEN GAP [OPEN] | Referenced in UX-02/03. Health transaction category exists in finance_agent.js. No Health Agent. Not in detectDomain(). UX-10 documents the gap. |
| Civilisation / Constitutional | `civilisation` (internal) | Constitutional governance, domain health monitoring, system integrity, authority chain. | DOM-000001 through DOM-000010 health signals | Civilisation Agent (`domain-agents.js`) | INTERNAL ONLY [OBSERVED] | Not user-facing by design. Monitors all domains. Cannot be navigated to by the user. Surfaces only through governance notifications. |
| Communication | Not assigned | Messaging, email, calendar, contacts, communication management. | Email, calendar, messaging (none confirmed) | Not implemented | OPEN [OPEN] | Referenced in UX-02. Not in production. Not in detectDomain(). |
| Research | Not assigned | Research activities, sources, synthesis, academic and professional research. | Research notes, sources (none confirmed) | Not implemented | OPEN [OPEN] | Referenced in UX-02. Not in production. Not in detectDomain(). |

### 5.3 Domain Hierarchy

The canonical domain hierarchy in APEX is as follows. [PROPOSED — inherits UX-03 Tree of Life structure]

```
APEX PLATFORM (ONE)
├── COMMAND SURFACE (universal — UX-06)
│   ├── Input Zone (domain-aware placeholder)
│   ├── Status Bar (domain context indicator)
│   ├── Briefing (domain-filtered)
│   └── Notifications (domain-badged)
│
├── WORLD SURFACE (UX-03 domain navigation)
│   ├── Finance Domain
│   │   ├── Transaction Data
│   │   ├── Budget Status
│   │   ├── Financial Alerts
│   │   └── Finance Agent
│   ├── Education Domain (Uni)
│   │   ├── Assignment Tracker
│   │   ├── Module Overview
│   │   ├── Deadline Monitor
│   │   └── Uni Agent
│   ├── Business Domain
│   │   ├── Client Overview
│   │   ├── Project Status
│   │   ├── Invoice Tracker
│   │   └── Business Agent
│   ├── Health Domain (OPEN GAP)
│   │   └── [Not implemented — gap documented]
│   ├── Operations Domain (System)
│   │   ├── System Health
│   │   ├── Infrastructure Status
│   │   └── System Agent
│   ├── File / Knowledge Domain
│   │   ├── Knowledge Base
│   │   ├── Recent Documents
│   │   └── File Agent
│   ├── Communication Domain (OPEN)
│   │   └── [Not implemented]
│   └── Research Domain (OPEN)
│       └── [Not implemented]
│
└── CONSTITUTIONAL LAYER (Civilisation — internal, not navigable)
    ├── DOM-000001 through DOM-000010 health monitoring
    ├── Constitutional authority chain
    └── Governance integrity evaluation
```

### 5.4 What Domains Share (Universal — ONE APEX)

The following capabilities are shared across ALL domains. They are never domain-specific, never domain-gated, and never modified by domain context in a way that would make them unavailable in any domain. [PROPOSED — with [INHERITED] constraints from prior UX phases]

- **Governance** — The Civilisation Agent's constitutional authority applies in all domains. No domain can override governance. [INHERITED UX-01, UX-16]
- **Identity** — The user's identity is not domain-scoped. APEX does not maintain separate identities per domain. [PROPOSED]
- **Memory system** — The canonical memory system is shared. Domain context scopes what is foregrounded in memory retrieval but does not partition memory. [PROPOSED — UX-15 will define; referenced here]
- **Attention engine** — The attention scoring engine (UX-08) operates globally. Domain context provides weighting inputs, not separate attention systems. [INHERITED UX-08]
- **Contextual presentation pipeline** — The UX-08 five-level disclosure pipeline applies to all domain content. Domain content does not bypass or replace this pipeline. [INHERITED UX-08]
- **Proactive communication model** — The UX-09 proactive communication model applies to all domain triggers. Domain-specific triggers enter this model, not a parallel system. [INHERITED UX-09]
- **Voice experience** — The UX-07 voice experience with its 11 states applies across all domains. Domain context modifies vocabulary and content, not the voice state machine. [INHERITED UX-07]
- **Visual design system** — UX-05 design tokens, typography, spacing, and colour system apply in all domains. Domain experiences do not introduce domain-specific visual systems. [INHERITED UX-05]
- **Constitutional guardrails** — L4 DECISION and L5 URGENT attention items are always surfaced regardless of domain context. Domain context cannot suppress high-urgency constitutional items. [INHERITED UX-08, UX-09]
- **Command Centre shell** — The Command Centre (UX-06) is the universal interface shell. Domain context modifies its content and labels; it does not replace the Command Centre. [INHERITED UX-06]

### 5.5 What Domains Differentiate (Contextual — varies by active domain)

The following elements are contextually modified when a domain is active. [PROPOSED]

- **Context signal set** — Each domain uses a different set of signals to determine relevant content. Finance signals include transaction thresholds, budget periods, account balances. Uni signals include assignment deadlines, module schedules, academic calendar. [PROPOSED]
- **Relevant capabilities shown** — The capability surface changes by domain. In Finance, budget creation and transaction review are surfaced. In Uni, assignment tracking and reading list management are surfaced. [PROPOSED]
- **Information surfaced** — Domain-specific data is foregrounded. Finance domain: transaction history, balance, budget status. Uni domain: assignments, deadlines, reading lists. [PROPOSED]
- **Agent activated** — The primary active agent changes by domain. Finance: Finance Agent. Uni: Uni Agent. Business: Business Agent. Global: Civilisation Agent remains always available. [OBSERVED — agent routing; PROPOSED — UX surfacing]
- **Default disclosure level** — Some domains have domain-appropriate default disclosure levels. Finance: L2 (operational) for routine data, L4 for financial decisions. Uni: L2 for deadlines, L3 for assignment status. [PROPOSED]
- **Proactive trigger rules** — Domain-specific proactive triggers are evaluated when the domain is active. Finance budget alert triggers are evaluated more frequently when Finance domain is active. [PROPOSED]
- **Communication vocabulary** — The voice and text communication vocabulary shifts by domain. Finance: uses GBP figures, account terminology. Uni: uses module names, academic terminology. [PROPOSED — partially [OBSERVED] via domain system prompts in domain-agents.js]

---

## 6. DOMAIN CONTEXT MODEL

### 6.1 Domain Context Pipeline

The canonical domain context pipeline defines how APEX moves from a user input or signal to a domain-contextual experience. This pipeline is composed with — not instead of — the UX-08 contextual presentation pipeline and the UX-09 proactive communication model. [PROPOSED]

```
USER INPUT / NAVIGATION / SIGNAL
       |
       v
STAGE 1: DOMAIN DETECTION
(keyword / navigation / explicit / inferred)
       |
       v
STAGE 2: DOMAIN CONTEXT
(set active domain, load domain state, update context object)
       |
       v
STAGE 3: RELEVANCE FILTER
(apply domain relevance weights to content and knowledge)
       |
       v
STAGE 4: CAPABILITY SURFACE
(show domain-relevant capabilities, agent, actions)
       |
       v
STAGE 5: DOMAIN PRESENTATION
(enter UX-08 pipeline with domain-modified relevance scores)
(evaluate UX-09 proactive triggers scoped to active domain)
       |
       v
STAGE 6: USER INTERACTION
(task, query, navigation, voice input)
       |
       v
STAGE 7: AGENT INVOCATION
(invoke domain agent with domain context injected)
       |
       v
STAGE 8: DOMAIN MEMORY UPDATE
(record context, outcomes, domain knowledge to shared memory)
```

**Stage 1: DOMAIN DETECTION**
- Inputs: User message text, navigation event, explicit domain selection, attention engine signals
- Processing: detectDomain() keyword matching (IMPLICIT); World surface navigation event (EXPLICIT); attention engine inference (INFERRED)
- Outputs: Domain slug (finance | uni | file | system | business | null), detection method, detection confidence
- Failure mode: detectDomain() returns null → global context maintained, no domain activation

**Stage 2: DOMAIN CONTEXT**
- Inputs: Domain slug, detection method, prior domain context object
- Processing: Update domain context state object (see Section 6.3), load domain-specific data indicators, set active agent reference
- Outputs: Updated domain context object, domain load event (for proactive summary trigger)
- Failure mode: Domain slug known but domain data unavailable → context set, data shown as unavailable (not hidden)

**Stage 3: RELEVANCE FILTER**
- Inputs: Domain context object, content queue (knowledge, notifications, briefing items)
- Processing: Apply domain relevance weights (+0.15 for in-domain content, -0.10 for cross-domain content). Do NOT suppress cross-domain content — deprioritise only.
- Outputs: Re-scored content queue
- Failure mode: Weight application fails → revert to unweighted queue, log failure. Do not halt presentation.

**Stage 4: CAPABILITY SURFACE**
- Inputs: Domain context object, global capability registry
- Processing: Filter capability registry to domain-relevant capabilities. Surface domain agent as primary agent. Surface domain-specific actions (Finance: budget creation, transaction review; Uni: assignment creation, deadline view).
- Outputs: Contextual capability panel (for World surface / Command Centre), active agent identifier
- Failure mode: Domain capability data unavailable → surface global capabilities, indicate domain capability loading

**Stage 5: DOMAIN PRESENTATION**
- Inputs: Re-scored content queue (from Stage 3), domain context object, UX-08 attention scoring engine
- Processing: Content enters canonical UX-08 pipeline. Domain context is a weighting input, not a bypass. UX-09 proactive triggers evaluated with domain scope. UX-07 voice vocabulary updated for active domain.
- Outputs: Presented content at appropriate disclosure level, proactive items surfaced per UX-09 rules, voice system prompt updated
- Failure mode: UX-08 pipeline failure → fall back to priority-ordered unformatted list. Domain context preserved.

**Stage 6: USER INTERACTION**
- Inputs: User message, voice input, navigation event, action selection
- Processing: Route interaction to appropriate handler. Domain context maintained throughout. If voice input: process through UX-07 voice pipeline with domain vocabulary active.
- Outputs: Processed user intent, task or query record
- Failure mode: Intent classification fails → route to Civilisation Agent for fallback. Domain context preserved.

**Stage 7: AGENT INVOCATION**
- Inputs: User intent, domain context object, domain agent reference
- Processing: Invoke domain agent (invokeDomainAgent() or equivalent) with domain system prompt and domain context injected. Domain data loaded into agent context.
- Outputs: Agent response with domain context attribution
- Failure mode: Domain agent unavailable → fall back to general APEX response. Surface agent unavailability to user. Do not fabricate domain agent response.

**Stage 8: DOMAIN MEMORY UPDATE**
- Inputs: Interaction outcome, agent response, domain context object
- Processing: Record interaction to shared memory system. Tag with domain context. Update domain-specific knowledge state (gaps, coverage, recency). Domain memory is a view of shared memory, not a separate store.
- Outputs: Updated shared memory, updated domain knowledge state
- Failure mode: Memory write fails → log failure, continue session. Do not block interaction on memory failure.

### 6.2 Domain Identification Methods

APEX uses three methods to identify the active domain. [PROPOSED — Method 2 is [OBSERVED] in production]

**METHOD 1: EXPLICIT — User navigation**
The user navigates directly to a domain via the World surface (domain card click) or via voice command ("Go to Finance", "Switch to Finance", "Show me my uni work").
- Source: Navigation event from World surface or voice intent classification
- Priority: HIGHEST
- Confidence: 1.0 (user intent is unambiguous)
- Persistence: Domain context persists until user explicitly leaves or switches
- Detection classification: EXPLICIT

**METHOD 2: IMPLICIT — detectDomain() keyword match**
detectDomain() matches keywords in the user's message to a domain slug.
- Source: `lib/server-utils.js:detectDomain()` — keyword-based regex, zero API cost [OBSERVED]
- Priority: MEDIUM
- Confidence: Varies by keyword specificity. Assumed 0.7–0.9 for direct keyword matches.
- Persistence: Domain context set for the duration of the message. May persist for conversation thread.
- Detection classification: IMPLICIT
- Tie-breaking: If EXPLICIT domain is active, IMPLICIT detection for a different domain does NOT override. EXPLICIT domain persists.

**METHOD 3: INFERRED — Attention engine signals**
The attention engine infers likely domain from contextual signals (time of day, prior conversation, calendar events, pending tasks, open knowledge gaps).
- Source: UX-08 attention engine, UX-09 proactive model, session context [PROPOSED]
- Priority: LOWEST
- Confidence: Varies. Only used when no EXPLICIT or IMPLICIT domain is active.
- Persistence: Low confidence inference — surface as suggestion ("You seem to be working on Finance — should I activate Finance context?"), do not auto-activate.
- Detection classification: INFERRED

**Priority and tie-breaking rules:**

```
EXPLICIT > IMPLICIT > INFERRED

Rule 1: If EXPLICIT domain is active, IMPLICIT detection does not override.
         Exception: If IMPLICIT confidence >= 0.95 AND explicitly contradicts EXPLICIT,
         notify user but do not switch.

Rule 2: If IMPLICIT domain differs from current EXPLICIT domain:
         - If current EXPLICIT domain has an active in-progress task: require confirmation to switch.
         - If current EXPLICIT domain is idle: surface notification, allow passive switch.

Rule 3: INFERRED domain is always surfaced as a suggestion, never auto-activated.

Rule 4: Conflicting IMPLICIT signals (message contains keywords from two domains):
         - Apply higher-confidence match.
         - If tied: do not activate either domain — route as cross-domain query.
         - Log the conflict for future detectDomain() refinement.

Rule 5: null from detectDomain() → global context maintained. No domain activated.
         This is valid and expected for general queries.
```

### 6.3 Domain Context State Object

APEX maintains the following domain context state object during a session. [PROPOSED]

```javascript
{
  active: 'finance',           // current domain slug or null (global context)
  explicit: true,              // true if user explicitly navigated here (EXPLICIT method)
  implicit: false,             // true if set by detectDomain() keyword match (IMPLICIT method)
  inferred: false,             // true if set by attention engine inference (INFERRED method)
  confidence: 0.88,            // detection confidence (1.0 for explicit, varies otherwise)
  history: [                   // navigation history for this session (most recent last)
    { domain: null, method: 'initial', timestamp: '2026-08-27T10:00:00Z' },
    { domain: 'finance', method: 'explicit', timestamp: '2026-08-27T10:05:00Z' }
  ],
  sessionStart: '2026-08-27T10:00:00Z',
  activatedAt: '2026-08-27T10:05:00Z',
  dataLoaded: ['transactions', 'budgets'],  // domain data loaded into context
  agentActive: 'Finance Agent',             // active domain agent display name
  agentSlug: 'finance',                     // active domain agent slug
  suppressGlobal: false,                    // whether non-domain content is suppressed (default false)
  pendingTasks: [],                         // tasks from prior domains not yet resolved
  proactiveQueue: [],                       // domain-scoped proactive items queued
  knowledgeGaps: [],                        // domain knowledge gaps identified in session
  switchCount: 0,                           // number of domain switches this session
  lastSwitchReason: null,                   // reason for last switch (explicit/implicit/inferred)
  crossDomainQueries: 0                     // number of cross-domain queries handled
}
```

**State transitions:**

- Global → Domain (explicit): `active` set, `explicit: true`, `activatedAt` set, `dataLoaded` populated, `agentActive` set
- Domain → Domain (explicit switch): prior domain context archived to `history`, new domain context initialised, `pendingTasks` carried over
- Domain → Global (explicit exit): `active: null`, `explicit: false`, all domain-specific state cleared, `pendingTasks` surfaced to user
- Domain context update (implicit): `implicit: true`, `explicit: false` if previously inferred; existing EXPLICIT overrides

---

## 7. DOMAIN EXPERIENCE MODEL

### 7.1 Global vs Domain Capability

The following table defines which APEX capabilities are always available (global) and which are contextually surfaced per domain. [PROPOSED — inherits from UX-06, UX-07, UX-08, UX-09]

| Capability | Global (always available) | Domain-Specific (contextual) |
|------------|--------------------------|------------------------------|
| Voice interaction (UX-07) | Always — all 11 voice states available | Context-aware vocabulary; domain system prompt active; GBP figures in Finance; module names in Edu |
| Contextual presentation (UX-08) | Always — five disclosure levels always available | Domain content prioritised (+0.15 relevance boost); cross-domain content deprioritised (-0.10); domain agent response at L2 |
| Proactive communication (UX-09) | Always — global triggers always evaluated | Domain triggers evaluated first; domain-specific proactive rules active; cross-domain triggers queued unless urgency > 0.8 |
| Command Centre (UX-06) | Always — shell always available | Input zone placeholder adapts ("Ask Finance Agent…"); status bar shows domain context; briefing domain-filtered |
| Memory | Always — full memory accessible | Domain memory surfaced first; domain-tagged records foregrounded in retrieval |
| Agents | Civilisation Agent always active (internal); general routing always available | Domain agent set as primary; invokeDomainAgent() routes to active domain agent |
| Knowledge | APEX global knowledge always accessible | Domain knowledge prioritised in retrieval; domain knowledge gaps surfaced with domain label |
| Actions | Approval model always enforced (UX-14) | Domain-specific actions surfaced in capability panel; Finance: budget, transaction; Uni: assignment, deadline |
| Visual design (UX-05) | Always — all design tokens enforced | Domain accent colour (if defined in UX-05) may indicate domain context; no new visual system introduced |
| Governance | Civilisation Agent always active; constitutional hierarchy always enforced | No domain-specific governance — governance is universal |
| Identity | Single identity always maintained | No domain-specific identity |
| Constitutional guardrails | L4/L5 items always surfaced | Domain context cannot suppress L4/L5 items |

### 7.2 Domain Experience Flow

The canonical domain experience flow defines what APEX knows, what APEX does, and what the user sees at each node. [PROPOSED]

**NODE 1: USER — Session start or domain entry**
- APEX knows: Prior session state, attention engine signals, pending tasks
- APEX does: Evaluate domain inference signals; if EXPLICIT navigation, activate domain
- User sees: World surface or Command Centre in global or prior domain context

**NODE 2: CURRENT CONTEXT — Active session state**
- APEX knows: Active domain (or null), pending tasks, proactive queue, memory state
- APEX does: Surface current context in Command Centre status bar; brief user on pending items
- User sees: Status bar domain indicator (or "Global"); any pending proactive items from prior session

**NODE 3: DOMAIN CONTEXT — Domain activation**
- APEX knows: Active domain slug, detection method, domain data availability, domain agent status
- APEX does: Set domain context object; load domain data indicators; update voice vocabulary; notify user of domain activation (if explicit or significant implicit switch)
- User sees: Domain context indicator in status bar; input zone placeholder updated; briefing refiltered; domain agent identified

**NODE 4: RELEVANT CAPABILITIES — Capability surface**
- APEX knows: Active domain, user task history in domain, available domain actions
- APEX does: Filter capability registry to domain-relevant items; surface domain agent; surface domain-specific actions
- User sees: Contextual capability panel showing domain-relevant actions; domain agent visible and accessible

**NODE 5: DOMAIN EXPERIENCE — Interaction**
- APEX knows: User intent (from message or voice), active domain, domain agent, domain data loaded
- APEX does: Route intent to domain agent; apply domain vocabulary to voice response; surface response at appropriate disclosure level
- User sees: Domain-contextual response; domain agent attribution; domain data surfaced (transactions, deadlines, etc.)

**NODE 6: KNOWLEDGE / INTELLIGENCE / AGENTS / ACTIONS — Domain capabilities**
- APEX knows: Domain knowledge state, knowledge gaps, available domain actions, intelligence insights
- APEX does: Surface domain knowledge; flag domain knowledge gaps; surface domain intelligence (budget trends, deadline proximity); propose domain actions if relevant
- User sees: Domain knowledge surfaced; gaps acknowledged (not hidden); intelligence insights at L3; action proposals at L2 or L4 (if approval required)

**NODE 7: OUTCOME — Task completion or continuation**
- APEX knows: Interaction outcome, task completion state, any pending items
- APEX does: Update domain memory; clear completed tasks; surface any pending domain items remaining
- User sees: Task confirmation or continuation; pending domain items if any remain

**NODE 8: MEMORY / CONTEXT — Post-interaction update**
- APEX knows: Updated domain knowledge state, new memory records, session context
- APEX does: Write interaction to shared memory with domain tag; update domain knowledge gaps list; evaluate proactive triggers for next session
- User sees: No immediate output; updated context available in next interaction

**NODE 9: NEXT EXPERIENCE — Continuity**
- APEX knows: Updated domain context, memory, proactive queue
- APEX does: Maintain domain context if still relevant; surface any new proactive items; prepare for next user interaction
- User sees: Domain context maintained; any proactive items surfaced per UX-09 rules

### 7.3 Domain Presentation Rules

Domain context modifies the UX-08 contextual presentation pipeline through relevance score adjustments. These rules are additive to, not replacements for, the UX-08 attention scoring model. [PROPOSED — inherits UX-08 scoring model]

**Relevance score modifications by domain context:**

| Content Type | Domain Match | Relevance Score Modifier | Disclosure Level Effect | Notes |
|-------------|-------------|------------------------|------------------------|-------|
| Domain content (in-domain) | Active domain matches content domain | +0.15 | May promote L1→L2, L2→L3 | Applied when domain is active. Not applied in global context. |
| Cross-domain content | Content domain differs from active domain | -0.10 | May demote L3→L2, but not below L1 | Never suppressed entirely. Deprioritised only. |
| Domain-specific agent status | Always in-domain | +0.20 | Always at minimum L2 | Domain agent status always surfaced when domain is active. |
| Domain financial alerts | Finance domain active | +0.30 | Always at L4 DECISION | Budget threshold breaches, significant transaction anomalies. |
| Domain knowledge gaps | Any domain active | +0.10 | At minimum L3 ATTENTION | Domain gaps are not hidden. Surfaced with domain label. |
| Constitutional / L4/L5 items | Any context | No modifier applicable | Always L4 or L5 regardless | Domain context cannot lower constitutional item priority. |
| Cross-domain urgent items (urgency > 0.8) | Any context | No deprioritisation | Urgency overrides domain filter | High-urgency items from any domain are not suppressed. |

**Disclosure level reference (from UX-08):**
- L1: Ambient / background
- L2: Operational / routine
- L3: Attention / notable
- L4: Decision / requires user response
- L5: Urgent / immediate action required

### 7.4 Domain Proactive Communication Rules

Domain context modifies the UX-09 proactive communication model. Domain-specific triggers enter the canonical UX-09 model — they do not form a parallel proactive system. [PROPOSED — inherits UX-09 model]

**Domain proactive rules:**

1. **Domain-relevant triggers: immediate evaluation.**
   When a domain is active, domain-specific proactive triggers are evaluated immediately rather than on their default schedule. Finance budget alert triggers evaluate on Finance domain entry. Uni deadline triggers evaluate on Edu domain entry.

2. **Cross-domain triggers: queued unless urgency > 0.8.**
   When Finance domain is active, Uni proactive triggers enter the cross-domain queue. They are not suppressed. If urgency > 0.8, they surface immediately regardless of active domain. If urgency <= 0.8, they are held and delivered on domain switch or global context.

3. **Domain switch event: domain entry summary.**
   On domain activation (any detection method), APEX delivers a brief domain state summary as a proactive item. Content: "Finance context active — [X] transactions pending review, budget at [Y]% of monthly limit." This summary enters UX-09 as a standard L2 proactive item. It is suppressable.

4. **Domain exit: no pending items left unresolved.**
   On domain exit (explicit navigation away or implicit switch with confirmation), APEX surfaces any pending domain items that have not been resolved. User is given the option to address pending items before leaving or to defer them to the pending task queue.

5. **Voice proactive delivery in domain context.**
   Domain-triggered proactive items delivered via voice use domain-appropriate vocabulary. Finance proactive items spoken in voice use GBP figures. Uni proactive items reference module names and deadlines.

6. **Suppression rules:**
   Domain context does not grant new suppression authority. L4 and L5 proactive items are always delivered regardless of domain active state or cross-domain status. Domain context may delay (queue) L1–L3 cross-domain items. It may never suppress L4–L5 items.

### 7.5 Domain Voice Rules

Domain context modifies the UX-07 voice experience in the following ways. The 11 UX-07 voice states are unchanged. [PROPOSED — inherits UX-07 voice state machine]

**Voice state reference (from UX-07):**
INACTIVE | LISTENING | SPEAKING | THINKING | AMBIENT | ERROR | INTERRUPTION | DOMAIN_SWITCH | TASK_COMPLETE | PROACTIVE | SLEEPING

**Domain voice modifications:**

1. **Domain-aware vocabulary in system prompt.**
   The active domain agent's system prompt (from domain-agents.js) includes domain-specific vocabulary. When the Finance Agent is active, the system prompt includes financial terminology, GBP currency formatting, transaction categorisation labels. This is [OBSERVED] in domain-agents.js system prompts, though UX-07 voice delivery of domain vocabulary is [PROPOSED].

2. **Finance domain: always quote figures in GBP (£).**
   All financial figures spoken in Finance domain context are quoted in GBP (£). "Your balance is £1,247.50." Not "your balance is 1247.50." This rule is absolute and not overridden by personalisation preferences.

3. **Edu domain: reference module names and deadlines.**
   In Edu domain context, APEX references specific module names and deadline dates. "Your CS401 assignment is due in three days." Not "you have an assignment due."

4. **SPEAKING state: domain context maintained.**
   During SPEAKING state, domain context is maintained. A voice response in Finance domain context does not lose domain context while APEX is speaking. The domain context object is not reset on SPEAKING entry.

5. **Domain switch via voice: explicit confirmation before switching.**
   If the user says "Go to Finance" or "Switch to Uni" during an active domain session with an in-progress task, APEX enters DOMAIN_SWITCH voice state. APEX confirms: "You're currently in [Domain] context with [task] in progress. Switch to [New Domain]?" User must confirm before the switch is executed. If no in-progress task, the switch is immediate without confirmation.

6. **Global context voice (no active domain).**
   In global context (no active domain), voice responses do not apply domain-specific vocabulary. Finance figures are not automatically quoted in GBP unless explicitly queried about Finance. The system prompt is the general APEX system prompt.

---

## 8. DOMAIN NAVIGATION AND SWITCHING

### 8.1 Navigation Patterns

Three canonical navigation paths allow the user to reach a domain context. [PROPOSED — inherits UX-03 World surface, UX-06 Command Centre, UX-07 voice]

**PATH 1: Voice navigation (Command Centre → Voice)**
1. User activates voice (LISTENING state)
2. User says: "Go to Finance" / "Open Finance" / "Switch to Finance context"
3. APEX classifies intent as domain navigation
4. If no active domain or idle active domain: domain context set immediately. DOMAIN_SWITCH voice state entered briefly. Domain entry summary delivered.
5. If active domain with in-progress task: confirmation requested (see 7.5 rule 5)
6. Voice transitions to SPEAKING state for domain entry summary
7. Command Centre updates: status bar, input placeholder, briefing

**PATH 2: World surface navigation**
1. User opens World surface (from Command Centre, UX-03)
2. Domain branches displayed as domain cards
3. User clicks / taps domain card
4. EXPLICIT domain detection: confidence 1.0, explicit: true
5. Domain context set. Domain panel/view opens.
6. Command Centre updates to reflect active domain
7. No confirmation required for explicit navigation (in-progress task warning displayed as non-blocking notification)

**PATH 3: Implicit navigation (detectDomain() keyword match)**
1. User types or speaks a message
2. detectDomain() matches keyword to domain slug
3. If no active domain: domain context set silently. Status bar updates. No confirmation dialogue. User sees subtle domain indicator change.
4. If active domain (EXPLICIT) and keyword matches same domain: no change.
5. If active domain (EXPLICIT) and keyword matches different domain: do not switch. Route query to domain agent for the detected domain. Display response with attribution. No context switch.
6. If active domain (IMPLICIT) and keyword matches different domain: switch domain context after evaluating in-progress tasks per switching rules (Section 8.2).

### 8.2 Domain Switching

The domain switching model governs how APEX handles transitions between domain contexts. [PROPOSED]

**Switching scenarios and rules:**

**SCENARIO A: Explicit switch (no in-progress task)**
- Trigger: User explicitly navigates to new domain (World surface click or voice command)
- Active domain state: Idle (no in-progress task)
- Rule: Immediate switch. No confirmation required. Prior domain context archived to history. New domain context initialised.
- UX: Status bar updates. Input placeholder updates. Domain entry summary delivered.

**SCENARIO B: Explicit switch (in-progress task in active domain)**
- Trigger: User explicitly navigates to new domain
- Active domain state: In-progress task present
- Rule: Confirmation required. APEX surfaces: "You have [task] in progress in [Domain]. Switch to [New Domain] and defer [task] to pending?" User confirms or cancels.
- If confirmed: Task moved to pendingTasks[]. Switch executed. Pending task badge shown.
- If cancelled: Switch aborted. Prior domain context maintained.

**SCENARIO C: Implicit switch (detectDomain() contradicts active EXPLICIT domain)**
- Trigger: detectDomain() returns a different domain slug than the currently active EXPLICIT domain
- Rule: Do NOT switch context. Route the query to the detected domain's agent for that message only. Respond with attribution ("responding with Finance Agent"). Active EXPLICIT domain persists.
- Rationale: EXPLICIT > IMPLICIT. User explicitly navigated to a domain; a keyword match should not override that intent.

**SCENARIO D: Implicit switch (detectDomain() contradicts active IMPLICIT domain)**
- Trigger: detectDomain() returns a different domain slug than the currently active IMPLICIT domain
- Rule: If no in-progress task: switch domain context. If in-progress task: notify ("Switching to Finance context — [task] from [prior domain] moved to pending.") and switch.
- Rationale: IMPLICIT → IMPLICIT switches are lower friction than EXPLICIT → IMPLICIT, as neither was an explicit user navigation.

**SCENARIO E: Cross-domain query (query spans two domains)**
- Trigger: Message contains signals from two domains (e.g., "pay my university tuition from my savings account")
- Detection: detectDomain() may return a single domain, or may conflict. Cross-domain signals detected by agent routing layer.
- Rule: Answer from both domain contexts without switching primary domain. Response attributes both domains. Active domain context unchanged.
- UX: Response shows both Finance and Uni context clearly. No domain switch executed.

### 8.3 Cross-Domain Continuity

**What persists across domain switches:**

- **Active voice session** — If a voice session is active, it persists across domain switches. The DOMAIN_SWITCH voice state is a transient state, not a termination. Voice session resumes in new domain context.
- **In-progress tasks** — Tasks not completed before a switch are moved to pendingTasks[] in the domain context state object. They are surfaced as "pending from [Domain]" in the Command Centre.
- **Memory** — The shared memory system is not domain-scoped. All memory persists across domain switches. Domain-tagged memory records remain accessible from any domain context.
- **Governance state** — The Civilisation Agent's governance state is not domain-scoped. Constitutional monitoring continues across domain switches.
- **Session identity** — User identity does not change on domain switch. No re-authentication on domain switch.

**What resets on domain switch:**

- **Active domain context object** — The domain context object is reset for the new domain. active, agentActive, agentSlug, dataLoaded, proactiveQueue, knowledgeGaps update to reflect the new domain.
- **Domain-specific proactive queue** — The domain-specific proactive queue (proactiveQueue[]) resets to reflect new domain triggers. Cross-domain queued items (urgency <= 0.8) remain in queue.
- **Input zone placeholder** — The Command Centre input zone placeholder updates to reflect the new domain ("Ask Finance Agent…" → "Ask Uni Agent…").
- **Capability surface** — The capability panel updates to show new domain-relevant capabilities.
- **Relevance weights** — The UX-08 relevance weight modifiers update to reflect the new active domain.

### 8.4 Global Context (No Active Domain)

When no domain is detected (detectDomain() returns null and no EXPLICIT navigation has occurred), APEX operates in global context. This is the default state at session start. [PROPOSED]

**Global context characteristics:**
- `active: null` in domain context state object
- All domains accessible from World surface
- No capability suppression — all domain capabilities available
- No domain-specific relevance weighting applied in UX-08
- No domain-specific proactive trigger prioritisation
- Voice vocabulary: general APEX vocabulary, no domain-specific terms
- Command Centre input zone: default placeholder ("Ask APEX…")
- Status bar: no domain indicator (or "Global" if domain indicator area is always shown)
- All domain agents accessible (not just one domain agent active)
- Civilisation Agent operates as always

Global context is not a degraded state. It is the appropriate state for multi-domain queries, general APEX queries, and sessions not scoped to a specific domain. APEX does not attempt to force domain activation in global context.

---

## 9. COMMAND CENTRE INTEGRATION

The Command Centre (UX-06) is the universal interface shell. Domain context surfaces within the Command Centre. The Command Centre is NOT replaced by domain-specific shells. ONE Command Centre. Domain context is a lens applied to it. [PROPOSED — inherits UX-06]

### 9.1 Status Bar — Domain Context Indicator

The Command Centre status bar includes a domain context indicator. [PROPOSED]

- **Global context:** No domain indicator, or "Global" in subdued text using UX-05 secondary text token
- **Domain active (explicit):** "[Domain] context" with domain label in UX-05 primary text token. Small domain icon (if UX-05 defines domain icons). Indicator is interactive — clicking opens World surface domain view.
- **Domain active (implicit):** "[Domain] context" in UX-05 secondary text token (slightly subdued vs explicit). Tooltip: "Detected from your message."
- **Domain switch in progress:** Brief DOMAIN_SWITCH indicator during switch

### 9.2 Input Zone — Domain-Aware Placeholder

The Command Centre input zone placeholder adapts to active domain. [PROPOSED]

- **Global:** "Ask APEX…"
- **Finance:** "Ask Finance Agent…" or "Finance: ask a question or review transactions…"
- **Uni:** "Ask Uni Agent…" or "Uni: ask about assignments, deadlines, modules…"
- **Business:** "Ask Business Agent…"
- **System / Operations:** "Ask System Agent…"
- **File / Knowledge:** "Ask File Agent…"

The placeholder adapts immediately on domain context change. It does not animate or transition — it updates on the next render cycle.

### 9.3 Briefing — Domain-Filtered

The Command Centre briefing (surface for contextual items) is domain-filtered when a domain is active. [PROPOSED — inherits UX-08, UX-09]

- Domain content appears first (relevance boost applied)
- Cross-domain content below domain content
- All items visible (no suppression) — ordering only
- Domain badge on domain-relevant items
- "More from [Other Domain]" summary for cross-domain items if > 3 cross-domain items are below the fold

### 9.4 Notifications — Domain-Badged

Notifications in the Command Centre carry domain badges when they originate from a domain context. [PROPOSED]

- Finance notifications: "Finance" badge in UX-05 finance accent colour (if defined) or default notification badge
- Uni notifications: "Uni" badge
- Cross-domain notifications (urgency > 0.8): no badge suppression — delivered with domain label
- Constitutional / governance notifications: "System" badge or governance icon — never suppressed regardless of domain context

### 9.5 The Anti-Pattern: Domain Shell Fragmentation

APEX must not create domain-specific shells, domain-specific layouts, or domain-specific navigation systems that replace the Command Centre. This is the fragmentation anti-pattern. [PROPOSED]

Examples of the anti-pattern (MUST NOT DO):
- "Finance Mode" that replaces the Command Centre with a Finance-specific layout
- Domain-specific navigation bars that replace the global navigation
- Domain-specific header / footer replacing the UX-06 header / footer
- Domain-specific colour theming that overrides the UX-05 design system

The correct pattern: ONE Command Centre. Domain context modifies content within the Command Centre. Domain cards on the World surface link INTO the Command Centre experience, not away from it.

---

## 10. PERSONALISATION INTEGRATION

The personalisation work (SUPPORTING UX WORK — see UX-10-RECONCILIATION-RECORD.md) provides preference models that interact with domain experiences in the following defined ways. Personalisation is subordinate to domain governance. [PROPOSED — references SUPPORTING UX WORK]

### 10.1 How Personalisation Applies Within Domain Experiences

| Personalisation Preference | Effect in Domain Experience | Constraints |
|---------------------------|----------------------------|-------------|
| `domain.expertiseLevel` per domain | Adapts disclosure level for domain content. Finance expertiseLevel: EXPERT → more detailed transaction data shown; NOVICE → simplified summaries. | Cannot change domain routing. Cannot change which agent is active. |
| `presentation.disclosureLevel` | Modulates default disclosure level for domain content within UX-08 pipeline. User preference for L2 default → domain content starts at L2. | Cannot suppress L4/L5 items regardless of preference. |
| `communication.verbosity` | Adapts length and density of domain summaries. CONCISE → "3 transactions pending review" not full transaction list. | Cannot prevent domain knowledge gaps from being surfaced. |
| `attention.notificationSuppression` | Domain notifications may be suppressed during Focus states. | Cannot suppress L4/L5 regardless. Cannot suppress constitutional items. |
| `domain.preferredVocabulary` | Adapts domain vocabulary to user preference (formal vs informal). Finance: "balance" vs "current funds." | Cannot override GBP quoting in Finance domain. |

### 10.2 Personalisation Subordination Rule

**PERSONALISATION IS SUBORDINATE TO DOMAIN GOVERNANCE.**

Explicitly: personalisation preferences cannot:
1. Change domain routing (which domain agent handles a query)
2. Change which domain is active
3. Override domain governance rules
4. Suppress domain constitutional items
5. Modify domain knowledge gap surfacing (gaps are always surfaced)
6. Override domain-specific invariants (GBP in Finance, module names in Uni)

If a personalisation preference conflicts with a domain governance rule, the domain governance rule takes precedence without exception.

---

## 11. KNOWLEDGE INTEGRATION

UX-10 defines how domain context interacts with the knowledge layer (to be fully designed in UX-11). Domain context scoping of knowledge is a forward reference to UX-11. UX-11 is NOT reopened here. [PROPOSED — forward reference to UX-11]

### 11.1 Domain Context and Knowledge Retrieval

- When Finance domain is active, knowledge retrieval prioritises finance-relevant knowledge (transaction categorisation, budget periods, financial instrument definitions, GBP rates).
- When Uni domain is active, knowledge retrieval prioritises education-relevant knowledge (module information, academic institution details, assignment brief content).
- Domain context is a retrieval scoping input, not a retrieval gate. Knowledge from other domains is not blocked — it is deprioritised in the ranking.

### 11.2 Domain Knowledge Gaps

- The Knowledge-Gap system (referenced as COMPLETE in project state) classifies knowledge gaps. Domain context is additive to existing gap classification.
- When Finance domain is active, knowledge gaps are surfaced with domain label: "No Finance data for Q3 2025 budget period."
- Domain context does not create new gap categories. It scopes gap surfacing to the active domain.
- Do NOT reopen the Knowledge-Gap system. Domain scoping is additive — a new field or tag in gap records.

### 11.3 UX-11 Gate

UX-11 KNOWLEDGE must not begin until UX-10 is explicitly completed. This constraint is documented in UX-10-RECONCILIATION-RECORD.md Section 6. The domain context model defined in UX-10 is a prerequisite input to UX-11 knowledge scoping architecture.

---

## 12. GOVERNANCE BOUNDARIES

The following boundaries define what domain experiences CANNOT do. These boundaries are absolute. No scenario, personalisation preference, or user request overrides them. [PROPOSED — inherits UX-01 governing principle, UX-08, UX-09, UX-16]

**GOVERNANCE BOUNDARY 1: Domain experiences cannot create domain-specific governance rules.**
Domain governance is the exclusive domain of the Civilisation Agent and UX-16 (System / Constitutional). UX-10 domain experiences operate within the existing constitutional hierarchy. No domain experience can introduce governance rules, override constitutional constraints, or modify the authority chain.

**GOVERNANCE BOUNDARY 2: Domain experiences cannot modify the Civilisation Agent's constitutional authority.**
The Civilisation Agent monitors all 10 domain health signals (DOM-000001 through DOM-000010). Domain experiences do not modify this monitoring, cannot disable it, and cannot alter the Civilisation Agent's response to constitutional signals.

**GOVERNANCE BOUNDARY 3: Domain experiences cannot suppress L4/L5 attention items regardless of domain relevance.**
If a Finance domain alert reaches L4 DECISION or L5 URGENT, it is surfaced regardless of the active domain context. If an Edu domain item reaches L5 URGENT while Finance domain is active, it is surfaced immediately. No domain context can suppress constitutional-level attention items.

**GOVERNANCE BOUNDARY 4: Domain experiences cannot change the governance hierarchy.**
The APEX governance hierarchy is: Identity → Ownership → Authority → Governance → Execution → Memory. This hierarchy is not modified by domain context. Domain experiences operate within the Execution layer and have no authority to modify layers above them.

**GOVERNANCE BOUNDARY 5: Domain experiences cannot make domain-specific memory a separate system.**
There is ONE memory system. Domain context tags memory records and scopes memory retrieval. It does not partition memory into domain-specific databases, domain-specific schemas, or domain-specific stores. Finance memory and Uni memory live in the same memory system with domain tags.

**GOVERNANCE BOUNDARY 6: Domain experiences cannot override the UX-05 visual design system.**
Finance domain does not get a Finance-specific visual system. All domain experiences use UX-05 design tokens, typography, spacing, and colour system. A domain accent colour may be used within UX-05's defined token system if UX-05 defines it. No domain introduces a new visual system.

**GOVERNANCE BOUNDARY 7: Domain experiences cannot create domain-specific authentication or identity.**
The user's identity is singular. There is no Finance identity, no Uni identity, no Business identity. Authentication is not domain-scoped. Domain switching does not require re-authentication.

**GOVERNANCE BOUNDARY 8: Domain experiences cannot elevate domain-inferred context to the level of explicit user action.**
detectDomain() produces an inference. This inference can activate domain context (IMPLICIT method) but it cannot take the place of explicit user intent for high-stakes actions. A detected Finance context does not authorise a financial action. Financial actions require explicit user approval regardless of how the Finance context was activated.

**GOVERNANCE BOUNDARY 9: Domain experiences cannot route around the canonical contextual presentation pipeline (UX-08).**
Domain content enters the UX-08 pipeline. Domain context modifies relevance scores within the pipeline. Domain experiences cannot produce a parallel presentation path that bypasses UX-08 scoring, disclosure levels, or attention engine evaluation.

**GOVERNANCE BOUNDARY 10: Domain experiences cannot route around the canonical proactive communication model (UX-09).**
Domain proactive triggers enter the UX-09 model. Domain context scopes trigger evaluation within the model. Domain experiences cannot produce proactive communications that bypass UX-09 delivery rules, suppression logic, or urgency evaluation.

---

## 13. TWENTY SCENARIOS

### V-DOMAIN-01: User Enters Finance Domain Context (Explicit Navigation)

**Trigger:** User clicks Finance domain card on the World surface.

**Initial state:**
- Domain context: null (global)
- Active agent: none (global)
- Command Centre: global state, input placeholder "Ask APEX…"

**Pipeline stages touched:** Stage 1 (EXPLICIT detection), Stage 2 (domain context set), Stage 4 (capability surface), Stage 5 (presentation with domain weights applied)

**APEX decision:** Detection method is EXPLICIT. Confidence 1.0. No confirmation required (no in-progress task). Domain context set immediately.

**UX shown to user:**
- Status bar updates: "Finance context" in primary text
- Input placeholder updates: "Ask Finance Agent…"
- Briefing refilters: Finance items move to top
- Domain entry summary (L2 proactive): "Finance context active. [N] recent transactions. Monthly budget at [X]%."
- Finance-relevant capabilities surfaced in capability panel

**Domain principles demonstrated:** ONE APEX — Command Centre unchanged; domain context is a lens within it. EXPLICIT detection is highest priority. Domain entry summary via UX-09 proactive model.

**Outcome:** User is in Finance domain context with Finance Agent active. Finance data is foregrounded. Global capabilities remain available.

---

### V-DOMAIN-02: APEX Recognises Finance Domain from Message

**Trigger:** User types "how much did I spend on food this month?"

**Initial state:**
- Domain context: null (global)
- No prior explicit domain navigation

**Pipeline stages touched:** Stage 1 (IMPLICIT detection via detectDomain()), Stage 2 (domain context set, implicit), Stage 5 (Finance Agent invoked), Stage 7 (agent invocation with finance data)

**APEX decision:** detectDomain() matches finance keywords. IMPLICIT detection. Confidence ~0.85. Global context was active — no conflict. Domain context set to Finance (implicit). Finance Agent invoked.

**UX shown to user:**
- Status bar updates subtly: "Finance context" in secondary text (implicit indicator)
- Finance Agent processes query against transaction data
- Response: "This month you've spent £[X] on food across [N] transactions. Your food budget is [Y]% used."
- GBP figures used (Finance domain voice rule)
- No confirmation dialogue (implicit, no in-progress task)

**Domain principles demonstrated:** detectDomain() observed production behaviour [OBSERVED]. Implicit detection activates domain without disruption. Finance Agent provides domain-specific response. GBP quoting rule applied.

**Outcome:** Finance query answered with Finance Agent and Finance data. Finance domain context now active (implicit).

---

### V-DOMAIN-03: Command Centre Adapts to Finance Domain

**Trigger:** Finance domain becomes active (via V-DOMAIN-01 or V-DOMAIN-02).

**Initial state:**
- Finance domain active
- Command Centre in prior global state

**Pipeline stages touched:** Stage 4 (capability surface), Stage 5 (presentation with domain weights — briefing refilter)

**APEX decision:** Finance domain active. Update all Command Centre domain-sensitive surfaces.

**UX shown to user:**
- Input zone placeholder: "Ask Finance Agent…"
- Status bar: "Finance context" indicator
- Briefing: Finance items at top (budget status, recent transactions, pending review). Non-finance items below with lower relevance rank. No items removed.
- Notification area: Finance notifications (if any) with Finance badge
- Capability panel: Budget creation, transaction review, CSV import, spending analysis surfaced as primary actions

**Domain principles demonstrated:** Command Centre is the ONE universal shell — not replaced, adapted. UX-08 domain relevance weights applied to briefing. UX-05 design tokens maintained — no Finance-specific visual system.

**Outcome:** Command Centre reflects Finance context. User can immediately access Finance capabilities without navigating away.

---

### V-DOMAIN-04: Finance Agent Surfaces Relevant Transaction Data

**Trigger:** User in Finance context asks "show me my transactions from last week."

**Initial state:**
- Finance domain active (explicit or implicit)
- Finance Agent active
- Transaction data available via finance_agent.js [OBSERVED]

**Pipeline stages touched:** Stage 6 (user interaction), Stage 7 (Finance Agent invocation), Stage 5 (presentation of agent response at appropriate disclosure level), Stage 8 (memory update)

**APEX decision:** Finance Agent invoked via invokeDomainAgent('finance', ...) [OBSERVED production pattern]. Agent queries transaction data. Response prepared with transaction categorisation.

**UX shown to user:**
- Transaction list surfaced at L2 (operational)
- Categorised by finance_agent.js categories: food, transport, housing, entertainment, etc. [OBSERVED]
- Spending summary: "Last week: £[X] total. £[Y] food, £[Z] transport."
- Notable items (unusual amounts) flagged at L3
- Finance Agent attribution visible

**Domain principles demonstrated:** Finance Agent [OBSERVED production agent] surfaces domain data. UX-08 pipeline applied — transactions at L2, anomalies at L3. Finance data surfaced in UX, not just answered via conversation.

**Outcome:** User sees structured Finance data surfaced through the UX-08 pipeline within the Command Centre. Finance Agent is visibly attributed.

---

### V-DOMAIN-05: Cross-Domain Noise Suppressed in Finance Context

**Trigger:** Finance domain is active. A Uni assignment deadline exists that would normally appear in the briefing.

**Initial state:**
- Finance domain active
- Uni assignment deadline: 4 days away (urgency ~0.5 — L2/L3 in global context)

**Pipeline stages touched:** Stage 3 (relevance filter applies cross-domain penalty), Stage 5 (presentation — Uni item deprioritised)

**APEX decision:** UX-08 domain relevance filter applied. Uni item receives -0.10 relevance modifier. Finance domain active → Finance items receive +0.15. Uni deadline urgency 0.5 < 0.8 threshold → queued in cross-domain queue, not surfaced immediately.

**UX shown to user:**
- Finance briefing items appear at top
- Uni deadline does NOT appear at top of briefing
- Uni deadline is visible if user scrolls below Finance items ("More from Uni")
- Uni deadline is NOT deleted or hidden entirely — it is deprioritised
- If Uni deadline urgency rises to > 0.8: surfaces immediately regardless of Finance domain

**Domain principles demonstrated:** Cross-domain noise deprioritised [PROPOSED]. Items not suppressed — ordering only. Urgency override rule (> 0.8) preserves safety. UX-08 domain weight rules applied correctly.

**Outcome:** User in Finance context sees Finance content first without cross-domain noise. Uni deadline is accessible but not interrupting. System is respectful of domain focus without dangerous suppression.

---

### V-DOMAIN-06: Finance Knowledge Gap Surfaced

**Trigger:** User in Finance context asks "what was my Q3 2025 budget performance?"

**Initial state:**
- Finance domain active
- Q3 2025 budget data: not present in Finance data store

**Pipeline stages touched:** Stage 7 (Finance Agent invocation — data not found), Stage 5 (knowledge gap surfaced at L3 ATTENTION)

**APEX decision:** Finance Agent queries budget data for Q3 2025. Data not found. Knowledge gap identified. Gap surfaced to user — not concealed.

**UX shown to user:**
- Gap item at L3 ATTENTION: "No Finance data for Q3 2025 budget period."
- Explanation: "Budget records for July–September 2025 are not available. This may be due to [data not imported / records not created]."
- Suggested action: "Import Q3 2025 transactions?" (domain-specific action, L2)
- Finance domain label on gap item

**Domain principles demonstrated:** Knowledge gaps are not concealed [INV-DOMAIN-15]. Domain knowledge gap surfaced with domain label. Domain scoping of gap (Finance Q3 2025, not a global gap). Suggested action is domain-specific and appropriate.

**Outcome:** User learns about the Finance knowledge gap. APEX does not fabricate Q3 2025 data. Gap is surfaced clearly with recovery path.

---

### V-DOMAIN-07: Finance Intelligence — Spending Trend

**Trigger:** Finance domain active. APEX attention engine detects that end-of-month spending data is now available and a trend is notable.

**Initial state:**
- Finance domain active
- End-of-month transaction data complete
- Spending trend: food spending +28% vs prior month (notable)

**Pipeline stages touched:** Stage 5 (domain proactive trigger — Finance trend detected), Stage 5 (UX-08 presentation at L3 ATTENTION)

**APEX decision:** Finance domain active → domain intelligence trigger evaluated. Spending trend +28% exceeds domain intelligence threshold. Surfaced as L3 ATTENTION (notable insight, not a decision required).

**UX shown to user:**
- L3 ATTENTION item in briefing: "Spending insight: Food spending up 28% this month (£[X] vs £[Y] last month)."
- Breakdown option available at L2: categorised spend comparison
- No action required — informational. User may dismiss.
- Finance badge on item.

**Domain principles demonstrated:** Domain intelligence surfaces via UX-09 proactive model (not a parallel system). UX-08 disclosure level applied (L3, not L4 — informational, no decision required). Domain context enables relevant intelligence to surface (would not surface in global context with same urgency).

**Outcome:** User receives domain-relevant spending intelligence without being asked to act. Intelligence is surfaced at appropriate disclosure level.

---

### V-DOMAIN-08: Finance Agent Surfaced as Domain-Relevant Agent

**Trigger:** Finance domain context active. User opens capability panel.

**Initial state:**
- Finance domain active (explicit)
- Finance Agent available [OBSERVED in domain-agents.js]

**Pipeline stages touched:** Stage 4 (capability surface — Finance Agent identified as primary)

**APEX decision:** Finance domain active → Finance Agent is primary agent. Surfaced in capability panel with label and description.

**UX shown to user:**
- Capability panel shows: "Finance Agent" as primary agent with description ("Manages transactions, budgets, financial analysis")
- Finance Agent: ACTIVE badge
- Domain-specific capabilities listed: "Review transactions", "Create budget", "Analyse spending", "Import CSV"
- Other agents accessible but not primary (accessible via agent list, not capability panel front page)

**Domain principles demonstrated:** Domain agent activation [OBSERVED production routing; PROPOSED UX surfacing]. ONE APEX — other agents not hidden, just not primary. Agent attribution visible to user (gap closed from GAP-03).

**Outcome:** User knows Finance Agent is active. Finance capabilities are immediately accessible. Other agents remain accessible.

---

### V-DOMAIN-09: Finance Action Proposed — Create Budget

**Trigger:** Finance domain active. User has reviewed November expenses but no November budget exists.

**Initial state:**
- Finance domain active
- Finance Agent: no November budget found
- User has been reviewing October budget

**Pipeline stages touched:** Stage 5 (domain proactive action surfaced at L2), Stage 6 (user decides to act or defer)

**APEX decision:** Finance Agent context: budget for next month missing. Proactive action proposal appropriate. Urgency ~0.4 → L2 operational suggestion, not L4 decision (budget creation is low-stakes, reversible).

**UX shown to user:**
- L2 suggestion in briefing: "No November budget set. Create one based on October actuals?"
- Action button: "Create budget" — one tap / one click
- If tapped: Finance Agent scaffolds budget from October data, presents for review
- Dismissable — no urgency

**Domain principles demonstrated:** Domain proactive action proposal via UX-09 [PROPOSED]. L2 disclosure for low-stakes reversible action. One-tap affordance for domain-specific action. Not L4 — no approval required (budget creation is not a financial transaction).

**Outcome:** User is proactively offered relevant Finance action. Low friction. Budget creation initiated with domain agent context.

---

### V-DOMAIN-10: Finance Action Requiring Approval — Transfer to Savings

**Trigger:** User in Finance context says "transfer £500 to my savings account."

**Initial state:**
- Finance domain active
- User has requested a financial transaction (irreversible, significant)

**Pipeline stages touched:** Stage 6 (user intent: financial transaction), Stage 7 (Finance Agent: action flagged as L4 DECISION — irreversible, financial), Stage 5 (L4 DECISION item surfaced)

**APEX decision:** Financial transfer is an irreversible action with direct financial consequence. Approval model (UX-14) applies. L4 DECISION surfaced. Finance Agent does not execute transfer without explicit approval.

**UX shown to user:**
- L4 DECISION item: "Transfer £500 to savings account — [Account name]?"
- Clear confirmation: Amount, source account, destination account
- Approval required: "Confirm" / "Cancel"
- If confirmed: Finance Agent executes transfer (or initiates transfer workflow)
- If cancelled: Action abandoned. No transfer. No partial state.

**Domain principles demonstrated:** Approval model (UX-14) applies in Finance domain. L4 cannot be suppressed by domain context. Finance domain does not grant elevated execution authority. GOVERNANCE BOUNDARY 8: inferred Finance context does not authorise financial action — explicit approval required.

**Outcome:** Transfer requires explicit user approval. APEX does not execute financial actions without confirmation. Domain context does not bypass the approval model.

---

### V-DOMAIN-11: User Switches from Finance to Uni Domain

**Trigger:** User navigates to Uni domain card on World surface while Finance domain is active.

**Initial state:**
- Finance domain active (explicit)
- No in-progress Finance task
- Uni domain: assignment due in 3 days

**Pipeline stages touched:** Stage 1 (EXPLICIT Uni detection), Stage 2 (Finance context archived, Uni context set), Stage 4 (Uni capabilities surfaced), Stage 5 (Uni briefing filtered)

**APEX decision:** EXPLICIT switch. No in-progress Finance task. Immediate switch. No confirmation required.

**UX shown to user:**
- Status bar: "Finance context" → "Uni context"
- Input placeholder: "Ask Finance Agent…" → "Ask Uni Agent…"
- Briefing: Uni items at top — assignment due in 3 days at L3 ATTENTION
- Uni domain entry summary (L2 proactive): "Uni context active. Assignment due in 3 days: [module name]. Reading list: [N] items pending."
- Finance domain archived to history

**Domain principles demonstrated:** EXPLICIT switch executes immediately. Domain switch preserves memory (Finance memory not lost). Uni entry summary via UX-09 proactive model. Command Centre adapts — not replaced.

**Outcome:** User is now in Uni domain context with Uni Agent active and Uni priorities surfaced. Finance context is accessible via World surface if needed.

---

### V-DOMAIN-12: Finance Task Preserved as Pending During Uni Domain

**Trigger:** User is reviewing a Finance transaction (in-progress task) and navigates to Uni domain.

**Initial state:**
- Finance domain active (explicit)
- In-progress task: "Review October transactions — 3 uncategorised items remain"

**Pipeline stages touched:** Stage 1 (EXPLICIT Uni navigation), Stage 2 (confirmation dialogue — in-progress task), Stage 2 (Finance task moved to pendingTasks[])

**APEX decision:** EXPLICIT switch with in-progress Finance task. Confirmation required (Section 8.2 SCENARIO B). APEX surfaces confirmation. User confirms. Finance task moved to pendingTasks[].

**UX shown to user:**
- Confirmation: "You have an uncompleted Finance task (3 uncategorised transactions). Switch to Uni and defer to pending?" — Confirm / Cancel
- User confirms
- Pending badge: Finance icon + "1 pending" in Command Centre
- Uni domain activated
- On return to Finance context: pending task resurfaced automatically

**Domain principles demonstrated:** In-progress task preservation [INV-DOMAIN-08]. Confirmation required for switch with in-progress task. Pending task persists in pendingTasks[]. User is not surprised by lost context.

**Outcome:** Finance task preserved. User completes Uni session. On Finance return, task is waiting.

---

### V-DOMAIN-13: Cross-Domain Query Answered Without Context Switch

**Trigger:** Finance domain active (explicit). User asks "is my business insurance payment coming from my personal account or the business account?"

**Initial state:**
- Finance domain active (explicit)
- Query spans Finance + Business domains

**Pipeline stages touched:** Stage 1 (detectDomain() may return 'business' — conflicts with EXPLICIT Finance context), Stage 2 (no switch — EXPLICIT > IMPLICIT), Stage 7 (query answered using both Finance and Business data context), Stage 5 (cross-domain response attributed)

**APEX decision:** detectDomain() detects 'business' from "business" keyword. Active domain is EXPLICIT Finance. Rule: EXPLICIT > IMPLICIT — no switch. Route query to Finance Agent with Business context for that message only. Response attributes both contexts.

**UX shown to user:**
- Response: "Your business insurance payment of £[X] is scheduled from your [account type] account — [account name]. [Business Agent context: this is categorised as a Business expense in your business accounts.]"
- Dual attribution: Finance Agent + Business context
- Active domain: still Finance (status bar unchanged)

**Domain principles demonstrated:** EXPLICIT > IMPLICIT rule [INV-DOMAIN-05]. Cross-domain query answered without switch [Section 8.2 SCENARIO E]. ONE APEX answers across domains without fragmenting. Finance context preserved for user's ongoing session.

**Outcome:** Cross-domain query answered correctly. Finance domain context preserved. No disruptive domain switch. User gets the answer without losing their Finance session state.

---

### V-DOMAIN-14: Finance Domain UX Uses UX-05 Tokens Only

**Trigger:** Finance domain is active. Domain presentation is rendered.

**Initial state:**
- Finance domain active
- Design: Finance domain presentation must be rendered

**Pipeline stages touched:** Stage 5 (presentation rendered using UX-05 design system exclusively)

**APEX decision:** Finance domain context provides no new visual tokens. All presentation uses UX-05 design token set. Finance domain indicator may use a UX-05 defined accent if the token exists in UX-05. No Finance-specific colour system introduced.

**UX shown to user:**
- Finance domain presentation: UX-05 typography, spacing, colours
- Domain context indicator: UX-05 secondary text token for "Finance context" label
- Transaction amounts: UX-05 monospace token (if defined) for financial figures
- Finance badge on notifications: UX-05 badge component with label text "Finance"
- No custom Finance green / Finance blue / Finance-specific design system

**Domain principles demonstrated:** GOVERNANCE BOUNDARY 6 — domain experiences cannot override UX-05. ONE visual system. Domain differentiation is contextual (content, labels, agent attribution) — not visual (separate design system).

**Outcome:** Finance domain experience is visually consistent with all other APEX surfaces. The design system is not fragmented by domain.

---

### V-DOMAIN-15: Finance Domain Content Enters UX-08 Pipeline

**Trigger:** Finance Agent returns a response with transaction data.

**Initial state:**
- Finance domain active
- Finance Agent response: transaction list, budget summary, one anomalous transaction

**Pipeline stages touched:** Stage 5 (Finance Agent response enters UX-08 pipeline — not a bypass)

**APEX decision:** Finance Agent response is content. It enters the UX-08 contextual presentation pipeline. Attention scoring applied. Disclosure levels assigned: routine transactions → L2, budget summary → L2, anomalous transaction → L3.

**UX shown to user:**
- L2: Transaction list (routine operational data)
- L2: Budget summary ("£X remaining of £Y monthly budget")
- L3: Anomalous transaction flagged ("£340 uncategorised transaction on 24 Aug — unusual for this period")
- L5 would be used only if a fraud-level anomaly is detected

**Domain principles demonstrated:** GOVERNANCE BOUNDARY 9 — Finance content does not bypass UX-08 [INV-DOMAIN-10]. UX-08 disclosure levels applied to Finance content. Domain relevance boost applied (+0.15) within the pipeline — not instead of it.

**Outcome:** Finance content is presented at appropriate disclosure levels. UX-08 pipeline integrity maintained. Anomalies are appropriately elevated within the pipeline, not bypassed.

---

### V-DOMAIN-16: Uni Deadline Triggers UX-09 Proactive Communication

**Trigger:** Uni domain active. An assignment deadline is now 48 hours away (urgency 0.75 — L3 ATTENTION threshold reached).

**Initial state:**
- Uni domain active
- Assignment: "CS401 Essay" due in 48 hours
- Prior proactive item: delivered 7 days ago (low urgency)

**Pipeline stages touched:** Stage 5 (UX-09 domain proactive trigger evaluated — Uni domain active, deadline urgency threshold reached)

**APEX decision:** Uni domain active → Uni deadline trigger evaluated. Urgency 0.75 reaches L3 threshold. Proactive item delivered. Enter UX-09 delivery pipeline.

**UX shown to user:**
- L3 ATTENTION proactive item: "CS401 Essay due in 48 hours. Submission portal: [link if known]."
- Uni badge on item
- Optional action: "Set reminder for 24 hours before submission?"
- Delivered in briefing, not as a disruptive interrupt (urgency 0.75 < 0.8 interrupt threshold)

**Domain principles demonstrated:** Domain proactive trigger enters UX-09 model [INV-DOMAIN-11]. Uni domain active → Uni triggers evaluated immediately. Disclosure level appropriate (L3). Voice delivery would use Uni vocabulary ("CS401 Essay due in two days").

**Outcome:** User receives timely deadline reminder scoped to Uni domain. UX-09 model handles delivery and suppression rules. Domain context ensures Uni-relevant language.

---

### V-DOMAIN-17: Personalisation Adapts Finance Presentation Without Changing Governance

**Trigger:** Finance domain active. User has personalisation preference: `communication.verbosity = CONCISE`.

**Initial state:**
- Finance domain active
- User preference: CONCISE verbosity
- Finance data available: 47 transactions, monthly budget status

**Pipeline stages touched:** Stage 5 (UX-08 pipeline — personalisation preference applied to Finance content rendering), Stage 5 (presentation density modulated)

**APEX decision:** Personalisation preference CONCISE applied within Finance domain presentation. Reduces transaction list verbosity. Budget summary condensed. Governance not affected.

**UX shown to user:**
- Budget summary (CONCISE): "Budget: 67% used (£1,340 of £2,000)" — not a paragraph explanation
- Transaction list: "47 transactions this month. 3 require review." — not the full list unless expanded
- Knowledge gaps still surfaced (personalisation cannot suppress gaps)
- L4 Finance alert still shown in full (personalisation cannot suppress L4)

**Domain principles demonstrated:** Personalisation is subordinate to domain governance [Section 10.2, INV-DOMAIN-17]. CONCISE preference adapts presentation density but does not change agent routing, governance, or gap surfacing. Finance governance (L4 always shown) is not overridden.

**Outcome:** User gets concise Finance summaries per their preference. Governance boundaries are maintained. Domain experience is personalised within the bounds of domain governance.

---

### V-DOMAIN-18: Voice in Finance Domain — Balance Query

**Trigger:** Finance domain active. User activates voice (LISTENING state) and says "What's my balance?"

**Initial state:**
- Finance domain active
- Finance Agent active
- Voice: INACTIVE → LISTENING

**Pipeline stages touched:** Stage 1 (voice intent: balance query in Finance context), Stage 7 (Finance Agent invoked with voice context), Stage 5 (response via SPEAKING state with GBP figures), Stage 8 (voice session memory update)

**APEX decision:** Finance domain active. Voice query classified as Finance balance request. Finance Agent invoked. Response prepared with GBP figures (Finance domain voice rule). Voice transitions: LISTENING → THINKING → SPEAKING.

**UX shown to user (heard):**
- "Your current balance is £2,340 across your main accounts. Savings: £1,200. Current: £1,140."
- Figures spoken in GBP (£) — domain voice rule enforced
- Module-style: concise and direct (matches user verbosity preference if CONCISE)

**Voice state transitions:**
- INACTIVE → LISTENING (user activates voice)
- LISTENING → THINKING (query captured, Finance Agent processing)
- THINKING → SPEAKING (response delivered)
- SPEAKING → AMBIENT (session continues)

**Domain principles demonstrated:** Finance domain voice rule: GBP always [INV-DOMAIN-19]. Voice state machine unchanged (UX-07). Domain context provides Finance vocabulary. Finance Agent [OBSERVED] provides balance data. Voice experience is domain-contextual, not domain-separate.

**Outcome:** User receives balance query response in Finance-appropriate voice format. GBP figures used. Voice state machine intact.

---

### V-DOMAIN-19: Cross-Domain Item — Client Meeting with Finance Implications

**Trigger:** A calendar event exists: "Meeting with Client: Riverside Design — discuss Q4 invoice." This is a Business + Finance cross-domain item.

**Initial state:**
- Finance domain active (explicit)
- Calendar event: tomorrow, 14:00, involves a client (Business) and an invoice (Finance)

**Pipeline stages touched:** Stage 3 (relevance filter: Finance domain active — Finance aspect of event gets +0.15; Business aspect gets -0.10 but Finance net is positive), Stage 5 (event surfaced with dual-domain attribution)

**APEX decision:** Calendar event has both Finance (invoice) and Business (client) aspects. Finance domain active. Finance relevance (+0.15 for invoice aspect) > Business deprioritisation (-0.10 for business meeting aspect). Event surfaced with Finance relevance. Business context noted.

**UX shown to user:**
- Briefing item at L2: "Tomorrow 14:00 — Riverside Design client meeting. Finance context: Q4 invoice to discuss (£[amount] if known)."
- Dual attribution: Business event + Finance context
- Finance badge (primary, since Finance domain active)
- Business badge (secondary)
- Active domain unchanged: Finance

**Domain principles demonstrated:** Cross-domain item represented correctly [Section 8.2 SCENARIO E]. Finance aspect foregrounded (Finance domain active). Business aspect preserved and attributed. ONE APEX — single event, dual-domain labelling, one interface.

**Outcome:** User sees the client meeting with appropriate Finance context foregrounded. Business context not lost. Event is not duplicated into two separate domain items.

---

### V-DOMAIN-20: Finance Domain Uses Canonical Memory — Not Separate Database

**Trigger:** Finance domain session complete. User has reviewed transactions, created a budget, and received Finance proactive items.

**Initial state:**
- Finance domain active throughout session
- Finance interactions: transaction review, budget creation, spending analysis

**Pipeline stages touched:** Stage 8 (domain memory update — all interactions written to shared memory with domain tags)

**APEX decision:** Finance session data written to the shared APEX memory system. Finance tag applied to all Finance records. No Finance-specific database. No Finance-specific schema partition.

**UX shown to user:**
- Session end: no visible difference from global memory write
- Next Finance session: Finance-tagged memory records surfaced first in Finance context
- Accessing Finance memory from Uni context: Finance records still accessible (shared memory), just not foregrounded

**Technical verification (design-level):**
- Memory write: `{ domain: 'finance', type: 'budget', period: 'November 2026', ...data }`
- Memory retrieval in Finance context: filter by `domain: 'finance'` for foreground; all records still accessible
- Memory retrieval in global context: all records accessible, domain tag used for sorting
- No separate Finance database, Finance schema, Finance memory store

**Domain principles demonstrated:** ONE memory system [INV-DOMAIN-04, INV-DOMAIN-20]. GOVERNANCE BOUNDARY 5: domain-specific memory is not a separate system. Domain context is a tag, not a partition. Finance memory is accessible from any domain context.

**Outcome:** Finance session memory is correctly written to the shared memory system with domain tags. No database fragmentation. Finance memory accessible in any context.

---

## 14. PROTOTYPE ARCHITECTURE

The canonical UX-10 prototype is `docs/interface/prototype/apex-domain-prototype.html`. [PROPOSED]

### 14.1 Purpose

The apex-domain-prototype.html prototype demonstrates the domain experience model defined in UX-10. It is a visual, interactive prototype only — it does not connect to production backend systems, does not call detectDomain(), and does not invoke real domain agents.

### 14.2 Prototype Scope

The prototype demonstrates:

1. **The Command Centre with domain context indicator** — Status bar showing active domain (Finance / Uni / Business / Global). Domain indicator updates on navigation.

2. **The World surface with domain cards** — Navigable domain cards for Finance, Education, Business, Operations, File/Knowledge. Health domain card shown as "Not available" (gap acknowledged). Clicking a domain card activates that domain context.

3. **Domain context activation** — Switching between domains updates: status bar, input placeholder, briefing content, capability panel, agent attribution.

4. **Domain-filtered briefing** — Demonstration of Finance items at top in Finance context, Uni items in Uni context. Cross-domain items visible below, labelled.

5. **Domain capability panel** — Per-domain capability list: Finance capabilities (transaction review, budget, CSV), Uni capabilities (assignment, deadline, reading list), etc.

6. **Domain agent attribution** — Agent identifier visible per domain. "Finance Agent" / "Uni Agent" / "Business Agent" / "System Agent" / "File Agent."

7. **Domain switching** — Explicit switch via World surface navigation. In-progress task warning demonstration.

8. **Cross-domain query demonstration** — Example cross-domain response with dual attribution.

9. **Domain knowledge gap demonstration** — Finance Q3 gap shown at L3 ATTENTION.

10. **Personalisation within domain** — Toggle between STANDARD and CONCISE verbosity within Finance domain — demonstrates personalisation subordination (L4 items unchanged).

### 14.3 Prototype Constraints

- Uses UX-05 design tokens and visual system exclusively. No Finance-specific visual design.
- Uses static mock data — no production API calls.
- Demonstrates UX model only. Not a production implementation.
- All scenarios in Section 13 should be demonstrable via prototype states.

---

## 15. IMPLEMENTATION RECOMMENDATIONS

The following recommendations are provided for production implementation of the UX-10 domain experience model. These are design-level recommendations only. Production implementation is out of scope for UX-10. [PROPOSED]

**REC-01: Surface domain context in the interface status bar.**
Add a domain context indicator to the Command Centre status bar. Read the domain slug from the existing detectDomain() call in server.js. Expose it to the frontend via the existing WebSocket or HTTP response. Zero new backend logic required — domain slug already computed [OBSERVED].

**REC-02: Update Command Centre input placeholder by domain.**
On domain context change, update the input zone placeholder text to reflect the active domain agent. Requires: frontend domain context state, placeholder template per domain slug.

**REC-03: Add domain attribution to chat responses.**
Include the domain agent slug in the API response from invokeDomainAgent(). Display "Finance Agent" / "Uni Agent" in the response attribution. Closes GAP-03.

**REC-04: Implement domain-aware briefing filtering.**
Apply domain relevance weights to briefing items in the frontend. Requires: domain context state in frontend, UX-08 relevance score access, domain tag on content items. Finance items move to top in Finance context.

**REC-05: Implement domain context object in frontend state.**
Create a frontend domain context state object matching the specification in Section 6.3. Populated from backend detectDomain() responses and explicit navigation events. Used to drive all domain-sensitive UI updates.

**REC-06: Implement World surface domain navigation.**
Build the World surface with domain cards as specified in UX-03. Link domain card click to EXPLICIT domain context activation. This is the highest-priority navigation gap (GAP-02).

**REC-07: Implement domain switching confirmation model.**
Add in-progress task tracking to frontend state. On domain switch with in-progress task, surface confirmation dialogue as specified in Section 8.2 SCENARIO B. Add pendingTasks[] to domain context object.

**REC-08: Add domain-specific proactive trigger evaluation.**
Extend the UX-09 proactive model with domain context scoping. Finance proactive triggers evaluated on Finance domain entry. Uni deadline triggers evaluated on Uni domain entry. Requires: domain context event (domain activated) → trigger evaluation callback.

**REC-09: Add Finance domain panel to dashboard.**
Create a Finance domain panel surfacing transaction summary, budget status, and pending review items. Closes GAP-10. Feeds from existing finance_agent.js data [OBSERVED]. Panel renders within Command Centre / World surface — not as a separate application.

**REC-10: Implement cross-domain query handling.**
Add conflict detection to the routing layer: when detectDomain() returns a domain that differs from the active EXPLICIT domain, route the message to the detected domain's agent for that message only without switching context. Return dual-attributed response.

**REC-11: Document and plan Health domain implementation.**
Open a formal gap ticket for Health domain. Define: Health Agent architecture (UX-13), Health domain detection keywords (lib/server-utils.js:detectDomain()), Health data sources. Health domain UX panel design. This is the most significant domain gap [OPEN].

**REC-12: Add domain tag to memory writes.**
Include `domain` field in all memory write operations. Value: active domain slug or null for global. Enables domain-scoped memory retrieval in future UX-15 implementation. Zero breaking changes to memory schema — additive field only.

**REC-13: Add Civilisation domain observability for users.**
Surface a read-only governance status indicator for users who want visibility into constitutional monitoring. Not navigable, not configurable. Status-only. Closes GAP-11 partially.

**REC-14: Implement domain-specific voice vocabulary update.**
On domain activation, update the voice system prompt (injected into voice agent context) with domain-specific vocabulary and rules (GBP in Finance, module names in Uni). This may already be partially implemented via domain-agents.js system prompts [OBSERVED] — verify and complete.

**REC-15: Add urgency-override for cross-domain proactive items.**
Implement the urgency > 0.8 override rule: cross-domain proactive items with urgency > 0.8 bypass domain queue and surface immediately regardless of active domain. Prevents dangerous suppression of high-urgency items.

---

## 16. FILES CREATED / PRESERVED / UNTOUCHED

| File | Status | Notes |
|------|--------|-------|
| `docs/interface/UX-10-DOMAIN-EXPERIENCES.md` | CREATED | This file. Canonical UX-10 phase documentation. |
| `docs/interface/UX-10-RECONCILIATION-RECORD.md` | CREATED | Permanent reconciliation audit record. Do not delete. |
| `docs/interface/prototype/apex-domain-prototype.html` | TO BE CREATED | Canonical UX-10 prototype. See Section 14. |
| `docs/interface/UX-10-PERSONALISATION-AND-USER-ADAPTATION.md` | PRESERVED INTACT | SUPPORTING UX WORK — HISTORICAL. Not modified. Not canonical UX-10. 1,139 lines. |
| `docs/interface/prototype/apex-personal-prototype.html` | PRESERVED INTACT | SUPPORTING UX WORK — HISTORICAL. Not modified. 2,131 lines. |
| All UX-05 through UX-09 docs | PRESERVED INTACT | Prior UX phase documentation. Not modified. Authoritative inputs to UX-10. |
| All prior UX-00 through UX-04 docs | PRESERVED INTACT | Prior UX phase documentation. Not modified. |
| All prior prototypes (UX-06, UX-07, UX-08, UX-09) | PRESERVED INTACT | Canonical prototypes for prior phases. Not modified. |
| `server.js` | UNTOUCHED | Production file. Not modified by UX-10. |
| `dashboard.html` | UNTOUCHED | Production file. Not modified by UX-10. |
| `lib/server-utils.js` | UNTOUCHED | Production file. detectDomain() not modified. |
| `agent-system/domain-agents.js` | UNTOUCHED | Production file. Not modified by UX-10. |
| `agent-system/finance_agent.js` | UNTOUCHED | Production file. Not modified by UX-10. |
| All other `lib/*` files | UNTOUCHED | Production files. Not modified by UX-10. |
| All other `agent-system/*` files | UNTOUCHED | Production files. Not modified by UX-10. |

---

## 17. INVARIANTS

The following invariants govern the UX-10 Domain Experience model. They are permanent constraints. No scenario, preference, or implementation detail overrides them.

**INV-DOMAIN-01: ONE APEX — domains do not create parallel kernels.**
There is exactly one APEX kernel. Domains are contextual lenses applied to this kernel. A domain cannot instantiate a separate APEX instance, a separate governance system, or a separate platform kernel.

**INV-DOMAIN-02: Domain context does not override constitutional guardrails.**
L4 DECISION and L5 URGENT items are surfaced in all domain contexts. A domain context cannot suppress, delay, or reclassify constitutional-level attention items.

**INV-DOMAIN-03: detectDomain() output is advisory, not authoritative.**
The output of detectDomain() is an IMPLICIT detection signal with confidence < 1.0. It activates domain context but does not grant authorisation for domain-specific actions. Authorisation for actions requires explicit user approval (UX-14) regardless of domain detection confidence.

**INV-DOMAIN-04: Domain switch preserves in-progress global tasks.**
On domain switch, in-progress tasks are moved to pendingTasks[] and preserved in the domain context state object. No task is silently abandoned on domain switch.

**INV-DOMAIN-05: EXPLICIT detection always overrides IMPLICIT detection.**
A user's explicit navigation to a domain (World surface click, voice command) is always higher priority than a detectDomain() keyword match. An IMPLICIT detection for a different domain does not override an active EXPLICIT domain context.

**INV-DOMAIN-06: All domain content enters the canonical UX-08 pipeline.**
Domain content produced by domain agents, domain knowledge retrieval, or domain proactive triggers always enters the UX-08 contextual presentation pipeline. Domain content does not have a parallel presentation path.

**INV-DOMAIN-07: Domain-specific proactive communication enters the canonical UX-09 model.**
Domain proactive triggers are evaluated within the UX-09 proactive communication model. Domain context scopes trigger evaluation within the model. There is no parallel domain proactive system.

**INV-DOMAIN-08: In-progress tasks survive domain switches.**
A task marked as in-progress is not lost on domain switch. It is preserved in pendingTasks[] and resurfaced on return to the originating domain or on explicit review.

**INV-DOMAIN-09: Domain voice operates within the 11 UX-07 voice states.**
The voice state machine (INACTIVE, LISTENING, SPEAKING, THINKING, AMBIENT, ERROR, INTERRUPTION, DOMAIN_SWITCH, TASK_COMPLETE, PROACTIVE, SLEEPING) is not modified by domain context. Domain context adds vocabulary and content to states — it does not add or remove states.

**INV-DOMAIN-10: Domain presentation uses UX-05 design tokens exclusively.**
No domain introduces a domain-specific visual design system, domain-specific colour palette, domain-specific typography system, or domain-specific spacing system. All domain presentation uses UX-05 tokens.

**INV-DOMAIN-11: Personalisation is subordinate to domain governance.**
Personalisation preferences (verbosity, disclosure level, attention suppression) are applied within domain governance constraints. A personalisation preference cannot suppress governance-level items, change domain routing, or override domain invariants.

**INV-DOMAIN-12: Health domain gap is documented, not fabricated.**
The absence of a Health domain in production is documented as a gap. UX-10 does not design a Health Agent, does not fabricate Health data, and does not propose a Health domain implementation without the prerequisite agent architecture (UX-13).

**INV-DOMAIN-13: Cross-domain content is deprioritised, never suppressed.**
When Finance domain is active, Uni content receives -0.10 relevance modifier. It is not hidden, deleted, or suppressed. Users can always access cross-domain content. Only ordering is affected.

**INV-DOMAIN-14: Cross-domain items with urgency > 0.8 are not deprioritised.**
Regardless of active domain, any content item with urgency > 0.8 is surfaced immediately. Domain context cannot cause a high-urgency item from another domain to be queued or deferred.

**INV-DOMAIN-15: Domain knowledge gaps are always surfaced.**
When Finance domain data is unavailable for a requested period, the gap is surfaced to the user at L3 ATTENTION. Gaps are not concealed, not fabricated around, and not silently omitted.

**INV-DOMAIN-16: The Civilisation Agent is not user-navigable.**
The Civilisation Agent operates internally. Users cannot navigate to a "Civilisation domain" via the World surface. The Civilisation Agent's governance output surfaces via constitutional notifications, not via domain navigation.

**INV-DOMAIN-17: Domains do not create domain-specific authentication.**
User identity is singular. There is no Finance login, no Uni login, no per-domain authentication. Domain switches do not require re-authentication.

**INV-DOMAIN-18: Domain-inferred context does not authorise financial actions.**
A Finance domain context — whether EXPLICIT or IMPLICIT — does not grant authority to execute financial actions without explicit user approval. The approval model (UX-14) applies to all financial actions regardless of how Finance domain context was established.

**INV-DOMAIN-19: Finance domain always uses GBP (£) for spoken figures.**
In Finance domain voice context, all financial figures are spoken in GBP (£). This rule is not overridden by personalisation preferences, user verbosity settings, or voice state.

**INV-DOMAIN-20: Domain memory is a view of shared memory, not a separate store.**
Finance memory records, Uni memory records, and all domain memory are stored in the shared APEX memory system with domain tags. No domain has a separate memory database, separate memory schema, or separate memory store.

**INV-DOMAIN-21: The Command Centre is never replaced by a domain shell.**
Domain activation does not replace the Command Centre with a domain-specific layout. The Command Centre is the universal shell. Domain context modifies content within the Command Centre.

**INV-DOMAIN-22: Domain context state object is always consistent.**
The domain context state object (Section 6.3) is the single source of truth for domain context in a session. All domain-sensitive UX elements read from this object. No component maintains a separate domain state.

**INV-DOMAIN-23: No domain bypasses the UX-03 information architecture.**
Domain navigation uses the WORLD surface domain branches defined in UX-03. No domain creates a navigation path outside the UX-03 Tree of Life hierarchy.

**INV-DOMAIN-24: Domain switch confirmation is required when an in-progress task exists.**
When a domain switch is requested (explicit or implicit) and an in-progress task is present in the active domain, confirmation is always required before the switch executes. This rule is not overridden by voice commands, keyboard shortcuts, or programmatic navigation.

**INV-DOMAIN-25: detectDomain() is not modified by UX-10.**
The production detectDomain() implementation in lib/server-utils.js is not modified by UX-10. UX-10 is design-only. Any changes to detectDomain() are a production implementation concern, out of scope for UX-10.

**INV-DOMAIN-26: Domain experiences cannot create domain-specific governance rules.**
The governance hierarchy (Identity → Ownership → Authority → Governance → Execution → Memory) and the Civilisation Agent's authority are not modified by domain experience design. Domain governance is the exclusive domain of UX-16.

**INV-DOMAIN-27: Global context (no active domain) is a valid, non-degraded state.**
A session with no active domain is not an error state. Global context is the appropriate state for multi-domain queries, general queries, and sessions not requiring domain specificity. APEX does not force domain activation.

---

## 18. TESTS

The following verification checks confirm the UX-10 domain experience model is correctly implemented when production implementation occurs. These tests are design-level verification criteria — not production test scripts. [PROPOSED]

**TEST-01: Domain context indicator**
Given: Finance domain active (explicit). When: Command Centre renders. Then: Status bar shows "Finance context" label. Input placeholder shows "Ask Finance Agent…". Briefing shows Finance items first.

**TEST-02: detectDomain() IMPLICIT detection**
Given: No active domain (global). When: User sends message with finance keywords. Then: Finance domain context activated (implicit), status bar updates, Finance Agent routes the message.

**TEST-03: EXPLICIT overrides IMPLICIT**
Given: Finance domain active (explicit). When: User sends message with "uni" keyword. Then: detectDomain() returns 'uni'. Finance domain context NOT changed. Query routed to Uni Agent for that message only. Finance context persists.

**TEST-04: Domain switch — no in-progress task**
Given: Finance domain active (explicit), no in-progress task. When: User navigates to Uni domain card. Then: Immediate switch. No confirmation dialogue. Uni context activated. Finance context archived to history.

**TEST-05: Domain switch — in-progress task**
Given: Finance domain active, in-progress task exists. When: User navigates to Uni domain. Then: Confirmation dialogue shown. If confirmed: task moved to pendingTasks[]. Uni domain activated. If cancelled: Finance domain maintained.

**TEST-06: Cross-domain content deprioritised but not suppressed**
Given: Finance domain active. A Uni deadline item exists (urgency 0.5). When: Briefing renders. Then: Finance items above Uni deadline. Uni deadline visible (not hidden). "More from Uni" or equivalent shown.

**TEST-07: High-urgency cross-domain item surfaces**
Given: Finance domain active. Uni item urgency rises to 0.9. When: UX-09 evaluates triggers. Then: Uni item surfaced immediately regardless of Finance domain. Not queued.

**TEST-08: Domain knowledge gap surfaced**
Given: Finance domain active. User requests Q3 2025 budget. Q3 2025 data not available. When: Finance Agent queries. Then: Gap surfaced at L3 ATTENTION. Data not fabricated. Recovery action suggested.

**TEST-09: Finance action requires L4 approval**
Given: Finance domain active. User requests "transfer £500 to savings." When: Finance Agent processes request. Then: L4 DECISION item shown. Transfer not executed without explicit confirmation. No confirmation = no transfer.

**TEST-10: GBP figures in Finance voice**
Given: Finance domain active. Voice query: "What's my balance?". When: Finance Agent responds via voice. Then: All figures spoken in GBP (£). "£2,340" not "2340" or "2,340 pounds."

**TEST-11: Command Centre not replaced by domain shell**
Given: Finance domain active. When: Any Finance domain view renders. Then: Command Centre structure (input zone, status bar, briefing) unchanged in layout. Domain context modifies content, not structure.

**TEST-12: UX-05 tokens only in Finance presentation**
Given: Finance domain active. When: Finance domain UI renders. Then: All CSS tokens are UX-05 tokens. No Finance-specific colour variables, font variables, or spacing variables introduced.

**TEST-13: Domain memory tagged, not partitioned**
Given: Finance session with budget creation. When: Budget record written to memory. Then: Record includes `domain: 'finance'` tag. Record accessible from global context. Record accessible from Uni context. No separate Finance memory store.

**TEST-14: Uni deadline trigger in Uni domain**
Given: Uni domain active. Assignment due in 48 hours. When: Proactive trigger evaluates. Then: Proactive item surfaced at L3. Uni vocabulary used. Domain badge present.

**TEST-15: Personalisation CONCISE within Finance governance**
Given: Finance domain active. User preference: CONCISE verbosity. An L4 Finance alert exists. When: Finance domain renders. Then: Transaction list condensed (CONCISE). L4 alert shown in full (not condensed). Governance not overridden.

**TEST-16: Cross-domain query answered without switch**
Given: Finance domain active (explicit). User sends cross-domain message (Finance + Business). When: Routing evaluates. Then: Response from both contexts. Finance domain context unchanged. Both domains attributed in response.

**TEST-17: Domain entry summary on activation**
Given: Global context. When: User navigates to Finance domain. Then: Domain entry summary proactive item delivered (L2). "Finance context active. [N] transactions. Budget at [X]%." Suppressable.

**TEST-18: Health domain gap documented in UI**
Given: World surface rendered. When: Domain cards shown. Then: Health domain card present, labelled "Not available" or "Coming soon." Not omitted silently. Gap acknowledged to user.

**TEST-19: Civilisation Agent not user-navigable**
Given: World surface rendered. When: User browses domain cards. Then: No "Civilisation" domain card present. Civilisation Agent not accessible via domain navigation. Constitutional output surfaces via governance notifications only.

**TEST-20: INFERRED domain not auto-activated**
Given: Global context. When: Attention engine infers Finance domain from contextual signals (time, prior conversation). Then: Finance domain NOT auto-activated. Suggestion surfaced: "You seem to be working on Finance — activate Finance context?" User must confirm.

**TEST-21: Voice DOMAIN_SWITCH state enters on switch with in-progress task**
Given: Finance domain active. In-progress task. User says "Go to Uni." When: Voice processes intent. Then: DOMAIN_SWITCH voice state entered. Confirmation requested ("You have [task] in progress. Switch to Uni?"). Switch not executed until confirmed.

**TEST-22: Domain switching preserves voice session**
Given: Active voice session. Finance domain active. When: User switches to Uni domain (no in-progress task). Then: Voice session continues. DOMAIN_SWITCH state transient. SPEAKING / AMBIENT state resumes in Uni domain. Voice session not terminated.

**TEST-23: Global context is non-degraded**
Given: Session start. detectDomain() returns null. No explicit domain navigation. When: Command Centre renders. Then: Global context label shown (or no domain indicator). All domain capabilities accessible. No capability suppressed. No forced domain activation. All domain agents accessible.

---

## 19. DEVIATIONS

The following deviations from prior UX phase patterns are recorded. All deviations are justified.

**DEVIATION-01: Domain context state managed in frontend**
Prior UX phases (UX-08, UX-09) defined models that are primarily server-side. UX-10 domain context state is defined as a frontend state object. Justification: detectDomain() is already server-side [OBSERVED]; the domain context object manages UX adaptation which is inherently a frontend concern. Backend provides domain slug; frontend manages domain UX state.

**DEVIATION-02: Health domain gap documented rather than deferred silently**
Prior UX phases have not explicitly documented capability gaps in the canonical taxonomy. UX-10 explicitly documents the Health domain gap throughout (Section 4.2, taxonomy table, prototype, TEST-18, INV-DOMAIN-12). Justification: the Health domain is referenced in UX-02 and UX-03 as a canonical domain. Its absence from production must be documented, not silently omitted, to prevent downstream UX phases from assuming Health domain coverage.

**DEVIATION-03: Cross-domain query model not in prior phases**
Prior UX phases deal with single-context interactions. UX-10 introduces the cross-domain query model (Section 8.2 SCENARIO E, TEST-16, V-DOMAIN-13). Justification: Domain experiences introduce the possibility of cross-domain queries which did not arise in single-context UX phases. The model is required and does not conflict with prior phases.

**DEVIATION-04: Personalisation integration cross-referenced from supporting work**
UX-10 references the personalisation SUPPORTING UX WORK (UX-10-PERSONALISATION-AND-USER-ADAPTATION.md) rather than defining personalisation from scratch. Justification: The personalisation work is valid and preserved. Cross-referencing it avoids duplication and establishes the correct subordination relationship (personalisation is subordinate to domain governance).

---

## 20. OPEN QUESTIONS

The following questions are open as of UX-10 and are deferred to UX-11 and subsequent phases. They are not resolved in UX-10.

**OQ-01: Health domain agent architecture.**
A Health Agent does not exist in production. What is the Health Agent's architecture? What health data sources does it access? What health-specific system prompt does it require? What health domain detection keywords should be added to detectDomain()? → DEFER to UX-13 (Agents).

**OQ-02: How does domain memory scoping interact with UX-15 memory architecture?**
UX-10 defines domain memory as a tagged view of shared memory. UX-15 will define the full memory architecture. The precise mechanism for domain-scoped memory retrieval (tag-based filtering vs semantic scoping vs hybrid) is undefined. → DEFER to UX-15 (Memory).

**OQ-03: How does domain context scope knowledge gap detection in UX-11?**
UX-10 defines that domain context should scope knowledge gap surfacing. UX-11 will define the knowledge architecture. The precise integration point (domain context as a retrieval filter input to knowledge gap detection) is to be designed in UX-11. → DEFER to UX-11 (Knowledge).

**OQ-04: What is the correct treatment of the Communication domain?**
The Communication domain is defined in UX-02 but has no agent, no detection, and no UX in production. Should Communication have its own agent? Should calendar, email, and messaging be unified under one Communication Agent? How does Communication domain interact with the existing multi-channel communication architecture (UX-04)? → DEFER to UX-13 (Agents).

**OQ-05: What is the correct treatment of the Research domain?**
Similarly to Communication, Research is defined in UX-02 but not implemented. What constitutes a Research domain experience in APEX? What data sources does it cover? → DEFER to UX-13 (Agents).

**OQ-06: How should domain-specific intelligence differ from domain-specific knowledge?**
UX-10 references Finance intelligence (spending trend, budget projection) as distinct from Finance knowledge (transaction records, budget data). The precise boundary between knowledge and intelligence in domain context is not defined. → DEFER to UX-11 (Knowledge) and UX-12 (Intelligence).

**OQ-07: What is the user-visible observability model for the Civilisation Agent's domain health monitoring?**
The Civilisation Agent monitors DOM-000001 through DOM-000010. UX-10 documents this as INTERNAL ONLY. But should users have any read-only visibility into governance domain health? If so, what surface, what disclosure level, and what content? → DEFER to UX-16 (System / Constitutional) and UX-17 (Activity / Observability).

**OQ-08: How does domain context interact with UX-14 actions and approvals?**
UX-10 specifies that financial actions require L4 approval (V-DOMAIN-10). But what is the full domain-specific action taxonomy? Which domain actions require approval, which are low-friction, which are reversible? How does the approval model (UX-14) define domain-specific action categories? → DEFER to UX-14 (Actions / Approvals).

**OQ-09: Should domain context be persistent across sessions?**
UX-10 defines domain context as a session-level concept (reset at session end). Should the last active domain persist between sessions? If so, how is stale domain context handled (e.g., Finance context is active from yesterday's session but today the user wants to work in Uni)? → OPEN — to be decided before production implementation.

**OQ-10: How is the detectDomain() keyword set maintained and extended?**
New domains (Health, Communication, Research) will require new detection keywords in detectDomain(). Who owns the keyword set? How are ambiguous or overlapping keywords resolved? How is the keyword set tested for false positive detection? → DEFER to production implementation team.

---

## 21. CERTIFICATION STATUS

```
UX-10 — DOMAIN EXPERIENCES
═══════════════════════════════════════════════════════════════

Certification:              IN PROGRESS
Reconciliation:             COMPLETE
  Prior work reclassified:  YES (personalisation → SUPPORTING UX WORK)
  Reconciliation record:    UX-10-RECONCILIATION-RECORD.md

Scope defined:              YES
  In-scope items:           13 (Section 2.1)
  Out-of-scope items:       10 (Section 2.2)

Authoritative inputs:       YES
  Prior phases referenced:  UX-00 through UX-09 (all)
  Inherited constraints:    YES (UX-05, UX-06, UX-07, UX-08, UX-09)

Production audit:           COMPLETE
  Observed gaps:            14 (GAP-01 through GAP-14)
  Domain coverage matrix:   9 domains assessed

Domain model:               DEFINED
  Domain taxonomy:          9 domains (7 named + Civilisation + Communication/Research)
  Domain hierarchy:         DEFINED (Section 5.3)
  ONE APEX principle:       STATED AND BOUNDED (Section 5.1)
  Domain context object:    DEFINED (Section 6.3)

Scenarios:                  20 (V-DOMAIN-01 through V-DOMAIN-20)
Invariants:                 27 (INV-DOMAIN-01 through INV-DOMAIN-27)
Tests:                      23 (TEST-01 through TEST-23)
Governance boundaries:      10 (Section 12)
Implementation recs:        15 (REC-01 through REC-15)
Open questions:             10 (OQ-01 through OQ-10)

Prototype:                  SPECIFIED (Section 14) — apex-domain-prototype.html
                            TO BE CREATED (separate execution)

Production implementation:  NOT STARTED — out of scope for UX-10
  server.js:                UNTOUCHED
  domain-agents.js:         UNTOUCHED
  finance_agent.js:         UNTOUCHED
  lib/server-utils.js:      UNTOUCHED

UX-11 gate:                 BLOCKED
  Condition:                UX-10 must be explicitly completed
  OR:                       Explicit authorisation received acknowledging outstanding phase
  Authority:                APEX canonical roadmap authority

═══════════════════════════════════════════════════════════════
```

---
*UX-10 — DOMAIN EXPERIENCES | APEX UX Programme | Phase 10 Canonical*
*All invariants are permanent. All governance boundaries are absolute.*
*See UX-10-RECONCILIATION-RECORD.md for reconciliation audit.*
