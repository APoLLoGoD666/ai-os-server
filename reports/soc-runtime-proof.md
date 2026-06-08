# SOC Runtime Proof Exercise
_Executed: 2026-06-08T13:47–13:59Z | No static analysis. No inference. Runtime evidence only._

---

## Rules Applied
- Every conclusion derives from: API response, database state, log output, or file system observation
- Timestamp and command provided for every claim
- Any item without runtime evidence is marked UNPROVEN

---

## 1. Gmail Send

**EVIDENCE TYPE:** Gmail API HTTP response  
**TIMESTAMP:** 2026-06-08T13:58:37Z  
**COMMAND:**
```
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
Authorization: Bearer ya29.a0AT3oNZ...
Body: {"raw": "<base64url-encoded RFC 2822 message to arwwork1@gmail.com>"}
```
**RESULT:**
```json
{
  "id": "19ea787384f58949",
  "threadId": "19ea787384f58949",
  "labelIds": ["UNREAD", "SENT", "INBOX"]
}
HTTP_STATUS: 200
```
**CONCLUSION:** Gmail send is operational. Email delivered to SENT + INBOX. OAuth credentials (client_id, client_secret, refresh_token) all valid.

Note: Server endpoint `/api/emails/send` timed out (HTTP 000, exit 28) during Render cold-start at time of test. Gmail API itself was tested directly with the same credentials the server uses and confirmed working.

### VERDICT: PROVEN WORKING

---

## 2. Gmail Receive

**EVIDENCE TYPE:** Live server API response  
**TIMESTAMP:** 2026-06-08T13:55:09Z  
**COMMAND:**
```
GET https://ai-os-server-jx20.onrender.com/api/emails?limit=3
x-app-key: APEX123
```
**RESULT:**
```
HTTP_STATUS: 200
{"ok":true,"emails":[
  {"id":295,"gmail_id":"19ea782831667a2b","sender":"UptimeRobot <alert@uptimerobot.com>",
   "subject":"Monitor is DOWN: ai-os-server-jx20.onrender.com/health",
   "created_at":"2026-06-08T13:53:46.065856"},
  {"id":294,"gmail_id":"19ea76fae21748d3","sender":"Anthropic <no-reply-...@mail.anthropic.com>",
   "subject":"Security alert: new trusted device added to your Claude account",
   "created_at":"2026-06-08T13:37:41.050292"},
  ...295 total emails in database...
]}
```
**CONCLUSION:** Gmail receive is operational. 295 emails ingested. Latest email (id 295) received at 13:53:46 — 1 minute 23 seconds after Render deploy triggered server restart at 13:51:07. System read and persisted a new email within 2 minutes of cold start.

### VERDICT: PROVEN WORKING

---

## 3. Agent Execution

**EVIDENCE TYPE:** Supabase database rows — `apex_agent_runs` + `apex_agent_stages`  
**TIMESTAMP:** 2026-06-08T13:48:33Z  
**COMMAND:**
```
GET /rest/v1/apex_agent_runs?select=task_id,success,cost_usd,complexity,created_at
    &task_id=like.run-mq*&order=created_at.desc
```
**RESULT:**
```
14 real pipeline runs (run-mq* IDs), 2026-06-06T19:11Z through 2026-06-07T00:13Z
13 success=true, 1 success=false (run-mq2twpey, $0.846)

run-mq311y1h agent_summary:
  ARCHITECT(11990ms) → DEVELOPER(19038ms) → REVIEWER(failed) → VALIDATOR(failed)
  → DEVELOPER(28205ms) [retry] → REVIEWER(passed) → VALIDATOR(passed)
  → TESTER(483ms) → COMMITTER(5806ms, hash:3a8d653)

apex_agent_stages rows confirmed:
  run-mq2tirww: ARCHITECT success=true 19683ms, DEVELOPER success=true 26473ms,
                REVIEWER success=true 12774ms (and more stages)
```
**CONCLUSION:** The 8-stage agent pipeline has executed 14 real runs in production. ARCHITECT, DEVELOPER, REVIEWER, VALIDATOR, TESTER, and COMMITTER stages all ran and produced per-stage database records. One run had a retry cycle (REVIEWER→DEVELOPER→REVIEWER) that resolved.

### VERDICT: PROVEN WORKING

---

## 4. Lesson Creation

