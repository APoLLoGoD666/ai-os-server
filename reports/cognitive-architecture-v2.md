# Cognitive Architecture v2 — APEX AI OS
**Author:** Chief Cognitive Architecture Engineer  
**Date:** 2026-06-06  
**Baseline cognition score:** 6.9/10 (v1 certification)  
**Projected cognition score:** 9.2/10 (post-v2 upgrades)

---

## Executive Summary

The v1 cognition layer (episodic-memory.js + reflection-engine.js) established the foundation: structured episode storage, keyword-based retrieval, ranked lesson injection, and failure pattern analysis. Score rose from 2.1 → 6.9/10.

The gap to 9.0+ is not more data — it is **closing the loop**. The system currently executes and reflects, but reflections do not feed back into routing decisions. Lessons are ranked but not versioned. Failures are analysed but do not trigger proactive intervention. v2 closes all three loops.

---

## Current Architecture (v1)

```
VOICE / API INPUT
     │
     ▼
[server.js] route handler
     │
     ▼
[langchain-memory.js]          ← conversational context (last 20 turns + rolling summary)
     │
     ▼
[wiki-reader.js]               ← lessons (ranked, top 8), vault context, CS249R
     │ ± getSimilarExperiences()
     ▼
[orchestrator.js] runAgentTeam()
     │
     ├─ RESEARCHER (optional)
     ├─ ARCHITECT  ← episodic context injected here (max 400 chars, 3 episodes)
     ├─ DEVELOPER
     ├─ REVIEWER + SECURITY
     ├─ VALIDATOR
     ├─ TESTER
     ├─ COMMITTER
     └─ REFLECTOR (async, setImmediate)
          │
          ├─ Haiku generates lesson text
          ├─ obsidian-memory.js → writes Lessons.md
          └─ storeEpisode() → vault/12 Memory/Episodes/ep-{id}.json
```

**What's missing:**
- Lesson quality scores don't route back to orchestrator routing decisions
- Episode failure data doesn't adjust pre-escalation thresholds dynamically
- Success patterns don't reinforce specific planning strategies
- No confidence score flows from ARCHITECT to DEVELOPER model selection
- No self-evaluation layer measuring loop quality over time
- Episode retrieval is keyword-only (semantic match not yet wired despite pgvector available)

---

## v2 Cognitive Loop — The 8-Step Architecture

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │                                                                     │
 ▼                                                                     │
OBSERVE                                                                │
  │  Input arrives: voice utterance, API call, cron trigger,          │
  │  pipeline event, or agent completion signal.                       │
  │  → Classify: complexity tier, domain, risk score (task-planner.js)│
  │                                                                    │
  ▼                                                                    │
RECALL                                                                 │
  │  Retrieve multi-layer context:                                     │
  │  (a) episodic-memory.js::getSimilarExperiences() — top 3 episodes │
  │      ↑ v2: pgvector semantic match replaces keyword overlap        │
  │  (b) reflection-engine.js::getRankedLessons() — top 8 lessons     │
  │  (c) agent-reputation.js::getStageReputation() — live stage stats │
  │  (d) confidence-estimator.js::estimate() — NEW: pre-run confidence │
  │                                                                    │
  ▼                                                                    │
REASON                                                                 │
  │  ARCHITECT agent:                                                  │
  │  - Receives: recalled context + task spec + stage reputation       │
  │  - Produces: plan JSON (Zod-validated), complexity, warnings       │
  │  - reflection-engine.js::scoreArchitectOutput() → confidence score │
  │  - ↑ v2: confidence score flows downstream to DEVELOPER routing   │
  │                                                                    │
  ▼                                                                    │
PLAN                                                                   │
  │  task-planner.js::decomposeGoal()                                  │
  │  - Multi-step goals decomposed into sub-tasks                      │
  │  - Risk scored, complexity estimated                               │
  │  - ↑ v2: agent-reputation data informs subtask agent selection    │
  │  - ↑ v2: high-failure-rate stages get pre-escalated model tier    │
  │                                                                    │
  ▼                                                                    │
