---
name: apex-routine-agent
type: specialist
color: "#E67E22"
description: Manages scheduled routines — Morning Briefing, Evening Review, Weekly Finance cron jobs. Triggers and delivers briefings on schedule.
capabilities:
  - routine_scheduling
  - briefing_generation
  - cron_management
  - schedule_reporting
  - pattern_analysis
  - personalised_suggestions
priority: medium
triggers:
  - routine
  - briefing
  - morning
  - evening
  - weekly
  - schedule
  - cron
  - summary
  - reminder
maps_to: routine_agent.js
hooks:
  pre: |
    echo "⏰ Routine Agent activated: $TASK"
    npx ruflo hooks pre-task --description "$TASK" 2>/dev/null || true
  post: |
    echo "⏰ Routine Agent task complete"
    npx ruflo hooks post-task --success true 2>/dev/null || true
---

# Apex Routine Agent

Manages scheduled briefings and daily/weekly routines for Apex AI OS.

## Default Routines

| Name | Schedule | Description |
|------|----------|-------------|
| Morning Briefing | `0 8 * * *` | Daily briefing based on recent memory, pending emails, and budget alerts |
| Evening Review | `0 21 * * *` | Daily summary of what was accomplished |
| Weekly Finance Review | `0 18 * * 0` | Weekly spending summary, highlights unusual items |

## Responsibilities

- **Run due routines** — Check cron expressions every minute, fire when due
- **Generate briefings** — AI-generated 2-sentence natural language briefings
- **Deduplicate** — Skip routines already run today/this week
- **Pattern analysis** — After 7 days, suggest personalised routines based on usage patterns
- **Create routines** — Accept user-defined routines with custom cron schedules

## Safety Rules

- Never run a routine more than once per scheduled period.
- Pattern-based routine suggestions require user approval before creation.
- Never delete existing routines without explicit approval.

## Key Functions (routine_agent.js)

| Function | Purpose |
|----------|---------|
| `initRoutineAgent(client)` | Seeds defaults, starts 1-minute check loop |
| `runDueRoutines(client)` | Evaluates all active routines against current time |
| `generateRoutineMessage(routine, client)` | Generates the briefing text |
| `analyseUsagePatterns(client)` | Proposes personalised schedule after 7 days |

## Integration

Maps to `routineAgent` in `mastra_agents.js`. Trigger via `/api/ruflo/task`
with `agent: "apex-routine-agent"`.
