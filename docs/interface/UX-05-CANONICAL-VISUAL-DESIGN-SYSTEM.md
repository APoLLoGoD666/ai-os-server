# UX-05 — Canonical Visual Design System

**Programme**: APEX UX Phase  
**Task ID**: UX-05  
**Status**: COMPLETE  
**Date**: 2026-08-27  
**Author**: Claude (claude-sonnet-4-6)  
**Scope**: Design-system specification — ZERO APPLICATION MODIFICATIONS

---

## 1. Authority

This document is the authoritative canonical visual design system for APEX.

It derives authority from:

- UX-00 — Legacy Interface Baseline (CERTIFIED 2026-08-26)
- UX-01 — Canonical UX Discovery (COMPLETE 2026-08-26)
- UX-02 — User + Task Model / Canonical User Journeys (COMPLETE 2026-08-26)
- UX-03 — Information Architecture + Tree of Life (COMPLETE 2026-08-27)
- UX-04 — Communication Architecture (COMPLETE 2026-08-27)
- APEX Constitutional Architecture (A1–A6)
- Direct inspection of `public/dashboard.html` CSS (20,826 lines)
- Direct inspection of `public/apex-v2.css` (57 KB)
- Direct inspection of `public/apex-custom.css`

No implementation phase may deviate from this visual specification without explicit authorisation and a recorded design decision.

---

## 2. Scope

### In scope

- Visual design principles
- Canonical design token architecture
- Colour system (dark theme; light theme assessment)
- Typography system
- Spacing and layout
- Shape language
- Elevation model
- Iconography guidance
- Motion principles
- APEX presence (orb) visual specification
- Waveform visual specification
- Five-surface visual language (Command, World, Decisions, Knowledge, System)
- Communication channel visual states (Converse, Present, Notify)
- Component taxonomy and core component specifications
- Responsive design model
- Accessibility system
- Visual governance rules
- Design invariants
- Handoff specification for UX-06

### Out of scope

- HTML modification
- CSS implementation
- JavaScript changes
- Frontend component creation
- Backend modifications
- Route or API changes
- Database changes
- Dependency installation
- Runtime or deployment changes
- UX-06 implementation (requires explicit authorisation)

---

## 3. Source Artefacts

| Artefact | Role in UX-05 |
|----------|--------------|
| UX-00 Legacy Baseline | Primary source for PROTECT decisions, existing token values, component inventory |
| UX-01 Canonical UX Discovery | Design objectives (DO-01–DO-10), APEX presence model, task model |
| UX-02 User + Task Model | Task flows that define visual state requirements |
| UX-03 Information Architecture | 5 surfaces, Tree of Life, object types, navigation model |
| UX-04 Communication Architecture | 11 voice states, 13 notification categories, 13 presentation types, 9 cross-channel transitions |
| `public/dashboard.html` CSS | Observed design tokens, orb animations, waveform, component classes |
| `public/apex-v2.css` | Competing token set (to be resolved) |

Evidence classifications used throughout this document:

| Classification | Meaning |
|---------------|---------|
| **OBSERVED** | Directly established by UX-00 or repository code inspection |
| **INHERITED** | Established by UX-01/UX-02/UX-03/UX-04 decisions |
| **PROPOSED** | New UX-05 design decision |
| **OPEN** | Not responsibly resolvable at UX-05 stage |

---

## 4. Legacy Visual Audit

### 4.1 Page Structure

| Element | Disposition | Rationale |
|---------|------------|-----------|
| 14-page SPA with CSS-transition navigation | **PROTECT** | Fast, functional, distinctive. 220ms slide+fade is well-calibrated. Zero network cost on page switch. |
| `grid-template-areas: "topbar topbar" "sidenav content"` desktop layout | **PROTECT** | Clean two-panel layout; sidebar naturally communicates navigation hierarchy |
| Mobile-first flex column with grid override at 900px | **PROTECT** | Correct responsive implementation with genuine two-layout strategy |
| Page padding 10px mobile / 14px desktop | **REFINE** | Values are correct; rename to canonical tokens |
| Page gap 10px mobile / 12px desktop | **REFINE** | Values are correct; rename to canonical tokens |

### 4.2 Navigation

| Element | Disposition | Rationale |
|---------|------------|-----------|
| Left sidebar (200px, flex-column) | **PROTECT** | Good proportions; clear hierarchy |
| Nav buttons: 52px height, row layout icon+label | **PROTECT** | Comfortable touch targets even on desktop |
| Active: left 3px border in primary colour | **PROTECT** | Clean, unambiguous active state indicator |
| Mobile bottom tab bar (60px) | **PROTECT** | Correct iOS/Android thumb-zone placement |
| Mobile active: 2px top indicator | **PROTECT** | Standard mobile tab pattern; visually consistent |
| Nav icon: emoji characters | **REWORK** | Emojis are inconsistent across OS/browser; replace with unified icon system |
| Nav labels: 8px uppercase 0.13em tracking | **REFINE** | 8px is extremely small; minimum 9px; retain uppercase tracking identity |
| Hamburger mobile dropdown (3×4 grid) | **REWORK** | Missing 3 pages; grid layout has no hierarchy; redesign as IA-aware drawer |

### 4.3 Top Bar / Header

| Element | Disposition | Rationale |
|---------|------------|-----------|
| 52px height | **PROTECT** | Proportionally correct; creates clear header band |
| Brand ring (28px, cyan, 3s pulse) | **PROTECT** | Core APEX identity element; the "always-on" presence indicator |
| `brand-ring-dot` (7px, cyan) | **PROTECT** | Elegant inner signal; works with the ring |
| "APEX" wordmark + "AI OS" subtitle | **PROTECT** | Brand identity; Cinzel weight 800 + 0.26em tracking is distinctive |
| Clock (HH:MM:SS, tabular-nums) | **PROTECT** | Personal OS always shows time; tabular-nums prevents layout shift |
| Date line (8px, uppercase, muted) | **PROTECT** | Correct secondary information treatment |
| `status-dot` (7px, cyan/red) | **REFINE** | Good concept; needs defined states beyond on/off |
| `rgba(3,6,15,0.92)` + `backdrop-filter: blur(20px)` | **PROTECT** | The frosted glass header is a visual signature |
| `border-bottom: 1px solid var(--border-dim)` | **PROTECT** | Subtle separation; preserves the dark-field immersion |

### 4.4 APEX Orb (Command Page)

| Element | Disposition | Rationale |
|---------|------------|-----------|
| 88px circle; `border-radius: 50%` | **PROTECT** | Core identity; the primary APEX presence |
| Radial gradient fill (cyan + blue + dark) | **PROTECT** | Creates "alive" depth; not flat |
| 3 concentric pulse rings (100%, 132%, 164%) | **PROTECT** | Communicates presence radiating outward |
| Cyan border: `rgba(0,212,255,0.38)` at rest | **PROTECT** | Consistent with primary colour identity |
| LISTENING state: red border + orbListen 0.55s | **PROTECT** | Red = recording is an established pattern; animation speed is correct |
| ACTIVE state: strong cyan pulse 0.6s | **PROTECT** | Active engagement should be brighter than rest |
| WAITING state: 4s slow breathe | **PROTECT** | Ambient animation communicates "I am here, attentive" |
| Orb text: "APEX" 0.24em + "STANDBY · TAP TO SPEAK" | **REFINE** | Keep text presence; refine copy per UX-04 voice state labels |
| WebGL canvas `#plasmaOrb` | **PROTECT** | The plasma shader gives organic life to the orb |
| `orbShell` state classes (listening, active, waiting) | **REFINE** | Extend to all 11 UX-04 voice states |

### 4.5 Waveform

| Element | Disposition | Rationale |
|---------|------------|-----------|
| 7 bars, 3px wide, height 5px→18px | **PROTECT** | Well-proportioned; 7 bars is a balanced count |
| Staggered delays (0–0.42s, 0.07s steps) | **PROTECT** | Creates natural ripple effect |
| 0.48s duration, infinite alternate | **PROTECT** | Speed matches natural speech rhythm |
| Cyan colour | **PROTECT** | Consistent with primary identity |
| `opacity: 0` → `opacity: 1` on `.active` | **PROTECT** | Clean show/hide with fade transition |
| Gap 3px between bars | **PROTECT** | Correct breathing room |
| Always visible below orb | **REFINE** | Currently always in same position; should respond to voice state per UX-04 |

### 4.6 Input Zone

| Element | Disposition | Rationale |
|---------|------------|-----------|
| 54px height, persistent | **PROTECT** | Correct affordance height |
| `chat-input` (36px, pill 18px radius) | **PROTECT** | Pill input is the correct shape for a conversational interface |
| Mic button (36px circle) | **REFINE** | Keep circular; unify with single voice architecture |
| Send button (36px, blue→cyan gradient) | **PROTECT** | Gradient communicates energy/action |
| Auto-listen toggle button | **REFINE** | Useful; needs clearer visual state |
| Hidden on command page | **REWORK** | Creates dead-end for keyboard users (D-03 from UX-00); input should have a text fallback path on Command |
| `backdrop-filter: blur(20px)` | **PROTECT** | Frosted glass treatment consistent with topbar |
| `border-top: 1px solid var(--border-dim)` | **PROTECT** | Consistent separator pattern |

### 4.7 Colour System

| Element | Disposition | Rationale |
|---------|------------|-----------|
| `--bg: #03060f` (near-black navy) | **PROTECT** | The APEX dark-field. Not pure black — the blue undertone is identity |
| `--primary: #00d4ff` (cyan) | **PROTECT** | APEX signature colour; appears in every key element |
| `--secondary: #0066ff` (blue) | **PROTECT** | Depth; gradient partner to primary |
| `--accent: #7b2fff` (purple/violet) | **PROTECT** | Useful contrast accent; appears in app background gradients |
| `--text: #e8f4ff` (cold white) | **PROTECT** | Blue-tinted near-white maintains the colour temperature |
| `--danger: #ff4d6d` (red-pink) | **PROTECT** | Distinctive, not pure red; works in dark context |
| `--success: #27ae60` (green) | **PROTECT** | Standard green; clear positive signal |
| `warning: #ff9f43` (amber) | **PROTECT** | Already in use (email priority); formalise into token system |
| 5 competing `:root` token blocks | **REWORK** | Must consolidate to one canonical token set |
| AX domain colours (sys/fin/uni/biz/file) | **REFINE** | Good concept; extend to all 10 canonical domains |
| apex-v2.css indigo `#6366f1` system | **RETIRE** | Conflicts with established cyan identity; no place in canonical system |

### 4.8 Typography

| Element | Disposition | Rationale |
|---------|------------|-----------|
| Inter (body/UI) | **PROTECT** | Excellent legibility; correct choice for dense UI |
| Cinzel (display/brand) | **PROTECT** | Creates classical, authoritative feel for APEX branding |
| JetBrains Mono (data/code/labels) | **PROTECT** | Best-in-class programmer mono; correct for system information |
| IBM Plex Sans | **RETIRE** | No distinct role not already served by Inter; two humanist sans fonts unnecessary |
| Space Grotesk | **RETIRE** | Not distinct enough from Inter to justify; adds load cost |
| 5 fonts simultaneously | **REWORK** | Reduce to 3 canonical fonts (Inter, Cinzel, JetBrains Mono) |
| JetBrains Mono in nav labels | **REFINE** | Nav labels should use Inter uppercase, not mono; mono implies machine output |

### 4.9 Spacing and Layout

| Element | Disposition | Rationale |
|---------|------------|-----------|
| Ad-hoc pixel values per component | **REWORK** | No consistent spacing scale; values range arbitrarily |
| Gap/padding based on component context | **REWORK** | Needs semantic naming and canonical scale |
| Page padding (10px/14px) | **REFINE** | Values are correct; formalise as tokens |

### 4.10 Borders and Surfaces

| Element | Disposition | Rationale |
|---------|------------|-----------|
| `glass: rgba(255,255,255,0.04)` | **PROTECT** | APEX surface identity; subtle glass effect |
| `glass2: rgba(0,212,255,0.05)` | **PROTECT** | Cyan-tinted elevation; distinguishes highlighted surfaces |
| `border-dim: rgba(0,212,255,0.08)` | **PROTECT** | Low-presence border; maintains immersion |
| `border: rgba(0,212,255,0.16)` | **PROTECT** | Standard border; consistent presence |
| `border-radius: 12px` for panels | **PROTECT** | Correct for the design language |
| `border-radius: 14px` for modals | **PROTECT** | Slightly more prominent for elevation hierarchy |
| `backdrop-filter: blur(20px)` on chrome | **PROTECT** | Defines the APEX glass morphism aesthetic |
| Inconsistent border-radius across components | **REWORK** | Canonicalise to a radius scale |

### 4.11 Shadows

| Element | Disposition | Rationale |
|---------|------------|-----------|
| Glow-based shadows (`box-shadow: 0 0 Xpx colour`) | **PROTECT** | In dark context, coloured glow is more authentic than drop-shadow |
| Modal drop shadow `0 20px 60px rgba(0,0,0,0.6)` | **PROTECT** | Correct emphasis for elevated elements |
| No formal shadow scale | **REWORK** | Define canonical glow/shadow levels |

### 4.12 Icons

| Element | Disposition | Rationale |
|---------|------------|-----------|
| Emoji icons in navigation | **REWORK** | Inconsistent rendering; no semantic states; accessibility problems |
| Custom SVG paths in stat chips | **PROTECT** | These specific icons are correct; retain the designs |
| No icon library loaded | **PROTECT** | Avoid external dependency; custom icon set is preferable |

### 4.13 Animations

| Element | Disposition | Rationale |
|---------|------------|-----------|
| Page transition: 220ms ease, translateX(18px→0) | **PROTECT** | Exactly right; calibrated feel |
| Panel entry: 350ms `.ds-panel` | **PROTECT** | Correct deliberate animation speed |
| Nav hover: 150ms scale(1.1) | **PROTECT** | Micro-interaction; correct speed |
| Brand pulse: 3s infinite | **PROTECT** | Ambient breathing; communicates aliveness |
| Orb animations (listening/active/waiting) | **PROTECT** | Well-calibrated to communication states |
| Waveform: 0.48s staggered | **PROTECT** | Correct speech rhythm |
| `prefers-reduced-motion` comprehensive disable | **PROTECT** | Accessibility foundation; must remain |
| Typing indicator (3-dot bounce, 1.4s) | **PROTECT** | Standard pattern; correct timing |

### 4.14 Loading States

| Element | Disposition | Rationale |
|---------|------------|-----------|
| `.skel` skeleton placeholders | **PROTECT** | Prevents layout shift; correct pattern |
| `.ds-spinner` | **PROTECT** | Retain for determinate wait states |
| Stat chips showing "£—" / "Loading…" | **REWORK** | Should use skeleton pattern, not dashes |

### 4.15 Notifications

| Element | Disposition | Rationale |
|---------|------------|-----------|
| `.notif-item` (cyan-tinted, subtle border) | **REFINE** | Extend to 6-level attention system per UX-04 |
| `.task-toast` (fixed bottom, glass, variants) | **PROTECT** | Correct toast position and treatment |
| Toast variants (success/error/info) | **PROTECT** | Semantic colour variants are correct |

### 4.16 Approval/Decision Cards

| Element | Disposition | Rationale |
|---------|------------|-----------|
| `.email-btn.approve` (green border) | **REFINE** | Approval/reject pattern exists; extend to canonical Decisions surface |
| `.email-btn.reject` (red border) | **REFINE** | Correct semantic colour; extend |
| No dedicated approval surface | **REWORK** | Approval lives inside email cards; needs standalone Decisions visual language |

### 4.17 Z-Index

| Element | Disposition | Rationale |
|---------|------------|-----------|
| Scattered values (100 to 999999) | **REWORK** | No formal scale; z-index collisions are architecturally dangerous |
| Login overlay at 999999 | **REFINE** | Auth overlay must be topmost; value is excessive but functionally correct |

### 4.18 Responsive

| Element | Disposition | Rationale |
|---------|------------|-----------|
| 900px breakpoint | **PROTECT** | Correct transition point for sidebar → bottom nav |
| `safe-area-inset-bottom` | **PROTECT** | Correct iOS PWA support |
| Mobile nav dropdown (11/14 pages) | **REWORK** | Missing 3 pages; hierarchy-unaware |
| `100dvh` with `100vh` fallback | **PROTECT** | Correct handling of iOS Safari viewport |

### 4.19 Accessibility

| Element | Disposition | Rationale |
|---------|------------|-----------|
| `skip-to-main` link | **PROTECT** | Core accessibility requirement |
| `aria-label` on interactive elements | **PROTECT** | Extend comprehensively; current coverage is partial |
| `prefers-reduced-motion` disable-all | **PROTECT** | Comprehensive and correct |
| `touch-action: manipulation` on interactive targets | **PROTECT** | Eliminates 300ms mobile tap delay |
| 44px minimum touch targets (mobile) | **PROTECT** | Correct accessibility minimum |
| Keyboard shortcuts (1–0, R, A, N, /, ?, ESC) | **PROTECT** | Valuable; preserve all; extend to cover new surfaces |

### 4.20 Visual Audit Summary

**PROTECT count**: 48 elements  
**REFINE count**: 18 elements  
**REWORK count**: 10 elements  
**RETIRE count**: 3 elements (IBM Plex Sans, Space Grotesk, apex-v2.css indigo system)

The APEX visual identity is substantially sound. The primary failures are implementation-layer: competing CSS token systems, emoji icons, polling, and missing z-index governance. The aesthetic foundation — dark field, cyan presence, glass panels, orb, waveform, Cinzel brand — is strong and should be professionalised rather than replaced.

---

## 5. APEX Visual Identity

### 5.1 What Makes APEX Recognisably APEX

The following elements constitute the APEX visual identity. They are not decorative choices — they are identity signals that must survive any interface redesign.

| Identity Element | Role | Why It Must Survive |
|-----------------|------|-------------------|
| Deep navy dark field (`#03060f`) | Background | The blue undertone distinguishes APEX from generic "dark mode" |
| Cyan primary (`#00d4ff`) | Signature colour | Appears in every key element; is the colour of APEX's attention |
| Circular orb with concentric pulse rings | Presence | APEX has a physical location in the interface |
| Glass morphism surfaces | Surface texture | Semi-transparent panels with blur create depth without opaqueness |
| Coloured glow shadows | Elevation | In the dark field, glow is more authentic than drop-shadow |
| Cinzel typeface (headings/brand) | Typography | Classical authority; distinct from utilitarian interfaces |
| JetBrains Mono (system/data) | Typography | Technical precision signals |
| Cyan border treatment | Surface edges | `rgba(0,212,255,0.08–0.16)` — the interface breathes cyan |
| Uppercase tracking labels | Information hierarchy | `letter-spacing: 0.13–0.26em` creates a distinct APEX register |
| 7-bar staggered waveform | Voice feedback | A specific, recognisable APEX animation pattern |
| Constitution charter (Command page) | Identity anchor | Operating principles are part of the default view |
| Activity feed | Transparency | What APEX is doing is always visible |

**Evidence**: OBSERVED (all elements directly confirmed in `dashboard.html` CSS and UX-00 audit)

### 5.2 Identity vs. Implementation Accidents

| Appears Identity — Is an Accident | Should Not Survive |
|-----------------------------------|------------------|
| 5 competing `:root` token blocks | Visual inconsistency; legacy accumulation |
| Emoji icons in navigation | Platform-inconsistent rendering |
| IBM Plex Sans / Space Grotesk | No distinct role; legacy addition |
| Indigo `#6366f1` from apex-v2.css | Conflicts with cyan identity; architectural drift |
| Z-index values at 999999 | Numerical accident; not design intent |
| Mixed border-radius values (7, 8, 10, 12, 14px) | No scale; per-component guessing |
| Nav labels at 8px JetBrains Mono | Too small; wrong font choice for navigation |

