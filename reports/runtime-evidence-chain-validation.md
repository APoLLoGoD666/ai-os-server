# Runtime Evidence Chain Validation
**Date:** 2026-06-06  
**Phase:** 6 — Evidence Chain Tracing  
**Purpose:** Verify that each claimed subsystem activation has an unbroken chain of observable artifacts from input to output.

---

## Methodology

For each integration, the chain is traced from raw input (file write or Supabase insert) through the code path to the final observable artifact. Every link in the chain was verified by either direct runtime output or file inspection.

---

## Chain 1: Episode Files → Autonomy Score (executionSuccess + episodeRichness)

```
WRITE ep-synth-sdv1-dim-001.json (success:true) to VAULT/12 Memory/Episodes/
WRITE ep-synth-sdv1-dim-002.json (success:false)
         ↓
episodic-memory._loadAllEpisodes()     [filter: f.startsWith('ep-') && f.endsWith('.json')]
         ↓
episodic-memory.getSuccessRate(50)     = 1/2 = 0.500 (Tier 1)
episodic-memory.episodeCount()         = 2
         ↓
autonomy-metrics.computeAutonomyScore()
  executionSuccess = 0.500 × 0.30 = 0.150
  episodeRichness  = min(1, 2/100) × 0.05 = 0.001
```

**VERIFIED.** All links tested at Tier 1. `episodeCount()` returned 2; `getSuccessRate()` returned 0.5.

---

## Chain 2: Goal Files → Autonomy Score (goalCompletion + confidence)

```
WRITE goal-synth-sdv1-dim-001.json (completed)
WRITE goal-synth-sdv1-dim-002.json (completed)
WRITE goal-synth-sdv1-dim-003.json (blocked)
         ↓
goal-tracker._loadAll()     [filter: f.startsWith('goal-') && f.endsWith('.json')]
         ↓
goal-tracker.getStats()     = { total:4, completed:3, completionRate:0.75 }
         ↓
autonomy-metrics.computeAutonomyScore()
  goalCompletion = 0.75 × 0.20 = 0.150
  confidence     = sr×0.5 + epVol×0.2 + goalRate×0.3 = 0.483 × 0.10 = 0.048
```

**VERIFIED.** `getStats()` confirmed at Tier 1 (total:4, completionRate:0.75).

---

## Chain 3: Supabase apex_agent_runs → Autonomy Score (lowRetryRate + recovery)

### lowRetryRate chain

```
INSERT synth-sdv1-dim-001 (success:true)   → apex_agent_runs
INSERT synth-sdv1-dim-002 (success:false)
         ↓
autonomy-metrics.retryRate()
  sb.from('apex_agent_runs').select('success')
  failures/total = 5/13 = 0.385  (Tier 1)
         ↓
lowRetryRate = max(0, 1 - 0.385×2) = 0.230 × 0.15 = 0.035
```

**VERIFIED.** Row counts confirmed post-Tier-1 (13 total, 5 failures).

### recovery chain (DEFECT-2 fixed)

```
ep-synth-sdv1-dim-002 (failure, objective: "[SYNTHETIC] Build metrics dashboard widget...")
         ↓
autonomy-metrics.recoveryRate()
  kw = ep.objective.slice(0, 40)  = "[SYNTHETIC] Build metrics dashboard widg"
  sb.from('apex_agent_runs').select('task_id')   ← DEFECT-2: was .select('id'), FIXED
    .ilike('objective', '%[SYNTHETIC] Build metrics dashboard widg%')
    .eq('success', true)
    .gt('created_at', '2026-05-31T15:00:00.000Z')
         ↓
  MATCH: synth-sdv1-dim-001 (success:true, created_at:2026-06-01T10:00:00)
  1 match / 1 failure = 1.0
         ↓
recovery = 1.0 × 0.20 = 0.200
```

**VERIFIED.** ILIKE query confirmed matching rows. Recovery = 1.0 after DEFECT-2 fix.

---

## Chain 4: Episode Failures → Adaptation Engine (Pass 2)

