# Phase 16 Knowledge Integrity
**APEX AI OS v6 — Session: 2026-06-05**
**Score Impact: +0.5 Knowledge Integrity**

---

## Executive Summary

Knowledge integrity covers the accuracy, freshness, and reliability of information retrieved and used by the AI system. This session implemented two concrete improvements: recency weighting (time-decay scoring in BM25) and source type boost (priority multipliers for high-value vault directories). Duplicate detection relies on Obsidian's wikilink structure. Contradiction detection was evaluated and deprioritized. Citation tracking is partial and sufficient.

---

## 1. Recency Weighting — Implemented

### Problem

The BM25 retrieval system had no concept of document freshness. A briefing from 18 months ago would score identically to one written yesterday if the BM25 term frequency matched equally. In practice, older context was frequently stale — old project status, superseded decisions, outdated system descriptions.

### Implementation

File modification time (`mtime`) is captured for each chunk during indexing:

```javascript
const stats = fs.statSync(filePath);
const mtimeMs = stats.mtimeMs;
// Stored in chunk metadata: { text, filepath, mtime: mtimeMs }
```

At retrieval time, a decay multiplier is applied:

```javascript
function recencyWeight(mtimeMs) {
  const ageMs = Date.now() - mtimeMs;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const DECAY_DAYS = 90;
  const MIN_WEIGHT = 0.7;

  if (ageDays >= DECAY_DAYS) return MIN_WEIGHT;
  return 1.0 - (ageDays / DECAY_DAYS) * (1.0 - MIN_WEIGHT);
}
```

### Decay Curve

| File Age | Recency Weight | Effect on Score |
|---|---|---|
| 0 days (today) | 1.00 | Full BM25 score |
| 15 days | 0.95 | 5% penalty |
| 30 days | 0.90 | 10% penalty |
| 45 days | 0.85 | 15% penalty |
| 60 days | 0.80 | 20% penalty |
| 75 days | 0.75 | 25% penalty |
| 90+ days | 0.70 (floor) | 30% penalty, then stable |

The 0.7 floor is intentional: old knowledge should be deprioritized but not excluded. A seminal decision note from 2 years ago is still valuable context; it should just lose to a recent one on the same topic.

---

## 2. Source Type Boost — Implemented

### Problem

All vault files were treated equally in BM25 scoring. A personal journal entry and a structured decision note about the same project would compete at equal weight.

### High-Signal Directories

Analysis of vault structure identified directories with consistently high-value content:

| Directory | Content Type | Rationale for Boost |
|---|---|---|
| `Lessons/` | REFLECTOR-written lessons | Curated learning, directly applicable |
| `Briefings/` | Daily/weekly briefings | Current state summaries |
| `Decisions/` | Architecture decision records | High-stakes, carefully considered |
| `Projects/` | Active project notes | Current work context |
| `Executive/` | Strategy and planning | Top-level priority context |

### Implementation

```javascript
function sourceBoost(filepath) {
  const HIGH_VALUE_DIRS = ['Lessons', 'Briefings', 'Decisions', 'Projects', 'Executive'];
  const pathParts = filepath.split(/[\\/]/);
  const inHighValueDir = HIGH_VALUE_DIRS.some(dir => pathParts.includes(dir));
  return inHighValueDir ? 1.15 : 1.0;
}
```

### Combined Score Formula

```javascript
const finalScore = bm25Score * recencyWeight(chunk.mtime) * sourceBoost(chunk.filepath);
```

A recent Lesson scores at `bm25Score * 1.0 * 1.15 = 115%` of raw BM25.
A 90-day-old journal note scores at `bm25Score * 0.7 * 1.0 = 70%` of raw BM25.
A recent Lesson vs. a 90-day journal note: ~64% score advantage for the Lesson.

---

## 3. Freshness Infrastructure

