# APEX AI OS — Integration Audit
**Date:** 2026-06-06  
**Scope:** Knowledge · Cognition · Autonomy · Orchestration layers  
**Commits audited:** 3436d7f · f1d32cb · c4d707f · a924ce2  
**Supersedes:** Integration Audit Phase 2 (2026-06-05)

---

## Executive Summary

**Readiness Score: 7.5 / 10**

The Knowledge and Cognition layers are fully wired and production-ready. The Autonomy layer (task-planner, execution-verifier, multi-agent-coordinator — branch feature/autonomy-layer) was implemented correctly but has **zero API exposure** — it cannot be invoked by any route and therefore provides no value in the running system. Two duplicate complexity-classification implementations exist and risk drifting. One dead import and one never-called function require cleanup.

---

## 1. Module Load Verification

All modules resolve without error. No missing dependencies, no broken require paths.

| Module | Path | Loads | Boot-Checked |
|--------|------|-------|-------------|
| wiki-reader | agent-system/wiki-reader.js | ✅ | ✗ |
| agent-registry | agent-system/agent-registry.js | ✅ | ✅ |
| agent-reputation | agent-system/agent-reputation.js | ✅ | ✗ |
| orchestrator | agent-system/orchestrator.js | ✅ | ✅ (circuit-breaker) |
| master-orchestrator | agent-system/master-orchestrator.js | ✅ | ✗ |
| episodic-memory | agent-system/episodic-memory.js | ✅ | ✅ |
| reflection-engine | agent-system/reflection-engine.js | ✅ | ✗ |
| task-planner | agent-system/task-planner.js | ✅ | ✗ |
| execution-verifier | agent-system/execution-verifier.js | ✅ | ✗ |
| multi-agent-coordinator | agent-system/multi-agent-coordinator.js | ✅ | ✗ |

Boot verification runs 8 seconds post-listen and checks 6 items: pipeline-hooks, agent-registry, vault, embed probe, orchestrator circuit-breaker, episodic-memory.

**Missing from boot check:** reflection-engine, task-planner, multi-agent-coordinator, execution-verifier.

---

## 2. Duplicate Functionality Audit

### CRITICAL — Complexity Classification (two independent implementations)

| Implementation | Location | Logic |
|---|---|---|
| `_classifyComplexity(spec)` | `orchestrator.js:91` | File count + step count thresholds + regex; 4-tier output |
| `estimateComplexity(specOrGoal)` | `task-planner.js:14` | Regex-only (no file/step count); same 4-tier output |

The comment in `task-planner.js:13` explicitly acknowledges this:
> `// Complexity tiers — mirrors orchestrator._classifyComplexity without importing it`

**Why it exists:** Avoiding a circular import chain (task-planner → orchestrator → wiki-reader → back). The avoidance is correct, but the duplication creates drift risk: if new `critical` or `complex` patterns are added to orchestrator, task-planner will silently diverge, causing multi-agent-coordinator to mis-tier tasks.

**Recommendation:** Extract both regex sets into a shared `lib/complexity-classifier.js` with no dependencies on either module. Both can import it without circularity.

### MODERATE — Inline _reflector vs reflection-engine.generateReflectionLesson()

| Implementation | Location | Called by |
|---|---|---|
| `_reflector()` | `orchestrator.js:722` | Every pipeline run via `setImmediate` |
| `generateReflectionLesson()` | `reflection-engine.js:203` | Weekly lesson consolidation cron only |

`_reflector()` makes its own Haiku call with a simple pipeline summary. It does **not** use `reflection-engine.generateReflectionLesson()`, which produces richer synthesis by incorporating recent failure patterns and existing lessons. Every pipeline run generates a lower-quality lesson than the available tooling supports.

**Recommendation:** Replace the inline `_callClaude` inside `_reflector()` with a call to `reflection-engine.generateReflectionLesson()`, passing the existing `spec`, `agentLogs`, `success`, and the basic lesson as `existingLesson`.

### NOT A DUPLICATE — scoreRisk vs selectTier

Complementary purposes: `scoreRisk()` returns a 0–1 float; `selectTier()` maps risk + historical success rate to a routing tier. They compose correctly in multi-agent-coordinator.

### NOT A DUPLICATE — agent-pipeline-hooks in orchestrator vs services/pipelines/agent-pipeline-hooks.js

