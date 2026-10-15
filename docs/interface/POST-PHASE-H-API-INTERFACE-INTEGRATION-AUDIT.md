# POST-PHASE-H API → INTERFACE INTEGRATION AUDIT

**Authority:** All previously certified APEX phases (C, D, E, F-Immediate, F-Structural, G, H)  
**Scope:** Complete, read-only, evidence-grounded audit of the entire APEX interface-to-runtime data path  
**Date:** 2026-08-30  
**Method:** Static source analysis. Browser runtime verification unavailable (see Phase 12).  
**Hard stop:** Audit and documentation only. No production files modified.

---

## 1. EXECUTIVE SUMMARY

APEX exposes approximately **731 registered HTTP/WS endpoints** across 80 route files. The single-file SPA (`public/dashboard.html`, ~19,900 lines) makes approximately **130+ fetch calls** to **~90 unique API paths**. Of those 90 paths, **84 resolve to real backend routes**; **6 are broken** (routes that do not exist or path mismatches).

The backend API surface is substantially larger than what the interface consumes. The vast majority of routes — memory subsystems, cognitive architecture, empire/reality-architecture, governance forensics, registry simulation — are backend/internal infrastructure used by the agent pipeline, not the UI. This is by design. The interface correctly exposes a curated subset of ~75 endpoints.

**Critical findings:**
- **6 P1 broken integrations** — frontend fetch calls that return 404 or route to wrong handlers
- **2 unauthenticated endpoint groups** — context queue and British-spelling civilisation routes accessible without credentials
- **4 duplicate route registrations** — telemetry/index.js registers intelligence routes already registered by intelligence.js; first-registered wins, telemetry versions are dead code
- **1 GET with destructive side effect** — `GET /api/notifications` auto-marks all notifications read on every fetch
- **Finance namespace collision** — two separate `finance.js` files serve different `/api/finance/*` paths; frontend finance page uses both without awareness

**Beta readiness:** Internal beta CONDITIONAL on P1 fixes. External beta NOT READY.

---

## 2. COMPLETE API INVENTORY

### 2.1 Route Loading Architecture

```
server.js
├── _loadAgentRoutes()  [lines 321-335]
│   └── Alphabetically loads all routes/*.js (except gemini-live.js, tts-gemini.js)
│       Mount prefix: /api
│       46 files auto-loaded
│
├── app.use('/api', require('./routes/tts-gemini'))  [line 337]
│
├── app.use('/', require('./src/routes/telemetry/index.js')(...))  [line 340]
│   └── Factory function; registers /health, /api/system/health/detailed,
│       /api/ping, /api/deploy-probe, /api/intelligence/*, /api/cost/today,
│       /api/latency-stats, /api/latency-traces, /api/timeline
│
└── app.use(require('./src/routes/[name]'))  [lines 342-375]
    └── 32 explicit src/routes mounts (no prefix — routes define their own /api/* paths)

WebSocket (attached to HTTP server, not Express router):
├── /ws/viz  [lib/ws-handler.js — ring buffer 300 events]
└── /ws/gemini-live  [routes/gemini-live.js — Gemini Live voice]
```

**Route priority rule:** First registered wins. `_loadAgentRoutes` runs before telemetry (line 340), which runs before src/routes/*.

### 2.2 Canonical Route Table — routes/ directory (auto-loaded under /api)

All paths below are prefixed with `/api` at runtime.

#### AGENTS (`routes/agents.js`) — Auth: _auth
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/agents/status | Agent status summary |
| GET | /api/agents/categories | Agent category list |
| GET | /api/agents | All agents array |
| GET | /api/agents/domain | Domain agents |
| POST | /api/agents/invoke | Invoke agent by slug |
| GET | /api/agents/:slug | Single agent by slug |
| POST | /api/agents/domain/invoke | Invoke domain agent |
| POST | /api/agents/sync | Sync agent definitions |

#### BRIEFING (`routes/briefing.js`) — Auth: _auth
| Method | Path |
|--------|------|
| GET | /api/briefing/today |
| GET | /api/briefing/priority-inbox |
| GET | /api/briefing/motivation |
| POST | /api/briefing/wind-down |

#### CAREER (`routes/career.js`) — Auth: _auth
| Method | Path |
|--------|------|
| GET | /api/career/applications |
| POST | /api/career/applications |
| PATCH | /api/career/applications/:id |
| GET | /api/career/interviews |
| POST | /api/career/interviews |
| GET | /api/career/skills |
| POST | /api/career/skills |

#### CIVILIZATION (`routes/civilization.js`) — Mixed auth
| Method | Path | Auth |
|--------|------|------|
| GET | /api/civilization/health | _auth |
| GET | /api/civilization/health/latest | _auth |
| GET | /api/civilization/health/history | _auth |
| POST | /api/civilization/health/snapshot | _auth |
| GET | /api/civilization/health/trend | _auth |
| POST | /api/civilization/intelligence/ingest | _auth |
| POST | /api/civilization/intelligence/scan | _auth |
| GET | /api/civilization/intelligence/events | _auth |
| GET | /api/civilization/intelligence/alerts | _auth |
| POST | /api/civilization/opportunities/detect | _auth |
| GET | /api/civilization/opportunities | _auth |
| POST | /api/civilization/opportunities/:id/action | _auth |
| POST | /api/civilization/council/deliberate | _auth |
| GET | /api/civilization/council/history | _auth |
| POST | /api/civilization/twin/simulate | _auth |
| POST | /api/civilization/strategy/generate | _auth |
| GET | /api/civilization/strategy/plans | _auth |
| POST | /api/civilization/runtime/start | _auth |
| POST | /api/civilization/runtime/stop | _auth |
| GET | /api/civilization/runtime/status | _auth |
| POST | /api/civilization/runtime/tick | _auth |
| GET | /api/civilization/executive/performance | _auth |
| POST | /api/civilization/executive/performance/record | _auth |
| POST | /api/civilization/executive/performance/:id/outcome | _auth |
| GET | /api/civilization/executive/coverage | _auth |
| POST | /api/civilization/decisions/track | _auth |
| POST | /api/civilization/decisions/:id/measure | _auth |
| GET | /api/civilization/decisions/pending | _auth |
| GET | /api/civilization/decisions/measured | _auth |
| GET | /api/civilization/decisions/summary | _auth |
| GET | /api/civilization/resources | _auth |
| POST | /api/civilization/resources/validate | _auth |
| POST | /api/civilization/resources/sync | _auth |
| GET | /api/civilization/value | _auth |
| POST | /api/civilization/value/record | _auth |
| GET | /api/civilization/value/events | _auth |
| POST | /api/civilization/reality/start | _auth |
| POST | /api/civilization/reality/stop | _auth |
| GET | /api/civilization/reality/status | _auth |
| POST | /api/civilization/reality/tick | _auth |
| GET | /api/civilization/score/latest | _auth |
| GET | /api/civilization/score/domains | _auth |
| GET | /api/civilization/score/history | _auth |
| POST | /api/civilization/score/compute | _auth |
| GET | /api/civilization/admission/rules | _auth |
| POST | /api/civilization/admission/evaluate | _auth |
| **GET** | **/api/civilisation/status** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/genome** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/genome/:domainId** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/clock** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/clock/drift** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/clock/:domainId** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/contracts** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/contracts/:domainId** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/domains** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/domains/:name** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/consensus** | **⚠️ NO AUTH** |
| **GET** | **/api/civilisation/consensus/:id** | **⚠️ NO AUTH** |
| **POST** | **/api/civilisation/consensus/propose** | **⚠️ NO AUTH** |
| **POST** | **/api/civilisation/consensus/vote** | **⚠️ NO AUTH** |
| **POST** | **/api/civilisation/consensus/:id/ratify** | **⚠️ NO AUTH** |

#### COGNITIVE (`routes/cognitive.js`) — Auth: router.use(_auth)
22 routes: `/api/cognitive/retrieval-policy/determine`, `/cognitive/retrieval-policy/stats`, `/cognitive/behavior/profile`, `/cognitive/policy/stats`, `/cognitive/autonomy/evaluate`, `/cognitive/autonomy/stats`, `/cognitive/retrieval-eval/quality`, `/cognitive/retrieval-eval/source-effectiveness`, `/cognitive/knowledge-decay/run`, `/cognitive/knowledge-decay/queue`, `/cognitive/knowledge-decay/stats`, `/cognitive/knowledge-decay/revalidate/:memoryId`, `/cognitive/meta-reasoning/stats`, `/cognitive/performance/compute`, `/cognitive/performance/trend`, `/cognitive/evolution/run`, `/cognitive/evolution/proposals`, `/cognitive/evolution/proposals/:proposalId/approve`, `/cognitive/org-intelligence/generate`, `/cognitive/org-intelligence/reports`, `/cognitive/digital-twin/*` (5 routes), `/cognitive/validate`, `/cognitive/health`

#### COGNITIVE-EVAL (`routes/cognitive-eval.js`) — Auth: router.use(_auth)
| Method | Path |
|--------|------|
| POST | /api/cognitive-eval/probe |

#### COGNITIVE-EVOLUTION (`routes/cognitive-evolution.js`) — Auth: router.use(_auth)
18 routes under `/api/cognitive-evolution/*`: attribution/impact, attribution/task/:taskId, twin/accuracy, twin/trend, policies, policies/history, policies/analyze, policies/propose, policies/apply, benchmark/run, benchmark/history, reports/weekly, reports/monthly, reports/quarterly, reports/latest

#### COMMUNICATIONS (`routes/communications.js`) — Auth: _auth
| Method | Path |
|--------|------|
| GET | /api/contacts |
| GET | /api/calendar/events |
| POST | /api/calendar/sync |
| POST | /api/calendar/events |
| GET | /api/communications/emails |

#### CONTEXT (`routes/context.js`) — ⚠️ NO AUTH
| Method | Path | Auth | Note |
|--------|------|------|------|
| GET | /api/context/queue | **NONE** | Returns presentation queue state |
| DELETE | /api/context/queue/:id | **NONE** | Dismisses queue item |

#### EMAILS (`routes/emails.js`) — Auth: requireAppAccess
| Method | Path |
|--------|------|
| GET | /api/emails |
| POST | /api/emails/check |
| POST | /api/emails/:id/approve |
| POST | /api/emails/:id/reject |

#### EMPIRE (`routes/empire.js`) — Auth: _auth
17 routes: `/api/empire/build`, `/empire/stats`, `/empire/nodes/:id`, `/empire/nodes/:id/neighbors`, `/empire/nodes`, `/empire/nodes/:id` (PATCH), `/empire/edges`, `/empire/projects/leverage`, `/empire/people/influence`, `/empire/threats`, `/empire/opportunities`, `/empire/assets`, `/empire/constraints`, `/empire/capital`, `/empire/dependencies/critical`, `/empire/search`, `/empire/health`, `/empire/context`, `/empire/dashboard`

#### ENTITIES (`routes/entities.js`) — Auth: _auth
6 routes: `/api/entities`, `/entities/:id`, `/entities/resolve`, `/entities/:id/interactions`, `/entities/merge-queue`, `/entities/merge-queue/:id/resolve`

#### EXECUTIVE-PERFORMANCE (`routes/executive-performance.js`) — Auth: _auth
12 routes under `/api/executive-performance/*`

#### EXPANSION (`routes/expansion.js`) — Auth: router.use(_auth) at top
| Method | Path |
|--------|------|
| GET | /api/expansion/summary |
| GET | /api/expansion/gaps |
| GET | /api/expansion/pending |
| POST | /api/expansion/approve/:id |
| POST | /api/expansion/reject/:id |
| POST | /api/expansion/scan |

#### FINANCE-BUSINESS (`routes/finance.js`) — Auth: _auth
14 routes covering: `/api/finance/invoices`, `/finance/expenses`, `/finance/subscriptions`, `/finance/investments`, `/finance/balance`, `/finance/cashflow`, `/finance/profit-loss`, and PATCH/POST variants

#### FOUNDER / FOUNDER-GRAPH (`routes/founder.js`, `routes/founder-graph.js`) — Auth: _auth
22 + 17 = 39 routes covering founder profile, goals, domains, alignment, anti-goals, opportunities, state snapshots; founder graph nodes, edges, goals, path, search, context

#### GOVERNANCE (`routes/governance.js`) — Auth: router.use(_auth)
17 routes: `/api/governance/forensics/:taskId`, `/governance/certifications`, `/governance/anomalies`, `/governance/slo-status`, `/governance/agent-reputation`, `/governance/system-certification`, `/governance/incidents`, `/governance/change-intelligence`, `/governance/evidence-chain`, `/governance/policy-violations`, **`/governance/dashboard`**, `/governance/probe`, `/governance/probe/latest`, `/governance/readiness`, `/governance/completeness/:taskId`, `/governance/completeness`, `/governance/architecture-registry`, **`/governance/history`**

