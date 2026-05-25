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

## Ruflo Agent Orchestration (installed 2026-05-21)

Ruflo v3.7.0-alpha.72 is installed as the agent orchestration backbone.

### Key paths
- `.claude/` — 23 agent definitions, 10 command groups, hooks, helpers
- `.claude-flow/` — runtime config, sessions, logs, daemon state
- `.swarm/memory.db` — hybrid vector + SQLite memory store
- `.mcp.json` — MCP server config (ruflo, ruv-swarm, flow-nexus)

### Ruflo CLI (via local binary)
- `node_modules/.bin/ruflo status` — check system state
- `node_modules/.bin/ruflo swarm start` — start agent swarm
- `node_modules/.bin/ruflo daemon start/stop` — background workers
- `node_modules/.bin/ruflo memory search -q "query"` — search memory
- `node_modules/.bin/ruflo task spawn --agent <name> --task "<desc>"` — dispatch task

### Integration rules
- Ruflo runs on port 3001 (MCP) — no conflict with server.js (port 3000).
- Do not start the ruflo swarm automatically on Render — trigger on demand only.
- Ruflo agents must respect the same approval/safety rules as all other agents.
- Do not expose Ruflo API endpoints publicly without auth middleware.

## rtk (token proxy — active)
Shell commands route through rtk automatically via the PreToolUse hook.
- Prefer `cat`, `head`, `tail`, `rg`, `grep`, `find` over built-in Read/Grep/Glob when scanning the codebase — shell output is ~80% cheaper through rtk.
- When a test or lint command fails, run `rtk err <cmd>` to filter to errors only.
- After sessions with 5+ shell commands, run `rtk gain` to report savings.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
