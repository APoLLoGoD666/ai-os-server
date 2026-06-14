# Phase 4: Autonomous Improvement — Weekly Cron Assessment

---

## Implemented Crons

Three weekly cron jobs are live, all scheduled on Sundays.

### 1. Tech Debt Audit — Sunday 2:00 AM

**Schedule:** `0 2 * * 0`

**Data pulled:**
- Recent `apex_agent_runs` records (failures, high cost tasks, slow tasks)
- `apex_agent_stages` error frequency
- Self-check endpoint results
- Supabase query performance (slow query log)

**Output:**
- Analysis written to Obsidian vault as a dated note
- Summary posted to Slack (`#apex-system` or equivalent channel)

**Purpose:** Surfaces recurring failures, cost anomalies, and slow agent stages for human review.

---

### 2. Vault Health — Sunday 4:00 AM

**Schedule:** `0 4 * * 0`

**Data pulled:**
- `vault_embeddings` row count and last-indexed timestamp
- BM25 index freshness (file modification times vs index build time)
- Orphaned embeddings (embeddings for files that no longer exist)
- `OBSIDIAN_VAULT_PATH` reachability

**Output:**
- Health report written to Obsidian vault
- Alert to Slack if vault_embeddings count is 0 or stale beyond threshold

**Note:** On Render, vault health will always report degraded until vault files are synced to `/data/vault`. This cron is most useful in local or hybrid deployments.

---

### 3. Weekly Review — Sunday 8:00 AM

**Schedule:** `0 8 * * 0`

**Data pulled:**
- Full week of `apex_agent_runs` (success rates, cost totals, task distribution)
- Slack activity summary (messages sent, commands triggered)
- Self-check history if persisted
- Notion workspace activity (via Notion API)

**Output:**
- Narrative review generated with Claude (structured prompt over aggregated data)
- Written to Obsidian vault as weekly note
- Posted to Slack as formatted summary

---

## Gaps Assessment

| Gap | Description | Impact | Effort to Fix |
|---|---|---|---|
| No Notion storage of reviews | Weekly reviews written to Obsidian and Slack only — not persisted to Notion database | Medium — Notion is a configured integration | Low — add Notion page create after review generation |
| No Supabase persistence of improvement suggestions | Tech debt audit identifies issues but does not write structured suggestions to a Supabase table | Medium — suggestions are ephemeral (Slack/Obsidian only) | Low — add `apex_improvement_suggestions` table insert |
| No self-triggered improvement actions | Crons identify issues but never trigger automated fixes (e.g. restart on heap critical, re-index vault) | High — "autonomous" is aspirational, not actual | High — requires safe action boundary definition |
| No improvement tracking over time | No way to verify if a flagged issue from week N was resolved by week N+1 | Medium — feedback loop is absent | Medium — requires suggestion status tracking |
| Cron results not visible in self-check | `/api/intelligence/self-check` does not surface last cron run time or outcome | Low | Low — add last_cron_run to self-check response |

---

## Summary

The cron infrastructure is solid. All three jobs run, collect meaningful data, and push results to the two primary output surfaces (Obsidian, Slack). The system is informative but not yet autonomous in the strict sense — it surfaces opportunities but does not act on them. The highest-ROI improvement is adding Supabase persistence for improvement suggestions, which would enable tracking resolution over time and eventually enable automated action triggers.
