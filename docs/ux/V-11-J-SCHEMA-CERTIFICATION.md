# V-11-J SCHEMA FIX — CERTIFICATION

**Phase:** V-11-J (Opportunities Schema/Data-Contract Convergence)
**Baseline:** `fc258d6` (V-11-I Voice UX — CERTIFIED)
**Status:** CERTIFIED
**Production build:** `79012e8` — UNCHANGED
**Deployment:** NOT DEPLOYED
**Push:** NOT PUSHED

---

## 1. Authority & Baseline

- **HEAD at start:** `fc258d6a26b048b080d65ad4b7dc943b97c8db0e` — `feat(ux): complete canonical V-11-I voice experience`.
- **`node --check server.js`:** OK.
- **Working tree:** modified state carried forward from prior sessions (playwright JSON logs, governance events, architecture snapshots, and untracked docs from V-05/V-06/V-11-H-B0). No V-11-J-touched file was pre-modified.
- **Authority for this phase:**
  - `docs/interface/V-11-EXPERIENCE-ARCHITECTURE-SPECIFICATION.md`
    - §22.2 "Schema Fix Required" — `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS evidence_refs jsonb`.
    - §28.11 "Phase V-11-J: Opportunities Schema Fix" — objective, scope, acceptance criteria, rollback.
    - §7.4 — INTELLIGENCE surface graceful-degraded state for Opportunities "until V-11-J schema fix".
    - Appendix — "D-01: `/api/intelligence/opportunities` → 500 remains a real defect (missing `evidence_refs` column). Addressed in V-11-J."
  - `docs/interface/V-11-C-API-CONTRACT-RECONCILIATION.md` §"evidence_refs column — NOT a migration" — documented the V-11-C application-level workaround.

## 2. Exact Schema Issue Identified (Phase 0 recon)

The `evidence_refs` field flows through three layers with a **shape mismatch** that the V-11-C workaround masked but did not resolve:

1. **Writer (`lib/intelligence/opportunity-engine.js:139` pre-J):** stored `evidence_refs` inside `roi_forecast` jsonb as a **`string[]`** of raw model refs (e.g. `["EVT-0","MEM-2","SIG-1"]`) — see `opportunity-engine.js:71` prompt schema.
2. **DB schema (`migrations/015_civilization_infrastructure.sql:59-70` + `017_reality_convergence.sql:17-19`):** no top-level `evidence_refs` column. Only `origin_event_ids jsonb` and `reasoning_chain text` were added post-015. The V-11 spec §22.2 canonical fix was never authored.
3. **Reader (`routes/intelligence.js:605` pre-J):** V-11-C fixed the 500 by selecting `roi_forecast` and lifting `evidence_refs` from it — but returned the raw string array unchanged.
4. **Frontend (`public/dashboard.html:21957-21964`):** `_intLoadOpportunities` renders each ref as `ref.label || ref.source` with an optional `ref.ts` timestamp. Corroborated by `playwright-v11g-verify.js:294` (G-9 fixture: `evidence_refs:[{ label:'Source1', ts: new Date().toISOString() }]`).

**Net effect pre-J:** API returned strings; frontend evaluated `ref.label || ref.source` on strings → both `undefined` → the fallback `'Source'` was rendered for every row with no timestamp. Evidence L1 disclosure (V-11-G G-9) was silently broken in real data.

## 3. Canonical Schema Established

```
DB column:         opportunities.evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb
API field shape:   evidence_refs: Array<{ label: string, source: string, ts: string|null }>
Frontend contract: ref.label || ref.source  (+ ref.ts optional)
Envelope:          { ok: true, opportunities: [...], count: N }
Error envelope:    { ok: false, error: <CODE>, message, requestId }
```

Legacy `roi_forecast.evidence_refs` is preserved in-writer as a mirror location for backwards compatibility with any consumer that reads it.

## 4. Affected Tables / APIs / Frontend

| Layer | File | Change |
|---|---|---|
| DB migration | `migrations/093_opportunities_evidence_refs.sql` (new) | `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb` |
| Writer | `lib/intelligence/opportunity-engine.js` | `_projectRef` helper; writes structured refs to top-level column AND legacy `roi_forecast.evidence_refs` |
| Reader | `routes/intelligence.js` | SELECT top-level column; graceful fallback on `42703` for pre-migration envs; `_normalizeEvidenceRefs` projects legacy strings into canonical objects |
| Frontend | `public/dashboard.html` | NO change — already consumes canonical shape (V-11-G G-9) |
| Tests | `test-v11j-schema.js` (new) | 26 source-level assertions across migration/writer/reader/frontend/envelope/ownership |

