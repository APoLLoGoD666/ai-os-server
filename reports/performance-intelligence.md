# Phase 6: Performance Intelligence

---

## /api/intelligence/performance Endpoint

**Method:** `GET /api/intelligence/performance`
**Authentication:** `requireAppAccess`

This endpoint aggregates performance data from multiple sources into a single response for monitoring and dashboarding.

---

## Data Sources

### 1. Voice Session Latency (lib/latency-tracker.js)

The latency tracker measures three dimensions of voice session responsiveness, with aggregate statistics.

| Metric | Description |
|---|---|
| ack_latency | Time from voice input received to first acknowledgment signal |
| meaningful_latency | Time from input to first meaningful content in response |
| completion_latency | Time from input to full response delivered |
| abandonment_rate | Fraction of sessions where user stopped before response completed |

Statistics available: p50, p95 for each latency dimension. These are computed in-process from the current session window — no Supabase persistence of raw latency samples.

### 2. External Service Latency (from self-check measurements)

Latency values are captured during each self-check run and surfaced in the performance endpoint.

| Service | Observed Latency | Measurement Method |
|---|---|---|
| Supabase | 226ms | Timed ping query at self-check time |
| Notion | 109ms | Timed API call at self-check time |
| Slack | 100ms | Timed API call at self-check time |

These are point-in-time measurements from the most recent self-check, not rolling averages.

### 3. Agent Queue Stats

Sourced from the agent_queue check: `queued`, `running`, `completed`, `failed`, `max_concurrency`. At the time of evidence collection: all zero except `max_concurrency: 3` — system is idle.

---

## Gaps

| Gap | Description | Impact |
|---|---|---|
| No HTTP API latency tracking | All latency measurement is voice-session focused. REST API endpoint latencies (e.g. /api/chat, /api/agent) are not tracked. Cannot identify slow API endpoints. | High |
| External latency is point-in-time | Supabase/Notion/Slack latencies come from single measurements at self-check time, not rolling p95 across many calls. A single slow check inflates the number; fast checks hide intermittent slowness. | Medium |
| No latency history | Latency tracker stats() is in-memory only. No time-series storage. Cannot compare this week's p95 to last week's. | Medium |
| No SLA thresholds | No alerting or flagging when latency exceeds a defined threshold (e.g. Supabase > 500ms, voice ack > 300ms). | Low |

---

## Performance Baseline (from evidence)

| Metric | Value | Assessment |
|---|---|---|
| Self-check latency | 1908ms | Acceptable — checks 10 external services in parallel |
| Supabase latency | 226ms | Acceptable for Supabase free tier |
| Notion latency | 109ms | Good |
| Slack latency | 100ms | Good |
| RSS memory | 205MB / 512MB | Healthy (40% utilization) |
| Agent queue | Idle | No current load to measure |

The production system is performant at rest. Performance intelligence gaps are primarily about visibility (tracking over time, API-level latency) rather than actual performance problems.
