# Memory Architecture v3 — APEX AI OS
**Author:** APEX Memory Architecture Engineer  
**Date:** 2026-06-06  
**Status:** Implemented and syntax-verified

---

## Stack Audit — Before v3

| Layer | File | Storage | Retrieval | Quality |
|-------|------|---------|-----------|---------|
| Conversational | langchain-memory.js | Supabase apex_lc_sessions | Last 20 turns + rolling Haiku summary | Strong |
| Episodic | episodic-memory.js | Vault JSON files (ep-{id}.json) | Keyword overlap × 0.7 + recency × 0.3 | Moderate |
| Lessons | obsidian-memory.js | Lessons.md + apex_lessons | Keyword + position (unranked, last N) | Weak |
| Ranked lessons | reflection-engine.js | (same as above) | Keyword + recency (re-ranks on retrieval) | Moderate |
| Vault RAG | langchain-rag.js | vault_embeddings (pgvector) | Hybrid BM25 + cosine similarity | Strong |
| Stage reputation | agent-reputation.js | apex_agent_stages (Supabase) | Aggregated per-stage stats | Strong |

**Retrieval gap:** Every layer except vault RAG used keyword/position matching only. Episodes had no embedding index. Lessons had no semantic retrieval. Cross-memory-type queries were impossible — no unified interface existed.

---

## Architecture v3

### New Files

```
agent-system/
├── memory-indexer.js     NEW  — embedding index manager
└── memory-retriever.js   NEW  — unified semantic retrieval engine
```

### Data Flow

```
PIPELINE RUN
     │
     ├─ BEFORE (ARCHITECT context build)
     │   │
     │   └─ memory-retriever.js::retrieve()
     │       ├─ findSimilarEpisodes()   ← cosine(queryVec, ep.embedding) or keyword fallback
     │       ├─ findSimilarLessons()    ← cosine(queryVec, lesson.embedding) or keyword fallback
     │       └─ formatForContext()      → injected into obsidianContext (max 500 chars)
     │
     ├─ AFTER (episode + lesson storage)
     │   │
     │   ├─ _episodic.storeEpisode(ep)  — unchanged (vault JSON file)
     │   ├─ _indexer.indexEpisode(ep)   — adds to Map, schedules embedding
     │   │
     │   └─ REFLECTOR:
     │       ├─ memory.logLesson()       — unchanged (Lessons.md append)
     │       └─ _indexer.indexLesson()   — adds to Map, schedules embedding
     │
     └─ BACKGROUND (setImmediate, non-blocking)
         └─ _embedPending()
             ├─ embedText(entry.text)   ← lib/embed.js (Voyage AI or Gemini)
             ├─ entry.embedding = vec
             └─ _flush() → vault/12 Memory/memory-index.json
```

### Index File

**Location:** `vault/12 Memory/memory-index.json`  
**Format:** JSON, persists across restarts (committed to vault, not to git)  
**Contents:**
```json
{
  "version": 2,
  "updatedAt": "2026-06-06T03:00:00Z",
  "episodes": [
    {
      "id": "ep-{id}",
      "type": "episode",
      "text": "Add pagination to /api/lessons route complexity:moderate outcome:success",
      "hash": "2a4f8c1b",
      "embedding": [0.021, -0.044, ...],
      "meta": {
        "success": true,
        "complexity": "moderate",
        "failedStage": null,
        "timestamp": "2026-06-05T14:22:00Z",
        "cost": "0.00312",
        "durationMs": 47000
      }
    }
  ],
  "lessons": [
    {
      "id": "lesson-{hash}",
      "type": "lesson",
      "text": "[Auto-Reflexion] DEVELOPER routing returns empty ...",
      "hash": "9b3e2a1f",
      "embedding": [...],
      "meta": { "timestamp": "2026-06-05T14:23:00Z", "position": 12 }
    }
  ]
}
```

**Size estimate:**
- 500 episodes × 768 floats ≈ ~2.9MB
- 100 lessons × 768 floats ≈ ~580KB
- Total: ~3.5MB (well within Node.js heap budget)

---

## Retrieval Methods

### 1. Episode Similarity Search

```
PRIMARY (when embeddings available):
  cosine(embed(query), ep.embedding)
  → composite = sim×0.5 + recency×0.25 + successRate×0.25

FALLBACK (when embedding=null or embed API down):
  keyword overlap (qSet ∩ tSet / |qSet|)
  → composite = kwScore×0.5 + recency×0.25 + successRate×0.25

Output shape: matches episodic-memory.js::getSimilarExperiences() — backward compatible
```

### 2. Lesson Similarity Search

```
PRIMARY: cosine(embed(query), lesson.embedding)
FALLBACK: keyword overlap

Score weights: [similarity×0.5 + recency×0.5]
(no success dimension — lessons are always "correct" by definition)
```

### 3. Execution Pattern Retrieval

