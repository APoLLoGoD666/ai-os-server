# APEX-AUTHORITY-MAP.md
## Definitive Execution Authority Map — APEX Pipeline
**Generated:** 2026-06-16 | **Source Corpus:** Phases 30E + 30D + 30C | **Baseline Commit:** f77a36d

All citations to agent-system/orchestrator.js unless otherwise noted.

---

## THE TWO OPEN SINGLE POINTS OF FAILURE

Before the authority questions, state the two known weaknesses that bound all authority claims below:

**SPF-1 (REVIEWER parse bypass — orchestrator.js:559):**
```javascript
catch { fileResult = { file: filename, passed: true, issues: [] }; }
```
REVIEWER is the last semantic gate. A model response that fails JSON parsing auto-approves. The worst-case failure mode (model returns garbage) produces the same outcome as the best-case (model reviewed and approved). No retry. No flag. No audit.
Source: PHASE-30E-FINAL-DECISION.md §Single Point of Failure

**SPF-2 (VALIDATOR empty-failedCases — orchestrator.js:1528):**
```javascript
if (!validatorLog.result.passed && (validatorLog.result.failedCases || []).length > 0)
```
`{passed:false, failedCases:[]}` satisfies neither trigger branch. The retry block does not execute. Code the VALIDATOR model concluded was wrong continues to TESTER and COMMITTER without alert.
Source: PHASE-30C-FINAL-DECISION.md §Defect 1; PHASE-30D-FINAL-DECISION.md §Evidence Basis

---

## QUESTION 1: WHO CAN STOP EXECUTION?

Fifteen mechanisms can stop or hold execution before COMMITTER. Each is rated HARD, SOFT, or FAIL-OPEN.