Previous audit (2026-06-05) flagged GAP-01 as agent-pipeline-hooks having no consumer. **This is now resolved:** orchestrator.js lines 938, 944, 1067, 1087 call `_hooks.onPipelineStart/Complete/Failed` via `setImmediate`. The hooks are wired.

---

## 3. Import Resolution Audit

All static imports resolve. All dynamic (lazy) requires are guarded with try/catch.

### Dead Import — CONFIRMED

**File:** `agent-system/multi-agent-coordinator.js:6`
```js
const { summarizeExecution } = require('./execution-verifier');
```
`summarizeExecution` is imported but **never called** inside multi-agent-coordinator.js. It is a phantom dependency that inflates the module's apparent surface area.

**Fix:** Remove line 6. `execution-verifier` is still useful directly; remove only this import.

### Unused Export — CONFIRMED

**Function:** `agent-reputation.recordDomainAgentRun(agentId, success, durationMs)`  
**Exported from:** `agent-system/agent-reputation.js:132`  
**Called from:** Nowhere in the codebase.

Domain agents (system, file, uni, finance, business) run successfully, but their performance is never recorded. `getDomainAgentStats()` always returns `{ total: 0, successRate: null }`.

**Fix:** Call `_reputation.recordDomainAgentRun(agentId, success, durationMs)` at the end of each domain agent handler in `domain-agents.js`.

### Unnecessary Module-Level Variable

**File:** `agent-system/wiki-reader.js:5`
```js
let _anthropic;
```
Declared at module scope, only assigned inside `consolidateWiki()`. Minor hygiene issue, no functional impact.

---

## 4. Route and API Audit

### Exposed and Functional

| Route | Module | Layer |
|---|---|---|
| `GET /api/intelligence/lessons` | routes/intelligence.js | Knowledge/Learning |
| `GET /api/intelligence/agent-runs` | routes/intelligence.js | Execution |
| `GET /api/intelligence/cost-summary` | routes/intelligence.js | Execution |
| `GET /api/intelligence/system-status` | routes/intelligence.js | All layers |
| `GET /api/intelligence/agent-performance` | routes/intelligence.js | Execution |
| `GET /api/intelligence/performance` | routes/intelligence.js | Cognition/Latency |
| `GET /api/intelligence/self-check` | routes/intelligence.js | Health |
| `GET /api/cognition/performance` | server.js:10845 | Cognition |
| `GET /api/system/cognition` | server.js:10840 | Cognition |
| `GET /api/system/cognition/threads` | server.js:10880 | Cognition |
| `GET /api/system/arbitration` | server.js:10886 | Cognition |

### NOT Exposed — Autonomy Layer (CRITICAL GAP)

`task-planner.js` — No route calls `decomposeGoal()`, `estimateComplexity()`, or `planToSpecs()`.  
`execution-verifier.js` — No route calls `summarizeExecution()`, `verifyOutput()`, or `classifyFailure()`.  
`multi-agent-coordinator.js` — No route calls `assignWork()` or `runParallel()`.

The entire Autonomy Layer from branch `feature/autonomy-layer` (commit f1d32cb) is implemented but has **no integration point** with the running server. It is dead code from the runtime's perspective.

The only cross-module use of reputation data in the pipeline is `agent-reputation.shouldPreEscalate()` called inside orchestrator.js setup — this is working correctly.

---

## 5. Startup Sequence Audit

```
server.listen(PORT, callback)
  ├── setImmediate → services/init.js (Notion + Slack integration layer)
  ├── setImmediate → pgvector extension + match_documents SQL function
  └── setTimeout(8000) → Integration verification:
        1. pipeline-hooks: all 3 methods present       ✅
        2. agent-registry: getRegistrySummary()        ✅
        3. vault path: OBSIDIAN_VAULT_PATH exists      ✅
        4. embed probe: embedText('startup probe')     ✅
        5. orchestrator: circuitBreaker.open check     ✅
        6. episodic-memory: episodeCount()             ✅
```

**Crons active post-startup:**
- Every 30 min: `reflection_check` via cron-logger
- Daily 03:00: `wiki consolidation`
- Weekly Sunday 03:00: `lesson_consolidation` (reflection-engine + obsidian-memory)
- Daily 04:00: `vault_health` (wiki-reader.checkVaultHealth)

**Missing from boot verification:** reflection-engine, task-planner, multi-agent-coordinator, execution-verifier. Recommend adding reflection-engine check since it runs weekly crons.

---

## 6. Missing Integrations

