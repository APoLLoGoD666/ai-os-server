# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 08a · Expanded Entity Records — Block 02: External Services & AI Models

**Registry Version:** 1.0.0
**Date:** 2026-07-05
**Part:** Registry Part 2 — Full Attribute Expansion
**Entities:** ENT-000010 through ENT-000028 (19 entities)

---

### ENT-000010 — Anthropic API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | The primary AI inference API used by APEX to invoke Claude models for all agent reasoning, conversation, and generation tasks. |
| Purpose | Primary AI brain of the Civilisation — all agent cognition flows through this API. |
| Owner | Anthropic PBC |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Anthropic PBC |
| Consumers | lib/models/providers/anthropic.js, lib/clients.js |
| Dependencies | ANTHROPIC_API_KEY (ENT-000761), ANTHROPIC_MODEL (ENT-000762) |
| Interfaces | /v1/messages endpoint, streaming API (SSE) |
| Entry Points | APEX outbound HTTP POST to api.anthropic.com/v1/messages |
| Exit Points | Inference response (streamed or batch) returned to calling consumer |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var ANTHROPIC_API_KEY confirmed in .env.example; consumer files lib/models/providers/anthropic.js and lib/clients.js confirmed |
| Unknown Fields | Rate limits, model version pinning policy, retry configuration |

---

### ENT-000011 — Claude AI Model

**Family:** API | **Type:** AI_MODEL | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000010 (Anthropic API) |
| Description | The specific Claude model instance (configured via ANTHROPIC_MODEL env var) that serves as the primary reasoning engine for all APEX agents. |
| Purpose | Executes all agent reasoning, conversation, planning, and decision tasks across every APEX pipeline. |
| Owner | Anthropic PBC |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Anthropic PBC |
| Consumers | Every agent pipeline, master-orchestrator, conversation handler |
| Dependencies | ENT-000010 (Anthropic API) |
| Interfaces | Invoked exclusively via ENT-000010 Anthropic API /v1/messages |
| Entry Points | Model receives prompt payload from Anthropic API layer |
| Exit Points | Returns completion token stream to Anthropic API caller |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var ANTHROPIC_MODEL confirmed in .env.example; model identity bound at runtime by env var value |
| Unknown Fields | Exact model version in production, context window configured, temperature defaults |

---

### ENT-000012 — Google Gemini API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Google's multimodal AI API used for live voice streaming and TTS generation via Gemini Live and Gemini TTS endpoints. |
| Purpose | Powers real-time voice conversation (Gemini Live) and Gemini-based TTS synthesis for voice-first Founder interaction. |
| Owner | Google LLC |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Google LLC |
| Consumers | routes/gemini-live.js, lib/models/providers/google.js, routes/tts-gemini.js |
| Dependencies | GOOGLE_API_KEY (ENT-000776) |
| Interfaces | Gemini Live streaming endpoint, Gemini TTS endpoint |
| Entry Points | APEX outbound WebSocket/HTTP to Gemini Live and TTS APIs |
| Exit Points | Audio stream and TTS audio returned to voice pipeline consumers |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var GOOGLE_API_KEY confirmed in .env.example; consumer files routes/gemini-live.js, lib/models/providers/google.js, routes/tts-gemini.js confirmed |
| Unknown Fields | Gemini model version in use, streaming session management approach |

---

### ENT-000013 — OpenAI API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | OpenAI API used as a secondary or fallback model provider when the primary Claude model is unavailable or for specific task types. |
| Purpose | Model provider fallback; used when primary Claude model is unavailable or when a task specifically requires an OpenAI model. |
| Owner | OpenAI OpCo LLC |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | OpenAI OpCo LLC |
| Consumers | lib/clients.js (model fallback path) |
| Dependencies | OPENAI_API_KEY (ENT-000786) |
| Interfaces | OpenAI /v1/chat/completions endpoint |
| Entry Points | APEX outbound HTTP POST to api.openai.com/v1/chat/completions |
| Exit Points | Completion response returned to lib/clients.js fallback handler |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var OPENAI_API_KEY confirmed in .env.example; consumer lib/clients.js confirmed |
| Unknown Fields | Which OpenAI model is selected in fallback, fallback trigger conditions |

---

