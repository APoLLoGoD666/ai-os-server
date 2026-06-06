# Self-Evaluator — Engineering Report
**Date:** 2026-06-06  
**Module:** `agent-system/self-evaluator.js`  
**Engineer:** Chief Cognitive Evaluation Engineer

---

## What Was Built

`self-evaluator.js` gives APEX the ability to score its own intelligence objectively using only existing telemetry — no model calls, no new infrastructure, no new database tables.

---

## Integration Map

```
self-evaluator.js
    │
    ├─ episodic-memory.js
    │    getSuccessRate(50)          → executionQuality (sr)
    │    getSimilarExperiences('')   → allEpisodes for reflection analysis
    │    getFailureEpisodes(40)      → failure pool for stage analysis
    │    episodeCount()              → lessonUsefulness (richness)
    │
    ├─ reflection-engine.js
    │    analyzeSuccesses(succEps)   → executionQuality (singleAttemptRate)
    │    analyzeFailures(failEps)    → executionQuality (topStage penalty)
    │
    ├─ adaptation-engine.js
    │    getSnapshot()              → planningQuality (planningAdapts penalty)
    │                               → lessonUsefulness (avgConf, appRate)
    │                               → adaptationEffectiveness (activeRatio, typeDiversity)
    │
    ├─ autonomy-metrics.js
    │    retryRate(50)              → (metadata only — not used in dimension scoring)
    │    recoveryRate(30)           → recoveryEffectiveness (primary signal)
    │
    ├─ goal-tracker.js
    │    getStats()                 → planningQuality (completionRate, executionRatio)
    │                               → recoveryEffectiveness (blockedRate)
    │
    └─ execution-verifier.js
         classifyFailure(reason)   → generateRunEvaluation (lessonScore per run)
```

**No circular dependencies.** `self-evaluator.js` is a pure consumer — it reads from all layers and writes only to `System/Cognition/Evaluations/`. None of the modules it depends on import it back.

---

## Five Evaluation Dimensions

| # | Dimension | Weight | Primary Signal | Source |
|---|-----------|--------|---------------|--------|
| 1 | Planning Quality | 25% | goal completion rate, active planning adaptations | goal-tracker, adaptation-engine |
| 2 | Execution Quality | 30% | episodic success rate, single-attempt rate, top-stage failure rate | episodic-memory, reflection-engine |
| 3 | Recovery Effectiveness | 20% | recovery rate, blocked goal rate, retry adaptation presence | autonomy-metrics, goal-tracker |
| 4 | Lesson Usefulness | 15% | episode richness, adaptation confidence, application success rate | episodic-memory, adaptation-engine |
| 5 | Adaptation Effectiveness | 10% | active ratio, avg confidence, type diversity, application success rate | adaptation-engine |

**Overall score:** `Σ(dimension × weight) × 10` → 0–10 scale

---

## Score Impact Estimate

### System Evaluation (`generateSystemEvaluation`)

| Scenario | Expected Score Range | Explanation |
|----------|---------------------|-------------|
| New system, 0 episodes | 4.5–5.5 | All signals default to 0.5 neutral |
| 10 episodes, 70% success | 5.5–6.5 | Execution quality starts contributing real data |
| 50 episodes, 80% success | 6.5–7.5 | Lesson usefulness saturates, execution strong |
| 50+ episodes, 90% success + active adaptations | 7.5–8.5 | All dimensions firing with real signal |
| Regression: recent failure cluster | −1.0 to −2.0 | Execution quality drops; recovery stress-tests |

### Run Evaluation (`generateRunEvaluation`)

| Run Outcome | Expected Score | Rationale |
|-------------|---------------|-----------|
| simple task, clean success | 7.5–8.5 | High exec, strong lesson, clean recovery |
| complex task, clean success | 8.0–9.0 | Complex success = strong planning alignment |
| simple task, DEVELOPER fail | 3.0–4.5 | Early-stage failure on easy task = planning gap |
| critical task, COMMITTER fail | 5.0–6.5 | Late-stage failure on hard task = partial credit |
| API timeout, no stage identified | 4.0–5.5 | Classifiable failure type → lesson signal |
| Unknown failure, no stage | 2.5–3.5 | Worst case: unclassified failure = low lesson utility |

---

## Strengths / Weaknesses / Recommendations Logic

Thresholds applied per dimension after scoring:

| Score Range | Label | Action |
|-------------|-------|--------|
| ≥ 0.72 (7.2+/10) | Strength | Added to `strengths[]` with positive narrative |
| ≤ 0.45 (4.5−/10) | Weakness | Added to `weaknesses[]` + corrective rec to `recommendations[]` |
| 0.46–0.71 | Mid-range | Added to `recommendations[]` with improvement nudge |

Narrative templates are per-dimension and describe exactly what to inspect — no generic output.

---

## Vault Storage

```
APEX AI OS/
  System/
    Cognition/
      Evaluations/
        eval-{id}.json    ← each evaluation persisted here
```

Each file contains:
```json
{
  "id":           "string",
  "overallScore": 7.42,
  "dimensions":   { "planningQuality": 0.74, ... },
  "weights":      { ... },
  "strengths":    [ "..." ],
  "weaknesses":   [ "..." ],
  "recommendations": [ "..." ],
  "meta": {
    "scope":       "system|run",
    "episodeCount": 47,
    "successRate":  0.83,
    "evaluatedAt":  "2026-06-06T..."
  }
}
```

No cleanup / pruning implemented — evaluations accumulate. Recommend adding a max-files cap (same pattern as episodic-memory) if vault space becomes a concern.

---

## Rollback Plan

`self-evaluator.js` is purely additive — it reads from existing modules and writes only to its own vault subdirectory. Rolling back requires:

1. **Delete the file:**  
   `rm agent-system/self-evaluator.js`

2. **Remove any routes that import it** (none added yet — routes are a follow-on task):  
   Any `require('./agent-system/self-evaluator')` in `server.js` can be removed safely.

3. **Optionally clean vault:**  
   `rm -rf "APEX AI OS/System/Cognition/Evaluations/"`  
   (safe — no other module reads from this path)

No existing module imports `self-evaluator.js`, so deletion has zero downstream impact. No DB changes. No config changes.

**Risk level: zero** — the module cannot break existing functionality.

---

## Suggested API Routes (not yet added)

```js
GET  /api/autonomy/evaluation         → self-evaluator.generateSystemEvaluation()
GET  /api/autonomy/evaluation/latest  → self-evaluator.getLatestEvaluation()
GET  /api/autonomy/evaluation/run/:id → self-evaluator.generateRunEvaluation(req.params.id)
```

These can be added to the existing `/api/autonomy/*` block in `server.js` following the same `requireAppAccess` pattern used for all other autonomy routes.

---

## Syntax Verification

```
node --check agent-system/self-evaluator.js  →  PASSED (no output)
```

---

## What This Gives APEX

Before: APEX could execute, reflect, and adapt — but had no way to answer "how intelligent am I right now?"

After: APEX can call `generateSystemEvaluation()` and receive:
- A 0–10 score with five labeled sub-dimensions
- A concrete list of what is working (strengths)
- A concrete list of what is failing (weaknesses)  
- Actionable corrective recommendations grounded in live telemetry

The score will be low (4.5–5.5) on a fresh deployment and should grow toward 7–8 as episodes, goals, and adaptations accumulate. A score regression (e.g., 7.2 → 5.8 across a week) signals a meaningful quality drop and should be investigated.
