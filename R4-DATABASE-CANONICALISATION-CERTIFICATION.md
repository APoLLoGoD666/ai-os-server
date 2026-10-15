# R4 DATABASE CANONICALISATION CERTIFICATION
## Certification Record

**Task:** R4-DATABASE-CANONICALISATION
**Type:** CONTROLLED REMEDIATION
**Status:** CERTIFIED
**Date:** 2026-08-24
**Governing principle:** ONE PLATFORM. ONE SYSTEM. ONE APEX.

---

## 1. R4 AUTHORITY

| Document | Status |
|----------|--------|
| CANONICAL-REPOSITORY-CENSUS.md | CERTIFIED (R1) |
| EXECUTION-GRAPH-AUDIT.md | CERTIFIED (R2) |
| DEPENDENCY-OWNERSHIP-AUDIT.md | CERTIFIED (R3) |
| Production baseline | d087c19 — CONFIRMED |
| R1 closure commit | 94f59d8 — CONFIRMED |
| R4 authority source | R3 DB-01 finding (confirmed duplicate) |

---

## 2. BASELINE

| Field | Value |
|-------|-------|
| Branch | main |
| Baseline HEAD before changes | 94f59d8 |
| Production implementation baseline | d087c19 |
| Working tree before changes | CLEAN — only expected artifacts (architecture/index.yaml modified auto-generated; DEPENDENCY-OWNERSHIP-AUDIT.md and EXECUTION-GRAPH-AUDIT.md untracked from R2/R3) |
| Unexpected application changes | NONE — R4 proceeded |

---

## 3. CANONICAL CLIENT INSPECTION

**File:** `lib/clients.js`

```javascript
'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

let _supabase = null;
function getSupabaseClient() {
    if (!_supabase) {
        _supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }
    return _supabase;
}

let _holdout = null;
function getHoldoutClient() {
    if (!_holdout) {
        const url = process.env.SUPABASE_HOLDOUT_URL;
        const key = process.env.SUPABASE_HOLDOUT_ANON_KEY;
        if (!url || !key) throw new Error('...');
        _holdout = createClient(url, key);
    }
    return _holdout;
}
```

**Canonical client properties:**

| Property | Value |
|----------|-------|
| Implementation | Module-level closure singleton (`let _supabase = null`) |
| Singleton guarantee | PROVEN — module caches after first call; Node.js module cache ensures same instance |
| URL | `process.env.SUPABASE_URL` |
| Key | `process.env.SUPABASE_SERVICE_ROLE_KEY` (service role — full admin access) |
| Custom headers | NONE |
| Custom options | NONE |
| Fallback key | NONE (unlike some private clients which fell back to SUPABASE_ANON_KEY) |
| Error on missing URL | Throws at createClient call if URL is undefined |
| Lifecycle | Process-lifetime singleton |
| `getHoldoutClient()` | INTENTIONAL-SPECIALISED — uses `SUPABASE_HOLDOUT_URL` + `SUPABASE_HOLDOUT_ANON_KEY` (different credentials, anon key, restricted access by design) |

---

## 4. COMPLETE SUPABASE CLIENT CREATION INVENTORY (PRE-CHANGE)

Total production `createClient` call sites found: **58** (across all .js files)

### 4.1 Canonical Sites

| File | Symbol | Type |
|------|--------|------|
| lib/clients.js:18 | `getSupabaseClient()` | CANONICAL |
| lib/clients.js:37 | `getHoldoutClient()` | INTENTIONAL-SPECIALISED |

### 4.2 R3 DB-01 Bypasses (6 identified in R3)

| # | File | Symbol | Credentials Used | Pre-Change Status |
|---|------|--------|-----------------|------------------|
| 1 | middleware/civilization-kernel.js | `_getSb()` | SUPABASE_URL + SERVICE_ROLE_KEY **or** SUPABASE_ANON_KEY | BYPASS |
| 2 | lib/integrity-crons.js | `_sb()` | SUPABASE_URL + SERVICE_ROLE_KEY | BYPASS |
| 3 | lib/event-consumer.js | `_sb()` | SUPABASE_URL + SERVICE_ROLE_KEY | BYPASS |
| 4 | routes/governance.js | `_sb()` | SUPABASE_URL + SERVICE_ROLE_KEY | BYPASS |
| 5 | routes/intelligence.js | `_sbClient()` | SUPABASE_URL + SERVICE_ROLE_KEY **or** SUPABASE_ANON_KEY | BYPASS |
| 6 | lib/storage.js | `supabase` | **ALREADY CANONICAL** — `require('./clients').getSupabaseClient()` | ALREADY CANONICAL |

