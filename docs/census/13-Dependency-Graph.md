# 13 — Dependency Graph

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only. Import chains not traced from source. Dependencies determined from file names, CLAUDE.md, package.json, and structural patterns.

---

## NPM Dependency Summary

**Runtime Dependencies (from `package.json`):**

| Package | Version | Purpose |
|---------|---------|---------|
| `@ai-sdk/anthropic` | ^3.0.77 | AI SDK Anthropic adapter |
| `@anthropic-ai/sdk` | ^0.104.2 | Primary Anthropic API client |
| `@langchain/anthropic` | ^1.4.0 | LangChain Anthropic integration |
| `@langchain/community` | ^1.1.29 | LangChain community tools |
| `@langchain/core` | ^1.1.48 | LangChain core |
| `@langchain/textsplitters` | ^0.1.0 | Text splitting |
| `@mastra/core` | ^1.43.0 | Mastra agent framework |
| `@mastra/memory` | ^1.20.5 | Mastra memory |
| `@mendable/firecrawl-js` | ^4.28.1 | Web crawling |
| `@notionhq/client` | ^5.22.0 | Notion API |
| `@sentry/node` | ^10.56.0 | Error tracking |
| `@supabase/supabase-js` | ^2.104.1 | Supabase client |
| `axios` | ^1.18.0 | HTTP client |
| `chokidar` | ^5.0.0 | File watching |
| `compression` | ^1.8.1 | Response compression |
| `cors` | ^2.8.6 | CORS middleware |
| `dotenv` | ^17.4.2 | Environment variable loading |
| `express` | ^5.2.1 | Web framework |
| `express-rate-limit` | ^8.5.1 | Rate limiting |
| `googleapis` | ^173.0.0 | Google APIs |
| `helmet` | ^8.0.0 | Security headers |
| `impeccable` | ^2.3.2 | Unknown — validation package |
| `jsonwebtoken` | ^9.0.2 | JWT authentication |
| `langchain` | ^1.4.2 | LangChain framework |
| `multer` | ^2.1.1 | File uploads |
| `pg` | ^8.20.0 | PostgreSQL client |
| `playwright` | ^1.60.0 | Browser automation |
| `ruflo` | ^3.6.30 | Agent orchestration |
| `web-push` | ^3.6.7 | Push notifications |
| `ws` | ^8.21.0 | WebSocket |
| `zod` | ^3.25.76 | Schema validation |

**Dev Dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `electron` | ^42.3.0 | Desktop app wrapper |

**Overrides (forced versions):**
| Package | Version | Reason |
|---------|---------|--------|
| `protobufjs` | ^7.4.0 | Security/compatibility |
| `uuid` | ^11.1.1 | Version conflict resolution |
| `@opentelemetry/core` | ^2.8.0 | OTel compatibility |
| `@opentelemetry/resources` | ^2.8.0 | OTel compatibility |
| `js-yaml` | ^4.2.0 | Security |
| `gray-matter` | ^4.0.3 | Security |
| `qs` | ^6.15.2 | Security |
| `hono` | ^4.12.25 | Framework conflict |
| `form-data` | ^4.0.6 | Conflict |
| `@ai-sdk/provider-utils` | ^4.0.30 | AI SDK conflict |
| `@ai-sdk/ui-utils` | ^1.2.11 | AI SDK conflict |

---

## Key Inter-Module Dependencies

**All modules depend on `server.js` for mounting.**

### Critical Path (confirmed from CLAUDE.md)

```
server.js
  ├── lib/pg_database.js (Supabase JS connection)
  ├── lib/pg_helpers.js (query utilities)
  ├── lib/storage.js (Supabase Storage)
  ├── agent-system/orchestrator.js (_runtimeCtrlError fail-closed gate)
  ├── lib/write-with-outbox.js (atomic outbox writes)
  ├── lib/outbox-relay.js (outbox relay, _sb singleton)
  ├── lib/integrity-crons.js (backup + reconcile crons)
  ├── lib/cron-scheduler.js (cron registration)
  └── routes/*.js (40 route files mounted)
```

### Memory Access Pattern

```
All consumers → lib/memory/gateway.js (single access point)
  ├── lib/memory/working-memory.js → Supabase
  ├── lib/memory/episodic-memory-pg.js → Supabase
  ├── lib/memory/semantic-memory.js → Supabase
  ├── lib/memory/decision-memory.js → Supabase
  ├── lib/memory/founder-memory.js → Supabase
  ├── lib/memory/knowledge-graph.js → Supabase
  └── lib/memory/cache.js → In-process
```

### Event Flow Pattern

