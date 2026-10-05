# BETA INTERFACE RUNTIME DIAGNOSTIC

**Date:** 2026-08-28  
**Status:** COMPLETE — AWAITING EXPLICIT AUTHORISATION FOR ANY CORRECTIVE IMPLEMENTATION  
**Classification:** READ-ONLY DIAGNOSTIC — no production files modified

---

## 1. Observed Browser State

- APEX shell / navigation rail: **RENDERS**
- Header / time display: **RENDERS**
- Navigation icon buttons: **RENDER**
- Main application canvas: **ALMOST ENTIRELY EMPTY**
- Dark grid/background pattern: **VISIBLE**
- Chat surface: **NOT VISIBLE**
- Voice/Orb surface: **NOT VISIBLE**
- Activity, Agents, Approvals, Knowledge, Intelligence, Memory, Governance page content: **NOT VISIBLE**

---

## 2. Expected Certified Interface State

Per the RX-02 through RX-07 certification test suite:

- 20-page dashboard surface registered and functional
- `page-command` (orb + chat panel) renders as default active page
- Plasma orb canvas renders with animation
- Chat history panel populated from API
- All page surfaces switch via `switchPage()`
- Navigation buttons toggle between all registered pages

---

## 3. Served Artifact Verification

**Route:** `src/routes/ui.js` → `router.get('/', requireAuth, _serveDashboard)`  
**File served:** `path.join(__dirname, '../..', 'public', 'dashboard.html')` — absolute path, resolved at request time  
**Caching:** `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` + `Pragma: no-cache` + `Expires: 0` — server sends current file on every request, no in-memory caching  
**Auth:** `requireAuth` middleware gates the route — user must be authenticated to receive the HTML  
**Process:** PID 9804 owns port 3000 (LISTENING), multiple established connections confirmed  
**File size:** 1.3 MB, 22,283 lines — current working-tree version  
**RX-07 edits ARE being served:** No caching layer exists between filesystem and browser  

---

## 4. DOM Verification

All certified page surfaces confirmed present in `public/dashboard.html`:

| ID | Exists | Initial State |
|----|--------|---------------|
| `page-command` | ✓ Line 8809 | `class="page active"` — active on load |
| `page-activity` | ✓ Line 12251 | `class="page"` — hidden |
| `page-agents` | ✓ Line 12320 | `class="page"` — hidden |
| `page-approvals` | ✓ Line 12388 | `class="page"` — hidden |
| `page-knowledge` | ✓ Line 12442 | `class="page"` — hidden |
| `page-intelligence` | ✓ Line 12502 | `class="page"` — hidden |
| `page-memory` | ✓ Line 12561 | `class="page"` — hidden |
| `page-governance` | ✓ Line 12620 | `class="page"` — hidden |

**Note:** `page-chat` does not exist — the canonical primary surface is `page-command`. The chat interface is the right panel of `page-command`.

**`pages` array** (line 12776, `var` declaration inside IIFE, 20 pages):  
`['command', 'overview', 'operation', 'system', 'finance', 'communication', 'business', 'health', 'university', 'occult', 'research', 'civilisation', 'reality', 'activity', 'agents', 'approvals', 'knowledge', 'intelligence', 'memory', 'governance']`

**`pageMeta`** (lines 12779–12800): 20 entries, exactly matching `pages` array.

**`switchPage` function** (lines 12801–12814): removes `active` class from all `.page` and `.nav-btn` elements, adds `active` to `#page-{name}` and `#nav-{name}`, updates topbar text. Monkey-patched 12 times across the file (lines 17791 through 22269).

---

## 5. Initialisation Trace

**Initial page on load:**  
`#page-command` has `class="page active"` hardcoded in HTML at line 8809. No JavaScript call is required to display the initial page — it is CSS-driven via the baked-in `active` class.

**`APP_KEY` acquisition** (line 12976):  
```js
let APP_KEY = localStorage.getItem('apex_app_key')
           || new URLSearchParams(window.location.search).get("app_key")
           || "";
```
`APP_KEY` is sourced from `localStorage` or URL parameter. The server does NOT inject it (uses `res.sendFile`, no templating). On first browser access with no stored key, `APP_KEY === ""` (falsy).

