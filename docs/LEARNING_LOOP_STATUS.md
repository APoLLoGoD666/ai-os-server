# LEARNING LOOP STATUS
Generated: 2026-06-14 — Empirical verification of each learning mechanism

Score:
- 0 = Not Learning (nothing generated)
- 1 = Recording (generated + stored; nothing reads it)
- 2 = Applying (stored + retrieved + reaches LLM context)
- 3 = Verifying (applied + outcome measured)
- 4 = Improving (verified + changes future behaviour autonomously)

---

## Mechanism 1: REFLEXION LOOP

**Score: 2 — APPLYING**

### Chain Trace:

**Lesson generated:**
`orchestrator.js:782–813` — `_reflector()` calls HAIKU after each run, extracts one-sentence lesson. Every pipeline run produces a lesson.

**Stored:**
`orchestrator.js:803` — `_gateway.storeMemory({ layer: 10, content: lesson })` → `apex_lessons` table.
`orchestrator.js:807–812` — `_reflexionTracker.createReflexion()` → `reflexion_records` row (`status: 'pending'`).

**Retrieved:**
`orchestrator.js:1183–1193` — `_gateway.getContext()` returns up to 5 lessons from `apex_lessons`. Appended to `ctx.obsidianContext` as `## Gateway Lessons`.
`reflexion-tracker.recordRetrieval()` called per lesson after retrieval (`orchestrator.js:1189`).

**Reaches LLM context:**
YES. `orchestrator.js:370` — `ctx.obsidianContext` injected into ARCHITECT user-turn as `SYSTEM MEMORY:`.

**Influence tracked:**
`orchestrator.js:1445–1449` — after ARCHITECT completes, `recordInfluence(lesson, taskId, 'architectural')` called for each retrieved lesson.
`reflexion-tracker.js:88` — `behavior_change_verified = newCount >= 1` — one influence call = auto-verified.

**BROKEN LINKS:**

1. Verification is circular: recording that a lesson was retrieved is called "verification". No code compares the quality of ARCHITECT output WITH vs WITHOUT the lesson.

2. `influenced_by_lesson` field in `decision_memory` is never populated by any code path. `retroactiveVerification()` in `adaptation-cycle.js:92` searches `decision_memory` for this field — always finds zero matches.

3. Retrieval ordering is purely chronological (`gateway.js:235` — `order('created_at', { ascending: false })`). No mechanism to surface more useful lessons over less useful ones.

4. No outcome measurement: there is no comparison of run success rate with vs without a given lesson.

**What would reach Score 3:** Track whether runs that retrieved lesson X had a higher success rate than runs that didn't. Write this signal back to lesson confidence.

**What would reach Score 4:** Use lesson confidence to reorder gateway retrieval. High-confidence lessons surface first. Low-confidence lessons decay out of retrieval.

---

## Mechanism 2: ADAPTATION REGISTRY LOOP

**Score: 3 — VERIFYING**

### Chain Trace:

**Pattern detected:**
`adaptation-engine.js:350–373` — `runCycle()` runs 3 analysis passes:
- Pass 1: stage failure rates from `agent-reputation.js` (reads `apex_agent_stages`)
- Pass 2: episodic patterns from `episodic-memory-pg.js` (reads `apex_lessons` via `getSuccessRate()`)
- Pass 3: category routing stats from `dynamic-agent-selector.getCategoryStats()` (reads `apex_agent_runs`)
Pure DB analysis — no LLM calls.

**Applied:**
`orchestrator.js:1036–1043` — `getRecommendationsFor({ stage })` → if `rec.type === 'model_tier'` and `conf >= 0.5` → `ctx.agentModels[stage] = rec.params.recommendedModel`. Confirmed model override.
`orchestrator.js:351` — `formatRecsAsContext()` injects active adaptations as `ACTIVE SYSTEM ADAPTATIONS:` text into ARCHITECT prompt.

**Outcome measured:**
`adaptation-engine.js:403–420` — `recordApplication(id, succeeded)` called after every pipeline completion (`orchestrator.js:1354,1652,1705`).
Bayesian update: `confidence = (successCount + 1) / (appliedCount + 2)` (Laplace smoothing).
Confidence goes up on success, down on failure. This is real feedback.

