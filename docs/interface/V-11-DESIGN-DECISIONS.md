# V-11 DESIGN DECISIONS
## Canonical Resolution of All Outstanding Design Questions

**Status:** LOCKED — All decisions resolved by analysis  
**Date:** 2026-08-31  
**Predecessor:** V-11 Experience Architecture Specification (draft, ac2aff6)  
**Application code changes:** NONE  
**Production:** UNCHANGED (dd1dd1f / 1d3f17e)

> This document resolves all 10 previously unresolved design decisions and establishes the canonical positions for all V-11 design questions. Every decision has been evaluated against: comprehension, user value, transparency, discoverability, performance, mobile usability, consistency, extensibility, implementation risk, and APEX's long-term identity. No decision in this document requires user authority to implement unless explicitly flagged.

---

## DECISION 1 — Primary Destination Naming

**Question:** What labels appear on the 6 primary navigation destinations?

**Competing alternatives:**

| Option | Labels |
|--------|--------|
| A | TODAY · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM |
| B | NOW · ASK · DOMAINS · MIND · DO · SYSTEM |
| C | TODAY · COMMAND · MY LIFE · APEX MIND · ACTIONS · SYSTEM |

**Analysis:**

**TODAY vs NOW:** TODAY is more grounded. The destination shows this day's briefing, priorities, and schedule. "Now" suggests a live feed; "Today" suggests a curated summary. TODAY is correct. On mobile bottom tab (space-constrained): truncates to `TODAY`.

**COMMAND vs ASK:** ASK implies question-answering only. COMMAND implies the full capability set: ask, instruct, research, voice, create, approve. COMMAND is the right word for a surface that can do anything. On mobile: `CMD`.

**LIFE & WORK vs DOMAINS:** Domains is backend vocabulary. "Life & Work" describes what is inside the destination in human terms. On mobile: `LIFE`.

**INTELLIGENCE vs MIND:** Mind is a metaphor. Intelligence accurately names the destination's content — briefing, opportunities, knowledge analysis, memory. Intelligence also aligns with "APEX intelligence" as a product concept. On mobile: `INTEL`.

**ACTIONS vs DO:** Actions is a noun, consistent with the nominal style of all other labels. "Do" is a verb and creates stylistic inconsistency. On mobile: `ACTIONS`.

**SYSTEM vs SYSTEM:** Unambiguous. No alternative considered.

**Decision: LOCKED — Option A**

```
Desktop sidebar:    TODAY · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM
Mobile bottom tab:  TODAY · CMD    · LIFE        · INTEL        · ACTIONS · ···
```

The ··· overflow on mobile reveals SYSTEM and any advanced destinations. Full labels appear in the mobile overlay sheet when ··· is tapped.

---

## DECISION 2 — PlasmaOrb Disposition

**Question:** What role, if any, does the PlasmaOrb WebGL canvas play in V-11?

**Competing alternatives:**

| Option | Description |
|--------|-------------|
| A | Retain as ambient background animation on Command page, desktop only; remove as primary interactive element |
| B | Remove entirely; replace with static brand mark |
| C | Retain as-is (primary visual identity, interactive voice trigger) |
| D | Move to System page as system state visualiser |

**Analysis:**

**Option C (retain as-is) is ruled out:** The orb is currently the primary visual element on the Command page — it competes with the chat interface for visual attention, which is the wrong hierarchy. The conversation thread and input must be dominant.

**Option B (remove entirely) is suboptimal:** The orb has visual distinctiveness as a brand element. Removing it creates a void. The COMMAND page would become purely functional without visual character.

**Option D (System page):** The orb is not a system monitor. It would be misrepresented there. No evidence it maps to system state semantically.

**Option A (ambient background):**
- The orb renders at lower opacity as a full-page background layer behind the command thread.
- Its animation speed is reduced (ambient, not assertive).
- It has no interactive role (voice trigger moves to topbar microphone icon).
- It remains a APEX identity element — recognisable brand without competing for attention.

**Performance guard (critical):** The PlasmaOrb is a WebGL canvas. WebGL on mobile drains battery and causes jank on mid-range hardware. The orb is NOT rendered on mobile (`window.innerWidth < 768`). On desktop, the orb is suspended (canvas animation paused) when the user navigates away from COMMAND.

**Decision: LOCKED — Option A with mobile guard**

PlasmaOrb is retained as ambient background on the Command page, desktop only. It is not interactive. Voice trigger moves to topbar. On mobile, COMMAND has no WebGL canvas — a static animated CSS background is used instead (the dot grid animation, which is CSS-only and low-cost).

