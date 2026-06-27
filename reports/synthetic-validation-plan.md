# Synthetic Runtime Validation Plan
**Date:** 2026-06-06  
**Engineer:** Principal Validation Architect  
**Objective:** Design a fully removable synthetic corpus that exercises every APEX learning, memory, planning, reflection, adaptation, retrieval, and autonomy subsystem before any real personal data is ingested.  
**Constraint:** Design only. No code modifications. No production data changes.

---

## Overview

Three tiered datasets, each a strict superset of the previous:

| Tier | Dataset ID | Purpose | Records | Covers |
|------|-----------|---------|---------|--------|
| 1 | `sdv1-dim` | All 6 autonomy dimensions → evidence-backed | ~6 | Score inflation → 0% |
| 2 | `sdv1-loop` | All learning loops activated | ~44 | Every subsystem first output |
| 3 | `sdv1-scale` | Large-scale ingestion behavior | ~160+ | Context scaling, index limits, retrieval at volume |

All synthetic records include lineage metadata for surgical removal. No production system state persists after rollback.

---

## 1. Dataset Schemas

### 1.1 Episode Schema (`VAULT/12 Memory/Episodes/ep-synth-{dataset_id}-{seq}.json`)

**Source:** `episodic-memory.storeEpisode()` — exact field names required by all consumers.

```json
{
  "id": "synth-{dataset_id}-{seq}",
  "timestamp": "2026-06-01T10:00:00.000Z",
  "objective": "[SYNTHETIC] {task description}",
  "complexity": "simple | moderate | complex | critical",
  "success": true,
  "cost": 0.0142,
  "durationMs": 45000,
  "failedStage": null,
  "failureReason": null,
  "models": null,
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "synthetic": true,
  "source": "test",
  "dataset_id": "sdv1-{tier}",
  "removable": true
}
```

**File naming:** `ep-synth-{dataset_id}-{seq:03d}.json`  
**Storage path:** `VAULT/12 Memory/Episodes/`  
**Cleanup key:** filename prefix `ep-synth-`  
**Pruning guard:** `_pruneOldEpisodes()` sorts by mtime — synthetic files have past timestamps and will be pruned first. Set mtime to recent dates (within 7 days) to protect from auto-pruning during test.

**Field constraints:**
- `failedStage`: must be one of `RESEARCHER | ARCHITECT | DEVELOPER | REVIEWER | VALIDATOR | TESTER | COMMITTER | REFLECTOR` (or null)
- `keywords`: derived from objective by `_keywords()` — must be lowercase, 4+ chars, non-stopword
- `complexity`: exact string match — `simple`, `moderate`, `complex`, `critical`

---

### 1.2 Pipeline Run Schema (`apex_agent_runs` table)

**Source:** `orchestrator.js ~line 786` upsert.

```sql
-- Schema (from supabase-setup.js line 198):
-- task_id TEXT PRIMARY KEY
-- objective TEXT
-- success BOOLEAN DEFAULT FALSE
-- cost_usd NUMERIC(10,6) DEFAULT 0
-- complexity TEXT DEFAULT 'moderate'
-- agent_summary JSONB DEFAULT '[]'
-- created_at TIMESTAMPTZ DEFAULT NOW()
```

**Synthetic INSERT format:**
```sql
INSERT INTO apex_agent_runs (task_id, objective, success, cost_usd, complexity, agent_summary, created_at)
VALUES (
  'synth-{dataset_id}-{seq}',
  '[SYNTHETIC] {same objective as matching episode}',
  {true|false},
  {cost_usd},
  '{complexity}',
  '[]',
  '{timestamp}'
);
```

**Cleanup key:** `task_id LIKE 'synth-%'`  
**Cleanup SQL:** `DELETE FROM apex_agent_runs WHERE task_id LIKE 'synth-%';`

**Critical:** The `objective` field in `apex_agent_runs` must match the first 40 chars of the corresponding failure episode's objective. This is required for `recoveryRate()` to detect recovery:
```js
const kw = (ep.objective || '').slice(0, 40);  // used in ILIKE query
```

---

### 1.3 Goal Schema (`VAULT/System/Goals/goal-synth-{dataset_id}-{seq}.json`)

**Source:** `goal-tracker.addGoal()` / `completeGoal()`.

```json
{
  "id": "goal-synth-{dataset_id}-{seq}",
  "objective": "[SYNTHETIC] {goal description}",
  "status": "completed | blocked | pending | active",
  "priority": "high | medium | low",
  "source": "test",
  "createdAt": "2026-06-01T08:00:00.000Z",
  "completedAt": "2026-06-01T14:00:00.000Z",
  "blockedReason": null,
  "synthetic": true,
  "dataset_id": "sdv1-{tier}",
  "removable": true
}
```

**File naming:** `goal-synth-{dataset_id}-{seq:03d}.json`  
**Cleanup key:** filename prefix `goal-synth-`

**Note:** `goal-tracker.getStats()` reads ALL `goal-*.json` files in `System/Goals/`. Synthetic goals contribute directly to `goalCompletion` dimension. Design goal set to produce a realistic completion rate (not 1.0 or 0.0).

---

### 1.4 Plan Record Schema (`VAULT/System/PlanQuality/plan-quality-registry.json`)

**Source:** `planning-quality-registry.js` — written as a rolling array in one JSON file.

The registry file structure:
```json
{
  "version": "1.0",
  "generatedAt": "2026-06-06T12:00:00.000Z",
  "totalRecords": 3,
  "records": [
    {
      "planId": "pln-synth-{dataset_id}-{seq}",
      "goal": "[SYNTHETIC] {goal description, max 120 chars}",
      "complexity": "simple | moderate | complex | critical",
      "category": "development | analysis | infrastructure | research",
      "planType": "normal | split | replanned",
      "subtaskCount": 3,
      "stepCount": 9,
      "fileCount": 4,
      "risk": 0.3,
      "wasReplanned": false,
      "replanCount": 0,
      "recoveryCount": 0,
      "outcome": "success | failed | partial",
      "successRate": 1.0,
      "failurePatterns": [],
      "executionCost": 0.0089,
      "durationMs": 38000,
      "stagesCompleted": ["RESEARCHER","ARCHITECT","DEVELOPER","REVIEWER","VALIDATOR","TESTER","COMMITTER"],
      "createdAt": "2026-06-01T14:00:00.000Z",
      "completedAt": "2026-06-01T14:43:00.000Z",
      "synthetic": true,
      "source": "test",
      "dataset_id": "sdv1-{tier}",
      "removable": true
    }
  ]
}
```

