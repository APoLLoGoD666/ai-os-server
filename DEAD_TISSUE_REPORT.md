# DEAD TISSUE REPORT
Generated: 2026-06-14 — Outputs produced but not consumed

Format: Output | Producer | Expected Consumer | Actual Consumer | Evidence | Recommendation

---

## P0 — Execution Drops (Highest Severity)

---

### DT-001 — `civilization:opportunity:execute` event has no listener

**Output:** Event bus emit for high-urgency opportunities that pass anti-goal gate

**Producer:** `lib/intelligence/civilization-runtime.js:152` — emits `bus.emit('civilization:opportunity:execute', { opportunity })` for each opportunity that passes `checkAntiGoals()` and is routed by `task-router.routeAndLog()`

**Expected Consumer:** An agent queue listener that enqueues a pipeline task for the opportunity

**Actual Consumer:** NONE — the event fires into void. `civilization-runtime.js` calls `task-router.routeAndLog()` before the emit, but the result of routing is not used to dispatch anything. The opportunity is identified, routed, and then dropped.

**Evidence:** `lib/intelligence/civilization-runtime.js:145–155`. Grep across all `.js` files: zero `bus.on('civilization:opportunity:execute'` listeners.

**Recommendation: WIRE** — Add listener in `services/init.js` or `lib/agent-queue.js` that calls `agentQueue.enqueue(opportunity)` on receipt. This connects the civilization observation loop to actual task dispatch for the first time.

---

### DT-002 — `CLAUDE_FIRST_TOKEN` event never emitted

**Output:** First-token timing event for streaming responses

**Producer:** NOWHERE — declared at `lib/event-bus.js:30`. No `bus.emit(bus.E.CLAUDE_FIRST_TOKEN` exists anywhere in the codebase.

**Expected Consumer:** `lib/response-timing-engine.js:62` and `lib/session-state-registry.js:126` — both registered listeners for this event

**Actual Consumer:** Listeners exist but never fire. Response timing engine cannot track time-to-first-token. Session state registry accumulates sessions that are never marked as having received a first token.

**Evidence:** `lib/event-bus.js:30` (declaration). `lib/response-timing-engine.js:62`, `lib/session-state-registry.js:126` (listeners). Zero emitters in codebase.

**Recommendation: WIRE** — Emit `bus.emit(bus.E.CLAUDE_FIRST_TOKEN, { sessionId, ts })` from `lib/models/runtime/index.js` when the first chunk arrives in the streaming path.

---

### DT-003 — Gemini Live emits zero bus events

**Output:** Voice session lifecycle events (VOICE_STARTED, AUDIO_RECEIVED, REFLEX_RESPONSE_SENT)

**Producer:** NOWHERE — declared in `lib/event-bus.js:25–28`. `routes/gemini-live.js` has zero `bus.emit()` calls anywhere.

**Expected Consumer:** `lib/session-state-registry.js:93,100,114` — registered listeners for all three events (session state tracking)

**Actual Consumer:** Listeners exist but never fire. All Gemini Live voice sessions are completely invisible to: session-state-registry, response-timing-engine, event spine (`agent_events` table), adaptation engine.

**Evidence:** `routes/gemini-live.js` — full file search, no `bus.emit` found. `lib/event-bus.js:25–28` (declarations). `lib/session-state-registry.js:93,100,114` (listeners).

**Recommendation: WIRE** — Add `bus.emit(bus.E.VOICE_STARTED)` at connection, `AUDIO_RECEIVED` on each audio chunk, `REFLEX_RESPONSE_SENT` when Claude response is dispatched. Three emit points in `routes/gemini-live.js`.

---

## P1 — Dead Outputs with System Impact

---

### DT-004 — `civilization_health_snapshots.alerts` never consumed

**Output:** CRITICAL/HIGH/MEDIUM alert array stored with each civilization health snapshot

**Producer:** `lib/telemetry/aggregator.js:45,53` and `lib/intelligence/civilization-health-engine.js:78–95` — alerts generated for conditions like HIGH financial_health, CRITICAL governance_score. Stored in `civilization_health_snapshots.alerts` JSONB column.

