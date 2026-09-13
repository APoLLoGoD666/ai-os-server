# DEPENDENCY ATLAS
## Document 9 of 17 — External and Internal Dependencies
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## EXTERNAL PRODUCTION DEPENDENCIES

| Package | Purpose | Criticality | Notes |
|---|---|---|---|
| `@anthropic-ai/sdk` | Claude AI API client | CRITICAL | Primary intelligence provider |
| `@supabase/supabase-js` | Supabase database + storage client | CRITICAL | All reads/writes via this client |
| `express` (v5.x) | HTTP framework | CRITICAL | Application server |
| `ws` | WebSocket server | HIGH | Gemini Live voice WebSocket |
| `pg` | Direct PostgreSQL client | HIGH | pg Pool in pg_database.js |
| `zod` | Schema validation | HIGH | ARCHITECT stage plan validation |
| `jsonwebtoken` | JWT creation + verification | HIGH | requireAuth JWT cookie |
| `@sentry/node` | Error tracking + APM | HIGH | Production error monitoring |
| `node-cron` | Cron scheduler | HIGH | Cognitive crons, schedule runner |
| `googleapis` | Google APIs (Gmail, Drive, etc.) | MEDIUM | Gmail client, Google auth |
| `@google/generative-ai` | Google Gemini AI | MEDIUM | Voice pipeline (gemini-live, tts) |
| `langchain` | LangChain framework | MEDIUM | RAG pipeline (lazy-loaded) |
| `@langchain/anthropic` | LangChain Anthropic adapter | MEDIUM | LangChain Claude integration |
| `@langchain/community` | LangChain community tools | MEDIUM | Extended LangChain tools |
| `mastra` | Mastra AI agent framework | UNKNOWN | 5-min deferred init; uncertain usage |
| `@firecrawl/firecrawl` or `firecrawl` | Web scraping | MEDIUM | RESEARCHER stage primary tool |
| `playwright` | Browser automation | MEDIUM | RESEARCHER stage fallback |
| `notion-client` or `@notionhq/client` | Notion API | LOW | Notion sync integration |
| `@slack/bolt` or `@slack/web-api` | Slack API | LOW | Notification delivery |
| `@octokit/rest` or `octokit` | GitHub API | LOW | GitHub integration |
| `crypto` | Node.js built-in | HIGH | timingSafeEqual for auth |
| `cookie-parser` | Cookie parsing middleware | HIGH | JWT cookie extraction |
| `cors` | CORS middleware | HIGH | Cross-origin request handling |
| `multer` | File upload handling | MEDIUM | Document upload |
| `uuid` | UUID generation | HIGH | All record IDs |
| `dotenv` | Environment variable loading | HIGH | .env file loading (dev) |
| `helmet` | HTTP security headers | MEDIUM | Security middleware (if included) |

**Note:** Exact package versions not confirmed from census evidence. Version details require package.json inspection.

---

## INTERNAL MODULE DEPENDENCY GRAPH

### server.js (Entry Point) — Depends On:

```
server.js
    ├─→ lib/clients.js                    (Supabase + Anthropic clients)
    ├─→ lib/app-auth.js                   (requireAuth, requireAppAccess)
    ├─→ lib/governance*.js                (governance functions)
    ├─→ lib/event-bus.js                  (event publishing)
    ├─→ lib/agent-queue.js                (task queue)
    ├─→ lib/counter.js                    (request counter)
    ├─→ obsidian-memory.js                (lesson logging)
    ├─→ governance-probe.js               (probe runner)
    ├─→ pg_database.js                    (pg Pool)
    ├─→ runtime/task-router.js            (task dispatch)
    └─→ routes/* (all 23 files)           (_loadAgentRoutes auto-load)
```

### agent-system/orchestrator.js — Depends On:

```
orchestrator.js
    ├─→ agent-system/pipeline/researcher.js
    ├─→ agent-system/pipeline/architect.js
    ├─→ agent-system/pipeline/developer.js
    ├─→ agent-system/pipeline/reviewer.js
    ├─→ agent-system/pipeline/validator.js
    ├─→ agent-system/pipeline/tester.js
    ├─→ agent-system/pipeline/committer.js
    ├─→ agent-system/reputation.js
    ├─→ agent-system/dynamic-agent-selector.js
    ├─→ agent-system/execution-verifier.js
    ├─→ agent-system/adaptation.js
    ├─→ agent-system/agent-pipeline-hooks.js
    ├─→ lib/memory/gateway.js             (memory reads/writes)
    ├─→ lib/governance*.js                (cost accounting, evidence, audit)
    ├─→ lib/clients.js                    (Supabase for direct reads)
    ├─→ Anthropic API (via @anthropic-ai/sdk)
    └─→ obsidian-memory.js               (REFLECTOR lesson write)
```

### lib/memory/gateway.js — Depends On:

```
gateway.js
    ├─→ lib/memory/sanitizer.js           (every write)
    ├─→ lib/memory/working-memory.js      (layer 1)
    ├─→ lib/memory/episodic-memory.js     (layer 2)
    ├─→ lib/memory/procedural-memory.js   (layer 3)
    ├─→ lib/memory/strategic-memory.js    (layer 5)
    ├─→ lib/memory/skill-memory.js        (layer 6)
    ├─→ lib/memory/decision-memory.js     (layer 7)
    ├─→ lib/memory/knowledge-graph.js     (layer 8)
    ├─→ lib/memory/semantic-memory.js     (layer 9)
    ├─→ lib/memory/reflexion.js           (layer 11)
    ├─→ lib/memory/improvement.js         (layer 12)
    ├─→ lib/clients.js                    (Supabase singleton)
    └─→ lib/governance*.js                (evidence blocks for layers 0, 11)
```

