# APEX CIVILISATION — CANONICAL ENTITY REGISTRY
## 08b · Expanded Entity Records — Block 03: Infrastructure & Block 22: Middleware

**Registry Version:** 1.0.0
**Date:** 2026-07-05
**Part:** Registry Part 2 — Full Attribute Expansion

---

### ENT-000040 — server.js

**Family:** BLOCK-03 | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | `C:\Users\arwwo\Desktop\APEX\Scripts\server.js` |
| Parent | Scripts (root) |
| Description | Primary Express application entry point for the APEX AI OS backend. Bootstraps Sentry error tracking, validates required environment variables (ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), registers global crash handlers, configures middleware (CORS, compression, rate limiting, Helmet), mounts all route modules, and connects to Supabase Postgres. Derives a GIT_SHA at startup for traceability. |
| Purpose | Acts as the single runnable server process for the entire APEX backend — orchestrates all middleware, routes, and subsystems under one Express application. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript (Node.js / CommonJS) |
| Created By | UNKNOWN |
| Consumers | Render deployment runtime; process manager (PM2 or Render native); all HTTP clients hitting the API |
| Dependencies | `./instrument.js`, `dotenv`, `@sentry/node`, `express`, `cors`, `compression`, `express-rate-limit`, `helmet`, `@anthropic-ai/sdk`, `jsonwebtoken`, `axios`, `multer`, `./agent-system/prompt-expander`, `./agent-system/orchestrator`, `./agent-system/agent-library`, `./lib/memory/sanitizer`, `./lib/event-bus`, `./lib/agent-queue`, `./lib/cognitive-orchestrator`, `./lib/session-state-registry`, `./lib/response-timing-engine`, `./lib/persistent-cognition-manager`, `./lib/executive-arbitration-engine`, `./lib/strategic-planning-engine`, `./lib/memory/gateway`, `./lib/memory/working-memory`, `./lib/temporal/session-tracker`, `./lib/embed`, `./agent-system/backup-manager`, `./agent-system/domain-agents`, `./lib/kernel`, `./lib/clients`, `./lib/pg_helpers`, `./lib/storage`, `./lib/apex-tools`, `child_process`, `path`, `fs`, `crypto` |
| Interfaces | All HTTP routes mounted on the Express app; no direct module.exports consumed externally |
| Entry Points | `node server.js` (process start); Render web service entrypoint |
| Exit Points | HTTP responses to all API clients; `process.exit(1)` on fatal env or crash; Sentry error captures; Supabase `apex_notifications` error sink writes |
| Runtime Presence | ALWAYS (persistent server process) |
| Persistence | NONE (stateless process; state delegated to Supabase Postgres and Supabase Storage) |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Sentry DSN integration; stdout console logging; `_errBuffer` in-memory ring buffer; GIT_SHA logged at startup |
| Governance Status | GOVERNED (constitutional middleware chain via `./lib/kernel`; env validation on startup) |
| Confidence | HIGH |
| Evidence | File confirmed at path; first 150 lines read — env validation block, Sentry init, crash handlers, full import manifest, and Supabase client instantiation all observed directly |
| Unknown Fields | Exact port number (not visible in first 150 lines); full route manifest; export shape |

---

### ENT-000041 — instrument.js

**Family:** BLOCK-03 | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | `C:\Users\arwwo\Desktop\APEX\Scripts\instrument.js` |
| Parent | Scripts (root) |
| Description | Minimal Sentry SDK initialisation shim. Calls `Sentry.init()` with `dsn` from `process.env.SENTRY_DSN` and `tracesSampleRate: 0.1`. Runs in strict mode. |
| Purpose | Ensures Sentry is initialised before any other module loads — must be `require()`d as the very first line of `server.js` so error capture is active from process start. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript (Node.js / CommonJS) |
| Created By | UNKNOWN |
| Consumers | `server.js` (line 1: `require('./instrument.js')`) |
| Dependencies | `@sentry/node` |
| Interfaces | No exports; side-effect only module |
| Entry Points | `require('./instrument.js')` from `server.js` |
| Exit Points | None (side-effect: Sentry SDK initialised globally) |
| Runtime Presence | ON_STARTUP (executed once at process start via require) |
| Persistence | NONE |
| Documentation | UNKNOWN |
| Test Coverage | UNKNOWN |
| Observability | Sentry itself (this file is the observability bootstrap) |
| Governance Status | UNGOVERNED (no constitutional checks; purely a telemetry shim) |
| Confidence | HIGH |
| Evidence | File confirmed at path; full file read — 7 lines, Sentry.init call with DSN env var and 0.1 sample rate |
| Unknown Fields | Whether SENTRY_DSN is set in production environment |

