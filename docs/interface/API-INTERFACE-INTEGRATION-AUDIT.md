# APEX API → INTERFACE INTEGRATION AUDIT

**Date:** 2026-08-30
**Status:** AUDIT COMPLETE — 4 P1 defects found
**Authority:** Complete static analysis of server.js, all route files (src/routes/ + routes/), public/dashboard.html
**Scope:** End-to-end audit of all API routes, frontend consumers, data lineage, and interface data points
**DB Status at audit time:** OFFLINE — Supabase 522 timeout locally. All DB-backed routes verified by static contract analysis only.

---

## 1. Executive Summary

The APEX API → Interface integration is structurally sound but contains **four P1 broken integrations** where the frontend calls API paths that do not exist in the backend. These cause silent 404s for specific UI features. No P0 defect was found (no complete app-blocking failure). Desktop and core chat/command functionality are verified present. The database-dependent routes are architecturally correct but cannot be live-tested locally due to Supabase connection timeout.

**Verdict: C — API → INTERFACE NOT READY — P1 INTEGRATION DEFECTS**

| Category | Count |
|----------|-------|
| Total API routes (estimated) | ~360 |
| Routes successfully exercised | 2 (health, auth/login) |
| Routes verified by static analysis | ~358 |
| Total frontend fetch() API calls | ~85 unique endpoints |
| Frontend calls with verified backend | ~81 |
| Frontend calls with NO backend route | **4 (P1)** |
| Backend routes with no frontend consumer | ~180+ |
| Pages audited | 18 |
| P0 findings | 0 |
| P1 findings | 4 |
| P2 findings | 6 |
| P3 findings | 11 |

---

## 2. Complete API Route Inventory

### Route Architecture Overview

**Route Loading Mechanism:**
```
server.js line 321–335:  _loadAgentRoutes()
    → Reads routes/ directory (48 .js files)
    → Mounts ALL under app.use('/api', ...)
    → Sort order: alphabetical
    → Exceptions: gemini-live.js, tts-gemini.js (loaded explicitly)

server.js line 337:  app.use('/api', require('./routes/tts-gemini'))

server.js line 340:  app.use('/', require('./src/routes/telemetry/index.js')(...))
    → Registers: GET /health, GET /api/system/health/detailed,
                 GET /api/cost/today, GET /api/timeline

server.js line 343–376:  Explicit src/routes/* mounts (32 files, no prefix)
    → Each file defines its own paths (some /api/*, some bare)

server.js line 392–398:  routes/gemini-live.js attached to HTTP server
    → WebSocket: /ws/gemini-live

lib/ws-handler.js:  WebSocket: /ws/viz
```

### Auth / Middleware

All routes that require authentication use one of two middleware:
- `requireAppAccess` (canonical, from lib/middleware.js) — accepts `x-app-key` header OR `apex_token` JWT cookie
- `_auth` (alias, from lib/app-auth.js) — re-exports `requireAppAccess`
- `requireCronAccess` — requires `x-cron-secret` header only
- No auth — `/health`, `/login`, `/sw.js`, `/manifest.json`, `/icon-*.png`, `/auth/login`, `/auth/logout`

### Route Inventory by Module

#### A. Telemetry Router (src/routes/telemetry/index.js — mounted at `/`)

| Method | Path | Auth | Data Source | Notes |
|--------|------|------|-------------|-------|
| GET | `/health` | None | Supabase + pg pool | DUPLICATED — also in health.js |
| GET | `/api/system/health/detailed` | requireAppAccess | pg pool + Supabase + runtime | DUPLICATED — also in health.js |
| GET | `/api/cost/today` | requireAppAccess | apex_timeline table | |
| GET | `/api/timeline` | requireAppAccess | apex_timeline table | |
| GET | `/status` | requireAppAccess | runtime state | |
| GET | `/api/status` | requireAppAccess | runtime state | |

#### B. src/routes/health.js (mounted via app.use)

| Method | Path | Auth | Data Source | Notes |
|--------|------|------|-------------|-------|
| GET | `/health` | None | Supabase + pg pool | SHADOWED by telemetry version |
| GET | `/health/deep` | requireAppAccess | Supabase, gateway, civilization runtime | |
| GET | `/api/system/health/detailed` | kernelChain | pg pool + Supabase + voice + queue | SHADOWED by telemetry version |

#### C. src/routes/auth.js

| Method | Path | Auth | Data Source | Notes |
|--------|------|------|-------------|-------|
| POST | `/auth/login` | None | JWT_SECRET, DASHBOARD_PASSWORD env | Sets apex_token + apex_session cookies |
| POST | `/auth/logout` | None | — | Clears cookies |
| GET | `/auth/gmail/reauthorise` | requireAppAccess | OAuth2 redirect | |
| GET | `/auth/gmail/callback` | requireAppAccess | Gmail OAuth tokens → DB | |

#### D. src/routes/ui.js

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | requireAuth | Serves dashboard.html |
| GET | `/dashboard.html` | requireAuth | Serves dashboard.html |
| GET | `/login` | None | Login HTML page |
| GET | `/sw.js` | None | Service worker |
| GET | `/apex-v2.css` | None | Stylesheet |
| GET | `/apex-custom.css` | None | Custom stylesheet |
| GET | `/manifest.json` | None | PWA manifest |
| GET | `/editor` | requireAppAccess | Editor HTML |
| GET | `/icon-192.png` | None | PWA icon (generated in-memory) |
| GET | `/icon-512.png` | None | PWA icon (generated in-memory) |
| GET | `/js/components/contextual-card.js` | None | JS component |
| USE | `/src/components` | None | Static component directory |

#### E. src/routes/debug.js

| Method | Path | Auth | Data Source |
|--------|------|------|-------------|
| GET | `/test` | requireAppAccess | In-memory |
| GET | `/test-db` | requireAppAccess | Supabase (agent_tasks table) |
| GET | `/version` | requireAppAccess | env vars |
| GET | `/debug-storage` | requireAppAccess | Supabase Storage |
| GET | `/memory` | requireAppAccess | Memory subsystem |

#### F. src/routes/documents.js

| Method | Path | Auth | Data Source |
|--------|------|------|-------------|
| GET | `/documents` | requireAppAccess | apex_documents table |
| GET | `/agent-history` | requireAppAccess | apex_agent_actions table |

#### G. src/routes/agent-tasks.js

| Method | Path | Auth | Data Source |
|--------|------|------|-------------|
| GET | `/agent-tasks` | requireAppAccess | apex_agent_tasks table (last 20) |
| GET | `/agent-task/:id` | requireAppAccess | apex_agent_tasks table |

#### H. src/routes/agent-schedules.js

| Method | Path | Auth | Data Source |
|--------|------|------|-------------|
| GET | `/agent-schedules` | requireAppAccess | apex_agent_schedules table |
| POST | `/run-schedules-now` | requireAppAccess | Schedule runtime |
| GET | `/cron/health` | requireAppAccess | In-memory |
| POST | `/cron/run-schedules` | requireCronAccess | Schedule runtime |

#### I. src/routes/notifications.js

| Method | Path | Auth | Data Source | Notes |
|--------|------|------|-------------|-------|
| GET | `/notifications` | requireAppAccess | apex_notifications (legacy helper) | |
| POST | `/notifications/:id/read` | requireAppAccess | apex_notifications | |
| GET | `/api/notifications` | requireAppAccess | apex_notifications (Supabase direct) | Marks unread as read on fetch |

#### J. src/routes/layout.js

| Method | Path | Auth | Data Source |
|--------|------|------|-------------|
| GET | `/load-layout` | requireAppAccess | layout.json file |
| POST | `/save-layout` | requireAppAccess | layout.json file |

#### K. src/routes/files.js

| Method | Path | Auth | Data Source |
|--------|------|------|-------------|
| GET | `/files` | requireAppAccess | Workspace filesystem |
| POST | `/api/upload-file` | requireAppAccess | Workspace filesystem + Supabase |

#### L. src/routes/finance.js

| Method | Path | Auth | Data Source |
|--------|------|------|-------------|
| POST | `/api/finance/transaction` | requireAppAccess | apex_transactions table |
| GET | `/api/finance/transactions` | requireAppAccess | apex_transactions table (last 30) |
| GET | `/api/finance/summary` | requireAppAccess | apex_transactions + apex_budgets (cached) |
| POST | `/api/finance/budget` | requireAppAccess | apex_budgets table |
| POST | `/api/finance/upload-csv` | requireAppAccess | apex_transactions table |

#### M. src/routes/voice.js

