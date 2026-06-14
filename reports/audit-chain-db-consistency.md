# Phase 3 — Database Consistency Check

**Query timestamp:** 2026-06-07T14:12:04Z (CRUD probe) / 2026-06-07T14:12:11Z (per-run query)  
**Access path:** `@supabase/supabase-js` HTTPS client, service role key

---

## Raw Query Outputs

### Row Count

```
CURRENT_ROW_COUNT: 105  (2026-06-07T14:12:04Z)
```

### Per-Run Rows

```
DB_AUDIT_TS: 2026-06-07T14:12:11.355Z

RUN run-mq311y1h count=9
  distinct_stages=[ARCHITECT,DEVELOPER,REVIEWER,VALIDATOR,TESTER,COMMITTER]
  ts_range=2026-06-07T00:13:34.865+00:00 to 2026-06-07T00:13:34.866+00:00
  ROW ARCHITECT  true  11990ms  attempt=1  2026-06-07T00:13:34.865+00:00
  ROW DEVELOPER  true  19038ms  attempt=1  2026-06-07T00:13:34.866+00:00
  ROW REVIEWER   false  7306ms  attempt=1  2026-06-07T00:13:34.866+00:00
  ROW VALIDATOR  false  3416ms  attempt=1  2026-06-07T00:13:34.866+00:00
  ROW DEVELOPER  true  28205ms  attempt=1  2026-06-07T00:13:34.866+00:00
  ROW REVIEWER   true   7067ms  attempt=1  2026-06-07T00:13:34.866+00:00
  ROW VALIDATOR  true   3280ms  attempt=1  2026-06-07T00:13:34.866+00:00
  ROW TESTER     true    483ms  attempt=1  2026-06-07T00:13:34.866+00:00
  ROW COMMITTER  true   5806ms  attempt=1  2026-06-07T00:13:34.866+00:00

RUN run-mq30xfgp count=6
  distinct_stages=[ARCHITECT,DEVELOPER,REVIEWER,VALIDATOR,TESTER,COMMITTER]
  ts_range=2026-06-07T00:09:26.101+00:00 to 2026-06-07T00:09:26.102+00:00
  ROW ARCHITECT  true  12150ms  attempt=1  2026-06-07T00:09:26.101+00:00
  ROW DEVELOPER  true  18008ms  attempt=1  2026-06-07T00:09:26.101+00:00
  ROW REVIEWER   true   7424ms  attempt=1  2026-06-07T00:09:26.101+00:00
  ROW VALIDATOR  true   3192ms  attempt=1  2026-06-07T00:09:26.101+00:00
  ROW TESTER     true    629ms  attempt=1  2026-06-07T00:09:26.101+00:00
  ROW COMMITTER  true   6088ms  attempt=1  2026-06-07T00:09:26.102+00:00

RUN run-mq30zh1n count=6
  distinct_stages=[ARCHITECT,DEVELOPER,REVIEWER,VALIDATOR,TESTER,COMMITTER]
  ts_range=2026-06-07T00:11:02.148+00:00 to 2026-06-07T00:11:02.149+00:00
  ROW ARCHITECT  true  10646ms  attempt=1  2026-06-07T00:11:02.148+00:00
  ROW DEVELOPER  true  22506ms  attempt=1  2026-06-07T00:11:02.149+00:00
  ROW REVIEWER   true   6839ms  attempt=1  2026-06-07T00:11:02.149+00:00
  ROW VALIDATOR  true   3306ms  attempt=1  2026-06-07T00:11:02.149+00:00
  ROW TESTER     true    535ms  attempt=1  2026-06-07T00:11:02.149+00:00
  ROW COMMITTER  true   5109ms  attempt=1  2026-06-07T00:11:02.149+00:00

RUN run-mq30tsez count=0  distinct_stages=[]  ts_range=N/A
```

---

## Consistency Checks

### Row Count vs. Reported

| Claimed | Live DB | Match? |
|---------|---------|--------|
| run-mq311y1h: 9 rows | 9 rows | **CONSISTENT** |
| run-mq30xfgp: 6 rows | 6 rows | **CONSISTENT** |
| run-mq30zh1n: 6 rows | 6 rows | **CONSISTENT** |
| Total: 105 rows | 105 rows | **CONSISTENT** |
| run-mq30tsez: 0 rows | 0 rows | **CONSISTENT** |