---

### ENT-000042 — cron.js

**Family:** BLOCK-03 | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | `C:\Users\arwwo\Desktop\APEX\Scripts\src\workers\cron.js` |
| Parent | `src/workers/` |
| Description | Cron worker module for the APEX AI OS. Uses `node-cron` to register a `* * * * *` (every-minute) schedule that fires a heartbeat log. Body is a TODO placeholder — no production task logic is currently implemented beyond the log line. Exports an empty object. |
| Purpose | Provides the scheduled background-job harness for the system. Intended to be extended with additional `cron.schedule()` calls for periodic tasks (memory cleanup, metric collection, agent heartbeats, etc.). |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript (Node.js / CommonJS) |
| Created By | UNKNOWN |
| Consumers | UNKNOWN — module is not yet wired into `server.js` based on visible imports; likely spawned as a separate worker process or required by a worker loader |
| Dependencies | `node-cron` |
| Interfaces | `module.exports = {}` (no exported API) |
| Entry Points | `require('./src/workers/cron')` or direct `node src/workers/cron.js` |
| Exit Points | stdout log line per minute; no return values or DB writes currently |
| Runtime Presence | ALWAYS (once loaded, the cron timer persists for the lifetime of the process) |
| Persistence | NONE (heartbeat only; no state written) |
| Documentation | Inline comment: "Extend this file with additional cron.schedule() calls as needed" |
| Test Coverage | UNKNOWN |
| Observability | Console log per tick: `[CRON] <ISO timestamp> - heartbeat started` |
| Governance Status | UNGOVERNED (placeholder; no constitutional or approval hooks present) |
| Confidence | HIGH |
| Evidence | File confirmed at path; full file read — 14 lines; single schedule registered, empty export confirmed |
| Unknown Fields | Whether this file is actively required/spawned in the current Render deployment |

---

### ENT-000051 — task-router.js

**Family:** BLOCK-03 | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | `C:\Users\arwwo\Desktop\APEX\Scripts\runtime\task-router.js` |
| Parent | `runtime/` |
| Description | Pure-logic request classifier that maps any incoming task objective to a `RouteDecision` before any model call, memory read, or agent stage. Applies four ordered routing rules: (1) constitutional/destructive escalation to Founder, (2) executive-entity routing (CSO/CIO/CFO/CTO/COO/CGO) by domain pattern, (3) pure research routing, (4) default agent pipeline with complexity scoring. Exports `route()`, `routeAndLog()`, and the `RouteDecision` class. |
| Purpose | Serves as the routing brain of the APEX runtime — prevents expensive model calls on simple tasks, enforces mandatory Founder approval on destructive operations, and directs executive-level questions to the appropriate entity. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript (Node.js / CommonJS) |
| Created By | UNKNOWN |
| Consumers | Agent pipeline orchestrator; any runtime component that needs a routing decision before dispatching a task |
| Dependencies | `../lib/logger` |
| Interfaces | `route(request) → RouteDecision`, `routeAndLog(request) → RouteDecision`, `class RouteDecision { route, entity, priority, complexity, reasoning, flags, decidedAt }` |
| Entry Points | `route({ objective, filesToModify?, taskId?, source? })` or `routeAndLog(request)` |
| Exit Points | Returns a `RouteDecision` object; `routeAndLog` additionally emits a structured log entry via `logger.info` |
| Runtime Presence | ON_REQUEST (called per task submission) |
| Persistence | NONE (stateless; no DB writes) |
| Documentation | Inline comments per routing phase; class field documentation in constructor |
| Test Coverage | UNKNOWN |
| Observability | `logger.info('task-router', 'routed', {...})` on every `routeAndLog` call |
| Governance Status | GOVERNED (escalation pattern enforces `requiresApproval: true` on constitutional/destructive objectives; security pattern elevates priority and approval flag) |
| Confidence | HIGH |
| Evidence | File confirmed at path; full file read — 145 lines; all four routing phases, pattern constants, complexity classifier, and exports confirmed |
| Unknown Fields | Which callers currently invoke `routeAndLog` vs `route` directly |

---

### ENT-000047 — piper_server/server.py

