# 05 — Memory Runtime

**Date:** 2026-07-02  
**Evidence Source:** lib/memory/gateway.js, lib/memory/index.js, lib/memory/access-controller.js, lib/memory/founder-memory.js, lib/memory/semantic-memory.js, lib/memory/procedural-memory.js, lib/memory/skill-memory.js, lib/memory/decision-memory.js, lib/memory/reflexion-tracker.js, lib/memory/memory-governor.js, lib/memory/improvement-engine.js, lib/memory/adaptation-cycle.js, lib/memory/working-memory.js, lib/memory/episodic-memory-pg.js

---

## Memory Architecture Overview

13 memory layers exported from `lib/memory/index.js`:

```javascript
{
  workingMemory, episodicMemory, semanticMemory, proceduralMemory,
  strategicMemory, skillMemory, decisionMemory, knowledgeGraph,
  consolidationEngine, reflexionTracker, improvementEngine,
  adaptationCycle, governor
}
```

All 13 accessed through `lib/memory/gateway.js` — 39 confirmed consumers. Direct imports of individual layers happen only within the memory system itself.

---

## Access Controller Runtime

**File:** `lib/memory/access-controller.js`

### Entity Classes

| Entity Class | Who | Rights |
|-------------|-----|--------|
| `FOUNDER` | founder + stop_hook | `FOUNDER_WRITE` (elevated) |
| `COUNCIL` | Executive council members | `COUNCIL_READ`, `COUNCIL_WRITE` |
| `SYSTEM` | Internal services | `SYSTEM_READ`, `SYSTEM_WRITE` |
| `AGENT` | Agent processes | `AGENT_READ`, `AGENT_WRITE` |

### `check(entityClass, operation, layer)` Runtime Behavior

- Throws `AccessDeniedError` on permission failure
- Called by gateway before every memory operation
- **The only hard-blocking mechanism in the memory layer** — everything else is fail-soft

---

## Layer-by-Layer Runtime Behavior

### Layer 1 — Working Memory (`lib/memory/working-memory.js`)

**Storage:** Supabase `working_memory` table with `expires_at` column  
**TTL:** Default 3600 seconds  
**Operations:** `set(sessionId, key, value, ttlOverride)`, `get(sessionId, key)`, `getAll(sessionId)`, `extend(sessionId, key, ttl)`, `clear(sessionId)`, `clearExpired()`

**Key runtime fact:** `clearExpired()` is NOT called on a background interval. It is called **by a cron job** via lib/cron-scheduler.js. Between cron runs, expired entries remain in the table and are NOT served (the `get()` function checks `expires_at > now`).

---

### Layer 2 — Episodic Memory (`lib/memory/episodic-memory-pg.js`)

**Storage:** `episodic_memory` table  
**Status on write:** `validated` (not `candidate` — unlike semantic memory)  

**BUG:** `getSuccessRate()` queries `apex_agent_runs` table for success metrics, NOT `episodic_memory`. The function returns statistics about agent runs, not episodic memory episodes.

**Called from:**
- civilization-kernel.js post-response hook (Layer 2 write for every EXECUTIVE class request)
- runDueSchedules() on task completion

---

### Layer 3 — Semantic Memory (`lib/memory/semantic-memory.js`)

**Storage:** `semantic_memory` table with `status` column  
**Write path:** `storeFact(fact, source, category)`

```
storeFact()
  1. Insert row with status: 'candidate'
  2. setImmediate → generate embedding (async, non-blocking)
     → UPDATE row with embedding vector
```

**Status lifecycle:**
```
candidate → validated | deprecated | superseded | archived
```

`storeFact` inserts as `candidate`. Validation to `validated` is a separate process (UNKNOWN trigger).

**Search path:** `searchFact(query, options)`
```
1. Try: search_semantic_memory RPC (pgvector, threshold 0.4)
2. Fallback: ILIKE text search
```

---

### Layer 4 — Procedural Memory (`lib/memory/procedural-memory.js`)

**BUG — DEAD CODE:** `findProcedure(name)` has a semantic search path:
```javascript
const query = buildSemanticQuery(name)  // query built here
// ← query is NEVER EXECUTED
// falls through to ILIKE always
const result = await supabase.from('procedural_memory').ilike('name', `%${name}%`)
```

**All `findProcedure()` calls use ILIKE text match only.** The semantic path is dead code at line ~124.

---

### Layer 6 — Skill Memory (`lib/memory/skill-memory.js`)

**Storage:** `skill_memory` table  
**Competency levels (based on execution count):**

| Level | Condition |
|-------|-----------|
| novice | < 5 executions |
| developing | success rate ≥ 45% |
| competent | success rate ≥ 65% |
| proficient | success rate ≥ 80% |
| expert | success rate ≥ 92% |

**`updateFromReputation()`** — syncs competency level from `agent-reputation.js` data. Called by adaptation cycle.

---

### Layer 7 — Decision Memory (`lib/memory/decision-memory.js`)

**Storage:** `decision_memory` table  
**Primary key column:** `memory_id` (NOT `id`)

**Quality → Confidence mapping (`recordOutcome`):**

| Quality | Confidence |
|---------|-----------|
| excellent | 0.95 |
| good | 0.80 |
| acceptable | 0.65 |
| poor | 0.35 |
| catastrophic | 0.05 |

---

### Layer 9 — Strategic Memory (Founder Facts)

