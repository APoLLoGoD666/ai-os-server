# Cognition Roadmap v2 — APEX AI OS
**Author:** Chief Cognitive Architecture Engineer  
**Date:** 2026-06-06  
**Starting point:** Cognition v1 (6.9/10) · AGI Readiness 6.3/10  
**Target:** Cognition 9.2/10 · AGI Readiness 8.5/10

---

## Current Cognition Score: 6.9/10

**Based on v1 certification (cognition-certification.md):**

| Dimension | Score |
|-----------|-------|
| Lesson generation | 6/10 |
| Lesson retrieval | 7/10 |
| Experience storage | 8/10 |
| Knowledge scoring | 7/10 |
| Pattern recognition | 7/10 |
| Memory consolidation | 6/10 |
| Experience retrieval | 7/10 |
| Confidence estimation | 0/10 |
| Adaptation | 2/10 |
| Self-evaluation | 0/10 |
| Learning velocity | 0/10 |

**Gaps driving the ceiling at 6.9:**
1. Cognitive loop is incomplete — adapt step missing
2. Reflections not persisted
3. Consolidation cron not running
4. Semantic retrieval not wired
5. No self-measurement of cognitive quality

---

## Projected Cognition Score After v2 Upgrades: 9.2/10

---

## Top 10 Highest-Value Improvements

Ranked by: (score delta × ease of implementation × risk profile)

---

### #1 — Wire Lesson Consolidation Cron
**Score impact:** +0.8  
**Effort:** 30 min  
**Risk:** Low (archive before overwrite)  
**File:** `server.js` cron section (10 lines)

```js
cron.schedule('30 3 * * 0', wrapCron('lesson_consolidation', async () => {
    const memory  = require('./agent-system/obsidian-memory');
    const engine  = require('./agent-system/reflection-engine');
    const raw     = memory.getLessons();
    if (!raw || raw.split('\n---\n').length <= 25) return;
    const consolidated = engine.consolidateLessons(raw, 30);
    // Archive first
    const archivePath = `12 Memory/Lesson-Archives/lessons-${new Date().toISOString().slice(0,10)}.md`;
    memory.write(archivePath, raw);
    memory.write('01 Executive/Lessons.md', consolidated);
    console.log('[LessonCron] Consolidated to 30 lessons, archived original');
}));
```

**Why this is #1:** Lessons.md is currently unbounded. Every week it grows. The tail-8 window will miss high-value older lessons. This fix is already coded — it just needs a caller. Highest ratio of impact to effort in the entire roadmap.

---

### #2 — Implement adaptation-engine.js (Routing Overrides)
**Score impact:** +1.5 (Adaptation 3.5 → 8.0)  
**Effort:** 4 hours  
**Risk:** Low (writes config file only; orchestrator reads it opportunistically)  
**Files:** `agent-system/adaptation-engine.js` (NEW), `config/cognition-weights.json` (NEW)

Core logic:
1. Load last 300 `apex_agent_stages` rows grouped by (complexity, domain)
2. For any group with `failureRate > 0.45` AND `n >= 15` → write routing override
3. For expired overrides OR fixed failure rates → remove override
4. Log what changed to `reports/adaptation-log-{date}.md`

Wire to weekly cron (Sunday 04:00) in server.js. Then:

**master-orchestrator.js (5-line change):**
```js
// At top of _preClassifyFeature()
const weights = _loadCognitionWeights(); // cached, reloads hourly
const override = weights.routingOverrides?.find(r =>
    r.complexity === estimated && r.domain === detectedDomain
    && (!r.expiresAt || Date.now() < new Date(r.expiresAt))
);
if (override?.confidence > 0.7) return override.overrideTier;
```

**Why #2:** Single highest-delta change in the entire roadmap. Closes the ADAPT step of the cognitive loop. Everything else in the loop is already present.

---

### #3 — Wire generateReflectionLesson() to REFLECTOR
**Score impact:** +0.7 (Learning 5.5 → 6.5)  
**Effort:** 1 hour  
**Risk:** Low (fallback to existing lesson if Haiku fails)  
**File:** `agent-system/orchestrator.js` — `_reflector()` function

Currently `_reflector()` calls `client.messages.create()` directly. Replace with:
```js
const engine = require('./reflection-engine');
const lesson = await engine.generateReflectionLesson(spec, agentLogs, success, existingLesson);
```

`generateReflectionLesson()` already has fallback logic: if API fails, returns `existingLesson`. Zero regression risk. Doubles lesson quality for synthesized runs.

---

### #4 — Episode updateEpisode() + REFLECTOR Wiring  
**Score impact:** +0.5 (Memory cohesion)  
**Effort:** 1 hour  
**Files:** `agent-system/episodic-memory.js` (+15 LOC), `agent-system/orchestrator.js` (3 lines)

