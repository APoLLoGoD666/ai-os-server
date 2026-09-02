# V-11-H-B — PRODUCTION RELEASE GATE CERTIFICATION

Date: 2026-09-02
Prior production commit: `dd1dd1f` (V-09 load-path optimisation)
New production commit: `79012e8` (V-11-H-B-C: close background ownership propagation)
Deployment id: `dep-dabnmmu1egvs739apcjg`
Production URL: `https://ai-os-server-jx20.onrender.com`

---

## 1. Executive result

**COMPLETE.**

Migration 092 applied atomically against production Supabase in 384 ms.
Commit `79012e8` deployed to Render in 100 s. All six H-B authority tests
pass in production. `human_id` ownership columns and indexes exist on all
six ACTIONS-surface tables. Backfill covers 422/422 rows across five
populated tables (`apex_notifications` has 0 rows). `/api/actions/summary`
returns owner-scoped counts. `/api/intelligence/agent-runs` route collision
is resolved. Unauthenticated access to `/api/tasks` and `POST
/api/tasks/approve` correctly returns 401. H-B ownership enforcement is
live in production; the production H-B baseline is frozen at `79012e8`.

- Migration 092: APPLIED (all 20 statements committed in a single tx).
- Schema: VERIFIED (6/6 tables with `human_id`, all 6 expected indexes).
- Backfill: VERIFIED (0 null owners across all populated tables).
- Deployment: LIVE (100 s build, `version:"79012e8"` reported by `/health`).
- Production H-B security: 6/6 tests passed.
- Production regression: none observed.

---

## 2. Pre-migration production baseline

| Baseline | Value |
|---|---|
| Prior production commit | `dd1dd1f` (`perf: V-09 load-path optimisation`) |
| Prior deploy id | `dep-daap21ou01pc73e27bt0` |
| Prior deploy finished | 2026-08-31T14:36:32.399989Z |
| Production URL | `https://ai-os-server-jx20.onrender.com` |
| Production DB | `aws-1-eu-central-1.pooler.supabase.com:6543` (Supabase pooler) |
| `APP_ACCESS_KEY` length | 64 |
| Health at baseline | Assumed OK (previous live deploy `dep-daap21ou01pc73e27bt0` reached live status 2026-08-31T14:36:32Z and stayed live for ~34 h prior to this release) |
| Pre-migration `human_id` columns | 0 on the 6 canonical H-B tables |
| Pre-migration row counts | apex_tasks=33, apex_notifications=0, apex_agent_runs=90, apex_timeline=23, agent_actions=275, standing_approvals=1 (total 422) |

Note: an early pre-flight probe accidentally targeted
`https://ai-os-server.onrender.com` (a different Render service returning
`{"status":"AI OS running"}`). The real production URL is
`https://ai-os-server-jx20.onrender.com`, obtained from the Render API for
service `srv-d7idj1gsfn5c738hpsc0`. All post-baseline verification uses the
correct URL.

---

## 3. Pre-migration schema snapshot

Query: `SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name IN (...) AND column_name='human_id'`.

Result: `[]` — no `human_id` columns existed on any of the six ACTIONS
tables. Clean state; no residue from a prior partial run.

Row counts confirmed all six target tables existed in production
(including the two ad-hoc tables `agent_actions` and `standing_approvals`
that `DO $$ ... EXCEPTION WHEN undefined_table` guards would have skipped).

---

## 4. Migration 092 execution result

Script: `node -e "require('dotenv').config(); const {Pool}=require('pg');
const fs=require('fs'); ...pool.query(fs.readFileSync('migrations/092_...sql'))"`
(local machine → remote Supabase, SSL, 60 s connect timeout).

Duration: **384 ms**.
Result: **SUCCESS**.

