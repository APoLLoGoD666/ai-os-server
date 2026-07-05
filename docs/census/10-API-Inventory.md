# 10 — API Inventory

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only. Route existence confirmed from file discovery. Exact endpoint paths not read from source.

---

## API Architecture

The live API is a single Node.js/Express server (`server.js`, 222 KB). Routes are defined in `routes/` directory files and loaded dynamically. Each route file uses a sub-prefix matching its filename.

**Base URL:** `RENDER_EXTERNAL_URL` (env var — live Render URL)  
**Port:** 3000  
**Auth:** JWT (`jsonwebtoken ^9.0.2`), `APP_ACCESS_KEY`, `JWT_SECRET`, `DASHBOARD_PASSWORD`

---

## Route Files (40)

Each file corresponds to a domain API group:

| Route File | Domain | Known Endpoints (from file name/context) |
|------------|--------|----------------------------------------|
| `routes/agents.js` | Agent management | Agent CRUD, task dispatch, status |
| `routes/briefing.js` | Briefings | Daily/weekly briefing generation |
| `routes/career.js` | Career | Career tracking |
| `routes/civilization.js` | Civilization | Civilization metrics, cycle log |
| `routes/cognitive.js` | Cognitive layer | Cognitive state, policy, queries |
| `routes/cognitive-eval.js` | Cognitive evaluation | Evaluation API |
| `routes/cognitive-evolution.js` | Evolution | Evolution metrics |
| `routes/communications.js` | Communications | Email, calendar, contacts |
| `routes/emails.js` | Email | Gmail integration endpoints |
| `routes/empire.js` | Empire | Empire graph data |
| `routes/entities.js` | Entities | Entity registry CRUD |
| `routes/executive-performance.js` | Executive KPIs | Performance metrics |
| `routes/finance.js` | Finance | Transactions, balances, reports |
| `routes/founder.js` | Founder profile | Founder state, traits |
| `routes/founder-graph.js` | Founder graph | Knowledge graph |
| `routes/gemini-live.js` | Gemini Live | Google Gemini Live integration |
| `routes/governance.js` | Governance | Governance probes, policy |
| `routes/health.js` | Health domain | Health logs, nutrition, workouts |
| `routes/integrations.js` | Integrations | Third-party integration status |
| `routes/intelligence.js` | Intelligence | Intelligence layer queries |
| `routes/intelligence-memory.js` | Intelligence memory | Memory queries |
| `routes/intent.js` | Intent | Intent detection |
| `routes/journal.js` | Journal | Journal entries |
| `routes/knowledge-graph.js` | Knowledge graph | Graph traversal, queries |
| `routes/legal.js` | Legal | Legal domain |
| `routes/life.js` | Life operations | Life tracking |
| `routes/memory.js` | Memory | Memory CRUD, search |
| `routes/nutrition.js` | Nutrition | Nutrition tracking |
| `routes/observatory.js` | Observatory | System state observatory |
| `routes/operations.js` | Operations | Operations management |
| `routes/property.js` | Property | Property tracking |
| `routes/pwa.js` | PWA | Push notification subscriptions |
| `routes/relationships.js` | Relationships | Relationship management |
| `routes/shopping.js` | Shopping | Shopping operations |
| `routes/social.js` | Social | Social media |
| `routes/spiritual.js` | Spiritual | Mindfulness, sigil routine |
| `routes/strategic.js` | Strategic | Strategic planning |
| `routes/travel.js` | Travel | Travel management |
| `routes/tts-gemini.js` | TTS | Google TTS via Gemini |
| `routes/university.js` | University | Assignment, study management |
| `routes/voice-chat.js` | Voice chat | Voice interface |
| `routes/wealth.js` | Wealth | Wealth management |

**Known core endpoint (from CLAUDE.md/Constitution):**
- `POST /api/master/halt` — kill switch (requires Founder auth)
- `/health` — health check (render health check path)
- `/phase0-test` — DELETED per constitution amendment 2026-06-11
- Cron route — render-callable scheduled operations

---

## Telemetry Route

**Path:** `src/routes/telemetry/index.js`

Separate telemetry route in `src/`. Relationship to main routes loading — UNKNOWN.

---

## WebSocket

**Handler:** `lib/ws-handler.js`  
**Package:** `ws ^8.21.0`  
**Purpose:** Real-time updates to dashboard  

---

## Third-Party Webhook/Integration Points

