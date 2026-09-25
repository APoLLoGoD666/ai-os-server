# POST-UX-19 PRODUCTION GAP INVENTORY

**Document ID:** POST-UX-19-PRODUCTION-GAP-INVENTORY  
**Phase:** Post-UX-19 Reconciliation — Phase 1 (Inventory)  
**Date:** 2026-08-28  
**Status:** AUTHORITATIVE  
**Source documents:** UX-19-INTEGRATION-BASELINE.md (86 findings), UX-19-INTEGRATION-E2E-CERTIFICATION.md (31 sections)  
**Scope:** All remaining gaps in `public/dashboard.html` and dependent backend after UX-19 integration pass  

---

## SECTION 1 — CLASSIFICATION SYSTEM (A through I)

Each gap is assigned a single primary classification from the following nine classes:

| Class | Name | Definition |
|-------|------|-----------|
| **A** | Frontend-only | CSS, HTML, or JS addition requiring no new backend dependency. All APIs and data already available. |
| **B** | API consumer wiring | Backend route confirmed present; frontend has not yet connected to it. No new backend work required. |
| **C** | Missing backend route | New server-side route (in `server.js`, `src/routes/`, or `routes/`) must be created before frontend can proceed. |
| **D** | Constitutional propagation | Existing kernel or governance data must be surfaced in API response bodies. Requires `lib/governance.js`, `lib/kernel.js`, or route middleware change. |
| **E** | Event infrastructure | `lib/viz-broadcaster.js` or `lib/event-bus.js` must be extended. May include new WebSocket event shapes. |
| **F** | Architectural workstream | New cross-cutting system requiring design, new files, and multi-surface coordination. Cannot be added as a patch. |
| **G** | Design system cleanup | Deprecation, consolidation, or migration of existing CSS, fonts, or icons. Changes existing visual artifacts. |
| **H** | Structural replacement | Replaces or refactors an existing UI pattern (not purely additive). Risk of regression in existing components. |
| **I** | Open decision | Requires a product or architecture decision before implementation can begin. Blocked on human judgment. |

---

## SECTION 2 — UX-19 RESOLVED GAPS (CLOSED — NOT IN INVENTORY)

The following baseline findings were resolved by the UX-19 integration pass. They are listed here for completeness and must not be reopened without evidence of regression.

| Baseline Finding | Description | Resolution |
|-----------------|-------------|-----------|
| F-015 | `page-activity` absent | CLOSED — page-activity added with /ws/viz WebSocket, /api/timeline, /notifications |
| F-016 | `page-agents` absent | CLOSED (PARTIAL) — page-agents added; health_agent gap documented as GAP-08 |
| F-017 | `page-approvals` absent | CLOSED — page-approvals added with two-step modal |
| F-023 | `setOrbState()` 4 states only | CLOSED — expanded to 11 canonical UX-07 states |
| F-024 | `activating` state missing | CLOSED — mapped; CSS class added |
| F-025 | `live` state missing | CLOSED — mapped to speaking/live; CSS class added |
| F-026 | `failed` state missing | CLOSED — CSS class + label added |
| F-027 | `interrupted` state missing | CLOSED — CSS class + label added |
| F-028 | `paused` state missing | CLOSED — CSS class + label added |
| F-029 | `cancelled` state missing | CLOSED — CSS class + label added |
| F-030 | Waveform inactive during SPEAKING | CLOSED — waveform now activates in SPEAKING state |
| F-031 | Waveform inactive during LIVE | CLOSED — waveform activates in LIVE state |
| F-032 | `--apex-color-*` token namespace absent | CLOSED — 22 tokens + 5 z-index + 4 duration tokens added as additive `:root` block |
| F-039 | 640px breakpoint absent | CLOSED — tablet portrait breakpoint added |
| F-040 | 1024px breakpoint absent | CLOSED — mobile landscape breakpoint added (max-width: 1023px + max-height: 499px) |
| F-041 | 1280px breakpoint absent | CLOSED — desktop compact breakpoint added |
| F-042 | 1440px breakpoint absent | CLOSED — wide desktop breakpoint added |
| F-047 | Two-step approval modal absent | CLOSED — `#apexApprModal` implemented with role="dialog" aria-modal="true" |
| F-080 | 44px touch targets at <900px | OBSERVED (pre-existing, confirmed adequate) |
| F-081 | Touch targets absent 640–1023px | CLOSED — approval modal buttons explicitly 44px minimum |

