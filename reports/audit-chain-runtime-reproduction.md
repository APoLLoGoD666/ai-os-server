# Phase 2 — Runtime Reproduction

**Date:** 2026-06-06  
**Source:** Production pipeline run `run-mq2q87rw`, commit `19cbb77`, 2026-06-06

---

## Exact Error (captured from production log)

```
[Audit] stage log non-fatal: Could not find the table 'public.apex_agent_stages' in the schema cache
```

**Source line:** `orchestrator.js:815` — `console.warn('[Audit] stage log non-fatal:', se.message)`  
**Supabase error type:** PostgREST `PGRST204` — table not found in schema cache  
**Trigger:** `_sb.from('apex_agent_stages').insert(stageRows)` at `orchestrator.js:814`

---

## Call Stack

```
runAgentTeam(spec, taskId)                       orchestrator.js:830
  → _auditLog(taskId, ...)                       orchestrator.js:770
    → _sb.from('apex_agent_stages').insert(...)  orchestrator.js:814
      → .then({ error: se }) → warn              orchestrator.js:815
```

---

## Affected Stage

`_auditLog()` fires once per pipeline run, after all agents complete.  
Stage rows for this run: 6 rows (ARCHITECT, DEVELOPER, REVIEWER, VALIDATOR, TESTER, COMMITTER).  
All 6 rows were dropped.

---

## Frequency

Every pipeline run. Error fires on every `runAgentTeam()` call. Confirmed in run `run-mq2q87rw` log. No evidence of prior successful writes (table did not exist).

---

## Impact on Execution

| Metric | Value |
|--------|-------|
| Pipeline success | **true** — unaffected |
| Commit created | **true** — `19cbb77` merged and pushed |
| Deployment triggered | **true** — Render deploy fired |
| Reflection executed | **true** — REFLECTOR ran post-commit |
| Memory updated | **true** — 37 entries indexed |
| Stage audit data written | **false** — 0 rows written to apex_agent_stages |

---

## Execution Success With Missing Table

- **Direct execution path:** Unaffected. All 8 agents run normally.
- **Adaptation engine:** Degrades silently. `getStageReputation()` returns `{ total: 0, successRate: null }` for all stages. `shouldPreEscalate()` always returns `false` (below minSamples). No crashes.
- **Dynamic agent selector:** Falls back to static tier assignment. No crash.

---

## Audit Data Loss

| Run | Stages | Rows expected | Rows written |
|-----|--------|---------------|--------------|
| run-mq2q87rw | 6 | 6 | 0 |
| All prior runs | N | N×6+ | 0 |

All stage telemetry since `agent-reputation.js` was introduced has been silently dropped. The adaptation engine has been operating blind on stage-level data.

---

## Verdict

Table is required. Error is a migration omission, not an intentional bypass. The non-fatal error handling is appropriate (pipeline must not block on telemetry), but the table must exist for the adaptation system to function correctly.