### Notion
- **Client:** `@notionhq/client ^5.22.0`
- **MCP:** `@notionhq/notion-mcp-server`
- **Service files:** `services/notion/` (5 files)
- **Key:** `NOTION_API_KEY`
- **Purpose:** Task and project sync, client management

### Slack
- **Service files:** `services/slack/` (6 files)
- **Key:** `SLACK_BOT_TOKEN`
- **Purpose:** Alerts, briefings, agent notifications, system health

### Gmail / Google OAuth
- **Script:** `scripts/get_gmail_token.js`
- **Route:** `routes/emails.js`, `routes/communications.js`
- **Keys:** `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
- **Package:** `googleapis ^173.0.0`
- **Purpose:** Email reading, drafting, sending

### Obsidian Local REST API
- **Client:** `agent-system/obsidian-client.js`
- **Plugin:** `.obsidian/plugins/obsidian-local-rest-api/`
- **Keys:** `OBSIDIAN_API_KEY`, `OBSIDIAN_URL`, `OBSIDIAN_VAULT_PATH`
- **Tunnel:** `scripts/obsidian-tunnel*.ps1`
- **Purpose:** Reading/writing vault notes from the server

### Firecrawl
- **Client:** `agent-system/firecrawl-bridge.js`
- **Package:** `@mendable/firecrawl-js ^4.28.1`
- **Purpose:** Web crawling for research

### Deepgram
- **Key:** `DEEPGRAM_API_KEY`
- **Purpose:** Voice transcription (speech-to-text)

### GitHub
- **Key:** `GITHUB_TOKEN`
- **Purpose:** Code operations

### Sentry
- **Package:** `@sentry/node ^10.56.0`
- **Key:** `SENTRY_DSN`
- **Purpose:** Error tracking

### Gemini Live
- **Route:** `routes/gemini-live.js`
- **Route:** `routes/tts-gemini.js`
- **Key:** `GOOGLE_API_KEY`
- **Purpose:** Real-time voice AI, TTS

---

## Supabase Edge Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `holdout-oracle` | `supabase/functions/holdout-oracle/index.ts` | Holdout evaluation oracle |

---

## Cron/Scheduled Routes

**Mechanism:** Render-callable cron route  
**Scheduler:** `lib/cron-scheduler.js`  
**Logger:** `lib/cron-logger.js`  
**Confirmed active crons:**
- `cron:integrity_backup` — backup verification (confirmed firing)
- `cron:integrity_reconcile` — reconciliation (confirmed firing)
- `COGNITIVE_CRONS_ENABLED=true` — cognitive layer crons

---

## Auth System

| Component | File | Purpose |
|-----------|------|---------|
| App auth | `lib/app-auth.js` | Application authentication |
| JWT | `jsonwebtoken ^9.0.2` | Token generation/verification |
| Rate limiting | `express-rate-limit ^8.5.1` | API rate limits |
| Security headers | `helmet ^8.0.0` | HTTP security headers |
| CORS | `cors ^2.8.6` | Cross-origin resource sharing |
| Secrets vault | `lib/secrets/vault.js` | Secret management |
| JWT secret | `JWT_SECRET` env var | JWT signing |
| Access key | `APP_ACCESS_KEY` env var | Application access |
| Dashboard password | `DASHBOARD_PASSWORD` env var | Dashboard login |

---

## Agent Command API

**Handler:** `lib/agent-command-handler.js`  
**Execution utilities:** `lib/agent-execution-utils.js`, `lib/agent-step-utils.js`  
**Task cycle:** `lib/agent-task-cycle.js`  
**Queue:** `lib/agent-queue.js`  
**Plan utilities:** `lib/agent-plan-utils.js`  
**File utilities:** `lib/agent-file-utils.js`

---

## PWA / Push Notifications

| Component | File | Status |
|-----------|------|--------|
| Service worker | `public/sw.js` | Active |
| Manifest | `public/manifest.json` | Active |
| Push route | `routes/pwa.js` | Active |
| Push library | `web-push ^3.6.7` | Installed |
| VAPID key gen | `scripts/gen-vapid.js` | Utility |
| Subscriptions table | `migrations/049_pwa_subscriptions.sql` | Created |
| Notification state | `notifications.json` | Active |

---

## API Unknowns

| Unknown | Note |
|---------|------|
| Exact endpoint paths | Route file source not read |
| `/api/master/halt` auth implementation | Not read |
| Gemini Live exact protocol | Not read |
| Obsidian tunnel architecture | Scripts present, operation not confirmed |
| Task route (`runtime/task-router.js`) mount point | Unknown |
