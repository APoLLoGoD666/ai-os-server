# UX-18 — MOBILE / RESPONSIVE

**Status:** COMPLETE  
**Date:** 2026-08-28  
**Version:** 1.0  
**Preceded by:** UX-17 ACTIVITY / OBSERVABILITY  
**Succeeded by:** UX-18 MOBILE / RESPONSIVE (this document); next: UX-19 INTEGRATION / E2E CERTIFICATION (requires explicit authorisation)

---

## 1. Status

This document is COMPLETE. UX-18 defines the canonical mobile and responsive user experience for APEX.

UX-05 through UX-17 are authoritative and COMPLETE. This document builds on all of them. None of them are reopened here.

UX-19 is NOT YET AUTHORISED. This document ends with a hard stop preventing UX-19 from beginning without explicit authorisation.

ONE PLATFORM. ONE SYSTEM. ONE APEX. ONE RUNTIME. ONE GOVERNANCE MODEL. ONE EVENT BUS. ONE MEMORY SYSTEM. ONE PRESENTATION PIPELINE.

Responsive transformation changes how APEX is presented. It does not change what APEX is.

---

## 2. Authority

This document is authorised by the UX-18 MOBILE / RESPONSIVE prompt.

The completed UX-05 through UX-17 work is authoritative and must not be reopened.

The completed Knowledge-Gap programme is authoritative and must not be reopened.

UX-18 is the canonical mobile/responsive phase. No prior responsive specification exists with canonical authority. Where `apex-v2.css` and `dashboard.html` implement responsive behaviour, those implementations are documented as OBSERVED production facts. Where gaps exist, they are documented as MISSING. Where this document proposes behaviour not yet implemented, it is marked PROPOSED.

Mobile does not create a second APEX. Mobile does not create a second governance system. Mobile does not create a second approval flow. Mobile does not create a second event bus. Mobile does not create a second memory system.

---

## 3. Evidence Classification

Throughout this document, four evidence classifications are used:

| Classification | Meaning |
|---|---|
| **OBSERVED** | Present and verified in production files (`apex-v2.css`, `dashboard.html`, source code) |
| **INHERITED** | Defined in a prior authoritative UX document (UX-05 through UX-17); applies here without modification |
| **PROPOSED** | Specified in this document; not yet implemented in production |
| **OPEN** | Unresolved; see Section 31 (Open Questions) |

Evidence classifications appear inline throughout sections where specific claims are made.

---

## 4. Existing Responsive Audit

### 4.1 What Is Present in Production — OBSERVED

The following responsive behaviour is confirmed present in production files as of 2026-08-28.

**`apex-v2.css` line 176:**
```css
@media (min-width: 900px) { /* two-column grid: sidebar + body */ }
```
OBSERVED. A single min-width breakpoint at 900px activates the two-column grid layout comprising a left sidebar and a main content body. Below 900px the layout collapses to a single column.

**`apex-v2.css` line 1422:**
```css
@media (max-width: 899px) {
  /* bottom-nav visible */
  /* grid adjustments */
  /* .nav-btn height: 48px */
}
```
OBSERVED. Below 899px, a bottom navigation bar becomes visible and the grid collapses. Navigation button height is set to 48px, meeting the minimum 44px touch target requirement for that element.

**`apex-v2.css` line 1441:**
```css
@media (prefers-reduced-motion: reduce) { /* animations disabled */ }
```
OBSERVED. Reduced-motion preference is respected. All animations and transitions are disabled when the user has set `prefers-reduced-motion: reduce`.

**`dashboard.html` line 234:**
```html
env(safe-area-inset-bottom, 0px)
```
OBSERVED. Safe area inset handling is present for the bottom of the screen. This accommodates notched and rounded-corner devices (iPhone X and later, some Android).

**`dashboard.html` lines 6164, 6206–6207:**
Safe area applied to the voice FAB (floating action button) and content padding area.
OBSERVED.

**`dashboard.html` line 6170:**
```css
-webkit-overflow-scrolling: touch;
```
OBSERVED. Momentum scrolling is enabled for touch devices on relevant scroll containers.

**`dashboard.html` line 6315:**
```css
touch-action: none;
```
OBSERVED. Touch action is disabled on the canvas/visualisation element. This prevents default touch behaviours (scroll, zoom) from interfering with canvas interaction.

### 4.2 What Is Not Present — 12 Production Gaps

The following responsive behaviours are absent from production as of 2026-08-28.

| # | Gap | Classification |
|---|---|---|
| 1 | No mobile portrait (<640px) specific treatment | MISSING |
| 2 | No tablet-specific treatment (640–1024px) | MISSING |
| 3 | No landscape orientation handling | MISSING |
| 4 | No hamburger/drawer navigation for mobile | MISSING |
| 5 | No touch gesture model (swipe, long-press) | MISSING |
| 6 | No bottom sheet for detail views | MISSING |
| 7 | No voice overlay adapted for mobile viewports | MISSING |
| 8 | No progressive disclosure adaptation for constrained viewports | MISSING |
| 9 | No connection state banners adapted for mobile | MISSING |
| 10 | No mobile-specific approval interaction safeguards | MISSING |
| 11 | No touch target minimum enforcement beyond the one nav-btn rule | MISSING |
| 12 | No `viewport` meta tag with `viewport-fit=cover` | MISSING |

These gaps are documented here as the production baseline. Section 29 expands on each gap and its remediation path.

### 4.3 Inherited Responsive Foundations

The following are inherited from UX-05 through UX-17 and apply to mobile without modification:

- **UX-05 INHERITED:** Design tokens (colour, spacing, type scale, elevation) — all token values apply at all viewports
- **UX-06 INHERITED:** Command Centre layout model — adapted for mobile in this document
- **UX-07 INHERITED:** Voice states (11 canonical states) — all 11 states apply on mobile
- **UX-08 INHERITED:** Progressive disclosure L0–L4 — all four levels remain accessible on mobile
- **UX-09 INHERITED:** Proactive communication lifecycle — same pipeline, mobile-adapted presentation
- **UX-10 INHERITED:** Domain experiences — all domain lenses apply on mobile
- **UX-11 INHERITED:** Knowledge, evidence, provenance model — no mobile-specific shortcut
- **UX-12 INHERITED:** Decision chain / intelligence model — no mobile-specific shortcut
- **UX-13 INHERITED:** Agent model — no mobile-specific shortcut
- **UX-14 INHERITED:** Execution states, approval flow — two-step approval required on mobile
- **UX-15 INHERITED:** Memory model — no mobile-specific shortcut
- **UX-16 INHERITED:** Constitutional gate / governance — no mobile-specific shortcut
- **UX-17 INHERITED:** Activity, observability, connection states — all apply on mobile

---

## 5. Canonical Responsive Principles

The following principles govern all responsive and mobile design decisions in APEX.

**P1. One APEX.**  
Mobile is not a separate application. It is the same APEX rendered in a constrained viewport. The runtime, governance model, event bus, memory system, and approval flow are identical.

**P2. Presentation adapts; semantics do not.**  
Responsive transformation may collapse, reorder, or reformat UI components. It must not change what a component means, what authority it implies, or what governance applies to it.

**P3. Disclosure is never removed.**  
All four progressive disclosure levels (L0–L4) remain accessible on every viewport. Mobile may adapt how they are reached (bottom sheet instead of side panel) but must not eliminate any level.

**P4. Touch cannot cause unintended execution.**  
Every destructive or governance-significant action requires explicit two-step confirmation on mobile. A single tap never triggers execution.

**P5. Constraints are visible.**  
Viewport constraints never silently suppress information. If space is insufficient to render a piece of state, that state is deferred (to a bottom sheet, drawer, or next scroll position), not discarded.

**P6. Unknown stays unknown.**  
A viewport constraint never converts unknown state to a known state. If the system does not know something, mobile presents "Unknown" — it does not fabricate a value to fill space.

**P7. Connection state is always visible.**  
On every viewport and orientation, the connection state indicator is visible. A disconnected APEX never presents as connected.

**P8. Reduced motion is respected.**  
OBSERVED in production. All animations respect `prefers-reduced-motion`. This is not optional.

**P9. Touch targets are at minimum 44×44px.**  
All interactive elements meet the minimum 44×44px touch target size. Spacing between adjacent targets is at minimum 8px.

**P10. Safe area insets are respected.**  
OBSERVED in production for bottom insets. All fixed UI chrome (bottom nav, FAB, header) respects `env(safe-area-inset-*)` on all edges.