Add to episodic-memory.js:
```js
function updateEpisode(id, patch) {
    try {
        const p = _epPath(id);
        if (!fs.existsSync(p)) return false;
        const ep = JSON.parse(fs.readFileSync(p, 'utf8'));
        Object.assign(ep, patch);
        fs.writeFileSync(p, JSON.stringify(ep, null, 2), 'utf8');
        const idx = _cache.findIndex(e => e.id === id);
        if (idx >= 0) Object.assign(_cache[idx], patch);
        return true;
    } catch { return false; }
}
module.exports.updateEpisode = updateEpisode;
```

In `_reflector()`, after lesson is generated:
```js
if (episodeId) episodic.updateEpisode(episodeId, { lessonText: lesson });
```

Episodes now carry the lesson they generated. Future similarity retrieval can show: "This task generated: [lesson text]."

---

### #5 — Increase Episode Cap to 500
**Score impact:** +0.3 (Memory capacity)  
**Effort:** 5 minutes  
**File:** `agent-system/episodic-memory.js` line 13

```js
const MAX_EPISODES = 500; // was 200
```

At 200 cap with 1-2 pipeline runs/day, the oldest episodes are only ~3 months old. Increasing to 500 gives 8-12 months of history — enough for seasonal pattern detection and long-term learning.

---

### #6 — Lesson Deduplication on Write
**Score impact:** +0.4 (Lesson quality)  
**Effort:** 1 hour  
**File:** `agent-system/obsidian-memory.js` — `addLesson()` function

Before appending, hash the first 60 chars of the lesson and check against a recent-lesson bloom filter:
```js
const _recentHashes = new Set();

function addLesson(lesson) {
    const sig = lesson.slice(0, 60).toLowerCase().replace(/\s+/g, '');
    if (_recentHashes.has(sig)) return false; // duplicate skip
    _recentHashes.add(sig);
    if (_recentHashes.size > 100) _recentHashes.delete(_recentHashes.values().next().value);
    // ... existing append logic
}
```

Prevents the same "DEVELOPER routing returns empty when..." lesson from appearing 12 times after repeated failures on the same task type.

---

### #7 — Confidence Estimator + ARCHITECT Context Injection
**Score impact:** +0.8 (Confidence estimation 0 → 8/10)  
**Effort:** 3 hours  
**File:** `agent-system/confidence-estimator.js` (NEW ~100 LOC)

Three inputs, one output:
```
f(complexity, stageFR, episodicSuccessRate) → confidence ∈ [0,1]

confidence =  (1 - stageFR[DEVELOPER]) × 0.4
            + episodicSuccessRate       × 0.4
            + complexityBaseConf        × 0.2

complexityBaseConf: simple=0.9, moderate=0.7, complex=0.5, critical=0.35
```

Injected into ARCHITECT prompt as one line:
```
CONFIDENCE ESTIMATE: 0.62 — moderate task, similar runs succeeded 58% — consider defensive test cases
```

Also gates pre-escalation:
```
IF confidence < 0.45 → planModel = SONNET (was HAIKU)
IF confidence < 0.30 → ARCHITECT gets: "Pre-escalated due to low confidence"
```

---

### #8 — Self-Evaluator Endpoint
**Score impact:** +0.7 (Self-evaluation 0 → 7.5/10)  
**Effort:** 2 hours  
**Files:** `agent-system/self-evaluator.js` (NEW), `server.js` (1 route)

Metrics computed from in-memory + Supabase data:
```js
{
  rollingSuccessRate:     0.74,  // last 30 episodes
  weekOverWeekDelta:     +0.08,  // learning velocity
  avgCostPerSuccessUsd:  0.042,  // efficiency
  topFailStage:          'DEVELOPER',
  lessonCount:           47,
  lastConsolidation:     '2026-06-01',
  confidenceAccuracy:    0.71,   // how often architect confidence matched outcome
  cognitionScore:        7.4     // composite
}
```

Exposed at `GET /api/cognition/self-evaluation`. Shown on dashboard Intelligence page.

---

### #9 — Semantic Retrieval (pgvector)
**Score impact:** +1.2 (Memory retrieval 5 → 8.5/10)  
**Effort:** 4 hours  
**Blocker:** Requires new Supabase table `apex_episodes` with pgvector column  
**Files:** `agent-system/semantic-retriever.js` (NEW), `agent-system/episodic-memory.js` (modified)

Creates a separate `apex_episodes` table with `embedding vector(1536)`. On episode store, optionally embeds the objective (fire-and-forget, non-blocking). On retrieval, uses cosine similarity.

```sql
-- One-time migration (safe, additive)
CREATE TABLE IF NOT EXISTS apex_episodes (
    id          TEXT PRIMARY KEY,
    objective   TEXT,
    success     BOOLEAN,
    complexity  TEXT,
    failed_stage TEXT,
    embedding   vector(1536),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON apex_episodes USING ivfflat (embedding vector_cosine_ops);
```

