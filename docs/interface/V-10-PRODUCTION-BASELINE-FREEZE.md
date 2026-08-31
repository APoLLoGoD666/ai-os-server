# V-10 PRODUCTION BASELINE FREEZE
# PRE-V-10 IMMUTABLE REFERENCE — READ-ONLY RECONNAISSANCE

**Date:** 2026-08-31  
**Authority:** APEX Performance — V-10 Pre-Authorisation  
**Phase:** Reconnaissance only — no source changes  
**Status:** FROZEN — all metrics captured from live production  
**Baseline commit:** `1d3f17e` (docs cert) / application baseline `dd1dd1f` (V-09 code)

---

## 0. Purpose

This document freezes the production state of `https://apex-ai-os-cos.uk` at the completion of V-09, before any V-10 work begins. All data was gathered READ-ONLY. No source files were modified.

---

## 1. Git State

| Item | Value |
|------|-------|
| HEAD | `1d3f17e` — docs: add V-09 production deployment certification |
| origin/main | `1d3f17e` — in sync |
| Application code baseline | `dd1dd1f` — V-09 implementation (all 4 patches) |
| Working tree | Unstaged: `architecture/index.yaml` (modification) |
| Untracked | `docs/interface/V-05-*.md`, `docs/interface/V-06-*.md`, `public/dashboard.html.bak`, `playwright-v09-baseline.js`, `playwright-prod-verify.js` |
| Code changes | **None** — no source file modifications since last commit |

### Recent commit log (origin/main)

```
1d3f17e  docs: add V-09 production deployment certification
dd1dd1f  feat: V-09 — contextual-card dynamic DCL injection, cost-summary cachedFetch, health hook fix
5a6687f  feat: V-08 — PlasmaOrb dynamic injection, boot API deferral, Chart.js defer, contextual-card defer
...
```

**Rollback target if V-10 requires revert:** `5a6687f` (V-08 certified, pre-V-09 code)

---

## 2. Production Health at Freeze

**Endpoint:** `GET /health`  
**Verified:** 2026-08-31

| Field | Value |
|-------|-------|
| status | ok |
| version | 1d3f17e |
| db | true (connected) |
| heapMb | 154 |
| warning | true (non-fatal, pre-existing) |
| uptime | running |

---

## 3. Functional API Baseline

All routes verified via authenticated requests (`x-app-key` header). Status at freeze:

### 3a. Primary data endpoints — all 200

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /api/tasks | 200 | ok |
| GET /api/emails | 200 | ok |
| GET /api/finance/summary | 200 | ok |
| GET /api/expenses | 200 | ok |
| GET /api/subscriptions | 200 | ok |
| GET /api/health/sleep | 200 | ok |
| GET /api/workouts | 200 | ok |
| GET /api/contacts | 200 | ok |
| GET /api/operations/clients | 200 | ok |
| GET /api/operations/projects | 200 | ok |
| GET /api/operations/documents | 200 | ok |
| GET /api/operations/proposals | 200 | ok |
| GET /api/agent-runs | 200 | ok |
| GET /api/intelligence/cost-summary | 200 | ok |
| GET /api/notifications | 200 | ok |
| GET /api/memory | 200 | ok |
| GET /api/journal | 200 | ok |
| GET /api/events | 200 | ok |
| GET /api/occult/tarot | 200 | ok |
| GET /api/timeline | 200 | ok |

### 3b. Auth enforcement — 401 on unauthenticated requests

Verified: unauthenticated requests to all API routes return 401. Auth middleware intact.

### 3c. Known defects at freeze (pre-existing, not introduced by V-09)

| Endpoint | Status | Root Cause | Introduced |
|----------|--------|------------|------------|
| GET /api/intelligence/opportunities | 500 | `evidence_refs` column missing in DB schema | Pre-V-09 |

This defect is NOT a V-09 regression. Excluded from V-10 scope unless explicitly authorised.