```
FAILURE episodes at Tier 2: 6 total (5 DEVELOPER, 1 REVIEWER)
         ↓
adaptation-engine._analyzeEpisodicPatterns()
  episodeCount() = 10 ≥ MIN_SAMPLES=8  ✓
  failures = getFailureEpisodes(60) = 6 failures
  failRate = 1 - getSuccessRate(40) = 1 - 0.4 = 0.6

  Condition A (split_large_tasks):
    devFails = 5 ≥ ceil(8/2)=4  ✓
    _confidence(10, 0.5) = 0.417×0.4 + 0×0.6 = 0.167 < MIN_CONF=0.25  ✗ FILTERED

  Condition F (enable_simulation_before_execution):
    buildPerformanceSummary(6 failures): total=6 ≥ 5, successRate=0 < 0.3  ✓
    _confidence(6, 1.0) = 0.25×0.4 + 1.0×0.6 = 0.7 ≥ MIN_CONF  ✓ ADDED
         ↓
adaptation-registry.json: 1 active adaptation, type=planning, action=enable_simulation_before_execution
```

**VERIFIED.** `runCycle()` returned totalActive:1, adaptation confirmed in `getSnapshot()`.

**Critical finding:** Condition A generates `split_large_tasks` but confidence calculation at 50% signal rate produces 0 signal strength, falling below MIN_CONF. The static analysis prediction of `split_large_tasks` was incorrect.

---

## Chain 5: Plan Records → Planning Quality Registry

```
Tier 2 loads sdv1-loop:
  plan-quality-registry.json written to VAULT/System/PlanQuality/
  3 records with completedAt timestamps
         ↓
planning-quality-registry._load()
  reads plan-quality-registry.json
  validates: all 3 records have completedAt → not filtered
  sampleSize = 3 ≥ MIN_SAMPLES=3  ✓
         ↓
getPlanQuality({}) = { sampleSize:3, completionRate:0.667, ... }
getSummary() = { hasData:true, totalPlans:3 }
```

**VERIFIED.** `getSummary()` returned hasData:true, totalPlans:3 at Tier 2.

---

## Chain 6: Failure Episodes → Reflection Engine → Adaptation Evidence

```
ep-synth-sdv1-loop-003/004/005/006 (DEVELOPER failures)
ep-synth-sdv1-loop-007 (REVIEWER failure)
         ↓
reflection-engine.analyzeFailures(failures)
  groups by ep.failedStage
  DEVELOPER: 5 (rate 0.833)
  REVIEWER:  1 (rate 0.167)
  topStage = DEVELOPER
         ↓
reflection-engine.buildPerformanceSummary(failures)
  total=6, successRate=0
  → feeds adaptation Condition F
```

**VERIFIED.** `analyzeFailures()` output confirmed topStage=DEVELOPER.

---

## Chain 7: Episodes + Lessons → Memory Indexer → Semantic Retrieval

```
ep-synth-sdv1-dim-001/002 (2 episode JSON files)
Lessons.md (8 sdv1-loop lesson sections after Tier 2)
         ↓
memory-indexer.rebuildIndex()
  scans EPISODES_DIR: finds 10 ep-synth-*.json files
  reads LESSONS_PATH: splits on \n---\n → 11 sections
  indexes all entries (hash dedup)
         ↓
lib/embed.js (VOYAGE_API_KEY absent → GOOGLE_API_KEY fallback → Gemini gemini-embedding-001)
  embedText() called for all 21 entries
  all 21 embeddings generated successfully (768-dim)
         ↓
memory-indexer._flush() → memory-index.json written
         ↓
memory-retriever.findSimilarEpisodes('dashboard widget', {limit:3})
  cosine similarity search over embedded vectors
  returns 2 results, _method:'semantic', relevance: [0.841, 0.59]
```

**VERIFIED.** Semantic retrieval functional. Prior audit's "no embeddings" claim was incorrect — Gemini fallback is active via GOOGLE_API_KEY.

---

## Chain 8: Active Adaptations + Episode Count → Improvement Executor (5 proposals)

