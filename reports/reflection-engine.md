# Reflection Engine
**Date:** 2026-06-06  
**Branch:** feature/cognition-layer  
**File:** `agent-system/reflection-engine.js`

---

## Problem

The system generated lessons but never evaluated them. Every lesson had equal weight. Old lessons, wrong lessons, and vague lessons all contributed identically to ARCHITECT's context. There was no way to distinguish a well-validated pattern from a one-off guess.

## Root Cause

Lessons were plain text — no metadata, no scores, no quality signals. The REFLECTOR used a simple fixed prompt with no feedback from previous failure patterns. `getRecentLessons(12)` returned a flat tail-slice with zero relevance computation.

## Fix

Created `agent-system/reflection-engine.js` — all analysis functions are synchronous and zero-cost (no API). One async function (`generateReflectionLesson`) is available for scheduled use.

---

## Functions

### Knowledge Scoring — `scoreLessonText(lesson, opts)`

Scores a lesson on four dimensions:
```
confidence  = successCount / (successCount + failCount)    weight: 40%
recency     = 1.0 → 0.2 over 30 days (linear decay)       weight: 30%
actionScore = 0–1.0 based on specific/actionable language  weight: 30%
composite   = weighted sum of above three
```

**Actionable language detection:**
- Action verbs: always, never, must, avoid, check, ensure, wrap, validate, guard
- Specific markers: .js, .md, route, function, table, await, async, try, catch, limit

A lesson like `"Always wrap Supabase .from().select() in try/catch"` scores `actionScore: 1.0`.
A lesson like `"The run was successful"` scores `actionScore: 0.0`.

Usage: `scoreLessonText("Always wrap...", { ageDays: 5 })` → `{ confidence: 0.5, recency: 0.867, actionScore: 1.0, composite: 0.76 }`

---

### Retrieval Ranking — `getRankedLessons(objective, rawLessons, limit)`

Re-ranks the raw Lessons.md content so task-relevant entries surface first:
```
score = keywordOverlap/totalKeywords × 0.6 + positionInFile/totalSections × 0.4
```

Returns the top `limit` sections as a joined string. Falls back to `rawLessons` if fewer sections than limit.

**Integration:** Replaces the raw `getRecentLessons(12)` dump in `wiki-reader.js::getWikiContext()`. Now fetches 20 lessons and returns the 8 most relevant to the task. Same token budget, higher signal-to-noise.

---

### Memory Consolidation — `consolidateLessons(rawLessons, maxOutput)`

Pure-text lesson consolidation (no API call):
- Always keeps the most recent `40%` of maxOutput entries verbatim
- Fills remaining `60%` with the highest-scoring older entries (composite score)
- Removes neither — merges into a scored subset

Use case: called when Lessons.md grows beyond 30 entries to prune duplicates and surface high-quality older lessons. Cross-domain dependency: needs a server.js cron or manual trigger (documented in `reports/cognition-certification.md`).

---

### Failure Analysis — `analyzeFailures(failureEpisodes)`

Given an array of failure episodes from `episodic-memory.js::getFailureEpisodes()`:
- Counts failures by stage → identifies the weakest stage
- Clusters error reasons by 5-word signature → finds recurring patterns
- Returns: `{ patterns[], topStage, topErrors[], total }`

Example output:
```json
{
  "topStage": { "stage": "DEVELOPER", "count": 8, "rate": 0.4 },
  "topErrors": [
    { "sig": "developer wrote no files (routing", "count": 4 }
  ]
}
```

---

### Success Analysis — `analyzeSuccesses(successEpisodes)`

Given successful episodes:
- `avgCostUsd` — mean cost per successful run
- `avgAttempts` — mean attempts per success (>1.0 means frequent retries needed)
- `commonComplexity` — most frequent complexity tier for successful runs
- `singleAttemptRate` — fraction of successes on first attempt

---

### Architect Output Scoring — `scoreArchitectOutput(architectResult, complexity)`

Uses the ARCHITECT's output quality (test cases, warnings, self-reported confidence) to produce a calibrated confidence score:
```
base = architectResult.confidence (0.7 default)
+ 0.05 × testCaseCount (up to 0.15)
- 0.05 × warningCount (up to 0.20)
- complexityPenalty (0–0.15)
```

Available for use in routing decisions (e.g., low confidence → SONNET for DEVELOPER).

---

### Enhanced Lesson Generation — `generateReflectionLesson(spec, agentLogs, success, existingLesson)`

Async, uses Claude Haiku (prompt-cached system block). Provides:
- Recent lessons as anti-repetition context
- Pipeline snapshot for grounding
- Existing lesson as a baseline to improve on

**Not wired into the hot path** — using it in every run would double the REFLECTOR token cost. Available for batch/scheduled synthesis. A cron job calling this weekly would synthesize better meta-lessons from accumulated experiences.

---

## Verification

```
node --check agent-system/reflection-engine.js  → OK
node --check agent-system/wiki-reader.js        → OK (with getRankedLessons import)
```

`getRankedLessons()` tested with empty string input → returns empty string (no crash).  
`scoreLessonText()` tested with no opts → returns composite 0.5 (default safe value).

## Risk

Low. All functions are pure (no side effects) except `generateReflectionLesson()` which is not wired to the pipeline. `getRankedLessons` wraps itself in a try/catch in wiki-reader.js — if it throws, the raw lesson fallback is used.

## Rollback

Revert the wiki-reader.js change to use raw `getRecentLessons(12)`. Delete `agent-system/reflection-engine.js`.