---

## 4. Performance Baseline

### 4a. Local (localhost:3000) — 3-run Playwright medians (V-09 post-patch)

Measurement: `playwright-v09-baseline.js` — 3 runs, cold cache, x-app-key auth, 12s observation window.

| Metric | Run 1 | Run 2 | Run 3 | Median |
|--------|-------|-------|-------|--------|
| TTFB (ms) | 46.25 | 45.94 | 46.63 | 46.25 |
| FCP (ms) | 408.51 | 393.90 | 374.45 | 393.90 |
| DOM Interactive (ms) | 1,103.44 | 1,043.91 | 1,046.62 | 1,046.62 |
| DCL (ms) | 1,957.37 | 1,248.98 | 1,249.38 | 1,249.38 |
| LCP (ms) | N/A | N/A | N/A | N/A |
| Load Event (ms) | 2,007.98 | 1,271.91 | 1,286.42 | 1,271.91 |
| Requests 1s | 14 | 14 | 14 | 14 |
| Requests 3s | 30 | 27 | 28 | 28 |
| Requests 5s | 34 | 33 | 33 | 33 |
| Requests 10s | 35 | 35 | 35 | 35 |
| Requests total (12s) | 37 | 35 | 35 | 35 |
| Dupe groups | 3 | 3 | 3 | 3 |
| Long tasks | 6 | 7 | 7 | 7 |
| LT total (ms) | ~1,850 | ~620 | ~630 | ~630 |

**Note on Run 1:** DCL of 1,957ms is an outlier — apex-custom.css loaded at +2,940ms (transient server delay). Runs 2 and 3 are representative; **working medians: DCL 1,249ms, FCP 393ms.**

**V-09 achievement vs targets:**

| Metric | V-08 Baseline | V-09 Target | V-09 Result | Status |
|--------|---------------|-------------|-------------|--------|
| DCL | 1,638ms | ≤1,400ms | **1,249ms** | ✅ BEAT |
| FCP | 440ms | ≥440ms (no regression) | **394ms** | ✅ IMPROVED |
| Boot requests | 37 | no regression | **35** | ✅ |

### 4b. Production (https://apex-ai-os-cos.uk) — Playwright browser verification

Two production Playwright runs (single-run; not median):

| Metric | Run A | Run B | Notes |
|--------|-------|-------|-------|
| TTFB | 318ms | 272ms | Network RTT to Render UK |
| FCP | 1,587ms | 1,632ms | |
| DCL | 2,276ms | 4,276ms | High variance: PlasmaOrb GPU/WebGL eval (known: 141–6,916ms) |
| Boot requests (10s) | 35 | 35 | ✅ Consistent |
| Dupe groups | 3 | 3 | ✅ Consistent |

**Reliable production metrics:** boot requests=35, dupe groups=3. DCL variance is intrinsic to PlasmaOrb GPU evaluation and not a regression signal.

### 4c. Residual duplicate request groups at freeze

| URL | Count | Classification |
|-----|-------|----------------|
| `/api/emails` | 2x | Cold-boot TTL race — deduped from T+60s+ |
| `/api/finance/summary` | 2x | Cold-boot TTL race — deduped from T+60s+ |
| `/api/tasks` | 2x | Cold-boot TTL race — deduped from T+60s+ |

These 3 dupe groups are the known residual from V-07-05 scope. They are pre-existing cold-boot races, not new regressions.

---

## 5. Visual and Responsive Baseline

Verified via Playwright browser test (`playwright-prod-verify.js`) against production.

### 5a. Navigation smoke test — all 20 pages

| Page | Result |
|------|--------|
| command | OK |
| overview | OK |
| chat | OK |
| tasks | OK |
| emails | OK |
| notifications | OK |
| finance | OK |
| health | OK |
| communications | OK |
| university | OK |
| intelligence | OK |
| master | OK |
| system | OK |
| memory | OK |
| journal | OK |
| reality | OK |
| business | OK |
| occult | OK |
| spiritual | OK |
| timeline | OK |