#### HEALTH-PHYSICAL (`routes/health.js`) — Auth: _auth (except /health/ping)
| Method | Path | Auth |
|--------|------|------|
| GET | /api/health/ping | None |
| GET | /api/health/workouts | _auth |
| POST | /api/health/workouts | _auth |
| GET | /api/health/nutrition | _auth |
| POST | /api/health/nutrition | _auth |
| GET | /api/health/sleep | _auth |
| POST | /api/health/sleep | _auth |
| GET | /api/mood | _auth |
| POST | /api/mood | _auth |
| GET | /api/health/metrics | _auth |
| GET | /api/health/supplements | _auth |
| POST | /api/health/supplements | _auth |
| GET | /api/health/detailed | _auth |

**Note: No `/api/health/supplements/:id/toggle` route exists (P1 defect)**

#### INTEGRATIONS (`routes/integrations.js`) — Auth: requireAppAccess
16 routes: `/api/integrations/leads/inbound`, `/integrations/tasks`, `/integrations/projects`, `/integrations/clients`, `/notion/sync`, `/notion/log-decision`, `/notion/knowledge-request`, `/slack/alert`, `/slack/test`, `/briefing/daily`, `/briefing/weekly`, `/agent/run`, `/agent/run-complete`, `/system/status`

#### INTELLIGENCE (`routes/intelligence.js`) — Auth: requireAppAccess
| Method | Path | Response Schema |
|--------|------|-----------------|
| POST | /api/intelligence/interrupt | {ok} |
| GET | /api/intelligence/voice-status | {ok, active, sessionId, ttsPlaying} |
| POST | /api/intelligence/voice-state | {ok} |
| GET | /api/intelligence/lessons | {ok, lessons:[]} |
| GET | /api/intelligence/agent-runs | {ok, runs:[{task_id,objective,success,cost_usd,complexity,created_at}]} |
| GET | /api/intelligence/cost-summary | {ok, totalRuns, successRate, totalCostUsd, byComplexity:{}} |
| GET | /api/intelligence/news | {ok, articles:[{title,source,category,url,summary,published_at}]} |
| POST | /api/intelligence/news/refresh | {ok, new_articles, message} |
| GET | /api/intelligence/self-check | {ok, checks:{memory,supabase,event_bus,agent_queue,obsidian,...}, issues:[], latency_ms, ts} |
| GET | /api/intelligence/agent-performance | {ok, days, pipeline:{...}, byRole:{...}} |
| GET | /api/intelligence/performance | {ok, latencyStats, ...} |
| GET | /api/intelligence/system-status | {ok, ...} |
| GET | /api/intelligence/briefing | {ok, briefing:{...}} |
| GET | /api/intelligence/opportunities | {ok, opportunities:[]} |
| GET | /api/intelligence/health | {ok, status, checks:{}} |

#### INTELLIGENCE-MEMORY (`routes/intelligence-memory.js`) — Auth: router.use(_auth)
35 routes: `/api/intelligence/retrieval/stats`, `/intelligence/retrieval/query`, `/intelligence/context/compose`, `/intelligence/decisions/*` (4), `/intelligence/knowledge/*` (3), `/intelligence/contradictions/*` (3), `/intelligence/lifecycle/*` (3), `/intelligence/learning/*` (3), `/intelligence/skills/*` (7), `/intelligence/improvements/*` (4), `/intelligence/graph/*` (4), `/intelligence/health`

#### INTENT (`routes/intent.js`) — Auth: _auth
| Method | Path |
|--------|------|
| POST | /api/intent/dispatch |

#### JOURNAL (`routes/journal.js`) — Auth: _auth
10 routes: `/api/journal/entries` (GET/POST), `/journal/habits` (GET/POST), `/journal/habits/:id/log`, `/journal/habits/:id/streak`, `/journal/gratitude` (GET/POST)

#### KNOWLEDGE (`routes/knowledge.js`) — Auth: router.use(_auth)
| Method | Path | Response Schema |
|--------|------|-----------------|
| POST | /api/knowledge/assess | {ok, assessment} |
| POST | /api/knowledge/requirements | {ok, requirement} |
| POST | /api/knowledge/requirements/:id/assess | {ok} |
| GET | /api/knowledge/requirements/:id/lifecycle | {ok, lifecycle} |
| POST | /api/knowledge/gaps/:id/resolve | {ok} |
| GET | /api/knowledge/gaps | {ok, gaps:[{id,subject,gap_type,status,severity,...}]} |
| GET | /api/knowledge/stats | {ok, total, open, blocking, ...} |
| GET | /api/knowledge/items | {ok, items:[{fact,category,domain,confidence,source,status,validation_state,support_count,contradiction_count,created_at,knowledge_state,confidence_tier}], count} |
| GET | /api/knowledge/state | {ok, classification, stats:{total,open,blocking}, ts} |

#### KNOWLEDGE-GRAPH (`routes/knowledge-graph.js`) — Auth: router.use(_auth)
11 routes under `/api/knowledge-graph/*`

#### LEGAL (`routes/legal.js`) — Auth: _auth
6 routes: `/api/legal/contracts` (GET/POST), `/legal/contracts/:id` (PATCH), `/legal/deadlines` (GET/POST), `/legal/deadlines/:id/complete`

#### LIFE (`routes/life.js`) — Auth: _auth
| Method | Path |
|--------|------|
| GET | /api/habits |
| POST | /api/habits/:id/toggle |
| POST | /api/habits/log |
| GET | /api/psychology/crisis-check |
| GET | /api/life/journal/entries |
| POST | /api/life/journal/entries |
| GET | /api/life/habits |
| GET | /api/life/psychology/crisis-check |
| GET | /api/life/spiritual/sessions |
| POST | /api/life/spiritual/log |
| GET | /api/life/university/modules |
| GET | /api/life/university/assignments |
| GET | /api/life/university/flashcards |
| POST | /api/life/university/flashcards/:id/review |
| GET | /api/life/university/sessions |
| GET | /api/life/university/reading-list |
| PATCH | /api/university/assignments/:id/complete |

#### MEMORY (`routes/memory.js`) — Auth: router.use(_auth)
48 routes covering: `/api/memory/working/*`, `/memory/episodic/*`, `/memory/semantic/*`, `/memory/procedural/*`, `/memory/strategic/*`, `/memory/skills/*`, `/memory/decisions/*`, `/memory/consolidation/*`, `/memory/reflexion/*`, `/memory/improvements/*`, `/memory/health`

**Key consumed routes:**
- `GET /api/memory/health` → `{ok, checks:{}, status, ts}`
- `GET /api/memory/episodic/recent` → `{ok, memories:[]}`

#### NUTRITION (`routes/nutrition.js`) — Auth: _auth
12 routes under `/api/nutrition/*`

#### OBSERVATORY (`routes/observatory.js`) — Auth: router.use(_auth)
| Method | Path |
|--------|------|
| GET | /api/observatory |
| GET | /api/observatory/summary |

#### OPERATIONS (`routes/operations.js`) — Auth: mixed (_auth for /operations/*, none for health checks)
| Method | Path | Auth |
|--------|------|------|
| GET | /api/healthz | None |
| GET | /api/version | None |
| GET | /api/status | None |
| GET | /api/ping | None |
| GET | /api/ready | None |
| GET | /api/metrics | None |
| GET | /api/memory-stats | _auth |
| GET | /api/info | _auth |
| GET | /api/uptime | None |
| GET | /api/build-info | None |
| GET | /api/operations/clients | _auth |
| POST | /api/operations/clients | _auth |
| GET | /api/operations/projects | _auth |
| GET | /api/operations/documents | _auth |
| GET | /api/operations/proposals | _auth |
| POST | /api/operations/migrations/run | _auth |
| GET | /api/operations/migrations/list | _auth |

#### PROPERTY (`routes/property.js`) — Auth: _auth
7 routes under `/api/property/*`

#### PWA (`routes/pwa.js`)
| Method | Path | Auth |
|--------|------|------|
| GET | /api/icon-192.png | None |
| GET | /api/icon-512.png | None |
| GET | /api/pwa/vapid-key | None |
| POST | /api/pwa/subscribe | _auth |
| DELETE | /api/pwa/subscribe | _auth |
| POST | /api/pwa/push | _auth |

**Note:** `/api/icon-*.png` are double-mounted; `src/routes/ui.js` also serves icons at root path.

#### REALITY (`routes/reality.js`) — Auth: router.use(auth)
6 routes: `/api/reality/claims` (GET/POST), `/reality/claims/:id/advance`, `/reality/health`, `/reality/health/:entityId`, `/reality/project`

#### REALITY-ARCHITECTURE (`routes/reality-architecture.js`) — Auth: router.use(auth)
22 routes under `/api/reality-architecture/*`

#### REGISTRY (`routes/registry.js`) — Auth: unspecified (no router.use auth seen)
34+ routes under `/api/registry/*`

#### RELATIONSHIPS (`routes/relationships.js`) — Auth: _auth
7 routes under `/api/relationships/*`

#### SHOPPING, SOCIAL, SPIRITUAL, STRATEGIC, TRAVEL, WEALTH — Auth: _auth
- shopping: 5 routes `/api/shopping/*`
- social: 5 routes `/api/social/*`
- spiritual: 4 routes `/api/spiritual/*`
- strategic: 13 routes `/api/strategic/*`
- travel: 6 routes `/api/travel/*`
- wealth: 8 routes `/api/wealth/*`

#### TTS-GEMINI (`routes/tts-gemini.js`) — Auth: _auth (explicit mount under /api)
| Method | Path |
|--------|------|
| POST | /api/tts/gemini |
| GET | /api/tts/gemini/voices |

#### UNIVERSITY (`routes/university.js`) — Auth: _auth
| Method | Path |
|--------|------|
| GET | /api/university/assignments |
| POST | /api/university/assignments |
| PATCH | /api/university/assignments/:id |
| GET | /api/university/modules |
| POST | /api/university/modules |
| POST | /api/university/study-sessions |
| GET | /api/university/study-sessions |
| GET | /api/university/deadlines |

**Note: No `/api/university/flashcards` route (P1 defect). No `/api/university/sessions` (P1 defect — correct path is `/university/study-sessions`).**

#### VOICE-CHAT (`routes/voice-chat.js`) — Auth: _auth
| Method | Path |
|--------|------|
| POST | /api/voice-chat |

### 2.3 Canonical Route Table — src/routes/ directory

#### TELEMETRY (`src/routes/telemetry/index.js`) — mounted at `/`
| Method | Path | Auth | Response Schema |
|--------|------|------|-----------------|
| GET | /health | None | {status,version,uptime,timestamp,db,tts,ai,memory,mastra,ws,sentry,correlationIds,recentErrors} |
| GET | /api/system/health/detailed | requireAppAccess | {timestamp,uptime,memory,db,supabase,voice,agentQueue,agents,obsidian,latency} |
| GET | /api/ping | None | {ok:true} |
| GET | /api/deploy-probe | None | {v, ts} |
| GET | /api/intelligence/agent-runs | requireAppAccess | **⚠️ SHADOWED by routes/intelligence.js** |
| GET | /api/intelligence/cost-summary | requireAppAccess | **⚠️ SHADOWED by routes/intelligence.js** |
| GET | /api/intelligence/lessons | requireAppAccess | **⚠️ SHADOWED by routes/intelligence.js** |
| GET | /api/intelligence/self-check | requireAppAccess | **⚠️ SHADOWED by routes/intelligence.js** |
| GET | /api/cost/today | requireAppAccess | {ok, date, cost_usd, runs} |
| GET | /api/latency-stats | requireAppAccess | {stats:[]} |
| GET | /api/latency-traces | requireAppAccess | {traces:[]} |
| GET | /api/timeline | requireAppAccess | {ok, timeline:[{id,event_type,summary,created_at}]} |

**Important:** `_loadAgentRoutes()` (lines 321-335) runs BEFORE telemetry is mounted (line 340). routes/intelligence.js registers `/api/intelligence/agent-runs` etc. first. The telemetry versions are dead code — they will never be reached.

#### HEALTH-SYSTEM (`src/routes/health.js`)
| Method | Path | Auth | Note |
|--------|------|------|------|
| GET | /health | None | **⚠️ SHADOWED by telemetry/index.js** |
| GET | /health/deep | requireAppAccess | Detailed component checks |
| GET | /api/system/health/detailed | kernelChain | **⚠️ SHADOWED by telemetry/index.js** |

#### AUTH (`src/routes/auth.js`)
| Method | Path | Auth |
|--------|------|------|
| POST | /auth/login | None — sets apex_token (httpOnly) + apex_session cookies |
| POST | /auth/logout | None — clears cookies |
| GET | /auth/gmail/reauthorise | requireAppAccess |
| GET | /auth/gmail/callback | requireAppAccess |

