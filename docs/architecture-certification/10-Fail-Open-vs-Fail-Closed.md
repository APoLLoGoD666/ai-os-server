# 10 — Fail-Open vs Fail-Closed

**Date:** 2026-07-02  
**Mode:** Certification — Evidence-only

---

## Classification Definitions

| Mode | Definition |
|------|-----------|
| **FAIL-OPEN** | Failure causes the system to allow the operation to proceed |
| **FAIL-CLOSED** | Failure causes the system to block or reject the operation |
| **FAIL-SOFT** | Failure causes degraded but continued operation (usually logged) |
| **FAIL-SILENT** | Failure is swallowed with no observable effect |
| **FIRE-AND-FORGET** | Success/failure is not observed by the caller; side effects may not complete |

---

## Critical Subsystem Classification

### 1. Constitutional Gate

**File:** `lib/runtime/constitutional-gate.js`  
**Classification: FAIL-OPEN**

Evidence:
- Any exception in `evaluate()` → returns ALLOW
- 400ms timeout → returns RESTRICT (not DENY)
- DENY verdict: only returned for explicitly matched patterns (no error)
- Error case: the gate that is supposed to prevent dangerous operations allows them

**Implication:** A bug in the constitutional gate causes ALL requests to be permitted. There is no safe fallback that blocks requests when the gate cannot evaluate.

---

### 2. kernelChain Gate 3 (checkAuthority)

**File:** `lib/agent-file-utils.js`  
**Classification: FAIL-OPEN**

Evidence:
- Error in checkAuthority → `next()` called
- Authority check failure does not block the request

**Implication:** Any error in authority evaluation is equivalent to having authority granted.

---

### 3. kernelChain Gate 4 (checkGovernance)

**File:** `lib/agent-file-utils.js`  
**Classification: FAIL-OPEN (unconditional)**

Evidence:
- Always calls `next()` regardless of governance state
- Not a conditional fail-open — it is structurally open at all times

**Implication:** This gate provides zero blocking capability. Calling it "governance gating" is misleading.

---

### 4. resolveIdentity / resolveOwnership

**File:** `lib/middleware.js` (via lib/kernel.js)  
**Classification: FAIL-SOFT**

Evidence:
- Error → anonymous identity/ownership attached
- `next()` called
- Request proceeds with degraded identity

**Implication:** Identity resolution failure is invisible to route handlers. Downstream code cannot distinguish anonymous fallback from verified identity.

---

### 5. governance.js Writes (_w wrapper)

**File:** `lib/governance.js`  
**Classification: FAIL-SILENT**

Evidence:
- `_w(fn)`: `fn().catch(err => logger.error(...))`
- Error: logged to console, caught, not re-thrown
- Caller never knows write failed
- No retry, no alert, no chain repair

**Implication:** Governance evidence can be permanently missing with no observable effect on the governed operation.

---

### 6. Memory Gateway Writes

**File:** `lib/memory/gateway.js`  
**Classification: FAIL-SOFT**

Evidence:
- `storeMemory()`: wrapped in try/catch, error logged
- Write failure does not throw to caller
- Health monitor updated on failure (`recordRetrievalCall`)

**Implication:** Memory writes can fail silently. The caller sees no error. Health monitor degrades but no alert fires.

---

### 7. civilization-kernel Post-Response Hook

**File:** `middleware/civilization-kernel.js`  
**Classification: FIRE-AND-FORGET**

Evidence:
- `setImmediate(() => { episodic write; decision write; audit log append })` after response sent
- Caller (HTTP response cycle) cannot observe outcome
- Errors caught inside setImmediate callback — logged but no re-throw

**Implication:** Every request's audit record and memory write are best-effort. The HTTP response is sent before these complete.

---

### 8. LLM Circuit Breaker

**File:** `lib/models/runtime/index.js`  
**Classification: FAIL-CLOSED**

Evidence:
- 5 consecutive non-429 failures → circuit opens
- While open: `execute()` throws immediately without making API call
- Cooldown: exponential backoff, max 15 minutes
- No automatic fallback to alternate model

**Implication:** LLM failures are eventually fatal for that model. But there is no automatic fallback — the failure propagates to the caller. This is the correct fail-closed behavior for an LLM gate.

---

### 9. WebSocket Authentication

**File:** `lib/ws-handler.js`  
**Classification: FAIL-CLOSED**

Evidence:
- Bad token → `socket.destroy()`
- No fallback, no retry from the server side
- Connection is terminated immediately

**Implication:** WebSocket auth is correctly fail-closed.

---

### 10. Agent Queue

**File:** `lib/agent-queue.js`  
**Classification: FAIL-SOFT (on task failure) / FAIL-CLOSED (on drop)**

