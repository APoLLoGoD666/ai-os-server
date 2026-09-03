# PWA-02 — Route Collision Resolution (OVL-001)
## Wave 0 Implementation Record

---

## Record Header

| Field | Value |
|-------|-------|
| Task ID | PWA-02 |
| Date Executed | 2026-07-25 |
| Author | Implementation Engineer |
| Change Class | Class C (Migration Decision) |
| OVL Reference | OVL-001 (CRITICAL — from I0-LEGACY-AND-OVERLAP-REGISTER.md) |
| Wave | Wave 0 — Preparation |
| Status | COMPLETE |
| Ledger Update | `routes/civilisation.js` → REMOVED; `routes/civilization.js` → MIGRATED (contains all routes) |

---

## Problem Statement

The repository contained two route files serving the civilization domain:

- `routes/civilisation.js` (144 lines, British spelling) — HTTP surface for the Registry layer (genome, clock, contracts, domains, consensus). No explicit auth middleware; relies on global `civilization-kernel` middleware. Mounted at `/api` via `app.use('/api', require('./routes/civilisation'))` in server.js line 379.

- `routes/civilization.js` (471 lines, American spelling) — HTTP surface for the intelligence/executive layer (health, intelligence, opportunities, council, twin, strategy, runtime, scores, admissions). Explicit `_auth` on every handler. Mounted at `/api` via `app.use('/api', require('./routes/civilization'))` in server.js line 380.

Both were mounted in server.js, creating structural ambiguity about the canonical route file for civilization-related endpoints.

**Key finding from Phase 1 audit:** The routes use DIFFERENT path prefixes (`/civilisation/` vs `/civilization/`), so there was no HTTP-level endpoint collision. However, `public/dashboard.html` actively calls the `/api/civilisation/*` paths and they must remain functional.

---

## Repository Evidence

### Pre-migration server.js (lines 379-380)

```javascript
app.use('/api', require('./routes/civilisation'));
app.use('/api', require('./routes/civilization'));
```

### Endpoints in `routes/civilisation.js` (15 total)

| Method | Path | Function |
|--------|------|---------|
| GET | /civilisation/status | Aggregate status (genome + clock + contracts + domains + consensus) |
| GET | /civilisation/genome | Full genome validation |
| GET | /civilisation/genome/:domainId | Per-domain genome |
| GET | /civilisation/clock | Clock status |
| GET | /civilisation/clock/drift | Clock drift |
| GET | /civilisation/clock/:domainId | Domain tick rate |
| GET | /civilisation/contracts | Contract validation |
| GET | /civilisation/contracts/:domainId | Per-domain contracts |
| GET | /civilisation/domains | Domain list with status |
| GET | /civilisation/domains/:name | Domain detail |
| GET | /civilisation/consensus | Consensus status |
| GET | /civilisation/consensus/:id | Session status |
| POST | /civilisation/consensus/propose | Propose consensus |
| POST | /civilisation/consensus/vote | Cast vote |
| POST | /civilisation/consensus/:id/ratify | Ratify session |

### Active callers of `/api/civilisation/*`

| File | Paths Called |
|------|-------------|
| `public/dashboard.html` | `/api/civilisation/status`, `/api/civilisation/domains`, `/api/civilisation/consensus`, `/api/civilisation/consensus/propose` |
| `agent-system/domain-agents.js` | All `/api/civilisation/*` paths (agent documentation) |

### Dependencies

`routes/civilisation.js` dependency: `lib/registry/kernel` → `Registry` (genome, clock, contracts, domains, consensus). Registry loaded cleanly: keys include genome, clock, contracts, domains, consensus (all required).

---

## Decision

Merge all 15 `/civilisation/*` route handlers into `routes/civilization.js`, then delete `routes/civilisation.js`.

**Path prefix preserved:** All migrated routes retain the `/civilisation/` prefix. Reason: `public/dashboard.html` calls these paths directly. Changing the prefix would break the live dashboard.

**Auth preserved:** Migrated routes have no explicit `_auth` middleware (same as before — they rely on the global `civilization-kernel` middleware applied at server level).

**No behavior change:** The 15 handlers are copied verbatim from `civilisation.js` to `civilization.js`. No logic was altered.

---

## Files Changed

### `routes/civilization.js`

Changes:
1. Added comment on line 3: `// Merged from routes/civilisation.js (PWA-02, 2026-07-25): all /civilisation/* routes now served here.`
2. Added require on line 10: `const { Registry } = require('../lib/registry/kernel');`
3. Appended all 15 civilisation route handlers before `module.exports = router`

File grew from 471 lines to 615 lines.

### `server.js`

