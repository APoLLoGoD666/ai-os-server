# VISUAL FORENSICS — V-01

**Date:** 2026-08-31  
**Authority:** APEX Visual/Product Overhaul Authorization  
**Phase:** V-01 — Real Browser Visual Forensics  
**Target:** `https://apex-ai-os-cos.uk/` (production, commit `5a6687f`)  
**Method:** Playwright 1.60.0 + Chromium 148 — authenticated headless browser

---

## Verification Methodology

Authentication: cookie login via `POST /auth/login` (DASHBOARD_PASSWORD) → JWT cookie, then app key submitted to in-page modal (APP_ACCESS_KEY via input field). Full authenticated session at production domain. No localhost, no staging.

Screenshots captured at all 10 viewports (viewport + full-page). DOM inspected via `page.evaluate()`. Computed styles extracted at each breakpoint. Token conflicts identified by comparing CSS custom property definitions against computed values.

**Screenshot archive:**
```
C:\Users\arwwo\AppData\Local\Temp\
  apex-unlocked-375.png   apex-unlocked-full-375.png
  apex-unlocked-390.png   apex-unlocked-full-390.png
  apex-unlocked-768.png   apex-unlocked-full-768.png
  apex-unlocked-1024.png  apex-unlocked-full-1024.png
  apex-unlocked-1440.png  apex-unlocked-full-1440.png
  apex-unlocked-1660.png  apex-unlocked-full-1660.png
```

---

## Part 1: Viewport Findings

### 375px / 390px — Mobile S

**Layout:**
- Topbar: full-width, 48px tall. Left: "Command" + "AI · Interface · Control". Centre: clock. No right-side content visible.
- No orb rendered. Command page begins directly with a 2×2 stat card grid.
- Stat cards (4): BALANCE, MESSAGES, TASKS, SYSTEM HEALTH — each roughly 50% width.
- "System Health" card clips content: "SUPABASE · RENDER" visible, "GITHUB · VOICE" partially cut.
- Activity feed below cards: raw event log (`Slow response — 1862ms`, `Slow response — 2819ms`, etc.)
- Large dead empty zone (~200px) below activity feed.
- Constitution section: 6 cards in 3 columns — text overflows in narrower columns at this size.
- Bottom: fixed 49px nav bar with 5 tabs (COMMAND · ACTIVITY · AGENTS · APPROVALS · MORE).
- Page scroll height: 900px (content fits within viewport height — no vertical scroll despite long content).

**Overflows detected:**
- `div.page.active`: scrollWidth 438px, clientWidth 375px — **63px horizontal overflow** — P1
- `div.cmd-stat.mint`: 103px vs 78px — content clipped in stat strip
- `div.stat-sub`: 87px vs 46px — sub-label clipped
- `div.health-num`: 56px vs 47px — health number overflows

**Computed styles:** bodyBg `rgb(6,15,30)`, panelBg `rgb(13,20,36)` — dark navy throughout.

---

### 480px — Mobile L

- Same layout as 375px/390px. Stat cards widen slightly.
- `div.ds-panel-header-left` overflows (174px vs 133px) — panel headers clip on tablet-small.
- `div.ds-panel` overflows (209px vs 194px) — some panels clip.
- Overflow on 480px is worse than 390px in some areas — layout doesn't improve linearly.

---

### 640px — Tablet S

- Bottom bar still visible (not switched to sidebar).
- `div.ds-panel` and `.ds-panel-header-left` continue to overflow.
- A `<text>` SVG element shows `scrollWidth:84, clientWidth:0` — SVG text rendering issue.
- Transition between bottom-bar and sidebar hasn't triggered yet at 640px.

---

### 768px — Tablet M

**Layout:**
- Still on mobile layout (bottom nav, not sidebar).
- **PlasmaOrb appears** — rendered in the top portion of the command page area.
- The orb occupies approximately 300px of vertical space (roughly 33% of the 900px viewport).
- Orb visual: dark navy sphere with concentric bright cyan rings, subtle glow, "APEX" text overlay. Prominent, animated, dramatic.
- Below orb: 4 stat cards in a horizontal row. Cards are now wider, text fits better.
- Activity feed: same raw event log.
- Constitution section: 3-column grid, readable at this width.
- Bottom fixed nav: same 5 tabs.
- **The orb at 768px occupies disproportionately large vertical space** — forces scrolling or compression of everything below it.

**Console:** 0 errors, 1 warning (audio analyser, headless-only).

---

### 900px — Desktop breakpoint trigger

