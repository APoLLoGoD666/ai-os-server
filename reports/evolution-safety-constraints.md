# Safety Constraints — Autonomous Evolution Layer
**Author:** APEX Chief Autonomous Evolution Engineer  
**Date:** 2026-06-06  
**Module:** `agent-system/improvement-executor.js`

---

## Purpose

This document is the formal specification of the safety constraints governing APEX AI OS's autonomous evolution layer. These constraints exist because a system that can propose its own modifications is only safe if modification and execution are permanently separated.

**The fundamental rule:** Intelligence without authorization is not autonomy — it is a bug.

---

## The 8 Hard Barriers

These constraints are encoded as `SAFETY_CONSTRAINTS` (frozen array) exported from `improvement-executor.js`. They are not configurable. They cannot be overridden by any function in the module.

---

### Constraint 1 — No Production File Writes

```
NEVER writes to .js/.html/.css/.json source files
```

**What this means:**  
`improvement-executor.js` writes to exactly two locations:
- `vault/System/Improvements/proposals.json` — the proposal registry
- `vault/System/Improvements/roadmap-{date}.md` — a Markdown snapshot for human review

It does not write to, read-then-overwrite, or patch any file in `agent-system/`, `lib/`, or the project root.

**Why:**  
An autonomous system that can write to its own source files can erase safety checks, grant itself new permissions, or introduce logic errors that propagate silently. Even if the intent is benign, the blast radius of an incorrect patch to `orchestrator.js` is a broken pipeline affecting all future runs.

**Enforcement:**  
The only `fs.writeFileSync` calls in the module write to paths derived from `IMPROVEMENTS_DIR` and `VAULT`. Both constants resolve to paths outside the codebase directory.

---

### Constraint 2 — No Pipeline Execution

```
NEVER calls orchestrator.runAgentTeam() or any pipeline executor
```

**What this means:**  
The module does not `require('./orchestrator')` or any function that triggers a pipeline run. It has no runtime dependency on orchestrator.js.

**Why:**  
A proposal generator that can execute pipelines could propose a change and immediately test it by running a task — bypassing the human approval step entirely. This would collapse the deliberate separation between proposal generation and implementation.

**Enforcement:**  
`improvement-executor.js` imports: `adaptation-engine`, `episodic-memory`, `reflection-engine`, `goal-tracker`, `autonomy-metrics`, `memory-indexer`. None of these execute pipelines. The orchestrator is explicitly excluded from this dependency list.

---

### Constraint 3 — No Shell Execution

```
NEVER spawns child processes or shell commands
```

**What this means:**  
No `child_process.exec()`, `child_process.spawn()`, `require('child_process')`, or shell string evaluation anywhere in the module.

**Why:**  
Shell access from within a proposal generator would allow a compromised or buggy proposal to execute arbitrary commands on the Render container — including git pushes, npm installs, or environment variable manipulation.

**Enforcement:**  
The module uses only `fs` (file read/write to vault paths) and `path`. No shell access is needed or included.

---

### Constraint 4 — All Proposals Start as Pending

```
ALL proposals require explicit scheduleProposal() call to activate
```

**What this means:**  
`generateProposal()` and `generateRoadmap()` always create proposals with `status: 'pending'`. No path through either function results in a `scheduled` or `executing` status.

Proposals are activated by a human calling `scheduleProposal(proposalId)` explicitly — either via the API route, the dashboard, or a direct code call.

**Why:**  
Proposals that auto-schedule circumvent the review step. Even correct proposals should be reviewed — the expected benefit may be outdated, the risk context may have changed, or a higher-priority improvement may have emerged.

**Enforcement:**  
`generateProposal()` sets `status: STATUS.PENDING` unconditionally. `STATUS.SCHEDULED` is set only inside `scheduleProposal()`, which is a separate exported function that requires the caller to explicitly name the `proposalId` they want to activate.

---

### Constraint 5 — CRITICAL Risk Proposals Require Manual Override

```
CRITICAL-risk proposals block scheduling and require manual override flag
```

**What this means:**  
`scheduleProposal(proposalId)` throws an error if `proposal.risk === 'critical'` and the caller has not passed `{ allowCritical: true }`:

```js
if (proposal.risk === RISK.CRITICAL && !allowCritical) {
    throw new Error(
        `[ImprovementExecutor] SAFETY: Cannot auto-schedule CRITICAL risk proposal ${proposalId}. `
        + `Pass { allowCritical: true } to override.`
    );
}
```

**Why:**  
CRITICAL risk proposals involve changes where a mistake could corrupt data, break the production pipeline, or require rollback of multiple interdependent files. They require explicit human acknowledgment that the risk is understood.

The `{ allowCritical: true }` flag is a deliberate speed bump. It forces the caller to modify their code to include the flag — they cannot accidentally schedule a CRITICAL proposal by not reading the documentation.

**Current CRITICAL proposals:** None in the current template set. All 10 templates are LOW or MEDIUM risk. CRITICAL is reserved for future templates involving schema migration, secret rotation, or irreversible data operations.

---

### Constraint 6 — Proposals Expire After 14 Days

```
Proposals expire after 14 days if not actioned
```

**What this means:**  
Every proposal has `expiresAt = createdAt + 14 days`. `getTopImprovements()` sweeps expired proposals and updates their status to `expired` before returning results.

**Why:**  
Stale proposals are worse than no proposals — they represent analysis from an old system state. A proposal generated when autonomy score was 6.3 may be irrelevant after a week of successful runs that raised it to 7.8. Allowing proposals to accumulate indefinitely pollutes the priority queue with low-quality, outdated recommendations.

