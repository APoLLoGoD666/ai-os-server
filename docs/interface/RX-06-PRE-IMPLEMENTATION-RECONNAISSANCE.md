# RX-06 — PRE-IMPLEMENTATION RECONNAISSANCE

**Programme:** RX — Production Reconciliation  
**Phase:** RX-06 CONSTITUTIONAL SURFACES  
**Date:** 2026-08-28  
**Status:** RECONNAISSANCE COMPLETE — AWAITING EXPLICIT IMPLEMENTATION AUTHORISATION  
**Scope:** GAP-17, GAP-18, GAP-19 + full gap inventory verification

---

## 1. Executive Verdict

**RX-06 canonical scope is GAP-17, GAP-18, GAP-19 — Constitutional Surfaces (UX-16).**

This is NOT the scope implied by the open items listed at RX-05 close (GAP-15/16/22). Those gaps are unscheduled and not in RX-06.

**Wave-3 dependency status:** T3-12 COMPLETE (2026-08-04) and T3-13 COMPLETE (2026-08-04). The blocking dependency is met. RX-06 may proceed.

**GAP-17, GAP-18, GAP-19:** All three are GENUINELY OPEN. None have been implemented.

**GAP-20 discrepancy:** The user authorization cited GAP-20 as an open P1 gap. Reconnaissance finds GAP-20 was CLOSED in RX-02. See Section 7.

**GAP-15/16/22:** Not in RX-06 canonical scope. Open and unscheduled. See Section 12.

---

## 2. Authoritative RX-06 Objective

**Source:** `docs/interface/POST-UX-19-R-SERIES-RECONCILIATION.md`

```
Sprint RX-06 — Constitutional Surfaces (Sequential on T3-12, T3-13)
Goal: Implement UX-16 constitutional dashboard and audit log.
Hard dependency: T3-12 COMPLETE before RX-06-A; T3-13 COMPLETE before RX-06-B.
Effort estimate: 1-2 days backend + 1 day frontend.
```

| Task | Gap | Dependency | Action | File |
|------|-----|-----------|--------|------|
| RX-06-A | GAP-18 | T3-12 | Propagate CDP attestations to `/api/governance/dashboard` response | `lib/governance.js`, governance route |
| RX-06-B | GAP-19 | T3-13 | Add `GET /api/governance/history` querying `constitutional_records` | `src/routes/governance.js` or new |
| RX-06-C | GAP-17 | RX-06-A + RX-06-B | Add `page-governance` constitutional dashboard to frontend | `public/dashboard.html` |

**Gate:** Constitutional chain-of-thought must NOT appear in any response body. Only principle pass/fail outcomes surfaced.

---

## 3. Wave-3 Dependency Status

| Task | Status | Date | Evidence |
|------|--------|------|----------|
| T3-12 — DeliberationRecord + CDP | **COMPLETE** | 2026-08-04 | `docs/constitutional-architecture/implementation/T3-12-DELIBERATION-IMPLEMENTATION-RECORD.md` |
| T3-13 — CivilizationalDecision (RT-12 Bootstrap) | **COMPLETE** | 2026-08-04 | `docs/constitutional-architecture/implementation/T3-13-CIVILIZATIONAL-DECISION-IMPLEMENTATION-RECORD.md` |

Both files: `lib/civilization/rt12-bootstrap.js` and `lib/civilization/rt13-bootstrap.js` exist and pass `node --check`. `constitutional_records` table schema exists at `migrations/080_constitutional_records.sql`. Records are written by the RT-12 bootstrap on execution.

**Dependency unblocked. RX-06 may proceed.**

---

## 4. GAP-18 Analysis — ExecutionContext.constitution Propagation

**Gap ID:** GAP-18  
**UX authority:** UX-16  
**Class:** D (Constitutional propagation)  
**Priority:** P2  
**Description:** `ExecutionContext.constitution` block exists in the runtime but its verdict, risks, and audit trail are not surfaced in the governance dashboard API response.

### 4.1 ExecutionContext.constitution — Current Structure

`lib/runtime/execution-context.js` lines 30–35:

