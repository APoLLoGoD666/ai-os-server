# V-11-F PRE-IMPLEMENTATION RECONNAISSANCE
## LIFE & WORK Experience Convergence

**Date:** 2026-09-01
**Status:** RECONNAISSANCE — No application code modified
**Scope:** 9 LIFE & WORK pages audited (`#page-finance`, `#page-communication`, `#page-business`, `#page-health`, `#page-university`, `#page-research`, `#page-occult`, `#page-civilisation`, `#page-reality`)
**Predecessor:** V-11-E certified (contract §Y — all criteria MET; local implementation)
**Governing spec:** `docs/interface/V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md`
**Design lock:** `docs/interface/V-11-DESIGN-DECISIONS.md`
**Identity lock:** `docs/interface/V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md`
**Preceded by:** V-11-A / V-11-B / V-11-C / V-11-D1 / V-11-D2 / V-11-E — all certified
**Application code changed by this reconnaissance:** NONE
**Production changed:** NO

---

## SECTION 1: EXECUTIVE SUMMARY

### 1.1 Top-line findings

The nine LIFE & WORK pages are the largest surface area of APEX and the least-adherent to the V-11 experience specification. They were engineered under an earlier product model that treated the interface as a **domain dashboard grid** rather than an intelligence surface. Every page today answers the technical question _"what data exists in this domain?"_ instead of the canonical human question the V-11 spec assigns each domain (Part II §1.2 of V-11-N-DECISIONS; §1.2 of V-11 spec).

The gap between the current state and the V-11 target state is **structural**, not cosmetic. The pages universally violate the L0–L4 disclosure model (Part III of V-11 spec), the state model (V-11-B universal state architecture), the token/typography discipline (V-11 spec §12.x visual system), and the identity/privacy model (V-11-N — three Master-only pages leak sensitive vocabulary into user-facing headers even after `apex-master-only` gating).

### 1.2 The five most consequential findings (P0)

1. **No L0 exists on any of the 9 LIFE & WORK pages.** Every page opens with either a page header + em-dash stat grid (`—`) or a "Loading…" skeleton. There is no one-sentence human summary of what matters in the domain right now. This directly violates Principle 1 of V-11 (§1.3 of the spec: "L0 exists for everything").
2. **Massive inline-style / token violations.** The pages contain thousands of `style="…"` attributes with hardcoded hex colours (`#0d1424`, `#5b9eff`, `#8893a0`, `#eaeff5`, `#efb45a`, `#3fd29a`, `#ef4444`, `#25d366`, `#1877f2`, `#e1306c`, `#5865f2`, `#0a66c2`, etc.). These bypass the design token system defined in V-11 §12 and make theming and dark/light coherence impossible.
3. **The universal state architecture (V-11-B) is not applied on any LIFE & WORK panel.** Empty, loading, error, stale and forbidden states are all bespoke inline `innerHTML` writes — never `setState(el, ...)`. Panels either show generic "Loading…" italic text, `.skel skel-row skel-wide` skeletons, or silent failures. The `setState` API (V-11-B certified) is available globally but is unused by every LIFE & WORK panel.
4. **Privacy leakage on Master-only pages (V-11-N Layer 3 concern).** The three Master pages (`#page-occult`, `#page-civilisation`, `#page-reality`) expose raw domain IDs (`DOM-000001`), agent identifiers (`agent-orchestrator`), system vocabulary ("epistemic capital", "belief-reality gap", "civilization self-model") in what is technically user-facing UI. Under V-11-N §6.1 these are L4 content and belong in SYSTEM → Advanced, not in the primary LIFE & WORK strip.
5. **Terminology drift and naming inconsistency.** The "communication" page's header reads **NETWORK** (letterset 7); the sidebar label is **Network**; the internal ID is `communication`; the V-11 spec locks the label to **Communications**. The "operation" page (`#page-operation`) is a duplicate of the "business" page (`#page-business`) — both fetch `/api/operations/clients`, both display CRM/projects/documents/proposals. `#page-occult` header reads **OCCULT** but the V-11 spec (Decision 5) locks the sub-tab to **Esoteric Research**.

### 1.3 Overall assessment

The pages are functional but not intelligent. They are a **grid of skeletons that populate with numbers**. They cannot pass the V-11 5-second test on any page: a first-time user cannot tell within 5 seconds what matters in Finance, Business, Health, Research, or any Master domain. The visual language and layout of the nine pages is not shared — each was authored independently, producing seven different empty-state patterns, five different loading indicators, and no consistent action pattern. V-11-F must converge them onto the L0→L4 disclosure model, apply `setState` universally, and remove the inline-style debt.

### 1.4 Package summary

- P0 packages: 6 (F-1 through F-6)
- P1 packages: 5 (F-7 through F-11)
- P2 packages: 4 (F-12 through F-15)
- P3 packages: 3 (F-16 through F-18)
- Backend changes requiring separate authorisation: 3 (see §16)
- Open product decisions: 5 (see §17)

---

## SECTION 2: AUDIT METHODOLOGY

### 2.1 Inspection technique

Each of the nine pages was inspected in four passes:

1. **HTML structure** — every `<div>` with an `id` attribute, every `class` name, every `data-fn` handler, every panel skeleton. Line numbers recorded per finding.
2. **JS init function** — every `switchPage` wrapper (found 14 stacked wrappers in `dashboard.html`, one per domain), every `initXxxPage()` function, every `fetch('/api/…')` inside those inits.
3. **API surface** — every endpoint referenced by the domain's page, plus polling behaviour (`setInterval` calls at file lines 9093, 14293–14304, 14819–14823, 16837–16839, 18276).
4. **State handling** — every `catch()` block, every "No X yet" empty-state string, every `.skel-row` skeleton, every hardcoded loading indicator.

### 2.2 Reference artefacts read in full or in relevant sections

- `docs/interface/V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md` (Parts I–VIII plus §7.3 LIFE & WORK content)
- `docs/interface/V-11-DESIGN-DECISIONS.md` (Decisions 1, 4, 5, SD-4, SD-5)
- `docs/interface/V-11-N-IDENTITY-PROFILE-DECISION-LOCK.md` (Parts II, III, VI §6.1–6.4)
- `docs/interface/V-11-E-IMPLEMENTATION-CERTIFICATION.md` (state of the codebase at V-11-E close)
- `docs/interface/V-11-B-IMPLEMENTATION-CERTIFICATION.md` (state model available for use)
- `docs/interface/V-11-D2-IMPLEMENTATION-CERTIFICATION.md` (TODAY default + hash sync)
- `docs/interface/V-11-E-PRE-IMPLEMENTATION-RECONNAISSANCE.md` (format template)
- `public/dashboard.html` (sections 6952–9967 for the nine pages; 14700–17773 for JS handlers; 19340–19809 for civilisation + reality)

### 2.3 Verification rules

- No file except this reconnaissance document was written or modified.
- No `git commit`, `git push`, `npm run build`, or deployment command was executed.
- No backend file was opened or altered.
- Every claim in the sections below is backed by a specific line number in `public/dashboard.html` or the reference document cited.

---

## SECTION 3: PAGE-BY-PAGE AUDIT

Each subsection answers all 26 questions (A–Z) plus the FIVE-SECOND / THIRTY-SECOND / HIDDEN INFO questions. The order follows the brief.

---

### 3.1 FINANCE (`#page-finance`)

Location: `public/dashboard.html` line 7336–7568. JS init: `initFinancePage()` at line 17100. `switchPage` wrapper at 17106.

**A. Current purpose.** Present a comprehensive personal-finance dashboard: net worth, linked accounts (Plaid), invoices, expenses, cash-flow forecast, budget-vs-actual, subscriptions, AI credit spend, tax.

**B. Current user-facing question.** "Here is a large grid of finance widgets — most empty." The page does not answer any question. It is an inventory of finance-related surfaces that the user must interpret. Target question per V-11 spec: "What is my financial position and what needs attention?"

**C. Current data sources.**
- `GET /api/finance/expenses?limit=20` (line 17071)
- `GET /api/intelligence/cost-summary` (line 17088)
- `GET /api/finance/summary` (line 18246, boot strip)
- `GET /api/finance/subscriptions` (line 15123)
- Not called from this page but present in file: `/api/finance/transactions` (referenced in ballot), Plaid endpoints (never wired).

**D. Current API calls in JS.** `fetchFinanceData()` at line 17070 is the only page-scoped fetcher and issues exactly 2 fetches (expenses, cost-summary). `initFinanceCharts()` at ~line 17000 draws four empty Chart.js canvases with placeholder data (no fetches).

**E. Current loading behaviour.** All stat cards show em-dash `—`; expenses tbody shows "Loading expenses…" italic; `financePanel` shows a `.skel skel-row skel-wide`; charts render with hardcoded zero data until data arrives. No V-11-B `setState(el, 'loading', …)` is used anywhere.

**F. Current empty-state behaviour.** Per-panel bespoke strings: "No invoices yet", "No subscriptions yet", "No expenses logged yet", "No expense data yet". No consistent empty-state semantics; no CTA on any empty state.

**G. Current error behaviour.** Every `.catch(function(){})` in this page **swallows the error silently**. If `/api/finance/expenses` returns 500, the tbody remains in "Loading expenses…" state indefinitely. Cost-summary catch is silent. This directly violates V-11 Principle 4 ("Failures are honest").

**H. Current stale-data behaviour.** None. No TTL, no `_apexMarkStale`, no `.apex-stale-since` badge. The V-11-B `_PANEL_TTLS.finance = 300000` (5 min) exists in the global config but is never consumed by this page.

**I. Current permission behaviour.** Page is visible to both Master and User (no `apex-master-only` gate). Every fetch runs under whatever identity is on the session. There is no per-role filtering — a User sees the exact same Anthropic total-spend widget (`/api/intelligence/cost-summary`) as Master, which is a **V-11-N Layer 2 leak** (aggregate cost data across the platform is Master-visible only).

**J. Current visual hierarchy.** Confusing. The "Net worth hero" is styled prominently but shows `—` until Plaid connects. Four `.ds-stat-card` tiles follow with `—` values. Then charts. Then invoices/expenses tables. Then cash-flow. Then budget. Then subscriptions. Then AI credits panel (an operational metric, not a personal-finance metric). Then Tax (four hardcoded tiles with static dates like "31 Jan 2027" that are not personalised).

**K. Current typography hierarchy.** Header title: `.ds-page-title` letter-spacing 7px (all-caps "FINANCE" 24px+). Subline: `'JetBrains Mono' 11px letter-spacing 2px #8893a0` (raw hex — token violation). Section captions: `.t-label` (JetBrains Mono 10px). Numbers: `tabular-nums` in `Inter`. Mixed — no obvious grid.

**L. Current use of technical IDs.** No raw IDs exposed. However "FIN · FINANCE AGENT" text (line 7346) exposes internal agent naming, which is V-11 §7.6 SYSTEM territory, not FINANCE UI.

**M. Current confidence presentation.** None. No confidence dot, no source, no timestamp on any finance figure. The four "Tax" tiles show colours (cyan/amber/green/amber) that suggest status but have no legend and no data source.

**N. Current evidence presentation.** None. Numbers appear without provenance (which account, which date range, which source of truth).

**O. Current action affordances.**
- `+ Log expense` button (data-fn="logExpenseQuick") — top right.
- `+ Create` (invoice) — no handler wired.
- `📷 Scan receipt` — no handler wired.
- `Import` (subscriptions) — no handler wired.
- `Top up` (AI credits) — no handler wired.

Approx. 4 of 5 primary CTAs on this page have **no click handler**. Confirmed by absence in the `data-fn` dispatcher.

**P. Current progressive disclosure.** None. Every panel is at "L0 slot" but shows a chart or a table — L1/L2 disclosure model is unimplemented. Tapping any element does nothing.

**Q. Current mobile behaviour.** `ds-grid-2` collapses to single column at ≤900px (line 3823). `ds-grid-stats` and `ds-grid-3` are not covered by media queries — they overflow on 375px. Bank cards row uses `overflow-x:auto` (line 7380), which is not thumb-friendly on iOS Safari. Compose modals are positioned `bottom:80px;right:24px` fixed — will collide with mobile bottom tab bar.

**R. Current desktop behaviour.** At 1280px the page fills content area (max-width:1400px per V-11-A). At 1660px+ it centres. No hover-preview states.

**S. Current duplicated UI patterns.** The 4-stat header row (`.ds-grid-stats`) is duplicated on FINANCE (line 7383), HEALTH (`.ds-grid-stats-6` line 7816), BUSINESS (line 9173), UNIVERSITY (line 9337), OCCULT (line 9497). Each is styled slightly differently.

**T. Current inconsistent terminology.** "Finance", "Money", "Cash flow", "Budget", "Expenses", "Spend", "Balance", "Credit" all appear in this one page for related but not identical concepts. The AI-credits panel uses "Credit" ($ USD) while everything else is £; no unit legend.

**U. Current dead/legacy UI.** The "Bank cards visual" row (`#financeCardsRow` line 7380) renders `financeCardsRow` empty by default and no code populates it. "Plaid not connected" amber badge is hardcoded literal (line 7377) — will always show "not connected" even if Plaid becomes connected because no state flip exists.