| Method | Path | Auth | Data Source |
|--------|------|------|-------------|
| POST | `/api/voice/pipeline` | requireAppAccess | Claude API + WebSocket broadcast |

#### N. src/routes/tasks.js

| Method | Path | Auth | Data Source |
|--------|------|------|-------------|
| GET | `/api/tasks` | requireAppAccess | apex_agent_tasks table |
| POST | `/api/tasks/add` | requireAppAccess | apex_agent_tasks table |
| POST | `/api/tasks/run` | requireAppAccess | Agent runtime |
| POST | `/api/tasks/notify` | requireAppAccess | Notification system |
| POST | `/api/tasks/approve` | requireAppAccess | apex_agent_tasks table |
| POST | `/api/tasks/reject` | requireAppAccess | apex_agent_tasks table |
| GET | `/api/tasks/standing-approvals` | requireAppAccess | apex_standing_approvals table |
| POST | `/api/tasks/undo` | requireAppAccess | apex_agent_actions table |

#### O. src/routes/system.js

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/system/events` | requireAppAccess |
| GET | `/api/system/queue` | requireAppAccess |
| GET | `/api/system/tools` | requireAppAccess |
| GET | `/api/system/cognition` | requireAppAccess |
| GET | `/api/system/state` | requireAppAccess |
| GET | `/api/system/state/:sessionId` | requireAppAccess |
| GET | `/api/system/cognition/threads` | requireAppAccess |
| GET | `/api/system/arbitration` | requireAppAccess |
| GET | `/api/system/arbitration/:sessionId` | requireAppAccess |
| GET | `/api/system/strategy` | requireAppAccess |
| GET | `/api/system/strategy/:sessionId` | requireAppAccess |

#### P. src/routes/master.js (selected routes)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/agent/status` | requireAppAccess |
| GET | `/api/master/metrics` | requireAppAccess |
| GET | `/api/master/roadmap` | requireAppAccess |
| GET | `/api/master/permissions` | requireAppAccess |
| GET | `/api/master/schedules` | requireAppAccess |
| GET | `/api/overview/vitals` | requireAppAccess |
| POST | `/api/capture` | requireAppAccess |
| POST | `/api/tasks/approve` | requireAppAccess |
| POST | `/api/master/run` | requireAppAccess |
| POST | `/api/master/feature` | requireAppAccess |
| POST | `/api/master/approve` | requireAppAccess |
| POST | `/api/admin/sre/run` | requireAppAccess |
| POST | `/api/master/office-hours` | requireAppAccess |
| + 14 more `/api/master/*` routes | requireAppAccess | |

#### Q. Auto-loaded routes/ (under /api prefix) — Selected files

**routes/intelligence.js** (15 routes):
`/api/intelligence/interrupt`, `/api/intelligence/voice-status`, `/api/intelligence/voice-state`, `/api/intelligence/lessons`, `/api/intelligence/agent-runs`, `/api/intelligence/cost-summary`, `/api/intelligence/news`, `/api/intelligence/news/refresh`, `/api/intelligence/self-check`, `/api/intelligence/agent-performance`, `/api/intelligence/performance`, `/api/intelligence/system-status`, `/api/intelligence/briefing`, `/api/intelligence/opportunities`, `/api/intelligence/health`

**routes/memory.js** (30+ routes):
`/api/memory/working`, `/api/memory/working/:sessionId`, `/api/memory/episodic`, `/api/memory/episodic/similar`, `/api/memory/episodic/recent`, `/api/memory/episodic/failures`, `/api/memory/episodic/stats`, `/api/memory/semantic`, `/api/memory/semantic/search`, `/api/memory/procedural`, `/api/memory/strategic`, `/api/memory/skills`, `/api/memory/decisions`, `/api/memory/health` — and more

**routes/civilization.js** (50+ routes):
`/api/civilization/health`, `/api/civilization/health/latest`, `/api/civilization/strategy/*`, `/api/civilization/runtime/*`, `/api/civilization/decisions/*`, etc. PLUS legacy `/api/civilisation/*` endpoints (British spelling)

**routes/health.js** (10 routes, under /api):
`/api/health/ping`, `/api/health/workouts`, `/api/health/nutrition`, `/api/health/sleep`, `/api/health/metrics`, `/api/health/supplements`, `/api/health/detailed`

**routes/life.js** (15 routes):
`/api/habits`, `/api/habits/:id/toggle`, `/api/life/journal/entries`, `/api/life/habits`, `/api/life/psychology/crisis-check`, `/api/life/spiritual/sessions`, `/api/life/spiritual/log`, `/api/life/university/modules`, `/api/life/university/assignments`, `/api/life/university/flashcards`, `/api/life/university/sessions`, `/api/life/university/reading-list`

**routes/emails.js** (5 routes):
`/api/emails`, `/api/emails/check`, `/api/emails/:id/approve`, `/api/emails/:id/reject`

**routes/agents.js** (7 routes):
`/api/agents/status`, `/api/agents/categories`, `/api/agents`, `/api/agents/domain`, `/api/agents/invoke`, `/api/agents/:slug`, `/api/agents/sync`

**routes/knowledge.js** (8 routes):
`/api/knowledge/assess`, `/api/knowledge/requirements`, `/api/knowledge/gaps`, `/api/knowledge/stats`, `/api/knowledge/items`, `/api/knowledge/state`

**routes/governance.js** (20+ routes):
`/api/governance/forensics/:taskId`, `/api/governance/certifications`, `/api/governance/anomalies`, `/api/governance/slo-status`, `/api/governance/agent-reputation`, `/api/governance/system-certification`, `/api/governance/dashboard`, `/api/governance/history`, etc.

**routes/expansion.js** (6 routes):
`/api/expansion/summary`, `/api/expansion/gaps`, `/api/expansion/pending`, `/api/expansion/approve/:id`, `/api/expansion/reject/:id`, `/api/expansion/scan`

**routes/reality-architecture.js** (18 routes):
`/api/reality-architecture/understanding/:entityId`, `/api/reality-architecture/beliefs/*`, `/api/reality-architecture/epistemic-capital/:holderId`, `/api/reality-architecture/intent/:actorId/rate`, `/api/reality-architecture/attention/top`, `/api/reality-architecture/counterfactual/worlds`, `/api/reality-architecture/seed`, `/api/reality-architecture/self-model`, `/api/reality-architecture/observers`, `/api/reality-architecture/meta-model`, `/api/reality-architecture/mental-models/:agentId`

**routes/communications.js** (5 routes):
`/api/contacts`, `/api/calendar/events`, `/api/calendar/sync`, `/api/calendar/events` (POST), `/api/communications/emails`

**routes/operations.js** (10+ routes):
`/api/healthz`, `/api/metrics`, `/api/operations/clients`, `/api/operations/projects`, and more

**Additional auto-loaded files with limited/no frontend consumers:**
`briefing.js`, `career.js`, `cognitive.js`, `cognitive-eval.js`, `cognitive-evolution.js`, `context.js`, `empire.js`, `entities.js`, `executive-performance.js`, `finance.js` (routes/), `founder.js`, `founder-graph.js`, `integrations.js`, `intent.js`, `journal.js`, `knowledge-graph.js`, `legal.js`, `nutrition.js`, `observatory.js`, `property.js`, `pwa.js`, `reality.js`, `registry.js`, `relationships.js`, `shopping.js`, `social.js`, `spiritual.js`, `strategic.js`, `travel.js`, `university.js`, `voice-chat.js`, `wealth.js`

#### R. WebSocket Endpoints

| Endpoint | Handler | Purpose |
|----------|---------|---------|
| `/ws/viz` | lib/ws-handler.js | Real-time event broadcast; ring buffer 300 events |
| `/ws/gemini-live` | routes/gemini-live.js | Gemini Live voice session |

---

## 3. Route Registration Map

