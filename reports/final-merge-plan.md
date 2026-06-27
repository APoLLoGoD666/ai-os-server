# APEX AI OS — Final Merge Plan
**Date:** 2026-06-06  
**Based on:** integration-audit.md · dependency-map.md  
**Goal:** Close the 7 open gaps to reach 9.5/10 readiness

---

## Merge Status of Completed Branches

| Branch | Commit | Status |
|--------|--------|--------|
| `feature/knowledge-system` | 3436d7f | ✅ Merged to main |
| `feature/autonomy-layer` | f1d32cb | ✅ Code merged — routes NOT wired |
| `feature/cognition-layer` | c4d707f | ✅ Merged to main |
| `cognition wiring` | a924ce2 | ✅ Merged to main |

All code is on `main`. The remaining work is **wiring and cleanup** — no new feature branches needed. All changes are in-place edits to existing files.

---

## Execution Plan

Work is ordered by impact and risk. Each step is independently shippable.

---

### Step 1 — Wire Autonomy Layer Routes (P1 · ~1 hour)
**Impact:** Unblocks the entire Autonomy layer from dead code to production feature.  
**Files:** `server.js`  
**Risk:** LOW — additive only, no existing routes modified.

Add two routes after the existing `/api/cognition/performance` block (around line 10866):

```js
// Autonomy layer — goal decomposition and multi-agent dispatch
app.post('/api/autonomy/plan', requireAppAccess, async (req, res) => {
    try {
        const { goal, maxSubtasks = 5 } = req.body || {};
        if (!goal) return res.status(400).json({ ok: false, error: 'goal required' });
        const { decomposeGoal } = require('./agent-system/task-planner');
        const plan = await decomposeGoal(goal, { simulate: true, maxSubtasks });
        res.json({ ok: true, plan });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/autonomy/assign', requireAppAccess, async (req, res) => {
    try {
        const { goal, simulate = true, concurrency = 1, maxSubtasks = 5 } = req.body || {};
        if (!goal) return res.status(400).json({ ok: false, error: 'goal required' });
        const { assignWork } = require('./agent-system/multi-agent-coordinator');
        const result = await assignWork(goal, { simulate, concurrency, maxSubtasks });
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});
```

**Note:** Default `simulate: true` on `/api/autonomy/assign` — caller must explicitly pass `simulate: false` to run real pipelines. This is the safe default given the 2-concurrent-pipeline memory ceiling.

**Verification:** `POST /api/autonomy/plan` with `{"goal": "add dark mode toggle"}` must return subtasks JSON. No API spend in simulate mode.

---

### Step 2 — Wire Enhanced Reflection (P2 · ~30 min)
**Impact:** Every pipeline run generates a higher-quality lesson using the full reflection engine.  
**Files:** `agent-system/orchestrator.js`  
**Risk:** LOW — `generateReflectionLesson()` falls back to `existingLesson` on any error.

In `_reflector()` (line 722), replace the inline Haiku call with:

```js
async function _reflector(spec, agentLogs, success) {
    const summary = agentLogs.slice(-4).map(l =>
        `${l.role}: ${JSON.stringify(l.result || {}).slice(0, 150)}`
    ).join('\n');

    try {
        // Basic lesson first (cheap, always succeeds)
        const reflexModel = M.HAIKU;
        const res = await _callClaude(reflexModel,
            `You are the REFLECTOR for Apex AI OS. Extract ONE concrete actionable lesson. One sentence. No filler.`,
            `Task: ${spec.objective}\nOutcome: ${success ? 'SUCCESS' : 'FAILURE'}\nPipeline:\n${summary}`,
            100, 'REFLECTOR'
        );
        const basicLesson = res.content[0]?.text?.trim();

        // Enhanced synthesis via reflection engine (uses failure patterns + existing lessons)
        const { generateReflectionLesson } = require('./reflection-engine');
        const lesson = await generateReflectionLesson(spec, agentLogs, success, basicLesson);

        if (lesson && lesson.length > 10) {
            memory.logLesson(`[Auto-Reflexion] ${lesson}`);
            console.log('[Reflector] lesson:', lesson.slice(0, 80));
        }
    } catch (e) {
        console.warn('[Reflector] skipped (non-fatal):', e.message);
    }
}
```

**Verification:** After a pipeline run, check `01 Executive/Lessons.md` — the new lesson should reference specific file types, patterns, or stages (not generic statements).

---

### Step 3 — Remove Dead Import (P2 · 5 min)
**Impact:** Removes misleading dependency from multi-agent-coordinator.  
**Files:** `agent-system/multi-agent-coordinator.js`  
**Risk:** NONE.

Remove line 6:
```js
// REMOVE THIS LINE:
const { summarizeExecution } = require('./execution-verifier');
```

`execution-verifier` remains available for direct use. The route in Step 1 exposes it indirectly via coordinator. No other change needed.

**Verification:** `node --check agent-system/multi-agent-coordinator.js` passes.

---

### Step 4 — Wire Domain Agent Reputation Tracking (P3 · ~30 min)
**Impact:** `getDomainAgentStats()` returns real data instead of always-null.  
**Files:** `agent-system/domain-agents.js`  
**Risk:** LOW — `recordDomainAgentRun()` is fire-and-forget, no return value, non-fatal.

In each domain agent handler in `domain-agents.js`, wrap the existing call to add tracking:

```js
// Example pattern — apply to all 5 domain agents (system, file, uni, finance, business)
const t0 = Date.now();
const result = await _runDomainAgent(agentId, query, context);
const _reputation = require('./agent-reputation');
_reputation.recordDomainAgentRun(agentId, !!result.ok, Date.now() - t0);
return result;
```

**Verification:** `GET /api/intelligence/system-status` — `reputation.domain.system.total` should increment after a domain agent call.

---

### Step 5 — Add reflection-engine Boot Check (P3 · 10 min)
**Impact:** Silent weekly cron failure becomes visible at startup.  
**Files:** `server.js` (boot verification block, around line 11400)  
**Risk:** NONE — additive.

```js
// After episodic-memory check (step 6):
try {
    const engine = require('./agent-system/reflection-engine');
    engine.scoreLessonText('test lesson'); // pure function, no API
    console.log('[Boot] ✓ reflection-engine loaded');
    _checkResult.push({ name: 'reflection-engine', ok: true });
} catch (e) {
    console.warn('[Boot] ✗ reflection-engine FAILED:', e.message);
    _checkResult.push({ name: 'reflection-engine', ok: false });
}
```

**Verification:** Boot log shows `[Boot] ✓ reflection-engine loaded`.

---

### Step 6 — Extract Shared Complexity Classifier (P4 · ~45 min)
**Impact:** Eliminates drift risk between orchestrator and task-planner complexity logic.  
**Files:** NEW `lib/complexity-classifier.js`, `agent-system/orchestrator.js`, `agent-system/task-planner.js`  
**Risk:** LOW — pure refactor, same logic, no behavior change.

Create `lib/complexity-classifier.js`:

```js
'use strict';
const _CRITICAL = /\b(auth(?:entication|oriz)?|password|secret|api.?key|jwt|oauth|stripe|payment|billing|sql.?inject|xss|csrf|rls|rbac|permiss|encrypt|hash|salt|session.?token)\b/i;
const _COMPLEX  = /\b(refactor|architect|orchestrat|embed|vector|agent.pipeline|rebuild|rewrit|multi.?step|integrat)\b/i;
const _SIMPLE   = /\b(add.?route|fix.?typo|update.?text|config|stub|rename|delete.?comment|format)\b/i;

function classifyComplexity(spec) {
    const obj   = (typeof spec === 'string' ? spec : (spec.objective || '')).toLowerCase();
    const files = typeof spec === 'object' ? (spec.filesToModify || []).length : 0;
    const steps = typeof spec === 'object' ? (spec.steps || []).length : 0;
    if (_CRITICAL.test(obj)) return 'critical';
    if (files >= 4 || steps >= 7 || _COMPLEX.test(obj)) return 'complex';
    if (files <= 1 && steps <= 3 && _SIMPLE.test(obj)) return 'simple';
    return 'moderate';
}

module.exports = { classifyComplexity };
```

Then update `orchestrator.js` to import and delegate to it, and `task-planner.js` similarly.

**Verification:** Run existing pipeline with a `critical` objective — model routing must still select SONNET/OPUS for critical tier.

---

### Step 7 — Minor Cleanup (P4 · 10 min)
**Files:** `agent-system/wiki-reader.js`  

Move `let _anthropic;` (line 5) inside `consolidateWiki()` as `let _anthropic = null;`. No behavior change.

---

## Merge Order

```
Step 1 (Autonomy routes)         ← HIGHEST IMPACT, standalone
Step 2 (Enhanced reflection)     ← Independent of step 1
Step 3 (Dead import removal)     ← 5 min, do alongside step 2
Step 4 (Domain agent tracking)   ← Independent
Step 5 (Boot check)              ← Independent
Step 6 (Shared classifier)       ← Requires steps 1-5 complete first
Step 7 (wiki-reader cleanup)     ← Anytime
```

Steps 1–5 can be committed individually; each is independently verifiable and non-breaking. Step 6 touches 3 files simultaneously and should be committed atomically.

---

## Expected Score After All Steps

| Step Completed | Autonomy | Cognition | Knowledge | Overall |
|---|---|---|---|---|
| Baseline (now) | 4/10 | 9/10 | 9/10 | **7.5/10** |
| After Step 1 | 8/10 | 9/10 | 9/10 | **8.5/10** |
| After Steps 1–2 | 8/10 | 9.5/10 | 9/10 | **9.0/10** |
| After Steps 1–5 | 8.5/10 | 9.5/10 | 9/10 | **9.2/10** |
| After All Steps | 9/10 | 9.5/10 | 9.5/10 | **9.5/10** |

---

## What NOT to Touch

Per audit scope restrictions:

- `obsidian-memory.js` — memory system, no changes
- `lib/embed.js` — embeddings, no changes
- `pg_database.js` / `pg_helpers.js` — database schema, no changes
- `lib/app-auth.js` — security middleware, no changes
- `supabase-setup.js` — RLS/schema, no changes

---

## Commit Convention

Each step should produce a commit message following the project pattern:
```
[Apex Wiring] Wire autonomy layer routes (task-planner + coordinator)
[Apex Wiring] Upgrade _reflector to use reflection-engine synthesis
[Apex Cleanup] Remove dead summarizeExecution import in coordinator
[Apex Wiring] Wire domain agent reputation tracking
[Apex Wiring] Add reflection-engine boot verification check
[Apex Refactor] Extract shared complexity-classifier.js
[Apex Cleanup] Move wiki-reader _anthropic to function scope
```