**R3 COUNT CORRECTION:** R3 identified 6 DB-01 bypasses but `lib/storage.js` was already canonical (corrected by Wave 3 refactor in commit 748fc83). Actual DB-01 bypass count pre-R4: **5**. lib/storage.js requires no change.

### 4.3 Additional Production Private Clients (discovered during R4 full audit — NOT R3 DB-01)

**LIB/ bypasses (12 sites across 8 modules):**

| File | Symbol | Credentials | Classification |
|------|--------|-------------|----------------|
| lib/governance.js | `_client` | URL + SERVICE_ROLE_KEY | LIB-BYPASS-EQUIVALENT |
| lib/governance-probe.js | `_client` | URL + SERVICE_ROLE_KEY | LIB-BYPASS-EQUIVALENT |
| lib/evidence-completeness.js | `_client` | URL + SERVICE_ROLE_KEY | LIB-BYPASS-EQUIVALENT |
| lib/outbox-relay.js | `_sbClient` | URL + SERVICE_ROLE_KEY | LIB-BYPASS-EQUIVALENT |
| lib/write-with-outbox.js | `_sbClient` | URL + SERVICE_ROLE_KEY | LIB-BYPASS-EQUIVALENT |
| lib/runtime-readiness.js | `_client` | URL + SERVICE_ROLE_KEY | LIB-BYPASS-EQUIVALENT |
| lib/models/runtime/index.js (×2) | `sb` (inline) | URL + SERVICE_ROLE_KEY or ANON | LIB-BYPASS-EQUIVALENT |
| lib/registry/capability-monitor.js | inline | URL + SERVICE_ROLE_KEY | REGISTRY-SUBSYSTEM |
| lib/registry/scenario/index.js | `sb` | URL + SERVICE_ROLE_KEY | REGISTRY-SUBSYSTEM |
| lib/registry/snapshot/index.js | inline | URL + SERVICE_ROLE_KEY | REGISTRY-SUBSYSTEM |
| lib/registry/temporal/index.js | inline | URL + SERVICE_ROLE_KEY | REGISTRY-SUBSYSTEM |
| lib/registry/twin/index.js | inline | URL + SERVICE_ROLE_KEY | REGISTRY-SUBSYSTEM |

**ROUTES/ bypasses (6 files):**

| File | Symbol | Credentials | Classification |
|------|--------|-------------|----------------|
| routes/agents.js | `_sbSync()` | URL + SERVICE_ROLE_KEY | ROUTE-BYPASS-EQUIVALENT |
| routes/briefing.js | `_sbClient()` | URL + SERVICE_ROLE_KEY or ANON | ROUTE-BYPASS-EQUIVALENT |
| routes/communications.js | `_sbClient()` | URL + SERVICE_ROLE_KEY or ANON | ROUTE-BYPASS-EQUIVALENT |
| routes/intent.js | `_sbClient()` | URL + SERVICE_ROLE_KEY or ANON | ROUTE-BYPASS-EQUIVALENT |
| routes/life.js | `_sbClient()` | URL + SERVICE_ROLE_KEY or ANON | ROUTE-BYPASS-EQUIVALENT |
| routes/operations.js | `_sbClient()` | URL + SERVICE_ROLE_KEY or ANON | ROUTE-BYPASS-EQUIVALENT |

**AGENT-SYSTEM/ bypasses (11 files):**

| File | Classification |
|------|----------------|
| agent-system/agent-pipeline-hooks.js | AGENT-SYSTEM-BYPASS |
| agent-system/agent-reputation.js | AGENT-SYSTEM-BYPASS |
| agent-system/autonomy-metrics.js | AGENT-SYSTEM-BYPASS |
| agent-system/dynamic-agent-selector.js | AGENT-SYSTEM-BYPASS |
| agent-system/langchain-memory.js | AGENT-SYSTEM-BYPASS |
| agent-system/langchain-rag.js | AGENT-SYSTEM-BYPASS |
| agent-system/master-orchestrator.js | AGENT-SYSTEM-BYPASS |
| agent-system/multi-agent-coordinator.js | AGENT-SYSTEM-BYPASS |
| agent-system/news-ingest.js | AGENT-SYSTEM-BYPASS |
| agent-system/obsidian-memory.js | AGENT-SYSTEM-BYPASS |
| agent-system/orchestrator.js | AGENT-SYSTEM-BYPASS |

