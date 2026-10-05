# V-11-D1 — TODAY + Canonical Navigation Semantics
## Implementation Certification

**Date:** 2026-09-01  
**Suite:** V-11-D1 Playwright · 45 tests  
**Result:** 45 PASS / 0 FAIL  

---

## Scope

V-11-D1 transforms the Overview page into the canonical TODAY surface and updates navigation labels. No default boot page change (D2 scope).

---

## Changes Applied

### Navigation labels (`dashboard.html`)
- `#nav-overview .nav-label` → `"Today"`
- `#nav-intelligence .nav-label` → `"Intelligence"`

### pageMeta (`dashboard.html`)
- `overview: { title:'Today', sub:'What matters now' }`

### TODAY surface (`dashboard.html`)
- `<style>` block with D1 CSS injected **after** APEX MIND `</script>` (required: APEX MIND does `page.innerHTML=` which destroys pre-script DOM children)
- `<div id="today-surface">` injected after the `<style>` block
- `<div id="ovr-pipeline" style="display:none">` stub preserved for backward compatibility
- `#apx-wrap { display:none!important }` hides APEX MIND on the TODAY surface (governance architecture preserved, hidden per authorization)

### JavaScript (`dashboard.html` main script)
- `_tdEsc(s)` — XSS-safe string escaper
- `_tdNeedsItems(inbox)` — priority items from inbox data
- `_tdNeedsHtml(item)` — renders single `td-item` div
- `_tdInsights(brief)` — builds insight rows (weekNet=0 suppressed)
- `async initOverviewPage()` — fetches both briefing routes in parallel, applies setState (loading/ready/empty/failed) to all three panels
- switchPage wrapper calling `initOverviewPage()` on `'overview'`
- 120s auto-refresh interval

---

## Test Coverage (A–P)

| Section | Tests | Result |
|---------|-------|--------|
| A — Navigation labels | 2 | ✓ PASS |
| B — pageMeta topbar | 2 | ✓ PASS |
| C — TODAY surface structure | 6 | ✓ PASS |
| D — Populated state | 6 | ✓ PASS |
| E — Max 3 Needs You | 1 | ✓ PASS |
| F — Empty states | 4 | ✓ PASS |
| G — Failed states | 3 | ✓ PASS |
| H — Governance preserved | 2 | ✓ PASS |
| I — Briefing routes called | 2 | ✓ PASS |
| J — No duplicate calls | 2 | ✓ PASS |
| K — User role | 6 | ✓ PASS |
| L — Master role | 3 | ✓ PASS |
| M — All 20 pages reachable | 1 | ✓ PASS |
| N — Command page regression | 2 | ✓ PASS |
| O — Responsive (1280/390px) | 2 | ✓ PASS |
| P — No JS errors | 1 | ✓ PASS |
| **Total** | **45** | **45/45** |

---

## Regression

- **V-11-B:** 29/29 PASS
- **V-11-D1 includes briefing route coverage** (I, J sections) covering V-11-C routes

---

## Known Diagnosis

Root cause of `#today-surface` DOM issue: APEX MIND inline script sets `page.innerHTML = '...'` (line ~8625) which destroys all pre-script children of `page-overview`. Fix: `<style>` and `#today-surface` are placed AFTER the APEX MIND `</script>` so the HTML parser appends them after script execution.

---

## Authorization Compliance

- ✓ "Overview" → "Today", "Intel" → "Intelligence"
- ✓ pageMeta updated
- ✓ V-11-B setState used for all panels
- ✓ Max 3 Needs You items enforced
- ✓ Positive empty state message
- ✓ Failed/degraded graceful handling
- ✓ No new backend routes
- ✓ Governance content kept hidden (not deleted)
- ✓ Default boot page unchanged (D2 scope)
- ✓ Responsive at 375–1660px
- ✓ No push, no deploy
