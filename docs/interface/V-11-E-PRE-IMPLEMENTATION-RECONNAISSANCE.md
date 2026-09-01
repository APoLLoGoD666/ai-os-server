# V-11-E Pre-Implementation Reconnaissance

**Document:** V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE  
**Phase:** V-11-E — COMMAND Page Conversation Interface  
**Status:** Reconnaissance Complete — Awaiting Implementation Authorisation  
**Date:** 2026-09-01  
**Prepared by:** Systematic codebase inspection of dashboard.html, src/routes/chat.js, and related assets

---

## Table of Contents

1. Executive Summary
2. Scope and Objectives
3. Current COMMAND Page HTML Structure
4. Current COMMAND Page Layout and CSS
5. Center Column Deep Inspection
6. Global Input Zone Analysis
7. Right Column and Feed
8. Below-Split Content (Constitution Charter)
9. JavaScript Initialisation and Lifecycle
10. Chat Function Inventory
11. Voice Function Inventory and State Machine
12. Backend `/chat` Route Analysis
13. Critical P0 Issues
14. P1 Issues
15. P2 Issues (Refinements)
16. P3 Issues (Future Scope)
17. User Comprehension Audit (Questions 1–20)
18. Locked Design Decisions Relevant to V-11-E
19. Master / User Capability Matrix (Current vs. Target)
20. Progressive Disclosure Model for COMMAND
21. Response Archetypes
22. Architectural Gaps Summary
23. Open Decisions Requiring Resolution
24. Proposed V-11-E Implementation Sequence (Units E-1 through E-10)
25. Voice State Machine — Current and Target
26. Dependency Graph
27. Regression Surface
28. Final Recommendation

---

## Section 1 — Executive Summary

The COMMAND page in its current state is a widget and orb board, not a conversation interface. The fundamental premise of V-11-E — delivering a coherent, readable, persistent conversation thread as the primary interaction surface — is blocked at multiple levels before a single line of implementation code is written.

Five P0 issues exist simultaneously. The most critical is that `#chatLog`, the container for all chat output, carries `style="display:none"` inline. Every text reply from APEX — whether typed or voiced — is appended to this hidden element. Text chat output is entirely invisible to the user. The only perceptible response channel is text-to-speech audio. Without audio, APEX appears to be completely unresponsive to typed input.

Alongside the hidden chat thread, there is no localStorage persistence for conversation history. Navigation away from the COMMAND page and returning — or reloading the browser tab — silently discards the entire conversation. The approval workflow is doubly broken: the approval card inserts immediately before `#chatLog`, so it too is invisible, making decision flows completely non-functional in the text channel. The global input bar is rendered on every page regardless of context, which creates semantic confusion and a UI surface that serves no purpose on non-COMMAND pages.

The current backend `/chat` route performs no capability enforcement beyond `requireAppAccess`. Both the master and user roles can invoke all 21 available tools including finance operations, browser automation, and memory access, without any backend gate.

The architectural path to V-11-E is clear: ten discrete implementation units (E-1 through E-10), ordered by P-level severity and dependency chain, starting with making the chat thread visible (E-1) and culminating in SSE streaming (E-8) and backend capability enforcement (E-10), the latter two both requiring explicit authorisation before work begins.

This document provides the complete factual basis for that implementation. No application code has been modified.

---

## Section 2 — Scope and Objectives

**In scope for this reconnaissance:**

- `public/dashboard.html` — all HTML structure, inline CSS, and inline JavaScript relevant to the COMMAND page and the global input zone
- `src/routes/chat.js` — backend chat route: authentication, model selection, tool inventory, streaming strategy
- All CSS rules referencing `.cmd-*`, `#page-command`, `#chatLog`, `#chatInput`, `#micBtn`, `#plasmaOrb`, `#cmdStrip`, `#cmdSidebar`, `.cwid`
- All JavaScript functions relevant to: chat rendering, voice, COMMAND page init/pause, and switchPage routing
- The locked design decisions (Decision 2, 7, 8, SD-1) from the V-11 Design Decisions register that directly constrain COMMAND implementation

**Not in scope:**

- Application code changes (none made)
- Other pages (TODAY, SYSTEM, HEALTH, FINANCE, FLOW)
- Backend services other than `/chat` route
- Infrastructure, deployment, or database concerns

**Objectives of V-11-E:**

The V-11-E implementation phase aims to transform the COMMAND page from its current widget/orb/voice-only state into a full conversation interface, aligned with the V-11 experience architecture specification. Core objectives are:

1. Make chat output visible in a correctly structured conversation thread
2. Establish persistent localStorage-backed chat history
3. Establish a single-column conversation layout conforming to spec
4. Scope the global input zone to the COMMAND context
5. Implement SSE streaming (subject to separate authorisation)
6. Enforce backend capability boundaries between master and user roles

---

## Section 3 — Current COMMAND Page HTML Structure

**Page container:** `#page-command` at line 6412 of `dashboard.html`.

```html
<div class="page" id="page-command">
```

This element is the root of all COMMAND-specific content. The `.page` class is the standard framework used across all six pages in the navigation system (TODAY, COMMAND, SYSTEM, HEALTH, FINANCE, FLOW).

**Top-level structure within `#page-command`:**

1. `.cmd-split` — two-column CSS grid (main left, feed right)
2. Below `.cmd-split` — APEX Constitution Charter full card

**Within `.cmd-split`:**

- `.cmd-main-col` — left column containing `#cmd-main`
- `.cmd-feed-col` — right column containing `.apex-feed`

**Within `#cmd-main`:**

- `.cmd-stage` — the central visual container
- `#cmdStrip` — the bottom stat strip with four metric cards

**Hidden stubs within `#page-command` (voice JS compatibility layer):**

These elements exist for JavaScript function compatibility but carry no visible presence:

- `#chatLog` — `style="display:none"` — all chat message output target
- `#typingIndicator` — `display:none` — typing animation container
- `#orbStateBadge` — hidden
- `#orbStatus` — hidden
- `#micBtn` — hidden (a second mic button distinct from the global one)

The presence of two `#micBtn` elements in the document (one hidden inside `#page-command`, one visible in the global input zone) is itself an HTML validity concern and a source of potential querySelector conflicts.

---

## Section 4 — Current COMMAND Page Layout and CSS

**`.cmd-split`** implements a two-column CSS grid layout:

- Left: `.cmd-main-col` (conversation/orb content)
- Right: `.cmd-feed-col` (activity feed)

**Duplicate CSS definition:** `.cmd-split` is defined at two separate locations in the stylesheet — lines 2507–2513 and lines 3018–3028. CSS cascade applies the later definition, making the earlier one a dead rule. This is a P2 quality issue.

**Border separator:** `.cmd-main-col` carries `border-right: 1px solid rgba(94,106,210,0.07)`. This creates a subtle visual divider between the main column and the feed. In the target single-column layout, this rule will need removal or conditional application.

**Responsive behaviour:** At `@media (max-width: 1099px)` the CSS grid collapses to a single column and the feed column is hidden. On mobile, only `.cmd-main-col` content is visible.