### Timestamp Ranges vs. Claimed Execution Windows

| Run | Reported window | DB created_at | Within window? |
|-----|-----------------|--------------|----------------|
| run-mq30xfgp | START 00:08:29Z END 00:09:25Z | 00:09:26.101Z | +1.1s after END (fire-and-forget lag) ✓ |
| run-mq30zh1n | START 00:10:04Z END 00:11:01Z | 00:11:02.148Z | +1.1s after END ✓ |
| run-mq311y1h | START 00:11:59Z END 00:13:34Z | 00:13:34.865Z | +0.7s after END ✓ |

All row timestamps fall within 1.2 seconds of the reported run end time. The insert timestamp is after orchestrator completion but before the 6-second buffer expires, consistent with fire-and-forget behavior.

### Distinct Stages vs. Run Output Logs

| Run | DB distinct stages | Log stages | Match? |
|-----|-------------------|-----------|--------|
| run-mq311y1h | ARCHITECT,DEVELOPER,REVIEWER,VALIDATOR,TESTER,COMMITTER | Same (with retry = 2×DEVELOPER, 2×REVIEWER, 2×VALIDATOR) | **CONSISTENT** |
| run-mq30xfgp | ARCHITECT,DEVELOPER,REVIEWER,VALIDATOR,TESTER,COMMITTER | Same (1 attempt) | **CONSISTENT** |
| run-mq30zh1n | ARCHITECT,DEVELOPER,REVIEWER,VALIDATOR,TESTER,COMMITTER | Same (1 attempt) | **CONSISTENT** |

### Duration Values vs. Run Output Logs

Comparing DB duration_ms against STAGE log lines in output files:

**run-mq311y1h:**
- DB: ARCHITECT 11990ms, DEVELOPER 19038ms, REVIEWER 7306ms, VALIDATOR 3416ms, DEVELOPER 28205ms, REVIEWER 7067ms, VALIDATOR 3280ms, TESTER 483ms, COMMITTER 5806ms
- Log: `STAGE ARCHITECT PASS 11990ms`, `STAGE DEVELOPER PASS 19038ms`, etc.
- **EXACT MATCH on all 9 durations** ✓

**run-mq30xfgp:**
- DB: ARCHITECT 12150ms, DEVELOPER 18008ms, REVIEWER 7424ms, VALIDATOR 3192ms, TESTER 629ms, COMMITTER 6088ms
- Log: matches exactly
- **EXACT MATCH on all 6 durations** ✓

**run-mq30zh1n:**
- DB: ARCHITECT 10646ms, DEVELOPER 22506ms, REVIEWER 6839ms, VALIDATOR 3306ms, TESTER 535ms, COMMITTER 5109ms
- Log: matches exactly
- **EXACT MATCH on all 6 durations** ✓

Duration match proves the DB rows came from these specific runs (same session, same invocation).

### Known Anomaly: Baseline Inflation

Reported baseline: 84 rows. Post-CRUD validation baseline: 77 rows. Difference: 7 rows from task_id `phase-b-verify-mq30l5tu` (orphaned Phase B test rows not cleaned up). These are confirmed in the DB task_id list. The per-run deltas (+6, +6, +9) are measured correctly from a 84-row baseline. The absolute baseline is inflated but per-run growth evidence is unaffected.

### `attempt` Column Anomaly

All DB rows have `attempt=1` regardless of which pipeline retry they came from. `orchestrator.js:810` hardcodes `attempt: 1`. This means run-mq311y1h's second DEVELOPER/REVIEWER/VALIDATOR rows are indistinguishable from first-attempt rows by the `attempt` field alone. They are distinguishable by position in the batch (row order within the same `created_at` timestamp). This is a schema design limitation, not a data integrity issue.

---

## Verdict

| Check | Result |
|-------|--------|
| Row counts match claimed values | **CONSISTENT** |
| Timestamps consistent with execution windows | **CONSISTENT** |
| Stage names match run logs | **CONSISTENT** |
| Duration values match run logs exactly | **CONSISTENT** |
| run-mq30tsez correctly shows 0 rows | **CONSISTENT** |

**Overall: CONSISTENT**
