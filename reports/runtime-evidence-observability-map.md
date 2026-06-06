# Runtime Evidence Observability Map
**Date:** 2026-06-06  
**Purpose:** Document every location where subsystem activation produces observable evidence

---

## Methodology

Each subsystem entry documents:
1. **Trigger source** — what input causes the subsystem to activate
2. **Expected output** — what artifact is created/modified
3. **Storage location** — exact path or table
4. **Log output** — console messages during activation
5. **Observable side effects** — secondary signals

---

## 1. episodic-memory

**Trigger source:** `storeEpisode()` call (orchestrator post-run) OR loader writing ep-*.json files directly to EPISODES_DIR  
**Expected output:** Individual JSON files, one per episode  
**Storage location:** `VAULT/12 Memory/Episodes/ep-{id}.json`  
**Log output:** None (silent write; warnings on failure)  
**Observable side effects:**
- `episodeCount()` return value increases
- `getSuccessRate()` becomes non-null
- `getFailureEpisodes()` becomes non-empty if failures exist
- In-process `_cache` array populated on next `getSimilarExperiences()` or `getSuccessRate()` call
- `memory-indexer` auto-rebuilds index on server restart if Episodes/ newly populated

**Verification command:**
```bash
node -e "const em = require('./agent-system/episodic-memory'); console.log(em.episodeCount(), em.getSuccessRate(), em.getFailureEpisodes(5).length)"
```

---

## 2. goal-tracker

**Trigger source:** `addGoal()`/`completeGoal()` calls OR loader writing goal-*.json files directly to GOALS_DIR  
**Expected output:** Individual JSON files, one per goal  
**Storage location:** `VAULT/System/Goals/goal-{id}.json`  
**Log output:** None  
**Observable side effects:**
- `getStats()` `total`, `completed`, `blocked`, `running` counts change
- `completionRate` changes
- `autonomy-metrics.completionRate()` changes
- `autonomy-metrics.computeAutonomyScore()` `goalCompletion` dimension changes

**Verification command:**
```bash
node -e "const gt = require('./agent-system/goal-tracker'); console.log(JSON.stringify(gt.getStats()))"
```

---

## 3. autonomy-metrics

**Trigger source:** Any API call to `computeAutonomyScore()` or `getFullMetrics()`; reads from Supabase + vault  
**Expected output:** In-memory computed object; no persistent storage  
**Storage location:** None (stateless; computes fresh each call)  
**Log output:** None (Supabase errors swallowed)  
**Observable side effects:**
- Score value changes reflect combined vault + Supabase state
- Each dimension reports `null` (default 0.5) or a real value

**Measurement trigger:**
```bash
node -e "require('dotenv').config(); require('./agent-system/autonomy-metrics').computeAutonomyScore().then(r => console.log(JSON.stringify(r,null,2))).then(() => process.exit())"
```

---

## 4. adaptation-engine

**Trigger source:** `runCycle()` called explicitly (POST /api/autonomy/adapt) OR triggered via `learn()` after N pipeline runs  
**Expected output:** `adaptation-registry.json` updated with recommendations  
**Storage location:** `VAULT/System/Adaptations/adaptation-registry.json`  
**Log output:**
- `[AdaptationEngine] pass1:stageFailures failed (non-fatal): ...` if Pass 1 errors
- `[AdaptationEngine] pass2:episodic failed (non-fatal): ...` if Pass 2 errors
- `[AdaptationEngine] learn cycle (non-fatal): ...` if async learn() fails
**Observable side effects:**
- `getActiveAdaptations()` returns non-empty array
- `getSnapshot()` shows `activeCount > 0`
- `adaptation-registry.json` `totalActive` field > 0
- Adaptation records have `type`, `target`, `action`, `confidence`, `evidence` fields

**Verification command:**
```bash
node -e "require('dotenv').config(); const ae = require('./agent-system/adaptation-engine'); ae.runCycle().then(r => console.log(JSON.stringify(r,null,2))).then(() => process.exit())"
```

---

## 5. planning-quality-registry

**Trigger source:** `recordPlanOutcome()` call (orchestrator post-plan) OR loader merging records into plan-quality-registry.json  
**Expected output:** Updated `plan-quality-registry.json`  
**Storage location:** `VAULT/System/PlanQuality/plan-quality-registry.json`  
**Log output:** `[PlanQuality] recordPlanOutcome: planId required` if planId missing  
**Observable side effects:**
- `getPlanQuality({})` returns non-empty object (no `insufficient: true`)
- `generatePlanningInsights()` returns insights array
- `getSummary()` shows `hasData: true`, `totalPlans > 0`

**Verification command:**
```bash
node -e "const pqr = require('./agent-system/planning-quality-registry'); console.log(JSON.stringify(pqr.getSummary(),null,2)); console.log(JSON.stringify(pqr.getPlanQuality({}),null,2))"
```

---

## 6. reflection-engine

**Trigger source:** Synchronous — called with lesson text or episode array; no I/O trigger  
**Expected output:** `scoreLessonText()` returns composite score object; `analyzeFailures()` returns patterns  
**Storage location:** None (pure functions, no persistence)  
**Log output:** `[ReflectionEngine] generateReflectionLesson failed (non-fatal): ...` only if Haiku call fails  
**Observable side effects:**
- `scoreLessonText()` composite score > 0 means lesson text is actionable
- `analyzeFailures(failures)` returns `topStage` when failure episodes exist

**Verification command:**
```bash
node -e "const rf = require('./agent-system/reflection-engine'); const em = require('./agent-system/episodic-memory'); const f = em.getFailureEpisodes(20); console.log(JSON.stringify(rf.analyzeFailures(f),null,2)); console.log(rf.scoreLessonText('Always validate schema before migration'))"
```

---

