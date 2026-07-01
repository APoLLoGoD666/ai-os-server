# APEX 1000 — Upgrade & Creative Improvement Plan
> 20 categories × 50 items = 1000 concrete, significant upgrades

---

## CAT 01 — CSS Architecture Consolidation (50)
01. Merge all 7 stacked `<style>` blocks into one canonical block — eliminate all `!important` chains
02. Create `apex-tokens.css` extracted partial — single source of truth for all `--ax-*` variables
03. Delete all legacy `--bg`, `--primary`, `--secondary`, `--accent`, `--danger`, `--success` variable references — replace with `--ax-*` equivalents
04. Remove all dead CSS rules (selectors targeting removed elements like `#_ovr_mb`, `#_ovr_card`)
05. Enforce strict selector specificity order: tokens → base → components → pages → utilities
06. Replace all `!important` overrides with higher-specificity selectors where possible
07. Create a `@layer` stack: `@layer tokens, base, components, pages, overrides`
08. Consolidate the 3 skeleton shimmer keyframes (`skel-shimmer`, `ax-skel`, `v12-skel`, `apex-skel`) into one
09. Consolidate 4 pulse keyframes (`orbPulse`, `ax-pulse`, `v12-pulse`, `dot-pulse`) into one parameterised version
10. Consolidate 3 spin keyframes (`spin-cw`, `spin-ccw`, `j-spin-fwd`) into one with `animation-direction`
11. Remove duplicate `.ds-btn` definitions across blocks — one canonical rule
12. Remove duplicate `.ds-panel` definitions — one canonical rule
13. Remove duplicate `.ds-badge` definitions — one canonical rule
14. Remove all commented-out dead code blocks
15. Add a CSS file-header comment block listing all layers, token namespaces, and last-modified date
16. Replace all hardcoded `px` font-sizes with `rem` equivalents using a 16px root
17. Replace all hardcoded `px` spacing values inside component rules with `--spacing-*` tokens
18. Replace all hardcoded hex colors inside component rules with `--ax-*` token references
19. Create `--ax-shadow-sm`, `--ax-shadow-md`, `--ax-shadow-lg`, `--ax-shadow-xl` tokens and use them everywhere
20. Create `--ax-border-subtle`, `--ax-border-default`, `--ax-border-strong` tokens
21. Create `--ax-transition-fast`, `--ax-transition-normal`, `--ax-transition-slow` tokens
22. Add `--ax-radius-xs: 3px` through `--ax-radius-2xl: 24px` — full radius scale
23. Audit and remove all `z-index` values above 100 — replace with a named z-index scale token set
24. Add a named z-index scale: `--z-sidebar: 40`, `--z-topbar: 50`, `--z-modal: 80`, `--z-toast: 90`, `--z-tooltip: 95`
25. Split all `@keyframes` into a dedicated `<style id="apex-keyframes">` block at top for discoverability
26. Add `will-change: transform` only to elements that actually animate transforms — remove from static elements
27. Audit `backdrop-filter` usage — ensure vendor prefixes present for Safari
28. Replace all `transition: all` with explicit property transitions
29. Remove all `overflow: hidden` on elements that don't need it — find and audit each
30. Add explicit `box-sizing: border-box` to all components that use padding + width together
31. Create utility classes: `.text-primary`, `.text-muted`, `.text-accent`, `.text-success`, `.text-warning`, `.text-error`
32. Create spacing utilities: `.mt-xs` through `.mt-xl`, `.mb-xs` through `.mb-xl`, `.gap-sm`, `.gap-md`, `.gap-lg`
33. Create display utilities: `.flex-center`, `.flex-between`, `.flex-col`, `.grid-2`, `.grid-3`, `.grid-4`
34. Eliminate all inline `style=""` for colors — migrate to class-based or CSS custom property approach
35. Eliminate all inline `style=""` for spacing — migrate to utility classes
36. Add a `[data-theme="light"]` attribute hook — prep all tokens for light mode inversion (no UI yet, just the CSS variables)
37. Add `color-scheme: dark` to `:root` — enables browser-native dark scrollbars, inputs, select
38. Ensure all media queries use consistent breakpoints: `480px`, `768px`, `1024px`, `1280px`
39. Add `container-type: inline-size` to `.ds-panel` for future container queries
40. Remove all `position: relative` declarations that exist solely to contain absolutely-positioned children that were removed
41. Audit all `flex: 1` usages — replace ambiguous ones with explicit `flex-grow: 1; flex-shrink: 1; flex-basis: 0`
42. Replace `min-width: 0` hacks with proper `overflow: hidden` or `min-width: 0` with comment explaining why
43. Add a CSS reset for `fieldset`, `legend`, `button`, `input`, `select`, `textarea` to normalize browser defaults
44. Add `text-size-adjust: 100%` to prevent iOS font boosting
45. Audit and fix all `height: 100%` on flex children — replace with `align-self: stretch` where appropriate
46. Add `isolation: isolate` to modal and overlay containers to create explicit stacking contexts
47. Remove all `transform: translateZ(0)` GPU hacks — replace with `will-change` where justified
48. Add `contain: layout style` to page containers for paint isolation
49. Create `.visually-hidden` utility class (accessible, not `display:none`)
50. Add `@supports (backdrop-filter: blur(1px))` guard around all glassmorphism rules with a solid fallback

---

## CAT 02 — Design Token Expansion (50)
51. Add `--ax-color-bg-0: #02040c` (deepest background for outer shell)
52. Add `--ax-color-bg-1: #06101f` (page background)
53. Add `--ax-color-bg-2: #0a1628` (widget background)
54. Add `--ax-color-bg-3: #0d1a2e` (card background)
55. Add `--ax-color-bg-4: #101f36` (elevated card / hover state)
56. Add `--ax-color-bg-5: #14243e` (tooltip / active highlight)
57. Add `--ax-color-border-0: rgba(255,255,255,0.04)` (hairline)
58. Add `--ax-color-border-1: rgba(255,255,255,0.07)` (card border)
59. Add `--ax-color-border-2: rgba(255,255,255,0.12)` (active border)
60. Add `--ax-color-border-3: rgba(91,158,255,0.25)` (accent border)
61. Add `--ax-text-0: #f3f7fb` (heading)
62. Add `--ax-text-1: #c7d2dd` (body)
63. Add `--ax-text-2: #aab6c2` (secondary)
64. Add `--ax-text-3: #8893a0` (muted)
65. Add `--ax-text-4: #7f8c99` (dim / disabled)
66. Add domain tokens: `--ax-sys: #5b9eff`, `--ax-file: #3fd29a`, `--ax-uni: #7c6fff`, `--ax-fin: #efb45a`, `--ax-biz: #ec7fa3`
67. Add domain glow tokens: `--ax-sys-glow: rgba(91,158,255,0.15)` through `--ax-biz-glow`
68. Add domain muted tokens: `--ax-sys-muted: rgba(91,158,255,0.06)` through `--ax-biz-muted` for hover tints
69. Add semantic status tokens: `--ax-status-online: #22c55e`, `--ax-status-idle: #f59e0b`, `--ax-status-offline: #6b7280`, `--ax-status-error: #ef4444`
70. Add `--ax-focus-ring: 0 0 0 2px rgba(91,158,255,0.7)` as a box-shadow token
71. Add `--ax-font-display: 'Space Grotesk', system-ui, sans-serif`
72. Add `--ax-font-body: 'IBM Plex Sans', system-ui, sans-serif`
73. Add `--ax-font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace`
74. Add `--ax-text-2xs: 0.625rem` (10px)
75. Add `--ax-text-xs: 0.75rem` (12px)
76. Add `--ax-text-sm: 0.875rem` (14px)
77. Add `--ax-text-md: 1rem` (16px)
78. Add `--ax-text-lg: 1.125rem` (18px)
79. Add `--ax-text-xl: 1.25rem` (20px)
80. Add `--ax-text-2xl: 1.5rem` (24px)
81. Add `--ax-text-3xl: 1.875rem` (30px)
82. Add `--ax-lh-tight: 1.2`, `--ax-lh-snug: 1.375`, `--ax-lh-normal: 1.5`, `--ax-lh-relaxed: 1.75`
83. Add `--ax-ls-tight: -0.02em`, `--ax-ls-normal: 0`, `--ax-ls-wide: 0.05em`, `--ax-ls-wider: 0.1em`, `--ax-ls-widest: 0.2em`
84. Add `--ax-fw-normal: 400`, `--ax-fw-medium: 500`, `--ax-fw-semibold: 600`, `--ax-fw-bold: 700`, `--ax-fw-extrabold: 800`
85. Add `--ax-glow-sys: 0 0 20px rgba(91,158,255,0.25)` through `--ax-glow-biz` for domain card glows
86. Add `--ax-gradient-sys: linear-gradient(135deg, rgba(91,158,255,0.1), transparent)` through each domain
87. Add `--ax-gradient-mesh: radial-gradient(at 20% 50%, rgba(91,158,255,0.06) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(124,111,255,0.04) 0%, transparent 50%)`
88. Add `--ax-orb-idle: radial-gradient(circle, #1a3a6b 0%, #0a1628 60%, #060f1e 100%)`
89. Add `--ax-orb-listen: radial-gradient(circle, #2a5fff 0%, #1a3a8f 40%, #060f1e 100%)`
90. Add `--ax-orb-active: radial-gradient(circle, #5b9eff 0%, #2a5fff 40%, #0a1628 100%)`
91. Add `--ax-orb-think: radial-gradient(circle, #7c6fff 0%, #3a2a9f 40%, #060f1e 100%)`
92. Add `--ax-spacing-0: 0`, `--ax-spacing-px: 1px`, and full 4→64px scale in 4px steps
93. Add `--ax-sidebar-w-collapsed: 56px`, `--ax-sidebar-w-expanded: 200px`
94. Add `--ax-topbar-h: 60px`
95. Add `--ax-nav-item-h: 48px`
96. Add `--ax-input-h-sm: 32px`, `--ax-input-h-md: 40px`, `--ax-input-h-lg: 48px`
97. Add `--ax-btn-h-xs: 24px`, `--ax-btn-h-sm: 28px`, `--ax-btn-h-md: 36px`, `--ax-btn-h-lg: 44px`
98. Add `--ax-icon-xs: 12px`, `--ax-icon-sm: 16px`, `--ax-icon-md: 20px`, `--ax-icon-lg: 24px`, `--ax-icon-xl: 32px`
99. Add `--ax-panel-padding-sm: 16px`, `--ax-panel-padding-md: 20px 24px`, `--ax-panel-padding-lg: 28px 32px`
100. Add `--ax-card-radius: 14px`, `--ax-modal-radius: 20px`, `--ax-chip-radius: 8px`, `--ax-full-radius: 9999px`

---

