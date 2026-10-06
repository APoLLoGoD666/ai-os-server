# APEX Civilisation — Master Execution Plan

> **INSTRUCTIONS FOR ANY CLAUDE SESSION READING THIS:**
> This is the single source of truth for the APEX civilisation build.
> Read this file FIRST before touching any code. Update `## Current Position`
> immediately when a step completes. Never implement without reading this first.

---

## What APEX Is

APEX is a personal digital civilisation — a fully sovereign, self-governing, self-improving
organisation that operates on behalf of a single human (the Founder). Not an assistant. Not
an automation platform. A civilisation with constitutional governance, a Supreme Council of
10 C-suite executives, 10 ministries, domain directors for each life area, and 200+ specialist
Office Agents covering every function a modern enterprise needs.

**The goal:** The Founder issues intent. The civilisation executes. The Founder retains
constitutional authority (kill-switch). Everything else is delegated.

**Current maturity:** 49/100 (Emerging Civilisation)
**Target:** 80/100 in ~45 days (Autonomous Organisation), 95/100 in Year 2

---

## Key Architecture

```
FOUNDER (you)
    └── SUPREME COUNCIL (10 C-suite executives — deliberate, govern)
            └── MINISTRIES (10 — Intelligence, Capital, Growth, Operations,
            |                    Research, Product, Infrastructure, Governance,
            |                    Opportunity Discovery, Civilisation Evolution)
            └── DOMAIN DIRECTORS (9 orchestrators — decompose & route tasks)
                    ├── Finance Director → [Bookkeeper, Tax Advisor, Investment Analyst...]
                    ├── Business Director → [Marketing Mgr, Sales Agent, CRM Agent...]
                    ├── Health Director → [Nutrition Advisor, Fitness Coach...]
                    ├── Education Director → [Assignment Mgr, Research Assistant...]
                    ├── Intelligence Director → [Market Analyst, News Monitor...]
                    ├── Governance Director → [Constitutional Auditor, Compliance...]
                    ├── Content Director → [Copywriter, Social Media Agent...]
                    ├── Technology Director → [Backend Eng, DevOps, Security...]
                    └── Goals Director → [Vision Keeper, Milestone Tracker...]
```

**Key principle:** Domain Directors ORCHESTRATE. Office Agents EXECUTE.
One task → one Director → one or more Office Agents → certified output with evidence chain.

---

## Stack