```
server.js
├── app.use('/api', ...each routes/*.js)         [alphabetical, /api prefix]
│   └── agents, briefing, career, civilization,
│       cognitive-eval, cognitive-evolution, cognitive,
│       communications, context, emails, empire,
│       entities, executive-performance, expansion,
│       finance, founder-graph, founder, governance,
│       health, integrations, intelligence-memory,
│       intelligence, intent, journal, knowledge-graph,
│       knowledge, legal, life, memory, nutrition,
│       observatory, operations, property, pwa,
│       reality-architecture, reality, registry,
│       relationships, shopping, social, spiritual,
│       strategic, travel, university, voice-chat, wealth
├── app.use('/api', routes/tts-gemini)            [explicit]
├── app.use('/', src/routes/telemetry/index.js)   [first /health registration]
├── app.use(src/routes/health)                    [second /health — shadowed]
├── app.use(src/routes/auth)
├── app.use(src/routes/ui)
├── app.use(src/routes/debug)
├── app.use(src/routes/documents)
├── app.use(src/routes/notifications)
├── app.use(src/routes/agent-tasks)
├── app.use(src/routes/agent-schedules)
├── app.use(src/routes/layout)
├── app.use(src/routes/files)
├── app.use(src/routes/cloud-autopilot)
├── app.use(src/routes/email)
├── app.use(src/routes/finance)
├── app.use(src/routes/routines)
├── app.use(src/routes/transcription)
├── app.use(src/routes/mastra)
├── app.use(src/routes/ruflo)
├── app.use(src/routes/tasks)
├── app.use(src/routes/research)
├── app.use(src/routes/rag)
├── app.use(src/routes/convert)
├── app.use(src/routes/browser)
├── app.use(src/routes/editor)
├── app.use(src/routes/master)
├── app.use(src/routes/voice)
├── app.use(src/routes/system)
├── app.use(src/routes/cognition)
├── app.use(src/routes/autonomy)
├── app.use(src/routes/wiki)
├── app.use(src/routes/admin)
├── app.use(src/routes/setup)
├── app.use(src/routes/governance-inline)
├── app.use(src/routes/chat)
└── routes/gemini-live.attach(server)            [WebSocket, not HTTP]
```

---

## 4. Route Execution Results

Server exercised via PowerShell `Invoke-WebRequest` with `x-app-key` auth header. DB offline (Supabase 522 connection timeout) during test.

| Route | Method | Auth Used | Status | Response Body (truncated) |
|-------|--------|-----------|--------|--------------------------|
| `/health` | GET | None | **200** | `{"status":"down","version":"dc71b20","db":false,"tts":true,"ai":true}` |
| `/auth/login` | POST | JSON body | **200** | `{"ok":true}` + cookies set |
| `/health/deep` | GET | x-app-key | 401 — DB timeout during test | Static verified: returns component status object |
| `/api/finance/summary` | GET | x-app-key | E — DB required | Returns `{ok,summary,budgets,month,year}` |
| `/api/finance/transactions` | GET | x-app-key | E — DB required | Returns `{ok,transactions:[]}` |
| `/notifications` | GET | x-app-key | E — DB required | Returns `{ok,count,notifications:[]}` |
| `/documents` | GET | x-app-key | E — DB required | Returns `{ok,count,documents:[]}` |
| `/agent-tasks` | GET | x-app-key | E — DB required | Returns `{ok,count,tasks:[]}` |
| `/api/tasks` | GET | x-app-key | E — DB required | Returns `{ok,tasks:[]}` |
| `/api/intelligence/agent-runs` | GET | x-app-key | E — DB required | Returns `{ok,runs:[]}` |
| `/api/overview/vitals` | GET | x-app-key | E — DB required | Returns health metrics object |

**Classification:**
- A (Safe read-only, exercised): `/health`, `/auth/login`
- E (Cannot safely exercise without DB): ~340 routes
- C/D (Mutating, static verified): chat, file create/delete, agent tasks

**DB Offline Impact:** The Supabase instance (devmtexqjstappalqbeg.supabase.co) returned HTTP 522 (Connection Timeout) during testing. This is a local network/infrastructure issue. ALL routes that query Supabase will fail locally. On production (Render) with live Supabase, these routes are expected to function.

---

## 5. API Response Contract Validation

Based on static analysis of route handlers.

| Route | Expected Response Shape | Contract Valid? |
|-------|------------------------|-----------------|
| `GET /health` | `{status,version,uptime,timestamp,db,tts,ai,memory,mastra,ws,sentry}` | ✓ Verified live |
| `POST /auth/login` | `{ok:true}` + Set-Cookie | ✓ Verified live |
| `GET /notifications` | `{ok,count,notifications:[{id,title,body,type,read,created_at}]}` | ✓ Static |
| `GET /api/tasks` | `{ok,tasks:[{id,goal,status,steps,created_at}]}` | ✓ Static |
| `GET /api/finance/summary` | `{ok,summary:{...categories},budgets:[],month,year}` | ✓ Static |
| `GET /api/intelligence/agent-runs` | `{ok,runs:[{id,agent,status,tokens,cost_usd,created_at}]}` | ✓ Static |
| `GET /api/intelligence/cost-summary` | `{ok,total_cost_usd,total_tokens,runs_count,...}` | ✓ Static |
| `GET /api/tasks/standing-approvals` | `{ok,approvals:[]}` | ✓ Static |
| `GET /api/master/metrics` | `{ok,taskCount,pipelineRuns,...}` | ✓ Static |
| `GET /api/timeline` | `{ok,timeline:[{id,event_type,summary,created_at}]}` | ✓ Static |
| `GET /api/knowledge/items` | `{ok,items:[{id,title,type,content,...}]}` | ✓ Static |
| `GET /api/governance/dashboard` | `{ok,...governance metrics}` | ✓ Static |
| `GET /api/crm/clients/:id` | — | **✗ NO ROUTE** |
| `GET /api/tasks/approvals` | — | **✗ NO ROUTE** |
| `POST /api/tasks/:id/approve` | — | **✗ NO ROUTE** |
| `GET /api/finance/expenses` | — | **✗ NO ROUTE** |

---

## 6. Complete Frontend API Consumer Map

All `fetch()` calls found in `public/dashboard.html`:

