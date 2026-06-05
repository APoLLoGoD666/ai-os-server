# Secret Inventory — Phase 19C
*Audited: 2026-06-05 | Values not shown*

---

## Classification

### REQUIRED (system fails without these)

| Variable | Used By | Fail Behavior |
|---|---|---|
| ANTHROPIC_API_KEY | Claude API, agent pipeline, briefings | FATAL exit at startup |
| SUPABASE_URL | All DB operations | FATAL exit at startup |
| SUPABASE_SERVICE_ROLE_KEY | All DB operations | FATAL exit at startup |
| APP_ACCESS_KEY | All API route authentication | 503 on all requests if missing |
| JWT_SECRET | JWT token signing/verification | Auth broken |
| DASHBOARD_PASSWORD | Dashboard login | Dashboard inaccessible |

### REQUIRED FOR INTEGRATIONS (system degrades without these)

| Variable | Used By | Fail Behavior |
|---|---|---|
| NOTION_API_KEY | Notion CRUD, sync, agent run logging | Notion integration disabled; warn at startup |
| SLACK_BOT_TOKEN | All Slack posts, health checks, agent threads | Slack integration disabled; warn at startup |
| GOOGLE_API_KEY | Gemini 2.5 voice, TTS | Voice pipeline fails; TTS unavailable |
| GMAIL_CLIENT_ID | Gmail OAuth, email queue, calendar sync | Email + calendar disabled |
| GMAIL_CLIENT_SECRET | Gmail OAuth | Email + calendar disabled |
| GMAIL_REFRESH_TOKEN | Gmail OAuth token refresh | Email + calendar disabled |
| DEEPGRAM_API_KEY | STT fallback | Falls back to Gemini STT |
| ELEVENLABS_API_KEY | ElevenLabs TTS | Falls back to Gemini TTS |
| OBSIDIAN_API_KEY | Vault read/write, briefings, wiki | Vault ops fail non-fatally |
| GITHUB_TOKEN | Agent git commits, agent library sync | Git push fails; warn at startup |

### OPERATIONAL (deployment and orchestration)

| Variable | Used By | Fail Behavior |
|---|---|---|
| CRON_SECRET | Render cron webhook auth | Cron endpoint unprotected; warn at startup |
| RENDER_API_KEY | Programmatic deploy trigger | Deploy API calls fail |
| RENDER_SERVICE_ID | Render service reference | Deploy API calls fail |
| RENDER_EXTERNAL_URL | Slack pipeline complete notification | Falls back to hardcoded URL |
| RAG_SIDECAR_URL | RAG vector search sidecar | Falls back to BM25 RAG |
| AUTONOMY_LEVEL | Agent autonomy gate | Defaults to level 0 |

### OPTIONAL (enhanced features)

| Variable | Used By | Fail Behavior |
|---|---|---|
| AGENT_SECRET | Agent-to-agent auth | Agent auth bypassed |
| OPENROUTER_API_KEY | LLM fallback via OpenRouter | No fallback to OpenRouter |
| SENTRY_DSN | Error tracking | Falls back to in-memory buffer + apex_notifications |
| ANTHROPIC_MODEL | Model override | Defaults to claude-sonnet-4-6 |
| SUPABASE_ANON_KEY | Anon Supabase access (read-only routes) | Anon queries fail |
| VOYAGE_API_KEY | Vector embeddings (RAG sidecar) | Embeddings fail |
| BRAVE_API_KEY | Brave Search integration | Search disabled |

---

## Set on Render (23 confirmed)

All REQUIRED and most REQUIRED-FOR-INTEGRATIONS variables are confirmed set on Render as of 2026-06-05.

**Not set on Render (known):**
- SENTRY_DSN — not configured
- RENDER_EXTERNAL_URL — not set (fallback handles this)
- VOYAGE_API_KEY — optional
- BRAVE_API_KEY — optional

---

## .gitignore Coverage

`.env` — ✅ gitignored
`.mcp.json` — ✅ gitignored (contains Notion token)
No secrets committed to repository ✅
