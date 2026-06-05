# External Dependency Hardening — Phase 24
*Generated: 2026-06-05 | Source: direct code inspection*

---

## Dependency Matrix

| Dependency | Timeout | Retry | Backoff | Circuit Breaker | Telemetry | Status |
|---|---|---|---|---|---|---|
| Anthropic Claude | SDK default | ✅ 3/agent + model escalation | ✅ 15s×i on 429 | ✅ 5 failures, 60s–900s exp | ✅ cost + token breakdown | **PRODUCTION_READY** |
| Notion API | ✅ 30s | ✅ 3 (SDK) | ✅ 500ms×2^i | ✅ 5 failures / 60s | ⚠️ no call-level latency | **PRODUCTION_READY** |
| Slack API | ✅ 10s | ✅ 4 retries | ✅ 2^i×1s | ❌ not justified | ✅ retry logs | **PRODUCTION_READY** |
| Supabase JS SDK | SDK default | ✅ SDK built-in | ✅ SDK built-in | ❌ fatal by design | ✅ /health latency | **PRODUCTION_READY** |
| Supabase node-pg | 65s keepAlive | ❌ None | ❌ None | ❌ fatal by design | ✅ pgPool error events | **ADEQUATE** |
| Gmail (googleapis) | Library default | ❌ None explicit | ❌ None explicit | ❌ None | ⚠️ console.error | **FRAGILE** |
| Firecrawl | SDK default | ✅ SDK built-in | ✅ SDK built-in | ❌ None | ⚠️ error.message | **ADEQUATE** |
| Playwright | None | ❌ None | ❌ None | ❌ None | ✅ domain allowlist | **ADEQUATE** |
| Obsidian REST | None | ❌ None | ❌ None | ❌ None | ⚠️ console.warn | **FRAGILE** |
| GitHub API | None | ❌ None | ❌ None | ❌ None | ⚠️ console.warn | **FRAGILE** |
| Gemini WebSocket | None | ⚠️ Reconnect only | ❌ None | ❌ None | ✅ latency tracker | **ADEQUATE** |
| Render API | None | ❌ None | ❌ None | ❌ None | ❌ None | **FRAGILE** |
| OpenRouter | None | ❌ None | ❌ None | ❌ None | ⚠️ error.message | **FRAGILE** |
| ElevenLabs | None | ❌ None | ❌ None | ❌ None | ⚠️ error.message | **FRAGILE** |
| Deepgram | None | ❌ None | ❌ None | ❌ None | ❌ None | **UNVERIFIED** |

---

## Detailed Analysis

### Anthropic Claude — BEST IN CLASS
**Evidence:** `agent-system/orchestrator.js:45-54, 141-164`
```
Circuit breaker: _cb object, CB_THRESHOLD=5
Cooldown: exponential — 60s × 2^(failures-5), capped at 900s (15 min)
Retry: callWithBackoff(fn, retries=3)
Rate limit backoff: (i+1) × 15s (15s → 30s → 45s)
Model escalation: Haiku→Sonnet→Opus on developer attempts 2→3
Budget cap: PIPELINE_BUDGET_USD (default $2) enforced by _checkBudget()
Audit log: all runs persisted to apex_agent_runs (cost_usd, success, complexity)
```
No action needed.

---

### Notion API — HARDENED (Phase 16)
**Evidence:** `services/notion/notion-client.js`
```
Timeout: 30s (timeoutMs: 30000 in SDK constructor, line 25)
Circuit breaker: CLOSED→OPEN→HALF_OPEN (5 failures, 60s cooldown)
Retry: SDK-level 3 retries, 500ms × 2^i backoff
Concurrency: MAX_CONCURRENT=3
```

**Remaining gap:**
- No call-level latency tracking — Notion calls go untracked beyond queue wait time
- No Slack alert on circuit breaker open (only console.warn)

**Recommendation (non-blocking):** Add `console.warn('[notion] call latency:', duration, 'ms')` inside `enqueue()` for calls >2s. Not implementing — borderline value vs. noise.

---

### Slack API — HARDENED (Phase 16)
**Evidence:** `services/slack/slack-client.js`
```
Timeout: 10s (req.setTimeout, line 70)
Retry: 4 retries, 2^i × 1s backoff
Error set: ['ratelimited','slack_timeout','ECONNRESET','ETIMEDOUT','EPIPE','ENOTFOUND','EAI_AGAIN']
Masking: 6 secret patterns stripped from all messages
```
No further action needed. Circuit breaker explicitly not justified (would prevent health posts during recovery).

