# Route Audit — Phase 3
*Audited: 2026-06-05*

## Summary: 86 endpoints + 1 WebSocket. 100% authenticated. 0 open routes.

---

## Authentication

| File | Routes | Auth Middleware | Open Routes |
|---|---|---|---|
| agents.js | 8 | `_auth` (X-App-Key) | 0 |
| communications.js | 3 | `_auth` | 0 |
| finance.js | 4 | `_auth` | 0 |
| gemini-live.js | 1 WS | Custom app_key (timingSafeEqual) | 0 |
| health.js | 11 | `_auth` | 0 |
| integrations.js | 17 | `requireAppAccess` | 0 |
| intelligence.js | 8 | `requireAppAccess` | 0 |
| life.js | 27 | `_auth` | 0 |
| operations.js | 5 | `_auth` | 0 |
| tts-gemini.js | 2 | `_auth` | 0 |

**Auth bypass condition:** `lib/app-auth.js` line 6 — if `APP_ACCESS_KEY` env var is not set, middleware calls `next()` without checking. APEX123 is the current value. This is intentional for local dev but must be set on Render. ✅ Confirmed set.

---

## Rate Limiting

Only two rate limits are applied globally in server.js:
- `/api/` — 100 req/min (all API routes)
- `/api/master/` — 5 req/min (long-running pipeline routes)

No per-route rate limits. Adequate for a personal AI OS with single-user traffic.

---

## Input Validation Assessment

### WELL VALIDATED
- `POST /agents/invoke` — required fields + 8000-char length cap
- `POST /agents/domain/invoke` — required fields + type checks + array validation
- `POST /health/*` — numeric type checks, required fields
- `POST /university/assignments` — YYYY-MM-DD regex date validation
- `POST /operations/clients` — email regex + numeric + date format
- `POST /tts/gemini` — text length capped at 4000 chars
- `POST /slack/alert` — required title + severity enum whitelist
- WebSocket gemini-live — timing-safe auth + MIME type check on audio

### MISSING VALIDATION (medium risk)
| Route | Missing |
|---|---|
| POST /projects (integrations.js) | No body validation at all |
| POST /notion/log-decision | No body validation |
| POST /notion/knowledge-request | No body validation |
| GET /tasks?domain= | domain param unvalidated |
| GET /agents?category= | category param unvalidated |
| GET /intelligence/news?category= | category param unvalidated |
| POST /habits/:id/toggle | habit_id path param unvalidated |

Risk level: **LOW** — all routes are single-user auth-gated. Supabase client parameterizes queries preventing SQL injection. Unvalidated inputs may cause Supabase errors but won't escape to shell or DB.

---

## Error Handling

All routes follow consistent pattern:
```javascript
try { ... } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
```
No stack traces exposed. `e.message` is safe (Supabase/Notion errors don't contain secrets).

---

## Duplicate Routes

`routes/life.js` defines 27 routes of which 12 are aliases (`/life/*` mirrors `/*`). These are intentional for dashboard compatibility — not a security issue.

---

## Unreachable Routes

None identified. All files in routes/ are auto-loaded by `_loadAgentRoutes()` except:
- `gemini-live.js` — explicitly attached via `require('./routes/gemini-live').attach(server, {...})`
- `tts-gemini.js` — explicitly mounted: `app.use('/api', require('./routes/tts-gemini'))`

---

## Issues Ranked by Priority

| Priority | Issue | Fix |
|---|---|---|
| HIGH | APP_ACCESS_KEY bypass if unset | Already set on Render ✅ |
| MEDIUM | POST /projects has no body validation | Add `if (!req.body.name) return 400` |
| MEDIUM | POST /notion/* has no body validation | Add required field checks |
| LOW | Unvalidated query params (domain, category, status) | Whitelist check or ignore |
| LOW | 12 aliased /life/* routes | Refactor to shared handler (code smell only) |
| INFO | No per-route rate limits | Acceptable for single-user personal OS |
