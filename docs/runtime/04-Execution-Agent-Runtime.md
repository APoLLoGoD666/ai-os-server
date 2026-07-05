# 04 — Execution Agent Runtime

**Date:** 2026-07-02  
**Evidence Source:** lib/agent-task-cycle.js, agent-system/dynamic-agent-selector.js, runtime/task-router.js, agent-system/execution-verifier.js, agent-system/adaptation-engine.js, agent-system/reflection-engine.js, agent-system/goal-tracker.js, agent-system/master-orchestrator.js

---

## Two Agent Execution Paths

APEX has two distinct agent execution paths that do NOT share the same entry point:

| Path | Entry Point | Purpose |
|------|------------|---------|
| **Task cycle** | `lib/agent-task-cycle.js` | Executes individual approved tasks (document/file operations) |
| **Feature pipeline** | `agent-system/master-orchestrator.js` → `agent-system/orchestrator.js` | Builds full software features from ROADMAP.md |

---

## runtime/task-router.js — Inbound Routing

**File:** `runtime/task-router.js`  
**Called by:** `runAgentPlanningCycle` before planning begins

### route(request) — Decision Tree (strictly sequential)

```
Input: { objective, filesToModify?, taskId?, source? }

1. ESCALATION check FIRST
   └── Patterns: kill.switch|constitution|shutdown|delete.all|drop.table|purge.memory|
                 override.safety|disable.governance
   └── Match → route: 'founder_escalation', priority: 'critical', requiresApproval: true

2. EXECUTIVE routing (6 entities, checked in order)
   └── cso: strategy|roadmap|initiative|goal|mission|...
   └── cio: memory.policy|retention|cognitive.policy|...
   └── cfo: budget|spend|cost.cap|billing|...
   └── cto: architect|deploy.strategy|migration|breaking.change|...
   └── coo: pipeline.fail|cron.schedule|incident|...
   └── cgo: new.feature|opportunity|experiment|...
   └── Skip if _looksLikeCode(objective) [code tasks bypass executive routing]
   └── Match → route: 'executive_runtime', entity: <id>

3. RESEARCH routing
   └── Patterns: research|look.up|find.info|what.is|api.docs|...
   └── Skip if _looksLikeCode(objective)
   └── Match → route: 'research_system'

4. AGENT PIPELINE (default)
   └── Complexity classification:
       - critical: auth/password/secret/api.key/jwt/sql.inject/xss/...
       - complex: refactor|architect|embed|vector|multi.step|integrat|...
       - simple: add.route|fix.typo|update.text|config|stub|rename|...
       - moderate: anything else
   └── route: 'agent_pipeline'
```

---

## lib/agent-task-cycle.js — Task Execution

**File:** `lib/agent-task-cycle.js`  
**Internal agent ID:** `_TASK_CYCLE_AGENT_ID = '00000000-0000-4000-8000-000000000002'`

### Allowed Step Types (hard allowlist — 8 types only)

```
create_document, create_workspace_file, summarize_document, rename_document,
delete_document, list_documents, list_files, search_documents
```

Any step type NOT in this allowlist → **fatal validation error** in `validateAgentSteps()`. Task is immediately rejected. No other step types can be executed through this path.

### runAgentPlanningCycle(taskId) — Task Planning

Two sequential LLM calls:

**LLM Call 1: buildAgentPlan** — `tier: 'balanced'`, 700 tokens
- Inputs: last 8 memory items, documents, workspace files, standing approvals
- Output: human-readable plan text

**LLM Call 2: getApprovedAgentActions** — `tier: 'balanced'`, 700 tokens
- Inputs: plan text from call 1
- Output: JSON steps array (same 8-type allowlist enforced in prompt)
- On JSON parse failure → `null` → fallback to `buildSafeDefaultDiscoverySteps()`

```
Task status transitions during planning:
  planned → running (briefly, internal) → waiting_approval | completed | failed
```

### executeApprovedAgentTask(taskId) — Step Execution

**Autonomy gate (critical):**
- AUTONOMY_LEVEL 1 or 2 → return `status: 'pending_approval'` immediately, NO execution
- AUTONOMY_LEVEL 3 → proceed to execution

**Step execution sequence:**
```
1. Fetch task from DB
2. Autonomy level check (exit if AUTONOMY_LEVEL < 3)
3. Get current step (steps[current_step])
4. normalizeExecutableAgentStep() — validate and normalize
5. findPendingDuplicateForSteps() — dedup check
6. Set status → 'approved' then immediately → 'running'
7. executeApprovedAgentActions([step]) — actual execution
8. setImmediate: pgInsertToolExecution() — async tool log
9. On success: compute next status, update DB
10. On failure: set status 'failed', log, notify
```

