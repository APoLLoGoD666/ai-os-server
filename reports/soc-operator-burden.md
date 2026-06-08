# SOC Phase 6 — Operator Burden
_Generated: 2026-06-08 | Commit: b8ccb56_

---

## Fully Automated (Zero Intervention)

| Action | Frequency | Mechanism |
|---|---|---|
| Purge read notifications | Every 6h | setInterval in server.js |
| Purge apex_agent_runs > 90d | Every 6h | setInterval in server.js |
| Purge agent_tasks done/cancelled > 90d | Every 6h | setInterval in server.js |
| Purge email_queue done/error > 30d | Every 6h | setInterval in server.js |
| Daily briefing to vault + Slack | Daily 7am | setTimeout → setInterval |
| Weekly review to vault + Slack | Sundays 8am | setTimeout → setInterval |
| Vault health check | Sundays 4am | setTimeout → setInterval |
| Wiki consolidation | Daily 3am | setTimeout → setInterval |
| Adaptation refresh (cognition) | Sundays 1am | setTimeout → setInterval |
| Tech debt audit | Sundays 2am | setTimeout → setInterval |
| Calendar sync | Every 30min | setInterval |
| Memory metrics telemetry | Every 5min | setInterval |
| Pipeline health monitor (stuck check) | Every 10min | setInterval |
| Pending task recovery (cold-start) | 30s after startup | setTimeout |
| Auto-approve standard permissions | 15s after startup | setTimeout |
| BM25 index refresh | Every 30min | setInterval in langchain-rag |
| Agent library sync | On startup | setImmediate |
| Render deploy | On pipeline COMMITTER success | Render API |

---

## Recurring Manual Interventions Required

### 1. Gmail OAuth Re-Initialization
**Frequency:** When tokens expire (expired 2026-05-21; not yet resolved)
**Action:** Run `node get_gmail_token.js` locally. Opens browser OAuth flow. Must be done on the local Windows machine.
**Estimated time:** 5 minutes
**Automation possible:** No — OAuth 2.0 authorization code grant requires interactive browser.
**Consequence if skipped:** All email read/send operations fail silently. Dashboard email panel empty.

### 2. Gemini Credit Top-Up
**Frequency:** When depleted (£10 ≈ 100,000+ responses at ~$0.0001/response)
**Action:** Log in to ai.studio/projects, add credits.
**Estimated time:** 5 minutes
**At 20 voice interactions/day:** ~7,300/month → ~$0.73/month → credits last ~14 months per £10.
**Estimated frequency:** Every 12–14 months per £10 top-up.
**Consequence if skipped:** All voice (TTS) goes silent. Voice is primary interface.

### 3. Stuck `waiting_approval` Task Cleanup
**Frequency:** Monthly or when pipeline is actively used
**Action:** Direct Supabase query to reject `waiting_approval` tasks older than 7 days (as done in session 18).
**Estimated time:** 5 minutes
**Automation gap:** `autoApproveStandardPermissions()` runs at startup but covers standard low-risk tasks only. Complex tasks requiring manual review can accumulate.
**Consequence if skipped:** Dashboard tasks list fills with stale entries; pipeline may be blocked on phantom approvals.

### 4. Anthropic API Billing
**Frequency:** Monthly
**Action:** Monitor spend at anthropic.com/billing. Pipeline cost cap is $2.00/run; voice uses Haiku.
**Estimated monthly cost at current usage:** $5–20/month (5 pipeline runs + 20 voice turns/day).
**Consequence if budget exceeded:** API returns 429 → all AI features fail.

### 5. Render Service Monitoring
**Frequency:** Weekly
**Action:** Check deploy logs at render.com dashboard. Verify memory usage, uptime, error rate.
**Estimated time:** 5 minutes
**Automation partial:** Memory threshold at 150MB heap fires to Slack. OOM kill sends no alert — only visible in Render logs.
**Consequence if missed:** OOM kill goes undetected until user notices voice/dashboard failure.

### 6. SUPABASE_ACCESS_TOKEN on Render
**Frequency:** One-time action, then never again
**Action:** Add `sbp_...` PAT from local .env to Render environment variables using the safe fetch→update→PUT pattern.
**Estimated time:** 10 minutes
**Consequence if deferred:** `supabase-setup.js` and `run-migrations.js` cannot run from Render. Future migrations must be run locally.

### 7. Obsidian Tunnel Availability (Local Machine)
**Frequency:** Ad-hoc when machine sleeps, reboots, or Cloudflare tunnel drops
**Action:** Ensure local machine is running; restart Cloudflare tunnel if dropped (`tunnel-watcher.js` has 6× retry but cannot restart the machine).
**Estimated time:** 2 minutes
**Consequence if unavailable:** Daily briefing writes fail; vault reads fall back to Render's `/data/vault` (may be stale copy); agent context degrades.

---

## One-Time Pending Actions (from Outstanding Items)

| Action | Priority | Effort |
|---|---|---|
| Run `node get_gmail_token.js` locally | CRITICAL — already 18 days overdue | 5 min |
| Add SUPABASE_ACCESS_TOKEN to Render | HIGH | 10 min |
| Run first real pipeline task | HIGH — needed to bootstrap learning loop | 15 min |

---

## Estimated Weekly Operator Burden

| Category | Time/Week |
|---|---|
| Render monitoring (review logs, check health) | 5 min |
| Anthropic billing check (monthly ÷ 4) | 1 min |
| Stuck task cleanup (if pipeline active, ~monthly) | 1 min |
| Gmail re-auth (quarterly) | 1 min amortized |
| Local machine uptime for tunnel | ~0 (passive) |
| **Total** | **~8 minutes/week** |

---

## Burden Summary

The system is **low maintenance** once the two outstanding one-time actions are completed (Gmail OAuth, SUPABASE_ACCESS_TOKEN). The 8 minutes/week is mostly passive monitoring. The largest single failure risk is the Gmail OAuth expiry — currently causing silent failure for 18 days without operator awareness.

No recurring maintenance action requires more than 10 minutes. The system is operationally self-sustaining on all automated paths.
