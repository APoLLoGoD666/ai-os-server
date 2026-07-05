# 10 — Services Runtime

**Date:** 2026-07-02  
**Evidence Source:** services/init.js, agent-system/obsidian-memory.js, lib/chat-context.js, lib/apex-tools.js, lib/consumption-log.js, services/slack/slack-alerts.js, lib/health/monitor.js

---

## services/init.js — Initialization Cascade

**File:** `services/init.js`  
**Called from:** server.js listen callback (immediately at listen, not deferred)  
**Guard:** `_initialized` flag prevents double-init

### 12-Step Initialization Sequence

Steps execute in order. Any step failure is non-fatal and caught individually.

```
1. Env-var check
   └── Read NOTION_API_KEY and SLACK_BOT_TOKEN presence as booleans

2. DB migration (setImmediate — non-blocking)
   └── db-migrate.runLifeDomainMigration()
       └── Idempotent migration; safe to re-run

3. Outbox relay start
   └── lib/outbox-relay.start()
       └── Begins polling outbox table for pending events

4. Integrity crons start
   └── lib/integrity-crons.start()
       └── Registers backup and reconcile cron jobs

5. Relationship consumer register
   └── lib/entities/relationship-consumer.register()

6. Push notification scheduler start
   └── lib/pwa/notification-scheduler.start()

7. Early exit check
   └── IF neither NOTION_API_KEY nor SLACK_BOT_TOKEN: log and RETURN HERE
       └── Steps 8-12 are SKIPPED if no integration tokens

8. Event bus wiring (if SLACK_BOT_TOKEN):
   └── bus.on(AGENT_STARTED)   → slackAgents.notifyRunStart()
   └── bus.on(AGENT_COMPLETED) → slackAgents.notifyRunComplete()

9. Event bus wiring (if NOTION_API_KEY):
   └── bus.on(AGENT_COMPLETED) → notionSync.logAgentRun()

10. Supabase persist on completion (always if any token present):
    └── bus.on(AGENT_COMPLETED) → supabase.insert(apex_agent_runs)
        └── ON CONFLICT DO NOTHING
        └── ON OTHER ERROR: slack-alerts.alertError()

11. Supabase→Notion sync (if NOTION_API_KEY):
    └── ensureCheckpointTable() immediately
    └── First full sync: +5 minutes (setTimeout 300000)
    └── Then: every 6 hours

12. Slack system health check (if SLACK_BOT_TOKEN):
    └── Collects: memoryMb, supabaseLatencyMs (SELECT 1),
                  activeWebSockets (global._apexWsCount), apiErrors24h: 0
    └── First post: +5 minutes
    └── Then: every 6 hours
```

### Services Not Started Here (started elsewhere)

| Service | Started from |
|---------|-------------|
| civilization-runtime.js | server.js listen callback (direct) |
| lib/cron-scheduler.js | server.js line ~4662 |
| Mastra agents | server.js +5min setTimeout |
| Ruflo daemon | server.js +10min setTimeout |
| lib/agent-queue.js | Singleton created at require time |

---

## agent-system/obsidian-memory.js — Dual-Write Pattern

**File:** `agent-system/obsidian-memory.js`  
**20 confirmed consumers**

### In-Memory State

```javascript
_lessonBuffer[]          // capped at 50 — last 50 lessons this session
_lessonHashes (Set)      // SHA-1 dedup, capped at 200 entries
_sbLessonsMissing (bool) // suppresses future Supabase lesson writes if table missing
```

### Vault Path Resolution

```
process.env.OBSIDIAN_VAULT_PATH
  || 'C:\Users\arwwo\Desktop\AI Scripts\APEX AI OS'  ← hardcoded fallback
```

### write(notePath, content) — Archive Before Overwrite

```
1. If file exists: fs.readFileSync → fs.writeFileSync to:
   <VAULT>/Archives/<note-path-as-filename>-<timestamp>.md
2. fs.writeFileSync(notePath, content)
3. mkdir -p as needed
```