- Sidebar switches from bottom-fixed to left-fixed column (200px wide).
- **2 console errors at this exact breakpoint** — likely a layout calculation race condition at the 900px transition. This is the only viewport that produces JS errors.
- The orb appears, now positioned within the 700px body column.

---

### 1024px — Desktop S

**Layout:**
- Left sidebar: 200px fixed. 21 nav items visible, spaced 40px each — last item "More" at y=816 (just fits within 852px sidebar height).
- Body: 824px wide.
- Orb: centred in body, prominent, large relative to available width. No natural size limit applied.
- Stat cards: horizontal row of 4 below orb. Cards now at adequate width.
- Chat input: 52px bar at bottom, stretches full body width (824px).
- Topbar: Page title "Command" in Cinzel serif (visible), subtitle "AI · Interface · Control" in JetBrains Mono.
- No orb overflow detected — fits within 824px.
- Constitution section: readable 3-column grid.

**Notable:** The desktop sidebar shows ALL 21 navigation items with no visual grouping. Domain pages (Finance, Health, University) are adjacent to meta pages (Agents, Knowledge, Governance) and unusual pages (Occult, Reality, Civilisation). The list reads as undifferentiated.

---

### 1280px — Desktop M

- Sidebar widens to 260px (CSS token `--sidebar-w: 200px` — discrepancy).
- Body: 1020px.
- Orb scales but remains fixed absolute size — the surrounding space increases, not the orb.
- `cmd-strip` width: 739px (out of 1020px body) — strip does not fill full body width.
- `span.nav-icon` overflows (27px vs 18px) — nav icons clip in their containers.

---

### 1440px — Desktop L (reference)

**Layout — full picture:**
- Sidebar: 280px. 21 nav items. No grouping. Active item ("Command") has a 2px indigo left bar + slightly brighter background.
- Topbar (48px): Left section = hamburger (hidden on desktop) + page title (Cinzel serif "Command", 13px, 0.16em tracking) + subtitle ("AI · Interface · Control", 9px, JetBrains Mono). Centre = clock ("02:28:05 AM", 18px tabular nums). Right = status indicators (barely visible at screenshot scale).
- Command body (1160px) splits into: `cmd-main-col` (880px) + `cmd-feed-col` (280px).
- `cmd-main-col`: PlasmaOrb canvas centred, ~360×360px wireframe sphere with glowing cyan rings. "APEX" text below orb. Stat cards below that. Constitution below that.
- `cmd-feed-col`: Right feed panel — shows email/notification items in small text.
- Chat input bar (52px): stretches full body width (1160px).

**Visual character at 1440px:**
Background is deep navy (`#060f1e`), not black. Sidebar is nearly black. Orb glows cyan against the navy. Stat cards have coloured top-border lines (cyan, amber, etc.) on near-black cards. Typography is small and dense throughout.

---

### 1660px — Desktop XL

- Sidebar stays at 280px (no wider breakpoint).
- Body: 1380px — large empty space around the orb at this width.
- `cmd-main-col` grows to accommodate; orb remains same absolute pixel size — looks small relative to 1100px+ content width.
- Feed column stays at 280px.
- Content gaps become very prominent at this width — the orb floats in an ocean of dark space.

---

## Part 2: Component Findings

### Topbar

**Technical:**
- Height: 48px (CSS token `--topbar-h` says 44px — token inconsistent with computed height).
- Background: `rgba(0,0,0,0.94)` with `backdrop-filter:blur(24px)`.
- Left section: hamburger (hidden on desktop via `display:none`), page title, subtitle — all inline-styled, not using design tokens.

**Design issues:**
- Page title uses `font-family:'Cinzel',serif` — a decorative Roman serif. This is the ONLY serif element in an otherwise sans-serif interface. The mismatch is jarring and inconsistent.
- Subtitle "AI · Interface · Control" is hardcoded per page in JetBrains Mono at 9px — extremely small, reads as pure decoration.
- The clock (18px, tabular nums) is the topbar centrepiece. This is an interesting choice but it means the primary information in the global chrome is time, not system state or AI status.
- Right side of topbar at 1440px shows pills/status indicators that are nearly invisible at the screenshot scale — insufficient contrast/prominence.
- On mobile the page title shifts and mobile elements toggle (hamburger appears) — two competing topbar layouts within one element.

---

### Sidebar Navigation (Desktop)

**Technical:**
- Position: static (in grid flow), 280px at ≥1280px.
- 21 nav items: 20 pages + More.
- Icon type: Unicode geometric characters (`⬡ ◈ ⊞ ◉ ◎ ◦ △ ⬟ ℃ ⟁ ♃ ⊕ ◷ ↺ ◳ ☑ ◉ ⊙ ◈ ⬡ ···`).