**Registry TTL:**
7-day TTL per entry. Low-confidence entries after multiple failures expire and are not renewed.
Current registry: STALE (all 3 entries expired 2026-06-13, refresh pending next Sunday cron).

**Verified:**
Adaptation that increases confidence after 5+ successful applications is functionally verified. No independent before/after success rate comparison exists, but Bayesian posterior is a valid proxy.

**BROKEN LINKS:**

1. Adaptation engine reach is limited to the 8-stage pipeline. Voice-chat, Gemini Live, and standalone agent runs do not consult adaptation engine for model selection.

2. `adaptation_cycles.routing_changes` JSONB column (written by weekly `adaptation-cycle.runWeeklyCycle()`) is never consumed. The strategic weekly cycle and the daily adaptation engine do not cross-talk.

3. Registry is a vault JSON file. Multiple processes could race on write (acknowledged in prior sessions as non-atomic).

**What would reach Score 4:** Wire adaptation recommendations to voice-chat model selection. Connect `adaptation_cycles.routing_changes` to feed the next `runCycle()` as initial constraints.

---

## Mechanism 3: MEMORY RETRIEVAL → DECISION

**Score: 2 — APPLYING**

### Chain Trace:

**Retrieved:**
`lib/memory/gateway.js:36–63` — `getContext()` assembles:
- Layer 0: founder context (anti-goals, values)
- Layer 10: lessons (up to 8, chronological DESC)
- Layer 11: policies from `cognitive_policy_settings`
- Layers 2+7: episodic + decision memory (historical)
- Layer 5: strategic memory (top goals/roadmap)

**Reaches ARCHITECT:**
YES. `orchestrator.js:1183–1193` — gateway context appended to `ctx.obsidianContext` → injected at `orchestrator.js:370`.
Cognitive directives from `gatewayPkg.policies` reach orchestrator at `orchestrator.js:1241–1249`.

**Retrieval tracked:**
`reflexion-tracker.recordRetrieval()` per lesson — writes to `reflexion_records`.
`reflexion-tracker.recordInfluence()` after ARCHITECT — marks lesson as having influenced a decision.

**BROKEN LINKS:**

1. Retrieval ordering is static (chronological). Nothing changes which memories surface based on past usefulness. `memory_temperature_scores` (lifecycle tiers) computed weekly but never used in `gateway.js`.

2. `reflexion_records` stats (retrieval_count, influence_count, behavior_change_verified) are computed but only drive `improvement_candidates` proposals — which are not auto-applied.

3. `cognitive_policy_settings` (Layer 11 in gateway context) IS retrieved and reaches orchestrator, but `cognitive-policy-engine.js::determine()` uses hardcoded heuristics — never reads from `cognitive_policy_settings`. Policies are transmitted but ignored.

**What would reach Score 3:** Use `reflexion_records.influence_count` to sort lessons before injection. High-influence lessons surface first. This closes the retrieval feedback loop with existing data.

**What would reach Score 4:** Wire `memory_temperature_scores` into `gateway.js` retrieval ordering. Hot memories surface first, cold memories fall back.

---

## Mechanism 4: EXECUTIVE EVOLUTION

**Score: 2 — APPLYING** (broken final step)

### Chain Trace:

**Prediction:**
`lib/cognitive/runtime/digital-twin-gate.js` — before execution, `simulatePolicy()` creates `digital_twin_simulations` row with `recommendation`, `risk_estimate`, `benefit_estimate`, `confidence`, `simId`.

**Outcome measured:**
`orchestrator.js:1700` — `_twinAcc.recordActual(ctx.runtimeControls.twin.simId, taskId, _res)` in `setImmediate`.
`digital-twin-accuracy-engine.js:14–87` — computes `forecast_accuracy`, `was_false_positive`, `was_false_negative`, writes to `twin_accuracy_records`.

**Attribution computed:**
`lib/cognitive/effectiveness/outcome-attribution-engine.js` — 7 per-dimension impact scores per task, stored in `outcome_attribution_records`.

**Policy evolution proposed:**
`lib/cognitive/evolution/policy-evolution-engine.js` — reads `outcome_attribution_records` + `twin_accuracy_records` → generates proposals → submits to `improvement_candidates` via `improvement-governor.js`.