**Design sidebar `#cmdSidebar`:** A 256px-wide widget editor panel with an add-widget grid and properties panel. This is not part of the V-11 spec. The sidebar and its associated widget CSS (`.cwid`, `.cwid-del`, widget body type variants: checklist, news, hud, clock, text, note) represent a parallel feature investment not aligned with the conversation interface specification.

---

## Section 5 — Center Column Deep Inspection

The center column (`#cmd-main`) contains `.cmd-stage` and `#cmdStrip`.

**`.cmd-stage`** is a relative-positioned container. Its children are:

**`#plasmaOrb` canvas** (`data-fn="startVoice"`): The primary interactive element on the COMMAND page. Tapping or clicking the canvas fires `startVoice()`. This directly conflicts with the locked design specification (Decision 2), which requires the PlasmaOrb to be a non-interactive ambient background element rendered at approximately 15% opacity. The orb's interactive function in the current implementation means voice triggering is bound to a visual element that the spec designates as purely decorative.

**`#plasmaOrbSubLabel`:** Displays the text "STANDBY · TAP TO SPEAK". This label reinforces the interactive interpretation of the orb. Under V-11-E, when the orb becomes ambient and non-interactive, this label must either be removed or reassigned to accompany the topbar mic icon.

**`#cmdOrbState`:** Hidden state indicator. Present but not rendered.

**Two `#waveform` divs:** Duplicate `id="waveform"` — an HTML validity error. Duplicate IDs cause `getElementById()` to return only the first match, making the second element unreachable by ID. JavaScript that targets `#waveform` for waveform animation will silently operate only on the first instance. This is a P2 issue.

**`#apexLivePill`:** Gemini Live session toggle. This feature is not addressed in the V-11 spec. Its disposition (keep, remove, or defer) is an open decision (see Section 23, Open Decision 4).

**`#apexLiveTranscript`, `#apexLiveUserText`, `#apexLiveApexText`:** Gemini Live transcript overlay elements. Also outside the V-11 spec scope.

**Stub elements (present but not rendered):**

- `#cmdStars` (hidden) — canvas for a star field animation, initialised by `initStars()`
- `#cmdOrbCanvas` (hidden) — secondary orb canvas stub
- `#cmdWidgetLayer` (hidden) — stub layer for widget rendering

These stubs exist to maintain JavaScript compatibility without rendering visible content.

**`#cmdStrip`:** The bottom stat strip. Contains four metric cards: Balance, Messages, Tasks, System Health. The V-11 spec places these metrics on the TODAY page overview, not the COMMAND page. This element is a P1 displacement issue. Moving it to TODAY is unit E-4.

---

## Section 6 — Global Input Zone Analysis

**Location:** Outside `#page-command`. Outside `#pageWrap`. Lines 10325–10332.

The global input zone is structurally independent of any page container. It is always rendered and always visible, regardless of which page is active in the navigation system.

**Elements within the global input zone:**

- `#micBtn` — emoji `🎤` button. Accessibility concern: emoji characters are not reliably announced by screen readers in a consistent or meaningful way. This is a P2 issue.
- `#chatInput` — text input with `placeholder="Ask APEX anything…"`. The placeholder does not communicate the availability of voice interaction as an alternative.
- **Clear button** — clears the input field. No visual confirmation of the clear action.
- **Auto-listen button** (`data-fn="toggleAutoListen"`) — labelled "Auto". The label is not self-explanatory to a user unfamiliar with the feature. This is a P2 issue.
- **Send button** (`data-fn="sendChatCommand"`) — submits the text command.

**The P0 problem with global scope:** An input zone for APEX conversation that is always visible on all pages creates a semantically broken experience. On the TODAY page, the HEALTH page, the FINANCE page, or the FLOW page, the input zone is rendered and fully functional, but there is no visible conversation thread to receive or display the response. A user typing into `#chatInput` from any non-COMMAND page would receive audio TTS output but no visible text reply — the reply would be appended to the hidden `#chatLog` on the COMMAND page. This is unit E-7's scope: scoping the input zone to the COMMAND context only.

---

## Section 7 — Right Column and Feed

**`.cmd-feed-col`** contains `.apex-feed`. This is a live activity feed panel with the following structure:

- Header: "ACTIVITY FEED" text, a live pulsing indicator dot, and a "CLR" (clear) button
- `#apexFeedBody` — scrollable feed of activity items

The activity feed is a useful observability surface, but it is not part of the V-11 specification's COMMAND page layout. The spec's COMMAND page is a single-column conversation interface. The feed's correct home in the V-11 architecture is addressed in Open Decision 1 (Section 23): candidate destinations include SYSTEM → Activity, or a persistent floating panel on desktop only.

At viewport widths ≤ 1099px the feed column is already hidden by responsive CSS. This means the feed is currently invisible on all mobile and tablet viewports, making it a desktop-only feature.

---

## Section 8 — Below-Split Content (Constitution Charter)

Below `.cmd-split` on the COMMAND page sits the full APEX Constitution Charter. This is a substantial content block: a card containing six articles (A1 through A6) laid out in a CSS grid.

A developer comment in the HTML at this location explicitly notes: "V-11-E: moves to SYSTEM → Governance."

This content is misplaced. The COMMAND page is an operational interaction surface. Constitutional governance documentation belongs in the SYSTEM page's Governance section. Its presence on COMMAND adds visual noise and communicates nothing useful about the conversational capability of the page.

Moving the Charter is unit E-3. The move has no dependencies on other E-units and can be executed independently. Verification requires confirming the Charter is absent from `#page-command` and present in the SYSTEM governance section.

---

## Section 9 — JavaScript Initialisation and Lifecycle

**`cmdInitPage()` (line 17733):**

This function is the entry point for all COMMAND page initialisation. It begins by checking `CMD.initialized` — a guard flag that prevents double-initialisation if `cmdInitPage` is called multiple times (e.g., by a rapid page switch). The function then executes the following call sequence:

`loadCfg()` → `loadWidgets()` → `applyColors()` → `renderAllWidgets()` → `renderSidebarLayers()` → `renderSidebarProps()` → `renderStrip()` → `initStars()` → `initOrb()` → `fetchHealth()` → `startWidgetClocks()` → `startStripPoll()` → `_loadOrb()`

A widget canvas mousedown event handler is also attached during initialisation.

The initialisation call sequence reveals the full scope of what the COMMAND page currently considers its primary responsibilities: widget rendering, sidebar management, star field animation, orb animation, health metric polling, and strip stat polling. There is no call to restore chat history, render a welcome state, or prepare the conversation thread.

**`cmdPausePage()` (line 17749):**

Called when navigating away from COMMAND. Cancels star and orb animation frames. Clears widget clock and strip poll intervals. Does not persist any conversation state.

**`switchPage` wrapper (line 18217):**

- On navigation to `'command'`: `setTimeout(window.cmdInitPage, 60)` — a 60ms deferred init to allow DOM paint before the initialisation call
- On navigation away from any page (when name is not `'command'`): `window.cmdPausePage()`