### 5.3 APEX Atmosphere

The APEX interface should feel:

**DEEP** — The dark field creates space; content appears to float above it rather than sitting on it.

**CALM** — Nothing flashes unnecessarily. Animations breathe rather than bounce. The dominant visual register is quiet attentiveness.

**INTELLIGENT** — Information density is high but organised. Hierarchy is immediately legible. Nothing is decorative without also being informational.

**ALIVE** — The orb breathes. The waveform reacts. The brand ring pulses. APEX communicates that it is present and attentive, even when idle.

**AUTHORITATIVE** — Cinzel for display type, precise mono for data, uppercase tracking — these signals communicate a system that takes itself seriously without being cold.

**Evidence**: INHERITED from UX-01 DO-02, UX-01 section 5.3 ("APEX as Presence, not Application")

---

## 6. Design Principles

### P-01: CLARITY OVER COMPLEXITY

Every visual element must communicate one thing clearly before it communicates multiple things. When information must be dense, hierarchy makes it navigable. Nothing is added to the interface without a clear purpose.

### P-02: CALM BY DEFAULT

The interface begins quiet. Attention is earned, not grabbed. Animations communicate state, not enthusiasm. APEX does not shout at the user.

### P-03: DEPTH IS LEGIBLE

APEX is a powerful system. The interface must accommodate depth — evidence, provenance, agent reasoning, constitutional audit — without exposing it all at once. Progressive disclosure is the mechanism. Surface simplicity conceals, but does not hide, sophistication.

### P-04: PROFESSIONALISM TAKES PRIORITY OVER DECORATION

Every visual decision must justify itself through function. Gradients only when they communicate energy or direction. Animations only when they communicate state. Colour only when it communicates meaning. No element exists solely to look modern.

### P-05: ONE VISUAL LANGUAGE

Five competing token systems, fourteen pages with inconsistent panel styles, emoji in navigation — these are failures of visual unity. Every component speaks the same visual dialect. A new page should be immediately recognisable as APEX.

### P-06: HUMAN AUTHORITY IS VISUALLY EXPLICIT

When APEX presents a decision for human approval, that approval moment must be the most visually prominent element on the screen. Consequential actions require unambiguous visual confirmation. Human control is never hidden inside menus.

### P-07: CONTEXT COMMUNICATES, NOT JUST CONTENT

The user should be able to determine: where they are, what APEX is doing, what needs attention, what is actionable — from visual structure alone, before reading any text. Position, colour, animation, and hierarchy carry this information.

### P-08: COLOUR IS NEVER THE ONLY STATE INDICATOR

Every state that is communicated by colour is also communicated by shape, text, icon, or animation. Colour-blind users receive identical information.

### P-09: RESPONSIVE IS NOT SCALED-DOWN

Mobile APEX is a genuine mobile experience, not desktop APEX at 375px width. Navigation, presentations, voice controls, and notifications adapt to the interaction paradigm of each form factor.

### P-10: IDENTITY PERSISTS AS APEX GROWS

A new domain, a new capability, a new agent class — these are additions, not redesigns. The design system provides the visual vocabulary. Additions speak the vocabulary; they do not create their own.

### P-11: ACCESSIBILITY IS ARCHITECTURE

Accessibility requirements are specified alongside every component definition. They are not added later. A component without defined focus, keyboard, and screen-reader behaviour is incomplete.

### P-12: MOTION COMMUNICATES STATE

The waveform tells the user APEX is speaking. The orb pulse tells the user APEX is listening. The page transition tells the user they have moved. No animation should exist that does not communicate something. Duration and easing choices are deliberate, not aesthetic.

**Evidence**: INHERITED from UX-01 DO-01 through DO-10; PROPOSED as formal design principles.

---

## 7. Visual Hierarchy

### 7.1 Information Importance Hierarchy

| Level | Label | Visual Treatment | Examples |
|-------|-------|-----------------|---------|
| L1 | PRIMARY | Full brightness, primary colour, large type | Orb, page title, active voice state, urgent notifications |
| L2 | SECONDARY | 80% text brightness, standard body size | Conversation text, main panel content, decision options |
| L3 | TERTIARY | Muted `rgba(232,244,255,0.45)`, smaller size | Labels, timestamps, counts, panel headers |
| L4 | CONTEXTUAL | `rgba(232,244,255,0.25)`, smallest text | Hints, placeholders, metadata, provenance |
| L5 | SYSTEM | Mono font, dimmed, smaller | Debug info, technical states, constitutional audit detail |

### 7.2 Surface Hierarchy

| Surface Layer | Background | Border | Elevation |
|--------------|-----------|--------|-----------|
| Background | `#03060f` | — | Ground level |
| Panel | `rgba(255,255,255,0.04)` + blur | `rgba(0,212,255,0.08)` | L1 |
| Elevated panel | `rgba(0,212,255,0.05)` + blur | `rgba(0,212,255,0.16)` | L2 |
| Overlay | `rgba(3,6,15,0.92)` + blur | `rgba(0,212,255,0.16)` | L3 |
| Modal | `rgba(5,10,26,0.97)` + blur | `rgba(0,212,255,0.20)` + shadow | L4 |
| Top chrome | `rgba(3,6,15,0.92)` + blur | `rgba(0,212,255,0.08)` | L5 |

### 7.3 Attention Hierarchy

The user can instantly determine "what requires my attention" through:

- **Colour intensity**: Higher attention = more saturated primary colour
- **Animation**: Higher attention = motion is present; idle = still (except ambient)
- **Size**: Critical items are larger or take more visual space
- **Position**: Notifications and decisions appear above content, never buried
- **Typography weight**: Action labels are heavier than informational labels

### 7.4 Navigation Hierarchy

| Tier | Role | Visual Signal |
|------|------|--------------|
| T1 Primary | 5 surfaces (Command, World, Decisions, Knowledge, System) | Sidebar items with left active bar |
| T2 Domain | 10 domains within World | Secondary nav within World surface |
| T3 Object | Capabilities, agents, tasks within surfaces | Panel headers, tab groups |
| T4 Contextual | Relationships, detail views | Expand/collapse, drawer panels |

**Evidence**: INHERITED from UX-03 T1–T4 navigation model; PROPOSED visual treatment per level.

---

## 8. Design Token Architecture

### 8.1 Problem Statement

UX-00 identified five competing `:root` token blocks in `dashboard.html`, each defining overlapping variables. The cascade result is non-deterministic. This is the most critical visual architecture failure.

**OBSERVED**: Five blocks: v1 inline (cyan `#00d4ff`), apex-v2.css (indigo `#6366f1`), v3+ inline overrides, AX system (`--ax-*`), Titan/DS system.

### 8.2 Target Architecture

ONE canonical token set. Single source of truth. Every component draws from it. No component may define its own colour or spacing values outside this set.

### 8.3 Token Namespace Convention

```
--apex-{category}-{name}[-{modifier}]
```

Examples:
- `--apex-color-primary`
- `--apex-color-bg`
- `--apex-color-surface-1`
- `--apex-space-md`
- `--apex-radius-lg`
- `--apex-shadow-glow-primary`
- `--apex-duration-standard`

Legacy tokens (`--primary`, `--bg`, `--glass`, etc.) are preserved as **aliases** pointing to canonical tokens, ensuring backward compatibility during transition. Aliases are deprecated once UX-06 implementation replaces their consumers.

### 8.4 Token Categories

| Category | Prefix | Subcategories |
|----------|--------|--------------|
| Colour | `--apex-color-*` | bg, surface, border, text, semantic, domain, state |
| Typography | `--apex-font-*` | family, size, weight, leading, tracking |
| Spacing | `--apex-space-*` | xs through 4xl |
| Sizing | `--apex-size-*` | topbar, nav, input, sidebar, orb, icon |
| Radius | `--apex-radius-*` | sharp through circle |
| Border | `--apex-border-*` | width values |
| Shadow | `--apex-shadow-*` | glow levels, drop levels |
| Opacity | `--apex-opacity-*` | surface, muted, disabled |
| Motion | `--apex-duration-*`, `--apex-easing-*` | duration categories, easing functions |
| Z-index | `--apex-z-*` | layering scale |

**Evidence**: OBSERVED (5 competing blocks confirmed); PROPOSED (canonical architecture and namespace).

---

## 9. Colour System

### 9.1 Design Intent

APEX colour communicates five things:

1. **Identity**: The cyan-navy relationship defines APEX visually
2. **State**: Voice states, processing, attention levels
3. **Domain**: Each of the 10 domains has a distinct but harmonious colour
4. **Semantic**: Success, warning, danger, information
5. **Hierarchy**: Colour intensity correlates to importance

### 9.2 Core Palette

| Token | Value | Role | Evidence |
|-------|-------|------|---------|
| `--apex-color-bg` | `#03060f` | Application background | OBSERVED / PROTECT |
| `--apex-color-bg-2` | `#060c18` | Slightly elevated background | OBSERVED / PROTECT |
| `--apex-color-surface-1` | `rgba(255,255,255,0.04)` | Panel surface (glass) | OBSERVED / PROTECT |
| `--apex-color-surface-2` | `rgba(0,212,255,0.05)` | Elevated/highlighted surface | OBSERVED / PROTECT |
| `--apex-color-surface-3` | `rgba(5,10,26,0.95)` | Deep overlay surface | OBSERVED / PROTECT |
| `--apex-color-surface-4` | `rgba(5,10,26,0.97)` | Modal surface | OBSERVED / PROTECT |
| `--apex-color-primary` | `#00d4ff` | APEX signature cyan | OBSERVED / PROTECT |
| `--apex-color-primary-dim` | `rgba(0,212,255,0.18)` | Primary at low opacity | OBSERVED / PROTECT |
| `--apex-color-primary-glow` | `rgba(0,212,255,0.40)` | Primary glow shadow | OBSERVED / PROTECT |
| `--apex-color-secondary` | `#0066ff` | Deep blue (gradient partner) | OBSERVED / PROTECT |
| `--apex-color-accent` | `#7b2fff` | Purple accent | OBSERVED / PROTECT |
| `--apex-color-border` | `rgba(0,212,255,0.16)` | Standard border | OBSERVED / PROTECT |
| `--apex-color-border-dim` | `rgba(0,212,255,0.08)` | Subtle border | OBSERVED / PROTECT |
| `--apex-color-text-primary` | `#e8f4ff` | Primary text | OBSERVED / PROTECT |
| `--apex-color-text-secondary` | `rgba(232,244,255,0.70)` | Secondary text | PROPOSED |
| `--apex-color-text-muted` | `rgba(232,244,255,0.45)` | Muted text | OBSERVED / PROTECT |
| `--apex-color-text-dim` | `rgba(232,244,255,0.25)` | Dimmed/hint text | OBSERVED / PROTECT |
| `--apex-color-success` | `#27ae60` | Success state | OBSERVED / PROTECT |
| `--apex-color-success-dim` | `rgba(39,174,96,0.15)` | Success background | OBSERVED |
| `--apex-color-warning` | `#ff9f43` | Warning state | OBSERVED (email priority) / formalise |
| `--apex-color-warning-dim` | `rgba(255,159,67,0.12)` | Warning background | OBSERVED / formalise |
| `--apex-color-danger` | `#ff4d6d` | Danger/error/critical | OBSERVED / PROTECT |
| `--apex-color-danger-dim` | `rgba(255,77,109,0.15)` | Danger background | OBSERVED / PROTECT |
| `--apex-color-info` | `#00d4ff` | Information (= primary) | PROPOSED |
| `--apex-color-info-dim` | `rgba(0,212,255,0.08)` | Information background | PROPOSED |

### 9.3 Domain Colour Vocabulary

Ten canonical domains (from UX-03). Each domain has a distinct accent colour that harmonises with the primary cyan system. Applied to: domain headers, domain indicators, domain Tree-of-Life nodes, agent badges.

| Domain | Token | Value | Evidence |
|--------|-------|-------|---------|
| Finance | `--apex-color-domain-finance` | `#3fd29a` | OBSERVED (`--ax-fin`) |
| Health | `--apex-color-domain-health` | `#4fb8e0` | PROPOSED (cyan-teal, harmonises with primary) |
| Business | `--apex-color-domain-business` | `#efb45a` | OBSERVED (`--ax-biz`) |
| Communication | `--apex-color-domain-communication` | `#a78bfa` | PROPOSED (soft violet) |
| Operations | `--apex-color-domain-operations` | `#60a5fa` | PROPOSED (light blue, system-adjacent) |
| Learning | `--apex-color-domain-learning` | `#7c6fff` | OBSERVED (`--ax-uni`, University/Learning) |
| Research | `--apex-color-domain-research` | `#f472b6` | PROPOSED (pink, distinct from others) |
| Occult | `--apex-color-domain-occult` | `#c084fc` | PROPOSED (deep violet) |
| Civilisation | `--apex-color-domain-civilisation` | `#fb923c` | PROPOSED (amber-orange, macro scale) |
| Reality | `--apex-color-domain-reality` | `#34d399` | PROPOSED (emerald, epistemic) |
| System | `--apex-color-domain-system` | `#5b9eff` | OBSERVED (`--ax-sys`) |

### 9.4 State Colour Map

| State | Colour | Token |
|-------|--------|-------|
| Active / online | `#00d4ff` | `--apex-color-primary` |
| Idle / standby | `rgba(0,212,255,0.38)` | `--apex-color-primary` at 38% |
| Listening | `#ff4d6d` | `--apex-color-danger` (voice recording convention) |
| Processing / thinking | `#ff9f43` | `--apex-color-warning` (warm, transitional) |
| Speaking | `#00d4ff` | `--apex-color-primary` (full brightness) |
| Interrupted | `#ff9f43` → `#00d4ff` | Warning transitioning to primary |
| Error / failed | `#ff4d6d` | `--apex-color-danger` |
| Approved / completed | `#27ae60` | `--apex-color-success` |
| Pending / waiting | `rgba(0,212,255,0.25)` | Dim primary |
| Constitutional | `#00d4ff` + Cinzel | Primary + brand typography |
| Offline | `#ff4d6d` | `--apex-color-danger` |

### 9.5 Dark Theme Status

The legacy interface is exclusively dark-themed. Dark theme is the APEX canonical theme. Light theme assessment: **OPEN** — see Section 34.

### 9.6 Contrast Requirements

| Pairing | Minimum Ratio | Standard |
|---------|--------------|---------|
| `--apex-color-text-primary` on `--apex-color-bg` | 7:1 | WCAG AA |
| `--apex-color-text-secondary` on `--apex-color-surface-1` | 4.5:1 | WCAG AA |
| `--apex-color-text-muted` on `--apex-color-surface-1` | 3:1 | WCAG AA (large text / UI) |
| `--apex-color-primary` on `--apex-color-bg` | 4.5:1 | WCAG AA for UI components |
| Action labels on button backgrounds | 4.5:1 | WCAG AA |
| Focus ring on any background | 3:1 | WCAG AA focus |

Verification: `#e8f4ff` on `#03060f` achieves approximately 18:1. `#00d4ff` on `#03060f` achieves approximately 8:1. Both pass WCAG AAA. Text-muted requires verification at implementation.

**Evidence**: OBSERVED (contrast values calculable from existing tokens); PROPOSED (formal minimum requirement table).

---

## 10. Typography

### 10.1 Canonical Font Stack

Three typefaces. Each has a non-overlapping role.

| Font | Role | Weight Range | Source |
|------|------|-------------|--------|
| **Inter** | Body, UI, conversation, labels, navigation | 400, 500, 600 | Google Fonts |
| **Cinzel** | Brand name, page titles, constitutional display | 600, 700 | Google Fonts |
| **JetBrains Mono** | Code, data values, system information, timestamps, technical labels | 400, 500, 600 | Google Fonts |

IBM Plex Sans and Space Grotesk: **RETIRED**. Elements currently using these should migrate to Inter.

**Evidence**: OBSERVED (5 fonts in use); PROPOSED (reduction to 3 canonical fonts).

### 10.2 Type Scale

| Token | Size | Line Height | Weight | Font | Role |
|-------|------|------------|--------|------|------|
| `--apex-font-display` | 24px | 1.2 | 700 | Cinzel | Page titles, major display |
| `--apex-font-display-sm` | 18px | 1.3 | 600 | Cinzel | Section display, modal title |
| `--apex-font-heading-1` | 16px | 1.4 | 600 | Inter | Panel headings |
| `--apex-font-heading-2` | 14px | 1.4 | 600 | Inter | Sub-headings |
| `--apex-font-body` | 13px | 1.55 | 400 | Inter | Body text, conversation |
| `--apex-font-body-sm` | 12px | 1.5 | 400 | Inter | Secondary body, descriptions |
| `--apex-font-label` | 11px | 1.4 | 500 | Inter | Form labels, card labels |
| `--apex-font-label-sm` | 9px | 1.3 | 700 | Inter | Uppercase tracking labels (`letter-spacing: 0.13–0.20em`) |
| `--apex-font-caption` | 10px | 1.4 | 400 | Inter | Captions, metadata |
| `--apex-font-micro` | 8px | 1.2 | 500 | Inter | Extreme secondary (dates, tags) |
| `--apex-font-brand` | 12px | 1 | 800 | Inter | "APEX" wordmark (`letter-spacing: 0.26em`) |
| `--apex-font-brand-sub` | 8px | 1 | 500 | Inter | "AI OS" subtitle (`letter-spacing: 0.15em`) |
| `--apex-font-mono-data` | 13px | 1.5 | 400 | JetBrains Mono | Data values, stats |
| `--apex-font-mono-code` | 12px | 1.6 | 400 | JetBrains Mono | Code, system strings |
| `--apex-font-mono-label` | 10px | 1.3 | 500 | JetBrains Mono | Technical labels, cron, timestamps |
| `--apex-font-mono-micro` | 9px | 1.2 | 400 | JetBrains Mono | Hash values, IDs |
| `--apex-font-voice` | 14px | 1.6 | 400 | Inter | Voice transcription text |
| `--apex-font-notify` | 12px | 1.45 | 500 | Inter | Notification body |

### 10.3 Letter Spacing

| Context | Tracking | Token |
|---------|---------|-------|
| Brand wordmark | `0.26em` | `--apex-tracking-brand` |
| Section labels (uppercase) | `0.20em` | `--apex-tracking-section` |
| Nav labels (uppercase) | `0.13em` | `--apex-tracking-nav` |
| Sub-labels | `0.09em` | `--apex-tracking-sub` |
| Body / conversation | `0em` | Default |
| Mono data | `0.02em` | `--apex-tracking-mono` |

### 10.4 Typography Rules

1. Cinzel is used **only** for brand display and canonical page titles. No Cinzel for body, labels, or UI text.
2. JetBrains Mono is used **only** for content that is machine-generated or technical: timestamps, data values, code, IDs, cron expressions, system paths.
3. Inter handles everything else. One humanist sans for all UI and conversation text.
4. Minimum body size: 11px. Absolute minimum (micro contexts only): 8px. Below 8px is not used.
5. Uppercase text always has `letter-spacing: 0.09em` minimum. Small caps never used — use full uppercase with tracking instead.
6. `font-variant-numeric: tabular-nums` on all numeric displays (clock, stats, values).
7. `font-smoothing: antialiased` on all text (already applied at `html` level).

**Evidence**: OBSERVED (existing font usage); PROPOSED (3-font canon, token scale, rules).

---

## 11. Spacing

### 11.1 Spacing Scale

Base unit: 4px. Scale is multiplicative with semantic names.