Keyword fallback preserved. Semantic path activates only when embedding exists.

---

### #10 — Planning Quality Registry + Adaptive ARCHITECT Prompting
**Score impact:** +0.8 (Planning quality 7 → 8.5/10)  
**Effort:** 3 hours  
**Files:** `agent-system/planning-quality-registry.js` (NEW), `agent-system/orchestrator.js` (ARCHITECT prompt section)

Tracks per-(complexity, domain): architect confidence history, warning patterns, plan→success correlation.

After 10+ samples, injects targeted guidance:
```
PLANNING INTELLIGENCE: Auth tasks have 65% plan success rate — 
past warnings about 'session token storage' preceded 3/5 failures.
Avg test cases for successful complex runs: 4.2 — aim for ≥4.
```

---

## Roadmap Timeline

```
WEEK 1 (Quick wins, no new files)
──────────────────────────────────
[ ] #1  Lesson consolidation cron (server.js, 30 min)
[ ] #5  Episode cap 200→500 (episodic-memory.js, 5 min)
[ ] #6  Lesson deduplication (obsidian-memory.js, 1 hr)

WEEK 2 (Close the adapt loop)
──────────────────────────────
[ ] #2  adaptation-engine.js + cognition-weights.json (4 hrs)
[ ] Wire adaptation cron to server.js (30 min)
[ ] Wire master-orchestrator to read routing overrides (30 min)

WEEK 3 (Close the learn loop)
──────────────────────────────
[ ] #3  Wire generateReflectionLesson() to REFLECTOR (1 hr)
[ ] #4  updateEpisode() + REFLECTOR wiring (1 hr)

WEEK 4 (Self-awareness)
────────────────────────
[ ] #7  confidence-estimator.js (3 hrs)
[ ] #8  self-evaluator.js + GET /api/cognition/self-evaluation (2 hrs)

WEEK 5-6 (Intelligence upgrades)
──────────────────────────────────
[ ] #9  Semantic retrieval / pgvector (4 hrs)
[ ] #10 Planning quality registry (3 hrs)
```

---

## Score Progression

| After | Cognition Score | AGI Readiness | Key Unlock |
|-------|-----------------|---------------|------------|
| Now (v1) | 6.9/10 | 6.3/10 | Foundation in place |
| Week 1 | 7.4/10 | 6.7/10 | Memory stable, no noise accumulation |
| Week 2 | 8.0/10 | 7.4/10 | ADAPT loop closed — first self-improving cycle |
| Week 3 | 8.4/10 | 7.8/10 | LEARN loop closed — full Observe→Adapt |
| Week 4 | 8.8/10 | 8.1/10 | Self-aware — system measures its own quality |
| Week 5-6 | 9.2/10 | 8.5/10 | Semantic memory + planning intelligence |

---

## From Adaptive AI to Self-Improving AI

The inflection point is **Week 2** — when adaptation-engine.js and the routing override wiring are complete.

Before Week 2: The system learns (generates lessons, stores episodes) but the lessons don't change how it operates. This is **Adaptive AI** — it has a memory but not a will.

After Week 2: Accumulated failure patterns automatically adjust model routing. The system observes its own failure patterns and modifies its decision-making. This is **Self-Improving AI** — the definition of the 7-8 tier in the AGI readiness framework.

Every week beyond Week 2 adds fidelity: semantic memory, confidence calibration, planning intelligence. But the qualitative jump — from a system that records to a system that adapts — happens at Week 2.

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Routing override causes regression | Low | 30-day expiry, confidence threshold 0.7, easy revert (delete key from JSON) |
| Lesson consolidation deletes high-value lessons | Low | Archive always before overwrite; manual inspect first run |
| Semantic retrieval embedding cost spike | Low | Fire-and-forget, cap at 50 embeddings/day, fallback to keyword |
| Planning quality registry injects bad advice | Medium | Require n≥10 samples before any injection; confidence threshold |
| Self-evaluator adds request latency | Low | All computation is in-memory aggregation; no API calls |

---

## Success Criteria for v2 Certification

The v2 cognition layer is certified when all of the following are true:

1. `GET /api/cognition/self-evaluation` returns `cognitionScore >= 8.5`
2. Lesson consolidation cron has run at least once without errors
3. adaptation-engine.js has produced at least one routing override (confirmed in adaptation-log)
4. `getSimilarExperiences()` returns semantic results for ≥50% of queries (pgvector path)
5. REFLECTOR calls `generateReflectionLesson()` (confirmed in Render logs)
6. Rolling success rate (last 30 episodes) is ≥ 0.70
7. `episodeCount()` ≥ 100 (enough data for pattern analysis to be valid)