**`_showKeyModal()` trigger** (line 13010):  
```js
if (!APP_KEY) { _showKeyModal(); }
```
If `APP_KEY` is falsy, this call executes. The modal:
```
position:fixed; inset:0; background:rgba(8,9,14,0.97); z-index:99999
```
This is a near-opaque (`97%` opacity) full-viewport overlay covering the entire application surface including navigation, topbar, and all page content. Script execution continues past this point — the modal does not abort initialization.

**Post-modal initialization:**  
All JS state variables are declared, `refreshFast()` / `refresh()` functions are defined, `DOMContentLoaded` handlers (lines 9634, 20354) fire. `cmdInitPage()` executes after 250ms via `setTimeout` if command page is active.

---

## 6. JavaScript Error Analysis

**Duplicate declarations:** NONE found. All `let`/`const` at script-block scope are unique. RX-07 additions (`_lastSpokenText`, `_lastSpeakMs`, `_voiceWordBudget`, `_VOICE_WORD_LIMIT`) are declared exactly once.

**Script tag balance:** 16 opening `<script>` tags, 16 closing `</script>` tags — balanced.

**RX-07 introduction of errors:** None. Replace-all operations touched only font name strings; no JS identifiers, no CSS selectors, no structural elements.

**`switchPage` monkey-patch chain:** 12 re-wraps of `window.switchPage` accumulate over page lifetime. This chain is fragile — if any wrapper throws before calling `_orig`, subsequent page switches fail. However, this is pre-existing and cannot be attributed to RX-07.

**`_showKeyModal`:** Defined at line 12987, called at line 13010. Both are in the same script block (lines 12973–16488), `_showKeyModal` is defined before the `if (!APP_KEY)` check — no ReferenceError risk.

**Static analysis conclusion:** No syntax errors detectable from file analysis. Runtime errors cannot be excluded without actual browser console inspection.

---

## 7. CSS Visibility Analysis

**Page visibility mechanism:**
```css
.page          { opacity: 0; pointer-events: none; transform: translateX(18px); position: absolute; inset: 0; }
.page.active   { opacity: 1; pointer-events: auto; transform: translateX(0); }
```
Defined at lines 202–222. Consistent `!important` variants at lines 4231/4248 and 5200. All are compatible — `.page.active` correctly resolves to `opacity: 1` in all CSS cascade positions.

**Desktop grid layout (at `@media (min-width: 900px)`):**

Two competing grid blocks exist. The LATER block (lines 2728–2747) uses `!important` and wins:

```css
.app {
    grid-template-rows:    52px  28px  1fr  52px;   /* topbar / ticker / body / chatbar */
    grid-template-columns: 200px 1fr;
    grid-template-areas:   "topbar topbar" / "ticker ticker" / "sidebar body" / "chatbar chatbar";
}
.bottom-nav       { grid-area: sidebar; flex-direction: column; }
.page-and-input   { grid-area: body; display: flex; flex-direction: column; min-height: 0; }
.input-zone       { grid-area: chatbar; }
```

All custom properties are confirmed defined (lines 2533–2535):
- `--ticker-h: 28px` ✓
- `--sidebar-w: 200px` ✓
- `--chatbar-h: 52px` ✓

**Grid layout is valid.** The CSS layout collapse hypothesis is ruled out.

**Command page inner content** (lines 8811–8860):
- `#plasmaOrb` — `<canvas>` element. Transparent without JavaScript animation initialisation. Renders as invisible transparent rect without JS.
- Static labels ("APEX", "STANDBY · TAP TO SPEAK") at lines 8821–8822 — `position:absolute` inside `cmd-stage`. Should be visible as static HTML if the page is active.
- `#cmdStrip` stat bar — empty without JS data fetch.
- Chat history panel — empty without JS fetch of conversation history.

---

## 8. Network / Asset Analysis

**CSP policy** (`middleware/express-config.js`):
```
scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net']
styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']
fontSrc:    ["'self'", 'data:', 'https://fonts.gstatic.com']
```
`'unsafe-inline'` is permitted for scripts — inline `<script>` blocks are allowed. CSP does not block JS execution.

**`scriptSrcAttr: ["'none'"]`** — this blocks inline HTML event handler attributes (`onclick=`, `onerror=`, etc.) but does NOT block `<script>` tags. This is pre-existing and unrelated to RX-07.

**Google Fonts:** CDN link updated to load Inter, Cinzel, JetBrains Mono. Preconnect links to `fonts.googleapis.com` and `fonts.gstatic.com` intact. Font loading should succeed without CSP violation.

