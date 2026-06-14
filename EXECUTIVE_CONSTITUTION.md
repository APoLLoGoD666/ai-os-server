# EXECUTIVE CONSTITUTION
Generated: 2026-06-14 — Authority audit: who decides, who executes, who can override

---

## The Authority Problem

The reality audit found **7 independent layers** that can set or override model assignment between task receipt and first LLM call. These layers are not coordinated. They are not ordered by authority. They are sequentially applied, meaning the last layer wins — regardless of whether that layer has more authority than the first.

This is not a single government. It is 7 governments that happen to agree most of the time.

---

## Full Authority Map (in order of application)

| Order | Actor | File:Line | What It Decides | Can Override Previous? |
|---|---|---|---|---|
| 1 | Orchestrator `_classifyComplexity()` | `orchestrator.js:999–1014` | Base `ctx.agentModels` from hardcoded `ROUTING` table | Sets initial state |
| 2 | Dynamic Agent Selector | `orchestrator.js:1022–1027` | Per-stage escalation if `agentConfig.escalated` | Yes — overwrites keys |
| 3 | Adaptation Engine (model_tier) | `orchestrator.js:1036–1044` | Per-stage override if `conf >= 0.5` | Yes — overwrites keys |
| 4 | Adaptation Engine (routing/tier-bump) | `orchestrator.js:1051–1073` | All 3 model slots if `tierBump >= 1` and `conf >= 0.5` | Yes — overwrites all |
| 5 | Task-Router route type | `orchestrator.js:1142–1166` | May return early (executive/escalation) or set `_researchOnly` | Yes — can abort pipeline entirely |
| 6 | Cognitive Influence Pack | `orchestrator.js:1252–1256` | `model_override.escalate` → architect = SONNET | Yes — overwrites architect |
| 7 | Adaptive Router Controller | `orchestrator.js:1279–1281` | `runtimeControls.models` merged into `ctx.agentModels` | Yes — final merge, last writer wins |

Additionally, EA runtime (`lib/models/runtime/index.js:143`) overrides model if caller passes `tier` — tier wins over explicit `model`. And `lib/models/registry.js` is the sole owner of tier-to-model string mapping.

---

## Two Parallel Routing Tables

**Table A: Orchestrator ROUTING** (`orchestrator.js:54–58`)
```
simple:   { architect: HAIKU,  developer: HAIKU,  reviewer: HAIKU }
moderate: { architect: HAIKU,  developer: HAIKU,  reviewer: SONNET }
complex:  { architect: SONNET, developer: SONNET, reviewer: SONNET }
critical: { architect: SONNET, developer: SONNET, reviewer: OPUS }
```
Source: hardcoded constants in `orchestrator.js`. `orchestrator.js` never imports `registry.js`.

**Table B: EA Runtime TIER_ROUTING** (`lib/models/registry.js:20–27`)
```
simple:   claude-haiku-4-5-20251001
moderate: claude-sonnet-4-6
complex:  claude-sonnet-4-6   ← SAME AS MODERATE (no distinction)
critical: claude-opus-4-7
balanced: claude-sonnet-4-6
fast:     claude-haiku-4-5-20251001
```
Source: `lib/models/registry.js`. Comment: "Change only this map to swap models."

These two tables are not linked. They produce the same model IDs today but can drift silently. A model change requires updating two files.

---

## Who Decides?

### For code tasks (most common):
1. Task-router fires first → returns `agent_pipeline` + `complexity`
2. Orchestrator's own `_classifyComplexity()` fires **independently** and sets `ctx.agentModels` from its own ROUTING table
3. Task-router's complexity field is passed to `gateway.getContext()` for categorisation (`orchestrator.js:1176`) — not to model selection
4. Two independent complexity assessments exist with no reconciliation mechanism

**Answer: The orchestrator decides unilaterally for code tasks. Task-router complexity does not feed model selection.**

### For executive tasks:
1. Task-router detects `executive_runtime` pattern → calls `consultExecutive(entity, ...)`
2. Executive response returned directly — no pipeline runs
3. Executive entity uses `modelSelector.select('balanced')` → EA registry (Table B)

**Answer: Task-router routes to executive; executive uses EA tier system.**

### For deployment decisions (staged/critical):
1. Orchestrator ROUTING sets models at start
2. CTO gate fires after TESTER stage
3. CTO can `_fail()` (abort) — CTO cannot change which model runs; only blocks commit

**Answer: CTO can veto deployment but cannot redirect execution or change models.**

---

## Who Executes?

| Path | Execution Authority |
|---|---|
| Agent pipeline | `orchestrator.js:runAgentTeam()` — direct `_callClaude()` calls in each stage |
| Executive runtime | `lib/executive/entity.js:decide()` via `consultExecutive()` |
| Voice-chat | `server.js:8518` — direct `runtime.execute()` loop |
| Master orchestrator | `master-orchestrator.js` → calls `runAgentTeam()` |
| Scheduled tasks | `server.js:runSingleScheduleOnce()` → `buildAgentPlan()` → `runAgentTeam()` |
| Weekly crons | Individual inline functions in `server.js` → `runtime.execute()` directly |

**Orchestrator pipeline stages do NOT use `runtime.execute()`. They use `_callClaude()` directly (Anthropic SDK). This bypasses the EA runtime's circuit-breaker, retry logic, and telemetry emit for pipeline LLM calls.**

