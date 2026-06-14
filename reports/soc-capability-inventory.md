# SOC Phase 1 — Capability Inventory
_Generated: 2026-06-08 | Commit: b8ccb56 | Build: Render srv-d7idj1gsfn5c738hpsc0_

---

## Methodology
Derived from static analysis of server.js (12,260 lines), routes/, agent-system/, services/, lib/, and .env.example. Each capability traced to its entry point, dependency chain, persistence layer, external call, and success criterion.

---

## Capability 1 — Voice Interaction (Primary Interface)

| Field | Value |
|---|---|
| Entry point | `GET /ws/gemini-live` (WebSocket upgrade) |
| Dependencies | Gemini 2.5 Live API, `routes/gemini-live.js`, `buildAlexContext()`, Obsidian vault |
| Persistence | Conversation turns → PCM (in-memory + `lib/persistent-cognition-manager.js`); voice facts → Supabase `memory` table; optional vault append |
| External services | `GOOGLE_API_KEY` (Gemini Live + TTS), Supabase |
| Success criteria | User utterance → STT → Claude/Gemini routing → TTS audio back to browser |
| Voice provider | Gemini 2.5 Flash (Orus voice) — no fallback TTS |

**Sub-capabilities:**
- `/api/speak` — single-shot TTS (POST)
- `/api/tts` — alias endpoint
- `/api/transcribe` — audio → text (Gemini 2.0 Flash multimodal)
- `/api/voice-chat` — text-in/audio-out shortcut

---

## Capability 2 — AI Agent Pipeline (8-stage autonomous coding)

| Field | Value |
|---|---|
| Entry point | `POST /api/master/run` or `POST /api/orchestrate` |
| Dependencies | `agent-system/orchestrator.js` (64.8KB), `master-orchestrator.js` (47.8KB), GITHUB_TOKEN, git worktree, Render API |
| Persistence | `apex_agent_runs` (Supabase), `apex_agent_stages`, Obsidian Lessons.md, `adaptation-registry.json` |
| External services | Anthropic Claude API, GitHub API, Render Deploy API |
| Success criteria | Feature request → ARCHITECT plan → DEVELOPER code → REVIEWER pass → TESTER pass → COMMITTER push → Render deploy → REFLECTOR lesson |

**Agents:** RESEARCHER (optional) → ARCHITECT → DEVELOPER → REVIEWER → SECURITY → VALIDATOR → TESTER → COMMITTER → REFLECTOR (async)

**Model routing:** simple→HAIKU, moderate→HAIKU+SONNET, complex→SONNET, critical→SONNET+OPUS

**Cost cap:** $2.00/run hard limit

---

## Capability 3 — Dashboard (Operator Interface)

| Field | Value |
|---|---|
| Entry point | `GET /` → `dashboard.html` (798KB SPA) |
| Dependencies | JWT cookie auth (`DASHBOARD_PASSWORD`), `APP_ACCESS_KEY` localStorage |
| Persistence | Reads from all Supabase tables; writes via API calls |
| External services | None (served static) |
| Success criteria | Page loads, auth passes, all data panels render |

**Pages:** Command, Tasks, Health, Finance, Life, Notifications, System

---

## Capability 4 — Daily Briefing (Automated)

| Field | Value |
|---|---|
| Entry point | `setTimeout` → 7am daily cron |
| Dependencies | `obsidian-memory.js`, `obsidian-client.js`, Slack briefings service |
| Persistence | `13 Briefings/Daily/{date}.md` in vault |
| External services | Obsidian tunnel (OBSIDIAN_URL), Slack webhook |
| Success criteria | Markdown briefing written to vault + Slack post |

---

## Capability 5 — Weekly Review (Automated)

| Field | Value |
|---|---|
| Entry point | Sundays 8am cron |
| Dependencies | Supabase (`apex_tasks`, `apex_agent_runs`, `apex_transactions`, `apex_workouts`), Anthropic Haiku, obsidian-client, Slack |
| Persistence | `13 Briefings/Weekly/Weekly-Review-{date}.md` |
| External services | Anthropic API, Slack, Obsidian tunnel |
| Success criteria | Claude-generated markdown weekly review in vault + Slack post |

---

## Capability 6 — Gmail Integration

| Field | Value |
|---|---|
| Entry point | `GET /api/emails`, `POST /api/emails/send`, `GET /auth/gmail/reauthorise` |
| Dependencies | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, googleapis |
| Persistence | `email_queue` Supabase table |
| External services | Gmail OAuth2 |
| Success criteria | Read + send Gmail emails |
| **STATUS** | **BROKEN** — refresh token expired 2026-05-21; requires local interactive OAuth re-init |

---

## Capability 7 — Slack Notifications

| Field | Value |
|---|---|
| Entry point | `services/slack/` (alerts, agents, briefings, system-health) |
| Dependencies | `SLACK_BOT_TOKEN`, dedup (24h window), retry |
| Persistence | None (fire-and-forget with dedup) |
| External services | Slack API |
| Success criteria | Alert/notification → Slack channel post |

---

## Capability 8 — Notion Workspace Sync

| Field | Value |
|---|---|
| Entry point | `services/notion/` (tasks, projects, clients, sync) |
| Dependencies | `NOTION_API_KEY`, `@notionhq/client`, 3 req/s rate limiter |
| Persistence | 10 Notion databases (Tasks, Projects, Clients, Meetings, Content Pipeline, Knowledge Requests, Agent Runs, SOP Executions, Decisions, Goals/OKRs) |
| External services | Notion API |
| Success criteria | Agent runs, tasks, decisions mirrored to Notion |

