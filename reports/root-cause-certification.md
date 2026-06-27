# Phase 6 — Root Cause Certification

Generated: 2026-06-06

## PRIMARY ROOT CAUSE

### Missing file: `agent-system/agent-pipeline-hooks.js`

**Evidence:**

Local server startup output (direct test, `node server.js`, exit code 1):
```
[FATAL] uncaughtException: Cannot find module './agent-pipeline-hooks'
Require stack:
- C:\Users\arwwo\Desktop\AI Scripts\Scripts\agent-system\orchestrator.js
- C:\Users\arwwo\Desktop\AI Scripts\Scripts\server.js
```

Code reference — `agent-system/orchestrator.js` line 9:
```js
const _hooks = require('./agent-pipeline-hooks');
```

File does not exist:
```
ls agent-system/agent-pipeline-hooks.js → no such file
```

Render deploy events: `reason: {failure: {nonZeroExit: 1}}` — every one of 16 consecutive failures.

First failing commit: `95aa3b8` ("feat: Phase 20-27 hardening") introduced
`require('./agent-pipeline-hooks')` in `orchestrator.js` but did not create the file.

**Confidence: 100%**

The local repro is deterministic. The Render exit code matches. The timeline
(every commit since `95aa3b8` fails) matches the introduction of the require.

## SECONDARY FACTORS

### render.yaml changes have no effect

render.yaml is not applied to this service (service was created via dashboard, not Blueprint).
Dashboard config (`npm install`, `node server.js`, no healthCheckPath) is what runs.

All previous fixes targeting render.yaml (zeroDowntimeDeploys, heap flags, healthCheckPath)
were attempts to solve a memory hypothesis that was incorrect.

**Confidence: 95%**

Evidence: Render API `envSpecificDetails` shows divergent dashboard config.
Alternative: Some Render configurations do sync render.yaml — but the dashboard values
are clearly different from render.yaml, confirming no sync.

### OOM hypothesis was incorrect

Previous hypothesis: zero-downtime deploys caused old+new instance to exceed 512 MB RAM.
Evidence against: `reason: {failure: {evicted: false, nonZeroExit: 1}}` across all failures.
Exit code 1 is an application exception. OOM would produce exit code 137 and `evicted: true`.

**Confidence: 99%**

## REJECTED HYPOTHESES

### Hypothesis: OOM / Memory exhaustion

Evidence against:
- Exit code 1 in all 16 failures (OOM = exit code 137)
- `evicted: false` in all failure reasons
- Live server RSS is 250 MB, well within 512 MB limit

**Confidence this is wrong: 99%**

### Hypothesis: Health check failing (503 from /health)

Evidence against:
- Render uses TCP port binding, not HTTP, for this service (`healthCheckPath: ""`)
- Even if HTTP, server crashes before port is bound — health check never runs

**Confidence this is wrong: 99%**

### Hypothesis: Build failure (npm install)

Evidence against:
- `buildStatus: "succeeded"` in every one of 16 failed deploys
- Build and deploy are separate events in Render's system

**Confidence this is wrong: 100%**

### Hypothesis: Wrong branch / wrong commit

Evidence against:
- Render API confirms `branch: "main"`, correct commit IDs in all deploys

**Confidence this is wrong: 100%**

## FIX SPECIFICATION

**Problem**: `agent-system/orchestrator.js` line 9 requires `./agent-pipeline-hooks` which does not exist.

**Minimum required interface** (from orchestrator.js call sites at lines 915, 921, 1039, 1055):
```js
module.exports = {
    onPipelineStart(params)         → Promise
    onPipelineComplete(params)      → Promise
    onPipelineFailed(err, params)   → Promise
}
```

All calls are wrapped in `setImmediate(() => _hooks.method(...).catch(() => {}))`,
meaning failures are silently swallowed. A stub returning `Promise.resolve()` is sufficient.

**Smallest fix**: Create `agent-system/agent-pipeline-hooks.js` with no-op async methods.