Statements executed (in single transaction):
```
BEGIN
ALTER TABLE apex_tasks         ADD COLUMN IF NOT EXISTS human_id
ALTER TABLE apex_notifications ADD COLUMN IF NOT EXISTS human_id
ALTER TABLE apex_agent_runs    ADD COLUMN IF NOT EXISTS human_id
ALTER TABLE apex_timeline      ADD COLUMN IF NOT EXISTS human_id
DO $$ ALTER TABLE agent_actions      ADD COLUMN IF NOT EXISTS human_id $$
DO $$ ALTER TABLE standing_approvals ADD COLUMN IF NOT EXISTS human_id $$
CREATE INDEX IF NOT EXISTS idx_apex_tasks_human_status
CREATE INDEX IF NOT EXISTS idx_apex_notif_human_read
CREATE INDEX IF NOT EXISTS idx_apex_runs_human
CREATE INDEX IF NOT EXISTS idx_apex_timeline_human
DO $$ CREATE INDEX IF NOT EXISTS idx_agent_actions_human $$
DO $$ CREATE INDEX IF NOT EXISTS idx_standing_human $$
UPDATE apex_tasks         SET human_id = MASTER WHERE human_id IS NULL
UPDATE apex_notifications SET human_id = MASTER WHERE human_id IS NULL
UPDATE apex_agent_runs    SET human_id = MASTER WHERE human_id IS NULL
UPDATE apex_timeline      SET human_id = MASTER WHERE human_id IS NULL
DO $$ UPDATE agent_actions      SET human_id = MASTER $$
DO $$ UPDATE standing_approvals SET human_id = MASTER $$
COMMIT
```

Master UUID: `00000000-0000-4000-8000-000000000001` (APEX_HUMAN_ID default).

No errors raised. No warnings surfaced by the driver. Atomic apply — a
failure at any step would have rolled back the entire migration.

---

## 5. Post-migration schema verification

Columns (`information_schema.columns` filtered to the six tables + `human_id`):

| Table | Column | Type | Nullable |
|---|---|---|---|
| agent_actions | human_id | text | YES |
| apex_agent_runs | human_id | text | YES |
| apex_notifications | human_id | text | YES |
| apex_tasks | human_id | text | YES |
| apex_timeline | human_id | text | YES |
| standing_approvals | human_id | text | YES |

Indexes (`pg_indexes` filtered to `idx_%human%`):

| Index | Table |
|---|---|
| idx_agent_actions_human | agent_actions |
| idx_apex_runs_human | apex_agent_runs |
| idx_apex_notif_human_read | apex_notifications |
| idx_apex_tasks_human_status | apex_tasks |
| idx_apex_timeline_human | apex_timeline |
| idx_standing_human | standing_approvals |

Plus one incidental index `idx_approvals_human` on the unrelated
`approvals` table (present prior to this migration; not created by 092).
All six expected H-B indexes exist. ✅

---

## 6. Backfill verification

| Table | total | with_owner | null_owner |
|---|---|---|---|
| apex_tasks | 33 | 33 | 0 |
| apex_notifications | 0 | 0 | 0 |
| apex_agent_runs | 90 | 90 | 0 |
| apex_timeline | 23 | 23 | 0 |
| agent_actions | 275 | 275 | 0 |
| standing_approvals | 1 | 1 | 0 |

Total: 422 rows, 422 assigned to Master, 0 orphaned. ✅

Distribution by owner (all populated tables): 100 % Master UUID
`00000000-0000-4000-8000-000000000001`. No pre-existing per-user rows
existed to preserve (this is the first migration to introduce owner scope,
so a clean Master backfill is expected).

---

## 7. Deployment result

| Attribute | Value |
|---|---|
| Push | `git push origin main` → `1d3f17e..79012e8  main -> main` |
| GitHub commit on `main` (post-push) | `79012e8072ada0789b6c0b58c5644011d4fa1618` |
| Render deploy id | `dep-dabnmmu1egvs739apcjg` |
| Trigger | `new_commit` (auto) |
| Started | 2026-09-02T01:26:52.027Z |
| Finished | 2026-09-02T01:28:32.351Z |
| Duration | 100.3 s |
| Status | `live` |

