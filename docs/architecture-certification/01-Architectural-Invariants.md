# 01 — Architectural Invariants

**Date:** 2026-07-02  
**Mode:** Certification — Evidence-only classification

---

## Invariant Classification Table

Each invariant is classified with supporting implementation evidence. Evidence references are to files read in Phases 2.1 and 2.2.

---

## AUTHENTICATION INVARIANTS

### INV-A1: All API requests require authentication

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `routes/*.js` files use `router.use(require('../lib/app-auth'))` at router level — enforced for all routes within those files
- server.js applies rate limiters and civilization-kernel BEFORE auth checks — requests pass through global middleware without auth
- 7 public endpoints confirmed: `GET /health`, `GET /manifest.json`, `GET /sw.js`, `GET /apex-v2.css`, `GET /apex-custom.css`, `GET /apex-custom.css`, `GET /api/operations/healthz`, `GET /api/operations/version`, `GET /api/operations/status`, `GET /api/operations/ping`, `GET /api/operations/ready`, `GET /api/operations/metrics`
- These bypass auth by architecture, not by error

**Classification basis:** Bypass is structural and intentional for specific endpoints. For API endpoints, auth is enforced. For operations endpoints, it is not.

---

### INV-A2: Authentication cannot be bypassed

**Verdict:** NOT ENFORCED

**Evidence:**
- `lib/middleware.js requireAuth` — Step 1: `if (process.env.BYPASS_DASHBOARD_AUTH === 'true' && process.env.NODE_ENV !== 'production')` → passes immediately
- This bypass is guarded by `NODE_ENV !== 'production'` — but NODE_ENV is an environment variable set by the operator, not by any runtime enforcement mechanism
- No cryptographic or hardware-level enforcement of NODE_ENV
- Any operator can set `BYPASS_DASHBOARD_AUTH=true` with any NODE_ENV value
- `requireAppAccess` (for API routes) has no equivalent bypass — enforced

**Classification basis:** Dashboard auth (requireAuth) has a documented bypass path. API auth (requireAppAccess) does not. Invariant partially holds for APIs, fails for dashboard.

---

### INV-A3: All requests carry verified identity

**Verdict:** NOT ENFORCED

**Evidence:**
- `lib/kernel.js kernelChain` Gate 1: `resolveIdentity` — fail-soft: "Error → continues with anonymous identity"
- `resolveIdentity` sets `req.identity` with `{ role, entityId, sessionId, source }` — but on error, sets anonymous identity and calls `next()`
- Downstream code consuming `req.identity` cannot distinguish verified identity from anonymous fallback identity
- No request is rejected solely because identity resolution failed

**Classification basis:** Identity is attached but not verified. The implementation guarantees that `req.identity` is set, not that it is trustworthy.

---

### INV-A4: WebSocket connections require authentication

**Verdict:** ENFORCED

**Evidence:**
- `lib/ws-handler.js` HTTP upgrade handler: `crypto.timingSafeEqual(providedToken, APP_ACCESS_KEY)` on `?token=` query param
- On auth failure: `socket.destroy()` — connection terminated immediately
- No fallback path exists in the WebSocket upgrade handler
- `/ws/*` sub-paths fall through silently (reserved), all other paths: `socket.destroy()`

**Classification basis:** WebSocket auth gate has no fail-open path. Failure is fail-closed (destroy).

---

### INV-A5: Timing attacks on authentication are prevented

**Verdict:** ENFORCED

**Evidence:**
- `lib/middleware.js hasAppAccess()`: `crypto.timingSafeEqual(Buffer.from(req.headers['x-app-key']), Buffer.from(APP_ACCESS_KEY))`
- `lib/middleware.js hasCronAccess()`: `crypto.timingSafeEqual(...)` used
- `lib/ws-handler.js`: `crypto.timingSafeEqual(...)` used
- All key comparisons use constant-time comparison

**Classification basis:** All key comparisons confirmed to use `crypto.timingSafeEqual`. No string equality comparison (`===`) found for secrets.

---

## AUTHORIZATION INVARIANTS

### INV-B1: Authority is checked before privileged operations

**Verdict:** NOT ENFORCED

