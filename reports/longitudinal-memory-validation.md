# Longitudinal Memory Validation
**Date:** 2026-06-06  
**Phase:** 6 — Longitudinal Memory Validation  
**Scope:** Persistence, consistency, growth, and retrieval across all memory stores  
**Dataset:** Full Tier 3 (sdv1-dim + sdv1-loop + sdv1-scale), all 3 tiers loaded

---

## Memory Architecture Overview

Two distinct memory systems operate in the APEX AI OS:

| System | Module | Storage | Search method | Used by |
|--------|--------|---------|--------------|---------|
| **Episodic store** | `episodic-memory.js` | JSON files on disk | Keyword overlap (70%) + recency (30%) | Autonomy pipeline: scoring, reflection, adaptation |
| **Embedding index** | `memory-indexer.js` | `memory-index.json` | Gemini gemini-embedding-001 (768-dim) | Agent context construction |

These are independent. The autonomy score does NOT depend on the embedding index.

---

## 1 — Episode File Persistence

**Disk location:** `VAULT/12 Memory/Episodes/`  
**Files present:** 20  
**Format:** `ep-{id}.json`

### Schema audit (all 20 files):
```
total: 20
parsed: 20  (0 failures)
missingId: 0
missingObjective: 0
missingTimestamp: 0

By dataset:
  sdv1-dim:   2
  sdv1-loop:  8
  sdv1-scale: 10
```

All 20 episode files are valid JSON with complete required fields. No corruption across 3 dataset tiers loaded in 3 separate operations.

### Cross-tier persistence:
Episodes from all 3 tiers coexist in the same directory without collision. Naming convention `ep-synth-{tier}-{n}.json` prevents ID collision across dataset loads.

---

## 2 — Goal File Persistence

**Disk location:** `VAULT/System/Goals/`  
**Files present:** 10  
**Format:** `goal-{id}.json`

### Schema audit:
```
total: 10
parsed: 10  (0 failures)
missingId: 0

Status distribution:
  completed: 7
  running:   2
  blocked:   1

completedAt populated: 7 (all completed goals)
blockedReason populated: 1 (the blocked goal)

By dataset:
  sdv1-dim:   3
  sdv1-loop:  3
  sdv1-scale: 3
  real:       1
```

Lifecycle fields (`completedAt`, `blockedReason`) are correctly populated for the appropriate statuses. The real goal (pre-existing, dataset_id=null/real) is preserved alongside all 9 synthetic goals.

---

## 3 — Lesson Persistence

**Disk location:** `VAULT/01 Executive/Lessons.md`  
**File size:** 3,723 bytes  
**Last modified:** 2026-06-06T14:12:32Z (this session, Tier 3 load)

### Content audit:
```
Total sections: 15
  Structural sections (frontmatter, header, Related): 3
  Synthetic content lessons: 12

Lesson provenance:
  [SYNTHETIC:sdv1-loop]:  4 lessons
  [SYNTHETIC:sdv1-scale]: 8 lessons
```

Lessons are appended to a single Markdown file using `---` section separators. Growth is additive — older lessons are preserved and not overwritten by newer loads.

**Consolidation behavior:** `consolidateLessons()` runs before writes when total sections exceed `maxOutput` (default 30). Current count (15) is well under the threshold — no consolidation has been needed yet.

---

## 4 — Memory Index (Embedding Store) Persistence

**Disk location:** `VAULT/12 Memory/memory-index.json`  
**Format:** `{version, updatedAt, episodes:{0:vector,...}, lessons:{0:vector,...}}`

### Pre-rebuild state (stale):
```
episodes indexed: 10  (Tier 1+2 only, positional keys 0-9)
lessons indexed: 11
embedded: 21
successRate: 0.40
```

### Root cause of staleness:
The index uses positional array keys (0, 1, 2... 9) rather than episode IDs. When Tier 3 was loaded via `loader.loadTier('sdv1-scale')`, new episode JSON files were written to disk but `rebuildIndex()` was not called. The index was not automatically refreshed.

### Post-rebuild state (after calling `mi.rebuildIndex()`):
```
episodes indexed: 20  (all tiers, positional keys 0-19)
lessons indexed: 15
embedded: 35  (+14 new Gemini embeddings)
successRate: 0.55
rebuild duration: 4,432ms
```

### Rebuild impact on autonomy pipeline:
**None.** `episodic-memory.js` reads episode JSON files directly from disk and uses keyword scoring — it does NOT read from `memory-index.json`. The stale index did not affect any Phase 3–5 measurements.