Evidence:
- Task exceeds MAX_QUEUE_DEPTH (50): dropped, logged, not queued — FAIL-CLOSED for that task
- Task execution fails: `AGENT_COMPLETED` emitted with `ok: false` — FAIL-SOFT (system continues, failure recorded)

**Implication:** The queue itself fails closed (drops excess). Individual task failures are soft (recorded, no system halt).

---

### 11. event-consumer.js Slack Notification

**File:** `lib/event-consumer.js`  
**Classification: FAIL-SILENT**

Evidence:
- `_handle()`: `try { await slack... } catch(err) { /* nothing */ }`
- Error: silently swallowed
- Event marked as processed regardless

**Implication:** Pipeline failure notifications can be lost permanently with no detection.

---

### 12. services/init.js Cascade

**File:** `services/init.js`  
**Classification: FAIL-SOFT**

Evidence:
- Each step wrapped in individual try/catch
- "Any step failure is non-fatal — the cascade continues"
- Server accepts requests regardless of init step failures

**Implication:** Subsystems that fail during init are silently absent. The server appears healthy.

---

### 13. Memory Reflexion Tracking

**File:** `lib/memory/reflexion-tracker.js` (called via setImmediate from gateway)  
**Classification: FAIL-SOFT + BUG**

Evidence:
- Called via `setImmediate` — fire-and-forget from gateway's perspective
- BUG: `decisionMemoryId` always null — function "succeeds" but writes null link
- The functional failure (null link) is NOT surfaced as an error — success is simulated

**Implication:** Reflexion tracking appears to work but the null link means the audit trail is permanently broken. This is a SIMULATED ONLY operation.

---

### 14. Obsidian Vault Writes

**File:** `agent-system/obsidian-memory.js`  
**Classification: FAIL-SOFT**

Evidence:
- `write()` / `append()`: exceptions caught, `false` returned
- `logLesson()`: returns `{ diskOk, supabaseOk }` — caller can check but does not always act on failure
- REST API write failure and filesystem write failure are independent

**Implication:** Vault writes can partially fail (REST OK, filesystem failed, or vice versa). Dual-write consistency is not guaranteed.

---

### 15. Constitution Crisis Manager

**File:** `lib/constitution/crisis-manager.js`  
**Classification: FAIL-CLOSED at EMERGENCY**

Evidence:
- At EMERGENCY: `_activateSafeDefaults()` restricts operations
- 4 invariants (P01, P05, P07, P08) cannot be suspended
- State machine does not fail silently — state transitions are tracked

**Implication:** The crisis manager does provide fail-closed behavior at EMERGENCY. Whether it fires correctly depends on the conditions that trigger the state machine (not fully confirmed).

---

## Fail-Open vs Fail-Closed Summary

| Subsystem | Classification | Security Impact |
|-----------|--------------|----------------|
| Constitutional gate (error) | FAIL-OPEN | HIGH — allows all requests through on gate failure |
| kernelChain checkAuthority (error) | FAIL-OPEN | MEDIUM — authority bypassed on error |
| kernelChain checkGovernance | FAIL-OPEN (unconditional) | HIGH — never blocks, by design |
| resolveIdentity / resolveOwnership | FAIL-SOFT | MEDIUM — anonymous identity on error |
| governance.js writes | FAIL-SILENT | HIGH — audit gaps invisible |
| memory gateway writes | FAIL-SOFT | MEDIUM — logged, not thrown |
| civilization-kernel post-hook | FIRE-AND-FORGET | MEDIUM — audit records best-effort |
| LLM circuit breaker | FAIL-CLOSED | LOW (correct behavior) |
| WebSocket auth | FAIL-CLOSED | LOW (correct behavior) |
| Agent queue | FAIL-SOFT / FAIL-CLOSED (drops) | LOW |
| event-consumer Slack notify | FAIL-SILENT | MEDIUM — failure notification lost |
| services/init cascade | FAIL-SOFT | MEDIUM — partial init invisible |
| Reflexion tracking | FAIL-SOFT + BUG | MEDIUM — null links always |
| Obsidian vault writes | FAIL-SOFT | LOW |
| Crisis manager | FAIL-CLOSED at EMERGENCY | LOW (correct behavior) |

---

## Critical Finding

The three most security-critical subsystems all fail toward permissiveness:

1. Constitutional gate: FAIL-OPEN (allows all on error)
2. kernelChain checkGovernance: unconditionally open
3. Governance writes: FAIL-SILENT (audit gaps invisible)

A system where the safety gates fail open and the audit trail fails silently provides security theater rather than security enforcement.
