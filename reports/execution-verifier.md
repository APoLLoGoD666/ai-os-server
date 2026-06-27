# Execution Verifier — Implementation Report

File: agent-system/execution-verifier.js
Branch: feature/autonomy-layer

## Purpose

Pure-logic module (no API calls, no DB writes) for validating pipeline outputs, categorizing failures, and recommending retry strategies. Can be called standalone or as a post-execution hook.

## API

| Export | Signature | Description |
|---|---|---|
| `classifyFailure` | `(errorMessage) → FAILURE_TYPE` | Categorizes error message into 8 types |
| `recommendRetry` | `(errorMessage) → RetryStrategy` | Returns retry guidance for a given error |
| `verifyFilesExist` | `(applied[], root?) → FileCheck[]` | Checks existence, size, JS syntax for each file |
| `verifyOutput` | `(spec, devLog, root?) → VerifyResult` | Full spec coverage + syntax check |
| `detectFailures` | `(agentLogs[]) → Failure[]` | Scans all logs, returns classified failures |
| `summarizeExecution` | `(spec, agentLogs, result) → Summary` | Single-call full picture |
| `FAILURE_TYPES` | `const` | Enum: no_files_written, syntax_error, review_failed, etc. |

## Failure Taxonomy + Retry Strategies

| Type | Retry | Escalate | Delay | Reason |
|---|---|---|---|---|
| `no_files_written` | ✅ | ✅ | 0ms | Developer routing failure — escalate model |
| `syntax_error` | ✅ | ✅ | 0ms | Bad output — escalate to Sonnet/Opus |
| `review_failed` | ✅ | ❌ | 0ms | OWASP issue — retry with feedback injected |
| `validation_failed` | ✅ | ❌ | 0ms | Spec not met — retry with architect feedback |
| `budget_exceeded` | ❌ | ❌ | 0ms | Raise PIPELINE_BUDGET_USD or split task |
| `timeout` | ✅ | ❌ | 5s | LLM slow — retry after delay |
| `api_error` | ✅ | ❌ | 15s | Rate/infra error — circuit breaker will open |
| `unknown` | ❌ | ❌ | 0ms | Manual inspection required |

## verifyOutput Results Schema

```json
{
  "passed": false,
  "appliedCount": 0,
  "fileCheck": [{ "file": "server.js", "exists": true, "size": 4200, "syntaxOk": true }],
  "missedTargets": ["routes/health.js"],
  "syntaxFailed": [],
  "emptyFiles": []
}
```

## Design Decisions

- **No API calls** — pure function analysis only. Can run in test environments without Anthropic key.
- **node --check for JS syntax** — uses the same tool the pipeline's TESTER agent uses. Consistent standard.
- **verifyOutput is additive** — checks spec target coverage AND disk existence AND syntax. All three must pass.
- **`summarizeExecution` as single entry point** — callers don't need to know the internal structure; one call returns everything.

## Smoke Test Results (verified with node -e)

```
classifyFailure('DEVELOPER wrote no files') → 'no_files_written' ✅
classifyFailure('Pipeline budget exceeded') → 'budget_exceeded' ✅
classifyFailure('LLM timeout after 90000ms') → 'timeout' ✅
recommendRetry('parse error') → { retry: true, escalate: true } ✅
summarizeExecution() → correct failure + retryStrategy ✅
```
