# Execution Recovery — Design and Verification

**Date:** 2026-06-06
**File:** `agent-system/execution-recovery.js`

---

## Problem

`execution-verifier.js` classifies failures and recommends retry strategies but:
1. Does not execute retries — the caller must implement the loop
2. `multi-agent-coordinator.js` has no retry logic — a failed pipeline run is recorded as failed
3. No structured tier escalation across the 4-tier model hierarchy
4. No fallback detection for repeating failure patterns

---

## Solution

`execution-recovery.js` wraps any async pipeline function with a retry chain that:
- Obeys per-failure-type retry limits
- Delays appropriately (API errors: 15s, timeouts: 5s)
- Escalates the model tier via `dynamic-agent-selector.selectFallbackConfig()` when a failure type recurs
- Provides a structured summary of what happened

---

## Retry Limits by Failure Type

| Failure Type | Max Retries | Escalate After Attempt |
|---|---|---|
| no_files_written | 2 | 0 (escalate immediately — model tier too low) |
| syntax_error | 2 | 0 (escalate immediately — model tier too low) |
| review_failed | 2 | 1 |
| validation_failed | 2 | 1 |
| budget_exceeded | 0 | — |
| timeout | 3 | 2 |
| api_error | 3 | 2 |
| unknown | 1 | 0 |

---

## Retry Chain API

```javascript
const { executeWithRecovery, buildRecoverySummary } = require('./agent-system/execution-recovery');

const outcome = await executeWithRecovery(
    spec,
    async (spec, config) => runAgentTeam({ ...spec, _selectedTier: config.tier }),
    agentConfig,   // { tier: 'moderate', models: {...}, ... }
    {
        onRetry:    (n, chain) => console.log(`[Recovery] retry ${n}: ${chain.reason}`),
        onEscalate: (n, cfg)  => console.log(`[Recovery] escalated to ${cfg.tier}`),
        maxAttempts: 4,
    }
);

const summary = buildRecoverySummary(outcome.attemptLog);
// → { recovered: true, totalAttempts: 2, failedAttempts: 1, escalations: 1, finalTier: 'complex', totalCost: 0.00234 }
```

---

## Escalation Paths

```javascript
const { buildEscalationPath } = require('./agent-system/execution-recovery');

buildEscalationPath('moderate');
// → [
//     { step: 1, tier: 'complex',  trigger: 'failure 2' },
//     { step: 2, tier: 'critical', trigger: 'failure 3' },
//   ]
```

---

## Fallback Detection

```javascript
const { assignFallback } = require('./agent-system/execution-recovery');

const assignment = assignFallback(spec, agentConfig, [
    { failureType: 'syntax_error' },
    { failureType: 'syntax_error' },
    { failureType: 'syntax_error' },
]);
// → { config: escalatedConfig, isFallback: true, reason: '3 repeated syntax_error failures — fallback assigned' }
```

Triggers after 3 entries in the failure history, or 2 entries of the same type.

---

## Attempt Log Format

Each attempt in `outcome.attemptLog`:
```json
{
  "attempt": 1,
  "success": false,
  "error": "DEVELOPER routing returned empty",
  "tier": "moderate",
  "cost": "0.00041",
  "commitHash": null
}
```

---

## Dependencies

- `execution-verifier.js` — `recommendRetry`, `FAILURE_TYPES`
- `dynamic-agent-selector.js` — `selectFallbackConfig`

No circular dependencies. No DB writes.

---

## Verification

```
node --check agent-system/execution-recovery.js → PASS
```