**DOMContentLoaded auto-init (line 18221):**

If `#page-command` has the `.active` class at document load (i.e., COMMAND is the default landing page), `cmdInitPage()` is called immediately. The TTS provider is set to Gemini at this point.

**Agent panel reference (line 20263):**

Inside `applyRoleProfile()`, the code reads:

```
if (agentPanel) agentPanel.style.display = isMaster ? '' : 'none';
```

Where `agentPanel` is the result of `querySelector('#v11-cmd-agent-panel')`. This element does not exist anywhere in the `#page-command` HTML. The querySelector returns null, the guard `if (agentPanel)` catches it, and execution continues silently. The agent panel is a fully broken reference — it is neither visible nor operable for master users. This is a P1 issue.

---

## Section 10 — Chat Function Inventory

**`sendChatCommand()`:** Reads the value of `#chatInput`. Calls `sendChatCommandFromText()` with that value.

**`sendChatCommandFromText(command)`:** The primary chat orchestration function.
1. Calls `renderChatMessage('user', command)` — appends to hidden `#chatLog`
2. POSTs to `/chat` with the command text and session context
3. On response: calls `renderChatMessage('apex', reply)` — appends to hidden `#chatLog`
4. If `stream_plan.enabled`: calls `renderProgressiveResponse(chunks)` — progressive delay-based reveal, also in hidden `#chatLog`
5. Calls `speak(reply)` — routes to TTS backend (the only currently perceptible output channel)

**`renderChatMessage(role, message)`:** Creates a `div.chat-bubble` with role-specific styling. Appends to `#chatLog`. Because `#chatLog` is `display:none`, nothing is visible.

**`renderProgressiveResponse(chunks)`:** Implements fake progressive streaming. Content is already fully computed at the time this function runs. Chunks are revealed with `setTimeout` delays to simulate a streaming effect. All output goes to the hidden `#chatLog`. The underlying content computation is synchronous — this function only controls reveal timing.

**`renderCentreApprovalCard()`:** Builds an approval card HTML element and uses `insertBefore()` to place it before `#chatLog`. Because `#chatLog` is hidden, the approval card is also not visible. Approval workflows cannot function. This is the fifth P0 issue.

**`sendApprovalDecision(decision)`:** Removes the approval card from the DOM. Submits the decision as a chat text command through the normal `sendChatCommandFromText()` path.

**Chat history persistence:** There is no implementation of `apex_chat_history` in localStorage. The key is not read on init and not written on message render. Decision 7 from the locked spec mandates this feature (100-message FIFO, cleared on logout). It is entirely absent. This is a P0 issue.

---

## Section 11 — Voice Function Inventory and State Machine

**`startVoice()`:** Triggered by tap/click on `#plasmaOrb` (via `data-fn="startVoice"`). Initiates STT capture.

**`sendVoiceChatCommand(msg)`:** Posts transcribed voice input. Primary endpoint: `/api/voice-chat`. Fallback: `/chat`. This dual-endpoint architecture creates two separate code paths for what is functionally the same operation — text command submission. Maintaining two paths means bug fixes and behaviour changes must be applied twice. This is a P1 issue.

**STT backend:** Deepgram. Used for real-time speech transcription.

**TTS backends (in priority order):**
1. Gemini TTS
2. ElevenLabs TTS
3. Web SpeechSynthesis API (browser fallback)

**Auto-listen mode:** After APEX speaks a response, `toggleAutoListen` can keep the system in a continuous voice loop — immediately re-entering LISTENING state after SPEAKING completes. The disposition of this feature under V-11-E is an open decision (Section 23, Open Decision 3).

**Current voice state machine:**

```
STANDBY → LISTENING → THINKING → SPEAKING → STANDBY
                                           ↘ WAITING (if auto-listen active)
```

States are currently communicated via: orb animation changes, `#plasmaOrbSubLabel` text update, and `#cmdOrbState` (hidden).

---

## Section 12 — Backend `/chat` Route Analysis

**File:** `src/routes/chat.js`

**Authentication:** `requireAppAccess` middleware only. There is no `requireRole('master')` guard and no `checkCapability()` call anywhere in the route handler. Both master and user roles have identical access to all chat functionality and all tools.

**Model:** `HAIKU_MODEL` — identified as `claude-haiku-4-5-20251001`. The most cost-efficient Claude model is used for all chat interactions.

**Available tools (21 total):**

File operations: `save_note`, `read_file`, `delete_file`, `rename_file`, `list_files`  
Document operations: `list_documents`, `search_documents`, `create_file`, `summarise_file`, `delete_document`  
Finance: `log_expense`, `get_finance_summary`, `set_budget`  
Email: `check_emails`, `list_emails`  
Browser/research: `browser_research`, `browser_screenshot`, `browser_pdf`, `browser_scrape`, `browser_fill_form`, `browser_click`

All 21 tools are available to both master and user roles without discrimination.

**Streaming strategy:** No SSE. The route responds with a synchronous `POST /chat` → `res.json({reply, stream_plan})`. The `stream_plan` object carries `{enabled: bool, chunks: [{content, delay}]}`. All content is computed server-side in a single synchronous pass. The chunks and delays are pre-packaged and sent in the JSON response. The client receives the complete content and then artificially reveals it with `setTimeout` delays. This is fake streaming — it simulates the appearance of progressive output without the architectural benefits of SSE (true token-level streaming, reduced time-to-first-byte, connection keep-alive).

**Imported modules:** kernelChain, cognitive-orchestrator, session-state-registry, response-timing-engine, persistent-cognition-manager, executive-arbitration-engine, strategic-planning-engine, memory/gateway, memory/working-memory, temporal/session-tracker, domain-agents, agent-library, agent-command-handler.

---

## Section 13 — Critical P0 Issues

P0 issues block correct product behaviour. All five must be resolved before V-11-E can be considered functional.

**P0-1: `#chatLog` display:none — Chat output entirely invisible**

`#chatLog` carries `style="display:none"` as an inline style attribute. All text chat responses are appended to this element by `renderChatMessage()`. Because the element is not displayed, no chat output is ever visible. The product cannot function as a text conversation interface in this state. Voice TTS is the only perceptible output channel. Users typing commands receive no visible feedback.

Scope: `public/dashboard.html` — remove inline `display:none` from `#chatLog` and position correctly.

**P0-2: No localStorage chat history — Context lost on navigation**

`apex_chat_history` in localStorage is not implemented. Conversation context is silently discarded every time the user navigates away from COMMAND and returns, or reloads the browser. Decision 7 in the locked design decisions mandates a 100-message FIFO queue in localStorage, cleared on logout. This is entirely absent from the codebase.

Scope: `public/dashboard.html` — read on `cmdInitPage()`, write on every `renderChatMessage()` call.

**P0-3: No SSE streaming — 5–15s response latency with no visible feedback**

Responses arrive after a synchronous server round-trip that can take 5–15 seconds when tools are invoked. During this period, the only client-side feedback is a typing animation rendered inside the hidden `#chatLog`. The user sees nothing. The `stream_plan` fake-streaming mechanism produces the correct visual effect after the response arrives, but does nothing to address the perception of latency during the wait period.

