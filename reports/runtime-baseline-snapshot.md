# Runtime Baseline Snapshot
**Date:** 2026-06-06  
**Phase:** 2 — Pre-Load Baseline  
**Purpose:** Empirical baseline before any synthetic data is loaded  
**Method:** Direct subsystem API calls and Supabase queries from Scripts directory

---

## Methodology

All measurements taken by running `node -e "..."` from `C:\Users\arwwo\Desktop\AI Scripts\Scripts` with `require('dotenv').config()` to load Supabase credentials. No synthetic data loaded at time of capture.

---

## 1. Autonomy Score — Baseline

**Measured value: 5.46**

| Dimension | Raw Value | Weight | Contribution | Source |
|-----------|----------:|------:|------------:|--------|
| executionSuccess | 0.500 | 0.30 | 0.150 | 1 success / 2 episodes from real agent_runs |
| lowRetryRate | 0.272 | 0.15 | 0.041 | max(0, 1−0.364×2); retryRate=4fail/11runs=0.364 |
| recovery | 0.500 | 0.20 | 0.100 | 0 episode files → default 0.5 |
| goalCompletion | 1.000 | 0.20 | 0.200 | 1 completed / 1 total real goal |
| confidence | 0.550 | 0.10 | 0.055 | 0.5×0.5 + 0.04×0.2 + 1.0×0.3 = 0.558 (rounded) |
| episodeRichness | 0.000 | 0.05 | 0.000 | min(1, 0/100) = 0.0; 0 episodes in vault |
| **Total** | | **1.00** | **0.546** | |

**Score = 0.546 × 10 = 5.46**

**Note:** Spec assumed all defaults (score ≈ 5.80). Reality: 11 real apex_agent_runs rows raise retryRate above 0, depressing lowRetryRate to 0.272 instead of 0.500. Real completed goal raises goalCompletion to 1.0. Net effect: 5.46 baseline, not 5.80.

---

## 2. Episodic Memory — Baseline

| Metric | Value |
|--------|------:|
| episodeCount() | 0 |
| getSuccessRate() | null |
| getFailureEpisodes(5).length | 0 |
| Vault Episodes directory | Does not exist |

**Evidence:** `VAULT/12 Memory/Episodes/` directory absent. `_loadAllEpisodes()` returns empty array.

---

## 3. Goal Tracker — Baseline

| Metric | Value |
|--------|------:|
| total | 1 |
| completed | 1 |
| running | 0 |
| blocked | 0 |
| completionRate | 1.0 |

**Evidence:** 1 real goal file: `goal-smoke-test.json` with `status:'completed'`. Source: `VAULT/System/Goals/`.

---

## 4. Planning Quality Registry — Baseline

| Metric | Value |
|--------|------:|
| getSummary().hasData | false |
| getSummary().totalPlans | 0 |
| getPlanQuality({}).insufficient | true |
| Registry file exists | No |

**Evidence:** `VAULT/System/PlanQuality/plan-quality-registry.json` does not exist at baseline.

---

## 5. Adaptation Engine — Baseline

| Metric | Value |
|--------|------:|
| getSnapshot().totalActive | 0 |
| getSnapshot().activeCount | 0 |
| adaptations[] | [] |
| Registry file exists | Yes (empty) |

**Evidence:** `VAULT/System/Adaptations/adaptation-registry.json` exists with `{"totalActive":0,"adaptations":[]}`.

---

## 6. Memory Indexer — Baseline

| Metric | Value |
|--------|------:|
| getStats().episodes | 0 |
| getStats().lessonsIndexed | 0 |
| getStats().embedded | 0 |
| memory-index.json exists | Yes (empty index) |

---

## 7. Supabase State — Baseline

### apex_agent_runs
| Metric | Value |
|--------|------:|
| Total rows | 11 |
| success=true | 7 |
| success=false | 4 |
| synth-* task_ids | 0 |
| retryRate (4/11) | 0.364 |

### apex_transactions
| Metric | Value |
|--------|------:|
| Total rows | 1 |
| [SYNTHETIC] rows | 0 |
| Real rows | 1 |

### apex_email_threads
| Metric | Value |
|--------|------:|
| Total rows | 0 |

### apex_invoices
| Metric | Value |
|--------|------:|
| Total rows | 0 |

### apex_agent_stages
| Metric | Value |
|--------|------:|
| Total rows | 0 |

---

## 8. Self-Evaluator — Baseline

| Metric | Value |
|--------|------:|
| getLatestEvaluation() | null |
| Evaluations directory | Empty or absent |

---

## 9. Improvement Executor — Baseline

| Metric | Value |
|--------|------:|
| getStats().totalProposals | 0 |
| getTopImprovements().length | 0 |
| proposals.json exists | No |

---

## 10. Reflection Engine — Baseline

| Metric | Value |
|--------|------:|
| analyzeFailures([]).topStage | null |
| No lesson data to analyze | — |

---

## Summary: Pre-Tier-1 State

| Subsystem | State | Key Metric |
|-----------|-------|-----------|
| autonomy-metrics | ACTIVE (real data) | score=5.46 |
| episodic-memory | EMPTY | count=0 |
| goal-tracker | HAS REAL DATA | 1 completed goal |
| planning-quality | EMPTY | no registry file |
| adaptation-engine | EMPTY | 0 active adaptations |
| memory-indexer | EMPTY | 0 episodes indexed |
| self-evaluator | EMPTY | no evaluations |
| improvement-executor | EMPTY | 0 proposals |
| apex_agent_runs | HAS REAL DATA | 11 rows, retryRate=0.364 |
| apex_transactions | HAS REAL DATA | 1 row |
| apex_email_threads | EMPTY | 0 rows |

**Critical deviation from spec:** The system is NOT at "all defaults" state. Two data sources contain real production data:
1. `apex_agent_runs`: 11 rows → retryRate=0.364 → lowRetryRate=0.272 (spec assumed 0.5)
2. goal files: 1 completed goal → goalCompletion=1.0 (spec assumed 0.5)

**Post-Tier-1 score prediction (recalculated from real baseline):**
- executionSuccess: 0.5 (1 synth success + existing) → recalc after load
- recovery: 0.5→1.0 (synth failure+success pair) → +0.100 contribution
- goalCompletion: 1.0→0.75 (3 goals, 2 completed) → −0.050 contribution
- lowRetryRate: will change when synth runs add to apex_agent_runs count
- Net: score approximately **5.50–5.60** (higher than spec's ~5.30 projection, which assumed clean-slate defaults)