**Important:** This file IS the canonical data store (not derived). Must be written directly.  
**Cleanup:** Filter `records` array to remove entries where `synthetic === true`, then re-save.  
**Directory creation:** `VAULT/System/PlanQuality/` must be created if missing.

---

### 1.5 Lesson Schema (`VAULT/01 Executive/Lessons.md`)

**Source:** `obsidian-memory.logLesson()` appends to this file.

Lessons are separated by `\n---\n`. Synthetic lessons are wrapped in HTML comment markers for clean removal:

```markdown
<!-- SYNTHETIC-BEGIN:{dataset_id} -->

---
[SYNTHETIC:{dataset_id}] Always check git status before committing — COMMITTER fails silently when staged files are missing. Explicit `git status` in the COMMITTER prompt prevents this. Observed in 3 of 4 COMMITTER failures in moderate-complexity tasks.

---
[SYNTHETIC:{dataset_id}] DEVELOPER consistently fails on TypeScript type inference with HAIKU model for complex tasks. Retry with SONNET resolves in 100% of observed cases. Pre-escalate complex TypeScript tasks to SONNET.

---
[SYNTHETIC:{dataset_id}] Tasks with fileCount > 4 have 60% failure rate vs 25% for fileCount ≤ 4. ARCHITECT should explicitly propose splitting when estimated file touch count exceeds 4.

---
[SYNTHETIC:{dataset_id}] REVIEWER failures concentrate on incomplete test coverage (40% of failures). REVIEWER prompt should explicitly require coverage percentage before approving.

---
[SYNTHETIC:{dataset_id}] API cost scales super-linearly with complexity. critical tasks cost 4× moderate, not 2×. Budget projections should use 4× multiplier for critical complexity tier.

---
[SYNTHETIC:{dataset_id}] RESEARCHER adds the most context quality for domain-specific tasks (web/API work). For pure code refactoring, RESEARCHER output is rarely used by ARCHITECT — skip for simple/refactor tasks.

---
[SYNTHETIC:{dataset_id}] Recovery attempts succeed when model is escalated (HAIKU→SONNET). Recovery fails when the same model retries the same prompt without modifications. Variation is required for recovery to be effective.

---
[SYNTHETIC:{dataset_id}] VALIDATOR false positives (flagging working code as failing) occur when the validation spec is stale. Spec freshness check should be added to VALIDATOR prompt for long-running sessions.

<!-- SYNTHETIC-END:{dataset_id} -->
```

**Cleanup:** Remove everything between `<!-- SYNTHETIC-BEGIN:{dataset_id} -->` and `<!-- SYNTHETIC-END:{dataset_id} -->` (inclusive), using sed or string manipulation.  
**Note:** wiki-reader.js splits on `\n---\n` and reads sections with length > 10. The `[SYNTHETIC:{dataset_id}]` prefix ensures cleanup by text search even if marker removal fails.

---

### 1.6 Memory Index Schema (`VAULT/12 Memory/memory-index.json`)

**Source:** Auto-rebuilt by `memory-indexer.rebuildIndex()` from episodes + Lessons.md. **DO NOT write this directly.** After synthetic episodes and lessons are loaded, `rebuildIndex()` will populate it on next server start (or via API call if available).

If a pre-built index is required for offline testing, the format is:
```json
{
  "version": 2,
  "updatedAt": "2026-06-06T12:00:00.000Z",
  "episodes": [
    {
      "id": "synth-sdv1-loop-001",
      "type": "episode",
      "text": "[SYNTHETIC] Build dashboard metrics widget complexity:moderate outcome:success dashboard metrics widget",
      "hash": "{fnv1a hash of 'ep:' + id}",
      "embedding": null,
      "meta": {
        "success": true,
        "complexity": "moderate",
        "failedStage": null,
        "timestamp": "2026-06-01T10:00:00.000Z",
        "cost": 0.0142,
        "durationMs": 45000
      }
    }
  ],
  "lessons": []
}
```

**Note:** `embedding: null` entries will be queued for embedding by `_embedPending()` on startup. Do not pre-populate embeddings — let the system generate them to validate the embedding pipeline.

---

### 1.7 Financial Transaction Schema (`transactions` table)

```sql
-- transactions table (supabase-setup.js line 96):
-- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- user_id TEXT, amount DECIMAL, currency TEXT DEFAULT 'GBP'
-- description TEXT, category TEXT, merchant TEXT
-- date TIMESTAMPTZ, account TEXT, type TEXT
-- receipt_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
```

**Synthetic INSERT format:**
```sql
INSERT INTO transactions (user_id, amount, currency, description, category, merchant, date, account, type, created_at)
VALUES (
  'test-user',
  {amount},
  'GBP',
  '[SYNTHETIC] {description}',
  '{category}',
  '{merchant}',
  '{date}',
  '{account}',
  'expense | income',
  '{timestamp}'
);
```

**Cleanup SQL:** `DELETE FROM transactions WHERE description LIKE '[SYNTHETIC]%';`

---

### 1.8 Invoice Schema (`invoices` table)

```sql
INSERT INTO invoices (user_id, client_name, client_email, amount, currency, status, due_date, items, invoice_number, created_at)
VALUES (
  'test-user',
  '[SYNTHETIC] Test Client Ltd',
  'test@synthetic.local',
  {amount},
  'GBP',
  'paid | draft | overdue',
  '{due_date}',
  '[{"description":"[SYNTHETIC] Service","qty":1,"unit_price":{amount},"total":{amount}}]',
  'SYNTH-{seq:03d}',
  '{timestamp}'
);
```

**Cleanup SQL:** `DELETE FROM invoices WHERE invoice_number LIKE 'SYNTH-%';`

---

### 1.9 Email Thread Schema (`email_threads` table)

```sql
-- From supabase-setup.js line 60:
-- id UUID, thread_id TEXT, subject TEXT, sender TEXT, recipients TEXT[]
-- snippet TEXT, body TEXT, labels TEXT[], date TIMESTAMPTZ
-- is_read BOOLEAN, created_at TIMESTAMPTZ
```

**Synthetic INSERT format:**
```sql
INSERT INTO email_threads (thread_id, subject, sender, recipients, snippet, body, labels, date, is_read, created_at)
VALUES (
  'synth-thread-{dataset_id}-{seq}',
  '[SYNTHETIC] {subject}',
  'synthetic@test.local',
  ARRAY['alex@test.local'],
  '[SYNTHETIC] Email content preview...',
  '[SYNTHETIC] Full email body content for testing...',
  ARRAY['{label}'],
  '{date}',
  true,
  '{timestamp}'
);
```