---

## 5 — Evaluation File Persistence

**Disk location:** `VAULT/System/Cognition/Evaluations/`  
**Files present:** 3  

### Schema audit (all 3 files):
```
eval-mq2dxxfw-2bs.json: {id, overallScore:6.19, dimensions:{5}, recommendations:[...]}
eval-mq2e8vb6-fbx.json: {id, overallScore:5.32, dimensions:{5}, recommendations:[...]}
eval-mq2fg9ve-t9w.json: {id, overallScore:5.32, dimensions:{5}, recommendations:[...]}

Dimension keys (all 3): planningQuality, executionQuality, 
  recoveryEffectiveness, lessonUsefulness, adaptationEffectiveness
```

All 3 evaluation files are valid JSON with consistent schema. Evaluation history is preserved — newest eval does not overwrite prior evals (unique ID-based filenames).

---

## 6 — Adaptation Registry Persistence

**Disk location:** `VAULT/System/Adaptations/adaptation-registry.json`  
**Current state:** 1 active adaptation (enable_simulation_before_execution, confidence=0.7)  
**Last modified:** 2026-06-06T14:29:02Z  
**Expiry:** 2026-06-13T14:07:01Z (7 days from creation)

Adaptation registry persists correctly across multiple `runCycle()` calls within a session. The `expiresAt` field ensures automatic pruning after 7 days.

---

## 7 — Plan Quality Registry Persistence

**Disk location:** `VAULT/System/Cognition/adaptation-quality-registry.json` (via `pqr.REG_FILE`)  
**Current state:** 13 plans  
**Last generated:** 2026-06-06T14:34:13Z

Plan quality data accumulates correctly across multiple load tiers. The 13 plans represent Tier 1 (3) + Tier 2 (0 plan records) + Tier 3 (10 plan records).

---

## 8 — Semantic Search Coverage (Post-Rebuild)

After rebuilding the memory index, Tier 3 episodes surface correctly in keyword search:

| Query | Top result | Relevance | Dataset |
|-------|-----------|-----------|---------|
| "oauth authentication SSO" | Build OAuth2 provider integration | 0.648 | sdv1-scale ✓ |
| "database migration postgres legacy" | Migrate legacy user preferences | 0.470 | sdv1-scale ✓ |
| "database migration postgres legacy" | Refactor database connection pool | 0.466 | sdv1-loop ✓ |

Cross-tier retrieval confirmed: episodes from different tiers (sdv1-loop and sdv1-scale) correctly appear together in ranked results, ordered by relevance.

---

## Longitudinal Findings

**FINDING-1: All memory stores are durable across load operations.**  
20 episodes, 10 goals, 3 evals, 1 adaptation, 13 plan records — all persist correctly without corruption or overwrite across 3 sequential dataset loads.

**FINDING-2: Memory index becomes stale after new episode loads.**  
`rebuildIndex()` is not called automatically when new episode files are written. The stale index does not affect the autonomy pipeline (which reads from disk directly), but does affect any embedding-based features. Resolution: call `rebuildIndex()` after each dataset load in production.

**FINDING-3: Lessons use additive append-only storage.**  
Lessons.md grows by adding sections. No lessons have been overwritten or deduplicated yet. `consolidateLessons()` provides a pruning mechanism that activates at threshold (30 sections). Current count (15) is well within safe range.

**FINDING-4: Evaluation history is non-destructive.**  
Each `generateSystemEvaluation()` call creates a new file with a unique ID. Older evaluations are never overwritten. Score trend (6.19 → 5.32 → 5.32) is preserved.

**FINDING-5: Episode and goal naming conventions prevent cross-tier collisions.**  
`ep-synth-{tier}-{n}.json` and `goal-synth-{tier}-{n}.json` naming ensures no filename collisions when multiple tiers are loaded into the same directory.

**FINDING-6: Memory system separation enables clean failure isolation.**  
A corrupt or stale `memory-index.json` does not affect episode retrieval, failure analysis, adaptation, or scoring — those subsystems read from the source files directly.

---

## Verdict

**All 7 memory stores: PERSISTENT, CONSISTENT, and SCHEMA-VALID.**  
No corruption observed across 3 tier loads.  
One operational concern identified (stale index after load) — not a code defect, an operational gap.

**Longitudinal memory: PRODUCTION READY.**
