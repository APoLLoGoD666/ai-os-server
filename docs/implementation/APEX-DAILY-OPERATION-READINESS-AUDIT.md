# APEX-DAILY-OPERATION-READINESS-AUDIT.md
# APEX One Platform — Daily Operation Readiness Audit

**Phase:** Phase 0 Authority Audit (Re-run)
**Date:** 2026-08-19
**Question:** "If we wanted to run APEX daily tomorrow, what prevents it?"

---

## ANSWER: APEX CAN RUN TODAY IN PRODUCTION, BUT THE CONSTITUTIONAL LAYER DOES NOT EXIST IN PRODUCTION

The server starts, routes work, agents execute, memory persists, and the dashboard loads. APEX is operational as a cloud-hosted personal AI OS at the 2026-07-11 commit level. However, the constitutional pipeline (Wave 3) that was implemented in the local working tree has NEVER been committed to git and therefore NEVER deployed to Render. Production APEX is running without the constitutional bootstrap chain.

---

## 1. WHAT WORKS IN PRODUCTION TODAY

| Feature | Status | Evidence |
|---------|--------|---------|
| Server starts and handles HTTP | WORKS | Committed 2026-07-11; Render deployed |
| Chat with Claude models | WORKS | ANTHROPIC_API_KEY; models wired |
| Agent task creation and execution | WORKS | lib/agent-task-cycle.js; agent_tasks table |
| Document storage / retrieval | WORKS | Supabase documents table |
| Memory read/write (13 layers) | WORKS | lib/memory/gateway.js → Supabase |
| Scheduled tasks | WORKS | agent_schedules via pg_helpers |
| Push notifications | WORKS | sw.js + web-push + VAPID |
| Dashboard UI (1.2MB) | WORKS | Served statically; APEX MIND v2 |
| Reality Architecture page | WORKS | Added 2026-07-11 |
| Ministry crons (5) | WORKS | lib/cron-scheduler.js; firing on schedule |
| Supreme Council cron | WORKS | Weekly, Mondays 09:00 UTC |
| Self-Expansion Engine | WORKS | Weekly gap scan, lib/expansion/ |
| Sentry error tracking | WORKS | instrument.js |
| Render cron (registry health) | WORKS | registry-cron.js, every 30 min |
| Constitutional bootstrap (Wave 3) | DOES NOT EXIST IN PRODUCTION | Files untracked; migration 080 not applied |

---

## 2. BLOCKERS — CONSTITUTIONAL PIPELINE NOT DEPLOYED

### CRITICAL-0: Wave 3 files have never been committed

**Impact:** The constitutional pipeline exists only in the local working tree. Production Render has NONE of it.

Missing from production:
- `lib/civilization/deliberation-registry.js` [??]
- `lib/civilization/rt12-bootstrap.js` [??]
- `lib/civilization/rt13-bootstrap.js` [??]
- `lib/civilization/civilization-understanding-registry.js` [??]
- `lib/runtime/constitutional-store.js` [??]
- `migrations/080_constitutional_records.sql` [??]
- `migrations/081_obs_record_id_propagation.sql` [??]
- `migrations/082_domain_id_propagation.sql` [??]

Every constitutional audit, every constitutional record write, every Wave 3 claim — none of it exists in the deployed system. D8 INV-6 is not merely incomplete; it is non-existent in production.

**Fix required:** Commit all `??` files and push to main. Apply migrations 080–082 to production Supabase.

---

## 3. BLOCKERS — UNCHANGED FROM AUG-4 AUDIT

### BLOCKER-1: Missing Email Integration

- `agent-system/email_agent.js` requires Gmail OAuth token
- `scripts/get_gmail_token.js` is a manual one-time interactive script
- Token stored in Supabase `gmail_tokens` table; auto-refresh unverified
- **Fix:** Complete Gmail OAuth flow once; verify token persistence

### BLOCKER-2: Obsidian Vault Connection Tunnel-Dependent

- `OBSIDIAN_URL` must point to a local tunnel (Obsidian Local REST API + ngrok/tailscale)
- Breaks when local machine is offline
- orchestrator.js imports obsidian-memory.js directly (not via gateway)
- **Fix:** Accept Supabase-primary; vault writes as secondary. Document this as architectural decision.

### BLOCKER-3: Constitutional Loop Not Closed

- No Stage 4 crossing has occurred
- No ObservedConsequenceRecord, OAR-TSR, or ReflectionTriggerRecord exists (anywhere)
- Wave 4 (T4-01) is required to close this loop
- **Note:** Now doubly blocked — Wave 3 must be deployed before Wave 4 can begin

---

## 4. NEW GAPS FOUND IN THIS AUDIT

### GAP-NEW-1: pg pool scope expansion creates silent risk

- `lib/pg_database.js` is now imported by: `lib/cron-scheduler.js`, `lib/event-consumer.js`, `lib/outbox-relay.js`, `lib/startup/index.js` (×4), `lib/startup.js` (×2)
- These modules may be writing data via direct TCP pg pool connection, bypassing Supabase RLS
- Was "RLS only" in Aug-4 audit; scope expanded with no audit trail
- **Fix:** Audit each pg pool importer; confirm which operations use pool vs Supabase client