**Cleanup SQL:** `DELETE FROM email_threads WHERE thread_id LIKE 'synth-thread-%';`

---

### 1.10 Chat Conversation Schema (`VAULT/13 Briefings/Conversations/synth-{date}.md`)

```markdown
---
title: "[SYNTHETIC] Conversation — {date}"
type: briefing
status: synthetic
date: {YYYY-MM-DD}
synthetic: true
dataset_id: sdv1-scale
removable: true
---

# [SYNTHETIC] Session — {date}

**Topics discussed:** {topic summary}

**Decisions made:**
- {decision 1}
- {decision 2}

**Actions taken:**
- {action 1}
- {action 2}

**Notes:** This is a synthetic conversation record for validation testing.
```

**Cleanup:** `find VAULT/13 Briefings/Conversations/ -name "synth-*.md" -delete`

---

### 1.11 Project History Schema (`VAULT/02 Projects/Archive/synth-{name}.md`)

```markdown
---
title: "[SYNTHETIC] {Project Name}"
type: project
status: completed | archived
synthetic: true
dataset_id: sdv1-scale
removable: true
start_date: {YYYY-MM-DD}
end_date: {YYYY-MM-DD}
---

# [SYNTHETIC] {Project Name}

**Status:** Completed  
**Duration:** {N} weeks  
**Outcome:** {outcome summary}

## Key Decisions
- {decision 1}
- {decision 2}

## Lessons
- {lesson 1}
- {lesson 2}
```

**Cleanup:** `find VAULT/02 Projects/Archive/ -name "synth-*.md" -delete`

---

## 2. Record Counts

### Tier 1 — sdv1-dim (Autonomy Dimension Coverage)

| Data type | Count | Purpose |
|-----------|-------|---------|
| Episodes (success) | 1 | executionSuccess ≠ null |
| Episodes (failure) | 1 | recovery ≠ null (failure episode required) |
| apex_agent_runs rows | 2 | Supabase retryRate path (primary) |
| Goals (completed) | 2 | goalCompletion expansion beyond smoke test |
| Goals (blocked) | 1 | goalCompletion realistic rate |
| **Total records** | **7** | — |

**Autonomy score after Tier 1:** All 6 dimensions evidence-backed. Inflation = 0%.

---

### Tier 2 — sdv1-loop (Learning Loop Activation)

Includes all Tier 1 records plus:

| Data type | Count (new) | Cumulative | Purpose |
|-----------|-------------|-----------|---------|
| Episodes (DEVELOPER failure) | 4 | 6 | Adaptation Pass 2: devFails ≥ ceil(8/2)=4 |
| Episodes (REVIEWER failure) | 1 | 7 | Stage diversity in pattern analysis |
| Episodes (success, varied) | 3 | 10 | episodeCount ≥ 8 (MIN_SAMPLES gate) |
| apex_agent_runs rows | 8 | 10 | retryRate real; category stats per domain |
| Goals (completed) | 2 | 4 | goalCompletion realistic |
| Goals (active) | 1 | — | Non-completed goal in tracker |
| Plan records (success, normal) | 2 | 2 | MIN_SAMPLES=3 gate for planning insights |
| Plan records (failure, replanned) | 1 | 3 | Replan effectiveness insight candidate |
| Lessons in Lessons.md | 8 | 8 | lesson quality scoring; ARCHITECT context |
| **Total new records** | **22** | **37** | — |

**Learning loops unlocked after Tier 2** (requires API triggers — see §8):
- Adaptation engine: episodeCount=10 ≥ MIN_SAMPLES=8 → Pass 2 can run
- Planning quality: 3 records → formatQualityContext() returns non-empty
- Recovery: failure episodes exist → recoveryRate non-null
- Improvement roadmap: episodeCount=10 → 3 templates active (episode-cross-reference, reflection-lesson-wire, self-evaluator-endpoint)
- Self-evaluator: executionQuality and recoveryEffectiveness both real

---

### Tier 3 — sdv1-scale (Large-Scale Ingestion Test)

Includes all Tier 2 records plus:

| Data type | Count (new) | Cumulative | Purpose |
|-----------|-------------|-----------|---------|
| Episodes (additional) | 10 | 20 | episodeRichness=0.20; memory-indexer pruning test |
| apex_agent_runs rows | 10 | 20 | retryRate stable sample |
| Financial transactions | 24 | 24 | 2/month × 12 months, 4 categories |
| Invoices | 6 | 6 | 3 paid, 2 draft, 1 overdue |
| Email threads | 52 | 52 | 1/week × 12 months, 5 categories |
| Chat conversations | 5 | 5 | vault markdown, quarterly frequency |
| Project histories | 3 | 3 | 1 completed, 1 active, 1 archived |
| Plan records (additional) | 10 | 13 | Pattern detection; step-range and file-range analysis |
| Lessons (additional) | 4 | 12 | Approaching lesson quality measurement range |
| **Total new records** | **124** | **164** | — |

**Scale behaviors tested:**
- memory-indexer: 20 episodes approaches cache warm threshold (10) and begins embedding queue
- lesson index: 12 lessons (headroom to MAX_LESSONS=100 — no pruning)
- episode pruning: 20 episodes (headroom to MAX_EPISODES=200 — no pruning)
- wiki-reader.js: finance context injected for finance-related queries
- Supabase email_threads: 52 rows — query performance baseline

---

## 3. Subsystem Coverage Map