---

## 6. Breakpoint Model

APEX uses a behavioural breakpoint model. Breakpoints are not purely cosmetic; each represents a distinct navigation and layout behaviour.

### 6.1 Breakpoint Definitions — PROPOSED

| Viewport Class | Width Condition | Height Condition |
|---|---|---|
| Mobile portrait | width < 640px | any |
| Mobile landscape | width < 1024px | height < 500px |
| Tablet portrait | 640px ≤ width < 1024px | height ≥ 500px |
| Tablet landscape | 1024px ≤ width < 1280px | any |
| Desktop | 1280px ≤ width < 1440px | any |
| Wide desktop | width ≥ 1440px | any |

**Note on current production state:**  
Production uses a single breakpoint at 899/900px — OBSERVED. The multi-tier model above is PROPOSED. Implementation of the full model requires extending `apex-v2.css`.

### 6.2 CSS Implementation Pattern — PROPOSED

```css
/* Mobile portrait: default (no query) */

/* Mobile landscape */
@media (max-width: 1023px) and (max-height: 499px) { }

/* Tablet portrait */
@media (min-width: 640px) and (max-width: 1023px) { }

/* Tablet landscape */
@media (min-width: 1024px) and (max-width: 1279px) { }

/* Desktop */
@media (min-width: 1280px) and (max-width: 1439px) { }

/* Wide desktop */
@media (min-width: 1440px) { }
```

### 6.3 Viewport Meta Tag — PROPOSED

The following `<meta>` tag must be present in `dashboard.html` (currently MISSING — Gap 12):

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

`viewport-fit=cover` is required for safe area inset handling to function correctly on notched devices. Without it, `env(safe-area-inset-*)` values resolve to zero on some devices.

---

## 7. Layout Transformation

### 7.1 Layout Per Viewport — PROPOSED

| Viewport | Navigation | Left Panel | Right Panel | Header height |
|---|---|---|---|---|
| Mobile portrait | Bottom tab bar (5 tabs) + hamburger drawer | Slide-in drawer | Bottom sheet | 48px |
| Mobile landscape | Compact bottom bar | Slide-in drawer | Collapsed | 40px |
| Tablet portrait | Persistent side nav (240px) | Always visible | Overlay sheet | 52px |
| Tablet landscape | Persistent side nav (240px) | Always visible | Right panel (280px) | 52px |
| Desktop | Persistent side nav (260px) | Always visible | Right panel (320px) | 52px |
| Wide desktop | Persistent side nav (280px) | Always visible | Right panel (360px) | 52px |

### 7.2 Grid Model — PROPOSED

**Mobile portrait (< 640px):**
- Single-column layout
- Full-width content area
- Header: 48px fixed top
- Bottom tab bar: 49px fixed bottom + safe-area-inset-bottom
- No persistent side panels

**Mobile landscape (height < 500px, width < 1024px):**
- Single-column layout
- Header: 40px fixed top (compact)
- Compact bottom bar: 40px fixed bottom
- Drawers replace all panels to maximise vertical space

**Tablet portrait (640–1023px):**
- Two-column: 240px left nav + fluid main content
- No right panel by default; detail opens as overlay sheet
- Header: 52px

**Tablet landscape (1024–1279px):**
- Three-column: 240px left + fluid main + 280px right panel
- Header: 52px

**Desktop (1280–1439px):**
- Three-column: 260px left + fluid main + 320px right panel
- Header: 52px

**Wide desktop (≥ 1440px):**
- Three-column: 280px left + fluid main + 360px right panel
- Header: 52px

### 7.3 Production Baseline

The current production layout (OBSERVED) uses a single column below 900px with a bottom nav bar visible. This is the baseline. The PROPOSED model extends it with additional breakpoints and richer layout behaviour without removing the baseline behaviour.

---

## 8. Navigation Model

### 8.1 Mobile Portrait Navigation — PROPOSED

**Bottom Tab Bar (primary navigation):**
- 5 tabs maximum
- Each tab: icon + label (collapsed to icon-only in landscape)
- Minimum tab touch target: 44×44px
- Active tab: highlighted with accent colour (UX-05 token)
- Badge on tab: unread count for notifications/approvals
- Tab bar is fixed at bottom, above safe area inset

**Recommended tabs (PROPOSED):**
1. Home / Command Centre
2. Activity / Feed
3. Voice (centre tab, elevated FAB style)
4. Agents
5. More (opens hamburger drawer)

**Hamburger Drawer (secondary navigation):**
- Opens from "More" tab or left-edge swipe
- Full-height overlay drawer, 280px width
- Slide-in from left on swipe right / hamburger tap
- Contains: domain sections, settings, profile, system status
- Dismisses on: tap outside drawer, swipe left, back gesture
- Backdrop: semi-transparent overlay (rgba, UX-05 token)
- Drawer does not require a back button — swipe left is sufficient

### 8.2 Mobile Landscape Navigation — PROPOSED

- Compact bottom bar visible (40px height)
- Icons only, no labels
- Hamburger icon on left of compact bar to open drawer
- Voice FAB reduced in size (40×40px minimum) or folded into bar

### 8.3 Tablet Navigation — PROPOSED

**Tablet portrait:**
- Persistent left side nav, 240px wide
- No bottom tab bar
- Side nav contains full section hierarchy
- Collapsed/expanded state per section persists in session

**Tablet landscape:**
- Same as tablet portrait
- Right panel (280px) visible alongside main content

### 8.4 Desktop Navigation — INHERITED

- Persistent side nav (260–280px)
- Full section labels visible
- Right panel always visible
- No bottom bar

### 8.5 Back Navigation

- Mobile: system back gesture (Android) or swipe-right from left edge
- Swipe right when drawer is closed: opens drawer
- Swipe right when inside a drill-down view: navigates back
- Bottom sheet dismiss: swipe down
- Drawer dismiss: swipe left or tap backdrop

### 8.6 Navigation Does Not Affect Authority

Navigation model is presentation only. Navigating to a section does not grant authority to act within it. All governance and constitutional constraints (UX-16 INHERITED) apply regardless of navigation path.

---

## 9. Touch Model

### 9.1 Touch Target Requirements — PROPOSED (Gap 11 remediation)

| Requirement | Value |
|---|---|
| Minimum touch target size | 44×44px |
| Minimum spacing between adjacent targets | 8px |
| FAB minimum size | 56×56px (mobile portrait), 48×48px (landscape) |
| Bottom nav tab minimum height | 49px |
| Bottom sheet drag handle minimum hit area | 44px height |
| List item minimum height | 48px |
| Drawer menu item minimum height | 48px |

Touch targets that are visually smaller than 44px must have an expanded hit area via `padding` or CSS `::before` pseudo-element. The visual appearance need not change; the tappable area must be expanded.

### 9.2 Gesture Model — PROPOSED (Gap 5 remediation)

| Gesture | Action |
|---|---|
| Swipe right (from left edge, < 40px threshold) | Open drawer / back |
| Swipe left on open drawer | Close drawer |
| Swipe down on bottom sheet | Dismiss bottom sheet |
| Swipe up on bottom sheet | Expand to full-height |
| Long-press on card or list item | Open contextual action menu |
| Tap card | Expand (L1 disclosure) |
| Double-tap | No defined default action — reserved |
| Pinch/zoom | Reserved for map and image content only |

**Long-press rules:**
- Long-press reveals contextual actions for the tapped element
- No destructive action is the default on long-press (no auto-delete, no auto-execute)
- Destructive or governance-significant actions in the long-press menu require confirmation before executing
- Long-press on a voice FAB: does not activate voice — opens accessibility options only

### 9.3 Approval Touch Flow — PROPOSED (Gap 10 remediation)

Approval is a governance-significant action. Touch CANNOT bypass the two-step confirmation.

**Step 1:** User taps the approval card. Card expands to show full detail (L1/L2 disclosure). A prominent "Approve" and "Reject" button are visible.

**Step 2:** Tapping "Approve" opens a modal confirmation dialog (not a bottom sheet — a blocking modal to prevent accidental dismissal). Dialog reads: "Confirm approval for [action name]." Two buttons: "Confirm" and "Cancel." Tapping "Confirm" submits the approval.

**State preservation:** If the app is backgrounded between Step 1 and Step 2, the approval card remains in its expanded state. The approval is not auto-submitted. The user must return and tap "Confirm."

**One-tap execution is never permitted for approval actions.**

### 9.4 Touch and Governance