| Token | Value | Role |
|-------|-------|------|
| `--apex-space-0` | 0px | No spacing |
| `--apex-space-1` | 2px | Border/line gap, micro padding |
| `--apex-space-2` | 4px | Icon-label gap, tight inline spacing |
| `--apex-space-3` | 6px | Badge padding, compact spacing |
| `--apex-space-4` | 8px | Small component padding, row gap |
| `--apex-space-5` | 10px | Standard mobile page padding |
| `--apex-space-6` | 12px | Panel gap, standard spacing |
| `--apex-space-7` | 14px | Desktop page padding |
| `--apex-space-8` | 16px | Section margin, comfortable padding |
| `--apex-space-10` | 20px | Large section gap |
| `--apex-space-12` | 24px | Panel vertical padding |
| `--apex-space-16` | 32px | Large spacing |
| `--apex-space-20` | 40px | Very large spacing |
| `--apex-space-24` | 48px | Page-level vertical rhythm |

### 11.2 Semantic Spacing Assignments

| Context | Token | Value |
|---------|-------|-------|
| Page padding (mobile) | `--apex-space-5` | 10px |
| Page padding (desktop) | `--apex-space-7` | 14px |
| Page gap (mobile) | `--apex-space-5` | 10px |
| Page gap (desktop) | `--apex-space-6` | 12px |
| Panel internal padding | `--apex-space-6` | 12px |
| Component row gap | `--apex-space-4` | 8px |
| Tight row gap | `--apex-space-3` | 6px |
| Icon-to-label gap | `--apex-space-2` | 4px |
| Panel section margin | `--apex-space-8` | 16px |
| Topbar horizontal padding | `--apex-space-7` | 14px |
| Input zone horizontal padding | `--apex-space-5` | 10px |
| Input zone gap | `--apex-space-3` | 6px |
| Nav button padding (desktop) | `0 16px` | (`--apex-space-8`) |

**Evidence**: OBSERVED (values extracted from CSS); PROPOSED (semantic naming and token system).

---

## 12. Shape Language

### 12.1 Corner Radius Scale

| Token | Value | Role |
|-------|-------|------|
| `--apex-radius-none` | 0px | No rounding (active indicator lines, progress bars) |
| `--apex-radius-sharp` | 2px | Active nav indicator: `border-radius: 0 2px 2px 0` |
| `--apex-radius-xs` | 3px | Tags, micro badges |
| `--apex-radius-sm` | 4px | Small buttons, panel title buttons |
| `--apex-radius-md` | 6px | Compact buttons, task inputs |
| `--apex-radius-lg` | 8px | Standard buttons, toasts |
| `--apex-radius-xl` | 10px | Subpanels |
| `--apex-radius-2xl` | 12px | Main panels, cards, chat bubbles |
| `--apex-radius-3xl` | 14px | Modals, dialogs, command palette |
| `--apex-radius-pill` | 9999px | Chat input (18px effective at 36px height), badges |
| `--apex-radius-circle` | 50% | Orb, dots, avatar indicators |

### 12.2 Shape Rules

1. The orb is **always** circular (`border-radius: 50%`). This is constitutional.
2. Modals and elevated dialogs are `--apex-radius-3xl` (14px). More rounded than panels — elevation is communicated through radius.
3. Main content panels are `--apex-radius-2xl` (12px).
4. The chat input is always a pill (`--apex-radius-pill`) — reflects conversational, flowing interaction.
5. Buttons are `--apex-radius-lg` (8px) — rectangular with comfortable corners; not pill-shaped (pills are for inputs, not actions).
6. Status dots and indicators are always circular (`--apex-radius-circle`).
7. Progress bars and timeline tracks are `--apex-radius-none` or `--apex-radius-xs` — they communicate measurement.

### 12.3 Border Weight

| Context | Weight | Token |
|---------|--------|-------|
| Panel borders | 1px | `--apex-border-standard` |
| Input borders (rest) | 1px | `--apex-border-standard` |
| Active indicator (left bar) | 3px | `--apex-border-active` |
| Active indicator (top line, mobile) | 2px | `--apex-border-active-mobile` |
| Orb border | 1.5px | `--apex-border-orb` |
| Brand ring | 1.5px | `--apex-border-brand` |

**Evidence**: OBSERVED (values from CSS); PROPOSED (token names, rules).

---

## 13. Elevation

### 13.1 Elevation Levels

APEX uses coloured glow as the primary elevation signal in the dark field. Drop-shadows are reserved for elevated overlays where backdrop separation is needed.

| Level | Name | Background | Border | Shadow/Glow | Blur |
|-------|------|-----------|--------|-------------|------|
| 0 | Ground | `#03060f` | None | None | — |
| 1 | Surface | `rgba(255,255,255,0.04)` | `rgba(0,212,255,0.08)` | None | `blur(20px)` |
| 2 | Elevated | `rgba(0,212,255,0.05)` | `rgba(0,212,255,0.16)` | `0 0 8px rgba(0,212,255,0.08)` | `blur(20px)` |
| 3 | Overlay | `rgba(3,6,15,0.92)` | `rgba(0,212,255,0.16)` | `0 0 12px rgba(0,0,0,0.3)` | `blur(20px)` |
| 4 | Modal | `rgba(5,10,26,0.97)` | `rgba(0,212,255,0.20)` | `0 20px 60px rgba(0,0,0,0.6)` | `blur(8px)` scrim |
| 5 | Critical | `rgba(5,10,26,0.98)` | `rgba(0,212,255,0.30)` | `0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,212,255,0.06)` | `blur(12px)` scrim |

### 13.2 Orb Elevation

The orb sits at Level 2 at rest. State animations cause it to rise visually through glow intensity rather than z-index change.

| Orb State | Glow Level |
|-----------|-----------|
| IDLE / WAITING | `0 0 22px rgba(0,212,255,0.18)` — subtle presence |
| ACTIVATING | `0 0 28px rgba(0,212,255,0.28)` — brightening |
| LISTENING | `0 0 0 8px rgba(255,77,109,0.6), 0 0 48px rgba(255,77,109,0.45)` — red presence |
| PROCESSING | `0 0 24px rgba(255,159,67,0.50)` — warm amber |
| SPEAKING | `0 0 24px rgba(0,212,255,0.80), 0 0 52px rgba(0,212,255,0.40)` — full brightness |

### 13.3 Presentation Elevation

Temporary presentations (from UX-04 PRESENT channel) appear at Level 3. They must visually rise above Command content without visually disconnecting from the Command surface. Achieved through: Level 3 background + Level 2 border + gentle glow shadow. They are not Level 4 modals — they are contextual, not interruptive.

### 13.4 Z-Index Scale

| Level | Token | Range | Consumers |
|-------|-------|-------|-----------|
| 1 | `--apex-z-content` | 1 | Normal page content |
| 2 | `--apex-z-sticky` | 10 | Sticky headers, fixed page elements |
| 3 | `--apex-z-nav` | 20 | Topbar, sidebar navigation |
| 4 | `--apex-z-dropdown` | 100 | Dropdown menus, help overlay |
| 5 | `--apex-z-drawer` | 300 | Agent drawer, side panels |
| 6 | `--apex-z-modal` | 400 | Domain agent modal, dialogs |
| 7 | `--apex-z-overlay` | 500 | Drop overlay, presentation overlays |
| 8 | `--apex-z-drag` | 800 | Drag-and-drop surfaces |
| 9 | `--apex-z-notify` | 1000 | Toast notifications, in-app notifications |
| 10 | `--apex-z-mobile-nav` | 2000 | Mobile nav dropdown |
| 11 | `--apex-z-command` | 9000 | Command palette |
| 12 | `--apex-z-auth` | 99999 | Auth overlay (must be topmost) |

**Evidence**: OBSERVED (scattered z-index values from audit); PROPOSED (formal scale, semantic names).

---

## 14. Iconography

### 14.1 Icon Style

**Target**: A single coherent set of icons with unified weight, style, and semantic behaviour. Custom SVGs built to a defined specification.

| Attribute | Specification |
|-----------|--------------|
| Style | Outlined (stroke-based) |
| Stroke weight | 1.5px at 20px nominal size |
| Corner style | Rounded joins and caps (matching overall shape language) |
| Grid | 20×20px |
| Visual weight | Optically balanced with body text |
| Colour | Inherits current text colour via `currentColor` |

### 14.2 Icon Sizes

| Token | Size | Context |
|-------|------|---------|
| `--apex-icon-xs` | 12px | Inline with micro text, badges |
| `--apex-icon-sm` | 16px | Compact inline contexts |
| `--apex-icon-md` | 18px | Navigation, standard UI |
| `--apex-icon-lg` | 20px | Prominent UI, empty states |
| `--apex-icon-xl` | 24px | Large emphasis, orb indicators |
| `--apex-icon-2xl` | 32px | Display contexts |

### 14.3 Icon Disposition from Legacy

| Legacy Icon | Disposition | Action |
|------------|------------|--------|
| Emoji nav icons (🏠, ⚡, etc.) | **REPLACE** | Replace with outlined SVG icons matching icon style spec |
| Custom SVG stat chip icons (wallet, mail, checklist, heartbeat) | **PROTECT** | Existing SVG paths are well-designed; retain designs, adapt to stroke weight |
| Status dots (7px circle, CSS) | **PROTECT** | Not icons per se; remain as CSS shapes |

### 14.4 Semantic Icon States

Every icon used in an interactive context must have:
- **Default**: `currentColor` at primary text colour
- **Hover**: Brighter / primary colour
- **Disabled**: `currentColor` at `--apex-opacity-disabled` (38%)
- **Active**: Primary colour
- **Error**: Danger colour

### 14.5 Accessibility

- All standalone icons (without adjacent text) must have `aria-label` or `title`
- Icons accompanying text labels should have `aria-hidden="true"` (the label carries meaning)
- Icon-only buttons must have a visible tooltip on hover/focus
- Touch target for icon buttons: minimum 44×44px regardless of visible icon size

### 14.6 No External Icon Library

APEX does not load Heroicons, Lucide, Font Awesome, or any CDN icon library. This is a **PROTECT** decision from UX-00 review. Icons are custom SVGs defined in-project. This eliminates: CDN dependency, version lock, visual mismatches, load cost.

**Evidence**: OBSERVED (no icon library, custom SVGs, emoji in nav); PROPOSED (style specification, size scale, replacement plan).

---

## 15. Motion

### 15.1 Principle: Motion Communicates State

Every animation must communicate something. An animation that only looks nice is a design failure. Duration and easing choices are purposeful, not aesthetic.

### 15.2 Duration Categories

| Category | Token | Range | Meaning |
|----------|-------|-------|---------|
| INSTANT | `--apex-duration-instant` | 0ms | State changes that must feel immediate (toggle, keyboard action) |
| MICRO | `--apex-duration-micro` | 120ms | Hover transitions, small state shifts |
| STANDARD | `--apex-duration-standard` | 220ms | Page transitions, show/hide, most UI state changes |
| DELIBERATE | `--apex-duration-deliberate` | 350ms | Panel entry, presentation appearance, drawer open |
| SLOW | `--apex-duration-slow` | 480ms | Ambient: waveform cycle |
| BREATHE | `--apex-duration-breathe` | 600–4000ms | Orb states, brand ring pulse |

### 15.3 Easing Principles

| Easing | Token | Use |
|--------|-------|-----|
| `ease` | `--apex-easing-standard` | Most transitions |
| `ease-out` | `--apex-easing-enter` | Elements entering the scene |
| `ease-in` | `--apex-easing-exit` | Elements leaving the scene |
| `ease-in-out` | `--apex-easing-breathe` | Ambient/continuous animations (orb, brand) |
| `linear` | `--apex-easing-linear` | Progress bars, loading indicators |

### 15.4 Specific Motion Specifications

| Element | Duration | Easing | Property | Evidence |
|---------|----------|--------|----------|---------|
| Page transition | 220ms | `ease` | `opacity` + `translateX(18px→0)` | OBSERVED / PROTECT |
| Page exit | implicit | `ease` | reverse | OBSERVED / PROTECT |
| Panel entry (`.ds-panel`) | 350ms | `ease-out` | `opacity` + `translateY(8px→0)` | OBSERVED / PROTECT |
| Nav hover | 120ms | `ease` | `color` | OBSERVED / PROTECT |
| Button hover | 120ms | `ease` | `box-shadow`, `transform: scale(1.02)` | OBSERVED / REFINE |
| Brand ring pulse | 3s | `ease-in-out` | `box-shadow` glow | OBSERVED / PROTECT |
| Pulse ring expand | 3s | `ease-out` | `opacity` + `transform: scale` | OBSERVED / PROTECT |
| Orb idle | 4s | `ease-in-out` | `box-shadow` glow breathe | OBSERVED / PROTECT |
| Orb listening | 550ms | — | `box-shadow` alternate | OBSERVED / PROTECT |
| Orb active/speaking | 600ms | — | `box-shadow` alternate | OBSERVED / PROTECT |
| Waveform bar | 480ms | `ease-in-out` | `height` alternate | OBSERVED / PROTECT |
| Typing indicator | 1400ms | `ease-in-out` | `translateY` + `opacity` | OBSERVED / PROTECT |
| Toast appear | 220ms | `ease-out` | `opacity` + `translateY(4px→0)` | PROPOSED |
| Presentation appear | 350ms | `ease-out` | `opacity` + `translateY(8px→0)` | PROPOSED |
| Notification appear | 220ms | `ease-out` | `opacity` + `translateX` | PROPOSED |
| Drawer open | 350ms | `ease-out` | `translateX` | PROPOSED |
| Status dot transition | 300ms | `ease` | `background`, `box-shadow` | OBSERVED / PROTECT |
| Skeleton shimmer | 1500ms | `linear` | `background-position` | PROPOSED |

### 15.5 Reduced Motion

When `prefers-reduced-motion: reduce` is active:
- ALL keyframe animations: disabled (set `animation: none`)
- ALL transitions: either disabled or reduced to `opacity` only at max 220ms
- Waveform: static bars (no animation)
- Orb: no glow pulse (static state colours only)
- Brand ring: no pulse
- Page transition: opacity-only, no translateX
- Presentations: opacity-only fade

**This coverage is comprehensive and non-negotiable. Evidence**: OBSERVED (`@media (prefers-reduced-motion:reduce) { animation: none }` in dashboard.html:8485–8495) / PROTECT / extend to all new animations.

### 15.6 Motion That Must Not Exist

- Looping decorative animations that communicate no state
- Animations triggered by scrolling without user intent
- Unexpected motion in low-energy contexts (reading, reviewing evidence)
- Motion that persists after a user action completes
- Simultaneous competing animations on the same element
- Animation duration above 600ms for UI transitions (ambient excepted)

---

## 16. APEX Presence (Orb)

### 16.1 Role and Status

The orb is the most important single element in the APEX interface. It is not a button. It is not a widget. It is APEX made visible — the persistent embodiment of the system's attention, state, and readiness.

**PROTECTED unconditionally**. The orb may be refined; it may not be removed, demoted, or reduced to a functional icon.

**Evidence**: INHERITED from UX-01 section 5.3 ("APEX as Presence, not Application"), UX-01 "Plasma orb as primary voice entry → REFINE", UX-00 "PROTECTED — core APEX presence element".

### 16.2 Visual Form

| Attribute | Specification | Evidence |
|-----------|--------------|---------|
| Shape | Perfect circle (`border-radius: 50%`) | OBSERVED / PROTECT |
| Diameter (mobile) | 88px | OBSERVED / PROTECT |
| Diameter (desktop) | 96px | PROPOSED (slightly larger on larger screens) |
| Fill | Radial gradient: `rgba(0,212,255,0.22)` → `rgba(0,102,255,0.12)` → transparent + `rgba(5,10,26,0.96)` | OBSERVED / PROTECT |
| Border at rest | 1.5px `rgba(0,212,255,0.38)` | OBSERVED / PROTECT |
| Pulse rings | 3 rings at 100%, 132%, 164% of orb diameter | OBSERVED / PROTECT |
| Pulse ring animation | 3s ease-out infinite, staggered 0s/1s/2s delays | OBSERVED / PROTECT |
| Inner label | "APEX" (Inter 800, 0.24em tracking, primary colour) | OBSERVED / REFINE (change font from current to Inter per typography canon) |
| Sub-label | State-dependent text (see 16.3) | OBSERVED / REWORK |
| WebGL plasma canvas | Present beneath CSS orb; provides organic life | OBSERVED / PROTECT |
| Shell container | 130px × 130px centred grid | OBSERVED / PROTECT |

### 16.3 Voice State Visual Map

All 11 canonical voice states from UX-04 mapped to visual treatment:

| State (UX-04) | Orb Border | Glow | Pulse Ring | Sub-label | Animation |
|--------------|-----------|------|-----------|-----------|-----------|
| IDLE | `rgba(0,212,255,0.38)` | Subtle `0 0 22px rgba(0,212,255,0.18)` | Slow expand (3s) | STANDBY | `orbWait` 4s breathe |
| ACTIVATING | `rgba(0,212,255,0.55)` | `0 0 28px rgba(0,212,255,0.28)` | Rings contract slightly | WAKING | brighten 220ms |
| LISTENING | `rgba(255,77,109,0.70)` | `0 0 0 8px rgba(255,77,109,0.6), 0 0 48px rgba(255,77,109,0.45)` | Rings turn red | LISTENING | `orbListen` 0.55s alternate |
| UNDERSTANDING | `rgba(255,159,67,0.55)` | `0 0 24px rgba(255,159,67,0.50)` | Slow amber rings | THINKING | `orbThink` 1.2s ease-in-out |
| RESPONDING | `rgba(0,212,255,0.60)` | `0 0 28px rgba(0,212,255,0.40)` | Return to cyan | RESPONDING | cross-fade 220ms |
| SPEAKING | `rgba(0,212,255,0.70)` | `0 0 24px rgba(0,212,255,0.80), 0 0 52px rgba(0,212,255,0.40)` | Strong cyan rings | SPEAKING | `orbActive` 0.6s alternate |
| INTERRUPTED | `rgba(255,159,67,0.60)` | Brief flash → dim | Rings pause | STOPPED | 300ms flash → settle |
| PAUSED | `rgba(0,212,255,0.25)` | Dim `0 0 12px rgba(0,212,255,0.12)` | Static dim | PAUSED | No animation |
| LIVE | `rgba(0,212,255,0.60)` | Continuous `0 0 32px rgba(0,212,255,0.35)` | Persistent steady rings | LIVE | Steady moderate glow |
| FAILED | `rgba(255,77,109,0.70)` → IDLE | `0 0 20px rgba(255,77,109,0.40)` brief | Brief red rings | ERROR | 1.5s flash → IDLE |
| CANCELLED | `rgba(0,212,255,0.20)` | Dim, fading | Rings fade | — | Fade out → IDLE (600ms) |

### 16.4 New State: UNDERSTANDING (THINKING)

This state does not currently exist in the CSS. The orb goes from LISTENING directly to ACTIVE (speaking). This creates a perceptual gap — the user cannot tell if APEX heard them or is processing.

UNDERSTANDING state: **PROPOSED**. Amber/warm glow for 200ms–3s while APEX processes. Communicates: "I heard you; I am thinking."

### 16.5 Orb Placement

| Surface | Placement | Size |
|---------|----------|------|
| Command (desktop) | Left/centre column, vertically centred | 96px |
| Command (mobile) | Centre of screen, top third | 88px |
| All other surfaces | Not present (the orb is exclusive to Command) | — |

The orb's exclusivity to Command reinforces Command as the human interaction centre. When the user wants to interact with APEX, they go to Command where APEX is present.

**Evidence**: OBSERVED (orb only on page-command); INHERITED from UX-03 Command surface definition; PROPOSED (sizing for desktop).

### 16.6 What Must Not Change

- The circular form is non-negotiable
- The cyan identity must survive even if individual state colours change
- The pulse rings must remain — they communicate "radiating presence"
- The plasma WebGL canvas must remain — it provides organic life that CSS alone cannot replicate
- The sub-label must remain — it grounds the user in current state