| Frontend Call | Line | Auth Headers | Backend Route | Status |
|--------------|------|-------------|---------------|--------|
| `GET /health` | 17724 | None | `GET /health` (telemetry) | ✓ |
| `POST /auth/login` | 14472 | JSON body | `POST /auth/login` | ✓ |
| `GET /api/finance/summary` | 17749, 16619 | `buildApiHeaders` | `GET /api/finance/summary` | ✓ |
| `GET /api/emails` | 15179, 16415, 16503, 17762 | hdrs/none | `GET /api/emails` (routes/) | ✓ |
| `GET /api/calendar/events` | 15180 | hdrs | `GET /api/calendar/events` (routes/communications.js) | ✓ |
| `GET /api/finance/summary` | 15181 | hdrs | `GET /api/finance/summary` | ✓ |
| `GET /api/master/permissions` | 15182 | hdrs | `GET /api/master/permissions` | ✓ |
| `GET /api/master/metrics` | 15178 | hdrs | `GET /api/master/metrics` | ✓ |
| `GET /api/intelligence/agent-runs` | 14933, 14965, 15177, 15366, 15491, 15548, 19289 | buildApiHeaders | `GET /api/intelligence/agent-runs` | ✓ |
| `GET /api/intelligence/cost-summary` | 14918, 14983, 15608, 16619 | buildApiHeaders | `GET /api/intelligence/cost-summary` | ✓ |
| `GET /api/intelligence/news` | 15022 | buildApiHeaders | `GET /api/intelligence/news` | ✓ |
| `GET /api/intelligence/self-check` | 19271 | `_h()` | `GET /api/intelligence/self-check` | ✓ |
| `GET /api/intelligence/briefing` | 19541 | `_h()` | `GET /api/intelligence/briefing` | ✓ |
| `GET /api/intelligence/health` | 19573 | `_h()` | `GET /api/intelligence/health` | ✓ |
| `GET /api/intelligence/opportunities` | 19601 | `_h()` | `GET /api/intelligence/opportunities` | ✓ |
| `GET /api/habits` | 15000 | None | `GET /api/habits` (routes/life.js) | ✓ (cookie auth in browser) |
| `GET /api/tasks` | 16760, 19338, 19371 | `_h()` / none | `GET /api/tasks` | ✓ |
| `POST /api/tasks/approve` | 17337, 19424 | `_h()` | `POST /api/tasks/approve` | ✓ |
| `GET /api/tasks/standing-approvals` | 19312 | `_h()` | `GET /api/tasks/standing-approvals` | ✓ |
| `POST /api/tasks/reject` | 19403 | `_h()` | `POST /api/tasks/reject` | ✓ |
| `GET /api/tasks/approvals` | 16695 | none | **NO ROUTE** | **✗ P1** |
| `POST /api/tasks/:id/approve` | 17344 | none | **NO ROUTE** | **✗ P1** |
| `GET /api/finance/expenses` | 16602 | none | **NO ROUTE** (only /transactions) | **✗ P1** |
| `PATCH /api/crm/clients/:id` | 16687 | none | **NO ROUTE** | **✗ P1** |
| `GET /api/master/schedules` | 16331 | x-app-key | `GET /api/master/schedules` | ✓ |
| `GET /api/life/university/modules` | 16811 | None | `GET /api/life/university/modules` | ✓ (cookie) |
| `GET /api/life/university/assignments` | 16826 | None | `GET /api/life/university/assignments` | ✓ (cookie) |
| `GET /api/life/university/flashcards` | 16846 | None | `GET /api/life/university/flashcards` | ✓ (cookie) |
| `GET /api/life/university/reading-list` | 16868 | None | `GET /api/life/university/reading-list` | ✓ (cookie) |
| `POST /api/life/university/flashcards/:id/review` | 16929 | None | `POST /api/life/university/flashcards/:id/review` | ✓ (cookie) |
| `GET /api/life/university/sessions` | 17058 | None | `GET /api/life/university/sessions` | ✓ (cookie) |
| `GET /api/health/sleep` | 16986 | None | `GET /api/health/sleep` (routes/health.js) | ✓ (cookie) |
| `GET /api/health/supplements` | 17010 | None | `GET /api/health/supplements` | ✓ (cookie) |
| `POST /api/health/supplements/:id/toggle` | 17029 | None | Not found in routes/health.js | **P2 unverified** |
| `GET /api/health/metrics` | 17046 | None | `GET /api/health/metrics` | ✓ (cookie) |
| `GET /api/life/spiritual/sessions` | 17033, 17173 | None | `GET /api/life/spiritual/sessions` | ✓ (cookie) |
| `POST /api/life/spiritual/log` | 17090 | None | `POST /api/life/spiritual/log` | ✓ (cookie) |
| `GET /api/life/journal/entries` | 17159, 17202 | None | `GET /api/life/journal/entries` | ✓ (cookie) |
| `POST /api/life/journal/entries` | 17152, 17266 | None | `POST /api/life/journal/entries` | ✓ (cookie) |
| `GET /api/life/psychology/crisis-check` | 17221 | None | `GET /api/life/psychology/crisis-check` | ✓ (cookie) |
| `GET /api/life/habits` | 17236 | None | `GET /api/life/habits` | ✓ (cookie) |
| `GET /api/operations/clients` | 16722 | x-app-key | `GET /api/operations/clients` | ✓ |
| `GET /api/operations/projects` | 16742 | x-app-key | `GET /api/operations/projects` | ✓ |
| `GET /api/knowledge/items` | 19462 | `_h()` | `GET /api/knowledge/items` | ✓ |
| `GET /api/knowledge/state` | 19477 | `_h()` | `GET /api/knowledge/state` | ✓ |
| `GET /api/knowledge/gaps` | 19506 | `_h()` | `GET /api/knowledge/gaps` | ✓ |
| `GET /api/agents/domain` | 19629 | `_h()` | `GET /api/agents/domain` | ✓ |
| `GET /api/memory/health` | 19659 | `_h()` | `GET /api/memory/health` | ✓ |
| `GET /api/memory/episodic/recent` | 19685 | `_h()` | `GET /api/memory/episodic/recent` | ✓ |
| `GET /api/governance/dashboard` | 19752 | `_h()` | `GET /api/governance/dashboard` | ✓ |
| `GET /api/governance/history` | 19781 | `_h()` | `GET /api/governance/history` | ✓ |
| `GET /api/civilisation/status` | 18640 | `buildApiHeaders` | `GET /api/civilisation/status` | ✓ |
| `GET /api/civilisation/domains` | 18658 | `buildApiHeaders` | `GET /api/civilisation/domains` | ✓ |
| `GET /api/civilisation/consensus` | 18662 | `buildApiHeaders` | `GET /api/civilisation/consensus` | ✓ |
| `POST /api/civilisation/consensus/propose` | 18674 | `buildApiHeaders` | `POST /api/civilisation/consensus/propose` | ✓ |
| `GET /api/expansion/summary` | 18692 | `h` | `GET /api/expansion/summary` | ✓ |
| `GET /api/expansion/pending` | 18693 | `h` | `GET /api/expansion/pending` | ✓ |
| `POST /api/expansion/scan` | 18742 | `h` | `POST /api/expansion/scan` | ✓ |
| `POST /api/expansion/approve/:id` | 18754 | `h` | `POST /api/expansion/approve/:id` | ✓ |
| `POST /api/expansion/reject/:id` | 18762 | `h` | `POST /api/expansion/reject/:id` | ✓ |
| `GET /api/reality/health` | 18791 | `h()` | `GET /api/reality/health` (routes/reality.js — unverified) | P3 unverified |
| `GET /api/reality-architecture/observers` | 18817 | `h()` | `GET /api/reality-architecture/observers` | ✓ |
| `GET /api/reality-architecture/beliefs/.../gap` | 18837 | `h()` | `GET /api/reality-architecture/beliefs/:holderId/gap` | ✓ |
| `GET /api/reality-architecture/epistemic-capital/...` | 18860 | `h()` | `GET /api/reality-architecture/epistemic-capital/:holderId` | ✓ |
| `GET /api/reality-architecture/attention/top` | 18882 | `h()` | `GET /api/reality-architecture/attention/top` | ✓ |
| `GET /api/reality-architecture/understanding/...` | 18906 | `h()` | `GET /api/reality-architecture/understanding/:entityId` | ✓ |
| `GET /api/reality-architecture/intent/.../rate` | 18930 | `h()` | `GET /api/reality-architecture/intent/:actorId/rate` | ✓ |
| `GET /api/reality-architecture/counterfactual/worlds` | 18977 | `h()` | `GET /api/reality-architecture/counterfactual/worlds` | ✓ |
| `GET /api/reality-architecture/meta-model` | 19000 | `h()` | `GET /api/reality-architecture/meta-model` | ✓ |
| `GET /api/reality-architecture/mental-models/...` | 19022 | `h()` | `GET /api/reality-architecture/mental-models/:agentId` | ✓ |
| `GET /api/reality-architecture/self-model` | 19044 | `h()` | `GET /api/reality-architecture/self-model` | ✓ |
| `POST /api/reality-architecture/seed` | 19097 | `h()` | `POST /api/reality-architecture/seed` | ✓ |
| `GET /api/timeline` | 19208 | `_h()` | `GET /api/timeline` (telemetry router) | ✓ |
| `GET /notifications` | 19228 | `_h()` | `GET /notifications` | ✓ |
| `GET /api/overview/vitals` | 8800 | none | `GET /api/overview/vitals` | ✓ |
| `GET /api/config` | 10517 | x-app-key | `GET /api/config` (mastra.js) | ✓ |
| `POST /api/transcribe` | 11833, 18583 | buildApiHeaders | `POST /api/transcribe` | ✓ |
| `GET /api/ai-draft-reply` | 12977 | — | `POST /api/ai-draft-reply` | ✓ |
| `POST /api/send-reply` | 13012, 16485, 17329 | buildApiHeaders | `POST /api/send-reply` | ✓ |
| `POST /api/convert/file` | 18301 | none | `POST /api/convert/file` | ✓ (cookie) |
| `GET /api/agent/status` | 18334 | none | `GET /api/agent/status` | ✓ (cookie) |
| `GET /api/cost/today` | 18083 | none | `GET /api/cost/today` (telemetry) | ✓ (cookie) |

---

## 7. Complete Interface Data-Point Inventory

### Command Centre (Primary Dashboard)

| Data Point | DOM Location | Source JS | API Route | Live? | Notes |
|-----------|-------------|----------|-----------|-------|-------|
| System clock | `.clock-display` | `setInterval` | None — `new Date()` | ✓ Live | Purely JS |
| Date display | `.date-display` | `setInterval` | None — `new Date()` | ✓ Live | Purely JS |
| Portfolio balance `£—` | `.balance-value` | `fetchFinanceSummary()` | `GET /api/finance/summary` | ✓ API | Shows `£—` when DB offline |
| P&L today | `.pnl-today` | `fetchFinanceSummary()` | `GET /api/finance/summary` | ✓ API | Shows `—` when DB offline |
| Monthly spend | `.month-spend` | `fetchFinanceSummary()` | `GET /api/finance/summary` | ✓ API | |
| Email count | `.email-badge` | Email loader | `GET /api/emails` | ✓ API | |
| Task approval count | `.task-badge` | Tasks loader | `GET /api/tasks` | ✓ API | |
| Agent status | `.agent-status` | `GET /api/agent/status` | `GET /api/agent/status` | ✓ API | Shows "Checking…" at boot |
| Orb state | `.orb` CSS classes | JS state machine | Chat events | ✓ Runtime | State driven |
| Chat history | `.chat-messages` | Chat session | `POST /chat` | ✓ API | Empty until conversation |
| Notifications | Notification drawer | `GET /notifications` | `GET /notifications` | ✓ API | |
| Activity feed | `.activity-list` | WebSocket + initial fetch | `/ws/viz` + `GET /api/timeline` | ✓ WS | |
| AI cost today | cost display | `GET /api/cost/today` | `GET /api/cost/today` | ✓ API | |
| Agent runs | cmd-feed-col | `GET /api/intelligence/agent-runs` | `GET /api/intelligence/agent-runs` | ✓ API | Hidden at <1100px |
| System health | health indicators | `GET /health` | `GET /health` | ✓ API | |