Touch is a presentation input method. It operates under the same constitutional model (UX-16 INHERITED) as keyboard and voice input. A touch gesture cannot:
- Bypass the constitutional gate
- Bypass the approval requirement
- Grant authority not otherwise held by the authenticated user
- Fabricate evidence or provenance
- Conceal L3/L4 disclosure

---

## 10. Mobile Command Centre

### 10.1 Mobile Command Centre Layout — PROPOSED

The Command Centre (UX-06 INHERITED) is adapted for mobile as follows.

**Mobile portrait:**
- Primary action area fills full width
- Voice FAB centred or bottom-right, 56×56px
- Quick action cards in a vertical list (not horizontal grid)
- Domain switcher: horizontal scroll strip above card list
- Recent activity: compact card list below quick actions

**Mobile landscape:**
- Two-column card grid within the main content area
- Voice FAB remains bottom-right, 48×48px
- Domain switcher: horizontal scroll strip

**Tablet portrait:**
- Same layout as desktop Command Centre in single main panel
- Voice FAB bottom-right of main panel

**Tablet landscape and above:**
- Full desktop Command Centre layout (UX-06)

### 10.2 Quick Actions on Mobile

Quick action cards preserve all UX-06 behaviour. On mobile:
- Cards are full-width (portrait) or half-width (landscape grid)
- Minimum card height: 80px
- Card tap triggers L0→L1 expansion, not immediate execution
- Action buttons within the expanded card require the two-step confirmation for governance-significant actions

### 10.3 Domain Switcher on Mobile

The domain switcher (UX-10 INHERITED) is presented as a horizontally scrollable chip strip on mobile. Each chip: minimum 44px height, label truncated if necessary with full label in tooltip on long-press.

---

## 11. Voice Integration — All 11 States

### 11.1 Voice on Mobile — PROPOSED (Gap 7 remediation)

Voice (UX-07 INHERITED) is adapted for mobile. All 11 canonical voice states apply. No state is removed or combined on mobile.

### 11.2 Voice FAB — Mobile

The voice entry point on mobile is the voice FAB (floating action button).

| Viewport | FAB size | Position |
|---|---|---|
| Mobile portrait | 56×56px | Bottom-right, above bottom nav + safe area inset |
| Mobile landscape | 48×48px | Bottom-right, above compact bar |
| Tablet | 56×56px | Bottom-right of main content area |

FAB tap triggers voice activation (IDLE → ACTIVATING).

### 11.3 The 11 Voice States on Mobile

**State 1 — IDLE:**  
FAB is in idle state. No overlay. FAB shows microphone icon in default colour (UX-05 token). Tap to activate.

**State 2 — ACTIVATING:**  
FAB pulses (animation, respects `prefers-reduced-motion`). System is requesting microphone permission and initialising voice session. No overlay yet.

**State 3 — LISTENING:**  
Full-screen overlay appears. The voice orb is centred, pulsing rhythmically. Live audio waveform visible below orb. Transcript area appears at bottom of overlay (empty, populating). User is speaking. "Tap to cancel" affordance visible.

**State 4 — UNDERSTANDING:**  
Orb becomes steady (no pulse). Transcript is visible and complete. System is processing intent. "Processing..." label visible.

**State 5 — THINKING:**  
Orb enters slow spin animation. State label: "Thinking." Internal reasoning is NOT exposed on mobile. The THINKING state is observable (user sees the orb spinning and the label); the internal chain-of-thought is PROTECTED and never presented on any viewport.

**State 6 — SPEAKING:**  
Orb turns green (UX-05 accent token). Audio waveform visible. APEX is speaking its response aloud. Interrupt affordance visible (tap orb to interrupt).

**State 7 — INTERRUPTED:**  
User taps orb or interrupts during SPEAKING. Overlay closes. Returns to IDLE or re-enters LISTENING if a new utterance begins.

**State 8 — PAUSED:**  
Overlay persists. Orb is steady amber. "Paused" label visible. Occurs when voice session is paused (e.g., phone call interruption). Tap to resume.

**State 9 — FAILED:**  
Orb turns red (UX-05 error token). Error message visible. Recovery options visible:
- "Try again" — re-initiates voice
- "Use text instead" — dismisses overlay, focuses text input

**State 10 — CANCELLED:**  
User explicitly cancelled. Overlay closes. Returns to IDLE. No error message — this is an intentional user action.

**State 11 — LIVE:**  
Reserved for live streaming/real-time session contexts. FAB and overlay adapt to indicate live session. Waveform visible continuously.

### 11.4 Microphone Permission Failure

If the browser denies microphone permission (PROPOSED):
- Voice overlay does not open
- FAB shows a blocked indicator (lock icon or similar)
- System presents: "Microphone access is required for voice. Use text input instead."
- Text input fallback is offered
- User can re-attempt permission via browser settings

### 11.5 Voice Constraints on Mobile

Voice on mobile operates under the same constitutional model (UX-16 INHERITED) as voice on desktop. A voice command cannot:
- Bypass the constitutional gate
- Bypass the approval requirement
- Expose internal chain-of-thought
- Grant authority not otherwise held by the authenticated user

---

## 12. Contextual Presentation / Progressive Disclosure Mobile

### 12.1 Adaptation Principles — PROPOSED (Gap 8 remediation)

Progressive disclosure (UX-08 INHERITED) is adapted for mobile as follows. All four levels remain accessible. The access method changes for constrained viewports; the levels themselves do not change.

### 12.2 L0 — Card Summary — Mobile

L0 is a compact summary fitting any viewport. On mobile portrait, L0 cards are full-width, minimum 80px height. The L0 surface never scrolls horizontally. L0 content is never truncated silently — if content overflows it is indicated with a "...more" affordance.

### 12.3 L1 — Expandable Section — Mobile

L1 is expanded by tapping the card. On mobile, L1 content appears within the card (accordion expansion). Card height expands inline. No navigation away from the current view. The expanded state is indicated by a chevron or similar affordance.

### 12.4 L2 — Scrollable Metadata — Mobile

L2 content is within the expanded card, scrollable vertically within the card. On mobile, L2 may be reached by tapping a "More detail" affordance within the L1-expanded card. L2 does not open a new screen — it scrolls within the card container.

### 12.5 L3 — Bottom Sheet — Evidence and Provenance — PROPOSED (Gap 6 remediation)

On mobile, L3 (evidence, provenance, related records) opens as a bottom sheet. The bottom sheet slides up from the bottom of the screen, covering approximately 60% of the viewport. It is scrollable vertically within the sheet. Dismissed by swipe-down or a close affordance.

L3 is NEVER removed on mobile due to viewport constraints. If the bottom sheet cannot fit all content, it is scrollable — content is not discarded.

L3 on mobile replaces the right-panel or side-panel presentation used on desktop. The information is identical; the delivery mechanism differs.

### 12.6 L4 — Bottom Sheet Full-Height — Constitutional and Governance — PROPOSED

On mobile, L4 (constitutional boundaries, governance audit, privacy classification) opens as a full-height bottom sheet (95% viewport height). It is scrollable vertically within the sheet. Dismissed by a close button at the top of the sheet (swipe-down is permitted but not the only affordance, as accidental dismissal of L4 governance data is undesirable).

L4 is NEVER removed on mobile due to viewport constraints.

### 12.7 Disclosure Level Mapping — Mobile

| Level | Desktop access | Mobile access |
|---|---|---|
| L0 | Card in feed | Full-width card in feed |
| L1 | Expand card section | Tap card → inline accordion |
| L2 | Scroll metadata in card | Tap "More detail" → scroll within card |
| L3 | Right panel or side panel | Bottom sheet (60% height, scrollable) |
| L4 | Right panel full or modal | Bottom sheet full-height (95%, close button) |

---

## 13. Proactive Communication Mobile

### 13.1 Same Pipeline — Mobile-Adapted Presentation

Proactive communication (UX-09 INHERITED) uses the same pipeline on mobile. There is no second proactive communication system. The pipeline is: generate → classify → route → present → dismiss/act.

### 13.2 Mobile Presentation Adaptations — PROPOSED (Gap 9 partial)

**Push notifications (from server):**
- Presented as a top banner below the header (not a system OS notification unless explicitly opted in)
- Banner height: 44px minimum
- Swipe up to dismiss
- Tap to navigate to the relevant section

**Present (overlay or inline card):**
- On mobile portrait: full-width inline card below the header, or modal overlay (for high-priority items)
- On mobile landscape: inline card only (overlay avoided due to viewport height constraint)

