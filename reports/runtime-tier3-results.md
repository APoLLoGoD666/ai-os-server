# Runtime Tier 3 Results
**Date:** 2026-06-06  
**Phase:** 5 — Controlled Tier 3 Execution  
**Dataset:** sdv1-dim + sdv1-loop + sdv1-scale (201 total records cumulative)  
**Prior state:** Tier 2 loaded; adaptation cycle run; DEFECT-2 and DEFECT-3 fixed

---

## Execution Log (First Attempt — FATAL)

```
node test-data-generator/cli.js load tier3

  Loading sdv1-scale...
FATAL: transactions insert failed: Could not find the 'account' column of 'transactions' in the schema cache
```

**DEFECT-3 discovered:** `insertTransactions()` mapped synthetic fields (`user_id, currency, merchant, account`) that don't exist in the actual `transactions` table schema. Similarly, `insertEmailThreads()` used `recipients` (plural) instead of `recipient`, `snippet` instead of `summary`, and included non-existent `date` and `is_read` columns.

**Actual table schemas:**
- `transactions`: `id, date, description, amount, type, category, source, created_at`
- `invoices`: `id, user_id, client_name, client_email, amount, currency, status, due_date, items, notes, invoice_number, paid_at, created_at, updated_at`
- `email_threads`: `id, user_id, subject, sender, recipient, body, summary, action_required, thread_id, labels, created_at, updated_at`

**Fixes applied (test-data-generator/loader.js):**
- `insertTransactions()`: removed `user_id, currency, merchant, account`; fixed date format (`.split('T')[0]`); mapped `source: t.source`
- `insertInvoices()`: removed `user_id` (not in synthetic data's fields with correct value)
- `insertEmailThreads()`: `recipients[0]→recipient`, `snippet→summary`, removed `date`/`is_read`

**Side effect of first failed attempt:** The 4 sdv1-scale lessons were written to Lessons.md before the transaction FATAL. The second attempt found the SYNTHETIC-BEGIN:sdv1-scale marker and returned `lessons: 0` (correct idempotent behavior).

---

## Execution Log (Second Attempt — SUCCESS)

```
node test-data-generator/cli.js load tier3

  sdv1-dim:   { episodes: 2, goals: 3, planRecords: 0, lessons: 0, agentRuns: 2 }   (already loaded)
  sdv1-loop:  { episodes: 8, goals: 3, planRecords: 0, lessons: 0, agentRuns: 8 }   (already loaded)
  sdv1-scale: { episodes: 10, goals: 3, planRecords: 0, lessons: 0, agentRuns: 10,
                chatHistory: 5, projects: 3, transactions: 24, invoices: 6, emailThreads: 52 }
```

---

## Cumulative Counts — Tier 3

| Data Type | Baseline | Tier 1 | Tier 2 | Tier 3 |
|-----------|--------:|------:|------:|------:|
| Episodes (vault) | 0 | 2 | 10 | **20** |
| Goals (vault) | 1 | 4 | 7 | **10** |
| apex_agent_runs (Supabase) | 11 | 13 | 21 | **31** |
| Lessons.md sections | 3 | 3 | 11 | **15** |
| transactions | 1 | 1 | 1 | **25** (24 synth + 1 real) |
| invoices | 0 | 0 | 0 | **6** |
| email_threads | 0 | 0 | 0 | **52** |

---

## Autonomy Score — Tier 3

| Dimension | Tier 2 | Tier 3 | Delta |
|-----------|------:|------:|------:|
| executionSuccess | 0.400 | 0.550 | +0.150 |
| lowRetryRate | 0.048 | 0.162 | +0.114 |
| recovery | 0.167 | 0.111 | -0.056 |
| goalCompletion | 0.714 | 0.700 | -0.014 |
| confidence | 0.454 | 0.565 | +0.111 |
| episodeRichness | 0.100 | 0.200 | +0.100 |
| **Score** | **3.54** | **4.18** | **+0.64** |

Score improved from 3.54 to 4.18 — sdv1-scale adds more success episodes (11 successes out of 10 Tier 3 episodes, raising overall successRate from 0.4 to 0.55).

---

## Episodic Memory — Tier 3

| Metric | Tier 2 | Tier 3 |
|--------|------:|------:|
| episodeCount() | 10 | **20** |
| getSuccessRate() | 0.400 | **0.550** |
| getFailureEpisodes(30).length | 6 | **9** |

---

## Goals — Tier 3

| Metric | Tier 2 | Tier 3 |
|--------|------:|------:|
| total | 7 | **10** |
| completed | 5 | **7** |
| running | 1 | **2** |
| blocked | 1 | **1** |
| completionRate | 0.714 | **0.700** |

---

## Memory Indexer — Tier 3

| Metric | Tier 2 | Tier 3 |
|--------|------:|------:|
| episodes | 10 | **20** |
| lessonsIndexed | 11 | **15** |
| embedded | 21 | **35** |
| successRate | 0.4 | **0.55** |

**Note on 15 lessons:** The Lessons.md file now has 15 `---`-separated sections: 3 pre-existing (frontmatter, main body, related) + 8 sdv1-loop lessons + 4 sdv1-scale lessons. All 15 sections are embedded via Gemini.

---

## Supabase Scale Data — Tier 3

| Table | Rows | Synth rows | Cleanup key |
|-------|----:|----------:|------------|
| apex_agent_runs | 31 | 20 | task_id LIKE 'synth-%' |
| transactions | 25 | 24 | description LIKE '[SYNTHETIC]%' |
| invoices | 6 | 6 | invoice_number LIKE 'SYNTH-%' |
| email_threads | 52 | 52 | thread_id LIKE 'synth-thread-%' |

**Scale validation:** 52 email threads, 24 transactions, 6 invoices successfully inserted. Scale data is available for SQL query performance testing. Note: `transactions.source='test'` (not 'synthetic') — this is fine as cleanup uses description prefix.

---

## Findings Summary

| ID | Finding | Severity | Action |
|----|---------|---------|--------|
| DEFECT-3 | Loader `insertTransactions()` used non-existent `account, merchant, currency, user_id` columns | CRITICAL | Fixed: remapped to actual schema |
| DEFECT-4 | Loader `insertEmailThreads()` used `recipients` (plural), `snippet`, `date`, `is_read` — none exist in schema | CRITICAL | Fixed: remapped to `recipient`, `summary`; removed non-existent fields |
| FINDING-9 | First failed Tier 3 attempt wrote sdv1-scale lessons before fatal error; second run correctly detected idempotent marker | MINOR | No action; correct behavior |
| FINDING-10 | 4 sdv1-scale lessons contain `specific` regex keywords (schema, security, fileCount) — higher quality than sdv1-loop lessons | POSITIVE | No action |

---

## Tier 3 Verdict

**PASS (after DEFECT-3 and DEFECT-4 fixes).** All 201 Tier 3 records loaded successfully. Financial scale data (24 transactions, 6 invoices, 52 email threads) available for query testing. Autonomy score improves to 4.18 as the Tier 3 success-weighted episodes offset the Tier 2 failure load. All subsystems functional at 20-episode scale.

**Tier 3 purpose fulfilled:** Scale data is present for SQL query performance baseline testing. The score improvement from 3.54→4.18 confirms the system responds correctly to improved execution evidence.
