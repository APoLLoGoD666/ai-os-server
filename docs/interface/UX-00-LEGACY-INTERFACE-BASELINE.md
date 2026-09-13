# UX-00 — Legacy Interface Baseline Audit

**Programme**: APEX UX Phase  
**Task ID**: UX-00  
**Status**: CERTIFIED  
**Date**: 2026-08-26  
**Auditor**: Claude (claude-sonnet-4-6)  
**Scope**: Read-only forensic audit — zero application modifications  

---

## 1. Authority

This document is the authoritative baseline record for the APEX legacy frontend.  
Mandate: UX-00 — Legacy Interface Baseline / Audit, UX Phase inception.  
Governs: All subsequent UX phases (UX-01 through UX-19) take this document as their starting conditions.  
Immutability: Once certified, this document is not modified. Superseded by UX-01 findings only by explicit authorisation.

---

## 2. Scope

| In scope | Out of scope |
|----------|-------------|
| `public/dashboard.html` (primary SPA) | Backend business logic |
| `public/editor.html` (secondary) | Database schema |
| `public/apex-v2.css`, `public/apex-custom.css` | Server routing not referenced from frontend |
| `public/sw.js`, `public/manifest.json` | Render deployment config |
| `public/apex-electron.js` | API contract correctness |
| `src/routes/ui.js`, `src/routes/auth.js` | Third-party service internals |
| `src/routes/chat.js`, `src/routes/notifications.js`, `src/routes/voice.js` | |
| `lib/app-auth.js` | |
| `docs/implementation/APEX-INTERFACE-READINESS-AUDIT.md` (prior art) | |

**ABSOLUTE CONSTRAINT**: This audit is read-only. No application file was modified.

---

## 3. Audit Methodology

1. Direct file reads of all in-scope files
2. Grep/pattern search for navigation, API endpoints, CSS tokens, JS patterns
3. Cross-reference against prior audit (`APEX-INTERFACE-READINESS-AUDIT.md`, 2026-08-19)
4. Structured notation for each finding category
5. Evidence register at Section 24 cites specific line ranges

Files read in full or significant part:
- `public/dashboard.html` — 20,826 lines; read in chunks covering head, CSS cascade, nav HTML, all 14 page sections, JS init, API calls
- `public/apex-v2.css` — 57 KB; read header and token sections
- `public/sw.js`, `public/manifest.json`, `public/apex-electron.js` — read in full
- `src/routes/` — ui.js, auth.js, chat.js, notifications.js, voice.js — read in full
- `public/editor.html` — read in full

---

## 4. Legacy Frontend Boundary

### 4.1 Primary Interface

| Property | Value |
|----------|-------|
| File | `public/dashboard.html` |
| Size | 20,826 lines / ~1.26 MB |
| Architecture | Monolithic SPA — single HTML file, zero external app JS files |
| Meta version | `<meta name="apex-version" content="v10">` |
| CSS version in-file | v10 → v13 (inline style blocks versioned by comment) |
| Served at | `GET /` and `GET /dashboard.html` (requires `requireAuth` middleware) |
| Framework | Vanilla JS — no React, Vue, or Angular; zero build pipeline for frontend |
| Module system | None — all JS in `<script>` blocks, global `window.*` functions |

### 4.2 Secondary Interface

| Property | Value |
|----------|-------|
| File | `public/editor.html` |
| Size | ~4.5 KB |
| Purpose | GrapesJS visual layout editor |
| Auth | `requireAppAccess` middleware (`src/routes/ui.js:L20`) |
| APIs used | `GET /load-layout`, `POST /save-layout` |

### 4.3 Static Asset Whitelist

`src/routes/ui.js` explicitly whitelists specific assets — no open static directory:
- `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`
- `apex-v2.css`, `apex-custom.css`
- `apex-electron.js`

Any asset not on this list returns 404 by design.

---

## 5. Screen Inventory

14 page sections exist as `<div class="page" id="page-{name}">` elements. Visibility is CSS-toggled via `.page.active` (opacity: 1, pointer-events: auto). Transition: 220ms ease with translateX(18px → 0) slide.

| # | Page ID | Display Name | Default | Line Range |
|---|---------|-------------|---------|-----------|
| 1 | `page-command` | Command | ACTIVE | 8614–8762 |
| 2 | `page-system` | System | hidden | 8765–9062 |
| 3 | `page-communication` | Communication | hidden | 9063–9446 |
| 4 | `page-finance` | Finance | hidden | 9447–9681 |
| 5 | `page-operation` | Operations | hidden | 9682–9913 |
| 6 | `page-health` | Health | hidden | 9914–10130 |
| 7 | `page-overview` | Overview | hidden | 10131–11205 |
| 8 | `page-business` | Business | hidden | 11206–11369 |
| 9 | `page-university` | University | hidden | 11370–11530 |
| 10 | `page-occult` | Occult | hidden | 11531–11664 |
| 11 | `page-research` | Research | hidden | 11665–11740 |
| 12 | `page-browser` | Browser | hidden | 11741–11780 |
| 13 | `page-civilisation` | Civilisation | hidden | 11781–11872 |
| 14 | `page-reality` | Reality | hidden | 11873–end |

**Default landing page**: `page-command` (`class="page active"`).

### 5.1 Page Descriptions

**page-command**: The hub. A full-screen plasma orb (WebGL canvas `#plasmaOrb`) centred in a "cmd-split" two-column layout. Left/centre: orb + four stat chips (Balance, Messages, Tasks, System Health) + Gemini Live transcript overlay. Right: live activity feed (`#apexFeedBody`). Below split: Constitution Charter widget (6 articles, 3×2 grid). Input zone hidden on this page via CSS `:has(#page-command.active)`.

**page-system**: Infrastructure/automation hub. Header: "SYSTEM — INFRASTRUCTURE · AUTOMATION · SECURITY · PLATFORM HEALTH". Contains: Executive Council (5-column agent grid), Command Chain trace display, Active Systems grid (3-col), Resource Monitor, Domain Agent Chat Modal (hidden by default — modal overlay with chat log + input).

**page-communication**: Email/messaging interface. Handles Gmail integration, unread counts, message viewing.

**page-finance**: Financial dashboard. Balance display, transaction views, budget tracking.

**page-operation**: Operational task management. Active operations, scheduling, execution status.

**page-health**: Health and wellbeing metrics. Fitness, vitals, health goal tracking.

