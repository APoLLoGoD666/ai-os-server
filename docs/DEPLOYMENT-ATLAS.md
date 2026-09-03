# DEPLOYMENT ATLAS
## Document 12 of 17 — Render Deployment Architecture
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## RENDER DEPLOYMENT OVERVIEW

APEX AI OS is deployed on Render via two services defined in `render.yaml`. Deployment is triggered by git push (auto-detect) or via Render API call (POST empty body to deploy endpoint).

---

## RENDER SERVICES (render.yaml)

| Service | Name | Type | Purpose |
|---|---|---|---|
| 1 | ai-os-server | Web Service (Node.js) | Primary Express application |
| 2 | apex-ai-sidecar | (inferred — web or worker) | Supporting sidecar service |

**ai-os-server:** Main APEX AI OS service. Runs server.js. Receives all HTTP traffic.

**apex-ai-sidecar:** Purpose and configuration not fully detailed in census evidence. Likely handles background processing, event consumption, or specialized tasks that would block the main process.

---

## DEPLOY TRIGGER METHODS

| Method | Mechanism | Primary? |
|---|---|---|
| Git push auto-detect | Render watches connected Git repo; auto-deploys on push to configured branch | YES (primary) |
| Render API POST | COMMITTER stage calls Render API with empty body to trigger deploy | YES (pipeline use) |

### COMMITTER Stage Deploy Call

```
orchestrator.js COMMITTER stage
    └─→ git commit -m "[task description]"
        └─→ git push (to GitHub remote)
            └─→ Render auto-detects push → starts deploy
            AND/OR
            └─→ POST to Render API (empty body) → explicit trigger
```

**Dual trigger risk:** If both auto-detect and API trigger fire, a deploy may be triggered twice. Render deduplicates if the same commit is already deploying.

---

## DEPLOY TIMELINE

| Phase | Duration | Notes |
|---|---|---|
| Render receives trigger | ~0s | |
| Build (npm install + node checks) | ~60-90s | Estimated |
| Startup (server.js initialization) | ~10-30s | Includes deferred Mastra init timer |
| **Total baseline** | **~145s** | Confirmed from Phase 29B analysis |
| Cold start (free/hobby tier) | +additional | Render free tier has cold start latency |

**Service tier:** Free/hobby tier suspected based on ~145s deploy time (paid tiers typically faster).

---

## PHASE 29B INCIDENT (Post-Deploy Crash)

**Incident type:** MODULE_NOT_FOUND crash on startup
**Cause:** A module was required in server.js but the file path was incorrect or the file didn't exist
**Detection:** Server crashed on first request after deploy
**Resolution:** Auto-rollback by Render to previous deploy
**Zero downtime achieved:** Yes (auto-rollback restored service)
**Gap identified:** `node --check` (used by TESTER and VALIDATOR stages) ONLY catches syntax errors. `require()` path resolution errors are NOT caught until runtime.

### Pre-Deploy Checklist Gap

| Check | What It Catches | MODULE_NOT_FOUND? |
|---|---|---|
| node --check (VALIDATOR) | Syntax errors | NO |
| node --check (TESTER per-file) | Syntax errors | NO |
| Actual `node server.js` startup | Everything including require() | YES (but only done on Render) |

**Recommendation:** Add a startup smoke test that actually loads server.js in a subprocess before committing.

---

## AUTO-ROLLBACK BEHAVIOR

Render provides automatic rollback when a deploy fails health checks:
1. New deploy starts
2. If health check (GET /api/healthz or /api/ready) fails repeatedly during startup → Render marks deploy as failed
3. Render reverts to previous successful deploy
4. Previous deploy serves traffic (zero downtime if previous was healthy)

**Health check endpoints:** /api/healthz (returns 200 if service alive), /api/ready (returns 200 if ready to serve)
**Status:** Both confirmed UNAUTHENTICATED in routes/operations.js

---

## MIGRATION STRATEGY

| Aspect | Detail |
|---|---|
| Migration files | SQL files in migrations/ directory (27 files, 001-027) |
| Execution | Manual or via deploy trigger (NOT auto-run by Render build) |
| Timing | Applied to Supabase Postgres; must be applied BEFORE code that depends on new schema |
| Risk | Schema-code mismatch if migration not applied before deploy |
| Tool | Supabase SQL editor or migration runner script |
| seed-founder-profile.js | Seed script for initial founder profile data |

**Note:** No automated migration runner confirmed in render.yaml build command. Migrations appear to be manually applied or triggered via a separate process.

---

## ENVIRONMENT VARIABLES (RENDER DASHBOARD)

