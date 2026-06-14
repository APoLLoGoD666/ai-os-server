# Apex AI OS — API Reference & Reports
**Version:** 2.0.0
**Last Updated:** 2025-01-31
**Status:** Production

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Environment Variables](#environment-variables)
4. [API Domains](#api-domains)
   - [Communications](#communications)
   - [Finance](#finance)
   - [Health](#health)
   - [Intelligence](#intelligence)
   - [Life](#life)
   - [Operations](#operations)
   - [Agents](#agents)
   - [Integrations](#integrations)
5. [Voice Pipeline](#voice-pipeline)
   - [Deepgram STT — /api/transcribe](#deepgram-stt)
   - [Deepgram TTS — /api/tts](#deepgram-tts)
   - [Gemini TTS — /api/tts/gemini](#gemini-tts)
6. [iOS HTT Pipeline — PROTECTED](#ios-htt-pipeline--protected)
7. [OAuth2 Integrations](#oauth2-integrations)
8. [Anthropic Claude Integration](#anthropic-claude-integration)
9. [Supabase & Database Patterns](#supabase--database-patterns)
10. [Ruflo Agent Orchestration](#ruflo-agent-orchestration)
11. [Troubleshooting](#troubleshooting)
12. [Usage Examples by Domain](#usage-examples-by-domain)

---

## Overview

Apex AI OS is a voice-first operating system backend built on Node.js/Express. It exposes a REST API organized into domain-specific route modules, backed by Supabase (PostgreSQL), and integrated with Anthropic Claude for AI reasoning, Deepgram for speech-to-text and text-to-speech, Gmail OAuth2 for communications, and a Ruflo multi-agent orchestration layer.

**Base URL (local dev):** `http://localhost:3000`
**Base URL (production):** Set via `BASE_URL` environment variable

**Node.js version:** 18+
**Framework:** Express 4.x
**Error monitoring:** Sentry

---

## Authentication

Two middleware layers protect API routes:

### `_auth` — Standard User Authentication
Used on all user-facing domain endpoints. Validates a JWT Bearer token issued by Supabase Auth.

**Header required:**
```
Authorization: Bearer <supabase_jwt_token>
```

- Returns `401 Unauthorized` if token is missing or invalid
- Returns `403 Forbidden` if user does not have access to the requested resource

### `requireAppAccess` — Strict App-Level Access
Used on internal/system routes (intelligence, integrations, agent management). Requires an additional app-level secret in addition to user authentication.

**Header required:**
```
Authorization: Bearer <supabase_jwt_token>
x-app-secret: <APP_ACCESS_SECRET>
```

- Returns `401 Unauthorized` if credentials are missing
- Returns `403 Forbidden` if app secret does not match
- Applied to: all `/api/intelligence/*`, `/api/integrations/*`, `/api/agents/*` endpoints

### Public Endpoints (no auth required)
- `GET /api/health/ping` — health check
- `POST /api/transcribe` — Deepgram STT (protected at network level)
- `POST /api/tts` — Deepgram TTS (protected at network level)
- `POST /api/tts/gemini` — Gemini TTS (protected at network level)
- `GET /api/communications/oauth/callback` — Gmail OAuth2 callback

---

## Environment Variables

All variables are required unless marked optional. Never commit real values. See `.env.example` for the template.

| Variable | Description | Required |
|---|---|---|
| `PORT` | Express server port (default: 3000) | Optional |
| `BASE_URL` | Public base URL for OAuth callbacks | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (never expose to client) | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | Yes |
| `DEEPGRAM_API_KEY` | Deepgram speech API key | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID (Gmail) | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret | Yes |
| `GOOGLE_REDIRECT_URI` | OAuth2 redirect URI (must match GCP console) | Yes |
| `APP_ACCESS_SECRET` | Internal app-level access secret for requireAppAccess | Yes |
| `SENTRY_DSN` | Sentry error monitoring DSN | Optional |
| `GEMINI_API_KEY` | Google Gemini API key (for Gemini TTS) | Optional |
| `OPENAI_API_KEY` | OpenAI API key (if used for fallback) | Optional |
| `NODE_ENV` | Runtime environment (development/production) | Optional |

> **Security:** Never log or expose `SUPABASE_SERVICE_ROLE_KEY`, `APP_ACCESS_SECRET`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `GOOGLE_CLIENT_SECRET`, or `GEMINI_API_KEY`.

---

## API Domains

---

### Communications

**Base path:** `/api/communications`
**Auth:** `_auth` (JWT) on all routes except OAuth callback

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/communications/contacts` | `_auth` | List user contacts |
| GET | `/api/communications/calendar/events` | `_auth` | Fetch calendar events |
| POST | `/api/communications/calendar/sync` | `_auth` | Trigger calendar sync |
| GET | `/api/communications/oauth/init` | `_auth` | Initiate Gmail OAuth2 flow |
| GET | `/api/communications/oauth/callback` | None | Gmail OAuth2 callback (Google redirects here) |
| GET | `/api/communications/gmail/messages` | `_auth` | List Gmail messages |
| POST | `/api/communications/gmail/send` | `_auth` | Send email via Gmail |
| GET | `/api/communications/gmail/thread/:threadId` | `_auth` | Get full email thread |

#### Request / Response

**GET /api/communications/contacts**
```
Response 200:
{
  "contacts": [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "+15555550100"
    }
  ]
}
```

**POST /api/communications/gmail/send**
```
Request body:
{
  "to": "recipient@example.com",
  "subject": "Subject line",
  "body": "Plain text or HTML body"
}

Response 200:
{
  "success": true,
  "messageId": "gmail_message_id"
}
```

**POST /api/communications/calendar/sync**
```
Response 200:
{
  "success": true,
  "synced": 12
}
```

---

### Finance

**Base path:** `/api/finance`
**Auth:** `_auth` (JWT) on all routes

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/finance/invoices` | `_auth` | List invoices |
| POST | `/api/finance/invoices` | `_auth` | Create invoice |
| GET | `/api/finance/expenses` | `_auth` | List expenses |
| POST | `/api/finance/expenses` | `_auth` | Log an expense |
| GET | `/api/finance/subscriptions` | `_auth` | List subscriptions |
| POST | `/api/finance/subscriptions` | `_auth` | Add subscription |
| GET | `/api/finance/investments` | `_auth` | List investments |
| POST | `/api/finance/investments` | `_auth` | Log investment |

#### Request / Response

**GET /api/finance/expenses**
```
Response 200:
{
  "expenses": [
    {
      "id": "uuid",
      "amount": 42.50,
      "category": "Food",
      "description": "Lunch",
      "date": "2025-01-31"
    }
  ]
}
```

**POST /api/finance/expenses**
```
Request body:
{
  "amount": 42.50,
  "category": "Food",
  "description": "Lunch",
  "date": "2025-01-31"
}

Response 201:
{
  "success": true,
  "id": "uuid"
}
```

**GET /api/finance/invoices**
```
Response 200:
{
  "invoices": [
    {
      "id": "uuid",
      "client": "Acme Corp",
      "amount": 5000.00,
      "status": "pending",
      "due_date": "2025-02-15"
    }
  ]
}
```

---

### Health

**Base path:** `/api/health`
**Auth:** `_auth` on all routes except `/ping`

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health/ping` | None | Server health check |
| GET | `/api/health/workouts` | `_auth` | List workouts |
| POST | `/api/health/workouts` | `_auth` | Log workout |
| GET | `/api/health/nutrition` | `_auth` | Get nutrition logs |
| POST | `/api/health/nutrition` | `_auth` | Log nutrition entry |
| GET | `/api/health/sleep` | `_auth` | Get sleep records |
| POST | `/api/health/sleep` | `_auth` | Log sleep record |
| GET | `/api/health/metrics` | `_auth` | Get health metrics |
| GET | `/api/health/supplements` | `_auth` | List supplements |
| POST | `/api/health/supplements` | `_auth` | Log supplement intake |
| GET | `/api/health/detailed` | `_auth` | Full health summary |

#### Request / Response

**GET /api/health/ping**
```
Response 200:
{
  "status": "ok",
  "timestamp": "2025-01-31T00:00:00.000Z"
}
```

**POST /api/health/workouts**
```
Request body:
{
  "type": "strength",
  "duration_minutes": 60,
  "notes": "Chest and triceps",
  "date": "2025-01-31"
}

Response 201:
{
  "success": true,
  "id": "uuid"
}
```

**POST /api/health/sleep**
```
Request body:
{
  "hours": 7.5,
  "quality": "good",
  "date": "2025-01-31"
}

Response 201:
{
  "success": true,
  "id": "uuid"
}
```

**GET /api/health/detailed**
```
Response 200:
{
  "workouts": [...],
  "nutrition": [...],
  "sleep": [...],
  "metrics": {...},
  "supplements": [...]
}
```

---

### Intelligence

**Base path:** `/api/intelligence`
**Auth:** `requireAppAccess` on ALL routes

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/intelligence/interrupt` | `requireAppAccess` | Send interrupt signal to active agent |
| GET | `/api/intelligence/voice-status` | `requireAppAccess` | Get current voice pipeline status |
| POST | `/api/intelligence/voice-state` | `requireAppAccess` | Update voice pipeline state |
| GET | `/api/intelligence/lessons` | `requireAppAccess` | Retrieve learning lessons |
| GET | `/api/intelligence/agent-runs` | `requireAppAccess` | List agent execution history |
| GET | `/api/intelligence/cost-summary` | `requireAppAccess` | AI token usage and cost summary |
| GET | `/api/intelligence/news` | `requireAppAccess` | Curated news feed |

#### Request / Response

**GET /api/intelligence/voice-status**
```
Response 200:
{
  "status": "idle",
  "active_agent": null,
  "pipeline": "deepgram"
}
```

**POST /api/intelligence/voice-state**
```
Request body:
{
  "state": "listening"
}

Response 200:
{
  "success": true,
  "state": "listening"
}
```

**POST /api/intelligence/interrupt**
```
Request body:
{
  "reason": "user_command"
}

Response 200:
{
  "success": true,
  "interrupted": true
}
```

**GET /api/intelligence/cost-summary**
```
Response 200:
{
  "total_tokens": 1200000,
  "total_cost_usd": 12.50,
  "by_model": {
    "claude-3-5-sonnet-20241022": {
      "tokens": 900000,
      "cost_usd": 9.00
    }
  },
  "period": "2025-01"
}
```

**GET /api/intelligence/agent-runs**
```
Response 200:
{
  "runs": [
    {
      "id": "uuid",
      "agent": "ruflo",
      "status": "completed",
      "started_at": "2025-01-31T10:00:00Z",
      "ended_at": "2025-01-31T10:00:45Z",
      "tokens_used": 1200
    }
  ]
}
```

---

### Life

**Base path:** `/api/life`
**Auth:** `_auth` (JWT) on all routes

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/life/mood` | `_auth` | Get mood logs |
| POST | `/api/life/mood` | `_auth` | Log mood entry |
| GET | `/api/life/goals` | `_auth` | List life goals |
| POST | `/api/life/goals` | `_auth` | Create goal |
| GET | `/api/life/habits` | `_auth` | List habits |
| POST | `/api/life/habits` | `_auth` | Log habit completion |
| GET | `/api/life/journal` | `_auth` | Get journal entries |
| POST | `/api/life/journal` | `_auth` | Create journal entry |

#### Request / Response

**POST /api/life/mood**
```
Request body:
{
  "score": 8,
  "note": "Feeling productive today",
  "date": "2025-01-31"
}

Response 201:
{
  "success": true,
  "id": "uuid"
}
```

**GET /api/life/mood**
```
Response 200:
{
  "entries": [
    {
      "id": "uuid",
      "score": 8,
      "note": "Feeling productive today",
      "date": "2025-01-31"
    }
  ]
}
```

**POST /api/life/journal**
```
Request body:
{
  "title": "Weekly reflection",
  "content": "This week I focused on...",
  "date": "2025-01-31"
}

Response 201:
{
  "success": true,
  "id": "uuid"
}
```

---

### Operations

**Base path:** `/api/operations`
**Auth:** `_auth` (JWT) on all routes

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/operations/tasks` | `_auth` | List tasks |
| POST | `/api/operations/tasks` | `_auth` | Create task |
| PUT | `/api/operations/tasks/:id` | `_auth` | Update task |
| DELETE | `/api/operations/tasks/:id` | `_auth` | Delete task |
| GET | `/api/operations/projects` | `_auth` | List projects |
| POST | `/api/operations/projects` | `_auth` | Create project |
| GET | `/api/operations/notes` | `_auth` | List notes |
| POST | `/api/operations/notes` | `_auth` | Create note |

#### Request / Response

**POST /api/operations/tasks**
```
Request body:
{
  "title": "Review quarterly report",
  "priority": "high",
  "due_date": "2025-02-01",
  "project_id": "uuid"
}

Response 201:
{
  "success": true,
  "id": "uuid"
}
```

**PUT /api/operations/tasks/:id**
```
Request body:
{
  "status": "completed"
}

Response 200:
{
  "success": true
}
```

---

### Agents

**Base path:** `/api/agents`
**Auth:** `requireAppAccess` on ALL routes

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/agents` | `requireAppAccess` | List registered agents |
| POST | `/api/agents/run` | `requireAppAccess` | Trigger an agent run |
| GET | `/api/agents/:id/status` | `requireAppAccess` | Get agent status |
| POST | `/api/agents/:id/stop` | `requireAppAccess` | Stop a running agent |
| GET | `/api/agents/:id/logs` | `requireAppAccess` | Get agent execution logs |

#### Request / Response

**POST /api/agents/run**
```
Request body:
{
  "agent": "ruflo",
  "input": "Summarize my emails from today",
  "context": {
    "user_id": "uuid"
  }
}

Response 200:
{
  "success": true,
  "run_id": "uuid",
  "status": "running"
}
```

**GET /api/agents/:id/status**
```
Response 200:
{
  "run_id": "uuid",
  "agent": "ruflo",
  "status": "completed",
  "result": "...",
  "tokens_used": 1100
}
```

---

### Integrations

**Base path:** `/api/integrations`
**Auth:** `requireAppAccess` on ALL routes

#### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/integrations` | `requireAppAccess` | List active integrations |
| POST | `/api/integrations/connect` | `requireAppAccess` | Connect a new integration |
| DELETE | `/api/integrations/:id` | `requireAppAccess` | Disconnect integration |
| GET | `/api/integrations/:id/status` | `requireAppAccess` | Check integration health |

---

## Voice Pipeline

---

### Deepgram STT

**Endpoint:** `POST /api/transcribe`
**Auth:** Protected at network/infra level (no JWT required at HTTP layer)

> ⚠️ **DO NOT MODIFY** this endpoint's path, payload structure, or handler logic. It is a core system endpoint.

**Description:** Accepts raw audio data and returns transcription using Deepgram's Nova-2 model. Used internally by the iOS HTT pipeline.

**Request:**
```
Content-Type: multipart/form-data

Fields:
  audio: <binary audio blob>  (required)
  model: "nova-2"             (optional, default: nova-2)
  language: "en"              (optional, default: en)
```

**Response 200:**
```json
{
  "transcript": "Hey Apex, what are my tasks for today",
  "confidence": 0.98,
  "words": [
    { "word": "Hey", "start": 0.0, "end": 0.2, "confidence": 0.99 }
  ],
  "duration": 2.4
}
```

**Response 503:**
```json
{
  "error": "Deepgram service unavailable"
}
```

---

### Deepgram TTS

**Endpoint:** `POST /api/tts`
**Auth:** Protected at network/infra level (no JWT required at HTTP layer)

> ⚠️ **DO NOT MODIFY** this endpoint's path, payload structure, or handler logic. It is a core system endpoint.

**Description:** Converts text to speech audio using Deepgram's Aura voice model. Returns binary audio stream.

**Request:**
```json
{
  "text": "Here are your tasks for today.",
  "voice": "aura-asteria-en",
  "encoding": "linear16",
  "sample_rate": 24000
}
```

**Response 200:**
```
Content-Type: audio/wav
Body: <binary audio stream>
```

**Response 400:**
```json
{
  "error": "text field is required"
}
```

---

### Gemini TTS

**Endpoint:** `POST /api/tts/gemini`
**Auth:** Protected at network/infra level (no JWT required at HTTP layer)

> ⚠️ **DO NOT MODIFY** this endpoint's path, payload structure, or handler logic. It is a core system endpoint.

**Description:** Alternative TTS using Google Gemini. Returns binary audio.

**Request:**
```json
{
  "text": "Here are your tasks for today.",
  "voice": "en-US-Neural2-F"
}
```

**Response 200:**
```
Content-Type: audio/mp3
Body: <binary audio stream>
```

---

## iOS HTT Pipeline — PROTECTED

> 🚨 **CRITICAL — DO NOT MODIFY**
>
> The iOS HTT (Human Touch Trigger) pipeline is a protected system. The following browser/native events and APIs are **locked** and must never be altered, monkey-patched, intercepted, or removed:
>
> - `touchstart` event handler
> - `touchend` event handler
> - `getUserMedia()` call and its associated promise chain
> - `/api/transcribe` endpoint path and handler
> - `/api/tts` endpoint path and handler
>
> These five components form the low-latency voice activation loop that triggers on physical screen touch in the iOS app. Any modification breaks the voice-first interaction model and will cause silent failures that are difficult to debug in production.

**Pipeline flow (read-only reference):**
```
iOS Touch (touchstart)
  → getUserMedia() opens microphone
  → Audio capture begins
  → Touch release (touchend)
  → Audio blob sent to POST /api/transcribe
  → Transcript forwarded to Ruflo agent
  → Agent response text sent to POST /api/tts
  → Audio stream played back to user
```

**Latency target:** < 800ms end-to-end from touchend to first audio byte
**Audio format:** WebM/Opus captured, WAV for STT submission
**Voice model:** Deepgram Nova-2 (STT), Deepgram Aura (TTS)

---

## OAuth2 Integrations

### Gmail OAuth2

**Provider:** Google
**Scopes required:**
- `https://www.googleapis.com/auth/gmail.readonly` — read messages
- `https://www.googleapis.com/auth/gmail.send` — send messages
- `https://www.googleapis.com/auth/gmail.modify` — modify labels/read status
- `https://www.googleapis.com/auth/calendar.readonly` — read calendar events
- `https://www.googleapis.com/auth/calendar.events` — create/modify events
- `https://www.googleapis.com/auth/contacts.readonly` — read contacts

**Flow:**
```
1. Client calls GET /api/communications/oauth/init
   → Server generates Google OAuth2 URL with scopes
   → Returns { "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }

2. Client redirects user to returned URL

3. User authorizes in Google UI

4. Google redirects to GET /api/communications/oauth/callback?code=...
   → Server exchanges code for tokens
   → Tokens encrypted and stored in Supabase for the authenticated user
   → Redirect to app success screen
```

**Token refresh:** Handled automatically using the stored refresh token when access token expires (1-hour TTL on Google access tokens).

**Required env vars:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` — must match exactly what is registered in Google Cloud Console

---

## Anthropic Claude Integration

**Models in use:**
- `claude-3-5-sonnet-20241022` — primary model for agent reasoning and complex tasks
- `claude-3-haiku-20240307` — fast model for lightweight classification and routing

**Usage patterns:**

**1. Conversational agent turn**
```javascript
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  system: "You are Apex, a voice-first personal AI operating system...",
  messages: [
    { role: "user", content: transcript }
  ]
});
```

**2. Tool use / function calling**
```javascript
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 2048,
  tools: [...toolDefinitions],
  messages: conversationHistory
});
```

**3. Structured output extraction**
```javascript
const response = await anthropic.messages.create({
  model: "claude-3-haiku-20240307",
  max_tokens: 256,
  system: "Extract structured data as JSON. Return only valid JSON.",
  messages: [{ role: "user", content: rawText }]
});
```

**Cost tracking:** All Claude API calls are logged with token counts to Supabase. Accessible via `GET /api/intelligence/cost-summary`.

**Rate limits:** Respect Anthropic tier limits. Current tier supports ~40 requests/min on Sonnet. The agent orchestrator queues requests if limit is approached.

---

## Supabase & Database Patterns

**Client initialization:**
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

> Use `SUPABASE_SERVICE_ROLE_KEY` on the server only. Never send this to the client. Client-side code should use `SUPABASE_ANON_KEY` with Row Level Security (RLS).

**Common query patterns:**

**Select with user scoping:**
```javascript
const { data, error } = await supabase
  .from('workouts')
  .select('*')
  .eq('user_id', userId)
  .order('date', { ascending: false });
```

**Insert with returning:**
```javascript
const { data, error } = await supabase
  .from('expenses')
  .insert({ user_id: userId, amount: 42.50, category: 'Food' })
  .select()
  .single();
```

**Update:**
```javascript
const { error } = await supabase
  .from('tasks')
  .update({ status: 'completed' })
  .eq('id', taskId)
  .eq('user_id', userId);
```

**Schema — Key Tables:**

| Table | Primary Key | Key Columns |
|---|---|---|
| `users` | `id` (uuid) | `email`, `created_at` |
| `workouts` | `id` (uuid) | `user_id`, `type`, `duration_minutes`, `date` |
| `nutrition` | `id` (uuid) | `user_id`, `meal`, `calories`, `date` |
| `sleep_records` | `id` (uuid) | `user_id`, `hours`, `quality`, `date` |
| `expenses` | `id` (uuid) | `user_id`, `amount`, `category`, `date` |
| `invoices` | `id` (uuid) | `user_id`, `client`, `amount`, `status`, `due_date` |
| `tasks` | `id` (uuid) | `user_id`, `title`, `status`, `priority`, `due_date` |
| `mood_logs` | `id` (uuid) | `user_id`, `score`, `note`, `date` |
| `agent_runs` | `id` (uuid) | `user_id`, `agent`, `status`, `tokens_used`, `started_at` |
| `oauth_tokens` | `id` (uuid) | `user_id`, `provider`, `access_token_enc`, `refresh_token_enc` |
| `cost_logs` | `id` (uuid) | `user_id`, `model`, `input_tokens`, `output_tokens`, `cost_usd` |

**Row Level Security:** All tables have RLS enabled. Service role bypasses RLS. Anon/user JWTs are scoped to their own `user_id`.

---

## Ruflo Agent Orchestration

Ruflo is the multi-agent orchestration layer that coordinates AI agents in response to voice commands and scheduled tasks.

**Agent lifecycle:**
```
Input (voice transcript or API call)
  → Intent classification (Claude Haiku)
  → Agent selection (Ruflo router)
  → Tool execution (domain API calls)
  → Response synthesis (Claude Sonnet)
  → TTS output (Deepgram Aura)
```

**Triggering an agent run:**
```
POST /api/agents/run
Headers:
  Authorization: Bearer <jwt>
  x-app-secret: <APP_ACCESS_SECRET>

Body:
{
  "agent": "ruflo",
  "input": "What did I spend on food this month?",
  "context": {
    "user_id": "uuid",
    "timezone": "America/New_York"
  }
}
```

**Monitoring agent runs:**
```
GET /api/intelligence/agent-runs
Headers:
  Authorization: Bearer <jwt>
  x-app-secret: <APP_ACCESS_SECRET>
```

**Interrupting a running agent:**
```
POST /api/intelligence/interrupt
Body: { "reason": "user_command" }
```

**Available built-in agents:**

| Agent | Description |
|---|---|
| `ruflo` | General-purpose orchestrator and intent router |
| `finance-agent` | Financial analysis, expense reporting |
| `health-agent` | Health data synthesis and recommendations |
| `comms-agent` | Email triage, calendar management |
| `ops-agent` | Task and project management |

---

## Troubleshooting

### STT Failures (POST /api/transcribe)

**Symptom:** Returns 503 or empty transcript

| Cause | Resolution |
|---|---|
| Invalid `DEEPGRAM_API_KEY` | Verify key in Deepgram console, update `.env` |
| Audio blob empty or malformed | Check getUserMedia constraints and blob construction on iOS |
| Network timeout | Deepgram API unreachable; check status.deepgram.com |
| Wrong Content-Type | Must be `multipart/form-data` with `audio` field |
| Audio too short (< 0.1s) | Ensure touchstart→touchend duration is sufficient |

### TTS Failures (POST /api/tts)

**Symptom:** Returns 400 or silent audio

| Cause | Resolution |
|---|---|
| Missing `text` field | Always include non-empty `text` in request body |
| Invalid voice name | Use only supported Aura voice IDs (e.g., `aura-asteria-en`) |
| `DEEPGRAM_API_KEY` rate limited | Monitor Deepgram usage dashboard |
| Response not streamed correctly | Check `Content-Type: audio/wav` header handling on client |

### Auth Errors

**401 Unauthorized**
- JWT token is missing, malformed, or expired
- Solution: Re-authenticate via Supabase Auth, obtain fresh token

**403 Forbidden**
- For `_auth` routes: user does not have permission to resource
- For `requireAppAccess` routes: `x-app-secret` header is missing or incorrect