```js
constitution: {
    evaluated:  false,
    verdict:    null,       // ALLOW | WARN | BLOCK
    risks:      [],
    auditTrail: [],
},
```

This block is hydrated by the civilization kernel during request processing.

### 4.2 Current Governance Dashboard Response

`routes/governance.js` lines 496–505, `GET /api/governance/dashboard`:

```js
const dashboard = {
    generated_at:     new Date().toISOString(),
    certifications:   { total: ..., by_status: ... },
    anomalies:        { total: ..., by_severity: ... },
    open_incidents:   ...,
    change_types:     ...,
    agent_reputation: [...],
};
```

**Missing from current response:** any `constitution` block, any CDP attestation data, any `constitutional_records` reference.

### 4.3 constitutional_records Table

`migrations/080_constitutional_records.sql`:

```sql
CREATE TABLE IF NOT EXISTS constitutional_records (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type          TEXT        NOT NULL,     -- 'CivilizationalDecision', 'CDP', etc.
  runtime_id           TEXT        NOT NULL,     -- 'RT-12', 'RT-13', etc.
  baseline             TEXT        NOT NULL DEFAULT 'APEX-CONSTITUTION-v1.0',
  wave                 TEXT,
  record_data          JSONB       NOT NULL,     -- Full constitutional payload
  structural_immutable BOOLEAN     NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id           TEXT,
  trace_id             TEXT
);
```

Indexed on `record_type`, `runtime_id`, `created_at`.

### 4.4 Implementation for GAP-18

Add a `constitution` block to the governance dashboard response by querying `constitutional_records` for the most recent records:

```js
// In GET /api/governance/dashboard — add to Promise.all:
sb.from('constitutional_records').select('record_type, runtime_id, wave, created_at').order('created_at', { ascending: false }).limit(10)
```

**Gate constraint:** Only `record_type, runtime_id, wave, created_at` — NOT `record_data` (which may contain constitutional chain-of-thought). This surfaces principle presence/absence, not internal deliberation content.

**Minimum response addition:**
```js
constitution: {
    records_present:     true/false,
    latest_record_type:  'CivilizationalDecision',
    latest_wave:         'WAVE-3',
    latest_at:           '2026-08-04T...',
    record_count:        N,
}
```

**Files to change:** `routes/governance.js` only — add fields to the existing dashboard response. `lib/governance.js` does NOT need modification.

### 4.5 GAP-18 Status

**GENUINELY OPEN.** `GET /api/governance/dashboard` returns no constitutional data. `constitutional_records` is not queried. No CDP attestation is surfaced.

---

## 5. GAP-19 Analysis — Constitutional Audit Log Route

**Gap ID:** GAP-19  
**UX authority:** UX-16  
**Class:** C (Missing backend route)  
**Priority:** P2  
**Description:** No `GET /api/governance/history` route exists. There is no way to query past constitutional records beyond the governance dashboard snapshot.

### 5.1 Existing Routes Inventory

Current `routes/governance.js` GET routes:

| Route | Purpose |
|-------|---------|
| `/governance/forensics/:taskId` | 16 forensic questions per task |
| `/governance/certifications` | Recent certifications |
| `/governance/anomalies` | Recent anomalies |
| `/governance/slo-status` | SLO metrics |
| `/governance/agent-reputation` | Per-agent success rates |
| `/governance/system-certification` | Domain 40 OS certification |
| `/governance/incidents` | Open incidents |
| `/governance/change-intelligence` | Change classifications |
| `/governance/evidence-chain` | Evidence blocks |
| `/governance/policy-violations` | Policy violations |
| `/governance/dashboard` | Unified snapshot |
| `/governance/probe/latest` | Latest probe result |
| `/governance/readiness` | Runtime readiness |
| `/governance/completeness/:taskId` | Evidence completeness (one task) |
| `/governance/completeness` | Evidence completeness (recent) |
| `/governance/architecture-registry` | Active subsystems |

`GET /api/governance/history` does NOT exist.

### 5.2 Implementation for GAP-19

Add `GET /api/governance/history` to `routes/governance.js`:

