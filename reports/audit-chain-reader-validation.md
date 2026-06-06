# Phase D — Reputation Reader Validation

**Session:** 2026-06-06T23:23:51.605Z (third campaign invocation — prior runs discarded, evidence re-generated)  
**Evidence source:** `bunkjsqu6.output` — `agent-reputation.js` called after all 3 campaign runs completed

---

## Reader Execution Path

`agent-reputation.js` → `_loadStageStats()` → `sb.from('apex_agent_stages').select(...).order('created_at', {ascending:false}).limit(300)`

Cache invalidated before execution to force a live read.

---

## Query Output (raw)

```
STAGES: REVIEWER,COMMITTER,TESTER,VALIDATOR,ARCHITECT,DEVELOPER,RESEARCHER
REVIEWER: total=17 successRate=0.647 avgMs=8665
COMMITTER: total=8 successRate=1 avgMs=6690
TESTER: total=8 successRate=1 avgMs=592
VALIDATOR: total=17 successRate=0.647 avgMs=3537
ARCHITECT: total=9 successRate=1 avgMs=15621
DEVELOPER: total=17 successRate=1 avgMs=24936
RESEARCHER: total=1 successRate=1 avgMs=22455
WEAKEST: REVIEWER failRate=0.353
SCORES: {"REVIEWER":6.47,"COMMITTER":10,"TESTER":10,"VALIDATOR":6.47,"ARCHITECT":10,"DEVELOPER":10,"RESEARCHER":10}
```

---

## Stage Statistics

| Stage | Total | Success Rate | Avg Ms | Score |
|-------|-------|-------------|--------|-------|
| REVIEWER | 17 | 0.647 | 8665 | 6.47 |
| COMMITTER | 8 | 1.000 | 6690 | 10.00 |
| TESTER | 8 | 1.000 | 592 | 10.00 |
| VALIDATOR | 17 | 0.647 | 3537 | 6.47 |
| ARCHITECT | 9 | 1.000 | 15621 | 10.00 |
| DEVELOPER | 17 | 1.000 | 24936 | 10.00 |
| RESEARCHER | 1 | 1.000 | 22455 | 10.00 |

**Weakest stage:** REVIEWER (failRate=0.353)

---

## Cross-Validation Against Phase C Stage Rows

Phase C recorded 31 rows across 3 runs:
- Run 1 (13 rows): REVIEWER failed 2/3 attempts, VALIDATOR passed all
- Run 2 (6 rows): all stages passed
- Run 3 (12 rows): VALIDATOR failed 2/3, REVIEWER failed 1/3

Reader sees 77 total rows (cumulative across all runs since table creation). REVIEWER and VALIDATOR failure rates are consistent with retry patterns in Phase C stage rows.

---

## Gate D Determination

| Check | Result |
|-------|--------|
| Reader query executes without error | **PASS** |
| Returns data for all 7 pipeline stages | **PASS** |
| Derived statistics are non-zero | **PASS** |
| Weakest stage identified | **PASS** (REVIEWER, failRate=0.353) |
| Data consistent with Phase C stage rows | **PASS** |

**GATE D: CLEARED.**