## CAT 03 — Typography System (50)
101. Apply `--ax-font-display` to all `.ds-page-title` elements
102. Apply `--ax-font-mono` to all `.ds-page-subtitle` elements
103. Apply `--ax-font-body` to all paragraph and list content
104. Apply `--ax-font-mono` to all stat card values and numeric displays
105. Set base `font-size: 16px` on `html`, `line-height: 1.5` on `body`
106. Add `font-feature-settings: "tnum" 1` to all numeric displays (tabular numbers, no layout shift)
107. Add `font-variant-numeric: tabular-nums` to all stat cards and tables
108. Add `font-variant-numeric: lining-nums` to all heading numerics
109. Set `text-rendering: optimizeLegibility` globally
110. Set `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale` globally
111. Define `h1`–`h6` scale using `--ax-text-*` tokens — currently no heading element normalisation
112. Add `text-wrap: balance` to all headings (prevents awkward single-word last lines)
113. Add `text-wrap: pretty` to all body paragraphs
114. Remove all `white-space: nowrap` that clips content rather than truncating intentionally
115. Replace unconstrained text truncation with `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap` triad
116. Add `.truncate-2` and `.truncate-3` multi-line clamp utilities (webkit-line-clamp)
117. Normalize all section header labels to: 700 weight, `--ax-font-display`, `--ax-ls-widest`, `--ax-text-xs`, uppercase
118. Normalize all metric labels to: 500 weight, `--ax-font-mono`, `--ax-ls-wider`, `--ax-text-2xs`, uppercase
119. Normalize all body copy to: 400 weight, `--ax-font-body`, `--ax-text-sm`, `--ax-lh-relaxed`
120. Normalize all button labels to: 600 weight, `--ax-font-mono`, `--ax-ls-wide`, `--ax-text-xs`, uppercase
121. Normalize all badge text to: 700 weight, `--ax-font-mono`, `--ax-ls-wider`, `--ax-text-2xs`, uppercase
122. Normalize all table headers to: 600 weight, `--ax-font-mono`, `--ax-ls-widest`, `--ax-text-2xs`, uppercase
123. Normalize all table cells to: 400 weight, `--ax-font-mono`, `--ax-text-xs`
124. Add `hyphens: auto` to long-form text areas (research, journaling)
125. Add `overflow-wrap: break-word` to chat message bubbles to prevent URL overflow
126. Add `word-break: break-all` only to technical strings (paths, hashes, IDs) — not prose
127. Replace hardcoded `Cinzel` font references — it was never loaded via `@import`, causing fallback chaos
128. Ensure all `@import` for Google Fonts are present and correct: Space Grotesk, JetBrains Mono, IBM Plex Sans
129. Add `font-display: swap` to the font `@import` URL parameters to prevent FOIT
130. Add `preconnect` hints: `<link rel="preconnect" href="https://fonts.gstatic.com">` in `<head>`
131. Upgrade page title size: `22px` → `26px` on desktop, keep `18px` on mobile
132. Upgrade page subtitle size: `10px` → `11px` — current is below comfortable reading threshold
133. Reduce all `letter-spacing: 2.5px` headers — convert to em: `0.18em` for consistency at different sizes
134. Add `max-width: 72ch` to all long-form text blocks (research, journaling, doc content)
135. Add `line-height: var(--ax-lh-relaxed)` to all `.apex-feed` entry text
136. Distinguish data from prose: monospace for all numbers/IDs/paths, proportional for natural language
137. Add a `.font-tabular` utility class for one-off numeric alignment in tables
138. Set `caption-side: bottom` and style table captions with `--ax-text-xs` muted color
139. Add `<abbr title="">` styling: dotted underline, cursor help — for all acronyms (AI, OS, MCP, etc.)
140. Add `::selection` color per-domain: reading on system page → blue selection, finance → amber
141. Normalize the command page transcript overlay to: `--ax-font-body`, `--ax-text-lg`, `--ax-lh-relaxed`
142. Upgrade `#chatInput` placeholder text to use `--ax-text-3` (muted) rather than near-invisible default
143. Add `font-size: 16px` to `#chatInput` — prevents iOS zoom on focus
144. Normalize search input font to `--ax-font-body` — currently inherits mono from parent
145. Add distinctive heading treatment for each page's `ds-page-title`: subtle domain-color text-shadow `0 0 40px var(--ax-DOMAIN-glow)`
146. Add monospace `lining-nums slashed-zero` to any display that shows zero to avoid 0/O confusion
147. Reduce orb transcript `font-size` on mobile to `14px` — current is too large for portrait phones
148. Add `letter-spacing: -0.01em` to all Space Grotesk headings above `24px` — tighter looks better at large sizes
149. Add visible `text-decoration: underline` to all `<a>` elements in long-form content
150. Add `.mono-code` utility: `font-family: var(--ax-font-mono); font-size: 0.9em; padding: 1px 5px; background: rgba(255,255,255,0.06); border-radius: 4px`

---

