# Operational Resilience Test
**Date:** 2026-06-06  
**Phase:** 4 — Operational Resilience Test  
**Script:** `shadow-resilience.js`  
**Cycles run:** 10 full pipeline cycles + 5 registry stability cycles + boundary suite

---

## Test Suite

| Test | Description |
|------|------------|
| T1/T3 | Storage stability — file counts and registry checksum before/after 10 cycles |
| T2 | 10 sustained full pipeline cycles (retrieve → reflect → adapt → score → PQR) |
| T4 | Score determinism — 3 independent `computeAutonomyScore()` calls |
| T5 | Retrieval degradation — same query 5× in sequence |
| T6 | Registry corruption check — 5 consecutive `runCycle()` calls |
| T7 | PQR growth integrity — 3 plans created/recorded, count verified |
| T8 | Performance drift — first 5 vs last 5 cycle latencies |
| T9 | Error boundary — 6 functions called with null/empty inputs |

---

## T2 — 10 Sustained Pipeline Cycles

| Cycle | Total ms | Fail count | Top stage | Adapt active | Score |
|-------|---------:|----------:|----------|------------|------:|
| 0 | 519 | 14 | DEVELOPER | 3 | 4.31 |
| 1 | 203 | 14 | DEVELOPER | 3 | 4.31 |
| 2 | 197 | 14 | DEVELOPER | 3 | 4.31 |
| 3 | 182 | 14 | DEVELOPER | 3 | 4.31 |
| 4 | 187 | 14 | DEVELOPER | 3 | 4.31 |
| 5 | 162 | 14 | DEVELOPER | 3 | 4.31 |
| 6 | 163 | 14 | DEVELOPER | 3 | 4.31 |
| 7 | 150 | 14 | DEVELOPER | 3 | 4.31 |
| 8 | 153 | 14 | DEVELOPER | 3 | 4.31 |
| 9 | 168 | 14 | DEVELOPER | 3 | 4.31 |

**Cycle errors: 0. Crashes: 0.**

All cycles returned identical state: 14 failure episodes, DEVELOPER as top failure stage, 3 active adaptations, score 4.31. Pipeline is deterministic under sustained load.

---

## T1/T3 — Storage Stability

| Metric | Before | After | Stable |
|--------|-------:|------:|--------|
| Episode files | 35 | 35 | YES |
| Goal files | 15 | 15 | YES |
| Registry version | 2.0 | 2.0 | YES |
| Registry totalActive | 3 | 3 | YES |
| Adaptation IDs | adp-pla-mq2ffyaf\|adp-pla-mq2nvcng\|adp-ret-mq2nvcnp | identical | YES |
| Confidence values | 0.833\|0.764\|0.55 | identical | YES |

**10 full pipeline cycles produced zero file mutations.** No spurious episode writes, no goal mutations, no registry overwrites with different data.

---

## T4 — Score Determinism

```
computeAutonomyScore() × 3 → [ 4.31, 4.31, 4.31 ]
variance = 0
```

Score is purely deterministic — same inputs always produce the same score. No randomness, no timestamp drift affecting the calculation.

---

## T5 — Retrieval Stability

Query: "Redis migration database timeout failure" — 5× in sequence

| Run | Latency ms | Top relevance |
|-----|----------:|-------------:|
| 1 | 4 | 0.579 |
| 2 | 4 | 0.579 |
| 3 | 3 | 0.579 |
| 4 | 3 | 0.579 |
| 5 | 4 | 0.579 |

**Avg: 3.6ms. Max: 4ms. Relevance: identical across all 5 runs.**

No retrieval degradation. In-memory cache is stable — loading the same corpus repeatedly does not corrupt scores. Keyword scoring is deterministic (set-based, no randomness).

---

## T6 — Registry Stability (5 runCycle calls)

All 5 snapshots after `runCycle()` are identical:

| i | totalActive | count | IDs |
|---|----------:|------:|-----|
| 0 | 3 | 3 | adp-pla-mq2ffyaf\|adp-pla-mq2nvcng\|adp-ret-mq2nvcnp |
| 1 | 3 | 3 | identical |
| 2 | 3 | 3 | identical |
| 3 | 3 | 3 | identical |
| 4 | 3 | 3 | identical |