**Notify (badge):**
- Badge on the relevant bottom nav tab (count of unread items)
- Badge on the "More" drawer icon if the relevant section is not a primary tab

**Dismiss:**
- Swipe card left or right to dismiss (consistent with mobile conventions)

**Group:**
- By domain — same as desktop
- Grouping is presented as a section header within the feed; each group is collapsible on mobile

### 13.3 Connection State Banners — PROPOSED (Gap 9 remediation)

Connection state (UX-17 INHERITED) is surfaced on mobile as a persistent banner below the header.

| State | Banner |
|---|---|
| LIVE | Green dot in header status area — no banner (does not occupy vertical space) |
| DEGRADED | Amber banner below header: "Connection degraded. Some data may be delayed." |
| DISCONNECTED | Red banner below header: "Disconnected. Reconnecting…" + Retry button |
| RECONNECTING | Amber pulsing banner below header: "Reconnecting… (attempt N)" |
| STALE | No banner; ⚠ STALE tag appears on individual events older than 30 seconds |

Banners respect safe-area-inset-top. They are below the header but above all content. They are not dismissible while the state persists — they close automatically when the state resolves.

---

## 14. Domain Experiences Mobile

### 14.1 Domain Lenses on Mobile — PROPOSED

All domain experiences (UX-10 INHERITED) apply on mobile. Domain switching uses the horizontal chip strip described in Section 10.3. Each domain lens adapts its layout to the current viewport but does not lose capability.

**Finance domain on mobile:**
- Figures are full-width cards
- Charts are full-width, touch-scrollable
- Transaction list is a vertical scrollable list
- Drill-down to transaction detail opens as a bottom sheet (L3)

**Communication domain on mobile:**
- Email/message list is full-width
- Thread detail opens as a new view (navigated via back)
- Compose is a bottom sheet with full keyboard affordance

**Calendar domain on mobile:**
- Week view by default on portrait
- Day view on landscape
- Event detail: bottom sheet (L3)

**Tasks domain on mobile:**
- Task list: full-width vertical list
- Task detail: bottom sheet or new view
- Approval tasks: two-step confirmation enforced (Section 9.3)

### 14.2 Domain Constraints on Mobile

Domain change is presentation only. Switching domain does not change what governance applies, what authority the user holds, or what provenance rules apply. Domain on mobile operates under the same constitutional constraints as domain on desktop.

---

## 15. Knowledge Mobile

### 15.1 Knowledge on Mobile — PROPOSED

Knowledge (UX-11 INHERITED) is presented on mobile with the same semantic model. Evidence classifications (CONFIRMED, INFERRED, ASSUMED, UNKNOWN) are preserved. No classification is silently dropped due to viewport size.

**Knowledge card on mobile:**
- L0: record title, classification badge, confidence indicator
- L1 (expanded): summary, source count, last updated
- L2 (scroll): metadata fields
- L3 (bottom sheet): evidence list, provenance chain
- L4 (full-height sheet): constitutional classification, privacy boundary, governance record

**Unknown is unknown on all viewports.** If knowledge is UNKNOWN, mobile presents "Unknown" — not a fabricated value.

**Missing provenance is NOT RECORDED on all viewports.** Mobile never fabricates a provenance record to fill the provenance field.

---

## 16. Intelligence Mobile

### 16.1 Intelligence and Decision Chain on Mobile — PROPOSED

Intelligence and decision chain (UX-12 INHERITED) is presented on mobile. Decision cards follow the same L0–L4 structure adapted for mobile viewports.

**Decision card on mobile:**
- L0: decision summary, status badge
- L1: rationale (public, non-chain-of-thought)
- L2: contributing evidence
- L3 (bottom sheet): full evidence chain, related decisions
- L4 (full-height sheet): constitutional gate result, governance record

**THINKING state:** Observable on mobile (user sees the indicator). Internal reasoning is NOT exposed on any viewport.

**Chain-of-thought:** PROTECTED at all disclosure levels on all viewports. Mobile does not provide an alternative path to chain-of-thought.

---

## 17. Agents Mobile

### 17.1 Agent Experience on Mobile — PROPOSED

Agents (UX-13 INHERITED) are presented on mobile with the same identity model. Each agent has a canonical identity; that identity does not change on mobile.

**Agent card on mobile:**
- L0: agent name, status badge (IDLE/RUNNING/FAILED/COMPLETED), last active timestamp
- L1: current task summary
- L2: recent actions list
- L3 (bottom sheet): full run history, resource usage
- L4 (full-height sheet): constitutional boundaries, authority scope, governance record

**Agent actions on mobile:** Agent action confirmations (where required by UX-14 INHERITED) use the two-step confirmation flow (Section 9.3).

**Agent activity ≠ agent authority on all viewports.** The fact that an agent appears active on the mobile feed does not imply it has authority to act outside its defined scope.

---

## 18. Actions / Approvals Mobile

### 18.1 Approval Model on Mobile — PROPOSED (Gap 10 remediation)

Actions and approvals (UX-14 INHERITED) are adapted for mobile. The approval requirement is never relaxed on mobile. Two-step confirmation is required.

### 18.2 Two-Step Approval Flow on Mobile

**Approval card (L0 in feed):**
- Badge: "APPROVAL REQUIRED"
- Summary: action name, agent, domain
- Tap to expand

**Expanded card (L1):**
- Full action description
- Agent identity
- Constitutional status (if relevant)
- Evidence summary
- "Approve" button (green) and "Reject" button (red), both 48px minimum height

**Approval confirmation modal:**
- Blocking modal (not bottom sheet — cannot be accidentally dismissed by swipe)
- Title: "Confirm Approval"
- Body: "[Action name] — [Agent] — [Domain]"
- "Confirm Approval" button and "Cancel" button
- Tapping "Confirm Approval" submits the approval
- Modal cannot be bypassed by back gesture — only by "Cancel" or "Confirm"

### 18.3 State Preservation During Approval

If the user backgrounds the app between Step 1 and Step 2:
- Approval card remains in its expanded state on return
- Approval is not auto-submitted
- Approval does not expire within session (expiry is governed by backend rules, not mobile UI)
- State is not silently discarded

### 18.4 Approval Immutability

- Approval ≠ execution on all viewports
- Proposal ≠ execution on all viewports
- Mobile cannot cause execution without the full approval chain

---

## 19. Memory Mobile

### 19.1 Memory on Mobile — PROPOSED

Memory (UX-15 INHERITED) is presented on mobile. The memory model is identical. Mobile does not provide a shortcut to bypass memory provenance or classification.

**Memory card on mobile:**
- L0: memory title, type badge, last accessed timestamp
- L1: memory summary, source
- L2: associated records
- L3 (bottom sheet): provenance, confidence, decay state
- L4 (full-height sheet): constitutional classification, privacy boundary

**Memory ≠ knowledge on all viewports.** A memory record on mobile is still a memory record — it carries its classification and provenance constraints.

---

## 20. System / Constitutional Mobile

### 20.1 Constitutional Gate on Mobile — PROPOSED

The constitutional gate (UX-16 INHERITED) operates identically on mobile. Mobile cannot bypass, disable, or weaken it.

**Constitutional event card on mobile:**
- L0: event type (ALLOW/BLOCK), timestamp, domain
- L1: rule applied, risk identifiers
- L3 (bottom sheet): full audit record, request detail
- L4 (full-height sheet): constitutional text, governance record, evidence block

**Constitutional block on mobile:**
- User receives the same BLOCK presentation as on desktop
- No mobile-specific override path exists
- The block is visible and its reason is presented at L1

**Mobile cannot conceal constitutional boundaries.** A constitutional boundary visible at L4 on desktop is visible at L4 on mobile (full-height bottom sheet).

---

## 21. Activity / Observability Mobile

### 21.1 Activity Feed on Mobile — PROPOSED

Activity and observability (UX-17 INHERITED) are presented on mobile. The event model is identical. The 12 lifecycle states, 8 execution states, and 5 connection states all apply.

**Activity feed on mobile:**
- Full-width vertical list of event cards
- Event cards follow L0–L4 disclosure (Section 12)
- Connection state banner persistent (Section 13.3)
- STALE tag on individual events older than 30 seconds

**Filter and search on mobile:**
- Filter: bottom sheet with filter chips (domain, type, time range)
- Search: collapsible search bar in header, expands on tap

### 21.2 Stale Data on Mobile