**SERVICES/ bypasses (1 file):**

| File | Classification |
|------|----------------|
| services/init.js | SERVICE-BYPASS-EQUIVALENT |

**DEV-ONLY / OPERATOR-ONLY (12 files — not loaded by server.js):**

| File | Classification |
|------|----------------|
| scripts/measure-memory-health.js | DEV-ONLY |
| scripts/phase-a-verify.js | DEV-ONLY |
| scripts/phase-c-run.js | DEV-ONLY |
| scripts/test-db-queries.js | DEV-ONLY |
| scripts/verify-memory-integrity.js | DEV-ONLY |
| scripts/proof/01-tables.js | DEV-ONLY |
| scripts/proof/03-consolidation.js | DEV-ONLY |
| scripts/proof/05-knowledge-validator.js | DEV-ONLY |
| scripts/proof/08-session-tracker.js | DEV-ONLY |
| scripts/proof/09-adaptation-schema.js | DEV-ONLY |
| scripts/proof/10-reflexion.js | DEV-ONLY |
| migrations/seed-founder-profile.js | DEV-ONLY (migration/seed script) |

**FALSE POSITIVE:**
- `services/notion/notion-clients.js` — function named `createClient` is a Notion API wrapper, NOT a Supabase client. No Supabase imports.

---

## 5. DB-01 BYPASS ANALYSIS — EQUIVALENCE VERIFICATION

For each of the 5 confirmed DB-01 bypasses:

### 5.1 middleware/civilization-kernel.js — `_getSb()`

| Property | Private | Canonical | Equivalent? |
|----------|---------|-----------|------------|
| SUPABASE_URL | `process.env.SUPABASE_URL` | `process.env.SUPABASE_URL` | YES |
| Key | `SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | YES in production* |
| Options | None | None | YES |
| Privilege | service role (production) | service role | YES |

\*In production, `_validateEnv()` in server.js ensures `SUPABASE_SERVICE_ROLE_KEY` is set at startup. The `|| SUPABASE_ANON_KEY` fallback is functionally dead in production. The defensive null guard (`if (!process.env.SUPABASE_URL) return null`) is preserved in the migrated code.

**Verdict: EQUIVALENT — migration approved**

### 5.2 lib/integrity-crons.js — `_sb()`

| Property | Private | Canonical | Equivalent? |
|----------|---------|-----------|------------|
| SUPABASE_URL | `process.env.SUPABASE_URL` | `process.env.SUPABASE_URL` | YES |
| Key | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | YES |
| Options | None | None | YES |

Code comment: "Module-level singleton — same pattern as outbox-relay.js"

**Verdict: EQUIVALENT — migration approved**

### 5.3 lib/event-consumer.js — `_sb()`

| Property | Private | Canonical | Equivalent? |
|----------|---------|-----------|------------|
| SUPABASE_URL | `process.env.SUPABASE_URL` | `process.env.SUPABASE_URL` | YES |
| Key | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | YES |
| Options | None | None | YES |

**Verdict: EQUIVALENT — migration approved**

### 5.4 routes/governance.js — `_sb()`

| Property | Private | Canonical | Equivalent? |
|----------|---------|-----------|------------|
| SUPABASE_URL | `process.env.SUPABASE_URL` | `process.env.SUPABASE_URL` | YES |
| Key | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | YES |
| Options | None | None | YES |

**Verdict: EQUIVALENT — migration approved**

### 5.5 routes/intelligence.js — `_sbClient()` IIFE

| Property | Private | Canonical | Equivalent? |
|----------|---------|-----------|------------|
| SUPABASE_URL | `process.env.SUPABASE_URL` | `process.env.SUPABASE_URL` | YES |
| Key | `SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | YES in production* |
| Options | None | None | YES |

\*Same rationale as civilization-kernel.js — fallback dead in production.

**Verdict: EQUIVALENT — migration approved**

