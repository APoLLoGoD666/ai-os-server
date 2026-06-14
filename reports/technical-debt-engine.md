# APEX AI OS — Automated Technical Debt Engine

**Date:** 2026-06-05 | **Protocol:** Phase 28 — Phase 5

---

## Overview

A weekly cron job that analyzes agent run data, computes health metrics, writes a markdown report to the Obsidian vault, and fires alerts if thresholds are breached. Runs autonomously with no user action required.

---

## Location

`server.js` — `_scheduleTechDebtAudit()` IIFE, ~65 lines, self-contained.

---

## Schedule

| Job | Time | Notes |
|-----|------|-------|
| Tech debt audit | Sunday 2:00 AM | Before vault health check (4 AM) and weekly review (8 AM) |
| Vault health check | Sunday 4:00 AM | Pre-existing |
| Weekly review | Sunday 8:00 AM | Pre-existing |

Running the debt audit first means the vault health check and weekly review can incorporate the debt report in their context.

Cron expression: `0 2 * * 0` (standard cron; using `node-cron` already imported in server.js)

---

## Data Sources

| Table | Metrics Pulled |
|-------|---------------|
| `apex_agent_runs` | total runs, failure rate, total cost, avg duration, slow run count |
| `apex_agent_stages` | failure count by stage (hotspots) |

Query window: trailing 7 days from execution time.

---

## Metrics Computed

```
total_runs        — COUNT(*) from apex_agent_runs in last 7 days
failure_rate      — % of runs where success = false
total_cost        — SUM(cost_usd) from apex_agent_runs
avg_duration      — AVG(duration_ms) / 1000 (seconds)
slow_run_count    — COUNT WHERE duration_ms > 120000 (2 minutes)
failure_hotspots  — apex_agent_stages: stage + failure count, top 5
```

---

## Output

### Vault Report

Written to: `{VAULT_PATH}/15 System/TechDebt/{YYYY-MM-DD}.md`

Report structure:
```markdown
# Tech Debt Report — {date}

## Agent Health (Last 7 Days)
- Total runs: {n}
- Failure rate: {x}%
- Total cost: ${y}
- Avg duration: {z}s
- Slow runs (>2min): {n}

## Failure Hotspots
| Stage | Failures |
|-------|---------|
| DEVELOPER | 12 |
| RESEARCHER | 7 |
...

## Alerts
- [ALERT] Failure rate {x}% exceeds 30% threshold
- [ALERT] Weekly cost ${y} exceeds $5 threshold
```

### Notification

Inserted into `apex_notifications` table:
```json
{
  "type": "tech_debt_audit",
  "title": "Weekly Tech Debt Report",
  "body": "Failure rate: 12%. Cost: $1.40. Report saved to vault.",
  "metadata": { "report_path": "15 System/TechDebt/2026-06-08.md", "alerts": [...] }
}
```

---

## Alert Thresholds

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Failure rate | > 30% | 3 in 10 runs failing indicates systemic issue |
| Slow runs | > 5 in week | Sustained slowness suggests model or context window issue |
| Weekly cost | > $5.00 | Budget guardrail for API spend |

Thresholds are defined as constants at the top of `_scheduleTechDebtAudit()` for easy tuning.

---

## Cron Logging

Every execution (successful or failed) writes a row to `cron_logs`:

```sql
INSERT INTO cron_logs (job_name, status, message, ran_at)
VALUES ('tech_debt_audit', 'success'|'error', {summary or error}, NOW());
```

This means the debt audit itself is auditable — you can query when it last ran and whether it succeeded.

---

## Rollback

Remove the `_scheduleTechDebtAudit()` IIFE (~65 lines) from server.js. No tables need to be dropped. No existing data is modified by the job — it is read-only except for the vault write and notification insert. Both are additive.

The `cron_logs` table entry for `tech_debt_audit` will stop appearing after removal. No cascading effects.