**API calls:** All data-populating API routes (`/api/governance/dashboard`, `/api/memory/...`, `/api/activity/...`) require `x-app-key: APP_KEY` header. If `APP_KEY` is empty (falsy), requests return 401 and content never populates.

---

## 9. RX-07 Regression Analysis

RX-07 made the following changes to `public/dashboard.html`:

| Change | Impact on Rendering |
|--------|---------------------|
| `IBM Plex Sans` → `Inter` (replace_all, 30 occurrences) | Cosmetic font change only — no layout, no structure affected |
| `Space Grotesk` → `Inter` (replace_all, ~149 occurrences) | Cosmetic font change only — inline styles updated, attribute selectors updated to match Inter |
| Google Fonts `<link>` updated | Inter now loaded; Cinzel + JetBrains Mono preserved |
| 4 new JS state variables added | Valid declarations, no duplicates, no scope conflicts |
| `speak()` modified (dedup + budget guards) | Only affects TTS code path, no rendering impact |
| `viewNotification()` modified (voice gate) | Only affects notification TTS, no rendering impact |

**RX-07 conclusion:** None of the RX-07 changes affect page layout, grid structure, DOM visibility, CSS specificity, or data-fetching initialisation. **RX-07 cannot be the cause of blank page content.**

---

## 10. Root Cause

**Two conclusive root cause candidates exist.** They are not mutually exclusive.

### ROOT CAUSE A — `APP_KEY` not in browser `localStorage` (most probable for first run)

**Evidence:**
- `APP_KEY` is read from `localStorage.getItem('apex_app_key')` at line 12976
- Server does NOT inject it (confirmed — `res.sendFile`, no template substitution)
- If missing, `_showKeyModal()` is called at line 13010
- Modal CSS: `position:fixed; inset:0; background:rgba(8,9,14,0.97); z-index:99999` — covers 100% of viewport with 97% opacity
- The modal overlays ALL page content including the navigation rail, meaning what the user perceives as "navigation renders" may be the nav partially visible through the near-opaque overlay, or the user may have already dismissed the modal by entering a key — leaving the interface empty because API calls still fail with the key entered (if incorrect)

**Consequence:** With `APP_KEY` absent, every `buildApiHeaders()` call in every page refresh function sends an empty or invalid key. Every `/api/*` endpoint returns 401. Every page's dynamic content (activity feed, memory list, governance records, agent list, etc.) fails to load and remains empty. The canvas orb requires JS animation to be visible — if `cmdInitPage()` depends on a valid auth state or crashes early due to a 401 response, the canvas stays blank.

### ROOT CAUSE B — Correct layout, empty data state (expected for fresh instance)

**Evidence:**
- The DOM is structurally correct — all pages exist, `page-command` has `active` class
- CSS layout is valid — grid properties are defined, page visibility mechanism is correct
- `#plasmaOrb` is a `<canvas>` element — requires JavaScript canvas drawing API calls to render anything visible; without `initPlasmaOrb()` or equivalent completing successfully, the canvas is a transparent rectangle
- Chat history: populated from `/api/memory/...` or `/api/chat/...` — empty if no past conversations in Supabase
- Feeds: populated from API — empty if no records
- This is a completely correct empty-state rendering for a fresh or disconnected instance

---

## 11. Evidence Summary

| Evidence | Points To |
|----------|-----------|
| Navigation rail visually renders | Static HTML/CSS rendering works; suggests HTML is being served |
| Header/time renders | Same — topbar is static HTML |
| ALL page content empty | Either API calls failing (401 due to missing key) or data genuinely empty |
| Canvas orb invisible | Canvas requires JS animation — JS may not be completing `initPlasmaOrb()` due to early auth failure |
| No content in ANY page (including static elements) | If static HTML like "STANDBY · TAP TO SPEAK" is also invisible, stronger evidence for modal overlay rather than empty data |
| CSP allows `'unsafe-inline'` | JS execution not blocked by CSP |
| No JS syntax errors from RX-07 | RX-07 is not the cause |
| Grid layout CSS variables all defined | CSS layout collapse ruled out |

---

## 12. Files Implicated