**Expected Consumer:** Slack alert, model selection downgrade, or automatic remediation trigger on CRITICAL classification

**Actual Consumer:** `routes/civilization.js:40,57` — REST API display endpoints only. Human-readable only.

**Evidence:** `lib/telemetry/aggregator.js:45–55`. Grep across all `.js`: no code reads `civilization_health_snapshots` outside of display routes and the health engine itself.

**Recommendation: WIRE** — In the daily civilization health cron (`server.js:12485`), after computing health, call `slack-alerts.alertError()` for CRITICAL alerts and `slack-alerts.alertWarn()` for HIGH alerts. Five lines.

---

### DT-005 — `reality-loop:opportunity-backlog` event has no listener

**Output:** Event emitted when open opportunities > 20

**Producer:** `lib/intelligence/reality-loop.js:119` — `bus.emit('reality-loop:opportunity-backlog', { count })`

**Expected Consumer:** Slack alert or automatic triage task creation

**Actual Consumer:** NONE — event fires into void. Reality loop is also DORMANT (`REALITY_LOOP_ENABLED` not set), so this is doubly dead.

**Evidence:** `lib/intelligence/reality-loop.js:119`. Zero `bus.on('reality-loop:opportunity-backlog'` in codebase.

**Recommendation: WIRE** — Add listener alongside DT-001 fix. When reality loop is enabled, this event should post to Slack with opportunity count and trigger triage scheduling.

---

### DT-006 — `adaptation_cycles.routing_changes` and `behavior_changes` never read

**Output:** Weekly strategic cycle proposes routing changes and behavior modifications, stored in `adaptation_cycles` JSONB columns

**Producer:** `lib/memory/adaptation-cycle.js:121` — `runWeeklyCycle()` stores proposed routing changes and behavior changes in the completed cycle DB row. Sunday 05:00 UTC cron.

**Expected Consumer:** Something that reads `routing_changes` and applies them to adaptation-engine in-memory rules or writes to a config table the orchestrator reads at startup

**Actual Consumer:** NONE — `adaptation_cycles` table is read by `organizational-learning-engine.js:146–153` for reporting only. No code reads `routing_changes` or `behavior_changes` columns to apply them.

**Evidence:** `lib/memory/adaptation-cycle.js:121`. `lib/intelligence/organizational-learning-engine.js:146–153` (read for reporting only). Zero other readers of `routing_changes` column.

**Recommendation: WIRE** — After `runWeeklyCycle()` completes, read `routing_changes` and call `adaptation-engine.recordOutcome()` or write overrides to a config table that `orchestrator.js` reads at startup via the adaptation registry. The weekly strategic cycle and the daily adaptation engine are two separate loops that never cross-talk.

---

### DT-007 — Voice-chat LLM calls not in `apex_agent_runs`

**Output:** Every `/api/voice-chat` LLM call — usage, cost, model, caller

**Producer:** `server.js:8618` — `_vcRuntime.execute()` call in voice-chat handler

**Expected Consumer:** `apex_agent_runs` audit log (same as pipeline runs). `cost_accounting` via output-capture.

**Actual Consumer:** `MODEL_INVOKED` event fires → subscriber logs to stdout. No `_auditLog()` call in voice-chat handler. No `apex_agent_runs` write. Memory writes go to `episodic_memory` via gateway, but the LLM call itself is untracked.

**Evidence:** `server.js:8518–8766` — no `_auditLog()` call. `server.js:10449` — `_auditLog()` is in orchestrator pipeline flow only.

**Recommendation: WIRE** — Add `apex_agent_runs` upsert in voice-chat handler after each LLM call, or route through `_auditLog()` with `type: 'voice'`. Voice is the most-used path and is currently invisible to: cost analytics, autonomy metrics, adaptation engine, governance probe.

---

### DT-008 — `improvement_candidates.deploy()` writes no actual config change

**Output:** `status='deployed'` row in `improvement_candidates` with `implementation_spec` JSONB

**Producer:** `lib/memory/improvement-engine.js:125` — `deploy()` sets `status='deployed'`. `improvement-governor._autoDeploy()` calls `deploy()` on approved auto-deploy candidates.

