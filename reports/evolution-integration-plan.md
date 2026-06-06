# Autonomous Evolution Integration Plan — APEX AI OS
**Author:** APEX Chief Autonomous Evolution Engineer  
**Date:** 2026-06-06  
**Status:** Ready to implement — all dependencies verified

---

## Overview

`improvement-executor.js` is live and syntax-verified. This document specifies the exact wiring changes needed to make it operational: the weekly cron trigger, the API route for inspection, and the master-orchestrator integration point for post-run analysis.

**Principle:** The integration is entirely additive. No existing logic is modified. Each change is independently reversible.

---

## Files to Edit

| File | Type of Change | Lines Touched |
|------|---------------|---------------|
| `server.js` | Add cron job + GET route | +15 lines |
| `agent-system/master-orchestrator.js` | Trigger roadmap on low autonomy | +8 lines |

Total new code: ~23 lines. No existing lines deleted or modified.

---

## Change 1 — Weekly Evolution Cron in server.js

**Location:** `server.js`, cron section (near other `cron.schedule` calls)  
**Trigger:** Every Sunday at 03:00 (runs after lesson consolidation cron at 03:30 if added)

```js
// ── Weekly evolution roadmap generation ──────────────────────────────────────
cron.schedule('0 3 * * 0', wrapCron('evolution_roadmap', async () => {
    try {
        const executor = require('./agent-system/improvement-executor');
        const roadmap  = await executor.generateRoadmap({ scheduleTop: false, writeMd: true });
        console.log(`[EvolutionCron] Generated ${roadmap.proposals.length} proposals, top priority: ${roadmap.proposals[0]?.id || 'none'}`);
    } catch (e) {
        console.error('[EvolutionCron] Roadmap generation failed:', e.message);
    }
}));
```

**Why `scheduleTop: false`:** The cron generates proposals and writes the Markdown roadmap to the vault. It does NOT auto-schedule them. A human reads the roadmap and calls `scheduleProposal()` manually for each item they want to action.

**Verification:** After deploying, check `vault/System/Improvements/roadmap-{date}.md` exists on Monday morning.

---

## Change 2 — Cognition Improvements API Route in server.js

**Location:** `server.js`, GET routes section  
**Trigger:** On demand (dashboard, direct API call)

```js
// GET /api/cognition/improvements — top pending improvement proposals
app.get('/api/cognition/improvements', requireAuth, async (req, res) => {
    try {
        const executor = require('./agent-system/improvement-executor');
        const n        = parseInt(req.query.limit || '5', 10);
        const top      = await executor.getTopImprovements(n);
        res.json({ ok: true, count: top.length, proposals: top });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});
```

**Response shape:**
```json
{
  "ok": true,
  "count": 3,
  "proposals": [
    {
      "id": "prop-tpl-adaptation-routing-wire-a1b2c3d4",
      "category": "adaptation",
      "targetModule": "agent-system/master-orchestrator.js",
      "changeDescription": "Read adaptation routing overrides...",
      "priorityScore": 8.73,
      "rank": 1,
      "confidence": 0.82,
      "risk": "low",
      "estimatedEffort": "4 hours",
      "expectedScoreDelta": 1.5,
      "status": "pending"
    }
  ]
}
```

**Additional routes (optional, add when needed):**

```js
// POST /api/cognition/improvements/:id/schedule
app.post('/api/cognition/improvements/:id/schedule', requireAuth, async (req, res) => {
    try {
        const executor = require('./agent-system/improvement-executor');
        const goal     = await executor.scheduleProposal(req.params.id);
        res.json({ ok: true, goalId: goal.id });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
});

// POST /api/cognition/improvements/:id/complete
app.post('/api/cognition/improvements/:id/complete', requireAuth, async (req, res) => {
    try {
        const executor = require('./agent-system/improvement-executor');
        executor.markCompleted(req.params.id);
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
});

// POST /api/cognition/improvements/:id/reject
app.post('/api/cognition/improvements/:id/reject', requireAuth, async (req, res) => {
    try {
        const executor = require('./agent-system/improvement-executor');
        executor.markRejected(req.params.id, req.body.reason || 'no reason given');
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
});
```

---

## Change 3 — Post-Run Analysis in master-orchestrator.js

**Location:** `agent-system/master-orchestrator.js`, end of the main pipeline run  
**Trigger:** After every completed pipeline run where autonomy score falls below threshold