STALE events are marked with a ⚠ STALE tag on all viewports. Mobile does not silently present stale data as live. If the connection is DISCONNECTED and no new data has arrived, all event timestamps older than 30 seconds in the feed carry the STALE tag.

### 21.3 Disconnected State on Mobile

The DISCONNECTED state is always visible on mobile (Section 13.3 red banner). A disconnected APEX never presents as connected on any viewport.

---

## 22. Progressive Disclosure — Full L0–L4 Mobile Model

This section consolidates the full progressive disclosure mobile model for reference.

### 22.1 Level-by-Level Summary

| Level | Name | Content | Mobile delivery | Removable on mobile? |
|---|---|---|---|---|
| L0 | Card summary | Title, status, type badge, timestamp | Full-width card in feed | No |
| L1 | Expanded section | Summary, rationale, key data | Inline accordion expansion | No |
| L2 | Scrollable metadata | All metadata fields | Scroll within card | No |
| L3 | Evidence / provenance | Evidence list, provenance chain, related records | Bottom sheet (60% height, scrollable) | No |
| L4 | Constitutional / governance | Constitutional gate result, governance record, privacy classification | Bottom sheet full-height (95%) | No |

**L3 and L4 are NEVER removed on mobile due to viewport constraints.** They may be reached differently (bottom sheet instead of side panel) but they are always reachable.

### 22.2 Progressive Disclosure and Governance

L4 contains constitutional and governance information. This information is never more difficult to reach on mobile than on desktop. The full-height bottom sheet provides equivalent access to the governance record.

### 22.3 Bottom Sheet Behaviour

**L3 bottom sheet:**
- Triggered by: "View evidence" or "Provenance" button within L1/L2
- Height: 60% of viewport
- Scrollable vertically within sheet
- Dismissed by: swipe-down gesture or "Close" button
- Focus management: focus moves into sheet on open; returns to trigger on close

**L4 bottom sheet:**
- Triggered by: "Constitutional detail" or "Governance record" button within L1/L2 or L3
- Height: 95% of viewport
- Scrollable vertically within sheet
- Dismissed by: "Close" button only (swipe-down permitted but close button always visible to prevent accidental dismissal of critical governance information)
- Focus management: focus moves into sheet on open; returns to trigger on close

---

## 23. Accessibility

### 23.1 Touch Target Compliance — PROPOSED (Gap 11 remediation)

All interactive elements: minimum 44×44px touch target. Implementation:
- Padding expansion on visually small elements
- `min-height: 44px` enforced via CSS on all interactive elements
- Adjacent targets: minimum 8px spacing

### 23.2 ARIA and Semantic Markup — PROPOSED

| Component | ARIA role / attribute |
|---|---|
| Bottom tab bar | `role="tablist"` |
| Each tab | `role="tab"`, `aria-selected` |
| Hamburger button | `aria-label="Open menu"`, `aria-expanded` |
| Drawer | `role="navigation"`, `aria-label="Main menu"` |
| Bottom sheet | `role="dialog"`, `aria-modal="true"`, `aria-label` |
| FAB | `aria-label="Start voice session"` |
| Badge count | `aria-label="N unread"` |
| STALE tag | `aria-label="Data is stale"` |
| Connection banner | `role="status"`, `aria-live="polite"` (DEGRADED/RECONNECTING) or `aria-live="assertive"` (DISCONNECTED) |
| Approval modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |

### 23.3 Focus Management

- Drawer open: focus moves to first focusable item in drawer
- Drawer close: focus returns to hamburger button
- Bottom sheet open: focus moves to sheet heading or first focusable element
- Bottom sheet close: focus returns to trigger element
- Modal open: focus moves to modal heading
- Modal close: focus returns to trigger element
- Focus trap: active within drawer, bottom sheet, and modal while open

### 23.4 Keyboard and Switch Access

- All interactive elements are keyboard-focusable via Tab
- Drawer can be closed with Escape key
- Bottom sheet can be closed with Escape key
- Modal can be closed with Escape key (except blocking approval modal — Escape triggers "Cancel")
- Switch access: tab order follows visual order (top-to-bottom, left-to-right)

### 23.5 Zoom and Text Scaling

- Layout must not break at 200% browser zoom
- Text must not be locked to px — use rem/em for body text
- Bottom nav tabs and FAB must remain accessible at 200% zoom (may reflow to taller bar)
- Bottom sheets must be scrollable when text is scaled up

### 23.6 Non-Colour Differentiation

All state distinctions must have a non-colour indicator:
- Connection states: text label + icon, not colour alone
- Status badges: text label + icon, not colour alone
- Error states: icon + label, not colour alone
- STALE tag: text "STALE" + ⚠ icon, not colour alone
- Voice orb states: animation pattern + label, not colour alone

### 23.7 Reduced Motion

OBSERVED in production. `prefers-reduced-motion: reduce` disables all animations and transitions. This applies to:
- FAB pulse (ACTIVATING state)
- Orb animations (all voice states)
- Connection banner pulse (RECONNECTING state)
- Card expansion transitions
- Drawer slide animation
- Bottom sheet slide animation

When reduced motion is active, state changes are still visible via immediate visual state updates and text labels.

---

## 24. Failure / Degradation

### 24.1 All Failure States — PROPOSED

| Failure | Mobile presentation |
|---|---|
| WebSocket disconnected | Red banner below header (Section 13.3). Feed shows last known events with STALE tags. Retry button in banner. |
| WebSocket reconnecting | Amber pulsing banner with attempt count. |
| WebSocket degraded | Amber banner. Feed continues. |
| Voice — microphone permission denied | FAB shows blocked indicator. Toast: "Microphone unavailable. Use text input." Text input offered. |
| Voice — FAILED state | Orb red. Recovery options: "Try again" / "Use text instead." |
| API error (data fetch) | Inline error within the relevant surface. "Failed to load. Retry?" button. Not a full-screen error. |
| Constitutional block | L0 card: BLOCKED badge. L1: rule and risk identifiers. L3: audit trail. No screen takeover. |
| Agent failure | L0 card: FAILED badge. L1: error summary. L3: full run detail. |
| Approval rejection | L0 card: REJECTED badge. L1: rejection reason (if provided). |
| Session timeout | Full-screen interstitial: "Session expired. Tap to reconnect." |
| Offline (no network) | DISCONNECTED banner. All cached data remains visible with STALE tags. No fabricated live data. |
| Unknown system state | "Unknown" shown — never a fabricated value. |

### 24.2 No Silent Failures

No failure on mobile is silent. Every failure state has a visible indicator. The indicator may be compact (banner, badge, STALE tag) but it is present and non-suppressible while the failure persists.

---

## 25. Responsive State Model

### 25.1 State the Mobile UI Holds — PROPOSED

The mobile UI layer holds a small set of UI-local state. This state is distinct from APEX system state (which lives in the backend, event bus, and database).

| UI State | Scope | Persists? |
|---|---|---|
| Active viewport class | Runtime | No — recomputed on resize |
| Drawer open/closed | Runtime | No — resets on nav |
| Bottom sheet open/closed | Runtime | No — resets on nav |
| Active tab | Runtime | Session |
| Card expanded state | Per-card | Session |
| Active domain filter | Runtime | Session |
| Voice state | Runtime | No — follows server state |
| Connection state | Runtime | No — follows WebSocket state |
| Approval card expanded | Per-card | Session (until submitted) |

### 25.2 State That Mobile UI Does NOT Hold

The mobile UI does not hold:
- APEX system state (lives in backend)
- Agent authority (lives in constitutional gate)
- Memory records (live in database)
- Event history beyond the current feed window (lives in ring buffer / database)
- Constitutional gate decisions (live in backend)
- Approval results (live in backend)

### 25.3 Viewport Class Detection

Viewport class is recomputed on every resize event. A debounce of 100ms is applied to prevent thrashing. On initial load, the class is computed before first render to prevent layout flash.

---

## 26. Mobile Interaction Invariants

The following 30 invariants hold on all mobile viewports, all orientations, all gesture types, and all voice input modes.

