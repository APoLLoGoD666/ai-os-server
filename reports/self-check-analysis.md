# Phase 1: Self-Check Analysis

**Endpoint:** `GET /api/intelligence/self-check`
**Observed status:** degraded | Score: 70% | Latency: 1908ms

---

## Check Classification

| Check | Status | Classification | Root Cause | Fix Complexity | Production Impact |
|---|---|---|---|---|---|
| memory | FAIL | HIGH (false positive) | heapUsed/heapTotal ratio is misleading at startup | Low — threshold change | None — system is healthy |
| postgres | FAIL | MEDIUM | DATABASE_URL not set or misconfigured in Render env vars | Low — user action | Low — Supabase JS client handles all queries |
| obsidian | FAIL | LOW | OBSIDIAN_URL not set on Render | None — expected gap | None — service intentionally not configured |
| integrations.js | FAIL (silent) | MEDIUM | `requireAppAccess` destructuring returns `undefined` | Low — code fix | HIGH — all integration routes return 500 |
| supabase | OK | — | Healthy, 226ms latency | — | — |
| event_bus | OK | — | Healthy, 0 recent events | — | — |
| agent_queue | OK | — | Healthy, idle | — | — |
| rag | OK | — | Vault reachable, no vector data | — | — |
| notion | OK | — | Healthy, 109ms | — | — |
| slack | OK | — | Healthy, 100ms | — | — |
| sentry | OK | — | DSN set | — | — |

---

## Detailed Root Causes

### Memory — HIGH (False Positive)

**Evidence:** `heapUsed/heapTotal = 122MB/127MB = 96%` at startup. RSS is 205MB on a 512MB container.

**Root cause:** V8 starts with a small initial `heapTotal` and grows it lazily. The ratio `heapUsed/heapTotal` is near 1.0 at startup by design — this does not mean memory pressure. The correct signal is RSS vs container limit (205MB / 512MB = 40%).

**Fix:** Replace ratio check with RSS-based threshold. Example: `ok: rss_mb < 400` for a 512MB container. The ratio check can be retained as a secondary signal with a higher threshold (e.g. 98%) once V8 has had time to expand heapTotal after warmup.

**Fix complexity:** Low — single threshold change in `routes/intelligence.js` lines 168–175.

---

### Postgres — MEDIUM (Configuration)

**Evidence:** `checks.postgres.ok = false`, `error: ""` (empty string). `pg_database.js` reads `DATABASE_URL` env var. Supabase JS client returns ok:true, confirming the Supabase project itself is reachable.

**Root cause:** `DATABASE_URL` is either absent or set with an incorrect Supabase postgres password in Render environment variables. The pg (native postgres) client fails silently with an empty error string, suggesting a connection timeout or auth rejection before an error message is produced.

**Fix:** Set `DATABASE_URL` in Render env vars to the correct Supabase connection string (Project Settings → Database → Connection string → URI mode). This is a user action, not a code change.

**Fix complexity:** Low — Render env var update. No code changes needed.

---

### Obsidian — LOW (Expected Gap)

**Evidence:** `error: "OBSIDIAN_URL not set"`, hint confirms env var missing.

**Root cause:** The Obsidian Local REST API plugin is not running on a reachable host from Render. This is expected — Obsidian runs locally on the developer's machine and is not accessible from a cloud deployment without a tunnel.

**Fix:** Either set `OBSIDIAN_URL` to a stable tunnel endpoint (e.g. ngrok, Cloudflare Tunnel) or accept this as a known gap. The check correctly surfaces the misconfiguration.

**Fix complexity:** None for the check itself. Infrastructure decision required to resolve.

---

### integrations.js Route Failure — MEDIUM (Code Bug)

**Evidence:** Line 8: `const { requireAppAccess } = require('../lib/app-auth')`. The `app-auth` module exports a function directly, not an object. Destructuring a function yields `undefined`. All `router.use(requireAppAccess)` calls receive `undefined` as a handler, causing Express to throw "argument handler must be a function" at route registration time, making all integration routes unavailable.

**Fix:** Change line 8 to `const requireAppAccess = require('../lib/app-auth')`.

**Fix complexity:** Low — single-line code change.

**Production impact:** HIGH — all `/api/integrations/*` routes are non-functional until fixed.

---

## Summary

The self-check score of 70% is artificially depressed. Two of the three failures (memory, obsidian) have no real production impact. The postgres failure is a configuration gap. The integrations.js bug is the only issue with direct user-facing impact and requires a one-line code fix. After applying the memory threshold fix and the integrations.js fix, the self-check score should reach 90%+.
