# Dynamic Routing Report
**Date:** 2026-06-06  
**Branch:** feature/agent-evolution

---

## Problem

Agent model routing was fully static: a hardcoded `ROUTING` table mapped complexity tier to model. No historical signal was used. A feature classified as `moderate` always assigned DEVELOPER=SONNET even if HAIKU had been performing well for similar tasks, or conversely, if HAIKU had been failing repeatedly.

## Root Cause

The `_classifyComplexity()` function is purely rule-based (regex on objective + file count + step count). It was designed to be fast and free (no API call), which is correct. But it had no feedback loop. The retry escalation (HAIKU→SONNET→OPUS) happened reactively, after a failure, burning extra tokens on an attempt that could be predicted to fail.

## Implemented

**1. Reputation Pre-escalation (`orchestrator.js`)**

```js
// After _agentModels is set from static ROUTING table:
try {
    if (await _reputation.shouldPreEscalate('DEVELOPER', 0.6, 15)) {
        if (_agentModels.developer === M.HAIKU) {
            _agentModels.developer = M.SONNET;
            console.log('[Orchestrator] reputation pre-escalation: DEVELOPER → SONNET');
        }
    }
} catch {}
```

Trigger conditions (conservative by design):
- ≥15 DEVELOPER stage records in `apex_agent_stages`
- Failure rate > 60%
- Current assignment is HAIKU (no downgrade of already-escalated tiers)
- Wrapped in try/catch: any DB error → fallback to static routing

**2. Escalation Tracking**

Every retry escalation is now recorded in `_escalations[]`:
```js
_escalations.push({ attempt, from: M.HAIKU, to: M.SONNET, reason: 'retry' });
```

Returned in the pipeline result:
```js
{ ..., attempts: _successAttempt, escalations: _escalations }
```

This surfaces retry behaviour to callers (server.js metrics endpoints, Slack hooks).

**3. Confidence Score from ARCHITECT**

ARCHITECT now outputs a `confidence` field (0.0–1.0):
```json
{ "summary": "...", "testCases": [...], "confidence": 0.85 }
```

Captured in `ArchitectSchema` (added `confidence: z.number().min(0).max(1).optional().default(0.7)`).

The confidence field is available in `architectLog.result.confidence` for future use. Current usage: logged implicitly through agentLogs. A future enhancement can use low confidence (< 0.5) to trigger SONNET for DEVELOPER regardless of complexity tier.

---

## Routing Table (unchanged, static baseline)

| Tier | Architect | Developer | Reviewer | Validator |
|------|-----------|-----------|----------|-----------|
| simple | HAIKU | HAIKU | HAIKU | HAIKU |
| moderate | HAIKU | SONNET | HAIKU | HAIKU |
| complex | SONNET | SONNET | SONNET | HAIKU |
| critical | SONNET | SONNET | OPUS | SONNET |

The static table remains the primary router. Reputation pre-escalation is an additive layer on top.

---

## Not Implemented (Future Iterations)

**Latency-aware routing:** `agent-reputation.js` computes `avgLatencyMs` and `p95LatencyMs` per stage. A future routing decision: if SONNET p95 latency > 120s for this complexity, consider HAIKU to avoid budget timeout. Currently tracked but not used in routing.

**Cost-aware routing:** Per-agent cost attribution exists via `_agentTokens`. Aggregated cost-per-stage could inform downgrade decisions. Not implemented — downgrading models is riskier than upgrading.

**Confidence-gated escalation:** If ARCHITECT confidence < 0.5, pre-assign DEVELOPER to SONNET. Requires accumulating confidence samples to validate usefulness. Deferred.

---

## Verification

```
node --check agent-system/orchestrator.js  → OK
```

Pre-escalation path is defensive: no samples → no change. Zero impact on fresh deploys.

## Risk

Low-Medium. Pre-escalation adds one async Supabase query before the pipeline loop. Protected by try/catch and guarded behind minSamples=15. Cost impact: SONNET vs HAIKU for DEVELOPER is ~5× more expensive but saves a failed retry.

## Rollback

Remove the pre-escalation block from `orchestrator.js`. Static routing table unchanged — no rollback needed for that.
