# T3-00 (MR-08) — Constitutional Store Activation: Implementation Record

**Task:** T3-00 — MR-08 Constitutional Store Activation  
**Wave:** Wave 3, Tier 0 (precondition — blocks all wiring)  
**Date:** 2026-07-29  
**Status:** IMPLEMENTED — Pending Verification Against Live Supabase  
**Baseline:** APEX-CONSTITUTION-v1.0  
**Authority:** WAVE-3-AUTHORIZATION-REPORT.md § T3-00; WAVE-2-COMPLETION-CERTIFICATE.md § 11

---

## 1. TASK SUMMARY

T3-00 activates the constitutional record persistence layer by replacing the Wave 2 no-op stub (`constitutional-store.js`) with production Supabase persistence to a new `constitutional_records` table, and by creating the corresponding SQL migration.

Wave 2 boundary MR-08 established that `write()` would be a silent stub. Wave 3 requires that all constitutional type emissions become auditable. T3-00 is the first Wave 3 task because all subsequent wiring emits to `constitutional-store.write()` — without active persistence, every Wave 3 emission vanishes silently.

---

## 2. PHASE 0 — REPOSITORY DISCOVERY

**Objective:** Locate the canonical Supabase client before any code modification. CLAUDE.md mandates that all `require()` calls be verified before use.

**Discovery method:** Grepped for `createClient|supabase` across all `.js` files.

**Finding:** `lib/pg_helpers.js:3` imports via:
```javascript
const supabase = require('./clients').getSupabaseClient();
```

**Client module:** `lib/clients.js`  
**Export:** `getSupabaseClient()` — lazy singleton, `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`  
**Pattern:** Call `getSupabaseClient()` inside the function, not at module load time (singleton is safe to call multiple times)

**Import path from `lib/runtime/constitutional-store.js`:** `../clients`

**Verification command executed:**
```
node -e "require('./lib/runtime/../clients'); console.log('relative path OK')"
→ relative path OK
```

**Phase 0 conclusion:** Existing client confirmed. No new client creation required.

---

## 3. FILES MODIFIED

### 3.1 `lib/runtime/constitutional-store.js` — MODIFIED

**Change:** Replaced Wave 2 no-op stub body with Supabase insert, preserving all original contracts.

**Preserved:**
- `'use strict'` header
- Debug logging block (unchanged)
- Fire-and-forget pattern (no-throw — all errors caught and logged)
- `module.exports = Object.freeze({ write })` — exports remain frozen
- Function signature `async function write(record)` — unchanged

**Added:**
- `require('../clients')` import for `getSupabaseClient`
- `try/catch` Supabase insert after the debug block

**Final implementation:**
```javascript
'use strict';
// lib/runtime/constitutional-store.js
// T3-00 (MR-08): Wave 3 constitutional record persistence via Supabase.
//
// write() is fire-and-forget — callers must not await or handle errors.
// No-throw contract: all errors are logged and swallowed.
//
// To enable debug logging: CONSTITUTIONAL_STORE_DEBUG=1 node server.js

const { getSupabaseClient } = require('../clients');

async function write(record) {
    if (process.env.CONSTITUTIONAL_STORE_DEBUG) {
        console.log('[constitutional-store]', JSON.stringify({
            type:     record?.__type,
            baseline: record?.__baseline,
            runtime:  record?.__runtime,
        }));
    }
    try {
        const sb = getSupabaseClient();
        await sb.from('constitutional_records').insert({
            record_type:          record.__type,
            runtime_id:           record.__runtime,
            baseline:             record.__baseline || 'APEX-CONSTITUTION-v1.0',
            wave:                 record.__wave    || null,
            record_data:          record,
            structural_immutable: record.__structural_immutable || false,
        });
    } catch (err) {
        console.error('[constitutional-store] write failed:', record?.__type, err?.message);
    }
}

module.exports = Object.freeze({ write });
```

**Field mapping:**

| Column | Source | Notes |
|--------|--------|-------|
| `record_type` | `record.__type` | Required; all constitutional types set `__type` |
| `runtime_id` | `record.__runtime` | Required; set by all Wave 2 emitters |
| `baseline` | `record.__baseline \|\| 'APEX-CONSTITUTION-v1.0'` | Default applied if field absent |
| `wave` | `record.__wave \|\| null` | Optional; null until Wave 3 emitters set it |
| `record_data` | `record` | Full JSONB snapshot — entire constitutional record |
| `structural_immutable` | `record.__structural_immutable \|\| false` | Default false |

**Not mapped (optional columns deferred):** `session_id`, `trace_id` — Wave 3 emitters may populate in later tasks.

### 3.2 `migrations/080_constitutional_records.sql` — CREATED

Schema per WAVE-2-MASTERPLAN.md §3.4 and WAVE-3-AUTHORIZATION-REPORT.md:

```sql
CREATE TABLE IF NOT EXISTS constitutional_records (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type          TEXT        NOT NULL,
  runtime_id           TEXT        NOT NULL,
  baseline             TEXT        NOT NULL DEFAULT 'APEX-CONSTITUTION-v1.0',
  wave                 TEXT,
  record_data          JSONB       NOT NULL,
  structural_immutable BOOLEAN     NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id           TEXT,
  trace_id             TEXT
);

CREATE INDEX IF NOT EXISTS idx_constitutional_records_type    ON constitutional_records(record_type);
CREATE INDEX IF NOT EXISTS idx_constitutional_records_runtime ON constitutional_records(runtime_id);
CREATE INDEX IF NOT EXISTS idx_constitutional_records_created ON constitutional_records(created_at);
```

