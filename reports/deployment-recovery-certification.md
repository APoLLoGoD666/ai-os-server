# Deployment Recovery Certification

Generated: 2026-06-06

## Was root cause found?

**YES.**

## What was it?

`agent-system/agent-pipeline-hooks.js` was required by `agent-system/orchestrator.js` (line 9)
but was never created. The file was referenced in commit `95aa3b8` ("feat: Phase 20-27 hardening",
2026-06-05T02:05Z) but not included. Every deploy since that commit crashed at module load time
with `Cannot find module './agent-pipeline-hooks'` and exited with code 1.

## What evidence proved it?

1. **Render API events**: `reason: {failure: {evicted: false, nonZeroExit: 1}}` on all 16 failures.
   Exit code 1 = application error. Exit code 137 = OOM. This ruled out the OOM hypothesis.

2. **Local reproduction**: `node server.js` produced:
   ```
   [FATAL] uncaughtException: Cannot find module './agent-pipeline-hooks'
   Require stack:
   - agent-system/orchestrator.js
   - server.js
   ```
   Deterministic, 100% reproducible.

3. **Timeline correlation**: First failure = commit `95aa3b8`, which added the `require()`.
   Last success = commit `8f94b22`, immediately before `95aa3b8`.

4. **File verification**: `ls agent-system/agent-pipeline-hooks.js` → file did not exist.

## What was changed?

Single new file: `agent-system/agent-pipeline-hooks.js` (7 lines)

```js
'use strict';
module.exports = {
    async onPipelineStart()    {},
    async onPipelineComplete() {},
    async onPipelineFailed()   {}
};
```

No changes to server.js, orchestrator.js, render.yaml, or any existing file.

Commit: `5c59844` — "fix: create missing agent-pipeline-hooks.js to unblock all deploys"

## Is production serving the newest commit?

**YES.**

- Render API: deploy `5c59844` status `live`, finishedAt `2026-06-05T23:11:39Z`
- Health endpoint: `version=383cc62` (version marker added after the last successful deploy `8f94b22`)
- Self-check endpoint: responding with 10-subsystem health report
- Voice-status endpoint: `ok=True`
- Deploy-probe: `v=8a352e0-probe` (route added after `8f94b22`, confirms newer code is live)

## Previous incorrect hypothesis

**OOM during zero-downtime deploy**: Assumed old instance (~280 MB RSS) + new instance startup
(~346 MB) exceeded 512 MB. Multiple render.yaml changes were made targeting this hypothesis
(zeroDowntimeDeploys, --max-old-space-size, healthCheckPath). None had any effect because:
1. render.yaml is not applied to this service (dashboard config overrides it)
2. The actual failure was exit code 1 (crash), not exit code 137 (OOM)

## What risks remain?

| Risk | Severity | Notes |
|---|---|---|
| memory ok=False in self-check | Low | Heap% threshold at startup; server is stable at 211 MB RSS |
| postgres ok=False in self-check | Medium | pg direct connection failing; Supabase works fine |
| obsidian ok=False in self-check | Low | Expected — OBSIDIAN_URL not configured |
| render.yaml not applied | Low | Dashboard config works; render.yaml changes are ineffective |
| agent-pipeline-hooks are no-ops | Medium | Slack/Notion pipeline notifications not wiring through |

## Deploy history

| Phase | Commits failing | Duration |
|---|---|---|
| First failure | `95aa3b8` | 2026-06-05T02:05Z |
| Last failure | `fe89f88` | 2026-06-05T22:46Z |
| Fix commit | `5c59844` | 2026-06-05T23:09Z |
| Deploy live | `5c59844` | 2026-06-05T23:11Z |
| Total downtime | 16 failed deploys | ~21 hours |