**Expected Consumer:** A deployment consumer that reads `implementation_spec` for deployed routing/threshold candidates and writes to a live config table (e.g., `cognitive_policy_settings`)

**Actual Consumer:** NONE — no code reads `improvement_candidates` where `status='deployed'` and acts on `implementation_spec`. Deploy marks a DB row and stops.

**Evidence:** `lib/memory/improvement-engine.js:125`. Grep: no reader of `status='deployed'` rows that applies config changes.

**Recommendation: PARK** — Auto-deployment of config changes requires explicit authorization. This dead-end is intentional until governance approves auto-apply. Mark in CONSTITUTION.md as a deliberate hold point.

---

## P2 — Observational Outputs That Don't Change Behaviour

---

### DT-009 — `memory_temperature_scores` not used by gateway retrieval

**Output:** Hot/Warm/Cold/Archive tier scores per memory object

**Producer:** `lib/intelligence/memory-lifecycle-engine.js:141–153` — Sunday 07:00 UTC cron. Scores recency, usage, confidence, graph connectivity. Writes to `memory_temperature_scores` table.

**Expected Consumer:** `lib/memory/gateway.js` retrieval ordering — hot memories should be retrieved first

**Actual Consumer:** `routes/intelligence-memory.js:182` — REST API endpoint `getHotMemory(table, limit)` for display. `memory-lifecycle-engine.js` reads its own output for reporting.

**Evidence:** `lib/memory/gateway.js:235` — all layer retrieval uses `order('created_at', { ascending: false })`. Zero reference to `memory_temperature_scores` in gateway.js.

**Recommendation: WIRE** — In `gateway.js` lesson retrieval (`gateway.js:280–290`), add a secondary sort that prefers memories with `temperature_score > 0.7` (Hot tier). One ORDER BY change connects 6 weeks of lifecycle computation to actual retrieval behaviour.

---

### DT-010 — `learning_reports` never consumed by system

**Output:** Weekly organizational learning reports with insights from reflexion, semantics, decisions, skills, adaptations

**Producer:** `lib/intelligence/organizational-learning-engine.js:257` — writes to `learning_reports` table + Obsidian + Slack. Sunday 08:00 UTC.

**Expected Consumer:** Something that reads learning insights to modify retrieval weights, routing thresholds, or planning strategies

**Actual Consumer:** `organizational-learning-engine.js:392,404` — reads its own reports for pagination. No other system.

**Evidence:** `lib/intelligence/organizational-learning-engine.js:257`. Grep: `learning_reports` table read only in OLE itself.

**Recommendation: PARK** — The OLE report format (Markdown) is not structured for programmatic consumption. To wire this, OLE would need to output a structured JSON insight set that downstream systems could act on. Do not wire until OLE output format is changed.

---

### DT-011 — `runtime-readiness.calculateReadiness()` triggers no alert

**Output:** 8-dimension audit readiness score with `NOT AUDIT READY` classification

**Producer:** `lib/runtime-readiness.js:calculateReadiness()`. Called from `routes/governance.js:547`.

**Expected Consumer:** Slack alert when classification = `NOT AUDIT READY`; optional: block autonomous actions above cost threshold

**Actual Consumer:** REST API display only (`routes/governance.js:547`).

**Evidence:** `lib/runtime-readiness.js` — no alert emission. `routes/governance.js:547` — returns to caller.

**Recommendation: WIRE** — Post Slack `#apex-ops` alert when `classification === 'NOT_AUDIT_READY'`. One call to `slack-alerts.alertWarn()` in the governance cron or in `calculateReadiness()` itself.

---

### DT-012 — `executive_deliberations` escalation is fire-and-forget

**Output:** Council recommendation with `escalate: true`, posted to Slack `#apex-escalations`

**Producer:** `lib/executive/executive-council.js:180` — `escalateToFounder()` posts to Slack when `anyEscalate || avgConfidence < 0.45`

**Expected Consumer:** An `agent_tasks` row for human review; or a hold on autonomous execution until escalation is acknowledged

**Actual Consumer:** Slack post is terminal. DB status written. No task created, no execution pause, no acknowledgement path.