```js
// GET /api/governance/history — constitutional records log
router.get('/governance/history', async (req, res) => {
    const limit       = Math.min(parseInt(req.query.limit) || 20, 100);
    const record_type = req.query.record_type || null;
    try {
        let q = _sb().from('constitutional_records')
            .select('id, record_type, runtime_id, baseline, wave, created_at, session_id, trace_id')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (record_type) q = q.eq('record_type', record_type);
        const { data, error } = await q;
        if (error) throw error;
        res.json({ ok: true, records: data || [], count: (data || []).length });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
```

**Critical constraint:** `record_data` MUST NOT be returned — it contains constitutional chain-of-thought. Only metadata fields: `id, record_type, runtime_id, baseline, wave, created_at, session_id, trace_id`.

**Files to change:** `routes/governance.js` only.

### 5.3 GAP-19 Status

**GENUINELY OPEN.** No route exists. `constitutional_records` table is populated but not queryable via API.

---

## 6. GAP-17 Analysis — Constitutional Dashboard Page

**Gap ID:** GAP-17  
**UX authority:** UX-16  
**Class:** A (Frontend-only surface)  
**Priority:** P2  
**Description:** No `#page-governance` div, no `#nav-governance` button exists in `public/dashboard.html`. The constitutional governance layer has no user-facing surface.

### 6.1 Current Dashboard State

`grep "page-governance|nav-governance" public/dashboard.html` → 0 results.

The pages array, pageMeta, navigation, and HTML content for governance do not exist.

### 6.2 Dependencies

GAP-17 (RX-06-C) depends on:
- RX-06-A (GAP-18): `GET /api/governance/dashboard` returning constitutional data
- RX-06-B (GAP-19): `GET /api/governance/history` existing

Implementation sequence: RX-06-A → RX-06-B → RX-06-C.

### 6.3 Implementation for GAP-17

Standard dashboard page pattern (same as RX-04 additions):
1. Add `'governance'` to `pages` array
2. Add `governance: { title:'Governance', sub:'Constitutional · Authority · Audit' }` to `pageMeta`
3. Add `#nav-governance` desktop nav button
4. Add GOVERNANCE mobile nav button
5. Add `#page-governance` div with panels:
   - Constitutional status panel (calls `GET /api/governance/dashboard`, surfaces `constitution` block)
   - Constitutional records log (calls `GET /api/governance/history`)
   - Link to existing governance forensics/certifications/dashboard data
6. JS refresh functions: `governanceRefresh()`, `window.governanceRefresh`
7. Page switch hook addition

**Files to change:** `public/dashboard.html` only.

**Gate constraint:** Constitutional chain-of-thought must NOT appear in the UI. Only principle pass/fail verdicts, record presence, and metadata.

### 6.4 GAP-17 Status

**GENUINELY OPEN.** No governance page in the dashboard.

---

## 7. GAP-20 Status — Discrepancy Report

**User authorization cited GAP-20 as an open P1 gap.**

Reconnaissance finds: **GAP-20 was CLOSED in RX-02.**

### Evidence

`docs/interface/RX-02-P1-FUNCTIONAL-BETA-CLOSURE.md` explicitly states GAP-20 CLOSED. The closure added 9 additional event taps to `tapEventBus()` in `lib/viz-broadcaster.js`:

| Added event | Viz payload type |
|-------------|-----------------|
| VOICE_STARTED | `voice / started` |
| REFLEX_RESPONSE_SENT | `voice / reflex` |
| USER_INTERRUPTED | `voice / interrupted` |
| SESSION_COMPLETED | `voice / completed` |
| TOOL_DISPATCHED | `tool / dispatched` |
| TOOL_COMPLETED | `tool / completed/failed` |
| CLAUDE_STARTED | `system / claude_started` |
| BACKGROUND_TASK_QUEUED | `system / queued` |
| MODEL_INVOKED | `system / model_invoked` |

Current `lib/viz-broadcaster.js` has 11 `tapEventBus()` handlers, verified via RX-05 tests.

### Residual Note

