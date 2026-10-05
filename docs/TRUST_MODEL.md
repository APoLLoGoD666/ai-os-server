# TRUST MODEL
Generated: 2026-06-14 — Empirical scoring of system trustworthiness

---

## Trust Formula

```
system_trust_score = (
  prediction_accuracy × 0.25 +
  reliability × 0.25 +
  transparency × 0.20 +
  absence_of_hidden_action × 0.20 +
  absence_of_bypasses × 0.10
)
```

Score per dimension: 0.0 – 1.0

---

## Dimension 1: PREDICTION ACCURACY (weight: 0.25)

**Definition:** When the system predicts an outcome, how often is it correct?

### Evidence:

**Digital twin prediction path:**
- `lib/cognitive/runtime/digital-twin-gate.js` — before execution, `simulatePolicy()` creates a row in `digital_twin_simulations` with `recommendation`, `risk_estimate`, `benefit_estimate`, `confidence`, `simId`
- Gate has 4-second timeout; is non-fatal if it fails — predictions are best-effort

**Accuracy measurement:**
- `digital-twin-accuracy-engine.js:14–87` — `recordActual()` called from `orchestrator.js:1700` via `setImmediate`
- Computes: `forecast_accuracy`, `risk_calibration_error`, `benefit_calibration_error`, `was_false_positive`, `was_false_negative`
- Stores to `twin_accuracy_records`

**Accuracy data consumed:**
- `policy-evolution-engine.js:101–116` — reads `twin_accuracy_records` to detect over-conservative twin (FP rate > 25%) and propose threshold adjustments
- These proposals flow to `improvement_candidates` → IF approved AND auto-deployed → `cognitive_policy_settings`
- BUT: `cognitive_policy_settings` is NOT read by `cognitive-policy-engine.js` (broken final step — see Learning Loop Status)

**Current state:**
- Prediction infrastructure exists and records data
- Data feeds evolution proposals but proposals don't yet change runtime behavior
- No public accuracy metric available without querying `twin_accuracy_records` directly
- Adaptation engine confidence (Bayesian): functional proxy, not a prediction system

**Promise Made:** System will predict task outcomes and self-correct based on prediction accuracy
**Action Taken:** Predictions recorded, accuracy measured, proposals generated
**Outcome:** Proposals written to DB; not yet applied to runtime
**Human Override:** Not applicable (this loop is not yet closed)
**Confidence:** 0.6 (infrastructure solid; behavior change loop broken)
**Trust Delta:** Neutral → system is investing in prediction capability but not yet delivering on the promise

**Dimension Score: 0.55** — infrastructure strong; behavior change loop broken; track record too short to score higher

---

## Dimension 2: RELIABILITY (weight: 0.25)

**Definition:** Does the system do what it says it will do, consistently?

### Evidence:

**Governance probe (10-check, on each deploy):**
`lib/governance-probe.js:33–192` — 10 checks: execution snapshots, cost accounting, artifacts, certifications (pass and denied), evidence blocks, lesson sources, lesson traceability (BD-01), incidents, resolutions.
- Score < 80 → high-severity incident raised
- Last known score: 100/100 (from post-stabilisation session, 2026-06-13)
- Probe runs 60s after deploy, not before user requests

**Runtime readiness (8 dimensions, display-only):**
`lib/runtime-readiness.js` — 8 dimensions: runtime evidence, governance visibility, failure traceability, certification integrity, historical verifiability, operational observability, forensic reconstruction, audit defensibility.
- Score NOT AUDIT READY produces no automatic response
- Last known: 94/100 AUDIT READY

**Scheduler reliability:**
- `_checkPendingLocked` mutex (`server.js:10448`) prevents concurrent dispatch
- Per-iteration try-catch in `runDueSchedules()` (`server.js:2987`) isolates failures
- Adaptation engine fires `learn()` on every success and failure (`orchestrator.js:1651,1353`)

**Constitutional gate reliability:**
- Gate is fail-open on infrastructure error (`orchestrator.js:971–973`)
- If `founder_memory` table is unreachable, anti-goal check is skipped silently
- This means critical anti-goals are only enforced when DB is healthy

**Reliability gaps:**
- Constitutional gate fail-open on DB error: high risk
- Cognitive crons DORMANT (`COGNITIVE_CRONS_ENABLED` not set): 4 Sunday evolution loops don't run
- Reality loop DORMANT: 15-min OODA cycle doesn't run
- Adaptation registry stale since 2026-06-13 (expected; Sunday refresh pending)
- Voice-chat not covered by governance probe checks