**INV-MOBILE-01.** Responsive presentation cannot change authority.  
**INV-MOBILE-02.** Responsive presentation cannot change governance.  
**INV-MOBILE-03.** Responsive presentation cannot create execution authority.  
**INV-MOBILE-04.** Mobile cannot bypass approval.  
**INV-MOBILE-05.** Mobile cannot fabricate evidence.  
**INV-MOBILE-06.** Mobile cannot fabricate provenance.  
**INV-MOBILE-07.** Mobile cannot conceal constitutional boundaries.  
**INV-MOBILE-08.** Mobile cannot silently discard important state.  
**INV-MOBILE-09.** Responsive transformation preserves semantic meaning.  
**INV-MOBILE-10.** Touch cannot cause unintended execution — two-step approval is required for all governance-significant actions.  
**INV-MOBILE-11.** Voice and touch operate under the same constitutional model.  
**INV-MOBILE-12.** Desktop and mobile remain ONE APEX.  
**INV-MOBILE-13.** No second mobile runtime exists.  
**INV-MOBILE-14.** No second governance system exists.  
**INV-MOBILE-15.** No second presentation pipeline exists.  
**INV-MOBILE-16.** No second memory system exists.  
**INV-MOBILE-17.** No second event bus exists.  
**INV-MOBILE-18.** Unknown remains unknown on all viewports.  
**INV-MOBILE-19.** Missing provenance remains NOT RECORDED on all viewports — never fabricated.  
**INV-MOBILE-20.** Approval ≠ execution on all viewports.  
**INV-MOBILE-21.** Proposal ≠ execution on all viewports.  
**INV-MOBILE-22.** Activity ≠ authority on all viewports.  
**INV-MOBILE-23.** Memory ≠ knowledge on all viewports.  
**INV-MOBILE-24.** Knowledge ≠ authority on all viewports.  
**INV-MOBILE-25.** Agent activity ≠ agent authority on all viewports.  
**INV-MOBILE-26.** THINKING state is observable; internal reasoning is NOT exposed on any viewport.  
**INV-MOBILE-27.** Chain-of-thought is PROTECTED at all disclosure levels on all viewports.  
**INV-MOBILE-28.** Stale data is marked stale on all viewports — not presented as live.  
**INV-MOBILE-29.** Disconnected state is visible on all viewports.  
**INV-MOBILE-30.** L3 and L4 disclosure remain accessible on mobile — never removed due to viewport constraints.

---

## 27. Security / Governance Boundaries

### 27.1 Mobile Does Not Weaken Security — PROPOSED

The mobile experience inherits all security and governance constraints from UX-16 (INHERITED). The following boundaries are absolute.

**Boundary 1 — Authentication:**  
Mobile does not bypass authentication. The session token model is identical. A mobile viewport does not receive a reduced-security token.

**Boundary 2 — Constitutional Gate:**  
The constitutional gate (UX-16) runs server-side. Mobile cannot disable, bypass, or weaken it. A BLOCK verdict from the gate is presented on mobile as BLOCKED — not hidden, not reframed.

**Boundary 3 — Approval:**  
The approval flow (UX-14) is enforced server-side. The two-step mobile confirmation UI is a UX layer on top of the server-side requirement. Even if the mobile UI layer were bypassed (via API call), the server-side approval requirement would still apply.

**Boundary 4 — Chain-of-Thought Protection:**  
Chain-of-thought is never surfaced on mobile. The THINKING state is observable (user sees the indicator); internal reasoning is not. This applies at all disclosure levels.

**Boundary 5 — Audit Trail:**  
All actions taken on mobile are audit-logged identically to desktop actions. The mobile origin does not create a separate or reduced audit record.

**Boundary 6 — Data Classification:**  
Privacy and data classification labels (UX-11, UX-16 INHERITED) are visible at L4 on mobile. A record classified as RESTRICTED is visible as RESTRICTED on mobile. Mobile does not downgrade classification display.

### 27.2 What Mobile Cannot Do

Mobile cannot:
- Call governance APIs directly without authentication
- Approve an action without the two-step confirmation
- Submit an action after a constitutional block without re-evaluation
- Access chain-of-thought at any disclosure level
- Display fabricated provenance
- Display fabricated evidence
- Present disconnected state as connected
- Present stale data as live without a STALE indicator
- Remove L3 or L4 from the disclosure path
- Reduce the number of voice states from 11

---

## 28. Scenarios V-MOBILE-01 through V-MOBILE-30

### V-MOBILE-01 — Portrait Load, Cold Start
User opens APEX on a mobile portrait device for the first time in a session. Viewport class is computed as mobile portrait. Bottom tab bar renders. Header renders at 48px. Voice FAB renders at bottom-right above safe-area-inset-bottom. Connection state: RECONNECTING amber banner while WebSocket connects. On connect: banner resolves to LIVE green dot.

### V-MOBILE-02 — Portrait Load, Disconnected Network
User opens APEX with no network connectivity. Viewport class: mobile portrait. DISCONNECTED red banner visible immediately below header. No events in feed. Cached data (if any) shown with STALE tags. Retry button in banner. User taps Retry — banner shows RECONNECTING. No network: banner returns to DISCONNECTED.

### V-MOBILE-03 — Orientation Change, Portrait to Landscape
User is in APEX on portrait. Rotates device. Viewport class recomputes within 100ms debounce. Layout transitions to mobile landscape: header shrinks to 40px, compact bottom bar, side panels collapse to drawers. Active tab and expanded card states are preserved across orientation change.

### V-MOBILE-04 — Drawer Open and Close
User taps "More" tab on bottom bar or swipes right from left edge. Drawer slides in from left (animation, respects reduced-motion). Backdrop appears. User taps backdrop → drawer closes. User swipes left on open drawer → drawer closes. Focus is managed correctly (Section 23.3).

### V-MOBILE-05 — Bottom Sheet Open (L3)
User expands an event card to L1. Taps "View evidence." L3 bottom sheet slides up from bottom, 60% viewport height. Evidence list is scrollable within sheet. User swipes down → sheet dismisses. Focus returns to trigger button.

### V-MOBILE-06 — Bottom Sheet Open (L4 Constitutional)
User expands event card to L1. Taps "Constitutional detail." L4 full-height bottom sheet (95% viewport height) opens. Constitutional record visible and scrollable. User taps "Close" button → sheet dismisses. Escape key also closes. Focus returns to trigger.

### V-MOBILE-07 — Voice — IDLE to LISTENING
User taps voice FAB. FAB pulses (ACTIVATING). If microphone permission already granted: full-screen voice overlay opens. Orb pulses (LISTENING). User speaks. Transcript appears at bottom of overlay.

### V-MOBILE-08 — Voice — THINKING State
System is processing user's voice input. Orb enters slow spin. State label: "Thinking." Internal reasoning is NOT visible. No chain-of-thought is exposed. User waits.

### V-MOBILE-09 — Voice — Microphone Permission Denied
User taps voice FAB. System requests microphone permission. User denies. FAB shows blocked indicator. Toast message: "Microphone access required. Use text input instead." Text input is focused. Voice overlay does not open.

### V-MOBILE-10 — Voice — FAILED State
Voice session fails (network drop during LISTENING). Orb turns red. Recovery options visible: "Try again" and "Use text instead." User taps "Try again" → returns to ACTIVATING. User taps "Use text instead" → overlay closes, text input focused.

### V-MOBILE-11 — Approval — Two-Step Flow
Approval card appears in feed. Badge: "APPROVAL REQUIRED". User taps card → expands to L1. Full action description, agent identity, constitutional status, "Approve" and "Reject" buttons visible. User taps "Approve" → blocking modal opens: "Confirm Approval for [action]." User taps "Confirm Approval" → approval submitted. Card updates to APPROVED status.

### V-MOBILE-12 — Approval — Accidental Tap Prevention
User taps "Approve" button on expanded approval card. Modal opens. User taps outside modal (backdrop) → modal does NOT dismiss (it is a blocking modal). User must tap "Cancel" or "Confirm Approval." Back gesture opens "Cancel" option rather than silently dismissing.

### V-MOBILE-13 — Approval — App Backgrounded Between Steps
User taps card (Step 1), expands to L1. Before tapping "Approve," receives a phone call. App backgrounds. User returns. Card is in expanded state. Approval has not been auto-submitted. User can proceed with Step 2 or dismiss the card.

### V-MOBILE-14 — Constitutional Block on Mobile
APEX issues a BLOCK verdict. Event appears in feed. L0 card: BLOCKED badge, timestamp, domain. User taps card → L1: rule applied, risk identifiers. User taps "Constitutional detail" → L4 full-height sheet: full audit record, constitutional text. The BLOCK is fully visible on mobile — not hidden.

### V-MOBILE-15 — Connection State — DEGRADED
WebSocket reports degraded state. Amber banner appears below header: "Connection degraded. Some data may be delayed." Feed continues with existing events. New events may arrive slowly. Banner persists until state resolves. User cannot dismiss banner while state persists.