| # | Mechanism | Location | Rating | Stop Condition | Bypass Possible? |
|---|-----------|----------|--------|----------------|-----------------|
| 1 | Spec validation | orchestrator.js:960-962 | HARD | `spec.objective` missing or empty | No |
| 2 | Constitutional gate | orchestrator.js:964-981 | FAIL-OPEN | `_antiGoal.block_execution === true` → return `{success:false}` | YES — try/catch at :979 swallows exceptions; module error = pass-through |
| 3 | Task Router (founder_escalation) | orchestrator.js:1154-1159 | HARD | Pattern match → `return {held:true}` | No (hard return) |
| 4 | Fail-closed preflight (critical/complex) | orchestrator.js:1400-1402 | HARD | `runtimeCtrlError` + critical or complex complexity → `_fail()` | No — code-enforced |
| 5 | Autonomy gate | orchestrator.js:1404-1407 | SOFT | `ctx.runtimeControls.blockExecution === true` → `_fail()` | YES — cognitive layer failure is non-fatal; missing `intelContextPack` = gate absent |
| 6 | Digital twin gate | orchestrator.js:1410-1412 | FAIL-OPEN | `twin.proceed === false` → `_fail()` | YES — exception defaults to `{proceed:true}` (digital-twin-gate.js:73-77) |
| 7 | Early hold gate (pre-model) | orchestrator.js:1415-1421 | SOFT | `deploymentPolicy === 'hold'` → `return {held:true}` | YES — requires runtime controls to have loaded |
| 8 | Behavior gate | orchestrator.js:1424-1428 | SOFT | `behaviorGate.blocked === true` → `_fail()` | YES — only fires if cognitive stack loaded AND explicit blocking constraint exists |
| 9 | Budget gate | orchestrator.js:1450, 1486 | HARD | `costUsd > PIPELINE_BUDGET_USD` → throws | No |
| 10 | Circuit breaker | orchestrator.js:146-148 | HARD | 5 consecutive API failures → throws | No |
| 11 | REVIEWER failure | orchestrator.js:1522-1526 | SOFT | `reviewerLog.result.passed === false` after retries → `_fail()` | YES — SPF-1: parse failure defaults to `{passed:true}` at :559 |
| 12 | VALIDATOR failure (with cases) | orchestrator.js:1528-1533 | SOFT (with gap) | `!passed && failedCases.length > 0` after retries → `_fail()` | YES — SPF-2: `{passed:false, failedCases:[]}` bypasses |
| 13 | TESTER syntax failure | orchestrator.js:1540-1545 | HARD | `testerLog.result.passed === false` after retries → `_fail()` | No |
| 14 | Post-pipeline hold gate | orchestrator.js:1554-1561 | HARD | `deploymentPolicy === 'hold'` after all checks → `return {held:true}` | No (separate check from #7) |
| 15 | CTO gate rejection | orchestrator.js:1576-1583 | FAIL-OPEN | `escalate:true` or reject/hold/deny decision → `_fail()` | YES — try/catch at :1585 swallows; exception = auto-approve |
| — | COMMITTER server.js check | orchestrator.js:674-676 | HARD | `node --check server.js` failure → returns error | No |
| — | COMMITTER merge failure | orchestrator.js:730-733 | HARD | merge conflict → returns error | No |
| — | COMMITTER push failure | orchestrator.js:741-744 | HARD | push error → returns error | No |

**Summary by rating:**
- HARD (deterministic, no bypass): 7 mechanisms — spec validation, fail-closed preflight, budget gate, circuit breaker, TESTER, post-pipeline hold, COMMITTER git checks
- SOFT (Claude-enforced, potential bypass): 3 mechanisms — autonomy gate, behavior gate, REVIEWER (SPF-1), VALIDATOR (SPF-2)
- FAIL-OPEN (exception → auto-approve/pass): 3 mechanisms — constitutional gate, twin gate, CTO gate

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #1; §Complete Authority Chain — Stage Table

---

## QUESTION 2: WHO CAN APPROVE EXECUTION?

No entity grants explicit positive forward permission. The system is gate-negative.

"Approval" is the absence of a block, not a positive grant. The closest analogs:

- **Internal code** (orchestrator.js:1549): The `break` at the bottom of the retry loop is the implicit approval signal — all gates have passed.
- **CTO gate** (orchestrator.js:1584): Logs `approved (confidence=...)` after decision. But this only fires for critical/staged tasks, and exceptions are swallowed. The CTO's logged approval is advisory confirmation, not an authorization grant.
- **Cognitive autonomy evaluator** (autonomy-runtime-controller.js:74-97): Evaluates level; level >= 1 does not block. Not active approval — it is non-blocking.

There is NO positive human approval step anywhere in the orchestrator pipeline at any autonomy level. There is no `await humanApproval()`, no UI confirm dialog before commit, no approval_requests check.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #2; PHASE-30E-FINAL-DECISION.md §Phase-30E Certification Complete

---

## QUESTION 3: WHO CAN REJECT EXECUTION?

Mechanisms that genuinely block (vs. those that merely advise):

**Genuine blocks (execution stops):**
- Constitutional gate (:964-981) — HARD rejection if module loads and check returns `block_execution:true`. Exception-bypassable.
- Task Router (:1154-1159) — HARD rejection for `founder_escalation` pattern. Not bypassable.
- Autonomy gate (:1404-1407) — Blocks if `runtimeControls.blockExecution === true`. Absent if cognitive stack fails.
- Twin gate (:1410-1412) — Blocks if twin returns `do_not_deploy`. Exception defaults to proceed.
- REVIEWER (:1522-1526) — Hard block after retries. SPF-1 bypasses on parse failure.
- VALIDATOR (:1528-1533) — Hard block after retries with non-empty failedCases. SPF-2 bypasses on empty failedCases.
- TESTER (:1540-1545) — Hard block. Not bypassable.
- CTO gate (:1576-1583) — Conditional block (critical/staged only). Exception-bypassable.
- COMMITTER git checks (:674-676, :730-733, :741-744) — Error returns on syntax/merge/push failure.

**Advisory only (observe but cannot block):**
- REFLECTOR: setImmediate fire-and-forget after pipeline complete.
- CFO: consulted after successful commit.
- COO: consulted after >2 retries, after success.
- Smoke tester: health check 90s post-deploy; logs lesson only.
- Governance library: never called during pipeline.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #3, #8

---

## QUESTION 4: WHO CAN OVERRIDE EXECUTION?

"Override" means: bypass a gate that would otherwise block. All override paths in APEX are passive (exception swallowing, default values), not active (admin command, human decision).

| Override Path | Mechanism | Result |
|---------------|-----------|--------|
| Constitutional gate exception | try/catch at :979 swallows exception | Gate absent, execution proceeds |
| Twin gate exception | digital-twin-gate.js:73-77 defaults to `{proceed:true}` | Gate absent, execution proceeds |
| CTO gate exception | try/catch at :1585-1587, console.warn only | Gate absent, execution proceeds |
| REVIEWER parse failure | catch at :559 → `{passed:true, issues:[]}` | SPF-1: auto-approval on model failure |
| VALIDATOR empty failedCases | :1528 AND condition | SPF-2: pipeline continues despite passed:false |
| Behavior gate absent | Only fires if cognitive stack loaded AND explicit blocking constraint | Gate absent if cognitive stack failed |
| Autonomy gate absent | Only fires if cognitive stack loaded | Gate absent if intelContextPack null |

There is NO human override mechanism. There is no admin endpoint to force-approve or force-reject. There is no `override_requests` table checked during the pipeline (the policy engine's override flow exists in the governance library, which is not called from orchestrator.js).

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #4

---

## QUESTION 5: WHO COMMITS?

`_committer()` function at orchestrator.js:662, called unconditionally at orchestrator.js:1602.

**Authority characterization:** _committer() is internal code executing as the Node.js process identity on Render. It has full file system and git push access. It reads no validator state, no governance state, and requests no human confirmation. It executes whenever the retry loop exits without a `_fail()` call.

**Execution sequence:**
1. `spawnSync('git', ['add', '-A'], ...)` at :670 — stages all changes
2. `spawnSync('git', ['commit', '-m', msg], ...)` at :681 — commits to worktree branch
3. `spawnSync('git', ['pull', '--rebase'], ...)` at :717 — syncs to remote HEAD
4. `spawnSync('git', ['merge', '--no-ff', branchName], ...)` at :729 — merges to main
5. `spawnSync('git', ['push', _repoBase, 'main'], ...)` at :738 — pushes to GitHub
6. `https.request` to Render deploy API at :757 — triggers production deployment

**Irreversibility:** The push at step 5 is the point of no return. After push, the only recovery path is manual git revert. No automated rollback exists. A smoke tester fires 90 seconds post-deploy but logs a lesson only — it does not trigger revert.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #5; PHASE-30D-BLIND-SPOT-ASSESSMENT.md §Question 2

---

## QUESTION 6: WHO OWNS FINAL TRUTH?

**For simple/moderate/complex tasks (majority of runs):**
REVIEWER (Claude model, _reviewer() function, :502-593) is the last semantic gate. REVIEWER evaluates spec correctness, OWASP Top 10, STRIDE threats, error handling, HTTP status codes, raw secrets, duplicate routes, and async coverage. If REVIEWER passes, TESTER (syntax only) has passed, and COMMITTER runs.

REVIEWER's judgment is binding. No second reviewer exists. No human confirms. If REVIEWER is wrong — it misses a bug, overlooks a security flaw, or its response fails to parse and auto-approves — that error reaches production.

**For critical tasks:**
CTO gate fires in addition. CTO evaluates changedFiles, complexity, testsPassed, reviewPassed. Note: CTO does NOT receive validatorPassed (PHASE-30C-EXECUTIVE-CERTIFICATION.md §What Work Remains #4; PHASE-30D-FINAL-DECISION.md §Evidence Basis). CTO is exception-bypassable.

**For TESTER specifically:**
TESTER owns final truth on syntax. Node.js cannot execute code that fails `node --check`. TESTER is deterministic.

Source: PHASE-30E-FINAL-DECISION.md §Single Point of Authority; PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #6

---

## QUESTION 7: WHO CAN ROLLBACK?

**Pre-commit rollback (within retry loop):**
`_rollback()` at orchestrator.js:1333-1340 — git checkout and clean, or backup restore. Called at :1509 (structural check failure), :1523 (REVIEWER failure), :1541 (TESTER failure). Does NOT apply to VALIDATOR empty-failedCases gap (gap bypasses the retry block entirely).

**Post-commit rollback:**
None exists in the pipeline. The smoke tester at :1612-1626 checks server health 90 seconds post-deploy. On failure, it calls `memory.logLesson(...)` only. No git revert, no Render rollback, no incident is created.

**Manual rollback:**
A human operator can execute `git revert` or use the Render dashboard to roll back to a previous deploy. This is the only post-commit recovery path.

**The gap:** Code deployed via the VALIDATOR empty-failedCases bypass or REVIEWER parse bypass reaches production with no automated detection and no automated recovery.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #7; PHASE-30D-BLIND-SPOT-ASSESSMENT.md §Question 2

---

## QUESTION 8: WHO OBSERVES ONLY?

Entities that receive execution information but cannot stop, block, or revert anything:

| Entity | Location | What It Observes | Can It Stop? |
|--------|----------|-----------------|--------------|
| REFLECTOR | :788-841, via setImmediate | Completed pipeline; extracts lesson to apex_lessons | NO (fire-and-forget) |
| _auditLog | :844-946, via setImmediate | All stage outputs → apex_agent_runs, apex_agent_stages | NO (fire-and-forget) |
| CFO | :1664-1674, via setImmediate | Post-commit cost analysis | NO (after commit; fire-and-forget) |
| COO | :1591-1598 | Called after >2 retry attempts, after success | NO (after success) |
| Digital twin accuracy engine | :1651-1655 | Records actual vs. predicted outcomes | NO (observational) |
| Outcome attribution engine | (post-pipeline) | Records attribution | NO (observational) |
| Smoke tester | :1612-1626 | Health check 90s after deploy | NO (logs lesson only) |
| Governance library (lib/governance*.js) | (not called from orchestrator.js) | Nothing during pipeline | N/A (not called) |
| Meta-reasoning engine | (post-pipeline) | Cognitive quality record | NO (observational) |
| Goal tracker | (post-pipeline) | Completion state | NO (observational) |
| Sentry | Express middleware | Unhandled exceptions | NO (observational) |
| apex_agent_runs / apex_agent_stages | Supabase writes | Full audit trail | NO (observational) |

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #8

---

## QUESTION 9: WHO APPEARS AUTHORITATIVE BUT IS NOT?

**Governance library:** Named "governance," has 16 routes, has a certification system, SLO monitoring, incident management, and a 100/100 probe score. Appears to be the system authority. In reality: zero calls in orchestrator.js. Governance observes, audits, and certifies after the fact. It has no execution gate role.

Source: PHASE-30D-FINAL-DECISION.md §Evidence Basis; PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #9

**CTO gate:** Named for a C-suite executive. Fires for "critical" tasks. Appears to be the senior technical authority. In reality: fires only for `complexity === 'critical'` OR `deploymentPolicy === 'staged'`. For simple, moderate, and complex tasks (the majority), the CTO gate is never invoked. When it does fire, exceptions are swallowed at :1585. The CTO does not receive validatorPassed. Its judgment is advisory for non-critical tasks.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #9 ("CTO Gate"); §Complexity Routing Effect on Authority

**Constitutional/Founder anti-goal check:** Appears to be the supreme authority — it checks whether execution violates founder principles. In reality: if `lib/founder.checkAntiGoals()` throws an exception, the catch at :979 swallows it and execution proceeds as if no violation was found.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #9 ("Constitutional/Founder")

**AUTONOMY_LEVEL env var (for orchestrator):** Named as if it controls the pipeline's autonomous behavior. In reality: it controls the legacy server.js task agent system. The orchestrator pipeline reads `ctx.runtimeControls` from cognitive evaluation, not `process.env.AUTONOMY_LEVEL`.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #9 ("Autonomy Level")

---

## QUESTION 10: WHAT IS THE ACTUAL CHAIN?

Numbered linear sequence from intent to production. Hard gates in bold.

1. **Spec validation** (orchestrator.js:960-962) — Internal code. Objective must exist. HARD.

2. Constitutional / Anti-goal gate (orchestrator.js:964-981) — Founder monitor. Blocks if module loads AND check returns `block_execution:true` AND no exception thrown. FAIL-OPEN.

3. **Task Router** (orchestrator.js:1154-1159) — Pattern match for `founder_escalation`. HARD on match.

4. **Fail-closed preflight** (orchestrator.js:1400-1402) — For critical/complex only: if runtime controls failed, block. HARD.

5. Autonomy gate (orchestrator.js:1404-1407) — Blocks if `runtimeControls.blockExecution === true`. SOFT (absent if cognitive stack failed).

6. Digital twin gate (orchestrator.js:1410-1412) — Blocks if `twin.proceed === false`. FAIL-OPEN on exception.

7. Hold gate pre-model (orchestrator.js:1415-1421) — Blocks if `deploymentPolicy=hold`. SOFT (absent if runtime controls failed).

8. Behavior gate (orchestrator.js:1424-1428) — Blocks if hard behavioral constraints present. SOFT (absent if cognitive stack failed).

9. **Budget gate** (orchestrator.js:1450, 1486) — Throws if cost exceeds budget. HARD.

10. REVIEWER (orchestrator.js:1522-1526) — Claude semantic review. Last semantic gate. SOFT with SPF-1 (parse failure auto-passes).

11. VALIDATOR (orchestrator.js:1528-1533) — Claude test-case verification. SOFT with SPF-2 (empty-failedCases bypasses).

12. **TESTER** (orchestrator.js:1540-1545) — `node --check` syntax check. HARD.

13. **Hold gate post-pipeline** (orchestrator.js:1554-1561) — Second check of `deploymentPolicy=hold`. HARD.

14. CTO gate (orchestrator.js:1568-1588) — Critical/staged only. FAIL-OPEN on exception.

15. **COMMITTER** (orchestrator.js:1602, 662-783) — git add, commit, push, Render deploy. Executes.

**The real security boundary for the majority of runs:** Steps 9 (budget), 10 (REVIEWER), 12 (TESTER). Everything else is conditional, cognitive-stack-dependent, or fail-open.

Source: PHASE-30E-AUTHORITY-MAP.md §The 10 Required Questions #10; PHASE-30E-FINAL-DECISION.md §Actual Authority Chain