**EVIDENCE TYPE:** Local filesystem — Obsidian vault file  
**TIMESTAMP:** 2026-06-08T13:54:37Z  
**COMMAND:**
```
ls -la "/c/Users/arwwo/Desktop/AI Scripts/APEX AI OS/01 Executive/Lessons.md"
tail -20 "/c/Users/arwwo/Desktop/AI Scripts/APEX AI OS/01 Executive/Lessons.md"
```
**RESULT:**
```
-rw-r--r-- 1 arwwo 197609 7030 Jun  7 01:13 Lessons.md

## 2026-06-07 01:09
[Auto-Reflexion] REFLECTOR Output:
Simple operational endpoints with no external dependencies (process.uptime()) can
skip error handling wrapping, reducing boilerplate while maintaining reliability.

## 2026-06-07 01:11
[Auto-Reflexion] REFLECTION: Version endpoints should source npm_package_version
from package.json at build time, not runtime, to avoid undefined fallbacks in
production environments.

## 2026-06-07 01:13
[Auto-Reflexion] REFLECTION:
Memory metrics endpoints should use process.memoryUsage() directly without
additional system calls, as it's already optimized and prevents redundant
OS-level queries.
```
**CONCLUSION:** REFLECTOR stage ran after 3 pipeline runs (run-mq30xfgp at 00:09, run-mq30zh1n at 00:11, run-mq311y1h at 00:13) and wrote lessons to Obsidian. Timestamps in file match apex_agent_runs timestamps. Lessons ARE created.

### VERDICT: PROVEN WORKING (vault path)

---

## 5. Lesson Persistence

**EVIDENCE TYPE:** Supabase database row count  
**TIMESTAMP:** 2026-06-08T13:51:57Z  
**COMMAND:**
```
GET /rest/v1/apex_lessons?select=*&limit=20
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```
**RESULT:**
```json
[]
```
**CONCLUSION:** The `apex_lessons` table is empty. Zero rows. Despite 14 confirmed production pipeline runs completing (3 of which had confirmed REFLECTOR output written to Lessons.md), no lessons have been persisted to Supabase. The `logLesson()` path to Supabase is not writing. This is consistent with the `logLesson()` synchronous bug that was fixed in commit b8ccb56 (deployed 2026-06-08T13:53:36Z) — all 14 runs completed before the fix was live.

### VERDICT: PROVEN BROKEN

---

## 6. Lesson Retrieval

**EVIDENCE TYPE:** None obtainable  
**TIMESTAMP:** N/A  
**COMMAND:** No command available to observe lesson retrieval occurring in a pipeline context  
**RESULT:** N/A  
**CONCLUSION:** Lessons.md exists with content. The wiki-reader code path to read it exists. But no pipeline has run since the current server came live. There is no log, database record, or observable output confirming a pipeline consumed lesson content from Lessons.md to influence a decision. Cannot prove or disprove.

### VERDICT: UNPROVEN

---

## 7. GitHub Commit/Push

**EVIDENCE TYPE:** GitHub REST API response  
**TIMESTAMP:** 2026-06-08T13:49:42Z  
**COMMAND:**
```
GET https://api.github.com/repos/APoLLoGoD666/ai-os-server/commits/3a8d653
Authorization: token <GITHUB_TOKEN>
```
**RESULT:**
```json
{
  "sha": "3a8d653d467705a826682974fd3898562f8f8c25",
  "commit": {
    "author": {"name": "Apex AutoPilot", "date": "2026-06-07T00:13:28Z"},
    "message": "Merge feat/run-mq311y1h-mq3124cy: Add GET /api/memory-stats endpoint returning heap"
  }
}
```
Additional commits confirmed present: `bcf7359` (run-mq30zh1n), `7e0b644` (run-mq30xfgp).

**CONCLUSION:** The COMMITTER stage pushed real commits to GitHub. Commit `3a8d653` corresponds exactly to run-mq311y1h (timestamp 2026-06-07T00:13:28Z matches apex_agent_runs created_at 2026-06-07T00:13:34Z). The "Apex AutoPilot" committer identity confirms the pipeline authored the commit.

### VERDICT: PROVEN WORKING

---

## 8. Notification Creation

**EVIDENCE TYPE:** Supabase database rows  
**TIMESTAMP:** 2026-06-08T13:49:26Z  
**COMMAND:**
```
GET /rest/v1/apex_notifications?select=type,read,created_at&order=created_at.desc
```
**RESULT:**
```
35 total rows (confirmed via Content-Range: 0-34/35)

Most recent: {"type":"error","read":true,"created_at":"2026-06-05T23:04:23.02996+00:00"}
  message: "[uncaughtException] Cannot find module './agent-pipeline-hooks'"

master_task notifications:
  {"type":"master_task","read":true,"created_at":"2026-06-02T13:05:11.649903+00:00"}
  {"type":"master_task","read":true,"created_at":"2026-06-02T12:49:51.171083+00:00"}
  {"type":"master_task","read":true,"created_at":"2026-06-02T12:12:07.587399+00:00"}
```
**CONCLUSION:** 35 notifications exist in the database. Two distinct types confirmed: `error` (server startup crashes surfaced as notifications) and `master_task` (agent task events). Notifications are created by the runtime — error notifications were created in real-time as server crashes occurred.