## 7. improvement-executor

**Trigger source:** `generateRoadmap()` or `generateProposal()` called explicitly (GET /api/autonomy/improvements)  
**Expected output:**
1. `System/Improvements/proposals.json` — persisted proposals
2. `System/Improvements/roadmap-{date}.md` — human-readable roadmap
**Storage location:**
- `VAULT/System/Improvements/proposals.json`
- `VAULT/System/Improvements/roadmap-{date}.md`
**Log output:** `[ImprovementExecutor] Generated proposal {id}: ...`  
**Observable side effects:**
- `getTopImprovements()` returns pending proposals
- `getStats()` shows `totalProposals > 0`
- Roadmap markdown file appears in Improvements directory

**Verification command:**
```bash
node -e "require('dotenv').config(); const ie = require('./agent-system/improvement-executor'); ie.generateRoadmap().then(r => { console.log('total proposals:', r.total); r.proposals.forEach(p => console.log(p.rank, p.templateId, p.priorityScore)); }).then(() => process.exit())"
```

---

## 8. self-evaluator

**Trigger source:** `generateSystemEvaluation()` called (GET /api/cognition/self-evaluation)  
**Expected output:** `eval-{id}.json` saved to vault  
**Storage location:** `VAULT/System/Cognition/Evaluations/eval-{id}.json`  
**Log output:** `[SelfEvaluator] save failed (non-fatal): ...` only if write fails  
**Observable side effects:**
- `getLatestEvaluation()` returns non-null
- Evaluation has `overallScore`, `dimensions`, `strengths`, `weaknesses`, `recommendations`

**Verification command:**
```bash
node -e "require('dotenv').config(); const se = require('./agent-system/self-evaluator'); se.generateSystemEvaluation().then(r => { console.log('score:', r.overallScore); console.log('dims:', JSON.stringify(r.dimensions)); }).then(() => process.exit())"
```

---

## 9. memory-indexer

**Trigger source:** `rebuildIndex()` on server startup OR `indexEpisode()` after episode store  
**Expected output:** `memory-index.json` updated  
**Storage location:** `VAULT/12 Memory/memory-index.json`  
**Log output:**
- `[MemoryIndexer] Loaded N episodes, N lessons (N embedded)`
- `[MemoryIndexer] Rebuild complete: +N episodes, +N lessons`
- `[MemoryIndexer] Embedded N memory entries (N total indexed)`
**Observable side effects:**
- `getStats()` shows episodes/lessons/patterns counts
- `dirty` flag true until flush

**Verification command:**
```bash
node -e "const mi = require('./agent-system/memory-indexer'); setTimeout(() => { console.log(JSON.stringify(mi.getStats(),null,2)); process.exit(); }, 500)"
```

---

## 10. memory-retriever

**Trigger source:** `findSimilarEpisodes()` or `retrieve()` called with a query  
**Expected output:** Ranked array of episodes/lessons (in-memory; no persistence)  
**Storage location:** None (reads from indexer's in-memory maps)  
**Log output:** `[MemoryRetriever] findSimilarEpisodes failed (non-fatal): ...` on error  
**Observable side effects:**
- Returns non-empty array when indexed episodes exist
- `_method` field = 'keyword' when no embeddings, 'semantic' when embeddings exist

**Verification command:**
```bash
node -e "require('./agent-system/memory-retriever').findSimilarEpisodes('dashboard widget', {limit:3}).then(r => { console.log('results:', r.length); r.forEach(e => console.log(e._relevance, e._method, e.objective?.slice(0,60))); }).then(() => process.exit())"
```

---

## 11. agent-reputation

**Trigger source:** `getFailurePatterns()` and `getStageReputation()` — reads `apex_agent_stages` Supabase table  
**Expected output:** Stage performance data (in-memory only)  
**Storage location:** None (reads Supabase; no vault writes)  
**Log output:** None  
**Observable side effects:** Feeds adaptation-engine Pass 1. Will produce 0 recommendations until `apex_agent_stages` is populated.

**Note:** Framework does NOT populate `apex_agent_stages`. Pass 1 remains non-functional until real pipeline runs occur.

---

## 12. dynamic-agent-selector

**Trigger source:** `getCategoryStats(cat, sampleSize)` — reads `apex_agent_runs` filtered by category regex  
**Expected output:** Per-category success/failure stats (in-memory only)  
**Storage location:** None  
**Log output:** None  
**Observable side effects:** Feeds adaptation-engine Pass 3. Requires ≥ MIN_SAMPLES (8) rows matching each category's objective regex.

---

## Summary: What Can Be Directly Measured

| System | Measurable? | Measurement Method |
|--------|:-----------:|-------------------|
| episodic-memory | ✓ Direct | `episodeCount()`, `getSuccessRate()`, file count |
| goal-tracker | ✓ Direct | `getStats()`, file count |
| autonomy-metrics | ✓ Direct | `computeAutonomyScore()` |
| adaptation-engine | ✓ Direct | `runCycle()` + `getSnapshot()` + registry file |
| planning-quality-registry | ✓ Direct | `getSummary()`, `getPlanQuality()` |
| reflection-engine | ✓ Direct | `scoreLessonText()`, `analyzeFailures()` on loaded data |
| improvement-executor | ✓ Direct | `generateRoadmap()` + proposals.json |
| self-evaluator | ✓ Direct | `generateSystemEvaluation()` + eval file |
| memory-indexer | ✓ Direct | `rebuildIndex()` + `getStats()` + memory-index.json |
| memory-retriever | ✓ Direct | `findSimilarEpisodes(query)` result count |
| agent-reputation | ✗ Not testable | No apex_agent_stages data from framework |
| dynamic-agent-selector | ✗ Not testable | No category reaching MIN_SAMPLES=8 |