---

## DECISION 3 — Default Landing Destination

**Question:** When the user opens APEX, which destination loads by default?

**Competing alternatives:**

| Option | Description |
|--------|-------------|
| A | TODAY is the default landing page |
| B | COMMAND remains the default (current behaviour) |
| C | Context-dependent — TODAY in morning, COMMAND in afternoon |

**Analysis:**

**Three usage patterns:**
1. Morning review (2–5 min, deliberate) — TODAY serves this perfectly
2. Active work (goal-directed) — COMMAND serves this; user navigates directly
3. Quick check (ambient, <30s) — TODAY serves this better than COMMAND

TODAY serves 2 of 3 patterns as default. COMMAND serves 1.

**Option C** adds logic complexity without meaningful benefit — a user who wants COMMAND in the afternoon will navigate there in one tap.

**Single user consideration:** The user who built APEX knows what they want. A persistent preference overrides the default. Implement `apex_default_page` in localStorage (settable from SYSTEM → Settings → Interface). The default value is `'now'`.

**Decision: LOCKED — Option A with user-preference override**

TODAY (`switchPage('now')`) is the default landing destination. SYSTEM → Settings → Interface allows the user to set any primary destination as their default. The preference persists in localStorage across sessions.

---

## DECISION 4 — Navigation Model

**Question:** What navigation structure does APEX use on desktop and mobile?

**Competing alternatives:**

| Option | Description |
|--------|-------------|
| A | Desktop: permanent sidebar (220px) + Mobile: bottom tab bar (5 tabs + ···) |
| B | Bottom tabs only on both desktop and mobile |
| C | Top horizontal tabs on desktop + Bottom tabs on mobile |

**Analysis:**

**Option B (bottom tabs everywhere):** Bottom tabs on desktop waste the left-side real estate that all major productivity applications (Notion, Linear, Slack, VS Code) use for navigation. 6 bottom tabs on a 1440px wide screen is not a good desktop pattern.

**Option C (top horizontal tabs):** 6 labels plus notification badges at the top of a desktop page creates a horizontal band that is visually heavy and does not scale gracefully as labels grow or shrink.

**Option A (sidebar + bottom tabs):**
- Sidebar is the industry-standard pattern for information-dense desktop applications.
- Bottom tabs are the industry-standard pattern for mobile navigation (iOS HIG, Material Design both recommend this for 3–5 primary destinations; 6 with overflow is acceptable).
- The sidebar clearly shows notification badges, active state, and destination names without space pressure.
- The bottom tab bar places navigation within thumb reach.

**Implementation note:** The current APEX layout is a flex-column (topbar → main area). Adding a sidebar requires wrapping the main area in a flex-row (sidebar + content). This is a structural HTML change contained within the `<body>` layout section — significant but bounded. It does not affect any route, API, or backend code.

**Sidebar collapse:** The sidebar is collapsible to 56px (icon-only) via a toggle stored in localStorage (`apex_sidebar_collapsed`). This gives the user more content width on smaller desktops.

**Decision: LOCKED — Option A**

Desktop (≥1024px): Permanent 220px sidebar, collapsible to 56px icons.  
Tablet (768–1023px): Sidebar collapses to hamburger overlay; bottom tab bar appears.  
Mobile (≤767px): No sidebar; bottom tab bar (5 visible tabs + ··· overflow).

---

## DECISION 5 — "Personal" Domain Tab Naming

**Question:** What is the 6th sub-tab in LIFE & WORK called?

The tab contains: Journal, Spiritual practice, Occult/esoteric research.

**Competing alternatives:**

| Option | Label |
|--------|-------|
| A | Personal |
| B | Esoteric |
| C | Inner |
| D | Practice |

**Analysis:**

**Option B (Esoteric):** Accurately describes the current page content but incorrectly labels Journal as esoteric. As the Personal tab grows (personal finance notes, reflections, personal goals), "Esoteric" becomes inaccurate.

**Option C (Inner):** Ambiguous — "inner" could mean internal system pages to a technical user.

**Option D (Practice):** More spiritual connotation than the tab content requires.

**Option A (Personal):** Neutral, inclusive, and human. The word "Personal" as a tab label communicates "this is my private space" — which correctly encompasses journal, spiritual practice, and esoteric research. It also correctly excludes business and health content.

**Within the Personal tab:** The Occult page is presented as "Esoteric Research" (more descriptive than its current label in the navigation context).