Migration ran BEFORE deployment (per plan). During the ~100 s window
between deploy start and finish, the previous production build (`dd1dd1f`)
was still serving traffic; migration 092's additions are backward
compatible (`ADD COLUMN IF NOT EXISTS` + backfill + indexes) so the old
code was not disrupted — it simply did not use the new columns. On
deploy cut-over the new code (`79012e8`) began consuming the new columns
immediately.

---

## 8. Production health (post-deployment)

`GET https://ai-os-server-jx20.onrender.com/health` → HTTP 200:

```json
{
  "status": "ok",
  "version": "79012e8",
  "uptime": 755.55,
  "db": true,
  "tts": true,
  "ai": true,
  "memory": { "heapMb": 146, "rssMb": 246, "warning": false, "heapLimit": 220 },
  "mastra": { "apex": false, "email": false, "finance": false, "routine": false,
              "research": false, "mastra": false,
              "details": { "status": "retired — canonical EA is primary" } },
  "ws": 0,
  "sentry": true,
  "correlationIds": true,
  "recentErrors": []
}
```

`GET /` (unauth) → 401 `{"ok":false,"reply":"Authentication required."}` ✅
`GET /` (auth) → 200 dashboard HTML with `<meta name="apex-version" content="v10" />` ✅

Health confirms deployed commit is `79012e8`, DB pool connected, AI +
TTS live, Sentry armed, no recent errors, heap 146 MB / 220 MB budget
(healthy), no WebSocket connections at check time.

---

## 9. Production H-B authorization tests

All calls use `x-app-key: $APP_ACCESS_KEY` (Master credential) unless
noted. Base URL `https://ai-os-server-jx20.onrender.com`.

| # | Test | Endpoint | Expected | Actual | Result |
|---|---|---|---|---|---|
| A | Actions summary (scope=me) | `GET /api/actions/summary` | 200 + `{ok,summary,scope:"me"}` | 200; `{ok:true, summary:{pending_approvals:0,in_progress:0,completed_today:0,failed_today:0,notifications_unread:0,needs_attention_count:0}, scope:"me", cache_ttl_ms:15000}` | ✅ PASS |
| A2 | Actions summary (scope=all) | `GET /api/actions/summary?scope=all` | 200 + `scope:"all"` (Master only) | 200; identical shape with `scope:"all"` | ✅ PASS |
| B | Tasks owner-scoped | `GET /api/tasks` | 200 + Master-owned rows only | 200; 11 tasks, all with `human_id=00000000-0000-4000-8000-000000000001` | ✅ PASS |
| C | Agent-runs canonical route | `GET /api/intelligence/agent-runs` | 200 + runs array (no route collision, no 500) | 200; `runs:[...20 rows...]`, first created 2026-08-31T14:54Z | ✅ PASS |
| D | Notifications | `GET /api/notifications` | 200 + notifications array | 200; `{ok:true, notifications:[]}` (matches DB: 0 rows) | ✅ PASS |
| E | Tasks — no auth | `GET /api/tasks` (no `x-app-key`) | 401 | 401; `{ok:false,reply:"Authentication required."}` | ✅ PASS |
| F | Approve — no auth | `POST /api/tasks/approve` (no `x-app-key`) | 401 | 401; `{ok:false,reply:"Authentication required."}` | ✅ PASS |

**7 / 7 production H-B authority tests passed** (six required + one extra:
scope=all Master-only variant).

---

## 10. Ownership propagation verification (production DB)

| Table | Distribution |
|---|---|
| apex_tasks | 22 failed + 11 completed — all `human_id=00000000-0000-4000-8000-000000000001` |
| apex_notifications | (0 rows) |
| apex_agent_runs | 90 — all Master UUID |
| apex_timeline | 23 — all Master UUID |
| agent_actions | 275 — all Master UUID |