Scope: Requires backend implementation authorisation before work begins (see Unit E-8).

**P0-4: Global input zone visible on all pages — Semantic and UX confusion**

The `#chatInput` input zone is outside `#pageWrap` and always visible. On non-COMMAND pages it creates a UI surface that accepts input but has no visible output target. Submitted commands on non-COMMAND pages are processed and voiced, but the text response is appended to the hidden `#chatLog` which the user cannot see.

Scope: `public/dashboard.html` — CSS hide input-zone when `#page-command` is not active, or relocate input inside `#page-command`.

**P0-5: Approval card inserts before hidden `#chatLog` — Approval workflow completely invisible**

`renderCentreApprovalCard()` uses `insertBefore(card, chatLog)`. The card is positioned immediately before `#chatLog` in the DOM. Because `#chatLog` is `display:none`, and because the approval card itself inherits or is subject to the same display context, approval decisions are invisible. The entire APEX approval workflow — an architecturally important interaction pattern — cannot function.

Scope: Resolved as a side effect of P0-1 fix, but requires verification that the card positions correctly in the new thread layout.

---

## Section 14 — P1 Issues

P1 issues significantly harm experience. They do not block basic functionality but represent meaningful departures from the V-11 specification.

**P1-1: PlasmaOrb is interactive — conflicts with Decision 2**

`#plasmaOrb` has `data-fn="startVoice"`. The locked spec (Decision 2) designates the PlasmaOrb as a non-interactive ambient background element at approximately 15% opacity, absent on mobile. The orb must not be the voice trigger. Voice triggering moves to the topbar mic icon.

**P1-2: APEX Constitution Charter on COMMAND — spec places it in SYSTEM → Governance**

The Charter is content, not operational UI. Its placement on the primary interaction page is a structural error. A developer comment in the HTML acknowledges this.

**P1-3: Three-column layout conflicts with single-column conversation spec**

The V-11 specification defines COMMAND as a single-column conversation thread with an input zone. The current `.cmd-split` grid layout, widget sidebar, and activity feed column all contradict this.

**P1-4: Bottom stat strip (`#cmdStrip`) on COMMAND — spec places it on TODAY**

Four metric cards (Balance, Messages, Tasks, System Health) belong to the TODAY overview. Their presence on COMMAND is a misplacement.

**P1-5: Widget system (`.cwid`, `#cmdWidgetLayer`, `#cmdSidebar`) not in V-11 spec**

The draggable widget canvas system is an undocumented, non-specified feature. Its disposition requires an explicit decision: remove or relocate to SYSTEM.

**P1-6: Activity feed in right column not in spec's COMMAND layout**

The feed is not referenced in the V-11 COMMAND page specification. Its destination is an open decision.

**P1-7: Dual voice endpoint (`/api/voice-chat` and `/chat`) — two code paths for one operation**

Voice-transcribed text and typed text are the same operation: text to APEX. A single code path should handle both. Maintaining two separate route handlers doubles the surface for bugs and divergence.

**P1-8: `stream_plan` fake-streaming — no architectural benefits of SSE**

The current approach computes all content synchronously, pre-packages it, and times its reveal on the client. This gives the visual appearance of streaming without the actual latency benefit. If SSE is authorised for E-8, `stream_plan` should be replaced.

**P1-9: Backend `/chat` has no capability enforcement — user can call all 21 tools**

The absence of `checkCapability()` or `requireRole('master')` means both roles have full tool access. Finance tools, browser automation, memory access, and system operations are all unrestricted for the user role.

**P1-10: `#v11-cmd-agent-panel` referenced but not present in HTML**

`applyRoleProfile()` queries for `#v11-cmd-agent-panel` and conditionally shows it for master users. The element does not exist in `#page-command`. The agent panel is non-functional and invisible for all roles.

**P1-11: Mobile guard for PlasmaOrb not implemented**

Decision 2 specifies the orb should not render on mobile (WebGL performance and battery concerns). No mobile detection or conditional rendering is present for `#plasmaOrb`.

---

## Section 15 — P2 Issues (Refinements)

**P2-1: Duplicate `.cmd-split` CSS definition** (lines 2507–2513 and 3018–3028). Dead rule at line 2507.

**P2-2: Duplicate `id="waveform"`** — two elements share the same ID. HTML validity error. JavaScript targeting this ID by `getElementById` reaches only the first instance.

**P2-3: Console.log latency instrumentation in production code** — development debugging output present in the production codebase.

**P2-4: `clearChat` button has no visual feedback** — no confirmation animation, toast, or indication that history was cleared.

**P2-5: Auto-listen button label "Auto" not self-explanatory** — users unfamiliar with the feature cannot determine its purpose from the label alone.

**P2-6: Mic button uses emoji `🎤`** — accessibility concern. Screen readers announce emoji inconsistently. Should be an SVG icon with `aria-label`.

**P2-7: `placeholder="Ask APEX anything…"` does not communicate voice option** — placeholder implies text-only interaction. Voice availability is undisclosed.

**P2-8: Input zone not contextually adapted** — same input zone appears on all pages with identical placeholder text regardless of page context or active task.

---

## Section 16 — P3 Issues (Future Scope)

**P3-1: Command palette (`⌘K`) referenced in V-11 spec but not implemented.**

**P3-2: Voice result overlay (SD-1) not implemented** — the specification describes a non-destructive overlay that slides up to 40% viewport height when a voice result is ready. Not present.

**P3-3: Swipe navigation dots not implemented** — mobile swipe-to-navigate with dot position indicators not implemented.

**P3-4: `apex_default_page` SYSTEM → Settings UI not implemented** — the ability for users to configure their default landing page is not exposed.

**P3-5: Keyboard shortcuts (1–6, V, R, ?) not fully implemented** — shortcut keys for page navigation and core operations are partially or wholly absent.

---

## Section 17 — User Comprehension Audit (Questions 1–20)

The following 20 questions represent a heuristic comprehension test applied from the perspective of a first-time or returning user arriving at the COMMAND page.