All environment variables are managed in the Render dashboard. They are NOT committed to the repository.

| Env Var | Purpose | Required? |
|---|---|---|
| ANTHROPIC_API_KEY | Claude AI API | CRITICAL |
| SUPABASE_URL | Supabase project URL | CRITICAL |
| SUPABASE_SERVICE_ROLE_KEY | Supabase admin key | CRITICAL |
| SUPABASE_ANON_KEY | Supabase anon key | HIGH |
| SUPABASE_BUCKET | Storage bucket name | HIGH |
| DATABASE_URL | Direct Postgres connection string | HIGH |
| APP_ACCESS_KEY | App-level API key | HIGH |
| CRON_SECRET | Cron endpoint protection | HIGH |
| AGENT_SECRET | JWT signing secret | CRITICAL |
| AUTONOMY_LEVEL | Agent autonomy (0-3) | HIGH |
| WORKSPACE_DIR | Agent workspace directory | HIGH |
| OBSIDIAN_URL | Obsidian API URL | MEDIUM |
| OBSIDIAN_API_KEY | Obsidian authentication | MEDIUM |
| OBSIDIAN_VAULT_PATH | Vault path | MEDIUM |
| NOTION_API_KEY | Notion integration | LOW |
| SLACK_BOT_TOKEN | Slack notifications | LOW |
| GOOGLE_API_KEY | Gemini voice API | MEDIUM |
| GMAIL_CLIENT_ID | Gmail OAuth client ID | LOW |
| GMAIL_CLIENT_SECRET | Gmail OAuth secret | LOW |
| GMAIL_REFRESH_TOKEN | Gmail OAuth refresh | LOW |
| GITHUB_TOKEN | GitHub API (COMMITTER) | HIGH |
| SENTRY_DSN | Error tracking | MEDIUM |
| SLOW_QUERY_MS | Slow query threshold | LOW |
| CONTAINER_MEMORY_MB | Memory limit config | LOW |
| BYPASS_DASHBOARD_AUTH | Dashboard auth bypass | DANGEROUS (never set in prod) |
| COGNITIVE_CRONS_ENABLED | Enable cognitive crons | MEDIUM |
| JWT_SECRET | (implied — may be same as AGENT_SECRET) | HIGH |
| DASHBOARD_PASSWORD | Dashboard login password | HIGH |
| ANTHROPIC_MODEL | Optional model override | LOW |
| PIPELINE_BUDGET_USD | Agent cost budget | MEDIUM |

**Total confirmed env vars:** 30

---

## SUPABASE ARCHITECTURE (EXTERNAL)

| Aspect | Detail |
|---|---|
| Hosting | Supabase cloud (external to Render) |
| Management | Supabase dashboard (independent of Render) |
| Postgres | Supabase-managed Postgres instance |
| Storage | Supabase Storage (S3-compatible) |
| RLS | Row Level Security — enabled on documents and memory tables (setImmediate on startup) |
| Connectivity | Supabase JS client via SUPABASE_URL + service role key |
| Direct SQL | pg Pool via DATABASE_URL (direct connection string) |
| Backup | Supabase provides automatic daily backups (standard tier) |

---

## BACKGROUND PROCESSES (DEPLOYMENT CONTEXT)

Processes that start during server.js initialization:

| Process | Trigger | Notes |
|---|---|---|
| Mastra init | setTimeout 5min after startup | Deferred; may miss if Render cold-starts and no traffic |
| Supabase RLS enable | setImmediate on startup | Runs on every startup |
| Civilization runtime | On-demand only | Not auto-started on deploy |
| Reality loop | On-demand only | Not auto-started on deploy |
| Cognitive crons | node-cron schedule (Sun 9-11am UTC) | Only if COGNITIVE_CRONS_ENABLED=true |
| External Render cron | POST /cron/run-schedules | Configured in Render dashboard |

---

## DEPLOYMENT RISK REGISTER

| Risk | Detail | Severity |
|---|---|---|
| MODULE_NOT_FOUND not caught pre-deploy | node --check doesn't validate require() paths | HIGH |
| Migration not applied before deploy | Schema mismatch between code and DB | HIGH |
| Mastra 5-min deferred init | May never complete on cold-start restarts | MEDIUM |
| Render free tier cold starts | Service spins down; first request has high latency | MEDIUM |
| Dual deploy trigger | git push + API trigger both fire | LOW |
| WORKSPACE_DIR path | Agent worktree path must exist on Render filesystem | MEDIUM |
| Secret rotation | Changing AGENT_SECRET invalidates all existing JWT cookies simultaneously | HIGH |
