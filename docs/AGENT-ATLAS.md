# AGENT ATLAS
## Document 8 of 17 — Complete Agent Execution Architecture
**Generated:** 2026-06-16 | **Baseline Commit:** f77a36d (CERTIFIED)

---

## OVERVIEW

The APEX AI OS agent system is an **autonomous code-modification pipeline** that can write, review, test, and deploy code changes to production without human intervention (when AUTONOMY_LEVEL >= 1 and all pre-execution gates pass).

**Primary file:** `agent-system/orchestrator.js`
**Entry point:** `runtime/task-router.js` → `routes/agents.js` → `orchestrator.js`
**Cost budget:** `PIPELINE_BUDGET_USD` (default: $2.00 per run)
**AI model:** Configured via `ANTHROPIC_MODEL` env var (optional override)
**Audit tables:** `apex_agent_runs`, `apex_agent_stages`

---

## 5 PRE-EXECUTION GATES

All 5 gates must pass before the 6-stage pipeline begins. Any gate failure aborts execution.

```
Task submitted
    │
    ▼
GATE 1: CONSTITUTIONAL GATE
    └─→ Check founder_anti_goal_alerts for active alerts
        └─→ PASS: No active anti-goal violations
        └─→ FAIL: Block — task violates founder anti-goals
    │
    ▼
GATE 2: AUTONOMY GATE
    └─→ Read AUTONOMY_LEVEL env var
        └─→ LEVEL_0: BLOCK ALL pipeline executions
        └─→ LEVEL_1+: PASS (subject to other gates)
    │
    ▼
GATE 3: TWIN GATE
    └─→ Check latest digital_twin_simulations
        └─→ Result='do_not_deploy': BLOCK
        └─→ Result=other: PASS
    │
    ▼
GATE 4: DEPLOY GATE
    └─→ Check deployment_policy setting
        └─→ Policy='hold': BLOCK
        └─→ Policy=other: PASS
    │
    ▼
GATE 5: BEHAVIOR GATE
    └─→ Check behavioral_modifications WHERE active=true AND type='blocking_constraint'
        └─→ Blocking constraint exists: BLOCK
        └─→ No blocking constraints: PASS
    │
    ▼
6-STAGE PIPELINE BEGINS
```

**Autonomy levels confirmed:**
- LEVEL_0: Blocks ALL pipeline execution (GATE 2 fails immediately)
- LEVEL_1: Supervised — pipeline runs with restrictions
- LEVEL_2: Standard autonomous operation
- LEVEL_3: Full autonomy (currently active per CLAUDE.md)

---

## 6-STAGE PIPELINE

### Stage 1: RESEARCHER (Optional)

| Field | Value |
|---|---|
| Name | RESEARCHER |
| Optional | YES — skipped if task requires no research |
| Primary tool | Firecrawl API (web scraping) |
| Fallback | Playwright browser automation (if Firecrawl unavailable) |
| Output | Research context for ARCHITECT |
| Audit | INSERT apex_agent_stages (stage='RESEARCHER') |

---

### Stage 2: ARCHITECT

| Field | Value |
|---|---|
| Name | ARCHITECT |
| Required | YES |
| Output | Implementation plan with Zod schema validation |
| Context | Episodic memory + adaptation context injected |
| Validation | Zod schema validation of plan structure |
| Audit | INSERT apex_agent_stages (stage='ARCHITECT') |

**Key:** ARCHITECT output is Zod-validated. Invalid plans cause stage failure (not skipped).

---

### Stage 3: DEVELOPER

| Field | Value |
|---|---|
| Name | DEVELOPER |
| Required | YES |
| Output | Per-file code writes |
| Max tokens | 8,096 tokens per file write |
| Retry | 3-retry loop via `callWithBackoff()` |
| Backoff delays | 15s / 30s / 45s (3 attempts) |
| Circuit breaker | `callWithBackoff` — fails after 3 retries |
| Audit | INSERT apex_agent_stages (stage='DEVELOPER') per file |

---

### Stage 4: REVIEWER + VALIDATOR (Parallel)

> **CRITICAL:** Both REVIEWER and VALIDATOR must pass. They run in parallel.

#### REVIEWER
| Field | Value |
|---|---|
| Name | REVIEWER |
| Type | AI code review |
| Runs | Parallel with VALIDATOR |
| Must Pass | YES — if REVIEWER fails, pipeline stops |

#### VALIDATOR
| Field | Value |
|---|---|
| Name | VALIDATOR |
| Type | Static code analysis ONLY (no code execution) |
| Runs | Parallel with REVIEWER |
| Must Pass | YES — if VALIDATOR fails, retry triggered (with conditions) |

**VALIDATOR BEHAVIOR (detailed):**

| Condition | Result |
|---|---|
| testCases=[] | Auto-pass (FAIL-OPEN — no tests to validate) |
| filesApplied=[] | Auto-pass (FAIL-OPEN — no files to validate) |
| Exception or parse failure | passed=false (fail-closed via WS-1B fix) |
| Non-boolean `passed` field | Coerced to false (normalization block) |
| passed=false AND failedCases.length > 0 | Retry triggered |
| passed=false AND failedCases=[] | **NO RETRY** (dispatch gap — both conditions required) |

**VALIDATOR Gap (residual risk):** When `passed=false` but `failedCases=[]`, the dispatch gate condition requires BOTH `!passed AND failedCases.length > 0`. Since failedCases is empty, the retry is NOT triggered. The pipeline proceeds as if validation passed.

**Static analysis only:** VALIDATOR runs `node --check` for syntax validation. It cannot detect:
- Runtime errors
- Logic bugs
- Integration failures
- Missing dependencies (require() path errors)
- Type errors at runtime

