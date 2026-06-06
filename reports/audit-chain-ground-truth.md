# Phase A — Ground Truth

**Evidence timestamp:** 2026-06-06T23:23:51.605Z  
**Method:** Live Supabase HTTPS client (`@supabase/supabase-js`, service role key)

---

## Commands Executed

```bash
node -e "require('dotenv').config({path:'.env'}); [see inline script]"
```

All 6 checks executed in a single Node.js invocation at the timestamp above.

---

## Check 1 — Does apex_agent_stages exist?

```
1_EXISTS: YES
1_ERROR: none
```
**PASS.**

---

## Check 2 — SELECT capability

```
2_SELECT: OK
2_ROWS_RETURNED: 3
2_ERROR: none
```
**PASS.** Query executed, rows returned.

---

## Check 3 — INSERT capability

```
3_INSERT: OK
3_ROW_ID: 0f4c119c-784e-4e41-bb36-74d046d9fa77
3_ERROR: none
task_id: phaseA-probe-1749255831605
```
**PASS.**

---

## Check 4 — SELECT inserted row

```
4_SELECT_INSERTED: OK
4_COUNT: 1
```
**PASS.** Inserted row retrieved by task_id.

---

## Check 5 — DELETE capability

```
5_DELETE: OK
5_REMAINING: 0
```
**PASS.** Row removed and confirmed gone.

---

## Check 6 — agent-reputation.js reads apex_agent_stages

```
6_READER_OK: YES
6_STAGES_FOUND: REVIEWER,VALIDATOR,TESTER,COMMITTER,ARCHITECT,DEVELOPER
TOTAL_ROWS: 46
```
**PASS.** Reader executed `_loadStageStats()`, returned data for 6 stages.

---

## Check 6b — Exact runtime error produced when table is absent

Captured from production pipeline run logs on disk (runs executed before fix):

**File:** `tasks/begeoj7zm.output` (run `run-mq2s6da9`)  
**File:** `tasks/bsy9npxep.output` (run `run-mq2q87rw`)

```
[Audit] stage log non-fatal: Could not find the table 'public.apex_agent_stages' in the schema cache
```

Source: `orchestrator.js:815` — `console.warn('[Audit] stage log non-fatal:', se.message)`

**Current status:** This error is NOT produced on current runs. Table is present.

---

## Summary

| Check | Result |
|-------|--------|
| 1. Table exists | **PASS** |
| 2. SELECT | **PASS** |
| 3. INSERT | **PASS** |
| 4. SELECT inserted | **PASS** |
| 5. DELETE | **PASS** |
| 6. Reader active | **PASS** (6 stages) |
| 6b. Error when absent | **Documented** from production logs |
| Total rows in table | 46 |

**GATE A: CLEARED.**