All 20 pages navigable — no ReferenceError, TypeError, or "Cannot read" in DOM.

### 5b. Responsive viewport checks

| Width | Result |
|-------|--------|
| 375px | OK — no overflow |
| 390px | OK — no overflow |
| 480px | OK — no overflow |
| 640px | OK — no overflow |
| 768px | OK — no overflow |
| 900px | OK — no overflow |
| 1024px | OK — no overflow |
| 1280px | OK — no overflow |
| 1440px | OK — no overflow |
| 1660px | OK — no overflow |

All 10 viewports clean. No horizontal overflow at any breakpoint.

### 5c. WebSocket

| Check | Result |
|-------|--------|
| WS readyState | 1 (OPEN) |
| WS connected event | true |

WebSocket connected at production.

---

## 6. Console Error Baseline

4 console errors observed in production (both Playwright runs). All pre-existing, non-critical:

| Error | Classification |
|-------|---------------|
| favicon.ico 404 | Pre-existing — favicon missing, cosmetic only |
| Mixed content / third-party warnings | Pre-existing — CDN/external resource warnings |

No new errors introduced by V-09.

---

## 7. Known Defect Register at V-09 Close

| ID | Endpoint / Component | Symptom | Root Cause | V-10 Scope |
|----|---------------------|---------|------------|------------|
| D-01 | `/api/intelligence/opportunities` | 500 Internal Server Error | `evidence_refs` column missing in DB schema | Out of scope unless authorised |
| D-02 | PlasmaOrb.js GPU eval | DCL variance 2,276–4,276ms production | WebGL init time variable by GPU state | Known — PlasmaOrb loaded dynamically post-DCL (working correctly) |
| D-03 | Boot duplicate requests | 3 dupe groups (emails, finance/summary, tasks) | Cold-boot TTL race on first-interval fire | Pre-existing — V-07-05 partial fix in effect |

---

## 8. Cumulative Performance Trajectory (V-06 → V-09)

| Version | DCL (ms) | FCP (ms) | Boot Requests (10s) | Dupe Groups |
|---------|----------|----------|---------------------|-------------|
| V-06 baseline | ~5,500 | ~600 | ~60+ | 10+ |
| V-07 certified | ~3,548 | 528 | 46 | ~6 |
| V-08 certified | 1,638 | 440 | 37 | 4 |
| **V-09 certified** | **1,249** | **394** | **35** | **3** |

---

## 9. Files Modified Since V-08

`public/dashboard.html` — 4 surgical patches:

1. **Health hook fix** — `refreshSleepPanel()` + `refreshWorkoutGrid()` added to health `_onFirstDomainVisit` callback
2. **V-09-01** — `_loadContextualCard()` dynamic post-DCL injection via `DOMContentLoaded` event listener; `<script defer>` tag replaced with HTML comment
3. **V-09-02a** — `fetchCommandProgress()`: raw `fetch('/api/intelligence/cost-summary')` → `cachedFetch('/api/intelligence/cost-summary', 60000)`
4. **V-09-02b** — `fetchCommandUpdates()`: same cost-summary raw fetch → `cachedFetch`

No other files modified.

---

## 10. Pre-V-10 Authorisation Checklist

Before V-10 begins, confirm:

- [ ] This freeze document committed to `docs/interface/`
- [ ] V-10 scope document created and reviewed
- [ ] V-10 reconnaissance baseline run (separate session)
- [ ] Explicit authorisation for V-10 targets and constraints
- [ ] No code changes before authorisation received

---

**FREEZE COMPLETE**

*Recorded: 2026-08-31*  
*Production state at freeze: `1d3f17e` / app code `dd1dd1f`*  
*Reconnaissance only — zero source file changes*  
*V-10: NOT STARTED*