**V. Current inline styling/token violations.** Extreme. The page contains inline `style="…"` on virtually every div (17+ inline colour literals in the tax row alone: `#071a2b`, `#100e24`, `rgba(0,212,255,0.25)`, etc.). Estimated ~120 inline-style attributes on this single page.

**W. Current polling/data-refresh behaviour.** No page-specific polling. Global `refreshFast` (line 13593, 15s cadence per line 14293) refreshes the boot strip's `/api/finance/summary` (line 18246). No refresh of the FINANCE page's expenses/cost-summary after initial load unless user re-navigates to the page (`initFinancePage` fires on every switchPage('finance')).

**X. Current WebSocket/event opportunities.** New transactions arriving via bank webhooks (future Plaid), invoice paid, invoice overdue — none currently wired. Would benefit from real-time WS pushes.

**Y. Current accessibility problems.** No `aria-live` on any dynamically-updating cell. Colour is the only signal on the amber "Plaid not connected" badge. `<canvas>` elements have no text alternative. Icon-only buttons (`↺`, `+`) have no `aria-label`.

**Z. Current user comprehension risks.** A first-time user seeing `£—` net worth with "Plaid not connected" beneath, next to `£0` expenses YTD and `$— · loading` AI credits will not understand what APEX knows about their finances. The Tax row's hardcoded dates ("31 Jan 2027") give the false impression of personalised data.

**FIVE-SECOND TEST.** User can identify the page is about "finance", knows APEX is not connected to their bank, sees they have 0 invoices and 0 expenses logged. That is the only signal available in 5 seconds. There is no L0 summary of financial position.

**THIRTY-SECOND TEST.** User cannot get to a meaningful action in 30 seconds. The only working CTA is "Log expense" (voice-triggered). The rest are stubs. Target: within 30 seconds the user should be able to see "Balance £X · £Y spent this week · N invoices overdue" and act on any overdue item.

**HIDDEN INFO.** Cash-flow projection assumptions, VAT calculation basis, per-vendor AI spend breakdown, historical categorised spend, forecasting model details.

---

### 3.2 COMMUNICATION (`#page-communication`)

Location: line 6952–7333. JS: `initCommunicationPage()` at 17001. `switchPage` wrapper at 17008.

**A. Current purpose.** Aggregate inbound communication surface: calendar, email inbox (unified), contacts, messaging (SMS/WhatsApp/LinkedIn), social (FB/IG/Discord), birthdays/anniversaries.

**B. Current user-facing question.** "Here are the channels APEX could see if configured." Target per V-11 spec: "What conversations, messages, or communication require attention?"

**C. Current data sources.**
- `GET /api/emails` (line 16884, 16972) — dual-fetch: inbox + attention list both call `/api/emails` separately (P1: request duplication)
- No calendar API — the calendar (`#net-cal-body`) is entirely client-side, uses hardcoded month/day rendering (lines 7253–7331 IIFE). No events surface from any backend.
- No contacts API — `contactsTbody` is left as skeleton
- No messaging APIs — every messaging card (SMS/WhatsApp/LinkedIn/Facebook/Instagram/Discord) displays hardcoded "—" placeholders with "SETUP" or "OFF" badges

**D. Current API calls in JS.** `fetchCommsEmails()` at 16881, `populateNetworkAttention()` at 16969. Both call `/api/emails` — two identical requests fired 100–200ms apart on page open.

**E. Current loading behaviour.** Email list: `<div class="ds-skel-row" style="height:48px">Loading inbox…</div>`. Contacts: `<div class="skel skel-row skel-wide">` inside `<td>`. Attention list: literal "Loading…" text. Birthdays: skeleton bar.

**F. Current empty-state behaviour.** Email list shows "No emails · inbox empty or not yet configured" — conflates two very different states (empty vs. not-configured). Attention shows "No urgent items — inbox clear" (positive framing — good). All other panels: "—" or SETUP badge.

**G. Current error behaviour.** Email fetch catch shows "Email not configured" — but the actual cause could be network error, 401, or 5xx. Contacts, calendar, messaging panels never error because they never fetch.

**H. Current stale-data behaviour.** None. `POLLING 5M` badge is a literal decoration (line 7058) — no code polls the inbox every 5 minutes on this page. The `refreshContactsPanel` in the interval array at line 14823 polls only if the user has visited the page.

**I. Current permission behaviour.** No role gating on this page. But: reading all inbound email from Master's mailbox is a Layer 3 data operation per V-11-N §6.1. If a User is ever granted comms access, the entire inbox is exposed. No filter, no author-of check.

**J. Current visual hierarchy.** The calendar dominates the top third of the page. This is disproportionate: the calendar has no events, no integration, and no way to add events. The urgent "Needs Attention" panel is buried below the calendar and 4 stat tiles.

**K. Current typography hierarchy.** Header uses `.ds-page-title` (letter-spacing 7px). Section labels use `'JetBrains Mono' 11px letter-spacing 2px` for `TODAY` chip. Stat panels use `'Inter' 26px bold`. Mixed weights. Every stat tile has its own coloured accent stripe (5b9eff, efb45a, ef4444, 3fd29a) — raw hex, no tokens.

**L. Current use of technical IDs.** "NET · COMMUNICATIONS" (line 6962) — internal service name in user-visible UI.

**M. Current confidence presentation.** None.

**N. Current evidence presentation.** Each email row shows sender + subject + time. No thread/source path.

**O. Current action affordances.**
- `▶ Check inbox now` — data-fn="checkEmailNow" (needs verification of implementation).
- Compose modal — `showComposeModal` (line 17776) works.
- Reply per email — inline "Reply" button opens `quickReply` modal (line 16921) — works.
- Sync contacts — no handler.
- Filter pills (ALL / PRIORITY / DRAFT / iCloud / Gmail / Outlook) — `filterEmails` (line 16962) only toggles the active class; **does not actually filter the list**.
- Calendar nav (`‹` / `›` / `TODAY`) — works client-side but has no events to display.
- Messaging card actions (`+ Log`, sync) — none.

**P. Current progressive disclosure.** None. Email rows do not expand to show body/preview. Contacts row does not expand to show contact detail.

**Q. Current mobile behaviour.** `display:grid;grid-template-columns:5fr 7fr` (line 6989) does not collapse at mobile. `display:grid;grid-template-columns:1fr 1fr 1fr` for messaging row (7076) will not fit on 375px. Calendar day view uses fixed 52px timeline column — narrow but rendered horizontal at all widths.

**R. Current desktop behaviour.** Renders as authored at 1280px+.

**S. Current duplicated UI patterns.** 4-stat header (same as FINANCE/BUSINESS/UNIVERSITY/HEALTH/OCCULT). Panel headers with dot + label + right-side action button.

**T. Current inconsistent terminology.**
- Sidebar label: **Network**
- Page header: **NETWORK**
- Page title (topbar): **Network**
- Internal ID: `communication`
- Spec label: **Communications**
- Sub-title: "EMAIL · MESSAGING · CALENDAR · CONTACTS"

Five different names for one page.

**U. Current dead/legacy UI.** All non-email messaging cards (SMS, WhatsApp, LinkedIn, Facebook, Instagram, Discord) are 100% static — no backend integration, hardcoded "SETUP"/"OFF" badges, no way to configure from UI. `#comms-cal-today` and `#comms-cal-grid` are hidden compat divs (line 7249). The `buildWeekCalendar` function (line 16858) writes to them but they are `display:none`.

**V. Current inline styling/token violations.** Massive. Every calendar cell, stat card, messaging card is inline-styled with raw hex. Estimated 150+ inline styles.

**W. Current polling/data-refresh behaviour.** No page-specific polling. Global `refreshContactsPanel` polls every 90 s if the user visits.

**X. Current WebSocket/event opportunities.** New email arrival, calendar event add/update, contact update from CRM — all currently require manual page refresh.

**Y. Current accessibility problems.** No `aria-live` on inbox. Compose modal is not `role="dialog"` and has no focus trap. Filter pills have no `aria-pressed`. Calendar buttons `‹` / `›` have no accessible name (glyph-only). "URGENT" label uses colour + label (accessible) — good.

**Z. Current user comprehension risks.** A user landing here in the morning sees a June 2026 empty calendar dominating the screen, "SETUP" badges on every messaging service, and might reasonably conclude APEX comms are broken.

**FIVE-SECOND TEST.** "This is a communication page. Calendar is empty. All messaging is SETUP." Nothing about what needs a response.

**THIRTY-SECOND TEST.** User can compose an email, potentially. Cannot triage inbox, cannot see who's waiting for a reply, cannot see today's schedule.

**HIDDEN INFO.** Email body previews, contact interaction history, thread depth, message priority reasoning.

---

### 3.3 BUSINESS (`#page-business`)

Location: line 9159–9321. JS: `refreshBizPage()` at 17247. `switchPage` wrapper at 17255.

**A. Current purpose.** Business/operations dashboard: revenue, active clients, leads, conversions, pending approvals, CRM pipeline, projects, task queue, documents, proposals.

**B. Current user-facing question.** Target per V-11 spec: "What is happening across my business/work and what should I do next?" Currently answered as "Here are some business tables."

**C. Current data sources.**
- `GET /api/operations/clients` (line 17191) — CRM
- `GET /api/operations/projects` (line 17211)
- `GET /api/tasks?sort=priority&limit=10` (line 17229)
- `GET /api/tasks/standing-approvals` (line 17164)
- No `/api/operations/documents` or `/api/operations/proposals` call from this page (they are called from `page-operation` at lines 14556, 14579 — same domain, duplicated page).

**D. Current API calls in JS.** `refreshBizPage()` calls 4 endpoints (`fetchBizApprovals`, `fetchBizCrm`, `fetchBizProjects`, `fetchBizTasks`). No deduplication with the parallel `#page-operation` calls.

**E. Current loading behaviour.** `bizApprovalList`: literal "Loading approvals…". CRM tbody: "Loading CRM…". Projects/tasks/documents/proposals panels: `.skel skel-row skel-wide` skeleton.

**F. Current empty-state behaviour.**
- Approvals: "No pending approvals"
- CRM: "No clients yet — add one via voice"
- Projects: "No projects yet"
- Tasks: "No tasks queued"

Inconsistent. No CTAs.

**G. Current error behaviour.**
- Approvals catch: "Approvals unavailable"
- CRM catch: **swallowed silently**
- Projects catch: "Projects unavailable"
- Tasks catch: "Tasks unavailable"

Non-uniform. No retry link, no `setState(el, 'failed', …)`.

**H. Current stale-data behaviour.** None.

**I. Current permission behaviour.** No `apex-master-only` gate. `/api/tasks/standing-approvals` returns all pending approvals — this includes Master-only agent approvals. If a User loads this page they see approvals they are not authorised to approve (V-11-N Authority §5 violation at the display layer, even if server-side rejects the approve action).

**J. Current visual hierarchy.** 4-stat header → Pending approvals (correctly prioritised) → CRM with Kanban toggle → Projects + Task queue → Documents + Proposals. Reasonable order. But the 4-stat header dominates: Revenue, Active Clients, Leads, Conversions are all `—` on empty state.

**K. Current typography hierarchy.** Same pattern as FINANCE: `.ds-page-title` 7px letter-spacing, mono subline, Inter for numbers.

**L. Current use of technical IDs.** "BIZ · BUSINESS AGENT" (line 9169) — internal agent name in header.

**M. Current confidence presentation.** None.

**N. Current evidence presentation.** Approval cards show `category · risk` metadata but no source, no cost, no reversibility — all required by V-11 §4.4 approval-card spec.

**O. Current action affordances.**
- `↺ Refresh` — works.
- `Deny all` (approvals) — data-fn="denyAllApprovals" — needs verification.
- `Approve` / `Deny` per approval — works (approveTask/denyTask at line 17815/17822).
- `☰ Kanban` / `⊞ Table` toggle — works.
- `+ Add client` — no handler.
- `+ Add` task — works (toggleTaskAddRow + addTaskFromInput).
- `Upload` (documents) — no handler.

**P. Current progressive disclosure.** None. Approval cards do not expand to show plan detail (V-11 §4.4 requires L2 expansion showing the full plan).

**Q. Current mobile behaviour.** `ds-grid-stats` (4 tiles) does not collapse at mobile. Kanban view uses `overflow-x:auto` with min-width 600px — horizontal scroll on all mobile widths.

**R. Current desktop behaviour.** Renders as authored.

**S. Current duplicated UI patterns.** Same 4-stat header as other pages. CRM table pattern duplicates the `#page-operation` CRM. Task queue duplicates the ACTIONS destination task queue.

**T. Current inconsistent terminology.** "Operation" (sidebar) vs "Business" (this page) — spec locks to **Business**. Both pages exist and both fetch `/api/operations/*`. Page-header sub-line says "REVENUE · CLIENTS · SALES · GROWTH · MARKETING" but the page shows CRM + Projects + Tasks + Documents + Proposals — none of "sales" or "growth" or "marketing" are separately surfaced.

**U. Current dead/legacy UI.** `#page-operation` (line 7571) duplicates most of `#page-business` — the V-11 spec collapses operations into Business.

**V. Current inline styling/token violations.** Similar volume to FINANCE. Kanban stage columns use inline background/border colours.

**W. Current polling/data-refresh behaviour.** `_domainVisited['operation']` polled every 60 s (line 14819) — refreshes CRM/Projects/Documents/Proposals. `#page-business` itself has no polling — only refreshes on switchPage or explicit Refresh button.