---

## Who Can Override?

| Actor | Override Power | Scope |
|---|---|---|
| Constitutional gate (`checkAntiGoals`) | Abort before any execution | Pipeline only; NOT voice or weekly crons |
| Task-router `founder_escalation` | Hard block — returns `{ held: true }` | All task-router-routed tasks |
| Task-router `executive_runtime` | Divert — no pipeline runs | Pattern-matched tasks only |
| CTO gate | Abort at commit stage | staged/critical pipeline tasks only |
| Adaptation engine (conf >= 0.5) | Override per-stage model assignment | Pipeline tasks in 8-stage orchestrator |
| Adaptive router controller | Final merge of model assignments | Pipeline tasks in 8-stage orchestrator |
| `BYPASS_DASHBOARD_AUTH` env var | Skip all API auth | All API routes when set |
| Voice-chat path | Has no override authority; is itself uncontrolled | Most-used path |

---

## Conflicting Authority: Real Cases

### Case 1: Adaptation says use SONNET, orchestrator set HAIKU

Adaptation engine (conf 0.7) recommends SONNET for ARCHITECT stage.
Orchestrator set HAIKU based on `simple` complexity.
**Resolution: Adaptation wins** — applied at `orchestrator.js:1043`, overwrites HAIKU with SONNET.
Authority: Adaptation engine has higher effective authority than initial classification for this stage.

### Case 2: Cognitive influence pack vs adaptive router controller

`ctx.influencePack.model_override.escalate = true` → `ctx.agentModels.architect = SONNET` at line 1252.
Adaptive router controller also computes models at line 1279 → merges `runtimeControls.models`.
**Resolution: Adaptive router controller wins** — it runs last (line 1279 > 1252), merges over the influence pack's override.
Authority: Whatever runs last wins. No declared hierarchy.

### Case 3: Task-router says `research_system`, orchestrator classifies as `moderate`

Task-router sets `spec._researchOnly = true`.
Orchestrator runs `_classifyComplexity()` independently, sets `ctx.agentModels` based on `moderate`.
Pipeline exits after RESEARCHER stage (`_researchOnly` check at `orchestrator.js:1431`).
Model selection from `_classifyComplexity` is applied even though only RESEARCHER runs.
**Resolution: Both run. Models are set for a full pipeline but only one stage fires.**
Authority: No conflict detected here — but unnecessary computation occurs.

---

## What is Constitutional?

Based on CONSTITUTION.md (Articles 1–6) and observed enforcement:

### Hard constitutional constraints (enforced in code):
1. Anti-goal CRITICAL severity → hard block (`orchestrator.js:962`) — **constitutional**
2. Escalation pattern keywords → hold, no execution (`task-router.js:59`) — **constitutional**
3. Autonomy LEVEL_0 or twin `do_not_deploy` → `_fail()` (`orchestrator.js:1397`) — **constitutional**
4. CTO rejection of staged/critical deployment → `_fail()` (`orchestrator.js:1568`) — **constitutional**

### Advisory only (not enforced at code level):
5. Constitution.md Articles 1–6 injected into ARCHITECT prompt — model-trust-only
6. Founder values injected into ARCHITECT prompt — model-trust-only
7. Governance evidence chain — recording only, never blocks
8. HIGH/MEDIUM anti-goal matches — `console.warn` only

### Not constitutional at all (no enforcement):
9. Voice-chat path — no constitutional check
10. Executive entity LLM calls — no constitutional gate
11. Weekly cron LLM calls — no constitutional gate

---

## Recommendation: Consolidate to One Authority Chain

The current system has seven authorities that can each write to `ctx.agentModels`. The correct architecture is a single authority chain with declared precedence:

```
1. Constitutional gate (hard block — highest authority, stops all)
2. Task-router route (fork decision — before model selection)
3. One complexity classifier (single source — orchestrator OR task-router, not both)
4. One model routing table (registry.js TIER_ROUTING — not orchestrator.js ROUTING)
5. Adaptation override (confidence-gated modification — documented exception)
6. Cognitive runtime (final merge — lowest priority)
```

The orchestrator's hardcoded `ROUTING` table should be replaced with a call to `registry.getModelForTier(complexity)`. This eliminates the second routing table and makes `registry.js` the declared single source of truth for model-to-tier mapping — matching its own comment ("Change only this map to swap models").

---

## Authority Answers

| Question | Answer |
|---|---|
| Who decides which model handles this task? | 7 layers, last writer wins. No declared hierarchy. |
| Who executes? | `orchestrator.js:runAgentTeam()` for pipeline; `server.js` directly for voice; `entity.js` for executives |
| Who can override? | CTO (deployment veto), constitutional gate (hard block), adaptation engine (model swap), adaptive router (final merge) |
| What is constitutional? | 4 hard blocks (anti-goal critical, escalation pattern, autonomy gate, CTO reject). Everything else is advisory. |
| Is there one government? | No. There are 7 model-assignment authorities, 2 routing tables, and 3 constitutional enforcement levels. |
| What should change? | Replace `orchestrator.js:ROUTING` with `registry.getModelForTier()`. Add constitutional gate to voice-chat path. Declare adaptation engine override as the one permitted exception. |