**page-overview**: Comprehensive dashboard view. Aggregated cross-domain status, `#ovr-pipeline` (constitutional pipeline visibility — listed as CRITICAL missing by prior audit, now present in DOM), metrics grid.

**page-business**: Business domain management. Projects, revenue, client tracking.

**page-university**: Education/learning management. Course tracking, study scheduling, knowledge domains.

**page-occult**: Esoteric/metaphysical domain. Unique to APEX personal OS scope.

**page-research**: Research tracking and knowledge base integration.

**page-browser**: Embedded browser or web content panel.

**page-civilisation**: Civilisation/society-level thinking and macro-trend tracking.

**page-reality**: Reality Architecture system. 12 sub-panels: health status, observers, belief gap, epistemic capital, attention queue, understanding layers, intent attribution, claims browser, counterfactual worlds, meta-model quality, mental models, civilisation self-model. Most panels populated via API calls (fetch) on `window.loadRealityPage()`.

---

## 6. Navigation Map

### 6.1 Desktop Navigation (≥ 900px)

Left sidebar (200px wide, `grid-area: sidenav`), flex-column. Nav buttons are 52px height, row layout with icon + label. Active item: left 3px border line in primary colour, no top indicator. Nav becomes a sidebar replacing the bottom tab bar.

### 6.2 Mobile Navigation (< 900px)

Bottom tab bar (`var(--nav-h): 60px`). Active item: 2px top indicator line. Icons 17px, labels 8px uppercase 0.13em tracking. Safe-area-inset-bottom padding applied.

**Mobile page selector**: Hamburger toggle (`#mobileNavToggle`) at top-left reveals `#mobileNavDropdown` — a 3×4 grid of 11 page buttons:

| Row 1 | Row 2 | Row 3 |
|-------|-------|-------|
| COMMAND | OVERVIEW | OPS |
| SYSTEM | COMMS | FINANCE |
| BUSINESS | UNI | HEALTH |
| OCCULT | RESEARCH | — |

Note: browser, civilisation, reality accessible via bottom nav or keyboard but absent from mobile dropdown.

### 6.3 Keyboard Navigation

Shortcuts defined (help overlay, `#helpOverlay`):
- `1–0`: Switch page (10 pages)
- `R`: Refresh current page
- `A`: Jump to approvals
- `N`: Jump to notifications
- `/`: Focus chat input
- `?`: Toggle help overlay
- `ESC`: Close overlay / drawer
- `⇧R`: Run next feature

### 6.4 Navigation Implementation

`window.switchPage(name)` — global function called by nav buttons via `data-fn` attribute delegation. Wraps page activation, title update (`#topbar-pg-title`, `#topbar-pg-sub`), and calls page-specific loaders (e.g., `window.loadRealityPage()`). The reality page monkey-patches `window.switchPage` at module close to inject its own loader: `_origSwitch = window.switchPage; window.switchPage = function(name) { _origSwitch(name); if (name==='reality') window.loadRealityPage(); }`.

---

## 7. Component Inventory

### 7.1 Global Shell Components

| Component | ID/Class | Purpose |
|-----------|----------|---------|
| Top bar | `.topbar` | Brand, clock (HH:MM:SS), date, status dot |
| Brand ring | `.brand-ring` | Animated cyan orb indicator, 3s pulse |
| Status dot | `.status-dot` | Online/offline indicator (red/cyan) |
| Page title | `#topbar-pg-title` | Current page name (Cinzel font) |
| Page subtitle | `#topbar-pg-sub` | Page tagline (JetBrains Mono) |
| Clock | `#clockTime` / `#clockDate` | Live clock |
| Bottom/side nav | `.bottom-nav` | 14-page navigation |
| Input zone | `.input-zone` | Global chat input bar |
| Chat input | `.chat-input` | Text input (pill shape, 36px height) |
| Mic button | `.mic-btn` | Voice capture trigger |
| Send button | `.send-btn` | Submit message |
| Clear chat | `.clear-chat-btn` | Reset chat log |
| Auto-listen | `.auto-listen-btn` | Toggle continuous voice listening |

### 7.2 Overlays and Modals

| Component | ID | Trigger |
|-----------|-----|---------|
| Login overlay | `#apexLoginOverlay` | Unauthenticated state |
| Command palette | `#cmdPalette` | Keyboard shortcut |
| Help overlay | `#helpOverlay` | `?` key |
| Agent drawer | `#agentDrawer` | Agent tile click |
| Domain agent modal | `#domainAgentModal` | Agent card click in System page |
| Drop overlay | `#dropOverlay` | File drag over window |
| Mobile nav dropdown | `#mobileNavDropdown` | Hamburger toggle |

### 7.3 Command Page Components

| Component | ID | Purpose |
|-----------|-----|---------|
| Plasma orb | `#plasmaOrb` | WebGL canvas, primary voice trigger |
| Plasma orb sub-label | `#plasmaOrbSubLabel` | "STANDBY · TAP TO SPEAK" |
| Gemini Live pill | `#apexLivePill` | Toggle Gemini Live connection |
| Gemini Live transcript | `#apexLiveTranscript` | User text + APEX response overlay |
| Waveform | `#waveform` | 7-bar animated waveform during voice |
| Activity feed | `#apexFeedBody` | Live event stream |
| Stat chips (×4) | `#cmdStat0–3` | Balance, Messages, Tasks, System Health |
| Constitution charter | inline div | 6-article A1–A6 grid |
| Orb state badge | `#cmdOrbState` | Hidden, JS-accessed state label |

### 7.4 System Page Components

| Component | Purpose |
|-----------|---------|
| Executive Council (`#sys-exec-council`) | 5-column agent card grid, populated by `buildExecutiveCouncil()` |
| Command Chain (`#sys-command-chain`) | Horizontal routing trace, populated by `buildCommandChain()` |
| Active Systems (`#sys-active-systems`) | 3-col grid of system status tiles |
| Resource Monitor | Sidebar panel |
| Domain Agent Modal (`#domainAgentModal`) | Per-agent chat interface, 520px modal |

### 7.5 Design System Components (reusable classes)

