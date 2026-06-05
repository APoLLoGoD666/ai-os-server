# Integration Gaps Report
*Generated: 2026-06-05 | APEX AI OS Production Audit*

## Status: MOSTLY INTEGRATED

21 of 22 service files are reachable from server.js. One file is unattached.

---

## Summary Table

| File | Wired | How |
|---|---|---|
| services/init.js | ✅ | server.js line 11233, server.listen callback |
| services/notion/notion-client.js | ✅ | via notion-tasks/projects/clients/sync |
| services/notion/notion-tasks.js | ✅ | routes/integrations.js GET+POST /api/tasks |
| services/notion/notion-projects.js | ✅ | routes/integrations.js GET+POST /api/projects |
| services/notion/notion-clients.js | ✅ | routes/integrations.js GET /api/clients, lead-pipeline |
| services/notion/notion-sync.js | ✅ | init.js event bus + routes/integrations.js |
| services/slack/slack-client.js | ✅ | all slack/* modules |
| services/slack/slack-agents.js | ✅ | init.js event bus (AGENT_STARTED/COMPLETED) |
| services/slack/slack-alerts.js | ✅ | routes/integrations.js POST /api/slack/alert |
| services/slack/slack-briefings.js | ✅ | server.js lines 11351+11441, routes |
| services/slack/slack-system-health.js | ✅ | init.js every 6 hours |
| services/pipelines/lead-pipeline.js | ✅ | routes/integrations.js POST /api/leads/inbound |
| services/pipelines/daily-briefing-pipeline.js | ✅ | routes/integrations.js POST /api/briefing/daily |
| services/pipelines/weekly-review-pipeline.js | ✅ | routes/integrations.js POST /api/briefing/weekly |
| services/sync/supabase-notion-sync.js | ✅ | init.js every 6 hours + ensureCheckpointTable on startup |
| routes/integrations.js | ✅ | auto-loaded by _loadAgentRoutes() (17 endpoints) |
| **services/pipelines/agent-pipeline-hooks.js** | **❌** | **Not called anywhere** |

---

## Gap Detail

### GAP-01 — agent-pipeline-hooks.js is unattached

- **File:** `services/pipelines/agent-pipeline-hooks.js`
- **Exports:** `onPipelineStart`, `onPipelineComplete`, `onPipelineFailed`, `onAgentStepStart`, `onAgentStepComplete`, `onAgentStepFailed`
- **Intended consumer:** An `orchestrator.js` or master task runner — neither exists
- **Impact:** Agent pipeline Slack/Notion notifications don't fire for multi-step runs triggered through server.js `checkPendingMasterTasks()` or `runDueSchedules()`
- **Risk:** Low — the event-bus hooks in init.js already cover AGENT_STARTED/AGENT_COMPLETED for single runs. Only multi-step pipelines are missing.

**Fix (when ready):** In server.js wherever a pipeline sequence starts, add:
```javascript
const hooks = require('./services/pipelines/agent-pipeline-hooks');
await hooks.onPipelineStart({ pipelineId, task, agentCount });
// ... run agents ...
await hooks.onPipelineComplete({ pipelineId, results });
```
No urgency — init.js event-bus covers the critical path.

---

## What IS fully wired

- ✅ **Notion databases:** All 10 DBs accessible; tasks/projects/clients/agentRuns/decisions all writable
- ✅ **Slack channels:** All posting functions reachable; health checks on 6-hour schedule
- ✅ **Supabase→Notion sync:** `runFullSync` runs every 6 hours with checkpoint-based dedup
- ✅ **Event bus:** `AGENT_STARTED` → Slack notifyRunStart; `AGENT_COMPLETED` → Slack notifyRunComplete + Notion logAgentRun
- ✅ **Daily briefing:** `_scheduleDailyBriefing()` in server.js now posts to Slack after writing Obsidian
- ✅ **Weekly review:** `_scheduleWeeklyReview()` in server.js now posts to Slack after writing Obsidian
- ✅ **Lead pipeline:** POST /api/leads/inbound → Slack alert + Notion client + Notion project
- ✅ **System health:** init.js posts to #apex-system-health every 6 hours

---

## Missing env vars (not code gaps)

These features are coded and deployed but dormant until env vars are set:

| Env Var | Feature gated |
|---|---|
| NOTION_API_KEY | All Notion writes, Supabase→Notion sync |
| SLACK_BOT_TOKEN | All Slack posts, health checks, agent notifications |
