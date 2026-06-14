# Failure Analysis Report
**Date:** 2026-06-06  
**Branch:** feature/agent-evolution

---

## Problem

Stage-level failures were logged to `apex_agent_stages` but never analyzed. There was no way to answer: which stage fails most? What are the common error patterns? What's the retry rate? Does model escalation help?

## Root Cause

`_auditLog()` in orchestrator.js was write-only — inserting stage rows on every run but providing no read path. No function aggregated the data, no report surfaced it.

## Stage Failure Tracking — What Was Always Being Written

`apex_agent_stages` schema (written since session 15):
```
task_id     text
stage       text     -- 'ARCHITECT', 'DEVELOPER', 'REVIEWER', 'VALIDATOR', 'TESTER', 'COMMITTER'
success     boolean
error       text
duration_ms integer
attempt     integer
created_at  timestamp
```

Stage success determination (from `_auditLog`):
- COMMITTER: `!!result.commitHash`
- DEVELOPER: `!!(result.applied?.length)`
- All others: `result.passed !== false && !result.error`

## Implemented Analysis Surface

`agent-reputation.js` now provides:

### `getFailurePatterns()`
Returns stages with failure rate > 20%, ordered worst-first:
```json
[
  { "stage": "DEVELOPER", "failureRate": 0.45, "total": 20, "failures": 9, "recentErrors": ["..."] },
  { "stage": "COMMITTER", "failureRate": 0.22, "total": 9, "failures": 2, "recentErrors": ["push up-to-date: ..."] }
]
```

### `getWeakestStage()`
Single-call identification of the bottleneck:
```json
{ "stage": "DEVELOPER", "failureRate": 0.45, "successRate": 0.55, "total": 20, "recentErrors": [...] }
```

### `getStageScores()`
0–10 score per stage (10 = perfect):
```json
{ "ARCHITECT": 9.5, "DEVELOPER": 5.5, "REVIEWER": 8.0, "COMMITTER": 7.8 }
```

### `getStageReputation(stage)`
Per-stage detail: successRate, failureRate, retryRate, avgLatencyMs, p95LatencyMs, medianMs, recentErrors.

---

## Historical Failure Patterns (from memory — session notes)

Known DEVELOPER failures in recent sessions:
1. **Routing returned empty filesModified** — DEVELOPER wrote no files (routing agent returned `[]`). Fixed by forcing `filesModified` to be non-empty subset of `filesToModify`.
2. **File too large (>20KB)** — orchestrator throws before write. Mitigation: `MAX_FILE_BYTES` check.
3. **Merge conflict on worktree branch** — COMMITTER fails on `git merge --no-ff`. Mitigation: rollback + retry.
4. **Push "Everything up-to-date"** — file changes not propagated to ROOT git index. Treated as failure since session 6.

Known COMMITTER failures:
1. **Push up-to-date** — worktree changes not in ROOT index (noted above)
2. **Pull rebase abort** — remote diverged during run. Mitigation: `git rebase --abort` added session 10.
3. **Render deploy timeout** — 10s timeout added session 15.

---

## NorthStar Proposals

Already implemented in orchestrator.js: if ≥3 failures cluster around the same keyword, a proposal is written to `System/NorthStar-Proposals.md` via `memory.append()`. This is the existing feedback loop for repeated patterns.

The new `getFailurePatterns()` function provides the aggregated view needed to act on NorthStar proposals systematically.

---

## Verification

`getFailurePatterns()` tested structurally (returns empty array when no stages exist — no crash).

## Risk

Low — read-only analysis. No writes to stages table.

## Rollback

Not needed — analysis functions are additive only.

---

## Cross-domain: Missing `GET /api/agent/failure-patterns` Route

A server.js route to expose `getFailurePatterns()` to the dashboard is needed but is out of scope.  
See `reports/cross-domain-dependencies.md` for the documented dependency.
