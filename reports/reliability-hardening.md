# Reliability Hardening — Phase 16
*Implemented: 2026-06-05*

---

## Pre-Implementation Findings (from resilience-audit.md)

| Dependency | Timeout | Retry | Circuit Breaker | Network Error Retry |
|---|---|---|---|---|
| Notion | ❌ None | ✅ 3 retries | ❌ None | N/A (SDK) |
| Slack | ❌ None | ✅ 4 retries (429 only) | ❌ None | ❌ Single attempt |
| Anthropic | SDK default | ✅ 3/agent | ✅ Exists | N/A (SDK) |
| Supabase | SDK default | ✅ SDK | ❌ None | N/A (SDK) |
| Gmail | ❌ None | ❌ None | ❌ None | ❌ None |
| Obsidian | ❌ None | ❌ None | ❌ None | ❌ None |
| GitHub | ❌ None | ❌ None | ❌ None | ❌ None |
| Gemini | ❌ None | ⚠️ reconnect | ❌ None | Partial |
| OpenRouter | ❌ None | ❌ None | ❌ None | ❌ None |
| Firecrawl | SDK default | ✅ SDK | ❌ None | N/A |
| ElevenLabs | ❌ None | ❌ None | ❌ None | ❌ None |

---

## A. Notion Timeout Protection

**Problem:** No timeout on Notion HTTPS calls — a hung connection blocks one of 3 concurrency slots for up to 120s.

**Root Cause:** `new Client({ auth: NOTION_API_KEY })` — no `timeoutMs` option set. Node.js default HTTPS timeout is ~120s.

**Fix:** `services/notion/notion-client.js` line 25:
```javascript
// Before:
_client = new Client({ auth: NOTION_API_KEY });
// After:
_client = new Client({ auth: NOTION_API_KEY, timeoutMs: 30000 });
```

**Verification:** `node --check services/notion/notion-client.js` → SYNTAX OK. SDK `timeoutMs` parameter is documented in `@notionhq/client` v2+.

**Risk:** If a Notion operation legitimately takes >30s (bulk query), it will now timeout. Bulk operations on Notion are rare and should be paginated. No breaking change for normal use.

**Rollback:** Remove `timeoutMs: 30000` from constructor.

---

## B. Notion Circuit Breaker

**Problem:** Persistent Notion API outage causes queue to back up indefinitely — requests accumulate in `_queue` with no escape valve.

**Root Cause:** `enqueue()` always accepts new work regardless of failure state.

**Fix:** `services/notion/notion-client.js` — added `_cb` circuit breaker:
```javascript
// States: CLOSED (normal) → OPEN (5 failures, 60s cooldown) → HALF_OPEN (probe) → CLOSED
CB_THRESHOLD = 5, CB_COOLDOWN = 60000
```
- `_cbCheck()` — called before queuing; throws `notion_circuit_open` if OPEN
- `_cbSuccess()` — resets counter; logs recovery
- `_cbFailure(err)` — increments counter; opens breaker at threshold; logs
- Wired into `enqueue()` — each queued task tracks its own success/failure

**Verification:** `node --check services/notion/notion-client.js` → SYNTAX OK

**Risk:** During 60s cooldown, all Notion calls fail immediately with `notion_circuit_open`. Routes return 503. Acceptable — better than a hung queue.

**Rollback:** Remove `_cb`, `_cbCheck/Success/Failure`, and revert `enqueue()`.

---

## C. Slack Timeout Protection

**Problem:** No timeout on Slack HTTPS calls — a hung connection blocks silently.

**Root Cause:** `https.request(...)` with no `setTimeout` call.

**Fix:** `services/slack/slack-client.js` — added after `req.on('error', reject)`:
```javascript
req.setTimeout(10000, () => { req.destroy(new Error('slack_timeout')); });
```

**Verification:** `node --check services/slack/slack-client.js` → SYNTAX OK. `req.destroy(err)` triggers the `'error'` event → caught by `req.on('error', reject)` → converted to `{ ok: false, error: 'slack_timeout' }` by retry wrapper's `.catch`.

**Risk:** Slack operations >10s will now fail and retry. Slack API is well under 10s in normal conditions. No breaking change.

**Rollback:** Remove the `req.setTimeout(...)` line.

---

## D. Slack Network Error Retry

**Problem:** ECONNRESET, ETIMEDOUT, EPIPE, ENOTFOUND were caught but NOT retried — message silently dropped.

**Root Cause:** `_postWithRetry` only checked `result.error === 'ratelimited'` for retry.

**Fix:** `services/slack/slack-client.js`:
```javascript
const _retryable = new Set(['ratelimited', 'slack_timeout', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN']);
if (_retryable.has(result.error)) { ... retry with backoff + structured log }
```

**Verification:** `node --check services/slack/slack-client.js` → SYNTAX OK

**Risk:** Previously-dropped messages will now be retried up to 4 times. This is the correct behavior. No breaking change.

**Rollback:** Remove `_retryable` Set and revert to `result.error === 'ratelimited'` check.

---

## Post-Implementation State

| Dependency | Timeout | Retry | Circuit Breaker | Network Error Retry |
|---|---|---|---|---|
| Notion | ✅ 30s | ✅ 3 retries | ✅ 5 failures / 60s | N/A (SDK) |
| Slack | ✅ 10s | ✅ 4 retries | ❌ Not justified | ✅ All network errors |
| Anthropic | SDK default | ✅ 3/agent | ✅ Exists | N/A |
| Supabase | SDK default | ✅ SDK | ❌ Not justified | N/A |
| Gmail, Obsidian, GitHub | ❌ None | ❌ None | ❌ Not justified | ❌ None |

**Not implemented (justified):**
- Gmail/Obsidian/GitHub circuit breakers: all non-fatal operations; outage doesn't cascade; complexity not justified
- Supabase circuit breaker: SDK handles retries; Supabase outage is fatal by design (system can't operate without DB)
- ElevenLabs/OpenRouter: TTS fallback to Gemini already handles ElevenLabs failure