**X. Current WebSocket/event opportunities.** New task arrival, approval-required event, invoice paid, client stage change — real-time WS would eliminate need for polling.

**Y. Current accessibility problems.** Kanban cards are `draggable` but no keyboard equivalent — inaccessible to keyboard users. No `aria-label` on approve/deny buttons. `<table>` has `<thead>` but no `scope` attributes.

**Z. Current user comprehension risks.** "Active Clients: —" alongside "Leads: —" and "Conversions: —" leaves the user unclear whether APEX has 0 clients or has failed to fetch data.

**FIVE-SECOND TEST.** User sees "BUSINESS" header, four `—` stats, "Loading approvals…", "Loading CRM…". No signal.

**THIRTY-SECOND TEST.** Approve any pending approval works. Adding a task works. Nothing else has an active handler.

**HIDDEN INFO.** Per-client deal history, project step trace, task assignment attribution, document version history.

---

### 3.4 HEALTH (`#page-health`)

Location: line 7803–8017. JS: `initHealthPage()` at 17575. `switchPage` wrapper at 17583.

**A. Current purpose.** Personal wellbeing dashboard: workouts, nutrition, sleep, journal streak, mood, study sessions, body metrics, wellness (supplements/water/fasting), spiritual sessions, mindfulness, journal + psychology, study session (Pomodoro + flashcards).

**B. Current user-facing question.** Target: "What is relevant to my wellbeing and what should I be aware of?" Currently: "Here are 15+ health-tracking widgets."

**C. Current data sources.**
- `GET /api/health/sleep?limit=7` (line 17465)
- `GET /api/health/supplements` (line 17489)
- `GET /api/life/spiritual/sessions` (line 17512)
- `GET /api/health/metrics` (line 17525)
- `GET /api/life/university/sessions?limit=3` (line 17537)

Plus additional fetches from `_onFirstDomainVisit('health', …)` on first visit (line 17587): `refreshJournalPanel`, `refreshHabitTracker`, `refreshPsychologyPanel`, `refreshMoodChart`, `refreshSleepPanel`, `refreshWorkoutGrid` — each an additional endpoint. Plus periodic `refreshJournalPanel`+`refreshHabitTracker` every 60s (line 14820), and `refreshPsychologyPanel` every 120s (line 14821).

**Total API count for this page: ~11 initial + 4 recurring = 15+ endpoints.** This matches the V-11 spec's known claim ("Health tab API constraint: currently makes 15 API calls. V-11-H reduces this to ≤5 via aggregation or batching" — spec §7.3).

**D. Current API calls in JS.** `initHealthPage()` fires 5 immediate fetches, `_onFirstDomainVisit` fires 6 additional refresh functions each of which fetches its own endpoint.

**E. Current loading behaviour.** All stat cells show `—`; all panels show `.skel skel-row skel-wide`. No unified loading indicator.

**F. Current empty-state behaviour.** Bespoke per panel: "No supplements configured", "No sessions logged yet", "No entries yet", "No habits configured", "No study sessions yet". Journal textarea placeholder: "Today's entry — speak it or type it…".

**G. Current error behaviour.** Sleep chart on error renders empty bars (line 17484) — data loss without user notification. Supplements catch: "Supplements unavailable". Habits catch: "Habits unavailable". Most others: silent catch.

**H. Current stale-data behaviour.** None on-page.

**I. Current permission behaviour.** Page is visible to both Master and User (no `apex-master-only`). Health data is **Layer 3 personal data per V-11-N**. If a User loads this page while APEX has Master's health data cached in the endpoint, Master's data may be returned (server-side must enforce — dashboard has no `humanId` scoping in the fetches).

**J. Current visual hierarchy.** 6-tile stat header → 6 sub-sections (Health & Fitness, Sleep & Recovery, Spiritual & Mindfulness, Journal & Psychology, Study session, plus various inner grids). Section headings use a decorative `.ds-section-head` bar. The Pomodoro study session is placed at the very bottom — should be near a "start focus" CTA if study is a priority.

**K. Current typography hierarchy.** Consistent with FINANCE/BUSINESS: `.ds-page-title` 7px, mono sub, Inter for stats. Numbers use tabular-nums. The nutrition ring uses a 3px cyan border with a 20px number inside — small typography for a hero metric.

**L. Current use of technical IDs.** "HLTH · HEALTH AGENT" (line 7812).

**M. Current confidence presentation.** None. The crisis detection panel (line 7986) shows "Crisis detection · loading…" — could benefit from confidence + evidence.

**N. Current evidence presentation.** Body metrics show "Latest / 30d trend" columns but the trend column is `—` even when data exists. No source of metric (manual entry vs synced device).

**O. Current action affordances.**
- `🎙 Log via voice` (top-right) — logHealthVoice → toggleListening. Works.
- Workouts `+ Log` — no handler.
- Nutrition `+ Log meal` — no handler.
- Wellness `Log fast` — no handler.
- Spiritual `+ Log` — logSpiritualSession works (prompt-based).
- Journal `Save entry` — submitJournalEntry (needs verification).
- Mindfulness `▶ Start timer` — no handler.
- Study session `▶ Start` (Pomodoro) — works.
- Flashcards `Start session` — works.

**P. Current progressive disclosure.** None. All 6 sections are always visible at full detail.

**Q. Current mobile behaviour.** `.ds-grid-stats-6` (6 stat tiles) does not collapse. `.ds-grid-3` collapses via general rules but not always cleanly. Textarea grows in width but journal + mood chart side-by-side stack awkwardly.

**R. Current desktop behaviour.** Renders as authored.

**S. Current duplicated UI patterns.** Sleep panel + workout contribution grid appear inside HEALTH but also on the OCCULT page. Pomodoro is duplicated between HEALTH bottom section and UNIVERSITY top section. Mood chart is on HEALTH AND OCCULT. Journal is on HEALTH AND OCCULT. Study sessions counter is on HEALTH AND UNIVERSITY.

**T. Current inconsistent terminology.** "Journal" (Health) vs "Occult journal · dream log" (Occult) vs "Weekly reflection" (Occult) — all backed by `/api/life/journal/entries`. "Habit tracker" is on both Health-hidden and Occult (visible). "Spiritual sessions" is duplicated on Health and Occult.

**U. Current dead/legacy UI.** Fasting `Log fast` button — no handler. Wellness `Water / Fasting` tiles show `—` and never update.

**V. Current inline styling/token violations.** Very high. Every stat card has an inline `--accent` variable set to a raw token colour. Journal textarea, mood face row, habit tracker grid all use inline styles.

**W. Current polling/data-refresh behaviour.** Every 60s: `refreshJournalPanel` + `refreshHabitTracker` (line 14820). Every 120s: `refreshPsychologyPanel` (line 14821). Both gated on `_domainVisited['health']` — do not run before first visit. But `initHealthPage` calls `fetchSpiritualSessions`, `fetchHealthMetrics`, `fetchHealthStudySessions` etc. **every time** the user switches to the page — no dedup with prior visit.

**X. Current WebSocket/event opportunities.** Health data update from wearable sync would benefit from real-time push (currently would require full refresh).

**Y. Current accessibility problems.** Mood face row (line 7961) is not keyboard-navigable and has no `aria-label`. Sleep bars canvas has no text alternative. Crisis panel is a divergent alert but not `role="alert"`. Pomodoro number is not `aria-live`.

**Z. Current user comprehension risks.** User sees 6 stat tiles all `—`, then "Loading…" throughout. Cannot tell if HEALTH is empty or broken. "Study sessions: — this week" on HEALTH duplicates "Study sessions: — this week" on UNIVERSITY.

**FIVE-SECOND TEST.** "Health page. All stats empty. Many sub-sections." No signal about wellbeing.

**THIRTY-SECOND TEST.** User can start a Pomodoro. Can type a journal entry. Can log a spiritual session via prompt.

**HIDDEN INFO.** Historical trends, health-data provenance (wearable vs manual), crisis-detection reasoning, per-supplement schedule, per-workout detail.

---

### 3.5 UNIVERSITY (`#page-university`)

Location: line 9323–9481. JS: `initUniversityPage()` at 17414. `switchPage` wrapper at 17439.

**A. Current purpose.** Study dashboard: modules, assignments, flashcards, study sessions, reading list, Pomodoro timer.

**B. Current user-facing question.** Target: "What academic obligations, deadlines, progress, and opportunities matter?" Currently: "Here are 4 stats and 4 panels."

**C. Current data sources.**
- `GET /api/life/university/modules` (line 17290)
- `GET /api/life/university/assignments` (line 17305)
- `GET /api/life/university/flashcards` (line 17325)
- `GET /api/life/university/reading-list` (line 17347)
- `POST /api/life/university/flashcards/:id/review` (line 17408) — flashcard rating
- `POST /api/university/study-sessions` (line 14758) — Pomodoro completion
- Plus `_onFirstDomainVisit('university', …)` triggers `refreshUniversityPanel` at line 14704 which fetches `/api/university/modules`, `/api/university/assignments`, `/api/life/university/flashcards` (600s/300s/600s cached). **This is a second parallel fetch of the same data** with slightly different endpoint paths (`/api/university/*` vs `/api/life/university/*`).

**D. Current API calls in JS.** `initUniversityPage()` fires 4 fetches. First-visit hook fires 3 more (partial duplication). Total: ~7 initial fetches for one page.

**E. Current loading behaviour.** Stats `—`. Modules/reading-list panels: `.skel skel-row skel-wide`. Assignments tbody: skel cell. Flashcard preview: italic "Loading flashcards…".

**F. Current empty-state behaviour.**
- Modules: "No modules yet"
- Assignments: "No assignments"
- Flashcards: "✓ All caught up — no cards due" (positive framing — good)
- Reading list: "No books added yet"

**G. Current error behaviour.** Modules/assignments catches: silent. Flashcards catch: "Flashcards unavailable". Reading list catch: "Reading list unavailable".

**H. Current stale-data behaviour.** `refreshUniversityPanel` uses `cachedFetch` with 600s/300s TTL. But no stale badge on the cell. If the user is looking at 6-minute-old data they cannot know.

**I. Current permission behaviour.** No role gating. Academic data is Layer 3 personal per V-11-N. Same silent-cross-role-leak concern as HEALTH.

**J. Current visual hierarchy.** 4-stat header → Study SVG ring + Modules + Assignments (3-column) → Flashcards + Reading list (2-column) → Flashcard modal (hidden).

**K. Current typography hierarchy.** Consistent with other pages. The Pomodoro SVG ring is a strong visual anchor — the largest interactive element on the page.

**L. Current use of technical IDs.** "UNI · UNIVERSITY AGENT" header (line 9333).

**M. Current confidence presentation.** None. Grade/progress numbers surface without confidence.

**N. Current evidence presentation.** Modules show `name · grade · %` but no source of grade (self-reported vs. imported).

**O. Current action affordances.**
- `▶ Start session` (Pomodoro, top-right) — works.
- Module `Grade` — no handler.
- `▶ Start session` (Flashcards) — openFlashcardSession → works.
- `+ Add book` — no handler.
- Reset (`↻`) — works.
- Flashcard rating (Hard/OK/Easy) — works.

**P. Current progressive disclosure.** Flashcard modal implements front/back flip (works). No other panel expands.

**Q. Current mobile behaviour.** `.ds-grid-3` on the top row collapses in some rules but the SVG ring + modules + assignments do not gracefully rearrange. The flashcard modal is 440px wide fixed — overflows on 375px.

**R. Current desktop behaviour.** Renders as authored.

**S. Current duplicated UI patterns.** Pomodoro also on Health. Flashcards count shown twice in this page (`flashcardDueCountB` + `uniStatFlashcards`). Study session concept shared with HEALTH page. `flashcardDueCount` also exists on Health via `_onFirstDomainVisit('university', refreshUniversityPanel)` from Health page trigger too — cross-page dependency.

**T. Current inconsistent terminology.** "Module" (page) vs "Course" (some external vocabularies). "Grade" is displayed but not defined (percentage of grade earned vs. current mark). "Session" means Pomodoro block here but also Spiritual session on Health/Occult.

**U. Current dead/legacy UI.** Reading list "+ Add book" has no handler. Module "grade" column shown but no way to update.

**V. Current inline styling/token violations.** High. The SVG ring inline SVG has hard-coded colours. Every stat card has inline `--accent`.

**W. Current polling/data-refresh behaviour.** Every 120s `refreshUniversityPanel` if `_domainVisited['university']` (line 14822).

**X. Current WebSocket/event opportunities.** Grade update, new assignment, flashcard schedule change — real-time push would help.

**Y. Current accessibility problems.** Pomodoro numeric is not `aria-live`. Ring SVG has no accessible name. Flashcard modal is not `role="dialog"` and has no focus trap. Flashcard buttons rely on emoji + text — mostly OK.

**Z. Current user comprehension risks.** "Modules: —" vs "Flashcards: —" — user cannot tell if they have 0 modules or if the data has not loaded. `_appKey` header may not be attached — grade/assignment endpoints may 401.

**FIVE-SECOND TEST.** "University page. Empty. Big timer at left."

**THIRTY-SECOND TEST.** User can start Pomodoro. Can start flashcard session if any due. Cannot see next assignment deadline meaningfully.

