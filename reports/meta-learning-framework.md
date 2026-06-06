# Meta-Learning Framework — APEX AI OS
**Author:** Chief Cognitive Architecture Engineer  
**Date:** 2026-06-06  
**Scope:** Agent selection, planning quality, execution strategy improvement

---

## Definition

Meta-learning in APEX AI OS means: **the system learns how to learn better.** Not just extracting lessons from individual runs, but improving the process of lesson extraction, planning, agent routing, and retry strategy — based on accumulated evidence about what works.

Three distinct meta-learning domains:

1. **Agent Selection Meta-Learning** — Which agent model tier to use for which task type
2. **Planning Quality Meta-Learning** — How to produce better ARCHITECT plans based on past plan quality
3. **Execution Strategy Meta-Learning** — How to retry, escalate, and route based on historical patterns

---

## Domain 1: Agent Selection Meta-Learning

### Current State
Model routing in `master-orchestrator.js::_preClassifyFeature()`:
- simple → HAIKU
- moderate → HAIKU + SONNET
- complex → SONNET
- critical → SONNET + OPUS

Classification is **static**: only the objective text determines the tier. Past performance of each tier for each task type is not consulted.

### Problem
A `moderate` complexity estimate routes to HAIKU. If HAIKU has failed 60% of `moderate` git-related tasks in the last 30 days, this is a provably poor routing decision. The data exists in `agent-reputation.js` but is not consumed by routing.

### Meta-Learning Mechanism: Complexity×Domain Routing Table

```
agent-system/adaptation-engine.js::buildRoutingTable()

Input:  agent-reputation stage stats (last 300 samples)
        episodic episodes grouped by (complexity, domain)
Output: config/cognition-weights.json → routingOverrides[]

Schema:
{
  "routingOverrides": [
    {
      "complexity": "moderate",
      "domain": "git",
      "defaultTier": "haiku",
      "overrideTier": "sonnet",
      "reason": "DEVELOPER haiku failureRate=0.62 on git tasks (n=18)",
      "confidence": 0.85,
      "expiresAt": "2026-07-06"
    }
  ]
}
```

**How it feeds back:**
`master-orchestrator.js::_preClassifyFeature()` reads `routingOverrides` at start:
```js
const weights = require('../config/cognition-weights.json');
const override = weights.routingOverrides?.find(r =>
    r.complexity === estimated && r.domain === domain && Date.now() < new Date(r.expiresAt)
);
if (override) return override.overrideTier;
```

**Override expiry:** 30-day TTL prevents stale overrides from persisting after the root cause is fixed.

**Minimum samples:** Override only applies when `n >= 15` for statistical validity.

### Learning Trigger
`adaptation-engine.js::runAdaptationCycle()` runs on weekly cron (Sunday 03:00). It:
1. Loads last 300 stage stats from `agent-reputation.js::getAllStageStats()`
2. Groups by complexity×domain
3. For any group with `failureRate > 0.45` and `n >= 15`, writes an override
4. For any override whose source failureRate has dropped below 0.25, removes it (auto-recovery)

### Estimated Impact
Based on current data: moderate-complexity tasks account for ~40% of pipeline runs. If 30% of those are being sub-optimally routed, fixing routing = +15-20% overall success rate on moderate tasks.

---

## Domain 2: Planning Quality Meta-Learning

### Current State
ARCHITECT receives: wiki context, ranked lessons (top 8), similar experiences (top 3). It produces a plan. `reflection-engine.js::scoreArchitectOutput()` scores the plan — but the score is **never read back** to improve future ARCHITECT prompts.

### Problem
If ARCHITECT consistently produces plans with `confidence < 0.6` for database migration tasks, the next database migration task should get additional context: past migration plans that succeeded, specific warnings that triggered before, or a more specific system prompt.

### Meta-Learning Mechanism: Plan Quality Registry

```
agent-system/planning-quality-registry.js (NEW — ~100 LOC)

Tracks per-(complexity, domain):
  - architectConfidenceHistory[] — last 20 scoreArchitectOutput() values
  - warningPatterns[] — recurring warning types
  - planSuccessCorrelation — whether high-confidence plans actually succeeded
  - avgTestCases — how many test cases good plans specify
```

**Feedback loop:**
After each run, `_reflector()` calls `planningQualityRegistry.record(complexity, domain, architectScore, actualSuccess)`.

After 10+ samples, the registry identifies:
- **Under-confident domains**: ARCHITECT scores low but runs succeed → ARCHITECT is being overly cautious, inject encouragement
- **Over-confident domains**: ARCHITECT scores high but runs fail → inject past failure warnings as mandatory context
- **Warning signal domains**: Specific warning types precede failures → warn ARCHITECT explicitly

