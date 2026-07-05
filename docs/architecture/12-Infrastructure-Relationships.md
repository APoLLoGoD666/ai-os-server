# 12 — Infrastructure Relationships

**Date:** 2026-07-02  
**Evidence Source:** render.yaml, server.js (startup sequence, env vars), lib/pg_database.js, .mcp.json (CLAUDE.md), CLAUDE.md

---

## Render Deployment

### Services (render.yaml)

**Service 1: ai-os-server**
```yaml
type: web
name: ai-os-server
env: node
buildCommand: npm install --legacy-peer-deps && node scripts/certify.js
startCommand: node --max-old-space-size=220 server.js
healthCheckPath: /health
zeroDowntimeDeploys: false
```

**Key constraints:**
- `--max-old-space-size=220` — hard 220MB V8 heap limit (Render Starter tier constraint)
- `zeroDowntimeDeploys: false` — disabled to prevent OOM from two instances running simultaneously (old at ~280MB RSS + new startup ~340MB = OOM)
- Health check path: `/health` — must return 200 for Render traffic routing
- `--legacy-peer-deps` on install — dependency conflict workaround
- Certification gate blocks deploy on failure

**Service 2: apex-ai-sidecar**
```yaml
type: web
name: apex-ai-sidecar
env: python
buildCommand: pip install -r sidecar/requirements.txt
startCommand: uvicorn sidecar.main:app --host 0.0.0.0 --port $PORT
```

**Purpose:** RAG-Anything Python service  
**Activation requires:** `RAG_SIDECAR_URL` env var on ai-os-server + `OPENAI_API_KEY` on sidecar  
**Status:** UNKNOWN whether configured in production

---

## Memory Budget (220MB Heap)

Key memory consumers and timing strategies:

| Component | Timing | Memory mitigation |
|-----------|--------|------------------|
| server.js startup | Immediate | Static imports minimized |
| lib/governance.js | ~0s (static import in orchestrator) | — |
| services/init.js cascade | At listen | — |
| lib/constitution/watchdog.js | At listen | — |
| Ruflo daemon | +10 min after listen | Child process (separate PID) |
| Mastra agents | +5 min after listen | Lazy load — deferred to reduce startup peak |
| Domain-specific lazy loads | On first use | Lazy require() |

**RSS at steady state:** ~280MB (from render.yaml comment)  
**Startup peak:** ~340MB (from render.yaml comment)  
**Warning threshold in /health:** heapMb > 150

---

## Supabase