**Net: 19 findings closed. 0 regressions introduced (all additions, zero deletions).**

---

## SECTION 3 — REMAINING GAP INVENTORY

### 3.1 Priority Tiers

| Tier | Label | Meaning |
|------|-------|---------|
| **P0** | Beta-correctness | Affects correctness of currently certified beta surfaces. Must close before production beta. |
| **P1** | Beta-quality | Current beta functions but delivers degraded or incomplete UX within stated scope. Close within first beta sprint. |
| **P2** | Roadmap | Adds meaningful new surface or capability. Schedule explicitly before next certification. |
| **P3** | Long-term | Architectural workstreams or cleanup. Cannot be patched; require dedicated design phase. |

---

### 3.2 Complete Gap Register

| Gap ID | Description | UX Authority | Class | Priority | Beta-usable today? |
|--------|-------------|-------------|-------|----------|-------------------|
| **GAP-01** | L0-L4 progressive disclosure architecture | UX-08 | F | P3 | Yes — flat-card fallback present |
| **GAP-02** | Voice-state notification suppression | UX-09 | F | P3 | Yes — notifications delivered without suppression |
| **GAP-03** | Notification deduplication ring buffer | UX-09 | F | P3 | Yes — duplicates may appear |
| **GAP-04** | Attention budget enforcement (max N/hour) | UX-09 | F | P3 | Yes — no budget enforced |
| **GAP-05** | Domain token application (`--apex-color-*` wired to domain elements) | UX-10 | A | P2 | Yes — tokens exist, not applied |
| **GAP-06** | Knowledge panel frontend surface | UX-11 | C or B* | P2 | No surface exists |
| **GAP-07** | Intelligence panel frontend surface (dedicated route) | UX-12 | C | P2 | No surface exists |
| **GAP-08** | Health agent surface (`health_agent` absent in domain agent list) | UX-13 | I | P3 | Agent not in production |
| **GAP-09** | Agent capability/authority matrix display | UX-13 | B | P2 | APIs exist; no display |
| **GAP-10** | Task rejection route (`POST /api/tasks/:id/reject`) | UX-14 | C | P1 | Graceful fallback active |
| **GAP-11** | Undo route (expose `pgMarkAgentActionUndone`) | UX-14 | C | P2 | No route; no fallback needed |
| **GAP-12** | `pgInsertApproval()` frontend audit wiring verification | UX-14 | B | P0 | Unknown — may be missing |
| **GAP-13** | Standing approvals route (`GET /api/tasks/standing-approvals`) | UX-14 | C | P1 | "Unavailable" fallback shown |
| **GAP-14** | Memory inspection panel frontend surface | UX-15 | C | P2 | BLOCKED — no public route |
| **GAP-15** | Memory correction route (`PATCH /api/memory/:id` or equivalent) | UX-15 | C | P2 | BLOCKED — no route |
| **GAP-16** | Memory deletion route (`DELETE /api/memory/:id` or equivalent) | UX-15 | C | P2 | BLOCKED — no route |
| **GAP-17** | Constitutional dashboard frontend surface | UX-16 | D | P2 | BLOCKED — no data propagation |
| **GAP-18** | `ExecutionContext.constitution` propagation to API response body | UX-16 | D | P2 | BLOCKED — data not in response |
| **GAP-19** | Constitutional audit log route | UX-16 | C | P2 | No route |
| **GAP-20** | Viz-broadcaster event type expansion (Voice, Tool, System, Error, Memory, Gov) | UX-17 | E | P1 | AGENT events only |
| **GAP-21** | `correlation_id` in event bus payloads | UX-17 | E | P2 | Events uncorrelated |
| **GAP-22** | Historical event query API (paginated log beyond 20-task window) | UX-17 | C | P2 | 20-task window only |
| **GAP-23** | Full 17-category taxonomy live data (12 of 17 CSS-only) | UX-17 | E | P1 | Category CSS ready; data absent |
| **GAP-24** | Bottom sheet slide-up component (mobile UX-08/UX-18) | UX-08/18 | F | P3 | Depends on L0-L4 (GAP-01) |
| **GAP-25** | 5-tab persistent bottom nav bar (replacing hamburger dropdown) | UX-18 | H | P3 | Dropdown functional |
| **GAP-26** | Safe-area FAB (floating action button) | UX-18 | H | P3 | Not required for current surfaces |
| **GAP-27** | Style block consolidation (8 `<style>` blocks → 1) | UX-05 | G | P3 | Functional; INV-VS-02 non-compliant |
| **GAP-28** | Retired font removal (IBM Plex Sans, Space Grotesk from CDN) | UX-05 | G | P2 | Loaded but unused |
| **GAP-29** | SVG icon system (replacing emoji nav icons) | UX-05 | G | P3 | Emoji functional |
| **GAP-30** | Domain page quality standardization | UX-10 | H | P3 | Pre-existing inconsistency |
| **GAP-31** | Agent grid architecture decision: page-system vs. page-agents scope (OPEN-001) | UX-13 | I | P2 | System page retains grid for now |
| **GAP-32** | `/api/knowledge` route existence verification | UX-11 | I | P0 | Conflict between baseline and certification |

