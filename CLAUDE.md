# AI OS — Claude Code Instructions

## Project
This is a Render-hosted Node/Express AI OS.

## Core stack
- Node.js + Express
- Render deployment
- Supabase Postgres
- Supabase Storage
- Claude API
- dashboard.html frontend

## Key files
- server.js = main backend, routes, agent logic
- pg_helpers.js = Postgres helpers
- pg_database.js = Postgres connection
- storage.js = Supabase Storage helpers
- dashboard.html = UI

## Working features
- Chat
- Postgres memory
- Postgres documents
- Supabase Storage files
- Agent tasks
- Agent schedules
- Notifications
- Render cron route
- Autonomy Level 3
- Dashboard Agent Control UI

## Rules
- Do not rewrite whole files.
- Do not remove working features.
- Do not shorten server.js.
- Make small patches.
- Always inspect before editing.
- Always run node --check server.js after backend changes.
- Always preserve approval/safety for delete, rename, overwrite, code edits, GitHub pushes, and env changes.

## Current priority
Prepare the codebase for multi-agent roles:
- System Agent
- File Agent
- Uni Agent
- Finance Agent
- Business Agent

## Safety
Never expose secrets.
Never auto-delete.
Never auto-rename.
Never change environment variables from agent actions.
Never allow agent to edit code without explicit approval.