**Primary client:** lib/clients.js singleton → `getSupabaseClient()`  
**Connection vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY` fallback)

**pg Pool (raw):** lib/pg_database.js — uses `DATABASE_URL` env var  
- Max 10 connections  
- SSL enforced  
- Slow query logging (>500ms, configurable via SLOW_QUERY_MS)

**pgvector:** Used for embedding similarity search — accessed via raw pg Pool (lib/pg_database.js)

**Database tables confirmed:** See 07-Database-Relationships.md for full list (20+ tables)

**Supabase Storage:** `lib/storage.js` — file/blob storage (separate from DB)

---

## Ruflo

**Installation:** Ruflo v3.7.0-alpha.72

**Auto-start:** `server.js:4706-4716` — spawns Ruflo daemon via `child_process` 10 minutes after listen

**Port:** 3001 (MCP server — no conflict with server.js on port 3000)

**Key paths:**
```
.claude/          — 23 agent definitions, 10 command groups, hooks, helpers
.claude-flow/     — runtime config, sessions, logs, daemon state
.swarm/memory.db  — hybrid vector + SQLite memory store
.mcp.json         — MCP server config
```

**CLI (local binary):**
```
node_modules/.bin/ruflo status
node_modules/.bin/ruflo swarm start
node_modules/.bin/ruflo daemon start/stop
node_modules/.bin/ruflo memory search -q "query"
node_modules/.bin/ruflo task spawn --agent <name> --task "<desc>"
```

**Restriction:** Ruflo swarm NOT auto-started on Render — trigger on demand only

---

## MCP Servers

**Config file:** `.mcp.json`

**Registered servers:**
- `gitnexus` — Code intelligence (3614 symbols indexed)
- `ruflo` — Agent orchestration
- `ruv-swarm` — Agent swarm management
- `flow-nexus` — Flow orchestration

**Consumer:** Claude Code CLI sessions only — NOT server.js runtime

---

## PWA (Progressive Web App)

**Service Worker:** `public/sw.js` — served at `/sw.js` (no auth)

**Manifest:** `public/manifest.json` — served at `/manifest.json`

**iOS PWA fix:** Login form uses native POST redirect (not fetch) to fix WebKit cookie persistence bug

**Offline capability:** Enabled via service worker (exact caching strategy UNKNOWN)

---

## Sentry

**Env var:** `SENTRY_DSN`

**Status check:** `/health` response includes `sentry: !!process.env.SENTRY_DSN`

**Integration:** UNKNOWN — Sentry SDK initialization not confirmed in files read; DSN check implies conditional setup

---

## Slack Alerts

**Module:** `services/slack/slack-alerts.js`

**Exports:** `alertCritical` (confirmed)

**Consumers:**
- server.js: /health handler on DB down (lazy setImmediate)
- lib/governance.js: lazy require at lines 512, 525, 537

**Purpose:** Operational alerting for critical infrastructure events (DB unavailable, governance violations)

---

## Environment Variables (Infrastructure-Critical)

| Variable | Purpose | Module |
|----------|---------|--------|
| DATABASE_URL | Raw pg Pool connection | lib/pg_database.js |
| SUPABASE_URL | Supabase JS client | lib/clients.js |
| SUPABASE_SERVICE_ROLE_KEY | Supabase admin access | lib/clients.js |
| SUPABASE_ANON_KEY | Supabase fallback | lib/clients.js, routes |
| APP_ACCESS_KEY | Primary API auth | lib/middleware.js |
| JWT_SECRET | Cookie JWT signing | lib/middleware.js |
| CRON_SECRET | Cron endpoint auth | lib/middleware.js |
| API_KEY | Scoped lower-privilege key | lib/middleware.js |
| ANTHROPIC_API_KEY | Claude API | lib/clients.js |
| GOOGLE_API_KEY / GEMINI_API_KEY | TTS | routes/tts-gemini.js |
| AUTONOMY_LEVEL | Agent autonomy gate | server.js, lib/agent-step-utils.js |
| SENTRY_DSN | Error monitoring | Server startup |
| RAG_SIDECAR_URL | Python sidecar connection | routes/intelligence.js (inferred) |
| PIPELINE_BUDGET_USD | Cost cap for pipelines | lib/memory/gateway.js |
| SLOW_QUERY_MS | DB slow query threshold | lib/pg_database.js |
| BYPASS_DASHBOARD_AUTH | Dev auth bypass | lib/middleware.js |
| LOCAL_MODE | Local dev DB switch | server.js /health |
| NODE_ENV | Environment flag | lib/middleware.js |

---

## lib/cron-scheduler.js — Cron Infrastructure

**Activated:** server.js:4662 `lib/cron-scheduler.start()`

**Jobs:**
| Job | Schedule | Purpose |
|-----|----------|---------|
| wiki_consolidation | Weekly | Vault + memory consolidation |
| vault_health | Regular | Vault integrity check |
| daily_briefing | Daily | Morning briefing generation |
| weekly_review | Weekly | Weekly cognitive review |
| adaptation_refresh | Weekly | Pattern/behavior refresh |

**Cron execution log:** Stored in `cron_run_log` Supabase table (confirmed from `/api/cron/history` endpoint)

---

## lib/integrity-crons.js — Backup + Reconcile

**Exports:** `{ backup, reconcile, start }`

**Confirmed firing:** On Render (from census)

**DB client:** Own `createClient` (not lib/clients.js singleton)

**Relationship to lib/consolidation-engine.js:** Imports `./consolidation-engine` — separate file from `lib/memory/consolidation-engine` (see 14-Unknown-Relationships.md)

---

## lib/outbox-relay.js — Event Outbox

**Pattern:** Reads pending outbox events → processes → marks done

**DB client:** Own `_sb` singleton (own createClient)

**Interaction with lib/write-with-outbox.js:** write-with-outbox.js writes events that outbox-relay.js processes — but write-with-outbox.js has no confirmed production consumers (see 14-Unknown-Relationships.md)

---

## GIT_SHA

**Source:** Process env or git command at startup

**Used in:** `/health` response as `version`, telemetry factory as `gitSha`

**Purpose:** Deploy-time version tracking

---

## Infrastructure Topology

```
Internet
    │
    ▼
Render CDN / Load Balancer
    │
    ├─► ai-os-server (Node, port 3000, 220MB heap)
    │       │
    │       ├─► Supabase Postgres (DATABASE_URL via pg Pool)
    │       ├─► Supabase JS API (SUPABASE_URL)
    │       ├─► Supabase Storage (lib/storage.js)
    │       ├─► Anthropic API (claude-opus-4-7)
    │       └─► Google/Gemini TTS API
    │
    └─► apex-ai-sidecar (Python/uvicorn, port $PORT)
            │
            └─► RAG-Anything (if OPENAI_API_KEY set)

Local (developer machine)
    │
    ├─► Ruflo daemon (port 3001, spawned 10min after listen)
    └─► MCP servers (gitnexus, ruflo, ruv-swarm, flow-nexus)
```