---

## Capability 9 — RAG / Knowledge Retrieval

| Field | Value |
|---|---|
| Entry point | `POST /api/intelligence/query` or internal via `langchain-rag.js` |
| Dependencies | `langchain-rag.js`, `lib/embed.js`, Supabase `vault_embeddings` (pgvector 768-dim), Obsidian vault |
| Persistence | `vault_embeddings` (Supabase), local `memory-index.json` (capped 500 ep + 100 lessons) |
| External services | VOYAGE_API_KEY (primary embeddings) or GOOGLE_API_KEY (Gemini fallback) |
| Success criteria | Query → hybrid BM25+pgvector retrieval → ranked context |
| Notes | Falls back to BM25-only if no embedding API key; re-indexes every 30 minutes |

---

## Capability 10 — Self-Improvement / Cognition Layer

| Field | Value |
|---|---|
| Entry point | Sunday 1am cron → `adaptation-engine.js`; also triggered per pipeline run |
| Dependencies | `agent-system/`: adaptation-engine, autonomy-metrics, episodic-memory, reflection-engine, self-evaluator, dynamic-agent-selector, goal-tracker |
| Persistence | `adaptation-registry.json` (vault), `System/Goals/goal-*.json`, `12 Memory/Episodes/ep-*.json`, `apex_lessons` (Supabase) |
| External services | Supabase (apex_agent_runs stats) |
| Success criteria | runCycle() produces adaptations with confidence ≥ 0.25; autonomy score ≥ 4.5 enables unsupervised mode |
| **STATUS** | **PRE-OPERATIONAL** — 0 real pipeline runs recorded; all 6 autonomy dimensions at defaults; score 4.31 (synthetic data) |

---

## Capability 11 — Finance / Health / Life Tracking

| Field | Value |
|---|---|
| Entry point | `routes/finance.js`, `routes/health.js`, `routes/life.js` |
| Dependencies | Supabase tables: `apex_transactions`, `apex_workouts`, `apex_nutrition_log`, `apex_habits` |
| Persistence | Supabase |
| External services | None |
| Success criteria | CRUD operations on personal data tables |

---

## Capability 12 — Calendar Sync

| Field | Value |
|---|---|
| Entry point | Every 30 min cron (`doSync`) |
| Dependencies | `routes/communications.js`, Google Calendar API, 15s timeout |
| Persistence | Supabase calendar table |
| External services | Google Calendar (GOOGLE_API_KEY) |
| Success criteria | Calendar events synced to local DB |

---

## Capability 13 — Vault / Obsidian Knowledge Graph

| Field | Value |
|---|---|
| Entry point | `agent-system/obsidian-client.js`, `obsidian-memory.js` |
| Dependencies | Cloudflare tunnel → OBSIDIAN_URL, local vault at `C:\Users\arwwo\Desktop\AI Scripts\APEX AI OS` |
| Persistence | Obsidian vault on persistent disk AND local Windows machine |
| External services | Cloudflare tunnel (local machine must be running) |
| Success criteria | Read/write vault notes; 5s AbortController timeout → filesystem fallback |
| **Risk** | Tunnel is local-machine-dependent — vault reads fail if machine sleeps/restarts |

---

## Capability 14 — Browser Automation (Playwright)

| Field | Value |
|---|---|
| Entry point | `agent-system/browser-agent.js` (51.4KB, 14 capabilities) |
| Dependencies | Playwright Chromium |
| Persistence | None (stateless screenshots/scrapes) |
| External services | Any URL |
| Success criteria | Headless browser tasks complete without hang |

---

## Capability 15 — Agent Schedules

| Field | Value |
|---|---|
| Entry point | `agent_schedules` Supabase table; checked via `checkPendingMasterTasks()` every 60s |
| Dependencies | Master orchestrator, approval flow |
| Persistence | `agent_tasks` Supabase table |
| External services | Anthropic API (planning) |
| Success criteria | Scheduled goal → task created → pipeline runs at scheduled time |

---

## Summary Table

| # | Capability | Status | Critical Dependency |
|---|---|---|---|
| 1 | Voice Interaction | OPERATIONAL | GOOGLE_API_KEY credits |
| 2 | AI Agent Pipeline | OPERATIONAL (0 runs) | GITHUB_TOKEN, Render API |
| 3 | Dashboard | OPERATIONAL | JWT auth cookie |
| 4 | Daily Briefing | OPERATIONAL | Obsidian tunnel |
| 5 | Weekly Review | OPERATIONAL | Anthropic API |
| 6 | Gmail | BROKEN | Expired OAuth token |
| 7 | Slack | OPERATIONAL | SLACK_BOT_TOKEN |
| 8 | Notion | OPERATIONAL | NOTION_API_KEY |
| 9 | RAG / Knowledge | DEGRADED (BM25-only risk) | VOYAGE_API_KEY |
| 10 | Self-Improvement | PRE-OPERATIONAL | Real pipeline runs |
| 11 | Finance/Health/Life | OPERATIONAL | Supabase |
| 12 | Calendar Sync | OPERATIONAL | GOOGLE_API_KEY |
| 13 | Vault / Obsidian | PARTIAL | Local tunnel availability |
| 14 | Browser Automation | OPERATIONAL | Playwright |
| 15 | Agent Schedules | OPERATIONAL | Anthropic + Render |