*GAP-06: Baseline (F-070) lists `GET /api/knowledge` as OBSERVED; certification §12 says route not found. Requires live verification before classification can be locked.

---

## SECTION 4 — GAP DETAIL RECORDS

### GAP-01 — L0-L4 Progressive Disclosure Architecture
**UX authority:** UX-08 §2  
**Class:** F (Architectural workstream)  
**Priority:** P3  
**Description:** UX-08 defines five disclosure levels (L0 ambient, L1 summary card, L2 detail sheet, L3 full surface, L4 expert/raw). No system exists. All current surfaces (activity, agents, approvals) render flat cards.  
**Impact:** Every card-based surface in the UI. Cannot be added as a patch — requires a state machine, transition animation system, and cross-surface design pass.  
**Dependency:** GAP-24 (bottom sheet) and GAP-02 (proactive suppression) both depend on GAP-01 architecture being designed first.  
**Pre-condition to resolve:** Dedicated design phase for L0-L4 state machine contract.  

---

### GAP-02 — Voice-State Notification Suppression
**UX authority:** UX-09 §3  
**Class:** F (Architectural workstream)  
**Priority:** P3  
**Description:** UX-09 requires notifications to be suppressed during LISTENING, SPEAKING, and LIVE orb states. The suppression layer must monitor global voice state and gate notification delivery.  
**Impact:** Any notification delivered during an active voice interaction can interrupt the user's voice experience.  
**Dependency:** Requires global voice-state listener; cannot be added without knowing the voice-state event contract from the orb.  

---

### GAP-03 — Notification Deduplication Ring Buffer
**UX authority:** UX-09 §4  
**Class:** F (Architectural workstream)  
**Priority:** P3  
**Description:** Repeated event types within a time window should collapse to a single notification. Requires a ring buffer with event fingerprinting.  

---

### GAP-04 — Attention Budget Enforcement
**UX authority:** UX-09 §5  
**Class:** F (Architectural workstream)  
**Priority:** P3  
**Description:** Maximum N notifications per hour per urgency tier. Requires a persistent counter (session-scoped minimum, ideally server-scoped via `/notifications`).  

---

### GAP-05 — Domain Token Application
**UX authority:** UX-10  
**Class:** A (Frontend-only)  
**Priority:** P2  
**Description:** The `--apex-color-*` token namespace was added in UX-19 (UX-05). Domain pages (Finance, Health, Business, University, Communication) do not yet reference these tokens. Their existing styles use the short-name variables (`--bg`, `--primary`, etc.) from the pre-existing `:root` blocks.  
**Files affected:** `public/dashboard.html` — CSS for each domain page section.  
**Pre-condition:** None. All tokens exist. This is a wiring pass only.  

