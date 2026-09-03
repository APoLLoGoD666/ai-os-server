# V-11-E IMPLEMENTATION CONTRACT
## Canonical Implementation Authority — COMMAND Conversation Interface

**Document class:** Canonical Implementation Contract — Normative
**Status:** DRAFT (Decision Resolution) — Awaits owner approval for E-8 (SSE) and E-10 (capability enforcement) as flagged
**Date:** 2026-09-01
**Predecessor authorities:** V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md, V-11-DESIGN-DECISIONS.md, V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md, V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE.md
**Baseline (production deployment reference):** dd1dd1f (V-09 certified production). Locally certified but not yet deployed: V-11-A (0dce44d), V-11-B (ca155c1), V-11-C (3c1e674), V-11-D1+D2 (e85b33f).
**Application code changes in this document:** NONE
**Production state:** UNCHANGED

---

## NORMATIVE LANGUAGE

- **MUST** — mandatory; no exception
- **MUST NOT** — prohibited; no exception
- **SHOULD** — strongly recommended; deviation requires justification
- **SHOULD NOT** — strongly discouraged
- **MAY** — permitted

---

# SECTION A — PURPOSE

V-11-E converts the COMMAND destination from a widget/orb/voice-only board into a coherent conversation surface consistent with the V-11 experience architecture and the V-11-N identity/profile decision lock. It restores visible chat output, establishes persistent per-identity chat history, replaces the multi-column widget layout with the specified single-column conversation column, scopes the input zone to COMMAND, transforms the PlasmaOrb into an ambient background (desktop only), and prepares the surface for progressive-disclosure response cards. Two units (SSE streaming and backend capability enforcement) are held behind explicit owner authorisation and do not proceed without it.

---

# SECTION B — AUTHORITY

| Authority | Role in this contract |
|---|---|
| V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md (ac2aff6, updated 210bd2c) | Governing spec for the six destinations, COMMAND layout, voice, L0–L4 disclosure, state model. |
| V-11-DESIGN-DECISIONS.md (210bd2c) | Ten locked decisions (D1–D10) + SD-1 through SD-5. |
| V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md | RD-1 (COMMAND universal, authority-filtered), RD-2 (SYSTEM = PROFILE for User), RD-3/D7 (privacy-first layered access). Security invariants I-1 through I-15. |
| V-11-N-IDENTITY-PROFILE-ARCHITECTURE-RECONCILIATION.md | Supporting evidence; superseded on RD-1/RD-2/RD-3 by the DECISION-LOCK. |
| V-11-N-IDENTITY-PROFILE-DECISIONS.md | Decision register (superseded on covered items by DECISION-LOCK). |
| V-11-A-IMPLEMENTATION-CERTIFICATION.md | Multi-profile shell foundation (29/29). |
| V-11-B-IMPLEMENTATION-CERTIFICATION.md | Universal state architecture (29/29). |
| V-11-C-IMPLEMENTATION-CERTIFICATION.md | Canonical API error semantics. |
| V-11-D1-TODAY-NAVIGATION-IMPLEMENTATION-CERTIFICATION.md | TODAY surface + nav labels (45/45). |
| V-11-D2-IMPLEMENTATION-CERTIFICATION.md | TODAY default + hash sync (37/37). |
| V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE.md | Full inventory of P0–P3 issues and six open decisions (this document resolves them). |

All prior certifications remain in force. Nothing in this contract weakens or amends them; V-11-E is additive and corrective within the COMMAND scope.

---

# SECTION C — LOCKED DECISIONS INHERITED FROM V-11

The following decisions are constitutional for V-11-E. They MUST NOT be revisited by this contract; every design choice below either implements them or defers to them.

**Identity / Authority (V-11-N DECISION-LOCK):**
- **RD-1 — COMMAND is universal, authority-filtered.** All six destinations exist for Master and User. COMMAND is the chat entry point for both. No secondary topbar chat input.
- **RD-2 — SYSTEM/PROFILE parity.** SYSTEM slot renders admin surfaces for Master; PROFILE information architecture for User.
- **RD-3 / D7 — Privacy-first layered access.** Master MUST NOT access Layer-3 User content without the emergency protocol. User data is genuinely private.
- **Security invariants I-1 through I-15.** Server-side authorisation is the primary boundary. UI hiding is defence-in-depth only.

**Experience (V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md):**
- Six canonical destinations: TODAY · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM.
- COMMAND single-column conversation layout with input zone (spec §7.2).
- L0 always visible; L1/L2 progressive; L3 optional; L4 opt-in SYSTEM-only (spec Part III).
- Voice: topbar mic (desktop + mobile), non-destructive overlay when off-COMMAND (SD-1).
- Confidence: coloured dot + one-word label at L0, sentence at L1 (D10).

**Design (V-11-DESIGN-DECISIONS.md):**
- **D1 — Labels.** TODAY · COMMAND · LIFE & WORK · INTELLIGENCE · ACTIONS · SYSTEM (desktop); TODAY · CMD · LIFE · INTEL · ACTIONS · ··· (mobile).
- **D2 — PlasmaOrb.** Ambient background on COMMAND desktop only (~15% opacity, slower animation, non-interactive). Not rendered on mobile (`window.innerWidth < 768`); mobile uses CSS dot-grid background.
- **D3 — Default landing = TODAY** with `apex_default_page_{humanId}` override.
- **D4 — Navigation.** Sidebar (220px, collapsible to 56px) desktop; bottom-tab (5 + ···) mobile.
- **D6 — /api/now/summary** aggregation for TODAY.
- **D7 — Chat history localStorage.** Key `apex_chat_history_{humanId}` (namespaced), FIFO 100 messages, cleared on logout.
- **D8 — SSE streaming.** New `GET /api/chat/stream`. **Requires separate implementation authorisation.**
- **SD-1 — Voice result overlay.** 40% viewport, non-destructive, off-COMMAND.
- **SD-3 — 30s undo window.**
- **SD-5 — pageState Map.** Session in-memory (no cross-user risk).

**Visual (constitutional locks per user context and V-11 style layer):**
- APEX Zero pure-black foundation, indigo/canonical signal treatment.
- Inter for human-facing text; JetBrains Mono only where technical detail genuinely benefits.
- No gratuitous visual noise.
- PlasmaOrb ambient only.
- No WebGL PlasmaOrb on mobile.

**Mobile (constitutional locks):**
- Bottom navigation.
- Large touch targets.
- Bottom sheets for detail.
- Full-screen voice.
- Single-column info hierarchy.
- No horizontal overflow.
- No WebGL.

---

# SECTION D — SIX V-11-E DECISION RESOLUTIONS

Each resolution is either **RESOLVED BY EXISTING LOCK** (with authority cited) or **NEW RECOMMENDATION** (with trade-off analysis). Any resolution flagged **REQUIRES OWNER APPROVAL** does not proceed without explicit owner sign-off.

---

## D-E1 — Activity Feed Destination

**Exact question:** Where does the current right-column `.apex-feed` on COMMAND go? Options were: (a) SYSTEM → Activity subpage, (b) floating panel on desktop only, (c) remove from V-11-E scope.

**Why it matters:** Blocks E-2 (single-column COMMAND layout). Determines whether desktop keeps a live-activity surface and where a User can see (or is prevented from seeing) system observability.

**Relevant architecture:**
- V-11 spec §7.6 — SYSTEM already owns "Activity: raw event log (technical telemetry)".
- V-11-N DECISION-LOCK §11.2 — SYSTEM = full admin for Master; PROFILE → Activity for User (own actions only, §10.1).
- V-11-N I-8 — system-level endpoints MUST return counts/categories, not personal content.
- The current `#page-command` right-column feed is desktop-only (already hidden at ≤1099px).

**Options analysis:**

| Option | Pros | Cons |
|---|---|---|
| (a) SYSTEM → Activity subpage | Aligns with spec §7.6. Same slot for Master (raw event log) and User (PROFILE → Activity). Removes visual competition on COMMAND. | Requires a small SYSTEM subpage authoring pass. |
| (b) Floating desktop panel | Preserves ambient at-a-glance feed. | Introduces a new persistent chrome surface not in the spec. Adds z-index/state coordination. Creates competing focus with the conversation thread. Cannot render for User without cross-authority leakage risk (I-8). |
| (c) Remove from V-11-E scope | Fastest. | Leaves the feed rendered on COMMAND during transition — regresses E-2. |

**Recommended option: (a) Move to SYSTEM → Activity. RESOLVED BY EXISTING LOCK** (spec §7.6 + V-11-N §11.2 already designate this as SYSTEM content).

