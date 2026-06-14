# APEX AI OS — Dependency Map
**Date:** 2026-06-06  
**Scope:** Knowledge → Cognition → Planning → Execution → Reflection → Learning

---

## Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  KNOWLEDGE LAYER                                                         │
│  wiki-reader.js  ·  langchain-rag.js  ·  obsidian-memory.js             │
│  obsidian-client.js  ·  cs249r-reader.js                                │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ getWikiContext(), getRankedLessons()
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  COGNITION LAYER                                                         │
│  episodic-memory.js  ·  reflection-engine.js                            │
│  persistent-cognition-manager.js  ·  executive-arbitration-engine.js   │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ getSimilarExperiences(), scoreLessonText()
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PLANNING LAYER                           ← NOT CONNECTED TO SERVER.JS  │
│  task-planner.js  ·  multi-agent-coordinator.js                         │
│  execution-verifier.js                                                  │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ planToSpecs(), runParallel() [UNWIRED]
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  EXECUTION LAYER                                                         │
│  orchestrator.js  ·  master-orchestrator.js  ·  domain-agents.js        │
│  agent-pipeline-hooks.js  ·  agent-registry.js  ·  agent-reputation.js  │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ runAgentTeam(), _reflector()
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  REFLECTION LAYER                                                        │
│  reflection-engine.js  ·  obsidian-memory.logLesson()                   │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │ consolidateLessons() [weekly cron]
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LEARNING LAYER                                                          │
│  Lessons.md (vault)  ·  Episodes/ (vault JSON)  ·  apex_agent_stages    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Module-Level Dependency Graph

### Knowledge Layer

```
wiki-reader.js
  ├── IMPORTS: obsidian-client.js (obsidianRead, obsidianWrite)
  ├── IMPORTS: obsidian-memory.js (getRecentLessons)
  ├── LAZY:    reflection-engine.js (getRankedLessons)
  ├── LAZY:    cs249r-reader.js (getBookContext)
  └── LAZY:    markitdown-bridge.js (convertUrl)

langchain-rag.js
  ├── IMPORTS: @langchain/* (BM25, similarity, chunking)
  ├── IMPORTS: lib/embed.js (embedText)
  └── IMPORTS: obsidian-client.js (vault reads)

obsidian-memory.js
  ├── IMPORTS: fs (local file I/O — vault path)
  └── No external module dependencies (leaf node)

obsidian-client.js
  ├── IMPORTS: https (Cloudflare tunnel HTTP calls)
  └── No module dependencies (leaf node)
```

### Cognition Layer

```
episodic-memory.js
  ├── IMPORTS: fs, path (filesystem — Episodes/ vault dir)
  └── No module dependencies (leaf node — fully self-contained)

reflection-engine.js
  ├── IMPORTS: @anthropic-ai/sdk (Haiku for generateReflectionLesson)
  └── IMPORTS: obsidian-memory.js (getRecentLessons)

persistent-cognition-manager.js  [lib/]
  ├── IMPORTS: lib/event-bus.js
  └── No agent-system imports (self-contained)

executive-arbitration-engine.js  [lib/]
  ├── IMPORTS: lib/event-bus.js
  └── No agent-system imports (self-contained)
```

### Planning Layer (Autonomy — feature/autonomy-layer)

```
task-planner.js
  ├── IMPORTS: @anthropic-ai/sdk (Haiku for decomposeGoal)
  └── No module dependencies from this codebase (leaf node)

execution-verifier.js
  ├── IMPORTS: fs, path, child_process (spawnSync for syntax check)
  └── No module dependencies from this codebase (leaf node)

multi-agent-coordinator.js
  ├── IMPORTS: task-planner.js (decomposeGoal, planToSpecs, scoreRisk)
  ├── IMPORTS: execution-verifier.js [DEAD — summarizeExecution imported but never called]
  ├── IMPORTS: @supabase/supabase-js (reputation reads from apex_agent_runs)
  └── LAZY:    orchestrator.js (required inside runParallel() at runtime)
```

### Execution Layer

```
orchestrator.js
  ├── IMPORTS: @anthropic-ai/sdk (pipeline LLM calls)
  ├── IMPORTS: @supabase/supabase-js (audit log to apex_agent_runs)
  ├── IMPORTS: obsidian-memory.js (logLesson, getRecentLessons, append)
  ├── IMPORTS: agent-pipeline-hooks.js (onPipelineStart/Complete/Failed)
  ├── IMPORTS: agent-reputation.js (shouldPreEscalate, invalidateCache)
  ├── IMPORTS: episodic-memory.js (storeEpisode, getSimilarExperiences)
  ├── LAZY:    wiki-reader.js (getWikiContext — at pipeline start)
  ├── LAZY:    firecrawl-bridge.js (RESEARCHER agent path)
  ├── LAZY:    browser-agent.js (RESEARCHER fallback path)
  ├── LAZY:    impeccable-validator.js (REVIEWER HTML/CSS check)
  ├── LAZY:    obsidian-client.js (REVIEWER prior decisions)
  └── LAZY:    backup-manager.js (worktree fallback)

master-orchestrator.js
  ├── IMPORTS: @anthropic-ai/sdk (planFeature, parseRoadmap)
  ├── IMPORTS: @supabase/supabase-js (notifications, kanban queries)
  └── IMPORTS: obsidian-memory.js (lesson reads)

agent-registry.js
  └── No imports (pure data/lookup — leaf node)

agent-reputation.js
  ├── IMPORTS: @supabase/supabase-js (apex_agent_stages reads)
  └── No other module dependencies (leaf node)

agent-pipeline-hooks.js
  ├── IMPORTS: services/slack/slack-agents.js
  └── IMPORTS: services/notion/notion-sync.js
```