Every `write()` call archives the previous version. Archives accumulate indefinitely (no cleanup).

### logLesson(lesson, {taskId, traceId}) — Dual Write

```
1. SHA-1 hash of lesson[0:200] (lowercased)
2. Check _lessonHashes Set — if duplicate: return { skipped: true }
3. _apiAppend('01 Executive/Lessons.md', lesson)  ← REST API write
4. this.append('01 Executive/Lessons.md', lesson)  ← filesystem write
5. _lessonBuffer.push(lesson)
6. _gateway.storeMemory({ layer: 10, ... })  ← Supabase write
7. if Supabase table not found: set _sbLessonsMissing = true
   └── Future lesson writes skip step 6 (suppressed)
```

Three write paths per lesson: REST API → filesystem → Supabase. Independent failures — all three attempted regardless.

### searchVault(query) — Keyword Search

```
1. _collectMdFiles(vault, maxDepth: 2)  ← recursive .md file collection, 2 levels only
2. Split query into words > 3 chars
3. For each .md file:
   content = fs.readFileSync()
   score = count of keyword matches
4. Sort by score descending
5. Return top 5: { path, score, excerpt }
```

Only searches 2 levels deep. Deep vault content (3+ levels) is NOT indexed by searchVault.

---

## lib/chat-context.js — Prompt Assembly

**File:** `lib/chat-context.js`  
**Purpose:** Assembles the complete prompt injected into Claude for chat requests

### buildPrompt() — Assembled Blocks (in order)

```
APEX SELF-STATE:
  - civilization health score, classification, dimensions
  - lessons count (last 24h), completed tasks (last 24h)
  - top opportunity (by composite_score)

FOUNDER ALIGNMENT:
  - privacy-guard.abstractForExternalPrompt() output

STRATEGIC INTELLIGENCE:
  - SIE briefing (max 400 chars)

PRIOR COUNCIL DECISIONS:
  - Up to 3 most recent executive verdicts

LESSONS LEARNED:
  - Up to 3 recent lessons

RELEVANT PAST CONTEXT:
  - Up to 2 context items from gateway.getContext()

KNOWLEDGE CONNECTIONS:
  - Up to 4 graph nodes

TOP OPPORTUNITIES:
  - From opportunities table

EXECUTIVE ADVISORY:
  - From SIE executive briefing

RECENT MEMORY:
  - From formatRecentMemory() (last 12 items, sanitized)

RELEVANT SAVED DOCUMENTS:
  - From Supabase document search

USER MESSAGE:
  - The actual user input
```

### Memory Compression (Every 20 User Messages)

```javascript
// Triggered setImmediate after addToMemory every 20 user messages:
_compressMemory():
  1. pgLoadMemory() — load all stored memory items
  2. Take all items EXCEPT last 6
  3. runtime.execute({ tier: 'fast', maxTokens: 100 })
     "Summarize in one sentence"
  4. pgAddMemory('summary', summarized_text)
```

Compresses old memory into single summary row. Last 6 items preserved verbatim. Runs async in background — does not block response.

### getMemorySummary() — Cached LLM Call

```javascript
// Cache: invalidated after 5min OR 10 new messages
// In-flight guard: single Promise stored, parallel calls await same result

getMemorySummary():
  if (cached && !expired): return cache
  if (inflight): return inflight promise
  
  inflight = runtime.execute({
    tier: 'fast', maxTokens: 60, temperature: 0
  }) // "60-word summary of last 15 memory items"
  
  result = await inflight
  cache = result
  inflight = null
  return result
```

### fetchSelfContext() — Parallel DB Queries (60s cache)

```javascript
// 4 parallel Supabase queries cached 60 seconds:
[snap, opp, les24, completed24] = await Promise.all([
  civilization_health_snapshots (latest score/classification/dimensions),
  opportunities (top by composite_score WHERE status='detected'),
  apex_lessons (count WHERE created_at > now - 24h),
  agent_tasks (status counts WHERE updated_at > now - 24h)
])
```