**HIDDEN INFO.** Per-assignment brief, module weightings, past exam results, reading list source.

---

### 3.6 RESEARCH (`#page-research`)

Location: line 9618–9690. JS: `apexResearch()` global at line 18884, `apexResClear` at 18973.

**A. Current purpose.** Web research toolkit: search, scrape URL, crawl site, map site, file-to-text extractor.

**B. Current user-facing question.** Target: "What am I investigating, what have I learned, and where are the knowledge gaps?" Currently: "Here is a Firecrawl / MarkItDown tool wrapper."

**C. Current data sources.**
- `POST /api/research/search` (line 18906)
- `POST /api/research/scrape` (line 18905)
- `POST /api/research/crawl` (line 18907)
- `POST /api/research/map` (line 18908)
- `POST /api/convert/file` (line 19006) — MarkItDown file conversion

**D. Current API calls in JS.** All routed through `window.apexResearch(mode)` at line 18884 and `window.apexFileRead(file)` at 18989.

**E. Current loading behaviour.** Loader block appended to results container with a spinner and mode+query text. `_setBtnsDisabled(true)` while running. Pipeline stage strip highlights the current stage via `_resStageLight(mode)`.

**F. Current empty-state behaviour.** Well-designed: `.apex-research-empty` with `◈` icon and "No results yet". Only page with a proper empty-state icon.

**G. Current error behaviour.** `_renderResError` renders an error block with title/query/msg — one of the few pages with a genuine error surface. Console errors show via `apexFeedPush('RESEARCH','Error: ...')`.

**H. Current stale-data behaviour.** N/A — one-shot research operations.

**I. Current permission behaviour.** No `apex-master-only` gate. All users can call research endpoints. Under V-11-N Authority §5, User capability for research is a policy question — currently no gate. Anthropic cost accrues to Master.

**J. Current visual hierarchy.** Pipeline stage strip → toolbar → file drop zone → results. Very focused, single-column. This is the closest to a V-11-compliant layout among the 9 pages.

**K. Current typography hierarchy.** `.ds-page-title` header (7-letter-spacing "RESEARCH"). Then `.apex-research-toolbar` with input + buttons. Pipeline strip uses 9px monospace labels — small.

**L. Current use of technical IDs.** "RES · RESEARCH ENGINE" — internal engine name in header.

**M. Current confidence presentation.** None. Search results have no confidence, no source-quality indicator.

**N. Current evidence presentation.** Each search result renders title + URL + body — good. But no citation/save-to-memory affordance.

**O. Current action affordances.**
- `⊹ Search`, `⊘ Scrape URL`, `⊛ Crawl Site`, `⊕ Map`, `✕ Clear` — all functional.
- File drop zone (drag or click) — functional.
- No "Save to memory" or "Convert to knowledge" action.

**P. Current progressive disclosure.** Search results render full body — no L1/L2 expansion. Crawl/map results render as raw JSON in a terminal — very technical, no L0 summary.

**Q. Current mobile behaviour.** Toolbar with 5 buttons horizontally will overflow on 375px. No mobile stacking rule.

**R. Current desktop behaviour.** Renders well.

**S. Current duplicated UI patterns.** Different from every other page — no shared 4-stat header, no shared panel-with-dot pattern. Uses its own `.apex-research-*` classes.

**T. Current inconsistent terminology.** "Search" as tool vs "Search" (top-of-app command palette). "Crawl" vs "Scrape" — technical distinction exposed to user without explanation.

**U. Current dead/legacy UI.** None significant.

**V. Current inline styling/token violations.** Lower than other pages. The pipeline stage strip uses inline styles per stage. Toolbar uses `.apex-research-*` class-based CSS (better).

**W. Current polling/data-refresh behaviour.** None.

**X. Current WebSocket/event opportunities.** Long-running crawl progress could stream via WS/SSE.

**Y. Current accessibility problems.** File input is `display:none` — accessible only via click on drop zone (which needs proper label). Buttons have decorative unicode glyphs prefixed to labels (`⊹`, `⊘`) — screen readers may verbalise them.

**Z. Current user comprehension risks.** User may not understand the distinction between Search / Scrape / Crawl / Map. Raw JSON output for Crawl/Map is technical.

**FIVE-SECOND TEST.** "This is a research tool with a query bar and 5 modes and a file drop zone." Reasonable but not intelligent — no answer to "what am I investigating".

**THIRTY-SECOND TEST.** User can run a search and read results. Cannot save to memory. Cannot compare to prior research. Cannot see what APEX has learned.

**HIDDEN INFO.** Prior research runs, saved sources, per-result confidence, cost per run.

---

### 3.7 OCCULT (`#page-occult`) [Master-only]

Location: line 9484–9615. JS: `initOccultPage()` at 17749. `switchPage` wrapper at 17767. Sidebar button has `apex-master-only` class (line 10486).

**A. Current purpose.** Personal spiritual/esoteric practice log: dream journal, spiritual sessions, mood trend, habit tracker, reading prompt, weekly reflection.

**B. Current user-facing question.** V-11 canonical for OCCULT (Master): "What does APEX know about this specialised knowledge domain and what remains uncertain?" — but the current page answers a completely different question: "What have I done this week spiritually?" It is really a **personal-practice log** disguised as an "OCCULT" page.

There is a significant **product-purpose mismatch**: the page contents (journal + sessions + mood + habits + reflection) belong on the LIFE & WORK → Personal tab (per V-11 Decision 5 which merges Journal + Spiritual + Esoteric Research into "Personal"). The **Master-only knowledge-of-esoteric-topics function** — if it exists at all — is not currently implemented.

**C. Current data sources.**
- `GET /api/life/journal/entries?limit=5` (line 17638) — reused from HEALTH
- `POST /api/life/journal/entries` (line 17631) — save
- `GET /api/life/spiritual/sessions` (line 17652) — reused from HEALTH
- `POST /api/life/spiritual/log` (line 17569)
- `GET /api/life/journal/entries?limit=7` (line 17681) — third fetch of the same endpoint (mood extraction)
- `GET /api/life/psychology/crisis-check` (line 17700)
- `GET /api/life/habits` (line 17715)

**D. Current API calls in JS.** 6 immediate fetches in `initOccultPage()`. Note the triple-fetch of `/api/life/journal/entries` with different limits.

**E. Current loading behaviour.** Skeleton rows in every panel. No unified indicator.

**F. Current empty-state behaviour.**
- Entries: "No entries yet"
- Sessions: "No sessions logged yet"
- Habits: "No habits configured"
- Crisis: "Weekly summary · loading…"

**G. Current error behaviour.** Habits catch: "Habits unavailable". Crisis-check catch: "Weekly summary unavailable". Journal/sessions/mood catches: silent.

**H. Current stale-data behaviour.** None.

**I. Current permission behaviour.** Gated at nav level (`apex-master-only`) — sidebar button hidden for User. But the `#page-occult` element itself has **no `.apex-master-only` class on the container** — if a User were to navigate via hash (`#occult`), the page would still render and fetch endpoints. Server-side would need to enforce.

**J. Current visual hierarchy.** 4-stat header → journal + spiritual sessions (2-col) → mood trend + habit tracker (2-col) → reading prompt → weekly reflection (collapsible).

**K. Current typography hierarchy.** Same as other pages. Reading-prompt uses italic 14px `--text-mid` for the daily prompt.

**L. Current use of technical IDs.** "OCC · MINDFULNESS" (line 9493).

**M. Current confidence presentation.** None.

**N. Current evidence presentation.** Journal entries show date + first 80 chars. No expand for full entry.

**O. Current action affordances.**
- `+ Log session` (top-right) — logSpiritualSession works.
- `Save entry` (journal) — saveOccultJournal works.
- Weekly reflection toggle — toggleOccReflection works.
- Save reflection — saveOccReflection works.

**P. Current progressive disclosure.** Weekly reflection is collapsible (accordion) — one of the few places on any page. Otherwise no.

**Q. Current mobile behaviour.** `.ds-grid-2` collapses. Journal textarea grows. Reading prompt renders full-width.

**R. Current desktop behaviour.** Renders as authored.

**S. Current duplicated UI patterns.** Journal, spiritual sessions, mood chart, habit tracker — all duplicated between HEALTH and OCCULT. Two completely separate JS pathways populating the same underlying data.

**T. Current inconsistent terminology.** "Occult journal · dream log" vs "Journal" on Health. "Sessions" here vs "Spiritual sessions" on Health.

**U. Current dead/legacy UI.** "Sigil practice" stat (line 9504) has no backing data source — never populated.

**V. Current inline styling/token violations.** High. All stat tiles and panels.

**W. Current polling/data-refresh behaviour.** No page-specific polling.

**X. Current WebSocket/event opportunities.** None relevant.

**Y. Current accessibility problems.** Reflection toggle uses `▼`/`▲` glyph — no `aria-expanded`. Textareas have no `aria-label` beyond placeholder.

**Z. Current user comprehension risks.** Name mismatch: sidebar says "Occult", page header says "OCCULT", spec says "Esoteric Research", contents are actually personal-practice logging. User does not know what the page is for.

**FIVE-SECOND TEST.** "Dark spiritual-looking page with a journal textarea."

**THIRTY-SECOND TEST.** User can log a session, save a journal entry, save a reflection. Cannot ask APEX any question about esoteric knowledge.

**HIDDEN INFO.** N/A — the page has no "knowledge" surface, only user-entered content.

---

### 3.8 CIVILISATION (`#page-civilisation`) [Master-only]

Location: line 9694–9783. JS: `window.civRefresh` at line 19343. `switchPage` wrapper at line 19384. `expLoad` (self-expansion engine) at line 19394. Sidebar button `apex-master-only`.

**A. Current purpose.** Constitutional governance status dashboard: genome/contracts/clock health, domain grid, consensus sessions, self-expansion engine (approvals queue).

**B. Current user-facing question.** V-11 canonical for CIVILISATION (Master): "What does APEX understand about the broader civilisation/system model and what matters?" Currently answered as "Here is the constitutional state machine."

**C. Current data sources.**
- `GET /api/civilisation/status` (line 19345)
- `GET /api/civilisation/domains` (line 19363)
- `GET /api/civilisation/consensus` (line 19367)
- `POST /api/civilisation/consensus/propose` (line 19379)
- `GET /api/expansion/summary` (line 19397)
- `GET /api/expansion/pending` (line 19398)

**D. Current API calls in JS.** 3 fetches from `civRefresh`; 2 from `expLoad`. Both fire on `switchPage('civilisation')`.

**E. Current loading behaviour.** All cells show `—` and "Loading…" text. Domains grid shows "Loading…". Consensus: "No sessions" default. Expansion: "Loading…".

**F. Current empty-state behaviour.** "No sessions", "No pending approvals" — reasonable defaults but no CTA.

**G. Current error behaviour.** All catches log to console (`console.warn('[civ] status error')`) but nothing surfaces to the user. Non-compliant with V-11 Principle 4.

**H. Current stale-data behaviour.** None.

**I. Current permission behaviour.** Master-only nav. Server-side must enforce `/api/civilisation/*` and `/api/expansion/*`. **The `#page-civilisation` container has NO `.apex-master-only` class** — direct hash navigation (`#civilisation`) will render for User.

**J. Current visual hierarchy.** Header with constitutional gate label → 3-cell status row (Genome/Contracts/Clock) → Domain grid → Consensus sessions → Self-expansion engine → Refresh button.

**K. Current typography hierarchy.** `.ds-page-title` "CIVILISATION" 7px letter-spacing. Sub: "GENOME · CONSENSUS · CLOCK · DOMAINS" — pure technical vocabulary.

**L. Current use of technical IDs.** Prompt-based propose flow (line 19373) asks user to type `DOM-000001` (raw domain ID). Session `type` values are ALL_CAPS constants: `LAW_CHANGE`, `CONSTITUTIONAL_AMENDMENT`, `DOMAIN_OPERATION`, `AUTONOMY_GRANT`. All L4 technical detail per V-11 §3 disclosure model.

**M. Current confidence presentation.** None.

**N. Current evidence presentation.** Genome/contracts summary shown as raw JSON with brackets stripped. Not human-readable.

**O. Current action affordances.**
- `+ Propose` — prompts for type/title/desc/proposer_id — works but is a chain of `prompt()` dialogs.
- `⚡ Scan Now` (self-expansion) — expScan (needs verification).
- `↺ Refresh` — works.
- Per-approval Approve/Reject in expansion pending list — needs verification.

**P. Current progressive disclosure.** None. All data is at raw JSON level.

**Q. Current mobile behaviour.** 3-column status row does not collapse. Auto-fill grid handles domains OK. Overall page is dense on mobile.

**R. Current desktop behaviour.** Renders as authored.

**S. Current duplicated UI patterns.** Panel-with-label pattern shared. Otherwise unique to this page.

**T. Current inconsistent terminology.** "Civilisation" (nav) vs "Civilization" (some backend endpoint names — American spelling). "Genome" vs "Constitution" both used for the same thing.

**U. Current dead/legacy UI.** None significant — the page is small.

**V. Current inline styling/token violations.** Present but lower volume than FINANCE/HEALTH. Uses `#22d3ee`, `#f59e0b`, `#ef4444`, `#818cf8` raw.