**Design issues:**
- 21 items with no section grouping. No dividers. No labels for categories.
- At 1024px (200px sidebar), item labels truncate before full nav is readable.
- Unicode symbols are inconsistent in visual weight, alignment, and semantic clarity. "♃" (Jupiter symbol) for Occult, "△" for Reality — clever but opaque.
- The active state is visually weak: 2px left bar + 3-5% brighter background. Not obviously active at a glance.
- Items like "Occult", "Reality", "Civilisation" are visible in the primary nav — raises product positioning questions.
- Sidebar has no footer information or user identity visible.

---

### Mobile Navigation (Bottom Bar)

**Technical:**
- Position: fixed, bottom: 0, height: 49px.
- 5 tabs: COMMAND · ACTIVITY · AGENTS · APPROVALS · MORE.
- Background: `rgba(0,0,0,0.97)` — near-black with slight transparency.

**Design issues:**
- All-caps labels in 10px — correct for bottom nav pattern.
- Active indicator is a cyan underline (confirmed in screenshots) — clear and readable.
- "MORE" tab presumably opens a sheet for other pages — but the sheet was not captured (requires interaction).
- The bottom nav is clean and functional. The 5-tab selection is reasonable.

---

### PlasmaOrb (Command Page)

**Technical:**
- Canvas element (JS-rendered by `PlasmaOrb.js`).
- 360×360px canvas, drawn at 1:1 device pixel ratio.
- 4 states: `standby`, `listening`, `thinking`, `speaking`.
- Animation: continuous, rotating wireframe sphere with orbit rings and particles.
- Glow via `shadowBlur` on canvas context.

**Design issues:**
- At 768px: orb consumes ~33% of visible viewport height — overwhelming.
- At 1440px: orb is centred in 880px wide column — adequate proportionally, but large.
- At 1660px: orb looks undersized relative to the expanded content area.
- Visual: The glowing cyan wireframe sphere is dramatic and sci-fi. This is the signature visual of the interface but it reads as gaming/entertainment UI rather than premium AI OS.
- The concentric ring glow contradicts the "no glow, no shadow" design philosophy defined in apex-v2.css.
- At mobile (<768px), the orb is hidden entirely. The command page defaults to stat cards. This creates a different experience identity between mobile and desktop.
- "APEX" label appears both inside the orb AND as a separate text label below it — redundant.

---

### Stat Cards (Command Page)

**Technical:**
- 4 cards: Balance, Messages, Tasks, System Health.
- Each has a coloured top-border line (2px) and matching text highlights.
- Colours: Balance (cyan/teal), Messages (amber/yellow), Tasks (blue), System Health (green).

**Design issues:**
- The coloured top lines are neon-bright against the dark card — functional signal but visually aggressive.
- "£0" balance with "No transactions" is the primary financial data visible in the main command — this is low-value information that dominates screen space.
- "System Health" card content clips at mobile sizes (GITHUB, VOICE cut off).
- The stat cards are repeated in at least two forms: `cmd-stat` (command page bottom strip) and what's rendered in the mobile-visible command layout. These appear to be different components.

---

### Activity Feed

**Technical:**
- Shows timestamped events: `HH:MM | CATEGORY | message`
- Category badges: TASKS (red/orange), INTELLIGENCE (purple), AGENT (red), COST (red), SYSTEM (grey).

**Design issues:**
- The feed shows raw performance telemetry: "Slow response — 1862ms", "Slow response — 2819ms" — 5 consecutive slow-response entries at the time of inspection.
- This is a P0 product problem: the primary activity visible to the user is a stream of error logs.
- Even if this data is accurate, surfacing raw ms timing as the main feed content is not premium UX.
- The category badges use many different colours (5+) in a small space — visually noisy.

---

### Constitution Section

**Technical:**
- 6 cards in a 3-column grid.
- Each card: alphanumeric label (A1–A6), title, short description, coloured status dot.
- "CONSTITUTION · APEX OPERATING CHARTER" header with "6 / 6 ARTICLES ACTIVE" indicator.

**Design:**
- This is conceptually the most interesting and unique section. It communicates the system's operating principles.
- Visual execution is functional but generic — standard cards with coloured dots.
- The all-caps monospace header creates the right sobriety.
- The descriptions fit in the cards at 1024px+; at 390px the 3-column grid makes each cell very narrow.

---

### Chat Input Zone

**Technical:**
- Height: 52px fixed. Full body width.
- Background: `rgba(0,0,0,0.95)`.
- Border-top: `1px solid var(--b1)`.
- Placeholder: "Today's entry — speak it or type it…"