### V-MOBILE-16 — Connection State — STALE Events
Connection is maintained. No new events for 35 seconds. Events in feed older than 30 seconds show ⚠ STALE tag. No banner (STALE does not trigger a banner — only per-event tags). If connection drops, DISCONNECTED banner appears.

### V-MOBILE-17 — Progressive Disclosure — L0 to L4 Full Path on Mobile
User sees L0 card in feed. Taps card → L1 accordion expands inline. Taps "More detail" → L2 metadata scrolls within card. Taps "View evidence" → L3 bottom sheet (60%) opens with evidence and provenance. Within L3 sheet, taps "Constitutional detail" → L4 full-height sheet (95%) opens with governance record. All four levels reachable from mobile portrait viewport.

### V-MOBILE-18 — Tablet Portrait Layout
User opens APEX on a tablet in portrait orientation. Width ≥ 640px, height ≥ 500px. Viewport class: tablet portrait. Persistent left side nav (240px) visible. No bottom tab bar. Main content fluid. Right panel not visible by default. Detail opens as overlay sheet.

### V-MOBILE-19 — Tablet Landscape Layout
User rotates tablet to landscape. Width ≥ 1024px. Viewport class: tablet landscape. Left nav (240px) + fluid main + right panel (280px) all visible. Three-column layout. No bottom tab bar.

### V-MOBILE-20 — Reduced Motion — Voice Overlay
User has `prefers-reduced-motion: reduce` set. User taps voice FAB. Voice overlay opens (no slide animation — immediate render). Orb appears in LISTENING state (no pulse animation — steady orb). State is still distinguished by colour and label. All transitions are immediate.

### V-MOBILE-21 — Touch Target — Compact Card
A card's action button is visually 20×20px (icon only). Touch target is expanded to 44×44px via CSS padding without changing the visual icon size. User can tap anywhere within the 44×44px area to activate.

### V-MOBILE-22 — Domain Switch on Mobile
User taps "Finance" chip in the horizontal domain strip. Domain lens switches to Finance. Card feed updates to Finance domain events. Active chip is visually highlighted. Domain switch is presentation only — constitutional constraints for Finance domain still apply.

### V-MOBILE-23 — Proactive Communication — High Priority Push
APEX generates a high-priority proactive communication (UX-09 INHERITED). Mobile presents it as a top banner below the header. Banner is amber/red (priority-appropriate colour token from UX-05). User taps banner → navigates to the relevant section. User swipes banner up → dismissed. If user does not interact, banner persists for 10 seconds then collapses to a badge on the relevant tab.

### V-MOBILE-24 — Agent RUNNING State on Mobile
AGENT_STARTED event received via WebSocket. Activity feed shows: [AGENT badge] [Agent name] RUNNING [timestamp]. Status badge is animated (spinner, respects reduced-motion). User taps card → L1: current task summary. User taps "View agent detail" → L3 bottom sheet: full run history, resource usage.

### V-MOBILE-25 — Agent FAILED on Mobile
AGENT_COMPLETED event received with failure flag. L0 card: FAILED badge. User taps card → L1: error summary. User taps "View run detail" → L3 bottom sheet: full error trace, stage breakdown.

### V-MOBILE-26 — Knowledge Record — Unknown Provenance on Mobile
User views a knowledge record. Provenance field: NOT RECORDED. Mobile displays: "Provenance: Not recorded." No fabricated source. L3 bottom sheet: provenance chain shows "No provenance record." L4: privacy classification visible.

### V-MOBILE-27 — Memory Record on Mobile
User navigates to Memory section via drawer. Memory list visible as full-width cards. User taps a memory card → L1: summary, source. User taps "Provenance" → L3 bottom sheet: provenance chain, confidence, decay state.

### V-MOBILE-28 — Zoom Accessibility — 200% Browser Zoom
User increases browser zoom to 200%. Bottom tab bar reflows to taller height. FAB remains visible and above safe area. Bottom sheets remain scrollable. Cards remain readable (no horizontal overflow). Text does not clip. Touch targets remain ≥ 44px at 200% zoom.

### V-MOBILE-29 — Screen Reader Navigation
User navigates APEX with a screen reader active. Bottom tab bar announces each tab with role="tab" and aria-selected. Drawer announces as navigation landmark. Bottom sheet announces as dialog with aria-modal. FAB announces as "Start voice session." Connection state banner announces as live region ("Connection disconnected" asserted immediately). STALE tags announce as "Data is stale."

### V-MOBILE-30 — Full Mobile Session — Command to Approval
User opens APEX on mobile portrait. Connects (LIVE state). Issues a voice command (FAB → LISTENING → UNDERSTANDING → THINKING → SPEAKING). APEX proposes an action. Proactive card appears in feed with "APPROVAL REQUIRED." User taps card → L1 expands. Reviews detail. Taps "Approve" → modal opens. Reads modal. Taps "Confirm Approval." Action submitted. Feed updates: APPROVED. L3 bottom sheet: audit trail. L4 sheet: constitutional record. All governance boundaries intact throughout.

---

## 29. Production Gaps

The following 12 gaps exist in production as of 2026-08-28. Each gap is documented with its section reference and remediation path.

| # | Gap | Current state | Remediation section | Status |
|---|---|---|---|---|
| 1 | No mobile portrait (<640px) specific treatment | Single column below 900px, no portrait-specific handling | Sections 6, 7 | PROPOSED |
| 2 | No tablet-specific treatment (640–1024px) | No tablet breakpoint in production CSS | Sections 6, 7 | PROPOSED |
| 3 | No landscape orientation handling | No landscape media query or layout adaptation | Sections 6, 7 | PROPOSED |
| 4 | No hamburger/drawer navigation for mobile | No drawer component in production | Section 8 | PROPOSED |
| 5 | No touch gesture model (swipe, long-press) | No gesture handling in production JS | Section 9 | PROPOSED |
| 6 | No bottom sheet for detail views | No bottom sheet component in production | Sections 12, 22 | PROPOSED |
| 7 | No voice overlay adapted for mobile | Voice overlay not viewport-aware | Section 11 | PROPOSED |
| 8 | No progressive disclosure adaptation for constrained viewports | L0–L4 not adapted for mobile | Sections 12, 22 | PROPOSED |
| 9 | No connection state banners for mobile | No mobile-specific banner placement | Sections 13, 21 | PROPOSED |
| 10 | No mobile-specific approval interaction safeguards | Approval UI not touch-optimised | Sections 9, 18 | PROPOSED |
| 11 | No touch target minimum enforcement beyond nav-btn | Only one element (nav-btn) has 48px minimum | Section 9, 23 | PROPOSED |
| 12 | No viewport meta with `viewport-fit=cover` | Viewport meta tag absent from `dashboard.html` | Section 6.3 | PROPOSED |

All 12 gaps are PROPOSED resolutions. No production file is modified by this document. Section 33 confirms production impact is ZERO.

---

## 30. Deviations

The following deviations from ideal apply to the UX-18 specification.

**Deviation 1 — System Fonts (Prototype Constraint):**  
PROPOSED design may use system font stack in prototype/development builds. Production build uses the canonical UX-05 type scale. This is not a semantic deviation.

**Deviation 2 — No CDN in Prototype:**  
In prototype and development environments, assets are served from local paths. This does not affect the responsive behaviour specification.

**Deviation 3 — Viewport Simulation:**  
Browser DevTools viewport simulation is used to validate responsive behaviour in development. Physical device testing is recommended before production deployment of responsive changes. Simulation is not equivalent to device testing for safe area inset behaviour.

**Deviation 4 — Single Breakpoint Production Baseline:**  
The current production implementation uses a single 899/900px breakpoint (OBSERVED). The full multi-tier breakpoint model (Section 6) is PROPOSED. During the transition period, the 899/900px breakpoint remains the production behaviour.

**Deviation 5 — Bottom Sheet Not in Production:**  
Bottom sheets are specified as the mobile delivery mechanism for L3/L4 disclosure (Sections 12, 22). No bottom sheet component exists in production. The specification defines the target state.

**Deviation 6 — Touch Gesture Handling Not in Production:**  
Swipe and long-press gesture handling (Section 9) is specified but not implemented in production. This document defines the target interaction model.

---

## 31. Open Questions

The following 8 questions are OPEN as of 2026-08-28. They are documented here for resolution in a future cycle or as implementation decisions.

**OQ-01.** At what pixel density (1x, 2x, 3x) should icon assets be served on mobile? The current production asset set does not specify a responsive image strategy.