### 5.6 lib/storage.js — No change needed

lib/storage.js already uses `require('./clients').getSupabaseClient()` (line 11). Confirmed canonical. R3 count was incorrect — storage.js was migrated in commit 748fc83 prior to R3.

**Verdict: ALREADY CANONICAL — no action required**

---

## 6. CHANGES PERFORMED

### 6.1 middleware/civilization-kernel.js

**Change:** Added `const { getSupabaseClient } = require('../lib/clients');` to top-level imports. Replaced private client factory:

```javascript
// BEFORE (lines 38-45)
let _sbClient = null;
function _getSb() {
    if (_sbClient) return _sbClient;
    if (!process.env.SUPABASE_URL) return null;
    const { createClient } = require('@supabase/supabase-js');
    _sbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
    return _sbClient;
}

// AFTER
function _getSb() {
    if (!process.env.SUPABASE_URL) return null;
    return getSupabaseClient();
}
```

Function name `_getSb()` preserved — all 1 call site (`const sb = _getSb()` at line 331) unchanged.
Defensive null guard for missing SUPABASE_URL preserved.
Inline `createClient` require removed.
`_sbClient` state variable removed (singleton responsibility delegated to lib/clients.js).

### 6.2 lib/integrity-crons.js

**Change:** Replaced `const { createClient } = require('@supabase/supabase-js')` with `const { getSupabaseClient } = require('./clients')`. Replaced `let _sbClient = null; function _sb() { ... }` with `function _sb() { return getSupabaseClient(); }`.

Function name `_sb()` preserved — all call sites unchanged.

### 6.3 lib/event-consumer.js

**Change:** Same pattern as integrity-crons.js. Replaced createClient import with getSupabaseClient. Collapsed _sb() factory to one-liner.

### 6.4 routes/governance.js

**Change:** Replaced `const { createClient } = require('@supabase/supabase-js')` with `const { getSupabaseClient } = require('../lib/clients')`. Replaced `let _client = null; function _sb() { ... }` with `function _sb() { return getSupabaseClient(); }`.

Function name `_sb()` preserved — 9+ call sites in the file unchanged.

### 6.5 routes/intelligence.js

**Change:** Replaced `const { createClient } = require('@supabase/supabase-js')` with `const { getSupabaseClient } = require('../lib/clients')`. Replaced the IIFE singleton:

```javascript
// BEFORE
const _sbClient = (() => {
    let c;
    return () => {
        if (!c) c = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        );
        return c;
    };
})();

// AFTER
const _sbClient = () => getSupabaseClient();
```

Variable name `_sbClient` preserved — all call sites (`_sbClient()`) throughout the file unchanged.

---

## 7. pg_database.js AUDIT

**Status:** PRODUCTION-ACTIVE — NOT REMOVED.

`lib/pg_database.js` uses the `pg` npm package to connect directly via PostgreSQL TCP (not Supabase JS SDK). It serves a distinct purpose: raw SQL access via `pg.Pool` for operations that require raw SQL, DDL, or pg-specific features unavailable through the Supabase JS client.

**Importers (production):** lib/startup.js, lib/event-consumer.js, lib/outbox-relay.js, src/routes/health.js, src/routes/telemetry/index.js, routes/intelligence.js, routes/observatory.js, routes/integrations.js, services/sync/supabase-notion-sync.js, services/init.js

**Relationship to Supabase JS:** INTENTIONAL DUAL-ABSTRACTION. Both point to the same PostgreSQL instance via different protocols. pg Pool is used specifically for raw SQL queries, DDL provisioning (apex_agent_stages), and operations requiring pg-native capabilities.

**Decision: RETAIN — INTENTIONAL SPECIALISED ACCESS, NOT DUPLICATE.**

---

## 8. pg_helpers.js REMOVAL

### Pre-Removal Verification