### ENT-000014 — OpenRouter API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | OpenRouter API providing access to multiple AI models through a unified endpoint, enabling model routing and non-Anthropic model access. |
| Purpose | Model routing and fallback; enables access to non-Anthropic models when needed via a single unified API surface. |
| Owner | OpenRouter Inc |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | OpenRouter Inc |
| Consumers | lib/models/providers/ (via model selector) |
| Dependencies | OPENROUTER_API_KEY (ENT-000787) |
| Interfaces | OpenRouter unified chat completions endpoint (OpenAI-compatible) |
| Entry Points | APEX outbound HTTP POST to openrouter.ai/api/v1/chat/completions |
| Exit Points | Model completion returned to model selector provider layer |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var OPENROUTER_API_KEY confirmed in .env.example; consumer lib/models/providers/ confirmed |
| Unknown Fields | Which specific models are routed via OpenRouter, routing logic within model selector |

---

### ENT-000015 — Brave Search API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Brave's privacy-focused web search API used by agents for real-time web information retrieval and knowledge grounding. |
| Purpose | Provides agents with current web information; grounds knowledge tasks against live web data. |
| Owner | Brave Software Inc |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Brave Software Inc |
| Consumers | agent-system/ (search-capable agents), lib/apex-tools.js |
| Dependencies | BRAVE_API_KEY (ENT-000765) |
| Interfaces | Brave Search REST API /res/v1/web/search |
| Entry Points | APEX outbound HTTP GET to api.search.brave.com |
| Exit Points | Search results JSON returned to calling agent tool |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var BRAVE_API_KEY confirmed in .env.example; consumer files agent-system/ and lib/apex-tools.js confirmed |
| Unknown Fields | Result count configuration, safe-search settings, which specific agents consume search |

---