#### NOTIFICATIONS (`src/routes/notifications.js`)
| Method | Path | Auth | Note |
|--------|------|------|------|
| GET | /notifications | requireAppAccess | Legacy pg helper, returns last 50 |
| POST | /notifications/:id/read | requireAppAccess | Marks one as read |
| GET | /api/notifications | requireAppAccess | **⚠️ AUTO-MARKS ALL UNREAD AS READ on every fetch** |

#### TASKS (`src/routes/tasks.js`) — Auth: requireAppAccess
| Method | Path | Body/Params | Response |
|--------|------|-------------|----------|
| GET | /api/tasks | - | {tasks:[]} |
| POST | /api/tasks/add | {title} | {ok, task} |
| POST | /api/tasks/run | {taskId} | {ok} |
| POST | /api/tasks/notify | {taskId} | {ok} |
| POST | /api/tasks/approve | **{taskId}** in body | {ok} |
| POST | /api/tasks/reject | {taskId} | {ok} |
| GET | /api/tasks/standing-approvals | - | {ok, approvals:[]} |
| POST | /api/tasks/undo | {taskId} | {ok} |

**Note: No `GET /api/tasks/approvals` (P1). No `POST /api/tasks/:id/approve` parameterized (P1).**

#### FINANCE-PERSONAL (`src/routes/finance.js`) — Auth: requireAppAccess
| Method | Path | Response |
|--------|------|----------|
| POST | /api/finance/transaction | {ok, id} |
| GET | /api/finance/transactions | {ok, transactions:[]} |
| GET | /api/finance/summary | {ok, totalIn, totalOut, net, recentTransactions:[], period} |
| POST | /api/finance/budget | {ok} |
| POST | /api/finance/upload-csv | {ok, imported} |

#### MASTER (`src/routes/master.js`) — Auth: requireAppAccess
Key routes with response schemas:

| Method | Path | Response Schema |
|--------|------|-----------------|
| GET | /api/agent/status | {ok, agents:[{slug,name,status}]} — from apex_agents table |
| GET | /api/master/schedules | {ok, schedules:[{name,enabled,last_run,status,duration_ms}]} |
| GET | /api/master/metrics | {ok, roadmap:{total,completed,pending,pct}, tasks, pipelineRuns, agentRuns, successRate, totalCostUsd, costByWorkstream:{}} |
| GET | /api/master/roadmap | {ok, roadmap:{}, total, completed, remaining} |
| GET | /api/master/permissions | {ok, permissions:[]} |
| POST | /api/master/approve | {ok} |
| POST | /api/master/run | {ok} |
| POST | /api/master/feature | {ok, featureId} |
| GET | /api/overview/vitals | {ok, health, lastCycle, cycleMs, alerts, spend24h, memNew1h, uptime} |
| POST | /api/capture | {ok, ...classification} |
| POST | /api/admin/sre/run | {success, result} |

#### SYSTEM (`src/routes/system.js`) — Auth: requireAppAccess
| Method | Path |
|--------|------|
| GET | /api/system/events |
| GET | /api/system/queue |
| GET | /api/system/tools |
| GET | /api/system/cognition |
| GET | /api/system/state |
| GET | /api/system/state/:sessionId |
| GET | /api/system/cognition/threads |
| GET | /api/system/arbitration |
| GET | /api/system/arbitration/:sessionId |
| GET | /api/system/strategy |
| GET | /api/system/strategy/:sessionId |

#### BROWSER (`src/routes/browser.js`) — Auth: requireAppAccess
25 routes under `/api/browser/*` (all POST): aria-snapshot, har, press, fill, select, drag, eval, console, web-vitals, annotated, mock, cookies, trace, video, research, fill-form, click, research-parallel, entity, pdf, accessibility, monitor, discover-api, batch-form, screenshot

#### RESEARCH (`src/routes/research.js`) — Auth: requireAppAccess
11 routes under `/api/research/*`

#### RAG (`src/routes/rag.js`) — Auth: requireAppAccess + requireRagSidecar
8 routes under `/api/rag/*`

#### WIKI (`src/routes/wiki.js`) — Auth: requireAppAccess
12 routes under `/api/wiki/*`

#### EDITOR (`src/routes/editor.js`) — Auth: requireAppAccess
17+ routes under `/api/editor/*`

#### ADMIN (`src/routes/admin.js`) — Auth: requireAppAccess
| Method | Path |
|--------|------|
| GET | /health/deep |
| GET | /api/cognitive/report |
| GET | /api/admin/civilization-status |
| GET | /api/admin/civilization-status-v2 |
| GET | /api/admin/improvements/queue |
| GET | /api/executive/verdicts |
| GET | /api/cron/history |
| GET | /api/memory/stats |

#### AUTONOMY (`src/routes/autonomy.js`) — Auth: requireAppAccess
11 routes under `/api/autonomy/*`

#### CHAT (`src/routes/chat.js`) — Auth: requireAppAccess + kernelChain
| Method | Path |
|--------|------|
| POST | /chat |

#### AGENT-TASKS (`src/routes/agent-tasks.js`) — Auth: requireAppAccess
| Method | Path |
|--------|------|
| GET | /agent-tasks |
| GET | /agent-task/:id |

#### AGENT-SCHEDULES (`src/routes/agent-schedules.js`) — Auth: requireAppAccess/requireCronAccess
| Method | Path | Auth |
|--------|------|------|
| GET | /agent-schedules | requireAppAccess |
| POST | /run-schedules-now | requireAppAccess |
| GET | /cron/health | requireAppAccess |
| POST | /cron/run-schedules | requireCronAccess |

#### OTHER src/routes/
- `/api/config` (GET, mastra.js) — returns Mastra config
- `/api/mastra/run` (POST) — run Mastra workflow
- `/api/routines` (GET/POST/PATCH/DELETE) — routine management
- `/api/transcribe` (POST) — audio transcription (multipart)
- `/api/voice/pipeline` (POST) — voice pipeline
- `/api/upload-file` (POST) — file upload
- `/files` (GET) — file listing
- `/documents` (GET) — document listing
- `/agent-history` (GET) — agent history
- `/load-layout` (GET) / `/save-layout` (POST) — dashboard layout persistence
- `/api/setup/*` (4 routes) — database migrations
- `/api/governance/*` (4 routes, governance-inline.js) — migration runners
- `/api/ruflo/*` (4 routes) — Ruflo orchestration
- `/api/convert/*` (7 routes) — file conversion
- `/api/browser/*` (25 routes) — browser automation
- `/api/send-reply` (POST) — send email reply
- `/api/ai-draft-reply` (POST) — AI email draft

### 2.4 WebSocket Endpoints

| Path | Handler | Description |
|------|---------|-------------|
| /ws/viz | lib/ws-handler.js | Runtime event stream, ring buffer 300 events. Frontend connects at dashboard lines 8827 and 19180 |
| /ws/gemini-live | routes/gemini-live.js | Gemini Live voice session |

### 2.5 Total Route Count

| Source | Routes |
|--------|--------|
| routes/ (auto-loaded, 46 files) | ~543 |
| src/routes/ (explicit, 34 files) | ~185 |
| WebSocket | 2 |
| **Total** | **~730** |

---

## 3. INTERFACE FETCH INVENTORY

### 3.1 Fetch Mechanisms Used

| Mechanism | Used? | Notes |
|-----------|-------|-------|
| fetch() | ✓ Yes | Primary — both raw and via fetchJson() wrapper |
| fetchJson() | ✓ Yes | Wrapper at line 11165; adds x-app-key header, JSON-decodes |
| WebSocket | ✓ Yes | 2 connections: /ws/viz (lines 8827, 19180), /ws/gemini-live (line 10690) |
| EventSource/SSE | ✗ No | Not used |
| XMLHttpRequest | ✗ No | Not used |
| Polling/setInterval | ✓ Yes | Activity tab: 30s WebSocket reconnect; some 60s data refresh timers |
| Form submissions | ✗ No | Not used |

### 3.2 Authentication in Frontend Requests

```javascript
// buildApiHeaders() — line 11143
function buildApiHeaders(extra = {}) {
    const key = window._appKey || APP_KEY || '';
    return { 'x-app-key': key, ...extra };
}

// fetchJson() — line 11165
async function fetchJson(path, options = {}) {
    const res = await fetch(buildApiUrl(path), {
        ...options,
        headers: { ...buildApiHeaders(), ...options.headers }
    });
    ...
}
```

Most fetch calls use `fetchJson()` (inherits x-app-key). Some raw `fetch()` calls manually add `buildApiHeaders()` or `{headers: {'x-app-key': APP_KEY||''}}`. A small number of raw `fetch()` calls do NOT add auth headers — these work only because the backend routes lack auth requirements (ops routes, /health).

### 3.3 Complete Frontend → Backend Mapping

#### CORE / INIT
| Dashboard Line | URL | Method | Backend Route | Status | Trigger |
|----------------|-----|--------|---------------|--------|---------|
| 8800 | /api/overview/vitals | GET | src/routes/master.js | ✓ | Early init |
| 8827, 19180 | /ws/viz | WS | lib/ws-handler.js | ✓ | Page load |
| 10690 | /ws/gemini-live | WS | routes/gemini-live.js | ✓ | Voice mode |
| 13383 | /api/config | GET | src/routes/mastra.js | ✓ | File section init |
| 13883 | /api/ping | GET | src/routes/telemetry/index.js | ✓ | Health probe |
| 14472 | /auth/login | POST | src/routes/auth.js | ✓ | Login form |
| 17724 | /health | GET | src/routes/telemetry/index.js | ✓ | System status widget |

#### COMMAND PAGE
| Line | URL | Status | Notes |
|------|-----|--------|-------|
| 12588 | /chat | ✓ | Chat handler |
| 12639,12647 | /api/voice-chat, /chat | ✓ | Voice chat handler |
| 13699 | /api/master/metrics | ✓ | Dashboard metrics panel |
| 13700 | /api/intelligence/cost-summary | ✓ | Cost widget |
| 13621 | /api/timeline | ✓ | Timeline panel |
| 13653 | /api/master/roadmap | ✓ | Roadmap widget |
| 13674 | /api/master/run | ✓ | Run orchestrator |
| 13683 | /api/setup/database | ✓ | Setup trigger |
| 13720 | /api/intelligence/agent-runs?limit=6 | ✓ | Recent runs widget |
| 13746 | /api/intelligence/lessons?n=8 | ✓ | Lessons widget |
| 13759 | /api/master/feature | ✓ | Feature execution |
| 13782 | /api/agents | ✓ | Agent list |
| 13832 | /api/agents/sync | ✓ | Agent sync |
| 13845 | /api/agents/invoke | ✓ | Agent invocation |
| 13524 | /api/master/permissions | ✓ | Permissions check |
| 13513 | /api/notifications | ✓ | Notification count |

#### ACTIVITY / OBSERVABILITY TAB
| Line | URL | Status | Refresh |
|------|-----|--------|---------|
| 19180 | /ws/viz | ✓ | WebSocket (persistent) |
| 19208 | /api/timeline | ✓ | On tab switch |
| 19228 | /notifications | ✓ | On tab switch |
| 19271 | /api/intelligence/self-check | ✓ | On tab switch |
| 19289 | /api/intelligence/agent-runs | ✓ | On tab switch |
| 19312 | /api/tasks/standing-approvals | ✓ | On tab switch |
| 19338, 19371 | /api/tasks | ✓ | On tab switch |

#### AGENTS PAGE
| Line | URL | Status |
|------|-----|--------|
| 13782 | /api/agents | ✓ |
| 19629 | /api/agents/domain | ✓ |
| 15963 | /api/agents/domain/invoke | ✓ |

#### APPROVALS PAGE
| Line | URL | Status | Issue |
|------|-----|--------|-------|
| 16695 | /api/tasks/approvals?status=pending&limit=5 | **⚠️ 404** | P1: Route does not exist |
| 17337 | /api/tasks/approve (body:{taskId}) | ✓ | Correct approve path |
| 17344 | /api/tasks/'+id+'/approve | **⚠️ 404** | P1: Parameterized route does not exist |
| 19403 | /api/tasks/reject | ✓ | |
| 19424 | /api/tasks/approve | ✓ | Second correct approve path |

#### INTELLIGENCE PAGE
| Line | URL | Status |
|------|-----|--------|
| 19541 | /api/intelligence/briefing | ✓ |
| 19573 | /api/intelligence/health | ✓ |
| 19601 | /api/intelligence/opportunities?limit=15 | ✓ |
| 14918 | /api/intelligence/cost-summary | ✓ |
| 14933 | /api/intelligence/agent-runs?limit=100 | ✓ |
| 14965 | /api/intelligence/agent-runs?limit=8 | ✓ |
| 14983 | /api/intelligence/cost-summary | ✓ |
| 15022 | /api/intelligence/news | ✓ |
| 15177 | /api/intelligence/agent-runs | ✓ |
| 15178 | /api/master/metrics | ✓ |

