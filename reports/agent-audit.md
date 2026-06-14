# Agent Audit — Phase 5
*Audited: 2026-06-05*

---

## Agent Inventory

### TIER 1 — Production Pipeline Agents (orchestrator.js)

These 8 agents run sequentially when a task is queued in `apex_tasks`:

| Agent Role | Model | Purpose | Cost Control |
|---|---|---|---|
| RESEARCHER | Haiku/Sonnet | Web research via Firecrawl/browser | Optional step |
| ARCHITECT | Haiku→Sonnet | Analyzes spec, generates test cases (Zod validated) | Per-run budget |
| DEVELOPER | Haiku→Sonnet→Opus | Writes code files; escalates on retry | $2 USD cap |
| REVIEWER | Sonnet/Opus | OWASP + STRIDE security audit | Conditional |
| VALIDATOR | Haiku | Verifies test cases pass | Always |
| TESTER | Haiku | `node --check` syntax validation | Always |
| COMMITTER | Haiku | Git worktree, merge, Render deploy trigger | Always |
| REFLECTOR | Haiku | Extracts one-sentence lesson → Obsidian | Always |

**Complexity routing (4 tiers):** simple/moderate/complex/critical — affects model selection.
**Circuit breaker:** Opens after 5 consecutive API failures; exponential cooldown.
**Isolation:** Git worktree per task (`apex-wt-{taskId}`).

**Status: PRODUCTION_READY**

---

### TIER 2 — Master Orchestrator Helpers (master-orchestrator.js)

16 product/QA/release workflow helpers exposed as API endpoints:

| Endpoint | Function | Purpose |
|---|---|---|
| POST /api/master/office-hours | officeHours() | Product forcing questions |
| POST /api/master/qa-review | qaLead() | QA checklist generation |
| POST /api/master/code-review | codeReview() | Peer code review |
| POST /api/master/release-check | releaseCheck() | Go/no-go assessment |
| POST /api/master/retro | retro() | Weekly retrospective |
| POST /api/master/benchmark | benchmark() | Web vitals via browser-agent |
| POST /api/master/investigate | investigate() | 5-Whys root cause analysis |
| POST /api/master/ship | ship() | Canary → release check → tag → push |
| POST /api/master/design-consultation | designConsultation() | Design ideation |
| POST /api/master/codex | codex() | Obsidian vault + decisions context search |
| POST /api/master/autoplan | autoplan() | Ad-hoc feature planning |
| POST /api/master/pair | pairAgent() | Pair-programming next steps |
| POST /api/master/careful | careful() | Risk assessment before applying |
| + 3 more review patterns | planEngReview(), planDesignReview() | Staged review |

**Model:** Always `claude-haiku-4-5-20251001` — no complexity routing.
**Status: PRODUCTION_READY** (all 16 endpoints wired and auth-gated)

---

### TIER 3 — Background Agents (started at server startup)

| Agent | File | Schedule | Status |
|---|---|---|---|
| Email Agent | email_agent.js | Event-driven + scheduled | PRODUCTION_READY |
| Finance Agent | finance_agent.js | Budget alert check on startup | PRODUCTION_READY |
| Routine Agent | routine_agent.js | Recurring task execution | PRODUCTION_READY |
| Reflection Agent | reflection_agent.js | Every 30 min via setInterval | PRODUCTION_READY |
| News Ingest | agent-system/news-ingest.js | 06:00 daily + 5 min after startup | PRODUCTION_READY |
| Wiki Consolidation | agent-system/wiki-reader.js | 03:00 daily | PRODUCTION_READY |
| Vault Health Check | agent-system/wiki-reader.js | Sundays 04:00 | PRODUCTION_READY |

---

### TIER 4 — Domain Agents (domain-agents.js)

Used in the main chat pipeline at server.js line 8601 for domain detection and specialist context injection into tool-use loop.

Defined domains: system, file, uni, finance, business, research, content, operations, admin, reflection

**Status: PARTIAL** — imported and used for domain detection + logging; specialist context injection may not be fully plumbed into the Claude tool-use call. Verify at runtime.

---

### TIER 5 — Mastra Agents (mastra_agents.js)

| Agent | Purpose | Status |
|---|---|---|
| apexAgent | Main conversational AI (replaces default Claude path if ready) | PARTIAL — deferred 5 min |
| emailAgent | Email operations via Mastra | PARTIAL |
| financeAgent | Finance tasks via Mastra | PARTIAL |
| routineAgent | Routine automation via Mastra | PARTIAL |
| researchAgent | Research + information gathering | PARTIAL |

**Integration:** `apexAgent` is checked in the main chat route — if initialized and not null, it handles the request instead of the default pipeline. Graceful fallback if not ready.

---

### TIER 6 — External Agent Library (agent-system/agent-library.js)

218 specialized agent specs stored in `11 Agents/Specifications/` in the Obsidian vault, covering 11 domains:
- academic (5), design (8), engineering (21), finance (5), game-development (18)
- marketing (37), paid-media (7), product (5), project-management (6)
- sales (9), spatial-computing (7), specialized (44), strategy (15), testing (8)

Loaded from Supabase on startup; GitHub sync if Supabase is empty.

**Status: PRODUCTION_READY** — these are invocable via `POST /api/agents/:slug`

---

## Agent Relationship Map

```
User → Chat → domain detection (domain-agents.js) → main Claude pipeline
                                                   ↗ Mastra apexAgent (if ready)
User → POST /api/tasks → checkPendingMasterTasks → orchestrator.js (8-agent pipeline)
User → POST /api/master/* → master-orchestrator.js helpers
User → POST /api/agents/:slug → agent-library.js → external agent spec
Event Bus → AGENT_STARTED/COMPLETED → services/init.js listeners → Slack + Notion
```

---

## Gaps

| Gap | Impact | Fix |
|---|---|---|
| domain-agents.js specialist context injection may be partial | LOW | Verify _domainAgent system prompt is injected into Claude call |
| agent-pipeline-hooks.js has no consumer | LOW | Wire to checkPendingMasterTasks() |
| AGENT_PROFILES (agents.js) never dispatched | LOW | Add role-based routing or remove file |
| master-orchestrator.js always uses Haiku regardless of complexity | MEDIUM | Pass complexity from plan to runAgentTeam spec |
| Event bus AGENT_STARTED/COMPLETED listeners in init.js — verify they fire | MEDIUM | Test by triggering one agent run |