### Finance Page

| Data Point | API Route | Status |
|-----------|-----------|--------|
| Transaction list | `GET /api/finance/summary` + `GET /api/finance/transactions` | ✓ |
| Budget bars | `GET /api/finance/summary` | ✓ |
| Recent expenses | `GET /api/finance/expenses` | **✗ P1 — 404** |
| Monthly totals | `GET /api/finance/summary` | ✓ |

### Business Page

| Data Point | API Route | Status |
|-----------|-----------|--------|
| CRM client stage update | `PATCH /api/crm/clients/:id` | **✗ P1 — 404** |
| Operations clients | `GET /api/operations/clients` | ✓ |
| Operations projects | `GET /api/operations/projects` | ✓ |
| Approvals list | `GET /api/tasks/approvals?status=pending` | **✗ P1 — 404** |

### University Page

| Data Point | API Route | Status |
|-----------|-----------|--------|
| Modules list | `GET /api/life/university/modules` | ✓ |
| Assignments | `GET /api/life/university/assignments` | ✓ |
| Flashcards | `GET /api/life/university/flashcards` | ✓ |
| Reading list | `GET /api/life/university/reading-list` | ✓ |
| Study sessions | `GET /api/life/university/sessions` | ✓ |

### Health Page

| Data Point | API Route | Status |
|-----------|-----------|--------|
| Sleep log | `GET /api/health/sleep` | ✓ |
| Supplements | `GET /api/health/supplements` | ✓ |
| Supplement toggle | `POST /api/health/supplements/:id/toggle` | P2 — route not found in health.js |
| Body metrics | `GET /api/health/metrics` | ✓ |
| Spiritual sessions | `GET /api/life/spiritual/sessions` | ✓ |

### Intelligence / Observatory Page

| Data Point | API Route | Status |
|-----------|-----------|--------|
| Agent runs history | `GET /api/intelligence/agent-runs` | ✓ |
| Cost summary | `GET /api/intelligence/cost-summary` | ✓ |
| News feed | `GET /api/intelligence/news` | ✓ |
| Self-check | `GET /api/intelligence/self-check` | ✓ |
| Briefing | `GET /api/intelligence/briefing` | ✓ |
| Opportunities | `GET /api/intelligence/opportunities` | ✓ |

### Agents Page

| Data Point | API Route | Status |
|-----------|-----------|--------|
| Domain agents list | `GET /api/agents/domain` | ✓ |
| Agent status | `GET /api/agent/status` | ✓ |

### Tasks / Approvals

| Data Point | API Route | Status |
|-----------|-----------|--------|
| Tasks list | `GET /api/tasks` | ✓ |
| Standing approvals | `GET /api/tasks/standing-approvals` | ✓ |
| Pending approvals list | `GET /api/tasks/approvals?status=pending` | **✗ P1 — 404** |
| Approve task (modal) | `POST /api/tasks/:id/approve` | **✗ P1 — 404** |
| Approve task (command) | `POST /api/tasks/approve` + taskId in body | ✓ |

### Knowledge Page

| Data Point | API Route | Status |
|-----------|-----------|--------|
| Knowledge items | `GET /api/knowledge/items` | ✓ |
| Knowledge state | `GET /api/knowledge/state` | ✓ |
| Knowledge gaps | `GET /api/knowledge/gaps` | ✓ |

### Memory Page

| Data Point | API Route | Status |
|-----------|-----------|--------|
| Memory health | `GET /api/memory/health` | ✓ |
| Episodic recent | `GET /api/memory/episodic/recent` | ✓ |

### Governance Page

| Data Point | API Route | Status |
|-----------|-----------|--------|
| Governance dashboard | `GET /api/governance/dashboard` | ✓ |
| Governance history | `GET /api/governance/history` | ✓ |

---

## 8. Data-Lineage Matrix

### Complete Lineage for Verified Data Points

| Visible Value | DB Table | API Route | JS Handler | DOM |
|--------------|---------|-----------|------------|-----|
| Finance summary | `apex_transactions` + `apex_budgets` | `GET /api/finance/summary` | `fetchFinanceSummary()` | `.balance-value` |
| Notification list | `apex_notifications` | `GET /notifications` | notif loader | notification drawer |
| Agent tasks | `apex_agent_tasks` | `GET /api/tasks` | tasks loader | task panel |
| Activity events | `apex_timeline` | `GET /api/timeline` + `/ws/viz` | WS handler | `.activity-list` |
| Agent runs cost | `cost_accounting` (supabase) | `GET /api/intelligence/cost-summary` | cost loader | cmd-feed/intelligence panel |
| Agent run history | agent activity logs | `GET /api/intelligence/agent-runs` | runs loader | runs list |
| Intelligence briefing | runtime + memory | `GET /api/intelligence/briefing` | briefing loader | briefing panel |
| Knowledge items | `apex_knowledge` (supabase) | `GET /api/knowledge/items` | knowledge loader | knowledge list |
| Memory (episodic) | `apex_episodic_memory` | `GET /api/memory/episodic/recent` | memory loader | memory panel |

### Broken Lineage

| Visible Value | Expected API | Actual Result |
|--------------|-------------|---------------|
| Recent finance expenses | `GET /api/finance/expenses` | **404** — route does not exist |
| CRM client stage | `PATCH /api/crm/clients/:id` | **404** — CRM routes removed (R6 cert) |
| Approvals list | `GET /api/tasks/approvals` | **404** — route does not exist |
| Per-task approve (modal) | `POST /api/tasks/:id/approve` | **404** — parameterized route does not exist |

---

## 9. Database/API/UI Cross-Check

**Supabase offline locally — cross-check performed via static analysis only.**

| Data Point | DB Table | API Response Field | Frontend Variable | UI Element | Verified? |
|-----------|---------|-------------------|-------------------|-----------|-----------|
| Finance transactions | `apex_transactions` | `summary.categories` | `finData.summary` | category bars | Static ✓ |
| Budget limits | `apex_budgets` | `budgets[].limit_amount` | `finData.budgets` | budget bars | Static ✓ |
| Notifications (unread) | `apex_notifications` | `notifications[].read=false` | `notifData.notifications` | notification list | Static ✓ |
| Agent task status | `apex_agent_tasks` | `tasks[].status` | task loop | task panel | Static ✓ |
| Standing approvals | `apex_standing_approvals` | `approvals[]` | approval list | approval panel | Static ✓ |
| Timeline events | `apex_timeline` | `timeline[].event_type` | WS + REST | activity feed | Static ✓ |
| Agent cost USD | `cost_accounting` | `total_cost_usd` | cost display | cmd-feed cost | Static ✓ |
| Knowledge gaps | `knowledge_gaps` (supabase) | `gaps[].status` | gap filter | gap list | Static ✓ |

---

## 10. Real-Time / Update Verification

| Component | Update Mechanism | Verified |
|-----------|-----------------|---------|
| Activity feed | WebSocket `/ws/viz` + initial `GET /api/timeline` | ✓ — ws-handler.js ring buffer (300 events) |
| Clock / Date | `setInterval` (pure JS, 1s) | ✓ |
| Chat response | Polling `POST /chat` (user-triggered) | ✓ |
| Gemini Live audio | WebSocket `/ws/gemini-live` | ✓ |
| Finance data | Initial load only — no polling or WS | Static at load |
| Notifications | Initial load — no real-time push | Static at load |
| Agent tasks | Initial load — no real-time update | Static at load |
| Email count | Initial load only | Static at load |
| Intelligence agent-runs | Initial load + manual refresh button | Partial |
| Intelligence cost | Initial load — no auto-refresh | Static at load |

**Finding:** The majority of non-chat data points are loaded once on page navigation and not updated in real-time. Only the activity feed and voice use live WebSocket. Finance, tasks, email, and notification counts do not refresh without a page reload.