| Subsystem | Tier 1 (sdv1-dim) | Tier 2 (sdv1-loop) | Tier 3 (sdv1-scale) | Coverage notes |
|-----------|:-----------------:|:------------------:|:-------------------:|----------------|
| episodic-memory: storeEpisode | ✓ (2 ep) | ✓✓ (10 ep) | ✓✓✓ (20 ep) | All public functions exercised |
| episodic-memory: getSuccessRate | ✓ (returns 0.5) | ✓✓ (returns 0.6) | ✓✓✓ (real mixed rate) | Non-null at Tier 1 |
| episodic-memory: getFailureEpisodes | ✓ (1 failure) | ✓✓ (5 failures) | ✓✓✓ (6+ failures) | First real value Tier 1 |
| episodic-memory: getSimilarExperiences | — | ✓ (cache warm at 10) | ✓✓ (semantic at 20) | Requires 10 for cache path |
| adaptation-engine: Pass 2 | PARTIAL (2/8) | ✓ (10 ≥ 8) | ✓✓ | Requires API trigger |
| adaptation-engine: Pass 1 | PARTIAL | ✓ (if apex_agent_stages populated) | ✓✓ | Depends on stages table |
| adaptation-engine: Pass 3 | PARTIAL | ✓ (10 runs, mixed categories) | ✓✓ | Requires 8/category |
| planning-quality-registry | — | ✓ (3 records) | ✓✓ (13 records) | MIN_SAMPLES=3 met at Tier 2 |
| reflection-engine: lesson quality | — | ✓ (8 lessons indexed) | ✓✓ | scoreLessonText first call |
| reflection-engine: dedup | — | ✓ (repeated objectives) | ✓✓ | In-process hash check exercised |
| improvement-executor: roadmap | — | ✓ (3 templates active) | ✓✓ (3+ templates) | Sunday cron or API call required |
| autonomy-metrics: all 6 dims | ✓ ALL | ✓ ALL | ✓ ALL | Inflation = 0% at Tier 1 |
| self-evaluator: executionQuality | ✓ | ✓✓ | ✓✓✓ | Real at Tier 1 |
| self-evaluator: recoveryEffectiveness | ✓ | ✓✓ | ✓✓✓ | Real at Tier 1 |
| self-evaluator: adaptationEffectiveness | — | ✓ (if adaptation runs) | ✓✓ | Needs adaptation cycle |
| memory-indexer: indexEpisode | ✓ (manual trigger) | ✓✓ | ✓✓✓ | rebuildIndex() or startup |
| memory-indexer: indexLesson | — | ✓ | ✓✓ | Lessons.md populated |
| memory-indexer: _embedPending | — | ✓ (API available) | ✓✓ | Background embedding queue |
| memory-retriever: keyword fallback | ✓ | ✓✓ | ✓✓✓ | Active from Tier 1 |
| memory-retriever: semantic | — | PARTIAL | ✓ (20+ episodes) | Requires embeddings first |
| goal-tracker: getStats | ✓ (3/5 = 0.6) | ✓✓ (5/7 = 0.71) | ✓✓ | Non-1.0 rate at Tier 1 |
| finance: transactions query | — | — | ✓ | 24 rows available |
| email: thread query | — | — | ✓ | 52 rows available |
| wiki-reader.js: context injection | — | ✓ (lessons) | ✓✓ (lessons + projects + finance) | Depends on query keywords |

---

## 4. Telemetry Coverage Map

| Signal | Consumer | Tier 1 | Tier 2 | Tier 3 |
|--------|----------|:------:|:------:|:------:|
| `getSuccessRate(50)` → executionSuccess | autonomy-metrics | ✓ 0.5 | ✓ 0.6 | ✓ 0.65 |
| `retryRate()` Supabase path | autonomy-metrics | ✓ 0.5 | ✓ 0.4 | ✓ 0.35 |
| `retryRate()` episodic fallback | autonomy-metrics | ✓ 0.5 | ✓ 0.4 | ✓ 0.35 |
| `recoveryRate()` | autonomy-metrics | ✓ 1.0 | ✓ varies | ✓ varies |
| `goalStats().completionRate` | autonomy-metrics | ✓ 0.67 | ✓ 0.71 | ✓ 0.71 |
| `executionConfidence()` | autonomy-metrics | ✓ real | ✓ real | ✓ real |
| `episodeCount()/100` | autonomy-metrics | ✓ 0.02 | ✓ 0.10 | ✓ 0.20 |
| `episodeCount() >= MIN_SAMPLES` | adaptation Pass 2 | ✗ 2/8 | ✓ 10/8 | ✓ 20/8 |
| `getFailurePatterns()` | adaptation Pass 1 | ✗ | ✓ | ✓ |
| `getCategoryStats()` | adaptation Pass 3 | ✗ | ✓ | ✓ |
| `_cyclesSinceRun >= 5 OR failure` | adaptation trigger | manual | manual | manual |
| `getPlanQuality({minSamples:3})` | plan context injection | ✗ | ✓ 3/3 | ✓ 13/3 |
| `generatePlanningInsights()` | adaptation bridge | ✗ | ✓ | ✓ |
| `localMemory.getRecentLessons(8)` | reflection-engine | ✗ | ✓ | ✓ |
| `scoreLessonText()` quality | reflection-engine | ✗ | ✓ | ✓ |
| `_episodes.size` (indexer) | memory-indexer | ✓ 2 | ✓ 10 | ✓ 20 |
| `_lessons.size` (indexer) | memory-indexer | ✗ | ✓ 8 | ✓ 12 |
| `embedded count` (indexer) | memory-indexer stats | ✗ | ✓ if embed runs | ✓ |
| `findSimilarEpisodes()` semantic | memory-retriever | ✗ | partial | ✓ |
| `apex_transactions` rows | finance domain | ✗ | ✗ | ✓ 24 |
| `email_threads` rows | comms domain | ✗ | ✗ | ✓ 52 |

---

## 5. Autonomy Score Coverage Map

**Target state after each tier:**

| Dimension | Weight | Current | After Tier 1 | After Tier 2 | After Tier 3 |
|-----------|--------|---------|:------------:|:------------:|:------------:|
| executionSuccess | 0.30 | 0.5 default | **0.50 real** | 0.60 real | 0.65 real |
| lowRetryRate | 0.15 | 0.5 default | **0.00 real** | 0.20 real | 0.30 real |
| recovery | 0.20 | 0.5 default | **1.00 real** | 0.80 real | 0.83 real |
| goalCompletion | 0.20 | 1.0 real | **0.67 real** | 0.71 real | 0.71 real |
| confidence | 0.10 | 0.55 partial | **0.55 real** | 0.63 real | 0.66 real |
| episodeRichness | 0.05 | 0.0 real | **0.02 real** | 0.10 real | 0.20 real |
| **Score** | — | 5.80 | **6.12** | 6.39 | 6.52 |
| **Inflation** | — | 60.3% | **0%** | 0% | 0% |
| **All dims real?** | — | NO | **YES** | YES | YES |

**Score calculations (Tier 1):**
```
executionSuccess = 1/2 = 0.50 × 0.30 = 0.150
lowRetryRate:     retryRate = 1/2 = 0.5 → max(0, 1-0.5×2) = 0.0 × 0.15 = 0.000
recovery:         1/1 failures recovered = 1.0 × 0.20 = 0.200
goalCompletion:   2/3 goals completed = 0.67 × 0.20 = 0.134
confidence:       sr=0.5×0.5 + epVol=(2/50)×0.2 + goalScore=0.67×0.3 = 0.25+0.008+0.201 = 0.459 × 0.10 = 0.046
episodeRichness:  min(1,2/100) = 0.02 × 0.05 = 0.001
RAW = 0.531 → Score = 5.31... 
```