---

### GAP-06 — Knowledge Panel Frontend Surface
**UX authority:** UX-11  
**Class:** C or B (pending route verification — see GAP-32)  
**Priority:** P2  
**Description:** UX-11 specifies a knowledge surface with entity/fact retrieval, search, browse, and correction flows.  
**Backend dependency:** `GET /api/knowledge` route — existence is in conflict between baseline (OBSERVED) and certification (NOT FOUND). Must verify before classifying.  
**If route exists:** Class B — wire frontend to existing route.  
**If route absent:** Class C — create route first, then wire frontend.  

---

### GAP-07 — Intelligence Panel Frontend Surface
**UX authority:** UX-12  
**Class:** C  
**Priority:** P2  
**Description:** UX-12 requires a dedicated intelligence panel showing self-awareness display, model lineage, capability inventory, confidence/uncertainty surfacing.  
**Available APIs:** `GET /api/intelligence/self-check` (used by page-agents for health), `GET /api/intelligence/agent-runs`.  
**Missing:** A dedicated intelligence surface endpoint that returns the full UX-12 model (model lineage, capability inventory, uncertainty).  
**Pre-condition:** Backend must expose a dedicated intelligence surface route beyond health checks.  

---

### GAP-08 — Health Agent Surface
**UX authority:** UX-13  
**Class:** I (Open decision)  
**Priority:** P3  
**Description:** UX-13 implies a health-specific agent surface. `health_agent` is not present in the production domain agent list. Cannot build a surface for an agent that does not exist.  
**Pre-condition:** Decision on whether health_agent will be registered in the production domain agent list.  

---

### GAP-09 — Agent Capability/Authority Matrix Display
**UX authority:** UX-13 §4  
**Class:** B (API consumer wiring)  
**Priority:** P2  
**Description:** UX-13 §4 specifies a display of each agent's capability scope vs. authority boundary. Data available via existing agents route module. Frontend page-agents does not yet render this matrix.  
**Pre-condition:** None beyond reading the agents route response and rendering the authority boundary columns.  

---

### GAP-10 — Task Rejection Route
**UX authority:** UX-14  
**Class:** C (Missing backend route)  
**Priority:** P1  
**Description:** `POST /api/tasks/:id/reject` not confirmed in production route inventory. The approvals page implements a graceful fallback (shows toast error; no crash). Without the route, users cannot reject proposals through the UI.  
**Current state:** Graceful fallback active. Rejection intent is silently dropped.  
**Pre-condition:** Route must be added to `src/routes/tasks.js` (or `routes/agent-tasks.js`).  

---

### GAP-11 — Undo Route
**UX authority:** UX-14  
**Class:** C (Missing backend route)  
**Priority:** P2  
**Description:** `pgMarkAgentActionUndone()` exists in `lib/memory/helpers.js` but no public HTTP endpoint exposes it. UX-14 implies an undo capability for executed actions.  
**Pre-condition:** Route creation, then frontend undo button wiring.  

---

### GAP-12 — pgInsertApproval() Frontend Audit Wiring
**UX authority:** UX-14  
**Class:** B (API consumer wiring / verification)  
**Priority:** P0  
**Description:** When a user approves a task via the two-step modal, `POST /api/tasks/approve` is called. The certification (§15) notes that frontend-side audit recording via `pgInsertApproval()` was not confirmed as wired into the response handler. If missing, the approval audit log has gaps.  
**Action required:** Inspect the approval response handler in the new page-approvals JS block to confirm `pgInsertApproval()` is called (or confirm backend records this autonomously via the approve route).  
**Risk:** If the approve route does not itself call pgInsertApproval(), and the frontend does not either, approved tasks are not recorded in the approval audit table.  

---

### GAP-13 — Standing Approvals Route
**UX authority:** UX-14  
**Class:** C (Missing backend route)  
**Priority:** P1  
**Description:** `GET /api/tasks/standing-approvals` not confirmed in production. page-agents renders "Standing approvals unavailable" when this route returns 404. Users cannot see pre-authorized standing approval rules.  
**Current state:** Graceful fallback active. No standing approvals visible.  