**Family:** BLOCK-03 | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | `C:\Users\arwwo\Desktop\APEX\Scripts\piper_server\server.py` |
| Parent | `piper_server/` |
| Description | FastAPI-based text-to-speech microservice wrapping the Piper TTS engine. Loads a local ONNX voice model (`voices/en_US-amy-medium.onnx`) at startup. Exposes two HTTP endpoints: `GET /health` (liveness check) and `POST /tts` (synthesise text to WAV audio). Applies permissive CORS middleware (all origins). Streams audio back as `audio/wav` response bytes. |
| Purpose | Provides on-premise TTS capability to the APEX AI OS voice pipeline — converts text strings to WAV audio without any external TTS API calls, keeping voice synthesis private and cost-free at runtime. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | Python 3 |
| Created By | UNKNOWN |
| Consumers | Any APEX component that POSTs to `/tts`; voice pipeline in the Node.js backend (via HTTP) |
| Dependencies | `fastapi`, `fastapi.responses.Response`, `fastapi.middleware.cors.CORSMiddleware`, `piper.voice.PiperVoice`, `wave`, `io`, `os`, `time`; ONNX model file `voices/en_US-amy-medium.onnx` |
| Interfaces | `GET /health → { ok: true }`, `POST /tts (body: { text: string }) → audio/wav bytes` |
| Entry Points | FastAPI ASGI app object (`app`); launched via uvicorn or similar ASGI server |
| Exit Points | HTTP `audio/wav` response body; HTTP 400 if text empty; HTTP 500 if synthesis yields no chunks; stdout timing log per synthesis |
| Runtime Presence | ON_STARTUP (voice model loaded once; server stays alive to handle requests) |
| Persistence | NONE (stateless; no DB writes) |
| Documentation | Inline print statements at startup confirming model load and sample rate |
| Test Coverage | UNKNOWN |
| Observability | stdout: `[piper] Loading voice model...`, `[piper] Ready — {Hz}`, per-request: `[piper] {chars}ch -> {bytes}B WAV in {s}s` |
| Governance Status | UNGOVERNED (no auth on endpoints; CORS open to all origins; relies on network isolation for security) |
| Confidence | HIGH |
| Evidence | File confirmed at path; full file read — 40 lines; both endpoints, CORS middleware, model path, and WAV assembly logic confirmed |
| Unknown Fields | Port the ASGI server binds to; whether the model file is committed or downloaded at deploy time |

---

### ENT-001130 — civilization-kernel.js

**Family:** BLOCK-22 | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | `C:\Users\arwwo\Desktop\APEX\Scripts\middleware\civilization-kernel.js` |
| Parent | `middleware/` |
| Description | Express middleware implementing the APEX Civilisation Kernel — a 7-phase per-request pipeline: INIT (execution context creation), IDENTITY (session/class hydration), CONSTITUTION (constitutional gate evaluation with ALLOW/WARN/RESTRICT/DENY verdicts), GOALS (active goal resolution and scoring), ATTENTION (composite attention score → tier → execution profile), POST HOOK (async audit + memory write + goal update after response), and async MEMORY HYDRATION (non-blocking context load). Emits X-Apex-* response headers on every request. Writes to `logs/kernel.ndjson` and `logs/apex_audit.ndjson`. Fail-open design: errors in any phase call `next()` rather than hanging. |
| Purpose | Enforces constitutional governance, attention-driven resource allocation (token budget, memory read limit, retry budget, planning depth, timeout), and episodic/decision memory persistence on every request passing through the APEX backend. It is the civilisation's cognitive spine. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript (Node.js / CommonJS) |
| Created By | UNKNOWN |
| Consumers | `server.js` (mounted as global Express middleware via `./lib/kernel` chain); any route handler that reads `req.apex`, `req.apexAttentionTier`, `req.apexMemTokenBudget`, etc. |
| Dependencies | `fs`, `path`, `../lib/runtime/execution-context`, `../lib/runtime/constitutional-gate`, `../lib/goals/goal-graph`, `../lib/attention/attention-engine`, `../lib/memory/gateway`, `../lib/cognitive/runtime/autonomy-runtime-controller` (lazy, fail-open), `../lib/constitution/watchdog` (lazy, fail-open) |
| Interfaces | `civilizationKernel(req, res, next)` — standard Express middleware function; exported as `module.exports = civilizationKernel` |
| Entry Points | Called by Express for every incoming request via middleware chain |
| Exit Points | `next()` (to route handler); `res.status(403).json(...)` on CONSTITUTIONAL_DENY; post-response `setImmediate` writes to memory gateway and audit log; appends to `kernel.ndjson` and `apex_audit.ndjson` |
| Runtime Presence | ALWAYS (fires on every HTTP request) |
| Persistence | DURABLE — writes episodic memory (layer 2) and decision memory (layer 7) to Supabase via `memGateway.storeMemory()`; appends to two NDJSON audit/log files on disk |
| Documentation | Inline phase comments; W1–W4 work-item markers throughout; `// Pipeline: INIT → IDENTITY → CONSTITUTION → GOALS → ATTENTION → [route] → POST HOOK` header |
| Test Coverage | UNKNOWN |
| Observability | `X-Apex-Request-Id`, `X-Apex-Constitution`, `X-Apex-Constitution-Verdict`, `X-Apex-Constitution-Action`, `X-Apex-Attention`, `X-Apex-Attention-Score`, `X-Apex-Attention-Tier`, `X-Apex-Token-Budget`, `X-Apex-Execution-Profile`, `X-Apex-Goals-Active` headers on all responses; `logs/kernel.ndjson` and `logs/apex_audit.ndjson` append-only files |
| Governance Status | CONSTITUTIONAL (this module IS the constitutional enforcement layer; applies gate verdicts, enforces DENY, halves token budgets on RESTRICT, flags human review on WARN) |
| Confidence | HIGH |
| Evidence | File confirmed at path; full file read — 384 lines; all 7 pipeline phases, constitutional gate integration, attention scoring, audit ledger writes, and memory gateway calls confirmed |
| Unknown Fields | Whether `logs/` directory is persisted across Render deploys or ephemeral; exact autonomy runtime controller composite score in production |

