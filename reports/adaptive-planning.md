# Adaptive Planning — Design and Verification

**Date:** 2026-06-06
**File:** `agent-system/adaptive-planner.js`

---

## Problem

`task-planner.js` decomposes goals into subtasks but:
1. Uses the same decomposition regardless of what failed on a previous run
2. Has no concept of task size — will plan a spec with 8 files that DEVELOPER cannot handle
3. No detection of related subtasks that could be merged to reduce API calls
4. No lifecycle object tracking stages after the plan is created

---

## Solution

`adaptive-planner.js` adds 4 capabilities on top of task-planner.js without modifying it.

### 1. Failure-Aware Replanning

```javascript
const { replan } = require('./agent-system/adaptive-planner');

const newPlan = await replan('add rate limiting to voice routes', {
    failedStage:   'DEVELOPER',
    failureReason: 'Made no files — filesToModify too large',
    previousPlan:  { subtasks: [{ objective: 'add middleware to server.js' }] },
});
// Returns plan that avoids server.js and targets routes/*.js instead
```

Haiku prompt includes failedStage, failureReason, and the previous subtask list. Falls back to `decomposeGoal()` if API unavailable or parse fails.

### 2. Task Splitting

**Trigger:** spec.filesToModify.length + spec.filesToCreate.length > 4, OR spec.steps.length > 7

```javascript
const { splitTask } = require('./agent-system/adaptive-planner');

const parts = splitTask(spec, 3);
// spec targeting 6 files → 3 specs of 2 files each
// spec with 9 steps and no files → 3 specs of 3 steps each
```

Each part carries `_splitPart` and `_splitFrom` metadata for tracing.

### 3. Related Subtask Merging

**Trigger:** Two specs share a target file, OR share ≥2 keywords in their objectives (5+ char filter)

```javascript
const { mergeRelated } = require('./agent-system/adaptive-planner');

const merged = mergeRelated([
    { objective: 'add timeout to Supabase queries', filesToModify: ['pg_database.js'] },
    { objective: 'add retry to Supabase client',    filesToModify: ['pg_database.js'] },
]);
// Returns 1 merged spec: "Merged: add timeout...; add retry..." targeting pg_database.js
```

Merged specs take the highest complexity of the group, union of all files and steps.

### 4. Multi-Stage Lifecycle Plans

```javascript
const { createMultiStagePlan, advanceStage, failStage, isPlanComplete } = require('./agent-system/adaptive-planner');

let plan = createMultiStagePlan('improve error handling across routes', decomposedPlan);
// → { id, currentStage: 'PLANNING', stages: { PLANNING, EXECUTION, VALIDATION, REFLECTION, COMPLETION }, retryCount: 0, maxRetries: 1 }

plan = advanceStage(plan, planResult);   // PLANNING → EXECUTION
plan = advanceStage(plan, execResult);   // EXECUTION → VALIDATION
plan = failStage(plan, 'syntax error');  // resets EXECUTION + VALIDATION if retries remain
plan = advanceStage(plan, validResult);  // VALIDATION → REFLECTION
plan = advanceStage(plan, lesson);       // REFLECTION → COMPLETION

isPlanComplete(plan); // → true
```

**maxRetries by complexity:**
- simple/moderate: 1 retry
- complex: 2 retries
- critical: 3 retries

Failed EXECUTION or VALIDATION stages reset both to PENDING and decrement maxRetries.

---

## Verification

```
node --check agent-system/adaptive-planner.js → PASS
```

Imports: `task-planner.js` (decomposeGoal, planToSpecs, estimateComplexity, scoreRisk), `@anthropic-ai/sdk`

No circular dependencies. Falls back gracefully when ANTHROPIC_API_KEY is absent.

---

## Integration Pattern

```javascript
// In multi-agent-coordinator.js or a new coordinator:

const { replan, splitTask, mergeRelated } = require('./adaptive-planner');

// Before running: split oversized specs
const safeSpecs = specs.flatMap(s => splitTask(s, 3));

// After planning: merge related ones
const optimized = mergeRelated(safeSpecs);

// On failure: replan with context
const newPlan = await replan(goal, {
    failedStage: summary.failures[0]?.agent,
    failureReason: summary.failures[0]?.error,
    previousPlan: plan,
});
```
