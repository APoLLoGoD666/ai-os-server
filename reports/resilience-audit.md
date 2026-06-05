# Resilience Audit — Phase 12
*Audited: 2026-06-05 | Source: services/notion/notion-client.js, services/slack/slack-client.js, agent-system/orchestrator.js, server.js*

---

## External Dependency Matrix

| Dependency | Timeout | Retry | Backoff | Circuit Breaker | Structured Logging | Correlation ID |
|---|---|---|---|---|---|---|
| Anthropic Claude (SDK) | SDK default | ✅ 3 per agent (orchestrator) | ✅ exponential via circuit breaker | ✅ 5 failures → cooldown | ⚠️ console only | ⚠️ taskId only |
| Notion API | ❌ None | ✅ 3 retries | ✅ 500ms × 2^i | ❌ None | ❌ Silent | ❌ None |
| Slack API | ❌ None | ✅ 4 retries (ratelimited only) | ✅ 1000ms × 2^i | ❌ None | ⚠️ 2 console.warn | ❌ None |
| Supabase (JS SDK) | SDK default | ✅ SDK built-in | ✅ SDK built-in | ❌ None | ⚠️ error.message | ⚠️ Partial |
| Supabase (node-pg) | 65s keepAlive | ❌ None | ❌ None | ❌ None | ✅ pgPool error events | ❌ None |
| Gmail OAuth | None | ❌ None | ❌ None | ❌ None | ⚠️ console.warn | ❌ None |
| Firecrawl | SDK default | ✅ SDK built-in | ✅ SDK built-in | ❌ None | ⚠️ error.message | ❌ None |
| Playwright browser | None | ❌ None | ❌ None | ❌ None | ✅ allowlist enforced | ❌ None |
| Obsidian tunnel | None | ❌ None | ❌ None | ❌ None | ⚠️ console.warn | ❌ None |
| GitHub API | None | ❌ None | ❌ None | ❌ None | ⚠️ console.warn | ❌ None |
| Gemini WebSocket | None | ⚠️ Reconnect on error | ❌ None | ❌ None | ⚠️ console.error | ❌ None |
| Render API | None | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| OpenRouter | None | ❌ None | ❌ None | ❌ None | ⚠️ error.message | ❌ None |

---

## Detailed Analysis

### Anthropic Claude — BEST IN CLASS
```
Circuit breaker: opens after 5 consecutive failures
Cooldown: exponential (min 1s, max 5 minutes)
Agent retry: max 3 attempts per agent role; on failure injects error context (Reflexion)
Model escalation: Haiku → Sonnet → Opus on developer agent retry
Budget cap: $2 USD per pipeline run
```
**Verdict: PRODUCTION_READY**

### Notion API — ADEQUATE
```
Retry: 3 attempts, 500ms × 2^i backoff, respects retry-after header
Rate limit: MAX_CONCURRENT=3 (matches Notion's 3 req/s limit)
Timeout: NONE — Node.js default ~120s
Circuit breaker: NONE — persistent failure queues requests indefinitely
```
**Critical gap:** No timeout means one hung connection blocks a concurrency slot for up to 2 minutes. Under heavy use, all 3 slots could be blocked by stalled connections.

**Fix:**
```javascript
// notion-client.js — add to getClient() call options
const notion = new Client({ auth, timeoutMs: 30000 });
```

### Slack API — ADEQUATE
```
Retry: 4 attempts, 1000ms × 2^i backoff, respects retry_after
Dedup: 15-min TTL prevents alert storms
Timeout: NONE
Network errors: NOT retried — single attempt, returns {ok:false}
```
**Gap:** `ECONNRESET`/`ETIMEDOUT` on the HTTPS request are not retried. A transient network hiccup silently drops the message.

**Fix:**
```javascript
// slack-client.js _slackPost() — add timeout
req.setTimeout(10000, () => { req.destroy(new Error('timeout')); });
```
And in `_postWithRetry`, add network error to retry condition:
```javascript
if (result.error === 'ratelimited' || result.error === 'timeout') { ... retry }
```

### Supabase — ADEQUATE
- JS SDK: built-in retry + backoff ✅
- node-pg pool: keepAlive 65s (matches Render proxy timeout) ✅
- No circuit breaker — if Supabase goes down, all requests fail synchronously

### Obsidian Tunnel — FRAGILE
- No retry, no timeout, no circuit breaker
- Briefing/wiki writes silently fail if tunnel is down
- Non-fatal by design — acceptable, but no alerting when tunnel is persistently down

### Gmail — FRAGILE
- No retry, no timeout
- Token refresh is manual (`get_gmail_token.js`)
- Email queue silently stalls on OAuth expiry

---

## Timeout Summary

Only explicit timeouts found in server.js:
- Line 52: `setTimeout(() => process.exit(1), 1000)` — Sentry flush on crash
- Line 11223: `setTimeout(() => agentLib.syncFromGitHub(), 8000)` — startup defer
- Line 11302: `setTimeout(() => checkPendingMasterTasks(), 30000)` — startup defer
- Server keep-alive: `server.keepAliveTimeout = 65000` ✅ (matches Render's 60s proxy)

**No runtime request timeouts on outbound HTTP calls to Notion, Slack, GitHub, or Obsidian.**

---

## Graceful Shutdown

```javascript
SIGTERM/SIGINT →
  kill Ruflo daemon
  server.close() + drain in-flight requests
  15s force-exit timeout
```
✅ Correctly handles Render's graceful shutdown signal.

---

## Missing Patterns

### No Correlation IDs on External Calls
None of the outbound HTTP calls carry a correlation ID. When a Notion/Slack call fails, there is no way to correlate it with the originating request in Render logs.

**Recommendation:** Pass `x-request-id` header (already set by request-tracking middleware in server.js) to all outbound calls.

### No Structured Logging
All logging is ad-hoc `console.warn/error` with string interpolation. No JSON log format, no severity levels that log aggregators can filter.

**Recommendation:** Replace all `console.warn('[notion]', e.message)` with a thin `log(level, module, msg, meta)` wrapper that outputs JSON.

---

## Risk Summary

| Risk | Severity | Affected Systems |
|---|---|---|
| No timeout on Notion HTTP calls | MEDIUM | Notion all operations |
| No timeout on Slack HTTP calls | MEDIUM | All Slack posts |
| Network errors not retried on Slack | MEDIUM | All Slack posts |
| No circuit breaker on Notion | MEDIUM | Could queue-flood on outage |
| No circuit breaker on Supabase | MEDIUM | All DB operations fail hard |
| Obsidian tunnel no retry | LOW | Briefings, wiki, vault writes |
| Gmail no retry + manual token refresh | LOW | Email queue stall |
| No correlation IDs | LOW | Incident diagnosis difficulty |
| No structured logging | LOW | Log aggregation quality |