**Storage:** Supabase `founder_memory` table (not a separate layer module — this is `lib/memory/founder-memory.js`)  
**`getContext()` domain parameter:** Vestigial — ignored in current implementation. Always returns all founder context.  
**FALLBACK_CONTEXT:** Hardcoded in the file — Alex's full profile (name, location, goals, style, constraints, env) used when DB unavailable.

---

### Layer 10 — Working Memory for Facts

Chat context fact extraction writes to Layer 9 (strategic) via gateway AND mirrors to Obsidian at `12 Memory/Identity/Alex.md`.

---

## reflexion-tracker.js — Known Bug

**File:** `lib/memory/reflexion-tracker.js`

### BUG: `recordInfluence()` — decisionMemoryId Always Null

```javascript
// Queries decision_memory for column 'id'
const { data } = await supabase
  .from('decision_memory')
  .select('id')  ← column does not exist (PK is 'memory_id')
  .eq('session_id', sessionId)
  .limit(1)

const decisionMemoryId = data?.[0]?.id  ← always undefined → null
```

Every `recordInfluence()` call records `decisionMemoryId: null`. The link between reflexion records and decision memory is broken.

**`getUnverified()`:** Uses 7-day lookback window.  
**`retroactiveVerification(50)`:** Bulk verification of 50 unverified reflexion records.

---

## memory-governor.js — No Quota Enforcement

**File:** `lib/memory/memory-governor.js`

Despite the name suggesting quota enforcement, this module contains:
- `generateMemoryId()` — ID generation utility
- `buildGovernanceFields()` — metadata builder
- `contentHash()` — SHA-256 hash of content
- `lifecycleTransition(status, event)` — status state machine helper
- `accumulateSupport()` — support accumulation
- `recordContradiction()` — contradiction tracking
- `deriveCompetencyLevel()` — competency level derivation

**Zero quota enforcement. Zero rate limiting.** All governance is metadata/lifecycle utilities only.

---

## adaptation-cycle.js — Weekly Memory Maintenance

**File:** `lib/memory/adaptation-cycle.js`

### `runWeeklyCycle()` — 8 Steps

```
Step 1: Read semantic_memory (recent candidates)
Step 2: Read skill_memory (competency data)
Step 3: Read improvement_candidates (approved improvements)
Step 4: Read cognitive_policy_settings (current policies)
Step 5: API call → Haiku (claude-haiku-4-5-20251001)
        ← AI pattern synthesis from all gathered data
Step 6: Write semantic_memory (new validated facts)
Step 7: Write skill_memory (updated competency levels)
Step 8: Write improvement_candidates (new candidates)
Step 9: Write cognitive_policy_settings (behavior updates)
```

**Behavior change gate:**
- Low/Moderate risk improvements → `active = true` immediately
- High/Critical risk → `active = false`, pending CIO review

**`repairStuckCycles()`:** Marks cycles with `status = 'running'` for >2 hours as failed.

---

## improvement-engine.js — Proposal Lifecycle

**File:** `lib/memory/improvement-engine.js`

### States

```
submitted → assessed → (approved | rejected) → deployed → validated
```

### `_assessRisk()` — Regex-Based

Categories:
- `critical`: destructive patterns (delete, drop, truncate, purge)
- `high`: auth, api_key, token, secret, credential
- `moderate`: schema change, migration
- `low`: default

### Auto-block Rule

System cannot auto-approve `critical` risk proposals. Must go to human approval.

---

## Memory Gateway Runtime

**File:** `lib/memory/gateway.js`  
**39 confirmed consumers**

### `getContext(sessionId, options)` — Primary Read Path

```
Parallel queries:
├── workingMemory.getAll(sessionId) [Layer 1]
├── episodicMemory.getRecent(sessionId) [Layer 2]
├── semanticMemory.search(topicHints) [Layer 3]
├── proceduralMemory.getActive() [Layer 4]
├── strategicMemory.getContext() [Layer 9/founder]
├── skillMemory.getTopSkills() [Layer 6]
├── decisionMemory.getRecentDecisions() [Layer 7]
└── [lazy] sie._getSIEBriefing(sessionId) [in _getSIEBriefing]

Returns: merged context object with all layer results
```

### `storeMemory(data)` — Primary Write Path

```
storeMemory({ layer, content, source, ... })
  1. access-controller.check(entityClass, 'write', layer)  ← may throw
  2. memory-governor.generateMemoryId()
  3. memory-governor.buildGovernanceFields()
  4. Route to correct layer module based on layer number
  5. Write to Supabase
  6. setImmediate: reflexion-tracker.recordInfluence()  ← fire-and-forget
```

The reflexion tracking is async fire-and-forget after every store. Due to the `recordInfluence()` bug (decisionMemoryId always null), the reflexion link is broken but execution continues normally.

---

## Memory Write Concurrency

Multiple paths write to memory simultaneously without coordination:

| Writer | Target | Trigger |
|--------|--------|---------|
| civilization-kernel.js | Layer 2 (episodic) | Every EXECUTIVE request (post-response) |
| civilization-kernel.js | Layer 7 (decision) | EXECUTIVE class post-response |
| chat-context.extractAndSaveFacts | Layer 9 (founder/strategic) | Every chat exchange |
| obsidian-memory.logLesson | Layer 10 | Every lesson |
| adaptation-cycle.runWeeklyCycle | Layers 3, 6 | Weekly |
| runDueSchedules completion | Layer 2 | Per completed schedule |

All writes are independent. No coordination layer. Race conditions are theoretically possible on layer 2 (episodic) for concurrent requests from the same session.