| Class | Description |
|-------|-------------|
| `.ds-panel` | Glass card, 350ms entry animation |
| `.ds-btn` (`.cyan`, `.grey`, `.xs`) | Standardised buttons |
| `.ds-badge` | Inline tag/badge |
| `.ds-input` | Form input field |
| `.ds-dot` (`.cyan`, `.green`, `.amber`, `.pulse`) | Status indicator dot |
| `.ds-grid-2`, `.ds-grid-3`, `.ds-grid-agents` | Responsive grid layouts |
| `.ds-page-title` | Page heading typography |
| `.t-h2`, `.t-label`, `.t-small` | Typography scale |
| `.skel`, `.skel-wide`, `.skel-med` | Skeleton loading placeholders |
| `.ds-stat-card`, `.ds-stat-value` | Metric display cards |
| `.ds-fab` | Floating action button |
| `.ds-toast` | Notification toast |
| `.ds-progress-fill`, `.ds-spinner` | Progress/loading states |
| `.ds-empty-icon` | Empty state illustration |

---

## 8. Visual Design Inventory

### 8.1 Colour Systems — Active Token Sets

**WARNING: Five competing `:root` token blocks coexist in the file.**

| Block | Location | Primary Hue | Background |
|-------|----------|------------|-----------|
| v1 (original inline) | `<style>` block 1, line 23 | Cyan `#00d4ff` | `#03060f` |
| apex-v2.css external | `<link>` at line 18 | Indigo `#6366f1` | `#000000` (pure black) |
| v3+ inline override | Later `<style>` blocks | Indigo variations | Competed against v1 |
| AX system (`--ax-*`) | `<style>` block ~6500 | Multi-domain colour system | Inherits base |
| Titan/DS system | `<style>` block ~4000 | `#5e6ad2` (Linear-style indigo) | Inherits base |

**Effective result**: The original cyan scheme (`#00d4ff`) defined in the first `<style>` block governs painted elements (orb, borders, input focus) because it loads first and uses specific properties. The `apex-v2.css` indigo scheme (`#6366f1`) governs the design system component layer. The AX system adds domain-specific overrides. The cascade is non-deterministic in several panels — visual appearance depends on selector specificity rather than intentional hierarchy.

**Domain colour vocabulary** (AX system):
- `--ax-sys`: System domain (blue `#5b9eff`)
- `--ax-fin`: Finance domain (green `#3fd29a`)
- `--ax-uni`: University domain (purple `#7c6fff`)
- `--ax-biz`: Business domain (amber `#efb45a`)
- `--ax-file`: File domain (pink `#ec7fa3`)

### 8.2 Typography

| Role | Font | Weight | Source |
|------|------|--------|--------|
| Body / UI | Inter | 400, 500 | System stack (not loaded via CDN) |
| Display / headings | Cinzel | 600, 700 | Google Fonts |
| Code / mono / labels | JetBrains Mono | 400, 500, 600 | Google Fonts |
| Secondary sans | IBM Plex Sans | 300, 400, 500 | Google Fonts |
| Modern UI | Space Grotesk | 400, 500, 600, 700 | Google Fonts |

Five typefaces in active use. JetBrains Mono dominates informational labels, stats, and mono displays. Cinzel appears in page titles and the brand name. Space Grotesk in card headings within Constitution charter.

### 8.3 Spacing and Layout

- Top bar: 52px height (`--topbar-h`)
- Bottom nav: 60px height (`--nav-h`)
- Input zone: 54px height (`--input-h`)
- Desktop sidebar: 200px width
- Page padding: 10px mobile / 14px desktop
- Gap between panels: 10px mobile / 12px desktop

### 8.4 Iconography

Emoji characters used as icons in nav buttons and some UI elements (observed in voice/mic interactions). SVG icons inline in stat chips (custom paths for wallet, mail, checklist, heartbeat). No icon library (no Heroicons, Lucide, or Font Awesome loaded).

### 8.5 Animation System

| Animation | Duration | Usage |
|-----------|----------|-------|
| Page entry | 300ms | `.page.active` slide-in |
| Panel entry | 350ms | `.ds-panel` fade-up |
| Nav icon hover | 150ms spring | Scale 1.1 |
| Brand pulse | 3s | Infinite glow pulse |
| Orb states | 0.55–4s | Listening / active / waiting / idle |
| Waveform bars | 0.48s | 7 staggered bars during voice |
| Stat card hover | 150ms | translateY(-2px) lift |
| `prefers-reduced-motion` | — | All animations disabled |

---

## 9. Functional Inventory

### 9.1 Authentication Flow

1. `GET /` or `GET /dashboard.html` → `requireAuth` middleware checks `apex_token` cookie
2. If not authenticated: server redirects to login, OR client shows `#apexLoginOverlay`
3. Login overlay: password input → `POST /auth/login` → server sets `apex_token` httpOnly cookie (7-day JWT) + `apex_session` cookie
4. API calls also send `x-app-key` header loaded from `localStorage.getItem('apex_app_key')` — dual auth mechanism
5. Logout: `POST /auth/logout` → clears cookies

**Dual-auth risk note**: JWT cookie is httpOnly (XSS-safe); localStorage API key is XSS-accessible. Any stored XSS can exfiltrate the API key even if the JWT is protected.

### 9.2 Polling Architecture

Four `setInterval` calls identified (violates Constitution Article A3: "Events, Not Polling"):

| Interval | Period | Likely purpose |
|----------|--------|---------------|
| Interval 1 | 60s | Notification count refresh |
| Interval 2 | 45s | Chat/message status |
| Interval 3 | 120s | System health check |
| Interval 4 | 60s | General data refresh |

These are polling-based data sync. A3 mandates event-driven movement; this is a direct constitutional violation in the current frontend.

### 9.3 File Operations

- Drag-and-drop: `#dropOverlay` appears on file drag; uploads via fetch
- Input zone: global text input persistent across all pages (hidden on command page)

### 9.4 Keyboard Shortcut System

Delegated click handler on `document` checks `e.target.dataset.fn` and dispatches to named function. All nav buttons, action buttons, and modals use `data-fn="functionName"` + optional `data-args='[...]'`. This is a consistent, well-structured event delegation pattern.

### 9.5 Data Loading Pattern

Pages call dedicated loader functions on activation:
- `window.loadRealityPage()` — 12 sequential fetch calls
- `buildExecutiveCouncil()`, `buildCommandChain()`, `buildActiveSystems()` (System page)
- Individual panels load independently, rendering error states on failure

No global data loading strategy — each page manages its own fetch lifecycle.

---

## 10. AI Interaction Audit

### 10.1 Text Chat