The original GAP-20 description mentioned "Error, Constitutional, Memory, Gov" categories in addition to Voice/Tool/System. Those categories have no defined event types in `lib/event-bus.js` EVENTS registry (no `ERROR_OCCURRED`, `MEMORY_WRITTEN`, `GOVERNANCE_EVALUATED` etc.). Adding taps for undefined event types is not possible without first adding those event types to the bus — which would be a new gap, not a residual from GAP-20.

**GAP-20 verdict: CLOSED in RX-02. Not in RX-06 scope.**

---

## 8. Current Memory Architecture (GAP-15/16)

`routes/memory.js` has 25+ endpoints. All are behind `router.use(require('../lib/app-auth'))` global auth guard.

**Correction (GAP-15):** No `PATCH` route exists in `routes/memory.js`. The `supersede()` function exists in `lib/memory/semantic-memory.js` (lines 125–144) — it marks old entry as `status: 'superseded'` and creates a new entry. This is the canonical mutation mechanism for semantic memory. UX-15 Section 24 specifies that correction should route through `contradict()` + `supersede()`, not direct UPDATE. No route exposes this to API consumers.

**Deletion (GAP-16):** Only `DELETE /memory/working/:sessionId` (bulk session clear) exists. No per-record deletion route for semantic/episodic/procedural/strategic memory. UX-15 Section 25 specifies the "right to forget" as a complex multi-step workflow requiring governance log entry.

**Neither GAP-15 nor GAP-16 is in RX-06 canonical scope.**

---

## 9. Current Event Architecture (GAP-22)

`GET /api/timeline` queries `apex_timeline` with a hard limit of 20 rows (`src/routes/telemetry/index.js` lines 246–262). No pagination, no cursor.

The event spine (`events` table, `outbox`, `consumer_offsets`) exists and is production-active. The outbox-relay runs on a 5-second tick; the event-consumer runs on a 10-second tick. `correlation_id` is now present in the in-memory event bus (RX-05) but is NOT persisted to the `events` table schema (no such column in migration 024).

**GAP-22 is not in RX-06 canonical scope.** It remains open and unscheduled.

---

## 10. Database/Persistence Analysis for RX-06

| Table | Status | RX-06 usage |
|-------|--------|-------------|
| `constitutional_records` | Production-active (written by RT-12/13) | READ in RX-06-A and RX-06-B |
| `certifications` | Production-active | Already used by governance dashboard |
| `anomalies` | Production-active | Already used by governance dashboard |
| All other tables | No change | No modification |

**No new database migration required for RX-06.** All tables already exist. RX-06-A and RX-06-B are read-only consumers of existing tables.

---

## 11. Authorization/Governance Analysis

**Existing auth:** All `routes/governance.js` routes currently have NO explicit `requireAppAccess` middleware call (they rely on server-level middleware). The existing pattern is consistent — governance routes are protected by the same middleware chain as all other routes.

**RX-06-B** (`GET /api/governance/history`): Should use the same pattern as other read-only governance routes — no additional auth layer required beyond the existing middleware.

**GAP constraint (UX-16 gate):** "Constitutional chain-of-thought must NOT appear in any response body." This applies to `record_data` in `constitutional_records`. The implementation must select only metadata columns (`record_type, runtime_id, wave, created_at, session_id, trace_id`), never `record_data`.

---

## 12. Current Status of All Tracked Gaps

| Gap | Current Status | Evidence | Assigned Sprint | Dependency |
|-----|----------------|----------|-----------------|------------|
| GAP-15 | OPEN — unscheduled | No PATCH route in routes/memory.js; supersede() exists in semantic-memory.js but unexposed | None | None |
| GAP-16 | OPEN — unscheduled | No per-record DELETE route; only working memory bulk clear exists | None | None |
| GAP-17 | OPEN | No page-governance in dashboard.html | RX-06-C | RX-06-A + RX-06-B |
| GAP-18 | OPEN | governance/dashboard returns no constitutional data; constitutional_records not queried | RX-06-A | T3-12 COMPLETE ✓ |
| GAP-19 | OPEN | GET /api/governance/history does not exist | RX-06-B | T3-13 COMPLETE ✓ |
| GAP-20 | **CLOSED in RX-02** | viz-broadcaster has 11 handlers; RX-02-P1-FUNCTIONAL-BETA-CLOSURE.md | RX-02 (closed) | — |
| GAP-21 | CLOSED in RX-05 | event-bus.js carries correlation_id; RX-05-GAP-21-CERTIFICATION.md | RX-05 (closed) | — |
| GAP-22 | OPEN — unscheduled | Only /api/timeline exists (20-row limit); no paginated event log | None | None |
| GAP-28 | DEFERRED to RX-07 | IBM Plex Sans: 29 CSS refs; Space Grotesk: 154 inline refs | RX-07 | None |