**Design:**
- The input zone is appropriately minimal.
- At 1440px the input feels too narrow vertically (52px) for a conversational entry point.
- The "Ask APEX anything..." alternative placeholder in some screenshots suggests dual placeholder state.
- At 1660px, the 52px input stretches to 1380px wide — an extremely wide single-line input.

---

## Part 3: Design System Findings

### Critical — CSS Architecture

**Finding:** The dashboard embeds 4 complete design system rewrites as sequential inline `<style>` blocks (v11, v12, Unification, MASTER). Total inline CSS: ~276KB. The external `apex-v2.css` file (1,446 lines) is **not linked** and has no effect on production.

**Consequence:** Every design system iteration was appended rather than replacing the previous. The MASTER block (42KB) wins the cascade and defines the effective token values. v11 through Unification are partially shadowed — their token definitions are overridden but their component-level rules may still be partially active where not re-overridden.

**Impact:** The codebase carries ~233KB of dead or partially-dead CSS. Targeted overrides become difficult because any new rule may be fighting 3–4 prior definitions of the same property.

### Token Conflicts (Active vs Intent)

| Token | Active (MASTER) | apex-v2.css intent | Comment |
|-------|----------------|---------------------|---------|
| `--bg` | `#060f1e` | `#000000` | Navy vs. pure black |
| `--accent` | `#00d4ff` | `#6366f1` | Cyan vs. indigo |
| `--surface` | `#0d1424` | `#0c0c0c` | Navy vs. near-black |
| `--text` | `#eef2ff` | `#f4f4f5` | Indigo-tinted vs. neutral |
| `--topbar-h` | 48px computed | 44px in token | 4px discrepancy |

### Duplicated Visual Systems

- `cmd-stat` and `ds-stat-card` — two card component systems with overlapping purpose
- `ds-panel` and various section-specific panel classes — partially overlapping
- `ds-btn` with multiple size/colour variants + `btn--xs` alias — inconsistent naming
- `nav-btn` (desktop sidebar) vs mobile bottom bar — two completely separate nav components with no shared code or token usage

### Obsolete Styles