**Evidence:**
- `lib/kernel.js` Gate 4: `checkGovernance` — from Phase 2.2 evidence: "ALWAYS calls next() regardless"
- `lib/agent-file-utils.js checkGovernance`: calls next() unconditionally — governance check never blocks
- `lib/kernel.js` Gate 3: `checkAuthority` — FAIL-OPEN: "Error → calls next(), does not block"
- Result: kernelChain Gates 3 and 4 are advisory only — they never block execution

**Classification basis:** The code structure suggests authority checking, but the implementation of the two authority-related gates (checkAuthority on error, checkGovernance always) means they do not enforce authority.

---

### INV-B2: Ownership is consistently enforced

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `lib/kernel.js` Gate 2: `resolveOwnership` — fail-soft: error → continues
- `req.ownership` is set but downstream route handlers are not uniformly observed to check it
- No confirmed evidence that route handlers reject requests with null or failed ownership
- Some executive routes use `checkAccess(req, section)` (routes/founder.js) — additional per-section check

**Classification basis:** Ownership is resolved but enforcement by downstream consumers is inconsistent and not universally confirmed.

---

### INV-B3: Cron access is segregated

**Verdict:** ENFORCED

**Evidence:**
- `lib/middleware.js requireCronAccess`: separate `CRON_SECRET` env var, timing-safe comparison
- Applied to `/api/cron/*` routes — distinct from APP_ACCESS_KEY
- No bypass path found in requireCronAccess

**Classification basis:** Cron auth uses a dedicated secret not shared with API auth.

---

## CONSTITUTIONAL INVARIANTS

### INV-C1: All requests pass through constitutional validation

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `middleware/civilization-kernel.js` applied at `app.use(...)` — all routes pass through it
- Phase 2 of civilization-kernel calls `constitutional-gate.evaluate()`
- BUT: constitutional-gate is FAIL-OPEN — "Any error in gate evaluation → returns ALLOW"
- 400ms timeout → returns RESTRICT (not DENY) — request continues
- DENY verdict does block (403) — but DENY is only returned for specific patterns, not on error

**Classification basis:** Every request passes through the gate. The gate can fail in ways that allow the request to continue.

---

### INV-C2: Constitutional denial is enforced

**Verdict:** ENFORCED (for explicit DENY verdicts)

**Evidence:**
- `middleware/civilization-kernel.js`: DENY verdict → immediate 403 response
- No code path bypasses the DENY → 403 path
- RESTRICT verdict continues with `req._restricted = true`

**Classification basis:** When the gate correctly evaluates to DENY, the response is blocked. The weakness is in gate error behavior (fail-open), not in the DENY enforcement itself.

---

### INV-C3: Governance evidence chain is maintained

**Verdict:** SIMULATED ONLY

**Evidence:**
- `lib/governance.js`: SHA-256 blockchain-style linking — every write includes `previousHash`
- BUT: all writes use `_w(fn)` — fire-and-forget wrapper that swallows all errors
- Chain gaps occur silently when writes fail
- Chain gaps are never detected or alerted at runtime
- `_w()` implementation: `fn().catch(err => logger.error(...))`  — error only logged, chain not repaired
- No verification of chain continuity runs at runtime

**Classification basis:** The hash chain is constructed and stored, creating the appearance of an immutable audit trail. But gaps (from failed writes) are silent and undetected. The chain cannot be trusted as complete.

---

### INV-C4: Constitutional amendment is controlled

**Verdict:** ENFORCED

**Evidence:**
- `lib/constitution/evolution-manager.js`: rate limit 3 proposals/60s per principleId
- FNV-1a hash verification before storing amendments
- 4 attack detection types — detects manipulation attempts
- `lib/constitution/steward.js`: requiresFounderApproval for PRIVACY/AUTHORITY domains
- Amendments stored in `amendments.json` on filesystem, not DB (protects from SQL injection)

**Classification basis:** Amendment path has genuine guards. Rate limiting, hash verification, and attack detection are implemented.

---

## MEMORY INVARIANTS

### INV-D1: Memory access is controlled

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `lib/memory/access-controller.js check()` throws `AccessDeniedError` on permission failure
- `lib/memory/gateway.js storeMemory()` calls access-controller before writing
- BUT: `lib/governance.js` creates own Supabase client and writes to memory-related tables directly — bypasses gateway entirely
- `lib/chat-context.js extractAndSaveFacts()` calls `_gateway.storeMemory()` — goes through access-controller
- `middleware/civilization-kernel.js` post-hook calls episodic/decision memory writes — through gateway (controlled)
- Multiple modules with own Supabase clients can write to memory tables directly, bypassing access-controller