**Next status logic:**
- If next step is a write action → `waiting_approval`
- If next step is safe-auto → continue `running`
- If no more steps → `completed`

### autoRunReadOnlyTaskSteps(taskId) — Chained Execution

Loops up to **10 steps** without human approval:

```
while (stepsExecuted < 10) {
  step = getNextStep()
  if (!shouldAutoRunTaskAction(step)) {
    if (standingApproval exists) → check canAutoRunLevel3Action()
    else → set waiting_approval, return
  }
  executeApprovedAgentTask(taskId, { autoMode: true, chainMode: true })
  stepsExecuted++
}
// After 10 steps → set waiting_approval (paused), return
```

At 10 steps: task paused at `waiting_approval` — NOT completed. Human must re-approve.

### runDueSchedules() — Cron Entry Point

```
pgGetDueAgentSchedules()
  → for each schedule (sequential, NOT parallel):
      runSingleScheduleOnce(schedule)
        1. pgCreateAgentTask() — new task
        2. pgUpdateAgentScheduleLastRun()
        3. runAgentPlanningCycle() — planning LLM calls
        4. if AUTONOMY_LEVEL >= 2: autoRunReadOnlyTaskSteps()
        5. setImmediate: governance_instrumentation.emitStart/End()
        6. setImmediate: execution_orchestrator.process()

  → On completion: _gateway.storeMemory (Layer 2) + reflexion influence tracking
```

---

## dynamic-agent-selector.js — Model Tier Selection

**File:** `agent-system/dynamic-agent-selector.js`

### 3-Pass Escalation Logic

**selectAgentConfig(spec)** applies 3 passes in order:

**Pass 1 — Category escalation (based on historical success rates)**
- Queries `apex_agent_runs` (up to 200 rows, last 30 days)
- Filters by detected category (8 categories: auth, database, frontend, api, voice, agent, memory, ops)
- If `successRate < 0.55` → escalate one tier
- Else if `avgDurationMs > 120000` (2 min) → escalate one tier

**Pass 2 — Stage reputation escalation**
- Calls `_reputation.getStageReputation('DEVELOPER')`
- Calls `_reputation.shouldPreEscalate('DEVELOPER', 0.55, 10)` (threshold 55%, min 10 samples)
- If DEVELOPER should pre-escalate → escalate one tier

**Pass 3 — Risk-based escalation**
- `riskScore >= 0.8` AND tier is simple or moderate → escalate one tier

**Cap:** Cannot exceed `critical` tier.

### Tier Model Assignments

| Tier | Architect | Developer | Reviewer |
|------|-----------|-----------|---------|
| simple | Haiku | Haiku | Haiku |
| moderate | Haiku | Sonnet | Haiku |
| complex | Sonnet | Sonnet | Sonnet |
| critical | Sonnet | Sonnet | Opus |

---

## execution-verifier.js — Post-Execution Verification

**File:** `agent-system/execution-verifier.js`  
**Storage:** No DB, no API — pure filesystem + `spawnSync`

### verifyOutput(spec, developerLog, root)

```
For each file in developerLog.result.applied:
  1. fs.existsSync(path)
  2. if .js file: spawnSync('node --check <file>', timeout: 10s)
  
passed = applied.length > 0 
      && missedTargets === 0 
      && syntaxFailed === 0 
      && emptyFiles === 0     (< 10 bytes = empty)
```

### Failure Classification and Retry Strategies

| Failure Type | Retry? | Escalate? | Delay |
|-------------|--------|-----------|-------|
| no_files_written | Yes | Yes | 0ms |
| syntax_error | Yes | Yes | 0ms |
| review_failed | Yes | No | 0ms |
| validation_failed | Yes | No | 0ms |
| budget_exceeded | **No** | **No** | 0ms |
| timeout | Yes | No | 5000ms |
| api_error | Yes | No | 15000ms |
| unknown | **No** | **No** | 0ms |

---

## adaptation-engine.js — Learning Loop

**File:** `agent-system/adaptation-engine.js`  
**Storage:** `<vault>/System/Adaptations/adaptation-registry.json` (disk) + `adaptation_cycles` (Supabase)

### When runCycle() Fires

- After every pipeline run where `fn` failed
- Every 5 pipeline runs (via `_cyclesSinceRun >= 5`)
- Via `adaptation-engine.learn()` call — non-blocking (setImmediate)

### 3-Pass Analysis

**Pass 1 — Stage Failures** (parallel with Pass 3):
- DEVELOPER stage failure >35% → escalate model tier
- DEVELOPER pre-escalation threshold 40% → use Sonnet on moderate tasks
- ARCHITECT high latency (>90s avg) → reduce context
- Any stage score <7/10 → escalate model tier