**Promise Made:** Governance probe passes on every deploy
**Action Taken:** Probe runs, writes results, raises incidents
**Outcome:** Probe passing; but probe doesn't cover voice path or check constitutional gate reliability
**Human Override:** No override path tested
**Confidence:** 0.75 (probe is real; gaps are bounded)
**Trust Delta:** Positive (probe is live; audit readiness is measured)

**Dimension Score: 0.65** — governance infrastructure solid; fail-open constitutional gate and dormant crons reduce score

---

## Dimension 3: TRANSPARENCY (weight: 0.20)

**Definition:** Can an observer see what the system is doing and why?

### Evidence:

**Per-pipeline-run transparency:**
- `agent-pipeline-hooks.js:54–186` — fires on `onPipelineStart`, `onPipelineComplete`, `onPipelineFailed` → Slack thread + Notion Agent Run entry
- `_spine()` (`agent-pipeline-hooks.js:19`) writes `pipeline.started/completed/failed` to `agent_events` table (outbox relay)
- `governance.js:279` — `appendEvidenceBlock()` writes hash-linked evidence chain to `evidence_blocks` per run
- `apex_agent_runs` — UPSERT per task with cost, success, model, duration

**Evidence chain:**
- `evidence_blocks` table: hash-linked chain with `payload_version`, `block_hash`, `prev_hash`
- Readable via `routes/governance.js`. No dashboard UI for evidence chain — data only accessible via API
- `evidence-completeness.js` scores completeness per execution (7 tables, 100 pts)

**What is NOT transparent:**
- Voice-chat LLM calls: not in `apex_agent_runs`. No audit trail per voice exchange.
- Adaptation engine pattern synthesis LLM calls (`adaptation-cycle.js:213–231`): go through `runtime.execute(caller:'adaptation-cycle')` but NOT written to `apex_agent_runs`
- Executive entity LLM calls (`entity.decide()`): written to `executive_decisions` table but not to the main `apex_agent_runs` audit log
- Weekly cron LLM calls (`_generateWeeklyReview()`): not audited

**Observation surface available:**
- `GET /api/intelligence/agent-runs` — recent pipeline runs
- `GET /api/governance/probe/latest` — probe status
- `GET /api/governance/readiness` — readiness score
- `GET /api/intelligence/self-check` — memory/Supabase/event bus/agent queue/Obsidian/PostgreSQL check

**Promise Made:** Every action is traceable via evidence chain
**Action Taken:** Pipeline runs, governance writes, Slack hooks all fire
**Outcome:** Pipeline runs are transparent; voice path (most-used) is opaque
**Human Override:** Slack hooks allow human observation; no blocking on observation
**Confidence:** 0.65 (pipeline transparent; voice opaque)
**Trust Delta:** Neutral — what IS observable is well-instrumented; critical gap in voice coverage

**Dimension Score: 0.60** — pipeline well-instrumented; most-used path (voice) has no audit trail

---

## Dimension 4: ABSENCE OF HIDDEN ACTION (weight: 0.20)

**Definition:** Are there LLM calls or state changes that happen without any audit trail?

### Confirmed hidden LLM call paths:

**Path 1 — Voice-chat (`server.js:8618`)**
- Every `/api/voice-chat` request: calls `_vcRuntime.execute()` for each turn
- No `apex_agent_runs` write anywhere in the handler
- No governance hook
- Memory writes go to `episodic_memory` via gateway (tagged `source:'voice_chat'`)
- The LLM call itself: volume unknown, cost unknown, model unknown to audit log
- **This is the most-used path in the system**

**Path 2 — Adaptation cycle pattern synthesis (`adaptation-cycle.js:213–231`)**
- When `lessons.length >= 5`, calls `runtime.execute({ tier: 'fast', caller: 'adaptation-cycle' })` to synthesize patterns
- Goes through runtime (logged to stdout by subscriber)
- NOT written to `apex_agent_runs`
- Frequency: weekly Sunday cron + whenever adaptation cycle fires

**Path 3 — Executive entity LLM calls (`lib/executive/entity.js:36`)**
- Each `entity.decide()` call: `modelSelector.select('balanced')` → LLM call
- Written to `executive_decisions` table (per entity)
- NOT written to `apex_agent_runs`
- When executive council fires: 6 × entity LLM calls + 1 synthesis call = 7 unaudited calls

**Path 4 — Weekly review LLM call (`server.js:12037`)**
- `runtime.execute({ tier: 'fast', caller: 'weekly-review' })`
- NOT written to `apex_agent_runs`
- Frequency: weekly

**What IS fully audited:**
- All 8-stage orchestrator pipeline LLM calls (via `_auditLog()` → `apex_agent_runs`)
- Master-orchestrator `buildAgentPlan()` calls (via runtime.execute with governance)