---

### GAP-14 — Memory Inspection Panel Frontend Surface
**UX authority:** UX-15  
**Class:** C (Missing backend route)  
**Priority:** P2  
**Description:** UX-15 requires a panel showing recorded memory facts, entities, and interactions. `GET /api/memory` is confirmed available. However, UX-15 also requires correction and deletion flows, which are fully blocked (GAP-15, GAP-16).  
**Pre-condition:** GAP-15 and GAP-16 routes must exist before a fully compliant UX-15 surface can be built. A read-only panel could be built against `GET /api/memory` without GAP-15/16.  

---

### GAP-15 — Memory Correction Route
**UX authority:** UX-15  
**Class:** C (Missing backend route)  
**Priority:** P2  
**Description:** `pgMarkAgentActionUndone()` and related mutation logic exists in `lib/memory/helpers.js`. No public HTTP route exposes correction. Required: `PATCH /api/memory/:id` or equivalent.  

---

### GAP-16 — Memory Deletion Route
**UX authority:** UX-15  
**Class:** C (Missing backend route)  
**Priority:** P2  
**Description:** No public HTTP route for memory forget/delete. Required: `DELETE /api/memory/:id` or equivalent.  

---

### GAP-17 — Constitutional Dashboard Frontend Surface
**UX authority:** UX-16  
**Class:** D (Constitutional propagation)  
**Priority:** P2  
**Description:** UX-16 specifies a dashboard showing per-request constitutional execution context, principle-by-principle check outcomes, and governance chain trace. `GET /api/governance/dashboard` and `GET /api/governance/readiness` exist and are available.  
**Blocker:** `ExecutionContext.constitution` is populated server-side in `lib/governance.js` and `lib/kernel.js` but is NOT propagated to API response bodies. The frontend receives no constitutional per-request data to display.  
**Note:** The governance gate is fully operative server-side. This gap affects dashboard visibility only, not constitutional enforcement.  

---

### GAP-18 — ExecutionContext.constitution API Propagation
**UX authority:** UX-16  
**Class:** D (Constitutional propagation)  
**Priority:** P2  
**Description:** The root cause of GAP-17. The constitutional execution context must be selectively added to API response bodies (or a dedicated governance response endpoint) before UX-16 can surface any per-request constitutional data.  
**Files to change:** `lib/kernel.js`, `lib/governance.js`, affected route handlers, or a new `GET /api/governance/execution-context` endpoint.  
**Safety constraint:** Constitutional chain-of-thought must NOT be exposed (privacy boundary per UX-16). Only checkpoint outcomes and principle pass/fail states should be surfaced.  

---

### GAP-19 — Constitutional Audit Log Route
**UX authority:** UX-16  
**Class:** C (Missing backend route)  
**Priority:** P2  
**Description:** Historical constitutional decisions are not surfaced through any confirmed route. UX-16 implies a governance history view showing prior constitutional decisions, including the CivilizationalDecision when T3-13 (Wave-3) completes.  

---

### GAP-20 — Viz-Broadcaster Event Type Expansion
**UX authority:** UX-17  
**Class:** E (Event infrastructure)  
**Priority:** P1  
**Description:** `lib/viz-broadcaster.js` currently taps only `AGENT_STARTED` and `AGENT_COMPLETED` from the 200-event ring buffer. UX-17 requires Voice, Tool, System, Error, Constitutional, Memory, and Governance event categories to be broadcast.  
**Files to change:** `lib/viz-broadcaster.js` — add taps for additional event categories from `lib/event-bus.js`.  
**Risk:** High-frequency events (e.g., memory writes) must be rate-limited or sampled before broadcasting to avoid overwhelming `/ws/viz` clients.  

---

### GAP-21 — correlation_id in Event Bus Payloads
**UX authority:** UX-17  
**Class:** E (Event infrastructure)  
**Priority:** P2  
**Description:** Event bus payloads currently do not carry `correlation_id`. Without it, the activity feed cannot display event correlation across agent/voice/tool chains.  
**Files to change:** `lib/event-bus.js` event emission; all event producers.  