**Pass 3 — Category Routing** (parallel with Pass 1):
- For each of 8 categories: `getCategoryStats(cat, 40)`
- failure ≥35% → escalate tier for category
- success ≥82% → confirm current routing (stable)

**Pass 2 — Episodic Patterns** (sequential after Passes 1+3):
- DEVELOPER failures ≥4 → split large tasks
- COMMITTER failures ≥3 → increase retries
- REVIEWER failures ≥4 → use Sonnet reviewer
- Global failure ≥35% with ≥16 samples → increase max retries
- Global success ≥82% with ≥16 samples → mark stable

### Confidence Formula

```
confidence = volume × 0.4 + signal × 0.6

volume = min(1.0, sampleSize / 24)       ← saturates at 24 samples
signal = min(1.0, |signalRate - 0.5| × 2.5)  ← decisiveness of data
```

Adaptations with `confidence < 0.25` are discarded.

### TTL and Expiry

Adaptations expire after **7 days**. `getActiveAdaptations()` filters expired records.

---

## master-orchestrator.js — Feature Pipeline

**File:** `agent-system/master-orchestrator.js`

### Feature Execution Flow

```
parseRoadmap() → reads ROADMAP.md
  ├── finds all pending features (- [ ] FEAT-XXX: title)
  └── finds all completed features (- [x] FEAT-XXX: title)

runMasterOrchestrator()
  └── runs up to 3 workstreams concurrently
      └── for each workstream: runWorkstream() [sequential features]
          └── runFeature(feature)
              ├── 1. planFeature()
              │     ├── constitutionGate.evaluate() [DENY → abort]
              │     ├── _preClassifyFeature() [complexity: critical|complex|simple]
              │     ├── adaptation-engine.getRecommendationsFor({stage:'ARCHITECT'})
              │     ├── memory.getFullContextAsync() [Obsidian vault]
              │     └── runtime.execute() [Sonnet or Haiku, 60s timeout]
              ├── 2. Permission check
              │     ├── DB/migration/cron keywords → auto-approve
              │     └── OAuth/external service → insert permission notification → return
              ├── 3. runAgentTeam(spec, featureId) [orchestrator.js]
              ├── 4. On success:
              │     ├── markFeatureComplete() [git commit + push to GitHub]
              │     ├── _writeRetrospective() [Obsidian vault write]
              │     ├── _updateKanban('complete')
              │     └── memory.logFeature()
              └── 5. On failure:
                    ├── memory.logLesson()
                    └── insert feature_failed notification
```

### Git Push on Feature Complete

`markFeatureComplete()` runs:
```bash
git add ROADMAP.md
git commit -m "roadmap: mark FEAT-XXX complete [skip ci]"
git pull --rebase
git push origin main  ← via GITHUB_TOKEN to APoLLoGoD666/ai-os-server
```

GitHub token is masked in error messages. Non-fatal on git failures (feature marked complete regardless).

### Dependency Handling

Features with `dependsOn` field:
- Queries `apex_notifications` for `feature_complete` message containing `feature.dependsOn`
- If dependency not complete → `setTimeout(5 min)` deferred retry, skip current iteration
- This can cause indefinite waiting if dependency feature never completes

---

## Agent Execution Data Flow Summary

```
New task request
    │
    ▼
task-router.js route()
    ├── founder_escalation → Slack alert, manual intervention required
    ├── executive_runtime → executive-council.js deliberate()
    ├── research_system → research agents
    └── agent_pipeline → agent-task-cycle.js
                │
                ▼
        runAgentPlanningCycle(taskId)
            ├── LLM Call 1: buildAgentPlan [Balanced/Sonnet]
            └── LLM Call 2: getApprovedAgentActions [Balanced/Sonnet]
                → validateAgentSteps() [8-type allowlist]
                → DB: set task waiting_approval
                │
                ▼
        [Human approves OR AUTONOMY_LEVEL=3]
                │
                ▼
        autoRunReadOnlyTaskSteps() [up to 10 steps]
            └── executeApprovedAgentTask() per step
                    ├── dynamic-agent-selector.selectAgentConfig()
                    │     ├── getCategoryStats() [reads apex_agent_runs]
                    │     └── 3-pass escalation
                    ├── Execute step action
                    ├── execution-verifier.verifyOutput() [filesystem check]
                    └── adaptation-engine.learn() [background]
                │
                ▼
        [On completion]
        reflexion-tracker.recordInfluence()
        gateway.storeMemory(Layer 2)
```