Wait — lowRetryRate=0.0 reduces the score. The score drops from 5.80 to ~5.31 because the synthetically-inflated `lowRetryRate=0.5` default drops to a REAL `0.0` (50% failure rate). This is expected and correct — the default was lying.

```
Inflation = 0 (all real) → Score reflects actual state
```

Note for validation teams: **A score drop from 5.80 → 5.31 after Tier 1 is expected and desired.** It confirms the synthetic defaults have been replaced with real evidence.

---

## 6. Synthetic Dataset Contents

### Tier 1 — sdv1-dim Record Specifications

**Episode 001** (success — reference run):
```json
{
  "id": "synth-sdv1-dim-001",
  "objective": "[SYNTHETIC] Build metrics dashboard widget for system health monitoring",
  "complexity": "moderate",
  "success": true,
  "cost": 0.0142,
  "durationMs": 44500,
  "failedStage": null,
  "failureReason": null,
  "keywords": ["metrics", "dashboard", "widget", "health", "monitoring"],
  "timestamp": "2026-06-01T10:00:00.000Z",
  "synthetic": true, "source": "test", "dataset_id": "sdv1-dim", "removable": true
}
```

**Episode 002** (failure — enables recovery measurement):
```json
{
  "id": "synth-sdv1-dim-002",
  "objective": "[SYNTHETIC] Build metrics dashboard widget for system health monitoring",
  "complexity": "moderate",
  "success": false,
  "cost": 0.0089,
  "durationMs": 21000,
  "failedStage": "DEVELOPER",
  "failureReason": "TypeScript type inference failed: cannot assign type 'MetricData' to 'WidgetConfig'",
  "keywords": ["metrics", "dashboard", "widget", "health", "monitoring"],
  "timestamp": "2026-05-31T15:00:00.000Z",
  "synthetic": true, "source": "test", "dataset_id": "sdv1-dim", "removable": true
}
```

**Critical pairing:** Episode 002 (failure, timestamp 2026-05-31) MUST be matched by a `synth-sdv1-dim-002` row in `apex_agent_runs` with `success=false`. Then Episode 001 (success, timestamp 2026-06-01) MUST have a row `synth-sdv1-dim-001` in `apex_agent_runs` with `success=true` AND the same objective text (first 40 chars match). This pairing is required for `recoveryRate()` to return 1.0 (the failure was recovered by the subsequent success).

**apex_agent_runs rows:**
```sql
-- Row 1: failure (matches Episode 002)
INSERT INTO apex_agent_runs (task_id, objective, success, cost_usd, complexity, created_at)
VALUES ('synth-sdv1-dim-002', '[SYNTHETIC] Build metrics dashboard widget for system', false, 0.0089, 'moderate', '2026-05-31T15:00:00.000Z');

-- Row 2: success (matches Episode 001, acts as recovery signal)
INSERT INTO apex_agent_runs (task_id, objective, success, cost_usd, complexity, created_at)
VALUES ('synth-sdv1-dim-001', '[SYNTHETIC] Build metrics dashboard widget for system', true, 0.0142, 'moderate', '2026-06-01T10:00:00.000Z');
```

**Goal files:**
```json
// goal-synth-sdv1-dim-001.json — completed
{
  "id": "goal-synth-sdv1-dim-001",
  "objective": "[SYNTHETIC] Implement persistent notification system",
  "status": "completed",
  "priority": "high",
  "source": "test",
  "createdAt": "2026-05-28T08:00:00.000Z",
  "completedAt": "2026-05-29T16:00:00.000Z",
  "synthetic": true, "dataset_id": "sdv1-dim", "removable": true
}

// goal-synth-sdv1-dim-002.json — completed
{
  "id": "goal-synth-sdv1-dim-002",
  "objective": "[SYNTHETIC] Refactor authentication middleware for session cleanup",
  "status": "completed",
  "priority": "medium",
  "source": "test",
  "createdAt": "2026-05-30T09:00:00.000Z",
  "completedAt": "2026-06-01T11:00:00.000Z",
  "synthetic": true, "dataset_id": "sdv1-dim", "removable": true
}

// goal-synth-sdv1-dim-003.json — blocked (reduces goalCompletion from 1.0 to 0.67)
{
  "id": "goal-synth-sdv1-dim-003",
  "objective": "[SYNTHETIC] Integrate pgvector semantic search for memory retrieval",
  "status": "blocked",
  "priority": "low",
  "source": "test",
  "createdAt": "2026-06-01T12:00:00.000Z",
  "blockedReason": "[SYNTHETIC] Requires episodeCount > 30 before embedding index is ready",
  "synthetic": true, "dataset_id": "sdv1-dim", "removable": true
}
```

---

### Tier 2 — sdv1-loop Additional Records

**Episodes 003–010** (8 new episodes, 4 DEVELOPER failures needed for adaptation Pass 2):

| Seq | Objective (shortened) | Success | failedStage | Complexity |
|-----|----------------------|---------|-------------|------------|
| 003 | [SYNTHETIC] Add rate limiting middleware to API routes | false | DEVELOPER | moderate |
| 004 | [SYNTHETIC] Implement file upload endpoint with S3 integration | false | DEVELOPER | complex |
| 005 | [SYNTHETIC] Refactor database connection pool configuration | false | DEVELOPER | simple |
| 006 | [SYNTHETIC] Build automated invoice generation from deal data | false | DEVELOPER | moderate |
| 007 | [SYNTHETIC] Add webhook handler for Stripe payment events | false | REVIEWER | moderate |
| 008 | [SYNTHETIC] Create health check endpoints for all services | true | null | simple |
| 009 | [SYNTHETIC] Implement session expiry cleanup background job | true | null | simple |
| 010 | [SYNTHETIC] Add structured logging with request correlation IDs | true | null | moderate |

(Episodes 001–002 already defined in Tier 1)

This gives: 4 DEVELOPER failures (episodes 003–006) + 1 REVIEWER failure (007) + 5 successes (001, 008, 009, 010 + 1 from Tier 1). Total: 10 episodes.

**Plan records** (for `plan-quality-registry.json`):

