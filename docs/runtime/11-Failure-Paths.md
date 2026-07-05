# 11 — Failure Paths

**Date:** 2026-07-02  
**Evidence Source:** lib/runtime/constitutional-gate.js, lib/models/runtime/index.js, lib/memory/gateway.js, lib/governance.js, lib/agent-task-cycle.js, lib/constitution/crisis-manager.js, lib/health/monitor.js, lib/event-consumer.js, agent-system/execution-verifier.js

---

## Failure Philosophy

APEX uses **fail-open** and **fire-and-forget** patterns extensively in the constitutional and memory layers. The system prioritizes availability over correctness in most paths. Only the LLM execution layer has structured retry and circuit breaking.

---

## Constitutional Gate — FAIL-OPEN

**File:** `lib/runtime/constitutional-gate.js`

| Failure Scenario | Result |
|-----------------|--------|
| `evaluate()` throws any exception | Returns `ALLOW` — request proceeds |
| Gate evaluation takes > 400ms | Returns `RESTRICT` (not DENY) |
| DENY verdict issued | 403 response immediately |
| RESTRICT verdict | `req._restricted = true`, request continues |

**Risk:** A bug in constitutional-gate.js evaluation logic causes the gate to silently pass all requests. No alerting occurs on gate errors.

---

## kernelChain Gates — FAIL-OPEN

**File:** `lib/kernel.js` + `lib/agent-file-utils.js`

| Gate | On Error | On Blocked |
|------|----------|-----------|
| `resolveIdentity` | next() called (anonymous identity) | N/A |
| `resolveOwnership` | next() called | N/A |
| `checkAuthority` | next() called (FAIL-OPEN) | next() called (FAIL-OPEN) |
| `checkGovernance` | next() called | **Always** next() called |

`checkGovernance` effectively does nothing from a blocking perspective — it always calls next(). Governance enforcement happens through other paths (governance.js writes).

---

## LLM Execution — Circuit Breaker + Retry

**File:** `lib/models/runtime/index.js`

### Retry Path

```
execute() attempt 1
  ├── Success → return result
  └── 429 Rate Limit → wait 15s → attempt 2
       ├── Success → return result
       └── 429 → wait 30s → attempt 3
            ├── Success → return result
            └── 429 → THROW (no more retries)

  Any non-429 error → THROW immediately (record to circuit breaker)
```

### Circuit Breaker Path

```
5 consecutive non-429 failures on same model → breaker OPENS

While breaker is OPEN:
  execute() for that model → immediate THROW (no API call attempted)
  
Cooldown:
  60s × 2^(failures - 5), capped at 15 minutes
  After cooldown: breaker enters HALF-OPEN (next call is probe)
  
Probe success → breaker CLOSES, reset failure count
Probe failure → breaker stays OPEN, cooldown doubles
```

**No fallback model.** If Opus 4.7 circuit breaker opens, chat requests fail with the circuit breaker error. There is no automatic downgrade to Sonnet.

**Google fallback:** If `containment.getProviderOverride() === 'google'`, requests route to `gemini-2.5-flash`. This is the only cross-provider fallback path.

---

## Memory Gateway — FAIL-SOFT

**File:** `lib/memory/gateway.js`

All `storeMemory()` writes:
- Wrapped in try/catch
- On error: logger.error() + health monitor update
- **No throw to caller**

All `getContext()` reads:
- Per-layer failures caught individually
- Failed layer returns empty/null for that layer
- Other layers continue
- Combined context returned with available data

**Risk:** A memory write failure is invisible to the caller. The response appears successful even if memory storage failed entirely.

---

## Governance Writes — FIRE-AND-FORGET

**File:** `lib/governance.js`

All 40+ domain write functions use `_w(fn)`:

```javascript
function _w(fn) {
  fn().catch(err => logger.error('governance write failed', err))
}
```

- No return value checked
- No retry
- Failure logged to console only
- **No Slack alert on governance write failure**

Evidence chain gaps are silent — if a governance write fails, the blockchain-style evidence chain has a gap with no notification.

---

## civilization-kernel.js Post-Response Hook — FIRE-AND-FORGET

**File:** `middleware/civilization-kernel.js`

Post-response `setImmediate` callback:
- episodic memory write failure → logged, not thrown
- decision memory write failure → logged, not thrown
- Audit file append failure → caught, not thrown
- **No Slack alert on audit write failure**

These failures mean:
- The episodic record for the request is missing
- The audit log has a gap
- The caller sees a 200 response regardless

---

## Agent Task Failure Paths

**File:** `lib/agent-task-cycle.js`

### Planning Phase Failures