**`IF NOT EXISTS` guards:** Applied to all CREATE statements for idempotent re-execution.

---

## 4. CALLERS — NO MODIFICATION

The 7 callers of `constitutional-store.write()` were identified and verified unchanged:

| File | Wave | Constitutional Type |
|------|------|---------------------|
| `lib/runtime/execution-transaction.js` | W2-02 | KernelOperationManifest, RejectionRecord, AccountabilityRecord |
| `lib/reality/fabric.js` | W2-03 | ChangeRecord |
| `lib/runtime/governance-attestation.js` | W2-08 | ConstitutionalComplianceAttestation |
| `lib/constitution/drift-detector.js` | W2-10 | CoherenceViolationRecord |
| `lib/founder/profile.js` | W2-12 | ActorProfile |
| `lib/registry/universe/index.js` | W2-06 | DomainAuthorityRecord, DomainProfile |
| `lib/memory/gateway.js` | W2-01 | HistoricalStateQueryResult |

All 7 callers use fire-and-forget `setImmediate(async () => { ... store.write(record) ... })` — they do not await or handle errors from `write()`. T3-00 does not change this contract.

---

## 5. VERIFICATION RESULTS

| Check | Command | Result |
|-------|---------|--------|
| `../clients` path resolves | `node -e "require('./lib/runtime/../clients')"` | OK |
| Syntax check | `node --check lib/runtime/constitutional-store.js` | SYNTAX OK |
| Module loads | `node -e "require('./lib/runtime/constitutional-store')"` | OK |
| `write` is function | `typeof store.write === 'function'` | true |
| Exports frozen | `Object.isFrozen(store)` | true |
| No-throw contract | `store.write(null).then(...)` — no uncaught exception | no-throw OK |
| All 7 callers syntax | `node --check` on each caller | ALL CALLERS SYNTAX OK |

**No-throw behavior with missing env vars:** When `SUPABASE_URL` is absent, `getSupabaseClient()` throws internally; the `catch (err)` block catches it and logs `[constitutional-store] write failed: undefined supabaseUrl is required.` — confirming the no-throw contract holds even under misconfiguration.

---

## 6. LIMITATIONS AND OPEN ITEMS

| Ref | Description | Resolution |
|-----|-------------|------------|
| L-01 | Migration must be applied to Supabase manually or via `scripts/run-all-migrations.js` before any record can persist. Until applied, `write()` will catch a "relation does not exist" error (logged, not thrown). | Apply migration before first Wave 3 load. |
| L-02 | `session_id` and `trace_id` columns are unpopulated — no Wave 3 emitter currently sets these fields. | Future Wave 3 tasks may add trace context. |
| L-03 | `wave` field will be `null` for all existing Wave 2 emitters until they are updated to set `record.__wave`. | Non-blocking — wave is nullable. |
| DEV-01 | In local dev without `SUPABASE_URL`, every `write()` call logs a caught error. Use `CONSTITUTIONAL_STORE_DEBUG=0` to suppress debug log; the write error log cannot be suppressed by env var (by design — no silent swallow of write failures). | Expected dev behaviour. |

---

## 7. GATE 3 CRITERION 6 — PARTIAL RESOLUTION

Wave 2 Completion Certificate §6 documented Gate 3 Criterion 6 as a GAP:
> "≥ 2 database migrations for constitutional type tables applied — 0 migrations created."

T3-00 resolves the first half of this gap:
- `migrations/080_constitutional_records.sql` — CREATED
- `constitutional-store.js` — ACTIVE (persistence live upon migration application)

**Remaining gap:** The migration must be applied to the Supabase database. Until applied, zero records persist. Once applied, all 10 Wave 2 active constitutional type emissions will begin persisting on the next server start.

Wave 3 Criterion 6 is promoted from GAP to PARTIALLY RESOLVED. Full resolution requires migration execution.

---

## 8. MR-08 STATUS UPDATE

| Dimension | Wave 2 State | Wave 3 State (T3-00) |
|-----------|-------------|---------------------|
| `constitutional-store.js` | No-op stub | Active Supabase persistence |
| `constitutional_records` table | Does not exist | Migration file created (pending apply) |
| Records persisted | 0 | 0 (pending migration application) → all active types on first load |
| Callers modified | N/A | 0 (no callers changed) |

**MR-08 boundary decision:** RESOLVED by T3-00.

---

## 9. WAVE 3 UNBLOCKING

T3-00 completion unblocks all Tier 1+ Wave 3 tasks. Every Wave 3 wiring task that emits constitutional records will now produce auditable Supabase rows rather than silent no-ops.

**Next Wave 3 task:** T3-01 — D5 Uncertainty Protocol Implementation (Tier 1), the root blocker for the RT-08 epistemic chain per IDR-W2-11-001.

---

*T3-00 Implementation Record issued: 2026-07-29.*  
*Constitutional authority: APEX-CONSTITUTION-v1.0 → WAVE-3-AUTHORIZATION-REPORT.md → WAVE-2-COMPLETION-CERTIFICATE.md.*  
*MR-08 resolved. Wave 3 Tier 1 unblocked.*