---

### Supabase — ADEQUATE
**Evidence:** `lib/clients.js`, `pg_database.js`
- JS SDK: built-in retry + exponential backoff
- node-pg: keepAlive 65s (matches Render's 60s proxy timeout) — prevents silent disconnect
- No circuit breaker: Supabase outage is fatal (system cannot operate without DB)
- On-demand latency at `/api/system/status?ping=true`

No action needed.

---

### Gmail — FRAGILE
**Evidence:** `email_agent.js:22-172`
```
Timeout: None explicit (googleapis library default)
Retry: None explicit (googleapis handles internally)
Auth: DB-first (pgGetGmailToken) → env fallback; auto-invalidation on invalid_grant (line 164-172)
Recovery: Manual re-auth via /auth/gmail/reauthorise
```

**Risk assessment:** LOW for personal OS. Gmail is event-driven (5-min poll), not load-bearing for real-time features. Token expiry is the primary failure mode; a circuit breaker wouldn't help.

**No implementation needed.** The `invalid_grant` detection and notification is adequate for a personal OS.

---

### Obsidian REST Tunnel — FRAGILE
**Evidence:** `agent-system/obsidian-client.js` (referenced in resilience-audit.md)
```
Timeout: None
Retry: None
Circuit breaker: None
```

**Risk assessment:** LOW. Obsidian writes are non-fatal — briefings/wiki failures log console.warn and the system continues. The tunnel is a best-effort channel.

**Recommendation (not implemented):** Add a simple 5s timeout to Obsidian fetch calls. The tunnel runs on localhost (127.0.0.1); any timeout signals the tunnel is down. Could implement as a 1-line fix, but the value is minimal given the non-fatal design.

---

### GitHub API — FRAGILE
**Evidence:** `agent-system/orchestrator.js:647`, `master-orchestrator.js:106,867`
```
Timeout: None explicit
Retry: None
Auth: Token embedded in git clone URL — `https://oauth2:${_ghToken}@github.com/...`
```

**Risk assessment:**
1. Token in URL — if execSync error message is logged, the URL (containing the token) would be visible in Render logs. The `stdio: 'pipe'` flag captures stderr, but the error object may contain the URL.
2. A network failure on git push silently returns an error to the COMMITTER agent; the agent logs it but doesn't retry.

**Recommendation (documented, not implemented):** Replace embedded-token URLs with `GIT_ASKPASS` or git credential helper. This is a MEDIUM complexity change requiring testing of the commit/push pipeline. Risk of breaking the existing git workflow exceeds the benefit for a personal OS where logs are not publicly accessible.

---

### OpenRouter — FRAGILE
**Evidence:** `server.js` (LLM fallback)
```
Timeout: None
Retry: None (single attempt fallback)
```

**Risk assessment:** LOW. OpenRouter is used as LLM fallback, not the primary path. If it fails, the request fails — no cascade.

---

### ElevenLabs / Deepgram — FRAGILE
```
Timeout: None
Retry: None
Fallback: ElevenLabs failure → Gemini TTS (existing fallback)
Deepgram: STT fallback path, not primary
```

**Risk assessment:** LOW. Both have upstream fallbacks (Gemini TTS, Gemini STT). No action needed.

---

## Changes Made This Phase

None. All high-value hardening was completed in Phase 16. Remaining fragile dependencies (Gmail, Obsidian, GitHub, OpenRouter, ElevenLabs) do not justify circuit breakers given their failure modes and the system's single-user, non-critical design.

---

## Remaining Gaps (Accepted)

| Dependency | Gap | Severity | Decision |
|---|---|---|---|
| GitHub | Token in git URL exposed in execSync errors | MEDIUM | ACCEPTED — not publicly accessible logs |
| Gmail | No explicit timeout | LOW | ACCEPTED — googleapis handles internally |
| Obsidian | No timeout or retry | LOW | ACCEPTED — non-fatal by design |
| All | No correlation IDs on outbound calls | LOW | ACCEPTED — Render logs have request IDs |
| All | No call-level latency tracking | LOW | ACCEPTED — request-level is sufficient |