**Decision: LOCKED — Option A**

The 6th LIFE & WORK sub-tab is labelled "Personal". It contains: Journal · Spiritual · Esoteric Research (formerly Occult). The tab icon is a journal/book symbol.

---

## DECISION 6 — /api/now/summary Aggregation Endpoint

**Question:** How does the TODAY surface retrieve its data?

**Competing alternatives:**

| Option | Description |
|--------|-------------|
| A | New dedicated aggregation endpoint (separate service logic) |
| B | Client-side parallel fetch of 4 existing endpoints |
| C | New server-side route that calls existing service functions internally |

**Analysis:**

**Option B (client-side parallel):** 4 HTTP requests on boot rather than 1. This moves in the wrong direction — V-09 reduced boot requests to 35; V-11 targets <30. Adding 4 parallel calls for the default landing page would push toward 35–40 on boot.

**Option A (dedicated service):** Requires duplicating service logic (briefing retrieval, task filtering, vitals aggregation) into a new service file. Creates maintenance burden — two sources of truth for the same data.

**Option C (server-side route calling existing functions):**
- `routes/now.js` (or `src/routes/now.js`) is a thin aggregation layer.
- It calls existing service functions (or imports existing route handlers and calls them internally).
- Returns one JSON response to the client.
- The server can cache the aggregated response at the route level (5-minute TTL) — independent of individual endpoint caches.
- The client makes exactly 1 HTTP call for the entire TODAY surface.

**Existing boot sequence with Option C:**
- TODAY shell: instant (CSS/HTML)
- `GET /api/now/summary`: 1 call, returns everything
- Secondary domain signals (health, finance one-liners) load after initial paint

This is the correct approach. It aligns with V-09 performance work and respects the existing service layer.

**Decision: LOCKED — Option C**

New file: `routes/now.js` (mounted by `_loadAgentRoutes()` as `/api/now/summary`).  
Route aggregates: briefing, priority-inbox, vitals, pending tasks.  
Server-side TTL cache: 5 minutes.  
Client call: one `GET /api/now/summary` on TODAY load.  
Before this endpoint exists (V-11-A through V-11-B), the client uses parallel fallback fetches.

---

## DECISION 7 — Chat History Persistence

**Question:** How does chat history persist across page refreshes and sessions?

**Competing alternatives:**

| Option | Description |
|--------|-------------|
| A | localStorage persistence (client-side) |
| B | Server-side persistence (new DB table + API endpoints) |
| C | No change — current behaviour (resets on refresh) |

**Analysis:**

**Option C (no change):** The current behaviour is actively harmful to the COMMAND experience. The user loses context after a page refresh or navigation. There is no justification for preserving this behaviour.

**Option B (server-side):** Full session persistence across devices and sessions. Enables APEX to reference past conversations as context in future requests. This is the correct long-term approach. However, it requires: a new DB table (`chat_sessions`, `chat_messages`), new API endpoints (`GET/POST /api/chat/history`), and changes to the chat route. This is out of scope for V-11-E (Command rebuild).

**Option A (localStorage):**
- Key: `apex_chat_history`
- Format: `[{role, content, timestamp, type, metadata}]`
- Maximum: 100 messages (FIFO pruning)
- Cleared: On logout (`apex_session` cookie cleared)
- Zero backend changes required

localStorage provides the immediate user value (history survives refresh, survives navigation away from COMMAND) at zero backend cost. Server-side persistence is a subsequent authorised change.

**Decision: LOCKED — Phased approach**

Phase 1 (V-11-E): localStorage persistence (`apex_chat_history`, 100 message max, cleared on logout).  
Phase 2 (separate authorisation required): Server-side persistence in DB with API endpoints.

---

## DECISION 8 — Streaming AI Responses

**Question:** How are AI chat responses delivered to the user?

**Competing alternatives:**

| Option | Description |
|--------|-------------|
| A | Server-Sent Events (SSE) — server streams chunks to client |
| B | WebSocket streaming — use existing WS connection for chat |
| C | Synchronous — full response rendered when complete; improve loading state |

**Analysis:**

**Option C (synchronous):** The current approach. The user sees nothing for 5–15 seconds during AI processing. Even with a good loading state, the cognitive experience is "waiting." Streaming eliminates this gap. Option C is insufficient for a world-class AI interface.

**Option B (WebSocket):** The existing WebSocket connection handles real-time notifications and system events. Routing chat responses through the same WebSocket mixes two distinct concerns: event push (WS native) and request-response streaming (not WS native — requires protocol layering). This adds complexity and potential interference.

