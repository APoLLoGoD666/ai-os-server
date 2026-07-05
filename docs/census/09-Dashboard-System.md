# 09 — Dashboard System

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only.

---

## Dashboard Files

| File | Location | Size | Purpose |
|------|----------|------|---------|
| `dashboard.html` | `public/dashboard.html` | Unknown | Primary UI (main interface) |
| `dashboard.html` (root) | `Scripts/` root | Duplicate/symlink? | Copy at root — UNKNOWN relationship |
| `dashboard.html` (reference) | `apex-assistant-reference/dashboard.html` | Unknown | Earlier implementation |
| `apex-v2.css` | `public/apex-v2.css` | 57.1 KB | Main dashboard stylesheet |
| `apex-custom.css` | `public/apex-custom.css` | 101 B | Custom overrides |
| `apex-v2.css` (root) | `Scripts/apex-v2.css` | 57.1 KB | Root copy |
| `apex-custom.css` (root) | `Scripts/apex-custom.css` | 101 B | Root copy |
| `editor.html` | `public/editor.html` | Unknown | Editor UI |
| `editor.html` (root) | `Scripts/editor.html` | 4.5 KB | Root copy |
| `sw.js` | `public/sw.js` | Unknown | Service worker (PWA) |
| `manifest.json` | `public/manifest.json` | Unknown | PWA manifest |
| `manifest.json` (root) | `Scripts/manifest.json` | 1.1 KB | Root copy |
| `apex-audit.html` | `Scripts/` root | 78.0 KB | Audit dashboard |
| `apex-electron.js` | `public/apex-electron.js` | Unknown | Electron app wrapper |

**Note:** Files exist at both `Scripts/` root and `Scripts/public/`. This duplication was directly observed.

---

## Interface Concept Screenshots (`Projects/Interface/`)

17 PNG design mockups showing the intended interface layout:

| File | Domain |
|------|--------|
| `Browser.png` | Browser control |
| `Business.png` | Business domain |
| `Command.png` | Voice/command interface |
| `Communication 1.png` | Communications |
| `Communication 2.png` | Communications alt |
| `Finance 1.png` | Finance domain |
| `Finance 2.png` | Finance alt |
| `Health 1.png` | Health domain |
| `Health 2.png` | Health alt |
| `Occult.png` | Spiritual/occult section |
| `Operations 1.png` | Operations domain |
| `Operations 2.png` | Operations alt |
| `Overview.png` | Main overview |
| `Research.png` | Research section |
| `Side Bar.png` | Navigation sidebar |
| `System.png` | System section |
| `University.png` | University section |

---

## Vault Domain Dashboards

Each vault domain has a `Dashboard.md` entry:

| Domain | File |
|--------|------|
| Projects | `02 Projects/Dashboard.md` |
| Clients | `03 Clients/Dashboard.md` |
| University | `04 University/Dashboard.md` |
| Finance | `05 Finance/Dashboard.md` |
| Health | `06 Health/Dashboard.md` |
| Relationships | `07 Relationships/Dashboard.md` |
| Operations | `08 Operations/Dashboard.md` |
| Agents | `11 Agents/Dashboard.md` |
| Memory | `12 Memory/Dashboard.md` |
| Briefings | `13 Briefings/Dashboard.md` |
| Executive | `01 Executive/Dashboard.md` |

---

## PlasmaOrb Component

**Location:** `src/components/orb/PlasmaOrb.js`

Purpose: UNKNOWN. A visual component with no discovered parent integration. Likely a future UI element or experimental visual. No import relationships confirmed.

---

## Telemetry Route

**Location:** `src/routes/telemetry/index.js`

A separate telemetry API route. Relationship to `routes/` and `server.js` mounting — UNKNOWN.

---

## Civilization Health Dashboard

**Spec:** `APEX AI OS/00 Foundation/civilization-health-dashboard.md`  
**Runtime:** `lib/intelligence/civilization-health-engine.js`  
**Route:** `routes/civilization.js`

---

## Executive Dashboard

**File:** `APEX AI OS/01 Executive/Dashboard.md`  
**Control Center:** `APEX AI OS/01 Executive/Control-Center.md`  
**VaultHealth:** `APEX AI OS/01 Executive/VaultHealth.md`

---

## Audit Dashboard

**File:** `Scripts/apex-audit.html` (78.0 KB)

Large HTML file at root. Purpose: system audit visualisation. 

---

## PWA Features

| Component | Status |
|-----------|--------|
| Service worker (`sw.js`) | Present |
| Web manifest | Present |
| Push notifications | Active (`routes/pwa.js`, `migrations/049_pwa_subscriptions.sql`) |
| VAPID key | Generated (`scripts/gen-vapid.js`) |
| `web-push ^3.6.7` | Installed |

---

## Live Dashboard Telemetry Sources

From route discovery:
- `routes/cognitive.js` — cognitive state panels
- `routes/cognitive-eval.js` — evaluation metrics
- `routes/civilization.js` — civilization cycle
- `routes/executive-performance.js` — executive KPIs
- `routes/governance.js` — governance health
- `routes/intelligence.js` — intelligence metrics
- `routes/memory.js` — memory state
- `routes/observatory.js` — system observatory

---

## Dashboard Unknowns

| Unknown | Note |
|---------|------|
| dashboard.html contents | Not read — 57 KB+ file |
| Duplicate dashboard at root vs public/ | Relationship unclear |
| PlasmaOrb.js integration | No import found |
| src/ directory purpose | Only 3 files found — isolated |
| Electron app status | `apex-electron.js` present; `electron` in devDependencies; not confirmed packaged |
| apex-audit.html consumers | 78 KB file — purpose partially inferred |