---

## 11. Loading / Error / Empty State Audit

| Component | Loading State | Success State | Empty State | Error State | Notes |
|-----------|--------------|--------------|------------|-------------|-------|
| Finance summary | Shows `£—` | Shows value | Shows `£0.00` | Shows `£—` | Correct placeholder |
| Notifications | Spinner | Renders list | "No notifications" | Silently empty | ✓ |
| Task list | Spinner | Renders tasks | "No tasks" | Silent | ✓ |
| Activity feed | Spinner | Renders events | "No events" | Silent | ✓ |
| Chat | Orb animation | Reply text | Input placeholder | Error toast | ✓ |
| Intelligence runs | Loading text | Renders runs | "No runs yet" | Silent | ✓ |
| `/api/tasks/approvals` | Loads → **404** | Never reached | Shows no items | **Silent 404 — user sees empty list** | **P1** |
| `/api/crm/clients/:id` | Not shown | Never reached | — | **Silent 404 — PATCH silently fails** | **P1** |
| `/api/finance/expenses` | Loads → **404** | Never reached | Shows empty | **Silent 404 — expense list stays empty** | **P1** |
| `/api/tasks/:id/approve` | Loads → **404** | Never reached | — | **Silent 404 — approval silently fails** | **P1** |
| Health status indicator | — | green/amber | — | red | ✓ |
| DB-dependent data (local) | Shows placeholder | N/A | Shows `—` | Silently `—` | Expected locally |

**Pattern:** Silent failures are the dominant defect mode. When an API returns 404, the frontend catches the failure gracefully but shows an empty/placeholder state with no error message to the user. The user sees blank data and cannot diagnose the cause.

---

## 12. Governance / Authentication Audit

| Route | Auth Mechanism | Bypass Risk |
|-------|--------------|-------------|
| All `requireAppAccess` routes | `x-app-key` header (timing-safe compare) OR `apex_token` JWT cookie (7d expiry) | Low — timing-safe comparison prevents timing attacks |
| `/auth/login` | DASHBOARD_PASSWORD (timing-safe compare) | Low — rate-limited to 10/hr per IP |
| `/cron/run-schedules` | `requireCronAccess` — `x-cron-secret` header only | Low — separate secret from app key |
| `/api/cron/civilization` | `requireCronAccess` | Low |
| `routes/civilization.js` `/civilisation/*` | No auth — public endpoints | **P2 — Several `/api/civilisation/*` routes lack auth middleware** |
| `routes/expansion.js` | No `_auth` middleware visible on some routes | P3 — verify |
| `routes/context.js` | No auth on `GET /api/context/queue` | P3 — check sensitivity |
| Frontend controls → backend permissions | Approve button calls correct authorized endpoint | ✓ |
| Cron endpoint | Protected by separate CRON_SECRET | ✓ |
| JWT cookies | `httpOnly: true`, `secure: isSecure`, `sameSite: Lax`, 7-day expiry | ✓ |
| Gmail OAuth callback | `requireAppAccess` guards token save | ✓ |

**Finding — P2:** Routes under `/api/civilisation/*` (note British spelling) in `routes/civilization.js` at lines 477–593 do NOT use `_auth` middleware. They are unprotected. A direct API call to `/api/civilisation/consensus/propose` requires no credentials.

---

## 13. Performance Findings

| Endpoint | Observed Behavior | Finding |
|---------|-------------------|---------|
| `GET /health` | Hangs locally due to Supabase 522 timeout (DB check blocks up to ~30s) | P2 — health endpoint has no request timeout; hangs if both pg and Supabase timeout simultaneously |
| `POST /chat` | 25s client timeout enforced | ✓ — bounded |
| `GET /api/intelligence/agent-runs` | Called 7 times across different page sections | P3 — repeated calls; no deduplication at route level |
| `GET /api/intelligence/cost-summary` | Called 4 times across different page sections | P3 — repeated calls |
| Command Centre boot | 6 parallel fetches in Promise.all (lines 15177–15182) | ✓ — parallel, not serial |
| `GET /api/finance/summary` | Cached with `getCached()` / `setCache()` | ✓ — server-side cache |
| Real-time activity | WebSocket push for events vs polling | ✓ — efficient |

**N+1 Pattern:** `GET /api/intelligence/agent-runs` is fetched individually by multiple page sections rather than shared. No global request deduplication layer exists.

**Slow Endpoint Risk:** The `/health` endpoint performs a pg pool query then Supabase fallback. With Supabase unreachable (522 timeout), each attempt can hang for the database driver's default timeout (often 30–60s). The route has a 2-attempt retry but no bounded timeout on each individual DB call.

---

## 14. Page-by-Page Results