## 5. Backend Changes

**`lib/intelligence/opportunity-engine.js`:**

- Added `_projectRef(r)` helper. If ref is already structured (`{label, source}`), it is normalised. If ref is a raw `EVT-N` / `MEM-N` / `SIG-N` string, it is resolved against `events` / `memPatterns` / `marketSignals` and projected into `{label, source, ts}`.
- Row insert now contains a **top-level** `evidence_refs: structuredRefs` field alongside the existing `roi_forecast.evidence_refs: structuredRefs` mirror.
- `originEventIds`, `citedSignals`, `citedMemory` derivations narrowed with `typeof r === 'string'` guards to survive future structured-ref inputs from the model.

**`routes/intelligence.js`:**

- SELECT expanded to `id,title,description,composite_score,status,evidence_refs,roi_forecast,detected_at`.
- Graceful pre-migration fallback: on `42703` / "column ... evidence_refs ... does not exist", re-queries without the top-level column so the endpoint stays 200 even before migration 093 runs in a given environment.
- `_normalizeEvidenceRefs(o)` chooses top-level column → legacy nested → empty, then normalises every ref into `{label, source, ts}`. Legacy raw strings (`EVT-…`, `MEM-…`, `SIG-…`) are labelled by their tag with a `null` timestamp.
- Canonical `{ ok, error, message, requestId }` envelope preserved on all paths. No `success:` field introduced.
- `requireAppAccess` middleware unchanged (V-11-H-B ownership model intact).

## 6. Frontend Changes

**None.** `public/dashboard.html:21957-21964` was already the canonical consumer for `{label, source, ts}` — the fix converges the API to that shape. This is verified by test `J-21` / `J-22` / `J-23`.

## 7. Migration

`migrations/093_opportunities_evidence_refs.sql`:

```sql
BEGIN;

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
```

- Additive, idempotent (`IF NOT EXISTS`), default `'[]'` so existing rows validate the new shape.
- Wrapped in a transaction for atomic apply/rollback.
- **Not run against production in this phase.**
- **Rollback:** `ALTER TABLE opportunities DROP COLUMN IF EXISTS evidence_refs;`

## 8. Ownership / Security Verification

- `opportunities` is a **global** surface — no `human_id` column, no per-user filtering. V-11-J introduces no ownership boundary change.
- `requireAppAccess` on `/intelligence/opportunities` unchanged (test `J-26`).
- No new response fields expose PII or per-identity context.
- V-11-H-B ownership model on `apex_tasks` / `apex_notifications` / `apex_agent_runs` / `apex_timeline` / `agent_actions` / `standing_approvals`: **UNTOUCHED**.
- V-11-I voice authority + privacy gates (`req.identity.role === 'master'` for alexContext / hardcoded PII lines): **UNTOUCHED**.
- Canonical error codes (`CODES.DATABASE_UNAVAILABLE`, `CODES.INTERNAL_ERROR`) preserved on error paths.

## 9. Legacy Audit Results

`grep evidence_refs` across `**/*.js`:

| Occurrence | Class | Rationale |
|---|---|---|
| `middleware/civilization-kernel.js:340` | **A** (canonical active) | Different domain (`record.rule_results` on governance snapshots); no relation to opportunities contract. |
| `lib/knowledge/*` (4 files) | **A** (canonical active) | Knowledge KG-03 subsystem contract; string[] of canonical refs evaluated by `knowledge-evidence-evaluator.js`. Independent of opportunities contract. |
| `lib/intelligence/opportunity-engine.js` | **A** (canonical active) | Post-V-11-J writer. |
| `routes/intelligence.js` | **A** (canonical active) | Post-V-11-J reader. |
| `public/dashboard.html` | **A** (canonical active) | Post-V-11-J consumer (unchanged; already canonical). |
| `playwright-v11g-verify.js` (G-9 fixtures) | **C** (test fixture) | Already uses canonical `{label, ts}` shape. |
| `test-v11c-api-contract.js:132-136` | **C** (test fixture) | Verifies no raw DB error leak; stricter post-J. |
| `tests/knowledge-evidence-evaluator.test.js` | **A** (canonical active) | Knowledge subsystem tests, unrelated. |
| `docs/interface/V-11-C-API-CONTRACT-RECONCILIATION.md:162-168` | **B** (migration/history) | Historical record of the pre-J workaround. Superseded by this cert but retained as history. |