### extractAndSaveFacts(userMessage, apexReply) — Background Fact Extraction

Called via `setImmediate` after every chat response:

```
1. runtime.execute({ tier: 'fast', maxTokens: 200 })
   "Extract up to 5 Alex-prefixed facts from this exchange"
2. For each extracted fact:
   _gateway.storeMemory({ layer: 9 })  ← strategic/founder memory
   obsidianAppend('12 Memory/Identity/Alex.md', fact)  ← vault mirror
```

---

## lib/apex-tools.js — Tool Schema and Dispatch

**File:** `lib/apex-tools.js`

### 22 Advertised Tools (in APEX_TOOLS schema)

```
web_search, get_weather, get_datetime, list_emails, check_emails,
get_notifications, list_files, read_file, search_documents, create_task,
list_tasks, get_news, get_calendar_events, get_finance_summary,
get_health_summary, get_relationship_summary, get_travel_summary,
get_property_summary, get_legal_summary, get_career_summary,
get_shopping_summary, get_social_summary
```

### 6 Browser Tools (NOT in APEX_TOOLS schema — not advertised to Claude)

```
browser_research, browser_screenshot, browser_pdf,
browser_scrape, browser_fill_form, browser_click
```

These are handled in `executeApexTool()` dispatcher but are not included in the tool schema array sent to Claude via tool_use. Claude cannot request these tools — they must be invoked directly.

### web_search — Dual Provider

```
Primary: Brave Search API
Fallback: DuckDuckGo instant answer (if Brave fails or rate-limited)
```

High-importance results stored to gateway Layer 9.

### get_weather — UK-First

```
1. UK city map: Leamington, Warwick, Coventry, Birmingham, London, etc.
2. If not in map: Open-Meteo geocoding fallback
3. Returns: current conditions + 3-day forecast
```

---

## lib/consumption-log.js — Observability Only

**File:** `lib/consumption-log.js`

```javascript
record({ subsystem, output_key, consumer, task_id, meta })
  → logger.info('consumption', `${subsystem} → ${consumer}`, {
      output_key, task_id, ...meta
    })
```

**Zero database writes.** Pure structured log line. Answers "is this subsystem's output being consumed downstream?" Consumed by observability tooling, not by runtime logic.

---

## services/slack/slack-alerts.js — Alert Functions

**File:** `services/slack/slack-alerts.js`

### 8 Alert Functions and Their Channels

| Function | Channels | Dedup? | Key |
|----------|---------|--------|-----|
| `alertCritical(title, details, system)` | `alerts` + `executive` | Yes | `critical:<title>` |
| `alertError(title, details, system)` | `alerts` | Yes | `error:<title>` |
| `alertWarning(title, details)` | `alerts` | Yes | `warning:<title>` |
| `alertSuccess(title, details)` | `alerts` | **No** | N/A |
| `alertHealthAnomaly(metric, value, threshold, domain)` | `health` (+ `executive` if streak) | Yes | `health:<metric>` |
| `alertBudgetThreshold(category, spent, budget, pct)` | `finance` | Yes (10% buckets) | `budget:<cat>:<floor(pct/10)>` |
| `alertApiQuota(api, model, pct)` | `alerts` (critical → also via alertCritical) | Yes (5% buckets) | `quota:<api>:<model>:<floor(pct/5)>` |
| `alertRenderDeploy(commitHash, status)` | `system` | **No** | N/A |

**`alertApiQuota`:** No-ops completely if `percentUsed < 80`. Sends warning at 80–94%. Calls `alertCritical` at ≥95%.

**5 Slack channels used:** `alerts`, `executive`, `health`, `finance`, `system`

**Dedup mechanism:** `postDeduped(key, ...)` — UNKNOWN exact implementation (lives in `./slack-client`), but dedup key is defined per alert type.