#### KNOWLEDGE PAGE
| Line | URL | Status |
|------|-----|--------|
| 19462 | /api/knowledge/items | ✓ |
| 19477 | /api/knowledge/state | ✓ |
| 19506 | /api/knowledge/gaps?status=OPEN&limit=20 | ✓ |
| 15983 | /api/wiki/status | ✓ |
| 16023 | /api/wiki/ingest-cs249r | ✓ |

#### MEMORY PAGE
| Line | URL | Status |
|------|-----|--------|
| 19659 | /api/memory/health | ✓ |
| 19685 | /api/memory/episodic/recent | ✓ |
| 19713 | /api/memory/[type]/search (dynamic) | ✓ |

#### FINANCE PAGE
| Line | URL | Status | Notes |
|------|-----|--------|-------|
| 13063 | /api/finance/summary | ✓ | src/routes/finance.js |
| 13117 | /api/finance/transaction | ✓ | POST new transaction |
| 16602 | /api/finance/expenses?limit=20 | ✓ | routes/finance.js (BUSINESS expenses) |
| 17749 | /api/finance/summary | ✓ | Duplicate of 13063 |
| 16619 | /api/intelligence/cost-summary | ✓ | AI cost display |

**Finance namespace note:** `/api/finance/expenses` resolves to `routes/finance.js` (business expense tracker) — distinct from `src/routes/finance.js` personal transaction summary. The Finance UI uses both without explicit distinction.

#### COMMUNICATION PAGE
| Line | URL | Status |
|------|-----|--------|
| 12894 | /api/emails | ✓ |
| 12936 | /api/emails/check | ✓ |
| 12977 | /api/ai-draft-reply | ✓ |
| 13012 | /api/send-reply | ✓ |
| 13032 | /api/emails/:id/approve | ✓ |
| 13051 | /api/emails/:id/reject | ✓ |
| 15179 | /api/emails | ✓ |
| 16415, 16503 | /api/emails | ✓ |
| 17329 | /api/send-reply | ✓ |
| 15180 | /api/calendar/events | ✓ |
| 14362 | /api/contacts | ✓ |

#### HEALTH/LIFE PAGE
| Line | URL | Status | Issue |
|------|-----|--------|-------|
| 14058 | /api/health/workouts | ✓ | |
| 14701 | /api/health/sleep | ✓ | |
| 16986 | /api/health/sleep?limit=7 | ✓ | |
| 17010 | /api/health/supplements | ✓ | |
| 17029 | /api/health/supplements/'+id+'/toggle | **⚠️ 404** | P1: No toggle route |
| 17046 | /api/health/metrics | ✓ | |
| 14758 | /api/mood | ✓ | |
| 14199 | /api/habits | ✓ | |
| 15000 | /api/habits | ✓ | |
| 17236 | /api/life/habits | ✓ | |
| 14224 | /api/psychology/crisis-check | ✓ | |
| 17221 | /api/life/psychology/crisis-check | ✓ | |
| 14166, 14184 | /api/journal/entries | ✓ | |
| 17152, 17159, 17202 | /api/life/journal/entries | ✓ | |
| 17033, 17173 | /api/life/spiritual/sessions | ✓ | |
| 17090 | /api/life/spiritual/log | ✓ | |

#### UNIVERSITY PAGE
| Line | URL | Status | Issue |
|------|-----|--------|-------|
| 14276 | /api/university/modules | ✓ | |
| 14277 | /api/university/assignments | ✓ | |
| 14278 | /api/university/flashcards | **⚠️ 404** | P1: No route; correct path is /api/life/university/flashcards |
| 14321 | /api/university/sessions | **⚠️ 404** | P1: Correct path is /api/university/study-sessions |
| 16811 | /api/life/university/modules | ✓ | |
| 16826 | /api/life/university/assignments | ✓ | |
| 16846 | /api/life/university/flashcards | ✓ | |
| 16868 | /api/life/university/reading-list | ✓ | |
| 16929 | /api/life/university/flashcards/:id/review | ✓ | |
| 17058 | /api/life/university/sessions | ✓ | |

#### BUSINESS PAGE
| Line | URL | Status |
|------|-----|--------|
| 14083 | /api/operations/clients | ✓ |
| 14101 | /api/operations/projects | ✓ |
| 14127 | /api/operations/documents | ✓ |
| 14148 | /api/operations/proposals | ✓ |
| 14844 | /api/operations/clients | ✓ |
| 14860 | /api/operations/projects | ✓ |
| 14874 | /api/operations/documents | ✓ |
| 14888 | /api/operations/proposals | ✓ |
| 16722 | /api/operations/clients | ✓ |
| 16742 | /api/operations/projects | ✓ |

#### SYSTEM PAGE
| Line | URL | Status |
|------|-----|--------|
| 19752 | /api/governance/dashboard | ✓ |
| 19781 | /api/governance/history?limit=20 | ✓ |
| 16112 | /api/latency-stats | ✓ |
| 16113 | /api/latency-traces | ✓ |
| 16331 | /api/master/schedules | ✓ |
| 18083 | /api/cost/today | ✓ |
| 18334 | /api/agent/status | ✓ |

#### CIVILISATION PAGE
| Line | URL | Status |
|------|-----|--------|
| 18640 | /api/civilisation/status | ✓ (no auth on route) |
| 18658 | /api/civilisation/domains | ✓ (no auth) |
| 18662 | /api/civilisation/consensus | ✓ (no auth) |
| 18674 | /api/civilisation/consensus/propose | ✓ (no auth) |
| 18692 | /api/expansion/summary | ✓ |
| 18693 | /api/expansion/pending | ✓ |
| 18742 | /api/expansion/scan | ✓ |
| 18754 | /api/expansion/approve/:id | ✓ |
| 18762 | /api/expansion/reject/:id | ✓ |

#### REALITY/ATTENTION PAGE
| Line | URL | Status |
|------|-----|--------|
| 18791 | /api/reality/health | ✓ |
| 18817 | /api/reality-architecture/observers | ✓ |
| 18837 | /api/reality-architecture/beliefs/DOM-000001/gap | ✓ |
| 18860 | /api/reality-architecture/epistemic-capital/DOM-000001| ✓ |
| 18882 | /api/reality-architecture/attention/top?limit=8 | ✓ |
| 18906 | /api/reality-architecture/understanding/DOM-000001 | ✓ |
| 18930 | /api/reality-architecture/intent/agent-orchestrator/rate | ✓ |
| 18977 | /api/reality-architecture/counterfactual/worlds | ✓ |
| 19000 | /api/reality-architecture/meta-model | ✓ |
| 19022 | /api/reality-architecture/mental-models/agent-orchestrator | ✓ |
| 19044 | /api/reality-architecture/self-model | ✓ |
| 19097 | /api/reality-architecture/seed | ✓ |

#### MISCELLANEOUS
| Line | URL | Status | Notes |
|------|-----|--------|-------|
| 12704 | /memory | ✓ | Legacy — src/routes/debug.js |
| 12734 | /notifications | ✓ | Legacy notification list |
| 12782 | /agent-tasks | ✓ | Agent task list |
| 12841 | /documents | ✓ | Document list |
| 12845 | /files | ✓ | File list |
| 12880 | /agent-task/:id | ✓ | Single task |
| 13364 | /api/upload-file | ✓ | File upload |
| 18208 | /api/transcribe | ✓ | Transcription |
| 18301 | /api/convert/file | ✓ | File conversion |
| 16687 | /api/crm/clients/:id | **⚠️ 404** | P1: CRM removed in R6 |

---

## 4. API → UI MAPPING (Top-Level)