**Option A (SSE):**
- SSE is HTTP/1.1 native, stateless, and unidirectional — exactly what chat streaming requires.
- The Claude API (Anthropic) natively supports streaming. The `@anthropic-ai/sdk` streams chunks via `async iterables`.
- Server implementation: a new route (or modified `/chat`) uses `res.setHeader('Content-Type', 'text/event-stream')` and writes `data: {...}\n\n` chunks.
- Client implementation: `EventSource` or `fetch` with `ReadableStream`.
- Existing synchronous `/chat` route remains for non-streaming contexts (voice pipeline, agent tool calls).

**Decision: LOCKED — Option A (SSE streaming)**

This is a significant backend change (modifies `routes/chat.js` or creates a parallel `routes/chat-stream.js`). Requires explicit implementation authorisation as a separate authorisation for V-11-E.

New endpoint: `GET /api/chat/stream` with query-params (or POST with streaming headers).  
Existing `POST /chat` retained for non-streaming use cases.

---

## DECISION 9 — Swipe Navigation Indicator

**Question:** How does the user discover and track swipe navigation between primary tabs on mobile?

**Competing alternatives:**

| Option | Description |
|--------|-------------|
| A | Dot indicators (iOS-style, always visible at bottom of content area) |
| B | Edge gradient suggesting swipeable content |
| C | First-session text hint only ("Swipe to navigate") |

**Analysis:**

**Option B (edge gradient):** Communicates that more content exists horizontally but does not communicate: how many destinations exist, which destination is current, or that the right gesture is a swipe (could be a scroll). Edge gradients are for scrollable content, not navigable sections.

**Option C (text hint only):** Shows once, then disappears. After the first session, the user has no persistent position indicator. This is appropriate as a discovery mechanism but insufficient as a persistent indicator.

**Option A + C combined:**
- Dot indicators: always visible in the content area, above the bottom tab bar. 5 dots visible (SYSTEM is in ···). Active dot: cyan. Inactive dots: dim white.
- First-session text hint: "Swipe between sections" appears above the dots for 3 seconds on first open. Stored in `localStorage: apex_swipe_hint_shown`. Never shown again after first session.