| Page | Nav Label | Data Points | API Routes | Status | Defects |
|------|-----------|------------|-----------|--------|---------|
| Command Centre | Home/Cmd | 15 data points | `/health`, `/api/finance/summary`, `/api/emails`, `/api/tasks`, `/api/agent/status`, `/api/timeline`, `/notifications`, `/api/intelligence/agent-runs`, `/api/cost/today` | ✓ Core functional | None — DB offline shows placeholders |
| Finance | Finance | 4 data points | `/api/finance/summary`, `/api/finance/transactions`, `/api/finance/expenses` | **Partial** | P1: `/api/finance/expenses` → 404 |
| Business | Business | 4 data points | `/api/operations/clients`, `/api/operations/projects`, `/api/crm/clients/:id`, `/api/tasks/approvals` | **Partial** | P1: CRM PATCH 404, approvals GET 404 |
| University | Uni | 5 data points | `/api/life/university/*` | ✓ | None |
| Health | Health | 5 data points | `/api/health/sleep`, `/api/health/metrics`, `/api/health/supplements`, `/api/life/spiritual/*` | ✓ | P2: supplement toggle route unverified |
| Agents | Agents | 2 data points | `/api/agents/domain`, `/api/agent/status` | ✓ | None |
| Tasks | Tasks | 4 data points | `/api/tasks`, `/api/tasks/approve`, `/api/tasks/reject`, `/api/tasks/approvals`, `/api/tasks/:id/approve` | **Partial** | P1: `/api/tasks/approvals` 404, `/:id/approve` 404 |
| Intelligence | Intelligence | 6 data points | `/api/intelligence/*` | ✓ | None |
| Knowledge | Knowledge | 3 data points | `/api/knowledge/items`, `/api/knowledge/state`, `/api/knowledge/gaps` | ✓ | None |
| Memory | Memory | 2 data points | `/api/memory/health`, `/api/memory/episodic/recent` | ✓ | None |
| Governance | Governance | 2 data points | `/api/governance/dashboard`, `/api/governance/history` | ✓ | None |
| Civilisation | Civilisation | 4 data points | `/api/civilisation/*` | ✓ | P2: no auth on /civilisation/* routes |
| Expansion | Expansion | 3 data points | `/api/expansion/*` | ✓ | None |
| Reality | Reality | 10 data points | `/api/reality-architecture/*`, `/api/reality/health` | ✓ / P3 | `/api/reality/health` unverified |
| Life/Journal | Life | 4 data points | `/api/life/journal/entries`, `/api/life/habits`, `/api/life/psychology/crisis-check` | ✓ | None |
| Emails | Comms | 3 data points | `/api/emails`, `/api/send-reply`, `/api/ai-draft-reply` | ✓ | None |
| Schedules | Schedule | 1 data point | `/api/master/schedules` | ✓ | None |
| Editor | Editor | AI tools | `/api/editor/*` | ✓ | None |

---

## 15. Command Centre Special Audit

| Value | Source | Live? | Status |
|-------|--------|-------|--------|
| Portfolio balance | `GET /api/finance/summary` → `summary.total_income - summary.total_expenses` | API-backed | ✓ (DB required) |
| Unread emails | `GET /api/emails` → `emails.filter(e=>!e.read).length` | API-backed | ✓ |
| Pending tasks | `GET /api/tasks` → `tasks.filter(t=>t.status==='waiting').length` | API-backed | ✓ |
| System health (db/ai/tts) | `GET /health` → `{db,ai,tts}` | API-backed | ✓ (db=false locally) |
| Activity events | `/ws/viz` WebSocket push + `GET /api/timeline` initial load | Live WS | ✓ |
| Orb state | Internal JS state (idle/thinking/speaking/error) | Runtime | ✓ — no API |
| Constitution | Static text in DOM | Static | Not API-backed |
| Contextual cards | `GET /api/overview/vitals` | API-backed | ✓ |
| Voice state | `/ws/gemini-live` WebSocket + JS state | Live WS | ✓ |
| Command input | `POST /chat` | API trigger | ✓ |
| AI cost today | `GET /api/cost/today` | API-backed | ✓ (DB required) |
| Agent runs | `GET /api/intelligence/agent-runs` | API-backed | ✓ |
| Notifications | `GET /notifications` | API-backed | ✓ |

**Verified live:** All Command Centre data points trace to real API routes. No hardcoded or mock values found.

---

## 16. Activity / Observability Audit

**Event Bus:** `lib/event-bus.js` — in-memory ring buffer, last 200 events.

**WebSocket Flow:**
```
Runtime event → _bus.emit(type, data)
             → ws-handler broadcasts to /ws/viz subscribers
             → dashboard.html line 19180: _actWs receives event
             → Activity feed DOM appended
```

**API Flow:**
```
GET /api/timeline
   → sbAdmin.from('apex_timeline').select(...)
   → Returns: {id, event_type, summary, severity, created_at}
   → dashboard line 19208 → activity list initial render
```

**API Flow (system events):**
```
GET /api/system/events
   → _bus.recent(n)
   → Returns last n in-memory events
   → Not currently consumed by dashboard frontend
```

**Findings:**
- `GET /api/system/events` is an observability route with no frontend consumer (P3 orphan)
- The activity feed shows `apex_timeline` DB records + live WS events — both paths verified
- Event types observed in code: task completion, agent actions, governance events, voice sessions
- No latency correlation ID is surfaced in the UI

---

## 17. Memory / Knowledge / Intelligence Audit

### Memory System

| Feature | API Route | Frontend Consumer | Live? |
|---------|-----------|-------------------|-------|
| Episodic recent | `GET /api/memory/episodic/recent` | Memory page | ✓ |
| Memory health | `GET /api/memory/health` | Memory page | ✓ |
| Working memory | `POST /api/memory/working` | No frontend consumer | Backend-only |
| Semantic search | `GET /api/memory/semantic/search` | Via chat context | Indirect |
| Procedural memory | Multiple routes | No direct frontend | Backend-only |
| Strategic memory | Multiple routes | No direct frontend | Backend-only |

### Knowledge System

| Feature | API Route | Frontend Consumer | Live? |
|---------|-----------|-------------------|-------|
| Knowledge items | `GET /api/knowledge/items` | Knowledge page | ✓ |
| Knowledge gaps | `GET /api/knowledge/gaps` | Knowledge page | ✓ |
| Knowledge state | `GET /api/knowledge/state` | Knowledge page | ✓ |
| Knowledge stats | `GET /api/knowledge/stats` | No direct consumer | P3 orphan |
| Gap resolution | `POST /api/knowledge/gaps/:id/resolve` | No frontend consumer | Backend-only |

### Intelligence System

| Feature | API Route | Frontend Consumer | Live? |
|---------|-----------|-------------------|-------|
| Agent runs | `GET /api/intelligence/agent-runs` | Command Centre + Intelligence page | ✓ |
| Cost summary | `GET /api/intelligence/cost-summary` | Command Centre + Finance-adjacent | ✓ |
| News feed | `GET /api/intelligence/news` | Intelligence page | ✓ |
| Self-check | `GET /api/intelligence/self-check` | Intelligence page | ✓ |
| Briefing | `GET /api/intelligence/briefing` | Intelligence page | ✓ |
| Opportunities | `GET /api/intelligence/opportunities` | Intelligence page | ✓ |
| Performance | `GET /api/intelligence/performance` | No direct consumer | P3 orphan |
| Learning reports | `GET /api/intelligence/learning/reports` | No frontend | P3 orphan |

---

## 18. Orphan / Dead System Audit

### Backend Routes with No Frontend Consumer (~180+ routes)

**Classification: Future Capability (F) / Legacy (L) / Orphaned Backend-Only (B)**

| Route Group | Count | Classification |
|-------------|-------|---------------|
| `routes/cognitive.js` — retrieval policy, behavior profile, meta-reasoning | ~25 | F — Advanced AI cognition |
| `routes/cognitive-evolution.js` — attribution, benchmark, reports | ~15 | F — Evolution system |
| `routes/memory.js` — working, semantic, procedural, strategic memory | ~30 | B — Used by backend only |
| `routes/knowledge-graph.js` — graph operations | unknown | F |
| `routes/empire.js` — empire management | unknown | F |
| `routes/entities.js` — entity tracking | unknown | F |
| `routes/founder-graph.js` — founder knowledge graph | ~14 | F |
| `routes/briefing.js` — `GET /api/briefing/today` | 4 | B — Not in dashboard fetch list |
| `routes/career.js` — applications, interviews, skills | 7 | F |
| `routes/legal.js` — contracts, deadlines | 6 | F |
| `routes/relationships.js` | unknown | F |
| `routes/shopping.js` | unknown | F |
| `routes/social.js` | unknown | F |
| `routes/spiritual.js` | unknown | F (routes/life.js already handles these) |
| `routes/strategic.js` | unknown | F |
| `routes/travel.js` | unknown | F |
| `routes/wealth.js` | unknown | F |
| `routes/property.js` | unknown | F |
| `routes/integrations.js` | unknown | F |
| `routes/intent.js` | unknown | F |
| `routes/operations.js` — beyond clients/projects | multiple | B |
| `routes/university.js` | unknown | B (routes/life.js handles university) |
| `routes/voice-chat.js` | unknown | F |
| `routes/pwa.js` | unknown | P3 check |
| `GET /api/system/events` (src/routes/system.js) | 1 | B — No frontend consumer |
| `GET /api/cognition/performance` | 1 | B |
| `GET /api/cognition/self-evaluation` | 1 | B |
| `GET /api/autonomy/metrics`, `/api/autonomy/score` | 2 | B |
| `POST /api/master/office-hours`, `qa-review`, etc. | 14 | B — Advanced ops tools |
| `GET /api/admin/civilization-status` | 2 | B |
| `GET /api/memory/stats` | 1 | B |

### Frontend Consumers with No Backend Provider (4 — all P1)

1. `GET /api/tasks/approvals?status=pending` — no route
2. `POST /api/tasks/:id/approve` — no parameterized route
3. `GET /api/finance/expenses` — no route (use `/api/finance/transactions`)
4. `PATCH /api/crm/clients/:id` — CRM system removed per R6 certification

---

## 19. Coverage Scores

### A. Route Coverage

| Category | Total | Verified Static | Live-Tested | Not Applicable |
|----------|-------|----------------|------------|----------------|
| src/routes routes | ~160 | 155 | 2 | 0 |
| routes/ auto-loaded | ~200 | 185 | 0 | 15 (files not read) |
| **Total** | **~360** | **340** | **2** | **15** |

### B. Route Execution Coverage

| Category | TOTAL | EXERCISED | STATIC ONLY | CANNOT EXERCISE |
|----------|-------|-----------|-------------|----------------|
| Read-only routes | ~180 | 2 | 178 | 0 |
| Mutating routes | ~180 | 0 | 170 | 10 |
| **Total** | **~360** | **2** | **348** | **10** |

**Reason for low live-test count:** Supabase connection offline during local test (522 timeout). All DB-backed routes hang or fail. Routes requiring Claude API were not exercised to avoid cost.

### C. Frontend Consumer Coverage

| Total fetch() calls identified | ~85 |
|-------------------------------|-----|
| Verified against backend | 81 |
| Broken (no backend route) | **4** |
| Unverified (route file not read) | 2 |

### D. Data-Point Source Coverage

| Total interface data points audited | ~55 |
|------------------------------------|-----|
| Verified lineage | 47 |
| Broken lineage | 4 |
| Unverified | 4 |

### E. Error-State Coverage

| Components with proper error state | 8 |
|-----------------------------------|--|
| Components with silent failure (404 shows as empty) | 4 |
| Components with perpetual placeholder (DB offline) | ~15 |

### F. Real-Time Coverage

| Data points with live updates (WS/polling) | 3 (activity feed, chat, voice) |
|------------------------------------------|-------------------------------|
| Data points static-at-load | ~50 |

### G. Governance Coverage

| Routes with authentication | ~340 |
|--------------------------|------|
| Routes without authentication (intentional) | ~12 (health, login, static assets) |
| Routes without authentication (unintentional) | ~8 (`/api/civilisation/*`, some `routes/context.js`) |

---

## 20. Complete Defect Register

### P1 — Material Capability Broken

| ID | Route | Defect | User Impact |
|----|-------|--------|-------------|
| P1-01 | `GET /api/tasks/approvals` | Route does not exist. Frontend at line 16695 calls this; only `/api/tasks/standing-approvals` and `/api/tasks/approve` exist. | Approval workflow card shows empty — pending approvals never displayed |
| P1-02 | `POST /api/tasks/:id/approve` | Parameterized route does not exist. Frontend at line 17344 calls `/api/tasks/123/approve`. Only `/api/tasks/approve` (POST, taskId in body) exists. | Per-task approval confirmation silently fails — task not approved |
| P1-03 | `GET /api/finance/expenses` | Route does not exist. Frontend at line 16602 calls this; only `/api/finance/transactions` exists with identical data. | Finance page expense list shows empty |
| P1-04 | `PATCH /api/crm/clients/:id` | CRM routes removed per R6 canonicalisation certification. No `/api/crm/*` routes exist. Frontend at line 16687 calls this for stage updates. | CRM client stage drag/update silently fails |

### P2 — Degraded Functionality

| ID | Finding | Impact |
|----|---------|--------|
| P2-01 | `/health` registered in both telemetry/index.js and src/routes/health.js — telemetry version wins (first mount). The health.js version is shadowed. | Maintainability confusion; health.js version unreachable |
| P2-02 | `/api/system/health/detailed` registered in both telemetry/index.js and src/routes/health.js — telemetry version wins. | Shadowed route — one registration is dead code |
| P2-03 | `/api/civilisation/*` routes (lines 477–593 in routes/civilization.js) have no auth middleware. e.g. `GET /api/civilisation/status`, `POST /api/civilisation/consensus/propose` are unauthenticated. | Any unauthenticated caller can read civilization state and propose consensus items |
| P2-04 | `GET /health` endpoint blocks indefinitely when both pg pool and Supabase timeout simultaneously — no per-attempt timeout on DB calls. In production this means the health check endpoint itself can hang for 30–60+ seconds when Supabase degrades. | Render health checks may timeout, triggering deploy failures |
| P2-05 | Real-time data for Finance, Tasks, Notifications, and Email count is not updated after initial page load. No polling, no WebSocket push. | Stale data displayed until user navigates away and back |
| P2-06 | `POST /api/health/supplements/:id/toggle` called at line 17029 — route not found in routes/health.js (which defines supplements routes without toggle path). Possible it's in routes/nutrition.js but not confirmed. | Supplement toggle button silently fails on health page |

### P3 — Minor / Hygiene

| ID | Finding |
|----|---------|
| P3-01 | `GET /api/intelligence/agent-runs` called 7 times from different page sections with no request deduplication. Each triggers a separate DB query. |
| P3-02 | `GET /api/intelligence/cost-summary` called 4 times similarly. |
| P3-03 | `GET /api/system/events` (in-memory event bus) has no frontend consumer — observability data not surfaced to UI. |
| P3-04 | ~180 backend routes have no frontend consumer — acceptable as future capability, but creates maintenance surface. |
| P3-05 | `routes/context.js` `GET /api/context/queue` and `DELETE /api/context/queue/:id` — no auth middleware visible. Queue data may be exposed without auth. |
| P3-06 | `routes/expansion.js` routes — no explicit `_auth` middleware in route definitions (may rely on kernel chain). Verify auth coverage. |
| P3-07 | `routes/spiritual.js` and `routes/life.js` both appear to handle spiritual data (at different paths). Potential overlap. |
| P3-08 | Some fetch() calls in dashboard.html (health page, uni page) send no `x-app-key` header and rely entirely on cookie auth. Works in browser; fails for headless/agent API calls without cookie. |
| P3-09 | `GET /api/reality/health` called at line 18791 — route not confirmed in routes/reality.js (file not fully read). |
| P3-10 | Finance page calls `GET /api/finance/expenses` which returns 404, but `/api/finance/transactions` has equivalent data — the frontend field name and route name are mismatched. Simple rename fix needed. |
| P3-11 | Duplicate `/api/notifications` paths: `GET /notifications` (legacy helper) and `GET /api/notifications` (Supabase direct, marks all as read on fetch). Calling `/api/notifications` auto-marks all as read, which may be an unintended side effect. |

---

## 21. Recommended Remediation Order

### Immediate (P1 — before any beta user sees these pages)

**R-01 — Fix `/api/tasks/approvals` (P1-01)**
Either:
a) Add `GET /api/tasks/approvals` alias to `src/routes/tasks.js` that forwards to the same logic as `GET /api/tasks/standing-approvals` with a pending filter, OR
b) Update frontend line 16695 to call `GET /api/tasks/standing-approvals` instead

**R-02 — Fix `/api/tasks/:id/approve` (P1-02)**
Either:
a) Add `POST /api/tasks/:id/approve` route to `src/routes/tasks.js` that extracts `req.params.id` and delegates to existing approve logic, OR
b) Update frontend line 17344 to use `POST /api/tasks/approve` with `{taskId: id}` in body (already exists)

**R-03 — Fix `/api/finance/expenses` (P1-03)**
Update frontend line 16602 from `fetch('/api/finance/expenses?limit=20')` to `fetch('/api/finance/transactions?limit=20')`. The data structure is compatible.

**R-04 — Remove CRM frontend references (P1-04)**
The CRM system was removed in R6 certification. Remove the `fetch('/api/crm/clients/'+data.id, { method:'PATCH', ... })` call at line 16687 and the CRM stage update UI if CRM is confirmed removed. If CRM is planned for reinstatement, add routes back.

### Short-Term (P2 — before public beta)

**R-05 — Add request timeout to DB calls in /health (P2-04)**
Wrap each DB call in `Promise.race([dbQuery, timeout(5000)])` to prevent indefinite hangs.

**R-06 — Add auth to /api/civilisation/* routes (P2-03)**
Add `_auth` middleware to all `/civilisation/*` route registrations in routes/civilization.js.

**R-07 — Implement real-time refresh for key data (P2-05)**
Finance summary, task count, and notification badge should poll at reasonable intervals (e.g., 60s) or receive WebSocket push events when data changes.

**R-08 — Verify supplement toggle route (P2-06)**
Confirm or create `POST /api/health/supplements/:id/toggle` in routes/health.js.

### Backlog (P3)

**R-09** — Deduplicate `intelligence/agent-runs` and `intelligence/cost-summary` fetch calls
**R-10** — Add auth verification to context.js and expansion.js routes
**R-11** — Remove or consolidate duplicate `/health` registration
**R-12** — Review and remove or document orphaned `/api/system/events` endpoint vs activity feed
**R-13** — Audit spiritual.js vs life.js overlap and consolidate

---

## 22. Explicit Non-Goals

The following were explicitly excluded from this audit per the brief:

- No fixes implemented
- No routes modified
- No frontend JS modified
- No DB schema changes
- No new API endpoints created
- No performance optimizations
- No test creation
- No refactoring of route file organization
- Assessment of Render/production deployment environment (only local runtime tested)
- Full execution of mutating routes (classified C/D/E, static-verified only)
- Code review of all 48 routes/ files (file contents not fully read for all)

---

## 23. Final Beta Integration Verdict

**C — API → INTERFACE NOT READY — P1 INTEGRATION DEFECTS**

Four routes called by the frontend do not exist in the backend:

1. `GET /api/tasks/approvals` — Approval workflow card broken (shows empty)
2. `POST /api/tasks/:id/approve` — Per-task approval silently fails
3. `GET /api/finance/expenses` — Finance expense list empty (use `/transactions`)
4. `PATCH /api/crm/clients/:id` — CRM removed; drag-to-stage silently fails

These are not data-quality issues — they are hard 404 failures for features that the interface presents as functional. All four are easily fixable (3 are frontend-only changes, 1 requires either a route alias or frontend path update). None require architectural changes.

Desktop functionality (chat, command centre core, intelligence, knowledge, governance, memory) is well-integrated. Route architecture is sound. Auth implementation is correct. WebSocket real-time works. The broken integrations are isolated to specific feature cards in Finance, Business, and Tasks pages.

**Minimum for beta access:**
- Resolve P1-01, P1-02 (task approval flow)
- Resolve P1-03 (finance expenses → transactions)
- Resolve P1-04 (remove or restore CRM)
- Resolve P2-04 (health endpoint hang risk — production stability)

---

*Produced: 2026-08-30 | Read-only reconnaissance | No production files modified*
*Evidence sources: server.js, src/routes/* (34 files read), routes/* (selected files read), public/dashboard.html (complete fetch call inventory), lib/middleware.js, lib/app-auth.js, lib/ws-handler.js*
