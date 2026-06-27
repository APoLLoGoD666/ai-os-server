# Blocker Register
_Generated: 2026-06-08 | Phase 3 — Phase J: Blocker Resolution_

---

## Summary

All 6 blocked items require user action (credentials not derivable from code).
No blocked items can be resolved without human input.

---

## B-01: Gmail OAuth Expired

| Field | Value |
|-------|-------|
| Service | Gmail API |
| Variable | GMAIL_REFRESH_TOKEN |
| Expiry | 2026-05-21 (18 days ago at certification) |
| Impact | All /api/emails/* endpoints fail; email read/write dead |
| Priority | IMMEDIATE |
| Time to fix | 5 minutes |
| Fix | Run `node get_gmail_token.js` on local machine, copy token to Render env vars |
| Recurrence | Quarterly — calendar reminder required |
| Validation | `GET /api/emails/inbox` → HTTP 200 (currently returns auth error) |

---

## B-02: DATABASE_URL Missing

| Field | Value |
|-------|-------|
| Service | Supabase Postgres (direct pg pool) |
| Variable | DATABASE_URL |
| Current value | Placeholder `[YOUR-PASSWORD]` |
| Impact | Raw SQL queries fail; pg pool unavailable. Supabase JS client works fine. |
| Priority | THIS WEEK |
| Time to fix | 10 minutes |
| Fix | Supabase dashboard → Settings → Database → Connection string → replace `[YOUR-PASSWORD]` → add to Render env vars |
| Validation | `GET /api/intelligence/self-check` → postgres check returns `ok: true` |
| Risk | LOW URGENCY — Supabase JS client covers all current use cases |

---

## B-03: NOTION_API_KEY Missing

| Field | Value |
|-------|-------|
| Service | Notion API |
| Variable | NOTION_API_KEY |
| Current value | Not set |
| Impact | Notion integration dead; /api/notion/* endpoints fail |
| Priority | THIS WEEK |
| Time to fix | 5 minutes |
| Fix | Notion dashboard → Integrations → Create integration → copy token → add to Render env vars |
| Validation | `GET /api/notion/pages` → HTTP 200 |

---

## B-04: SLACK_BOT_TOKEN Missing

| Field | Value |
|-------|-------|
| Service | Slack API |
| Variable | SLACK_BOT_TOKEN |
| Current value | Not set |
| Impact | Slack notifications dead; /api/slack/* endpoints fail |
| Priority | THIS WEEK |
| Time to fix | 5 minutes |
| Fix | api.slack.com/apps → create/select app → OAuth & Permissions → copy Bot User OAuth Token → add to Render env vars |
| Validation | POST to Slack notification endpoint → message appears in Slack |

---

## B-05: OBSIDIAN_URL Missing

| Field | Value |
|-------|-------|
| Service | Obsidian local vault (via Cloudflare tunnel) |
| Variable | OBSIDIAN_URL |
| Current value | Not set |
| Impact | Vault reads/writes fail from server; daily briefings may not write to Obsidian |
| Priority | THIS WEEK |
| Time to fix | 15 minutes |
| Fix | Run `cloudflared tunnel --url http://localhost:27123` on local machine, copy HTTPS URL → add to Render env vars as OBSIDIAN_URL |
| Note | URL changes on each tunnel restart — requires re-update or named tunnel |
| Validation | `GET /api/obsidian/ping` → HTTP 200 |

---

## B-06: SENTRY_DSN Missing (Informational)

| Field | Value |
|-------|-------|
| Service | Sentry error monitoring |
| Variable | SENTRY_DSN |
| Current value | Not set |
| Impact | No error reporting to Sentry; does not affect operations |
| Priority | LOW / OPTIONAL |
| Time to fix | 5 minutes |
| Fix | sentry.io → create project → DSN → add to Render env vars |
| Validation | Trigger test error, see in Sentry |

---

## Resolution Matrix

| ID | Blocker | Can be auto-resolved? | Human action required |
|----|---------|----------------------|----------------------|
| B-01 | Gmail OAuth | No — requires browser OAuth flow | Yes |
| B-02 | DATABASE_URL | No — requires password from Supabase dashboard | Yes |
| B-03 | NOTION_API_KEY | No — requires Notion account access | Yes |
| B-04 | SLACK_BOT_TOKEN | No — requires Slack app configuration | Yes |
| B-05 | OBSIDIAN_URL | No — requires local tunnel on user's machine | Yes |
| B-06 | SENTRY_DSN | No — requires Sentry account | Yes (optional) |

**All 6 blockers require user action. None can be resolved programmatically.**