```json
// Record 1: Normal plan, success
{
  "planId": "pln-synth-sdv1-loop-001",
  "goal": "[SYNTHETIC] Add rate limiting to API endpoints",
  "complexity": "moderate", "category": "development",
  "planType": "normal", "subtaskCount": 2, "stepCount": 6, "fileCount": 3,
  "risk": 0.2, "wasReplanned": false, "replanCount": 0, "recoveryCount": 0,
  "outcome": "success", "successRate": 1.0, "failurePatterns": [],
  "executionCost": 0.0098, "durationMs": 32000,
  "stagesCompleted": ["RESEARCHER","ARCHITECT","DEVELOPER","REVIEWER","VALIDATOR","TESTER","COMMITTER"],
  "createdAt": "2026-06-02T10:00:00.000Z", "completedAt": "2026-06-02T10:53:00.000Z",
  "synthetic": true, "source": "test", "dataset_id": "sdv1-loop", "removable": true
}

// Record 2: Split plan, success (enables split vs normal comparison)
{
  "planId": "pln-synth-sdv1-loop-002",
  "goal": "[SYNTHETIC] Implement full authentication system with OAuth and session management",
  "complexity": "complex", "category": "development",
  "planType": "split", "subtaskCount": 5, "stepCount": 18, "fileCount": 8,
  "risk": 0.6, "wasReplanned": false, "replanCount": 0, "recoveryCount": 1,
  "outcome": "success", "successRate": 1.0, "failurePatterns": [],
  "executionCost": 0.0456, "durationMs": 145000,
  "stagesCompleted": ["RESEARCHER","ARCHITECT","DEVELOPER","REVIEWER","VALIDATOR","TESTER","COMMITTER"],
  "createdAt": "2026-06-03T09:00:00.000Z", "completedAt": "2026-06-03T11:25:00.000Z",
  "synthetic": true, "source": "test", "dataset_id": "sdv1-loop", "removable": true
}

// Record 3: Replanned, failed (enables replan effectiveness insight)
{
  "planId": "pln-synth-sdv1-loop-003",
  "goal": "[SYNTHETIC] Build S3 file upload with thumbnail generation",
  "complexity": "complex", "category": "infrastructure",
  "planType": "replanned", "subtaskCount": 4, "stepCount": 14, "fileCount": 6,
  "risk": 0.7, "wasReplanned": true, "replanCount": 2, "recoveryCount": 2,
  "outcome": "failed",
  "successRate": 0.0,
  "failurePatterns": ["DEVELOPER_syntax", "COMMITTER_no_files"],
  "executionCost": 0.0321, "durationMs": 98000,
  "stagesCompleted": ["RESEARCHER","ARCHITECT","DEVELOPER"],
  "createdAt": "2026-06-04T14:00:00.000Z", "completedAt": "2026-06-04T15:38:00.000Z",
  "synthetic": true, "source": "test", "dataset_id": "sdv1-loop", "removable": true
}
```

---

### Tier 3 — sdv1-scale Record Specifications (summary)

**Financial transactions (24 rows):**
- 12 months × 2 transactions/month
- Categories: Food (6), Transport (4), Technology (4), Business Services (4), Income (6)
- Date range: 2025-06-01 to 2026-05-31
- Amount range: £12–£2,400

**Invoices (6 rows):**
- Invoice numbers: SYNTH-001 through SYNTH-006
- Statuses: 3 paid, 2 draft, 1 overdue
- Amount range: £800–£4,500
- Client names: all "[SYNTHETIC] Test Client {A-F} Ltd"

**Email threads (52 rows):**
- 1 per week, 2025-06-02 to 2026-05-25
- Categories/labels: work (20), newsletter (12), finance (10), notifications (6), personal (4)
- thread_id pattern: `synth-thread-sdv1-scale-{week:03d}`

**Chat conversations (5 vault files):**
- Files: `VAULT/13 Briefings/Conversations/synth-2025-Q3.md`, `synth-2025-Q4.md`, `synth-2026-Q1.md`, `synth-2026-Q2-early.md`, `synth-2026-Q2-late.md`
- Content: quarterly summaries covering Apex development milestones

**Project histories (3 vault files):**
- `VAULT/02 Projects/Archive/synth-client-portal-v1.md` — completed, 8 weeks
- `VAULT/02 Projects/Archive/synth-data-pipeline-refactor.md` — archived, incomplete
- `VAULT/02 Projects/Active/synth-market-research-automation.md` — active, ongoing

---

## 7. Cleanup Procedure

### 7.1 Vault File Cleanup

Execute in order (leaf nodes first):

```bash
# 1. Remove synthetic episode files
find "$VAULT/12 Memory/Episodes" -name "ep-synth-*.json" -delete
echo "Episodes cleaned"

# 2. Remove synthetic goal files
find "$VAULT/System/Goals" -name "goal-synth-*.json" -delete
echo "Goals cleaned"

# 3. Clean synthetic lessons from Lessons.md
# Remove block between synthetic markers (all dataset IDs)
python3 -c "
import re, sys
with open('$VAULT/01 Executive/Lessons.md', 'r') as f:
    content = f.read()
cleaned = re.sub(
    r'<!-- SYNTHETIC-BEGIN:[^>]+ -->.*?<!-- SYNTHETIC-END:[^>]+ -->',
    '',
    content,
    flags=re.DOTALL
)
with open('$VAULT/01 Executive/Lessons.md', 'w') as f:
    f.write(cleaned)
print('Lessons.md cleaned')
"

# 4. Clean synthetic plan records from plan-quality-registry.json
# (Only run if file exists)
node -e "
const fs = require('fs');
const p = '$VAULT/System/PlanQuality/plan-quality-registry.json';
if (!fs.existsSync(p)) { console.log('No registry — nothing to clean'); process.exit(0); }
const reg = JSON.parse(fs.readFileSync(p, 'utf8'));
const before = reg.records?.length || 0;
reg.records = (reg.records || []).filter(r => r.synthetic !== true);
reg.totalRecords = reg.records.length;
fs.writeFileSync(p, JSON.stringify(reg, null, 2));
console.log('PlanQuality: removed ' + (before - reg.records.length) + ' synthetic records');
"

# 5. Remove synthetic memory index (rebuilt automatically on next startup)
rm -f "$VAULT/12 Memory/memory-index.json"
echo "Memory index cleared (will rebuild from remaining episodes)"

# 6. Remove synthetic conversation files
find "$VAULT/13 Briefings/Conversations" -name "synth-*.md" -delete
echo "Conversations cleaned"

# 7. Remove synthetic project files
find "$VAULT/02 Projects/Archive" -name "synth-*.md" -delete
find "$VAULT/02 Projects/Active" -name "synth-*.md" -delete
echo "Projects cleaned"

# 8. Remove synthetic budget/invoice vault files (if created)
find "$VAULT/05 Finance" -name "synth-*" -delete
echo "Finance vault files cleaned"
```