**ARCHITECT prompt injection (per domain, if registry has data):**
```
PLANNING INTELLIGENCE (from past runs):
- Database migration tasks: ARCHITECT tends to underestimate complexity (past plans: avg confidence 0.58, actual success rate 0.72) — do not self-downgrade
- Auth tasks: past warnings about 'session token storage' preceded 3/5 failures — inspect this specifically
- Avg test cases for successful [complexity=complex] runs: 4.2 — aim for ≥4
```

### Estimated Impact
Planning quality improvement reduces VALIDATOR failures (spec not met). Current VALIDATOR failure rate unknown but estimated at 15-25% of pipeline runs. A 30% reduction = +4-7% overall success rate.

---

## Domain 3: Execution Strategy Meta-Learning

### Current State
`execution-verifier.js` classifies failures and returns a static retry strategy:
- `SYNTAX` → escalate model, retry immediately
- `NO_FILES` → escalate model, retry immediately
- `API` → retry after 15s
- `UNKNOWN` → no retry

These strategies are **hardcoded** and never updated based on what actually works.

### Problem
If `SYNTAX` failures in git-related tasks have a 70% success rate on retry with HAIKU (not needing escalation), the blanket "escalate to Sonnet on syntax" rule is overspending ~3.5× per retry. The data to know this is in `apex_agent_stages`.

### Meta-Learning Mechanism: Retry Strategy Optimizer

```
agent-system/adaptation-engine.js::optimizeRetryStrategies()

Reads: apex_agent_stages (attempt, success, stage, error_type, model)
Computes: per-(failureType, stage, model) retry success rate
Writes:   config/cognition-weights.json → retryStrategies{}
```

**Schema:**
```json
{
  "retryStrategies": {
    "syntax_error_DEVELOPER_haiku": {
      "retry": true,
      "escalate": false,
      "delayMs": 0,
      "empiricalSuccessRate": 0.72,
      "n": 18,
      "confidence": 0.9
    },
    "no_files_DEVELOPER_haiku": {
      "retry": true,
      "escalate": true,
      "delayMs": 0,
      "empiricalSuccessRate": 0.61,
      "n": 23,
      "confidence": 0.92
    }
  }
}
```

`execution-verifier.js::recommendRetry()` reads this at call time:
```js
const weights = _loadWeights(); // memoized, reloads hourly
const key = `${type}_${stage}_${currentModel}`;
if (weights.retryStrategies[key]?.n >= 10) {
    return weights.retryStrategies[key]; // empirical beats static
}
return RETRY_STRATEGIES[type]; // fallback to static
```

### Estimated Impact
Retry cost optimization: on ~20% of failed runs that currently over-escalate, saving ~$0.02-0.05/run. At current scale (est. 30 pipeline runs/week): $0.50-1.00/week in avoided overescalation. More importantly: removes systematic errors from pipeline (retrying things that don't benefit from retry).

---

## Meta-Learning Governance

### Minimum Sample Thresholds

| Override Type | Min Samples | Max Age | Auto-expiry |
|---------------|-------------|---------|-------------|
| Routing override | 15 | 30 days | Yes — if fixed |
| Plan quality injection | 10 | 60 days | Yes — if CI improves |
| Retry strategy override | 10 | 90 days | No — stable patterns |

### Safety Constraints
1. **No direct code modification.** Adaptation engine only writes to `config/cognition-weights.json`. Routing overrides are read opportunistically — not enforced.
2. **Human override.** Any key in `config/cognition-weights.json` can be deleted to revert.
3. **Overrides log.** Every adaptation cycle writes a log entry to `reports/adaptation-log-{date}.md` with what changed and why.
4. **Regression guard.** If overall success rate drops 5+ percentage points within 48 hours of an adaptation cycle, `adaptation-engine.js` writes a `REGRESSION_ALERT` to Slack via `slack-alerts.js`.

### Feedback Latency

| Loop | Data Source | Update Frequency | Latency |
|------|-------------|------------------|---------|
| Agent selection | apex_agent_stages | Weekly cron | ~7 days |
| Plan quality | episode planningQualityRegistry | Per run | ~1 min |
| Retry strategy | apex_agent_stages | Weekly cron | ~7 days |
| Confidence estimation | episodic + reputation | Per run | ~1 min |

---

## Implementation Priority

| Item | Files | Effort | Impact |
|------|-------|--------|--------|
| 1. adaptation-engine.js (routing table) | adaptation-engine.js, cognition-weights.json | 4h | High |
| 2. Master-orchestrator reads cognition-weights | master-orchestrator.js (5 lines) | 30 min | High |
| 3. execution-verifier reads empirical retry | execution-verifier.js (10 lines) | 1h | Medium |
| 4. planning-quality-registry.js | planning-quality-registry.js | 3h | Medium |
| 5. Weekly adaptation cron in server.js | server.js (10 lines) | 30 min | High (enables 1-4) |
