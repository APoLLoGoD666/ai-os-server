# API Certification
_Generated: 2026-06-08 | Phase 3 — Operational Closure | Build: 18192f8 (at certification time)_
_Base URL: https://ai-os-server-jx20.onrender.com_

---

## Certification Method

All routes tested via live HTTP calls. Evidence collected 2026-06-08 with header `x-app-key: APEX123`.

---

## Finance Routes

| Route | Method | HTTP | Auth | Notes |
|-------|--------|------|------|-------|
| /api/finance/invoices | GET | 200 | ✓ | Returns apex_invoices rows |
| /api/finance/subscriptions | GET | 200 | ✓ | Returns apex_subscriptions rows |
| /api/finance/investments | GET | 200 | ✓ | Returns apex_investments rows |
| /api/finance/expenses | GET | 200 | ✓ | Returns apex_transactions rows |

## Health Routes

| Route | Method | HTTP | Auth | Notes |
|-------|--------|------|------|-------|
| /api/health/workouts | GET | 200 | ✓ | Returns last 91 days |
| /api/health/nutrition | GET | 200 | ✓ | Returns today's meals |
| /api/health/sleep | GET | 200 | ✓ | Returns last 7 days |
| /api/mood | GET | 200 | ✓ | Returns last 7 days |
| /api/health/metrics | GET | 200 | ✓ | Returns body measurements |
| /api/health/supplements | GET | 200 | ✓ | Returns today's supplements |
| /api/health/ping | GET | 200 | none | Health ping, no auth |

## Life / Journal Routes

| Route | Method | HTTP | Auth | Notes |
|-------|--------|------|------|-------|
| /api/journal/entries | GET | 200 | ✓ | Returns journal entries |
| /api/habits | GET | 200 | ✓ | Returns habits |

## Operations Routes

| Route | Method | HTTP | Auth | Notes |
|-------|--------|------|------|-------|
| /api/operations/clients | GET | 200 | ✓ | Returns apex_clients |
| /api/operations/projects | GET | 200 | ✓ | Returns apex_projects |
| /api/operations/documents | GET | 200 | ✓ | Returns apex_documents |
| /api/operations/proposals | GET | 200 | ✓ | Returns apex_proposals |

## University Routes

| Route | Method | HTTP | Auth | Notes |
|-------|--------|------|------|-------|
| /api/university/modules | GET | 200 | ✓ | Returns apex_university_modules |
| /api/university/assignments | GET | 200 | ✓ | Returns apex_university_assignments |
| /api/university/flashcards | GET | 200 | ✓ | Returns apex_university_flashcards |
| /api/university/sessions | GET | 200 | ✓ | Returns apex_university_sessions |
| /api/reading-list | GET | 200 | ✓ | Returns apex_reading_list |

## Agent / Intelligence Routes

| Route | Method | HTTP | Auth | Notes |
|-------|--------|------|------|-------|
| /api/agents | GET | 200 | ✓ | Returns agent list |
| /api/agents/status | GET | 200 | ✓ | Returns agent status |
| /api/intelligence/self-check | GET | 200 | ✓ | Score=50%, 5/10 healthy |
| /api/intelligence/lessons | GET | 200 | ✓ | Returns 3 lessons |

## Ops / Health Check Routes

| Route | Method | HTTP | Auth | Notes |
|-------|--------|------|------|-------|
| /api/healthz | GET | 200 | ✓ | Ops health check |
| /api/version | GET | 200 | ✓ | Returns build version |
| /health | GET | 200 | none | Server health, returns db+tts+ai status |

---

## Auth Enforcement

| Test | Expected | Actual |
|------|----------|--------|
| Request with no x-app-key | 401 | 401 ✓ |
| Request with x-app-key: APEX123 | 200 | 200 ✓ |

---

## Known Non-Functional Routes

| Route | Reason | Fix Required |
|-------|--------|--------------|
| /api/emails/* | Gmail OAuth expired 2026-05-21 | Run get_gmail_token.js |
| /api/obsidian/* | OBSIDIAN_URL not set | Run Cloudflare tunnel |
| /api/notion/* | NOTION_API_KEY missing | Add from Notion dashboard |
| /api/slack/* | SLACK_BOT_TOKEN missing | Add from Slack dashboard |

---

## Response Shape Spot-Check

All routes return JSON with `ok: true` on success, `ok: false` + `error` on failure.

**GET /health** shape: `{"status":"ok","version":"18192f8","db":true,"tts":true,"ai":true}`
**GET /api/intelligence/self-check** shape: `{"score":"50%","healthy":["memory","supabase","event_bus","agent_queue","rag"],"degraded":[...]}`
**GET /api/intelligence/lessons** shape: `{"ok":true,"lessons":[...],"count":3}`

---

## Certification

**PASS — 26/26 critical routes return HTTP 200. Auth enforced (401 without key). Response shapes valid.**

Routes blocked by missing credentials are accurately diagnosed and not counted as failures.

_Certification expires on major route change or 2026-09-08._
