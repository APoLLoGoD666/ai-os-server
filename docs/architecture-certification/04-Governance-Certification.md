# 04 — Governance Certification

**Date:** 2026-07-02  
**Mode:** Certification — Evidence-only

---

## Governance Architecture Overview

APEX has three distinct governance layers that are often conflated:

| Layer | File | What it does |
|-------|------|-------------|
| Constitutional Gate | `lib/runtime/constitutional-gate.js` | Per-request safety verdict (ALLOW/RESTRICT/DENY) |
| Kernel Chain | `lib/kernel.js` | Identity, ownership, authority, governance gates on /api/* |
| Governance Evidence | `lib/governance.js` | Records actions to evidence chain (audit trail) |

These are independent systems. None of them calls the others. They coexist on the same request path but serve different purposes.

---

## Constitutional Gate Certification

**File:** `lib/runtime/constitutional-gate.js`  
**Called by:** `middleware/civilization-kernel.js` Phase 2  
**Applied to:** All requests (via app.use)

### Certification: Is the gate mandatory?

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `app.use(require('./middleware/civilization-kernel'))` applied before all routes — no route can bypass civilization-kernel
- civilization-kernel Phase 2 calls `constitutional-gate.evaluate()`
- BUT: `evaluate()` is fail-open — any exception → returns ALLOW
- 400ms timeout → RESTRICT (not DENY) — request always continues
- DENY verdict: fires 403 — ENFORCED for explicit denials
- ALLOW verdict: fires nothing — ENFORCED for explicit allows
- Error in gate: fires ALLOW — constitutes bypass by failure

**Summary:** The gate fires on every request. It can produce ALLOW, RESTRICT, or DENY. DENY is enforced. But error or timeout causes ALLOW — the gate becomes a no-op on failure.

---

### Certification: Does RESTRICT have effect?

**Verdict: PARTIALLY ENFORCED**

Evidence:
- RESTRICT sets `req._restricted = true`
- `lib/agent-task-cycle.js planFeature()`: "RESTRICT → halve maxTokens to 1500, set `feature._restricted = true`"
- Only confirmed consumer of `req._restricted` flag: master-orchestrator.js planFeature()
- Whether other route handlers respect `req._restricted` is UNKNOWN

**Summary:** RESTRICT has confirmed effect in one code path (master-orchestrator). Unknown if other handlers enforce it.

---

### Certification: 5 Safety Checks

| Check | Implementation | Verdict |
|-------|---------------|---------|
| Authority | Reads AUTONOMY_LEVEL vs requirement map | PARTIALLY ENFORCED (same env var as other checks) |
| Risk | Pattern matching on request | ENFORCED within gate lifetime |
| Modification governance | DB-mutating path check | PARTIALLY ENFORCED (fail-open) |
| Deception detection | Pattern matching | ENFORCED within gate lifetime |
| Confabulation guard | Pattern matching | ENFORCED within gate lifetime |

---

## kernelChain Gate Certification

**File:** `lib/kernel.js`  
**Applied to:** `/api/*` routes only  
**Pattern:** `app.use('/api', ...kernelChain)`

### Gate 1: resolveIdentity

**Verdict: PARTIALLY ENFORCED**

Evidence: Attaches identity to req. Fail-soft — error → anonymous identity → next(). Identity is always attached. Verification of identity is not guaranteed.

### Gate 2: resolveOwnership

**Verdict: PARTIALLY ENFORCED**

Evidence: Attaches ownership context. Fail-soft. Ownership may be null/anonymous. Downstream enforcement of ownership not confirmed universally.

### Gate 3: checkAuthority

**Verdict: PARTIALLY ENFORCED**

Evidence: `lib/agent-file-utils.js checkAuthority()` — checks autonomy level vs action requirement map for 12 protected action types. FAIL-OPEN on error → next(). Does not block on authority mismatch? — enforcement inside checkAuthority not fully confirmed beyond "calls next() on error."

### Gate 4: checkGovernance

**Verdict: NOT ENFORCED**

Evidence: `lib/agent-file-utils.js checkGovernance()` — Phase 2.2: "ALWAYS calls next()" confirmed. This gate does not block any request under any condition. It is advisory infrastructure only. The name implies enforcement that the implementation does not provide.

---

## lib/governance.js Evidence Chain Certification

**File:** `lib/governance.js` — 1046 lines  
**Own Supabase client:** Yes (not through lib/clients.js singleton)

### Certification: Are governance writes atomic with governed operations?

**Verdict: NOT ENFORCED**

Evidence:
- `_w(fn)` wrapper: `fn().catch(err => logger.error(...))`
- All 40+ domain writes use `_w()` — fire-and-forget
- The operation being governed and the governance record are two separate, non-atomic writes
- If governance write fails: operation succeeded, governance record missing — no rollback

### Certification: Is the evidence chain complete?

**Verdict: SIMULATED ONLY**

Evidence:
- SHA-256 hash linking is implemented: `hash = sha256(evidenceId + previousHash + content)`
- Each write includes `previousHash` referencing the prior record
- BUT: writes are fire-and-forget — gaps in the chain occur silently when writes fail
- No runtime verification of chain continuity
- `_w()` catches and logs but does not re-attempt or alert on failure
- A chain with gaps is indistinguishable from a complete chain at read time (unless specifically audited)

### Certification: Does governance cover all operations?

**Verdict: NOT ENFORCED**

Evidence:
- `onPipelineStart`, `onPipelineComplete`, `onPipelineFailure` are the three orchestration entry points
- These are called from agent pipeline flows — not from every API request
- Direct Supabase writes by modules with own clients generate no governance records
- WebSocket messages, SSE connections, non-agent API calls: governance coverage UNKNOWN

### Certification: 40+ Domain Functions

**Verdict for domain functions:** PARTIALLY ENFORCED

Evidence:
- 40+ domain functions exist and each writes domain-specific governance data
- Writes via `_w()` — can fail silently per domain
- Domain coverage is comprehensive for the agent pipeline path
- Non-pipeline operations: coverage unknown

---

## AUTONOMY_LEVEL Governance Gate

**Source:** `process.env.AUTONOMY_LEVEL`  
**Used in:** `lib/agent-task-cycle.js`, `lib/agent-step-utils.js`, `lib/cognitive/runtime/autonomy-runtime-controller.js`

### Certification: Is AUTONOMY_LEVEL enforcement consistent?

**Verdict: PARTIALLY ENFORCED**

Evidence:
- `lib/agent-task-cycle.js executeApprovedAgentTask()`: explicit string comparison `=== "1"` or `=== "2"` for approval gate
- `lib/agent-task-cycle.js autoRunReadOnlyTaskSteps()`: separate check `AUTONOMY_LEVEL >= 2`
- Two different code paths, two separate AUTONOMY_LEVEL checks — not centralized
- AUTONOMY_LEVEL is read from env at call time — changes to env var take effect immediately (no restart required? — UNKNOWN)
- String comparison `=== "3"` means the value must be exactly "3", not "03" or " 3"

**Summary:** Autonomy enforcement exists at AUTONOMY_LEVEL 1 and 2. Level 3 eliminates human approval for safe steps. The current production setting (AUTONOMY_LEVEL=3) means this governance gate is not active in production.

---

## Governance Summary Table

| Governance Component | Verdict | Evidence |
|---------------------|---------|---------|
| Constitutional gate fires on all requests | PARTIALLY ENFORCED | Fail-open on error |
| Constitutional DENY blocks request | ENFORCED | 403 issued immediately |
| kernelChain Gate 3 (authority) blocks requests | PARTIALLY ENFORCED | Fail-open on error |
| kernelChain Gate 4 (governance) blocks requests | NOT ENFORCED | Always calls next() |
| Governance writes atomic with operations | NOT ENFORCED | Fire-and-forget |
| Evidence chain is complete and verifiable | SIMULATED ONLY | Gaps possible, silent |
| AUTONOMY_LEVEL prevents agent execution | NOT ENFORCED at level 3 | String env var gate, bypassed at current production setting |
| All operations have governance records | NOT ENFORCED | Only pipeline ops have confirmed coverage |
