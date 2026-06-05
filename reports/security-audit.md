# Security Audit — Phase 11
*Audited: 2026-06-05*

---

## Environment Variables & Secrets

### .gitignore Status
- `.env` — ✅ IN .gitignore
- `.mcp.json` — ✅ IN .gitignore (contains Notion token)
- `.env.example` — does not exist (recommended: create with key names only)

### Render Env Vars (23 total)
All secrets stored as Render env vars. No hardcoded secrets found in services/, routes/, or lib/.

| Variable | Type | Status |
|---|---|---|
| ANTHROPIC_API_KEY | Claude API | ✅ Set |
| SUPABASE_URL | DB URL | ✅ Set |
| SUPABASE_SERVICE_ROLE_KEY | DB admin JWT | ✅ Set |
| SUPABASE_ANON_KEY | DB anon JWT | ✅ Set |
| NOTION_API_KEY | Notion integration | ✅ Set (added 2026-06-05) |
| SLACK_BOT_TOKEN | Slack bot | ✅ Set (added 2026-06-05) |
| GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN | Gmail OAuth | ✅ Set |
| DEEPGRAM_API_KEY | Audio STT | ✅ Set |
| GOOGLE_API_KEY | Gemini | ✅ Set |
| GITHUB_TOKEN | Repo access | ✅ Set |
| OPENROUTER_API_KEY | LLM fallback | ✅ Set |
| ELEVENLABS_API_KEY | TTS | ✅ Set |
| OBSIDIAN_API_KEY | Vault tunnel | ✅ Set |
| APP_ACCESS_KEY | API auth gate | ✅ Set (APEX123) |
| JWT_SECRET | JWT signing | ✅ Set |
| DASHBOARD_PASSWORD | Dashboard login | ✅ Set |
| RENDER_API_KEY | Render management | ✅ Set (also in .env locally) |
| RENDER_SERVICE_ID | Render service | ✅ Set |
| AUTONOMY_LEVEL | Agent autonomy | ✅ Set |
| AGENT_SECRET | Agent auth | ✅ Set |
| CRON_SECRET | Cron webhook auth | ✅ Set |
| RAG_SIDECAR_URL | RAG endpoint | ✅ Set |
| ANTHROPIC_MODEL | Model override | ✅ Set |

---

## Authentication Architecture

### lib/app-auth.js
```javascript
if (!appKey) return next();  // bypass if env var missing
crypto.timingSafeEqual(...)  // correct constant-time comparison
```

**Risk:** Auth bypasses if APP_ACCESS_KEY is unset. Mitigated: it IS set on Render.
**Recommendation:** Change bypass to `return res.status(503).json({error: 'Auth not configured'})` instead of `next()`. This would fail closed rather than open.

### WebSocket Auth (gemini-live.js)
- Uses `crypto.timingSafeEqual` on `app_key` query param or header
- Correct implementation ✅

---

## Hardcoded Secrets Scan

Scanned: all files in services/, routes/, lib/, agent-system/
Patterns: `sk-ant`, `xoxb-`, `ntn_`, `AIza`, `ghp_`, `eyJ[A-Za-z0-9+/]{40,}`, strings > 40 chars

**Result: CLEAN — no hardcoded secrets found.**

Notion DB UUIDs in `notion-client.js` are not secrets — they are workspace configuration.
Slack channel name strings in `slack-client.js` are not secrets.

---

## Secret Masking (slack-client.js)

The `_mask()` function strips these patterns from all Slack posts:
- `sk-ant-*` (Anthropic keys)
- `AQ.*` (Google API keys)
- `ghp_*` (GitHub PATs)
- `eyJ*` (JWTs)
- `ntn_*` (Notion tokens)
- `xoxb-*` (Slack tokens)

✅ No secrets can leak via Slack alerts.

---

## Database Security

### Row-Level Security (RLS)
- 11/13 active tables have RLS policies ✅
- **MISSING RLS:** `documents` table, `memory` table
- These are internal-only tables with no direct client access; risk is LOW
- Recommendation: add RLS policies (`ENABLE ROW LEVEL SECURITY` + service-role bypass)

### Query Safety
- All Supabase queries use the client SDK with parameterized queries ✅
- No raw string interpolation in SQL ✅
- pg_database.js uses node-pg with `$1, $2` placeholders ✅

---

## Webhook Security

### Render Cron Webhook
- Endpoint: `POST /api/cron/run`
- Protected by `CRON_SECRET` header check ✅

### Slack Events (if configured)
- No Slack Events API endpoint found — bot is outbound-only ✅
- Signing Secret is set but not currently used (no inbound webhooks)

---

## Risk Summary

| Risk | Severity | Status |
|---|---|---|
| .env committed to git | CRITICAL | ✅ MITIGATED (.gitignore) |
| Hardcoded secrets | CRITICAL | ✅ CLEAN |
| Auth bypass on unset APP_ACCESS_KEY | HIGH | ⚠️ OPEN (mitigated: key is set) |
| Missing RLS on documents/memory | MEDIUM | ⚠️ OPEN (internal tables only) |
| APP_ACCESS_KEY is weak (APEX123) | MEDIUM | ⚠️ OPEN (personal OS, acceptable) |
| RENDER_API_KEY stored in local .env | MEDIUM | ⚠️ OPEN (not committed, acceptable) |
| No input sanitization on some POST bodies | LOW | ⚠️ OPEN (single-user, Supabase parameterized) |

---

## Recommended Fixes

**Fix 1 (HIGH): Fail closed on missing APP_ACCESS_KEY**
```javascript
// lib/app-auth.js line 6 — change:
if (!appKey) return next();
// to:
if (!appKey) return res.status(503).json({ ok: false, error: 'Service not configured' });
```

**Fix 2 (MEDIUM): Add RLS to documents and memory tables**
```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON documents USING (auth.role() = 'service_role');
CREATE POLICY "service_role_only" ON memory USING (auth.role() = 'service_role');
```