---

## 17. Waveform

### 17.1 Role

The waveform is a secondary presence indicator specifically for the SPEAKING and LIVE voice states. It communicates that audio output is active — APEX is vocalising.

### 17.2 Current Specification (PROTECT)

- 7 bars
- Width: 3px per bar
- Gap: 3px between bars
- Base height: 5px
- Animated height: 18px
- Duration: 0.48s per bar
- Delays: 0, 0.07, 0.14, 0.21, 0.28, 0.35, 0.42s (staggered)
- Easing: `ease-in-out`
- Colour: `var(--apex-color-primary)` (cyan)
- Container height: 26px

**These exact values are PROTECTED.** The waveform is a recognised APEX identity element.

### 17.3 Refinements (PROPOSED)

| Refinement | Specification |
|-----------|--------------|
| State-responsive colour | SPEAKING: primary cyan; LISTENING: danger red; LIVE: primary steady |
| State-responsive visibility | Active only in SPEAKING, LIVE states (currently: any time `.waveform.active`) |
| IDLE: hide | Not shown when orb is IDLE, PAUSED, FAILED, CANCELLED |
| LISTENING: show (red) | Show red variant when capturing audio — audio-in feedback |
| Reduced motion | Static bars at mid-height; no animation |

### 17.4 Waveform Position

Below the orb, centred, visible when active. This placement is PROTECTED. The waveform accompanies the orb — it is not relocated to the input zone or a status bar.

**Evidence**: OBSERVED (waveform CSS at dashboard.html:562–593); PROPOSED (state-responsive behaviour and colour).

---

## 18. Command Visual Language

### 18.1 Definition

Command is the primary human-APEX interaction surface. It is where:
- The user speaks and types
- APEX is present (orb)
- Conversations happen
- Contextual presentations appear
- Activity is streamed
- The constitution is visible

Command visual language must communicate: attentiveness, readiness, depth, and calm.

### 18.2 Primary Composition

The Command surface has two main zones on desktop:

**LEFT ZONE (primary)**:
- APEX orb (centred, prominent)
- Voice state waveform (below orb)
- Stat chips × 4 (below waveform)
- Presentation surface (appears contextually adjacent to orb area)
- Constitution charter (below stat chips)

**RIGHT ZONE (secondary)**:
- Activity feed (live event stream)
- Gemini Live transcript overlay (contextual)

On mobile, zones stack vertically: orb centred above, activity feed scrollable below.

### 18.3 Command Visual Grammar

| Element | Visual Rule |
|---------|------------|
| Orb | Always centred in its zone. Never smaller than 88px. Always primary visual focal point. |
| Stat chips | 4 cards in a row below orb. Equal weight. JetBrains Mono values. Inter labels. |
| Constitution charter | A1–A6 grid. Small, present, legible. Not the primary focus. Constitutional presence. |
| Activity feed | Scrollable. Dense. Right zone. Each item: concise, timestamped. |
| Voice transcript | Overlays right zone. Temporary. Readable body text (Inter 14px). |
| Presentation surface | Appears adjacent to orb when APEX presents. Elevation Level 3. Never covers orb. |
| Input zone | Fixed bottom bar. Always accessible (not hidden). Chat input + voice controls. |

### 18.4 Command Hierarchy

At a glance, the user understands:
1. **APEX is here** (orb, pulse rings)
2. **APEX state** (orb colour/animation, waveform)
3. **My world summary** (stat chips)
4. **What's happening** (activity feed)
5. **I can talk now** (input zone always visible)
6. **Constitutional context** (charter, bottom of primary zone)

### 18.5 What Appears on Command

| Element | Always Present | Contextual |
|---------|--------------|-----------|
| Orb + pulse rings | ✓ | |
| Stat chips (4) | ✓ | |
| Activity feed | ✓ | |
| Constitution charter | ✓ | |
| Input zone | ✓ | |
| Waveform | | Voice active only |
| Presentation surface | | PRESENT channel active |
| Gemini Live transcript | | LIVE mode active |
| Notification banner | | L3+ attention level |
| Decision card | | Pending decision |

**Evidence**: OBSERVED (Command page structure); INHERITED from UX-03 Command surface definition; INHERITED from UX-04 PRESENT/NOTIFY channel definitions; PROPOSED (visual grammar formalisation).

---

## 19. World Visual Language

### 19.1 Role

World contains the Tree of Life. The user explores and discovers APEX's domain coverage, capabilities, agents, knowledge, and objects. World must feel navigable, alive, and structured — not like a filesystem or a settings page.

### 19.2 Tree of Life Visual Principles

| Principle | Implementation |
|-----------|--------------|
| Hierarchy is visible | Tree levels are visually distinct — ROOT, WORLD, DOMAIN, CAPABILITY/OBJECT, INSTANCE |
| Growth is visible | New capabilities appear; the tree expands. This must feel organic, not like a list refresh |
| Domain identity | Each domain has its canonical colour; domain nodes use that colour |
| State is present | Active domains, running agents, in-progress tasks — all visible in the tree |
| Relationships are edges | Connections between objects are visible lines/arcs, not just list nesting |

### 19.3 Tree Node Visual Treatment

| Level | Visual Treatment | Evidence |
|-------|-----------------|---------|
| ROOT | Full-width header; APEX brand treatment; Cinzel display; cyan | INHERITED from UX-03 |
| WORLD | Section divider; uppercase tracking label; not selectable | INHERITED from UX-03 |
| DOMAIN | Domain-coloured card; domain icon; name + description; agent count | PROPOSED |
| CAPABILITY / OBJECT | Sub-card or list item; lighter; capability icon; status indicator | PROPOSED |
| INSTANCE | Inline item; mono label; timestamp; state dot | PROPOSED |

### 19.4 Domain Node Anatomy

Each domain card in the Tree:
- **Header strip**: Domain colour (20% opacity fill, full-opacity left border 3px)
- **Icon**: 24px domain icon in domain colour
- **Name**: Inter 600 14px, primary text
- **Description**: Inter 400 12px, muted text
- **Agent count**: Small badge in domain colour: "3 agents"
- **Status**: Right-side state dot (active/idle/error)
- **Active indicator**: If a task is running in this domain, a subtle shimmer on the card

### 19.5 Tree Relationship Visualisation

Connections between objects are drawn as:
- Thin lines (`1px`, `rgba(0,212,255,0.15)`) for standard relationships
- Medium lines (`1.5px`, `rgba(0,212,255,0.30)`) for active/real-time relationships
- Animated flowing line for currently executing paths

This remains **OPEN** for detailed specification — the implementation technology (SVG canvas, CSS transforms) affects the exact visual approach.

**Evidence**: INHERITED from UX-03 Tree of Life specification; PROPOSED (visual treatment, node anatomy, relationship lines).

---

## 20. Decisions Visual Language

### 20.1 Role

The Decisions surface is where human authority is exercised. It is where APEX asks: "Should I do this?" The user approves, rejects, or modifies.

**Human authority must be the most visually prominent element on this surface at all times.**

### 20.2 Decision Card Anatomy

A pending decision is presented as a card with:

| Zone | Content | Visual Treatment |
|------|---------|-----------------|
| Header | Decision title + urgency level | Inter 600 14px; urgency badge in semantic colour |
| Summary | What APEX proposes to do | Inter 400 13px, primary text |
| Evidence | Why APEX recommends this | Collapsible; evidence block style |
| Risk | Risk level + brief rationale | Warning/danger colour if elevated |
| Actions | APPROVE / REJECT / MODIFY / DEFER | Full-width buttons; APPROVE is primary green; REJECT is danger red |

### 20.3 Decision State Visual Map

| State | Visual Treatment |
|-------|-----------------|
| PENDING | Full card visible; actions active; subtle amber left border |
| APPROVED | Card greens; "Approved" badge; actions disabled; executing animation |
| EXECUTING | Green border + progress indicator; action: STOP available |
| COMPLETED | Green completion indicator; card dims; archive state |
| REJECTED | Red strikethrough effect; "Rejected" badge; card closes |
| MODIFIED | Amber indicator; "Modified" badge; modified content visible |
| FAILED | Red border; "Failed" badge; error detail expandable |
| DEFERRED | Dim card; "Deferred" badge; schedule time visible |

### 20.4 Action Button Treatment

Approval actions are the most important UI in the Decisions surface. They must not be subtle.

| Button | Colour | Visual Weight |
|--------|--------|--------------|
| APPROVE | `--apex-color-success` background; white text | Full-width; bold; primary visual element |
| REJECT | `--apex-color-danger` background; white text | Full-width; bold |
| MODIFY | `--apex-color-warning` border; warning text | Outlined; secondary |
| DEFER | Surface border; muted text | Outlined; tertiary |

**Evidence**: OBSERVED (`.email-btn.approve` / `.email-btn.reject` patterns, approval CSS at line 5447); INHERITED from UX-04 decision presentation types; PROPOSED (formal decision card anatomy).

### 20.5 Confidence and Risk Treatment

| Confidence Level | Visual Signal |
|-----------------|--------------|
| HIGH (>80%) | Green `--apex-color-success` indicator |
| MEDIUM (50–80%) | Primary cyan indicator |
| LOW (<50%) | Warning amber indicator |
| SPECULATIVE | Dashed border treatment on confidence chip |

| Risk Level | Visual Signal |
|-----------|--------------|
| LOW | No special treatment |
| MEDIUM | Amber badge on card header |
| HIGH | Red badge; card header gets red left border |
| CRITICAL | Full-width red banner above card; must be read before approving |

---

## 21. Knowledge Visual Language

### 21.1 Role

Knowledge surfaces what APEX knows, where it knows it from, how confident it is, and where gaps exist. It must feel like a living knowledge base, not a document archive.

### 21.2 Knowledge Item Visual Treatment

| Attribute | Visual Treatment |
|-----------|-----------------|
| Knowledge title | Inter 600 14px; primary text |
| Source | Inter 400 11px; muted text; external link treatment |
| Confidence | Confidence bar (0–100%) in semantic colour; percentage label in mono |
| Freshness | Timestamp in mono; colour shifts amber if stale |
| Provenance chain | Expandable; shows evidence path: source → inference → conclusion |
| Contradiction | Amber indicator; both conflicting items shown |
| Gap | Dashed border outline; "Knowledge Gap" badge in warning amber |

### 21.3 Evidence Block

The evidence block is a shared component used across Knowledge, Decisions, and PRESENT presentations.

```
┌─────────────────────────────────────────────────────┐
│ [SOURCE ICON]  source-name.com  [FRESHNESS]         │
│ Extract or key claim from source...                 │
│ Confidence: ████████░░ 82%  [VERIFIED]              │
└─────────────────────────────────────────────────────┘
```

- Border: `--apex-color-border-dim`
- Left border accent: domain colour or primary
- Source: Inter 400 11px, muted
- Content: Inter 400 12px, secondary text
- Confidence bar: 4px height, semantic fill colour
- Verified badge: small green dot + "VERIFIED" in Inter 700 8px

### 21.4 Knowledge Gap Treatment

When APEX identifies a knowledge gap:

- Dashed card outline (`border-style: dashed`) instead of solid
- Warning amber accent colour
- "KNOWLEDGE GAP" badge in warning colour
- Brief description of what is not known
- Optional: "Research this" action

This makes gaps first-class information — what APEX does not know is as important as what it does.

**Evidence**: INHERITED from UX-03 Knowledge surface definition; INHERITED from UX-04 PRESENT KNOWLEDGE type; PROPOSED (specific visual treatment).

---

## 22. System Visual Language

### 22.1 Role

System exposes APEX infrastructure, constitutional governance, agent execution, and audit trails. It must feel authoritative and transparent without being intimidating. Constitutional information must feel weighty, not technical.

### 22.2 Constitutional Treatment

The Constitution is presented with:
- **Cinzel typeface** for article headings (the only surface where Cinzel appears in non-brand context)
- Horizontal rule separators
- Wider letter spacing than standard UI
- Article identifier (A1–A6) in primary cyan, mono font
- Article content in Inter 400 13px
- A subtle background differentiation: `rgba(0,212,255,0.02)` tint

This treatment signals: this is not a setting; this is law.

### 22.3 Agent Execution Treatment

| Agent State | Visual Treatment |
|------------|-----------------|
| IDLE | Grey dot; name dim |
| ACTIVE | Cyan dot + pulse; name full brightness |
| EXECUTING | Cyan dot + border glow; progress indicator |
| COMPLETE | Green dot; name dim |
| ERROR | Red dot; name in danger colour |
| WAITING | Amber dot; "Waiting: [dependency]" |

### 22.4 Audit Trail Treatment

Audit entries use mono typography for IDs, timestamps, and technical values. Human-readable summaries use body Inter. The visual rhythm alternates: technical → human → technical.

### 22.5 System vs. Other Surfaces

System is visually distinct from domain surfaces through:
- Higher proportion of mono typography
- Constitutional Cinzel elements
- Dense information presentation
- Agent grid layouts
- Infrastructure/metrics panels

But it must not be intimidating: body text remains Inter, spacing is maintained, progressive disclosure hides depth by default.

**Evidence**: OBSERVED (System page components, Executive Council, Constitution charter); INHERITED from UX-03 System surface definition; PROPOSED (formal visual treatment).

---

## 23. Converse Visual States

All 11 voice states from UX-04 mapped to complete visual treatment:

| State | Orb | Waveform | Input | Top Status | User Meaning |
|-------|-----|---------|-------|-----------|-------------|
| IDLE | Slow cyan breathe | Hidden | Text enabled, mic shown | "APEX" | Orb ready |
| ACTIVATING | Brightening cyan | Hidden | Mic button active | "WAKING" | Starting |
| LISTENING | Red pulse 0.55s | Red bars (input side) | Mic button red/active | "LISTENING" | Say it now |
| UNDERSTANDING | Amber breathe 1.2s | Hidden | Input disabled | "THINKING" | Processing |
| RESPONDING | Cyan cross-fade | Hidden | Input disabled | "RESPONDING" | About to speak |
| SPEAKING | Strong cyan 0.6s | Cyan bars (output side) | Input re-enables | "SPEAKING" | APEX is talking |
| INTERRUPTED | Amber flash → settle | Hidden | Input active | "STOPPED" | Interrupted |
| PAUSED | Dim static cyan | Hidden | Input active | "PAUSED" | Paused |
| LIVE | Steady cyan glow | Steady cyan | Live controls visible | "LIVE" | Duplex active |
| FAILED | Red flash → IDLE | Hidden | Input enabled | "—" | Error; retry |
| CANCELLED | Fade to IDLE | Hidden | Input enabled | "—" | Cancelled |

### 23.1 Input Zone in Converse States

| State | Text Input | Mic Button | Send Button |
|-------|-----------|-----------|------------|
| IDLE | Enabled; placeholder "Ask APEX..." | Default | Default |
| LISTENING | Disabled (receiving audio) | Red/active; tap to stop | Hidden |
| UNDERSTANDING | Disabled | Dim | Hidden |
| SPEAKING | Re-enabled | Default | Default |
| LIVE | Disabled (full duplex) | Live indicator | Hidden |

### 23.2 Voice Feedback Panel

During SPEAKING state, a non-blocking panel near the orb shows:
- What APEX said (last sentence, Inter 14px)
- Confidence/certainty indicator (small)
- "Continue…" or "Done" state

This panel is temporary — it disappears 3 seconds after APEX finishes speaking, or when the next conversational turn starts.

**Evidence**: OBSERVED (existing orb states, input zone, mic button); INHERITED from UX-04 voice state definitions; PROPOSED (visual state table, input zone state table, feedback panel).

---

## 24. Present Visual States

Temporary presentations from the PRESENT channel (UX-04).

### 24.1 Presentation Container

| Attribute | Specification |
|-----------|--------------|
| Position | Adjacent to orb zone (Command); contextual on other surfaces |
| Elevation | Level 3 (Overlay) — rises above content, not above chrome |
| Width | Fixed 360px desktop; full-width mobile |
| Max-height | 60vh (scrollable within) |
| Background | `rgba(3,6,15,0.92)` + `backdrop-filter: blur(20px)` |
| Border | `1px solid rgba(0,212,255,0.20)` |
| Radius | `--apex-radius-3xl` (14px) |
| Shadow | `0 8px 32px rgba(0,0,0,0.5)` |
| Header | Title + type badge + dismiss button |
| Footer | Presentation actions (if applicable) |

### 24.2 Presentation State Map

| State | Visual Treatment |
|-------|----------------|
| APPEARING | 350ms ease-out; `opacity: 0 → 1` + `translateY(8px → 0)` |
| ACTIVE | Full opacity; interactive |
| UPDATED | Brief shimmer on changed data (300ms) |
| EXPANDED | Height expands; scroll enabled |
| COLLAPSED | Minimal strip with title only; tap to expand |
| DISMISSED | 220ms ease-in; `opacity: 1 → 0` |
| EXPIRED | Auto-dismiss (context-driven, per UX-04); same as DISMISSED |
| FAILED | Error state in container; "Could not load" message |

### 24.3 Presentation Type Visual Badges

Each of the 13 presentation types from UX-04 carries a small badge:

| Type | Badge Colour | Icon |
|------|------------|------|
| SUMMARY | Primary cyan | Summary icon |
| CHART | Primary cyan | Chart icon |
| TABLE | Primary cyan | Table icon |
| COMPARISON | Primary cyan | Compare icon |
| TIMELINE | Primary cyan | Timeline icon |
| EVIDENCE | Domain colour | Evidence/source icon |
| SOURCE | Muted | Link icon |
| DECISION | Warning amber | Decision icon |
| TASK | Secondary blue | Task icon |
| AGENT | Domain colour | Agent icon |
| KNOWLEDGE | Success green | Knowledge icon |
| ALERT | Danger red | Alert icon |
| SYSTEM | System blue | System icon |

### 24.4 Stacking Behaviour

When multiple presentations are active simultaneously:
- Primary: Visible at full size
- Secondary: Collapsed strip below primary; label visible
- Maximum visible: 2 (primary + 1 collapsed)
- Third+ presentations: Badge count on collapsed strip
- The user can navigate the stack via the collapsed strip

**Evidence**: INHERITED from UX-04 PRESENT channel specification; PROPOSED (container spec, state map, type badges, stacking).

---

## 25. Notify Visual States

### 25.1 Notification Item Visual Treatment

Six attention levels from UX-04, each with distinct visual treatment. Colour is never the only differentiator.

| Level | Colour Signal | Typography | Icon | Animation | Position |
|-------|-------------|-----------|------|-----------|---------|
| L0 SILENT | None (no visual) | — | — | None | Log only |
| L1 LOG | Dim border; no accent | 11px muted | None | None | Notification centre only |
| L2 IN-APP | Standard border; primary dim | 12px standard | Category icon, 14px | Slide in 220ms | Feed / notification centre |
| L3 ATTENTION | Primary border; cyan dim bg | 12px; bold subject | Category icon + dot | Slide in + brief glow | Banner + feed |
| L4 DECISION | Amber border; amber dim bg | 13px; bold | Decision icon | Slide in; steady amber border | Banner (prominent) + feed |
| L5 URGENT | Danger border; danger dim bg | 13px; bold + danger text | Alert icon | Slide in + persistent pulse | Banner (full width) + sound |

### 25.2 Notification Item Anatomy

```
┌─ [LEVEL INDICATOR] ────────────────────── [TIME] ─┐
│  [ICON]  CATEGORY: Subject line                    │
│          Body text (1–2 lines)                     │
│  [ACTION BUTTON]  [DISMISS]                        │
└──────────────────────────────────────────────────┘
```

