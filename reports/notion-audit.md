# Notion Audit — Phase 8
*Audited: 2026-06-05 | Source: services/notion/* inspection*

---

## Databases

All 10 databases created and live. IDs hardcoded in `notion-client.js` lines 8–19.

| DB Key | ID | Status |
|---|---|---|
| tasks | fcab7a3b-d0dc-4a67-becd-828a1388b42e | ✅ Live |
| projects | db82be17-3b04-41dd-9833-ae001de4b485 | ✅ Live |
| clients | 2ec9f764-c868-4918-84b3-bed28f6da514 | ✅ Live |
| agentRuns | eb7e93eb-05c2-4b62-a099-3081bb2ad29c | ✅ Live |
| decisions | 0d1bc835-6d49-438b-bfac-409b17667848 | ✅ Live |
| goals | 94bd576d-a443-4706-a584-02b38052261c | ✅ Live |
| meetings | 07bd83f6-448b-4a38-a5bf-ee5113b9c4b0 | ✅ Live |
| contentPipeline | 685b7851-84dc-46b4-b44d-2542712444e8 | ✅ Live |
| knowledgeRequests | 192e0791-2439-4c77-b8f5-3022f123ab25 | ✅ Live |
| sopExecutions | acf73973-29e3-464e-8c1f-5d944b210ea2 | ✅ Live |

---

## CRUD Coverage

| Database | Create | Read | Update | Archive | Notes |
|---|---|---|---|---|---|
| tasks | ✅ | ✅ | ✅ | ✅ | + completeTask, syncFromSupabase |
| projects | ✅ | ✅ | ✅ | ✅ | + createFromFeatureRequest |
| clients | ✅ | ✅ | ✅ | ❌ | + createLeadFromInbound, activateClient |
| agentRuns | ✅ | ❌ | ✅ | ❌ | logAgentRun, updateAgentRun |
| decisions | ✅ | ❌ | ❌ | ❌ | logDecision only |
| goals | ❌ | ❌ | ❌ | ❌ | DB exists, no service functions yet |
| meetings | ❌ | ❌ | ❌ | ❌ | DB exists, no service functions yet |
| contentPipeline | ❌ | ❌ | ❌ | ❌ | DB exists, no service functions yet |
| knowledgeRequests | ✅ | ❌ | ❌ | ❌ | logKnowledgeRequest only |
| sopExecutions | ✅ | ❌ | ❌ | ❌ | logSopExecution only |

**6 of 10 databases have partial CRUD. 4 are write-only log destinations. 3 have no functions yet.**

---

## Rate Limiting

- **Concurrency:** MAX_CONCURRENT = 3 simultaneous requests
- **Queue:** `_queue` array; `_drain()` called after each completion
- **No tokens-per-second enforcement** — relies purely on concurrent-request cap
- **Notion free tier limit:** 3 req/s — current implementation correctly caps at 3 concurrent. Adequate for personal OS.

---

## Retry Logic

```
Max retries: 3
Base delay: 500ms
Backoff: baseDelay * 2^i  (500ms → 1000ms → 2000ms)
Triggers: HTTP 429 OR HTTP 5xx
Retry-after header: respected — uses header value in seconds × 1000ms if present
Non-retriable errors: thrown immediately
```

---

## Timeout

**None set.** Relies on Node.js default HTTPS timeout (~120s). Under load, a hung Notion API call can block one of the 3 concurrency slots for up to 2 minutes. This could starve other queued requests.

**Recommendation:** Add `{ timeout: 30000 }` to the `@notionhq/client` constructor.

---

## Circuit Breaker

**None.** If Notion API is persistently down, queued requests pile up indefinitely. The queue has no depth limit or shed-load mechanism.

**Recommendation:** After 5 consecutive failures, stop queuing and return cached data or empty result for read operations; for writes, log to Supabase for replay.

---

## Sync Paths

| Direction | Status | Mechanism |
|---|---|---|
| Supabase apex_agent_runs → Notion agentRuns | ✅ Active | supabase-notion-sync.js, checkpoint-based, every 6h |
| Notion tasks → Supabase | ❌ None | Unimplemented |
| Notion projects → Supabase | ❌ None | Unimplemented |
| Supabase tasks → Notion tasks | ✅ Partial | notion-tasks.js syncFromSupabase (function exists, no cron calling it) |

**Sync is primarily unidirectional: production data flows Supabase → Notion.** Notion is an execution workspace, not a system of record. This is correct architecture.

---

## Telemetry

- **No logging** inside notion-client.js — errors thrown silently to callers
- Callers in routes/integrations.js log via `console.error('[route]', e.message)` ✅
- No metrics on queue depth, wait time, or retry count
- No Slack alert when Notion API is down

**Recommendation:** Add `console.warn('[notion] retry', attempt, status)` inside `withRetry` and a Slack alert after 3 consecutive failures.

---

## Security

- NOTION_API_KEY loaded from `process.env` ✅
- Throws at initialization if missing ✅ (fails fast, not silent)
- DB IDs hardcoded — acceptable (not secrets, workspace configuration)

---

## Risk Summary

| Risk | Severity | Status |
|---|---|---|
| No explicit timeout | MEDIUM | ⚠️ OPEN |
| No circuit breaker | MEDIUM | ⚠️ OPEN |
| No logging in notion-client.js | LOW | ⚠️ OPEN |
| 4 DBs with no service functions | LOW | ℹ️ Intentional (future agents) |
| Notion→Supabase sync absent | LOW | ℹ️ Not needed (Notion is display layer) |
| syncFromSupabase for tasks has no cron | LOW | ⚠️ Function exists, not scheduled |