**Evidence:** `lib/executive/executive-council.js:180–192`. No code reads `executive_deliberations.escalate` to pause execution.

**Recommendation: WIRE** — When `escalate === true`, create an `agent_tasks` row with `type: 'human_review'` and `status: 'waiting_approval'`. This connects the executive escalation path to the existing human approval workflow.

---

### DT-013 — `resource-authority-engine.validate()` never called in orchestrator

**Output:** Budget enforcement check (returns allowed/denied based on remaining monthly budget)

**Producer:** `lib/intelligence/resource-authority-engine.js:validate({ estimatedCostUsd })` — queries `cost_accounting` for monthly spend. Called from: `lib/intelligence/reality-loop.js` only.

**Expected Consumer:** `agent-system/orchestrator.js` pipeline entry — block expensive tasks when budget nearly exhausted

**Actual Consumer:** Reality loop (which is DORMANT). No other caller.

**Evidence:** `lib/intelligence/resource-authority-engine.js`. Search for callers: only `reality-loop.js`. `orchestrator.js` checks `_budget.costUsd > 2.00` per-run (its own cost cap) but does not check monthly aggregate budget.

**Recommendation: WIRE** — Call `resource.validate({ estimatedCostUsd: 0.50 })` at the start of `orchestrator.js` task dispatch. If denied, return `{ held: true, reason: 'budget_exhausted' }`. One call connects the resource authority to actual execution control.

---

### DT-014 — MODEL_INVOKED subscriber logs to stdout only

**Output:** `logger.info('model_invoked', { model, caller, input_tok, output_tok, cost_usd })` on every LLM call

**Producer:** `lib/models/runtime/subscriber.js:9–22` — activated at `server.js:11589`

**Expected Consumer:** Cost aggregator, log drain, dashboard

**Actual Consumer:** Render log stdout only. `cost_accounting` is written independently by `output-capture.js` (called from `governance.js`, not from subscriber). The event and the DB write are disconnected.

**Evidence:** `lib/models/runtime/subscriber.js:20` — `logger.info(...)` only. `lib/models/output-capture.js:11` — writes to `cost_accounting`, no connection to MODEL_INVOKED event.

**Recommendation: REMOVE** the `logger.info` call from subscriber (it duplicates data already in `cost_accounting`). Replace with a direct call to `output-capture.capture()` to close the cost-accounting loop for all runtime.execute() calls.

---

## Summary Table

| ID | Output | Severity | Recommendation |
|---|---|---|---|
| DT-001 | `civilization:opportunity:execute` event | P0 | WIRE listener → agentQueue.enqueue() |
| DT-002 | `CLAUDE_FIRST_TOKEN` never emitted | P0 | WIRE emit from runtime/index.js streaming path |
| DT-003 | Gemini Live emits no bus events | P0 | WIRE VOICE_STARTED/AUDIO_RECEIVED/REFLEX_RESPONSE_SENT |
| DT-004 | `civilization_health_snapshots.alerts` | P1 | WIRE → slack-alerts on CRITICAL/HIGH |
| DT-005 | `reality-loop:opportunity-backlog` | P1 | WIRE → Slack + triage task (after enabling reality loop) |
| DT-006 | `adaptation_cycles.routing_changes` | P1 | WIRE → adaptation-engine after weekly cycle |
| DT-007 | Voice-chat LLM calls unaudited | P1 | WIRE → apex_agent_runs upsert |
| DT-008 | `improvement_candidates.deploy()` no-op | P2 | PARK (intentional hold) |
| DT-009 | `memory_temperature_scores` unused | P2 | WIRE → gateway.js retrieval ordering |
| DT-010 | `learning_reports` not consumed | P2 | PARK (format not machine-readable) |
| DT-011 | `calculateReadiness()` triggers no alert | P2 | WIRE → slack-alerts.alertWarn() |
| DT-012 | Executive escalation is fire-and-forget | P2 | WIRE → agent_tasks human_review row |
| DT-013 | `resource-authority-engine.validate()` not called | P2 | WIRE → orchestrator.js pipeline entry |
| DT-014 | MODEL_INVOKED subscriber → stdout only | P3 | REMOVE logger; call output-capture.capture() |
