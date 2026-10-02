# Apex AI OS — System Self-Knowledge

## Identity

Apex is Alex's personal AI operating system. It runs as a Node.js/Express server on Render (ai-os-server-jx20.onrender.com), backed by Supabase Postgres and the Claude API. It is voice-first, memory-persistent, and autonomously self-improving through an 8-agent code pipeline.

---

## Architecture

- **Runtime**: Node.js + Express, deployed on Render (512MB RAM, Starter plan)
- **Database**: Supabase Postgres — stores memory, tasks, health, finance, calendar, and pipeline audit data
- **AI**: Claude API (Haiku for fast tasks, Sonnet for balanced, Opus for critical)
- **Voice**: Google Gemini Live API for real-time voice, ElevenLabs for TTS, Deepgram for STT
- **Frontend**: dashboard.html — single-page PWA served from /
- **Memory**: Multi-layer gateway (episodic, semantic, procedural, working, long-term) + Obsidian vault via REST tunnel

---

## Agent Pipeline (8-stage autonomous code execution)

When a task is queued via `/api/tasks/add` + `/api/tasks/run`, the following agents execute in sequence:

| Stage | Role | Model |
|-------|------|-------|
| RESEARCHER | Gathers context, existing code patterns | Sonnet |
| ARCHITECT | Produces a structured JSON spec (objective, filesToModify, testCases) | Sonnet/Opus |
| DEVELOPER | Writes the actual code changes to a git worktree | Sonnet/Opus |
| REVIEWER | Security + correctness review (OWASP, STRIDE, spec compliance) | Haiku/Sonnet |
| VALIDATOR | Verifies implementation satisfies the spec's test cases | Haiku/Sonnet |
| TESTER | Syntax-checks JS/JSON files | N/A (local) |
| COMMITTER | git commit → merge → push to GitHub → trigger Render deploy | N/A (git) |
| REFLECTOR | Writes a lesson learned to long-term memory | Haiku |

Pipeline success rate: ~69% (30-day window, 85 runs). Each run uses a git worktree for isolation. Max 3 retry attempts per pipeline run.

---

## Domain Agents (Mastra-based)

| Agent | Handles |
|-------|---------|
| apexAgent | General assistant, orchestration, routing |
| emailAgent | Gmail read/send/draft via OAuth |
| financeAgent | Expense logging, budgets, transactions |
| routineAgent | Daily habits, schedules, reminders |
| researchAgent | Web search, summarisation, fact-finding |

---

## API Routes (all under /api)

### Health & Fitness
- `GET /health/workouts` — workout log (last 91 days)
- `POST /health/workouts` — log a workout
- `GET /health/nutrition` — today's nutrition totals
- `POST /health/nutrition` — log a meal
- `GET /health/sleep` — sleep log (last 7 days)
- `POST /health/sleep` — log sleep (upserts by date)
- `GET/POST /mood` — mood score (1-10, upserts by date)
- `GET /health/metrics` — body measurements
- `GET/POST /health/supplements` — supplement tracking

### Finance
- `GET /finance/balance` — current balance
- `GET /finance/transactions` — recent transactions
- `POST /finance/log-expense` — log expense or income
- `GET /finance/budget` — monthly budget by category
- `POST /finance/set-budget` — set category budget

### Life & Learning
- `GET /life/university/flashcards` — due flashcards (spaced repetition)
- `POST /life/university/flashcards` — create flashcard
- `POST /life/university/flashcards/:id/review` — review with ease rating (1=again/+1d, 2=good/+3d, 3=easy/+7d)
- `GET /life/goals` — active goals
- `POST /life/goals` — create goal

### Intelligence & Self-Monitoring
- `GET /intelligence/system-status` — full system health snapshot
- `GET /intelligence/agent-performance` — pipeline stage success rates, top errors
- `GET /intelligence/agent-runs` — recent pipeline run history
- `GET /intelligence/cost-summary` — API cost breakdown by complexity
- `GET /intelligence/lessons` — lessons learned from past runs
- `GET /intelligence/news` — AI/tech news feed
- `POST /intelligence/news/refresh` — refresh news
- `GET /intelligence/voice-status` — voice session state
- `GET /intelligence/self-check` — system connectivity check (Obsidian, Supabase, Anthropic)
- `GET /intelligence/performance` — latency percentiles, session metrics
- `GET /intelligence/agent-performance` — per-stage pipeline metrics

### Tasks & Pipeline
- `GET /api/tasks` — list all tasks (pending/in_progress/completed/failed)
- `POST /api/tasks/add` — create a new task `{ title }`
- `POST /api/tasks/run` — run a task `{ taskId, force? }` — returns 409 if already running/completed
- `POST /api/tasks/notify` — push a notification

### Operations
- `GET /healthz` — Kubernetes liveness probe
- `GET /status` — service name, version, uptime
- `GET /ping` — lightweight health check
- `GET /version` — Node.js + app version
- `GET /metrics` — request counter
- `GET /memory-stats` — heap usage
- `GET /info` — platform, node version

### Communications
- `GET /communications/emails` — recent emails
- `POST /communications/send-email` — send email

### Governance & Autonomy
- `GET /governance/level` — current autonomy level (1-5)
- `POST /governance/level` — set autonomy level

---

## Memory System

The memory gateway (lib/memory/gateway.js) routes writes to different layers:

| Layer | Type | Purpose |
|-------|------|---------|
| 0 | Working | Current session context |
| 2 | Episodic | Conversation exchanges |
| 3 | Procedural | How-to knowledge, learned processes |
| 5 | Declarative | Facts about the world |
| 7 | Semantic | Concepts and relationships |
| 8 | Founder | Alex's personal profile, values, traits |
| 9 | Semantic cache | Pattern-based semantic cache |
| 10 | Long-term | Lessons, durable knowledge |
| 11 | Importance-scored | Auto-tiered by importance engine |

RAG retrieval: BM25 (local) + pgvector (Supabase vault_embeddings). Hybrid when embeddings available.

---

## Model Tiers

| Complexity | Architect | Developer | Reviewer | Validator |
|------------|-----------|-----------|----------|-----------|
| simple | Haiku | Haiku | Haiku | Haiku |
| moderate | Sonnet | Sonnet | Haiku | Haiku |
| complex | Sonnet | Sonnet | Sonnet | Haiku |
| critical | Opus | Opus | Opus | Sonnet |

---

## Key Environment Variables

- `ANTHROPIC_API_KEY` — Claude API
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — database
- `OBSIDIAN_URL` + `OBSIDIAN_API_KEY` — vault tunnel (Cloudflare)
- `GITHUB_TOKEN` — pipeline git push
- `ELEVENLABS_API_KEY` — TTS voice synthesis
- `DEEPGRAM_API_KEY` — STT transcription
- `APP_ACCESS_KEY` — API authentication header `x-app-key`
- `AUTONOMY_LEVEL` — pipeline autonomy (1-5, default 1)

---

## Current System Health (as of 2026-06-21)

- Status: integrated
- Pipeline overall: 69% success rate (85 runs, 30 days)
- ARCHITECT/TESTER/DEVELOPER: 98-100%
- REVIEWER: 74% (maxTokens raised to 800 to reduce JSON truncation)
- VALIDATOR: 67% (code snapshot raised to 6000 chars, maxTokens to 600)
- COMMITTER: 86% (no-op tasks now soft-pass; real failures reported)
- Memory: tunnel mode (Obsidian via REST API, not local filesystem)
- RAG: BM25 active with 3 chunks; vector embeddings pending local seed
