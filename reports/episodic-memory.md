# Episodic Memory System
**Date:** 2026-06-06  
**Branch:** feature/cognition-layer  
**File:** `agent-system/episodic-memory.js`

---

## Problem

Every pipeline run disappeared without a trace beyond a flat lesson string. No structured record of what the task was, what complexity tier it was, what stage it failed at, how much it cost, or how many retries it took. Without this, the system cannot answer "have we done something like this before?"

## Root Cause

Lessons were treated as unstructured text appended to a Markdown file. The architecture had no concept of an "experience object" — a structured record that links a task to its full outcome. `apex_agent_runs` captures this in Supabase but it's not read during pipeline execution.

## Fix

Created `agent-system/episodic-memory.js`:

### Storage
- Location: `VAULT/12 Memory/Episodes/ep-{id}.json`
- Format: JSON with the episode schema below
- Cap: 200 episodes (oldest pruned automatically)
- No DB schema change needed

### Episode Schema
```json
{
  "id":            "task_id from orchestrator",
  "timestamp":     "ISO 8601",
  "objective":     "feature spec objective string",
  "complexity":    "simple|moderate|complex|critical",
  "success":       true,
  "cost":          "0.00123",
  "durationMs":    45000,
  "failedStage":   null,
  "failureReason": null,
  "models":        { "architect": "...", "developer": "..." },
  "keywords":      ["extracted", "from", "objective"]
}
```

### Keyword Extraction
Stopword-filtered (40 common words removed), max 20 keywords, deduped. Used for relevance scoring.

### Retrieval Scoring
- **Relevance (70%):** keyword overlap between query and episode keywords
- **Recency (30%):** linear decay from 1.0 at 0 days to 0.3 at 90 days
- Threshold: minimum combined score 0.05 (filters unrelated episodes)

### Key Functions

| Function | Purpose |
|----------|---------|
| `storeEpisode(episode)` | Write episode to disk + in-process cache |
| `getSimilarExperiences(objective, opts)` | Retrieve top-N most similar past runs |
| `getFailureEpisodes(limit)` | All failure episodes, most recent first |
| `getSuccessRate(n)` | Success rate over last N episodes |
| `formatExperiencesAsContext(experiences)` | One-line-per-episode context block |
| `episodeCount()` | Count of stored episodes |

### Integration with orchestrator.js

**Retrieval (before pipeline):** After wiki context load, `getSimilarExperiences()` retrieves up to 3 similar past runs and appends them to `obsidianContext`. ARCHITECT sees this as:
```
SIMILAR PAST EXPERIENCES:
✓ FEAT-H009: Workout logging route (complex)
✗ FEAT-H042: Finance invoice endpoint [failed: COMMITTER] (moderate)
```

This costs ~80 extra tokens (compact format) and gives ARCHITECT awareness of past attempts at similar tasks.

**Storage (after pipeline):** `storeEpisode()` is called via `setImmediate` on both success and failure paths — fire-and-forget, non-blocking.

### In-process Cache
Circular buffer of the 50 most recent episodes. Avoids disk reads when calling `getSimilarExperiences()` in rapid succession. Falls back to disk load when cache has < 10 entries.

## Verification

```
node --check agent-system/episodic-memory.js  → OK
node --check agent-system/orchestrator.js     → OK (with episodic import)
```

`getSimilarExperiences()` with empty episodes directory returns `[]` — no crash on fresh deploy.

## Risk

Low. All paths are wrapped in try/catch in the caller. Episodic injection is additive to `obsidianContext`. If `12 Memory/Episodes/` directory doesn't exist, `_ensureDir()` creates it. No existing behavior changes.

## Rollback

Remove `const _episodic = require('./episodic-memory');` from orchestrator.js and the two `storeEpisode()` setImmediate calls and the experience injection block. Delete `agent-system/episodic-memory.js`.