```
Writers → lib/write-with-outbox.js → [state SQL + outbox INSERT in one RPC transaction]
  └── write_outbox_with_state PL/pgSQL function → Supabase

lib/outbox-relay.js → reads outbox → processes events
lib/event-bus.js → in-process event routing
lib/event-consumer.js → event consumption
```

### Agent Pipeline

```
routes/agents.js → agent-system/orchestrator.js
  → lib/cognitive/runtime/*.js (cognitive governance)
  → agent-system/[domain-agent].js
  → Claude API (@anthropic-ai/sdk)
  → lib/memory/gateway.js (memory read/write)
```

---

## Known Duplicate Implementations

| Component | Location 1 | Location 2 | Note |
|-----------|-----------|-----------|------|
| `reality_loop` | `lib/intelligence/reality-loop.js` | `lib/reality/reality_loop.js` | Two files, same concept |
| `graphify-out/` | `graphify-out/` | `dev-tools/graphify-out/` | Knowledge graph output duplicated |
| `sidecar/main.py` | `sidecar/main.py` | `runtime/sidecar/main.py` | Python RAG service duplicated |
| `finance/duplicate-detector` | `lib/finance/duplicate-detector.js` | `lib/finance/import/duplicate-detector.js` | Two duplicate detectors |
| Agent pipeline hooks | `services/pipelines/agent-pipeline-hooks.js` | `agent-system/agent-pipeline-hooks.js` | Same purpose, two files |
| `apex-v2.css` | `apex-v2.css` (root) | `public/apex-v2.css` | Duplicate CSS file |
| `apex-custom.css` | `apex-custom.css` (root) | `public/apex-custom.css` | Duplicate CSS file |
| `dashboard.html` | `dashboard.html` (root) | `public/dashboard.html` | Possibly same file |
| `editor.html` | `editor.html` (root, 4.5KB) | `public/editor.html` | Possibly same file |
| `manifest.json` | `manifest.json` (root, 1.1KB) | `public/manifest.json` | Possibly same file |
| Certification script | `scripts/phase-a-verify.js` | `validation/phase-a-verify.js` | Same script in two locations |
| Phase C run | `scripts/phase-c-run.js` | `validation/phase-c-run.js` | Same script in two locations |
| Verify C06 | `scripts/verify-c06.js` | `validation/verify-c06.js` | Same script in two locations |
| Memory verify | `scripts/verify-memory-integrity.js` | `validation/verify-memory-integrity.js` | Same script in two locations |
| Memory json | `memory.json` (root) | `data/memory.json` | State file duplicated |
| Notifications json | `notifications.json` (root) | `data/notifications.json` | State file duplicated |
| Timeline json | `timeline.json` (root) | `data/timeline.json` | State file duplicated |

---

## Orphaned/Isolated Modules

| Module | Issue |
|--------|-------|
| `src/components/orb/PlasmaOrb.js` | No imports found — isolated |
| `src/routes/telemetry/index.js` | No confirmed mount point |
| `src/workers/cron.js` | No confirmed relationship to main cron system |
| `utils/math.js` | No consumers identified |
| `lib/workspace.js` | Purpose unknown |
| `instrument.js` (root) | Duplicate of `scripts/instrument.js` |
| `scripts/reflection_agent.js` | Duplicate of `agent-system/reflection_agent.js` |

---

## External API Dependencies

| Dependency | Type | Removable if |
|------------|------|-------------|
| Anthropic API | Critical | System non-functional without |
| Supabase PostgreSQL | Critical | All data lost without |
| Render hosting | Critical | System offline without |
| Supabase Storage | High | File operations fail |
| Notion API | Medium | Project sync fails |
| Slack | Medium | Alerts and briefings fail |
| Gmail OAuth | Medium | Email domain fails |
| Google API | Medium | TTS and Gemini routes fail |
| Deepgram | Medium | Voice transcription fails |
| Obsidian REST API | Low | Vault read/write fails |
| Firecrawl | Low | Web research fails |
| GitHub token | Low | GitHub agent operations fail |
| Sentry | Low | Error tracking fails |
| OpenAI (optional) | Optional | Sidecar embeddings unavailable |
| Voyage AI (optional) | Optional | Premium embeddings unavailable |
| ElevenLabs (optional) | Optional | Alternative TTS unavailable |
| Brave (optional) | Optional | Search integration unavailable |

---

## Broken Reference Potential

These were identified as potential issues but not confirmed:

| Item | Risk |
|------|------|
| Migration 044 gap | If sequential migration required, may cause issue |
| Migration 047 gap | Same as above |
| `legacy-peer-deps` in build | Indicates peer dependency conflicts in npm tree |
| `protobufjs` override | Forced to avoid known vulnerability |
| `--max-old-space-size=220` | Tight memory ceiling; any unbounded allocation risks OOM |