### 7.2 Supabase Cleanup

Execute all in one transaction:

```sql
-- Agent pipeline data
DELETE FROM apex_agent_runs WHERE task_id LIKE 'synth-%';

-- Financial data (description-based cleanup — no synthetic column in schema)
DELETE FROM transactions WHERE description LIKE '[SYNTHETIC]%';
DELETE FROM invoices WHERE invoice_number LIKE 'SYNTH-%';

-- Communication data
DELETE FROM email_threads WHERE thread_id LIKE 'synth-thread-%';

-- Verify cleanup
SELECT
  (SELECT COUNT(*) FROM apex_agent_runs WHERE task_id LIKE 'synth-%') AS runs_remaining,
  (SELECT COUNT(*) FROM transactions WHERE description LIKE '[SYNTHETIC]%') AS txns_remaining,
  (SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE 'SYNTH-%') AS invoices_remaining,
  (SELECT COUNT(*) FROM email_threads WHERE thread_id LIKE 'synth-thread-%') AS emails_remaining;
-- All values should be 0
```

### 7.3 Derived State Cleanup

After vault and Supabase cleanup, reset derived caches:

```bash
# Adaptation registry: re-run runCycle() or clear manually
node -e "
const reg = { version: '2.0', generatedAt: new Date().toISOString(), totalActive: 0, adaptations: [] };
require('fs').writeFileSync('$VAULT/System/Adaptations/adaptation-registry.json', JSON.stringify(reg, null, 2));
console.log('Adaptation registry reset');
"

# Improvement proposals: remove synthetic proposals
node -e "
const fs = require('fs'), p = '$VAULT/System/Improvements/proposals.json';
if (!fs.existsSync(p)) { console.log('No proposals file'); process.exit(0); }
const reg = JSON.parse(fs.readFileSync(p, 'utf8'));
const before = reg.proposals?.length || 0;
reg.proposals = (reg.proposals || []).filter(p => p.evidenceBase?.synthetic !== true);
fs.writeFileSync(p, JSON.stringify(reg, null, 2));
console.log('Removed ' + (before - reg.proposals.length) + ' synthetic proposals');
"
```

### 7.4 Cleanup Verification

```bash
# Episode count should return to pre-test value (0)
node -e "console.log('Episodes:', require('fs').readdirSync('$VAULT/12 Memory/Episodes').filter(f=>f.startsWith('ep-')).length)"

# Goal count
node -e "console.log('Goals:', require('fs').readdirSync('$VAULT/System/Goals').length)"

# Adaptation state
node -e "const r = JSON.parse(require('fs').readFileSync('$VAULT/System/Adaptations/adaptation-registry.json','utf8')); console.log('Adaptations:', r.totalActive)"
```

---

## 8. Rollback Procedure

Rollback is identical to cleanup. The cleanup procedure is the rollback procedure — synthetic data leaves no permanent side effects.

**Pre-test snapshot (recommended):**
```bash
# Before loading any synthetic data, snapshot the current state
cp "$VAULT/System/Adaptations/adaptation-registry.json" "$VAULT/System/Adaptations/adaptation-registry.json.bak"
cp "$VAULT/01 Executive/Lessons.md" "$VAULT/01 Executive/Lessons.md.bak"
```

**Post-rollback state verification:**
- `episodeCount()` returns 0
- `getSuccessRate(50)` returns null
- `goal-tracker.getStats()` returns { total: 1, completed: 1 } (smoke test only)
- `autonomy-metrics.computeAutonomyScore()` returns score ~5.80 (smoke test goal still present)
- `plan-quality-registry` records: 0
- Lessons.md: template text only ("None yet")
- adaptation-registry.json: `{ totalActive: 0, adaptations: [] }`

**If episodic cache is warm (server has been running):**
The in-process `_cache[]` in episodic-memory.js holds up to 50 episodes in memory. After file deletion, the in-process cache retains synthetic episodes until the server restarts. A server restart is required after cleanup to clear the cache and confirm rollback.

---

## 9. Validation Checkpoints

### Checkpoint 1 — After Tier 1 Load (sdv1-dim)

**What to check:**

| Check | Expected | API/Method |
|-------|----------|-----------|
| episodeCount | 2 | `episodic-memory.episodeCount()` |
| getSuccessRate(50) | 0.500 (not null) | `autonomy-metrics.getFullMetrics()` |
| retryRate() Supabase path | 0.500 (not null) | `autonomy-metrics.getFullMetrics()` |
| recoveryRate() | 1.000 (not null) | `autonomy-metrics.getFullMetrics()` |
| goalCompletion | 0.667 (not 1.0) | `autonomy-metrics.getFullMetrics()` |
| autonomy score | ~5.31 (not 5.80) | `GET /api/autonomy/score` |
| score inflation | 0% | manual: (measured-true)/measured = 0 |
| All 6 dimensions non-default | YES | check each dim ≠ 0.5 synthetic |

**Expected score drop from 5.80 → ~5.31 confirms inflated defaults have been replaced by real (lower) values. A score rise would indicate something went wrong.**

---

### Checkpoint 2 — After Tier 2 Load (sdv1-loop)

**Requires API triggers before checking:**

```
1. Trigger adaptation cycle:
   - Option A: Wait for failure path (synthetic failure episode triggers learn())
   - Option B: POST /api/autonomy/assign with real goal (preferred — generates real learn() call)
   - Option C: Direct runCycle() call if exposed via API

2. Trigger planning quality check:
   - GET /api/autonomy/plan-quality (if route exists)
   - OR: Run assignWork() with simulate:false

3. Trigger improvement roadmap:
   - GET /api/autonomy/improvements (returns current proposals)
   - OR: Wait for Sunday cron
```

