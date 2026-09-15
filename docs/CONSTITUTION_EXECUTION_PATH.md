# CONSTITUTION EXECUTION PATH
Generated: 2026-06-14 — Empirical trace: founder values → actual behaviour change

---

## Full Chain

```
Founder Profile (DB)
↓
Anti-Goal Monitor / Context Provider
↓
Constitutional Gate (orchestrator.js:957)
↓
Route Selection (task-router.js)
↓
Model Selection (orchestrator.js:999 + 6 override layers)
↓
Execution (8-stage pipeline)
↓
Memory (episodic + lessons)
↓
Adaptation (registry + Bayesian update)
↓
Future Behaviour
```

---

## Step 1 — Where is Founder Profile Read?

**`lib/founder/profile.js:22–35`**
- Queries `founder_memory` table (section/key/value rows, ordered by `importance DESC`)
- Assembles: `{ identity, core_values, strategic_values, principles, anti_goals[], failure_pattern, peak_state }`
- 24h in-memory cache at key `founder:profile:full`
- Fallback on DB failure: `lib/memory/founder-memory.js:FALLBACK_CONTEXT` (hardcoded object)

**Anti-goals are DB-driven (not hardcoded).** Each row has: `text`, `keywords[]`, `severity` (medium/high/critical).

**Who calls `profile.load()`:**
- `lib/founder/anti-goal-monitor.js:17` — for keyword scanning
- `lib/founder/context-provider.js:26` — for alignment guidance
- `lib/founder/alignment-engine.js:16` — for scoring
- `lib/intelligence/sie.js:192,721` — Strategic Intelligence Engine (opportunity evaluation)
- `lib/intelligence/civilization-runtime.js:131` — before auto-queuing opportunities

---

## Step 2 — Where is Constitution Enforced?

### Hard blocks (execution stops):

**1. Anti-goal CRITICAL keyword match**
- `lib/founder/anti-goal-monitor.js:15` — `checkAntiGoals(text, profile)` scans task objective for keyword matches
- `orchestrator.js:956–970` — calls `checkAntiGoals()` as pipeline preflight
- If `block_execution === true` (severity = critical): `return { success: false, error: '[CONSTITUTIONAL_GATE]...' }` — no model calls made
- **This is the only code-level hard block on constitutional grounds**

**2. Escalation pattern keyword match**
- `runtime/task-router.js:37,59–67` — `ESCALATION_PATTERNS` regex: `/kill.switch|constitution|shutdown|delete.all|drop.table|purge.memory|override.safety|disable.governance/i`
- Matched → `founder_escalation` route → `orchestrator.js:1146–1151` → `{ held: true }`, zero model calls

**3. CTO gate on staged/critical deployments**
- `orchestrator.js:1562–1576` — CTO consulted for `staged` or `critical` complexity
- CTO response with `escalate === true` OR `choice` containing `reject/hold/deny` → `_fail()` (pipeline aborted)

**4. Autonomy/Twin/Behavior hard gates**
- `orchestrator.js:1397–1404` — AUTONOMY_GATE: if level = LEVEL_0 or twin says `do_not_deploy` → `_fail()`
- `orchestrator.js:1416–1420` — BEHAVIOR_GATE: blocking constraint from cognitive runtime → `_fail()`

### Advisory only (does NOT block):

**5. Anti-goal HIGH/MEDIUM match**
- `orchestrator.js:968–969` — `console.warn` only, execution proceeds

**6. Anti-goal check infrastructure failure**
- `orchestrator.js:971–973` — if `checkAntiGoals()` throws (DB offline, etc.) → `catch` logs warning, execution proceeds
- **Gate is fail-open on infrastructure errors**

**7. Governance (all domains)**
- `lib/governance.js` — all writes via `_w()` (fire-and-forget), never throws, never blocks
- `governance-probe.js:182–188` — probe score < 80 raises `high` incident, does NOT block execution

**8. Governance probe**
- Runs once, 60 seconds after startup (`server.js:11604`)
- Writes synthetic data to 10 governance tables, reads back
- Does NOT gate user requests — only runs on deploy

---

## Step 3 — Where is Constitution Injected into LLM Context?

**`ctx.obsidianContext` accumulation (before ARCHITECT call):**

Order of injection:
1. `lib/founder/context-provider.js:getAlignmentGuidanceForPrompt()` → `"FOUNDER ALIGNMENT:\n"` + mission + primary driver + relevant values + active principles + failure pattern warning + blocked anti-goals (`orchestrator.js:1086–1094`)
2. `CONSTITUTION.md` Articles 1–6 (first 800 chars): `"GOVERNING CONSTITUTION (abide by all articles):\n"` (`orchestrator.js:1097–1108`)
3. Wiki context (up to 1500 chars)
4. Intelligence layer formatted output
5. Gateway lessons (up to 5)
6. Cognitive directives (behavior modification, enforcement blocks)

**Injected into:** `ctx.obsidianContext` → passed as `SYSTEM MEMORY:` in the **user-turn** (not system prompt) to ARCHITECT at `orchestrator.js:370`. Same buffer passed to DEVELOPER and REVIEWER.

**ARCHITECT system prompt itself** (`orchestrator.js:294–308`): Contains Karpathy engineering principles. No founder values in the system prompt — only in user-turn content.

**Every injection is best-effort.** If `getAlignmentGuidanceForPrompt()` fails, execution continues without the founder block. No hard dependency.

