# Runtime Activation Readiness Report
**Date:** 2026-06-06  
**Engineer:** Principal Runtime Activation Engineer  
**Method:** Direct source-code contract verification against proposed call sites in runtime-roi-ranking-v2.md  
**Scope:** 5 opportunities evaluated. Evidence over assumptions — every claim is line-referenced.

---

## Executive Summary

### Critical Finding: ROI Report Errors for Opportunities 4, 5, and 6

The prior architecture audit (runtime-roi-ranking-v2.md) incorrectly classified three opportunities as "cold/dead":

| Opportunity from ROI Report | Audit Claim | Actual State |
|-----------------------------|-------------|--------------|
| #4 — `_spe.updateFromResponse()` | "0 callers — COLD" | **LIVE** — called at server.js:7359, 7411, 7456 |
| #5 — `_eae.recordTransition()` | "0 callers — COLD" | **LIVE** — called at server.js:7358, 7410, 7455 |
| #6 — `_timingEng.buildStreamPlan()` | "0 callers — COLD" | **LIVE** — called at server.js:7356, 7408, 7452 |

Additionally: `_eae.generateExecutiveSnapshot()` is called at server.js:7331, `_spe.resumeStrategicContext()` at server.js:7332, and `stream_plan` is already returned in chat route responses. Stages 3.4 and 3.5 are **already active**. No activation needed for any of these three opportunities.

This validation session is therefore focused on the three genuinely unimplemented opportunities: execution-recovery, adaptive-planner, and reflection-engine.

---

## Opportunity 1 — execution-recovery.js: `executeWithRecovery` in `runParallel._worker()`

### A. Call Site Verification

**Proposed insertion:** `agent-system/multi-agent-coordinator.js`, replace lines 103–113 inside `_worker()`

**Actual code at that location (lines 91–130):**
```
async function _worker() {
    while (nextIdx < specs.length) {
        ...
        const agentConfig = await _dynSelector.selectAgentConfig(spec, {...})
            .catch(() => ({ tier: ..., escalated: false }));    // line 98–101

        let result = null;
        let error  = null;
        try {
            result = await runAgentTeam({               // line 106
                ...spec,
                _selectedTier: agentConfig.tier,
                _agentCategory: agentConfig.category,
            }, taskId);
        } catch (e) {
            error = e.message;                          // line 111–113
        }

        const execSummary = summarizeExecution(spec, result?.agentLogs || [], result);
        results[i] = { taskId, spec, result, error, agentConfig, execSummary };
    }
}
```

**Call site exists: CONFIRMED.** Lines 103–113 are exactly as described.

### B. Input Availability

| Input | Required by `executeWithRecovery` | Available at call site | Status |
|-------|----------------------------------|----------------------|--------|
| `spec` | yes — first arg | `const spec = specs[i]` — line 94 | ✓ |
| `agentConfig` | yes — third arg | `agentConfig` from selectAgentConfig — lines 98–101 | ✓ |
| `runFn` | yes — second arg | constructed as `async (s, cfg) => runAgentTeam({...s, ...}, taskId)` | ✓ |
| `options.maxAttempts` | optional | caller provides `{ maxAttempts: 3 }` | ✓ |
| `selectFallbackConfig` | used internally | confirmed exported at dynamic-agent-selector.js:177 | ✓ |
| `FAILURE_TYPES` from execution-verifier | used internally | confirmed exported at execution-verifier.js:12 | ✓ |

### C. Output Contract Verification

`executeWithRecovery` returns:
```js
{ success: bool, result: pipelineResult, attempts: N, attemptLog: [...] }   // success
{ success: false, result: null, error: string, attempts: N, attemptLog: [...], exhausted: true }  // failure
```

`runAgentTeam` returns:
```js
{ success: true,  commitHash, agentLogs, error: null, cost, complexity, models, attempts, escalations }  // success
{ success: false, commitHash: null, agentLogs, error: string, complexity, models }                         // failure
```