The dot indicators serve both navigation awareness (which destination you're on) and count awareness (how many destinations exist). The bottom tab bar already shows the destination labels — dots provide the supplementary swipe metaphor.

**Decision: LOCKED — Combined A + C**

Persistent dot indicators (5 dots, above bottom tab bar, active dot cyan).  
First-session text hint: "Swipe between sections" for 3 seconds on first open.  
Dots not shown on desktop (sidebar provides navigation awareness).

---

## DECISION 10 — Confidence Indicator Visual Design

**Question:** How does APEX communicate confidence levels for intelligence items, memory, and recommendations?

**Competing alternatives:**

| Option | Description |
|--------|-------------|
| A | Unicode dots (●◕◐◑○) — compact, icon-based |
| B | Text labels only ("High confidence", "Low confidence") |
| C | Progress bar |
| D | Colour-coded chips (green/amber/red) |

**Analysis:**

**WCAG constraint:** Colour alone fails WCAG 2.1 AA Success Criterion 1.4.1 (Use of Color). Any solution that relies solely on colour (Options A without labels, D without text) is non-compliant.

**Option C (progress bar):** Misrepresents confidence as a continuous scale. Confidence has 5 categorical levels, not a percentage. A bar implies precision that doesn't exist in the underlying data.

**Option A alone:** Compact but requires learning the dot semantics. Screen readers read "●" not "High confidence."

**Option B alone:** Text is accessible and clear but takes more visual space and requires reading rather than scanning.

**Best of both worlds:**

At L0 (summary in a card header, space-constrained):
```
● High
```
Small coloured dot + one-word label. The dot provides visual scan; the word provides reading and screen reader access.

At L1 (expanded context panel, more space):
```
● High confidence — based on 3 consistent sources, all from the last 7 days
```
Full sentence. The dot + word remains, with explanatory context appended.

**Colour mapping (dot colour):**
- ● Cyan (#00d4ff) → High (≥0.85)
- ● Blue (#0066ff) → Good (0.65–0.84)
- ● Amber (#f59e0b) → Medium (0.45–0.64)
- ● Orange (#f97316) → Low (0.25–0.44)
- ● Red (#ef4444) → Very Low (<0.25)
- — Grey → Unknown (no confidence data)

**Decision: LOCKED — Combined A + B at each disclosure level**

L0: coloured dot (8px) + one-word label inline.  
L1: coloured dot + word + explanatory sentence.  
L2: per-source confidence if available.  
All confidence indicators include both visual (colour+shape) and textual information (screen-reader safe).

---

## SUPPLEMENTARY DECISIONS

The following decisions emerged from the Phase 2 design review and are resolved here without requiring user authority.

---

### SD-1: Voice Result Display (Non-Forced Navigation)

**Question:** When voice is triggered from a destination other than COMMAND, where does the response appear?

**Original spec:** Voice responses appear in COMMAND thread; user navigated there automatically.

**Problem:** If the user is reading intelligence on the INTELLIGENCE page and triggers voice for a quick question, force-navigating them to COMMAND destroys their context.

**Decision: LOCKED — Voice result overlay (non-destructive)**

Voice responses appear in a non-destructive overlay panel:
- Slides up from bottom, 40% screen height
- Shows the response text alongside TTS audio
- Primary action: "Open in Command" (full thread)
- Secondary: Dismiss (tap outside or Escape)
- Approval cards can be actioned from the overlay directly
- Overlay auto-dismisses after TTS completes if no interaction
- The response is simultaneously appended to the COMMAND thread (accessible later)

Short responses (single sentence): small overlay, auto-dismisses after TTS.  
Longer responses: overlay shows first 3 lines + "Read more in Command" link.  
Approval-type responses: overlay shows full approval card with Approve/Reject buttons.

---

### SD-2: "Last Visit" Session Tracking

**Question:** How does the TODAY "Since Last Visit" section know when the user last visited?

**Decision: LOCKED — localStorage timestamp**

On every APEX session open: write `apex_last_session_ts = Date.now()` to localStorage.  
On TODAY load: read the previous value, display human-readable delta ("3 hours ago", "yesterday").  
Agent runs that occurred since that timestamp are the "Since Last Visit" content.

Implementation: before updating `apex_last_session_ts`, read the old value and store it as `apex_prev_session_ts`. Use `apex_prev_session_ts` as the start boundary for the "Since Last Visit" query.

---

### SD-3: Undo Window Duration

**Question:** The spec inconsistently states 8 seconds and 30 seconds for the undo window.

**Decision: LOCKED — 30-second undo window**

The undo window is 30 seconds. The banner shows for the full 30 seconds. In the last 5 seconds, the banner shows a countdown ("Undo — 4s remaining"). After 30 seconds, the banner disappears.

The previous reference to "fades after 8s" in the flow diagrams was an error. 8 seconds is insufficient for a user who may have navigated away and returned. 30 seconds is the correct UX window.

---

### SD-4: Finance vs Business Scope

**Question:** The LIFE & WORK destination has both a Finance tab and a Business tab. What does each contain?

**Decision: LOCKED — Clear scope division**

**Finance tab:** Money flow.
- Personal income, expenses, budget tracking
- Business income and expenses (combined view, filterable by personal/business)
- Invoices, subscriptions
- Budget status vs targets
- API: `/api/finance/summary`, `/api/finance/transactions`

**Business tab:** Operations.
- CRM: clients, pipeline, deals
- Projects: active, proposed, archived
- Proposals and documents
- API: `/api/operations/clients`, `/api/operations/projects`, `/api/operations/proposals`

Finance = where money goes. Business = what APEX manages operationally.

---

### SD-5: State Survival Across Navigation

**Question:** When the user expands an L1 panel on INTELLIGENCE, then navigates to COMMAND and back, is the expansion preserved?

**Decision: LOCKED — Session-level state map**

Page state (scroll position, expanded card IDs) is stored in a JavaScript `Map` keyed by destination ID:
```
pageState = {
  'intelligence': { scrollTop: 420, expandedCards: ['opp-001', 'memory-recent'] },
  'command': { scrollTop: 0 },
  ...
}
```
State is preserved for the session (in-memory, not localStorage). On hard refresh, state resets.

This means: the user can navigate away and return to find their expanded cards still expanded. This is achievable without backend changes — pure JS state management in the page.

---

*All decisions in this document are LOCKED. The V-11 Experience Architecture Specification (final) reflects these decisions as resolved. No decision here requires user authority to implement — implementation authorisation applies per V-11 phase, not per decision.*

---

**V-11 DESIGN DECISIONS LOCKED**  
*Recorded: 2026-08-31*  
*Application code changes: NONE*  
*Production: UNCHANGED (dd1dd1f / 1d3f17e)*
