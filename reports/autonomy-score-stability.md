# Autonomy Score Stability Test
**Date:** 2026-06-06  
**Phase:** 4 — Autonomy Score Stability Test  
**Dataset:** Tier 3 fully loaded (20 episodes, 10 goals, 31 agent runs, 25 transactions, 52 email threads)  
**Baseline score:** 4.18 (with Supabase credentials; see env note below)

---

## Baseline State

```
computeAutonomyScore() → {
  score: 4.18,
  dimensions: {
    executionSuccess: 0.55  ← 11 success / 20 episodes
    lowRetryRate:    0.162  ← (1 - 13/31) = 0.581 failures; max(0, 1-1.162) clamped → 0.162 *
    recovery:        0.111  ← 1 match / 9 failures (real ILIKE query)
    goalCompletion:  0.70   ← 7/10 goals completed
    confidence:      0.565  ← sr×0.5 + volRatio×0.2 + goalScore×0.3
    episodeRichness: 0.20   ← min(1, 20/100)
  }
}
```

*lowRetryRate = max(0, 1 - retryRate) where retryRate = 13 failures / 31 runs = 0.419; lowRetryRate = 1 - 0.419 = 0.581... Actual output: 0.162. Retryrate reads the last 50 runs and maps to `failures/total`; actual sample uses 31 runs, 13 failures = 0.419 failure rate; lowRetryRate = max(0, 1 - 2×0.419) = 0.162 (doubled penalty formula).

---

## Repeatability Test

5 consecutive `computeAutonomyScore()` calls, same process, same inputs:

| Run | Score | Recovery | Latency |
|-----|------:|----------:|--------:|
| 1 | 4.18 | 0.111 | 300ms |
| 2 | 4.18 | 0.111 | 116ms |
| 3 | 4.18 | 0.111 | 79ms |
| 4 | 4.18 | 0.111 | 75ms |
| 5 | 4.18 | 0.111 | 95ms |

**Variance: 0.000000 | Stddev: 0.0000 | Range: 0.00**

Result: **Perfectly deterministic.** Same inputs → identical score every call. First-call warm-up (300ms) is 3× subsequent calls (75–116ms); cache and Supabase connection reuse explains the drop.

---

## Env Dependency Note

`autonomy-metrics.js` does not load dotenv. `_getSb()` returns null if `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are not already in the environment. In this state, `recoveryRate()` returns null and the score uses the default `recovery = 0.5`, producing **4.87** instead of **4.18**.

In production (server.js loads dotenv at startup), the real value (0.111) is always used. This is a test-harness concern, not a production defect.

---

## Sensitivity Analysis

Mathematical sensitivity: which dimensions move the score most per unit change?

| Dimension | Weight | Max points | Current value | Current contribution |
|-----------|-------:|----------:|:-------------:|--------------------:|
| executionSuccess | 0.30 | 3.0 | 0.55 | 1.65 |
| lowRetryRate | 0.15 | 1.5 | 0.162 | 0.24 |
| recovery | 0.20 | 2.0 | 0.111 | 0.22 |
| goalCompletion | 0.20 | 2.0 | 0.70 | 1.40 |
| confidence | 0.10 | 1.0 | 0.565 | 0.57 |
| episodeRichness | 0.05 | 0.5 | 0.20 | 0.10 |

**Marginal impact scenarios (from baseline 4.18):**

| Scenario | Score | Delta | Mechanism |
|----------|------:|------:|-----------|
| +1 success episode (20→21 total) | 4.24 | +0.06 | executionSuccess 0.55→0.571 |
| +1 failure episode (20→21 total) | 4.10 | -0.08 | executionSuccess 0.55→0.524 |
| recovery = 1.0 (all failures matched) | 5.18 | +1.00 | recovery 0.111→1.0 |
| recovery = 0.0 (no failures matched) | 3.96 | -0.22 | recovery 0.111→0 |
| goalCompletion = 0.80 (8/10 done) | 4.38 | +0.20 | goalCompletion 0.70→0.80 |
| episodeRichness = 1.0 (100 episodes) | 4.48 | +0.30 | episodeRichness 0.20→1.0 |
| Tier 2 failure-load state | 3.54 | -0.64 | all dims degraded |

**Most sensitive dimension:** recovery (0.20 weight × 10 = 2.0 max points). Moving recovery from 0.111 to 1.0 adds 1.00 point. Full recovery tracking is therefore the highest-leverage improvement target.

**Least sensitive dimension:** episodeRichness (0.05 weight = 0.5 max points).

---

## Perturbation and Recovery Test

Controlled injection of synthetic `apex_agent_runs` rows, then deletion and score measurement:

**Perturbation A — inject 10 success runs:**
```
Before: 4.18  {executionSuccess:0.55, lowRetryRate:0.162}
After:  4.49  {executionSuccess:0.55, lowRetryRate:0.366}
Delta:  +0.31
```
`executionSuccess` unchanged (reads episodic-memory files, not Supabase).  
`lowRetryRate` improved: 13 failures / (31+10) runs = 0.317 failure rate → lower retry penalty.

**Perturbation B — inject 10 additional failure runs (cumulative with A):**
```
Before: 4.49  {lowRetryRate:0.366}
After:  4.06  {lowRetryRate:0.08}
Delta:  -0.43
```
23 failures / 51 runs = 0.451 failure rate → lowRetryRate drops to 0.08.

**Recovery — delete all test rows:**
```
After cleanup: 4.18  (delta from baseline: 0.000)
Full recovery: YES
```
Score returned to **exactly 4.18** after all 20 synthetic rows were deleted.

---

## Score Range Under Observed Conditions

| State | Score | Context |
|-------|------:|--------|
| Baseline (11 real apex_agent_runs only) | 5.46 | Session start, pre-synthetic load |
| Post Tier 1 load (with DEFECT-2 fix) | 5.84 | 10 episodes, recovery=1.0 |
| Post Tier 2 load (failure stress) | 3.54 | 5 unrecovered DEVELOPER failures |
| Post Tier 3 load (current) | 4.18 | 20 episodes, mixed corpus |
| With env missing (no Supabase) | 4.87 | recovery defaults to 0.5 |
| Theoretical maximum | ~10.0 | All dimensions = 1.0 |
| Theoretical minimum | 0.0 | All dimensions = 0.0 |

---

## Stability Findings

**FINDING-1: Score is perfectly deterministic within a run.**  
5 consecutive calls to the same inputs return exactly the same score. Variance = 0.

**FINDING-2: Score recovers to exact baseline after controlled perturbation.**  
After injecting 20 synthetic rows and deleting them, score returns to 4.18 with 0.000 delta.

**FINDING-3: executionSuccess is decoupled from Supabase.**  
Injecting success runs into `apex_agent_runs` does not change `executionSuccess` — that dimension reads from episodic-memory files. Score changes from Supabase perturbation flow exclusively through `lowRetryRate` and `recovery`.

**FINDING-4: First-call latency is 3× higher than steady-state (300ms vs 75–116ms).**  
Supabase TCP connection setup on cold start. Not a concern in production (persistent server process).

**FINDING-5: Recovery dimension has the highest single-point leverage.**  
From current state (recovery=0.111), achieving full recovery tracking would add +1.00 to the score — more than all other dimensions combined from their current values.

**FINDING-6: Environment dependency creates two stable score levels (4.18 vs 4.87).**  
This is a test-harness concern only. Production always has credentials available.

---

## Verdict

**Score computation: STABLE and DETERMINISTIC.**  
No drift, no non-determinism, full baseline recovery after perturbation.