**Policy applied:**
`policy-evolution-engine.js::applyApprovedEvolution()` — writes to `cognitive_policy_settings` table. This step executes when improvement governor auto-deploys.

**CRITICAL BROKEN LINK — Final step:**

`lib/cognitive/cognitive-policy-engine.js::determine()` — the authoritative cognitive policy decision maker — uses hardcoded heuristics for `_selectReasoningMode()`, `_selectPlanningMode()`, etc. It does NOT read from `cognitive_policy_settings` at any point.

`gateway.js:204–218` — `retrievePolicies()` reads `cognitive_policy_settings` and returns it in `ctx.gatewayPkg.policies`. The data reaches orchestrator. But `cognitive-policy-engine.js` ignores the table and uses hardcoded logic.

**Result:** The full chain from prediction → measurement → attribution → evolution → deployment is functional. But the deployed policy settings are never consumed by the engine that makes cognitive policy decisions. The evolution loop is closed on paper and broken in execution.

**What would reach Score 3:** Add one DB read at the top of `cognitive-policy-engine.js::determine()` that loads overrides from `cognitive_policy_settings` for the task's complexity/domain. Apply overrides to the heuristic thresholds.

**What would reach Score 4:** After applying policy overrides, `recordActual()` compares outcomes with-override vs without. Confidence adjusts. Policy reverts automatically if outcomes worsen.

---

## Mechanism 5: WEEKLY INTELLIGENCE

**Score: 2 — APPLYING** (applying to humans; not applying back to system)

### Chain Trace:

**Organizational Learning Engine:**
- Reads: `reflexion_records`, `semantic_memory`, `decision_memory`, `skill_memory`, `adaptation_cycles`, `improvement_candidates`, `contradiction_reports`
- Writes: `learning_reports` table + Obsidian vault + Slack webhook
- Consumer of output: NONE in system. Obsidian and Slack are human-readable terminals.

**Memory Lifecycle Engine:**
- Computes Hot/Warm/Cold/Archive tier for every memory object
- Writes: `memory_temperature_scores` table
- Consumer of output: `routes/intelligence-memory.js:182` (REST display only). `gateway.js` retrieval does NOT use temperature scores.

**Skill Snapshots:**
- `lib/memory/skill-memory.js::takeWeeklySnapshot()` — stores snapshot per skill
- Consumer: `organizational-learning-engine.js` (for reporting). No routing or assignment system reads skill confidence to change task dispatch.

**BROKEN LINKS:**

1. All three weekly engines produce insights that reach humans (via Slack/Obsidian) but do not feed back into the system's runtime behaviour.

2. `memory_temperature_scores` is the most structured output but is unused in retrieval.

3. Skill confidence is not used in `dynamic-agent-selector.js` category routing.

**What would reach Score 3:** Wire `memory_temperature_scores` into `gateway.js` retrieval. The temperature score becomes the primary sort key. Outcomes measured by comparing retrieval quality before/after.

**What would reach Score 4:** OLE insights feed adaptation-engine as structured JSON constraints at the start of each new week. The adaptation engine starts each Sunday cycle with OLE's identified patterns already seeded.

---

## Summary

| Mechanism | Score | Status | Critical Gap |
|---|---|---|---|
| Reflexion Loop | 2 | APPLYING | Influence tracking circular; no outcome measurement |
| Adaptation Registry | 3 | VERIFYING | Bayesian update working; doesn't reach voice path |
| Memory Retrieval | 2 | APPLYING | Retrieval order static; temperature scores unused; cognitive_policy_settings ignored by engine |
| Executive Evolution | 2 | APPLYING | `cognitive_policy_settings` written by evolution but NOT read by `cognitive-policy-engine.js` |
| Weekly Intelligence | 2 | APPLYING | All outputs reach humans; none feed back to system runtime |

**System average learning score: 2.2 — APPLYING**

The system records and applies lessons to LLM context. It does not yet verify that application changed outcomes. It does not yet improve retrieval or routing based on which lessons were useful.

**The one wire that would most advance this score:**
`cognitive-policy-engine.js::determine()` reading from `cognitive_policy_settings`.
This would immediately lift Executive Evolution to Score 4, and cause twin accuracy data to start driving actual cognitive policy — which feeds back into every pipeline run.
