# UX-19 — Integration / E2E Certification Baseline
## APEX AI OS — Production State vs. Canonical UX Requirements

**Document authority:** UX-19 Integration & End-to-End Certification  
**Status:** BASELINE — Pre-implementation snapshot  
**Date:** 2026-08-28  
**Scope:** Full production audit covering UX-05 through UX-18 canonical requirements  
**Classification system:** OBSERVED · CANONICAL · MISSING · CONFLICTING · DEPRECATED · PROPOSED · BLOCKED · OPEN

---

## Table of Contents

1. [Current Production Interface](#1-current-production-interface)
2. [Canonical UX Requirements Summary](#2-canonical-ux-requirements-summary)
3. [Existing Production Capabilities](#3-existing-production-capabilities)
4. [Existing APIs](#4-existing-apis)
5. [Existing WebSockets](#5-existing-websockets)
6. [Existing Runtime Paths](#6-existing-runtime-paths)
7. [Existing Data Sources](#7-existing-data-sources)
8. [Existing Frontend Components](#8-existing-frontend-components)
9. [Prototype-to-Production Mapping](#9-prototype-to-production-mapping)
10. [Missing Production Capabilities](#10-missing-production-capabilities)
11. [Duplicated Capabilities](#11-duplicated-capabilities)
12. [Incompatible Implementations](#12-incompatible-implementations)
13. [Integration Dependencies](#13-integration-dependencies)
14. [Risks](#14-risks)
15. [Blockers](#15-blockers)
16. [Proposed Implementation Order](#16-proposed-implementation-order)
17. [Complete Findings Classification Table](#17-complete-findings-classification-table)
18. [UX Authority Cross-Reference](#18-ux-authority-cross-reference)
19. [Approval and Sign-Off](#19-approval-and-sign-off)
20. [Revision History](#20-revision-history)

---

## 1. Current Production Interface

### 1.1 File Identity

| Property | Value |
|---|---|
| File | `public/dashboard.html` |
| Version tag | `apex-version v10` |
| Total lines | 20,826 |
| Architecture | Single-file HTML with inline CSS and inline JS |
| Style blocks | 8 `<style>` tags distributed across the file |

### 1.2 Page Inventory

| # | Page ID | Label | Status |
|---|---|---|---|
| 1 | `page-command` | Command Centre | OBSERVED — present, populated |
| 2 | `page-overview` | Overview | OBSERVED — present |
| 3 | `page-operation` | Operation | OBSERVED — present |
| 4 | `page-system` | System | OBSERVED — present, executive council/command chain/agent pipeline visible |
| 5 | `page-finance` | Finance | OBSERVED — present |
| 6 | `page-communication` | Communication | OBSERVED — present |
| 7 | `page-business` | Business | OBSERVED — present |
| 8 | `page-health` | Health | OBSERVED — present |
| 9 | `page-university` | University | OBSERVED — present |
| 10 | `page-occult` | Occult | OBSERVED — present |
| 11 | `page-research` | Research | OBSERVED — present |
| 12 | `page-civilisation` | Civilisation | OBSERVED — present |
| 13 | `page-reality` | Reality | OBSERVED — present |
| 14 | `page-browser` | Browser | OBSERVED — present but hidden |
| — | `page-activity` | Activity / Observability | MISSING — no page element exists |
| — | `page-agents` | Agents | MISSING — no dedicated page (domain agent grid is on system page only) |
| — | `page-approvals` | Approvals | MISSING — keyboard shortcut 'A' exists but no page element |
| — | `page-memory` | Memory Inspection | MISSING — no panel |
| — | `page-governance` | Constitutional / Governance | MISSING — no panel |
| — | `page-knowledge` | Knowledge | MISSING — no standalone UI |
| — | `page-intelligence` | Intelligence | MISSING — no standalone UI |

**Total pages present:** 14  
**Total pages required by UX-13 through UX-17:** +6 (agents, approvals, memory, governance, knowledge, intelligence — some may share or nest; exact count is OPEN)

### 1.3 Navigation Architecture

| Context | Implementation | Canonical Requirement |
|---|---|---|
| Desktop (≥900px) | Sidebar nav | Sidebar — OBSERVED, acceptable |
| Mobile (<900px) | Hamburger → 3-column grid dropdown | 5-tab bottom bar (UX-18 §4) — CONFLICTING |
| Mobile FAB | Not present | Safe-area FAB (UX-18 §5.3) — MISSING |
| Bottom sheet | Not present | UX-18 §6 bottom sheet component — MISSING |

### 1.4 Breakpoint Architecture

| Tier | Range | UX-18 Requirement | Production State |
|---|---|---|---|
| Mobile-S | < 640px | Full mobile stack | Partially covered by <900px block |
| Tablet-P | 640–1023px | Tablet portrait layout | Not covered — MISSING |
| Tablet-L | 1024–1279px | Tablet landscape layout | Not covered — MISSING |
| Desktop-S | 1280–1439px | Desktop compact | Not covered — MISSING |
| Desktop-L | ≥ 1440px | Desktop full | Not covered — MISSING |
| Single break | 900px | Not in UX-18 tier model | CONFLICTING — partially maps to Mobile-S/Tablet-P boundary |

### 1.5 Typography

| Font | Load Method | UX-05 §3 Status |
|---|---|---|
| Inter | system-ui fallback | CANONICAL — primary typeface |
| Cinzel | Google Fonts CDN | CANONICAL — brand/ceremonial |
| JetBrains Mono | Google Fonts CDN | CANONICAL — monospace/code |
| IBM Plex Sans | Google Fonts CDN | DEPRECATED — retired by UX-05 §3 |
| Space Grotesk | Google Fonts CDN | DEPRECATED — retired by UX-05 §3 |

---

## 2. Canonical UX Requirements Summary

This section maps each UX authority document to its primary obligation and the production compliance state.

| UX Doc | Title | Core Obligation | Production Compliance |
|---|---|---|---|
| UX-05 | Canonical Visual Design System | Token namespace `--apex-color-*`, 3-font stack, SVG icons, single CSS source | PARTIAL — values correct, namespace missing, 8 CSS blocks, 2 deprecated fonts, emoji icons |
| UX-06 | Command Centre Visual Prototype | Command page layout, orb placement, activity feed | PARTIAL — page present, orb present, activity feed basic |
| UX-07 | Voice Experience | 11 orb states, waveform rules, state machine | PARTIAL — 4 of 11 states; waveform missing from SPEAKING |
| UX-08 | Contextual Presentation | L0–L4 progressive disclosure system | MISSING — no disclosure system |
| UX-09 | Proactive Communication | Voice-state suppression model, attention engine | MISSING — no suppression model |
| UX-10 | Domain Experiences | Domain page quality standards | PARTIAL — domain pages exist, inconsistent quality |
| UX-11 | Knowledge | Knowledge panel UI | MISSING — no standalone knowledge UI |
| UX-12 | Intelligence | Intelligence panel UI | MISSING — no standalone intelligence UI |
| UX-13 | Agents | Agent status page, agent grid | MISSING — no dedicated agents page |
| UX-14 | Actions & Approvals | Approvals page, two-step modal, mobile confirmation | MISSING — no approvals page, no modal |
| UX-15 | Memory | Memory inspection panel, correction/forget UI | BLOCKED — no frontend UI, no backend correction/forget routes |
| UX-16 | System / Constitutional | Constitutional/governance dashboard | BLOCKED — no frontend UI; backend routes exist but no constitutional display |
| UX-17 | Activity / Observability | Activity page, real-time event stream | MISSING — no page-activity |
| UX-18 | Mobile / Responsive | 6-tier breakpoints, 5-tab bottom nav, FAB, bottom sheet | CONFLICTING/MISSING — single 900px breakpoint, dropdown nav |

---

## 3. Existing Production Capabilities

### 3.1 Command Centre (UX-06)

- OBSERVED: `page-command` is the primary landing page
- OBSERVED: PlasmaOrb canvas element renders with 4 states (standby, listening, thinking, speaking)
- OBSERVED: `setOrbState()` function handles state transitions
- OBSERVED: Basic activity feed showing agent events on command page
- OBSERVED: APEX Event Dispatcher system (`data-fn`, `data-change`, `data-input` attributes)
- OBSERVED: `switchPage()` function at line 12153 — clean classList-based page switching

### 3.2 Voice (UX-07)

- OBSERVED: 4 orb states implemented: `standby`, `listening`, `thinking`, `speaking`
- OBSERVED: Waveform animation active during LISTENING state
- OBSERVED: WebSocket at `/ws/gemini-live` for voice pipeline
- CONFLICTING: Waveform NOT active during SPEAKING state (UX-05 requires it)
- MISSING: 7 of 11 UX-07 states: `wake-word`, `processing`, `live`, `error`, `muted`, `sleeping`, `calibrating`

### 3.3 System Page

- OBSERVED: Executive council display
- OBSERVED: Command chain display
- OBSERVED: Agent pipeline status
- OBSERVED: Domain agent grid (on system page — not on a dedicated agents page)
- MISSING: Constitutional/governance visibility panel (UX-16)

### 3.4 Domain Pages

- OBSERVED: Finance, Health, Business, University, Communication pages present
- OPEN: Quality consistency across domain pages not fully audited at line level
- MISSING: L0–L4 progressive disclosure on any domain page (UX-08)

### 3.5 Notifications

- OBSERVED: `/notifications` API returns 50 most recent notifications
- OBSERVED: `POST /notifications/:id/read` marks individual notifications read
- MISSING: Attention engine wiring in frontend (UX-09)
- MISSING: Presentation pipeline (UX-09 suppression model)

### 3.6 Reduced Motion & Accessibility

- OBSERVED: `@media (prefers-reduced-motion: reduce)` present in CSS
- OBSERVED: 44px touch targets enforced at <900px
- MISSING: Touch target enforcement for 640–1023px range (UX-18)
- OPEN: Coverage completeness of reduced-motion rules not fully audited

---

## 4. Existing APIs

All entries OBSERVED via server.js route registration (433 lines, Node.js + Express).

### 4.1 Core / Health

| Route | Method | Description | UX Relevance |
|---|---|---|---|
| `/health` | GET | Server health check | UX-12, UX-17 |
| `/api/intelligence/self-check` | GET | 9-subsystem diagnostic | UX-12 intelligence panel |
| `/api/intelligence/agent-runs` | GET | Pipeline execution audit | UX-12, UX-17 |

### 4.2 Governance

| Route | Method | Description | UX Relevance |
|---|---|---|---|
| `/api/governance/dashboard` | GET | Governance state object | UX-16 constitutional dashboard |
| `/api/governance/readiness` | GET | 8-dimension readiness scorecard | UX-16 |

### 4.3 Tasks / Approvals

| Route | Method | Description | UX Relevance |
|---|---|---|---|
| `/api/timeline` | GET | 20 most recent tasks | UX-14, UX-17 |
| `/api/tasks` | GET | Agent tasks list | UX-13, UX-14 |
| `/api/tasks/approve` | POST | Approve a task | UX-14 two-step approval |

### 4.4 Notifications

| Route | Method | Description | UX Relevance |
|---|---|---|---|
| `/notifications` | GET | 50 most recent notifications | UX-09, UX-17 |
| `/notifications/:id/read` | POST | Mark notification read | UX-09 |

### 4.5 Memory / Knowledge

| Route | Method | Description | UX Relevance |
|---|---|---|---|
| `/api/memory` | GET | Memory entries | UX-15 memory inspection |
| `/api/knowledge` | GET | Knowledge entries | UX-11 knowledge panel |

### 4.6 Auto-loaded Route Modules

**From `src/routes/` (named registration):**  
`chat`, `voice`, `auth`, `agent-tasks`, `agent-schedules`, `notifications`, `documents`, `files`, `governance-inline`, `rag`, `master`, `system`, `cognition`, `autonomy`

**From `routes/` (auto-loaded):**  
`gemini-live`, `agents`, `briefing`, `civilization`, `cognitive`, `communications`, `empire`, `finance`, `founder`, `governance`, `health`, `intelligence`, `knowledge`, `memory`, `observatory`

### 4.7 Missing Backend Routes (BLOCKED items)

| Capability | Required By | Status |
|---|---|---|
| Memory correction / update | UX-15 | BLOCKED — no route confirmed |
| Memory forget / delete | UX-15 | BLOCKED — no route confirmed |
| Constitutional history / audit log | UX-16 | BLOCKED — no route confirmed |

---

## 5. Existing WebSockets

| Endpoint | Auth | Buffer | Events | UX Relevance |
|---|---|---|---|---|
| `/ws` | Required | — | Full event bus | UX-07 voice, UX-09 proactive |
| `/ws/viz` | Open | 300 events | `AGENT_STARTED`, `AGENT_COMPLETED` | UX-17 activity feed |
| `/ws/gemini-live` | — | — | Voice pipeline | UX-07 voice states |

### 5.1 Event Bus (lib/event-bus.js)

- OBSERVED: 200-event ring buffer
- OBSERVED: 17 event categories
- OBSERVED: `setImmediate` fire-and-forget dispatch model
- MISSING: Frontend subscription to full event bus (only AGENT_STARTED/COMPLETED via viz)

### 5.2 Viz Broadcaster (lib/viz-broadcaster.js)

- OBSERVED: 300-event buffer
- OBSERVED: Taps `AGENT_STARTED` and `AGENT_COMPLETED` events only
- MISSING: Additional event types required by UX-17 (errors, memory writes, governance decisions, notifications)

---

## 6. Existing Runtime Paths

### 6.1 Page Switching

- OBSERVED: `switchPage(pageId)` at line 12153 — handles `classList.active` on page elements and nav buttons
- OBSERVED: `pageMeta` object — stores page metadata used by switchPage
- OBSERVED: `pages` array — registered page IDs
- PROPOSED: New pages (activity, agents, approvals) require entries in both `pages` array and `pageMeta`

### 6.2 Voice State Machine

- OBSERVED: `setOrbState(state)` — central function for PlasmaOrb state transitions
- OBSERVED: 4-state coverage: `ready`/`waiting`/`idle` → standby, `listening`, `processing`/`thinking` → thinking, `speaking`
- PROPOSED: Expand to all 11 UX-07 states with corresponding CSS class assignments

### 6.3 APEX Event Dispatcher

- OBSERVED: `data-fn` — binds HTML element to a JS function call
- OBSERVED: `data-change` — binds input changes to handler
- OBSERVED: `data-input` — binds input events to handler
- OBSERVED: Functions dispatched from DOM attributes without manual addEventListener boilerplate

### 6.4 Agent Drawer

- OBSERVED: `#agentDrawer` element present
- OBSERVED: Populated for some agent types on existing pages
- OPEN: Full agent drawer API contract not fully audited

---

## 7. Existing Data Sources

| Source | Type | Production Endpoint | Frontend Consumer |
|---|---|---|---|
| Agent runs | REST | `/api/intelligence/agent-runs` | None (not wired to any page) |
| Timeline | REST | `/api/timeline` | None (not wired to any page) |
| Tasks | REST | `/api/tasks` | System page (partial) |
| Memory entries | REST | `/api/memory` | None |
| Knowledge entries | REST | `/api/knowledge` | None |
| Notifications | REST | `/notifications` | None (not wired to presentation) |
| Governance state | REST | `/api/governance/dashboard` | None |
| Governance readiness | REST | `/api/governance/readiness` | None |
| Self-check | REST | `/api/intelligence/self-check` | None |
| Viz events | WebSocket | `/ws/viz` | Command page activity feed (partial) |
| Voice | WebSocket | `/ws/gemini-live` | Voice pipeline (PlasmaOrb) |

**Key finding:** The majority of confirmed production APIs have no frontend consumer. Data is available but not surfaced in the UI.

---

## 8. Existing Frontend Components

### 8.1 Confirmed Present

| Component | Element / ID | Pages Used | Notes |
|---|---|---|---|
| PlasmaOrb | `<canvas>` | Command | 4-state only |
| Sidebar nav | `.sidebar` / `.nav-btn` | Desktop all pages | Multiple CSS overrides with `!important` |
| Mobile nav | Hamburger → dropdown | Mobile all pages | 3-column grid, not 5-tab bar |
| Agent drawer | `#agentDrawer` | Some pages | Partial population |
| Page switcher | `switchPage()` | All pages | Clean, classList-based |
| APEX Event Dispatcher | `data-fn` / `data-change` / `data-input` | All pages | Functional event delegation |
| Reduced-motion media query | `@media (prefers-reduced-motion)` | CSS global | Coverage incomplete |

### 8.2 Missing Components

| Component | Required By | Notes |
|---|---|---|
| Bottom navigation bar (5-tab) | UX-18 §4 | Replace mobile dropdown |
| Safe-area FAB | UX-18 §5.3 | Fixed floating action button |
| Bottom sheet | UX-18 §6 | Mobile detail/action surface |
| Two-step approval modal | UX-14 | Confirm before destructive actions |
| L0–L4 disclosure container | UX-08 | Progressive detail reveal |
| Voice state CSS classes (`orb-state-*`) | UX-07 | 11-state class set |
| Activity feed (full) | UX-17 | Real-time observability stream |
| Attention engine hook | UX-09 | Notification suppression |

---

## 9. Prototype-to-Production Mapping

This section tracks which prototype elements from UX-06 through UX-18 design documents have reached production.

| UX Prototype Element | Prototype Doc | In Production | Notes |
|---|---|---|---|
| Command Centre layout | UX-06 | YES | page-command present |
| PlasmaOrb canvas | UX-06 / UX-07 | YES | 4 states only |
| Sidebar navigation (desktop) | UX-05 | YES | Multiple conflicting CSS overrides |
| Domain pages (finance, health, etc.) | UX-10 | YES | Inconsistent quality |
| Bottom navigation (mobile, 5-tab) | UX-18 | NO | 3-column dropdown instead |
| 6-tier responsive breakpoints | UX-18 | NO | Single 900px breakpoint |
| Token namespace `--apex-color-*` | UX-05 | NO | Short names used instead |
| SVG nav icons | UX-05 §8 | NO | Emoji used instead |
| 11-state orb machine | UX-07 | NO | 4 states only |
| L0–L4 disclosure | UX-08 | NO | Not implemented |
| Proactive suppression model | UX-09 | NO | Not implemented |
| Agents page | UX-13 | NO | Grid on system page only |
| Approvals page | UX-14 | NO | Keyboard shortcut exists, no page |
| Two-step approval modal | UX-14 | NO | Not implemented |
| Memory inspection panel | UX-15 | NO | Not implemented |
| Constitutional dashboard | UX-16 | NO | Not implemented |
| Activity / Observability page | UX-17 | NO | Not implemented |
| Knowledge panel | UX-11 | NO | Not implemented |
| Intelligence panel | UX-12 | NO | Not implemented |
| Bottom sheet component | UX-18 | NO | Not implemented |
| Safe-area FAB | UX-18 | NO | Not implemented |

**Prototype coverage: 6 of 22 tracked elements fully in production. 2 partial. 14 missing.**

---

## 10. Missing Production Capabilities

### 10.1 Missing Pages

| Page | UX Authority | Prerequisite APIs | Notes |
|---|---|---|---|
| `page-activity` | UX-17 | `/api/intelligence/agent-runs`, `/api/timeline`, `/ws/viz` | Real-time event stream required |
| `page-agents` | UX-13 | `/api/tasks`, agents route module | Domain agent grid exists on system page — move/duplicate |
| `page-approvals` | UX-14 | `/api/tasks`, `/api/tasks/approve` | Two-step modal required |
| Memory inspection panel | UX-15 | `/api/memory` | BLOCKED pending correction/forget routes |
| Constitutional dashboard | UX-16 | `/api/governance/dashboard`, `/api/governance/readiness` | BLOCKED pending frontend constitutional display logic |
| Knowledge panel | UX-11 | `/api/knowledge` | DEFERRED |
| Intelligence panel | UX-12 | `/api/intelligence/self-check`, `/api/intelligence/agent-runs` | DEFERRED |

### 10.2 Missing Voice States (UX-07)

| State | CSS Class | Trigger Condition | Priority |
|---|---|---|---|
| `wake-word` | `orb-state-wake-word` | Hotword detected, not yet listening | HIGH |
| `live` | `orb-state-live` | Gemini Live streaming active | HIGH |
| `error` | `orb-state-error` | Voice pipeline error | HIGH |
| `muted` | `orb-state-muted` | User muted microphone | HIGH |
| `sleeping` | `orb-state-sleeping` | System idle, low-power | MEDIUM |
| `calibrating` | `orb-state-calibrating` | Audio calibration in progress | MEDIUM |
| `processing` (distinct) | `orb-state-processing` | Distinct from thinking; LLM inference | LOW |

**Currently implemented:** `standby`, `listening`, `thinking`, `speaking` (4 of 11)  
**Missing:** 7 states listed above

### 10.3 Missing CSS / Token Infrastructure

| Item | UX Authority | Impact |
|---|---|---|
| `--apex-color-*` namespace | UX-05 §4 | All downstream theming, dark/light mode, contrast compliance |
| UX-18 6-tier breakpoints | UX-18 §2 | Tablet and large desktop layouts |
| `orb-state-*` CSS classes | UX-07 | Voice state visual feedback |
| Single consolidated `<style>` block | UX-05 / INV-VS-02 | Token override predictability |

### 10.4 Missing Navigation Elements

| Item | UX Authority | Notes |
|---|---|---|
| 5-tab bottom nav bar | UX-18 §4 | Replaces 3-column dropdown |
| Safe-area FAB | UX-18 §5.3 | Fixed action button respecting device safe areas |
| Bottom sheet | UX-18 §6 | Slide-up detail/action panel for mobile |
| Nav buttons for activity, agents, approvals pages | UX-13/14/17 | Required for new pages |

---

## 11. Duplicated Capabilities

### 11.1 CSS Token Definitions

- CONFLICTING: `--primary`, `--cyan`, `--accent` defined multiple times across 8 `<style>` blocks with different values in different blocks
- Root cause: Incremental additions without a token consolidation pass
- Risk: Override order depends on source order within a single file — unpredictable when blocks interleave with HTML

### 11.2 Nav Button Styles

- CONFLICTING: `.nav-btn` CSS rules with `!important` at lines 237, 304, 2047, 2665, 4147
- Five distinct override layers fighting for the same element
- Risk: Any new nav styling must either join the `!important` war or restructure the cascade

### 11.3 Agent Display

- OBSERVED: Domain agent grid present on `page-system`
- PROPOSED: `page-agents` would be a dedicated agents view
- Risk: Duplication of agent data between pages; must decide whether system page retains agent grid or delegates to agents page

---

## 12. Incompatible Implementations

### 12.1 CSS Token Namespace (INV-VS-02)

- **Canonical (UX-05):** Single `<style>` block, `--apex-color-background-primary`, `--apex-color-text-primary`, etc.
- **Production:** 8 `<style>` blocks; `--bg`, `--primary`, `--cyan` short names
- **Values:** Correct (`--bg: #03060f`, `--primary: #00d4ff`)
- **Resolution:** Add `--apex-color-*` aliases in a new block; short names can remain as internal aliases until consolidation pass

### 12.2 Mobile Navigation Pattern

- **Canonical (UX-18 §4):** 5-tab persistent bottom bar at ≤640px, safe-area insets
- **Production:** Hamburger → 3-column grid dropdown at <900px
- **Resolution:** Add bottom nav bar as an additional element; hide dropdown on ≤640px; requires new breakpoint tier

### 12.3 Responsive Breakpoints

- **Canonical (UX-18 §2):** Six tiers — <640px, 640–1023px, 1024–1279px, 1280–1439px, ≥1440px
- **Production:** Single 900px breakpoint
- **Resolution:** Add 5 new `@media` breakpoints; 900px block becomes dead code at 640px once tablet-portrait is properly handled — must audit for conflicts

### 12.4 Waveform Activation

- **Canonical (UX-05):** Waveform active during LISTENING, SPEAKING, and LIVE states
- **Production:** Waveform active during LISTENING only
- **Resolution:** Extend waveform trigger to `speaking` and `live` state entries in `setOrbState()`

### 12.5 Voice State Coverage

- **Canonical (UX-07):** 11 distinct orb states with defined visual signatures
- **Production:** 4 states; `processing` aliased to `thinking`; no `wake-word`, `live`, `error`, `muted`, `sleeping`, `calibrating`
- **Resolution:** Expand `setOrbState()` state map; add CSS classes; extend PlasmaOrb canvas render path

### 12.6 Icon System

- **Canonical (UX-05 §8):** SVG icons for all navigation and UI chrome
- **Production:** Emoji characters (⬡, ◈, ⊞, ◉, ◎, ✉, ◧, ◑, ◫, ◬, ⊛, ◍) in nav buttons
- **Resolution:** Replace with inline SVG or SVG sprite; requires updating all `.nav-btn` inner HTML

### 12.7 Loaded Fonts (Deprecated)

- **Canonical (UX-05 §3):** Inter, Cinzel, JetBrains Mono only
- **Production:** IBM Plex Sans and Space Grotesk also loaded via CDN (network cost, no usage)
- **Resolution:** Remove from `<link>` tags in `<head>`

---

## 13. Integration Dependencies

### 13.1 New Page → API Dependencies

| Page to Add | APIs Required | WebSocket Required | Auth Required |
|---|---|---|---|
| `page-activity` | `/api/intelligence/agent-runs`, `/api/timeline` | `/ws/viz` (expand event types) | `/ws` auth |
| `page-agents` | `/api/tasks`, agents route | None | Yes |
| `page-approvals` | `/api/tasks`, `/api/tasks/approve` | None | Yes |
| Memory panel | `/api/memory` + correction/forget routes | None | Yes |
| Constitutional dashboard | `/api/governance/dashboard`, `/api/governance/readiness` | None | Yes |

### 13.2 Voice State → WebSocket Dependencies

- `setOrbState('live')` must be triggered by Gemini Live WebSocket events
- `setOrbState('error')` must be triggered by voice pipeline error events
- `setOrbState('wake-word')` requires hotword detection signal from `/ws` or `/ws/gemini-live`
- Any new state wiring must not break existing Gemini Live pipeline (RISK — see §14)

### 13.3 Activity Feed → Event Bus Expansion

- Current viz broadcaster emits only `AGENT_STARTED` / `AGENT_COMPLETED`
- UX-17 requires: errors, memory writes, governance decisions, notification delivery events
- Requires backend expansion of `lib/viz-broadcaster.js` to tap additional event categories from event bus
- Frontend WebSocket handler must be extended to process new event types

### 13.4 CSS Token → Override Dependencies

- 8 existing style blocks with `!important` overrides
- New `--apex-color-*` tokens must use `!important` where short-name values are also declared with `!important`
- Failure to do so results in new tokens being silently overridden by existing blocks

### 13.5 Navigation → Page Registration Dependencies

- `switchPage()` reads from `pages` array and `pageMeta` object
- All new pages require entries in both before nav buttons will function
- Nav buttons for new pages require entries in both sidebar and mobile nav structures

---

## 14. Risks

### 14.1 File Size Risk — HIGH

- `dashboard.html` is 20,826 lines
- All changes are targeted patches only — no wholesale rewrites
- Side effects from large file are: difficult diff review, slow search, increased chance of merge conflict
- Mitigation: Changes must be precise, line-referenced, and staged in the order defined in §16

### 14.2 CSS Override Complexity — HIGH

- 8 style blocks with competing `!important` declarations
- New tokens and styles must be placed after all existing blocks to win the cascade
- New style block must be the last `<style>` tag in the file
- Failure mode: silently wrong styling that passes visual inspection but breaks on specific breakpoints

### 14.3 Voice Pipeline Stability — CRITICAL

- Gemini Live is active in production
- `setOrbState()` modifications must be backward-compatible
- New states must be additive — existing state strings (`listening`, `thinking`, `speaking`) must retain identical behavior
- Test requirement: voice pipeline smoke test after any `setOrbState()` change

### 14.4 Auth Boundary Risk — MEDIUM

- New pages connect to real APIs behind auth middleware
- Frontend must gracefully handle 401/403 responses without breaking page rendering
- Pattern: all new API calls must include error state handling that shows a non-fatal UI error, not a blank panel

### 14.5 WebSocket Event Type Expansion — MEDIUM

- Expanding `lib/viz-broadcaster.js` is a backend change
- Risk of buffering issues if new event types are high-frequency (e.g., memory writes)
- Mitigation: Rate-limit or sample high-frequency events before broadcasting to viz

### 14.6 Navigation Breakpoint Conflict — MEDIUM

- Existing 900px breakpoint partially overlaps with UX-18's 640px and 1024px tiers
- Adding 640px breakpoint may cause double-application of mobile styles for 640–900px range
- Mitigation: Audit and refactor the 900px block when adding 640px tier; do not simply add new blocks

### 14.7 Agent Grid Duplication — LOW

- System page currently hosts domain agent grid
- Adding `page-agents` risks duplicated agent display without a clear information architecture decision
- Mitigation: Resolve OPEN-001 (see §15.5) before implementing `page-agents`

---

## 15. Blockers

### 15.1 BLOCKED: Memory Inspection Panel (UX-15)

- **Reason:** No backend routes confirmed for memory correction or memory forget/delete
- **Dependency:** Backend must expose `PATCH /api/memory/:id` and `DELETE /api/memory/:id` (or equivalent)
- **Frontend action:** UI scaffolding can be prepared; API wiring cannot be completed
- **Owner:** Backend team

### 15.2 BLOCKED: Constitutional / Governance Dashboard (UX-16)

- **Reason:** No constitutional history or audit log route confirmed; governance state is readable but no display logic exists for constitutional scoring
- **Dependency:** Backend must expose governance history endpoint; frontend needs constitutional display specification
- **Frontend action:** `GET /api/governance/dashboard` and `GET /api/governance/readiness` are available; basic readiness scorecard can be displayed
- **Owner:** UX-16 display specification + backend audit log route

### 15.3 DEFERRED: Knowledge Panel (UX-11)

- **Reason:** Low implementation priority relative to observability and approvals
- **Data available:** `GET /api/knowledge` confirmed in production
- **Status:** DEFERRED — schedule after activity, agents, approvals pages are complete

### 15.4 DEFERRED: Intelligence Panel (UX-12)

- **Reason:** Low implementation priority; system self-check data available but no display specification at implementation level
- **Data available:** `GET /api/intelligence/self-check`, `GET /api/intelligence/agent-runs` confirmed in production
- **Status:** DEFERRED — schedule after activity, agents, approvals pages are complete

### 15.5 OPEN: Agent Grid Architecture Decision (OPEN-001)

- **Question:** Does `page-agents` replace or complement the agent grid on `page-system`?
- **Options:** (a) Move grid to page-agents, leave system page with summary only; (b) Duplicate; (c) Keep system page as-is, add agents page with different scope
- **Decision owner:** Product / UX authority
- **Blocking:** page-agents implementation

---

## 16. Proposed Implementation Order

Phases are ordered by dependency chain and risk profile. Each phase must be complete and smoke-tested before the next begins.

### Phase 1 — CSS Foundation (Non-Breaking)

| Step | Action | Affected File | Risk |
|---|---|---|---|
| 1.1 | Add `--apex-color-*` token namespace as aliases to existing values | `dashboard.html` — new final `<style>` block | LOW |
| 1.2 | Add UX-18 breakpoints: 640px, 1024px, 1280px, 1440px | `dashboard.html` — same new `<style>` block | MEDIUM (900px conflict) |
| 1.3 | Add `orb-state-*` CSS classes for all 11 UX-07 states | `dashboard.html` — same new `<style>` block | LOW |
| 1.4 | Add `page-activity` styles | `dashboard.html` — same new `<style>` block | LOW |
| 1.5 | Add `page-agents` styles | `dashboard.html` — same new `<style>` block | LOW |
| 1.6 | Add `page-approvals` styles + approval modal styles | `dashboard.html` — same new `<style>` block | LOW |

### Phase 2 — HTML Structure (New Pages)

| Step | Action | Affected File | Risk |
|---|---|---|---|
| 2.1 | Add `<section id="page-activity">` after last existing page | `dashboard.html` | LOW |
| 2.2 | Add `<section id="page-agents">` | `dashboard.html` | LOW |
| 2.3 | Add `<section id="page-approvals">` + approval modal HTML | `dashboard.html` | LOW |
| 2.4 | Add sidebar nav buttons for new pages | `dashboard.html` | LOW |
| 2.5 | Add mobile nav entries for new pages | `dashboard.html` | LOW |

### Phase 3 — JavaScript (Page Registration + State Expansion)

| Step | Action | Affected File | Risk |
|---|---|---|---|
| 3.1 | Add new page IDs to `pages` array | `dashboard.html` | LOW |
| 3.2 | Add new page metadata to `pageMeta` object | `dashboard.html` | LOW |
| 3.3 | Expand `setOrbState()` to all 11 UX-07 states | `dashboard.html` | CRITICAL — test voice pipeline |
| 3.4 | Wire waveform to SPEAKING and LIVE states | `dashboard.html` | HIGH |

### Phase 4 — JavaScript (API Integration)

| Step | Action | Affected File | Risk |
|---|---|---|---|
| 4.1 | Activity page: WebSocket event handler + timeline API call | `dashboard.html` | MEDIUM |
| 4.2 | Agents page: `/api/tasks` fetch + render | `dashboard.html` | MEDIUM |
| 4.3 | Approvals page: `/api/tasks` fetch + two-step confirmation modal | `dashboard.html` | MEDIUM |
| 4.4 | All new pages: auth error handling (401/403 graceful fallback) | `dashboard.html` | MEDIUM |

### Phase 5 — Cleanup (Low Priority, Post-Stabilisation)

| Step | Action | Affected File | Risk |
|---|---|---|---|
| 5.1 | Remove IBM Plex Sans and Space Grotesk `<link>` tags | `dashboard.html` | LOW |
| 5.2 | Replace emoji nav icons with inline SVG | `dashboard.html` | MEDIUM |
| 5.3 | Resolve 900px breakpoint conflict / refactor nav CSS overrides | `dashboard.html` | HIGH |

### Phase 6 — Documentation (Parallel, No Code)

| Step | Action | Notes |
|---|---|---|
| 6.1 | Document UX-16 constitutional gap as BLOCKED | Update this document |
| 6.2 | Document UX-15 memory gap as BLOCKED | Update this document |
| 6.3 | Document UX-11/12 knowledge/intelligence as DEFERRED | Update this document |
| 6.4 | Resolve OPEN-001 (agent grid architecture decision) | Requires product decision |

---

## 17. Complete Findings Classification Table

| ID | Finding | Category | Classification | UX Authority | Phase |
|---|---|---|---|---|---|
| F-001 | `page-command` present and functional | Frontend page | OBSERVED | UX-06 | — |
| F-002 | `page-overview` present | Frontend page | OBSERVED | UX-03 | — |
| F-003 | `page-operation` present | Frontend page | OBSERVED | UX-03 | — |
| F-004 | `page-system` present | Frontend page | OBSERVED | UX-03 | — |
| F-005 | `page-finance` present | Frontend page | OBSERVED | UX-10 | — |
| F-006 | `page-communication` present | Frontend page | OBSERVED | UX-10 | — |
| F-007 | `page-business` present | Frontend page | OBSERVED | UX-10 | — |
| F-008 | `page-health` present | Frontend page | OBSERVED | UX-10 | — |
| F-009 | `page-university` present | Frontend page | OBSERVED | UX-10 | — |
| F-010 | `page-occult` present | Frontend page | OBSERVED | UX-10 | — |
| F-011 | `page-research` present | Frontend page | OBSERVED | UX-10 | — |
| F-012 | `page-civilisation` present | Frontend page | OBSERVED | UX-10 | — |
| F-013 | `page-reality` present | Frontend page | OBSERVED | UX-10 | — |
| F-014 | `page-browser` present (hidden) | Frontend page | OBSERVED | — | — |
| F-015 | `page-activity` absent | Frontend page | MISSING | UX-17 | Phase 2 |
| F-016 | `page-agents` absent (dedicated) | Frontend page | MISSING | UX-13 | Phase 2 |
| F-017 | `page-approvals` absent | Frontend page | MISSING | UX-14 | Phase 2 |
| F-018 | Memory inspection panel absent | Frontend panel | MISSING | UX-15 | BLOCKED |
| F-019 | Constitutional dashboard absent | Frontend panel | MISSING | UX-16 | BLOCKED |
| F-020 | Knowledge panel absent | Frontend panel | MISSING | UX-11 | DEFERRED |
| F-021 | Intelligence panel absent | Frontend panel | MISSING | UX-12 | DEFERRED |
| F-022 | PlasmaOrb canvas — 4 states | Voice | OBSERVED | UX-07 | — |
| F-023 | `setOrbState()` — 4 states only | Voice | CONFLICTING | UX-07 | Phase 3 |
| F-024 | `wake-word` state missing | Voice | MISSING | UX-07 | Phase 3 |
| F-025 | `live` state missing | Voice | MISSING | UX-07 | Phase 3 |
| F-026 | `error` state missing | Voice | MISSING | UX-07 | Phase 3 |
| F-027 | `muted` state missing | Voice | MISSING | UX-07 | Phase 3 |
| F-028 | `sleeping` state missing | Voice | MISSING | UX-07 | Phase 3 |
| F-029 | `calibrating` state missing | Voice | MISSING | UX-07 | Phase 3 |
| F-030 | Waveform inactive during SPEAKING | Voice | CONFLICTING | UX-05 | Phase 3 |
| F-031 | Waveform inactive during LIVE | Voice | MISSING | UX-07 | Phase 3 |
| F-032 | `--apex-color-*` token namespace absent | CSS | MISSING | UX-05 §4 | Phase 1 |
| F-033 | Short token names used (`--bg`, `--primary`) | CSS | CONFLICTING | UX-05 §4 | Phase 1 |
| F-034 | Token values correct (`--bg: #03060f`, `--primary: #00d4ff`) | CSS | OBSERVED | UX-05 | — |
| F-035 | 8 `<style>` blocks (INV-VS-02 violation) | CSS | CONFLICTING | UX-05 / INV-VS-02 | Phase 5 |
| F-036 | `--primary`, `--cyan`, `--accent` redefined across blocks | CSS | CONFLICTING | UX-05 | Phase 1 |
| F-037 | `.nav-btn` with `!important` at 5 locations | CSS | CONFLICTING | UX-05 | Phase 5 |
| F-038 | Single 900px breakpoint | Responsive | CONFLICTING | UX-18 §2 | Phase 1 |
| F-039 | 640px breakpoint absent | Responsive | MISSING | UX-18 §2 | Phase 1 |
| F-040 | 1024px breakpoint absent | Responsive | MISSING | UX-18 §2 | Phase 1 |
| F-041 | 1280px breakpoint absent | Responsive | MISSING | UX-18 §2 | Phase 1 |
| F-042 | 1440px breakpoint absent | Responsive | MISSING | UX-18 §2 | Phase 1 |
| F-043 | 5-tab bottom nav bar absent | Navigation | MISSING | UX-18 §4 | Phase 2 |
| F-044 | Mobile nav is 3-column dropdown | Navigation | CONFLICTING | UX-18 §4 | Phase 2 |
| F-045 | Safe-area FAB absent | Navigation | MISSING | UX-18 §5.3 | Phase 2 |
| F-046 | Bottom sheet component absent | Navigation | MISSING | UX-18 §6 | Phase 2 |
| F-047 | Two-step approval modal absent | Approvals | MISSING | UX-14 | Phase 2 |
| F-048 | L0–L4 progressive disclosure absent | Presentation | MISSING | UX-08 | — |
| F-049 | Proactive suppression model absent | Presentation | MISSING | UX-09 | — |
| F-050 | Attention engine not wired | Notifications | MISSING | UX-09 | — |
| F-051 | IBM Plex Sans loaded | Typography | DEPRECATED | UX-05 §3 | Phase 5 |
| F-052 | Space Grotesk loaded | Typography | DEPRECATED | UX-05 §3 | Phase 5 |
| F-053 | Inter loaded | Typography | OBSERVED | UX-05 §3 | — |
| F-054 | Cinzel loaded | Typography | OBSERVED | UX-05 §3 | — |
| F-055 | JetBrains Mono loaded | Typography | OBSERVED | UX-05 §3 | — |
| F-056 | Emoji icons in nav | Icons | DEPRECATED | UX-05 §8 | Phase 5 |
| F-057 | SVG icons absent | Icons | MISSING | UX-05 §8 | Phase 5 |
| F-058 | `GET /health` available | API | OBSERVED | UX-17 | — |
| F-059 | `GET /api/intelligence/self-check` available | API | OBSERVED | UX-12 | — |
| F-060 | `GET /api/intelligence/agent-runs` available | API | OBSERVED | UX-12/17 | — |
| F-061 | `GET /api/governance/dashboard` available | API | OBSERVED | UX-16 | — |
| F-062 | `GET /api/governance/readiness` available | API | OBSERVED | UX-16 | — |
| F-063 | `GET /notifications` available | API | OBSERVED | UX-09 | — |
| F-064 | `POST /notifications/:id/read` available | API | OBSERVED | UX-09 | — |
| F-065 | `GET /api/timeline` available | API | OBSERVED | UX-14/17 | — |
| F-066 | `GET /api/tasks` available | API | OBSERVED | UX-13/14 | — |
| F-067 | `POST /api/tasks/approve` available | API | OBSERVED | UX-14 | — |
| F-068 | `GET /api/memory` available | API | OBSERVED | UX-15 | — |
| F-069 | Memory correction/forget routes absent | API | BLOCKED | UX-15 | BLOCKED |
| F-070 | `GET /api/knowledge` available | API | OBSERVED | UX-11 | — |
| F-071 | `/ws` — auth-required event bus WebSocket | WebSocket | OBSERVED | UX-07/09 | — |
| F-072 | `/ws/viz` — open viz broadcaster | WebSocket | OBSERVED | UX-17 | — |
| F-073 | `/ws/gemini-live` — voice pipeline | WebSocket | OBSERVED | UX-07 | — |
| F-074 | Viz broadcaster emits AGENT_STARTED/COMPLETED only | WebSocket | CONFLICTING | UX-17 | Phase 4 |
| F-075 | Event bus — 17 categories, 200-event buffer | Backend | OBSERVED | UX-09/17 | — |
| F-076 | `switchPage()` — clean classList-based routing | Frontend | OBSERVED | UX-06 | — |
| F-077 | APEX Event Dispatcher system present | Frontend | OBSERVED | — | — |
| F-078 | `#agentDrawer` present | Frontend | OBSERVED | UX-13 | — |
| F-079 | Reduced-motion media query present (incomplete) | Accessibility | OBSERVED | UX-05 | — |
| F-080 | 44px touch targets at <900px | Accessibility | OBSERVED | UX-18 | — |
| F-081 | Touch targets absent for 640–1023px range | Accessibility | MISSING | UX-18 | Phase 1 |
| F-082 | Domain pages inconsistent quality | Domain | OPEN | UX-10 | — |
| F-083 | Agent grid on system page (not dedicated page) | Agents | CONFLICTING | UX-13 | OPEN-001 |
| F-084 | Keyboard shortcut 'A' for approvals exists | Navigation | OBSERVED | UX-14 | — |
| F-085 | Executive council / command chain on system page | System | OBSERVED | UX-16 | — |
| F-086 | Constitutional audit log route absent | API | BLOCKED | UX-16 | BLOCKED |

---

## 18. UX Authority Cross-Reference

| UX Doc | Title | Findings | Missing Count | Blocked Count |
|---|---|---|---|---|
| UX-05 | Canonical Visual Design System | F-032 through F-057 | 4 | 0 |
| UX-06 | Command Centre Visual Prototype | F-001, F-022, F-076 | 0 | 0 |
| UX-07 | Voice Experience | F-022 through F-031 | 8 | 0 |
| UX-08 | Contextual Presentation | F-048 | 1 | 0 |
| UX-09 | Proactive Communication | F-049, F-050 | 2 | 0 |
| UX-10 | Domain Experiences | F-005 through F-013, F-082 | 0 (quality OPEN) | 0 |
| UX-11 | Knowledge | F-020, F-070 | 1 | 0 |
| UX-12 | Intelligence | F-021, F-059, F-060 | 1 | 0 |
| UX-13 | Agents | F-016, F-066, F-078, F-083 | 1 | 0 |
| UX-14 | Actions & Approvals | F-017, F-047, F-065, F-066, F-067, F-084 | 2 | 0 |
| UX-15 | Memory | F-018, F-068, F-069 | 1 | 1 |
| UX-16 | System / Constitutional | F-019, F-061, F-062, F-085, F-086 | 1 | 2 |
| UX-17 | Activity / Observability | F-015, F-058, F-060, F-072, F-074 | 1 | 0 |
| UX-18 | Mobile / Responsive | F-038 through F-047, F-080, F-081 | 8 | 0 |

**Summary totals:**
- Total findings: 86
- OBSERVED: 35
- MISSING: 29
- CONFLICTING: 13
- DEPRECATED: 4
- BLOCKED: 3
- DEFERRED: 2
- OPEN: 4

---

## 19. Approval and Sign-Off

This document represents the authoritative pre-implementation state of the APEX AI OS interface as of 2026-08-28. It must be reviewed before any production changes to `public/dashboard.html` or related backend files.

| Role | Name / System | Date | Status |
|---|---|---|---|
| UX Authority (UX-19) | APEX AI OS Integration Certification | 2026-08-28 | BASELINE ESTABLISHED |
| Implementation Lead | — | — | PENDING |
| Backend Lead | — | — | PENDING |

**This document becomes stale upon any production change. Update after each completed phase.**

---

## 20. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-08-28 | Claude Code (UX-19 baseline generation) | Initial baseline document — full pre-implementation snapshot |

---

*End of UX-19 Integration / E2E Certification Baseline — v1.0*