**Promise Made:** All system actions are auditable
**Action Taken:** Pipeline runs are fully audited
**Outcome:** 4 execution paths (voice, adaptation, executive, weekly) run unaudited
**Human Override:** No override attempted on these paths
**Confidence:** 0.4 (significant hidden volume)
**Trust Delta:** Negative — voice path alone likely accounts for more LLM calls than pipeline

**Dimension Score: 0.35** — significant audit gaps in the most-used paths

---

## Dimension 5: ABSENCE OF BYPASSES (weight: 0.10)

**Definition:** Are there paths that skip constitutional enforcement, auth, or governance?

### Confirmed bypass paths:

**Bypass 1 — `BYPASS_DASHBOARD_AUTH=true` (`server.js:915`)**
- Skips JWT verification for ALL `/api` routes (because `app.use('/api', requireAuth)` at `server.js:524`)
- This is a total auth bypass for every API endpoint when set
- Does NOT bypass constitutional gate inside `runAgentTeam()`
- Risk: if set on Render, all API routes are unauthenticated

**Bypass 2 — Voice-chat has zero constitutional enforcement**
- `/api/voice-chat` does not call `checkAntiGoals()`
- No founder alignment injection in system prompt
- Anti-goal violations can be issued via voice with no gate
- Most-used execution path

**Bypass 3 — Constitutional gate fail-open**
- `orchestrator.js:971–973` — if `checkAntiGoals()` throws, execution continues
- A Supabase outage silently disables the constitutional gate for all pipeline tasks

**Bypass 4 — `COGNITIVE_CRONS_ENABLED` defaults OFF**
- All 4 Sunday cognitive evolution crons default to disabled
- Knowledge decay, cognitive evolution, performance metrics, org intelligence: all DORMANT by default
- System operates without these learning loops unless env var is explicitly set

**What is NOT a bypass:**
- `LOCAL_MODE` — only changes health-check DB client; no auth or governance impact
- `BYPASS_DASHBOARD_AUTH` does not affect `checkAntiGoals()` or `runAgentTeam()` constitutional gate

**Promise Made:** Constitutional enforcement is universal
**Action Taken:** Constitutional gate in orchestrator pipeline
**Outcome:** Voice path (most-used), fail-open gate, auth bypass env var all create gaps
**Human Override:** All bypasses require explicit env var or infrastructure failure
**Confidence:** 0.5 (gate exists for pipeline; voice and fail-open are real gaps)
**Trust Delta:** Negative — voice bypass and fail-open gate are architectural, not incidental

**Dimension Score: 0.45** — multiple bypass paths; constitutional gate reliable in pipeline only

---

## Composite Trust Score

```
system_trust_score = (
  0.55 × 0.25 +   // prediction accuracy
  0.65 × 0.25 +   // reliability
  0.60 × 0.20 +   // transparency
  0.35 × 0.20 +   // absence of hidden action
  0.45 × 0.10     // absence of bypasses
)
= 0.1375 + 0.1625 + 0.1200 + 0.0700 + 0.0450
= 0.535
```

**System Trust Score: 0.535 / 1.0**

---

## Promise Ledger

| Promise | Made | Delivered | Gap |
|---|---|---|---|
| Constitutional enforcement on all tasks | ✅ | ❌ Voice path has none | Voice bypasses constitution |
| Evidence chain for all LLM calls | ✅ | ❌ 4 unaudited paths | Voice, executive, adaptation, weekly |
| Governance probe gates deploy quality | ✅ | ⚠️ Probe doesn't block, only records | Score < 80 = incident, not block |
| Prediction accuracy drives self-correction | ✅ | ⚠️ Loop exists but broken final step | `cognitive_policy_settings` not read by engine |
| Budget enforcement prevents overspend | ✅ | ⚠️ Per-run cap ($2) enforced; monthly aggregate not enforced in pipeline | `resource-authority-engine.validate()` not called in orchestrator |
| Adaptation changes future model selection | ✅ | ✅ Confirmed at `orchestrator.js:1043` | None — this promise is kept |
| Slack notification on executive escalation | ✅ | ⚠️ Fires but creates no action item | Fire-and-forget; no follow-through |
| Governance is audit-ready | ✅ | ✅ 94/100 readiness | But readiness doesn't gate voice path |

---

## Trust Acceleration Path

The three changes that would most rapidly increase trust score:

1. **Wire voice-chat to `checkAntiGoals()` and `apex_agent_runs`** → transparency +0.15, hidden action +0.20, bypasses +0.10 → trust score +0.07
2. **Wire `cognitive_policy_settings` → `cognitive-policy-engine.js`** → prediction accuracy +0.20 → trust score +0.05
3. **Make constitutional gate fail-closed** (fail on DB error → hold task, not skip gate) → bypasses +0.15 → trust score +0.015

Combined: trust score from 0.535 → ~0.67