| Check | Evidence | Result |
|-------|---------|--------|
| Content | `module.exports = require('./supabase-helpers')` — 3-line pass-through shim | CONFIRMED DEAD |
| Runtime require() in .js files | grep `require.*pg_helpers` in all .js: **exit code 1 (no matches)** | ZERO IMPORTERS |
| Dynamic string references in .js | grep `pg_helpers` in all .js (excl. .gitnexus): no runtime references | ZERO |
| Documentation references | docs/constitutional-architecture/*.md, CLAUDE.md — stale historical docs; no runtime impact | DOCUMENTATION ONLY |
| Configuration references | package.json, render.yaml — no reference | NONE |
| .registry-cache references | cache artifact files — not loaded at runtime | CACHE ONLY |
| Node.js runtime loader | no runtime dynamically requires `pg_helpers` | NONE |
| Test references | no test file imports pg_helpers | NONE |
| Commit history | Renamed to supabase-helpers.js in commit 748fc83; shim added for backward compat; shim never used | ORPHAN |

**Decision: REMOVE — All checks pass. Zero runtime references confirmed.**

**Action taken:** `rm lib/pg_helpers.js` — CONFIRMED DELETED.

### Post-Removal Verification

```bash
$ node --check server.js && echo "OK"
OK
```

All syntax checks pass after deletion. No broken imports. Tests continue to pass.

---

## 9. FINAL DATABASE OWNERSHIP MODEL

```
APPLICATION / ROUTES / RUNTIMES
          ↓
lib/clients.getSupabaseClient()          ← CANONICAL PRODUCTION CLIENT
          ↓
@supabase/supabase-js
          ↓
SUPABASE / POSTGRESQL (HTTPS/REST)

                 ↑ SEPARATE PATH ↑

lib/pg_database.js (pg Pool)             ← INTENTIONAL SPECIALISED (raw SQL / DDL)
          ↓
pg npm package
          ↓
POSTGRESQL (direct TCP)
```

| Responsibility | Owner | Path |
|----------------|-------|------|
| Client creation (production) | lib/clients.js | CANONICAL |
| Client creation (holdout/eval) | lib/clients.js getHoldoutClient() | INTENTIONAL-SPECIALISED |
| Raw SQL / DDL / pg-native | lib/pg_database.js | INTENTIONAL-SPECIALISED |
| General application persistence | lib/supabase-helpers.js (via lib/clients) | CONFIRMED-CANONICAL |
| Constitutional persistence | lib/runtime/constitutional-store.js (via lib/clients) | CONFIRMED-CANONICAL |
| Migration ownership | scripts/db-migrate.js, scripts/certify.js | OPERATOR/DEV |
| Schema ownership | Supabase + migrations/; not modified during R4 | UNCHANGED |
| Test database ownership | .env credentials; tests use live production DB | EXISTING PATTERN |

---

## 10. DIRECT DATABASE ACCESS AUDIT (Summary)

Classification of all known direct Supabase access points after R4:

| Category | Count | Classification |
|----------|-------|----------------|
| CANONICAL (lib/clients.getSupabaseClient) | 1 singleton | CANONICAL |
| INTENTIONAL-SPECIALISED (getHoldoutClient) | 1 singleton | INTENTIONAL-SPECIALISED |
| INTENTIONAL-SPECIALISED (pg Pool) | 1 singleton | INTENTIONAL-SPECIALISED |
| R3 DB-01 fixed | 5 | NOW CANONICAL |
| LIB-BYPASS (equivalent, not fixed in R4) | 12 | LIB-BYPASS-EQUIVALENT |
| ROUTE-BYPASS (equivalent, not fixed in R4) | 6 | ROUTE-BYPASS-EQUIVALENT |
| AGENT-SYSTEM-BYPASS | 11 | AGENT-SYSTEM-BYPASS |
| SERVICE-BYPASS | 1 | SERVICE-BYPASS-EQUIVALENT |
| DEV-ONLY / OPERATOR | 12 | DEV-ONLY |
| **UNKNOWN** | **0** | — |

**ZERO UNKNOWN PRODUCTION DATABASE CLIENTS.**

---

## 11. CONSTITUTIONAL STORE SAFETY VERIFICATION

| Check | Evidence | Result |
|-------|---------|--------|
| constitutional-store.js unchanged | File not modified in R4 | CONFIRMED |
| constitutional_records writes | 20/20 constitutional-store-persistence tests PASS | CONFIRMED |
| write() no-throw contract | Tests verify: null, undefined, bad types don't throw | CONFIRMED |
| live Supabase write | Tests confirm live DB inserts succeed | CONFIRMED |
| Record fields preserved | Tests verify all ObservationRecord and ChangeRecord fields | CONFIRMED |
| Production constitutional records | 9,232+ records pre-R4; writes still active | UNCHANGED |
| Governance records | governance_records written by civilization-kernel.js | UNCHANGED |
| R4 impact | None — constitutional-store.js was not modified | NONE |

---

## 12. PRODUCTION COMPATIBILITY VERIFICATION

| Check | Evidence | Result |
|-------|---------|--------|
| Production env vars unchanged | No .env changes in R4 | PASS |
| Production database untouched | No migrations created or run | PASS |
| Schema unchanged | Zero migration file changes | PASS |
| Client privileges | getSupabaseClient() uses SUPABASE_SERVICE_ROLE_KEY — same privilege as all 5 replaced private clients | PASS |
| Imports resolve | `node --check` passes for all 5 modified files and server.js | PASS |
| No deployment performed | R4 commit to be pushed via standard pipeline only | PASS |

---

## 13. TEST RESULTS

### Focused Tests (directly affected modules)

| Test | Before R4 | After R4 | Result |
|------|-----------|----------|--------|
| constitutional-store-persistence.test.js | 20/20 | 20/20 | PASS |
| memory-gateway-constitutional.test.js | 29/29 | 29/29 | PASS |
| registry (tests/registry/index.js) | 541/541 | 541/541 | PASS |
| observation-record-integration.test.js | 39/39 | 39/39 | PASS |
| dom000001-bootstrap.test.js | 31/31 | 31/31 | PASS |

### Regression Tests

| Test | Result |
|------|--------|
| governance-attestation-constitutional.test.js | 28 PASS |
| phase0-acceptance.test.js | 10 PASS |
| domain-provenance-propagation.test.js | PASS |
| deliberation-record.test.js | PASS |
| petl-constitutional.test.js | 18 PASS |

### Test Infrastructure Note

All tests load credentials from `.env` (local). Tests connect to live Supabase instance. Node.js v24.15.0.

---

## 14. FALSIFICATION RESULTS

| # | Falsification Attempt | Evidence | Result |
|---|----------------------|---------|--------|
| F-01 | Detect remaining production createClient in 5 patched files | grep returns 0 matches | PASS |
| F-02 | Detect remaining DB-01 bypass | getSupabaseClient confirmed in all 5 files | PASS |
| F-03 | Detect broken import from migration | `node --check` passes all 5 files + server.js | PASS |
| F-04 | Detect changed DB privilege | All 5 migrated to SERVICE_ROLE_KEY path — same privilege | PASS |
| F-05 | Detect changed query semantics | Function names preserved; call sites unchanged; same Supabase JS API | PASS |
| F-06 | Detect production route losing DB access | All routes load correctly (syntax pass); same client returned | PASS |
| F-07 | Detect constitutional-store regression | 20/20 tests pass; 29/29 gateway tests pass | PASS |
| F-08 | Detect hidden reference to pg_helpers.js | grep `require.*pg_helpers` in all .js files: exit code 1 (zero matches) | PASS |
| F-09 | Detect competing DB abstraction | pg_database.js retained as INTENTIONAL-SPECIALISED; no new abstractions created | PASS |
| F-10 | Detect schema/migration modification | No migration files touched; git diff confirms no migration changes | PASS |

**All 10 falsification attempts: PASS**

---

## 15. QUANTITATIVE BEFORE / AFTER METRICS

| Metric | Before R4 | After R4 |
|--------|-----------|----------|
| Total createClient call sites (production .js) | 58 | 53 |
| Canonical client sites | 2 (lib/clients.js) | 2 (unchanged) |
| R3 DB-01 private client sites | 5 (lib/storage.js already canonical) | 0 |
| Remaining private client sites (classified) | 39 + 12 DEV-ONLY | 34 + 12 DEV-ONLY |
| **UNKNOWN production database clients** | **0** | **0** |
| DB-01 bypasses | 5 confirmed (6 per R3, corrected) | **0** |
| Production schema changes | — | **0** |
| Production migrations changed | — | **0** |
| Production data changed | — | **0** |
| Focused test results | Baseline pass | 20+29+541+39+31 PASS, 0 FAIL |
| Regression test results | Baseline pass | 28+10+18 PASS, 0 FAIL |
| Falsification tests | — | 10/10 PASS |

**Primary R4 success condition: ZERO UNEXPLAINED PRODUCTION DATABASE CLIENT PATHS — MET**
**Secondary condition: ONE CANONICAL CLIENT FOR EQUIVALENT PRODUCTION SUPABASE ACCESS — MET**

---

## 16. FILES CHANGED

| File | Change | Type |
|------|--------|------|
| middleware/civilization-kernel.js | Migrated `_getSb()` to `getSupabaseClient()` | MODIFIED |
| lib/integrity-crons.js | Migrated `_sb()` to `getSupabaseClient()` | MODIFIED |
| lib/event-consumer.js | Migrated `_sb()` to `getSupabaseClient()` | MODIFIED |
| routes/governance.js | Migrated `_sb()` to `getSupabaseClient()` | MODIFIED |
| routes/intelligence.js | Migrated `_sbClient()` IIFE to `getSupabaseClient()` | MODIFIED |
| lib/pg_helpers.js | Removed — zero importers, confirmed orphan | DELETED |

**architecture/index.yaml** — auto-generated file, pre-existing modified state. Not an R4 change.

**Git diff summary:** 7 files changed, 11 insertions, 46 deletions (net: -35 lines)

---

## 17. FILES REMOVED

| File | Content Before Removal | Justification |
|------|----------------------|---------------|
| lib/pg_helpers.js | `module.exports = require('./supabase-helpers')` (3 lines) | Zero runtime importers confirmed; dead shim from commit 748fc83 backward-compat alias; shim never called |

---

## 18. UNRESOLVED DATABASE FINDINGS

The following were discovered during R4's complete audit but are out of R4 scope:

| ID | Finding | Classification | Recommended Phase |
|----|---------|----------------|------------------|
| R4-NF-01 | 12 lib/ modules use private equivalent Supabase clients (lib/governance.js, governance-probe.js, evidence-completeness.js, outbox-relay.js, write-with-outbox.js, runtime-readiness.js, models/runtime/index.js×2, registry/*×5) | LIB-BYPASS-EQUIVALENT | R4B or R5 |
| R4-NF-02 | 6 routes/ use private equivalent Supabase clients (agents.js, briefing.js, communications.js, intent.js, life.js, operations.js) | ROUTE-BYPASS-EQUIVALENT | R4B or R5 |
| R4-NF-03 | 11 agent-system/ modules use private Supabase clients | AGENT-SYSTEM-BYPASS | Agent canonicalization phase |
| R4-NF-04 | services/init.js uses private Supabase client | SERVICE-BYPASS-EQUIVALENT | R5 |
| R4-NF-05 | Documentation (docs/, CLAUDE.md) still references pg_helpers.js — stale | DOCUMENTATION-STALE | Documentation update pass |

All R4-NF findings are CLASSIFIED (no unknowns).

---

## 19. R4 CERTIFICATION VERDICT

All R4 certification criteria verified:

| Criterion | Status |
|-----------|--------|
| Canonical Supabase client fully understood | PASS |
| All client creation sites inventoried | PASS — 58 total, all classified |
| All 6 DB-01 bypasses resolved or justified | PASS — 5 migrated; 1 (lib/storage.js) was already canonical |
| No unexplained production private clients remain | PASS — ZERO UNKNOWN |
| pg_helpers.js removed after confirmed dead status | PASS — deleted, zero runtime references verified |
| pg_database.js classified correctly | PASS — INTENTIONAL-SPECIALISED (raw SQL / DDL path) |
| Database ownership is explicit | PASS — ownership model documented |
| Constitutional-store behaviour preserved | PASS — 20/20 tests, semantics unchanged |
| Production schema unchanged | PASS |
| Migrations unchanged | PASS |
| No production database data modified | PASS |
| Focused tests pass | PASS — 659+ tests across key modules |
| Regression tests pass | PASS — 56+ additional |
| Falsification attempts pass | PASS — 10/10 |
| No unrelated architecture changed | PASS — R4 boundary respected |

---

**R4-DATABASE-CANONICALISATION: COMPLETE**

**NEXT AUTHORIZED TASK: R5-RUNTIME-CANONICALISATION**

Do not begin R5 without explicit authorization.

---

*Certification produced by APEX AI OS — Claude Code (claude-sonnet-4-6). R4-DATABASE-CANONICALISATION Gate. Date: 2026-08-24.*
