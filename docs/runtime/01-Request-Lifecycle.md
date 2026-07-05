# 01 — Request Lifecycle

**Date:** 2026-07-02  
**Evidence Source:** server.js (middleware stack, route loading, inline routes), lib/middleware.js, lib/app-auth.js, lib/kernel.js, middleware/civilization-kernel.js, lib/runtime/execution-context.js, lib/runtime/constitutional-gate.js, lib/chat-context.js, lib/models/runtime/index.js

---

## Overview

An HTTP request to APEX passes through up to 12 distinct processing layers before a response is sent. The exact path depends on the endpoint type (chat vs. API vs. cron vs. static).

---

## Phase 1 — Render Ingress

```
Internet → Render CDN/LB → ai-os-server Node process (port 3000)
```

Render terminates TLS. Node receives a plain HTTP/1.1 request. `zeroDowntimeDeploys: false` means only one instance exists at a time.

---

## Phase 2 — Express Global Middleware Stack (All Routes)

Applied in this exact order (server.js lines ~300–650):

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `cors()` | CORS with allowed origins list |
| 2 | `helmet(...)` | Security headers (CSP, HSTS, X-Frame-Options, etc.) |
| 3 | `express.json({ limit: '10mb' })` | Body parsing |
| 4 | `express.urlencoded(...)` | Form body parsing |
| 5 | Content-type enforcement | 415 for non-JSON/form POST/PUT/PATCH to API routes |
| 6 | `generalLimiter` | 300 req / 15 min — all routes |
| 7 | Execution class tagger | Tags `req.executionClass` (REFLEX/BACKGROUND/EXECUTIVE) |
| 8 | `middleware/civilization-kernel.js` | 7-phase per-request pipeline (see Phase 4) |

### Execution Class Assignment (server.js)

```
REFLEX    → /health, /api/latency-stats, /api/latency-traces, /api/system/events
BACKGROUND → /api/tasks/run, /api/master/*, /api/research/*, /api/browser/*,
             /api/cloud-autopilot, /api/agent/run, /api/wiki/ingest, /api/rag/*
EXECUTIVE  → everything else
```

This classification is used by the event bus and latency budget tracking. It does NOT gate access.

---

## Phase 3 — Rate Limiters (Route-Specific)

Applied before route handlers on specific paths:

| Limiter | Path | Window | Max |
|---------|------|--------|-----|
| `authLimiter` | POST /auth/login | 1 hour | 10 |
| `chatLimiter` | /chat | 60 seconds | 30 |
| `voiceLimiter` | /api/voice-chat | 60 seconds | 40 |

General limiter (300/15min) is separate and already applied in Phase 2.

---

## Phase 4 — civilization-kernel.js (All Non-Static Routes)

Applied at `app.use(require('./middleware/civilization-kernel'))` (server.js line ~409).

The civilization kernel is a **7-phase per-request middleware** that enriches `req` and sets response headers. It runs on every request BEFORE auth.

### 7-Phase Pipeline

**Phase 1 — Execution Context Initialization**
- `lib/runtime/execution-context.js initializeContext(req)` — synchronous
- Builds 9-block context: requestId, timestamp, path, method, ip, userAgent, executionClass, sessionId, flags
- `hydrateContext(ctx, data)` merges additional data
- `finalizeContext(ctx)` seals the context (Object.freeze-equivalent)
- All operations fail-soft — no error throws to next middleware

**Phase 2 — Constitutional Gate**
- `lib/runtime/constitutional-gate.js evaluate(req, ctx)`
- 5 sequential checks:
  1. Authority check (vs autonomy level)
  2. Risk assessment
  3. Modification governance
  4. Deception detection
  5. Confabulation guard
- **Timeout:** 400ms hard timeout; on timeout returns RESTRICT
- **FAIL-OPEN:** Any error in gate evaluation returns ALLOW
- Verdict: ALLOW / RESTRICT / DENY
- DENY causes immediate 403 response
- RESTRICT sets `req._restricted = true` — callers may reduce token budgets

**Phase 3 — Goal Graph Consultation**
- `lib/goals/goal-graph.js` in-memory consultation
- Reads current active goals from in-memory Map (loaded async at startup)
- No DB call per request — pure in-memory

**Phase 4 — Attention Engine**
- `lib/attention/attention-engine.js scoreRequest(req)`
- Pure in-memory 6-dimension weighted sum
- Sets `req.attentionScore` and `req.attentionDimensions`
- No DB call

**Phase 5 — Memory Gateway**
- `lib/memory/gateway.js getContext(req)` — reads active working memory for session
- If session has working memory → merges into `req.memoryContext`
- May make DB call for non-cached sessions

**Phase 6 — Autonomy Runtime Controller (Lazy)**
- `lib/cognitive/runtime/autonomy-runtime-controller` — lazy require at call time
- Checks AUTONOMY_LEVEL and current cognitive state
- Contributes to `req.autonomyContext`

**Phase 7 — Watchdog Assessment (Lazy)**
- `lib/constitution/watchdog.getLastAssessment()` — lazy require
- Returns last constitutional assessment (from last watchdog run)
- Sets `req.constitutionalStatus`

### Response Headers Set by civilization-kernel.js (10 total)

```
X-APEX-Request-Id
X-APEX-Session-Id
X-APEX-Execution-Class
X-APEX-Constitutional-Status
X-APEX-Attention-Score
X-APEX-Autonomy-Level
X-APEX-Goal-Context
X-APEX-Memory-Context
X-APEX-Risk-Level
X-APEX-Processing-Time
```

### Post-Response Hook (setImmediate — non-blocking)

