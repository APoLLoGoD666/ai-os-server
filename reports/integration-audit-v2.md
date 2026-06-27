# Integration Audit — System Integration Branch

Generated: 2026-06-06  Branch: feature/system-integration

---

## 1. Pipeline Hooks (agent-pipeline-hooks.js)

**Problem:** Current branch had the stub version (empty no-op methods). Slack notifications were silently swallowed.

**Root Cause:** `feature/knowledge-evolution` branched from `main` before `feature/agent-evolution` landed the Slack-wired version.

**Fix:** Merged `feature/agent-evolution` — Slack version now active. Lazy-require of `slack-agents` means missing Slack service degrades silently.

**Verification:** `[Boot]` startup check confirms all three hook methods present.

**Risk:** If `services/slack/slack-agents` throws synchronously at require time (e.g., bad config), the lazy IIFE swallows it. Current implementation catches and sets `_slack = null` — safe.

**Rollback:** Revert to empty stub — `onPipelineStart/Complete/Failed` are no-ops, Slack goes dark. No functionality broken.

---

## 2. langchain-rag.js — getStats() not exposed

**Problem:** `getStats()` was added in `feature/knowledge-evolution` but no route or startup code called it.

**Root Cause:** Feature branch added the function without wiring it to any consumer.

**Fix:** `GET /api/intelligence/system-status` now calls `rag.getStats()` and surfaces the result in `retrieval` and `knowledge` sections.

**Verification:** Hit `/api/intelligence/system-status` — see `retrieval.chunksInMemory`, `embedErrors`, `lastIndexedAt`.

**Risk:** None. `getStats()` is a pure read of `_stats` object — no I/O, no side effects.

**Rollback:** Remove the `require('../agent-system/langchain-rag')` block from system-status handler. No other code is affected.

---

## 3. retrieveContextWithMeta() — not called anywhere

**Problem:** `retrieveContextWithMeta()` was exported but only `retrieveContext()` is called throughout server.js and routes. Confidence and method metadata are discarded.

**Root Cause:** New interface not yet wired to callers.

**Fix:** Not addressed in this integration pass — callers would need to parse and use `confidence` / `sources` / `method`, which is caller-specific logic and goes beyond integration wiring. Documented here for next sprint.

**Risk:** No runtime risk — `retrieveContext` still delegates to `retrieveContextWithMeta` internally. Metadata is computed but discarded.

---

## 4. agent-registry.js — not imported anywhere

**Problem:** `agent-registry.js` (from `feature/agent-evolution`) was never imported in server.js or any route.

**Root Cause:** Feature delivered the module but no consumer was written.

**Fix:** `GET /api/intelligence/system-status` now calls `registry.getRegistrySummary()` → exposes pipeline/domain agent counts.

**Verification:** Hit `/api/intelligence/system-status` — see `agents.pipelineAgents`, `agents.domainAgents`, `agents.capabilities`.

**Risk:** `getRegistrySummary()` is a pure in-memory lookup. No Supabase, no I/O.

**Rollback:** Remove `require('../agent-system/agent-registry')` block from system-status.

---

## 5. agent-reputation.js — getPerformanceSummary() not exposed in routes

**Problem:** `agent-reputation.js` is imported by `orchestrator.js` for `shouldPreEscalate` and `invalidateCache`, but `getPerformanceSummary()` is never surfaced via any API endpoint.

**Root Cause:** The `agent-performance` endpoint in `intelligence.js` queries Supabase directly instead of using the reputation module.

**Fix:** `GET /api/intelligence/system-status` now calls `reputation.getPerformanceSummary()` and surfaces scores and sample count.

**Note (mismatch):** `agent-performance` route and `agent-reputation.js` duplicate the stage stats query. This is documented but not consolidated — changing the endpoint logic is out of scope for this integration pass.

**Verification:** Hit `/api/intelligence/system-status` — see `reputation.sampleCount`, `reputation.scores`.

**Risk:** `getPerformanceSummary()` hits Supabase. If `apex_agent_stages` is missing, it returns `{}` silently (existing error handling). System-status handler wraps in try/catch — safe.

**Rollback:** Remove `require('../agent-system/agent-reputation')` block from system-status.

---

## 6. orchestrator.js — circuit breaker state not exported

**Problem:** Circuit breaker `_cb` is module-private. No external caller can tell if the orchestrator is open or closed.

**Root Cause:** `runAgentTeam` is the only export. Operational state inaccessible.

**Fix:** Added `getOrchestratorStatus()` export returning `{ circuitBreaker, lastRunModels, supabaseReady }`. Wired to startup verification and system-status endpoint.

**Verification:** `[Boot]` log line confirms CB state. `/api/intelligence/system-status` returns `orchestration.circuitBreaker.open`.

**Risk:** Exposes read-only operational state. No side effects. Cannot modify CB state via this export.

**Rollback:** Remove `module.exports.getOrchestratorStatus` and the three call sites.

---

## 7. Startup — no boot verification

**Problem:** Components could fail to load silently. No way to know the embed API works until first user query.

**Root Cause:** No boot-time probe existed.

**Fix:** Added 8-second deferred startup block in `server.listen` callback:
1. Pipeline hooks shape check
2. Agent registry accessible
3. Vault path exists
4. Embed API warm-up probe (returns dims or logs warning)
5. Orchestrator circuit breaker state

All checks are non-fatal — log only. Boot continues regardless of check results.

**Verification:** After server start, logs show `[Boot] Integration verification: N/5 checks passed`.

**Risk:** The embed probe makes one real API call at startup. At 768 dims, ~425ms, negligible cost. Rate-limit aware — if 429, `_voyage429Until` / `_gemini429Until` are set but only for 60s.

**Rollback:** Remove the `setTimeout(async () => {...}, 8000)` block from `server.listen` callback.

---

## Summary Matrix

| Component | Before | After |
|---|---|---|
| pipeline-hooks | Stub (no Slack) | Slack-wired |
| langchain-rag getStats | Exported, unused | Exposed via system-status |
| agent-registry | Unused | Exposed via system-status |
| agent-reputation | Internal only | Exposed via system-status |
| orchestrator CB state | Private | Exported, system-status, boot log |
| startup verification | None | 5-check boot probe |
| /api/intelligence/system-status | Missing | Created |