| Missing Integration | Severity | Description |
|---|---|---|
| Autonomy layer has no API routes | **HIGH** | task-planner, execution-verifier, multi-agent-coordinator are unreachable |
| `_reflector()` bypasses reflection-engine | **MEDIUM** | Per-run lesson quality lower than achievable |
| `agent-registry` not consulted by orchestrator | **LOW** | Registry is metadata-only; pipeline order hardcoded (not a bug, but registry has no runtime influence) |
| `recordDomainAgentRun()` never called | **LOW** | Domain agent performance invisible to reputation system |
| reflection-engine boot verification | **LOW** | Weekly cron failure would be silent until logs checked |

---

## 7. Circular Dependency Check

Full import trace — no cycles detected:

```
orchestrator.js
  ├── obsidian-memory.js         [leaf]
  ├── agent-pipeline-hooks.js    [leaf — external integrations]
  ├── agent-reputation.js        [leaf — Supabase only]
  ├── episodic-memory.js         [leaf — filesystem only]
  └── (lazy) wiki-reader.js
        ├── obsidian-client.js   [leaf]
        ├── obsidian-memory.js   [leaf]
        └── reflection-engine.js
              └── obsidian-memory.js [leaf]

multi-agent-coordinator.js
  ├── task-planner.js            [leaf — Anthropic SDK only]
  ├── execution-verifier.js      [leaf — node stdlib only]
  └── (lazy) orchestrator.js     ← orchestrator does NOT import coordinator ✓

master-orchestrator.js
  └── obsidian-memory.js         [leaf]

agent-registry.js                [leaf — no imports]
agent-reputation.js              [leaf — Supabase only]
```

**Result: ZERO circular dependencies.**

---

## 8. Risk Assessment

| Risk | Level | File(s) |
|---|---|---|
| Autonomy layer unreachable in production | **HIGH** | server.js (missing routes), multi-agent-coordinator.js |
| Duplicate complexity regex — drift risk | **MEDIUM** | orchestrator.js:91, task-planner.js:14 |
| Orchestrator bypasses reflection-engine | **MEDIUM** | orchestrator.js:722 |
| `recordDomainAgentRun()` uncalled | **LOW** | domain-agents.js, agent-reputation.js |
| reflection-engine not boot-checked | **LOW** | server.js (boot block) |
| Dead import in coordinator | **LOW** | multi-agent-coordinator.js:6 |

---

## 9. Readiness Score: 7.5 / 10

| Layer | Score | Notes |
|---|---|---|
| Knowledge (wiki-reader, langchain-rag, obsidian-memory) | 9/10 | Fully integrated into orchestrator context and vault health crons |
| Cognition (episodic-memory, reflection-engine) | 9/10 | Episodic live in production pipeline; reflection-engine in weekly cron; per-run synthesis underutilised |
| Autonomy (task-planner, coordinator, verifier) | 4/10 | Correctly implemented, zero runtime exposure — effectively inert |
| Orchestration (orchestrator, master-orchestrator) | 8/10 | Solid pipeline; master-orchestrator standalone from autonomy layer |
| Reflection/Learning (crons, lesson consolidation) | 8/10 | Weekly consolidation correct; per-run quality gap |
| **Overall** | **7.5 / 10** | Blocked from 9+ by autonomy layer missing routes and reflection depth |

---

## 10. Files Requiring Follow-Up

| Priority | File | Change Required |
|---|---|---|
| P1 | `server.js` | Add `POST /api/autonomy/assign` route calling `multi-agent-coordinator.assignWork()` |
| P1 | `server.js` | Add `POST /api/autonomy/plan` route calling `task-planner.decomposeGoal()` (simulate-safe) |
| P2 | `agent-system/orchestrator.js:722` | Replace inline Haiku call in `_reflector()` with `reflection-engine.generateReflectionLesson()` |
| P2 | `agent-system/multi-agent-coordinator.js:6` | Remove dead `summarizeExecution` import |
| P3 | `agent-system/domain-agents.js` | Wire `agent-reputation.recordDomainAgentRun()` after each agent handler |
| P3 | `server.js` (boot block) | Add `reflection-engine` load check to boot verification |
| P4 | `agent-system/task-planner.js:14` + `orchestrator.js:91` | Extract shared `lib/complexity-classifier.js` to eliminate drift |
| P4 | `agent-system/wiki-reader.js:5` | Move `_anthropic` declaration inside `consolidateWiki()` |
