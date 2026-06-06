# Dependency Resilience — Platform Hardening v2

**Date:** 2026-06-06
**Branch:** feature/platform-hardening
**Sessions covered:** 14–15 (final state)
**Note:** No dependency resilience changes were made this session. This is a verification report of the cumulative hardened state.

---

## Dependency Status Table

| Dependency | Timeout | Retry | Circuit Breaker | Status |
|---|---|---|---|---|
| Anthropic Claude | SDK default | ✅ 3 per agent + model escalation | ✅ 5 failures, 60s–900s exp backoff | PRODUCTION_READY |
| Notion API | 30s | ✅ 3 (SDK) + 500ms×2^i | ✅ 5 failures / 60s cooldown | PRODUCTION_READY |
| Slack API | 10s | ✅ 4 retries, 2^i×1s | ❌ not justified (health alerts need it) | PRODUCTION_READY |
| Supabase JS SDK | SDK default | ✅ SDK built-in | ❌ fatal by design | PRODUCTION_READY |
| Supabase node-pg | 65s keepAlive | ❌ | ❌ fatal by design | ADEQUATE |
| Google Calendar | 15s Promise.race | ❌ | ❌ | ADEQUATE |
| Obsidian REST | 5s AbortController | ❌ | ❌ | ADEQUATE |
| Gmail (googleapis) | Library default | ❌ | ❌ | FRAGILE (accepted) |
| GitHub API (git) | None | ❌ | ❌ | FRAGILE (accepted) |
| Gemini WebSocket | None | ⚠️ Reconnect only | ❌ | ADEQUATE |
| Firecrawl | SDK default | ✅ SDK built-in | ❌ | ADEQUATE |
| Playwright | None | ❌ | ❌ | ADEQUATE |
| OpenRouter | None | ❌ | ❌ | FRAGILE (accepted) |
| Render API | None | ❌ | ❌ | FRAGILE (accepted) |

---

## Accepted FRAGILE Dependencies — Rationale

Gmail, GitHub, OpenRouter, and Render are non-load-bearing paths for a single-user personal OS. Failure modes are non-cascading. Logs are private. Effort to add circuit breakers exceeds benefit at current scale.

---

## Overall Dependency Resilience Score

**8.5 / 10** — no change this session. All priority gaps were addressed in sessions 14–15.
