# 06 — Executive Runtime

**Date:** 2026-07-02  
**Evidence Source:** lib/executive/executive-council.js, lib/executive/cfo.js, lib/executive/entity.js, lib/executive/trigger-evaluator.js, lib/executive/registry.js, lib/executive/domain-memory.js, lib/executive/financial-attention-scorer.js, lib/executive-arbitration-engine.js, lib/strategic-planning-engine.js

---

## Executive System Components

| Component | File | Role |
|-----------|------|-----|
| Executive Council | `lib/executive/executive-council.js` | Multi-entity deliberation coordinator |
| Executive Entities | `lib/executive/entity.js` | Individual LLM-backed entity decision maker |
| Entity Registry | `lib/executive/registry.js` | Maps entity IDs to configs and voting rights |
| Trigger Evaluator | `lib/executive/trigger-evaluator.js` | Determines which entities activate for a context |
| Domain Memory | `lib/executive/domain-memory.js` | Stores entity decisions and retrieves domain context |
| CFO | `lib/executive/cfo.js` | Financial evaluation sub-module |
| Financial Attention Scorer | `lib/executive/financial-attention-scorer.js` | Financial priority computation |
| Arbitration Engine | `lib/executive-arbitration-engine.js` | Cognitive thread priority management |
| Strategic Planning Engine | `lib/strategic-planning-engine.js` | Pure in-memory planning state |

---

## Entity Registry

**File:** `lib/executive/registry.js`

### 9 Defined Entities

| ID | Role | In VOTING_ENTITIES? |
|----|------|---------------------|
| `cso` | Chief Strategy Officer | Yes |
| `cio` | Chief Intelligence Officer | Yes |
| `cfo` | Chief Financial Officer | Yes |
| `cto` | Chief Technology Officer | Yes |
| `coo` | Chief Operations Officer | Yes |
| `cgo` | Chief Growth Officer | Yes |
| `cho` | Chief Human Officer | **No** |
| `clo` | Chief Legal Officer | **No** |
| `cro` | Chief Risk Officer | **No** |

CHO, CLO, and CRO are defined but excluded from the voting pool. They may participate in deliberation but cannot cast votes.

### `escalateToFounder()`

Calls `services/slack/slack-alerts.alertCritical()` — sends critical alert to Slack `alerts` AND `executive` channels. Used when no consensus is reachable.

---

## trigger-evaluator.js — Entity Activation

**File:** `lib/executive/trigger-evaluator.js`  
**Cache:** 5 minutes per context hash

### 9 Role Trigger Conditions

| Entity | Activates When |
|--------|---------------|
| `cto` | `deploymentPolicy === 'staged'` OR `complexity === 'critical'` |
| `cfo` | `costUsd > 1.50` |
| `cso` | `hasStrategicImpact === true` |
| `cio` | `memoryOperation === true` |
| `coo` | `pipelineFailures > 0` |
| `cgo` | `newCapability === true` |
| `cho` | `founderImpact === true` |
| `clo` | `legalExposure === true` |
| `cro` | `riskScore >= 0.7` |

`getTriggeredRoles(ctx)` evaluates all 9 conditions and returns the activated set. Result cached 5 minutes.

---

## executive-council.js — Deliberation Runtime

**File:** `lib/executive/executive-council.js`

### `deliberate(request, context)` — 10-Step Flow

```
Step 1:  getTriggeredRoles(context)  ← which entities activate
Step 2:  Fetch domain context for each triggered entity
         └── domain-memory.getDomainContext(entityId, topic)
Step 3:  6 parallel entity.decide() calls (VOTING_ENTITIES only)
         └── each entity: gateway.getContext() + domain-memory + LLM call + reflexion-tracker
Step 4:  Collect votes: { entityId, vote, confidence, reasoning, escalate }
Step 5:  CFO evaluation if cfo is in triggered set
         └── cfo.evaluateDecision(request, context)
Step 6:  Financial attention scoring
         └── financial-attention-scorer.scoreCandidate()
Step 7:  Compute average confidence across voting entities
Step 8:  Escalation check:
         └── anyEscalate === true OR avgConfidence < 0.45 → escalateToFounder()
Step 9:  CEO synthesis (if not escalated):
         └── LLM call to synthesize votes into unified decision
         └── Model: CEO entity's assigned model (UNKNOWN — CEO has no confirmed implementation file)
Step 10: Write to database:
         └── executive_deliberations table
         └── executive_votes table (one row per voting entity)
```

**Escalation threshold:** 0.45 average confidence — if any single entity votes to escalate OR average confidence falls below 0.45, the deliberation escalates to founder alert.

---

## entity.js — Individual Entity Runtime

**File:** `lib/executive/entity.js`

### `decide(request, context, domainContext)` — Decision Flow

```
1. gateway.getContext(entityId, options)
   └── pulls memory context for this entity's domain
2. domain-memory.getDomainContext(entityId, topic)
   └── two-query semantic_memory search for entity's domain history
3. LLM call (entity's assigned model)
   System prompt: entity role + personality + domain expertise
   User: request context + memory + domain history
4. reflexion-tracker.recordInfluence(entityId, decision)
   ← NOTE: uses reflexion-tracker BUG — decisionMemoryId always null
5. pgInsertToolExecution (async, non-blocking)
6. Return: { vote, confidence, reasoning, escalate, entityId }
```

Each entity is effectively a persona-prompted LLM call with memory enrichment.

---

## cfo.js — Financial Evaluation

**File:** `lib/executive/cfo.js`

### `evaluateDecision(request, context)` — 4 Contradiction Types