---

### ENT-001131 — lib/middleware.js

**Family:** BLOCK-22 | **Type:** FILE | **Status:** Production | **Confidence:** HIGH

| Attribute | Value |
|---|---|
| Path | `C:\Users\arwwo\Desktop\APEX\Scripts\lib\middleware.js` |
| Parent | `lib/` |
| Description | Authentication and identity middleware library for the APEX backend. Provides: app-key verification via timing-safe comparison (`hasAppAccess`, `requireAppAccess`); cron-secret verification (`hasCronAccess`, `requireCronAccess`); cookie parser (`parseCookies`); dashboard auth guard with JWT cookie + app-key + scoped API-key support and HTML login page fallback (`requireAuth`); full identity resolution with auth-method detection (`resolveIdentity`); and task-ownership resolution from Postgres (`resolveOwnership`). Includes the full `LOGIN_HTML` string for the Apex login UI. |
| Purpose | Centralises all authentication, identity, and ownership gate logic so route handlers remain thin. Implements Kernel Gate 1 (Identity) and Kernel Gate 2 (Ownership) as described in inline comments. |
| Owner | The Founder (ENT-000002) |
| Visibility | INTERNAL |
| Source | AUTHORED |
| Language | JavaScript (Node.js / CommonJS) |
| Created By | UNKNOWN |
| Consumers | `server.js` route definitions; any route module requiring auth guards; `civilization-kernel.js` implicitly depends on the identity established here |
| Dependencies | `jsonwebtoken`, `crypto`, `./pg_helpers` (`pgGetAgentTask`) |
| Interfaces | Exports: `hasAppAccess(req) → bool`, `requireAppAccess(req, res, next)`, `hasCronAccess(req) → bool`, `requireCronAccess(req, res, next)`, `parseCookies(req) → object`, `requireAuth(req, res, next)`, `resolveIdentity(req, res, next)`, `resolveOwnership(req, res, next)`, `LOGIN_HTML: string` |
| Entry Points | Each exported function is an Express middleware or utility called by route definitions in `server.js` |
| Exit Points | `next()` on success; `res.status(401).json(...)` or `res.status(401).send(LOGIN_HTML)` on auth failure; `res.status(503)` if JWT_SECRET not configured; sets `req.identity` and `req.ownership` on success paths |
| Runtime Presence | ON_REQUEST (middleware functions invoked per matched route) |
| Persistence | NONE directly; `resolveOwnership` performs a read from Postgres (`pgGetAgentTask`) but writes nothing |
| Documentation | Inline section headers (`// ── App-key access check ──`); comment explaining single-user identity model and V1.2 multi-user migration path |
| Test Coverage | UNKNOWN |
| Observability | `console.warn('[Auth] jwt.verify failed:', err.message)` on JWT verification failure; otherwise silent on success paths |
| Governance Status | GOVERNED (timing-safe credential comparisons; JWT verification; BYPASS_DASHBOARD_AUTH blocked in production via NODE_ENV check; scoped API key distinguished from full app key) |
| Confidence | HIGH |
| Evidence | File confirmed at path; full file read — 252 lines; all exported functions, LOGIN_HTML, and both kernel gate stubs confirmed |
| Unknown Fields | Whether `APEX_HUMAN_ID` env var is set in production; multi-user migration timeline for V1.2 |

---

*End of 08b — Block 03 + Block 22 Full Attribute Expansion*