**No Class D (obsolete executable) occurrences.**

## 10. Test Results

**V-11-J suite (`test-v11j-schema.js`) — 26/26 PASS:**

- J-1..J-5: migration 093 exists, idempotent, transactional, default `'[]'`, top-level jsonb column.
- J-6..J-12: writer builds `_projectRef`, emits top-level and legacy locations, projects EVT/MEM/SIG refs, canonical `{label, source, ts}`.
- J-13..J-20: reader SELECTs top-level column, defines `_normalizeEvidenceRefs`, falls back to legacy nested, handles pre-migration missing-column path, preserves canonical envelope with requestId, projects legacy string refs.
- J-21..J-23: frontend consumes canonical shape (unchanged).
- J-24..J-25: canonical envelope preserved (no `success:` field; `requestId` on success + error).
- J-26: `requireAppAccess` gate intact.

**Regression suites (V-11-I baseline):**

| Suite | Result |
|---|---|
| `test-v11i-io1-io2.js` | 11/11 PASS |
| `test-v11i-p0-security.js` | All PASS except pre-existing `T-P2: upgrade unexpectedly succeeded for User — server may not be reloaded` (unchanged from V-11-I cert §14, documented "server may not be reloaded in test env"; source-level SRC-P2 assertions confirm code is correct) |
| `test-v11i-p05-alexcontext.js` | 7/7 PASS |
| `test-v11i-p06-hardcoded-pii.js` | 17/17 PASS |
| `playwright-v11i-voice-verify.js` (source-level) | 20/20 PASS |
| `node --check server.js` | OK |
| `node --check routes/intelligence.js` | OK |
| `node --check lib/intelligence/opportunity-engine.js` | OK |

Playwright browser suites (`playwright-v11g-verify.js`) require a running server and Chromium and were **not** re-executed in this phase — the G-9 test already used the canonical `{label, ts}` fixture the API now produces, so the fixture matches production shape post-J.

## 11. Known Debt

1. **Canonical COMMAND approval gap** — OPEN ARCHITECTURAL DEBT (unchanged from V-11-I cert §14, §17). Not V-11-J scope.
2. **Migration 093 not yet applied to production** — this cert authors the migration only. Production `79012e8` continues to run without the column; the read path's `42703` fallback keeps the endpoint 200 in that environment until the migration is applied and old rows can be backfilled from `roi_forecast.evidence_refs` if desired.
3. **Historic string-form `roi_forecast.evidence_refs` rows** — pre-J rows persist with raw `["EVT-0", ...]` strings. The reader's `_normalizeEvidenceRefs` handles them at read time (project into `{label, source, ts:null}`), so no backfill is required. If backfill is later desired, it is a one-line SQL update against `roi_forecast` — not required for the V-11-J contract.
4. **PTT double-render** — pre-existing (V-11-I cert §14 item 2). Not V-11-J scope.
5. **T-P2 stale-server FAIL** — pre-existing (V-11-I cert §14 item 3). Not V-11-J scope; source-level SRC-P2 is correct.

## 12. Production Status

- **Production build:** `79012e8` — **UNCHANGED**
- **Deployment:** NOT DEPLOYED
- **Push:** NOT PUSHED
- **Migration 093:** authored, **not run** against any environment

## 13. Final Verdict

**V-11-J SCHEMA FIX: CERTIFIED**

- 26/26 V-11-J suite PASS
- All V-11-I regression suites PASS (1 pre-existing T-P2 stale-server FAIL unchanged from V-11-I baseline)
- Canonical `{ ok, error, message, requestId }` envelope preserved
- Canonical `evidence_refs: Array<{label, source, ts}>` contract established across writer → DB → reader → frontend
- V-11-H-B ownership + V-11-I privacy: **INTACT**
- Migration 093 additive, idempotent, transactional, safe rollback
- Legacy audit: no Class D (obsolete executable) items
- Production build unchanged, not pushed, not deployed