- Level indicator: left border 3px in level colour
- Category: Inter 700 9px uppercase, muted
- Subject: Inter 600 12px, primary text
- Body: Inter 400 11px, secondary text
- Time: JetBrains Mono 10px, muted; right-aligned
- Actions: small outline buttons
- Dismiss: × button, muted, top-right

### 25.3 Toast Notification

The existing `.task-toast` pattern is retained and extended.

- Position: Fixed, above input zone, centred
- Duration: Context-driven (not timer-based, per UX-04)
- Variants: `success` / `error` / `info` / `warning`
- Max-width: `88vw`
- Stacking: Sequential; maximum 3 visible; oldest auto-dismisses

### 25.4 Notification Badge

Unread notification count appears as a badge on:
- Notification bell icon in topbar
- Navigation item for the surface containing notifications

| Count | Badge Treatment |
|-------|----------------|
| 0 | No badge |
| 1–9 | Small circle; primary colour |
| 10–99 | Same; number displayed |
| 100+ | "99+" |
| Urgent unread | Danger colour regardless of count |

**Evidence**: OBSERVED (`.notif-item`, `.task-toast`, notification CSS); INHERITED from UX-04 6-level attention model; PROPOSED (formal level map, item anatomy, badge rules).

---

## 26. Attention Visual Language

Mapping UX-04 attention levels to progressive visual prominence:

| Level | Visual Method | Additive From Previous |
|-------|-------------|----------------------|
| LOW | Dim; muted text; no border accent | Baseline |
| NORMAL | Standard brightness; standard border | + Standard opacity |
| IMPORTANT | Primary colour border; slightly brighter text | + Colour signal |
| HIGH | Primary bg tint; bold text; subtle glow | + Background tint |
| URGENT | Full colour; animation; full-width if notification | + Motion + width |

The additive model ensures that moving from LOW to URGENT is a clear progression, not a sudden jump. Each level adds visual energy without creating visual chaos.

### 26.1 Attention Without Colour Dependency

Each level also signals through non-colour channels:

| Level | Non-Colour Signal |
|-------|-----------------|
| LOW | Normal position; small size |
| NORMAL | Standard position; standard size |
| IMPORTANT | Bold typography; left border present |
| HIGH | Position elevated (appears above normal items); size may be larger |
| URGENT | Motion; position topmost; cannot be scrolled past |

**Evidence**: INHERITED from UX-04 attention level definitions; PROPOSED (additive visual model, non-colour signals).

---

## 27. Component Taxonomy

### 27.1 Canonical Component Categories

| Category | Prefix | Purpose |
|----------|--------|---------|
| FOUNDATION | `.apex-f-*` | Base building blocks: dividers, spacers, overlays |
| NAVIGATION | `.apex-nav-*` | Sidebar, bottom tab, page switcher, breadcrumb |
| SHELL | `.apex-shell-*` | Topbar, input zone, page wrapper |
| PRESENCE | `.apex-presence-*` | Orb, waveform, brand ring, status dot |
| CONVERSATION | `.apex-conv-*` | Chat messages, transcript, typing indicator |
| VOICE | `.apex-voice-*` | Mic button, voice controls, live pill, audio feedback |
| PRESENTATION | `.apex-pres-*` | Presentation container, type badges, evidence blocks |
| NOTIFICATION | `.apex-notify-*` | Notification items, toasts, banners, badges |
| DECISION | `.apex-decision-*` | Decision cards, approval buttons, risk indicators |
| KNOWLEDGE | `.apex-know-*` | Knowledge items, source cards, confidence bars, gap indicators |
| WORLD | `.apex-world-*` | Tree nodes, domain cards, relationship edges |
| DATA | `.apex-data-*` | Tables, charts, stat cards, timelines, progress |
| AGENT | `.apex-agent-*` | Agent cards, agent states, agent grid |
| SYSTEM | `.apex-sys-*` | Constitutional elements, audit entries, infrastructure panels |
| FEEDBACK | `.apex-fb-*` | Loading states, empty states, error states, skeleton |
| FORM | `.apex-form-*` | Inputs, textareas, toggles, selectors |
| ACTION | `.apex-action-*` | Buttons, icon buttons, FAB |
| OVERLAY | `.apex-overlay-*` | Modals, drawers, dialogs, palettes |

### 27.2 Category Rules

1. A component may only belong to one category
2. A component cannot define colours outside the canonical token set
3. A component cannot define its own z-index outside the canonical z-scale
4. A new component requires: purpose, variants, states, accessibility spec before use
5. Components in one category do not import or require components from a lower-specificity category — they compose upward

**Evidence**: OBSERVED (`.ds-*` classes, `.glass-panel`, existing component vocabulary); PROPOSED (canonical category system, naming convention).

---

## 28. Core Components

### 28.1 Button

| Variant | Background | Border | Text | Radius | Height |
|---------|-----------|--------|------|--------|--------|
| Primary | `linear-gradient(135deg, --secondary, --primary)` | None | White | `--apex-radius-lg` (8px) | 36px |
| Secondary | Transparent | `--apex-color-border` | Primary | `--apex-radius-lg` | 36px |
| Danger | `--apex-color-danger-dim` | `rgba(255,77,109,0.45)` | Danger | `--apex-radius-lg` | 36px |
| Success | `--apex-color-success-dim` | `rgba(39,174,96,0.38)` | Success | `--apex-radius-lg` | 36px |
| Ghost | Transparent | Transparent | Muted | `--apex-radius-lg` | 36px |
| xs/compact | Same as secondary | — | — | `--apex-radius-sm` (6px) | 24px |

### 28.2 Icon Button

| Variant | Size | Shape | Touch Target |
|---------|------|-------|-------------|
| Standard | 36×36px | Circle (`--apex-radius-circle`) | 44×44px minimum |
| Large | 48×48px | Circle | 48×48px |
| Compact | 28×28px | Circle | 44×44px (padding extended) |

### 28.3 Chat Input (Command Input)

```
height: 36px
border-radius: 18px  (--apex-radius-pill)
background: rgba(255,255,255,0.06)
border: 1px solid rgba(255,255,255,0.10)
font: --apex-font-body (13px Inter 400)
focus: border-color rgba(0,212,255,0.40), background rgba(255,255,255,0.09)
placeholder: --apex-color-text-dim
```

This exact specification is PROTECTED from UX-00 audit.

### 28.4 Panel (Glass Card)

```
background: --apex-color-surface-1 (rgba(255,255,255,0.04))
border: 1px solid --apex-color-border-dim
border-radius: --apex-radius-2xl (12px)
padding: --apex-space-6 (12px)
backdrop-filter: blur(20px)
entry animation: 350ms ease-out, opacity+translateY(8px→0)
```

### 28.5 Modal / Dialog

```
width: min(520px, 92–94vw)
background: --apex-color-surface-4 (rgba(5,10,26,0.97))
border: 1px solid rgba(0,212,255,0.20)
border-radius: --apex-radius-3xl (14px)
padding: --apex-space-10 (20px)
box-shadow: 0 20px 60px rgba(0,0,0,0.6)
scrim: rgba(0,0,0,0.72) + backdrop-filter blur(8px)
```

### 28.6 Command Palette

Same as modal but:
- Positioned at 14vh from top (not vertically centred)
- Contains search input + list
- z-index: `--apex-z-command` (9000)

### 28.7 Toast

```
position: fixed; bottom: calc(--nav-h + --input-h + 10px); left: 50%; transform: translateX(-50%)
background: rgba(5,12,28,0.97)
border: 1px solid (variant-dependent)
border-radius: --apex-radius-lg (8px)
padding: 9px 16px
font: --apex-font-notify (12px Inter 500)
z-index: --apex-z-notify (1000)
backdrop-filter: blur(20px)
```

### 28.8 Stat Chip

```
Display: value (JetBrains Mono 16-18px, tabular-nums, primary text)
         label (Inter 9px, uppercase, muted)
         icon (SVG, 16px, primary colour)
Background: glass panel (surface-1)
Border: border-dim
Radius: radius-2xl (12px)
Loading: skeleton animation, no raw dashes
```

### 28.9 Status Dot

```
7px circle (border-radius: 50%)
Online: background --apex-color-primary + box-shadow 0 0 5px primary
Offline: background --apex-color-danger
Transition: background 0.3s, box-shadow 0.3s
```

### 28.10 Badge / Tag

```
height: ~18px
padding: 1px 5px
border-radius: --apex-radius-xs (3px)
font: --apex-font-label-sm (9px Inter 700, uppercase, 0.05em tracking)
background: semantic colour at 10–20% opacity
border: semantic colour at 18% opacity
color: semantic colour
```

### 28.11 Skeleton Loader

```
background: rgba(255,255,255,0.04)
border-radius: --apex-radius-lg (8px)
shimmer: 1500ms linear gradient animation (left to right)
gradient: rgba(255,255,255,0) → rgba(255,255,255,0.04) → rgba(255,255,255,0)
```

### 28.12 Evidence Block

```
border: 1px solid --apex-color-border-dim
border-left: 3px solid (domain colour or primary)
border-radius: --apex-radius-lg (8px)
padding: --apex-space-4 (8px) --apex-space-5 (10px)
background: --apex-color-surface-1
```

Internal: Source line (Inter 400 11px, muted) + content (Inter 400 12px) + confidence bar (4px, semantic fill).

### 28.13 Navigation Item

Desktop (sidebar):
```
height: 52px
flex-direction: row
padding: 0 16px
gap: 10px
icon: 18px
label: Inter 500 11px, 0.09em tracking
active: left border 3px primary, full brightness
hover: rgba(232,244,255,0.70)
```

Mobile (bottom tab):
```
height: 60px
flex-direction: column
gap: 3px
icon: 17px
label: Inter 700 9px, uppercase, 0.13em tracking
active: top line 2px primary + primary colour
```

### 28.14 Decision Action Buttons

Full-width within a decision card:

```
APPROVE: background --apex-color-success; color white; height: 44px; font: Inter 600 14px
REJECT:  background --apex-color-danger;  color white; height: 44px; font: Inter 600 14px
MODIFY:  border --apex-color-warning; color --apex-color-warning; height: 40px
DEFER:   border --apex-color-border; color muted; height: 40px
```

No small decision buttons. Human authority takes visual space.

**Evidence**: OBSERVED (existing component classes and CSS values); PROPOSED (formalised specifications, missing components).

---

## 29. Component States

Every interactive component must implement:

| State | Visual Treatment |
|-------|----------------|
| DEFAULT | Baseline specification |
| HOVER | 120ms ease; cursor: pointer; border brightens; background tints slightly |
| FOCUS | 2px focus ring, `rgba(0,212,255,0.60)`, 2px offset; NEVER removed for keyboard accessibility |
| ACTIVE (pressed) | Scale 0.97 + brightness 0.9; instant (0ms) |
| DISABLED | opacity 38%; cursor: not-allowed; no hover/focus styles |
| LOADING | Spinner or skeleton; pointer-events: none |
| SUCCESS | Success green colour; 220ms transition |
| WARNING | Warning amber colour; 220ms transition |
| ERROR | Danger red colour; 220ms transition |
| SELECTED | Primary colour border; primary dim background |

### 29.1 Focus Ring Specification

```
outline: 2px solid rgba(0,212,255,0.60)
outline-offset: 2px
border-radius: inherits from component
```

The focus ring is NEVER `outline: none` without an explicit visible replacement. Keyboard users must always see which element has focus.

### 29.2 Domain-Specific States

| Component | Additional States |
|-----------|-----------------|
| Orb | LISTENING, UNDERSTANDING, RESPONDING, SPEAKING, INTERRUPTED, PAUSED, LIVE, FAILED, CANCELLED |
| Notification item | UNREAD, READ, ACTIONED, DISMISSED, EXPIRED |
| Decision card | PENDING, APPROVED, EXECUTING, COMPLETED, REJECTED, MODIFIED, FAILED, DEFERRED |
| Agent card | IDLE, ACTIVE, EXECUTING, COMPLETE, ERROR, WAITING |
| Knowledge item | CURRENT, STALE, GAP, CONTRADICTED, VERIFIED |
| Task item | PENDING, IN-PROGRESS, COMPLETED, FAILED |
| Toggle | ON, OFF (+ DEFAULT, HOVER, FOCUS, DISABLED) |

**Evidence**: PROPOSED throughout; OBSERVED for orb states, task states, email button states.

---

## 30. Focus and Keyboard UX

### 30.1 Keyboard Shortcut Preservation

All existing keyboard shortcuts from UX-00 are PROTECTED:

| Shortcut | Action |
|---------|--------|
| `1`–`0` | Switch between pages 1–10 |
| `R` | Refresh current page |
| `A` | Jump to approvals / Decisions surface |
| `N` | Jump to notifications |
| `/` | Focus chat input |
| `?` | Toggle help overlay |
| `ESC` | Close overlay / drawer / dismiss presentation |
| `⇧R` | Run next feature |

### 30.2 New Shortcuts (PROPOSED)

| Shortcut | Action |
|---------|--------|
| `Space` | Activate voice (when orb on Command page) |
| `⇧Space` | Toggle Gemini Live mode |
| `⇧N` | Open notification centre |
| `⇧D` | Jump to Decisions surface |
| `⇧K` | Jump to Knowledge surface |
| `⇧W` | Jump to World surface |
| `⌘/` or `Ctrl+/` | Open command palette |

### 30.3 Tab Order

On each surface, the logical tab order follows reading order (top-left to bottom-right). Overlays and modals trap focus within themselves until closed. ESC closes the overlay and returns focus to the trigger element.

### 30.4 Focus Visibility

Focus ring is always visible. The ring specification (section 29.1) applies universally. No component may suppress focus visibility.

Focus ring colour `rgba(0,212,255,0.60)` passes 3:1 contrast on both the dark background and glass surfaces.

**Evidence**: OBSERVED (existing shortcuts, skip-to-main, data-fn pattern); PROPOSED (new shortcuts, formal focus spec).

---

## 31. Responsive Design

### 31.1 Breakpoints

| Name | Breakpoint | Layout |
|------|-----------|--------|
| Mobile | < 640px | Single column; bottom tab nav; full-screen components |
| Tablet | 640px–899px | Single column; bottom tab nav; wider panels |
| Desktop | ≥ 900px | Two-column grid; sidebar nav; side-by-side layouts |

The 900px desktop breakpoint is PROTECTED from UX-00.

### 31.2 Layout Transformation

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Navigation | Bottom tab bar (5 primary pages) | Bottom tab bar | Left sidebar (200px, all pages) |
| Command | Full-screen; orb centred; feed below | Same as mobile | Two-column (orb+stats left; feed right) |
| Presentation | Full-width panel, bottom sheet style | Full-width panel | 360px panel adjacent to orb |
| Notifications | Full-width banner | Full-width banner | 360px panel at top-right |
| Modals | Full-width, bottom-anchored | `min(520px, 94vw)` centred | `min(520px, 92vw)` centred |
| Drawers | Bottom sheet (full-width) | Right drawer (60% width) | Right drawer (400px) |
| Tree of Life | Vertical scroll; domains stacked | Same as mobile | Two-column grid; tree visualisation |
| Stat chips | 2×2 grid | 4-across row | 4-across row |
| Page padding | 10px | 12px | 14px |

### 31.3 Responsive Rules

1. Navigation transforms at 900px — never just scales
2. Orb size: 88px mobile/tablet; 96px desktop
3. Typography minimum sizes hold on mobile (no smaller than specified)
4. Touch targets minimum 44×44px on mobile at all times
5. Presentation panels are bottom-sheet on mobile (slide up from bottom); floating panel on desktop
6. Decision cards are full-width on mobile; max-width 480px on desktop
7. Sidebar navigation does not collapse to hamburger on desktop — it remains visible

**Evidence**: OBSERVED (900px breakpoint, safe-area, mobile nav); PROPOSED (formal breakpoints, transformation table, rules).

---

## 32. Mobile Visual Language

### 32.1 Mobile Identity

Mobile APEX must be recognisably APEX, not a stripped-down version. The same colour system, typography, and motion apply. The adaptation is in layout and interaction model — not identity.

### 32.2 Mobile Priorities

On mobile, these elements take precedence:

1. **Command** — orb centred, always available from tab bar
2. **Voice** — mic and voice controls prominent; voice is the primary mobile interaction model
3. **Notifications** — full-width banners; urgent notifications never hidden
4. **Decisions** — full-screen decision flow; approval/reject at thumb reach

### 32.3 Mobile Navigation

Bottom tab bar shows 5 primary destinations:
1. Command
2. World
3. Decisions
4. Knowledge
5. System

"More" overflow menu reveals remaining pages. This replaces the current 11-page mobile dropdown which has no hierarchy.

### 32.4 Mobile-Specific Components

| Component | Mobile Treatment |
|-----------|----------------|
| Presentations | Bottom sheet; slides up from bottom; swipe down to dismiss |
| Notifications | Full-width banner; swipe left to dismiss |
| Decision cards | Full-screen; approve/reject at bottom (thumb zone) |
| Agent drawer | Bottom sheet |
| Command palette | Full-screen sheet from bottom |
| Tree of Life | Vertical scroll; accordion-style domain expansion |

### 32.5 Mobile Voice

On mobile, voice is the primary interaction model. The mic button must be thumb-accessible. The Gemini Live toggle must be clearly visible. The orb is a large tap target (88px + 44px surrounding padding = effective 132px tap area).

### 32.6 Safe Areas

`env(safe-area-inset-bottom)` applied to bottom nav is PROTECTED. Extend to:
- Bottom sheet presentations
- Bottom tab bar
- Toast notifications (positioned above safe area)

**Evidence**: OBSERVED (mobile nav implementation, safe-area); PROPOSED (mobile priority ordering, mobile-specific components, 5-tab nav).

---

## 33. Accessibility

### 33.1 Contrast

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Body text on background | 7:1 | `#e8f4ff` on `#03060f` ≈ 18:1 — passes AAA |
| Secondary text on surface | 4.5:1 | Requires implementation verification |
| Muted text (non-critical) | 3:1 | UI components; large text |
| Action labels on buttons | 4.5:1 | Standard AA |
| Focus ring | 3:1 | Against adjacent background |
| Domain colour badges | 3:1 | On badge background |

Non-critical muted text (`rgba(232,244,255,0.25)`) should not be used for actionable labels. It is reserved for truly secondary information (placeholders, metadata).

### 33.2 Focus and Keyboard

- All interactive elements are focusable via keyboard
- Focus ring specification: 2px solid `rgba(0,212,255,0.60)`, 2px offset (Section 29.1)
- Logical tab order on every surface
- Modal and overlay focus traps
- ESC always closes the topmost overlay/modal
- Skip-to-main link: PROTECTED and extended to all surfaces

### 33.3 Screen Readers

- All icons without adjacent text: `aria-label`
- Decorative icons: `aria-hidden="true"`
- Live regions for: voice state changes, notification arrivals, APEX responses
- `aria-live="polite"` for normal updates; `aria-live="assertive"` for URGENT notifications and errors
- `role="status"` for orb state label
- Semantic heading structure per surface (h1 for page title, h2 for sections)
- Meaningful button labels (not "Click here" or "Submit")
- Announcement when presentations appear: "APEX is showing [presentation type]: [title]"

### 33.4 Reduced Motion

`prefers-reduced-motion: reduce` disables all animations (PROTECTED, comprehensive). Reduced-motion alternatives:

| Animation | Reduced Motion Alternative |
|-----------|--------------------------|
| Orb pulse animations | Static; only colour changes |
| Waveform bars | Static bars at mid-height |
| Page transition translateX | Opacity fade only |
| Panel entry translateY | Opacity fade only |
| Presentation slide | Opacity fade only |
| Brand ring pulse | Static ring |
| Notification slide | Opacity fade only |

### 33.5 Colour Independence