**Classification basis:** The access-controller is enforced on writes that go through lib/memory/gateway.js. Direct Supabase writes by modules with own clients bypass it entirely.

---

### INV-D2: Memory quotas are enforced

**Verdict:** NOT ENFORCED

**Evidence:**
- `lib/memory/memory-governor.js` — confirmed from Phase 2.2: "ZERO quota enforcement"
- Exports: `generateMemoryId, buildGovernanceFields, contentHash, lifecycleTransition, accumulateSupport, recordContradiction, deriveCompetencyLevel`
- None of these functions enforce write limits, rate limits, or size limits
- The name "memory-governor" implies quota enforcement; the implementation contains none

**Classification basis:** The governor module exists and is exported but enforces no quotas. The naming is misleading.

---

### INV-D3: Memory writes produce audit records

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `lib/memory/gateway.js storeMemory()`: calls `_gateway.storeMemory()` which calls `reflexion-tracker.recordInfluence()` via setImmediate
- BUT: reflexion-tracker has confirmed bug — `decisionMemoryId` always null (queries `'id'` column, PK is `'memory_id'`)
- The reflexion record is created but the link to the decision that triggered it is broken
- `lib/governance.js onPipelineComplete()`: writes governance evidence — but via _w() fire-and-forget
- Audit writes are attempted but can fail silently

**Classification basis:** Audit records are attempted for all memory writes through the gateway. The attempt is not guaranteed to succeed, and the reflexion link is permanently broken by the known bug.

---

### INV-D4: Memory layer isolation is enforced

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `lib/memory/index.js` barrel exports 13 layers as separate modules
- Each layer has its own table(s) in the database
- BUT: `lib/memory/gateway.js storeMemory()` routes by `layer` parameter — any caller can specify any layer number
- Access-controller enforces entity class permissions, but there is no layer-specific isolation for callers with write permission
- A SYSTEM entity can write to Layer 1 (working memory) or Layer 7 (decision memory) using the same call pattern

**Classification basis:** Layer isolation is structural (separate tables) but not enforced at the API level for callers with write permission.

---

## AGENT EXECUTION INVARIANTS

### INV-E1: Agents require approval before execution

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `lib/agent-task-cycle.js executeApprovedAgentTask()`: "AUTONOMY_LEVEL 1 or 2 → return `status: 'pending_approval'` immediately"
- BUT: AUTONOMY_LEVEL=3 bypasses approval gate entirely — confirmed from Phase 2.2
- AUTONOMY_LEVEL is read from `process.env.AUTONOMY_LEVEL` — string comparison `=== "3"`
- Any operator setting AUTONOMY_LEVEL=3 in env eliminates the approval requirement
- autoRunReadOnlyTaskSteps also has its own AUTONOMY_LEVEL check — duplicated, not centralized

**Classification basis:** Approval is enforced for AUTONOMY_LEVEL 1 and 2. At level 3, all safe steps auto-execute without human approval. Level 3 is the current production setting.

---

### INV-E2: Agents are limited to safe action types

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `lib/agent-task-cycle.js validateAgentSteps()` — hard allowlist of 8 types enforced at planning
- Unknown step type → fatal error, task fails
- BUT: this is only enforced in the agent-task-cycle.js path
- `agent-system/master-orchestrator.js runAgentTeam()` routes to `agent-system/orchestrator.js` — different execution path, different step type controls (not read in full)
- `agent-system/master-orchestrator.js planFeature()` generates `filesToModify`, `filesToCreate`, `steps` — these are code modification steps, not from the 8-type allowlist

**Classification basis:** The 8-type allowlist is enforced on the agent-task-cycle path. The master-orchestrator/runAgentTeam path has different constraints that were not fully read.

---

### INV-E3: Agent task routing is mandatory

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `runtime/task-router.js route()` — classifies into 4 routes: founder_escalation, executive_runtime, research_system, agent_pipeline
- But task-router is called from `runAgentPlanningCycle` — which is called from `runDueSchedules` and from the scheduled path
- Direct calls to `executeApprovedAgentTask` from API routes do NOT necessarily pass through task-router
- Routes can call agent functions directly without routing classification