**OQ-02.** Should APEX support Progressive Web App (PWA) installation on mobile (add-to-homescreen, service worker, offline cache)? This has implications for the connection state model and offline behaviour.

**OQ-03.** Should the voice FAB position be user-configurable (left or right alignment)? Left-handed users may prefer left placement.

**OQ-04.** What is the maximum number of tabs on the bottom tab bar before a "More" overflow strategy is required? Currently specified as 5. If domain tabs are added, this limit may be reached.

**OQ-05.** Should bottom sheets support haptic feedback on iOS/Android at open and close events? This requires native wrapper or Web Vibration API integration.

**OQ-06.** How should the mobile experience handle dual-screen or foldable device form factors? The current breakpoint model does not account for foldable posture changes.

**OQ-07.** Should the approval two-step confirmation modal use biometric confirmation (Face ID / fingerprint) as the second step in addition to the "Confirm" tap, for additional governance assurance on mobile?

**OQ-08.** What is the strategy for mobile deep-linking? If a user receives a push notification and taps it, what URL scheme routes them to the correct APEX section and card?

---

## 32. UX-05 through UX-17 Integration

The following table records how each prior UX phase integrates into UX-18.

| Phase | Title | Integration in UX-18 |
|---|---|---|
| UX-05 | Canonical Visual Design System | Design tokens (colour, spacing, type, elevation) apply at all viewports. Token values are unchanged on mobile. |
| UX-06 | Command Centre Visual Prototype | Command Centre layout adapted for mobile in Section 10. Desktop layout preserved unchanged for desktop viewports. |
| UX-07 | Voice Experience | All 11 voice states defined for mobile in Section 11. Voice FAB is the mobile entry point. |
| UX-08 | Contextual Presentation / Progressive Disclosure | All L0–L4 levels accessible on mobile. Delivery mechanism adapted (bottom sheet for L3/L4). Levels not removed. |
| UX-09 | Proactive Communication | Same pipeline on mobile. Mobile-adapted presentation in Section 13. No second communication system. |
| UX-10 | Domain Experiences | All domain lenses on mobile in Section 14. Domain chip strip for switching. No domain capability removed. |
| UX-11 | Knowledge | Knowledge model on mobile in Section 15. Evidence classifications preserved. Unknown stays unknown. |
| UX-12 | Intelligence / Decision Chain | Decision chain on mobile in Section 16. THINKING observable; chain-of-thought protected. |
| UX-13 | Agents | Agent model on mobile in Section 17. Agent identity unchanged. Two-step confirmation for agent actions. |
| UX-14 | Actions / Approvals | Approval flow on mobile in Section 18. Two-step confirmation enforced. State preserved during backgrounding. |
| UX-15 | Memory | Memory model on mobile in Section 19. Memory ≠ knowledge preserved on all viewports. |
| UX-16 | System / Constitutional | Constitutional gate on mobile in Section 20. Gate is not weaker on mobile. Security boundaries in Section 27. |
| UX-17 | Activity / Observability | Activity feed on mobile in Section 21. All connection states, lifecycle states, execution states apply on mobile. |

---

## 33. Production Impact Assessment

**Impact on production files: ZERO.**

This document defines the target state for mobile and responsive behaviour in APEX. No production file is modified, created, or deleted as part of producing this document.

Specifically:
- `apex-v2.css` is not modified
- `dashboard.html` is not modified
- `server.js` is not modified
- No new route files are created
- No new CSS files are created
- No new JavaScript files are created
- No environment variables are changed
- No database schema is changed
- No Supabase configuration is changed

The OBSERVED production behaviour documented in Section 4 remains the active production behaviour. The PROPOSED behaviour documented throughout this document is a specification — it requires deliberate implementation as a separate development task.

---

## 34. Verification Criteria

The following 19 checks must pass before the mobile/responsive implementation is considered complete.

| # | Check | Pass condition |
|---|---|---|
| VC-01 | Viewport meta tag present | `dashboard.html` contains `viewport-fit=cover` |
| VC-02 | Breakpoints implemented | All 6 viewport classes produce distinct layouts |
| VC-03 | Bottom tab bar renders on mobile portrait | Tab bar visible below 640px |
| VC-04 | Drawer opens and closes | Swipe right opens; swipe left / tap backdrop closes |
| VC-05 | Bottom sheet renders for L3 | Tapping "View evidence" opens 60% bottom sheet |
| VC-06 | Bottom sheet renders for L4 | Tapping "Constitutional detail" opens 95% bottom sheet |
| VC-07 | L3/L4 not removable | Both levels reachable on 320px portrait viewport |
| VC-08 | Touch targets ≥ 44px | All interactive elements have ≥ 44×44px touch target |
| VC-09 | Two-step approval enforced | Single tap on "Approve" opens modal — does NOT submit |
| VC-10 | Approval modal is blocking | Tap outside modal does NOT dismiss it |
| VC-11 | All 11 voice states render on mobile | Voice overlay transitions through all states correctly |
| VC-12 | THINKING state does not expose reasoning | No chain-of-thought text visible in THINKING state |
| VC-13 | Connection banner renders correctly | DISCONNECTED → red banner; DEGRADED → amber banner |
| VC-14 | STALE tag renders on stale events | Events >30s old show ⚠ STALE tag |
| VC-15 | Reduced-motion respected | `prefers-reduced-motion: reduce` disables all animations |
| VC-16 | Safe area insets respected | Bottom nav, FAB, header above notch/home indicator |
| VC-17 | Focus management correct | Drawer/sheet open → focus moves in; close → focus returns |
| VC-18 | Keyboard/screen reader navigable | All interactive elements focusable; ARIA roles correct |
| VC-19 | 200% zoom does not break layout | No horizontal overflow; targets remain tappable |

---

## 35. Final Certification

UX-18 — MOBILE / RESPONSIVE — COMPLETE.

**Production responsive audit completed:** ✓  
**12 production gaps documented:** ✓  
**6-tier breakpoint model defined:** ✓  
**Layout transformation per viewport defined:** ✓  
**Navigation model (bottom tab bar, drawer, persistent nav) defined:** ✓  
**Touch model (44px targets, gesture set, two-step approval) defined:** ✓  
**Mobile Command Centre defined:** ✓  
**All 11 voice states on mobile defined:** ✓  
**Voice FAB per viewport defined:** ✓  
**Microphone permission failure handled:** ✓  
**Progressive disclosure L0–L4 mobile model defined:** ✓  
**L3/L4 never removable on mobile:** ✓  
**Proactive communication mobile-adapted:** ✓  
**Connection state banners on mobile defined:** ✓  
**Domain experiences mobile defined:** ✓  
**Knowledge mobile defined:** ✓  
**Intelligence mobile defined:** ✓  
**Agents mobile defined:** ✓  
**Actions/Approvals two-step mobile flow defined:** ✓  
**Memory mobile defined:** ✓  
**System/Constitutional mobile defined:** ✓  
**Activity/Observability mobile defined:** ✓  
**Progressive disclosure full model consolidated:** ✓  
**Accessibility (44px, ARIA, focus, zoom, non-colour) defined:** ✓  
**All failure/degradation states defined:** ✓  
**Responsive state model defined:** ✓  
**30 interaction invariants (INV-MOBILE-01 through INV-MOBILE-30) documented:** ✓  
**Security/Governance boundaries defined:** ✓  
**30 scenarios (V-MOBILE-01 through V-MOBILE-30) documented:** ✓  
**12 production gaps listed:** ✓  
**6 deviations documented:** ✓  
**8 open questions documented:** ✓  
**UX-05 through UX-17 integration table complete:** ✓  
**Production impact assessed — ZERO:** ✓  
**19 verification criteria defined:** ✓  
**No second runtime created:** ✓  
**No second governance system created:** ✓  
**No second event bus created:** ✓  
**No second memory system created:** ✓  
**No second presentation pipeline created:** ✓  
**No production files modified:** ✓  
**No production capability falsely represented:** ✓  
**Knowledge-Gap intact:** ✓  
**Unknown stays unknown on all viewports:** ✓  
**Missing provenance never fabricated on any viewport:** ✓  
**THINKING state observable; chain-of-thought protected on all viewports:** ✓  

---

## 36. Exact Next Hard Stop

STOP. DO NOT BEGIN UX-19. UX-19 — INTEGRATION / E2E CERTIFICATION — REQUIRES EXPLICIT AUTHORISATION.