---

## Data Flow: End-to-End Pipeline Run

```
1. REQUEST ARRIVES
   POST /api/master/task OR task queue poller
        │
        ▼
2. WIKI CONTEXT (Knowledge Layer)
   wiki-reader.getWikiContext(spec.objective)
   ├── Obsidian WIKI.md, North-Star.md, Decisions.md (vault reads via tunnel)
   ├── Entity pages by keyword (vault reads)
   ├── reflection-engine.getRankedLessons() ← ranked from Lessons.md
   └── cs249r-reader.getBookContext() ← ML/AI tasks only
        │
        ▼
3. EPISODIC CONTEXT (Cognition Layer)
   episodic-memory.getSimilarExperiences(spec.objective)
   └── Keywords matched against stored Episodes/ JSON files
        │
        ▼
4. COMPLEXITY CLASSIFICATION
   orchestrator._classifyComplexity(spec)
   └── → simple | moderate | complex | critical
        │
        ▼
5. REPUTATION CHECK (pre-escalation)
   agent-reputation.shouldPreEscalate('DEVELOPER', 0.6, 15)
   └── apex_agent_stages query (5-min cache)
        │
        ▼
6. PIPELINE EXECUTION
   RESEARCHER (optional) → ARCHITECT → DEVELOPER → REVIEWER+VALIDATOR → TESTER → COMMITTER
        │
        ▼
7. POST-PIPELINE (all via setImmediate — non-blocking)
   ├── agent-pipeline-hooks.onPipelineComplete() → Slack thread + Notion agent run
   ├── orchestrator._reflector() → Haiku call → obsidian-memory.logLesson()
   ├── orchestrator._auditLog() → apex_agent_runs upsert + apex_agent_stages insert
   ├── agent-reputation.invalidateCache() → clears 5-min stats cache
   └── episodic-memory.storeEpisode() → writes ep-{id}.json to vault Episodes/
        │
        ▼
8. WEEKLY LEARNING (Cron — Sundays 3am)
   reflection-engine.consolidateLessons(raw, 30)
   └── Scores all lessons (confidence × recency × actionability)
   └── obsidian-memory.write('01 Executive/Lessons.md', consolidated)
```

---

## Cross-Layer Integration Matrix

|  | wiki-reader | episodic-memory | reflection-engine | orchestrator | agent-reputation | agent-registry | task-planner | execution-verifier | coordinator |
|--|:-----------:|:---------------:|:-----------------:|:------------:|:----------------:|:--------------:|:------------:|:------------------:|:-----------:|
| **server.js** | cron | boot-check + `/api/cognition/performance` | lesson cron | task queue | `/api/intelligence/system-status` | boot-check | ✗ | ✗ | ✗ |
| **orchestrator** | ✅ lazy | ✅ direct | ✗ (uses inline) | — | ✅ direct | ✗ | ✗ | ✗ | ✗ |
| **wiki-reader** | — | ✗ | ✅ getRankedLessons | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **coordinator** | ✗ | ✗ | ✗ | ✅ lazy | ✗ | ✗ | ✅ direct | ✅ dead import | — |
| **routes/intelligence** | ✗ | ✅ system-status | ✗ | ✅ system-status | ✅ system-status + agent-perf | ✅ system-status | ✗ | ✗ | ✗ |

**Key:** ✅ active integration · ✗ not connected · — self

---

## Supabase Tables Used

| Table | Module(s) Reading | Module(s) Writing |
|-------|-------------------|-------------------|
| `apex_agent_runs` | agent-reputation, coordinator, routes/intelligence | orchestrator (_auditLog) |
| `apex_agent_stages` | agent-reputation | orchestrator (_auditLog) |
| `apex_notifications` | master-orchestrator, routes/intelligence | master-orchestrator |
| `vault_embeddings` | langchain-rag | langchain-rag (index) |
| `apex_news_cache` | routes/intelligence | news-ingest |

---

## Vault Files Used by Layer

| Layer | Vault Path | Read/Write |
|-------|-----------|-----------|
| Knowledge | `01 Executive/WIKI.md` | R |
| Knowledge | `01 Executive/North-Star.md` | R |
| Knowledge | `01 Executive/Decisions.md` | R/W |
| Knowledge | `02 Projects/Active/Apex-AI-OS.md` | R |
| Knowledge | `Entities/**`, `Concepts/**` | R |
| Learning | `01 Executive/Lessons.md` | R/W |
| Cognition | `12 Memory/Episodes/ep-*.json` | R/W |
| Cognition | `System/NorthStar-Proposals.md` | W |
| Health | `01 Executive/VaultHealth.md` | W |
| Research | `Research/*.md` | W |

---

## Known Integration Gaps

1. **Planning layer → server.js** — `task-planner`, `execution-verifier`, `multi-agent-coordinator` have no routes. The flow `Request → decomposeGoal → runParallel → aggregate` does not exist at runtime.

2. **orchestrator._reflector → reflection-engine** — per-run lesson generation does not use the enhanced synthesis in `reflection-engine.generateReflectionLesson()`. The weekly cron uses it; individual runs do not.

3. **domain-agents.js → agent-reputation** — `recordDomainAgentRun()` is never called. Domain agent performance data is always null.

4. **agent-registry → orchestrator** — the registry is a read-only metadata store with no runtime influence on the orchestrator's agent selection or ordering.