| # | Question | Current State |
|---|---|---|
| 1 | What is this page? | **UNCLEAR** — Visual is orb + widgets + stats. No heading or label identifies this as a conversation interface. |
| 2 | What can I do here? | **UNCLEAR** — No visible capability list, welcome state, or contextual hints. |
| 3 | What should I type or say? | **PARTIALLY CLEAR** — Placeholder "Ask APEX anything…" is present. |
| 4 | What does APEX understand? | **MISSING** — Tool capabilities are completely undisclosed. |
| 5 | What is APEX currently doing? | **PARTIALLY CLEAR** — Orb state changes with voice activity; no text description of state. |
| 6 | What information is APEX using? | **MISSING** — No context disclosure. |
| 7 | What happens after I submit something? | **UNCLEAR** — Reply appears in hidden div; only TTS audio is audible. |
| 8 | Can APEX take action? | **MISSING** — No disclosure of action capabilities. |
| 9 | Which actions require approval? | **MISSING** — Approval workflow invisible. |
| 10 | What is the scope of current interaction? | **MISSING** — No session scope, context boundary, or domain indicator. |
| 11 | What does APEX know vs. not know? | **MISSING** — Knowledge boundaries completely undisclosed. |
| 12 | How do I inspect evidence? | **MISSING** — No expandable evidence layer. |
| 13 | How do I understand why APEX answered? | **MISSING** — No reasoning disclosure pathway. |
| 14 | How do I know whether something succeeded? | **UNCLEAR** — Only voice feedback; no visual success state. |
| 15 | How do I recover from failure? | **MISSING** — No retry mechanism, error state, or recovery guidance. |
| 16 | How do I start a new task or conversation? | **PARTIALLY CLEAR** — Clear button is visible. |
| 17 | How do I return to previous context? | **MISSING** — No history persistence; context is lost. |
| 18 | How does voice work? | **PARTIALLY CLEAR** — Orb subtext "TAP TO SPEAK" provides minimal affordance. |
| 19 | What can User do vs. Master? | **MISSING** — Capability differentiation is invisible to the user. |
| 20 | Is any of this discoverable? | **MISSING** — No progressive disclosure, no help surface, no onboarding state. |

**Summary score:** 3 PARTIALLY CLEAR, 17 UNCLEAR or MISSING. The COMMAND page fails the user comprehension audit by a wide margin. No question receives a CLEAR rating.

---

## Section 18 — Locked Design Decisions Relevant to V-11-E

The following decisions from the V-11 Design Decisions register are locked and directly constrain V-11-E implementation.

**Decision 2 — PlasmaOrb as ambient background:**

The PlasmaOrb is a visual background element only. It must be rendered at approximately 15% opacity. It must not respond to user interaction. It must not be rendered on mobile devices (WebGL performance and battery considerations). The voice trigger must move to a dedicated topbar mic icon.

Implications for V-11-E: Remove `data-fn="startVoice"` from `#plasmaOrb`. Reduce opacity. Add mobile detection guard. Implement voice trigger on topbar mic icon.

**Decision 7 — localStorage chat history:**

The key `apex_chat_history` in localStorage must store the conversation thread. Capacity: 100 messages (FIFO eviction). The history must be cleared on user logout. On COMMAND page initialisation, the stored history must be read and rendered into the thread.

Implications for V-11-E: Implement in E-6. No backend changes required. Pure frontend implementation.

**Decision 8 — SSE streaming via GET `/api/chat/stream`:**

Real token-level streaming must replace the synchronous `POST /chat` response model. This requires: a new backend route (`src/routes/chat-stream.js`), SSE protocol implementation, an EventSource client in `dashboard.html`, and mounting the new route in `server.js`.

Implications for V-11-E: Decision 8 requires explicit implementation authorisation before E-8 work begins. The current `stream_plan` fake-streaming approach should remain in place until SSE is ready, to avoid a regression to zero progressive feedback.

**SD-1 — Voice result overlay:**

When a voice interaction completes while the user is on a non-COMMAND page, a non-destructive overlay must slide up from the bottom to 40% viewport height and display the APEX text response. This prevents voice results from being completely invisible on other pages.

Implications for V-11-E: Flagged as P3. Requires implementation after the core conversation thread (E-1 through E-7) is stable.

---

## Section 19 — Master / User Capability Matrix (Current vs. Target)

**Current state — all capabilities are flat:**

| Capability | Master (current) | User (current) | Backend enforced? |
|---|---|---|---|
| Text chat | Yes | Yes | requireAppAccess only |
| Voice chat | Yes | Yes | requireAppAccess only |
| All 21 tool calls | Yes | Yes | NOT enforced — P1 gap |
| Agent panel visibility | Yes | Hidden (CSS only) | Not backend-enforced |
| Finance tools | Yes | Yes | Not capability-checked |
| Browser / research | Yes | Yes | Not capability-checked |
| Memory access | Yes | Yes | Not enforced |
| System health | Yes | Yes | Not enforced |

The agent panel being hidden by CSS for user role is a client-side concern only. A technically capable user can override this CSS. No server-side role gate protects agent orchestration endpoints.

**Target state — capability enforcement active post E-10:**

| Capability | Master | User | Backend enforcement |
|---|---|---|---|
| Text chat (personal scope) | Yes | Yes | requireAppAccess |
| Voice chat | Yes | Yes | requireAppAccess |
| Personal tools (notes, finance, health) | Yes | Yes | checkCapability |
| Agent orchestration | Yes | No | checkCapability('agents.orchestrate') |
| System configuration | Yes | No | requireRole('master') |
| Research / browser | Yes | Yes | checkCapability('research') |
| Emergency access protocols | Yes | No | requireRole('master') |

The transition from current to target state requires backend changes in `src/routes/chat.js` and `lib/middleware.js`. Unit E-10 addresses this and requires explicit backend implementation authorisation.

---

## Section 20 — Progressive Disclosure Model for COMMAND

V-11-E must implement a layered information architecture on the COMMAND page, progressively revealing detail without overwhelming the primary response view.

**L0 — Immediate interaction (always visible, no user action required):**

- The APEX reply text — one clear sentence or short paragraph
- Confidence dot and word if applicable (e.g., "High confidence")
- A single primary action button if the context requires one (e.g., "View detail", "Approve", "Retry")

L0 must never expose: API identifiers, model names, token counts, agent role names, internal system vocabulary, raw tool output, or error stack traces.

**L1 — Contextual detail (single tap on a disclosure element):**

- What APEX did to produce the answer (process summary)
- Tool use summary (e.g., "Searched 3 sources · Checked calendar · Read 2 notes")
- Action cost, risk level, or reversibility assessment if an action was taken

**L2 — Evidence (second tap):**

- Source references, data points, memory references used
- Raw tool output in a readable format (not raw JSON)
- Cited documents or URLs

**L3 — Reasoning and operational detail (third tap):**

- Step-by-step reasoning trace
- Agent execution log if multiple agents were invoked
- Decision pathway that led to the response

**L4 — Technical detail (explicit "Show system detail" toggle, SYSTEM users or master role only):**

- Request identifier
- Model name and version
- Token count (input and output)
- Response latency (milliseconds)
- Raw JSON tool results

This L0–L4 model must be implemented as a unified component so it can be applied consistently across all response archetypes (see Section 21).

---

## Section 21 — Response Archetypes

All APEX replies must be rendered using one of twelve defined archetypes. Each archetype maps to specific L0 content, disclosure options, and action button configurations.

**Archetype 1 — Simple answer:** L0 text only. No expandable disclosure needed. Example: "Your next task is the quarterly review, due Friday."

**Archetype 2 — Informational answer:** L0 text + L1 evidence tap. Used when APEX consulted sources, memory, or documents to produce the answer.

**Archetype 3 — Recommendation:** L0 text + one primary action button ("Apply this", "View options") + L1 detail. Used when APEX suggests a course of action.

**Archetype 4 — Decision:** L0 summary of the decision context + L1 options laid out clearly + action buttons (Accept / Reject / View Full Detail). Used for branching decisions.

