# 01 — Executive Summary

**Census Date:** 2026-07-02  
**Survey Mode:** Read-only. Nothing modified.

---

## What Was Surveyed

The APEX Civilisation spans a Windows 11 desktop at `C:/Users/arwwo/Desktop/APEX/`. It consists of five distinct repositories and several standalone directories. The primary live system is a Node.js/Express server hosted on Render. The primary knowledge management system is an Obsidian vault tracked in git. Both are in active development.

---

## Five Repositories

| Repository | Path | Status |
|------------|------|--------|
| APEX AI OS vault | `Desktop/APEX/APEX AI OS/` | Active — Obsidian git-tracked vault |
| Scripts (live AI OS) | `Desktop/APEX/Scripts/` | Active — deployed to Render |
| apex-assistant-reference | `Desktop/APEX/apex-assistant-reference/` | Reference — earlier JS implementation |
| Projects/Legacy | `Desktop/APEX/Projects/Legacy/` | Legacy — Python voice assistant iterations |
| (implicit Scripts git) | `Desktop/APEX/Scripts/.git/` | Active |

---

## The Live System (`Scripts/`)

The APEX AI OS is a Node.js/Express application deployed on Render's Starter tier.

**Entry point:** `server.js` (222 KB — monolithic main file)  
**Port:** 3000  
**Deployment:** `render.yaml` — 2 services: `ai-os-server` (Node) + `apex-ai-sidecar` (Python/uvicorn)  
**Database:** Supabase PostgreSQL (primary) + Supabase Storage (files)  
**AI Provider:** Anthropic Claude API (primary), Google, OpenAI (optional)  
**Current autonomy level:** Level 3 (env var `AUTONOMY_LEVEL=3`)

**What is deployed and working (per CLAUDE.md):**
- Chat interface
- PostgreSQL memory
- PostgreSQL documents
- Supabase Storage files
- Agent tasks
- Agent schedules
- Notifications
- Render cron route
- Dashboard Agent Control UI

**Constitution ratified:** 2026-06-10 (6 Articles, documented in `CONSTITUTION.md` and `APEX AI OS/00 Foundation/constitution-v1.md`)

---

## The Knowledge Vault (`APEX AI OS/`)

An Obsidian vault with 15 numbered top-level domains:

| # | Domain | Status |
|---|--------|--------|
| _Inbox | Staging area | Active |
| 00 Foundation | Core specs, architecture, memory, constitution | Active |
| 01 Executive | Dashboard, decisions, North Star | Active |
| 02 Projects | Active x2, Archive x2, Completed, Planning | Active |
| 03 Clients | Active, Archived, Prospects | Mostly empty |
| 04 University | Assignments, Modules, Resources | Mostly empty |
| 05 Finance | Budgets, Invoices, Reports | Mostly empty |
| 06 Health | Logs, Nutrition, Workouts | Mostly empty |
| 07 Relationships | Networks, People | Mostly empty |
| 08 Operations | System docs, architecture notes | Active |
| 09 Knowledge | CS249R curriculum, MOCs, Research, Entities | Active |
| 10 SOPs | Agency Playbooks, SOP-Registry | Active |
| 11 Agents | Agent-Registry, 140+ specifications | Active |
| 12 Memory | Episodes, Identity, Decisions, Governance | Active |
| 13 Briefings | Conversations, Daily, Weekly | Active |
| 14 Archives | Empty (README only) | Empty |
| System | Cognition evals, Goals, Improvements, Claude-Memory | Active |

---

## The Agent Specification Library (`11 Agents/Specifications/`)

140+ agent specifications organised by domain:

| Domain | Count |
|--------|-------|
| academic | 5 |
| design | 8 |
| engineering | 27 |
| finance | 5 |
| game-development | 20+ |
| marketing | 28+ |
| paid-media | 7 |
| product | 5 |
| project-management | 6 |
| sales | 8 |
| spatial-computing | 6 |
| specialized | 12+ |
| strategy | Present |
| support | Present |
| testing | Present |

---

## Active Runtime Agents (`Scripts/.claude/agents/`)

80+ agent markdown definitions deployed as Claude Code agents:

- APEX domain agents: autopilot, email, finance, reflection, research, routine, system
- Core: coder, planner, researcher, reviewer, tester
- GitHub: 13 agents (PR manager, release, repo architect, etc.)
- Consensus: 7 distributed consensus agents
- SPARC: 4 methodology agents
- Flow-nexus: 9 workflow agents
- V3 security: 16 agents
- Swarm coordinators: 3 (adaptive, hierarchical, mesh)
- Plus: optimization, sublinear math, data, development, devops, documentation

---

## Infrastructure

| Component | Technology | Status |
|-----------|-----------|--------|
| Hosting | Render Starter tier | Active (live) |
| Primary database | Supabase PostgreSQL | Active (55 migrations applied) |
| File storage | Supabase Storage | Active |
| Holdout evaluation | Second Supabase project | Active |
| AI | Anthropic Claude API | Active |
| Orchestration | Ruflo v3.7.0-alpha.72 | Installed |
| MCP servers | Notion, GitNexus, Ruflo, ruv-swarm, flow-nexus | Configured |
| Code intelligence | GitNexus (3,614 symbols, 17,201 relationships) | Active |
| Knowledge graph | Graphify | Active (graphify-out/) |
| Process manager | PM2 (local) | Configured |
| Browser automation | Playwright | Installed |
| TTS | Piper (local) | Present |
| Error tracking | Sentry | Configured |

---

## Governance

- **Constitution:** 6 Articles ratified 2026-06-10 (CONSTITUTION.md)
- **Vault constitution:** constitution-v1.md (Founder Sovereignty, Safety Systems)
- **Amendment log:** 4 entries (2026-06-10 to 2026-06-11)
- **Decision Records:** 5 DRs (voice-first, Claude routing, Supabase, Obsidian, Render)
- **Validation phases:** Phase 10 through Phase 41 (32 validators), plus A, B, C
- **Phase certifications:** Phase 0, Phase A fully certified against live database

---

## North Star (per 01 Executive/North-Star.md)

> "Alex is building Apex AI OS — a voice-first personal AI operating system that autonomously manages business, finance, email, and life operations. The vision is a system that works while Alex is AFK, surfaces only what needs human decision, and compounds in intelligence over time."

**Current phase:** Building the autonomous development pipeline so Apex builds itself.

---

## Critical Observations (Facts Only)

1. `server.js` is 222 KB. It is the monolithic core. CLAUDE.md explicitly forbids shortening it.
2. 55 SQL migrations exist. No migration runner confirms all are applied to production.
3. The `validation/` directory contains 32 phase validators. No evidence of automated CI running them.
4. `graphify-out/` and `dev-tools/graphify-out/` appear to be duplicate knowledge graph outputs.
5. `sidecar/` and `runtime/sidecar/` both contain `main.py` — two copies of the Python RAG service.
6. `migrations/` and `supabase/` directories contain overlapping SQL files.
7. The `apex-assistant-reference/` repository appears to be an earlier implementation, not decommissioned.
8. 140+ agent specifications exist in the vault but only a subset (80+) have matching `.claude/agents/` definitions.
9. No GitHub Actions or CI/CD configuration was found in Scripts.
10. `ROADMAP.md` lists 100+ features across 8 workstreams. 1 feature marked complete (FEAT-H009).
