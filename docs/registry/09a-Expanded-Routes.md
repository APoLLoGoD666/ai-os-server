# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 09a · Expanded Entity Records — Block 08: Route Files

**Registry Version:** 1.0.0
**Date:** 2026-07-05
**Part:** Registry Part 3 — Route Expansion
**Entities:** ENT-000450 through ENT-000491 (42 route files)

---

### ENT-000450 — routes/agents.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/agents.js |
| Parent | ENT-000082 (routes/) |
| Description | Agent library and domain-agent management API — lists, invokes, and queries named AI agents |
| Purpose | Exposes HTTP endpoints for listing agent categories, retrieving agent definitions, invoking agents by slug, and invoking Apex domain agents |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, @supabase/supabase-js, ../agent-system/agent-library, ../agent-system/domain-agents, ../lib/app-auth |
| Interfaces | GET /agents/status, GET /agents/categories, GET /agents, GET /agents/domain, POST /agents/invoke, GET /agents/:slug, POST /agents/domain/invoke |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; agent execution via agent-library.invokeAgent(); agent execution via domain-agents; Supabase client initialised but not directly written in first 80 lines |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (reads agent definitions from lib; Supabase client available for agent internals) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000451 — routes/briefing.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/briefing.js |
| Parent | ENT-000082 (routes/) |
| Description | Daily briefing aggregation API — assembles cross-domain snapshots for calendar, email, finance, health, journal, and assignments |
| Purpose | Exposes read-heavy briefing endpoints that fan out to multiple Supabase tables and return a unified morning briefing payload |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, @supabase/supabase-js, ../lib/app-auth |
| Interfaces | GET /briefing/today, GET /briefing/priority-inbox, GET /briefing/motivation (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; reads from apex_calendar_events, email_threads, apex_transactions, apex_invoices, apex_nutrition_log, apex_sleep_log, apex_workouts, apex_journal_entries, apex_university_assignments, apex_email_queue, apex_assignments, apex_follow_ups |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (read-only aggregation) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines (motivation and further endpoints) |

---

### ENT-000452 — routes/career.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/career.js |
| Parent | ENT-000082 (routes/) |
| Description | Career management API — tracks job applications, interviews, and skills |
| Purpose | Exposes CRUD endpoints for job applications, interview scheduling, and skill tracking against Supabase career tables |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /career/applications, POST /career/applications, PATCH /career/applications/:id, GET /career/interviews, POST /career/interviews, GET /career/skills, POST /career/skills (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_job_applications, apex_interviews, apex_skills |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes to Supabase career tables) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000453 — routes/civilization.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/civilization.js |
| Parent | ENT-000082 (routes/) |
| Description | Civilization health and intelligence engine API — multi-dimensional scoring, global intelligence, digital twin, strategy, and resource authority |
| Purpose | Exposes endpoints for civilization health snapshots, trend history, global intelligence queries, opportunity scoring, executive council, digital twin simulation, strategy engine, and decision outcome tracking |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth, ../lib/telemetry/aggregator (computeCivilizationHealth), ../lib/clients (getSupabaseClient), ../lib/intelligence/civilization-health-engine, ../lib/intelligence/global-intelligence-engine, ../lib/intelligence/opportunity-engine, ../lib/executive/executive-council, ../lib/intelligence/digital-twin-engine, ../lib/intelligence/strategy-engine, ../lib/intelligence/civilization-runtime, ../lib/intelligence/executive-performance-engine, ../lib/intelligence/decision-outcome-engine, ../lib/intelligence/resource-authority-engine, ../lib/intelligence/value-creation-engine, ../lib/intelligence/reality-loop |
| Interfaces | GET /civilization/health, GET /civilization/health/latest, GET /civilization/health/history, POST /civilization/health/snapshot, GET /civilization/health/trend (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; reads from civilization_health_snapshots; engine methods write snapshots via intelligence lib modules |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (health engine snapshot writes persist to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000454 — routes/cognitive.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/cognitive.js |
| Parent | ENT-000082 (routes/) |
| Description | Cognitive layer API — REST surface for all 16 cognitive engines including retrieval policy, behaviour modification, cognitive policy, autonomy, and retrieval evaluation |
| Purpose | Exposes determine/stats/evaluate endpoints for each cognitive engine so dashboards and agents can query and configure cognitive pipeline behaviour |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth (router.use), ../lib/cognitive |
| Interfaces | POST /cognitive/retrieval-policy/determine, GET /cognitive/retrieval-policy/stats, POST /cognitive/behavior/profile, GET /cognitive/policy/stats, POST /cognitive/autonomy/evaluate, GET /cognitive/autonomy/stats, GET /cognitive/retrieval-eval/quality (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; cognitive engine calls (reads/writes within lib/cognitive internals) |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (cognitive engines persist decisions and stats to Supabase internally) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Remaining 9+ cognitive engine endpoints beyond first 80 lines |

---

### ENT-000455 — routes/cognitive-eval.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/cognitive-eval.js |
| Parent | ENT-000082 (routes/) |
| Description | Blind evaluation probe for holdout oracle — Phase 3 evaluator independence; runs cognitive stack and returns raw outputs without logging expected values |
| Purpose | Provides a single POST probe endpoint that exercises cognitivePolicy, planningStrategy, autonomy, and digital-twin-gate in isolation so external evaluators can score outputs independently |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth (router.use), ../lib/cognitive (lazy), ../lib/cognitive/runtime/digital-twin-gate (lazy) |
| Interfaces | POST /cognitive-eval/probe |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON response with selected_mode, planning_depth, autonomy_level, twin_rec fields |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (read-only probe; no writes) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | None — full file visible in 80 lines |

---

### ENT-000456 — routes/cognitive-evolution.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX\Scripts\routes\cognitive-evolution.js |
| Parent | ENT-000082 (routes/) |
| Description | Cognitive evolution dashboard API — visibility into the self-evolution governance pipeline for outcome attribution, digital twin accuracy, and policy evolution |
| Purpose | Exposes read-only endpoints for impact scoring, task attribution, digital twin accuracy trends, and policy evolution history; includes a governed /apply-evolution write endpoint |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth (router.use), ../lib/cognitive/effectiveness/outcome-attribution-engine (lazy), ../lib/cognitive/effectiveness/digital-twin-accuracy-engine (lazy), ../lib/cognitive/evolution/policy-evolution-engine (lazy) |
| Interfaces | GET /cognitive-evolution/attribution/impact, GET /cognitive-evolution/attribution/task/:taskId, GET /cognitive-evolution/twin/accuracy, GET /cognitive-evolution/twin/trend, GET /cognitive-evolution/policies, GET /cognitive-evolution/policies/history (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; reads from cognitive effectiveness engines; /apply-evolution (beyond line 80) writes policy changes |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (apply-evolution endpoint writes policy evolution records) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | /apply-evolution endpoint and further routes beyond first 80 lines |

---

### ENT-000457 — routes/communications.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/communications.js |
| Parent | ENT-000082 (routes/) |
| Description | Communications API — contacts, calendar events, and Google Calendar sync |
| Purpose | Exposes endpoints for listing contacts and calendar events from Supabase, and syncing events from Google Calendar via OAuth2 |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, @supabase/supabase-js, googleapis, ../lib/app-auth, ../lib/memory/gateway, ../lib/pg_helpers (pgGetGmailToken) |
| Interfaces | GET /contacts, GET /calendar/events, POST /calendar/sync (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount; Google Calendar API (external pull on sync) |
| Exit Points | HTTP JSON responses; writes to apex_calendar_events on sync; reads from apex_contacts, apex_calendar_events |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (calendar sync writes events to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000458 — routes/emails.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/emails.js |
| Parent | ENT-000082 (routes/) |
| Description | Email queue management API — lists queued emails, triggers Gmail fetch, and handles approve/reject actions |
| Purpose | Exposes endpoints to view the email queue, pull new messages from Gmail, approve sending a drafted reply (with explicit user confirmation header), and reject emails |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/middleware (requireAppAccess), ../lib/server-utils (getCached, setCache, clearCache), ../lib/pg_helpers (pgListEmailQueue, pgUpdateEmailQueueStatus), ../agent-system/email_agent (checkEmails, sendEmailReply) |
| Interfaces | GET /emails, POST /emails/check, POST /emails/:id/approve, POST /emails/:id/reject |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes email status to pg via pgUpdateEmailQueueStatus; triggers Gmail send via sendEmailReply; reads from pg_email_queue |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (updates email queue status in Postgres; sends actual Gmail messages on approve) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | None — full file visible in 80 lines |

---

### ENT-000459 — routes/empire.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/empire.js |
| Parent | ENT-000082 (routes/) |
| Description | Empire graph API — build, query, and mutate the business empire knowledge graph of nodes and edges |
| Purpose | Exposes endpoints to build or rebuild the empire graph, retrieve graph stats, get/update nodes and their neighbours, create edges, and find high-leverage projects |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth, ../lib/empire (lazy) |
| Interfaces | POST /empire/build, GET /empire/stats, GET /empire/nodes/:id, GET /empire/nodes/:id/neighbors, POST /empire/nodes, PATCH /empire/nodes/:id, POST /empire/edges, GET /empire/projects/leverage (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes nodes and edges to empire graph storage via lib/empire; reads graph stats and node data |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (addNode, addEdge, updateNode write to Supabase via lib/empire) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000460 — routes/entities.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/entities.js |
| Parent | ENT-000082 (routes/) |
| Description | Entity registry and relationship graph API — canonical entity resolution, lookup, and interaction history |
| Purpose | Exposes endpoints to list entities, retrieve a single entity with its relationships, resolve a name/email to a canonical entity_id, and fetch interaction history for an entity |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth, ../lib/clients (getSupabaseClient), ../lib/entities/resolver (resolveEntity) |
| Interfaces | GET /entities, GET /entities/:id, POST /entities/resolve, GET /entities/:id/interactions (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; reads from entities, relationships, interactions tables; resolveEntity may write a new entity record on upsert |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (resolveEntity upserts canonical entity records) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000461 — routes/executive-performance.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/executive-performance.js |
| Parent | ENT-000082 (routes/) |
| Description | Executive Performance Engine API — records recommendations, measures outcomes, and computes performance stats per executive entity |
| Purpose | Exposes endpoints to record AI recommendations, log their outcomes, compute per-entity and aggregate performance stats, and refresh cached stats |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth, ../lib/intelligence/executive-performance-engine (lazy) |
| Interfaces | POST /executive-performance/recommendations, POST /executive-performance/recommendations/:id/outcome, GET /executive-performance/stats, GET /executive-performance/stats/:entityId, POST /executive-performance/stats/refresh (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes recommendation and outcome records to Supabase via executive-performance-engine; writes refreshed stats to exec_performance_stats cache |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (recommendation and outcome records written to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000462 — routes/finance.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/finance.js |
| Parent | ENT-000082 (routes/) |
| Description | Finance management API — invoices, expenses, subscriptions, investments, balance, and cashflow reporting |
| Purpose | Exposes read endpoints for all core financial data tables and computed summaries (balance, 6-month cashflow) |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /finance/invoices, GET /finance/expenses, GET /finance/subscriptions, GET /finance/investments, GET /finance/balance, GET /finance/cashflow (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; reads from apex_invoices, apex_transactions, apex_subscriptions, apex_investments |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (read-only in visible portion; write endpoints may exist beyond line 80) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000463 — routes/founder.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/founder.js |
| Parent | ENT-000082 (routes/) |
| Description | Founder OS API — profile loading, context packaging, alignment scoring, decision weights, and risk profile |
| Purpose | Exposes endpoints for the Founder profile (sanitized and section-level), context assembly for tasks, alignment guidance, decision weights, risk profile, and alignment scoring |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth, ../lib/founder (lazy) |
| Interfaces | GET /founder/profile, GET /founder/profile/:section, POST /founder/profile/reload, POST /founder/context, POST /founder/context/prompt, GET /founder/decision-weights, GET /founder/risk-profile, POST /founder/align (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; reads from founder DB via lib/founder; cache invalidation on reload |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (reads and cache management; no direct writes in visible portion) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000464 — routes/founder-graph.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/founder-graph.js |
| Parent | ENT-000082 (routes/) |
| Description | Founder Knowledge Graph API — build, query, and update the founder's personal knowledge graph of nodes and edges |
| Purpose | Exposes endpoints to build or rebuild the founder knowledge graph, retrieve graph stats, list/get/update nodes, get node neighbours, list/get edges, and find paths |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth, ../lib/founder/graph (lazy), ../lib/clients (getSupabaseClient, inline) |
| Interfaces | POST /founder-graph/build, GET /founder-graph/stats, GET /founder-graph/nodes, GET /founder-graph/nodes/:id, GET /founder-graph/nodes/:id/neighbors, PATCH /founder-graph/nodes/:id, GET /founder-graph/edges (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; reads from fkg_nodes and fkg_edges tables; PATCH and build write to fkg_nodes/fkg_edges |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (build and node update operations write to Supabase fkg tables) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000465 — routes/gemini-live.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/gemini-live.js |
| Parent | ENT-000082 (routes/) |
| Description | Gemini Live voice session manager — bidirectional WebSocket bridge to Gemini native audio with Apex tool routing, semantic TTS chunking, and intent classification |
| Purpose | Manages real-time voice sessions over WebSocket, classifies intent to route between Gemini/Sonnet/Haiku, executes Apex function declarations (weather, email, calendar, finance, health, tasks), streams TTS audio back to client |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | https (built-in), crypto (built-in), ws, ../lib/latency-tracker, ../lib/models/runtime, ../lib/event-bus, ./intelligence (lazy), Google Gemini WebSocket API (external) |
| Interfaces | WebSocket upgrade handler (no standard REST route in first 80 lines — session open/close via WebSocket; HTTP routes defined beyond line 80) |
| Entry Points | WebSocket connections from browser voice client; Gemini BidiGenerateContent WebSocket (outbound) |
| Exit Points | WebSocket audio frames streamed to client; Apex tool executions (email, calendar, tasks, finance, health queries); TTS audio synthesis via Gemini TTS API; event-bus events |
| Runtime Presence | ON_REQUEST (long-lived WebSocket sessions) |
| Persistence | NONE (in-memory session state; transcript not persisted in visible portion) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | latency-tracker integration |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | HTTP REST routes and full session lifecycle beyond first 80 lines |

---

### ENT-000466 — routes/governance.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/governance.js |
| Parent | ENT-000082 (routes/) |
| Description | Governance and forensic query engine API — answers all 16 platform forensic questions about any task from stored evidence; also exposes governance dashboard and autonomous OS certification status |
| Purpose | Exposes GET /governance/forensics/:taskId which performs a 17-table parallel query to reconstruct full task provenance, cost, certification, risk, and replay evidence |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, @supabase/supabase-js, ../lib/app-auth (router.use) |
| Interfaces | GET /governance/forensics/:taskId (partial — beyond line 80 for additional governance and certification endpoints) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; reads from apex_agent_runs, request_logs, execution_graphs, execution_nodes, agent_decisions, execution_artifacts, cost_accounting, certifications, policy_decisions, otel_spans, anomalies, apex_lessons, slo_measurements, execution_snapshots, risk_scores, evidence_blocks, system_events |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (read-only forensic reconstruction) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Built-in latency measurement (t0 = Date.now()) |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Additional governance dashboard and certification endpoints beyond first 80 lines |

---

### ENT-000467 — routes/health.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/health.js |
| Parent | ENT-000082 (routes/) |
| Description | Health tracking API — workouts, nutrition, sleep, and related health data CRUD |
| Purpose | Exposes endpoints for logging and retrieving workout sessions, daily nutrition entries, and sleep records; includes an unauthenticated /health/ping liveness check |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /health/ping (no auth), GET /health/workouts, POST /health/workouts, GET /health/nutrition, POST /health/nutrition, GET /health/sleep (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_workouts, apex_nutrition_log; reads from apex_workouts, apex_nutrition_log, apex_sleep_log |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes workout and nutrition entries to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000468 — routes/integrations.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/integrations.js |
| Parent | ENT-000082 (routes/) |
| Description | Third-party integrations API — Notion task/project management, Slack messaging, lead pipeline processing, and system status |
| Purpose | Exposes endpoints for Notion task CRUD, Notion project listing, Slack messaging, inbound lead processing via the lead pipeline, and integration health status |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth (requireAppAccess), ../services/notion/notion-tasks (lazy), ../services/notion/notion-projects (lazy), ../services/slack/* (lazy), ../services/pipelines/lead-pipeline (lazy) |
| Interfaces | POST /leads/inbound, GET /tasks, POST /tasks, GET /projects (partial — beyond line 80 for Slack and status endpoints) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; Notion API writes (create task/project); Slack API calls; lead pipeline processing (may write to Supabase) |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (creates Notion pages; lead pipeline may write to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Slack and system status endpoints beyond first 80 lines |

---

### ENT-000469 — routes/intelligence.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/intelligence.js |
| Parent | ENT-000082 (routes/) |
| Description | Intelligence and voice pipeline state API — manages voice interrupt/status, exposes agent reflexion lessons, and provides agent run audit log |
| Purpose | Exposes voice pipeline state management (interrupt, get status, set state), a WebSocket voice state broadcast mechanism, recent reflexion lessons from Obsidian memory, and agent run history from Supabase |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js), routes/gemini-live.js (lazy loads this module) |
| Dependencies | express, @supabase/supabase-js, ../lib/app-auth (requireAppAccess), ../agent-system/obsidian-memory |
| Interfaces | POST /intelligence/interrupt, GET /intelligence/voice-status, POST /intelligence/voice-state, GET /intelligence/lessons, GET /intelligence/agent-runs (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount; WebSocket clients that subscribe to voice state broadcasts |
| Exit Points | HTTP JSON responses; WebSocket voice state broadcasts to subscribed clients; reads from apex_agent_runs; reads from Obsidian memory via obsidian-memory module |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (in-memory voice state; reads audit log) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Voice pipeline state tracking; agent run audit log |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000470 — routes/intelligence-memory.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/intelligence-memory.js |
| Parent | ENT-000082 (routes/) |
| Description | Intelligence memory API — REST surface for memory retrieval, context composition, and decision intelligence engines |
| Purpose | Exposes endpoints for task-oriented memory retrieval (stats and query), context composition for agent roles, and decision intelligence (query history and record new decisions) |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth (router.use), ../lib/intelligence |
| Interfaces | GET /intelligence/retrieval/stats, POST /intelligence/retrieval/query, POST /intelligence/context/compose, POST /intelligence/decisions/query, POST /intelligence/decisions/record (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; memory retrieval reads from episodic/semantic memory via lib/intelligence; decision record writes to decision memory |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (decisions/record writes new decision memory entries) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000471 — routes/intent.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/intent.js |
| Parent | ENT-000082 (routes/) |
| Description | Voice-first natural language intent dispatcher — parses free-text commands with Claude and executes matched database actions |
| Purpose | Provides a single POST endpoint that accepts natural language text, classifies it into a supported intent via Claude (fast tier), and executes the corresponding Supabase write (workout, meal, sleep, mood, journal, spiritual, invoice, calendar event) or read (balance, briefing) |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, @supabase/supabase-js, ../lib/app-auth, ../lib/models/runtime (lazy, for Claude intent parsing) |
| Interfaces | POST /intent/dispatch (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount; Claude API (fast tier) for intent classification |
| Exit Points | HTTP JSON responses; writes to apex_workouts, apex_nutrition_log, apex_sleep_log, apex_mood_log (implied), apex_journal_entries, apex_spiritual_sessions, apex_invoices, apex_calendar_events based on intent |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes to multiple Supabase tables depending on parsed intent) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full intent execution and response logic beyond first 80 lines |

---

### ENT-000472 — routes/journal.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/journal.js |
| Parent | ENT-000082 (routes/) |
| Description | Journal and habits API — journal entries with AI sentiment scoring, habit tracking, habit log, streak calculation, and gratitude entries |
| Purpose | Exposes CRUD endpoints for journal entries (with Claude sentiment analysis on write), habits management, habit log toggle, streak computation, and gratitude entries |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth, ../lib/models/runtime |
| Interfaces | GET /journal/entries, POST /journal/entries, GET /journal/habits, POST /journal/habits, POST /journal/habits/:id/log, GET /journal/habits/:id/streak, GET /journal/gratitude (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount; Claude API (fast tier) for sentiment scoring on journal POST |
| Exit Points | HTTP JSON responses; writes to apex_journal_entries, apex_habits, apex_habit_logs; reads from same tables and apex_habit_logs for streak |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes journal entries, habits, and habit logs to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000473 — routes/knowledge-graph.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/knowledge-graph.js |
| Parent | ENT-000082 (routes/) |
| Description | Knowledge graph API — create nodes/edges, query by type, find paths, get subgraph, sync memory objects to graph, and retrieve stats |
| Purpose | Exposes a complete REST interface for the in-system knowledge graph: CRUD for nodes and edges, BFS path finding, high-confidence subgraph extraction, memory-to-graph sync, and statistics |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth (router.use), ../lib/memory/knowledge-graph |
| Interfaces | POST /knowledge-graph/nodes, GET /knowledge-graph/nodes/:nodeId, GET /knowledge-graph/nodes/type/:nodeType, POST /knowledge-graph/edges, GET /knowledge-graph/nodes/:nodeId/neighbors, GET /knowledge-graph/path, GET /knowledge-graph/subgraph, POST /knowledge-graph/sync, GET /knowledge-graph/stats |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes nodes to knowledge_graph_nodes and edges to knowledge_graph_edges via lib/memory/knowledge-graph |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (creates nodes and edges in Supabase knowledge graph tables) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | None — all endpoints visible within first 80 lines |

---

### ENT-000474 — routes/legal.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/legal.js |
| Parent | ENT-000082 (routes/) |
| Description | Legal management API — contracts and legal deadline tracking |
| Purpose | Exposes CRUD endpoints for legal contracts and deadlines, with a deadline completion toggle |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /legal/contracts, POST /legal/contracts, PATCH /legal/contracts/:id, GET /legal/deadlines, POST /legal/deadlines, PATCH /legal/deadlines/:id/complete |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_contracts, apex_legal_deadlines |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes contract and deadline records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | None — full file visible in 80 lines |

---

### ENT-000475 — routes/life.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/life.js |
| Parent | ENT-000082 (routes/) |
| Description | Life OS API — journal entries, habit tracking with toggle/log, and psychology crisis check |
| Purpose | Exposes endpoints for reading and writing journal entries, listing and toggling habits, logging habit completions, and running a psychology crisis check |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, @supabase/supabase-js, ../lib/app-auth |
| Interfaces | GET /journal/entries, POST /journal/entries, GET /habits, POST /habits/:id/toggle, POST /habits/log, GET /psychology/crisis-check (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_journal_entries, apex_habit_logs; reads from apex_habits, apex_journal_entries |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes journal entries and habit logs to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000476 — routes/memory.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/memory.js |
| Parent | ENT-000082 (routes/) |
| Description | Multi-layer memory system API — working, episodic, semantic, procedural, strategic, skill, decision memory, plus consolidation, reflexion, and improvement engines |
| Purpose | Exposes a full REST interface across all 7+ memory layers: set/get/delete/extend working memory by session, store/retrieve/search episodic memory, plus similar endpoints for all other layers |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth (router.use), ../lib/memory (workingMemory, episodicMemory, semanticMemory, proceduralMemory, strategicMemory, skillMemory, decisionMemory, consolidationEngine, reflexionTracker, improvementEngine) |
| Interfaces | POST /memory/working, GET /memory/working/:sessionId, GET /memory/working/:sessionId/:memoryType, DELETE /memory/working/:sessionId, POST /memory/working/:sessionId/extend, POST /memory/episodic, GET /memory/episodic/similar, GET /memory/episodic/recent, GET /memory/episodic/failures (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to working_memory, episodic_memory, semantic_memory, procedure_memory, strategic_memory, skill_memory, decision_memory tables via lib/memory layer modules |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes across all memory layer tables in Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines (25+ total endpoints) |

---

### ENT-000477 — routes/nutrition.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/nutrition.js |
| Parent | ENT-000082 (routes/) |
| Description | Nutrition tracking API — food log, water intake, supplements, and intermittent fasting management |
| Purpose | Exposes CRUD endpoints for nutrition log entries, water log, active supplements, and fasting session tracking (start, end, current status) |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /nutrition/log, POST /nutrition/log, GET /nutrition/water, POST /nutrition/water, GET /nutrition/supplements, POST /nutrition/supplements, GET /nutrition/fasting/current, POST /nutrition/fasting/start, POST /nutrition/fasting/end (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_nutrition_log, apex_water_log, apex_supplements, apex_fasting_log |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes nutrition, water, supplement, and fasting records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000478 — routes/observatory.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/observatory.js |
| Parent | ENT-000082 (routes/) |
| Description | APEX System Observatory — live health probing of all subsystems including database, all 13 memory layers, and cron checkpoints |
| Purpose | Exposes a full health snapshot endpoint that probes Postgres, Supabase memory layer tables, and cron sync checkpoints in real time with no cached state |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, fs (built-in), path (built-in), ../lib/app-auth (router.use), ../lib/clients (getSupabaseClient), ../lib/pg_database |
| Interfaces | GET /observatory (full snapshot), GET /observatory/summary (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; live reads from Postgres and all Supabase memory tables (working_memory, episodic_memory, procedure_memory, strategic_memory, skill_memory, decision_memory, knowledge_graph_nodes, semantic_memory, apex_lessons, reflexion_records, improvement_candidates, founder_context, apex_sync_checkpoints) |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (read-only live probes) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Self-monitoring — this is the observability endpoint for the whole system |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list and probe details beyond first 80 lines |

---

### ENT-000479 — routes/operations.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/operations.js |
| Parent | ENT-000082 (routes/) |
| Description | Operations and system health API — liveness probe, version info, status, ping, readiness, metrics, and memory diagnostics |
| Purpose | Exposes unauthenticated system probes (healthz, version, status, ping, ready) and authenticated diagnostics (metrics request counter, memory-stats heap usage) |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js), Render health check, Kubernetes liveness probe |
| Dependencies | express, @supabase/supabase-js, ../lib/app-auth, ../lib/counter, ../package.json |
| Interfaces | GET /healthz (no auth), GET /version (no auth), GET /status (no auth), GET /ping (no auth), GET /ready (no auth), GET /metrics, GET /memory-stats (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount; Render/Kubernetes health check polling |
| Exit Points | HTTP JSON responses with system version, uptime, request counts, heap usage |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (read-only diagnostics) |
| Documentation | Inline JSDoc on /version endpoint |
| Test Coverage | UNKNOWN |
| Observability | Self-reporting metrics and memory stats |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000480 — routes/property.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/property.js |
| Parent | ENT-000082 (routes/) |
| Description | Property management API — property records, expense tracking, and maintenance item management |
| Purpose | Exposes CRUD endpoints for properties, property-level expenses, and maintenance scheduling |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /property, POST /property, GET /property/expenses, POST /property/expenses, GET /property/maintenance, POST /property/maintenance (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_properties, apex_property_expenses, apex_maintenance_items |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes property, expense, and maintenance records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000481 — routes/pwa.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/pwa.js |
| Parent | ENT-000082 (routes/) |
| Description | Progressive Web App support API — generated app icons, VAPID key distribution, push subscription management, and push notification dispatch |
| Purpose | Serves PNG icons at 192px/512px, exposes VAPID public key for browser subscription setup, stores and removes push subscriptions in Supabase, and sends push notifications to all subscribed endpoints |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js), browser service worker |
| Dependencies | express, ../lib/app-auth, ../lib/clients (getSupabaseClient), ../lib/pwa/icon-generator (getIcon), web-push (lazy) |
| Interfaces | GET /icon-192.png (no auth), GET /icon-512.png (no auth), GET /pwa/vapid-key (no auth), POST /pwa/subscribe, DELETE /pwa/subscribe, POST /pwa/push |
| Entry Points | HTTP requests from server.js router mount; browser service worker subscription events |
| Exit Points | HTTP PNG image responses; HTTP JSON responses; writes push subscriptions to pwa_subscriptions; reads from pwa_subscriptions to send pushes; web-push API calls to browser push endpoints |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (upserts and deletes push subscription records in Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | None — all endpoints visible within first 80 lines |

---

### ENT-000482 — routes/relationships.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/relationships.js |
| Parent | ENT-000082 (routes/) |
| Description | Relationships management API — people, interaction logging, and follow-up tracking |
| Purpose | Exposes CRUD endpoints for people records, interaction logs (with last_contact_date update), and follow-up reminders |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /relationships/people, POST /relationships/people, GET /relationships/interactions, POST /relationships/interactions, GET /relationships/follow-ups, POST /relationships/follow-ups (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_people, apex_interactions, apex_follow_ups; updates last_contact_date on apex_people on interaction write |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes people, interaction, and follow-up records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000483 — routes/shopping.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/shopping.js |
| Parent | ENT-000082 (routes/) |
| Description | Shopping management API — wishlist and purchase tracking |
| Purpose | Exposes CRUD endpoints for wishlist items (with purchase status toggle) and purchase history with total spend calculation |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /shopping/wishlist, POST /shopping/wishlist, PATCH /shopping/wishlist/:id, GET /shopping/purchases, POST /shopping/purchases |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_wishlist, apex_purchases |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes wishlist and purchase records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | None — full file visible in 80 lines |

---

### ENT-000484 — routes/social.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/social.js |
| Parent | ENT-000082 (routes/) |
| Description | Social media management API — social account registry and post scheduling/management |
| Purpose | Exposes CRUD endpoints for tracking social accounts across platforms and managing social posts through draft/schedule/publish lifecycle |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /social/accounts, POST /social/accounts, GET /social/posts, POST /social/posts, PATCH /social/posts/:id |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_social_accounts, apex_social_posts |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes social account and post records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | None — full file visible in 80 lines |

---

### ENT-000485 — routes/spiritual.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/spiritual.js |
| Parent | ENT-000082 (routes/) |
| Description | Spiritual practice tracking API — session log, summary by type, and streak calculation |
| Purpose | Exposes endpoints to log spiritual sessions (meditation, prayer, etc.), retrieve a summary breakdown by type and total minutes, and calculate a consecutive-day streak for a given practice type |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /spiritual/log, POST /spiritual/log, GET /spiritual/summary, GET /spiritual/streak |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_spiritual_sessions; reads from apex_spiritual_sessions |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes spiritual session records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | None — full file visible in 80 lines |

---

### ENT-000486 — routes/strategic.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/strategic.js |
| Parent | ENT-000082 (routes/) |
| Description | Strategic Intelligence Engine API — full analysis, executive briefing, goal/opportunity/threat/bottleneck analysis, priority ranking, and horizon-based recommendations |
| Purpose | Exposes endpoints to run the full strategic analysis pipeline, generate executive briefings, and query individual strategic components (goals, opportunities, threats, bottlenecks, priority ranking, recommendations by horizon) |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/app-auth, ../lib/intelligence/sie (lazy) |
| Interfaces | POST /strategic/run, GET /strategic/brief, GET /strategic/goals, GET /strategic/opportunities, GET /strategic/threats, GET /strategic/bottlenecks, GET /strategic/priority, GET /strategic/recommendations/:horizon (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; strategic intelligence engine reads from multiple Supabase tables (goals, opportunities, threats via lib/intelligence/sie internals) |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (read-only analysis; run endpoint may cache results internally) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000487 — routes/travel.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/travel.js |
| Parent | ENT-000082 (routes/) |
| Description | Travel management API — trip records, trip expense tracking, and itinerary item management |
| Purpose | Exposes CRUD endpoints for travel trips, trip-level expense logging, and itinerary item scheduling |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /travel/trips, POST /travel/trips, GET /travel/expenses, POST /travel/expenses, GET /travel/itinerary, POST /travel/itinerary |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_trips, apex_trip_expenses, apex_itinerary_items |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes trip, expense, and itinerary records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | None — full file visible in 80 lines |

---

### ENT-000488 — routes/tts-gemini.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/tts-gemini.js |
| Parent | ENT-000082 (routes/) |
| Description | Gemini TTS API — converts text to speech using Gemini 2.5 Flash TTS with in-memory WAV caching |
| Purpose | Provides a single POST endpoint that accepts text, strips markdown, calls the Gemini TTS API (24kHz PCM), wraps output in WAV format, caches up to 30 results with 5-minute TTL, and returns audio/wav |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js), gemini-live.js (TTS stream path) |
| Dependencies | express, crypto (built-in), ../lib/app-auth, Google Gemini TTS API (external HTTP — GOOGLE_API_KEY / GEMINI_API_KEY) |
| Interfaces | POST /tts/gemini |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | audio/wav binary HTTP response; Gemini TTS API HTTP call (outbound); in-memory WAV cache (Map) |
| Runtime Presence | ON_REQUEST |
| Persistence | NONE (in-memory cache only; no Supabase writes) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | X-Apex-Cache hit/miss header on response |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full response path and error handling beyond first 80 lines |

---

### ENT-000489 — routes/university.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/university.js |
| Parent | ENT-000082 (routes/) |
| Description | University management API — assignments, modules, study sessions, and deadline tracking |
| Purpose | Exposes CRUD endpoints for university assignments (with completion/grade update), module registration, study session logging, and upcoming deadline queries |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /university/assignments, POST /university/assignments, PATCH /university/assignments/:id, GET /university/modules, POST /university/modules, POST /university/study-sessions, GET /university/study-sessions, GET /university/deadlines (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_university_assignments, apex_university_modules, apex_university_sessions |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes assignment, module, and study session records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

### ENT-000490 — routes/voice-chat.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/voice-chat.js |
| Parent | ENT-000082 (routes/) |
| Description | Voice chat API — the primary text/voice conversation endpoint routing between Claude Haiku/Sonnet and Apex tools with full memory, context, and reflexion integration |
| Purpose | Accepts POST messages, classifies intent (greeting/conversational/tool/deep), assembles context from working memory, Obsidian, wiki, and gateway, routes to Claude with tool use, stores conversation in episodic memory, triggers auto-pipeline, and returns a reply |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js), dashboard.html frontend |
| Dependencies | express, ../lib/app-auth, ../lib/memory/gateway, ../lib/memory/working-memory, ../lib/temporal/session-tracker, ../lib/agent-queue, ../lib/auto-pipeline, ../lib/apex-tools (APEX_TOOLS, executeApexTool), ../lib/chat-context (formatRecentMemory, getMemorySummary, extractAndSaveFacts, buildAlexContext), ../lib/server-utils (detectDomain), ../agent-system/obsidian-client (obsidianAppend), ../agent-system/domain-agents (DOMAIN_AGENTS), ../lib/pg_helpers (pgSearchDocuments), ../lib/clients (getSupabaseClient, getAnthropicClient), ../config (HAIKU_MODEL, SONNET_MODEL), ../lib/models/runtime, ../lib/memory/reflexion-tracker (lazy), ../agent-system/wiki-reader (lazy) |
| Interfaces | POST /voice-chat |
| Entry Points | HTTP requests from server.js router mount; Claude API (Haiku/Sonnet) for response generation; Apex tool execution pipeline |
| Exit Points | HTTP JSON response with reply; episodic memory write via gateway; Obsidian append; working memory writes; reflexion tracking; auto-pipeline trigger; domain agent dispatch |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes conversation memory to working_memory and episodic_memory; appends to Obsidian vault; reflexion records) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Latency logging at request receipt; 45s timeout guard |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full Claude response loop, tool execution, and post-processing beyond first 80 lines |

---

### ENT-000491 — routes/wealth.js *(Expanded Record)*

**Family:** RTE | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | C:/Users/arwwo/Desktop/APEX/Scripts/routes/wealth.js |
| Parent | ENT-000082 (routes/) |
| Description | Wealth management API — financial transaction ledger, income/expense summary, subscriptions, and net worth snapshot tracking |
| Purpose | Exposes endpoints for the apex_finance_entries ledger (transactions by date/type), computed income/expense summary by category, active subscription management, and net worth snapshot retrieval |
| Owner | The Founder (ENT-000002) |
| Visibility | EXTERNAL |
| Source | AUTHORED |
| Language | JavaScript |
| Created By | UNKNOWN |
| Consumers | ENT-000040 (server.js) |
| Dependencies | express, ../lib/clients (getSupabaseClient), ../lib/app-auth |
| Interfaces | GET /wealth/transactions, POST /wealth/transactions, GET /wealth/summary, GET /wealth/subscriptions, POST /wealth/subscriptions, DELETE /wealth/subscriptions/:id, GET /wealth/net-worth/latest (partial — beyond line 80) |
| Entry Points | HTTP requests from server.js router mount |
| Exit Points | HTTP JSON responses; writes to apex_finance_entries, apex_subscriptions (soft-delete via active flag); reads from apex_net_worth_snapshot |
| Runtime Presence | ON_REQUEST |
| Persistence | DURABLE (writes transaction and subscription records to Supabase) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | UNKNOWN |
| Governance Status | PARTIALLY_GOVERNED |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 80 lines read 2026-07-05 |
| Unknown Fields | Full endpoint list beyond first 80 lines |

---

*End of 09a — Block 08 Route Files Full Attribute Expansion*
