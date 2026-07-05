# 03 — Cognitive Runtime

**Date:** 2026-07-02  
**Evidence Source:** lib/cognitive-orchestrator.js, lib/intelligence/civilization-runtime.js, lib/cognitive/index.js, lib/attention/attention-engine.js, lib/goals/goal-graph.js, lib/intelligence/sie.js

---

## What "Cognitive Runtime" Means in APEX

The cognitive layer has two distinct operational modes:

1. **Per-request response shaping** — `lib/cognitive-orchestrator.js` operates on already-produced LLM output to classify intent and prepend acknowledgment strings
2. **Background civilization cycle** — `lib/intelligence/civilization-runtime.js` runs an 8-phase analysis loop every 6 hours

These are separate systems that do not call each other.

---

## cognitive-orchestrator.js — Response Shaping

**Critical clarification:** This module is NOT a pipeline orchestrator and does NOT control which agents run. It shapes the final text of LLM responses.

### Intent Classification

`classifyIntent(message)` uses regex + length rules, returns one of:

| INTENT enum | Rule |
|-------------|-----|
| `SIMPLE_QUERY` | Short message, no task verbs |
| `MULTI_STEP_TASK` | Contains task verbs + multi-step indicators |
| `TOOL_REQUIRED` | Contains tool-trigger patterns |
| `AMBIGUOUS` | Does not match above |

### Mode Classification

| MODE enum | Meaning |
|-----------|---------|
| `REFLEX` | Fast, no framing |
| `FRAMED` | Adds structured acknowledgment |
| `DEFERRED` | Adds "working on it" prefix |
| `STREAMED` | Streaming context |

### shape(response, intent, mode)

Prepends a mode-appropriate acknowledgment string to the LLM response text. No API calls. No DB access. Pure string manipulation on already-produced output.

```
Input:  LLM response text
Output: acknowledgment_prefix + response_text
```

---

## civilization-runtime.js — 8-Phase Background Tick

**File:** `lib/intelligence/civilization-runtime.js`  
**Default interval:** `DEFAULT_INTERVAL_MS = 6 hours`  
**Started at:** server.js listen callback (part of services/init.js cascade)

### Tick Lifecycle

```
_tick() called every 6h
    │
    ├── Phase 1: OBSERVE
    │       Query civilization health, active goals, recent events
    │
    ├── Phase 2: ANALYZE
    │       Compute health metrics, identify anomalies
    │
    ├── Phase 3: DELIBERATE  ◄─ Budget gate: $0.50/cycle
    │       LLM-assisted deliberation on findings
    │
    ├── Phase 4: PLAN        ◄─ Budget gate: included in $0.50
    │       Generate action recommendations
    │
    ├── Phase 5: EXECUTE
    │       Queue approved actions (does NOT auto-execute)
    │
    ├── Phase 6: LEARN
    │       Extract lessons from cycle outcomes
    │
    ├── Phase 7: HOUSEKEEPING
    │       Bulk-reject waiting_approval tasks older than 48h
    │       (prevents approval backlog accumulation)
    │
    └── Phase 8: UPDATE MEMORY
            Write cycle summary to civilization_cycle_log
```

### Budget Gate

Phases 3 and 4 are gated at $0.50 per cycle. If the budget check fails (over budget), phases 3 and 4 are skipped. Phases 5–8 still run.

### Failure Recovery

On `CRITICAL` failure during tick: schedules retry after **30 minutes** (not waiting for next 6h interval).

### Database Writes

- Every tick writes to `civilization_cycle_log` table regardless of outcome
- Phase 7 bulk-updates `agent_tasks` table (waiting_approval → rejected for >48h tasks)

### Exposed API Surface

```javascript
isRunning()      // boolean
getCycleCount()  // number of completed ticks
runOnce()        // trigger single tick immediately (for testing/admin)
```

`runOnce()` is called from server.js admin routes.

---

## lib/cognitive/index.js — 16 Cognitive Engines

**File:** `lib/cognitive/index.js`  
**Nature:** Barrel export of 16 named engines

### All 16 Engine Names (confirmed from file read)

| # | Engine Name | Domain |
|---|------------|--------|
| 1 | `retrievalPolicy` | Memory retrieval rules |
| 2 | `behaviorMod` | Behavior modification |
| 3 | `cognitivePolicy` | Policy management |
| 4 | `reasoningStrategy` | Reasoning approach selection |
| 5 | `planningStrategy` | Planning approach |
| 6 | `executionStrategy` | Execution approach |
| 7 | `autonomy` | Autonomy management |
| 8 | `influence` | Influence tracking |
| 9 | `retrievalEval` | Retrieval quality evaluation |
| 10 | `knowledgeDecay` | Knowledge freshness |
| 11 | `metaReasoning` | Reasoning about reasoning |
| 12 | `cognitivePerf` | Cognitive performance |
| 13 | `evolution` | System evolution |
| 14 | `orgIntelligence` | Organizational intelligence |
| 15 | `digitalTwin` | Digital twin modeling |
| 16 | `validation` | Validation framework |