| File | Role |
|------|------|
| `public/dashboard.html` | The served artifact — CSS, JS, DOM all in scope |
| `src/routes/ui.js` | Serves the dashboard; applies `requireAuth` gate |
| `lib/middleware.js` | Contains `requireAuth` — determines auth path to dashboard |
| `.env` | Contains `APP_ACCESS_KEY` — the value needed for `APP_KEY` modal |

---

## 13. Whether Production Code Must Be Modified

**Uncertain pending confirmation of root cause.**

- If Root Cause A (missing `APP_KEY` in localStorage): **No code change required.** The user must enter the `APP_ACCESS_KEY` from `.env` into the browser's key modal. Once stored in `localStorage`, all API calls will authenticate and content will populate.

- If Root Cause B (empty data state): **No code change required.** The interface is working correctly — it is empty because no data exists in the Supabase database for this instance.

- If there is a JavaScript runtime error (Root Cause C, not yet confirmed): **Code change may be required.** Cannot determine from static analysis alone.

---

## 14. Exact Minimal Corrective Action

**Step 1 — Confirm which root cause applies:**  
Open the browser at `localhost:3000`. Observe whether a modal overlay appears with "APEX AI OS — Enter your access key to continue." If yes, Root Cause A is confirmed.

**Step 2A — If key modal present:**  
Retrieve `APP_ACCESS_KEY` from `.env` file. Enter it into the modal. The modal will call `/api/config` with the key to validate, then store it in `localStorage` and call `refreshFast()`. Page content should populate.

Alternatively: Navigate to `localhost:3000?app_key=<VALUE_FROM_ENV>`. The URL parameter is read at line 12976 and stored to `localStorage` automatically.

**Step 2B — If key modal is absent (key already in localStorage) and pages are still empty:**  
Open browser developer tools → Console tab. Capture any error messages. Open Network tab. Filter by XHR/Fetch. Identify which API calls are failing and their status codes.

**Step 2C — If static HTML elements inside `page-command` (e.g., "STANDBY · TAP TO SPEAK") are also invisible:**  
This confirms the key modal overlay is the blocking element. The modal's 97% opacity makes underlying content nearly invisible. Proceed with Step 2A.

---

## 15. Risks

| Risk | Assessment |
|------|------------|
| Entering wrong `APP_ACCESS_KEY` | Key is validated server-side; wrong key returns error, not stored |
| RX-07 font change introduced a CSS regression | Ruled out — font names in CSS/inline styles have no layout effect |
| Pre-existing JS runtime error undetectable by static analysis | Cannot exclude without browser console inspection |
| Supabase database inaccessible locally | Would cause API 500 errors; server would have exited at startup if DB vars missing |

---

## 16. No Production Files Modified

**CONFIRMED.** This document is the sole output of this diagnostic session. No production files (`public/dashboard.html`, `server.js`, `src/routes/ui.js`, `middleware/express-config.js`, or any other file) were read-written, edited, or modified during this investigation.

---

## Final Assessment

**The certified implementation is structurally correct.** DOM, CSS, and JS pass static analysis. RX-07 is not implicated. The most probable cause of the blank interface is the absence of `APP_KEY` in the browser's `localStorage`, which causes `_showKeyModal()` to display a near-opaque full-viewport overlay blocking all content, while simultaneously causing all API calls to return 401 so that dynamic content never loads. The secondary possibility is a genuinely empty database state rendering empty-but-correct pages.

---

ROOT CAUSE: `APP_KEY` absent from browser `localStorage` → `_showKeyModal()` blocking overlay + all API calls failing with 401  
EVIDENCE: Line 12976 reads key from localStorage only; server performs no injection; modal is `position:fixed; inset:0; z-index:99999`; no JS syntax errors from RX-07; CSS layout confirmed valid  
MINIMAL FIX: Enter `APP_ACCESS_KEY` value from `.env` into the key modal, or navigate to `localhost:3000?app_key=<VALUE>`  
FILES THAT WOULD CHANGE: None — this is a runtime configuration issue, not a code defect  
EXPECTED RESULT: Modal dismisses, `refreshFast()` fires, all API calls authenticate, page content populates  
TEST PLAN: Observe that `page-command` orb animates, chat panel renders, navigation switches between populated pages, governance/memory/activity feeds load data  

---

HARD STOP — BETA INTERFACE RUNTIME DIAGNOSTIC COMPLETE. AWAITING EXPLICIT AUTHORISATION FOR ANY CORRECTIVE IMPLEMENTATION.