### routes/* (Route Files) — Depend On:

```
All route files:
    ├─→ lib/clients.js                    (Supabase reads/writes)
    ├─→ lib/app-auth.js                   (requireAppAccess middleware)
    └─→ lib/*-specific-engine.js          (domain-specific logic)

routes/governance.js ADDITIONALLY:
    └─→ _sb() PER-REQUEST createClient()  (BUG — connection leak)

routes/integrations.js ADDITIONALLY:
    └─→ createClient() inside handler     (BUG — connection leak)
```

### lib/clients.js — Depends On:

```
lib/clients.js
    ├─→ @supabase/supabase-js             (createClient — called ONCE as singleton)
    ├─→ @anthropic-ai/sdk                 (Anthropic client factory)
    └─→ Environment vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
```

### lib/event-bus.js — Depends On:

```
lib/event-bus.js
    ├─→ pg_database.js                    (pg Pool for atomic transactions)
    └─→ Database: events, outbox, consumer_offsets tables
        write_outbox_with_state() stored procedure
```

---

## CRITICAL DEPENDENCY CHAINS

### Chat Request Critical Path

```
Client HTTP
    → server.js (requireAuth)
    → POST /api/chat handler
    → formatRecentMemory() → lib/memory/gateway.js → Supabase
    → Anthropic API (@anthropic-ai/sdk)
    → Response
```

**Single points of failure:** Supabase unavailability, Anthropic API unavailability, server.js crash

### Agent Pipeline Critical Path

```
Client HTTP
    → server.js → routes/agents.js
    → runtime/task-router.js
    → agent-system/orchestrator.js
    → 5 pre-execution gates (DB reads)
    → 6 pipeline stages (Anthropic API × multiple calls)
    → lib/memory/gateway.js (memory writes)
    → lib/governance*.js (audit writes)
    → git + Render API (COMMITTER)
```

**Single points of failure:** Anthropic API, Supabase, Git remote, Render API

---

## CIRCULAR DEPENDENCY RISKS

| Risk | Description | Severity |
|---|---|---|
| gateway.js ↔ governance.js | gateway.js calls governance.js (evidence blocks); governance.js may call gateway.js for memory reads | MEDIUM — risk of circular require() if not carefully managed |
| obsidian-memory.js ↔ gateway.js | obsidian-memory.js calls gateway.js; if gateway.js required obsidian-memory.js, circular. Evidence suggests one-directional. | LOW |
| server.js ↔ route files | server.js requires all route files; route files may require lib/ modules that server.js also directly requires | LOW (require() cache handles this) |

**Note:** Node.js's `require()` cache prevents true circular dependency crashes for most patterns, but order-of-initialization bugs can still occur.

---

## TIGHT COUPLING POINTS

| Point | Coupling Type | Risk |
|---|---|---|
| server.js (~12,300 lines) | Monolith — all startup logic in one file | HIGH — any crash kills all routes |
| lib/clients.js | All modules share same Supabase instance | HIGH — Supabase client config changes affect everything |
| lib/memory/gateway.js | All memory writes must pass through single file | HIGH — gateway bug affects all 12 layers |
| lib/memory/sanitizer.js | All writes must pass through sanitizer | MEDIUM — sanitizer gap affects all layers |
| orchestrator.js | All pipeline stages depend on single orchestrator | HIGH — orchestrator bug stops all agent work |
| Anthropic API | All AI calls via single API key | CRITICAL — key revocation or rate limit stops all AI |
| Supabase | All persistent state in one service | CRITICAL — Supabase outage = total data unavailability |

---

## EXTERNAL SERVICE DEPENDENCY MAP

| Service | Used For | Env Var | Failure Impact |
|---|---|---|---|
| Anthropic Claude API | All AI generation | ANTHROPIC_API_KEY | CRITICAL — chat, agent pipeline, all AI stops |
| Supabase (Postgres) | All database operations | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | CRITICAL — no persistence |
| Supabase (Storage) | File/document storage | SUPABASE_BUCKET | HIGH — documents unavailable |
| Render Platform | Hosting, deploy trigger | (internal) | CRITICAL — service goes down |
| Google Gemini API | Voice pipeline | GOOGLE_API_KEY | MEDIUM — voice only |
| Firecrawl | Web research (RESEARCHER) | (implicit) | LOW — falls back to Playwright |
| Notion API | Contact/project sync | NOTION_API_KEY | LOW — sync stops |
| Slack API | Notifications | SLACK_BOT_TOKEN | LOW — notifications stop |
| GitHub API | Git operations (COMMITTER) | GITHUB_TOKEN | HIGH — pipeline COMMITTER fails |
| Gmail API | Email integration | GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN | LOW — email integration stops |
| Obsidian API | Lesson logging | OBSIDIAN_URL, OBSIDIAN_API_KEY | LOW — lesson sync stops, DB write continues |
| Sentry | Error tracking | SENTRY_DSN | LOW — errors not reported externally |

---

## SINGLE POINTS OF FAILURE

1. **Anthropic API key** — All AI functionality dies if revoked/rate-limited
2. **Supabase instance** — All data operations fail
3. **server.js** — Crash kills entire service (no worker process redundancy confirmed)
4. **Render platform** — Entire service goes down
5. **lib/clients.js Supabase singleton** — All DB operations fail if singleton is corrupted
6. **lib/memory/gateway.js** — All memory operations fail