**Classification basis:** Task routing exists but is not a mandatory gate on all agent execution paths.

---

## EXECUTIVE INVARIANTS

### INV-F1: Executive decisions require full council participation

**Verdict:** NOT ENFORCED

**Evidence:**
- `lib/executive/registry.js`: 9 entities defined — CHO, CLO, CRO are NOT in VOTING_ENTITIES
- `lib/executive/trigger-evaluator.js`: `getTriggeredRoles(ctx)` may return a subset of entities based on context
- `executive-council.js deliberate()`: votes collected from triggered+voting entities only — not all 9
- A decision can proceed with as few as 1 entity voting (if only 1 is triggered)
- Escalation threshold: `avgConfidence < 0.45` — not a quorum requirement

**Classification basis:** No minimum quorum is enforced. A single entity can determine an executive decision if it is the only one triggered.

---

### INV-F2: Executive escalation is enforced

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- Escalation fires if `anyEscalate === true` OR `avgConfidence < 0.45`
- On escalation: `escalateToFounder()` → `slack-alerts.alertCritical()`
- But: Slack alertCritical can fail if Slack is down or SLACK_BOT_TOKEN is missing
- No fallback when Slack escalation fails — escalation is silently lost
- SLACK_BOT_TOKEN presence is not guaranteed in production

**Classification basis:** The escalation logic is correct. The delivery mechanism (Slack) has no fallback.

---

## DATABASE INVARIANTS

### INV-G1: Database writes are transactional

**Verdict:** NOT ENFORCED

**Evidence:**
- `lib/pg_helpers.js`: 63 pg functions — individual INSERT/UPDATE/SELECT statements
- No confirmed transaction blocks (`BEGIN`/`COMMIT`/`ROLLBACK`) found across any file reads
- `lib/governance.js onPipelineComplete()`: fans out to 15+ table writes via individual `_w()` calls — no transaction
- Multi-step operations (e.g., task status cycle: planned→approved→running→completed) are separate DB calls without atomic transaction
- Partial completion of multi-step writes leaves inconsistent state

**Classification basis:** No transactional guarantee found in any confirmed code path. Multi-step writes are not atomic.

---

### INV-G2: All database writes are governed

**Verdict:** NOT ENFORCED

**Evidence:**
- 5 independent Supabase clients confirmed — governance.js, integrity-crons.js, outbox-relay.js, write-with-outbox.js, routes/intelligence.js each create their own `createClient()`
- These clients write directly to tables without going through lib/memory/gateway.js
- lib/memory/gateway.js access-controller is bypassed by all direct-client writes
- lib/governance.js writes to tables via its own client — these writes are not themselves governed by a higher layer

**Classification basis:** Governance is performed as a side-effect write, not as a gate. Writes can occur without governance by using a direct Supabase client.

---

## OBSERVABILITY INVARIANTS

### INV-H1: All failures produce telemetry

**Verdict:** NOT ENFORCED

**Evidence:**
- `lib/telemetry/aggregator.js computeCivilizationHealth()` snapshot write: **intentionally disabled** (DATA-5 comment)
- `lib/governance.js _w()`: failures only logged to console — no Supabase write, no Slack alert on governance failure
- `lib/memory/reflexion-tracker.js recordInfluence()`: BUG causes null decisionMemoryId — failure mode not surfaced as telemetry
- `lib/event-consumer.js _handle()`: Slack notification failure silently swallowed — no telemetry
- `lib/health/monitor.js`: tracks failures in-memory only — resets on process restart

**Classification basis:** Multiple confirmed failure paths produce no telemetry. The telemetry aggregator's snapshot write is disabled by code comment.

---

### INV-H2: All failures produce log entries

**Verdict:** PARTIALLY ENFORCED

**Evidence:**
- `lib/governance.js _w()`: errors caught by `logger.error()`
- `lib/memory/gateway.js`: write failures → `logger.error()`
- `lib/event-consumer.js _handle()`: Slack failure is silently swallowed (no log confirmed)
- `middleware/civilization-kernel.js` post-hook: audit writes in setImmediate — errors caught but log confirmed
- `lib/health/monitor.js`: logs status transitions to console

**Classification basis:** Most failure paths log. The event-consumer Slack failure path appears to swallow the error without logging.