**W. Current polling/data-refresh behaviour.** None. Only refreshes on switchPage or explicit Refresh.

**X. Current WebSocket/event opportunities.** New consensus session, expansion capability discovered — real-time push would improve.

**Y. Current accessibility problems.** No `aria-live` on the status labels. The Propose flow uses native `prompt()` — inaccessible on mobile.

**Z. Current user comprehension risks.** Fatal for non-technical users — the page requires reading "constitutional gate", "domain status", "consensus session type" and understanding what a DOM-nnnnnn ID is. Even Master must understand APEX internals to use this page.

**FIVE-SECOND TEST.** "This page has technical jargon I don't understand."

**THIRTY-SECOND TEST.** Master can propose a session via 4 chained prompts. User cannot use this page meaningfully.

**HIDDEN INFO.** N/A — everything is exposed at max verbosity.

---

### 3.9 REALITY (`#page-reality`) [Master-only]

Location: line 9786–9966. JS: `loadRealityPage` (composite) around line 19775. Individual loaders at lines 19496–19749. `switchPage` wrapper at 19787. Sidebar `apex-master-only`.

**A. Current purpose.** Reality-architecture visualisation: system reality health, observer health, belief-reality gap, epistemic capital, attention queue, understanding, intent attribution, reality claims, counterfactual worlds, meta-model quality, mental models, civilization self-model.

**B. Current user-facing question.** V-11 canonical for REALITY (Master): "What is the current state of the APEX reality model and what requires attention?" Currently answered as: "Here are 12 raw endpoint responses laid out in a grid."

**C. Current data sources (all under `/api/reality*`, 12 distinct endpoints):**
- `GET /api/reality/health` (line 19496)
- `GET /api/reality-architecture/observers` (line 19522)
- `GET /api/reality-architecture/beliefs/DOM-000001/gap` (line 19542)
- `GET /api/reality-architecture/epistemic-capital/DOM-000001` (line 19565)
- `GET /api/reality-architecture/attention/top?limit=8` (line 19587)
- `GET /api/reality-architecture/understanding/DOM-000001` (line 19611)
- `GET /api/reality-architecture/intent/agent-orchestrator/rate` (line 19635)
- `GET /api/reality/claims?limit=20&stage=...` (line 19659)
- `GET /api/reality-architecture/counterfactual/worlds` (line 19682)
- `GET /api/reality-architecture/meta-model` (line 19705)
- `GET /api/reality-architecture/mental-models/agent-orchestrator` (line 19727)
- `GET /api/reality-architecture/self-model` (line 19749)
- `POST /api/reality-architecture/seed` (line 19802) — seed data

**Also note:** endpoints have hardcoded IDs (`DOM-000001`, `agent-orchestrator`) — the page is not domain-parameterised.

**D. Current API calls in JS.** All 12 fetches fire on `switchPage('reality')`. This is the highest-fanout page in the entire app.

**E. Current loading behaviour.** All 12 panels show `.skel skel-row skel-wide`.

**F. Current empty-state behaviour.** Bespoke per panel. Claims panel has a filter dropdown that requires data to be present.

**G. Current error behaviour.** Silent catches for most panels.

**H. Current stale-data behaviour.** None.

**I. Current permission behaviour.** Master-only nav. **The `#page-reality` container has NO `.apex-master-only` class** — direct hash navigation would render.

**J. Current visual hierarchy.** System Reality Health (full-width) → 2-column (Observer + Belief Gap) → 3-column (Epistemic + Attention + Understanding) → 2-column (Intent + Claims) → 2-column (Counterfactual + Meta-Model) → 2-column (Mental Models + Self-Model). 12 panels total.

**K. Current typography hierarchy.** `.ds-page-title` "REALITY". Sub: "FABRIC · CLAIMS · HEALTH · EPISTEMIC" — technical vocabulary.

**L. Current use of technical IDs.** Extreme: `DOM-000001`, `agent-orchestrator`. Also section titles like "Epistemic Capital", "Belief-Reality Gap", "Counterfactual Worlds", "Meta-Model Quality" — internal system vocabulary that even Master should not need to know per V-11 §1.2 anti-goals ("Users should never need to know: … Internal vocabulary: 'civilization cycles', 'reality fabric', 'epistemic health'").

**M. Current confidence presentation.** Reality claims have a `stage` filter (verified/observed/contested/potential) — the closest thing to confidence in the app. But no per-claim confidence dot.

**N. Current evidence presentation.** Claims panel shows raw claim text with stage badge — no source, no provenance chain.

**O. Current action affordances.**
- `⬆ Seed` — reality data seed (Master admin).
- `↻` (top of System Reality Health) — realityHealthRefresh works.
- Claims filter dropdown — works.

**P. Current progressive disclosure.** None.

**Q. Current mobile behaviour.** Multiple `.ds-grid-2` and `.ds-grid-3` — will stack to single column but 12 panels stacked vertically is a very long scroll.

**R. Current desktop behaviour.** Renders as authored. Dense.

**S. Current duplicated UI patterns.** Panel-with-label pattern only.

**T. Current inconsistent terminology.** "Reality" vs "Reality Architecture" — same page, endpoints split between `/api/reality/*` and `/api/reality-architecture/*`.

**U. Current dead/legacy UI.** None.

**V. Current inline styling/token violations.** Present.

**W. Current polling/data-refresh behaviour.** None.

**X. Current WebSocket/event opportunities.** New claim, meta-model update — could stream.

**Y. Current accessibility problems.** Same as CIVILISATION — no `aria-live`, no accessible names on icon-only buttons.

**Z. Current user comprehension risks.** Even Master must have read the APEX reality architecture documents to understand this page. It is a debug console dressed as a UI.

**FIVE-SECOND TEST.** "Grid of 12 loading skeletons. Very technical."

**THIRTY-SECOND TEST.** Master can seed data, refresh, filter claims. Cannot ask what has changed, cannot see priority, cannot see next action.

**HIDDEN INFO.** N/A — everything is exposed.

---

## SECTION 4: CROSS-PAGE ANALYSIS

### 4.1 Common patterns

Patterns repeated across ≥3 of the 9 pages:

- **Page header block:** `<div style="display:flex;align-items:flex-end;justify-content:space-between;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.07)">` with an `.ds-page-title` (letter-spacing 7px, all-caps), a mono sub-line, and a right-aligned CTA + internal-agent label. Used on FINANCE, COMMUNICATION, BUSINESS, HEALTH, UNIVERSITY, OCCULT, RESEARCH, CIVILISATION, REALITY — **all 9 pages**.
- **4-stat header row:** `.ds-grid-stats` with 4 `.ds-stat-card` tiles (label + big value + sub-line). Used on FINANCE, BUSINESS, UNIVERSITY, OCCULT. Health uses `.ds-grid-stats-6` (6 tiles).
- **Panel pattern:** `.ds-panel` with `.ds-panel-header` containing left dot + label and right action button. Body is either a table or a `<div>` with a `.skel skel-row skel-wide` skeleton, later replaced by inline `innerHTML`. Used on every page except RESEARCH.
- **switchPage wrapper cascade:** Each page adds its own wrapper around `window.switchPage`. Total wrappers stacked: 14 (lines 15778, 16847, 17009, 17107, 17256, 17264, 17441, 17585, 17769, 18362, 19141, 19160, 19385, 19788, 20519, 20564). Every switch triggers a chain of 14+ handlers.
- **Silent catch blocks:** Most fetches use `.catch(function(){})` with no error surface.
- **Skeleton pattern:** `<div class="skel skel-row skel-wide"></div>` inside panel body, replaced by data or empty-state string when fetch resolves.
- **Master-only sidebar gating:** `#nav-occult`, `#nav-civilisation`, `#nav-reality`, `#nav-agents`, `#nav-approvals`, `#nav-activity`, `#nav-governance` all have `class="nav-btn apex-master-only"`. But the `<div id="page-xxx">` container for Master-only pages does NOT have `.apex-master-only`.
- **Prompt-based flows:** OCCULT (`logSpiritualSession`), CIVILISATION (`civOpenPropose`) both use chained `prompt()` calls — not accessible, not styled, not persistable.

### 4.2 Shared API infrastructure

Endpoints that serve multiple LIFE & WORK pages:

| Endpoint | Pages consuming |
|---|---|
| `/api/life/journal/entries` | HEALTH, OCCULT (three separate fetches per page load) |
| `/api/life/spiritual/sessions` | HEALTH, OCCULT |
| `/api/life/habits` | HEALTH, OCCULT |
| `/api/life/psychology/crisis-check` | HEALTH, OCCULT |
| `/api/life/university/flashcards` | UNIVERSITY, HEALTH (via `flashcardDueCount` cross-reference) |
| `/api/life/university/sessions` | HEALTH, UNIVERSITY |
| `/api/tasks` | BUSINESS, ACTIONS, TODAY |
| `/api/tasks/standing-approvals` | BUSINESS, ACTIONS, TODAY |
| `/api/operations/clients` | BUSINESS, `#page-operation` (duplicate page) |
| `/api/operations/projects` | BUSINESS, `#page-operation` |
| `/api/operations/documents` | `#page-operation` only |
| `/api/operations/proposals` | `#page-operation` only |
| `/api/emails` | COMMUNICATION (twice per page load — inbox + attention) |
| `/api/finance/summary` | Boot strip only (not FINANCE page) |
| `/api/intelligence/cost-summary` | FINANCE, SYSTEM (both) |

**Shared middleware:** No aggregation endpoint exists for LIFE & WORK. `_PANEL_TTLS` global (V-11-B) defines TTL for each domain but no page consumes it.

**Route file structure** (per CLAUDE.md convention — each route file uses its own sub-prefix):
- `routes/health.js` — `/api/health/*`
- `routes/life.js` — `/api/life/*`
- `routes/finance.js` — `/api/finance/*`
- `routes/operations.js` — `/api/operations/*`
- `routes/university.js` — `/api/life/university/*` and `/api/university/*` (two variants exist)
- `routes/research.js` — `/api/research/*`
- `routes/civilisation.js` — `/api/civilisation/*`
- `routes/reality.js`, `routes/reality-architecture.js` — `/api/reality/*` and `/api/reality-architecture/*` (split)

### 4.3 Consistent inconsistencies

Where every LIFE & WORK page makes the same mistake:

1. **No L0 summary on any page.** Every page opens with a title + stat grid, never with a one-sentence human summary of the domain state.
2. **No confidence indicator on any data point.** Nothing on any page has the locked V-11 dot+label pattern (Decision 10).
3. **No consistent state-model.** No page uses `setState()`. Every page has its own bespoke loading/empty/error strings.
4. **Silent error handling.** Every page swallows most errors.
5. **Inline hex colours.** Every page has raw hex colour literals in inline styles.
6. **Icon-only buttons without `aria-label`.** Every page has at least one glyph-only button (`↺`, `‹`, `›`, `+`, `⚡`) missing an accessible name.
7. **Header + internal-agent code labels.** Every page's header includes an internal agent code ("FIN · FINANCE AGENT", "BIZ · BUSINESS AGENT", etc.) — L4 vocabulary in L0 slot.
8. **Master-only pages not gated at container level.** Only sidebar buttons are gated; the `#page-xxx` div renders for any role that hits it via hash.
9. **Duplicated cross-page data fetching.** No page shares a fetch result with any other page. Journal endpoint fetched 3× per Occult load and again on Health load.
10. **All 9 pages register their own `switchPage` wrapper.** The chain is 14 levels deep, causing every navigation to invoke handlers for unrelated pages.

### 4.4 Domain-purpose mapping (canonical)

| Domain | Canonical human purpose question | Currently answered? |
|---|---|---|
| FINANCE | "What is my financial position and what needs attention?" | **No.** Page is a grid of finance widgets, mostly empty. |
| COMMUNICATION | "What conversations, messages, or communication require attention?" | **Partially.** "Needs Attention" section is present but buried; inbox is present but non-filterable; other channels non-functional. |
| BUSINESS | "What is happening across my business/work and what should I do next?" | **Partially.** Pending approvals are surfaced at top (correct). CRM and tasks are visible but no priority narrative. |
| HEALTH | "What is relevant to my wellbeing and what should I be aware of?" | **No.** 15 API panels with sparse data; no wellbeing narrative. |
| UNIVERSITY | "What academic obligations, deadlines, progress, and opportunities matter?" | **Partially.** Assignments-due count and Pomodoro are present. No deadline narrative, no next-most-important. |
| RESEARCH | "What am I investigating, what have I learned, and where are the knowledge gaps?" | **No.** Page is a research toolbar, not a research-in-progress surface. |
| OCCULT (Master) | "What does APEX know about this specialised knowledge domain and what remains uncertain?" | **No.** Page is a personal journal, not a knowledge surface. |
| CIVILISATION (Master) | "What does APEX understand about the broader civilisation/system model and what matters?" | **No.** Page is a raw governance state machine. |
| REALITY (Master) | "What is the current state of the APEX reality model and what requires attention?" | **No.** Page is 12 raw endpoint responses in a grid. |

**Answers: 0 Yes / 4 Partial / 5 No.**

---

## SECTION 5: L0–L4 INFORMATION ARCHITECTURE MODEL

Per V-11 Part III, every surface must define what belongs at each disclosure level. Proposed model per domain:

### 5.1 FINANCE