Detects contradictions between the proposed decision and financial reality:
1. Budget violation — proposed cost exceeds remaining budget
2. ROI contradiction — expected ROI inconsistent with historical data
3. Cash flow timing — timing doesn't match available cash position
4. Risk-reward mismatch — risk level incompatible with current financial position

Always sets `humanOverridePossible: true` in output — CFO never blocks, only advises.

Delegates heavy financial analysis to `lib/finance/*` sub-modules (UNKNOWN: exact files in lib/finance/).

---

## financial-attention-scorer.js — Priority Computation

**File:** `lib/executive/financial-attention-scorer.js`

### `scoreCandidate(candidate, existingPriority)` — 5 Sub-Scores

```
delta = sum of 5 sub-score components
output_priority = existingPriority + clamp(delta, -0.30, +0.30)
```

**`LOW_CONFIDENCE_THRESHOLD = 0.25`** — if overall data confidence < 0.25, elevation is blocked (delta forced to 0 or negative).

---

## domain-memory.js — Entity Memory

**File:** `lib/executive/domain-memory.js`

### `getDomainContext(entityId, topic)` — Two Queries

```
1. semantic_memory WHERE category = entityId ORDER BY created_at DESC LIMIT 10
2. semantic_memory WHERE content ILIKE '%<topic>%' AND category = entityId LIMIT 5
```

Merges both sets, deduplicates by content. Returns domain-specific memory slice for this entity.

### `recordCouncilDecision(deliberationResult)` → Layer 7

Calls `gateway.storeMemory({ layer: 7, ... })` — writes to decision memory.

### `recordDomainLessons(entityId, lessons)` → Layer 9

Calls `gateway.storeMemory({ layer: 9, ... })` per executive entity — each entity has its own lesson accumulation in strategic memory.

---

## executive-arbitration-engine.js — Cognitive Thread Management

**File:** `lib/executive-arbitration-engine.js`

**Critical clarification:** This module does NOT arbitrate agent tasks. It arbitrates **cognitive threads** — persistent session focus objects that represent ongoing work across multiple interactions.

### What it Does

Maintains a priority-ordered list of cognitive threads (topics, ongoing tasks, session focus areas). Prevents context thrashing by scoring threads across 12+ dimensions.

### 12+ Scoring Dimensions

- Time since last access
- Number of interruptions
- Strategic alignment
- Estimated completion proximity
- User engagement signals
- Executive council consensus
- Memory relevance score
- Constitutional risk level
- Financial weight
- Urgency markers
- Cognitive load
- Context switching cost

### FOCUS_SWITCH_PRIORITY_DELTA = 0.15

When a new thread gains more than 0.15 priority over the current focus thread, a focus switch is recommended.

### Strategic Rescue

For threads that have been suppressed (low priority despite strategic importance), the arbitration engine applies a rescue bonus to prevent indefinitely deferring important work.

### Background Housekeeping

`setInterval` every **10 minutes** — evicts stale threads (age + low priority combination).

### Event Bus Subscriptions

| Event | Effect |
|-------|--------|
| `USER_INTERRUPTED` | Boosts interrupting thread priority |
| `AGENT_STARTED` | Marks associated thread as in-flight |
| `AGENT_COMPLETED` | Updates thread outcome, reduces priority |
| `CLAUDE_STARTED` | Anchors current focus thread |

---

## strategic-planning-engine.js — In-Memory Planning

**File:** `lib/strategic-planning-engine.js`

**Critical:** Zero database interaction. All state in process memory. State is lost on process restart.

### In-Memory Data Structures

```javascript
_objectives: Map<objectiveId, objective>    // max 20 entries
_constraints: Map<constraintId, constraint>
_milestones: Map<milestoneId, milestone>
_sessionState: Map<sessionId, sessionState>
```

### Constants

- `OBJECTIVE_TTL_MS = 2 hours` — objectives auto-expire after 2h
- `MAX_OBJECTIVES = 20` — oldest evicted when limit reached

### `decomposeObjective(objective)` — Template-Based Decomposition

Uses **category-based templates** (not LLM). Templates are hardcoded in the engine for common objective categories. No API calls.

### `updateFromResponse(sessionId, response, metadata)` — Called After Every Response

After every Claude response, the calling code invokes `updateFromResponse()`. This updates session state, marks progress toward objectives, and adjusts constraint tracking — all in memory.

### Event Bus Subscriptions

Listens on `SESSION_COMPLETED` (and others) to clean up session state.

---

## Executive Runtime Data Flow

```
Task arrives at executive_runtime route
    │
    ▼
trigger-evaluator.getTriggeredRoles(context)  [5min cache]
    │
    ▼
executive-council.deliberate(request, context)
    ├── domain-memory.getDomainContext() × N entities
    ├── 6 parallel entity.decide() [LLM calls]
    │     └── Each: gateway.getContext() + LLM + reflexion-tracker
    ├── cfo.evaluateDecision() [financial contradiction check]
    ├── financial-attention-scorer.scoreCandidate()
    ├── avgConfidence check
    │     ├── < 0.45 → escalateToFounder() → Slack alert
    │     └── >= 0.45 → CEO synthesis LLM call
    ├── Write: executive_deliberations
    └── Write: executive_votes
    │
    ▼
[Background — continuous]
executive-arbitration-engine
    ├── Monitors cognitive threads
    ├── Reacts to event bus (USER_INTERRUPTED, AGENT_STARTED, etc.)
    └── 10min eviction of stale threads

strategic-planning-engine
    ├── updateFromResponse() after every Claude response
    ├── Maintains in-memory objective/constraint/milestone state
    └── SESSION_COMPLETED → clean up session state
```
