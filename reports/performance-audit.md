# Performance Audit — Phase 13
*Audited: 2026-06-05 | Source: server.js startup sequence, lib/latency-tracker.js, services/*, code analysis*

---

## Startup Performance

| Phase | Time | What Happens |
|---|---|---|
| Env validation + error setup | ~0ms | Synchronous |
| Supabase + Anthropic client init | ~100ms | Singleton creation |
| Background agent startup (email, finance, routine, reflection) | ~200ms | Async, non-blocking |
| `server.listen()` | ~300ms total | Port bind |
| Agent library load from Supabase | ~500–2000ms | DB query (background, non-blocking) |
| `autoApproveStandardPermissions()` | +15s (deferred) | Standing approval setup |
| `checkPendingMasterTasks()` first run | +30s (deferred) | Task queue drain |
| `agentLib.syncFromGitHub()` | +8s (deferred) | Background — doesn't block startup |
| Mastra agent framework load | +300s (5 min deferred) | OOM safety — defers 5 x 60 agents |
| services/init.js: first Supabase→Notion sync | +300s (5 min deferred) | Sync job |
| services/init.js: first Slack health post | +300s (5 min deferred) | Health post |

**Cold start to first request ready:** ~300ms ✅
**Cold start to full capability (Mastra):** ~5 minutes ⚠️

**Render free tier:** Spins down after inactivity. First request after spin-down takes ~10–30s. All 5-minute deferrals restart from zero on each cold start.

---

## API Latency (instrumented)

The `latency-tracker.js` tracks 19 spans per voice session. Based on the instrumentation design:

### Expected Latency Profile (voice path)

| Metric | REFLEX paths | EXECUTIVE paths | BACKGROUND paths |
|---|---|---|---|
| ACK latency (first response) | <100ms | <200ms | N/A |
| Meaningful output (first TTS chunk) | <1000ms | <2000ms | N/A |
| Completion | <3000ms | <8000ms | Minutes |

**REFLEX paths** (from server.js classification): `/api/health`, `/api/latency-stats`, `/api/system/events`
**BACKGROUND paths**: `/api/tasks/run`, `/api/master/*`, `/api/research/*`, `/api/browser/*`, `/api/agent/run`

Current p50/p95/p99 available at `GET /api/latency-stats`. Not reported here — requires runtime data.

---

## Database Latency

| Operation | Expected | Monitored |
|---|---|---|
| Supabase JS client SELECT | 50–200ms | ⚠️ Only via /health connectivity check |
| Supabase JS client INSERT | 100–300ms | ❌ Not tracked |
| node-pg query (pgvector) | 100–500ms | ❌ Not tracked |
| Notion API createPage | 300–1500ms | ❌ Not tracked |
| Notion API queryDatabase | 200–800ms | ❌ Not tracked |

**Gap:** No slow-query logging. A degraded Supabase connection may add 2–3s to every agent turn without detection.

---

## Memory Profile

| Threshold | Action | Source |
|---|---|---|
| heap >400MB | `/health` warning: true | server.js /health route |
| rss >400MB | Slack error alert | slack-system-health.js |
| rss >460MB | Slack critical alert | slack-system-health.js |

**Render free tier RAM:** 512MB. At >460MB RSS the system is in critical state.

**Known memory consumers:**
- Mastra agent framework: ~100–150MB after init (reason for 5-min defer)
- Playwright browser contexts: ~100MB per active context (browser-agent.js reuses single context)
- LangChain RAG index: proportional to vault size (re-indexed every 30 min)
- Event bus ring buffer: 200 events × avg ~2KB = ~400KB (negligible)
- Latency tracker: 500 sessions × ~5KB = ~2.5MB (negligible)

**Optimization opportunity:** Playwright context is created once and reused ✅. Mastra is deferred ✅.

---

## Bottlenecks

### 1. Mastra 5-Minute Cold Start (MEDIUM)
- **Problem:** All requests in first 5 minutes use non-Mastra code path
- **Root cause:** OOM risk from loading 5 agent configs at startup
- **Safe optimization:** Reduce to 2 min; monitor memory at 2-min mark

### 2. Notion Rate Limit Queue (MEDIUM)
- **Problem:** MAX_CONCURRENT=3 with no timeout means backlog can build
- **Root cause:** Notion API rate limit is 3 req/s; no timeout clears stalled slots
- **Safe optimization:** Add 30s timeout; stalled slot released, queue drains normally

### 3. RAG Re-Index Every 30 Minutes (LOW)
- **Problem:** Full vault re-index blocks RAG during re-index window
- **Root cause:** BM25 re-index is synchronous (in-memory swap)
- **Impact:** Minimal — BM25 is fast; vault is O(hundreds) of files
- **Safe optimization:** None needed; monitor if vault grows >10K files

### 4. Dual Postgres Connections (LOW)
- **Problem:** node-pg Pool + Supabase JS client both maintain persistent connections
- **Root cause:** pgvector requires raw SQL not available in Supabase JS SDK
- **Impact:** +2 connections to Supabase; well within Supabase free tier limits
- **Safe optimization:** None needed

### 5. Render Free Tier Spin-Down (HIGH)
- **Problem:** Inactivity spin-down adds 10–30s cold-start penalty for all features
- **Root cause:** Free tier spins down after 15 min of inactivity
- **Impact:** Resets all 5-minute deferrals; Mastra not ready on first post-spin request
- **Safe optimization:** Configure UptimeRobot → `GET /health` every 14 minutes (free tier). Costs nothing, eliminates spin-down.

---

## Safe Optimizations (ranked by ROI)

| Optimization | Effort | Gain | Risk |
|---|---|---|---|
| UptimeRobot → /health every 14 min | 10 min | Eliminates cold starts | Zero |
| Add 30s timeout to Notion client | 15 min | Unblocks stalled concurrency slots | Low |
| Add 10s timeout + network retry to Slack | 30 min | Prevents silent message loss | Low |
| Reduce Mastra defer from 5 min to 2 min | 5 min | Full capability in 2 min | Low (monitor memory) |
| Add Supabase latency to /health response | 30 min | DB slowdown now visible | Zero |

---

## What Cannot Be Measured Without Runtime Data

- Actual p50/p95/p99 voice latency (requires live sessions populating latency-tracker)
- Actual Supabase query times (no instrumentation)
- Actual Notion call durations (no instrumentation)
- Actual Render container CPU% (not exposed via Node.js without os.cpuUsage polling)
- Memory growth over time (point-in-time only; no time series)