---

### GAP-22 — Historical Event Query API
**UX authority:** UX-17  
**Class:** C (Missing backend route)  
**Priority:** P2  
**Description:** Only a 20-task timeline window is available via `GET /api/timeline`. There is no paginated event log, date-range query, or full-text search over past events. UX-17 implies a historical observability surface.  

---

### GAP-23 — Full 17-Category Event Taxonomy Live Data
**UX authority:** UX-17  
**Class:** E (Event infrastructure)  
**Priority:** P1  
**Description:** UX-17 defines 17 event categories. CSS classes for all 12 implemented categories exist. Only AGENT events have a live data source. Voice, Tool, System, Error, Constitutional, Memory, User, Runtime, Decision, Action events have no live broadcast path.  
**Dependency:** GAP-20 (viz-broadcaster expansion) is the prerequisite.  

---

### GAP-24 — Bottom Sheet Component
**UX authority:** UX-08 / UX-18  
**Class:** F (Architectural workstream)  
**Priority:** P3  
**Description:** Slide-up bottom sheet for mobile detail/action surfaces. Required by UX-08 for L2 (detail sheet) and UX-18 §6 for mobile action surfaces.  
**Dependency:** GAP-01 (L0-L4 architecture). Cannot be meaningfully implemented as a standalone component without the L0-L4 disclosure contract.  

---

### GAP-25 — 5-Tab Persistent Bottom Nav Bar
**UX authority:** UX-18 §4  
**Class:** H (Structural replacement)  
**Priority:** P3  
**Description:** UX-18 specifies a persistent 5-tab bottom navigation bar at ≤640px, replacing the current hamburger→3-column-dropdown pattern.  
**Current state:** Hamburger dropdown is functional. Users can navigate all pages.  
**Risk:** Structural replacement of the mobile nav touches existing styles (`.nav-btn` with 5-layer `!important` cascade), existing JS (dropdown toggle), and existing HTML. High regression risk without browser regression suite.  

---

### GAP-26 — Safe-Area FAB
**UX authority:** UX-18 §5.3  
**Class:** H (Structural replacement)  
**Priority:** P3  
**Description:** Fixed floating action button respecting device safe-area insets. Not required for current surfaces (activity, agents, approvals are all page-based). Lower priority than GAP-25.  

---

### GAP-27 — Style Block Consolidation
**UX authority:** UX-05 / INV-VS-02  
**Class:** G (Design system cleanup)  
**Priority:** P3  
**Description:** 8 `<style>` blocks remain un-consolidated. INV-VS-02 requires a single canonical style block. Consolidation requires a browser-based regression test suite because any reordering of cascade layers risks silent visual breakage across 21,585 lines.  
**Pre-condition:** Automated visual regression tests (screenshot diff or similar) before this is safe to perform.  

---

### GAP-28 — Retired Font Removal
**UX authority:** UX-05 §3  
**Class:** G (Design system cleanup)  
**Priority:** P2  
**Description:** IBM Plex Sans and Space Grotesk are loaded via Google Fonts CDN but were retired by UX-05. They represent an unnecessary CDN dependency and a minor performance cost on each page load.  
**Files to change:** `public/dashboard.html` `<head>` — remove 2 `<link>` tags.  
**Risk:** Low. Fonts are loaded but not applied (retired by UX-05). Visual impact should be zero if retirement is complete. Smoke test before commit.  

---

### GAP-29 — SVG Icon System
**UX authority:** UX-05 §8  
**Class:** G (Design system cleanup)  
**Priority:** P3  
**Description:** Navigation buttons use emoji characters (⬡, ◈, ⊞, etc.). UX-05 §8 specifies inline SVG or an SVG sprite for all nav and UI chrome icons.  
**Pre-condition:** Icon assets must be delivered (SVG paths for each icon). This is a design asset dependency, not just a code change.  

---

### GAP-30 — Domain Page Quality Standardization
**UX authority:** UX-10  
**Class:** H (Structural replacement)  
**Priority:** P3  
**Description:** Finance, Health, Business, University, Communication, and domain pages have inconsistent visual quality. No canonical quality standard has been applied uniformly. Requires a domain-by-domain audit and update pass.  
**Pre-condition:** Domain quality standard must be defined (likely requires UX-10 detailed specification review per domain).  