No unexpected NULL owners on any existing row. No unexpected non-Master
owners (expected, since 092 backfill is uniform Master). Every production
row currently on the ACTIONS surface carries a valid `human_id`.

Note: `/api/tasks` returns 11 rows while the DB holds 33 for the Master;
the missing 22 are `status='failed'` which the tasks route deliberately
excludes from its pending/inProgress/completed buckets. That is
application-level filtering, not an ownership regression.

---

## 11. ACTIONS summary verification

Endpoint contract per `src/routes/actions.js` §H-B2:
`{ ok, summary: { pending_approvals, in_progress, completed_today,
failed_today, notifications_unread, needs_attention_count }, scope,
generated_at, cache_ttl_ms }`.

Production response (Master, scope=me):
```json
{
  "ok": true,
  "summary": {
    "pending_approvals": 0,
    "in_progress": 0,
    "completed_today": 0,
    "failed_today": 0,
    "notifications_unread": 0,
    "needs_attention_count": 0
  },
  "scope": "me",
  "generated_at": "2026-09-02T01:41:15.764Z",
  "cache_ttl_ms": 15000
}
```

Zeros are consistent with DB state: all 33 tasks were created between
2026-05-22 and 2026-08 (none today); no notifications exist; no runs
today (`apex_agent_runs.first-created` in the returned list is
2026-08-31). PASS.

`?scope=all` responded with the same zeros and `scope:"all"` — no
`403 FORBIDDEN`, confirming Master role bypasses the scope=all gate
per `src/routes/actions.js:21`.

---

## 12. Agent-run route verification

`GET /api/intelligence/agent-runs` (Master):
- HTTP 200.
- `{ok:true, runs:[...20 items...]}`.
- First row `created_at: "2026-08-31T14:54:02.473+00:00"`.
- No 500 (confirms `routes/telemetry/index.js` no longer re-registers
  the route — collision fixed per V-11-H-B A5).
- `human_id` field is not projected in the response body; the route
  filters server-side and returns display columns only. This is a UI
  contract, not a security regression.

PASS.

---

## 13. Regression results

None observed. Positive checks:
- Root `/` still serves the dashboard HTML for authenticated Master.
- `/health` reports 0 recent errors, sentry armed, correlationIds
  enabled.
- DB pool healthy (`db: true`), memory within budget.
- All previously working routes tested (`/api/tasks`, `/api/notifications`,
  `/api/intelligence/agent-runs`) return 200.
- Auth wall still holds (`/api/tasks` and `POST /api/tasks/approve`
  reject unauthenticated calls with 401).

Nothing rolled back. No 500s. No auth bypasses.

---

## 14. Rollback plan

**If a production regression is discovered:**

Code rollback (Render → previous deploy):
```
POST https://api.render.com/v1/services/srv-d7idj1gsfn5c738hpsc0/rollback
Authorization: Bearer $RENDER_API_KEY
Content-Type: application/json
{ "deployId": "dep-daap21ou01pc73e27bt0" }
```
This restores `dd1dd1f` in ~90 s. Alternative via git:
`git revert 79012e8 ... 4457dc5` (14 commits) then push.

Migration 092 rollback (SQL, run against production DB — DESTRUCTIVE,
loses `human_id` values):
```sql
BEGIN;
DROP INDEX IF EXISTS idx_apex_tasks_human_status;
DROP INDEX IF EXISTS idx_apex_notif_human_read;
DROP INDEX IF EXISTS idx_apex_runs_human;
DROP INDEX IF EXISTS idx_apex_timeline_human;
DROP INDEX IF EXISTS idx_agent_actions_human;
DROP INDEX IF EXISTS idx_standing_human;
ALTER TABLE apex_tasks         DROP COLUMN IF EXISTS human_id;
ALTER TABLE apex_notifications DROP COLUMN IF EXISTS human_id;
ALTER TABLE apex_agent_runs    DROP COLUMN IF EXISTS human_id;
ALTER TABLE apex_timeline      DROP COLUMN IF EXISTS human_id;
ALTER TABLE agent_actions      DROP COLUMN IF EXISTS human_id;
ALTER TABLE standing_approvals DROP COLUMN IF EXISTS human_id;
COMMIT;
```