## CAT 04 — Color & Visual Hierarchy (50)
151. Apply the mesh gradient `--ax-gradient-mesh` as a fixed `::before` on `body` for subtle depth without performance cost
152. Add a subtle blue radial glow behind the plasma orb on the command page: `radial-gradient(ellipse 400px 300px at center 40%, rgba(91,158,255,0.06), transparent)`
153. Replace the flat `#03060f` page background with `--ax-color-bg-1` (#06101f) — warmer navy vs pure black
154. Add a very subtle grid texture on `body::before`: 1px lines, `rgba(91,158,255,0.025)` every `40px` via CSS gradient
155. Apply `--ax-gradient-DOMAIN` tint to each domain page's outermost wrapper `::before` pseudo-element
156. Increase the top-border accent on `.ds-panel` from `2px` to `3px solid rgba(DOMAIN,0.35)` per page context
157. Add colored `::before` glow on domain stat cards using `box-shadow: inset 0 1px 0 var(--ax-DOMAIN), 0 0 24px -8px var(--ax-DOMAIN-glow)`
158. Increase contrast on `.ds-dot` inactive state: `#374151` → `rgba(255,255,255,0.15)` for a more visible neutral
159. Add `.ds-dot.pulse` variants per domain: `.pulse.sys` → cyan pulse, `.pulse.fin` → amber pulse, etc.
160. Color the active nav item's icon using the domain color, not just the border
161. Add a faint domain-color rim-light to agent cards: `box-shadow: 0 0 0 1px rgba(DOMAIN,0.12)`
162. Replace `--bg` body color with layered background: page bg + fixed noise texture (SVG data-uri, 2% opacity)
163. Add a subtle vignette on `body::after`: `radial-gradient(ellipse at 50% 0%, transparent 60%, rgba(0,0,0,0.4) 100%)` fixed
164. Improve `.ds-badge` color contrast — audit each variant for 4.5:1 contrast ratio
165. Make error states visually loud: `.ds-badge.error` → red background (not just red text), white text
166. Add `--ax-color-surface-hover: #111d32` — a distinct hover surface color for all interactive cards
167. Ensure `.ds-stat-card` value colors match domain context, not all cyan
168. Add `color-mix(in oklab, var(--ax-sys), transparent 30%)` utility for automatically generating tinted versions (requires CSS Color Level 5 support check)
169. Darken sidebar background slightly to `#050d1a` vs page bg — creates spatial depth between nav and content
170. Add a `box-shadow: 4px 0 20px rgba(0,0,0,0.4)` to the sidebar to separate it from page content
171. Add a `box-shadow: 0 4px 20px rgba(0,0,0,0.3)` to the topbar to lift it above page content
172. Increase visual weight of active `.nav-btn`: add a `background: rgba(91,158,255,0.08)` fill behind the icon
173. Add a subtle `background: rgba(255,255,255,0.015)` striping to alternating `.ds-table tr` (zebra striping)
174. Add hover highlight `background: rgba(255,255,255,0.03)` to `.ds-table tr:hover`
175. Add a left-border `3px solid var(--ax-DOMAIN)` to the first column cell of active table rows
176. Make `.apex-feed-entry` alternating items have `background: rgba(255,255,255,0.01)` for scan-ability
177. Add `opacity: 0.5` to `.ds-dot.offline` — visually distinguish from error (which should be full opacity red)
178. Upgrade the orb state colors: idle → `#0a1628` base, listen → `#1a3a8f` base, active → `#2a5fff` base with white-hot core
179. Add the five domain colors as data-visualization palette CSS variables: `--ax-chart-1` through `--ax-chart-5`
180. Apply a distinct `--ax-color-bg-3` to collapsible section headers — they currently blend into content
181. Add `background: var(--ax-color-bg-4)` on all `.ds-pill.active` — selected filter state needs higher contrast
182. Make form `<select>` background match `.ds-panel` — browsers apply white/grey default
183. Remove all hardcoded `#00d4ff` color values — replace with `--ax-sys` token
184. Remove all hardcoded `#7b2fff` color values — replace with `--ax-uni` token
185. Add `background-clip: text; -webkit-background-clip: text` gradient treatment to the main app logo/title
186. Add a `--ax-color-verified: #7c6fff` for trusted/verified UI elements (agent verified, task approved)
187. Add `--ax-color-pending: #f59e0b` and `--ax-color-blocked: #6b7280` for task/agent state chips
188. Use `currentColor` in SVG icon paths instead of hardcoded hex for automatic color inheritance
189. Add a `filter: brightness(1.15)` on hover for all colored icon-only buttons (pure CSS, no extra rule)
190. Add a subtle `background: linear-gradient(180deg, rgba(255,255,255,0.04), transparent)` on `.ds-panel` `::before` for a top-light shimmer effect
191. Apply domain color to the `border-top` of domain pages' `.ds-page-header` container (3px domain accent)
192. Add `opacity: 0.4` to the top-border accent until hover — lifts on hover to `opacity: 1` with transition
193. Replace the flat `#1a1a1a` modal background with `--ax-color-bg-3` for visual consistency
194. Add `border: 1px solid rgba(255,255,255,0.07)` to all modals — they currently lack visual containment
195. Colorize `::placeholder` in all inputs: `--ax-text-4` (dim), not browser-default grey
196. Add `caret-color: var(--ax-sys)` to all focused inputs — the typing cursor matches the accent
197. Add `accent-color: var(--ax-sys)` to `<input type="checkbox">` and `<input type="radio">` — native styled checkboxes
198. Ensure `::selection` background uses domain-context-aware color (different CSS custom property per page wrapper)
199. Add `color: var(--ax-status-online)` to active agent count badges
200. Apply `text-decoration-color: var(--ax-sys)` to hyperlinks for colored underline effect

---

## CAT 05 — Navigation & Sidebar (50)
201. Add smooth `cubic-bezier(0.25, 0.46, 0.45, 0.94)` easing to sidebar expand/collapse transition
202. Increase sidebar expand width from `200px` to `220px` — labels currently clip at 200px
203. Add a `border-right: 1px solid var(--ax-color-border-1)` to sidebar — clean edge separation
204. Replace all Unicode navigation icons with proper SVG icons — current symbols render inconsistently across OS
205. Ensure nav icon SVGs are `20px × 20px` with `viewBox="0 0 20 20"` — consistent sizing
206. Add icon color `var(--ax-text-3)` in idle state, `var(--ax-DOMAIN)` in active state
207. Add `transition: color 200ms ease-out, background 200ms ease-out` to `.nav-btn`
208. Add a `title` attribute to each icon-only nav button for browser tooltip accessibility
209. Add `:hover` tooltip that appears after 400ms delay showing page name — implemented via CSS `[data-tooltip]` pattern
210. Add a visible `border-left: 3px solid transparent` to all inactive nav buttons — reserve the space so layout doesn't shift on activation
211. On mobile bottom nav, show 5 primary items + "⋯" overflow button (currently showing 11)
212. Add a bottom nav scroll indicator — small dot row showing which overflow items are available
213. On mobile, add `active` animation: the active bottom-nav item icon scales up 10% with a background pill
214. Add `padding-bottom: env(safe-area-inset-bottom)` to mobile bottom nav bar
215. Add `aria-current="page"` attribute to the active `.nav-btn` — updated by JS on navigation
216. Add `role="navigation"` and `aria-label="Main navigation"` to the sidebar `<nav>` element
217. Add `role="tab"` + `role="tablist"` semantics to the nav if it drives a tabpanel pattern
218. Group nav items into visual clusters with a 1px divider: Core (command, overview), Domains (system–business), More (health, occult, research)
219. Add a collapsed sidebar "active page indicator" — small colored dot on the icon of the active page
220. Add subtle hover background `rgba(255,255,255,0.04)` to inactive nav items on desktop
221. Add notification badge count to the nav item icon (not just the bell icon) for items with pending items
222. Add `pointer-events: none` to the nav labels while sidebar is animating — prevents mis-clicks during transition
223. Add keyboard shortcut hints in the expanded sidebar labels: `⌘1` through `⌘9` as muted right-aligned text
224. Add a "collapse" button at the bottom of the expanded sidebar: `«` icon, same styling as nav items
225. Prevent FOUC on sidebar width — add `width: var(--ax-sidebar-w-collapsed)` in initial CSS before any JS runs
226. Add `overflow: hidden` to `.nav-btn` + `border-radius: 8px` for hover background clipping
227. Fix the nav item height — all items should be exactly `var(--ax-nav-item-h)` = 48px touch targets
228. Add a `gap: 2px` between all nav items in the sidebar list
229. Add `scroll-snap-type: y mandatory` to mobile bottom nav overflow area for smooth scrolling
230. Add the current time displayed in the sidebar footer (collapsed: just clock icon, expanded: HH:MM format)
231. Add a system health indicator dot in the sidebar footer — green if all agents OK, amber/red otherwise
232. Make the sidebar footer expand reveal: avatar, `apex1system1@gmail.com` (truncated), and logout icon
233. Add `tabindex="0"` to all `.nav-btn` elements — ensure keyboard focus works correctly
234. Add `aria-label` to notification badge: `aria-label="3 notifications"` (dynamically updated)
235. Add a `data-page` attribute to each nav button and read it for page routing — replace any non-data-attribute routing
236. On mobile, add a swipe-right gesture to open a "quick menu" drawer (foundation: `touchstart`/`touchmove` detection)
237. Add `.nav-btn:focus-visible` outline using `--ax-focus-ring` box-shadow
238. Add a marquee/ticker to the sidebar footer when expanded showing the most recent agent activity
239. Add `transition: transform 200ms ease` to nav icons — subtle scale-up on hover
240. Add `letter-spacing: 0.12em` to all nav label text for consistency with the rest of the UI
241. Ensure nav labels use `--ax-font-mono` for consistent look with page headers
242. Add `font-weight: 600` to active nav label, `500` to inactive
243. Add `color: var(--ax-text-2)` to inactive nav labels, `var(--ax-DOMAIN)` to active
244. Add `user-select: none` to nav buttons — prevents text selection on double-click
245. Add `draggable="false"` to all nav icons — prevents accidental drag behavior
246. Add bottom-border separator between topbar and sidebar: `1px solid var(--ax-color-border-1)` at the junction
247. Ensure the sidebar `z-index: var(--z-sidebar)` is correctly set and consistent
248. On mobile, add a semi-transparent backdrop `rgba(0,0,0,0.5)` when a slide-out drawer is open
249. Add `overscroll-behavior: contain` to sidebar scrollable area
250. Fix the mobile nav "More" drawer to animate in from the bottom with `translateY(100%) → translateY(0)` transition

---

## CAT 06 — Command Page / Plasma Orb (50)
251. Apply `--ax-orb-idle` gradient to the orb in resting state — replace flat color
252. Apply `--ax-orb-listen` gradient transition when voice activates — smooth `transition: background 800ms ease`
253. Apply `--ax-orb-active` when speech is detected (energy > threshold)
254. Apply `--ax-orb-think` during API call (waiting for response)
255. Add a subtle outer glow ring: `box-shadow: 0 0 80px rgba(91,158,255,0.12), 0 0 160px rgba(91,158,255,0.05)` in idle
256. Increase orb glow ring intensity during listen state: `0 0 100px rgba(91,158,255,0.3), 0 0 200px rgba(91,158,255,0.12)`
257. Add 3 concentric orbit rings around the orb — thin SVG circles with `stroke-dasharray` rotating at different speeds
258. Add `animation-play-state: paused` to all orb animations when `prefers-reduced-motion: reduce`
259. Improve the waveform bars `.wb` — increase from 7 to 11 bars for smoother visualization
260. Add `border-radius: 2px` to waveform bar tops for polished look
261. Make waveform bar heights respond to actual audio frequency bands — not just uniform animation
262. Add a ring of 8 small dots orbiting the orb at 48px radius — they spread apart and glow during listen
263. Add a "breathing" ambient pulse to the orb when idle: `scale(1.0) → scale(1.02)` every 4 seconds, ease-in-out
264. Show a "tap to speak" label below the orb when idle, hidden when listening — `font: var(--ax-font-mono)` 10px muted
265. Show a "listening…" label with animated ellipsis when orb is in listen state
266. Show a "thinking…" label with animated spinner when waiting for API response
267. Show the live transcript text centered below the orb with a fade-in-per-word animation
268. Add `backdrop-filter: blur(4px)` to the transcript overlay so orb shows through slightly
269. Make the transcript text scale down smoothly to `--ax-text-sm` as more text accumulates
270. Add a faint `radial-gradient` bleed from the orb onto the floor/background — just 15% opacity depth
271. Apply `--ax-orb-think` purple gradient when orb enters processing state
272. Add a subtle particle system: 12 floating particles (pure CSS, `position: absolute`, random delays) during active state
273. Add the current date-time as a large, ghosted typographic background element behind the orb (very faint, `opacity: 0.03`)
274. Add a `cmd-stat` card for "Tokens Used Today" with a mini sparkline bar
275. Add a `cmd-stat` card for "Last Voice Command" showing a timestamped snippet
276. Upgrade the existing 4 stat cards: add a colored domain accent bar on the left edge of each
277. Add micro-icons to each `cmd-stat` card: ⚡ balance, ✉ messages, ✓ tasks, ◈ health
278. Add a hover state to `cmd-stat` cards: `background: var(--ax-color-bg-4)` lift with `translateY(-2px)`
279. Add a real-time clock display above the orb — large, faint, `--ax-font-mono` tabular nums
280. Upgrade the `.apex-feed` activity feed: add domain color dots before each entry matching the originating domain
281. Add a feed entry animation: new entries slide in from the top with `translateY(-8px) → translateY(0)`, `opacity: 0 → 1`
282. Add a "Clear feed" button in the feed header — icon-only, appears on feed hover
283. Add a subtle separator between feed entries: `border-bottom: 1px solid var(--ax-color-border-0)`
284. Add timestamp tooltip on hover for each feed entry (full date/time vs the relative time shown)
285. Replace the current `.cmd-stage` with a proper centered flex column layout: clock → orb → transcript → waveform → label
286. Add `gap: var(--ax-spacing-lg)` between all elements in the orb column
287. Ensure the orb is `min(280px, 60vw)` — scales on mobile without being too large
288. Add a dark status bar above the orb: left = "APEX OS v2.1", center = mode indicator, right = connection status
289. Add "session duration" to the status bar — HH:MM:SS counting up from page load
290. Add a keyboard shortcut indicator: "Hold Space to speak" — shown in the status bar when keyboard is detected
291. Add `role="main"` to the command page content area
292. Add `aria-live="polite"` to the transcript overlay
293. Add `aria-live="assertive"` to any error messages on the command page
294. Add `aria-label="Voice orb, tap to speak"` to the orb button element
295. Add a subtle `cursor: pointer` change to `cursor: crosshair` when hovering the orb during idle state
296. Add a pulsing connection status indicator (green = connected, amber = reconnecting, red = offline) in the topbar
297. Add a "New chat" button (+ icon) in the `cmd-feed` header — clears chat and starts fresh session
298. Add a visual "recording" indicator: a small red dot in the topbar that appears during voice capture
299. Make the command page work as a proper PWA install prompt — add `beforeinstallprompt` handler to show subtle banner
300. Add a `?` icon in the command page status bar that opens a keyboard shortcuts modal

---

## CAT 07 — Overview Page (50)
301. Add a real-time "system heartbeat" pulse: a `4px × 4px` dot at the very top of the pipeline, blinking every 1.5s
302. Make each pipeline section header's colored left-bar clickable — scrolls to or expands the corresponding page
303. Add a `data-count` attribute to each pipeline section and display agent counts as `(N active)` suffix
304. Add a compact "Expand All / Collapse All" toggle at the top of the pipeline section
305. Add individual section collapse — clicking the left-bar collapses that pipeline section with a smooth height transition
306. Add a total "Sovereign IQ score" metric at the top of the pipeline — a single number combining all domain health scores
307. Add a mini circular progress ring around the Sovereign node — shows overall system utilization (0–100%)
308. Add an "uptime" counter to the Sovereign node: "OS UPTIME 14d 3h 22m" in `--ax-font-mono` muted text
309. Add a subtle ambient animation to the pipeline background: slow `background-position` drift on the mesh gradient
310. Add a real `aria-label="System pipeline"` to the pipeline container
311. Replace static agent pill colors with live status colors — green if agent last ran < 1h, amber if < 24h, grey if > 24h
312. Add agent pill hover: shows last run timestamp and task count in a CSS tooltip
313. Add a "critical path" highlight — bolden/brighten the primary execution path through the pipeline on hover
314. Add a "View details" button to each pipeline section header that navigates to the relevant page
315. Animate new data appearing in the overview stat cards: counter animation from 0 to current value on page load
316. Add a mini bar chart to each stat card showing the 7-day trend
317. Add `role="region"` and `aria-label` to each pipeline section
318. Add `tabindex="0"` to each pipeline section header for keyboard navigation
319. Add keyboard expand/collapse with `Enter`/`Space` on pipeline sections
320. Make the pipeline visually narrower on desktop — max-width `420px`, centered
321. Add a "last refreshed" timestamp at the bottom of the pipeline: "Updated 2m ago"
322. Add a manual refresh button (↻ icon) next to the timestamp
323. Add `loading` skeleton state to all stat cards — shows shimmer while data loads
324. Add `error` state to stat cards — shows `--ax-color-error` border and "–" value on fetch failure
325. Add a "Critical Alerts" banner at top of overview when any domain agent has an error status
326. Add a `display: grid` two-column layout for the stat cards section — better use of horizontal space
327. Add an "Agent Activity Timeline" micro-chart — 24h horizontal bar showing when agents were active
328. Add an OS version badge in the overview page header: `v2.1.0` in a small `.ds-badge`
329. Add a "Quick Actions" section below the pipeline: 4 large icon buttons for the most common actions
330. Add drag-to-reorder on pipeline sections — uses HTML5 Drag API with visual placeholder
331. Add a "Save pipeline layout" button that persists section order to localStorage
332. Add a "Reset layout" option in the pipeline header dropdown
333. Add a `filter: blur(8px)` blur-out effect on pipeline sections when system is disconnected
334. Add a real-time notification count badge on the overview heading: "OVERVIEW (3)"
335. Add the current weather/location as a subtle data point in the overview header (if permission granted)
336. Add a "Goals Today" card to the overview — shows 3 pinned goals from the university or operation pages
337. Add an "Economy Summary" widget: current balance, daily spend, net (pulled from finance page)
338. Add a "Communication pulse" indicator: shows number of unread messages and pending replies
339. Add a subtle horizontal scrollable "domain cards" row: 5 cards (SYS, FILE, UNI, FIN, BIZ) with domain color, health score
340. Make each domain card navigable — click takes user to that domain page
341. Add a "System Log" expandable section at bottom of overview: last 10 agent actions
342. Add `aria-expanded` attribute to all collapsible sections — screen reader accessible
343. Add smooth height animation to collapsible sections: `max-height` transition with `overflow: hidden`
344. Add a "Focus Mode" button in overview header — hides all cards except the pipeline
345. Add an animated SVG connection line between domain cards and the pipeline section they correspond to
346. Add a "Health Score" radar chart (SVG, pure CSS-drawn) for the 5 domains
347. Add print styles: `@media print` that shows a clean single-column overview layout
348. Ensure overview page heading reads "OVERVIEW / PIPELINE" with correct `aria-level="1"`
349. Add keyboard shortcut `O` to jump to overview from anywhere
350. Add a `data-health` attribute to each domain node in the pipeline, enabling CSS-conditional coloring

---

## CAT 08 — System Page (50)
351. Add a large "SYSTEM AGENT" heading with `--ax-sys` color accent — currently no clear page identity
352. Add an agent roster card at the top: shows count of active/idle/offline system agents
353. Add a live "CPU / Memory / Uptime" stat row at the page header (pulled from a `/system/status` endpoint)
354. Add an "Agent Dispatch" quick-action panel: text input to describe a task → assigns to system agent
355. Redesign agent cards to 3-column grid on desktop, 1-column on mobile
356. Add a colored status bar at the bottom of each agent card: green=active, amber=idle, red=error
357. Add an "Activity Log" expandable section per agent card — shows last 5 actions
358. Add a "Restart" button per agent card — requires approval modal before executing
359. Add a "View Logs" button per agent card — opens a modal with scrollable log output
360. Add a "Kill" button per agent card — red, requires confirmation, only visible on hover
361. Add agent card hover: card lifts `translateY(-2px)`, shadow deepens, border brightens to `--ax-sys`
362. Add a "New Agent" button in the page header — opens a configuration modal
363. Add a "Schedule" button in the page header — opens the scheduler for system tasks
364. Add a task queue panel: shows pending, running, completed tasks in a scrollable list
365. Add task status chips: `QUEUED`, `RUNNING`, `DONE`, `FAILED` — each with appropriate domain color
366. Add a "Task Stats" row: total tasks today, success rate, average duration
367. Add a mini terminal/log viewer component — fixed-height, scrollable, monospace, syntax highlighted output
368. Add a copy button to the log viewer — copies full log to clipboard
369. Add a "Clear Logs" button in the log viewer header — requires confirmation
370. Add `aria-live="polite"` to the log viewer so screen readers announce new entries
371. Add a "Connected Services" panel: list of active integrations (Supabase, Claude API, Render) with status dots
372. Add a latency indicator per connected service: `< 50ms` (green), `50–200ms` (amber), `> 200ms` (red)
373. Add an "API Usage" widget: token counter, cost estimate for today, progress bar against daily budget
374. Add an animated background for the system page: very subtle `apex-grid-drift` animation on a horizontal mesh
375. Add a search/filter bar above agent cards: filter by status, search by name
376. Add a "Sort by" dropdown: alphabetical, last active, status
377. Add keyboard navigation on agent cards: Tab between cards, Enter to expand, Space to toggle active
378. Add `aria-label` to each agent card: `aria-label="System Agent: FileScanner — Status: Active"`
379. Add a compact "bulk actions" bar that appears when multiple agents are selected (checkbox selection)
380. Add "Export Tasks" button: downloads current task queue as JSON
381. Add an error state UI: if no agents are present, show an empty state with a "Deploy First Agent" CTA
382. Add a loading skeleton for the agent grid that matches the 3-column layout
383. Add a "System Health Score" gauge — a large arc gauge showing overall health (0–100)
384. Add `--ax-sys` left border to all system page panels
385. Add a real-time activity sparkline per agent: tiny SVG line showing task frequency over 24h
386. Make agent status dot pulse only when actively running — idle and offline dots are static
387. Add a "tags" row to each agent card: colored chips for capabilities (code, files, api, etc.)
388. Add drag-to-prioritize on the task queue — reorder tasks via drag handle
389. Add a confirmation modal with details before any destructive agent action (restart/kill)
390. Add `prefers-reduced-motion` override to stop agent card entry animations
391. Add a "notifications" panel with per-agent alert history
392. Add a terminal-style "stdin" input below the log viewer — for sending manual commands to the agent
393. Add monospace text rendering to all agent IDs and task IDs
394. Add a "last heartbeat" timestamp per agent: "3s ago", "1m ago", colored if stale
395. Add `user-select: text` to log output — so users can select/copy log lines
396. Add section dividers between different agent groups (infrastructure, domain agents, scheduled agents)
397. Add a "Version" chip to each agent card: `v1.2.0` badge in muted text
398. Add a "Memory usage" mini bar to each agent card showing agent memory footprint
399. Add an "Auto-restart on failure" toggle per agent — binary switch component
400. Add a full-page "maintenance mode" overlay that dims the page and shows a wrench icon + message when system is upgrading

---

## CAT 09 — Files / Operation Page (50)
401. Redesign the file drop zone: dashed `2px` animated border, becomes solid on `drag-over`, full-width in the panel
402. Add a file type icon grid for the drop zone: PDF, TXT, MD, JSON, IMG icons in `--ax-text-3` color
403. Add a "Browse Files" button below the drop zone as a secondary action
404. Add a file upload progress bar: animated fill from 0–100%, shows filename and file size
405. Add upload success animation: progress bar turns green, check icon fades in
406. Add upload error state: progress bar turns red, error message appears below
407. Add a file list table: filename, type, size, uploaded date, actions (view/delete)
408. Add column sorting to the file table: click column header to sort asc/desc
409. Add a search input above the file table: real-time filter by filename
410. Add a "Storage Used" progress bar: shows `3.2 MB / 500 MB` with a fill bar
411. Add a file preview panel: clicking a file shows a preview (text files show content, images show thumbnail)
412. Add a copy-link button per file row — copies the Supabase Storage public URL to clipboard
413. Add a delete button per file row — requires confirmation before deleting
414. Add file drag-and-drop reordering in the file list (for pinned/favorite files)
415. Add a "Favorites" toggle per file — starred files appear at top of the list
416. Add `aria-label` to the file drop zone: `aria-label="Drop files here to upload"`
417. Add keyboard support for file upload: `Enter` on the drop zone triggers the file picker
418. Add a loading skeleton for the file list that matches the table layout
419. Add an empty state for no files: illustration + "Upload your first file" CTA
420. Add file type color coding in the table: PDF rows have `--ax-error` dot, code files have `--ax-sys` dot
421. Add batch download: checkbox column + "Download selected" button
422. Add batch delete: checkbox column + "Delete selected" button (with confirmation)
423. Add an "Agent Actions" panel: which file agents have run, on which files, with timestamps
424. Add a recent activity feed for the files page: "FileAgent renamed x.pdf → y.pdf 2m ago"
425. Add folder/tag support UI: a sidebar filter panel with tag chips
426. Add file annotation support: click a file → add a note in a textarea → saved to Supabase
427. Make the file drop zone full-height on mobile — easier tap target
428. Add `accept` attribute to the hidden file input — show allowed types in the drop zone label
429. Add a "Max file size: 50MB" notice in the drop zone — below the drop instruction
430. Add keyboard shortcut `F` to jump to files/operation page
431. Add a visual file size unit display: auto-format bytes to KB/MB/GB
432. Add `title` attribute to truncated filenames — show full name on hover
433. Add a monospace font to all file sizes and dates in the table
434. Add a "Last modified" sort option to the file table
435. Add a file rename inline: double-click on filename to edit in-place
436. Ensure file table has `role="grid"` and proper `th scope="col"` attributes
437. Add a sticky first column (filename) for horizontal scroll on narrow viewports
438. Add `overflow-x: auto` to the file table wrapper with `min-width: 600px` on the table
439. Add a compact "file info" tooltip on row hover: filename + size + date + uploader
440. Add a "version history" button per file (future-proofing) — greyed out with "Coming soon" tooltip
441. Add an "OCR / Extract text" button per image file — visible on hover
442. Add a "Summarize" button per document file — calls Claude API with file content
443. Add visual feedback when copy-link button is clicked: icon changes to ✓ for 1.5s
444. Add a download count column (placeholder) — shows "–" for files without tracking
445. Add a "File Agent" status panel showing agent health, last run, files processed
446. Add a mini pie chart showing file type distribution in the storage stats area
447. Add `data-type` attribute to each file row for CSS-based type filtering
448. Add smooth row delete animation: row fades out and collapses before removal
449. Add a "Recycle bin" concept: soft-delete with a "30-day recovery" note (UI only, not backend)
450. Add `user-select: text` to filename cells — users should be able to select/copy names

---

## CAT 10 — Finance Page (50)
451. Add a large `--ax-fin` colored "FINANCE" heading at the page top with a `₿` or `$` icon
452. Add a "Net Worth" hero stat at the top: large number, `--ax-font-mono`, tabular-nums, animated count-up on load
453. Add a 30-day balance sparkline next to the hero stat — tiny SVG line chart
454. Add a "Daily Spend" stat card with a color-coded change indicator: green if under budget, red if over
455. Add a "Monthly Summary" panel: income, expenses, savings rate — 3 stat cards in a row
456. Add a "Budget vs Actual" horizontal bar chart for the current month's major categories
457. Add animated bar fill: bars grow from 0% to actual value on page load (respects prefers-reduced-motion)
458. Add `--ax-fin` left border to all finance panels
459. Add a "Transactions" table with columns: date, description, category, amount, balance
460. Add category color chips in the transactions table: `FOOD` (green), `BILLS` (red), `INCOME` (blue), etc.
461. Add transaction table row hover: `background: var(--ax-color-bg-4)`, subtle lift
462. Add a search input for transactions: real-time filter by description
463. Add date range filter: "This week / This month / Last 3 months / Custom"
464. Add a "Download CSV" button for transactions — exports filtered view
465. Add a "Add Transaction" button — opens a modal form with: date, description, amount, category
466. Add a "Goals" panel: financial goals with progress bars (e.g., "Emergency Fund: 68%")
467. Add goal edit: click goal → inline edit of target amount and name
468. Add `--ax-color-success` color when a goal exceeds 80%, `--ax-color-warning` at 40–80%, `--ax-color-error` below
469. Add a "Recurring" panel: list of recurring expenses and income with frequency chips
470. Add `aria-label` to all amount values: `aria-label="$1,234.56, positive transaction"`
471. Add `color: var(--ax-color-success)` to positive amounts, `var(--ax-color-error)` to negative
472. Add a large `+` / `-` prefix with color coding to all transaction amounts
473. Add a "Finance Agent" status card showing last analysis timestamp and key insights
474. Add `tabindex="0"` to transaction rows for keyboard navigation
475. Add `Enter` to expand transaction row details (category, notes, tags)
476. Add a "Insights" panel — 3 AI-generated bullet points about spending patterns
477. Add a "Forecast" widget — shows projected balance at end of month
478. Make all number displays use `font-variant-numeric: tabular-nums slashed-zero`
479. Add currency formatting consistent with locale — `Intl.NumberFormat` style
480. Add a `loading` skeleton for all finance widgets that resembles the actual content layout
481. Add an error state for all finance data panels — shows a retry button
482. Add `role="table"` and proper ARIA attributes to the transactions table
483. Add sticky header to the transactions table on scroll
484. Add a "Category Breakdown" donut chart (SVG, pure CSS-drawn) for the month
485. Colorize each category slice with distinct colors from `--ax-chart-1` through `--ax-chart-5`
486. Add a legend below the donut chart with category name + percentage
487. Add a "Bill Calendar" widget: 7-day mini calendar with upcoming bill markers
488. Add an alert badge on bill calendar days if total bills due exceed budget
489. Add a "Split Bill" calculator: enter total, number of people, shows per-person amount
490. Add keyboard shortcut `N` to add a new transaction from anywhere on the finance page
491. Ensure all form inputs in finance modals have proper `<label>` elements
492. Add `inputmode="decimal"` to amount inputs on mobile
493. Add `autocomplete` attributes to all transaction form fields where relevant
494. Add a "Dark pattern prevention" note: no hidden fees, amounts always shown before confirmation
495. Add a "Finance Health Score" badge in the page header: a colored ring + number based on budget adherence
496. Add print styles for the finance page: clean single-column layout showing monthly summary + transaction table
497. Add a "Pin to Overview" button in finance header — adds key finance stats to the overview page widgets
498. Add an animated count-up for the hero net worth stat: runs once on page load, `2000ms` duration
499. Add decimal precision toggle: `$1,234` vs `$1,234.56` — toggle button in finance header
500. Add `aria-describedby` on the net worth stat linking to a help tooltip explaining what it includes

---

## CAT 11 — University Page (50)
501. Add a `--ax-uni` colored "UNIVERSITY" heading with a book or graduation cap SVG icon
502. Add a "Learning Score" hero stat: combined mastery percentage across all subjects
503. Add a "Study Streak" widget: days in a row with learning activity — flame icon, animated on streak > 7
504. Add a "Today's Goals" panel: 3 learning goals for the day with checkboxes
505. Add a "Subjects" grid: subject cards with title, mastery progress bar, last studied timestamp
506. Add domain color per subject: math → `--ax-fin` amber, languages → `--ax-biz` pink, coding → `--ax-sys` blue
507. Add subject card hover: border brightens to subject color, `translateY(-2px)` lift
508. Add a "Study Now" button per subject card — navigates to study mode for that subject
509. Add a mastery level badge per subject: NOVICE / LEARNER / PROFICIENT / EXPERT / MASTER
510. Add progress ring animation on subject cards: draws the ring from 0% to mastery % on page load
511. Add a "Flashcard" quick-review panel: shows one card at a time with flip animation
512. Add `perspective: 800px` + `rotateY` transform to flashcard flip — genuine 3D card flip
513. Add `backface-visibility: hidden` to front and back of flashcard
514. Add keyboard shortcut: `→` for next card, `←` for previous, `Space` to flip
515. Add a progress counter on flashcards: "Card 3 of 24"
516. Add a "Mark as mastered" button on the back of each flashcard — moves card to mastered pile
517. Add a "Spaced Repetition" indicator: shows when each card is due for review (SM-2 algorithm UI)
518. Add a "Study Session Timer" — shows elapsed time, auto-pauses after 25min (Pomodoro)
519. Add a Pomodoro completion notification: subtle banner at top "Break time! 5 min rest"
520. Add an "Assignments" panel: list with due dates, priority, subject — sorted by due date
521. Add colored urgency chips on assignments: `DUE TODAY` (red), `DUE SOON` (amber), `UPCOMING` (green)
522. Add assignment completion toggle — click to mark done, strikethrough animation
523. Add a "Notes" panel: expandable sections per subject with Markdown rendering
524. Add a character count to the notes textarea
525. Add a "Save" button that appears on notes change, `Ctrl+S` keyboard shortcut
526. Add a note history: previous versions accessible via a "History" button
527. Add an "AI Tutor" button — sends the current note/topic to Claude for explanation
528. Add `aria-label` to all university progress bars: `aria-label="Mathematics: 72% mastery"`
529. Add `role="progressbar"` + `aria-valuenow` + `aria-valuemin` + `aria-valuemax` to all progress bars
530. Add smooth progress bar fill animation: `width: 0 → actual%` on page load, 1s ease-out
531. Add a "Reading List" panel: books/articles with read/unread status, progress
532. Add reading progress per item: "Chapter 4 / 12" progress indicator
533. Add a "Resource Links" panel: curated external links per subject
534. Add link hover: underline + external link icon appears
535. Add the `rel="noopener noreferrer"` attribute to all external links
536. Add a "University Agent" status card — shows last content ingestion and index freshness
537. Add a search bar above subjects grid — filter by subject name or topic
538. Add a "Sort by" control: alphabetical, mastery %, last studied
539. Add an "Add Subject" button — opens a modal form with name, description, color picker
540. Add `tabindex="0"` to subject cards for keyboard navigation
541. Add `Enter` to open subject detail view from keyboard
542. Add a "weekly study hours" mini bar chart — 7 days, `--ax-uni` colored bars
543. Add an empty state for subjects: illustration + "Add your first subject" CTA
544. Add a skeleton loading state for subject cards
545. Add `prefers-reduced-motion` pause on all card entry animations
546. Add `role="list"` + `role="listitem"` to subjects grid for semantic HTML
547. Add a "Completion Certificate" modal when a subject reaches 100% — confetti animation (CSS only)
548. Add confetti: 30 small `div`s with random colors, random `rotate` angles, `translateY` keyframe fall
549. Add a certificate download button inside the completion modal
550. Add keyboard shortcut `U` to jump to university page

---

## CAT 12 — Business Page (50)
551. Add a `--ax-biz` colored "BUSINESS" heading with a briefcase SVG icon
552. Add a "Revenue Today" hero stat with change indicator vs yesterday
553. Add a "Pipeline Value" stat: total value of open opportunities
554. Add a "Conversion Rate" stat with a small trend arrow
555. Add a "CRM Panel": list of contacts with name, status, last interaction, next action
556. Add contact status chips: `LEAD`, `PROSPECT`, `CLIENT`, `DORMANT` in domain colors
557. Add contact card hover: shows quick actions (email, call, note) as overlay buttons
558. Add a "New Contact" button in the CRM header
559. Add a "Today's Tasks" panel specific to business: sales calls, follow-ups, proposals due
560. Add task priority: `HIGH`, `MEDIUM`, `LOW` badges — ordered by priority in the list
561. Add task completion toggle with strikethrough animation
562. Add an "Opportunities" kanban panel: 4 columns (Lead → Qualify → Propose → Close)
563. Style kanban columns with `--ax-biz` tinted headers
564. Add drag-to-move cards between kanban columns
565. Add opportunity card: name, value (monospace), stage, owner, age
566. Add opportunity value with currency formatting
567. Add "Days in stage" badge — turns amber at 7 days, red at 14 days
568. Add an "Analytics" panel: revenue chart, deal velocity, win rate
569. Add `--ax-biz` colored line chart using SVG `<polyline>` (no external lib)
570. Add chart hover: vertical crosshair line + tooltip with exact values
571. Add a "Proposals" panel: list of open proposals with status and expiry date
572. Add expiry color coding: expired = red, due soon = amber, current = green
573. Add a "Send Proposal" button per row — opens compose modal
574. Add an email compose modal with: To, Subject, Body, template picker
575. Style the compose modal with `--ax-biz` header accent
576. Add a template picker dropdown with 3 pre-built email templates
577. Add character count to email body textarea
578. Add "Business Agent" status card — last analysis, insights generated, contacts updated
579. Add `aria-label` to kanban columns: `aria-label="Lead stage, 4 opportunities"`
580. Add `role="list"` to each kanban column, `role="listitem"` to each card
581. Add keyboard navigation in kanban: Tab between cards, arrow keys to move between columns
582. Add a "Revenue Forecast" widget: bar chart showing projected vs target for the month
583. Add `--ax-color-success` highlight when projected exceeds target
584. Add a "Competitor Tracking" panel: competitors with notes and threat level chips
585. Add threat level chips: `HIGH`, `MEDIUM`, `LOW` with appropriate colors
586. Add a "Notes" panel per business contact — expandable
587. Add `aria-expanded` to all expandable contact notes
588. Add a search bar above CRM contacts — filter by name, status, company
589. Add a "Sort by" dropdown for CRM: last contact, value, status
590. Add a "Business Intelligence" insight card — 3 AI bullets about pipeline health
591. Add a keyboard shortcut `B` to jump to business page
592. Add a loading skeleton for the kanban board
593. Add an empty state for each kanban column: "No opportunities in this stage"
594. Add `overflow-y: auto; max-height: 480px` to each kanban column (prevents page overflow)
595. Add a snappy card drop animation: card scales down 3% during drag, snaps back on drop
596. Add print styles for business: single-column contact list + open opportunities table
597. Add `user-select: none` on kanban column headers (prevents selection during drag)
598. Add visual feedback on drag over a column: `background` tint with column's accent color
599. Add a "Won / Lost" toggle on opportunity cards — updates stage to Won or archive
600. Add a confetti burst animation when an opportunity is moved to "Close / Won" stage

---

## CAT 13 — Communication Page (50)
601. Add a `--ax-text-1` colored "COMMUNICATION" heading with an envelope SVG icon
602. Add a "Compose" button at the top of the page: `+ New Message` CTA
603. Add an inbox panel with unread count badge in the panel header
604. Add message list items: sender avatar initial, name, subject truncated, timestamp, unread dot
605. Add an unread dot: `6px` circle in `--ax-sys` color on the left of unread messages
606. Add message hover: row background lifts, show archived/reply quick-action buttons
607. Add starred message toggle: ⭐ icon per message, toggled on click
608. Add a search bar above the message list — real-time filter
609. Add message preview panel: clicking a message shows full content in a right panel
610. Add a reply textarea in the preview panel with a send button
611. Add send keyboard shortcut: `Ctrl+Enter` to send reply
612. Add character count to the reply textarea
613. Add `aria-live="polite"` to the message preview area
614. Add a "Contacts" panel: list of frequent contacts with quick-message button
615. Add contact avatar: colored circle with initials, using domain color based on last interaction context
616. Add a "Groups / Channels" panel for multi-party communication
617. Add `role="feed"` to the message list for proper screen reader behavior
618. Add `role="article"` to each message list item
619. Add `aria-label` to the compose button: `aria-label="Compose new message"`
620. Add keyboard navigation: `j`/`k` to move between messages in the list
621. Add a loading skeleton for the message list
622. Add an empty inbox state: illustration + "Your inbox is empty"
623. Add a "QR Code" button for share/contact exchange — QR modal with the user's contact details
624. Add `aria-modal="true"` to the QR modal
625. Add an "Outbox" / Sent tab — toggle between inbox and sent views
626. Add animation on new message arrival: new item slides in from top with fade
627. Add a "snooze" button per message: snooze for 1h, 3h, tomorrow
628. Add snooze indicator: a clock icon with snooze time appears on snoozed messages
629. Add an attachment display in message preview: filename chips for attached files
630. Add a "Forward" button in the message preview
631. Add a "Mark all as read" button in the inbox panel header
632. Add batch-select mode: checkbox per message, bulk archive/delete/label
633. Add a label system: color chips that can be applied to messages
634. Add label filter sidebar: click label to filter message list
635. Add `unread-count` data attribute to inbox tab — updated by JS for accessibility
636. Add `focus` management: when compose modal opens, focus the To field
637. Add `Escape` handler on compose modal to close without saving
638. Add an auto-save draft: after 3s of inactivity while composing, save to localStorage
639. Add draft indicator: "Draft saved 2s ago" in muted text below the compose textarea
640. Add a "Templates" button in compose: dropdown with pre-saved templates
641. Add a character limit warning at 90% of max message length
642. Add `rel="noopener noreferrer"` to all links in message content
643. Add a "Mark as spam" action with confirmation
644. Add a priority flag per message: right-click context menu with flag options
645. Add visual priority indicators: red flag chip on high-priority messages
646. Add `scroll-behavior: smooth` to the message list scroll container
647. Add `overscroll-behavior: contain` to the message list
648. Add keyboard shortcut `C` to open compose from anywhere on the communication page
649. Add an "Unread Count" in the page title: "COMMUNICATION (5)"
650. Add a preview "expand" button to make the message preview full-width

---

## CAT 14 — Health Page (50)
651. Add a `--ax-color-success` colored "HEALTH" heading with a pulse/heartbeat SVG icon
652. Add a "Health Score" hero stat — weighted composite of all health metrics
653. Add a "Daily Vitals" row: sleep, steps, water intake, calories — 4 stat cards
654. Add color coding per vital: green if target met, amber if within 80%, red if below 60%
655. Add animated progress rings on each vital stat card
656. Add a "Sleep Tracker" panel: nightly log with quality rating (1–5 stars)
657. Add star rating interaction: hover to preview rating, click to set
658. Add keyboard accessibility to star rating: Tab to focus, arrow keys to change, Enter to confirm
659. Add `role="radiogroup"` + `role="radio"` to star rating component
660. Add a 7-day sleep quality sparkline in the sleep panel
661. Add a "Mood Log" panel: emoji selector (😴😐😊😁🤩) with daily timestamp
662. Add `aria-label` to each mood emoji button: `aria-label="Very happy mood"`
663. Add a 30-day mood trend mini chart — color-coded by mood level
664. Add a "Workout" panel: list of logged workouts with type, duration, intensity chip
665. Add intensity chips: `LOW`, `MODERATE`, `HIGH`, `MAX` — each with appropriate color
666. Add a "Log Workout" button that opens a form: type, duration, notes, intensity
667. Add a "Nutrition" panel: daily macro breakdown (protein, carbs, fat) as a horizontal stacked bar
668. Add macro color coding: protein = blue, carbs = amber, fat = pink
669. Add "Target vs Actual" labels below the macro bar
670. Add a "Water Intake" tracker: 8 cup icons that fill in as cups are logged
671. Add cup fill animation: click cup → it fills from bottom with `--ax-sys` blue color
672. Add a "Medications / Supplements" panel: list with schedule and taken/not-taken toggle
673. Add a `checkbox`-style toggle per medication — ticking it marks as taken for the day
674. Add a reset button: resets all medication toggles at midnight (client-side)
675. Add a "Journal" panel: free-form daily reflection textarea with Markdown support
676. Add a "Save Entry" button with `Ctrl+S` shortcut
677. Add a past entries list: dates in a sidebar, clicking a date loads that entry
678. Add a character count to the journal textarea
679. Add a mood-color tinted border to the journal panel based on today's mood selection
680. Add a "Health Agent" status card — last analysis, last recommendation, next check-in
681. Add `aria-live="polite"` to the water intake counter — announces cup count changes
682. Add `aria-label` to all health stat cards: `aria-label="Sleep: 7.5 hours, target met"`
683. Add animated fill to the nutrition macro bar: fills from 0 to actual on page load
684. Add a "Weekly Summary" collapsible section — shows averages for all vitals this week
685. Add a "Goals" section: health goals with progress and "edit" affordance
686. Add a weight tracker chart: simple SVG line chart using `<polyline>`, 30-day range
687. Add a "Target weight" dashed line on the weight chart
688. Add keyboard shortcut `H` to jump to health page
689. Add loading skeletons for all health panels
690. Add empty states for all panels: "No workouts logged yet" + CTA button
691. Add `scroll-snap-type: x mandatory` to the daily vitals card row on mobile — swipeable
692. Add `scroll-snap-align: start` to each vitals card
693. Add swipe-to-dismiss on mood log entries (mobile)
694. Add `prefers-reduced-motion` pause on all health panel entry animations
695. Add a "Print Health Report" button — `@media print` styles for clean single-column output
696. Add a "Connect Wearable" placeholder button — grayed out with "Coming soon" tooltip
697. Add a "Health Insights" panel — 3 AI-generated bullets based on recent data
698. Add a subtle pulse animation to the heartbeat icon in the page heading
699. Add `required` attribute to all mandatory health form fields
700. Add inline validation to health log forms: shows error message on blur for empty required fields

---

## CAT 15 — Cards, Panels & Components (50)
701. Standardize `.ds-stat-card` height to `100%` within grid rows — equal-height cards
702. Add a `.ds-stat-card__trend` sub-component: small `+2.3%` or `-1.1%` with arrow icon + color
703. Add `cursor: pointer` to all `.ds-stat-card` elements that navigate on click
704. Add `.ds-stat-card:hover` `box-shadow: 0 8px 32px rgba(0,0,0,0.35)` deep shadow lift
705. Add `.ds-stat-card.loading` skeleton shimmer state — matches card layout exactly
706. Add `.ds-stat-card.error` state: `--ax-color-error` top border + "–" value
707. Add a `.ds-stat-card__icon` slot — 20px icon in top-right corner of stat card
708. Add `.ds-panel__header` sub-component: flex row with `title`, optional `action` slot
709. Add `.ds-panel__footer` sub-component: muted text, action buttons right-aligned
710. Add `.ds-panel__divider` — a horizontal `1px solid var(--ax-color-border-1)` rule between sections
711. Add `.ds-panel.loading` skeleton shimmer for the full panel
712. Add `.ds-panel.error` state — error banner at top with retry button
713. Add `.ds-panel.collapsed` state with `max-height: 0; overflow: hidden` transition
714. Add a collapse toggle arrow button in `.ds-panel__header` — rotates 180° when collapsed
715. Add `.ds-card` as a lighter panel variant: no `border-top` accent, less padding, subtle border
716. Add `.ds-card:hover` background lift + border brightening
717. Add `.ds-agent` card width normalization: all agent cards same min-width `200px`
718. Add `.ds-agent__header` with agent icon slot, name, status dot in a consistent layout
719. Add `.ds-agent__body` with description text in `--ax-text-2` body font
720. Add `.ds-agent__footer` with action buttons and last-run timestamp
721. Add `.ds-agent.active` border: `1px solid rgba(var(--domain-color), 0.3)`
722. Add `.ds-tag` chip component: `background: rgba(255,255,255,0.06); border-radius: var(--ax-chip-radius); padding: 2px 8px`
723. Add `.ds-tag` variants by color: `.ds-tag.sys`, `.ds-tag.uni`, etc.
724. Add `.ds-separator` utility: `display: block; height: 1px; background: var(--ax-color-border-1); margin: 16px 0`
725. Add `.ds-empty-state` component: centered content, muted icon, heading, description, CTA
726. Add `.ds-empty-state__icon` — 48px icon in `--ax-text-3` color
727. Add `.ds-toast` component: fixed `bottom-right` notification toast with auto-dismiss
728. Add toast variants: `.ds-toast.success`, `.ds-toast.error`, `.ds-toast.warning`, `.ds-toast.info`
729. Add toast slide-in animation: `translateX(120%) → translateX(0)`, `250ms ease-out`
730. Add toast close button: `×` icon, dismisses on click
731. Add `role="alert"` to `.ds-toast.error`, `role="status"` to others
732. Add `.ds-progress` component: `height: 6px; border-radius: 3px; background: var(--ax-color-border-1)` track
733. Add `.ds-progress__fill` with `width` driven by inline style or CSS variable
734. Add `.ds-progress.animated` — fill grows from 0 on first paint
735. Add `.ds-progress` color variants via `data-color` attribute
736. Add `.ds-switch` toggle component: `40px × 22px`, pill shape, smooth translate on toggle
737. Add `.ds-switch` focus ring via `:focus-visible`
738. Add `.ds-switch` keyboard support: `Space` to toggle
739. Add `role="switch"` + `aria-checked` to `.ds-switch`
740. Add `.ds-kbd` component for keyboard shortcut display: `border: 1px solid var(--ax-color-border-2); border-radius: 4px; padding: 1px 6px; font: var(--ax-font-mono) 11px`
741. Add `.ds-avatar` component: circle, initials, colored background per a deterministic hash of name
742. Add `.ds-divider` with label: `<div class="ds-divider">or</div>` — centered text in a horizontal rule
743. Add `.ds-tooltip` via `[data-tooltip]` attribute — `::after` pseudo-element, shown on `:hover` + `:focus`
744. Add tooltip enter animation: `translateY(4px) → translateY(0)`, `opacity: 0 → 1`, `150ms`
745. Add `.ds-skeleton` base: correct dimensions, shimmer animation, `border-radius` matching target component
746. Add `.ds-counter` animated number: JS `requestAnimationFrame` count-up from 0 to target in 1200ms
747. Add `.ds-code-block` component: monospace, `background: rgba(255,255,255,0.04)`, left `3px solid var(--ax-sys)` border, overflow scroll
748. Add copy-button overlay on `.ds-code-block` hover
749. Add `.ds-pill.active` variant: solid background fill instead of outline
750. Add `.ds-pill` hover: `background: rgba(255,255,255,0.08)` — currently has no hover state

---

## CAT 16 — Buttons, Badges & Controls (50)
751. Standardize all `.ds-btn` to exactly `height: var(--ax-btn-h-sm)` = 28px — audit for inconsistent heights
752. Add `.ds-btn.md` variant: `height: var(--ax-btn-h-md)` = 36px
753. Add `.ds-btn.lg` variant: `height: var(--ax-btn-h-lg)` = 44px — for primary CTA buttons
754. Add `.ds-btn.icon` variant: `width: height; padding: 0; border-radius: var(--ax-radius-sm)` — square icon button
755. Add `.ds-btn.icon-circle` variant: `border-radius: var(--ax-full-radius)` round icon button
756. Add `.ds-btn.primary` variant: `background: var(--ax-sys); color: #060f1e; border: none`
757. Add `.ds-btn.primary:hover`: `background: color-mix(in oklch, var(--ax-sys), white 15%)`
758. Add `.ds-btn.danger` variant: `border-color: var(--ax-color-error); color: var(--ax-color-error)`
759. Add `.ds-btn.danger:hover`: `background: rgba(239,68,68,0.1)`
760. Add `.ds-btn.success` variant: `border-color: var(--ax-color-success); color: var(--ax-color-success)`
761. Add `.ds-btn[disabled]`: `opacity: 0.4; cursor: not-allowed; pointer-events: none`
762. Add `.ds-btn.loading` state: replace label with a spinner, `pointer-events: none`
763. Add loading spinner to `.ds-btn.loading`: `::after` pseudo with `spin-cw` animation
764. Add `.ds-btn` pressed state: `transform: scale(0.97)` on `:active` — tactile feedback
765. Add `transition: background 150ms, border-color 150ms, color 150ms, transform 100ms` to `.ds-btn`
766. Add `white-space: nowrap` to all button labels — prevents wrapping on narrow containers
767. Add `gap: 6px` between icon and label in buttons that have both
768. Add `min-width: 64px` to `.ds-btn` — prevents overly narrow buttons
769. Add `.ds-btn-group` component: horizontal flex row of buttons with no gap, shared border, rounded corners on ends only
770. Add `.ds-icon-btn` semantic component with `aria-label` enforcement in HTML
771. Upgrade `.ds-badge` padding: `2px 8px` → `3px 10px` — currently too tight
772. Upgrade `.ds-badge` font-size: `9px` → `10px` — below comfortable threshold
773. Add `.ds-badge.lg` variant: `14px / 5px 12px` — for status banners
774. Add `.ds-badge` dot-variant: 8px circle badge with no text — status-only
775. Add `.ds-badge.pulse` variant: badge with a halo pulse animation for critical alerts
776. Add `.ds-badge.removable` variant: `×` button inside the badge to remove it
777. Add `.ds-badge[data-count]::before` pattern for number badges on parent elements
778. Ensure all `.ds-badge` variants pass 4.5:1 contrast ratio check
779. Add a "copied!" flash variant to copy buttons: text changes for 1.5s then reverts
780. Add `.ds-btn.split` variant: main action + dropdown arrow separated by a divider
781. Add `aria-haspopup="menu"` to split button dropdown arrow
782. Add `.ds-dropdown` component: floating menu that appears below a button, `box-shadow: var(--ax-shadow-xl)`
783. Add dropdown open animation: `scaleY(0.9) → scaleY(1)`, `opacity: 0 → 1`, `150ms`
784. Add dropdown close on outside click and `Escape` key
785. Add `role="menu"` + `role="menuitem"` to dropdown
786. Add keyboard navigation in dropdown: arrow keys to move, `Enter` to select, `Escape` to close
787. Add `.ds-btn.text` variant: no background, no border — just text with hover underline
788. Add a "confirmation" two-step button: first click shows confirm/cancel, second click executes
789. Add `tabindex="-1"` to decorative/icon elements inside buttons — prevent double-focus
790. Add `type="button"` to all `<button>` elements that are not form submits — prevents accidental form submission
791. Add `type="submit"` explicitly to all form submit buttons
792. Add `.ds-fab` (floating action button): `56px × 56px`, fixed bottom-right on mobile only, `z-index: var(--z-modal)`
793. Add `.ds-fab` entrance animation: `scale(0) → scale(1)` on page load, `400ms cubic-bezier(0.34, 1.56, 0.64, 1)`
794. Add `aria-label` to `.ds-fab`
795. Add a tooltip that appears on `.ds-fab` hover: explains the action
796. Add `focus-visible` ring to `.ds-fab`: `outline: 2px solid var(--ax-sys)`, `outline-offset: 3px`
797. Add domain-specific primary button color per page: system page → `--ax-sys`, finance → `--ax-fin`, etc.
798. Ensure all buttons have minimum `44px` touch target height on mobile — even if visually smaller
799. Add `padding-left: env(safe-area-inset-left)` to any edge-touching buttons on mobile
800. Add `active:scale(0.96)` to all `.ds-btn` for consistent press feedback across variants

---

## CAT 17 — Forms, Inputs & Tables (50)
801. Standardize all text inputs to `height: var(--ax-input-h-md)` = 40px
802. Add a floating label pattern to all text inputs: label starts inside, floats above on focus/fill
803. Add `transition: transform 200ms, font-size 200ms` to floating labels
804. Add `border-bottom: 2px solid var(--ax-sys)` focus state to all inputs (not just border-color change)
805. Add `background: var(--ax-color-bg-3)` to all inputs — currently some inherit wrong background
806. Add `border-radius: var(--ax-radius-md)` to all inputs for consistent corners
807. Add `padding: 0 12px` to all inputs for consistent text inset
808. Add `color: var(--ax-text-0)` to all inputs — ensure typed text is high-contrast
809. Add `caret-color: var(--ax-sys)` to all focused inputs
810. Add `outline: none` + `:focus-visible` ring via `box-shadow: var(--ax-focus-ring)` to all inputs
811. Add `.ds-input-group` component: label + input + helper text + error message in a vertical stack
812. Add `.ds-input-group__helper` in `--ax-text-3` muted text below input
813. Add `.ds-input-group__error` in `--ax-color-error` with `role="alert"` when input is invalid
814. Add `:invalid` pseudo-class styling: red bottom border + error icon inside input
815. Add `:valid` pseudo-class styling: subtle green bottom border for completed fields
816. Add `autocomplete="off"` to secure fields (passwords, tokens)
817. Add `spellcheck="false"` to all code/command inputs
818. Add `autocapitalize="none"` to code/command inputs
819. Add `autocorrect="off"` to code/command inputs
820. Add `.ds-textarea` normalization: `resize: vertical; min-height: 80px; font: inherit`
821. Add `field-sizing: content` to textareas for auto-height (with `max-height` cap + fallback)
822. Add `scrollbar-width: thin` to all textarea scroll areas
823. Add `.ds-select` wrapper: custom arrow, `appearance: none`, matches DS colors
824. Add `option` background color to `--ax-color-bg-3` in `.ds-select` for dark-themed options
825. Add `.ds-search` component: input + magnifier icon left-inset + clear `×` button right-inset
826. Add clear button visibility: appears only when input has a value
827. Add `inputmode="search"` to search inputs
828. Add `role="searchbox"` to search inputs
829. Add a "required" asterisk indicator `*` in `--ax-color-error` next to required field labels
830. Add `aria-required="true"` to all required inputs
831. Add `aria-describedby` linking each input to its helper and error text
832. Normalize `<table>` to: `width: 100%; border-collapse: collapse; table-layout: fixed`
833. Add `th` styles: `font: 600 var(--ax-text-2xs)/1 var(--ax-font-mono); letter-spacing: var(--ax-ls-widest); color: var(--ax-text-3); text-transform: uppercase`
834. Add `td` styles: `font: 400 var(--ax-text-xs) var(--ax-font-mono); color: var(--ax-text-1); vertical-align: middle`
835. Add `thead tr` border: `border-bottom: 2px solid var(--ax-color-border-2)`
836. Add `tbody tr` border: `border-bottom: 1px solid var(--ax-color-border-0)`
837. Add `tbody tr:last-child` no border
838. Add `scope="col"` to all `<th>` elements
839. Add keyboard sort trigger: `Enter` on a sortable `<th>` toggles sort direction
840. Add sort direction indicator: `↑`/`↓` icon in sorted column header
841. Add a sticky `<thead>` on scroll: `position: sticky; top: 0; background: var(--ax-color-bg-2); z-index: 1`
842. Add `overflow-x: auto` wrapper around all tables with `min-width: 480px` on the table element
843. Add a row selection mode: checkbox column that appears on hover, triggers bulk action bar
844. Add `aria-sort="ascending"/"descending"/"none"` to sortable `<th>` elements
845. Add `role="grid"` to data tables with interactive rows
846. Add `role="gridcell"` to all interactive table cells
847. Add `tabindex="0"` to the first `<tr>` in `<tbody>` for keyboard entry
848. Add arrow key navigation between rows in keyboard-navigable tables
849. Add a "no results" row: `<tr><td colspan="N" class="ds-empty-state">No results found</td></tr>`
850. Add row action buttons that appear on `<tr>:hover` — aligned right, `position: sticky; right: 0`

---

## CAT 18 — Modals & Overlays (50)
851. Add a base `.ds-modal` component: fixed overlay + centered dialog + glassmorphism background
852. Add `.ds-modal__backdrop`: `position: fixed; inset: 0; background: rgba(2,4,12,0.8); backdrop-filter: blur(8px)`
853. Add `.ds-modal__dialog`: `background: var(--ax-color-bg-3); border-radius: var(--ax-modal-radius); border: 1px solid var(--ax-color-border-1); box-shadow: 0 24px 80px rgba(0,0,0,0.6)`
854. Add `.ds-modal__header`: `padding: 24px 28px 0; font: 700 18px/1 var(--ax-font-display); color: var(--ax-text-0)`
855. Add `.ds-modal__body`: `padding: 20px 28px`
856. Add `.ds-modal__footer`: `padding: 0 28px 24px; display: flex; justify-content: flex-end; gap: 8px`
857. Add modal open animation: `scale(0.94) → scale(1)`, `opacity: 0 → 1`, `200ms cubic-bezier(0.34, 1.56, 0.64, 1)`
858. Add backdrop open animation: `opacity: 0 → 1`, `200ms ease`
859. Add modal close animation: reverse open animation, `150ms ease`
860. Add focus trap inside modals — `Tab` cycles only within modal children
861. Add `Escape` key handler to close all modals
862. Add `aria-modal="true"` to all modal dialogs
863. Add `role="dialog"` to all modal dialog elements
864. Add `aria-labelledby` pointing to the modal's `h2` or title element
865. Add `aria-describedby` pointing to modal body content
866. Move focus to the first interactive element when modal opens
867. Return focus to the trigger element when modal closes
868. Add a close `×` button in every modal header — `aria-label="Close"`
869. Prevent body scroll when modal is open: `body { overflow: hidden }` class toggled by JS
870. Add `overscroll-behavior: contain` inside modal body for scroll trapping
871. Add `.ds-drawer` component: slide-in from right, `width: min(400px, 90vw)`, full height
872. Add drawer open animation: `translateX(100%) → translateX(0)`, `300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
873. Add drawer backdrop: same as modal backdrop but `50%` opacity
874. Add drawer close on backdrop click
875. Add `.ds-bottomsheet` component: slide-in from bottom, for mobile-first actions
876. Add bottom sheet drag handle: `32px × 4px` rounded pill at the top center
877. Add bottom sheet drag-to-dismiss: swipe down to close (touch events)
878. Add `safe-area-inset-bottom` padding to bottom sheet footer
879. Add `aria-modal="true"` + `role="dialog"` to all drawers and bottom sheets
880. Add a `.ds-command-palette` modal: full-width search input, live-filtered results list, keyboard navigation
881. Add command palette open shortcut: `Ctrl+K` / `Cmd+K`
882. Add command palette result categories: Pages, Actions, Agent Tasks
883. Add command palette result keyboard navigation: arrow keys, `Enter` to execute, `Escape` to close
884. Highlight matched characters in command palette results using `<mark>` element styling
885. Style `<mark>` in command palette: `background: transparent; color: var(--ax-sys); font-weight: 700`
886. Add `role="combobox"` + `aria-expanded` + `aria-activedescendant` to command palette input
887. Add `role="listbox"` + `role="option"` to command palette results
888. Add `.ds-confirm-modal` specialized variant: danger heading, description, cancel + confirm buttons
889. Make `.ds-confirm-modal` confirm button default to `danger` variant when action is destructive
890. Add `autofocus` to cancel button in confirm modals (safer default focus for destructive actions)
891. Add a "Don't ask again" checkbox to repeat-confirmation modals (stored in localStorage)
892. Add `<dialog>` native element use where browser support allows — progressive enhancement
893. Add polyfill detection: use `<dialog>` if `HTMLDialogElement` is defined, otherwise fallback div
894. Add `max-height: 90vh; overflow-y: auto` to modal body for tall content
895. Add a gradient fade at the bottom of scrollable modal bodies: `:after` pseudo-element `linear-gradient(transparent, bg-color)`
896. Add `.ds-modal.fullscreen` variant for mobile: `position: fixed; inset: 0; border-radius: 0`
897. Add modal size variants: `.ds-modal.sm` (400px), `.ds-modal.md` (560px), `.ds-modal.lg` (720px), `.ds-modal.xl` (900px)
898. Add `will-change: transform, opacity` to modal dialog only during animation, remove after
899. Add `pointer-events: none` to modal backdrop during close animation — prevents double-click dismiss
900. Add `data-modal-id` attributes to all modals and trigger buttons for JS wiring

---

## CAT 19 — Animations & Micro-interactions (50)
901. Add `@view-transition { navigation: auto }` for browser-native page transition (progressive enhancement)
902. Add a page enter animation for all `#page-*` sections: `opacity: 0 → 1`, `translateY(8px) → 0`, `300ms ease-out`
903. Add `animation-fill-mode: both` to all page enter animations
904. Add staggered entry to grid children: `:nth-child(n)` delays of `50ms × n`, capped at 6 children
905. Add `animation: none` fallback in `@media (prefers-reduced-motion: reduce)` for ALL keyframe uses
906. Add an entry animation to `.ds-panel`: `opacity: 0 → 1`, `translateY(12px) → 0`, `350ms`
907. Add an entry animation to `.ds-stat-card`: same as panel but `200ms` offset
908. Add hover lift to `.ds-panel`: `translateY(0) → translateY(-2px)`, `box-shadow` deepens, `200ms ease`
909. Add hover lift to `.ds-stat-card`: same pattern, `150ms ease`
910. Add a "shimmer sweep" animation to the pipeline connector lines: a bright dot travels down each line
911. Upgrade `ovr-flowY` to use `ease-in-out` instead of `linear` — more organic feel
912. Add a `jitter` keyframe for error states: `translateX(-2px) → translateX(2px)` × 3, `400ms`
913. Use the `jitter` animation on all `.ds-badge.error` and form `:invalid` states on submit
914. Add a `bounce-in` keyframe: `scale(0) → scale(1.05) → scale(0.98) → scale(1)` for new items appearing
915. Use `bounce-in` on toast notifications and new kanban cards
916. Add a `fade-out` keyframe: `opacity: 1 → 0; pointer-events: none` for removing items from lists
917. Use `fade-out` before DOM removal for deleted list items, dismissed toasts, resolved notifications
918. Add `transition: height 300ms ease, opacity 300ms ease` for list item collapse (use `max-height` pattern)
919. Add smooth tab switch animation: exiting page `opacity: 1 → 0`, entering page `opacity: 0 → 1`, `150ms`
920. Add ripple effect on all `.ds-btn` clicks: `::after` pseudo with `scale(0) → scale(2.5)`, `opacity: 0.3 → 0`, `400ms`
921. Use `clip-path: circle(0% at var(--ripple-x) var(--ripple-y)) → circle(150%)` for accurate ripple origin
922. Add a "typing indicator" animation (three bouncing dots) to chat message pending state
923. Upgrade `typing` keyframe: smooth bounce path using `cubic-bezier(0.45, 0, 0.55, 1)` instead of linear
924. Add a `progress-fill` keyframe: used by all `.ds-progress` components — `width: 0 → 100%`
925. Add a `counter-up` JS utility: `requestAnimationFrame` loop from 0 to target in `duration`ms with `easeOut`
926. Add `scale(1.04)` on `.ds-nav-btn:hover` icon — subtle icon scale on nav hover
927. Add a `ripple` on `.ds-nav-btn:active` — same ripple pattern as buttons
928. Add a `marquee-pause-on-hover` behavior to all marquee/ticker scrollers: `animation-play-state: paused` on `:hover`
929. Add a `slot-machine` animation to stat cards on data refresh: values scroll up as they change
930. Add the connection animation to pipeline: when a new agent connects, its pill "pops in" with `bounce-in`
931. Add `transform-origin: center center` to all scale animations — prevents off-center scaling
932. Add `will-change: transform` to elements while they are actively animating, removed via `animationend` listener
933. Add a `glow-pulse` keyframe: `box-shadow: 0 0 8px COLOR → 0 0 20px COLOR → 0 0 8px COLOR`, `2s ease-in-out infinite`
934. Use `glow-pulse` on active agent cards and the system health indicator
935. Add a `blink` keyframe: `opacity: 1 → 0 → 1`, `1s step-start infinite` — for critical unread indicators
936. Use `blink` only on truly critical alerts — not decorative
937. Add a `rotate-full` keyframe: `rotate(0deg) → rotate(360deg)`, `1.2s linear infinite` — for loading spinners
938. Consolidate all spinner uses to `rotate-full` — eliminate `spin-cw`, `spin-ccw`, `j-spin-fwd` variants
939. Add an `orbit` keyframe: `rotate(0deg) → rotate(360deg)` on parent, with `rotate(0deg) → rotate(-360deg)` counter-rotate on child — keeps child upright while orbiting
940. Add `cubic-bezier(0.25, 0.46, 0.45, 0.94)` as the default easing for all UI transitions
941. Add `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring bounce) for elements appearing or expanding
942. Add `cubic-bezier(0.55, 0, 1, 0.45)` (sharp ease-in) for elements disappearing or collapsing
943. Add `animation-composition: add` to layered animations on the same element where applicable
944. Add `offset-path` based animation for the pipeline connection dots — follow the actual connector line path
945. Add a `wiggle` keyframe: `rotate(-3deg) → rotate(3deg) → rotate(-1deg) → rotate(0)` — for empty state illustrations
946. Use `wiggle` on empty state icons to gently draw attention on page load
947. Add hover `scale(1.02)` + `brightness(1.1)` to all domain card thumbnails
948. Add `transition: filter 200ms` to all image/icon elements that change on hover
949. Add `animation-delay` stagger to the 5 domain nav items: `0ms, 50ms, 100ms, 150ms, 200ms` — on initial page load only
950. Add a "first visit" animation sequence: logo fades in, then sidebar slides in, then command page content reveals — all in `@starting-style` or JS-driven class on body

---

## CAT 20 — Accessibility, Performance & Mobile (50)
951. Add `lang="en"` to `<html>` if missing — required for screen reader language detection
952. Add `<meta charset="UTF-8">` if missing
953. Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — `viewport-fit=cover` for iOS notch
954. Add `<meta name="theme-color" content="#06101f">` — iOS/Android browser chrome color
955. Add `<meta name="apple-mobile-web-app-capable" content="yes">` — iOS fullscreen PWA
956. Add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` — iOS status bar
957. Add `<meta name="apple-mobile-web-app-title" content="APEX">` — PWA display name
958. Add `<link rel="apple-touch-icon" href="/icon-192.png">` — iOS home screen icon
959. Add `<link rel="manifest" href="/manifest.json">` — PWA manifest reference
960. Add `manifest.json` file: name, short_name, icons (192/512), start_url, display: standalone, background_color, theme_color
961. Add `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` — SVG favicon (supports dark mode)
962. Add `<link rel="icon" href="/favicon.png" sizes="32x32">` — fallback PNG favicon
963. Add `<title>APEX OS</title>` if not present — required for browser tab and bookmarks
964. Add `<meta name="description" content="APEX AI OS — Personal intelligent agent system">` — for bookmarks/sharing
965. Audit all interactive elements — every one must be reachable by Tab key
966. Audit all interactive elements — every one needs `:focus-visible` styling
967. Add `aria-label` to the topbar element: `aria-label="Application topbar"`
968. Add `aria-label` to the main content area: `aria-label="Main content"`
969. Add `role="banner"` to the topbar (equivalent to `<header>` for a non-semantic element)
970. Add `role="contentinfo"` to any footer element
971. Add `role="complementary"` to sidebar (equivalent to `<aside>`)
972. Add `skip-to-main` link: first focusable element in `<body>`, `visually-hidden` until focused, jumps to `#main-content`
973. Add `id="main-content"` to the main page container
974. Add `tabindex="-1"` to `#main-content` so it can receive focus programmatically
975. Audit all `<img>` elements — every image needs `alt` attribute
976. Add `aria-hidden="true"` to all purely decorative icons and graphics
977. Add `role="img"` + `aria-label` to all meaningful SVG elements
978. Add `aria-hidden="true"` to all `<canvas>` elements (orb, stars) — they're decorative
979. Add `aria-live="polite"` to notification area — screen readers announce new notifications
980. Add `aria-live="assertive"` to all error messages
981. Add `aria-atomic="true"` to stat card values that update dynamically
982. Add `aria-busy="true"` to containers while loading, `aria-busy="false"` when complete
983. Add `aria-disabled="true"` to disabled buttons (in addition to `disabled` attribute)
984. Ensure color is never the ONLY indicator of state — add text or icon alongside
985. Test and fix keyboard-only navigation for the entire app (Tab + Shift+Tab full cycle)
986. Test and fix screen reader announcement of all dynamic updates
987. Add `loading="lazy"` to all below-the-fold images
988. Add `decoding="async"` to all images
989. Add `fetchpriority="high"` to the largest above-the-fold image (if any)
990. Add `dns-prefetch` links for Google Fonts domains in `<head>`
991. Move all `<script>` tags to bottom of `<body>` with `defer` — none should block rendering
992. Add `<link rel="preload" as="font">` for the 3 core font files (Space Grotesk woff2, JetBrains Mono woff2, IBM Plex Sans woff2)
993. Add `Content-Security-Policy` meta tag as a baseline (no eval, no inline scripts after refactor)
994. Add `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` to the main layout wrapper for iOS notch/gesture areas
995. Add `touch-action: manipulation` to all buttons — disables double-tap zoom delay on iOS
996. Add `touch-action: pan-y` to horizontally-scrollable containers — prevents scroll hijacking
997. Test at 375px viewport width — no horizontal scroll, all buttons tappable, text readable
998. Test at 768px viewport width — layout transitions correctly from mobile to desktop
999. Test at 1280px viewport width — full desktop layout, sidebar expanded on hover, all grids at max columns
1000. Run a full Lighthouse audit after all changes: target Accessibility 100, Best Practices 100, Performance ≥ 90

---

## Execution Order

Execute categories in this sequence for maximum stability:
1. CAT 01 (Architecture) — cleans the foundation
2. CAT 02 (Tokens) — establishes the token system
3. CAT 03 (Typography) — sets the type scale
4. CAT 04 (Color) — applies the visual language
5. CAT 15–18 (Components) — rebuilds components on the clean foundation
6. CAT 05 (Nav) — then navigation
7. CAT 06–14 (Pages) — then all pages, one at a time
8. CAT 19 (Animations) — layer on motion last
9. CAT 20 (Accessibility + Performance) — final audit pass