---

### GAP-31 — Agent Grid Architecture Decision (OPEN-001)
**UX authority:** UX-13  
**Class:** I (Open decision)  
**Priority:** P2  
**Description:** The domain agent grid currently lives on page-system. page-agents was added in UX-19 with a different scope (runs, self-check, standing approvals). The architecture question: should page-system retain the agent grid, or should it delegate to page-agents?  
**Options recorded:**  
- (a) Move grid to page-agents; system page shows summary only  
- (b) Duplicate the grid in both pages (data divergence risk)  
- (c) Keep system page as-is; page-agents has complementary (not overlapping) scope  
**Decision owner:** Product / UX authority.  
**Impact:** Option (a) or (b) requires HTML/JS changes. Option (c) requires no code change.  

---

### GAP-32 — /api/knowledge Route Existence Verification
**UX authority:** UX-11  
**Class:** I (Open decision requiring verification)  
**Priority:** P0  
**Description:** The UX-19 baseline (F-070) lists `GET /api/knowledge` as OBSERVED in production. The UX-19 certification (§12) states "No `GET /api/knowledge` endpoint was found." This is a direct factual conflict between two authoritative UX-19 documents.  
**Resolution required:** Run `node -e "require('./routes/knowledge')"` or `grep -r 'knowledge' routes/ src/routes/` to determine whether the route exists and at what path.  
**Impact on GAP-06:** If route exists → Class B. If absent → Class C.  

---

## SECTION 5 — GAP COUNTS BY CLASSIFICATION

| Class | Name | Count | Gaps |
|-------|------|-------|------|
| A | Frontend-only | 1 | GAP-05 |
| B | API consumer wiring | 2 | GAP-09, GAP-12 |
| C | Missing backend route | 10 | GAP-10, GAP-11, GAP-13, GAP-14, GAP-15, GAP-16, GAP-19, GAP-22, GAP-06* |
| D | Constitutional propagation | 2 | GAP-17, GAP-18 |
| E | Event infrastructure | 3 | GAP-20, GAP-21, GAP-23 |
| F | Architectural workstream | 5 | GAP-01, GAP-02, GAP-03, GAP-04, GAP-24 |
| G | Design system cleanup | 3 | GAP-27, GAP-28, GAP-29 |
| H | Structural replacement | 4 | GAP-25, GAP-26, GAP-30, GAP-07† |
| I | Open decision | 3 | GAP-08, GAP-31, GAP-32 |
| **Total** | | **33** | |

*GAP-06 classified C pending GAP-32 verification; may become B.  
†GAP-07 listed under C in the register (requires new backend route) but shares H characteristics for the frontend surface.

---

## SECTION 6 — GAP COUNTS BY PRIORITY

| Priority | Label | Count | Gaps |
|----------|-------|-------|------|
| P0 | Beta-correctness | 2 | GAP-12, GAP-32 |
| P1 | Beta-quality | 4 | GAP-10, GAP-13, GAP-20, GAP-23 |
| P2 | Roadmap | 16 | GAP-05, GAP-06, GAP-07, GAP-09, GAP-11, GAP-14, GAP-15, GAP-16, GAP-17, GAP-18, GAP-19, GAP-21, GAP-22, GAP-28, GAP-31, GAP-19 |
| P3 | Long-term | 11 | GAP-01, GAP-02, GAP-03, GAP-04, GAP-08, GAP-24, GAP-25, GAP-26, GAP-27, GAP-29, GAP-30 |

---

## SECTION 7 — OWNER TRACE

Each gap is traced to its canonical owner (the system layer responsible for blocking or resolving it).