Active adaptation IDs are **preserved across cycles** — the engine regenerates adaptations with the same conditions and preserves existing IDs rather than minting new ones. This means `recordApplication(id, ...)` calls remain valid across cycle boundaries. No registry corruption. No ID drift.

---

## T7 — PQR Growth Integrity

| State | totalPlans |
|-------|----------:|
| Before (18 from Phase 1 + Phase 2) | 18 |
| After 3 new plan records | 21 |
| Delta | +3 |

PQR grows by exactly 3 after creating 3 plan records. No spurious growth. No plan count anomalies.

---

## T8 — Performance Drift

| Window | Avg cycle ms | Cycle ms range |
|--------|:-----------:|---------------|
| First 5 cycles (0–4) | 257.6ms | 182–519 |
| Last 5 cycles (5–9) | 159.2ms | 150–168 |
| Drift | −98.4ms (−38.2%) | — |

**Performance improved over time, not degraded.** Cycle 0 cold start: 519ms (Supabase connection init). Warm steady-state: 150–168ms. The −38.2% drift is positive — the system warms up and stabilizes, not degrades. No memory leak signatures (would manifest as increasing latency under sustained load).

---

## T9 — Error Boundary Tests

| Test | Result | Threw |
|------|--------|-------|
| `getSimilarExperiences(null)` | ok: [] | NO |
| `getFailureEpisodes(0)` | ok: length=0 | NO |
| `analyzeFailures([])` | ok: object | NO |
| `buildPerformanceSummary([])` | ok: object | NO |
| `getActiveAdaptations()` | ok: length=3 | NO |
| `getRecommendationsFor(null, null)` — **DEFECT-10** | crashed | YES → **FIXED** |

### DEFECT-10: `getRecommendationsFor` null context crash — FIXED

**File:** `agent-system/adaptation-engine.js:390`  
**Error:** `Cannot destructure property 'category' of 'context' as it is null.`  
**Root cause:** Default parameter `context = {}` only activates for `undefined`, not `null`. When called with `null` as first argument, destructuring `null` throws.  
**Fix applied:**
```js
// Before:
const { category, stage } = context;
// After:
const { category, stage } = context || {};
```
**Verification:** `getRecommendationsFor(null, null)` → 2 recommendations returned (global adaptations). No crash.

**Production risk before fix:** Low. In the production pipeline, this function is always called with a valid context object: `ae.getRecommendationsFor({ stage: 'DEVELOPER', category: 'auth' })`. However, any call from an API handler that failed to parse a context body could have crashed the adaptation recommendation path.

---

## Findings

**FINDING-1: 10/10 pipeline cycles completed without error.**  
Zero crashes across 10 full cycles. All metrics (fail count, top stage, adapt active, score) are deterministic and consistent.

**FINDING-2: Storage is fully stable under sustained load.**  
35 episodes, 15 goals, and adaptation registry are unchanged after 10 cycles. No spurious writes. No file mutations from read-only operations.

**FINDING-3: Score is deterministic across all 10 cycles and 3 independent calls.**  
4.31 invariant. Variance = 0. Suitable for comparison baselines.

**FINDING-4: Retrieval is stable and fast under repeated load.**  
3.6ms avg, max 4ms. Relevance scores identical across 5 consecutive calls. No cache corruption.

**FINDING-5: Adaptation IDs are preserved across runCycle() — no ID drift.**  
Same conditions → same IDs preserved in registry. `recordApplication()` calls remain valid indefinitely as long as the failure pattern holds.

**FINDING-6: Performance improves under sustained load (warm cache), not degrades.**  
Cold start: 519ms. Warm steady-state: 150–168ms. No latency growth, no memory leak signature.

**FINDING-7: DEFECT-10 found and fixed (null context guard in `getRecommendationsFor`).**  
5/6 boundary tests passed without fix. Post-fix: 6/6 pass.

---

## Verdict

**10 cycles, 0 crashes, 0 storage mutations, 0 score drift, 1 defect found and fixed.**  
Operational resilience: **PRODUCTION READY.**