After `res.end()` fires, civilization-kernel.js does via `setImmediate`:
1. Writes episodic memory (Layer 2) — request summary
2. Writes decision memory (Layer 7) — if route was a decision path
3. Appends to `logs/kernel.ndjson` — audit log
4. Appends to `logs/apex_audit.ndjson` — secondary audit

These writes are **fire-and-forget** — errors are caught and logged but never surface to the caller.

---

## Phase 5 — Static File Routes (Short-Circuit)

Before API auth, certain paths are served immediately:

```
Public (no auth):
  GET /health           → inline server.js handler
  GET /manifest.json    → static file
  GET /sw.js            → static file
  GET /apex-v2.css      → static file
  GET /apex-custom.css  → static file
  POST /auth/login      → inline handler (with authLimiter)
```

These paths bypass all subsequent auth middleware.

---

## Phase 6 — Dashboard Auth (`requireAuth`)

```
GET /
GET /dashboard.html
GET /editor
```

`requireAuth` gate (lib/middleware.js):
1. `BYPASS_DASHBOARD_AUTH=true` (dev only, blocked in production) → pass
2. `hasAppAccess(req)` — timing-safe x-app-key check vs APP_ACCESS_KEY → pass
3. `x-api-key` header vs API_KEY → pass
4. JWT cookie `apex_token` vs JWT_SECRET → pass
5. All fail → 401 (HTML login page for browser, JSON for API)

---

## Phase 7 — API Auth (`requireAppAccess`)

Applied at route level via `require('../lib/app-auth')` shim:
```
lib/app-auth.js → require('./middleware').requireAppAccess
```

`requireAppAccess` gate:
1. `hasAppAccess(req)` — timing-safe x-app-key vs APP_ACCESS_KEY → pass
2. JWT cookie `apex_token` → pass
3. Both fail → 401 JSON

---

## Phase 8 — Kernel Chain (`kernelChain`)

Applied at `app.use('/api', ...kernelChain)` (server.js line ~638).

All `/api/*` routes pass through 4 gates in sequence:

| Gate | Function | Behavior on Failure |
|------|---------|-------------------|
| 1 | `resolveIdentity(req)` | Attaches caller identity — fail-soft |
| 2 | `resolveOwnership(req)` | Attaches ownership context — fail-soft |
| 3 | `checkAuthority(req)` (lib/agent-file-utils.js) | Checks autonomy level vs requirement map — FAIL-OPEN (calls next() on error) |
| 4 | `checkGovernance(req)` (lib/agent-file-utils.js) | Checks standing approvals — ALWAYS calls next() |

Note: `checkGovernance` appears to always call next() regardless of governance result (confirmed from lib/agent-file-utils.js read).

---

## Phase 9 — Cron Auth (`requireCronAccess`)

For `/api/cron/*` routes only:
- x-cron-secret header vs CRON_SECRET — timing-safe comparison
- Separate from APP_ACCESS_KEY

---

## Phase 10 — Route Handler

The actual Express handler executes. Route files are auto-loaded from `routes/*.js` (42 files, excluding gemini-live.js and tts-gemini.js which are excluded from auto-load).

---

## Chat Request Sub-Lifecycle

For `POST /chat` specifically, inside the route handler:

```
1. chatLimiter gate (already applied)
2. requireAppAccess (already applied)
3. chat-context.js buildPrompt() — assembles full prompt
   ├── fetchSelfContext() — 4 parallel Supabase queries
   ├── gateway.getContext() — memory layers
   ├── getMemorySummary() — cached LLM call (Haiku, 60s cache)
   ├── apex-tools.js APEX_TOOLS schema — injected as tool definitions
   └── buildPrompt() — composes system prompt with all context blocks
4. models/runtime.execute({ tier: 'critical' }) — Opus 4.7 call
   ├── 3 retry attempts
   ├── 90s per-attempt timeout
   └── circuit breaker tracking
5. If tool_use in response → executeApexTool(name, input) → re-invoke model
6. cognitive-orchestrator.js shape(response) — prepends acknowledgment string
7. Send response
8. setImmediate: backgroundClassifyAndSummarise (if file uploaded)
9. setImmediate: extractAndSaveFacts (background fact extraction)
10. setImmediate: addToMemory (store exchange in memory)
```

---

## WebSocket Lifecycle

WebSocket connections go through `lib/ws-handler.js`:

1. HTTP GET `/ws` with `?token=<APP_ACCESS_KEY>`
2. `crypto.timingSafeEqual` auth check on token
3. Socket upgrade to WebSocket
4. Session created: `{ sessionId: 'ws-<ts>-<rand>', channels: Set(['system']) }`
5. Client sends `subscribe` message to add channels (voice, agents, etc.)
6. 60-second keepalive ping cycle — dead sockets terminated
7. Three global aliases set: `global._wsBroadcast`, `global._wsSend`, `global._wsChunkedSend`

---

## Response Timing

| Component | Blocking? | Typical latency |
|-----------|----------|----------------|
| civilization-kernel phases 1–4 | Yes | <5ms (all in-memory) |
| civilization-kernel phase 5 (memory gateway) | Yes | <50ms (DB, cached) |
| civilization-kernel phases 6–7 | Yes | <5ms (lazy in-memory reads) |
| constitutional-gate | Yes | <10ms (fail-open, 400ms timeout) |
| Route auth check | Yes | <1ms (timing-safe compare) |
| kernelChain | Yes | <5ms (identity resolve) |
| Chat buildPrompt (parallel Supabase queries) | Yes | ~100–300ms |
| models/runtime.execute (Opus 4.7) | Yes | 2–15s |
| Post-response memory writes | No (setImmediate) | N/A |
| Governance evidence write | No (setImmediate) | N/A |