| Component | Implementation | Status |
|---|---|---|
| mtime capture | `fs.statSync()` per chunk during reindex | Active |
| Decay function | 90-day linear decay, 0.7 floor | Active |
| Reindex frequency | Every 30 minutes (cron) | Active |
| Cache invalidation | On `VAULT_SYNCED` event | Active |

The 30-minute reindex cycle means freshness scoring is at most 30 minutes stale. For a personal AI OS, this is acceptable — vault content changes at human timescales, not sub-minute.

---

## 4. Duplicate Detection

### Current State

Obsidian's wikilink structure provides implicit duplicate prevention. The vault enforces:
- Unique note titles (Obsidian blocks duplicate filenames in same directory)
- Wikilink graph surfacing connections (duplicates create redundant backlinks, visible to the user)

REFLECTOR agent checks `Entity-Index.md` before creating new entries, reducing programmatic duplicates.

### Gap

No automated duplicate detection for semantically similar notes with different titles. A note titled "Decision: Use Supabase" and another titled "Architecture Choice: Supabase Selected" could both exist with overlapping content.

### Assessment

The effort to detect semantic duplicates (embedding similarity comparison across all notes) is high, and the value for a single-user vault is low. The user can see backlinks in Obsidian and identify duplicates manually. This is **not justified** at current scale.

---

## 5. Contradiction Detection — Evaluated and Deprioritized

### What It Would Require

1. For each new note or REFLECTOR lesson, retrieve all existing notes on the same topic
2. Send pairs to an LLM with prompt: "Do these notes contradict each other? If so, identify the conflict."
3. Flag contradictions for user review

### Why It Was Deprioritized

| Factor | Assessment |
|---|---|
| Implementation complexity | High — requires embedding search + LLM comparison + review UI |
| False positive rate | High — "Use Supabase" and "Evaluate alternatives to Supabase" appear contradictory but are not |
| Value for single user | Low — user has context that an LLM lacks |
| Cost | Each new note triggers multiple LLM comparisons |
| Maintenance | Contradiction rules evolve with project context |

**Decision: Not justified.** The user's contextual knowledge is the best contradiction resolver. REFLECTOR is instructed to reference existing lessons when writing new ones, providing implicit consistency checking.

---

## 6. Citation Tracking — Partial

### Current Coverage

Each BM25 chunk includes:
```javascript
{
  text: "...",
  filepath: "/vault/Lessons/2026-06.md",
  filename: "2026-06.md",
  mtime: 1748986800000,
  score: 0.847
}
```

When APEX generates a response using retrieved context, the source filenames are available but not always surfaced to the user.

### Gap

Agent pipeline responses include source citations in some contexts (RAG-augmented responses) but not in all contexts (voice responses, quick answers). There is no structured citation format or citation log.

### Recommendation

Add a citation field to agent pipeline output:

```javascript
{
  response: "...",
  sources: [
    { filename: "2026-06.md", directory: "Lessons", score: 0.847 }
  ]
}
```

This is a low-effort addition to the INTEGRATOR agent stage.

---

## 7. Knowledge Integrity Score

| Dimension | Before | After | Status |
|---|---|---|---|
| Freshness | No temporal awareness | Recency decay implemented | Improved |
| Source quality | All sources equal | Priority directory boost | Improved |
| Duplicate prevention | Manual (Obsidian) | Unchanged | Acceptable |
| Contradiction detection | None | None (deprioritized) | Accepted gap |
| Citation tracking | Partial | Partial (unchanged) | Acceptable |
| **Overall** | 7.5/10 | 8.0/10 | **+0.5** |

---

## 8. Next Steps

| Priority | Action | Effort |
|---|---|---|
| MEDIUM | Add citation field to INTEGRATOR agent output | 1 hour |
| MEDIUM | Log which vault files contributed to each agent pipeline run | 2 hours |
| LOW | Implement contradiction flagging for REFLECTOR agent (lightweight heuristic, not full LLM comparison) | 3 hours |
| LOW | Experiment with 60-day vs 90-day decay window based on observed retrieval quality | Passive |