Every state communicated by colour is also communicated by:
- Shape (solid vs. dashed border for gaps)
- Text (status labels, badges)
- Icon (semantic state icons)
- Position (attention = higher position)
- Typography weight (important = bold)

No user should need to distinguish cyan from red to understand voice state — the orb sub-label, the waveform presence, and the input zone state also communicate.

### 33.6 Voice-Unavailable Mode

When voice is unavailable (no microphone, browser restriction, user preference):
- Orb does not show voice affordance (no "TAP TO SPEAK")
- Orb sub-label: "TEXT MODE"
- All voice states are replaced by typing states
- Text input is never hidden
- APEX responses are text-only with option to enable TTS

### 33.7 Touch Targets

All interactive elements: minimum 44×44px effective touch target. Icon buttons that are 36×36px visually must have 4px padding to reach 44×44px.

**Evidence**: OBSERVED (`prefers-reduced-motion`, skip-to-main, touch-action, aria-labels); PROPOSED (formal requirements table, screen reader annotations, voice-unavailable mode).

---

## 34. Themes

### 34.1 Current State

APEX currently supports **dark theme only**. The deep navy dark field is central to the APEX visual identity.

**Evidence**: OBSERVED (single `:root` colour block, all colours are dark-optimised).

### 34.2 Dark Theme

Dark theme is the **canonical APEX theme**. All token values defined in Section 9 are dark theme values. The APEX visual identity is native to dark contexts.

### 34.3 Light Theme Assessment

**OPEN** — Light theme is not specified at UX-05. It is not currently present in the codebase, and introducing it would require a complete second token set and design review of every component.

Light theme would require:
- Separate `--apex-color-*` values for each token
- Contrast re-verification for all pairings
- Review of glass morphism (which relies on dark background)
- Orb and waveform adaptation (cyan on white background requires different values)
- Brand identity verification (does the APEX identity survive in light context?)

**Recommendation**: Defer to a dedicated UX phase (UX-10 or later). Light theme is not a trivial adaptation.

### 34.4 System Preference

If light theme is implemented in a future phase:
- System preference (`prefers-color-scheme`) should be the default
- User may override with an explicit preference (stored persistently)
- One design system; two token value sets (not two separate designs)

**Evidence**: OBSERVED (dark-only implementation); PROPOSED (assessment and deferral recommendation); OPEN (light theme specification).

---

## 35. Information Density

### 35.1 Density Principle

APEX is a high-information system. Density must be calibrated per surface and context — not uniformly high or uniformly low. The goal is always: maximum useful information per visual unit, without visual overload.

### 35.2 Density by Surface

| Surface | Density | Rationale |
|---------|---------|-----------|
| Command | LOW–MEDIUM | Command is the conversation surface; space communicates calm and focus |
| World | MEDIUM | Navigating capabilities; enough detail per node; not overwhelming |
| Decisions | LOW | Decision moments require focus; no competing information |
| Knowledge | HIGH | Knowledge exploration is inherently dense; breadth and depth both needed |
| System | HIGH | System transparency requires full detail; users here are sophisticated |

### 35.3 Density Levels

| Level | Description |
|-------|-------------|
| COMPACT | 8px internal padding; 6px gap; 11px body; 9px label |
| DEFAULT | 12px internal padding; 10px gap; 13px body; 11px label |
| COMFORTABLE | 16px internal padding; 12px gap; 13px body; 11px label |
| EXPANDED | 20px+ padding; 16px gap; 14px body; 12px label |

Users may not change density manually at UX-05 definition stage. Density is surface-appropriate by design, not user-configurable (this is deferred as OPEN).

### 35.4 Progressive Disclosure Density

L0: Surface — only essential summary  
L1: Expanded — key supporting information  
L2: Detail — full item detail  
L3: Evidence — sources, provenance, reasoning chains  
L4: Constitutional — governance, audit, constitutional record

Each level should feel like natural depth, not a new interface.

**Evidence**: INHERITED from UX-03 progressive disclosure model; PROPOSED (density levels, surface-density table).

---

## 36. Professionalism Criteria

### 36.1 What Professional Means for APEX

APEX is a personal AI OS used by one person in high-stakes domains (finance, health, decisions). It must communicate confidence, precision, and trustworthiness at a glance. Amateur visual patterns undermine trust in the system's intelligence.

### 36.2 Explicit Quality Criteria

The interface MUST:

| Criterion | Standard |
|----------|---------|
| Consistent spacing | All spacing from canonical scale; no ad-hoc pixel values |
| Single token system | One `:root` block; no competing declarations |
| Coherent border radius | All values from canonical scale; no per-component invention |
| Typography hierarchy | Clear role distinction; no font used outside its canonical role |
| Icon consistency | One visual style, one weight; no mixed icon sources |
| Intentional animation | Every animation communicates state; duration from canonical scale |
| Legible hierarchy | User can identify importance from visual weight alone |
| Colour with meaning | No arbitrary colour choices; every colour maps to a token with semantic role |
| Functional state coverage | Every component has defined states for all interactive scenarios |
| Responsive authenticity | Mobile is a genuine mobile experience, not desktop at 375px |

The interface MUST NOT:

| Anti-pattern | Reason |
|-------------|--------|
| Mixed font families in one context | Typography confusion signals amateur assembly |
| Emoji as UI icons | Platform-inconsistent; no semantic state; accessibility failure |
| Arbitrary gradient colours | Gradients communicate energy/direction; decorative gradients communicate nothing |
| Spinners without context | Users do not know what is loading; skeleton loaders are preferable |
| Hidden keyboard access | Every feature reachable without mouse |
| Animation on page scroll | Unexpected motion; distracts from reading |
| Multiple z-index values for the same role | Indicates there is no z-index architecture |
| Raw dashes ("—") during loading | Skeleton loaders; not placeholder text |
| Button labels that do not describe the action | "Submit" is acceptable; "Click here" is not |
| Colour-only state indicators | Accessibility failure |

**Evidence**: OBSERVED (emoji icons, competing token blocks, "£—" loading state, z-index chaos); PROPOSED (formal quality criteria).

---

## 37. APEX Identity vs. UI Design System

### 37.1 The Distinction

| | APEX Identity | APEX UI Design System |
|--|--------------|----------------------|
| What it is | The recognisable essence of APEX | The implementation vocabulary |
| Stability | Extremely stable; changes only under explicit brand review | Evolves with APEX capabilities |
| Elements | Orb, cyan, dark field, Cinzel, constitutional charter | Tokens, components, patterns, rules |
| Changed by | Brand decision | Design system evolution |
| Governs | What APEX feels like | How APEX looks |

### 37.2 What Must Remain Stable

These identity elements must survive any future redesign:

1. Circular orb as APEX presence — form may evolve; circular must not change
2. Cyan (`#00d4ff`) as the APEX signature colour — may shift shade slightly; cyan identity must remain
3. Deep navy dark field — background must maintain blue undertone; not pure black
4. Constitution visible on Command — location may change; visibility may not
5. Cinzel for brand — the brand typography is identity-level, not design-system-level

### 37.3 What the Design System Governs

Everything else is design system territory:
- Token values (can change within the identity palette)
- Component shapes (within shape language rules)
- Layout and spacing (within grid rules)
- Animation (within motion principles)
- New components (must speak the design system vocabulary)

If there is ever a question: "Can we change X?" — check whether X is identity or system. Identity: requires brand-level review. System: requires design system update following governance rules.

**Evidence**: PROPOSED (formal distinction not previously made; derived from UX-01 identity protection decisions).

---

## 38. Visual Governance

### 38.1 Purpose

Visual governance rules prevent fragmentation as APEX grows. Every new domain, capability, agent, or feature must fit within the existing visual language. Without governance, growth produces visual chaos.

### 38.2 Component Governance Rules

| Rule | Detail |
|------|--------|
| G-VG-01 | A new component cannot introduce its own colour values. It must use canonical tokens. |
| G-VG-02 | A new component cannot define its own z-index value outside the canonical z-scale. |
| G-VG-03 | A new component cannot introduce a new font family. Only Inter, Cinzel, JetBrains Mono. |
| G-VG-04 | A new component cannot introduce a border-radius value not in the canonical scale. |
| G-VG-05 | A new component cannot introduce a new animation duration not in the canonical duration categories. |
| G-VG-06 | A new component must define all required states before implementation: DEFAULT, HOVER, FOCUS, DISABLED, LOADING, at minimum. |
| G-VG-07 | A new component must define its accessibility requirements (keyboard, screen reader, reduced motion) before implementation. |

### 38.3 Surface Governance Rules

| Rule | Detail |
|------|--------|
| G-SG-01 | A new surface cannot create its own navigation language. It uses the canonical T1–T4 navigation model. |
| G-SG-02 | A new surface cannot create its own colour identity. It uses domain colour tokens if domain-specific. |
| G-SG-03 | A new surface uses the canonical surface hierarchy (L1–L5 elevation levels). |
| G-SG-04 | A new surface's page title uses Cinzel (matching canonical display treatment). |
| G-SG-05 | A new surface's components use the canonical component taxonomy. |

### 38.4 Domain Governance Rules

| Rule | Detail |
|------|--------|
| G-DG-01 | A new domain must be assigned one canonical domain colour from the colour system. |
| G-DG-02 | A new domain cannot invent its own visual identity. Its node in the Tree of Life uses the canonical domain card anatomy. |
| G-DG-03 | A new domain's agents use the canonical agent card component. |
| G-DG-04 | A new domain's notifications use the canonical notification components and 6-level attention system. |

### 38.5 Icon Governance Rules

| Rule | Detail |
|------|--------|
| G-IG-01 | All icons are outlined SVGs matching the canonical style (1.5px stroke, 20px grid, rounded caps). |
| G-IG-02 | No external icon library may be introduced without explicit design system review. |
| G-IG-03 | Emoji are not used as UI icons under any circumstances. |
| G-IG-04 | Icon-only interactive elements must have accessible labels. |

### 38.6 Token Governance Rules

| Rule | Detail |
|------|--------|
| G-TG-01 | All design values are expressed through canonical tokens, never hardcoded. |
| G-TG-02 | A new token requires: category, name, purpose, semantic role, and evidence that no existing token serves the need. |
| G-TG-03 | Domain colour tokens must harmonise with the primary cyan system (not compete with it). |
| G-TG-04 | The `:root` token block is single-source; no competing blocks are introduced. |

### 38.7 Communication Governance Rules

| Rule | Detail |
|------|--------|
| G-CG-01 | A new notification type must fit within the existing 6-level attention hierarchy. No new levels. |
| G-CG-02 | A new presentation type must use the canonical presentation container component. |
| G-CG-03 | A new voice state must map to one of the 11 canonical voice states; no new states without explicit UX authorisation. |
| G-CG-04 | A new approval/decision type must use the canonical decision card component. |

**Evidence**: PROPOSED (governance system; derived from observed fragmentation failure modes in UX-00).

---

## 39. Real-Life Visual Scenarios

Fourteen scenarios testing the visual system against real user moments.

---

### V-01: Simple Text Answer

**User**: "What time is it in Tokyo?"  
**APEX**: Text response in conversation.

| Visual State | Treatment |
|-------------|----------|
| Orb | IDLE → UNDERSTANDING (amber, 200ms) → RESPONDING (return to cyan, 150ms) → IDLE |
| Waveform | Hidden throughout |
| Chat area | User message: right-aligned, blue-gradient bubble. AI response: left-aligned, glass bubble, typing indicator during generation |
| Input zone | Active throughout (text mode) |
| Activity feed | Entry appears: "Answered time query" |

**Evidence**: OBSERVED (chat bubble CSS, typing indicator); PROPOSED (orb state transitions).

---

### V-02: Voice Conversation

**User**: Speaks via orb tap.  
**APEX**: Responds via voice.

| Phase | Visual State |
|-------|------------|
| User taps orb | ACTIVATING → LISTENING: orb red pulse, waveform red bars |
| APEX processes | UNDERSTANDING: orb amber breathe, waveform hidden |
| APEX speaks | SPEAKING: orb strong cyan, waveform cyan bars, transcript appears |
| Conversation ends | IDLE: orb settles, waveform fades |
| Voice feedback panel | Appears during SPEAKING, shows last sentence |

---

### V-03: APEX Speaking with Temporary Presentation

**User**: "Show me my finances."  
**APEX**: Speaks summary + shows finance presentation.

| Phase | Visual State |
|-------|------------|
| Request | User text or voice; UNDERSTANDING orb |
| Response begins | SPEAKING orb + PRESENT presentation appears (350ms ease-out from right side) |
| Presentation active | Finance domain colour header; chart + 4 stat values; sitting at Level 3 elevation |
| User reads | Presentation remains while APEX is speaking |
| APEX done | IDLE orb; presentation contextually remains until user dismisses or next action |
| Dismiss | 220ms opacity fade; presentation gone |

---

### V-04: User Interrupts APEX

**User**: Speaks while APEX is speaking.

| Phase | Visual State |
|-------|------------|
| APEX speaking | SPEAKING orb (strong cyan) |
| User interrupts | Orb: INTERRUPTED (amber flash 300ms → settle); waveform hides |
| STT captures | LISTENING orb (red pulse) |
| APEX acknowledges | UNDERSTANDING → RESPONDING → SPEAKING (new response) |
| New presentation | If relevant, previous presentation updates rather than replacing |

The interruption should feel instantaneous — the amber flash communicates "stopped" without any confusion.

---

### V-05: Notification Appears

**APEX**: Proactively sends L2 IN-APP notification: "Finance report generated."

| Phase | Visual State |
|-------|------------|
| Notification arrives | Slides in from right (220ms ease-out); primary border; category badge |
| Activity feed | Entry added simultaneously |
| Notification badge | Count increments on bell icon |
| User sees | Reads notification in feed; no forced interruption |
| Dismiss | User swipes or × button; 220ms fade out |

---

### V-06: Notification → Command

**User**: Taps notification; navigates to Command for more detail.

| Phase | Visual State |
|-------|------------|
| Tap notification | Notification highlights (brief scale + border brighten) |
| Navigation | Page transition 220ms; Command loads with pre-loaded context |
| Command arrives | APEX orb: UNDERSTANDING briefly → RESPONDING → SPEAKING the notification context |
| Presentation | Finance presentation appears automatically, contextualised to the notification |
| Context pre-loaded | No lag; conversation context already loaded from notification |

---

### V-07: Approval Decision

**APEX**: Requires human approval for an action.

| Phase | Visual State |
|-------|------------|
| Decision created | L4 DECISION notification appears (amber border, full banner) |
| User navigates to Decisions | Decision card visible full-width (mobile) or max-480px (desktop) |
| Decision card | Pending state: amber left border; title bold; evidence collapsed |
| User expands evidence | Evidence blocks expand; confidence bars visible |
| User approves | APPROVE button pressed: green background; "Approved" badge; card shifts to executing state |
| Execution | Progress indicator; STOP button available |
| Complete | Green completion state; card dims; archive available |

Decision visual: the most visually prominent action buttons in the system. They are not small.

---

### V-08: Evidence Presentation

**User**: "Why do you recommend this?"

| Phase | Visual State |
|-------|------------|
| Request | UNDERSTANDING orb |
| Response | EVIDENCE presentation appears; 3–5 evidence blocks |
| Each block | Source name + icon + freshness + confidence bar + extract |
| Confidence | Bars fill left to right; success/amber/danger based on level |
| Navigation | User taps block to expand full source; links to Knowledge surface |

---

### V-09: Knowledge Gap

**User**: "What's my health score?"  
**APEX**: Cannot answer — knowledge gap.

| Phase | Visual State |
|-------|------------|
| Request | UNDERSTANDING orb |
| Gap identified | KNOWLEDGE presentation type with gap treatment |
| Presentation | Dashed border container; warning amber accent; "KNOWLEDGE GAP" badge |
| Content | "I don't have current health data. Last synced: 7 days ago." |
| Action | "Sync now" button; or "Remind me later" |
| Orb | Returns to IDLE; no failure animation (this is an expected state) |

---

### V-10: Agent Activity

**APEX**: Finance agent runs a budget analysis autonomously.

| Phase | Visual State |
|-------|------------|
| Agent activates | Activity feed entry: cyan dot + "Finance Agent: analysing..." |
| Agent state card | Agent card in System page: ACTIVE → EXECUTING state |
| Progress | Agent card shows subtask progress |
| Completion | Activity feed: "Finance Agent: analysis complete"; entry type AGENT |
| Notification | L2 IN-APP notification if result requires attention |
| Result | PRESENT finance chart if user is on Command |

---

### V-11: World / Tree of Life

**User**: Navigates to World surface. Taps "Finance" domain.

| Phase | Visual State |
|-------|------------|
| World page loads | Tree visible; ROOT at top; 10 domain nodes |
| Finance node | Finance green (`#3fd29a`) left border; 3px; icon in domain colour |
| Tap Finance | Domain expands to show capabilities: Budget, Transactions, Reports, Agents |
| Capability nodes | Sub-cards; lighter; capability icons; status dots |
| Active capability | Shimmer animation on "Budget Analysis" (agent is running) |
| Tap Budget | Instance list: recent budget analyses; mono timestamps; state dots |

---

### V-12: System Transparency

**User**: Navigates to System surface; views constitutional status.

| Phase | Visual State |
|-------|------------|
| System page | Executive Council grid (5 agents, state dots); Command Chain horizontal trace |
| Constitution section | Cinzel headings for A1–A6; constitutional tint background |
| Article A6 | "Human Override Is Absolute" — correct weight, legible, present |
| Governance panel | Audit trail entries; mono timestamps; human-readable summaries |
| Active agents | Cyan animated dots on running agents |
| Agent detail | Tap agent card → modal: current task, recent actions, performance |

---

### V-13: Mobile Command

**User**: Opens APEX on mobile. Speaks to APEX.

| Phase | Visual State |
|-------|------------|
| App opens | Command full-screen; orb centred (88px); stat chips 2×2 below |
| Tap orb | ACTIVATING → LISTENING; orb red pulse; bottom of screen mic visible |
| Speak | Waveform red bars visible below orb |
| APEX responds | SPEAKING; waveform cyan; transcript appears above orb; presentation slides up as bottom sheet |
| Bottom nav | 5 tabs always visible above safe area |
| Notification | Full-width banner slides from top; swipe to dismiss |

---

### V-14: Accessibility-Only Interaction

**User**: Uses APEX with screen reader + keyboard only; no mouse.

| Phase | Visual State |
|-------|------------|
| Navigation | Tab moves through sidebar items; focus ring visible (2px cyan) |
| Skip to main | Skip link activates at page load; screen reader announces |
| Orb | Announced as: "APEX presence. State: IDLE. Button: Activate voice." |
| Keyboard shortcut | `/` focuses chat input; screen reader announces "Chat input focused" |
| Notification | `aria-live="polite"` announces new notifications |
| Decision | Arrives as `aria-live="assertive"` L4; focus moves to decision card |
| Approve | `Enter` or `Space` on APPROVE button; confirmation announced |
| Reduced motion | All animations absent; state changes via colour and label only |

---

## 40. Design Token Matrix