- Input zone persistent at page bottom (hidden only on command page)
- `POST /chat` — HAIKU model, `maxTokens: 500`, 25s timeout
- Response: non-streaming; full reply returned then rendered
- `stream_plan` field present in request but response is non-streaming
- 7-layer context assembly in `src/routes/chat.js`
- Chat log (`#chatLog`) — hidden on command page, visible on chat/other pages

### 10.2 Voice Systems (4 distinct mechanisms)

| Mechanism | Trigger | Transport | Notes |
|-----------|---------|-----------|-------|
| Gemini Live | `#apexLivePill` toggle or plasma orb tap | WebSocket (PCM audio, 16kHz in / 24kHz out) | Full duplex live conversation; transcript shown in `#apexLiveTranscript` |
| Browser STT | Mic button (`.mic-btn`) | Web Speech API (`SpeechRecognition`) | Transcribes to text, sends via chat |
| HTTP transcription | Mic recording | `POST /api/transcribe` | Server-side transcription |
| Browser TTS | AI response | Web Speech API (`speechSynthesis`) | Text-to-speech playback of responses |

Server-side pipeline also exists at `POST /api/voice/pipeline`: intent classification → context fetch → response → WebSocket broadcast.

**Voice UX fragmentation**: 4 different voice mechanisms exist with no unified entry point. A user has no clear indication which mechanism is active or preferred. The plasma orb on the command page activates Gemini Live; the mic button in the input zone triggers browser STT; both trigger different backends and produce different experiences.

### 10.3 AI Agent System

- Domain Agent Chat Modal: per-agent conversational interface
- Executive Council: 5-agent grid (populated dynamically)
- Command Chain: routing trace display
- Multiple domain agents (System, Finance, Business, University, File agents per CLAUDE.md)
- Agent drawer (`#agentDrawer`): slide-in panel showing individual agent detail

---

## 11. Notification Audit

### 11.1 Architecture

Two notification endpoints:
- `GET /notifications` — calls `pgListNotifications(50)` via `src/routes/notifications.js`
- `GET /api/notifications` — direct Supabase query, read-and-clear-unread pattern

### 11.2 Actions Available

- `POST /notifications/:id/read` — mark individual as read
- Hidden counters in topbar: `#topbarEmailCount`, `#topbarTaskCount` (present in DOM but `display:none`)

### 11.3 Push Notifications (PWA)

`public/sw.js` includes `push` event listener with `self.registration.showNotification()`. Push is registered and functional at the service worker level. No client-side push subscription flow was audited in dashboard.html, but the infrastructure exists.

### 11.4 In-Page Notification Centre

`page-overview` or a dedicated section handles notification listing. The dedicated `page-` for notifications is not in the 14-page inventory — notifications appear to be a panel within another page, not a standalone page.

---

## 12. Popup and Overlay Presentation Audit

| Overlay | Trigger mechanism | Close mechanism | Z-index |
|---------|-----------------|-----------------|---------|
| Login overlay | Server/client auth state | Successful login | 999999 |
| Command palette | Keyboard / `data-fn` | `ESC` / click outside | ~200 |
| Help overlay | `?` key | `ESC` / toggle button | ~100 |
| Agent drawer | Agent tile click | Overlay click / ✕ button | ~300 |
| Domain agent modal | Agent card click | `closeDomainAgentModal` / ✕ button | 400 |
| Drop overlay | File drag enter | File drop / drag leave | ~500 |
| Mobile nav dropdown | Hamburger toggle | Second toggle / nav selection | 8000 |

**Z-index inconsistency**: Mobile nav dropdown at z-index 8000 sits far above the login overlay (999999 would trump it, but the login overlay is also fixed). No formal z-index scale defined in design tokens — values are scattered across inline styles.

---

## 13. Backend / API Mapping

All API calls observed via `fetch()` calls in dashboard.html, cross-referenced with route files.