**`result?.success` check:** `executeWithRecovery` evaluates success as `!!(result?.success && !error)`. `runAgentTeam` always returns an object (never throws from coordinator's perspective except if `ANTHROPIC_API_KEY` is missing). The `success` field is always a boolean. **Contract match: VALID.**

After wrapping: `result = _recovered.result` — this becomes the `runAgentTeam` return object. `result?.agentLogs` at line 116 will still work. `result?.success` for `aggregate()` will still work. **Downstream consumers unaffected.**

### D. Risk Analysis

**RISK 1 — Double retry layer (HIGH severity)**

`runAgentTeam` already contains an internal `MAX_ATTEMPTS = 3` retry loop (orchestrator.js:984–990) that:
- Retries DEVELOPER → REVIEWER → VALIDATOR on each failure
- Escalates model tier: HAIKU → SONNET → OPUS across 3 attempts
- Passes failure feedback to next DEVELOPER attempt (Reflexion pattern)

If `executeWithRecovery` wraps this with 3 outer attempts:
- A single task can trigger up to **9 DEVELOPER invocations** (3 inner × 3 outer)
- Outer retries restart RESEARCHER + ARCHITECT + all stages from scratch
- Cost ceiling: 3× the per-run budget cap. A `critical` task budgeted at $2.50 could cost up to $7.50

The internal retry already covers the failure types `executeWithRecovery` addresses: NO_FILES, SYNTAX, REVIEW, VALIDATION. The external retry adds value primarily for transient failures (TIMEOUT, API) where the entire pipeline is aborted by the catch block.

**RISK 2 — Duplicate telemetry (HIGH severity)**

Every `runAgentTeam` failure path fires these hooks via setImmediate BEFORE returning:
```
_reflector(spec, agentLogs, false)           → lesson generated for each failure
_auditLog(taskId, ...)                       → Supabase upsert (last write wins — earlier attempts lost)
_episodic.storeEpisode({ success: false })   → failure episode recorded per outer attempt
_adaptEngine.learn(spec, { success: false }) → negative learning signal per outer attempt
_goalTracker.blockGoal(taskId, error)        → goal blocked per outer attempt
```

With 2 outer failed attempts followed by 1 success:
- `_adaptEngine.learn(success: false)` fires 2× before `learn(success: true)` fires 1×
- The adaptation engine accumulates false negatives that corrupt routing recommendations
- `_episodic.storeEpisode(success: false)` fires 2× — duplicates failure episode data
- `_goalTracker.blockGoal` fires 2×, then `completeGoal` fires 1× — invalid state transitions

**RISK 3 — Internal model escalation conflict (MEDIUM severity)**

`executeWithRecovery` calls `selectFallbackConfig(currentConfig)` which escalates tier. `runAgentTeam` also escalates internally (HAIKU → SONNET → OPUS). If `executeWithRecovery` escalates from `moderate` to `complex` before the outer retry, the second `runAgentTeam` call starts at `complex` tier, but its internal retry loop escalates FURTHER through the `complex` tier's own model sequence. Combined tier escalation is undefined and may exceed model availability.

**RISK 4 — `taskId` reuse across outer retries (LOW severity)**

`taskId` is captured in the `_runFn` closure. The audit log `upsert({onConflict: 'task_id'})` means retry attempts overwrite the prior record. The first failure's cost, duration, and agent logs are permanently overwritten by the retry result. Data is not lost (last attempt is preserved) but intermediate attempts are invisible.

**Guard required to activate safely:**
The duplicate telemetry risk requires modifying `runAgentTeam` to accept a `spec._suppressHooks: true` flag that skips all setImmediate side-effects on non-final attempts. This is a change to orchestrator.js — escalating effort from LOW to MEDIUM. Without this guard, adaptation engine statistics are poisoned on every recovered failure.

### E. Activation Assessment

| Metric | Value |
|--------|-------|
| Implementation effort | 2–3h (coordinator wiring + orchestrator hook suppression) |
| Rollback effort | LOW — remove require and revert try/catch block |
| Expected telemetry gain | `planning-quality-registry.recoveryCount` filled; `autonomy-metrics.recoveryRate()` gains real data; self-evaluator `_scoreRecovery()` real signal |
| Expected autonomy gain | +0.4 on `recovery` dimension at steady state (10+ runs) |
| Activation confidence | **SAFE WITH GUARDS** |

**Required guards before activation:**
1. Add `spec._suppressHooks: true` flag to orchestrator.js to prevent duplicate telemetry on intermediate retry attempts
2. Reduce `maxAttempts` to 2 (not 3) since internal retries already cover 3 attempts — outer retry should be for transient failures only
3. Consider filtering to TIMEOUT/API failure types only: `buildRetryChain` should skip outer retries for NO_FILES/SYNTAX/REVIEW/VALIDATION (already handled internally)

---

## Opportunity 2 — reflection-engine.js: `generateReflectionLesson()` in `_reflector()`

### A. Call Site Verification

**Proposed insertion:** `agent-system/orchestrator.js`, replace `_callClaude()` call inside `_reflector()` at line 740–767

**Actual code at that location:**
```js
async function _reflector(spec, agentLogs, success) {
    const SYSTEM = `...`;
    const summary = agentLogs.slice(-4).map(l =>
        `${l.role}: ${JSON.stringify(l.result || {}).slice(0, 150)}`).join('\n');
    try {
        const reflexModel = M.HAIKU;
        const res = await _callClaude(reflexModel, SYSTEM,
            `Task: ${spec.objective}\nOutcome: ${success ? 'SUCCESS' : 'FAILURE'}\nPipeline:\n${summary}`,
            100, 'REFLECTOR');
        const lesson = res.content[0]?.text?.trim();
        if (lesson && lesson.length > 10) {
            memory.logLesson(`[Auto-Reflexion] ${lesson}`);
            try { _indexer.indexLesson(`[Auto-Reflexion] ${lesson}`); } catch {}
        }
    } catch (e) { console.warn('[Reflector] skipped (non-fatal):', e.message); }
}
```

**`generateReflectionLesson` signature:**
```js
async function generateReflectionLesson(spec, agentLogs, success, existingLesson)
```

**Call site exists: CONFIRMED.** Proposed replacement is structurally valid.

### B. Input Availability

| Input | Required | Available at `_reflector` call site | Status |
|-------|----------|--------------------------------------|--------|
| `spec` | yes | `spec` — param | ✓ |
| `agentLogs` | yes | `agentLogs` — param | ✓ |
| `success` | yes | `success` — param | ✓ |
| `existingLesson` | yes (4th arg) | NOT present in current `_reflector` — must be fetched | **GAP** |

**Gap detail:** `generateReflectionLesson` uses `existingLesson` as: `"Existing lesson: ${existingLesson || 'none'}"` in the Claude prompt. In the current `_reflector`, there is no `existingLesson` variable. The caller would need to add: `const existingLesson = memory.getRecentLessons(1)` or pass `null`. `memory` is in scope inside `_reflector`. This is a one-line fix.

### C. Output Contract Verification

**`scoreLessonText()` return type mismatch — IMPLEMENTATION BUG IN ROI REPORT**

The ROI report proposed:
```js
const quality = _rf.scoreLessonText(lesson);
if (quality !== null) console.log(`[REFLECTOR] lesson quality: ${quality.toFixed(2)}`);
```

Actual `scoreLessonText` return (reflection-engine.js:32–47):
```js
return {
    confidence:  +confidence.toFixed(3),
    recency:     +recency.toFixed(3),
    actionScore: +actionScore.toFixed(2),
    composite:   +(confidence * 0.4 + recency * 0.3 + actionScore * 0.3).toFixed(3),
};
```

`scoreLessonText` **always returns an object, never null or a number.** The proposed `quality.toFixed(2)` would throw `TypeError: quality.toFixed is not a function`. The correct call is `quality.composite.toFixed(3)`. Additionally, `if (quality !== null)` is always true — the guard does nothing. This is a broken implementation that would cause a runtime error inside the try/catch (silently swallowed, but still wrong).

**`_callClaude` vs direct API call — cost tracking gap:**

The current `_reflector` uses `_callClaude(reflexModel, SYSTEM, ..., 100, 'REFLECTOR')` which:
- Adds token counts to `_agentTokens['REFLECTOR']`
- Adds cost to `_costUsd`
- These feed the audit log: `cost_usd` field in `apex_agent_runs`

`generateReflectionLesson` calls `client.messages.create()` directly, bypassing `_callClaude`. REFLECTOR cost (~$0.00001 per call at Haiku pricing) would be untracked in `_costUsd` and `_agentTokens`. Negligible financial impact but introduces a telemetry blind spot. The audit log's `cost_usd` would slightly undercount real cost.

**`[Auto-Reflexion]` prefix:**

The current `_reflector` prepends `[Auto-Reflexion]` to lessons: `memory.logLesson('[Auto-Reflexion] ' + lesson)`. `generateReflectionLesson` returns the raw lesson string. The prefix would need to be added manually after the call.

**obsidian-memory module path match:**

`generateReflectionLesson` requires `./obsidian-memory` internally (as `localMemory`). The orchestrator's `memory` object is also `require('./obsidian-memory')` (same module). Both call `getRecentLessons()` which is confirmed exported at obsidian-memory.js:129. **No import conflict.**

**`generateReflectionLesson` internal call to `localMemory.getRecentLessons(8)`:**

This is called from within `generateReflectionLesson` regardless of what `existingLesson` is passed. Both the `existingLesson` parameter AND the `rawLessons = localMemory.getRecentLessons(8)` are passed to Claude. If `existingLesson = memory.getRecentLessons(1)` is passed as the 4th arg, AND `generateReflectionLesson` internally calls `getRecentLessons(8)`, there is an overlap — Claude sees a subset of `existingLesson` within `rawLessons`. This is not a bug (just slight redundancy in the prompt), but it's worth noting.

### D. Risk Analysis

**RISK 1 — `scoreLessonText()` TypeError (HIGH severity — implementation error in ROI report)**  
Calling `quality.toFixed(2)` on an object throws TypeError. This error is inside the `setImmediate` try/catch wrapping `_reflector`, so it's non-fatal — but the score logging silently fails. **Patch required before activation.**

**RISK 2 — Cost tracking gap (LOW severity)**  
Haiku REFLECTOR cost is ~$0.00001/call. Untracked cost is negligible but creates a permanent discrepancy in cost metrics. Acceptable trade-off.

**RISK 3 — Async hazard: setImmediate timing**  
`_reflector` is called via `setImmediate(() => _reflector(...).catch(...))` in orchestrator.js (lines 944, 1110, 1135). `generateReflectionLesson` is async and makes an API call. No await chain is present in the outer setImmediate call. This is the same pattern as the existing `_reflector` — both are fire-and-forget. **No new async hazard.**

**RISK 4 — Fallback behavior when API is unavailable**  
Current `_reflector`: if `_callClaude` throws, the catch block logs a warning and exits silently — no lesson written.  
`generateReflectionLesson`: returns `existingLesson` on failure. If `existingLesson` is the last lesson from `getRecentLessons(1)`, the "lesson" logged would be a pre-existing lesson repeated — noise in Lessons.md. **Patch: pass `existingLesson = null` or `''` to get clean fallback behavior.**

**Guard required to activate safely:**
1. Fetch `existingLesson` inside `_reflector`: `const existingLesson = memory.getRecentLessons(1) || null`
2. Fix `scoreLessonText` usage: `quality.composite.toFixed(3)` not `quality.toFixed(2)`
3. Add `[Auto-Reflexion]` prefix: `memory.logLesson('[Auto-Reflexion] ' + lesson)`

### E. Activation Assessment

| Metric | Value |
|--------|-------|
| Implementation effort | 1h (3 patches + wiring, all within orchestrator.js) |
| Rollback effort | LOW — revert `_reflector` body only |
| Expected telemetry gain | Per-lesson composite quality score logged; lesson deduplication active; `analyzeFailures()` downstream quality improves over time |
| Expected autonomy gain | +0.2 net on autonomy score (indirect via lessonUsefulness in self-evaluator) |
| Activation confidence | **SAFE WITH GUARDS** |

---

## Opportunity 3 — adaptive-planner.js: `splitTask()` in `assignWork()`

### A. Call Site Verification

**Proposed insertion:** `agent-system/multi-agent-coordinator.js`, after `planToSpecs(plan)` at line 171, before `runParallel(specs)` at line 188

**Actual code at that location (lines 163–212):**
```js
async function assignWork(goal, options = {}) {
    const { simulate = false, concurrency = ..., maxSubtasks = 5 } = options;

    const plan  = await decomposeGoal(goal, { simulate, maxSubtasks });
    const specs = planToSpecs(plan);    // line 171

    if (simulate) { return {...}; }

    let _planRecord = null;
    try { _planRecord = _pqr.createPlanRecord(plan); } catch {}  // line 186

    const results = await runParallel(specs, {...});              // line 188
```

**Call site exists: CONFIRMED.** The proposed insertion between lines 171 and 186 is exactly where `specs` is available after transformation and before execution.

### B. Input Availability

| Input | Required | Available at call site | Status |
|-------|----------|----------------------|--------|
| `specs` | yes | `const specs = planToSpecs(plan)` — line 171 | ✓ |
| `_ap.isOversized` | yes | via `require('./adaptive-planner')` | ✓ |
| `_ap.splitTask` | yes | via same require | ✓ |
| `adaptive-planner` dependencies | — | requires `./task-planner` (already in coordinator), `@anthropic-ai/sdk` (already installed) | ✓ |

**Note:** `splitTask` does NOT make an API call. Only `replan()` in adaptive-planner uses Claude. `splitTask` is pure synchronous JavaScript — no async, no API, no I/O.

### C. Output Contract Verification

**`isOversized()` threshold — DISCREPANCY WITH ROI REPORT:**

ROI report stated: `filesToModify.length > 3 OR steps.length > 6`  
Actual code (adaptive-planner.js:22–26):
```js
function isOversized(spec) {
    const files = (spec.filesToModify || []).length + (spec.filesToCreate || []).length;
    const steps = (spec.steps || []).length;
    return files > 4 || steps > 7;
}
```

**Actual thresholds: `(filesToModify + filesToCreate) > 4 OR steps > 7`** — higher than the ROI report claimed, and includes `filesToCreate` in the file count. This means fewer tasks will be split in practice than the report projected.

**`splitTask()` output count — DISCREPANCY WITH ROI REPORT:**

ROI report stated: "returns array of 2 sub-specs"  
Actual code (adaptive-planner.js:29): `function splitTask(spec, maxParts = 3)` — default is **3 parts**, not 2. A large task could be split into up to 3 sub-specs.

**`createPlanRecord` schema compatibility:**

ROI proposed: `createPlanRecord({...plan, subtasks: specs})`  
`createPlanRecord` reads `decomposeResult.subtasks` for: `.length`, `.steps?.length`, `.filesToModify?.length`, `.filesToCreate?.length` (planning-quality-registry.js:81–84).

Specs (from `planToSpecs`) have: `filesToModify`, `filesToCreate`, `steps`, `objective` — all the fields `createPlanRecord` accesses. The extra fields in specs (`_planComplexity`, `_planRisk`) are ignored by `createPlanRecord`. **Schema compatible for the accessed fields.**

**Sub-spec field preservation:**

`splitTask` uses `...spec` spread — all `_planComplexity`, `_planRisk`, `_selectedTier`, `_agentCategory` fields from the original spec are preserved in sub-specs. The `runAgentTeam` call in `_worker` reads `spec._selectedTier` and `spec._agentCategory` — these survive the split. ✓

**`_splitPart` and `_splitFrom` metadata:**

`splitTask` adds `_splitPart: partNum` and `_splitFrom: spec.objective` to each sub-spec. These are new fields not consumed by any current downstream code. They are additive and inert. ✓

**Objective string modification:**

`splitTask` appends `[part 1/2]` or `[steps 1–4]` to `spec.objective`. Downstream effects:
- `_auditLog`: `objective` capped at 255 chars — safe
- `_adaptEngine.learn(spec, ...)`: spec.objective has part suffix — slightly pollutes category detection, but category detection uses regex that would still match the base objective keywords
- `_goalTracker.startGoal(taskId)` uses taskId not objective — unaffected

### D. Risk Analysis

**RISK 1 — Performance: concurrent split sub-specs (LOW severity)**  
The coordinator runs with `DEFAULT_CONCURRENCY = 2`. If a task splits into 3 sub-specs, the concurrency cap still applies. The third sub-spec waits for one of the first two to finish. No new concurrency hazard — just 3 sequential/parallel runs instead of 1.

**RISK 2 — Budget: split tasks cost more (LOW severity)**  
A single oversized task (e.g., 5 files, 8 steps) would become 2–3 sub-tasks, each running the full 8-agent pipeline. Total cost could be 2–3× the single-task cost. For the target threshold (files > 4 OR steps > 7), these are already the most expensive tasks. The DEVELOPER stage is the most expensive per task, so splitting adds cost. This is an intentional trade-off (quality over cost) but should be documented.

**RISK 3 — `createPlanRecord` receives modified spec count (LOW severity)**  
After splitting, `createPlanRecord({...plan, subtasks: specs})` receives `specs` (which may include split sub-specs) instead of `plan.subtasks` (original). The `subtaskCount` in the plan record would reflect post-split count. This is accurate but differs from the pre-split count. The planning-quality-registry `getBestPatterns()` and `getWorstPatterns()` might see distorted `subtaskCount` averages. Acceptable: the count is MORE accurate post-split.

**RISK 4 — Parallel split of same file (MEDIUM severity)**  
If a file appears in multiple sub-specs (due to the `filesToModify` chunking in `splitTask`), two `_worker` goroutines could attempt to modify the same file concurrently. However:
- `splitTask` distributes files exclusively — each file goes to exactly ONE chunk (line 39: `chunk = allFiles.slice(i, i + chunkSz)`)
- The split preserves the original `filesToModify`/`filesToCreate` classification
- **File duplication across sub-specs is impossible by construction.** ✓

**No guards required for safe activation.** This is the cleanest of all three opportunities.

### E. Activation Assessment

| Metric | Value |
|--------|-------|
| Implementation effort | 30min (require + 2-line insertion in assignWork) |
| Rollback effort | LOW — remove require and flatMap line |
| Expected telemetry gain | `planning-quality-registry` records gain accurate post-split `subtaskCount`; `wasReplanned` tracking becomes meaningful; adaptation engine sees reduced DEVELOPER failure rate for oversized tasks over time |
| Expected autonomy gain | +0.6 on `executionSuccess` dimension at 50+ runs; +0.2–0.4 at 10+ runs |
| Activation confidence | **SAFE** |

---

## Opportunities 4 and 5 — Already Live (Audit Correction)

### Opportunity 4 — `_spe.updateFromResponse()` — ALREADY IMPLEMENTED

**Evidence from server.js:**
- Line 7359: `_spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply: _agentReply, intent: _agentIntent2, mode: _agentMode });` (agent response branch)
- Line 7411: `_spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply, intent: _mastraIntent, mode: _mastraMode });` (Mastra branch)
- Line 7456: `_spe.updateFromResponse({ sessionId: req.conversationId, userMessage, reply, intent: _sdkIntent, mode: _sdkMode });` (SDK/Claude branch)

All required inputs (`sessionId`, `userMessage`, `reply`, `intent`, `mode`) are present at all three call sites. The function signature at strategic-planning-engine.js:478 matches exactly.

Additionally:
- `_spe.resumeStrategicContext()` is called at line 7332 (pre-response context loading)
- `_eae.generateExecutiveSnapshot()` is called at line 7331

**Stage 3.5 is ACTIVE. No activation needed.**

### Opportunity 5 — `_eae.recordTransition()` — ALREADY IMPLEMENTED

**Evidence from server.js:**
- Line 7358: `_eae.recordTransition({ sessionId: req.conversationId });` (agent branch)
- Line 7410: `_eae.recordTransition({ sessionId: req.conversationId });` (Mastra branch)
- Line 7455: `_eae.recordTransition({ sessionId: req.conversationId });` (SDK branch)

The function signature at executive-arbitration-engine.js:458 takes `{ sessionId }` — matches exactly.

**Stage 3.4 is ACTIVE. No activation needed.**

---

## Risk Matrix

| Risk | Opportunity | Severity | Guards Required |
|------|------------|----------|-----------------|
| Double retry layer (internal 3× + external 3×) | #1 executeWithRecovery | HIGH | Reduce outer maxAttempts to 2; filter to TIMEOUT/API only |
| Duplicate telemetry on recovered failures | #1 executeWithRecovery | HIGH | `spec._suppressHooks` flag in orchestrator.js |
| Internal/external escalation conflict | #1 executeWithRecovery | MEDIUM | Skip selectFallbackConfig when internal escalation is already active |
| `scoreLessonText()` returns object not number | #2 generateReflectionLesson | HIGH | Fix to `quality.composite.toFixed(3)` |
| `existingLesson` not available at call site | #2 generateReflectionLesson | MEDIUM | Add `const existingLesson = memory.getRecentLessons(1)` |
| API fallback returns stale lesson | #2 generateReflectionLesson | LOW | Pass `existingLesson = null` to get clean fallback |
| Cost tracking bypass | #2 generateReflectionLesson | LOW | Accept or add manual cost increment |
| `[Auto-Reflexion]` prefix missing | #2 generateReflectionLesson | LOW | Add prefix after return |
| isOversized threshold higher than reported | #3 adaptive-planner | LOW — documentation only | Update threshold documentation |
| splitTask may return 3 parts not 2 | #3 adaptive-planner | LOW — documentation only | Update documentation |
| Cost increase on split tasks | #3 adaptive-planner | LOW | Document trade-off |
| Opportunities 4/5/6 already live | N/A | **AUDIT CORRECTION** | No action needed |

---

## Activation Confidence Scores

| Opportunity | Confidence | Reason |
|------------|------------|--------|
| #3 adaptive-planner.splitTask | **SAFE** | Pure JS, no API, no side effects, additive only, no guards needed |
| #2 reflection-engine.generateReflectionLesson | **SAFE WITH GUARDS** | 3 documented patches needed; all are trivial 1-line fixes |
| #1 execution-recovery.executeWithRecovery | **SAFE WITH GUARDS** | Requires orchestrator.js modification for hook suppression; without it: data integrity risk in adaptation engine |
| #4 SPE.updateFromResponse | N/A — **ALREADY LIVE** | server.js:7359, 7411, 7456 |
| #5 EAE.recordTransition | N/A — **ALREADY LIVE** | server.js:7358, 7410, 7455 |

---

## Revised Activation Rankings

### 1. Safest Activation

**Opportunity 3 — adaptive-planner.splitTask**  
- `SAFE` confidence — zero guards required
- Pure synchronous JS, no API calls, no new I/O
- Additive: one require + one flatMap in assignWork()
- Rollback: two lines removed
- **Activate this first.**

### 2. Highest ROI Activation

**Opportunity 1 — execution-recovery.executeWithRecovery**  
- +0.4 on `recovery` autonomy dimension is the largest single-dimension gain available
- Fills `recoveryRate()` in autonomy-metrics which is currently returning null
- Activates `self-evaluator._scoreRecovery()` with real data
- BUT: highest implementation complexity (3 files affected if orchestrator hook suppression added)
- **Activate after guards are in place.**

### 3. Best Autonomy-Score Activation

**Opportunity 1 — execution-recovery.executeWithRecovery (+0.4)**  
The `recovery` dimension weight (0.20) and expected value improvement (0.5 → 0.7) produces the largest single-opportunity score increase:
```
(0.70 - 0.50) × 0.20 × 10 = +0.4 points
```
Followed by:
- Opportunity 3 (+0.2–0.6 on executionSuccess, but requires 50+ runs to materialize)
- Opportunity 2 (+0.2 indirect, via self-evaluator lessonUsefulness, after many runs)

### 4. Best Telemetry Activation

**Opportunity 1 — execution-recovery.executeWithRecovery**  
Activates the most previously-empty telemetry fields simultaneously:
- `planning-quality-registry.recoveryCount` per plan record (currently always 0)
- `autonomy-metrics.recoveryRate()` (currently returns null)
- `self-evaluator._scoreRecovery()` (currently uses default 0.5)
- `adaptation-engine` recovery-based routing signals

Followed by Opportunity 3 which enriches `planning-quality-registry.subtaskCount` and `wasReplanned` fields.

---

## Recommended Next Activation

**Activate in this order:**

### Step 1 — adaptive-planner.splitTask (Opportunity 3)
- File: `agent-system/multi-agent-coordinator.js` only
- 2 lines added: `const _ap = require('./adaptive-planner')` at top of file + `specs = specs.flatMap(s => _ap.isOversized(s) ? _ap.splitTask(s) : [s])` before `createPlanRecord` call
- Validate: `node --check agent-system/multi-agent-coordinator.js`
- Zero risk. Activate without further analysis.

### Step 2 — generateReflectionLesson (Opportunity 2)
- File: `agent-system/orchestrator.js` only — `_reflector` function (lines 740–767)
- Required patches (all 1-line fixes):
  1. Add `const existingLesson = memory.getRecentLessons(1) || null` before the try block
  2. Replace `_callClaude(reflexModel, ...)` → `await _rf.generateReflectionLesson(spec, agentLogs, success, existingLesson)`
  3. Replace `memory.logLesson(...)` call to prefix: `memory.logLesson('[Auto-Reflexion] ' + lesson)`
  4. Fix scoreLessonText usage: `quality.composite.toFixed(3)` not `quality.toFixed(2)`
- Validate: `node --check agent-system/orchestrator.js`

### Step 3 — executeWithRecovery (Opportunity 1)
- **Do not activate until Step 1 and 2 are validated in production.**
- Requires additional design: decide between (a) orchestrator `_suppressHooks` flag or (b) outer retry scoped to TIMEOUT/API failures only
- Pre-condition: at least 8 real pipeline runs to establish baseline adaptation-engine data before polluting it with retry noise

---

## Audit Correction Notice

The following items from `reports/runtime-roi-ranking-v2.md` require correction:

| Item | Prior classification | Corrected classification |
|------|---------------------|--------------------------|
| `_spe.updateFromResponse()` | COLD — 0 callers | LIVE — 3 call sites in server.js |
| `_eae.recordTransition()` | COLD — 0 callers | LIVE — 3 call sites in server.js |
| `_timingEng.buildStreamPlan()` | COLD — 0 callers | LIVE — 3 call sites in server.js |
| `_eae.generateExecutiveSnapshot()` | COLD — 0 callers in server.js | LIVE — called at server.js:7331 |
| `_spe.resumeStrategicContext()` | COLD — 0 callers | LIVE — called at server.js:7332 |
| Stage 3.4 (EAE) | PARTIAL — output unconsumed | ACTIVE — all key functions called |
| Stage 3.5 (SPE) | PARTIAL — updateFromResponse never called | ACTIVE — called on all response paths |

The isOversized thresholds and splitTask output count in the ROI report also require correction:
- Threshold: `(filesToModify + filesToCreate) > 4 OR steps > 7` (not `filesToModify > 3 OR steps > 6`)
- Max parts: `splitTask(spec, maxParts = 3)` returns up to 3 parts (not always 2)

---

## No Code Was Modified

This report is observational only. All findings are based on reading source files. No production code was altered.