**Archetype 5 — Task or action completed:** L0 "Done" confirmation with action description + L1 what happened + L2 step trace. Used when a tool was called and completed successfully.

**Archetype 6 — Action awaiting approval:** Inline approval card visible in the conversation thread (not hidden, not before a hidden element). Contains: what action was requested, what it will do, estimated risk, and Approve / Reject buttons. Corresponds to the current broken `renderCentreApprovalCard()` behaviour that must be fixed under E-1 and E-9.

**Archetype 7 — Clarification required:** L0 question from APEX + suggestion of possible completions or clarifications. Used when input is ambiguous.

**Archetype 8 — Knowledge gap:** L0 "I don't know X" + L1 what APEX checked before concluding it didn't know + a suggestion for how to find the information. Avoids the perception of APEX being evasive.

**Archetype 9 — Failed action:** L0 "I couldn't complete that" with a one-sentence reason + L1 detailed failure explanation + retry button or alternative suggestion.

**Archetype 10 — Degraded service:** L0 amber-coloured notice ("Some features may be limited") + L1 what service is unavailable and for how long. Used when a backend dependency is down.

**Archetype 11 — Multi-step operation in progress:** L0 progress indicator showing steps completed / steps remaining → transitions to L0 completion confirmation + L1 step summary on completion.

**Archetype 12 — Agent execution:** L0 "Working on it…" with a low-key animation → async progress updates → L0 final result. Agent names and orchestration vocabulary must not appear in L0.

---

## Section 22 — Architectural Gaps Summary

The following table provides a consolidated severity-indexed view of all identified architectural gaps.

| ID | Issue | Severity | Unit |
|---|---|---|---|
| AG-01 | `#chatLog` display:none — text output invisible | P0 | E-1 |
| AG-02 | No localStorage chat history | P0 | E-6 |
| AG-03 | No SSE streaming — synchronous latency, no feedback | P0 | E-8 (auth req.) |
| AG-04 | Global input zone on all pages | P0 | E-7 |
| AG-05 | Approval card before hidden `#chatLog` | P0 | E-1, E-9 |
| AG-06 | PlasmaOrb interactive — conflicts with Decision 2 | P1 | E-5 |
| AG-07 | Constitution Charter on COMMAND — spec: SYSTEM | P1 | E-3 |
| AG-08 | Three-column layout — spec: single column | P1 | E-2 |
| AG-09 | Stat strip on COMMAND — spec: TODAY | P1 | E-4 |
| AG-10 | Widget system not in V-11 spec | P1 | Open Decision 2 |
| AG-11 | Activity feed in right column not in spec | P1 | Open Decision 1 |
| AG-12 | Dual voice endpoint — two code paths | P1 | E-5, E-7 |
| AG-13 | Fake streaming (`stream_plan`) — no SSE benefits | P1 | E-8 |
| AG-14 | No capability enforcement on `/chat` | P1 | E-10 (auth req.) |
| AG-15 | `#v11-cmd-agent-panel` referenced, absent in HTML | P1 | E-9 |
| AG-16 | No mobile guard for PlasmaOrb WebGL | P1 | E-5 |
| AG-17 | Duplicate `.cmd-split` CSS | P2 | E-2 |
| AG-18 | Duplicate `id="waveform"` | P2 | E-5 |
| AG-19 | Console.log in production | P2 | Cleanup |
| AG-20 | No visual feedback on clearChat | P2 | E-9 |
| AG-21 | "Auto" button not self-explanatory | P2 | E-7 |
| AG-22 | Emoji mic button — accessibility | P2 | E-7 |
| AG-23 | Placeholder doesn't mention voice | P2 | E-7 |
| AG-24 | Input zone not contextually adapted | P2 | E-7 |
| AG-25 | Command palette (`⌘K`) not implemented | P3 | Post E-series |
| AG-26 | SD-1 voice result overlay not implemented | P3 | Post E-series |
| AG-27 | Swipe navigation dots not implemented | P3 | Post E-series |
| AG-28 | Default page settings UI not implemented | P3 | Post E-series |
| AG-29 | Keyboard shortcuts incomplete | P3 | Post E-series |

---

## Section 23 — Open Decisions Requiring Resolution

The following six decisions have not been locked and must be resolved before the corresponding V-11-E units can be designed or executed. These decisions are recorded here as requiring explicit owner resolution — they are not proposed for resolution in this document.

**Open Decision 1 — Activity feed disposition**

Currently: right column of COMMAND.
Spec: Not referenced on the COMMAND page.
Options:
(a) Move to SYSTEM → Activity as a dedicated subpage
(b) Float as a persistent panel on desktop only, accessible via a toggle
(c) Remove from V-11-E scope; address in a subsequent phase

Blocking: E-2 (single-column layout) cannot be finalised without knowing whether the feed stays on COMMAND in any form.

**Open Decision 2 — Widget system disposition**

Currently: `.cwid` draggable widgets, `#cmdSidebar` 256px editor, `#cmdWidgetLayer` stub.
Spec: Not present in V-11 spec.
Options:
(a) Remove entirely from the codebase
(b) Move to SYSTEM as a customisation surface
(c) Preserve as a non-default mode accessible via a toggle

Blocking: E-2 depends on knowing whether widget functionality must be preserved or can be removed.

**Open Decision 3 — Auto-listen mode persistence and settings**

Currently: `toggleAutoListen` is a session-only state.
Options:
(a) Persist via `apex_auto_listen` localStorage key
(b) Expose as a setting in SYSTEM → Settings
(c) Remove; replace with a gesture-based activation model

Blocking: E-5 (PlasmaOrb ambient) and E-7 (input zone) both touch auto-listen behaviour.

**Open Decision 4 — Gemini Live integration disposition**

Currently: `#apexLivePill` toggle, `#apexLiveTranscript`, `#apexLiveUserText`, `#apexLiveApexText` all exist in `.cmd-stage`.
Spec: Not referenced in V-11.
Options:
(a) Keep as a parallel interaction mode (pill toggle visible in COMMAND)
(b) Defer: remove from COMMAND, revisit in a later phase
(c) Remove entirely

Blocking: E-2 (layout) needs to accommodate or exclude the Gemini Live overlay.

**Open Decision 5 — `stream_plan` fate when SSE is not yet authorised**

If E-8 (SSE) does not receive authorisation in this V-11-E cycle, the `stream_plan` fake-streaming mechanism continues to serve as the progressive reveal mechanism.
Options:
(a) Leave `stream_plan` in place until SSE is ready; accept it as a stepping stone
(b) Remove `stream_plan` now; accept a regression to flat synchronous responses until SSE is implemented
(c) Improve `stream_plan` (e.g., add a loading spinner before the response arrives) as an interim measure

Blocking: E-9 (response card archetypes) must know how progressive reveal will function.

**Open Decision 6 — Formal capability map for chat tool restrictions**

Which specific tools from the 21-tool inventory should be restricted to master role only? The current tool list treats all tools equally. A formal capability map is needed before E-10 can be scoped.

