# AI OS — Claude Code Instructions

## Karpathy Coding Guidelines

**Think Before Coding** — State assumptions explicitly. If multiple interpretations exist, present them. Push back when a simpler approach exists. Stop and ask when confused.

**Simplicity First** — Minimum code that solves the problem. No speculative features, no abstractions for single-use code, no error handling for impossible scenarios. If 200 lines could be 50, rewrite it.

**Surgical Changes** — Touch only what the task requires. Don't improve adjacent code, reformat, or refactor things that aren't broken. Every changed line must trace directly to the user's request.

**Goal-Driven Execution** — Transform tasks into verifiable goals. For multi-step work, state a brief plan with verification steps before starting.

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
- `.mcp.json` — MCP server config (gitnexus, ruflo, ruv-swarm, flow-nexus)

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

## graphify (secondary — use GitNexus MCP first)

Graphify knowledge graph lives at graphify-out/. Use it only when GitNexus MCP tools are unavailable.
- `graphify query "<question>"`, `graphify path "<A>" "<B>"`, `graphify explain "<concept>"`
- `graphify-out/wiki/index.md` for broad navigation.
- `graphify update .` after code changes (AST-only, no API cost).

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ai-os-server** (3614 symbols, 17201 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ai-os-server/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ai-os-server/clusters` | All functional areas |
| `gitnexus://repo/ai-os-server/processes` | All execution flows |
| `gitnexus://repo/ai-os-server/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