---

### Stage 5: TESTER

| Field | Value |
|---|---|
| Name | TESTER |
| Type | Syntax check per modified JS file |
| Command | `node --check <file>` for each modified JS file |
| Output | Pass/fail per file |
| Audit | INSERT apex_agent_stages (stage='TESTER') |

**Note:** TESTER also runs `node --check` — same limitation as VALIDATOR. Phase 29B incident (MODULE_NOT_FOUND) was NOT caught by TESTER because require() path errors only manifest at runtime, not during syntax check.

---

### Stage 6: COMMITTER

| Field | Value |
|---|---|
| Name | COMMITTER |
| Type | Git commit + push + deploy trigger |
| Isolation | Git worktree isolation (separate working directory) |
| Commit | `git commit -m "[task description]"` |
| Push | `git push` to remote |
| Deploy | POST to Render API (empty body) OR auto-detect on git push |
| Audit | INSERT apex_agent_stages (stage='COMMITTER') |
| Risk | IRREVERSIBLE — commits to production branch |

---

## POST-PIPELINE: REFLECTOR

**Triggered:** After successful pipeline completion
**AI model:** Claude Haiku (cost-optimized)
**Purpose:** Extract lesson from completed task
**Output:** Lesson stored via `gateway.storeMemory(layer: 10)` → `apex_lessons`

```
Pipeline complete
    └─→ REFLECTOR runs (Haiku model)
        └─→ Analyze task, stages, outcomes
            └─→ Extract lesson text
                └─→ obsidian-memory.js logLesson()
                    └─→ gateway.storeMemory(layer: 10)
                        └─→ INSERT apex_lessons (task_id, trace_id, content)
```

---

## COST TRACKING

| Field | Value |
|---|---|
| Variable | ctx.costUsd |
| Budget env | PIPELINE_BUDGET_USD (default $2.00) |
| Gate | If ctx.costUsd > PIPELINE_BUDGET_USD → abort pipeline |
| Table | cost_accounting (tokens_in, tokens_out, cost_usd per stage) |
| Alert | Budget exceeded triggers incident creation |

---

## COMPLEXITY CLASSIFICATION

Tasks are classified before pipeline execution:

| Class | Definition | Pipeline Behavior |
|---|---|---|
| simple | Single file, low risk | Standard pipeline |
| moderate | Multi-file, medium risk | Standard pipeline + additional review |
| complex | Multi-component, high risk | Full pipeline + twin gate check |
| critical | Production-critical changes | Full pipeline + all gates + manual review flag |

---

## CIRCUIT BREAKER

**Function:** `callWithBackoff(fn, retries=3, delays=[15000, 30000, 45000])`
**Applied to:** DEVELOPER stage LLM calls, external API calls
**Behavior:**
1. Attempt 1 — immediate
2. Failure → wait 15s → Attempt 2
3. Failure → wait 30s → Attempt 3
4. Failure → wait 45s → Attempt 4
5. Final failure → stage fails, propagates to pipeline failure

---

## AGENT PROFILES

**Defined in:** `routes/agents.js` (AGENT_PROFILES constant)
**Selected by:** `agent-system/dynamic-agent-selector.js`
**Factors:** Task complexity, domain, historical performance, agent reputation scores

Agent profiles include configuration for:
- AI model selection (sonnet, haiku, opus)
- Max tokens per call
- Temperature settings
- Specialization tags (code, research, analysis, etc.)

---

## AGENT REPUTATION SYSTEM

**Table:** `agent_reputation_events`
**Written by:** `agent-system/reputation.js`
**Events:** Success/failure per pipeline run, per stage
**Effect:** Influences `dynamic-agent-selector.js` profile selection

| Column | Purpose |
|---|---|
| agent_id | Agent profile identifier |
| event_type | 'success', 'failure', 'partial' |
| score_delta | Reputation change value |
| task_id | Associated task |
| timestamp | Event timestamp |

---

## WORKTREE ISOLATION

**Used by:** COMMITTER stage
**Purpose:** Isolate file writes to a separate git worktree to prevent staging incomplete changes.
**Flow:** New worktree created → DEVELOPER writes to worktree → REVIEWER+VALIDATOR run on worktree → COMMITTER commits from worktree → worktree cleaned up.
**Risk if not cleaned:** Worktree accumulation on Render filesystem.

---

## AUTONOMY GATE LEVELS

| Level | Pipeline | Notes |
|---|---|---|
| LEVEL_0 | BLOCKED entirely | Gate 2 fails; no pipeline runs |
| LEVEL_1 | Supervised | Runs with additional human review flags |
| LEVEL_2 | Standard | Normal autonomous operation |
| LEVEL_3 | Full | All gates still apply; maximum permitted scope |

**Current level:** LEVEL_3 (per CLAUDE.md, confirmed active features)

---

## AGENT PIPELINE RISK SUMMARY

| Risk | Detail | Severity |
|---|---|---|
| VALIDATOR fail-open (empty testCases) | Auto-passes with no validation | MEDIUM |
| VALIDATOR fail-open (empty failedCases with passed=false) | No retry triggered | MEDIUM |
| VALIDATOR static-analysis only | Cannot catch runtime errors | MEDIUM |
| COMMITTER is irreversible | Commits and pushes to production | HIGH |
| Phase 29B type: MODULE_NOT_FOUND | Not caught by node --check | HIGH |
| Budget gate bypass | If cost tracking is wrong, budget gate won't fire | LOW |
| REFLECTOR double-write | obsidian-memory legacy path risk | MEDIUM |
