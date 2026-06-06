# Evaluation System Report
**Date:** 2026-06-06  
**Branch:** feature/agent-evolution

---

## Problem

The pipeline had a single evaluation pass (VALIDATOR) that checked spec test cases, and REVIEWER for security, but no loop that could detect drift over time. A pipeline run either succeeded or failed — there was no quality gradient.

## Root Cause

Evaluation was binary (pass/fail) by design, which is correct for a deployment gate. What was missing was a continuous quality signal: did we use the right model? Did the plan match the output? Was the reflexion lesson useful?

## Implemented Improvements

### 1. ARCHITECT Confidence Score

ARCHITECT now outputs `confidence` (0.0–1.0) in its JSON response:
```
Output JSON: { "summary": string, "relevantFunctions": string[], "warnings": string[], "testCases": string[], "confidence": number }
```

The `ArchitectSchema` captures it with `z.number().min(0).max(1).optional().default(0.7)`.

**Purpose:** Surfaces plan certainty. Low confidence (<0.5) is a signal that the task spec was ambiguous or the objective was outside the system's trained patterns. Currently logged via agentLogs; future routing can use it.

**Self-scoring mechanism:** The agent is asked to evaluate its own plan quality. This is a lightweight form of self-assessment without a separate evaluation API call.

### 2. Stage Scoring via `agent-reputation.js`

`getStageScores()` provides a 0–10 score per stage based on historical success rates:
```
score = successRate × 10 − latency_penalty
```

This is a continuous quality score, not binary. Enables trending: if DEVELOPER drops from 8.5 to 6.0 over 30 runs, investigation is warranted.

### 3. Reflexion Quality (Existing — REFLECTOR agent)

REFLECTOR already runs post-pipeline and extracts one lesson. This is the Reflexion pattern from the literature. The lesson is appended to `System/Lessons.md` and read back via `obsidianContext` on the next run — closing the feedback loop.

Lessons are used by ARCHITECT (via `obsidianContext` in the user prompt) to avoid repeating past mistakes.

### 4. NorthStar Proposals (Existing — orchestrator.js)

When the same keyword appears in ≥3 failure lessons, a proposal is written to `System/NorthStar-Proposals.md`. This is a macro-level evaluation signal prompting architectural constraint changes.

---

## Evaluation Loop Maturity Assessment

| Loop | Status | Quality |
|------|--------|---------|
| VALIDATOR spec check (per-run) | Implemented | Binary |
| REVIEWER security check (per-run) | Implemented | Binary |
| REFLECTOR lesson extraction (async, per-run) | Implemented | Qualitative |
| NorthStar proposals (cumulative) | Implemented | Pattern-level |
| ARCHITECT confidence score (per-run) | **NEW** | Gradient |
| Stage scoring (cumulative) | **NEW** | Gradient |
| Model routing feedback (history-based) | **NEW** | Systemic |

---

## Not Implemented (Future)

**Confidence-gated DEVELOPER escalation:** Use `architectLog.result.confidence < 0.5` to trigger SONNET assignment regardless of complexity tier. Deferred — need to validate confidence signal accuracy first.

**VALIDATOR scoring:** VALIDATOR currently returns pass/fail. Could return a 0–10 score on how well the code covers the test cases. Would require more tokens but produce a quality gradient.

**Cross-run regression detection:** Compare stage scores week-over-week. If DEVELOPER score drops >2 points, flag in Slack. Requires a scheduled job — cross-domain dependency (see cross-domain-dependencies.md).

---

## Verification

```
node --check agent-system/orchestrator.js  → OK
```

ArchitectSchema with confidence field validated via zod.

## Risk

Low. Confidence field defaults to 0.7 when ARCHITECT doesn't output it (Zod default). No routing decision currently depends on it — purely additive information.

## Rollback

Remove `confidence` from ArchitectSchema and ARCHITECT system prompt. No functional impact.