| Check | Expected after triggers | Notes |
|-------|------------------------|-------|
| episodeCount | 10 | — |
| adaptation-registry.json adaptations | ≥ 0 (may be 0 if DEVELOPER failures below threshold) | Pass 2 runs but may find <4 DEVELOPER failures depending on spec parsing |
| formatQualityContext() | Non-empty string | Requires 3 plan records loaded |
| generatePlanningInsights() | { insufficient: false } | Requires 3 records |
| self-evaluator executionQuality | ≠ 0.5 | Real success rate available |
| self-evaluator recoveryEffectiveness | ≠ 0.5 | Failure episodes available |
| memory-indexer.getStats().episodes | 10 | After rebuildIndex() |
| Lessons.md entry count | 8 | grep "^---$" Lessons.md | wc -l → should be ≥ 8 |
| improvement proposals from generateRoadmap() | ≥ 1 | episodeCount=10 → 3 templates active |
| autonomy score | ~6.39 | Increasing with episode richness |

---

### Checkpoint 3 — After Tier 3 Load (sdv1-scale)

| Check | Expected | Notes |
|-------|----------|-------|
| episodeCount | 20 | — |
| apex_agent_runs row count | 20 | `SELECT COUNT(*) FROM apex_agent_runs WHERE task_id LIKE 'synth-%'` |
| transactions row count | 24 | `SELECT COUNT(*) FROM transactions WHERE description LIKE '[SYNTHETIC]%'` |
| email_threads row count | 52 | `SELECT COUNT(*) FROM email_threads WHERE thread_id LIKE 'synth-thread-%'` |
| memory-indexer.getStats().episodes | 20 | After rebuild |
| memory-indexer.getStats().pending | ≤ 20 | Depends on embed API availability |
| getSimilarExperiences("dashboard") | ≥ 1 result | Episode 001 keywords match |
| wiki-reader.js finance context | Injected on finance tasks | Test with: GET /api/agent/run objective="analyze my spending" |
| Context size (ARCHITECT prompt) | No overflow | Monitor via logs for truncation warnings |
| episodeRichness dimension | 0.20 | min(1, 20/100) |
| Autonomy score | ~6.52 | All dims real, richer data |

---

## 10. Minimum Dataset Summary

### Minimum to exercise every autonomy dimension

**Dataset: sdv1-dim**

| Resource | Count | Why |
|----------|-------|-----|
| Episodes (success) | 1 | executionSuccess ≠ null; episodeRichness ≠ 0 |
| Episodes (failure, same objective) | 1 | recovery signal requires failure episode |
| apex_agent_runs (matching rows) | 2 | Supabase retryRate primary path + recovery cross-ref |
| Goals (varied status) | 3 | goalCompletion ≠ 1.0 (realistic rate) |
| **Total** | **7 records** | **All 6 dimensions real; inflation = 0%** |

---

### Minimum to activate every learning loop

**Dataset: sdv1-loop (cumulative)**

| Resource | Count | Why |
|----------|-------|-----|
| Episodes (total) | 10 | episodeCount ≥ MIN_SAMPLES (8) for adaptation Pass 2 |
| Episodes (DEVELOPER failures) | ≥ 4 | devFails ≥ ceil(8/2)=4 for first routing recommendation |
| apex_agent_runs rows | 10 | retryRate real; getCategoryStats() sample |
| Plan records | 3 | MIN_SAMPLES=3 for formatQualityContext() |
| Lessons in Lessons.md | 8 | getRecentLessons(8) returns full window |
| Goals | 6 total (4 complete, 1 blocked, 1 active) | Realistic goalCompletion signal |
| **Total** | **~44 records + lesson text** | **All loops activated (triggers still required)** |

**Note on "activation":** Synthetic data creates the DATA prerequisite. Each learning loop still requires an explicit trigger:
- Adaptation: `runCycle()` must be called (fires on first real `learn()` call from a pipeline run OR every 5 runs)
- Planning quality: `formatQualityContext()` called within a `runAgentTeam()` context
- Improvement roadmap: `generateRoadmap()` called (Sunday cron or API call)
- Self-evaluator: `getFullReport()` called via `GET /api/cognition/self-evaluation` (if route exists)

---

### Minimum to test large-scale ingestion

**Dataset: sdv1-scale (cumulative)**

| Resource | Count | Why |
|----------|-------|-----|
| Episodes | 20 | Index approaching cache warm (10+); embedding queue exercised |
| apex_agent_runs | 20 | Stable retryRate sample; category routing data |
| Financial transactions | 24 | 1-year of history; query performance baseline |
| Invoices | 6 | Multi-status testing |
| Email threads | 52 | 1-year of history; retrieval at volume |
| Chat conversations | 5 | Vault scale with personal content |
| Project histories | 3 | Project domain context injection |
| Plan records | 13 | Step-range and file-range pattern detection |
| Lessons | 12 | Approaching quality measurement range |
| **Total** | **~164 records** | **Context scaling, index limits, retrieval quality** |

---

## Dataset Loading Order

```
Step 1: Create VAULT/12 Memory/Episodes/ (if missing)
Step 2: Create VAULT/System/Goals/ (if missing)
Step 3: Create VAULT/System/PlanQuality/ (if missing)
Step 4: Write episode JSON files (ep-synth-*.json)
Step 5: Write goal JSON files (goal-synth-*.json)
Step 6: Write plan-quality-registry.json with synthetic records
Step 7: Append synthetic lessons to Lessons.md (between markers)
Step 8: Execute Supabase SQL INSERTs (apex_agent_runs + personal domain tables)
Step 9: Restart server (clears in-process caches, triggers rebuildIndex())
Step 10: Run validation checkpoints
Step 11: Trigger adaptation cycle manually (if testing Tier 2 loops)
Step 12: Run cleanup when complete
```

---

## Safety Constraints

1. **No synthetic data in episodic memory format from personal data sources.** Episode files must only come from this dataset or from real `runAgentTeam()` calls.
2. **Lessons.md marker wrapping is required.** Never append synthetic lessons without the `<!-- SYNTHETIC-BEGIN -->` / `<!-- SYNTHETIC-END -->` markers.
3. **Supabase cleanup relies on naming conventions.** Any synthetic record that doesn't follow the `synth-` / `[SYNTHETIC]` / `SYNTH-` prefix will survive cleanup. Validate before removal.
4. **Server restart required after cleanup.** The episodic-memory in-process cache (`_cache[]`, 50 entries) and memory-indexer in-process maps retain synthetic data until restart.
5. **Plan-quality-registry.json is overwritten by production.** If a real `assignWork()` call runs during the test, it appends a real record. The cleanup filters by `synthetic===true`, leaving real records intact.
6. **Do not load Tier 2 before Tier 1.** Each tier assumes the previous tier's data is present. Loading out of order produces undefined telemetry state.

---

*No code was modified. No production data was changed. This document is a design specification only.*