---

## 13. ONE-APEX Integrity Assessment

| Principle | RX-06 Impact |
|-----------|-------------|
| No second runtime | MAINTAINED — no new runtime |
| No second event bus | MAINTAINED — not touched |
| No second memory system | MAINTAINED — not touched |
| No second governance system | MAINTAINED — additive queries to existing tables |
| No second constitutional system | MAINTAINED — read-only surface over existing constitutional_records |
| No parallel frontend | MAINTAINED — one page added to existing dashboard |
| server.js | UNCHANGED |
| lib/governance.js | UNCHANGED — governance route handles all additions |
| lib/kernel.js | UNCHANGED |
| lib/memory/* | UNCHANGED |
| lib/event-bus.js | UNCHANGED |
| Database schema | UNCHANGED — all tables already exist |

---

## 14. Minimum Canonical Implementation

### Files That Would Change

| File | Change |
|------|--------|
| `routes/governance.js` | +`constitutional_records` query in dashboard handler (RX-06-A); +`GET /governance/history` route (RX-06-B) |
| `public/dashboard.html` | +`page-governance` div, +nav buttons, +pages array, +pageMeta, +JS functions, +switch hook (RX-06-C) |

### Files That Must Remain Untouched

`server.js`, `lib/governance.js`, `lib/kernel.js`, `lib/event-bus.js`, `lib/viz-broadcaster.js`, `lib/memory/*`, `lib/runtime/*`, `lib/clients.js`, all `migrations/*`, all other `routes/*`, all other `src/routes/*`.

### No Migration Required

`constitutional_records` table exists. `certifications`, `anomalies`, and other tables exist. No new schema changes needed.

---

## 15. Critical Risk: record_data Exposure

**Risk:** `constitutional_records.record_data` is JSONB that contains the full constitutional payload including potential chain-of-thought data from RT-12 deliberation.

**UX-16 gate:** "Constitutional chain-of-thought must NOT appear in any response body."

**Mitigation (required in implementation):** Both RX-06-A and RX-06-B must NEVER SELECT `record_data`. Only select: `id, record_type, runtime_id, baseline, wave, created_at, session_id, trace_id`. This is a hard constraint, not optional.

**Severity:** HIGH — violating this would expose internal constitutional deliberation to API consumers.

---

## 16. Recommended Implementation Sequence

1. **RX-06-A** (GAP-18): Modify `GET /governance/dashboard` in `routes/governance.js` to add a `constitution` block sourced from `constitutional_records` metadata (no `record_data`)
2. **RX-06-B** (GAP-19): Add `GET /governance/history` to `routes/governance.js` querying `constitutional_records` metadata (no `record_data`)
3. Run `node --check routes/governance.js` after both
4. **RX-06-C** (GAP-17): Add `page-governance` to `public/dashboard.html` following RX-04 pattern
5. Create test suite (`tests/rx-06-p1.test.js`)
6. Run all RX-02/03/04/05 regressions
7. Create certification document

---

## 17. Verification of Reconnaissance Cleanliness

- No production files modified
- No routes added
- No database schema changed
- No migrations created
- No frontend changes made
- No new runtime introduced
- No second event store introduced
- No second memory system introduced
- RX-07 not started
- No implementation performed

---

## Hard Stop

**RX-06 PRE-IMPLEMENTATION RECONNAISSANCE COMPLETE — AWAITING EXPLICIT IMPLEMENTATION AUTHORISATION.**

Do not begin RX-06 implementation. Do not modify `routes/governance.js`. Do not modify `public/dashboard.html`.