- **L0** (always visible): "Balance £X · £Y spent this week · N invoices overdue" — a single sentence. If Plaid not connected: "APEX cannot see your bank accounts yet — [Connect]".
- **L1** (tap): breakdown of the L0 numbers — where the £Y went (top 3 categories), which invoices overdue, next 7-day cash-flow projection.
- **L2** (Show evidence): per-transaction detail; per-invoice status; per-subscription upcoming charge; sources (Plaid account, manual entry, CRM invoice, subscription DB).
- **L3** (Show reasoning): budgeting model, spend-categorisation reasoning ("marked as 'Software' because merchant matched 'AWS'"), invoice-status logic.
- **L4** (SYSTEM): raw Plaid response, AI-credit vendor breakdown, per-run cost telemetry — belongs on SYSTEM → Cost, not on FINANCE.

### 5.2 COMMUNICATION

- **L0**: "3 emails need reply · Next event in 2h · 2 birthdays this week".
- **L1**: the 3 emails as a compact list (from + subject + why-important); the next event with location; the birthdays.
- **L2**: full email preview inline; event detail (attendees, agenda); relationship context per birthday.
- **L3**: why APEX marked email as priority; calendar-conflict reasoning; social-connection strength scoring.
- **L4**: Gmail thread IDs, iCalendar UIDs, contact CRM UUIDs.

### 5.3 BUSINESS

- **L0**: "2 approvals pending · £X revenue this month · N leads in pipeline".
- **L1**: the pending approvals (cost + risk + reversibility); revenue vs. last month; leads with next-step.
- **L2**: full approval plan; per-client stage detail; per-project step trace.
- **L3**: revenue-forecast model; lead-scoring reasoning; project-progress calculation.
- **L4**: task IDs, agent run IDs, CRM record IDs.

### 5.4 HEALTH

- **L0**: "Slept 6.5h · Workout logged · Mood 7/10 · Streak Nd" (one line, current-day-focused).
- **L1**: 7-day trend per signal; today's targets vs actual.
- **L2**: source (wearable device name, manual entry) per data point; historical trend chart.
- **L3**: crisis-detection reasoning; nutrition-target calculation; workout-programming logic.
- **L4**: raw device sync payloads.

### 5.5 UNIVERSITY

- **L0**: "N assignments due in 7 days · M flashcards to review · Next deadline: X".
- **L1**: the N assignments with due dates + module; the M cards with recall difficulty.
- **L2**: assignment brief; per-card SM-2 history.
- **L3**: study-plan reasoning; spaced-repetition schedule logic.
- **L4**: module UUIDs, LMS integration IDs.

### 5.6 RESEARCH

- **L0**: "N searches this week · M pages saved to memory · Currently investigating: X".
- **L1**: recent searches with 1-line summaries; the current investigation with progress.
- **L2**: per-search evidence chain; saved pages with citation.
- **L3**: research-planning reasoning.
- **L4**: raw Firecrawl responses, per-run cost.

### 5.7 OCCULT (Master) — recommended rename to **Esoteric Research**

- **L0**: "Meditation streak Nd · Last entry: X ago · APEX knows K facts across Y esoteric topics".
- **L1**: recent entries; recent sessions; knowledge coverage bar per topic.
- **L2**: full entries; per-topic knowledge summary; per-topic source list.
- **L3**: knowledge-gap reasoning; practice-schedule logic.
- **L4**: N/A — pure user content and shared knowledge.

### 5.8 CIVILISATION (Master)

- **L0**: "Constitutional health: PASS · N consensus sessions pending your review · X capabilities awaiting approval".
- **L1**: the pending sessions with title + summary; the pending capabilities with description.
- **L2**: per-session voting detail; per-capability plan/risk/rollout.
- **L3**: constitutional-gate reasoning; consensus-quorum logic.
- **L4** (default level for this page): genome/contracts raw JSON, domain IDs, session type constants.

### 5.9 REALITY (Master)

- **L0**: "APEX reality model: N verified claims · M contested · K gaps identified · Priority attention: X".
- **L1**: top attention items in human language; top 3 contested claims; top 3 gaps.
- **L2**: per-claim evidence chain; per-gap possible resolutions.
- **L3**: belief-reality-gap reasoning; counterfactual analysis.
- **L4** (default): raw reality-architecture endpoint responses.

---

## SECTION 6: STATE MODEL GAPS

Per V-11-B, every panel must be in one of `ready | loading | stale | empty | failed | offline | forbidden`. Current gaps:

| Page | Panels | `setState` usage |
|---|---|---|
| FINANCE | 16 | 0 |
| COMMUNICATION | 20+ | 0 |
| BUSINESS | 8 | 0 |
| HEALTH | 12 | 0 |
| UNIVERSITY | 8 | 0 |
| RESEARCH | 3 | 0 |
| OCCULT | 8 | 0 |
| CIVILISATION | 6 | 0 |
| REALITY | 12 | 0 |
| **Total** | **~93** | **0** |

**Zero of ~93 LIFE & WORK panels use the V-11-B `setState()` API.**

Specific state-model gaps per page:
- **failed:** Every silent `.catch(function(){})` is a missing `failed` state.
- **stale:** Every polled panel that reads from `cachedFetch` (which respects TTL) does not display a stale badge when the TTL is exceeded and cache is returned.
- **forbidden:** No page differentiates "you cannot see this" from "no data".
- **empty:** Every page has "empty-ish" strings but not the `.apex-empty` semantic class + CTA.

---

## SECTION 7: TRANSPARENCY GAPS

Per V-11 §1.3 Principle 5 ("Evidence is discoverable") and §3 disclosure model:

| Claim on page | Evidence path today | Should be |
|---|---|---|
| "£X net worth" (FINANCE) | None — number appears alone | L2 tap → per-account balances + last-sync timestamp |
| "Balance: —" (COMMUNICATION Attention) | None | L2 tap → why each item is urgent |
| "Active Clients: N" (BUSINESS) | None | L2 tap → per-client stage + last-touch |
| "Sleep 6.5h" (HEALTH) | None | L2 tap → source device + time in bed + interruptions |
| "Modules: N" (UNIVERSITY) | None | L2 tap → per-module credits + provider |
| Search result (RESEARCH) | Title + URL + body | Add "Cite / Save to memory / Confidence" |
| Meditation streak (OCCULT) | None | L2 tap → per-day sessions |
| "Constitutional gate: PASS" (CIVILISATION) | Raw JSON | L2 tap → what was checked, what passed, what failed |
| "Claim: X" (REALITY) | Text + stage badge | L2 tap → sources supporting the claim, counterexamples |

Timestamps: **no LIFE & WORK page shows a "last updated" timestamp on any panel.** V-11-B has `_apexClearStale(panelId, data)` that stores `fetchedAt` — the value is never rendered.

---

## SECTION 8: ACTION AFFORDANCE AUDIT

| Page | Total CTAs | Working handlers | Missing handlers |
|---|---|---|---|
| FINANCE | 5 | 1 (Log expense) | 4 (Create invoice, Scan receipt, Import subs, Top up) |
| COMMUNICATION | 8+ | 3 (Check inbox, Compose, Reply) | 5+ (Sync contacts, Filter actually filtering, per-channel setup, Log SMS, Send WhatsApp) |
| BUSINESS | 7 | 4 (Refresh, Approve, Deny, Add task, Toggle Kanban, Kanban drag) | 3 (Add client, Upload doc, Deny all) |
| HEALTH | 9 | 4 (Log via voice, Log spiritual, Save journal, Save entry, Pomodoro, Flashcards, mood tap) | 5 (Log workout, Log meal, Log fast, Start mindfulness timer, Toggle supplement) |
| UNIVERSITY | 6 | 5 (Pomodoro, Flashcards start/rate/flip, Reset) | 1 (Add book) |
| RESEARCH | 6 | 6 (Search, Scrape, Crawl, Map, Clear, File drop) | 0 |
| OCCULT | 4 | 4 (Log session, Save journal, Toggle reflection, Save reflection) | 0 |
| CIVILISATION | 4 | 3+ (Propose, Refresh, Scan; approve/reject need verification) | 0 |
| REALITY | 3 | 3 (Seed, Refresh, Filter) | 0 |
| **Total** | **~52** | **~33** | **~19** |

**~37% of primary CTAs across LIFE & WORK have no handler.**

Missing action patterns:
- No page has a "next action" surface. The V-11 §7.5 ACTIONS destination expects to source most next-actions, but per-domain pages currently have no L0 "one thing to do next" affordance.
- No page has an "undo" banner (V-11 SD-3 requires 30 s undo).
- No page has consequence-preview cards (V-11 §4.4 approval-card spec: what will happen, why, cost, risk, reversibility). Only Business approvals come close, and even they omit cost/reversibility.

---

## SECTION 9: VISUAL SYSTEM VIOLATIONS

### 9.1 Inline styles

Every one of the 9 pages contains extensive inline `style=""` attributes. Total inline-style attributes in the LIFE & WORK section of the file (lines 6952–9966) is in the **thousands**.

### 9.2 Raw colour literals

Non-token hex values found in LIFE & WORK pages: `#0d1424`, `#5b9eff`, `#8893a0`, `#eaeff5`, `#efb45a`, `#4a5568`, `#3fd29a`, `#ef4444`, `#25d366`, `#1877f2`, `#e1306c`, `#5865f2`, `#0a66c2`, `#22d3ee`, `#f59e0b`, `#818cf8`, `#38bdf8`, `#7c6fff`, `#ec7fa3`, `#06080c`, `#00d4ff`, `#071a2b`, `#100e24`.

