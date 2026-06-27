# Cognition Baseline — Current Learning Flow Audit
**Date:** 2026-06-06  
**Branch:** feature/cognition-layer

---

## Learning Flow Trace (Before This Session)

```
User Input (voice or API)
    │
    ▼
[server.js] route handler
    │
    ▼
[langchain-memory.js] getContext()
    │   - Last 20 verbatim messages
    │   - Rolling summary of older messages (Haiku-summarized)
    │   - Persisted to apex_lc_sessions (Supabase)
    ▼
[wiki-reader.js] getWikiContext(taskTitle)
    │   - Core pages: WIKI.md, North-Star.md, Decisions.md, Apex-AI-OS.md
    │   - Entity pages (keyword-matched from Entities/, Concepts/, People/)
    │   - Recent lessons: last 12 from Lessons.md (RAW, unranked)
    │   - CS249R book context (if ML-related keywords)
    ▼
[orchestrator.js] runAgentTeam(spec, taskId)
    │   - obsidianContext (1500 char cap) injected into ARCHITECT prompt
    │   - 8-agent pipeline executes
    ▼
[_reflector()] async, setImmediate
    │   - Claude Haiku generates ONE lesson sentence
    │   - Written to 01 Executive/Lessons.md (append)
    │   - Written to apex_lessons (Supabase, fire-and-forget)
    │   - Stored in _lessonBuffer (in-process, 50 entries)
    ▼
[Next run] wiki-reader re-reads Lessons.md
    - Same lessons injected, unranked
    - No relevance scoring to task
```

---

## What's Already Working

| Component | File | Quality |
|-----------|------|---------|
| Conversation memory (last 20 turns) | langchain-memory.js | Good |
| Rolling conversation summary | langchain-memory.js | Good |
| Lesson generation (REFLECTOR) | orchestrator.js | Moderate |
| Lesson persistence (disk + Supabase) | obsidian-memory.js | Good |
| Lesson retrieval (raw, last 12) | wiki-reader.js | Weak |
| Vault search (keyword overlap) | obsidian-memory.js | Weak |
| Wiki consolidation (Decisions.md) | wiki-reader.js | Moderate |
| NorthStar proposals (keyword clustering) | orchestrator.js | Moderate |

---

## Gaps Identified

### Gap 1: No Episodic Memory
There is no record of "what task was run, what was the outcome, what did it cost, what stage failed." Individual lessons are logged, but there is no structured experience object connecting task context to pipeline outcome.

**Impact:** ARCHITECT has no "similar past task" context. If FEAT-H042 (similar to FEAT-H009) was implemented before, the system has no way to inject that experience.

### Gap 2: Lesson Retrieval is Unranked
`getRecentLessons(12)` returns the last 12 lessons in chronological order with no relevance weighting. A lesson about file size limits gets injected even if the current task is about CRM pipeline — wasting 200+ tokens.

**Impact:** ARCHITECT gets irrelevant lessons. Token budget wasted. Relevant lessons may not appear in the 12-entry window if they're old.

### Gap 3: No Knowledge Scoring
No lesson has a quality score. A one-time guess lesson is weighted equally to a lesson confirmed across 10 runs. No recency decay, no confidence, no actionability scoring.

**Impact:** Noisy lessons dilute high-value lessons. The system cannot distinguish "always validated" guidance from a fluke observation.

### Gap 4: No Failure Pattern Analysis
Individual failures are logged as lessons, but there is no aggregation: "DEVELOPER has failed 8/20 times" or "COMMITTER push failures happen when the worktree changes don't propagate." 

**Impact:** The NorthStar proposal system requires ≥3 keyword matches to trigger — it misses numeric patterns.

### Gap 5: No Experience Retrieval
`obsidian-memory.js::searchVault()` does keyword search on all vault files, but it's not connected to the agent pipeline. ARCHITECT receives no "here's how a similar task went before" context.

**Impact:** The system doesn't learn from experience in any structured way. Each run starts with the same 12 unfiltered lessons.

### Gap 6: Lesson Consolidation is Incomplete
`wiki-reader.js::consolidateWiki()` only consolidates `System/Decisions.md`. `Lessons.md` has no consolidation — it grows unboundedly.

**Impact:** Over time, Lessons.md becomes too long to inject meaningfully. The tail-12 window misses important older lessons.

---

## Pre-baseline Cognition Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Lesson generation | 6/10 | Works but one-shot, no verification |
| Lesson retrieval | 3/10 | Unranked, tail-only |
| Experience storage | 0/10 | No episodic memory |
| Knowledge scoring | 0/10 | No scoring |
| Pattern recognition | 3/10 | NorthStar only |
| Memory consolidation | 3/10 | Decisions.md only |
| Experience retrieval | 0/10 | No similar-task lookup |

**Overall Cognition Score: 2.1/10**