| Gap ID | Owner Layer | Specific File / Route |
|--------|------------|----------------------|
| GAP-01 | Frontend architecture | `public/dashboard.html` — new design system |
| GAP-02 | Frontend architecture | `public/dashboard.html` — voice-state listener |
| GAP-03 | Frontend architecture | `public/dashboard.html` — ring buffer |
| GAP-04 | Frontend + backend | `public/dashboard.html` + `/notifications` rate logic |
| GAP-05 | Frontend CSS | `public/dashboard.html` — domain page sections |
| GAP-06 | Backend route (pending verification) | `routes/knowledge.js` or absent |
| GAP-07 | Backend route + frontend | `src/routes/` — new intelligence endpoint |
| GAP-08 | Production agent registry | Domain agent list in backend config |
| GAP-09 | Frontend JS | `public/dashboard.html` — page-agents section |
| GAP-10 | Backend route | `src/routes/tasks.js` — add reject handler |
| GAP-11 | Backend route | `src/routes/tasks.js` or new route — expose undo |
| GAP-12 | Frontend JS | `public/dashboard.html` — approvals response handler |
| GAP-13 | Backend route | `src/routes/tasks.js` or new route |
| GAP-14 | Backend route + frontend | `src/routes/memory.js` or new; then HTML |
| GAP-15 | Backend route | `lib/memory/helpers.js` + public route |
| GAP-16 | Backend route | `lib/memory/helpers.js` + public route |
| GAP-17 | Frontend + propagation | `public/dashboard.html` — new governance page |
| GAP-18 | Backend kernel | `lib/kernel.js`, `lib/governance.js` |
| GAP-19 | Backend route | New governance history route |
| GAP-20 | Backend event | `lib/viz-broadcaster.js` |
| GAP-21 | Backend event | `lib/event-bus.js` + all emitters |
| GAP-22 | Backend route | New events/log route |
| GAP-23 | Backend event | `lib/viz-broadcaster.js` (depends on GAP-20) |
| GAP-24 | Frontend architecture | `public/dashboard.html` — new component |
| GAP-25 | Frontend HTML/CSS/JS | `public/dashboard.html` — nav replacement |
| GAP-26 | Frontend HTML/CSS | `public/dashboard.html` — new FAB element |
| GAP-27 | Frontend CSS | `public/dashboard.html` — 8 style block merge |
| GAP-28 | Frontend HTML | `public/dashboard.html` — `<head>` link removal |
| GAP-29 | Frontend + assets | `public/dashboard.html` + SVG asset files |
| GAP-30 | Frontend HTML/CSS | `public/dashboard.html` — domain page sections |
| GAP-31 | Architecture decision | — |
| GAP-32 | Verification action | `routes/knowledge.js` grep |

---

## SECTION 8 — BETA SURFACE COMPLETENESS SUMMARY

| Surface | UX Authority | Status | P0/P1 Gaps Remaining |
|---------|-------------|--------|----------------------|
| Chat / Command Centre | UX-06 | COMPLETE | None |
| Voice (11-state) | UX-07 | COMPLETE | None |
| Activity / Observability | UX-17 | PARTIAL | GAP-20, GAP-23 |
| Agents | UX-13 | PARTIAL | GAP-12 (cross-cutting) |
| Approvals | UX-14 | PARTIAL | GAP-10, GAP-12, GAP-13 |
| Mobile layout (six-tier) | UX-18 | PARTIAL | None (P3 only) |
| Knowledge panel | UX-11 | ABSENT | GAP-32 (P0 verify), GAP-06 |
| Intelligence panel | UX-12 | ABSENT | GAP-07 (P2) |
| Memory inspection | UX-15 | ABSENT | GAP-14, GAP-15, GAP-16 (P2) |
| Constitutional dashboard | UX-16 | ABSENT | GAP-17, GAP-18 (P2 + D-class) |
| Progressive disclosure | UX-08 | ABSENT | GAP-01 (P3 architectural) |
| Proactive suppression | UX-09 | ABSENT | GAP-02, GAP-03, GAP-04 (P3 architectural) |

---

*POST-UX-19-PRODUCTION-GAP-INVENTORY v1.0 — 2026-08-28*  
*Evidence basis: UX-19-INTEGRATION-BASELINE.md (86 findings), UX-19-INTEGRATION-E2E-CERTIFICATION.md (31 sections).*  
*No production implementation performed in this document. Audit only.*