All should map to design tokens (`--cyan`, `--amber`, `--green`, `--red`, `--purple`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-mute`, `--text-faint`) that already exist in `:root`.

### 9.3 Typography inconsistencies

- Page titles all use `.ds-page-title` with `letter-spacing:7px` inline — inconsistent with the V-11 spec's typography discipline (Inter for content, Cinzel only for APEX wordmark, JetBrains Mono for L4 technical).
- Section labels use `'JetBrains Mono' 11px letter-spacing 2px #8893a0` in raw form — L4 vocabulary in L1 slot.
- Stat numbers use `font:700 26px/1 'Inter',sans-serif` inline — hardcoded instead of a `.t-stat` class.
- Mono numbers use `t-mono` sometimes and inline `'JetBrains Mono',monospace` other times.

### 9.4 Border, radius, shadow inconsistencies

- Border radius values: `4px`, `6px`, `7px`, `8px`, `10px`, `12px`, `14px`, `16px` — no scale.
- Border colours: `rgba(255,255,255,0.07)`, `rgba(255,255,255,0.05)`, `rgba(255,255,255,0.08)`, `rgba(255,255,255,0.04)`, `var(--border)`, `var(--border-cyan)`, `var(--border-strong)` — mixed.
- No shadow discipline — some panels have `box-shadow:0 8px 32px rgba(0,0,0,.5)` on modals, most have none.

### 9.5 Icon usage

- Unicode glyphs used as icons (`▶`, `⏸`, `↺`, `↻`, `⚡`, `⊛`, `⊕`, `⊹`, `⊘`, `◈`, `◇`, `◑`, `◫`, `◧`, `◎`, `◉`, `⚖`, `▲`, `▼`, `‹`, `›`, `+`, `×`, `⚙`) — no consistency, no fallback for screen readers, some may not render on all fonts.
- Inline SVGs for third-party logos (Gmail, WhatsApp, LinkedIn, Facebook, Instagram, Discord, iCloud, Outlook) — hardcoded in HTML.

---

## SECTION 10: ACCESSIBILITY AUDIT

Total `aria-label` attributes across `dashboard.html`: **39** (in a 20,708-line file with ~93 LIFE & WORK panels).

Per V-11 Principle 3 + Y question:

| Issue | Pages affected |
|---|---|
| Icon-only buttons without accessible name | All 9 pages |
| No `aria-live` on dynamic content | All 9 pages |
| Prompts (`prompt()`) used for data entry | OCCULT, CIVILISATION |
| Modals not `role="dialog"` and without focus trap | COMMUNICATION (compose, quick-reply), UNIVERSITY (flashcard) |
| Kanban drag not keyboard-accessible | BUSINESS |
| Colour-only signals (badges, borders, dots) | FINANCE, COMMUNICATION, BUSINESS, HEALTH — even where V-11 Decision 10 requires dot+label |
| Emoji as functional icons | Mood row (HEALTH), flashcard rating buttons (UNIVERSITY) |
| `<canvas>` charts without text alternative | FINANCE (4 charts), HEALTH (2 charts), OCCULT (mood chart) |
| Focus order after modal close not restored | COMMUNICATION, UNIVERSITY |
| No skip-links for the deep LIFE & WORK page bodies | All 9 pages |
| Colour contrast: `#4a5568` text on `#0d1424` background | COMMUNICATION (many labels) — ~4.5:1 borderline; below WCAG AA for small text |

---

## SECTION 11: MOBILE EXPERIENCE AUDIT

Tested viewports: 375px (iPhone 12 mini), 390px (iPhone 14), 768px (iPad portrait), 1024px+ (desktop).

| Page | 375px | 768px |
|---|---|---|
| FINANCE | Bank card row scrolls horizontally; stat grid overflows; tax row (4 cols) overflows | Charts stack OK; grid collapses |
| COMMUNICATION | Calendar dominates; messaging 3-col overflows; stat 2×2 stacks awkwardly | Renders OK with some density |
| BUSINESS | Kanban horizontal scroll; stat grid overflows | Renders OK |
| HEALTH | 6-stat header overflows; nutrition ring + macros stack awkwardly | Renders OK |
| UNIVERSITY | 3-column top row (ring + modules + assignments) does not gracefully rearrange | Renders OK |
| RESEARCH | Toolbar with 5 buttons + input overflows | Renders OK |
| OCCULT | 4-stat overflows; textareas full-width | Renders OK |
| CIVILISATION | 3-column status overflows; text dense | Renders OK |
| REALITY | 12 stacked panels — very long scroll | Renders OK |

**No page renders correctly at 375px.** The V-11 spec §10.x "Mobile is primary" principle is not upheld on any LIFE & WORK page.

Additional mobile-specific issues:
- Compose modal fixed positioning (`bottom:80px;right:24px`) collides with V-11 bottom tab bar (56px + safe-area inset).
- Native `prompt()` used for data entry — sub-optimal on mobile keyboards.
- `overflow-x:auto` used liberally — horizontal scrolling is discouraged on mobile per Apple HIG.

---

## SECTION 12: PROFILE / AUTHORITY AUDIT

Per V-11-N-DECISIONS-LOCK Part VI (RD-3 / D7 layered access):

### 12.1 Nav-level gating (present)

Master-only sidebar buttons: `#nav-occult`, `#nav-civilisation`, `#nav-reality`, `#nav-agents`, `#nav-approvals`, `#nav-activity`, `#nav-governance`. All gated via CSS `body.apex-role-user .apex-master-only { display: none !important; }` (line 61).

### 12.2 Page-container gating (missing)

The `#page-occult`, `#page-civilisation`, `#page-reality` containers do NOT have `.apex-master-only` class. A User navigating via URL hash `#occult`/`#civilisation`/`#reality` would render the page and trigger fetches. Server-side is expected to enforce, but the client-side defence-in-depth is missing.

### 12.3 Data-scoping gating (unverified from client)

Client-side fetches do not include a `humanId` query parameter or header on any endpoint. `buildApiHeaders()` is called on some but not all endpoints. The client relies on server-side session-scoping. This is correct architecture, but **the client shows no indication when data is being fetched under an assumed identity**.

### 12.4 Layer 3 privacy risks

- **FINANCE:** Serves personal money data. If User loads and endpoints return Master's data, exposure occurs.
- **HEALTH:** Serves personal health data. Same.
- **COMMUNICATION:** Serves entire mailbox. If shared APEX has Master + User inboxes, User cannot see Master's inbox from this page (server-side enforced) but there is no UI indication of "this is your inbox only".
- **BUSINESS approvals list:** Renders `/api/tasks/standing-approvals` for both roles. A User would see approvals they cannot action (server-side rejects).

### 12.5 Master admin flows

The "Emergency access" protocol (V-11-N §6.4) is not implemented anywhere in the UI. If Master needs to view a User's data, there is no UI path.

---

## SECTION 13: DATA / PERFORMANCE AUDIT

### 13.1 Duplicate requests

- `/api/emails` fetched twice per COMMUNICATION load (inbox + attention).
- `/api/life/journal/entries` fetched three times per OCCULT load (entries + sessions + mood extraction — with different `limit=` params) plus once on HEALTH load.
- `/api/life/spiritual/sessions` fetched by HEALTH and OCCULT independently.
- `/api/operations/clients`, `/api/operations/projects` fetched by both BUSINESS and `#page-operation` (duplicate page).
- `/api/life/university/flashcards` fetched by UNIVERSITY init and also by `_onFirstDomainVisit('university', refreshUniversityPanel)` (different endpoint path but same data).

### 13.2 Boot request count

The V-09 baseline was **35 boot requests**. Adding all LIFE & WORK page inits to boot would push this well over 100. Currently these fetches fire only on first `switchPage(name)`, but the domain-visited polling (14819–14823) begins on first visit and continues indefinitely.

### 13.3 Polling inventory

| Interval | Scope | Frequency |
|---|---|---|
| refreshFast | boot strip | 15s |
| refreshSlow | boot strip | (line 14294) |
| pollTaskNotifications | globally | 30s |
| pollPermissions | globally | 30s |
| refreshTimelinePanel | globally | 30s |
| refreshRoadmapPanel | globally | 60s |
| refreshMetrics | globally | 60s |
| refreshRecentRuns | globally | 45s |
| refreshLessons | globally | 120s |
| operation domain group | if visited | 60s |
| health domain group | if visited | 60s |
| health psychology | if visited | 120s |
| university | if visited | 120s |
| communication contacts | if visited | 90s |
| refreshExpenses (multiple) | ~= 55s |
| Cost refresh | 120s |
| Task notification polling | 30s |

**Roughly ~15 concurrent intervals** running once first-visit gates open.

### 13.4 WebSocket opportunities

Current WS scope (from earlier certification docs) is notifications + system events. LIFE & WORK could benefit from real-time push for:
- New email arrival (COMMUNICATION)
- Calendar event add/change (COMMUNICATION)
- New task / approval-required (BUSINESS, ACTIONS)
- Financial transaction (FINANCE)
- Health-metric wearable sync (HEALTH)
- New research result / knowledge extraction (RESEARCH)
- Consensus session state change (CIVILISATION)
- New claim / meta-model change (REALITY)

Each of these would eliminate 30–120 s polling latency.

---

## SECTION 14: EMPTY / ERROR / STALE STATE AUDIT

Per V-11 Principle 3 ("Blank is prohibited") every panel is always in a named state. Current audit:

| State | Correctly used | Incorrectly used |
|---|---|---|
| loading | Skeleton pattern used, but 4+ skeleton variants across pages | 0 |
| empty | Bespoke strings per panel | Most conflate "empty" with "not configured" |
| failed | Bespoke or silent | Most silent |
| stale | Not implemented | 0 |
| forbidden | Not implemented | 0 |
| offline | Handled at global level | Not per-panel |
| partial | Not implemented (V-11 spec §4.4 requires it) | 0 |
| healthy | Positive states like "Inbox clear" exist inconsistently | 0 |

Specific gaps:
- FINANCE "Plaid not connected" is hardcoded — never flips to "connected" state even if Plaid connects.
- COMMUNICATION messaging cards permanently show "SETUP"/"OFF" — no configuration flow.
- HEALTH crisis panel shows "loading" then "unavailable" on error — no third state for "stable".
- REALITY panels never show "seed data not present — click Seed" — user must guess.

---

## SECTION 15: IMPLEMENTATION PLAN

Ranked V-11-F packages. Each independent unless noted.

### F-1 — LIFE & WORK Universal L0 Summary Row (P0)

**Priority:** P0
**Affected pages:** all 9
**Files:** `public/dashboard.html` only
**Responsibility:** Add a `.apex-lw-l0` header block below the page title on every LIFE & WORK page. Content is a one-sentence human summary per §5 mapping. Empty state is a specific "APEX cannot see X yet — [action]" sentence, not `—`.
**Risk:** LOW — additive HTML/CSS, no behaviour change.
**UX effect:** Every page immediately answers its canonical question at first glance. Passes the 5-second test.
**Performance:** No new fetches — L0 uses existing summary data or a small aggregation endpoint (see F-11).
**Regression surface:** V-11-D1/D2 (page routing) — must not affect switchPage.
**Test requirements:** New Playwright suite `playwright-v11f-verify.js` — assertion: each page has `[data-l0]` element with non-empty text within 2 s.
**Backend authorisation required:** NO for placeholder L0 (client-derived). YES for aggregated L0 (see F-11).

### F-2 — Universal `setState()` Rollout Across LIFE & WORK (P0)

**Priority:** P0
**Affected pages:** all 9
**Files:** `public/dashboard.html` only
**Responsibility:** Replace every bespoke loading/empty/error `innerHTML` write in `fetchFinanceData`, `fetchBizCrm`, `fetchBizProjects`, `fetchBizTasks`, `fetchBizApprovals`, `fetchHealthSleep`, `fetchHealthSupplements`, `fetchSpiritualSessions`, `fetchHealthMetrics`, `fetchHealthStudySessions`, `fetchUniModules`, `fetchUniAssignments`, `fetchUniFlashcards`, `fetchUniReadingList`, `fetchCommsEmails`, `populateNetworkAttention`, `fetchOccEntries`, `fetchOccSessions`, `fetchOccMood`, `fetchOccCrisisCheck`, `fetchOccHabits`, `civRefresh`, `expLoad`, and every `/api/reality*` loader with `setState(el, 'loading|ready|empty|failed', payload)` per V-11-B API.
**Risk:** MEDIUM — high-touch (30+ functions) but each change is surgical.
**UX effect:** Consistent loading indicators, honest error surfaces with retry, semantic empty states with CTAs. Passes V-11 Principle 3 + 4.
**Performance:** Neutral.
**Regression surface:** V-11-B state suite (29 tests); LIFE & WORK visual regression.
**Test requirements:** New Playwright assertions per page: force fetch failure (mock 500) — verify `.apex-panel-error` renders with `.apex-panel-retry` link.
**Backend authorisation required:** NO.

### F-3 — Master-Only Page-Container Gating (P0 — privacy defence-in-depth)

**Priority:** P0
**Affected pages:** OCCULT, CIVILISATION, REALITY (also AGENTS, APPROVALS, ACTIVITY, GOVERNANCE — check scope)
**Files:** `public/dashboard.html` only
**Responsibility:** Add `.apex-master-only` class to `#page-occult`, `#page-civilisation`, `#page-reality` containers. Modify `switchPage` to no-op (or redirect to TODAY) when target is Master-only AND `body.apex-role-user` is present.
**Risk:** LOW.
**UX effect:** Prevents User seeing Master-only page shells via hash navigation.
**Performance:** Neutral.
**Regression surface:** V-11-A/D1/D2 nav suites.
**Test requirements:** As User, navigate to `#reality` — assert TODAY renders instead. As Master, same URL — assert REALITY renders.
**Backend authorisation required:** NO (client-side gating). Server-side enforcement is a separate concern (see F-13).

### F-4 — Remove Internal Vocabulary from LIFE & WORK Headers (P0)

**Priority:** P0
**Affected pages:** all 9
**Files:** `public/dashboard.html` only
**Responsibility:** Remove "FIN · FINANCE AGENT", "NET · COMMUNICATIONS", "BIZ · BUSINESS AGENT", "HLTH · HEALTH AGENT", "UNI · UNIVERSITY AGENT", "OCC · MINDFULNESS", "RES · RESEARCH ENGINE", "CONSTITUTIONAL GATE", "RA · REALITY ARCHITECTURE" from page headers. Replace with the destination name only. Move internal agent-code display to SYSTEM → Agents (V-11 §7.6).
**Risk:** LOW — cosmetic removal.
**UX effect:** Removes L4 vocabulary from L0/L1 slots per V-11 §1.3 Principle 12.
**Performance:** Neutral.
**Regression surface:** None significant.
**Test requirements:** Playwright: assert page-header text does not contain "AGENT", "ENGINE", "GATE" on any LIFE & WORK page.
**Backend authorisation required:** NO.

### F-5 — Silent-Catch Elimination on LIFE & WORK (P0)

**Priority:** P0
**Affected pages:** FINANCE, COMMUNICATION, BUSINESS, HEALTH, UNIVERSITY, OCCULT, CIVILISATION, REALITY
**Files:** `public/dashboard.html` only
**Responsibility:** Every `.catch(function(){})` in the JS handlers must become `.catch(function(err){ setState(el, 'failed', { message: humanMsg, retryFn: 'fnName()' }); })`. Covers `fetchFinanceData` cost-summary catch, all Occult catches, all Reality catches, `civRefresh` catches, `fetchBizCrm` catch, `fetchHealthMetrics` catch, `fetchSpiritualSessions` catch, `fetchOccMood` catch, `fetchOccEntries` catch, etc.
**Risk:** LOW.
**UX effect:** Users see honest failure messages with retry. V-11 Principle 4.
**Performance:** Neutral.
**Regression surface:** V-11-B state suite.
**Test requirements:** Force each endpoint to 500 — assert error surface renders with retry.
**Backend authorisation required:** NO.

### F-6 — Occult Rename + Content Relocation (P0)

**Priority:** P0
**Affected pages:** OCCULT (page itself and its cross-referenced HEALTH duplicates)
**Files:** `public/dashboard.html` only
**Responsibility:** Rename OCCULT → "Esoteric Research" per V-11 Decision 5. Remove journal + spiritual sessions + mood + habits from `#page-occult` (they belong on the Personal tab per Decision 5 which currently maps to Health). Restructure `#page-occult` to answer the canonical Master question: knowledge coverage across esoteric topics + gaps. If knowledge sources for esoteric topics do not exist, empty state should say so honestly.
**Risk:** MEDIUM — content deletion. Coordinated with HEALTH page (F-15).
**UX effect:** Fixes fundamental product-purpose mismatch.
**Performance:** Fewer duplicate fetches.
**Regression surface:** Any existing tests targeting `#page-occult` panels — will need update.
**Test requirements:** Occult renders with new title + new panels; journal/mood/etc no longer present.
**Backend authorisation required:** NO for rename. YES if a new "esoteric knowledge coverage" endpoint is authored.

### F-7 — Business + Operation Page Merge (P1)

**Priority:** P1
**Affected pages:** BUSINESS, OPERATION (`#page-operation` — duplicate)
**Files:** `public/dashboard.html` only
**Responsibility:** Delete `#page-operation` HTML and its JS init (line 7571, 14508, 14528, 14556, 14579, 15275, 15291, 15305, 15319 handlers). Merge Documents + Proposals panels into BUSINESS. Nav sidebar removes "Operation" entry.
**Risk:** MEDIUM — Ops has its own polling loop (line 14819) and cache paths. Must not break navigation.
**UX effect:** Removes duplicate page confusion.
**Performance:** ~4 redundant fetches removed.
**Regression surface:** V-11-A nav; any test hitting `#page-operation`.
**Test requirements:** Business page shows Documents + Proposals. `#page-operation` no longer exists. `#nav-operation` no longer exists.
**Backend authorisation required:** NO.

### F-8 — Aria + Keyboard Access Pass on LIFE & WORK (P1)

**Priority:** P1
**Affected pages:** all 9
**Files:** `public/dashboard.html` only
**Responsibility:** Add `aria-label` to every icon-only button, `aria-live="polite"` to dynamic panels, `role="dialog"` + focus trap to Compose, Quick Reply, Flashcard modals. Add keyboard equivalent to Kanban drag (up/down arrows to move card between columns).
**Risk:** MEDIUM — focus trap semantics can break existing keyboard flows if not tested.
**UX effect:** Screen-reader users can navigate LIFE & WORK. Keyboard users can drag cards.
**Performance:** Neutral.
**Regression surface:** Existing keyboard shortcuts (1–9 map at line 14777 — note these are the LEGACY 1–9 keys, superseded by V-11-D2 which maps 1–6 to primary destinations; a keybinding collision exists — see Open Decision 3).
**Test requirements:** axe-core assertions per page; tab order verification.
**Backend authorisation required:** NO.

### F-9 — Inline-Style / Token Purge on LIFE & WORK (P1)

**Priority:** P1
**Affected pages:** all 9
**Files:** `public/dashboard.html` only
**Responsibility:** Replace inline `style="…"` blocks containing hex colours with token references (`var(--cyan)` etc.). Extract repeated patterns to classes (`.lw-page-header`, `.lw-stat-card`, `.lw-panel`). Preserve exact visual output.
**Risk:** MEDIUM-HIGH — high volume of changes; visual regression risk.
**UX effect:** Neutral immediately; enables future theming.
**Performance:** Slight HTML size reduction.
**Regression surface:** Visual regression across every page.
**Test requirements:** Playwright screenshot comparison per page at 375/768/1280px.
**Backend authorisation required:** NO.

### F-10 — Mobile Layout Fixes on LIFE & WORK (P1)

**Priority:** P1
**Affected pages:** all 9
**Files:** `public/dashboard.html` only
**Responsibility:** Add `@media (max-width: 767px)` rules to collapse: 4-stat grids to 2×2, 6-stat grid to 2×3, 3-col rows to 1-col, messaging 3-col to 1-col, Kanban to vertical stack. Ensure compose/quick-reply modals respect bottom-tab-bar height (56px + safe-area-inset-bottom).
**Risk:** MEDIUM — CSS breakpoint interaction with existing rules at 900/1099/1023.
**UX effect:** LIFE & WORK usable on mobile per V-11 §10 "Mobile is primary".
**Performance:** Neutral.
**Regression surface:** V-11-A/D1/D2 mobile assertions.
**Test requirements:** Playwright at 375px per page — no horizontal overflow, all CTAs reachable.
**Backend authorisation required:** NO.

### F-11 — LIFE & WORK Aggregation Endpoint (P1) — backend authorisation

**Priority:** P1
**Affected pages:** all 9
**Files:** `public/dashboard.html` (client) + NEW `routes/domains.js` (backend, per CLAUDE.md route-collision rule)
**Responsibility:** New endpoint `GET /api/domains/summary` returning `{ finance: {…l0…}, communication: {…l0…}, business: {…l0…}, health: {…l0…}, university: {…l0…}, research: {…l0…}, occult?: {…l0…}, civilisation?: {…l0…}, reality?: {…l0…} }` — role-filtered on server. Client uses this to populate L0 rows in F-1 without per-page fetch fan-out.
**Risk:** MEDIUM — backend addition + server-side role filtering.
**UX effect:** Instant L0 on every page.
**Performance:** ~9 endpoint fan-out reduced to 1 request. Aligns with V-11 Decision 6 (TODAY aggregation).
**Regression surface:** All existing per-domain endpoints remain.
**Test requirements:** Playwright: page load < 1200 ms with L0 populated.
**Backend authorisation required:** **YES.** New route file; requires Master authorisation per CONSTITUTION and CLAUDE.md "no new backend routes without approval".

### F-12 — Confidence Dot + Label Rollout (P2)

**Priority:** P2
**Affected pages:** all 9 (where data has confidence)
**Files:** `public/dashboard.html` only
**Responsibility:** Add `.apex-confidence` component (cyan/blue/amber/orange/red/grey dot + one-word label + optional tooltip) per V-11 Decision 10. Apply to Research results, Reality claims, Business approvals, Health crisis-check, Occult crisis-check.
**Risk:** LOW.
**UX effect:** Trust surface per V-11 §1.3 Principle 8.
**Performance:** Neutral.
**Regression surface:** None.
**Test requirements:** Assert `.apex-confidence` renders for each qualifying data type.
**Backend authorisation required:** NO for placeholder confidence values. If real confidence flows through endpoints, those endpoints must be extended (separate authorisation).

### F-13 — Server-side Role-Enforcement Verification (P2) — backend authorisation

**Priority:** P2
**Affected pages:** OCCULT, CIVILISATION, REALITY endpoints
**Files:** Route files (backend) — separate authorisation
**Responsibility:** Verify (and if missing, add) middleware on `/api/civilisation/*`, `/api/reality*`, `/api/expansion/*` that returns 403 for `req.user.role !== 'master'`. Client already gates at nav + F-3 gates at page container; server-side is defence-in-depth.
**Risk:** MEDIUM — must not break Master flows.
**UX effect:** Neutral to User (never had access). Master unaffected.
**Performance:** Neutral.
**Regression surface:** All Master-only page test suites.
**Test requirements:** As User, curl `/api/reality/health` — assert 403. As Master, assert 200.
**Backend authorisation required:** **YES.**

### F-14 — Progressive Disclosure Skeleton (P2)

**Priority:** P2
**Affected pages:** all 9
**Files:** `public/dashboard.html` only
**Responsibility:** Wrap panel content in `<details>`-like expander pattern using V-11 `.apex-expand` class (author if not present). Panel headers become tappable to expand L1. "Show evidence" link within L1 expands L2.
**Risk:** MEDIUM — interaction pattern change.
**UX effect:** Depth on demand per V-11 §3.
**Performance:** Neutral.
**Regression surface:** V-11-E COMMAND card expand pattern — must remain compatible.
**Test requirements:** Per page, tap panel header — L1 renders; tap "Show evidence" — L2 renders; Escape collapses.
**Backend authorisation required:** NO.

### F-15 — Health / Occult Content De-duplication (P2)

**Priority:** P2
**Affected pages:** HEALTH, OCCULT
**Files:** `public/dashboard.html` only
**Responsibility:** Journal + spiritual sessions + mood chart + habit tracker exist on both HEALTH and OCCULT with independent fetches. Consolidate the underlying data into a single fetch (or use F-11 aggregation) and share DOM via the Personal tab structure per V-11 Decision 5.
**Risk:** MEDIUM — cross-page state sharing.
**UX effect:** Consistent journal experience.
**Performance:** Halves fetches for these endpoints.
**Regression surface:** F-6 (Occult content relocation).
**Test requirements:** Save entry on Health — appears on Personal (if merged).
**Backend authorisation required:** NO.

### F-16 — Consistent Empty-State CTA Pattern (P3)

**Priority:** P3
**Affected pages:** all 9
**Files:** `public/dashboard.html` only
**Responsibility:** Every empty state uses `setState(el, 'empty', { message: '…', ctaLabel: '…', ctaFn: '…' })`. Establishes a canonical empty-state pattern.
**Risk:** LOW.
**UX effect:** Every "no data yet" has an action.
**Performance:** Neutral.
**Regression surface:** V-11-B state suite.
**Test requirements:** Per page, force empty response — assert CTA renders.
**Backend authorisation required:** NO.

### F-17 — Icon Standardisation (P3)

**Priority:** P3
**Affected pages:** all 9
**Files:** `public/dashboard.html` only
**Responsibility:** Replace ad-hoc unicode glyphs with a small icon set (SVG symbols with `<use>`). Ensures screen-reader and font consistency.
**Risk:** LOW.
**UX effect:** Visual consistency.
**Performance:** Slight size reduction on inline glyphs.
**Regression surface:** Visual.
**Test requirements:** Icon set renders on major browsers.
**Backend authorisation required:** NO.

### F-18 — WebSocket-driven LIFE & WORK Push (P3) — backend authorisation

**Priority:** P3
**Affected pages:** all 9 (opportunistic)
**Files:** `public/dashboard.html` (client) + `server.js` WS scope extension
**Responsibility:** Extend WS event surface with `email:new`, `calendar:changed`, `task:created`, `finance:tx`, `health:sync`, `research:result`, `claim:new`, `session:updated`. Client subscribes per active page and refreshes relevant panel.
**Risk:** MEDIUM — WS scope change.
**UX effect:** Real-time feel across LIFE & WORK.
**Performance:** Reduces polling.
**Regression surface:** V-11-A WS scope tests.
**Test requirements:** Fire WS event — panel updates without page refresh.
**Backend authorisation required:** **YES.**

---

## SECTION 16: BACKEND CHANGES REQUIRING SEPARATE AUTHORISATION

Total: **3 packages require backend authorisation.**

1. **F-11 — LIFE & WORK Aggregation Endpoint (`GET /api/domains/summary`).** New route file `routes/domains.js`. Role-filtered aggregation. Follows V-11 Decision 6 pattern for `/api/now/summary`.
2. **F-13 — Server-side Role-Enforcement on Master-only Endpoints.** Middleware audit + addition on `/api/civilisation/*`, `/api/reality*`, `/api/expansion/*`.
3. **F-18 — WebSocket Event Surface Extension.** New WS event types + fanout in `server.js`.

No other backend change is proposed by V-11-F. All frontend packages (F-1 to F-10, F-12, F-14 to F-17) touch `public/dashboard.html` only.

---

## SECTION 17: OPEN PRODUCT DECISIONS

The following decisions require owner input before implementation:

1. **Occult page purpose (F-6).** The V-11-N canonical question for OCCULT (Master) is "What does APEX know about this specialised knowledge domain and what remains uncertain?" — a knowledge surface. But no "esoteric knowledge coverage" data source exists today. Options:
   - (a) Rename to Esoteric Research + build a real knowledge surface backed by memory + shared knowledge tables filtered by category.
   - (b) Retain personal-practice content (journal, sessions, mood, habits) but rename the page to Personal Practice.
   - (c) Delete the page entirely and move contents to Personal tab per V-11 Decision 5.

2. **Business + Operation merge (F-7).** V-11-DESIGN-DECISIONS.md SD-4 divides Finance (money) and Business (operations). But currently there are two pages doing the same thing. Options:
   - (a) Delete `#page-operation` and merge into Business.
   - (b) Keep both but scope Operation to internal ops-agent view (Master-only).
   - (c) Rename Operation to something distinct.

3. **Keyboard shortcuts collision (F-8).** Legacy binding at line 14777 maps `1–9 + 0` to old pages (command/overview/operation/system/communication/finance/business/university/health/occult). V-11-D2 maps `1–6` to primary destinations. Both bindings currently exist. Options:
   - (a) Remove legacy binding entirely.
   - (b) Move legacy binding under a modifier (e.g. `Alt+1`).
   - (c) Retain both.

4. **Master emergency-access UI (V-11-N §6.4).** Not implemented anywhere. Should V-11-F introduce this UI, or defer to a later phase?

5. **CIVILISATION / REALITY page product intent.** These pages currently expose raw system state. V-11 §7.6 says they belong under SYSTEM → Advanced. Options:
   - (a) Move both to SYSTEM → Advanced sub-pages (per V-11 migration map §6.4 — spec already assigns them there).
   - (b) Keep as top-level LIFE & WORK entries but rewrite as human-readable summaries.
   - (c) Retain current form (rejected by V-11 spec).

---

## SECTION 18: VERIFICATION

- Application code changed by this reconnaissance: **NONE.**
- Files modified: `docs/interface/V-11-F-PRE-IMPLEMENTATION-RECONNAISSANCE.md` (this document) — new file, no existing content overwritten.
- `public/dashboard.html`: unchanged. Last modification is per V-11-E certification (2026-09-01).
- Backend files: unchanged.
- No `git add`, `git commit`, `git push`.
- No `npm run build`, no deployment.
- Production remains at the V-09 baseline referenced by V-11-E (dd1dd1f).
- Playwright suites not run.

---

*End of V-11-F Pre-Implementation Reconnaissance.*
*Application code changed: NONE.*
*Production changed: NO.*