- v11 style block (123KB): partially shadowed by later blocks
- v12 style block (40KB): partially shadowed by later blocks
- `apex-v2.css` (1,446 lines): entirely unused (not linked)
- `apex-custom.css`: linked but empty
- Animated `@keyframes brand-pulse`, `spin-cw`, `spin-ccw` etc. (preserved from older versions, now killed by MASTER's `animation: none`)

### Inconsistent Components

- Topbar page title: inline `font-family:'Cinzel',serif` — no design token
- Topbar subtitle: inline `font-family:'JetBrains Mono',monospace` — no design token
- Mobile hamburger: inline `border:1.5px solid rgba(0,212,255,0.4); color:#00d4ff` — hardcoded colour not from token
- Nav button active state: uses `::before` pseudo-element with `background: var(--accent)` — token-driven but icon overflow of `span.nav-icon` (scrollWidth 29px vs 18px container)

---

## Part 4: Product Critique

### 1. Does it look like a coherent product?
**Partially.** The dark-blue aesthetic is internally consistent. But the Cinzel serif topbar title breaks the typographic coherence. Multiple competing colour systems (indigo from apex-v2.css fighting cyan from MASTER) create subtle inconsistency throughout.

### 2. Does it feel premium?
**No.** The neon-cyan glow on the orb and card borders reads as gaming UI circa 2018 (Discord, Overwolf, Steam overlay). Premium AI products (Perplexity, Linear, Superhuman) use restrained palettes, strong typography, and avoid active glow effects.

### 3. Does it feel unmistakably APEX?
**Not yet.** There is no distinctive visual identity beyond "dark blue + cyan + glowing orb." The constitution section is genuinely distinctive but visually underexpressed. The brand name appears inconsistently in various font treatments.

### 4. Is the visual hierarchy strong?
**Weak.** On the command page at 1440px: the orb, stat cards, constitution, and activity feed compete equally for attention with no clear primary/secondary/tertiary structure. The orb dominates by size but carries no actionable information. The most important content (system state, tasks, messages) is in secondary-prominence cards below it.

### 5. Is information density appropriate?
**Mixed.** Mobile (390px): good density, four stat cards cover key metrics well. Desktop (1440px): the orb takes 360×360px of the 880×606px cmd-main-col — 42% of the area for pure decoration. The remaining 58% carries the actual data.

### 6. Does the command centre feel central to the experience?
**Not clearly.** The Command page IS the default, which is correct. But the primary content of the command page (the orb) communicates "I am APEX" rather than "here is what you need right now." The actionable data (tasks pending, messages, balance) is subordinate.

### 7. Is navigation intuitive?
**Desktop: poor. Mobile: acceptable.** 21 items in an ungrouped vertical list requires memorisation. "Occult", "Reality", "Civilisation" alongside "Finance" and "Governance" requires a mental model the UI doesn't provide. Mobile 5-tab bottom nav is clear and sufficient.

### 8. Are the different domains visually coherent?
**Unknown from screenshots captured.** The forensics only captured the command page content at each viewport. However, 89 simultaneous `.ds-panel` instances and 22 `.ds-stat-card` instances suggest consistent component reuse across sections.

### 9. Is the system state understandable?
**Poorly.** The activity feed (primary real-time signal) shows raw performance errors. The "System Health" card with SUPABASE · RENDER · GITHUB · VOICE indicators is good signal — but rendered in too small a space at mobile.

### 10. Does the interface communicate intelligence?
**Weakly.** The orb is meant to signify AI presence but is static decoration in standby mode. The meaningful intelligence signals (agent run counts, cost tracking, episodic memory stats) are deep in the Intelligence/Memory pages.

### 11. Does it feel alive without being distracting?
**Fails.** The orb is always animating — even when the system is idle. This creates false activity signalling. The activity feed showing "Slow response" errors makes the system feel unwell rather than alive.

### 12. Are there redundant or visually noisy elements?
**Yes:**
- "APEX" label below the orb + "APEX" inside the orb
- Three font families in the topbar alone (Inter, Cinzel, JetBrains Mono)
- 5+ category badge colours in the activity feed
- Multiple neon accent colours in the stat cards (cyan, amber, purple, green, red)

### 13. Are typography and spacing consistent?
**No.** Base font size is 13px (very small). Label sizes go down to 8px and 9px. Letter-spacing varies from 0.01em to 0.40em across components. The Cinzel serif in the topbar is visually isolated — nothing else in the interface uses serif typography.

### 14. Are colours semantically meaningful?
**Inconsistently.** Green = healthy/success ✓. Red = error ✓. But cyan is simultaneously: the accent colour, the orb ring colour, the active navigation indicator, info-category badges, the card border highlight. Cyan has no semantic specificity — it just means "APEX".

### 15. Are icons consistent?
**No.** Unicode geometric characters (⬡ ◈ ⊞ ◉ ◎) have varying visual weights, baselines, and metaphorical clarity. They function but don't constitute an icon system.

### 16. Are cards/panels overused?
**Yes.** 89 `.ds-panel` + 22 `.ds-stat-card` instances simultaneously rendered. The card-for-everything pattern creates visual monotony — everything looks equally important.

### 17. Are empty states intentional?
**No.** The large empty zone (~200px) below the activity feed on mobile at 390px appears to be unintentional dead space. The "£0 No transactions" balance state is real data but communicates emptiness without intent.

### 18. Are mobile layouts genuinely designed rather than merely compressed?
**Partially.** The mobile bottom nav (5 tabs) is a proper mobile-first pattern. But the mobile command page skips the orb entirely and goes straight to stat cards — this appears to be a consequence of the orb not fitting rather than a deliberate design decision. The mobile experience is functional but feels like a compressed desktop, not a designed mobile product.

### 19. What makes the interface look amateur?
1. The PlasmaOrb glow contradicts the stated zero-glow design philosophy — tension between intent and execution
2. Cinzel serif title in an otherwise monospace/sans-serif interface — typographic incoherence
3. Raw "Slow response — 1862ms" errors as primary activity feed content
4. 21-item ungrouped navigation list — no information hierarchy
5. Four competing colour accents in the stat cards (cyan, amber, green, blue)
6. The active page overlay pattern (20 pages simultaneously `display:flex`) renders all 89+ panels at all times — functional but architecturally excessive
7. Topbar subtitle "AI · Interface · Control" at 9px JetBrains Mono — pseudo-technical decoration
8. Token conflict between design-system versions visible as subtle colour inconsistencies

### 20. What would make it look like a premium AI product?
1. **Commit to pure black** (`#000000`) — not dark navy. Pure black makes every UI element stand out with maximum contrast.
2. **Replace the orb with a minimal, data-driven presence** — a pulsing data indicator that reflects actual system load, not a sci-fi sphere
3. **One accent colour** — applied with precision and semantic meaning
4. **One font family** (Inter) — at 4 weights (400/500/600/700). Remove Cinzel and JetBrains Mono.
5. **Curated navigation** — group into 4–5 logical areas, hide advanced/rare items
6. **Activity feed as insight, not error log** — surface meaningful patterns, not raw timing
7. **Command page as a status dashboard** — what happened since I was last here, what needs attention now
8. **Eliminate neon glow** everywhere

---

## Part 5: Prioritised Defect Inventory

### P0 — Blocking (Break the product)

| ID | Location | Issue |
|----|----------|-------|
| P0-01 | Activity feed, all viewports | Primary visible content is raw performance errors: "Slow response — 1862ms" × 5 entries. This is debugging output surfaced as product content. |
| P0-02 | Mobile 375–480px | `div.page.active` horizontal overflow: 63px at 375px. Active page content wider than viewport. Causes horizontal scroll or clipping. |

### P1 — Usability (Significantly degrades experience)

| ID | Location | Issue |
|----|----------|-------|
| P1-01 | Desktop nav, all widths | 21 navigation items with no grouping, no hierarchy, no visual logic. Cannot be navigated without memorisation. |
| P1-02 | Mobile 375–480px | `cmd-stat` cards overflow: stat sub-labels and numbers clip in the stat strip. Content hidden. |
| P1-03 | Mobile 390px | System Health card clips — GITHUB and VOICE statuses cut off. |
| P1-04 | All viewports | No clear primary action or next step visible in the command page. Orb conveys no actionable information. The most important things (tasks, messages) are visually subordinate. |
| P1-05 | All desktop | Topbar subtitle "AI · Interface · Control" at 9px JetBrains Mono: unreadable on standard displays. Dead UI chrome. |
| P1-06 | 900px breakpoint | 2 console errors at exactly this breakpoint — likely a layout transition race condition. |
| P1-07 | 768px tablet | Orb takes ~33% of viewport height — compresses all other content. At a tablet viewport, the orb is disproportionately large. |

### P2 — Design Inconsistencies

| ID | Location | Issue |
|----|----------|-------|
| P2-01 | Topbar | Cinzel serif font used for page title — only serif element in the interface. Visually isolated and inconsistent. |
| P2-02 | All | Token conflict: `--bg` is `#060f1e` (navy) not `#000000` (black) — 4 inline CSS blocks not consolidated. |
| P2-03 | Desktop nav | Unicode geometric chars as icons — inconsistent visual weight, no semantic icon system. |
| P2-04 | Active nav state | 2px indigo left bar + minimal background tint — weak active signal, not obviously active at a glance. |
| P2-05 | `--sidebar-w` token | CSS token says `200px`, actual sidebar is 260–280px at larger viewports. Token and layout disagree. |
| P2-06 | `--topbar-h` token | Token says `44px`, computed height is `48px`. Discrepancy. |
| P2-07 | Stat cards | 5+ distinct neon accent colours in the stat card set — colour not semantically unified. |
| P2-08 | 1660px | Orb appears undersized relative to expanded body column — no max-width scaling. |
| P2-09 | Command page | "APEX" text rendered both inside orb and as separate label below — redundant. |
| P2-10 | All | Simultaneous rendering of all 20 pages (opacity:0, position:absolute) — 89 panels and 22 stat cards computed at all times. Performance and cognitive weight penalty. |

### P3 — Polish Opportunities

| ID | Location | Issue |
|----|----------|-------|
| P3-01 | CSS architecture | 276KB of inline CSS across 4 design system generations. Should be consolidated to one authoritative system. |
| P3-02 | CSS | `apex-v2.css` exists but is unlinked. Should either be linked (and become the authority) or deleted. |
| P3-03 | Dashboard | 19,870-line monolithic HTML file containing all CSS, JS, and HTML — maintainability concern. |
| P3-04 | Activity feed | Empty zone below feed at mobile — intentionless dead space. |
| P3-05 | Constitution | 3-column grid at 390px creates very narrow cells — constitution cards are barely readable. |
| P3-06 | Chat input | 52px input bar stretches to 1380px at 1660px — extremely wide single-line entry. Should have max-width. |
| P3-07 | Topbar | Hidden elements (hamburger on desktop, mobilePageName) add DOM noise but serve no function on their display breakpoint. |
| P3-08 | Sidebar footer | Sidebar has a `ds-sidebar-footer` element defined in CSS but it may be empty or not rendered. |

---

## Part 6: Duplicated Visual Systems

| System A | System B | Problem |
|----------|----------|---------|
| `cmd-stat` (command strip cards) | `ds-stat-card` (section stat cards) | Two card systems with overlapping purpose, different markup, different class names |
| `nav-btn` (desktop sidebar) | Mobile bottom tab | Two completely separate nav components — no shared CSS ancestry |
| `.ds-panel` | Section-specific panels | Panel is the base, but many sections define their own panel-like containers outside `.ds-panel` |
| `ds-btn.xs` | `btn--xs` | Duplicated size variant under different names |
| `--border-cyan`/`--border-cyan-soft` in apex-v2.css | `rgba(0,212,255,...)` in MASTER | Same colour, different token names — border-cyan was indigo in v2 but cyan in MASTER |

---

## Part 7: Recommended Visual Architecture

### Design Philosophy — Proposed

**Designation:** APEX Zero  
**Core principle:** Intelligence visible. Everything else absent.

The interface should feel like a tool built by someone who has thought deeply about what information matters and removed everything else. Dark ≠ sci-fi. Dark = focus.

### Colour Philosophy

```
Base
  --void:    #000000    Pure black — the canvas. Non-negotiable.
  --shell:   #0a0a0a    Primary surfaces. 4% above void.
  --lift:    #141414    Elevated surfaces. 8% above void.
  --raise:   #1c1c1c    Modal / popover surfaces.

Borders
  --edge:    rgba(255,255,255,0.06)   Structural dividers (barely there)
  --rim:     rgba(255,255,255,0.10)   Default borders
  --wire:    rgba(255,255,255,0.18)   Emphasis borders

One accent
  --signal:  #6366f1    Indigo — APEX's structural colour
  --signal-dim: rgba(99,102,241,0.12)
  --signal-hi:  #818cf8

Semantic palette (restrained — used only for meaning)
  --ok:      #34d399    Success / online / active
  --warn:    #fbbf24    Warning / attention
  --alert:   #f87171    Error / offline / critical
  --info:    #38bdf8    Informational (not accent)

Text
  --ink:     #f5f5f5    Primary text
  --dim:     #a3a3a3    Secondary text
  --ghost:   #525252    Disabled / placeholder
```

**Accent is ONE colour (indigo).** Semantic colours are used only for meaning — never as decoration. Cyan is retired as an accent.

### Typography

```
Family: Inter only
  Body:    14px / 400 / lh 1.55
  Label:   11px / 600 / ls 0.06em / uppercase
  Value:   variable — large numbers use 28–40px / 400 / tabular-nums
  Heading: 16–20px / 600
  Mono:    JetBrains Mono — code blocks and timestamps only
  Serif:   REMOVED (Cinzel retired)
```

Remove Cinzel from Google Fonts loading. Remove all font-family inline styles. One font family throughout.

### Spacing Scale

```
--sp-1:  4px    --sp-2:  8px    --sp-3: 12px
--sp-4: 16px    --sp-5: 20px    --sp-6: 24px
--sp-8: 32px   --sp-10: 40px   --sp-12: 48px
--sp-16: 64px
```

### Surface Hierarchy

```
Level 0: body (#000000) — the void
Level 1: --shell (#0a0a0a) — panels, cards
Level 2: --lift (#141414) — elevated panels, modals
Level 3: --raise (#1c1c1c) — tooltips, popovers
```

No navy tint. Pure grey scale above pure black.

### Border / Elevation System

No box-shadows for elevation. Elevation is expressed through surface brightness only (higher surface = lighter background). Borders are structural only — `--edge` for separators, `--rim` for interactive elements.

### Navigation Model

**Desktop (≥900px):**
- Sidebar: 220px fixed width (single breakpoint value, matches CSS token)
- 4 navigation groups with labels:
  ```
  CORE
    Command
    Overview
    Operation
  
  DOMAINS
    Finance | Business | Health | University
    Research | Civilisation | Reality

  SYSTEM
    Agents | Approvals | Activity
    Intelligence | Memory | Governance

  MORE (collapsed by default)
    Network | Occult | Knowledge
  ```
- Active state: full accent-coloured left bar (3px), brighter text, signal-dim background
- Icons: SVG icon set (Lucide or custom) replacing Unicode characters

**Mobile (<900px):**
- Bottom fixed bar: 56px (larger touch target)
- 5 tabs: COMMAND · ACTIVITY · AGENTS · APPROVALS · MORE
- Retained as-is — already appropriate pattern

### Command Centre Composition

Replace the PlasmaOrb as primary composition element.

**Proposed command page layout:**
```
Topbar (48px): Brand · Clock · System status · Notifications

Sidebar (220px) | Body (remaining)
                  ┌─────────────────────────────────┐
                  │ SYSTEM PRESENCE (top ~180px)    │
                  │ A minimal, data-driven status   │
                  │ indicator — not a 3D sphere.    │
                  │ Shows: AI state, uptime, last   │
                  │ action, active agents           │
                  ├─────────────────────────────────┤
                  │ ATTENTION STREAM (scrollable)   │
                  │ What needs your attention now?  │
                  │ Tasks pending approval          │
                  │ Messages since last session     │
                  │ Significant AI actions taken    │
                  ├─────────────────────────────────┤
                  │ QUICK STATS (2 or 3 only)       │
                  │ One number that matters today   │
                  └─────────────────────────────────┘

Input zone (56px): Conversational + voice
```

### Card / Panel Philosophy

One card type. Two elevations. Cards communicate information hierarchy through typography and spacing, not neon borders.

```
Panel (--shell bg, --rim border):
  - Section containers
  - 16px padding
  - No top accent line by default

Card (--lift bg, --rim border):
  - Data items, list entries
  - 12–16px padding

Accent card (Card + 2px --signal top line):
  - Used only for active / primary items
  - Not for decoration
```

### State System

```
Default:   --shell bg, --rim border, --dim text
Hover:     --lift bg, --wire border, --ink text
Active:    --shell bg, --signal border, --ink text, --signal left-bar
Focus:     --wire border + 2px --signal-dim inset ring
Error:     --alert border-tint, --alert text
Success:   --ok dot or text
```

### Motion Philosophy

Minimal. Purposeful. Never decorative.

- Page transitions: opacity 120ms ease — no slide, no scale
- Panels: `panelIn` 150ms fade-up (3px) — retained, shortened
- Status changes: colour transitions 80ms — instant enough to feel reactive
- No continuous idle animations (orb animation → remove or make opt-in)
- No pulse rings, no glow pulses

### Responsive Philosophy

Two modes only:
- Mobile (< 900px): bottom nav, stacked layout, optimised for touch
- Desktop (≥ 900px): sidebar, two-column command, keyboard/voice optimised

Single breakpoint. No intermediate tweaks. Design each mode properly rather than compensating.

---

## Part 8: Proposed Implementation Sequence

**V-02 — CSS Foundation Reset**
1. Consolidate 4 inline style blocks into one (eliminate v11/v12/Unification, keep MASTER as base, apply new tokens)
2. Establish definitive token set in a single `:root` block
3. Remove Cinzel font, remove JetBrains Mono from structural elements (keep for code/mono contexts)
4. Link `apex-v2.css` properly OR convert it to the new authority (one authoritative external file)
5. Fix `--sidebar-w` and `--topbar-h` token discrepancies

**V-03 — Navigation Overhaul**
1. Desktop sidebar: introduce 4 nav groups with labels, replace Unicode icons with SVG
2. Strengthen active state visual
3. Sidebar width: 220px single value across all desktop viewports
4. Mobile bottom nav: increase to 56px, review icon treatment

**V-04 — Topbar Rebuild**
1. Remove Cinzel inline font, unify topbar typography to Inter
2. Promote system status to topbar right (not hidden pills)
3. Remove 9px subtitle dead text
4. Retain clock as centre but reduce to secondary prominence

**V-05 — Command Page Redesign**
1. Rethink the orb: reduce prominence, make it data-driven or replace with a status composition
2. Introduce attention stream (what needs my focus now)
3. Fix stat cards: reduce to 2–3 key numbers, not 4 with neon borders
4. Fix activity feed: filter out raw timing errors, surface meaningful insights

**V-06 — Mobile Command Redesign**
1. Design the mobile command experience intentionally (not as compressed desktop)
2. Orb decision: include a simplified version or design a mobile-native status element
3. Fix stat card overflow at 375–480px

**V-07 — Section Pages Audit**
1. Audit all 20 pages for design consistency using new token system
2. Fix any section-specific CSS that conflicts with new tokens
3. Standardise panel/card usage across sections

**V-08 — Typography & Spacing Normalisation**
1. Audit all font sizes (many are ≤9px — below legibility threshold)
2. Normalise letter-spacing — current range (0.01em to 0.40em) is excessive
3. Review and standardise spacing between components

**V-09 — Activity Feed & Empty States**
1. Filter activity feed: remove raw performance timing from primary feed
2. Design intentional empty states for all zero-data scenarios
3. Design loading states (currently not observed)

**V-10 — Certification**
1. Full visual regression pass at all 10 viewports
2. Playwright visual confirmation
3. Update certification documents

---

*V-01 forensics complete: 2026-08-31*  
*No production modifications performed.*  
*Next phase: V-02 implementation (requires explicit authorization).*

---

**HARD STOP.**

V-01 forensic/design package complete. Awaiting V-02 authorization.