---

## Step 4 — Where Can the Constitution Be Bypassed?

### Critical bypass: Voice-chat path

**`POST /api/voice-chat` (`server.js:8518`):**
- Does NOT call `checkAntiGoals()` at any point
- Does NOT call `runAgentTeam()` (8-stage pipeline)
- No founder values injected into system prompt (`server.js:8623–8631` — identity, voice rules, domain context only)
- No constitutional gate
- No governance hook
- LLM calls NOT written to `apex_agent_runs`
- **Voice-chat is the most-used execution path and is entirely outside constitutional enforcement**

**`POST /api/voice/pipeline` (`server.js:10214`):** Same — calls `runtime.execute()` directly, no constitutional gate.

### Master orchestrator path

**`agent-system/master-orchestrator.js`:**
- Calls `runAgentTeam()` at lines 269, 381, 502, 523
- Does NOT add its own constitutional gate before calling
- Constitutional gate fires INSIDE `runAgentTeam()` at line 957
- **Master orchestrator IS protected** via the same gate inside `runAgentTeam()`

### BYPASS_DASHBOARD_AUTH

**`server.js:915`** — `if (process.env.BYPASS_DASHBOARD_AUTH === 'true')`:
- Skips JWT verification for all routes (including all `/api` routes via `app.use('/api', requireAuth)`)
- **This is a total API auth bypass when set**
- Does NOT bypass constitutional gate (which is inside `runAgentTeam()`, not in auth middleware)

---

## Step 5 — Executive Decision Path

**When an executive is consulted:**
1. Task-router detects `executive_runtime` pattern + `!_looksLikeCode()` → routes to `executive_runtime` with entity ID
2. `orchestrator.js:1153–1166` → `consultExecutive(entity, question, context)` → `lib/cognitive/runtime/index.js:123`
3. `registry.decide(entityId, question, context)` → `entity.decide()` → LLM call (balanced tier)
4. Returns `{ choice, rationale, confidence, escalate }`
5. If `decision.escalate` → posts to Slack `#apex-escalations` (fire-and-forget)
6. Response returned directly as `{ executiveResponse: true, reply }` — **pipeline never runs**

**When CTO gates deployment:**
1. `orchestrator.js:1560` — after TESTER stage on `staged` or `critical` task
2. CTO consulted via `consultExecutive('cto', deploymentQuestion, context)`
3. `decision.escalate === true` → `_fail()` (hard abort)
4. `decision.choice` contains `reject/hold/deny` → `_fail()` (hard abort)
5. Otherwise: logs CTO approval, COMMITTER proceeds

---

## Step 6 — Memory Path (Post-Execution)

**On pipeline success:**
- `orchestrator.js:892` — `_gateway.storeMemory({ layer: 2 })` → episodic_memory (pg)
- `orchestrator.js:803` — `_gateway.storeMemory({ layer: 10 })` → apex_lessons
- `orchestrator.js:809` — `_reflexionTracker.createReflexion()` → reflexion_records (pending)
- `orchestrator.js:1651` — `_adaptEngine.learn(taskId, spec, { success: true })` → triggers `runCycle()` every 5 runs

**On pipeline failure:**
- `orchestrator.js:1352` — vault episodic record (JSON file)
- `orchestrator.js:1353` — `_adaptEngine.learn(taskId, spec, { success: false })` → triggers `runCycle()`

---

## Step 7 — Adaptation Path (Future Behaviour Change)

**What adaptation engine does with pipeline outcomes:**
1. `runCycle()` reads `apex_agent_runs` + `apex_agent_stages` — real failure rates per stage
2. Detects patterns: stage failure > threshold → `model_tier` recommendation at higher tier
3. Writes to `adaptation-registry.json` with Bayesian confidence
4. `orchestrator.js:1036–1043`: on next pipeline run, `getRecommendationsFor({stage})` → if conf ≥ 0.5 → `ctx.agentModels[stage] = rec.params.recommendedModel`
5. `recordApplication(id, succeeded)` → Bayesian update: confidence increases on success, decreases on failure

**This is the one fully closed learning loop confirmed in the system.** Founder values influence what tasks are allowed (anti-goal gate). Pipeline execution produces outcomes. Outcomes drive adaptation. Adaptation changes model selection on future runs.

---

## Broken Links in the Constitutional Chain

| Link | Status | Evidence |
|---|---|---|
| Founder values → anti-goal gate | ✅ WIRED | `orchestrator.js:956–970` |
| Anti-goal gate → pipeline block | ✅ WIRED (critical only) | `orchestrator.js:962–966` |
| Constitution.md → ARCHITECT prompt | ✅ WIRED | `orchestrator.js:1097–1108` |
| ARCHITECT compliance → verification | ❌ BROKEN | No code verifies ARCHITECT output respects constitution |
| Constitution → voice-chat path | ❌ MISSING | `server.js:8518` has zero constitutional enforcement |
| Executive decision → autonomous follow-up | ❌ BROKEN | Council escalations fire Slack but create no agent task |
| Governance probe → execution gate | ❌ MISSING | Probe score < 80 raises incident, does not block execution |
| Anti-goal check failure → safe default | ❌ BROKEN | Gate is fail-open on infrastructure error (`orchestrator.js:971`) |
| High/medium anti-goal → meaningful response | ❌ WEAK | Warn only — `console.warn`, no escalation, no logging to Slack |