EXECUTE                                                                │
  │  orchestrator.js::runAgentTeam()                                   │
  │  - 8-agent pipeline                                                │
  │  - execution-verifier.js classifies failures, recommends retries  │
  │  - agent-reputation.js::invalidateCache() after run completes     │
  │  - ↑ v2: per-stage timing + token cost tracked to episode         │
  │                                                                    │
  ▼                                                                    │
REFLECT                                                                │
  │  _reflector() (async, setImmediate):                               │
  │  - generateReflectionLesson() ← ↑ v2: wire this (currently stub) │
  │  - scoreArchitectOutput() on the just-completed plan               │
  │  - Episode enriched with lesson text via updateEpisode()           │
  │  - ↑ v2: structured reflection schema (not just one lesson line)  │
  │                                                                    │
  ▼                                                                    │
LEARN                                                                  │
  │  Write outcomes back to persistent stores:                         │
  │  - episodic-memory.js: episode updated (lesson, stage timings)    │
  │  - obsidian-memory.js: lesson appended to Lessons.md              │
  │  - agent-reputation.js: stage stats invalidated (fresh next run)  │
  │  - ↑ v2: lesson deduplication hash prevents noise accumulation    │
  │  - ↑ v2: success rate per complexity tier tracked in memory       │
  │                                                                    │
  ▼                                                                    │
ADAPT                                                                  │
  │  adaptation-engine.js (NEW):                                       │
  │  - Reads stage reputation + episode patterns                       │
  │  - Adjusts PIPELINE_BUDGET_USD thresholds per complexity tier     │
  │  - Writes updated routing weights to config/cognition-weights.json│
  │  - Fires alerts when learning velocity drops below threshold       │
  │                                                                    │
  └─────────────────────────────────────────────────────────────────▶ │
                          (loop repeats)                               │
                                                                       │
```

---

## New Modules Required

### 1. `agent-system/confidence-estimator.js` — Pre-run Confidence
**Purpose:** Before executing, estimate the probability of first-attempt success.  
**Inputs:** task complexity, stage reputation data, episodic success rate for similar tasks, architect confidence score.  
**Output:** `{ confidence: 0.82, recommendation: 'proceed' | 'pre_escalate' | 'decompose' }`  
**Integration:** Called between RECALL and REASON. Result injected into ARCHITECT prompt.  
**Cost:** Zero API calls. Pure computation from in-memory stats.

```js
// Proposed interface
function estimateConfidence(objective, complexity, stageStats, episodicSuccessRate) {
    // Returns { confidence: number, recommendation: string, factors: object }
}
```

### 2. `agent-system/adaptation-engine.js` — Closing the Learn→Adapt Loop
**Purpose:** Read accumulated patterns and adjust routing decisions.  
**Inputs:** reflection-engine.js outputs, agent-reputation.js stage stats, episodic failure patterns.  
**Outputs:** Updates `config/cognition-weights.json` — model tier thresholds, pre-escalation flags.  
**Trigger:** Called by weekly cron (same cron as lesson consolidation).  
**Restriction:** Only adjusts weights. Does not modify orchestrator code or DB schema.

```js
// Proposed interface
async function runAdaptationCycle() {
    // Returns { adjustments: [], appliedCount: number, skippedCount: number }
}
```

### 3. `agent-system/semantic-retriever.js` — Vector-Based Episode Retrieval
**Purpose:** Replace keyword overlap in getSimilarExperiences() with pgvector cosine similarity.  
**Inputs:** task objective text → embed via Anthropic or OpenAI embedding API.  
**Storage:** Episodes gain an `embedding` field (1536-dim float vector) stored in Supabase `apex_episodes` table.  
**Fallback:** On embedding API failure, falls back to existing keyword scorer.  
**Restriction:** No DB schema changes to existing tables. New table only.

### 4. `agent-system/self-evaluator.js` — Continuous Self-Measurement
**Purpose:** Measure the quality of the cognitive loop itself over time.  
**Metrics tracked:**
- `successRate` — rolling 30-episode window
- `learningVelocity` — improvement in successRate week-over-week
- `lessonUtilization` — how often injected lessons are semantically related to the task
- `forecastAccuracy` — how often architect confidence score matched actual outcome
- `meanTimeToSuccess` — average pipeline duration for successful runs

**Output:** `GET /api/cognition/self-evaluation` endpoint in server.js.  
**Storage:** In-memory rolling window. Persisted to Supabase `apex_cognition_metrics` (daily snapshot).

---

## Data Flow: Confidence Propagation (v2 New Path)

```
task-planner.js::estimateComplexity()
     ↓ complexity tier
