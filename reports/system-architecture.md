# System Architecture — Phase 1
*Built from code inspection, 2026-06-05*

---

## Component Graph

```
┌─────────────────────────────────────────────────────────┐
│                    APEX AI OS                           │
│                  Render (Node.js)                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ server.js│  │dashboard │  │  Electron (local)    │  │
│  │ (11,554L)│  │  .html   │  │  apex-electron.js    │  │
│  └────┬─────┘  └──────────┘  └──────────────────────┘  │
│       │                                                  │
│  ┌────▼──────────────────────────────────────────────┐  │
│  │              Routes Layer (86 endpoints)          │  │
│  │  agents  communications  finance  health  life    │  │
│  │  operations  intelligence  integrations           │  │
│  │  gemini-live (WS)  tts-gemini                    │  │
│  └────┬──────────────────────────────────────────────┘  │
│       │                                                  │
│  ┌────▼──────────────────────────────────────────────┐  │
│  │              Services Layer                       │  │
│  │  Notion ──── notion-client (rate-limit + retry)   │  │
│  │           ├─ notion-tasks                         │  │
│  │           ├─ notion-projects                      │  │
│  │           ├─ notion-clients                       │  │
│  │           └─ notion-sync                          │  │
│  │  Slack ───── slack-client (dedup + masking)       │  │
│  │           ├─ slack-agents (thread tracking)       │  │
│  │           ├─ slack-alerts (severity routing)      │  │
│  │           ├─ slack-briefings                      │  │
│  │           └─ slack-system-health                  │  │
│  │  Pipelines ─ lead-pipeline                        │  │
│  │           ├─ daily-briefing-pipeline              │  │
│  │           └─ weekly-review-pipeline               │  │
│  │  Sync ──────supabase-notion-sync (checkpoint)     │  │
│  └────┬──────────────────────────────────────────────┘  │
│       │                                                  │
│  ┌────▼──────────────────────────────────────────────┐  │
│  │              Agent System                         │  │
│  │  orchestrator.js (8-agent pipeline, $2 cap)       │  │
│  │  master-orchestrator.js (16 QA/release helpers)   │  │
│  │  domain-agents.js (chat domain routing)           │  │
│  │  agent-library.js (218 external agents)           │  │
│  │  langchain-rag.js (BM25, vault-indexed)           │  │
│  │  obsidian-memory.js (lesson buffer)               │  │
│  │  browser-agent.js (Playwright, allowlisted)       │  │
│  │  firecrawl-bridge.js (scrape/search/crawl)        │  │
│  │  mastra_agents.js (5 agents, 5-min deferred)      │  │
│  └────┬──────────────────────────────────────────────┘  │
│       │                                                  │
│  ┌────▼──────────────────────────────────────────────┐  │
│  │              Infrastructure (lib/)                │  │
│  │  event-bus  agent-queue  session-state-registry   │  │
│  │  latency-tracker  cognitive-orchestrator          │  │
│  │  clients (Anthropic + Supabase singletons)        │  │
│  │  app-auth (timing-safe, fails closed)             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flows

### Voice / Chat Flow
```
User audio → Gemini 2.5 WebSocket → STT → message text
  → detectDomain() → _DOMAIN_AGENTS[slug] (specialist system prompt)
  → complexity check (≤5 trivial words → Haiku, else Sonnet)
  → Claude agentic tool-use loop (max 8 iterations)
  → APEX_TOOLS (calendar, finance, memory, browser, etc.)
  → TTS → audio stream → user
  → event-bus emit AGENT_COMPLETED
  → services/init.js listener → Slack notify + Notion log
```

### Task Pipeline Flow
```
POST /api/tasks/run (or apex_tasks Supabase row inserted)
  → checkPendingMasterTasks() (polls every 60s)
  → orchestrator.js runAgentTeam(spec)
    → RESEARCHER (optional, if research keywords)
    → ARCHITECT → DEVELOPER (per-file, up to Opus)
    → REVIEWER → VALIDATOR → TESTER (node --check)
    → COMMITTER (git worktree → merge → Render deploy)
    → REFLECTOR (lesson → Obsidian)
  → event-bus AGENT_COMPLETED → Slack thread + Notion Agent Runs
