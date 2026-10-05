# SUBSYSTEM CATALOG
## Document 3 of 17 — Every Named Subsystem
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## CATALOG FORMAT
Each entry: NAME | TYPE | LOCATION | PURPOSE | OWNER | CALLED BY | CALLS INTO | PRODUCTION STATUS | RISK | REMOVAL SAFETY

---

## 1. HTTP SERVER / MONOLITH

| Field | Value |
|---|---|
| NAME | HTTP Server / Express Monolith |
| TYPE | Application Entry Point |
| LOCATION | server.js (~12,300 lines, ~515KB) |
| PURPOSE | Express app server; registers all middleware, mounts 23 route files, defines ~35 inline routes, starts HTTP/WebSocket listeners |
| OWNER | Top-level / Infrastructure |
| CALLED BY | Render platform (HTTP), external clients, Render cron |
| CALLS INTO | lib/clients.js, lib/governance*.js, lib/event-bus.js, lib/agent-queue.js, lib/app-auth.js, all route files, obsidian-memory.js, governance-probe.js |
| PRODUCTION STATUS | LIVE |
| RISK | CRITICAL — single point of failure for all HTTP traffic |
| REMOVAL SAFETY | UNSAFE |

---

## 2. AGENT ORCHESTRATOR

| Field | Value |
|---|---|
| NAME | Agent Orchestrator |
| TYPE | Pipeline Runner |
| LOCATION | agent-system/orchestrator.js |
| PURPOSE | Executes the 6-stage agent pipeline (RESEARCHER → ARCHITECT → DEVELOPER → REVIEWER+VALIDATOR → TESTER → COMMITTER). Enforces 5 pre-execution gates. Writes audit to apex_agent_runs/apex_agent_stages. |
| OWNER | Agent System |
| CALLED BY | runtime/task-router.js, routes/agents.js, server.js inline handlers |
| CALLS INTO | agent-system/pipeline/*, lib/memory/gateway.js, lib/governance*.js, agent-system/reputation.js, agent-system/dynamic-agent-selector.js, agent-system/execution-verifier.js, agent-system/adaptation.js, Anthropic API |
| PRODUCTION STATUS | LIVE |
| RISK | HIGH — drives all autonomous code changes; pipeline bugs affect production commits |
| REMOVAL SAFETY | UNSAFE |

---

## 3. MEMORY GATEWAY

| Field | Value |
|---|---|
| NAME | Memory Gateway |
| TYPE | Memory Router / Abstraction Layer |
| LOCATION | lib/memory/gateway.js |
| PURPOSE | Routes all memory reads and writes across 12 numbered layers (0-12, gap at 4). Applies sanitizer before writes. Triggers evidence_blocks audit for layers 0 and 11. |
| OWNER | Memory Subsystem |
| CALLED BY | orchestrator.js, obsidian-memory.js, all route handlers that store memory, agent-system/memory.js |
| CALLS INTO | lib/memory/sanitizer.js, lib/clients.js (Supabase), lib/governance*.js (evidence blocks), all layer-specific modules |
| PRODUCTION STATUS | LIVE |
| RISK | HIGH — all memory writes pass through this; bugs here corrupt all memory layers |
| REMOVAL SAFETY | UNSAFE |

---

## 4. MEMORY SANITIZER

| Field | Value |
|---|---|
| NAME | Memory Sanitizer |
| TYPE | Security Filter |
| LOCATION | lib/memory/sanitizer.js |
| PURPOSE | Scrubs 10 secret key patterns from memory content before persistence. Active on hot path (every pgAddMemory call). Applied by WS-6A fix. |
| OWNER | Memory Subsystem / Security |
| CALLED BY | lib/memory/gateway.js (on every write) |
| CALLS INTO | (pure function — no external calls) |
| PRODUCTION STATUS | LIVE |
| RISK | HIGH — gaps in coverage (no OpenAI, no Supabase service role, no DB connection strings, no generic bearer tokens, no PEM blocks) |
| REMOVAL SAFETY | UNSAFE (would re-expose secrets to memory store) |

**Known coverage gaps:**
- OpenAI API keys
- Supabase service role keys
- Database connection strings
- Generic bearer tokens
- PEM certificate blocks

---

## 5. GOVERNANCE ENGINE

| Field | Value |
|---|---|
| NAME | Governance Engine |
| TYPE | Audit / Compliance System |
| LOCATION | lib/governance*.js (multiple files) |
| PURPOSE | Manages evidence chains (evidence_blocks), certifications, SLO measurements, policy decisions, incident management, audit snapshots, and dashboard snapshots. |
| OWNER | Governance Subsystem |
| CALLED BY | orchestrator.js, gateway.js, routes/governance.js, governance-probe.js |
| CALLS INTO | lib/clients.js (Supabase), governance-probe.js |
| PRODUCTION STATUS | LIVE |
| RISK | MEDIUM — per-request Supabase client in routes/governance.js is a connection leak risk |
| REMOVAL SAFETY | UNSAFE |

---

## 6. GOVERNANCE PROBE

| Field | Value |
|---|---|
| NAME | Governance Probe |
| TYPE | Automated Health Check |
| LOCATION | governance-probe.js |
| PURPOSE | Runs 10 automated checks against governance subsystem (snapshots, cost accounting, artifacts, certifications, evidence blocks, lesson sources, traceability, incidents, resolutions). Threshold 80%. Current score 100/100. |
| OWNER | Governance Subsystem |
| CALLED BY | server.js (on startup or API trigger), routes/governance.js (/api/governance/probe) |
| CALLS INTO | lib/clients.js (Supabase), lib/governance*.js |
| PRODUCTION STATUS | LIVE |
| RISK | LOW |
| REMOVAL SAFETY | UNSAFE (monitoring dependency) |

**10 Checks:**
1. execution_snapshots — gov.captureSnapshot() writes row
2. cost_accounting_tokens — tokens_in=100 AND tokens_out=50
3. execution_artifacts — gov.recordArtifact() writes row
4. certification_certified — score=1.0 → status='certified'
5. evidence_blocks — appended to 'probe' chain
6. lesson_sources — gov.recordLessonSource() writes row
7. lesson_traceability_bd01 — apex_lessons has task_id AND trace_id matching
8. incident_creation — gov.createIncident() returns id + row exists
9. certification_denied — score=0 → status='denied'
10. incident_resolution — gov.resolveIncident() (SKIP if check 8 failed)

---

## 7. CIVILIZATION RUNTIME

| Field | Value |
|---|---|
| NAME | Civilization Runtime |
| TYPE | Continuous Simulation Loop |
| LOCATION | agent-system/ (civilization modules) |
| PURPOSE | Runs a continuous simulation of "civilization health" — tracks civilization_health_snapshots, executive_decisions, civilizational events, deliberations, votes, strategy plans. |
| OWNER | Civilization Subsystem |
| CALLED BY | routes/civilization.js (on-demand trigger), server.js (on-demand) |
| CALLS INTO | lib/clients.js, lib/governance*.js, Anthropic API |
| PRODUCTION STATUS | LIVE (on-demand, continuous when triggered) |
| RISK | MEDIUM — continuous loop; if it crashes silently, data stops accumulating |
| REMOVAL SAFETY | UNKNOWN |

---

## 8. REALITY LOOP

| Field | Value |
|---|---|
| NAME | Reality Loop |
| TYPE | Periodic Reflection Loop |
| LOCATION | agent-system/ |
| PURPOSE | Every 4 hours, executes a reflection and alignment cycle — assesses current state against founder goals and anti-goals. |
| OWNER | Founder OS / Executive Layer |
| CALLED BY | On-demand trigger or internal timer |
| CALLS INTO | lib/memory/gateway.js, lib/founder/*.js, Anthropic API |
| PRODUCTION STATUS | LIVE (on-demand) |
| RISK | LOW |
| REMOVAL SAFETY | UNKNOWN |

---

## 9. COGNITIVE LAYER

| Field | Value |
|---|---|
| NAME | Cognitive Layer |
| TYPE | Behavioral Modification + Policy Engine |
| LOCATION | routes/cognitive.js, routes/cognitive-evolution.js, lib/cognitive/ |
| PURPOSE | Manages cognitive policy decisions, behavioral modifications, autonomy decisions, digital twin simulations, execution strategy decisions, and intelligence evolution proposals. |
| OWNER | Cognitive Subsystem |
| CALLED BY | orchestrator.js (behavior gate), routes/cognitive.js, routes/cognitive-evolution.js |
| CALLS INTO | lib/clients.js, lib/cognitive/*.js |
| PRODUCTION STATUS | LIVE (with MOUNT BUG on cognitive-evolution.js) |
| RISK | HIGH — cognitive-evolution.js mount bug causes routes to resolve at /api/ not /api/cognitive-evolution/; potential path collision |
| REMOVAL SAFETY | UNSAFE |

**Mount Bug Detail:** routes/cognitive-evolution.js comment says "Mounted at /api/cognitive-evolution" but _loadAgentRoutes mounts all files at /api/. Routes like /attribution/impact resolve to /api/attribution/impact — NOT /api/cognitive-evolution/attribution/impact.

---

## 10. INTELLIGENCE LAYER

| Field | Value |
|---|---|
| NAME | Intelligence Layer |
| TYPE | Knowledge Ingestion + Self-Diagnostics |
| LOCATION | routes/intelligence.js, routes/intelligence-memory.js |
| PURPOSE | News ingestion, knowledge validation, self-check diagnostics (9-subsystem), retrieval policy. Both files mount under /api/intelligence/*. |
| OWNER | Intelligence Subsystem |
| CALLED BY | Cron (news), manual triggers, orchestrator |
| CALLS INTO | lib/clients.js, lib/intelligence/*.js, Anthropic API |
| PRODUCTION STATUS | LIVE |
| RISK | MEDIUM — shared /api/intelligence/* namespace; route conflicts served in load order |
| REMOVAL SAFETY | UNSAFE |

---

## 11. EMPIRE

| Field | Value |
|---|---|
| NAME | Empire |
| TYPE | Business Domain Tracking |
| LOCATION | routes/empire.js (19 routes), lib/empire/ |
| PURPOSE | Tracks empire health scores, empire graph nodes and edges, business metrics. All routes prefixed /api/empire/*. |
| OWNER | Empire Subsystem |
| CALLED BY | Dashboard, manual triggers |
| CALLS INTO | lib/clients.js, lib/empire/*.js |
| PRODUCTION STATUS | LIVE |
| RISK | LOW |
| REMOVAL SAFETY | UNKNOWN |

---

## 12. FOUNDER OS

| Field | Value |
|---|---|
| NAME | Founder OS |
| TYPE | Personal AI Operating Layer |
| LOCATION | routes/founder.js (~30 routes), routes/founder-graph.js (15 routes), lib/founder/ |
| PURPOSE | Manages founder memory (layer 0), goals, anti-goal alerts, alignment log, founder state snapshots, founder knowledge graph (fkg_nodes, fkg_edges). |
| OWNER | Founder OS |
| CALLED BY | Dashboard, orchestrator.js (constitutional gate), reality loop |
| CALLS INTO | lib/clients.js, lib/memory/gateway.js (layer 0), lib/founder/*.js |
| PRODUCTION STATUS | LIVE |
| RISK | HIGH — founder_memory is layer 0 (elevated access); corruption here affects all AI behavior |
| REMOVAL SAFETY | UNSAFE |

---

## 13. EXECUTIVE LAYER

| Field | Value |
|---|---|
| NAME | Executive Layer |
| TYPE | Strategic Decision Management |
| LOCATION | routes/executive-performance.js (11 routes) |
| PURPOSE | Manages executive decisions, deliberations, votes, strategy plans, performance stats, status reports, decision outcomes. |
| OWNER | Civilization / Founder OS |
| CALLED BY | Dashboard, civilization runtime |
| CALLS INTO | lib/clients.js |
| PRODUCTION STATUS | LIVE |
| RISK | LOW |
| REMOVAL SAFETY | UNKNOWN |

---

## 14. EVENT BUS

| Field | Value |
|---|---|
| NAME | Event Bus |
| TYPE | Postgres-Backed Event Spine |
| LOCATION | lib/event-bus.js, migration 024 (events, outbox, consumer_offsets), migration 026 (write_outbox_with_state stored procedure) |
| PURPOSE | Phase 0a event spine — all system events published to outbox table; consumers track offsets in consumer_offsets; stored procedure write_outbox_with_state() provides atomic write. |
| OWNER | Infrastructure |
| CALLED BY | server.js, lib/governance*.js, agent pipeline |
| CALLS INTO | pg Pool (pg_database.js), Supabase JS client |
| PRODUCTION STATUS | LIVE |
| RISK | MEDIUM — Postgres-backed (no Kafka/Redis); high-volume events could cause table bloat |
| REMOVAL SAFETY | UNSAFE |

---

## 15. SUPABASE JS CLIENT

| Field | Value |
|---|---|
| NAME | Supabase JS Client |
| TYPE | Database Client (Singleton) |
| LOCATION | lib/clients.js (canonical singleton) |
| PURPOSE | Primary database access layer for all reads and writes via Supabase JS SDK. createClient() called once; instance shared across all modules. |
| OWNER | Infrastructure |
| CALLED BY | All lib/ modules, all route files, server.js |
| CALLS INTO | Supabase Postgres (external) |
| PRODUCTION STATUS | LIVE |
| RISK | HIGH — 3 confirmed per-request violations (governance.js, integrations.js, server.js inline) create connection leaks |
| REMOVAL SAFETY | UNSAFE |

**Per-Request Violations:**
1. routes/governance.js lines 12-14: `_sb()` creates `createClient()` on every handler call
2. routes/integrations.js line 122-123: `createClient()` inside notion/sync handler
3. server.js: inline `createClient()` inside one route handler

---

## 16. pg POOL (Direct Postgres)

| Field | Value |
|---|---|
| NAME | pg Pool |
| TYPE | Direct Postgres Connection Pool |
| LOCATION | pg_database.js |
| PURPOSE | Direct SQL access to Supabase Postgres via node-postgres (pg). Used for raw queries, stored procedures, and operations that require SQL not available via Supabase JS client. |
| OWNER | Infrastructure |
| CALLED BY | lib/event-bus.js, governance-probe.js, lib/governance*.js, some lib/ modules |
| CALLS INTO | Supabase Postgres (same DB as Supabase JS client) |
| PRODUCTION STATUS | LIVE |
| RISK | MEDIUM — dual access pattern; no transaction coordination with Supabase JS client |
| REMOVAL SAFETY | UNSAFE |

---

## 17. SUPABASE STORAGE

| Field | Value |
|---|---|
| NAME | Supabase Storage |
| TYPE | Object Storage |
| LOCATION | lib/clients.js + routes (storage handlers) |
| PURPOSE | File and document storage. SUPABASE_BUCKET env var configures bucket. Used for apex_documents attachments and other binary storage. |
| OWNER | Infrastructure |
| CALLED BY | routes with document/file upload handlers |
| CALLS INTO | Supabase Storage API (external) |
| PRODUCTION STATUS | LIVE |
| RISK | LOW |
| REMOVAL SAFETY | UNKNOWN |

---

## 18. OBSIDIAN INTEGRATION

| Field | Value |
|---|---|
| NAME | Obsidian Integration |
| TYPE | External Knowledge Base Bridge |
| LOCATION | obsidian-memory.js |
| PURPOSE | logLesson() calls gateway.storeMemory(layer:10) which calls _storeLesson() for apex_lessons. Bridge between APEX AI OS and local Obsidian vault. |
| OWNER | Memory Subsystem |
| CALLED BY | orchestrator.js REFLECTOR stage, server.js |
| CALLS INTO | lib/memory/gateway.js (layer 10), OBSIDIAN_URL API |
| PRODUCTION STATUS | LIVE |
| RISK | MEDIUM — double-write risk if legacy direct-insert code paths to apex_lessons remain active |
| REMOVAL SAFETY | UNKNOWN |

---

## 19. SLACK INTEGRATION

| Field | Value |
|---|---|
| NAME | Slack Integration |
| TYPE | Notification Delivery |
| LOCATION | services/slack/ |
| PURPOSE | Sends notifications and alerts to Slack channels via Slack Bot Token. |
| OWNER | Communications Subsystem |
| CALLED BY | routes/communications.js, orchestrator.js (post-run), lib/governance*.js (incident alerts) |
| CALLS INTO | Slack API (external), requires SLACK_BOT_TOKEN |
| PRODUCTION STATUS | UNKNOWN (requires env var) |
| RISK | LOW |
| REMOVAL SAFETY | SAFE (if not actively used) |

---

## 20. NOTION INTEGRATION

| Field | Value |
|---|---|
| NAME | Notion Integration |
| TYPE | External Project/Contact Sync |
| LOCATION | services/notion/ |
| PURPOSE | Syncs apex_clients, apex_projects, apex_contacts, apex_sync_checkpoints with Notion databases. |
| OWNER | Integration Layer |
| CALLED BY | routes/integrations.js |
| CALLS INTO | Notion API (external), requires NOTION_API_KEY |
| PRODUCTION STATUS | UNKNOWN (requires env var; per-request client bug in routes/integrations.js line 122-123) |
| RISK | MEDIUM — per-request Supabase client in handler |
| REMOVAL SAFETY | SAFE (if not actively used) |

---

## 21. VOICE PIPELINE

| Field | Value |
|---|---|
| NAME | Voice Pipeline |
| TYPE | Real-Time Voice Interface |
| LOCATION | routes/gemini-live.js, routes/tts-gemini.js, lib/latency-tracker.js |
| PURPOSE | Real-time voice via Gemini Live WebSocket + Gemini TTS. Latency tracked per session via lib/latency-tracker.js. |
| OWNER | Voice Subsystem |
| CALLED BY | Dashboard (voice mode), external WebSocket clients |
| CALLS INTO | Google Gemini API (requires GOOGLE_API_KEY), lib/latency-tracker.js |
| PRODUCTION STATUS | LIVE |
| RISK | MEDIUM — WebSocket connection management; latency tracking for SLO |
| REMOVAL SAFETY | UNKNOWN |

---

## 22. MASTRA INTEGRATION

| Field | Value |
|---|---|
| NAME | Mastra Integration |
| TYPE | AI Agent Framework Integration |
| LOCATION | lib/mastra*.js (inferred) |
| PURPOSE | Mastra framework integration for agentic workflows. Initialized via 5-minute deferred setTimeout on server startup. |
| OWNER | Agent System |
| CALLED BY | server.js (deferred init) |
| CALLS INTO | Mastra framework (external package) |
| PRODUCTION STATUS | UNKNOWN — deferred init means it may never complete if Render spins down before 5 minutes |
| RISK | UNKNOWN |
| REMOVAL SAFETY | UNKNOWN |

---

## 23. LANGCHAIN / RAG

| Field | Value |
|---|---|
| NAME | LangChain RAG |
| TYPE | Retrieval-Augmented Generation |
| LOCATION | agent-system/langchain-rag.js |
| PURPOSE | LangChain-based RAG pipeline for voice-chat memory retrieval. Lazy-loaded; only active if voice-chat feature is used. |
| OWNER | Voice / Intelligence |
| CALLED BY | Voice chat handlers |
| CALLS INTO | LangChain packages (external), lib/memory/*.js, Anthropic API |
| PRODUCTION STATUS | UNKNOWN (lazy-loaded) |
| RISK | LOW |
| REMOVAL SAFETY | UNKNOWN |

---

## 24. PLAYWRIGHT BROWSER AUTOMATION

| Field | Value |
|---|---|
| NAME | Playwright Integration |
| TYPE | Browser Automation |
| LOCATION | lib/ (browser*.js inferred) |
| PURPOSE | Browser automation for web scraping and research. Used by RESEARCHER stage in agent pipeline (/api/browser/* endpoints). |
| OWNER | Agent System (RESEARCHER stage) |
| CALLED BY | orchestrator.js RESEARCHER stage (fallback from Firecrawl), /api/browser/* routes |
| CALLS INTO | Playwright (external package), web (external) |
| PRODUCTION STATUS | UNKNOWN (lazy-loaded) |
| RISK | MEDIUM — Playwright on Render may require additional binary setup |
| REMOVAL SAFETY | UNKNOWN |

---

## 25. AUTH SYSTEM

| Field | Value |
|---|---|
| NAME | Auth System |
| TYPE | Multi-Layer Authentication + Authorization |
| LOCATION | lib/app-auth.js (canonical), server.js lines 827-835 (duplicate inline) |
| PURPOSE | 3 auth handlers: requireAuth (JWT/API key on all /api/*), requireAppAccess (APP_ACCESS_KEY for specific routes), requireCronAccess (CRON_SECRET for cron endpoints). |
| OWNER | Security / Infrastructure |
| CALLED BY | All route files (requireAuth applied globally), specific routes (requireAppAccess), cron routes (requireCronAccess) |
| CALLS INTO | jsonwebtoken, crypto.timingSafeEqual |
| PRODUCTION STATUS | LIVE |
| RISK | HIGH — login password comparison uses !== (not timingSafeEqual); duplicate implementation risk; BYPASS_DASHBOARD_AUTH env var is a live bypass |
| REMOVAL SAFETY | UNSAFE |

---

## 26. TASK ROUTER

| Field | Value |
|---|---|
| NAME | Task Router |
| TYPE | Agent Dispatch Entry Point |
| LOCATION | runtime/task-router.js |
| PURPOSE | Routes incoming task requests to the appropriate agent orchestrator invocation. |
| OWNER | Agent System |
| CALLED BY | routes/agents.js, server.js |
| CALLS INTO | agent-system/orchestrator.js |
| PRODUCTION STATUS | LIVE |
| RISK | LOW |
| REMOVAL SAFETY | UNSAFE (dispatch chain dependency) |

---

## RISK SUMMARY TABLE

| Subsystem | Risk Level |
|---|---|
| HTTP Server / Monolith | CRITICAL |
| Auth System | HIGH |
| Memory Gateway | HIGH |
| Memory Sanitizer | HIGH (coverage gaps) |
| Agent Orchestrator | HIGH |
| Founder OS | HIGH |
| Cognitive Layer | HIGH (mount bug) |
| Supabase JS Client | HIGH (3 violations) |
| Governance Engine | MEDIUM |
| Intelligence Layer | MEDIUM |
| Event Bus | MEDIUM |
| pg Pool | MEDIUM |
| Voice Pipeline | MEDIUM |
| Obsidian Integration | MEDIUM |
| Notion Integration | MEDIUM |
| Playwright Integration | MEDIUM |
| Civilization Runtime | MEDIUM |
| Governance Probe | LOW |
| Empire | LOW |
| Executive Layer | LOW |
| Supabase Storage | LOW |
| Slack Integration | LOW |
| LangChain / RAG | LOW |
| Reality Loop | LOW |
| Task Router | LOW |
| Mastra Integration | UNKNOWN |