**Consumers:** `lib/cognitive-orchestrator.js` (inferred), `lib/intelligence/*` (inferred)  
**Accessed via routes:** `routes/cognitive.js` (27 endpoints, all 16 accessible via `/api/cognitive/<engine>`)

---

## attention-engine.js — Per-Request Attention Scoring

**File:** `lib/attention/attention-engine.js`  
**Storage:** Pure in-memory — zero database

### 6-Dimension Weighted Sum

```
attention_score = 
  goalPriority      × 0.30 +   ← weight of active goals
  risk              × 0.25 +   ← constitutional risk level
  financialWeight   × 0.15 +   ← financial implication
  memoryRelevance   × 0.15 +   ← memory layer relevance
  urgency           × 0.10 +   ← temporal urgency
  cognitiveConfidence × 0.05   ← system confidence level
```

**All inputs come from `req` context** (set by civilization-kernel.js phases 1–7)

**Output:** `attentionScore` (0.0–1.0) set on `req` and in response header `X-APEX-Attention-Score`

No database reads at score time. Goal priority comes from in-memory goal-graph (loaded async at startup).

---

## goal-graph.js — Goal State Machine

**File:** `lib/goals/goal-graph.js`  
**Storage:** Single `goal_graph_state` row in Supabase (singleton pattern)

### Runtime State

- Primary state lives in **in-memory Maps** (loaded from DB at startup)
- `_load()` called async at module load — startup fire-and-forget
- If DB is unavailable at startup, goal graph starts empty

### scoreGoal(goalId, context)

- Computes priority score for a goal
- **Does NOT persist** — purely in-memory computation
- Score used by attention-engine for `goalPriority` dimension

### Goal Persistence Path

- Goal state written to `goal_graph_state` row via `_persist()` 
- `_persist()` called after mutations (addGoal, completeGoal, etc.)
- Single-row upsert — entire graph serialized as JSON

### Relationship to agent-system/goal-tracker.js

These are two distinct goal systems:
- `lib/goals/goal-graph.js` — civilization-level strategic goals, singleton DB row, in-memory Maps
- `agent-system/goal-tracker.js` — per-task goals, filesystem JSON files under `vault/System/Goals/`

They do NOT share state.

---

## sie.js — Strategic Intelligence Engine

**File:** `lib/intelligence/sie.js`  
**11 exported functions**

### Per-Request Brief (`_getSIEBriefing`)

Called lazily from `lib/memory/gateway.js` inside `getContext()`:

```javascript
const briefing = await _getSIEBriefing(sessionId)
```

**Cache:** 30 minutes per `sessionId`

### Executive Briefing Generation (`generateExecutiveBriefing`)

Full briefing triggered by admin routes or civilization cycle:

**7 parallel sources queried:**
1. Civilization health snapshot
2. Active opportunities (top by composite_score)
3. Recent agent task completions
4. Executive deliberation history
5. Memory layer health
6. Constitutional compliance score
7. SIE analyses table

Plus one **Haiku API call** for synthesis (`claude-haiku-4-5-20251001`).

**Cache:** 6 hours

### `_gatherIntelligence()`

9 parallel Supabase queries run simultaneously:
1. `civilization_health_snapshots`
2. `opportunities`
3. `apex_agent_runs` (recent)
4. `executive_deliberations`
5. `sie_analyses`
6. `sie_decisions`
7. `sie_recommendations`
8. `apex_lessons`
9. `cognitive_policy_settings`

### Database Writes

- `sie_recommendations` table — stores strategic recommendations
- `sie_analyses` table — stores analysis results
- `sie_decisions` table — stores decision records

---

## Cognitive Layer Data Flow

```
HTTP Request
    │
    ▼
civilization-kernel.js phases 3+4
    ├── goal-graph.js [in-memory, no DB]
    └── attention-engine.js [in-memory, weights goals+risk+etc]
        → sets X-APEX-Attention-Score header
    │
    ▼
Route handler (chat)
    │
    ▼
chat-context.js buildPrompt()
    └── gateway.getContext() → sie.js _getSIEBriefing() [30min cache]
        → "STRATEGIC INTELLIGENCE" block in prompt (max 400 chars)
    │
    ▼
models/runtime.execute() → LLM response
    │
    ▼
cognitive-orchestrator.js shape(response)
    ├── classifyIntent(userMessage) → SIMPLE_QUERY|MULTI_STEP_TASK|TOOL_REQUIRED|AMBIGUOUS
    ├── select MODE based on intent + context
    └── prepend acknowledgment string
    │
    ▼
Final response to client

[Background — every 6h]
civilization-runtime.js _tick()
    └── 8-phase pipeline including LLM deliberation
```