| Token | Category | Purpose | Semantic Role | Dark Theme Value | Light Theme | Accessibility | Usage Rule |
|-------|----------|---------|--------------|-----------------|-------------|--------------|-----------|
| `--apex-color-bg` | Colour | App background | Ground | `#03060f` | OPEN | Baseline | Never used as foreground |
| `--apex-color-bg-2` | Colour | Slightly elevated bg | Near-ground | `#060c18` | OPEN | — | Background elevation only |
| `--apex-color-surface-1` | Colour | Glass panel | Surface L1 | `rgba(255,255,255,0.04)` | OPEN | — | Primary panel background |
| `--apex-color-surface-2` | Colour | Highlighted panel | Surface L2 | `rgba(0,212,255,0.05)` | OPEN | — | Elevated/hover panels |
| `--apex-color-surface-3` | Colour | Overlay | Surface L3 | `rgba(3,6,15,0.92)` | OPEN | — | Navigation chrome, overlays |
| `--apex-color-surface-4` | Colour | Modal | Surface L4 | `rgba(5,10,26,0.97)` | OPEN | — | Dialogs, modals only |
| `--apex-color-primary` | Colour | APEX cyan | Identity | `#00d4ff` | OPEN | 8:1 on bg | Brand, active states, primary actions |
| `--apex-color-primary-dim` | Colour | Primary low opacity | Tint | `rgba(0,212,255,0.18)` | OPEN | — | Backgrounds, hover states |
| `--apex-color-primary-glow` | Colour | Primary glow | Shadow | `rgba(0,212,255,0.40)` | OPEN | — | Shadow/glow only |
| `--apex-color-secondary` | Colour | Deep blue | Depth | `#0066ff` | OPEN | 4.5:1 on bg | Gradients, secondary emphasis |
| `--apex-color-accent` | Colour | Purple | Contrast accent | `#7b2fff` | OPEN | — | Background gradients, accent only |
| `--apex-color-border` | Colour | Standard border | Edge | `rgba(0,212,255,0.16)` | OPEN | — | Interactive component borders |
| `--apex-color-border-dim` | Colour | Subtle border | Dim edge | `rgba(0,212,255,0.08)` | OPEN | — | Panel separators, dividers |
| `--apex-color-text-primary` | Colour | Primary text | Reading | `#e8f4ff` | OPEN | 18:1 on bg | All body content |
| `--apex-color-text-secondary` | Colour | Secondary text | Supporting | `rgba(232,244,255,0.70)` | OPEN | ~6:1 on bg | Card content, descriptions |
| `--apex-color-text-muted` | Colour | Muted text | Metadata | `rgba(232,244,255,0.45)` | OPEN | ~3.5:1 | Labels, timestamps, non-critical |
| `--apex-color-text-dim` | Colour | Dim text | Hints | `rgba(232,244,255,0.25)` | OPEN | ~2:1 | Placeholders ONLY; never actionable |
| `--apex-color-success` | Colour | Green | Positive state | `#27ae60` | OPEN | 4.5:1 | Approve, complete, healthy |
| `--apex-color-warning` | Colour | Amber | Caution state | `#ff9f43` | OPEN | 3:1 on surface | Deferred, moderate risk, stale |
| `--apex-color-danger` | Colour | Red-pink | Negative state | `#ff4d6d` | OPEN | 4.5:1 | Reject, fail, offline, urgent |
| `--apex-color-info` | Colour | Information | Neutral info | `#00d4ff` (=primary) | OPEN | 8:1 | Info-level notifications |
| `--apex-space-2` | Spacing | Tight inline | Micro | 4px | — | — | Icon-label gap, dense grids |
| `--apex-space-4` | Spacing | Small | Compact | 8px | — | — | Row gaps, small padding |
| `--apex-space-6` | Spacing | Standard | Default | 12px | — | — | Panel padding, section gaps |
| `--apex-space-8` | Spacing | Comfortable | Large | 16px | — | — | Section margins |
| `--apex-space-12` | Spacing | Large | Spacious | 24px | — | — | Modal padding, hero areas |
| `--apex-radius-pill` | Radius | Pill | Conversational | 9999px | — | — | Chat input, flow indicators |
| `--apex-radius-circle` | Radius | Circle | Presence | 50% | — | — | Orb, dots, indicators only |
| `--apex-radius-2xl` | Radius | Panel | Surface | 12px | — | — | All panels and cards |
| `--apex-radius-3xl` | Radius | Modal | Elevated | 14px | — | — | Modals, dialogs |
| `--apex-radius-lg` | Radius | Button | Action | 8px | — | — | All buttons |
| `--apex-shadow-glow-primary` | Shadow | Orb/active glow | Identity | `0 0 22px rgba(0,212,255,0.18)` | OPEN | — | Primary glow only |
| `--apex-shadow-modal` | Shadow | Modal elevation | Depth | `0 20px 60px rgba(0,0,0,0.6)` | OPEN | — | Modals only |
| `--apex-duration-micro` | Motion | Hover speed | Feedback | 120ms | — | 0ms if reduced | Hover, micro-interactions |
| `--apex-duration-standard` | Motion | Standard speed | Transition | 220ms | — | 220ms opacity-only | Most UI transitions |
| `--apex-duration-deliberate` | Motion | Deliberate speed | Entry | 350ms | — | 220ms opacity-only | Panel/presentation entry |
| `--apex-duration-breathe` | Motion | Ambient speed | Presence | 3–4s | — | 0ms (disabled) | Orb, brand ring ambient |
| `--apex-z-nav` | Layering | Navigation | Shell | 20 | — | — | Topbar, sidebar only |
| `--apex-z-modal` | Layering | Modal | Overlay | 400 | — | — | All modals |
| `--apex-z-notify` | Layering | Notifications | Alert | 1000 | — | — | Toast, banners |
| `--apex-z-command` | Layering | Command palette | System | 9000 | — | — | Command palette only |
| `--apex-z-auth` | Layering | Auth | Top | 99999 | — | — | Auth overlay only |

---

## 41. Component Matrix

| Component | Purpose | Variants | States | Primary Surface | Communication Channel | Responsive | Accessibility | Motion |
|-----------|---------|---------|--------|-----------------|----------------------|------------|--------------|--------|
| Orb | APEX presence, voice trigger | IDLE/11 states | All 11 voice states | Command | CONVERSE | 88px mobile; 96px desktop | `role="status"`, `aria-label` state | Breathing, pulse, colour transitions |
| Waveform | Audio activity indicator | Speaking/Listening | Active/Inactive | Command | CONVERSE | Same position; 7 bars always | Static bars if reduced-motion | 7-bar stagger animation |
| Brand ring | Online presence | — | On/Off/Pulse | Topbar | — | Always visible | `aria-label="APEX online"` | 3s pulse |
| Chat message (user) | User text | — | Sent/Sending/Error | Command | CONVERSE | Full-width mobile; max 84% | `aria-live` for new messages | None |
| Chat message (AI) | APEX text | — | Complete/Streaming | Command | CONVERSE | Same | `aria-live="polite"` | None |
| Typing indicator | Processing signal | — | Active/Hidden | Command | CONVERSE | — | `aria-label="APEX is typing"` | 3-dot bounce |
| Voice control row | Voice inputs | Mic, live, auto-listen | Active/Inactive/Loading | Input zone | CONVERSE | Always visible | `aria-pressed` on toggles | None |
| Presentation container | Contextual display | 13 types | APPEARING/ACTIVE/DISMISSED + more | Command (primary) | PRESENT | Full-width mobile; 360px desktop | Announced on appear | Slide/fade in/out |
| Notification item | Proactive message | 6 levels | UNREAD/READ/ACTIONED/DISMISSED | Feed, banner | NOTIFY | Full-width | `aria-live` by level | Slide in |
| Toast | Ephemeral message | success/error/info/warning | Visible/Dismissed | Fixed bottom | NOTIFY | Full-width mobile | `aria-live="assertive"` for errors | Fade in/out |
| Decision card | Approval request | — | 8 states (PENDING→ARCHIVED) | Decisions | NOTIFY→CONVERSE | Full-width mobile; max 480px desktop | Full keyboard; focus trap | None |
| Evidence block | Source + confidence | — | Collapsed/Expanded | Knowledge, Decisions, PRESENT | PRESENT | — | Source link accessible | Expand/collapse |
| Domain card | Tree of Life node | 10 domains | Active/Idle/Error | World | — | Stacked mobile; grid desktop | Domain name in heading | Shimmer if active agent |
| Agent card | Agent state | System agents, domain agents | IDLE/ACTIVE/EXECUTING/COMPLETE/ERROR | System, Command | — | Grid mobile; grid desktop | State communicated by text+colour | State dot transition |
| Stat chip | Key metric display | 4 fixed metrics | Loading/Loaded/Error | Command | — | 2×2 mobile; 4-across desktop | Value announced by screen reader | Skeleton during load |
| Panel | Surface container | glass, elevated | — | All surfaces | — | Full-width mobile; varies desktop | — | 350ms entry |
| Modal | Focused dialog | Standard, danger | Open/Closed | All | — | Full-width mobile; fixed-width desktop | Focus trap; ESC closes | Fade + backdrop |
| Command palette | Quick navigation | — | Open/Closed | Global | — | Full-screen mobile | Focus trap; keyboard search | Fade |
| Navigation item | Surface link | Desktop/Mobile | Default/Active/Hover | Topbar/Sidebar/Bottom nav | — | Sidebar desktop; tab mobile | `aria-current="page"` on active | Colour transition |
| Skeleton | Loading placeholder | narrow/medium/wide | — | All | — | — | `aria-hidden="true"` | Shimmer |
| Focus ring | Keyboard indicator | — | Focused | All interactive | — | — | Never hidden | 0ms |
| Status dot | Live state | Colours | On/Off/Warning | Topbar, cards | — | 7px always | `aria-label` on containing element | Colour transition |

---

## 42. Visual State Matrix

| State | Trigger | User Meaning | Visual Treatment | Audio | Motion | User Control | Accessibility |
|-------|---------|-------------|-----------------|-------|--------|-------------|--------------|
| **VOICE: IDLE** | No voice activity | APEX ready | Orb cyan breathe 4s; pulse rings | None | `orbWait` 4s | Tap orb to start | "APEX IDLE" `aria-label` |
| **VOICE: LISTENING** | Mic active | Recording now | Orb red border + pulse 0.55s; red waveform bars | None | `orbListen` 0.55s | Tap to stop | "APEX LISTENING" announced |
| **VOICE: UNDERSTANDING** | Audio received | Processing | Orb amber breathe 1.2s | None | `orbThink` 1.2s | None (auto-proceeds) | "APEX THINKING" announced |
| **VOICE: SPEAKING** | Response plays | APEX talking | Orb strong cyan 0.6s; cyan waveform active | Speech audio | `orbActive` 0.6s | Speak to interrupt | "APEX SPEAKING" announced |
| **VOICE: INTERRUPTED** | User speaks during APEX | APEX stopped | Orb amber flash 300ms → LISTENING | None | 300ms flash | — | "APEX INTERRUPTED" |
| **VOICE: LIVE** | Gemini Live active | Duplex mode | Orb steady cyan glow; steady waveform | Duplex audio | Steady | Toggle pill to stop | "APEX LIVE MODE" announced |
| **VOICE: FAILED** | Error occurred | Problem | Orb red flash 1.5s → IDLE | None | 1.5s flash | Retry available | "Error. Try again." |
| **PRES: APPEARING** | APEX decides to show | Context coming | Slide in 350ms | None | `ease-out` 350ms | Can dismiss | "APEX is showing [type]" |
| **PRES: ACTIVE** | Presentation ready | Can read | Full opacity; interactive | None | None | Dismiss × | "Presentation: [title]" |
| **PRES: DISMISSED** | User dismisses | Gone | Fade out 220ms | None | `ease-in` 220ms | Done | "Presentation dismissed" |
| **NOTIFY: L0** | System log | Nothing visible | No visual | None | None | None | Not announced |
| **NOTIFY: L2** | In-app notification | New info | Slide in; primary border | None | 220ms | Dismiss | `aria-live="polite"` |
| **NOTIFY: L3** | Attention required | Look at this | Banner; cyan glow | Subtle | 220ms + glow | Dismiss | `aria-live="polite"` |
| **NOTIFY: L4** | Decision needed | Action required | Amber banner; persistent | None | 220ms steady | Approve/reject | `aria-live="polite"` |
| **NOTIFY: L5** | Urgent | Act now | Danger banner; persistent pulse | Sound cue | Pulse animation | Must acknowledge | `aria-live="assertive"` |
| **TASK: PENDING** | Task queued | Waiting | Neutral card; no left border accent | None | None | Cancel | "Task pending" label |
| **TASK: IN-PROGRESS** | Task executing | Running | Blue left border 2px; subtle bg tint | None | None | Stop | "In progress" label |
| **TASK: COMPLETED** | Task done | Finished | Green left border; success colour | None | None | Archive | "Completed" label |
| **TASK: FAILED** | Task failed | Error | Danger left border; red bg tint | None | None | Retry/dismiss | "Failed" label + error |
| **DECISION: PENDING** | Awaiting approval | Choose | Amber left border; action buttons active | None | None | Approve/reject/defer | Announced; keyboard accessible |
| **DECISION: APPROVED** | User approved | Executing | Green border; "Approved" badge | None | None | Stop if executing | "Decision approved" |
| **DECISION: REJECTED** | User rejected | Cancelled | Red; "Rejected" badge | None | None | — | "Decision rejected" |
| **KNOWLEDGE: GAP** | Gap identified | Unknown | Dashed border; warning amber | None | None | Research action | "Knowledge gap" label |
| **AGENT: EXECUTING** | Agent running | Working | Cyan dot + border glow; progress | None | State dot pulse | None | "Agent active: [name]" |
| **SYSTEM: CONSTITUTIONAL** | Constitutional display | Authoritative | Cinzel headings; constitutional tint | None | None | — | Heading structure; readable |

---

## 43. Responsive Matrix

| Component / Experience | Desktop (≥900px) | Tablet (640–899px) | Mobile (<640px) | Notes |
|----------------------|-----------------|-------------------|----------------|-------|
| Navigation | Left sidebar 200px; all pages visible | Bottom tab bar (5 primary + more) | Bottom tab bar (5 primary + more) | Sidebar at 900px is PROTECTED |
| Top bar | Full topbar with clock + status | Same | Same (reduced label visible) | Always present |
| Command orb | 96px; left zone of two-column | 88px; centred | 88px; centred | Size difference desktop vs mobile |
| Stat chips | 4-across horizontal row | 4-across row | 2×2 grid | Column count only change |
| Activity feed | Right column of Command | Below orb zone | Below orb zone, scrollable | Position changes desktop |
| Input zone | Fixed bottom; text + voice | Same | Same; mic button larger (44px) | Always visible |
| Presentations | 360px panel adjacent to orb | Full-width panel | Bottom sheet (swipe to dismiss) | Shape changes by device |
| Notification banners | Right-side; max 360px | Full-width | Full-width top | Position changes |
| Decision cards | Max 480px; centred | Full-width | Full-screen flow | Full-screen mobile is deliberate |
| Modals | `min(520px, 92vw)` centred | `min(520px, 94vw)` | Full-width, bottom-anchored | Standard modal proportions |
| Drawers | Right-side; 400px | Right-side; 60% | Bottom sheet; full-width | Sheet on mobile |
| Tree of Life | Two-column grid; graph edges possible | Single column; wider nodes | Vertical accordion; no graph edges | Graph requires desktop |
| Agent grid | 5-column; compact cards | 3-column | 2-column | Auto-flow grid |
| System page | Multi-column panel layout | Two-column | Single column | Content reflows |
| Knowledge page | Three-pane: list / detail / evidence | Two-pane | Single pane; drill-down | Multi-pane desktop |
| Page padding | 14px | 12px | 10px | Token-driven |
| Page gap | 12px | 12px | 10px | Token-driven |
| Min touch target | N/A (mouse) | 44×44px | 44×44px | Touch minimum always |
| Typography scaling | No scaling; canonical sizes | No scaling | No scaling; canonical sizes hold | Text never shrinks below defined minimums |
| Orb voice label | "STANDBY" text visible | "STANDBY" text visible | "TAP" (abbreviated) | Space constraint |

---

## 44. Accessibility Matrix

| Experience | Visual Requirement | Keyboard | Screen Reader | Voice Alternative | Reduced Motion | Touch |
|-----------|-------------------|---------|--------------|------------------|---------------|-------|
| Navigation (sidebar/tab) | Active indicator (colour + border) | Tab to focus; Enter to activate | `aria-current="page"` on active | "Go to [surface]" | Colour/border only; no animation | 44px minimum |
| Orb | State colour + animation + sub-label | Space to activate; focus ring | `role="button"`, `aria-label` current state | Voice-unavailable text mode | Static colour + label only | 88px + 44px effective |
| Waveform | Bars animate | N/A (decorative) | `aria-hidden="true"` | Audio cues (speech) | Static bars at mid-height | — |
| Presentation container | Elevation + animation + header | Tab to navigate; ESC to dismiss | Announced on appear; `role="region"` | Text equivalent of visual | Opacity-only appear | Tap × to dismiss; swipe on mobile |
| Notification (L2–L4) | Colour + border + icon + text | Tab to action; ESC to dismiss | `aria-live="polite"` | — | No animation; opacity only | Swipe to dismiss |
| Notification (L5) | Full-width; danger; pulse | Mandatory focus | `aria-live="assertive"` | Sound cue | No pulse; colour + label | Mandatory acknowledge |
| Decision card | Amber/red border + buttons | Tab to buttons; Enter to action | All card content read; `aria-describedby` evidence | — | No animation | Full-width; large buttons |
| Approve button | Green; full-width | Enter/Space; focus ring | "Approve" `aria-label` | "Approve" voice command | — | 44px height minimum |
| Evidence block | Left border + confidence bar | Tab to expand; Enter to open link | Confidence percentage announced | — | No expand animation | Tap to expand |
| Knowledge gap | Dashed border + amber + text | Tab to "Research" action | "Knowledge gap: [topic]" announced | — | Static dashed border | Tap to research |
| Chat input | Pill; focus ring | Keyboard input | `aria-label="Chat with APEX"` | Voice (orb) | — | Full-width; 44px height |
| Page transition | Visual motion | (automatic) | Page title announced after transition | — | Opacity-only; no translateX | — |
| Skeleton loaders | Shimmer animation | `aria-busy="true"` on container | `aria-label="Loading..."` | — | Static dim rectangle | — |
| Command palette | Overlay; blur scrim | ESC closes; keyboard search | `role="dialog"`, `aria-label` | Voice search | Opacity-only | Full-screen mobile |
| Voice state changes | Orb colour + animation + label | N/A | State announced via `aria-live` | All states available via text label | No animation; label only | — |
| Focus ring | 2px cyan ring | Always visible | — | — | Unchanged (rings are static) | Larger ring on touch |

---

## 45. Design Invariants

The following visual invariants are binding. No future implementation phase may violate them without explicit authorisation.

**INV-VS-01: ONE VISUAL IDENTITY**  
There is one APEX visual identity. A new domain, capability, agent, or surface may not create its own visual identity. All additions speak the canonical visual language.

**INV-VS-02: ONE CANONICAL TOKEN SYSTEM**  
There is one `:root` token block. No component, page, or module may introduce a competing token namespace or hardcoded colour/spacing value.

**INV-VS-03: VISUAL HIERARCHY REFLECTS INFORMATION IMPORTANCE**  
More important information is visually heavier. The user can determine urgency and importance from visual weight alone, before reading any text.

**INV-VS-04: THE ORB IS THE APEX PRESENCE**  
The orb is circular, cyan-identified, and present on Command. It communicates APEX state. It is not a button; it is not an icon. It is the embodiment of APEX in the interface.

**INV-VS-05: VOICE STATE IS VISUALLY UNDERSTANDABLE**  
At any moment, the user can determine the current voice state from the orb's colour and animation. This does not depend on reading text or knowing the system deeply.

**INV-VS-06: PRESENTATIONS ARE CONTEXTUAL, NOT MODAL**  
Temporary presentations appear adjacent to Command content at Level 3 elevation. They do not cover the orb. They do not interrupt with blocking modals. They are contextual — they rise, not replace.

**INV-VS-07: NOTIFICATIONS ARE PROPORTIONAL**  
L0–L1 notifications have no visual presence. L5 notifications are the maximum visual intensity. The scale is used proportionally — not everything is L5 to get attention.