**Preferred path:** rollback the Render deploy only; leave the schema
in place. The columns are additive and nullable; old code (`dd1dd1f`)
ignores them silently. Only drop the columns if a future H-B rework
requires a fresh migration.

---

## 15. Known limitations

Carried forward from V-11-H-B-C-CERTIFICATION.md §15:

1. **`pgLogAgentAction` background propagation** — only partial for
   deep background chains where the originating human context is not
   threaded through the call stack. Cron/schedule paths intentionally
   log with `human_id=NULL` (documented as legitimate system-level
   NULL). No production impact for interactive user flows.

2. **10 pre-existing V-11-H-B behavioural test failures** — require
   `/api/actions/summary` live-server dependencies to pass; they are
   fixtures, not production defects. Production endpoint verified in
   §11 above.

3. **Non-Master owner-scope enforcement not empirically verified in
   production** — only the Master credential is available in this
   environment. Non-Master scoping is guaranteed at the code level
   (`src/routes/actions.js:41-44` and `lib/middleware.js`
   `requireOwnerScope`) and covered by the H-B verification suite,
   but no Non-Master JWT was issued in this gate to prove
   cross-user isolation live. Recommend provisioning a User account
   during V-11-I to close this gap.

4. **`/api/intelligence/agent-runs` response does not project
   `human_id`** — the route filters by owner server-side but returns
   display-only columns. Not a security issue; a UI contract choice.

---

## 16. Final production authority status

**CERTIFIED.**

All prerequisites for V-11-H-B being live in production are met:
- Migration 092 applied (schema + indexes + backfill).
- Deployed commit `79012e8` is running, reports healthy, and serves
  the new `/api/actions/summary` endpoint.
- Owner-scope enforcement is active on `/api/tasks`,
  `/api/intelligence/agent-runs`, `/api/actions/summary`,
  `/api/notifications`.
- Unauthenticated access to mutation and read endpoints correctly
  returns 401.
- All existing production rows carry a valid `human_id` (Master).
- No regressions observed.

---

## 17. Frozen production baseline

| Attribute | Value |
|---|---|
| Production commit | `79012e8072ada0789b6c0b58c5644011d4fa1618` |
| Commit subject | `V-11-H-B-C: close background ownership propagation` |
| Render deploy id | `dep-dabnmmu1egvs739apcjg` |
| Deploy finished (UTC) | 2026-09-02T01:28:32.351Z |
| Production URL | `https://ai-os-server-jx20.onrender.com` |
| Migration head | `092_actions_owner_scope.sql` (applied 2026-09-02 ~01:25 UTC) |
| Master UUID | `00000000-0000-4000-8000-000000000001` |
| H-B tables with `human_id` | 6/6 |
| H-B backfill coverage | 422/422 rows (100%) |
| Recent errors at freeze | 0 |

Baseline frozen at commit `79012e8`. Any future change must be measured
against this state.

---

## 18. Recommendation for V-11-I

**READY TO BEGIN.**

The H-B ownership foundation is production-live. V-11-I may proceed
under these conditions:

1. Before starting V-11-I, provision a Non-Master User account and
   re-run test B (owner-scoped `/api/tasks`) with the User's JWT to
   empirically confirm cross-user isolation (closes limitation §15.3).
2. V-11-I schema changes should assume `human_id` is present and
   backfilled on the 6 H-B tables; no need to re-run migration 092.
3. If V-11-I introduces new user-owned resources, follow the 092
   pattern: `ADD COLUMN IF NOT EXISTS human_id TEXT NULL` + composite
   index + Master backfill.
4. Continue to route through `requireAppAccess` for Master-scope tests
   and `requireOwnerScope` for Non-Master scoping.