```
Derived from episode index (no separate storage).
Groups failures by failedStage.
Scores: frequency×0.4 + recency×0.3 + keyword_relevance×0.3
Returns: [{ stage, count, failureRate, examples[], lastSeen, _relevance }]
```

### 4. Cross-Project Retrieval

```
Combines:
  1. langchain-rag.js::retrieveContextWithMeta() — vault BM25+pgvector (all domains)
  2. findSimilarEpisodes() — episodic memory
Returns: { vault: { context, sources, confidence }, episodes: [...] }
```

### 5. Unified Retrieve

```
retrieve(query, { episodes:true, lessons:true, patterns:false, crossProject:false })
→ Runs enabled paths in parallel (Promise.allSettled)
→ Returns { episodes, lessons, patterns, crossProject, _method }
→ _method: 'semantic' | 'keyword' (for diagnostics)
```

---

## Orchestrator Integration Points

### Change 1 — Import (line 12)
```js
// ADDED:
const _indexer = require('./memory-indexer');
```

### Change 2 — ARCHITECT context build (lines 875-882, was 873-880)
```js
// BEFORE:
try {
    const similar = _episodic.getSimilarExperiences(spec.objective, { limit: 3 });
    if (similar.length) {
        const expCtx = _episodic.formatExperiencesAsContext(similar);
        obsidianContext = ... + expCtx.slice(0, 400);
    }
} catch {}

// AFTER:
try {
    const _retriever = require('./memory-retriever');
    const memCtx = await _retriever.retrieve(spec.objective, {
        episodes: true, lessons: true, episodeLimit: 3, lessonLimit: 5,
    });
    const formatted = _retriever.formatForContext(memCtx, 500);
    if (formatted) obsidianContext = ... + formatted;
} catch {}
```

**What changed:** keyword-only episode lookup → semantic episodes + semantic lessons, both ranked by composite score. Context cap raised from 400 → 500 chars to accommodate lesson section.

### Change 3 — Reflector lesson indexing (line 749)
```js
// ADDED after memory.logLesson():
try { _indexer.indexLesson(`[Auto-Reflexion] ${lesson}`); } catch {}
```

### Changes 4–6 — storeEpisode calls (3 locations: _fail, success, outer catch)
```js
// BEFORE (each location):
setImmediate(() => { try { _episodic.storeEpisode({ ... }); } catch {} });

// AFTER (each location):
setImmediate(() => {
    try {
        const _ep = { id: taskId, objective: ..., complexity, success: ..., ... };
        _episodic.storeEpisode(_ep);  // unchanged — vault JSON file
        _indexer.indexEpisode(_ep);   // new — semantic index
    } catch {}
});
```

---

## Migration Path From v2 Retrieval

The migration is backward-compatible by design. `memory-retriever.js` exports `formatExperiencesAsContext(episodes)` which matches the exact signature of `episodic-memory.js::formatExperiencesAsContext()`. The orchestrator change is minimal: 6 surgical edits, no data migration, no schema changes.

### Migration Timeline

```
Day 0 (now):
  - memory-indexer.js + memory-retriever.js live
  - orchestrator.js wired
  - Index file empty (startup scan triggers rebuildIndex)

Day 0, +10s after startup:
  - rebuildIndex() scans Episodes/ dir + Lessons.md
  - Adds all existing entries to Map without embeddings
  - Retrieval immediately available via keyword fallback

Day 0 → Day 1:
  - Background embedding runs (150ms throttle per 10 entries)
  - 200 episodes × ~1-2s per embed ≈ 5-7 min total
  - As embeddings accumulate, retrievals silently upgrade from keyword → semantic

Day 1+:
  - New pipeline runs automatically add indexed episodes + lessons
  - Full semantic retrieval on all new queries
  - Old episodes embedded and searchable semantically
```

**Rollback path:** If any issue occurs, remove the two `require('./memory-retriever')` / `require('./memory-indexer')` references from orchestrator.js. The original episodic-memory.js is unchanged and fully functional.

---

## Capacity & Performance

| Metric | Value |
|--------|-------|
| Max episodes indexed | 500 |
| Max lessons indexed | 100 |
| Index file size (full) | ~3.5MB |
| Index load time (cold) | ~50ms (JSON parse of 3.5MB) |
| Query latency (semantic) | 50-500ms (embed API round-trip) |
| Query latency (keyword fallback) | <1ms |
| Embedding batch rate | 10 entries / 150ms throttle |
| Time to fully embed 200 episodes | ~5-7 min (background) |
| Concurrent embed guard | Yes (`_embedding` flag) |

---

## What's Not Changed

- `episodic-memory.js` — unchanged. Still writes vault JSON files.
- `obsidian-memory.js` — unchanged. Still writes Lessons.md.
- `reflection-engine.js` — unchanged. `getRankedLessons()` still used by wiki-reader.
- `langchain-rag.js` — unchanged. Vault RAG still uses vault_embeddings.
- DB schema — no changes to any Supabase table.
- `lib/embed.js` — no changes. Used as-is.