```

### Lead Flow
```
POST /api/leads/inbound
  → lead-pipeline.js processInboundLead()
  → Slack #apex-alerts (new lead notification)
  → notion-clients.js createLeadFromInbound()
  → notion-projects.js createFromFeatureRequest()
  → Slack #apex-projects (project created)
```

### Cron / Sync Flows
```
07:00 daily → _scheduleDailyBriefing()
  → obsidian-memory.js → Claude Haiku → write 13 Briefings/Daily/{date}.md
  → Slack #apex-executive

Sundays 08:00 → _scheduleWeeklyReview()
  → Supabase aggregation (tasks, agent runs, finance, workouts)
  → Claude Haiku synthesis → write 13 Briefings/Weekly/
  → Slack #apex-weekly-review

Every 6h → services/init.js sync job
  → supabase-notion-sync.js runFullSync()
  → apex_agent_runs → Notion Agent Runs DB (checkpoint-based)

Every 6h → services/init.js health job
  → slack-system-health.js runHealthCheck()
  → Slack #apex-system-health
```

---

## Startup Sequence

```
1. Load env, validate, setup error handlers (lines 1-80)
2. Init Supabase admin client, Anthropic client (line 116)
3. Start agent systems (email, routine, reflection, finance agents) (lines 165-171)
4. server.listen() callback:
   a. Ensure workspace directory
   b. Defer Mastra 5 min (line 11199)
   c. Load agent library from Supabase (line 11210)
   d. services/init.js: validate Notion/Slack, wire event bus, start cron (line 11233)
   e. Run pgvector + schema migrations (line 11237)
   f. Schedule memory health log every 5 min (line 11287)
   g. Schedule notification purge every 6h (line 11292)
   h. checkPendingMasterTasks() 30s after start (line 11302)
   i. autoApproveStandardPermissions() 15s after start (line 11304)
   j. Register all 14 cron jobs (lines 11318-11493)
   k. Attach Gemini WebSocket (line 11193)
```

---

## Integration Points

| System | Protocol | Auth | Retry |
|---|---|---|---|
| Supabase | JS SDK + node-pg | service_role JWT | SDK built-in |
| Anthropic (Claude) | HTTPS SDK | API key | SDK built-in + circuit breaker |
| Gemini 2.5 | WebSocket | API key | Reconnect on error |
| Notion | HTTPS SDK | Integration token | Custom (3 req/s queue, 3 retries) |
| Slack | HTTPS | Bot token | Custom (4 retries, 429-aware) |
| Gmail | OAuth2 | Refresh token | googleapis SDK |
| Firecrawl | HTTPS | API key | SDK built-in |
| Playwright | Local | N/A | Domain allowlist |
| Obsidian | REST tunnel | API key | None (non-fatal) |
| GitHub | HTTPS | PAT | None |
| Render API | HTTPS | API key | None |
| OpenRouter | HTTPS | API key | None |

---

## Failure Points

| Point | Failure Mode | Recovery |
|---|---|---|
| Anthropic API down | Circuit breaker opens after 5 failures | Exponential cooldown, retries |
| Notion API 429 | Rate-limit queue stalls | 3 retries with backoff |
| Slack 429 | Retry with backoff | 4 retries |
| Render cold start | 5+ min for Mastra | Graceful fallback to default Claude |
| Obsidian tunnel down | Briefings/wiki writes fail | console.warn — non-fatal |
| Supabase outage | All agent tasks fail | No fallback — critical dependency |
| Gmail OAuth expiry | Email queue stalls | Manual token refresh via get_gmail_token.js |
| Git worktree orphan | Disk pressure on Render | Cleanup code in orchestrator.js |