**Enforcement:**  
```js
const now = Date.now();
for (const p of registry.proposals) {
    if (p.status === STATUS.PENDING && new Date(p.expiresAt).getTime() < now) {
        p.status = STATUS.EXPIRED;
    }
}
```

This runs on every `getTopImprovements()` call. Expired proposals are excluded from the returned list.

---

### Constraint 7 — Rollback Plans Required for Non-Trivial Risk

```
rollbackPlan is required on all medium/high/critical risk proposals
```

**What this means:**  
All 10 templates include a `rollbackPlan` string. Any proposal generated from a template without a rollback plan is a bug in the template, not an intentional omission.

For LOW risk proposals: rollback plan describes what to undo if the change causes unexpected behavior.  
For MEDIUM and above: rollback plan must specify the exact commands or steps to restore prior state.

**Why:**  
A proposal is only as safe as its reversibility. If an engineer implements a proposal and it breaks something, they need to know how to reverse it without reading source code. The rollback plan is that specification — written at proposal generation time, when the context is fresh.

**Example (from tpl-adaptation-routing-wire):**
```
Delete config/cognition-weights.json. Remove 5-line weights-read block from
_preClassifyFeature() in master-orchestrator.js. All routing reverts to
pre-adaptation-engine defaults immediately.
```

---

### Constraint 8 — Feedback Loop Closes Through Adaptation Engine

```
recordApplication() feedback loop reports effectiveness back to adaptation-engine
```

**What this means:**  
When `markCompleted(proposalId)` is called, the module calls `_adapt.recordApplication(proposal.adaptationId, { success: true, delta: proposal.expectedScoreDelta })`.

This tells the adaptation engine that a recommendation was acted on. The adaptation engine uses this to update `appliedCount`, `successCount`, and `learningWeight` for that adaptation — affecting confidence scores for future proposals.

**Why:**  
Without a feedback loop, the system cannot learn which of its proposals were effective. Adaptations that produce successful proposals should be weighted higher in future analysis. Adaptations that produce proposals that get rejected or reversed should be weighted lower.

The feedback loop is the mechanism that makes the evolution system smarter over time — rather than generating the same 10 proposals on every cron run regardless of what's been tried.

**Enforcement:**  
`markCompleted()` calls `recordApplication()` inside a try/catch. If adaptation-engine.js is unavailable, the proposal is still marked completed — the feedback call is non-blocking. Loss of one feedback data point is acceptable; loss of the completion record is not.

---

## What Is NOT a Safety Constraint

For completeness, these are properties that are **not** safety barriers, even though they sound protective:

- **Template confidence thresholds.** Proposals can be generated with confidence as low as 0.15. Low confidence doesn't block generation — it just results in a low `priorityScore`, so low-confidence proposals appear at the bottom of the queue.
- **Proposal deduplication.** Duplicate proposals (same template, active pending exists) are suppressed as a quality measure, not a safety measure.
- **The 14-day TTL.** This is a quality/hygiene constraint, not a safety barrier. An expired proposal is still readable in `proposals.json` — it simply won't appear in `getTopImprovements()` results.

---

## Audit Surface

The constraints are auditable at runtime:

```js
const { SAFETY_CONSTRAINTS } = require('./agent-system/improvement-executor');
console.log(SAFETY_CONSTRAINTS);
// → frozen array of 8 constraint strings
```

The array is exported as an `Object.freeze()`d value — it cannot be mutated at runtime by any caller, including the module itself.

---

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Bug in generateRoadmap() writes bad data to proposals.json | proposals.json is vault-only; does not affect code execution. Corrupt file → getTopImprovements() returns [] gracefully. |
| triggerCondition() throws on malformed snapshot | All template trigger conditions are wrapped in try/catch in _buildProposal(). Throw → template skipped. |
| adaptation-engine returns corrupt action type | _ADAPT_TO_PROPOSAL has no-match fallback: returns a "review" proposal with MEDIUM risk, no specific steps. |
| scheduleProposal() called in a loop | Each call creates one goal-tracker goal per proposalId. Duplicate calls for same ID update status to SCHEDULED again. Goal-tracker deduplication handles repeated goal creation. |
| generateRoadmap() called on every pipeline run | Non-breaking: generates proposals, writes proposals.json, returns results. High-frequency generation produces many proposals with identical content — mitigated by TTL sweep on getTopImprovements(). Long-term fix: move cron to server.js (done per integration plan). |
| Proposal with malicious implementationSteps | Steps are strings stored in JSON. The module never executes implementationSteps. They are read-only text for human consumption. |

---

## Summary

The evolution layer is safe because:

1. **Read-only on source code.** It reads metrics and episodes; never writes code files.
2. **Proposals are just data.** A proposal is a JSON record. Acting on it is a separate, human-initiated step.
3. **Explicit activation.** `scheduleProposal()` requires naming the exact proposal. Nothing auto-activates.
4. **CRITICAL is blocked by default.** The only way to schedule CRITICAL risk is to explicitly want it.
5. **TTL prevents staleness.** Old proposals expire and cannot accumulate into a misleading priority queue.
6. **Rollbacks are documented at generation time.** Every non-trivial proposal ships with its own undo instructions.
7. **Feedback closes the loop.** Completed proposals update adaptation weights, making future proposals more accurate.
8. **No shell.** No pipeline. No code execution of any kind.