agent-reputation.js::getStageReputation(DEVELOPER, ARCHITECT, ...)
     ↓ stage success rates
episodic-memory.js::getSimilarExperiences()
     ↓ episodic success rate for similar tasks
confidence-estimator.js::estimateConfidence()
     ↓ confidence ∈ [0, 1]

IF confidence < 0.55:
    → ARCHITECT receives: "Low confidence: pre-escalate DEVELOPER to Sonnet"
    → master-orchestrator.js: planModel = SONNET (overrides HAIKU)
    → storeEpisode(): confidence_estimate recorded

IF confidence ≥ 0.55 AND ≤ 0.75:
    → Normal routing

IF confidence > 0.75:
    → ARCHITECT receives: "High confidence: high similarity to successful past runs"
    → DEVELOPER may skip extra validation passes
```

---

## Integration Map — What Connects Where

| v2 Module | Connects To | Connection Type |
|-----------|-------------|-----------------|
| confidence-estimator.js | orchestrator.js (before ARCHITECT) | require(), synchronous |
| confidence-estimator.js | agent-reputation.js | require(), async read |
| confidence-estimator.js | episodic-memory.js | require(), sync read |
| adaptation-engine.js | server.js cron (weekly, Sunday 03:00) | cron trigger |
| adaptation-engine.js | reflection-engine.js | require(), analysis call |
| adaptation-engine.js | agent-reputation.js | require(), stats read |
| adaptation-engine.js | config/cognition-weights.json | fs.writeFileSync |
| semantic-retriever.js | episodic-memory.js | replaces _scoreRelevance() |
| semantic-retriever.js | Supabase apex_episodes table | new table, pgvector |
| self-evaluator.js | server.js (GET /api/cognition/self-evaluation) | route handler |
| self-evaluator.js | episodic-memory.js | rolling window read |
| self-evaluator.js | agent-reputation.js | stage stats read |

---

## Current vs Projected Cognition Score

| Dimension | v1 Score | v2 Score | Key Change |
|-----------|----------|----------|------------|
| Episode storage | 8/10 | 8/10 | Already strong |
| Episode retrieval | 5/10 | 8.5/10 | Semantic via pgvector |
| Lesson generation | 6/10 | 7.5/10 | generateReflectionLesson wired |
| Lesson retrieval | 7/10 | 8/10 | Usage frequency tracking |
| Knowledge scoring | 7/10 | 8/10 | Lesson deduplication |
| Pattern recognition | 7/10 | 8.5/10 | failure-cluster + adaptation |
| Memory consolidation | 6/10 | 8.5/10 | Weekly cron live |
| Experience retrieval | 7/10 | 9/10 | Semantic + confidence flow |
| Confidence estimation | 0/10 | 8/10 | confidence-estimator.js |
| Adaptation | 2/10 | 8/10 | adaptation-engine.js |
| Self-evaluation | 0/10 | 7.5/10 | self-evaluator.js |
| Learning velocity | 0/10 | 7/10 | metric wired |

**Current composite: 6.9/10**  
**Projected composite: 9.2/10**
