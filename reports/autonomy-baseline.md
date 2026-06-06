# Autonomy Baseline Audit — feature/autonomy-layer

**Date:** 2026-06-06
**Branch:** feature/autonomy-layer

## Orchestrator Pipeline (Current State)

The pipeline in `agent-system/orchestrator.js` (1071 LOC) runs 8 agents in a fixed sequence:

```
Input: spec {objective, filesToModify, filesToRead, steps, requiresResearch}
  │
  ├─ _classifyComplexity(spec) → 'simple'|'moderate'|'complex'|'critical'
  │   Rules: critical=auth/security, complex=4+ files or refactor, simple=1 file+config, moderate=default
  │
  ├─ ROUTING[complexity] → per-agent model assignments (HAIKU/SONNET/OPUS)
  │
  ├─ [0] RESEARCHER (optional) — Firecrawl → browser fallback → skip
  │   Trigger: requiresResearch=true OR objective matches /research|look.?up|find.?info|.../
  │
  ├─ [1] ARCHITECT — generates JSON plan (Zod-validated)
  │   Output: {summary, relevantFunctions, warnings, testCases, files}
  │   Timeout: 90s | Model: complexity-routed
  │
  ├─ Retry loop (max 3 attempts — Reflexion pattern):
  │   ├─ [2] DEVELOPER — writes files to git worktree
  │   │   Escalation: attempt 2 → SONNET, attempt 3 → OPUS
  │   ├─ [3a] REVIEWER — OWASP Top 10 check (parallel with VALIDATOR)
  │   ├─ [3b] VALIDATOR — spec compliance check (parallel with REVIEWER)
  │   └─ [4] TESTER — node --check syntax validation
  │
  ├─ [5] COMMITTER — git pull → commit → push → Render deploy
  │   Method: worktree branch → merge to main → push (oauth2 token)
  │
  ├─ Smoke tester — GET RENDER_HEALTH_URL 90s post-deploy (fire-and-forget)
  │
  ├─ REFLECTOR (async) — writes lesson to Obsidian/Lessons.md
  └─ AUDIT LOG (async) — apex_agent_runs + apex_agent_stages (Supabase)
```

## Current Autonomy Gaps

| Gap | Impact | Priority |
|---|---|---|
| No goal decomposition | User must hand-craft spec objects; no "improve X" support | HIGH |
| Static model routing | ROUTING table never adapts to historical performance | MEDIUM |
| No output post-verification | Files written but never re-verified after COMMITTER | MEDIUM |
| Single-task only | No parallel execution for independent subtasks | MEDIUM |
| No simulation mode | Can't preview plan cost/risk before executing | LOW |
| No retry recommendation | Pipeline fails silently; no structured retry advice | LOW |

## Autonomy Scores (Before This Session)

| Dimension | Score | Notes |
|---|---|---|
| Goal decomposition | 3/10 | Spec must be pre-formed |
| Model selection | 6/10 | Rule-based complexity routing only |
| Execution verification | 7/10 | REVIEWER+VALIDATOR+TESTER inline, no post-exec |
| Multi-agent coordination | 2/10 | Single sequential pipeline only |
| Simulation/planning | 0/10 | Not implemented |
| Failure recovery | 6/10 | 3 retries with model escalation |
| **Overall** | **4/10** | Foundation exists, autonomy layer missing |