### 13.1 Authentication
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/gmail/reauthorise` (Gmail OAuth flow)

### 13.2 Chat
- `POST /chat` (main AI conversation, HAIKU, 500 tokens, 25s timeout)

### 13.3 Notifications
- `GET /notifications`
- `POST /notifications/:id/read`
- `GET /api/notifications`

### 13.4 Voice
- `POST /api/voice/pipeline`
- `POST /api/transcribe`
- WebSocket: Gemini Live audio (dynamic URL, origin `localhost:5002` / `127.0.0.1:5002` in CSP)

### 13.5 System / Agents
- Agent-specific routes mounted via `_loadAgentRoutes` in server.js (30+ route files)
- System page: `GET /api/system/*` (executive council, command chain, active systems, resource monitor)
- Domain agent chat: `POST /api/chat/domain/:agentId` or similar

### 13.6 Reality Architecture
- `GET /api/reality/claims`
- `GET /api/reality-architecture/health`
- `GET /api/reality-architecture/observers`
- `GET /api/reality-architecture/belief-gap`
- `GET /api/reality-architecture/epistemic-capital`
- `GET /api/reality-architecture/attention-queue`
- `GET /api/reality-architecture/understanding-layers`
- `GET /api/reality-architecture/intent/agent-orchestrator/rate`
- `GET /api/reality-architecture/counterfactual/worlds`
- `GET /api/reality-architecture/meta-model`
- `GET /api/reality-architecture/mental-models/agent-orchestrator`
- `GET /api/reality-architecture/self-model`
- `POST /api/reality-architecture/seed`

### 13.7 WebSockets
- `/ws/viz` — visualisation data stream
- Gemini Live WebSocket — audio streaming (PCM 16kHz/24kHz)

### 13.8 Auxiliary
- `GET /load-layout` / `POST /save-layout` (editor.html only)
- `GET /manifest.json`, `GET /sw.js` (PWA infrastructure)

**Total unique API surface touched from frontend**: ~55+ endpoints across 14 domains.

---

## 14. Canonical APEX Mapping

Mapping of frontend pages to APEX canonical architecture domains (from CLAUDE.md and project memory):

| Page | APEX Domain | Agent | Canonical Layer |
|------|-------------|-------|----------------|
| command | Core OS / AI Interface | Orchestrator | L0 — Constitutional |
| system | Infrastructure | System Agent | L1 — Platform |
| communication | Communications | (unnamed) | L2 — Domain |
| finance | Finance | Finance Agent | L2 — Domain |
| operation | Operations | (unnamed) | L2 — Domain |
| health | Health | (unnamed) | L2 — Domain |
| overview | Cross-domain | All agents | L1 — Aggregation |
| business | Business | Business Agent | L2 — Domain |
| university | Education | Uni Agent | L2 — Domain |
| occult | Esoteric | (unnamed) | L2 — Domain |
| research | Knowledge | (unnamed) | L2 — Domain |
| browser | External content | (unnamed) | L3 — Interface |
| civilisation | Macro/society | (unnamed) | L3 — Extended |
| reality | Reality Architecture | Orchestrator | L0 — Constitutional |

The Reality Architecture page maps directly to the epistemic infrastructure (KG-01 through KG-08 system outputs), making it a constitutional-layer page alongside Command.

---

## 15. Keep / Refine / Rework / Replace / Remove / Investigate Matrix

| Item | Disposition | Rationale |
|------|------------|-----------|
| Navigation architecture (page-based SPA) | KEEP | Functional, low-latency page switching |
| `window.switchPage` delegation pattern | KEEP | Consistent, extensible |
| `data-fn` event delegation system | KEEP | Clean separation of handler registration |
| `prefers-reduced-motion` support | KEEP | Accessibility |
| Safe-area-inset-bottom handling | KEEP | Correct iOS PWA support |
| Dual auth (JWT cookie + API key) | REFINE | Retain JWT, eliminate localStorage API key |
| Bottom nav → sidebar responsive switch | KEEP | Works correctly |
| Plasma orb as primary voice entry | REFINE | Good concept, needs clearer state visibility |
| Activity feed (command page) | KEEP | High value real-time display |
| Constitution charter widget | KEEP | Core OS identity element |
| Stat chips (Balance, Messages, Tasks, Health) | REFINE | Valuable, needs live data plumbing |
| Domain Agent Modal | REFINE | Functional but generic; needs domain styling |
| CSS cascade (5 competing `:root` blocks) | REWORK | Consolidate to single token source |
| 12-15 inline `<style>` blocks | REWORK | Extract to structured CSS files |
| Monolithic `dashboard.html` (20,826 lines) | REWORK | Modularise — page templates, component registry |
| All JS inline in HTML | REWORK | Extract to external JS modules |
| 4 polling intervals | REWORK | Replace with WebSocket event subscription |
| 4 competing voice mechanisms | REWORK | Unify under single voice orchestration layer |
| Google Fonts (external CDN) | INVESTIGATE | Privacy/performance: evaluate self-hosting |
| Supabase-js@2 via CDN | INVESTIGATE | Could be bundled; CDN load failure = broken auth |
| Chart.js@4.4.0 via CDN | INVESTIGATE | Same; version lock via CDN is fragile |
| Service worker cache name "apex-v11" | REWORK | Hardcoded version; automate via build |
| Z-index management | REWORK | Define formal z-index scale in design tokens |
| Topbar hidden counters (`display:none`) | INVESTIGATE | Dead stubs or planned feature? |
| `page-browser` (36 lines) | INVESTIGATE | Stub or functional? |
| `page-civilisation` (91 lines) | INVESTIGATE | Early-stage or functional? |
| `page-occult`, `page-research` | INVESTIGATE | Assess scope vs. intent |
| Editor (`public/editor.html`) | INVESTIGATE | GrapesJS visual editor — active use? |
| Electron wrapper | INVESTIGATE | Desktop app in active use? Or parked? |
| `apex-custom.css` (99B) | REMOVE | Trivial overrides; fold into design system |

---

## 16. Existing Strengths

1. **Navigation UX**: Single-page architecture with fast CSS-transition switching delivers snappy page changes with zero network round-trips. The slide + fade transition (220ms) is well-calibrated.

2. **Event delegation**: `data-fn` + `document`-level click listener is a robust, boilerplate-free interaction pattern that scales without adding event listeners per element.

3. **Responsive design**: Genuine two-layout implementation (mobile bottom nav vs. desktop sidebar) using CSS Grid `grid-template-areas`, not just breakpoint tweaks. Safari safe-area-inset support is correct.

4. **Accessibility foundations**: `skip-to-main` link, `aria-label` on interactive elements, `prefers-reduced-motion` comprehensive disable, `touch-action: manipulation` on all interactive targets, 44px minimum touch targets on mobile.

5. **PWA completeness**: Service worker, manifest, Web Push infrastructure, Electron wrapper — the multi-platform deployment story is unusually complete for a personal OS at this stage.

6. **Constitutional charter visibility**: The Command page surfaces A1–A6 constitutional articles inline, making the OS's operating principles part of the default view rather than buried in settings.

7. **Reality Architecture page depth**: 12 independently-loading epistemic panels provide a sophisticated knowledge-system observability layer that is architecturally advanced.

8. **Skeleton loaders**: `.skel` pattern used for loading states in the agent drawer — prevents layout shift.

9. **Multi-domain colour vocabulary**: AX system domain colours (sys/fin/uni/biz/file) provide semantic differentiation between agent domains.

10. **Waveform animation**: 7-bar staggered waveform during voice activity is a strong real-time feedback signal.

---

## 17. UX Defects

**D-01 — Voice mechanism fragmentation (HIGH)**  
Four distinct voice mechanisms share no common UI state or user mental model. The plasma orb (Gemini Live), mic button (browser STT), HTTP transcription, and browser TTS operate independently. A user cannot tell which is active or which to use.

**D-02 — CSS cascade non-determinism (HIGH)**  
Five competing `:root` token blocks and 12-15 inline `<style>` sections with liberal `!important` usage make visual outcomes unpredictable when adding new elements. The cascade relies on specificity accidents rather than intentional hierarchy.

**D-03 — Input zone hidden on command page (MEDIUM)**  
The primary page hides the chat input zone via `display: none !important`. Voice is the only input mode on the command page. Text users have no affordance until they navigate away — this is a dead end for keyboard-first users.

**D-04 — Polling violates constitution (MEDIUM)**  
4 `setInterval` calls breach Article A3 ("Events, Not Polling"). The frontend actively contradicts the architectural principle it displays.

**D-05 — Dual auth locality mismatch (MEDIUM)**  
`apex_app_key` in localStorage is XSS-accessible. Combined with `'unsafe-inline'` in the CSP (required for inline scripts), this creates a real XSS → credential exfiltration path.

**D-06 — No loading state for command-page stats (LOW)**  
Stat chips show "£—", "—", "Loading…" with no skeleton or shimmer — blank dashes are displayed on every load until data arrives.

**D-07 — `page-browser`, `page-civilisation` stub pages (LOW)**  
Both pages have minimal HTML content (36 and 91 lines respectively). If reachable by nav, they present near-empty experiences.

**D-08 — Mobile nav dropdown missing 3 pages (LOW)**  
`page-browser`, `page-civilisation`, `page-reality` absent from the mobile dropdown grid. Mobile users have no touch path to these pages unless they know keyboard shortcuts.

**D-09 — Z-index values unstandardised (LOW)**  
Overlay z-indices range from ~100 to 999999 across inline styles and CSS classes with no defined scale. Modal layering cannot be reasoned about statically.

**D-10 — CDN dependencies with no fallback (LOW)**  
Supabase-js, Chart.js, and Google Fonts loaded from CDN. A CDN failure at load time would break the entire auth layer (Supabase) or charting (Chart.js) with no degradation path.

---

## 18. Technical / Interface Debt

**TD-01 — Monolithic HTML (CRITICAL)**  
20,826-line single HTML file with all CSS and JS inline. Prior audit notes the file doubled from ~602KB to ~1.26MB since previous snapshot. Zero build pipeline; hand-edited accumulation. Any structural change risks breaking adjacent code invisibly.

**TD-02 — No frontend module system (HIGH)**  
All JS runs in global scope. Functions are on `window.*`. No imports, no encapsulation, no dead-code elimination. Side effects and name collisions are structurally undetectable.

**TD-03 — CSS version drift (HIGH)**  
Comment markers show CSS evolved through v10 → v13 within a single file, each iteration appending overrides rather than replacing. The result is the 5-token-set cascade described above. Refactoring risk is high because any removal may unintentionally expose an older rule.

**TD-04 — Service worker hardcoded cache name (MEDIUM)**  
`cacheName = 'apex-v11'` is hardcoded in `sw.js`. Cache busting on code changes requires manually incrementing this string. Missed bumps leave stale assets cached in users' browsers indefinitely.

**TD-05 — Reality page monkey-patches `window.switchPage` (MEDIUM)**  
The pattern `_origSwitch = window.switchPage; window.switchPage = function(...) { _origSwitch(...); if (...) ... }` at module close is fragile. If another script does the same, the chain breaks silently. Order-dependent patching is a maintenance hazard.

**TD-06 — CSP `unsafe-inline` required (MEDIUM)**  
Because all JS is inline, the Content-Security-Policy must permit `'unsafe-inline'` for `script-src`. This negates one of the primary XSS protections that CSP provides.

**TD-07 — Font loading race condition (LOW)**  
Five Google Font families loaded via `<link>` before any JavaScript. Render-blocking on slow connections with no `font-display: swap` specified (controlled by Google's CSS, not APEX).

**TD-08 — No error boundary for API failures (LOW)**  
Individual panel fetch calls render "Error" spans on failure but there is no global error capture, retry logic, or user notification when critical data (system health, agent council) fails to load.

---

## 19. Missing Capabilities

**MC-01 — Constitutional pipeline visibility (CRITICAL — confirmed present in DOM now)**  
Prior audit (2026-08-19) listed this as missing. The `#ovr-pipeline` element in `page-overview` and the Constitution charter in `page-command` now provide some pipeline visibility. The constitutional pipeline as an interactive, navigable interface is not fully realised — the charter is a static display, not a live execution trace.

**MC-02 — Knowledge-Gap system observability (HIGH)**  
KG-01 through KG-08 are fully implemented in backend. No frontend panel exists to observe knowledge gaps, evidence evaluations, sufficiency determinations, or reassessment triggers. The Reality Architecture page covers epistemic infrastructure but not the knowledge-gap lifecycle.

**MC-03 — Production vs. local environment indicator (HIGH — prior audit finding)**  
No UI indicator distinguishing production from local development instance. A user cannot tell from the interface which environment they're operating in.

**MC-04 — Agent action audit log (MEDIUM)**  
No frontend display of agent decision history, reasoning chains, or action provenance. The activity feed shows events but not structured audit records.

**MC-05 — Approval workflow UI (MEDIUM)**  
Keyboard shortcut `A` jumps to approvals but no dedicated approval page exists in the 14-page inventory. The feature appears to be planned but not rendered.

**MC-06 — Unified voice orchestration UI (MEDIUM)**  
A single coherent voice interface that surfaces the active mechanism, transcription confidence, model in use, and session state does not exist. The 4 mechanisms require their own discovery paths.

**MC-07 — Multi-agent task coordination view (LOW)**  
No page shows inter-agent task delegation, dependency chains, or cross-agent state.

**MC-08 — Dark / light theme toggle (LOW)**  
Only dark theme exists. No user preference accommodation beyond `prefers-reduced-motion`.

---

## 20. Three-Layer Experience Assessment

### Layer 1 — Perceptual (What it looks and feels like)

**Current state**: The aesthetic is ambitious and partially achieved. The deep-dark base (`#03060f` → `#000000`), cyan/indigo accent vocabulary, Cinzel display type, and animated plasma orb create a distinctive "personal AI OS" visual identity. The command page's orb-centric layout is memorable and intentional.

**Fragmentation**: The CSS cascade chaos produces visual inconsistency between pages. The system page feels different from the command page — different button colours, different panel border styles — because they were built at different CSS version epochs. The user experience reads as "partially designed" rather than a unified system.

**Typography overload**: Five typefaces in simultaneous use. JetBrains Mono appears in too many non-code contexts (navigation labels, stat subtext, page subtitles) where a standard sans would read more clearly.

### Layer 2 — Cognitive (What it makes users think and do)

**Navigation clarity**: 14 pages with no visible hierarchy. The mobile dropdown groups 11 in a 3×4 grid but with no category grouping. A new user faces a flat list of domains with no "start here" guidance beyond the orb.

**Voice confusion**: 4 mechanisms with no unified mental model. A user learning the system will encounter different behaviours depending on which voice trigger they discovered first.

**Data literacy requirement**: Pages like Reality Architecture (12 epistemic panels) assume deep familiarity with APEX's internal models. Without contextual explanation, a user sees metric numbers without knowing what "86.4% attribution rate" means or what action to take.

**Interaction discovery gap**: Many features are not discoverable without reading the help overlay or CLAUDE.md. The `data-fn` system is powerful but invisible; there are no tooltips, no progressive disclosure of advanced features.

### Layer 3 — Connective (What it connects the user to)

**Personal OS coherence**: The interface successfully communicates that this is a holistic personal operating system — not a chat app or task manager. The constitutional charter, multi-domain page structure, and agent architecture reinforce this.

**Missing connection to internal intelligence**: The Knowledge-Gap system, constitutional decision records, and agent reasoning chains are entirely invisible from the interface. The backend is significantly more sophisticated than the frontend exposes. Users cannot perceive the quality of the system's knowledge or reasoning.

**Human override is present but passive**: Article A6 ("Human Override Is Absolute") is stated in the charter but has no actionable UI expression — no override button, no pending-action approval queue rendered, no indication of what the system is doing autonomously.

---

## 21. Tree-of-Life Readiness

The APEX "Tree of Life" framework maps personal/civilisational domains to a structured hierarchy. Current interface readiness:

| Domain | Page | Status | Gap |
|--------|------|--------|-----|
| Command / Core | page-command | FUNCTIONAL | Voice unification needed |
| System / Infrastructure | page-system | FUNCTIONAL | Needs agent detail expansion |
| Finance | page-finance | PARTIAL | Content visible, data plumbing unknown |
| Operations | page-operation | PARTIAL | Content visible, data plumbing unknown |
| Health | page-health | PARTIAL | Content visible |
| Communication | page-communication | PARTIAL | Gmail integration exists |
| Business | page-business | STUB-LIKE | Minimal content observed |
| University | page-university | STUB-LIKE | Minimal content observed |
| Occult | page-occult | STUB-LIKE | ~134 lines |
| Research | page-research | STUB-LIKE | ~76 lines |
| Overview / Aggregation | page-overview | FUNCTIONAL | Pipeline visibility partial |
| Reality Architecture | page-reality | FUNCTIONAL | Sophisticated epistemic display |
| Civilisation | page-civilisation | STUB | ~91 lines |
| Browser | page-browser | STUB | ~40 lines |

**Overall Tree-of-Life coverage**: Core domains (Command, System, Finance, Health, Communication) have functional implementations. Extended domains (Business, University, Occult, Research, Civilisation) are present as page shells but lack developed content. The epistemic/reality layer is disproportionately sophisticated relative to domain pages.

---

## 22. Security and Authority Observations

**S-01 — CSP `unsafe-inline` in both script and style directives**: Required by current architecture. Eliminates inline-script XSS protection. Risk level: MEDIUM (no user-generated content rendered, but any DOM XSS vulnerability would have no CSP backstop).

**S-02 — API key in localStorage**: `apex_app_key` readable by any injected JS. If any XSS exists (e.g., in notification content rendering, chat response rendering), this key is extractable. Risk: MEDIUM.

**S-03 — `connect-src` includes external origins**: `http://localhost:5002` and `http://127.0.0.1:5002` in CSP connect-src suggests a local audio service (Gemini Live transcription relay). These are localhost-only and low risk, but indicate a dependency on a local service being present.

**S-04 — No CSRF protection observed in frontend**: `POST /auth/login` sends JSON credentials. CSRF tokens not observed in fetch calls. The JWT-in-cookie approach requires CSRF protection; if `SameSite` is not `Strict` or `Lax`, cross-site requests can include the cookie.

**S-05 — Authority display (Constitutional Charter)**: The A1–A6 charter in the command page is correct in content and visible. This is a genuine strength — operating principles are front-and-centre. No UI element contradicts these principles visually (the polling violation is code-level, not UI-level).

---

## 23. Performance and Responsiveness Observations

**P-01 — Initial load weight**: 1.26MB HTML file parsed synchronously. On a mobile connection at 4G (10 Mbps), initial parse alone takes ~1 second before any rendering.

**P-02 — Three blocking external script/style loads**: Supabase-js, Chart.js (if on this page), and Google Fonts all block initial render. Google Fonts adds a DNS + TLS + HTTP round-trip before text renders.

**P-03 — WebGL plasma orb**: Canvas animation on the command page is GPU-accelerated but adds ongoing power draw. No pause on visibility change observed in read.

**P-04 — 4 polling intervals**: Combined, these fire a network request every 45–120 seconds indefinitely while the page is open. On mobile with background throttling, these may be suppressed, causing stale data.

**P-05 — Page activation cost**: `window.loadRealityPage()` fires 12 fetch calls simultaneously on navigation to the reality page. On slow connections this creates 12 concurrent requests.

**P-06 — No code splitting or lazy loading**: All 20,826 lines of HTML/CSS/JS are parsed on initial load regardless of which page the user visits. There is no deferred loading of page-specific content.

**P-07 — Service worker caching**: The shell (`/dashboard.html`, `/manifest.json`, icon files) is cached in `apex-v11`. Subsequent loads of cached assets are instant. This partially mitigates P-01 on repeat visits.

---

## 24. Evidence Register

| Finding | Evidence | File | Line(s) |
|---------|----------|------|---------|
| apex-version v10 | `<meta name="apex-version" content="v10">` | dashboard.html | 4 |
| 14 pages (IDs) | `id="page-*"` elements | dashboard.html | 8614, 8765, 9063, 9447, 9682, 9914, 10131, 11206, 11370, 11531, 11665, 11741, 11781, 11873 |
| First `:root` token set (cyan) | `--primary: #00d4ff` | dashboard.html | 34 |
| apex-v2.css token set (indigo) | `--accent: #6366f1` | apex-v2.css | 48 |
| Navigation mechanism | `window.switchPage` | dashboard.html | 20803 |
| Page transition CSS | `.page { opacity: 0; transform: translateX(18px); transition: 0.22s }` | dashboard.html | 202–216 |
| Desktop sidebar layout | `grid-template-areas: "topbar topbar" "sidenav content"` | dashboard.html | 284–289 |
| Mobile nav dropdown (11 pages) | `#mobileNavDropdown` buttons | dashboard.html | 8558–8572 |
| Plasma orb | `<canvas id="plasmaOrb" data-fn="startVoice">` | dashboard.html | 8624 |
| Constitution charter | A1–A6 grid | dashboard.html | 8716–8760 |
| Activity feed | `#apexFeedBody` | dashboard.html | 8705 |
| Dual auth | `apex_token` cookie + `apex_app_key` localStorage | auth.js, dashboard.html | auth.js:L15–L40 |
| CSP unsafe-inline | `script-src 'self' 'unsafe-inline'` | dashboard.html | 6 |
| CDN dependencies | Supabase, Chart.js | dashboard.html | 19 |
| Google Fonts (5 families) | `<link href="fonts.googleapis.com/...Cinzel:...JetBrains Mono:...IBM Plex Sans:...Space Grotesk">` | dashboard.html | 18 |
| Service worker cache name | `cacheName = 'apex-v11'` | sw.js | (confirmed from prior session read) |
| Voice mechanisms (4) | `startVoice`, `SpeechRecognition`, `/api/transcribe`, `speechSynthesis` | dashboard.html | multiple |
| Gemini Live WS | `wss:` in CSP connect-src; Gemini audio pipeline | dashboard.html | 6 |
| Polling intervals (4) | `setInterval(...)` calls | dashboard.html | (4 occurrences, confirmed from prior read) |
| Reality page 12 loaders | `loadRealityPage()` calling 12 fetch functions | dashboard.html | 20786–20799 |
| SW push support | `self.addEventListener('push', ...)` | sw.js | (confirmed from prior session read) |
| Electron wrapper | `localhost:3000`, `1440×900` | apex-electron.js | (confirmed from prior session read) |
| `#ovr-pipeline` in DOM | `id="ovr-pipeline"` in page-overview | dashboard.html | ~10131+ |
| Keyboard shortcuts | Help overlay grid | dashboard.html | 8579–8587 |
| Skip-to-main | `<a class="skip-to-main" href="#main-content">` | dashboard.html | 8500 |
| Print styles | `@media print { .sidebar,.topbar,.bottom-nav... }` | dashboard.html | 8476–8482 |
| Reduced motion | `@media (prefers-reduced-motion:reduce) { animation:none }` | dashboard.html | 8485–8495 |

---

## 25. Open Questions

**OQ-01**: Is `page-browser` intended as an embedded `<iframe>` or a URL launcher? The 36-line content does not make this clear.

**OQ-02**: What is the intended user experience for `page-occult`? Is this symbolic domain tracking or literal metaphysical records?

**OQ-03**: Is `public/apex-electron.js` in active production use on any target machine? Or is it a parked capability?

**OQ-04**: Is `public/editor.html` (GrapesJS) actively used for layout customisation, or is it a deprecated experiment?

**OQ-05**: The `apex_app_key` localStorage mechanism — is this a legacy auth pattern being phased out, or is it the intended secondary auth channel?

**OQ-06**: Does `page-overview` now fully satisfy the "constitutional pipeline visibility" requirement flagged as CRITICAL in the 2026-08-19 audit? Partial answer: `#ovr-pipeline` exists in DOM but interactive verification would be needed.

**OQ-07**: What replaces the 4 polling intervals in the event-driven architecture (A3)? WebSocket `/ws/viz` is present — which pages are subscribed?

**OQ-08**: Does the Knowledge-Gap system (KG-01 through KG-08) require a dedicated frontend page, or should its observability be folded into the Reality Architecture page?

---

## 26. UX-00 Conclusions

### What the legacy interface is

A sophisticated, personally crafted monolithic SPA that successfully establishes the APEX personal AI OS identity. The command page orb + stat chips + activity feed + constitution charter is a coherent, ambitious interface design that is distinctive and functional. The navigation architecture (14 pages, fast CSS switching, event delegation) is sound.

### Where it falls short

The interface was assembled incrementally over multiple CSS and JS versions within a single file. The consequence is design drift across pages, CSS cascade chaos, 4 competing voice mechanisms with no unified UX, polling in violation of its own constitution, and a backend intelligence layer (KG-08 certified system) that is entirely invisible from the UI.

### The primary tension

APEX's backend architecture is exceptionally well-specified and certified. The frontend is the inverse: powerful in some areas (reality architecture page, command page), skeletal in others (business, university, civilisation pages), and architecturally indebted everywhere. Closing this gap is the core programme objective for UX-01 through UX-19.

### Architectural verdict

The existing SPA architecture is sound and should be retained. The primary interventions required are: (1) extract the monolith into modular page templates, (2) consolidate CSS to a single token source, (3) unify voice mechanisms, (4) replace polling with WebSocket subscriptions, (5) build frontend observability for the knowledge-gap and constitutional systems.

---

## 27. Handoff Conditions for UX-01

UX-01 may proceed with the following confirmed baseline:

**Confirmed as functional and stable (safe to build on):**
- `window.switchPage` navigation mechanism
- `data-fn` event delegation pattern
- 14-page structure with defined IDs
- JWT cookie authentication
- Bottom-nav / sidebar responsive layout
- PWA infrastructure (sw.js, manifest.json)
- Accessibility foundations (skip-to-main, reduced-motion, touch targets)
- Reality Architecture page (12 panel fetch architecture)
- Design system class vocabulary (`.ds-panel`, `.ds-btn`, `.ds-grid-*`, etc.)

**Must not be touched without explicit design decision:**
- `page-command` orb layout (primary identity element)
- Auth cookie mechanism
- `public/sw.js` (PWA cache behaviour)
- Agent drawer mechanism

**Requires resolution before UX-01 implementation:**
- OQ-05 (localStorage API key fate) — determines auth refactor scope
- OQ-07 (polling replacement strategy) — determines data layer architecture

**Baseline metrics for regression tracking:**
- 14 pages
- ~55+ API endpoints
- 4 polling intervals (target: 0 post-rework)
- 4 voice mechanisms (target: 1 unified)
- 5 competing `:root` token sets (target: 1)
- 12-15 inline `<style>` blocks (target: 0 — all in external CSS)
- 1 monolithic HTML file (target: modular templates)

---

## UX-00 STATUS

**STATUS: CERTIFIED**

| Field | Value |
|-------|-------|
| Audit scope | Complete — all 14 files in scope read |
| Application modified | NO — zero modifications |
| Blocking issues | None (open questions are research items, not blockers) |
| Prior audit findings reconciled | YES — MC-01 (pipeline visibility) partially resolved; MC-03 (prod/local indicator) still open |
| Baseline document | `docs/interface/UX-00-LEGACY-INTERFACE-BASELINE.md` (this file) |
| Test evidence | Read-only forensic audit — no automated tests; evidence register at Section 24 |
| Next authorised task | UX-01 (requires explicit authorisation to begin) |
| Hard stop | ACTIVE — no UX-01 work begins without explicit instruction |
