# Config Hardening — Phase 19
*Implemented: 2026-06-05*

---

## A. Hardcoded Service URL

**Problem:** `services/slack/slack-agents.js` line ~80 had `https://ai-os-server-jx20.onrender.com` hardcoded. Breaks if service URL changes.

**Root Cause:** URL was copied directly during development.

**Fix:**
```javascript
// Before:
contextBlock('Deployed to Render → https://ai-os-server-jx20.onrender.com'),
// After:
contextBlock(`Deployed to Render → ${process.env.RENDER_EXTERNAL_URL || 'https://ai-os-server-jx20.onrender.com'}`),
```

**Verification:** `node --check services/slack/slack-agents.js` → SYNTAX OK.

**Risk:** Zero — fallback preserves existing behavior.

**Rollback:** Revert to hardcoded string.

---

## B. Environment Validation at Startup

**Finding:** `server.js` lines 7–16 already has `_validateEnv()` that:
- FATAL exits on missing: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- WARNs on missing: `GITHUB_TOKEN`, `CRON_SECRET`

**Gap:** `NOTION_API_KEY` and `SLACK_BOT_TOKEN` not mentioned — startup gives no indication when these are missing.

**Fix:** Added to `_validateEnv()` in server.js:
```javascript
if (!process.env.NOTION_API_KEY)  console.warn('[STARTUP] NOTION_API_KEY not set — Notion integration disabled');
if (!process.env.SLACK_BOT_TOKEN) console.warn('[STARTUP] SLACK_BOT_TOKEN not set — Slack integration disabled');
```

**Why warn, not fatal:** Both are optional. System operates fully without Notion/Slack — just without those integrations. Fatal exit would break Render restarts if a token were accidentally removed.

**Verification:** `node --check server.js` → SYNTAX OK.

**Risk:** Zero — adds two console.warn calls.

---

## B2. lib/app-auth.js — already hardened (previous session)

```javascript
// Now fails closed if APP_ACCESS_KEY missing:
if (!appKey) return res.status(503).json({ ok: false, error: 'Service not configured — APP_ACCESS_KEY missing' });
```
No further action needed.

---

## C. Secret Inventory

See `reports/secret-inventory.md`.

---

## Remaining Configuration Risks

| Risk | Severity | Status |
|---|---|---|
| RENDER_EXTERNAL_URL not set on Render | LOW | ⚠️ Fallback to hardcoded URL handles this |
| APP_ACCESS_KEY is weak (APEX123) | MEDIUM | ⚠️ OPEN — personal OS, acceptable |
| No .env.example file | LOW | ⚠️ OPEN — useful for onboarding |
| Slack channel names must match workspace | LOW | ⚠️ OPEN — verify all 10 channels exist |
