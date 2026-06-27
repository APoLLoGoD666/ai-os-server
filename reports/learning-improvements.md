# Learning Improvements
**Date:** 2026-06-06  
**Branch:** feature/cognition-layer

---

## Summary of Improvements

This document covers all learning-related improvements made in this session, with before/after comparisons.

---

## 1. Lesson Retrieval: Unranked → Ranked

### Before
```js
// wiki-reader.js
const recentLessons = localMemory.getRecentLessons(12);
if (recentLessons) pages.push(`## Recent Agent Lessons\n${recentLessons.slice(0, 800)}`);
```
- 12 lessons, chronological order
- No relation to the current task
- Old lessons mixed with recent ones
- Up to 200 tokens of irrelevant content

### After
```js
const rawLessons = localMemory.getRecentLessons(20);
if (rawLessons) {
    const { getRankedLessons } = require('./reflection-engine');
    const ranked = taskTitle ? getRankedLessons(taskTitle, rawLessons, 8) : rawLessons;
    pages.push(`## Recent Agent Lessons\n${ranked.slice(0, 800)}`);
}
```
- 20 lessons fetched (wider pool)
- 8 returned, ranked by keyword overlap × 0.6 + recency × 0.4
- Lessons about the current task type surface first
- Same 800-char budget, higher signal quality

**Expected impact:** ARCHITECT receives lessons with genuine bearing on the current task. "Always wrap Supabase queries in try/catch" appears for DB-related tasks; "Check file size before DEVELOPER write" appears for large-file tasks.

---

## 2. Experience Retrieval: None → Episodic Context

### Before
ARCHITECT had no awareness of prior task attempts. Whether this was attempt 1 or attempt 20 at a similar feature, ARCHITECT started fresh.

### After
```js
// orchestrator.js — before git worktree setup
const similar = _episodic.getSimilarExperiences(spec.objective, { limit: 3 });
if (similar.length) {
    const expCtx = _episodic.formatExperiencesAsContext(similar);
    obsidianContext = (obsidianContext ? obsidianContext + '\n\n' : '') + expCtx.slice(0, 400);
}
```

ARCHITECT now sees (in its obsidianContext, injected into user prompt):
```
SIMILAR PAST EXPERIENCES:
✓ FEAT-H009: Workout logging with sets and reps [complex]
✗ FEAT-H042: Finance invoice creation endpoint [failed: COMMITTER] (moderate)
✓ FEAT-H031: Budget category tracking route [moderate]
```

**Expected impact:** ARCHITECT can infer "a similar task to this failed at COMMITTER before" and include a warning or write more defensive git-related code. First-attempt success rate should improve over time as the episode library grows.

---

## 3. Lesson Generation Context: Static → Failure-Aware

### `generateReflectionLesson()` (not yet in pipeline, available for scheduled use)

Before: REFLECTOR sees only the pipeline summary and a static system prompt.

After: `reflection-engine.js::generateReflectionLesson()` passes:
- Recent failure episodes as anti-pattern context
- Existing lesson as baseline to improve on
- Recent lessons to avoid repetition

**Not wired to hot path** — the REFLECTOR already makes one Haiku call. This function is available for a weekly batch job that synthesizes better meta-lessons from accumulated episodes.

---

## 4. Episode Persistence: None → Structured Storage

### Before
Failed tasks left only a lesson string in Lessons.md:
> `"Files over 15KB should be split into domain-specific routes/ files."`

No record of which task, which stage, which model tier, what the cost was.

### After
Every pipeline run stores a structured JSON episode:
```json
{
  "id":          "FEAT-H052",
  "timestamp":   "2026-06-06T14:23:11Z",
  "objective":   "FEAT-H052: Finance invoice generation with PDF export",
  "complexity":  "moderate",
  "success":     false,
  "cost":        "0.08234",
  "durationMs":  87000,
  "failedStage": "COMMITTER",
  "failureReason": "push failed: remote rejected — protected branch",
  "keywords":    ["finance", "invoice", "generation", "export"]
}
```

This enables:
- Failure pattern analysis: "COMMITTER fails 3× on protected branch pushes"
- Cost analysis: "moderate tasks average $0.08, complex average $0.35"
- Retry analysis: "tasks that required SONNET on first attempt vs second"

---

## 5. Knowledge Scoring: None → Composite Score

### Before
No lesson had a quality score. All lessons were equally weighted.

### After
`reflection-engine.js::scoreLessonText()` provides a 0–1 composite score:

| Dimension | Weight | Logic |
|-----------|--------|-------|
| Confidence | 40% | Ratio of confirming runs (default 0.5 on first observation) |
| Recency | 30% | 1.0 at day 0, 0.2 at day 30 |
| Actionability | 30% | Specific + actionable language patterns |

Used by `consolidateLessons()` to select which lessons to keep when pruning.

---

## 6. Failure Analysis: Manual → Automated

### Before
Failure patterns required manual inspection of Lessons.md and Supabase logs.

### After
`reflection-engine.js::analyzeFailures(episodes)` computes:
- Stage failure rates (which stage breaks most often)
- Error signature clusters (which error messages recur)
- `topStage` (the single weakest link)

`reflection-engine.js::analyzeSuccesses(episodes)` computes:
- Average cost per successful run
- Single-attempt success rate
- Most common complexity tier for successes

---

## Learning Flow — After This Session

```
User Input
    │
    ▼
[langchain-memory.js] getContext()
    │   - Last 20 messages + rolling summary (unchanged)
    ▼
[wiki-reader.js] getWikiContext(taskTitle)
    │   - Core pages (unchanged)
    │   - Entity pages (unchanged)
    │   - RANKED lessons: top 8 by relevance + recency  ← NEW
    │   - CS249R context (unchanged)
    ▼
[orchestrator.js] runAgentTeam(spec, taskId)
    │   - obsidianContext includes SIMILAR PAST EXPERIENCES  ← NEW
    │   - 8-agent pipeline executes (unchanged)
    ▼
[_reflector()] async, setImmediate
    │   - Claude Haiku generates lesson (unchanged)
    │   - Written to Lessons.md + Supabase (unchanged)
    ▼
[_episodic.storeEpisode()] async, setImmediate  ← NEW
    │   - Structured JSON written to vault/12 Memory/Episodes/
    │   - In-process cache updated
    ▼
[Next run]
    - getRankedLessons() re-ranks all lessons by task relevance
    - getSimilarExperiences() finds matching past episodes
    - Both injected into ARCHITECT context
```