Candidate restrictions (proposed, not locked):
- `browser_fill_form`, `browser_click` — high risk; master only
- `set_budget`, `log_expense` — configurable per-user basis
- `delete_document`, `delete_file`, `rename_file` — master only or require approval
- `check_emails`, `list_emails` — user-accessible (personal scope)

Blocking: E-10 cannot be scoped or implemented without this map.

---

## Section 24 — Proposed V-11-E Implementation Sequence (Units E-1 through E-10)

Units are sequenced by dependency order and P-level priority. Units E-8 and E-10 require explicit authorisation before work begins.

**Unit E-1: Chat thread visibility (P0 fix)**

Objective: Make chat messages visible in the COMMAND page.  
File: `public/dashboard.html`  
Change: Remove `display:none` from `#chatLog`. Position `#chatLog` correctly within the COMMAND page layout. Verify approval card (`renderCentreApprovalCard`) is visible.  
Dependencies: None. This is the foundational fix.  
Tests: Send a text command via `#chatInput`. Verify `div.chat-bubble` elements are rendered and visible in the DOM. Verify the approval card is visible when a decision is triggered.  
Regression check: V-11-D1 (TODAY), V-11-B (state architecture)  
Rollback: Re-add `style="display:none"` to `#chatLog`

**Unit E-2: Single-column conversation layout (P1)**

Objective: Replace the `.cmd-split` multi-column grid with a single-column flex layout: conversation thread above, input zone below.  
File: `public/dashboard.html` — CSS and HTML structure within `#page-command`  
Change: Replace `.cmd-split` with a flex-column container. Remove or defer `.cmd-feed-col`. Consolidate `.cmd-main-col` to full width.  
Dependencies: E-1 (chat thread must be visible before the layout is validated)  
Open Decision dependencies: Open Decision 1 (feed), Open Decision 2 (widgets)  
Tests: Thread is visible and scrollable. Input zone is anchored at column bottom. Mobile layout renders correctly in single-column mode.  
Regression check: V-11-B, V-11-D1, V-11-D2

**Unit E-3: Move Constitution Charter to SYSTEM → Governance (P1)**

Objective: Remove the APEX Constitution Charter from the COMMAND page and relocate it to the SYSTEM governance section.  
File: `public/dashboard.html`  
Change: Cut the Charter HTML block from below `.cmd-split` in `#page-command`. Paste into `#page-governance` or the equivalent SYSTEM subpage.  
Dependencies: None. Fully independent.  
Tests: Charter HTML block absent from `#page-command`. Charter visible and correctly rendered in SYSTEM governance section.  
Regression check: V-11-A (governance page reachable and content renders)

**Unit E-4: Move stat strip to TODAY (P1)**

Objective: Remove `#cmdStrip` from the COMMAND page. Integrate stat strip metrics into the TODAY overview.  
File: `public/dashboard.html`  
Change: Remove `#cmdStrip` and its four metric cards from `#page-command`. Add to TODAY overview section. Relocate `renderStrip()` call from `cmdInitPage()` to the TODAY page init function. Ensure `startStripPoll()` only runs when TODAY is active.  
Dependencies: E-2 (COMMAND layout change should precede strip removal for visual consistency)  
Tests: Strip not rendered in `#page-command`. Strip rendered in TODAY page. Poll pauses when TODAY is not active.

**Unit E-5: PlasmaOrb as ambient background (P1, Decision 2)**

Objective: Transform orb from interactive voice trigger to non-interactive ambient background element.  
File: `public/dashboard.html`  
Changes:
- Remove `data-fn="startVoice"` from `#plasmaOrb` canvas
- Set orb CSS opacity to approximately 15%
- Remove or reassign `#plasmaOrbSubLabel` ("STANDBY · TAP TO SPEAK")
- Add mobile detection: do not render `#plasmaOrb` on mobile viewports
- Move voice trigger to topbar mic icon  

Dependencies: E-2 (layout must be set before orb position is finalised)  
Side effects: Resolves AG-18 (duplicate `#waveform` can be cleaned up during this unit), resolves AG-16 (mobile guard)  
Tests: Clicking the orb canvas does not trigger `startVoice()`. Orb is absent on mobile viewport. Topbar mic icon triggers voice correctly.

**Unit E-6: localStorage chat history (P0, Decision 7)**

Objective: Implement `apex_chat_history` in localStorage with 100-message FIFO and logout clear.  
File: `public/dashboard.html`  
Changes:
- On every `renderChatMessage()` call: append to `apex_chat_history` array in localStorage; evict oldest if over 100
- On `cmdInitPage()`: read `apex_chat_history` from localStorage and render each stored message into `#chatLog`
- On logout: clear `apex_chat_history` key  

Dependencies: E-1 (chatLog must be visible), E-2 (layout must accommodate scrolling thread)  
Tests: Submit 5 messages. Navigate away. Return to COMMAND. Verify all 5 messages are rendered. Log out. Return. Verify thread is empty.  
No backend changes required.

**Unit E-7: Global input zone scoped to COMMAND only (P0)**

Objective: Make `#chatInput`, `#micBtn`, and related input elements visible only when `#page-command` is the active page.  
File: `public/dashboard.html`  
Approach options:
(a) CSS: add rule to hide the global input zone when `body` does not have a COMMAND-active class
(b) Move the input zone HTML inside `#page-command` (structurally cleaner but higher regression risk)

Option (a) is lower risk for this unit. Option (b) should be the target state if E-2 produces a stable single-column layout.  
Dependencies: E-1, E-2  
Side effects: Resolves AG-21, AG-22, AG-23 as part of input zone redesign (labels, accessibility, placeholder text improvements)  
Tests: Navigate to TODAY. Verify input zone is not visible. Navigate to COMMAND. Verify input zone is visible. Send a message. Verify response is visible in thread.

**Unit E-8: SSE streaming — GET `/api/chat/stream` (Decision 8 — requires explicit authorisation)**

Objective: Replace synchronous `POST /chat` with a true SSE streaming endpoint. Provide real-time token-by-token response rendering in the COMMAND thread.  
Files:
- `public/dashboard.html` — EventSource client replaces `fetch(POST /chat)`
- `src/routes/chat-stream.js` — new route file implementing SSE with `text/event-stream` content type
- `server.js` — mount `/api/chat/stream`  

Dependencies: E-1, E-2, E-6, E-7  
Status: REQUIRES EXPLICIT BACKEND IMPLEMENTATION AUTHORISATION before work begins.  
Notes: `stream_plan` fake-streaming remains in place as the interim mechanism until this unit is authorised and implemented.

**Unit E-9: Response card archetypes (P1)**

Objective: Implement structured response rendering for all 12 archetypes (Section 21). Replace flat `div.chat-bubble` with a component-based archetype renderer supporting L0–L4 progressive disclosure.  
File: `public/dashboard.html`  
Dependencies: E-1, E-2, E-6 (conversation thread must be stable before card design is built on top of it)  
Open Decision dependencies: Open Decision 5 (`stream_plan` vs. SSE interim behaviour)  
Tests: Each of the 12 archetypes is visually verifiable. L0 text visible without interaction. L1 expands on tap. Approval card visible (fixes AG-15, AG-05 residuals).