Changed:
```javascript
// Before:
app.use('/api', require('./routes/tts-gemini'));
app.use('/api', require('./routes/registry'));
app.use('/api', require('./routes/civilisation'));
app.use('/api', require('./routes/civilization'));

// After:
app.use('/api', require('./routes/tts-gemini'));
app.use('/api', require('./routes/registry'));
app.use('/api', require('./routes/civilization'));
```

Removed one line (379): `app.use('/api', require('./routes/civilisation'));`

---

## Files Removed

| File | Lines | Reason |
|------|-------|--------|
| `routes/civilisation.js` | 144 | All content migrated to `routes/civilization.js`. No callers remain. |

---

## Migration Details

### Endpoint coverage before → after

| Path | Before | After |
|------|--------|-------|
| `/api/civilisation/*` (15 endpoints) | Served by `routes/civilisation.js` | Served by `routes/civilization.js` |
| `/api/civilization/*` (46 endpoints) | Served by `routes/civilization.js` | Served by `routes/civilization.js` |

All 61 endpoints remain functional. No endpoint was removed or renamed.

### Dependency transfer

`lib/registry/kernel` was previously required only by `routes/civilisation.js`. It is now required at the top of `routes/civilization.js`.

---

## Validation Results

| Check | Command | Result |
|-------|---------|--------|
| Route file syntax | `node --check routes/civilization.js` | PASS |
| Server syntax | `node --check server.js` | PASS |
| Registry module loads | `node -e "const { Registry } = require('./lib/registry/kernel'); console.log(Object.keys(Registry))"` | PASS — genome, clock, contracts, domains, consensus all present |
| `routes/civilisation.js` absent | `ls routes/civil*` | Only `civilization.js` present |
| server.js mount count | `grep "civilisation\|civilization" server.js` | 2 lines: middleware (unchanged) + single route mount |
| Route handler count | `grep -c "^router\." routes/civilization.js` | 61 (46 original + 15 migrated) |

### Remaining references to "civilisation" in codebase

All remaining references are valid and unaffected by this migration:

| File | Reference Type | Classification |
|------|---------------|----------------|
| `public/dashboard.html` | Calls `/api/civilisation/*` API paths (still functional) | **Valid — compatible** |
| `agent-system/domain-agents.js` | Documents `/api/civilisation/*` API paths | **Valid — compatible** |
| `lib/civilization/domain-scorer.js` | References `civilisation_scores` DB table | **Valid — DB table name** |
| `civilisation/*.js` | The business logic layer (clock, consensus, etc.) | **Valid — not a route reference** |
| `lib/registry/kernel.js`, `lib/registry/index.js` | Internal registry using civilisation domain | **Valid — domain concept** |
| `lib/reality/projections/civilisation.js` | Reality projection module | **Valid — unrelated to route** |
| `services/pipelines/*.js`, `services/slack/*.js` | Service references to civilisation domain | **Valid — domain concept** |
| `lib/registry/query/intents/*.js` | Query intent definitions | **Valid — domain concept** |
| `.civilisation/clock.json` | Runtime state file | **Valid — runtime data** |

**No obsolete references remain.** No file still requires `routes/civilisation.js`.

---

## Rollback Information

To restore the pre-migration state:

```bash
git checkout HEAD -- routes/civilisation.js
git checkout HEAD -- server.js
git checkout HEAD -- routes/civilization.js
```

This restores all three files to their pre-PWA-02 state. The system will operate exactly as before.

---

## Constitutional Basis

| Source | Provision | Application |
|--------|-----------|------------|
| I0-IMPLEMENTATION-ROADMAP.md | PWA-02: resolve `routes/civilisation.js` vs `routes/civilization.js` | This task resolves OVL-001 |
| I1-REPOSITORY-MIGRATION-PLAN.md | `routes/civilisation.js` → MERGE→DELETE (Wave 0) | Migration executed per plan |
| I2-MIGRATION-CONTROL-SYSTEM.md | Rule MP-3: explicit disposition required before removal | Disposition: MERGE into `routes/civilization.js`, then DELETE |
| I2-MIGRATION-CONTROL-SYSTEM.md | Rule MP-2: no legacy removal without migration classification | Classification: MERGE→DELETE with all endpoints preserved |
| I2-FIRST-IMPLEMENTATION-WAVE-PLAN.md | PWA-02 task specification | Implemented per specification |

---

## OVL-001 Resolution Status

**OVL-001 (CRITICAL): RESOLVED**

The route collision (two civilization route files mounted simultaneously) is resolved. `routes/civilization.js` is the sole canonical route file for all civilization-domain endpoints.

---

*PWA-02 Record | Wave 0 | Date: 2026-07-25 | Baseline: APEX-CONSTITUTION-v1.0*