- **Backend:** Node.js + Express on Render (`ai-os-server-jx20.onrender.com`)
- **DB:** Supabase Postgres
- **AI:** Claude API (Haiku for workers, Sonnet for directors, Opus for Council)
- **Voice:** Gemini 2.5 Flash
- **Frontend:** `dashboard.html` (~38,000 line SPA)
- **Vault:** Obsidian at `C:\Users\arwwo\Desktop\APEX\APEX AI OS\`
- **Agent specs:** GitHub msitarzewski/agency-agents (200+ definitions)
- **Key files:**
  - `C:\Users\arwwo\Desktop\APEX\Scripts\server.js` — main backend
  - `C:\Users\arwwo\Desktop\APEX\Scripts\public\dashboard.html` — frontend SPA
  - `C:\Users\arwwo\Desktop\APEX\Scripts\routes\` — all API route files
  - `C:\Users\arwwo\Desktop\APEX\Scripts\agent-system\` — agent logic

---

## Critical Decisions Already Made

| Decision | Choice | Reason |
|----------|--------|--------|
| Orchestration framework | Native Express/Node (no Mastra) | Mastra was retired from worktrees; adds complexity without need at this scale |
| Model tier policy | Haiku=Office, Sonnet=Directors, Opus=Council key decisions | Cost management at 200+ agent scale |
| First domain to prove | Business | Highest economic leverage, safest failure modes |
| Agent activation order | Business(30) + Finance(12) + Intelligence(8) first, then expand | Revenue before scale |
| Routing approach | Keyword + domain matching v1, AI routing v2 | Correctness over sophistication initially |
| Data ownership model | Per-agent memory partition in Supabase (`agent:{id}` namespace) | Each agent has unique data, Founder reads all |

---

## What Actually Works Today

- [x] Task pipeline (Input → Council → Gate → Domain → Office → Output → Memory)
- [x] Constitutional governance framework
- [x] Supabase backend (tasks, docs, memories)
- [x] Forensics/provenance chain (16-question evidence per task)
- [x] Temporal zones (all 5 domains, fixed 2026-10)
- [x] Dashboard SPA (Today page, Overview/KG page, all nav pages)
- [x] Briefing system (priority inbox, today surface)
- [x] Voice interface (Gemini 2.5)
- [x] Page naming fixed: nav-today→page-today, nav-overview→page-overview

## What Is Designed But Not Yet Built

- [ ] Agent registry (structured config for all 200+ agents)
- [ ] Domain→Office routing table
- [ ] Agent memory partitions (per-agent Supabase namespacing)
- [ ] Supreme Council as persistent cognitive identities (stateful sessions)
- [ ] Ministry automated reports (10 ministries, weekly cron)
- [ ] Overview page as civilisation command surface (org chart view)
- [ ] Self-expansion engine
- [ ] Opportunity engine
- [ ] Revenue operations (zero revenue today)
- [ ] _liveTasks bug fix (returns empty array — response parsing mismatch)

---

## Execution Sequence (Dependency-Ordered)

### PHASE 1 — FOUNDATION (Week 1)
> Nothing else works properly until these exist.

**Step 1.1 — Fix _liveTasks bug** ✅ TODO
- File: `C:\Users\arwwo\Desktop\APEX\Scripts\public\dashboard.html`
- Function: `_fetchLive()` ~line 35858
- Issue: `_liveTasks = Array.isArray(res[1]) ? res[1] : (res[1].tasks || [])` — verify
  actual API response shape from `/api/tasks?limit=200`
- Fix: console.log the raw response, correct the array extraction
- Verify: KG nodes animate when tasks exist

**Step 1.2 — Agent Registry** ✅ TODO
- Create: `C:\Users\arwwo\Desktop\APEX\Scripts\agent-system\agent-registry.js`
- Structure: see AGENT REGISTRY SPEC below
- Scope: 9 Domain Directors + 30 Business Office Agents + 12 Finance + 8 Intelligence
- Do NOT try to define all 200 at once

**Step 1.3 — Routing Table** ✅ TODO
- Create: `C:\Users\arwwo\Desktop\APEX\Scripts\agent-system\routing-table.js`
- Input: task intent string + domain slug
- Output: { director: agentId, workers: [agentId, ...] }
- v1: keyword matching, no AI needed

**Step 1.4 — Agent Memory Partitions** ✅ TODO
- Supabase: add `partition_key` column to `agent_memory` table (or create table)
- Accessor: `getAgentMemory(agentId)`, `writeAgentMemory(agentId, data)`
- Namespace: `agent:{agentId}` for workers, `council:{role}` for C-suite, `ministry:{name}` for ministries
- Founder can read all partitions

### PHASE 2 — SUPREME COUNCIL (Week 2)
> The governance layer becomes real.

**Step 2.1 — Council Cognitive Identities** ✅ TODO
- Each of 10 C-suite gets: named memory partition, defined system prompt, deliberation role
- Update deliberation endpoint to call each executive individually and record their position
- C-suite roles: CSO, CIO, CFO, CTO, COO, CRO, CGO, CRO-R, CPO, CLO

**Step 2.2 — Council Deliberation Upgrade** ✅ TODO
- Current: generic AI call
- Target: 10 named executives, each responds from their perspective, positions recorded
- Output: consensus recommendation + individual positions + Founder summary

### PHASE 3 — OVERVIEW COMMAND SURFACE (Week 2-3)
> The display layer, now that there's real data to show.

**Step 3.1 — Civilisation Org Chart View** ✅ TODO
- Replace circular KG graph with hierarchical org chart
- Founder → Council → Domain Directors → Office Agents
- Live status: active/idle/alerting per agent
- Real data from agent registry + live task routing

**Step 3.2 — Left Sidebar Feature Registry** ✅ TODO
- Persistent sidebar listing all departments + agents
- Collapsible by domain
- Live status indicators

### PHASE 4 — BUSINESS DOMAIN END-TO-END (Week 3)
> Prove the full chain. Revenue before scale.

**Step 4.1 — Wire Business Director** ✅ TODO
- Business Director receives task → decomposes → routes to correct Office Agent
- Test with: "draft a proposal for [client]", "post to Instagram", "follow up with lead"

**Step 4.2 — Activate Revenue Agents** ✅ TODO
- Sales Agent — lead follow-up, proposal drafting, pipeline tracking
- Social Media Agent — content generation, scheduling, performance
- Client Success Agent — renewal flagging, satisfaction tracking

### PHASE 5 — DOMAIN ROLLOUT (Weeks 4-6)
Repeat Phase 4 pattern for: Finance, Health, Education, Intelligence, Governance, Content, Technology

### PHASE 6 — MINISTRY AUTOMATION (Weeks 6-8)
10 ministry weekly reports → Council → Founder briefing

### PHASE 7 — SELF-EXPANSION ENGINE (Month 3)
Gap detector → proposal → approval → build → deploy → monitor

---

## What Actually Exists (Corrected Inventory)

The codebase is more advanced than the 49/100 score suggests:

| Component | Status | Location |
|-----------|--------|----------|
| Domain agents (7) with system prompts + delegation | EXISTS | `agent-system/domain-agents.js` |
| Office agents (33) with full system prompts | EXISTS | `agent-system/office-agents.js` |
| Pipeline agents (8) with capabilities | EXISTS | `agent-registry.js` |
| Agent delegation pattern `[DELEGATE: slug: task]` | EXISTS | in each domain agent prompt |
| Supreme Council (10 C-suite) cognitive identities | ADDED 2026-10-05 | `agent-registry.js` |
| Domain Directors (9) with worker lists | ADDED 2026-10-05 | `agent-registry.js` |
| Routing table (domain + office agent detection) | ADDED 2026-10-05 | `agent-system/routing-table.js` |
| Agent memory partitions | NOT YET | needs Supabase schema |
| Council deliberation using named identities | NOT YET | needs lib/executive/executive-council.js update |
| Ministry automated reports | NOT YET | needs cron + ministry agents |
| Overview command surface (org chart) | NOT YET | needs dashboard.html redesign |

---

## Current Position

**Last updated:** 2026-10-05
**Current phase:** PHASE 1 complete → PHASE 2 + 3

**Steps completed this session:**
- [x] Page naming fixed (today/overview/briefing now match nav labels)
- [x] Temporal zone ASI bug fixed
- [x] Today alias fix
- [x] _liveTasks fix: added `scope=all` to `/api/tasks?limit=200&scope=all` in _fetchLive()
- [x] Supreme Council (10 members) added to agent-registry.js with cognitive identities
- [x] Domain Directors (9) added to agent-registry.js with worker lists
- [x] routing-table.js created — tested, routes correctly
- [x] Step 1.4 — `lib/agent-memory.js` created: getAgentMemory, writeAgentMemory, getPartitionMemories, getAllAgentMemories with full namespace mapping (agent:, director:, council:, ministry:)
- [x] Step 2.1 — `lib/executive/registry.js` extended: added cpo (Chief Product Officer) + crr (Chief Research Officer); VOTING_ENTITIES expanded from 6 → 10 named council identities in executive-council.js
- [x] Step 3.1 partial — `/api/civilization/hierarchy` endpoint added to routes/civilization.js
- [x] Step 3.1 partial — Overview page: [PROCESS MAP] / [CIVILISATION] view toggle added; `_loadOrgChart()` renders Founder → Council → Directors hierarchy from live API

**Supabase TODO (manual step — run once):**
Migration file ready: `migrations/105_agent_memory_partitions.sql`
Paste into Supabase SQL Editor and run. Creates `agent_memory` table with partition indexes.

**Steps also completed (self-audit fixes):**
- [x] Council deliberation stances wired in: `_castVote()` now injects each member's `deliberation_stance` from SUPREME_COUNCIL as a framing prefix — each of the 10 executives votes from their specific cognitive posture
- [x] Hierarchy endpoint fixed: uses all 33 `OFFICE_AGENTS` from office-agents.js (was using 5 generic DOMAIN_AGENTS)
- [x] Org chart shows all 3 tiers: Founder → Council → Directors → 33 Office Agents (grouped by domain)
- [x] `_fetchLive()` now triggers `_loadOrgChart()` refresh when civilisation view is active

**THE WIRE IS LIVE — session 2026-10-05:**
- [x] `POST /api/civilisation/dispatch` — full routing table → domain agent → office agent chain
- [x] `src/routes/chat.js` — civilisation routing wired into chat: messages ≥ 6 words with confidence ≥ 0.5 route through the hierarchy automatically. Reply prefixed with `[Agent Name → office-agent-slug]`
- [x] Memory writes: director partition + worker partition written after every dispatch
- Domain map: finance→finance, business→business, marketing→marketing, health→health, system→system, university→uni, governance→civilisation, content→comms, intelligence→system
- Verified: 6/6 test routing cases route correctly with high confidence

- [x] Step 2.2 — Council `_synthesize()` upgraded: full title map for all 10 executives, vote summary shows "Chief Strategy Officer (CSO)" etc, CEO prompt lists all 10 members and is instructed to name driving/dissenting executives by title in recommendation.
- [x] CC Design Spec — Overview/Command Centre full visual redesign: 28 --ax-* tokens, sticky header, scanline dispatch, corrected CC/DC colour maps (WCAG-safe), cmd-canvas-inner constraint wrapper, dispatch-before-stats order, left-border council tiles, responsive 3 breakpoints, prefers-reduced-motion, accessibility (role=button, aria-label, aria-live, role=status, 44px touch targets, focus-visible) — 13/13 pre-delivery checklist items passing.

- [x] Step 3.2 — Left sidebar feature registry: REGISTRY/APPROVALS tab toggle in left panel header; collapsible 9-domain sections each showing director + office agents with live status dots and domain colour coding; approval badge on APPROVALS tab when tasks pending; persistent open/closed state per domain via _civDomainOpen{}; hierarchy data cached in _cmdHierarchy after first fetch.

**Next step:** Step 4.1 — Wire Business Director end-to-end (task → decompose → office agent chain)
- Collapses by domain; persists open state in localStorage
- Real data from existing `/api/civilization/hierarchy` endpoint

**Data ready:** All agent data is live in the hierarchy endpoint. UI is the only missing piece.

---

## Agent Registry Spec

```javascript
// C:\Users\arwwo\Desktop\APEX\Scripts\agent-system\agent-registry.js