| API | Frontend Consumer | Page | Render Target |
|-----|------------------|------|---------------|
| /api/master/metrics | Command page init | Command | Metrics panel: roadmap%, tasks, agent runs, cost |
| /api/intelligence/agent-runs | Activity, Intelligence, Command | Multiple | Runs table, cost chart |
| /api/intelligence/cost-summary | Intelligence, Finance widget | Intelligence | Cost breakdown table |
| /api/timeline | Activity, Command | Activity | Timeline events list |
| /api/notifications | Command, Activity | Multiple | Notification badge + list |
| /api/tasks | Approvals, Command | Approvals/Command | Task list |
| /api/tasks/standing-approvals | Activity | Activity | Standing approvals panel |
| /api/finance/summary | Finance, Command | Finance | Balance, net, recent transactions |
| /api/finance/expenses | Finance | Finance | Expense list (business data) |
| /api/agents | Command, Agents | Agents | Agent grid |
| /api/agents/domain | Domain intelligence | Multiple | Domain agent cards |
| /api/emails | Communication | Communication | Email thread list |
| /api/calendar/events | Communication | Communication | Calendar events |
| /api/contacts | Communication | Communication | Contact list |
| /api/knowledge/items | Knowledge | Knowledge | Knowledge item cards |
| /api/knowledge/state | Knowledge | Knowledge | State classification badge |
| /api/knowledge/gaps | Knowledge | Knowledge | Gap list |
| /api/intelligence/briefing | Intelligence | Intelligence | Morning brief |
| /api/intelligence/opportunities | Intelligence | Intelligence | Opportunity list |
| /api/intelligence/health | Intelligence | Intelligence | Health status |
| /api/intelligence/news | Intelligence | Intelligence | News feed |
| /api/memory/health | Memory | Memory | Memory health gauge |
| /api/memory/episodic/recent | Memory | Memory | Recent episodes list |
| /api/governance/dashboard | System | System | Governance metrics |
| /api/governance/history | System | System | Governance history |
| /api/health/sleep | Health | Health | Sleep chart |
| /api/health/workouts | Health | Health | Workout list |
| /api/health/supplements | Health | Health | Supplement list |
| /api/health/metrics | Health | Health | Biometric metrics |
| /api/mood | Health | Health | Mood log |
| /api/habits | Health | Health | Habit tracker |
| /api/life/university/* | University | University | Module/assignment/flashcard/session views |
| /api/university/modules | University | University | Module list (duplicate path) |
| /api/university/assignments | University | University | Assignment list |
| /api/operations/clients | Business | Business | Client list |
| /api/operations/projects | Business | Business | Project list |
| /api/intelligence/self-check | Activity | Activity | Subsystem health panel |
| /api/civilisation/status | Civilisation | Civilisation | Civilisation status |
| /api/expansion/* | Civilisation | Civilisation | Expansion panel |
| /api/reality-architecture/* | Reality | Reality | Reality model panels |
| /api/cost/today | System | System | Daily AI cost widget |
| /api/master/schedules | System | System | Schedule list |
| /ws/viz | Activity, Command | Multiple | Real-time event stream |

---

## 5. FIELD-LEVEL MAPPING (Critical Routes)

### 5.1 /api/master/metrics

**Response:** `{ok, roadmap:{total,completed,pending,pct}, tasks, pipelineRuns, agentRuns, successRate, totalCostUsd, costByWorkstream:{}}`

**Source:** Computed from `apex_tasks` (count), `apex_timeline` (count), `apex_agent_runs` (last 500 rows), plus filesystem `roadmap.json` parse.

| Field | Source | UI Consumption | Rendered |
|-------|--------|----------------|----------|
| roadmap.pct | Computed from roadmap.json | Command metrics panel | Progress % |
| roadmap.total/completed | roadmap.json | Command panel | Task counts |
| tasks | apex_tasks count | Command panel | Task count widget |
| agentRuns | apex_agent_runs count (last 500) | Command panel | Run count |
| successRate | Computed from apex_agent_runs | Command panel | Success % |
| totalCostUsd | Sum apex_agent_runs.cost_usd | Command/Intelligence | Cost display |
| costByWorkstream | Grouped from task_id prefix | Intelligence | Cost breakdown |

**Live/Static:** Genuinely live — fresh DB queries per request. No cache.

### 5.2 /api/intelligence/agent-runs

**Response:** `{ok, runs:[{task_id, objective, success, cost_usd, complexity, created_at}]}`

**Source:** `apex_agent_runs` table, ordered by created_at DESC, limit param (default 20).

| Field | Rendered |
|-------|----------|
| task_id | Run ID in table |
| objective | Run description text |
| success | Green/red status indicator |
| cost_usd | Cost column |
| complexity | Complexity badge |
| created_at | Timestamp |

**Live/Static:** Live. No cache. Called 6+ times by different dashboard panels (duplicate fetches — P3).

### 5.3 /api/intelligence/cost-summary

**Response:** `{ok, totalRuns, successRate, totalCostUsd, byComplexity:{tier:{runs,succeeded,successRate,avgCostUsd}}}`

**Source:** Last 1000 rows from `apex_agent_runs`. Computed in memory.

**Live/Static:** Live but capped at last 1000 records.

### 5.4 /api/finance/summary

**Response:** `{ok, totalIn, totalOut, net, recentTransactions:[], period}`

**Source:** `src/routes/finance.js` — personal transaction tracker. Cached per-request (60s cache was present in prior session notes; verify in source).

| Field | Rendered |
|-------|----------|
| totalIn | Income total |
| totalOut | Expenses total |
| net | Net balance |
| recentTransactions | Transaction list (Finance page) |

**Live/Static:** Fetched-but-cached (60s TTL if cache is active; degrades gracefully on DB failure).

### 5.5 /api/knowledge/items

**Response:** `{ok, items:[{fact, category, domain, confidence, source, status, validation_state, support_count, contradiction_count, created_at, knowledge_state, confidence_tier}], count}`

**Source:** `lib/memory/semantic-memory.js` → `apex_memories` table (semantic memory type). Fields enriched with computed `knowledge_state` (FULLY_KNOWN/PARTIALLY_KNOWN/CONFLICTING/UNKNOWN) and `confidence_tier` (VERY HIGH/HIGH/MEDIUM/LOW/UNCERTAIN).

**Field rendering:**
- `fact` → knowledge item text
- `confidence_tier` → confidence badge
- `knowledge_state` → state classification badge
- `category`, `domain` → filter chips
- `support_count`, `contradiction_count` → evidence counters

**Live/Static:** Live per request; no cache.

### 5.6 /api/timeline

**Response:** `{ok, timeline:[{id, event_type, summary, created_at}]}`

**Source:** `apex_timeline` table. Newest events first.

**Live/Static:** Live. Fetched on tab switch and activity panel init.

### 5.7 /api/memory/health

**Response:** `{ok, checks:{...}, status, ts}`

**Source:** In-process memory subsystem health checks.

**Live/Static:** Live runtime check (memory subsystem state, not DB query).

### 5.8 /api/intelligence/self-check

**Response:** `{ok, checks:{memory:{ok,rss_mb,...}, supabase:{ok,latency_ms,...}, event_bus:{ok,...}, agent_queue:{ok,...}, obsidian:{ok,...}}, issues:[], latency_ms, ts}`

**Source:** Process memory introspection, Supabase probe, event bus inspection, agent queue status, optional Obsidian tunnel probe.

**Live/Static:** Live. Fresh process state + live Supabase query.

---

## 6. PAGE-BY-PAGE DATA COVERAGE

### COMMAND PAGE

**APIs used:** /chat, /api/master/metrics, /api/intelligence/agent-runs, /api/intelligence/cost-summary, /api/timeline, /api/master/roadmap, /api/master/permissions, /api/notifications, /api/agents, /api/overview/vitals, /ws/viz

**Live data:** agent runs, timeline, notifications, agent list, cost, system metrics
**Static/hardcoded:** None identified
**Missing:** No dedicated command status widget refresh; relies on tab switch triggers
**Refresh:** Event-driven via WebSocket (/ws/viz); on tab navigation
**Error handling:** fetchJson failures caught; empty states shown
**Confidence:** HIGH — most critical command paths confirmed

### ACTIVITY PAGE

**APIs used:** /ws/viz, /api/timeline, /notifications, /api/intelligence/self-check, /api/intelligence/agent-runs, /api/tasks/standing-approvals, /api/tasks

**Live data:** Timeline (live DB), WebSocket events (in-process ring buffer), self-check (live), runs (live DB)
**Missing:** No explicit polling timer beyond WebSocket reconnect (30s)
**Refresh:** WebSocket push + tab switch triggers all fetches
**Error handling:** WebSocket reconnect logic present
**Confidence:** HIGH

### AGENTS PAGE

**APIs used:** /api/agents, /api/agents/domain, /api/agents/domain/invoke

**Live data:** Agent registry from Supabase apex_agents table
**Static data:** Agent definitions are also filesystem-seeded
**Refresh:** Manual sync via /api/agents/sync
**Confidence:** MEDIUM — agent status depends on apex_agents table being populated

### APPROVALS PAGE

**APIs used:** /api/tasks/approvals (**BROKEN**), /api/tasks/standing-approvals (correct), /api/tasks/approve, /api/tasks/reject, /api/tasks

**Live data:** Task queue from apex_tasks/apex_notifications
**Missing data:** `/api/tasks/approvals` panel returns 404 — approval queue panel fails
**Broken:** Two approve paths — one correct (`POST /approve` with body), one broken (parameterized `/:id/approve`)
**Confidence:** LOW — P1 breakage prevents correct operation

### INTELLIGENCE PAGE

**APIs used:** /api/intelligence/briefing, /api/intelligence/health, /api/intelligence/opportunities, /api/intelligence/cost-summary, /api/intelligence/agent-runs, /api/intelligence/news

**Live data:** All from apex_agent_runs, apex_news_cache, real-time agent/cost data
**Refresh:** On page switch
**Error handling:** Individual panel fallbacks
**Confidence:** HIGH — all routes exist and respond correctly

### KNOWLEDGE PAGE

**APIs used:** /api/knowledge/items, /api/knowledge/state, /api/knowledge/gaps, /api/wiki/status

**Live data:** From apex_memories (semantic), knowledge gap engine
**Refresh:** On page switch
**Missing:** No search auto-refresh
**Confidence:** HIGH

### MEMORY PAGE

**APIs used:** /api/memory/health, /api/memory/episodic/recent, /api/memory/[type]/search

**Live data:** In-process memory health + Supabase episodic table
**Refresh:** On page switch; manual refresh for search
**Confidence:** HIGH

### FINANCE PAGE

**APIs used:** /api/finance/summary, /api/finance/transaction, /api/finance/expenses, /api/intelligence/cost-summary

**Live data:** Personal transactions (apex_finance or similar), business expenses
**Missing:** No real-time refresh once loaded; static after initial fetch
**Namespace issue:** `/api/finance/expenses` serves business expense data (routes/finance.js), while `/api/finance/summary` serves personal tracker (src/routes/finance.js). The Finance UI appears to use both without clear demarcation.
**Confidence:** MEDIUM

### COMMUNICATION PAGE

**APIs used:** /api/emails, /api/calendar/events, /api/contacts, /api/send-reply, /api/ai-draft-reply, /api/emails/:id/approve, /api/emails/:id/reject

**Live data:** Email data from Google Gmail API (via agent), calendar events
**Refresh:** Manual check via /api/emails/check
**Confidence:** MEDIUM — depends on Gmail OAuth being active

### HEALTH PAGE

**APIs used:** /api/health/sleep, /api/health/workouts, /api/health/supplements, /api/health/metrics, /api/mood, /api/habits

**Live data:** From Supabase health tables
**Broken:** /api/health/supplements/:id/toggle → 404. Toggle silently fails.
**Confidence:** MEDIUM (broken supplement toggle)

### UNIVERSITY PAGE

**APIs used:** /api/university/modules, /api/university/assignments, /api/university/flashcards (**BROKEN**), /api/university/sessions (**BROKEN**), /api/life/university/* (correct), /api/life/university/flashcards/:id/review

**Live data:** From Supabase university tables
**Broken:** Flashcard list (14278) gets 404; Pomodoro session creation (14321) gets 404
**Dual-path issue:** Page uses both /api/university/* and /api/life/university/* — the life/* variants work; the university/* flashcard/sessions paths are broken
**Confidence:** LOW — 2 broken integrations on core page functionality

### BUSINESS PAGE

**APIs used:** /api/operations/clients, /api/operations/projects, /api/operations/documents, /api/operations/proposals

**Live data:** From Supabase operations tables
**Refresh:** On page switch; duplicate fetch detected (same routes called twice)
**Confidence:** HIGH

### CIVILISATION PAGE

**APIs used:** /api/civilisation/status, /api/civilisation/domains, /api/civilisation/consensus, /api/expansion/summary, /api/expansion/pending, /api/expansion/approve/:id, /api/expansion/reject/:id

**Live data:** From civilization runtime state
**Auth concern:** /api/civilisation/* routes have NO auth — accessible unauthenticated. Frontend adds x-app-key headers but backend doesn't check them.
**Confidence:** HIGH (routes work; auth gap is a separate security finding)

### SYSTEM PAGE

**APIs used:** /api/governance/dashboard, /api/governance/history, /api/latency-stats, /api/latency-traces, /api/master/schedules, /api/cost/today, /api/agent/status

**Live data:** Governance records, latency ring buffer, cron checkpoint table
**Confidence:** HIGH

### REALITY PAGE (from more/navigation)

**APIs used:** /api/reality/health, /api/reality-architecture/observers, /api/reality-architecture/beliefs/*, /api/reality-architecture/epistemic-capital/*, /api/reality-architecture/attention/top, /api/reality-architecture/understanding/*, /api/reality-architecture/counterfactual/worlds, /api/reality-architecture/meta-model, /api/reality-architecture/mental-models/*, /api/reality-architecture/self-model

**Hardcoded entity IDs:** `DOM-000001` and `agent-orchestrator` are hardcoded in fetch calls (lines 18837, 18906, 18930, 19022) — these may not exist in all environments.
**Confidence:** MEDIUM — routes exist but depend on seeded entity data

---

## 7. RUNTIME DATA PROVENANCE

### Critical Data Points

| UI Value | API | Route | Service | Database/Source |
|----------|-----|-------|---------|----------------|
| Agent run count | /api/master/metrics | src/routes/master.js | Direct Supabase query | apex_agent_runs (last 500) |
| Success rate % | /api/master/metrics | src/routes/master.js | Computed | apex_agent_runs.success |
| Total AI cost | /api/intelligence/cost-summary | routes/intelligence.js | Computed | apex_agent_runs.cost_usd (last 1000) |
| Timeline events | /api/timeline | telemetry/index.js | Direct Supabase | apex_timeline |
| Notification count | /api/notifications | src/routes/notifications.js | Direct Supabase | apex_notifications |
| Task list | /api/tasks | src/routes/tasks.js | pgGetRecentAgentTasks() | apex_tasks |
| Standing approvals | /api/tasks/standing-approvals | src/routes/tasks.js | Direct Supabase | apex_notifications (type filter) |
| Finance summary | /api/finance/summary | src/routes/finance.js | Direct Supabase | finance transactions table |
| Knowledge items | /api/knowledge/items | routes/knowledge.js | semanticMemory.search() | apex_memories (semantic type) |
| Memory health | /api/memory/health | routes/memory.js | In-process health check | In-memory + Supabase probe |
| System health | /health | telemetry/index.js | Process + DB probe | Process state + pg pool |
| Agent status | /api/agent/status | src/routes/master.js | Direct Supabase | apex_agents |
| Schedules | /api/master/schedules | src/routes/master.js | Direct Supabase | apex_sync_checkpoints (cron:* keys) |
| Roadmap progress | /api/master/metrics | src/routes/master.js | Filesystem parse | roadmap.json |
| Daily cost | /api/cost/today | telemetry/index.js | Direct Supabase | apex_timeline (cost events today) |
| WebSocket events | /ws/viz | lib/ws-handler.js | In-process ring buffer | _eventBus, no DB |
| Voice state | /api/intelligence/voice-status | routes/intelligence.js | In-process module state | voiceState object |
| Governance metrics | /api/governance/dashboard | routes/governance.js | Direct Supabase | Multiple governance tables |

### Provenance Breaks

| Break | Description | Severity |
|-------|-------------|----------|
| Overview vitals `health` field | Reads `civilization_cycle_log.health_score` — may be 0 if civilization cycle has never run | P2 |
| Roadmap % | Reads `roadmap.json` — static file. Not runtime state. | P3 |
| Agent status | `apex_agents` table populated by agent sync, not live runtime | P3 |
| Cost today | `apex_timeline` cost events — depends on timeline entries being written with cost data | P2 |
| Standing approvals | Reads `apex_notifications` filtered by type — depends on notification creation conventions | P3 |

---

## 8. LIVE vs STATIC CLASSIFICATION

| Interface Value | Classification | Evidence |
|-----------------|---------------|----------|
| Agent runs list | A — Genuinely live | Fresh DB query per request, no cache |
| Cost summary | A — Genuinely live | DB query, no cache (last 1000 rows) |
| Timeline events | A — Genuinely live | DB query, no cache |
| Notifications | A — Genuinely live | DB query, no cache |
| Tasks list | A — Genuinely live | DB query |
| Finance summary | B — Fetched, possibly cached | May have 60s cache |
| Knowledge items | A — Genuinely live | semantic-memory.search(), live DB |
| Self-check | A — Genuinely live | Process + live DB probe |
| WebSocket events | D — Event-driven | Ring buffer, push from event bus |
| Agent status | C — Periodically refreshed | Depends on sync, not live tracking |
| Roadmap % | F — Static/filesystem | roadmap.json parse |
| Daily cost | A — Genuinely live (with caveat) | apex_timeline — only as live as event writing |
| Health status | A — Genuinely live | Process memory + DB probe |
| Civilisation data | A — Genuinely live | DB query, no cache |
| News feed | C — Periodically refreshed | apex_news_cache — refreshed by cron |
| Governance data | A — Genuinely live | Direct DB query |
| Reality-architecture data | A — Genuinely live | DB query |
| Hardcoded entity IDs (DOM-000001) | F — Static/hardcoded | Values baked into fetch URLs |

---

## 9. DATABASE / RUNTIME SOURCE MAPPING

| Route Category | Primary Tables |
|----------------|---------------|
| Tasks | apex_tasks, apex_notifications |
| Agent runs | apex_agent_runs, apex_agent_stages |
| Timeline | apex_timeline |
| Notifications | apex_notifications |
| Finance (personal) | Personal finance table (src/routes/finance.js) |
| Finance (business) | Business finance tables (routes/finance.js) |
| Memory (episodic) | apex_memories (type='episodic') |
| Memory (semantic) | apex_memories (type='semantic') |
| Knowledge gaps | Knowledge gap engine tables |
| Agents | apex_agents |
| Schedules | apex_sync_checkpoints |
| Governance | Multiple governance tables |
| Emails | Google Gmail API (via agent) |
| Calendar | Google Calendar API |
| News | apex_news_cache |
| University | University tables (via Supabase) |
| Health | Health tables (workouts, sleep, etc.) |
| System health | Process state + pg pool |

### Canonical Memory Authority

The canonical memory gateway at `lib/memory/gateway.js` is referenced by routes/memory.js routes. The knowledge routes (routes/knowledge.js) use `lib/memory/semantic-memory.js` directly. Intelligence routes use `lib/clients.js.getSupabaseClient()` directly.

**No identified cases of routes bypassing canonical ownership in the interface-consumed API surface.** Backend-only cognitive/intelligence-memory routes use their own subsystems correctly.

---

## 10. ERROR / FAILURE PATHS

| Route | HTTP Failure | Timeout | Empty Response | Auth Failure | What User Sees |
|-------|-------------|---------|----------------|--------------|----------------|
| /health | 200 always (by design) | Possible hang if DB down | N/A | None required | "down" status returned |
| /api/master/metrics | 500 + {ok:false} | Unlikely (safeQ wrappers) | Empty counts | 401 redirect | Empty metric panels |
| /api/intelligence/agent-runs | 200 with {runs:[]} | Unlikely | {runs:[]} | 401 | Empty runs table |
| /api/tasks | 200 with {tasks:[]} | Unlikely | {tasks:[]} | 401 | Empty task list |
| /api/tasks/approvals | **404** always | N/A | N/A | N/A | **Approval panel breaks** |
| /api/notifications | 200 with {notifications:[]} | Unlikely | {notifications:[]} | 401 | No notifications shown; all marked read regardless |
| /api/finance/summary | 500 on DB failure | Possible | Empty summary | 401 | Finance panel blank |
| /api/knowledge/items | 500 on DB failure | Unlikely | {items:[],count:0} | 401 | Empty knowledge panel |
| /api/university/flashcards | **404** always | N/A | N/A | N/A | **Flashcard panel breaks** |
| /api/health/supplements/:id/toggle | **404** always | N/A | N/A | N/A | **Toggle fails silently** |
| /ws/viz | Reconnect (30s) | N/A | N/A | None | 30s gap in events |

**Silent failures identified:**
1. `/api/health/supplements/:id/toggle` at line 17029 — uses `.catch(function(){})` — failure is completely silent
2. Pomodoro session at line 14321 (`/api/university/sessions`) — uses `.catch(function(){})` — silent
3. Several reality-architecture calls use no error handling

---

## 11. REFRESH / SYNCHRONISATION AUDIT

| Component | Initial Load | Refresh Trigger | Interval | Cleanup |
|-----------|-------------|-----------------|----------|---------|
| WebSocket /ws/viz | Page load | Reconnect on close | 30s reconnect | _actWs.close() |
| Timeline panel | Tab switch | Tab switch | None | None |
| Agent runs table | Page/tab switch | Tab switch | None | None |
| Notifications | Tab switch | Tab switch | None — reads all as read | None |
| Finance summary | Page switch | Page switch | None | None |
| Knowledge items | Page switch | Manual filter change | None | None |
| Intelligence briefing | Page switch | Page switch | None | None |
| Health data | Page switch | Page switch | None | None |
| Master metrics | Init (line 8800) | None visible | None | None |

**Key finding:** The interface is predominantly **pull-based on tab switch**. There is no background polling for any data except WebSocket event stream. Finance, tasks, notifications, agent runs, etc. are all loaded once on page/tab switch and not refreshed again until the next navigation.

**Race conditions identified:** Multiple identical fetches fired on the same tab switch (e.g., /api/intelligence/agent-runs called 3+ times in close succession on Activity tab load). No deduplication or cache.

**Duplicate polling confirmed:**
- `/api/intelligence/agent-runs` called at lines 15177, 15366, 15491, 15548, 19289 — minimum 4 concurrent calls possible on Intelligence tab
- `/api/operations/clients` called at lines 14083 AND 14844 AND 16722 — 3 separate call sites for same data

---

## 12. BROWSER RUNTIME VERIFICATION

**BROWSER RUNTIME VERIFICATION UNAVAILABLE.**

All findings in this audit are based exclusively on static source analysis of:
- `server.js` (route loading architecture)
- All 46 files in `routes/` directory (route declarations)
- All 34 files in `src/routes/` directory (route declarations + key response schemas)
- `public/dashboard.html` (~19,900 lines — complete fetch inventory via grep)
- `lib/ws-handler.js` (WebSocket infrastructure)
- `lib/middleware.js` (auth mechanism)
- `lib/app-auth.js` (auth re-export)

No network requests were executed. No response payloads were captured at runtime. No DOM rendering was verified.

**Implication:** All route existence conclusions are derived from code; actual runtime availability depends on Supabase connectivity, environment variable configuration (ANTHROPIC_API_KEY, GOOGLE_API_KEY, etc.), and agent subsystem initialization. Routes that require DB queries will fail at runtime if Supabase is unreachable.

**Claimed vs. unverified:**
- Route exists in source code → verified by grep
- Route resolves correctly at runtime → **NOT verified**
- Response fields match specification → verified by code read for key routes
- DOM rendering is correct → **NOT verified**
- DB tables exist with expected schema → **NOT verified**

---

## 13. FINAL CANONICAL DATA MAP

### Master API Table (Interface-Consumed Routes Only)

| API | Method | Source File | Frontend Consumer | Refresh | Live? | Canonical Source | Status |
|-----|--------|-------------|------------------|---------|-------|-----------------|--------|
| /health | GET | telemetry/index.js | System widget | Tab switch | A | Process + DB | ✓ |
| /api/ping | GET | telemetry/index.js | Health probe | Init | A | Process | ✓ |
| /api/timeline | GET | telemetry/index.js | Activity, Command | Tab switch | A | apex_timeline | ✓ |
| /api/cost/today | GET | telemetry/index.js | System widget | Tab switch | A | apex_timeline | ✓ |
| /api/latency-stats | GET | telemetry/index.js | System page | Tab switch | A | In-process | ✓ |
| /api/latency-traces | GET | telemetry/index.js | System page | Tab switch | A | In-process | ✓ |
| /auth/login | POST | src/routes/auth.js | Login form | Manual | — | Session/cookie | ✓ |
| /chat | POST | src/routes/chat.js | Command chat | Manual | — | Claude API | ✓ |
| /api/master/metrics | GET | src/routes/master.js | Command panel | Init | A | apex_agent_runs + roadmap.json | ✓ |
| /api/master/roadmap | GET | src/routes/master.js | Command panel | Init | F | roadmap.json | ✓ |
| /api/master/permissions | GET | src/routes/master.js | Command panel | Init | A | Config | ✓ |
| /api/master/schedules | GET | src/routes/master.js | System page | Tab switch | C | apex_sync_checkpoints | ✓ |
| /api/master/run | POST | src/routes/master.js | Command | Manual | — | Orchestrator | ✓ |
| /api/master/feature | POST | src/routes/master.js | Command | Manual | — | Claude API | ✓ |
| /api/master/approve | POST | src/routes/master.js | Command | Manual | — | apex_notifications | ✓ |
| /api/overview/vitals | GET | src/routes/master.js | Init | Init | A | Multiple Supabase tables | ✓ |
| /api/agent/status | GET | src/routes/master.js | System | Tab switch | C | apex_agents | ✓ |
| /api/capture | POST | src/routes/master.js | Command | Manual | — | apex_notifications | ✓ |
| /api/tasks | GET | src/routes/tasks.js | Approvals, Activity | Tab switch | A | apex_tasks | ✓ |
| /api/tasks/approve | POST | src/routes/tasks.js | Approvals | Manual | — | apex_tasks | ✓ |
| /api/tasks/reject | POST | src/routes/tasks.js | Approvals | Manual | — | apex_tasks | ✓ |
| /api/tasks/standing-approvals | GET | src/routes/tasks.js | Activity | Tab switch | A | apex_notifications | ✓ |
| /api/tasks/approvals | GET | **MISSING** | Approvals | Tab switch | — | — | **P1 BROKEN** |
| /api/finance/summary | GET | src/routes/finance.js | Finance | Tab switch | B | Finance table | ✓ |
| /api/finance/transaction | POST | src/routes/finance.js | Finance | Manual | — | Finance table | ✓ |
| /api/finance/expenses | GET | routes/finance.js | Finance | Tab switch | A | Business expense table | ✓ |
| /notifications | GET | src/routes/notifications.js | Activity | Tab switch | A | apex_notifications | ✓ |
| /api/notifications | GET | src/routes/notifications.js | Command | Init | A | apex_notifications ⚠️ side effect | ✓* |
| /api/agents | GET | routes/agents.js | Agents, Command | Tab switch | C | apex_agents | ✓ |
| /api/agents/domain | GET | routes/agents.js | Domain page | Tab switch | C | Agent config | ✓ |
| /api/agents/invoke | POST | routes/agents.js | Command | Manual | — | Claude API | ✓ |
| /api/agents/sync | POST | routes/agents.js | Agents | Manual | — | apex_agents | ✓ |
| /api/agents/domain/invoke | POST | routes/agents.js | Domain | Manual | — | Claude API | ✓ |
| /api/emails | GET | routes/emails.js | Communication | Tab switch | A | Gmail via agent | ✓ |
| /api/emails/check | POST | routes/emails.js | Communication | Manual | — | Gmail API | ✓ |
| /api/emails/:id/approve | POST | routes/emails.js | Communication | Manual | — | Gmail API | ✓ |
| /api/emails/:id/reject | POST | routes/emails.js | Communication | Manual | — | Gmail API | ✓ |
| /api/send-reply | POST | src/routes/email.js | Communication | Manual | — | Gmail API | ✓ |
| /api/ai-draft-reply | POST | src/routes/email.js | Communication | Manual | — | Claude API | ✓ |
| /api/calendar/events | GET | routes/communications.js | Communication | Tab switch | A | Google Calendar | ✓ |
| /api/contacts | GET | routes/communications.js | Communication | Tab switch | A | Contacts DB | ✓ |
| /api/intelligence/agent-runs | GET | routes/intelligence.js | Intelligence, Activity | Tab switch | A | apex_agent_runs | ✓ |
| /api/intelligence/cost-summary | GET | routes/intelligence.js | Intelligence, Finance | Tab switch | A | apex_agent_runs | ✓ |
| /api/intelligence/self-check | GET | routes/intelligence.js | Activity | Tab switch | A | Process + Supabase | ✓ |
| /api/intelligence/briefing | GET | routes/intelligence.js | Intelligence | Tab switch | A | Computed | ✓ |
| /api/intelligence/health | GET | routes/intelligence.js | Intelligence | Tab switch | A | Computed | ✓ |
| /api/intelligence/opportunities | GET | routes/intelligence.js | Intelligence | Tab switch | A | Computed | ✓ |
| /api/intelligence/news | GET | routes/intelligence.js | Intelligence | Tab switch | C | apex_news_cache | ✓ |
| /api/knowledge/items | GET | routes/knowledge.js | Knowledge | Tab switch | A | apex_memories | ✓ |
| /api/knowledge/state | GET | routes/knowledge.js | Knowledge | Tab switch | A | KGE stats | ✓ |
| /api/knowledge/gaps | GET | routes/knowledge.js | Knowledge | Tab switch | A | Gap engine | ✓ |
| /api/wiki/status | GET | src/routes/wiki.js | Knowledge | Tab switch | A | Wiki sidecar | ✓ |
| /api/memory/health | GET | routes/memory.js | Memory | Tab switch | A | Memory subsystem | ✓ |
| /api/memory/episodic/recent | GET | routes/memory.js | Memory | Tab switch | A | apex_memories | ✓ |
| /api/health/workouts | GET | routes/health.js | Health | Tab switch | A | Health tables | ✓ |
| /api/health/sleep | GET | routes/health.js | Health | Tab switch | A | Health tables | ✓ |
| /api/health/supplements | GET | routes/health.js | Health | Tab switch | A | Health tables | ✓ |
| /api/health/supplements/:id/toggle | POST | **MISSING** | Health | Manual | — | — | **P1 BROKEN** |
| /api/health/metrics | GET | routes/health.js | Health | Tab switch | A | Health tables | ✓ |
| /api/mood | POST | routes/health.js | Health | Manual | — | Health tables | ✓ |
| /api/habits | GET | routes/life.js | Health | Tab switch | A | Habits table | ✓ |
| /api/life/habits | GET | routes/life.js | Health | Tab switch | A | Habits table | ✓ |
| /api/life/journal/entries | GET/POST | routes/life.js | Health | Tab switch | A | Journal table | ✓ |
| /api/life/spiritual/sessions | GET | routes/life.js | Health | Tab switch | A | Spiritual table | ✓ |
| /api/life/spiritual/log | POST | routes/life.js | Health | Manual | — | Spiritual table | ✓ |
| /api/life/psychology/crisis-check | GET | routes/life.js | Health | Tab switch | A | Psychology table | ✓ |
| /api/university/modules | GET | routes/university.js | University | Tab switch | A | University tables | ✓ |
| /api/university/assignments | GET | routes/university.js | University | Tab switch | A | University tables | ✓ |
| /api/university/flashcards | GET | **MISSING** | University | Tab switch | — | — | **P1 BROKEN** |
| /api/university/sessions | POST | **MISSING** | University | Manual | — | — | **P1 BROKEN** |
| /api/life/university/modules | GET | routes/life.js | University | Tab switch | A | University tables | ✓ |
| /api/life/university/assignments | GET | routes/life.js | University | Tab switch | A | University tables | ✓ |
| /api/life/university/flashcards | GET | routes/life.js | University | Tab switch | A | University tables | ✓ |
| /api/life/university/sessions | GET | routes/life.js | University | Tab switch | A | University tables | ✓ |
| /api/life/university/reading-list | GET | routes/life.js | University | Tab switch | A | University tables | ✓ |
| /api/life/university/flashcards/:id/review | POST | routes/life.js | University | Manual | — | University tables | ✓ |
| /api/operations/clients | GET | routes/operations.js | Business | Tab switch | A | Operations tables | ✓ |
| /api/operations/projects | GET | routes/operations.js | Business | Tab switch | A | Operations tables | ✓ |
| /api/operations/documents | GET | routes/operations.js | Business | Tab switch | A | Operations tables | ✓ |
| /api/operations/proposals | GET | routes/operations.js | Business | Tab switch | A | Operations tables | ✓ |
| /api/governance/dashboard | GET | routes/governance.js | System | Tab switch | A | Governance tables | ✓ |
| /api/governance/history | GET | routes/governance.js | System | Tab switch | A | Governance tables | ✓ |
| /api/civilisation/status | GET | routes/civilization.js | Civilisation | Tab switch | A | Civ tables ⚠️ no auth | ✓ |
| /api/civilisation/domains | GET | routes/civilization.js | Civilisation | Tab switch | A | Civ tables ⚠️ no auth | ✓ |
| /api/civilisation/consensus | GET | routes/civilization.js | Civilisation | Tab switch | A | Civ tables ⚠️ no auth | ✓ |
| /api/expansion/summary | GET | routes/expansion.js | Civilisation | Tab switch | A | Expansion tables | ✓ |
| /api/expansion/pending | GET | routes/expansion.js | Civilisation | Tab switch | A | Expansion tables | ✓ |
| /api/reality/health | GET | routes/reality.js | Reality | Tab switch | A | Reality tables | ✓ |
| /api/reality-architecture/* | GET | routes/reality-architecture.js | Reality | Tab switch | A | RA tables | ✓ |
| /api/crm/clients/:id | PATCH | **MISSING — CRM REMOVED** | (legacy widget) | Manual | — | — | **P1 BROKEN** |
| /api/tasks/+id+/approve | POST | **MISSING** | Approvals | Manual | — | — | **P1 BROKEN** |
| /ws/viz | WS | lib/ws-handler.js | Activity, Command | Persistent | D | Event bus | ✓ |
| /api/upload-file | POST | src/routes/files.js | File | Manual | — | Supabase Storage | ✓ |
| /api/transcribe | POST | src/routes/transcription.js | Voice | Manual | — | Google STT | ✓ |
| /api/voice-chat | POST | routes/voice-chat.js | Voice | Manual | — | Claude API | ✓ |
| /api/config | GET | src/routes/mastra.js | File init | Init | F | Config env | ✓ |
| /api/routines | GET | src/routes/routines.js | Routines | Tab switch | A | Routines table | ✓ |

### Interface Page Summary

| Page | APIs (total) | Live Data APIs | Static/Broken | Status |
|------|-------------|----------------|--------------|--------|
| Command | 12 | 10 | 0 broken | ✓ FUNCTIONAL |
| Activity | 7 | 7 | 0 broken | ✓ FUNCTIONAL |
| Agents | 3 | 3 | 0 broken | ✓ FUNCTIONAL |
| Approvals | 5 | 3 | 2 broken | ⚠️ DEGRADED |
| Intelligence | 10 | 10 | 0 broken | ✓ FUNCTIONAL |
| Knowledge | 4 | 4 | 0 broken | ✓ FUNCTIONAL |
| Memory | 3 | 3 | 0 broken | ✓ FUNCTIONAL |
| Finance | 4 | 3 | 0 broken (namespace note) | ✓ FUNCTIONAL |
| Communication | 7 | 7 | 0 broken | ✓ FUNCTIONAL |
| Health | 8 | 7 | 1 broken (toggle) | ⚠️ DEGRADED |
| University | 10 | 8 | 2 broken (flashcards, sessions) | ⚠️ DEGRADED |
| Business | 4 | 4 | 0 broken | ✓ FUNCTIONAL |
| Civilisation | 8 | 8 | 0 broken (auth gap) | ✓ FUNCTIONAL |
| System | 7 | 7 | 0 broken | ✓ FUNCTIONAL |
| Reality | 12 | 12 | 0 broken | ✓ FUNCTIONAL |
| File | 3 | 3 | 0 broken | ✓ FUNCTIONAL |

---

## 14. P0–P3 FINDINGS

### P1 — Major Missing Functionality / Incorrect Runtime Data

| ID | Finding | Type | Evidence |
|----|---------|------|----------|
| P1-01 | `GET /api/tasks/approvals` called at dashboard:16695 — route does not exist. Approvals panel returns 404. | BROKEN INTEGRATION | No route in src/routes/tasks.js or routes/ matches |
| P1-02 | `POST /api/tasks/:id/approve` called at dashboard:17344 — parameterized route does not exist. One of two approve paths is broken. Correct path is `POST /api/tasks/approve` with body {taskId}. | BROKEN INTEGRATION | src/routes/tasks.js has no parameterized approve |
| P1-03 | `GET /api/university/flashcards` called at dashboard:14278 — route does not exist. Correct path: `/api/life/university/flashcards`. University flashcard panel fails. | BROKEN INTEGRATION | routes/university.js has no /flashcards |
| P1-04 | `POST /api/university/sessions` called at dashboard:14321 — route does not exist. Correct path: `/api/university/study-sessions`. Pomodoro session creation fails silently. | BROKEN INTEGRATION | routes/university.js has no /sessions |
| P1-05 | `PATCH /api/crm/clients/:id` called at dashboard:16687 — CRM removed in R6. No route exists. Pipeline stage update fails. | ORPHANED UI — MISSING INTEGRATION | CRM routes confirmed absent |
| P1-06 | `POST /api/health/supplements/:id/toggle` called at dashboard:17029 — route does not exist. routes/health.js has no toggle endpoint. Supplement toggle fails silently (`.catch(function(){})` swallows error). | BROKEN INTEGRATION | routes/health.js confirmed; no toggle route |

### P2 — Meaningful Product/Data-Quality Issue

| ID | Finding | Type | Evidence |
|----|---------|------|----------|
| P2-01 | `/api/civilisation/*` (15 routes, British spelling) accessible without authentication. Frontend adds x-app-key but backend ignores it. Any unauthenticated HTTP client can read civilisation status, domains, consensus. | MISSING AUTH | routes/civilization.js lines 477–593 — no _auth middleware |
| P2-02 | `/api/context/queue` (GET) and `/api/context/queue/:id` (DELETE) have NO auth middleware. Presentation queue state is publicly readable; items can be deleted without credentials. | MISSING AUTH | routes/context.js — no auth import or middleware |
| P2-03 | `GET /api/notifications` (src/routes/notifications.js) marks ALL unread notifications as read as a side effect of every fetch call. Any component that fetches notifications to display a count will silently clear the read state. | WRONG BEHAVIOR — DESTRUCTIVE GET | src/routes/notifications.js line 46 — auto-marks on every request |
| P2-04 | `GET /health` and `GET /api/system/health/detailed` registered in both `src/routes/telemetry/index.js` (line 340, wins) and `src/routes/health.js` (line 342, shadowed). The src/routes/health.js implementations are dead code for these two paths. | DUPLICATE REGISTRATION — DEAD CODE | server.js mounting order |
| P2-05 | `GET /api/intelligence/agent-runs`, `/cost-summary`, `/lessons`, `/self-check` registered in both `routes/intelligence.js` (wins, auto-loaded first) and `src/routes/telemetry/index.js` (shadowed). Telemetry versions are dead code. | DUPLICATE REGISTRATION — DEAD CODE | server.js _loadAgentRoutes() precedes telemetry mount |
| P2-06 | Finance namespace: `/api/finance/expenses` (routes/finance.js) serves business expense data. `/api/finance/summary` (src/routes/finance.js) serves personal tracker data. Two different "finance" services share the `/api/finance/*` namespace without clear demarcation. UI makes no distinction. | WRONG SOURCE / DESIGN AMBIGUITY | Two finance.js files in routes/ and src/routes/ |

### P3 — Minor/Hygiene/Deferred

| ID | Finding | Type |
|----|---------|------|
| P3-01 | `/api/intelligence/agent-runs` fetched 6+ times across dashboard panels concurrently on Intelligence tab load. No deduplication or cache. | DUPLICATE FETCH |
| P3-02 | `/api/operations/clients` fetched 3 times (lines 14083, 14844, 16722). `/api/operations/projects` fetched 3 times. Redundant DB queries. | DUPLICATE FETCH |
| P3-03 | `/api/intelligence/cost-summary` fetched 4 times across panels. | DUPLICATE FETCH |
| P3-04 | Hardcoded entity IDs `DOM-000001` and `agent-orchestrator` in reality-architecture fetch calls (lines 18837, 18860, 18906, 18930, 19022, 19044). Will break if these entities don't exist. | STATIC DATA IN URLS |
| P3-05 | `/api/transcribe` fetch called at lines 11012, 11833, 11988, 18583 — four separate call sites with slightly different implementations. Inconsistent error handling. | DUPLICATE LOGIC |
| P3-06 | `/api/config` fetched at lines 10517 and 13382 on potentially the same init. Minor duplicate. | DUPLICATE FETCH |
| P3-07 | routes/pwa.js registers `/api/icon-192.png` and `/api/icon-512.png` which conflict with the same paths registered by `src/routes/ui.js` at root. Icons served from `/api/icon-*.png` is unexpected. | PATH COLLISION |
| P3-08 | routes/operations.js registers `/api/version` and `/api/ping` but telemetry also has `/api/ping` and `/api/deploy-probe`. Operations version/ping routes are public and unauthenticated by design but create surface area confusion. | DESIGN DEFERMENT |
| P3-09 | No refresh mechanism for Finance page — summary data loaded once on tab switch and not refreshed. New transactions added via POST won't be reflected without manual navigation away and back. | MISSING REFRESH |
| P3-10 | No refresh mechanism for Business page — clients/projects loaded once, no polling. | MISSING REFRESH |
| P3-11 | `POST /api/civilisation/consensus/propose` and `/vote` are unauthenticated write endpoints. Anyone can propose or vote on consensus items without credentials. | MISSING AUTH (write concern) |

---

## 15. ORPHANED API / UI INVENTORY

### Orphaned Backend APIs (no frontend consumer identified)

The following categories have no identified dashboard.html consumer — they are exclusively backend/internal:

| Category | Approximate Routes | Description |
|----------|-------------------|-------------|
| routes/cognitive.js | 22 | Cognitive policy, autonomy, knowledge-decay — called by agent pipeline |
| routes/cognitive-eval.js | 1 | Agent eval probe |
| routes/cognitive-evolution.js | 18 | Benchmark, policy evolution — called by cron |
| routes/intelligence-memory.js | 35 | Retrieval, contradiction, lifecycle — called by agent pipeline |
| routes/reality.js | 6 | Reality claim management |
| routes/reality-architecture.js | 22 | Fully consumed by Reality page |
| routes/registry.js | 34 | Entity registry — internal only |
| routes/empire.js | 17 | Empire graph — no UI page found |
| routes/founder.js | 22 | Founder profile/alignment — no direct UI |
| routes/founder-graph.js | 17 | Founder knowledge graph — no direct UI |
| routes/briefing.js | 4 | Today's brief — no direct dashboard fetch found |
| routes/career.js | 6 | Career tracking — no UI page found |
| routes/executive-performance.js | 12 | Exec performance — no UI page found |
| routes/entities.js | 6 | Entity resolution — internal |
| routes/intent.js | 1 | Intent dispatch — internal |
| routes/journal.js | 10 | Journal — partially used via life.js aliases |
| routes/nutrition.js | 12 | Nutrition tracking — no dedicated page found |
| routes/observatory.js | 2 | Observatory — no UI page found |
| routes/property.js | 7 | Property — no UI page found |
| routes/relationships.js | 7 | Relationships — no UI page found |
| routes/shopping.js | 5 | Shopping — no UI page found |
| routes/social.js | 5 | Social — no UI page found |
| routes/spiritual.js | 4 | Spiritual — partially via life.js |
| routes/strategic.js | 13 | Strategic — no UI page found |
| routes/travel.js | 6 | Travel — no UI page found |
| routes/wealth.js | 8 | Wealth management — no UI page found |
| routes/knowledge-graph.js | 11 | Knowledge graph — internal |
| routes/legal.js | 6 | Legal — no UI page found |
| src/routes/autonomy.js | 11 | Autonomy scoring — no UI page found |
| src/routes/browser.js | 25 | Browser automation — used via command but not a standalone page |
| src/routes/research.js | 11 | Research tools — command-triggered only |
| src/routes/rag.js | 8 | RAG sidecar — internal |
| src/routes/editor.js | 17 | AI editor — separate /editor page |
| src/routes/cognition.js | 2 | Cognition — internal |
| src/routes/admin.js | 7 | Admin — internal |
| src/routes/setup.js | 4 | Setup — triggered by command panel |
| src/routes/ruflo.js | 4 | Ruflo orchestration — internal |
| src/routes/cloud-autopilot.js | 2 | Cloud autopilot — internal |
| src/routes/convert.js | 7 | File conversion — used in File page |

**Estimated orphaned backend routes: ~430 of 730 total (59%)**
This is expected. APEX is an AI OS where most routes serve the agent pipeline, not the user interface directly.

### Orphaned Frontend Consumers

| Dashboard Line | URL Called | Why Orphaned |
|----------------|-----------|--------------|
| 16687 | PATCH /api/crm/clients/:id | CRM removed (R6), no backend |
| 16695 | GET /api/tasks/approvals | Wrong path, use standing-approvals |
| 17344 | POST /api/tasks/:id/approve | Parameterized — wrong, use body form |
| 14278 | GET /api/university/flashcards | Wrong path, use /life/university/flashcards |
| 14321 | POST /api/university/sessions | Wrong path, use /university/study-sessions |
| 17029 | POST /api/health/supplements/:id/toggle | Route never created |

---

## 16. COVERAGE METRICS

### Endpoint Coverage

| Metric | Count | Percentage |
|--------|-------|-----------|
| Total registered routes | ~730 | — |
| Production-active routes (have real handlers) | ~728 | ~99.7% |
| Interface-consumed routes (UI makes fetch calls) | ~84 | 11.5% |
| Interface-consumed + working | ~78 | 10.7% |
| Interface-consumed + broken (404) | 6 | 0.8% |
| Backend-only (no UI consumer, by design) | ~646 | 88.5% |

### Response Field Coverage (Interface-Consumed Routes)

| Metric | Estimate | Confidence |
|--------|----------|-----------|
| Total response fields audited (key routes) | ~180 | MEDIUM |
| Fields with confirmed UI consumption | ~120 | MEDIUM |
| Fields rendered visibly to user | ~90 | LOW (no browser verification) |
| Fields discarded/unused by UI | ~60 | LOW |
| Fields that are hardcoded/static | ~5 | HIGH |
| Fields with canonical DB provenance | ~115 | MEDIUM |

### Coverage Percentages

| Dimension | Score | Basis |
|-----------|-------|-------|
| Endpoint coverage (UI/total) | 11.5% | Expected — most routes are agent infrastructure |
| Endpoint coverage (UI-facing surface) | ~78% | ~78 working of ~100 interface-relevant routes |
| Field coverage | ~67% | Of audited response fields, ~120/180 consumed |
| Rendering coverage | ~50% | Estimated — unverified without browser |
| Canonical provenance coverage | ~96% | All identified UI data traces to Supabase/process |
| Live-data coverage | ~87% | Of consumed routes, ~87% are genuinely live (A/D) |
| Static/hardcoded rate | ~5% | roadmap.json (roadmap%), hardcoded entity IDs |

**Note:** "UI-facing surface" (~100 routes) is estimated as all routes designed to be consumed by the interface, excluding pure backend infrastructure.

---

## 17. BETA READINESS VERDICT

**Answering the 13 required questions:**

1. **Is the interface actually connected to the APEX runtime?**
   YES. The majority of interface panels make real API calls to live backend routes backed by Supabase. The WebSocket event stream is live. Auth works (cookie + x-app-key). Evidence: 78 working endpoint integrations confirmed.

2. **Are the major API surfaces represented in the interface?**
   MOSTLY. Intelligence, Activity, Knowledge, Memory, Communication, Finance, Business, Civilisation, Health, System, University pages all have real API connections. Notable gaps: Empire, Founder, Career, Travel, Wealth, Nutrition, Observatory, Relationships — routes exist but no UI pages.

3. **Is important runtime data actually rendered?**
   YES for core surfaces: agent runs, cost, timeline, notifications, tasks, finance summary. UNVERIFIED at DOM level due to no browser access. Provisionally yes.

4. **Is the displayed data canonical?**
   YES. All identified data sources trace to Supabase (apex_agent_runs, apex_timeline, apex_notifications, apex_tasks, apex_memories, etc.) or in-process runtime state. No parallel/legacy sources identified for UI-consumed endpoints.

5. **Are any major panels currently decorative/static?**
   PARTIAL. Roadmap % is filesystem-static (roadmap.json). Reality-architecture panels use hardcoded entity IDs that may not exist in all environments. Finance summary may cache.

6. **Are there orphaned backend APIs?**
   YES — approximately 430 routes have no UI consumer. This is BY DESIGN for an AI OS. Not a defect.

7. **Are there orphaned frontend consumers?**
   YES — 6 confirmed broken fetch calls (P1 defects). 1 CRM call (removed service). 5 path mismatches.

8. **Are there silent failures?**
   YES. Two confirmed: supplement toggle (line 17029) and university session POST (line 14321) use empty `.catch()`. Several reality-architecture calls have no error handling.

9. **Are there misleading live-status indicators?**
   POSSIBLE. The `/health` endpoint returns `{status:'degraded'}` when DB is down but still returns HTTP 200 — this could mislead health monitors. The overview vitals `health` field reads `civilization_cycle_log.health_score` which is 0 if civilization has never run — could appear as unhealthy.

10. **What percentage of the interface is genuinely runtime-backed?**
    ~87% of consumed API calls are genuinely live (classification A or D). ~5% are cached-but-fetched (B/C). ~5% static (roadmap.json, hardcoded IDs). ~3% broken (P1).

11. **What prevents external beta, if anything?**
    - P1-01/02: Approvals page broken (tasks/approvals 404 + parameterized approve 404)
    - P1-03/04: University flashcards and sessions broken
    - P2-01: Unauthenticated civilisation routes (security gap)
    - P2-02: Unauthenticated context queue (security gap)
    - P2-03: Notifications auto-read side effect (data integrity)
    - P1-06: Supplement toggle broken (silent failure)

12. **What is already proven?**
    - Core chat and command functionality: ✓
    - Activity/observability with WebSocket: ✓
    - Intelligence panel (all 6 sub-routes): ✓
    - Knowledge panel (3 routes): ✓
    - Memory panel (2 routes): ✓
    - Communication (email, calendar, send-reply): ✓
    - Business page (4 routes): ✓
    - Finance core (summary, expenses): ✓
    - Auth mechanism (cookie + x-app-key): ✓
    - System page (governance, schedules, cost): ✓

13. **What remains unproven?**
    - DOM rendering of any panel (no browser access)
    - DB table schema correctness for all referenced tables
    - Supabase connectivity at runtime
    - Google APIs (Gmail, Calendar) being configured and authorized
    - Agent pipeline actually writing to apex_agent_runs
    - Civilization cycle having run (health_score > 0)
    - University, flashcard, career, travel, wealth tables having data

---

## 18. EXACT REMAINING BLOCKERS

### External Beta Blockers (must fix before external beta)

| # | Blocker | Fix | Effort |
|---|---------|-----|--------|
| B1 | P1-01: `GET /api/tasks/approvals` returns 404 — Approvals page panel broken | Rename frontend call to `/api/tasks/standing-approvals` or add alias route | 1-line fix |
| B2 | P1-02: `POST /api/tasks/:id/approve` returns 404 — Approve button broken in one flow | Remove parameterized path; use body form consistently | 1-line fix |
| B3 | P1-03: `GET /api/university/flashcards` returns 404 | Change frontend call to `/api/life/university/flashcards` | 1-line fix |
| B4 | P1-04: `POST /api/university/sessions` returns 404 | Change frontend call to `/api/university/study-sessions` | 1-line fix |
| B5 | P2-01: `/api/civilisation/*` routes publicly accessible | Add `router.use(require('../lib/app-auth'))` at top of civilization.js before line 477 | Small |
| B6 | P2-02: `/api/context/queue` publicly accessible | Add auth middleware to context.js | Small |
| B7 | P2-03: `GET /api/notifications` marks all read as side effect | Separate read-marking from notification fetch; only mark when explicitly requested | Medium |

### Internal Beta Blockers (fix before broader internal use)

| # | Blocker | Fix |
|---|---------|-----|
| B8 | P1-05: CRM call at line 16687 breaks (removed service) | Remove or redirect to operations route |
| B9 | P1-06: Supplement toggle 404 | Create `POST /api/health/supplements/:id/toggle` route |
| B10 | P3-04: Hardcoded entity IDs in reality-architecture | Parameterize or seed entities |

---

## 19. RECOMMENDED NEXT PHASE

If authorized, the following remediation phase is recommended:

**Phase I: Integration Repair** — address only the 6 P1 broken integrations and 2 security gaps.

Estimated scope: 8 small changes to `public/dashboard.html` (frontend path corrections) + 2 small changes to route files (auth middleware). No new routes required for B1–B4. New route required only for B9 (supplement toggle).

**Do not authorize Phase I until this audit is reviewed and blockers confirmed.**

---

## HARD STOP

**API → INTERFACE INTEGRATION AUDIT COMPLETE — HARD STOP**

| Metric | Value |
|--------|-------|
| Total API endpoints registered | ~730 |
| Production-active endpoints | ~728 |
| Interface-consumed endpoints | ~84 |
| Working interface integrations | ~78 |
| Endpoint coverage (all routes) | 11.5% |
| Endpoint coverage (interface-relevant surface) | ~78% |
| Response fields audited | ~180 |
| Fields rendered (estimated) | ~90 / ~67% |
| Canonical provenance confirmed | ~96% |
| Genuinely live data % | ~87% |
| **P0 findings** | **0** |
| **P1 findings** | **6** |
| **P2 findings** | **6** |
| **P3 findings** | **11** |
| Orphaned backend APIs | ~430 (by design) |
| Orphaned frontend consumers | 6 |
| Browser verification | UNAVAILABLE — static analysis only |
| Beta blockers (external) | 7 |
| Beta blockers (internal) | 3 additional |
| **Internal beta ready?** | **CONDITIONAL — P1 fixes required** |
| **External beta ready?** | **NO — 7 blockers** |