### ENT-000016 — DeepGram API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Real-time speech-to-text API used for voice input transcription in the voice chat interface, converting Founder speech to text via streaming WebSocket. |
| Purpose | Converts Founder speech to text for voice-driven agent interaction; primary STT provider for the voice pipeline. |
| Owner | Deepgram Inc |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Deepgram Inc |
| Consumers | routes/voice-chat.js |
| Dependencies | DEEPGRAM_API_KEY (ENT-000770) |
| Interfaces | Streaming STT WebSocket endpoint (wss://api.deepgram.com/v1/listen) |
| Entry Points | APEX WebSocket connection from routes/voice-chat.js to Deepgram streaming endpoint |
| Exit Points | Real-time transcript events returned over WebSocket to voice-chat route |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var DEEPGRAM_API_KEY confirmed in .env.example; consumer routes/voice-chat.js confirmed |
| Unknown Fields | STT model version configured, language settings, interim results handling |

---

### ENT-000017 — ElevenLabs API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | AI voice synthesis API providing high-quality text-to-speech for agent responses, serving as the secondary TTS provider in the APEX voice pipeline. |
| Purpose | Secondary TTS provider; generates natural-sounding agent voice responses for Founder playback. |
| Owner | ElevenLabs Inc |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | ElevenLabs Inc |
| Consumers | routes/voice-chat.js, TTS pipeline |
| Dependencies | ELEVENLABS_API_KEY (ENT-000771) |
| Interfaces | ElevenLabs TTS REST API /v1/text-to-speech |
| Entry Points | APEX outbound HTTP POST from voice-chat route and TTS pipeline to ElevenLabs endpoint |
| Exit Points | Audio stream returned to voice pipeline for Founder playback |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var ELEVENLABS_API_KEY confirmed in .env.example; consumer routes/voice-chat.js and TTS pipeline confirmed |
| Unknown Fields | Voice ID configured, model version, streaming vs batch mode, fallback priority relative to Gemini TTS |

---

### ENT-000018 — Voyage AI API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Voyage AI's embedding API used to generate vector embeddings for semantic memory storage and RAG operations across all APEX memory systems. |
| Purpose | Produces embeddings for all semantic memory storage and retrieval operations; underpins every RAG and similarity-search pipeline. |
| Owner | Voyage AI Inc |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Voyage AI Inc |
| Consumers | lib/embed.js |
| Dependencies | VOYAGE_API_KEY (ENT-000803) |
| Interfaces | Voyage AI /v1/embeddings REST endpoint |
| Entry Points | APEX outbound HTTP POST from lib/embed.js to api.voyageai.com/v1/embeddings |
| Exit Points | Embedding vector array returned to lib/embed.js for storage or similarity search |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var VOYAGE_API_KEY confirmed in .env.example; consumer lib/embed.js confirmed |
| Unknown Fields | Embedding model version configured, vector dimensionality, batch size limits |

---

### ENT-000019 — GitHub API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | GitHub API used for repository management, deployment triggers, code operations, and PR management via agent-driven automation. |
| Purpose | Enables agent-driven code commits, pull request management, and deployment automation from within the Civilisation. |
| Owner | GitHub Inc (Microsoft) |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | GitHub Inc (Microsoft) |
| Consumers | Deployment pipeline, .claude/agents/github/ agents |
| Dependencies | GITHUB_TOKEN (ENT-000772) |
| Interfaces | GitHub REST API v3, GitHub GraphQL API v4 |
| Entry Points | APEX outbound HTTP to api.github.com; agent tool calls from .claude/agents/github/ |
| Exit Points | Repository operation results and webhook events returned to deployment pipeline and agents |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var GITHUB_TOKEN confirmed in .env.example; consumer files deployment pipeline and .claude/agents/github/ confirmed |
| Unknown Fields | Specific repositories scoped to token, webhook configuration, branch policies |

---

### ENT-000020 — Slack API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Slack API used to send alerts, briefings, system health updates, and agent notifications to the Founder via bot and event subscriptions. |
| Purpose | Primary notification and alerting channel from the Civilisation to the Founder; delivers all system-generated messages and briefings. |
| Owner | Salesforce Inc (Slack) |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Salesforce Inc (Slack) |
| Consumers | services/slack/ (5 files) |
| Dependencies | SLACK_BOT_TOKEN (ENT-000796) |
| Interfaces | Slack Web API (chat.postMessage etc.), Slack Events API, Slack Bot |
| Entry Points | APEX outbound HTTP from services/slack/ to slack.com/api; inbound Events API webhook |
| Exit Points | Messages delivered to Founder Slack workspace; event payloads received by APEX webhook handler |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var SLACK_BOT_TOKEN confirmed in .env.example; consumer services/slack/ (5 files) confirmed |
| Unknown Fields | Channel IDs configured, event subscriptions enabled, signing secret handling |

---

### ENT-000021 — Notion API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Notion API used for bidirectional task, project, and client data synchronisation between APEX and the Founder's Notion workspace. |
| Purpose | Bidirectional sync keeping APEX tasks, projects, and records aligned with the Founder's Notion workspace. |
| Owner | Notion Labs Inc |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Notion Labs Inc |
| Consumers | services/notion/ (5 files) |
| Dependencies | NOTION_API_KEY (ENT-000782) |
| Interfaces | Notion REST API v1 (pages, databases, blocks) |
| Entry Points | APEX outbound HTTP from services/notion/ to api.notion.com/v1 |
| Exit Points | Notion page and database records returned to APEX services for state sync |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var NOTION_API_KEY confirmed in .env.example; consumer services/notion/ (5 files) confirmed |
| Unknown Fields | Database IDs configured, sync direction logic, conflict resolution strategy |

---

### ENT-000022 — Gmail API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Gmail API providing OAuth2-authenticated read and send access to the Founder's email account for agent-driven email management. |
| Purpose | Enables the email agent to read, analyse, draft, and send emails on the Founder's behalf via the Founder's Gmail account. |
| Owner | Google LLC |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Google LLC |
| Consumers | agent-system/email_agent.js, routes/emails.js |
| Dependencies | GMAIL_CLIENT_ID (ENT-000773), GMAIL_CLIENT_SECRET (ENT-000774), GMAIL_REFRESH_TOKEN (ENT-000775) |
| Interfaces | Gmail REST API v1 (OAuth2); users.messages.list, users.messages.send, users.drafts |
| Entry Points | APEX outbound HTTP from email_agent.js and routes/emails.js to gmail.googleapis.com/gmail/v1 |
| Exit Points | Email message objects and send confirmations returned to email agent and route handlers |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env vars GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN confirmed in .env.example; consumer files agent-system/email_agent.js and routes/emails.js confirmed |
| Unknown Fields | Gmail scopes granted, token refresh handling, email labelling conventions |

---

### ENT-000023 — Sentry

**Family:** SVC | **Type:** OBSERVABILITY_PLATFORM | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Cloud error tracking and performance monitoring platform receiving telemetry from APEX via OpenTelemetry instrumentation initialised at startup. |
| Purpose | Captures runtime errors, exceptions, and performance traces from the live APEX system for observability and incident response. |
| Owner | Functional Software Inc (Sentry) |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Functional Software Inc (Sentry) |
| Consumers | instrument.js (ENT-000041) |
| Dependencies | SENTRY_DSN (ENT-000795) |
| Interfaces | Sentry SDK (OpenTelemetry-compatible), Sentry error event ingest endpoint |
| Entry Points | instrument.js initialises Sentry SDK at process startup; all uncaught errors and performance spans captured automatically |
| Exit Points | Error events and performance traces transmitted to Sentry ingest (o.sentry.io) |
| Runtime Presence | ALWAYS |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | Self-referential — Sentry is the observability layer |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env var SENTRY_DSN confirmed in .env.example; consumer instrument.js (ENT-000041) confirmed; always-on instrumentation at startup |
| Unknown Fields | Sample rate configuration, environment tag (production vs staging), release tracking setup |

---

### ENT-000024 — Supabase

**Family:** SVC | **Type:** DATABASE_PLATFORM | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Supabase managed Postgres platform hosting all 200+ APEX database tables, Storage buckets, and Row Level Security policies — the durable state store of the entire Civilisation. |
| Purpose | Primary durable data store for all Civilisation state, agent memory, governance records, Founder data, and operational history. |
| Owner | Supabase Inc |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Supabase Inc |
| Consumers | lib/pg_database.js, all database-writing modules across the codebase |
| Dependencies | SUPABASE_URL (ENT-000802), SUPABASE_ANON_KEY (ENT-000798), SUPABASE_SERVICE_ROLE_KEY (ENT-000801) |
| Interfaces | Postgres connection (DATABASE_URL / pg driver), Supabase REST API (SUPABASE_URL), Supabase Storage API, Row Level Security policies |
| Entry Points | APEX inbound Postgres connections and REST API calls from lib/pg_database.js and all writing modules |
| Exit Points | Query result sets and Storage objects returned to all APEX consumers |
| Runtime Presence | ALWAYS |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env vars SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY confirmed in .env.example; consumer lib/pg_database.js and all database-writing modules confirmed |
| Unknown Fields | Table count confirmation, RLS policy inventory, Storage bucket list, connection pool size |

---

### ENT-000025 — Render

**Family:** SVC | **Type:** HOSTING_PLATFORM | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Render cloud platform hosting the APEX Node.js web service, executing scheduled cron jobs, and providing the production runtime environment for the entire Civilisation server process. |
| Purpose | Production runtime host for the entire APEX Civilisation server process; executes all server-side code and cron schedules. |
| Owner | Render Services Inc |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Render Services Inc |
| Consumers | render.yaml (ENT-000110), deploy-trigger.json (ENT-000112) |
| Dependencies | RENDER_API_KEY (ENT-000791), RENDER_SERVICE_ID (ENT-000794), RENDER_EXTERNAL_URL (ENT-000792) |
| Interfaces | Render Deploy API (deploy triggers via RENDER_API_KEY), Render Health endpoint, Render dashboard |
| Entry Points | render.yaml defines service configuration; deploy-trigger.json initiates deployments; all inbound HTTPS traffic enters via Render's edge |
| Exit Points | RENDER_EXTERNAL_URL is the public egress URL for all inbound web requests to APEX |
| Runtime Presence | ALWAYS |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env vars RENDER_API_KEY, RENDER_SERVICE_ID, RENDER_EXTERNAL_URL confirmed in .env.example; consumer files render.yaml (ENT-000110) and deploy-trigger.json (ENT-000112) confirmed |
| Unknown Fields | Instance type / plan, region, auto-deploy branch configuration, health check path |

---

### ENT-000026 — Obsidian API

**Family:** API | **Type:** EXTERNAL_API | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Obsidian Local REST API enabling APEX to read and write the Founder's Obsidian knowledge vault, serving as the narrative projection layer of the Civilisation's knowledge. |
| Purpose | Narrative projection layer — provides the human-readable, editable face of the Civilisation's knowledge through the Founder's Obsidian vault. |
| Owner | Dynalist Inc (Obsidian) |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Dynalist Inc (Obsidian) |
| Consumers | agent-system/obsidian-client.js, agent-system/obsidian-memory.js |
| Dependencies | OBSIDIAN_API_KEY (ENT-000783), OBSIDIAN_URL (ENT-000784), OBSIDIAN_VAULT_PATH (ENT-000785) |
| Interfaces | Obsidian Local REST API (community plugin); vault file read/write endpoints |
| Entry Points | APEX outbound HTTP from obsidian-client.js to local Obsidian REST API at OBSIDIAN_URL |
| Exit Points | Vault note content returned to obsidian-memory.js; write confirmations returned to obsidian-client.js |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | env vars OBSIDIAN_API_KEY, OBSIDIAN_URL, OBSIDIAN_VAULT_PATH confirmed in .env.example; consumer files agent-system/obsidian-client.js and agent-system/obsidian-memory.js confirmed |
| Unknown Fields | Vault structure / folder conventions used by APEX, note templates, sync frequency |

---

### ENT-000027 — Firecrawl

**Family:** SVC | **Type:** WEB_SCRAPING_SERVICE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Web scraping and content extraction service used by APEX agents to retrieve structured, clean web content from arbitrary URLs for research and analysis. |
| Purpose | Enables agents to read web pages and extract clean, structured content for research, analysis, and knowledge acquisition tasks. |
| Owner | Mendable Inc (Firecrawl) |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Mendable Inc (Firecrawl) |
| Consumers | agent-system/firecrawl-bridge.js |
| Dependencies | UNKNOWN (no dedicated env var confirmed; likely uses internal config or hardcoded endpoint in bridge) |
| Interfaces | Firecrawl REST API (via firecrawl-bridge.js abstraction layer) |
| Entry Points | APEX outbound HTTP from agent-system/firecrawl-bridge.js to Firecrawl API endpoint |
| Exit Points | Cleaned Markdown/structured content returned to calling agent via bridge |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | Consumer file agent-system/firecrawl-bridge.js confirmed; no dedicated env var found in .env.example — API key or config may be hardcoded in bridge or loaded via alternative mechanism |
| Unknown Fields | API key location and storage, Firecrawl endpoint URL, scrape mode configuration (crawl vs scrape), rate limit handling |

---

### ENT-000028 — Markitdown

**Family:** SVC | **Type:** DOCUMENT_CONVERSION_SERVICE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | EXTERNAL |
| Parent | ENT-000001 (APEX Civilisation) |
| Description | Document-to-Markdown conversion service enabling APEX agents to process PDFs, Word documents, and other binary formats into machine-readable Markdown for agent ingestion. |
| Purpose | Converts documents to machine-readable Markdown for agent ingestion and analysis; extends agent capabilities to non-text document formats. |
| Owner | Microsoft (Markitdown open-source project) |
| Visibility | EXTERNAL |
| Source | EXTERNAL |
| Language | UNKNOWN |
| Created By | Microsoft (Markitdown open-source project) |
| Consumers | agent-system/markitdown-bridge.js |
| Dependencies | UNKNOWN (no dedicated env var confirmed; likely self-hosted or locally invoked via bridge) |
| Interfaces | Markitdown REST API (via markitdown-bridge.js abstraction layer) |
| Entry Points | APEX outbound call from agent-system/markitdown-bridge.js to Markitdown service or local binary |
| Exit Points | Converted Markdown text returned to calling agent via bridge for further processing |
| Runtime Presence | ON_REQUEST |
| Persistence | EXTERNAL |
| Documentation | UNKNOWN |
| Test Coverage | NONE |
| Observability | UNKNOWN |
| Governance Status | UNGOVERNED |
| Confidence | HIGH |
| Evidence | Consumer file agent-system/markitdown-bridge.js confirmed; no dedicated env var found in .env.example — may be self-hosted, locally installed Python CLI, or invoked via subprocess in bridge |
| Unknown Fields | Deployment mode (self-hosted API vs local subprocess vs remote service), supported document formats in production use, error handling for unsupported formats |

---

*End of 08a — Block 02 Full Attribute Expansion*