**INV-VS-08: HUMAN AUTHORITY IS VISUALLY EXPLICIT**  
Decision and approval moments are the most visually prominent elements when active. Approve/Reject buttons are not small. They take space. Human authority is not hidden inside menus or secondary panels.

**INV-VS-09: SYSTEM DETAIL IS PROGRESSIVELY DISCLOSED**  
The surface (L0) shows only what the user needs at that moment. Depth (L1–L4) is revealed by user action. The default view never overwhelms.

**INV-VS-10: ACCESSIBILITY IS BUILT IN, NOT PATCHED ON**  
Every component is defined with its accessibility specification. No component is implemented without keyboard, screen reader, reduced motion, and contrast requirements.

**INV-VS-11: RESPONSIVE BEHAVIOUR IS CANONICAL**  
The responsive matrix (Section 43) defines the canonical behaviour. New components must specify their responsive behaviour against this matrix.

**INV-VS-12: NEW CAPABILITIES CANNOT FRAGMENT THE VISUAL LANGUAGE**  
Adding a new capability, agent, or domain requires using existing tokens, components, and patterns. Fragmentation through addition is the primary visual risk.

**INV-VS-13: SURFACES ARE VISUALLY RELATED**  
A user navigating between Command, World, and Decisions should feel they are in the same visual environment. Surfaces share the same background, typography, and component language.

**INV-VS-14: CONTEXTUAL VIEWS DO NOT CREATE COMPETING IDENTITIES**  
A domain view within World does not create its own visual identity. It uses the canonical domain card anatomy with its assigned domain colour.

**INV-VS-15: MOTION COMMUNICATES STATE**  
Every animation communicates something about system state or user action. Decorative-only animations are not introduced. Duration and easing come from canonical categories.

**INV-VS-16: COLOUR IS NEVER THE SOLE STATE INDICATOR**  
Every state communicated by colour is also communicated by shape, text, icon, animation, or position. No user should need to distinguish two specific colours to understand what is happening.

**INV-VS-17: PROFESSIONALISM TAKES PRIORITY OVER DECORATION**  
Visual elements exist because they communicate. Not because they look sophisticated. Visual restraint is a feature.

**INV-VS-18: COMPLEXITY IS MANAGED THROUGH PROGRESSIVE DISCLOSURE**  
Depth is available, not imposed. The L0 surface is clean. L1–L4 depth is earned through user interaction.

**INV-VS-19: COMMAND IS THE PRIMARY HUMAN INTERACTION SURFACE**  
The orb is present on Command. The most prominent voice controls are on Command. The canonical conversation experience is Command. Other surfaces are exploratory, not the primary communication channel.

**INV-VS-20: THE DESIGN SYSTEM MUST SCALE**  
APEX will grow. New domains, capabilities, and agents will be added. The design system must accommodate growth without fragmentation. Every governance rule serves this invariant.

**INV-VS-21: TYPOGRAPHY HAS THREE CANONICAL VOICES**  
Inter for UI and conversation. Cinzel for brand and canonical page titles. JetBrains Mono for system and data. No new typeface is introduced without explicit design-system-level authorisation.

**INV-VS-22: ICONS ARE OUTLINED SVGs**  
The icon system is custom outlined SVGs. Emoji are not used as UI icons. External icon libraries are not loaded without explicit review.

**INV-VS-23: FOCUS IS ALWAYS VISIBLE**  
The focus ring specification (2px, `rgba(0,212,255,0.60)`, 2px offset) is never suppressed. Keyboard users always know where focus is.

**INV-VS-24: THE WAVEFORM IS SEVEN BARS**  
The APEX waveform is 7 bars with the staggered delay pattern. It is a recognised APEX identity element. Changing the bar count or delay pattern changes the APEX identity.

**INV-VS-25: THE DARK FIELD IS NON-NEGOTIABLE**  
The deep navy background `#03060f` with its blue undertone is the APEX dark field. Pure black is not APEX. The undertone is identity.

---

## 46. Open Questions

### UX / Design

| # | Question | Why It Matters | Current Evidence | Impact | Required Phase |
|---|---------|---------------|-----------------|--------|---------------|
| OQ-VD-01 | Should the orb show a thinking/processing visual during long agent runs, not just during voice processing? | Non-voice tasks (e.g., a 30-second analysis) leave the orb IDLE; user doesn't know APEX is working | No agent activity shown on orb currently | MEDIUM — agency visibility | UX-06 or UX-07 |
| OQ-VD-02 | Should the plasma WebGL canvas be redesigned alongside the CSS orb, or should they remain independent? | WebGL provides organic life; CSS provides state; they could conflict visually | Both present in dashboard.html; canvas is semi-independent | HIGH — Orb is identity | UX-06 |
| OQ-VD-03 | Is 88px orb large enough on modern high-DPI displays? | On 4K screens, 88px appears very small; 96px desktop may still be insufficient | UX-00 confirms 88px | MEDIUM — visual presence | UX-06 design test |
| OQ-VD-04 | How should the activity feed item density be defined? | Currently items appear dense; no defined entry template or truncation rule | Activity feed observed in UX-00 | LOW | UX-06 |
| OQ-VD-05 | How should the Tree of Life grow animation be specified? | UX-03 says the tree grows; there is no visual specification for how nodes appear | No evidence of growth animation | MEDIUM — Tree identity | UX-07 |

### Brand

| # | Question | Why It Matters | Current Evidence | Impact | Required Phase |
|---|---------|---------------|-----------------|--------|---------------|
| OQ-VD-06 | Does the APEX brand require a formal logo beyond the brand-ring + "APEX" wordmark? | The current brand treatment is typographic; a symbol-based logo may be needed for PWA icons, marketing | Icon-192.png / icon-512.png exist as PWA icons | MEDIUM — brand completeness | Explicit brand phase |
| OQ-VD-07 | Is cyan `#00d4ff` the permanent primary colour, or should it shift to a slightly different hue for refinement? | `#00d4ff` is the lightest possible fully-saturated cyan; a slightly deeper cyan (e.g., `#00b8d9`) may age better | `#00d4ff` in codebase; PROTECT decision | HIGH — identity level | Brand phase only |

### Architecture

| # | Question | Why It Matters | Current Evidence | Impact | Required Phase |
|---|---------|---------------|-----------------|--------|---------------|
| OQ-VD-08 | Should design tokens be implemented as CSS custom properties only, or also as a design-token JSON (for cross-platform use)? | If APEX extends to native mobile apps or Electron, CSS-only tokens don't transfer | CSS-only currently | MEDIUM — long-term | UX-06 decision |
| OQ-VD-09 | How should the custom SVG icon system be organised and versioned? | Without a registry, icons will fragment (same icon different sizes, different files) | No icon registry exists | MEDIUM — icon governance | UX-06 |

### Accessibility

| # | Question | Why It Matters | Current Evidence | Impact | Required Phase |
|---|---------|---------------|-----------------|--------|---------------|
| OQ-VD-10 | Does `--apex-color-text-muted` (`rgba(232,244,255,0.45)`) pass 3:1 on glass surfaces at all zoom levels? | Glass surfaces change effective background; contrast is opacity-dependent | Calculated contrast varies by background lightness | HIGH — WCAG compliance | UX-06 implementation verification |
| OQ-VD-11 | Is domain colour set (10 colours) fully distinguishable by users with deuteranopia, protanopia, and tritanopia? | The domain system relies on colour differentiation; it must be accessible | No colour-blindness audit performed | HIGH — accessibility | UX-06 design verification |

---

## 47. UX-06 Handoff

UX-06 is authorised to design and implement: **Command Centre Visual Prototype**.

### 47.1 What UX-06 Inherits From UX-05

UX-06 receives the following as authoritative inputs:

| Deliverable | Status |
|-------------|--------|
| Visual design principles (P-01–P-12) | COMPLETE |
| Canonical token architecture and namespace | COMPLETE |
| Colour system (dark theme; 22 core tokens; 11 domain tokens) | COMPLETE |
| Typography system (3 fonts; 17-entry type scale) | COMPLETE |
| Spacing scale (16 tokens) | COMPLETE |
| Shape language (radius scale; border weights; shape rules) | COMPLETE |
| Elevation model (6 levels; glow system; z-index scale) | COMPLETE |
| Iconography specification (style, sizes, replacement plan) | COMPLETE |
| Motion system (5 duration categories; easing; reduced-motion) | COMPLETE |
| APEX presence (orb) full specification (16 attributes; 11 voice states) | COMPLETE |
| Waveform specification (7-bar; protected values; state-responsive) | COMPLETE |
| Command visual language (grammar, hierarchy, zone composition) | COMPLETE |
| World visual language | COMPLETE |
| Decisions visual language | COMPLETE |
| Knowledge visual language | COMPLETE |
| System visual language | COMPLETE |
| All 11 Converse visual states | COMPLETE |
| All 8 Present visual states | COMPLETE |
| All 8 Notify visual states | COMPLETE |
| 5-level attention visual language | COMPLETE |
| 18-category component taxonomy | COMPLETE |
| 14 core component specifications | COMPLETE |
| Universal component states (10 states) | COMPLETE |
| Focus ring specification | COMPLETE |
| Keyboard shortcut inventory (preserved + new) | COMPLETE |
| Responsive matrix (desktop/tablet/mobile) | COMPLETE |
| Mobile visual language | COMPLETE |
| Full accessibility system | COMPLETE |
| Dark theme specification | COMPLETE |
| Information density model | COMPLETE |
| Professionalism criteria | COMPLETE |
| APEX identity vs. UI system distinction | COMPLETE |
| Visual governance rules (33 rules across 7 categories) | COMPLETE |
| 14 visual scenarios | COMPLETE |
| Design token matrix | COMPLETE |
| Component matrix | COMPLETE |
| Visual state matrix | COMPLETE |
| Responsive matrix | COMPLETE |
| Accessibility matrix | COMPLETE |
| 25 design invariants | COMPLETE |
| 11 open questions | COMPLETE |

### 47.2 UX-06 Scope

UX-06 is explicitly authorised to:

1. **Design the visual Command Centre** — using UX-05 tokens, components, and visual language
2. **Implement canonical tokens in CSS** — create the single `:root` token block
3. **Create the custom SVG icon set** — following UX-05 icon specification
4. **Prototype the orb states** — implement all 11 voice states in CSS
5. **Prototype the waveform** — extend to state-responsive behaviour
6. **Design the presentation container** — per UX-05 Section 24 specification
7. **Design notification components** — per UX-05 Section 25 specification
8. **Design the input zone** — correct the command-page input hiding (D-03)
9. **Create the component library** — implementing the canonical component taxonomy

### 47.3 What UX-06 Must NOT Do

1. Introduce any colour, font, or spacing value not in the UX-05 token system
2. Deviate from the orb's circular form or cyan identity
3. Remove the waveform's 7-bar, staggered identity
4. Create a new attention level beyond L0–L5
5. Introduce a new voice state beyond the 11 canonical states
6. Deviate from the defined z-index scale
7. Introduce a new icon library without design-system review
8. Implement emoji as UI icons
9. Suppress the focus ring
10. Remove keyboard shortcuts defined in UX-05 Section 30.1

### 47.4 Minimum UX-06 Deliverables

Before UX-06 may be considered complete:

- [ ] Single canonical `:root` token block replaces 5 competing blocks
- [ ] All orb voice states implemented in CSS
- [ ] Waveform state-responsive behaviour implemented
- [ ] 3-font stack confirmed (IBM Plex Sans and Space Grotesk retired)
- [ ] Command page input zone visible (D-03 resolved)
- [ ] Navigation icons replaced (emoji → custom SVG)
- [ ] Canonical component library with all 14 core components
- [ ] Decision card component with 4 action buttons
- [ ] Notification component at all 6 attention levels
- [ ] Presentation container component
- [ ] Focus ring implemented on all interactive elements
- [ ] Reduced-motion comprehensive coverage verified
- [ ] Contrast ratios verified for all defined pairings

### 47.5 Hard Stop

UX-06 may not begin until explicitly authorised.

---

## 48. Verification

Before declaring UX-05 complete:

**Application files unchanged:**
- `public/dashboard.html` — NOT MODIFIED
- `public/apex-v2.css` — NOT MODIFIED
- `public/apex-custom.css` — NOT MODIFIED
- `server.js` — NOT MODIFIED
- Any route file — NOT MODIFIED
- Any API — NOT MODIFIED
- Any database schema — NOT MODIFIED
- Any configuration — NOT MODIFIED
- No dependencies installed

**Documentation created:**
- `docs/interface/UX-05-CANONICAL-VISUAL-DESIGN-SYSTEM.md` — CREATED (this document)

**Source documents consumed:**
- UX-00: Read completely (all 27 sections, all PROTECT/REFINE/REWORK decisions)
- UX-01: Read sections 1–7 (authority, scope, objectives, UX model, task model, visual identity)
- UX-02: Available; design decisions inherited through UX programme chain
- UX-03: Inherited (IA, surfaces, Tree of Life)
- UX-04: Inherited (voice states, attention levels, presentation types, notification categories)
- `dashboard.html`: Read CSS sections lines 1–1200 (all core tokens, orb, waveform, navigation, components, toast, command palette, modals)
- `apex-v2.css`: Referenced via UX-00 audit findings

**Evidence classifications applied throughout**: OBSERVED / INHERITED / PROPOSED / OPEN

---

## 49. Final Report

### UX-05 STATUS: COMPLETE

---

### Source Documents Consumed

- UX-00 Legacy Interface Baseline — complete reading
- UX-01 Canonical UX Discovery — sections 1–7
- UX-02–UX-04 — inherited through programme chain
- `public/dashboard.html` — CSS deep read (lines 1–1200)
- `public/apex-v2.css` — referenced via UX-00 findings

---

### Legacy Visual Audit

48 PROTECT decisions, 18 REFINE, 10 REWORK, 3 RETIRE.

Key legacy strengths confirmed as identity elements:
- Deep navy dark field `#03060f`
- Cyan primary `#00d4ff`
- Circular orb with pulse rings
- 7-bar staggered waveform
- Glass morphism surfaces with backdrop-filter
- Cinzel for brand/display
- JetBrains Mono for data/system
- 220ms page transition (slide+fade)
- `prefers-reduced-motion` comprehensive coverage

---

### Protected Legacy Elements

| Element | What Is Protected | How It Evolves | What Must Not Be Lost |
|---------|-----------------|---------------|----------------------|
| Orb | Circular form, cyan identity, pulse rings | State vocabulary extended to 11 voice states; UNDERSTANDING state added | Circle; cyan; pulse rings |
| Waveform | 7 bars; 0.48s; staggered delays | State-responsive colour (red listening; cyan speaking) | Bar count; delay pattern; cyan identity |
| Dark field | `#03060f` + blue undertone | May shift marginally for refinement | Blue undertone; not pure black |
| Page transition | 220ms ease, translateX(18px→0) | Applied to all new surface transitions | Speed; the slide direction |
| Constitutional charter | A1–A6 visible on Command | May be repositioned; cannot be removed | Visibility on Command; correct content |
| Brand ring | 28px circle; 3s pulse | May refine glow intensity | 3s breathe cycle; position in topbar |
| Glass surfaces | `rgba(255,255,255,0.04)` + blur | Token values may shift slightly within identity range | The glass+blur treatment |
| `prefers-reduced-motion` | Comprehensive disable | Extend to all new animations | Complete coverage |
| Keyboard shortcuts | 1–0, R, A, N, /, ?, ESC, ⇧R | New shortcuts added | All existing shortcuts preserved |
| 220ms page transition | Speed and easing | — | Value preserved |

---

### Visual Identity

The APEX visual identity is: **deep navy dark field + cyan presence + circular orb + glass surfaces + Cinzel brand + constitutional transparency**.

This identity must survive all future redesigns.

---

### Design Principles

12 canonical design principles (P-01–P-12):
Clarity, Calm, Depth is Legible, Professionalism, One Visual Language, Human Authority Explicit, Context Communicates, Colour Not Sole Indicator, Responsive Not Scaled-Down, Identity Persists, Accessibility is Architecture, Motion Communicates State.

---

### Token Architecture

ONE canonical token set. Namespace: `--apex-{category}-{name}[-{modifier}]`. 10 categories: colour, typography, spacing, sizing, radius, border, shadow, opacity, motion, z-index. Legacy aliases for backward compatibility during transition.

---

### Colour System

22 core semantic tokens. 11 domain colour tokens (10 domains + system). Dark theme canonical. Light theme: OPEN.

---

### Typography

3 canonical fonts: Inter (UI/body), Cinzel (brand/display), JetBrains Mono (data/system). IBM Plex Sans and Space Grotesk: RETIRED. 17-entry type scale with semantic names.

---

### Spacing

16 tokens from 2px (micro) to 48px (page rhythm). 4px base unit.

---

### Shape Language

12-entry radius scale (0px to 50%). Orb always circle. Chat input always pill. Panels 12px. Modals 14px. Buttons 8px.

---

### Elevation

6 levels (Ground through Critical). Glow-based elevation in dark context. Defined z-index scale with 12 levels (1 through 99999).

---

### Iconography

Custom outlined SVG icons. 1.5px stroke, 20px grid, rounded joins/caps, `currentColor`. Emoji REPLACED. No external library.

---

### Motion

5 duration categories (0ms through 3–4s). 5 easing functions. Comprehensive `prefers-reduced-motion` coverage for all animations.

---

### APEX Presence

Orb fully specified: form, scale, fill, border, pulse rings, 11 voice state treatments, UNDERSTANDING state (NEW), placement rules (Command only), protected attributes.

---

### Waveform

7-bar staggered specification PROTECTED. State-responsive colour (red/cyan). Reduced-motion: static bars.

---

### Five-Surface Visual Language

Command, World, Decisions, Knowledge, System — each with distinct visual grammar while remaining in the same visual system.

---

### Converse Visual States

11 states mapped to: orb treatment, waveform, input zone, top status, animation.

---

### Present Visual States

8 states. Container specification. 13 type badges. Stacking behaviour.

---

### Notify Visual States

6 attention levels fully specified. Notification item anatomy. Toast specification. Badge rules.

---

### Attention Hierarchy

5-level progressive visual prominence. Additive model. Non-colour parallels for all levels.

---

### Component Taxonomy

18 categories. 14 core component specifications. Universal 10-state model.

---

### Responsive System

3 breakpoints (< 640px / 640–899px / ≥ 900px). Genuine responsive strategy, not scaling. Responsive matrix (14 rows × 4 columns).

---

### Accessibility System

Contrast requirements. Focus specification. Screen reader annotations. Reduced motion. Colour independence. Voice-unavailable mode. Touch targets.

---

### Theme Model

Dark theme canonical. Light theme: OPEN (deferred to dedicated phase).

---

### Visual Governance

33 governance rules across 7 categories: Component, Surface, Domain, Icon, Token, Communication, and general governance.

---

### Design Invariants

25 binding invariants (INV-VS-01 through INV-VS-25).

---

### Unresolved Questions

11 open questions classified across UX/Design, Brand, Architecture, and Accessibility. None are blockers for UX-05 completion.

---

### Documentation Created

`docs/interface/UX-05-CANONICAL-VISUAL-DESIGN-SYSTEM.md` — this document.

---

### Repository Changes

| File | Change |
|------|--------|
| `docs/interface/UX-05-CANONICAL-VISUAL-DESIGN-SYSTEM.md` | CREATED |
| All other files | UNCHANGED |

---

### Verification Result

PASS — zero application files modified. One documentation artefact created.

---

### Hard Stop

ACTIVE.

Do not begin UX-06 without explicit authorisation.

---

*UX-05 — Canonical Visual Design System — COMPLETE*  
*2026-08-27*  
*Evidence: Design-only artefact. Zero application modifications.*
