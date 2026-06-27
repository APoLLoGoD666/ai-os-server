# Phase 4 — Audit Capture Integrity

**Audit timestamp:** 2026-06-07T14:12:00Z  
**Source files inspected:** `phase-c-run.js`, `agent-system/orchestrator.js:797–818`

---

## 1. Code Analysis

### orchestrator.js:797–818 — Stage Write Mechanism

```javascript
// Per-stage failure tracking → apex_agent_stages
if (agentLogs.length > 0) {
    const stageRows = agentLogs.map(l => {
        let stageSuccess;
        if (l.role === 'COMMITTER') stageSuccess = !!l.result?.commitHash;
        else if (l.role === 'DEVELOPER') stageSuccess = !!(l.result?.applied?.length);
        else stageSuccess = l.result?.passed !== false && !l.result?.error;
        return {
            task_id:     taskId,
            stage:       l.role || 'UNKNOWN',
            success:     !!stageSuccess,
            error:       l.result?.error ? String(l.result.error).slice(0, 500) : null,
            duration_ms: l.duration || null,
            attempt:     1,           // ← HARDCODED: does not reflect retry attempt number
            created_at:  new Date().toISOString(),
        };
    });
    _sb.from('apex_agent_stages').insert(stageRows).then(({ error: se }) => {
        if (se) console.warn('[Audit] stage log non-fatal:', se.message);
    }).catch(() => {});
}
```

**Classification: FIRE-AND-FORGET**

The `.insert()` call is not awaited. `runAgentTeam()` returns to its caller BEFORE the Supabase HTTP request completes. The `.catch(() => {})` suppresses all errors silently except the `console.warn` which is only triggered by the `.then()` error branch.

**Implications:**
- If the calling process exits immediately after `runAgentTeam` returns, the pending HTTP request may be cancelled.
- The `attempt: 1` hardcoding means retry information is lost.
- Error suppression means a network failure would be silent.

---

### phase-c-run.js — Timing Mechanism

```javascript
const endTs = new Date().toISOString();
// Wait for fire-and-forget stage inserts at orchestrator.js:814 to complete
await new Promise(r => setTimeout(r, 6000));
const rowsAfter = await getRowCount();
```

**Classification: DELAY-BASED PERSISTENCE GUARD**

The script waits 6000ms after `runAgentTeam` returns before querying the row count. This is intended to allow the fire-and-forget insert to complete before the process exits.

---

## 2. Race Conditions and Timing Assumptions

### Race Condition: Fixed-duration wait vs. network latency

The 6-second wait assumes the Supabase HTTPS request completes within 6 seconds of `runAgentTeam` returning. This is a timing assumption, not a guarantee.

**Evidence that the assumption held:**

| Run | Orchestrator END_TIME | DB created_at | Latency |
|-----|----------------------|---------------|---------|
| run-mq30xfgp | 00:09:25.746Z | 00:09:26.101Z | **0.355s** |
| run-mq30zh1n | 00:11:01.915Z | 00:11:02.149Z | **0.234s** |
| run-mq311y1h | 00:13:34.210Z | 00:13:34.865Z | **0.655s** |

All 3 inserts completed in under 0.7 seconds. The 6-second buffer provided 5.3–5.8 seconds of margin. The timing assumption held.

**Counter-evidence:** The initial run (run-mq30tsez) used `process.exit(0)` WITHOUT the wait. Its stage row count: 0. This directly demonstrates that `process.exit(0)` can kill pending async operations. The 6-second fix resolved this.

### Asynchronous Write Path

The write path is: `orchestrator.js` → `_sb.from(...)` → HTTP POST to Supabase PostgREST → Supabase PostgreSQL. The `_sb` client is the Supabase JS client which uses `fetch` internally. The fetch resolves when Supabase returns 201. The `.then()` handler runs after resolution.

If the process exits before the fetch response is received, the write may not complete. The 6-second wait prevents this.

### Were rows silently dropped?

The `[Audit] stage log non-fatal:` handler would print to console if Supabase returned an error. None of the 3 run output files contain this pattern (confirmed by Grep tool). Combined with the live DB showing exactly the expected rows, silent drops did not occur.

---

## 3. Is the Evidence Sufficient to Prove Persistence?

### Evidence supporting persistence:

1. **DB rows exist**: Live query at 14:12:11Z shows 9+6+6 rows for the 3 run IDs.
2. **Duration values match**: DB `duration_ms` values match the STAGE log lines in output files exactly — proves the rows came from these specific runs.
3. **Timestamps consistent**: DB `created_at` falls within 1.2 seconds of orchestrator completion for all 3 runs.
4. **No error messages**: Zero `stage log non-fatal` occurrences in any run output.
5. **run-mq30tsez comparison**: The run WITHOUT the wait has 0 rows. The 3 runs WITH the wait have rows. The difference in behavior confirms the mechanism.

### Evidence gaps:

1. **No explicit "insert confirmed" log line**: The orchestrator does not log insert success — only errors. Absence of error + presence of rows in DB is the proof.
2. **6-second wait is heuristic**: It worked in all 3 cases (sub-700ms actual latency) but is not formally bounded.
3. **Production server behavior**: In production (server.js long-running process), there is no process exit, so all inserts complete regardless. The timing concern applies only to the phase-c-run.js script invocation, not to production.

### Conclusion

**The evidence IS sufficient to prove persistence for the 3 campaign runs.** The combination of (a) DB rows present with matching duration values, (b) absence of error log output, and (c) consistent timestamps establishes that the rows were written by the specific runs and were not artificially injected. The fire-and-forget mechanism is a design choice that is acceptable in a long-running server process; the phase-c-run.js script compensated with the 6-second buffer.

**The evidence is NOT sufficient to prove persistence as a general guarantee for all future runs from scripts** — the 6-second wait is a heuristic that happened to be sufficient given the observed sub-700ms network latency. In production server context, this concern is moot.