### GAP-NEW-2: src/routes/ duplication

- `src/routes/` contains `agent-schedules.js`, `agent-tasks.js`, `auth.js`, `chat.js`
- These are core functionality duplicates of `routes/` counterparts
- Unknown if these are mounted in server.js or are orphaned
- Import `lib/pg_helpers.js` — so they are wired to Supabase data
- **Fix:** Confirm if server.js mounts src/routes/; if orphaned, archive

### GAP-NEW-3: root runtime/ directory

- `runtime/` exists at repository root (distinct from `lib/runtime/`)
- orchestrator.js imports `../runtime/task-router` (relative path from agent-system/)
- Role is UNKNOWN; not in previous audit
- **Fix:** Classify runtime/ contents in T4-INV or equivalent

### GAP-NEW-4: lib/startup/index.js unknown

- Exists as a secondary startup module distinct from `lib/startup.js`
- Imported by pg_database.js consumers (×4)
- Role in boot sequence is UNKNOWN
- **Fix:** Read lib/startup/index.js to determine boot order and pg pool init responsibility

### GAP-NEW-5: lib/constitution/ baseline.json deleted

- `lib/constitution/baseline.json` is deleted (`D` in git status)
- 68 files in lib/constitution/ depend on baseline configuration
- If any of those files import baseline.json, they will fail at require-time
- **Fix:** Verify no runtime-critical file imports baseline.json; commit deletion safely

### GAP-NEW-6: 3 new memory modules unclassified

- `lib/memory/governance-synthesizer.js`, `importance-engine.js`, `policy-extractor.js` are new
- Unknown if they are wired into gateway.js or standalone
- Unknown what tables they write to
- **Fix:** Read each file; classify role and table dependencies

---

## 5. UNCHANGED GAPS FROM AUG-4 AUDIT

| Gap | Status |
|-----|--------|
| No CRON_SECRET env var | Likely still missing (not in committed env) |
| No GITHUB_TOKEN env var | Likely still missing; server.js warning at startup |
| Push notification device registration uncertain | Unchanged |
| Mastra Framework status unknown | Unchanged; delayed 10-min init |
| No real-time event stream end-to-end | lib/viz-broadcaster.js exists; wiring unverified |
| Reality loop disabled | REALITY_LOOP_ENABLED not set in env |
| No local model interface | Anthropic API-only |
| NOTION_API_KEY not set | Notion integration disabled |
| SLACK_BOT_TOKEN not set | Slack integration disabled |

---

## 6. DAILY OPERATION READINESS MATRIX

| Category | Status | Priority |
|----------|--------|---------|
| Core server + API | READY (production) | — |
| Chat + agent execution | READY (production) | — |
| Memory persistence | READY (production) | — |
| Document storage | READY (production) | — |
| Constitutional bootstrap | NOT IN PRODUCTION | CRITICAL |
| Migration 080–082 | NOT APPLIED | CRITICAL |
| Wave 3 files committed | NOT COMMITTED | CRITICAL |
| pg pool scope | EXPANDED — RISK UNKNOWN | HIGH |
| src/routes/ status | UNKNOWN — RISK UNKNOWN | HIGH |
| Email integration | NOT READY | HIGH |
| Obsidian vault sync | NOT READY | HIGH |
| Constitutional loop closure | NOT READY (Wave 4) | HIGH |
| lib/startup/index.js role | UNKNOWN | MEDIUM |
| Push notification delivery | UNCERTAIN | MEDIUM |
| Real-time event stream | NOT READY | MEDIUM |
| Reality loop | DISABLED | MEDIUM |
| New memory modules | UNCLASSIFIED | MEDIUM |
| baseline.json deletion | UNKNOWN RISK | MEDIUM |
| Auth configuration | READY (if JWT_SECRET set) | LOW |
| GitHub integration | NOT READY | LOW |
| Cron protection | NOT READY | LOW |
| Local model fallback | NOT READY (Wave 4 scope) | LOW |
| Notion integration | NOT READY | LOW |
| Slack integration | NOT READY | LOW |

---

## 7. MINIMUM VIABLE DAILY OPERATION CHECKLIST

**Before anything else (constitutional prerequisite):**
- [ ] Commit all `??` untracked files to git
- [ ] Push to main and allow Render to deploy
- [ ] Apply migrations 080, 081, 082 to production Supabase
- [ ] Verify `constitutional_records` table exists after migration

**Environment configuration:**
- [ ] Set `CRON_SECRET` on Render
- [ ] Set `GITHUB_TOKEN` on Render (if agent git push needed)
- [ ] Verify VAPID keys configured and device subscribed
- [ ] Set `REALITY_LOOP_ENABLED=true` after OOM assessment

**Audit and close new risks:**
- [ ] Read `lib/startup/index.js` — determine pg pool boot role
- [ ] Audit src/routes/ — confirm if mounted or orphaned
- [ ] Audit runtime/ directory — classify task-router.js
- [ ] Read 3 new memory modules — classify and confirm table usage
- [ ] Audit each pg pool importer — confirm none bypass RLS on sensitive tables

---

*APEX-DAILY-OPERATION-READINESS-AUDIT.md — Phase 0 Authority Audit (Re-run) — 2026-08-19*
