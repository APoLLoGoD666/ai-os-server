# Phase A — Ground Truth

**Session timestamp:** 2026-06-06T23:06:05.856Z  
**Method:** Live Supabase queries via `@supabase/supabase-js` service role client

---

## Commands Executed

```
node -e "require('dotenv').config({path:'.env'}); ..."
```
Full inline script executed at session start. No cached results used.

---

## Check 1 — Does apex_agent_stages exist?

```
1_TABLE_EXISTS: YES | no error
```
**PASS.** Table present in PostgREST schema cache.

---

## Check 2 — Can it be queried?

```
2_QUERY_OK: YES | rows_returned: 5 | no error
```
**PASS.** SELECT returns rows with no error.

---

## Check 3 — Can a row be inserted?

```
3_INSERT_OK: YES | id: 747d13be-e86f-4c3e-a986-5ddbeec2d577 | no error
task_id: ground-truth-probe-1749254765945
stage: PROBE, success: true
```
**PASS.**

---

## Check 4 — Can the row be read back?

```
4_READ_BACK_OK: YES | count: 1 | no error
```
**PASS.** Inserted row retrieved by task_id.

---

## Check 5 — Can the row be deleted?

```
5_DELETE_OK: YES | remaining: 0 | no error
```
**PASS.** Row removed, confirmed gone.

---

## Check 6 — Does agent-reputation.js actively read this table?

```
6_REPUTATION_READER_OK: YES | stages_found: 6
stages: ["ARCHITECT","DEVELOPER","REVIEWER","VALIDATOR","TESTER","COMMITTER"]
```
**PASS.** `getAllStageStats()` executed, returned data for 6 pipeline stages.

---

## Table State

```
TOTAL_ROWS_IN_TABLE: 25
```

---

## Gate A Determination

| Check | Result |
|-------|--------|
| Table exists | **PASS** |
| Query works | **PASS** |
| Insert works | **PASS** |
| Read-back works | **PASS** |
| Delete works | **PASS** |
| Reputation reader active | **PASS** |

**GATE A: CLEARED. Proceeding to Phase B.**