```
Post-Tier-2 state:
  episodeCount() = 10
  getActiveAdaptations() = 1 (enable_simulation_before_execution)
  reflection-engine topStage = DEVELOPER (non-null)
         ↓
improvement-executor.generateRoadmap()
  _evaluateTemplates():
    tpl-episode-cross-reference:   episodeCount >= 5   → 10 ≥ 5  ✓  rank 4
    tpl-reflection-lesson-wire:    episodeCount >= 10  → 10 ≥ 10 ✓  rank 2
    tpl-self-evaluator-endpoint:   episodeCount >= 10  → 10 ≥ 10 ✓  rank 3
    tpl-adaptation-routing-wire:   activeAdaptations>0 AND topStage !== null
                                   → 1>0 ✓ AND 'DEVELOPER'≠null ✓  rank 1
  _proposalFromAdaptation():
    enable_simulation_before_execution → _ADAPT_TO_PROPOSAL entry exists
    → tpl-adapt-enable_simulation_be  rank 5
         ↓
proposals.json written to VAULT/System/Improvements/
5 proposals generated
```

**VERIFIED.** `generateRoadmap()` returned total:5, all 5 template IDs confirmed.

---

## Chain 9: All Sources → Self-Evaluator → Eval File

```
episodic-memory: 10 episodes, sr=0.4
goal-tracker: 7 goals, cr=0.714
adaptation-engine: 1 active (confidence=0.7)
planning-quality: 3 plans, cr=0.667
reflection-engine: lessonQuality analysis
         ↓
self-evaluator.generateSystemEvaluation()
  aggregates all 5 sources
  overallScore = 5.32
  dimensions:
    planningQuality:       0.757
    executionQuality:      0.420
    recoveryEffectiveness: 0.426
    lessonUsefulness:      0.460
    adaptationEffectiveness: 0.630
         ↓
fs.writeFileSync(evalPath, json)
  → VAULT/System/Cognition/Evaluations/eval-mq2e8vb6-fbx.json  CONFIRMED
```

**VERIFIED.** File confirmed on disk. Score: 5.32. Return object does not include `savedTo` field but write occurs.

---

## Evidence Chain Summary

| Chain | Status | Key Observable Artifact |
|-------|--------|------------------------|
| 1. Episode files → autonomy executionSuccess | ✓ VERIFIED | episodeCount()=2→10→20; getSuccessRate()=0.5→0.4→0.55 |
| 2. Goal files → autonomy goalCompletion | ✓ VERIFIED | getStats().completionRate=0.75→0.714→0.700 |
| 3. apex_agent_runs → autonomy lowRetryRate | ✓ VERIFIED | 13→21→31 rows; retryRate tracked across tiers |
| 4. apex_agent_runs → autonomy recovery | ✓ VERIFIED (after DEFECT-2 fix) | 1.0→0.167→0.111; ILIKE match confirmed |
| 5. Episode failures → adaptation | ✓ VERIFIED | enable_simulation_before_execution confidence=0.7 |
| 6. Plan records → planning quality | ✓ VERIFIED | hasData=true, sampleSize=3, completionRate=0.667 |
| 7. Failure episodes → reflection | ✓ VERIFIED | topStage=DEVELOPER, count=5/6 |
| 8. Episodes + lessons → semantic index | ✓ VERIFIED | 21→35 embeddings; semantic retrieval active |
| 9. Active adaptations → improvement proposals | ✓ VERIFIED | 5 proposals from 4 templates + 1 dynamic |
| 10. All sources → self-evaluation | ✓ VERIFIED | overallScore=5.32; eval file on disk |

**All 10 evidence chains verified with runtime artifacts.**

---

## Critical Deviations from Prior Static Analysis

| Predicted | Actual | Significance |
|-----------|--------|-------------|
| VOYAGE_API_KEY absent → keyword fallback | GOOGLE_API_KEY present → Gemini embeddings | POSITIVE: semantic retrieval works |
| `split_large_tasks` fires at Tier 2 | `enable_simulation_before_execution` fires | MEDIUM: different action, same confidence threshold |
| 4 improvement proposals at Tier 2 | 5 proposals | POSITIVE: dynamic proposal generation from active adaptation |
| Score ~5.30 post-Tier-1 (clean slate) | Score 5.84 (with real baseline data) | EXPECTED: real data was present |
| recovery=1.0 → evidence-backed | recovery=0.0 → DEFECT-2 before fix | CRITICAL: required code fix |
| adaptation-registry cleaned by CLI | CLI does NOT touch registry | ⚠️ Manual reset required |