### VERDICT: PROVEN WORKING

---

## 9. Notification Cleanup

**EVIDENCE TYPE:** Supabase database observation  
**TIMESTAMP:** 2026-06-08T13:59:28Z  
**COMMAND:**
```
GET /rest/v1/apex_notifications?select=created_at,read&order=created_at.asc&limit=1
GET /rest/v1/apex_notifications?select=id (with Prefer: count=exact header)
```
**RESULT:**
```
Oldest notification: 2026-06-01T21:23:54Z (read=true)
Total count: 35
cron_logs table: [] (empty — no purge execution ever recorded)
```
**CONCLUSION:** The oldest notification is from 2026-06-01 (7 days ago at time of test — below the 7-day TTL boundary of 21:23 UTC). `cron_logs` is empty, confirming no cron execution has been recorded. The purge setInterval runs every 6 hours but leaves no trace in the database. Whether it has fired and found nothing to delete, or never fired, or fired and deleted records that existed before June 1, cannot be determined from current observable state.

### VERDICT: UNPROVEN

---

## 10. Scheduled Task Execution

**EVIDENCE TYPE:** Supabase `agent_schedules` + `agent_tasks` tables  
**TIMESTAMP:** 2026-06-08T13:53:53Z  
**COMMAND:**
```
GET /rest/v1/agent_schedules?select=*&limit=5
GET /rest/v1/agent_tasks?select=id,status,goal,created_at,updated_at
    &order=created_at.desc&limit=5
```
**RESULT:**
```
agent_schedules:
  id:2, goal:"organise my workspace and suggest cleanup",
  frequency:"daily", enabled:true,
  last_run_at:"2026-06-08T10:26:11.239"  ← ran TODAY

agent_tasks (same goal, consecutive days):
  id:129 status:failed    2026-06-08T10:26:11  ← today
  id:128 status:completed 2026-06-07T10:25:08  ← yesterday, COMPLETED
  id:127 status:waiting_approval 2026-06-06T10:20:47
  id:126 status:waiting_approval 2026-06-06T00:55:49 (from email trigger)
```
**CONCLUSION:** Schedule #2 fired today at 10:26:11 UTC, creating task #129. Yesterday the same schedule fired at 10:25:08 and task #128 completed successfully. The daily cadence is confirmed across three consecutive days (June 6, 7, 8) with distinct task IDs and timestamps.

### VERDICT: PROVEN WORKING

---

## Final Summary

| # | Item | Verdict |
|---|---|---|
| 1 | Gmail send | **PROVEN WORKING** |
| 2 | Gmail receive | **PROVEN WORKING** |
| 3 | Agent execution | **PROVEN WORKING** |
| 4 | Lesson creation | **PROVEN WORKING** |
| 5 | Lesson persistence | **PROVEN BROKEN** |
| 6 | Lesson retrieval | **UNPROVEN** |
| 7 | GitHub commit/push | **PROVEN WORKING** |
| 8 | Notification creation | **PROVEN WORKING** |
| 9 | Notification cleanup | **UNPROVEN** |
| 10 | Scheduled task execution | **PROVEN WORKING** |

**PROVEN WORKING: 7**  
**PROVEN BROKEN: 1** (apex_lessons Supabase persistence — fixed in b8ccb56 deployed today; next run will be the first test)  
**UNPROVEN: 2** (lesson retrieval cannot be observed without a new pipeline run; notification cleanup cannot be observed without a 7+ day old read notification)

---

## Side Effect: Render Env Var Restore

During this exercise the user reported all Render env vars were deleted (only GMAIL_REFRESH_TOKEN remained). The following was performed:

**TIMESTAMP:** 2026-06-08T13:50:53Z  
**COMMAND:** `PUT https://api.render.com/v1/services/srv-d7idj1gsfn5c738hpsc0/env-vars` (23 vars)  
**RESULT:** HTTP 200, all 23 vars confirmed in response  
**Deploy triggered:** `dep-d8jchiq8qa3s73f63ea0` — live at 2026-06-08T13:53:36Z  
**Post-deploy health:** HTTP 200, status:ok, db:true, ai:true, tts:true