**Reason:** The spec already assigns the raw event/activity surface to SYSTEM. Reaffirming that keeps COMMAND single-purpose (conversation), preserves observability for Master, and prevents any Layer-3 leakage risk on User accounts (User's SYSTEM = PROFILE → Activity shows only own actions per §10.1).

**Consequences:**
- `.apex-feed` HTML block moves from `#page-command` into the SYSTEM destination's Activity subsection.
- For Master: SYSTEM → Activity renders the live/raw event log.
- For User: SYSTEM (= PROFILE) → Activity renders own-actions view only (existing PROFILE spec §10.1). The Master-live-feed variant is NOT rendered for User.
- Backend delivery model unchanged in E scope. If the feed currently receives system events over WebSocket, targeting must respect I-15 (identity-aware broadcast).

**Regression risks:**
- If the feed uses `wsBroadcast()` unconditionally, moving it to SYSTEM must NOT expose system-wide events to User's PROFILE — verified against I-8 and I-15 during E-2.
- CSS/JS references to `.apex-feed` inside `#page-command` must be updated or made position-neutral.

**Affects:** Master (yes), User (yes — via SYSTEM/PROFILE variant), COMMAND (removal), SYSTEM/PROFILE (addition), desktop (primary), mobile (feed already hidden), API contracts (none), performance (net positive — fewer competing paint layers on COMMAND), accessibility (positive — fewer competing landmarks).

**Reversible:** YES (HTML block can be moved back; no schema/API change).

**Implementation phase:** **E-2** (feed removal is a prerequisite for single-column layout); relocation renders into whichever SYSTEM section owns Activity.

---

## D-E2 — Widget System Disposition

**Exact question:** What happens to `.cwid` widgets, `#cmdSidebar` (256px editor), `#cmdWidgetLayer`, and the widget CSS namespace? Options: (a) remove entirely, (b) move to SYSTEM as a customisation surface, (c) preserve as a non-default mode behind a toggle.

**Why it matters:** Blocks E-2. Widget code is a competing design-token namespace, an unauthorised feature investment, and directly contradicts the spec's single-column conversation layout for COMMAND.

**Relevant architecture:**
- V-11 spec §7.2 explicitly enumerates what leaves COMMAND: "3-column `cmd-split` layout → single conversation column".
- No widget system appears in V-11, V-11-N, or any V-11 phase deliverable.
- Widget code introduces its own token vocabulary (`.cwid-*`) that competes with the APEX Zero token layer.

**Options analysis:**

| Option | Pros | Cons |
|---|---|---|
| (a) Remove entirely | Cleanest. Eliminates the competing token namespace. Reduces surface area, boot cost, and future regression risk. | Discards prior engineering effort. |
| (b) Move to SYSTEM as customisation | Preserves code. | Creates a customisation surface never authorised by V-11 or V-11-N; contradicts "the interface should expose intelligence rather than implementation complexity." Adds Master/User authority-filtering work with no product justification. |
| (c) Preserve as non-default toggle | Preserves as-is. | Retains the second token namespace, retains the widget code paths, retains regression exposure across every future phase, and creates a hidden second interface. Rejected by the "one product" principle (V-11-N §9.1). |

**Recommended option: (a) Remove entirely.**

**Reason:** No authority document endorses a widget system. Keeping it (even hidden) violates the "one product" principle, introduces a second token namespace, and leaves latent code that must be regression-tested in every future phase. The spec explicitly says the multi-column widget-adjacent `cmd-split` layout leaves COMMAND. Removal is the least ambiguous alignment.

**Consequences:**
- Removal of `.cwid*` CSS, `#cmdSidebar`, `#cmdWidgetLayer`, `loadWidgets()`, `renderAllWidgets()`, `renderSidebarLayers()`, `renderSidebarProps()`, `startWidgetClocks()`, and the widget canvas mousedown handler from `cmdInitPage()`.
- Boot init sequence for COMMAND simplifies substantially (see Section Q).
- If a future phase requires a customisation surface, it MUST be authored fresh under a new authorisation, not resurrected from this code.

**Regression risks:**
- Any orphan `document.getElementById('cwid-*')` or `querySelector('.cwid*')` referenced from unrelated code must be identified and cleaned up. The removal is scoped to `dashboard.html` (widgets are inline).
- Cleanup MUST NOT touch cross-page state or the setState registry.

**Affects:** Master (yes — removes an unofficial surface), User (yes — same removal), COMMAND (primary), other destinations (no), mobile (feature already non-functional there), backend (no), API (no), performance (positive — smaller CSS/JS payload, fewer init calls), accessibility (positive — fewer competing focusable elements).

**Reversible:** YES via git revert of the removal commit. Widget code should be deleted, not left commented out.

**Implementation phase:** **E-2** (widget removal is a prerequisite for single-column layout).

---

## D-E3 — Auto-Listen Persistence

**Exact question:** How does `toggleAutoListen` persist and where is it configured? Options: (a) persist via `apex_auto_listen_{humanId}` localStorage key, (b) expose as SYSTEM → Settings toggle, (c) remove and replace with gesture activation.

**Why it matters:** Touches E-5 (PlasmaOrb ambient) and E-7 (input zone). Determines whether voice loops silently across sessions and whether the setting is discoverable in PROFILE/SYSTEM.

**Relevant architecture:**
- V-11-N §10.1 PROFILE → Communication → Voice preferences: "Voice activation behavior" is a defined PROFILE section.
- V-11-N SD-2/D3/D7 pattern establishes `_{humanId}` namespacing for all per-identity localStorage keys.
- Constitutional lock: "Users cannot be silently impersonated" — silent auto-listen creates a class of "silent continuous voice capture" that must be explicit and controllable.

**Options analysis:**

| Option | Pros | Cons |
|---|---|---|
| (a) localStorage persist (only) | Simple. Survives reload. | Undiscoverable — no UI outside COMMAND to view/change it. |
| (b) SYSTEM/PROFILE toggle (only) | Discoverable, correct destination per V-11-N §10.1. | Requires SYSTEM/PROFILE work in-scope. Without persistence the toggle is meaningless. |
| (c) Remove, replace with gesture | Simpler code. | Removes a working feature owners may rely on; gesture design not specified anywhere. |
| **(a) + (b) combined** | Discoverable in PROFILE, persistent per-identity, aligns with V-11-N §10.1. | Requires modest PROFILE authoring. |

**Recommended option: (a) + (b) combined. RESOLVED BY EXISTING LOCK** (V-11-N §10.1 designates PROFILE → Communication → Voice preferences → "Voice activation behavior" — this is exactly that setting).

**Reason:** V-11-N already assigns voice preferences to PROFILE. Persisting to `apex_auto_listen_{humanId}` (per-identity, per D7/SD-2 namespacing) satisfies the discoverability + survival requirement. The COMMAND "Auto" chip becomes a live mirror of the PROFILE setting.

**Consequences:**
- New localStorage key: `apex_auto_listen_{humanId}` (boolean).
- COMMAND input zone: existing "Auto" chip re-labelled with a clearer signifier (see D-E7 below) and reads/writes the namespaced key.
- PROFILE (SYSTEM for User) → Communication → Voice preferences: exposes the same setting. Full PROFILE authoring is out of E scope; E-3 stubs the SYSTEM entry point per the E-5/E-7 authoring pass and defers full PROFILE build to Phase J of the identity roadmap.
- Cleared on logout (matches D7 pattern).

**Regression risks:** None — additive.

**Affects:** Master (yes), User (yes), COMMAND (chip), SYSTEM/PROFILE (setting hook), mobile (yes — voice is first-class on mobile), backend (no), API (no), performance (negligible), accessibility (chip must be a button with clear aria-pressed state — see D-E7).

**Reversible:** YES.

**Implementation phase:** **E-5 / E-7** (voice + input zone); the PROFILE hook is stubbed only within E scope.

---

## D-E4 — Gemini Live Disposition

**Exact question:** What happens to `#apexLivePill`, `#apexLiveTranscript`, `#apexLiveUserText`, `#apexLiveApexText` (Gemini Live overlay) on COMMAND? Options: (a) keep as parallel interaction mode, (b) defer — remove from COMMAND, revisit later, (c) remove entirely.

**Why it matters:** Blocks E-2 (layout). Currently occupies `.cmd-stage` real estate that the spec earmarks for ambient PlasmaOrb + thread.

**Relevant architecture:**
- V-11 spec §7.2 does NOT reference Gemini Live.
- V-11-N does not reference Gemini Live.
- Voice pipeline (spec §8.1–8.4) is defined as topbar-mic driven with SD-1 overlay behaviour — this is the canonical voice interaction, not a parallel modality.

**Options analysis:**

| Option | Pros | Cons |
|---|---|---|
| (a) Keep as parallel mode | Preserves working code. | Adds a second voice model competing with SD-1; violates "one product" and creates state-machine ambiguity between the canonical voice pipeline and Gemini Live. |
| (b) Defer — remove from COMMAND | Preserves code paths (backend routes and any auth already in place) while eliminating COMMAND clutter. Allows a future authorisation to reintroduce or replace with clear scope. | Requires the removed UI to be reintroduced under a fresh spec if wanted. |
| (c) Remove entirely | Cleanest. | Discards potentially useful backend integration; higher friction if the feature is later authorised. |

**Recommended option: (b) Defer — remove Gemini Live UI from `#page-command`; keep any backend routes intact.**

**Reason:** No authority specifies Gemini Live. Removing the UI cleans up COMMAND to match spec §7.2 without foreclosing a future scoped feature. Backend routes (if any) remain untouched — this contract explicitly does not authorise backend removal for Gemini Live.

**Consequences:**
- Remove `#apexLivePill` and the three transcript elements from `#page-command`.
- Any JavaScript that binds to those IDs is removed or feature-flagged off.
- No backend `/api/live` route changes in E scope.

**Regression risks:**
- Any keyboard shortcut or global handler wired to `#apexLivePill` must be removed simultaneously to avoid dangling references.

**Affects:** Master (yes), User (yes), COMMAND (removal), other destinations (no), backend (no), API (no).

**Reversible:** YES (HTML block deletion; git revert restores).

**Implementation phase:** **E-2** (with widget removal).

---

## D-E5 — `stream_plan` Interim Strategy

**Exact question:** If E-8 (SSE) is deferred, what happens to the current `stream_plan` fake-streaming? Options: (a) leave in place until SSE lands, (b) remove now, (c) improve with a pre-arrival loading state.

**Why it matters:** Blocks E-9 (response archetypes). Determines what progressive-reveal semantics the response cards inherit.

**Relevant architecture:**
- V-11 D8 locks SSE as target state and explicitly authorises the interim retention of the synchronous route.
- Reconnaissance §12 documents `stream_plan` as chunk+delay pre-packaging with all content computed synchronously server-side.
- Response archetypes 5, 11, 12 (spec §21 in reconnaissance / spec §7.2 states table) rely on either true streaming or a coherent placeholder ("APEX is thinking…").

**Options analysis:**

| Option | Pros | Cons |
|---|---|---|
| (a) Leave `stream_plan` in place | Zero regression to existing reveal behaviour. Cheapest. | Continues to ship "fake streaming" latency masking without addressing time-to-first-byte. |
| (b) Remove now | Eliminates the pretence. | Regresses to a flat synchronous experience with no progressive feedback whatsoever until SSE — actively worse for users during the deferral window. |
| (c) Improve — add pre-arrival loading state | Adds the "APEX is thinking…" inline state consistent with the target voice/text state machine. Bridges to E-9 archetype rendering. Retains `stream_plan` reveal behaviour so no regression occurs. | Small additional implementation cost. |

**Recommended option: (c) Improve — retain `stream_plan` and add the pre-arrival "APEX is thinking…" inline state.**

**Reason:** Removing progressive feedback (option b) actively harms UX during the deferral window. Doing nothing (option a) fails to introduce the state vocabulary that E-9 and the target voice state machine require. Adding the inline "thinking" state is the minimum change that both preserves working behaviour and prepares the archetype layer.

**Consequences:**
- E-9 renders archetypes with an initial `thinking` state that transitions to `streaming` on first `stream_plan` chunk arrival, then to `complete` on final chunk.
- When SSE lands (E-8), the same state machine applies; only the transport swaps.
- `stream_plan` remains the interim reveal mechanism. It is not documented to users.

**Regression risks:** Minimal — the change is additive DOM/CSS.

**Affects:** Master (yes), User (yes), COMMAND (thread), voice (state machine alignment), backend (no), API (no).

**Reversible:** YES.

**Implementation phase:** **E-9** (archetype rendering).

---

## D-E6 — Formal Capability Map for 21 Chat Tools

**Exact question:** Which of the 21 chat tools require `master` role vs. are User-accessible via `checkCapability`? Enumerated tools:

File: `save_note`, `read_file`, `delete_file`, `rename_file`, `list_files`
Document: `list_documents`, `search_documents`, `create_file`, `summarise_file`, `delete_document`
Finance: `log_expense`, `get_finance_summary`, `set_budget`
Email: `check_emails`, `list_emails`
Browser: `browser_research`, `browser_screenshot`, `browser_pdf`, `browser_scrape`, `browser_fill_form`, `browser_click`

**Why it matters:** Blocks E-10. Determines the enforcement contract for `src/routes/chat.js` and any downstream tool handler.

**Relevant architecture:**
- V-11-N §7.1 — capabilities are the primary authorisation unit; role checks alone are insufficient.
- V-11-N §7.2 default User capabilities include: `chat.send`, memory episodic/semantic reads, health domain (read/write own), tasks (read/create/approve), knowledge (read), notifications (read).
- V-11-N §7.2 default User excludes: `finance.*`, `agents.invoke`, `agents.schedule.write`, `system.settings.write`, `system.users.write`, `memory.strategic.*`, `governance.standing.write`, `intelligence.opportunities.*`, `intelligence.cost.read`.
- V-11-N §7.3 — natural-language refusal patterns for out-of-scope User requests.
- Reconnaissance §23 Open Decision 6 proposed candidate restrictions but did not lock them.

**Recommended capability map (NEW RECOMMENDATION — requires owner confirmation before E-10 execution):**

| Tool | Capability required (server-side) | Master | Default User | Rationale |
|---|---|---|---|---|
| `save_note` | `notes.write` (scoped to own) | Yes | Yes | Personal note surface; scoped by `human_id`. |
| `read_file` | `files.read` (scoped to own + shared) | Yes | Yes | Own files + shared/system files only. |
| `delete_file` | `files.delete` (own) + approval gate | Yes | Yes with approval | Destructive; per V-11 approval semantics. Users can only delete own. |
| `rename_file` | `files.write` (own) + approval gate | Yes | Yes with approval | Same as delete. |
| `list_files` | `files.read` (scoped) | Yes | Yes | Personal + shared visibility. |
| `list_documents` | `documents.read` (scoped) | Yes | Yes | Same scoping. |
| `search_documents` | `documents.read` (scoped) | Yes | Yes | Same. |
| `create_file` | `files.write` (own) | Yes | Yes | Creates own files. |
| `summarise_file` | `documents.read` (scoped) | Yes | Yes | Read-only summarisation of readable docs. |
| `delete_document` | `documents.delete` (own) + approval gate | Yes | Yes with approval | Destructive; personal scope only. |
| `log_expense` | `finance.transactions.write` | Yes | **No (default)** — grantable per V-11-N §7.2 override table | Finance defaults to Master-only per V-11-N. |
| `get_finance_summary` | `finance.transactions.read` | Yes | **No (default)** | Same. |
| `set_budget` | `finance.budgets.write` | Yes | **No (default)** | Same. |
| `check_emails` | `communications.email.read` (own connected accounts) | Yes | Yes (own only) | Personal integration; V-11-N §12.1 confirms User connects own integrations. |
| `list_emails` | `communications.email.read` (own connected accounts) | Yes | Yes (own only) | Same. |
| `browser_research` | `research.browse.read` | Yes | Yes | Non-mutating research. |
| `browser_screenshot` | `research.browse.read` | Yes | Yes | Non-mutating. |
| `browser_pdf` | `research.browse.read` | Yes | Yes | Non-mutating. |
| `browser_scrape` | `research.browse.read` | Yes | Yes | Non-mutating (structured extraction). |
| `browser_fill_form` | `research.browse.act` + approval gate | Yes | **No (default)** | Consequential — writes to third-party surfaces. Master only unless explicitly granted per user. |
| `browser_click` | `research.browse.act` + approval gate | Yes | **No (default)** | Same. |

**Cross-cutting rules (MUST):**
1. Every tool invocation MUST run `checkCapability` server-side.
2. Every tool that returns personal data MUST apply `scopeData` before the DB query (I-3, I-5).
3. Out-of-scope User requests MUST NOT return HTTP 403 to the chat surface with technical error text — the chat handler catches the capability denial and returns a natural-language message per V-11-N §7.3.
4. `browser_fill_form`, `browser_click`, `delete_file`, `delete_document`, `rename_file`, and any write-tool for a granted-but-consequential capability MUST integrate with the V-11 approval card (Archetype 6).
5. Finance grants MUST be authored via `user_capability_overrides` per V-11-N §7.2, not by widening defaults.
6. Emergency-access-required tools do NOT exist in this chat inventory; nothing here bypasses RD-3 boundaries.

**Reason:** The map derives directly from V-11-N §7.2's default capability set + reconnaissance risk profile. Grouping tools by capability name (rather than per-tool role gates) keeps the enforcement layer maintainable and consistent with V-11-N §7.1's "capability as the authorisation unit" principle.

**Consequences:**
- `lib/middleware.js` gains capability entries listed above (if not present). This is authorised specifically for E-10 execution.
- `src/routes/chat.js` gains per-tool `checkCapability` calls in the tool dispatch layer.
- Chat handler wraps tool errors: on capability denial → natural-language refusal (V-11-N §7.3), no technical text.
- User's default profile does NOT auto-gain finance or `browser.act` capabilities; the Master must explicitly grant via `user_capability_overrides`.

**Regression risks:**
- If any Master flow calls these tools and relies on the current unrestricted path, it will continue to work (Master has all capabilities per V-11-N Part II).
- If any pre-existing beta User was mistakenly configured to depend on finance tools, they would lose that after E-10; owner must audit before enabling.

**Affects:** Backend (yes, in E-10 scope), API contracts (no new routes), security (primary), Master (no change — retains all), User (loses default access to finance + browser-act tools; can be re-granted per user).

**Reversible:** YES — capability map is data-driven; grants can be adjusted.

**Implementation phase:** **E-10 — REQUIRES OWNER APPROVAL for backend implementation. The capability map above requires owner confirmation before E-10 begins.**

---

## Decision resolution summary table

| ID | Question | Resolution | Authority | Owner approval required? |
|---|---|---|---|---|
| D-E1 | Activity feed destination | Move to SYSTEM → Activity | RESOLVED BY EXISTING LOCK (spec §7.6, V-11-N §11.2) | No |
| D-E2 | Widget system disposition | Remove entirely | NEW RECOMMENDATION (deducible from spec §7.2 + "one product" principle) | Recommended — flag for owner confirmation before deletion |
| D-E3 | Auto-listen persistence | localStorage + PROFILE hook | RESOLVED BY EXISTING LOCK (V-11-N §10.1) | No |
| D-E4 | Gemini Live disposition | Defer — remove UI from COMMAND; keep backend | NEW RECOMMENDATION | Recommended — flag for owner confirmation |
| D-E5 | `stream_plan` interim | Keep + add pre-arrival "thinking" state | NEW RECOMMENDATION (spec D8 authorises interim retention) | No |
| D-E6 | Capability map for 21 tools | Table above (finance + browser-act master-default) | NEW RECOMMENDATION | **REQUIRES OWNER APPROVAL before E-10 begins** |

---

# SECTION E — EXACT USER EXPERIENCE CONTRACT (COMMAND, first-load → conversation → evidence → voice)

The following defines what the authenticated User perceives on COMMAND end-to-end. Master's additional layer is defined in Section F; the User baseline in Section G is identical to this section except for role-scoped content.

**First load into COMMAND (from TODAY via sidebar/bottom-tab or direct `#command`):**
1. Sidebar (desktop) or bottom tab (mobile) highlights COMMAND.
2. Topbar shows title "Command · Ask APEX anything" (per pageMeta pattern).
3. Single-column conversation region occupies the primary content area.
4. If `apex_chat_history_{humanId}` has entries → rendered into the thread (most-recent 100, chronological, scrolled to bottom).
5. If empty history → welcome archetype card: L0 "Ask APEX anything or tap the mic." + one-line hint of typical questions ("What's my brief? / Log a workout / Save a note").
6. Input zone anchored to the bottom of the COMMAND column: text input, mic button (SVG icon with `aria-label="Start voice"`), send button, auto-listen chip (labelled "Auto-listen" with `aria-pressed` state), clear button.
7. Desktop only: PlasmaOrb renders as ambient background behind the thread at ~15% opacity, non-interactive.
8. Mobile: PlasmaOrb NOT rendered. CSS dot-grid background used.

**Sending a text command:**
1. User types → Enter or clicks Send.
2. User message appears immediately in the thread as an "user bubble" (right-aligned or as user-labelled row per visual system).
3. Thread appends an inline `thinking` indicator ("APEX is thinking…" with animated cyan dots — Archetype 12 initial state).
4. On response arrival: `thinking` indicator is replaced by the archetype card matching the response type (Archetypes 1–12 per reconnaissance §21).
5. If `stream_plan` chunks are present → content reveals progressively into the same card.
6. Simultaneously: `apex_chat_history_{humanId}` receives the new pair; FIFO trims to 100.
7. TTS speaks the response text (subject to user's voice preferences).

**Evidence path:**
- Every archetype card that supports L1 has a discoverable disclosure control (chevron / "Show detail" affordance).
- L1 reveals process summary + tool-use trace.
- L2 reveals source references, memory references, raw tool output (readable, not JSON).
- L3 (optional, per card) reveals reasoning chain.
- L4 is NOT shown in COMMAND — L4 lives in SYSTEM per V-11 spec Part III.

**Approval flow:**
- Approval-requiring actions render as Archetype 6 inline in the thread (visible — the P0-5 regression is fixed).
- Card shows: action title, description, cost, reversibility, `[Approve] [View detail] [Reject]`.
- Approve / Reject submits via the same chat command path (`sendApprovalDecision`).
- Undo banner (SD-3) appears for 30s after any consequential approve; final 5s counts down.

**Voice interaction on COMMAND:**
- Tap topbar mic (or press V on desktop).
- State transitions per Section M's state machine.
- Waveform indicator visible near mic; thread shows inline "Listening…" state row.
- On STT complete → transcript appears in thread as user bubble.
- Processing / responding as text path.
- TTS speaks response.
- If auto-listen enabled → returns to LISTENING after RESPONDING.

**Voice interaction from non-COMMAND page (SD-1):**
- Tap topbar mic anywhere.
- SD-1 overlay slides up (40% viewport) with response text + TTS.
- "Open in Command" link appended to overlay.
- The response is ALSO appended to the COMMAND thread (accessible when the user next navigates).

**Progressive disclosure:** Never all detail at once. L0 always visible. L1 tap once. L2 tap twice. L3 tap three times. L4 not on COMMAND.

**Empty vs failed vs stale vs offline vs forbidden (per V-11-B setState):**
- Empty (fresh account, no history): welcome card, encouraging tone.
- Failed (send failed): inline error row + [Retry] button — Archetype 9.
- Stale (response ≥5 min old and unread): "Last updated 12 min ago" label; no auto-refresh in COMMAND (conversation is user-driven).
- Offline (network lost during send): banner "You're offline. Message will send when reconnected." — send button disabled; queued in localStorage until reconnect.
- Forbidden (capability denial after E-10): natural-language APEX reply, no HTTP code, no capability name.

---

# SECTION F — MASTER EXPERIENCE CONTRACT (additional to E)

Master receives everything in Section E, plus:
- **Agent orchestration panel** rendered within COMMAND when `capabilities.includes('agents.invoke')` per V-11-N Phase H note. Panel shows: active agents, last run, invoke controls, autonomy-level readout.
- **Orchestrator controls** (autonomy level knob, manual trigger) accessible without leaving COMMAND.
- **Full tool inventory access** — all 21 tools with no role restriction (all default-master capabilities per V-11-N Part II).
- **Aggregate/system queries** — chat can answer "What are all my agents working on?", "How is [User name]'s onboarding going?" (Layer 1/2 visibility per V-11-N §6.2), "How much have we spent on API calls this month?".
- **Governance queries** — "What standing approvals are active?", configuration commands ("Set autonomy to Level 2").
- **Emergency access UI is NOT on COMMAND.** Emergency access is invoked from SYSTEM → Users → [User] → Emergency Access per V-11-N §6.4. COMMAND MUST NOT expose a "read User's private data" affordance.

**Master MUST NOT see on COMMAND:**
- Any User's personal chat history (their `apex_chat_history_{userHumanId}` is not accessible — localStorage is per-browser-session per Master's own login).
- User Layer-3 content unless the emergency protocol is invoked from SYSTEM.

---

# SECTION G — USER EXPERIENCE CONTRACT (User-scoped COMMAND)

User receives everything in Section E. In addition:
- **NO agent orchestration panel.** Section absent — no "🔒 Restricted", no locked controls. Clean by design per V-11-N §9.5.
- **No orchestrator controls, no autonomy readout, no cost readout.**
- **Chat scope:** personal questions, life & work questions, task requests, knowledge queries, personal preferences, approval responses — anything within the User's capability set (V-11-N §9.3).
- **Out-of-scope requests:** APEX responds in natural language per V-11-N §7.3 canonical patterns. NEVER "you don't have permission." NEVER a capability name. NEVER an HTTP code. If a Master capability grant would resolve the ask, APEX MAY mention "Alex can enable this" (only when accurate per V-11-N §7.3 last sentence).
- **PlasmaOrb ambient** appears for User on desktop (V-11-N §9.4). It is a brand element, not a Master signifier.
- **Chat history** is `apex_chat_history_{userHumanId}` — namespaced to User's own identity per D7/V-11-N.
- **Voice preferences** discoverable in SYSTEM (= PROFILE) → Communication → Voice preferences per D-E3.
- **Authority limits explicit:** User's PROFILE → Capabilities section is the discoverable answer to "what can APEX do for me?" (V-11-N §16.3).

---

# SECTION H — DESKTOP SHELL BEHAVIOUR

- Sidebar (220px, collapsible to 56px) permanent left per D4. All six destinations visible for all profiles per V-11-N §11.2.
- Topbar contains: page title/subtitle (pageMeta), mic icon (rightmost, always available), any topbar chrome from V-11-A.
- COMMAND main content: single-column flex layout inside `#page-command`.
- Column layout:
  ```
  [ Thread ]  (flex-grow, scrolls)
  ── divider (subtle)
  [ Input zone ]  (fixed height, anchored bottom)
  [ Suggestions row ] (optional, below input, static chips)
  [ Recent row ] (optional, below suggestions, collapsible)
  ```
- PlasmaOrb: rendered as background layer inside `.cmd-stage` (retained as ambient container), opacity ~0.15, animation slowed. `data-fn="startVoice"` REMOVED. `#plasmaOrbSubLabel` REMOVED (or repurposed as a brand micro-label only).
- Input zone: scoped to `#page-command` only. Hidden CSS when `body` lacks the COMMAND-active class (or, structurally cleaner, moved inside `#page-command`).
- Chat log visibility: `#chatLog` MUST NOT carry `display:none`. It is the primary visible surface.
- Duplicate `.cmd-split` CSS: single canonical definition retained; dead rule removed.
- Duplicate `id="waveform"`: resolved — one canonical `#waveform` element remains; JS re-verified.
- Duplicate `#micBtn`: resolved — one canonical topbar mic; the inner hidden mic stub inside `#page-command` removed.

---

# SECTION I — MOBILE SHELL BEHAVIOUR

- Bottom-tab navigation (5 + ···) per D4.
- COMMAND main content: single column, full viewport minus tab bar and topbar.
- PlasmaOrb: NOT rendered (guard `window.innerWidth < 768`). CSS dot-grid background used instead.
- Input zone: same COMMAND-scoped visibility as desktop. Placed above the bottom tab bar with safe-area inset padding.
- Voice: tapping the topbar mic (or the mic-icon position in the mobile input row, if the design chooses to duplicate for reach) triggers full-screen listening UI (no competing UI during active listening) per spec §16.3.
- Bottom sheets: L1/L2 detail expansions on mobile use bottom sheets (not inline expansion), per constitutional mobile lock.
- No horizontal overflow. Single-column info hierarchy. Large touch targets (≥44px).

---

# SECTION J — PROGRESSIVE DISCLOSURE CONTRACT (COMMAND-specific)

| Level | On COMMAND | Interaction |
|---|---|---|
| **L0** | Every APEX reply card shows: reply text (1 short paragraph or sentence), optional confidence dot+word, at most one primary action button. | Always visible; no user action required. |
| **L1** | Process summary ("Searched 3 sources · Checked calendar · Read 2 notes"), action metadata (cost/risk/reversibility) if action-typed. | One tap on disclosure chevron. |
| **L2** | Source references, memory references, tool output rendered readably. | Second tap. |
| **L3** | Step-by-step reasoning, agent execution log (Master only if agents ran), decision pathway. | Third tap (optional). |
| **L4** | Request IDs, model name, token counts, latency, raw JSON. | NOT ON COMMAND. Available only on SYSTEM per spec Part III. |

L0 MUST NEVER expose: API identifiers, model names, token counts, agent role names, internal system vocabulary, raw tool output, or error stack traces.

---

# SECTION K — STATE CONTRACT (COMMAND panels/zones)

For every panel/zone on COMMAND, the V-11-B setState registry supplies the state semantics. Panels/zones:

| Panel/zone | Loading | Ready | Empty | Failed | Stale | Offline | Forbidden |
|---|---|---|---|---|---|---|---|
| Chat thread | shimmer rows (max 3) | messages rendered | welcome archetype | inline error banner + Retry | timestamp label "12m ago" (conversation is user-driven, no auto-refresh) | banner "You're offline" + disabled send | not applicable — thread is always visible for authenticated user |
| Input zone | disabled input, spinner in send | interactive | interactive (empty state = ready) | send button shows red state after submit fail | n/a | disabled + banner | disabled with natural-language message |
| Voice topbar mic | dim | dim (idle) | dim | red mic state + inline error in thread | n/a | dim + banner | dim (topbar reply: "Voice unavailable while offline") |
| Approval card (Archetype 6) | placeholder shimmer | rendered inline | n/a | error state on submit + Retry | timestamp on decision | queue on offline; explicit send on reconnect | natural-language decline in thread |
| Agent orchestration panel (Master only) | shimmer | active-agent list | "No agents active" | inline error | timestamps | last-known good + banner | not rendered for User (invariant) |
| PlasmaOrb backdrop | not applicable | rendered | rendered | n/a | n/a | n/a | not applicable |

States MUST NEVER be visually conflated (constitutional lock). Empty is a positive tone; failed is red; stale is a timestamp; offline is a banner; forbidden is a natural-language reply.

---

# SECTION L — TRANSPARENCY / EVIDENCE CONTRACT

Every APEX claim on COMMAND has a discoverable ≤2-tap path to its basis (V-11 spec Part XI + V-11-N §16.1).

- **Confidence** (D10 lock): L0 = coloured dot + one-word label ("● High"); L1 = sentence ("● High confidence — based on 3 sources from the last 7 days").
- **Sources & memory** at L2: rendered as an evidence list with provenance (memory type translated to human labels per spec §9.1 table).
- **Knowledge gaps** MUST be explicit — Archetype 8 ("I don't know X" + what APEX checked + suggestion).
- **Stale data** MUST show timestamp; MUST NOT be silently presented as fresh.
- **APEX per profile** per V-11-N §16.2: User transparency uses plain-language phrases ("Based on your recent activity"); Master transparency MAY reveal agent role and technical framing.

---

# SECTION M — VOICE INTERACTION CONTRACT

**State machine (V-11-E target, per reconnaissance §25):**

```
IDLE ── [mic tap / V key] ──▶ LISTENING
                                  │
                                  │ [STT complete, input dispatched]
                                  ▼
                              PROCESSING
                                  │
                                  │ [response ready]
                                  ▼
                              RESPONDING
                                  │
                                  │ [TTS complete]
                                  ▼
                              COMPLETE ──▶ IDLE
                                        │
                                        └▶ LISTENING (if auto-listen enabled)

  ERROR path: any state → ERROR
                             Thread inline: "I didn't catch that" (Archetype 9 variant)
                             Retry button
                             → IDLE
```

**Visual feedback per state:**

| State | Topbar mic | Thread inline | Full-screen (mobile) |
|---|---|---|---|
| IDLE | dim | none | — |
| LISTENING | pulsing cyan | "Listening…" state row + waveform | full-screen waveform |
| PROCESSING | rotating dots | "APEX is thinking…" indicator | "APEX is thinking…" |
| RESPONDING | speaker anim | streaming text into archetype card | overlay text + audio |
| COMPLETE | returns to dim | final archetype card | overlay collapses / auto-dismisses per SD-1 |
| ERROR | red mic | inline Archetype 9 row + Retry | overlay retry prompt |

**TTS:** Priority order retained — Gemini TTS → ElevenLabs → Web SpeechSynthesis fallback. TTS MUST NOT run if response is an approval card (avoid speaking through decision UI); the approval card is visual + haptic only unless User's voice preferences opt in.

**STT:** Deepgram, unchanged.

**Auto-listen rules (per D-E3):**
- Off by default.
- Persisted per identity via `apex_auto_listen_{humanId}`.
- Toggle chip on COMMAND input zone; mirrored setting in SYSTEM/PROFILE → Communication → Voice.
- When on: after RESPONDING → LISTENING (skip IDLE).
- Auto-listen MUST NOT be silently enabled at any point; a toggle change is always user-initiated.
- Aria state on chip: `aria-pressed="true"` / `"false"`. Label: "Auto-listen" (not "Auto").

**Voice off-COMMAND (SD-1):** Non-destructive overlay behaviour per spec §8.3. Voice result also appended to COMMAND thread.

**Barge-in:** Speaking while APEX is responding interrupts TTS (spec §8.4). Long responses (>30s) offer "stop speaking" button in overlay.

---

# SECTION N — DATA-LOADING CONTRACT

**COMMAND fetches on init (`cmdInitPage`):**
- Reads `apex_chat_history_{humanId}` from localStorage — synchronous, no network.
- NOTHING ELSE by default. No auto briefing fetch, no health poll, no strip poll (strip is on TODAY per V-11-D1, and E-4 removes any residual init calls).

**COMMAND fetches on user action:**
- Send text/voice command → `POST /chat` (interim) or `GET /api/chat/stream` (post-E-8).
- Approve/Reject → `POST /chat` with the decision payload (existing path).
- Tool invocations happen server-side under the chat call — client makes no additional per-tool calls.

**COMMAND MUST NEVER fetch:**
- `/api/briefing/*` (TODAY-owned per V-11-D1).
- `/api/now/summary` (TODAY-owned per D6).
- Widget data (widgets are removed per D-E2).
- Activity feed data (moved to SYSTEM per D-E1).
- `/api/live/*` (Gemini Live UI removed per D-E4; backend routes untouched).
- Any TODAY panel poll.

**Duplicate-call prevention:**
- No duplicate `POST /chat` on a single send.
- No init call fires more than once per navigation to COMMAND (guard via `CMD.initialized` — already present).
- Auto-listen must not re-enter LISTENING if the mic is currently in PROCESSING or ERROR.

---

# SECTION O — API / BACKEND REQUIREMENTS

**Backend changes explicitly REQUIRED for E scope:**
- None for E-1 through E-9 and E-11 (documentation) — all frontend-only.
- E-8 (SSE): new `src/routes/chat-stream.js`, mount in `server.js`, EventSource client in `dashboard.html`. **Requires owner authorisation.**
- E-10 (capability enforcement): additions to `src/routes/chat.js` and `lib/middleware.js` per Section D-E6 map. **Requires owner authorisation and locked capability map.**

**Backend changes explicitly FORBIDDEN for E scope:**
- No new routes beyond E-8's `/api/chat/stream`.
- No changes to `/api/briefing/*` or `/api/now/*` (TODAY authority owns these).
- No changes to `/api/live/*` (D-E4 defers UI removal without touching backend).
- No schema changes.
- No env-var changes.
- No auth-middleware changes beyond E-10's capability additions.
- No agent-orchestration changes.
- No changes to `_bootIdentity`, `applyRoleProfile`, or the setState registry.

**API contract preservation:**
- Existing `POST /chat` response shape (`{ reply, stream_plan }`) unchanged.
- SSE (`GET /api/chat/stream`) — new endpoint; existing `POST /chat` retained during transition (spec D8 explicit).

---

# SECTION P — ACCESSIBILITY REQUIREMENTS

- **Semantic structure:** `#page-command` uses `<main role="main">` semantics. Chat thread uses `<div role="log" aria-live="polite" aria-relevant="additions">`. Approval card uses `<section role="region" aria-labelledby="approval-title-N">`.
- **Keyboard:** Enter submits text; Shift+Enter newline; V toggles voice; Escape dismisses overlays; Tab/Shift-Tab traverses thread → input → mic → send → auto-listen → clear in a predictable order.
- **Screen reader:** Every archetype card is announced with its role and confidence label. Voice state transitions announce via `aria-live="polite"` (not "assertive" — do not steal focus from typed input). Approval cards use `aria-live="assertive"` (they demand attention).
- **Focus management:** Focus returns to `#chatInput` after send (unless approval card requires focus). After Escape on overlay, focus returns to prior anchor. Focus never traps unexpectedly.
- **Icons:** Mic MUST be SVG with `aria-label="Start voice"` (or state-specific label). Emoji `🎤` prohibited (P2-6 fix).
- **Contrast:** All colour usage MUST provide WCAG 2.1 AA contrast; confidence dots MUST be paired with text per D10 (never colour-only).
- **Touch targets:** ≥44×44px on mobile per spec §24.4.
- **Placeholder:** Text input placeholder communicates voice option — e.g. "Ask APEX anything — or tap the mic" (P2-7 fix).

---

# SECTION Q — PERFORMANCE REQUIREMENTS

- **COMMAND boot cost MUST NOT exceed 5 network requests** — ideally 0 (chat history is localStorage). The current widget/stars/orb/strip/health init cluster is REMOVED per D-E1/D-E2/E-4/E-5.
- **DCL / time-to-interactive** MUST NOT regress against V-09 baseline (dd1dd1f) — target ≤1300ms on the reference profile.
- **Animation frame budget:**
  - PlasmaOrb animation SHOULD run at ≤30fps on desktop when COMMAND is active; MUST be suspended when COMMAND is inactive (existing `cmdPausePage` pattern — keep and verify).
  - PlasmaOrb MUST NOT render on mobile (D2 mobile guard).
- **Duplicate calls:** Zero. Verified per V-11-D1 J-test pattern.
- **Cache correctness (I-14):** No cache keys added in E scope. If E-8 introduces streaming caching, keys MUST be namespaced `user:{humanId}:*`.
- **Payload:** Removal of `.cwid*` CSS, widget JS, Gemini Live UI, and duplicate `.cmd-split` rule reduces `dashboard.html` size measurably (target: ≥5KB gzipped reduction).

---

# SECTION R — SECURITY / AUTHORITY REQUIREMENTS

- **Capability enforcement (E-10):** Every one of the 21 tools per D-E6 map goes through `checkCapability` server-side. UI hiding is defence-in-depth only (I-9, I-10).
- **Role separation:** Agent orchestration panel rendered only when `capabilities.includes('agents.invoke')`. Server-side agent endpoints MUST also gate on the same capability (E-10 verifies this if not already enforced by V-11-A).
- **Chat history isolation:** `apex_chat_history_{humanId}` — the `_{humanId}` suffix is mandatory (D7 + V-11-N). Master's login browser holds only Master's history; User's login browser holds only User's. Cross-account access is not architecturally possible via localStorage because each authenticated session has its own identity.
- **Voice pipeline:** Voice commands hit the same `/chat` capability layer. STT/TTS providers MUST NOT leak identity in provider logs beyond what the current pipeline already does; E scope adds no new leakage.
- **Emergency access:** COMMAND MUST NOT expose an emergency-access affordance. That surface lives in SYSTEM per V-11-N §6.4.
- **No silent impersonation:** COMMAND MUST NOT provide a "chat as another user" affordance for Master. Even Master chats as Master.

---

# SECTION S — P0/P1/P2/P3 IMPLEMENTATION MATRIX

| ID | Issue | Severity | Package | Resolution status |
|---|---|---|---|---|
| P0-1 / AG-01 | `#chatLog display:none` | P0 | E-1 | Fix in E-1 (frontend, no auth) |
| P0-2 / AG-02 | No localStorage chat history | P0 | E-6 | Fix in E-6 (frontend, no auth) — namespaced per D7/V-11-N |
| P0-3 / AG-03 | No SSE streaming | P0 | E-8 | **REQUIRES OWNER APPROVAL** — interim: `stream_plan` retained per D-E5 |
| P0-4 / AG-04 | Global input zone on all pages | P0 | E-7 | Fix in E-7 (frontend, no auth) |
| P0-5 / AG-05 | Approval card before hidden `#chatLog` | P0 | E-1 + E-9 | Side-effect of E-1; verified in E-9 |
| P1-1 / AG-06 | PlasmaOrb interactive | P1 | E-5 | Fix in E-5 |
| P1-2 / AG-07 | Charter on COMMAND | P1 | E-3 | Move to SYSTEM Governance (E-3) |
| P1-3 / AG-08 | Multi-column layout | P1 | E-2 | Single-column (E-2) |
| P1-4 / AG-09 | Strip on COMMAND | P1 | E-4 | Move to TODAY (E-4) |
| P1-5 / AG-10 | Widget system | P1 | E-2 | Remove entirely per D-E2 |
| P1-6 / AG-11 | Activity feed | P1 | E-2 | Move to SYSTEM per D-E1 |
| P1-7 / AG-12 | Dual voice endpoint | P1 | E-5 / E-7 | Consolidate onto `/chat` path in E-5/E-7 |
| P1-8 / AG-13 | `stream_plan` fake streaming | P1 | E-9 / E-8 | Interim per D-E5; superseded by E-8 |
| P1-9 / AG-14 | No capability enforcement | P1 | E-10 | **REQUIRES OWNER APPROVAL** |
| P1-10 / AG-15 | `#v11-cmd-agent-panel` reference | P1 | E-9 | Either author panel HTML (Master-gated) or remove reference in E-9 |
| P1-11 / AG-16 | Mobile PlasmaOrb guard | P1 | E-5 | Add `window.innerWidth < 768` guard in E-5 |
| P2-1 / AG-17 | Duplicate `.cmd-split` CSS | P2 | E-2 | Delete dead rule in E-2 |
| P2-2 / AG-18 | Duplicate `#waveform` | P2 | E-5 | Deduplicate in E-5 |
| P2-3 / AG-19 | Console.log in production | P2 | E-11 (cleanup) | Cleanup pass |
| P2-4 / AG-20 | No feedback on clearChat | P2 | E-9 | Add toast/confirmation in E-9 |
| P2-5 / AG-21 | "Auto" label | P2 | E-7 | Rename to "Auto-listen" with aria-pressed |
| P2-6 / AG-22 | Emoji mic button | P2 | E-7 | Replace with SVG + aria-label |
| P2-7 / AG-23 | Placeholder doesn't mention voice | P2 | E-7 | Update placeholder text |
| P2-8 / AG-24 | Input zone not contextually adapted | P2 | E-7 | Scope + adapt in E-7 |
| P3-1 / AG-25 | Command palette ⌘K | P3 | Deferred | Post E-series |
| P3-2 / AG-26 | SD-1 voice result overlay | P3 | E-11 (optional) or post-E | Implement after E-1..E-7 stable; may slip |
| P3-3 / AG-27 | Swipe nav dots | P3 | Deferred | Post E-series |
| P3-4 / AG-28 | Default page settings UI | P3 | Deferred | Post E-series (PROFILE Phase J) |
| P3-5 / AG-29 | Keyboard shortcuts complete | P3 | E-11 (partial) | Add V and Escape at minimum in E-11 |

---

# SECTION T — FILE / COMPONENT OWNERSHIP

| Scope | File(s) touched |
|---|---|
| E-1 chat visibility | `public/dashboard.html` (remove `style="display:none"` from `#chatLog`; verify position) |
| E-2 layout | `public/dashboard.html` (CSS + HTML inside `#page-command`; remove `.cmd-split`, `.cmd-feed-col`, `.cwid*`, `#cmdSidebar`, `#cmdWidgetLayer`, `#apexLivePill` and Gemini Live overlay; consolidate to single-column flex; delete duplicate `.cmd-split` CSS) |
| E-3 Charter | `public/dashboard.html` (cut Charter HTML block from `#page-command`; paste into `#page-governance` or the SYSTEM governance section) |
| E-4 strip | `public/dashboard.html` (remove `#cmdStrip` from `#page-command`; verify strip on TODAY per V-11-D1; ensure `renderStrip()` and `startStripPoll()` are TODAY-scoped) |
| E-5 orb | `public/dashboard.html` (remove `data-fn="startVoice"` from `#plasmaOrb`; opacity ~15%; add mobile guard; remove `#plasmaOrbSubLabel` or repurpose; deduplicate `#waveform`; remove hidden inner `#micBtn`; consolidate voice trigger to topbar mic) |
| E-6 history | `public/dashboard.html` (`apex_chat_history_{humanId}` read/write; logout clear hook; FIFO 100) |
| E-7 input scope | `public/dashboard.html` (CSS scoping or structural move; auto-listen label + SVG mic + placeholder update) |
| E-8 SSE (**auth req.**) | `public/dashboard.html` (EventSource client); `src/routes/chat-stream.js` (new); `server.js` (mount) |
| E-9 archetypes | `public/dashboard.html` (response card renderer for Archetypes 1–12; approval card rendered inline; `#v11-cmd-agent-panel` either created or reference removed; toast for clearChat) |
| E-10 capability (**auth req.**) | `src/routes/chat.js`, `lib/middleware.js` (per D-E6 map); tool dispatch wraps capability denials into natural-language reply |
| E-11 cleanup | `public/dashboard.html` (remove console.log noise; add V + Escape shortcuts; documentation-adjacent polish) |
| Documentation | `docs/interface/V-11-E-IMPLEMENTATION-CONTRACT.md` (this file), `docs/interface/V-11-E-DECISION-RESOLUTION-CERTIFICATION.md` (the certification) |
| Tests | `playwright-v11e-verify.js` (new suite for E units); minor updates to `playwright-v11d1-verify.js` / `playwright-v11d2-verify.js` if a regression pattern emerges |

---

# SECTION U — IMPLEMENTATION SEQUENCING (packages E-1 through E-11)

Each package is independently committable except where dependency-flagged. Deployment forbidden until final integration certification.

**E-1 — Chat thread visibility**
- Objective: Remove `display:none` from `#chatLog`; verify visible chat output.
- Files: `public/dashboard.html`
- Classification: Frontend
- Dependencies: none (foundational)
- Risk: LOW
- Tests: New Playwright — submit text command, assert `.chat-bubble` visible in DOM. Approval card visible when triggered.
- Acceptance: user-sent text produces visible APEX reply; approval card visible.
- Independently committable: YES
- Deployment forbidden until: E-9 integration certified (avoid shipping thread visible but archetypes unfinished).

**E-2 — Single-column layout + widget/feed/Gemini Live removal**
- Objective: Replace `.cmd-split` with single-column flex; remove widget system per D-E2; remove Gemini Live UI per D-E4; move activity feed to SYSTEM per D-E1; delete duplicate `.cmd-split` CSS.
- Files: `public/dashboard.html`
- Classification: Frontend
- Dependencies: E-1
- Risk: MEDIUM (large surface removal)
- Tests: layout renders single-column; thread scrollable; input anchored bottom; mobile layout renders single-column; no widget/orb-interactive/Gemini-Live remnants; activity feed appears in SYSTEM.
- Acceptance: `#page-command` matches spec §7.2 layout.
- Independently committable: YES
- Deployment forbidden until: E-9 integration.

**E-3 — Charter → SYSTEM Governance**
- Objective: Move APEX Constitution Charter from `#page-command` to SYSTEM governance section.
- Files: `public/dashboard.html`
- Classification: Frontend
- Dependencies: none
- Risk: LOW
- Tests: Charter absent from `#page-command`; Charter visible in SYSTEM governance.
- Acceptance: `H` section regression in V-11-D1 (governance preserved) still passes.
- Independently committable: YES (may commit in parallel with E-1)
- Deployment forbidden until: E-9 integration.

**E-4 — Strip removal from COMMAND**
- Objective: Remove `#cmdStrip` from `#page-command`; ensure strip metrics live on TODAY per V-11-D1; strip poll never runs when COMMAND is active only.
- Files: `public/dashboard.html`
- Classification: Frontend
- Dependencies: E-2
- Risk: LOW
- Tests: strip absent on COMMAND; strip present on TODAY; no strip poll when COMMAND active.
- Independently committable: YES
- Deployment forbidden until: E-9 integration.

**E-5 — PlasmaOrb ambient + voice trigger to topbar**
- Objective: Remove orb interactivity; opacity 15%; mobile guard; deduplicate `#waveform`; consolidate mic to topbar; voice endpoint consolidation.
- Files: `public/dashboard.html`
- Classification: Frontend
- Dependencies: E-2
- Risk: MEDIUM (voice pipeline touch)
- Tests: clicking orb does NOT trigger voice; topbar mic triggers voice; mobile viewport does NOT render orb canvas; only one `#waveform` element in DOM.
- Independently committable: YES
- Deployment forbidden until: E-9 integration.

**E-6 — localStorage chat history (per-identity)**
- Objective: `apex_chat_history_{humanId}` FIFO 100; logout clear; read on init.
- Files: `public/dashboard.html`
- Classification: Frontend
- Dependencies: E-1, E-2
- Risk: LOW
- Tests: send 5 messages → navigate away → return → 5 messages restored. Logout → thread empty. Correct namespacing verified via localStorage key inspection.
- Independently committable: YES
- Deployment forbidden until: E-9 integration.

**E-7 — Input zone scoped to COMMAND + accessibility polish**
- Objective: Input zone visible only on COMMAND; SVG mic with aria-label; auto-listen chip with aria-pressed; placeholder mentions voice.
- Files: `public/dashboard.html`
- Classification: Frontend
- Dependencies: E-1, E-2, E-6
- Risk: MEDIUM (structural relocation may affect z-index and focus)
- Tests: navigate to TODAY/LIFE&WORK/etc. → input zone hidden. Navigate to COMMAND → visible + functional.
- Independently committable: YES
- Deployment forbidden until: E-9 integration.

**E-8 — SSE streaming (**REQUIRES OWNER APPROVAL**)**
- Objective: New `GET /api/chat/stream`; EventSource client; retain `POST /chat` for compatibility.
- Files: `public/dashboard.html`, `src/routes/chat-stream.js` (new), `server.js`
- Classification: Backend + Frontend
- Dependencies: E-1, E-2, E-6, E-7; and OWNER APPROVAL
- Risk: HIGH (new backend route; auth semantics; new streaming contract)
- Tests: stream chunks arrive in-flight; fall back to `POST /chat` if SSE fails; auth middleware applied.
- Independently committable: YES (once authorised)
- Deployment forbidden until: E-8 tests + regression matrix green; owner sign-off.

**E-9 — Response card archetypes + approval card + agent panel decision**
- Objective: Implement Archetype 1–12 renderer with L0–L3 progressive disclosure; inline approval card; either author `#v11-cmd-agent-panel` (Master-gated by `applyRoleProfile`) or remove the dead reference; toast for clearChat.
- Files: `public/dashboard.html`
- Classification: Frontend
- Dependencies: E-1, E-2, E-6
- Risk: MEDIUM
- Tests: each of the 12 archetypes renders correctly; L0 visible; L1 expands on tap; approval card visible + actionable; role-gated agent panel visible only for Master (or reference cleaned).
- Independently committable: YES
- Deployment forbidden until: E-9 tests + full regression green.

**E-10 — Backend capability enforcement (**REQUIRES OWNER APPROVAL**)**
- Objective: Enforce capability map from Section D-E6 across all 21 tools in `src/routes/chat.js`; wrap denials into natural-language replies per V-11-N §7.3.
- Files: `src/routes/chat.js`, `lib/middleware.js`
- Classification: Backend
- Dependencies: OWNER APPROVAL + locked capability map
- Risk: HIGH (auth surface expansion)
- Tests: User attempts finance tool → natural-language decline (no HTTP 403 leaked); Master succeeds; each of 21 tools gated correctly.
- Independently committable: YES (once authorised)
- Deployment forbidden until: E-10 tests + full regression green; owner sign-off.

**E-11 — Cleanup + accessibility hardening**
- Objective: Remove console.log noise; add V and Escape shortcuts at minimum; final aria audit; optional SD-1 overlay if time permits.
- Files: `public/dashboard.html`
- Classification: Frontend
- Dependencies: E-1 through E-9
- Risk: LOW
- Tests: aria audit passes; keyboard shortcuts pass; no console.log in production paths.
- Independently committable: YES
- Deployment forbidden until: everything above green.

---

# SECTION V — REGRESSION GATES

Every package MUST run the corresponding test suites before merging. **Blocking gates:**

| Regressed area | Required test result |
|---|---|
| V-11-A multi-profile shell foundation | 29/29 PASS (existing) |
| V-11-B universal state architecture | 29/29 PASS (existing) |
| V-11-C canonical API error semantics | existing tests PASS |
| V-11-D1 TODAY navigation | 45/45 PASS (existing) — TODAY MUST NOT regress |
| V-11-D2 TODAY default + hash sync | 37/37 PASS (existing) — boot resolver MUST NOT regress |
| V-11-E new suite | new Playwright to be authored; all package acceptance tests PASS |

**Package → regression matrix:**

| Package | V-11-A | V-11-B | V-11-C | V-11-D1 | V-11-D2 | Notes |
|---|---|---|---|---|---|---|
| E-1 | ✓ | ✓ | ✓ | ✓ | ✓ | must confirm no TODAY init regression |
| E-2 | ✓ | ✓ | ✓ | ✓ | ✓ | biggest surface removal; watch nav |
| E-3 | ✓ | ✓ | ✓ | ✓ | ✓ | governance reachability check |
| E-4 | ✓ | ✓ | ✓ | ✓ (strip on TODAY works) | ✓ | strip lifecycle check |
| E-5 | ✓ | ✓ | ✓ | ✓ | ✓ | voice smoke test on all pages |
| E-6 | ✓ | ✓ | ✓ | ✓ | ✓ | history namespacing check |
| E-7 | ✓ | ✓ | ✓ | ✓ (input not visible on TODAY) | ✓ | check TODAY, LIFE&WORK, INTELLIGENCE, ACTIONS, SYSTEM |
| E-8 | ✓ | ✓ | ✓ | ✓ | ✓ | SSE fallback must not break existing chat |
| E-9 | ✓ | ✓ | ✓ | ✓ | ✓ | archetype cards must not break state semantics |
| E-10 | ✓ | ✓ | ✓ | ✓ | ✓ | capability grants must not break Master flows |
| E-11 | ✓ | ✓ | ✓ | ✓ | ✓ | final full-matrix pass |

---

# SECTION W — EXPLICIT NON-GOALS

V-11-E does NOT:
1. Author or expose new backend routes beyond E-8's `/api/chat/stream` (and E-8 requires explicit owner approval).
2. Modify any TODAY panel (V-11-D1 authority — untouched).
3. Add or modify `_bootIdentity()`, `applyRoleProfile()`, or the setState registry.
4. Change existing API contracts for `/chat`, `/api/briefing/*`, or `/api/now/*`.
5. Deploy anything.
6. Introduce server-side chat history persistence (D7 Phase 2 requires separate authorisation).
7. Implement the full PROFILE Phase J information architecture — E scope stubs the voice-preference hook only.
8. Add or remove SYSTEM/PROFILE features beyond receiving the Charter and Activity feed relocations.
9. Add SSE without E-8 owner approval.
10. Enforce chat capabilities without E-10 owner approval + confirmed capability map.
11. Modify any environment variables.
12. Alter authentication, JWT, or session logic.
13. Introduce a competing design-token namespace (widget tokens are removed, not renamed).
14. Modify mobile navigation structure (V-11-A + V-11-D authority).
15. Introduce PlasmaOrb on mobile under any circumstances.
16. Introduce a floating desktop activity panel (D-E1 rejected option b).
17. Introduce a "widgets" toggle mode (D-E2 rejected option c).
18. Introduce Gemini Live parallel voice mode on COMMAND (D-E4 defers UI removal).
19. Change TTS/STT providers or priority order.
20. Expose L4 detail on COMMAND (L4 is SYSTEM-only per spec Part III).

---

# SECTION X — ROLLBACK STRATEGY

Each package produces one focused commit. Rollback = `git revert <package-commit>`.

| Package | Rollback effect |
|---|---|
| E-1 | Re-adds `display:none` to `#chatLog`; text output invisible again. |
| E-2 | Restores widget system, `.cmd-split`, Gemini Live UI, activity feed; regresses layout. |
| E-3 | Charter returns to COMMAND; SYSTEM Governance loses inline Charter. |
| E-4 | Strip returns to COMMAND. |
| E-5 | Orb interactive again; mobile orb again; duplicate `#waveform` and inner mic return. |
| E-6 | Chat history not persisted. |
| E-7 | Input zone visible on all pages; old aria/label restored. |
| E-8 | SSE endpoint removed; client falls back to `POST /chat` (which is retained throughout). |
| E-9 | Archetype rendering removed; flat bubbles return; approval card may need patch. |
| E-10 | Capability enforcement removed; unrestricted tool access returns (E-10 revert is safe only alongside a manual audit). |
| E-11 | Cleanup reverts; may reintroduce console.log noise. |

Rollback order MUST reverse commit order (newer packages before older). E-1 revert is not blocked by any other package (all others build on it but revert of E-1 does not require reverting them — they gracefully degrade).

---

# SECTION Y — DEFINITION OF DONE (V-11-E certification criteria)

V-11-E is CERTIFIED when all of the following hold:

1. All P0 items resolved (E-1, E-6, E-7 shipped; E-8 either shipped under owner approval or explicitly deferred with `stream_plan` interim state maintained).
2. All P1 items resolved or explicitly deferred with owner acknowledgement (E-2, E-3, E-4, E-5, E-9 shipped; E-10 either shipped under owner approval or explicitly deferred).
3. All P2 items in E-2/E-5/E-7/E-9/E-11 scope shipped.
4. New Playwright suite `playwright-v11e-verify.js` written and passing 100%.
5. V-11-A (29/29), V-11-B (29/29), V-11-C (existing PASS), V-11-D1 (45/45), V-11-D2 (37/37) all regress green.
6. No console errors on any page (verified by playwright).
7. No horizontal overflow at 375px, 768px, 1024px, 1280px, 1660px viewports.
8. Master and User both boot to TODAY (D2 preserved).
9. Both profiles see COMMAND on navigation (RD-1 preserved).
10. User COMMAND does NOT render agent panel; Master COMMAND does (once E-9 authors it) or reference cleanly removed if agent panel is deferred to Phase J.
11. Chat history round-trips per identity, per D7.
12. Voice pipeline routes through topbar mic on all pages.
13. Approval cards are inline in the visible thread and actionable.
14. PlasmaOrb ambient (~15% opacity) on desktop only; not rendered on mobile.
15. Activity feed lives in SYSTEM (not COMMAND). Charter lives in SYSTEM Governance (not COMMAND).
16. Widget system, `#cmdSidebar`, `#cmdWidgetLayer`, `.cwid*` code entirely removed.
17. Gemini Live UI removed from `#page-command` (backend routes untouched).
18. No new backend routes beyond E-8's `/api/chat/stream` (if authorised).
19. No schema/env changes.
20. Production remains at dd1dd1f (per prior certification convention). Deployment authorisation is a separate step.
21. This document + the DECISION-RESOLUTION-CERTIFICATION.md constitute the authorisation record.

---

# TRACEABILITY MATRIX

Map from key user questions on COMMAND to the full response contract. Rows are illustrative canonical questions.

| Product question | Destination | Surface | Data source | Authority | Disclosure level | State model | Evidence path | Mobile behaviour | Desktop behaviour |
|---|---|---|---|---|---|---|---|---|---|
| "What should I focus on?" | TODAY (primary) — mirrored to COMMAND if asked in chat | TODAY summary + Needs You | `/api/briefing/priority-inbox`, `/api/briefing/today` (or `/api/now/summary` post-D6) | Own identity scope (I-3); Master sees full, User sees personal | L0 headline, L1 detail, L2 evidence | ready / loading / empty / failed / stale | tap Needs You item → detail sheet | single column, bottom sheet | single column with side context |
| "What's my financial position?" | LIFE & WORK → Finance | Finance tab within LIFE & WORK | `/api/finance/summary` | Master: full; User: **NOT default-visible** (finance capability not default per V-11-N §7.2) | L0 balance summary, L1 categories, L2 transactions | ready/empty/failed/stale | tap category → transaction list | bottom sheet | side panel |
| "Send a message to X" | COMMAND | Chat with tool call (browser fill or email) | `POST /chat` invoking `browser_fill_form` or email tool | E-10: `browser_fill_form` requires `research.browse.act` + approval — Master default; User only if granted | L0 confirmation, L1 payload preview, L2 send log | thinking → processing → approval-required → complete | Archetype 6 approval card with detail expand | inline in thread, full-screen approval | inline in thread |
| "What do you know about me?" | SYSTEM (= PROFILE) → Personal Context + Memory | PROFILE Memory browser | Episodic memory scoped to own `human_id` (I-3, I-7) | User: own; Master: own only (Layer 3 wall) | L0 categories, L1 timeline, L2 individual entries | ready/empty | tap entry → full detail | bottom sheet | side panel |
| "Why are you recommending this?" | COMMAND | Archetype 2/3 with L1/L2 disclosure | Whatever produced the recommendation | Own scope; explanation drawn from authorised data only (V-11-N §16.1) | L0 recommendation, L1 process, L2 evidence, L3 reasoning | ready | tap chevron | expand inline (mobile: bottom sheet if >1 screen) | expand inline |
| "What can APEX do for me?" | SYSTEM (= PROFILE) → Capabilities | PROFILE Capabilities section (human-readable) | Capability set from `humans` + `user_capability_overrides` | Own | L0 list of capabilities, L1 how-to-request-more | ready | tap "Contact system owner" | bottom sheet | side panel |
| "What can APEX NOT do?" | COMMAND (in-chat via V-11-N §7.3 pattern) or PROFILE Capabilities | Chat reply / PROFILE list | Capability set | Own | L0 human-language decline + alternative | forbidden state | link to PROFILE → Capabilities | natural-language reply | natural-language reply |
| "Who can see my data?" | SYSTEM (= PROFILE) → Privacy | Privacy Disclosure + Access History | audit_log records for own emergency access | Own | L0 disclosure statement, L1 access history | ready/empty | tap access event → detail | bottom sheet | side panel |
| "Log a workout" | LIFE & WORK → Health OR COMMAND (with tool) | Health form OR chat tool `health.workouts.write` | Health tables | User: default `health.workouts.write` (V-11-N §7.2) | L0 confirmation, L1 detail | thinking → complete | tap "View" → workout detail | inline | inline |
| "Approve the pending task" | ACTIONS or COMMAND (via approval card) | Archetype 6 or ACTIONS approval queue | tasks table | Own approvals only | L0 title + Approve/Reject | approval-required | tap "View detail" → full task | inline | inline |
| "Show me all users" (Master only) | SYSTEM → Users | Master admin surface | `humans` table filtered | Master (I-2, I-9) | L0 list, L1 detail, L2 activity | ready | tap user → detail (no Layer 3) | not in E scope | not in E scope |
| "Emergency access to [User]'s memory" (Master only) | SYSTEM → Users → [User] → Emergency Access | Master-only form | `audit_log` write + Layer-5 read | Master + emergency protocol | L0 reason form, L1 confirmation, L2 audit record | ready | disabled if not Master | not in E scope | not in E scope |

Note: Emergency access, User management, and PROFILE full build-out are Phase I/J of the V-11-N roadmap, not V-11-E scope. Rows above establish the canonical answer path only.

---

# ARCHITECTURAL DRIFT AUDIT

Proposed V-11-E work audited against every prior certified deliverable and constitutional lock.

| Risk | Present in V-11-E? | Mitigation |
|---|---|---|
| Weaken Master/User separation | No | RD-1 preserved; agent panel role-gated; E-10 tightens rather than loosens. |
| Expose User private data | No | Chat history strictly namespaced `_{humanId}`; no cross-user paths; E-10 wraps all tools in scopeData+capability. |
| Create role-specific navigation divergence | No | All six destinations universal for both profiles; only intra-destination content differs (V-11-N §11.2). |
| Duplicate API calls | No | Reconnaissance-verified: COMMAND does not call `/api/briefing/*`; strip poll lives on TODAY only after E-4. |
| Regress TODAY | No | E scope explicitly forbids touching V-11-D1 code paths; regression gate enforces 45/45 PASS. |
| Reintroduce blank/ambiguous states | No | Every zone has ready/empty/failed/stale/offline/forbidden state per Section K; enforced by V-11-B setState. |
| Bypass canonical API error semantics | No | V-11-C error contract retained; E-10 wraps denials into natural-language chat replies, not error codes. |
| Break hash navigation | No | E scope does not touch `switchPage`, `_resolveBootPage`, or hash sync (V-11-D2 preserved). |
| Break mobile navigation | No | Bottom-tab structure unchanged; input zone scoping respects mobile safe area. |
| Reintroduce horizontal overflow | No | Single-column layout enforced; regression gate at 375px viewport. |
| Increase boot-time work | No | Reduces boot: widgets/stars/strip/Gemini Live init removed; only chat-history read (localStorage). |
| Create another competing design-token namespace | No | Widget `.cwid-*` tokens are REMOVED, not renamed or shadowed. |
| Reintroduce raw implementation detail into primary UX | No | L4 remains SYSTEM-only; capability names, HTTP codes, agent role names never leak into COMMAND L0. |
| Add server-side chat persistence prematurely | No | D7 Phase 2 explicitly out of scope. |
| Add cache keys without identity namespacing | No | E-8 (if authorised) enforces `user:{humanId}:*` per I-14. |
| Introduce silent auto-listen escalation | No | Auto-listen persistence is user-initiated (D-E3). |
| Bypass approval flow for consequential actions | No | E-10 requires approval gate for `browser.act`, `delete_file`, `delete_document`, `rename_file`. |
| Break `_bootIdentity` | No | E scope explicitly forbids modification (E-11 verifies). |

---

# ZERO-CONTEXT USER TEST (on paper)

Assume beta tester "Jordan" opens APEX post V-11-E with no prior explanation. Boot lands on TODAY (D2). Jordan then taps COMMAND.

| Question | Answer at 5s | Answer at 30s |
|---|---|---|
| What is this page? | "Command" title in topbar + subtitle "Ask APEX anything". Welcome archetype in thread. | Clear: this is a conversational AI surface. |
| What does APEX know? | Not directly answered on COMMAND. | Discoverable in PROFILE → Personal Context (must navigate). **Gap:** COMMAND could hint at PROFILE. |
| What does APEX need? | Nothing — welcome hints. | Clear: input or voice. |
| What is APEX doing? | Idle. If a message is sent, "APEX is thinking…" appears within 100ms. | Clear via state machine. |
| What requires attention? | If a pending approval exists, Archetype 6 card visible at top of thread. | Clear. |
| Why is something recommended? | L0 shows recommendation + confidence dot. | Tap chevron → L1 process; tap again → L2 evidence. |
| Can I inspect evidence? | Yes — L1/L2 disclosure. | Clear within 2 taps. |
| Can I understand confidence? | L0 shows "● High" (dot + word). | L1 shows explanatory sentence. |
| Empty vs failed? | Empty = welcome tone card. Failed = red inline error + Retry. | Distinct visual language per V-11-B. |
| Stale? | Timestamp label ("12m ago") on any dated card. | Clear. |
| What is APEX allowed to do? | Not directly on COMMAND. | Discoverable in PROFILE → Capabilities. **Gap:** first-time users may need a link. |
| What can APEX NOT do? | Encountered organically when APEX declines in natural language. | User can view PROFILE → Capabilities for full list. |
| Privacy boundary? | Not surfaced on COMMAND. | Discoverable in PROFILE → Privacy (was disclosed at onboarding per V-11-N §6.5). |
| How to ask? | Input placeholder "Ask APEX anything — or tap the mic". | Clear. |
| Recover from mistake? | Clear button on input; Retry on failed send; Undo banner (SD-3) on consequential actions. | Clear. |

**Remaining UX gaps identified (document only, do not implement in E scope):**
1. No inline "Learn what I can do" chip in the welcome archetype linking to PROFILE → Capabilities. Recommend adding in a subsequent phase (post V-11-E).
2. No inline privacy peek ("Your chat is private — learn more") linking to PROFILE → Privacy. Recommend adding in Phase J with full PROFILE build.
3. Command palette (⌘K) still absent — deferred.
4. Swipe-nav dots still absent on mobile — deferred (V-11 D9).
5. SD-1 overlay may or may not ship in E-11; if deferred, voice-off-COMMAND still appends to thread but has no overlay feedback.

These gaps are non-blocking for V-11-E certification.

---

*End of V-11-E Implementation Contract.*
*Document class: Canonical Implementation Contract*
*All six V-11-E open decisions resolved (D-E6 flagged for owner approval before E-10 execution; D-E2 and D-E4 flagged for owner confirmation of destructive removal).*
*Production: UNCHANGED (dd1dd1f deployment reference).*
*Application code changes in this document: NONE.*