**Unit E-10: Backend capability enforcement (P1 — requires explicit authorisation)**

Objective: Add `checkCapability()` calls to `/chat` route to restrict tool access by role.  
Files: `src/routes/chat.js`, `lib/middleware.js`  
Dependencies: Open Decision 6 (formal capability map must be locked before this unit is scoped)  
Status: REQUIRES EXPLICIT BACKEND IMPLEMENTATION AUTHORISATION and a locked capability map before work begins.

---

## Section 25 — Voice State Machine: Current and Target

**Current state machine:**

```
STANDBY
  └─ [tap orb] → LISTENING
                    └─ [STT complete] → THINKING
                                          └─ [response ready] → SPEAKING
                                                                   └─ STANDBY
                                                                   └─ WAITING (if auto-listen)
                                                                       └─ LISTENING
```

State communication: orb animation changes, `#plasmaOrbSubLabel` text, hidden `#cmdOrbState`. No text state visible in the COMMAND thread.

**Target state machine (V-11-E):**

```
IDLE
  Topbar mic icon: dim
  Thread: no active state indicator

  └─ [mic icon tap] → LISTENING
                         Topbar mic icon: pulsing cyan
                         Waveform animation visible
                         Thread: "Listening…" inline state indicator
                         
                         └─ [STT complete, input dispatched] → PROCESSING
                                                                  Topbar mic icon: rotating dots
                                                                  Thread: "APEX is thinking…" inline
                                                                  
                                                                  └─ [response ready] → RESPONDING
                                                                                          Speaker animation
                                                                                          Text appearing in thread (archetype card)
                                                                                          
                                                                                          └─ COMPLETE
                                                                                               Result visible in thread
                                                                                               SD-1 overlay if on non-COMMAND page
                                                                                               Mic icon returns to dim
                                                                                               
                                                                                               └─ IDLE
                                                                                               └─ LISTENING (if auto-listen)

  Error path: any state → ERROR
                              Thread: "I didn't catch that" inline (Archetype 9 variant)
                              Retry button
                              → IDLE
```

Key changes from current to target:
1. Voice trigger moves from orb to topbar mic icon
2. State is communicated via the conversation thread, not only via the orb
3. ERROR state has an explicit inline recovery path
4. SD-1 overlay activates when the user is on a non-COMMAND page

---

## Section 26 — Dependency Graph

```
E-1 (chatLog visible)
  └─ E-2 (single-column layout)
       ├─ E-4 (stat strip → TODAY)
       ├─ E-5 (orb ambient)
       ├─ E-6 (localStorage history)
       │    └─ E-7 (input zone scoping)
       │         └─ E-8 (SSE streaming) [auth required]
       └─ E-9 (response archetypes)
            └─ E-10 (capability enforcement) [auth + capability map required]

E-3 (Charter → SYSTEM) — independent, no blocking dependencies
```

E-1 is the root dependency for all units in the primary chain. E-3 is fully independent and can be executed in parallel with E-1 without risk.

E-8 and E-10 are terminal nodes that require authorisation gates before execution.

---

## Section 27 — Regression Surface

Each V-11-E unit carries regression risk against previously certified phases. The following table maps units to their regression exposure.

| Unit | Regression risk areas |
|---|---|
| E-1 | V-11-D1 (TODAY page init does not accidentally render chatLog). V-11-B (state manager does not conflict with restored history). |
| E-2 | V-11-B (universal state architecture — page switching and init must still function). V-11-D1 (TODAY layout unaffected). V-11-D2 (navigation state). |
| E-3 | V-11-A (SYSTEM page — Charter must appear correctly; governance route must be reachable). |
| E-4 | V-11-D1 (TODAY must receive the stat strip without breaking existing TODAY layout). Strip poll lifecycle must not leak into non-COMMAND pages. |
| E-5 | V-11-B (voice state manager). Any page that references orb state (ensure no other page calls `startVoice` via orb). |
| E-6 | V-11-B (page switch clears or preserves history as appropriate). Logout must clear `apex_chat_history`. |
| E-7 | All non-COMMAND pages must not show the input zone. Verify on: TODAY, SYSTEM, HEALTH, FINANCE, FLOW. |
| E-8 | V-11-C (API contract — new `/api/chat/stream` must not break existing `/chat` clients if both are in use during transition). |
| E-9 | E-1, E-2, E-6 (all must be stable before card archetypes are layered on top). |
| E-10 | V-11-B (role profiles). V-11-C (API contract). Must verify user role cannot call master-restricted tools after enforcement is active. |

All units must be tested against the mobile viewport (≤ 1099px breakpoint) as well as desktop, given that the CSS responsive layer is already established and any structural changes risk breaking the mobile collapse behaviour.

---

## Section 28 — Final Recommendation

The V-11-E implementation is clearly scoped and the path is unambiguous. The reconnaissance is complete and has produced no surprises beyond the severity of the P0 cluster, which warrants immediate attention.

**The highest-priority action is E-1.** Removing `display:none` from `#chatLog` is a one-line change that restores the fundamental product proposition: text chat output is visible to the user. No other infrastructure, no new code patterns, and no design decisions are required to begin this fix. It should be the first commit in the E-series.

**E-3 can be executed in parallel with E-1.** Moving the Constitution Charter to SYSTEM Governance requires no changes to conversation infrastructure and carries no dependency risk. It can be started and completed independently while the thread visibility work proceeds.

**E-2 through E-7 form the primary implementation chain.** They should be executed in dependency order (E-1 → E-2 → E-4/E-5/E-6 → E-7), with each unit certified against its regression surface before the next unit begins. The temptation to batch multiple units into a single commit must be resisted — the regression surface is wide enough that isolated units with discrete rollback points significantly reduce risk.

**E-8 (SSE streaming) and E-10 (capability enforcement) require explicit authorisation** before any work begins. These two units involve backend route creation and auth middleware changes, respectively. Neither should be started speculatively. If authorisation is not granted in this V-11-E cycle, the existing `stream_plan` mechanism remains in place and E-8 is deferred; the `/chat` route remains flat and E-10 is deferred.

**The six open decisions (Section 23) must be resolved before E-2, E-7, E-9, and E-10 can be fully designed.** In particular, Open Decision 1 (activity feed) and Open Decision 2 (widget system) are blocking E-2. These decisions should be brought to the project owner for resolution immediately — they are not technical questions and cannot be resolved by implementation alone.

The user comprehension audit (Section 17) shows that 17 of 20 comprehension questions are currently UNCLEAR or MISSING. V-11-E, when fully implemented through E-9, addresses at least 14 of those 17 failures. The remaining three (questions 6, 11, and 19) depend on progressive disclosure implementation (E-9) and capability enforcement (E-10) completing successfully.

The COMMAND page will be a production-quality conversation interface when V-11-E is complete. The technical path is established. Execution can begin immediately on E-1 and E-3, pending owner resolution of the six open decisions.

---

*Document ends. No application code was modified during this reconnaissance.*