module.exports = {
  agents: {
    // ── DOMAIN DIRECTORS ──────────────────────────────────────────
    'director-finance': {
      id: 'director-finance',
      name: 'Finance Director',
      layer: 'domain',
      domain: 'finance',
      role: 'Orchestrates all financial operations. Decomposes financial tasks and routes to specialist Office Agents. Does not execute directly.',
      model: 'claude-sonnet-4-6',
      cost_cap: 0.10,
      memory_partition: 'director:finance',
      workers: ['finance-bookkeeper', 'finance-tax', 'finance-investment', 'finance-budget', 'finance-cashflow']
    },
    'director-business': {
      id: 'director-business',
      name: 'Business Director',
      layer: 'domain',
      domain: 'business',
      role: 'Orchestrates all commercial operations.',
      model: 'claude-sonnet-4-6',
      cost_cap: 0.10,
      memory_partition: 'director:business',
      workers: ['business-marketing', 'business-sales', 'business-crm', 'business-content', 'business-social']
    },
    // ... (all 9 directors follow same pattern)

    // ── OFFICE AGENTS — FINANCE ────────────────────────────────────
    'finance-bookkeeper': {
      id: 'finance-bookkeeper',
      name: 'Bookkeeper',
      layer: 'office',
      domain: 'finance',
      department: 'Finance Office',
      director: 'director-finance',
      specialty: 'Transaction recording, account reconciliation, ledger management',
      system_prompt: 'You are the APEX Bookkeeper...',
      model: 'claude-haiku-4-5-20251001',
      cost_cap: 0.05,
      memory_partition: 'agent:finance-bookkeeper',
      tools: ['supabase_read', 'supabase_write'],
      task_patterns: ['reconcile', 'record transaction', 'ledger', 'balance check', 'bookkeeping']
    },

    // ── OFFICE AGENTS — BUSINESS ───────────────────────────────────
    'business-social': {
      id: 'business-social',
      name: 'Social Media Agent',
      layer: 'office',
      domain: 'business',
      department: 'Business Office',
      director: 'director-business',
      specialty: 'Content creation, scheduling, platform management, performance analysis',
      system_prompt: 'You are the APEX Social Media Agent...',
      model: 'claude-haiku-4-5-20251001',
      cost_cap: 0.05,
      memory_partition: 'agent:business-social',
      tools: ['supabase_read', 'supabase_write', 'web_search'],
      task_patterns: ['instagram', 'post', 'social', 'content', 'caption', 'hashtag']
    }
  },

  // ── COUNCIL ───────────────────────────────────────────────────────
  council: {
    'council-cso': { id: 'council-cso', name: 'Chief Strategy Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:cso' },
    'council-cio': { id: 'council-cio', name: 'Chief Intelligence Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:cio' },
    'council-cfo': { id: 'council-cfo', name: 'Chief Finance Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:cfo' },
    'council-cto': { id: 'council-cto', name: 'Chief Technology Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:cto' },
    'council-coo': { id: 'council-coo', name: 'Chief Operations Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:coo' },
    'council-cro': { id: 'council-cro', name: 'Chief Risk Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:cro' },
    'council-cgo': { id: 'council-cgo', name: 'Chief Growth Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:cgo' },
    'council-cpo': { id: 'council-cpo', name: 'Chief Product Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:cpo' },
    'council-cro-r': { id: 'council-cro-r', name: 'Chief Research Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:cro-r' },
    'council-clo': { id: 'council-clo', name: 'Chief Legal Officer', model: 'claude-sonnet-4-6', memory_partition: 'council:clo' }
  }
};
```

---

## How to Resume This Work (Any Future Session)

1. Read this file (`APEX-CIVILISATION-PLAN.md`) completely
2. Check `## Current Position` — this tells you exactly where we are
3. Read the file(s) referenced in "Next action"
4. Execute the current step
5. Update `## Current Position` when step completes
6. Never skip steps — the dependency order is structural

**Session start command:** "lets go" — the hook will inject project state automatically.