| Failure | Outcome |
|---------|---------|
| LLM call 1 (buildAgentPlan) throws | Task status → `failed`, notify |
| LLM call 2 (getApprovedAgentActions) returns null | Use `buildSafeDefaultDiscoverySteps()` fallback |
| JSON parse fails | Use discovery step fallback |
| `parsed.needs_clarification === true` | Task status → `failed` |
| `validateAgentSteps` fatal error (unknown step type) | Task status → `failed` |

### Execution Phase Failures

| Failure | Outcome |
|---------|---------|
| `normalizeExecutableAgentStep` invalid | Skip step, increment current_step |
| Duplicate pending task found | Status → `waiting_approval`, return |
| `executeApprovedAgentActions` throws | Status → `failed`, log, notify |
| Step limit (10) reached in autoRunReadOnlyTaskSteps | Status → `waiting_approval` (paused, not failed) |

### Schedule Run Failures

- Per-schedule errors are caught and logged as `{ok: false}` in results
- Non-fatal: other schedules continue
- Failed schedule does NOT update `last_run` — will retry on next `runDueSchedules()` call if `last_run + frequency` still past

---

## Execution Verifier — Failure Classification

**File:** `agent-system/execution-verifier.js`

### When verifyOutput() Fails

```
passed = false if:
  - appliedCount === 0 (no files written)
  - missedTargets > 0 (spec targets not in applied)
  - syntaxFailed > 0 (node --check returned error)
  - emptyFiles > 0 (file exists but < 10 bytes)
```

### Retry vs No-Retry

```
Retryable:
  no_files_written, syntax_error, review_failed,
  validation_failed, timeout, api_error

NOT retryable (immediate abort):
  budget_exceeded, unknown
```

When retry is recommended, the caller (master-orchestrator.js) must implement the retry logic. The verifier only recommends.

---

## Constitution Crisis Manager — Escalation Path

**File:** `lib/constitution/crisis-manager.js`

### State Machine Transitions

```
NOMINAL → WARNING (threshold exceeded)
WARNING → CRISIS (sustained or worsening)
CRISIS → EMERGENCY (critical violation detected)
EMERGENCY → RECOVERY (manual intervention or auto-resolve)
```

### At EMERGENCY

`_activateSafeDefaults()` is called:
- Restricts all non-essential operations
- The 4 non-suspendable invariants (P01, P05, P07, P08) remain active regardless

No automatic Slack alert from crisis-manager confirmed (UNKNOWN if it uses alertCritical).

---

## Health Monitor — Degradation Tracking

**File:** `lib/health/monitor.js`

### What Degradation Means

Health monitor tracks degradation but **does NOT take any action** on degradation. It is a passive observer. The `/health` endpoint reads from it, and telemetry uses it, but no automatic circuit breaking or alerting is triggered by `getHealthState()` returning `'degraded'`.

**Exception:** `recordProviderCall()` logs to console on status transitions:
- "Provider recovered" when returning to healthy
- "Provider degraded" / "Provider unavailable" on threshold cross

---

## Slack Alert Failure Path

**File:** `services/slack/slack-alerts.js`

All Slack alert functions depend on `./slack-client` postToChannel/postDeduped. If Slack is down or SLACK_BOT_TOKEN is missing:
- `postToChannel` / `postDeduped` fail
- Error is NOT caught by the slack-alerts wrapper functions (each alert function calls client functions directly)
- **UNKNOWN:** Whether slack-client has internal error handling

**Risk:** If Slack is down, critical alerts (including DB-down notifications from /health) fail silently. No fallback alerting mechanism.

---

## event-consumer.js — Silent Swallow

**File:** `lib/event-consumer.js`

In `_handle(ev)`:
```javascript
try {
  await slack-agents.notifyRunFailed(...)
} catch(err) {
  // silently swallowed — no log, no re-throw
}
// Always marks event as processed (consumer_offsets insert)
```

A Slack send failure causes the event to be marked processed anyway. The pipeline failure notification is permanently lost. No retry.

---

## Failure Mode Summary

| Component | Failure Behavior | Alert Generated? |
|-----------|-----------------|-----------------|
| Constitutional gate error | FAIL-OPEN (allow) | No |
| Governance write error | Fire-and-forget | No |
| Memory gateway write error | Fail-soft (logged) | No |
| Audit log write error | Catch and continue | No |
| LLM 429 error | Retry 3× with backoff | No |
| LLM circuit breaker open | Immediate throw | No |
| DB down in /health | 503 + Slack alertCritical | **Yes** |
| Agent task failure | Status→failed + notification | Via apex_notifications |
| Slack send failure | Silent swallow | No (recursive failure) |
| Memory layer reflexion bug | null ID stored (silent) | No |
