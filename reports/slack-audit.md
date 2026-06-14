# Slack Audit — Phase 9
*Audited: 2026-06-05 | Source: services/slack/* inspection*

---

## Channels

10 channels defined in `slack-client.js` lines 8–19. All have env var overrides with hardcoded fallbacks.

| Key | Default Name | Env Var Override | Purpose |
|---|---|---|---|
| executive | apex-executive | SLACK_CHANNEL_EXECUTIVE | Daily briefings, critical escalations |
| alerts | apex-alerts | SLACK_CHANNEL_ALERTS | Critical/error/warning alerts, API quota |
| agents | apex-agents | SLACK_CHANNEL_AGENTS | Agent run threads |
| projects | apex-projects | SLACK_CHANNEL_PROJECTS | Project updates, lead pipeline |
| finance | apex-finance | SLACK_CHANNEL_FINANCE | Budget alerts |
| content | apex-content | SLACK_CHANNEL_CONTENT | Content pipeline updates |
| research | apex-research | SLACK_CHANNEL_RESEARCH | Research outputs |
| health | apex-health | SLACK_CHANNEL_HEALTH | Health anomalies |
| system | apex-system-health | SLACK_CHANNEL_SYSTEM | System health checks every 6h |
| weeklyReview | apex-weekly-review | SLACK_CHANNEL_WEEKLY | Weekly review posts |

**All 10 channels use default names.** No SLACK_CHANNEL_* env vars are currently set on Render — channels must be created in Slack matching the default names, or env vars added.

---

## Posting Functions

| Function | File | Channel | Deduped | Notes |
|---|---|---|---|---|
| postMessage(channel, text, blocks, threadTs) | slack-client.js | Any | No | Base primitive |
| postToChannel(channelKey, text, blocks, threadTs) | slack-client.js | By key | No | Resolves key → name |
| postDeduped(key, channelKey, text, blocks) | slack-client.js | By key | 15min TTL | Prevents alert storms |
| alertCritical(title, details, system) | slack-alerts.js | alerts + executive | Yes (deduped) | Also posts to executive |
| alertError(title, details, system) | slack-alerts.js | alerts | Yes | 15min dedup |
| alertWarning(title, details) | slack-alerts.js | alerts | Yes | |
| alertSuccess(title, details) | slack-alerts.js | alerts | No | |
| alertHealthAnomaly(metric, value, threshold, domain) | slack-alerts.js | health (+ executive if streak) | Yes | |
| alertBudgetThreshold(category, pct, amount) | slack-alerts.js | finance | Yes (bucketed by 10%) | |
| alertApiQuota(api, model, pct) | slack-alerts.js | alerts | Yes (bucketed by 5%) | |
| alertRenderDeploy(service, status, url) | slack-alerts.js | system | No | |
| notifyRunStart(opts) | slack-agents.js | agents | No | Stores thread ts |
| notifyRunComplete(opts) | slack-agents.js | agents (threaded) | No | |
| notifyRunFailed(opts) | slack-agents.js | agents + alerts | No | |
| notifyPipelineStart(opts) | slack-agents.js | agents | No | |
| notifyPipelineComplete(opts) | slack-agents.js | agents (threaded) | No | |
| postDailyBriefing(data) | slack-briefings.js | executive | No | |
| postWeeklyReview(data) | slack-briefings.js | weeklyReview | No | |
| postSystemHealthSummary(data) | slack-briefings.js | system | No | |
| postProjectUpdate(data) | slack-briefings.js | projects | No | |
| runHealthCheck(metrics) | slack-system-health.js | system + alerts | Partial | Thresholds trigger alerting |

---

## Retry Logic

```
Max retries: 4
Backoff: 2^i × 1000ms  (1s → 2s → 4s → 8s)
Triggers: result.error === 'ratelimited' only
Retry-after: if result.retry_after present, uses retry_after × 1000ms
Non-ratelimited errors: logged via console.warn, returned {ok:false} — NOT retried
```

**Gap:** Network errors (ECONNRESET, ETIMEDOUT) are not retried — they return `{ok:false, error}` after one attempt. Slack API is generally reliable but a transient network blip would lose the message silently.

---

## Deduplication

```javascript
DEDUP_TTL = 15 * 60 * 1000  // 15 minutes
_isDup(key) → checks Map timestamp; returns true if elapsed < TTL
```

Dedup key patterns per alert type:
- Critical: `critical:{title}` + `exec:{key}` (executive channel)
- Error: `error:{title}`
- Warning: `warning:{title}`
- Health anomaly: `health:{metric}`; executive escalation if `domain === 'streak'`
- Budget: `budget:{category}:{Math.floor(pct/10)}` — buckets by 10% increments
- API quota: `quota:{api}:{model}:{Math.floor(percentUsed/5)}` — buckets by 5% increments

**This design prevents storms on recurring failures but allows recovery notifications** (new key when title changes).

---

## Thread Management (slack-agents.js)

```javascript
_runThreads: Map<runId, {ts: string, channel: string}>
```

- `notifyRunStart()` → posts to `agents` channel, stores `{ts, channel}` in `_runThreads`
- `notifyRunComplete()` → if thread found, posts as reply to original ts; deletes entry
- `notifyRunFailed()` → posts to both `agents` and `alerts` channels

**Gap:** `_runThreads` is in-memory only. On Render cold restart, all in-flight run threads are lost — completions post as new messages instead of replies. For a personal OS with infrequent restarts, this is acceptable.

---

## Escalation Paths

```
CRITICAL alert  → #apex-alerts + #apex-executive
ERROR alert     → #apex-alerts
WARNING alert   → #apex-alerts
Health anomaly  → #apex-health  (+#apex-executive if health domain === 'streak')
Budget >X%      → #apex-finance
API quota >80%  → #apex-alerts (warning) or #apex-alerts (critical at 95%)
Deploy event    → #apex-system-health
Agent failed    → #apex-agents + #apex-alerts
Daily briefing  → #apex-executive
Weekly review   → #apex-weekly-review
System health   → #apex-system-health
```

---

## Secret Masking

All outbound message text passes through `_mask()`:
- `sk-ant-api\S+` → `[ANTHROPIC_KEY]`
- `AQ\.[A-Za-z0-9_-]{20,}` → `[GOOGLE_KEY]`
- `ghp_[A-Za-z0-9]{36}` → `[GITHUB_TOKEN]`
- `eyJ[A-Za-z0-9._-]{50,}` → `[JWT]`
- `ntn_[A-Za-z0-9]{40,}` → `[NOTION_KEY]`
- `xoxb-[A-Za-z0-9-]+` → `[SLACK_TOKEN]`

✅ No secrets can leak via Slack.

---

## Hardcoded Values

| Location | Value | Issue |
|---|---|---|
| slack-agents.js line ~80 | `https://ai-os-server-jx20.onrender.com` | Deployment URL hardcoded in notifyPipelineComplete() |
| slack-alerts.js line 6 | Severity colors (#FF0000, #FF6B00, etc.) | Intentional, not an issue |

**The hardcoded Render URL in slack-agents.js will break if the service URL changes.** Replace with `process.env.RENDER_EXTERNAL_URL || 'https://ai-os-server-jx20.onrender.com'`.

---

## Timeout

**None set.** Relies on Node.js default HTTPS timeout. Same risk as Notion: a hanging Slack API call won't fail fast.

**Recommendation:** Add `req.setTimeout(10000, ...)` in `_slackPost()`.

---

## Risk Summary

| Risk | Severity | Status |
|---|---|---|
| Network errors not retried (non-ratelimited) | MEDIUM | ⚠️ OPEN |
| No explicit HTTPS timeout | MEDIUM | ⚠️ OPEN |
| Hardcoded Render URL in slack-agents.js | LOW | ⚠️ OPEN |
| Thread state lost on restart | LOW | ℹ️ Acceptable for personal OS |
| Channel names must match Slack workspace | LOW | ⚠️ Verify 10 channels exist or set SLACK_CHANNEL_* env vars |
| No timeout on `_slackPost` HTTPS request | MEDIUM | ⚠️ OPEN |