```js
// ── Post-run evolution check (non-blocking, low-autonomy trigger) ─────────────
setImmediate(async () => {
    try {
        const _metrics  = require('./autonomy-metrics');
        const score     = await _metrics.getAutonomyScore();
        if (score && score.composite < 7.0) {
            const executor = require('./improvement-executor');
            await executor.generateRoadmap({ scheduleTop: false, writeMd: false });
        }
    } catch {}
});
```

**Why threshold 7.0:** Below 7.0 indicates cognitive degradation or a new failure mode. Generating a fresh proposal set when the system is struggling surfaces remediation options fast. Above 7.0 the system is healthy — proposals are generated on the weekly cron instead.

**Why `writeMd: false`:** On-demand proposals update `proposals.json` only. The human-readable roadmap snapshot is reserved for the weekly cron to avoid vault clutter.

---

## Change 4 — Vault Directory Bootstrap

**Location:** `server.js` or startup function  
**One-time:** Ensures improvement storage path exists on fresh deploy

```js
// Ensure improvement-executor storage directory exists
const fs   = require('fs');
const path = require('path');
const VAULT = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\arwwo\\Desktop\\AI Scripts\\APEX AI OS';
fs.mkdirSync(path.join(VAULT, 'System', 'Improvements'), { recursive: true });
```

This is idempotent (recursive + no error if exists). Place it in the startup section alongside other vault directory checks.

---

## Implementation Order

```
Step 1 — 5 min:
  Add vault directory bootstrap to server.js startup section.
  node --check server.js → must pass.

Step 2 — 10 min:
  Add weekly cron to server.js.
  Add GET /api/cognition/improvements to server.js.
  node --check server.js → must pass.

Step 3 — 10 min:
  Add post-run setImmediate block to master-orchestrator.js
  near end of main pipeline run function.
  node --check agent-system/master-orchestrator.js → must pass.

Step 4 — Verify:
  Call GET /api/cognition/improvements.
  Should return { ok: true, count: 0, proposals: [] } on first call
  (proposals.json empty until generateRoadmap() runs).

Step 5 — Trigger first roadmap manually:
  node -e "require('./agent-system/improvement-executor').generateRoadmap({ writeMd: true })"
  Verify vault/System/Improvements/roadmap-{date}.md appears.
  Verify vault/System/Improvements/proposals.json has entries.

Step 6 — Verify API:
  Call GET /api/cognition/improvements?limit=5.
  Should return top proposals sorted by priorityScore.
```

Total estimated time: 30 minutes.

---

## Rollback

Each change is independently reversible:

- **Cron:** Remove `cron.schedule('0 3 * * 0', ...)` block.
- **API route:** Remove `app.get('/api/cognition/improvements', ...)` block.
- **master-orchestrator:** Remove `setImmediate(async () => { ... })` block.
- **Vault directory:** Leave in place (no harm) or delete `System/Improvements/` from vault.

No Supabase schema changes. No existing files modified. Full rollback in < 5 minutes.

---

## Dashboard Integration (optional, future)

The `GET /api/cognition/improvements` route enables a dashboard panel:

```
┌─────────────────────────────────────────────────────────┐
│  EVOLUTION PROPOSALS                        [Refresh]   │
├─────────────────────────────────────────────────────────┤
│  #1  Adaptation Routing Wire     ★8.73  4hr  LOW  +1.5  │
│      → Schedule   Reject                                │
│  #2  Lesson Consolidation Cron   ★8.45  30m  LOW  +0.8  │
│      → Schedule   Reject                                │
│  #3  Semantic Retrieval pgvector ★7.91  4hr  MED  +1.2  │
│      → Schedule   Reject                                │
└─────────────────────────────────────────────────────────┘
```

Each row calls `POST /api/cognition/improvements/:id/schedule` or `/reject` on click.

---

## Dependencies Verified

| Dependency | Status |
|-----------|--------|
| adaptation-engine.js | live, exports getActiveAdaptations() |
| episodic-memory.js | live, exports getRecentEpisodes() |
| autonomy-metrics.js | live, exports getAutonomyScore() |
| memory-indexer.js | live, exports getStats() |
| goal-tracker.js | live, exports createGoal() |
| reflection-engine.js | live, exports analyzeFailures() |
| node --check improvement-executor.js | PASS |
| vault/System/Improvements/ path | created by bootstrap |
